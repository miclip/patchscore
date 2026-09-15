import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD PlinkoArp two-rail drop**: twelve sixteenths falling from the top of the chord
 * to its root, bouncing between two descending rails a third apart, then four sixteenths of
 * silence where it lands.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * arp pluck; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *plinko*, the game where a disc drops
 * through a board of pegs and lands in a slot, and *arp*. The figure takes the first at its
 * word visibly: a drop from the top, a bounce on every peg, a landing, a pause, another drop.
 * It takes the second as the role and nothing more. Whether the preset runs an arpeggiator of
 * its own is not known here and not assumed: the lesson is in the notes and the rhythm, and it
 * is played by hand or sequenced exactly as written. The prose says what to play and nothing
 * about what the preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and no two share a step, so the peak is one; `test/riff.test.ts`
 * counts it. The box this patch ships on plays two notes, and an arp uses one.
 *
 * ## The two rails
 *
 * The odd sixteenths fall by step from the top of the chord: `E5 D5 C5 B4 A4 G4`. The even
 * sixteenths fall by step a third below them: `C5 B4 A4 G4 F#4 E4`. Interleaved, that is a
 * disc bouncing between two rails, down a third and up a step, twelve times, landing on the
 * root on the twelfth. The second bar is the same board from `D5`, landing on `D4`.
 *
 * ## The harmony is context, and the slot is the root
 *
 * `i VII` in E minor, a bar each. The drop starts from the octave of the chord's root and lands
 * on that root, so the chord is what the disc lands on and everything between is passing:
 * the `C5` at step 19 and the `G4` at step 22 are passing sixteenths over the D major and not
 * a claim about it.
 */
export const pdPlinkoarpTwoRailDrop: Riff = {
  id: 'pd-plinkoarp-two-rail-drop',
  name: 'The PD PlinkoArp two-rail drop',
  reference: { kind: 'patch', name: 'PD PlinkoArp' },
  bpm: { min: 100, max: 124, default: 112 },
  key: 'E minor',
  technique: [
    'Drop from the top. Twelve sixteenths from the bar head, every one a step down from ' +
      'the one two steps before it, landing on the root on the twelfth. Then four sixteenths ' +
      'of nothing, which is the disc sitting in its slot.',
    'The name says plinko, so the drop bounces. The odd sixteenths are one rail, falling by ' +
      'step from E; the even ones are the other rail, a third below, falling by step from C. ' +
      'Play them as one line and the ear hears a disc hitting pegs on the way down.',
    'Bar two is the same board from a step lower: D at the top, D at the bottom, the chord ' +
      'under it now D major. The bounce does not change, only where it starts and lands.',
    'One note at a time, every note the same length. Let each sixteenth go before the next ' +
      'is struck. Held, the two rails become two chords and the drop becomes a strum.',
    'The top of the drop is the loud one and the landing is the other. Every peg between ' +
      'them is quieter, the ones on the lower rail quieter still, so the shape reads as a fall ' +
      'and not as a run.',
    'Play it as written, by hand or from a sequencer, and let nothing in the sound choose the ' +
      'order for you. The order is the figure.',
  ],
  request: {
    id: 'pd-plinkoarp-two-rail-drop',
    role: 'arp',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 2,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `E4` at degree 1; the drop
   * starts from `E5` and the second from `D5`, and nothing here goes below `D4`.
   */
  figureStartsAtBar: 1,
  /**
   * Two bars, twenty-four notes, every one a sixteenth. Steps 1 to 12 and 17 to 28 sound; 13
   * to 16 and 29 to 32 are the slot.
   */
  hook: {
    id: 'pd-plinkoarp-two-rail-drop-hook',
    forRole: 'arp',
    bars: 2,
    baseOctave: 4,
    notes: [
      // `i`: from E5, landing on E4. Odd steps are the upper rail, even the lower.
      { step: 1, degree: 1, octave: 1, len: 1 },
      { step: 2, degree: 6, octave: 0, len: 1 },
      { step: 3, degree: 7, octave: 0, len: 1 },
      { step: 4, degree: 5, octave: 0, len: 1 },
      { step: 5, degree: 6, octave: 0, len: 1 },
      { step: 6, degree: 4, octave: 0, len: 1 },
      { step: 7, degree: 5, octave: 0, len: 1 },
      { step: 8, degree: 3, octave: 0, len: 1 },
      { step: 9, degree: 4, octave: 0, len: 1 },
      { step: 10, degree: 2, octave: 0, len: 1 },
      { step: 11, degree: 3, octave: 0, len: 1 },
      { step: 12, degree: 1, octave: 0, len: 1 },
      // `VII`: from D5, landing on D4.
      { step: 17, degree: 7, octave: 0, len: 1 },
      { step: 18, degree: 5, octave: 0, len: 1 },
      { step: 19, degree: 6, octave: 0, len: 1 },
      { step: 20, degree: 4, octave: 0, len: 1 },
      { step: 21, degree: 5, octave: 0, len: 1 },
      { step: 22, degree: 3, octave: 0, len: 1 },
      { step: 23, degree: 4, octave: 0, len: 1 },
      { step: 24, degree: 2, octave: 0, len: 1 },
      { step: 25, degree: 3, octave: 0, len: 1 },
      { step: 26, degree: 1, octave: 0, len: 1 },
      { step: 27, degree: 2, octave: 0, len: 1 },
      { step: 28, degree: 7, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. The top of each drop is the accent at 118 and the
   * landing at 108; beats two and three are downbeats, the "and"s offbeats, and the lower rail's
   * other pegs are ghosts at 72.
   */
  pattern: variant(
    'pd-plinkoarp-two-rail-drop-grid',
    'arp',
    0,
    32,
    at('accent', 118, 1, 17),
    at('accent', 108, 12, 28),
    on('downbeat', 5, 9, 21, 25),
    on('offbeat', 3, 7, 11, 19, 23, 27),
    at('ghost', 72, 2, 4, 6, 8, 10, 18, 20, 22, 24, 26),
  ),
}
