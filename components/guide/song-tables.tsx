import type { Arrangement, Harmony, Section } from '@/lib/core'
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

/**
 * §4.2/#297. **Which parts play where, against sections drawn to their real length.**
 *
 * Replaces the bars-and-energy table in the guide, and keeps that table on the direction
 * catalogue — a direction page has a template and no rig, so it has sections and no parts. The
 * fact this adds is the one phase 2 buries: each part's sections are printed as the tail of a
 * dense bullet, and comparing twelve parts there means diffing twelve comma lists.
 *
 * **It fits the width; it does not scroll.** `CLAUDE.md` sanctions horizontal scrolling for wide
 * tables, and forbids it for the rack diagram, on the grounds that relative width was the point
 * and a cable cut off by the viewport is the thing the diagram exists to show. This grid is the
 * second case, not the first: a Drop twice the length of an Intro is the shape of the track, and
 * an Outro pushed off the right edge is the arrangement with its ending missing. So the columns
 * are percentages of the real bar count under `table-layout: fixed`, and the CSS gives each a
 * floor so nothing collapses at 390px. `table-scroll` stays around it for the case a floor cannot
 * save — a direction with a dozen sections on a narrow phone — where scrolling beats a smear.
 *
 * **A screen reader gets a sentence, not seventy-two cells.** Twelve parts across six sections is
 * 72 cells whose only content is filled-or-not, and reading them aloud is worse than useless. The
 * row header carries the whole answer — *plays throughout*, or the sections it does play — and the
 * cells are `aria-hidden`. That is also the more accurate reading: what a part does across a song
 * is one fact, not six.
 */
/**
 * Energy as one vertical tick rather than `EnergyMeter`'s ten cells.
 *
 * The meter is 78px wide. An arrangement column at 390px is nearer 40, so the established
 * vocabulary does not fit the space and shrinking its cells to 3px makes ten of them illegible
 * rather than small. One bar whose height is the value reads at a glance, costs 8px, and across
 * the header draws the energy curve of the whole track — which is the thing the number was
 * standing in for.
 *
 * The height is an integer percentage, so no float reaches the markup.
 */
function EnergyTick({ energy }: { energy: number }) {
  return (
    <span className="energy-tick" role="img" aria-label={`energy ${num(energy)}`}>
      <span style={{ height: `${String(Math.round(energy * 100))}%` }} />
    </span>
  )
}

export function ArrangementGrid({ plan }: { plan: Arrangement }) {
  // Percent of the real total, so a 32-bar Drop is twice a 16-bar Intro. `table-layout: fixed`
  // makes the browser honour them rather than sizing to content.
  const width = (bars: number): string =>
    `${String((bars / Math.max(1, plan.totalBars)) * 100)}%`

  return (
    <div className="table-scroll">
      <table className="arrangement">
        <colgroup>
          <col className="arrangement-label" />
          {plan.columns.map((column) => (
            <col key={column.name} style={{ width: width(column.bars) }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Part</span>
            </th>
            {plan.columns.map((column) => (
              <th scope="col" key={column.name}>
                <span className="arrangement-section">{column.name}</span>
                <span className="quiet mono arrangement-bars">{num(column.bars)}b</span>
                <EnergyTick energy={column.energy} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.rows.map((row) => (
            <tr key={row.requestId}>
              <th scope="row" className="mono">
                {row.role}
                <span className="sr-only">
                  {row.throughout
                    ? ' plays throughout'
                    : ` plays in ${plan.columns
                        .filter((_, i) => row.plays[i])
                        .map((c) => c.name)
                        .join(', ')}`}
                </span>
              </th>
              {row.plays.map((plays, i) => (
                <td
                  key={plan.columns[i]?.name ?? String(i)}
                  aria-hidden="true"
                  className={plays ? 'arrangement-on' : 'arrangement-off'}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
