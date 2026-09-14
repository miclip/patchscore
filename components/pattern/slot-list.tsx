import type { ReactNode } from 'react'
import type { Pattern, PatternHit } from '@/lib/core'
import { num, slotGroups } from '@/lib/core'
import { VocabularyTerm } from '@/components/vocabulary-term'

/**
 * §4.3/§8/#528. **The slot rows under a step grid, drawn once for every React surface.**
 *
 * The guide's, unchanged, and now the riff page's too. It had three differences from this and
 * each was the same omission: it dropped the velocity, it left the slot words as plain text where
 * #457 makes them definition triggers, and it grouped the hits a second time in its own file.
 *
 * `children` is where a surface adds a row of its own — the guide's tightest re-strike (#155) is
 * another fact about this map and belongs inside the same list rather than under it.
 *
 * **No `Instruction` here**, for `step-grid.tsx`' reason: a riff's figure is a server component.
 */
export function SlotList({
  pattern,
  passes = 1,
  children,
}: {
  pattern: Pattern
  /**
   * #613. How many times the grid goes round beneath the figure. A riff's hook may be longer than
   * its grid (§5A.2), and then a mark at step 9 strikes at 9, 73 and 137 — so the steps listed are
   * the figure's rather than the grid's. Defaults to one, which is every guide and every riff
   * whose figure is one pass, so nothing else moves.
   */
  passes?: number
  children?: ReactNode
}) {
  return (
    <ul className="slots">
      {slotGroups(pattern).map(({ slot, hits }) => (
        <li key={slot}>
          <span className="mono slot">
            <VocabularyTerm word={slot} />
          </span>
          {/* Separators are markup, never a CSS gap: a gap is invisible to a screen reader, to
              a copy-paste and to a test. */}
          <span className="token-sep">—</span>
          <span className="mono">{slotSteps(hits, pattern.length, passes)}</span>
        </li>
      ))}
      {children}
    </ul>
  )
}

/**
 * One slot's hits as steps, with a shared velocity hoisted to the end: `2, 4, 6, 8 (all vel 42)`
 * rather than eight copies of `(vel 42)`. The guide's Markdown sibling words it the same way — a
 * band-3 ghost slot is eight sixteenths, and per-hit it wraps three times on a phone (§10).
 */
function slotSteps(hits: readonly PatternHit[], gridLength: number, passes: number): string {
  const first = hits[0] as PatternHit
  const uniform =
    hits.length > 1 &&
    first.velocity !== undefined &&
    hits.every((h) => h.velocity === first.velocity)
  const across = (step: number): number[] =>
    Array.from({ length: passes }, (_, pass) => step + pass * gridLength)
  if (uniform) {
    const steps = hits.flatMap((h) => across(h.step)).sort((a, b) => a - b)
    return `${steps.map(num).join(', ')} (all vel ${num(first.velocity as number)})`
  }
  return hits
    .map((h) => {
      const steps = across(h.step).map(num).join(', ')
      return h.velocity === undefined ? steps : `${steps} (vel ${num(h.velocity)})`
    })
    .join(', ')
}
