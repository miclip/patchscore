import type { Harmony, Section } from '@/lib/core'
import { num } from './format'

/**
 * The two tables that describe a template rather than a guide: the progression in degrees, and
 * the section map with its energies.
 *
 * Extracted from `phase-song.tsx` when the direction catalogue needed them (#84). Both were
 * already reading `template` and not `song` — a progression is authored in roman numerals and
 * only *resolves* against a key, and a section's bars and energy do not move at all — so a
 * direction page and a rendered guide are looking at the same rows. Copying them would have made
 * two answers to "what is in this genre".
 *
 * Headings stay at the call site: the guide's are `<h4>` inside a phase and a catalogue page's
 * are `<h3>` under a panel, and a component that fixed the level would be wrong on one of them.
 */

/** A ten-cell meter. Integer cells from a fraction, so no float ever reaches the page. */
export function EnergyMeter({ energy }: { energy: number }) {
  const filled = Math.round(energy * 10)
  return (
    <span className="meter" role="img" aria-label={`energy ${num(energy)}`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? 'meter-cell on' : 'meter-cell'} />
      ))}
    </span>
  )
}

/** §4.1. Degrees, not notes: a template authors `i`, and a key is chosen per guide. */
export function ProgressionTable({ harmony }: { harmony: Harmony }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Degree</th>
            <th scope="col" className="numeric">
              Bars
            </th>
          </tr>
        </thead>
        <tbody>
          {harmony.progression.map((step, i) => (
            <tr key={`${step.degree}-${i}`}>
              <td className="mono">{step.degree}</td>
              <td className="mono numeric">{num(step.bars)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** §4.2. The sections, in order, with the energy that picks each part's density band (§6.3). */
export function SectionTable({ structure }: { structure: readonly Section[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col" className="numeric">
              Bars
            </th>
            <th scope="col">Energy</th>
          </tr>
        </thead>
        <tbody>
          {structure.map((section) => (
            <tr key={section.name}>
              <td>{section.name}</td>
              <td className="mono numeric">{num(section.bars)}</td>
              <td>
                <EnergyMeter energy={section.energy} />{' '}
                <span className="mono quiet">{num(section.energy)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
