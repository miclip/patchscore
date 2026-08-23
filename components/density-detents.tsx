'use client'

import { DENSITY_DETENTS, densityShift } from '@/lib/core'

/**
 * §6.3 / §12.2. Density is quantised, and it is a *lean*, not the band itself: the section's
 * energy picks the band and this shifts it by one, so there are three zones and not four. A
 * 0-100 sweep would imply a continuum and have people hunting for an effect between 26 and 49
 * that does not exist, so this renders as three detents.
 *
 * Both the detent values and `densityShift` are imported rather than reimplemented: the edges
 * and the centres live together in the resolver, and a second copy here is a UI that can
 * silently disagree with the guide it produced.
 */

/** UI labels only. Not vocabulary - nothing in a template or a device names these (invariant 3). */
const SHIFT_WORDS = ['sparser', 'as authored', 'busier'] as const

export type DensityDetentsProps = {
  value: number
  onChange: (value: number) => void
}

export function DensityDetents({ value, onChange }: DensityDetentsProps) {
  const selected = densityShift(value) + 1

  return (
    <fieldset className="detents">
      <legend className="knob-label">density</legend>
      <div className="detent-row">
        {DENSITY_DETENTS.map((detent, zone) => (
          <label className="detent" key={detent}>
            <input
              type="radio"
              name="density"
              value={detent}
              checked={zone === selected}
              onChange={() => onChange(detent)}
            />
            <span className="band mono">{zone === 1 ? '0' : zone === 0 ? '\u22121' : '+1'}</span>
            <span className="word">{SHIFT_WORDS[zone]}</span>
          </label>
        ))}
      </div>
      <span className="knob-hint">
        Each section&rsquo;s energy picks its pattern band; this leans the arrangement one band
        either way. A section already at the top or the bottom stays where it is. Falls back to
        the nearest lower band when a template has not authored the one asked for.
      </span>
    </fieldset>
  )
}
