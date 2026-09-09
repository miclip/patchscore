import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Thriller synth riff** — the syncopated lead line that is all rhythm and four notes.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). The notes below are this
 * library's own. What the record is the reference *for* is a way of writing a lead: a figure whose
 * identity is where it lands rather than which notes it uses, so the pitch material is tiny and
 * the syncopation carries all of it.
 *
 * **Names no device** (invariant 3). `lead`, `bright`, and a grid.
 *
 * ## Why the hook holds notes the grid strikes
 *
 * A lead is the entry where §4.3's `reArticulatesHook` reading is worth stating, because it is the
 * least obvious of the four. The figure is not a melody with its own rhythm — it is four pitches,
 * each *in force* over a stretch, struck in a pattern that never lands where the beat is. Written
 * the other way round, as a hook with its own short notes, the pattern would be a second rhythm
 * competing with it, which is exactly what #100 forbids.
 */
export const thrillerSynthRiff: Riff = {
  id: 'thriller-synth-riff',
  name: 'The Thriller synth riff',
  track: 'Thriller',
  bpm: { min: 108, max: 124, default: 118 },
  key: 'C# minor',
  technique: [
    'Four notes across two bars, and almost every one lands off the beat. Place them exactly ' +
      'where the grid puts them and the rhythm carries the part.',
    'Accent the first note and play everything after it under that. One fixed point is what ' +
      'lets the ear hear the rest as pushed.',
    'Keep the notes short and even. The gaps belong to the drums.',
    'Sit it in the middle of the register, around C3 to C4. Down there it interlocks with the ' +
      'bass and the kit.',
  ],
  request: {
    id: 'thriller-synth-riff',
    role: 'lead',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * Two bars, four pitches, each in force until the next takes over. `baseOctave: 3` puts it in
   * the middle of the register the last paragraph above is about (§4.1, middle C is C4).
   */
  hook: {
    id: 'thriller-synth-riff-hook',
    forRole: 'lead',
    bars: 2,
    baseOctave: 3,
    notes: [
      { step: 1, degree: 1, octave: 0, len: 12 },
      { step: 13, degree: 4, octave: 0, len: 8 },
      { step: 21, degree: 3, octave: 0, len: 6 },
      { step: 27, degree: 1, octave: 0, len: 6 },
    ],
  },
  pattern: variant(
    'thriller-synth-riff-grid',
    'lead',
    0,
    32,
    at('accent', 116, 1),
    on('offbeat', 3, 11, 19, 27),
    on('downbeat', 5, 13, 21, 29),
    at('ghost', 74, 8, 16, 24),
  ),
}
