import type { Riff } from '../core/riff'

/**
 * §5A. **The CELESTIAL converging-voices pad**: two voices an octave apart, and over eight bars
 * the lower one climbs and the upper one finally drops, until they are a third apart.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is the pad; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## Two voices converging
 *
 * `A3` under `A4` for two bars, an octave. Then the lower voice moves up a third to `C#4`, a
 * sixth. Then up a semitone to `D4`, a fifth. Then up a tone to `E4` while the upper voice
 * moves for the first and only time, down a semitone to `G#4`, a third. Four intervals,
 * closing one at a time: octave, sixth, fifth, third. The lower voice does the work for three
 * chords and the upper voice waits, and the figure is the moment the upper voice gives in.
 *
 * #624's figure was one pitch held for eight bars and lifted an octave, two notes and one at a
 * time. It was `pad / soft` on a box that authors only `pad / dark`, and so is this; the
 * substitution lands on the duo pad and gets its two notes, which
 * `test/moog-subsequent-37.test.ts` holds. This replaces it (#643).
 *
 * ## Two notes, exactly, and what the second is for
 *
 * The peak is two for the whole figure and never three; `polyphony: 2` says so and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes, and this entry
 * spends both as counterpoint. `duotronic-moogtrons-pedal-and-line-pad` on the same box is a
 * pedal with a line over it, where the held note never moves; here the held note is the top
 * one and it does move, once, at the end, and the interest is the closing distance and not
 * the pedal. The lower voice is always the lower, so a box that hands the lowest key to one
 * oscillator keeps each voice where it started.
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid and no `reArticulatesHook`.
 * Every note enters on its chord head and runs the chord; the upper `A4` runs three chords.
 *
 * ## The harmony is context, and every note is a chord tone
 *
 * `I vi IV V` in A major, two bars each: A, F#m, D, E. `A3` and `A4` are the root of the A;
 * `C#4` is the fifth of the F# minor and `A4` its third; `D4` is the root of the D and `A4`
 * its fifth; `E4` is the root of the E and `G#4` its third. Nothing is chromatic and nothing
 * is a suspension, so there is no rule to state as data and `constraints` is absent. The
 * `G#` is the key's own seventh, and the pass re-entering on `A3 + A4` is where it goes.
 */
export const celestialConvergingVoicesPad: Riff = {
  id: 'celestial-converging-voices-pad',
  name: 'The CELESTIAL converging-voices pad',
  reference: { kind: 'patch', name: 'CELESTIAL' },
  bpm: { min: 60, max: 84, default: 72 },
  key: 'A major',
  technique: [
    'Two notes, and the figure is the distance between them closing. Start an octave apart, A ' +
      'and the A above, and hold both for two bars.',
    'The lower note moves and the upper one waits. Over the F sharp minor, lift the lower A ' +
      'to C sharp: a sixth. Over the D, lift it to D: a fifth. The upper A does not move for ' +
      'six bars.',
    'Over the E, both move: the lower D up to E, and the upper A down to G sharp for the first ' +
      'time in the figure. A third. That is the arrival, and it is the only time the top ' +
      'voice moves.',
    'Enter each note on the head of its chord and hold it to the next change. No gaps and no ' +
      'restrikes. Where a voice does not move, keep the key down across the change.',
    'Keep the lower voice the lower. The distance closes from an octave to a sixth, a fifth ' +
      'and a third, and the two never cross; the ear follows the closing.',
    'After the third, the next pass opens back out to the octave. Let the G sharp resolve up ' +
      'to A and the E fall back to the low A at the same moment, and the figure has breathed.',
  ],
  request: {
    id: 'celestial-converging-voices-pad',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §12.4. Both voices, and never a third note.
    polyphony: 2,
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `A3` at degree 1; the lower
   * voice runs from `A3` to `E4` and the upper is `A4` and `G#4`.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, six notes. The lower voice is four notes of thirty-two, one a chord. The upper
   * is `A4` for ninety-six steps and `G#4` for thirty-two.
   */
  hook: {
    id: 'celestial-converging-voices-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // The lower voice: A3, C#4, D4, E4, one a chord.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 65, degree: 4, octave: 0, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
      // The upper voice: A4 across the I, the vi and the IV, then G#4 over the V.
      { step: 1, degree: 1, octave: 1, len: 96 },
      { step: 97, degree: 7, octave: 0, len: 32 },
    ],
  },
}
