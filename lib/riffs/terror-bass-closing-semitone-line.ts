import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Terror Bass closing-semitone line**: driving eighths on the root, and the note a
 * semitone above it arriving earlier every bar until it has taken the whole bar and the chord
 * has moved up to meet it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *terror*, and the figure
 * takes that at its word visibly: the oldest menace in the vocabulary is the semitone above the
 * root, and the oldest way to make it frightening is to bring it closer. So the line is the
 * root in unbroken eighths, and the semitone above it arrives on the last eighth of bar one,
 * the last two of bar two, the last four of bar three, and owns bar four outright — by which
 * point the harmony has moved up to it. The prose says what to play and nothing about what the
 * preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and no two share a step, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; a bass line uses
 * one, and the semitone is heard as a move and never as a clash held.
 *
 * ## The harmony is context, and the semitone is the mode's own
 *
 * `i` for three bars and `bII` for the fourth, in E phrygian. The mode is what makes the `F`
 * a note of the key rather than an accidental: the second degree of E phrygian is F natural,
 * and the chord built on it is F major, which is what bar four moves to. The line and the
 * chord arrive at the same place from opposite ends, the line by closing in over three bars
 * and the chord in one step.
 *
 * ## Why the raised second is forbidden
 *
 * Raise the `F` to `F#` and the mode is plain E minor, and the whole figure is a bass line
 * with a passing note in it. `F#` is not in E phrygian, so the rule reaches the whole piece
 * (§5A.8), and neither chord of the cycle carries it.
 */
export const terrorBassClosingSemitoneLine: Riff = {
  id: 'terror-bass-closing-semitone-line',
  name: 'The Terror Bass closing-semitone line',
  reference: { kind: 'patch', name: 'Terror Bass' },
  bpm: { min: 120, max: 140, default: 130 },
  key: 'E phrygian',
  technique: [
    'Eighths on the root, every one a sixteenth long with a sixteenth of silence after it, and ' +
      'nothing stops. The line never rests until the last eighth of the fourth bar, and that ' +
      'one rest is the breath before it starts again.',
    'The name says terror, so the figure is the semitone above the root, and it comes closer. ' +
      'Bar one: the F takes the last eighth. Bar two: the last two. Bar three: the last four, ' +
      'half the bar. Bar four is all F, and the chord has moved up to it.',
    'Play the F exactly as you play the E: same length, same weight, no lean. It is not an ' +
      'ornament. It is the root being pushed off its own bar, an eighth further each time.',
    'The bar head is the loudest note, and the first F of each bar is the next loudest. The ' +
      'ear should be able to count where the semitone came in, bar by bar.',
    'Two chords: E minor for three bars, F major for the fourth. The F is the second degree of ' +
      'E phrygian, so it is in the key and it is the root of the chord it ends on. Nothing here ' +
      'is chromatic.',
    'Never play F sharp. Raise the second and this is E minor with a passing note in it, and ' +
      'the menace is gone. The whole figure is the semitone, and it has to be a semitone.',
  ],
  request: {
    id: 'terror-bass-closing-semitone-line',
    role: 'bass-mid',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised second as data, over the `i`, and reaching the whole piece because the
   * mode does not have it. Every entry is on the bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 2,
        alter: 1,
        reason: 'the raised second turns the phrygian semitone into a minor scale and the menace into a passing note',
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
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `E2` at degree 1; the line is
   * `E2` and `F2` and nothing else.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, thirty-one notes, every one a sixteenth on an eighth. The F's are steps 15; 29,
   * 31; 41, 43, 45, 47; and every eighth of bar four. Step 63 is the one rest.
   */
  hook: {
    id: 'terror-bass-closing-semitone-line-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // Bar 1: seven E2, then the F2 on the last eighth.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 1, octave: 0, len: 1 },
      { step: 5, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 1, octave: 0, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 11, degree: 1, octave: 0, len: 1 },
      { step: 13, degree: 1, octave: 0, len: 1 },
      { step: 15, degree: 2, octave: 0, len: 1 },
      // Bar 2: six E2, the F2 on the last two.
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 19, degree: 1, octave: 0, len: 1 },
      { step: 21, degree: 1, octave: 0, len: 1 },
      { step: 23, degree: 1, octave: 0, len: 1 },
      { step: 25, degree: 1, octave: 0, len: 1 },
      { step: 27, degree: 1, octave: 0, len: 1 },
      { step: 29, degree: 2, octave: 0, len: 1 },
      { step: 31, degree: 2, octave: 0, len: 1 },
      // Bar 3: four E2, the F2 on the last four.
      { step: 33, degree: 1, octave: 0, len: 1 },
      { step: 35, degree: 1, octave: 0, len: 1 },
      { step: 37, degree: 1, octave: 0, len: 1 },
      { step: 39, degree: 1, octave: 0, len: 1 },
      { step: 41, degree: 2, octave: 0, len: 1 },
      { step: 43, degree: 2, octave: 0, len: 1 },
      { step: 45, degree: 2, octave: 0, len: 1 },
      { step: 47, degree: 2, octave: 0, len: 1 },
      // Bar 4, over the `bII`: seven F2, and the last eighth silent.
      { step: 49, degree: 2, octave: 0, len: 1 },
      { step: 51, degree: 2, octave: 0, len: 1 },
      { step: 53, degree: 2, octave: 0, len: 1 },
      { step: 55, degree: 2, octave: 0, len: 1 },
      { step: 57, degree: 2, octave: 0, len: 1 },
      { step: 59, degree: 2, octave: 0, len: 1 },
      { step: 61, degree: 2, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. Bar heads at 118, the first F of bars one to three at
   * 110, the other beats as downbeats, the "and"s as offbeats, and nothing on 63.
   */
  pattern: variant(
    'terror-bass-closing-semitone-line-grid',
    'bass-mid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 110, 15, 29, 41),
    on('downbeat', 5, 9, 13, 21, 25, 37, 45, 53, 57, 61),
    on('offbeat', 3, 7, 11, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59),
  ),
}
