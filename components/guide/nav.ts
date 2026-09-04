import { createContext } from 'react'
import type { ReactNode } from 'react'
import { GUIDE_PHASES } from '@/lib/core'
import type { GuidePhase } from '@/lib/core'

/**
 * §8/#341. **Where the guide's navigation agrees with itself.**
 *
 * The guide is one long scroll — a four-box rig runs 255 parameter lines — and §8 says it is
 * read standing at a rack. #341 gives the two layouts the two different answers their shapes
 * ask for: the sequencer layout gets tabs, because boxes are independent and everything you
 * skip belongs to a machine you are not touching; the phase layout gets a jump-nav, because the
 * seven phases are *sequential* and a tab strip would imply they are not.
 *
 * What lives here is the part both answers need and neither owns: the anchor ids, the rule for
 * which tab is open, the keyboard model for a tab strip, and the context a cross-section pointer
 * reads to find out where it is pointing. It is a plain module rather than a hook so the rules
 * can be tested without a DOM — this suite runs in Node on purpose.
 */

/**
 * The DOM id of a phase's heading — `phase-4` for Hook.
 *
 * Derived from `GUIDE_PHASES` and never written out, for the reason `instruction.tsx` already
 * gives about `#phase-6`: a hard-coded anchor breaks silently when the list changes. It is
 * derived from the *phase* rather than from the section's position on the page, which is the
 * part #341 had to fix — under the sequencer layout the sixth section is a box, so a positional
 * `phase-6` pointed at whichever box happened to be sixth.
 */
export function phaseAnchor(phase: GuidePhase): string {
  return `phase-${GUIDE_PHASES.indexOf(phase) + 1}`
}

/** One rendered section of the guide, in whichever layout is drawing it. */
export type GuideSection = {
  /** React key and tab identity. Stable across a re-render, unique within a layout. */
  key: string
  title: string
  /**
   * §8/#341. **A box you stand at, and therefore a tab.**
   *
   * The test is that one, not "is it a `sequencerGroup`". Boxes are independent — you are at one
   * of them and the other three are irrelevant until you move — which is the property a tab bar
   * encodes, and everything a closed tab hides belongs to a machine you are not touching.
   *
   * Three kinds of section fail that test and stay stacked:
   *
   *  - **Song, Voice assignment, Rig integration and Finishing** are rig-wide and read once,
   *    before anything is entered on anything. A reader hunting for the BPM behind a tab is the
   *    scrolling complaint moved rather than answered.
   *  - **The `undriven` group**, which *is* a `sequencerGroup` and is real content — its parts
   *    carry steps and sounds like any other — but is not a machine anyone stands at. It is the
   *    parts no box in this rig can drive, and putting "nothing here can play these" behind a tab
   *    is how it stops being read.
   *  - **The notices**, the no-group one and the orphan hooks, for that same reason.
   */
  box?: boolean
  /** The DOM id of this section's own heading — what a jump-nav or an anchor lands on. */
  anchorId: string
  /**
   * Every DOM id inside this section that something links to, its own included.
   *
   * A tab strip has to answer "which tab holds `#part-r-kick-sound`?" before it can open one,
   * and the section is the only thing that knows. Listed rather than discovered from the DOM
   * because a hidden tab's panel is `display: none` and a `getElementById` walk would still
   * find it without saying which tab it was under.
   */
  anchors: readonly string[]
  body: ReactNode
}

/** The sections that are tabs: the boxes, in the order the guide draws them. */
export function boxSections<T extends GuideSection>(sections: readonly T[]): T[] {
  return sections.filter((s) => s.box === true)
}

/**
 * The tab to draw as open: the reader's choice while it still exists, otherwise the first.
 *
 * Which tab is open is **view state, not an input** (§8.2), so it is not in the permalink and
 * nothing persists it. That makes the falling-back case ordinary rather than exceptional —
 * changing the rig rebuilds the sections and the box you had open may simply not be there.
 */
export function openSection(
  sections: readonly GuideSection[],
  chosen: string | undefined,
): string | undefined {
  if (sections.length === 0) return undefined
  if (chosen !== undefined && sections.some((s) => s.key === chosen)) return chosen
  return sections[0]?.key
}

/**
 * §8/#341. **Which phase the reader is in**, for the jump-nav to mark.
 *
 * The last heading to have passed under the sticky bar — `line` is the bar's own bottom edge, so
 * the answer is the phase whose content is actually under the reader's eye rather than the one
 * nearest the top of the document.
 *
 * Above the first heading nothing has passed, and the answer is the **first** phase rather than
 * none: a reader at the top of the guide is in Song, and a nav that marks nothing until the first
 * scroll would open blank and then jump. That is also what makes the server's render and the
 * client's first render the same bytes (#12) — no measurement is needed to know the answer there.
 *
 * **At the end of the document the answer is the last phase**, whatever the tops say. Finishing is
 * the shortest section in the guide and on a phone it is shorter than the viewport, so its heading
 * comes to rest well below the line and never crosses it — scrolled to the very bottom, reading
 * Finishing, the bar said Sound design. That is not a rounding error at the edge; it is the one
 * phase the rule above cannot reach.
 *
 * A pure function of measured tops, so the rule is testable without a viewport; the component
 * does the measuring.
 */
export function currentPhase(
  headings: readonly { key: string; top: number }[],
  line: number,
  atEnd = false,
): string | undefined {
  const first = headings[0]
  if (first === undefined) return undefined
  if (atEnd) return headings[headings.length - 1]?.key
  let key = first.key
  // A whole pixel of tolerance: `getBoundingClientRect` is fractional and a heading resting
  // exactly on the line would otherwise flicker between two phases as the page settles.
  for (const heading of headings) if (heading.top <= line + 1) key = heading.key
  return key
}

/** Which section holds `anchor` — a bare DOM id, no `#`. */
export function sectionForAnchor(
  sections: readonly GuideSection[],
  anchor: string,
): string | undefined {
  return sections.find((s) => s.anchors.includes(anchor))?.key
}

/**
 * The roving-tabindex move for a key press on the tab strip, or `undefined` for a key the strip
 * does not handle — which is most of them, and they must keep their default behaviour.
 *
 * Left and right only, plus Home and End. A horizontal tablist that also answered the vertical
 * arrows would swallow the page scroll on the one key a reader uses to get down a long guide.
 */
export function tabForKey(
  sections: readonly GuideSection[],
  current: string,
  key: string,
): string | undefined {
  const at = sections.findIndex((s) => s.key === current)
  if (at === -1 || sections.length === 0) return undefined
  const wrap = (i: number) => sections[(i + sections.length) % sections.length]?.key
  switch (key) {
    case 'ArrowRight':
      return wrap(at + 1)
    case 'ArrowLeft':
      return wrap(at - 1)
    case 'Home':
      return sections[0]?.key
    case 'End':
      return sections[sections.length - 1]?.key
    default:
      return undefined
  }
}

/** A place in the guide, and the section that has to be open before it can be seen. */
export type GuideNavTarget = { id: string; section: string }

/**
 * §8/#341. What a cross-section pointer — `SoundRef`, `HookRef`, `ReArticulationRef` — needs to
 * know about where it is standing.
 *
 * Those pointers exist because §8 orders Hook and Step programming *before* Sound design, so a
 * reader stopping at either has no indication the sound exists. Their doc comments say the link
 * earns its place most on a phone, where the target is a scroll away. Under tabs it is not a
 * scroll away, it is in a panel that is not rendered — so a bare `href="#phase-6"` would look
 * like a broken link rather than a pointer.
 *
 * The answer is that the *provider* resolves the target, not the pointer. Under the phase layout
 * that is `#phase-6` and the browser handles it; under the sequencer layout Sound design is not
 * a section at all — it is an `h5` beside the steps, in the same box's tab — so the target is
 * that heading and `go` opens whatever tab holds it first. The pointer itself knows neither.
 */
export type GuideNav = {
  /** Where "see Hook" should land, or `undefined` when there is no hook to land on. */
  hook: GuideNavTarget | undefined
  /** Where "settings in Sound design" should land, or `undefined` when nothing renders them. */
  sound: GuideNavTarget | undefined
  /**
   * Open the section holding a target, then land on it. Absent where nothing is hidden — the
   * phase layout renders every section, so the browser's own anchor handling is the whole job.
   */
  go: ((target: GuideNavTarget) => void) | undefined
}

/**
 * The phase layout's answer, and the one a pointer rendered outside any provider gets.
 *
 * That second case is not a fallback nobody hits: `PhaseSteps` and `PhaseHook` are rendered
 * directly by the fixtures, and §8's phase order is what they are asserting against.
 */
export const DEFAULT_GUIDE_NAV: GuideNav = {
  hook: { id: phaseAnchor('Hook'), section: 'Hook' },
  sound: { id: phaseAnchor('Sound design'), section: 'Sound design' },
  go: undefined,
}

export const GuideNavContext = createContext<GuideNav>(DEFAULT_GUIDE_NAV)
