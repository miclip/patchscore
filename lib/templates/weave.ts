import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Weave (§4). **Eight parts, seven of them percussion, and every one of them playing at once.**
 *
 * The pair to Relay, and deliberately its opposite. Relay asks what a piece looks like when
 * every part takes turns, and the answer is a track one *monophonic* voice can carry end to end.
 * This asks what a piece looks like when nothing ever stops for anything else, and the answer is
 * a track one box with *several* voices can carry — which is the shape #81 was filed about: a
 * groovebox holding eight parts simultaneously and being told it had four holes.
 *
 * Both are one-box directions and they reach it by opposite routes. Relay's mechanism is §4.2's
 * occupancy, which is per voice *per section*: two `transient` requests with disjoint sections
 * share one voice. **There is no mechanism here at all.** Every request is `continuous`, so every
 * one of them occupies every section, and eight of them need eight voices for the whole track.
 * The direction fits a small rig by being *small*, not by being clever, and that is the honest
 * answer for a box whose limit is how many parts it can hold rather than how many notes.
 *
 * **Nothing here names a device** (invariant 3). Seven percussion parts and a low one is a fact
 * about the music; how many parts a box can hold at once is a fact about the box, and this file
 * does not know it.
 *
 * The direction in one line: a kit of seven parts on three different loop lengths over one low
 * note that moves three times in eight bars.
 *
 * ## What it does that nothing else in the registry does
 *
 *  - **No backbeat, and no chord.** Every other direction here states beats 2 and 4 with a clap
 *    or a snare, and every other one has something holding a harmony. This has neither: the
 *    toms and the rim answer the kick, and the only pitched part is a sub. That is not an
 *    omission to be filled later — it is what the piece is, and a clap in it would make it a
 *    different direction.
 *  - **Three loop lengths at once.** The kick, hat and rim are one bar; the sub, shaker and open
 *    hat are two; the toms and the metal are four. So the *composite* kit is four bars long
 *    while its busiest parts restate every bar, and against sections of 9, 11 and 23 bars it
 *    restarts mid-phrase for most of the piece. Drone Study puts the harmony out of phase with
 *    the sections and says why; this does the same thing to the drums.
 *  - **The toms are the melody.** They get the four-bar grid, the widest band range in the file
 *    and the only accent in the low half of the kit. Major-Key Electro uses toms as a melodic
 *    part too; this makes them the lead voice, because with no chord and no top line there is
 *    nothing else for the ear to follow.
 *  - **Three of the eight requests declared inessential.** A direction that declares none is
 *    claiming it needs all of them (§4.4/#81), and for a kit that is plainly false: a kit is
 *    exactly the kind of thing that is still itself with three fewer voices in it. Saying which
 *    three is the work.
 *
 * ## Why the mode is `aeolian` and not something nothing else has claimed
 *
 * Drone Study reaches for phrygian and Relay for mixolydian because in both of them the mode is
 * load-bearing — one line has to imply a harmony on its own, and the flat second and the flat
 * seventh are how it does it. Here the harmony is a sub playing roots under a drum kit. It is
 * doing the least work of any tonal part in the library, and claiming an unused mode for it
 * would be a pose.
 *
 * So it spells the seven notes of the natural minor by their other name. That is not a dodge
 * around anything: `minor` is the word Industrial Techno answers to in the direction search, and
 * two directions answering one query is a picker that has stopped being useful. Same notes,
 * different index entry, and the mode is stated rather than smuggled.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every one of the eight parts
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`.
 *
 * **Every part this direction asks for is programmed, at all four bands.** In a piece that is
 * mostly drums there is no part that is a sustained thing with nothing to step in, so there is
 * no honest reason for a hole — and a kit direction that handed a reader a voice and no rhythm
 * for it would be omitting the guide.
 *
 * The three lengths are the composition, not a convenience:
 *
 *   1 bar    kick, closed-hat, rim      the pulse and the thing that argues with it
 *   2 bars   sub, ghost-perc, open-hat  the parts that answer every other bar
 *   4 bars   tom, metallic              the parts with somewhere to go
 *
 * §12.5 keeps variants flat — no bar offset, no within-section sequence — so length is the only
 * control a template has over how often a part repeats itself, and spending it is the difference
 * between a kit and a one-bar loop with eight things in it.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // Never four-to-the-floor, at any band: beats 2 and 4 stay empty in every variant, and the
  // kick only ever states 1 and 3. That hole is where the rim and the toms answer — with no
  // backbeat part in the piece, something has to leave the space for the answer, and it is the
  // loudest part that has to do it.
  variant('weave-kick-b0', 'kick', 0, 16, on('downbeat', 1)),
  variant('weave-kick-b1', 'kick', 1, 16, on('downbeat', 1, 9)),
  variant('weave-kick-b2', 'kick', 2, 16, on('downbeat', 1, 9), on('offbeat', 7)),
  variant(
    'weave-kick-b3',
    'kick',
    3,
    16,
    on('downbeat', 1, 9),
    on('offbeat', 7, 15),
    at('ghost', 44, 4),
  ),

  // ---- sub ----------------------------------------------------------------------------
  // Two bars, and it is the only pitched part in the piece, so the variants are a
  // re-articulation map as much as a rhythm: where the low note is struck again rather than
  // held. One strike in two bars at band 0, six at band 3, and it never reaches 16ths — a sub
  // that moved that fast would stop being the floor.
  variant('weave-sub-b0', 'sub', 0, 32, on('downbeat', 1)),
  variant('weave-sub-b1', 'sub', 1, 32, on('downbeat', 1, 17)),
  variant('weave-sub-b2', 'sub', 2, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  variant(
    'weave-sub-b3',
    'sub',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 11, 27),
  ),

  // ---- tom ----------------------------------------------------------------------------
  // Four bars, the widest band range in the file — two hits to fourteen — and the lead voice of
  // the piece. Band 0 is the second bar-line answered and nothing else; band 2 is where the part
  // becomes a figure rather than a punctuation; band 3 leans on step 63, in the last beat of the
  // fourth bar, so the phrase pushes into its own repeat instead of settling at the end of it.
  //
  // **The `fill` slot, which nothing in the library reached before.** #108's check found four
  // devices authoring a `fill` articulation on their dark tom and no direction able to emit one:
  // the only other direction asking for toms asks for a bright one, and §3.5 excludes an
  // opposite character from candidacy, so no dark tom a box authors was ever reachable. A tom roll
  // in the closing beat of a four-bar phrase is the plainest thing a tom does, and this is the
  // grid long enough to have a closing beat worth rolling into — so it is authored here rather
  // than left as a slot four devices describe and nothing plays.
  variant('weave-tom-b0', 'tom', 0, 64, on('downbeat', 1, 33)),
  variant('weave-tom-b1', 'tom', 1, 64, on('downbeat', 1, 33), on('offbeat', 27, 59)),
  variant(
    'weave-tom-b2',
    'tom',
    2,
    64,
    on('downbeat', 1, 21, 33, 53),
    on('offbeat', 11, 27, 43, 59),
    on('fill', 62, 64),
  ),
  variant(
    'weave-tom-b3',
    'tom',
    3,
    64,
    on('downbeat', 1, 13, 21, 33, 45, 53),
    on('offbeat', 11, 27, 43, 59),
    on('fill', 61, 62, 64),
    at('accent', 106, 63),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // One bar, offbeat 8ths, and the 16ths that arrive at bands 2 and 3 are all *even* steps —
  // between the beats, never on them. The hat never states a downbeat in this piece, at any
  // band: with the kick on 1 and 3 and nothing on 2 and 4, a hat that agreed with the beats
  // would close up the only air the kit has.
  variant('weave-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 11)),
  variant('weave-closed-hat-b1', 'closed-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'weave-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 34, 6, 14),
  ),
  variant(
    'weave-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 34, 2, 6, 10, 14),
  ),

  // ---- ghost-perc ---------------------------------------------------------------------
  // Two bars, and **every hit is a ghost at every band** — this is the only part in the library
  // that never rises above a whisper. That is what it is for: the layer that makes a kit sound
  // like hands rather than a grid, which it can only do by never being the thing you hear. Band
  // 3 is ten quiet 16ths in two bars — under a third of the steps, and not one of them loud.
  variant('weave-ghost-perc-b0', 'ghost-perc', 0, 32, at('ghost', 38, 4, 20)),
  variant('weave-ghost-perc-b1', 'ghost-perc', 1, 32, at('ghost', 38, 4, 12, 20, 28)),
  variant(
    'weave-ghost-perc-b2',
    'ghost-perc',
    2,
    32,
    at('ghost', 38, 2, 4, 12, 18, 20, 28),
  ),
  variant(
    'weave-ghost-perc-b3',
    'ghost-perc',
    3,
    32,
    at('ghost', 38, 2, 4, 6, 12, 14, 18, 20, 22, 28, 30),
  ),

  // ---- rim ----------------------------------------------------------------------------
  // One bar, and the part that answers the kick. Band 0 is a single hit on the 8th after beat 2
  // — the space the kick left — and beat 4 only arrives at band 1. The accent at band 3 is on
  // step 14, an even 16th nothing else in the kit touches, so the loudest hit in the bar is in
  // the one place the grid is empty.
  variant('weave-rim-b0', 'rim', 0, 16, on('offbeat', 7)),
  variant('weave-rim-b1', 'rim', 1, 16, on('downbeat', 13), on('offbeat', 7)),
  variant(
    'weave-rim-b2',
    'rim',
    2,
    16,
    on('downbeat', 13),
    on('offbeat', 7, 11),
    at('ghost', 46, 4),
  ),
  variant(
    'weave-rim-b3',
    'rim',
    3,
    16,
    on('downbeat', 13),
    on('offbeat', 3, 7, 11),
    at('ghost', 46, 4, 16),
    at('accent', 104, 14),
  ),

  // ---- open-hat -----------------------------------------------------------------------
  // Two bars, sparse throughout — one hit in thirty-two steps at band 0. The open hat here is
  // the thing that says which bar of the pair you are in, which is why it starts on the last
  // offbeat of the second bar and works backwards.
  variant('weave-open-hat-b0', 'open-hat', 0, 32, on('offbeat', 15)),
  variant('weave-open-hat-b1', 'open-hat', 1, 32, on('offbeat', 15, 31)),
  variant('weave-open-hat-b2', 'open-hat', 2, 32, on('offbeat', 7, 15, 23, 31)),
  variant(
    'weave-open-hat-b3',
    'open-hat',
    3,
    32,
    on('offbeat', 7, 15, 19, 23, 31),
    at('accent', 102, 11),
  ),

  // ---- metallic -----------------------------------------------------------------------
  // Four bars, and the slowest part in the piece: one hit in four bars at band 0, seven at band
  // 3. A ringing metal hit that repeated every bar would be a hat with a longer tail; on this
  // grid it is the thing that marks where the four-bar cycle is, which is information no other
  // part in the kit gives.
  variant('weave-metallic-b0', 'metallic', 0, 64, on('downbeat', 1)),
  variant('weave-metallic-b1', 'metallic', 1, 64, on('downbeat', 1, 33)),
  variant(
    'weave-metallic-b2',
    'metallic',
    2,
    64,
    on('downbeat', 1, 33),
    on('offbeat', 23, 55),
  ),
  variant(
    'weave-metallic-b3',
    'metallic',
    3,
    64,
    on('downbeat', 1, 17, 33, 49),
    on('offbeat', 23, 55),
    at('accent', 100, 63),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const weave: Template = {
  id: 'weave',
  name: 'Weave',

  /**
   * Fast enough that a four-bar tom figure is a phrase rather than an event, and the range is
   * wide because tempo is the one control a reader has over how hard seven percussion parts
   * sitting on top of each other actually hits.
   */
  bpm: { min: 126, max: 140, default: 132 },

  /**
   * Aeolian throughout — the natural minor, spelt by the name Industrial Techno does not already
   * own in the direction search. The reasoning is in the module comment above; the short version
   * is that one sub playing roots has not earned a mode of its own, and pretending otherwise
   * would put a claim in this file that the music does not make.
   *
   * Three tonics, low ones. §4.1 gives the seed a choice, and on a piece whose only pitched part
   * is a sub the choice is really a choice of where the floor sits.
   */
  keys: ['E aeolian', 'G aeolian', 'B aeolian'],

  /**
   * Eight sections, 120 bars, and the top band arrives third.
   *
   * Energies 0.12 / 0.38 / 0.85 / 0.55 / 0.95 / 0.42 / 0.68 / 0.08 land on bands
   * 0 / 1 / 3 / 2 / 3 / 1 / 2 / 0 at the neutral detent. Every other direction here builds
   * towards its peak; this one is at full kit by bar 29 and spends the remaining ninety
   * *rearranging* rather than climbing. That is what a percussion piece does, because the
   * interest is which parts are playing rather than how many — and it is why Slack and Fray fall
   * to bands 2 and 1 from a 3 rather than easing off at the end.
   *
   * **No length is a multiple of four, and the remainders are not all the same.** With the toms
   * and the metal on a four-bar grid, that puts their loop boundary in a different place in every
   * section — 9 bars is two copies and one over, 11 is two and three, 14 is three and two — so
   * the part restarts against a different beat of the phrase eight times in the piece. One
   * uniform remainder would have been the same trick played once. §12.5 keeps variants flat, so
   * length and section arithmetic are the only controls a template has over this, and #105's
   * chain plan is what tells the reader to build the remainder rather than pretending the
   * section divided.
   */
  structure: [
    { name: 'Thread', bars: 9, energy: 0.12 },
    { name: 'Pull', bars: 18, energy: 0.38 },
    { name: 'Knot', bars: 14, energy: 0.85 },
    { name: 'Slack', bars: 11, energy: 0.55 },
    { name: 'Twist', bars: 23, energy: 0.95 },
    { name: 'Fray', bars: 13, energy: 0.42 },
    { name: 'Turn', bars: 22, energy: 0.68 },
    { name: 'Unwind', bars: 10, energy: 0.08 },
  ],

  /**
   * §4.1. Eight bars, three chords, and the spans are 5 / 2 / 1.
   *
   * Five bars of `i` is not laziness: with one pitched part and no accompaniment, a chord change
   * is a single note moving, and a change the listener has not had time to settle into is just a
   * note that went wrong. So the cycle stays put for most of its length and then moves twice in
   * three bars — `VI` for two, `v` for one — which reads as the floor lifting and dropping back
   * rather than as a progression.
   *
   * Five is also odd, which matters against sections of 9, 11 and 23 bars: the chord change
   * lands in a different place in the phrase almost everywhere in the piece.
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 5 },
      { degree: 'VI', bars: 2 },
      { degree: 'v', bars: 1 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Two, both for the sub, because it is the only pitched part
   * in the piece — a hook for a role nobody asks for is data the renderer can never reach.
   *
   * **Both hooks change pitch exactly where the cycle changes and nowhere else.** That is Drone
   * Study's rule and it applies for the same reason: with one pitched part and nothing playing
   * under it, the printed progression is only real if the line's change points *are* the chord
   * changes. A note that moved mid-chord would make the cycle above decoration, and one that
   * failed to move at a boundary would make it a fiction. So each hook is three notes, one per
   * chord, each held until the next one starts — the rhythm of the part is in the variants, and
   * the pitch of it is here.
   *
   * The two pick different members of each triad, so a reroll between them is a different bass
   * line rather than a transposition: the first takes roots, the second takes the note above the
   * root in each chord. Steps are the same 16ths-per-bar grid the patterns use, so eight bars
   * runs 1..128, and `baseOctave` puts the part two octaves under middle C (§4.1).
   */
  hooks: [
    {
      // Roots: 1 over `i`, 6 over `VI`, 5 over `v`. The plain reading, and the one that makes
      // the two changes at the end of the cycle sound like the floor moving.
      id: 'weave-hook-sub-1',
      forRole: 'sub',
      bars: 8,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 80 },
        { step: 81, degree: 6, octave: 0, len: 32 },
        { step: 113, degree: 5, octave: 0, len: 16 },
      ],
    },
    {
      // The next note up in each triad: the fifth over `i`, the third over `VI`, the seventh
      // over `v`. Same three changes, but the line now *falls* into the last bar instead of
      // stepping down to it, and none of the three notes is the root — so the harmony is implied
      // rather than stated, which on eight bars of drums is a different piece.
      id: 'weave-hook-sub-2',
      forRole: 'sub',
      bars: 8,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 80 },
        { step: 81, degree: 3, octave: 0, len: 32 },
        { step: 113, degree: 7, octave: 0, len: 16 },
      ],
    },
  ],

  /**
   * §4.4. Eight requests, every one `continuous`, and **seven of the eight are percussion**.
   *
   * Seven is the ceiling rather than a round number: how many percussion parts a small box holds
   * at once is the resource this direction spends, and asking for an eighth would mean no such box
   * could finish it. That is the whole point of the direction, so the count is load-bearing content
   * rather than taste.
   *
   * Nothing is `transient`. Relay makes a direction out of two transient requests with disjoint
   * sections and gets a two-part piece onto one voice; section-scoping anything here would let a
   * smaller rig pass by taking turns, and then the fit number would be answering Relay's
   * question instead of this one.
   *
   * Priority reads as: the two that are the floor; the three that are the groove; and three that
   * are the room around it. Ids spell the role out rather than abbreviating it, for the reason
   * Industrial Techno gives — two-letter abbreviations are also how drum voices are
   * conventionally labelled.
   *
   * **Three of the eight are declared inessential (§4.4/#81), and none of them is a token.** A
   * kit is the clearest case there is of a thing that is still itself with fewer voices in it,
   * and #81's complaint was a box that made a finished track being told it had holes. The three
   * below are the ones a reader would drop first, in the order they would drop them, and each
   * reason says what covers the absence rather than shrugging at it.
   */
  roles: [
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    /**
     * §4.3. `reArticulatesHook`, on the same reading Drone Study's `texture` gets it on, and this
     * file already argued both halves before the flag existed: the variants are "a
     * re-articulation map as much as a rhythm: where the low note is struck again rather than
     * held", and the hooks are "three notes, one per chord, each held until the next one
     * starts — the rhythm of the part is in the variants, and the pitch of it is here". That is
     * the flag's meaning in the template's own words, so leaving it off would have #100 silence
     * the one pitched part's rhythm in a direction that is otherwise all percussion.
     */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 1,
      character: 'dark',
      sustain: 'continuous',
      reArticulatesHook: true,
    },

    // The lead voice of the piece — the module comment's claim, and this is where it is true in
    // the data: the toms are at the top of the second tier, with the widest band range and the
    // only accent below the hats. Emphatically not inessential. A kit direction with no toms is
    // a different direction.
    { id: 'r-tom', role: 'tom', priority: 2, character: 'dark', sustain: 'continuous' },
    // `clean` rather than `dirty`, and the reason is §3.4 rather than taste: the two are
    // *opposites* on the grit axis, so §3.5 refuses the substitution outright at distance 4 —
    // a direction asking for a dirty hat gets an honest gap from every box that authors only a
    // clean one, which is most of them. A hand-percussion kit wants the clean hat anyway.
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'clean',
      sustain: 'continuous',
    },
    { id: 'r-ghost-perc', role: 'ghost-perc', priority: 2, character: 'soft', sustain: 'continuous' },

    // The three that make the kit a room rather than a pattern. All three declared, because a
    // rig that fills the five above has made this piece and should be told so.
    {
      id: 'r-rim',
      role: 'rim',
      priority: 3,
      character: 'clean',
      sustain: 'continuous',
      inessential: { reason: 'the toms already answer the kick, and deeper' },
    },
    // `hard`, which is neither end of the tone axis, and that is deliberate: the library splits
    // on this role — some boxes author a bright open hat and some a dark one — so asking for
    // either end refuses half of them outright (§3.4 opposites, distance 4). A character on a
    // different axis sits at distance 2 from *both* and substitutes to whichever the box has.
    {
      id: 'r-open-hat',
      role: 'open-hat',
      priority: 3,
      character: 'hard',
      sustain: 'continuous',
      inessential: { reason: 'the closed hat can open by hand where it needs to' },
    },

    // §4.4. Both halves, because they are two claims (#81): do not spend a voice on this, and
    // do not tell a reader their rig is short one. Last on the list and the first thing to go —
    // the shaker and the hats are already carrying the top of the kit.
    {
      id: 'r-metallic',
      role: 'metallic',
      priority: 4,
      character: 'dirty',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'the hats already shimmer; this is one more thing up there' },
    },

  ],

  patterns: PATTERNS,
}
