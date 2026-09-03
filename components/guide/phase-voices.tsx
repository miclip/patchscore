import {
  shortfallsOfKind,
  type Device,
  type DeviceId,
  type RequestId,
  type ResolveResult,
  type ResolvedAssignment,
  type Shortfall,
} from '@/lib/core'
import { searchCapNotice } from '@/lib/core'
import { placementRow } from '../placement-controls'
import { PlacementControl } from './placement-control'
import { adviceText, count, isStacked, num, refusalText, voicesLabel } from './format'

/** §3.5. Why this recipe, in the one case where the answer is not "it matched". */
function recipeWhy(a: ResolvedAssignment) {
  if (a.recipe.outcome === 'exact') {
    return (
      <>
        exact <span className="mono">{a.character}</span>
      </>
    )
  }
  return (
    <>
      substituted — asked <span className="mono">{a.character}</span>, authored{' '}
      <span className="mono">{a.recipe.character}</span>
    </>
  )
}

/**
 * §12.4. What the reader is being asked to play, when that is more than one note. Empty for a
 * one-note part: the realisation makes no difference there, and a clause saying so on every
 * kick would bury the one case that matters.
 *
 * Written out by hand rather than imported from the Markdown renderer, which is the rule for
 * everything in this tree: the two renderers share no code path, so a fact appears in both only
 * because someone put it in both, in the same words.
 */
function realisationText(a: ResolvedAssignment): string {
  if (a.notes <= 1) return ''
  if (isStacked(a)) {
    return `${count(a.notes, 'note')} stacked one per voice`
  }
  if (a.recipe.realisation === 'sampled-chord') {
    return `${count(a.notes, 'note')} from one sampled chord`
  }
  return `${count(a.notes, 'note')} at once on one polyphonic voice`
}

/**
 * §8 phase 2, and the gaps of §7.3.
 *
 * The first heading is **Gaps**, matching the Markdown renderer and saying what the section is.
 * It was briefly "Advice", which was a misreading: the instruction was that a gap should *read*
 * as advice rather than as an error — a line naming the voice that could carry the part is
 * useful, the same fact in a red error box is discouraging and wrong. That is the tone of the
 * lines, not the name of the section. A reader who has to ask what "Advice" means has been told
 * nothing, and softening the word is the opposite of invariant 5's honesty.
 *
 * §7.5/#340 adds a fourth heading above the three, and it is deliberately not one of them: a
 * refused placement is not an absence at all — the part is in the list above it, on the box the
 * ranking chose. Omitted entirely when nothing was refused, which is every guide that placed
 * nothing.
 *
 * **Three headings since #81**, because `Gaps` was carrying three unrelated situations and a
 * reader could not tell which one a line was. What is under `Gaps` now is only the kind the
 * word is honest about: this rig cannot make this part. An unwritten recipe is ours to fix and
 * says so, and a part the direction never needed is not an absence at all.
 */
export function PhaseVoices({
  result,
  deviceById,
  onPlacement,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
  /**
   * §7.5/#340 phase 2. Move one part onto a box, or `undefined` to hand it back to §7.1.
   *
   * Optional, and where it is absent no control is drawn rather than one drawn and inert. The
   * device pages and the fixtures render a guide with no session behind it, and a menu there
   * would offer a choice nothing could carry — `Rack` takes `onClockSource` the same way and
   * for the same reason.
   */
  onPlacement?: ((requestId: RequestId, deviceId: DeviceId | undefined) => void) | undefined
}) {
  const sectionCount = result.template.structure.length
  // §7.3/#81. Three lists, so the reader is never left working out which of the three kinds of
  // absence a line is: the rig cannot, we have not, or the direction does not need it.
  const limits = shortfallsOfKind(result.shortfalls, 'rig-limit')
  const unauthored = shortfallsOfKind(result.shortfalls, 'unauthored')
  const notNeeded = shortfallsOfKind(result.shortfalls, 'not-needed')

  /**
   * §7.1/#228. Here, because this is the phase the cap affected: a capped search returns a
   * different *allocation*, and this is where the guide says which box carries what.
   *
   * `searchCapNotice` decides the words in `lib/core`, so this view and the Markdown guide cannot
   * drift into saying different things about the same fact (#33).
   */
  const capped = searchCapNotice(result.search)

  return (
    <>
      {capped === undefined ? null : (
        <div className="search-capped" role="note">
          <p className="search-capped-headline">{capped.headline}</p>
          {capped.detail.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {result.assignments.length === 0 ? (
        <p className="quiet">
          No parts assigned. Every part this direction asks for is accounted for below.
        </p>
      ) : (
        <ul className="parts">
          {result.assignments.map((a) => (
            <li key={a.requestId}>
              <div className="part-head">
                <span className="role mono">{a.role}</span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
                <span className="where">
                  {a.deviceName} · {voicesLabel(a)}
                </span>
                <span className="recipe-title">{a.recipe.title}</span>
              </div>
              <p className="subordinate">
                p{num(a.priority)}
                {a.optional ? ', optional' : ''} · {recipeWhy(a)}
                {realisationText(a) === '' ? null : ` · ${realisationText(a)}`} ·{' '}
                {a.sections.length === sectionCount ? 'every section' : a.sections.join(', ')}
              </p>
              {onPlacement === undefined ? null : (
                <PlacementControl
                  row={placementRow(result, a.requestId, deviceById)}
                  role={a.role}
                  onPlacement={onPlacement}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {result.placements.refused.length === 0 ? null : (
        <>
          <h4>Placements not applied</h4>
          <p className="quiet">
            You asked for these parts on a particular box. Each line says why the guide could not
            do it — the part itself is where the ranking put it, unless a gap below says otherwise.
          </p>
          <ul className="advice">
            {result.placements.refused.map((one) => (
              <li key={`${one.requestId}\u0000${one.deviceId}`}>
                <span className="role mono">{one.requestId}</span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
                <span className="mono quiet">{one.deviceId}</span>
                <span className="advice-text">{refusalText(one)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4>Gaps</h4>
      {limits.length === 0 ? (
        <p className="quiet">None.</p>
      ) : (
        <>
          <p className="quiet">
            This rig cannot make these parts. They are not in the guide below, and each line says
            what would close it.
          </p>
          <ShortfallList
            shortfalls={limits}
            sentence={(gap) => adviceText(gap, deviceById)}
          />
        </>
      )}

      {unauthored.length === 0 ? null : (
        <>
          <h4>Waiting on us</h4>
          <p className="quiet">
            Your rig can make these. Nobody has written the recipe yet, so they are not in the
            guide below — that is our backlog, not a limit of your boxes.
          </p>
          <ShortfallList
            shortfalls={unauthored}
            sentence={(gap) => adviceText(gap, deviceById)}
          />
        </>
      )}

      {notNeeded.length === 0 ? null : (
        <>
          <h4>Not needed for this direction</h4>
          <p className="quiet">{result.template.name} is finished without these.</p>
          <ShortfallList shortfalls={notNeeded} sentence={(gap) => gap.rationale} />
        </>
      )}
    </>
  )
}

/**
 * The same five facts in the same order under all three headings, so what separates the sections
 * is the heading and the sentence. Reuses `.advice` and `.role`, which #21 already sized for
 * 390px — a fourth list style would be a fourth thing to verify at that width for no gain.
 */
function ShortfallList<T extends Shortfall>({
  shortfalls,
  sentence,
}: {
  shortfalls: readonly T[]
  sentence: (shortfall: T) => string
}) {
  return (
    <ul className="advice">
      {shortfalls.map((shortfall) => (
        <li key={shortfall.requestId}>
          <span className="role mono">{shortfall.role}</span>
          <span className="mono quiet">{shortfall.character}</span>
          <span className="quiet">p{num(shortfall.priority)}</span>
          <span className="advice-text">{sentence(shortfall)}</span>
        </li>
      ))}
    </ul>
  )
}
