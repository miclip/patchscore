import type { Riff } from '../core/riff'

/**
 * §5A. **The PD AdSpace one-note colour pad**: one pitch held for eight bars while four chords
 * pass under it and change what it is, lifted an octave halfway with a breath either side.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * pad; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says that anybody can place is
 * *space*, and the figure takes that at its word visibly in two senses at once: room, since
 * the note holds and nothing crowds it, and distance, since its one move is an octave. It does
 * not read *Ad* as anything, because nothing placeable is there to read. The prose says what to
 * play and nothing about what the preset sounds like, because the name is the whole of the
 * evidence (§3.7).
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid and no `reArticulatesHook`.
 *
 * ## One note, by construction
 *
 * Two notes in the hook and never both at once: the low E ends at step 64 and the high E
 * begins at 69, so the peak is one and `test/riff.test.ts` counts it. The box this patch ships
 * on plays two notes; this figure spends one and leaves the other for the pad's own drift.
 *
 * ## How it differs from the texture written for this box
 *
 * `pd-ghosts-late-entrances-texture` is mostly silence, four short notes in eight bars that
 * arrive off the beat and vanish. This is mostly sound: one hundred and twenty of a hundred and
 * twenty-eight steps sounding, and the eight that are not are the two breaths. Same box, two
 * opposite figures.
 *
 * ## The harmony is context, and it is what moves
 *
 * `i VI iv VII` in E minor, two bars each. The note is `E` throughout, and the chords recolour
 * it: the root of the E minor, the third of the C, the fifth of the A minor, the ninth of the
 * D. The lesson is that a held note changes when the harmony under it does, and the fourth
 * chord is where it changes most, because there the note is the one tone the chord does not
 * contain.
 */
export const pdAdspaceOneNoteColourPad: Riff = {
  id: 'pd-adspace-one-note-colour-pad',
  name: 'The PD AdSpace one-note colour pad',
  reference: { kind: 'patch', name: 'PD AdSpace' },
  bpm: { min: 60, max: 84, default: 72 },
  key: 'E minor',
  technique: [
    'One note, E, for eight bars. Four chords pass under it, two bars each, and the note does ' +
      'not move. What moves is what the note is: the root over the E minor, the third over ' +
      'the C, the fifth over the A minor, the ninth over the D.',
    'The name says space, so give the note room. Nothing else sounds in this part, and the ' +
      'chords are somebody else’s or nobody’s. The figure is one pitch and what happens to it.',
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
    id: 'pd-adspace-one-note-colour-pad',
    role: 'pad',
    priority: 1,
    character: 'dark',
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
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `E3` at degree 1; the lift
   * goes to `E4` and nothing else sounds.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, two notes. `E3` for sixty-four steps, four of silence, `E4` for fifty-six, four
   * of silence to the bar line.
   */
  hook: {
    id: 'pd-adspace-one-note-colour-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // Bars 1 to 4, over the `i` and the `VI`: E3, released at the end of bar four.
      { step: 1, degree: 1, octave: 0, len: 64 },
      // Bars 5 to 8, over the `iv` and the `VII`: E4 from beat two of bar five, released a
      // beat before the bar line.
      { step: 69, degree: 1, octave: 1, len: 56 },
    ],
  },
}
