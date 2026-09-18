import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Terror Bass flat-two cadence line**: three bars of a bass line over E minor, a
 * fourth over the F major a semitone above it, and the one note that lands on a beat in the
 * whole fourth bar is the `E` the `F` falls to.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is the bass; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## The flat two is a cadence, and the figure is what it resolves
 *
 * E phrygian's second degree is `F`, a semitone above the root, and the chord built on it is F
 * major. #624's figure treated that semitone as an ornament: the root in eighths with the `F`
 * arriving earlier each bar, thirty-one notes on two pitches. This replaces it (#643). Here the
 * `F` is where the harmony goes, for a whole bar, and the point of the bar is how it comes
 * back: `F3` on beat three, `E3` on beat four, a semitone down onto a beat. Everything before
 * that is a bass line moving through the E minor chord so the ear has somewhere to be pulled
 * from.
 *
 * ## Timing
 *
 * Every bar strikes the one, the "and" of two and beat three. Bars one to three strike the
 * "and" of four; bar four strikes beat four instead. The one note that moves onto a beat is
 * the arrival, and it is the only beat-four strike in the figure.
 *
 * ## One note at a time, by construction
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; a bass uses one,
 * and `bass-mid / hard` there is a mono recipe (#632).
 *
 * ## The harmony is context, and the semitone is the mode's own
 *
 * `i` for three bars and `bII` for the fourth, in E phrygian. Over the E minor the line is
 * chord tones and the mode's seventh and fourth: `E2 B2 E3 D3`, `E2 G2 B2 A2`, `E2 E3 D3 B2`.
 * Over the F it is `F2 C3 F3`, root, fifth, octave, and then the `E3`, which is the major
 * seventh of the F for one beat and the root of the E minor the moment the pass comes round.
 *
 * ## Why the raised second is forbidden
 *
 * Raise the `F` to `F#` and the mode is plain E minor, and the fourth bar has nothing to fall
 * from. `F#` is not in E phrygian, so the rule reaches the whole piece (§5A.8), and neither
 * chord of the cycle carries it.
 */
export const terrorBassFlatTwoCadenceLine: Riff = {
  id: 'terror-bass-flat-two-cadence-line',
  name: 'The Terror Bass flat-two cadence line',
  reference: { kind: 'patch', name: 'Terror Bass' },
  bpm: { min: 120, max: 140, default: 130 },
  key: 'E phrygian',
  technique: [
    'Three bars of E minor, one bar of F major, and the F is a semitone above the E. The ' +
      'figure is the fall from the F back to the E, and everything before it is there so the ' +
      'fall has something to fall from.',
    'Bar one: E, B, the E above, D. Bar two: E, G, B, A. Bar three: E, the E above, D, B. Each ' +
      'bar strikes the one, the "and" of two, beat three and the "and" of four, and every ' +
      'note is a tone of the E minor or the step next to one.',
    'Bar four is the F: F, the C above it, the F above that, and then E on beat four. The E ' +
      'is on the beat, not the "and", and it is the only note in the figure that lands on ' +
      'beat four. Hold it to the bar line and let the next pass restrike the low E under it.',
    'The bar head is the loudest note in bars one to three. In bar four the loudest is the E ' +
      'on beat four. Play the F above it as the note that gives way, and the E as the note ' +
      'that takes over.',
    'Hold each note to the next strike. The line is legato; the one place it should feel ' +
      'like a step and not a slide is the F to the E, and that comes from the accent, not a ' +
      'gap.',
    'Never play F sharp. Raise the second and this is E minor, and the fourth bar has ' +
      'nowhere to fall from.',
  ],
  request: {
    id: 'terror-bass-flat-two-cadence-line',
    role: 'bass-mid',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised second as data, over the `i`, and reaching the whole piece because the
   * mode does not have it. Every chord is entered on its bar head, so there is no offset to
   * state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 2,
        alter: 1,
        reason: 'the raised second turns the phrygian semitone into a minor scale, and the fourth bar has nowhere to fall from',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 3 },
      { degree: 'bII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `E2` at degree 1; the line runs
   * from `E2` to `F3`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes. Bars one to three strike steps 1, 7, 9 and 15 of the bar, held
   * six, two, six and two. Bar four strikes 1, 7, 9 and 13: six, two, four and four.
   */
  hook: {
    id: 'terror-bass-flat-two-cadence-line-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // Bar 1, `i`: E2, B2, E3, D3.
      { step: 1, degree: 1, octave: 0, len: 6 },
      { step: 7, degree: 5, octave: 0, len: 2 },
      { step: 9, degree: 1, octave: 1, len: 6 },
      { step: 15, degree: 7, octave: 0, len: 2 },
      // Bar 2, `i`: E2, G2, B2, A2.
      { step: 17, degree: 1, octave: 0, len: 6 },
      { step: 23, degree: 3, octave: 0, len: 2 },
      { step: 25, degree: 5, octave: 0, len: 6 },
      { step: 31, degree: 4, octave: 0, len: 2 },
      // Bar 3, `i`: E2, E3, D3, B2.
      { step: 33, degree: 1, octave: 0, len: 6 },
      { step: 39, degree: 1, octave: 1, len: 2 },
      { step: 41, degree: 7, octave: 0, len: 6 },
      { step: 47, degree: 5, octave: 0, len: 2 },
      // Bar 4, `bII`: F2, C3, F3, and E3 on beat four.
      { step: 49, degree: 2, octave: 0, len: 6 },
      { step: 55, degree: 6, octave: 0, len: 2 },
      { step: 57, degree: 2, octave: 1, len: 4 },
      { step: 61, degree: 1, octave: 1, len: 4 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. Bar heads at 118, the arrival on beat four of bar
   * four at 120, beat three as a downbeat, the "and"s as offbeats.
   */
  pattern: variant(
    'terror-bass-flat-two-cadence-line-grid',
    'bass-mid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 120, 61),
    on('downbeat', 9, 25, 41, 57),
    on('offbeat', 7, 15, 23, 31, 39, 47, 55),
  ),
}
