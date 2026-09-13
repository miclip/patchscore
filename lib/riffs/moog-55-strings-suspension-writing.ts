import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Moog 55 Strings suspension writing**: a top line over suspended chords, moving by
 * step, resolving each suspension in the second bar of its chord and never the first.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * string ensemble; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## Why it is a `lead` and not a `pad`
 *
 * The original definition filed this under the pad. A `pad` is held rather than struck
 * (`NON_PATTERN_BEARING_ROLES`), so `RiffSchema` refuses a riff on it: there is no grid for the
 * figure to be played on. What the definition actually wrote is the top voice of the pad, one
 * line with entries and resolutions, and that is a `lead` at `soft`. The pad it sits on is the
 * chord table.
 *
 * ## The rule that stays prose, and why
 *
 * The definition's rule was *the third must not appear until the suspension resolves*, and it
 * resolves in the second bar of each two-bar chord. That is a rule with an *until* in it, and
 * a `ForbiddenDegree` holds for the whole of a chord: written as data over the `I`, it would
 * refuse the E that resolves the suspension, which is the note the figure exists to land. A
 * first version split each chord into a suspended bar and a resolved bar so the rule could be
 * data over one and not the other; that put labels in the progression the definition did not
 * write, and #569 keeps progressions to root-only numerals with the extensions in prose, as
 * Muse Runner does. So the progression is the definition's `I IV vi V` at two bars each, the
 * withheld third is the technique's fifth paragraph, and the one rule in `constraints` is the
 * two-beat entry. What the data cannot say, `test/riff.test.ts` asserts on this entry instead:
 * each resolution lands in the second bar of its chord.
 */
export const moog55StringsSuspensionWriting: Riff = {
  id: 'moog-55-strings-suspension-writing',
  name: 'The Moog 55 Strings suspension writing',
  reference: { kind: 'patch', name: 'Moog 55 Strings' },
  bpm: { min: 52, max: 70, default: 60 },
  key: 'C major',
  technique: [
    'Bars 1 to 4 of the cycle, over the two suspended chords. Each one holds its suspension for ' +
      'a bar and resolves in the second, and the line does the same.',
    'Inside each chord, every move is a step. The D over the first chord steps up to E; the G ' +
      'over the second steps up to A. Nothing leaps.',
    'The suspension resolves inside the second bar of each chord, never the first. That is what ' +
      'makes eight bars feel like they are still arriving: the third is withheld for a bar and ' +
      'then given.',
    'Enter two beats late. The pad has already moved when the line comes in, and the wait is ' +
      'what makes a held string note sound placed.',
    'Never play E while the first chord is still suspended, and never A while the second is. ' +
      'Each is the third the suspension is withholding, and playing it early gives the ' +
      'resolution away.',
    'Over the last two chords, hold one note each, two beats late and a step apart: B over the ' +
      'A minor seventh, then C over the suspended G. The line barely moves and the harmony ' +
      'does the work.',
    'Slow attack, slow release. Every note should still be swelling when the next chord ' +
      'arrives under it.',
  ],
  request: {
    id: 'moog-55-strings-suspension-writing',
    role: 'lead',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  figureStartsAtBar: 1,
  /**
   * §5A/#554. The two-beat entry as data. The withheld third is prose, and the header says why.
   */
  constraints: {
    onsetOffset: {
      minSteps: 8,
      reason: 'the pad moves first and the line arrives after it',
    },
  },
  /**
   * §5A/§4.1. The definition's four chords at two bars each. The suspensions and the sixth on
   * the dominant are extensions, and extensions are prose (#569).
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Four bars over the two suspensions. `baseOctave: 4` puts `C4` at degree 1, so the line is
   * the octave above middle C. Each resolution lands on beat three of its chord's second bar and
   * runs into the next chord, which is the seventh paragraph as data.
   */
  hook: {
    id: 'moog-55-strings-suspension-writing-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`, suspended: D5, the second, two beats in. E5, the resolution, on beat three of the
      // second bar, held into the next chord.
      { step: 9, degree: 2, octave: 1, len: 16 },
      { step: 25, degree: 3, octave: 1, len: 16 },
      // `IV`, suspended: G5, its second, two beats in. A5, the resolution, on beat three of the
      // second bar, held past the figure into the `vi`.
      { step: 41, degree: 5, octave: 1, len: 16 },
      { step: 57, degree: 6, octave: 1, len: 12 },
    ],
  },
  pattern: variant(
    'moog-55-strings-suspension-writing-grid',
    'lead',
    0,
    64,
    at('accent', 72, 9),
    on('downbeat', 25, 41, 57),
  ),
}
