import type { Pattern, PatternHit, Template } from '../core/template'
import type { PatternSlot, Role } from '../core/vocabulary'

/**
 * Industrial Techno (§4). The first real template, and the reference for every one after it.
 *
 * **Nothing here names a device** (invariant 3). The whole shared vocabulary this file may use
 * is `Role`, `Character`, `MoodAxis` and `PatternSlot`; everything else — voices, generators,
 * knob names, page citations — belongs on the far side of the boundary, in `lib/devices/`.
 * A template that mentions a box is a template that stops working when you sell it.
 *
 * The genre in one line: a hard four-to-the-floor kick, a sub that answers it off the beat,
 * metal that is dirty rather than bright, and tonal material that stays low and minor. Character
 * pinnings below say that; the resolver (§6.2) is free to move them when mood asks it to.
 */

// ---------------------------------------------------------------------------
// Slot convention
// ---------------------------------------------------------------------------

/**
 * `PatternSlot` is shared vocabulary but not a self-enforcing one: a device that articulates
 * `offbeat` gets whatever *this file* decided an offbeat is. So the convention is written down
 * once, here, rather than re-decided per variant.
 *
 * A 16-step variant is one bar of 4/4 in 16ths. Beats fall on steps 1, 5, 9, 13; 8th-note
 * offbeats on 3, 7, 11, 15; everything even is a 16th subdivision. A 32-step variant is two
 * bars of the same grid, a 64-step variant four.
 *
 *   downbeat    an on-beat hit
 *   backbeat    beats 2 and 4 of the part that *states* the backbeat — the clap, here. Other
 *               roles hitting beat 2 or 4 use `downbeat`: a kick on 2 is pulse, not backbeat.
 *   offbeat     an 8th-note offbeat
 *   ghost       a quiet 16th between the beats. Always carries a low velocity.
 *   accent      the one hit the variant leans on. Always carries a high velocity.
 *   fill        a 16th run in the closing beat of the variant
 *   first-hit   an entry gesture that is not part of the pulse — the crash on an impact
 *   last-hit    a tail that is not part of the pulse
 *
 * `first-hit`/`last-hit` are deliberately *not* "whichever hit happens to be first or last".
 * Under that reading a four-to-the-floor kick would have no downbeat on step 1 and a clap would
 * never state a backbeat, and the two slots a device most wants to articulate — the part's entry
 * and its tail — would land on hits that are neither.
 *
 * The band-to-band story: band 0 is the part at its most skeletal, band 3 at its busiest. Density
 * *selects* among these (§6.3); it never edits hits, which is why each band is authored whole.
 */

// ---------------------------------------------------------------------------
// Authoring helpers
// ---------------------------------------------------------------------------

/** `on('offbeat', 3, 7, 11, 15)` — one slot, several steps, no velocity. */
function on(slot: PatternSlot, ...steps: number[]): PatternHit[] {
  return steps.map((step) => ({ step, slot }))
}

/** `at('ghost', 48, 2, 6)` — the velocity-carrying slots. See the convention above. */
function at(slot: PatternSlot, velocity: number, ...steps: number[]): PatternHit[] {
  return steps.map((step) => ({ step, slot, velocity }))
}

/**
 * Assembles one variant and puts its hits in step order. Sorting here rather than asking the
 * author to interleave the groups by hand keeps the source readable *and* the data canonical —
 * two variants that differ only in the order their groups were written are byte-identical
 * downstream (invariant 6). Numeric comparison, so no locale is involved (§7.2).
 */
function variant(
  id: string,
  forRole: Role,
  band: 0 | 1 | 2 | 3,
  length: 16 | 32 | 64,
  ...groups: PatternHit[][]
): Pattern {
  return {
    id,
    forRole,
    band,
    length,
    hits: groups.flat().sort((a, b) => a.step - b.step),
  }
}

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * Every role that has a pattern here has all four bands. That is a rule this template keeps
 * rather than one the schema enforces: §6.3's band fallback exists for templates that do *not*
 * keep it, and it is reported to the user when it fires. Reporting "no band-3 kick authored"
 * on the flagship template would be a content bug wearing a feature's clothes.
 *
 * `pad` and `riser` have no patterns and that is deliberate, not an omission. Both are sustained
 * gestures — a pad holds through a section, a riser is one long sweep — and a step grid is the
 * wrong shape for either. The guide omits their pattern block and says so (invariant 5 applied
 * to rhythm, §6.3), which is the honest answer rather than four bands of invented hits.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // The pulse. Band 0 is half-time so an Intro has somewhere to go; bands 2 and 3 add the
  // 16th pickup into the next bar that gives the genre its forward lean.
  variant('it-kick-b0', 'kick', 0, 16, on('downbeat', 1, 9)),
  variant('it-kick-b1', 'kick', 1, 16, on('downbeat', 1, 5, 9, 13)),
  variant('it-kick-b2', 'kick', 2, 16, on('downbeat', 1, 5, 9, 13), at('ghost', 55, 16)),
  variant(
    'it-kick-b3',
    'kick',
    3,
    16,
    on('downbeat', 1, 5, 13),
    at('accent', 112, 9),
    at('ghost', 50, 8),
    at('ghost', 60, 16),
  ),

  // ---- sub ----------------------------------------------------------------------------
  // Answers the kick rather than doubling it: as the band rises the sub migrates onto the
  // 8th offbeats, which is why bands 2 and 3 lose downbeats they had at band 1.
  variant('it-sub-b0', 'sub', 0, 16, on('downbeat', 1)),
  variant('it-sub-b1', 'sub', 1, 16, on('downbeat', 1, 9), on('offbeat', 15)),
  variant('it-sub-b2', 'sub', 2, 16, on('downbeat', 1), on('offbeat', 7, 11, 15)),
  variant('it-sub-b3', 'sub', 3, 16, on('downbeat', 1), on('offbeat', 3, 7, 11, 15)),

  // ---- closed-hat ---------------------------------------------------------------------
  // Offbeat 8ths first, 16th ghosts second, and only at band 3 does the beat itself get a hat.
  variant('it-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'it-closed-hat-b1',
    'closed-hat',
    1,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 45, 2, 10),
  ),
  variant(
    'it-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 45, 2, 6, 10, 14),
  ),
  variant(
    'it-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11),
    at('accent', 108, 15),
    at('ghost', 42, 2, 4, 6, 8, 10, 12, 14, 16),
  ),

  // ---- open-hat -----------------------------------------------------------------------
  variant('it-open-hat-b0', 'open-hat', 0, 16, on('offbeat', 7)),
  variant('it-open-hat-b1', 'open-hat', 1, 16, on('offbeat', 3, 11)),
  variant('it-open-hat-b2', 'open-hat', 2, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'it-open-hat-b3',
    'open-hat',
    3,
    16,
    on('offbeat', 3, 7, 11),
    on('downbeat', 13),
    at('accent', 106, 15),
  ),

  // ---- clap ---------------------------------------------------------------------------
  // The only role that uses `backbeat`. Band 0 states beat 4 alone; band 3 trades the second
  // backbeat for an accent and runs 16ths out of the bar.
  variant('it-clap-b0', 'clap', 0, 16, on('backbeat', 13)),
  variant('it-clap-b1', 'clap', 1, 16, on('backbeat', 5, 13)),
  variant('it-clap-b2', 'clap', 2, 16, on('backbeat', 5, 13), at('ghost', 50, 16)),
  variant(
    'it-clap-b3',
    'clap',
    3,
    16,
    on('backbeat', 5),
    at('accent', 112, 13),
    on('fill', 14, 15, 16),
  ),

  // ---- bass-mid -----------------------------------------------------------------------
  // Two bars, because a one-bar bass line under a one-bar kick is a drone. Beats in a 32-step
  // variant fall on 1, 5, 9, 13, 17, 21, 25, 29; offbeats on 3, 7, 11, 15, 19, 23, 27, 31.
  variant('it-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1, 17)),
  variant('it-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 9, 17, 25)),
  variant(
    'it-bass-mid-b2',
    'bass-mid',
    2,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 7, 23),
  ),
  variant(
    'it-bass-mid-b3',
    'bass-mid',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 7, 11, 23, 27),
    at('ghost', 50, 4, 20),
    at('accent', 110, 31),
  ),

  // ---- metallic -----------------------------------------------------------------------
  // Clang, not a hi-hat. Sparse by design even at band 3, and the one role that uses a tail.
  variant('it-metallic-b0', 'metallic', 0, 32, on('downbeat', 17)),
  variant('it-metallic-b1', 'metallic', 1, 32, on('downbeat', 1, 17)),
  variant(
    'it-metallic-b2',
    'metallic',
    2,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 11, 27),
  ),
  variant(
    'it-metallic-b3',
    'metallic',
    3,
    32,
    at('accent', 110, 1),
    on('offbeat', 7, 11, 23, 27),
    on('downbeat', 17),
    on('last-hit', 32),
  ),

  // ---- stab ---------------------------------------------------------------------------
  variant('it-stab-b0', 'stab', 0, 32, on('downbeat', 1)),
  variant('it-stab-b1', 'stab', 1, 32, on('downbeat', 1, 17)),
  variant('it-stab-b2', 'stab', 2, 32, on('downbeat', 1, 17), on('offbeat', 11)),
  variant(
    'it-stab-b3',
    'stab',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 11, 23),
    at('accent', 108, 29),
  ),

  // ---- noise --------------------------------------------------------------------------
  variant('it-noise-b0', 'noise', 0, 32, on('downbeat', 1)),
  variant('it-noise-b1', 'noise', 1, 32, on('downbeat', 1, 17)),
  variant('it-noise-b2', 'noise', 2, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  variant(
    'it-noise-b3',
    'noise',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 15, 23),
    at('accent', 104, 31),
  ),

  // ---- impact -------------------------------------------------------------------------
  // Four bars long, and that length is the whole point. §12.5 keeps variants flat — no bar
  // offset, no within-section sequence — so a 16-step impact would crash on every bar of a
  // 32-bar Drop. At 64 steps band 0 fires once every four bars, which is what a crash is for.
  variant('it-impact-b0', 'impact', 0, 64, on('first-hit', 1)),
  variant('it-impact-b1', 'impact', 1, 64, on('first-hit', 1), on('downbeat', 33)),
  variant(
    'it-impact-b2',
    'impact',
    2,
    64,
    on('first-hit', 1),
    on('downbeat', 17, 33, 49),
  ),
  variant(
    'it-impact-b3',
    'impact',
    3,
    64,
    on('first-hit', 1),
    on('downbeat', 17, 25, 49, 57),
    at('accent', 114, 33),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const industrialTechno: Template = {
  id: 'industrial-techno',
  name: 'Industrial Techno',
  bpm: { min: 130, max: 142, default: 134 },
  keys: ['F minor', 'A minor', 'C minor'],

  /**
   * Six sections, 128 bars. The §4 sketch's Intro/Build/Drop is the shape but not a track:
   * without a Breakdown there is nothing for the second Drop to be a return *from*, and
   * `sections` on a transient request has nothing to choose between. Energy is the arrangement
   * curve the renderer reads; it is not the density knob, which the user drives.
   */
  structure: [
    { name: 'Intro', bars: 16, energy: 0.15 },
    { name: 'Build', bars: 16, energy: 0.45 },
    { name: 'Drop', bars: 32, energy: 0.9 },
    { name: 'Breakdown', bars: 16, energy: 0.3 },
    { name: 'Peak', bars: 32, energy: 1 },
    { name: 'Outro', bars: 16, energy: 0.2 },
  ],

  /** §4.1. Eight bars of i - VI - VII, resolved against the chosen key at step 5.5. */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'VI', bars: 2 },
      { degree: 'VII', bars: 2 },
    ],
  },

  /**
   * §4.1. Authored, never generated, and authored only for roles this template actually
   * requests — a hook for a role nobody asks for is data the renderer can never reach.
   * Two bass hooks rather than one because §4.1 gives the seed a choice to make.
   *
   * Steps are on the same 16ths-per-bar grid as the patterns; `degree` is 1-based in the key,
   * so 1 is the tonic and 5 the fifth, and `octave` is an offset from the hook's own
   * `baseOctave`. Middle C is C4 (§4.1), so the bass hooks put their tonic two octaves below
   * it and the stab and pad sit just under it.
   */
  hooks: [
    {
      id: 'it-hook-bass-1',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 9, degree: 1, octave: 0, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 4 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 25, degree: 7, octave: 0, len: 2 },
        { step: 27, degree: 1, octave: 1, len: 4 },
      ],
    },
    {
      id: 'it-hook-bass-2',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 3 },
        { step: 7, degree: 1, octave: 0, len: 2 },
        { step: 11, degree: 4, octave: 0, len: 3 },
        { step: 15, degree: 1, octave: 0, len: 2 },
        { step: 17, degree: 1, octave: 0, len: 3 },
        { step: 23, degree: 6, octave: 0, len: 2 },
        { step: 27, degree: 5, octave: 0, len: 4 },
      ],
    },
    {
      // Triads: three notes sharing a step. Four bars, sitting inside the i of the cycle.
      id: 'it-hook-stab-1',
      forRole: 'stab',
      bars: 4,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 2 },
        { step: 1, degree: 3, octave: 0, len: 2 },
        { step: 1, degree: 5, octave: 0, len: 2 },
        { step: 11, degree: 1, octave: 0, len: 1 },
        { step: 11, degree: 3, octave: 0, len: 1 },
        { step: 11, degree: 5, octave: 0, len: 1 },
        { step: 33, degree: 1, octave: 0, len: 2 },
        { step: 33, degree: 3, octave: 0, len: 2 },
        { step: 33, degree: 5, octave: 0, len: 2 },
        { step: 49, degree: 5, octave: 0, len: 3 },
        { step: 49, degree: 7, octave: 0, len: 3 },
        { step: 49, degree: 2, octave: 1, len: 3 },
      ],
    },
    {
      // Eight bars, one voicing per chord of the cycle, each held for its own span.
      id: 'it-hook-pad-1',
      forRole: 'pad',
      bars: 8,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 64 },
        { step: 1, degree: 3, octave: 0, len: 64 },
        { step: 1, degree: 5, octave: 0, len: 64 },
        { step: 65, degree: 6, octave: 0, len: 32 },
        { step: 65, degree: 1, octave: 1, len: 32 },
        { step: 65, degree: 3, octave: 1, len: 32 },
        { step: 97, degree: 7, octave: 0, len: 32 },
        { step: 97, degree: 2, octave: 1, len: 32 },
        { step: 97, degree: 4, octave: 1, len: 32 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5, and one miss at priority 1 is worse than any number at 2.
   * Twelve requests, which is the size the search was measured against (#27/#28) and the size
   * a small rig actually has to answer.
   *
   * Priority reads as: the two that make it techno; the three that make it move; the three that
   * make it industrial; the two that give it a top and a transition; and one that is a bonus.
   *
   * Ids spell the role out rather than abbreviating it. `r-ch` and `r-oh` read fine until you
   * notice that two-letter abbreviations are also how drum voices are conventionally labelled,
   * at which point a reader has to work out which side of the boundary an id came from - and a
   * test that guards invariant 3 by looking for device words has to special-case it.
   */
  roles: [
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    { id: 'r-sub', role: 'sub', priority: 1, character: 'dark', sustain: 'continuous' },

    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'dirty',
      sustain: 'continuous',
    },
    { id: 'r-clap', role: 'clap', priority: 2, character: 'bright', sustain: 'continuous' },
    { id: 'r-bass-mid', role: 'bass-mid', priority: 2, character: 'dirty', sustain: 'continuous' },

    { id: 'r-open-hat', role: 'open-hat', priority: 3, character: 'dark', sustain: 'continuous' },
    { id: 'r-metallic', role: 'metallic', priority: 3, character: 'dark', sustain: 'continuous' },
    { id: 'r-stab', role: 'stab', priority: 3, character: 'hard', sustain: 'continuous' },

    // §12.4: a minimum note count, not a device name. A rig that cannot voice three notes at
    // once gets an honest gap here rather than a pad that is secretly monophonic.
    {
      id: 'r-pad',
      role: 'pad',
      priority: 4,
      character: 'dark',
      sustain: 'continuous',
      polyphony: 3,
    },

    // §4.2. Transitional: four bars of lift, not a voice owned for the whole track.
    {
      id: 'r-riser',
      role: 'riser',
      priority: 4,
      character: 'bright',
      sustain: 'transient',
      sections: ['Build', 'Breakdown'],
    },
    {
      id: 'r-impact',
      role: 'impact',
      priority: 4,
      character: 'hard',
      sustain: 'transient',
      sections: ['Drop', 'Peak'],
    },

    // §4.4. `optional` removes this from the miss objective entirely: filled if it fits,
    // dropped without complaint if the rig has nothing left.
    {
      id: 'r-noise',
      role: 'noise',
      priority: 5,
      character: 'dirty',
      sustain: 'continuous',
      optional: true,
    },
  ],

  patterns: PATTERNS,
}
