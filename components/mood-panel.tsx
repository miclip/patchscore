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
  swing: 'timing offsets, substep placement',
  space: 'reverb, delay, sends',
}

const KNOB_AXES = ['darkness', 'grit', 'swing', 'space'] as const

export type MoodPanelProps = {
  mood: MoodState
  onChange: (axis: MoodAxis, value: number) => void
}

export function MoodPanel({ mood, onChange }: MoodPanelProps) {
  return (
    <section className="panel span-2">
      <header>
        <h2>Mood</h2>
        <p className="note">
          Drag vertically, hold Shift to fine-adjust, or type a number.
        </p>
      </header>

      <div className="mood-grid">
        {KNOB_AXES.map((axis) => (
          <Knob
            key={axis}
            label={axis}
            value={mood[axis]}
            hint={HINTS[axis]}
            onChange={(next) => onChange(axis, next)}
          />
        ))}
        <DensityDetents value={mood.density} onChange={(next) => onChange('density', next)} />
      </div>
    </section>
  )
}
