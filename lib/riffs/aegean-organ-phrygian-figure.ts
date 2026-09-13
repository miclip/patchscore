import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Aegean Organ Phrygian figure**: a line in D phrygian whose whole discipline is one
 * pitch class it never plays.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * organ; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## The one forbidden note, and why it is forbidden on every chord
 *
 * D phrygian's second is `Eb`, and the mode rests on it. `E` natural is the raised second, and
 * one of them anywhere collapses the mode into D minor. The original definition forbade it
 * over two chords and then said *never play E natural* in prose; here it is forbidden as data
 * over every chord of the cycle, so the sentence is checked rather than hoped for.
 *
 * The chord on the flat second is written `II`, the mode's own second, unaltered (#569). A `b`
 * in front of it would be measuring the chord against a major scale the piece is not in, and
 * the rule's `alter: 1` is then the one accidental on the page, on the note it forbids.
 *
 * ## Why the last chord is the minor seventh degree
 *
 * The definition's fourth chord was C major, and its line over it opened on E natural: the
 * chord's own third, and the pitch class the piece forbids. D phrygian has no E, so the chord
 * built on its seventh degree is C *minor*, `vii`, and the line over it falls from the chord's
 * third, Eb, to its ninth, D. That keeps the gesture the definition wrote and keeps the mode.
 *
 * ## Why the figure is bars 5 to 8
 *
 * Four chords at two bars each, and a riff's grid tops out at 64 steps (`PATTERN_LENGTHS`). The
 * second half is where the line moves most: the neighbour figure D Eb D over the returning `i`,
 * then Eb falling to D over the `vii`. Both are the semitone the mode is named for. The first
 * half is on the page in `harmony`, and the technique says what to do over it.
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
    'One forbidden pitch class across the whole piece, which makes this the easiest of the set ' +
      'to internalise: never play E natural. The Eb is the mode, on every chord, and one E ' +
      'collapses it into ordinary D minor.',
    'Over the D minor chord, touch the Eb and come back: D, up a semitone, down again. That ' +
      'neighbour is the sound of the mode, and it is the only ornament the line has.',
    'Over the C minor chord, fall from Eb to D, a semitone again. The Eb is the chord’s third ' +
      'and the D is its ninth, so the fall lands on a tension and stays there.',
    'Enter late, a beat or more into each chord. The organ has no attack to speak of, so the ' +
      'entry is heard as the note arriving, and it should arrive after the chord has.',
    'Over the first half of the cycle, do the same kind of thing with the same notes: F ' +
      'falling to Eb over the opening D minor, then a held G over the Eb major. Every move is ' +
      'a step or a semitone.',
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
   * §5A/#554. E natural is degree 2 raised. Forbidden over every chord, because the sentence
   * in the technique is *never*, and a rule on two chords would leave the third to prose.
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
      {
        chord: 'vii',
        degree: 2,
        alter: 1,
        reason: 'the mode has no E, and the chord on its seventh degree is minor for that reason',
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
      // `vii` runs bars 7-8, figure steps 33-64. Eb5 two beats in, falling to D5 in the last bar.
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
