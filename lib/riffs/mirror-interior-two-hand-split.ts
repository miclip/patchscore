import type { Riff } from '../core/riff'

/**
 * §5A. **The Mirror Interior two-hand split**: a bass walked in the left hand under a chord the
 * right hand holds for the box's arpeggiator, and the two move in contrary motion.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #654). The patch loads
 * with the keyboard split, one sound sustaining on the left of the split point and the other
 * arpeggiating on the right. The name of the patch and that split are the whole of what the
 * figure takes from it. The voicings and the bass line are this library's own and were written
 * at a desk; nothing here is transcribed from anything, and nobody has played it. The entry
 * names no device (invariant 3).
 *
 * ## The lesson, and why it is this box's own
 *
 * One player is playing two instruments at once, and only one of them is arpeggiating. The
 * left hand plays every note it sounds. The right hand changes a voicing on a bar head and then
 * leaves it alone for two bars, and all the movement heard on that side is the box's. Nothing
 * else in this folder can teach that: `harp-c-chord-arpeggiated-hold` teaches that an
 * arpeggiator is how a one-note synth holds a chord, and the two figures written for the
 * arpeggiated programs of a four-voice box (`brew-time-major-seventh-hold`,
 * `cloud-level-shared-top-drift`) teach the voicing and the moment of change with nothing
 * played underneath. Those three are the ground this one stands beside and does not restate.
 *
 * ## The mirror
 *
 * E minor, `i VI III VII`, two bars a chord, eight bars round: Em, C, G, D. The bass descends
 * across the four chords, `E2`, `C2`, `B1`, `A1`, while the top of the arpeggiated voicing
 * climbs, `B4`, `C5`, `D5`, `F#5`. That contrary motion is the reason to write this figure
 * over these chords and not any other, and `test/riff.test.ts` pins both lines.
 *
 * The bass is one shape a bar, root, root, third, root, on beat 1, the and of 2, beat 3 and the
 * and of 4, each note held until the next. Over the D it is `A1 A1 C#2 A1`: the third of D is
 * F#, and the note the bass reaches for is the chord's seventh, `C#`, which E minor does not
 * own. It is degree 6 with `alter: 1`, the same spelling `vox-humana-four-part-voice-leading`
 * uses for its raised seventh. The right hand is a close triad a chord, `E4 G4 B4`, `E4 G4 C5`,
 * `G4 B4 D5`, `A4 D5 F#5`, with the moving top note on top.
 *
 * ## Four notes, and why not an arpeggiated hold
 *
 * At any instant two notes sound on the box: the bass, and whichever note of the voicing the
 * arpeggiator is on. `arpeggiatedHold` would say the whole figure is held under an arpeggiator
 * and costs one voice, and half of it is not: the left hand is played, note by note, on a sound
 * with no arpeggiator running. A flag that fits the schema is not the same as a flag that is
 * true, so the figure is declared as what the hands hold. `polyphony: 4` is the widest hold in
 * the hook, the bass under a triad, and one timbre of the box that ships the patch has four
 * voices, so it resolves today. It overstates what sounds. Whether a split deserves a way to
 * say that one half arpeggiates and the other does not is a question this entry leaves open.
 *
 * ## An `arp` with no grid
 *
 * `arp` is a struck role, so the entry has to answer `reArticulatesHook`, and the answer is
 * `false` (§5A.2, #623). A grid strikes every note in force at its step, and the two hands
 * have different rhythms: the bass is struck four times a bar, and the voicing is struck once
 * in two bars and never again by the hand. Any grid that marked the bass would re-strike the
 * chord under it, so no grid is the true one, and the hook is the whole rhythm.
 */
export const mirrorInteriorTwoHandSplit: Riff = {
  id: 'mirror-interior-two-hand-split',
  name: 'The Mirror Interior two-hand split',
  reference: { kind: 'patch', name: 'Mirror Interior' },
  bpm: { min: 96, max: 120, default: 108 },
  key: 'E minor',
  technique: [
    'The keyboard is split. Left of the split point the sound sustains and plays what you ' +
      'play; right of it the sound is arpeggiated, and holding a chord there sets the ' +
      'arpeggiator running through it. You are playing two instruments at once, and only one ' +
      'of them is arpeggiating.',
    'Left hand, one shape a bar: root, root, third, root. On beat one, the and of two, beat ' +
      'three and the and of four, and hold each note until the next. E minor for two bars is ' +
      'E, E, G, E, low on the keyboard.',
    'Right hand, one voicing a chord, held for the two bars. E, G and B above it for the E ' +
      'minor. Press it on the bar head and leave it alone; the box does the moving on that ' +
      'side, and your hand does none.',
    'Then C: the bass drops to C, C, E, C, and the right hand lifts the top note only, so the ' +
      'chord is E, G and the C above. Then G: the bass drops again to B, B, D, B, and the ' +
      'voicing becomes G, B and D. Then D: the bass drops to A, A, C sharp, A, and the voicing ' +
      'is A, D and F sharp on top.',
    'Listen to the two outside notes. The bass falls a step or two at every chord, E, C, B, A, ' +
      'and the top of the arpeggio rises at every chord, B, C, D, F sharp. The hands move in ' +
      'opposite directions, and that is the mirror.',
    'The C sharp under the D is the one note outside E minor. Reach for it; the third of D is ' +
      'F sharp, and this bass goes to the seventh instead, which is what makes the last two ' +
      'bars lean back towards the E minor on the repeat.',
    'All the movement you play is in the left hand. All the movement you hear on the right is ' +
      'the arpeggiator. If the right hand ever feels busy, it is doing too much: one press a ' +
      'chord is the whole of its part.',
  ],
  request: {
    id: 'mirror-interior-two-hand-split',
    role: 'arp',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    // §12.4. The widest hold in the hook: a bass note under a three-note voicing. Four keys
    // down, on a box whose timbre has four voices. See the header for what it overstates.
    polyphony: 4,
    // §5A.2/#623. No grid: the bass is struck four times a bar and the voicing once in two,
    // and a grid strikes every note in force, so the hook carries the whole rhythm.
    reArticulatesHook: false,
  },
  /**
   * §5A/§4.1. From bar 1. `i VI III VII` in E minor, two bars each: Em, C, G, D. The `VII` is
   * D major, and the bass plays its seventh, the raised sixth of the key.
   */
  figureStartsAtBar: 1,
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
   * Eight bars, forty-four notes: thirty-two in the bass, four voicings of three above them.
   * `baseOctave: 2` puts `E2` at degree 1, so `octave: 0` runs `E2` to `D3`, the bass notes
   * below `E2` are `octave: -1`, and the voicings sit at `octave: 2` and `octave: 3`, two
   * octaves and more above.
   *
   * Each chord holds 32 steps, chord *n* from `(n-1)*32+1` to `n*32`. The bass is struck at
   * steps 1, 7, 9 and 15 of every bar and each note runs to the next strike, so it sounds
   * without a gap. The voicing enters on its chord's first step and holds all 32. Within a step
   * the notes are authored bottom to top, bass first, and that order is the voicing
   * (`resolveHook` keeps it).
   */
  hook: {
    id: 'mirror-interior-two-hand-split-hook',
    forRole: 'arp',
    bars: 8,
    baseOctave: 2,
    notes: [
      // `i`, E minor, bars 1-2. Bass E2 E2 G2 E2; voicing E4 G4 B4.
      { step: 1, degree: 1, octave: 0, len: 6 },
      { step: 1, degree: 1, octave: 2, len: 32 },
      { step: 1, degree: 3, octave: 2, len: 32 },
      { step: 1, degree: 5, octave: 2, len: 32 },
      { step: 7, degree: 1, octave: 0, len: 2 },
      { step: 9, degree: 3, octave: 0, len: 6 },
      { step: 15, degree: 1, octave: 0, len: 2 },
      { step: 17, degree: 1, octave: 0, len: 6 },
      { step: 23, degree: 1, octave: 0, len: 2 },
      { step: 25, degree: 3, octave: 0, len: 6 },
      { step: 31, degree: 1, octave: 0, len: 2 },
      // `VI`, C major, bars 3-4. Bass C2 C2 E2 C2; voicing E4 G4 C5. The top note lifts.
      { step: 33, degree: 6, octave: -1, len: 6 },
      { step: 33, degree: 1, octave: 2, len: 32 },
      { step: 33, degree: 3, octave: 2, len: 32 },
      { step: 33, degree: 6, octave: 2, len: 32 },
      { step: 39, degree: 6, octave: -1, len: 2 },
      { step: 41, degree: 1, octave: 0, len: 6 },
      { step: 47, degree: 6, octave: -1, len: 2 },
      { step: 49, degree: 6, octave: -1, len: 6 },
      { step: 55, degree: 6, octave: -1, len: 2 },
      { step: 57, degree: 1, octave: 0, len: 6 },
      { step: 63, degree: 6, octave: -1, len: 2 },
      // `III`, G major, bars 5-6. Bass B1 B1 D2 B1; voicing G4 B4 D5.
      { step: 65, degree: 5, octave: -1, len: 6 },
      { step: 65, degree: 3, octave: 2, len: 32 },
      { step: 65, degree: 5, octave: 2, len: 32 },
      { step: 65, degree: 7, octave: 2, len: 32 },
      { step: 71, degree: 5, octave: -1, len: 2 },
      { step: 73, degree: 7, octave: -1, len: 6 },
      { step: 79, degree: 5, octave: -1, len: 2 },
      { step: 81, degree: 5, octave: -1, len: 6 },
      { step: 87, degree: 5, octave: -1, len: 2 },
      { step: 89, degree: 7, octave: -1, len: 6 },
      { step: 95, degree: 5, octave: -1, len: 2 },
      // `VII`, D major, bars 7-8. Bass A1 A1 C#2 A1; voicing A4 D5 F#5. The C# is the raised
      // sixth of the key, D's seventh, and the one note E minor does not own.
      { step: 97, degree: 4, octave: -1, len: 6 },
      { step: 97, degree: 4, octave: 2, len: 32 },
      { step: 97, degree: 7, octave: 2, len: 32 },
      { step: 97, degree: 2, octave: 3, len: 32 },
      { step: 103, degree: 4, octave: -1, len: 2 },
      { step: 105, degree: 6, octave: -1, len: 6, alter: 1 },
      { step: 111, degree: 4, octave: -1, len: 2 },
      { step: 113, degree: 4, octave: -1, len: 6 },
      { step: 119, degree: 4, octave: -1, len: 2 },
      { step: 121, degree: 6, octave: -1, len: 6, alter: 1 },
      { step: 127, degree: 4, octave: -1, len: 2 },
    ],
  },
}
