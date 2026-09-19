import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The UBER_SUB octave line**: one pitch class a bar, pumped in eighths, and the only
 * thing that moves inside a bar is which octave it is in. The fourth bar withholds the jump.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * sub; the notes are this library's own, and the entry names no device (invariant 3). Nobody
 * writing this had heard the preset, and nothing here says what it sounds like: the name gives
 * the register and the part, and the figure is written for those.
 *
 * ## What it teaches, set against the other low line on the same box
 *
 * `low-bass-early-root-line` is about *when* a note arrives: its fourth strike is the next
 * chord's root, an eighth early. This one never changes when anything arrives. Every bar is the
 * chord's root and nothing else, and the movement is the octave: low for half a bar, high for
 * half a bar. A sub that has one note per chord still has somewhere to go.
 *
 * The fourth bar is where the lesson lands. Three bars jump on the half and the fourth stays
 * down for its whole length, so the pass ends lower than the ear has been taught to expect and
 * the top of the next pass sounds like an arrival.
 *
 * ## The harmony is context, and the roots fall
 *
 * `i VII VI v` in F minor, a bar each: Fm, Eb, Db, Cm. The roots walk down by step, which is
 * what makes four bars of one note a bar hold together. The line is the root every time, so a
 * reader hears the descent in the bass and nothing else.
 *
 * ## The rule is the raised seventh over the last chord
 *
 * The figure plays roots and nothing else, and that is a decision rather than a rule: a rule
 * forbidding the third of the tonic would forbid a tone of the chord it names, which #605's
 * check refuses. What it is right to forbid is `E` natural over the `v`, the note that turns
 * the last bar's C minor into a dominant and sends a figure that is meant to circle straight
 * home. It is in none of the four chords.
 *
 * ## One note at a time
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. `sub / dirty` on the box that ships this patch is a mono
 * recipe (#632).
 */
export const uberSubOctavePumpLine: Riff = {
  id: 'uber-sub-octave-pump-line',
  name: 'The UBER_SUB octave line',
  reference: { kind: 'patch', name: 'UBER_SUB' },
  bpm: { min: 112, max: 132, default: 124 },
  key: 'F minor',
  technique: [
    'One note a bar, struck on every eighth. The root of the chord for the first half of the ' +
      'bar, the same note an octave up for the second half, and nothing else happens.',
    'Bar one is F, bar two is Eb, bar three is Db. Each one is the root of the chord under it ' +
      'and each is a step below the last, so the line walks down while the octaves jump.',
    'The fourth bar is C and it stays down for the whole bar. The jump is withheld, the pass ' +
      'ends at the bottom, and the F an octave up at the start of the next pass is the loudest ' +
      'thing in the figure.',
    'Every eighth is the same length. Lift the hand between them so each strike speaks; a sub ' +
      'held through the gap turns the pumping into one long note.',
    'The bar head is the loud one and the octave jump on beat three is the second loudest. ' +
      'Everything else sits under both.',
    'Never play E natural while the last bar is sounding. It turns the C minor into a chord ' +
      'that wants to go home, and this pass is meant to come round again.',
    'Keep the whole line between C2 and F3. Higher and it stops being the bottom of the track; ' +
      'lower and the octave jump has nowhere to go.',
  ],
  request: {
    id: 'uber-sub-octave-pump-line',
    role: 'sub',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised seventh over the `v`, as data: the one pitch that would turn a pass
   * built to circle into one that cadences.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'v',
        degree: 7,
        alter: 1,
        reason: 'a raised seventh makes the last bar a dominant, and this pass is meant to circle',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'v', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `F2` at degree 1, and the
   * three chords after the first take `octave: -1` so their roots fall below it. The line runs
   * `C2` to `F3`, which is nineteen semitones and well inside one three-octave window (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, seven notes. Each of the first three is a root held eight steps and the same
   * root an octave up for the next eight; the fourth is one note for sixteen.
   */
  hook: {
    id: 'uber-sub-octave-pump-line-hook',
    forRole: 'sub',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`, F minor: F2 for half a bar, F3 for the other half.
      { step: 1, degree: 1, octave: 0, len: 8 },
      { step: 9, degree: 1, octave: 1, len: 8 },
      // `VII`, Eb major: Eb2 low, Eb3 high. Degree 7 of F minor, an octave down from the
      // window `baseOctave` opens, so the roots descend rather than climbing.
      { step: 17, degree: 7, octave: -1, len: 8 },
      { step: 25, degree: 7, octave: 0, len: 8 },
      // `VI`, Db major: Db2, Db3. Degree 6, the same octave down.
      { step: 33, degree: 6, octave: -1, len: 8 },
      { step: 41, degree: 6, octave: 0, len: 8 },
      // `v`, C minor: one C2 for the whole bar. The jump the other three bars made.
      { step: 49, degree: 5, octave: -1, len: 16 },
    ],
  },
  /**
   * §5A.2. One pass, eighths throughout: every odd step of all four bars. Bar heads accented,
   * the octave jumps on beat three a little under them, and the rest offbeats.
   */
  pattern: variant(
    'uber-sub-octave-pump-line-grid',
    'sub',
    0,
    64,
    at('accent', 120, 1, 17, 33, 49),
    at('accent', 106, 9, 25, 41),
    on('downbeat', 5, 13, 21, 29, 37, 45, 53, 61),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63),
    on('downbeat', 57),
  ),
}
