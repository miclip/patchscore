import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Acid Wiggler slide line**: sixteen sixteenths on the low root, and four of them
 * are somewhere else, reached by sliding rather than by striking.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is the acid bass; the notes are this library's own, and the entry names no device
 * (invariant 3). Nobody writing this had heard the preset, and nothing here says what it
 * sounds like.
 *
 * ## Deliberately five pitches
 *
 * `A1`, `C2`, `E2`, `G1`, `A2`, and twelve of the sixteen steps are the first of those. Every
 * other entry #643 replaced had too few pitches because the figure had too little to say. This
 * one has few pitches because that is what an acid line is: one or two notes and a great deal
 * of articulation, and the interest is which notes are slid into and which are struck. Four
 * steps are reached by glide, `C2`, `G1`, `A2` and `E2`, and one note away from the root,
 * the `C2` at the end of beat three, is struck. That is the whole figure, and the count is the
 * subject rather than a symptom. #624's entry was a wiggle widening a bar at a time over four
 * bars; this replaces it.
 *
 * ## The slide is the note
 *
 * A slid step is in the hook, because it has a pitch, and absent from the grid, because it is
 * not struck. The note before it runs to its step, so a box with glide on takes the two as one
 * held key and slides between them. `test/moog-subsequent-37.test.ts` holds the four slid
 * steps to that shape: sounding, and never a grid hit.
 *
 * ## One bar, one pass
 *
 * A sixteen-step loop, which is the size of the thing. A four-bar figure would be this bar
 * four times, and a grid marks what recurs. Sixteen sixteenths, twelve of them struck, and the
 * one accent off the bar head is the struck `C2`.
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and the next begins where it ends, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; an acid line
 * uses one, and `acid / dirty` there is a mono recipe (#632).
 *
 * ## One key, no chord table
 *
 * A minor, and no `harmony`: the line is one part in one key and sits on its root, which is
 * what §5A says a chord table is not for. There is no rule to state as data, so `constraints`
 * is absent.
 */
export const acidWigglerSlideLine: Riff = {
  id: 'acid-wiggler-slide-line',
  name: 'The Acid Wiggler slide line',
  reference: { kind: 'patch', name: 'Acid Wiggler' },
  bpm: { min: 124, max: 140, default: 132 },
  key: 'A minor',
  technique: [
    'One bar of sixteenths, and twelve of them are the low A. The other four are the figure: ' +
      'a C above, a G below, the A an octave up, and an E above, and each of those is slid ' +
      'into from the A before it. Nothing is struck on those four steps.',
    'Beat one: A, A, slide to C, A. Beat two: E, A, A, slide to G below. Beat three: A, slide ' +
      'to the A above, A, C. Beat four: A, A, slide to E, A. The C at the end of beat three ' +
      'is struck; it is the one note away from the root that is.',
    'Two buttons have to be lit, not one: GLIDE and LEGATO. With GLIDE on and LEGATO off, ' +
      'every note slides and the figure is unplayable as written; with LEGATO on, a slide ' +
      'happens only where you press the next key while still holding the last. That is what ' +
      'puts the four slides in your fingers instead of on a wheel. Check both before you start, ' +
      'because a preset need not arrive with them set.',
    'Then keep the glide short, so a slide of a third arrives inside the sixteenth. Hold the A ' +
      'and press the next key without releasing, and the slide is what happens. Release both ' +
      'and strike the A that follows.',
    'The bar head is the loud one and the struck C is next. Play the plain A steps under them, ' +
      'and play a slid step at the same weight as the A it came from, because it was never ' +
      'struck at all.',
    'Five pitches, and that is the right number. An acid line is one note, its articulation, ' +
      'and the filter. Add pitches and it turns into a bass line; move the slides and it turns ' +
      'into a different acid line.',
    'Loop the bar and play the filter. Open it across four passes and close it across four, ' +
      'and the slides will sound different every time through.',
  ],
  request: {
    id: 'acid-wiggler-slide-line',
    role: 'acid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * One bar, sixteen notes, one step each. `baseOctave: 1` puts `A1` at degree 1; the line runs
   * from `G1` to `A2`. Steps 3, 8, 10 and 15 are the slid ones.
   */
  hook: {
    id: 'acid-wiggler-slide-line-hook',
    forRole: 'acid',
    bars: 1,
    baseOctave: 1,
    notes: [
      // Beat one: A1, A1, slide to C2, A1.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 2, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 3, octave: 0, len: 1 },
      { step: 4, degree: 1, octave: 0, len: 1 },
      // Beat two: E2, A1, A1, slide to G1.
      { step: 5, degree: 5, octave: 0, len: 1 },
      { step: 6, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 1, octave: 0, len: 1 },
      { step: 8, degree: 7, octave: -1, len: 1 },
      // Beat three: A1, slide to A2, A1, C2 struck.
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 10, degree: 1, octave: 1, len: 1 },
      { step: 11, degree: 1, octave: 0, len: 1 },
      { step: 12, degree: 3, octave: 0, len: 1 },
      // Beat four: A1, A1, slide to E2, A1.
      { step: 13, degree: 1, octave: 0, len: 1 },
      { step: 14, degree: 1, octave: 0, len: 1 },
      { step: 15, degree: 5, octave: 0, len: 1 },
      { step: 16, degree: 1, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, twelve strikes. The bar head at 118, the struck C2 at 110, the other
   * beats as downbeats, the "and"s as offbeats, the remaining sixteenths as ghosts. Steps 3,
   * 8, 10 and 15 are absent: they are slid into, never struck.
   */
  pattern: variant(
    'acid-wiggler-slide-line-grid',
    'acid',
    0,
    16,
    at('accent', 118, 1),
    at('accent', 110, 12),
    on('downbeat', 5, 9, 13),
    on('offbeat', 7, 11),
    at('ghost', 76, 2, 4, 6, 14, 16),
  ),
}
