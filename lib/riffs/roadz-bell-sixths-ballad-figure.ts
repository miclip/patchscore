import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Roadz Bell sixths ballad figure**: two notes a sixth apart, three strikes a bar,
 * over four slow chords in D.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * bell-toned keys program; the dyads are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## Two notes at a time
 *
 * Every strike is a dyad and every dyad is a sixth, major or minor as the key gives it.
 * `polyphony: 2` is that width, inside the four the program is printed with, and
 * `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## Why the fourth is forbidden over the I
 *
 * D major's fourth is `G`, a semitone over the `F#` the first dyad carries, and a bell holds
 * whatever it is struck on. Over the `V` the same `G` is the seventh and the figure plays it
 * on purpose, on the last strike, to lean back to the `I`; unaltered, the rule reaches only
 * the chord it names (§5A.8).
 */
export const roadzBellSixthsBalladFigure: Riff = {
  id: 'roadz-bell-sixths-ballad-figure',
  name: 'The Roadz Bell sixths ballad figure',
  reference: { kind: 'patch', name: 'Roadz Bell' },
  bpm: { min: 66, max: 84, default: 74 },
  key: 'D major',
  technique: [
    'Four bars, four chords: D, B minor, G, A. Three strikes a bar, on one, three and four, ' +
      'and every strike is two notes a sixth apart.',
    'The first strike of the bar holds for two beats. The two after it are short, and the ' +
      'space before the next bar head is where a bell is heard ringing down.',
    'Choose the dyad from the chord. Over the D it is F sharp and D, then A and F sharp, then ' +
      'E and C sharp. The lower note is a chord tone and the upper one is a sixth above it.',
    'Keep the lower note under the upper by a sixth and never by a third. A third on a bell ' +
      'rings as one thick note; a sixth rings as two.',
    'Never play G while the D is sounding. It sits a semitone over the F sharp, and a bell ' +
      'holds it there. Over the A at the end it is the seventh, and the last strike plays it ' +
      'on purpose to lean home.',
    'The bar head is the loud strike. The two after it are lighter, and the last one of the ' +
      'four bars is the lightest of all.',
  ],
  request: {
    id: 'roadz-bell-sixths-ballad-figure',
    role: 'stab',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4. Two simultaneous notes: every strike is a dyad.
    polyphony: 2,
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
        reason: 'it sits a semitone over the third and a bell holds it there',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'vi', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * Four bars. `baseOctave: 4` puts `D4` at degree 1; the dyads sit from `D4` to `G5`.
   */
  hook: {
    id: 'roadz-bell-sixths-ballad-figure-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`: F#4–D5 held, A4–F#5, E4–C#5.
      { step: 1, degree: 3, octave: 0, len: 8 },
      { step: 1, degree: 1, octave: 1, len: 8 },
      { step: 9, degree: 5, octave: 0, len: 4 },
      { step: 9, degree: 3, octave: 1, len: 4 },
      { step: 13, degree: 2, octave: 0, len: 4 },
      { step: 13, degree: 7, octave: 0, len: 4 },
      // `vi`: D4–B4 held, F#4–D5, E4–C#5.
      { step: 17, degree: 1, octave: 0, len: 8 },
      { step: 17, degree: 6, octave: 0, len: 8 },
      { step: 25, degree: 3, octave: 0, len: 4 },
      { step: 25, degree: 1, octave: 1, len: 4 },
      { step: 29, degree: 2, octave: 0, len: 4 },
      { step: 29, degree: 7, octave: 0, len: 4 },
      // `IV`: G4–E5 held, B4–G5, A4–F#5.
      { step: 33, degree: 4, octave: 0, len: 8 },
      { step: 33, degree: 2, octave: 1, len: 8 },
      { step: 41, degree: 6, octave: 0, len: 4 },
      { step: 41, degree: 4, octave: 1, len: 4 },
      { step: 45, degree: 5, octave: 0, len: 4 },
      { step: 45, degree: 3, octave: 1, len: 4 },
      // `V`: E4–C#5 held, A4–F#5, G4–E5 — the seventh, leaning home.
      { step: 49, degree: 2, octave: 0, len: 8 },
      { step: 49, degree: 7, octave: 0, len: 8 },
      { step: 57, degree: 5, octave: 0, len: 4 },
      { step: 57, degree: 3, octave: 1, len: 4 },
      { step: 61, degree: 4, octave: 0, len: 4 },
      { step: 61, degree: 2, octave: 1, len: 4 },
    ],
  },
  pattern: variant(
    'roadz-bell-sixths-ballad-figure-grid',
    'stab',
    0,
    64,
    at('accent', 110, 1, 17, 33, 49),
    on('downbeat', 9, 13, 25, 29, 41, 45, 57),
    at('last-hit', 64, 61),
  ),
}
