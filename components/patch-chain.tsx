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

/** How far left of a column's edge the run sits when both ends are in that column. */
const LANE_INSET = 8

/**
 * The vertical strip a run travels down, chosen from the layout rather than assumed.
 *
 * A fixed page margin was the first attempt and it is right for exactly one layout. Above 900px
 * `.columns` becomes two, and on a phone held sideways that is the layout you get: `out` sits in
 * the left column and the Direction in the right, so routing via the far-left margin swept both
 * runs across the whole page and through the panels between. The screenshot of it is the reason
 * this function exists.
 *
 * The rule is the same one a person stringing a rack would use — go down the nearest empty
 * channel:
 *
 *  - **Ends in different columns** — the gutter *between* them, which is empty by construction.
 *  - **Ends in the same column** — just outside that column's left edge, which is the page
 *    margin for the left column and the same gutter for the right.
 *
 * In a single column both ends share the one band and it reduces to the page margin, which is
 * what the fixed constant used to do. Measured from the panels themselves, so a change to the
 * breakpoint or the gap needs no change here.
 */
function laneBetween(a: Point, b: Point, bands: readonly Band[]): number {
  const bandA = bands.find((n) => a.x >= n.left && a.x <= n.right)
  const bandB = bands.find((n) => b.x >= n.left && b.x <= n.right)
  if (bandA !== undefined && bandB !== undefined && bandA !== bandB) {
    const [first, second] = bandA.left < bandB.left ? [bandA, bandB] : [bandB, bandA]
    return (first.right + second.left) / 2
  }
  const band = bandA ?? bandB
  return Math.max(4, (band?.left ?? LANE_INSET) - LANE_INSET)
}

type Band = { left: number; right: number }

/** The distinct column bands, deduplicated: full-width panels and a column share one entry. */
function columnBands(area: HTMLElement, box: DOMRect): Band[] {
  const seen = new Map<string, Band>()
  for (const panel of area.querySelectorAll<HTMLElement>(':scope > .panel')) {
    const r = panel.getBoundingClientRect()
    const band = { left: r.left - box.left, right: r.right - box.left }
    seen.set(`${String(Math.round(band.left))}:${String(Math.round(band.right))}`, band)
  }
  // Widest first, so a full-width panel never shadows the narrower column a socket is really in.
  return [...seen.values()].sort((x, y) => x.right - x.left - (y.right - y.left))
}

export function PatchChain({ areaRef }: { areaRef: React.RefObject<HTMLElement | null> }) {
  const [size, setSize] = useState<{ w: number; h: number } | undefined>(undefined)
  const [links, setLinks] = useState<{ id: string; d: string }[]>([])
  const frame = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    /**
     * Plain-checkbox mode draws nothing, so it measures nothing either (#138). Read here in an
     * effect rather than during render: the server cannot know a per-browser preference, and
     * reading it in render would mismatch hydration. CSS already hides the overlay; this stops
     * a `ResizeObserver` and a measure pass running for something nobody can see.
     */
    if (document.documentElement.getAttribute('data-jacks') === 'plain') {
      setLinks([])
      return
    }
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
    const bands = columnBands(area, box)
    const drawn: { id: string; d: string }[] = []
    const run = (id: string, a: Point, b: Point) => {
      /**
       * Down an empty channel, outside the panels.
       *
       * Drawn first *behind* the cards, on the theory that a run passing under a panel reads
       * like a loom behind a rack. It does not: at 390px only three short stubs showed in the
       * gaps, which reads as a broken cable rather than a hidden one. Out in a channel it is one
       * continuous run, and it crosses no text — it leaves each socket through the row's own
       * cable lane, which is padding.
       */
      const lane = laneBetween(a, b, bands)
      /**
       * Controls level with their own endpoints, so the run leaves each socket *horizontally*,
       * travels the channel and enters the next one horizontally. Offsetting them along the span
       * instead pulled the curve diagonally and its shoulder clipped the panel headings.
       *
       * **Except when the channel is on the far side of the socket's own label.** `out` carries
       * "out — to the guide" immediately to its right, so a run heading right left the socket
       * straight through its own caption. Where the lane is not on the side the run leaves from,
       * it leaves vertically instead and turns once it is clear.
       */
      const away = lane > a.x
      drawn.push({
        id,
        d: away
          ? // Down and out of the panel before turning. `out` sits at the foot of the Devices
            // card with its own label to the right and the legend directly above, so both the
            // horizontal exit and the upward one crossed text. Downward clears the card in a few
            // pixels, and the run reaches the channel under it.
            `M ${r(a.x)} ${r(a.y)} C ${r(a.x)} ${r(a.y + 46)}, ${r(lane)} ${r(b.y + 46)}, ${r(b.x)} ${r(b.y)}`
          : `M ${r(a.x)} ${r(a.y)} C ${r(lane)} ${r(a.y)}, ${r(lane)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`,
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
