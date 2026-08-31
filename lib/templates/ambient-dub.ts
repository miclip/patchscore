import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Ambient Dub (§4). The second template, and the one that exists to prove the engine is not
 * quietly shaped like four-to-the-floor techno.
 *
 * **Nothing here names a device** (invariant 3). Roles, characters, slots and bands are the
 * whole shared vocabulary; delay pedals, tape sends and reverb tanks are the far side of the
 * boundary even though they are what the genre is *about*. The template asks for a `texture`
 * and a `sweep` and says nothing about how a rig makes one.
 *
 * The genre in one line: no drop, no backbeat to lean on, a kick that is felt rather than hit,
 * a sidestick keeping the only firm time in the track, and everything else drifting in and out
 * of a chord that changes twice in eight bars.
 *
 * Three things here are deliberately unlike Industrial Techno, because a second template that
 * differs only in its hit positions tests nothing:
 *
 *  - **The energy curve rises and recedes.** One arc, one crest, no return. There is no second
 *    peak because there is nothing to drop back into — §6.3 reads energy for the band, so this
 *    curve is also the arrangement.
 *  - **The bar counts are asymmetric.** 12/20/20/12/36/24. Not one is a power of two, and the
 *    recede is longer than the climb it answers.
 *  - **Every band is asked for at neutral density.** The techno curve skips band 2 entirely at
 *    the middle detent; this one walks 0-1-2-3 up and 1-0 down, so band 2 content is reachable
 *    without touching a knob.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`. Bands run skeletal (0) to busiest (3),
 * and every role with any pattern here has all four — §6.3's fallback exists for templates with
 * holes, and it is reported to the reader when it fires.
 *
 * `pad`, `texture` and `sweep` have no patterns, which is three quarters of what this genre is
 * and none of it on a step grid. A pad holds, a texture breathes, a sweep is one long gesture
 * across a section boundary; four bands of invented 16ths for any of them would be the guide
 * lying about what the part does. The guide omits their pattern block and says so (invariant 5
 * applied to rhythm, §6.3).
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // Two bars, and felt rather than counted: band 0 is one hit in eight beats. Only at band 2
  // does it state a pulse at all, and even band 3 keeps beats 2 and 4 empty.
  variant('dub-kick-b0', 'kick', 0, 32, on('downbeat', 1)),
  variant('dub-kick-b1', 'kick', 1, 32, on('downbeat', 1, 17)),
  variant('dub-kick-b2', 'kick', 2, 32, on('downbeat', 1, 9, 17, 25)),
  variant(
    'dub-kick-b3',
    'kick',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 15),
    at('ghost', 48, 32),
  ),

  // ---- sub ----------------------------------------------------------------------------
  // A held tone, not a part. It moves onto an offbeat before it ever adds a downbeat, which is
  // what keeps the low end from locking to the kick.
  variant('dub-sub-b0', 'sub', 0, 32, on('downbeat', 1)),
  variant('dub-sub-b1', 'sub', 1, 32, on('downbeat', 1, 17)),
  variant('dub-sub-b2', 'sub', 2, 32, on('downbeat', 1, 17), on('offbeat', 11)),
  variant(
    'dub-sub-b3',
    'sub',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 11, 27),
    at('ghost', 46, 8),
  ),

  // ---- bass-mid -----------------------------------------------------------------------
  // The line that carries the harmony. Off the beat from band 0 onward — a bass that lands on
  // the downbeat with the kick is a dub bass with the dub taken out.
  variant('dub-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1), on('offbeat', 11)),
  variant('dub-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 17), on('offbeat', 11)),
  variant(
    'dub-bass-mid-b2',
    'bass-mid',
    2,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 11, 27),
  ),
  variant(
    'dub-bass-mid-b3',
    'bass-mid',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 11, 23, 27),
    at('ghost', 52, 20),
    at('accent', 104, 31),
  ),

  // ---- rim ----------------------------------------------------------------------------
  // The sidestick, and the only part in the template that states firm time. It takes the
  // `backbeat` slot on beats 2 and 4 — the convention's rule is that the slot belongs to the
  // part which *states* the backbeat, and here nothing else is doing it.
  variant('dub-rim-b0', 'rim', 0, 16, on('backbeat', 13)),
  variant('dub-rim-b1', 'rim', 1, 16, on('backbeat', 5, 13)),
  variant('dub-rim-b2', 'rim', 2, 16, on('backbeat', 5, 13), at('ghost', 44, 8)),
  variant(
    'dub-rim-b3',
    'rim',
    3,
    16,
    on('backbeat', 5),
    at('accent', 104, 13),
    at('ghost', 44, 4, 8, 16),
  ),

  // ---- ride ---------------------------------------------------------------------------
  // A wash rather than a pulse: offbeats first, and the beat itself only at band 3.
  variant('dub-ride-b0', 'ride', 0, 16, on('offbeat', 7)),
  variant('dub-ride-b1', 'ride', 1, 16, on('offbeat', 3, 11)),
  variant('dub-ride-b2', 'ride', 2, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'dub-ride-b3',
    'ride',
    3,
    16,
    on('downbeat', 1, 9),
    on('offbeat', 3, 7, 11, 15),
    at('accent', 102, 5),
  ),

  // ---- ghost-perc ---------------------------------------------------------------------
  // Every hit is a ghost, at every band. That is the part: a shaker figure that fills the grid
  // without ever asking to be listened to, so it has no accent anywhere.
  variant('dub-ghost-perc-b0', 'ghost-perc', 0, 16, at('ghost', 44, 4)),
  variant('dub-ghost-perc-b1', 'ghost-perc', 1, 16, at('ghost', 44, 4, 12)),
  variant('dub-ghost-perc-b2', 'ghost-perc', 2, 16, at('ghost', 42, 2, 6, 10, 14)),
  variant(
    'dub-ghost-perc-b3',
    'ghost-perc',
    3,
    16,
    at('ghost', 40, 2, 4, 6, 8, 10, 12, 14, 16),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const ambientDub: Template = {
  id: 'ambient-dub',
  name: 'Ambient Dub',
  bpm: { min: 108, max: 124, default: 116 },

  /**
   * Dorian throughout, and only dorian. The cycle below leans on a major IV, which natural
   * minor does not have — authoring `IV` and then offering a minor key would be asking the
   * reader to borrow a chord the key does not contain, in a guide whose whole promise is that
   * the values on the page are the values to dial.
   */
  keys: ['D dorian', 'F dorian', 'A dorian'],

  /**
   * Six sections, 124 bars, and no drop. Energy 0.08 / 0.35 / 0.62 / 0.85 / 0.4 / 0.12 lands on
   * bands 0 / 1 / 2 / 3 / 1 / 0 at the neutral detent: one arc up, one crest, no return.
   *
   * The bars are asymmetric on purpose, and in two ways that are both load-bearing. Not one is
   * a power of two, so nothing here lines up with a 16-bar loop the way a techno structure does.
   * And the arc does not unwind at the speed it wound up: 52 bars of climb, a 12-bar crest, and
   * 60 bars of recede. A fade that takes as long as the build is a fade nobody hears as one.
   */
  structure: [
    { name: 'Drift', bars: 12, energy: 0.08 },
    { name: 'Swell', bars: 20, energy: 0.35 },
    { name: 'Bloom', bars: 20, energy: 0.62 },
    { name: 'Crest', bars: 12, energy: 0.85 },
    { name: 'Recede', bars: 36, energy: 0.4 },
    { name: 'Ebb', bars: 24, energy: 0.12 },
  ],

  /** §4.1. Eight bars, two changes: four bars of i, then VII and the dorian IV two bars each. */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'VII', bars: 2 },
      { degree: 'IV', bars: 2 },
    ],
  },

  /**
   * §4.1. Authored, never generated, and only for roles this template requests. Steps are the
   * same 16ths-per-bar grid the patterns use; `degree` is 1-based in the key and `octave` is an
   * offset from the hook's own `baseOctave`, which is scientific pitch with middle C at C4.
   *
   * Two bass hooks so the seed has a choice to make (§4.1), and one pad voicing that follows
   * the cycle chord for chord. The pad has no *pattern* and a hook all the same: what it plays
   * is a musical fact, and only when it changes is a rhythmic one.
   */
  hooks: [
    {
      id: 'dub-hook-bass-1',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 11, degree: 5, octave: 0, len: 4 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 27, degree: 7, octave: 0, len: 4 },
      ],
    },
    {
      id: 'dub-hook-bass-2',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 8 },
        { step: 11, degree: 4, octave: 0, len: 3 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 25, degree: 5, octave: 0, len: 2 },
        { step: 29, degree: 6, octave: 0, len: 3 },
      ],
    },
    {
      // Eight bars, one voicing per chord of the cycle, each held for its own span. The sixth
      // in the first voicing is what makes it dorian rather than minor, and it is voiced under
      // the tonic so the mode is audible before the IV arrives to state it.
      id: 'dub-hook-pad-1',
      forRole: 'pad',
      bars: 8,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 64 },
        { step: 1, degree: 3, octave: 0, len: 64 },
        { step: 1, degree: 5, octave: 0, len: 64 },
        { step: 1, degree: 6, octave: 0, len: 64 },
        { step: 65, degree: 7, octave: 0, len: 32 },
        { step: 65, degree: 2, octave: 1, len: 32 },
        { step: 65, degree: 4, octave: 1, len: 32 },
        { step: 97, degree: 4, octave: 0, len: 32 },
        { step: 97, degree: 6, octave: 0, len: 32 },
        { step: 97, degree: 1, octave: 1, len: 32 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Nine requests, and the top of the list is the part of the
   * shape techno puts last — the pad and the sub are the track, and the kick is a texture that
   * happens to be low.
   */
  roles: [
    // §12.4: a minimum note count, not a device name. Four, not three, because the voicing
    // above is a seventh-flavoured stack and a rig that can only sound three of its notes
    // would be playing a different chord under a guide that says otherwise.
    { id: 'r-pad', role: 'pad', priority: 1, character: 'soft', sustain: 'continuous', polyphony: 4 },
    { id: 'r-sub', role: 'sub', priority: 1, character: 'dark', sustain: 'continuous' },

    { id: 'r-bass-mid', role: 'bass-mid', priority: 2, character: 'dark', sustain: 'continuous' },
    { id: 'r-kick', role: 'kick', priority: 2, character: 'soft', sustain: 'continuous' },
    { id: 'r-rim', role: 'rim', priority: 2, character: 'clean', sustain: 'continuous' },

    { id: 'r-texture', role: 'texture', priority: 3, character: 'soft', sustain: 'continuous' },
    { id: 'r-ride', role: 'ride', priority: 3, character: 'bright', sustain: 'continuous' },

    // §4.2. Transient, and scoped to the two sections that are *moving* — one sweep lifting
    // into the crest, one falling away from it. A sweep that ran the whole track would be a
    // pad with a filter on it, which is a different part with a different name.
    {
      id: 'r-sweep',
      role: 'sweep',
      priority: 4,
      character: 'soft',
      sustain: 'transient',
      sections: ['Swell', 'Recede'],
      inessential: { reason: 'the swell can happen by hand across a part already sounding' },
    },

    // §4.4. `optional` removes this from the miss objective entirely: filled if it fits,
    // dropped without complaint if the rig has nothing left — and §4.4's other half since #81,
    // saying so to the reader as well as to the objective.
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 5,
      character: 'clean',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'dub is mostly space, and this is the first thing to go' },
    },

    /**
     * §3.4/#300. **The only riser in the library that is not `bright`, and the geometry is why it
     * had to be asked for somewhere rather than reached by substitution.**
     *
     * `bright` and `dark` are opposite poles on the tone axis — `(0, +1, 0)` against `(0, -1, 0)`,
     * distance 4 — so §3.5 refuses that substitution outright. Until this request existed, every
     * riser in the library was bright and every direction asked for bright, which made a dark one
     * unreachable by construction rather than merely unused.
     *
     * It belongs here rather than in a techno direction for two reasons. Musically, a riser that
     * swells without ever opening is a dub gesture — pressure arriving out of the reverb rather
     * than a build announcing itself. Structurally, this direction already carries a `transient`
     * request in `sweep`, where Weave carries none by design: its parts all sound at once, and
     * section-scoping anything there would let a smaller rig pass by taking turns.
     *
     * `Bloom` alone, because `Crest` is the peak and a riser's whole job is the bar before one.
     * Adding `Recede` would make it a texture that happens to rise.
     */
    {
      id: 'r-riser',
      role: 'riser',
      priority: 5,
      character: 'dark',
      sustain: 'transient',
      sections: ['Bloom'],
      optional: true,
      inessential: { reason: 'the crest gets there by itself; this is one more thing leaning into it' },
    },
  ],

  patterns: PATTERNS,
}
