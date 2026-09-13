import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Moog Pro Solo glide lead**: a single line with no overlaps, because the patch will
 * glide between anything held at once.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * portamento lead; the notes are this library's own, and the entry names no device
 * (invariant 3).
 *
 * ## The rule this entry keeps, and where it is checked
 *
 * *No overlapping notes* is the whole technique. It is not a `RiffConstraints` rule, since
 * neither a forbidden degree nor an onset offset can say it, so the figure keeps it by
 * construction (every `len` ends before the next `step`) and `test/riff.test.ts` asserts it on
 * this entry. The definition stated no forbidden pitch and no offset, so `constraints` is
 * absent rather than present and empty, which `RiffConstraintsSchema` refuses anyway.
 *
 * ## The one lowered note
 *
 * E minor's fifth is `B`. Over the `VI` the line touches `Bb` on the way to it, `alter: -1` on
 * degree 5: a blues flat five passing through, not a chord tone, which is why it is two steps
 * long and the B after it is ten.
 */
export const moogProSoloGlideLead: Riff = {
  id: 'moog-pro-solo-glide-lead',
  name: 'The Moog Pro Solo glide lead',
  reference: { kind: 'patch', name: 'Moog Pro Solo' },
  bpm: { min: 96, max: 116, default: 104 },
  key: 'E minor',
  technique: [
    'A single line, and no two notes ever sound at once. The patch glides between anything ' +
      'held together, so every note is released before the next is struck. The glide happens ' +
      'between notes, never under them.',
    'Over the first chord, climb: E, G, A, from the bar head. Over the second, slide into B ' +
      'through the Bb below it.',
    'The Bb over the C chord is a blues flat five passing through. It is not a chord tone, so ' +
      'it has to be short: one eighth and gone, with the B taking the rest of the bar.',
    'Over the third chord, hold D from beat two and fall to C on beat four. Over the last, ' +
      'one B, entered late and held to the bar line.',
    'Set the glide so a step of a tone takes about a sixteenth to arrive. Longer and the line ' +
      'smears; shorter and the patch might as well not have it.',
  ],
  request: {
    id: 'moog-pro-solo-glide-lead',
    role: 'lead',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'i', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 4` puts `E4` at degree 1. No note's span reaches
   * the next note's step, which is the first paragraph as data and the thing the test pins.
   */
  hook: {
    id: 'moog-pro-solo-glide-lead-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i`: E4, G4, A4, from the bar head.
      { step: 1, degree: 1, octave: 0, len: 4 },
      { step: 5, degree: 3, octave: 0, len: 4 },
      { step: 9, degree: 4, octave: 0, len: 8 },
      // `VI`: Bb4 for an eighth on beat two, then B4 for the rest of the bar.
      { step: 21, degree: 5, octave: 0, len: 2, alter: -1 },
      { step: 23, degree: 5, octave: 0, len: 10 },
      // `VII`: D5 from beat two, falling to C5 on beat four.
      { step: 37, degree: 7, octave: 0, len: 8 },
      { step: 45, degree: 6, octave: 0, len: 4 },
      // `i`: B4, late, to the bar line.
      { step: 57, degree: 5, octave: 0, len: 8 },
    ],
  },
  pattern: variant(
    'moog-pro-solo-glide-lead-grid',
    'lead',
    0,
    64,
    at('accent', 104, 1),
    on('downbeat', 5, 9, 37, 57),
    on('backbeat', 21, 45),
    on('offbeat', 23),
  ),
}
