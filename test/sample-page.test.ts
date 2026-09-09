import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RootLayout from '../app/layout'
import sitemap from '../app/sitemap'
import SampleIndexPage from '../app/samples/page'
import SampleRoute, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from '../app/samples/[id]/page'
import { SampleRig } from '../components/sample/sample-rig'
import { SampleGapBlock, SampleVoice } from '../components/sample/sample-voice'
import { NAV_LINKS } from '../components/site-nav'
import type { SampleResolution } from '../lib/core'
import { ROLES, resolveSample } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { SAMPLE_GROUPS, SAMPLE_TARGETS, sampleTargetById, targetsInGroup } from '../lib/samples'
import { sampleHref } from '../lib/studio/catalogue'
import { sampleGap } from '../lib/studio/sample-text'
import { renderSample } from '../lib/studio/sample-markdown'
import { SITE_ORIGIN } from '../lib/studio/site'

/**
 * §3.8/#495/#520. **The React page and the Markdown export carry the same facts**, plus the things
 * bytes alone do not say out loud: that the route exists exactly where a target does, that the page
 * is free of everything a *song* or a *figure* would bring with it, and that every one of the six
 * states a rig can be in is drawn rather than silently dropped.
 */

const rig = (...ids: string[]) =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

const target = (id: string) => {
  const found = sampleTargetById(id)
  if (found === undefined) throw new Error(`no sample target ${id}`)
  return found
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await SampleRoute({ params: Promise.resolve({ id }) }))
}

/** Every route, rendered the way it will be served: the layout around the page. */
async function shell(page: ReactElement): Promise<string> {
  return renderToStaticMarkup(RootLayout({ children: page }))
}

/**
 * The page as a reader reads it: tags become spaces, entities come back, runs of space collapse.
 * `test/riff-page.test.ts`' own normaliser — a comparison against raw markup would pass or fail on
 * where a `<span>` happens to sit, which is ink and not a fact.
 */
function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim()
}

/** The rig half, rendered on its own — the six states below are all reached through it. */
function voiceMarkup(resolution: SampleResolution): string {
  if (resolution.outcome === 'made') {
    return renderToStaticMarkup(
      createElement(SampleVoice, { target: resolution.target, voice: resolution.voice }),
    )
  }
  return renderToStaticMarkup(createElement(SampleGapBlock, { resolution }))
}

const resolve = (id: string, ...deviceIds: string[]) =>
  resolveSample(target(id), rig(...deviceIds))

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

describe('the route exists exactly where a target does (§3.8)', () => {
  it('prerenders one page per target and refuses anything else', () => {
    expect(dynamicParams).toBe(false)
    expect(generateStaticParams().map((p) => p.id)).toEqual(SAMPLE_TARGETS.map((t) => t.id))
  })

  it('is canonical to itself, with a title and a description', async () => {
    for (const entry of SAMPLE_TARGETS) {
      const meta = await generateMetadata({ params: Promise.resolve({ id: entry.id }) })
      expect(meta.title, entry.id).toBe(`${entry.name} — Patchscore`)
      expect(meta.alternates?.canonical, entry.id).toBe(sampleHref(entry))
      expect(typeof meta.description, entry.id).toBe('string')
    }
  })

  it('answers nothing for an id no target has', async () => {
    expect(await generateMetadata({ params: Promise.resolve({ id: 'nothing' }) })).toEqual({})
  })

  it('is in the sitemap, index and every target, by the same addresses', () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toContain(`${SITE_ORIGIN}/samples`)
    for (const entry of SAMPLE_TARGETS) {
      expect(urls, entry.id).toContain(`${SITE_ORIGIN}${sampleHref(entry)}`)
    }
  })

  it('is reachable from every page, through the one nav landmark', async () => {
    expect(NAV_LINKS.map((link) => link.href)).toContain('/samples')
    const markup = await shell(SampleIndexPage())
    expect(markup).toContain('href="/samples"')
  })
})

// ---------------------------------------------------------------------------
// The index
// ---------------------------------------------------------------------------

describe('the grouped index (§3.8)', () => {
  it('lists every target under its group, in group order', () => {
    const markup = renderToStaticMarkup(SampleIndexPage())
    const reading = text(markup)
    for (const group of SAMPLE_GROUPS) {
      expect(reading, group.id).toContain(group.title)
      for (const entry of targetsInGroup(group)) {
        expect(markup, entry.id).toContain(`href="${sampleHref(entry)}"`)
      }
    }
    // Group order is the order they appear in the markup, which is the order the reader scans.
    const positions = SAMPLE_GROUPS.map((g) => markup.indexOf(g.title))
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('offers all 23 roles rather than a curated subset, and says so in the lead', () => {
    const markup = renderToStaticMarkup(SampleIndexPage())
    for (const entry of SAMPLE_TARGETS) {
      expect(markup, entry.id).toContain(`href="${sampleHref(entry)}"`)
    }
    expect(new Set(SAMPLE_TARGETS.map((entry) => entry.role)).size).toBe(ROLES.length)
    // Both numbers, because they answer different questions: how many entries are below, and how
    // much of `ROLES` is covered. They differ where one role carries two techniques.
    expect(text(markup)).toContain(`${SAMPLE_TARGETS.length} sounds across ${ROLES.length} roles.`)
    expect(SAMPLE_TARGETS.length).toBeGreaterThan(ROLES.length)
  })

  it('is a server component with no picker on it — a rig answers one sound at a time', () => {
    const source = readFileSync(new URL('../app/samples/page.tsx', import.meta.url), 'utf8')
    expect(source).not.toContain("'use client'")
    expect(source).not.toContain('RigPicker')
  })
})

// ---------------------------------------------------------------------------
// The page against the document
// ---------------------------------------------------------------------------

describe('the page and the Markdown say the same things (#495)', () => {
  it('prints what to record, in full, on both', async () => {
    const entry = target('wobble-bass')
    const markup = await markupFor(entry.id)
    const reading = text(markup)
    const doc = renderSample(resolveSample(entry, []))
    for (const paragraph of entry.technique) {
      expect(reading, paragraph.slice(0, 24)).toContain(paragraph)
      expect(doc, paragraph.slice(0, 24)).toContain(paragraph)
    }
  })

  it('gives what to record the same heading on both', async () => {
    const markup = await markupFor('wobble-bass')
    expect(text(markup)).toContain('What to record')
    expect(renderSample(resolveSample(target('wobble-bass'), []))).toContain('## What to record')
    // The old heading promised the page would say how to synthesise it, which is the resolved
    // recipe's answer rather than the target's.
    expect(text(markup)).not.toContain('How to make it')
  })

  it('opens with the same lead, the role and the character', async () => {
    const markup = await markupFor('wobble-bass')
    expect(text(markup)).toContain('bass-mid · dirty')
    expect(renderSample(resolveSample(target('wobble-bass'), []))).toContain('`bass-mid · dirty`')
  })

  it('names the same box and the same patch on a rig that makes it', () => {
    const resolution = resolve('texture-bed', 'behringer-neutron')
    const reading = text(voiceMarkup(resolution))
    const doc = renderSample(resolution)
    expect(reading).toContain('NEUTRON · Voice')
    expect(doc).toContain('**NEUTRON · Voice**')
    if (resolution.outcome !== 'made') throw new Error('the fixture rig should make this')
    expect(reading).toContain(resolution.voice.recipe.title)
    expect(doc).toContain(resolution.voice.recipe.title)
  })

  it('says the same gap sentence on a rig that cannot', () => {
    const resolution = resolve('vocal-chop', 'elektron-digitakt')
    const reading = text(voiceMarkup(resolution))
    expect(reading).toContain('plays this from a file rather than making one')
    expect(renderSample(resolution)).toContain('plays this from a file rather than making one')
  })
})

// ---------------------------------------------------------------------------
// The six states
// ---------------------------------------------------------------------------

describe('every state a rig can be in is drawn (invariant 5)', () => {
  it('made — the box, the routing, the cables, the settings and one citation', () => {
    const resolution = resolve('texture-bed', 'behringer-neutron')
    const markup = voiceMarkup(resolution)
    expect(markup).toContain('class="sample-where"')
    expect(text(markup)).toContain('Routing —')
    expect(markup).toContain('class="patch sample-patch"')
    expect(markup).toContain('class="sample-params"')
    expect(markup).toContain('class="module-box"')
    expect((markup.match(/class="sample-cites"/g) ?? []).length).toBe(1)
  })

  it('substituted — the character the box actually has, said out loud (§3.5)', () => {
    const resolution = resolve('texture-bed', 'behringer-neutron')
    if (resolution.outcome !== 'made') throw new Error('expected a made page')
    expect(resolution.voice.substituted).toBe(true)
    expect(text(voiceMarkup(resolution))).toContain(
      'This asks for a dark texture and the nearest this box authors is soft.',
    )
  })

  it('audio-loading — the gap, and what that box actually ships (§2.6/#111)', () => {
    const resolution = resolve('vocal-chop', 'elektron-digitakt')
    const markup = voiceMarkup(resolution)
    expect(markup).toContain('class="sample-gap"')
    expect(markup).toContain('class="callout sample-content"')
    expect(text(markup)).toContain('Content — Digitakt:')
  })

  it('no-recipe — the box that could make it, named, and told to set it by ear', () => {
    const resolution = resolve('bass-note', 'behringer-crave')
    const reading = text(voiceMarkup(resolution))
    expect(reading).toContain('could make it. Set this one up by ear.')
    // The content callout is the audio-loading arm's alone.
    expect(voiceMarkup(resolution)).not.toContain('sample-content')
  })

  it('no-capable-voice — buy a box, and no claim about what is authored', () => {
    const reading = text(voiceMarkup(resolve('kick', 'arturia-microfreak')))
    expect(reading).toBe('Add a box that makes kick sounds.')
  })

  it('empty rig — the one thing a reader can act on', () => {
    expect(text(voiceMarkup(resolve('kick')))).toBe('Pick the boxes you own.')
  })

  /**
   * §3.8. The gap block is the whole of what a gap page says under the heading: no destination, no
   * file name, no record action. Asserted on the markup of every arm, beside the source-level
   * check on the branch below.
   */
  it('no gap arm carries a destination, a file name or a record action', () => {
    const arms = [
      resolve('kick'),
      resolve('kick', 'arturia-microfreak'),
      resolve('vocal-chop', 'elektron-digitakt'),
      resolve('bass-note', 'behringer-crave'),
    ]
    for (const resolution of arms) {
      if (resolution.outcome !== 'gap') throw new Error('expected a gap')
      const reading = text(voiceMarkup(resolution))
      expect(reading, resolution.gap.reason).not.toContain('Recording it')
      expect(reading, resolution.gap.reason).not.toContain('Record it and name it')
      expect(reading, resolution.gap.reason).not.toContain('DAW you use')
    }
    expect(arms.map((r) => (r.outcome === 'gap' ? r.gap.reason : 'made'))).toEqual([
      'no-rig',
      'no-capable-voice',
      'loads-audio',
      'no-recipe',
    ])
  })

  /**
   * §3.8. The mixed rig: a sampler that plays the role from a file beside a synth whose only
   * recipes for it are the opposite character. `loads-audio` would be the claim that nothing here
   * makes the sound, and it is false — so the answer is `no-recipe`, and it names the box a reader
   * can actually dial rather than the sampler standing next to it.
   */
  it('mixed sampler and synth — names the synth, never the sampler', () => {
    const resolution = resolve('bass-note', 'elektron-digitakt', 'behringer-crave')
    if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'no-recipe') {
      throw new Error(`expected no-recipe, got ${JSON.stringify(resolution.outcome)}`)
    }
    expect(new Set(resolution.gap.capable.map((a) => a.deviceId))).toEqual(
      new Set(['behringer-crave']),
    )
    const reading = text(voiceMarkup(resolution))
    expect(reading).toContain('CRAVE')
    expect(reading).not.toContain('Digitakt')
    expect(reading).toContain('Set this one up by ear.')
  })

  /**
   * Invariant 5, the way round that is easy to break: a gap must say what to *do*, never what this
   * library has or has not got round to. Asserted over the sentences this product writes rather
   * than over the whole page — a device folder's own note is that folder's prose, and it may
   * legitimately use the word `recipe` about the box's own patch.
   */
  it('never shows the reader our backlog in a gap sentence', () => {
    for (const entry of SAMPLE_TARGETS) {
      for (const devices of [[], rig('elektron-digitakt'), rig('arturia-microfreak')]) {
        const resolution = resolveSample(entry, devices)
        if (resolution.outcome !== 'gap') continue
        const sentence = sampleGap(entry, resolution.gap, devices).toLowerCase()
        for (const backlog of [
          'authored',
          'recipe',
          'library',
          'not yet',
          'coming soon',
          'we have',
          'nobody has written',
        ]) {
          expect(sentence, `${entry.id}: ${backlog}`).not.toContain(backlog)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// What the page must not have
// ---------------------------------------------------------------------------

describe('no song, no figure, no capability nobody stated', () => {
  it('draws no grid, no notes, no harmony and no mood', async () => {
    const markup = await markupFor('wobble-bass')
    for (const absent of [
      'riff-grid',
      'sample-grid',
      'mood-panel',
      'SeedField',
      'GenrePicker',
      'song-panel',
      'The notes',
      'The grid',
      'progression',
    ]) {
      expect(markup, absent).not.toContain(absent)
    }
  })

  it('asks no device whether it records: the destination is the reader’s', () => {
    const island = readFileSync(
      new URL('../components/sample/sample-rig.tsx', import.meta.url),
      'utf8',
    )
    expect(island).toContain('sampleDestination(READER_SUPPLIED)')
    // No capability is consulted, because none is stated in any manifest (§3.7).
    expect(island).not.toContain('capabilityEvidence')
    expect(island).not.toContain('canRecord')
  })

  /**
   * §3.8. The record action belongs to a made page and to nothing else, and the assertion is on
   * the *branch* rather than on rendered text because the gap block renders on its own in the six
   * state tests above. It replaces one requiring the opposite; the golden suite carries the
   * reasoning.
   */
  /**
   * §3.8. **Download and Print go with the recording block.** A gap document says *pick*, *add*,
   * *bring* or *set it by ear*; it is an answer about the rig rather than a patch anybody builds
   * from, and offering it as a file to keep would dress a shortfall up as a build recipe.
   *
   * Rendered as well as read: `SampleRig` in a static render never runs its effect, so `selected`
   * stays empty and the page is the `no-rig` gap — which is exactly the arm to check.
   */
  it('offers no download and no print on a gap', () => {
    const markup = renderToStaticMarkup(createElement(SampleRig, { targetId: 'kick' }))
    expect(text(markup)).toContain('Pick the boxes you own.')
    expect(markup).not.toContain('Download Markdown')
    expect(markup).not.toContain('Print / Save PDF')
    expect(markup).not.toContain('export-actions')
  })

  it('keeps the export buttons inside the made arm, with the recording block', () => {
    const island = readFileSync(
      new URL('../components/sample/sample-rig.tsx', import.meta.url),
      'utf8',
    )
    const code = island.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    const voice = code.indexOf('<SampleVoice')
    const actions = code.indexOf('<ExportActions')
    const gap = code.indexOf('<SampleGapBlock')
    expect(actions).toBeGreaterThan(voice)
    expect(actions).toBeLessThan(gap)
    // One render site, so a second one cannot appear outside the branch unnoticed.
    expect((code.match(/<ExportActions/g) ?? []).length).toBe(1)
  })

  it('offers the record action only where the rig makes the sound', () => {
    const island = readFileSync(
      new URL('../components/sample/sample-rig.tsx', import.meta.url),
      'utf8',
    )
    const code = island.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    // Inside the `made` arm: the record lines come after `SampleVoice` and before the gap block.
    // `lastIndexOf`, because the first mention of each is the import at the top of the file.
    const voice = code.indexOf('<SampleVoice')
    const record = code.lastIndexOf('SAMPLE_RECORD')
    const destination = code.lastIndexOf('sampleDestination(')
    const gap = code.indexOf('<SampleGapBlock')
    expect(voice, 'the made arm is missing').toBeGreaterThan(-1)
    expect(gap, 'the gap arm is missing').toBeGreaterThan(-1)
    for (const at of [record, destination]) {
      expect(at).toBeGreaterThan(voice)
      expect(at).toBeLessThan(gap)
    }
    // Twice for the record name — the import and the one use — and once for the destination,
    // whose import is `sampleDestination` without the call parenthesis.
    expect((code.match(/SAMPLE_RECORD/g) ?? []).length).toBe(2)
    expect((code.match(/sampleDestination\(/g) ?? []).length).toBe(1)
  })
})
