import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Soft Orchestra slow changes**: a top line that stays on one note while the harmony
 * moves under it, then moves once, by step, and suspends the last chord.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * string ensemble; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## Why it is a `lead` and not a `pad`
 *
 * The definition filed this under the pad, and `RiffSchema` refuses a riff on that role: a pad
 * is held rather than struck (`NON_PATTERN_BEARING_ROLES`) and has no grid to riff on. What the
 * definition wrote is the top voice of the pad, a line with a common tone and a suspension,
 * and that is a `lead` at `soft` over the chord table.
 *
 * ## Why the figure is bars 5 to 8
 *
 * Four chords at two bars each, and the grid tops out at 64 steps. The first half of the cycle
 * is one note held across two chords, which is the common tone the technique is about and is
 * two words on a page. The second half is where the line moves and where its one rule lives:
 * the suspended dominant resolves to a raised seventh, and the natural one is forbidden over it
 * as data. So the figure is the second half, and the common tone is the technique's first
 * paragraph.
 *
 * ## The one raised note
 *
 * G minor's seventh is `F`. The suspended D chord resolves to `F#`, `alter: 1` on degree 7, and
 * the natural F sounding over that chord is a minor third against the resolution. The rule
 * forbids the natural spelling; the raised one is what the figure plays.
 */
export const softOrchestraSlowChanges: Riff = {
  id: 'soft-orchestra-slow-changes',
  name: 'The Soft Orchestra slow changes',
  reference: { kind: 'patch', name: 'Soft Orchestra' },
  bpm: { min: 56, max: 74, default: 64 },
  key: 'G minor',
  technique: [
    'The top note stays on D through the first two chords while the harmony moves underneath ' +
      'it. That common tone is the whole device: the pad does the work and the right hand ' +
      'barely moves.',
    'Bars 5 to 8 of the cycle, over the C minor seventh and the suspended D. The D is still ' +
      'sounding when the figure starts; it has been there since bar one.',
    'Over the C minor chord, hold the D and step down to C late, on beat three of the second ' +
      'bar. Let the C ring into the next chord, where it is the seventh.',
    'Over the suspended D, enter on G two beats in and resolve it down to F# on beat three of ' +
      'the last bar. Hold the F# across the bar line; the next pass opens on G and the F# ' +
      'wants it.',
    'Never play F natural while the suspended D is sounding. It is a minor third against the ' +
      'F# the suspension resolves to.',
    'Every note sustains past the chord change under it. Nothing in this line is released ' +
      'before the next chord has arrived.',
  ],
  request: {
    id: 'soft-orchestra-slow-changes',
    role: 'lead',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  figureStartsAtBar: 5,
  /**
   * §5A/#554. The natural seventh over the suspended dominant, as data. The `F#` the figure
   * plays is the same degree with `alter: 1`. No offset: the D that opens the figure is a tie
   * from the chord before, and the definition asked for none.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V7sus4',
        degree: 7,
        reason: 'the natural seventh is a minor third against the raised one the suspension resolves to',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'V7sus4', bars: 2 },
    ],
  },
  /**
   * Four bars: two over `iv`, two over `V7sus4`. `baseOctave: 4` puts `G4` at degree 1, so the
   * held D is `D5`. The C runs into the suspended chord and the F# runs past the figure, which
   * is the last paragraph as data.
   */
  hook: {
    id: 'soft-orchestra-slow-changes-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `iv` runs bars 5-6, figure steps 1-32. D5 from the first step, tied from the chord
      // before; C5 on beat three of bar 6, held into the `V7sus4`.
      { step: 1, degree: 5, octave: 0, len: 24 },
      { step: 25, degree: 4, octave: 0, len: 16 },
      // `V7sus4` runs bars 7-8, figure steps 33-64. G4 two beats in; F#4 on beat three of the
      // last bar, held past the figure.
      { step: 41, degree: 1, octave: 0, len: 16 },
      { step: 57, degree: 7, octave: -1, len: 12, alter: 1 },
    ],
  },
  pattern: variant(
    'soft-orchestra-slow-changes-grid',
    'lead',
    0,
    64,
    at('accent', 64, 1),
    on('downbeat', 25, 41, 57),
  ),
}
