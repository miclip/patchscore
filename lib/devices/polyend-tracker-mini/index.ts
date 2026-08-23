import type { Device, Recipe } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { TRACKER_MINI_PANEL } from './panel'

/**
 * Polyend Tracker Mini (§2.3). Sixteen tracks in **two pools**, which is why this device is in
 * the build at step 4.
 *
 * p.22: "Tracker Mini has 16 tracks. The first 8 can operate with sample instruments, synths
 * and MIDI and tracks 9-16 are used for MIDI and synths". That is one device carrying two pools
 * of *differing capability*, a shape §2.1 never anticipated — and it needed no engine change.
 * `voices` was already a list and a pool is a voice like any other.
 *
 * What it did surface is a cost. Recipe lookup keys on `poolId ?? voiceId` (§2.2), so a recipe
 * authored for `track-synth` never reaches `track-sample`, even though tracks 1-8 host synths
 * perfectly well. Pool B's capability is a strict subset of pool A's and the model cannot say
 * so, so every synth-based recipe below exists **twice**, once per pool, identical but for `id`,
 * `voice` and the routing line. `onBothPools` does that expansion from a single authored source
 * so the twins cannot drift apart; the cost is unchanged — the schema, the resolver and the
 * audit all see two recipes — and `test/tracker-mini.test.ts` pins the count so it cannot grow
 * unnoticed.
 *
 * **Citation regime: legality is cited, authority never is.** Every *point* is taste and stays
 * `verified: false`, enums included; every *range* and every *option set* is the manual's own,
 * cited to the page carrying it (§3.2). One exception, of a different kind rather than a
 * loosening: a `text` param has no legality gate to carry a citation, because it states an
 * instruction rather than picking among legal values — so when the instruction is the manual's
 * own printed procedure, `verified` on the point is the only place that fact can go, and
 * `false` there would badge a documented procedure as a guess. `tm-pad-soft-chord`'s
 * `INSTRUMENT` is the only such param today. Both halves of the manual cooperate here: the instrument pages print a Range column
 * (ch.6) and the step FX chapter prints a "Value Ranges" block per effect (ch.7). Neither states
 * which value suits a dark kick, so no point is ever cited.
 *
 * Capability data — track count, jacks, clock, per-step FX names, gestures — is read off the
 * manual and cited in comments rather than in `verified`: invariant 4 is scoped to parameter
 * values, and a wrong `individualOuts` is visible to anyone holding the box.
 *
 * Four limits on what is authored here, recorded rather than fudged (invariant 5):
 *
 *  - **Volume is not authored.** p.116 prints its range as "-inf dB to 24.00 dB". `-inf` is not
 *    a finite number and `NumericRange` rightly refuses it, and inventing a floor of -60 dB to
 *    make it fit would be exactly the invented claim §3.1 exists to prevent.
 *  - **At most three distinct synth recipes**, because the project has **3 synth slots** (p.32,
 *    p.146) shared across all sixteen tracks. The cap is on *distinct recipes*, not on tracks:
 *    the same patch on several tracks still occupies one slot, so three recipes across sixteen
 *    tracks is realisable while a fourth describes a state the box cannot hold. It is checkable
 *    at authoring time, which is why it is an authoring rule and not a resolver constraint —
 *    a device-global shared resource is a modelling concept the engine does not have, and
 *    improvising one inside a device folder would be the wrong place for it.
 *    `test/tracker-mini.test.ts` fails if a fourth appears. Two pairs were dropped to fit:
 *    `stab + hard` (authored on FAT, then removed) and `acid + dirty` (wanted on ACD, never
 *    authored) — both remain legal on both pools and resolve as honest gaps.
 *  - **ACD and WTFM are attributable but unauthored.** Their parameter tables are headed by the
 *    model's *logo*, a graphic, so text extraction loses it — but the rendered pages carry it
 *    plainly (ACD p.154, WTFM p.162), and all five engines are documented. They go unused only
 *    because of the three-slot cap above. `acid` is therefore legal on both pools and authored
 *    on neither: a gap shown honestly rather than a guess.
 *  - **Pool ordinals always start at 1** (§2.2), so `track-synth` expands to "Synth Track 1..8"
 *    while the panel calls those tracks 9-16. Each pool-B recipe carries the mapping in its
 *    `routing` line, which is the only place the guide can say it today.
 *
 * The manual contradicts itself on the track count: p.270 still reads "Tracker Mini has 8 voices.
 * Each voice is represented by each of the 8 tracks", which is the pre-2.0 machine. p.22 and
 * p.147 ("Synths can be applied on steps for any of the 16 tracks") are the 2.x behaviour and are
 * what is modelled here.
 */

/**
 * Ranges exactly as the manual's own Range column and "Value Ranges" blocks print them. These
 * are the cited claim; the point inside is taste.
 */
const PCT = { min: 0, max: 100 } //                 0-100%
const BIPOLAR_PCT = { min: -100, max: 100 } //      -100% to 100%
const NOTE_TRACK = { min: -200, max: 200 } //       -200% to 200%
const VOICE_VOL = { min: 0, max: 200 } //           0-200%
const PAN = { min: -50, max: 50 } //                -50L to +50R
const PW = { min: -50, max: 50 } //                 -50 to 50
const UNITLESS_100 = { min: 0, max: 100 } //        0-100, no unit printed
const SEMITONES_24 = { min: -24, max: 24 } //       -24 Semitones to +24 Semitones
const SEMITONES_36 = { min: -36, max: 36 } //       -36 to 36 st
const FINE_CENTS = { min: -100, max: 100 } //       -100 Cents to +100 Cents
const DETUNE_CENTS = { min: 0, max: 100 } //        0-100 c
const BITS = { min: 4, max: 16 } //                 4-16
const SECONDS_10 = { min: 0, max: 10 } //           0.00-10 Sec
const SECONDS_3 = { min: 0, max: 3 } //             0.00 - 3 Sec
const AUDIO_HZ = { min: 20, max: 20000 } //         20Hz - 20kHz

/** A range citation. The page is the one carrying that parameter's own printed bound. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Polyend Tracker Mini Manual 2.2.1b, p.${page}` }
}

function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: cite(page) },
    verified: false,
    ...extra,
  }
}

/**
 * §6.1. The swing axis, as an ordinary cited numeric (#62).
 *
 * p.185, the Swing step FX (`I`): *"Introduces a groove or shuffle into the pattern timing. 50%
 * is no swing. Range is 25% to 75% of pattern swing. Also applied to MIDI Out."* Everything the
 * axis needs is printed there — the bounds **and** the neutral point, which is rarer than it
 * sounds and is why nothing here is a guess but the taste of where to sit inside it.

 * **The point stays `verified: false`, and that is not an oversight.** The page prints where the
 * neutral *is*; it does not say that this recipe should sit there. Those are two claims, and
 * §3.2 splits them exactly this way: the range is the legality gate and carries the citation,
 * the point is authority and is taste. Badging the point `manual` would put the manual's name to
 * "a soft pad wants no swing", which no page states. The neutral is a property of the scale, so
 * it travels on the range's own citation and in the `note` — which is how `EQ BASS AMOUNT`'s
 * "25 is neutral" is already carried on the Deluge.
 *
 * **Pattern-wide, though it is entered on a step.** The same page: *"Swing on a step track will
 * apply across the pattern."* So the `note` says so, because the value appears under every part
 * this box carries and a reader should not set it sixteen times.
 *
 * Not `micro-move` (p.186), which nudges a single step forward and is the per-step control. It
 * would take one edit per offbeat hit and an invented percentage-to-value scale to reproduce
 * what this does with one setting — the manual will not say how far a Micro Move actually
 * moves a note ("only in small amounts"), so that scale could only ever be fabricated.
 *
 * `amount` is 25, the distance from 50 to each printed bound, so the whole sweep of the knob
 * moves the value and no part of the travel is spent against a clamp.
 */
function swing(): AuthoredNumericParam {
  return num('SWING', 50, { min: 25, max: 75 }, 185, {
    unit: '%',
    mood: [{ axis: 'swing', amount: 25 }],
    hint: 'pick-fx',
    note: '50% is no swing; set once, it applies across the whole pattern',
  })
}

/**
 * A time in seconds. Identical to `num` but for the step, which is a hundredth.
 *
 * The manual prints these bounds to two decimals — `0.00-10 Sec`, p.126 — so a hundredth is the
 * grid the box itself works on, and the default step of 1 is simply the wrong instrument for
 * them: it would round every mood offset here to a whole second, turning a 0.09 Sec nudge into
 * either nothing or a tenfold change. Declared once rather than at sixteen call sites, because
 * the next `Sec` parameter someone authors needs it too and would not think to add it.
 */
function secs(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return num(name, value, bounds, page, { unit: 'Sec', step: 0.01, ...extra })
}

/**
 * An enum, with its two claims kept apart exactly as `num` keeps a range and a point apart
 * (§3.2). The option *set* is legality and is cited: "Pingpong loop" either appears in the Play
 * Mode table on p.127 or it does not. The *value* is which one this recipe reaches for, and that
 * is taste, so it stays provisional.
 */
function pick(name: string, value: string, options: string[], page: number): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: cite(page) },
    verified: false,
  }
}

/** p.127, the Play Mode table, as the on-screen selector prints them. */
const PLAY_MODES = [
  '1-Shot',
  'Forward loop',
  'Backward loop',
  'Pingpong loop',
  'Slice',
  'Beat Slice',
  'Wavetable',
  'Granular',
]

/** p.117: "Options; Disabled, low-pass, high-pass, band-pass." */
const FILTER_TYPES = ['Disabled', 'Low-pass', 'High-pass', 'Band-pass']

/** p.156, the three FAT filter emulations. */
const FAT_FILTERS = ['Low Pass MG 24dB', 'Low Pass OB 24dB', 'Low Pass OB 12dB']

/** p.158, VAP's fifteen. Listed in full: narrowing to what is authored hides the box. */
const VAP_FILTERS = [
  'Low Pass MG 24dB',
  'Low Pass OB 24dB',
  'Low Pass OB 12dB',
  'Low Pass SVF 24dB',
  'Low Pass SVF 12dB',
  'Hi Pass OB 24dB',
  'Hi Pass OB 12dB',
  'Hi Pass SVF 24dB',
  'Hi Pass SVF 12dB',
  'Band Pass OB 24dB',
  'Band Pass OB 12dB',
  'Band Pass SVF 24dB',
  'Band Pass SVF 12dB',
  'Notch SVF 24dB',
  'Notch SVF 12dB',
]

/** p.146's five models, in the order the selector lists them. */
const SYNTH_MODELS = ['ACD', 'FAT', 'VAP', 'WTFM', 'PERC']

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Tracks 1-8 take sample instruments, synths *or* MIDI (p.22), so a sampler with 48 instrument
 * slots (p.114) can be pointed at any role there is.
 */
const SAMPLE_POOL_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture',
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
]

/**
 * Tracks 9-16 take synths and MIDI only (p.22) — no sample playback. A role here is what this
 * box can *sound itself*: a MIDI track addresses another device, and that device carries its own
 * assignables, so counting arbitrary external gear towards these roles would count the same part
 * twice.
 *
 * That subtracts exactly one role. `vox-chop` is a chopped vocal by definition and needs recorded
 * audio; everything else is reachable from the five engines, including the whole drum kit, because
 * PERC really is a drum machine in a synth slot — Kick, Tom, Snare, open and closed Hi-Hats,
 * Cymbal and Perc (p.146, tables pp.166-170). Excluding `rim` and `ride` for want of a dedicated
 * model would be a taste judgement dressed as a capability: a synth that can make a cymbal can
 * make a ride.
 */
const SYNTH_POOL_ROLES: Role[] = SAMPLE_POOL_ROLES.filter((r) => r !== 'vox-chop')

// ---------------------------------------------------------------------------
// Cross-pool duplication
// ---------------------------------------------------------------------------

/**
 * One authored synth recipe becomes two: tracks 1-8 host synths as readily as tracks 9-16, and
 * a recipe can name only one voice. **This is the step 4 finding, in the one place it costs
 * something.** Expanding from a single source keeps the twins from drifting; it does not make
 * the duplication cheaper, and `DUPLICATED_SYNTH_RECIPES` below is the number an engine that
 * let a recipe name several pools would save today.
 */
function onBothPools(
  base: Omit<Recipe, 'id' | 'voice' | 'routing'> & { id: string },
): [Recipe, Recipe] {
  return [
    {
      ...base,
      id: `${base.id}-sample`,
      voice: 'track-sample',
      routing: 'Tracks 1-8 — costs one of the three project synth slots',
    },
    {
      ...base,
      id: `${base.id}-synth`,
      voice: 'track-synth',
      routing: 'Synth Track n is panel track n+8 — costs one of the three project synth slots',
    },
  ]
}

/** Synth-based recipes authored once and carried on both pools. */
const SYNTH_RECIPES: Recipe[] = [
  // ---- FAT: "deep reese basses ... expressive leads" (p.146) --------------------------
  ...onBothPools({
    id: 'tm-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    title: 'Wide detuned reese, filter well down',
    params: [
      pick('MODEL', 'FAT', SYNTH_MODELS, 146),
      pick('FILTER TYPE', 'Low Pass OB 24dB', FAT_FILTERS, 156),
      num('FATNESS', 78, UNITLESS_100, 156, { hint: 'edit-patch' }),
      num('BRIGHTNESS', 22, UNITLESS_100, 156, {
        mood: [{ axis: 'darkness', amount: -14 }],
      }),
      num('TIMBRE', 40, UNITLESS_100, 156),
      num('FILTER CUTOFF', 620, AUDIO_HZ, 156, {
        unit: 'Hz',
        mood: [{ axis: 'darkness', amount: -260 }],
      }),
      num('FILTER RESONANCE', 18, PCT, 156, { unit: '%' }),
      secs('AMP ENV RELEASE', 0.35, SECONDS_10, 156),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { glide: 35 }, hint: 'pick-fx' }],
    verified: false,
  }),
  // ---- VAP: "lush pads ... mesmerizing, evolving textures" (p.146) --------------------
  ...onBothPools({
    id: 'tm-pad-soft',
    role: 'pad',
    character: 'soft',
    title: 'Slow detuned pad, long swell',
    params: [
      pick('MODEL', 'VAP', SYNTH_MODELS, 146),
      pick('FILTER TYPE', 'Low Pass SVF 12dB', VAP_FILTERS, 158),
      num('OSC MIX', 0, BIPOLAR_PCT, 158, { unit: '%' }),
      num('SHAPE 1', 28, UNITLESS_100, 158),
      num('SHAPE 2', 34, UNITLESS_100, 158),
      num('DETUNE', 14, DETUNE_CENTS, 158, { unit: 'c' }),
      num('FILTER CUTOFF', 2400, AUDIO_HZ, 158, {
        unit: 'Hz',
        mood: [{ axis: 'darkness', amount: -900 }],
      }),
      secs('AMP ENV ATTACK', 1.2, SECONDS_10, 159),
      secs('AMP ENV RELEASE', 2.4, SECONDS_10, 159),
      num('VOICE VOLUME', 86, VOICE_VOL, 161, { unit: '%' }),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { 'gate-length': 95 } }],
    verified: false,
  }),
  ...onBothPools({
    id: 'tm-lead-bright',
    role: 'lead',
    character: 'bright',
    title: 'Cutting two-oscillator lead with glide',
    params: [
      pick('MODEL', 'VAP', SYNTH_MODELS, 146),
      pick('FILTER TYPE', 'Low Pass OB 24dB', VAP_FILTERS, 158),
      num('SHAPE 1', 74, UNITLESS_100, 158),
      num('PW 1', -18, PW, 158),
      num('TUNE 2', 12, SEMITONES_36, 158, { unit: 'st' }),
      num('FINETUNE', 6, FINE_CENTS, 158, { unit: 'c' }),
      num('FILTER CUTOFF', 6200, AUDIO_HZ, 158, {
        unit: 'Hz',
        mood: [{ axis: 'darkness', amount: -1800 }],
      }),
      num('FILTER NOTE TRACK', 65, NOTE_TRACK, 158, { unit: '%' }),
      secs('GLIDE TIME', 0.06, SECONDS_3, 161),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' }],
    verified: false,
  }),
]

/**
 * What a recipe naming several pools would save today. Pinned by the manifest test, and capped
 * at three by the project's three synth slots (p.32, p.146).
 */
export const DUPLICATED_SYNTH_RECIPES = SYNTH_RECIPES.length / 2

/** p.32, p.146. Three slots, shared across all sixteen tracks. */
export const SYNTH_SLOTS = 3

/**
 * Sample-based recipes. These stay on `track-sample` because tracks 9-16 cannot load a sample
 * instrument at all (p.22) — the one place the two pools genuinely diverge.
 */
const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'tm-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track-sample',
    title: 'Tight one-shot kick, tuned down, no tail',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('TUNE', -3, SEMITONES_24, 116, { unit: 'St' }),
      num('CUTOFF', 74, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -16 }] }),
      num('OVERDRIVE', 18, PCT, 120, { unit: '%', mood: [{ axis: 'grit', amount: 22 }] }),
      secs('ENV DECAY', 0.28, SECONDS_10, 126, { mood: [{ axis: 'density', amount: -0.09 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tm-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'track-sample',
    title: 'Long low kick, filter closed on the tail',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('TUNE', -7, SEMITONES_24, 116, {
        unit: 'St',
        mood: [{ axis: 'darkness', amount: -3 }],
      }),
      num('CUTOFF', 46, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -14 }] }),
      secs('ENV DECAY', 0.62, SECONDS_10, 126),
      num('REVERB SEND', 8, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 18 }] }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { volume: 92 } }],
    verified: false,
  },
  {
    id: 'tm-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'track-sample',
    title: 'Snappy snare, top end open',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'High-pass', FILTER_TYPES, 117),
      num('CUTOFF', 22, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: 12 }] }),
      num('TUNE', 2, SEMITONES_24, 116, { unit: 'St' }),
      secs('ENV DECAY', 0.3, SECONDS_10, 126, { mood: [{ axis: 'density', amount: -0.1 }] }),
      num('DELAY SEND', 12, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 24 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'backbeat', set: { volume: 96 } },
      { slot: 'fill', set: { roll: 4 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tm-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track-sample',
    title: 'Wide clap, pushed off centre',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      num('PANNING', 6, PAN, 116),
      num('FINETUNE', 22, FINE_CENTS, 116, { unit: 'c' }),
      num('REVERB SEND', 26, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 26 }] }),
      secs('ENV RELEASE', 0.4, SECONDS_10, 126),
      swing(),
    ],
    articulation: [{ slot: 'backbeat', set: { panning: 8 } }],
    verified: false,
  },
  {
    id: 'tm-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track-sample',
    title: 'Short closed hat, nudged off the grid',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'High-pass', FILTER_TYPES, 117),
      num('CUTOFF', 34, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: 10 }] }),
      secs('ENV DECAY', 0.09, SECONDS_10, 126, { mood: [{ axis: 'density', amount: -0.03 }] }),
      num('PANNING', -12, PAN, 116),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { 'micro-move': 25 }, hint: 'pick-fx' },
      { slot: 'ghost', set: { volume: 38 } },
    ],
    verified: false,
  },
  {
    id: 'tm-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'track-sample',
    title: 'Half-open hat, gated short',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('CUTOFF', 58, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -18 }] }),
      secs('ENV RELEASE', 0.24, SECONDS_10, 126),
      num('BIT DEPTH', 12, BITS, 120, { unit: 'Bits', mood: [{ axis: 'grit', amount: -4 }] }),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { 'gate-length': 45 } }],
    verified: false,
  },
  {
    id: 'tm-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track-sample',
    title: 'Dry rim, dropped in and out',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      num('TUNE', 4, SEMITONES_24, 116, { unit: 'St' }),
      num('PANNING', 18, PAN, 116),
      secs('ENV DECAY', 0.11, SECONDS_10, 126),
      swing(),
    ],
    articulation: [{ slot: 'ghost', set: { chance: 65 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tm-ride-clean',
    role: 'ride',
    character: 'clean',
    voice: 'track-sample',
    title: 'Steady ride with per-hit level drift',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Band-pass', FILTER_TYPES, 117),
      num('CUTOFF', 62, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -12 }] }),
      secs('ENV RELEASE', 0.9, SECONDS_10, 126),
      num('REVERB SEND', 16, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 20 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { 'random-volume': 12 } }],
    verified: false,
  },
  {
    id: 'tm-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track-sample',
    title: 'Low tom, rolls into the fill',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('TUNE', -5, SEMITONES_24, 116, { unit: 'St' }),
      num('CUTOFF', 52, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -15 }] }),
      secs('ENV DECAY', 0.44, SECONDS_10, 126),
      swing(),
    ],
    articulation: [{ slot: 'fill', set: { roll: 2 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tm-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track-sample',
    title: 'Quiet shaker filling the gaps',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      num('PANNING', -22, PAN, 116),
      num('FINETUNE', -14, FINE_CENTS, 116, { unit: 'c' }),
      secs('ENV DECAY', 0.07, SECONDS_10, 126, { mood: [{ axis: 'density', amount: 0.04 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'ghost', set: { volume: 30 } },
      { slot: 'offbeat', set: { chance: 50 } },
    ],
    verified: false,
  },
  {
    id: 'tm-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'track-sample',
    title: 'Beat-sliced vocal, crushed and reversed in',
    params: [
      pick('PLAY MODE', 'Beat Slice', PLAY_MODES, 127),
      num('NO OF SLICES', 16, { min: 1, max: 48 }, 133),
      num('BIT DEPTH', 8, BITS, 120, { unit: 'Bits', mood: [{ axis: 'grit', amount: -3 }] }),
      num('OVERDRIVE', 34, PCT, 120, { unit: '%', mood: [{ axis: 'grit', amount: 26 }] }),
      num('FINETUNE', 30, FINE_CENTS, 116, { unit: 'c' }),
      swing(),
    ],
    // p.196: Reverse Sample is one of several step FX that only exist for a sample instrument,
    // which is why no `track-synth` recipe uses it.
    articulation: [{ slot: 'first-hit', set: { 'reverse-sample': '<<<' }, hint: 'pick-fx' }],
    verified: false,
  },
  /**
   * §12.4's `sampled-chord`, and the only recipe here that is not a synth patch pretending to
   * be one. p.104 is unambiguous: "Each track in Tracker Mini can handle one voice which can
   * play multiple notes, but not simultaneously... A triad would therefore need 3 tracks to play
   * the chord." A pad the template asks for as three simultaneous notes is therefore *not*
   * reachable by any patch on this box — `tm-pad-soft` is a VAP synth and one track of it sounds
   * one note at a time, whatever the model can do.
   *
   * The same page gives the way out, immediately after the passage above: render the tracks to
   * an audio chord and play the result from one track. That is a real, documented procedure, and
   * once the sample is loaded the chord *is* one note as far as the track is concerned. Hence
   * `realisation: 'sampled-chord'` — the polyphony demand belongs to this recipe rather than to
   * the request, and it is 1 where its VAP neighbour on the very same voice demands 3.
   *
   * **It is `soft` on `track-sample`, exactly like `tm-pad-soft-sample`, and that is the point.**
   * The two are the same part described twice: one lush soft pad, played on a polyphonic voice
   * or loaded as a sample. Under §3's original `(role, character, voice)` key one of them had to
   * be given a character it did not have in order to exist at all, which is precisely the lie
   * this device folder is careful never to tell. The key now carries realisation too (§12.4), so
   * the honest pair is expressible — and it is unambiguous: on a one-note track only this one is
   * usable for a triad, and on a track with three notes to spare §7.1 takes the VAP patch.
   *
   * **Two things this recipe deliberately does not do.**
   *
   * It names no sample, and does not say how many. We do not know the reader's library, and
   * printing a filename they do not have would be an invented value of exactly the kind §3.1
   * exists to refuse. The count is not ours either: it is a property of the *hook* the template
   * authored — one sample per distinct chord *shape* (§12.4), since p.128's "Note value affects
   * pitch" means the step note transposes the whole chord and one recording covers its shape at
   * every root — so the Hook phase lists them and this param points at that rather than
   * guessing. Everything after "it is loaded" is specifiable, and that is what the rest of the
   * params are.
   *
   * It sets no MODEL, no oscillator and no detune, because there is no synth here. That is not a
   * shortfall, it is the point: **this recipe costs none of the three synth slots** (p.32,
   * p.146). On a box with three of them and sixteen tracks, a pad that leaves all three free is
   * a materially different proposition from one that spends a third of the project's synth
   * budget, and the `routing` line says so where the reader will be standing.
   */
  {
    id: 'tm-pad-soft-chord',
    role: 'pad',
    character: 'soft',
    voice: 'track-sample',
    title: 'Rendered chord sample, filtered back and swelled',
    realisation: 'sampled-chord',
    params: [
      {
        kind: 'text',
        name: 'INSTRUMENT',
        value: 'Chord sample(s) — yours, or rendered to audio here; one per chord shape played',
        // The *procedure* is the manual's, printed in full on the page that also states why a
        // triad would otherwise cost three tracks. The choice of sample is the reader's.
        verified: cite(104),
        note:
          'Manual p.104, Rendering Tracks To Audio Chords: place the notes of one chord on ' +
          'separate tracks, Shift + D-Pad to select that range, [More] -> [Render Selection], ' +
          'name it, then [Render & Load]. Replace the instrument on one track with the ' +
          'rendered chord and free the others. One sample covers every chord of the same shape: ' +
          'p.128, the step note sets the playback pitch, so placing a higher note transposes ' +
          'the whole chord. Repeat only where the shape changes — the Hook phase lists which ' +
          'samples this part needs and what to transpose each trigger by.',
      },
      // p.104 step 8: "Ensure the note is set to the same default for the sample playback,
      // example C5." The chord sounds at the pitch it was rendered at, transposed by the step's
      // note — it does not re-voice, so the harmony moves as a block.
      pick('PLAY MODE', 'Forward loop', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('CUTOFF', 44, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -18 }] }),
      num('TUNE', -2, SEMITONES_24, 116, { unit: 'St' }),
      secs('ENV ATTACK', 1.4, SECONDS_10, 126),
      secs('ENV RELEASE', 2.2, SECONDS_10, 126),
      // The sustained level of the chord while the step holds it. Instrument Volume is *not*
      // authored anywhere in this file — p.116 prints its range as "-inf dB to 24.00 dB" and
      // `NumericRange` rightly refuses a non-finite bound — so the level that can be stated
      // honestly is the envelope's, which p.126 prints as a plain 0-100%.
      num('ENV SUSTAIN', 84, PCT, 126, { unit: '%' }),
      num('REVERB SEND', 30, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 24 }] }),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { 'gate-length': 95 } }],
    routing: 'Tracks 1-8 — costs no synth slot: the chord is in the sample, not in an engine',
    verified: false,
  },
  {
    id: 'tm-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track-sample',
    title: 'Granular bed, slow grains, filtered back',
    params: [
      pick('PLAY MODE', 'Granular', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('LENGTH', 640, { min: 1, max: 1000 }, 142, { unit: 'ms' }),
      num('CUTOFF', 48, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -20 }] }),
      num('REVERB SEND', 42, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 30 }] }),
      secs('ENV ATTACK', 1.8, SECONDS_10, 126),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { 'low-pass': 55 } }],
    verified: false,
  },
]

export const device: Device = {
  id: 'polyend-tracker-mini',
  name: 'Tracker Mini',
  maker: 'Polyend',
  kind: 'groovebox',

  // MIDI In and MIDI Out on 3.5mm jacks, 5-pin Type B adapters supplied (p.13); MIDI clock and
  // transport are routable Off / USB / MIDI jack / USB+MIDI in both directions (Config: MIDI
  // Clock In, MIDI Clock Out, Transport In, Transport Out, p.54). `midi-din` is declared because
  // the supplied adapter is what the jack is for; the TRS detail lives here.
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  // One stereo Line Out on a 3.5mm jack, doubling as headphone out; stereo Line In; USB-C audio
  // in/out, enabled in Config -> USB -> Audio (p.13, p.54). No individual outs.
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10. 130 mm, measured off the dimensioned panel drawing in 1.2 Hardware Overview (p.13).
   *
   * **Polyend's specifications call 170 mm the width; that is the vertical span of the panel in
   * playing orientation.** The Tracker Mini is portrait — taller than it is wide — and the p.13
   * drawing dimensions it directly: 130 mm horizontal, 170 mm down the long edge, 20 mm thick.
   * The vendor's 170 is a spec-sheet convention about the long axis, not a claim about which way
   * up the box sits when you play it, and a rack rendering it 170 mm across would be showing it
   * on its side.
   *
   * If you check the Polyend site in six months and think this is wrong: it is not, and this
   * comment is why. The citation is the diagram rather than the spec sheet because the diagram
   * is what was actually measured.
   */
  physical: {
    panelSpanMm: 130,
    verified: { kind: 'manual', source: 'Polyend Tracker Mini Manual 2.2.1b, p.13 (Hardware Overview)' },
  },
  /** §10. A simplified original drawing of the panel, read off the manual (see `panel.ts`). */
  panel: TRACKER_MINI_PANEL,

  /**
   * p.22, the whole reason this device is here. One track sounds one voice: "Each track in
   * Tracker Mini can handle one voice which can play multiple notes, but not simultaneously"
   * (p.104), so polyphony is 1 on both pools (§12.4 counts notes, never roles). The synth
   * slots' own 8-voice budget (p.148) is a different quantity and is not this one.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track-sample',
      label: 'Track',
      count: 8,
      roles: SAMPLE_POOL_ROLES,
      polyphony: 1,
    },
    {
      kind: 'pool',
      id: 'track-synth',
      label: 'Synth Track',
      count: 8,
      roles: SYNTH_POOL_ROLES,
      polyphony: 1,
    },
  ],

  /**
   * This device's own per-step FX names (ch.7), not §2.3's five: `perStep` is an open list
   * compared only against this device's own articulation keys. Each is one of the 37 step FX,
   * carrying its own printed page — Volume p.180, Panning p.181, Glide p.183, Micro Move p.186,
   * Gate Length p.187, Chance p.188, Roll p.189, Random Volume p.195, Reverse Sample p.196,
   * Low Pass Filter p.205.
   *
   * `sidechain` and `lfo` are both omitted. The master chain is saturation, limiter, space and
   * bass boost (p.269) with no sidechain at all.
   *
   * **`lfo` is a finding rather than an absence** (#58). The automation section is documented in
   * full on pp.121-122, and what it describes is a third topology again — different from the
   * TR-1000's assignment slots and from the Cascadia's fixed LFO section:
   *
   *  - Six destinations — Volume, Wavetable Position, Panning, Finetune, Cutoff, Granular
   *    Position — and *"Each destination has the option of an LFO, envelope or no automation."*
   *    The LFO is **per destination**, so there is no pool to count: how many are running is a
   *    property of the patch somebody built, not of the box. `count` has no honest value.
   *  - *"LFO Speeds in Tracker Mini are hard synchronised to the project tempo"*, in step
   *    intervals from 128 down to 1/64. `syncable: true` is right but says far less than the
   *    page does, and the page also carves out an exception a boolean cannot carry: the 128-to-32
   *    step speeds are unavailable when the destination is volume.
   *  - Reset behaviour differs *by destination*: volume resets on each new note, the rest are
   *    semi-free running and reset on playback but not on a note. A flat `destinations: string[]`
   *    discards exactly that.
   *
   * So the field stays off. Nothing reads `features.lfo` — no resolver, no renderer, no
   * validation, no recipe — and a shape elaborate enough to hold three unrelated topologies,
   * designed before any consumer exists, is the mistake this project already made with
   * `PatchEntry` and repaired twice. Model it when something needs to read it.
   */
  features: {
    perStep: [
      'volume',
      'panning',
      'glide',
      'micro-move',
      'gate-length',
      'chance',
      'roll',
      'random-volume',
      'reverse-sample',
      'low-pass',
    ],
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'pick-fx': 'Hold [FX1], press (Up)/(Down)',
    'inst-params': 'Screen button 4 cycles instrument pages',
    'pick-synth': 'Hold [Instrument], press (Up)/(Down)',
    'synth-params': 'Press [2] for synth parameters',
    'edit-patch': 'Press [Edit Patch] screen button',
  },

  /**
   * A conservative taste judgement, not a limit the manual states and not derived from the synth
   * slots — MIDI parts cost no slot, and several tracks can share one patch. Sixteen tracks are
   * all playable at once; twelve is how many parts stay manageable at the machine, on a five-inch
   * screen showing four tracks at a time (p.22). Raise it and nothing breaks: crowding is a cost
   * in the objective, never a feasibility limit (§12.4 counts an assignable once if it is
   * occupied in any section).
   */
  comfortableVoices: 12,

  manual: { title: 'Polyend Tracker Mini Manual', edition: '2.2.1b' },

  recipes: [...SAMPLE_RECIPES, ...SYNTH_RECIPES],
}
