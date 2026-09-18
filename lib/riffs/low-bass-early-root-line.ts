import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The LOW BASS early-root line**: four strikes a bar on the root, its octave and its
 * fifth, and the fourth strike of every bar is the root of the chord that has not arrived yet.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is the sub bass; the notes are this library's own, and the entry names no device
 * (invariant 3). Nobody writing this had heard the preset, and nothing here says what it
 * sounds like: the name gives the register and the part, and the figure is written for those.
 *
 * ## Arrive early
 *
 * The figure is a bass line that knows the next chord before the band does. Each bar is the
 * root on the bar head, the octave on the "and" of two, the fifth on beat three, and on the
 * "and" of four the root of the *next* bar's chord. So `Ab2` sounds an eighth before the Ab
 * chord, `Eb2` an eighth before the Eb, `G2` before the G, and `C2` before the pass comes round
 * to C minor. A bass that arrives with the chord is following it; one that arrives an eighth
 * early is leading it, and that is the whole lesson.
 *
 * #624's figure was roots only, two strikes a bar, and it had four pitches in eight bars. This
 * replaces it (#643).
 *
 * ## One note at a time, by construction
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; a sub uses one,
 * and `sub / dark` there is a mono recipe (#632).
 *
 * ## The harmony is context, and the V is major
 *
 * `i VI III V` in C minor, one bar each: Cm, Ab, Eb, G. The `V` is G major, whose third is
 * `B` natural, and the line never plays a `Bb` over it: the bar is `G2 G3 D3` and the early
 * `C2`. `Bb2` sits over the Eb, where it is the fifth. The rule as data is the natural seventh
 * over the `V`, the one place in the cycle the key's own note collides with the chord's.
 *
 * ## The grid is the whole cycle in one pass
 *
 * Four bars, sixteen strikes, 64 steps. Steps 1, 7, 9 and 15 of every bar. The bar head is the
 * accent and the "and" of four is leaned on, because the early root is the note the ear waits
 * for.
 */
export const lowBassEarlyRootLine: Riff = {
  id: 'low-bass-early-root-line',
  name: 'The LOW BASS early-root line',
  reference: { kind: 'patch', name: 'LOW BASS' },
  bpm: { min: 108, max: 128, default: 120 },
  key: 'C minor',
  technique: [
    'Four strikes a bar: the root on the one, the octave on the "and" of two, the fifth on ' +
      'three, and on the "and" of four the root of the chord that comes next. That last note ' +
      'is the figure. The bass arrives an eighth before the chord does.',
    'Bar one is C minor: C, the C above it, G, then Ab. Bar two is Ab: Ab, the octave, Eb, ' +
      'then the low Eb. Bar three is Eb: Eb, the octave, Bb, then G. Bar four is G: G, the ' +
      'octave, D, then C, which is where the pass starts again.',
    'The bar head is the loud one. Lean on the "and" of four as well, a little under the bar ' +
      'head, so the early root is heard as an arrival and the bar head that follows it as ' +
      'confirmation.',
    'Hold every note to the next strike. The line is legato at the bottom, and the early root ' +
      'runs straight into the bar head, which restrikes the same pitch.',
    'The G chord is major. Its third is B natural, so never play Bb while it is sounding; the ' +
      'Bb belongs to the Eb bar and nowhere else.',
    'Keep the whole line between C2 and Ab3. Nothing here needs to be higher, and a sub that ' +
      'climbs stops being one.',
  ],
  request: {
    id: 'low-bass-early-root-line',
    role: 'sub',
    priority: 1,
    character: 'dark',
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
        reason: 'the G chord is major, and Bb against its B natural is a smear at this depth',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `C2` at degree 1; the line runs
   * from `C2` to `Ab3`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes. Steps 1, 7, 9 and 15 of each bar, held to the next strike: six,
   * two, six and two steps.
   */
  hook: {
    id: 'low-bass-early-root-line-hook',
    forRole: 'sub',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`: C2, C3, G2, then Ab2 early.
      { step: 1, degree: 1, octave: 0, len: 6 },
      { step: 7, degree: 1, octave: 1, len: 2 },
      { step: 9, degree: 5, octave: 0, len: 6 },
      { step: 15, degree: 6, octave: 0, len: 2 },
      // `VI`: Ab2, Ab3, Eb3, then Eb2 early.
      { step: 17, degree: 6, octave: 0, len: 6 },
      { step: 23, degree: 6, octave: 1, len: 2 },
      { step: 25, degree: 3, octave: 1, len: 6 },
      { step: 31, degree: 3, octave: 0, len: 2 },
      // `III`: Eb2, Eb3, Bb2, then G2 early.
      { step: 33, degree: 3, octave: 0, len: 6 },
      { step: 39, degree: 3, octave: 1, len: 2 },
      { step: 41, degree: 7, octave: 0, len: 6 },
      { step: 47, degree: 5, octave: 0, len: 2 },
      // `V`: G2, G3, D3, then C2 early, into the next pass.
      { step: 49, degree: 5, octave: 0, len: 6 },
      { step: 55, degree: 5, octave: 1, len: 2 },
      { step: 57, degree: 2, octave: 1, len: 6 },
      { step: 63, degree: 1, octave: 0, len: 2 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. Bar heads at 118, the early roots at 108, beat three
   * as a downbeat and the "and" of two as an offbeat.
   */
  pattern: variant(
    'low-bass-early-root-line-grid',
    'sub',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 108, 15, 31, 47, 63),
    on('downbeat', 9, 25, 41, 57),
    on('offbeat', 7, 23, 39, 55),
  ),
}
