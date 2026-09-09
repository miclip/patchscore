import { CableMark } from '@/components/cable-mark'
import type { PatchEntry } from '@/lib/core'

/**
 * §3.3/#520. **The cables inside a box, drawn once for every surface that draws them.**
 *
 * A `PatchEntry` is a `PatchEntry` everywhere, and the four surfaces that render one rendered it
 * identically: a cable mark, a monospace jack name, the arrow, a second monospace jack name, and
 * the author's note under it. So it lives here and the class list is a prop — the shape is shared
 * and the ink stays each surface's own (#33).
 *
 * **Its own module rather than a member of `resolved-body.tsx`, and the build is what says so.**
 * That file imports `Value` for a resolved parameter, `Value` reaches `components/guide/nav.ts`,
 * and that uses `createContext` — which a React Server Component may not import. `kit-parts.tsx`
 * is a server component on `/devices/<id>/kit` and needs the cables and nothing else, so a shared
 * module holding both would have made the kit page a client component to reuse eight lines. The
 * split is the fix, and it is the reason to run `npm run build` rather than trust a green suite:
 * every test here renders through `renderToStaticMarkup`, which has no server/client boundary in
 * it at all.
 */
export function PatchList({
  entries,
  className,
}: {
  entries: readonly PatchEntry[]
  /** The surface's own class list. See the header: ink is not shared, structure is. */
  className: string
}) {
  return (
    <ul className={className}>
      {entries.map((entry) => (
        <li key={`${entry.from}->${entry.to}`}>
          <CableMark />
          <span className="mono">{entry.from}</span>
          <span className="arrow" aria-hidden="true">
            {' → '}
          </span>
          <span className="mono">{entry.to}</span>
          {entry.note === undefined ? null : <p className="subordinate note">{entry.note}</p>}
        </li>
      ))}
    </ul>
  )
}
