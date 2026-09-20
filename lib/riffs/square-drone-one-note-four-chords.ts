import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Square Drone one note**: `G` for eight bars, struck once a chord, and the chords
 * underneath change what it is four times. The last one makes it wrong, and you hold it anyway.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5). The notes are this
 * library's own and the entry names no device (invariant 3). Nobody writing this had heard the
 * preset; the name gives the part and the register, and the figure is written for those.
 *
 * ## What it teaches, against the other eleven on this box
 *
 * Every other figure on this box moves something. Four pads move voices, three leads move a line,
 * two basses move a shape, two stabs move a voicing. This one moves nothing at all and puts the
 * whole burden on the harmony underneath: the note is struck at each chord and is a different
 * thing every time.
 *
 * `G` is the fifth of the `i`, the major seventh of the `VI`, the third of the `III` and then,
 * over the `bII`, a tritone. **The last one is the figure.** Three bars teach the reader to hear
 * the note as belonging, and the fourth keeps it while the ground moves out from under it. A
 * drone is not a held note; it is a decision to keep holding when the harmony argues.
 *
 * ## The restrike is what makes the change audible
 *
 * The same pitch, struck once at every chord. Held straight through it would still be true and a
 * reader would hear one long note and four chords; struck again at each change it is one note
 * being reintroduced into a room that has changed, which is what a drone does.
 *
 * ## The rule is the semitone the `bII` brings
 *
 * `C` is the key's own root, and against the `Db` under bar seven it is a semitone. A hand that
 * reaches for the tonic to steady the clash makes a worse one. `C` is fine over the other three
 * chords and the rule reaches only the `bII` (#605).
 */
export const squareDroneOneNoteFourChords: Riff = {
  id: 'square-drone-one-note-four-chords',
  name: 'The Square Drone one note',
  reference: { kind: 'patch', name: 'Square Drone' },
  bpm: { min: 72, max: 96, default: 84 },
  key: 'C minor',
  technique: [
    'One note for the whole figure: G. Strike it at each chord change and hold it until the next. ' +
      'You are not playing a line, you are keeping a note while the harmony moves.',
    'Over the first chord it is the fifth. Over the second it is the major seventh, which is where ' +
      'it stops sounding plain. Over the third it is the third. Nothing in your hand did any of ' +
      'that.',
    'Over the last chord it is a tritone and it is meant to be. Three bars taught the ear that ' +
      'the note belongs; the fourth keeps it while the ground moves. Let it sit there for the ' +
      'whole two bars.',
    'Strike it again at each change rather than holding straight through. Held, it is one long ' +
      'note under four chords; restruck, it is the same note walking into four different rooms.',
    'Never play C while the last chord is sounding. It is the root of the key and a semitone off ' +
      'that chord, and reaching for it to steady the clash makes a worse one.',
    'Same velocity every time. The note is not building to anything and an accent would say it ' +
      'was.',
  ],
  request: {
    id: 'square-drone-one-note-four-chords',
    role: 'texture',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The key's own root over the `bII`, as data. `C` is not a tone of `Db`, so the rule
   * contradicts nothing it is checked against, and it reaches that chord alone.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'bII',
        degree: 1,
        reason: 'the tonic is a semitone off the flat two, and reaching for it to steady the clash makes a worse one',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'III', bars: 2 },
      { degree: 'bII', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. From bar 1. `baseOctave: 3` puts `C3` at degree 1, so the drone is `G3` throughout
   * and never moves.
   */
  figureStartsAtBar: 1,
  /** Eight bars, four notes, one pitch: struck at each chord and held for its two bars. */
  hook: {
    id: 'square-drone-one-note-four-chords-hook',
    forRole: 'texture',
    bars: 8,
    baseOctave: 3,
    notes: [
      { step: 1, degree: 5, octave: 0, len: 32 },
      { step: 33, degree: 5, octave: 0, len: 32 },
      { step: 65, degree: 5, octave: 0, len: 32 },
      { step: 97, degree: 5, octave: 0, len: 32 },
    ],
  },
  /** §5A.2. One strike every two bars, on the chord. A 32-step grid, four passes under the hook. */
  pattern: variant('square-drone-one-note-four-chords-grid', 'texture', 0, 32, at('accent', 96, 1)),
}
