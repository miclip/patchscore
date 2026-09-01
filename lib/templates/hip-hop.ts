import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Hip-Hop (§4). **The direction where the part that identifies the music is a sample, and a rig
 * that cannot chop one does not get an approximation of it.**
 *
 * #308 filed this against a hole that is not a tempo band but a *kind of music inside an occupied
 * one*: below 108 the library held a drone study and a generative piece, both of them texture
 * rather than a rhythm, so there was no beat-driven direction at the bottom of the range at all.
 * The catalogue was already built for it — nineteen samplers and grooveboxes, seventeen devices
 * declaring `vox-chop`, three of one family of them with nothing to do that suited the family.
 *
 * The direction in one line: 85 to 100, one chord that never moves, a chopped voice on top of it,
 * drums that swing and sit late, and an arrangement made entirely by pulling parts back and
 * pushing them forward again.
 *
 * **Nothing here names a device** (invariant 3). The idiom descends from one family of samplers
 * the way `acid-lineage`'s descends from one silver box, and every sentence below that wants to
 * name the machine says `vox-chop` instead.
 *
 * ---------------------------------------------------------------------------
 * `vox-chop` is requested, meant, and not softened — which is the whole point
 * ---------------------------------------------------------------------------
 *
 * **`r-vox-chop` is the only request at priority 1, it is not `optional`, and it is not
 * `inessential`.** Each of those three is a separate decision and each was available as a way to
 * make the report read more kindly. All three were refused, and the reasons are different:
 *
 *  - **Not `optional`.** §4.4's `optional` removes a request from the miss objective entirely, so
 *    the search stops spending a voice on it. That is the opposite of what this direction wants.
 *    A rig with a spare voice should spend it here before it spends it anywhere else.
 *  - **Alone at priority 1**, because §4.4 makes one miss at 1 worse than any number at 2. This is
 *    `acid-lineage`'s lesson repeated rather than rediscovered: with the kick at 1 as well, a
 *    one-voice box resolved to a kick and reported the direction's own identity as a gap, decided
 *    by a seed tie-break between two equal costs. The kick is at 2 here for that reason.
 *  - **Not `inessential`.** The honest question §4.4 asks is whether the direction is still
 *    *itself* without the part. Ambient Dub can say yes about a shaker because dub is mostly
 *    space. This direction cannot say yes about a chopped voice: what is left is a slow beat with
 *    a chord on it, which is a different and thinner thing. Declaring it inessential would make
 *    the guide read better and say something false.
 *
 * **So a rig that cannot chop gets a gap, and the gap is the answer rather than a failure to
 * answer.** Two different absences, and the guide distinguishes them because the reader's next
 * action differs:
 *
 *  - **`no-capable-voice`** — a rig of monosynths and a drum machine, where nothing can hold a
 *    chopped sample at all. That is a fact about the boxes and it goes under `### Gaps`.
 *  - **`no-recipe`** — a box that could carry the part but has no recipe this request can use.
 *    That is our authoring backlog and it goes under `### Waiting on us`.
 *
 * **Owning a sampler is not the same as the request being fillable, and the second bullet is why.**
 * Seventeen devices author a `vox-chop` recipe; of those, thirteen carry one this request can use
 * — four `clean` exactly and nine `bright` by a distance-2 substitution — and four author only
 * `dirty`, which §3.5 refuses. A sampler with capable voices and no `vox-chop` recipe at all lands
 * in the same place. So "any sampler fills it" is false in both directions, and the honest claim is
 * narrower: any sampler *can* carry the part, and whether the guide has a recipe for it is a
 * separate question the reader is told the answer to.
 *
 * Both absences are invariant 5 working. The thing this file must never do is manufacture an
 * alternative — no second request for a tonal role standing in for the chop, and no character
 * chosen to widen candidacy.
 *
 * **`clean`, and it is the character the library actually authors.** Four `vox-chop: clean`
 * recipes exist and no direction asked for one until this file, which is half of why #308 was
 * filed. It is also a real choice with a real cost, recorded here rather than discovered later:
 * §3.5 refuses a substitution at squared distance 4, and `clean` to `dirty` is exactly that, so
 * the four boxes whose only `vox-chop` recipe is `dirty` report `no-recipe` on this direction —
 * an authoring backlog item under `### Waiting on us`, which is the true statement about them.
 * The nine `bright` recipes substitute at distance 2 and play. Asking for `dirty` instead does not
 * avoid the cost, it moves it: `dirty` would reach its own six recipes exactly and put the three
 * boxes whose only chop is `clean` into the same backlog, leaving the `clean` family unreachable
 * again — which is the state #308 exists to end.
 *
 * ---------------------------------------------------------------------------
 * The swing is real and it is not in this file
 * ---------------------------------------------------------------------------
 *
 * Everything below is authored on the grid, because the grid is the only thing this layer has.
 * **Being late is a device fact and a mood fact, not a template one**: `swing` is an existing
 * `MoodAxis` and several boxes carry `micro-timing` articulation, so a rig that can lay back does
 * so through its own documented parameter and a rig that cannot plays it straight. Nudging a
 * snare a sixteenth to the right to *imitate* lateness would put a hit on the page at a step
 * nobody plays, which is the same invention `acid-lineage` refuses when it declines to fake a
 * slide on a box that has none.
 *
 * What the grid *can* do, and does throughout, is put hits where a swing setting has something to
 * act on. A swing amount delays the second sixteenth of each pair, so the even steps — the `a` of
 * every beat — are the ones that move. Band 3 of `closed-hat` fills all four of them, `ghost-perc`
 * is nothing but even steps at every band, and the kick and snare take their syncopations off the
 * even sixteenths rather than off the eighths. Turn `swing` up and those are the hits that shift;
 * turn it down and the same variants read as a straight programme.
 *
 * ---------------------------------------------------------------------------
 * One chord, and a top that is a sample rather than a line
 * ---------------------------------------------------------------------------
 *
 * The harmony is `i` for the whole piece over a four-bar cycle. `drone-study` is the precedent for
 * a direction whose harmony is deliberately still and #283 settled that manufacturing a
 * progression to look like the others is the wrong instinct. `acid-lineage` reaches the same
 * shape from a different argument — there the movement is timbral, so a chord sequence would be a
 * progression nothing is playing. Here it is simpler still: the top is a sample, and a chord
 * change underneath a phrase that does not change with it is a change the reader would have to
 * play against.
 *
 * ---------------------------------------------------------------------------
 * §0. Which roles are patterned, which are hooked, and why no role is both
 * ---------------------------------------------------------------------------
 *
 * **No request in this direction has both a hook and band variants, so the contradiction #100 is
 * about cannot arise here.** That is a decision, not an accident, and each of the three groups
 * below is decided on what the part actually is:
 *
 *  - **Variants and no hook — `vox-chop`, `kick`, `snare`, `closed-hat`, `ghost-perc`.** These
 *    five are what the reader programs, so the density knob moves all five and phase 5 prints
 *    five grids. `vox-chop` is in this group deliberately: the pitches of a chopped phrase belong
 *    to whatever was sampled, and authoring degrees for them would be inventing a melody for
 *    audio this file has never heard. Where the slices land is ours to state; what they say is
 *    not. That is the opposite reading from `major-key-electro`, which hooks its `vox-chop`
 *    because there the chop is a written figure, and both readings are legitimate for the role.
 *  - **A hook and no variants — `stab`, `sub`.** Both are figures with a rhythm of their own, so
 *    #100's rule is the right one and phase 5 says *the hook is the pattern*. A chord loop does
 *    not get busier when the knob turns, because it is a loop; an eight-oh-eight line is a melody
 *    with its own placement. Phase 7 reports both under *no pattern authored at any band*, which
 *    is literally true and is the honest half of this arrangement: in this music the sampled
 *    parts are loops and the drums are the part you program.
 *  - **Neither — `texture`.** The crackle under everything is a bed. Four bands of invented
 *    sixteenths for it would be the guide lying about what the part does, which is `ambient-dub`'s
 *    reasoning for declining to pattern its own `texture`, `pad` and `sweep`.
 *
 * ---------------------------------------------------------------------------
 * The arrangement is the mute map, and §4.2 is where it lives
 * ---------------------------------------------------------------------------
 *
 * **Five of the eight requests are `transient` and name the sections they play in.** That is the
 * arrangement: the parts do not get quieter in the drop-out, they are *out* of it, and phase 1's
 * grid prints the mute map as dots against blocks.
 *
 *     vox-chop   ████ ███████████ █████████ ███████████ ██████████████ ███████ █████████
 *     kick       ···· ███████████ █████████ ··········· ██████████████ ███████ ·········
 *     snare      ···· ███████████ █████████ ··········· ██████████████ ······· ·········
 *     closed-hat ···· ███████████ █████████ ··········· ██████████████ ███████ █████████
 *     sub        ···· ███████████ █████████ ··········· ██████████████ ███████ ·········
 *     stab       ████ ███████████ █████████ ███████████ ██████████████ ███████ █████████
 *     ghost-perc ···· ··········· █████████ ··········· ██████████████ ······· ·········
 *     texture    ████ ███████████ █████████ ███████████ ██████████████ ███████ █████████
 *
 * `Bare` is the loop and the chord with nothing under them; the beat arrives in `Drums Under`; the
 * shaker waits for `Whole`; `Pulled Back` takes the drums away again; `Thinned` loses the snare
 * and keeps the kick; `Last Turn` is the hats over the loop and nothing else. Every one of those
 * is a fader, and none of them is a part getting sparser.
 *
 * The three that stay `continuous` are the three that never leave: the chop this direction is
 * named for, the chord under it, and the crackle under everything.
 *
 * **This was authored the wrong way round first, and the wrong way is worth recording.** The band
 * curve alone was used to express the drop-out — `Pulled Back` at energy 0.05 landing on band 0 —
 * on the reasoning that §4.2's transient requests are how a part *arrives* and this idiom mutes
 * rather than introduces. That reasoning was backwards. A part absent from one section is a
 * `transient` request naming the other six, and `Industrial Techno`'s `riser` and `impact` are the
 * worked examples. The band curve makes a part *skeletal*; only this makes it *silent*, and the
 * difference is the whole arrangement. (`Pattern.sections` was the other candidate and stays
 * rejected: §7.3 reports a variant-less section as *"has nothing authored here"*, which is a hole
 * in our authoring rather than an instruction to the reader.)
 *
 * ## What it costs, said plainly because it is a trade
 *
 * **A `transient` request frees its voice in the sections it does not occupy, so a smaller rig may
 * carry two such parts on one voice by taking turns** (§4.2's occupancy is keyed on
 * `(assignable, section)`). That is a real choice and the library has both answers to it: `relay`
 * is built entirely on turn-taking, and `weave` refuses it — `simultaneous-directions.test.ts`
 * asserts every `weave` request is continuous precisely so a small rig cannot pass by taking
 * turns.
 *
 * **This direction is the `relay` kind, deliberately.** An arrangement that *is* muting has no
 * business claiming a voice through a section where the part is silent, and a rig that can cover
 * these parts by sharing has genuinely covered them.
 *
 * **What it does not do, measured rather than assumed:** no rig in the library actually shares a
 * voice between two of these requests. Every transient request here occupies both `Whole` and
 * `Back Harder`, so no two of the five are disjoint and none can pair — swept over all 46 single
 * boxes and a spread of two-box rigs at three seeds, 214 rigs in all, and turn-taking was observed
 * on none. So the permission is stated and the fit numbers below owe nothing to it. That changes
 * the day any two of these section lists stop overlapping, which is worth knowing before editing
 * one.
 *
 * ## Phase 7 groups `Bare` with `Pulled Back`, and that is the point rather than a collision
 *
 * Both are band 0 with the same single patterned part sounding, so `bandTrajectory` gives them one
 * heading: *build one and copy it*. **A drop-out is a return to what the opening played** — that
 * is what the move is — and the shared heading is that fact, not two sections colliding. At the
 * machine it is the difference between programming two patterns and copying one. `Thinned` and
 * `Last Turn` take headings of their own with a `differs on` note, because the snare and the hats
 * respectively are what make them not their neighbours.
 *
 * ---------------------------------------------------------------------------
 * The swing control exists, is wired, and this direction expects it up
 * ---------------------------------------------------------------------------
 *
 * The section above says the grid cannot carry lateness. This one says where it does live, because
 * the difference decides whether the reader has to do anything.
 *
 * **The control is real and it is wired.** A shuffle parameter on a sampler in this library
 * declares `mood: [{ axis: 'swing', amount: 50 }]`, on a control whose own scale runs symmetrically
 * either side of straight — a large amount, not a token one. So a reader who moves the knob gets
 * the feel this direction is about, and a box with no such parameter declines the axis by §6.1 and
 * plays it straight, which the guide reports rather than approximates.
 *
 * **What is missing is a starting value, not a capability — #310.** `Template` has no mood field,
 * so a direction cannot state the mood it wants and cannot open with swing already up. A reader who
 * never touches the control gets a straight programme on a box that would lay back if asked.
 * **This direction expects it up**, and #310 is where the finding lives, so a reader who hits a
 * straight programme has a number to follow rather than a paragraph.
 *
 * **It is not #285, and conflating the two is the mistake this sentence exists to prevent.** #285
 * was a direction unable to vary a parameter *across sections*, and it was closed on the finding
 * that scheduling a filter arc models a different instrument — the arc belonged in the reader's
 * hand. #310 is a direction unable to state an opening value *at all*, which is not a gesture
 * anybody is performing and not something a section boundary would fix. One is about movement, the
 * other about where the knob starts.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid, the slots and the meaning of a band are in `../core/authoring`. Bands run skeletal (0)
 * to busiest (3), and every role with any pattern here has all four.
 *
 * The four drum roles and the chop are 32 or 16 steps; nothing is four bars, because a two-bar
 * turnover is what this music loops on. Every section length below divides by four, so nothing is
 * ever chained short and #105's remainder rule prints nothing.
 */
const PATTERNS: Pattern[] = [
  // ---- vox-chop -----------------------------------------------------------------------
  // Two bars, and the identity of the direction. Read as *where the slices fall*, never as what
  // they say: the phrase is the reader's, and this is the grid it is cut onto.
  //
  // The growth is syncopation rather than volume. Band 0 is one slice a bar, landing square;
  // by band 3 there are eleven in two bars and only four of them are on a beat, which is the
  // difference between a sample dropped in and a sample played.
  variant('hip-vox-chop-b0', 'vox-chop', 0, 32, on('downbeat', 1, 17)),
  variant('hip-vox-chop-b1', 'vox-chop', 1, 32, on('downbeat', 1, 17), on('offbeat', 7, 23)),
  variant(
    'hip-vox-chop-b2',
    'vox-chop',
    2,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 11, 23),
    at('ghost', 52, 14, 30),
  ),
  variant(
    'hip-vox-chop-b3',
    'vox-chop',
    3,
    32,
    at('accent', 112, 1),
    on('downbeat', 9, 17, 25),
    on('offbeat', 7, 11, 23),
    at('ghost', 48, 4, 14, 20, 30),
  ),

  // ---- kick ---------------------------------------------------------------------------
  // Two bars, because the second bar differing from the first is the idiom. Band 1 is the figure
  // this music is built on — the downbeat and the eighth after beat 3 — and the bands above it
  // grow by adding sixteenths off the beat rather than by filling the pulse in.
  variant('hip-kick-b0', 'kick', 0, 32, on('downbeat', 1, 17)),
  variant('hip-kick-b1', 'kick', 1, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  variant(
    'hip-kick-b2',
    'kick',
    2,
    32,
    on('downbeat', 1, 9, 17),
    on('offbeat', 11, 27),
    at('ghost', 50, 24),
  ),
  variant(
    'hip-kick-b3',
    'kick',
    3,
    32,
    at('accent', 112, 1),
    on('downbeat', 9, 17),
    on('offbeat', 11, 15, 27),
    at('ghost', 48, 8, 24),
  ),

  // ---- snare --------------------------------------------------------------------------
  // Two bars. The backbeat slot belongs to whatever *states* the backbeat, which here is this and
  // nothing else. Band 0 states beat 4 alone; band 1 is the full two-and-four; everything above
  // is ghost sixteenths around it, which is the part of this drum sound that is a performance.
  variant('hip-snare-b0', 'snare', 0, 32, on('backbeat', 13, 29)),
  variant('hip-snare-b1', 'snare', 1, 32, on('backbeat', 5, 13, 21, 29)),
  variant(
    'hip-snare-b2',
    'snare',
    2,
    32,
    on('backbeat', 5, 13, 21, 29),
    at('ghost', 44, 12, 20, 32),
  ),
  // Band 3 is the only variant in the direction that emits `fill`, and it is here rather than on
  // a tom or a hat because this is where the idiom puts it: the last backbeat leaned on, and a
  // sixteenth run off it into the top of the loop. Four boxes author a `fill` articulation on
  // their `dirty` snare, and until this variant existed no direction emitted the slot for that
  // character — `test/reachability.test.ts` found all four the moment `r-snare` was added.
  variant(
    'hip-snare-b3',
    'snare',
    3,
    32,
    at('ghost', 42, 4, 12, 16, 20),
    on('backbeat', 5, 13, 21),
    at('accent', 108, 29),
    on('fill', 30, 31, 32),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // One bar. Offbeat eighths first, the beat itself only at band 2, and at band 3 all four `a`
  // sixteenths — the steps a swing amount actually moves. Band 3 with `swing` up is the whole
  // feel of this direction in one line of the grid.
  variant('hip-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 11)),
  variant('hip-closed-hat-b1', 'closed-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'hip-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
  ),
  variant(
    'hip-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 40, 4, 8, 12, 16),
  ),

  // ---- ghost-perc ---------------------------------------------------------------------
  // Every hit is a ghost and every hit is on an even sixteenth, at every band. That is the part:
  // it exists to make the swing audible, so it lives entirely on the steps swing displaces and
  // never asks to be listened to. No accent anywhere, for the same reason.
  variant('hip-ghost-perc-b0', 'ghost-perc', 0, 16, at('ghost', 44, 4)),
  variant('hip-ghost-perc-b1', 'ghost-perc', 1, 16, at('ghost', 44, 4, 12)),
  variant('hip-ghost-perc-b2', 'ghost-perc', 2, 16, at('ghost', 42, 4, 8, 12, 16)),
  variant(
    'hip-ghost-perc-b3',
    'ghost-perc',
    3,
    16,
    at('ghost', 40, 2, 4, 6, 8, 10, 12, 14, 16),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const hipHop: Template = {
  id: 'hip-hop',
  name: 'Hip-Hop',

  /**
   * 85 to 100, which is #308's own range and the beat-driven bottom of the library. Not 100 to
   * 110, which runs into `ambient-dub`, and not 80, which stops being a head-nod and starts being
   * a half-time reading of something else. The default sits at 90: fast enough that the ghost
   * sixteenths are still separate events, slow enough that a swing setting has room to be heard
   * as lateness rather than as a different subdivision.
   */
  bpm: { min: 85, max: 100, default: 90 },

  /**
   * Natural minor, three keys, and nothing that needs justifying. Every degree either hook below
   * reaches — the flat seventh, the minor third, the fifth, the ninth — is in natural minor in all
   * three, which is the same test `acid-lineage`'s keys pass.
   */
  keys: ['F minor', 'C minor', 'G minor'],

  /**
   * Seven sections, 92 bars, **and the arrangement is a mute desk rather than a build**.
   *
   * Energies 0.1 / 0.35 / 0.62 / 0.05 / 0.88 / 0.3 / 0.15 land on bands 0 / 1 / 2 / 0 / 3 / 1 / 0
   * at the neutral detent. **The 0 in fourth position is the direction**, and no other structure in
   * the library has an interior 0 at all: every one of them climbs to its peak and comes home.
   * This one gets most of the way up, empties out for eight bars, and only then plays its busiest
   * section.
   *
   * The band is only half of it. What is actually silent in each section is the mute map in the
   * header, carried by §4.2 on the requests; the band says how busy whatever is left plays. `Bare`
   * and `Pulled Back` come out identical on both counts — one patterned part, band 0 — so phase 7
   * gives them one heading, and that is right rather than a collision to design around: dropping
   * out means going back to what the opening played. What makes it a drop-out and not an
   * introduction is where it sits, after `Whole` and before the loudest section in the piece.
   *
   * The names are the state of the mix and the guide now backs every one of them: `Bare` really is
   * the loop and the chord alone, `Drums Under` is where the beat arrives, and `Pulled Back` has
   * the drums out rather than merely quiet. That is what the transient requests bought.
   *
   * Every section is a multiple of four bars, so the one-, two- and four-bar cycles below all
   * chain whole and #105's remainder rule never fires. That is deliberate and it is the opposite
   * of `drone-study`'s out-of-phase boundaries: this is loop music, the loop is meant to be
   * locked, and what stops 92 bars reading as one loop is the muting rather than the arithmetic.
   */
  structure: [
    { name: 'Bare', bars: 8, energy: 0.1 },
    { name: 'Drums Under', bars: 16, energy: 0.35 },
    { name: 'Whole', bars: 16, energy: 0.62 },
    { name: 'Pulled Back', bars: 8, energy: 0.05 },
    { name: 'Back Harder', bars: 24, energy: 0.88 },
    { name: 'Thinned', bars: 12, energy: 0.3 },
    { name: 'Last Turn', bars: 8, energy: 0.15 },
  ],

  /**
   * §4.1. **One chord, and the header says why at length.** Four bars is not a cycle of changes;
   * it is how often the guide restates the one centre everything sits on. The `stab` hooks are
   * four bars and turn over with it exactly; the `sub` hooks are two and turn over twice inside
   * it, which is the only motion a still harmony has.
   */
  harmony: {
    cycleBars: 4,
    progression: [{ degree: 'i', bars: 4 }],
  },

  /**
   * §4.1. Authored, never generated. Two hooks each for the two roles that carry pitch, so the
   * seed has a real choice to make in both places, and in both places the pair **disagree rather
   * than decorate**: one of each pushes off the beat and the other lands on it.
   *
   * Neither role has band variants, so these are the pattern (#100). See §0 in the header.
   */
  hooks: [
    {
      /**
       * The pushed chord. Every voicing lands off the beat, and the second bar is empty — a
       * chord loop that restates itself every bar is a chord loop with the space taken out.
       * `baseOctave` 3 puts the voicing just under middle C, which is where this part sits.
       */
      id: 'hip-hook-stab-1',
      forRole: 'stab',
      bars: 4,
      baseOctave: 3,
      notes: [
        { step: 3, degree: 1, octave: 0, len: 5 },
        { step: 3, degree: 3, octave: 0, len: 5 },
        { step: 3, degree: 5, octave: 0, len: 5 },
        { step: 3, degree: 7, octave: 0, len: 5 },
        { step: 12, degree: 1, octave: 0, len: 3 },
        { step: 12, degree: 3, octave: 0, len: 3 },
        { step: 12, degree: 5, octave: 0, len: 3 },
        { step: 12, degree: 7, octave: 0, len: 3 },
        // Rootless, with the ninth on top: the tonic is already in the low part, and leaving it
        // out here is what stops four bars of one chord sounding like four bars of one chord.
        { step: 35, degree: 3, octave: 0, len: 5 },
        { step: 35, degree: 5, octave: 0, len: 5 },
        { step: 35, degree: 7, octave: 0, len: 5 },
        { step: 35, degree: 2, octave: 1, len: 5 },
        { step: 55, degree: 1, octave: 0, len: 8 },
        { step: 55, degree: 3, octave: 0, len: 8 },
        { step: 55, degree: 5, octave: 0, len: 8 },
        { step: 55, degree: 7, octave: 0, len: 8 },
      ],
    },
    {
      /**
       * The square reading of the same four bars: it lands on the beat and states the chord in
       * every other bar, so a reroll changes whether the part is dragging behind the drums or
       * sitting inside them.
       */
      id: 'hip-hook-stab-2',
      forRole: 'stab',
      bars: 4,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 1, degree: 3, octave: 0, len: 6 },
        { step: 1, degree: 5, octave: 0, len: 6 },
        { step: 1, degree: 7, octave: 0, len: 6 },
        { step: 25, degree: 1, octave: 0, len: 4 },
        { step: 25, degree: 3, octave: 0, len: 4 },
        { step: 25, degree: 5, octave: 0, len: 4 },
        { step: 25, degree: 7, octave: 0, len: 4 },
        { step: 33, degree: 3, octave: 0, len: 6 },
        { step: 33, degree: 5, octave: 0, len: 6 },
        { step: 33, degree: 7, octave: 0, len: 6 },
        { step: 33, degree: 2, octave: 1, len: 6 },
        { step: 59, degree: 1, octave: 0, len: 6 },
        { step: 59, degree: 3, octave: 0, len: 6 },
        { step: 59, degree: 5, octave: 0, len: 6 },
        { step: 59, degree: 7, octave: 0, len: 6 },
      ],
    },
    {
      /**
       * The low part as a figure: a long tonic under the first bar, then three short notes
       * walking down through the flat seventh into the fifth in the second. `baseOctave` 1 puts
       * the tonic two octaves under middle C, which is where this belongs and nowhere near where
       * the chord above sits.
       */
      id: 'hip-hook-sub-1',
      forRole: 'sub',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 12 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 25, degree: 7, octave: 0, len: 4 },
        { step: 29, degree: 5, octave: 0, len: 4 },
      ],
    },
    {
      /**
       * The other reading: three long notes and no walk, so the part is weight rather than a
       * line. Where the first hook has an event in the second bar, this one has a note still
       * sounding from the first.
       */
      id: 'hip-hook-sub-2',
      forRole: 'sub',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 16 },
        { step: 17, degree: 5, octave: 0, len: 8 },
        { step: 27, degree: 1, octave: 0, len: 6 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Eight requests, five of them `transient` — the mute map in the
   * header is carried here, on the requests, and each one's section list is annotated below with
   * what taking it away is for. The shape of the list is the argument in the header: one part that
   * *is* the music, two that are the beat, two that keep time and place around it, and three the
   * direction is finished without.
   */
  roles: [
    /**
     * **The direction, at the priority that says so.** Alone at 1, not `optional`, not
     * `inessential`, and `clean` — every one of those four is argued in the header, because each
     * of them was a way to make an absence read more kindly and each would have been a way of
     * saying something the direction does not believe.
     *
     * `continuous`, unlike `major-key-electro`'s — the library's only other `vox-chop` request,
     * and a `transient` one scoped to two sections. Here it is the part everything else is
     * arranged around, so it is present in every section and the arrangement happens to it rather
     * than to its neighbours.
     */
    { id: 'r-vox-chop', role: 'vox-chop', priority: 1, character: 'clean', sustain: 'continuous' },

    /**
     * `dark` rather than `hard`, and the geometry matters as much as the sound. §3.5 refuses a
     * substitution at squared distance 4, and `dark` is within 2 of `hard`, `dirty` and `soft`,
     * so this request can reach every one of the library's kick recipes. `soft` — which is what
     * a round, dusty kick sounds like — is 4 away from `hard` and would cut off the thirty-five
     * recipes that make up most of the role.
     */
    /* Out of `Bare`, `Pulled Back` and `Last Turn`: the beat arrives with the kick and leaves
     * with it, and the outro is the hats over the loop. */
    {
      id: 'r-kick',
      role: 'kick',
      priority: 2,
      character: 'dark',
      sustain: 'transient',
      sections: ['Drums Under', 'Whole', 'Back Harder', 'Thinned'],
    },

    /**
     * `dirty`, and this is the one place the direction asks for grit in the data rather than
     * leaving it to the knob. A snare here is a sample with its room and its noise floor still
     * on it; the artefacts are the sound. `dirty` is within 2 of both `hard` and `bright`, which
     * between them are the rest of the role.
     *
     * #308 notes that only one direction requested `snare` at all, and that a snare in this music
     * is a different object from a techno one. This is that request.
     */
    /* The narrowest map here — three sections. It joins in `Drums Under` with the kick and is
     * pulled for `Thinned`, which is the move that section is named for: taking the snare out and
     * leaving the kick is how this music gets quieter without stopping. */
    {
      id: 'r-snare',
      role: 'snare',
      priority: 2,
      character: 'dirty',
      sustain: 'transient',
      sections: ['Drums Under', 'Whole', 'Back Harder'],
    },

    /**
     * The swung sixteenths. `clean` is both the right sound — a tight, dry closed hat rather than
     * a ticking bright one — and the best-served character the role has.
     */
    /* The widest map here — five sections, everything but `Bare` and the drop-out. The hats are
     * the last thing playing in `Last Turn`, which is the only reason that section takes a phase 7
     * heading of its own rather than joining the other two band-0 sections. */
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 3,
      character: 'clean',
      sustain: 'transient',
      sections: ['Drums Under', 'Whole', 'Back Harder', 'Thinned', 'Last Turn'],
    },

    /**
     * §4.4/#81. Not `optional` — a rig with a voice spare should spend it here — but a beat of
     * this kind is finished without a separate low part, and a reader whose box is full should
     * not be told they are short of anything. The hooks above are what it plays.
     */
    /* Scoped with the kick, because on this kind of beat they are one gesture: the low end
     * arrives together and goes together. */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 3,
      character: 'dark',
      sustain: 'transient',
      sections: ['Drums Under', 'Whole', 'Back Harder', 'Thinned'],
      inessential: { reason: 'the kick already carries the bottom here' },
    },

    /**
     * §12.4. Four notes minimum, because the voicings above are seventh stacks and a rig that
     * could only sound three of them would be playing a different chord under a guide that says
     * otherwise. A number, not a device name.
     */
    {
      id: 'r-stab',
      role: 'stab',
      priority: 4,
      character: 'dark',
      sustain: 'continuous',
      polyphony: 4,
      inessential: { reason: 'the chopped top is the melody; what sits under it is furniture' },
    },

    /**
     * §4.4. `optional` *and* `inessential`: dropped without complaint if the rig has nothing
     * left, and reported as something the direction never wanted rather than as a hole. `soft`
     * is exact on twenty-four boxes and within 2 of the three `dark` ones, so the role is fully
     * reachable from here.
     */
    /* The narrowest map in the direction — the two fullest sections and nowhere else. A shaker
     * that ran the whole track would stop being the thing that marks the busy sections as busy. */
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 5,
      character: 'soft',
      sustain: 'transient',
      sections: ['Whole', 'Back Harder'],
      optional: true,
      inessential: { reason: 'a shaker is the last thing added and the first thing muted' },
    },

    /**
     * The bed under everything: crackle, room, hiss. Unpatterned on purpose (see §0 in the
     * header), and inessential because it is the one part here that a reader is as likely to get
     * from the material as from a voice in the rig.
     */
    {
      id: 'r-texture',
      role: 'texture',
      priority: 5,
      character: 'soft',
      sustain: 'continuous',
      inessential: { reason: 'the crackle comes with the material; it is not a part you dial' },
    },
  ],

  patterns: PATTERNS,
}
