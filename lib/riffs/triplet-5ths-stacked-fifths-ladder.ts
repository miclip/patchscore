import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The TRIPLET 5THS stacked-fifths ladder**: twelve sixteenths in four groups of three,
 * each group a note, the fifth above it and the fifth above that, each group starting where the
 * last one's middle note was, and then four sixteenths of silence.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * arp pluck; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *triplet* and *5ths*, which is more
 * than most names say, and the figure takes both at their word visibly. Fifths: every note is a
 * fifth above the one before it, three at a time, so a group is a stack of fifths and a bar is a
 * ladder of them. Triplet: the notes come in groups of three. The grid here is sixteenths, so
 * what a group of three is on it is three sixteenths with the accent on the first, and four of
 * those in a row is an accent every three against a beat every four. That cross-rhythm is what
 * *triplet* becomes on this grid, and it is said as that rather than as a triplet a sixteenth
 * grid cannot hold. Whether the preset runs an arpeggiator of its own is not known here and not
 * assumed: the lesson is in the notes, and it is played by hand or sequenced as written. The
 * prose says what to play and nothing about what the preset sounds like, because the name is
 * the whole of the evidence (§3.7).
 *
 * ## One note at a time, by construction
 *
 * Every note is one step long and no two share a step, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes, and an arp uses
 * one. Held together, three fifths are a chord, and a ladder of them is not.
 *
 * ## The ladder, and why it stops where it does
 *
 * From `C3`: `C G D`, then from the `G`: `G D A`, then from the `D`: `D A E`, then the fourth
 * group comes back down, `E A D`, and lands on the `D` where a bar of silence begins. Three
 * climbs and a fall. In C major the chain of fifths runs `C G D A E B` and the next rung is
 * `F#`, which the key does not have, so the ladder stops at `E` and turns. The turn repeats the
 * top note: the third group ends on `E5` and the fourth begins on it, which is what makes the
 * top audible as a top. The second bar is the same shape from the `F` below, over the `IV`:
 * `F C G / C G D / G D A / A D G`, landing on the `G`.
 *
 * ## The harmony is context, and the ladder starts on the root
 *
 * `I IV` in C major, a bar each. Each bar's ladder starts on the root of the chord in force and
 * climbs through the key; the notes past the chord's own fifth are passing, which is what a
 * ladder is. The `D` over the C major and the `D` over the F are ninths and sixths, sounding
 * for a sixteenth on the way somewhere.
 *
 * ## Why the raised fourth is forbidden
 *
 * `F#` is the seventh fifth up from `C`, one rung past the key. One of them turns the ladder
 * into a modulation. It is not in C major, so the rule reaches the whole piece (§5A.8), and
 * neither chord carries it.
 */
export const triplet5thsStackedFifthsLadder: Riff = {
  id: 'triplet-5ths-stacked-fifths-ladder',
  name: 'The TRIPLET 5THS stacked-fifths ladder',
  reference: { kind: 'patch', name: 'TRIPLET 5THS' },
  bpm: { min: 100, max: 128, default: 116 },
  key: 'C major',
  technique: [
    'The name says fifths, so every note is a fifth above the one before it, three at a time. ' +
      'From C: C, G, D. Then from the G: G, D, A. Then from the D: D, A, E. That is the ladder, ' +
      'and every rung is a fifth.',
    'The name says triplet, so the notes come in threes: three sixteenths, the first of each ' +
      'three the loud one. Four groups in a row is an accent every three sixteenths against a ' +
      'beat every four, and that cross-rhythm is the figure. Do not straighten it out.',
    'The fourth group comes down: E, A, D, landing on the D. Then a beat of nothing. Twelve ' +
      'sixteenths climbing and turning, four of silence, and the next bar starts the ladder ' +
      'again from its own root.',
    'Bar two is the same ladder from the F below, over the F chord: F, C, G, then C, G, D, then ' +
      'G, D, A, then A, D, G and the silence. Same shape, same accents, a fourth lower.',
    'One note at a time, every note the same length. Let each sixteenth go before the next is ' +
      'struck. Held, three fifths are a chord, and this is not a chord; it is a ladder.',
    'The bar head is the loudest note and the start of each group the next loudest. The third ' +
      'note of every group is the quiet one, so the ear counts in threes and not in fours.',
    'Never play F sharp. It is the next fifth up from B, one rung past the key, and one F ' +
      'sharp turns a ladder in C into a modulation. The ladder stops at E and turns.',
  ],
  request: {
    id: 'triplet-5ths-stacked-fifths-ladder',
    role: 'arp',
    priority: 1,
    character: 'clean',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised fourth as data, over the `I`, and reaching the whole piece because the
   * key does not have it. Every entry is on the bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'I',
        degree: 4,
        alter: 1,
        reason: 'the seventh fifth up from C is one rung past the key, and one of them is a modulation',
      },
    ],
  },
  harmony: {
    cycleBars: 2,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'IV', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `C3` at degree 1; the first
   * ladder reaches `E5` and the second starts on `F2`.
   */
  figureStartsAtBar: 1,
  /**
   * Two bars, twenty-four notes, every one a sixteenth. Steps 1 to 12 and 17 to 28 sound; 13 to
   * 16 and 29 to 32 are the silence.
   */
  hook: {
    id: 'triplet-5ths-stacked-fifths-ladder-hook',
    forRole: 'arp',
    bars: 2,
    baseOctave: 3,
    notes: [
      // `I`: C3 G3 D4 / G3 D4 A4 / D4 A4 E5 / E5 A4 D4.
      { step: 1, degree: 1, octave: 0, len: 1 },
      { step: 2, degree: 5, octave: 0, len: 1 },
      { step: 3, degree: 2, octave: 1, len: 1 },
      { step: 4, degree: 5, octave: 0, len: 1 },
      { step: 5, degree: 2, octave: 1, len: 1 },
      { step: 6, degree: 6, octave: 1, len: 1 },
      { step: 7, degree: 2, octave: 1, len: 1 },
      { step: 8, degree: 6, octave: 1, len: 1 },
      { step: 9, degree: 3, octave: 2, len: 1 },
      { step: 10, degree: 3, octave: 2, len: 1 },
      { step: 11, degree: 6, octave: 1, len: 1 },
      { step: 12, degree: 2, octave: 1, len: 1 },
      // `IV`: F2 C3 G3 / C3 G3 D4 / G3 D4 A4 / A4 D4 G3.
      { step: 17, degree: 4, octave: -1, len: 1 },
      { step: 18, degree: 1, octave: 0, len: 1 },
      { step: 19, degree: 5, octave: 0, len: 1 },
      { step: 20, degree: 1, octave: 0, len: 1 },
      { step: 21, degree: 5, octave: 0, len: 1 },
      { step: 22, degree: 2, octave: 1, len: 1 },
      { step: 23, degree: 5, octave: 0, len: 1 },
      { step: 24, degree: 2, octave: 1, len: 1 },
      { step: 25, degree: 6, octave: 1, len: 1 },
      { step: 26, degree: 6, octave: 1, len: 1 },
      { step: 27, degree: 2, octave: 1, len: 1 },
      { step: 28, degree: 5, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck. The bar head at 118, the start of every other group at
   * 108, the second note of each group an offbeat, the third a ghost at 76.
   */
  pattern: variant(
    'triplet-5ths-stacked-fifths-ladder-grid',
    'arp',
    0,
    32,
    at('accent', 118, 1, 17),
    at('accent', 108, 4, 7, 10, 20, 23, 26),
    on('offbeat', 2, 5, 8, 11, 18, 21, 24, 27),
    at('ghost', 76, 3, 6, 9, 12, 19, 22, 25, 28),
  ),
}
