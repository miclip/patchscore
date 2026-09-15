import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD Woofbass two-strikes sub line**: roots only, two strikes a bar, and a rest before
 * every bar line so each strike lands on silence.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * sub bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *woof*, and a woof is a low
 * attack followed by room to hear it decay, so the figure is built around that room: the note
 * lets go two sixteenths before every bar line, and the grid strikes twice a bar and never more.
 * The prose says what to play. It says nothing about what the preset sounds like, because the
 * name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * The box this patch ships on plays two notes at most, and a sub plays one. No two notes here
 * overlap: each bar's note ends at step 14 of its bar and the next begins at 17, so the peak is
 * one and `test/riff.test.ts` counts it.
 *
 * ## The harmony is context, and the sub plays its roots
 *
 * `i VI iv VII` in C minor, two bars a chord, is the progression the line sits under. Something
 * else plays the chords, or nothing does; this part plays their roots and nothing else, in the
 * octave where `C2` is the highest note it reaches. The one move is in the last bar, where the
 * `Bb1` jumps to `Bb2` on the "and" of three and the next pass drops back to the `C2`.
 *
 * ## Why the fifth is forbidden over the VI
 *
 * C minor's fifth is `G`, and over the `VI` it is the major seventh of Ab. At this register that
 * interval is mud, the same rule `3-osc-bass-love-root-octave-figure` keeps over its `VI`, and
 * it is one line of data here for the same reason.
 *
 * ## The grid repeats twice under the hook
 *
 * Eight bars over a four-bar grid (§5A.2). The chords change at bars 1, 3, 5 and 7, which is
 * steps 1 and 33 of every pass, so those are the accents, and every other strike is the same on
 * both passes: the bar head and the "and" of three.
 */
export const pdWoofbassTwoStrikesSubLine: Riff = {
  id: 'pd-woofbass-two-strikes-sub-line',
  name: 'The PD Woofbass two-strikes sub line',
  reference: { kind: 'patch', name: 'PD Woofbass' },
  bpm: { min: 100, max: 128, default: 116 },
  key: 'C minor',
  technique: [
    'The name says woof, so the figure leaves room for one. Two strikes a bar, the root of the ' +
      'chord and nothing else, and a rest before every bar line so the next strike lands on ' +
      'silence.',
    'Strike the bar head and the "and" of three. The bar head is the loud one. The second ' +
      'strike is the push into the next bar, and it is played under the first.',
    'Hold each note through the second strike and let go two sixteenths before the bar line. ' +
      'Fill the whole bar and the strikes run together into a drone with no woof in it.',
    'Roots only, two bars each: C, then the Ab, F and Bb below it. A fifth under the chord at ' +
      'this depth reads as a second chord, so the line never plays one.',
    'The one move is the last bar. On the "and" of three the Bb jumps up an octave, and the ' +
      'next pass drops back to the low C. Once a cycle is what makes it land.',
    'Never play G while the Ab chord is sounding. It is the major seventh of the chord, and ' +
      'this far down a major seventh is mud.',
  ],
  request: {
    id: 'pd-woofbass-two-strikes-sub-line',
    role: 'sub',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The major seventh over the `VI` as data. Every entry is on the bar head, so there
   * is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'VI',
        degree: 5,
        reason: 'the major seventh against the root is mud at this register',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `C2` at degree 1, and the three
   * other roots sit below it: `Ab1`, `F1`, `Bb1`.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, nine notes. One note a bar, fourteen steps long, so it is in force at both strikes
   * and silent for the last two sixteenths. The last bar splits: `Bb1` for ten steps, then `Bb2`
   * from the "and" of three.
   */
  hook: {
    id: 'pd-woofbass-two-strikes-sub-line-hook',
    forRole: 'sub',
    bars: 8,
    baseOctave: 2,
    notes: [
      // `i`: C2, one a bar.
      { step: 1, degree: 1, octave: 0, len: 14 },
      { step: 17, degree: 1, octave: 0, len: 14 },
      // `VI`: Ab1.
      { step: 33, degree: 6, octave: -1, len: 14 },
      { step: 49, degree: 6, octave: -1, len: 14 },
      // `iv`: F1.
      { step: 65, degree: 4, octave: -1, len: 14 },
      { step: 81, degree: 4, octave: -1, len: 14 },
      // `VII`: Bb1, and in the last bar the jump to Bb2 on the "and" of three.
      { step: 97, degree: 7, octave: -1, len: 14 },
      { step: 113, degree: 7, octave: -1, len: 10 },
      { step: 123, degree: 7, octave: 0, len: 4 },
    ],
  },
  /**
   * §5A.2. Four bars, played twice. Steps 1 and 33 are the chord changes on both passes; 17 and
   * 49 are the other bar heads; the "and" of three in every bar is the push.
   */
  pattern: variant(
    'pd-woofbass-two-strikes-sub-line-grid',
    'sub',
    0,
    64,
    at('accent', 118, 1, 33),
    on('downbeat', 17, 49),
    on('offbeat', 11, 27, 43, 59),
  ),
}
