'use client'

import { densityBand } from '@/lib/core'

/**
 * §6.3 / §12.2. Density is quantised: the band edges are fixed constants and each band selects
 * an authored pattern variant. A 0-100 sweep would imply a continuum and have people hunting
 * for an effect between 26 and 49 that does not exist, so this renders as four detents.
 *
 * The four values are band centres, so a value round-tripped through a permalink lands back on
 * the same detent even if the edges are ever read off by one somewhere.
 *
 * `densityBand` is imported rather than reimplemented. The band edges live in the resolver and
 * a second copy here is a UI that can silently disagree with the guide it produced.
 */
export const DENSITY_DETENTS = [12, 37, 62, 87] as const

/** UI labels only. Not vocabulary - nothing in a template or a device names these (invariant 3). */
const BAND_WORDS = ['sparse', 'steady', 'driving', 'relentless'] as const

export type DensityDetentsProps = {
  value: number
  onChange: (value: number) => void
}

export function DensityDetents({ value, onChange }: DensityDetentsProps) {
  const selected = densityBand(value)

  return (
    <fieldset className="detents">
      <legend className="knob-label">density</legend>
      <div className="detent-row">
        {DENSITY_DETENTS.map((detent, band) => (
          <label className="detent" key={detent}>
            <input
              type="radio"
              name="density"
              value={detent}
              checked={band === selected}
              onChange={() => onChange(detent)}
            />
            <span className="band mono">{band}</span>
            <span className="word">{BAND_WORDS[band]}</span>
          </label>
        ))}
      </div>
      <span className="knob-hint">
        Four authored pattern bands. Falls back to the nearest lower band when a template has
        not authored the one asked for.
      </span>
    </fieldset>
  )
}
