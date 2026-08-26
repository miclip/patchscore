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

export function PatchCables({ bay, listRef }: { bay: Patchbay; listRef: React.RefObject<HTMLElement | null> }) {
  const [size, setSize] = useState<{ w: number; h: number } | undefined>(undefined)
  const [cables, setCables] = useState<Drawn[]>([])
  const frame = useRef<number | undefined>(undefined)

  const measure = useCallback(() => {
    const list = listRef.current
    if (list === null || bay.source === undefined) {
      setCables([])
      return
    }
    // The list scrolls (`max-height` on `.picker-list`), and an absolutely positioned child
    // scrolls with its content — so positions are measured against the *scroll* origin, not the
    // visible box. Without `scrollTop` every cable slides as soon as the list is scrolled.
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
      // Clamped to the row's cable lane. A wider arc reads better in isolation and crosses the
      // device name, which is the trade §8 settles in the text's favour.
      const bow = Math.min(20, 9 + span * 0.07) + (i % 3) * 4
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
        </g>
      ))}
    </svg>
  )
}

/** Two decimals is under a tenth of a device pixel here, and keeps the path data short. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
