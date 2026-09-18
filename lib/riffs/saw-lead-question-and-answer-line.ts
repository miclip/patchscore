import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The SAW LEAD question-and-answer line**: a bar rising through the D minor to a held
 * high `F`, then the same rhythm falling through the F major to a held `E`. Bars three and four
 * are bars one and two turned upside down.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624, #643). The patch
 * is a lead; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## Question and answer
 *
 * Bar one climbs `D4 F4 A4 D5`, four strikes on the one, the "and" of two, three and the "and"
 * of four, and bar two holds `F5` for the whole bar. Bar three falls `F5 D5 A4 F4` on the same
 * four strikes, and bar four holds `E4`. Same rhythm both halves; the direction inverts. The
 * question climbs an octave and lands a third higher still; the answer falls the same octave
 * and lands a step above where the question began. The `E4` is the fifth of the A major under
 * it, and the pass re-entering on `D4`, a step below, is heard as the answer closing.
 *
 * #624's figure was one note held for a bar and a half and thrown up an octave, five notes in
 * four bars. This replaces it (#643).
 *
 * ## One note at a time, by construction
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; a lead uses one,
 * and `lead / bright` there is a mono recipe (#632).
 *
 * ## The harmony is context, and the last chord is major
 *
 * `i VI III V` in D minor, one bar each: Dm, Bb, F, A. The `V` is A major, whose third is `C#`,
 * the one note D minor does not own, and the line's held `E4` is that chord's fifth. The rule
 * as data is the natural seventh over the `V`: `C` against `C#` is the answer refusing to
 * close.
 *
 * ## The grid is the whole cycle in one pass
 *
 * Four bars, ten strikes, 64 steps. The two held notes are the accents, the question's at 118
 * and the answer's at 120, because the answer is the one that lands.
 */
export const sawLeadQuestionAndAnswerLine: Riff = {
  id: 'saw-lead-question-and-answer-line',
  name: 'The SAW LEAD question-and-answer line',
  reference: { kind: 'patch', name: 'SAW LEAD' },
  bpm: { min: 112, max: 132, default: 124 },
  key: 'D minor',
  technique: [
    'Two bars of question, two of answer, and the answer is the question upside down. Bar one ' +
      'climbs D, F, A, D, on the one, the "and" of two, three and the "and" of four. Bar two ' +
      'is one note, the F above, held for the whole bar.',
    'Bar three falls from that F: F, D, A, F, on the same four strikes. Bar four is one note, ' +
      'E, held for the whole bar. Same rhythm as the first half, the other direction.',
    'The two held notes are the figure. Lean into the high F as the top of the question and ' +
      'lean harder into the E as the bottom of the answer, and then let the next pass start ' +
      'on the D a step below it.',
    'Hold each note to the next strike so the climb and the fall are lines and not steps. ' +
      'Let the E go two sixteenths before the bar line, so the D that opens the next pass ' +
      'lands on silence.',
    'The last chord is A major, and its third is C sharp. Never play C natural while it is ' +
      'sounding; the E is its fifth, and the C sharp is what pulls the next pass back to D.',
    'If the sound moves on its own while a note is held, the two held bars are where it ' +
      'shows. Keep them the full bar, and keep the climbing and falling bars plain.',
  ],
  request: {
    id: 'saw-lead-question-and-answer-line',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The natural seventh over the `V` as data: the key's own note, forbidden over the
   * one chord built on its raised form. Every chord is entered on its bar head, so there is no
   * offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the A chord is major, and C natural against its C sharp is the answer refusing to close',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `D4` at degree 1; the line runs
   * from `D4` to `F5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, ten notes. Bars one and three strike steps 1, 7, 9 and 15 of the bar, held six,
   * two, six and two. Bar two is one note of sixteen; bar four is one of fourteen.
   */
  hook: {
    id: 'saw-lead-question-and-answer-line-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`, the question: D4, F4, A4, D5.
      { step: 1, degree: 1, octave: 0, len: 6 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 9, degree: 5, octave: 0, len: 6 },
      { step: 15, degree: 1, octave: 1, len: 2 },
      // `VI`: F5, held.
      { step: 17, degree: 3, octave: 1, len: 16 },
      // `III`, the answer: F5, D5, A4, F4.
      { step: 33, degree: 3, octave: 1, len: 6 },
      { step: 39, degree: 1, octave: 1, len: 2 },
      { step: 41, degree: 5, octave: 0, len: 6 },
      { step: 47, degree: 3, octave: 0, len: 2 },
      // `V`: E4, held, released two steps early.
      { step: 49, degree: 2, octave: 0, len: 14 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. The held F5 at 118 and the held E4 at 120; the two
   * moving bars' heads and beat threes as downbeats, their "and"s as offbeats.
   */
  pattern: variant(
    'saw-lead-question-and-answer-line-grid',
    'lead',
    0,
    64,
    at('accent', 118, 17),
    at('accent', 120, 49),
    on('downbeat', 1, 9, 33, 41),
    on('offbeat', 7, 15, 39, 47),
  ),
}
