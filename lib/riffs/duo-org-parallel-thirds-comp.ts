import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The DUO ORG parallel-thirds comp**: two notes a third apart, struck as one, three times
 * a bar, and moved together to each chord so the third stays a third and the pair stays a pair.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * two-voice organ; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *duo* and *org*, and the figure takes
 * both at their word visibly. Duo is two notes, and on the box this patch ships on two notes is
 * the whole capacity, so the second note is the subject of the entry and not an accident of it.
 * Org is an organ, a struck keyboard sound played in a comping rhythm, which is the stab role.
 * The prose says what to play and nothing about what the preset sounds like, because the name
 * is the whole of the evidence (§3.7).
 *
 * ## Two notes, exactly, and which lesson about the pair this one teaches
 *
 * Three entries on this box spend the second note on purpose, and they are the three ways two
 * voices can move. This is **parallel motion**: both notes move by the same amount in the same
 * direction, so the interval between them never changes. `sawteeth-duo-dancer-crossing-stabs`
 * is contrary motion, the two voices moving against each other and crossing; and
 * `duotronic-moogtrons-pedal-and-line-pad` is oblique, one voice held while the other moves. A
 * reader with all three has the whole of two-voice writing on a box built for it. The peak here
 * is exactly two: every stab is a dyad, both notes on one step for the same length, and no third
 * note anywhere. `test/riff.test.ts` counts it.
 *
 * ## The harmony is context, and the dyad is the top of the chord
 *
 * `I vi IV V` in Eb major, one bar each. Each dyad is the third and fifth of the chord in force:
 * `G Bb` over the Eb, `Eb G` over the C minor, `C Eb` over the Ab, `D F` over the Bb. The root
 * is left to whatever plays under it, the same call `polyphonic-power-brass-stab-cycle` makes on
 * a box with more notes, so the two this box has are spent on the notes that say which chord it
 * is. Every dyad is a third, so the pair slides: down a third, down a third, up a step, and the
 * pass takes it back up.
 *
 * ## No rule as data, and why
 *
 * The one rule the figure keeps — the dyad never carries the root — is a rule about every chord
 * at a different degree, which `forbiddenDegrees` cannot say: an unaltered rule naming a chord's
 * own root would be refused by the check, since the chord carries the note it forbids. So it is
 * prose, and the notes keep it by construction.
 */
export const duoOrgParallelThirdsComp: Riff = {
  id: 'duo-org-parallel-thirds-comp',
  name: 'The DUO ORG parallel-thirds comp',
  reference: { kind: 'patch', name: 'DUO ORG' },
  bpm: { min: 92, max: 112, default: 100 },
  key: 'Eb major',
  technique: [
    'Two notes, a third apart, struck as one. The name says duo, and the figure is what the ' +
      'second note is for: it moves with the first, by the same amount, every time, so the ' +
      'pair is one hand and not two lines.',
    'Three stabs a bar: the one, the "and" of two, the "and" of three. The one is three ' +
      'sixteenths long, the second is two, the third is four and holds into beat four. Then ' +
      'silence to the bar line.',
    'The pair is the third and fifth of the chord, never the root. Over the Eb: G and Bb. ' +
      'Over the C minor: Eb and G. Over the Ab: C and Eb. Over the Bb: D and F. Somebody else ' +
      'plays the root, or nobody does.',
    'Move both notes together on the bar head and change nothing until the next one. Down a ' +
      'third, down a third, up a step, and back up to the top on the next pass. The interval ' +
      'never changes; only where it sits.',
    'Strike both notes at the same instant. A pair with one note a hair early is two notes, ' +
      'and the whole figure rests on their being one.',
    'The one is the loud stab and the "and" of three the next. The "and" of two is the light ' +
      'one, played under, so the bar has a shape and not three equal hits.',
  ],
  request: {
    id: 'duo-org-parallel-thirds-comp',
    role: 'stab',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    reArticulatesHook: true,
    // §12.4. Two notes on every stab, and never a third.
    polyphony: 2,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'I', bars: 1 },
      { degree: 'vi', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `Eb4` at degree 1; the dyads
   * run from `C4` to `Bb4`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, twenty-four notes: three dyads a bar at steps 1, 7 and 11 of the bar, three,
   * two and four steps long, both notes of each dyad on the same step for the same length.
   */
  hook: {
    id: 'duo-org-parallel-thirds-comp-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `I`: G4 + Bb4.
      { step: 1, degree: 3, octave: 0, len: 3 },
      { step: 1, degree: 5, octave: 0, len: 3 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 7, degree: 5, octave: 0, len: 2 },
      { step: 11, degree: 3, octave: 0, len: 4 },
      { step: 11, degree: 5, octave: 0, len: 4 },
      // `vi`: Eb4 + G4.
      { step: 17, degree: 1, octave: 0, len: 3 },
      { step: 17, degree: 3, octave: 0, len: 3 },
      { step: 23, degree: 1, octave: 0, len: 2 },
      { step: 23, degree: 3, octave: 0, len: 2 },
      { step: 27, degree: 1, octave: 0, len: 4 },
      { step: 27, degree: 3, octave: 0, len: 4 },
      // `IV`: C4 + Eb4.
      { step: 33, degree: 6, octave: -1, len: 3 },
      { step: 33, degree: 1, octave: 0, len: 3 },
      { step: 39, degree: 6, octave: -1, len: 2 },
      { step: 39, degree: 1, octave: 0, len: 2 },
      { step: 43, degree: 6, octave: -1, len: 4 },
      { step: 43, degree: 1, octave: 0, len: 4 },
      // `V`: D4 + F4.
      { step: 49, degree: 7, octave: -1, len: 3 },
      { step: 49, degree: 2, octave: 0, len: 3 },
      { step: 55, degree: 7, octave: -1, len: 2 },
      { step: 55, degree: 2, octave: 0, len: 2 },
      { step: 59, degree: 7, octave: -1, len: 4 },
      { step: 59, degree: 2, octave: 0, len: 4 },
    ],
  },
  /**
   * §5A.2. One pass, every dyad struck once: the one at 118, the "and" of three at 108, the
   * "and" of two as the light offbeat.
   */
  pattern: variant(
    'duo-org-parallel-thirds-comp-grid',
    'stab',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('offbeat', 7, 23, 39, 55),
    at('accent', 108, 11, 27, 43, 59),
  ),
}
