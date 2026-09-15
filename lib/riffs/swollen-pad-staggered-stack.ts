import type { Riff } from '../core/riff'

/**
 * §5A. **The Swollen Pad staggered stack**: each chord built one voice a beat, bottom up, so
 * the pad swells into its voicing instead of arriving in it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * pad; the voicings are this library's own, and the entry names no device (invariant 3).
 *
 * ## A pad whose notes do not start together
 *
 * Held rather than struck (§5A.2, #608), so there is no grid, and the stagger is in the hook:
 * the four notes of each chord enter on beats one to four of its first bar and every one holds
 * to the chord's end. The peak is still four, one voice per note, and
 * `test/korg-minilogue-xd.test.ts` counts it as what sounds at once rather than what starts at
 * once, because that is the count a voice has to be found for.
 *
 * ## Why the fourth is forbidden over the I
 *
 * G major's fourth is `C`, a semitone over the `B` the voicing carries, and a slow attack
 * lingers on whatever it lands on. One rule, as data, over the chord the figure opens on.
 */
export const swollenPadStaggeredStack: Riff = {
  id: 'swollen-pad-staggered-stack',
  name: 'The Swollen Pad staggered stack',
  reference: { kind: 'patch', name: 'Swollen Pad' },
  bpm: { min: 70, max: 90, default: 80 },
  key: 'G major',
  technique: [
    'Four chords, two bars each: G, D, E minor, C. Each one is entered a note at a time, one ' +
      'on every beat of its first bar, from the bottom up, and every note holds until the ' +
      'chord changes.',
    'Bottom first, always. The bass note lands on the head, the next two chord tones on two ' +
      'and three, and the colour note on four, so the chord is heard growing rather than ' +
      'appearing.',
    'Let the notes go together. Everything lifts at the bar line before the next chord and ' +
      'the new bottom note lands alone on the head. The gap is part of the figure.',
    'The top note of each voicing is a ninth or a seventh: A over the G, E over the D, D over ' +
      'the E minor, B over the C. It is the last note to enter and the one the swell arrives at.',
    'Never add C while the G is sounding. It sits a semitone over the B, and a slow attack ' +
      'stays on that clash for a whole beat before the ear can decide it was a mistake.',
    'Set the attack long enough that the first note is still rising when the second enters. ' +
      'If each note has finished swelling before the next, the stack sounds struck.',
  ],
  request: {
    id: 'swollen-pad-staggered-stack',
    role: 'pad',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    // §12.4. Four notes sounding at once by the fourth beat of every chord.
    polyphony: 4,
  },
  /**
   * §5A/#554. The fourth over the `I` as data.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it sits a semitone over the third, and a slow attack lingers on the clash',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'V', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'IV', bars: 2 },
    ],
  },
  /**
   * Eight bars. `baseOctave: 3` puts `G3` at degree 1. Within each chord the notes enter at
   * steps 1, 5, 9 and 13 of its first bar and hold to its end, so the lengths run 32, 28, 24,
   * 20.
   */
  hook: {
    id: 'swollen-pad-staggered-stack-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `I`: G3, B3, D4, A4 — the ninth last and on top.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 5, degree: 3, octave: 0, len: 28 },
      { step: 9, degree: 5, octave: 0, len: 24 },
      { step: 13, degree: 2, octave: 1, len: 20 },
      // `V`: D3, F#3, A3, E4 — the ninth last and on top.
      { step: 33, degree: 5, octave: -1, len: 32 },
      { step: 37, degree: 7, octave: -1, len: 28 },
      { step: 41, degree: 2, octave: 0, len: 24 },
      { step: 45, degree: 6, octave: 0, len: 20 },
      // `vi`: E3, G3, B3, D4 — the seventh last.
      { step: 65, degree: 6, octave: -1, len: 32 },
      { step: 69, degree: 1, octave: 0, len: 28 },
      { step: 73, degree: 3, octave: 0, len: 24 },
      { step: 77, degree: 5, octave: 0, len: 20 },
      // `IV`: C3, G3, E4, B4 — the seventh last.
      { step: 97, degree: 4, octave: -1, len: 32 },
      { step: 101, degree: 1, octave: 0, len: 28 },
      { step: 105, degree: 6, octave: 0, len: 24 },
      { step: 109, degree: 3, octave: 1, len: 20 },
    ],
  },
}
