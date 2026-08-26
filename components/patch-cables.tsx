'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Patchbay, PatchKind } from '@/lib/studio/patchbay'

/**
 * #138. The cables over the picker: the rig drawn as you assemble it.
 *
 * A **visual layer over real checkboxes, never a replacement.** #112 paid for the row's label
 * association, its focus order and two 44px targets, and the moment selection stops being a
 * checkbox it stops being keyboard-operable and screen-reader-legible. Nothing here is
 * focusable, nothing here is clickable, and the whole overlay is `aria-hidden`: the facts it
 * draws are already in the rows underneath and are restated in words below it.
 *
 * The reference site this borrows from renders its entire navigation as bare `div`s with
 * `cursor: pointer` — a visual triumph and an accessibility void, and the two are related.
 * Borrow the drawing; never the markup.
 *
 * ## Two channels, and which one carries meaning
 *
 * - **Kind is a dash pattern**: solid for `clock`, dashed for `audio`, dash-dot for `either`.
 * - **Identity is hue**, one per device, from `patchbay`'s deterministic `hue`.
 *
 * That ordering is not aesthetic. `globals.css`'s forced-colours block collapses the whole cable
 * palette to `#000` / `#555` / `#888` — lightness only, no hue at all — so hue is the channel
 * that *disappears*. Meaning therefore lives in the dash, which survives, and hue does the
 * following-one-cable job for readers who have it. Putting kind in hue would have made the
 * drawing say nothing in exactly the mode where saying it matters most.
 *
 * ## Geometry
 *
 * Measured from the DOM rather than assumed, because a row's height changes with its wrapped
 * `sub` line and with the viewport — #21 makes 390px a primary context, not a fallback, and a
 * cable drawn to where a row *would* be at desktop width lands in the wrong place on a phone.
 * A `ResizeObserver` on the list keeps it true through reflow.
 *
 * The sag is the same shape `rack/model.ts` uses — a cubic with both controls pushed down — and
 * that droop is most of why it reads as a cable rather than an arrow. It is clamped, because a
 * catenary that reads across a 1400px rack is clutter across a 340px column: the picker's runs
 * are shorter and stiffer than the rack's on purpose.
 */

/** Kind lives here, in the channel that survives a palette with no hue. */
const DASH: Record<PatchKind, string | undefined> = {
  clock: undefined,
  audio: '7 5',
  either: '1 5 7 5',
}

type Jack = { deviceId: string; x: number; y: number }
type Drawn = { deviceId: string; kind: PatchKind; hue: number; d: string }

export function PatchCables({
  bay,
  areaRef,
  scrollRef,
}: {
  bay: Patchbay
  /** The positioning context: the list *and* the sentence carrying the `out` jack. */
  areaRef: React.RefObject<HTMLElement | null>
  /** The inner list, which scrolls; cables are recomputed when it does. */
  scrollRef: React.RefObject<HTMLElement | null>
}) {
  const [size, setSize] = useState<{ w: number; h: number } | undefined>(undefined)
  const [cables, setCables] = useState<Drawn[]>([])
  const frame = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const area = areaRef.current
    if (area === null || bay.source === undefined) {
      setCables([])
      return
    }
    /**
     * Rects for both, so the arithmetic is viewport-relative and the inner list's scroll is
     * already in the numbers. An earlier version added `scrollTop` because the overlay lived
     * *inside* the scrolling list and had to be in content coordinates; the overlay is now in
     * the non-scrolling wrapper, so adding it again would double-count and slide every cable.
     */
    const box = area.getBoundingClientRect()
    /**
     * The list scrolls, so a row can be outside it. Its socket still has a position, and drawing
     * to that position sends the cable out of the list and down through the legend — which is
     * what it did. A run to a socket you cannot see is not followable anyway, so it is not
     * drawn: the cable stops existing rather than escaping, and reappears on scroll.
     *
     * `out` sits below the list by design and is exempt.
     */
    const clip = scrollRef.current?.getBoundingClientRect()
    const visible = (r: DOMRect, id: string) =>
      id === '__out' ||
      clip === undefined ||
      (r.top >= clip.top - 2 && r.bottom <= clip.bottom + 2)

    const jacks = new Map<string, Jack>()
    for (const el of area.querySelectorAll<HTMLElement>('[data-jack]')) {
      const id = el.dataset['jack']
      if (id === undefined) continue
      const r = el.getBoundingClientRect()
      if (!visible(r, id)) continue
      jacks.set(id, {
        deviceId: id,
        x: r.left - box.left + r.width / 2,
        y: r.top - box.top + r.height / 2,
      })
    }
    const from = jacks.get(bay.source.deviceId)
    if (from === undefined) {
      setCables([])
      return
    }
    const drawn: Drawn[] = []
    bay.links.forEach((link, i) => {
      const to = jacks.get(link.deviceId)
      if (to === undefined) return
      /**
       * The bow goes **sideways, over the rows** — not down a gutter.
       *
       * Drawn first as the rack's downward sag, and looking at it settled the question: in a
       * vertical list every jack shares an x, so a cubic with both controls pushed down renders
       * as a dead-straight line. Four of them stacked in one column read as a bus bar, and hue
       * cannot help you follow a cable that is collinear with three others.
       *
       * Arcing across the panel faces is what the reference actually does, and it is what makes
       * the run read as a cable. The excursion varies per cable so two runs between nearby rows
       * separate by eye rather than overlapping — the same reason VCV's slack differs per cable.
       */
      const span = Math.abs(to.y - from.y)
      /**
       * The bow goes **left**, into the row's cable lane, because the socket is now the checkbox
       * and everything to its right is text. Bowing right crossed the device names; bowing left
       * hangs the run off the panel edge the way a loom does, and touches nothing.
       */
      const bow = -(Math.min(22, 10 + span * 0.07) + (i % 3) * 5)
      const c1y = from.y + (to.y - from.y) * 0.18
      const c2y = from.y + (to.y - from.y) * 0.82
      drawn.push({
        deviceId: link.deviceId,
        kind: link.kind,
        hue: link.hue,
        d: `M ${r(from.x)} ${r(from.y)} C ${r(from.x + bow)} ${r(c1y)}, ${r(to.x + bow)} ${r(c2y)}, ${r(to.x)} ${r(to.y)}`,
      })
    })
    /**
     * The rig's own run to `out`: the clock source is what leaves for the guide, and giving the
     * drawing a single terminus is what makes the section read as a patchbay rather than a menu.
     * Drawn first so it sits under the star.
     */
    const out = jacks.get('__out')
    if (out !== undefined) {
      /**
       * Down the lane, then across — not a diagonal. A straight run to `out` cut through every
       * line of the legend, so the route keeps to the cable lane until it is level with the jack
       * and only then turns. Both controls sit in the lane, which is what makes the corner.
       */
      const lane = from.x - 20
      drawn.unshift({
        deviceId: '__out',
        kind: 'clock',
        hue: 24,
        d: `M ${r(from.x)} ${r(from.y)} C ${r(lane)} ${r(from.y + (out.y - from.y) * 0.55)}, ${r(lane)} ${r(out.y)}, ${r(out.x)} ${r(out.y)}`,
      })
    }

    setSize({ w: box.width, h: box.height })
    setCables(drawn)
  }, [bay, areaRef, scrollRef])

  // Layout effect so the first paint has cables, not a flash of none.
  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const list = areaRef.current
    const scroller = scrollRef.current
    if (list === null) return
    const schedule = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(list)
    for (const el of list.querySelectorAll('[data-jack]')) observer.observe(el)
    window.addEventListener('resize', schedule)
    // The list scrolls under a fixed overlay, so every cable moves when it does.
    scroller?.addEventListener('scroll', schedule, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      scroller?.removeEventListener('scroll', schedule)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [measure, areaRef, scrollRef])

  if (size === undefined || cables.length === 0) return null

  return (
    <svg
      className="patchbay"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${r(size.w)} ${r(size.h)}`}
      aria-hidden="true"
      focusable="false"
    >
      {cables.map((c) => (
        <g className="patch-cable" key={c.deviceId} data-kind={c.kind}>
          {/* Casing under core, the same two-path treatment the rack uses: it is what makes a
              line read as a cable with a jacket rather than a stroke. */}
          <path className="patch-cable-casing" d={c.d} strokeDasharray={DASH[c.kind]} />
          <path
            className="patch-cable-core"
            d={c.d}
            strokeDasharray={DASH[c.kind]}
            style={{ stroke: `hsl(${String(c.hue)} 70% 62%)` }}
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
