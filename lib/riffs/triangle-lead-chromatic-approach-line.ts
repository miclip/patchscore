import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Triangle Lead chromatic-approach line**: four bars of chord tones, and the last
 * note of every bar is the semitone below the next bar's first, so each bar head is arrived at
 * from outside the key.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is a lead; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## Chromatic approach
 *
 * Every bar's first note is a chord tone of the chord that starts there, and it is reached by a
 * semitone from below. `D5` at the end of bar one leads to `Eb5` on bar two; `B4` at the end of
 * bar two leads to `C5`; `C#5` at the end of bar three leads to `D5`; `F#4` at the end of bar
 * four leads to `G4` when the pass comes round. Three of the four approach notes, `B`, `C#`
 * and `F#`, are not in G minor, and that is the lesson: a note the key does not own, an eighth
 * long and pointed at a note the chord does, is the oldest way to make an arrival heard as
 * one. Each is `alter: 1` on the degree below the target, so the guide
 * prints `raised 3rd`, `raised 4th` and `raised 7th` beside them and the key stays G minor.
 *
 * #624's figure rose by step to a peak and fell the same way, which is what
 * `an-ending-ascent-pad` already teaches. This replaces it (#643).
 *
 * ## One note at a time, by construction
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes, and `lead /
 * clean` there is the duo recipe with a note to spare (#632): one key held sounds on both
 * oscillators, so the line plays as written.
 *
 * ## The harmony is context, and the V is major
 *
 * `i VI iv V` in G minor, one bar each: Gm, Eb, Cm, D. Over the D major the line is `D5 F#5
 * A4`, root, third, fifth, and the `F#` is the chord's own; the `F#4` that ends the bar is the
 * approach to `G4` and the same pitch class. The rule as data is the natural seventh over the
 * `V`: `F` against `F#` is the one collision the cycle offers.
 *
 * ## The grid is the whole cycle in one pass
 *
 * Four bars, sixteen strikes, 64 steps. Steps 1, 7, 9 and 15 of every bar. The bar heads are
 * the accents, since they are what the approach notes point at; the approach notes are
 * offbeats like the "and" of two, and the prose says to play them under.
 */
export const triangleLeadChromaticApproachLine: Riff = {
  id: 'triangle-lead-chromatic-approach-line',
  name: 'The Triangle Lead chromatic-approach line',
  reference: { kind: 'patch', name: 'Triangle Lead' },
  bpm: { min: 88, max: 108, default: 96 },
  key: 'G minor',
  technique: [
    'Four strikes a bar, on the one, the "and" of two, three and the "and" of four. The first ' +
      'three are tones of the chord. The fourth is the semitone below the next bar’s first ' +
      'note, and the next bar’s first note is where it is going.',
    'Bar one, G minor: G, Bb, D, D. Bar two, Eb: Eb, D, Bb, B. Bar three, C minor: C, Eb, G, ' +
      'C sharp. Bar four, D: D, F sharp, A, F sharp. Then G again, and the F sharp was ' +
      'pointing at it.',
    'The B, the C sharp and the F sharp at the ends of the bars are not in G minor. Play them ' +
      'anyway, and play them short and quiet, an eighth each, leaning into the bar head they ' +
      'lead to. A note outside the key that lands on one inside it is an arrival.',
    'The bar head is the loud one. The approach note before it is the quiet one, and the ' +
      'distance between those two weights is what makes the semitone sound like a step up ' +
      'onto something.',
    'Hold each note to the next strike. The approach notes in particular run straight into ' +
      'the bar head; a gap there and the semitone is a wrong note, no gap and it is a lead-in.',
    'The D chord is major, and its third is F sharp. Never play F natural while it is ' +
      'sounding. The two F sharps in that bar are the chord’s own note and the approach to G, ' +
      'and F natural against either is the arrival undone.',
  ],
  request: {
    id: 'triangle-lead-chromatic-approach-line',
    role: 'lead',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The natural seventh over the `V` as data: the key's own note, forbidden over the
   * one chord built on its raised form. Every chord is entered on its bar head, so there is no
   * offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the D chord is major, and F natural against its F sharp is the arrival undone',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `G4` at degree 1; the line runs
   * from `F#4` to `F#5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes. Steps 1, 7, 9 and 15 of each bar, held to the next strike: six,
   * two, six and two. The three raised approach notes carry `alter: 1`.
   */
  hook: {
    id: 'triangle-lead-chromatic-approach-line-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: G4, Bb4, D5, and D5 again, the approach to Eb5.
      { step: 1, degree: 1, octave: 0, len: 6 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 9, degree: 5, octave: 0, len: 6 },
      { step: 15, degree: 5, octave: 0, len: 2 },
      // `VI`: Eb5, D5, Bb4, and B4, the raised third, the approach to C5.
      { step: 17, degree: 6, octave: 0, len: 6 },
      { step: 23, degree: 5, octave: 0, len: 2 },
      { step: 25, degree: 3, octave: 0, len: 6 },
      { step: 31, degree: 3, octave: 0, len: 2, alter: 1 },
      // `iv`: C5, Eb5, G4, and C#5, the raised fourth, the approach to D5.
      { step: 33, degree: 4, octave: 0, len: 6 },
      { step: 39, degree: 6, octave: 0, len: 2 },
      { step: 41, degree: 1, octave: 0, len: 6 },
      { step: 47, degree: 4, octave: 0, len: 2, alter: 1 },
      // `V`: D5, F#5, A4, and F#4, the raised seventh, the approach to G4.
      { step: 49, degree: 5, octave: 0, len: 6 },
      { step: 55, degree: 7, octave: 0, len: 2, alter: 1 },
      { step: 57, degree: 2, octave: 0, len: 6 },
      { step: 63, degree: 7, octave: -1, len: 2, alter: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. Bar heads at 118, beat three as a downbeat, and both
   * "and"s as offbeats, the approach note included.
   */
  pattern: variant(
    'triangle-lead-chromatic-approach-line-grid',
    'lead',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('downbeat', 9, 25, 41, 57),
    on('offbeat', 7, 15, 23, 31, 39, 47, 55, 63),
  ),
}
