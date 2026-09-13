import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Detroit Funk Aeolian machine loop**: three-note chord stabs that never land on a
 * beat, every one carrying its ninth.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * stab sound; the voicings are this library's own, and the entry names no device (invariant 3).
 *
 * ## A chord riff that also carries a chord table
 *
 * `show-me-love-organ-stab` is the chord riff with no `harmony`: its notes are the whole chord.
 * This one has both, because the stab plays the *top* of each chord and leaves the root to the
 * bass. Three notes at one step are the voicing (§4.1); the table says which chord that voicing
 * is the upper part of, and `RIFF_CHORDS_SUPPLIED` is true of it in the plain sense: the root
 * under these three notes is somebody else's part. `polyphony: 3` is the width of a voicing,
 * and is what a rig of mono boxes reports `no-capable-voice` against (§7.3).
 *
 * ## Why the raised sixth is forbidden over the i
 *
 * C minor's sixth is `Ab`. Raise it and the loop is in C dorian, which is the move that turns
 * this from Detroit into house. As data it is degree 6 with `alter: 1`, over the `i` where the
 * difference is audible.
 *
 * ## Why the hook enters two steps in
 *
 * The hook holds each voicing from its first strike to the bar line and the grid strikes it
 * four times inside that (`reArticulatesHook`). The first strike is the "and" of one, so the
 * hook enters at step 3 of every bar, and `onsetOffset.minSteps: 2` is what keeps it off the
 * bar head. That an entry never lands on *any* beat is the grid's shape, said in the technique.
 */
export const detroitFunkAeolianMachineLoop: Riff = {
  id: 'detroit-funk-aeolian-machine-loop',
  name: 'The Detroit Funk Aeolian machine loop',
  reference: { kind: 'patch', name: 'Detroit Funk' },
  bpm: { min: 122, max: 134, default: 128 },
  key: 'C minor',
  technique: [
    'Nothing lands on a beat. Every stab sits in a gap the kick leaves: the "and" of one, the ' +
      '"and" of two, the last sixteenth before four, and the "and" of four. Put a four-on-the-' +
      'floor kick under it and the two never touch.',
    'Three notes per stab, close together, and every voicing carries its ninth. The ninth is ' +
      'what stops four plain chords sounding like a practice exercise. Over the first chord it ' +
      'is on top; over the last it is at the bottom.',
    'The stab is the top of the chord. The root is the bass’s note, and the voicings here ' +
      'leave it out on purpose. Keep the three notes inside one octave and let the bass say ' +
      'which chord it is.',
    'Never play A natural while the first chord is sounding. It is the raised sixth of C ' +
      'minor, and one A turns the loop from Detroit into house.',
    'Keep the stabs short. The hand comes off before the next beat, and the space between hits ' +
      'is where the drums are heard.',
  ],
  request: {
    id: 'detroit-funk-aeolian-machine-loop',
    role: 'stab',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4. Three simultaneous notes, matching the widest voicing below.
    polyphony: 3,
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The dorian sixth as data, over the `i`. The two-step offset is the "and" of one.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 6,
        alter: 1,
        reason: 'the raised sixth turns the loop from Detroit into house',
      },
    ],
    onsetOffset: {
      minSteps: 2,
      reason: 'the bar head belongs to the kick and the stab sits in the gap after it',
    },
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'iv', bars: 1 },
    ],
  },
  /**
   * Four bars, one voicing per bar, held from the first strike to the bar line so the grid can
   * strike it again inside that span. `baseOctave: 4` puts `C4` at degree 1, so the voicings
   * sit from G4 up to F5, where a stab cuts.
   *
   * Every voicing is rootless and carries the chord's ninth. Bottom to top:
   * `i` G Bb D, `VI` G Bb C, `III` Bb D F, `iv` G Bb Eb. The Bb is common to all four.
   */
  hook: {
    id: 'detroit-funk-aeolian-machine-loop-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: fifth, seventh, ninth.
      { step: 3, degree: 5, octave: 0, len: 14 },
      { step: 3, degree: 7, octave: 0, len: 14 },
      { step: 3, degree: 2, octave: 1, len: 14 },
      // `VI`: its seventh, ninth and third.
      { step: 19, degree: 5, octave: 0, len: 14 },
      { step: 19, degree: 7, octave: 0, len: 14 },
      { step: 19, degree: 1, octave: 1, len: 14 },
      // `III`: fifth, seventh, ninth.
      { step: 35, degree: 7, octave: 0, len: 14 },
      { step: 35, degree: 2, octave: 1, len: 14 },
      { step: 35, degree: 4, octave: 1, len: 14 },
      // `iv`: its ninth, eleventh and seventh.
      { step: 51, degree: 5, octave: 0, len: 14 },
      { step: 51, degree: 7, octave: 0, len: 14 },
      { step: 51, degree: 3, octave: 1, len: 14 },
    ],
  },
  pattern: variant(
    'detroit-funk-aeolian-machine-loop-grid',
    'stab',
    0,
    64,
    at('accent', 112, 3),
    on('offbeat', 7, 12, 15, 19, 23, 28, 31, 35, 39, 44, 47, 51, 55, 60, 63),
  ),
}
