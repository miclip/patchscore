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
 */
export const bellbounceSparseBellPattern: Riff = {
  id: 'bellbounce-sparse-bell-pattern',
  name: 'The Bellbounce sparse bell pattern',
  reference: { kind: 'patch', name: 'Bellbounce' },
  bpm: { min: 88, max: 108, default: 96 },
  key: 'A major',
  technique: [
    'Bars 1 to 4 of the cycle, over the first two chords. One note per chord, struck twice a ' +
      'bar: on beat three and on the "and" of four.',
    'Two notes a bar at most. The delay supplies everything else, and anything denser turns ' +
      'the repeats into a wash instead of a pattern.',
    'Enter two beats in. The chord has changed, the delay from the last bar has thinned, and ' +
      'then the bell strikes. The repeats fill the front of the next bar.',
    'Over the first chord the note is B, the ninth. Over the second it is C#, the fifth. The ' +
      'delay holds each one against the chord, so choose notes that can be held.',
    'Never play D while the first chord is sounding. It is the avoid note against the third, ' +
      'and the delay repeats will hold it there for the rest of the chord.',
    'Over the second half of the cycle, keep the same two strikes a bar: C# falling to B over ' +
      'the D major seventh, then A over the suspended E. The pattern is the rhythm; the notes ' +
      'follow the chord.',
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
      { degree: 'V6sus4', bars: 2 },
    ],
  },
  /**
   * Four bars: two over `I`, two over `vi`. `baseOctave: 5` puts `A5` at degree 1, two octaves
   * above middle C, where a bell sits. Each strike is short; the patch's delay is what makes
   * it long.
   */
  hook: {
    id: 'bellbounce-sparse-bell-pattern-hook',
    forRole: 'arp',
    bars: 4,
    baseOctave: 5,
    notes: [
      // `I`: B5, the ninth, on beat three and the "and" of four of each bar.
      { step: 9, degree: 2, octave: 0, len: 4 },
      { step: 15, degree: 2, octave: 0, len: 2 },
      { step: 25, degree: 2, octave: 0, len: 4 },
      { step: 31, degree: 2, octave: 0, len: 2 },
      // `vi`: C#6, the fifth, same two strikes a bar.
      { step: 41, degree: 3, octave: 0, len: 4 },
      { step: 47, degree: 3, octave: 0, len: 2 },
      { step: 57, degree: 3, octave: 0, len: 4 },
      { step: 63, degree: 3, octave: 0, len: 2 },
    ],
  },
  pattern: variant(
    'bellbounce-sparse-bell-pattern-grid',
    'arp',
    0,
    64,
    at('accent', 96, 9, 41),
    on('downbeat', 25, 57),
    on('offbeat', 15, 31, 47, 63),
  ),
}
