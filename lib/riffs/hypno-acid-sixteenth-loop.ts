import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Hypno Acid sixteenth loop**: a one-bar acid figure and its answer, one key at a
 * time, that never raises its sixth.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * acid bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## One note at a time, by construction
 *
 * The program is printed CHORD, so one key sounds the whole stack and two keys would be two
 * stacks. Every note here is a sixteenth or an eighth and none overlaps the next; the peak is
 * one, and `test/korg-minilogue-xd.test.ts` counts it.
 *
 * ## Why the raised sixth is forbidden
 *
 * A minor's sixth is `F`. Raise it to `F#` and the loop is in A dorian, which is the move that
 * turns an acid line into a jazz line. `F#` is not in the key, so the rule reaches the whole
 * piece (§5A.8), and the figure keeps it by never playing the sixth at all.
 */
export const hypnoAcidSixteenthLoop: Riff = {
  id: 'hypno-acid-sixteenth-loop',
  name: 'The Hypno Acid sixteenth loop',
  reference: { kind: 'patch', name: 'Hypno Acid' },
  bpm: { min: 126, max: 140, default: 132 },
  key: 'A minor',
  technique: [
    'One bar, repeated, with a different turn in the second bar. The root on every beat, the ' +
      'octave on the last sixteenth before beat two, and the seventh below it on the "and" of ' +
      'two. That is the hypnosis: the same three moves, over and over.',
    'One key at a time. The sound stacks the voices for you, so a second key is a second stack ' +
      'and the line turns to mud.',
    'Sixteenths, never eighths. The gaps are as short as the notes, and a line with room in it ' +
      'is a bass line, not an acid line.',
    'The second bar swaps the third for a fourth and the fifth for the seventh below. Two ' +
      'notes changed and nothing else, so the ear hears the loop and then hears it move.',
    'Never play F sharp. It is the raised sixth of A minor, and one F sharp turns the loop ' +
      'from acid into something that wants a chord under it.',
    'The bar head is the loud one and the octave jump is the other. Everything between is ' +
      'quieter, and the two accents are what the loop hangs on.',
  ],
  request: {
    id: 'hypno-acid-sixteenth-loop',
    role: 'bass-mid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The dorian sixth as data, over the `i`, and reaching the whole piece because the
   * key does not have it.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 6,
        alter: 1,
        reason: 'the raised sixth turns the loop from acid into a jazz line',
      },
    ],
  },
  harmony: {
    cycleBars: 2,
    progression: [{ degree: 'i', bars: 2 }],
  },
  /**
   * Two bars, the whole loop. `baseOctave: 1` puts `A1` at degree 1, two octaves and a third
   * below middle C, and the octave jump reaches `A2`. Every note is one step long except the
   * two the loop leans into, which are two.
   */
  hook: {
    id: 'hypno-acid-sixteenth-loop-hook',
    forRole: 'bass-mid',
    bars: 2,
    baseOctave: 1,
    notes: [
      // Bar 1: root, root, octave, root, seventh below, root, third, root, octave leaned on, fifth.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 1, octave: 0, len: 1 },
      { step: 4, degree: 1, octave: 1, len: 1 },
      { step: 6, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 7, octave: -1, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 11, degree: 3, octave: 0, len: 1 },
      { step: 12, degree: 1, octave: 0, len: 1 },
      { step: 14, degree: 1, octave: 1, len: 2 },
      { step: 16, degree: 5, octave: 0, len: 1 },
      // Bar 2: the same shape, with the fourth for the third and the seventh below for the fifth.
      // Exactly two notes differ, and `test/korg-minilogue-xd.test.ts` counts them: the first published
      // version also swapped the root after the fourth for a third, and said two.
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 19, degree: 1, octave: 0, len: 1 },
      { step: 20, degree: 1, octave: 1, len: 1 },
      { step: 22, degree: 1, octave: 0, len: 1 },
      { step: 23, degree: 7, octave: -1, len: 1 },
      { step: 25, degree: 1, octave: 0, len: 1 },
      { step: 27, degree: 4, octave: 0, len: 1 },
      { step: 28, degree: 1, octave: 0, len: 1 },
      { step: 30, degree: 1, octave: 1, len: 2 },
      { step: 32, degree: 7, octave: -1, len: 1 },
    ],
  },
  pattern: variant(
    'hypno-acid-sixteenth-loop-grid',
    'bass-mid',
    0,
    32,
    at('accent', 120, 1, 17),
    at('accent', 110, 4, 20),
    on('downbeat', 9, 25),
    on('offbeat', 3, 7, 11, 19, 23, 27),
    at('ghost', 72, 6, 12, 14, 16, 22, 28, 30, 32),
  ),
}
