import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Drone Study (§4). **One part, and everything else.**
 *
 * The three directions before it ask for nine, twelve and nine parts, and every one of them
 * only becomes a track when a rack becomes a rig. This one is finished on a single box, and it
 * is here because that is a real way people work and because a template library that only knows
 * how to fill a rack has an untested assumption in it: that a direction's substance lives in the
 * *number* of requests. It does not. What a guide has to say — how long the thing is, how it
 * moves, what key it is in, what the one voice actually plays and when it changes — is the same
 * work whether there is one part or twelve.
 *
 * **Nothing here names a device** (invariant 3). One part means the pressure to name one is
 * highest, and it is still not allowed: the template asks for a `texture` and says nothing
 * whatever about how a rig makes one.
 *
 * The direction in one line: one voice, a sixteen-bar chord cycle it has to imply on its own,
 * and an arc that takes 132 bars to breathe in and out once.
 *
 * **The progression is what the single line implies, not something playing under it.** A one-part
 * rig has no accompaniment and this direction does not pretend otherwise: the `i`, `bII` and
 * `vii` below are the harmony a listener infers from where the one note sits and when it moves,
 * which is why both hooks change pitch exactly where the cycle does. A guide that printed a
 * progression and then handed the reader one voice would be describing a part nobody is playing.
 *
 * ## Three things it does that the other directions do not
 *
 *  - **A palindrome arc.** `0 1 2 3 2 1 0` — the only symmetric band vector in the registry.
 *    Ambient Dub climbs to 3 and recedes without coming back; Industrial Techno and Major-Key
 *    Electro both reach 3, fall and reach it again. This one goes out and comes home by the same
 *    road, which is the shape a drone piece has when it has any shape at all.
 *  - **Phrygian, and nothing else.** The flat second is the whole reason: it is a semitone off
 *    the tonic, so a single line that steps onto it states the mode in one move and needs no
 *    chord to do it. No other direction in the registry reaches this mode.
 *  - **A sixteen-bar harmonic cycle**, twice the length of any other here, over sections as
 *    short as nine bars. Section boundaries and chord changes therefore land out of phase for
 *    most of the piece, which is what stops 132 bars of one note reading as a loop.
 *
 * ## The texture *is* patterned, and Ambient Dub's reasoning still holds
 *
 * That template authors no variants for its `texture` and says why: *"four bands of invented
 * 16ths ... would be the guide lying about what the part does"*. Nothing here contradicts it.
 * These variants are on a **64-step grid — four bars** — and band 0 is **one hit in four bars**.
 * That is not a rhythm, it is a re-articulation map: the places the player lifts and re-strikes
 * a note that is otherwise continuous. A part that never re-articulates has nothing to author
 * and Ambient Dub's texture is one of those; a drone study is a piece *about* when the note is
 * struck again, so the map is the composition and leaving it out would omit the only rhythmic
 * decision in the direction.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four bands, on a four-bar grid
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`. Every one of these is 64 steps,
 * which is four bars: the longest variant the vocabulary allows, and the only length at which
 * "strike the note once, then leave it" is expressible at all.
 *
 * Density moves this the way it moves any other role, and the numbers say what that means here:
 * one strike in four bars at band 0, seven at band 3. Turning the knob up does not make the
 * drone busy, it makes the drone *breathe faster*, and the arc above already walks all four
 * bands at the neutral detent so nothing needs touching to hear the whole range.
 */
const PATTERNS: Pattern[] = [
  // ---- texture ------------------------------------------------------------------------
  // Band 0 is the piece at rest: one strike, then four bars of decay and nothing else.
  variant('drone-texture-b0', 'texture', 0, 64, on('downbeat', 1)),
  // Band 1 halves it — a strike every two bars, which is the first point at which a listener
  // can hear that the note is being re-struck rather than simply held.
  variant('drone-texture-b1', 'texture', 1, 64, on('downbeat', 1, 33)),
  // Band 2 puts the first strike off the beat. The bar line stops being the only place the
  // note can begin, which is the whole difference between a drone and a pedal.
  variant('drone-texture-b2', 'texture', 2, 64, on('downbeat', 1, 33), on('offbeat', 19, 51)),
  // Band 3, and still only seven strikes in four bars. The accent is on the third bar rather
  // than the first: the piece leans late, so the phrase pushes towards its own end.
  variant(
    'drone-texture-b3',
    'texture',
    3,
    64,
    on('downbeat', 1, 17, 33),
    on('offbeat', 11, 27, 51),
    at('accent', 104, 49),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const droneStudy: Template = {
  id: 'drone-study',
  name: 'Drone Study',

  /**
   * Slow, and the range is narrow because the tempo is doing very little work here — at one
   * strike per four bars, sixty and eighty-four sound like the same piece taken at different
   * distances rather than like two different pieces.
   */
  bpm: { min: 60, max: 84, default: 72 },

  /**
   * Phrygian throughout, and only phrygian. The cycle below leans on the flat second, which is
   * the mode's entire signature and which no other mode in the library has — authoring `bII` and
   * then offering a key without it would ask the reader to borrow a chord the key does not
   * contain, in a guide whose whole promise is that the values on the page are the values to
   * dial. Ambient Dub makes the identical argument for its dorian `IV`, and it is the argument
   * that decides which modes a direction may offer.
   */
  keys: ['E phrygian', 'A phrygian', 'C phrygian'],

  /**
   * Seven sections, 132 bars, and one arc out and back.
   *
   * Energies 0.05 / 0.28 / 0.55 / 0.78 / 0.6 / 0.33 / 0.1 land on bands 0 / 1 / 2 / 3 / 2 / 1 / 0
   * at the neutral detent — the only symmetric band vector in the registry, and the one shape a
   * piece has when nothing about it is a drop.
   *
   * The bars are not symmetric, and that is the point of pairing them with a symmetric arc: the
   * way out is 45 bars and the way home is 54, so the two halves land on the same bands at
   * different speeds. None of the seven is a power of two, and the longest is the crest rather
   * than the recede, because a drone piece that spends longest in its own middle is a drone
   * piece with a centre.
   */
  structure: [
    { name: 'Settle', bars: 9, energy: 0.05 },
    { name: 'Gather', bars: 15, energy: 0.28 },
    { name: 'Tilt', bars: 21, energy: 0.55 },
    { name: 'Vast', bars: 33, energy: 0.78 },
    { name: 'Turn', bars: 18, energy: 0.6 },
    { name: 'Give', bars: 24, energy: 0.33 },
    { name: 'Hush', bars: 12, energy: 0.1 },
  ],

  /**
   * §4.1. Sixteen bars and two changes, **implied by one line rather than played under it**.
   *
   * Eight bars of `i` is half the cycle spent going nowhere, which is what earns the two changes
   * that follow: `bII` is the phrygian flat second, a semitone up and the mode's whole signature,
   * and `vii` walks back down. Both hooks move at bar 9 and again at bar 13 — the same two bars
   * the cycle changes on — so in a one-voice rig the note change *is* the chord change, and there
   * are exactly two of them in sixteen bars.
   *
   * **`vii` is lowercase, and it is worth saying why**, because Ambient Dub's dorian cycle spells
   * the same numeral uppercase. The chord is whatever the mode makes it: stacking thirds on the
   * seventh degree of dorian gives a major triad and on the seventh degree of phrygian gives a
   * minor one, so the case follows the mode rather than the numeral. Getting it wrong would put a
   * chord quality on the page that the key does not contain — the same failure as offering a key
   * without the `bII`, one layer down.
   */
  harmony: {
    cycleBars: 16,
    progression: [
      { degree: 'i', bars: 8 },
      { degree: 'bII', bars: 4 },
      { degree: 'vii', bars: 4 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Both are sixteen bars — one full turn of the cycle — and
   * both are **monophonic**, deliberately: a single-voice box is exactly the rig this direction
   * expects, and a hook that needs two notes at once would be a hook most of the library cannot
   * play. `degree` is 1-based in the key and `octave` is an offset from `baseOctave`, which is
   * scientific pitch with middle C at C4.
   *
   * Two of them, so the seed has a choice to make (§4.1), and they disagree about what the piece
   * is centred on rather than merely decorating each other differently.
   */
  hooks: [
    {
      // The root of each chord in turn: the tonic for eight bars, then the root of `bII` a
      // semitone above it, then the root of `vii` dropped an octave. The only hook here that
      // spends the first half of the cycle on the tonic, which is what makes the step up at
      // bar 9 land as a change rather than as a continuation.
      id: 'drone-hook-pedal',
      forRole: 'texture',
      bars: 16,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 128 },
        { step: 129, degree: 2, octave: 0, len: 64 },
        { step: 193, degree: 7, octave: -1, len: 64 },
      ],
    },
    {
      // The same cycle heard from above, and a different piece rather than a variation: it never
      // states the root at all. The fifth over `i`, the third of `bII`, the third of `vii` — one
      // chord tone each, so the line implies the whole cycle without ever landing on the tonic,
      // and it ends a semitone above the root instead of on it. Where the pedal settles, this one
      // leans, so a reroll between the two changes what the sixteen bars are *about*.
      id: 'drone-hook-upper',
      forRole: 'texture',
      bars: 16,
      baseOctave: 2,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 128 },
        { step: 129, degree: 4, octave: 0, len: 64 },
        { step: 193, degree: 2, octave: 0, len: 64 },
      ],
    },
  ],

  /**
   * §4.4. One request, and it is the direction.
   *
   * `soft` rather than `dark` because the two are not interchangeable here: a dark texture is a
   * filtered one and a soft texture is a slow one, and 132 bars at one strike per four is asking
   * for the second. It is also the best-covered character this role has — **eight** of the
   * fourteen boxes author `texture`, and every one of those eight authors it in `soft` exactly —
   * which is what makes a one-part direction resolvable on a one-box rig rather than a thing that
   * only works on paper.
   *
   * `continuous`, so it occupies all seven sections — there is nothing to hand the voice to.
   *
   * **`reArticulatesHook`, and this is the direction it exists for.** The header above says the
   * variants are "a re-articulation map: the places the player lifts and re-strikes a note that
   * is otherwise continuous", and the hooks below are three notes in sixteen bars, held four and
   * eight bars each. So the two layers cannot be competing rhythms: there is one note sounding
   * at any moment and the only question the variants answer is when it is struck again. Without
   * the flag #100 gives the whole of phase 5 to the hook, and this direction — whose one part is
   * the whole guide — loses the only rhythmic decision it contains, along with everything the
   * density knob does.
   */
  roles: [
    {
      id: 'r-texture',
      role: 'texture',
      priority: 1,
      character: 'soft',
      sustain: 'continuous',
      reArticulatesHook: true,
    },
  ],

  patterns: PATTERNS,
}
