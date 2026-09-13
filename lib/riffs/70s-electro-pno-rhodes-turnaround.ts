import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The '70s Electro Pno Rhodes turnaround**: a top line over extended chords that lands on
 * the flat ninth of the dominant late and resolves it down.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * electric-piano sound; the notes are this library's own, and the entry names no device
 * (invariant 3). The reference opens with an apostrophe and a digit, which `referenceSlug`
 * folds to `70s-electro-pno`, so this is the entry whose id sorts before every letter in the
 * registry (§7.2).
 *
 * ## Why two notes are lowered, and why only one of them is the point
 *
 * F major has no `Eb`. The figure plays one twice, both as `alter: -1` on degree 7. Over the
 * `ii` it is a passing tone on the way down from G, and over the `VI7` it is the flat ninth of
 * D7, which is the whole reason the turnaround sounds like one. The chord table is what says
 * which is which: the same lowered degree is a colour on one chord and a chord tone on the
 * other.
 *
 * ## Why the fourth is forbidden over the I
 *
 * `Bb` against the major third of an F major ninth chord is the avoid note, and a comping
 * figure that touched it would lose the chord it is voicing. One rule, as data.
 */
export const seventiesElectroPnoRhodesTurnaround: Riff = {
  id: '70s-electro-pno-rhodes-turnaround',
  name: "The '70s Electro Pno Rhodes turnaround",
  reference: { kind: 'patch', name: "'70s Electro Pno" },
  bpm: { min: 80, max: 100, default: 88 },
  key: 'F major',
  technique: [
    'A top line over four extended chords, entering on beat two every bar. The chords ' +
      'underneath are a major ninth, two minor sevenths and a dominant with a flat ninth, and ' +
      'the line picks one colour tone off each.',
    'Over the first chord, hold the ninth. Over the second, walk down from G through F to Eb, ' +
      'one note a beat. Over the third, hold the fifth.',
    'The Eb over the last chord is the flat ninth and the whole point of the turnaround. Land ' +
      'on it late, on beat three, and let it resolve down to D on beat four. Never approach it ' +
      'from below.',
    'Never play Bb while the first chord is sounding. It is the fourth against the major third, ' +
      'and a comping figure that touches it loses the chord it is voicing.',
    'Keep every entry a beat or more into its chord. The bass and the chord land on the bar ' +
      'head; this line answers them.',
  ],
  request: {
    id: '70s-electro-pno-rhodes-turnaround',
    role: 'stab',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The avoid note over the `I` as data, and the beat-two entry as data. Four steps
   * is one beat.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it is the avoid note against the major third of the chord',
      },
    ],
    onsetOffset: {
      minSteps: 4,
      reason: 'the bass and the chord land on the bar head and this line answers them',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'ii', bars: 1 },
      { degree: 'iii', bars: 1 },
      { degree: 'VI7', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 4` puts `F4` at degree 1, so the line sits in the
   * octave above middle C. The last D runs past the bar line into the next pass, where it is
   * the sixth of the `I`.
   */
  hook: {
    id: '70s-electro-pno-rhodes-turnaround-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`: the ninth, G5, on beat two.
      { step: 5, degree: 2, octave: 1, len: 12 },
      // `ii`: G5, F5, Eb5, a beat each from beat two. The Eb is a lowered seventh of the key.
      { step: 21, degree: 2, octave: 1, len: 4 },
      { step: 25, degree: 1, octave: 1, len: 4 },
      { step: 29, degree: 7, octave: 0, len: 4, alter: -1 },
      // `iii`: the fifth of the chord, E5, on beat two.
      { step: 37, degree: 7, octave: 0, len: 12 },
      // `VI7`: the flat ninth, Eb5, on beat three, resolving down to D5 on beat four.
      { step: 57, degree: 7, octave: 0, len: 4, alter: -1 },
      { step: 61, degree: 6, octave: 0, len: 8 },
    ],
  },
  pattern: variant(
    '70s-electro-pno-rhodes-turnaround-grid',
    'stab',
    0,
    64,
    at('accent', 90, 57),
    on('backbeat', 5, 21, 29, 37, 61),
    on('downbeat', 25),
  ),
}
