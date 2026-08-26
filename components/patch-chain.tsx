'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * #138. The page's own chain: `out` → Direction → Inspiration.
 *
 * Separate from `PatchCables`, and the split is structural rather than tidiness. Those cables
 * belong to the device list: they scroll with it and `overflow` clips them at its edge, which is
 * what a loom disappearing behind a rack looks like. This run crosses three panels and must not
 * scroll with any one of them, so it lives at the top of the studio instead.
 *
 * **What it claims.** A Direction is always chosen — one is defaulted — so the run from `out`
 * always exists, and it says the guide leaves by this direction. An Inspiration is optional, so
 * that link appears only when one is selected, and appears *from the Direction* because that is
 * what an inspiration modifies: it attaches to the direction's roles rather than to the rig.
 *
 * **Mood is deliberately absent.** It is applied after resolution, as an offset to values already
 * chosen, so a cable would draw it as a peer of the rig and say something false about how the
 * engine works. #138's own body raises the same objection. Nothing is drawn where the claim
 * would not be true.
 *
 * Nothing here is focusable or clickable, and the whole overlay is `aria-hidden`: every link it
 * draws is already stated by the controls it runs between.
 */

type Point = { x: number; y: number }

/**
 * The margin the chain runs down, in pixels from the left of `.columns`.
 *
 * Fixed rather than derived from the sockets, because the three panels indent differently and a
 * run that stepped in and out at each one would read as three cables rather than one.
 *
 * Far enough left to clear the cards: at 13 the curve's shoulder sat inside them and clipped the
 * first letter of every panel heading — `DIRECTION`, `SEED`, `INSPIRATIONS`.
 */
const LANE_X = 5

export function PatchChain({ areaRef }: { areaRef: React.RefObject<HTMLElement | null> }) {
  const [size, setSize] = useState<{ w: number; h: number } | undefined>(undefined)
  const [links, setLinks] = useState<{ id: string; d: string }[]>([])
  const frame = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const area = areaRef.current
    if (area === null) {
      setLinks([])
      return
    }
    const box = area.getBoundingClientRect()
    const at = (name: string): Point | undefined => {
      const el = area.querySelector<HTMLElement>(`[data-chain="${name}"]`)
      if (el === null) return undefined
      const r = el.getBoundingClientRect()
      // A row scrolled out of its own list has a position but nothing to point at; skip it
      // rather than run a cable to where it would be.
      if (r.width === 0 && r.height === 0) return undefined
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
    }

    const out = at('out')
    const direction = at('direction')
    const inspiration = at('inspiration')
    const drawn: { id: string; d: string }[] = []
    const run = (id: string, a: Point, b: Point) => {
      /**
       * Down the page's left margin, outside the panels entirely.
       *
       * Drawn first *behind* the cards, on the theory that a run passing under a panel reads
       * like a loom behind a rack. It does not: at 390px only three short stubs showed in the
       * gaps, which reads as a broken cable rather than a hidden one. Out in the margin it is
       * one continuous run, and it still crosses no text — it leaves each socket through the
       * row's own cable lane, which is padding.
       */
      const lane = LANE_X
      /**
       * Controls level with their own endpoints, so the run leaves each socket *horizontally*,
       * drops through the margin and enters the next one horizontally. Offsetting them along the
       * span instead pulled the curve diagonally and its shoulder clipped the panel headings.
       */
      drawn.push({
        id,
        d: `M ${r(a.x)} ${r(a.y)} C ${r(lane)} ${r(a.y)}, ${r(lane)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`,
      })
    }
    if (out !== undefined && direction !== undefined) run('out-direction', out, direction)
    if (direction !== undefined && inspiration !== undefined) {
      run('direction-inspiration', direction, inspiration)
    }
    /**
     * Written only when they actually change. `useLayoutEffect` runs `measure` and `measure`
     * sets state, so an unconditional write re-renders, re-measures and never stops — which is
     * exactly what it did. Comparing first makes the effect idempotent rather than relying on a
     * dependency list to be exhaustive.
     */
    setSize((prev) =>
      prev !== undefined && prev.w === box.width && prev.h === box.height
        ? prev
        : { w: box.width, h: box.height },
    )
    setLinks((prev) =>
      prev.length === drawn.length && prev.every((l, i) => l.d === drawn[i]?.d) ? prev : drawn,
    )
  }, [areaRef])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const area = areaRef.current
    if (area === null) return
    const schedule = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(area)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [measure, areaRef])

  if (size === undefined || links.length === 0) return null

  return (
    <svg
      className="patch-chain"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${r(size.w)} ${r(size.h)}`}
      aria-hidden="true"
      focusable="false"
    >
      {links.map((l) => (
        <g className="patch-cable" key={l.id} data-kind="chain">
          <path className="patch-cable-casing" d={l.d} />
          <path className="patch-cable-core patch-chain-core" d={l.d} />
        </g>
      ))}
    </svg>
  )
}

/** Two decimals is under a tenth of a device pixel here, and keeps the path data short. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
