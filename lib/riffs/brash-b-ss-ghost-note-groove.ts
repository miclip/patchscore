import { at, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The BRASH B@SS ghost-note groove**: two loud strikes a bar and six played almost
 * silently, most of them on the note that was already sounding. The groove is in how hard the
 * strikes are, not in how many notes there are.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * bass; the notes are this library's own, and the entry names no device (invariant 3). Nobody
 * writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## What it teaches
 *
 * Every other figure on this box moves pitches to make something happen. This one holds a pitch
 * for most of a bar and changes the weight instead. Two strikes at full velocity, the bar head
 * and the sixteenth before beat four, and six ghosts at a third of it. Take the ghosts out and
 * the same notes are a plain bass part; leave them in and the bar has a pulse the drums can sit
 * against.
 *
 * The velocities are the figure, so they are in the grid where a reader can read them
 * (§5A.2): `accent` carries 120, `ghost` carries 38, and the page prints both.
 *
 * ## The harmony is context, and the walk is the only pitch movement
 *
 * `i iv` in G minor, two bars each: Gm, Cm. The root holds for most of its two bars and the
 * last two sixteenths walk into the next chord, Bb and A into the C, then A and F back into the
 * G. Four moving notes in four bars, and everything else is one pitch struck at two weights.
 *
 * ## The sixth is forbidden over the tonic
 *
 * `E` natural is not in G minor at all, and the rule as data is the flattened sixth's raised
 * spelling over the `i`: a bass reaching for a passing note in a groove like this reaches for
 * it first, and it turns the key major on the way past. `Eb` is the key's own note and the
 * rule does not touch it.
 *
 * ## One note at a time
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. `bass-mid / dirty` on the box that ships this patch is a mono
 * recipe (#632).
 */
export const brashBassGhostNoteGroove: Riff = {
  id: 'brash-b-ss-ghost-note-groove',
  name: 'The BRASH B@SS ghost-note groove',
  reference: { kind: 'patch', name: 'BRASH B@SS' },
  bpm: { min: 96, max: 112, default: 104 },
  key: 'G minor',
  technique: [
    'Eight strikes a bar and only two of them are played hard: the bar head, and the sixteenth ' +
      'before beat four. The other six are ghosts, struck at about a third of the weight.',
    'Most of those eight are the same note. Bars one and two are G, bars three and four are C, ' +
      'and the only pitches that move are the two sixteenths at the end of bar two and bar four.',
    'Bar two ends on Bb then A, walking into the C. Bar four ends on A then F, walking back to ' +
      'the G. Those four notes are the whole melodic content of the figure.',
    'Play the ghosts with the same finger and the same motion as the accents, just lighter. A ' +
      'ghost played as a shorter note is a different articulation; what is wanted is the same ' +
      'note quieter.',
    'Keep every strike short. The gap between a ghost and the next strike is what makes the ' +
      'accent land, and a bass held through the gaps sounds like one long note with bumps in it.',
    'Never play E natural. It belongs to the major key, and one of them in a groove this ' +
      'repetitive is the only thing anyone will hear.',
    'Keep the line between F2 and C3. The figure is a groove at the bottom of the track and ' +
      'nothing in it needs to climb.',
  ],
  request: {
    id: 'brash-b-ss-ghost-note-groove',
    role: 'bass-mid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised sixth over the tonic, as data: the note a player fills a groove with
   * first and the one that takes the key with it. `E` is in neither chord of the cycle, so the
   * rule contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 6,
        alter: 1,
        reason: 'the raised sixth turns a minor groove major, and this one repeats too much to hide it',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'iv', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `G2` at degree 1; the line runs
   * `F2` to `C3`, eight semitones, so it fits any window this box can reach (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, eight notes. The root of each chord holds through its bars and the last two
   * sixteenths of bar two and bar four are the walk into the next one.
   */
  hook: {
    id: 'brash-b-ss-ghost-note-groove-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`, G minor: G2 through bar one and most of bar two.
      { step: 1, degree: 1, octave: 0, len: 16 },
      { step: 17, degree: 1, octave: 0, len: 14 },
      // The walk into the C: Bb2 then A2, a sixteenth each.
      { step: 31, degree: 3, octave: 0, len: 1 },
      { step: 32, degree: 2, octave: 0, len: 1 },
      // `iv`, C minor: C3 through bar three and most of bar four.
      { step: 33, degree: 4, octave: 0, len: 16 },
      { step: 49, degree: 4, octave: 0, len: 14 },
      // The walk back to the G: A2 then F2, under the pass that follows.
      { step: 63, degree: 2, octave: 0, len: 1 },
      { step: 64, degree: 7, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. Eight strikes in every bar, the same eight in each: the head, three inside beats
   * two and three, the sixteenth before beat four, and the last three sixteenths of the bar.
   * Two of the eight are accents at 120 and six are ghosts at 38, and that split is the
   * figure.
   */
  pattern: variant(
    'brash-b-ss-ghost-note-groove-grid',
    'bass-mid',
    0,
    64,
    at('accent', 120, 1, 12, 17, 28, 33, 44, 49, 60),
    at('ghost', 38, 4, 6, 8, 14, 15, 16, 20, 22, 24, 30, 31, 32),
    at('ghost', 38, 36, 38, 40, 46, 47, 48, 52, 54, 56, 62, 63, 64),
  ),
}
