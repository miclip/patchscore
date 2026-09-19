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
 * ## The one lowered note, which is where the glide is heard
 *
 * E minor's fifth is `B`. Over the `VI` the line touches `Bb` on the way to it, `alter: -1` on
 * degree 5, two steps long with the B after it ten. It is not a chord tone, and it is not there
 * as a blues inflection either: it is the one transition in the figure written *for* the
 * glide. A semitone struck an eighth before its resolution on a portamento patch is heard as a
 * scoop into the B, and the technique says so, because the first published version explained
 * the note as a passing tone and left the patch's subject unnamed on the one line where it is
 * audible. The other place to hear the glide is the wrap: B4 down to E4 on the repeat is the
 * widest interval in the loop, and with the glide set by rate it is the longest.
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
    'Over the first chord, climb E, G, A from the bar head, each let go as the next is ' +
      'struck. The glide carries the pitch up the minor third and then the tone, so the climb ' +
      'is heard as one line bending upwards and not as three notes.',
    'The B flat into B over the C chord is what the glide is for. Strike the B flat on beat ' +
      'two and the B an eighth after it; the patch carries the semitone, and what you hear is ' +
      'a scoop into the B, not two notes. Keep the B flat to one eighth. The scoop is the ' +
      'sound, and a B flat that sits is a wrong note against the chord.',
    'Over the third chord, hold D from beat two and let it fall to C on beat four: a tone ' +
      'down, heard as a bend, and the empty beat before the D is where the ear resets. Over ' +
      'the last chord, one B, entered late and held to the bar line, so that it has settled ' +
      'before the widest glide on the page, the fifth back down to E on the repeat.',
    'Set the glide so a step of a tone takes about a sixteenth to arrive. Longer and the line ' +
      'smears; shorter and the patch might as well not have it. The wider the interval, the ' +
      'longer the glide, which is why the fall to E at the top of the loop is the one to ' +
      'listen for.',
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
