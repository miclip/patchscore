import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD MotifBrass rising-fourth motif**: three stabs a bar, the chord's fifth twice and
 * its root above, the same shape on every chord, and turned over on the last bar.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * brass stab; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. Its name says two things and the figure takes both
 * at their word visibly. *Motif* is one shape said again: the same three-note rhythm and the
 * same interval on every chord, moved to that chord's tones. *Brass* is a section, and a section
 * plays on the front of the beat at one length every time, so the prose says that and nothing
 * about the sound. The name is the whole of the evidence (§3.7).
 *
 * ## One note at a time, and why a stab here is a line
 *
 * The box this patch ships on plays two notes, and a triad stab is out of its reach. So this is
 * a stab written as a single line over implied harmony: the chord is what the bass and whatever
 * else is playing say it is, and this part plays one tone of it at a time. No two notes share a
 * step, the peak is one, and `test/riff.test.ts` counts it. The stab recipes on that box spend
 * both notes, and a one-note line on a two-note stab is a line with a voice to spare.
 *
 * ## The harmony is context, and the motif moves with it
 *
 * `i iv VI VII` in C minor, one bar each. On each chord the motif is the fifth, the fifth, the
 * root a fourth above: `G4 G4 C5` on the Cm, `C5 C5 F5` on the Fm, `Eb5 Eb5 Ab5` on the Ab,
 * and on the Bb the third note falls to `Bb4` instead of rising to `Bb5`, so the pass has an
 * end and the next bar head is heard starting it again.
 *
 * ## Why the key's third is forbidden over the VII
 *
 * C minor's third is `Eb`, and the Bb chord's own third is `D`. A stab has no time to make a
 * semitone clash mean anything, so over the `VII` the line keeps to the chord: `F` and `Bb`. An
 * unaltered rule reaches the one chord it names (§5A.8): `Eb` is the third of the Cm and of the
 * Ab, and a note the line has no reason to reach for over the Fm.
 */
export const pdMotifbrassRisingFourthMotif: Riff = {
  id: 'pd-motifbrass-rising-fourth-motif',
  name: 'The PD MotifBrass rising-fourth motif',
  reference: { kind: 'patch', name: 'PD MotifBrass' },
  bpm: { min: 112, max: 128, default: 120 },
  key: 'C minor',
  technique: [
    'Three stabs a bar: the bar head, the "and" of one, the "and" of two. The first two are ' +
      'the fifth of the chord, short. The third is the root a fourth above, and it is leaned ' +
      'on.',
    'The name says motif, so it is the same shape on every chord. Move the three notes to ' +
      'each chord’s fifth and root and change nothing else: G G C, then C C F, then Eb Eb Ab.',
    'One note at a time. The chord is implied by the line and by what plays under it; this ' +
      'part never sounds two notes together, and does not need to.',
    'The name says brass, so play it like a section. Every stab on the front of the beat, ' +
      'the two short ones the same length, the long one the same length, every bar.',
    'Bar four turns the motif over. On the Bb the third note falls to the Bb below instead ' +
      'of rising above, so the pass has an ending and the next bar head starts the shape again.',
    'Short. The two stabs are a sixteenth each, the third is three, and the silence after beat ' +
      'two is most of the bar. A stab that rings is a pad.',
    'Never play Eb while the Bb chord is sounding. It sits a semitone off the chord’s D, and ' +
      'a stab has no time to make that mean anything.',
  ],
  request: {
    id: 'pd-motifbrass-rising-fourth-motif',
    role: 'stab',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The key's third over the `VII` as data, the one chord of the cycle it is not a
   * tone of. Every entry is on the bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'VII',
        degree: 3,
        reason: 'a semitone off the chord’s own third, and a stab has no time to make that mean anything',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `C4` at degree 1; the motif
   * runs from `G4` to `Ab5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, twelve notes. Steps 1 and 3 of each bar one step long, step 7 three, and nothing
   * from step 10 to the bar line.
   */
  hook: {
    id: 'pd-motifbrass-rising-fourth-motif-hook',
    forRole: 'stab',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: G4, G4, C5.
      { step: 1, degree: 5, octave: 0, len: 1 },
      { step: 3, degree: 5, octave: 0, len: 1 },
      { step: 7, degree: 1, octave: 1, len: 3 },
      // `iv`: C5, C5, F5.
      { step: 17, degree: 1, octave: 1, len: 1 },
      { step: 19, degree: 1, octave: 1, len: 1 },
      { step: 23, degree: 4, octave: 1, len: 3 },
      // `VI`: Eb5, Eb5, Ab5.
      { step: 33, degree: 3, octave: 1, len: 1 },
      { step: 35, degree: 3, octave: 1, len: 1 },
      { step: 39, degree: 6, octave: 1, len: 3 },
      // `VII`: F5, F5, and the turn down to Bb4.
      { step: 49, degree: 4, octave: 1, len: 1 },
      { step: 51, degree: 4, octave: 1, len: 1 },
      { step: 55, degree: 7, octave: 0, len: 3 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck: bar heads at 118, the leaned-on third stab at 110, and
   * the "and" of one as an offbeat.
   */
  pattern: variant(
    'pd-motifbrass-rising-fourth-motif-grid',
    'stab',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('offbeat', 3, 19, 35, 51),
    at('accent', 110, 7, 23, 39, 55),
  ),
}
