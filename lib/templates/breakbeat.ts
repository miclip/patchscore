import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Breakbeat (§4). **The direction where the snare carries the rhythm and the kick is placed
 * around it**, at the only tempo the library does not reach.
 *
 * #307 filed this against two holes at once. The tempo ceiling was 142 and six of the nine
 * directions then shipped sat inside a 118–142 huddle, so there was no fast music in the library
 * at all. And every one of them is built the same way underneath: a kick on the downbeat, a
 * backbeat answering it, everything else placed against that. A break inverts the pair. The
 * snare states the rhythm, the kick falls into the gaps the snare leaves, and `rim` and
 * `ghost-perc` stop being garnish.
 *
 * The direction in one line: 165 to 175, a two-bar break whose second bar refuses to repeat the
 * first, a bass that holds while the drums move, and an arrangement that mutes the break down to
 * the kick and brings it back harder.
 *
 * **Nothing here names a device** (invariant 3).
 *
 * ---------------------------------------------------------------------------
 * What this direction is for, and what it is not for
 * ---------------------------------------------------------------------------
 *
 * #307 opened by counting unreachable recipes and found seven `snare: dirty` across seven
 * devices, unreached by any direction. **That block is no longer dead — `hip-hop` (#311) reached
 * every one of them before this file existed** — so reaching them is not the case for this
 * direction and must not be reported as one. `r-snare` below asks for `dirty` because a break is
 * a sampled snare with its room still on it, which is the honest reason, and it happens to want
 * the same recipes another direction already wants.
 *
 * What is left is the case that was always the stronger half: **the tempo band and the rhythmic
 * architecture.** 165–175 is empty. And the inversion above is a claim about the pattern model
 * that nothing had tested — whether a direction can express a rhythm whose centre of gravity is
 * the backbeat rather than the pulse. It can, and §4.3 below is the working.
 *
 * ---------------------------------------------------------------------------
 * Half-time is note length and pattern length. It is not a second clock, and it is not a gap
 * ---------------------------------------------------------------------------
 *
 * The feel this music is named for is a bass and a chord moving at what sounds like half the
 * speed of the drums. **There is one tempo.** A track at 170 is at 170; the bass is not running
 * at 85, it is playing long notes. Half-time describes note density and where the snare falls,
 * so a per-part tempo divisor would encode a misunderstanding into `lib/core` and weaken what
 * every other direction's `bpm` means.
 *
 * It is expressed here in two fields that already exist, and the library was already full of
 * both:
 *
 *  - **Pattern length.** The drums turn over every two bars (`length: 32`) and the hats every
 *    one (`length: 16`). A 32-step variant is a two-bar pattern and five directions already ship
 *    them — `weave` on five roles, `industrial-techno` on four, `hip-hop` on three.
 *  - **Note length.** `HookNote.len` is sustain in sixteenth steps, so a note of `len: 32` sounds
 *    for two whole bars. `bk-hook-sub-1` is two such notes over four bars: one event per two
 *    bars of drums that move every one. **That is the whole of what half-time means here**, and
 *    #142 makes the guide say it in the reader's own words — a note spanning a bar renders as
 *    `held for` rather than `sounds for`, which is the page telling somebody standing at the
 *    machine to leave the note down.
 *
 * The harmony agrees with the hooks rather than restating the drums: `cycleBars` is 4 with the
 * chord moving every 2, which is ordinary across the roster (4, 5, 8 and 16 are all in use).
 *
 * **So there is no finding here and none should be filed.** The one edge that *would* be a
 * finding is a different question, and it is worth naming so the two are not conflated: if a
 * break's snare needed to land somewhere the sixteenth grid cannot place it, that is about
 * *resolution*, not tempo. It did not arise. Every hit below is a sixteenth, and where the feel
 * asks for lateness rather than a different subdivision, that is `swing` and `micro-timing`,
 * which is the section further down.
 *
 * ---------------------------------------------------------------------------
 * §0. Which roles are patterned, which are hooked, and why no role is both
 * ---------------------------------------------------------------------------
 *
 * **No request here has both a hook and band variants**, so #100's contradiction cannot arise
 * and `reArticulatesHook` is not reached for. Three groups:
 *
 *  - **Variants and no hook — `snare`, `kick`, `closed-hat`, `rim`, `ghost-perc`.** The break is
 *    what the reader programs, so the density knob moves all five and phase 5 prints five grids.
 *  - **A hook and no variants — `sub`, `pad`.** Both are held notes with nothing to strike. A
 *    part whose entire rhythmic content is *one event every two bars* has no density curve worth
 *    authoring: four bands of it would be four ways of writing the same sustained note. Phase 5
 *    says *the hook is the pattern*, and phase 7 reports both under *no pattern authored at any
 *    band*, which is literally true. **This is the deliberate other side of `weave`'s `r-sub`**,
 *    which carries `reArticulatesHook: true` because there the variants say where the low note is
 *    struck again. Here it is not struck again. It is held, and that is the direction.
 *  - **Neither.** Nothing. Every request is one of the two above.
 *
 * ---------------------------------------------------------------------------
 * §4.3. The architecture: the snare states the rhythm, the kick is placed around it
 * ---------------------------------------------------------------------------
 *
 * This is the part #307 asked to be tested, so the claims are written down where they can be
 * checked against the grids rather than left as a description.
 *
 * **The snare owns `backbeat`, and it is the only role here that emits the slot.** §4.3's
 * convention reserves `backbeat` for the part that *states* the backbeat, so the `rim` below sits
 * on eighth offbeats and sixteenths and never on beats 2 or 4 — not because a rim cannot play
 * there, but because in this music the snare is already there and the rim is what fills around
 * it.
 *
 * **The snare's two bars differ, and that is the break.** Bar 1 states beats 2 and 4 square
 * (steps 5 and 13). Bar 2 states beat 2 (step 21) and then refuses beat 4: the second hit lands
 * on the *and* of 3 (step 27), which is the displacement the whole idiom turns on. At the busier
 * bands it also takes the *and* of 4 (step 31), so the two bars end differently as well as
 * beginning differently.
 *
 * **The kick states exactly one beat in two bars, and it is step 1.** Steps 9, 17, 25 and 29 are
 * never struck at any band. Everything else the kick plays is an eighth offbeat or a quiet
 * sixteenth. That is the inversion in one sentence: the kick is not holding the pulse down, it is
 * answering the snare, and a reader can verify it by reading down the grid for the four beats it
 * refuses.
 *
 * **Lateness is not authored on the grid.** A break sits behind the beat, and imitating that by
 * nudging a hit a sixteenth right would put a hit on the page at a step nobody plays. `swing` is
 * an existing `MoodAxis` and several boxes carry `micro-timing` articulation, so a rig that can
 * lay back does so through its own documented parameter and a rig that cannot plays it straight
 * and is told so. What the grid can do, and does, is put hits where a swing setting has something
 * to act on: the even sixteenths. Every `ghost` below is on one.
 *
 * **What is missing is a starting value, not a capability — #310.** `Template` has no mood field,
 * so this direction cannot open with `swing` already off centre. The finding lives on #310 and is
 * cited rather than rebuilt here.
 *
 * ---------------------------------------------------------------------------
 * The arrangement is a mute desk, and §4.2 carries it
 * ---------------------------------------------------------------------------
 *
 * **Seven of the eight requests are `transient` and name the sections they play in.** #307 asked
 * for sections that differ by *how much of the break is playing* rather than by parts fading, and
 * that is what §4.2 does: the parts are out, not quiet, and phase 1 prints the mute map as dots
 * against blocks.
 *
 *     snare       ······· ███████████████ ███████████ ······· ███████████ ███████ ·······
 *     kick        ······· ███████████████ ███████████ ███████ ███████████ ███████ ███████
 *     sub         ······· ··············· ███████████ ······· ███████████ ███████ ·······
 *     closed-hat  ███████ ███████████████ ███████████ ······· ███████████ ███████ ███████
 *     rim         ······· ··············· ███████████ ······· ███████████ ███████ ·······
 *     ghost-perc  ······· ███████████████ ███████████ ······· ··········· ······· ·······
 *     ghost-perc  ······· ··············· ··········· ······· ███████████ ███████ ·······
 *     pad         ███████ ███████████████ ███████████ ███████ ███████████ ███████ ███████
 *
 * `Atmosphere` is the chord and a hat. `Drums Alone` is the break arriving without the bass under
 * it. `First Drop` is the bass landing, which is what makes it a drop. **`Kick Alone` is
 * #307's own example** — everything muted but the kick, for eight bars. `Second Drop` brings it
 * all back with the percussion swapped, `Rollout` thins it, and `Outro` is the hat and the kick
 * over the chord.
 *
 * `pad` is the one request that never leaves, because the room the break sits in is the one thing
 * a mute desk is not used on.
 *
 * ## Two `ghost-perc` requests, and the field that made them possible
 *
 * #300 gave `ghost-perc` a second character and #307 called this the first direction that could
 * genuinely use both. It can, but **not by simply asking twice**, and the reason is worth
 * recording because it is not obvious from the request layer:
 *
 * > `selectPattern` (`lib/core/resolver.ts`) keys eligibility on `request.role`, `band` and
 * > `section` — never on the request id. Two requests for one role that overlap in any section
 * > are handed the *same variant* there. Asking twice and authoring once gives the reader two
 * > parts with one identical grid, which is a duplicated instruction rather than a second layer.
 *
 * `Pattern.sections` is the answer and this is the library's first use of it. The two requests
 * take **disjoint** halves of the track — `soft` under the first drop, `dark` under the second —
 * and each set of variants is scoped to the same halves, so in every section exactly one set is
 * eligible and the two parts have genuinely different grids. The percussion changing character
 * at the halfway point is also what makes `Second Drop` louder than `First Drop` at the same
 * band: same energy, different layer.
 *
 * (This is not `Pattern.sections` in the shape `hip-hop` rejected. There it would have scoped
 * *some* of a role's variants away from a section its request still occupies, and §7.3 would
 * report the hole as *"has nothing authored here"*. Here the request does not occupy the sections
 * its variants exclude, so `selectPatterns` never asks for one that is missing — every section
 * either has the whole set or is not visited at all.)
 *
 * ## Turn-taking: one pair can, deliberately, and it is the only one
 *
 * **A `transient` request frees its voice in the sections it does not occupy** (§4.2's occupancy
 * is keyed on `(assignable, section)`), so two requests with disjoint section lists may share a
 * voice. `relay` is built entirely on that and `weave` refuses it outright.
 *
 * This direction takes the answer in one place and only one. Of the seven transient requests,
 * every pair overlaps except `r-ghost-perc-soft` and `r-ghost-perc-dark`, which are disjoint by
 * construction — the first stops before `Second Drop` and the second starts at it. **That is
 * intended.** They are one percussion voice playing two characters in two halves of the piece,
 * and a rig with one spare percussion voice covering both has genuinely covered them rather than
 * passed on a technicality.
 *
 * **Measured rather than asserted, and the measurement is modest.** Swept over 309 rig/seed
 * combinations — all 46 single boxes and a spread of two-box rigs, at seeds 0, 7 and 15. 165 of
 * them fill both requests and **91 of those put the pair on one voice**, so the sharing is real
 * and common. What it *buys* is smaller: on one two-box rig it is the difference between 8 of 8
 * and 7 of 8, at every seed tried, and on the other 308 the same parts are filled either way.
 *
 * **So the permission is worth having because it costs nothing, not because the fit numbers below
 * lean on it** — and stating that honestly is the point of measuring. It is still a step past
 * `hip-hop`, whose five transient requests all overlap at two sections, so its permission was
 * stated and observed on no rig at all.
 *
 * **One trap, recorded because it produced a wrong number here first.** That counterfactual was
 * originally run while `r-ghost-perc-dark` still carried `optional`, and it reported two boxes
 * gaining a part rather than one. The reading was an artefact: §4.4's `optional` takes a request
 * out of the miss objective, so where it does not fit the search stops paying for it and it simply
 * is not counted — the overlapping arrangement looked worse than it was. **Do not measure what an
 * arrangement buys against a request the search has been told it may drop.**
 *
 * Whether the two land on one voice or two where there is room for both is a seed tie-break among
 * equal costs, which is §7.2 working as designed rather than a decision this file makes. Nothing
 * about the fit depends on which way it falls.
 *
 * Everything else overlaps at `Second Drop` and `Rollout`, so no other pair can share. That
 * changes the day any two of these section lists stop overlapping, which is worth knowing before
 * editing one.
 *
 * ## What sharing looks like on the page, said here because the renderer does not say it
 *
 * Where the two land on one voice, the guide prints **two parts with the same role heading on the
 * same voice**, each with its own recipe and its own section list. That is literally true and it is
 * the instruction: the reader dials the quiet sound for the first half and the darker one at the
 * halfway point, on the pad they already have. Nothing in the renderer labels a request apart from
 * its role, because until this direction no template asked for one role twice — so the section
 * list beside each part is what separates them, and a reader skimming two identical headings has
 * to read it. Worth knowing before a second direction does this.
 *
 * ## Why there is no `vox-chop` request
 *
 * A break can be a chopped sample, and `hip-hop` (#308/#311) is the direction that makes the
 * argument about a chopped voice — requested at priority 1, never softened, and a gap where the
 * rig cannot chop. Repeating it here would be a second direction claiming the same identity and
 * would put a sampler in front of every rig that owns a drum machine. **This direction expresses
 * the break as drum roles**, which is the other true way to build one, so a box with six
 * percussion voices and no sampler can finish it. The refusal `acid-lineage` makes about slide is
 * not in tension with that: nothing here is approximated, because nothing here asks for a chop.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid, the slots and the meaning of a band are in `../core/authoring`. Bands run skeletal (0)
 * to busiest (3), and every role with any pattern here has all four.
 *
 * The four two-bar roles are 32 steps; `closed-hat` is 16, because the hat is the one part that
 * is the same in both bars and authoring it twice would be saying so twice. Every section length
 * divides by four bars, so nothing is ever chained short and #105's remainder rule prints nothing.
 */
const PATTERNS: Pattern[] = [
  // ---- snare ---------------------------------------------------------------------------
  // Two bars, and the direction's centre of gravity. `backbeat` appears on no other role here.
  //
  // Band 0 is already the break rather than a plain two-and-four: 5 and 13 state bar 1 square,
  // 21 states beat 2 of bar 2, and 27 is the displacement — the *and* of 3 where beat 4 would
  // be. That is the identity, so it is present at the skeleton and not something density adds.
  // The bands above it grow by ghost sixteenths, which is where a break's performance lives.
  variant('bk-snare-b0', 'snare', 0, 32, on('backbeat', 5, 13, 21), on('offbeat', 27)),
  variant(
    'bk-snare-b1',
    'snare',
    1,
    32,
    on('backbeat', 5, 13, 21),
    on('offbeat', 27, 31),
    at('ghost', 44, 8),
  ),
  variant(
    'bk-snare-b2',
    'snare',
    2,
    32,
    on('backbeat', 5, 13, 21),
    on('offbeat', 27, 31),
    at('ghost', 44, 4, 8, 20, 24),
  ),
  // The accent goes on the first backbeat rather than the last: the break leans on its own
  // opening, and the end of the two bars is where it is falling forward instead.
  variant(
    'bk-snare-b3',
    'snare',
    3,
    32,
    at('accent', 108, 5),
    on('backbeat', 13, 21),
    on('offbeat', 27, 31),
    at('ghost', 42, 2, 4, 8, 12, 20, 24, 26),
  ),

  // ---- kick ----------------------------------------------------------------------------
  // Two bars, and the claim in the header made concrete: step 1 is the only beat the kick ever
  // states. Steps 9, 17, 25 and 29 are absent at every band, so bar 2 never restarts and beat 3
  // is never propped up. Everything else is an eighth offbeat or a quiet sixteenth placed in the
  // gap the snare has just left.
  variant('bk-kick-b0', 'kick', 0, 32, on('downbeat', 1), on('offbeat', 23)),
  variant('bk-kick-b1', 'kick', 1, 32, on('downbeat', 1), on('offbeat', 11, 23, 31)),
  variant(
    'bk-kick-b2',
    'kick',
    2,
    32,
    on('downbeat', 1),
    on('offbeat', 7, 11, 23, 31),
    at('ghost', 46, 20),
  ),
  variant(
    'bk-kick-b3',
    'kick',
    3,
    32,
    at('accent', 110, 1),
    on('offbeat', 7, 11, 15, 23, 31),
    at('ghost', 44, 18, 20, 26),
  ),

  // ---- closed-hat ----------------------------------------------------------------------
  // One bar. Offbeat eighths first, the beat itself only at band 3, and the ghosts sit on the
  // even sixteenths a swing amount displaces. Band 3 is twelve of sixteen steps, which at 170 is
  // the rolling hat this music runs on and is the reason the hat is authored at one bar: it is
  // the one part here that does not care which of the two bars it is in.
  variant('bk-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 11)),
  variant('bk-closed-hat-b1', 'closed-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'bk-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 44, 6, 14),
  ),
  variant(
    'bk-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 40, 2, 6, 10, 14),
  ),

  // ---- rim -----------------------------------------------------------------------------
  // Two bars, and no `backbeat` anywhere: the snare states it, so this part is what happens
  // between. It enters at the ends of bars (15 and 31, the *and* of 4) and works backwards into
  // the bar as the band rises. The one accent is on a sixteenth rather than a beat, because a
  // rim leaning on a beat would be a second backbeat.
  variant('bk-rim-b0', 'rim', 0, 32, on('offbeat', 15, 31)),
  variant('bk-rim-b1', 'rim', 1, 32, on('offbeat', 15, 31), at('ghost', 46, 6, 22)),
  variant(
    'bk-rim-b2',
    'rim',
    2,
    32,
    on('offbeat', 3, 15, 19, 31),
    at('ghost', 46, 6, 22),
  ),
  variant(
    'bk-rim-b3',
    'rim',
    3,
    32,
    on('offbeat', 3, 7, 15, 19, 31),
    at('ghost', 44, 6, 10, 22),
    at('accent', 104, 26),
  ),

  // ---- ghost-perc, first half ----------------------------------------------------------
  // Every hit is a ghost and every hit is on an even sixteenth, at every band: the part exists
  // to make the swing audible, so it lives entirely on the steps a swing amount displaces.
  //
  // `sections` scopes this set to the two sections `r-ghost-perc-soft` occupies, so it is never
  // eligible where the darker set below plays. See the header: without this the two requests
  // would be handed one grid.
  ...([
    ['bk-ghost-perc-soft-b0', 0, [4, 20], 44],
    ['bk-ghost-perc-soft-b1', 1, [4, 12, 20, 28], 44],
    ['bk-ghost-perc-soft-b2', 2, [2, 4, 12, 14, 20, 22, 28, 30], 42],
    ['bk-ghost-perc-soft-b3', 3, [2, 4, 6, 12, 14, 16, 20, 22, 24, 28, 30, 32], 40],
  ] as const).map(([id, band, steps, velocity]) => ({
    ...variant(id, 'ghost-perc', band, 32, at('ghost', velocity, ...steps)),
    sections: ['Drums Alone', 'First Drop'],
  })),

  // ---- ghost-perc, second half ---------------------------------------------------------
  // The same idea a sixteenth across and quieter still: this set takes the *a* of each beat where
  // the first set takes the *e*, so the swap at the halfway point is audible as a change of
  // placement and not only of sound. Scoped to the two sections `r-ghost-perc-dark` occupies.
  ...([
    ['bk-ghost-perc-dark-b0', 0, [8, 24], 42],
    ['bk-ghost-perc-dark-b1', 1, [8, 16, 24, 32], 42],
    ['bk-ghost-perc-dark-b2', 2, [6, 8, 14, 16, 22, 24, 30, 32], 40],
    ['bk-ghost-perc-dark-b3', 3, [2, 6, 8, 10, 14, 16, 18, 22, 24, 26, 30, 32], 38],
  ] as const).map(([id, band, steps, velocity]) => ({
    ...variant(id, 'ghost-perc', band, 32, at('ghost', velocity, ...steps)),
    sections: ['Second Drop', 'Rollout'],
  })),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const breakbeat: Template = {
  id: 'breakbeat',
  name: 'Breakbeat',

  /**
   * 165 to 175, which is #307's own range and the whole of the library's fast end. **The nine
   * directions that existed when #307 was filed topped out at 142** and six of them sat between
   * 118 and 142; `hip-hop` arrived since and went the other way, to 85. So this is not a shade of
   * an occupied band, it is the empty one. Not 140–150, which lands back in the
   * huddle. The default sits at 170: fast enough that the two-bar turnover reads as one gesture
   * rather than two bars, slow enough that band 3's sixteenth hats are still playable by hand.
   */
  bpm: { min: 165, max: 175, default: 170 },

  /**
   * Natural minor, three keys. Every degree the hooks below reach — the third, the fifth, the
   * sixth, the seventh, and the octave above them — is in natural minor in all three, so no key
   * offers a chord it cannot spell.
   */
  keys: ['D minor', 'A minor', 'E minor'],

  /**
   * Seven sections, 120 bars, and the arrangement is a mute desk with one interior collapse.
   *
   * Energies 0.12 / 0.42 / 0.9 / 0.05 / 0.95 / 0.6 / 0.18 land on bands 0 / 1 / 3 / 0 / 3 / 2 / 0
   * at the neutral detent. **The 0 in fourth position is `Kick Alone`**, and it is #307's own
   * description of the idiom: a break that drops to the kick alone and comes back. Unlike
   * `hip-hop`'s interior 0, which is a whole band-0 section played by one part, this one is a
   * band-0 section played by *the kick*, which is a different move on the page — the reader is
   * left holding one voice rather than a thinned mix.
   *
   * The two drops share a band and do not share a heading, because the parts sounding in them
   * differ: `First Drop` has the soft percussion set and `Second Drop` has the dark one. That is
   * the swap doing arrangement work rather than tone work.
   *
   * `Atmosphere` and `Outro` are both band 0 over the chord and the hat, and `Outro` adds the kick —
   * so the outro is the intro with the pulse still in it, which is what a track ending on its
   * break sounds like.
   *
   * Every section is a multiple of eight bars, so the one-, two- and four-bar cycles below all
   * chain whole and #105's remainder rule never fires. Deliberate, and the opposite of
   * `drone-study`: this is loop music and the loop is meant to lock. What stops 120 bars reading
   * as one loop is the muting.
   */
  structure: [
    { name: 'Atmosphere', bars: 8, energy: 0.12 },
    { name: 'Drums Alone', bars: 16, energy: 0.42 },
    { name: 'First Drop', bars: 32, energy: 0.9 },
    { name: 'Kick Alone', bars: 8, energy: 0.05 },
    { name: 'Second Drop', bars: 32, energy: 0.95 },
    { name: 'Rollout', bars: 16, energy: 0.6 },
    { name: 'Outro', bars: 8, energy: 0.18 },
  ],

  /**
   * §4.1. **A four-bar cycle whose chord moves every two bars, which is the harmonic half of the
   * feel.** The drums turn over every one or two bars; the chord turns over every two. That is
   * the same statement as the held bass note, made in the other field, and it is why neither of
   * them needs a second clock to mean what it means.
   *
   * `i` to `VI` and back is the plainest minor movement there is, and that is the point: in this
   * music the interest is in the drums, so a progression that asked to be followed would be
   * competing with the part the reader is actually programming.
   */
  harmony: {
    cycleBars: 4,
    progression: [
      { degree: 'i', bars: 2 },
      { degree: 'VI', bars: 2 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Two hooks each for the two roles that carry pitch, and in
   * both places the pair are different pieces rather than variations on one.
   *
   * Neither role has band variants, so these are the pattern (#100). See §0 in the header.
   */
  hooks: [
    {
      /**
       * **The half-time claim, stated in one field.** Two notes over four bars, each `len: 32`,
       * so each sounds for two whole bars against drums that turn over every one. #142 renders
       * both as `held for 32 steps (2 bars)`, which is the instruction a reader needs standing at
       * the machine: put the note down and leave it.
       *
       * Roots only — 1 over `i` and 6 over `VI`. `baseOctave` 1 puts the tonic two octaves under
       * middle C, which is where this belongs.
       */
      id: 'bk-hook-sub-1',
      forRole: 'sub',
      bars: 4,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 32 },
        { step: 33, degree: 6, octave: 0, len: 32 },
      ],
    },
    {
      /**
       * The same two bars of sustain with a lift out of each one: the root is held for twenty-six
       * steps and then gives up the last beat and a half to a short note, which walks into the
       * next chord instead of arriving on it. Still one long note per two bars — a hooked bass
       * that moved every bar would be a different piece of music, not a busier version of this
       * one — but the part now has an event in the bar the other hook leaves empty, so a reroll
       * changes whether the low end is a wall or a line.
       */
      id: 'bk-hook-sub-2',
      forRole: 'sub',
      bars: 4,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 26 },
        { step: 27, degree: 5, octave: 0, len: 6 },
        { step: 33, degree: 6, octave: 0, len: 26 },
        { step: 59, degree: 3, octave: 0, len: 6 },
      ],
    },
    {
      /**
       * The chord stated with the bar and held right through it: a triad on `i` for two bars, then
       * `VI` voiced above it — degrees 6, 8 and 10, which is the same triad read from its own
       * root. `baseOctave` 3 puts the bottom of the voicing just under middle C, two octaves clear
       * of the bass.
       */
      id: 'bk-hook-pad-1',
      forRole: 'pad',
      bars: 4,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 32 },
        { step: 1, degree: 3, octave: 0, len: 32 },
        { step: 1, degree: 5, octave: 0, len: 32 },
        { step: 33, degree: 6, octave: 0, len: 32 },
        { step: 33, degree: 8, octave: 0, len: 32 },
        { step: 33, degree: 10, octave: 0, len: 32 },
      ],
    },
    {
      /**
       * The other reading: the chord arrives a beat late and in inversion, so the downbeat of each
       * two-bar span belongs to the drums alone. First inversion on `i` (third at the bottom) and
       * first inversion on `VI` (degrees 8, 10, 13), which keeps the two voicings a step apart
       * instead of a sixth and makes the change something the ear follows rather than notices.
       */
      id: 'bk-hook-pad-2',
      forRole: 'pad',
      bars: 4,
      baseOctave: 3,
      notes: [
        { step: 5, degree: 3, octave: 0, len: 28 },
        { step: 5, degree: 5, octave: 0, len: 28 },
        { step: 5, degree: 8, octave: 0, len: 28 },
        { step: 37, degree: 8, octave: 0, len: 28 },
        { step: 37, degree: 10, octave: 0, len: 28 },
        { step: 37, degree: 13, octave: 0, len: 28 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Eight requests, seven of them `transient` — the mute map in the
   * header is carried here, and each section list is annotated with what taking the part away is
   * for.
   *
   * **One is declared inessential, nothing is `optional`, and that is a claim rather than an
   * oversight.** It is the fewest of any direction here asking for eight parts: `hip-hop` and
   * `generative-drift` declare four of eight, `weave` and `lydian-house` three. Those are right
   * about what they describe — a kit is the clearest case there is of a thing still itself with
   * fewer voices in it. A break is not. Take the snare, the kick, the hats, the rim, the bass or
   * either percussion layer out of this and what is left is not a sparser version of the
   * direction, it is a different one. The one that goes is the chord, and its reason says what
   * covers the absence.
   *
   * A second was declared and withdrawn, and `r-ghost-perc-dark` below records why — the reason
   * given for it was false on this direction's own section lists, which is a mistake §4.2 makes
   * easy and worth reading before declaring a `transient` request inessential.
   */
  roles: [
    /**
     * **The direction, at the priority that says so.** Alone at 1, not `optional`, not
     * `inessential`: everything else here is placed against this part, so a rig that fills every
     * request but this one has not made a near miss, it has made a different track.
     *
     * `dirty`, and the reason is the sound rather than the recipe count. A break's snare is a
     * sampled hit with its room, its noise floor and its transfer still on it; the artefacts are
     * the sound, and asking for `hard` would be asking for a clean strike. §3.5 puts `dirty`
     * within 2 of `hard` and `bright`, which between them are the rest of the role, so the whole
     * of `snare` is reachable from here — but reaching it is not the case for this direction and
     * `hip-hop` got there first (see the header).
     */
    /* Out of `Atmosphere`, `Kick Alone` and `Outro`: the break arrives with the snare and the
     * collapse is the snare going. */
    {
      id: 'r-snare',
      role: 'snare',
      priority: 1,
      character: 'dirty',
      sustain: 'transient',
      sections: ['Drums Alone', 'First Drop', 'Second Drop', 'Rollout'],
    },

    /**
     * `hard`, which is the one place this direction narrows the field on purpose. A break's kick
     * is a short, dry thump with no tail — the tail is the bass's job here, and the two parts are
     * separated by an octave and a half. §3.5 refuses `soft` at squared distance 4, so the two
     * `soft` kicks in the library report `no-recipe` on this direction and the other sixty-one
     * are reachable: `hard` exactly, `dirty` and `dark` at distance 2. That is the cost, it is two
     * recipes, and it is worth it rather than asking for `dark` and getting a round kick under a
     * break.
     */
    /* Everything but `Atmosphere`. The kick is the part `Kick Alone` is named for and the last
     * thing left in `Outro`, so it has the widest map here. */
    {
      id: 'r-kick',
      role: 'kick',
      priority: 2,
      character: 'hard',
      sustain: 'transient',
      sections: ['Drums Alone', 'First Drop', 'Kick Alone', 'Second Drop', 'Rollout', 'Outro'],
    },

    /**
     * The held low note, and the half of the half-time feel that is not the drums. `dark` is
     * exact on thirty-eight boxes and within 2 of every other character the role authors, so the
     * whole of `sub` is reachable. The hooks above are what it plays; there are no variants, and
     * §0 in the header says why.
     */
    /* The drop is this part arriving. It is out of `Drums Alone` deliberately — the break plays for
     * sixteen bars with nothing under it, which is what makes `First Drop` a drop rather than
     * another section. */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 2,
      character: 'dark',
      sustain: 'transient',
      sections: ['First Drop', 'Second Drop', 'Rollout'],
    },

    /**
     * `clean` — a tight, dry hat rather than a bright ticking one, and the best-served character
     * the role has at seventeen exact. Everything else in `closed-hat` is within 2, so the role is
     * fully reachable.
     */
    /* The widest map in the direction: everything but `Kick Alone`. The hat runs under the
     * intro before the break exists and is still there in the outro, which is what makes the
     * kick-alone section read as a hole punched in something continuous. */
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 3,
      character: 'clean',
      sustain: 'transient',
      sections: ['Atmosphere', 'Drums Alone', 'First Drop', 'Second Drop', 'Rollout', 'Outro'],
    },

    /**
     * §4.4/#307. **Not garnish here, and not inessential.** In every other direction that asks for
     * it the rim is a detail on top of a finished groove; in this one it is the part that fills
     * the space the kick vacated, so a break without it has a hole in the middle rather than less
     * decoration on top. `clean` is exact on nineteen boxes and the one `bright` rim is within 2,
     * so the whole role is reachable.
     */
    /* Scoped with the bass: the rim arrives when the track is full and leaves when it empties. */
    {
      id: 'r-rim',
      role: 'rim',
      priority: 3,
      character: 'clean',
      sustain: 'transient',
      sections: ['First Drop', 'Second Drop', 'Rollout'],
    },

    /**
     * The quiet sixteenths between the loud hits, in the first half of the track. `soft` is exact
     * on twenty-four boxes and within 2 of the three `dark` ones, so the role is fully reachable
     * from here as it is from its pair below.
     *
     * **Disjoint from `r-ghost-perc-dark` by construction**, which is the one place this direction
     * allows §4.2 turn-taking. The header says why, and says that the variants are scoped to match
     * so the two parts are not handed one grid.
     */
    {
      id: 'r-ghost-perc-soft',
      role: 'ghost-perc',
      priority: 4,
      character: 'soft',
      sustain: 'transient',
      sections: ['Drums Alone', 'First Drop'],
    },

    /**
     * The same job in the second half, with the darker sound #300 authored and a placement a
     * sixteenth across. `dark` is exact on three boxes and within 2 of the twenty-four `soft`
     * ones, so asking for it costs no reachability and buys the exact recipes where they exist.
     *
     * **Neither `optional` nor `inessential`, and the reason it briefly was both is worth keeping
     * because it was wrong in a way that is easy to repeat.** It was first authored as the layer a
     * full rig adds and an empty one does without, on the reason that *the second half can keep
     * the first half's shaker*. That reason is false on this direction's own section lists: the
     * pair is **disjoint**, so `r-ghost-perc-soft` is not playing in `Second Drop` or `Rollout` and
     * there is no shaker there to keep. Dropping this request does not thin the second half, it
     * takes the quiet percussion out of it entirely — which is the same structural loss the
     * `rim` above refuses to be declared for.
     *
     * **A part scoped to sections nothing else covers cannot be inessential on the grounds that
     * something else covers it.** That is the general shape of the mistake, and it is a hazard
     * §4.2 introduces: a `transient` request's absence is read against the sections it occupies,
     * not against the piece.
     */
    {
      id: 'r-ghost-perc-dark',
      role: 'ghost-perc',
      priority: 5,
      character: 'dark',
      sustain: 'transient',
      sections: ['Second Drop', 'Rollout'],
    },

    /**
     * The room the break sits in: a held chord, continuous, and the only request that plays in
     * every section. `soft` is exact on twenty-eight boxes. Three notes rather than four, because
     * a triad is what the voicings above ask for and demanding a fourth would cut off boxes that
     * can play the part as written.
     *
     * Unpatterned on purpose — `pad` is a held role by §4.2's own list, so an empty grid here is
     * not a hole. `inessential` because a break with no chord under it is a completely ordinary
     * record, and a rig with nothing left for it is not short of anything.
     */
    {
      id: 'r-pad',
      role: 'pad',
      priority: 5,
      character: 'soft',
      sustain: 'continuous',
      polyphony: 3,
      inessential: { reason: 'the drums are the whole piece; what sits under them is furniture' },
    },
  ],

  patterns: PATTERNS,
}
