import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GUIDE_PHASES, moodState, resolve, sequencerGroups } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { currentSection, phaseAnchor } from '../components/guide/nav'

/**
 * §8/#341. **The guide's navigation, which both layouts share.**
 *
 * The complaint was one — there is a lot of scrolling — and for a while the answer was two: a tab
 * strip for the sequencer layout, on the argument that boxes are independent, and a jump-nav for
 * the phases, which are sequential and which §8 forbids reordering. The strip lost. `nav.ts`
 * carries why at length; what this file has to hold shut is the *shape* of the reversal, because
 * the shape is what a later change would put back by accident:
 *
 *  - **Nothing is hidden, in either layout.** No tablist, no closed panel, no heading suppressed
 *    because something else was already saying it. That is one assertion per layout and it is the
 *    load-bearing one — every mechanism the strip needed existed to undo its own hiding.
 *  - **One nav, listing whatever the layout drew.** Seven phases under one, the boxes under the
 *    other, and the same rule marking the reader's place in both.
 *  - **A cross-section pointer is an ordinary anchor**, aimed at an id that layout renders.
 *
 * Split the way the code is. The marking rule is a plain module and is tested as arithmetic; the
 * markup is tested through `renderToStaticMarkup`, the way every other view test in this suite
 * is, because this suite runs in Node with no DOM on purpose. What that leaves unproven is stated
 * at the bottom.
 */

const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

/*
 * Two boxes and a Minitaur, which nothing here can drive — so this rig produces both kinds of
 * `sequencerGroup`, and the counts below distinguish "a group" from "a box" instead of passing
 * because the two happen to be equal.
 */
const result = resolve({
  devices: rig('synthstrom-deluge', 'roland-tr-1000', 'moog-minitaur'),
  template: industrial,
  mood: moodState({}),
  seed: 3,
})

/** The sequencer layout, which is `DEFAULT_GUIDE_LAYOUT` and so what a bare render gives. */
const sequencer = renderToStaticMarkup(createElement(Guide, { result, seed: 3 }))
const phase = renderToStaticMarkup(
  createElement(Guide, { result, seed: 3, layout: 'phase' as const }),
)

/** Occurrences of a literal, without a regex to escape. */
function occurrences(haystack: string, needle: string): number {
  let n = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    n += 1
    at = haystack.indexOf(needle, at + needle.length)
  }
  return n
}

/** The `<nav>` alone, for asking what it lists. */
function navOf(html: string): string {
  const at = html.indexOf('<nav class="guide-jump"')
  expect(at, 'no jump-nav was rendered').toBeGreaterThan(-1)
  return html.slice(at, html.indexOf('</nav>', at))
}

/** The guide below the nav, for asking what it drew — the nav names every section too. */
function bodyOf(html: string): string {
  return html.slice(html.indexOf('</nav>'))
}

describe('the anchors come from the phase, not from the position on the page (#341)', () => {
  it('derives every phase anchor from GUIDE_PHASES', () => {
    for (const [i, p] of GUIDE_PHASES.entries()) expect(phaseAnchor(p)).toBe(`phase-${i + 1}`)
    // The two `instruction.tsx` points at, named here so a reordering of §8's list fails loudly
    // in one place rather than in a rendered page nobody is looking at.
    expect(phaseAnchor('Hook')).toBe('phase-4')
    expect(phaseAnchor('Sound design')).toBe('phase-6')
  })

  it('gives the sequencer layout the same ids for the phases it still draws', () => {
    // Song, Voice assignment, Rig integration and Finishing are phases 1, 2, 3 and 7 whichever
    // layout is drawing them — even though Finishing is the *last* of a dozen sections here.
    for (const id of ['phase-1', 'phase-2', 'phase-3', 'phase-7']) {
      expect(sequencer, `${id} is missing from the sequencer layout`).toContain(`id="${id}"`)
    }
  })

  it('does not hand phases 4, 5 and 6 to whichever box happens to be there', () => {
    /*
     * The bug this closes, and losing the tabs does not close it: ids used to be `phase-${i + 1}`
     * over the *section* list, so under the sequencer layout `#phase-6` — which `SoundRef` links
     * to — resolved to the sixth section, which is a box. A pointer that lands somewhere plausible
     * and wrong is worse than one that lands nowhere, and the section lists still differ.
     */
    for (const id of ['phase-4', 'phase-5', 'phase-6']) {
      expect(
        sequencer,
        `${id} still names a section the sequencer layout does not have`,
      ).not.toContain(`id="${id}"`)
    }
    // The phase layout draws all seven and keeps them.
    for (const id of ['phase-4', 'phase-5', 'phase-6']) expect(phase).toContain(`id="${id}"`)
  })
})

describe('nothing in the guide is hidden, in either layout (#341)', () => {
  /**
   * The assertion the reversal exists for, and the one a later change is most likely to undo.
   *
   * The tab strip needed four separate mechanisms to undo its own hiding: a print rule to put
   * closed panels back, `display: none` rather than unmounting so that rule could reach them, an
   * effect to open the tab an incoming anchor landed in, and a `go` that opened a panel and waited
   * a frame before scrolling. None of them exist now, and none of them can be needed unless
   * something starts hiding a section again.
   */
  for (const [name, html] of [
    ['sequencer', sequencer],
    ['phase', phase],
  ] as const) {
    it(`draws no tab strip and no closed panel under the ${name} layout`, () => {
      for (const attr of [
        'role="tablist"',
        'role="tab"',
        'role="tabpanel"',
        'data-active=',
        'aria-selected=',
        'guide-tabs',
        'guide-tab',
      ]) {
        expect(html, `${attr} is tab machinery and should be gone`).not.toContain(attr)
      }
    })
  }

  it('gives every section a visible heading, numbered over the whole guide', () => {
    /*
     * The heading went `sr-only` because the selected tab read `4 TRACKER MINI` and this printed
     * it again a line below. With no tab saying it, this is the only label the section has — and
     * `aria-labelledby` points at it rather than at a tab.
     */
    const boxes = sequencerGroups(result).filter((g) => g.kind === 'sequencer')
    expect(boxes.length).toBeGreaterThan(1)
    for (const group of boxes) {
      expect(sequencer).toContain(`<h3 id="section-group-${group.deviceId}">`)
      expect(sequencer).toContain(`aria-labelledby="section-group-${group.deviceId}"`)
    }
    // Song, Voice assignment and Rig integration are 1-3, so the first box is 4 and the count runs
    // through to Finishing. A layout that restarted the numbering would put two sections on one
    // page carrying the same number.
    expect(sequencer).toContain(
      `<h3 id="section-group-${boxes[0]!.deviceId}"><span class="phase-number mono">4</span>`,
    )
    expect(sequencer).toContain(
      `<h3 id="phase-7"><span class="phase-number mono">${sequencerGroups(result).length + 4}</span>`,
    )
    for (const [i, p] of GUIDE_PHASES.entries()) {
      expect(phase).toContain(`<h3 id="phase-${i + 1}"><span class="phase-number mono">${i + 1}</span>${p}</h3>`)
    }
  })

  it('keeps every box in the markup, so the whole guide prints', () => {
    // It always did — that was the tab strip's own rule — but it was true because of a stylesheet
    // rather than because of the page. Now there is nothing for a stylesheet to undo.
    for (const group of sequencerGroups(result)) {
      if (group.kind !== 'sequencer') continue
      expect(sequencer, `${group.deviceName} is not in the markup`).toContain(group.deviceName)
    }
  })
})

describe('one jump-nav, listing whatever the layout drew (#341)', () => {
  it('lists §8’s seven phases in order under the phase layout', () => {
    const nav = navOf(phase)
    expect(phase).toContain('aria-label="Sections"')
    const positions = GUIDE_PHASES.map((_, i) => nav.indexOf(`href="#phase-${i + 1}"`))
    expect(positions.every((p) => p > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    for (const p of GUIDE_PHASES) expect(nav).toContain(`>${p}</span>`)
  })

  it('lists the boxes under the sequencer layout, in the order the guide draws them', () => {
    /*
     * The half the tab strip got right and the half it got wrong, now the same list. A box is a
     * section here, so it is in the nav; so are Song, Voice assignment, Rig integration and
     * Finishing, which the strip left stacked outside itself because they are rig-wide and read
     * once. One control names all of them, which is what stops a reader hunting for the BPM.
     */
    const nav = navOf(sequencer)
    const groups = sequencerGroups(result)
    const wanted = [
      'href="#phase-1"',
      'href="#phase-2"',
      'href="#phase-3"',
      ...groups.map((g) =>
        g.kind === 'sequencer'
          ? `href="#section-group-${g.deviceId}"`
          : 'href="#section-group-undriven"',
      ),
      'href="#phase-7"',
    ]
    const positions = wanted.map((href) => nav.indexOf(href))
    expect(positions.every((p) => p > -1), `missing: ${wanted.filter((_, i) => positions[i] === -1)}`).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    // Every section the guide drew is in the nav and nothing else is: as many links as headings.
    expect(occurrences(nav, '<li>')).toBe(occurrences(bodyOf(sequencer), '<h3 id='))
  })

  it('names the undriven group in the nav rather than leaving it to be scrolled onto', () => {
    /*
     * "Nothing here can play these" is the one section a reader must not have to find. Under the
     * strip it was deliberately not a tab — it is not a machine anybody stands at — which left it
     * as the one section with no entry in any control. It has one now, and its parts are on the
     * page as they always were.
     */
    const undriven = sequencerGroups(result).find((g) => g.kind === 'undriven')
    expect(undriven, 'this rig should have a box nothing can drive').toBeDefined()
    expect(navOf(sequencer)).toContain('href="#section-group-undriven"')
    expect(sequencer).toContain('id="section-group-undriven"')
    const at = sequencer.indexOf('id="section-group-undriven"')
    const body = sequencer.slice(at, sequencer.indexOf('<section class="phase"', at))
    for (const a of undriven!.assignments) {
      expect(body, `${a.role} is missing from the undriven section`).toContain(a.recipe.title)
      expect(body).toContain(`id="part-${a.requestId}-sound"`)
    }
  })

  it('draws the nav for a one-box rig and for an empty one', () => {
    /*
     * The strip had a floor — below two boxes there is nothing to switch between — and so a
     * one-box guide had no way through at all. This has none: a one-box rig is still Song, Voice
     * assignment, Rig integration, the box and Finishing, which is five sections and a scroll.
     */
    const one = resolve({
      devices: rig('roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(sequencerGroups(one)).toHaveLength(1)
    const oneHtml = renderToStaticMarkup(createElement(Guide, { result: one, seed: 3 }))
    expect(navOf(oneHtml)).toContain('href="#section-group-roland-tr-1000"')
    expect(navOf(oneHtml)).toContain('href="#phase-1"')
    expect(navOf(oneHtml)).toContain('href="#phase-7"')
    // As many links as headings, whatever this rig turned out to need — a lone TR-1000 also draws
    // the hooks nothing in it can play, and that section is a link like any other.
    expect(occurrences(navOf(oneHtml), '<li>')).toBe(occurrences(bodyOf(oneHtml), '<h3 id='))

    const empty = resolve({ devices: [], template: industrial, mood: moodState({}), seed: 3 })
    expect(sequencerGroups(empty)).toHaveLength(0)
    const emptyHtml = renderToStaticMarkup(createElement(Guide, { result: empty, seed: 3 }))
    // Invariant 5: the notice that says why, and the nav names it like any other section.
    expect(navOf(emptyHtml)).toContain('href="#section-nothing-assigned"')
    expect(emptyHtml).toContain('id="section-nothing-assigned"')
  })
})

describe('the jump-nav says where you are, not just where you could go (#341)', () => {
  /** Seven headings 500px apart, as a page scrolled by `by` would report them. */
  const heads = (by: number) =>
    GUIDE_PHASES.map((p, i) => ({ key: p as string, top: i * 500 - by }))

  it('answers the first section before anything has passed the bar', () => {
    // Not "none". A reader at the top of the guide is in Song, and a nav that marks nothing until
    // the first scroll opens blank and then jumps.
    expect(currentSection(heads(0), 45)).toBe('Song')
    expect(currentSection([], 45)).toBeUndefined()
  })

  it('answers the last heading to have passed under the bar', () => {
    // The line is the bar's own bottom edge, so the marked section is the one whose content is
    // under the reader's eye — not the one nearest the top of the document.
    expect(currentSection(heads(1200), 45)).toBe('Rig integration')
    expect(currentSection(heads(3200), 45)).toBe('Finishing')
  })

  it('marks the last section at the foot of the document, which no top can reach', () => {
    /*
     * Finishing is the shortest section in the guide and on a phone it is shorter than the
     * viewport, so its heading comes to rest below the line and never crosses it. Scrolled to the
     * very bottom, reading Finishing, the bar said Sound design — found on a real 390px render,
     * not reasoned about.
     */
    const bottom = heads(3200).map((h, i) => ({ ...h, top: i === 6 ? 252 : h.top }))
    expect(currentSection(bottom, 45)).not.toBe('Finishing')
    expect(currentSection(bottom, 45, true)).toBe('Finishing')
    // The flag decides nothing when there is nothing to decide about.
    expect(currentSection([], 45, true)).toBeUndefined()
  })

  it('does not flicker for a heading resting on the line', () => {
    // `getBoundingClientRect` is fractional; a whole pixel of tolerance settles it.
    expect(currentSection([{ key: 'Song', top: 0 }, { key: 'Hook', top: 45.4 }], 45)).toBe('Hook')
    expect(currentSection([{ key: 'Song', top: 0 }, { key: 'Hook', top: 60 }], 45)).toBe('Song')
  })

  it('is keyed rather than phased, so the boxes are marked the same way', () => {
    // The rule never named a phase, which is what let it serve the sequencer layout unchanged.
    const boxes = [
      { key: 'group-roland-tr-1000', top: -100 },
      { key: 'group-synthstrom-deluge', top: 400 },
    ]
    expect(currentSection(boxes, 45)).toBe('group-roland-tr-1000')
    expect(currentSection(boxes, 45, true)).toBe('group-synthstrom-deluge')
  })

  it('marks exactly one link in each layout, and marks the first on the first render', () => {
    /*
     * The server cannot measure a viewport, so the mark it renders has to be the one the client's
     * first render produces too or hydration mismatches (#12). `currentSection`'s rule makes that
     * free: with nothing measured the answer is the first section.
     */
    for (const [name, html] of [
      ['sequencer', sequencer],
      ['phase', phase],
    ] as const) {
      expect(occurrences(html, 'aria-current="step"'), `${name} marks the wrong number`).toBe(1)
      const at = html.indexOf('aria-current="step"')
      const link = html.slice(html.lastIndexOf('<a ', at), html.indexOf('</a>', at))
      expect(link).toContain('href="#phase-1"')
      expect(link).toContain('>Song<')
    }
  })

  it('says it accessibly, and draws it without needing a hover or a colour', () => {
    // `step`, because these are the steps of one process in a fixed order (§8) — not seven pages
    // and not a boolean. True of the phases §8 orders and of a rig worked through a box at a time.
    for (const html of [sequencer, phase]) {
      expect(html).not.toContain('aria-current="page"')
      expect(html).not.toContain('aria-current="true"')
    }

    const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
    const at = css.indexOf(".guide-jump a[aria-current='step'] {")
    expect(at, 'the current link has no style of its own').toBeGreaterThan(-1)
    const rule = css.slice(at, css.indexOf('}', at))
    // A shape as well as a hue: the reader on a phone has no hover, and some of them cannot tell
    // the accent from grey.
    expect(rule).toContain('box-shadow')
    expect(rule).toContain('color:')
    // Drawn from the accessible fact rather than beside it, so the two cannot drift apart.
    expect(css).not.toContain('.guide-jump a:hover[aria-current')
  })
})

describe('a pointer out of one phase lands somewhere that exists (#341)', () => {
  it('aims at §8’s phase anchors under the phase layout', () => {
    // `SoundRef` and `HookRef`'s reason for existing: §8 puts Hook and Step programming before
    // Sound design, so a reader stopping at either would think the sound was missing.
    expect(bodyOf(phase)).toContain('href="#phase-6"')
    expect(phase).toContain('>Sound design</a>')
  })

  it('aims at the part’s own headings under the sequencer layout, which its sections draw', () => {
    /*
     * Under this layout Sound design is not a section — it is an `h5` beside the steps, inside the
     * box's own section — so the pointer is a local one. Both halves are asserted: the link, and
     * the heading it lands on.
     */
    const href = sequencer.match(/href="#(part-[a-z0-9-]+-sound)"/)
    expect(href, 'no part-level Sound design pointer was rendered').not.toBeNull()
    expect(sequencer).toContain(`id="${href![1]!}"`)
    expect(bodyOf(sequencer)).not.toContain('href="#phase-6"')
  })

  it('lands on a hook heading the same way', () => {
    const href = sequencer.match(/href="#(part-[a-z0-9-]+-hook)"/)
    if (href !== null) expect(sequencer).toContain(`id="${href[1]!}"`)
    expect(bodyOf(sequencer)).not.toContain('href="#phase-4"')
  })

  it('is a plain anchor, with nothing to open first', () => {
    /*
     * The simplification the reversal buys. While a target could be inside a closed tab the link
     * carried an `onClick` that opened the panel and waited a frame before scrolling, because
     * `scrollIntoView` on a `display: none` element does nothing and reads as a dead link. Every
     * section is on the page, so the browser's own anchor handling is the whole job — which is
     * also what keeps copy-link and middle-click working without anything being written for them.
     *
     * **Read from the source, because the markup cannot answer it.** `renderToStaticMarkup` never
     * emits an event prop, so an assertion that the rendered `<a>` carries no `onclick` passes
     * whether or not the handler is there — it would have passed against the tab build too, which
     * is the whole reason it is not the check. `instruction.tsx` is the module that owns every
     * cross-section pointer, and none of them may reach for the DOM.
     */
    const source = readFileSync(join(process.cwd(), 'components', 'guide', 'instruction.tsx'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    for (const reach of ['onClick', 'scrollIntoView', 'preventDefault', 'requestAnimationFrame']) {
      expect(code, `a pointer reaching for ${reach} is not a plain anchor`).not.toContain(reach)
    }
    // What it may do, and all it may do: read the id it was handed and link to it.
    expect(code).toContain('useContext(GuideNavContext)')
    expect(code).toContain('<a href={`#${id}`}>{children}</a>')
  })
})

/**
 * #21 and the print rule, checked in the stylesheet for the same reason `export.test.ts` checks
 * the print block there: these are promises about a rendered page that no markup assertion can
 * reach, and a restyle that drops one fails silently on a phone nobody is testing on.
 */
describe('the navigation obeys #21 and the print stylesheet', () => {
  const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')
  const rule = (selector: string): string => {
    const at = css.indexOf(`${selector} {`)
    expect(at, `${selector} has no rule`).toBeGreaterThan(-1)
    return css.slice(at, css.indexOf('}', at))
  }

  it('scrolls inside its own container, never the page body', () => {
    expect(rule('.guide-jump')).toContain('overflow-x: auto')
    expect(rule('.guide-jump')).toContain('max-width: 100%')
  })

  it('gives every target 44px, and puts touch-action on the control and nothing wider', () => {
    expect(rule('.guide-jump a'), 'the jump links are under 44px').toContain('min-height: 44px')
    expect(rule('.guide-jump a')).toContain('touch-action: manipulation')
    // The rule the knob settled: on a strip it would stop the page scrolling past the control,
    // which on a phone is the whole page.
    expect(rule('.guide-jump')).not.toContain('touch-action')
  })

  it('sticks the nav, and leaves room for it in both layouts when an anchor lands', () => {
    /*
     * The offset was scoped to `[data-layout='phase']` while the sequencer layout had a tab strip,
     * which did not stick. Both layouts have the bar now, so a sequencer anchor landing under 16px
     * of margin would come to rest behind it — the failure #341 already found once, from the other
     * side: press "5 Step programming", land on it, and the bar marks 4.
     */
    expect(rule('.guide-jump')).toContain('position: sticky')
    expect(css).not.toContain(".guide[data-layout='phase'] .phase")
    expect(rule('.guide .phase h5[id]')).toContain('scroll-margin-top: 60px')
    // The three the nav can land on: a section heading, a hoisted `h4` and the part-level `h5`
    // that `SoundRef` and `HookRef` aim at.
    const at = css.indexOf('scroll-margin-top: 60px')
    const selectors = css.slice(css.lastIndexOf('*/', at) + 2, at)
    for (const selector of ['.guide .phase > h3', '.guide .phase > h4[id]', '.guide .phase h5[id]']) {
      expect(selectors, `${selector} does not clear the sticky nav`).toContain(selector)
    }
  })

  it('hides the nav on paper and leaves every section on the page', () => {
    const block = css.slice(css.indexOf('@media print'))
    expect(block).toContain('.guide-jump')
    // Nothing to flatten back: the strip's `display: block !important` existed only to undo a
    // `display: none` that no longer exists. A rule matching it here would mean tabs are back.
    expect(block).not.toContain("data-active")
    expect(css).not.toContain("data-active")
  })
})

/**
 * **What this file does not prove**, and where the answer had to come from instead.
 *
 * Everything above is markup and arithmetic, because this suite runs in Node with no DOM. The
 * measuring — reading `scrollMarginTop` off the heading, the bar's own bottom edge, the
 * end-of-document test, and bringing the marked link into the nav's own `scrollLeft` — needs a
 * viewport and a scroll position, and #341 found three of its four real bugs on a 390px render
 * rather than by reasoning. A change to those effects should be looked at, not only run.
 */
