import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Trill Synth ornament**: four held notes, and each of the last three is reached
 * through a trill that happens *before* the beat rather than on it.
 *
 * **Named after a factory patch, with a figure authored here** (§5A.5). The notes are this
 * library's own and the entry names no device (invariant 3).
 *
 * ## What it teaches
 *
 * A trill is a decoration and the note it lands on is the music. Played on the beat it becomes
 * the music instead, and the arrival it was decorating is gone. So the four sixteenths before
 * each bar line alternate the arrival with the note a step above it, and the arrival itself lands
 * on the downbeat and holds.
 *
 * The test is in the playing: move one trill onto the beat, so it starts where the arrival should
 * be, and the bar loses its downbeat. Nothing else changes and the figure stops working.
 *
 * ## Against the three other leads on this box
 *
 * `broken-toy-music-box-stumble` misplaces notes in time on purpose and never in pitch;
 * `metalfnklead-syncopated-funk-line` is a phrase built to reach one note once;
 * `pressure-repeated-note-build` hammers a single pitch and then leans. None of them decorates an
 * arrival, and this one has almost no line at all: four notes, and everything else is ornament.
 *
 * ## The first arrival has no trill, deliberately
 *
 * Bar one lands cold. A reader hears what the arrivals sound like undecorated and then hears
 * three that are not, which is the comparison the figure is built around and it costs one bar.
 *
 * ## The rule is the leading tone
 *
 * `A#` is in neither chord here, and it is the note a hand reaches for when it decides a trill
 * should be going somewhere. This one is not: it is decoration on a note that was always the
 * destination, and a leading tone inside it turns an ornament into a cadence.
 */
export const trillSynthOrnamentBeforeTheBeat: Riff = {
  id: 'trill-synth-ornament-before-the-beat',
  name: 'The Trill Synth ornament',
  reference: { kind: 'patch', name: 'Trill Synth' },
  bpm: { min: 84, max: 108, default: 96 },
  key: 'B minor',
  technique: [
    'Four notes hold this figure up: B, then D, then E, then G. Everything else is decoration on ' +
      'the way into them.',
    'The decoration is a trill in the last four sixteenths of the bar, alternating the note you ' +
      'are about to land on with the one a step above it. It finishes as the bar ends and the ' +
      'arrival lands on the downbeat.',
    'The trill goes before the beat, never on it. Move one so it starts on the downbeat and the ' +
      'bar loses its arrival: the ornament becomes the note and the note it was decorating is ' +
      'gone. Worth doing once to hear it.',
    'Bar one lands with no trill in front of it. That is the comparison the figure is for, so ' +
      'play the figure round twice and listen to the first arrival against the three that are ' +
      'decorated.',
    'Play the trill lighter than the note it arrives at. Four even sixteenths and a quiet ' +
      'downbeat is a run; a light trill and a weighted arrival is an ornament.',
    'Never play A sharp. It is the raised seventh, and inside a trill it turns a decoration into ' +
      'a cadence that this figure is not making.',
  ],
  request: {
    id: 'trill-synth-ornament-before-the-beat',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * §5A/#554. The raised seventh, as data. `A#` is a tone of neither chord, so the rule
   * contradicts nothing it is checked against (#605).
   */
  constraints: {
    forbiddenDegrees: [
      {
        chord: 'i',
        degree: 7,
        alter: 1,
        reason: 'a leading tone inside a trill turns a decoration into a cadence the figure is not making',
      },
    ],
  },
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'iv', bars: 2 },
    ],
  },
  /**
   * §5A/§4.1. From bar 1. `baseOctave: 3` puts `B3` at degree 1, so the arrivals run `B3` to `G4`
   * and the trills reach `A4` at the top.
   */
  figureStartsAtBar: 1,
  /**
   * Four bars, sixteen notes: four arrivals and three trills of four sixteenths each. A trill
   * alternates the note above the arrival with the arrival itself, twice, and ends on the bar
   * line.
   */
  hook: {
    id: 'trill-synth-ornament-before-the-beat-hook',
    forRole: 'lead',
    bars: 4,
    baseOctave: 3,
    notes: [
      // Bar 1: the undecorated arrival, the root of the `i`.
      { step: 1, degree: 1, octave: 0, len: 12 },
      // Into bar 2: a trill on D and the E above it, landing on D, the third of the `i`.
      { step: 13, degree: 4, octave: 0, len: 1 },
      { step: 14, degree: 3, octave: 0, len: 1 },
      { step: 15, degree: 4, octave: 0, len: 1 },
      { step: 16, degree: 3, octave: 0, len: 1 },
      { step: 17, degree: 3, octave: 0, len: 12 },
      // Into bar 3: a trill on E and F#, landing on E, the root of the `iv`.
      { step: 29, degree: 5, octave: 0, len: 1 },
      { step: 30, degree: 4, octave: 0, len: 1 },
      { step: 31, degree: 5, octave: 0, len: 1 },
      { step: 32, degree: 4, octave: 0, len: 1 },
      { step: 33, degree: 4, octave: 0, len: 12 },
      // Into bar 4: a trill on G and A, landing on G, the third of the `iv`.
      { step: 45, degree: 7, octave: 0, len: 1 },
      { step: 46, degree: 6, octave: 0, len: 1 },
      { step: 47, degree: 7, octave: 0, len: 1 },
      { step: 48, degree: 6, octave: 0, len: 1 },
      { step: 49, degree: 6, octave: 0, len: 16 },
    ],
  },
  /**
   * §5A.2. One pass. The four arrivals are the accents and every trill sixteenth is a ghost, so
   * the weighting the technique asks for is in the grid rather than only in the prose.
   */
  pattern: variant(
    'trill-synth-ornament-before-the-beat-grid',
    'lead',
    0,
    64,
    at('accent', 114, 1, 17, 33, 49),
    at('ghost', 52, 13, 14, 15, 16, 29, 30, 31, 32, 45, 46, 47, 48),
  ),
}
