import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The MetalFnkLead syncopated funk line**: a two-bar dorian phrase, one key at a time,
 * that lands its sixth where the ear expects a flat one.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * funk lead; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## One note at a time, by construction
 *
 * The program is printed CHORD, so one key sounds the whole stack. Nothing here overlaps, and
 * `test/korg-minilogue-xd.test.ts` counts the peak at one.
 *
 * ## Why the flat sixth is forbidden
 *
 * D dorian's sixth is `B`, and it is the note that makes a minor line funky rather than sad.
 * Flatten it to `Bb` and the line is in D aeolian. `Bb` is not in the key, so the rule reaches
 * the whole piece (§5A.8); the figure plays the natural sixth once, on the "and" of three in
 * the second bar, and it is the note the whole phrase is built to reach.
 */
export const metalfnkleadSyncopatedFunkLine: Riff = {
  id: 'metalfnklead-syncopated-funk-line',
  name: 'The MetalFnkLead syncopated funk line',
  reference: { kind: 'patch', name: 'MetalFnkLead' },
  bpm: { min: 100, max: 116, default: 108 },
  key: 'D dorian',
  technique: [
    'Two bars. Two short roots on the head, a leap to the third on the "and" of one, the ' +
      'fourth and fifth pushing through beat two, then the seventh on the "and" of three and a ' +
      'run back down to the root.',
    'The second bar is the first with one change: the sixth, B, on the "and" of three where the ' +
      'seventh was. It is the only B in the phrase and the phrase exists to get to it.',
    'One key at a time. The sound stacks the voices on each key, and a second key is a second ' +
      'stack.',
    'Short notes on the beat and longer ones off it. The pushes are the ones that hold, and ' +
      'that is what makes the line lean forward.',
    'Never play B flat. It is the flat sixth, and one B flat turns dorian into a minor key and ' +
      'the funk into a ballad.',
    'The bar head is the loud one. The rest of the bar plays under it, and the run down at the ' +
      'end of each bar is the quietest thing in the phrase.',
  ],
  request: {
    id: 'metalfnklead-syncopated-funk-line',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The flat sixth as data, over the `i7`, reaching the whole piece because the key
   * does not have it.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i7',
        degree: 6,
        alter: -1,
        reason: 'the flat sixth turns dorian into a minor key and the funk into a ballad',
      },
    ],
  },
  harmony: {
    cycleBars: 2,
    progression: [{ degree: 'i7', bars: 2 }],
  },
  /**
   * Two bars. `baseOctave: 4` puts `D4` at degree 1, middle of the keyboard, and the line spans
   * `D4` to `D5`.
   */
  hook: {
    id: 'metalfnklead-syncopated-funk-line-hook',
    forRole: 'lead',
    bars: 2,
    baseOctave: 4,
    notes: [
      // Bar 1: D D, F held, G, A held, C on the "and" of three, then A G F D back down.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 2, degree: 1, octave: 0, len: 1 },
      { step: 4, degree: 3, octave: 0, len: 2 },
      { step: 7, degree: 4, octave: 0, len: 1 },
      { step: 8, degree: 5, octave: 0, len: 2 },
      { step: 11, degree: 7, octave: 0, len: 1 },
      { step: 12, degree: 5, octave: 0, len: 1 },
      { step: 14, degree: 4, octave: 0, len: 1 },
      { step: 15, degree: 3, octave: 0, len: 1 },
      { step: 16, degree: 1, octave: 0, len: 1 },
      // Bar 2: the same, with B on the "and" of three, and a climb through C to the octave.
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 18, degree: 1, octave: 0, len: 1 },
      { step: 20, degree: 3, octave: 0, len: 2 },
      { step: 23, degree: 4, octave: 0, len: 1 },
      { step: 24, degree: 5, octave: 0, len: 2 },
      { step: 27, degree: 6, octave: 0, len: 1 },
      { step: 28, degree: 5, octave: 0, len: 1 },
      { step: 30, degree: 7, octave: 0, len: 1 },
      { step: 31, degree: 1, octave: 1, len: 2 },
    ],
  },
  pattern: variant(
    'metalfnklead-syncopated-funk-line-grid',
    'lead',
    0,
    32,
    at('accent', 118, 1, 17),
    on('downbeat', 12, 28),
    on('offbeat', 7, 11, 15, 23, 27, 31),
    at('ghost', 70, 2, 4, 8, 14, 16, 18, 20, 24, 30),
  ),
}
