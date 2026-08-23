import type { Pattern, PatternHit } from './template'
import type { PatternSlot, Role } from './vocabulary'

/**
 * Shared authoring helpers, and the one place the step/slot convention everything that writes a
 * `Pattern` writes against is written down. Templates author against it (§4.3) and so do
 * inspirations (§5), which is why it sits in `core` beside the vocabulary it gives meaning to
 * rather than inside either content layer.
 *
 * **Nothing here names a device** (invariant 3), and nothing here names a genre either: this
 * file is grid arithmetic and a convention, so it stays true however many templates arrive.
 *
 * ---------------------------------------------------------------------------
 * The grid
 * ---------------------------------------------------------------------------
 *
 * A 16-step variant is one bar of 4/4 in 16ths. Beats fall on steps 1, 5, 9, 13; 8th-note
 * offbeats on 3, 7, 11, 15; everything even is a 16th subdivision. A 32-step variant is two
 * bars of the same grid, a 64-step variant four. Hook steps are read on the same grid, so a
 * two-bar hook runs 1..32.
 *
 * ---------------------------------------------------------------------------
 * The slots
 * ---------------------------------------------------------------------------
 *
 * `PatternSlot` is shared vocabulary but not a self-enforcing one: a device that articulates
 * `offbeat` gets whatever the *template layer* decided an offbeat is. So the convention is
 * fixed once, here, rather than re-decided per template and silently diverging.
 *
 *   downbeat    an on-beat hit
 *   backbeat    beats 2 and 4 of the part that *states* the backbeat — the clap, the snare,
 *               the sidestick. Other roles hitting beat 2 or 4 use `downbeat`: a kick on 2 is
 *               pulse, not backbeat.
 *   offbeat     an 8th-note offbeat
 *   ghost       a quiet 16th between the beats. Always carries a low velocity.
 *   accent      the one hit the variant leans on. Always carries a high velocity.
 *   fill        a 16th run in the closing beat of the variant
 *   first-hit   an entry gesture that is not part of the pulse — the crash on an impact
 *   last-hit    a tail that is not part of the pulse
 *
 * `first-hit`/`last-hit` are deliberately *not* "whichever hit happens to be first or last".
 * Under that reading a four-to-the-floor kick would have no downbeat on step 1 and a clap would
 * never state a backbeat, and the two slots a device most wants to articulate — the part's entry
 * and its tail — would land on hits that are neither.
 *
 * ---------------------------------------------------------------------------
 * The bands
 * ---------------------------------------------------------------------------
 *
 * Band 0 is the part at its most skeletal, band 3 at its busiest. Density *selects* among these
 * (§6.3); it never edits hits, which is why each band is authored whole.
 */

/** `on('offbeat', 3, 7, 11, 15)` — one slot, several steps, no velocity. */
export function on(slot: PatternSlot, ...steps: number[]): PatternHit[] {
  return steps.map((step) => ({ step, slot }))
}

/** `at('ghost', 48, 2, 6)` — the velocity-carrying slots. See the convention above. */
export function at(slot: PatternSlot, velocity: number, ...steps: number[]): PatternHit[] {
  return steps.map((step) => ({ step, slot, velocity }))
}

/**
 * Assembles one variant and puts its hits in step order. Sorting here rather than asking the
 * author to interleave the groups by hand keeps the source readable *and* the data canonical —
 * two variants that differ only in the order their groups were written are byte-identical
 * downstream (invariant 6). Numeric comparison, so no locale is involved (§7.2).
 */
export function variant(
  id: string,
  forRole: Role,
  band: 0 | 1 | 2 | 3,
  length: 16 | 32 | 64,
  ...groups: PatternHit[][]
): Pattern {
  return {
    id,
    forRole,
    band,
    length,
    hits: groups.flat().sort((a, b) => a.step - b.step),
  }
}
