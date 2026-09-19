import type { Riff } from '../core/riff'

/**
 * §5A. **The SYNTH GONG decay-spaced strikes**: seven strikes in eight bars, each one placed
 * where the last has gone rather than on a beat, and the gaps closing from a bar and a half to
 * half a bar before the final strike holds for two.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The patch is the
 * struck sound; the notes are this library's own, and the entry names no device (invariant 3).
 * Nobody writing this had heard the preset, and nothing here says what it sounds like: the name
 * gives what is struck and how long it takes to go, and the figure is written for those.
 *
 * ## What it teaches, and why it is the first `texture` in the library
 *
 * Every other figure on this box is counted in sixteenths against a grid. This one is counted in
 * decays: you strike, you wait for the sound to leave, and the next strike goes where the room
 * is empty. The lesson is that the gap is the instrument. A gong struck on the beat is a drum
 * with a long tail; struck late enough to be alone, it is the only thing in the bar.
 *
 * The gaps shorten on purpose. Twenty-four steps, twenty, eighteen, fourteen, twelve, eight: the
 * figure crowds itself, and the last strike arrives on a bar head, which is the one place nothing
 * else has landed. That is the arrival, and it is the only strike a listener can predict.
 *
 * #643 reduced this box's one `texture` entry to a use line and said so plainly: *no `texture` in
 * the library until somebody writes one worth playing*. This is that entry.
 *
 * ## Through-composed, so no grid (§5A.2, #623)
 *
 * `texture` is a struck role, so the schema requires `reArticulatesHook` and refuses silence on
 * it. `false` is the answer here: no two strikes share a step of any repeating pass, the hook is
 * the whole rhythm, and a grid beside it would be the second authority #100 forbids. This is the
 * third entry in the library to take that shape, after the four-loop Muse Runner line and the
 * Muse split.
 *
 * ## The harmony is context, and the last strike is a root again
 *
 * `i VI i` in D minor over eight bars, four then two then two: Dm, Bb, Dm. The `Bb2` over the
 * first chord is the flat sixth, the note that makes the room modal rather than minor; the `A2`
 * over the `Bb` is that chord's major seventh, which a long decay holds as colour and a short one
 * would read as a mistake. The `D2` that closes it is the root of the chord it lands under, and
 * the same pitch the figure opened on.
 *
 * ## The second is forbidden over the tonic
 *
 * `E` is in the key and not in the chord, and against a `D` still ringing from two bars ago it is
 * a beating interval rather than a colour. That is the one rule, as data over the `i`. It is the
 * note a player reaches for to fill a gap, which is the gap this figure is made of.
 *
 * ## One note at a time
 *
 * Every strike releases before the next is struck, so the peak is one and `test/riff.test.ts`
 * counts it. `texture / soft` on the box that ships this patch is a mono recipe (#632).
 */
export const synthGongDecaySpacedStrikes: Riff = {
  id: 'synth-gong-decay-spaced-strikes',
  name: 'The SYNTH GONG decay-spaced strikes',
  reference: { kind: 'patch', name: 'SYNTH GONG' },
  bpm: { min: 60, max: 84, default: 72 },
  key: 'D minor',
  technique: [
    'Seven strikes in eight bars, and none of the first six lands on a beat you would count. ' +
      'Strike, then wait until the sound has gone, then strike again. What you are playing is ' +
      'the space.',
    'The waits get shorter as it goes: a bar and a half, then a bar and a quarter, then a bar, ' +
      'then less. Nothing about the pitches makes that happen. The crowding is the whole shape.',
    'The last strike is the only one on a bar head, at bar seven, and it holds for two bars. ' +
      'Everything before it has been early or late by design, so the one predictable arrival is ' +
      'the end.',
    'The pitches are D, A, the D above, Bb, A, F, and D again. Low root, its fifth, its octave, ' +
      'then the flat sixth, and back down. Each is struck once and never repeated inside its own ' +
      'decay.',
    'Let every strike ring all the way out. If the next one arrives while the last is still ' +
      'sounding, the two become a chord and the figure stops being a gong.',
    'Never play E while the D minor is sounding. Against a D still ringing from two bars back it ' +
      'beats rather than colours, and it is the note a hand reaches for to fill a gap.',
    'Keep the whole figure between D2 and D3. A gong that climbs stops reading as one struck ' +
      'thing and starts reading as a melody.',
  ],
  request: {
    id: 'synth-gong-decay-spaced-strikes',
    role: 'texture',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §5A.2/#623. Through-composed: the hook is the whole rhythm and no grid can say it.
    reArticulatesHook: false,
  },
  /**
   * §5A/#554. The second of the key over the tonic, as data. `E` is the key's own note and not a
   * tone of `i`, so the rule reaches one chord and contradicts nothing it is checked against
   * (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 2,
        reason: 'against a root still ringing from two bars back a second beats rather than colours',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'VI', bars: 2 },
      { degree: 'i', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `D2` at degree 1, so the figure
   * runs `D2` to `D3`, twelve semitones, which sits inside the board this box declares (#659).
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, seven strikes. Onsets at 1, 25, 45, 63, 77, 89 and 97, so the gaps are 24, 20,
   * 18, 14, 12 and 8 steps. Each note releases before the next is struck, and the last runs the
   * remaining two bars to 128.
   */
  hook: {
    id: 'synth-gong-decay-spaced-strikes-hook',
    forRole: 'texture',
    bars: 8,
    baseOctave: 2,
    notes: [
      // `i`, D minor. The root, its fifth, its octave, then the flat sixth.
      { step: 1, degree: 1, octave: 0, len: 23 },
      { step: 25, degree: 5, octave: 0, len: 19 },
      { step: 45, degree: 1, octave: 1, len: 17 },
      { step: 63, degree: 6, octave: 0, len: 13 },
      // `VI`, Bb major. `A2` is its major seventh, held; `F2` is its fifth.
      { step: 77, degree: 5, octave: 0, len: 11 },
      { step: 89, degree: 3, octave: 0, len: 7 },
      // `i` again. The root, on the only bar head in the figure, for the last two bars.
      { step: 97, degree: 1, octave: 0, len: 32 },
    ],
  },
}
