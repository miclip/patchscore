import type { Riff } from '../core/riff'

/**
 * §5A. **The CELESTIAL fixed-star pad**: one pitch held for eight bars while four chords pass
 * under it and change what it is, lifted an octave halfway with a breath either side.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * pad; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *celestial*, the sky, and the
 * figure takes that at its word visibly in the one way a figure can: a star does not move, and
 * the sky under it does. So the part is one pitch, held, and the harmony is what passes beneath
 * it and recolours it; the one move the note makes is upward, once, by an octave. Nothing else
 * about the sky is read into the name. The prose says what to play and nothing about what the
 * preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid and no `reArticulatesHook`.
 *
 * ## One note, by construction
 *
 * Two notes in the hook and never both at once: the low E ends at step 64 and the high E
 * begins at 69, so the peak is one and `test/riff.test.ts` counts it. The box this patch ships
 * on plays two notes; this figure spends one, and is the one held entry on the box that does.
 *
 * ## How it differs from the other held entries written for this box
 *
 * `duotronic-moogtrons-pedal-and-line-pad` holds a note too, and puts a second note over it
 * that moves: that entry is about the pair. `drone-tonic-pedal-under-the-changes` holds one
 * note under the chords, where this one holds it above them: that entry is a floor, and this
 * one is a fixed point the harmony moves under. Same box, three held figures, three different
 * things a held note can be.
 *
 * ## The harmony is context, and it is what moves
 *
 * `i VI iv VII` in E minor, two bars each. The note is `E` throughout, and the chords recolour
 * it: the root of the E minor, the third of the C, the fifth of the A minor, the ninth of the
 * D. The lesson is that a held note changes when the harmony under it does, and the fourth
 * chord is where it changes most, because there the note is the one tone the chord does not
 * contain.
 */
export const celestialFixedStarPad: Riff = {
  id: 'celestial-fixed-star-pad',
  name: 'The CELESTIAL fixed-star pad',
  reference: { kind: 'patch', name: 'CELESTIAL' },
  bpm: { min: 60, max: 84, default: 72 },
  key: 'E minor',
  technique: [
    'One note, E, for eight bars. Four chords pass under it, two bars each, and the note does ' +
      'not move. What moves is what the note is: the root over the E minor, the third over ' +
      'the C, the fifth over the A minor, the ninth over the D.',
    'The name says celestial, so the note is a fixed star and the chords are the sky. Nothing ' +
      'else sounds in this part; the chords are somebody else’s or nobody’s. The figure is one ' +
      'pitch and what happens to it.',
    'Halfway through, lift it an octave. Let the low E go at the end of bar four, breathe for ' +
      'a beat, and enter the high E on beat two of bar five. The gap is what makes the lift ' +
      'heard as distance.',
    'Let the high E go a beat before the end of bar eight, so the low E of the next pass ' +
      'enters over silence and the drop is heard the way the lift was.',
    'The last chord is the one to listen for. Over the D the E is the ninth, the one note the ' +
      'chord does not have, and a held ninth is the whole reason to hold one note through ' +
      'four chords.',
    'Never play a second note. Add the root of each chord and it is a pad playing the ' +
      'changes; this is the changes playing a pad.',
  ],
  request: {
    id: 'celestial-fixed-star-pad',
    role: 'pad',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'iv', bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `E4` at degree 1; the lift
   * goes to `E5` and nothing else sounds. Above middle C, because a star sits over the chords
   * and not among them.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, two notes. `E4` for sixty-four steps, four of silence, `E5` for fifty-six, four
   * of silence to the bar line.
   */
  hook: {
    id: 'celestial-fixed-star-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 4,
    notes: [
      // Bars 1 to 4, over the `i` and the `VI`: E4, released at the end of bar four.
      { step: 1, degree: 1, octave: 0, len: 64 },
      // Bars 5 to 8, over the `iv` and the `VII`: E5 from beat two of bar five, released a
      // beat before the bar line.
      { step: 69, degree: 1, octave: 1, len: 56 },
    ],
  },
}
