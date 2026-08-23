'use client'

import { useId, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, PointerEvent } from 'react'
import { clampMood, dragValue, MOOD_MAX, MOOD_MIN } from './knob-math'

/**
 * §10 / #10. A mood knob: vertical drag, Shift for fine adjustment, **and** an always-visible
 * typed numeric input. Drag-only fails accessibility and is annoying at precision, so the
 * number field is not a hover affordance or a double-click reveal — it is always there.
 *
 * Values are integers 0-100 because that is what `MoodState` carries and what §8.2's permalink
 * budget assumes (five mood ints). There is no finer granularity to expose, so "fine" means a
 * slower pixels-per-unit rate during a drag, not a fractional value.
 *
 * Density does not use this control — see `density-detents.tsx` and §6.3.
 */

const MIN = MOOD_MIN
const MAX = MOOD_MAX

/** Dial geometry. -135deg to +135deg, the usual 270deg sweep of a real panel control. */
const SIZE = 76
const CENTER = SIZE / 2
const ARC_RADIUS = 31
const BODY_RADIUS = 22
const START_ANGLE = -135
const SWEEP = 270

type DragAnchor = {
  pointerId: number
  /** Client Y where this leg of the drag started. */
  y: number
  /** Value where this leg started. Re-anchored whenever Shift is pressed or released. */
  value: number
  fine: boolean
}

type Point = { x: number; y: number }

function xy(angleDeg: number, radius: number): Point {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) }
}

function point(angleDeg: number, radius: number): string {
  const { x, y } = xy(angleDeg, radius)
  return `${x.toFixed(2)} ${y.toFixed(2)}`
}

function arc(fromDeg: number, toDeg: number): string {
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
  return `M ${point(fromDeg, ARC_RADIUS)} A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${large} 1 ${point(toDeg, ARC_RADIUS)}`
}

function angleFor(value: number): number {
  return START_ANGLE + (SWEEP * (value - MIN)) / (MAX - MIN)
}

export type KnobProps = {
  label: string
  value: number
  onChange: (value: number) => void
  /** One line under the control. §10's restraint applies: a jog, not documentation. */
  hint?: string
}

export function Knob({ label, value, onChange, hint }: KnobProps) {
  const anchor = useRef<DragAnchor | null>(null)
  /**
   * Non-null only while the field holds text that is not the committed value - mid-typing
   * states like '' or '4' on the way to '42'. The control stays in charge of the number;
   * the field is only allowed to hold an unparsed string temporarily.
   */
  const [typed, setTyped] = useState<string | null>(null)

  function commit(next: number) {
    const clamped = clampMood(Math.round(next))
    if (clamped !== value) onChange(clamped)
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    anchor.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      value,
      fine: event.shiftKey,
    }
    // Keeps a touch drag from also scrolling; `touch-action: none` is scoped to this element
    // alone so a drag beginning anywhere else on the page still scrolls.
    event.preventDefault()
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const held = anchor.current
    if (held === null || held.pointerId !== event.pointerId) return

    // Shift pressed or released mid-drag re-anchors instead of jumping: the knob keeps the
    // value it already has and changes rate from here on.
    if (event.shiftKey !== held.fine) {
      anchor.current = { ...held, y: event.clientY, value, fine: event.shiftKey }
      return
    }

    commit(dragValue(held.value, held.y - event.clientY, held.fine))
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (anchor.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    anchor.current = null
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const step =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : event.key === 'PageUp'
            ? 10
            : event.key === 'PageDown'
              ? -10
              : 0

    if (step !== 0) {
      event.preventDefault()
      commit(value + step)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      commit(MIN)
    } else if (event.key === 'End') {
      event.preventDefault()
      commit(MAX)
    }
  }

  function onFieldChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value
    setTyped(raw)
    const parsed = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(parsed)) commit(parsed)
  }

  const angle = angleFor(value)
  const fieldId = useId()
  const from = xy(angle, 7)
  const to = xy(angle, BODY_RADIUS - 4)

  return (
    <div className="knob">
      <label className="knob-label" htmlFor={fieldId}>
        {label}
      </label>

      <svg
        className="knob-dial"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        onDoubleClick={() => commit(50)}
      >
        <path className="knob-track" d={arc(START_ANGLE, START_ANGLE + SWEEP)} />
        {value > MIN ? <path className="knob-fill" d={arc(START_ANGLE, angle)} /> : null}
        <circle className="knob-body" cx={CENTER} cy={CENTER} r={BODY_RADIUS} />
        <line className="knob-pointer" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
      </svg>

      <input
        id={fieldId}
        className="knob-input mono"
        type="number"
        inputMode="numeric"
        min={MIN}
        max={MAX}
        step={1}
        value={typed ?? String(value)}
        onChange={onFieldChange}
        onBlur={() => setTyped(null)}
      />

      {hint === undefined ? null : <span className="knob-hint">{hint}</span>}
    </div>
  )
}
