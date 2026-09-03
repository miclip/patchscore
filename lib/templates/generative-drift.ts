import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Generative Drift (§4). **Four cycles that do not divide the bar, and nothing random anywhere.**
 *
 * The word in the title is the one this file has to be most careful with, so it is defined
 * before anything else is authored. "Generative" here means *phase*: several parts repeating
 * at lengths that share no factor, so the composite they make is longer than any of them and
 * takes a long time to come back to where it started. It does not mean chance, it does not mean
 * probability, and it does not mean a sequencer deciding anything. Invariant 1 forbids the first
 * two at the engine level and invariant 6 would forbid them here even if it did not: a direction
 * whose guide differed between two renders at one seed is a direction that cannot be printed.
 *
 * **Nothing here names a device** (invariant 3). Which boxes can hold a part at its own length is
 * exactly the fact this file is not allowed to know, and the whole point of §4's layering is that
 * it does not have to: the ratios below are musical facts, and what a rig does with them is the
 * resolver's problem and the reader's.
 *
 * The direction in one line: a low part on the bar, four parts on cycles of three, five, seven
 * and eleven sixteenths, and a chord that changes every five bars under all of it.
 *
 * ## The ratios, exactly
 *
 * These are stated here and nowhere else, because there is no field for them and inventing one
 * would be a fifth shared vocabulary (invariant 3). They are arithmetic, so they are checkable:
 *
 *   3 sixteenths    the closed hat
 *   5 sixteenths    the arp
 *   7 sixteenths    the metallic part
 *   11 sixteenths   the shaker
 *   16 sixteenths   the low part, which is the one thing that agrees with the bar
 *
 * Pairwise they meet every 15, 21, 33, 35, 55 and 77 steps. Three of them meet every 105 steps —
 * six bars and nine sixteenths — and all four every 1155 steps, which is seventy-two bars and
 * three sixteenths. Bring the bar line in and the whole thing returns to its starting alignment
 * after 1155 **bars**, which at the default tempo is a little over half an hour.
 *
 * The variants below are 64 steps, four bars, the longest the grid allows. 105 is larger than 64,
 * so **inside one printed window no three of the four cycles ever agree again after step 1**. That
 * is the part of the claim the data on the page actually delivers.
 *
 * ## What this direction refuses to claim
 *
 * Worth writing down flatly, because "generative" is a word people read as a promise:
 *
 *  - **It does not claim non-repetition.** Every variant here is 64 steps and repeats every four
 *    bars, so all four cycles re-anchor together at every window boundary. The 1155-bar figure
 *    above is a fact about the *ratios*, and it is what a rig that can hold each part at its own
 *    length will give you. It is not what the printed grid gives you, and a guide that said
 *    otherwise would be describing a patch the reader has not built.
 *  - **It does not claim randomness.** There is none, at any layer. What drifts, drifts because
 *    three does not divide sixteen.
 *  - **It does not claim the parts will stay apart on any particular box.** Whether a part can be
 *    given a length of its own is a fact about a box, and this file does not know one.
 *
 * ## The arrangement is a suggestion, and the patch does not need it
 *
 * `structure` below is six sections and 96 bars, and it is offered as *a way to stop* rather than
 * as the shape of the piece. The patch it describes is a free-running one: nothing in it builds
 * to anything, nothing drops, and the last section is the longest because the honest ending for
 * this direction is being switched off rather than arriving somewhere. A reader who ignores the
 * sections entirely and leaves the four cycles running has not skipped a step — they have the
 * piece. The energies are there so that a reader who *does* want a song has one, and so the
 * density knob has an arc to lean on (§6.3).
 *
 * The section lengths say the same thing in the data. All six are prime — 7, 13, 11, 19, 17, 29 —
 * so not one is a whole number of four-bar windows and not one is a whole number of the five-bar
 * chord cycle. Every section therefore ends mid-window and mid-chord, which is deliberate in the
 * way Drone Study's are deliberate: a boundary that lands cleanly is a boundary that tells the ear
 * where the loop is. `chainPlan` prints the remainder rule for each of them (#105) — 7 bars of a
 * 4-bar window is 4 + 3 — so the reader is told how to build it rather than left with arithmetic
 * that looks like a bug. And 96 bars is nineteen turns of the chord cycle plus one bar of the
 * twentieth, so the arrangement stops the piece one bar into a two-bar `I` — halfway through that
 * chord, with the `vi` and the suspension that were coming next never played.
 *
 * ## Three things it does that nothing else in the registry does
 *
 *  - **Every part is on a different cycle length, and one of them is the bar.** Weave puts three
 *    loop lengths against each other and says why; all three of them are 1, 2 and 4 bars, which
 *    share a factor and agree every four. These four share no factor with each other or with the
 *    bar.
 *  - **A five-bar chord cycle.** Every other direction here is on 4, 8 or 16. Five is the first
 *    length that cannot line up with a four-bar window, and it puts the harmony on the same
 *    footing as the parts.
 *  - **No accent anywhere, at any band.** Every other direction leans on one hit per variant. A
 *    leaned hit is a bar line for the ear, and a piece whose subject is not having one cannot
 *    afford it. The `accent` slot is left unauthored deliberately, not overlooked — a device that
 *    articulates it simply has nothing here to articulate.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands, one cycle per part
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`.
 *
 * **The bands thin the cycle rather than changing it.** Every band of a part hits a multiple of
 * that part's own cycle length, so turning density down takes strikes out of the figure and never
 * moves the figure onto a different one. The hat is on 3 at band 3, 6 at band 2, 12 at band 1 and
 * 24 at band 0; the arp on 5, 10, 20, 40; the metallic part on 7, 14, 21, 28; the shaker on 11,
 * 22, 33 and then a single strike in four bars. The knob makes the drift coarse or fine — it does
 * not make it something else.
 *
 * **The slot follows where the strike lands, not what the part is.** A cycle that does not divide
 * the bar puts its own strikes on beats, on eighth-note offbeats and on bare sixteenths in turn,
 * so the slot is read off the step: `downbeat` where it lands on a beat, `offbeat` where it lands
 * on an eighth between two, `ghost` for everything else, quietly. That is the convention applied
 * literally rather than a part-by-part decision, and it is what makes the walk audible: the same
 * three-step figure articulates differently as it moves across the bar, which is the whole effect
 * this direction is built on.
 *
 * `pad`, `texture` and `sweep` have no variants, for the reason Ambient Dub gives: a pad holds, a
 * texture breathes, and a sweep is one gesture across a boundary. Inventing four bands of
 * sixteenths for any of them would be the guide lying about what the part does (invariant 5).
 */
const PATTERNS: Pattern[] = [
  // ---- sub ----------------------------------------------------------------------------
  // The one part that agrees with the bar, and the only reason the drift is audible: phase needs
  // something to be out of phase *with*. One bar long, so it restates every bar while everything
  // else is four bars deep into a cycle that will not close.
  variant('drift-sub-b0', 'sub', 0, 16, on('downbeat', 1)),
  variant('drift-sub-b1', 'sub', 1, 16, on('downbeat', 1, 9)),
  variant('drift-sub-b2', 'sub', 2, 16, on('downbeat', 1, 9), on('offbeat', 15)),
  variant(
    'drift-sub-b3',
    'sub',
    3,
    16,
    on('downbeat', 1, 9),
    on('offbeat', 7, 15),
    at('ghost', 48, 13),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // Cycle of 3. The fastest of the four and the one a listener locks onto first, which is why it
  // is the one that never lands twice in the same place: 3 against 16 walks the whole bar in
  // three bars and is back at the top on the fourth.
  variant('drift-hat-b0', 'closed-hat', 0, 64, on('downbeat', 1, 25, 49)),
  variant('drift-hat-b1', 'closed-hat', 1, 64, on('downbeat', 1, 13, 25, 37, 49, 61)),
  variant(
    'drift-hat-b2',
    'closed-hat',
    2,
    64,
    on('downbeat', 1, 13, 25, 37, 49, 61),
    on('offbeat', 7, 19, 31, 43, 55),
  ),
  // Band 3 is the cycle itself, all 22 strikes. Half of them are bare sixteenths and every one of
  // those is quiet — the audible half of the figure is the half that happens to land on the grid,
  // and which half that is changes bar by bar.
  variant(
    'drift-hat-b3',
    'closed-hat',
    3,
    64,
    on('downbeat', 1, 13, 25, 37, 49, 61),
    on('offbeat', 7, 19, 31, 43, 55),
    at('ghost', 46, 4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64),
  ),

  // ---- arp ----------------------------------------------------------------------------
  // Cycle of 5, and **no hook**, which is a decision rather than an omission.
  //
  // §4.1 asks a hook to be chord tones of the progression, and a written figure on this part
  // cannot be. The chord cycle is five bars; the longest variant the grid allows is four. A
  // four-bar figure therefore drifts against the harmony exactly the way the rhythms do, and
  // lands a ninth under the `I` about as often as it lands a third — which is the one kind of
  // drift this direction is not entitled to, because it is the guide printing a note against a
  // chord it does not belong to.
  //
  // Writing the figure at five bars instead would fix the pitch and cost the direction the part.
  // Eighty steps divides by the five-step cycle exactly, sixteen strikes and no remainder, so the
  // arp would close with the harmony and stop being one of the four things that drift.
  //
  // So the arp arpeggiates whatever chord is sounding, the progression says which one that is,
  // and the strikes below say when. Ambient Dub's `sub` is a pitched part with no hook on the
  // same reading: what it plays is the harmony, and only when it plays is authored here. It also
  // leaves every patterned role in this direction with a working density knob, since #100 gives
  // the whole of phase 5 to a resolved hook and there is now no hook here to take it.
  variant('drift-arp-b0', 'arp', 0, 64, on('downbeat', 1, 41)),
  variant('drift-arp-b1', 'arp', 1, 64, on('downbeat', 1, 21, 41, 61)),
  variant(
    'drift-arp-b2',
    'arp',
    2,
    64,
    on('downbeat', 1, 21, 41, 61),
    on('offbeat', 11, 31, 51),
  ),
  variant(
    'drift-arp-b3',
    'arp',
    3,
    64,
    on('downbeat', 1, 21, 41, 61),
    on('offbeat', 11, 31, 51),
    at('ghost', 50, 6, 16, 26, 36, 46, 56),
  ),

  // ---- metallic -----------------------------------------------------------------------
  // Cycle of 7. Band 1 is the odd one in the file and it is arithmetic rather than taste: 21 is
  // the multiple of 7 that lands there, and 21 against 16 puts two of its four strikes on bare
  // sixteenths. A band that thinned to something tidier would have left the cycle, which is the
  // one thing the bands are not allowed to do.
  variant('drift-metallic-b0', 'metallic', 0, 64, on('downbeat', 1, 29, 57)),
  variant(
    'drift-metallic-b1',
    'metallic',
    1,
    64,
    on('downbeat', 1),
    on('offbeat', 43),
    at('ghost', 44, 22, 64),
  ),
  variant(
    'drift-metallic-b2',
    'metallic',
    2,
    64,
    on('downbeat', 1, 29, 57),
    on('offbeat', 15, 43),
  ),
  variant(
    'drift-metallic-b3',
    'metallic',
    3,
    64,
    on('downbeat', 1, 29, 57),
    on('offbeat', 15, 43),
    at('ghost', 44, 8, 22, 36, 50, 64),
  ),

  // ---- ghost-perc ---------------------------------------------------------------------
  // Cycle of 11, the slowest, and the part that decides how long the composite takes to come
  // round. Band 0 is one strike in four bars — the same figure the others use, thinned until
  // almost none of it is left, which is what band 0 means for a part like this.
  variant('drift-ghost-perc-b0', 'ghost-perc', 0, 64, on('downbeat', 1)),
  variant('drift-ghost-perc-b1', 'ghost-perc', 1, 64, on('downbeat', 1), at('ghost', 42, 34)),
  variant(
    'drift-ghost-perc-b2',
    'ghost-perc',
    2,
    64,
    on('downbeat', 1, 45),
    on('offbeat', 23),
  ),
  variant(
    'drift-ghost-perc-b3',
    'ghost-perc',
    3,
    64,
    on('downbeat', 1, 45),
    on('offbeat', 23),
    at('ghost', 42, 12, 34, 56),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const generativeDrift: Template = {
  id: 'generative-drift',
  name: 'Generative Drift',

  /**
   * Slow enough that a listener can hear a strike move, fast enough that the eleven-step cycle
   * comes round inside a phrase rather than inside a section. The range is narrow because tempo
   * is the one control that changes all four cycles at once, so it is the one control that cannot
   * be used to adjust the relationship between them.
   */
  bpm: { min: 88, max: 104, default: 96 },

  /**
   * **The pitch material is the major pentatonic subset — degrees 1, 2, 3, 5 and 6 — and that is
   * the load-bearing decision in this template, not the mode name.**
   *
   * Parts that never line up mean any note may sound against any other note at any moment, and
   * there is no bar of the arrangement where the author can say which pair it will be. The only
   * safe answer is a set of degrees with no bad pair in it. Those five are semitones 0, 2, 4, 7
   * and 9: the closest any two come is a whole tone, and there is no tritone among them. Every
   * hook below and every chord in the cycle stays inside it, so degrees 4 and 7 appear nowhere in
   * this file at all.
   *
   * `ionian` is then the plain parent of that subset, and the name is an index entry rather than
   * a sound — Weave's argument for spelling natural minor `aeolian`, one layer along. Lydian and
   * mixolydian contain the same five degrees and would resolve to the same notes here, and naming
   * either would promise the reader a #4 or a b7 that this direction never plays. `major` is the
   * word Major-Key Electro answers to in the direction search, and two directions answering one
   * query is a picker that has stopped being useful.
   */
  keys: ['G ionian', 'E ionian', 'B ionian'],

  /**
   * Six sections, 96 bars, and a way to stop rather than a shape. See the header: the patch is
   * free-running, and this is the arrangement offered to a reader who wants a track out of it.
   *
   * Energies 0.05 / 0.3 / 0.4 / 0.55 / 0.65 / 0.85 land on bands 0 / 1 / 1 / 2 / 2 / 3 at the
   * neutral detent — the only vector in the registry that never comes down. It walks all four
   * bands without a knob, it holds each of the middle two for two sections, and it ends at the
   * top because there is nothing here for a piece to return to. At the sparse detent it is
   * 0 / 0 / 0 / 1 / 1 / 2 and at the busy one 1 / 2 / 2 / 3 / 3 / 3, so all three are different
   * arrangements rather than the same one relabelled.
   *
   * All six bar counts are prime, so none is a whole number of the four-bar windows the parts are
   * written on and none is a whole number of the five-bar chord cycle. Adrift is the longest
   * because being left running is this direction's ending.
   */
  structure: [
    { name: 'Anchor', bars: 7, energy: 0.05 },
    { name: 'Loosen', bars: 13, energy: 0.3 },
    { name: 'Askew', bars: 11, energy: 0.4 },
    { name: 'Wander', bars: 19, energy: 0.55 },
    { name: 'Widen', bars: 17, energy: 0.65 },
    { name: 'Adrift', bars: 29, energy: 0.85 },
  ],

  /**
   * §4.1. Five bars, three chords, and the fifth bar is the whole reason for it.
   *
   * Two bars of `I` and two of `vi` would be a four-bar cycle that agreed with every window in the
   * file. The single bar of `Vsus2` on the end takes that away: the chord change walks around the
   * four-bar window in the same way the parts walk around the bar, and lands back where it started
   * once every twenty bars.
   *
   * `Vsus2` rather than `V` because `V` is degrees 5, 7 and 2, and the seventh is one of the two
   * degrees this direction does not own (see `keys`). Suspending it gives 5, 6 and 2 — the same
   * root, inside the subset, and a chord with no third to argue with an arp that may be anywhere.
   */
  harmony: {
    cycleBars: 5,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'Vsus2', bars: 1 },
    ],
  },

  /**
   * §4.1. Authored, never generated. `degree` is 1-based in the key and `octave` is an offset from
   * the hook's own `baseOctave`, which is scientific pitch with middle C at C4.
   *
   * **Two hooks, and both are five bars — one whole turn of the chord cycle** — so every note sits
   * on the chord it sounds under, which is what §4.1 asks of a hook and what a hook of any other
   * length cannot promise here. That is also why there are only two: the arp is the one pitched
   * part that strikes, and it cannot have a hook on those terms without leaving the drift. The
   * comment beside its variants is the argument.
   *
   * Both parts below hold rather than strike, so neither is a figure with a rhythm of its own and
   * #100's question about two competing instructions on one part does not arise anywhere in this
   * direction.
   */
  hooks: [
    {
      // One voicing per chord, each held for its span. Three notes, all inside the subset, and
      // the sixth in the middle voicing is dropped an octave so the `vi` sits under the `I`
      // rather than above it — the harmony moves without the bed appearing to rise.
      id: 'drift-hook-pad-1',
      forRole: 'pad',
      bars: 5,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 32 },
        { step: 1, degree: 3, octave: 0, len: 32 },
        { step: 1, degree: 5, octave: 0, len: 32 },
        { step: 33, degree: 6, octave: -1, len: 32 },
        { step: 33, degree: 1, octave: 0, len: 32 },
        { step: 33, degree: 3, octave: 0, len: 32 },
        { step: 65, degree: 5, octave: 0, len: 16 },
        { step: 65, degree: 6, octave: 0, len: 16 },
        { step: 65, degree: 2, octave: 1, len: 16 },
      ],
    },
    {
      // The same cycle heard two octaves up and one note at a time, and it never states the root:
      // the third of `I`, the root of `vi` reached as a colour rather than as a bass note, and the
      // second of the suspension. A line that leans on what each chord has that the last one did
      // not, so the harmony is audible in a part that is only ever playing one note.
      id: 'drift-hook-texture-1',
      forRole: 'texture',
      bars: 5,
      baseOctave: 5,
      notes: [
        { step: 1, degree: 3, octave: 0, len: 32 },
        { step: 33, degree: 6, octave: 0, len: 32 },
        { step: 65, degree: 2, octave: 0, len: 16 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 4. Eight requests, and **four of them declared inessential** —
   * the piece is four cycles and something to hold them up, and everything past that is a room
   * for them to be in. A direction that declared none would be claiming it needs all eight, which
   * for a drift patch is plainly false and is exactly how a capable box gets reported as full of
   * holes (#81).
   */
  roles: [
    // The bed and the anchor. Neither drifts, and neither is optional: without the low part
    // agreeing with the bar there is nothing for the other four to be out of phase with, and
    // without the pad the piece is a percussion study.
    { id: 'r-pad', role: 'pad', priority: 1, character: 'soft', sustain: 'continuous', polyphony: 3 },
    // §4.1/#334. The root, at the octave every authored `sub` hook uses. See industrial-techno.
    {
      id: 'r-sub',
      role: 'sub',
      priority: 1,
      character: 'dark',
      sustain: 'continuous',
      pitch: { degree: 1, baseOctave: 1 },
    },

    // The two cycles a listener follows. `clean` on the hat rather than `dirty` for the reason
    // Weave gives — the two are opposites on the grit axis and §3.5 refuses the substitution
    // outright — and a hat that has to be heard landing on a different sixteenth each bar wants
    // to be the clean one anyway.
    { id: 'r-arp', role: 'arp', priority: 2, character: 'bright', sustain: 'continuous' },
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'clean',
      sustain: 'continuous',
    },

    // The two slower cycles. Both declared: a rig that fills the four above is playing this
    // direction and should be told so rather than shown a hole.
    {
      id: 'r-metallic',
      role: 'metallic',
      priority: 3,
      character: 'bright',
      sustain: 'continuous',
      inessential: { reason: 'the hats are already drifting up there, and this adds one more' },
    },
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 3,
      character: 'soft',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'a shaker just crowds a room this loose' },
    },

    // The room. Both are held gestures with no grid (see PATTERNS), and both are the first things
    // a small rig should spend nothing on.
    {
      id: 'r-texture',
      role: 'texture',
      priority: 4,
      character: 'soft',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'the pad is already the bed, and nothing here holds still under it' },
    },
    // §4.2. Transient, and scoped to the two sections either side of the longest one — a gesture
    // into the widest part and a gesture out towards the end. A sweep across all six would be a
    // pad with a filter on it, which is a different part with a different name.
    {
      id: 'r-sweep',
      role: 'sweep',
      priority: 4,
      character: 'soft',
      sustain: 'transient',
      sections: ['Askew', 'Widen'],
      optional: true,
      inessential: { reason: 'nothing here builds, so there is nothing for a lift to announce' },
    },
  ],

  patterns: PATTERNS,
}
