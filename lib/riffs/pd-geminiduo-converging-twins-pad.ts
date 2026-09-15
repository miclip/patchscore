import type { Riff } from '../core/riff'

/**
 * §5A. **The PD GeminiDuo converging-twins pad**: two held notes that start an octave apart and
 * walk toward each other over four chords, the top falling a step and the bottom rising one,
 * until they are a tone apart and the pass throws them back to the octave.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * two-voice pad; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *twins* and *duo*, and the figure
 * takes both at their word visibly: two voices of equal weight, neither of them the tune, and
 * the lesson is the interval between them and how it moves. The prose says what to play and
 * nothing about what the preset sounds like, because the name is the whole of the evidence
 * (§3.7).
 *
 * ## Two notes, exactly, and why this is the box's own shape
 *
 * The box this patch ships on plays two notes, and this entry is one of two written to spend
 * the second one on purpose. `polyphony: 2`, and the peak is exactly two: each chord is one
 * dyad, both notes entered together and held thirty-two steps, and the next dyad begins the
 * step after. `test/riff.test.ts` counts it. A third note would be past the hardware, and
 * the chord is context that something else plays or nothing does.
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid and no `reArticulatesHook`.
 *
 * ## The twins never cross
 *
 * The bottom voice is `D3 E3 F3 G3` and the top is `D4 C4 Bb3 A3`: contrary motion by step,
 * closing from an octave through a minor sixth and a fourth to a major second. The lower note
 * is always the lower note, so on a box that hands the bottom key to one oscillator and the
 * top to the other, each voice keeps its own line for the whole pass.
 *
 * ## The harmony is context, and each dyad is two tones of its chord
 *
 * `i VII VI v7` in D minor, two bars each. `D D` over the Dm; `E C` over the C major, its third
 * and root; `F Bb` over the Bb, its fifth and root; `G A` over the A minor seventh, its seventh
 * and root, which is where the twins nearly meet.
 *
 * ## Why the raised seventh is forbidden
 *
 * The last chord is minor so that the near-meeting is a tension held rather than a cadence
 * pointing home. `C#` is not in D minor, so the rule reaches the whole piece (§5A.8), and no
 * chord of the cycle carries it.
 */
export const pdGeminiduoConvergingTwinsPad: Riff = {
  id: 'pd-geminiduo-converging-twins-pad',
  name: 'The PD GeminiDuo converging-twins pad',
  reference: { kind: 'patch', name: 'PD GeminiDuo' },
  bpm: { min: 60, max: 80, default: 70 },
  key: 'D minor',
  technique: [
    'Two notes, held, two bars at a time. Start them an octave apart on D, and over four ' +
      'chords walk them toward each other: the top falls a step each chord and the bottom ' +
      'rises one.',
    'The name says twins, so the figure is two voices of equal weight and neither is the ' +
      'tune. What the ear follows is the space between them: an octave, then a sixth, then a ' +
      'fourth, then a tone.',
    'Change both notes together on the bar head and then change nothing for two bars. The ' +
      'figure is the pair moving. Move one at a time and it becomes a melody over a drone, ' +
      'which is a different figure.',
    'The lower note is always the lower note. The twins never cross, so whichever voice has ' +
      'the bottom keeps it for the whole pass and the top stays on top.',
    'The last chord is where they nearly meet: G under A, a tone apart, over the A minor ' +
      'seventh. Hold it the full two bars, then throw them back to the octave on the next pass.',
    'Never play C sharp. The last chord stays minor so the near-meeting is a tension held; a ' +
      'raised third under it would turn the whole cycle into a cadence pointing home.',
  ],
  request: {
    id: 'pd-geminiduo-converging-twins-pad',
    role: 'pad',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    // §12.4. Two held notes on every chord, and never a third.
    polyphony: 2,
  },
  /**
   * §5A/#554. The raised seventh as data, over the `v7` where it would matter, and reaching the
   * whole piece because the key does not have it. Every entry is on the bar head, so there is
   * no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'v7',
        degree: 7,
        alter: 1,
        reason: 'the raised seventh makes the last chord a dominant and the near-meeting a cadence',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VII', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'v7', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `D3` at degree 1; the top voice
   * starts on `D4` and nothing rises above it.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, four dyads, each thirty-two steps and both notes on the same step. The bottom
   * climbs `D3 E3 F3 G3`; the top falls `D4 C4 Bb3 A3`.
   */
  hook: {
    id: 'pd-geminiduo-converging-twins-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `i`: the octave, D3 and D4.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 1, octave: 1, len: 32 },
      // `VII`: a minor sixth, E3 and C4.
      { step: 33, degree: 2, octave: 0, len: 32 },
      { step: 33, degree: 7, octave: 0, len: 32 },
      // `VI`: a fourth, F3 and Bb3.
      { step: 65, degree: 3, octave: 0, len: 32 },
      { step: 65, degree: 6, octave: 0, len: 32 },
      // `v7`: a tone, G3 and A3.
      { step: 97, degree: 4, octave: 0, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
    ],
  },
}
