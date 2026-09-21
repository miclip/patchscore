import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The UBER_SUB off-the-downbeat line**: the sub never plays beat one. Every note is
 * pushed, the downbeat is left empty for the kick, and the last bar stops pushing.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #664). The notes are this
 * library's own and the entry names no device (invariant 3).
 *
 * ## What it teaches
 *
 * A sub with a fat attack on the downbeat does not sit under a kick, it sits *on* it: the two
 * transients arrive together and the kick loses its front. The fix is not mixing, it is playing.
 * Leave the one alone. The sub comes in on the "and" of one, which is late enough for the kick to
 * have spoken and early enough that the bar still swings forward.
 *
 * Every entry here is two sixteenths after its chord, and that is data rather than advice
 * (`onsetOffset`, §5A/#554): a figure that broke it would not parse.
 *
 * ## Why the last bar is different
 *
 * Three bars of pushing teach the ear to expect the gap, and then the fourth holds through
 * instead of restriking. Nothing arrives on that downbeat either, so the release is the absence
 * of the second push rather than a landing. The bar is longer and calmer and the loop turns over
 * into the next kick without the sub having to announce it.
 *
 * ## What replaced what, and why
 *
 * The first version of this figure moved one pitch class between two octaves each bar and called
 * the octave the lesson. Three of its six moves were twelve semitones, the highest ratio anywhere
 * in the library, and a line whose only movement is an octave reads as a bounce rather than as a
 * lesson however the prose frames it. Octave displacement survives on
 * `3-osc-bass-love-root-octave-figure`, where the point is three bars of *not* moving before a
 * walk-up, and one figure making that point is enough.
 *
 * ## Against the other low figures on this box
 *
 * `low-bass-early-root-line` is about *which* note arrives early: its fourth strike is the next
 * chord's root, an eighth before the chord. This is about the beat that is never played at all,
 * and its pitches are only the four chord roots. `brash-b-ss-ghost-note-groove` puts the weight
 * in the velocities and states the bar head every time. `terror-bass-flat-two-cadence-line` is a
 * cadence.
 *
 * ## One note at a time
 *
 * Every note releases before the next is struck, so the peak is one and `test/riff.test.ts`
 * counts it. `sub / dirty` on the box that ships this patch is a mono recipe (#632).
 */
export const uberSubOffTheDownbeatLine: Riff = {
  id: 'uber-sub-off-the-downbeat-line',
  name: 'The UBER_SUB off-the-downbeat line',
  reference: { kind: 'patch', name: 'UBER_SUB' },
  bpm: { min: 112, max: 132, default: 124 },
  key: 'F minor',
  technique: [
    'Never play beat one. The sub enters on the "and" of one in every bar and the downbeat stays ' +
      'empty, which is where the kick goes.',
    'Two notes a bar, both pushed: the "and" of one, held through beat two, and the "and" of ' +
      'three, shorter. Release each one before the next beat so the gaps are as audible as the ' +
      'notes.',
    'One pitch a bar and it is the root of the chord: F, then E flat, then D flat, then C. The ' +
      'figure has no melodic movement at all and does not need any; what moves is where in the ' +
      'bar you are.',
    'The last bar holds instead of pushing twice. Play the "and" of one and stay there to the end ' +
      'of the loop. Three bars of gaps make that one long note the release.',
    'Play it once with the notes moved onto the downbeats to hear what you are avoiding. The ' +
      'line stops pulling and a kick under it loses its front.',
    'Never play A natural. It is the raised third of the key, and this figure is too low and too ' +
      'exposed for a major third to pass as colour.',
    'Keep everything between C2 and F2. A sub that climbs stops being one, and there is nothing ' +
      'up there for this line to do.',
  ],
  request: {
    id: 'uber-sub-off-the-downbeat-line',
    role: 'sub',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The rule is the figure, and it is rhythmic rather than melodic: every entry is at
   * least two steps after its chord arrives. `forbiddenDegrees` carries the one pitch rule as
   * well — `A` natural is a tone of none of these four chords.
   */
  constraints: {
    onsetOffset: {
      minSteps: 2,
      reason: 'the downbeat belongs to the kick, and a sub that lands on it takes the kick’s front away',
    },
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 3,
        alter: 1,
        reason: 'a major third this low is mud rather than colour, and nothing here is high enough to carry it',
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
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 2` puts `F2` at degree 1, and the three
   * chords after it take `octave: -1`, so the line runs `C2` to `F2` and never leaves a fifth.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, seven notes. Two a bar on the "and" of one and the "and" of three, except the
   * fourth, which enters once and holds to the end.
   */
  hook: {
    id: 'uber-sub-off-the-downbeat-line-hook',
    forRole: 'sub',
    bars: 4,
    baseOctave: 2,
    notes: [
      // `i`, F minor.
      { step: 3, degree: 1, octave: 0, len: 6 },
      { step: 11, degree: 1, octave: 0, len: 4 },
      // `VII`, Eb major.
      { step: 19, degree: 7, octave: -1, len: 6 },
      { step: 27, degree: 7, octave: -1, len: 4 },
      // `VI`, Db major.
      { step: 35, degree: 6, octave: -1, len: 6 },
      { step: 43, degree: 6, octave: -1, len: 4 },
      // `v`, C minor: one entry, held to the end of the loop.
      { step: 51, degree: 5, octave: -1, len: 14 },
    ],
  },
  /**
   * §5A.2. One pass, seven strikes, and nothing on steps 1, 17, 33 or 49. The first push of each
   * bar is the accent; the second is lighter, and the last bar has none.
   */
  pattern: variant(
    'uber-sub-off-the-downbeat-line-grid',
    'sub',
    0,
    64,
    at('accent', 118, 3, 19, 35, 51),
    on('offbeat', 11, 27, 43),
  ),
}
