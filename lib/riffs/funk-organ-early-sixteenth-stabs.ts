import { at, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The FUNK ORGAN early-sixteenth stabs**: two notes struck four times a bar, every strike
 * on the sixteenth before a beat and never on one.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is the organ stab; the notes are this library's own, and the entry names no device
 * (invariant 3). Nobody writing this had heard the preset, and nothing here says what it
 * sounds like.
 *
 * ## Everything is a sixteenth early
 *
 * The four stabs in a bar fall on steps 4, 8, 12 and 16: the sixteenth before beats two,
 * three and four, and the sixteenth before the next bar head. Nothing lands on a beat, ever.
 * `onsetOffset.minSteps: 3` holds the first stab over every chord to three steps in, and the
 * shape holds the other three. A stab that is always early leans the whole bar forward, and
 * because it is *always* early the ear stops hearing it as early and hears the beat as late.
 *
 * `strings-of-life-walking-entry-stab` is the other pushed stab in the library, and it is a
 * different lesson: one pitch entering a sixteenth *later* each bar, never the same place
 * twice. This one is the same place four times a bar, so the two are not one lesson twice.
 * #624's figure was one note at a time on a mix of pushes and the one; this replaces it (#643).
 *
 * ## Two notes, exactly, as a stab spends them
 *
 * The box this patch ships on plays two notes, and every stab recipe on it spends both
 * (`stab / hard`, DUO MODE on with KB CTRL set). So each stab is a dyad, struck together for
 * one sixteenth: `B4 + E5` over the E minor, `C5 + E5` over the A minor, `D5 + F#5` over the
 * D, `D5 + G5` over the G. The peak is two, `polyphony: 2` says so, and `test/riff.test.ts`
 * counts it. The top note moves by step across the four bars, `E E F# G`, and the bottom
 * `B C D D`, which is the voicing staying close while the chords move.
 *
 * ## The harmony is context, and the dyads are its top
 *
 * `i iv VII III` in E minor, one bar each: Em, Am, D, G. Every dyad is two tones of its
 * chord, a fourth or a third apart, and the root is left to whatever plays it. Nothing here is
 * chromatic, and there is no forbidden pitch to state; the rule as data is the offset.
 *
 * ## The grid is the whole cycle in one pass
 *
 * Four bars, sixteen strikes, 64 steps. The push before the bar head is the accent, because it
 * is the one that pulls the next bar in; the other three are leaned on a little less.
 */
export const funkOrganEarlySixteenthStabs: Riff = {
  id: 'funk-organ-early-sixteenth-stabs',
  name: 'The FUNK ORGAN early-sixteenth stabs',
  reference: { kind: 'patch', name: 'FUNK ORGAN' },
  bpm: { min: 100, max: 120, default: 112 },
  key: 'E minor',
  technique: [
    'Four stabs a bar, and every one is on the sixteenth before a beat: before two, before ' +
      'three, before four, and before the next bar head. Never on a beat. That is the whole ' +
      'rhythm, and it does not change for four bars.',
    'Two notes at once, and the same two for the whole bar. E minor: B and the E above. A ' +
      'minor: C and E. D: D and F sharp. G: D and G. The top note steps up through the four ' +
      'bars and the bottom note follows it.',
    'Short. A sixteenth and off. The gap between stabs is longer than the stab, and that gap ' +
      'is where the beat sits, unplayed. Ring past the push and the stab lands on the beat ' +
      'after all.',
    'The push before the bar head is the loud one. It is the stab that drags the next bar in, ' +
      'and the three before it are the run-up. Play those a little under.',
    'Keep the early placement exact. A sixteenth early every time reads as a groove; a ' +
      'sixteenth early sometimes reads as sloppy. The consistency is what makes the beat ' +
      'sound late instead of the stabs sounding early.',
    'Leave the root to the bass. These are the top of the chord, a fourth or a third across, ' +
      'and the low end is somebody else’s job.',
  ],
  request: {
    id: 'funk-organ-early-sixteenth-stabs',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    // §12.4. Both notes of every stab, and never a third.
    polyphony: 2,
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The early placement as data: the first note over every chord enters three steps
   * in, on the sixteenth before beat two, and never on the change. No forbidden pitch, since
   * every dyad is two tones of its chord.
   */
  constraints: {
    onsetOffset: {
      minSteps: 3,
      reason: 'every stab is on the sixteenth before a beat; the first one over a chord is three steps in, never on the change',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'III', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `E4` at degree 1; the dyads
   * run from `B4` to `G5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, thirty-two notes as sixteen dyads. Steps 4, 8, 12 and 16 of each bar, one step
   * long, both notes on the same step.
   */
  hook: {
    id: 'funk-organ-early-sixteenth-stabs-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: B4 + E5, four times.
      { step: 4, degree: 5, octave: 0, len: 1 },
      { step: 4, degree: 1, octave: 1, len: 1 },
      { step: 8, degree: 5, octave: 0, len: 1 },
      { step: 8, degree: 1, octave: 1, len: 1 },
      { step: 12, degree: 5, octave: 0, len: 1 },
      { step: 12, degree: 1, octave: 1, len: 1 },
      { step: 16, degree: 5, octave: 0, len: 1 },
      { step: 16, degree: 1, octave: 1, len: 1 },
      // `iv`: C5 + E5.
      { step: 20, degree: 6, octave: 0, len: 1 },
      { step: 20, degree: 1, octave: 1, len: 1 },
      { step: 24, degree: 6, octave: 0, len: 1 },
      { step: 24, degree: 1, octave: 1, len: 1 },
      { step: 28, degree: 6, octave: 0, len: 1 },
      { step: 28, degree: 1, octave: 1, len: 1 },
      { step: 32, degree: 6, octave: 0, len: 1 },
      { step: 32, degree: 1, octave: 1, len: 1 },
      // `VII`: D5 + F#5.
      { step: 36, degree: 7, octave: 0, len: 1 },
      { step: 36, degree: 2, octave: 1, len: 1 },
      { step: 40, degree: 7, octave: 0, len: 1 },
      { step: 40, degree: 2, octave: 1, len: 1 },
      { step: 44, degree: 7, octave: 0, len: 1 },
      { step: 44, degree: 2, octave: 1, len: 1 },
      { step: 48, degree: 7, octave: 0, len: 1 },
      { step: 48, degree: 2, octave: 1, len: 1 },
      // `III`: D5 + G5.
      { step: 52, degree: 7, octave: 0, len: 1 },
      { step: 52, degree: 3, octave: 1, len: 1 },
      { step: 56, degree: 7, octave: 0, len: 1 },
      { step: 56, degree: 3, octave: 1, len: 1 },
      { step: 60, degree: 7, octave: 0, len: 1 },
      { step: 60, degree: 3, octave: 1, len: 1 },
      { step: 64, degree: 7, octave: 0, len: 1 },
      { step: 64, degree: 3, octave: 1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. The push before each bar head at 118, the other
   * three pushes at 104: every strike is a sixteenth that is leaned on, so every one is an
   * accent with a velocity, and none is a ghost.
   */
  pattern: variant(
    'funk-organ-early-sixteenth-stabs-grid',
    'stab',
    0,
    64,
    at('accent', 118, 16, 32, 48, 64),
    at('accent', 104, 4, 8, 12, 20, 24, 28, 36, 40, 44, 52, 56, 60),
  ),
}
