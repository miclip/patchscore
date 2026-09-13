import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The 3 Osc Bass Love root-octave figure**: roots and octaves in pumping eighths for
 * three bars, so the walk-up in the fourth means something.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #566). The patch is the
 * three-oscillator bass; the notes are this library's own, and the entry names no device
 * (invariant 3). The reference opens with a digit, and `referenceSlug` keeps it, so this is
 * the first id in the registry (§7.2).
 *
 * ## The hook holds, the grid pumps
 *
 * `reArticulatesHook` read plainly: each hook note is the pitch in force for two beats, and the
 * grid strikes every eighth inside it. That is what makes the hook nine notes and not
 * thirty-two, and it is the same split `blue-monday-bass` makes.
 *
 * ## The ceiling, which no field carries
 *
 * The definition put a register ceiling at MIDI 48, `C3`, because three detuned oscillators
 * stop reading as a bass above it. §4.1 keeps range policy out of the hook, so the figure keeps
 * the ceiling by construction: its highest note is `A2`, and `test/riff.test.ts` asserts it.
 *
 * ## Why the fifth is forbidden over the VI
 *
 * A minor's fifth is `E`, and over the `VI` it is the major seventh of F. Down here, against a
 * root two octaves below middle C, that interval is mud, and the rule is one line of data.
 */
export const threeOscBassLoveRootOctaveFigure: Riff = {
  id: '3-osc-bass-love-root-octave-figure',
  name: 'The 3 Osc Bass Love root-octave figure',
  reference: { kind: 'patch', name: '3 Osc Bass Love' },
  bpm: { min: 104, max: 124, default: 112 },
  key: 'A minor',
  technique: [
    'Roots and octaves for three bars so the walk-up in the fourth means something. Two beats ' +
      'on the low root, two beats an octave up, and the third bar swaps the octave for the ' +
      'fifth.',
    'Pump every eighth. The hook says which note is in force; the grid strikes it eight times a ' +
      'bar, and the first strike of every bar is the loudest.',
    'The fourth bar walks: G on the bar head, up to A on beat three, up to B on beat four, and ' +
      'the next pass lands on A. Three bars of not moving are what make those two steps land.',
    'Nothing above C3. Three detuned oscillators stop reading as a bass above it and start ' +
      'reading as a chord.',
    'Never play E while the F is sounding. It is the major seventh of the chord, and two ' +
      'octaves below middle C a major seventh is mud.',
    'No two notes ever overlap. Release each before the next is struck, or the octave jump ' +
      'turns into a smear.',
  ],
  request: {
    id: '3-osc-bass-love-root-octave-figure',
    role: 'bass-mid',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The major seventh over the `VI` as data. Every entry is on the bar head, so there
   * is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'VI',
        degree: 5,
        reason: 'the major seventh against the root muddies at this register',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'III', bars: 1 },
      { degree: 'VII', bars: 1 },
    ],
  },
  /**
   * Four bars, the whole cycle. `baseOctave: 1` puts `A1` at degree 1, two octaves and a third
   * below middle C, which is where this patch lives. Nothing here reaches `C3`.
   */
  hook: {
    id: '3-osc-bass-love-root-octave-figure-hook',
    forRole: 'bass-mid',
    bars: 4,
    baseOctave: 1,
    notes: [
      // `i`: A1 for two beats, A2 for two.
      { step: 1, degree: 1, octave: 0, len: 8 },
      { step: 9, degree: 1, octave: 1, len: 8 },
      // `VI`: F1, then F2.
      { step: 17, degree: 6, octave: -1, len: 8 },
      { step: 25, degree: 6, octave: 0, len: 8 },
      // `III`: C2, then the fifth, G2.
      { step: 33, degree: 3, octave: 0, len: 8 },
      { step: 41, degree: 7, octave: 0, len: 8 },
      // `VII`: G1 for two beats, then the walk-up: A1 on beat three, B1 on beat four.
      { step: 49, degree: 7, octave: -1, len: 8 },
      { step: 57, degree: 1, octave: 0, len: 4 },
      { step: 61, degree: 2, octave: 0, len: 4 },
    ],
  },
  pattern: variant(
    '3-osc-bass-love-root-octave-figure-grid',
    'bass-mid',
    0,
    64,
    at('accent', 118, 1, 17, 33, 49),
    on('downbeat', 5, 9, 13, 21, 25, 29, 37, 41, 45, 53, 57, 61),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63),
  ),
}
