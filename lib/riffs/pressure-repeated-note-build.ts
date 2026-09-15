import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Pressure repeated-note build**: the fifth hammered in eighths for two bars, then
 * the line leans on it until the root arrives.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #618). The patch is the
 * lead; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## One note at a time
 *
 * A lead line, so nothing overlaps: every eighth is released before the next, and the peak is
 * one. `test/korg-minilogue-xd.test.ts` counts it.
 *
 * ## Why the raised seventh is forbidden
 *
 * F minor's seventh is `Eb`. Raise it to `E` and the build has a leading tone, which is a
 * cadence, and this line does not cadence: it arrives on the root by weight, not by pull. `E`
 * is not in the key, so the rule reaches the whole piece (§5A.8).
 */
export const pressureRepeatedNoteBuild: Riff = {
  id: 'pressure-repeated-note-build',
  name: 'The Pressure repeated-note build',
  reference: { kind: 'patch', name: 'Pressure' },
  bpm: { min: 120, max: 136, default: 128 },
  key: 'F minor',
  technique: [
    'Four bars. The fifth, C, in eighths for two bars and nothing else, then the line starts ' +
      'to lean: a D flat at the end of bar two, E flats and D flats through bar three, and the ' +
      'root on the head of bar four, held.',
    'Every eighth the same length and the same weight until the lean begins. The build is in ' +
      'the repetition, and a repeated note that changes shape is not repeating.',
    'The first strike of every bar is the loud one. The eighths after it sit under it, so the ' +
      'bar has a pulse even though the note does not move.',
    'Bar four is the arrival. F held for two beats, then E flat, then C, and the loop returns ' +
      'to the hammering. The held F is the only long note in the figure.',
    'Never play E natural. It is the raised seventh, and one E turns the arrival into a ' +
      'cadence. This line arrives by weight.',
  ],
  request: {
    id: 'pressure-repeated-note-build',
    role: 'lead',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised seventh as data, reaching the whole piece because the key does not
   * have it.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'the raised seventh turns the arrival into a cadence, and this line arrives by weight',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'iv', bars: 1 },
      { degree: 'i', bars: 1 },
    ],
  },
  /**
   * Four bars. `baseOctave: 4` puts `F4` at degree 1; the hammered fifth is `C5` and the
   * arrival is `F5`.
   */
  hook: {
    id: 'pressure-repeated-note-build-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // Bar 1: C5 on every eighth.
      { step: 1, degree: 5, octave: 0, len: 2 },
      { step: 3, degree: 5, octave: 0, len: 2 },
      { step: 5, degree: 5, octave: 0, len: 2 },
      { step: 7, degree: 5, octave: 0, len: 2 },
      { step: 9, degree: 5, octave: 0, len: 2 },
      { step: 11, degree: 5, octave: 0, len: 2 },
      { step: 13, degree: 5, octave: 0, len: 2 },
      { step: 15, degree: 5, octave: 0, len: 2 },
      // Bar 2: the same, with a Db5 on the last beat and the C5 back after it.
      { step: 17, degree: 5, octave: 0, len: 2 },
      { step: 19, degree: 5, octave: 0, len: 2 },
      { step: 21, degree: 5, octave: 0, len: 2 },
      { step: 23, degree: 5, octave: 0, len: 2 },
      { step: 25, degree: 5, octave: 0, len: 2 },
      { step: 27, degree: 5, octave: 0, len: 2 },
      { step: 29, degree: 6, octave: 0, len: 2 },
      { step: 31, degree: 5, octave: 0, len: 2 },
      // Bar 3, over the iv: C5 twice, then Eb5 twice and Db5 twice.
      { step: 33, degree: 5, octave: 0, len: 2 },
      { step: 35, degree: 5, octave: 0, len: 2 },
      { step: 37, degree: 5, octave: 0, len: 2 },
      { step: 39, degree: 5, octave: 0, len: 2 },
      { step: 41, degree: 7, octave: 0, len: 2 },
      { step: 43, degree: 7, octave: 0, len: 2 },
      { step: 45, degree: 6, octave: 0, len: 2 },
      { step: 47, degree: 6, octave: 0, len: 2 },
      // Bar 4: F5 held for two beats, Eb5 for one, C5 for one.
      { step: 49, degree: 1, octave: 1, len: 8 },
      { step: 57, degree: 7, octave: 0, len: 4 },
      { step: 61, degree: 5, octave: 0, len: 4 },
    ],
  },
  pattern: variant(
    'pressure-repeated-note-build-grid',
    'lead',
    0,
    64,
    at('accent', 116, 1, 17, 33, 49),
    on('downbeat', 5, 9, 13, 21, 25, 29, 37, 41, 45, 57, 61),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47),
  ),
}
