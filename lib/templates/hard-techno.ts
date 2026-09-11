import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Hard Techno (§4). 145–160 BPM, one chord, and a kick that never stops.
 *
 * **Nothing here names a device** (invariant 3). `Role`, `Character`, `MoodAxis` and
 * `PatternSlot` are the whole vocabulary this file may use.
 *
 * **Not Industrial Techno at a higher tempo**, and the differences are the direction:
 *
 *  - **The harmony is one chord.** Industrial cycles i–VI–VII over eight bars; this holds the
 *    tonic for the whole track and lets the arrangement do the moving. Four bars is the cycle
 *    only so the harmony phase has a length to print; nothing changes at the bar line.
 *  - **The kick is four-to-the-floor at band 0.** Industrial's Intro is half-time so it has
 *    somewhere to go; here the Intro already has the full kick, and every other continuous
 *    part is in the room with it from bar one at its band-0 sparsest — §4.2 gives a continuous
 *    request every section, and this direction draws no entrances. A hard techno intro is the
 *    whole kick under the thinnest version of everything else, not a kick at half speed.
 *  - **The sub doubles the kick and fills in.** Industrial's sub answers the kick off the
 *    beat; this one is the rumble — on the beat under every kick, then every 8th at band 3.
 *  - **The percussion rolls.** Closed hat in 16ths from band 1, a ride in straight 8ths, and a
 *    two-bar tom figure that lands in the second bar and fills at the peak. Industrial has a
 *    clang; this has a ride and toms.
 *  - **A snare, not a clap**, and a `dirty` mono lead rather than a `hard` chord stab. The hook
 *    is a lead line on the offbeats above middle C, not a triad under it.
 *
 * ## Characters, and where `hard` is earned
 *
 * `hard` is asked for only where the library answers it exactly on most boxes — `kick` (35 of
 * 35 that author a kick), `snare` (25 of 29), `impact` (33 of 33) — and on `tom`, where it is
 * asked for on purpose: eight boxes author a hard tom and, before this direction, no request
 * named one (#538). Elsewhere the character is the one that *resolves*: `sub` is `dark` because
 * all thirty-nine subs are; `open-hat` is `dirty` because both opposites — `dark` and `bright` —
 * refuse a dozen boxes each and `dirty` refuses none; `lead` is `dirty` because a hard techno
 * lead is a distorted one and the thirty-one `bright` leads sit at √2 as substitutes. The closed
 * hat is `bright`: `dirty` would refuse the eleven boxes whose only hat is `clean`, and a hat
 * that cuts over a distorted kick is the sound anyway.
 *
 * ## The density knob
 *
 * Seven sections, 120 bars. Energies 0.2 / 0.6 / 0.85 / 0.35 / 0.6 / 1 / 0.15 land on bands
 * 0 / 2 / 3 / 1 / 2 / 3 / 0 at the neutral detent; the sparse detent gives 0 / 1 / 2 / 0 / 1 /
 * 2 / 0 and the busy one 1 / 3 / 3 / 2 / 3 / 3 / 1. Every section length is a multiple of four
 * bars, so the four-bar impact variant, the two-bar tom figure and the harmonic cycle all divide
 * every section and the guide prints no remainder rule.
 *
 * ## No opening mood
 *
 * Grit up would be a genre statement, and Hip-Hop's reasoning for stating swing alone applies
 * here in reverse: the distortion is on the recipes the characters above select, and moving the
 * grit axis on top of them would shift values on every box for no reason a reader could point
 * at. The reader's room decides.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid and slot convention live in `../core/authoring`. Every patterned role here has all
 * four bands, and each band is strictly busier than the one below it.
 *
 * Two requested roles have no variants, on purpose:
 *
 *  - **`lead`** has hooks and no grid. Both hooks are figures with their own rhythm, so under
 *    §4.3/#100 a resolved hook is the pattern and any variants would be unreachable. Nothing is
 *    authored for the knob to be unable to move. The request is continuous, so the lead plays
 *    its two-bar figure in every section, the Intro and the Outro included, and neither the
 *    energy curve nor the density knob changes what it plays; the one thing that moves it is a
 *    reroll picking the other hook. A reader who wants it out of the Intro mutes it, and the
 *    guide does not pretend to have decided that for them.
 *  - **`riser`** is a single trig (#473): one sweep across the section, not a grid.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // Four-to-the-floor at every band. Band 0 is the whole kick, not half of it; the bands add
  // the pickup, then the 16th before beat 4, then the roll out of the bar.
  variant('htek-kick-b0', 'kick', 0, 16, on('downbeat', 1, 5, 9, 13)),
  variant('htek-kick-b1', 'kick', 1, 16, on('downbeat', 1, 5, 9, 13), at('ghost', 55, 16)),
  variant('htek-kick-b2', 'kick', 2, 16, on('downbeat', 1, 5, 9, 13), at('ghost', 55, 12, 16)),
  variant(
    'htek-kick-b3',
    'kick',
    3,
    16,
    at('accent', 116, 1),
    on('downbeat', 5, 9, 13),
    at('ghost', 55, 12),
    on('fill', 15, 16),
  ),

  // ---- sub ----------------------------------------------------------------------------
  // The rumble. Under the kick on the beat, then every 8th: the sub is what makes the kick
  // sound longer than it is. Band 0 is beats 1 and 3 so the Intro has a floor without a pulse.
  variant('htek-sub-b0', 'sub', 0, 16, on('downbeat', 1, 9)),
  variant('htek-sub-b1', 'sub', 1, 16, on('downbeat', 1, 5, 9, 13)),
  variant('htek-sub-b2', 'sub', 2, 16, on('downbeat', 1, 5, 9, 13), on('offbeat', 7, 15)),
  variant(
    'htek-sub-b3',
    'sub',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // Rolling. Offbeat 8ths at band 0, 16ths from band 1 with the offbeats leading, and at band 3
  // every step with the beat itself under a hat.
  variant('htek-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'htek-closed-hat-b1',
    'closed-hat',
    1,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 48, 2, 6, 10, 14),
  ),
  variant(
    'htek-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 48, 2, 4, 6, 8, 10, 12, 14, 16),
  ),
  variant(
    'htek-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11),
    at('accent', 110, 15),
    at('ghost', 44, 2, 4, 6, 8, 10, 12, 14, 16),
  ),

  // ---- snare --------------------------------------------------------------------------
  // States the backbeat. Band 3 trades beat 4 for an accent and runs a roll out of the bar.
  variant('htek-snare-b0', 'snare', 0, 16, on('backbeat', 13)),
  variant('htek-snare-b1', 'snare', 1, 16, on('backbeat', 5, 13)),
  variant('htek-snare-b2', 'snare', 2, 16, on('backbeat', 5, 13), at('ghost', 50, 12)),
  variant(
    'htek-snare-b3',
    'snare',
    3,
    16,
    on('backbeat', 5),
    at('accent', 114, 13),
    at('ghost', 50, 8),
    on('fill', 14, 15, 16),
  ),

  // ---- tom ----------------------------------------------------------------------------
  // Two bars, and the figure lives in the second one: band 0 is a single tom answering bar
  // two's beat 3, and each band pulls the figure earlier and denser until band 3 rolls through
  // the closing beat. Beats in a 32-step variant fall on 1, 5, 9, 13, 17, 21, 25, 29; offbeats on
  // 3, 7, 11, 15, 19, 23, 27, 31.
  variant('htek-tom-b0', 'tom', 0, 32, on('downbeat', 25), on('offbeat', 31)),
  variant('htek-tom-b1', 'tom', 1, 32, on('downbeat', 9, 25), on('offbeat', 15, 31)),
  variant(
    'htek-tom-b2',
    'tom',
    2,
    32,
    on('downbeat', 9, 25),
    on('offbeat', 11, 15, 27, 31),
    at('ghost', 52, 14, 30),
  ),
  variant(
    'htek-tom-b3',
    'tom',
    3,
    32,
    on('downbeat', 9, 25),
    on('offbeat', 7, 11, 15, 23, 27),
    at('ghost', 52, 6, 10, 14, 22, 26),
    on('fill', 29, 30),
    at('accent', 112, 31),
    on('fill', 32),
  ),

  // ---- open-hat -----------------------------------------------------------------------
  // The offbeat that makes it bounce. Two at band 0, all four from band 1; band 3 puts one on
  // the beat under the accent so the bar leans forward.
  variant('htek-open-hat-b0', 'open-hat', 0, 16, on('offbeat', 7, 15)),
  variant('htek-open-hat-b1', 'open-hat', 1, 16, on('offbeat', 3, 7, 11, 15)),
  variant('htek-open-hat-b2', 'open-hat', 2, 16, on('offbeat', 3, 7, 11, 15), on('downbeat', 13)),
  variant(
    'htek-open-hat-b3',
    'open-hat',
    3,
    16,
    on('offbeat', 3, 7, 11),
    at('accent', 108, 15),
    on('downbeat', 5, 13),
    at('ghost', 46, 16),
  ),

  // ---- ride ---------------------------------------------------------------------------
  // Straight 8ths is the genre's ride; band 2 is that and band 3 fills the 16ths between them.
  variant('htek-ride-b0', 'ride', 0, 16, on('downbeat', 1, 9)),
  variant('htek-ride-b1', 'ride', 1, 16, on('downbeat', 1, 5, 9, 13)),
  variant('htek-ride-b2', 'ride', 2, 16, on('downbeat', 1, 5, 9, 13), on('offbeat', 3, 7, 11, 15)),
  variant(
    'htek-ride-b3',
    'ride',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11),
    at('accent', 108, 15),
    at('ghost', 46, 2, 6, 10, 14),
  ),

  // ---- impact -------------------------------------------------------------------------
  // Four bars long for the reason Industrial Techno's is: §12.5 keeps variants flat, so a
  // 16-step crash would land on every bar of a 32-bar Drop. `first-hit` is the entry gesture.
  variant('htek-impact-b0', 'impact', 0, 64, on('first-hit', 1)),
  variant('htek-impact-b1', 'impact', 1, 64, on('first-hit', 1), on('downbeat', 33)),
  variant('htek-impact-b2', 'impact', 2, 64, on('first-hit', 1), on('downbeat', 17, 33, 49)),
  variant(
    'htek-impact-b3',
    'impact',
    3,
    64,
    on('first-hit', 1),
    on('downbeat', 17, 25, 49, 57),
    at('accent', 116, 33),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const hardTechno: Template = {
  id: 'hard-techno',
  name: 'Hard Techno',
  bpm: { min: 145, max: 160, default: 150 },
  keys: ['F minor', 'G minor', 'D minor'],

  /**
   * Seven sections, 120 bars. Two peaks, and the Breakdown between them is eight bars rather than
   * sixteen because a hard techno breakdown is a breath, not a movement. The Build and Rebuild
   * are the same energy on purpose: both are the eight bars the riser occupies, and both program
   * at band 2 so the drop arrives from somewhere already moving.
   */
  structure: [
    { name: 'Intro', bars: 16, energy: 0.2 },
    { name: 'Build', bars: 8, energy: 0.6 },
    { name: 'Drop', bars: 32, energy: 0.85 },
    { name: 'Breakdown', bars: 8, energy: 0.35 },
    { name: 'Rebuild', bars: 8, energy: 0.6 },
    { name: 'Peak', bars: 32, energy: 1 },
    { name: 'Outro', bars: 16, energy: 0.15 },
  ],

  /**
   * §4.1. One chord. The tonic for four bars and then the tonic again: hard techno moves by
   * arrangement and by filter, never by chord change, and a progression here would be a
   * different direction. Four bars is a cycle length for the harmony phase to print, and the
   * only thing a bar line changes is nothing.
   */
  harmony: {
    cycleBars: 4,
    progression: [{ degree: 'i', bars: 4 }],
  },

  /**
   * §4.1. Two lead hooks, both figures, both on chord tones of the one chord — 1, 3 and 5, and
   * the octave — so a different seed gives a different piece rather than a variation.
   *
   * **Octave, checked against the register rather than the label** (#37). `baseOctave` is 4, so
   * the tonic is middle C in C and every note sits between C4 and G5: above the octave a
   * `bass-mid` would live in, three octaves clear of the sub's pitch at C1, and where a mono
   * lead reads as a line rather than a second bass. The comment and the number agree; #37 is the
   * record of a direction where they did not.
   *
   * No variants for the lead, and that is the §4.3/#100 answer rather than an omission: both
   * hooks carry their own rhythm, a resolved hook is the pattern, and a grid beside it would be
   * unreachable.
   */
  hooks: [
    {
      // The hammer: every 8th offbeat for two bars, the octave on the last one of bar one.
      id: 'htek-hook-lead-1',
      forRole: 'lead',
      bars: 2,
      baseOctave: 4,
      notes: [
        { step: 3, degree: 1, octave: 0, len: 2 },
        { step: 7, degree: 1, octave: 0, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 2 },
        { step: 15, degree: 1, octave: 1, len: 2 },
        { step: 19, degree: 1, octave: 0, len: 2 },
        { step: 23, degree: 3, octave: 0, len: 2 },
        { step: 27, degree: 5, octave: 0, len: 2 },
        { step: 29, degree: 3, octave: 0, len: 1 },
        { step: 31, degree: 1, octave: 0, len: 2 },
      ],
    },
    {
      // The siren: five notes across two bars, each held most of the way to the next.
      id: 'htek-hook-lead-2',
      forRole: 'lead',
      bars: 2,
      baseOctave: 4,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 6 },
        { step: 9, degree: 1, octave: 1, len: 6 },
        { step: 17, degree: 3, octave: 0, len: 6 },
        { step: 25, degree: 1, octave: 0, len: 3 },
        { step: 29, degree: 5, octave: 0, len: 3 },
      ],
    },
  ],

  /**
   * §4.4. Ten requests in five tiers. Priority reads as: the two that make it techno; the two
   * that make it hard techno — the hats and the hook; the two that make it roll; the two that
   * make it bounce; and two transitions. Five tiers rather than four because a tier is also a
   * tie the search has to break: with the snare, the tom, the open hat and the ride all at one
   * priority the worst ten-box rig cost half as much again (`npm run measure:search`), for an
   * ordering no listener could hear.
   *
   * The lead is priority 2 and the snare is not, and a four-voice box is why. #539 found a
   * four-track box dropping a direction's stated lead for an exact drum at equal priority, and
   * that is the allocation this ordering refuses: on four voices the genre is kick, rumble, hats
   * and the hook, and a backbeat is what the fifth voice adds. Priority is a cost, not a claim
   * about the music (§4.4), and the cost here is paid exactly where a rig runs out of voices.
   *
   * Three are declared inessential — the ride, the impact and the riser — because a hard techno
   * track with a kick, a rumble, hats, a snare, toms and a lead is finished, and a box handed
   * those seven should not be told it is short three (§4.4/#81). None of the three is `optional`:
   * where a voice is spare the search should spend it.
   */
  roles: [
    /*
     * §4.1/#339. **No `followsKey`**, for the reason Industrial Techno gives: the kick is the
     * fixed point the harmony sits on. With one chord for the whole track it matters less than
     * it does there, and the position is the same.
     */
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    /*
     * §4.1/#334. The root, at the sub octave. A pitch rather than a hook: the grid owns this
     * part's rhythm, and the whole part is one note struck under the kick.
     */
    {
      id: 'r-sub',
      role: 'sub',
      priority: 1,
      character: 'dark',
      sustain: 'continuous',
      pitch: { degree: 1, baseOctave: 1 },
    },

    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'bright',
      sustain: 'continuous',
    },
    /*
     * A mono lead, `dirty`. Five boxes author one exactly; twenty-six substitute a `bright` or a
     * `hard` lead at √2; one authors only a `clean` lead and is refused. Not `polyphony`: the
     * hooks are single lines, and a chord here would be Industrial Techno's stab.
     */
    { id: 'r-lead', role: 'lead', priority: 2, character: 'dirty', sustain: 'continuous' },

    { id: 'r-snare', role: 'snare', priority: 3, character: 'hard', sustain: 'continuous' },
    /*
     * §4.1/#339. Every tom in the library follows the key, and this one is playing a two-bar
     * figure under a lead: a fill a semitone out is the one thing here a listener would hear as
     * wrong.
     *
     * `hard`, and asked for knowing what it costs (#538). Eight boxes author a hard tom and are
     * answered exactly; twenty-four author a bright or a dark one and substitute at √2; one
     * authors only a `soft` tom, the refused opposite, and gets an honest gap. A pounding tom is
     * the sound, and a direction that asked for `dark` to spare that one box would be asking for
     * Weave's toms.
     */
    {
      id: 'r-tom',
      role: 'tom',
      priority: 3,
      character: 'hard',
      sustain: 'continuous',
      followsKey: true,
    },
    /*
     * `dirty` because it resolves: `dark` refuses twelve boxes and `bright` nine, each being the
     * other's opposite on the tone axis, and `dirty` sits at √2 from both and refuses none. A
     * sizzling offbeat hat is what the genre has anyway.
     */
    { id: 'r-open-hat', role: 'open-hat', priority: 4, character: 'dirty', sustain: 'continuous' },
    {
      id: 'r-ride',
      role: 'ride',
      priority: 4,
      character: 'bright',
      sustain: 'continuous',
      inessential: { reason: 'the hats already roll, and a ride is a second roll' },
    },

    // §4.2. Transitional: the two peaks get a crash, the rest of the track does not.
    {
      id: 'r-impact',
      role: 'impact',
      priority: 5,
      character: 'hard',
      sustain: 'transient',
      sections: ['Drop', 'Peak'],
      inessential: { reason: 'the kick coming back after the breakdown is the impact' },
    },
    {
      id: 'r-riser',
      role: 'riser',
      priority: 5,
      character: 'bright',
      sustain: 'transient',
      sections: ['Build', 'Rebuild'],
      inessential: { reason: 'a part already playing can lift the eight bars into a drop' },
    },
  ],

  patterns: PATTERNS,
}
