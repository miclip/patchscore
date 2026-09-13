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
 * ## Why the suspensions resolve in the harmony
 *
 * The rule the definition wrote was *the third must not appear until the suspension resolves*,
 * and it resolves in the second bar of each two-bar chord. A rule with a *until* in it is not
 * a `ForbiddenDegree`, which holds for the whole of a chord. So the chord is split where the
 * rule changes: `Isus2` for a bar, then `I`; `IVsus2` for a bar, then `IV`. The third is
 * forbidden over the suspended bar as data, and legal over the resolved one, which is exactly
 * what the sentence said. The pad player reads the same split off the table.
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
   * §5A/#554. The withheld third over each suspended bar, and the two-beat entry, as data.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'Isus2',
        degree: 3,
        reason: 'the third must not sound until the suspension resolves, and it resolves in the second bar',
      },
      {
        chord: 'IVsus2',
        degree: 6,
        reason: 'the same rule one chord later: the third of the chord waits for the resolution',
      },
    ],
    onsetOffset: {
      minSteps: 8,
      reason: 'the pad moves first and the line arrives after it',
    },
  },
  /**
   * §5A/§4.1. Each suspended chord is written as its suspended bar and then its resolved bar,
   * so the rule above can hold for one and not the other. See the header.
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'Isus2', bars: 1 },
      { degree: 'I', bars: 1 },
      { degree: 'IVsus2', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'vi', bars: 2 },
      { degree: 'V6sus4', bars: 2 },
    ],
  },
  /**
   * Four bars over the two suspensions. `baseOctave: 4` puts `C4` at degree 1, so the line is
   * the octave above middle C. Each resolution lands on beat three of the resolved bar and
   * runs into the next chord, which is the seventh paragraph as data.
   */
  hook: {
    id: 'moog-55-strings-suspension-writing-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `Isus2`: D5, the suspended second, two beats in.
      { step: 9, degree: 2, octave: 1, len: 16 },
      // `I`: E5, the resolution, on beat three of the second bar, held into the next chord.
      { step: 25, degree: 3, octave: 1, len: 16 },
      // `IVsus2`: G5, the suspended second of the chord, two beats in.
      { step: 41, degree: 5, octave: 1, len: 16 },
      // `IV`: A5, the resolution, on beat three, held past the figure into the `vi`.
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
