import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Drum and Bass (§4). The bass is the subject and the drums are the grid.
 *
 * ---------------------------------------------------------------------------
 * The bar, and why it is heard at half its tempo
 * ---------------------------------------------------------------------------
 *
 * A two-step puts the kick on beat 1 and the snare on beat 3. At 172 that is one kick and one
 * snare every 1.4 seconds, which the ear hears as a backbeat at 86. That is the whole of the
 * half-time feel this music is named for, and it is a property of where two drum hits fall in
 * one bar at the stated tempo. The hats keep the 172 audible. The bass sits between the two
 * rates and carries the tune.
 *
 * So the 16-step bar below is a bar at 172, with beats on steps 1, 5, 9 and 13. It is not a
 * half-time bar, and the tempo field is not to be read at 86. `bpm` here means what it means on
 * every other direction. Somebody programming this on a box set to 172 puts the kick on step 1
 * and the snare on step 9, and hears the result at 86 without anything being divided.
 *
 * A break with snares on beats 2 and 4 at this tempo is the other genre in the family, and it is
 * the one `breakbeat` (#307) already ships. So this grid is the idiom first, and being
 * distinguishable from that file is what follows from it. The two are checkable side by side:
 *
 *  - `breakbeat`: a 32-step snare on 5, 13, 21 and 27, whose second bar refuses the first; a
 *    kick that states step 1 and no other beat in two bars; the snare carries `backbeat`; the
 *    sub holds two roots over four bars and has no variants; the snare is priority 1.
 *  - here: a 16-step kick on 1 and snare on 9, both fixed at every band; the same bar every bar;
 *    no `backbeat` anywhere; the sub is a line of five or six notes over eight bars, hooked and
 *    patterned, and the one part whose stated rhythm the density knob moves; the sub is
 *    priority 1.
 *
 * The one stated drum step the two directions share is the kick's step 1.
 *
 * **Nothing here names a device** (invariant 3).
 *
 * ---------------------------------------------------------------------------
 * The bass is the subject, in fields rather than in prose
 * ---------------------------------------------------------------------------
 *
 * Three things put the bass at the centre, and each is a field a reader can check.
 *
 * **Priority.** `r-sub` is alone at 1. The kick and the snare are at 2. There is no `lead`
 * request, so nothing else is asking to be the tune.
 *
 * **Sustain.** `r-sub` is the only `continuous` request besides the pad. It is present from the
 * first bar of the intro to the last bar of the outro, and in the `Breakdown` the drums leave and
 * the bass stays. `breakbeat` is built the other way round: its pad never leaves and its sub is
 * absent from four sections of seven, so its interior collapse leaves a drum standing. Ours
 * leaves the bass.
 *
 * **What the density knob reaches, and what it does not.** Every patterned role here has four
 * bands and the knob moves all of them: the hats thicken, the kick gains pickups, the snare and
 * the percussion gain ghosts. What it never moves is which beats the drums state. Step 1 and
 * step 9 are struck at every band and no third beat is ever added, so the drum bar's shape is
 * the same at density 0 and at 100. The sub is the one part whose stated rhythm the knob changes,
 * through `reArticulatesHook` below: at band 0 it is struck once a bar and at band 3 five times.
 * In `breakbeat` the sub has no variants at all and the knob moves the break.
 *
 * ---------------------------------------------------------------------------
 * §0. The sub is hooked and patterned, and the flag says which half is which
 * ---------------------------------------------------------------------------
 *
 * `r-sub` carries `reArticulatesHook: true` (§4.3), on the reading `weave` gives its own sub:
 * the hook says which notes, the variants say where the held note is struck again. Both halves
 * are defended here because the flag is a musical claim and `test/templates.test.ts` pins the
 * set of requests that carry it.
 *
 * The hooks are held pitch. `dnb-hook-sub-1` is six notes over eight bars, none shorter than a
 * bar, each sustained until the next begins. `dnb-hook-sub-2` sits three bars on a note twice
 * and spends its last bar on a turnaround. Neither has a rhythm a reader could tap. What they
 * have is a line: four pitches in the first, five in the second, over one cycle of the harmony.
 * That is the tune, and it is where this direction differs from a held root.
 *
 * The variants are the re-articulation map. Band 0 strikes the note once a bar, with the kick.
 * Band 1 adds the strike after the snare, on the *and* of 3, which is the reese answering the
 * drum. Band 2 adds the pickup before the snare. Band 3 is the bass speaking on every eighth
 * offbeat and on beat 4. None of that changes which note sounds; the hook decides that. It
 * changes how often the reader lifts and re-strikes it, which is the one rhythmic decision a
 * held bass part contains, and it is the decision this direction wants the knob to make.
 *
 * The other pitched part, `pad`, has hooks and no variants: it is one voicing per chord, or one
 * voicing for the whole cycle, and there is nothing to re-articulate. Invariant 5 prints no grid
 * for it, which is intended.
 *
 * ---------------------------------------------------------------------------
 * `backbeat` is emitted nowhere, and a snare articulating it prints nothing
 * ---------------------------------------------------------------------------
 *
 * `lib/core/authoring.ts` reserves `backbeat` for beats 2 and 4 of the part that states them,
 * and says a hit on any other beat is `downbeat`. A snare on beat 3 is therefore
 * `on('downbeat', 9)`. No role in this direction strikes beat 2 or beat 4 as a backbeat: the hat
 * marks them from band 1 as pulse, with `downbeat`, and the snare never touches them.
 *
 * This is the first direction in the library in which the slot goes unemitted, and it has a
 * consequence on the page. A device's `articulation` is addressed by `PatternSlot`, and a snare
 * recipe whose articulation is written against `backbeat` (a velocity, a decay, a snappy amount
 * for the hits on 2 and 4) has nothing to attach to here. The guide prints the snare's grid and
 * none of that articulation. That is invariant 5 working as designed: the recipe describes hits
 * this direction does not ask for, so nothing is printed about them, and nothing is moved onto
 * the beat-3 hit to fill the space. A reader whose box authors `backbeat` articulation should
 * expect a quieter snare block on this direction than on `breakbeat` or `hip-hop`, and this
 * paragraph is where the reason is recorded. `downbeat` articulation does attach, to the kick's
 * 1 and the snare's 9.
 *
 * ---------------------------------------------------------------------------
 * Half time in the fields that already exist
 * ---------------------------------------------------------------------------
 *
 * Four rates, fastest first, and the bass is the only one whose pitch moves inside the cycle:
 *
 *  - the hats, every eighth from band 0 and every sixteenth by band 3;
 *  - the drums, two fixed events per bar, the same bar eight times per cycle;
 *  - the bass, a new note every one to three bars, five or six per cycle, on four or five
 *    pitches;
 *  - the pad, one change per eight-bar cycle in the first hook and none at all in the second.
 *
 * `harmony.cycleBars` is 8 and the chord moves once, at bar 5. `HookNote.len` carries the
 * sustain: a sub note of `len: 32` sounds for two bars, and #142 prints it as `held for`. The
 * pad's `len: 64` is four bars a voicing. None of this needs a second clock or a tempo divisor,
 * and `breakbeat`'s header already argues why one would be a misunderstanding written into
 * `lib/core`. The finding the brief anticipated did not arise: everything above is `length`,
 * `len`, `cycleBars`, `priority`, `sustain` and one flag.
 *
 * ---------------------------------------------------------------------------
 * The pulse lives in the hats from band 0
 * ---------------------------------------------------------------------------
 *
 * With two drum hits a bar, the 172 has to be audible from somewhere or the intro reads as a
 * slow track. It is audible from the hats. `dnb-closed-hat-b0` is the four eighth-note offbeats,
 * 3, 7, 11 and 15, and the hat is in every section except the `Breakdown`, so the fast layer is
 * present from the first bar and is the last thing under the bass in the outro. Band 1 adds beats
 * 2 and 4 as pulse. Band 2 is straight eighths. Band 3 is twelve of sixteen, the rolling hat this
 * music runs on. The hat is the part that answers the failure mode of this whole design, and it
 * is authored to carry that from the skeleton rather than to arrive as garnish above it.
 *
 * ---------------------------------------------------------------------------
 * The arrangement, and §4.2 carrying it
 * ---------------------------------------------------------------------------
 *
 *     sub         ███████ ███████ ███████████████ ███████ ███████████████ ███████
 *     kick        ······· ███████ ███████████████ ······· ███████████████ ███████
 *     snare       ······· ······· ███████████████ ······· ███████████████ ·······
 *     closed-hat  ███████ ███████ ███████████████ ······· ███████████████ ███████
 *     open-hat    ······· ······· ███████████████ ······· ███████████████ ·······
 *     ghost-perc  ······· ······· ███████████████ ······· ███████████████ ·······
 *     pad         ███████ ███████ ███████████████ ███████ ███████████████ ███████
 *
 * `Intro` is the bass held over the pad with the hat ticking above it. `Build` adds the kick, so
 * beat 1 arrives before beat 3 does. `Drop` is the snare landing, with the open hat and the quiet
 * percussion under it, at band 2. `Breakdown` takes every drum away and leaves the bass and the
 * chord at band 0, so the sub is struck once a bar and reads as a held line rather than a groove.
 * `Return` is the drop again at band 3, the rolling hat and the accents, louder than the first.
 * `Outro` is the build played backwards: kick and hat under the bass, no snare.
 *
 * Five of the seven requests are `transient`. Every pair of them overlaps at `Drop` and
 * `Return`, so no two can share a voice by taking turns, and no such sharing is claimed. That
 * changes the day any two section lists stop overlapping.
 *
 * ---------------------------------------------------------------------------
 * Why there is no reese layer, written so a reader can disagree with it
 * ---------------------------------------------------------------------------
 *
 * The sound this music is known for is usually two layers: a clean sine sub and a detuned,
 * distorted mid above it, filtered and moved. The library has the request for the second half.
 * `bass-mid / dirty` is widely authored, and `inessential` exists for exactly a part that
 * completes a sound without being the sound.
 *
 * It is left out, for two reasons that can be weighed.
 *
 * The musical one: this direction's claim is that one part is the subject, and it is stated
 * through `priority`, `sustain` and the flag. A second pitched request carrying the same line an
 * octave up is the same subject requested twice, and on a rig with two bass voices the guide
 * would print two hooks that say the same thing. A hook for a second role cannot simply reuse
 * the sub's, and a different line on the mid layer would be a countermelody, which is a different
 * direction.
 *
 * The cost one, from `CLAUDE.md`: a request added to a crowded direction is the one thing that
 * moves the search, and `sub` and `bass-mid` are two of the most widely authored roles in the
 * library, so the two requests would contend on the same voices on nearly every rig. The figure
 * to read is the legal-rig line of `measure:search`, and it is in the commit that added this
 * file.
 *
 * What would justify adding it: a reading of the mid layer as *texture on the sub* rather than as
 * a second voice of the line, which is how the sound is made. That would be a `bass-mid / dirty`
 * request, `transient` to `Drop` and `Return`, `inessential` with a reason saying the sub alone
 * carries the tune, and either the `pitch` field (§4.1/#334) holding it on the root so it
 * thickens without competing, or a hook that doubles the sub's exactly with the file saying so.
 * The measure to pass is the legal-rig line staying inside its headroom and the two-voice rigs
 * still finishing seven of seven where they do today.
 *
 * ---------------------------------------------------------------------------
 * What a single box achieves
 * ---------------------------------------------------------------------------
 *
 * Measured rather than asserted, and the numbers live in the commit that added this file and
 * its pull request, not here: this file names no device (invariant 3), and a box count is the
 * most it should say. Seven requests, and sixteen of the forty-six boxes finish all seven alone,
 * every one of them a sampler or a groovebox with a bass and five drum voices to spare. Voice
 * count alone does not settle it: a box can hold seven parts and still miss one because the
 * one open hat or the one pad it authors is on the wrong side of §3.5, or because its bass and
 * its kick are one voice. Two shapes below that are worth knowing without a name:
 *
 *  - **A box with one voice carries the sub and nothing else.** That is the one part of this
 *    direction a mono synth is for, and the guide says the rest is out of reach rather than
 *    approximating it.
 *  - **A box with one low voice gives it to the sub, and the kick is the gap.** Where a drum
 *    machine authors its sub on the same voice as its kick, `r-sub` at priority 1 takes the voice
 *    first and the guide reports the kick as no room, naming the voice that carries the sub. That
 *    is the direction's own claim biting, and it is the right answer: alone on this music, such a
 *    box plays the bass line on its bass drum. A reader who wants the thump as well pairs it with
 *    anything that holds one note.
 *
 * The density knob moves phase 5 on any box that carries the sub: the two ends of the knob
 * differ on the sub's map, the kick's pickups, the hat's density and the snare's ghosts, and not
 * only on the band label.
 *
 * ---------------------------------------------------------------------------
 * The kick does not follow the key
 * ---------------------------------------------------------------------------
 *
 * §4.1/#339. The kick here is a short, hard punctuation under a bass that owns the low end, and a
 * kick that moved with the key would be a second bass note on beat 1. It stays put, as the kicks
 * in `industrial-techno`, `hard-techno` and `breakbeat` do. There is no tom, so the one drum the
 * table always tunes is not requested.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * Every variant is 16 steps. The two-step is one bar and the same bar every bar; a 32-step
 * variant would be a place for a second bar to differ, and this direction's grid is the claim
 * that it does not. Every section is a multiple of eight bars, so the one-bar patterns and the
 * eight-bar cycle both chain whole and #105's remainder rule prints nothing.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ----------------------------------------------------------------------------
  // Step 1 at every band and never another beat. Band 1 adds the eighth after the snare, band 2
  // the pickup before it, band 3 two quiet sixteenths. Steps 5, 9 and 13 are absent throughout:
  // the kick says beat 1 and the snare says beat 3, and nothing in between is stated.
  variant('dnb-kick-b0', 'kick', 0, 16, on('downbeat', 1)),
  variant('dnb-kick-b1', 'kick', 1, 16, on('downbeat', 1), on('offbeat', 11)),
  variant('dnb-kick-b2', 'kick', 2, 16, on('downbeat', 1), on('offbeat', 7, 11)),
  variant(
    'dnb-kick-b3',
    'kick',
    3,
    16,
    at('accent', 110, 1),
    on('offbeat', 7, 11),
    at('ghost', 44, 4, 14),
  ),

  // ---- snare ---------------------------------------------------------------------------
  // Step 9 at every band, as `downbeat`: see the header on why it is not `backbeat`. Steps 5
  // and 13 are never struck. Everything density adds is a quiet sixteenth, and the sixteenth
  // before the bar line (16) is the one a player drags into the next kick.
  variant('dnb-snare-b0', 'snare', 0, 16, on('downbeat', 9)),
  variant('dnb-snare-b1', 'snare', 1, 16, on('downbeat', 9), at('ghost', 46, 14)),
  variant('dnb-snare-b2', 'snare', 2, 16, on('downbeat', 9), at('ghost', 46, 6, 14)),
  variant(
    'dnb-snare-b3',
    'snare',
    3,
    16,
    at('accent', 108, 9),
    at('ghost', 44, 4, 6, 14, 16),
  ),

  // ---- closed-hat ----------------------------------------------------------------------
  // The 172, from the skeleton. Band 0 is the four eighth-note offbeats and nothing else, which
  // is the fast layer the intro needs. Band 1 marks beats 2 and 4 as `downbeat`, since the hat
  // is not the part that states a backbeat. Band 2 is straight eighths. Band 3 adds the even
  // sixteenths a swing amount displaces, twelve of sixteen.
  variant('dnb-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'dnb-closed-hat-b1',
    'closed-hat',
    1,
    16,
    on('downbeat', 5, 13),
    on('offbeat', 3, 7, 11, 15),
  ),
  variant(
    'dnb-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
  ),
  variant(
    'dnb-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 40, 2, 6, 10, 14),
  ),

  // ---- open-hat ------------------------------------------------------------------------
  // The lift before the snare first, then before the bar line, then the two remaining
  // offbeats. Never on a beat: an open hat on a beat would be a third stated drum.
  variant('dnb-open-hat-b0', 'open-hat', 0, 16, on('offbeat', 7)),
  variant('dnb-open-hat-b1', 'open-hat', 1, 16, on('offbeat', 7, 15)),
  variant('dnb-open-hat-b2', 'open-hat', 2, 16, on('offbeat', 3, 7, 15)),
  variant('dnb-open-hat-b3', 'open-hat', 3, 16, on('offbeat', 3, 7, 11, 15)),

  // ---- ghost-perc ----------------------------------------------------------------------
  // Every hit a ghost on an even sixteenth, at every band, so a swing amount has something to
  // act on and the part stays under the hats. Band 3 is every even step.
  variant('dnb-ghost-perc-b0', 'ghost-perc', 0, 16, at('ghost', 44, 4, 12)),
  variant('dnb-ghost-perc-b1', 'ghost-perc', 1, 16, at('ghost', 44, 4, 8, 12, 16)),
  variant('dnb-ghost-perc-b2', 'ghost-perc', 2, 16, at('ghost', 42, 2, 4, 8, 10, 12, 16)),
  variant(
    'dnb-ghost-perc-b3',
    'ghost-perc',
    3,
    16,
    at('ghost', 40, 2, 4, 6, 8, 10, 12, 14, 16),
  ),

  // ---- sub -----------------------------------------------------------------------------
  // The re-articulation map (§4.3, `reArticulatesHook` on `r-sub`). Where the held note is
  // struck again; the hook says which note. Band 0 with the kick. Band 1 answers the snare on
  // the *and* of 3. Band 2 adds the pickup before the snare. Band 3 speaks on every eighth
  // offbeat and on beat 4. One bar, because the drums are one bar and the map follows them.
  variant('dnb-sub-b0', 'sub', 0, 16, on('downbeat', 1)),
  variant('dnb-sub-b1', 'sub', 1, 16, on('downbeat', 1), on('offbeat', 11)),
  variant('dnb-sub-b2', 'sub', 2, 16, on('downbeat', 1), on('offbeat', 7, 11)),
  variant(
    'dnb-sub-b3',
    'sub',
    3,
    16,
    on('downbeat', 1, 13),
    on('offbeat', 7, 11, 15),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const drumAndBass: Template = {
  id: 'drum-and-bass',
  name: 'Drum and Bass',

  /**
   * 168 to 176, default 172. The same fast end of the library `breakbeat` occupies, and the
   * overlap is right: the two are one family at one tempo, told apart by where the snare falls.
   * 172 is the figure the header's arithmetic is done at. Below 168 the two-step starts to read
   * as a slow beat rather than a fast one heard at half speed; above 176 the band-3 hats stop
   * being playable by hand.
   */
  bpm: { min: 168, max: 176, default: 172 },

  /**
   * Natural minor, three keys. Every degree the hooks reach is in natural minor in all three, so
   * no key offers a chord it cannot spell. F and G minor put the sub's tonic at `baseOctave` 1
   * in the range this music keeps it, and C minor gives the picker a third.
   */
  keys: ['F minor', 'G minor', 'C minor'],

  /**
   * Six sections, 128 bars. Energies 0.15 / 0.45 / 0.7 / 0.2 / 0.95 / 0.2 land on bands
   * 0 / 1 / 2 / 0 / 3 / 0 at the neutral detent; the sparse detent gives 0 / 0 / 1 / 0 / 2 / 0
   * and the busy one 1 / 2 / 3 / 1 / 3 / 1. No other direction resolves to this vector, which
   * `test/template-directions.test.ts` requires: two directions with one band vector are one
   * arrangement with two names as far as §6.3 is concerned.
   *
   * `Drop` is band 2 and `Return` is band 3. The first drop holds something back: straight
   * eighths on the hat, the bass striking three times a bar. The return after the breakdown is
   * the whole of it, the rolling hat and the accents, so the second drop is louder than the first
   * on every detent and the piece has somewhere to go after bar 64.
   *
   * `Breakdown` is band 0 with every drum out. The sub's map at band 0 is one strike a bar where
   * the kick would be, over a chord, and for sixteen bars the reader hears the bass as a held line
   * with nothing marking the grid. On the busy detent it rises to band 1 and the answer after the
   * absent snare comes in, which is the knob doing something audible in the quietest section.
   *
   * Every section is a multiple of eight bars. The one-bar patterns and the eight-bar hooks and
   * cycle chain whole everywhere, so #105's remainder rule never prints. This is loop music, and
   * what stops 128 bars reading as one loop is the mute map above.
   */
  structure: [
    { name: 'Intro', bars: 16, energy: 0.15 },
    { name: 'Build', bars: 16, energy: 0.45 },
    { name: 'Drop', bars: 32, energy: 0.7 },
    { name: 'Breakdown', bars: 16, energy: 0.2 },
    { name: 'Return', bars: 32, energy: 0.95 },
    { name: 'Outro', bars: 16, energy: 0.2 },
  ],

  /**
   * §4.1. An eight-bar cycle and one chord change, at bar 5. The drum bar repeats eight times
   * across it, the bass moves five or six times, the chord moves once. `i` to `VI` is the plain
   * minor movement, and here the plainness has a purpose different from `breakbeat`'s: the tune
   * is in the bass, and the chord is the floor it moves over.
   */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'i', bars: 4 },
      { degree: 'VI', bars: 4 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Two hooks for each of the two pitched roles. The sub's pair
   * are two lines with different contours; the pad's pair are a chord that changes once and a
   * chord that does not change at all.
   *
   * The sub's hooks are the pitch half of `reArticulatesHook` and the map is in `PATTERNS`. The
   * pad's are the pattern outright (#100), since the pad has no variants.
   */
  hooks: [
    {
      /**
       * Six notes, eight bars, falling into the downbeat. Two bars on the root, then the fifth
       * and the third for a bar each over `i`; two bars on the sixth over `VI`, then the tonic
       * and the third for a bar each, so the line lands on the flattened third and drops to the
       * root when the cycle comes round. Every note is a chord tone of the degree sounding under
       * it: 1, 5 and 3 over `i`; 6, 1 and 3 over `VI`. `baseOctave` 1 is two octaves under middle
       * C, and the line never leaves that octave.
       */
      id: 'dnb-hook-sub-1',
      forRole: 'sub',
      bars: 8,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 32 },
        { step: 33, degree: 5, octave: 0, len: 16 },
        { step: 49, degree: 3, octave: 0, len: 16 },
        { step: 65, degree: 6, octave: 0, len: 32 },
        { step: 97, degree: 1, octave: 0, len: 16 },
        { step: 113, degree: 3, octave: 0, len: 16 },
      ],
    },
    {
      /**
       * The other piece: three bars still, then a move; three bars still, then a turnaround. The
       * root for three bars and the fifth for one over `i`; the sixth for three bars over `VI`,
       * and the last bar split in two, the tonic an octave up and the third above it, so the line
       * rises out of the cycle and drops an octave and a third onto the next downbeat. Where the
       * first hook falls into the bar line, this one leaps away from it. Still chord tones
       * throughout, and `octave: 1` on the last two notes is the only place either hook leaves
       * the sub's octave.
       */
      id: 'dnb-hook-sub-2',
      forRole: 'sub',
      bars: 8,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 48 },
        { step: 49, degree: 5, octave: 0, len: 16 },
        { step: 65, degree: 6, octave: 0, len: 48 },
        { step: 113, degree: 1, octave: 1, len: 8 },
        { step: 121, degree: 3, octave: 1, len: 8 },
      ],
    },
    {
      /**
       * The chord stated once per degree and held for four bars: a triad on `i`, then `VI`
       * voiced as 6, 8 and 10, which is the same triad read from its own root. `baseOctave` 3
       * puts the bottom of the voicing under middle C, two octaves clear of the bass.
       */
      id: 'dnb-hook-pad-1',
      forRole: 'pad',
      bars: 8,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 64 },
        { step: 1, degree: 3, octave: 0, len: 64 },
        { step: 1, degree: 5, octave: 0, len: 64 },
        { step: 65, degree: 6, octave: 0, len: 64 },
        { step: 65, degree: 8, octave: 0, len: 64 },
        { step: 65, degree: 10, octave: 0, len: 64 },
      ],
    },
    {
      /**
       * The chord that does not move. The tonic, the flattened third and the tonic again an
       * octave up are chord tones of both `i` and `VI`, so this voicing is held for all 128
       * steps and it is the bass that recolours it: over the first four bars it is the root and
       * third of `i`, and when the sub moves to the sixth it becomes the third and fifth of `VI`
       * without a note changing. The harmony is heard through the bass line alone, which is the
       * direction's claim made in the pad.
       */
      id: 'dnb-hook-pad-2',
      forRole: 'pad',
      bars: 8,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 128 },
        { step: 1, degree: 3, octave: 0, len: 128 },
        { step: 1, degree: 8, octave: 0, len: 128 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Seven requests. Four are the direction: the sub, the kick, the
   * snare and the hat. Three are the room around it and are declared inessential (§4.4/#81), each
   * with a reason a producer would give. None is `optional`: a rig with a spare voice should be
   * asked to fill them, and a rig without one is told it is not short of anything.
   */
  roles: [
    /**
     * The direction, at the priority that says so. Alone at 1, `continuous`, and the one request
     * carrying `reArticulatesHook` (§4.3): the hooks say which note, the variants say where it
     * is struck again, and the header defends both halves. `dark` is exact on thirty-nine boxes
     * and within 2 of every other character the role authors, so the whole of `sub` is reachable.
     *
     * Present in every section. The intro is this part held over the pad, the breakdown is this
     * part over the pad with the drums gone, and the outro is this part with the kick and the hat
     * still under it. The drop is the snare arriving on a bass that is already there.
     */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 1,
      character: 'dark',
      sustain: 'continuous',
      reArticulatesHook: true,
    },

    /**
     * `hard`: a short, dry thump on beat 1 with no tail, since the tail is the sub's. §3.5
     * refuses `soft` at squared distance 4, so the two `soft` kicks in the library report
     * `no-recipe` here and the other sixty-one are reachable. Not `followsKey`, for the reason in
     * the header.
     */
    /* Out of `Intro` and `Breakdown`: beat 1 arrives in the build, before beat 3 does, and is the
     * last drum left in the outro. */
    {
      id: 'r-kick',
      role: 'kick',
      priority: 2,
      character: 'hard',
      sustain: 'transient',
      sections: ['Build', 'Drop', 'Return', 'Outro'],
    },

    /**
     * `hard`: a tight, cracking snare on beat 3, the one hit the half-time feel turns on. Exact
     * on twenty-five boxes, with `bright`, `dirty` and `clean` all within 2, so the role is fully
     * reachable. See the header for what a `backbeat` articulation on the chosen recipe does on
     * this direction, which is nothing.
     */
    /* The drop is this part landing. It plays in the two drops and nowhere else. */
    {
      id: 'r-snare',
      role: 'snare',
      priority: 2,
      character: 'hard',
      sustain: 'transient',
      sections: ['Drop', 'Return'],
    },

    /**
     * `bright`: a crisp tick at 172, which is where the tempo is heard. `bright` is within 2 of
     * `clean`, `dirty` and `hard`, and refuses `dark` at 4, so two of the library's thirty-five
     * hats report `no-recipe` here. The header says why this part is at band 0 in the intro.
     */
    /* Everything but `Breakdown`. The hat is what makes the breakdown read as the grid being
     * removed rather than the track thinning. */
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 3,
      character: 'bright',
      sustain: 'transient',
      sections: ['Intro', 'Build', 'Drop', 'Return', 'Outro'],
    },

    /**
     * `dirty`: the open hat in this music is a hat off a sampled break, with the noise floor and
     * the transfer still on it, and that is a different object from the closed hat's clean tick.
     * The ask also settles the fit. `open-hat` is authored `bright` on fifteen boxes and `dark` on
     * eleven, and those two are opposite poles: a `bright` request refuses every one of the eleven
     * and reports the part as one the box cannot make on nine boxes that finish everything else.
     * `dirty` is within 2 of both, so every box that authors an open hat answers it, and the two
     * that author it exactly answer it exactly.
     */
    /* Under the two drops. */
    {
      id: 'r-open-hat',
      role: 'open-hat',
      priority: 4,
      character: 'dirty',
      sustain: 'transient',
      sections: ['Drop', 'Return'],
      inessential: {
        reason:
          'The closed hat already carries the fast half. The open hat is a lift before the snare, and the kick and snare are the same kick and snare without it.',
      },
    },

    /**
     * `soft`, exact on twenty-five boxes. The quiet sixteenths between the hats, all on the even
     * steps a swing amount displaces.
     */
    /* Under the two drops. */
    {
      id: 'r-ghost-perc',
      role: 'ghost-perc',
      priority: 4,
      character: 'soft',
      sustain: 'transient',
      sections: ['Drop', 'Return'],
      inessential: {
        reason:
          'Texture between the hats. The drop is the snare landing on the bass, and it lands the same with or without this under it.',
      },
    },

    /**
     * `dark`: the room the bass moves in. Exact on ten boxes, with `soft` at 2 covering another
     * twenty-eight; `bright` is refused. `continuous`, because a chord that came and went would be
     * an event, and the pad here is the one part that must not be one.
     *
     * `polyphony: 3` (§12.4): both hooks sound three notes at once, and a box that cannot hold
     * three is told so rather than handed a triad for one voice. A pool box stacks three voices
     * for it, which is what `test/stack-polyphony.test.ts` measures.
     */
    {
      id: 'r-pad',
      role: 'pad',
      priority: 5,
      character: 'dark',
      sustain: 'continuous',
      polyphony: 3,
      inessential: {
        reason:
          'The bass line states the harmony by itself. A pad puts a room around it; without one the line is drier and it is still the line.',
      },
    },
  ],

  patterns: PATTERNS,
}
