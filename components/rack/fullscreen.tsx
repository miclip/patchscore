'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RackModel } from './model'
import { RackDiagram } from './diagram'

/**
 * #21's answer for narrow screens, and the half that makes the overview honest.
 *
 * A four-device rack is roughly a metre of front panel. On a 390px phone that is 0.4 px per mm:
 * fit-to-width keeps the shape — relative widths, which box is the clock source, where the
 * cables run — and loses the silkscreen. So the overview is deliberately a *shape*, the legend
 * beside it carries the words, and this layer carries the readable drawing.
 *
 * Why a full-screen layer rather than letting the figure scroll sideways in the page: a rack
 * that scrolls inside a 390px column shows about a third of one cable, and the cables are the
 * entire reason the diagram exists (§10). Panning a full-screen canvas shows a cable end to end.
 * The page body still never scrolls horizontally — this is `position: fixed`, and the overview
 * is `width: 100%`, so neither can contribute to it.
 *
 * **It inherits the overview's wrap, deliberately** (#63 asked for the decision rather than the
 * inheritance). The alternative was tempting — one long row here, since this layer already pans
 * sideways — and it is wrong for two reasons. The reader arrives at this layer from the overview
 * and expects to find the same rack, not a different arrangement of it; and one row would put the
 * clock cables back across a metre of panel, which is the run that no longer fits on a screen at
 * a readable scale. Same model, same rows, same cables, drawn larger and panned in both axes.
 *
 * The keyboard path is a real path, not an afterthought: the scroll region is focusable and
 * scrolls with the arrow keys, Escape closes, focus is trapped between the two stops while open
 * and returned to the trigger on close.
 */
export function RackFullscreen({
  model,
  onClose,
}: {
  model: RackModel
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const { style } = document.body
    const previous = style.overflow
    style.overflow = 'hidden'
    return () => {
      style.overflow = previous
    }
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      // Two stops, so the trap is a swap rather than a list walk.
      const close = closeRef.current
      const region = regionRef.current
      if (close === null || region === null) return
      event.preventDefault()
      ;(document.activeElement === close ? region : close).focus()
    },
    [onClose],
  )

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const region = regionRef.current
    if (region === null || event.pointerType === 'touch') return // touch pans natively
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: region.scrollLeft,
      top: region.scrollTop,
    }
    region.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const region = regionRef.current
    const start = drag.current
    if (region === null || start === null) return
    region.scrollLeft = start.left - (event.clientX - start.x)
    region.scrollTop = start.top - (event.clientY - start.y)
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const region = regionRef.current
    if (region !== null && region.hasPointerCapture(event.pointerId)) {
      region.releasePointerCapture(event.pointerId)
    }
    drag.current = null
  }

  return (
    <div
      className="rack-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Rack, full size"
      onKeyDown={onKeyDown}
    >
      <header className="rack-modal-head">
        <h2>Rack — full size</h2>
        <button ref={closeRef} type="button" className="rack-modal-close" onClick={onClose}>
          Close
        </button>
      </header>
      <div
        ref={regionRef}
        className="rack-modal-body"
        tabIndex={0}
        role="group"
        aria-label="Rack drawing. Drag or use the arrow keys to pan."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ ['--rack-mm' as string]: model.totalMm }}
      >
        <RackDiagram model={model} idPrefix="rack-full" />
      </div>
      <p className="rack-modal-foot">Drag to pan, or use the arrow keys. Escape closes.</p>
    </div>
  )
}
