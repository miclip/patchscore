import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GUIDE_PHASES, moodState, resolve, sequencerGroups } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import {
  boxSections,
  currentPhase,
  openSection,
  phaseAnchor,
  sectionForAnchor,
  tabForKey,
} from '../components/guide/nav'
import type { GuideSection } from '../components/guide/nav'

/**
 * §8/#341. **The guide's navigation**, which the two layouts do not share.
 *
 * The complaint was one — "there's a lot of scrolling" — and the answer is two, because the
 * layouts are different shapes. Boxes are independent, so the sequencer layout gets tabs and what
 * they hide belongs to a machine you are not standing at. The seven phases are *sequential* and
 * §8 forbids reordering them, so the phase layout gets a jump-nav that keeps every section on the
 * page: tabs would imply the order does not matter, which is the one thing §8 says it does.
 *
 * Split the way the code is. The rules — which tab is open, which section holds an anchor, what a
 * key press moves to — are a plain module and are tested as arithmetic; the markup is tested
 * through `renderToStaticMarkup`, the way every other view test in this suite is, because this
 * suite runs in Node with no DOM on purpose. What that leaves unproven is stated at the bottom.
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

const section = (key: string, anchors: readonly string[], box?: boolean): GuideSection => ({
  key,
  title: key,
  anchorId: anchors[0]!,
  anchors,
  ...(box === true ? { box: true } : {}),
  body: null,
})

/** A guide with two boxes between the rig-wide sections, which is the ordinary shape. */
const guide = [
  section('Song', ['phase-1']),
  section('group-roland-tr-1000', ['section-group-roland-tr-1000', 'part-r-kick-sound'], true),
  section('group-synthstrom-deluge', ['section-group-synthstrom-deluge'], true),
  section('Finishing', ['phase-7']),
]

/** The tabs, which are the boxes and only the boxes. */
const three = boxSections(guide)

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
     * The bug this closes. Ids used to be `phase-${i + 1}` over the *section* list, so under the
     * sequencer layout `#phase-6` — which `SoundRef` links to — resolved to the sixth section,
     * which is a box. A pointer that lands somewhere plausible and wrong is worse than one that
     * lands nowhere.
     */
    for (const id of ['phase-4', 'phase-5', 'phase-6']) {
      expect(sequencer, `${id} still names a section the sequencer layout does not have`).not.toContain(
        `id="${id}"`,
      )
    }
    // The phase layout draws all seven and keeps them.
    for (const id of ['phase-4', 'phase-5', 'phase-6']) expect(phase).toContain(`id="${id}"`)
  })
})

describe('which tab is open, and what a key press moves to', () => {
  it('takes the boxes out of the guide and leaves everything else stacked', () => {
    // The rule #341 asks for, as arithmetic: Song and Finishing are on the page but are not tabs.
    expect(three.map((s) => s.key)).toEqual(['group-roland-tr-1000', 'group-synthstrom-deluge'])
  })

  it('opens the first box until the reader chooses one', () => {
    expect(openSection(three, undefined)).toBe('group-roland-tr-1000')
    expect(openSection(three, 'group-synthstrom-deluge')).toBe('group-synthstrom-deluge')
    expect(openSection([], undefined)).toBeUndefined()
  })

  it('falls back to the first when the chosen box is no longer in the rig', () => {
    // Ordinary rather than exceptional: which tab is open is view state (§8.2), so changing the
    // rig rebuilds the sections and the box you had open may simply not be in the new rig.
    expect(openSection(three, 'group-elektron-digitakt')).toBe('group-roland-tr-1000')
    // A section that is on the page but is not a tab is no more openable than one that is gone.
    expect(openSection(three, 'Finishing')).toBe('group-roland-tr-1000')
  })

  it('finds the box holding an anchor, including one inside a part', () => {
    expect(sectionForAnchor(three, 'part-r-kick-sound')).toBe('group-roland-tr-1000')
    expect(sectionForAnchor(three, 'section-group-synthstrom-deluge')).toBe(
      'group-synthstrom-deluge',
    )
    expect(sectionForAnchor(three, 'part-nobody-sound')).toBeUndefined()
    // `#phase-7` is on the page and needs no tab opened, so the strip does not claim it.
    expect(sectionForAnchor(three, 'phase-7')).toBeUndefined()
  })

  it('moves along the strip and wraps, and leaves every other key alone', () => {
    expect(tabForKey(three, 'group-roland-tr-1000', 'ArrowRight')).toBe('group-synthstrom-deluge')
    expect(tabForKey(three, 'group-roland-tr-1000', 'ArrowLeft')).toBe('group-synthstrom-deluge')
    expect(tabForKey(three, 'group-synthstrom-deluge', 'Home')).toBe('group-roland-tr-1000')
    expect(tabForKey(three, 'group-roland-tr-1000', 'End')).toBe('group-synthstrom-deluge')
    // Not the vertical arrows: this strip scrolls sideways and the page scrolls down, so a
    // tablist answering ArrowDown would swallow the key somebody reads the guide with.
    for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'a']) {
      expect(
        tabForKey(three, 'group-roland-tr-1000', key),
        `${key} should be left alone`,
      ).toBeUndefined()
    }
  })
})

describe('the sequencer layout puts the boxes in tabs, and only the boxes (#341)', () => {
  const groups = sequencerGroups(result)
  /** A tab is a box you stand at, so `undriven` is a section and not one of these. */
  const boxes = groups.filter((g) => g.kind === 'sequencer')

  it('draws one tab per box, in a real tablist', () => {
    expect(boxes.length).toBeGreaterThan(1)
    expect(sequencer).toContain('role="tablist"')
    expect(sequencer).toContain('aria-label="Boxes"')
    expect(occurrences(sequencer, 'role="tab"')).toBe(boxes.length)
    expect(occurrences(sequencer, 'role="tabpanel"')).toBe(boxes.length)
    for (const group of groups) {
      if (group.kind !== 'sequencer') continue
      expect(sequencer).toContain(`id="tab-section-group-${group.deviceId}"`)
      expect(sequencer).toContain(`aria-controls="panel-section-group-${group.deviceId}"`)
      expect(sequencer).toContain(`id="panel-section-group-${group.deviceId}"`)
      expect(sequencer).toContain(`aria-labelledby="tab-section-group-${group.deviceId}"`)
    }
  })

  it('leaves the rig-wide sections stacked, where a reader can see all of them', () => {
    /*
     * The half of #341 that a plain "add tabs" gets wrong. Song, Voice assignment and Rig
     * integration are read once, before anything is entered on anything, and they describe the
     * whole rig rather than a machine — so a reader hunting for the BPM behind a tab is the
     * scrolling complaint moved rather than answered. Finishing is the same at the other end.
     */
    for (const id of ['phase-1', 'phase-2', 'phase-3', 'phase-7']) {
      expect(sequencer, `${id} should be a section, not a tab`).not.toContain(`id="tab-${id}"`)
      expect(sequencer).not.toContain(`id="panel-${id}"`)
      // Still drawn, still labelled by its own heading rather than by a tab.
      expect(sequencer).toContain(`id="${id}"`)
      expect(sequencer).toContain(`aria-labelledby="${id}"`)
    }
  })

  it('numbers the tabs as the sections they are, counting through the strip', () => {
    // Song, Voice assignment and Rig integration are 1-3, so the first box is 4 and Finishing is
    // last. A strip that restarted at 1 would give two sections the same number on one page.
    expect(sequencer).toMatch(/<span class="tab-number mono">4<\/span>/)
    expect(sequencer).toMatch(
      new RegExp(`<span class="phase-number mono">${3 + groups.length + 1}</span>`),
    )
  })

  it('opens exactly one box, and says so where a screen reader can hear it', () => {
    expect(occurrences(sequencer, 'aria-selected="true"')).toBe(1)
    expect(occurrences(sequencer, 'aria-selected="false"')).toBe(boxes.length - 1)
    expect(occurrences(sequencer, 'data-active="true"')).toBe(1)
    expect(occurrences(sequencer, 'data-active="false"')).toBe(boxes.length - 1)
  })

  it('is one tab stop for the whole strip, not one per tab', () => {
    // Roving tabindex. Ten tab stops between the rig and the guide is ten presses somebody makes
    // every time they pass through.
    expect(occurrences(sequencer, 'tabindex="-1"')).toBe(boxes.length - 1)
  })

  it('draws no jump-nav — that is the other layout’s answer', () => {
    expect(sequencer).not.toContain('guide-jump')
  })

  it('still renders every closed box, so the whole guide prints', () => {
    /*
     * The rule #341 calls out: a printout is taken to a machine precisely because the reader does
     * not have the app in front of them, so every tab has to print. Hiding is CSS; unmounting
     * would put that beyond a stylesheet's reach and lose three boxes out of four with nothing on
     * the page to say so.
     */
    for (const group of groups) {
      if (group.kind !== 'sequencer') continue
      expect(sequencer, `${group.deviceName} is not in the markup`).toContain(group.deviceName)
    }
  })
})

describe('the undriven group is content, not a box (#341)', () => {
  const groups = sequencerGroups(result)
  const undriven = groups.find((g) => g.kind === 'undriven')

  it('is one of the groups, and is not one of the tabs', () => {
    // The distinction this rig exists to make: it *is* a `sequencerGroup`, so a rule written as
    // "the groups are the tabs" would put it in the strip.
    expect(undriven, 'this rig should have a box nothing can drive').toBeDefined()
    expect(groups.filter((g) => g.kind === 'sequencer')).toHaveLength(groups.length - 1)
  })

  it('carries none of the tab attributes', () => {
    for (const attr of [
      'id="tab-section-group-undriven"',
      'id="panel-section-group-undriven"',
      'aria-controls="panel-section-group-undriven"',
      'aria-labelledby="tab-section-group-undriven"',
    ]) {
      expect(sequencer, `${attr} makes it a tab`).not.toContain(attr)
    }
    // Labelled by its own heading, the way every stacked section is.
    expect(sequencer).toContain('aria-labelledby="section-group-undriven"')
    expect(sequencer).toContain('id="section-group-undriven"')
  })

  it('keeps every one of its parts on the page, none of them hidden', () => {
    /*
     * "Nothing here can play these" is the one section a reader must not have to find. Its parts
     * carry steps and a sound like any other, and all of that stays visible — it is stacked, so
     * no `data-active` governs it and nothing about the open tab can hide it.
     */
    const at = sequencer.indexOf('id="section-group-undriven"')
    expect(at).toBeGreaterThan(-1)
    // To the next top-level section, not the next `<section` — the parts inside this one are
    // `<section class="part">` and would cut the slice off at the first of them.
    const section = sequencer.slice(at, sequencer.indexOf('<section class="phase"', at))
    expect(section).not.toContain('data-active')
    for (const a of undriven!.assignments) {
      expect(section, `${a.role} is missing from the undriven section`).toContain(a.recipe.title)
      expect(section).toContain(`id="part-${a.requestId}-sound"`)
    }
  })

  it('stacks immediately after the strip, where the boxes end', () => {
    const lastTab = sequencer.lastIndexOf('role="tabpanel"')
    const here = sequencer.indexOf('id="section-group-undriven"')
    const finishing = sequencer.indexOf('id="phase-7"')
    expect(lastTab).toBeLessThan(here)
    expect(here).toBeLessThan(finishing)
  })
})

describe('the jump-nav says where you are, not just where you could go (#341)', () => {
  /** Seven headings 500px apart, as a page scrolled by `by` would report them. */
  const heads = (by: number) =>
    GUIDE_PHASES.map((phase, i) => ({ key: phase as string, top: i * 500 - by }))

  it('answers the first phase before anything has passed the bar', () => {
    // Not "none". A reader at the top of the guide is in Song, and a nav that marks nothing until
    // the first scroll opens blank and then jumps.
    expect(currentPhase(heads(0), 45)).toBe('Song')
    expect(currentPhase([], 45)).toBeUndefined()
  })

  it('answers the last heading to have passed under the bar', () => {
    // The line is the bar's own bottom edge, so the marked phase is the one whose content is
    // under the reader's eye — not the one nearest the top of the document.
    expect(currentPhase(heads(1200), 45)).toBe('Rig integration')
    expect(currentPhase(heads(3200), 45)).toBe('Finishing')
  })

  it('marks the last phase at the foot of the document, which no top can reach', () => {
    /*
     * Finishing is the shortest section in the guide and on a phone it is shorter than the
     * viewport, so its heading comes to rest below the line and never crosses it. Scrolled to the
     * very bottom, reading Finishing, the bar said Sound design — found on a real 390px render,
     * not reasoned about.
     */
    const bottom = heads(3200).map((h, i) => ({ ...h, top: i === 6 ? 252 : h.top }))
    expect(currentPhase(bottom, 45)).not.toBe('Finishing')
    expect(currentPhase(bottom, 45, true)).toBe('Finishing')
    // The flag decides nothing when there is nothing to decide about.
    expect(currentPhase([], 45, true)).toBeUndefined()
  })

  it('does not flicker for a heading resting on the line', () => {
    // `getBoundingClientRect` is fractional; a whole pixel of tolerance settles it.
    expect(currentPhase([{ key: 'Song', top: 0 }, { key: 'Hook', top: 45.4 }], 45)).toBe('Hook')
    expect(currentPhase([{ key: 'Song', top: 0 }, { key: 'Hook', top: 60 }], 45)).toBe('Song')
  })

  it('marks exactly one link, and marks Song on the first render', () => {
    /*
     * The server cannot measure a viewport, so the mark it renders has to be the one the client's
     * first render produces too or hydration mismatches (#12). `currentPhase`'s rule makes that
     * free: with nothing measured the answer is the first phase.
     */
    expect(occurrences(phase, 'aria-current="step"')).toBe(1)
    const at = phase.indexOf('aria-current="step"')
    const link = phase.slice(phase.lastIndexOf('<a ', at), phase.indexOf('</a>', at))
    expect(link).toContain('href="#phase-1"')
    expect(link).toContain('>Song<')
  })

  it('says it accessibly, and draws it without needing a hover or a colour', () => {
    // `step`, because these are the seven steps of one process in a fixed order (§8) — not seven
    // pages and not a boolean.
    expect(phase).not.toContain('aria-current="page"')
    expect(phase).not.toContain('aria-current="true"')

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

  it('marks nothing under the sequencer layout, which has tabs instead', () => {
    expect(sequencer).not.toContain('aria-current')
  })
})

describe('a strip nobody needs is not drawn (#341)', () => {
  it('leaves a one-box rig as one page: a tab strip of one hides nothing', () => {
    const one = resolve({
      devices: rig('roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    expect(sequencerGroups(one)).toHaveLength(1)
    const html = renderToStaticMarkup(createElement(Guide, { result: one, seed: 3 }))
    expect(html).not.toContain('role="tablist"')
    expect(html).not.toContain('data-active=')
    // Still the sequencer layout, still grouped by the box — just nothing to switch between.
    expect(html).toContain('group-phase')
  })

  it('draws no strip for an empty rig, where there is no box to stand at', () => {
    const empty = resolve({ devices: [], template: industrial, mood: moodState({}), seed: 3 })
    expect(sequencerGroups(empty)).toHaveLength(0)
    const html = renderToStaticMarkup(createElement(Guide, { result: empty, seed: 3 }))
    expect(html).not.toContain('role="tablist"')
    // Invariant 5: the notice that says why, and it is on the page rather than behind a tab.
    expect(html).toContain('section-nothing-assigned')
  })
})

describe('the phase layout is a jump-nav, and stays one long page (#341)', () => {
  it('lists all seven phases, in §8’s order, each linking to its own anchor', () => {
    expect(phase).toContain('class="guide-jump"')
    expect(phase).toContain('aria-label="Phases"')
    const positions = GUIDE_PHASES.map((_, i) => phase.indexOf(`href="#phase-${i + 1}"`))
    expect(positions.every((p) => p > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('hides nothing: no tabs, no closed panels', () => {
    expect(phase).not.toContain('role="tablist"')
    expect(phase).not.toContain('role="tabpanel"')
    expect(phase).not.toContain('data-active=')
  })
})

describe('a pointer out of one phase lands somewhere that exists (#341)', () => {
  it('aims at §8’s phase anchors under the phase layout', () => {
    // `SoundRef` and `HookRef`'s reason for existing: §8 puts Hook and Step programming before
    // Sound design, so a reader stopping at either would think the sound was missing.
    expect(phase).toContain('href="#phase-6"')
    expect(phase).toContain('>Sound design</a>')
  })

  it('aims at the part’s own headings under the sequencer layout, which are in its tab', () => {
    /*
     * Under this layout Sound design is not a section — it is an `h5` beside the steps, inside the
     * box's own tab — so the pointer is a local one and the tab it needs is already open. Both
     * halves are asserted: the link, and the heading it lands on.
     */
    const href = sequencer.match(/href="#(part-[a-z0-9-]+-sound)"/)
    expect(href, 'no part-level Sound design pointer was rendered').not.toBeNull()
    expect(sequencer).toContain(`id="${href![1]!}"`)
    expect(sequencer).not.toContain('href="#phase-6"')
  })

  it('lands on a hook heading the same way', () => {
    const href = sequencer.match(/href="#(part-[a-z0-9-]+-hook)"/)
    if (href !== null) expect(sequencer).toContain(`id="${href[1]!}"`)
    expect(sequencer).not.toContain('href="#phase-4"')
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
    for (const selector of ['.guide-tabs', '.guide-jump']) {
      expect(rule(selector), `${selector} must scroll itself`).toContain('overflow-x: auto')
      expect(rule(selector)).toContain('max-width: 100%')
    }
  })

  it('gives every target 44px, and puts touch-action on the control and nothing wider', () => {
    for (const selector of ['.guide-tab', '.guide-jump a']) {
      expect(rule(selector), `${selector} is under 44px`).toContain('min-height: 44px')
      expect(rule(selector)).toContain('touch-action: manipulation')
    }
    // The rule the knob settled: on a strip it would stop the page scrolling past the control,
    // which on a phone is the whole page.
    expect(rule('.guide-tabs')).not.toContain('touch-action')
    expect(rule('.guide-jump')).not.toContain('touch-action')
  })

  it('sticks the jump-nav, and leaves room for it when an anchor lands', () => {
    expect(rule('.guide-jump')).toContain('position: sticky')
    expect(css).toContain(".guide[data-layout='phase'] .phase > h3")
    expect(rule(".guide[data-layout='phase'] .phase h5[id]")).toContain('scroll-margin-top: 60px')
  })

  it('hides the navigation on paper and flattens every tab back onto the page', () => {
    const start = css.indexOf('@media print')
    const block = css.slice(start)
    expect(block).toContain('.guide-tabs')
    expect(block).toContain('.guide-jump')
    expect(block).toMatch(/\.phase\[data-active='false'\]\s*\{\s*display:\s*block\s*!important/)
  })
})
