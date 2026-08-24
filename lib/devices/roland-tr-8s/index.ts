import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, ParamScope } from '../../core/params'
import { TR_8S_PANEL } from './panel'

/**
 * Roland TR-8S (§2.3). Eleven instruments, a sequencer, and — the thing that separates it from
 * every other drum machine in this library — **a sampler behind each of those eleven slots**.
 *
 * ## Two manuals, and the split is the usual Roland one
 *
 * `manuals/README.md` records the trap and this box walks straight into it: the Owner's Manual
 * names the controls and states the dimensions, and the **Reference Manual carries every
 * parameter range**. Everything cited below is `TR-8S Reference Manual eng01` except the panel
 * span, which the Reference Manual cannot answer because it has no specifications section at
 * all — it ends at the UTILITY tables on p.44.
 *
 * There is a third document the TR-1000 has and this box does not, and its absence is a real
 * gap rather than an oversight: **no preset tone list ships with the TR-8S documentation.**
 * The TR-1000 authors a cited `GEN` enum off its Preset GEN/INST List; here there is nothing to
 * cite, so no recipe names a tone. What each recipe carries instead is a `TONE` text param
 * saying which *category* the slot must be holding for the rest of its parameters to exist —
 * see below, because on this box that is not decoration.
 *
 * ## The parameter table is gated on the loaded tone, and the recipes have to say so
 *
 * The INST table (p.30) is in four blocks, and only the first applies unconditionally:
 *
 *  - **Common to all tones** — Tune, Decay, Level, Gain, Pan, ReverbSend, DelaySend, LFO, LFO
 *    Depth.
 *  - *"Only for ACB tones of the BD category"* — `Attack`.
 *  - *"Only for ACB tones of the SD category"* — `Snappy`.
 *  - *"Only for ACB tones of the TOM category"* — `Color`.
 *  - *"Sample tone only"* (p.31) — Coarse Tune, Rate, Spread, Bit Reduce, Attack, Hold
 *    Mode/Time/Step and a whole filter with its own envelope.
 *
 * So a recipe that sets `Snappy` is not merely suggesting a value; it is asserting that the SD
 * slot is holding an ACB tone of the SD category, and on a box where any slot will take any tone
 * that assertion can be false. Every recipe here that reaches past the common block states the
 * requirement in its `TONE` param, and the ones that do not reach past it work on anything.
 *
 * `Color` earns a second note. The manual gives it **four different meanings by tone family** on
 * one page (p.31): ambience on `808Low/Mid/HighTom`, resonance on `909Low/Mid/HighTom`, pitch
 * movement on `707Low/Mid/HighTom`, ambience again on `606Low/Mid/HighTom`. A guide that said
 * "COLOR 40" without saying which family is loaded would be four different instructions wearing
 * one number, so the tom recipes name the family.
 *
 * ## Why eleven fixed voices and not a pool of eleven
 *
 * The panel prints BASS DRUM, SNARE DRUM, LOW TOM, MID TOM, HIGH TOM, RIM SHOT, HAND CLAP,
 * CLOSED HIHAT, OPEN HIHAT, CRASH CYMBAL, RIDE CYMBAL over eleven identical channel strips
 * (p.4), and the tone in each is freely chosen. The literal reading of "freely chosen" is one
 * pool of eleven fungible slots — and it is wrong twice. It throws away the category gating
 * above, which is per-slot in practice because the slot is what holds the tone; and it throws
 * away the labels, which is what a reader is looking at while they work. Fixed voices, and the
 * roles below say which duties each slot is modelled as taking.
 *
 * **The sample-borne roles are a modelling choice and not a hardware limit.** `riser` sits on CC
 * and `texture` on RC because a part built from a sample has to go *somewhere* and those two
 * slots are the ones a kit can most often spare — not because the box refuses a sample on BD.
 * It does not: the "Sample tone only" block is gated on the tone, never on the instrument. The
 * cost of the choice is that a rig wanting two sampled parts on a TR-8S gets an honest gap, and
 * the alternative — every slot advertising every sampled role — would have eleven slots
 * claiming duties that only two of them have recipes for.
 *
 * ## What is not modelled
 *
 * The MASTER FX block (17 types, p.23), the kit reverb and delay (pp.22-23), the LFO's 24
 * destinations (p.30) and the whole INST FX parameter set beyond the one control each recipe
 * reaches for are all cited-able and all absent, for the reason §3 gives: a recipe is a small
 * number of settings that get one part sounding right, not a dump of the box's parameter space.
 * `Scatter` (p.17), motion recording (p.16), instrument grouping (p.22) and the trigger-out
 * track (p.19) are performance features rather than per-part settings.
 *
 * No recipe carries step hits. Patterns are template-owned (§4.3); what the device contributes
 * is `articulation`, addressed by `PatternSlot`.
 */

// ---------------------------------------------------------------------------
// Citations and shared ranges
// ---------------------------------------------------------------------------

function cite(page: number): Cite {
  return { kind: 'manual', source: `TR-8S Reference Manual eng01, p.${page}` }
}

/** `-128–0–+127`, the box's standard bipolar control (Tune, Color, LFO Depth) — p.30, p.31. */
const BIPOLAR = { min: -128, max: 127 }
/** `0–255`, the box's standard unipolar control. Nearly everything on pp.30-33. */
const UNIT = { min: 0, max: 255 }
/** `-24–0–+24` semitones, sample Coarse Tune — p.31. */
const COARSE = { min: -24, max: 24 }

/**
 * The INST FX type list, verbatim and in the manual's order (p.31). Cited once here rather than
 * restated per recipe: thirteen options on one page, and every recipe that picks one is picking
 * from this set.
 */
const INST_FX_TYPES = [
  'THRU',
  'HPF',
  'LPF',
  'LPF/HPF',
  'H BOOST',
  'L BOOST',
  'L/H BOOST',
  'ISOLATOR',
  'TRANSIENT',
  'COMPRESSOR',
  'DRIVE',
  'COMP+DRV',
  'CRUSHER',
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
  step?: number
  unit?: string
  hint?: string
  note?: string
  scope?: ParamScope
}

/**
 * A numeric whose **range** is cited and whose **point is not** (§3.2). That split is the whole
 * discipline here: the manual states what the box will accept, and where to put the value inside
 * it is taste, so `verified: false` sits on every point in this file.
 */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: NumExtra = {},
): AuthoredParam {
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
 * The reverb and delay sends, which every instrument has (p.30). `space` is carried here and
 * nowhere else on this device, which is §6's intent — the axis is depth, and depth on a drum
 * machine is how much of each part goes to the two kit effects.
 *
 * Kick and sub deliberately take no `space` offset, the same call the TR-1000 makes: a low part
 * pushed into a reverb is the one place the axis reliably makes a rig worse.
 */
function sends(reverb: number, delay: number, space?: number): AuthoredParam[] {
  const offset = space === undefined ? {} : { mood: [{ axis: 'space' as const, amount: space }] }
  return [
    num('REVERB SEND', reverb, UNIT, 30, { ...offset, hint: 'reverb-send' }),
    num('DELAY SEND', delay, UNIT, 30, { ...offset, hint: 'delay-send' }),
  ]
}

/**
 * `SHUFFLE`, and §6's argument for swing being an ordinary parameter offset lands squarely on
 * this control: *"a SHUFFLE knob is a parameter whose value means timing"*. The pattern's own
 * Shuffle is `-128–0–+127` (p.17); the panel knob is the same control at system scope, and which
 * of the two is live is a UTILITY setting (`GENERAL: Shuffle = PTN | SYSTEM`, p.17).
 *
 * Pattern-wide, not per-instrument, so it is the same value on every recipe — carried per recipe
 * because a rendered part has to say what the box should be set to, not because eleven parts
 * disagree.
 */
function shuffle(): AuthoredParam {
  return num('SHUFFLE', 0, BIPOLAR, 17, {
    mood: [{ axis: 'swing', amount: 127 }],
    hint: 'ptn-shuffle',
    note: 'Pattern-wide: one setting for the whole pattern, not per instrument',
    scope: 'pattern',
  })
}

/** The category and engine a recipe needs in the slot. Nothing to cite — no tone list ships. */
function tone(value: string, note?: string): AuthoredParam {
  return { kind: 'text', name: 'TONE', value, verified: false, ...(note === undefined ? {} : { note }) }
}

/** INST FX type, whose option set is cited and whose selection is taste (§3.2). */
function instFx(value: (typeof INST_FX_TYPES)[number]): AuthoredParam {
  return {
    kind: 'enum',
    name: 'INST FX TYPE',
    value,
    options: { values: [...INST_FX_TYPES], verified: cite(31) },
    verified: false,
    hint: 'inst-edit',
  }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  // ---- BD ----------------------------------------------------------------
  {
    id: 'tr8s-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'Short, front-loaded kick',
    params: [
      tone('BD category, ACB', 'ATTACK below exists only for ACB tones of the BD category (p.30)'),
      num('TUNE', 4, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }], hint: 'inst-edit' }),
      num('DECAY', 92, UNIT, 30, { mood: [{ axis: 'density', amount: -40 }] }),
      num('ATTACK', 178, UNIT, 30, { note: 'Attack strength of the bass drum' }),
      instFx('TRANSIENT'),
      num('TRANSIENT ATTACK', 48, BIPOLAR, 32, { mood: [{ axis: 'grit', amount: 60 }] }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'bd',
    title: 'Long, tuned-down kick',
    params: [
      tone('BD category, ACB'),
      num('TUNE', -30, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 176, UNIT, 30, { mood: [{ axis: 'density', amount: -70 }] }),
      num('ATTACK', 64, UNIT, 30),
      instFx('LPF'),
      num('LPF CUTOFF', 150, UNIT, 31, {
        mood: [{ axis: 'darkness', amount: 90 }],
        note: 'On this filter a *higher* Cutoff lowers the frequency, deepening the LPF (p.31)',
      }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { velocity: 120 }, hint: 'step-dynamics' }],
    verified: false,
  },
  {
    id: 'tr8s-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'bd',
    title: 'Driven kick with a broken top end',
    params: [
      tone('BD category, ACB'),
      num('TUNE', 0, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -50 }] }),
      num('DECAY', 110, UNIT, 30, { mood: [{ axis: 'density', amount: -45 }] }),
      num('ATTACK', 200, UNIT, 30),
      instFx('DRIVE'),
      num('DRIVE BALANCE', 190, { min: 1, max: 255 }, 32, {
        note: 'The range also carries OFF, which is not a number and so is not modelled here',
      }),
      num('DRIVE', 96, UNIT, 32, { mood: [{ axis: 'grit', amount: 120 }] }),
      num('DRIVE LEVEL', 110, UNIT, 32, { note: 'Drive raises output; trim it back here (p.32)' }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'bd',
    title: 'Kick tuned into a sub tail',
    params: [
      tone('BD category, ACB'),
      num('TUNE', -96, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -30 }], hint: 'inst-edit' }),
      num('DECAY', 232, UNIT, 30, { mood: [{ axis: 'density', amount: -90 }] }),
      num('ATTACK', 0, UNIT, 30, { note: 'No click — the transient belongs to whatever plays the kick' }),
      instFx('LPF'),
      num('LPF CUTOFF', 190, UNIT, 31, { mood: [{ axis: 'darkness', amount: 60 }] }),
      ...sends(0, 0),
      shuffle(),
    ],
    routing: 'KIT Edit > OUTPUT, BD to ASSIGN 1 — keeps the sub out of the kit effects',
    verified: false,
  },

  // ---- SD ----------------------------------------------------------------
  {
    id: 'tr8s-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'sd',
    title: 'Tight snare, wires up',
    params: [
      tone('SD category, ACB', 'SNAPPY below exists only for ACB tones of the SD category (p.30)'),
      num('TUNE', 12, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -70 }], hint: 'inst-edit' }),
      num('DECAY', 84, UNIT, 30, { mood: [{ axis: 'density', amount: -40 }] }),
      num('SNAPPY', 190, UNIT, 30, { note: 'Volume of the snare wires' }),
      instFx('TRANSIENT'),
      num('TRANSIENT ATTACK', 40, BIPOLAR, 32, { mood: [{ axis: 'grit', amount: 60 }] }),
      ...sends(30, 12, 90),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'sd',
    title: 'Open snare with air on the tail',
    params: [
      tone('SD category, ACB'),
      num('TUNE', 34, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -90 }], hint: 'inst-edit' }),
      num('DECAY', 132, UNIT, 30, { mood: [{ axis: 'density', amount: -55 }] }),
      num('SNAPPY', 224, UNIT, 30),
      instFx('H BOOST'),
      num('H BOOST', 120, UNIT, 32, { mood: [{ axis: 'grit', amount: 60 }] }),
      num('H BOOST FREQ', 168, UNIT, 32),
      ...sends(64, 28, 120),
      shuffle(),
    ],
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
      { slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' },
    ],
    verified: false,
  },
  {
    id: 'tr8s-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'sd',
    title: 'Crushed snare, sampling rate pulled down',
    params: [
      tone('SD category, ACB'),
      num('TUNE', 8, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('DECAY', 100, UNIT, 30, { mood: [{ axis: 'density', amount: -40 }] }),
      num('SNAPPY', 160, UNIT, 30),
      instFx('CRUSHER'),
      num('CRUSHER BALANCE', 180, { min: 1, max: 255 }, 33),
      num('SAMPLE RATE', 96, UNIT, 33, {
        mood: [{ axis: 'grit', amount: 110 }],
        note: 'Higher lowers the sampling frequency — more lo-fi, not less (p.33)',
      }),
      num('CRUSHER FILTER', 190, UNIT, 33, { note: 'Lower it to take the harsh top off (p.33)' }),
      ...sends(24, 20, 70),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { velocity: 118 }, hint: 'step-dynamics' }],
    verified: false,
  },

  // ---- LT / MT / HT ------------------------------------------------------
  {
    id: 'tr8s-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'lt',
    title: 'Low tom with the room left on',
    params: [
      tone('TOM category, ACB — 808Low/Mid/HighTom', 'COLOR is ambience on the 808 toms (p.31)'),
      num('TUNE', -48, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -50 }], hint: 'inst-edit' }),
      num('DECAY', 168, UNIT, 30, { mood: [{ axis: 'density', amount: -70 }] }),
      num('COLOR', 72, BIPOLAR, 31, { note: 'On 808 toms this is the amount of noise/ambience' }),
      instFx('THRU'),
      ...sends(56, 24, 110),
      shuffle(),
    ],
    articulation: [{ slot: 'fill', set: { substep: '1/2' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr8s-tom-bright',
    role: 'tom',
    character: 'bright',
    voice: 'ht',
    title: 'High tom, resonant and pitched up',
    params: [
      tone('TOM category, ACB — 909Low/Mid/HighTom', 'COLOR is resonance on the 909 toms (p.31)'),
      num('TUNE', 56, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 104, UNIT, 30, { mood: [{ axis: 'density', amount: -45 }] }),
      num('COLOR', 40, BIPOLAR, 31, { note: 'On 909 toms this is the amount of resonance' }),
      instFx('THRU'),
      ...sends(40, 32, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr8s-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'mt',
    title: 'Mid tom dropped under the groove',
    params: [
      tone('TOM category, ACB — 606Low/Mid/HighTom', 'COLOR is ambience on the 606 toms (p.31)'),
      num('TUNE', 20, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('DECAY', 56, UNIT, 30, { mood: [{ axis: 'density', amount: -20 }] }),
      num('LEVEL', 120, UNIT, 30, { note: 'Sits under everything; the level slider is this value' }),
      instFx('THRU'),
      ...sends(48, 40, 90),
      shuffle(),
    ],
    articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
    verified: false,
  },

  // ---- RS ----------------------------------------------------------------
  {
    id: 'tr8s-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'rs',
    title: 'Dry rim shot on the offbeat',
    params: [
      tone('RS category'),
      num('TUNE', 16, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -50 }], hint: 'inst-edit' }),
      num('DECAY', 40, UNIT, 30, { mood: [{ axis: 'density', amount: -18 }] }),
      instFx('THRU'),
      ...sends(20, 48, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'first-hit', set: { flam: true }, hint: 'flam' }],
    verified: false,
  },
  {
    id: 'tr8s-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'rs',
    title: 'Rim shot bit-reduced into a tick',
    params: [
      tone('RS category'),
      num('TUNE', 64, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -70 }] }),
      num('DECAY', 32, UNIT, 30, { mood: [{ axis: 'density', amount: -14 }] }),
      instFx('CRUSHER'),
      num('CRUSHER BALANCE', 255, { min: 1, max: 255 }, 33),
      num('SAMPLE RATE', 140, UNIT, 33, { mood: [{ axis: 'grit', amount: 100 }] }),
      ...sends(16, 72, 110),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' }],
    verified: false,
  },

  // ---- HC ----------------------------------------------------------------
  {
    id: 'tr8s-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'hc',
    title: 'Hand clap with a short room',
    params: [
      tone('HC category'),
      num('TUNE', 24, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 112, UNIT, 30, { mood: [{ axis: 'density', amount: -50 }] }),
      instFx('H BOOST'),
      num('H BOOST', 96, UNIT, 32, { mood: [{ axis: 'grit', amount: 60 }] }),
      ...sends(88, 24, 130),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-clap-soft',
    role: 'clap',
    character: 'soft',
    voice: 'hc',
    title: 'Clap tucked behind the snare',
    params: [
      tone('HC category'),
      num('TUNE', -8, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('DECAY', 72, UNIT, 30, { mood: [{ axis: 'density', amount: -30 }] }),
      num('LEVEL', 132, UNIT, 30),
      instFx('LPF'),
      num('LPF CUTOFF', 120, UNIT, 31, { mood: [{ axis: 'darkness', amount: 80 }] }),
      ...sends(64, 20, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
    verified: false,
  },

  // ---- CH ----------------------------------------------------------------
  {
    id: 'tr8s-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'ch',
    title: 'Closed hat, straight sixteenths',
    params: [
      tone('CH category'),
      num('TUNE', 0, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }], hint: 'inst-edit' }),
      num('DECAY', 36, UNIT, 30, { mood: [{ axis: 'density', amount: -16 }] }),
      instFx('THRU'),
      ...sends(12, 16, 70),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { velocity: 96 }, hint: 'step-dynamics' }],
    verified: false,
  },
  {
    id: 'tr8s-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'ch',
    title: 'Hat pushed into the compressor',
    params: [
      tone('CH category'),
      num('TUNE', 40, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -80 }] }),
      num('DECAY', 44, UNIT, 30, { mood: [{ axis: 'density', amount: -20 }] }),
      instFx('COMP+DRV'),
      num('COMP+DRV BALANCE', 200, { min: 1, max: 255 }, 32),
      num('CMP BALANCE', 220, { min: 1, max: 255 }, 32),
      num('DRV BALANCE', 130, { min: 1, max: 255 }, 32, { mood: [{ axis: 'grit', amount: 120 }] }),
      ...sends(20, 24, 80),
      shuffle(),
    ],
    articulation: [
      { slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' },
      { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
    ],
    verified: false,
  },

  // ---- OH ----------------------------------------------------------------
  {
    id: 'tr8s-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'oh',
    title: 'Open hat choked by the closed one',
    params: [
      tone('OH category — the manual calls this sound OpenHH (p.27)'),
      num('TUNE', 28, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -90 }], hint: 'inst-edit' }),
      num('DECAY', 148, UNIT, 30, { mood: [{ axis: 'density', amount: -70 }] }),
      instFx('THRU'),
      ...sends(48, 40, 120),
      shuffle(),
    ],
    routing: 'KIT Edit > MUTE, OH = CH so CloseHH chokes the open hat (p.27)',
    articulation: [{ slot: 'offbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'oh',
    title: 'Open hat with the top rolled off',
    params: [
      tone('OH category'),
      num('TUNE', -24, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('DECAY', 176, UNIT, 30, { mood: [{ axis: 'density', amount: -80 }] }),
      instFx('LPF'),
      num('LPF CUTOFF', 132, UNIT, 31, { mood: [{ axis: 'darkness', amount: 100 }] }),
      ...sends(56, 48, 110),
      shuffle(),
    ],
    routing: 'KIT Edit > MUTE, OH = CH so CloseHH chokes the open hat (p.27)',
    verified: false,
  },

  // ---- CC ----------------------------------------------------------------
  {
    id: 'tr8s-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'cc',
    title: 'Crash on the downbeat of the section',
    params: [
      tone('CC category'),
      num('TUNE', 0, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -50 }], hint: 'inst-edit' }),
      num('DECAY', 220, UNIT, 30, { mood: [{ axis: 'density', amount: -90 }] }),
      instFx('THRU'),
      ...sends(120, 64, 130),
      shuffle(),
    ],
    articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr8s-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'cc',
    title: 'A sample played backwards into the change',
    params: [
      tone(
        'Sample',
        'Everything below the TUNE line is in the "Sample tone only" block (p.31) and does not exist on an ACB tone',
      ),
      num('TUNE', 0, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('COARSE TUNE', -5, COARSE, 31, { unit: 'St', note: 'Pitch in semitone steps' }),
      num('RATE', -0.7, { min: -1, max: 1 }, 31, {
        step: 0.01,
        note: 'Negative plays backward; -1.00 is full speed in reverse (p.31)',
      }),
      num('SPREAD', 32, { min: -50, max: 50 }, 31, { note: 'Skews pitch L/R for a stereo image' }),
      num('BIT REDUCE', 3, { min: 0, max: 12 }, 31, { mood: [{ axis: 'grit', amount: 9 }] }),
      instFx('THRU'),
      ...sends(150, 90, 105),
      shuffle(),
    ],
    articulation: [{ slot: 'last-hit', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },

  // ---- RC ----------------------------------------------------------------
  {
    id: 'tr8s-ride-clean',
    role: 'ride',
    character: 'clean',
    voice: 'rc',
    title: 'Ride keeping the eighths',
    params: [
      tone('RC category'),
      num('TUNE', 8, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }], hint: 'inst-edit' }),
      num('DECAY', 128, UNIT, 30, { mood: [{ axis: 'density', amount: -60 }] }),
      instFx('THRU'),
      ...sends(56, 32, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { velocity: 88 }, hint: 'step-dynamics' }],
    verified: false,
  },
  {
    id: 'tr8s-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'rc',
    title: 'A loop tone held open under the pattern',
    params: [
      tone(
        'Loop',
        'The INST screen icons name four tone kinds — Preset, Sample, Loop, User (p.30). A Loop tone plays repeatedly',
      ),
      num('TUNE', -16, BIPOLAR, 30, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('COARSE TUNE', -12, COARSE, 31, { unit: 'St' }),
      {
        kind: 'enum',
        name: 'HOLD MODE',
        value: 'Whole',
        options: { values: ['Whole', 'Time', 'Step'], verified: cite(31) },
        verified: false,
        note: 'Whole: the sound is heard to the end without decaying (p.31)',
      },
      num('LEVEL', 96, UNIT, 30, { note: 'A bed, not a part — it sits below everything else' }),
      instFx('LPF'),
      num('LPF CUTOFF', 140, UNIT, 31, { mood: [{ axis: 'darkness', amount: 90 }] }),
      ...sends(110, 72, 120),
      shuffle(),
    ],
    routing: 'KIT Edit > MUTE, RC = CH — a sustaining sample can be choked like OpenHH (p.27)',
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'roland-tr-8s',
  name: 'TR-8S',
  maker: 'Roland',
  kind: 'drum-machine',

  /**
   * Both directions, and both are stated rather than inferred. Receiving: *"The TR-8S can
   * receive MIDI Clock (F8) data to synchronize its tempo"* (p.45), with `TempoSync` choosing
   * `AUTO, MIDI, USB, INT` (p.42). Sending: `Sync Out OFF, ON` — *"whether clock, start, and
   * stop messages are transmitted to other devices"* (p.42).
   *
   * `trigger` is here for the TRIGGER OUT jack and for any of the six ASSIGNABLE OUT jacks
   * switched to `TRIGGER` mode (p.7, p.44): a pulse output driven by its own step track, which
   * is how this box clocks a modular. It is not MIDI clock and nothing in the manual calls it
   * clock — it is a programmable trigger that a reader uses as one.
   *
   * No DIN SYNC and no MIDI THRU socket: the rear panel is `MIDI (OUT, IN)` (p.6), and thru is a
   * software setting (`Soft Thru`, p.42).
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb', 'trigger'] },

  /**
   * `MIX OUT (L/MONO, R)` for the mix, `ASSIGNABLE OUT/TRIGGER OUT 1-6` for parts, `EXT IN
   * (L/MONO, R)` in, and USB carrying *"USB MIDI and USB audio data"* (p.6).
   *
   * **Six, and they are genuinely per-part.** `KIT: OUTPUT` (p.27) assigns each of the eleven
   * instruments to `MIX` or to `ASSIGN 1-6` — and the manual is explicit that an instrument sent
   * to an assignable out *"is not output from the MIX OUT jacks"*, which is what makes them
   * separations rather than aux sends. The same page also offers `ASSIGN A-C`, three *stereo*
   * pairs built from the same six jacks; the field counts jacks, so six is the honest number and
   * a reader taking three stereo pairs gets three parts out, not nine.
   */
  io: { main: 'stereo', individualOuts: 6, audioIn: true, usbAudio: true },

  /**
   * §10. 409 mm across, off the Main Specifications table: *"409 (W) x 263 (D) x 58 (H) mm"*.
   *
   * **Cited to the Owner's Manual because the Reference Manual has no specifications section** —
   * it ends at the UTILITY tables on p.44. This is the one value in this file that does not come
   * from the parameter manual, and `manuals/README.md` names that split as the trap it is.
   *
   * The TR-8S is a landscape desktop box played lying flat, so the vendor's W is the
   * playing-orientation horizontal span and the 263 mm it calls *depth* is the panel's vertical
   * span. The aspect check §2.3 asks for is in `panel.ts`, and it does not come out exactly —
   * see there, because the discrepancy is a fact about the figure rather than about the box.
   */
  physical: {
    panelSpanMm: 409,
    verified: { kind: 'manual', source: "TR-8S Owner's Manual eng03, p.24 (Main Specifications)" },
  },

  /** §10. A simplified original drawing of the top panel, read off the manual (see `panel.ts`). */
  panel: TR_8S_PANEL,

  /**
   * ## Why there is no `sampled-chord` pad or stab here (§12.4)
   *
   * This box loads user samples and can hold a chord in one, so the obvious move is the Tracker
   * Mini's: give RC a rendered chord and let one monophonic voice carry a three-note pad. It
   * does not work, and the half that fails is worth stating because the half that passes is so
   * convincing.
   *
   * **Sustain passes, outright.** p.30's INST screen legend lists `User: Tones that use imported
   * samples` and `Loop: Tones that play repeatedly`, and p.31's *Sample tone only* block gives
   * `Hold Mode  Whole, Time, Step` with `Whole: The sound is heard to the end without decaying`.
   * A chord loaded here will sustain under a bar.
   *
   * **Per-step transposition fails, and that is the half that decides it.** A chord sample
   * standing in for a pad has to *follow the progression* — our templates give a pad a harmonic
   * cycle, and a chord pinned to one pitch plays the same chord under every degree, which is a
   * drone that disagrees with the harmony rather than a pad. So the box has to be able to retune
   * the slot at individual steps, and this one cannot:
   *
   *  - p.16 says exactly which controls motion records into steps — *"movements of the instrument
   *    [TUNE] knobs, [DECAY] knobs, and [CTRL] knobs"* — and gives the per-step form: *"Operate a
   *    knob while holding down a pad [1]–[16]."* So the question is only what those three knobs
   *    can carry.
   *  - `Tune` (p.30, the [TUNE] knob) is `-128–0–+127`, described in full as *"Adjusts the tuning
   *    (pitch)"*. **No semitone scale is printed for it anywhere.** Transposing a chord by a minor
   *    third needs a number in semitones, and turning -128–+127 into one would be inventing the
   *    mapping (invariant 5).
   *  - `Coarse Tune` (p.31) *is* in semitones — `-24–0–+24`, *"Specifies the pitch in semitone
   *    steps"* — and is **not reachable from a [CTRL] knob**. The parameters that are carry an
   *    `INST [CTRL]` marker and a footnote; `Color`, `Pan`, `ReverbSend`, `DelaySend`, `LFO
   *    Depth` and the filter `Cutoff`s all have one, and `Coarse Tune` has none. KIT: CTRL `Sel`
   *    (p.28) offers `OFF, Pan, ReverbSend, DelaySend, LFO Depth, InstFX, User`, and pitch is in
   *    none of them.
   *
   * The near miss, recorded so the next person does not have to find it twice: p.30's LFO
   * destination list *does* include `(SAMPLE) Coarse`, and `LFO Depth` *is* on a [CTRL] knob. So
   * one can motion-record LFO Depth per step with the LFO pointed at Coarse. That is a pitch
   * sweep of an unstated span, not a stable semitone transposition, and no page maps LFO Depth
   * onto semitones — so it cannot produce "play this chord two semitones up" and is not a route.
   *
   * The honest consequence: a rig of nothing but this box gaps `pad` and `stab`, and the guide
   * says so. §12.4's `sampled-chord` requires a voice that can move the chord, and this one can
   * hold it and not move it.
   */
  /**
   * The eleven instruments, in panel order (p.4). Every one is monophonic — one trigger, one
   * sound — so `polyphony` is 1 throughout; §2.2's meaning of the field is *notes within one
   * role*, and nothing on this box sounds two notes of one part at once.
   *
   * The roles are the duties each slot is modelled as taking, not a hardware limit; the module
   * JSDoc argues that at length. `riser` on CC and `texture` on RC are the two sample-borne
   * roles, and they are the reason this device is in the library alongside the TR-1000 rather
   * than being a second copy of it.
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'sub', 'bass-mid'], polyphony: 1 },
    { kind: 'fixed', id: 'mt', label: 'MT', roles: ['tom', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HT', roles: ['tom', 'ghost-perc', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'rs', label: 'RS', roles: ['rim', 'ghost-perc', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'hc', label: 'HC', roles: ['clap', 'snare', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OH', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'cc', label: 'CC', roles: ['impact', 'metallic', 'noise', 'riser'], polyphony: 1 },
    { kind: 'fixed', id: 'rc', label: 'RC', roles: ['ride', 'metallic', 'closed-hat', 'texture'], polyphony: 1 },
  ],

  features: {
    /**
     * TR-REC's per-step vocabulary, all from p.19, and it is **not the TR-1000's list**. This
     * box has no per-step probability and no cycle; it has a flam, which the TR-1000 does not.
     * The TR-1000 declares `alt-inst` too, so the flam is the whole of the difference in this
     * direction — the two share five lanes in all (`velocity`, `substep`, `accent`, `weak`,
     * `alt-inst`). `perStep` is an open per-device list precisely so they can disagree (§2.3).
     *
     *  - `velocity` — *"Hold down a pad [1]-[16] and turn the ACCENT [LEVEL] knob"*
     *  - `accent` — ACCENT [STEP], then pads
     *  - `substep` — [SUB], then a pad; 1/2, 1/3 or 1/4 divisions
     *  - `flam` — [SHIFT] + [SUB] switches SUB STEP to FLAM, then a pad
     *  - `weak` — [SHIFT] + a pad
     *  - `alt-inst` — hold an instrument button, press a pad. Only for tones whose name carries
     *    a `/`, such as `707Bass1/2` — which is why no recipe leans on it for a part that has to
     *    sound, only for colour.
     */
    perStep: ['velocity', 'accent', 'substep', 'flam', 'weak', 'alt-inst'],

    /**
     * `internal: true` — the trigger is one of the eleven instruments or the trigger-out track
     * (`SideChnSrc: BD, SD, LT, MT, HT, RS, HC, CH, OH, CC, RC, TRG`, p.27).
     *
     * `fromExternalAudio: false`, and this is the interesting half. On this box the external
     * input is the thing being **ducked**, not the thing doing the ducking: `KIT: EXT IN` is
     * where the side chain lives, and it ducks EXT IN from an internal instrument. The field
     * records where a trigger comes from, so `false` is right — but note that it cannot say
     * what is being ducked, and here that is the whole point of the feature.
     */
    sidechain: { internal: true, fromExternalAudio: false },

    /**
     * One LFO, shaped per kit (`KIT: LFO` — Waveform `SIN, TRI, SAW, SQR, S&H`, `Tempo Sync
     * OFF/ON`, Rate, p.27) and aimed per instrument (`LFO` and `LFO Depth` in the INST table,
     * p.30). The destinations here are the common-to-all-tones half of that list; the other
     * half only exists on sample tones, so a flat list would claim destinations that half the
     * kits do not have.
     */
    lfo: {
      count: 1,
      syncable: true,
      destinations: ['tune', 'decay', 'level', 'pan', 'reverb-send', 'delay-send', 'inst-fx'],
    },
  },

  /** Gestures off the panel and the step-record page. Jogs, not documentation (invariant 7). */
  hints: {
    'accent-step': 'ACCENT [STEP], then pads',
    'step-dynamics': 'Hold a pad, turn ACCENT [LEVEL]',
    'sub-step': 'Press [SUB], then a pad',
    flam: 'Hold [SHIFT], press [SUB]',
    'weak-step': 'Hold [SHIFT], press a pad',
    'alt-inst': 'Hold [BD]-[RC], press a pad',
    'inst-edit': 'Hold [SHIFT], press [INST]',
    'kit-edit': 'Hold [SHIFT], press [KIT]',
    'select-tone': 'Press [INST], turn [VALUE]',
    'ctrl-select': 'Press [CTRL SELECT]',
    'reverb-send': 'INST Edit > ReverbSend',
    'delay-send': 'INST Edit > DelaySend',
    'ptn-shuffle': 'Hold [SHIFT], press [PTN SELECT]',
  },

  /**
   * §12.4. **Deliberately left at the default of eleven.** The TR-1000 declares 8 of its 10
   * because it is a box you overload; this one is eleven tracks that are always there, always
   * sequenced and always mixed on eleven faders, and nothing in the manual or the panel suggests
   * a load at which it stops being comfortable. Declaring a smaller number would be inventing a
   * discomfort to look cautious.
   */

  manual: { title: 'TR-8S Reference Manual', edition: 'eng01' },

  recipes,
}
