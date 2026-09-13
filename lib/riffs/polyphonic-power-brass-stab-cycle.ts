import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Polyphonic Power brass stab cycle**: three bars of short offbeat stabs, then a
 * fourth that lands on the downbeat and holds.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * brass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## Two notes at a time, over a chord table
 *
 * Like `detroit-funk-aeolian-machine-loop`, this stab plays the top of the chord and leaves the
 * root to the bass: a third and a fifth over the `i`, a third and a seventh over the `IV` and
 * the `VII`, a third alone over the `v`. Two notes at one step are a voicing (§4.1), and
 * `polyphony: 2` is its width. The chord table says which chord each pair is the top of.
 *
 * ## Why the offset is prose
 *
 * The definition asked for every note half a beat into its chord, and also for the fourth bar
 * to land on the downbeat. The second is the arrangement, so it wins: an `onsetOffset` would
 * refuse the one entry the technique exists for. The three offbeat bars keep the rule by
 * construction, and `test/riff.test.ts` asserts it on them.
 *
 * ## The one raised note, twice
 *
 * F minor's sixth is `Db`. The third of Bb7 and the seventh of Ebmaj7 are both `D` natural,
 * `alter: 1` on degree 6, and the chord table is what says why the same raised degree is a
 * chord tone on two different chords. Over the `IV` the *third* of the key raised, `A`
 * natural, is the major seventh against the dominant seventh, and is forbidden as data.
 */
export const polyphonicPowerBrassStabCycle: Riff = {
  id: 'polyphonic-power-brass-stab-cycle',
  name: 'The Polyphonic Power brass stab cycle',
  reference: { kind: 'patch', name: 'Polyphonic Power' },
  bpm: { min: 100, max: 120, default: 108 },
  key: 'F minor',
  technique: [
    'Three bars of short offbeat stabs, then the fourth bar lands on the downbeat and holds. ' +
      'The change in placement is the arrangement; the notes barely matter.',
    'In the first three bars, nothing lands on a beat. The first stab of each bar is the "and" ' +
      'of one, half a beat in, and the rest follow on the "and"s. Bar three leaves the last ' +
      '"and" empty, so there is a breath before the fourth bar hits.',
    'Two notes per stab, and never the root. Over the F minor it is Ab and C; over the Bb7 it ' +
      'is D and Ab, the tritone; over the Eb major seventh it is D and G. The bass has the ' +
      'root and the stab has the colour.',
    'The fourth bar is one note, Eb, on the bar head, held for the whole bar. Play it louder ' +
      'than any stab before it.',
    'Never play A natural while the Bb7 is sounding. It is the major seventh against the ' +
      'dominant seventh that drives the move to Eb.',
    'Keep the stabs short and the release fast. The brass should stop before the next beat, ' +
      'and the held note in bar four is the only thing on this page with a tail.',
  ],
  request: {
    id: 'polyphonic-power-brass-stab-cycle',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    // §12.4. Two simultaneous notes, matching the dyads below.
    polyphony: 2,
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The major seventh over the dominant as data. A natural is the third of F minor
   * raised. No offset: the fourth bar's downbeat is the point, and see the header.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'IV',
        degree: 3,
        alter: 1,
        reason: 'the major seventh cancels the dominant seventh driving the move to Eb',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'v', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 4` puts `F4` at degree 1. In bars one to three the
   * hook holds each pair from its first strike to the bar line and the grid strikes it inside
   * that span (`reArticulatesHook`); in bar four the hook and the grid are one note on step 49.
   */
  hook: {
    id: 'polyphonic-power-brass-stab-cycle-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: Ab4 and C5, from the "and" of one.
      { step: 3, degree: 3, octave: 0, len: 14 },
      { step: 3, degree: 5, octave: 0, len: 14 },
      // `IV`: D5 and Ab5, the third and seventh of Bb7. The D is the sixth of the key raised.
      { step: 19, degree: 6, octave: 0, len: 14, alter: 1 },
      { step: 19, degree: 3, octave: 1, len: 14 },
      // `VII`: D5 and G5, the seventh and third of Ebmaj7.
      { step: 35, degree: 6, octave: 0, len: 14, alter: 1 },
      { step: 35, degree: 2, octave: 1, len: 14 },
      // `v`: Eb5 alone, on the bar head, for the bar.
      { step: 49, degree: 7, octave: 0, len: 16 },
    ],
  },
  pattern: variant(
    'polyphonic-power-brass-stab-cycle-grid',
    'stab',
    0,
    64,
    at('accent', 112, 3, 19, 35),
    on('offbeat', 7, 11, 15, 23, 27, 31, 39, 43),
    at('accent', 120, 49),
  ),
}
