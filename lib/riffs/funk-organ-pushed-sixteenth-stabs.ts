import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The FUNK ORGAN pushed-sixteenth stabs**: one note at a time, struck on the one and
 * then on the pushes — the sixteenth before a beat, the sixteenth after it, the "and" — with the
 * last two sixteenths of every bar left empty so the one lands on air.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * organ stab; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *funk* and *organ*, and the figure
 * takes the first at its word visibly and the second as the role. Funk is a rhythm before it is
 * anything else: the one, and then the pushes, the strikes a sixteenth ahead of a beat and a
 * sixteenth behind it that make a bar lean forward. So every stab here is on the one or on a
 * push, and none is on beats two, three or four. Organ says a struck keyboard sound, which is
 * the stab role, and nothing more is taken from it. The prose says what to play and nothing
 * about what the preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, and why a stab here is a line
 *
 * The box this patch ships on plays two notes, and a triad stab is out of its reach. So this is
 * a stab written as a single line over implied harmony: the chord is what plays under it, and
 * this part plays one tone of it at a time. No two notes share a step, the peak is one, and
 * `test/riff.test.ts` counts it. `duo-org-parallel-thirds-comp`, on the same box, is the organ
 * figure that spends the second note; this one spends the rhythm.
 *
 * ## The harmony is context, and the dorian sixth is the point
 *
 * `i IV` twice, one bar each, in A dorian. The `IV` is D major because the mode's sixth is
 * `F#`, and that one note is the difference between a vamp that is funk and a vamp that is
 * minor. The stabs over the A minor are its fifth and seventh, `E` and `G`, with the root above
 * on the one; the stabs over the D are its third, `F#`, with the root and fifth around it. Bar
 * four turns: the `G` on the push before beat four is the fourth of the D, passing, and the `E`
 * on the last push leads back to the `A`.
 *
 * ## Why the natural sixth is forbidden
 *
 * `F` natural is A minor's sixth, and one of them turns the D major into D minor and the vamp
 * into something sadder. `F` is not in A dorian, so the rule reaches the whole piece (§5A.8),
 * and neither chord carries it.
 */
export const funkOrganPushedSixteenthStabs: Riff = {
  id: 'funk-organ-pushed-sixteenth-stabs',
  name: 'The FUNK ORGAN pushed-sixteenth stabs',
  reference: { kind: 'patch', name: 'FUNK ORGAN' },
  bpm: { min: 96, max: 116, default: 104 },
  key: 'A dorian',
  technique: [
    'The name says funk, so the figure is the one and the pushes. Strike the bar head, then ' +
      'the sixteenth before beat two, the "and" of two, the sixteenth before beat four and the ' +
      'sixteenth after it. Never beat two, three or four itself.',
    'One note at a time. Over the A minor: the root on the one, the fifth on the pushes, the ' +
      'seventh on the push before beat four. Over the D: the third on the one, the root and ' +
      'fifth around it. The chord is what plays under you; this part plays one note of it.',
    'The one is the long stab, two sixteenths. Every push is one sixteenth and stops. A stab ' +
      'that rings past its push is late for the next one, and late is the one thing funk is ' +
      'not.',
    'Leave the push into the one empty. The "and" of four and the sixteenth before the bar ' +
      'line are silent in every bar, so the one lands on air and the bar leans into it.',
    'Two chords, a bar each, twice: A minor, D major. The F sharp in the D is the sixth of A ' +
      'dorian, and it is the whole reason the vamp sounds the way it does. Play it as the ' +
      'third of the chord, on the one, and mean it.',
    'Bar four turns: the G on the push before beat four is the fourth of the D, passing, and ' +
      'the E on the last push leads back up to the A. The other three bars are the same shape; ' +
      'the fourth is how the pass says it is ending.',
    'Never play F natural. It turns the D major into D minor, and the vamp stops being funk ' +
      'and starts being sad.',
  ],
  request: {
    id: 'funk-organ-pushed-sixteenth-stabs',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The natural sixth as data, over the `IV` where it would do the damage, and
   * reaching the whole piece because the mode does not have it. Every chord is entered on its
   * bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'IV',
        degree: 6,
        alter: -1,
        reason: 'the natural sixth turns the D major into D minor, and the vamp stops being funk',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'i', bars: 1 },
      { degree: 'IV', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `A4` at degree 1; the stabs run
   * from `D4` to `A4`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, twenty notes. Five stabs a bar at steps 1, 4, 7, 12 and 14 of the bar; the one is
   * two steps long and every push is one.
   */
  hook: {
    id: 'funk-organ-pushed-sixteenth-stabs-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: A4 on the one; E4, E4, G4, E4 on the pushes.
      { step: 1, degree: 1, octave: 0, len: 2 },
      { step: 4, degree: 5, octave: -1, len: 1 },
      { step: 7, degree: 5, octave: -1, len: 1 },
      { step: 12, degree: 7, octave: -1, len: 1 },
      { step: 14, degree: 5, octave: -1, len: 1 },
      // `IV`: F#4 on the one; D4, F#4, A4, D4 on the pushes.
      { step: 17, degree: 6, octave: -1, len: 2 },
      { step: 20, degree: 4, octave: -1, len: 1 },
      { step: 23, degree: 6, octave: -1, len: 1 },
      { step: 28, degree: 1, octave: 0, len: 1 },
      { step: 30, degree: 4, octave: -1, len: 1 },
      // `i` again, the same shape.
      { step: 33, degree: 1, octave: 0, len: 2 },
      { step: 36, degree: 5, octave: -1, len: 1 },
      { step: 39, degree: 5, octave: -1, len: 1 },
      { step: 44, degree: 7, octave: -1, len: 1 },
      { step: 46, degree: 5, octave: -1, len: 1 },
      // `IV`, the turn: F#4 on the one; D4, F#4, then G4 passing and E4 leading back.
      { step: 49, degree: 6, octave: -1, len: 2 },
      { step: 52, degree: 4, octave: -1, len: 1 },
      { step: 55, degree: 6, octave: -1, len: 1 },
      { step: 60, degree: 7, octave: -1, len: 1 },
      { step: 62, degree: 5, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. The one at 118; the "and" of two as an offbeat; the
   * pushes a sixteenth either side of a beat as accents at 104, because in funk the push is
   * leaned on rather than ghosted.
   */
  pattern: variant(
    'funk-organ-pushed-sixteenth-stabs-grid',
    'stab',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 104, 4, 12, 14, 20, 28, 30, 36, 44, 46, 52, 60, 62),
    on('offbeat', 7, 23, 39, 55),
  ),
}
