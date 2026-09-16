import type { Riff } from '../core/riff'

/**
 * §5A. **The DRONE tonic pedal under the changes**: the root held under four chords for six
 * bars without a break, dropped an octave under the last chord, and re-struck on the next pass.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is the
 * texture; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *drone*, which is as plain as
 * a name gets, and the figure takes it at its word visibly: one pitch, the root, held under
 * everything, and the lesson is what the chords over it do to it and what it does to them. The
 * one move is a drop, an octave down under the chord that pulls hardest, because a drone that
 * moves up is a line and one that sinks is still a floor. The prose says what to play and
 * nothing about what the preset sounds like, because the name is the whole of the evidence
 * (§3.7).
 *
 * ## Through-composed: a struck role with no grid
 *
 * `texture` is struck, so the entry has to answer the grid question, and its answer is
 * `reArticulatesHook: false` with no `pattern` (§5A.2, #623). A grid is capped at 64 steps and
 * marks only what recurs on the same step of every pass; this figure is 128 steps with two
 * onsets, at 1 and 97, and on a 64-step grid played twice those are step 1 on the first pass
 * and step 33 on the second, neither of them shared. A strike at step 1 on the second pass
 * would re-articulate a note the figure exists to hold. So the hook is the whole rhythm, and
 * the rhythm is: strike, hold, drop, hold.
 *
 * ## One note at a time, by construction
 *
 * Two notes in the hook and never both at once: the `D3` ends at step 96 and the `D2` begins
 * at 97, so the peak is one and `test/riff.test.ts` counts it. The box this patch ships on
 * plays two notes; this figure spends one.
 *
 * ## How it differs from the other held entries written for this box
 *
 * `celestial-fixed-star-pad` holds one note too, above the chords, where it is a colour the
 * harmony changes. This holds it below them, where it is a floor the harmony pushes against.
 * The difference is register and function, and it is the difference between a ninth heard as
 * a shimmer and a fourth heard as a pull. `duotronic-moogtrons-pedal-and-line-pad` holds a
 * pedal and puts a moving line over it; here nothing is over the pedal but the chords.
 *
 * ## The harmony is context, and the last chord is the pull
 *
 * `i VII VI v` in D minor, two bars each, and the pedal is `D` throughout: the root of the D
 * minor, the ninth of the C, the third of the Bb, the fourth of the A minor. The fourth is the
 * one that pulls, a suspension against the chord's own third, and that is where the drone
 * drops an octave: the tension is the same and it is felt twice as deep. The next pass
 * re-strikes the `D3` over the D minor, which resolves it.
 *
 * ## Why the raised seventh is forbidden
 *
 * `C#` is the leading tone of D minor, and over a held tonic one of them is a cadence: the
 * drone becomes something to arrive on. A drone never cadences. `C#` is not in D minor, so the
 * rule reaches the whole piece (§5A.8), and no chord of the cycle carries it — the `v` is
 * minor for exactly this reason.
 */
export const droneTonicPedalUnderTheChanges: Riff = {
  id: 'drone-tonic-pedal-under-the-changes',
  name: 'The DRONE tonic pedal under the changes',
  reference: { kind: 'patch', name: 'DRONE' },
  bpm: { min: 60, max: 90, default: 72 },
  key: 'D minor',
  technique: [
    'The name says drone, so play one: the low D, struck once on the bar head and held for six ' +
      'bars without a break. Four chords pass over it, two bars each, and the drone does not ' +
      'move for any of them.',
    'What to listen for is what each chord makes of the drone. Over the D minor it is the ' +
      'root and nothing pulls. Over the C it is the ninth, a shimmer. Over the Bb it is the ' +
      'third, and sits inside the chord. Over the A minor it is the fourth, and pulls.',
    'Under the A minor, drop the octave. Let the D go at the end of bar six and strike the D ' +
      'below it on the head of bar seven, and hold that for two bars. Same note, same pull, ' +
      'twice as deep. A drone that goes up becomes a line; one that sinks is still a floor.',
    'Let the low D go two sixteenths before the end of bar eight, so the next pass strikes ' +
      'the drone fresh on the bar head over the D minor, where the pull resolves.',
    'Two strikes in eight bars and nothing else. If the sound moves on its own while a note is ' +
      'held, six bars is long enough to hear it do so; do not help it with a re-strike.',
    'Never play C sharp, and never let the chords play it either. It is the leading tone of D ' +
      'minor, and over a held tonic one of them turns the drone into a place to arrive. A ' +
      'drone is not arrived at. The last chord is A minor, not A major, for this reason.',
  ],
  request: {
    id: 'drone-tonic-pedal-under-the-changes',
    role: 'texture',
    priority: 1,
    character: 'soft',
    sustain: 'continuous',
    // §5A.2/#623. Through-composed: the hook is the whole rhythm and there is no grid.
    reArticulatesHook: false,
  },
  /**
   * §5A/#554. The leading tone as data, over the `v` where it would turn the chord major and
   * the drone into a cadence, and reaching the whole piece because the key does not have it.
   * Every entry is on a bar head, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'v',
        degree: 7,
        alter: 1,
        reason: 'the leading tone over a held tonic turns the drone into a place to arrive, and a drone is not arrived at',
      },
    ],
  },
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VII', bars: 2 },
      { degree: 'VI', bars: 2 },
      { degree: 'v', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 3` puts `D3` at degree 1; the drop is
   * to `D2`.
   */
  figureStartsAtBar: 1,
  /**
   * Eight bars, two notes. `D3` for ninety-six steps, then `D2` for thirty, released two
   * sixteenths before the bar line.
   */
  hook: {
    id: 'drone-tonic-pedal-under-the-changes-hook',
    forRole: 'texture',
    bars: 8,
    baseOctave: 3,
    notes: [
      // Bars 1 to 6, over the `i`, the `VII` and the `VI`: D3, held.
      { step: 1, degree: 1, octave: 0, len: 96 },
      // Bars 7 and 8, over the `v`: D2, released two steps early.
      { step: 97, degree: 1, octave: -1, len: 30 },
    ],
  },
}
