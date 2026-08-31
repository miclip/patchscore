import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Lydian House (§4). **Seven parts, all of them sounding at once, and a rig of one box fits.**
 *
 * Relay already answers the single *monophonic* box, and it answers it by taking turns: both
 * requests are `transient`, their section sets are disjoint, and §4.2's occupancy is per voice
 * *per section*, so one voice carries both. That is a real way people work and it is finished work.
 *
 * It is not the case #81 was filed about. That report is a groovebox holding eight parts at once
 * and being told it has four holes — a box with *several* voices, playing several parts
 * simultaneously, against directions written for a rack. Taking turns does nothing for it. What
 * it needs is a direction whose whole request list is small enough to *fit*, with every part
 * playing at the same time as every other one.
 *
 * So: **seven `continuous` requests, no transients, nothing taking turns.** Three of them are
 * tonal and four are drums, which is the shape of a box with a handful of pitched voices and a
 * few percussion ones. A rig that can sound seven parts together finishes this, and one that
 * cannot is short of something real rather than short of a rack.
 *
 * **Nothing here names a device** (invariant 3). "Three tonal parts" is a fact about the music —
 * a bass, a chord and an accent over it — and the template does not know whether the rig it
 * lands on has three pitched voices or thirty.
 *
 * The direction in one line: a four-note chord that never resolves, a bass under it and a stab
 * over it, on a raised fourth that keeps the whole thing hanging.
 *
 * ## What it does that nothing else in the registry does
 *
 *  - **Lydian**, the last diatonic mode with a usable major tonic that no direction had claimed.
 *    The raised fourth is not decoration here, it is the cycle: `II7` below is a major chord on
 *    the second degree with the #4 as its third, and it exists in no other mode this library
 *    offers. Authoring it and then offering a key without it would ask the reader to play a
 *    chord the key does not contain — the same argument Drone Study makes for `bII` in phrygian
 *    and Ambient Dub for its dorian `IV`, and the argument that decides which modes a direction
 *    may offer at all.
 *  - **The tonal side is priority 1 and the drums are not.** Every other direction here puts a
 *    kick at the top of the list. This one puts the pad and the bass there, because a house
 *    record with no chord is a drum loop and a house record with no kick is still the record.
 *  - **Square phrases, on purpose.** Every section is a multiple of 8 bars and the harmonic
 *    cycle is 8, so the chord change and the phrase boundary are always the same bar. Drone
 *    Study deliberately puts them out of phase and says why; this direction wants the opposite,
 *    because the thing a reader is building here is a loop they can drop in and out of.
 *  - **Two requests declared inessential, and both are real.** A direction that declares none is
 *    claiming it needs all of them, which for most genres is false (§4.4/#81). The stab and the
 *    open hat are what this one can do without, and they are the last two on the list rather
 *    than a token at the bottom.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`.
 *
 * **The pad has no variants, and that is the same call Ambient Dub makes for its `texture`:**
 * four bands of invented 16ths would be the guide lying about what the part does. The pad here
 * is four notes held for the length of a chord — the hook below *is* its rhythm, and the only
 * decision left is where the voicing changes, which the progression already answers. Every
 * other part is programmed, because every other part is a thing you step in.
 *
 * Lengths are mixed on purpose. The kick, the clap and the closed hat are one bar, because a
 * house groove that changes across two is not a groove. The bass, the stab and the open hat are
 * two, so the parts a listener follows have somewhere to go and the parts holding the floor do
 * not.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // Four-on-the-floor from band 1 and never anything else: this is the one part in the piece
  // that is not allowed an idea. What grows is underneath it — a 16th before the bar line at
  // band 2, two more inside it at band 3 — so the kick gets a push rather than a pattern.
  variant('house-kick-b0', 'kick', 0, 16, on('downbeat', 1, 9)),
  variant('house-kick-b1', 'kick', 1, 16, on('downbeat', 1, 5, 9, 13)),
  variant('house-kick-b2', 'kick', 2, 16, on('downbeat', 1, 5, 9, 13), at('ghost', 42, 16)),
  variant(
    'house-kick-b3',
    'kick',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    at('ghost', 42, 4, 12, 16),
  ),

  // ---- clap ---------------------------------------------------------------------------
  // The part that states the backbeat, so it takes the slot. Band 0 is beat 4 alone, which is
  // the half-time entry, and beat 2 only arrives at band 1 — the clap is the last thing to
  // commit to the bar.
  // ---- ghost-perc ---------------------------------------------------------------------
  // Odd sixteenths only. The kick owns 1, 5, 9 and 13 and the clap owns the backbeat, so a low
  // hit anywhere on a quarter would be competing with one of them for the same air. These land
  // in the gaps, at velocities in the 40s — felt rather than heard, which is the whole part.
  variant('house-ghost-perc-b0', 'ghost-perc', 0, 16, at('ghost', 44, 7)),
  variant('house-ghost-perc-b1', 'ghost-perc', 1, 16, at('ghost', 44, 7, 15)),
  variant('house-ghost-perc-b2', 'ghost-perc', 2, 16, at('ghost', 42, 3, 7, 11, 15)),
  variant(
    'house-ghost-perc-b3',
    'ghost-perc',
    3,
    16,
    at('ghost', 40, 3, 7, 11, 15),
    at('ghost', 34, 6, 14),
  ),

  variant('house-clap-b0', 'clap', 0, 16, on('backbeat', 13)),
  variant('house-clap-b1', 'clap', 1, 16, on('backbeat', 5, 13)),
  variant('house-clap-b2', 'clap', 2, 16, on('backbeat', 5, 13), at('ghost', 40, 15)),
  variant(
    'house-clap-b3',
    'clap',
    3,
    16,
    on('backbeat', 5, 13),
    at('ghost', 40, 8, 12, 15),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // The offbeat 8ths are the genre. Band 0 has two of the four, so the hat is already leaning
  // off the grid before it is keeping time, and the 16ths that arrive later land *on* the beats
  // the hat has been avoiding — the shuffle fills in from the wrong side.
  variant('house-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 11)),
  variant('house-closed-hat-b1', 'closed-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'house-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 36, 5, 13),
  ),
  variant(
    'house-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 36, 2, 5, 10, 13),
  ),

  // ---- open-hat -----------------------------------------------------------------------
  // Two bars, and it is the sparsest part in the piece at every band: one hit in thirty-two
  // steps at band 0, six at band 3. The open hat is a punctuation mark here, not a layer, which
  // is why the direction can do without it — and the accent at 19 is off the pattern's own grid
  // of offbeats, so at its busiest the part leans somewhere nothing else is.
  variant('house-open-hat-b0', 'open-hat', 0, 32, on('offbeat', 31)),
  variant('house-open-hat-b1', 'open-hat', 1, 32, on('offbeat', 15, 31)),
  variant('house-open-hat-b2', 'open-hat', 2, 32, on('offbeat', 7, 15, 23, 31)),
  variant(
    'house-open-hat-b3',
    'open-hat',
    3,
    32,
    on('offbeat', 3, 7, 15, 23, 31),
    at('accent', 104, 19),
  ),

  // ---- bass-mid -----------------------------------------------------------------------
  // Two bars, and it states the two downbeats before anything else: the bass is holding the
  // floor with the kick, so it cannot start by hiding from the bar line. What grows is the 8th
  // before each bar — the lift into the next one — and only at band 3 does the part fill in the
  // middle of the bars it has been bracketing.
  variant('house-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1, 17)),
  variant('house-bass-mid-b1', 'bass-mid', 1, 32, on('downbeat', 1, 17), on('offbeat', 15, 31)),
  variant(
    'house-bass-mid-b2',
    'bass-mid',
    2,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 15, 31),
  ),
  variant(
    'house-bass-mid-b3',
    'bass-mid',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 7, 15, 23, 31),
    at('ghost', 44, 20),
  ),

  // ---- stab ---------------------------------------------------------------------------
  // Two bars, and every hit at every band is off the beat. That is the whole part: the pad is
  // already holding the chord on the downbeats, so a stab that agreed with it would be a
  // thickening rather than an answer. Band 3 finally puts one on the accent at 11, which is the
  // only place in the piece a chord lands somewhere the ear was not holding.
  variant('house-stab-b0', 'stab', 0, 32, on('offbeat', 7)),
  variant('house-stab-b1', 'stab', 1, 32, on('offbeat', 7, 23)),
  variant('house-stab-b2', 'stab', 2, 32, on('offbeat', 7, 15, 23, 31)),
  variant(
    'house-stab-b3',
    'stab',
    3,
    32,
    on('offbeat', 3, 7, 15, 19, 23, 31),
    at('accent', 102, 11),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const lydianHouse: Template = {
  id: 'lydian-house',
  name: 'Lydian House',

  /** Narrow, and centred where a four-on-the-floor kick is a pulse rather than a march. */
  bpm: { min: 118, max: 126, default: 122 },

  /**
   * Lydian throughout, and only lydian. `II7` below is a major chord built on the second degree
   * with the raised fourth as its third; in every other mode this library offers, that degree is
   * minor or diminished and the chord does not exist. Offering a key without it would ask the
   * reader to play a chord the key does not contain, in a guide whose promise is that the values
   * on the page are the values to dial.
   *
   * Three tonics rather than one, because §4.1 gives the seed a choice, and all three spell the
   * raised fourth without a double sharp: F lydian raises to B, C lydian to F#, A lydian to D#.
   */
  keys: ['F lydian', 'C lydian', 'A lydian'],

  /**
   * Seven sections, 160 bars, and the dip is before the peak rather than after it.
   *
   * Energies 0.15 / 0.4 / 0.65 / 0.45 / 0.8 / 0.6 / 0.1 land on bands 0 / 1 / 2 / 1 / 3 / 2 / 0
   * at the neutral detent. Every other direction here climbs to its top band and *then* comes
   * down; this one falls back a band at Turn, having already reached 2, and only then goes to 3.
   * That is the shape of a record built to be mixed: the reader needs somewhere to bring another
   * one in, and it has to be a section rather than a bar.
   *
   * **Every length is a multiple of 8.** With an 8-bar cycle that puts every chord change on a
   * phrase boundary and every phrase boundary on a chord change, which is the opposite of what
   * Drone Study does and deliberate for the opposite reason: a loop somebody drops in and out of
   * has to be countable from across the room.
   */
  structure: [
    { name: 'Open', bars: 16, energy: 0.15 },
    { name: 'Groove', bars: 32, energy: 0.4 },
    { name: 'Lift', bars: 24, energy: 0.65 },
    { name: 'Turn', bars: 16, energy: 0.45 },
    { name: 'Drop', bars: 32, energy: 0.8 },
    { name: 'Float', bars: 24, energy: 0.6 },
    { name: 'Away', bars: 16, energy: 0.1 },
  ],

  /**
   * §4.1. Eight bars, four chords, and half of them are the tonic: `I` for four bars, `II7` for
   * two, then a bar each of `vi` and `V`.
   *
   * Four bars of one chord is the point rather than an economy. Lydian's colour is a *steady*
   * state — the raised fourth is only audible against a tonic that stays put long enough to be
   * heard as home — so the cycle spends half its length not moving and then moves three times in
   * three bars. `II7` is spelt as a seventh because that is the voicing the pad plays and the
   * chord the mode buys; `vi` and `V` are one bar each because a turnaround that took two would
   * make this an eight-bar progression with a four-bar tail rather than a loop.
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 4 },
      { degree: 'II7', bars: 2 },
      { degree: 'vi', bars: 1 },
      { degree: 'V', bars: 1 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Five hooks: one pad, two bass, two stab — two on each part
   * the seed can meaningfully reroll, and one on the part where a second voicing of the same
   * cycle would be the same hook written twice.
   *
   * Steps are the same 16ths-per-bar grid the patterns use, so eight bars runs 1..128. `degree`
   * is 1-based in the key and `octave` is an offset from the hook's own `baseOctave`, in
   * scientific pitch with middle C at C4 (§4.1). The bass sits two octaves under middle C, the
   * pad just under it and the stab above it, so the three tonal parts do not resolve into one
   * octave and fight — which on a rig with three pitched voices is the whole arrangement.
   *
   * **Nothing here voices more than four notes at once.** That is a musical decision and also
   * the honest one: the pad request asks for four (§12.4), and a hook that needed five would be
   * asking a rig to play a chord the direction never said it needed.
   */
  hooks: [
    {
      // Eight bars, one voicing per chord, each held for its own span — so the part changes
      // exactly four times in the cycle and never mid-chord. Every voicing is a seventh: the
      // triads are what makes lydian sound like major with a mistake in it, and the sevenths are
      // what makes it sound deliberate.
      id: 'house-hook-pad-1',
      forRole: 'pad',
      bars: 8,
      baseOctave: 3,
      notes: [
        // I, four bars. 1-3-5-7 with the seventh on top: the major seventh is a semitone under
        // the tonic and is the note that stops the chord sounding finished.
        { step: 1, degree: 1, octave: 0, len: 64 },
        { step: 1, degree: 3, octave: 0, len: 64 },
        { step: 1, degree: 5, octave: 0, len: 64 },
        { step: 1, degree: 7, octave: 0, len: 64 },
        // II7, two bars. 2-4-6 plus the tonic above: the raised fourth is the *third* of this
        // chord, which is the one place in the cycle the mode states its own name.
        { step: 65, degree: 2, octave: 0, len: 32 },
        { step: 65, degree: 4, octave: 0, len: 32 },
        { step: 65, degree: 6, octave: 0, len: 32 },
        { step: 65, degree: 1, octave: 1, len: 32 },
        // vi, one bar. The only minor chord in the cycle, and the voicing keeps the tonic in it.
        { step: 97, degree: 6, octave: 0, len: 16 },
        { step: 97, degree: 1, octave: 1, len: 16 },
        { step: 97, degree: 3, octave: 1, len: 16 },
        { step: 97, degree: 5, octave: 1, len: 16 },
        // V, one bar, and it does not resolve anywhere: the raised fourth is back in the chord
        // as its seventh, so the last bar of the cycle is still hanging when the first returns.
        { step: 113, degree: 5, octave: 0, len: 16 },
        { step: 113, degree: 7, octave: 0, len: 16 },
        { step: 113, degree: 2, octave: 1, len: 16 },
        { step: 113, degree: 4, octave: 1, len: 16 },
      ],
    },
    {
      // Root-led: two notes a bar, the second an 8th before the bar line, and the roots follow
      // the cycle exactly. The plain reading of the progression, and the one to reach for when
      // the pad is the part being listened to.
      id: 'house-hook-bass-1',
      forRole: 'bass-mid',
      bars: 8,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 6 },
        { step: 15, degree: 1, octave: 0, len: 2 },
        { step: 17, degree: 1, octave: 0, len: 6 },
        { step: 31, degree: 5, octave: -1, len: 2 },
        { step: 33, degree: 1, octave: 0, len: 6 },
        { step: 47, degree: 1, octave: 1, len: 2 },
        { step: 49, degree: 1, octave: 0, len: 6 },
        { step: 63, degree: 3, octave: 0, len: 2 },
        { step: 65, degree: 2, octave: 0, len: 6 },
        { step: 79, degree: 2, octave: 0, len: 2 },
        { step: 81, degree: 2, octave: 0, len: 6 },
        { step: 95, degree: 6, octave: -1, len: 2 },
        { step: 97, degree: 6, octave: -1, len: 8 },
        { step: 111, degree: 6, octave: -1, len: 2 },
        { step: 113, degree: 5, octave: -1, len: 8 },
        { step: 127, degree: 5, octave: -1, len: 2 },
      ],
    },
    {
      // The same eight bars octave-jumped: the root, its octave, then the fifth, three times a
      // bar. Twice the notes of the first hook and a different part rather than a busier one —
      // this is the bass being the thing that moves, which is the reroll worth having when the
      // stab is missing and the pad is the only other tonal part in the rig.
      id: 'house-hook-bass-2',
      forRole: 'bass-mid',
      bars: 8,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 4 },
        { step: 7, degree: 1, octave: 1, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 4 },
        { step: 17, degree: 1, octave: 0, len: 4 },
        { step: 23, degree: 3, octave: 0, len: 2 },
        { step: 27, degree: 1, octave: 1, len: 4 },
        { step: 33, degree: 1, octave: 0, len: 4 },
        { step: 39, degree: 1, octave: 1, len: 2 },
        { step: 43, degree: 5, octave: 0, len: 4 },
        { step: 49, degree: 1, octave: 0, len: 6 },
        { step: 59, degree: 7, octave: 0, len: 4 },
        { step: 65, degree: 2, octave: 0, len: 4 },
        { step: 71, degree: 2, octave: 1, len: 2 },
        { step: 75, degree: 6, octave: 0, len: 4 },
        { step: 81, degree: 2, octave: 0, len: 4 },
        { step: 87, degree: 4, octave: 0, len: 2 },
        { step: 91, degree: 2, octave: 1, len: 4 },
        { step: 97, degree: 6, octave: -1, len: 6 },
        { step: 105, degree: 3, octave: 0, len: 4 },
        { step: 113, degree: 5, octave: -1, len: 6 },
        { step: 121, degree: 2, octave: 0, len: 4 },
      ],
    },
    {
      // Two bars, three notes a hit, and **rootless**: 3-5-7 leaves the bottom of the chord to
      // the bass and the pad, which is what keeps three tonal parts out of each other's way on a
      // rig that has exactly three. Every hit is off the beat, matching the variants above.
      id: 'house-hook-stab-1',
      forRole: 'stab',
      bars: 2,
      baseOctave: 4,
      notes: [
        { step: 7, degree: 3, octave: 0, len: 2 },
        { step: 7, degree: 5, octave: 0, len: 2 },
        { step: 7, degree: 7, octave: 0, len: 2 },
        { step: 15, degree: 3, octave: 0, len: 1 },
        { step: 15, degree: 5, octave: 0, len: 1 },
        { step: 15, degree: 7, octave: 0, len: 1 },
        { step: 23, degree: 2, octave: 0, len: 2 },
        { step: 23, degree: 4, octave: 0, len: 2 },
        { step: 23, degree: 6, octave: 0, len: 2 },
        { step: 31, degree: 3, octave: 0, len: 2 },
        { step: 31, degree: 5, octave: 0, len: 2 },
        { step: 31, degree: 7, octave: 0, len: 2 },
      ],
    },
    {
      // The same two bars a fifth up and landing earlier — the first hit is on step 3, before
      // the closed hat's second offbeat, so this voicing arrives ahead of the groove rather than
      // inside it. The third hit borrows the `vi` shape, which is the one minor sound the piece
      // has and worth hearing in the accent part as well as in the pad.
      id: 'house-hook-stab-2',
      forRole: 'stab',
      bars: 2,
      baseOctave: 4,
      notes: [
        { step: 3, degree: 5, octave: 0, len: 2 },
        { step: 3, degree: 7, octave: 0, len: 2 },
        { step: 3, degree: 2, octave: 1, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 1 },
        { step: 11, degree: 7, octave: 0, len: 1 },
        { step: 11, degree: 2, octave: 1, len: 1 },
        { step: 19, degree: 6, octave: 0, len: 2 },
        { step: 19, degree: 1, octave: 1, len: 2 },
        { step: 19, degree: 3, octave: 1, len: 2 },
        { step: 27, degree: 5, octave: 0, len: 4 },
        { step: 27, degree: 7, octave: 0, len: 4 },
        { step: 27, degree: 2, octave: 1, len: 4 },
      ],
    },
  ],

  /**
   * §4.4. Seven requests, every one `continuous`, and that uniformity is the direction.
   *
   * A `transient` request is a part that owns a voice for a few sections (§4.2), and Relay makes
   * a whole direction out of two of them with disjoint sections. Nothing here is transient,
   * because the question this direction answers is the other one: **can a rig hold seven parts
   * at the same time**. Section-scoping any of them would let a smaller rig pass by taking
   * turns, which would make the fit number mean something else.
   *
   * Priority reads as: the two the record is made of; the three that make it move; and two that
   * are decoration. The kick is at 2 rather than 1 on purpose — a house record without a chord
   * is a drum loop, and a house record with a borrowed kick is still the record.
   *
   * Ids spell the role out rather than abbreviating it, for the reason Industrial Techno gives:
   * two-letter abbreviations are also how drum voices are conventionally labelled, and a reader
   * should never have to work out which side of the boundary an id came from.
   */
  roles: [
    // §12.4: a minimum note count, not a device name. Four rather than three because the
    // voicings above are sevenths throughout — a rig that can only sound three of the four
    // notes would be playing a triad under a guide that prints a seventh.
    { id: 'r-pad', role: 'pad', priority: 1, character: 'soft', sustain: 'continuous', polyphony: 4 },
    { id: 'r-bass-mid', role: 'bass-mid', priority: 1, character: 'dark', sustain: 'continuous' },

    { id: 'r-kick', role: 'kick', priority: 2, character: 'dark', sustain: 'continuous' },
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'clean',
      sustain: 'continuous',
    },
    { id: 'r-clap', role: 'clap', priority: 2, character: 'bright', sustain: 'continuous' },

    // §12.4 again: a stab is a chord hit. Three, not four — the voicings above are rootless
    // triads, so asking for a fourth note would be asking for a note the hook never plays.
    //
    // §4.4/#81: and its absence is not a hole. The pad is already holding the chord; this is
    // the accent over the top of it, and five parts of this list is a finished house record.
    // Not `optional`, though — where a rig has a third pitched voice the search should spend it
    // here rather than treat the part as a bonus.
    {
      id: 'r-stab',
      role: 'stab',
      priority: 3,
      character: 'clean',
      sustain: 'continuous',
      polyphony: 3,
      inessential: { reason: 'the pad already holds the harmony; this is the accent above it' },
    },

    // §4.4. Both halves, because they are two claims (#81): do not spend a voice on this, and
    // do not tell a reader their rig is short one. The closed hat is on every offbeat in the
    // bar already — an open hat here is punctuation, and the schema requires `inessential`
    // alongside `optional` precisely so a template cannot say the first without saying this.
    {
      id: 'r-open-hat',
      role: 'open-hat',
      priority: 4,
      character: 'soft',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'the closed hat already owns every offbeat there is' },
    },

    /**
     * §3.4/#300. **`dark` rather than `soft`, and the difference is where the hit sits.**
     *
     * Every `ghost-perc` in the library was authored `soft` — a shaker, air between the loud
     * hits — and every direction asked for `soft` or `clean`, so a box authoring anything else
     * was authoring something unreachable. This asks for the other one: a hit tuned under the
     * floor, filling the same holes with body instead of air.
     *
     * It suits this direction rather than a harder one because the groove here is already gentle
     * — the kick is `dark`, the pad is `soft`, the hats own the offbeats — so the space left
     * under it is low and wide. A shaker would be a fifth thing in the top half of the spectrum.
     *
     * The two characters are orthogonal, not opposed: `soft` is `force -1` and `dark` is
     * `tone -1`, distance 2, so §3.5 substitutes between them and the guide says it did. A rig
     * whose only ghost is a shaker still gets one, reported as the swap it is.
     */
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 4,
      character: 'dark',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'the groove reads without it; this is weight underneath' },
    },
  ],

  patterns: PATTERNS,
}
