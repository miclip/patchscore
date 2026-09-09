import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RootLayout from '../app/layout'
import sitemap from '../app/sitemap'
import RiffIndexPage from '../app/riffs/page'
import RiffRoute, { dynamicParams, generateMetadata, generateStaticParams } from '../app/riffs/[id]/page'
import { RiffPicker } from '../components/riff/riff-picker'
import { NAV_LINKS } from '../components/site-nav'
import { MAX_RIG_DEVICES, resolveRiff } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { RIFFS, blueMondayBass } from '../lib/riffs'
import { riffHref } from '../lib/studio/catalogue'
import { renderRiff } from '../lib/studio/riff-markdown'
import { SITE_ORIGIN } from '../lib/studio/site'

/**
 * §5A/#495. **The React page and the Markdown export carry the same facts**, plus the things
 * bytes alone do not say out loud: that the route exists exactly where an entry does, that the
 * page is free of everything a *song* would bring with it, and that nothing on it is a claim
 * nobody checked.
 */

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function rule(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`)
  expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
  return CSS.slice(start, CSS.indexOf('}', start))
}

async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await RiffRoute({ params: Promise.resolve({ id }) }))
}

/** Every route, rendered the way it will be served: the layout around the page. */
async function shell(page: ReactElement): Promise<string> {
  return renderToStaticMarkup(RootLayout({ children: page }))
}

/**
 * The page as a reader reads it: tags become spaces, entities come back, runs of space collapse.
 * A comparison against raw markup would pass or fail on where a `<span>` happens to sit, which is
 * ink and not a fact. `test/kit-page.test.ts`' own normaliser.
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

/**
 * Every substantive claim the Markdown makes, as plain text, with its own ink stripped: the
 * bullets, the bold, the backticks and the fence are how one renderer draws a fact, not the fact.
 *
 * Three lines are dropped and each is a stated difference rather than a gap:
 *
 *  - The **grid rows** (`1 xxxx xxxx…`). Both renderers draw them from `gridRows`, so they are
 *    identical by construction — but the page sets them in a `<pre>` and tag-stripping collapses
 *    the runs of space that make them line up. Compared separately, un-normalised, below.
 *  - `Patch` and `Settings`, which are the Markdown's own ink: it has nothing but a bold line to
 *    separate two blocks, where the page has a list and a heading.
 *  - The **step-count line**, `step 1 · F2 · degree 1 …`, keeps every one of its facts; only the
 *    separators differ, and those are ink.
 */
function markdownFacts(md: string): string[] {
  const fence = /^[ ]*\d+ [x·]/
  return md
    .split('\n')
    .filter((line) => line.trim() !== '' && line !== '```' && !fence.test(line))
    .map((line) =>
      line
        .replace(/^#+ /, '')
        .replace(/^\s*- /, '')
        .replace(/↳ (note|hint): /g, '')
        .replace(/\*\*/g, '')
        .replace(/^● /, '')
        .replace(/`/g, '')
        .replace(/^\*(.*)\*$/, '$1')
        .replace(/\s+/g, ' ')
        .replace(/\s+([.,;:])/g, '$1')
        .trim(),
    )
    .filter((line) => line !== 'Patch' && line !== 'Settings')
}

/** The page with no rig, which is what the server prerenders and what a crawler receives. */
const BLUE = await markupFor('blue-monday-bass')
const BLUE_TEXT = text(BLUE)
const BLUE_MD = renderRiff(resolveRiff(blueMondayBass, []))

describe('the riff page and the Markdown carry the same facts (#495)', () => {
  it('prints every substantive line the Markdown prints, for the empty rig', () => {
    const facts = markdownFacts(BLUE_MD)
    // A guard against a stripped-to-nothing fact list quietly passing.
    expect(facts.length).toBeGreaterThan(14)
    for (const fact of facts) expect(BLUE_TEXT, fact).toContain(fact)
  })

  it('does so for every entry in the library', async () => {
    // Not one riff: the shapes that differ between entries are chords sharing a step, a hook that
    // spans four notes and a grid that strikes every sixteenth, and no one entry has all of them.
    for (const riff of RIFFS) {
      const page = text(await markupFor(riff.id))
      for (const fact of markdownFacts(renderRiff(resolveRiff(riff, [])))) {
        expect(page, `${riff.id}: ${fact}`).toContain(fact)
      }
    }
  })

  it('draws the grid from the same rows, character for character', async () => {
    // The one block the normaliser above cannot compare, because the alignment *is* the content.
    // `gridRows` is shared, so this is a check that neither renderer re-wrapped or re-padded it.
    for (const riff of RIFFS) {
      const md = renderRiff(resolveRiff(riff, []))
      const rows = md.slice(md.indexOf('```') + 4, md.lastIndexOf('```')).trimEnd()
      const markup = await markupFor(riff.id)
      const pre = /<pre class="riff-grid mono">([\s\S]*?)<\/pre>/.exec(markup)
      expect(pre, riff.id).not.toBeNull()
      expect(pre?.[1], riff.id).toBe(rows)
    }
  })

  it('says the same thing about a rig that cannot play the figure', () => {
    // Invariant 5's sentence is one sentence, from `riff-text.ts`, on both surfaces.
    // Four words, and an offer of help rather than a report of what the reader has not done.
    const gap = 'Pick the boxes you own.'
    expect(BLUE_MD).toContain(gap)
    expect(BLUE_TEXT).toContain(gap)
  })
})

describe('the riff page exists exactly where an entry does', () => {
  it('is prerendered for every entry, and for no others', () => {
    expect(generateStaticParams().map((p) => p.id)).toEqual(RIFFS.map((riff) => riff.id))
    expect(dynamicParams).toBe(false)
  })

  it('404s on an id nothing authored, rather than rendering an empty page', async () => {
    await expect(markupFor('no-such-riff')).rejects.toThrow(/404/)
  })

  it('has one address, which the card, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    for (const riff of RIFFS) {
      expect(riffHref(riff)).toBe(`/riffs/${riff.id}`)
      expect(urls, riff.id).toContain(`${SITE_ORIGIN}${riffHref(riff)}`)
    }
    expect(urls).toContain(`${SITE_ORIGIN}/riffs`)

    const meta = await generateMetadata({ params: Promise.resolve({ id: 'blue-monday-bass' }) })
    expect(meta.alternates?.canonical).toBe('/riffs/blue-monday-bass')
    expect(meta.title).toBe('The Blue Monday bass — Patchscore')
    // What to do, not what the page holds — and the figure is one written here (§5A.5).
    expect(meta.description).toBe(
      'Build the Blue Monday bass-mid sound on the boxes you own, then practise the technique ' +
        'against a figure written here.',
    )
    // An id with no page has no metadata to give, and says so with nothing rather than a title
    // for a page that 404s.
    expect(await generateMetadata({ params: Promise.resolve({ id: 'nope' }) })).toEqual({})
  })

  it('is a peer of Devices and Directions in the nav, on every riff route', async () => {
    expect(NAV_LINKS.map((l) => l.href)).toContain('/riffs')
    expect(NAV_LINKS.find((l) => l.href === '/riffs')?.label).toBe('Riffs')
    const directions = NAV_LINKS.findIndex((l) => l.href === '/directions')
    const riffs = NAV_LINKS.findIndex((l) => l.href === '/riffs')
    // A peer, not a child: beside the other two catalogue halves rather than under either.
    expect(riffs).toBe(directions + 1)

    for (const page of [
      await shell(createElement(RiffIndexPage)),
      await shell(await RiffRoute({ params: Promise.resolve({ id: 'blue-monday-bass' }) })),
    ]) {
      expect(page.match(/<nav class="site-nav"/g)?.length ?? 0).toBe(1)
      for (const link of NAV_LINKS) {
        expect(page).toContain(`<a href="${link.href}">${link.label}</a>`)
      }
    }
  })

  it('the index lists every entry and links each to its own page', () => {
    const markup = renderToStaticMarkup(createElement(RiffIndexPage))
    for (const riff of RIFFS) {
      expect(markup, riff.id).toContain(`href="/riffs/${riff.id}"`)
      expect(text(markup), riff.id).toContain(riff.name)
      // §5A.5. The record is on the card too: a list of only our own titles is a list of things
      // nobody has heard of.
      expect(text(markup), riff.track).toContain(`From ${riff.track}`)
    }
  })
})

describe('what a riff page does not have', () => {
  /**
   * §5A. **No Studio controls.** Every one of these belongs to a song, and reaching for any of
   * them would need a `Template` — which is the whole of why a riff is not one (§5A.1). The
   * device picker is the only control on the page.
   */
  it('carries no direction, mood, seed, tempo, key or inspiration control', () => {
    for (const marker of [
      'genre-picker',
      'mood-panel',
      'mood-axis',
      'song-panel',
      'seed-field',
      'inspiration',
      'placement',
      'density-detents',
      'Copy link',
    ]) {
      expect(BLUE, marker).not.toContain(marker)
    }
  })

  /** No arrangement language: a riff has no sections, no phases, no bands and no clock. */
  it('uses no arrangement language', () => {
    for (const word of [
      'Arrangement',
      'Section',
      'Phase',
      'Density',
      'Energy',
      'Clock source',
      'Progression',
      'Harmonic cycle',
    ]) {
      expect(BLUE_TEXT, word).not.toContain(word)
    }
  })

  /**
   * No endorsement, and no hedge. The reference says where the technique is found and that the
   * figure is ours; it claims nothing about the record, nobody's approval, and nothing about how
   * close this is to anything.
   */
  it('claims no endorsement and hedges nothing', () => {
    for (const phrase of [
      'official',
      'approved',
      'as heard on',
      'sounds just like',
      'inspired by',
      'roughly',
      'more or less',
      'something like',
      'our best guess',
      'may not be',
      // §5A.5. The defence, too. A disclaimer is a hedge about what the page is, and this one
      // stood in the first place a reader's eye lands.
      'not a transcription',
      'is ours',
      'copyright',
    ]) {
      expect(BLUE_TEXT.toLowerCase(), phrase).not.toContain(phrase)
    }
    // What is left about the record is its name, in the title and in the address.
    expect(BLUE_TEXT).toContain('The Blue Monday bass')
  })

  /** Invariant 4 in ink: one sentence for the block, and nothing beside a value. */
  it('marks no value with its provenance and cites no page beside one', async () => {
    const played = await renderWithRig()
    expect(played).toContain('riff-cites')
    expect(played).not.toContain('prov-mark')
    expect(played).not.toContain('subordinate cite')
    expect(played).not.toContain('· manual')
    expect(played).not.toContain('Ranges cite')
  })

  /**
   * §5A/invariant 3. **No device is named by the entry.** Every box name on the page comes from
   * the reader's own rig; the riff itself names none, and the page must not add one.
   */
  it('names no device anywhere on the empty-rig page but in the picker', () => {
    const head = BLUE_TEXT.slice(0, BLUE_TEXT.indexOf('Your boxes'))
    for (const device of DEVICES) {
      expect(head, device.name).not.toContain(device.name)
    }
  })

  /**
   * §5A.5. **Metadata offers something to do, and never a table of contents.**
   *
   * *A written figure, a step grid, and settings for whichever box in your rig carries it* was
   * three nouns describing the document to somebody who had not opened it. What is asserted is the
   * verb: a description that opens with one is a description of what the reader gets to do.
   */
  it('describes what to do rather than what the page contains', async () => {
    const index = (await import('../app/riffs/page')).metadata
    const entry = await generateMetadata({ params: Promise.resolve({ id: 'blue-monday-bass' }) })
    for (const description of [String(index.description), String(entry.description)]) {
      expect(description).toMatch(/^(Choose|Build|Play|Pick) /)
      expect(description).toContain('boxes you own')
      // The figure is written here, so nothing suggests the record's own notes ship.
      expect(description).toContain('written here')
      for (const contents of ['a step grid', 'written out as', 'with the technique in words']) {
        expect(description, contents).not.toContain(contents)
      }
    }
  })

  it('shows no backlog: what is unauthored is never the reader’s business', () => {
    for (const phrase of ['not yet', 'nobody has', 'unauthored', 'TODO', 'coming soon']) {
      expect(BLUE_TEXT, phrase).not.toContain(phrase)
    }
  })
})

/**
 * §5A/#503. **The picker is the riff page's own**, because the studio's carries four concepts this
 * surface does not have. Each assertion below names one of them, and the class-level ones matter
 * as much as the words: `.pick` reserves a 46px gutter for #138's cable lane and paints its
 * checkbox as a socket a cable lands in, both of which are promises on a page that patches nothing.
 */
describe('the device picker on a riff page', () => {
  const PICKER = renderToStaticMarkup(
    createElement(RiffPicker, { selected: [], onToggle: () => undefined }),
  )

  it('has no inspiration filters, and no filter that needs a direction to answer', () => {
    for (const marker of [
      'Inspiration filters',
      'picker-filters',
      'Fills a gap',
      'Several parts',
      'picker-multipart',
      'is-inert',
    ]) {
      expect(PICKER, marker).not.toContain(marker)
    }
  })

  it('has no patchbay: no clock source, no cables, no `out` leaving for a guide', () => {
    for (const marker of [
      'patch-legend',
      'patch-out',
      'patch-cable',
      'data-chain',
      'data-patched',
      'pick-jack',
      'Clock source',
      'take clock',
      'runs free',
    ]) {
      expect(PICKER, marker).not.toContain(marker)
    }
  })

  it('does not reuse `.pick`, whose gutter is reserved for cables that are not drawn here', () => {
    expect(PICKER).not.toContain('class="pick"')
    expect(PICKER).not.toContain('class="pick pick-off"')
    expect(PICKER).not.toContain('class="picker-list"')
    expect(PICKER).toContain('class="riff-picker-list"')
    const lane = CSS.slice(CSS.indexOf('#138 — the picker'))
    expect(lane, 'the cable lane must not reach the riff row').not.toContain('.riff-pick')
  })

  it('names its group, so forty-six checkboxes are not announced as an unnamed fieldset', () => {
    expect(PICKER).toContain('<legend class="sr-only">Devices in your rig</legend>')
    expect((PICKER.match(/<fieldset/g) ?? []).length).toBe(
      (PICKER.match(/<legend/g) ?? []).length,
    )
  })

  it('offers no rig history, which is the studio’s and the door to writing one back', () => {
    expect(PICKER).not.toContain('picker-recent')
    expect(PICKER).not.toContain('Rigs you had before')
  })

  it('keeps search, kind filtering, links, checkboxes and the cap', () => {
    expect(PICKER).toContain('type="search"')
    expect(PICKER).toContain('class="picker-search"')
    expect(PICKER).toContain('class="picker-kind"')
    expect(PICKER).toContain('<option value="any" selected="">All kinds</option>')
    expect(PICKER).toContain('type="checkbox"')
    for (const device of DEVICES) {
      expect(PICKER, device.id).toContain(`href="/devices/${device.id}"`)
    }
    // Every device, in registry order, and none of them ticked on a page opened with no rig.
    expect((PICKER.match(/type="checkbox"/g) ?? []).length).toBe(DEVICES.length)
    expect(PICKER).not.toContain('checked=""')
  })

  it('refuses the eleventh tick and says so only once the rig is full (#301)', () => {
    const full = DEVICES.slice(0, MAX_RIG_DEVICES).map((d) => d.id)
    const atCap = renderToStaticMarkup(
      createElement(RiffPicker, { selected: full, onToggle: () => undefined }),
    )
    expect(atCap).toContain('That is a full rig; untick one to add another.')
    expect((atCap.match(/disabled=""/g) ?? []).length).toBe(DEVICES.length - MAX_RIG_DEVICES)
    // Nothing says there is a ceiling until it is reached.
    const nine = DEVICES.slice(0, MAX_RIG_DEVICES - 1).map((d) => d.id)
    const under = renderToStaticMarkup(
      createElement(RiffPicker, { selected: nine, onToggle: () => undefined }),
    )
    expect(under).not.toContain('full rig')
    expect(under).not.toContain('disabled=""')
  })

  it('groups what is picked above the rest, and keeps a filtered-out pick on the list', () => {
    const second = DEVICES[1]?.id
    if (second === undefined) throw new Error('empty registry')
    const markup = renderToStaticMarkup(
      createElement(RiffPicker, { selected: [second], onToggle: () => undefined }),
    )
    // The picked row is first, whatever its place in the registry.
    const rows = [...markup.matchAll(/href="\/devices\/([^"]+)"/g)].map((m) => m[1])
    expect(rows[0]).toBe(second)
    expect(markup).toContain('1 selected. Untick to drop.')
    // `retained` is on every row, so a filter that would hide a picked box marks it instead.
    expect(markup).toContain('data-retained="no"')
  })
})

describe('the riff page at 1280px and 390px', () => {
  /**
   * #21. These are the claims CSS can carry. **They are not a rendering**: nothing here proves
   * the page *looks* right at either width, and the two viewports still want an operator's eyes.
   */
  it('scrolls the grid inside its own container, never the body', () => {
    expect(rule('.riff-grid-scroll')).toContain('overflow-x: auto')
    expect(rule('.riff-grid-scroll')).toContain('min-width: 0')
    expect(rule('.riff-grid')).toContain('white-space: pre')
  })

  it('keeps values monospace and does not shrink type to fit (#21)', () => {
    // 0.95rem, not a fraction chosen to make a 64-step row fit 390px.
    expect(rule('.riff-grid')).toContain('font-size: 0.95rem')
    expect(BLUE).toContain('<pre class="riff-grid mono">')
  })

  it('wraps every fact row rather than taking the page sideways', () => {
    for (const selector of ['.riff-param-line', '.riff-where', '.riff-trigger']) {
      expect(rule(selector), selector).toContain('flex-wrap: wrap')
    }
    // The note row is one of a grouped selector, so it is found by the group it heads.
    expect(rule('.riff-note,\n.riff-slot,\n.riff-articulation > li')).toContain('flex-wrap: wrap')
    expect(rule('.riff-lead')).toContain('overflow-wrap: break-word')
  })

  it('holds prose to a reading measure', () => {
    for (const selector of ['.riff-gap', '.riff-cites', '.riff-hint']) {
      expect(rule(selector)).toContain('max-width: 66ch')
    }
  })

  /**
   * The print rule is **deny-by-default over `.panel`**, with a `:not()` per exempt class. Asserting
   * that `:not(.riff-panel)` appears proves only that the exemption exists; it says nothing about
   * which blocks carry that class, and the first version of this page shipped a picker that did —
   * so the comment and the test both claimed a printed sheet dropped forty-six tick boxes while
   * the stylesheet printed every one of them.
   *
   * So the selector is read out of the stylesheet and *evaluated* against the class lists the page
   * actually renders. What it answers is the question a reader has: is this block on the paper.
   */
  it('drops every control from the printed sheet and keeps every block of the figure', () => {
    const print = CSS.slice(CSS.indexOf('@media print'))
    const deny = /\n\s*\.panel((?::not\(\.[a-z-]+\))+),/.exec(print)
    expect(deny, 'the deny-by-default panel rule is missing').not.toBeNull()
    const exempt = [...(deny?.[1] ?? '').matchAll(/:not\(\.([a-z-]+)\)/g)].map((m) => m[1] as string)
    expect(exempt.length).toBeGreaterThan(0)

    /** Whether the deny rule reaches a block with this class list, given what it exempts. */
    const hidden = (classes: string) => {
      const names = classes.split(/\s+/)
      return names.includes('panel') && !exempt.some((name) => names.includes(name))
    }

    // Every `.panel` the entry page renders, as the page renders it.
    const panels = [...BLUE.matchAll(/class="([^"]*\bpanel\b[^"]*)"/g)].map((m) => m[1] as string)
    expect(panels.length).toBeGreaterThan(2)

    const picker = panels.find((classes) => classes.includes('riff-picker'))
    expect(picker, 'the picker is not on the page').toBeDefined()
    expect(hidden(picker as string), `the picker prints: class="${picker ?? ''}"`).toBe(true)

    // And the blocks that are the sheet stay on it.
    for (const classes of panels.filter((c) => !c.includes('riff-picker'))) {
      expect(hidden(classes), `a block of the figure is dropped: class="${classes}"`).toBe(false)
    }

    expect(print).toContain('.site-nav,')
    expect(print).toContain('.riff-grid-scroll,')
  })
})

/** One rig, resolved on the server, so the voice block can be asserted without a browser. */
async function renderWithRig(): Promise<string> {
  const { RiffVoice } = await import('../components/riff/riff-voice')
  const rig = DEVICES.filter((d) => d.id === 'moog-subsequent-37')
  const resolution = resolveRiff(blueMondayBass, rig)
  if (resolution.outcome !== 'played') throw new Error('the fixture rig should play this')
  return renderToStaticMarkup(
    createElement(RiffVoice, { riff: blueMondayBass, voice: resolution.voice }),
  )
}

describe('the voice block', () => {
  it('names the box and the voice, draws its cables with the cable mark, and cites once', async () => {
    const markup = await renderWithRig()
    expect(text(markup)).toContain('Subsequent 37 · Voice')
    expect(markup).toContain('class="riff-cites"')
    expect((markup.match(/class="riff-cites"/g) ?? []).length).toBe(1)
  })

  it('uses `CableMark` and `recipeRouting` for patch lines, as every other surface does', async () => {
    const source = readFileSync(
      new URL('../components/riff/riff-voice.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain("import { CableMark } from '@/components/cable-mark'")
    expect(source).toContain('<CableMark />')
    expect(source).toContain('recipeRouting(voice.recipe)')
    // A patch line is a cable, an arrow and two monospace jack names — the shape `phase-sound.tsx`
    // and `kit-parts.tsx` both use.
    expect(source).toContain('className="patch riff-patch"')
  })

  it('carries the settings, in the guide’s own module boxes', async () => {
    const markup = await renderWithRig()
    expect(markup).toContain('class="module-box"')
    expect(markup).toContain('class="module-led"')
    expect(markup).toContain('class="param-name"')
  })

  it('renders articulation values as they are, whatever type they are', async () => {
    const rig = DEVICES.filter((d) => d.id === 'elektron-digitakt-ii')
    const resolution = resolveRiff(blueMondayBass, rig)
    if (resolution.outcome !== 'played') throw new Error('the sampler should play this')
    const { RiffVoice } = await import('../components/riff/riff-voice')
    const markup = renderToStaticMarkup(
      createElement(RiffVoice, { riff: blueMondayBass, voice: resolution.voice }),
    )
    expect(markup).not.toContain('NaN')
    expect(text(markup)).toContain('velocity 112')
    // §2.1/#32. The bridge between the figure's C4 convention and a box that puts middle C at C5.
    expect(text(markup)).toContain('Trigger note C5 MIDI 60')
  })
})
