import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The SAWTEETH DUO DANCER crossing stabs**: two notes struck together six times a bar
 * on a three-three-two rhythm, the top one falling by step and the bottom one rising by step,
 * so they cross in the middle of every bar and end it on each other's notes; then the next bar
 * throws them apart again.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * two-voice stab; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says three things and the figure takes all
 * three at their word visibly. *Duo* is two notes, which on the box this patch ships on is the
 * whole capacity, so the pair is the subject. *Dancer* is two partners and a rhythm, so the two
 * voices move against each other and change places, on the three-three-two that dance music
 * has run on for a century. *Sawteeth* is a shape: a line that ramps one way and snaps back,
 * over and over, and each voice here does exactly that, one ramping down and one ramping up
 * across a bar and both snapping back at the bar line. The prose says what to play and nothing
 * about what the preset sounds like, because the name is the whole of the evidence (§3.7).
 *
 * ## Two notes, exactly, and which lesson about the pair this one teaches
 *
 * Three entries on this box spend the second note on purpose, and they are the three ways two
 * voices can move. This is **contrary motion**: the two voices move in opposite directions, and
 * here they go far enough to cross. `duo-org-parallel-thirds-comp` is parallel motion, the pair
 * moving together with the interval fixed; `duotronic-moogtrons-pedal-and-line-pad` is oblique,
 * one voice held while the other moves. The peak here is exactly two: every stab is a dyad,
 * both notes on one step for the same length, and `test/riff.test.ts` counts it.
 *
 * ## The crossing, and what it asks of the hands
 *
 * Each bar starts with the pair a sixth apart and each voice moves one scale step per stab, the
 * top down and the bottom up. Six stabs: a sixth, a fourth, a second, then a second the other
 * way, a fourth, a sixth. On the third stab they are a tone apart; on the fourth the voice that
 * was on top is underneath. The sixth stab is the first one with the notes swapped. A box that
 * hands the lowest held key to one oscillator and the highest to the other will swap which
 * oscillator has which line at the crossing, and that is part of the sound: the lesson is the
 * pair, not the voices.
 *
 * ## The harmony is context, and each bar's first dyad is two tones of its chord
 *
 * `i VI iv VII` in B minor, one bar each. The first stab of every bar is the third and fifth
 * of the chord, or the root and sixth over the `VI`, and everything between the first stab and
 * the last is passing, which is what crossing through the scale is. `D F#` over the B minor,
 * `E G` over the G, `G B` over the E minor, `C# E` over the A.
 *
 * ## Why the raised seventh is forbidden
 *
 * `A#` is the leading tone of B minor, and one of them pulls the dance home. It never goes
 * home; the pass throws the partners apart again. `A#` is not in B minor, so the rule reaches
 * the whole piece (§5A.8), and no chord of the cycle carries it.
 */
export const sawteethDuoDancerCrossingStabs: Riff = {
  id: 'sawteeth-duo-dancer-crossing-stabs',
  name: 'The SAWTEETH DUO DANCER crossing stabs',
  reference: { kind: 'patch', name: 'SAWTEETH DUO DANCER' },
  bpm: { min: 118, max: 132, default: 124 },
  key: 'B minor',
  technique: [
    'Two notes, struck together, six times a bar: the one, the "a" of one, the "and" of two, ' +
      'beat three, the "a" of three, the "and" of four. Three, three, two, twice. The name ' +
      'says dancer, and that is the rhythm dancers get.',
    'The name says duo, so the figure is what the two notes do to each other. Start a sixth ' +
      'apart. On every stab the top note falls a step and the bottom note rises one, so they ' +
      'close, meet, cross, and open out the other way. By the sixth stab they have swapped.',
    'The name says sawteeth, and each voice is one: a straight ramp across the bar, then the ' +
      'snap back at the bar line. The top voice ramps down and snaps up; the bottom ramps up ' +
      'and snaps down. Never smooth the snap. It is the tooth.',
    'Over the B minor the first pair is D and F sharp; over the G, E and G; over the E minor, ' +
      'G and B; over the A, C sharp and E. Every stab after the first is a step on the way ' +
      'across, and none of them needs to be a chord tone.',
    'Every stab is two sixteenths and stops. Strike both notes at the same instant, even at ' +
      'the crossing where the hands are on top of each other. Two notes a hair apart are two ' +
      'lines, and the dance is one pair.',
    'The one is the loud stab, beat three the next. The other four are lighter and equal, so ' +
      'the three-three-two is felt and not counted.',
    'Never play A sharp. It is the leading tone of B minor, and one of them pulls the dance ' +
      'home. It never goes home.',
  ],
  request: {
    id: 'sawteeth-duo-dancer-crossing-stabs',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
    // §12.4. Two notes on every stab, and never a third.
    polyphony: 2,
  },
  /**
   * §5A/#554. The leading tone as data, over the `i`, and reaching the whole piece because the
   * key does not have it. Every chord is entered on its bar head, so there is no offset to
   * state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'the leading tone pulls the dance home, and it never goes home',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `B4` at degree 1; the voices
   * run from `E3` to `G4`, and neither is ever above `G4`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, forty-eight notes: six dyads a bar at steps 1, 4, 7, 9, 12 and 15 of the bar,
   * two steps each. In every bar the top voice falls six scale steps and the bottom rises six.
   */
  hook: {
    id: 'sawteeth-duo-dancer-crossing-stabs-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: top D4 C#4 B3 A3 G3 F#3; bottom F#3 G3 A3 B3 C#4 D4.
      { step: 1, degree: 3, octave: -1, len: 2 },
      { step: 1, degree: 5, octave: -2, len: 2 },
      { step: 4, degree: 2, octave: -1, len: 2 },
      { step: 4, degree: 6, octave: -2, len: 2 },
      { step: 7, degree: 1, octave: -1, len: 2 },
      { step: 7, degree: 7, octave: -2, len: 2 },
      { step: 9, degree: 7, octave: -2, len: 2 },
      { step: 9, degree: 1, octave: -1, len: 2 },
      { step: 12, degree: 6, octave: -2, len: 2 },
      { step: 12, degree: 2, octave: -1, len: 2 },
      { step: 15, degree: 5, octave: -2, len: 2 },
      { step: 15, degree: 3, octave: -1, len: 2 },
      // `VI`: top E4 D4 C#4 B3 A3 G3; bottom G3 A3 B3 C#4 D4 E4.
      { step: 17, degree: 4, octave: -1, len: 2 },
      { step: 17, degree: 6, octave: -2, len: 2 },
      { step: 20, degree: 3, octave: -1, len: 2 },
      { step: 20, degree: 7, octave: -2, len: 2 },
      { step: 23, degree: 2, octave: -1, len: 2 },
      { step: 23, degree: 1, octave: -1, len: 2 },
      { step: 25, degree: 1, octave: -1, len: 2 },
      { step: 25, degree: 2, octave: -1, len: 2 },
      { step: 28, degree: 7, octave: -2, len: 2 },
      { step: 28, degree: 3, octave: -1, len: 2 },
      { step: 31, degree: 6, octave: -2, len: 2 },
      { step: 31, degree: 4, octave: -1, len: 2 },
      // `iv`: top G4 F#4 E4 D4 C#4 B3; bottom B3 C#4 D4 E4 F#4 G4.
      { step: 33, degree: 6, octave: -1, len: 2 },
      { step: 33, degree: 1, octave: -1, len: 2 },
      { step: 36, degree: 5, octave: -1, len: 2 },
      { step: 36, degree: 2, octave: -1, len: 2 },
      { step: 39, degree: 4, octave: -1, len: 2 },
      { step: 39, degree: 3, octave: -1, len: 2 },
      { step: 41, degree: 3, octave: -1, len: 2 },
      { step: 41, degree: 4, octave: -1, len: 2 },
      { step: 44, degree: 2, octave: -1, len: 2 },
      { step: 44, degree: 5, octave: -1, len: 2 },
      { step: 47, degree: 1, octave: -1, len: 2 },
      { step: 47, degree: 6, octave: -1, len: 2 },
      // `VII`: top C#4 B3 A3 G3 F#3 E3; bottom E3 F#3 G3 A3 B3 C#4.
      { step: 49, degree: 2, octave: -1, len: 2 },
      { step: 49, degree: 4, octave: -2, len: 2 },
      { step: 52, degree: 1, octave: -1, len: 2 },
      { step: 52, degree: 5, octave: -2, len: 2 },
      { step: 55, degree: 7, octave: -2, len: 2 },
      { step: 55, degree: 6, octave: -2, len: 2 },
      { step: 57, degree: 6, octave: -2, len: 2 },
      { step: 57, degree: 7, octave: -2, len: 2 },
      { step: 60, degree: 5, octave: -2, len: 2 },
      { step: 60, degree: 1, octave: -1, len: 2 },
      { step: 63, degree: 4, octave: -2, len: 2 },
      { step: 63, degree: 2, octave: -1, len: 2 },
    ],
  },
  /**
   * §5A.2. One pass, every dyad struck once. The one at 118, beat three at 108, the "a"s and
   * the "and"s at 96, so the three-three-two is felt.
   */
  pattern: variant(
    'sawteeth-duo-dancer-crossing-stabs-grid',
    'stab',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    at('accent', 108, 9, 25, 41, 57),
    at('accent', 96, 4, 7, 12, 15, 20, 23, 28, 31, 36, 39, 44, 47, 52, 55, 60, 63),
  ),
}
