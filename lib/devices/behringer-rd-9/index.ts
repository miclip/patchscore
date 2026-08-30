import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import { RD9_PANEL } from './panel'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'

/**
 * Behringer RHYTHM DESIGNER RD-9 (§2.3). Eleven voices — seven analog, four sampled — a 64-step
 * sequencer, a shared Wave Designer and a 12 dB state-variable filter on one FX bus, and ten
 * individual outputs.
 *
 * ## The document, and what it does and does not print
 *
 * `RD-9_M_EN.pdf`, 38pp, English only, "V 1.0" on the cover (p.1). **Printed folio equals PDF
 * page** — checked at pp.2, 16 and 34, where the header reads `2`, `16`, `34` on PDF pages 2, 16
 * and 34. Every `p.N` below is both.
 *
 * This is a real user manual rather than the multilingual quick-start Behringer usually ships
 * (see `manuals/README.md`), and it is generous with *sequencer* numbers and silent on *knob*
 * numbers. That split runs through the whole file and is worth stating once:
 *
 *  - **Printed and cited**: tempo, swing, probability, flam, filter step values, accent values,
 *    pattern and polymeter lengths, step sizes, every preference option set (pp.19-28); and four
 *    controls in the Specifications table — the filter's cutoff and resonance and the Wave
 *    Designer's attack and sustain, all on p.33.
 *  - **Never printed anywhere**: every one of the voice pots. `TUNE`, `DECAY`, `TONE`, `SNAPPY`,
 *    `LEVEL`, `ATTACK`, `PITCH`, `PITCH DEPTH`, `CH DECAY`, `OH DECAY`, `CRASH TUNE` and
 *    `RIDE TUNE` are described in words on pp.8, 10 and 11 — "turn CCW for shorter, CW for
 *    longer" — and given no scale in 38 pages. The Specifications table lists them by name only
 *    ("Bass drum  Tune, level, attack, decay, pitch, pitch depth", p.33).
 *
 * So those twelve are authored with `travel()`, the DFAM's shape: a position as percent of the
 * knob's own travel, **uncited on both claims and therefore mood-inert (§3.1)**. That is honest —
 * it describes where the knob points and claims nothing about what the box is doing — where
 * hanging a `0-127` on them would be the invented scale §3.1 exists to refuse.
 *
 * ## The one control with two printed scales, and how it is held together
 *
 * `SWING` is printed **three different ways** and the difference is not cosmetic:
 *
 *  - p.20 (DATA MODE) and p.7 (31): `25% negative swing to 50% (straight), then on to 75%`
 *  - p.23, **Global** Parameters: `50 – 75 %`
 *  - p.28, **Pattern** Parameters: `25% - 75%`
 *
 * These are not three readings of one range. Which one is in force is decided by the Swing
 * Preference (p.22, `0 = Song, 1 = Global, 2 = Pattern`), and the global table really does print
 * a narrower range than the pattern table. This is the trap the authoring guide names: a citation
 * beside a value proves nothing unless the value came off the scale actually in force. So every
 * recipe below carries `SWING PREFERENCE = Pattern` beside `SWING`, cited to p.22, and the
 * `25 – 75 %` range is cited to p.28 — the table that preference selects. The pairing cannot come
 * apart, because both are in the same recipe.
 *
 * `PROB` and `STEP SIZE` carry their preferences for the same reason, and p.18 gives the second
 * half of it out loud: *"Probability step settings are stored per pattern, but the amount
 * (0%-100%) is controlled globally."*
 *
 * ## Two controls that do nothing until a switch is on
 *
 * `PITCH` and `PITCH DEPTH` on the bass drum, and `TUNE` on the hi-hats, are inert with Enhanced
 * Mode off — p.10 says so of the first two in as many words (*"PITCH DEPTH and PITCH are only
 * active with enhanced mode on"*) and of the third (*"TUNE controls the frequency of the hats
 * with ENHANCED MODE on"*). Every recipe that sets one of the three carries `ENHANCED MODE = On`
 * as a param, so a reader is never handed a knob position for a knob that is switched out.
 *
 * ## Two places this manual contradicts itself
 *
 * Recorded rather than smoothed over, because both would otherwise become citations that say
 * something the page does not.
 *
 * **1. The MAP table on p.17 is the RD-8's voice list.** It has eleven rows and they are
 * `Bass Drum, Snare Drum, Low Tom/Low Conga, Mid Tom/Mid Conga, Hi Tom/Hi Conga, Rim
 * Shot/Claves, Clap/Maracas, Cowbell, Cymbal, Open Hat, Closed Hat` — a **Cowbell** and a
 * **Cymbal**, which are 808 voices, on a box whose own Specifications table (p.33) and whose own
 * voice-select buttons (p.8) say `Crash` and `Ride` and no cowbell at all. The RD-8 is the same
 * chassis with the 808 voice set, and this table did not get changed. Nothing in this file cites
 * p.17 for a voice name, and no recipe carries a MIDI note number.
 *
 * **2. The Settings table on p.21 is shifted by one row.** Its Description column runs a row
 * behind its Setting Name column from `Voice Note Mappings` onward — that row is described as
 * *"Send the USB MIDI in to the MIDI thru port"*, `Song Chain Mode` as *"Voice MIDI note map"*,
 * `Enhanced Mode` as *"Chain songs together for live performance"*, and `Trigger Out Assign` as
 * *"Set the enhanced mode"* — and the Values column is shifted with it, so `Enhanced Mode` is
 * given `0 – Hold, 1 – Loop, 2 – Stop`. The prose settles all of it: p.17 lists the Chain Songs
 * options as Loop / Hold / Stop, p.17 describes Enhanced Mode as something you *"turn on"*, and
 * p.9 (85) names `TRIGGER OUT 3 BD ASSIGNABLE`. So `ENHANCED MODE`'s option set below is cited
 * to p.17 and not to p.21.
 *
 * ## The FX bus is one bus
 *
 * The Wave Designer and the Analog Filter are a single send bus, and every voice assigned to it
 * shares one `CUTOFF`, one `RESONANCE`, one `ATTACK` and one `SUSTAIN` (p.15, and the routing
 * diagram on the same page). Those four are authored `scope: 'pattern'` — the claim p.28's table
 * makes, where Filter Mode, Filter Enable, Filter Automation and the 64 Filter Step Values are
 * all stored per pattern. Where two parts in one guide want the bus set differently, the
 * hoisting mechanism declines to hoist and prints both, which is the honest rendering of a real
 * conflict at the box rather than a bug.
 *
 * ## What is not modelled
 *
 * Songs, song chaining, Auto Fill, Step Repeat, the SysEx dump format (pp.26-27) and the MIDI
 * note map are arrangement and configuration rather than per-part settings. There is no LFO and
 * no sidechain anywhere in the document, so `features` declares neither.
 *
 * No recipe carries step hits. Patterns are template-owned (§4.3).
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = 'RD-9 User Manual V 1.0'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

// ---------------------------------------------------------------------------
// §3.3 The rear panel
// ---------------------------------------------------------------------------

/**
 * §2.6/#22. The page goes here, keyed by `jacks[<id>]`, and never into a comment beside the
 * socket — written out by hand the map would restate every id a second time, and a key that
 * drifts from its jack is exactly what `DeviceSchema` checks for.
 */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack<Id extends string>(
  id: Id,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): { id: Id; direction: 'in' | 'out'; signal: JackSignalKind[]; note?: string; clock?: string[] } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...extra }
}

/**
 * The rear panel in its own left-to-right order (p.9, items 65-87), plus the front-panel nothing:
 * there is no front panel here, `PHONES` is item 66 on the back beside `MONO`.
 *
 * **The USB port is deliberately absent**, following the TR-6S: `JackSpec.direction` is one of
 * `in` or `out` and this port is both at once — p.19 §11.13 takes sync *from* USB and p.16 §11.2
 * forwards MIDI *to* it. Declaring a direction would be picking one of two true answers, so the
 * `usb` transport carries a `sourceSetup` and no socket.
 *
 * `POWER` (65) is omitted for the ordinary reason: it is a DC inlet and a switch, not something a
 * reader patches.
 *
 * **Ten individual outs for eleven voices**, and the missing one is not an error: `HI HAT
 * INDIVIDUAL OUTPUT` (75) is one jack carrying both hats, which is why p.10 counts *"10
 * independent voice ¼" jacks"* against the eleven sounds on p.33. Inserting a jack cuts that
 * voice from the MONO output (p.10).
 */
const JACKS = [
  jack('PHONES', 'out', ['audio'], 9, { note: '6.35 mm (¼") TRS, on the rear beside MONO' }),
  jack('OUT · MONO', 'out', ['audio'], 9, { note: 'The main output, 6.35 mm TRS servo-balanced' }),
  jack('IN · RETURN', 'in', ['audio'], 9, {
    note: 'Sums audio back in after the filter bus — for processing a voice outside the box',
  }),
  jack('MIDI · IN', 'in', ['clock', 'midi'], 9, { clock: ['midi-din'] }),
  jack('MIDI · OUT', 'out', ['clock', 'midi'], 9, { clock: ['midi-din'] }),
  jack('MIDI · THRU', 'out', ['midi'], 9, { note: 'A direct copy of MIDI IN, for chaining' }),
  jack('OUT · RIDE', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Ride from MONO' }),
  jack('OUT · CRASH', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Crash from MONO' }),
  jack('OUT · HI HAT', 'out', ['audio'], 9, {
    note: 'One jack for both hats — closed and open share it',
  }),
  jack('OUT · CLAP', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Clap from MONO' }),
  jack('OUT · RIM SHOT', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Rim Shot from MONO' }),
  jack('OUT · HI TOM', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Hi Tom from MONO' }),
  jack('OUT · MID TOM', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Mid Tom from MONO' }),
  jack('OUT · LOW TOM', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Low Tom from MONO' }),
  jack('OUT · SNARE', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Snare from MONO' }),
  jack('OUT · BASS', 'out', ['audio'], 9, { note: 'Unbalanced; inserting it cuts Bass Drum from MONO' }),
  jack('TRIGGER OUT 1 · RIM SHOT', 'out', ['trigger'], 9, { note: '+5 V, 2 ms pulse' }),
  jack('TRIGGER OUT 2 · CLAP', 'out', ['trigger'], 9, { note: '+5 V, 2 ms pulse' }),
  jack('TRIGGER OUT 3 · BD ASSIGNABLE', 'out', ['trigger'], 9, {
    note: '+5 V, 2 ms pulse; follows any one of BD, SD, LT, MT, HT, RIM or CLAP (p.21)',
  }),
  jack('SYNC · IN', 'in', ['clock'], 9, {
    clock: ['analog-clock'],
    note: '1/8" TRS — clock on tip, start/stop on ring. Do not exceed +15 V (p.10)',
  }),
  jack('SYNC · OUT', 'out', ['clock'], 9, {
    clock: ['analog-clock'],
    note: '1/8" TRS — clock on tip, start/stop on ring (p.33)',
  }),
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
  unit?: string
  note?: string
  hint?: string
  scope?: 'pattern' | 'song'
}

/**
 * A knob position on a control with **no printed scale**, as percent of travel.
 *
 * Both claims are unverified and both render as such: the point is uncited so the guide marks it
 * provisional (§3.2), and `range.verified` is explicitly `false` so mood may not move it. A
 * travel figure is somebody's taste, and mood arithmetic on top of taste inside bounds nobody
 * checked would be arithmetic dressed as authority. No `mood` is declared on one of these, which
 * is why the audit's mood-inert count stays at zero for this box.
 *
 * Twelve of this box's controls are in this state and the reason is the same for all twelve: the
 * manual describes them in words and prints no range. See the module note.
 */
function travel(name: string, value: number, extra: NumExtra = {}): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    unit: '% travel',
    range: { min: 0, max: 100, verified: false },
    verified: false,
    ...extra,
  }
}

/** A numeric whose **range** is cited and whose **point is taste** (§3.2). */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: NumExtra = {},
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

/** §3.2: the option set is legality and is cited; the selection is authority and is taste. */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  page: number,
  extra: { note?: string; hint?: string; scope?: 'pattern' | 'song' } = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// Cited ranges and option sets
// ---------------------------------------------------------------------------

/** p.28, Pattern Parameters. **Not p.23's `50 – 75 %`** — see the module note on SWING. */
const SWING_PCT = { min: 25, max: 75 }
/** p.23 / p.28, `0 – 100 %`. p.18: 0% never triggers, 100% triggers as programmed. */
const PROB_PCT = { min: 0, max: 100 }
/** p.33, Analog Filter: `Cutoff  10 Hz - 15 kHz, adjustable`. */
const CUTOFF_HZ = { min: 10, max: 15000 }
/** p.33, Analog Filter: `Resonance  0 - 10, adjustable`. */
const RESONANCE = { min: 0, max: 10 }
/** p.33, Wave Designer: `Attack  -15 to +15 dB, adjustable`. */
const WD_ATTACK_DB = { min: -15, max: 15 }
/** p.33, Wave Designer: `Sustain  -24 to +24 dB, adjustable`. */
const WD_SUSTAIN_DB = { min: -24, max: 24 }

/** p.22, the three-way preference every sequencer parameter answers to. */
const PREFERENCE = ['Song', 'Global', 'Pattern'] as const
/** p.19 §11.12, named in the manual's own spelling. `1/16` is called the default there. */
const STEP_SIZES = ['1/8', '1/8T', '1/16', '1/16T', '1/32'] as const
/** p.17 §11.5 — the prose, not p.21's shifted table. See the module note. */
const ON_OFF = ['Off', 'On'] as const
/** p.23, `Global Filter Mode`: `0 = LPF, 1 = HPF`. p.6 (4) names the button. */
const FILTER_MODES = ['LPF', 'HPF'] as const

// ---------------------------------------------------------------------------
// The blocks every recipe shares
// ---------------------------------------------------------------------------

/**
 * §3.1/#107. **The pattern's own settings**, hoisted above the parts because one control serves
 * every voice on the box.
 *
 * Each of the three numbers is paired with the preference that decides which stored copy is in
 * force, and that pairing is the whole point (see the module note on SWING). All six carry an
 * identical value in every recipe, so they agree and hoist to one block per device; `SWING` and
 * `PROB` still move with mood, identically for every part, which is what a pattern-wide control
 * does.
 */
function pattern(): AuthoredParam[] {
  return [
    pick('SWING PREFERENCE', 'Pattern', PREFERENCE, 22, {
      scope: 'pattern',
      note: 'Chooses which stored Swing is used — and with it which printed range applies',
      hint: 'clock-prefs',
    }),
    num('SWING', 50, SWING_PCT, 28, {
      unit: '%',
      scope: 'pattern',
      mood: [{ axis: 'swing', amount: 25 }],
      note: '50 is straight; below it swings negative, above it shuffles (p.20)',
      hint: 'data-mode',
    }),
    pick('PROB PREFERENCE', 'Pattern', PREFERENCE, 22, {
      scope: 'pattern',
      note: 'p.18 adds that the steps are stored per pattern while the amount is one number',
      hint: 'clock-prefs',
    }),
    num('PROB', 90, PROB_PCT, 28, {
      unit: '%',
      scope: 'pattern',
      mood: [{ axis: 'density', amount: 10 }],
      note: 'Only steps switched on in the PROB menu are affected (p.18)',
      hint: 'prob-step',
    }),
    pick('STEP SIZE PREFERENCE', 'Pattern', PREFERENCE, 22, { scope: 'pattern', hint: 'clock-prefs' }),
    pick('STEP SIZE', '1/16', STEP_SIZES, 19, {
      scope: 'pattern',
      note: 'One step is 1/16 of a bar, so sixteen steps make one bar (p.19)',
      hint: 'step-size',
    }),
  ]
}

/**
 * The shared FX bus: Wave Designer into Analog Filter, one set of four controls for every voice
 * sent to it (p.15).
 *
 * `scope: 'pattern'` is p.28's claim — Filter Mode, Filter Enable, Filter Automation and the 64
 * Filter Step Values are all stored per pattern. Two parts asking for different settings is a
 * real conflict at the box and the guide prints both rather than hoisting one over the other.
 *
 * `ATTACK 0` and `SUSTAIN 0` are bypass, and that is the manual's own claim rather than an
 * inference from the dB scale: p.15 says *"With both ATTACK and SUSTAIN controls set to 12
 * o'clock the Wave Designer is essentially in bypass"*.
 */
function fxBus(
  mode: 'LPF' | 'HPF',
  cutoffHz: number,
  resonance: number,
  attackDb: number,
  sustainDb: number,
): AuthoredParam[] {
  return [
    pick('FILTER', 'On', ON_OFF, 23, {
      scope: 'pattern',
      note: 'The ON button engages the filter into the circuit (p.6)',
    }),
    pick('FILTER MODE', mode, FILTER_MODES, 23, {
      scope: 'pattern',
      note: 'The HPF button toggles it; LPF is the default (p.6)',
    }),
    num('CUTOFF', cutoffHz, CUTOFF_HZ, 33, {
      unit: 'Hz',
      scope: 'pattern',
      mood: [{ axis: 'darkness', amount: -2500 }],
      note: 'One filter for the whole box — every voice on the FX bus shares it (p.15)',
      hint: 'fx-send',
    }),
    num('RESONANCE', resonance, RESONANCE, 33, {
      scope: 'pattern',
      mood: [{ axis: 'grit', amount: 3 }],
      note: 'A peak at the cutoff point (p.15)',
    }),
    num('WAVE DESIGNER ATTACK', attackDb, WD_ATTACK_DB, 33, {
      unit: 'dB',
      scope: 'pattern',
      note: '0 dB is 12 o’clock and is bypass (p.15)',
    }),
    num('WAVE DESIGNER SUSTAIN', sustainDb, WD_SUSTAIN_DB, 33, {
      unit: 'dB',
      scope: 'pattern',
      mood: [{ axis: 'space', amount: 8 }],
      note: 'Acts like a compressor upward, and shortens the tail downward (p.15)',
    }),
  ]
}

/** p.17 §11.5. The switch that brings `PITCH`, `PITCH DEPTH` and the hi-hat `TUNE` into circuit. */
function enhanced(): AuthoredParam {
  return pick('ENHANCED MODE', 'On', ON_OFF, 17, {
    note: 'Off, PITCH, PITCH DEPTH and the hi-hat TUNE do nothing (p.10)',
    hint: 'enhanced-mode',
  })
}

/** Every voice has one. p.8 (52): "Level control for the 9 voices plus Accent." */
function level(value: number): AuthoredNumericParam {
  return travel('LEVEL', value, { note: 'Level against the other voices (p.10)' })
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe, explicitly rather than by omission.
 *
 * §3.1 makes the recipe citation the default a param inherits when it carries none. No page in
 * this manual says "these are the settings for a kick" — the nearest thing is p.10's paragraph
 * of prose per voice — so the inheritance chain has to terminate, and saying so is what stops an
 * omitted citation from quietly meaning something later.
 */

const recipes: Recipe[] = [
  // ---- Bass drum ---------------------------------------------------------
  {
    id: 'rd9-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    verified: false,
    title: 'Short 909 kick with the click on the front',
    params: [
      ...pattern(),
      travel('TUNE', 30, { note: 'Pitch envelope depth; CW raises the pitch of the hit (p.10)' }),
      travel('ATTACK', 80, { note: 'CW increases the attack click (p.10)' }),
      travel('DECAY', 34, { note: 'How long the drum rings; CW for longer (p.10)' }),
      level(78),
    ],
    articulation: [
      { slot: 'downbeat', set: { accent: true }, hint: 'accent-step', verified: cite(10) },
    ],
  },
  {
    id: 'rd9-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'bd',
    verified: false,
    title: 'Long kick pushed through the Wave Designer and into the filter',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 46, { note: 'Pitch envelope depth (p.10)' }),
      travel('ATTACK', 40),
      travel('DECAY', 72, { note: 'CW for longer tones (p.10)' }),
      travel('PITCH', 28, { note: 'The bass drum oscillator frequency; Enhanced Mode only (p.8)' }),
      travel('PITCH DEPTH', 62, { note: 'How far the pitch slides into the hit (p.10)' }),
      level(80),
      ...fxBus('LPF', 1800, 6, 9, 6),
    ],
    routing: 'Send the bass drum to the FX bus: press SEND, use SELECT to light BASS DRUM pink, press SEND again (p.15)',
    articulation: [
      { slot: 'downbeat', set: { accent: true }, hint: 'accent-step', verified: cite(10) },
    ],
  },
  {
    id: 'rd9-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'bd',
    verified: false,
    title: 'Bass drum tuned down and held out as a sub tone',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 12, { note: 'Almost no pitch envelope, so the tone stays where PITCH puts it' }),
      travel('ATTACK', 8, { note: 'CCW to take the click off the front (p.10)' }),
      travel('DECAY', 96, { note: 'The longest ring the voice has (p.10)' }),
      travel('PITCH', 10, { note: 'The oscillator frequency, near the bottom of its travel (p.8)' }),
      travel('PITCH DEPTH', 4, { note: 'CCW so the sound barely slides (p.10)' }),
      level(84),
    ],
    routing: 'Take it out of BASS INDIVIDUAL OUTPUT so it can be compressed on its own — inserting the jack cuts it from MONO (p.10)',
  },

  // ---- Snare -------------------------------------------------------------
  {
    id: 'rd9-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'sd',
    verified: false,
    title: 'Snare with the snares wide open',
    params: [
      ...pattern(),
      travel('TUNE', 52, { note: 'Changes the pitch of the snare (p.10)' }),
      travel('TONE', 74, { note: 'CCW reduces the high frequencies (p.8)' }),
      travel('SNAPPY', 82, { note: 'CW increases snap — the mic moving toward the bottom head (p.10)' }),
      level(72),
    ],
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step', verified: cite(10) },
    ],
  },
  {
    id: 'rd9-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'sd',
    verified: false,
    title: 'Tuned-up snare that cuts over the hats',
    params: [
      ...pattern(),
      travel('TUNE', 74),
      travel('TONE', 88),
      travel('SNAPPY', 64),
      level(68),
    ],
    articulation: [
      { slot: 'fill', set: { 'note-repeat': 4 }, hint: 'note-repeat-step', verified: cite(19) },
    ],
  },
  {
    id: 'rd9-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'sd',
    verified: false,
    title: 'Snare turned right down for ghost notes between the backbeats',
    params: [
      ...pattern(),
      travel('TUNE', 58),
      travel('TONE', 40, { note: 'CCW takes the top off so it sits under the backbeat (p.8)' }),
      travel('SNAPPY', 30),
      level(24),
    ],
    articulation: [
      { slot: 'ghost', set: { probability: 55 }, hint: 'prob-step', verified: cite(18) },
    ],
  },

  // ---- Clap --------------------------------------------------------------
  {
    id: 'rd9-clap-hard',
    role: 'clap',
    character: 'hard',
    voice: 'clap',
    verified: false,
    title: 'Clap on the backbeat at full level',
    params: [...pattern(), level(80)],
    routing: 'CLAP has its own trigger output (TRIGGER OUT 2) as well as its audio jack, so it can fire something outside the box on the same step (p.9)',
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step', verified: cite(10) },
    ],
  },
  {
    id: 'rd9-clap-soft',
    role: 'clap',
    character: 'soft',
    voice: 'clap',
    verified: false,
    title: 'Clap tucked under the snare rather than beside it',
    params: [...pattern(), level(38)],
    /**
     * §4.3/#108. **`ghost`, not `offbeat`** — this was the one dead slot in the manifest.
     *
     * `offbeat` is a real slot and the rim and closed hat below both use it, but no direction ever
     * emits it *for a clap*: the reachable set here is backbeat, accent, fill and ghost. An
     * articulation on a slot the role never receives is silently never applied, which is why #108
     * checks it rather than trusting the author.
     *
     * `ghost` is what the title already describes. A clap tucked under the snare is the quiet
     * supporting hit, and the 70% probability reads the same way on it.
     */
    articulation: [
      { slot: 'ghost', set: { probability: 70 }, hint: 'prob-step', verified: cite(18) },
    ],
  },

  // ---- Rim shot ----------------------------------------------------------
  {
    id: 'rd9-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'rim',
    verified: false,
    title: 'Dry rim shot, nothing on the bus',
    params: [...pattern(), level(58)],
    routing: 'RIM SHOT has its own trigger output (TRIGGER OUT 1) beside its audio jack (p.9)',
    articulation: [
      { slot: 'offbeat', set: { probability: 80 }, hint: 'prob-step', verified: cite(18) },
    ],
  },

  // ---- Hats --------------------------------------------------------------
  {
    id: 'rd9-closed-hat-hard',
    role: 'closed-hat',
    character: 'hard',
    voice: 'ch',
    verified: false,
    title: 'Tight closed hat on every sixteenth',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 60, {
        note: 'One knob for both hats — the open hat follows it, Enhanced Mode only (p.10)',
      }),
      travel('CH DECAY', 22, { note: 'CCW for shorter (p.8)' }),
      level(56),
    ],
    articulation: [
      { slot: 'offbeat', set: { 'note-repeat': 2 }, hint: 'note-repeat-step', verified: cite(19) },
    ],
  },
  {
    id: 'rd9-closed-hat-dark',
    role: 'closed-hat',
    character: 'dark',
    voice: 'ch',
    verified: false,
    title: 'Closed hat tuned down so it sits behind the snare',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 26, { note: 'One knob for both hats (p.10)' }),
      travel('CH DECAY', 34),
      level(44),
    ],
  },
  {
    id: 'rd9-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'oh',
    verified: false,
    title: 'Open hat ringing into the next closed hat',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 72, { note: 'The hi-hat TUNE is shared with the closed hat (p.10)' }),
      travel('OH DECAY', 66, { note: 'CW for longer (p.11)' }),
      level(52),
    ],
    routing: 'Programme a closed hat on the step straight after — it cuts the open hat, which is the classic trick (p.10)',
  },
  {
    id: 'rd9-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'oh',
    verified: false,
    title: 'Open hat held long and high-passed into a noise wash',
    params: [
      ...pattern(),
      enhanced(),
      travel('TUNE', 84),
      travel('OH DECAY', 94, { note: 'The longest tail the voice has (p.11)' }),
      level(46),
      ...fxBus('HPF', 3600, 7, 4, 14),
    ],
    routing: 'Send the hi-hats to the FX bus: press SEND, use SELECT to light OPEN pink, press SEND again (p.15)',
  },

  // ---- Cymbals -----------------------------------------------------------
  {
    id: 'rd9-ride-clean',
    role: 'ride',
    character: 'clean',
    voice: 'ride',
    verified: false,
    title: 'Ride keeping the eighths without crowding the hats',
    params: [
      ...pattern(),
      travel('RIDE TUNE', 54, { note: 'Changes the pitch of the ride voice (p.8)' }),
      level(48),
    ],
  },
  /**
   * §7.1/#248. **This recipe was withheld for a day and is back**, which is worth a note because
   * the reason it went is a better argument than the reason it returned.
   *
   * Carrying it took the whole-library sweep from 333,077 nodes to 834,964 — 167% of
   * `DEFAULT_NODE_CAP` — and `search-symmetry.test.ts` failed on `capped === false`. Dropping it
   * brought the sweep back to 354,246, and `--attribute` showed it and `noise` each accounting for
   * ~97% of what this device costs the search.
   *
   * What changed is not the number but what the number gates. That assertion swept the **whole
   * catalogue**, which is a rig nobody builds and which grows with every device — so it fired on
   * this box for being the thirty-fifth rather than for being expensive. A real rig is three
   * orders of magnitude away: twelve devices reach 6,628 nodes against a 500,000 cap. The gate now
   * asserts that promise instead, and the catalogue figure is tracked by `npm run measure:search`
   * rather than blocking a device.
   *
   * The recipe is unchanged from when it was written. `CRASH TUNE 20` through the LPF bus is a
   * metallic bed, both cymbal voices declare the role, and there was never anything wrong with it.
   */
  {
    id: 'rd9-metallic-dark',
    role: 'metallic',
    character: 'dark',
    voice: 'crash',
    verified: false,
    title: 'Crash tuned down and filtered into a metallic bed',
    params: [
      ...pattern(),
      travel('CRASH TUNE', 20, { note: 'Changes the pitch of the crash voice (p.8)' }),
      level(40),
      ...fxBus('LPF', 2600, 4, -3, 12),
    ],
    routing: 'Send the crash to the FX bus: press SEND, use SELECT to light CRASH pink, press SEND again (p.15)',
  },
  {
    id: 'rd9-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'crash',
    verified: false,
    title: 'Crash on the first step of the section and nowhere else',
    params: [
      ...pattern(),
      travel('CRASH TUNE', 66),
      level(84),
    ],
    articulation: [
      { slot: 'first-hit', set: { accent: true }, hint: 'accent-step', verified: cite(10) },
    ],
  },

  // ---- Toms --------------------------------------------------------------
  {
    id: 'rd9-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'lt',
    verified: false,
    title: 'Low tom tuned to the bottom of its travel',
    params: [
      ...pattern(),
      travel('TUNING', 16, { note: 'CCW for low sounds (p.10)' }),
      travel('DECAY', 62),
      level(64),
    ],
    articulation: [
      { slot: 'fill', set: { random: true }, hint: 'random-step', verified: cite(18) },
    ],
  },
  {
    id: 'rd9-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'mt',
    verified: false,
    title: 'Mid tom hit flat and short',
    params: [
      ...pattern(),
      travel('TUNING', 50),
      travel('DECAY', 38),
      level(66),
    ],
    articulation: [
      { slot: 'fill', set: { 'note-repeat': 2 }, hint: 'note-repeat-step', verified: cite(19) },
    ],
  },
  {
    id: 'rd9-tom-bright',
    role: 'tom',
    character: 'bright',
    voice: 'ht',
    verified: false,
    title: 'Hi tom up at the top of its range for fills that answer the snare',
    params: [
      ...pattern(),
      travel('TUNING', 82, { note: 'CW raises the pitch (p.10)' }),
      travel('DECAY', 44),
      level(62),
    ],
    articulation: [
      { slot: 'fill', set: { flam: 10 }, hint: 'flam-step', verified: cite(19) },
    ],
  },
]

// ---------------------------------------------------------------------------
// The device
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'behringer-rd-9',
  name: 'RD-9',
  maker: 'Behringer',
  kind: 'drum-machine',

  /**
   * Both directions, both stated. Receiving: p.19 §11.13 lists the four sync options — `INT`,
   * `MIDI` ("taken from the MIDI IN port"), `USB`, and `TRIG` ("taken from the SYNC IN port"). ,
   * Sending: p.9 (87) `SYNC OUT – SYNC external devices to the Rhythm Designer`, and p.6 says the
   * box *"can also send and receive clock information with highly accurate timing"*.
   *
   * Three transports and each has its own socket or port: `midi-din` at MIDI IN/OUT, `usb` at the
   * type-B port, `analog-clock` at the two 1/8" TRS jacks. p.33 records what is on the analog
   * pair — *"Tip is clock and Ring is the start message"* — and p.17's Analog Clock Mode table
   * gives the rates it will follow: 1 PPS, 1, 2, 4, 24 and 48 PPQ, with 24 PPQ the default (p.16).
   *
   * **`preferredSource` is not claimed (§7.4/#80)** and the reading is genuinely split. p.6 has
   * the box leading — *"the RD-9 lets you control external synths and hardware sequencers to
   * create songs without a digital audio workstation (DAW) in sight"* — and the same paragraph
   * gives send and receive in one symmetric sentence. Against that, the only worked
   * synchronisation procedure in the book is §14 DAW Control (p.29), where a DAW sends MTC and
   * *"On the RD-9 select USB from the Sync options"*. A box that leads in the marketing page and
   * follows in the only procedure has not been told what its job is.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    /**
     * §7.4/#104. **One setting covers all three**, and that is the page rather than a
     * simplification: p.19 §11.13's four options are a single source selector, and `INT` is the
     * one that leaves this box running its own clock. Nothing in the document gates the outputs
     * separately — there is no "clock out on/off" anywhere in 38 pages — so SYNC OUT and MIDI OUT
     * carry the clock whenever the box has one to give.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Press CYCLE (with the sequencer stopped) until INT is lit',
        value: 'INT',
        note: 'Clock leaves MIDI OUT and SYNC OUT together; the manual documents no switch for either',
      },
      {
        transport: 'usb',
        path: 'Press CYCLE (with the sequencer stopped) until INT is lit',
        value: 'INT',
        note: 'The same one selector — p.19 lists four sources and no per-port send setting',
      },
      {
        transport: 'analog-clock',
        path: 'Press CYCLE (with the sequencer stopped) until INT is lit',
        value: 'INT',
        note: 'SYNC OUT is 1/8" TRS: clock on tip, start/stop on ring (p.33)',
      },
    ],
  },

  /**
   * p.33's Connectivity block, read straight off it. `main: 'mono'` — there is one `MONO` output,
   * *"1 x 1/4" TRS, servo-balanced"*, and the box has no stereo pair at all. `individualOuts: 10`
   * — *"Voice out  10 x 1/4" TS, unbalanced"*, for eleven voices, because the two hats share one
   * jack (p.9 item 75). `audioIn: true` is the `RETURN` jack, *"1 x 1/4" TRS, balanced"*, which
   * p.9 describes as summing audio back in after the filter bus.
   *
   * `usbAudio: false`: p.10 §4.2 is explicit — *"The RD-9 is a USB Class Compliant MIDI device"* —
   * and p.33's row reads `USB  Class compliant USB 2.0, type B` under a heading that lists it
   * beside the MIDI ports. p.6 gives the port's purpose as *"sync and midi triggering"*.
   */
  io: { main: 'mono', individualOuts: 10, audioIn: true, usbAudio: false },

  /**
   * §10. 477 mm across. p.34's Physical block gives `Dimensions (H x W x D)  78 x 477 x 264 mm
   * (3.1 x 18.8 x 10.4")`, and the inch conversion confirms the reading — 477 mm is 18.8", which
   * is the W. This is a landscape desktop box played lying flat, so the vendor's W is the
   * playing-orientation horizontal span.
   */
  physical: {
    panelSpanMm: 477,
    verified: cite(34),
  },

  /**
   * §10. **Drawn from the Quick Start Guide, which has the figure the User Manual does not.**
   *
   * This box was the library's last `UNDRAWN` entry, and the reason recorded there was right about
   * the manual: §3 (pp.6-8) draws the panel in eleven separate section crops at their own scales,
   * no page shows them together, and §15's hook-up diagram on p.30 spans the instrument but is a
   * *rear* elevation, so it locates sockets rather than knobs. Nothing in that book looks down at
   * this box.
   *
   * `QSG_BE_0704-AAB_RD-9_WW.pdf` p.8 does: a complete top view with the chassis outline and every
   * control in place. One figure, one scale, both axes. See `panel.ts` for the anchor, the 12.8 mm
   * residual against the specification depth, and the RD-8 cross-check on it.
   */
  panel: RD9_PANEL,

  jacks: [...JACKS],

  /**
   * §2.6/#22. Every capability claim in this manifest, with the page it was read on.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(9),
    'clock.canReceiveClock': cite(19),
    'clock.transport': cite(33),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.6 has the box leading — "the RD-9 lets you control external synths and hardware sequencers to create songs without a DAW in sight" — and gives send and receive in one symmetric sentence, while the only worked synchronisation procedure in the book (§14, p.29) has a DAW sending MTC and the RD-9 set to USB. Leading in the marketing page and following in the only procedure is not a job stated',
    },
    'clock.sourceSetup[midi-din]': cite(19),
    'clock.sourceSetup[usb]': cite(19),
    'clock.sourceSetup[analog-clock]': cite(19),
    'io.main': cite(33),
    'io.individualOuts': cite(33),
    'io.audioIn': cite(33),
    'io.usbAudio': cite(10),
    voices: cite(33),
    'features.perStep': cite(26),
    /**
     * §2.6/#111. **This box loads nothing**, and p.33-34's Specifications section answers it
     * rather than failing to raise it. The Voices block names all eleven sounds as fixed
     * circuits — seven `Analog` (bass drum, snare, three toms, rim shot, clap) and four
     * `Digital (Sampling)` (closed hat, open hat, crash, ride) — and the Storage blocks on p.34
     * enumerate what the box holds: `16 songs, 16 patterns each` and `64 steps`, which is
     * sequencer data. There is no card slot, no sample import, and no audio memory anywhere in
     * 38 pages; the four sampled voices are ROM and are not described as replaceable.
     *
     * So no recipe carries `sourceAudio` and none could: there is nothing to load.
     */
    content: {
      kind: 'cited-against',
      cite: cite(33),
      reason:
        'the Specifications Voices block names all eleven sounds as fixed analog or digital-sampling circuits, and p.34’s Storage blocks list what the box stores as 16 songs of 16 patterns of 64 steps — sequencer data and no audio. There is no card slot, no import path and no sample memory in 38 pages',
    },
    noteDuration: cite(8),
    ...JACK_EVIDENCE,
  },

  /**
   * §2.6/#142. A step fires a voice and carries no length — the voice's own `DECAY` is what ends
   * it (p.8, control 55: *"Changes the decay time of the voice. Turn CCW for shorter, CW for
   * longer"*), and the per-step material this box documents adds gestures rather than durations:
   * accent, probability, flam, note repeat and random are all on/off or a count.
   */
  noteDuration: {
    kind: 'trigger',
    reason: "the voice's own DECAY ends it, and there is no length field on a step",
  },

  /**
   * The eleven voices, labelled with their own VOICE SELECT buttons (p.8, control 58) and listed
   * in the Specifications table (p.33). Every one is monophonic — one trigger, one sound.
   *
   * **Eleven sounds, ten simultaneous** (p.33, `Number of simultaneous voices  10`), because the
   * closed hat cuts the open hat: p.10 describes a closed hat programmed straight after an open
   * hat cutting it, *"which is a classic drum machine trick to simulate a real hi-hat"*. The
   * model has no way to express two voices that cannot sound together, so both are declared and
   * the fact lives here and in `rd9-open-hat-bright`'s routing line.
   *
   * The roles are duties each slot is modelled as taking, not a hardware limit. `sub` on the
   * bass drum is Enhanced Mode's `PITCH` and a long `DECAY`; `noise` on the open hat is a long
   * `OH DECAY` through the high-pass; `metallic` on both cymbals is what they are. A voice
   * listing a role it has no recipe for is §3.5's `unvoiced` outcome and is deliberate.
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BASS DRUM', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SNARE DRUM', roles: ['snare', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LOW TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'mt', label: 'MID TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HI TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'rim', label: 'RIM SHOT', roles: ['rim', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'clap', label: 'CLAP', roles: ['clap', 'snare'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CLOSED', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OPEN', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'crash', label: 'CRASH', roles: ['metallic', 'impact'], polyphony: 1 },
    { kind: 'fixed', id: 'ride', label: 'RIDE', roles: ['ride', 'metallic'], polyphony: 1 },
  ],

  features: {
    /**
     * The per-step lanes, in this box's own words rather than a shared vocabulary — p.26's
     * Pattern Data table is the exhaustive list, because it is the byte layout: *"Events include
     * Step On/Off, Step Prob on/off, step flam on/off, Step Repeat on/off. Step repeat size"*,
     * with the bit masks spelled out on p.27.
     *
     *  - `accent` — press the step twice for a fixed accent, shown solid red (p.10); a global
     *    accent is TAP/HOLD plus the step and is shown white
     *  - `probability` — SETTINGS > PROB (step key 9), select a voice, then the steps (p.18)
     *  - `flam` — SETTINGS > FLAM (step key 10), select a voice, then the steps (p.19)
     *  - `note-repeat` — SETTINGS > RPT (step key 11); 1, 2, 4 or 8 per step (p.19)
     *  - `random` — SETTINGS > RAND (step key 8); marks steps that may fire a random voice from
     *    the selected group (p.18)
     *  - `filter-automation` — SETTINGS > FILTER (step key 6); each of the 64 steps holds a
     *    filter value of 0-255 (p.15, and the `Filter Step Values (1 - 64)` row on p.23)
     *
     * **`velocity` is absent and that is a reading.** p.10 says accent *"can also be programmed
     * via MIDI or USB with a high velocity value, in a DAW or via MIDI any velocity value can be
     * used"* — so the box responds to velocity from outside. Nothing on the panel enters one:
     * p.27's bit layout has a single accent bit and no level field, and there is no per-step
     * dynamics page anywhere. Claiming it would put a control on this box that only a computer
     * has.
     */
    perStep: ['accent', 'probability', 'flam', 'note-repeat', 'random', 'filter-automation'],
  },

  /**
   * Gestures off the settings chapter (pp.15-20). Jogs, not documentation (invariant 7).
   */
  hints: {
    'accent-step': 'Press the step twice for a fixed accent',
    'global-accent': 'Hold TAP/HOLD, press the step',
    'enhanced-mode': 'SETTINGS > PREFS, TAP/HOLD to Enhanced Mode',
    'clock-prefs': 'SETTINGS > CLOCK, TAP/HOLD to page',
    'data-mode': 'Press DATA MODE, then turn DATA',
    'fx-send': 'Press SEND, SELECT the voice, SEND again',
    'filter-step': 'SETTINGS > FILTER, then a step key',
    'flam-step': 'SETTINGS > FLAM, pick a voice, then steps',
    'prob-step': 'SETTINGS > PROB, pick a voice, then steps',
    'note-repeat-step': 'SETTINGS > RPT, pick a voice, then steps',
    'random-step': 'SETTINGS > RAND, pick voices, then steps',
    'poly-length': 'SETTINGS > POLY, turn DATA to activate',
    'step-size': 'SETTINGS, then the step-size key',
    'sync-source': 'Press CYCLE while stopped',
    'pattern-length': 'STEP and RECORD, then LENGTH',
  },

  /**
   * §12.4. **Left at the default**, as both 909-family siblings in the library are. Eleven voices
   * are always present, always sequenced and always mixed on eleven level knobs; nothing in the
   * document suggests a load at which the box stops being comfortable, and p.33's `Number of
   * simultaneous voices  10` is a capacity rather than a judgement about how many parts belong
   * on it in a rig. Declaring a number here would be inventing a discomfort in order to look
   * cautious.
   */

  manual: { title: 'RHYTHM DESIGNER RD-9 User Manual', edition: 'V 1.0' },

  recipes,
}
