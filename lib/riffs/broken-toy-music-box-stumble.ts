import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Broken Toy music-box stumble**: a nursery-simple tune two octaves up that trips
 * over itself twice and finds its way home.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * effect program; the tune is this library's own, and the entry names no device (invariant 3).
 *
 * ## One note at a time
 *
 * A tune, so nothing overlaps; the stumbles are rhythmic, an extra sixteenth and a dropped
 * beat, and never a second note. The peak is one, and `test/korg-minilogue-xd.test.ts` counts
 * it.
 *
 * ## The two stumbles
 *
 * Bar two repeats the top note as two sixteenths where bar one had an eighth, and bar three
 * drops the second half of beat four, so the pickup into bar four arrives late. Bar four is
 * the tune's own ending, on a note it has not used before, and the loop returns to the tune
 * as if nothing had happened.
 *
 * ## Why the fourth is forbidden over the I
 *
 * A major's fourth is `D`, and the tune never lands on it over its own chord however it
 * stumbles — the stumbles are in the rhythm, and a wrong note would be a different lesson.
 * Over the `V` the same `D` is the seventh and bar four plays it. Unaltered, so the rule
 * reaches only the chord it names (§5A.8).
 */
export const brokenToyMusicBoxStumble: Riff = {
  id: 'broken-toy-music-box-stumble',
  name: 'The Broken Toy music-box stumble',
  reference: { kind: 'patch', name: 'Broken Toy' },
  bpm: { min: 96, max: 116, default: 104 },
  key: 'A major',
  technique: [
    'A tune a child could sing, two octaves above middle C: up the triad, A, C sharp, E, and ' +
      'back down to A, then a low E to lead round again. Four bars, and it goes wrong twice.',
    'The first stumble is an extra note. In bar two the top E is struck twice as sixteenths ' +
      'where bar one had one eighth, and the tune is a sixteenth late for the rest of the bar. ' +
      'Late, it has no room for the rest and the low E that ended bar one, so it walks down ' +
      'instead, B then G sharp, and steps onto the A at the head of bar three. That is how a ' +
      'music box catches up: it fills the gap it fell into rather than skipping ahead.',
    'The second stumble is a missing one. In bar three the second half of beat four is silent, ' +
      'and the pickup arrives late, on the last sixteenth.',
    'Bar four is the ending: F sharp three times, D, B, G sharp, and A held. It is the only ' +
      'bar with notes the tune has not used, and it lands on the head of the loop.',
    'Never play D while the A is sounding. The tune stumbles in time and never in pitch; a ' +
      'wrong note is a different broken thing.',
    'Every note the same weight, like a comb plucked by a pin. The only accent is the bar ' +
      'head, and it is a small one.',
  ],
  request: {
    id: 'broken-toy-music-box-stumble',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The fourth over the `I` as data, and only over the `I`.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'the tune stumbles in time and never in pitch',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'I', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * Four bars. `baseOctave: 5` puts `A5` at degree 1, two octaves above middle C, where a
   * music box sits; the low E is `E5` and the top note is `E6`.
   */
  hook: {
    id: 'broken-toy-music-box-stumble-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 5,
    notes: [
      // Bar 1: the tune. A C# E C# A, a rest, then the low E.
      { step: 1, degree: 1, octave: 0, len: 2 },
      { step: 3, degree: 3, octave: 0, len: 2 },
      { step: 5, degree: 5, octave: 0, len: 2 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 9, degree: 1, octave: 0, len: 4 },
      { step: 15, degree: 5, octave: -1, len: 2 },
      // Bar 2: the extra sixteenth on the top E, and everything after it a sixteenth late.
      { step: 17, degree: 1, octave: 0, len: 2 },
      { step: 19, degree: 3, octave: 0, len: 2 },
      { step: 21, degree: 5, octave: 0, len: 1 },
      { step: 22, degree: 5, octave: 0, len: 1 },
      { step: 24, degree: 3, octave: 0, len: 2 },
      { step: 26, degree: 1, octave: 0, len: 2 },
      { step: 29, degree: 2, octave: 0, len: 2 },
      { step: 31, degree: 7, octave: -1, len: 2 },
      // Bar 3: the tune again, and the second half of beat four dropped.
      { step: 33, degree: 1, octave: 0, len: 2 },
      { step: 35, degree: 3, octave: 0, len: 2 },
      { step: 37, degree: 5, octave: 0, len: 2 },
      { step: 39, degree: 3, octave: 0, len: 2 },
      { step: 41, degree: 1, octave: 0, len: 4 },
      { step: 48, degree: 5, octave: -1, len: 1 },
      // Bar 4: the ending. F# F# F#, D, B, G#, and A held through the bar line.
      { step: 49, degree: 6, octave: -1, len: 2 },
      { step: 51, degree: 6, octave: -1, len: 1 },
      { step: 52, degree: 6, octave: -1, len: 1 },
      { step: 53, degree: 4, octave: 0, len: 2 },
      { step: 55, degree: 2, octave: 0, len: 2 },
      { step: 57, degree: 7, octave: -1, len: 2 },
      { step: 59, degree: 1, octave: 0, len: 6 },
    ],
  },
  pattern: variant(
    'broken-toy-music-box-stumble-grid',
    'lead',
    0,
    64,
    at('accent', 96, 1, 17, 33, 49),
    on('downbeat', 5, 9, 21, 29, 37, 41, 53, 57),
    on('offbeat', 3, 7, 15, 19, 31, 35, 39, 51, 55, 59),
    at('ghost', 60, 22, 24, 26, 48, 52),
  ),
}
