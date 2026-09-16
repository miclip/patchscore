import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Triangle Lead rise-and-fall line**: eight notes, a half-bar each, rising by step
 * to one peak at the top of bar three and falling by step the same way, so the pass lands back
 * where it started.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is a
 * lead; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. *Triangle* names a waveform and *lead* names the
 * part, and the figure takes the first at its word visibly, as a shape: a triangle wave rises in
 * a straight line to a peak and falls in a straight line to where it began, and so does this
 * line. Up by step for four notes, down by step for four, no ornament on either edge, and the
 * peak is the one note the two edges share. The prose says what to play and nothing about what
 * the preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## How it differs from the other lead written for this box
 *
 * `saw-lead-octave-cut` is five notes, one of them held for a bar and a half and then cut, with
 * its one entry that matters off the bar head. This is eight, every one a half-bar, every entry
 * on a beat, and nothing is ever cut. A reader with both has a line that is cut and a line that
 * is drawn.
 *
 * ## One note at a time, by construction
 *
 * Every note ends where the next begins, so the peak is one; `test/riff.test.ts` counts it. The
 * box this patch ships on plays two notes, and a lead uses one.
 *
 * ## The harmony is context, and every note is a tone of its chord or the step above it
 *
 * `I IV V vi` in G major, one bar each. The line is `G A | B C | D C | B A` and then the `G`
 * of the next pass: the root and ninth of the G, the seventh and root of the C, the root and
 * seventh of the D, the fifth and fourth of the E minor. The peak `D5` is the root of the `V`,
 * which is where a peak belongs, and the `A4` that ends the descent is the one note of the
 * cycle that is not a chord tone, held over the E minor until the `G` resolves it.
 *
 * ## Why the lowered seventh is forbidden
 *
 * `F` natural is a blues bend in G major, and a triangle has no bends: the edges are straight
 * or it is a different shape. `F` is not in G major, so the rule reaches the whole piece
 * (§5A.8), and no chord of the cycle carries it.
 */
export const triangleLeadRiseAndFallLine: Riff = {
  id: 'triangle-lead-rise-and-fall-line',
  name: 'The Triangle Lead rise-and-fall line',
  reference: { kind: 'patch', name: 'Triangle Lead' },
  bpm: { min: 88, max: 116, default: 100 },
  key: 'G major',
  technique: [
    'The name says triangle, so the line is one: up by step to a peak, down by step to where ' +
      'it started. Eight notes in four bars, a half-bar each, and the ninth is the first again.',
    'Rise: G, A, B, C, one to a half-bar, through the G chord and the C. Peak: D on the head of ' +
      'bar three, the root of the D chord under it. Fall: C, B, A, through the D and the E ' +
      'minor. The next pass lands on G.',
    'Every note the same length, every entry on beat one or beat three, and nothing between ' +
      'the notes. The edges of a triangle are straight; an ornament on the way up is a bend in ' +
      'the shape.',
    'Let each note run into the next. A gap between two notes is a break in the line, and the ' +
      'figure is one unbroken line. The one release is the A at the end of bar four, let go two ' +
      'sixteenths early so the G that follows lands clean.',
    'The peak is the loud one and the bar heads are next. The half-bar notes between them are ' +
      'played under, so what the ear hears is a shape rising and falling and not eight notes.',
    'The A at the end is the one note held over a chord it does not belong to, the fourth of ' +
      'the E minor. Hold it and let the G resolve it. That is the only tension in the figure, ' +
      'and it is where the triangle closes.',
    'Never play F natural. It is the flattened seventh of G major, a blues bend, and a ' +
      'triangle has no bends in it.',
  ],
  request: {
    id: 'triangle-lead-rise-and-fall-line',
    role: 'lead',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The lowered seventh as data, over the `I`, and reaching the whole piece because
   * the key does not have it. Every entry is on a beat and the first of every chord is on its
   * bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 7,
        alter: -1,
        reason: 'the flattened seventh is a blues bend, and a triangle has no bends in it',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'V', bars: 1 },
      { degree: 'vi', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `G4` at degree 1; the line runs
   * from `G4` to `D5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, eight notes, eight steps each, except the last, which is six so the pass
   * re-enters over two steps of silence.
   */
  hook: {
    id: 'triangle-lead-rise-and-fall-line-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`: G4, A4.
      { step: 1, degree: 1, octave: 0, len: 8 },
      { step: 9, degree: 2, octave: 0, len: 8 },
      // `IV`: B4, C5.
      { step: 17, degree: 3, octave: 0, len: 8 },
      { step: 25, degree: 4, octave: 0, len: 8 },
      // `V`: D5, the peak, then C5.
      { step: 33, degree: 5, octave: 0, len: 8 },
      { step: 41, degree: 4, octave: 0, len: 8 },
      // `vi`: B4, A4, released two steps early.
      { step: 49, degree: 3, octave: 0, len: 8 },
      { step: 57, degree: 2, octave: 0, len: 6 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck once: the peak at 120, the bar heads at 116, the
   * half-bar entries as downbeats.
   */
  pattern: variant(
    'triangle-lead-rise-and-fall-line-grid',
    'lead',
    0,
    64,
    at('accent', 120, 33),
    at('accent', 116, 1, 17, 49),
    on('downbeat', 9, 25, 41, 57),
  ),
}
