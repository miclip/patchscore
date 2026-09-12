import { at, on, variant } from '../core/authoring'
import type { Pattern, Template } from '../core/template'

/**
 * §4. **Slow Noir** — a minor ballad that borrows two major chords, and a lead that goes with
 * them.
 *
 * The slowest direction in the catalogue and the one with the fewest moving parts: no kick, no
 * hats, and a lead that plays thirteen notes in twelve bars. What carries it is the harmony and
 * one line over it, which is why both of those are authored in full and the percussion is three
 * sparse requests at the bottom of the ladder.
 *
 * ## The cycle, and why the keys are minor when two of the chords are not
 *
 * `i VI iv I IV v`, two bars each. Three of those are ordinary natural minor; `I` and `IV` are
 * borrowed from the parallel major, and `v` takes it back.
 *
 * **`ambient-dub` states the rule this looks like it is breaking**, and it is worth answering
 * rather than leaving a reader to notice: authoring a `IV` and then offering a minor key would
 * be *"asking the reader to borrow a chord the key does not contain, in a guide whose whole
 * promise is that the values on the page are the values to dial"*. That direction solved it by
 * going dorian, where the `IV` is native.
 *
 * Dorian does not solve this one, and no mode does. The cycle uses `iv` **and** `IV`, and `i`
 * **and** `I` — a minor and a major on the same two degrees — so any single seven-note mode is
 * short by two notes. The borrowing is not incidental to this direction; it is the direction.
 *
 * So it is stated in the data instead of dodged. The hooks below carry `HookNote.alter` on
 * exactly the notes the borrowed chords raise — the pad's third over the `I` and its sixth over
 * the `IV`, and the lead's the same — so the guide prints `A#4 · raised 3rd` rather than a bare
 * third that would be wrong half the time. §4.1's alteration exists for precisely this, and a
 * reader is told which note is raised at the point they are told to play it.
 *
 * ## Why the lead has a hook and no pattern
 *
 * §4.3/#100: where a hook resolves for a part's role, the hook is the part's rhythm. This lead's
 * identity *is* its rhythm — notes arriving late and hanging past the chord change — so a grid
 * under it would be a second rhythm competing with the first. `reArticulatesHook` is deliberately
 * absent for the same reason: nothing re-strikes these notes, they are played once and held.
 *
 * The sub is the same shape for a different reason. It holds the root of each chord for its two
 * bars, which is a hook and not a pedal — a fixed `pitch` would have put the tonic under all six
 * and turned the `v` into a suspension nobody asked for.
 */

/**
 * §4.3. Three roles carry a grid, and all three are percussion the track can lose. Two bars at
 * a time, because at 64 BPM a 32-step variant is nearly thirty seconds and a longer one would be
 * a part nobody could read against the harmony.
 *
 * Nothing here lands on beat one of every bar. A ballad this slow does not need a downbeat
 * marked — the pad states it — and marking it is what makes a slow track sound like a slow
 * version of a fast one.
 */
const PATTERNS: Pattern[] = [
  // The rim is the clock: one stroke, then two, then the backbeat, then the backbeat with a
  // ghost leaning into it.
  variant('noir-rim-b0', 'rim', 0, 32, on('backbeat', 13)),
  variant('noir-rim-b1', 'rim', 1, 32, on('backbeat', 13, 29)),
  variant('noir-rim-b2', 'rim', 2, 32, on('backbeat', 5, 13, 21, 29)),
  variant(
    'noir-rim-b3',
    'rim',
    3,
    32,
    on('backbeat', 5, 13, 21, 29),
    at('ghost', 58, 11, 27),
  ),

  // The ride opens the space rather than keeping time: a single wash at the bottom, eighths only
  // at the top, and never sixteenths — this direction has no tempo to push.
  variant('noir-ride-b0', 'ride', 0, 32, on('downbeat', 1)),
  variant('noir-ride-b1', 'ride', 1, 32, on('downbeat', 1, 17)),
  variant('noir-ride-b2', 'ride', 2, 32, on('downbeat', 1, 17), on('offbeat', 9, 25)),
  variant(
    'noir-ride-b3',
    'ride',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 5, 9, 13, 21, 25, 29),
  ),

  // Everything the room does that is not the kit. It arrives late in the bar at every band,
  // which is the one gesture this part has.
  variant('noir-ghost-b0', 'ghost-perc', 0, 32, at('ghost', 48, 15)),
  variant('noir-ghost-b1', 'ghost-perc', 1, 32, at('ghost', 50, 15, 31)),
  variant('noir-ghost-b2', 'ghost-perc', 2, 32, at('ghost', 54, 7, 15, 23, 31)),
  variant(
    'noir-ghost-b3',
    'ghost-perc',
    3,
    32,
    at('ghost', 58, 3, 7, 11, 15, 19, 23, 27, 31),
  ),
]

export const slowNoir: Template = {
  id: 'slow-noir',
  name: 'Slow Noir',
  bpm: { min: 56, max: 72, default: 64 },

  /**
   * Natural minor, and the head note above says why the borrowed chords do not change that. Three
   * keys rather than one so the seed has something to choose, and all three sit where a lead can
   * be played above middle C without the pad crowding it.
   */
  keys: ['F# minor', 'D minor', 'B minor'],

  /**
   * #310. Opens dark, wide and undriven, on the 0-100 scale every axis uses with 50 centred.
   * `space` is the one this direction would be wrong without — the reverb is the room the part
   * is played in — and `density` opens at **12**, the low detent, because every request below is
   * sparse by design rather than by accident. §6.3 allows density only at a detent, so this is
   * the value the control can actually produce rather than a number near it.
   */
  mood: { darkness: 68, space: 74, density: 12 },

  /**
   * Five sections, 96 bars, **every one a multiple of the six-bar cycle**. At 64 BPM that is
   * six minutes, and the cycle lands whole in every section rather than being cut mid-progression
   * — which matters more here than in a four-bar direction, because a reader who loses the `I`
   * loses the point of the piece.
   *
   * Energy 0.10 / 0.38 / 0.66 / 0.86 / 0.14 puts the peak in `Neon`, the shortest section, and
   * then drops the whole way rather than stepping down. The track does not resolve; it stops.
   */
  structure: [
    { name: 'Dusk', bars: 12, energy: 0.1 },
    { name: 'Street', bars: 24, energy: 0.38 },
    { name: 'Rain', bars: 24, energy: 0.66 },
    { name: 'Neon', bars: 12, energy: 0.86 },
    { name: 'Dark', bars: 24, energy: 0.14 },
  ],

  /** §4.1. Six bars, six chords, two of them borrowed — one bar each. See the head note. */
  harmony: {
    cycleBars: 6,
    progression: [
      { degree: 'i', bars: 1 },
      { degree: 'VI', bars: 1 },
      { degree: 'iv', bars: 1 },
      { degree: 'I', bars: 1 },
      { degree: 'IV', bars: 1 },
      { degree: 'v', bars: 1 },
    ],
  },

  hooks: [
    /**
     * §4.1. **The lead, and the whole reason this direction exists.** Thirteen notes over six
     * bars: one gesture per chord, most of them arriving after the chord has already changed
     * under them.
     *
     * The two altered notes are the borrowed chords' major thirds — `A#` over the `I` and `D#`
     * over the `IV`. They are the only two notes here that are not in the key, and they are what
     * the ear hears as the turn. `alter` displaces the degree rather than replacing it with a
     * semitone, so the guide spells them `A#` and `D#` — the way the chords under them are spelt
     * — rather than `Bb` and `Eb`, which would read as passing notes.
     */
    {
      id: 'noir-hook-lead-1',
      forRole: 'lead',
      bars: 6,
      baseOctave: 4,
      notes: [
        // i — hold, and drop late.
        { step: 5, degree: 5, octave: 0, len: 8 },
        { step: 13, degree: 3, octave: 0, len: 4 },
        // VI — step down.
        { step: 21, degree: 1, octave: 1, len: 4 },
        { step: 25, degree: 7, octave: 0, len: 4 },
        { step: 29, degree: 6, octave: 0, len: 4 },
        // iv — hold, a neighbour, and back.
        { step: 37, degree: 6, octave: 0, len: 6 },
        { step: 43, degree: 5, octave: 0, len: 3 },
        { step: 46, degree: 6, octave: 0, len: 3 },
        // I — one note, arriving late and hanging over the change.
        { step: 55, degree: 3, octave: 0, len: 12, alter: 1 },
        // IV — up.
        { step: 69, degree: 6, octave: 0, len: 6, alter: 1 },
        { step: 75, degree: 1, octave: 1, len: 6 },
        // v — down, and it does not resolve to the tonic.
        { step: 85, degree: 2, octave: 0, len: 6 },
        { step: 91, degree: 7, octave: -1, len: 6 },
      ],
    },

    /**
     * §4.1. One voicing per chord, held for its two bars, in a tight span from the tonic up a
     * ninth so the voices move by a step or two rather than leaping.
     *
     * It carries the same two alterations as the lead, and that is the point of authoring it at
     * all: the pad is where a reader hears the chord change from minor to major, and a pad that
     * played the diatonic third under a lead playing the raised one would be the guide
     * contradicting itself on one bar.
     */
    {
      id: 'noir-hook-pad-1',
      forRole: 'pad',
      bars: 6,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 16 },
        { step: 1, degree: 3, octave: 0, len: 16 },
        { step: 1, degree: 5, octave: 0, len: 16 },
        { step: 17, degree: 1, octave: 0, len: 16 },
        { step: 17, degree: 3, octave: 0, len: 16 },
        { step: 17, degree: 6, octave: 0, len: 16 },
        { step: 33, degree: 1, octave: 0, len: 16 },
        { step: 33, degree: 4, octave: 0, len: 16 },
        { step: 33, degree: 6, octave: 0, len: 16 },
        { step: 49, degree: 1, octave: 0, len: 16 },
        { step: 49, degree: 3, octave: 0, len: 16, alter: 1 },
        { step: 49, degree: 5, octave: 0, len: 16 },
        { step: 65, degree: 1, octave: 0, len: 16 },
        { step: 65, degree: 4, octave: 0, len: 16 },
        { step: 65, degree: 6, octave: 0, len: 16, alter: 1 },
        { step: 81, degree: 5, octave: 0, len: 16 },
        { step: 81, degree: 7, octave: 0, len: 16 },
        { step: 81, degree: 2, octave: 1, len: 16 },
      ],
    },

    /**
     * §4.1. The root of each chord, held for its two bars. A hook rather than a fixed `pitch`,
     * because the tonic under all six would turn the `v` into a suspension this piece never
     * asks for — and every root here is diatonic, so none of them needs an alteration even
     * though two of the chords above them do.
     */
    {
      id: 'noir-hook-sub-1',
      forRole: 'sub',
      bars: 6,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 16 },
        { step: 17, degree: 6, octave: 0, len: 16 },
        { step: 33, degree: 4, octave: 0, len: 16 },
        { step: 49, degree: 1, octave: 0, len: 16 },
        { step: 65, degree: 4, octave: 0, len: 16 },
        { step: 81, degree: 5, octave: 0, len: 16 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Six requests, and the top two are the piece — a rig that
   * fills only the lead and the pad has the track, where one that fills everything but them has
   * an atmosphere.
   */
  roles: [
    // The tune. No pattern anywhere in this file for `lead`: the hook is its rhythm (#100).
    { id: 'r-lead', role: 'lead', priority: 1, character: 'bright', sustain: 'continuous' },
    // §12.4. Three, because every voicing above is a triad and a rig that could sound two of
    // its notes would be playing a different chord under a guide that says otherwise.
    {
      id: 'r-pad',
      role: 'pad',
      priority: 1,
      character: 'soft',
      sustain: 'continuous',
      polyphony: 3,
    },

    { id: 'r-sub', role: 'sub', priority: 2, character: 'dark', sustain: 'continuous' },

    { id: 'r-texture', role: 'texture', priority: 3, character: 'soft', sustain: 'continuous' },
    { id: 'r-rim', role: 'rim', priority: 3, character: 'clean', sustain: 'continuous' },

    // §4.2. The two the track can lose, and it can lose both: this direction has no kick, so
    // there is no floor these are decorating — they are the room, and a room can be empty.
    {
      id: 'r-ride',
      role: 'ride',
      priority: 4,
      character: 'bright',
      sustain: 'continuous',
      inessential: { reason: 'the pad already fills the space a ride would' },
    },
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 5,
      character: 'soft',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'nothing rests on this, so it is the first request to go' },
    },
  ],

  patterns: PATTERNS,
}
