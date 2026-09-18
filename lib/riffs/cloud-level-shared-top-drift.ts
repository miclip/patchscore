import type { Riff } from '../core/riff'

/**
 * §5A. **The Cloud Level shared-top drift**: four voicings under one top note that never
 * moves, held for the arpeggiator.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * arpeggiated program; the voicings are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## A pad, because the hand holds and the box strikes
 *
 * Printed ARP, so the part is the voicing and the change, and the rhythm is the arpeggiator's:
 * a hook and no `pattern` (§5A.2). **Four notes at most in any voicing**, and
 * `test/korg-minilogue-xd.test.ts` counts the peak.
 *
 * ## The top note, which is the technique
 *
 * `E4` is in every voicing: the seventh of the `i`, the ninth of the `VI`, the fifth of the
 * `III`, the root of the `VII`. An arpeggiator plays the held notes in turn, so a note that is
 * always held is a note that always comes round, and four chords with one note in common
 * drift rather than change.
 *
 * ## Why the raised sixth is forbidden
 *
 * F# minor's sixth is `D`. Raise it to `D#` and the `VII` becomes a dominant with a leading
 * tone in it, which pulls the loop home and stops the drift. `D#` is not in the key, so the
 * rule reaches the whole piece (§5A.8).
 */
export const cloudLevelSharedTopDrift: Riff = {
  id: 'cloud-level-shared-top-drift',
  name: 'The Cloud Level shared-top drift',
  reference: { kind: 'patch', name: 'Cloud Level' },
  bpm: { min: 120, max: 132, default: 126 },
  key: 'F# minor',
  /**
   * §12.4/#645. The voicing is held and the arpeggiator sounds it one note at a time, so
   * it costs one voice rather than four. True before this field existed; it went unsaid
   * because this box has four voices and nothing refused it.
   */
  arpeggiatedHold: true,
  technique: [
    'Hold four notes and change three of them every two bars. The top E never moves; the ' +
      'three under it walk the chords, and the arpeggiator keeps coming back to the one note ' +
      'that stayed.',
    'F sharp minor seventh first, then D major with the E as its ninth, then A major with the ' +
      'E on top, then E major with the E as its root. Four chords, one note in common.',
    'Change on the bar head. The arpeggiator is mid-pass whenever you move, and a change on ' +
      'the head is the only one it can absorb without a stumble.',
    'Keep every voicing close, inside an octave and a bit, with the E on top each time. The ' +
      'drift depends on the top note staying the top note.',
    'Never hold D sharp. It is the raised sixth, and it turns the E major at the end into a ' +
      'chord that wants to go home. This loop does not go home.',
    'Play it long. Eight bars is one pass, and the drift is heard on the third or fourth.',
  ],
  request: {
    id: 'cloud-level-shared-top-drift',
    role: 'pad',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4. Four held notes: the widest voicing.
    // §12.4/#645. One voice: the arpeggiator sounds the held voicing a note at a time.
    polyphony: 1,
  },
  /**
   * §5A/#554. The raised sixth as data, reaching the whole piece because the key does not have
   * it.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'VII',
        degree: 6,
        alter: 1,
        reason: 'the raised sixth turns the last chord into a dominant and the drift into a cadence',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },
  /**
   * Eight bars, four voicings, each held for its two bars. `baseOctave: 3` puts `F#3` at
   * degree 1, so `E4` — degree 7 — is the top of every voicing.
   */
  hook: {
    id: 'cloud-level-shared-top-drift-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // `i`: F#3 A3 C#4 E4.
      { step: 1, degree: 1, octave: 0, len: 32 },
      { step: 1, degree: 3, octave: 0, len: 32 },
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 1, degree: 7, octave: 0, len: 32 },
      // `VI`: D3 F#3 A3 E4.
      { step: 33, degree: 6, octave: -1, len: 32 },
      { step: 33, degree: 1, octave: 0, len: 32 },
      { step: 33, degree: 3, octave: 0, len: 32 },
      { step: 33, degree: 7, octave: 0, len: 32 },
      // `III`: C#3 E3 A3 E4.
      { step: 65, degree: 5, octave: -1, len: 32 },
      { step: 65, degree: 7, octave: -1, len: 32 },
      { step: 65, degree: 3, octave: 0, len: 32 },
      { step: 65, degree: 7, octave: 0, len: 32 },
      // `VII`: E3 G#3 B3 E4.
      { step: 97, degree: 7, octave: -1, len: 32 },
      { step: 97, degree: 2, octave: 0, len: 32 },
      { step: 97, degree: 4, octave: 0, len: 32 },
      { step: 97, degree: 7, octave: 0, len: 32 },
    ],
  },
}
