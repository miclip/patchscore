import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Acid Lineage (§4). **The direction where the performance is not in the data.**
 *
 * `acid` is the best-authored role in the library that nothing asked for: 28 recipes across 20
 * boxes, every one of them unreachable from a guide until this file existed (#283). The gear was
 * there and the song was not.
 *
 * The direction in one line: one monophonic line through a resonant low-pass, a kick under it, a
 * hat and a clap around it, one chord for the whole piece, and a filter that the reader opens and
 * closes with their own hand across 136 bars.
 *
 * **Nothing here names a device** (invariant 3), which on this direction is harder than usual and
 * worth saying out loud: the whole idiom descends from one silver box, and every sentence below
 * that wants to name it says `acid` instead. The role is shared vocabulary; the box is not.
 *
 * ---------------------------------------------------------------------------
 * The filter is played, and this file will not pretend otherwise
 * ---------------------------------------------------------------------------
 *
 * **On this instrument the filter is performed live, by hand. It is not a sequenced parameter and
 * it never was — that is the technique, and it is why the idiom outlived the machine it came
 * from.** A direction that could schedule cutoff per section would be modelling a different
 * instrument.
 *
 * Which lands on a real limit, and the limit is stated rather than worked around: **a direction
 * cannot vary a device parameter across sections.** `Section` is `{ name, bars, energy }` and
 * nothing else; a recipe resolves once for the whole guide. #285 records that gap. It is not a
 * blocker here, and it may never be worth building, precisely because this direction turns out
 * not to need it.
 *
 * So the arc is expressed three ways, all of them honest, and none of them a number pretending to
 * be a performance:
 *
 *  - **The section names are the arc.** `Shut / Opening / Wide / Bite / Easing / Closing` is
 *    where the knob is, section by section, and the names are the one thing this layer can put in
 *    front of a reader at the top of every phase. On most directions a section name is a mood; on
 *    this one it is an instruction.
 *  - **The energy column beside them is its shape.** §6.3 reads `energy` for the pattern band, and
 *    here that lands as timbre rather than as instrumentation — nothing enters or leaves across
 *    the whole piece, so what the arrangement table actually shows is the trajectory of the
 *    filter, drawn as a bar.
 *  - **The recipe's own values are the starting point**, and they come from the device layer with
 *    a manual citation behind them, which is the only place a real cutoff number can come from.
 *
 * **What this file must never do is approximate the arc as a per-section recipe value.** A single
 * authored cutoff standing in for a movement is exactly the invention invariant 5 exists to stop:
 * it would read as a measured value, it would be a guess, and it would be a guess about the one
 * gesture the reader was going to make themselves anyway.
 *
 * ---------------------------------------------------------------------------
 * One chord, said once
 * ---------------------------------------------------------------------------
 *
 * The harmony is `i`, for the whole piece. Not a simplification and not a placeholder — the
 * movement in this music is timbral, and a four-chord cycle authored underneath would be a
 * progression no part is playing, which is #283's own warning and Drone Study's precedent one
 * layer further along. Drone Study implies two changes with one line; this one implies none,
 * because the line is a loop that does not move and the interest is in what happens to it.
 *
 * ---------------------------------------------------------------------------
 * Everything divides, and that is also the point
 * ---------------------------------------------------------------------------
 *
 * Drone Study makes its sections and its harmonic cycle land out of phase so that 132 bars of one
 * note does not read as a loop. This direction wants the opposite and states it: every section is
 * an even number of bars, every variant is one or two, the hook is two, so nothing is ever chained
 * short and the loop is exactly as locked as the idiom is. What stops 136 bars reading as a loop
 * here is the hand on the filter, not the arithmetic.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four bands for every role this direction requests
// ---------------------------------------------------------------------------

/**
 * The grid, the slots and the meaning of a band all live in `../core/authoring`.
 *
 * **What a band means on the `acid` part is worth reading before the numbers.** Its hook is a held
 * line (see `reArticulatesHook` on the request below), so a hit here is not a note — it is a place
 * the note is *struck again*, and every step between two strikes is a step where the line is tied
 * over: the slide. So the bands are a slide-to-strike ratio, read backwards. Band 0 is two strikes
 * in two bars and everything else slid; band 3 is fifteen strikes in the same two bars and almost
 * nothing slid. That is the sequenced half of this idiom, and it is the half the density knob can
 * actually move.
 *
 * **Accents are the other half, and the library's convention constrains them**, so this file says
 * where it lands rather than quietly working around it: at most one `accent` per variant (the rule
 * every template here keeps), so the accent slot marks the one step the bar leans on, and the
 * growth from band to band shows up as strikes and as `ghost` steps — the quiet ones an accented
 * line is quiet *against*. A device that documents per-step accent picks the slot up through
 * `PatternSlot` and articulates it; one that does not is playing the same line flat, and the guide
 * says so rather than inventing the gesture.
 */
const PATTERNS: Pattern[] = [
  // ---- acid ---------------------------------------------------------------------------
  // Two bars, matching the hooks, so the strike map and the pitch line turn over together.
  // Beats fall on 1, 5, 9, 13, 17, 21, 25, 29; 8th offbeats on 3, 7, 11, 15, 19, 23, 27, 31.
  //
  // Band 0 is the line at its most tied: one strike per bar, everything between them slid. This
  // is the section a reader spends with the filter shut, and there is almost nothing to hear
  // except the shape of the envelope on two notes.
  variant('acid-acid-b0', 'acid', 0, 32, on('downbeat', 1), at('accent', 112, 17)),
  // Band 1 adds the first off-beat strike. Two per bar plus the lean, which is where the line
  // starts to have a rhythm of its own rather than a pulse.
  variant(
    'acid-acid-b1',
    'acid',
    1,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 11),
    at('accent', 110, 25),
  ),
  // Band 2 is the shape most people hear as the idiom: on-beat strikes with 8ths between them,
  // and the accent late in the second bar so the loop pushes into its own repeat.
  variant(
    'acid-acid-b2',
    'acid',
    2,
    32,
    on('downbeat', 1, 9, 17),
    on('offbeat', 7, 15, 23, 31),
    at('accent', 110, 25),
  ),
  // Band 3 strikes fifteen of thirty-two steps, and the three ghosts are the point of it: an
  // accented line needs quiet steps to be accented against, and at this density the ties are
  // scarce enough that the contrast has to come from velocity instead.
  variant(
    'acid-acid-b3',
    'acid',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 3, 7, 11, 15, 19, 23, 31),
    at('ghost', 45, 6, 14, 22),
    at('accent', 114, 27),
  ),

  // ---- kick ---------------------------------------------------------------------------
  // Under the line and out of its way. Band 1 is the four-to-the-floor this music is built on,
  // and the bands either side of it are the only places the pulse is allowed to be interesting:
  // half-time at 0, and at 3 the accent moves to beat 3 so the bar leans against the backbeat.
  variant('acid-kick-b0', 'kick', 0, 16, on('downbeat', 1, 9)),
  variant('acid-kick-b1', 'kick', 1, 16, on('downbeat', 1, 5, 9, 13)),
  variant('acid-kick-b2', 'kick', 2, 16, on('downbeat', 1, 5, 9, 13), at('ghost', 50, 16)),
  variant(
    'acid-kick-b3',
    'kick',
    3,
    16,
    on('downbeat', 1, 5, 13),
    at('accent', 110, 9),
    at('ghost', 48, 8),
    at('ghost', 56, 16),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // Offbeat 8ths, then 16ths filling in between them. Never on the beat: the kick owns beat 1
  // through 4 in every band above, and a hat doubling it takes the air out of the offbeat that
  // this music runs on.
  variant('acid-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 11)),
  variant('acid-closed-hat-b1', 'closed-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'acid-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 42, 2, 6, 10, 14),
  ),
  variant(
    'acid-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 40, 2, 4, 6, 8, 10, 12, 14),
    at('accent', 104, 16),
  ),

  // ---- clap ---------------------------------------------------------------------------
  // The backbeat, and the only role here that uses that slot. Band 0 states beat 4 alone; by
  // band 3 the second backbeat is an accent with a 16th either side of it.
  variant('acid-clap-b0', 'clap', 0, 16, on('backbeat', 13)),
  variant('acid-clap-b1', 'clap', 1, 16, on('backbeat', 5, 13)),
  variant('acid-clap-b2', 'clap', 2, 16, on('backbeat', 5, 13), at('ghost', 46, 12)),
  variant(
    'acid-clap-b3',
    'clap',
    3,
    16,
    on('backbeat', 5),
    at('accent', 110, 13),
    at('ghost', 46, 12),
    at('ghost', 42, 14),
  ),

  // ---- sub ----------------------------------------------------------------------------
  // Two bars, and deliberately the sparsest thing in the file. The acid line is already the
  // bass; this is the fundamental under it, so it lands on the bar and gets out of the way.
  // Band 3 is seven strikes in two bars, which on any other direction would be band 1.
  variant('acid-sub-b0', 'sub', 0, 32, on('downbeat', 1)),
  variant('acid-sub-b1', 'sub', 1, 32, on('downbeat', 1, 17)),
  variant('acid-sub-b2', 'sub', 2, 32, on('downbeat', 1, 17), on('offbeat', 15, 31)),
  variant(
    'acid-sub-b3',
    'sub',
    3,
    32,
    on('downbeat', 1, 9, 17, 25),
    on('offbeat', 15, 31),
    at('ghost', 48, 8),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const acidLineage: Template = {
  id: 'acid-lineage',
  name: 'Acid Lineage',

  /**
   * The genre's ordinary range, and the default sits at the bottom of it on purpose. A filter
   * being opened by hand across sixteen bars is a gesture with a speed, and above about 132 the
   * gesture stops being audible as a movement and starts being audible as a jump.
   */
  bpm: { min: 122, max: 136, default: 126 },

  /**
   * Natural minor, three keys, and no mode that needs justifying. The hooks below reach the flat
   * seventh and the minor third and nothing else, so every key here contains every degree either
   * hook asks for — which is the same test Drone Study's phrygian and Ambient Dub's dorian pass,
   * arrived at from the other direction: a mode is offered because the notes are in it, not
   * because it sounds like the genre.
   */
  keys: ['A minor', 'C minor', 'D minor'],

  /**
   * Six sections, 136 bars, **and the names are the filter arc**.
   *
   * `Shut / Opening / Wide / Bite / Easing / Closing`, and the reader is meant to do exactly
   * what those say: start with the cutoff nearly shut, take 56 bars to open it, let resonance
   * bite at the crest, then bring it back — faster than it went out, because that is how the
   * gesture actually goes. The opening takes 68 bars and the closing takes 32.
   *
   * Energies 0.05 / 0.3 / 0.55 / 0.95 / 0.6 / 0.1 land on bands 0 / 1 / 2 / 3 / 2 / 0 at the
   * neutral detent, so the energy column beside the names traces the same curve — and since
   * nothing enters or leaves this arrangement, that column is reading as timbre rather than as
   * instrumentation. The band vector is not a palindrome and the bars are not symmetric, which
   * is the difference between this arc and Drone Study's: a drone goes out and comes home by the
   * same road, and a filter sweep does not.
   *
   * Every section is an even number of bars, so the two-bar patterns and the two-bar hook chain
   * whole and nothing is ever stopped short (#105).
   *
   * **`Shut` rather than `Closed`, and the reason is a check rather than a preference.** Section
   * names are needles in `test/inspirations.test.ts`'s substring scan (*"contains no template id,
   * name, section or pattern id as a substring"*), and `closed` is a substring of every
   * `closed-hat` identifier an inspiration authors — so the obvious word for a shut filter would
   * have failed a layering check it has nothing to do with. The word that survives says the same
   * thing, and the two-net design is working as intended: the token check exempts `closed` as
   * shared vocabulary, and the substring net does not, which is what makes it the stricter one.
   */
  structure: [
    { name: 'Shut', bars: 12, energy: 0.05 },
    { name: 'Opening', bars: 24, energy: 0.3 },
    { name: 'Wide', bars: 32, energy: 0.55 },
    { name: 'Bite', bars: 36, energy: 0.95 },
    { name: 'Easing', bars: 20, energy: 0.6 },
    { name: 'Closing', bars: 12, energy: 0.1 },
  ],

  /**
   * §4.1. **One chord, and the file's header says why at length.** Four bars is not a cycle of
   * changes, it is the rate at which the guide restates the one centre everything is played
   * against — two turns of the hook. Authoring a progression under a part that never leaves the
   * tonic would put a chord sequence on the page that nothing in the rig is playing, which is
   * §4.1's own standard and #283's explicit instruction.
   */
  harmony: {
    cycleBars: 4,
    progression: [{ degree: 'i', bars: 4 }],
  },

  /**
   * §4.1. Two hooks for the one tonal part, both two bars, both monophonic, and both **held
   * lines rather than figures** — which is what makes the variants above a map instead of a
   * second rhythm. A note here is sounding for six to twenty-two steps while the variant strikes
   * inside it several times over.
   *
   * They disagree about where the line goes rather than decorating each other. `baseOctave` is 1,
   * so the tonic is two octaves below middle C (§4.1) — this part is the bass of the piece, and
   * a hook that sat any higher would be asking for a lead.
   */
  hooks: [
    {
      // The pedal: nearly a bar and a half on the tonic, then up an octave and back through the
      // flat seventh. One long note and two short ones, which is the shape the strike map has the
      // most to say about — most of the strikes in every band land inside that first note.
      id: 'acid-hook-pedal',
      forRole: 'acid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 22 },
        { step: 23, degree: 1, octave: 1, len: 6 },
        { step: 29, degree: 7, octave: 0, len: 4 },
      ],
    },
    {
      // The other reading of the same two bars: it stays in one octave and walks the triad
      // instead of jumping it. Where the pedal is a line with one event in it, this one has three,
      // so a reroll changes whether the part is a drone being filtered or a figure being filtered.
      id: 'acid-hook-triad',
      forRole: 'acid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 16 },
        { step: 17, degree: 3, octave: 0, len: 6 },
        { step: 23, degree: 5, octave: 0, len: 6 },
        { step: 29, degree: 1, octave: 0, len: 4 },
      ],
    },
  ],

  /**
   * §4.4. Five requests, which makes this the second-smallest direction in the library, and the
   * count is the direction rather than an omission: acid is a line, a pulse and the two things
   * that keep time around it. A sixth part would be a different genre with a filter sweep in it.
   *
   * **Exactly one request at priority 1, and that is the whole shape of this list.** §4.4 makes a
   * miss at priority 1 worse than any number of misses at 2, so on a rig with one voice going
   * spare the line wins and everything else queues behind it. With the kick at 1 as well — which
   * is how this was first written — a one-voice monosynth resolved to a kick and reported the acid
   * line as a gap, on a direction named for the line, decided by a seed tie-break between two
   * equal costs. Seven boxes in the library did exactly that.
   *
   * So it reads as: the one that *is* the song; the pulse under it; the two that keep time around
   * it; and one that adds weight if a rig has a part going spare.
   */
  roles: [
    /**
     * §4.3. **`reArticulatesHook`, and this is the musical claim behind it.**
     *
     * Both hooks above are held lines — 22, 16 and 6-step notes over two bars — and the variants
     * strike between two and fifteen times in that same span. So the two layers are not competing
     * rhythms: there is one note sounding at any moment, and the only rhythmic question this part
     * contains is where it is struck again. On this instrument the steps in between are not rests,
     * they are ties, and a tie into the next step is the slide. Calling the variants a second grid
     * would print the hook alone (#100), and the direction would lose the slide map, the accent
     * placement and everything the density knob does — which on a five-part direction is most of
     * what a reader has to work with.
     *
     * ## `hard`, and the reason is §3.4's geometry rather than a count
     *
     * The obvious answer is `dirty` — 17 of the 28 authored `acid` recipes are `dirty`, 9 are
     * `bright` and 2 are `hard` — and it was the answer here first. It is the wrong one, because
     * of what a *request* character does: mood moves it (§6.2), and it can only move along the two
     * axes the mood knobs touch. `resolveCharacter` adds tone from `darkness` and grit from
     * `grit`, and there is no force knob, so a request pinned anywhere on the force axis can be
     * pushed off it while a request pinned off it can never be pushed on.
     *
     * From `hard` the three authored families are all one knob away, and the tie-breaks are code
     * unit order rather than luck:
     *
     *   neutral        (1, 0, 0)  →  `hard` exactly
     *   grit 100       (1, 0, 1)  →  ties `hard` with `dirty`, and `dirty` sorts first
     *   darkness 0     (1, 1, 0)  →  ties `hard` with `bright`, and `bright` sorts first
     *
     * From `dirty` the force axis is unreachable at any setting of any knob, so the two `hard`
     * recipes in the library are unreachable from this direction and would stay so. `hard` is the
     * gateway; `dirty` is a cul-de-sac with more parking.
     *
     * **What it costs, recorded because it is a real cost and not a rounding error.** The neutral
     * default moves on six boxes, and two of those moves are away from the idiom's centre: the
     * Mother-32 now opens on its hi-pass line rather than the resonant low-pass one, and the
     * Minitaur opens on `minitaur-acid-hard`, which is the one acid recipe in the library with
     * `GLIDE Off` — an acid line with no slide, on a direction whose header is half about the
     * slide. Both are one turn of a knob from the recipe a reader probably wanted, and the guide
     * says which knob. That is the trade: a worse default on six rigs, against nine recipes and a
     * whole character family that no setting of any knob could otherwise reach.
     */
    {
      id: 'r-acid',
      role: 'acid',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
      reArticulatesHook: true,
    },
    { id: 'r-kick', role: 'kick', priority: 2, character: 'hard', sustain: 'continuous' },

    // `bright` on both: this is the thin, dry end of a drum machine rather than the room-heavy
    // end, and it is also the best-served character each of these roles has.
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 3,
      character: 'bright',
      sustain: 'continuous',
    },
    { id: 'r-clap', role: 'clap', priority: 3, character: 'bright', sustain: 'continuous' },

    /**
     * §4.4/#81. Not `optional` — where a rig has a part going spare the search should spend it
     * here — but the direction is finished without it, and a reader whose box is full should not
     * be told they are short of anything. The acid line is already the bass; this is the
     * fundamental underneath it.
     */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 4,
      character: 'dark',
      sustain: 'continuous',
      inessential: { reason: 'the squelch already owns the bottom; a part under it is weight' },
      // §4.1/#334. The root, at the octave every authored `sub` hook uses. See industrial-techno.
      pitch: { degree: 1, baseOctave: 1 },
    },
  ],

  patterns: PATTERNS,
}
