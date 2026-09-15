import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Lush m7 parallel root line**: single keys that each sound a minor seventh chord,
 * walking the one, four and five of D minor.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * chord program; the line is this library's own, and the entry names no device (invariant 3).
 *
 * ## One key at a time, and the key is a chord
 *
 * The program is printed CHORD: one key sounds the whole stack, and the stack is a minor
 * seventh built on whatever key is held. So the hook is a line of roots and nothing overlaps
 * — two keys would be two chords — and `test/korg-minilogue-xd.test.ts` counts the peak at
 * one. The chord table says what each root becomes: `i7`, `iv7`, `v7`, the three minor
 * sevenths D minor has.
 *
 * ## Why the second is forbidden
 *
 * A minor seventh on `E` carries a `B` natural, and D minor has none. The rule is on the root
 * rather than on the note the key lacks, because the root is what the hand plays: an `E` is
 * not a wrong note, it is a wrong chord. Unaltered, so it reaches the chord it names (§5A.8),
 * and the figure keeps it everywhere by playing only the three roots that stay in the key.
 */
export const lushM7ParallelRootLine: Riff = {
  id: 'lush-m7-parallel-root-line',
  name: 'The Lush m7 parallel root line',
  reference: { kind: 'patch', name: 'Lush m7' },
  bpm: { min: 72, max: 92, default: 82 },
  key: 'D minor',
  technique: [
    'One key at a time, and each key is a whole minor seventh chord. Play D for two bars, G ' +
      'for one, A for one, and the sound turns the line into D minor seventh, G minor seventh, ' +
      'A minor seventh.',
    'Two strikes a bar: the head, held for two beats, and a push on the "and" of three, held ' +
      'to the bar line. The push is what makes four chords feel like a groove and not a hymn.',
    'Only D, G and A. Every key sounds the same shape, so a key outside those three sounds a ' +
      'chord outside the key. E in particular carries a B natural that D minor does not have.',
    'Keep it in one octave. Every chord is the same shape moved along the keyboard, and the ' +
      'shape reads best when the roots stay close.',
    'The head of the first bar is the loud one and the pushes are lighter. Four bars, then ' +
      'round again; the loop is the point.',
  ],
  request: {
    id: 'lush-m7-parallel-root-line',
    role: 'stab',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The second as data, over the `i7`: a minor seventh built on it leaves the key.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i7',
        degree: 2,
        reason: 'a minor seventh built on E carries a B natural the key does not have',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i7', bars: 2 },
      { degree: 'iv7', bars: 1 },
      { degree: 'v7', bars: 1 },
    ],
  },
  /**
   * Four bars. `baseOctave: 3` puts `D3` at degree 1, an octave below middle C, so the chord
   * the program builds on each root sits across middle C.
   */
  hook: {
    id: 'lush-m7-parallel-root-line-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 3,
    notes: [
      // `i7`: D3 on the head, D3 pushed on the "and" of three, twice.
      { step: 1, degree: 1, octave: 0, len: 8 },
      { step: 11, degree: 1, octave: 0, len: 6 },
      { step: 17, degree: 1, octave: 0, len: 8 },
      { step: 27, degree: 1, octave: 0, len: 6 },
      // `iv7`: G3.
      { step: 33, degree: 4, octave: 0, len: 8 },
      { step: 43, degree: 4, octave: 0, len: 6 },
      // `v7`: A3.
      { step: 49, degree: 5, octave: 0, len: 8 },
      { step: 59, degree: 5, octave: 0, len: 6 },
    ],
  },
  pattern: variant(
    'lush-m7-parallel-root-line-grid',
    'stab',
    0,
    64,
    at('accent', 112, 1),
    on('downbeat', 17, 33, 49),
    on('offbeat', 11, 27, 43, 59),
  ),
}
