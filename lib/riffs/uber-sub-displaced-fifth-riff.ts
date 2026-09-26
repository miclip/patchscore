import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The UBER_SUB displaced fifth**: a four-note climb to the chord's fifth and a fall out of
 * it, played four times, and the fifth lands somewhere different in every bar.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The notes are this
 * library's own and the entry names no device (invariant 3).
 *
 * ## The hook, and what is done to it
 *
 * The gesture is four notes long: the root twice, the third, then a leap to the fifth, which is
 * the top of the bar and the note the ear is waiting for. Then it falls out through a step below
 * the next root.
 *
 * **What changes is where the fifth arrives.** Beat three in the first bar. Half a beat early in
 * the second. A beat and a half late in the third, so the bar feels like it is dragging. And in
 * the fourth the gesture breaks: the fifth comes on the "and" of two and the line walks back up
 * instead of falling, which is what turns the loop over.
 *
 * Same shape, four placements. A bass line that repeats a gesture exactly is a pattern; one that
 * keeps the gesture and moves the arrival is a part, and the difference is entirely in the
 * timing.
 *
 * ## Against the other low figures on this box
 *
 * `low-bass-early-root-line` arrives *on* the next chord's root an eighth before the chord. This
 * one deliberately stops a step above it: the handover is an approach from above and never the
 * root itself, which is the difference between leading a chord and pre-empting it. `70s-tv-pi-theme-sequenced-motif` states one shape three times at three pitches,
 * a step lower each time, and its subject is the transposition. This one keeps both the shape and
 * the register and moves only the clock.
 *
 * `brash-b-ss-ghost-note-groove` is dynamics on one pitch, `terror-bass-flat-two-cadence-line` is
 * a cadence, `5th-in-line-fifths-before-the-root` withholds roots, `acid-wiggler-slide-line` is
 * glide.
 *
 * ## Two earlier versions, and what each got wrong
 *
 * The first alternated one pitch class between two octaves every bar and called the octave the
 * lesson: three of its six moves were twelve semitones, the highest ratio in the library, and a
 * line whose only movement is an octave is a bounce however the prose frames it. The second
 * removed the octaves by removing the movement — one pitch a bar, struck twice — which made the
 * measurement clean and the part worse. A figure has to be worth playing before it is worth
 * explaining, and neither of those was.
 *
 * ## One note at a time
 *
 * Every note releases before the next is struck, so the peak is one and `test/riff.test.ts`
 * counts it. `sub / dirty` on the box that ships this patch is a mono recipe (#632).
 *
 * ## The pad above it (§5A.9)
 *
 * A held `pad / soft` companion, three notes a bar struck on each downbeat: `Eb4 F4 Ab4`,
 * `C4 Eb4 G4`, then `C4 Eb4 F4` twice. Against the four chords those are `7 1 3`, `6 1 3`,
 * `7 9 3` and `1 3 11`, and none of them is the chord's fifth, because the fifth is the bass's
 * displaced landing. `Eb4` is in every bar. The last two voicings are the same keys, and the bass
 * alone turns the second of them from D flat major into C minor. It states no forbidden degree:
 * the omission is a property of these four voicings, and `test/uber-sub-companion.test.ts` checks
 * it there.
 */
export const uberSubDisplacedFifthRiff: Riff = {
  id: 'uber-sub-displaced-fifth-riff',
  name: 'The UBER_SUB displaced fifth',
  reference: { kind: 'patch', name: 'UBER_SUB' },
  bpm: { min: 112, max: 132, default: 124 },
  key: 'F minor',
  technique: [
    'The riff is four notes: the root twice, the third, and then a leap up to the fifth. The ' +
      'fifth is the top of the bar and the note everything else is arranged around.',
    'Bar one puts the fifth on beat three. Bar two brings it half a beat early. Bar three holds ' +
      'it back until the second half of beat three, so the bar drags before it lands. Play the ' +
      'shape the same way every time and move only when the leap comes.',
    'After the fifth the line falls to the note one step above the next chord’s root and leaves ' +
      'it there, so each bar hands over from above rather than landing early: F into the E flat, ' +
      'E flat into the D flat, D flat into the C minor.',
    'Bar four breaks it. The fifth arrives on the "and" of two and the line walks back up through ' +
      'the third to the root instead of falling. That is the turn, and it is the only bar that ' +
      'goes up at the end.',
    'Keep every note short and let the gaps stay open. The leap reads as a leap because there is ' +
      'space in front of it; legato through the bar and it is a scale.',
    'Never play A natural. It is the major third of the key and this line lives too low for it to ' +
      'read as colour rather than as mud.',
    'Everything sits between C2 and C3. One octave is enough room for a bass line that is about ' +
      'where the notes fall.',
  ],
  request: {
    id: 'uber-sub-displaced-fifth-riff',
    role: 'sub',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised third of the key, as data: `A` natural is a tone of none of these four
   * chords, so the rule contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 3,
        alter: 1,
        reason: 'a major third this low reads as mud rather than as colour',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VII', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'v', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `F2` at degree 1; the line runs
   * `C2` to `C3` and never leaves that octave.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, nineteen notes. The fifth of each chord is the leap: step 9 in bar one, step 22
   * in bar two, step 43 in bar three, step 55 in bar four.
   */
  hook: {
    id: 'uber-sub-displaced-fifth-riff-hook',
    forRole: 'sub',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`, F minor: F F Ab, the leap to C on beat three, and F handing over from above.
      { step: 1, degree: 1, octave: 0, len: 3 },
      { step: 4, degree: 1, octave: 0, len: 2 },
      { step: 7, degree: 3, octave: 0, len: 2 },
      { step: 9, degree: 5, octave: 0, len: 4 },
      { step: 14, degree: 1, octave: 0, len: 3 },
      // `VII`, Eb major: the fifth arrives half a beat early.
      { step: 17, degree: 7, octave: -1, len: 3 },
      { step: 20, degree: 2, octave: 0, len: 2 },
      { step: 22, degree: 4, octave: 0, len: 5 },
      { step: 28, degree: 3, octave: 0, len: 3 },
      { step: 31, degree: 7, octave: -1, len: 2 },
      // `VI`, Db major: the fifth is held back to the second half of beat three.
      { step: 33, degree: 6, octave: -1, len: 3 },
      { step: 36, degree: 1, octave: 0, len: 2 },
      { step: 38, degree: 6, octave: -1, len: 2 },
      { step: 43, degree: 3, octave: 0, len: 4 },
      { step: 48, degree: 6, octave: -1, len: 1 },
      // `v`, C minor: the break. The fifth on the "and" of two, then up instead of down.
      { step: 49, degree: 5, octave: -1, len: 6 },
      { step: 55, degree: 2, octave: 0, len: 4 },
      { step: 59, degree: 7, octave: -1, len: 3 },
      { step: 62, degree: 1, octave: 0, len: 3 },
    ],
  },
  /**
   * §5A.2. One pass, nineteen strikes. The four leaps are the accents, the bar heads sit just
   * under them, and everything between is an offbeat.
   */
  pattern: variant(
    'uber-sub-displaced-fifth-riff-grid',
    'sub',
    0,
    64,
    at('accent', 120, 9, 22, 43, 55),
    at('accent', 110, 1, 17, 33, 49),
    on('offbeat', 4, 7, 14, 20, 28, 31, 36, 38, 48, 59, 62),
  ),
  /**
   * §5A.9. A held `pad / soft` above the bass, three notes a bar, one bar per chord.
   * `baseOctave: 4` puts `F4` at degree 1, so `Eb4` and `C4` are degrees 7 and 5 an octave down.
   */
  companion: {
    request: {
      id: 'uber-sub-displaced-fifth-riff-pad',
      role: 'pad',
      priority: 1,
      character: 'soft',
      sustain: 'continuous',
      polyphony: 3,
    },
    technique: [
      'The pad never plays the chord’s fifth. The bass has that note, and it lands somewhere ' +
        'different in every bar: C over F minor, B flat over E flat, A flat over D flat, G over ' +
        'C minor. With the fifth left out of the pad, each of those landings belongs to the bass ' +
        'alone and the ear hears where it falls.',
      'Strike each chord on the downbeat and hold it for the whole bar. The pad is the steady ' +
        'reference under the line: it changes on the one every time, so the displaced fifths are ' +
        'heard against a clock that does not move.',
      'E flat 4 sounds in all four bars. Over F minor it is the seventh, over E flat it is the ' +
        'root, over D flat the ninth and over C minor the third, so one key under one finger ' +
        'changes meaning four times while it stays where it is.',
      'Bars three and four are the same three keys, C4, E flat 4 and F4. Only the bass under ' +
        'them changes: over its D flat they are the seventh, ninth and third of D flat major, and ' +
        'over its C they are the root, third and eleventh of C minor.',
    ],
    hook: {
      id: 'uber-sub-displaced-fifth-riff-pad-hook',
      forRole: 'pad',
      bars: 4,
      baseOctave: 4,
      notes: [
        // `i`: Eb4 F4 Ab4.
        { step: 1, degree: 7, octave: -1, len: 16 },
        { step: 1, degree: 1, octave: 0, len: 16 },
        { step: 1, degree: 3, octave: 0, len: 16 },
        // `VII`: C4 Eb4 G4.
        { step: 17, degree: 5, octave: -1, len: 16 },
        { step: 17, degree: 7, octave: -1, len: 16 },
        { step: 17, degree: 2, octave: 0, len: 16 },
        // `VI`: C4 Eb4 F4.
        { step: 33, degree: 5, octave: -1, len: 16 },
        { step: 33, degree: 7, octave: -1, len: 16 },
        { step: 33, degree: 1, octave: 0, len: 16 },
        // `v`: the same three keys.
        { step: 49, degree: 5, octave: -1, len: 16 },
        { step: 49, degree: 7, octave: -1, len: 16 },
        { step: 49, degree: 1, octave: 0, len: 16 },
      ],
    },
  },
}
