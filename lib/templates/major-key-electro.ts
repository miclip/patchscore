import type { Pattern, Template } from '../core/template'
import { at, on, variant } from '../core/authoring'

/**
 * Major-Key Electro (§4). The third template, and the one that proves the vocabulary is not
 * secretly minor-only.
 *
 * **Nothing here names a device** (invariant 3). Vocoders, tom-tuned drum machines and the
 * boxes people reach for to make this music are the far side of the boundary; what this file
 * says is `vox-chop`, `tom` and a set of degrees.
 *
 * The genre in one line: a syncopated kick that refuses the downbeat on beats 2 and 4, a snare
 * that states them instead, toms used as a melodic part rather than a fill, and everything
 * tonal sitting in a major key with no borrowed darkness anywhere.
 *
 * What it exercises that the other two do not:
 *
 *  - **Only major keys.** Every other template so far offers minor or dorian, so the whole
 *    major side of `MODE_STEPS` — and every degree spelt against it — reaches a rendered guide
 *    for the first time through this file.
 *  - **A transient request on a tonal role.** `vox-chop` is scoped to two sections rather than
 *    owning a voice for the track (§4.2). Transience is not a property of `riser`/`impact`/
 *    `sweep`; it is a property of the *request*, and this is where that is true in the data.
 *  - **A four-band `lead` and `arp`.** Melodic parts that carry both a hook and a rhythm, which
 *    is the pairing the renderer has to keep straight.
 */

// ---------------------------------------------------------------------------
// §4.3 Step patterns — four authored bands for every patterned role
// ---------------------------------------------------------------------------

/**
 * The grid and the slot meanings are in `../core/authoring`. Every role with any pattern here has all
 * four bands; §6.3's fallback exists for templates with holes and is reported when it fires.
 *
 * Nothing in this template is pattern-less: every part it asks for is a part you program. That
 * is a fact about electro rather than a rule — the sustained roles that need no grid are the
 * ones this genre does not use.
 */
const PATTERNS: Pattern[] = [
  // ---- kick ---------------------------------------------------------------------------
  // Syncopated, never four-to-the-floor: the offbeats arrive before beats 2 and 4 ever do, and
  // at no band does this kick hit step 5 or step 13. That hole is where the snare lives.
  variant('electro-kick-b0', 'kick', 0, 16, on('downbeat', 1)),
  variant('electro-kick-b1', 'kick', 1, 16, on('downbeat', 1, 9)),
  variant('electro-kick-b2', 'kick', 2, 16, on('downbeat', 1, 9), on('offbeat', 7, 15)),
  variant(
    'electro-kick-b3',
    'kick',
    3,
    16,
    on('downbeat', 1, 9),
    on('offbeat', 3, 7, 15),
    at('ghost', 50, 12),
  ),

  // ---- snare --------------------------------------------------------------------------
  // The part that states the backbeat, so it is the one that takes the slot. Band 3 trades the
  // second backbeat for an accent and runs 16ths out of the bar.
  variant('electro-snare-b0', 'snare', 0, 16, on('backbeat', 13)),
  variant('electro-snare-b1', 'snare', 1, 16, on('backbeat', 5, 13)),
  variant('electro-snare-b2', 'snare', 2, 16, on('backbeat', 5, 13), at('ghost', 46, 8)),
  variant(
    'electro-snare-b3',
    'snare',
    3,
    16,
    on('backbeat', 5),
    at('accent', 108, 13),
    at('ghost', 46, 8),
    on('fill', 14, 15, 16),
  ),

  // ---- closed-hat ---------------------------------------------------------------------
  // Offbeat 8ths, then the beat, then every 16th on the grid. Band 3 is the only variant in
  // this template that leaves no step empty.
  variant('electro-closed-hat-b0', 'closed-hat', 0, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'electro-closed-hat-b1',
    'closed-hat',
    1,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 44, 2, 10),
  ),
  variant(
    'electro-closed-hat-b2',
    'closed-hat',
    2,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
  ),
  variant(
    'electro-closed-hat-b3',
    'closed-hat',
    3,
    16,
    on('downbeat', 1, 5, 9, 13),
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 42, 2, 4, 6, 8, 10, 12, 14),
    at('accent', 106, 16),
  ),

  // ---- open-hat -----------------------------------------------------------------------
  // Late in the bar first: the open hat is a lift into the next bar before it is a part, so
  // band 0 states step 15 alone and only band 2 spreads it across all four offbeats.
  variant('electro-open-hat-b0', 'open-hat', 0, 16, on('offbeat', 15)),
  variant('electro-open-hat-b1', 'open-hat', 1, 16, on('offbeat', 7, 15)),
  variant('electro-open-hat-b2', 'open-hat', 2, 16, on('offbeat', 3, 7, 11, 15)),
  variant(
    'electro-open-hat-b3',
    'open-hat',
    3,
    16,
    on('offbeat', 3, 7, 11, 15),
    at('ghost', 44, 2),
    at('accent', 106, 16),
  ),

  // ---- tom ----------------------------------------------------------------------------
  // Two bars, and a part rather than a fill: the run lives in the second bar at every band,
  // which is what makes it answer the first bar instead of decorating it.
  variant('electro-tom-b0', 'tom', 0, 32, on('downbeat', 17)),
  variant('electro-tom-b1', 'tom', 1, 32, on('downbeat', 1, 17)),
  variant('electro-tom-b2', 'tom', 2, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  variant(
    'electro-tom-b3',
    'tom',
    3,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 11, 23, 27),
    at('accent', 110, 25),
    on('fill', 30, 31, 32),
  ),

  // ---- bass-mid -----------------------------------------------------------------------
  // Two bars against a one-bar kick, so the line and the pulse only agree every other bar.
  variant('electro-bass-mid-b0', 'bass-mid', 0, 32, on('downbeat', 1), on('offbeat', 11)),
  variant(
    'electro-bass-mid-b1',
    'bass-mid',
    1,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 11, 27),
  ),
  variant(
    'electro-bass-mid-b2',
    'bass-mid',
    2,
    32,
    on('downbeat', 1, 17),
    on('offbeat', 7, 11, 23, 27),
  ),
  variant(
    'electro-bass-mid-b3',
    'bass-mid',
    3,
    32,
    on('downbeat', 1, 9, 17),
    on('offbeat', 7, 11, 15, 23, 27),
    at('ghost', 50, 4, 20),
    at('accent', 108, 31),
  ),

  // ---- arp ----------------------------------------------------------------------------
  // The one part whose bands are a straight subdivision: 8ths of a bar, then quarters of the
  // beat, then every 16th, then every step. Nothing syncopates, because the arp is the grid
  // everything else is heard against.
  variant('electro-arp-b0', 'arp', 0, 32, on('downbeat', 1, 9, 17, 25)),
  variant('electro-arp-b1', 'arp', 1, 32, on('downbeat', 1, 5, 9, 13, 17, 21, 25, 29)),
  variant(
    'electro-arp-b2',
    'arp',
    2,
    32,
    on('downbeat', 1, 5, 9, 13, 17, 21, 25, 29),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
  ),
  variant(
    'electro-arp-b3',
    'arp',
    3,
    32,
    on('downbeat', 1, 5, 9, 13, 17, 21, 25, 29),
    on('offbeat', 3, 7, 11, 15, 19, 23, 27, 31),
    at('ghost', 42, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32),
  ),

  // ---- lead ---------------------------------------------------------------------------
  // Sparse at every band. The hook says which notes; this says how often the part speaks.
  variant('electro-lead-b0', 'lead', 0, 32, on('downbeat', 1)),
  variant('electro-lead-b1', 'lead', 1, 32, on('downbeat', 1, 17)),
  variant('electro-lead-b2', 'lead', 2, 32, on('downbeat', 1, 17), on('offbeat', 11, 27)),
  variant(
    'electro-lead-b3',
    'lead',
    3,
    32,
    on('downbeat', 1, 9, 17),
    on('offbeat', 11, 23, 27),
    at('accent', 104, 29),
  ),

  // ---- vox-chop -----------------------------------------------------------------------
  // One bar, because a chopped phrase that takes two bars to come round is a phrase, not a
  // chop. Only ever heard in the two sections the request scopes it to.
  variant('electro-vox-chop-b0', 'vox-chop', 0, 16, on('downbeat', 1)),
  variant('electro-vox-chop-b1', 'vox-chop', 1, 16, on('downbeat', 1, 9)),
  variant(
    'electro-vox-chop-b2',
    'vox-chop',
    2,
    16,
    on('downbeat', 1, 9),
    on('offbeat', 7, 15),
  ),
  variant(
    'electro-vox-chop-b3',
    'vox-chop',
    3,
    16,
    on('downbeat', 1, 5, 9),
    on('offbeat', 3, 7, 15),
    at('accent', 102, 13),
  ),
]

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export const majorKeyElectro: Template = {
  id: 'major-key-electro',
  name: 'Major-Key Electro',
  bpm: { min: 124, max: 134, default: 128 },

  /**
   * Major and nothing else — the name is a promise, and a minor key in this list would break
   * it. Four tonics rather than three because the seed picks one (§4.1) and this is the
   * template a reader is most likely to reroll for a key that suits a voice.
   */
  keys: ['C major', 'D major', 'F major', 'A major'],

  /**
   * Six sections, 80 bars. Energy 0.2 / 0.45 / 0.8 / 0.55 / 0.95 / 0.15 lands on bands
   * 0 / 1 / 3 / 2 / 3 / 0 at the neutral detent. The Bridge is the section doing the work
   * there: it drops the arrangement by one band without emptying it, which is a different
   * shape from a breakdown that falls back to almost nothing.
   */
  structure: [
    { name: 'Intro', bars: 8, energy: 0.2 },
    { name: 'Verse', bars: 16, energy: 0.45 },
    { name: 'Hook', bars: 16, energy: 0.8 },
    { name: 'Bridge', bars: 8, energy: 0.55 },
    { name: 'Peak', bars: 24, energy: 0.95 },
    { name: 'Outro', bars: 8, energy: 0.15 },
  ],

  /** §4.1. Eight bars, four chords, two bars each: I - vi - IV - V, resolved at step 5.5. */
  harmony: {
    cycleBars: 8,
    progression: [
      { degree: 'I', bars: 2 },
      { degree: 'vi', bars: 2 },
      { degree: 'IV', bars: 2 },
      { degree: 'V', bars: 2 },
    ],
  },

  /**
   * §4.1. Authored, never generated. Steps are the same 16ths-per-bar grid the patterns use;
   * `degree` is 1-based in the key, and degrees past the seventh are extensions rather than
   * errors — degree 8 is the tonic an octave up, degree 10 the third above that. `octave` is an
   * offset from the hook's own `baseOctave`, in scientific pitch with middle C at C4.
   *
   * The bass sits two octaves under middle C, the arp just under it and the lead above it, so
   * the three tonal parts do not all resolve into the same octave and fight.
   */
  hooks: [
    {
      id: 'electro-hook-bass-1',
      forRole: 'bass-mid',
      bars: 2,
      baseOctave: 1,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 4 },
        { step: 7, degree: 1, octave: 0, len: 2 },
        { step: 11, degree: 5, octave: 0, len: 3 },
        { step: 17, degree: 1, octave: 0, len: 4 },
        { step: 23, degree: 6, octave: 0, len: 2 },
        { step: 27, degree: 3, octave: 0, len: 3 },
      ],
    },
    {
      // Four bars, one per chord of the cycle's first half and back — the melody states the
      // major third twice before it ever reaches the octave, which is the whole point of it.
      id: 'electro-hook-lead-1',
      forRole: 'lead',
      bars: 4,
      baseOctave: 4,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 4 },
        { step: 11, degree: 3, octave: 0, len: 4 },
        { step: 17, degree: 6, octave: 0, len: 6 },
        { step: 27, degree: 5, octave: 0, len: 4 },
        { step: 33, degree: 8, octave: 0, len: 4 },
        { step: 43, degree: 7, octave: 0, len: 4 },
        { step: 49, degree: 5, octave: 0, len: 8 },
        { step: 59, degree: 3, octave: 0, len: 4 },
      ],
    },
    {
      // Two bars of running 16ths: the tonic triad up and back, then the same shape from the
      // sixth. One note per step, so it lines up with the arp's own variants hit for hit.
      id: 'electro-hook-arp-1',
      forRole: 'arp',
      bars: 2,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 2 },
        { step: 3, degree: 3, octave: 0, len: 2 },
        { step: 5, degree: 5, octave: 0, len: 2 },
        { step: 7, degree: 8, octave: 0, len: 2 },
        { step: 9, degree: 5, octave: 0, len: 2 },
        { step: 11, degree: 3, octave: 0, len: 2 },
        { step: 13, degree: 1, octave: 0, len: 2 },
        { step: 15, degree: 3, octave: 0, len: 2 },
        { step: 17, degree: 6, octave: 0, len: 2 },
        { step: 19, degree: 8, octave: 0, len: 2 },
        { step: 21, degree: 10, octave: 0, len: 2 },
        { step: 23, degree: 13, octave: 0, len: 2 },
        { step: 25, degree: 10, octave: 0, len: 2 },
        { step: 27, degree: 8, octave: 0, len: 2 },
        { step: 29, degree: 6, octave: 0, len: 2 },
        { step: 31, degree: 8, octave: 0, len: 2 },
      ],
    },
    {
      // One note at a time. A chopped vocal is a sample being retriggered at pitch, not a
      // chord — the stacked-voicing job in this genre belongs to a pad, and asking a chop to
      // sound three notes at once would put a polyphony demand on the part least able to meet
      // it. The line answers the lead a fourth below it and lands on the third of the vi.
      id: 'electro-hook-vox-chop-1',
      forRole: 'vox-chop',
      bars: 2,
      baseOctave: 4,
      notes: [
        { step: 1, degree: 5, octave: 0, len: 2 },
        { step: 5, degree: 8, octave: 0, len: 2 },
        { step: 9, degree: 5, octave: 0, len: 2 },
        { step: 15, degree: 3, octave: 0, len: 2 },
        { step: 17, degree: 6, octave: 0, len: 2 },
        { step: 21, degree: 8, octave: 0, len: 2 },
        { step: 27, degree: 5, octave: 0, len: 3 },
        { step: 31, degree: 3, octave: 0, len: 2 },
      ],
    },
  ],

  /**
   * §4.4. Ascending: 1 outranks 5. Nine requests. The kick and the snare are the genre; the
   * bass and the hats are what make it move; the melodic three are what make it major.
   */
  roles: [
    { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
    { id: 'r-snare', role: 'snare', priority: 1, character: 'clean', sustain: 'continuous' },

    { id: 'r-bass-mid', role: 'bass-mid', priority: 2, character: 'dirty', sustain: 'continuous' },
    {
      id: 'r-closed-hat',
      role: 'closed-hat',
      priority: 2,
      character: 'bright',
      sustain: 'continuous',
    },
    { id: 'r-tom', role: 'tom', priority: 2, character: 'bright', sustain: 'continuous' },

    { id: 'r-lead', role: 'lead', priority: 3, character: 'bright', sustain: 'continuous' },
    { id: 'r-arp', role: 'arp', priority: 3, character: 'clean', sustain: 'continuous' },

    // §4.2. Transient on a *tonal* role: the chops arrive for the two loudest sections and are
    // gone the rest of the track. Transience is a property of the request, not of the three
    // transitional roles — this is the request that says so in the data.
    //
    // `dirty` rather than `clean` because a chopped vocal is a sample with its edges showing;
    // the artefacts are the sound, and asking for a clean one would be asking for the part with
    // the thing that identifies it removed.
    {
      id: 'r-vox-chop',
      role: 'vox-chop',
      priority: 3,
      character: 'dirty',
      sustain: 'transient',
      sections: ['Hook', 'Peak'],
    },

    // §4.4. `optional` removes this from the miss objective entirely: filled if it fits,
    // dropped without complaint if the rig has nothing left. An electro track survives losing
    // its open hat; it does not survive losing its snare — which since #81 is said in the data
    // rather than only here, because it is the reader who needs telling.
    {
      id: 'r-open-hat',
      role: 'open-hat',
      priority: 5,
      character: 'bright',
      sustain: 'continuous',
      optional: true,
      inessential: { reason: 'electro survives losing its open hat; it does not survive losing its snare' },
    },
  ],

  patterns: PATTERNS,
}
