import type { ResolveResult } from '@/lib/core'
import { num } from './format'
import { ProgressionTable, SectionTable } from './song-tables'

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
      <ProgressionTable harmony={template.harmony} />

      <h4>
        Arrangement <span className="quiet">{num(totalBars)} bars total</span>
      </h4>
      <SectionTable structure={template.structure} />
    </>
  )
}
