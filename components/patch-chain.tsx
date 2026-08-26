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
 *
 * ## Why the geometry is written imperatively
 *
 * **React owns which cables exist; the frame loop owns where they are.** That split is the whole
 * reason this keeps up with a scroll.
 *
 * `PatchCables` does no JavaScript at all while the device list scrolls — its overlay is *inside*
 * that list, so the compositor moves it with the rows for free. This one cannot be inside any of
 * the three lists it spans, so it has to follow them by hand, and the first version did that
 * through `setState`: a measure, a render and a reconcile on every scroll frame. It visibly
 * lagged the content, which the device cables never do, and that difference was the report.
 *
 * Path data is now written straight onto the elements inside the `requestAnimationFrame`
 * callback. State changes only when a link appears or disappears — selecting a Direction, or a
 * first Inspiration — which happens on a click, not on a frame.
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
  const svgRef = useRef<SVGSVGElement | null>(null)
  const paths = useRef(new Map<string, SVGPathElement>())
  const frame = useRef<number | undefined>(undefined)
  /** Only which links exist — never where. Changes on a click, never on a frame. */
  const [ids, setIds] = useState<readonly string[]>([])

  const measure = useCallback(() => {
    const area = areaRef.current
    const svg = svgRef.current
    if (area === null) return
    // Plain-checkbox mode draws nothing, so it measures nothing either (#138). Read here in an
    // effect rather than during render: the server cannot know a per-browser preference.
    if (document.documentElement.getAttribute('data-jacks') === 'plain') {
      setIds((prev) => (prev.length === 0 ? prev : []))
      return
    }
    const box = area.getBoundingClientRect()
    const at = (name: string): Point | undefined => {
      const el = area.querySelector<HTMLElement>(`[data-chain="${name}"]`)
      if (el === null) return undefined
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return undefined
      const point = { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
      /**
       * **Clamped to the list the socket lives in.**
       *
       * Every picker list scrolls on its own (`max-height` on `.picker-list`), and a row scrolled
       * out of one still has a position — one *outside* its list. Drawing to it left the cable
       * ending in blank space several rows below the socket it claimed to reach.
       *
       * Clamping runs it to the list's edge and no further, so it reads as passing behind the
       * list rather than as missing its socket. The same answer the device cables reach by a
       * different route: there `overflow` does it, because that overlay is inside the list.
       */
      const scroller = el.closest<HTMLElement>('.picker-list')
      if (scroller !== null) {
        const s = scroller.getBoundingClientRect()
        point.y = Math.min(Math.max(point.y, s.top - box.top), s.bottom - box.top)
      }
      return point
    }

    const out = at('out')
    const direction = at('direction')
    const inspiration = at('inspiration')
    const bands = columnBands(area, box)

    const geometry = (a: Point, b: Point): string => {
      const lane = laneBetween(a, b, bands)
      /**
       * Controls level with their own endpoints, so the run leaves each socket *horizontally*,
       * travels the channel and enters the next one horizontally. Offsetting them along the span
       * instead pulled the curve diagonally and its shoulder clipped the panel headings.
       *
       * **Except when the channel is on the far side of the socket's own label.** `out` carries
       * its own label immediately to its right and the legend directly above, so both a
       * horizontal exit and an upward one crossed text. Downward clears the card in a few pixels.
       */
      return lane > a.x
        ? `M ${r(a.x)} ${r(a.y)} C ${r(a.x)} ${r(a.y + 46)}, ${r(lane)} ${r(b.y + 46)}, ${r(b.x)} ${r(b.y)}`
        : `M ${r(a.x)} ${r(a.y)} C ${r(lane)} ${r(a.y)}, ${r(lane)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`
    }

    const next: { id: string; d: string }[] = []
    if (out !== undefined && direction !== undefined) {
      next.push({ id: 'out-direction', d: geometry(out, direction) })
    }
    if (direction !== undefined && inspiration !== undefined) {
      next.push({ id: 'direction-inspiration', d: geometry(direction, inspiration) })
    }

    // Membership through React; geometry straight onto the element. Comparing first means a
    // scroll frame does no state work at all, which is the point of the split.
    setIds((prev) =>
      prev.length === next.length && prev.every((id, i) => id === next[i]?.id)
        ? prev
        : next.map((l) => l.id),
    )
    if (svg !== null) {
      svg.setAttribute('width', r(box.width))
      svg.setAttribute('height', r(box.height))
      svg.setAttribute('viewBox', `0 0 ${r(box.width)} ${r(box.height)}`)
    }
    for (const link of next) {
      for (const suffix of ['casing', 'core']) {
        paths.current.get(`${link.id}:${suffix}`)?.setAttribute('d', link.d)
      }
    }
  }, [areaRef])

  useLayoutEffect(() => {
    measure()
  }, [measure, ids])

  useEffect(() => {
    const area = areaRef.current
    if (area === null) return
    /**
     * Reflow is deferred a frame; **scroll is not**.
     *
     * A scroll listener runs before the frame is painted, so writing the path there lands in the
     * same frame the rows move in. Going through `requestAnimationFrame` instead means measuring
     * *after* the browser has already composited the scrolled content — the cable is then a frame
     * behind by construction, however cheap the measure is, and that is the wobble left over once
     * the React re-render was gone.
     *
     * The work is a handful of `getBoundingClientRect` calls and some attribute writes, which is
     * within a frame's budget. Resize and reflow keep the frame throttle: those are bursty, not
     * scroll-linked, and nothing is chasing them.
     */
    const schedule = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(area)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', measure, { passive: true })
    /**
     * Each picker list scrolls independently, and this overlay sits outside all of them, so a
     * socket moves under a cable that has no idea. Scrolling the Direction list left the run
     * pointing where the row used to be — reported, and the reason these listeners exist.
     */
    const scrollers = [...area.querySelectorAll<HTMLElement>('.picker-list')]
    for (const el of scrollers) el.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', measure)
      for (const el of scrollers) el.removeEventListener('scroll', measure)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [measure, areaRef])

  if (ids.length === 0) return null

  return (
    <svg className="patch-chain" ref={svgRef} aria-hidden="true" focusable="false">
      {ids.map((id) => (
        <g className="patch-cable" key={id} data-kind="chain">
          <path
            className="patch-cable-casing"
            ref={(el) => {
              if (el === null) paths.current.delete(`${id}:casing`)
              else paths.current.set(`${id}:casing`, el)
            }}
          />
          <path
            className="patch-cable-core patch-chain-core"
            ref={(el) => {
              if (el === null) paths.current.delete(`${id}:core`)
              else paths.current.set(`${id}:core`, el)
            }}
          />
        </g>
      ))}
    </svg>
  )
}

/** Two decimals is under a tenth of a device pixel here, and keeps the path data short. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
