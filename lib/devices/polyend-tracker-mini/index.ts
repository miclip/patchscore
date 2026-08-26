import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type {
  AuthoredEnumParam,
  AuthoredNumericParam,
  AuthoredTextParam,
  Cite,
} from '../../core/params'
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
 * cited to the page carrying it (§3.2). There are now no exceptions. There used to be one: the
 * two chord recipes carried p.104's render-to-audio procedure as the `verified` of a `text`
 * param's *point*, because a text param has no legality gate and that was the only slot the
 * shape offered — which badged the reader's choice of sample with the manual's page. `sourceAudio`
 * (§3/#101) separates the two claims properly, so the page sits on `prep`, where it is true, and
 * the choice of recording is uncited like every other point here.
 *
 * Both halves of the manual cooperate on the ranges: the instrument pages print a Range column
 * (ch.6) and the step FX chapter prints a "Value Ranges" block per effect (ch.7). Neither states
 * which value suits a dark kick, so no point is ever cited.
 *
 * Capability data — track count, jacks, clock, per-step FX names, gestures — is read off the
 * manual, and **where it is cited depends on whether a reader ever sees it.**
 *
 * The two that are *rendered* carry their citation in `capabilityEvidence` (§2.6/#22): the MIDI
 * jacks below, whose ids label the rack diagram's clock sockets and whose notes reach the rig
 * phase, and the `Config > MIDI > Clock Out` menu path the guide tells a reader to set. Both were
 * `verified` fields when #103 and #104 added them and both keep a required entry now, because a
 * page in a comment cites nothing to somebody standing at the machine.
 *
 * Everything else on this box — `io`, `voices`, `features` — is **not yet migrated** and its
 * pages are still in the comments below. §2.6 gives them a home and this manifest has not moved
 * into it: the TR-1000 is the one that has, and its map is the worked example. That is a debt of
 * authoring rather than of shape, and not one invariant 4 charges for — it is scoped to parameter
 * values, and a wrong `individualOuts` is visible to anyone holding the box in a way a wrong
 * `DECAY` is not.
 *
 * **This changes nothing about parameter points**, which is the rule invariant 4 is actually
 * about: every point in every recipe below is still `verified: false`, ranges and option sets
 * still carry the legality citation, and `manualPoints` for this device is still zero.
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
    scope: 'pattern',
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
function pick(
  name: string,
  value: string,
  options: string[],
  page: number,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: cite(page) },
    verified: false,
    ...extra,
  }
}

/**
 * §3.2/#102. A setting the manual gives **no scale for**, so there is no legality gate for a
 * citation to attach to and the point is provisional by construction.
 *
 * This is the shape the box forces exactly twice, and both times for the same reason. Granular
 * `Position`'s Range column on p.142 reads *"Variable"* — the scale is the loaded sample's own
 * length, so any `NumericRange` written here would be invented (invariant 5), and an absolute
 * time would point at a different place in every file a reader loads. The LFO's `Amount` on the
 * automation page is printed with no range at all: p.126's *"The amount will set how much of the
 * envelope is applied 0-100%"* is the **envelope's** Amount, in the envelope's own subsection,
 * and the same field means something else with `Type` set to LFO. Borrowing that bound would be
 * the TR-8S `SNAPPY` mistake — a range cited off the scale that is not in force.
 *
 * Not a return of `INSTRUMENT`, the text param #101 removed. That one put a manual page on a
 * text *point* because it had nowhere else to go, badging the reader's choice of sample as
 * checked. These carry `verified: false` and claim nothing.
 */
function unscaled(
  name: string,
  value: string,
  extra: Partial<AuthoredTextParam> = {},
): AuthoredTextParam {
  return { kind: 'text', name, value, verified: false, ...extra }
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

/**
 * p.142, the Granular parameters table's own Range column: Shape *"Square, Triangle, Gauss"*,
 * Loop *"Forward, Reverse, Pingpong"*. Two of the granular mode's four core parameters, and the
 * page says what each does — Shape is the grain's envelope, *"particularly pertinent in the
 * attack phase"*; Loop *"selects the grain playback direction"*.
 */
const GRAIN_SHAPES = ['Square', 'Triangle', 'Gauss']
const GRAIN_LOOPS = ['Forward', 'Reverse', 'Pingpong']

/**
 * p.121, the Instrument Automation page. Three columns of that screen are option sets, printed
 * as the selector stacks them, and all three are cited to the one page that shows the screen.
 *
 *  - `Type` is `Off / Envelope / LFO`, per destination: *"Each destination has the option of an
 *    LFO, envelope or no automation."*
 *  - `Shape` is the LFO's, and p.122 documents the same five in full (spelling `Rev Saw` out as
 *    "Reverse Saw"). The screen's spelling is what a reader is looking at, so it is what is
 *    listed — the same rule `PLAY_MODES` follows.
 */
const AUTOMATION_TYPES = ['Off', 'Envelope', 'LFO']
const LFO_SHAPES = ['Rev Saw', 'Saw', 'Triangle', 'Square', 'Random']

/**
 * p.123, *"LFO speed — Speed is based on pattern step intervals"*, read down its six columns.
 * Twenty-nine intervals, bare as the table prints them; the screen appends `steps` or `step`
 * (p.121), which the `note` on the parameter says rather than this list inventing a spelling
 * for the fourteen entries the screen's scrolled window never shows.
 *
 * `65` is the manual's, not a transcription slip for 64.
 *
 * The footnote carves out an exception no flat list can carry: *"128 to 32 Step speed options
 * are not available with volume as the destination."* Every use here modulates Granular
 * Position, where the whole list is legal — which is why the options stay complete rather than
 * being trimmed to the subset one destination allows.
 */
const LFO_SPEEDS = [
  '128', '96', '65', '48', '32',
  '24', '16', '12', '8', '6',
  '4', '3', '2', '3/2', '1',
  '3/4', '1/2', '3/8', '1/3', '1/4',
  '3/16', '1/6', '1/8', '1/12', '1/16',
  '1/24', '1/32', '1/48', '1/64',
]

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
    sourceAudio: {
      need: 'A dry kick one-shot under 400 ms, attack intact and no room printed on it',
    },
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
    sourceAudio: {
      need:
        'A long kick one-shot with pitch in the tail, not a click — there has to be a note to ' +
        'tune down',
    },
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
    sourceAudio: {
      need: 'A snare one-shot with the crack still on it, dry, top end unrolled',
    },
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
    sourceAudio: {
      need: 'A stereo hand-clap one-shot — several hands, not one; its own width is what gets panned',
    },
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
    sourceAudio: {
      need: 'A closed hat one-shot under 150 ms, dry, nothing to trim off the end',
    },
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
    sourceAudio: {
      need:
        'An open hat one-shot with a real tail — the release gates it short, so the tail has to ' +
        'exist',
    },
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
    sourceAudio: {
      need: 'A rim or stick one-shot, dry and close to transient-only',
    },
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
    sourceAudio: {
      need:
        'A ride one-shot with a second or more of shimmer; the per-hit level drift needs ' +
        'something to move',
    },
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
    sourceAudio: {
      need:
        'A low tom one-shot with an audible pitch, so tuning down leaves a note rather than a ' +
        'thud',
    },
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
    sourceAudio: {
      need:
        'A shaker, tick or brushed one-shot under 100 ms; it plays quiet, so it has to read ' +
        'quiet',
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      num('PANNING', -22, PAN, 116),
      num('FINETUNE', -14, FINE_CENTS, 116, { unit: 'c' }),
      secs('ENV DECAY', 0.07, SECONDS_10, 126, { mood: [{ axis: 'density', amount: 0.04 }] }),
      swing(),
    ],
    articulation: [{ slot: 'ghost', set: { volume: 30 } }],
    verified: false,
  },
  {
    id: 'tm-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'track-sample',
    title: 'Beat-sliced vocal, crushed and reversed in',
    sourceAudio: {
      need:
        'One or two bars of vocal at this tempo — a phrase, not a word. Beat Slice cuts it into ' +
        '16, so evenly spaced syllables land on the grid',
    },
    params: [
      pick('PLAY MODE', 'Beat Slice', PLAY_MODES, 127),
      num('NO OF SLICES', 16, { min: 1, max: 48 }, 133),
      num('BIT DEPTH', 8, BITS, 120, { unit: 'Bits', mood: [{ axis: 'grit', amount: -3 }] }),
      num('OVERDRIVE', 34, PCT, 120, { unit: '%', mood: [{ axis: 'grit', amount: 26 }] }),
      num('FINETUNE', 30, FINE_CENTS, 116, { unit: 'c' }),
      swing(),
    ],
    // Reverse Sample (p.196) is one of several step FX that exist only for a sample instrument,
    // which is why no `track-synth` recipe uses it.
    //
    // It was authored on `first-hit`, and #108's reachability check found that dead: only
    // Industrial Techno emits `first-hit`, and only for `impact`, so a `vox-chop` never sees
    // one. It moved rather than went, because `accent` is the honest translation of
    // what was meant — the hit the variant leans on is exactly the slice worth turning around,
    // and it is a gesture a tracker player makes. Reversing every downbeat would not be.
    articulation: [{ slot: 'accent', set: { 'reverse-sample': '<<<' }, hint: 'pick-fx' }],
    verified: false,
  },
  /**
   * §12.4's `sampled-chord`, and the first of the two recipes here that are not a synth patch
   * pretending to be one — the `stab` below is its twin, and everything this note establishes
   * applies to it unchanged. p.104 is unambiguous: "Each track in Tracker Mini can handle one voice which can
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
    sourceAudio: {
      need: 'Chord sample(s) — yours, or rendered to audio here; one per chord shape the hook plays',
      prep: {
        text:
          'Manual p.104, Rendering Tracks To Audio Chords: place the notes of one chord on ' +
          'separate tracks, Shift + D-Pad to select that range, [More] -> [Render Selection], ' +
          'name it, then [Render & Load]. Replace the instrument on one track with the rendered ' +
          'chord and free the others. One sample covers every chord of the same shape: p.128, ' +
          'the step note sets the playback pitch, so placing a higher note transposes the whole ' +
          'chord. Repeat only where the shape changes — the Hook phase lists which samples this ' +
          'part needs and what to transpose each trigger by.',
        verified: cite(104),
      },
    },
    params: [
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
  /**
   * The stab, and the second recipe on this box that exists only because §12.4 split the note
   * count from the way the notes are made.
   *
   * Everything the pad's note above says applies unchanged — p.104 for why a triad costs three
   * tracks and for the render procedure that turns it into one, p.128 for the step note setting
   * playback pitch so one recording covers the shape at every root. What differs is only the
   * envelope and the play mode: a stab is struck and gone, so `1-Shot` rather than `Forward
   * loop`, and the attack is at the floor rather than a second and a half.
   *
   * **Until this landed, `stab` was an honest gap on a Tracker-only rig and `pad` was not**,
   * which was a difference between the two roles that nothing about the box justified. Both are
   * three simultaneous notes on a machine whose every track sounds one (p.104); both are
   * reachable the same way. The pad had a recipe because somebody wrote one, and that is not a
   * reason. `test/polyphony.test.ts` recorded the gap and now records the assignment.
   *
   * It stays a substitute and says so. The chord transposes, so it follows the progression; it
   * cannot re-voice or invert, so every occurrence is the shape that was recorded.
   */
  /**
   * §12.4/#40. **The played stab, and the twin that makes the choice a choice.**
   *
   * `tm-stab-hard-chord` immediately below is the same part on the same voice and asks a
   * different thing of it: one note, with the chord already inside the sample. This one asks for
   * the chord to be *played* — which on a box whose every track sounds one note (p.103) means
   * three tracks with one note each, the method that page prescribes and the one the resolver
   * now builds. So the pair is the sampled and the stacked realisation of one hard stab, and
   * §7.1 chooses between them on stated grounds instead of on which one happens to exist.
   *
   * **It is a sample recipe and not a synth one, and that is the load-bearing part.** A stack of
   * three needs three voices, and three voices running a synth patch would look like three of
   * the project's three synth slots (p.32, p.146) — which would make a stacked stab and a
   * stacked pad mutually exclusive on this box. Two things settle it, and only the first is
   * about this recipe. The manual's own chord figure on p.103 puts `C5 02`, `E5 02` and `G5 02`
   * on Tracks 1, 2 and 3 — *the same instrument number on all three* — so a stack is one
   * instrument played from several tracks and costs one slot however wide it is. And this recipe
   * costs none at all, because a sample instrument is not a synth. The stack does not need an
   * engine; it needs something that plays a note.
   *
   * **What it needs is a sample of one note, and that is a weaker requirement than the chord
   * sample's, not a stronger one.** p.128: the step's note sets the playback pitch. So one
   * single-pitch tonal sample, placed on three tracks at three notes, sounds the actual chord —
   * every quality, every inversion, every voicing the hook writes, with nothing recorded per
   * shape. The chord sample can only transpose what was recorded. That is the whole of why
   * §7.1 prefers the stack, and it is visible here as one field: `sourceAudio.need` asks for a
   * note where its twin asks for a chord per shape.
   *
   * `PLAY MODE` is `1-Shot` and the envelope is the stab — attack at the floor, no sustain — for
   * the reason its twin gives: a stab is struck and gone. `TUNE` stays at 0 because the pitch is
   * the step's business here, and moving the sample under it would put the three tracks' notes
   * somewhere other than where the Hook phase says they are.
   */
  {
    id: 'tm-stab-hard-note',
    role: 'stab',
    character: 'hard',
    voice: 'track-sample',
    title: 'Single-note sample struck short, one note per track',
    sourceAudio: {
      need:
        'A single-note tonal sample — one pitch, with a front edge. Yours, or one note rendered ' +
        'here; it does not need to be a chord and should not be one',
      prep: {
        text:
          'One sample covers the whole chord: manual p.128, the step note sets the playback ' +
          'pitch, so the same instrument placed on three tracks at three notes sounds three ' +
          'notes. Load it on each track of the stack and put the notes the Hook phase lists ' +
          'against each one. Nothing has to be re-recorded when the chord changes quality, ' +
          'which is the difference between this and a rendered chord.',
        verified: cite(128),
      },
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('CUTOFF', 66, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -22 }] }),
      num('RESONANCE', 30, PCT, 117, { unit: '%', mood: [{ axis: 'grit', amount: 16 }] }),
      num('TUNE', 0, SEMITONES_24, 116, { unit: 'St' }),
      secs('ENV ATTACK', 0, SECONDS_10, 126),
      secs('ENV DECAY', 0.3, SECONDS_10, 126, { mood: [{ axis: 'density', amount: -0.1 }] }),
      num('ENV SUSTAIN', 0, PCT, 126, { unit: '%' }),
      secs('ENV RELEASE', 0.2, SECONDS_10, 126),
      num('OVERDRIVE', 16, PCT, 120, { unit: '%', mood: [{ axis: 'grit', amount: 20 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { volume: 118 } }],
    routing:
      'Tracks 1-8 — costs no synth slot, and one loaded sample serves every track of the stack',
    verified: false,
  },
  {
    id: 'tm-stab-hard-chord',
    role: 'stab',
    character: 'hard',
    voice: 'track-sample',
    title: 'Rendered chord sample, struck short and filtered hard',
    realisation: 'sampled-chord',
    sourceAudio: {
      need: 'Chord sample(s) — yours, or rendered to audio here; one per chord shape the hook plays',
      prep: {
        text:
          'Manual p.104, Rendering Tracks To Audio Chords: place the notes of one chord on ' +
          'separate tracks, Shift + D-Pad to select that range, [More] -> [Render Selection], ' +
          'name it, then [Render & Load]. Replace the instrument on one track with the rendered ' +
          'chord and free the others. One sample covers every chord of the same shape: p.128, ' +
          'the step note sets the playback pitch, so placing a higher note transposes the whole ' +
          'chord. Transposition keeps the recorded voicing — it cannot invert or re-voice the ' +
          'chord, so a changed shape is a second sample. The Hook phase lists which samples this ' +
          'part needs and the semitone offset to place on each trigger.',
        verified: cite(104),
      },
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 127),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('CUTOFF', 68, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -22 }] }),
      num('RESONANCE', 34, PCT, 117, { unit: '%', mood: [{ axis: 'grit', amount: 18 }] }),
      num('TUNE', 0, SEMITONES_24, 116, { unit: 'St' }),
      secs('ENV ATTACK', 0, SECONDS_10, 126),
      secs('ENV DECAY', 0.32, SECONDS_10, 126, { mood: [{ axis: 'density', amount: -0.12 }] }),
      num('ENV SUSTAIN', 0, PCT, 126, { unit: '%' }),
      secs('ENV RELEASE', 0.24, SECONDS_10, 126),
      num('OVERDRIVE', 18, PCT, 120, { unit: '%', mood: [{ axis: 'grit', amount: 20 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { volume: 118 } }],
    routing: 'Tracks 1-8 — costs no synth slot: the chord is in the sample, not in an engine',
    verified: false,
  },
  {
    id: 'tm-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track-sample',
    title: 'Granular bed, slow grains, filtered back',
    sourceAudio: {
      need:
        'A sustained tonal source, two seconds or longer — a held synth note, a field recording, ' +
        'a feedback loop. Pitch matters; transients do not, because Granular re-reads the file ' +
        'rather than playing it through',
    },
    params: [
      // §6.11's four core parameters, in the order the Sample Playback page lays them out
      // (p.141): Position, Length, Shape, Loop. Three of them were unauthored until #102, and
      // the manual is explicit about which of the four matters — *"The position parameter is
      // what brings out the its sonic character"* (p.142, sic).
      pick('PLAY MODE', 'Granular', PLAY_MODES, 127),
      unscaled('POSITION', 'A third into the sample', {
        hint: 'scan-grain',
        note: 'Set by proportion — the scale is the length of your sample, not a fixed time',
      }),
      num('LENGTH', 640, { min: 1, max: 1000 }, 142, { unit: 'ms' }),
      // Triangle over Square or Gauss because Shape is the grain's envelope and is *"recognised
      // in the attack phase"* (p.142): Square restates the grain edge on every re-read, which is
      // the click this bed is trying not to have, and Gauss softens the attack further than a
      // bed with a 1.8 Sec fade-in needs. Taste, like every point here.
      pick('SHAPE', 'Triangle', GRAIN_SHAPES, 142),
      pick('LOOP', 'Forward', GRAIN_LOOPS, 142),
      pick('FILTER TYPE', 'Low-pass', FILTER_TYPES, 117),
      num('CUTOFF', 48, PCT, 117, { unit: '%', mood: [{ axis: 'darkness', amount: -20 }] }),
      num('REVERB SEND', 42, PCT, 120, { unit: '%', mood: [{ axis: 'space', amount: 30 }] }),
      // **The grains have to move, or the title is a lie.** p.142: *"Modulating grain position
      // is at the heart of the Tracker Mini's implementation of granular synthesis"*, and p.143
      // says where it is done — Instrument Parameters page 2, the Granular Position row, an LFO
      // or an envelope on it. Without these four lines the guide asked for Granular play mode
      // and then left the play head parked, which is what #102 was filed about.
      //
      // An LFO rather than an envelope because a bed sustains: an envelope is *"more of a
      // one-shot function"* that *"typically operates across a note length"* (p.125), so it
      // sweeps once per trigger and then holds, while the LFO is semi-free running on this
      // destination and keeps moving between notes (p.121).
      pick('POSITION AUTOMATION TYPE', 'LFO', AUTOMATION_TYPES, 121, {
        hint: 'inst-params',
        note: 'On the Granular Position row of Instrument Automation 2/2',
      }),
      pick('POSITION LFO SHAPE', 'Triangle', LFO_SHAPES, 121),
      // 16 steps: p.124's own worked example is this destination's neighbour — *"With the
      // destination of cutoff, speed of 16 (and with 16 step pattern), the LFO cycle will span
      // all the steps... will create a long drone pulse to the sound"*. One sweep per pattern
      // is what a bed wants; the point is still taste, and the page is cited on the option set.
      pick('POSITION LFO SPEED', '16', LFO_SPEEDS, 123, {
        note: 'In pattern steps — the screen prints it as 16 steps: one sweep per 16-step pattern',
      }),
      // p.143 on where this sits: *"Small amounts will be more predictable textures and pad like
      // sounds. Larger amount settings will move the position wider in the sample creating more
      // glitchy, less predictable sounds."* 28 is at the quiet end of that, deliberately.
      unscaled('POSITION LFO AMOUNT', '28%', {
        note: 'Small amounts stay pad-like; larger ones sweep wider and glitchier',
      }),
      // **A fade-in this long is a claim about how often the part may be struck**, and the note
      // is where that claim gets said out loud. 1.8 Sec is most of two bars at the tempi a bed
      // like this sits at, so a part re-striking faster than the fade-in never reaches full
      // level: each strike swells into the one before it and the re-articulation stops being
      // audible as one. That is not a defect in either layer — a long attack is what makes this
      // a bed, and a step map that re-strikes is what makes it a part rather than a held chord —
      // so the recipe states the interaction and leaves the trade to the reader standing at the
      // box, who is the only one holding both halves.
      //
      // Said generically, and it has to be: the number of strikes in a bar is a property of the
      // direction (§4.3), which this folder cannot name (invariant 3) and cannot see. What it
      // can state is its own envelope's consequence, in terms of any part at all.
      secs('ENV ATTACK', 1.8, SECONDS_10, 126, {
        note:
          'Re-strikes closer together than 1.8 Sec smear into the note before rather than ' +
          'articulating — shorten it if the part strikes faster',
      }),
      // The other half of #102: a part that gets retriggered needs a level to hold at and a tail
      // to leave on. Without them the reader sets a 1.8 Sec fade-in and nothing about what
      // happens after. Same pair, same page, as the soft pad above.
      num('ENV SUSTAIN', 84, PCT, 126, { unit: '%' }),
      secs('ENV RELEASE', 2.2, SECONDS_10, 126),
      swing(),
    ],
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
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],

    /**
     * §7.4/#80. **`preferredSource: true`, and the evidence is a role sentence rather than a
     * jack.** Everything above this line is capability: the box has a MIDI Out, and clock can be
     * routed out of it. §7.4 asks a different question — is driving a rig this box's *job* — and
     * p.283, the MIDI chapter's opening, answers it: *"Audio, controlled by Tracker Mini from
     * external devices, can also be sampled back into Tracker Mini, making it a perfect fit for
     * the centre piece of a setup."* The same paragraph states the topology rule this field
     * exists to let a manifest answer: *"The clock in a multi gear setup will control timing
     * between devices. As such, it is recommended that only one main clock is set as the primary
     * lead."*
     *
     * p.287 is what makes it a documented default rather than one sentence: §11.3 "Typical MIDI
     * Configurations" opens with *"Example configuration 1: Tracker Mini as the primary lead"*,
     * drawn with *"Transport control e.g. Play, Stop and Clock is dictated by Tracker Mini and
     * its current Tempo"* and the downstream gear following. Configuration 3 has it following
     * instead, which is why the claim is "this box can lead" and never "this box leads over that
     * one" — the manual documents both and prints the leading case first.
     *
     * **Two pages that look like this evidence and are not**, both checked and both rejected:
     * p.11 calls it an *"ideal portable 'all in one' workstation"*, which the rest of the
     * sentence scopes to *"a small form factor and rechargeable battery"* — self-contained, which
     * is nearly the opposite claim; and p.295 is the keypress procedure `CREATING A MIDI CC
     * OUTPUT STEP`, capability to its bones. Neither would have been evidence for this field.
     *
     * The citation is on `clock.preferredSource` in `capabilityEvidence` (§2.6) rather than in
     * this comment, which is the whole point of #22 — and it is p.283, not the p.54 `Clock Out`
     * menu below. That menu is how the clock gets out; it is not why this box should be the one
     * sending it.
     */
    preferredSource: true,

    /**
     * §7.4/#104. **Clock output on this box is a menu, and the guide never said so.**
     *
     * p.54's Config table, `MIDI` menu, `Clock Out`: *"Sets the Tracker Mini clock output. Off,
     * USB, MIDI Out jack, USB + MIDI Out jack."* Four routings, and a clock leaves only by the
     * one selected. The rig phase named this box as the clock source and told the reader to sync
     * everything else to it, which is an instruction nothing in the rig can obey until this is
     * set — and every phase after it assumes the transport is running.
     *
     * Two entries because the menu takes two different values for the two transports this box
     * declares, and printing `USB` at a reader patching a MIDI cable is worse than printing
     * nothing. The strings are the menu's, spelled as p.54 spells them — `MIDI Out jack`, not
     * "the MIDI jack" — because §8 is read at the machine and that is what is on the screen.
     *
     * The matching `Clock In` row on the same page is not authored here: the guide tells a
     * *receiver* to sync, and what that costs on each receiving box is a separate piece of work
     * from making the source emit. `sourceSetup` is named for the half it covers.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Config > MIDI > Clock Out',
        value: 'MIDI Out jack',
        note: 'Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here',
      },
      {
        transport: 'usb',
        path: 'Config > MIDI > Clock Out',
        value: 'USB',
        note: 'Off, USB, MIDI Out jack, USB + MIDI Out jack — clock leaves only by the routing set here',
      },
    ],
  },

  // One stereo Line Out on a 3.5mm jack, doubling as headphone out; stereo Line In; USB-C audio
  // in/out, enabled in Config -> USB -> Audio (p.13, p.54). No individual outs.
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10/#103. **This box has no clock jacks, and the rack was drawing two.**
   *
   * p.13's hardware overview dimensions the bottom edge and names every hole on it: `Line In`,
   * `Line Out`, `MIDI In`, `MIDI Out`. Four 3.5mm sockets, and not one of them says `CLK`. The
   * rack derived `CLK OUT` / `CLK IN` from `canSendClock` / `canReceiveClock` and drew them here
   * anyway, on the same page that describes its panels as "read off each manual's hardware
   * overview" — so the reader was told to patch a socket the box does not have, on a diagram
   * claiming to be the box.
   *
   * Clock leaves and arrives over MIDI, so the MIDI pair is what carries `midi-din` and what the
   * rack now labels. Both are cited to the drawing that names them.
   *
   * `usb` is not declared, and the omission is the honest one: p.13 calls the USB-C socket the
   * `USB Power charge input`, MIDI and audio over it are a Config setting rather than a second
   * pair of holes (p.54), and one socket carrying both directions is a shape `JackSpec.direction`
   * cannot state. A rig that resolved onto USB draws its sockets unlabelled.
   *
   * `Line In` and `Line Out` are on the panel and are not declared here, because nothing names
   * them: `io` already carries the audio path, and §3.3's list is for jacks something references.
   */
  jacks: [
    {
      id: 'MIDI Out',
      direction: 'out',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      // The Type B detail, on the jack it is about. p.13's callout: "3.5mm jack to 5 Pin MIDI.
      // Adapter (Type B) supplied", restated at p.284: "Tracker Mini uses a TRS to Type B MIDI
      // Adapter." Type B is the uncommon one, and a reader reaching for a Type A cable gets
      // silence with nothing on screen to explain it.
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284)',
    },
    {
      id: 'MIDI In',
      direction: 'in',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.284)',
    },
  ],

  /**
   * §2.6/#22. The pages behind the two rendered capability facts on this box.
   *
   * Both used to be fields — `JackSpec.verified` and `ClockSourceSetup.verified` — and both are
   * things a reader acts on at the machine, so both keep a required entry here. Written out
   * rather than generated by a helper because there are four of them and the ids are the panel's
   * own words; the Cascadia's eighty-two are the case that earns a helper.
   */
  /**
   * §2.6/#111. **This box ships a library nobody has listed — and #111 says it does
   * not, which is the correction this field exists to make possible.**
   *
   * p.34, the "Default microSD card structure" diagram: `/Samples` contains `/FactoryPacks`,
   * annotated "Tracker Mini comes with 50 factory genre-based packs installed onto the microSD
   * card." Fifty packs a reader can open on the card is a library, not an absence.
   *
   * #111 names this box as the library's one genuinely user-supplied device, from a reading of
   * this same manual: every `.wav` it names is an export filename, and "Sample packs located in
   * sub-folders" is about organising your own content. That second sentence is *on this page*,
   * one line above the annotation, and a text extraction returns it without the annotation — the
   * fact lives inside a drawing, which is exactly what CLAUDE.md says `pdftotext` loses and
   * exactly why a grep over the dump is not evidence a manual is silent. This page was rendered.
   *
   * Named as a reader finds it: the folder and the count. No document prints the pack contents,
   * which is a limit on the manual and not a reason to report the box as unestablished — and it
   * is why this is `shipped-library` and not `enumerable`. Fifty packs whose names appear nowhere
   * cannot be referenced by a recipe, so the fifteen here still say what they need in prose.
   */
  content: {
    kind: 'shipped-library',
    library: '50 factory genre-based sample packs',
    location: '/Samples/FactoryPacks on the microSD card',
    reason: 'p.34 names the folder and the count, and no page lists what is in a pack',
  },

  /**
   * §2.6/#142. **There is no note-length field on this box, and #142 found the guide printing
   * one.**
   *
   * A step event has four components — note, instrument, volume and two FX slots (p.100, and the
   * pattern rows on p.104 show them: `C5 02 ---- P 25`). None of them is a length. What ends a
   * note is the next note on the same track, because *"each track in Tracker Mini can handle one
   * voice which can play multiple notes, but not simultaneously"* (p.104) — the same monophony
   * #40's stacked rendering already relies on — or one of the three special note commands, which
   * p.105 introduces as *"not used for applying a note sound, but ... used for controlling how a
   * note ends"*.
   *
   * **`OFF` of the three, and it is worth saying why**, because `CUT` and `FAD` sit beside it on
   * the same page and would each be a different instruction. `OFF` *"will act as 'Note-Off' and
   * trigger the release phase of the envelope"* — it ends the note and lets the sound do what it
   * was designed to do, which is what a hook means by a note stopping. `CUT` *"will immediately
   * stop the audio sound"* and `FAD` fades it: both are edits to the sound rather than the end of
   * a note, and printing either would be this manifest choosing an effect on the reader's behalf.
   *
   * The citation is p.105, the page that names the command and says what it is for. p.100 and
   * p.104 are in this comment rather than in a second entry because §2.6 keys evidence by field
   * and this field has one page that answers it; the other two establish the absence it rests on.
   */
  noteDuration: { kind: 'until-next', noteOff: 'OFF' },

  capabilityEvidence: {
    content: cite(34),
    noteDuration: cite(105),

    [jackFact('MIDI Out')]: cite(13),
    [jackFact('MIDI In')]: cite(13),
    [clockSourceSetupFact('midi-din')]: cite(54),
    [clockSourceSetupFact('usb')]: cite(54),

    /**
     * §7.4/#80. The role sentence, not the jack and not the menu — see the `clock` comment for
     * why p.11 and p.295 were both read and both rejected.
     */
    'clock.preferredSource': cite(283),
  },

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
    /**
     * §12.4: **no `sampled-chord` recipe addresses this pool, and it is not an oversight.** The
     * substitution needs a sample, and p.22 is explicit about which tracks can hold one: *"The
     * first 8 can operate with sample instruments, synths and MIDI and tracks 9-16 are used for
     * MIDI and synths."* A rendered chord is an instrument you load, so it can only go on
     * `track-sample`. That is why the chord pad and the chord stab both name that pool and this
     * one carries neither.
     */
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
   * Gate Length p.187, Chance p.188, Roll p.189, Random Volume p.195, Reverse Sample p.196.
   *
   * **Low Pass Filter (p.205) is deliberately absent, and the box does it.** `perStep` is a
   * validation table rather than a capability claim — nothing renders it, and it is only ever
   * compared against this device's own articulation keys — so a name here that no recipe reaches
   * for validates nothing. `tm-texture-soft` was its one user, on a `first-hit` slot #108 found
   * dead, and the honest fix was to drop the gesture rather than move it onto a strike it was
   * not written for. Authoring it on a reachable slot would bring the name back; keeping the
   * name against nothing would only make the table look more complete than the recipes are.
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
    ],
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'pick-fx': 'Hold [FX1], press (Up)/(Down)',
    'inst-params': 'Screen button 4 cycles instrument pages',
    'pick-synth': 'Hold [Instrument], press (Up)/(Down)',
    'synth-params': 'Press [2] for synth parameters',
    'edit-patch': 'Press [Edit Patch] screen button',
    // p.142's Aid row: "Hold to play the grain from the current position selected. Also hold
    // while adjusting position to 'scan' for the desired sound."
    'scan-grain': 'Hold [Preview] while turning Position',
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
