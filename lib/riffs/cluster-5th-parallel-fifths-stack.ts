import type { Riff } from '../core/riff'

/**
 * §5A. **The Cluster 5th stack**: three notes built as two stacked fifths, held for the
 * arpeggiator, and moved whole to each chord's root. No thirds anywhere, so no chord in the
 * figure has a quality of its own.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5). The notes are this
 * library's own and the entry names no device (invariant 3).
 *
 * ## What it teaches
 *
 * A chord is normally stacked in thirds and its third is what makes it major or minor. Stack it
 * in fifths instead — root, the fifth above, the fifth above that — and there is no third in it
 * at all. The shape has no quality, and a shape with no quality cannot contradict the chord it
 * lands on.
 *
 * That is what lets the whole thing move in parallel. `G D A` becomes `F C G` becomes `Eb Bb F`
 * becomes `C G D`, the same three fingers slid to each root, and none of the four needs
 * voice-leading to sound like it belongs. Try the same parallel move with triads and the fourth
 * bar argues with the third.
 *
 * ## Held, because the patch this is named for is an arpeggiated one
 *
 * `factoryPatches` puts `Cluster 5th` in the box's `Arp` bank, and the two other entries from
 * that bank are both arpeggiated holds (§5A.2, #645). So this is one too: the hand holds three
 * keys, the box sounds them one at a time, and `request.polyphony` is 1 while the hook's peak is
 * 3. Writing it as a struck chord would be writing against the one documented fact anybody here
 * has about the patch.
 *
 * The role is `pad` rather than `arp` because **this box authors no `arp` voice**: its one voice
 * takes `pad`, `stab`, `lead`, `bass-mid`, `sub` and `texture`, and both existing arpeggiated
 * holds here sit on `pad` for the same reason. An `arp` request would not resolve on the box that
 * ships the patch, which `presetSession` refuses outright.
 *
 * It is also the better version of the lesson. Arpeggiated, the absence of a third is a *line*
 * rather than a chord: the ear walks root, fifth, ninth and never meets the note that would say
 * major or minor.
 *
 * ## Against the other eleven on this box
 *
 * `lush-m7-parallel-root-line` is also parallel, and it is the opposite lesson: there one key is
 * a whole seventh chord, so the shape is the preset's and the hand plays roots. Here the hand
 * plays the shape. The other two arpeggiated holds differ in what they ask the hand to do with
 * it: `#brew time` changes how *many* notes are held so the pattern drifts against the bar, and
 * `cloud-level-shared-top-drift` keeps one note common to four voicings. This one keeps the
 * interval and moves everything.
 *
 * ## The third is a decision, not a rule
 *
 * The figure never plays a third and that stays in the technique where decisions belong. A rule
 * forbidding thirds could not be written anyway: the third of the `i` is a tone of the `i`, and
 * the schema refuses a rule that calls a chord tone wrong (#605). What is data is `F#`, which is
 * in none of these four chords and is the note that would give the stack the quality it exists
 * to do without.
 */
export const cluster5thParallelFifthsStack: Riff = {
  id: 'cluster-5th-parallel-fifths-stack',
  name: 'The Cluster 5th stack',
  reference: { kind: 'patch', name: 'Cluster 5th' },
  bpm: { min: 100, max: 124, default: 112 },
  key: 'G minor',
  technique: [
    'Three notes, and the gap between each pair is a fifth: the root, the fifth above it, and the ' +
      'fifth above that. Bar one is G, D, A. There is no third in the chord and that is the point.',
    'Move the whole shape to each root and change nothing else. F, C, G. Then E flat, B flat, F. ' +
      'Then C, G, D. Same hand, four positions.',
    'Hold all three and let the arpeggiator sound them. Change to the next shape on the bar line ' +
      'and hold again. Your hand plays four chords in four bars and nothing else.',
    'Arpeggiated, the missing third is something you can follow: the pattern walks root, fifth, ' +
      'ninth and back, and never touches the note that would make it major or minor.',
    'Play the same four bars as ordinary triads once, to hear what you are avoiding: in parallel ' +
      'they fight, because each one brings a major or a minor with it. The stacked fifths bring ' +
      'neither, so they can all be the same shape.',
    'Never play F sharp. It is the raised seventh, and it is the one note that would hand the ' +
      'stack a quality it is built to do without.',
    'Keep them in one register and close together. Spread wide these read as three separate ' +
      'parts rather than as one chord with a hole in the middle.',
  ],
  request: {
    id: 'cluster-5th-parallel-fifths-stack',
    role: 'pad',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4/#645. The hand holds three; the arpeggiator sounds one at a time, so one voice.
    polyphony: 1,
  },
  /**
   * §5A/#554. The raised seventh, as data. `F#` is a tone of none of the four chords, so the rule
   * contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'a leading tone inside the stack hands it the quality the shape exists to do without',
      },
    ],
  },
  /** §5A.2/#645. Four keys down is not four voices: the box's arpeggiator sounds them one at a time. */
  arpeggiatedHold: true,
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. From bar 1. `baseOctave: 3` puts `G3` at degree 1, so the stacks run from `Eb3` up
   * to `D5`, which is under two octaves end to end.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, twelve notes: four stacks of three, each held for its whole bar. Root, fifth and
   * ninth of the chord, which in scale steps is its degree, four above and eight above.
   */
  hook: {
    id: 'cluster-5th-parallel-fifths-stack-hook',
    forRole: 'pad',
    bars: 4,
    baseOctave: 3,
    notes: [
      // `i`: G3 D4 A4.
      { step: 1, degree: 1, octave: 0, len: 16 },
      { step: 1, degree: 5, octave: 0, len: 16 },
      { step: 1, degree: 2, octave: 1, len: 16 },
      // `VII`: F3 C4 G4.
      { step: 17, degree: 7, octave: -1, len: 16 },
      { step: 17, degree: 4, octave: 0, len: 16 },
      { step: 17, degree: 1, octave: 1, len: 16 },
      // `VI`: Eb3 Bb3 F4.
      { step: 33, degree: 6, octave: -1, len: 16 },
      { step: 33, degree: 3, octave: 0, len: 16 },
      { step: 33, degree: 7, octave: 0, len: 16 },
      // `iv`: C4 G4 D5.
      { step: 49, degree: 4, octave: 0, len: 16 },
      { step: 49, degree: 1, octave: 1, len: 16 },
      { step: 49, degree: 5, octave: 1, len: 16 },
    ],
  },
}
