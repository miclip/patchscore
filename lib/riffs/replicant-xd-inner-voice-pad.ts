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
 * Three notes for six bars. `C#3` at the bottom and `E4` on top hold across the first three
 * chords, and the voice between them is the only thing that moves: `G#3` over the `i`, up a
 * semitone to `A3` over the `VI`, down a minor third to `F#3` over the `iv`. The outer two
 * change their names under it without changing pitch: the `C#3` is the root, then the third,
 * then the fifth, and the `E4` is the third, the fifth, then the seventh. On the `V` everything
 * moves at once and a fourth voice arrives: the bottom drops a fourth to `G#2`, the inner voice
 * rises a tone to `G#3`, the top falls a semitone to `D#4`, and `B#3` enters between them as
 * the third the chord is built on. That is the one bar in eight where more than one thing
 * happens, and the six bars before it are what make it land. On the repeat the `G#3` is already
 * in place as the inner voice and the top lifts back to `E4` by a semitone.
 *
 * The first published version moved the bass under the held `C#3` on the second and third
 * chords, so the note the prose called the bottom stopped being the bottom at bar 3 and the
 * inner voice moved once in six bars while the bass moved twice. The claim was right and the
 * notes were not; the notes are what changed.
 *
 * ## What the `iv` gives up
 *
 * `C#3 F#3 E4` over the F# minor is the fifth, the root and the seventh, and no third. Keeping the third
 * would mean holding the `A3` from the `VI`, and then nothing in the pad moves when the chord
 * does: `C#3 A3 E4` is the A major and the F# minor alike. The moving voice is the lesson, so
 * the third is what the pad leaves to the chord table.
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
    'Three notes, and hold the outside. C sharp at the bottom and E on top stay exactly where ' +
      'they are for six bars; the note between them is the only thing that moves, and the ear ' +
      'follows the one line that is moving.',
    'The inner voice goes G sharp, A, F sharp: up a semitone into the A major, then down a ' +
      'minor third into the F sharp minor. Nothing else changes and the chord changes its ' +
      'name each time, because the two held notes mean something different over each one: ' +
      'the C sharp is the root, then the third, then the fifth.',
    'On the last chord everything moves at once and a fourth voice arrives. The bottom drops ' +
      'a fourth to G sharp, the inner voice rises a tone to G sharp above it, the top falls a ' +
      'semitone to D sharp, and B sharp enters between them. Six bars of nearly nothing is ' +
      'what makes that bar land.',
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
    // §12.4. Three held notes for six bars, four on the last chord.
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
   * octave up, and the `V` chord's `B#3` is degree 7 raised. Within a step the notes are
   * authored bottom to top, and that order is the voicing (`resolveHook` keeps it).
   */
  hook: {
    id: 'replicant-xd-inner-voice-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `i`: C#3 G#3 E4.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 1, len: 32 },
      // `VI`: C#3 A3 E4. The inner voice up a semitone; the outer two hold.
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 6, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 1, len: 32 },
      // `iv`: C#3 F#3 E4. The inner voice down a minor third; the outer two hold.
      { step: 65, degree: 1, octave: 0, len: 32 },
      { step: 65, degree: 4, octave: 0, len: 32 },
      { step: 65, degree: 3, octave: 1, len: 32 },
      // `V`: G#2 G#3 B#3 D#4. Everything moves, and the fourth voice enters as the third.
      { step: 97, degree: 5, octave: -1, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
      { step: 97, degree: 7, octave: 0, len: 32, alter: 1 },
      { step: 97, degree: 2, octave: 1, len: 32 },
    ],
  },
}
