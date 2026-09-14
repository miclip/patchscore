import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Bellbounce sparse bell pattern**: two notes a bar at most, and the delay supplies
 * everything else.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * bell with its delay; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## Why it is an `arp`
 *
 * The definition filed it as a lead. What it describes is a repeating figure whose rhythm is the
 * part, one or two strikes a bar with a delay filling the gaps, and that is what the `arp` role
 * is for. A lead would ask a rig for a voice built to carry a melody; this asks for one built to
 * repeat.
 *
 * ## The two-a-bar rule, which no field carries
 *
 * *Two notes a bar at most* is the technique, and neither a forbidden degree nor an onset offset
 * can state it. The figure keeps it by construction and `test/riff.test.ts` counts the strikes
 * in every bar of this entry.
 *
 * ## Why the fourth is forbidden over the I
 *
 * A major's fourth is `D`, the avoid note over an A major seventh chord, and on this patch every
 * strike repeats for a bar: a D struck once is a D held against the third for the rest of the
 * chord. One rule, as data, over the chord the figure opens on.
 *
 * ## The whole cycle, over a grid half its length
 *
 * The first published version carried bars 1 to 4 of the eight, struck each note twice a bar,
 * and left the definition's second half as prose, on the belief that a riff's grid capped the
 * figure at four bars. The grid is capped; the hook is not (§5A.2, #603). So the hook is the
 * definition's eight bars and its five notes, one entry a chord on beat three, and the four-bar
 * grid repeats beneath it, marking only what recurs on the same step of both passes: the entry
 * into each chord. The `IV`'s step down from C# to B is the definition's `stepwise_down`, and
 * it lands on beat three of the chord's second bar, where the first pass has nothing sounding,
 * so the grid cannot mark it and the move lives in the hook alone.
 */
export const bellbounceSparseBellPattern: Riff = {
  id: 'bellbounce-sparse-bell-pattern',
  name: 'The Bellbounce sparse bell pattern',
  reference: { kind: 'patch', name: 'Bellbounce' },
  bpm: { min: 88, max: 108, default: 96 },
  key: 'A major',
  technique: [
    'Four chords, eight bars, one bell strike a chord, on beat three. The delay does the rest.',
    'Two notes a bar at most. The delay supplies everything else, and anything denser turns ' +
      'the repeats into a wash instead of a pattern.',
    'Enter two beats in. The chord has changed, the delay from the last bar has thinned, and ' +
      'then the bell strikes. The repeats fill the front of the next bar.',
    'Over the first chord the note is B, the ninth. Over the second it is C#, the fifth. The ' +
      'delay holds each one against the chord, so choose notes that can be held.',
    'Never play D while the first chord is sounding. It is the avoid note against the third, ' +
      'and the delay repeats will hold it there for the rest of the chord.',
    'Over the second half of the cycle, C# falls to B over the D major seventh, the B a bar ' +
      'after the C#, then A over the suspended E. The pattern is the rhythm; the notes follow ' +
      'the chord.',
    'Set the delay to a dotted eighth and let the repeats decay over a bar. The pattern is ' +
      'written for that spacing and sounds cluttered at anything shorter.',
  ],
  request: {
    id: 'bellbounce-sparse-bell-pattern',
    role: 'arp',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  figureStartsAtBar: 1,
  /**
   * §5A/#554. The avoid note over the `I` as data, and the two-beat entry as data.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        reason: 'it is the avoid note against the third, and the delay repeats hold it there',
      },
    ],
    onsetOffset: {
      minSteps: 8,
      reason: 'the chord changes first and the delay from the last bar thins before the bell strikes',
    },
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
   * Eight bars, five notes. `baseOctave: 5` puts `A5` at degree 1, two octaves above middle C,
   * where a bell sits. Each chord holds 32 steps: `I` 1–32, `vi` 33–64, `IV` 65–96, `V` 97–128,
   * and the entry is on beat three of each, eight steps in. Every note is one beat long: the
   * definition fixes no lengths, and on this patch a strike is short and the delay is what makes
   * it long, so the sustain is the box's and not the hook's.
   */
  hook: {
    id: 'bellbounce-sparse-bell-pattern-hook',
    forRole: 'arp',
    bars: 8,
    baseOctave: 5,
    notes: [
      // `I`: B5, the ninth, on beat three.
      { step: 9, degree: 2, octave: 0, len: 4 },
      // `vi`: C#6, the fifth, on beat three.
      { step: 41, degree: 3, octave: 0, len: 4 },
      // `IV`: C#6 on beat three, then B5 a bar later on beat three of the second bar, the
      // definition's step down.
      { step: 73, degree: 3, octave: 0, len: 4 },
      { step: 89, degree: 2, octave: 0, len: 4 },
      // `V`: A5, the fourth of the suspended E, on beat three.
      { step: 105, degree: 1, octave: 0, len: 4 },
    ],
  },
  /**
   * §5A.2. A four-bar grid under an eight-bar line, so it repeats twice, and it marks only what
   * recurs on the same step of both passes: the entry on beat three of each chord, at 9 and 41.
   * Across the two passes that is 9, 41, 73 and 105 of the cycle. The B at 89 is step 25 of the
   * second pass, and on the first pass nothing sounds at 25, so it has no strike: the fall from
   * C# is in the hook alone.
   */
  pattern: variant(
    'bellbounce-sparse-bell-pattern-grid',
    'arp',
    0,
    64,
    at('accent', 96, 9),
    on('downbeat', 41),
  ),
}
