import type { Riff } from '../core/riff'

/**
 * §5A. **The Duotronic Moogtrons pedal-and-line pad**: one note held for eight bars, and a
 * second note above it that moves once a bar, so the interval between them is what the ear
 * follows, out to an eleventh and back in to a tone.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * two-voice pad; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says that anybody can place is *duo*,
 * inside *Duotronic*, and the figure takes that at its word visibly: two notes, on a box whose
 * whole capacity is two, with the second note the subject of the entry. *Moogtrons* places
 * nothing this figure can act on — it is the maker's name with a suffix, and nothing about a
 * part is read into it. The prose says what to play and nothing about what the preset sounds
 * like, because the name is the whole of the evidence (§3.7).
 *
 * ## Two notes, exactly, and which lesson about the pair this one teaches
 *
 * Three entries on this box spend the second note on purpose, and they are the three ways two
 * voices can move. This is **oblique motion**: one voice holds and the other moves, so what
 * changes is the interval, and every move is heard against something that stays.
 * `duo-org-parallel-thirds-comp` is parallel, both voices moving together with the interval
 * fixed; `sawteeth-duo-dancer-crossing-stabs` is contrary, the two moving against each other
 * and crossing. The peak here is exactly two, for the whole of every bar: the held note sounds
 * throughout and the line above it is one note a bar, entered on the bar head and held to the
 * next. `test/riff.test.ts` counts it.
 *
 * ## A pad: the hook is the whole figure
 *
 * Held rather than struck (§5A.2, #608), so there is no grid and no `reArticulatesHook`.
 *
 * ## The two never cross, and the held note is always the lower
 *
 * The line stays above the pedal for the whole figure, from a tone above it to an eleventh.
 * A box that hands the lowest held key to one oscillator and the highest to the other keeps
 * the pedal on one oscillator for eight bars, which is the sound of a pedal: something that
 * does not move, under something that does.
 *
 * ## The harmony is context, and the pedal is the tonic
 *
 * `i VI iv VII` in F minor, two bars each, and the held note is `F3` throughout: the root of
 * the F minor, the third of the Db, the fifth of the Bb minor, the ninth of the Eb. The line
 * is a chord tone of every chord it is over: `C4` and `Ab3` over the F minor, `F4` and `Ab4`
 * over the Db, `Bb4` and `Db4` over the Bb minor, `Bb3` and `G3` over the Eb. The interval
 * from the pedal is a fifth, closes to a third, then opens — an octave, a tenth, an eleventh —
 * and closes again: a sixth, a fourth, and lastly a tone, `G3` over `F3`, which the next pass
 * opens back to a fifth. The tone at the end is where the pedal is the chord's ninth as well,
 * so the two tensions land together.
 *
 * ## Why the raised seventh is forbidden
 *
 * `E` natural is the leading tone of F minor, and over a held tonic one of them is a cadence:
 * the pedal becomes a floor to arrive on rather than a floor to move over. `E` is not in F
 * minor, so the rule reaches the whole piece (§5A.8), and no chord of the cycle carries it.
 */
export const duotronicMoogtronsPedalAndLinePad: Riff = {
  id: 'duotronic-moogtrons-pedal-and-line-pad',
  name: 'The Duotronic Moogtrons pedal-and-line pad',
  reference: { kind: 'patch', name: 'Duotronic Moogtrons' },
  bpm: { min: 64, max: 88, default: 76 },
  key: 'F minor',
  technique: [
    'Hold the low F and do not let go of it for eight bars. That is one hand’s whole job. ' +
      'The name says duo, and this is what the second note is for: everything the other hand ' +
      'plays is heard against a note that never moves.',
    'The line is one note a bar, entered on the bar head and held to the next bar head. Over ' +
      'the two bars of F minor: C, then Ab. Over the Db: F, then Ab above it. Over the Bb ' +
      'minor: Bb, then Db below it. Over the Eb: Bb, then G.',
    'What the ear follows is the distance between the two notes. A fifth, in to a third, then ' +
      'out to an octave, a tenth, an eleventh, then in again to a sixth, a fourth, and a tone ' +
      'at the end. The pass then opens it back to a fifth. Play the line for the interval and ' +
      'not for the tune.',
    'The line never goes below the held note. The pedal is always the bottom and the line is ' +
      'always the top, so whichever voice has the low F keeps it for the whole figure.',
    'The last bar is the point: G a tone above the F, over the Eb chord, where the F is the ' +
      'ninth of the chord as well. Two tensions on one bar. Hold it the full bar and let the ' +
      'next pass resolve both at once.',
    'Never play E natural. It is the leading tone, and over a held tonic one of them turns ' +
      'the pedal into a landing. The pedal is a floor to move over, not one to arrive on.',
  ],
  request: {
    id: 'duotronic-moogtrons-pedal-and-line-pad',
    role: 'pad',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    // §12.4. The pedal and the line, and never a third note.
    polyphony: 2,
  },
  /**
   * §5A/#554. The leading tone as data, over the `i` where the pedal is the tonic, and reaching
   * the whole piece because the key does not have it. Every entry is on a bar head, so there is
   * no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'the leading tone over a held tonic turns the pedal into a landing',
      },
    ],
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
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `F3` at degree 1; the pedal is
   * that note and the line runs from `G3` to `Bb4`.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, nine notes. The pedal is one note of 128 steps. The line is eight notes of
   * sixteen, one on every bar head.
   */
  hook: {
    id: 'duotronic-moogtrons-pedal-and-line-pad-hook',
    forRole: 'pad',
    bars: 8,
    baseOctave: 3,
    notes: [
      // The pedal: F3 for the whole figure.
      { step: 1, degree: 1, octave: 0, len: 128 },
      // `i`: C4, then Ab3.
      { step: 1, degree: 5, octave: 0, len: 16 },
      { step: 17, degree: 3, octave: 0, len: 16 },
      // `VI`: F4, then Ab4.
      { step: 33, degree: 1, octave: 1, len: 16 },
      { step: 49, degree: 3, octave: 1, len: 16 },
      // `iv`: Bb4, then Db4.
      { step: 65, degree: 4, octave: 1, len: 16 },
      { step: 81, degree: 6, octave: 0, len: 16 },
      // `VII`: Bb3, then G3, a tone above the pedal.
      { step: 97, degree: 4, octave: 0, len: 16 },
      { step: 113, degree: 2, octave: 0, len: 16 },
    ],
  },
}
