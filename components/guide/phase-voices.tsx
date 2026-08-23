import type { Device, DeviceId, ResolveResult, ResolvedAssignment } from '@/lib/core'
import { adviceText, count, num } from './format'

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
  if (a.recipe.realisation === 'sampled-chord') {
    return `${count(a.notes, 'note')} from one sampled chord`
  }
  return `${count(a.notes, 'note')} at once on one polyphonic voice`
}

/**
 * §8 phase 2, and the gaps of §7.3.
 *
 * The heading is **Gaps**, matching the Markdown renderer and saying what the section is. It
 * was briefly "Advice", which was a misreading: the instruction was that a gap should *read*
 * as advice rather than as an error — a `no-recipe` gap naming the voice that could carry the
 * part is useful, the same fact in a red error box is discouraging and wrong. That is the tone
 * of the lines, not the name of the section. A reader who has to ask what "Advice" means has
 * been told nothing, and softening the word is the opposite of invariant 5's honesty.
 */
export function PhaseVoices({
  result,
  deviceById,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
}) {
  const sectionCount = result.template.structure.length

  return (
    <>
      {result.assignments.length === 0 ? (
        <p className="quiet">No parts assigned. Every one is listed under Gaps.</p>
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
                  {a.deviceName} · {a.assignable.label}
                </span>
                <span className="recipe-title">{a.recipe.title}</span>
              </div>
              <p className="subordinate">
                p{num(a.priority)}
                {a.optional ? ', optional' : ''} · {recipeWhy(a)}
                {realisationText(a) === '' ? null : ` · ${realisationText(a)}`} ·{' '}
                {a.sections.length === sectionCount ? 'every section' : a.sections.join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h4>Gaps</h4>
      {result.gaps.length === 0 ? (
        <p className="quiet">None.</p>
      ) : (
        <>
          <p className="quiet">
            These parts are not in the guide below. Each line says what would close it.
          </p>
          <ul className="advice">
            {result.gaps.map((gap) => (
              <li key={gap.requestId}>
                <span className="role mono">{gap.role}</span>
                <span className="mono quiet">{gap.character}</span>
                <span className="quiet">
                  p{num(gap.priority)}
                  {gap.optional ? ', optional' : ''}
                </span>
                <span className="advice-text">{adviceText(gap, deviceById)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
