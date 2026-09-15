import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Petrichor off-beat comping figure**: three-note rootless voicings on the "and" of
 * one and the "and" of three, over a two-five-one.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * polyphonic keys program; the voicings are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## A chord riff that also carries a chord table
 *
 * The voicings are the top of each chord and leave the root to a bass, so `harmony` says which
 * chord each three-note shape is the upper part of. Three notes at one step is the voicing,
 * `polyphony: 3` is its width, and the program is printed POLY with four voices, so three is
 * inside what it holds; `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## Why the hook enters two steps in
 *
 * Nothing lands on the bar head. The first strike of every bar is the "and" of one, and
 * `onsetOffset.minSteps: 2` keeps it there as data rather than as a sentence.
 *
 * ## Why the fourth is forbidden over the I
 *
 * F major's fourth is `Bb`, a semitone over the `A` the `I` voicing is built on. As data, over
 * the chord the figure resolves to.
 */
export const petrichorOffbeatCompingFigure: Riff = {
  id: 'petrichor-offbeat-comping-figure',
  name: 'The Petrichor off-beat comping figure',
  reference: { kind: 'patch', name: 'Petrichor' },
  bpm: { min: 78, max: 96, default: 86 },
  key: 'F major',
  technique: [
    'Four bars: G minor for one, C for one, F for two. Two strikes a bar, on the "and" of one ' +
      'and the "and" of three, and never on a beat.',
    'Three notes a strike, no root. Over the G minor it is B flat, D, F; over the C it is E, ' +
      'B flat, D; over the F it is A, C, E. The bass says which chord it is, and the hand plays ' +
      'the colour.',
    'The first strike of the bar holds for a beat and a half; the second is short. Long then ' +
      'short is the comp, and the reverse is a march.',
    'Keep the three notes close and let them move as little as they can. B flat and D are in ' +
      'the first two voicings; only one note changes between them.',
    'Never play B flat while the F is sounding. It sits a semitone over the A, and the two ' +
      'bars of F are where the figure rests.',
    'The strike on the "and" of one is the loud one, and it is loudest on the first bar of ' +
      'the F. Everything else sits under it.',
  ],
  request: {
    id: 'petrichor-offbeat-comping-figure',
    role: 'stab',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    // §12.4. Three simultaneous notes, matching the widest voicing below.
    polyphony: 3,
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The fourth over the `I` as data, and the two-step offset that keeps every entry
   * off the bar head.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it sits a semitone over the third the voicing is built on',
      },
    ],
    onsetOffset: {
      minSteps: 2,
      reason: 'the bar head belongs to the bass and the drums, and the comp sits in the gap after it',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'ii', bars: 1 },
      { degree: 'V', bars: 1 },
      { degree: 'I', bars: 2 },
    ],
  },
  /**
   * Four bars. `baseOctave: 4` puts `F4` at degree 1, so the voicings sit from `E4` to `F5`,
   * where comping cuts without crowding a lead.
   */
  hook: {
    id: 'petrichor-offbeat-comping-figure-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `ii`: Bb4 D5 F5 — third, fifth, seventh of G minor.
      { step: 3, degree: 4, octave: 0, len: 6 },
      { step: 3, degree: 6, octave: 0, len: 6 },
      { step: 3, degree: 1, octave: 1, len: 6 },
      { step: 11, degree: 4, octave: 0, len: 4 },
      { step: 11, degree: 6, octave: 0, len: 4 },
      { step: 11, degree: 1, octave: 1, len: 4 },
      // `V`: E4 Bb4 D5 — third, seventh, ninth of C.
      { step: 19, degree: 7, octave: -1, len: 6 },
      { step: 19, degree: 4, octave: 0, len: 6 },
      { step: 19, degree: 6, octave: 0, len: 6 },
      { step: 27, degree: 7, octave: -1, len: 4 },
      { step: 27, degree: 4, octave: 0, len: 4 },
      { step: 27, degree: 6, octave: 0, len: 4 },
      // `I`: A4 C5 E5 — third, fifth, seventh of F, for two bars.
      { step: 35, degree: 3, octave: 0, len: 6 },
      { step: 35, degree: 5, octave: 0, len: 6 },
      { step: 35, degree: 7, octave: 0, len: 6 },
      { step: 43, degree: 3, octave: 0, len: 4 },
      { step: 43, degree: 5, octave: 0, len: 4 },
      { step: 43, degree: 7, octave: 0, len: 4 },
      { step: 51, degree: 3, octave: 0, len: 6 },
      { step: 51, degree: 5, octave: 0, len: 6 },
      { step: 51, degree: 7, octave: 0, len: 6 },
      { step: 59, degree: 3, octave: 0, len: 4 },
      { step: 59, degree: 5, octave: 0, len: 4 },
      { step: 59, degree: 7, octave: 0, len: 4 },
    ],
  },
  pattern: variant(
    'petrichor-offbeat-comping-figure-grid',
    'stab',
    0,
    64,
    at('accent', 112, 35),
    on('offbeat', 3, 11, 19, 27, 43, 51, 59),
  ),
}
