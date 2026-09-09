import { STEPS_PER_BAR, type Pattern } from './template'

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
 * One function rather than one per surface. The guide, the riff's Markdown and the riff's page
 * all draw this figure, and the drawing *is* the fact — two of them disagreeing about a step
 * would be two different patterns under one name. It lived in `render.ts` and again in
 * `riff-text.ts`, in copies that agreed by inspection only (#512).
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
