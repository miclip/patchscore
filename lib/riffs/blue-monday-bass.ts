import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Blue Monday bass** — the sixteenth-note bass that does not breathe.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). Every note below is this
 * library's own: three pitches and a step down, written to teach the technique the record is the
 * reference for. What is being taught is a *way of playing a bass part*, and the figure that
 * carries it here is ours — a reader who wants the record should go and listen to the record.
 *
 * **Names no device** (invariant 3). It says `bass-mid`, `hard`, and a grid; which box plays it
 * is `resolveRiff`'s answer against a rig the author knows nothing about.
 *
 * ## Why every sixteenth, and why `ghost` is the word for the ones between the beats
 *
 * §4.3's slot vocabulary has `downbeat` for an on-beat hit, `offbeat` for an eighth-note
 * offbeat, and `ghost` for a sixteenth between them. A part that strikes all sixteen therefore
 * uses all three, and the third is not a claim that these notes are quiet — the velocity says
 * `92` against an unmarked hit's default, which is *barely under*, and it is under at all only
 * because a machine-locked line still has a pulse a listener can find. A device that articulates
 * `ghost` will place them the way that box places a sixteenth, which is the whole reason
 * articulation addresses slots rather than step numbers.
 */
export const blueMondayBass: Riff = {
  id: 'blue-monday-bass',
  name: 'The Blue Monday bass',
  track: 'Blue Monday',
  bpm: { min: 118, max: 134, default: 128 },
  key: 'F minor',
  technique: [
    'Play all sixteen sixteenths, dead even, with the sequencer holding the pulse. Turn swing ' +
      'off and leave every velocity flat except the one on step 1.',
    'Hold one note for most of the phrase and move once, near the end, by a single step. The ' +
      'shape comes from how long the note stays put.',
    'Keep each note short so a gap opens between them. That gap is what a listener hears as the ' +
      'pulse.',
    'Let it repeat unchanged. When a fill starts to suggest itself, cut to a different section.',
  ],
  request: {
    id: 'blue-monday-bass',
    role: 'bass-mid',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    reArticulatesHook: true,
  },
  /**
   * Two bars. The notes are *in force* rather than struck — the grid below says where they are
   * struck — so the lengths span the stretch each pitch owns and abut rather than overlap.
   * `baseOctave: 2` puts the part where a bass sits (§4.1, middle C is C4).
   */
  hook: {
    id: 'blue-monday-bass-hook',
    forRole: 'bass-mid',
    bars: 2,
    baseOctave: 2,
    notes: [
      { step: 1, degree: 1, octave: 0, len: 16 },
      { step: 17, degree: 3, octave: 0, len: 8 },
      { step: 25, degree: 2, octave: 0, len: 8 },
    ],
  },
  pattern: variant(
    'blue-monday-bass-grid',
    'bass-mid',
    0,
    32,
    at('accent', 112, 1),
    on('downbeat', 5, 9, 13, 17, 21, 25, 29),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
    at('ghost', 92, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32),
  ),
}
