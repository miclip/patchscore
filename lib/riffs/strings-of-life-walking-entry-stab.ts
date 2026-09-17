import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Strings of Life walking-entry stab**: one pitch, four bars, entering a sixteenth
 * later in every bar and never on a beat. The note never moves; the chord under it changes what
 * it means; only the timing walks.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference *for* is a way of writing a stab: one pitch
 * reheard as the harmony moves under it, placed off the beat so the drums own the beat.
 *
 * **Names no device** (invariant 3). `stab`, `bright`, a grid, and a progression in roman
 * numerals.
 *
 * ## The first major-key figure in `/riffs` (#638)
 *
 * Every record-named entry before this one is in a minor key, while `lydian-house` and
 * `major-key-electro` are directions built for major and modal territory. This is `I vi IV V`
 * in F major, one bar a chord.
 *
 * ## One pitch, four meanings
 *
 * The hook is `C5`, four times. The chord table is what sounds *under* it, the bass and
 * whatever else holds the harmony, as it is on every entry whose line sits over its chords
 * rather than playing them (§5A, #624). Over the `I` the `C5` is the fifth; over the `vi` it is
 * the seventh; over the `IV` it is the ninth; over the `V` it is the root. Four meanings of one
 * pitch, and the fourth is the one that resolves the idea: the note that has been a colour on
 * three chords is the foundation of the fourth, and the next bar makes it a colour again.
 *
 * The first draft of this entry carried a `D5` in bar four, on the reasoning that something
 * had to push the figure back round. It was cut, and the reason is the whole lesson: a line
 * that refuses to move while the harmony changes under it four times is the point, and adding
 * a note to relieve it is exactly the instinct to resist. **The hook is the melody line only.**
 * The chords live in `harmony.progression`, the way every riff in this library does it, and
 * nothing of them is in the hook.
 *
 * ## The entry walks, and the grid is one pass
 *
 * Bar one enters on the "e" of one, bar two on the "and", bar three on the "a", bar four on the
 * "e" of two: steps 2, 19, 36 and 54. No entry lands on a beat, and none lands on the bar
 * head, which `onsetOffset.minSteps: 1` holds as data. A sixteen-step grid could mark none of
 * this, since no two bars strike the same step; the 64-step grid is the whole figure in one
 * pass, so every onset recurs trivially and the grid marks all four (§5A.2).
 *
 * ## Short
 *
 * Every note is two steps long, an eighth. The gap after each stab is as much of the figure as
 * the hit: fourteen or more silent steps before the next entry, and the space is what makes
 * the walk audible.
 *
 * A four-note hook of one repeated pitch is thin to read and right to play. The technique
 * lines carry why.
 */
export const stringsOfLifeWalkingEntryStab: Riff = {
  id: 'strings-of-life-walking-entry-stab',
  name: 'The Strings of Life walking-entry stab',
  reference: { kind: 'record', name: 'Strings of Life' },
  bpm: { min: 118, max: 128, default: 125 },
  key: 'F major',
  technique: [
    'One note, four bars, and it lands a sixteenth later in every bar. Bar one on the "e" of ' +
      'one, bar two on the "and", bar three on the "a", bar four on the "e" of two. It never ' +
      'lands on a beat, and the walk is the figure.',
    'The note is C, and it does not move. The chords under it move, F to D minor to B flat ' +
      'to C, and the same C becomes the fifth, then the seventh, then the ninth, then the root. ' +
      'Four meanings of one pitch, and the fourth is the one that resolves the idea.',
    'Do not add a note in bar four to push the figure back round. The C over the C chord is ' +
      'the root, and the next bar makes it a colour again. A line that refuses to move while ' +
      'the harmony changes under it four times is the point.',
    'Play it short. Lift the hand within an eighth, so the space after each note is longer ' +
      'than the note itself. The gap is as much of the figure as the hit.',
    'Leave the chords to whatever holds them. The stab plays the C and nothing under it, and ' +
      'the bass and the pad supply the F, the D, the B flat and the C that give it its four ' +
      'names.',
    'Accent the first note and play the other three evenly. One accent a phrase is enough to ' +
      'say where the four bars start.',
  ],
  request: {
    id: 'strings-of-life-walking-entry-stab',
    role: 'stab',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. Never on the bar head, as data. The walk is a sixteenth, a half, three
   * sixteenths and five into each bar, so the least the rule can hold is one step in; that no
   * entry lands on any beat is checked by `test/riff.test.ts`.
   */
  constraints: {
    onsetOffset: {
      minSteps: 1,
      reason: 'the note never lands on the change; the drums own the beat and the stab owns the space after it',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'vi', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /** §5A/§4.1. The whole cycle, from bar 1. */
  figureStartsAtBar: 1,
  /**
   * Four bars, four notes, one pitch. `baseOctave: 4` puts `F4` at degree 1, so the fifth is
   * `C5`. Every note is two steps long.
   */
  hook: {
    id: 'strings-of-life-walking-entry-stab-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // Bar 1, over the `I`, on the "e" of one: C5, the fifth.
      { step: 2, degree: 5, octave: 0, len: 2 },
      // Bar 2, over the `vi`, on the "and" of one: C5, the seventh.
      { step: 19, degree: 5, octave: 0, len: 2 },
      // Bar 3, over the `IV`, on the "a" of one: C5, the ninth.
      { step: 36, degree: 5, octave: 0, len: 2 },
      // Bar 4, over the `V`, on the "e" of two: C5, the root.
      { step: 54, degree: 5, octave: 0, len: 2 },
    ],
  },
  /**
   * §5A.2. The whole figure in one pass, so the grid is the four entries and nothing else. The
   * accent is the first; the other three are even.
   */
  pattern: variant(
    'strings-of-life-walking-entry-stab-grid',
    'stab',
    0,
    64,
    at('accent', 112, 2),
    on('offbeat', 19, 36, 54),
  ),
}
