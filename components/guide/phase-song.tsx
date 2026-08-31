import type { ResolveResult } from '@/lib/core'
import { arrangement, songFindings } from '@/lib/core'
import { num } from './format'
import { ArrangementGrid, ProgressionTable } from './song-tables'

/**
 * §8 phase 1. BPM, key, hook harmony, and the bar-count energy map.
 *
 * #161. Two of these three facts can now come from the reader rather than from the direction,
 * and the difference is worth ink: `a reroll may pick F minor` is false of a key they chose, and
 * a finding about the tempo belongs under the tempo rather than in a list at the foot of the
 * phase. Which finding is about which value is decided in `lib/core` (`songFindings`), like
 * every other derived fact both guides read — what is written twice here is the wording.
 */
export function PhaseSong({ result }: { result: ResolveResult }) {
  const { template, song } = result
  const others = song.keys.filter((k) => k !== song.key)
  const findings = songFindings(song)
  const plan = arrangement(result)

  return (
    <>
      <dl className="facts">
        <div>
          <dt>BPM</dt>
          <dd>
            <span className="mono">{num(song.bpm)}</span>{' '}
            <span className="quiet">
              {song.bpmSource === 'user' ? 'you set this; ' : null}
              template range <span className="mono">{num(template.bpm.min)}…{num(template.bpm.max)}</span>
            </span>
            {findings.bpm.map((note) => (
              <span className="song-finding" key={note}>
                {note}
              </span>
            ))}
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
                {song.keySource === 'user' ? (
                  <span className="quiet">
                    {' '}
                    you set this
                    {song.keys.length === 0 ? null : `; template offers ${song.keys.join(', ')}`}
                  </span>
                ) : others.length === 0 ? null : (
                  <span className="quiet"> a reroll may pick {others.join(', ')}</span>
                )}
              </>
            )}
            {findings.key.map((note) => (
              <span className="song-finding" key={note}>
                {note}
              </span>
            ))}
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
      <ProgressionTable harmony={template.harmony} />

      <h4>
        Arrangement <span className="quiet">{num(plan.totalBars)} bars total</span>
      </h4>
      <ArrangementGrid plan={plan} />
      {plan.uniform ? (
        <p className="quiet">
          Every part plays throughout. The movement is in the patterns and the energy.
        </p>
      ) : null}
    </>
  )
}
