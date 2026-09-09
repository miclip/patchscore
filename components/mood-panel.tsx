'use client'

import type { MoodAxis, MoodState } from '@/lib/core'
import { DensityDetents } from './density-detents'
import { Knob } from './knob'

/**
 * §6. The five mood axes. Four are continuous knobs; density is the odd one out and says so
 * by looking different (§6.3).
 *
 * Hints are jogs under ~8 words (invariant 7) — what the axis moves, not how it works.
 */
const HINTS: Record<Exclude<MoodAxis, 'density'>, string> = {
  darkness: 'cutoff and tuning down',
  grit: 'drive, saturation, bitcrush',
  swing: 'shuffle, groove, swing amount',
  space: 'reverb, delay, sends',
}

const KNOB_AXES = ['darkness', 'grit', 'swing', 'space'] as const

export type MoodPanelProps = {
  mood: MoodState
  onChange: (axis: MoodAxis, value: number) => void
  /**
   * §6/#504. Hand the knobs back to the direction. Absent where there is no direction to hand
   * them back to, which is how the header knows not to draw the control at all.
   */
  onReset?: () => void
  /** Whether the reader owns the mood on screen, so there is something to hand back. */
  canReset?: boolean
  /**
   * §6/#317. The axes still holding the value the direction opened at, and the direction's name
   * to credit. A reader seeing swing at 65 on Hip-hop could not tell whether it was theirs.
   */
  fromDirection?: Partial<MoodState>
  directionName?: string
}

export function MoodPanel({
  mood,
  onChange,
  onReset,
  canReset = false,
  fromDirection,
  directionName,
}: MoodPanelProps) {
  const credit = (axis: MoodAxis): string | undefined =>
    directionName !== undefined && fromDirection?.[axis] !== undefined ? directionName : undefined

  return (
    <section className="panel span-2">
      <header>
        <h2>Mood</h2>
        <p className="note">
          Drag vertically, hold Shift to fine-adjust, or type a number.
        </p>
        {/*
          §6.3/#504. Rendered only where there is a direction to hand the knobs back to, and
          disabled while they are already its own. A control that is always live but does nothing
          on most visits is the thing #461's lamp exists to catch; this one says which it is.

          The label names the destination rather than the gesture, because "Reset" alone leaves a
          reader guessing whether it centres the knobs or restores what they opened at, and on
          `hip-hop` those differ.
        */}
        {onReset === undefined ? null : (
          <button
            type="button"
            className="mood-reset"
            onClick={onReset}
            disabled={!canReset}
            title={
              canReset
                ? `Put the five knobs back where ${directionName ?? 'the direction'} opened them`
                : `The knobs are where ${directionName ?? 'the direction'} opened them`
            }
          >
            Back to {directionName ?? 'the direction'}
          </button>
        )}
      </header>

      <div className="mood-grid">
        {KNOB_AXES.map((axis) => (
          <Knob
            key={axis}
            label={axis}
            value={mood[axis]}
            hint={HINTS[axis]}
            source={credit(axis)}
            onChange={(next) => onChange(axis, next)}
          />
        ))}
        <DensityDetents
          value={mood.density}
          source={credit('density')}
          onChange={(next) => onChange('density', next)}
        />
      </div>
    </section>
  )
}
