import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import KitRoute, { generateMetadata, generateStaticParams } from '../app/devices/[id]/kit/page'
import DevicePageRoute from '../app/devices/[id]/page'
import sitemap from '../app/sitemap'
import type { Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { kitHref } from '../lib/studio/catalogue'
import { kitRecipes } from '../lib/studio/device-page'
import { kitSession } from '../lib/studio/kit-session'
import { renderKitSession } from '../lib/studio/kit-markdown'
import { KIT_DESTINATION, kitCitation, kitGap, kitLead, kitTitle } from '../lib/studio/kit-text'
import { kitFilename, kitMarkdown } from '../lib/studio/export'

/**
 * §3.7/#478. **The standalone kit page**, as the markup a reader actually receives.
 *
 * Prerendered bytes rather than a component in a harness: the page is a server component with one
 * client boundary around two buttons, so everything a crawler, a reader with no JavaScript and a
 * sheet of paper get is in this string. What is pinned here is that the page says what the model
 * says and what the Markdown says — the same session, three renderings, no third set of facts.
 */

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

function sessionOf(id: string) {
  const session = kitSession(byId(id))
  if (session === undefined) throw new Error(`${id} offers no kit`)
  return session
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await KitRoute({ params: Promise.resolve({ id }) }))
}

/**
 * The page as a reader reads it: tags become spaces, entities come back, runs of space collapse.
 * A comparison against raw markup would pass or fail on where a `<span>` happens to sit, which is
 * ink and not a fact.
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
    /*
     * A period that follows an element closes up against it. The page ends a record line with a
     * `mono` span and then the stop, so tag-stripping leaves `KICK 1 .` where a reader sees
     * `KICK 1.` — an artefact of this function rather than a difference between the renderers.
     */
    .replace(/\s+([.,;:])/g, '$1')
    .trim()
}

/**
 * Every substantive claim the Markdown makes, as plain text, with its own ink stripped: the
 * bullets, the bold, the backticks and `SUBORDINATE`'s tags are how one renderer draws a fact,
 * not the fact. What is left is the thing a reader would notice was missing.
 */
function markdownFacts(md: string): string[] {
  return md
    .split('\n')
    .filter((line) => line.trim() !== '')
    /*
     * A slot heading is three facts in one line — the ordinal, the slot name and the recipe's
     * title — and the two renderers punctuate them differently on purpose: Markdown has only a
     * heading to put them in, the page has a gutter and two spans. So it is split rather than
     * compared as a string, and the *order* the three appear in is pinned against the model
     * above rather than against the other renderer's punctuation.
     */
    .flatMap((line) => {
      const slot = /^## \d+\. `(.+?)` — (.*)$/.exec(line)
      return slot === null ? [line] : [slot[1] as string, slot[2] as string]
    })
    .map((line) =>
      line
        .replace(/^#+ /, '')
        .replace(/^\s*- /, '')
        // #511 adds `neutral`, and it is ink for the same reason the other two are: Markdown
        // has only a word to tag a subordinate line with, the page draws the tag in CSS on a
        // `::before`. The fact is what follows it, and that is what is compared.
        .replace(/^↳ (note|hint|neutral): /, '')
        .replace(/↳ (note|hint|neutral): /g, '')
        .replace(/\*\*/g, '')
        /*
         * #385's lamp. Markdown has only a glyph to draw one with; the page draws it in CSS on
         * an empty span. The module's *name* is the fact and it is compared; the dot is ink.
         */
        .replace(/^● /, '')
        /*
         * #107's scope word. Both renderers print it and neither calls it a fact of the same
         * line: Markdown hangs it off the value with the `·` §8 uses for a controller number,
         * the page sets it in its own span after the option set. Compared on its own below.
         */
        .replace(/ · (pattern|song)-wide$/, '')
        .replace(/`/g, '')
        .replace(/^\*(.*)\*$/, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    /*
     * `**Patch**` and `**Settings**` are the Markdown's own ink: it has nothing but a bold line
     * to separate two blocks, where the page has a list and a card. Neither is a fact about the
     * box, and the page prints neither — the cables are visibly cables and the values visibly
     * values. Everything else on a line survives this filter and is compared.
     */
    .filter((line) => line !== 'Patch' && line !== 'Settings')
}

const CASCADIA = await markupFor('intellijel-cascadia')
const CASCADIA_TEXT = text(CASCADIA)
const CASCADIA_MD = renderKitSession(sessionOf('intellijel-cascadia'))

describe('the kit page exists exactly where a kit does', () => {
  it('is prerendered for the boxes that offer one, and for no others', () => {
    const ids = generateStaticParams().map((p) => p.id)
    const offering = DEVICES.filter((device) => kitRecipes(device).length > 0).map((d) => d.id)
    expect(ids).toEqual(offering)
    expect(ids.length).toBe(24)
  })

  it('404s on a device that makes no kit, rather than rendering an empty claim', async () => {
    // `notFound()` throws Next's own 404; `dynamicParams = false` covers ids that are not
    // devices at all, so what is asserted here is the case the router would otherwise allow: a
    // real device whose kit is below §3.6's threshold.
    for (const id of ['elektron-digitakt', 'arturia-microfreak', 'moog-minitaur']) {
      expect(kitSession(byId(id)), id).toBeUndefined()
      await expect(markupFor(id)).rejects.toThrow(/404/)
    }
  })

  it('has one address, which the link, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    const kits = urls.filter((url) => url.endsWith('/kit'))
    expect(kits.length).toBe(24)
    for (const device of DEVICES) {
      const href = kitHref(device)
      expect(href).toBe(`/devices/${device.id}/kit`)
      const listed = urls.includes(`https://patchscore.app${href}`)
      expect(listed, device.id).toBe(kitSession(device) !== undefined)
    }
    const meta = await generateMetadata({
      params: Promise.resolve({ id: 'intellijel-cascadia' }),
    })
    expect(meta.alternates?.canonical).toBe('/devices/intellijel-cascadia/kit')
    expect(meta.title).toBe('Intellijel Cascadia: build a kit — Patchscore')
    expect(meta.description).toContain('8 drum sounds the Intellijel Cascadia makes on its own')
    // An id with no page has no metadata to give, and says so with nothing rather than a title
    // for a page that 404s.
    expect(await generateMetadata({ params: Promise.resolve({ id: 'elektron-digitakt' }) })).toEqual({})
  })

  it('is linked from the device page’s kit panel, and only where there is one', async () => {
    const device = renderToStaticMarkup(
      await DevicePageRoute({ params: Promise.resolve({ id: 'intellijel-cascadia' }) }),
    )
    expect(device).toContain('href="/devices/intellijel-cascadia/kit"')
    const none = renderToStaticMarkup(
      await DevicePageRoute({ params: Promise.resolve({ id: 'elektron-digitakt' }) }),
    )
    expect(none).not.toContain('/kit"')
  })
})

describe('the page says what the model says', () => {
  it('lays every slot open, in model order, with the name the model gave it', () => {
    const session = sessionOf('intellijel-cascadia')
    const names = [...CASCADIA.matchAll(/class="kit-slot-name mono">([^<]+)</g)].map((m) => m[1])
    expect(names).toEqual(session.slots.map((slot) => slot.name))
    const ordinals = [...CASCADIA.matchAll(/class="kit-ordinal mono">(\d+)</g)].map((m) => m[1])
    expect(ordinals).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
    // Open, all of them: no disclosure on this page, which is the whole difference from the
    // panel on the device page.
    expect(CASCADIA).not.toContain('<details')
    for (const slot of session.slots) {
      expect(CASCADIA_TEXT).toContain(slot.recipe.title)
      expect(CASCADIA_TEXT).toContain(`${slot.recipe.role} · ${slot.recipe.character}`)
    }
  })

  it('ends every slot with the record action and the model’s name', () => {
    const session = sessionOf('intellijel-cascadia')
    const records = [...CASCADIA.matchAll(/class="kit-record">([\s\S]*?)<\/p>/g)].map((m) =>
      text(m[1] as string),
    )
    expect(records).toEqual(
      session.slots.map((slot) => `Record one hit with your recorder as ${slot.name}.`),
    )
    // Last inside its slot: an action with settings under it is a reader recording a patch they
    // have not finished building.
    for (const slot of CASCADIA.split('<li class="kit-slot">').slice(1)) {
      expect(slot.indexOf('kit-record')).toBeGreaterThan(slot.lastIndexOf('kit-param-line'))
    }
  })

  it('names the six core sounds the kit does not cover, as the thing to do about them', () => {
    expect(CASCADIA_TEXT).toContain(kitGap(sessionOf('intellijel-cascadia')) as string)
    expect(CASCADIA_TEXT).toContain(
      'Bring snare, clap, rim, closed hat, open hat and ride from another box or a sample library.',
    )
  })

  it('states the destination once and the citation once', () => {
    const session = sessionOf('intellijel-cascadia')
    expect(CASCADIA.split(KIT_DESTINATION).length - 1).toBe(1)
    const cites = kitCitation(session) as string
    expect(CASCADIA.split(cites).length - 1).toBe(1)
    // Invariant 4's ink rule: one sentence for the box, and no mark or page beside any value.
    expect(CASCADIA).not.toContain('class="prov')
    expect(CASCADIA_TEXT).toContain(kitTitle(session.device))
    expect(CASCADIA_TEXT).toContain(kitLead(session))
  })

  it('offers the file and the dialog, and nothing that needs a song', () => {
    expect(CASCADIA).toContain('Download Markdown')
    expect(CASCADIA).toContain('Print / Save PDF')
    expect(kitFilename(sessionOf('intellijel-cascadia'))).toBe(
      'patchscore-intellijel-cascadia-kit.md',
    )
    // §3.7's boundary as markup: no mood, no seed, no direction, no arrangement, no clock.
    for (const chrome of ['mood-panel', 'song-panel', 'seed-field', 'guide-jump', 'hints-toggle']) {
      expect(CASCADIA, chrome).not.toContain(chrome)
    }
    for (const word of ['BPM', 'Sections', 'The hook', 'clock source', 'Gaps']) {
      expect(CASCADIA_TEXT, word).not.toContain(word)
    }
  })
})

describe('the page and the Markdown carry the same facts', () => {
  it('prints every substantive line the Markdown prints', () => {
    const facts = markdownFacts(CASCADIA_MD)
    // A guard against a stripped-to-nothing fact list quietly passing.
    expect(facts.length).toBeGreaterThan(140)
    for (const fact of facts) expect(CASCADIA_TEXT, fact).toContain(fact)
  })

  it('carries the same cables, values, notes and routing on every box that offers a kit', async () => {
    // Not the Cascadia alone: the shapes that differ between boxes are module boxes, hints and
    // scoped values, and no one device has all of them.
    for (const id of ['behringer-model-d', 'moog-mother-32', 'behringer-rd-9', 'roland-tr-1000']) {
      const page = text(await markupFor(id))
      for (const fact of markdownFacts(renderKitSession(sessionOf(id)))) {
        expect(page, `${id}: ${fact}`).toContain(fact)
      }
    }
  })

  it('marks a value one setting of which covers everything, as often as the Markdown does', async () => {
    // §3.6's correction: unmarked, a reader working down a kit sets a song-wide value again for
    // every sound and wonders why the last one won. Both renderers print it, on the same values.
    const md = renderKitSession(sessionOf('behringer-rd-9'))
    const marked = (md.match(/ · (pattern|song)-wide$/gm) ?? []).length
    expect(marked).toBeGreaterThan(0)
    const page = await markupFor('behringer-rd-9')
    expect([...page.matchAll(/class="kit-scope">(pattern|song)-wide</g)].length).toBe(marked)
  })

  it('prints an enum’s option set, which is the one fact the Markdown leaves out', () => {
    // §3.2: on an enum the option set *is* the legality gate, and a reader at a desk asks the
    // same question of it that they ask of a range. §8's ink prints no option set beside a value
    // and the Markdown session reads beside a guide, so it does not either. Stated here so the
    // difference stays this one rather than growing quietly.
    expect(CASCADIA).toContain('class="value-range kit-options mono">(TZFM, EXP)')
    expect(CASCADIA_MD).not.toContain('(TZFM, EXP)')
    // Authored order, not sorted: which option a manual prints first is a fact about the panel.
    expect([...CASCADIA.matchAll(/class="value-range kit-options mono">/g)].length).toBe(36)
  })
})

// ---------------------------------------------------------------------------
// The client boundary (#478)
// ---------------------------------------------------------------------------

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * A module's **runtime** imports. `import type` and `export type` are erased by the compiler and
 * reach no bundle, so following them would measure the type graph and claim it was the shipped
 * one — which is the whole question this walk exists to answer.
 */
function runtimeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specs = [
    ...source.matchAll(/^\s*import\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm),
    ...source.matchAll(/^\s*export\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm),
    ...source.matchAll(/^\s*import\s+'([^']+)'/gm),
  ].map((m) => m[1] as string)
  return specs.filter((spec) => spec.startsWith('.') || spec.startsWith('@/'))
}

/** `@/lib/x` and `./x` to a file in this repo, trying the extensions Next resolves. */
function resolveSpec(spec: string, from: string): string | undefined {
  const base = spec.startsWith('@/') ? join(REPO_ROOT, spec.slice(2)) : resolve(dirname(from), spec)
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

/** Every module that would be bundled with `entry`, entry included. */
function bundle(entry: string): string[] {
  const seen = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop() as string
    if (seen.has(file)) continue
    seen.add(file)
    for (const spec of runtimeImports(file)) {
      const next = resolveSpec(spec, file)
      // An unresolved specifier is a bug in this walk, not something to skip quietly.
      expect(next, `${file}: ${spec}`).toBeDefined()
      queue.push(next as string)
    }
  }
  return [...seen].map((file) => file.slice(REPO_ROOT.length + 1))
}

describe('the client boundary is two strings wide', () => {
  const CLIENT = join(REPO_ROOT, 'components', 'export-actions.tsx')

  it('ships neither the kit model nor either renderer to the browser', () => {
    const shipped = bundle(CLIENT)
    // What it does need: the injected browser and the two primitives that use it.
    expect(shipped).toContain('lib/studio/browser-env.ts')
    expect(shipped).toContain('lib/studio/download.ts')
    // What it must not. `kit-markdown` reaches `lib/core`; `kit-session` reaches the registry;
    // between them they are the engine and every recipe in the library, shipped to run a
    // function that takes a string and a name.
    for (const forbidden of [
      'lib/studio/kit-session.ts',
      'lib/studio/kit-markdown.ts',
      'lib/studio/kit-text.ts',
      'lib/studio/export.ts',
      'lib/studio/device-page.ts',
      'lib/devices/registry.generated.ts',
    ]) {
      expect(shipped, forbidden).not.toContain(forbidden)
    }
    expect(shipped.some((file) => file.startsWith('lib/core/')), shipped.join(' ')).toBe(false)
    // Small enough to name: the component, the browser, the two primitives it calls.
    expect(shipped.length).toBeLessThanOrEqual(3)
  })

  it('takes the strings the server rendered, and never a session', () => {
    const source = readFileSync(CLIENT, 'utf8')
    expect(source).toContain('{ markdown, filename }: { markdown: string; filename: string }')
    // Not even as a type: a `KitSession` prop is what a later change would reach for first.
    expect(source.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('KitSession')
    // And what crosses is what the golden pins, rendered once, on the server.
    const session = sessionOf('intellijel-cascadia')
    expect(kitMarkdown(session)).toBe(renderKitSession(session))
    expect(kitFilename(session)).toBe('patchscore-intellijel-cascadia-kit.md')
  })
})
