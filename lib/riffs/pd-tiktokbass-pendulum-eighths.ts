import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD TikTokBass pendulum eighths**: root on the beat, the chord's fifth on the "and",
 * every eighth of every bar, and one tock missing so the loop has a hole in it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. The name is read as *tick-tock*, a clock, and the
 * figure takes that at its word visibly: a pendulum swings between two points at an even rate,
 * so the line is two pitches a bar in unbroken eighths, each a sixteenth long with a sixteenth
 * of silence after it. The prose says what to play and nothing about what the preset sounds
 * like, because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and no two share a step, so the peak is one however the pair is
 * counted, and `test/riff.test.ts` counts it. That matters on a box that plays two notes: held
 * together the tick and the tock are a fifth, and the clock stops.
 *
 * ## The harmony is context, and the pair follows it
 *
 * `i iv VII III` in E minor, one bar each, is the progression the line sits under. The tick is
 * the root of the chord in force and the tock is that chord's fifth, a fourth beneath the root,
 * so the pair moves as one when the chord moves. Thirty-one notes, because eight a bar is what
 * an eighth-note pendulum is, and the thirty-second is the hole.
 *
 * ## The hole
 *
 * The last tock of the fourth bar is missing. A loop of even eighths with nothing else in it
 * has no downbeat a listener can find; a rest before the bar line gives the pass an end, and the
 * bar head after it is heard as one. It is a gap in the hook and an absence in the grid, so
 * nothing strikes it.
 */
export const pdTiktokbassPendulumEighths: Riff = {
  id: 'pd-tiktokbass-pendulum-eighths',
  name: 'The PD TikTokBass pendulum eighths',
  reference: { kind: 'patch', name: 'PD TikTokBass' },
  bpm: { min: 110, max: 130, default: 120 },
  key: 'E minor',
  technique: [
    'Tick, tock, on every eighth. The tick is the root of the chord on the beat; the tock is ' +
      'the fifth of the chord on the "and", a fourth beneath it. Four of each a bar.',
    'Every note is a sixteenth long, and the sixteenth after it is silent. The silence is what ' +
      'makes it a clock. Hold the notes out and it is a bass line in eighths.',
    'Play the tock under the tick. The beat is the loud one and the bar head is the loudest; ' +
      'the fifth on the "and" is felt more than heard.',
    'Four chords, one a bar: E, A, D, G. The tick changes with the chord and the tock follows ' +
      'it, so the pair moves as one and the swing never changes width.',
    'The clock skips once. The last tock of the fourth bar is missing, so the pass ends on ' +
      'silence and the bar head that follows is the one you hear. Leave it empty.',
    'One note at a time, always. The tick is released before the tock is struck. Hold both ' +
      'and the pair turns into a fifth, and the clock stops.',
  ],
  request: {
    id: 'pd-tiktokbass-pendulum-eighths',
    role: 'bass-mid',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'III', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `E2` at degree 1; the line runs
   * from `A1` to `A2` and nothing here is longer than a sixteenth.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, thirty-one notes. Ticks on the beats (steps 1, 5, 9, 13 of each bar), tocks
   * on the "and"s (3, 7, 11, 15), and step 63 empty.
   */
  hook: {
    id: 'pd-tiktokbass-pendulum-eighths-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`: tick E2, tock B1.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 5, octave: -1, len: 1 },
      { step: 5, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 5, octave: -1, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 11, degree: 5, octave: -1, len: 1 },
      { step: 13, degree: 1, octave: 0, len: 1 },
      { step: 15, degree: 5, octave: -1, len: 1 },
      // `iv`: tick A2, tock E2.
      { step: 17, degree: 4, octave: 0, len: 1 },
      { step: 19, degree: 1, octave: 0, len: 1 },
      { step: 21, degree: 4, octave: 0, len: 1 },
      { step: 23, degree: 1, octave: 0, len: 1 },
      { step: 25, degree: 4, octave: 0, len: 1 },
      { step: 27, degree: 1, octave: 0, len: 1 },
      { step: 29, degree: 4, octave: 0, len: 1 },
      { step: 31, degree: 1, octave: 0, len: 1 },
      // `VII`: tick D2, tock A1.
      { step: 33, degree: 7, octave: -1, len: 1 },
      { step: 35, degree: 4, octave: -1, len: 1 },
      { step: 37, degree: 7, octave: -1, len: 1 },
      { step: 39, degree: 4, octave: -1, len: 1 },
      { step: 41, degree: 7, octave: -1, len: 1 },
      { step: 43, degree: 4, octave: -1, len: 1 },
      { step: 45, degree: 7, octave: -1, len: 1 },
      { step: 47, degree: 4, octave: -1, len: 1 },
      // `III`: tick G2, tock D2, and the last tock missing.
      { step: 49, degree: 3, octave: 0, len: 1 },
      { step: 51, degree: 7, octave: -1, len: 1 },
      { step: 53, degree: 3, octave: 0, len: 1 },
      { step: 55, degree: 7, octave: -1, len: 1 },
      { step: 57, degree: 3, octave: 0, len: 1 },
      { step: 59, degree: 7, octave: -1, len: 1 },
      { step: 61, degree: 3, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck: bar heads accented, the other beats as downbeats, the
   * "and"s as offbeats, and nothing on 63.
   */
  pattern: variant(
    'pd-tiktokbass-pendulum-eighths-grid',
    'bass-mid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('downbeat', 5, 9, 13, 21, 25, 29, 37, 41, 45, 53, 57, 61),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59),
  ),
}
