import type { Pattern } from '@/lib/core'
import { STEPS_PER_BAR, count, num, stepGridRows, struckSteps } from '@/lib/core'

/**
 * §4.3/§8/#528. **The step grid, drawn once for every React surface that draws one.**
 *
 * A guide has drawn boxes since it was built; a riff page drew the Markdown's own `x`/`·` rows in
 * a `<pre>`, because `StepGrid` was not exported and `lib/core/grid.ts` said the drawing *was* the
 * fact. It is not: which steps are struck is the shared fact, and boxes are what a React surface
 * draws over it. So the drawing lives here and the marks stay in `lib/core`.
 *
 * **Its own module, with no `Instruction` anywhere near it.** `RiffFigure` is a server component
 * and `components/guide/instruction.tsx` reaches `createContext`, which a server component may not
 * import — the same split `components/recipe/patch-list.tsx` exists for, and the reason the
 * articulation list beside this one is a separate file.
 *
 * In its own `overflow-x: auto` container (#21): sixteen fixed-width cells do not fit 390px, and
 * a grid that reflows is a grid whose step numbers stop lining up with the box in front of you.
 */
export function StepGrid({ pattern }: { pattern: Pattern }) {
  const hit = new Set(pattern.hits.map((h) => h.step))
  const struck = struckSteps(pattern)
  const rows = stepGridRows(pattern).map((row, index) => {
    const start = 1 + index * STEPS_PER_BAR
    const steps: number[] = []
    for (let step = start; step < start + STEPS_PER_BAR && step <= pattern.length; step++) {
      steps.push(step)
    }
    /*
      The shared row minus its right-aligned index. On this surface the alignment is
      `.step-index`'s job, so the padding spaces are not copied out with the figure; what is left
      is the separating space and the cells, which is what makes a copied row read `1 x··· ····`.
    */
    return { start, steps, text: row.replace(/^ *\d+/, '') }
  })

  return (
    <div className="table-scroll">
      {/*
        `role="img"` with the pattern in the label, not a count of it (#528). Sixteen empty spans
        say nothing to a screen reader, and *"4 hits over 16 steps"* — what this said before — is
        how many, on the one surface where which is the whole content.
      */}
      <div className="step-grid mono" role="img" aria-label={gridLabel(pattern, struck)}>
        {rows.map((row) => (
          <div className="step-row" key={row.start}>
            <span className="step-index">{num(row.start)}</span>
            {/*
              §8/#528. **The figure as text, visually hidden and selectable.** A reader who
              selected the guide's grid on a phone and pasted it got the step numbers and not one
              character of the pattern, because a filled box is a background colour. This is the
              same row the Markdown export prints, so what lands in a notes app is the figure.
            */}
            <span className="step-text">{row.text}</span>
            {row.steps.map((step) => (
              <span
                key={step}
                className={[
                  'step',
                  hit.has(step) ? 'on' : '',
                  (step - row.start) % 4 === 0 ? 'beat' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** `4 hits over 16 steps, struck on 1, 4, 7, 11`. The pattern, not a tally of it. */
function gridLabel(pattern: Pattern, struck: readonly number[]): string {
  const over = `${count(struck.length, 'hit')} over ${count(pattern.length, 'step')}`
  // Invariant 5: an empty grid says it is empty rather than trailing an empty list.
  return struck.length === 0 ? over : `${over}, struck on ${struck.map(num).join(', ')}`
}
