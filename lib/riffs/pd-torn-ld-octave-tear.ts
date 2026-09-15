import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The PD Torn LD octave tear**: one note held across a chord change, ripped up an
 * octave and cut dead, then a fall to the one note the key does not own, torn off before the
 * bar line.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5, #624). The patch is a
 * lead; the notes are this library's own, and the entry names no device (invariant 3).
 *
 * ## What the name gives the figure, and what it does not
 *
 * Nobody writing this had heard the preset. What its name says is *torn*, and the figure takes
 * that at its word visibly: a line that is whole for a bar and a half and then ripped. The tear
 * is an octave leap held briefly and cut, and the ending is a note torn off before the bar
 * line so the next pass lands on air. Five notes in four bars, because a tear needs something
 * long enough to tear. The prose says what to play and nothing about what the preset sounds
 * like, because the name is the whole of the evidence (§3.7).
 *
 * ## How it differs from the other lead written for this box
 *
 * `pd-jekler-ld-pickup-landing-line` is twelve notes, every phrase a pickup into a bar head,
 * each landing two beats long. This is five, one of them twenty-four steps long, and its one
 * entry that matters is off the bar head. A reader with both has a marching lead and a held
 * one.
 *
 * ## One note at a time, by construction
 *
 * Every note ends before the next begins, so the peak is one; `test/riff.test.ts` counts it.
 * The box this patch ships on plays two notes, and a lead uses one.
 *
 * ## The harmony is context, and the last chord is the point
 *
 * `i VI iv V` in A minor, one bar each. The `V` is E major, whose third is `G#`, the one note
 * A minor does not own, and the line's last note is that `G#`: the third of the chord under it
 * and a raised seventh against the key, so `alter: 1` on degree 7 and the guide prints `raised
 * 7th` beside it. The pass then re-enters on `A4`, which is where a `G#` goes.
 *
 * ## Why the natural seventh is forbidden over the V
 *
 * `G` against `G#` is the tear closing up, the same collision Blade Runner forbids over its
 * borrowed `I`. An unaltered rule reaches the one chord it names (§5A.8), and `V` is the only
 * chord here that has a `G#` for a `G` to fight.
 */
export const pdTornLdOctaveTear: Riff = {
  id: 'pd-torn-ld-octave-tear',
  name: 'The PD Torn LD octave tear',
  reference: { kind: 'patch', name: 'PD Torn LD' },
  bpm: { min: 84, max: 108, default: 96 },
  key: 'A minor',
  technique: [
    'Hold the A for a bar and a half, straight across the change from A minor to F. The line ' +
      'is one note for longer than feels comfortable. That is the part that gets torn.',
    'On beat three of bar two, leap the octave. Hold the high A for a beat and a half and cut ' +
      'it dead. The silence before bar three is part of the tear; do not fill it.',
    'Fall in bar three: F on the bar head, E on beat three, two beats each, both notes of the ' +
      'D minor under them. This is the line coming down from where it was ripped to.',
    'Bar four is the G sharp, the third of the E chord. Enter it on the bar head, hold it past ' +
      'beat three and tear it off before the bar line, so the next pass lands on A over ' +
      'silence.',
    'Never play G natural while the E chord is sounding. Against the G sharp it is the line ' +
      'closing back up, and the tear is the whole figure.',
    'If the sound moves on its own while a note is held, the long A is where it shows. Keep ' +
      'that note long enough for whatever the sound does to be heard doing it.',
  ],
  request: {
    id: 'pd-torn-ld-octave-tear',
    role: 'lead',
    priority: 1,
    character: 'dirty',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The natural seventh over the `V` as data: the key's own note, forbidden over the
   * one chord built on its raised form. Entries are on the bar head except the tear, which is
   * inside a chord and not an entry, so there is no offset to state.
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'V',
        degree: 7,
        reason: 'the natural seventh against the chord’s raised one is the tear closing up',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },
  /**
   * §5A/§4.1. The whole cycle, from bar 1. `baseOctave: 4` puts `A4` at degree 1; the tear
   * reaches `A5` and the fall ends on `G#4`.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, five notes. `A4` for twenty-four steps, `A5` for six and then silence, `F5` and
   * `E5` for eight each, `G#4` for ten and then silence to the bar line.
   */
  hook: {
    id: 'pd-torn-ld-octave-tear-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 4,
    notes: [
      // `i` into `VI`: A4 held across the change, to the "and" of two in bar two.
      { step: 1, degree: 1, octave: 0, len: 24 },
      // `VI`, beat three: the tear, A5, cut after a beat and a half.
      { step: 25, degree: 1, octave: 1, len: 6 },
      // `iv`: F5 on the bar head, E5 on beat three.
      { step: 33, degree: 6, octave: 0, len: 8 },
      { step: 41, degree: 5, octave: 0, len: 8 },
      // `V`: G#4, the chord's third, torn off before the bar line.
      { step: 49, degree: 7, octave: -1, len: 10, alter: 1 },
    ],
  },
  /**
   * §5A.2. One pass, every onset struck once: the tear is the accent, the rest are bar heads and
   * beat three of bar three.
   */
  pattern: variant(
    'pd-torn-ld-octave-tear-grid',
    'lead',
    0,
    64,
    at('accent', 120, 25),
    on('downbeat', 1, 33, 41, 49),
  ),
}
