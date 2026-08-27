import { STEPS_PER_BAR, type Pattern } from './template'

/**
 * §4.3/#155. **What the guide can work out about a part's rhythm, so a reader does not have to.**
 *
 * #143 gave the Tracker Mini's `tm-texture-soft` a note saying that re-strikes closer together
 * than its 1.8 Sec fade-in smear into the note before. The sentence is true and it is not usable:
 * it tells a reader a conflict exists and leaves them to work out whether they have one, in their
 * head, standing at the machine — when the guide is already holding both numbers it needs. The
 * tempo is on the page and the strike map is on the page.
 *
 * So the arithmetic happens here, once, and phase 5 prints the answer.
 *
 * **This compares nothing and constrains nothing.** It is a property of the tempo and the step
 * map, and it names no device and no parameter — which is the whole reason it can live in the
 * core rather than in a device folder. #143 settled the direction of the fix: a device envelope
 * must never cap a direction's strike rate, because that puts the box in charge of the genre and
 * is invariant 3 backwards. The part keeps its rhythm; the guide states what that rhythm costs in
 * seconds, and the reader holding both halves decides what to move.
 *
 * **Why the wrap is counted.** A pattern loops — §8's chain phase repeats it across a section —
 * so the distance from the last strike back round to the first is a real gap between two real
 * strikes, and on a map whose only hits are step 1 and step 64 it is the *only* tight one. Left
 * out, the guide would print a reassuring number for the worst case it exists to warn about.
 */

/**
 * Steps in one beat. §4.3 fixes the grid at a sixteenth per step over 1, 2 or 4 bars, and the
 * project has no time signature: 4/4 is the grid, not a default that something else may override.
 */
export const STEPS_PER_BEAT = STEPS_PER_BAR / 4

/** How long one step lasts, in seconds. */
export function secondsPerStep(bpm: number): number {
  return 60 / bpm / STEPS_PER_BEAT
}

/**
 * The closest two strikes come together in one loop of `pattern`, in steps.
 *
 * `undefined` when the map has fewer than two distinct strike steps: one strike is never a
 * re-strike, and an empty map is not a rhythm. Distinct steps, because two slots hitting the
 * same step is one strike of one voice, not a gap of zero.
 */
export function tightestGapSteps(pattern: Pattern): number | undefined {
  const steps = [...new Set(pattern.hits.map((h) => h.step))].sort((a, b) => a - b)
  if (steps.length < 2) return undefined
  let tightest = Number.POSITIVE_INFINITY
  for (let i = 1; i < steps.length; i++) {
    tightest = Math.min(tightest, (steps[i] as number) - (steps[i - 1] as number))
  }
  // Round the loop: last strike to the first strike of the next repeat.
  const wrap = pattern.length - (steps[steps.length - 1] as number) + (steps[0] as number)
  return Math.min(tightest, wrap)
}

/** The tightest re-strike as both the step count and the seconds it comes to at `bpm`. */
export type ReStrike = { steps: number; seconds: number }

/**
 * The tightest re-strike in a loop of `pattern` at `bpm`, or `undefined` when there is no
 * re-strike to measure.
 *
 * `seconds` is rounded to hundredths **here rather than at the two render sites**, so the
 * Markdown guide and the React guide cannot print two different numbers for one fact, and so
 * invariant 6's byte-identity does not rest on `String()` being handed a full-width float.
 */
export function tightestReStrike(pattern: Pattern, bpm: number): ReStrike | undefined {
  const steps = tightestGapSteps(pattern)
  if (steps === undefined) return undefined
  return { steps, seconds: roundHundredths(steps * secondsPerStep(bpm)) }
}

/**
 * Two decimal places, without `toFixed` — which returns a string and would push formatting into
 * arithmetic. IEEE-754 doubles do this identically on every platform (§7.2/invariant 6); the
 * thing that would not is a locale-aware formatter, and there is none here.
 */
export function roundHundredths(seconds: number): number {
  return Math.round(seconds * 100) / 100
}

/**
 * §4.3/#155. **Whether this part's map is re-strikes of a held note, rather than a rhythm of its
 * own.** Both conditions, and both are load-bearing:
 *
 *  - `reArticulatesHook` — the direction's claim that the variant places strikes *inside* the
 *    hook's held notes rather than competing with them (§4.3, the request's own field).
 *  - `hookAuthority` — that a hook actually **resolved** for this part. An unresolved hook has no
 *    notes (§4.1's `unparsed-key`), so nothing is being held and nothing is being struck again:
 *    the grid is rendered, correctly, as the part's own ordinary rhythm. `reArticulatesHook` is
 *    carried from the request and stays `true` there, which is why the pair has to be tested and
 *    not just the flag — `ResolvedAssignment` says as much where the field is declared.
 *
 * Structural rather than typed to `ResolvedAssignment`, so this module keeps its only import as
 * the pattern grid it does arithmetic on. Both renderers call it, so neither can drift into its
 * own reading of a two-part condition.
 */
export function reStrikesHeldNote(assignment: {
  hookAuthority: string | undefined
  reArticulatesHook: boolean
}): boolean {
  return assignment.hookAuthority !== undefined && assignment.reArticulatesHook
}
