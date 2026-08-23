import type { ResolveResult } from '@/lib/core'
import { num } from './format'

/** A ten-cell meter. Integer cells from a fraction, so no float ever reaches the page. */
function EnergyMeter({ energy }: { energy: number }) {
  const filled = Math.round(energy * 10)
  return (
    <span className="meter" role="img" aria-label={`energy ${num(energy)}`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? 'meter-cell on' : 'meter-cell'} />
      ))}
    </span>
  )
}

/** §8 phase 1. BPM, key, hook harmony, and the bar-count energy map. */
export function PhaseSong({ result }: { result: ResolveResult }) {
  const { template, song } = result
  const others = song.keys.filter((k) => k !== song.key)
  const totalBars = template.structure.reduce((sum, s) => sum + s.bars, 0)

  return (
    <>
      <dl className="facts">
        <div>
          <dt>BPM</dt>
          <dd>
            <span className="mono">{num(song.bpm)}</span>{' '}
            <span className="quiet">
              template range <span className="mono">{num(template.bpm.min)}…{num(template.bpm.max)}</span>
            </span>
          </dd>
        </div>
        <div>
          <dt>Key</dt>
          <dd>
            {song.key === undefined ? (
              // Reported, never guessed (§4.1 / invariant 5).
              <span className="quiet">this template has none, so the hooks have no notes</span>
            ) : (
              <>
                <span className="mono">{song.key}</span>
                {others.length === 0 ? null : (
                  <span className="quiet"> a reroll may pick {others.join(', ')}</span>
                )}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Harmonic cycle</dt>
          <dd>
            <span className="mono">{num(template.harmony.cycleBars)}</span>{' '}
            <span className="quiet">bars</span>
          </dd>
        </div>
      </dl>

      <h4>Progression</h4>
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
            {template.harmony.progression.map((step, i) => (
              <tr key={`${step.degree}-${i}`}>
                <td className="mono">{step.degree}</td>
                <td className="mono numeric">{num(step.bars)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>
        Arrangement <span className="quiet">{num(totalBars)} bars total</span>
      </h4>
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
            {template.structure.map((section) => (
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
    </>
  )
}
