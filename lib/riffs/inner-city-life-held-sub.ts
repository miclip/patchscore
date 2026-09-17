import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Inner City Life held sub**: the bass holds still while everything above it moves.
 * Three bars of nothing and one bar of everything.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own. What the record is the reference *for* is a way of writing a sub under fast
 * drums: roots held for whole bars, so the one bar that moves is heard as movement.
 *
 * **Names no device** (invariant 3). `sub`, `dark`, a grid, and a progression in roman numerals.
 *
 * ## The first figure above 128, and the first record-named `sub` (#638)
 *
 * Every record-named entry before this one runs at 128 or below, while `industrial-techno` is
 * 134, `hard-techno` 150 and `breakbeat` 170. This is 170, and the discipline is the opposite
 * of every other figure in `/riffs`, which are all about where a note arrives: here the lesson
 * is where the note does not move.
 *
 * ## The harmony is context, and the sub plays its roots
 *
 * `i i VI V` in E minor, one bar a chord. The `V` is B major, `B · D# · F#`: the raised seventh
 * of the key is the chord's third, and the chord table prints it as `D#` because that is what
 * the chord is. Nothing softens it to `D`. The bass plays the root of every chord and never
 * the third, so the `D#` is the chord's business and the line never has to spell it; `spellChord`
 * resolves the `V` in every one of the twelve keys the page offers, and
 * `test/progression-in-key.test.ts` holds it there.
 *
 * ## Where the movement is
 *
 * `E1` for two bars, `C2` for one, `B1` for three beats exactly, steps 49 to 60. Steps 61 and
 * 62 are silent, and the silence is deliberate: the gap is what makes the pickup land, and
 * without it the two sixteenths are the end of a long note rather than a run at the downbeat.
 * Then `D2` at 63 and `C2` at 64, straight down into the `E1` on the head of the next pass.
 * The `D2` is the key's own seventh under a chord whose third is `D#`, for one sixteenth at
 * 170; it is a passing note on the way down, and the chord does not wait for it.
 *
 * ## One note at a time, by construction
 *
 * No two notes overlap: each ends where or before the next begins, so the peak is one and
 * `test/riff.test.ts` counts it.
 *
 * ## The grid is one pass
 *
 * Five onsets in 64 steps, at 1, 33, 49, 63 and 64, and the 64-step grid is the whole figure in
 * one pass, so every one of them recurs (§5A.2). The two sixteenths are the closing beat's
 * run, which is what the `fill` slot names.
 */
export const innerCityLifeHeldSub: Riff = {
  id: 'inner-city-life-held-sub',
  name: 'The Inner City Life held sub',
  reference: { kind: 'record', name: 'Inner City Life' },
  bpm: { min: 160, max: 176, default: 170 },
  key: 'E minor',
  technique: [
    'Hold the low E for two whole bars and do not touch it. Everything above the bass is ' +
      'moving at this tempo, and the bass is the one thing that is not.',
    'Move to the C on the head of bar three and hold it for the bar. One step down, one note, ' +
      'and nothing pushing into it.',
    'Bar four is the B, held for three beats. The chord over it is B major, with the D sharp ' +
      'in it, and the bass plays the root and leaves that third to the chord. Do not flatten ' +
      'the chord to fit the bass.',
    'Let the B go at the end of beat three and leave the next two sixteenths empty. Then, in ' +
      'the last two sixteenths of the bar, D and C, straight down into the E on the head of the ' +
      'next pass. The gap is what makes the pickup land, and those two notes are the only ' +
      'movement in four bars.',
    'Roots only until the pickup. The E under the E minor, the C under the C, the B under ' +
      'the B, and nothing else for fifteen beats. The tension is all in the chords and the ' +
      'drums, and the bass is the floor they stand on.',
    'Keep every note clean and let it ring to its full length. Three bars of nothing and one ' +
      'bar of everything is the whole figure; a sub that moves more than this is a bass line.',
  ],
  request: {
    id: 'inner-city-life-held-sub',
    role: 'sub',
    priority: 1,
    character: 'dark',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 1` puts `E1` at degree 1, and every
   * other note sits inside the octave above it: `B1` is the fifth, `C2` the sixth, `D2` the
   * seventh.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, five notes. `E1` for thirty-two steps, `C2` for sixteen, `B1` for twelve, then
   * the two sixteenths at 63 and 64.
   */
  hook: {
    id: 'inner-city-life-held-sub-hook',
    forRole: 'sub',
    bars: 4,
    baseOctave: 1,
    notes: [
      // Bars 1 and 2, over the `i`: E1, held the whole way.
      { step: 1, degree: 1, octave: 0, len: 32 },
      // Bar 3, over the `VI`: C2, held.
      { step: 33, degree: 6, octave: 0, len: 16 },
      // Bar 4, over the `V`: B1 for three beats.
      { step: 49, degree: 5, octave: 0, len: 12 },
      // The last two sixteenths: D2, C2, into the repeat.
      { step: 63, degree: 7, octave: 0, len: 1 },
      { step: 64, degree: 6, octave: 0, len: 1 },
    ],
  },
  /**
   * §5A.2. The whole figure in one pass. The accent is the E on the head of the cycle; 33 and
   * 49 are the two chord changes the bass moves on; 63 and 64 are the closing beat's run.
   */
  pattern: variant(
    'inner-city-life-held-sub-grid',
    'sub',
    0,
    64,
    at('accent', 118, 1),
    on('downbeat', 33, 49),
    on('fill', 63, 64),
  ),
}
