import { createContext } from 'react'
import { GUIDE_PHASES } from '@/lib/core'
import type { GuidePhase } from '@/lib/core'
import type { ReactNode } from 'react'

/**
 * §8/#341. **Where the guide's navigation agrees with itself.**
 *
 * The guide is one long scroll — a four-box rig runs 255 parameter lines — and §8 says it is read
 * standing at a rack, so it needs a way through that is not the scrollbar. There is **one** of
 * them, the jump-nav, and both layouts get it.
 *
 * ### Why the sequencer layout is not tabs
 *
 * #341 shipped a tab strip for the sequencer layout first, on the argument that boxes are
 * independent: you are standing at one of them and the other three are irrelevant until you move,
 * which is the property a tab bar encodes. The argument is not wrong about boxes. It was wrong
 * about this guide, and the code is where that showed:
 *
 *  - **Hiding content took four separate repairs, and every one of them was a rule this project
 *    already had.** A closed panel had to be `display: none` rather than unmounted so the print
 *    stylesheet could put it back — a guide missing three boxes out of four looks complete on
 *    paper. An anchor arriving from outside needed an effect to open the tab holding it before the
 *    browser could land. A cross-phase pointer needed `go` to open a panel and wait a frame,
 *    because `scrollIntoView` on an element with no box does nothing and reads as a dead link.
 *    Four mechanisms existed to undo one control's hiding, which is the price of hiding rather
 *    than a set of unrelated bugs.
 *  - **The tab said what the heading said.** The selected tab read `4 TRACKER MINI` and the
 *    section heading printed it again a line below, so the heading was made `sr-only`. A control
 *    whose fix is to hide the thing it duplicates is naming a section that was already named.
 *  - **One page, two answers.** The layout control invites switching mid-guide, and a reader who
 *    switched got a different way of getting about: a strip that hides, then a bar that does not.
 *    Learning the page twice is a cost the two shapes never paid for.
 *
 * The jump-nav is not layout-shaped, which is what makes one of it enough. It lists the sections
 * that are drawn and marks the one being read, and under the sequencer layout those sections are
 * the boxes. Every section stays on the page underneath it, so the print rule, the hash and the
 * pointers all go back to being the browser's own business.
 *
 * What lives here is the part the nav and the pointers share: the anchor ids, the rule for which
 * section is being read, and the context a cross-section pointer asks where it is aiming. It is a
 * plain module rather than a hook so the rules can be tested without a DOM — this suite runs in
 * Node on purpose.
 */

/**
 * The DOM id of a phase's heading — `phase-4` for Hook.
 *
 * Derived from `GUIDE_PHASES` and never written out, for the reason `instruction.tsx` already
 * gives about `#phase-6`: a hard-coded anchor breaks silently when the list changes. It is
 * derived from the *phase* rather than from the section's position on the page, which is the part
 * #341 had to fix — under the sequencer layout the sixth section is a box, so a positional
 * `phase-6` pointed at whichever box happened to be sixth. Losing the tabs does not bring that
 * back: the section list still differs between the two layouts.
 */
export function phaseAnchor(phase: GuidePhase): string {
  return `phase-${GUIDE_PHASES.indexOf(phase) + 1}`
}

/** One rendered section of the guide, in whichever layout is drawing it. */
export type GuideSection = {
  /** React key and nav identity. Stable across a re-render, unique within a layout. */
  key: string
  title: string
  /** The DOM id of this section's own heading — what the jump-nav and any anchor lands on. */
  anchorId: string
  body: ReactNode
}

/**
 * §8/#341. **Which section the reader is in**, for the jump-nav to mark.
 *
 * The last heading to have passed under the sticky bar — `line` is the bar's own bottom edge, so
 * the answer is the section whose content is actually under the reader's eye rather than the one
 * nearest the top of the document.
 *
 * Above the first heading nothing has passed, and the answer is the **first** section rather than
 * none: a reader at the top of the guide is in Song, and a nav that marks nothing until the first
 * scroll would open blank and then jump. That is also what makes the server's render and the
 * client's first render the same bytes (#12) — no measurement is needed to know the answer there.
 *
 * **At the end of the document the answer is the last section**, whatever the tops say. Finishing
 * is the shortest section in the guide and on a phone it is shorter than the viewport, so its
 * heading comes to rest well below the line and never crosses it — scrolled to the very bottom,
 * reading Finishing, the bar said Sound design. That is not a rounding error at the edge; it is
 * the one section the rule above cannot reach.
 *
 * Keyed rather than phased, because the sections are the phases under one layout and the boxes
 * under the other, and the rule is the same for both.
 *
 * A pure function of measured tops, so the rule is testable without a viewport; the component
 * does the measuring.
 */
export function currentSection(
  headings: readonly { key: string; top: number }[],
  line: number,
  atEnd = false,
): string | undefined {
  const first = headings[0]
  if (first === undefined) return undefined
  if (atEnd) return headings[headings.length - 1]?.key
  let key = first.key
  // A whole pixel of tolerance: `getBoundingClientRect` is fractional and a heading resting
  // exactly on the line would otherwise flicker between two sections as the page settles.
  for (const heading of headings) if (heading.top <= line + 1) key = heading.key
  return key
}

/**
 * §8/#341. What a cross-section pointer — `SoundRef`, `HookRef`, `ReArticulationRef` — needs to
 * know about where it is standing: the id it is aiming at, and nothing else.
 *
 * Those pointers exist because §8 orders Hook and Step programming *before* Sound design, so a
 * reader stopping at either has no indication the sound exists. Their doc comments say the link
 * earns its place most on a phone, where the target is a scroll away.
 *
 * A scroll away is all it is now, so these are ordinary anchors and the browser does the work.
 * What the *provider* still settles is which id exists: under the phase layout Sound design is a
 * section and the answer is `#phase-6`; under the sequencer layout it is not a section at all —
 * it is an `h5` beside the steps in the same box — so the answer is that heading. `#phase-6`
 * under the sequencer layout names nothing, which is the bug #341 opened by fixing. The pointer
 * itself knows neither, and where nothing renders the target there is no link (invariant 5).
 */
export type GuideNav = {
  /** The id "see Hook" should land on, or `undefined` when there is no hook to land on. */
  hook: string | undefined
  /** The id "settings in Sound design" lands on, or `undefined` when nothing renders them. */
  sound: string | undefined
}

/**
 * The phase layout's answer, and the one a pointer rendered outside any provider gets.
 *
 * That second case is not a fallback nobody hits: `PhaseSteps` and `PhaseHook` are rendered
 * directly by the fixtures, and §8's phase order is what they are asserting against.
 */
export const DEFAULT_GUIDE_NAV: GuideNav = {
  hook: phaseAnchor('Hook'),
  sound: phaseAnchor('Sound design'),
}

export const GuideNavContext = createContext<GuideNav>(DEFAULT_GUIDE_NAV)
