import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Octavia octave answer**: a two-bar phrase, then the same phrase an octave lower with
 * its last note changed. The register is the phrasing, and one changed note is what turns a
 * repeat into an answer.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * lead; the notes are this library's own, and the entry names no device (invariant 3). Nobody
 * writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## What it teaches, set against the other question-and-answer lead on this box
 *
 * `saw-lead-question-and-answer-line` answers a climb with the same rhythm falling: the contour
 * changes and the register does not. This one changes nothing but the register. The four notes
 * are the four notes, in the same order and the same rhythm, an octave down, and the phrase
 * reads as a reply rather than a repeat because it is lower.
 *
 * **One note is changed, and it is the last one.** The statement ends on `E4`, the fifth, which
 * leaves it open. The answer ends on `A3`, the root, and holds. Play the answer with all five
 * notes the same and the pair sounds like a mistake in the sequencer rather than a phrase and a
 * reply; the ear needs one thing to be different, and the thing that differs should be the end.
 *
 * ## The harmony is deliberately still
 *
 * One chord for four bars, `i` in A minor. The figure is about register and nothing else, so
 * there is nothing else moving: a progression under it would give the answer a second reason to
 * sound different and the lesson would be unprovable. Four bars, one chord, and the only variable
 * is which octave the hand is in.
 *
 * ## The raised seventh is forbidden
 *
 * `G#` is in no chord here and it is the note a hand reaches for to make a static minor chord
 * move. This figure is not going anywhere: it states something and answers it in the same place.
 * The natural `G` the phrase plays is the key's own and the rule does not touch it.
 *
 * ## One note at a time
 *
 * Every note releases before the next is struck, so the peak is one and `test/riff.test.ts`
 * counts it. `lead / dirty` on the box that ships this patch is a mono recipe (#632).
 */
export const octaviaOctaveAnswerLead: Riff = {
  id: 'octavia-octave-answer-lead',
  name: 'The Octavia octave answer',
  reference: { kind: 'patch', name: 'Octavia' },
  bpm: { min: 92, max: 116, default: 104 },
  key: 'A minor',
  technique: [
    'A five-note phrase in bars one and two, then the same phrase an octave lower in bars three ' +
      'and four. Same notes, same order, same rhythm. Only the octave changes.',
    'The phrase is A, C, B, G, E, with the C short and everything after it longer. Start on the ' +
      'bar head and let the last note hold through bar two.',
    'Change one note in the answer and only one: the last. The statement ends on E, which leaves ' +
      'it hanging; the answer ends on A and stays there. Play both endings the same and the two ' +
      'bars sound like a repeat rather than a reply.',
    'Do not play the answer quieter. The octave is what makes it an answer, and adding a ' +
      'dynamic on top gives the ear two reasons and hides which one is working.',
    'Let bars two and four breathe. The phrase is five notes in two bars and the rest is silence, ' +
      'which is how the answer arrives as a separate thing rather than as a continuation.',
    'Never play G sharp. It is the raised seventh, and one of them turns a figure that stays ' +
      'still into one that is on its way somewhere.',
    'Keep it between G3 and C5. Both statements sit inside that, and the low one should still ' +
      'read as a lead rather than as a bass line.',
  ],
  request: {
    id: 'octavia-octave-answer-lead',
    role: 'lead',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised seventh over the one chord there is. `G#` is not a tone of `i`, so the
   * rule contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'a leading tone sends a figure that is meant to stay in one place',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [{ degree: 'i', bars: 4 }],
  },
  /**
   * §5A/§4.1. From bar 1. `baseOctave: 3` puts `A3` at degree 1, so the statement runs `A4` to
   * `C5` and the answer `G3` to `C4`: `G3` to `C5` end to end, seventeen semitones, inside the
   * board this box declares (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, ten notes: the same five twice. Onsets at 1, 5, 7, 11, 17 and again 32 steps
   * later, so the two statements are identical in time as well as in shape.
   */
  hook: {
    id: 'octavia-octave-answer-lead-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 3,
    notes: [
      // The statement: A4 C5 B4 G4, then E4 held through bar two.
      { step: 1, degree: 1, octave: 1, len: 4 },
      { step: 5, degree: 3, octave: 1, len: 2 },
      { step: 7, degree: 2, octave: 1, len: 4 },
      { step: 11, degree: 7, octave: 0, len: 6 },
      { step: 17, degree: 5, octave: 0, len: 8 },
      // The answer, an octave down, and the last note is the root rather than the fifth.
      { step: 33, degree: 1, octave: 0, len: 4 },
      { step: 37, degree: 3, octave: 0, len: 2 },
      { step: 39, degree: 2, octave: 0, len: 4 },
      { step: 43, degree: 7, octave: -1, len: 6 },
      { step: 49, degree: 1, octave: 0, len: 16 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck and nothing between them. The two phrase heads are the
   * accents, and the answer's head is the lighter of the two because it is a reply.
   */
  pattern: variant(
    'octavia-octave-answer-lead-grid',
    'lead',
    0,
    64,
    at('accent', 118, 1),
    at('accent', 104, 33),
    on('downbeat', 17, 49),
    on('offbeat', 5, 7, 11, 37, 39, 43),
  ),
}
