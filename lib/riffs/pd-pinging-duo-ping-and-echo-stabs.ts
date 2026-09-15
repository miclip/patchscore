import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD Pinging duo ping-and-echo stabs**: one bar is a ping and its echoes. The ping is
 * two notes struck as one, the chord's root and the fifth above it, and the echoes are the two
 * notes heard apart, each one quieter.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * two-voice stab; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says *pinging* and *duo*, and the figure
 * takes both at their word visibly: a ping is a short strike and what comes back from it, and a
 * duo is two notes, so the strike is a dyad and what comes back is its two halves, one at a
 * time. The prose says what to play and nothing about what the preset sounds like, because the
 * name is the whole of the evidence (§3.7).
 *
 * ## Two notes at the ping, one everywhere else, and what the second note is for
 *
 * The box this patch ships on plays two notes, and this entry is one of two written to spend
 * the second one on purpose. `polyphony: 2`, and the peak is exactly two, on the bar head only:
 * the ping is both notes on one step, two steps long, and every echo is a single note one step
 * long. `test/riff.test.ts` counts it. The lesson is what the second note does: struck together
 * the pair is one hollow sound, and the echoes take it apart so the ear learns which note was
 * which. A second note that merely doubled the line would teach nothing about the pair.
 *
 * ## The harmony is context, and the ping never carries the third
 *
 * `i III VII VI` in A minor, one bar each. Each ping is the root and fifth of the chord in
 * force, `A E`, `C G`, `G D`, `F C`, so whether a chord is major or minor is left to whatever
 * plays under it. That is a rule about every chord, one degree per chord, and it cannot be one
 * `forbiddenDegrees` entry, since each chord's third is a different degree and an unaltered rule
 * naming a chord's own third is refused by the check (the chord carries the note it forbids).
 * So it is prose, and the figure keeps it by construction: no note here is a third of the chord
 * it sounds over.
 *
 * ## The grid strikes the ping and both echoes
 *
 * `reArticulatesHook` read plainly: the bar head is the accent and both hook notes are in force
 * there, so one strike sounds the dyad. The first echo is an offbeat and the second is a
 * `last-hit`, a tail that is not part of the pulse, carrying the lowest velocity so the fade is
 * data.
 */
export const pdPingingDuoPingAndEchoStabs: Riff = {
  id: 'pd-pinging-duo-ping-and-echo-stabs',
  name: 'The PD Pinging duo ping-and-echo stabs',
  reference: { kind: 'patch', name: 'PD Pinging duo' },
  bpm: { min: 104, max: 124, default: 114 },
  key: 'A minor',
  technique: [
    'The ping is two notes struck as one: the root of the chord and the fifth above it, on ' +
      'the bar head, two sixteenths long. The ping never carries the third; whether the chord ' +
      'is major or minor is left to what plays under it.',
    'The name says ping, so each bar is one ping and its echoes. On the "and" of two the ' +
      'upper note comes back alone; on the "and" of three the lower note does. Each echo is a ' +
      'sixteenth, and each is quieter than the sound before it.',
    'That is what the second note is for. Struck together the two are one hollow sound, and ' +
      'the echoes take that sound apart so the ear hears which note was which. Play the ping ' +
      'as one gesture and the echoes as its two halves.',
    'Four chords, one a bar: A minor, C, G, F. The ping moves to each chord’s root and fifth ' +
      'and the echoes move with it. Nothing else changes from bar to bar.',
    'Leave beat four empty in every bar. The ping needs silence to land in, and the fade is ' +
      'only heard when nothing follows the second echo.',
    'Strike both notes at the same instant. A ping with one note a hair early is two notes, ' +
      'and the whole figure rests on their being one.',
  ],
  request: {
    id: 'pd-pinging-duo-ping-and-echo-stabs',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
    // §12.4. Two notes on every bar head, and one at every echo.
    polyphony: 2,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'VI', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `A4` at degree 1; the pings
   * run from `F4` to `G5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes: a dyad on each bar head, two steps long, and two single-note
   * echoes at steps 7 and 11 of the bar, one step each.
   */
  hook: {
    id: 'pd-pinging-duo-ping-and-echo-stabs-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: ping A4 + E5; echoes E5, then A4.
      { step: 1, degree: 1, octave: 0, len: 2 },
      { step: 1, degree: 5, octave: 0, len: 2 },
      { step: 7, degree: 5, octave: 0, len: 1 },
      { step: 11, degree: 1, octave: 0, len: 1 },
      // `III`: ping C5 + G5; echoes G5, then C5.
      { step: 17, degree: 3, octave: 0, len: 2 },
      { step: 17, degree: 7, octave: 0, len: 2 },
      { step: 23, degree: 7, octave: 0, len: 1 },
      { step: 27, degree: 3, octave: 0, len: 1 },
      // `VII`: ping G4 + D5; echoes D5, then G4.
      { step: 33, degree: 7, octave: -1, len: 2 },
      { step: 33, degree: 4, octave: 0, len: 2 },
      { step: 39, degree: 4, octave: 0, len: 1 },
      { step: 43, degree: 7, octave: -1, len: 1 },
      // `VI`: ping F4 + C5; echoes C5, then F4.
      { step: 49, degree: 6, octave: -1, len: 2 },
      { step: 49, degree: 3, octave: 0, len: 2 },
      { step: 55, degree: 3, octave: 0, len: 1 },
      { step: 59, degree: 6, octave: -1, len: 1 },
    ],
  },
  /**
   * §5A.2. One pass. The ping is the accent at 118, the first echo an offbeat, the second a
   * `last-hit` at 56, and beat four of every bar is empty.
   */
  pattern: variant(
    'pd-pinging-duo-ping-and-echo-stabs-grid',
    'stab',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('offbeat', 7, 23, 39, 55),
    at('last-hit', 56, 11, 27, 43, 59),
  ),
}
