import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import Page, { metadata } from '../app/drum-machines/page'
import { NAV_LINKS } from '../components/site-nav'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * #174. The drum-machine reference: what an 808 sounds like, for a reader who has heard the
 * records and never read a manual.
 *
 * The page is authored prose with no data behind it, so there is no resolver output to assert
 * against and the temptation is to test nothing but "it renders". What is actually at risk here
 * is what the page *claims*, and the two claims it must never make are the ones issue #174 was
 * opened around:
 *
 *   1. It must not say what is in the reader's library. Patchscore has not established that, and
 *      a page that says "you have an 808 kick" is wrong for every reader who does not.
 *   2. It must not badge our ears with somebody's manual. GEN list p.1 prints a name, a category
 *      and a folder for each generator; it describes no sound. So the citation is scoped to the
 *      names, and the characters are ours and say so.
 *
 * Both are asserted against the rendered text rather than the source, because what ships is the
 * text. The vocabulary tests are deliberately loose about wording and strict about the claim —
 * an author rephrasing a sentence should not fail these, and an author adding "your card holds"
 * should.
 */

const MARKUP = renderToStaticMarkup(createElement(Page))

/** The page as a reader meets it: tags gone, entities back, whitespace collapsed. */
const TEXT = MARKUP.replace(/<[^>]*>/g, ' ')
  .replace(/&rsquo;/g, '’')
  .replace(/&ldquo;/g, '“')
  .replace(/&rdquo;/g, '”')
  .replace(/&amp;/g, '&')
  .replace(/&#x27;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function rule(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`)
  expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
  return CSS.slice(start, CSS.indexOf('}', start))
}

/** The body of the first `@media (min-width: Npx)` block that mentions `selector`. */
function query(selector: string, width: number): string {
  const opener = `@media (min-width: ${width}px) {`
  let at = CSS.indexOf(opener)
  while (at > -1) {
    const end = CSS.indexOf('\n}', at)
    const body = CSS.slice(at, end)
    if (body.includes(`${selector} {`)) return body
    at = CSS.indexOf(opener, at + 1)
  }
  expect.fail(`no @media (min-width: ${width}px) block mentions ${selector}`)
}

/** The seven families the page covers, and the shape every one of them is written in. */
const FAMILIES = ['TR-808', 'TR-909', 'TR-707', 'TR-606', 'CR-78', 'LinnDrum', 'DX7']

describe('#174 the page a crawler and a reader both get', () => {
  it('is served at its own address, with its own canonical', () => {
    // A catalogue page's rule (#84/#44): authored content whose canonical is itself, unlike a
    // permalinked guide, which is a generated view and stays canonical to '/'.
    expect(metadata.alternates?.canonical).toBe('/drum-machines')
    expect(metadata.title).toBe('Drum machines — Patchscore')
    expect(String(metadata.description).length).toBeGreaterThan(60)
    // The description is what a search result shows, so it has to name the subject rather than
    // describe the site.
    expect(String(metadata.description)).toContain('808')
  })

  it('is in the nav, between the catalogue and preferences', () => {
    const hrefs = NAV_LINKS.map((l) => l.href)
    expect(hrefs).toContain('/drum-machines')
    expect(hrefs.indexOf('/drum-machines')).toBe(hrefs.indexOf('/directions') + 1)
    expect(hrefs.indexOf('/drum-machines')).toBe(hrefs.indexOf('/preferences') - 1)
  })

  it('renders a masthead and the shared footer, like every other authored page', () => {
    expect(MARKUP).toContain('<main class="shell catalogue-page reference-page">')
    expect(MARKUP).toContain('<header class="masthead">')
    expect(MARKUP).toContain('<h1>Drum machines</h1>')
    expect(MARKUP).toContain('<footer class="footer">')
    expect(MARKUP).toContain('href="/directions"')
  })

  it('draws no artwork at all, per §10', () => {
    // Panel artwork is reference and never asset, and this page has no panel to draw anyway.
    // If it ever grows a picture it will be ours, which is a decision to take deliberately.
    expect(MARKUP).not.toContain('<img')
    expect(MARKUP).not.toContain('<svg')
  })
})

describe('#174 what the page says about each family', () => {
  it('covers all seven, each with a sound, a use and a fallback', () => {
    for (const name of FAMILIES) {
      expect(TEXT, `${name} is not on the page`).toContain(name)
    }
    // Three terms per family, in the order a reader needs them: what it sounds like first,
    // because that is what they came for.
    expect((MARKUP.match(/<dt>Sounds like<\/dt>/g) ?? []).length).toBe(FAMILIES.length)
    expect((MARKUP.match(/<dt>Good for<\/dt>/g) ?? []).length).toBe(FAMILIES.length)
    expect((MARKUP.match(/<dt>If unsure<\/dt>/g) ?? []).length).toBe(FAMILIES.length)
    expect(TEXT.indexOf('Sounds like')).toBeLessThan(TEXT.indexOf('Good for'))
  })

  it('says plainly that the DX7 is an FM synthesizer and not a drum machine', () => {
    // The one entry that answers a different question than the reader asked. It earns its place
    // because a guide can ask for a sound that FM makes well, and a reader has to know what the
    // name means before they can act on it.
    const dx7 = TEXT.slice(TEXT.indexOf('DX7'))
    expect(dx7).toContain('Not a drum machine')
    expect(dx7).toMatch(/FM synthesizer/)
    expect(dx7).toMatch(/no kit and no patterns/)
  })

  it('offers FM as one way to a struck bell, and claims it only where a guide names FM', () => {
    // The overclaim this replaces read "when a guide asks for a struck bell or an inharmonic
    // metal hit, this is the method it means" — which is false. A `sourceAudio.need` line asks
    // for a *sound*; a recording of a real bell answers it too, and only a guide that says FM
    // is asking for this. So the entry has to hold a condition and an alternative, and must not
    // read the reader's intent for them.
    const dx7 = TEXT.slice(TEXT.indexOf('DX7'))
    expect(dx7).toMatch(/one way to make/)
    expect(dx7).toMatch(/another/)
    expect(dx7).toMatch(/only means this one where it says FM/)
    expect(dx7).not.toMatch(/this is the method it means/)
    // And the fallback line waits for the same condition rather than volunteering the box.
    expect(dx7).toMatch(/If your guide named FM/)
  })

  it('describes the LinnDrum by its cut, which is the thing people mean by it', () => {
    const linn = TEXT.slice(TEXT.indexOf('LinnDrum'), TEXT.indexOf('DX7'))
    expect(linn).toMatch(/cut (short|off)/)
    expect(linn).toMatch(/stops dead|Nothing rings on/)
  })

  it('distinguishes the two kicks a reader is most likely to confuse', () => {
    // 808 and 909 are the pair the whole page turns on. Whatever else changes, the difference
    // between a kick that rings on and a kick that clicks has to survive an edit.
    const eight = TEXT.slice(TEXT.indexOf('TR-808'), TEXT.indexOf('TR-909'))
    const nine = TEXT.slice(TEXT.indexOf('TR-909'), TEXT.indexOf('TR-707'))
    expect(eight).toMatch(/rings on|almost no click/)
    expect(nine).toMatch(/click at the front/)
  })
})

describe('#174 the claims the page must not make', () => {
  it('says what is in nobody’s library', () => {
    // The sentence that has to be there, in whatever words: the condition, and the admission.
    expect(TEXT).toMatch(/If your sampler came with a sample library/)
    expect(TEXT).toContain('Patchscore has not established what is in your library')
    expect(TEXT).toMatch(/We cannot tell you/)
  })

  it('never asserts the reader owns a sound, a file or a folder', () => {
    // Written as the affirmative claims themselves rather than as keywords, so the page's own
    // denial of them ("never tells you which sounds you own") does not trip its own test.
    const forbidden: [RegExp, string][] = [
      [/\byour (card|library|sampler) (has|holds|contains|includes|ships with)\b/i, 'asserts what is on the card'],
      [/\byou (own|have|already have) an? (808|909|707|606|CR-?78|LinnDrum|DX7)/i, 'asserts ownership'],
      [/\bwill (be|already be) (on|in) your\b/i, 'asserts what is on the card'],
      [/\.wav\b/i, 'names a filename'],
      [/\bSAMPLES\//, 'names a folder'],
      [/\bFACTORY\b/, 'names a factory library'],
      [/\bfactory library\b/i, 'claims a factory library'],
    ]
    for (const [pattern, why] of forbidden) {
      expect(pattern.test(TEXT), `${why}: ${pattern}`).toBe(false)
    }
  })

  it('cites GEN list p.1 for the names and says outright that it is not the source of the characters', () => {
    // The narrow fact, which is the only one that page supports: Roland ships generators under
    // these names. p.1 prints Name, Category and Folder, and describes no sound anywhere on it.
    expect(TEXT).toContain('TR-1000 Preset GEN/INST List (eng02) v1.20, GEN list p.1')
    expect(TEXT).toMatch(/name, a category and a folder/)
    expect(TEXT).toMatch(/describes no sound/)
    // And the two families that page does not carry are excluded by name, not left to inference.
    expect(TEXT).toMatch(/LinnDrum and the DX7 do not appear on it/)
  })

  it('says the characters are ours, in our voice, before a reader believes otherwise', () => {
    expect(TEXT).toMatch(/Every description here is ours/)
    expect(TEXT).toMatch(/taste rather than specification/)
    // Above the fold in reading order: the disclaimer sits in the opening panel, not in a note
    // under the citation at the bottom which a reader reaches after believing the page.
    expect(TEXT.indexOf('Every description here is ours')).toBeLessThan(TEXT.indexOf('TR-808'))
  })

  it('explains why dialling a sound can beat hunting for one', () => {
    // #174's own argument, and the reason this page exists rather than a glossary: the search has
    // no finish line and the synthesis does.
    expect(TEXT).toMatch(/no finish line/)
    expect(TEXT).toMatch(/finished when the numbers are dialled/)
    expect(TEXT).toMatch(/synthesise/)
  })
})

describe('#174 at 390px', () => {
  it('stacks the term above its sentence on a phone, and pairs them when there is room', () => {
    // `.capability-gaps`' reason (#21): an uppercase tracked term beside three lines of prose at
    // 390px takes a third of the line and breaks the sentence down the rest of it.
    expect(rule('.machine-facts')).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(query('.machine-facts', 640)).toContain('grid-template-columns: auto minmax(0, 1fr)')
  })

  it('lets every paragraph wrap instead of widening the page', () => {
    const paragraph = rule('.reference-page p')
    expect(paragraph).toContain('min-width: 0')
    expect(paragraph).toContain('overflow-wrap')
    // A measure in `ch`, so it is a reading width and not a layout width: below 66ch the cap
    // never binds and the paragraph is simply as wide as the screen.
    expect(paragraph).toMatch(/max-width: \d+ch/)
    expect(paragraph).not.toMatch(/(^|[^-])width: \d+px/)
    expect(paragraph).not.toContain('white-space: nowrap')
  })

  it('keeps the citation monospace and legible rather than shrinking it to fit', () => {
    // #21: parameter values stay legible at arm's length. Wrap or scroll; do not shrink type.
    expect(MARKUP).toContain('<p class="reference-cite mono">')
    const size = /font-size: (\d+)px/.exec(rule('.reference-cite'))
    expect(size, '.reference-cite must state a size rather than inherit one').not.toBeNull()
    expect(Number(size?.[1])).toBeGreaterThanOrEqual(12)
  })

  it('never hides an overflow instead of reporting it', () => {
    // The stylesheet's own rule at the top: `overflow-x: hidden` hides a broken layout. Nothing
    // this page added may reach for it.
    for (const selector of ['.reference-page p', '.reference-note', '.reference-cite', '.machine-facts']) {
      expect(rule(selector)).not.toContain('overflow-x')
    }
  })
})

/**
 * The one citation on this page names the TR-1000's GEN list, and the page holds that string as
 * authored prose rather than deriving it. That is the right shape — this is a page about sounds,
 * not a view onto a device — but a hand-copied citation is a citation that can go stale in
 * silence, which is the failure `verified` exists to prevent. So the string is not pinned to
 * itself here; it is pinned to the device that actually cites it. Bump that edition and this
 * fails, which is the whole point.
 */
const TR1000 = DEVICES.find((d) => d.id === 'roland-tr-1000')

/** Every option set on the TR-1000 whose citation is the GEN list, as source string -> values. */
function genList(): { source: string; values: Set<string> } {
  expect(TR1000, 'roland-tr-1000 is missing from the registry').toBeDefined()
  const values = new Set<string>()
  let source: string | undefined
  for (const recipe of TR1000?.recipes ?? []) {
    for (const param of recipe.params ?? []) {
      const options = (param as { options?: { values?: readonly string[]; verified?: unknown } })
        .options
      const verified = options?.verified as { source?: string } | undefined
      if (verified?.source === undefined || !verified.source.includes('GEN list')) continue
      source = verified.source
      for (const value of options?.values ?? []) values.add(value)
    }
  }
  expect(source, 'no TR-1000 option set cites the GEN list any more').toBeDefined()
  return { source: source ?? '', values }
}

describe('the citation is the device\'s, not a copy of it (#174)', () => {
  it('prints the exact source string the TR-1000 cites for its generator names', () => {
    const { source } = genList()
    expect(
      TEXT,
      'the page has drifted from the citation roland-tr-1000 actually carries',
    ).toContain(source)
  })

  it('quotes only generator names the TR-1000 really ships', () => {
    const { values } = genList()
    const quoted = [...MARKUP.matchAll(/<span class="mono">([^<]+)<\/span>/g)].map((m) => m[1])
    expect(quoted.length, 'the page should still quote some generator names').toBeGreaterThan(0)
    for (const name of quoted) {
      expect(values, `${name} is quoted as a TR-1000 generator and is not one`).toContain(name)
    }
  })
})
