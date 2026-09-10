import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SampleRoute from '../app/samples/[id]/page'
import { GET, dynamicParams, generateStaticParams } from '../app/samples/[id]/reference.wav/route'
import { REFERENCE_SAMPLES, referenceWav } from '../lib/audio'
import { resolveSample } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { SAMPLE_TARGETS, sampleTargetById } from '../lib/samples'
import type { SampleTarget } from '../lib/core'
import { renderSample } from '../lib/studio/sample-markdown'
import {
  REFERENCE_LINK,
  REFERENCE_OFFER,
  referenceHref,
  referenceUrl,
  sampleReference,
} from '../lib/studio/sample-text'
import { SITE_ORIGIN } from '../lib/studio/site'

/**
 * §3.9/#519. **The download, from all three ends: the route that makes the bytes, the page that
 * offers them, and the document that offers them somewhere else.**
 *
 * The thing this suite is really guarding is that those three agree about *which fourteen*. A link
 * drawn to a route that 404s and a route serving a sound nothing links to are the same bug seen
 * from two sides, and neither shows up as an error anywhere — the page renders, the route responds,
 * and only a reader clicking finds out. So eligibility is asserted as one predicate used three
 * times rather than three lists that happen to match today.
 *
 * The other half is the ten targets that offer nothing. `vox-chop` is the one that matters: a
 * generator cannot make a voice, and the failure mode to guard against is not an error but a
 * plausible-sounding file appearing where a reader expected a vocal.
 */

const EXPECTED_IDS = [
  'kick',
  'snare',
  'clap',
  'rim',
  'tom',
  'closed-hat',
  'open-hat',
  'ride',
  'metallic-hit',
  'ghost-hit',
  'noise-hit',
  'impact',
  'riser',
  'sweep',
] as const

/** The ten that offer nothing: `vox-chop`, the eight tonal roles, and `bass-mid`'s second target. */
const INELIGIBLE_IDS = [
  'sub',
  'bass-note',
  'wobble-bass',
  'pad',
  'lead',
  'stab',
  'arp',
  'acid-line',
  'vocal-chop',
  'texture-bed',
] as const

const target = (id: string): SampleTarget => {
  const found = sampleTargetById(id)
  if (found === undefined) throw new Error(`no sample target ${id}`)
  return found
}

const rig = (...ids: string[]) =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await SampleRoute({ params: Promise.resolve({ id }) }))
}

async function fetchWav(id: string): Promise<Response> {
  return GET(new Request(`${SITE_ORIGIN}/samples/${id}/reference.wav`), {
    params: Promise.resolve({ id }),
  })
}

/** The document for one target against a rig of nothing but a sampler — #519's reader. */
function documentFor(id: string): string {
  return renderSample(resolveSample(target(id), rig('elektron-digitakt')))
}

// ---------------------------------------------------------------------------
// Who is offered one
// ---------------------------------------------------------------------------

describe('reference download: eligibility', () => {
  it('offers exactly fourteen of the twenty-four targets', () => {
    const offered = SAMPLE_TARGETS.filter((t) => sampleReference(t) !== undefined)
    expect(offered.map((t) => t.id)).toEqual([...EXPECTED_IDS])
    expect(SAMPLE_TARGETS).toHaveLength(24)
  })

  it('offers one target per reference file, and no file without a target', () => {
    const offeredRoles = SAMPLE_TARGETS.map((t) => sampleReference(t)?.role).filter(
      (role) => role !== undefined,
    )
    expect([...offeredRoles].sort()).toEqual([...REFERENCE_SAMPLES.map((s) => s.role)].sort())
  })

  it('offers nothing to the ten that make no sense to generate', () => {
    for (const id of INELIGIBLE_IDS) {
      expect(sampleReference(target(id)), id).toBeUndefined()
    }
    expect([...EXPECTED_IDS, ...INELIGIBLE_IDS]).toHaveLength(SAMPLE_TARGETS.length)
  })
})

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

describe('reference download: the route', () => {
  it('prerenders the fourteen and nothing else', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams().map((p) => p.id)).toEqual([...EXPECTED_IDS])
  })

  it('serves the same bytes the generator makes', async () => {
    for (const id of EXPECTED_IDS) {
      const response = await fetchWav(id)
      expect(response.status, id).toBe(200)
      const served = new Uint8Array(await response.arrayBuffer())
      const generated = referenceWav(target(id).role) as Uint8Array
      // Hashed rather than compared element-wise: a 176 KB mismatch printed by a diff is unreadable,
      // and this is the same digest `test/reference-samples.test.ts` pins the generator against.
      expect(createHash('sha256').update(served).digest('hex'), id).toBe(
        createHash('sha256').update(generated).digest('hex'),
      )
    }
  })

  it('sends headers a browser will save rather than play', async () => {
    for (const id of EXPECTED_IDS) {
      const response = await fetchWav(id)
      const sample = sampleReference(target(id))
      expect(sample).toBeDefined()
      expect(response.headers.get('Content-Type'), id).toBe('audio/wav')
      // Named for the role, so `metallic-hit` downloads `metallic.wav` and a collected folder
      // matches what `npm run samples:wav` writes.
      expect(response.headers.get('Content-Disposition'), id).toBe(
        `attachment; filename="${sample?.file}"`,
      )
      const bytes = await response.arrayBuffer()
      expect(response.headers.get('Content-Length'), id).toBe(String(bytes.byteLength))
    }
  })

  it('tags each file with a hash of its own bytes', async () => {
    const tags = new Map<string, string>()
    for (const id of EXPECTED_IDS) {
      const response = await fetchWav(id)
      const etag = response.headers.get('ETag')
      expect(etag, id).toMatch(/^"[0-9a-f]{32}"$/)
      const bytes = new Uint8Array(await response.arrayBuffer())
      const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
      expect(etag, id).toBe(`"${digest}"`)
      tags.set(id, etag as string)
    }
    // Fourteen distinct sounds, so fourteen distinct tags. One repeated would mean a caching layer
    // could hand a reader the wrong file.
    expect(new Set(tags.values()).size).toBe(EXPECTED_IDS.length)
  })

  /**
   * §3.9/#519. **The URL is stable and the bytes are not, so a browser has to ask.**
   *
   * This sent `max-age=31536000, immutable` first, and that is the failure worth a test rather than
   * a comment. `immutable` instructs a browser not to revalidate, which makes the `ETag` beside it
   * unreachable — it can never be consulted and so can never invalidate anything.
   * `/samples/kick/reference.wav` is not content-addressed: it is where the kick lives, whatever
   * the kick sounds like this build. Editing `reference.ts` therefore serves different bytes at the
   * same address, and every reader who had already fetched it would have held the old file for a
   * year.
   */
  it('asks the browser to revalidate rather than freezing the file on it', async () => {
    for (const id of EXPECTED_IDS) {
      const cacheControl = (await fetchWav(id)).headers.get('Cache-Control')
      expect(cacheControl, id).toBe('public, max-age=0, must-revalidate')
      expect(cacheControl, `${id} cannot carry immutable beside an ETag`).not.toContain('immutable')
    }
  })

  it('changes the tag when the bytes change, so a changed build serves changed bytes', async () => {
    // The property revalidation exists to deliver, stated as the relation it actually is: the tag
    // is a function of the body. Two sounds differ, so two tags differ; the same sound edited would
    // differ from itself at the same URL, which is what a caching layer in front compares.
    //
    // Not a 304 test, deliberately. Measured against `next start`, a matching `If-None-Match` is
    // answered 200 with the whole body — Next does not implement conditional GET for a prerendered
    // route handler — so a 304 here would be a test of somebody's CDN.
    const kick = await fetchWav('kick')
    const snare = await fetchWav('snare')
    expect(kick.headers.get('ETag')).not.toBe(snare.headers.get('ETag'))
    const kickAgain = await fetchWav('kick')
    // Unchanged bytes, unchanged tag. The tag is a function of the body and of nothing else.
    expect(kickAgain.headers.get('ETag')).toBe(kick.headers.get('ETag'))
  })

  it('answers 404 for the ten with no reference, and for an unknown id', async () => {
    for (const id of INELIGIBLE_IDS) {
      const response = await fetchWav(id)
      expect(response.status, id).toBe(404)
      // Not an empty file. A zero-byte `vocal-chop.wav` is a worse answer than none, because it is
      // one a reader has to open to discover.
      expect((await response.arrayBuffer()).byteLength, id).toBe(0)
    }
    for (const id of ['nothing', 'kick.wav', '', 'KICK']) {
      expect((await fetchWav(id)).status, id).toBe(404)
    }
  })

  it('renders the bytes fresh each time rather than holding one buffer', async () => {
    // Two responses must not share a `Uint8Array` whose contents a caller could have mutated.
    const first = new Uint8Array(await (await fetchWav('kick')).arrayBuffer())
    first.fill(0)
    const second = new Uint8Array(await (await fetchWav('kick')).arrayBuffer())
    expect(second.some((b) => b !== 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The two renderings (#33/#495)
// ---------------------------------------------------------------------------

describe('reference download: both renderings say the same thing', () => {
  it('prints one sentence, and it is the shared one', async () => {
    for (const id of EXPECTED_IDS) {
      const markup = await markupFor(id)
      const document = documentFor(id)
      expect(markup, id).toContain(REFERENCE_OFFER)
      expect(document, id).toContain(REFERENCE_OFFER)
    }
  })

  it('says it is a reference rather than the answer, in both', async () => {
    // The one clause invariant 5 turns on. Asserted separately from the sentence above so that
    // rewording the offer cannot quietly drop the half that does the work.
    for (const id of ['kick', 'sweep']) {
      expect(await markupFor(id), id).toContain('it is a reference, not the answer')
      expect(documentFor(id), id).toContain('it is a reference, not the answer')
    }
  })

  it('links relatively on the page and absolutely in the document', async () => {
    for (const id of EXPECTED_IDS) {
      const t = target(id)
      expect(await markupFor(id), id).toContain(`href="${referenceHref(t)}"`)
      // A `.md` is read after it has left the site, so a root-relative link resolves against
      // nothing (#487).
      expect(documentFor(id), id).toContain(`[${REFERENCE_LINK}](${referenceUrl(t)})`)
      expect(referenceUrl(t)).toBe(`${SITE_ORIGIN}/samples/${id}/reference.wav`)
    }
  })

  it('states the file name in both', async () => {
    for (const id of EXPECTED_IDS) {
      const sample = sampleReference(target(id))
      expect(await markupFor(id), id).toContain(`${sample?.file}`)
      expect(documentFor(id), id).toContain(`${sample?.file}`)
    }
  })

  /**
   * §3.9/#519/invariant 5. **The offer is a sentence, a link and a file name, and then it stops.**
   *
   * A first cut printed the length and a description of the synthesis — *sine falling 145 Hz to
   * 48 Hz, with a noise tick* — beside the link. Both are true and neither belongs here. A reader on
   * this page is deciding whether to click, and a generated example annotated with its own build
   * makes it look like an authored answer carrying its own settings, sitting directly above the box
   * that actually has settings. That is the reading the whole surface is written to prevent.
   *
   * Asserted as an absence rather than left to the golden, because it is the kind of detail that
   * gets helpfully added back.
   */
  it('says nothing about how the example was built, or how long it is', async () => {
    for (const id of EXPECTED_IDS) {
      const sample = sampleReference(target(id))
      const markup = await markupFor(id)
      const document = documentFor(id)
      expect(sample?.note.length, id).toBeGreaterThan(0)
      expect(markup, `${id} markup describes the synthesis`).not.toContain(sample?.note as string)
      expect(document, `${id} document describes the synthesis`).not.toContain(sample?.note as string)
      for (const length of [`${sample?.seconds.toFixed(2)} s`, `${sample?.seconds} s`]) {
        expect(markup, `${id} markup states a length`).not.toContain(length)
        expect(document, `${id} document states a length`).not.toContain(length)
      }
    }
  })

  it('puts the offer above the rig in both', async () => {
    // §3.9's ordering argument: a reader who has just been told what the take must contain is the
    // one an example helps; a reader who has scrolled past their own box's settings already has
    // the better answer.
    const markup = await markupFor('kick')
    expect(markup.indexOf(REFERENCE_OFFER)).toBeGreaterThan(markup.indexOf('What to record'))
    expect(markup.indexOf(REFERENCE_OFFER)).toBeLessThan(markup.indexOf('Where to make it'))

    for (const id of ['kick', 'closed-hat']) {
      // Both outcomes: a sampler-only rig gaps, a drum machine makes it.
      for (const document of [
        documentFor(id),
        renderSample(resolveSample(target(id), rig('roland-tr-8s'))),
      ]) {
        expect(document.indexOf('## A reference file'), id).toBeGreaterThan(
          document.indexOf('## What to record'),
        )
        expect(document.indexOf('## A reference file'), id).toBeLessThan(
          document.indexOf('## Where to make it'),
        )
      }
    }
  })

  it('offers it under a gap as well as under a made page', () => {
    // The branch that matters most. A rig of nothing but samplers is told to bring a recording, and
    // for eleven of these roles that sentence is the whole document — so the download is the one
    // thing on the page that reader can act on.
    const gapped = documentFor('kick')
    expect(gapped).toContain('plays this from a file rather than making one')
    expect(gapped).toContain(REFERENCE_OFFER)

    const made = renderSample(resolveSample(target('kick'), rig('roland-tr-8s')))
    expect(made).toContain('## Where to make it')
    expect(made).toContain(REFERENCE_OFFER)
  })

  it('prints nothing at all for the ten that offer none', async () => {
    for (const id of INELIGIBLE_IDS) {
      const markup = await markupFor(id)
      const document = documentFor(id)
      for (const text of [REFERENCE_OFFER, REFERENCE_LINK, 'A reference file', 'reference.wav']) {
        expect(markup, `${id} markup leaks ${text}`).not.toContain(text)
        expect(document, `${id} document leaks ${text}`).not.toContain(text)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------

/**
 * §3.9/#519. **The synthesis must not reach the browser**, and this is the only check that would
 * notice if it did.
 *
 * The sound page has a client island (`SampleRig`), which pulls `sample-markdown.ts` and through it
 * `sample-text.ts`. `sample-text.ts` has to answer *does this sound have a reference file*, and the
 * obvious way to answer it — importing `@/lib/audio` — would drag a filter bank, six oscillators, a
 * noise source and a polynomial `sin` into the bundle of a page that never synthesises anything.
 * Nothing about that would fail: the page renders, the tests pass, the bundle is just bigger.
 *
 * So the import graph is walked. `lib/audio/catalogue.ts` is the browser-safe half by construction
 * — fourteen objects, one lookup, one type import — and it is what `sample-text.ts` is allowed to
 * reach.
 */
describe('reference download: the client bundle', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const REPO_ROOT = join(HERE, '..')

  /** Every first-party file reachable from `entry`, following relative and `@/` imports. */
  function importGraph(entry: string): string[] {
    const seen = new Set<string>()
    const queue = [entry]
    while (queue.length > 0) {
      const file = queue.pop() as string
      if (seen.has(file)) continue
      seen.add(file)
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/from\s+'([^']+)'/g)) {
        const spec = match[1] as string
        const base = spec.startsWith('@/')
          ? join(REPO_ROOT, spec.slice(2))
          : spec.startsWith('.')
            ? resolvePath(dirname(file), spec)
            : undefined
        if (base === undefined) continue
        for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
          try {
            readFileSync(candidate, 'utf8')
            queue.push(candidate)
            break
          } catch {
            // Not this extension. A specifier resolving to none of the three is a package.
          }
        }
      }
    }
    return [...seen]
  }

  it('keeps the synthesis out of the sound page island', () => {
    const graph = importGraph(join(REPO_ROOT, 'components', 'sample', 'sample-rig.tsx'))
    const audio = graph.filter((file) => file.includes(`${join('lib', 'audio')}${'/'}`))
    // The catalogue is allowed and is the point of the split. Nothing else under `lib/audio` is.
    expect(audio.map((file) => file.slice(REPO_ROOT.length + 1))).toEqual(['lib/audio/catalogue.ts'])
  })

  it('keeps the catalogue free of everything but a type', () => {
    const source = readFileSync(join(REPO_ROOT, 'lib', 'audio', 'catalogue.ts'), 'utf8')
    const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
    expect(imports).toEqual(['../core/vocabulary'])
    for (const forbidden of ['./dsp', './wav', './reference', 'node:']) {
      expect(source, `the catalogue reaches ${forbidden}`).not.toContain(`from '${forbidden}`)
    }
  })
})
