import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The 5TH IN LINE fifths line**: the bass plays each chord's fifth and never its root,
 * for three bars, and the fourth bar is a root. The same pitch opens the figure and closes it,
 * and what changes is the chord underneath.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * bass; the notes are this library's own, and the entry names no device (invariant 3). Nobody
 * writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## What it teaches
 *
 * A bass on the root says which chord it is. A bass on the fifth leaves that to whatever is
 * above it, and the chord floats. Three bars of floating and one of landing is a complete
 * lesson in why a root is worth saving.
 *
 * The figure makes the point with one note. `G2` is the first note of bar one, where it is the
 * fifth of C minor, and the whole of bar four, where it is the root of G minor. Nothing about
 * the pitch changed. The chord under it did, and that is the only reason the last bar sounds
 * like an arrival.
 *
 * ## The harmony is context, and every root is withheld but the last
 *
 * `i VI III v` in C minor, a bar each: Cm, Ab, Eb, Gm. Their fifths are `G`, `Eb`, `Bb`, and
 * the figure opens each bar on one of them. The fourth chord is where the root is allowed, and
 * it gets the whole bar.
 *
 * ## The withheld roots are not a rule, and the rule is about the arrival
 *
 * Withholding a root is a decision about the line, and it stays in the technique where
 * decisions belong. It cannot be data: a chord's root is a tone of that chord, and #605's check
 * refuses a rule that forbids a pitch the chord it names is built on, which is the right answer
 * rather than an obstacle. A figure may decline to play a chord tone; a rule may not call one
 * wrong.
 *
 * What is data is the one pitch the last bar cannot carry. `B` natural over the `v` would make
 * the G minor a G major, and the whole figure is four bars of not resolving. It is in neither
 * chord of the cycle, so the rule contradicts nothing.
 *
 * ## One note at a time
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. `bass-mid / bright` on the box that ships this patch is a mono
 * recipe (#632).
 */
export const fifthInLineFifthsBeforeTheRoot: Riff = {
  id: '5th-in-line-fifths-before-the-root',
  name: 'The 5TH IN LINE fifths line',
  reference: { kind: 'patch', name: '5TH IN LINE' },
  bpm: { min: 104, max: 124, default: 116 },
  key: 'C minor',
  technique: [
    'Three strikes a bar for three bars, and the first of each is the fifth of the chord, never ' +
      'its root. G over the C minor, Eb over the Ab, Bb over the Eb.',
    'The fourth bar is one note, G, held for the whole bar. It is the root of the G minor under ' +
      'it, and it is the first root in the figure.',
    'That last G is the same pitch the figure opened on. In bar one it was the fifth of C minor ' +
      'and it sounded unfinished; in bar four the chord underneath makes it the root, and the ' +
      'line arrives without moving.',
    'After the head of each bar, two more notes, on beat three and on beat four, and each pair ' +
      'is a step. Bar one falls from Bb to Ab. Bar two falls from G to F. Bar three climbs from ' +
      'C to D, and the D is the fifth of the chord bar four is about to land on.',
    'Never play the root of the chord in the first three bars. C over the C minor, Ab over the ' +
      'Ab, Eb over the Eb. Each one resolves the bar early, and there is nothing left for bar ' +
      'four to do.',
    'Hold every note to the next strike. The line is legato until the last bar, which is one ' +
      'unbroken note.',
    'Keep it between Eb2 and D3. The whole figure fits inside a tenth and it is meant to.',
  ],
  request: {
    id: '5th-in-line-fifths-before-the-root',
    role: 'bass-mid',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised seventh over the `v`, which is the only chord in the cycle the figure
   * gives a root to. See the note above on why the withheld roots are prose and not data.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'v',
        degree: 7,
        alter: 1,
        reason: 'a major third on the last chord resolves the figure somewhere it is not going',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'v', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `C2` at degree 1; the line runs
   * `Eb2` to `D3`, eleven semitones, inside any window this box can reach (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, ten notes. Three a bar for the first three, at steps 1, 9 and 13 of the bar, and
   * one note holding the fourth.
   */
  hook: {
    id: '5th-in-line-fifths-before-the-root-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`, C minor: its fifth, G2, then Bb2 and Ab2 stepping down toward the Eb.
      { step: 1, degree: 5, octave: 0, len: 8 },
      { step: 9, degree: 7, octave: 0, len: 4 },
      { step: 13, degree: 6, octave: 0, len: 4 },
      // `VI`, Ab major: its fifth, Eb2, then G2 and F2 stepping toward the Bb.
      { step: 17, degree: 3, octave: 0, len: 8 },
      { step: 25, degree: 5, octave: 0, len: 4 },
      { step: 29, degree: 4, octave: 0, len: 4 },
      // `III`, Eb major: its fifth, Bb2, then C3 and D3 climbing away from it.
      { step: 33, degree: 7, octave: 0, len: 8 },
      { step: 41, degree: 1, octave: 1, len: 4 },
      { step: 45, degree: 2, octave: 1, len: 4 },
      // `v`, G minor: its root, G2, for the whole bar. The arrival.
      { step: 49, degree: 5, octave: 0, len: 16 },
    ],
  },
  /**
   * §5A.2. Ten strikes in one pass: three in each of the first three bars and one in the
   * fourth. The bar heads carry the fifths and are accented; the fourth bar's single strike is
   * the loudest thing here.
   */
  pattern: variant(
    '5th-in-line-fifths-before-the-root-grid',
    'bass-mid',
    0,
    64,
    at('accent', 124, 49),
    at('accent', 112, 1, 17, 33),
    on('downbeat', 9, 25, 41),
    on('offbeat', 13, 29, 45),
  ),
}
