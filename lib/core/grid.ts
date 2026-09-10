import { STEPS_PER_BAR, type Pattern, type PatternHit } from './template'

/**
 * §4.3/§8/#512. **The marks a step grid is drawn with, and the one drawing of it.**
 *
 * `x` is a struck step and `·` a silent one. They were literals in two files that had to agree
 * and were not connected: the guide's phase 5 and the riff's grid, near-identical copies holding
 * by inspection. A third surface now inherits the marks rather than choosing them.
 *
 * The arrangement row's `█` is not this figure and is not defined here. Its cell is a span of
 * bars scaled to a section's width, where a run fusing into a bar is the point; a step cell is
 * one event a reader counts to find which pad to press. Two figures, two marks, and #512 was
 * filed on reading one for the other.
 */
export const STEP_SOUNDS = 'x'
export const STEP_SILENT = '·'

/** §4.3's grid: sixteen steps to a row, in groups of four. */
const ROW = STEPS_PER_BAR

/**
 * The pattern as a grid, in rows of sixteen steps grouped in fours, with the step number the row
 * starts at. A 64-step variant is four rows of the shape a box's screen shows, not one line that
 * wraps somewhere different on every reader's phone.
 *
 * One function rather than one per surface, and **what it shares is the hit data, not the
 * drawing** (#528). Which steps are struck, and how they group into rows, is one fact: two
 * surfaces disagreeing about it would be two different patterns under one name. How a renderer
 * *draws* those hits is its own ink (#33) — Markdown has `x` and `·` and nothing else, where the
 * React surfaces draw a filled box per step and carry these rows underneath, visually hidden, as
 * the text a reader selects and copies.
 *
 * This used to read "the drawing *is* the fact", which is what led a riff page to put the
 * Markdown's own `<pre>` on a surface that could draw boxes (#528). It lived in `render.ts` and
 * again in `riff-text.ts`, in copies that agreed by inspection only (#512).
 */
export function stepGridRows(pattern: Pattern): readonly string[] {
  const hit = new Set(pattern.hits.map((h) => h.step))
  const width = String(pattern.length).length
  const rows: string[] = []
  for (let start = 1; start <= pattern.length; start += ROW) {
    const cells: string[] = []
    for (let step = start; step < start + ROW && step <= pattern.length; step++) {
      if ((step - start) % 4 === 0 && step !== start) cells.push(' ')
      cells.push(hit.has(step) ? STEP_SOUNDS : STEP_SILENT)
    }
    rows.push(`${String(start).padStart(width, ' ')} ${cells.join('')}`)
  }
  return rows
}

/** One slot's hits, sharing the grouping decision rather than the ink. */
export type SlotGroup = { slot: PatternHit['slot']; hits: readonly PatternHit[] }

/**
 * Hits by slot, in the order the slots first appear in the authored pattern.
 *
 * The other half of the shared hit data (#528). Three surfaces list a pattern's slots — the
 * guide's Markdown, the guide's page and a riff's both halves — and each held its own copy of
 * this loop, agreeing by inspection in the way `stepGridRows` used to. The order is authored
 * order and never sorted: a slot list re-ordered alphabetically stops matching the grid above it.
 *
 * What each surface still decides for itself is how a row reads — `—` or `·`, a hoisted velocity
 * or none, a vocabulary trigger or a plain word.
 */
export function slotGroups(pattern: Pattern): readonly SlotGroup[] {
  const bySlot = new Map<PatternHit['slot'], PatternHit[]>()
  for (const hit of pattern.hits) {
    const existing = bySlot.get(hit.slot)
    if (existing === undefined) bySlot.set(hit.slot, [hit])
    else existing.push(hit)
  }
  return [...bySlot].map(([slot, hits]) => ({ slot, hits }))
}

/**
 * The steps this pattern strikes, ascending and without repeats.
 *
 * §8/#528. What a screen reader is told the figure *is*. A box grid says which sixteenths are
 * struck by filling a cell, which is nothing at all to a reader who cannot see it, and the
 * `aria-label` it carried said how many hits there were and never which — a count is not a
 * pattern. Deduplicated because two slots may strike one step, and the reader is being told which
 * steps to press rather than how many events sit on them.
 */
export function struckSteps(pattern: Pattern): readonly number[] {
  return [...new Set(pattern.hits.map((h) => h.step))].sort((a, b) => a - b)
}
