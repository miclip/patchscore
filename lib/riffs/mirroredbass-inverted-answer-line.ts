import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The MirroredBass inverted answer line**: a two-bar call that climbs, answered by the
 * same shape upside down.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * unison bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## One note at a time, by construction
 *
 * The program this is named for is printed UNISON, which stacks every voice on one key, so a
 * figure that asked for two notes at once would be asking for something the sound cannot do. No
 * two notes here overlap, and `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## The mirror, which is in scale steps and not in semitones
 *
 * The call is `1 3 4 5` in E minor, climbing; the answer is `1 6 5 4` below it, falling by the
 * same steps. A mirror in semitones would leave the key, and a line that leaves the key on the
 * answer is a different lesson.
 */
export const mirroredbassInvertedAnswerLine: Riff = {
  id: 'mirroredbass-inverted-answer-line',
  name: 'The MirroredBass inverted answer line',
  reference: { kind: 'patch', name: 'MirroredBass' },
  bpm: { min: 118, max: 134, default: 126 },
  key: 'E minor',
  technique: [
    'Two bars up, two bars down. The call climbs E, G, A, B and settles back on E; the answer ' +
      'takes the same steps in the other direction, E, C, B, A, and climbs back to E.',
    'One note at a time. Every note is released before the next is struck, and the octave the ' +
      'sound stacks on each key is what makes a single line read as wide.',
    'The bar head is the loud one and it is always the root. The rest of the bar is quieter ' +
      'and moves; the head is where the line comes home.',
    'The last two beats of each phrase hold. A bass line that never rests is a bass line ' +
      'nobody can hear the shape of.',
    'Do not mirror in semitones. E up to G mirrored in semitones is E down to C sharp, which ' +
      'is out of the key, and the answer should sound like the same line and not a modulation.',
  ],
  request: {
    id: 'mirroredbass-inverted-answer-line',
    role: 'bass-mid',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * Four bars, one figure. `baseOctave: 2` puts `E2` at degree 1, where a bass sits; the answer
   * reaches down to `A1` and nothing here rises above `B2`.
   */
  hook: {
    id: 'mirroredbass-inverted-answer-line-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // The call: E2, E2, G2, A2, B2 held.
      { step: 1, degree: 1, octave: 0, len: 4 },
      { step: 5, degree: 1, octave: 0, len: 2 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 9, degree: 4, octave: 0, len: 4 },
      { step: 13, degree: 5, octave: 0, len: 4 },
      // Turning back: B2, A2, G2, and E2 held for two beats.
      { step: 17, degree: 5, octave: 0, len: 2 },
      { step: 19, degree: 4, octave: 0, len: 2 },
      { step: 21, degree: 3, octave: 0, len: 4 },
      { step: 25, degree: 1, octave: 0, len: 8 },
      // The answer, upside down: E2, E2, C2, B1, A1 held.
      { step: 33, degree: 1, octave: 0, len: 4 },
      { step: 37, degree: 1, octave: 0, len: 2 },
      { step: 39, degree: 6, octave: -1, len: 2 },
      { step: 41, degree: 5, octave: -1, len: 4 },
      { step: 45, degree: 4, octave: -1, len: 4 },
      // Climbing home: A1, B1, C2, and E2 held for two beats.
      { step: 49, degree: 4, octave: -1, len: 2 },
      { step: 51, degree: 5, octave: -1, len: 2 },
      { step: 53, degree: 6, octave: -1, len: 4 },
      { step: 57, degree: 1, octave: 0, len: 8 },
    ],
  },
  pattern: variant(
    'mirroredbass-inverted-answer-line-grid',
    'bass-mid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('downbeat', 5, 9, 13, 21, 25, 37, 41, 45, 53, 57),
    on('offbeat', 7, 19, 39, 51),
  ),
}
