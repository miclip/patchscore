import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The 70s TV PI Theme sequenced motif**: one four-note shape, stated three times and
 * dropping a step each time, then a fourth bar that turns the shape upside down and lands.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * lead; the notes are this library's own, and the entry names no device (invariant 3). Nobody
 * writing this had heard the preset, and nothing here says what it sounds like.
 *
 * ## What a sequence is, and why the fourth bar breaks it
 *
 * A sequence is one shape moved. The shape here is up a third, up a third, back down a third,
 * played on the same four sixteenth positions in every bar: `D F A F`, then `C E G E`, then
 * `Bb D F D`. Three statements, each a step lower than the last, and by the third one a listener
 * knows where the fourth is going.
 *
 * **Which is why there is no fourth statement.** Bar four inverts the shape, falls `A F C#`
 * instead of climbing, and steps up a semitone onto the root to finish. A sequence with four
 * statements is a scale exercise; a sequence with three and a break is a theme. The break is the
 * part anybody remembers.
 *
 * ## The harmony is context, and the roots fall with the motif
 *
 * `i VII VI V` in D minor, a bar each: Dm, C, Bb, A. The first three roots are the first note of
 * each statement, so the motif and the chords descend together and the shape is heard moving
 * rather than the key changing. The `V` is major, and its `C#` is the semitone the last bar steps
 * up from.
 *
 * ## The seventh is forbidden over the V
 *
 * `C` natural is the key's own note and the `V` is built on its raised form. A natural `C`
 * sounding over that chord takes the cadence out of the last bar, which is the only bar in the
 * figure that cadences. The `C#` the figure plays is the raised spelling of the same degree,
 * which the rule does not reach, and the `C` in bar two is over the `VII`, where it is the root.
 *
 * ## One note at a time
 *
 * Every note runs to the next strike and none past it, so the peak is one and
 * `test/riff.test.ts` counts it. `lead / hard` on the box that ships this patch is a mono recipe
 * (#632).
 */
export const seventiesTvPiThemeSequencedMotif: Riff = {
  id: '70s-tv-pi-theme-sequenced-motif',
  name: 'The 70s TV PI Theme sequenced motif',
  reference: { kind: 'patch', name: '70s TV PI Theme' },
  bpm: { min: 108, max: 132, default: 120 },
  key: 'D minor',
  technique: [
    'One shape, four notes, played three times: up a third, up a third, back down a third. Bar ' +
      'one is D F A F, bar two is C E G E, bar three is Bb D F D. Same fingering every time, ' +
      'one step lower.',
    'The four notes sit on the bar head, the last sixteenth of beat one, the "and" of two and ' +
      'the last sixteenth of beat three. That placement is the shape as much as the pitches are; ' +
      'play it straight and the theme disappears.',
    'Bar four does not continue. The shape turns over and falls, A down to F down to C sharp, ' +
      'and then steps up a semitone onto D and holds. Three statements and a break is a theme; ' +
      'four statements is an exercise.',
    'The C sharp is the one note the key does not own, and it is the whole cadence. Land on it ' +
      'late in the bar and let it lean up into the D rather than sliding.',
    'Never play C natural while the last chord is sounding. It is the note the C sharp replaces, ' +
      'and one of them takes the ending out of the figure.',
    'Play the first note of each bar the loudest and let the other three fall away. The theme is ' +
      'heard as three descending arrivals, not twelve even notes.',
  ],
  request: {
    id: '70s-tv-pi-theme-sequenced-motif',
    role: 'lead',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The natural seventh over the `V`, which is built on its raised form. `C` is not a
   * tone of A major, so the rule contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the C natural is the note the raised one replaces, and it takes the ending away',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `D4` at degree 1, so the figure
   * runs `Bb3` to `A4`, eleven semitones, inside the board this box declares (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes: four a bar at steps 1, 4, 7 and 12 of each, held to the next
   * strike. The last note of bar four runs to the bar line.
   */
  hook: {
    id: '70s-tv-pi-theme-sequenced-motif-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`, D minor: D F A F.
      { step: 1, degree: 1, octave: 0, len: 3 },
      { step: 4, degree: 3, octave: 0, len: 3 },
      { step: 7, degree: 5, octave: 0, len: 5 },
      { step: 12, degree: 3, octave: 0, len: 5 },
      // `VII`, C major: the same shape a step down.
      { step: 17, degree: 7, octave: -1, len: 3 },
      { step: 20, degree: 2, octave: 0, len: 3 },
      { step: 23, degree: 4, octave: 0, len: 5 },
      { step: 28, degree: 2, octave: 0, len: 5 },
      // `VI`, Bb major: a step down again, and the third statement is where the ear gets ahead.
      { step: 33, degree: 6, octave: -1, len: 3 },
      { step: 36, degree: 1, octave: 0, len: 3 },
      { step: 39, degree: 3, octave: 0, len: 5 },
      { step: 44, degree: 1, octave: 0, len: 5 },
      // `V`, A major: the shape inverted, falling to the raised seventh, then up a semitone.
      { step: 49, degree: 5, octave: 0, len: 3 },
      { step: 52, degree: 3, octave: 0, len: 3 },
      { step: 55, degree: 7, octave: -1, alter: 1, len: 5 },
      { step: 60, degree: 1, octave: 0, len: 5 },
    ],
  },
  /**
   * §5A.2. One pass, sixteen strikes, four a bar on the same four positions. The bar heads carry
   * the statements and are accented; bar four's head is the loudest, because the break is the
   * part the figure is for.
   */
  pattern: variant(
    '70s-tv-pi-theme-sequenced-motif-grid',
    'lead',
    0,
    64,
    at('accent', 122, 49),
    at('accent', 114, 1, 17, 33),
    on('offbeat', 4, 7, 12, 20, 23, 28, 36, 39, 44, 52, 55, 60),
  ),
}
