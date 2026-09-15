import type { Riff } from '../core/riff'

/**
 * §5A. **The Replicant xd inner-voice pad**: eight slow bars in C# minor where the outer notes
 * hold and one voice inside moves.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * pad; the voicings are this library's own, and the entry names no device (invariant 3).
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid. **Four notes at most**, which is
 * what a four-voice program can hold, and `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## The inner voice
 *
 * `C#3` at the bottom and `E4` on top hold across the first three chords while the voice
 * between them walks: `G#3` over the `i`, `A3` over the `VI` and the `iv`. On the `V` the top
 * falls a semitone to `D#4` and the inner voice rises to `B#3`, the raised seventh the chord is
 * built on, and that is the one bar in eight where everything moves.
 *
 * ## Why the natural seventh is forbidden over the V
 *
 * The `V` in C# minor is G# major, and its third is `B#`. A `B` natural against it is two
 * leading tones a semitone apart, the one clash a slow pad cannot cover. Unaltered, so the
 * rule reaches only the chord it names (§5A.8): `B` is the key's own note and belongs over the
 * other three.
 */
export const replicantXdInnerVoicePad: Riff = {
  id: 'replicant-xd-inner-voice-pad',
  name: 'The Replicant xd inner-voice pad',
  reference: { kind: 'patch', name: 'Replicant xd' },
  bpm: { min: 60, max: 76, default: 68 },
  key: 'C# minor',
  technique: [
    'Eight bars, four chords, two bars each. C sharp minor, A major, F sharp minor, G sharp ' +
      'major. Slow enough that each chord is heard settling before it goes.',
    'Hold the outside and move the inside. C sharp at the bottom and E on top stay put for ' +
      'six bars; the note between them is the only thing that changes, and the ear follows it.',
    'Three notes on the first chord and four on the rest. The fourth voice enters with the ' +
      'second chord, and the pad thickens without anyone striking anything.',
    'On the last chord everything moves at once: the top falls to D sharp, the inner voice ' +
      'rises to B sharp, and the bass drops to G sharp. Six bars of nearly nothing is what ' +
      'makes that bar land.',
    'Never play B natural while the G sharp major is sounding. The chord has a B sharp in it, ' +
      'and the two a semitone apart is a clash a slow pad cannot hide.',
    'Keep the attack slow and change chords a fraction early. A slow pad reaches full ' +
      'volume after the bar head, so the change has to start before it.',
  ],
  request: {
    id: 'replicant-xd-inner-voice-pad',
    role: 'pad',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    // §12.4. Four held notes on three of the four chords.
    polyphony: 4,
  },
  /**
   * §5A/#554. The natural seventh over the `V` as data, and only over the `V`.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the chord is built on the raised seventh, and the natural one a semitone away clashes with it',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * Eight bars. `baseOctave: 3` puts `C#3` at degree 1; the top voice is `E4`, degree 3 an
   * octave up, and the `V` chord's `B#3` is degree 7 raised.
   */
  hook: {
    id: 'replicant-xd-inner-voice-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `i`: C#3 G#3 E4 — three notes.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 1, len: 32 },
      // `VI`: A2 C#3 A3 E4 — the inner voice steps up to A.
      { step: 33, degree: 6, octave: -1, len: 32 },
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 6, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 1, len: 32 },
      // `iv`: F#2 C#3 A3 E4 — only the bass moves.
      { step: 65, degree: 4, octave: -1, len: 32 },
      { step: 65, degree: 1, octave: 0, len: 32 },
      { step: 65, degree: 6, octave: 0, len: 32 },
      { step: 65, degree: 3, octave: 1, len: 32 },
      // `V`: G#2 D#3 B#3 D#4 — everything moves.
      { step: 97, degree: 5, octave: -1, len: 32 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 7, octave: 0, len: 32, alter: 1 },
      { step: 97, degree: 2, octave: 1, len: 32 },
    ],
  },
}
