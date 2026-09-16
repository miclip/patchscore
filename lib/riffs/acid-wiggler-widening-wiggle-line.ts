import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Acid Wiggler widening-wiggle line**: an acid line that sits on the root in eighths
 * and wiggles, in sixteenths, between the root and a note above it — a tone, then a third, then
 * a fifth, then an octave — and the wiggle takes more of each bar until it is the whole line.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * acid bass; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *acid* and *wiggler*, and the figure
 * takes both at their word visibly. Acid is the role, one key at a time in sixteenths and eighths
 * with the filter doing the talking. A wiggle is a fast movement between two points that does
 * not go anywhere, so the figure's one idea is the root and a note above it alternating in
 * sixteenths, and what develops is how far apart the two points are and how much of the bar the
 * wiggle takes. The prose says what to play and nothing about what the preset sounds like,
 * because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and no two share a step, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; an acid line uses
 * one, and the wiggle is two notes in turn, never together. Whether the sound glides between
 * them is a fingering question the prose leaves to the player.
 *
 * ## The harmony is context, and the wiggle follows it
 *
 * `i` for two bars, `iv` for one and `VII` for one, in G minor. The root of the chord in force
 * is the bottom of the wiggle: `G2` under the two bars of G minor, `C3` under the C minor, `G2`
 * again under the F major, where it is the chord's ninth and the octave above it is too. The
 * top of the wiggle is a chord tone or the key's own step above the root, so nothing here is
 * chromatic.
 *
 * ## Why the raised seventh is forbidden
 *
 * `F#` is the leading tone of G minor, and one of them turns the wiggle into a cadence pointing
 * home. An acid line never arrives. `F#` is not in G minor, so the rule reaches the whole piece
 * (§5A.8), and no chord of the cycle carries it.
 */
export const acidWigglerWideningWiggleLine: Riff = {
  id: 'acid-wiggler-widening-wiggle-line',
  name: 'The Acid Wiggler widening-wiggle line',
  reference: { kind: 'patch', name: 'Acid Wiggler' },
  bpm: { min: 124, max: 140, default: 132 },
  key: 'G minor',
  technique: [
    'Sit on the root in eighths, each note a sixteenth long with a sixteenth of silence after ' +
      'it. That is the line at rest, and bar one is mostly this.',
    'The name says wiggle, so the figure is the root and one note above it alternating in ' +
      'sixteenths: root, up, root, up. Bar one wiggles on beat four alone, to the A a tone ' +
      'above. Bar two wiggles through beats three and four, to the Bb a minor third above.',
    'Bar three moves to C minor and the wiggle takes beats two, three and four, from the low C ' +
      'up a fifth to the G. Bar four is F major, the wiggle is the whole bar, and it is the ' +
      'octave: G to G. Then the pass starts again at rest, on plain eighths.',
    'The wiggle widens and it lengthens, and that is the whole shape: a tone, a third, a fifth, ' +
      'an octave, taking one beat, then two, then three, then four. Play it evenly and let the ' +
      'width do the work.',
    'Every note is struck. Play the wiggle legato if the sound should slide between the two ' +
      'notes and detached if it should snap; the notes are the same either way, and neither of ' +
      'the two is ever held while the other sounds.',
    'The bar head is the loudest note and the first note of each wiggle the next loudest, so ' +
      'the ear hears where the wiggle starts. Inside the wiggle the upper note is the quiet one.',
    'Never play F sharp. It is the leading tone of G minor, and one of them turns a wiggle ' +
      'into a cadence. An acid line never arrives anywhere; it just keeps wiggling.',
  ],
  request: {
    id: 'acid-wiggler-widening-wiggle-line',
    role: 'acid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The leading tone as data, over the `i`, and reaching the whole piece because the
   * key does not have it. Every entry is on the bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'the leading tone turns a wiggle into a cadence, and an acid line never arrives',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'iv', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `G2` at degree 1; the line runs
   * from `G2` to `G3`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, fifty-two notes, every one a sixteenth. Bar one: six plain eighths, then the
   * wiggle on steps 13 to 16. Bar two: four eighths, the wiggle on 25 to 32. Bar three: two
   * eighths, the wiggle on 37 to 48. Bar four: the wiggle on every step.
   */
  hook: {
    id: 'acid-wiggler-widening-wiggle-line-hook',
    forRole: 'acid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // Bar 1, `i`: G2 in eighths, then G2 / A2 on beat four.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 3, degree: 1, octave: 0, len: 1 },
      { step: 5, degree: 1, octave: 0, len: 1 },
      { step: 7, degree: 1, octave: 0, len: 1 },
      { step: 9, degree: 1, octave: 0, len: 1 },
      { step: 11, degree: 1, octave: 0, len: 1 },
      { step: 13, degree: 1, octave: 0, len: 1 },
      { step: 14, degree: 2, octave: 0, len: 1 },
      { step: 15, degree: 1, octave: 0, len: 1 },
      { step: 16, degree: 2, octave: 0, len: 1 },
      // Bar 2, `i`: G2 in eighths, then G2 / Bb2 through beats three and four.
      { step: 17, degree: 1, octave: 0, len: 1 },
      { step: 19, degree: 1, octave: 0, len: 1 },
      { step: 21, degree: 1, octave: 0, len: 1 },
      { step: 23, degree: 1, octave: 0, len: 1 },
      { step: 25, degree: 1, octave: 0, len: 1 },
      { step: 26, degree: 3, octave: 0, len: 1 },
      { step: 27, degree: 1, octave: 0, len: 1 },
      { step: 28, degree: 3, octave: 0, len: 1 },
      { step: 29, degree: 1, octave: 0, len: 1 },
      { step: 30, degree: 3, octave: 0, len: 1 },
      { step: 31, degree: 1, octave: 0, len: 1 },
      { step: 32, degree: 3, octave: 0, len: 1 },
      // Bar 3, `iv`: C3 in eighths on beat one, then C3 / G3 through beats two, three and four.
      { step: 33, degree: 4, octave: 0, len: 1 },
      { step: 35, degree: 4, octave: 0, len: 1 },
      { step: 37, degree: 4, octave: 0, len: 1 },
      { step: 38, degree: 1, octave: 1, len: 1 },
      { step: 39, degree: 4, octave: 0, len: 1 },
      { step: 40, degree: 1, octave: 1, len: 1 },
      { step: 41, degree: 4, octave: 0, len: 1 },
      { step: 42, degree: 1, octave: 1, len: 1 },
      { step: 43, degree: 4, octave: 0, len: 1 },
      { step: 44, degree: 1, octave: 1, len: 1 },
      { step: 45, degree: 4, octave: 0, len: 1 },
      { step: 46, degree: 1, octave: 1, len: 1 },
      { step: 47, degree: 4, octave: 0, len: 1 },
      { step: 48, degree: 1, octave: 1, len: 1 },
      // Bar 4, `VII`: G2 / G3 on every sixteenth.
      { step: 49, degree: 1, octave: 0, len: 1 },
      { step: 50, degree: 1, octave: 1, len: 1 },
      { step: 51, degree: 1, octave: 0, len: 1 },
      { step: 52, degree: 1, octave: 1, len: 1 },
      { step: 53, degree: 1, octave: 0, len: 1 },
      { step: 54, degree: 1, octave: 1, len: 1 },
      { step: 55, degree: 1, octave: 0, len: 1 },
      { step: 56, degree: 1, octave: 1, len: 1 },
      { step: 57, degree: 1, octave: 0, len: 1 },
      { step: 58, degree: 1, octave: 1, len: 1 },
      { step: 59, degree: 1, octave: 0, len: 1 },
      { step: 60, degree: 1, octave: 1, len: 1 },
      { step: 61, degree: 1, octave: 0, len: 1 },
      { step: 62, degree: 1, octave: 1, len: 1 },
      { step: 63, degree: 1, octave: 0, len: 1 },
      { step: 64, degree: 1, octave: 1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. Bar heads at 118; the first note of each wiggle at
   * 110; the other plain eighths and the wiggle's on-beat roots as downbeats where they fall on
   * a beat and offbeats where they fall on an "and"; every upper note of a wiggle a ghost at 72.
   */
  pattern: variant(
    'acid-wiggler-widening-wiggle-line-grid',
    'acid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 110, 13, 25, 37),
    on('downbeat', 5, 9, 21, 29, 41, 45, 53, 57, 61),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63),
    at(
      'ghost',
      72,
      14, 16, 26, 28, 30, 32, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64,
    ),
  ),
}
