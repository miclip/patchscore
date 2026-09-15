import type { Riff } from '../core/riff'

/**
 * §5A. **The PD Ghosts late-entrances texture**: four notes in eight bars, none on a bar head,
 * each a different length, each gone before the next arrives, and most of the figure silence.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * texture; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *ghosts*, and the figure
 * takes that at its word visibly: things that appear where nothing was, somewhere inside a
 * beat rather than on one, stay for a while that is never the same twice, and are gone. The
 * prose says what to play and nothing about what the preset sounds like, because the name is
 * the whole of the evidence (§3.7).
 *
 * ## Through-composed: a struck role with no grid
 *
 * `texture` is struck, so the entry has to answer the grid question, and its answer is
 * `reArticulatesHook: false` with no `pattern` (§5A.2, #623). A grid is capped at 64 steps and
 * marks only what recurs on the same step of every pass; this figure is 128 steps whose four
 * onsets fall at 11, 38, 70 and 118, which on a 64-step grid played twice would be 11, 38, 6
 * and 54, none of them shared. The honest grid is empty, an empty grid is refused, and the
 * hook is the whole rhythm. That is the same shape the four-loop Muse Runner line took and
 * the reason it exists.
 *
 * ## One note at a time, by construction
 *
 * Each note ends before the next begins, with silence between, so the peak is one and
 * `test/riff.test.ts` counts it. The box this patch ships on plays two notes; this figure
 * spends one, and the texture recipe it lands on holds a bed under it that is not a note of
 * the figure.
 *
 * ## How it differs from the pad written for this box
 *
 * `pd-adspace-one-note-colour-pad` is one pitch sounding for a hundred and twenty of a hundred
 * and twenty-eight steps. This is forty-six sounding and eighty-two silent. That is the whole
 * difference between a bed and a haunting, and it is why both are here.
 *
 * ## The harmony is context, and the last ghost is not in it
 *
 * `i VI` in A minor, four bars each. The first three notes are tones of the chord under them:
 * the fifth of the A minor, its third an octave up, the third of the F. The last is `G4` over
 * the F major, its ninth, the one note not in the chord, and it vanishes before the pass comes
 * round. Left unresolved on purpose.
 *
 * ## The rule as data
 *
 * *Never enter with the chord* is an `onsetOffset`. Both chords are entered at least five steps
 * in, and the check holds every entry to it (§5A.8).
 */
export const pdGhostsLateEntrancesTexture: Riff = {
  id: 'pd-ghosts-late-entrances-texture',
  name: 'The PD Ghosts late-entrances texture',
  reference: { kind: 'patch', name: 'PD Ghosts' },
  bpm: { min: 60, max: 84, default: 72 },
  key: 'A minor',
  technique: [
    'Four notes in eight bars, and none of them on a bar head. Each arrives somewhere inside ' +
      'a beat, holds for as long as it holds, and is gone before the next one comes.',
    'Never enter with the chord. The chord changes on the bar head and the note comes in ' +
      'after it, a beat or more later, so it is heard arriving into something already there. ' +
      'Enter on the change and it is a pad.',
    'The lengths are all different. The first is nearly a bar, the second six sixteenths, the ' +
      'third more than a bar, the last six sixteenths again after the longest silence in the ' +
      'figure. A ghost that came back at the same length every time would be a pulse.',
    'Most of the figure is silence. Count the rests as carefully as the notes: forty-six ' +
      'sixteenths sound out of a hundred and twenty-eight, and the rest is the room the ' +
      'ghosts appear in.',
    'The name says ghosts, so play each note as if it were not going to be there. Enter ' +
      'quietly, do not swell into it, and let it stop rather than fade.',
    'The last note is a G over the F chord, the one note not in the chord under it, and it ' +
      'vanishes before the pass comes round. Leave it unresolved.',
    'One note at a time, always. Two ghosts at once would be a chord, and the figure is that ' +
      'there is never quite one.',
  ],
  request: {
    id: 'pd-ghosts-late-entrances-texture',
    role: 'texture',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §5A.2/#623. Through-composed: the hook is the whole rhythm and there is no grid.
    reArticulatesHook: false,
  },
  /**
   * §5A/#554. Entering late is the figure, and it is data: every chord is entered at least
   * five steps after it begins.
   */
  constraints: {
    onsetOffset: {
      minSteps: 5,
      reason: 'a ghost arrives into a chord already sounding; entering with it is a pad',
    },
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'VI', bars: 4 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `A4` at degree 1; the figure
   * runs from `E4` to `C5`.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, four notes. `E4` from the "and" of three in bar one for fourteen steps; `C5`
   * from the "e" of two in bar three for six; `A4` from the "e" of two in bar five for twenty;
   * `G4` from the "e" of two in bar eight for six, gone at step 123.
   */
  hook: {
    id: 'pd-ghosts-late-entrances-texture-hook',
    forRole: 'texture',
    bars: 8,
    baseOctave: 4,
    notes: [
      // Over the `i`: the fifth, then the third an octave up, short.
      { step: 11, degree: 5, octave: -1, len: 14 },
      { step: 38, degree: 3, octave: 0, len: 6 },
      // Over the `VI`: the chord's third, long, then its ninth, short and unresolved.
      { step: 70, degree: 1, octave: 0, len: 20 },
      { step: 118, degree: 7, octave: -1, len: 6 },
    ],
  },
}
