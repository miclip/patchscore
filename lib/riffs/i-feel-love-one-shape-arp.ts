import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The I Feel Love one-shape arp**: root, octave, fifth, octave, in sixteenths, and the
 * pattern never changes. Only what it is built on does.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference *for* is a way of writing a sequenced part:
 * one interval shape repeated without variation, so that all the interest is in the harmony
 * moving under it and the filter moving over it.
 *
 * **Names no device** (invariant 3). `arp`, `clean`, a grid, and a progression in roman numerals.
 *
 * ## The first record-named `arp` (#638)
 *
 * The two arps in the library before this are named for factory patches and surface on their
 * boxes. This is the first a reader reaches from `/riffs`, and it is the plainest arp there is:
 * sixteen notes a bar, one shape, and a reader who has it has the part.
 *
 * ## One shape, moved
 *
 * `i i VI VII` in D minor, one bar a chord. Every beat of every bar is the same four sixteenths
 * on that bar's root: the root, the octave above, the fifth between them, the octave again.
 * `D3 D4 A3 D4` for two bars, `Bb2 Bb3 F3 Bb3` for one, `C3 C4 G3 C4` for one. The shape drops
 * a third for the `VI` and rises a step for the `VII`, and that is all the melody there is.
 *
 * **Do not vary it.** The figure's whole claim is that it does not, and any movement belongs
 * to the filter, which is a recipe's business and never a riff's. There is no third anywhere
 * in the line; the chord table carries the thirds, and the arp carries the frame.
 *
 * ## The grid is sixteen steps, repeated four times
 *
 * Every sixteenth is an onset, and the same sixteenth is an onset in every bar, so the honest
 * grid is one bar (§5A.2): it marks what recurs on the same step of every pass, and here that
 * is everything. The accent is the root on beat one; the other roots are downbeats, the fifths
 * are the eighth-note offbeats, and the octaves sit between as sixteenths, a touch lighter, the
 * same on every beat. Sixty-four notes in the hook, each one step long, so no two overlap and
 * the peak is one.
 *
 * ## How it differs from the other root-and-octave figure
 *
 * `3-osc-bass-love-root-octave-figure` pumps a bass in eighths, root and octave, with a rest
 * before every bar line. This is a sixteenth pulse with the fifth inside it and no rests: an
 * arp is a frame that runs, and a bass is a line that breathes.
 */
export const iFeelLoveOneShapeArp: Riff = {
  id: 'i-feel-love-one-shape-arp',
  name: 'The I Feel Love one-shape arp',
  reference: { kind: 'record', name: 'I Feel Love' },
  bpm: { min: 120, max: 132, default: 125 },
  key: 'D minor',
  technique: [
    'Four sixteenths a beat, and the same four every beat: the root, the octave above it, the ' +
      'fifth, and the octave again. Root, octave, fifth, octave, and nothing else, ever.',
    'Move the shape and never the pattern. Two bars on D, one bar on B flat, one bar on C, ' +
      'and each bar is the same four notes built on that bar’s root.',
    'Play every note the same length, a full sixteenth, each one struck fresh and none tied ' +
      'to the next. The pattern is a pulse, and it is the even strikes that make it one; how ' +
      'much of each sixteenth rings is the envelope\u2019s decision.',
    'Do not add a note, drop a note, or swap the order for interest. The whole claim of the ' +
      'figure is that it does not change. Any movement belongs to the filter and the sound, ' +
      'and none of it belongs to the notes.',
    'Keep it inside an octave and a half: the root at the bottom, the octave a full octave up, ' +
      'the fifth between them. On the B flat bar the whole shape drops a third and on the C bar ' +
      'it rises a step, and that is all the melody there is.',
    'Let a sequencer play it if you can. Evenness is the sound, and a hand will not keep ' +
      'sixteenths this level at this tempo for four bars at a time.',
    'Lean on the root of each beat and play the octaves a touch lighter than the fifth. The ' +
      'weight sits on the beat and the shape rides above it.',
  ],
  request: {
    id: 'i-feel-love-one-shape-arp',
    role: 'arp',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `D3` at degree 1 and `D4` at
   * degree 1 an octave up; `Bb2` and `C3` are the sixth and seventh an octave down, `Bb3` and
   * `C4` the same degrees in place, and the fifths `A3`, `F3`, `G3` are the fifth, third and
   * fourth in place.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixty-four notes, one step each. Every beat is the same four steps: root,
   * octave, fifth, octave.
   */
  hook: {
    id: 'i-feel-love-one-shape-arp-hook',
    forRole: 'arp',
    bars: 4,
    baseOctave: 3,
    notes: [
      // Bars 1 and 2, over the `i`: D3 D4 A3 D4, four times a bar.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 2, degree: 1, octave: 1, len: 1 },
      { step: 3, degree: 5, octave: 0, len: 1 },
      { step: 4, degree: 1, octave: 1, len: 1 },
      { step: 5, degree: 1, octave: 0, len: 1 },
      { step: 6, degree: 1, octave: 1, len: 1 },
      { step: 7, degree: 5, octave: 0, len: 1 },
      { step: 8, degree: 1, octave: 1, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 10, degree: 1, octave: 1, len: 1 },
      { step: 11, degree: 5, octave: 0, len: 1 },
      { step: 12, degree: 1, octave: 1, len: 1 },
      { step: 13, degree: 1, octave: 0, len: 1 },
      { step: 14, degree: 1, octave: 1, len: 1 },
      { step: 15, degree: 5, octave: 0, len: 1 },
      { step: 16, degree: 1, octave: 1, len: 1 },
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 18, degree: 1, octave: 1, len: 1 },
      { step: 19, degree: 5, octave: 0, len: 1 },
      { step: 20, degree: 1, octave: 1, len: 1 },
      { step: 21, degree: 1, octave: 0, len: 1 },
      { step: 22, degree: 1, octave: 1, len: 1 },
      { step: 23, degree: 5, octave: 0, len: 1 },
      { step: 24, degree: 1, octave: 1, len: 1 },
      { step: 25, degree: 1, octave: 0, len: 1 },
      { step: 26, degree: 1, octave: 1, len: 1 },
      { step: 27, degree: 5, octave: 0, len: 1 },
      { step: 28, degree: 1, octave: 1, len: 1 },
      { step: 29, degree: 1, octave: 0, len: 1 },
      { step: 30, degree: 1, octave: 1, len: 1 },
      { step: 31, degree: 5, octave: 0, len: 1 },
      { step: 32, degree: 1, octave: 1, len: 1 },
      // Bar 3, over the `VI`: Bb2 Bb3 F3 Bb3, the shape a third down.
      { step: 33, degree: 6, octave: -1, len: 1 },
      { step: 34, degree: 6, octave: 0, len: 1 },
      { step: 35, degree: 3, octave: 0, len: 1 },
      { step: 36, degree: 6, octave: 0, len: 1 },
      { step: 37, degree: 6, octave: -1, len: 1 },
      { step: 38, degree: 6, octave: 0, len: 1 },
      { step: 39, degree: 3, octave: 0, len: 1 },
      { step: 40, degree: 6, octave: 0, len: 1 },
      { step: 41, degree: 6, octave: -1, len: 1 },
      { step: 42, degree: 6, octave: 0, len: 1 },
      { step: 43, degree: 3, octave: 0, len: 1 },
      { step: 44, degree: 6, octave: 0, len: 1 },
      { step: 45, degree: 6, octave: -1, len: 1 },
      { step: 46, degree: 6, octave: 0, len: 1 },
      { step: 47, degree: 3, octave: 0, len: 1 },
      { step: 48, degree: 6, octave: 0, len: 1 },
      // Bar 4, over the `VII`: C3 C4 G3 C4, the shape a step up.
      { step: 49, degree: 7, octave: -1, len: 1 },
      { step: 50, degree: 7, octave: 0, len: 1 },
      { step: 51, degree: 4, octave: 0, len: 1 },
      { step: 52, degree: 7, octave: 0, len: 1 },
      { step: 53, degree: 7, octave: -1, len: 1 },
      { step: 54, degree: 7, octave: 0, len: 1 },
      { step: 55, degree: 4, octave: 0, len: 1 },
      { step: 56, degree: 7, octave: 0, len: 1 },
      { step: 57, degree: 7, octave: -1, len: 1 },
      { step: 58, degree: 7, octave: 0, len: 1 },
      { step: 59, degree: 4, octave: 0, len: 1 },
      { step: 60, degree: 7, octave: 0, len: 1 },
      { step: 61, degree: 7, octave: -1, len: 1 },
      { step: 62, degree: 7, octave: 0, len: 1 },
      { step: 63, degree: 4, octave: 0, len: 1 },
      { step: 64, degree: 7, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. One bar, repeated four times: every sixteenth is an onset in every bar. The accent is
   * the root on beat one, the other three roots are downbeats, the fifths are the offbeats, and
   * the octaves are the sixteenths between, a touch lighter and the same on every beat.
   */
  pattern: variant(
    'i-feel-love-one-shape-arp-grid',
    'arp',
    0,
    16,
    at('accent', 112, 1),
    on('downbeat', 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 96, 2, 4, 6, 8, 10, 12, 14, 16),
  ),
}
