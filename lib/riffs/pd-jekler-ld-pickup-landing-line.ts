import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD Jekler Ld pickup-landing line**: every phrase is two eighths climbing into a
 * held note on the bar head, and the landing rises a step each bar until the pass drops back.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is a
 * lead; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset, and *Jekler* places nothing anybody could name: it
 * is not a word, an instrument or a piece. `Ld` reads as lead, and that is the whole of what the
 * name is taken to say. So the figure is the honest one §3.7 asks for where a name says nothing
 * placeable: a lead lesson that suits a single-note lead, with no story reached for. The lesson
 * is the pickup, which no other lead in the library teaches: the phrase begins before the bar
 * and the bar head is where it lands.
 *
 * ## One note at a time, by construction
 *
 * Every landing ends at step 8 of its bar and the pickup begins at step 13, so nothing here
 * overlaps and the peak is one; `test/riff.test.ts` counts it. The box this patch ships on plays
 * two notes, and a lead uses one.
 *
 * ## The harmony is context, and the landings are chord tones
 *
 * `i v III VII` in G minor, one bar each. The landings climb by step, `G4 A4 Bb4 C5`, and each
 * is a tone of the chord it lands on: the root of the Gm, the fifth of the Dm, the root of the
 * Bb, the fifth of the F. The pickups are the two scale steps below each landing, played on beat
 * four and its "and" of the bar before, so the last pickup drops from the top of the line to
 * `Eb4 F4` and the pass lands back on `G4`.
 *
 * ## Why the raised seventh is forbidden
 *
 * A pickup into G wants an F# under it, the leading tone, and that is the one note this figure
 * refuses: the line is in the key, `F` then `G`, and the raised note would turn a modal pickup
 * into a cadence. `F#` is not in G minor, so the rule reaches the whole piece (§5A.8), and no
 * chord of the cycle carries it.
 */
export const pdJeklerLdPickupLandingLine: Riff = {
  id: 'pd-jekler-ld-pickup-landing-line',
  name: 'The PD Jekler Ld pickup-landing line',
  reference: { kind: 'patch', name: 'PD Jekler Ld' },
  bpm: { min: 96, max: 120, default: 108 },
  key: 'G minor',
  technique: [
    'Every phrase starts before the bar. Two eighths on beat four and its "and", climbing by ' +
      'step, and the note they climb to lands on the bar head and holds for two beats.',
    'The landing rises a step each bar: G, then A, then Bb, then C. Four bars, four landings, ' +
      'and each one is a note of the chord under it.',
    'After the fourth landing the pickup drops to the bottom of the line, Eb and F, and the ' +
      'pass lands back on the G. The drop is the reset; play it as plainly as the climb.',
    'Hold each landing through beat two and let go. Beat three is silent. The pickup needs ' +
      'the silence in front of it, or it is a run and the landing is just another note.',
    'The landing is the loud one. Play the two pickup notes under it and a little separated, ' +
      'so the ear hears them as the approach and the bar head as the arrival.',
    'Never play F sharp. The pickup into G is F, then G, in the key. Raise the F and the ' +
      'phrase turns into a cadence, and the line stops being one line rising.',
  ],
  request: {
    id: 'pd-jekler-ld-pickup-landing-line',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The leading tone as data, over the `i` where the pickup lands, and reaching the
   * whole piece because the key does not have it. Every landing is on the bar head and the
   * pickup before it belongs to the previous chord, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'the raised seventh turns a pickup in the key into a cadence',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'v', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `G4` at degree 1; the line runs
   * from `Eb4` to `C5`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, twelve notes. A landing is eight steps from the bar head; a pickup is two
   * eighths at steps 13 and 15 of the bar before.
   */
  hook: {
    id: 'pd-jekler-ld-pickup-landing-line-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: land G4. Pickup into the A: F4, G4.
      { step: 1, degree: 1, octave: 0, len: 8 },
      { step: 13, degree: 7, octave: -1, len: 2 },
      { step: 15, degree: 1, octave: 0, len: 2 },
      // `v`: land A4. Pickup into the Bb: G4, A4.
      { step: 17, degree: 2, octave: 0, len: 8 },
      { step: 29, degree: 1, octave: 0, len: 2 },
      { step: 31, degree: 2, octave: 0, len: 2 },
      // `III`: land Bb4. Pickup into the C: A4, Bb4.
      { step: 33, degree: 3, octave: 0, len: 8 },
      { step: 45, degree: 2, octave: 0, len: 2 },
      { step: 47, degree: 3, octave: 0, len: 2 },
      // `VII`: land C5. Pickup into the next pass's G: the drop to Eb4, then F4.
      { step: 49, degree: 4, octave: 0, len: 8 },
      { step: 61, degree: 6, octave: -1, len: 2 },
      { step: 63, degree: 7, octave: -1, len: 2 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck: the landings as the accents, beat four of each bar as
   * a downbeat, its "and" as an offbeat.
   */
  pattern: variant(
    'pd-jekler-ld-pickup-landing-line-grid',
    'lead',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('downbeat', 13, 29, 45, 61),
    on('offbeat', 15, 31, 47, 63),
  ),
}
