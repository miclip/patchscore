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

/**
 * Kind lives in the line's **continuity**, which is a stronger fit than three arbitrary dash
 * patterns were:
 *
 *  - `clock` — a plain unbroken run. Settled, and one thing.
 *  - `audio` — unbroken but **striped**, the way audio cable is printed. Settled, and the other
 *    thing. A stripe rather than a dash because a dashed line reads as a diagram and a striped
 *    one reads as a cable.
 *  - `either` — **broken**. Nothing is settled, and a run that is not continuous is the honest
 *    shape for "your call which you patch".
 *
 * So continuity carries certainty and the stripe carries which kind, instead of three patterns a
 * reader has to memorise.
 */
const DASH: Record<PatchKind, string | undefined> = {
  clock: undefined,
  audio: undefined,
  either: '1 5 7 5',
}

/**
 * The stripe: a second path dashed over the core, filling every other segment.
 *
 * **The same geometry is a stripe or a dash depending only on what colour it is given**, and
 * that is what keeps the forced-colours argument intact. Painted in a second tone of the
 * cable's own hue it reads as printed insulation; painted in the page's background — which is
 * what the forced-colours block does — it cuts the core into a dashed line instead. Audio stays
 * distinguishable from clock in a palette with no hue at all, without a second mechanism.
 */
const STRIPE: Record<PatchKind, string | undefined> = {
  clock: undefined,
  audio: '6 6',
  either: undefined,
}

type Jack = { deviceId: string; x: number; y: number }
type Drawn = { deviceId: string; kind: PatchKind; hue: number; d: string }

export function PatchCables({
  bay,
  listRef,
}: {
  bay: Patchbay
  /** The scrolling list. The overlay lives inside it so cables scroll with their rows. */
  listRef: React.RefObject<HTMLElement | null>
}) {
  const [size, setSize] = useState<{ w: number; h: number } | undefined>(undefined)
  const [cables, setCables] = useState<Drawn[]>([])
  const frame = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const list = listRef.current
    if (list === null || bay.source === undefined) {
      setCables([])
      return
    }
    /**
     * Content coordinates, not viewport ones: the overlay is inside the scrolling list, so it
     * scrolls with the rows and a cable stays attached to its socket.
     *
     * It briefly lived in a wrapper outside the list, to reach an `out` jack below it. Two
     * things went wrong and both were visible immediately — a run to a row scrolled out of view
     * escaped the list and crossed the legend, and suppressing those made cables *vanish* as you
     * scrolled, which reads as a bug rather than as a rule. Inside the list, `overflow` clips
     * them at the boundary for free, which is what a loom disappearing behind a rack looks like.
     */
    const box = list.getBoundingClientRect()
    const jacks = new Map<string, Jack>()
    for (const el of list.querySelectorAll<HTMLElement>('[data-jack]')) {
      const id = el.dataset['jack']
      if (id === undefined) continue
      const r = el.getBoundingClientRect()
      jacks.set(id, {
        deviceId: id,
        x: r.left - box.left + list.scrollLeft + r.width / 2,
        y: r.top - box.top + list.scrollTop + r.height / 2,
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
    setSize({ w: list.scrollWidth, h: list.scrollHeight })
    setCables(drawn)
  }, [bay, listRef])

  // Layout effect so the first paint has cables, not a flash of none.
  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const list = listRef.current
    if (list === null) return
    const schedule = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(list)
    for (const el of list.querySelectorAll('[data-jack]')) observer.observe(el)
    window.addEventListener('resize', schedule)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [measure, listRef])

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
          {STRIPE[c.kind] === undefined ? null : (
            <path
              className="patch-cable-stripe"
              d={c.d}
              strokeDasharray={STRIPE[c.kind]}
              style={{ stroke: `hsl(${String(c.hue)} 55% 34%)` }}
            />
          )}
        </g>
      ))}
    </svg>
  )
}

/** Two decimals is under a tenth of a device pixel here, and keeps the path data short. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
