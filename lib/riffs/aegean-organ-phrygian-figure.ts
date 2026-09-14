import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Aegean Organ Phrygian figure**: a line in D phrygian whose whole discipline is one
 * pitch class it never plays.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * organ; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## The one forbidden note
 *
 * D phrygian's second is `Eb`, and the mode rests on it. `E` natural is the raised second,
 * `degree: 2, alter: 1`, and one of them collapses the mode into D minor: against the D it is
 * the natural second the mode does not have, and against the Eb it is a semitone off the root.
 * Both are forbidden as data. A raised degree is a pitch the key does not have, so the rule
 * reaches the whole piece, every chord of the cycle and every note over them, and the two
 * chords named are the ones the reasons are about (#605).
 *
 * The chord on the flat second is written `II`, the mode's own second, unaltered (#569). A `b`
 * in front of it would be measuring the chord against a major scale the piece is not in, and
 * the rule's `alter: 1` is then the one accidental on the page, on the note it forbids.
 *
 * ## Why the last chord is C minor
 *
 * The definition first wrote the fourth chord as C major, whose third is the E the same entry
 * forbids, and the operator corrected it to C minor (#605): `vii`, `C · Eb · G`, the chord the
 * mode builds on its seventh degree. The line over it is Eb falling to D, the chord's third to
 * its ninth. The figure as a whole is #604's, and only the chord, the note over it and the
 * prose that named the exception changed here.
 *
 * ## Why the figure is bars 5 to 8
 *
 * Four chords at two bars each, and a riff's grid tops out at 64 steps (`PATTERN_LENGTHS`). The
 * second half is where the line moves most: the neighbour figure D Eb D over the returning
 * `i`, then Eb falling to D over the `vii`. The first half is on the page in `harmony`, and the
 * technique says what to do over it.
 */
export const aegeanOrganPhrygianFigure: Riff = {
  id: 'aegean-organ-phrygian-figure',
  name: 'The Aegean Organ Phrygian figure',
  reference: { kind: 'patch', name: 'Aegean Organ' },
  bpm: { min: 68, max: 88, default: 76 },
  key: 'D phrygian',
  technique: [
    'Bars 5 to 8 of the cycle, over the return to the D minor chord and the C minor after it. ' +
      'The first half of the cycle is the same mode with less motion.',
    'One pitch class to watch across the whole piece: E natural. Never play it while the D ' +
      'minor or the Eb major is sounding. The Eb is the mode, and one E over either of those ' +
      'chords collapses it into ordinary D minor.',
    'Over the D minor chord, touch the Eb and come back: D, up a semitone, down again. That ' +
      'neighbour is the sound of the mode, and it is the only ornament the line has.',
    'Enter late, a beat or more into each chord. The organ has no attack to speak of, so the ' +
      'entry is heard as the note arriving, and it should arrive after the chord has.',
  ],
  request: {
    id: 'aegean-organ-phrygian-figure',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  figureStartsAtBar: 5,
  /**
   * §5A/#554. E natural is degree 2 raised. A raised degree is forbidden across the piece
   * (#605), and the two chords are the ones each reason is about. See the header.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 2,
        alter: 1,
        reason: 'the raised second destroys the flat second the mode rests on',
      },
      {
        chord: 'II',
        degree: 2,
        alter: 1,
        reason: 'the same pitch class, a direct semitone against the chord’s root',
      },
    ],
    onsetOffset: {
      minSteps: 4,
      reason: 'the organ has no attack and the note should arrive after the chord has',
    },
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'II', bars: 2 },
      { degree: 'i', bars: 2 },
      { degree: 'vii', bars: 2 },
    ],
  },
  /**
   * Four bars: two over the returning `i`, two over the `vii`. `baseOctave: 4` puts `D4` at
   * degree 1, so the line is `D5` and its neighbours. The third D runs into the `vii`, where
   * it is the ninth.
   */
  hook: {
    id: 'aegean-organ-phrygian-figure-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i` runs bars 5-6, figure steps 1-32. D5 two beats in, up to Eb5 on the next bar head,
      // back to D5 on its beat three and held into the `vii`.
      { step: 9, degree: 1, octave: 1, len: 8 },
      { step: 17, degree: 2, octave: 1, len: 8 },
      { step: 25, degree: 1, octave: 1, len: 16 },
      // `vii` runs bars 7-8, figure steps 33-64. Eb5, the chord's third, two beats in, falling
      // to D5 in the last bar.
      { step: 41, degree: 2, octave: 1, len: 12 },
      { step: 53, degree: 1, octave: 1, len: 12 },
    ],
  },
  pattern: variant(
    'aegean-organ-phrygian-figure-grid',
    'lead',
    0,
    64,
    at('accent', 88, 9),
    on('downbeat', 17, 25, 41, 53),
  ),
}
