import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Relay (§4). **Two parts that are never playing at the same time.**
 *
 * Every other direction in the registry has a spine of parts that coexist: whatever else they
 * scope to a few sections, each of them asks for several `continuous` requests at once, and a rig
 * has to find a separate voice for every one it fills. This direction asks the opposite question
 * — what does a piece look like when *every* part takes turns — and the answer is a track a
 * single monophonic box can play from end to end, because §4.2's occupancy is per
 * `(assignable, section)` and two requests whose section sets do not intersect can be handed the
 * same voice.
 *
 * That is not a trick played on the resolver; it is a way people actually write on one
 * synthesizer, and it is the one thing in the request vocabulary that no direction had yet
 * exercised. `transient` was introduced for risers and sweeps — four bars of lift inside a
 * longer track — and Major-Key Electro already showed it is a property of the *request* rather
 * than of those three roles by scoping a `vox-chop` to two sections. This goes the whole way:
 * **both** requests are transient, between them they cover all eight sections exactly once, and
 * neither is ever asked to share a bar with the other.
 *
 * **Nothing here names a device** (invariant 3). "One box can play this" is a fact about section
 * arithmetic, not about any box, and the template does not know whether the rig it lands on has
 * one voice or thirty.
 *
 * The direction in one line: a bass figure and a lead line handing a single voice back and forth
 * across 122 bars, over a mixolydian cycle that never quite closes.
 *
 * ## Why it still reads as a piece rather than as two half-pieces
 *
 *  - **The handover is uneven, and deliberately so.** Reading the eight sections in order, the
 *    voice goes `bass bass lead bass lead lead bass lead` — **five handoffs, and two places where
 *    a part keeps it for a second section running**. Strict alternation was the obvious shape and
 *    it is the wrong one: the bass needs Enter *and* Walk to establish a figure before anything
 *    can answer it, and the lead needs Ease *and* Reply to be a line rather than a retort. The
 *    two clusters are the only sections in the piece where a part gets to develop, and they sit
 *    at opposite ends of it. What is even is the tally — four sections each — and the piece ends
 *    on the lead.
 *  - **The band vector is `0 1 2 3 1 2 3 0`.** Two climbs to band 3, and the second one arrives
 *    from higher up than the first: Ease drops to 1 where Enter started at 0. A piece that hands
 *    its voice back and forth needs the second exchange to cost more than the first, or the
 *    exchange is a gimmick.
 *  - **Mixolydian**, which no other direction here reaches. The flat seventh is what lets `VII`
 *    sit a whole step under the tonic and pull rather than push, and the cycle spends its last
 *    bar on the minor `v` — so eight bars end unresolved and the next eight have somewhere to go.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four bands each, and both parts on a two-bar grid
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`. Both parts are 32 steps — two bars
 * — so a handover always lands on a phrase boundary rather than mid-figure.
 *
 * **Both requested roles are patterned, at all four bands.** Nothing here is a sustained part
 * with nothing to program: a direction with two requests cannot afford to hand a reader a part
 * and no rhythm for it, because that would be half the guide.
 */
const PATTERNS: Pattern[] = [
  // ---- bass-mid -----------------------------------------------------------------------
  // The pushing half. It states the downbeat from band 0 — this is the part holding the floor
  // while the lead is silent, and a bass that hides from the bar line has nothing to hold it
  // with. What grows is the offbeat side, so the figure gets springier rather than heavier.
  variant('relay-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1), on('offbeat', 15)),
  variant('relay-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 17), on('offbeat', 15)),
  variant(
    'relay-bass-mid-b2',
    'bass-mid',
    2,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 15, 23),
  ),
  // Band 3 fills in around the figure rather than moving it: the two downbeats that were already
  // there stay put, step 9 joins them so the second half of bar 1 states the beat too, and the
  // two ghosts land on 16ths nothing else touches.
  variant(
    'relay-bass-mid-b3',
    'bass-mid',
    3,
    32,
    on('downbeat', 1, 9, 17),
    on('offbeat', 7, 15, 23, 31),
    at('ghost', 44, 4, 20),
  ),

  // ---- lead ---------------------------------------------------------------------------
  // The answering half, and it enters the opposite way round. Band 0 is one note in two bars —
  // a reply, not a melody — and it reaches the offbeats before it reaches the second downbeat,
  // so the line is already leaning off the grid by the time it is dense enough to be a tune.
  variant('relay-lead-b0', 'lead', 0, 32, on('downbeat', 1)),
  variant('relay-lead-b1', 'lead', 1, 32, on('downbeat', 1, 17)),
  variant('relay-lead-b2', 'lead', 2, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  // The accent is on step 29, in the last beat of the second bar: the lead leans on the note it
  // is about to hand back, so the exchange is audible from the melodic side too.
  variant(
    'relay-lead-b3',
    'lead',
    3,
    32,
    on('downbeat', 1, 13, 17),
    on('offbeat', 7, 11, 23, 27),
    at('accent', 106, 29),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const relay: Template = {
  id: 'relay',
  name: 'Relay',

  /** Fast enough that a two-bar figure is a phrase rather than an event. */
  bpm: { min: 118, max: 132, default: 124 },

  /**
   * Mixolydian throughout, and only mixolydian. The cycle leans on a `VII` a whole step under
   * the tonic and closes on a minor `v`, and neither exists in a mode with a leading note —
   * offering a key that has one would ask the reader to play a chord the key does not contain.
   * The same argument Ambient Dub makes for dorian and Drone Study for phrygian; it is what
   * decides which modes a direction may offer.
   */
  keys: ['G mixolydian', 'D mixolydian', 'A mixolydian'],

  /**
   * Eight sections, 122 bars, two climbs, and the handover written into the energies.
   *
   * Energies 0.2 / 0.45 / 0.6 / 0.8 / 0.3 / 0.65 / 0.9 / 0.15 land on bands
   * 0 / 1 / 2 / 3 / 1 / 2 / 3 / 0 at the neutral detent, and the two parts take four of those
   * each — the bass Enter, Walk, Press and Haul, the lead the other four. Because the split is
   * not an alternation, each part sees a *different shape* rather than a different phase: the
   * bass climbs `0 1 3 3` and never comes down, and the lead runs `2 1 2 0` and never gets above
   * the middle. Neither hears the whole arc, which is why the piece needs both of them and why
   * the guide has two quite different sets of variants to print.
   *
   * The bars are asymmetric and the second climb is the longer one — 20 bars of Press against 24
   * of Haul — so the piece leans forward rather than settling into a repeat of itself.
   */
  structure: [
    { name: 'Enter', bars: 8, energy: 0.2 },
    { name: 'Walk', bars: 16, energy: 0.45 },
    { name: 'Trade', bars: 12, energy: 0.6 },
    { name: 'Press', bars: 20, energy: 0.8 },
    { name: 'Ease', bars: 10, energy: 0.3 },
    { name: 'Reply', bars: 18, energy: 0.65 },
    { name: 'Haul', bars: 24, energy: 0.9 },
    { name: 'Depart', bars: 14, energy: 0.15 },
  ],

  /**
   * §4.1. Eight bars that do not divide evenly: three, two, two, one.
   *
   * Three bars of `I` puts the change in the middle of a bar-pair rather than on it, `VII` and
   * `IV` are the two chords the flat seventh buys, and the single bar of minor `v` at the end is
   * a door left open — the cycle restarts on the tonic from a chord that wanted to go somewhere
   * else. Over an eight-section structure whose sections are 8 to 24 bars long, that cycle lands
   * in a different place in every section.
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 3 },
      { degree: 'VII', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'v', bars: 1 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Two per part, so the seed has a choice on both sides of the
   * handover, and every one of them is **monophonic** — the direction's whole point is that one
   * voice can carry it, and a hook needing two notes at once would take that back.
   *
   * The bass hooks are two bars against the lead's four. That is the relationship the piece is
   * built on: the low part is a figure that repeats and the high part is a line that goes
   * somewhere, and they are never heard together to be compared.
   */
  hooks: [
    {
      // Root-heavy: the tonic twice a bar, with the seventh underneath as the only step down.
      id: 'relay-hook-bass-1',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 7, degree: 1, octave: 0, len: 2 },
        { step: 15, degree: 7, octave: -1, len: 2 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 23, degree: 4, octave: 0, len: 4 },
        { step: 31, degree: 5, octave: 0, len: 2 },
      ],
    },
    {
      // The same two bars walked rather than pumped: one long tonic, then a descent that arrives
      // at the fourth on the second downbeat instead of returning to the root.
      id: 'relay-hook-bass-2',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 8 },
        { step: 11, degree: 5, octave: -1, len: 2 },
        { step: 15, degree: 1, octave: 0, len: 2 },
        { step: 17, degree: 4, octave: 0, len: 6 },
        { step: 25, degree: 7, octave: -1, len: 4 },
        { step: 31, degree: 1, octave: 0, len: 2 },
      ],
    },
    {
      // Four bars falling from the fifth to the tonic an octave up and back — the reply that
      // answers the bass by going the other way.
      id: 'relay-hook-lead-1',
      forRole: 'lead',
      bars: 4,
      baseOctave: 4,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 6 },
        { step: 11, degree: 4, octave: 0, len: 2 },
        { step: 17, degree: 3, octave: 0, len: 6 },
        { step: 27, degree: 2, octave: 0, len: 2 },
        { step: 33, degree: 1, octave: 1, len: 8 },
        { step: 45, degree: 7, octave: 0, len: 2 },
        { step: 49, degree: 5, octave: 0, len: 12 },
      ],
    },
    {
      // The flat seventh in the second step, which is the mode saying its own name, and a long
      // fifth to finish on so the line hands back without resolving.
      id: 'relay-hook-lead-2',
      forRole: 'lead',
      bars: 4,
      baseOctave: 4,
      notes: [
        { step: 1, degree: 1, octave: 1, len: 4 },
        { step: 7, degree: 7, octave: 0, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 6 },
        { step: 23, degree: 6, octave: 0, len: 2 },
        { step: 33, degree: 4, octave: 0, len: 4 },
        { step: 39, degree: 5, octave: 0, len: 2 },
        { step: 45, degree: 1, octave: 1, len: 4 },
        { step: 57, degree: 5, octave: 0, len: 8 },
      ],
    },
  ],

  /**
   * §4.4. Two requests, both `transient`, and **their section sets do not intersect**.
   *
   * That is the entire mechanism. §4.2's occupancy is keyed on `(assignable, section)`, so a
   * voice carrying the bass through Enter is free to carry the lead through Trade — and a rig
   * with exactly one voice fills both requests rather than contending one of them out. Every
   * section is claimed exactly once between them, so there is no bar of this piece with nothing
   * in it and no bar with two things fighting for one box.
   *
   * `dark` and `bright` are §3.4 **opposites** — the two ends of the tone axis, squared distance
   * 4 — and that is a fact about the piece rather than about resolution: a bass under the floor
   * answered by a lead over the top of it. No substitution is ever attempted *between* them,
   * because they belong to two different roles and §3.5 only ever substitutes within one.
   *
   * What matters for a small rig is each character's own neighbourhood, and both are well
   * placed: `dark` reaches `dirty`, `soft`, `clean` and `hard` at distance 2 and is refused only
   * by `bright`, and the same in reverse. That is what the CRAVE actually exercises — it authors
   * a `dirty` bass and no `dark` one, so the request substitutes at distance 2 and the direction
   * resolves rather than reporting `no-recipe`. Asking for a character with a narrower
   * neighbourhood would have made this a direction one particular box can carry alone.
   */
  roles: [
    {
      id: 'r-bass-mid',
      role: 'bass-mid',
      priority: 1,
      character: 'dark',
      sustain: 'transient',
      sections: ['Enter', 'Walk', 'Press', 'Haul'],
    },
    {
      id: 'r-lead',
      role: 'lead',
      priority: 2,
      character: 'bright',
      sustain: 'transient',
      sections: ['Trade', 'Ease', 'Reply', 'Depart'],
    },
  ],

  patterns: PATTERNS,
}
