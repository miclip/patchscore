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
  children,
}: {
  pattern: Pattern
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
          <span className="mono">{slotSteps(hits)}</span>
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
function slotSteps(hits: readonly PatternHit[]): string {
  const first = hits[0] as PatternHit
  const uniform =
    hits.length > 1 &&
    first.velocity !== undefined &&
    hits.every((h) => h.velocity === first.velocity)
  if (uniform) {
    return `${hits.map((h) => num(h.step)).join(', ')} (all vel ${num(first.velocity as number)})`
  }
  return hits
    .map((h) => (h.velocity === undefined ? num(h.step) : `${num(h.step)} (vel ${num(h.velocity)})`))
    .join(', ')
}
