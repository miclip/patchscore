import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RootLayout from '../app/layout'
import sitemap from '../app/sitemap'
import RiffIndexPage from '../app/riffs/page'
import RiffRoute, { dynamicParams, generateMetadata, generateStaticParams } from '../app/riffs/[id]/page'
import { RiffFigure } from '../components/riff/riff-figure'
import { RigPicker } from '../components/rig/rig-picker'
import { NAV_LINKS } from '../components/site-nav'
import { hintText } from '../components/guide/format'
import type { DeviceId, RiffVoicing } from '../lib/core'
import { MAX_RIG_DEVICES, resolveRiff, spellChord } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { RECORD_RIFFS, RIFFS, blueMondayBass, museRunnerFloatingArrivalLead } from '../lib/riffs'
import { riffHref } from '../lib/studio/catalogue'
import { renderRiff } from '../lib/studio/riff-markdown'
import {
  RIFF_GRID_LEAD,
  gridRepeatSentence,
  gridRows,
  riffChordSummary,
  riffLength,
  slotRows,
} from '../lib/studio/riff-text'
import { SITE_ORIGIN } from '../lib/studio/site'
import { gridOf, heldRiff } from './fixtures'

/**
 * §5A/#495. **The React page and the Markdown export carry the same facts**, plus the things
 * bytes alone do not say out loud: that the route exists exactly where an entry does, that the
 * page is free of everything a *song* would bring with it, and that nothing on it is a claim
 * nobody checked.
 */

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

/**
 * The declaration block for one selector, whether it stands alone or is one of a comma-separated
 * group. #520 put several riff selectors into groups with their `sample-` twins — the same block
 * doing the same job on two surfaces — so matching only `\n.riff-x {` stopped finding them.
 */
function rule(selector: string): string {
  const alone = CSS.indexOf(`\n${selector} {`)
  const grouped = CSS.indexOf(`\n${selector},`)
  const start = alone > -1 ? alone : grouped
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
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
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
 *  - The **grid rows** (`1 xxxx xxxx…`). The page draws boxes over the same hits since #528 and
 *    carries these rows underneath, visually hidden, as the text a reader copies — so they are
 *    identical by construction and tag-stripping collapses the runs of space that make them line
 *    up. Compared separately, un-normalised, below.
 *  - The **slot rows** (`ghost · 2, 4, 6`). The page's carry the velocity and the export's do
 *    not, which is #528's second half: `ghost — 4, 12 (all vel 44)` is what a guide's page says
 *    and what a reader at the machine needs, where the Markdown row is a bare list of steps. Not
 *    a fact the page invents and not one the export drops — every step is on both — so the two
 *    are compared step for step below rather than string for string.
 *  - `Patch` and `Settings`, which are the Markdown's own ink: it has nothing but a bold line to
 *    separate two blocks, where the page has a list and a heading.
 *  - The **step-count line**, `step 1 · F2 · degree 1 …`, keeps every one of its facts; only the
 *    separators differ, and those are ink.
 *  - A **table row**'s pipes. `| i | 2 |` is one renderer drawing two cells; the page draws the
 *    same two in a `<td>` pair, and tag-stripping leaves `i 2`. The cells are compared, the
 *    pipes are not, and the `| --- | ---: |` rule is dropped because it is alignment and nothing
 *    else. Arrived with the chord table (§5A/§4.1) — the first thing either riff surface tabulates.
 */
const SLOT_ROW = /^- `([a-z-]+)` · (.+)$/
const TABLE_RULE = /^\|[\s:|-]+\|$/
const TABLE_ROW = /^\|(.+)\|$/

function markdownFacts(md: string): string[] {
  const fence = /^[ ]*\d+ [x·]/
  return md
    .split('\n')
    .filter(
      (line) =>
        line.trim() !== '' &&
        line !== '```' &&
        !fence.test(line) &&
        !SLOT_ROW.test(line) &&
        !TABLE_RULE.test(line.trim()),
    )
    .map((line) => {
      const row = TABLE_ROW.exec(line.trim())
      return row === null
        ? line
        : (row[1] as string)
            .split('|')
            .map((cell) => cell.trim())
            .join(' ')
    })
    .map((line) =>
      line
        .replace(/^#+ /, '')
        .replace(/^\s*- /, '')
        .replace(/↳ (note|hint|neutral): /g, '')
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
    // The record-named entries, which are the ones with a page here (#598); the twelve
    // patch-named figures are held to the same parity in `test/preset-figure-page.test.ts`.
    for (const riff of RECORD_RIFFS) {
      const page = text(await markupFor(riff.id))
      for (const fact of markdownFacts(renderRiff(resolveRiff(riff, [])))) {
        expect(page, `${riff.id}: ${fact}`).toContain(fact)
      }
    }
  })

  it('draws the grid as boxes, and copies as the rows the Markdown prints (#528)', async () => {
    // The one block the normaliser above cannot compare, because the alignment *is* the content.
    // The page draws `StepGrid` — the figure a guide draws — and carries the export's own rows
    // under it as hidden text, so a selection still copies `1 xxxx xxxx xxxx xxxx`. The step
    // number is `.step-index` here and the padding that right-aligns it in a `<pre>` is CSS, so
    // the rows are compared with that padding trimmed and nothing else.
    for (const riff of RECORD_RIFFS) {
      const md = renderRiff(resolveRiff(riff, []))
      const markup = await markupFor(riff.id)
      // A held riff has no grid, and neither surface draws one (§5A.2/#608).
      if (riff.pattern === undefined) {
        expect(md, riff.id).not.toContain('```')
        expect(markup, riff.id).not.toContain('class="step-index"')
        continue
      }
      const rows = md.slice(md.indexOf('```') + 4, md.lastIndexOf('```')).trimEnd().split('\n')
      // The Markdown's ink is gone from the page: no `<pre>`, and no second treatment of it.
      expect(markup, riff.id).not.toContain('<pre class="riff-grid')
      const drawn = [
        ...markup.matchAll(
          /<span class="step-index">(\d+)<\/span><span class="step-text">([^<]*)<\/span>/g,
        ),
      ]
      expect(
        drawn.map((row) => `${row[1] ?? ''}${row[2] ?? ''}`),
        riff.id,
      ).toEqual(rows.map((row) => row.trimStart()))

      // And the boxes say what the text says: one cell per step, filled on every `x`.
      const cells = markup.match(/class="step(?: on)?(?: beat)?"/g) ?? []
      const filled = markup.match(/class="step on(?: beat)?"/g) ?? []
      expect(cells.length, riff.id).toBe(gridOf(riff).length)
      expect(filled.length, riff.id).toBe(rows.join('').split('x').length - 1)
    }
  })

  it('puts the velocity and #457’s definition trigger on every slot row (#528)', async () => {
    // The export's row is a bare list of steps. The page's is the guide's: the slot word is a
    // button that opens its definition, and a velocity the reader has to dial is on the line.
    for (const riff of RECORD_RIFFS) {
      const md = renderRiff(resolveRiff(riff, []))
      const exported = [...md.matchAll(new RegExp(SLOT_ROW.source, 'gm'))]
      const markup = await markupFor(riff.id)
      // No grid, so no slots on either surface (§5A.2/#608).
      if (riff.pattern === undefined) {
        expect(exported.length, riff.id).toBe(0)
        expect(markup, riff.id).not.toContain('class="vocab-term"')
        continue
      }
      expect(exported.length, riff.id).toBeGreaterThan(0)
      const drawn = [
        ...markup.matchAll(
          /<button type="button" class="vocab-term"[^>]*>([a-z-]+)<\/button><\/span><span class="token-sep">—<\/span><span class="mono">([^<]*)<\/span>/g,
        ),
      ]
      expect(
        drawn.map((row) => row[1]),
        riff.id,
      ).toEqual(exported.map((row) => row[1]))
      for (const [i, row] of drawn.entries()) {
        const steps = (row[2] ?? '').replace(/ \(all vel \d+\)/, '').replace(/ \(vel \d+\)/g, '')
        expect(steps, `${riff.id}: ${row[1] ?? ''}`).toBe(exported[i]?.[2])
      }
      // Not vacuous: this library authors velocities, and the page is where they are read.
      expect(drawn.some((row) => /vel \d+/.test(row[2] ?? '')), riff.id).toBe(true)
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

/**
 * §5A/§4.1. **The chord table says where the chords come from**, on both surfaces and once.
 *
 * A `harmony` on a riff means the figure is played *over* chords the page does not set up: the
 * voice block claims one part. That is a fact of the shape — a figure that *is* the chords has
 * no `harmony` and carries its voicing in its notes — so it is one sentence of copy under the
 * table and not a field on the entry. Pinned as a string on both renderers rather than left to
 * the parity test above, because parity would pass just as happily on the sentence being absent
 * from both.
 */
describe('the chord table says the chords are supplied separately', () => {
  const blade = RIFFS.find((r) => r.id === 'blade-runner-blues-lead') as (typeof RIFFS)[number]
  const SENTENCE =
    'The figure is played over these chords; supply them separately if your rig allows.'

  it('prints the sentence once under the table, in both renderers', async () => {
    const md = renderRiff(resolveRiff(blade, []))
    const page = text(await markupFor('blade-runner-blues-lead'))
    for (const doc of [md, page]) {
      expect(doc).toContain(SENTENCE)
      expect(doc.split(SENTENCE).length - 1).toBe(1)
    }
    // Under the table, not above it: the rows come first, then where they come from.
    const chords = md.slice(md.indexOf('## The chords'), md.indexOf('## The notes'))
    expect(chords.indexOf('| v | C# · E · G# | 11')).toBeLessThan(chords.indexOf(SENTENCE))
  })

  it('spells every chord in the riff’s key, once per authored row, on both surfaces (#570)', async () => {
    // Every entry with a `harmony`, checked row by row against `spellChord` on the *authored*
    // progression rather than against the other renderer: parity alone would pass on both
    // surfaces printing the wrong notes, or none.
    let withHarmony = 0
    for (const riff of RECORD_RIFFS) {
      if (riff.harmony === undefined) continue
      withHarmony++
      const md = renderRiff(resolveRiff(riff, []))
      const markup = await markupFor(riff.id)
      const rows = riff.harmony.progression
      let from = 1
      for (const step of rows) {
        const spelt = spellChord(step.degree, riff.key)
        expect(spelt.outcome, `${riff.id}: ${step.degree} in ${riff.key}`).toBe('resolved')
        if (spelt.outcome !== 'resolved') continue
        const notes = spelt.chord.notes.join(' · ')
        const span = `${from}\u2013${from + step.bars - 1}`
        // The bar span makes each row unique even where a degree is authored twice in a cycle.
        const mdRow = `| ${step.degree} | ${notes} | ${span} |`
        expect(md.split(mdRow).length - 1, `${riff.id}: ${mdRow}`).toBe(1)
        const pageRow =
          `<td class="mono">${step.degree}</td><td class="mono">${notes}</td>` +
          `<td class="mono numeric">${span}</td>`
        expect(markup.split(pageRow).length - 1, `${riff.id}: ${pageRow}`).toBe(1)
        from += step.bars
      }
      // Exactly the authored rows and no others.
      expect(md.match(/^\| b?[IViv]+(?:7|sus2)? \| /gm)?.length, riff.id).toBe(rows.length)
      expect(markup.match(/<td class="mono">b?[IViv]+(?:7|sus2)?<\/td>/g)?.length, riff.id).toBe(
        rows.length,
      )
    }
    expect(withHarmony).toBeGreaterThan(0)
    // Not vacuous about the borrowing that motivated case-decides-the-third: Blade Runner's `I`
    // in F# minor is on the page as a major chord, beside the key's own minor `i`.
    const blade = text(await markupFor('blade-runner-blues-lead'))
    expect(blade).toContain('I F# · A# · C#')
    expect(blade).toContain('i F# · A · C#')
  })

  it('says nothing on a riff with no harmony, which is most of them', () => {
    expect(blueMondayBass.harmony).toBeUndefined()
    expect(BLUE_MD).not.toContain(SENTENCE)
    expect(BLUE_TEXT).not.toContain(SENTENCE)
    expect(BLUE_TEXT).not.toContain('The chords')
  })
})

/**
 * §5A.2/#623. **The chord summary says how the figure and the cycle differ in length.** Equal,
 * it is the head alone. Shorter, the figure's bars. Longer, that the cycle repeats under the
 * figure, with the count where the figure is a whole number of cycles: a twelve-bar table under
 * a forty-eight bar figure said nothing about the chords coming round until this did.
 */
describe('the chord summary says the cycle repeats under a longer figure (#623)', () => {
  const blade = RIFFS.find((r) => r.id === 'blade-runner-blues-lead') as (typeof RIFFS)[number]
  const muse = museRunnerFloatingArrivalLead
  const HEAD = '6 chords over 12 bars, in F# minor.'
  const REPEATS = 'The 12-bar cycle repeats 4 times under this 48-bar figure.'

  it('is the head alone where the figure is the cycle', () => {
    expect(blade.hook.bars).toBe(blade.harmony?.cycleBars)
    expect(riffChordSummary(blade)).toBe(HEAD)
  })

  it('says the cycle repeats, and how many times, under the four-loop line', () => {
    expect(muse.hook.bars).toBe(48)
    expect(riffChordSummary(muse)).toBe(`${HEAD} ${REPEATS}`)
    // Once, above the rows, in the export.
    const md = renderRiff(resolveRiff(muse, []))
    expect(md.split(REPEATS).length - 1).toBe(1)
    const chords = md.slice(md.indexOf('## The chords'), md.indexOf('## The notes'))
    expect(chords.indexOf(REPEATS)).toBeLessThan(chords.indexOf('| i | F# · A · C# | 1'))
  })

  it('drops the count where the figure is not a whole number of cycles', () => {
    const uneven = { ...muse, hook: { ...muse.hook, bars: 18 } }
    expect(riffChordSummary(uneven)).toBe(`${HEAD} The 12-bar cycle repeats under this 18-bar figure.`)
  })

  it('still names the bars where the figure is shorter than the cycle', () => {
    const short = { ...blade, figureStartsAtBar: 7, hook: { ...blade.hook, bars: 4 } }
    expect(riffChordSummary(short)).toBe(`${HEAD} The figure is bars 7\u201310.`)
  })

  it('moves the key with the page’s key control and nothing else', () => {
    expect(riffChordSummary(muse, 'G minor')).toBe(`6 chords over 12 bars, in G minor. ${REPEATS}`)
  })
})

/**
 * §5A.2/#603. **A grid shorter than the figure says how many times it goes round.** The Blade
 * Runner line is twelve bars over a four-bar grid, and a page that printed the grid once under
 * the lead sentence alone left the reader to work out that it repeats. Pinned as a string on
 * both renderers, for the reason the sentence above is: parity would pass on both omitting it.
 */
describe('the grid says how many times it repeats under a longer figure (#603)', () => {
  const blade = RIFFS.find((r) => r.id === 'blade-runner-blues-lead') as (typeof RIFFS)[number]
  const REPEAT = 'The grid is 4 bars and the figure is 12: play it round 3 times.'

  it('prints the repeat sentence once, after the lead, on both renderers', async () => {
    expect(gridRepeatSentence(blade)).toBe(REPEAT)
    const md = renderRiff(resolveRiff(blade, []))
    const page = text(await markupFor('blade-runner-blues-lead'))
    for (const doc of [md, page]) {
      expect(doc).toContain(RIFF_GRID_LEAD)
      expect(doc.split(REPEAT).length - 1).toBe(1)
      expect(doc.indexOf(REPEAT)).toBeGreaterThan(doc.indexOf(RIFF_GRID_LEAD))
    }
    // Before the rows, so it is read before the grid is counted.
    expect(md.indexOf(REPEAT)).toBeLessThan(md.indexOf('```'))
  })

  it('says nothing where the figure and the grid are the same length', () => {
    expect(gridRepeatSentence(blueMondayBass)).toBeUndefined()
    expect(BLUE_MD).not.toContain('play it round')
    expect(BLUE_TEXT).not.toContain('play it round')
    for (const riff of RIFFS) {
      // A held riff has no grid to repeat, so it says nothing either (§5A.2/#608).
      const same = riff.pattern === undefined || riff.hook.bars * 16 === riff.pattern.length
      expect(gridRepeatSentence(riff) === undefined, riff.id).toBe(same)
    }
  })
})

/**
 * §5A.2/#608. **A held riff has no grid, and both surfaces leave the section out entirely.** No
 * heading, no lead sentence, no rows and no slots — not an empty panel — and the header says how
 * long the figure is in bars alone, since a step count is a fact about a grid. No library entry
 * has this shape yet, so the fixture stands in, rendered through the same figure component and
 * the same export the route uses.
 */
describe('a held riff prints no grid section on either surface (#608)', () => {
  const held = heldRiff()
  const resolution = resolveRiff(held, [])
  const md = renderRiff(resolution)
  const figure = renderToStaticMarkup(createElement(RiffFigure, { riff: held, resolution }))
  const page = text(figure)

  it('describes its length by bars only', () => {
    expect(riffLength(held)).toBe('2 bars')
    expect(riffLength(blueMondayBass)).toMatch(/^\d+ bars? · \d+ steps$/)
    // The lead line, whole: the note rows below it still count steps, since those are the hook's.
    expect(md).toContain('`pad` · `soft` · 70 BPM (60–80) · C major · 2 bars\n')
  })

  it('omits the grid from the Markdown: no heading, no lead, no fence, no slots', () => {
    expect(md).not.toContain('## The grid')
    expect(md).not.toContain(RIFF_GRID_LEAD)
    expect(md).not.toContain('```')
    expect(md.match(new RegExp(SLOT_ROW.source, 'gm'))).toBeNull()
    expect(gridRows(held)).toEqual([])
    expect(slotRows(held)).toEqual([])
    expect(gridRepeatSentence(held)).toBeUndefined()
    // The notes are still there, and the sections either side of the gap run straight on.
    expect(md).toContain('## The notes')
    expect(md).toContain('## Where it plays')
    expect(md).not.toContain('\n\n\n')
  })

  it('omits the grid panel from the page: no heading, no boxes, no slots', () => {
    expect(page).not.toContain('The grid')
    expect(page).not.toContain(RIFF_GRID_LEAD)
    expect(figure).not.toContain('class="step-index"')
    expect(figure).not.toContain('class="vocab-term"')
    expect(page).toContain('The notes')
  })

  it('still carries every fact the Markdown prints about the figure', () => {
    // The technique, the lead line and the gap are the route's, not the figure's, so the parity
    // here is over the block the figure owns: from the notes heading on.
    const facts = markdownFacts(md.slice(md.indexOf('## The notes'), md.indexOf('## Where it plays')))
    expect(facts.length).toBeGreaterThan(2)
    for (const fact of facts) expect(page, fact).toContain(fact)
  })
})

describe('the riff page exists exactly where a record-named entry does (#598)', () => {
  it('is prerendered for every record-named entry, and for no others', () => {
    expect(generateStaticParams().map((p) => p.id)).toEqual(RECORD_RIFFS.map((riff) => riff.id))
    expect(RECORD_RIFFS.map((riff) => riff.id)).toEqual([
      'acid-tracks-line',
      'an-ending-ascent-pad',
      'blade-runner-blues-lead',
      'blue-monday-bass',
      'i-feel-love-one-shape-arp',
      'inner-city-life-held-sub',
      'show-me-love-organ-stab',
      'strings-of-life-walking-entry-stab',
      'thriller-synth-riff',
    ])
    expect(dynamicParams).toBe(false)
  })

  it('404s on an id nothing authored, rather than rendering an empty page', async () => {
    await expect(markupFor('no-such-riff')).rejects.toThrow(/404/)
  })

  /**
   * §5A.7/#598. A figure named for a factory patch is a page under the box that ships the
   * patch and has no page here. Every one of the twelve, so a thirteenth added to `lib/riffs`
   * with a `patch` reference 404s here without an edit.
   */
  it('404s on every patch-named id, which is a page under its box instead', async () => {
    const patches = RIFFS.filter((r) => r.reference.kind === 'patch')
    expect(patches).toHaveLength(35)
    for (const riff of patches) {
      await expect(markupFor(riff.id), riff.id).rejects.toThrow(/404/)
      expect(await generateMetadata({ params: Promise.resolve({ id: riff.id }) }), riff.id).toEqual(
        {},
      )
    }
  })

  it('has one address, which the card, the canonical and the sitemap all use', async () => {
    const urls = sitemap().map((entry) => entry.url)
    for (const riff of RECORD_RIFFS) {
      expect(riffHref(riff)).toBe(`/riffs/${riff.id}`)
      expect(urls, riff.id).toContain(`${SITE_ORIGIN}${riffHref(riff)}`)
    }
    // And the sitemap names no `/riffs/` address this route would 404 on.
    const params = new Set(generateStaticParams().map((p) => `${SITE_ORIGIN}/riffs/${p.id}`))
    for (const url of urls.filter((u) => u.startsWith(`${SITE_ORIGIN}/riffs/`))) {
      expect(params.has(url), url).toBe(true)
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
    // for a page that 404s. A patch-named id is one of those here (#598).
    expect(await generateMetadata({ params: Promise.resolve({ id: 'nope' }) })).toEqual({})
    expect(
      await generateMetadata({ params: Promise.resolve({ id: 'muse-runner-floating-arrival-lead' }) }),
    ).toEqual({})
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

  it('the index lists the nine record-named entries, links each to its own page, and lists no other', () => {
    const markup = renderToStaticMarkup(createElement(RiffIndexPage))
    for (const riff of RECORD_RIFFS) {
      expect(markup, riff.id).toContain(`href="/riffs/${riff.id}"`)
      expect(text(markup), riff.id).toContain(riff.name)
      // §5A.5. The reference is on the card too: a list of only our own titles is a list of
      // things nobody has heard of.
      expect(text(markup), riff.reference.name).toContain(`From ${riff.reference.name}`)
    }
    // §5A.7/#598. The twelve are the box's, and a card here would link to a 404.
    for (const riff of RIFFS.filter((r) => r.reference.kind === 'patch')) {
      expect(markup, riff.id).not.toContain(`href="/riffs/${riff.id}"`)
      expect(text(markup), riff.id).not.toContain(riff.name)
    }
    expect(markup.match(/href="\/riffs\//g)?.length).toBe(9)
    expect(text(markup)).toContain('9 techniques.')
    expect(text(markup)).toContain('9 riffs')
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
    createElement(RigPicker, { selected: [], onToggle: () => undefined }),
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
    expect(PICKER).toContain('class="rig-picker-list"')
    const lane = CSS.slice(CSS.indexOf('#138 — the picker'))
    expect(lane, 'the cable lane must not reach the riff row').not.toContain('.rig-pick')
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
      createElement(RigPicker, { selected: full, onToggle: () => undefined }),
    )
    expect(atCap).toContain('That is a full rig; untick one to add another.')
    expect((atCap.match(/disabled=""/g) ?? []).length).toBe(DEVICES.length - MAX_RIG_DEVICES)
    // Nothing says there is a ceiling until it is reached.
    const nine = DEVICES.slice(0, MAX_RIG_DEVICES - 1).map((d) => d.id)
    const under = renderToStaticMarkup(
      createElement(RigPicker, { selected: nine, onToggle: () => undefined }),
    )
    expect(under).not.toContain('full rig')
    expect(under).not.toContain('disabled=""')
  })

  it('groups what is picked above the rest, and keeps a filtered-out pick on the list', () => {
    const second = DEVICES[1]?.id
    if (second === undefined) throw new Error('empty registry')
    const markup = renderToStaticMarkup(
      createElement(RigPicker, { selected: [second], onToggle: () => undefined }),
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
    // The guide's scroller, since #528: the figure is one figure and it is drawn once.
    expect(rule('.table-scroll')).toContain('overflow-x: auto')
    // A grid column is a grid item, where a guide's block is not — without this the widest row
    // sets the column's width and takes the page sideways.
    expect(rule('.table-scroll')).toContain('min-width: 0')
    expect(rule('.step-grid')).toContain('min-width: max-content')
  })

  it('keeps values monospace and does not shrink type to fit (#21)', () => {
    expect(BLUE).toContain('<div class="step-grid mono"')
    // Fixed cells, not a fraction chosen to make a 64-step row fit 390px: it scrolls instead.
    expect(rule('.step')).toContain('width: 15px')
    // And the copy keeps the spacing that makes a row countable.
    expect(rule('.step-text')).toContain('white-space: pre')
  })

  it('wraps every fact row rather than taking the page sideways', () => {
    for (const selector of ['.riff-param-line', '.riff-where', '.riff-trigger']) {
      expect(rule(selector), selector).toContain('flex-wrap: wrap')
    }
    expect(rule('.riff-note')).toContain('flex-wrap: wrap')
    // The slot rows are the guide's list since #528, and they wrap there too.
    expect(rule('.slots > li')).toContain('flex-wrap: wrap')
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

    const picker = panels.find((classes) => classes.includes('rig-picker'))
    expect(picker, 'the picker is not on the page').toBeDefined()
    expect(hidden(picker as string), `the picker prints: class="${picker ?? ''}"`).toBe(true)

    // And the blocks that are the sheet stay on it.
    for (const classes of panels.filter((c) => !c.includes('rig-picker'))) {
      expect(hidden(classes), `a block of the figure is dropped: class="${classes}"`).toBe(false)
    }

    expect(print).toContain('.site-nav,')
    // The grid prints as the guide's does: nothing clips, and the fill is toner (#219).
    expect(print).toContain('.table-scroll,')
    expect(print).toContain('.step,')
  })
})

/**
 * One rig, resolved on the server, so the voice block can be asserted without a browser.
 *
 * The voice comes back with the markup because two of the things this block renders are the
 * device's own — a slot it articulates and the jog it authors for that slot — and a test that
 * wrote them out as strings would be asserting one box's content rather than this page's shape.
 */
async function voiceFor(deviceId: DeviceId): Promise<{ markup: string; voice: RiffVoicing }> {
  const { RiffVoice } = await import('../components/riff/riff-voice')
  const rig = DEVICES.filter((d) => d.id === deviceId)
  const resolution = resolveRiff(blueMondayBass, rig)
  if (resolution.outcome !== 'played') throw new Error(`${deviceId} should play this`)
  return {
    markup: renderToStaticMarkup(
      createElement(RiffVoice, { riff: blueMondayBass, voice: resolution.voice }),
    ),
    voice: resolution.voice,
  }
}

async function renderWithRig(): Promise<string> {
  return (await voiceFor('moog-subsequent-37')).markup
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
    expect(source).toContain('recipeRouting(voice.recipe)')
    // A patch line is a cable, an arrow and two monospace jack names — the shape `phase-sound.tsx`
    // and `kit-parts.tsx` both use. Since #520 it is drawn by `PatchList`, which this page hands
    // its own class list: the shared thing is the shape, and the ink stays this page's (#33).
    expect(source).toContain("import { PatchList } from '@/components/recipe/patch-list'")
    expect(source).toContain('className="patch riff-patch"')
    const shared = readFileSync(
      new URL('../components/recipe/patch-list.tsx', import.meta.url),
      'utf8',
    )
    expect(shared).toContain("import { CableMark } from '@/components/cable-mark'")
    expect(shared).toContain('<CableMark />')
  })

  it('carries the settings, in the guide’s own module boxes', async () => {
    const markup = await renderWithRig()
    expect(markup).toContain('class="module-box"')
    expect(markup).toContain('class="module-led"')
    expect(markup).toContain('class="param-name"')
  })

  it('renders articulation values as they are, whatever type they are', async () => {
    const { markup } = await voiceFor('elektron-digitakt-ii')
    expect(markup).not.toContain('NaN')
    expect(text(markup)).toContain('velocity 112')
    // §2.1/#32. The bridge between the figure's C4 convention and a box that puts middle C at C5.
    expect(text(markup)).toContain('Trigger note C5 MIDI 60')
  })

  /**
   * §4.3/§8.1/#528. **The fourth thing the riff page was rebuilding: the per-box block.**
   *
   * A guide answers *what does my box do to these steps* under a heading naming the box, in a
   * list whose slot word opens its definition and whose jog sits in §8.1's reserved column. This
   * page had `Articulation` over a list of its own, which named the concept rather than the box
   * and put the jog in a paragraph. All four claims are checked here because the shared component
   * is one import away from being replaced by a local copy again.
   */
  it('draws the per-box block as a guide does, jog and all (#528)', async () => {
    const { markup, voice } = await voiceFor('elektron-digitakt-ii')
    const entry = voice.articulation[0]
    if (entry === undefined) throw new Error('the sampler should articulate this grid')

    // Whose settings these are — the question a reader has after a grid that named no device.
    expect(markup).toContain('<h3 class="riff-sub">On this box — Digitakt II</h3>')

    // The guide's list, and no second treatment of it left anywhere on the page.
    expect(markup).toContain('<ul class="articulation">')
    expect(markup).not.toContain('riff-articulation')

    // #457. The slot word is a definition trigger here, as it is on a guide.
    expect(markup).toContain(
      `class="vocab-term" aria-haspopup="dialog" aria-expanded="false">${entry.slot}</button>`,
    )

    // §8.1. The jog, in the reserved column rather than a paragraph of its own.
    expect(entry.hint, 'this box must author a jog for the rest of this to check anything')
      .toBeDefined()
    const jog = /<p class="hint">([^<]*)<\/p>/.exec(markup)
    expect(jog, 'the reserved hint column is missing').not.toBeNull()
    expect(text(jog?.[1] ?? '')).toBe(hintText(voice.device, entry.hint as string))

    // And it is *visible*: `.hint` is hidden until an ancestor turns hints on, and a riff page
    // has no §8.1 toggle to turn them on with — so the block declares them on itself.
    expect(markup).toContain('<div data-hints="on">')
    expect(rule('.hint')).toContain('visibility: hidden')
    expect(rule("[data-hints='on'] .hint")).toContain('visibility: visible')
  })
})

// ---------------------------------------------------------------------------
// §3/#516 — a riff on a sound the box makes itself
// ---------------------------------------------------------------------------

/**
 * §3/#516. **A riff can land on the EP–40's supertone engine**, and the page has to say how to
 * reach it.
 *
 * Before the split those recipes declared `sourceAudio`, so this page printed *Source — one of the
 * ten supertone sounds …* — a `Source` line, whose whole job is sending a reader to find audio, on
 * a part that loads nothing. `acid-tracks-line` on an EP–40 alone is that case, and it is asserted
 * in both renderers because the two share no ink by design.
 */
describe('a riff on a built-in sound says how to reach it (§3/#516)', () => {
  const ep40 = DEVICES.filter((d) => d.id === 'te-ep-40')
  const acid = resolveRiff(
    RIFFS.find((r) => r.id === 'acid-tracks-line') as (typeof RIFFS)[number],
    ep40,
  )

  it('names the supertone recipe, which the split is what let it reach', () => {
    expect(acid.outcome).toBe('played')
    const voice = acid.outcome === 'played' ? acid.voice : undefined
    expect(voice?.recipe.id).toBe('ep40-acid-dirty')
    expect(voice?.soundSetup?.sound).toContain('bass tones')
    expect(voice?.soundSetup?.prep.text).toContain('supertone')
    expect(voice?.sourceAudio).toBeUndefined()
  })

  /**
   * Both halves, and the jog with them. The procedure prints here where a `sourceAudio.prep` does
   * not — this page has always shown a source's `need` alone — because *one of the ten supertone
   * sounds* is not something a reader can act on without being told that [SOUND] and [.] open the
   * ten. The jog is a visible paragraph rather than the guide's reserved column, which is this
   * page's rule for every jog on it (`resolved-body.tsx`).
   */
  it('prints both halves and no Source line, in both renderers', async () => {
    const voice = acid.outcome === 'played' ? acid.voice : undefined
    const md = renderRiff(acid)
    const { RiffVoice } = await import('../components/riff/riff-voice')
    const markup = renderToStaticMarkup(
      createElement(RiffVoice, {
        riff: RIFFS.find((r) => r.id === 'acid-tracks-line') as (typeof RIFFS)[number],
        voice: voice as RiffVoicing,
      }),
    )
    for (const doc of [md, text(markup)]) {
      expect(doc).toContain(`Sound — ${voice?.soundSetup?.sound as string}`)
      expect(doc).toContain(voice?.soundSetup?.prep.text as string)
      expect(doc).toContain(hintText(voice?.device, 'supertone'))
      expect(doc).not.toContain('Source —')
      expect(doc).not.toContain('Nothing is loaded')
    }
    // The citation is in the model and on neither page (invariant 4).
    expect(voice?.soundSetup?.prep.provenance.state).toBe('authored')
    for (const doc of [md, text(markup)]) expect(doc).not.toContain('8.1.1')
  })
})
