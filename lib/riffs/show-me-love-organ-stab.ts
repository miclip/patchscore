import { at, on, variant } from '../core/authoring'
import type { Riff } from '../core/riff'

/**
 * §5A. **The Show Me Love organ stab** — a chord that only ever lands where the beat is not.
 *
 * **Named after a recording, and not transcribed from one** (§5A.5). The two chords below are this
 * library's own. The technique the record is the reference for is the offbeat organ stab itself:
 * a short chord on every upbeat, interlocking with a kick it is never heard at the same time as.
 *
 * The one riff in the library that asks for a **chord**, and it asks with `polyphony: 3` — a
 * number, not a device name, so invariant 3 is untouched. That number is also why this entry earns
 * its place twice: a rig of monophonic single-voice boxes reports `no-capable-voice` against it,
 * and a rig with a *pool* of monophonic voices spreads it across three of them (§12.4/#40). Both
 * are §7.3 working on a surface that runs no search.
 *
 * It is also the entry `reArticulatesHook` reads most plainly on. The hook is a chord held for a
 * bar; the grid is where a hand comes down on it. Nothing about those two is in competition.
 */
export const showMeLoveOrganStab: Riff = {
  id: 'show-me-love-organ-stab',
  name: 'The Show Me Love organ stab',
  track: 'Show Me Love',
  bpm: { min: 112, max: 128, default: 120 },
  key: 'A minor',
  technique: [
    'Land the chord on the "and" of every beat. Put a four-on-the-floor kick under it to hear ' +
      'the two interlock.',
    'Keep it short: lift the hand before the next beat arrives, so the downbeat stays clear for ' +
      'the kick.',
    'Accent the first stab of the phrase and play the rest evenly. That one accent marks where ' +
      'the two bars start.',
    'Voice the three notes close together, above the bass and below the melody. A tight voicing ' +
      'is what makes it read as a stab.',
  ],
  request: {
    id: 'show-me-love-organ-stab',
    role: 'stab',
    priority: 1,
    character: 'bright',
    sustain: 'continuous',
    // §12.4. Three simultaneous notes. A voice that cannot reach them is a gap, not a substitution.
    polyphony: 3,
    reArticulatesHook: true,
  },
  /**
   * Two chords, a bar each, each in force across the bar the grid strikes it in. Three notes at
   * one step is a chord (§4.1), and the second is the same shape moved up the scale rather than
   * a new voicing — the figure is one hand shape being carried, which is the part.
   */
  hook: {
    id: 'show-me-love-organ-stab-hook',
    forRole: 'stab',
    bars: 2,
    baseOctave: 4,
    notes: [
      { step: 1, degree: 1, octave: 0, len: 16 },
      { step: 1, degree: 3, octave: 0, len: 16 },
      { step: 1, degree: 5, octave: 0, len: 16 },
      { step: 17, degree: 4, octave: 0, len: 16 },
      { step: 17, degree: 6, octave: 0, len: 16 },
      { step: 17, degree: 8, octave: 0, len: 16 },
    ],
  },
  pattern: variant(
    'show-me-love-organ-stab-grid',
    'stab',
    0,
    32,
    at('accent', 108, 3),
    on('offbeat', 7, 11, 15, 19, 23, 27, 31),
  ),
}
