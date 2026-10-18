import { at, on, variant } from '../core/authoring'
import type { HookNote } from '../core/template'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Love on a Real Train sequence**: sixteen sixteenths over one chord, and every pass
 * changes exactly one of them. Four changes go in, four come out, and the last one out is the
 * downbeat, so the root returns on the first note of the next cycle.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference for is a way of writing a sequence: a pattern
 * that runs unchanged long enough to become the floor, so that moving one step of it is an
 * event. A reader who wants the record should go and listen to the record.
 *
 * **Names no device** (invariant 3). `arp`, `clean`, a grid, and one chord.
 *
 * ## The sequence
 *
 * Every even step is the key's fifth, a pedal the whole figure hangs from. The odd steps are the
 * line: on the first pass the root, its octave, the third, the octave, the root, the third an
 * octave up, the seventh, the octave. Four of those odd steps are the ones that move, one per
 * pass, each to a note the first pass never plays:
 *
 * | pass | changed | the odd steps |
 * |---|---|---|
 * | 1 | (home) | 1 1' 3 1' 1 3' 7 1' |
 * | 2 | step 9 → 4 | 1 1' 3 1' **4** 3' 7 1' |
 * | 3 | step 5 → 6 | 1 1' **6** 1' 4 3' 7 1' |
 * | 4 | step 13 → 2' | 1 1' 6 1' 4 3' **2'** 1' |
 * | 5 | step 1 → 6 below | **6,** 1' 6 1' 4 3' 2' 1' |
 * | 6 | step 9 → 1 | 6, 1' 6 1' **1** 3' 2' 1' |
 * | 7 | step 5 → 3 | 6, 1' **3** 1' 1 3' 2' 1' |
 * | 8 | step 13 → 7 | 6, 1' 3 1' 1 3' **7** 1' |
 * | (1) | step 1 → 1 | back home |
 *
 * Eight passes, eight changes counting the one into the next cycle, and no two passes alike:
 * the way out and the way back are different lines, because the changes come out in the order
 * they went in rather than mirrored. Pass five is the furthest point, with the downbeat moved to
 * the sixth below the root, which puts the pedal a major seventh above the bass. Passes six to
 * eight keep that low sixth while the rest goes home around it, and the loop closes on the one
 * change that matters most: the downbeat returning to the root.
 *
 * ## Why this is not the other arps
 *
 * `i-feel-love-one-shape-arp` is the opposite lesson: its shape never changes and the chord
 * under it does. Here the chord never changes and the shape does, a step at a time.
 * `bellbounce-sparse-bell-pattern` is two notes a bar with the space as the subject;
 * `mirror-interior-two-hand-split` is a held triad against a walking bass in contrary motion;
 * `harp-c-chord-arpeggiated-hold` is a hand holding notes for an arpeggiator; and
 * `triplet-5ths-stacked-fifths-ladder` climbs a stack of fifths. None of them changes over its
 * own repeats.
 *
 * ## A grid, not through-composed
 *
 * Every sixteenth of every pass is struck, so every step of the sixteen-step grid recurs on all
 * eight passes and the honest grid is one bar (§5A.2). What changes is pitch, never rhythm, and
 * the hook carries the pitches. `reArticulatesHook: false` would claim no step recurs, which is
 * the opposite of true. The hook is 128 sixteenths, each one step long, so the peak is one.
 */

/** The eight odd-step lines of the table above, as `[degree, octave]`, one per pass. */
const PASSES: readonly (readonly (readonly [number, number])[])[] = [
  [[1, 0], [1, 1], [3, 0], [1, 1], [1, 0], [3, 1], [7, 0], [1, 1]],
  [[1, 0], [1, 1], [3, 0], [1, 1], [4, 0], [3, 1], [7, 0], [1, 1]],
  [[1, 0], [1, 1], [6, 0], [1, 1], [4, 0], [3, 1], [7, 0], [1, 1]],
  [[1, 0], [1, 1], [6, 0], [1, 1], [4, 0], [3, 1], [2, 1], [1, 1]],
  [[6, -1], [1, 1], [6, 0], [1, 1], [4, 0], [3, 1], [2, 1], [1, 1]],
  [[6, -1], [1, 1], [6, 0], [1, 1], [1, 0], [3, 1], [2, 1], [1, 1]],
  [[6, -1], [1, 1], [3, 0], [1, 1], [1, 0], [3, 1], [2, 1], [1, 1]],
  [[6, -1], [1, 1], [3, 0], [1, 1], [1, 0], [3, 1], [7, 0], [1, 1]],
]

/** Each pass is its odd-step line interleaved with the fifth on every even step. */
const NOTES: HookNote[] = PASSES.flatMap((line, pass) =>
  line.flatMap(([degree, octave], i) => [
    { step: pass * 16 + i * 2 + 1, degree, octave, len: 1 },
    { step: pass * 16 + i * 2 + 2, degree: 5, octave: 0, len: 1 },
  ]),
)

export const loveOnARealTrainOneStepSequence: Riff = {
  id: 'love-on-a-real-train-one-step-sequence',
  name: 'The Love on a Real Train sequence',
  reference: { kind: 'record', name: 'Love on a Real Train' },
  bpm: { min: 104, max: 124, default: 116 },
  key: 'G# minor',
  technique: [
    'Sixteen sixteenths a bar, all struck. Every second one is the key’s fifth and never ' +
      'moves; the notes between are the line.',
    'Change exactly one note per bar and leave the other fifteen alone. A sequence that runs ' +
      'unchanged becomes the floor, and then one moved step is something the listener hears.',
    'Four changes go in, one a bar: the ninth sixteenth up from the root to the fourth, the fifth ' +
      'up from the third to the sixth, the thirteenth up from the seventh to the ninth, then the ' +
      'downbeat down from the root to the sixth below it.',
    'Bar five is the furthest point. With the low sixth on the downbeat, the pedal fifth sits a ' +
      'major seventh above the bass, and the same pattern sounds like a different chord.',
    'Then undo them in the order they went in, not in reverse, so the way back is a line you have ' +
      'not heard. The downbeat goes home last, on the first note of the next cycle.',
    'Keep the strikes even and the pedal a little under the line. The pattern is the pulse, and ' +
      'the change is only audible if nothing else moves.',
    'The line spans from the sixth below the root up to the third an octave above it, and the ' +
      'pedal sits in the middle of that span the whole time.',
  ],
  request: {
    id: 'love-on-a-real-train-one-step-sequence',
    role: 'arp',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 8,
    progression: [{ degree: 'i', bars: 8 }],
  },
  figureStartsAtBar: 1,
  /**
   * Eight bars, one pass a bar, 128 notes a sixteenth each. `baseOctave: 3` puts the root just
   * under middle C and the pedal fifth just above it (§4.1, middle C is C4).
   */
  hook: {
    id: 'love-on-a-real-train-one-step-sequence-hook',
    forRole: 'arp',
    bars: 8,
    baseOctave: 3,
    notes: NOTES,
  },
  /**
   * §5A.2. One bar, repeated eight times: every sixteenth is an onset on every pass. The accent
   * is the downbeat, the other line notes on the beat are downbeats and on the eighth offbeats
   * are offbeats, and the pedal fifth on every even step is a ghost, a little under the line.
   */
  pattern: variant(
    'love-on-a-real-train-one-step-sequence-grid',
    'arp',
    0,
    16,
    at('accent', 112, 1),
    on('downbeat', 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 88, 2, 4, 6, 8, 10, 12, 14, 16),
  ),
}
