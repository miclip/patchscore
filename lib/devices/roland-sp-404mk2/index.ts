import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { SP_404MK2_PANEL } from './panel'

/**
 * Roland SP-404MK2 (§2.3). Sixteen pads, a pattern sequencer, and **two effect slots the whole
 * box shares** — which is the interesting part of this manifest and the reason it reads the way
 * it does.
 *
 * ## The Roland split-manual trap does not apply here, and it is worth saying why
 *
 * The skill's standing warning is that Roland ships the ranges in a second document, and that
 * authoring from the Owner's Manual alone produces a device whose every value is provisional
 * (#18, the TR-1000). `SP-404MK2_v4_reference_eng02_W.pdf` **is** that second document — the
 * Reference Manual, v4.00, 274 pages — and it carries both halves: the panel descriptions
 * (pp.6-14) and the `Parameter | Value | Explanation` tables (pp.77-82, pp.97-99, pp.194-250).
 * So there is no Owner's Manual to go looking for, and nothing below is provisional for want of
 * one.
 *
 * Its printed folio equals its PDF page on every page checked (14, 47, 100, 205, 238, 266 — six
 * footers, against the skill's three), so every `p.N` here is both.
 *
 * ## Two effect slots, shared by every pad
 *
 * p.48: *"Here's how to assign the built-in effects of this unit to BUS 1 or BUS 2. You can use
 * two types of effects separately."* p.49 then sets, **per sample**, which of them it goes
 * through: *"Sets which sample playback audio is sent to which bus (meaning which effects are
 * used) for each sample"*, with pads lit orange for BUS 1, green for BUS 2 and white for DRY.
 *
 * So the routing is per pad and the *effect* is not. Sixteen pads share two effect slots, and
 * every pad on BUS 1 hears the same filter at the same cutoff.
 *
 * That is the Tracker Mini's three-synth-slot problem in a second box (see its manifest), and it
 * is solved here the way the Muse solves its one shared delay: the bus settings carry
 * `scope: 'song'` and are **byte-identical wherever they appear**, so `hoistedParams` (§3.1/#107)
 * states them once above the parts instead of printing one filter cutoff nine times. Vary any of
 * them between two recipes and the hoist silently stops — which is the honest rendering of a
 * disagreement, and here would be a disagreement about a setting the box only has one of.
 *
 * `BUS` itself stays per-recipe and unscoped, because that is the control that genuinely differs:
 * a kick can sit dry while a pad is drenched, off the same two slots.
 *
 * **`song` is the closest of two words and not the box's own.** `PARAM_SCOPES` offers `pattern`
 * and `song`; the SP-404MK2's bus assignment belongs to the *unit* — p.51 says the BUS 1 and
 * BUS 2 main parameters are saved by holding [SHIFT] and [MARK] for three seconds, not by saving
 * a pattern. It outlives any pattern, which is what `song` conveys to a reader, and the note on
 * each parameter says what it actually covers. Adding a third scope value for one box would be
 * widening a vocabulary to avoid writing a note.
 *
 * ## What the two slots are set to, and why it is authored rather than left open
 *
 * BUS 1 is `FILTER+DRIVE` — one of the six effect buttons on the panel (p.47), so a reader
 * assigns it by pressing the button it is written on. BUS 2 is `MFX`, the sixth button, with
 * `Reverb` selected under it (p.50).
 *
 * Those two cover the four mood axes this box can move: `darkness` and `grit` land on the
 * filter's `CUTOFF` and `DRIVE` (p.205), `space` on the reverb's `TIME` and `LEVEL` (p.226), and
 * `swing` on the pattern's own `SHUFFLE` (p.97). **`density` is declined**, and by the rule in
 * §6.1 rather than by a flag: nothing on this box is a probability, so no parameter here declares
 * that axis and the knob does nothing. Inventing a mapping onto `HOLD` to make five out of five
 * would be an offset with no claim behind it.
 *
 * The five effect buttons are reassignable (`DIRECT FX`, p.172) and BUS 1/BUS 2 can host any of
 * the 37 MFX effects besides (p.251), so this pair is a choice, not a limit — `BUS 1 · EFX` and
 * `BUS 2 · EFX` cite the printed button list and leave the selection uncited, like every other
 * point here.
 *
 * ## One pool of sixteen, polyphony 1 — and the mode that would have been a second answer
 *
 * p.266: `Pads 16 pads + 1 sub pad`, `Maximum polyphony 32 voices`. Thirty-two voices across
 * sixteen pads is not one voice each, so unlike the Digitakt II the arithmetic does not settle
 * polyphony — what settles it is that a pad holds *one sample* (p.16) and pressing it plays that
 * sample. There is no per-pad chord.
 *
 * **CHROMATIC is the exception, and it is exactly the shape §2.2 cannot carry.** p.38: pads
 * [1]-[16] become a keyboard for one sample, and the play method can be set to `POLY` —
 * *"Pressing multiple pads makes the samples play back at the same time (polyphonic)"*. That is a
 * genuinely polyphonic voice. It also consumes **the entire bank**: every other pad stops being a
 * sample slot for as long as the mode is on. `Assignable` has no way to say "this one exists only
 * if the other fifteen do not", so modelling it would claim a rig this box cannot hold.
 *
 * The way out is §12.4's `sampled-chord`, and both halves of its argument are on the page here,
 * as they are for the Digitakt II:
 *
 *  1. *It sustains* — `HOLD STEP` joins steps in a pattern, *"the same results as using a tie"*
 *     (p.98), and under it the sample's GATE parameter is set to ON, which is the state where a
 *     sample sounds for as long as it is held (p.30). The `pad` recipe below adds `LOOP ON` on
 *     top, because the two are separate buttons: the loop fills a held step longer than the
 *     sample, so the chord does not stop halfway through the note.
 *  2. *It transposes per step* — TR-REC carries `PITCH -12–+12` per step, and `PITCH MODE`
 *     `CHROMATIC` means *"each step that's input can be played back at a different pitch"*
 *     (p.98). Microscope edits the same field note by note (p.102).
 *
 * Transposition preserves the recorded voicing and nothing else, so a changed chord shape is a
 * second sample (§4.1). The Hook phase lists which and the semitone offset for each trigger.
 *
 * ## The two-printed-scales trap, twice, and it is the manual's own footnote both times
 *
 * `CLAUDE.md`'s rule is that a cited range can still be the wrong range where a manual prints
 * more than one scale for a control. p.80 prints both, in the Value column:
 *
 *  - `PITCH  -12.00–+12.00 (when VINYL MODE is "No")` / `-12.00–+7.00 (when VINYL MODE is "Yes")`
 *  - `SPEED  50–150 (%)`, with `* This can only be set when BPM SYNC is off.`
 *
 * So every recipe that authors `PITCH` also authors `VINYL MODE`, and every recipe that authors
 * `SPEED` also authors `BPM SYNC`. The switch travels with the value and the pairing cannot come
 * apart, which is the TR-8S's and the minilogue xd's answer to the same defect.
 *
 * ## Where a value is not authored, and why
 *
 *  - **`PAN` is not authored.** p.80 prints its value as `MONO (Left), L:50–R:50, MONO (Right)` —
 *    a numeric sweep with a named endpoint at each end. That is neither a `NumericRange` nor an
 *    `EnumOptions`, and picking either would drop half of what the manual states.
 *  - **`REVERSE` is a `text` param, not an enum.** It is a button that lights, and no page in 274
 *    prints an `OFF, ON` pair for it — pp.32-33 describe turning it on and nothing prints the
 *    other half. An enum would have to invent its own option set to have a legality gate, so the
 *    parameter says what to do and claims nothing. Its point stays uncited like every other.
 *  - **Bank and project tempo have no printed range.** p.133 gives the procedure and the
 *    `TEMPO SEL` values and stops; 40–200 is what every other tempo field on the box says (p.97,
 *    p.118, p.132), which makes it a good guess and not a citation. The recipes set the
 *    pattern's `BPM`, which is printed.
 */

const MANUAL = 'SP-404MK2 Reference Manual v4.00'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/** For a claim whose pages are not one, in the Digitakt II's `p.43, p.53` form. */
function citePages(...pages: number[]): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages.map((n) => `p.${n}`).join(', ')}` }
}

// ---------------------------------------------------------------------------
// Option sets, exactly as the manual enumerates them
// ---------------------------------------------------------------------------

/**
 * **The [GATE] button has three states, and p.26's table is not a list of them.**
 *
 * That table — "About sample playback mode", with `Gate`, `One-shot playback` and `Loop` in one
 * column and a page reference beside each — reads like a closed set of exclusive modes, and this
 * manifest authored it as one. Rendering the three pages it points at shows it is a *reference
 * index* rather than a state list, and that the box has **two independent per-sample controls**:
 *
 *  - p.30, GATE: *"Press the [GATE] button to switch the function on (the button is lit) and off
 *    (the button goes dark)."* On, a sample sounds only while the pad is held; off, it starts on
 *    each press and runs on its own.
 *  - p.31, one-shot: *"Hold down the [VALUE] knob and press the [GATE] button… The [GATE] button
 *    blinks slowly at this time."* A **third state of the same button**, not a third control, and
 *    the one place the two do interact: *"The loop function turns off (and the [LOOP] button goes
 *    dark) when one-shot playback is on."*
 *  - p.32, LOOP: *"When the [LOOP] button is turned on, the loop switches between playback and
 *    stopping with each press of the pad… When the [LOOP] button is off, samples play back from
 *    the beginning each time a pad is pressed."* Its own button, its own on/off.
 *
 * So `GATE MODE` and `LOOP` are two parameters, and the combinations the old enum could not say
 * are the interesting ones — a **gated loop** (GATE lit, LOOP lit) sustains a sample under a held
 * step for longer than the sample itself, which is what the `pad` recipe below is built on.
 *
 * The one constraint is p.31's, and it is authored rather than assumed: a recipe on `ONE-SHOT`
 * states `LOOP OFF`, because that is the state the box will be in and a reader looking at a dark
 * [LOOP] button should find it in the guide.
 */
const GATE_MODES = ['OFF', 'ON', 'ONE-SHOT'] as const

/** p.32. The [LOOP] button, which is its own control and not a value of the one above. */
const LOOP_STATES = ['OFF', 'ON'] as const

/** p.32's three headed subsections under LOOP. Only meaningful when `LOOP` is `ON`. */
const LOOP_DIRECTIONS = ['Forwards', 'In reverse', 'Forwards then backwards'] as const

/** p.49's pad-colour table: orange is BUS 1, green is BUS 2, white is neither. */
const BUS_SENDS = ['BUS 1', 'BUS 2', 'DRY'] as const

/**
 * The six effect buttons named on p.47, which is how an effect reaches BUS 1 or BUS 2 (p.48,
 * step 2: *"Press the [FILTER+DRIVE]–[MFX] buttons to select the effect to assign to the bus"*).
 * Five of the six are reassignable in `DIRECT FX` (p.172); the labels are the panel's.
 */
const EFFECT_BUTTONS = [
  'FILTER+DRIVE',
  'RESONATOR',
  'DELAY',
  'ISOLATOR',
  'DJFX LOOPER',
  'MFX',
] as const

/**
 * What [MFX] can be set to on BUS 1 or BUS 2 — p.251's `CC#83` map for those two buses, values
 * 6-42. **Not p.202's `EFX Type` list**, which is BUS 3 and BUS 4 and is a different set: it
 * carries Isolator, Resonator, Filter+Drive and Sync Delay (which reach BUS 1 and BUS 2 by their
 * own buttons instead) and omits Stopper, Back Spin and DJFX Delay.
 */
const MFX_ON_BUS = [
  'Scatter', 'Downer', 'Ha-Dou', 'Ko-Da-Ma', 'Zan-Zou', 'To-Gu-Ro', 'SBF', 'Stopper', 'Tape Echo',
  'TimeCtrlDly', 'Super Filter', 'WrmSaturator', '303 VinylSim', '404 VinylSim', 'Cassette Sim',
  'Lo-fi', 'Reverb', 'Chorus', 'JUNO Chorus', 'Flanger', 'Phaser', 'Wah', 'Slicer', 'Tremolo/Pan',
  'Chromatic PS', 'Hyper-Reso', 'Ring Mod', 'Crusher', 'Overdrive', 'Distortion', 'Equalizer',
  'Compressor', 'SX Reverb', 'SX Delay', 'Cloud Delay', 'Back Spin', 'DJFX Delay',
] as const

/** Filter+Drive's `FLT TYPE`, p.205. */
const FLT_TYPES = ['HPF', 'LPF'] as const

/** Reverb's `TYPE`, p.226. */
const REVERB_TYPES = ['AMBI', 'ROOM', 'HALL1', 'HALL2'] as const

/** p.81. The switch that decides which of `PITCH`'s two printed scales is in force. */
const VINYL_MODES = ['No', 'Yes'] as const

/** p.29. The switch that decides whether `SPEED` can be set at all. */
const BPM_SYNC = ['OFF', 'ON'] as const

/** p.81. `Fix` plays every hit at velocity 127. */
const FIXED_VELOCITY = ['Vel', 'Fix'] as const

/** p.68's sound generator waveforms. The synth that makes a sample rather than a voice. */
const SOUND_GEN_TYPES = [
  'Sine 1', 'Sine 2', 'Cos 1', 'Cos 2', 'Saw', 'Saw+', 'Saw 2', 'Tri', 'Pulse', 'Pulse+',
  'Noise 1', 'Noise 2',
] as const

/**
 * p.74's `AUTO MARK` screen. **The three are alternatives, not three settings**: step 5 is *"Use
 * the [VALUE] knob or [CTRL 2] knob to select a parameter"* and step 6 *"Use the [CTRL 3] knob to
 * edit the setting value"*, so one condition is chosen and one value dialled for it. Authoring
 * `TRANSIENT` and `TIME DIVISION` side by side would print two conditions for a screen that
 * applies one, which is the conditional-control defect `CLAUDE.md` records for the TR-8S's INST
 * table wearing a different hat.
 *
 * The selector has no printed name of its own — the manual's column heading is `Parameter` and
 * its verb is "select a parameter" — so it is named for the column rather than given an invented
 * one. `MODE` in particular is *not* free: p.99 uses it for TR-REC's own TRIG / HOLD STEP switch,
 * which this manifest also authors, and two different controls under one name in one device is
 * the collision `hoistedParams` keys on.
 */
const AUTO_MARK_PARAMETERS = ['TIME DIVISION', 'LEVEL', 'TRANSIENT'] as const

/** p.74's `AUTO MARK` transient setting, which is how a chop lands on syllables. */
const TRANSIENTS = ['HARD', 'MID', 'SOFT'] as const

/**
 * §2.3's per-step vocabulary: what TR-REC and Microscope carry per step (pp.98-99, p.101, p.102).
 *
 * Five of the six are reachable from `articulation`, because each is a scalar that stays true
 * applied to every hit in a slot: `velocity` (0-127), `pitch` (-12-+12), `start` (-50-99%, the
 * per-step timing offset), `substep` (p.101's division table) and `hold-step` (1-32 or LAST).
 *
 * `knob-motion` is declared and deliberately unreachable. p.99: holding [ROLL] and turning a
 * [CTRL] knob *"record[s] the motion of [CTRL 1] knob in the steps"*. A motion is a curve over
 * time, and `ArticulationEntry.set` is a scalar — writing one number for it would say the knob
 * was parked, which is the opposite of what the gesture does.
 */
const PER_STEP = [
  'velocity',
  'pitch',
  'pitch-mode',
  'start',
  'substep',
  'hold-step',
  'mode',
  'knob-motion',
] as const

/** The subset `articulation` may use. Exported so a test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'pitch',
  'pitch-mode',
  'start',
  'substep',
  'hold-step',
  'mode',
] as const

/**
 * §3.1's conditional-control rule, applied to the step grid: **three of the five values TR-REC
 * carries only exist under a particular switch**, and the switch travels in the same `set` so the
 * pairing cannot come apart.
 *
 *  - `substep` — p.98 footnotes it *"This is enabled when MODE is 'TRIG'."*
 *  - `hold-step` — p.98 footnotes it *"This is enabled when MODE is 'HOLD STEP'."*
 *  - `pitch` — p.98's `PITCH MODE` has two values, and under `PAD` *"all of the steps you input
 *    play back at the pitch you set in PITCH"*. A per-step pitch exists only under `CHROMATIC`,
 *    where *"each step that's input can be played back at a different pitch"*.
 *
 * `velocity` and `start` need no switch: neither is footnoted and both are on the screen in
 * either mode.
 *
 * **The switch belongs in the `set` rather than in `params`**, and that is not a stylistic
 * choice. `MODE` is set while steps are being entered, so one recipe can legitimately enter one
 * slot under TRIG and another under HOLD STEP — a recipe-level parameter could hold only one of
 * the two and would make the second slot's value a lie.
 */
export const STEP_SWITCHES: Record<string, readonly [string, string]> = {
  substep: ['mode', 'TRIG'],
  'hold-step': ['mode', 'HOLD STEP'],
  pitch: ['pitch-mode', 'CHROMATIC'],
}

// ---------------------------------------------------------------------------
// Param helpers. Legality is cited; authority never is (§3.2).
// ---------------------------------------------------------------------------

type Extra = {
  mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
  unit?: string
  hint?: string
  note?: string
  scope?: 'pattern' | 'song'
}

function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Extra = {},
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

/** `page` is the ordinary case; a `Cite` is for an option set the manual prints across two. */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  page: number | Cite,
  extra: Omit<Extra, 'mood' | 'unit'> = {},
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: typeof page === 'number' ? cite(page) : page },
    verified: false,
    ...extra,
  }
}

// --- the sample's own settings (SAMPLE EDIT, pp.77-82) ---------------------

/**
 * The [GATE] button. **Its option set spans two pages** because the third state does: p.30 prints
 * the lit/dark pair and p.31 the slow blink, so a citation naming only one of them would cite a
 * list that page does not contain.
 *
 * The hint and note are chosen per value rather than fixed. Two of the three are a press of the
 * button and the third is `[VALUE]` held while it is pressed, and one hint for all three would
 * send a reader to the right button by the wrong gesture for the state most of these recipes use.
 * The notes are the button's own appearance, because that is what a reader checks against.
 */
const GATE_NOTES: Record<(typeof GATE_MODES)[number], string> = {
  OFF: 'Button dark — the sample starts on each press and plays on without you',
  ON: 'Button lit — the sample sounds only while the pad is held',
  'ONE-SHOT': 'Button blinking slowly — plays once to the end, and turns LOOP off by itself (p.31)',
}
const gateMode = (m: (typeof GATE_MODES)[number]) =>
  pick('GATE MODE', m, GATE_MODES, citePages(30, 31), {
    hint: m === 'ONE-SHOT' ? 'one-shot' : 'gate',
    note: GATE_NOTES[m],
  })

/**
 * The [LOOP] button, p.32. Independent of `GATE MODE` except where p.31 says otherwise.
 *
 * The default note says only what is true of the button in **either** gate state — the sample
 * repeats instead of stopping. p.32's fuller sentence, *"the loop switches between playback and
 * stopping with each press of the pad (trigger playback)"*, describes a pad you press and release,
 * which is the gate-off case; on the gated loop below the pad is held and released instead, so
 * printing it there would tell a reader to expect a behaviour they will not get. That recipe
 * passes its own note.
 */
const loop = (v: (typeof LOOP_STATES)[number], note?: string) =>
  pick('LOOP', v, LOOP_STATES, 32, {
    hint: 'loop',
    note:
      note ??
      (v === 'ON'
        ? 'Button lit — the sample repeats instead of stopping at its end'
        : 'Button dark — the sample plays from its beginning on each press'),
  })

/** p.32's three procedures. Authored only beside `LOOP: ON`, which is the only place it exists. */
const LOOP_DIR_HINTS: Record<(typeof LOOP_DIRECTIONS)[number], string> = {
  Forwards: 'loop',
  'In reverse': 'loop-reverse',
  'Forwards then backwards': 'ping-pong',
}
const loopDir = (d: (typeof LOOP_DIRECTIONS)[number]) =>
  pick('LOOP DIRECTION', d, LOOP_DIRECTIONS, 32, { hint: LOOP_DIR_HINTS[d] })
/** p.77. 127 is a three-second fade-in, which is the only point on the scale the manual fixes. */
const attack = (v: number) => num('ATTACK', v, { min: 0, max: 127 }, 77, { hint: 'envelope' })
/** p.77. A percentage of the sample's own length, not a time. */
const hold = (v: number) =>
  num('HOLD', v, { min: 1, max: 100 }, 77, {
    unit: '%',
    hint: 'envelope',
    note: 'A share of the sample’s whole length, not a time',
  })
const release = (v: number) => num('RELEASE', v, { min: 0, max: 127 }, 77, { hint: 'envelope' })
const volume = (v: number) => num('VOLUME', v, { min: 0, max: 127 }, 80, { hint: 'pitch-speed' })
/** p.81. Carried wherever `PITCH` is, because it chooses which of two printed scales applies. */
const vinyl = (v: (typeof VINYL_MODES)[number]) =>
  pick('VINYL MODE', v, VINYL_MODES, 81, {
    hint: 'vinyl-mode',
    note: '“No” is the scale PITCH below is read off; “Yes” tops out at +7.00',
  })
/**
 * p.80, on the VINYL MODE “No” scale — see `vinyl`, which every use of this pairs with.
 *
 * **No unit**, deliberately. The manual prints `-12.00–+12.00` and never says what of; the one
 * page in 274 that uses the word semitone is Chromatic PS's (p.234), about a different control.
 * ±12 against a chromatic scale is an octave and everybody knows it, which is exactly the kind of
 * thing §2.6 says to leave unwritten rather than state on nobody's authority. The range prints
 * beside the value and does the work at the machine.
 */
const pitch = (v: number) => num('PITCH', v, { min: -12, max: 12 }, 80, { hint: 'pitch-speed' })
/** p.29. Carried wherever `SPEED` is, because p.80 says SPEED cannot be set unless this is off. */
const bpmSync = (v: (typeof BPM_SYNC)[number], note?: string) =>
  pick('BPM SYNC', v, BPM_SYNC, 29, { ...(note === undefined ? {} : { note }) })
/** p.80. Only settable with BPM SYNC off — see `bpmSync`. */
const speed = (v: number) =>
  num('SPEED', v, { min: 50, max: 150 }, 80, {
    unit: '%',
    hint: 'pitch-speed',
    note: 'Only settable with BPM SYNC off',
  })
const fixedVel = (v: (typeof FIXED_VELOCITY)[number]) =>
  pick('FIXED VELOCITY', v, FIXED_VELOCITY, 81)

/**
 * p.33. A button that lights; no page in the document prints an `OFF, ON` pair for it, so this is
 * a `text` param rather than an enum with an invented option set. See the module note.
 *
 * The note carries p.196's `Reverse Type`, because it decides what pressing the button mid-flight
 * does and a reader who has the SP-404SX behaviour in mind will otherwise be surprised.
 */
function reverse(): AuthoredParam {
  return {
    kind: 'text',
    name: 'REVERSE',
    value: 'On — the sample plays end to start',
    verified: false,
    hint: 'reverse',
    note: 'Where reverse begins mid-playback is the SYSTEM “Reverse Type” setting: 404 from the end point, 303 from where you are (p.196)',
  }
}

/**
 * p.97's `SHUFFLE`, from the RECORD SETTING screen. **One number for the whole pattern**, so it
 * is the same on every recipe — carried per recipe because a rendered part has to say what the
 * box should be set to, not because nineteen parts disagree. The TR-8S does this identically.
 *
 * `amount` is 50, the distance from 0 to the printed bound, so the whole positive half of the
 * control is reachable and no part of the travel is spent against a clamp. The manual's own
 * steer: *"Settings in the range of +10-16 generally give a pleasant shuffle feel."*
 */
const shuffle = () =>
  num('SHUFFLE', 0, { min: -50, max: 50 }, 97, {
    mood: [{ axis: 'swing', amount: 50 }],
    hint: 'record-setting',
    scope: 'pattern',
    note: 'Pattern-wide: one setting for the whole pattern, not per pad. 0 is straight',
  })

// --- the two shared bus slots (pp.47-51) -----------------------------------

/** p.49. The one bus control that is genuinely per pad, so it is unscoped and per recipe. */
const bus = (b: (typeof BUS_SENDS)[number]) =>
  pick('BUS', b, BUS_SENDS, 49, {
    hint: 'bus-send',
    note: 'Set per pad: hold [REMAIN] and press the pad until it lights for the bus you want',
  })

/**
 * BUS 1's slot, and the settings every pad on it shares. Identical wherever it appears —
 * `hoistedParams` only lifts a scoped parameter when every occurrence renders the same, so
 * varying one of these would drop them all back into the per-part lists and print one filter's
 * cutoff once per pad.
 *
 * A general-purpose low-pass with the drive audible and not dominant, safe under any of the parts
 * routed here. `CUTOFF` carries `darkness` and `DRIVE` carries `grit`; mood is uniform across a
 * guide, so every occurrence moves together and both stay hoistable.
 *
 * `FLT TYPE` is included rather than left at a default because `CUTOFF` means the opposite thing
 * under the other one — p.205: HPF *"cuts off the low frequencies"*, LPF the high — and a cutoff
 * without the type beside it is half an instruction.
 */
function busOne(): AuthoredParam[] {
  return [
    pick('BUS 1 · EFX', 'FILTER+DRIVE', EFFECT_BUTTONS, 47, {
      scope: 'song',
      hint: 'bus-assign',
      note: 'One effect for the whole unit, not per pad. The five non-MFX buttons are reassignable in DIRECT FX (p.172)',
    }),
    pick('BUS 1 · FLT TYPE', 'LPF', FLT_TYPES, 205, { scope: 'song' }),
    num('BUS 1 · CUTOFF', 1800, { min: 20, max: 16000 }, 205, {
      unit: 'Hz',
      scope: 'song',
      mood: [{ axis: 'darkness', amount: -1400 }],
    }),
    num('BUS 1 · RESONANCE', 30, { min: 0, max: 100 }, 205, { scope: 'song' }),
    num('BUS 1 · DRIVE', 55, { min: 0, max: 100 }, 205, {
      scope: 'song',
      mood: [{ axis: 'grit', amount: 45 }],
    }),
  ]
}

/**
 * BUS 2's slot, on the same terms as `busOne`. `Reverb` is an MFX rather than one of the five
 * dedicated buttons, so it takes two settings to reach: the [MFX] button assigns the slot (p.48)
 * and the effect is chosen under it (p.50).
 *
 * A short room, present without swallowing the part. `TIME` and `LEVEL` both carry `space`.
 * `LOW CUT` and `HIGH CUT` are not authored: p.226 prints them as `FLAT, 20–800 (Hz)` and
 * `630–12500, FLAT (Hz)` — a sweep with a named endpoint, which is neither a range nor an enum.
 */
function busTwo(): AuthoredParam[] {
  return [
    pick('BUS 2 · EFX', 'MFX', EFFECT_BUTTONS, 47, {
      scope: 'song',
      hint: 'bus-assign',
      note: 'One effect for the whole unit, not per pad',
    }),
    pick('BUS 2 · MFX', 'Reverb', MFX_ON_BUS, 251, { scope: 'song', hint: 'mfx-select' }),
    pick('BUS 2 · TYPE', 'ROOM', REVERB_TYPES, 226, { scope: 'song' }),
    num('BUS 2 · TIME', 42, { min: 0, max: 100 }, 226, {
      scope: 'song',
      mood: [{ axis: 'space', amount: 40 }],
    }),
    num('BUS 2 · LEVEL', 34, { min: 0, max: 100 }, 226, {
      scope: 'song',
      mood: [{ axis: 'space', amount: 40 }],
    }),
  ]
}

// --- the sound generator (p.68), which makes a sample rather than a voice ---

const genType = (t: (typeof SOUND_GEN_TYPES)[number]) =>
  pick('SOUND GEN · Type', t, SOUND_GEN_TYPES, 68, { hint: 'sound-gen' })
const genFreq = (v: number) => num('SOUND GEN · Freq', v, { min: -36, max: 48 }, 68, { hint: 'sound-gen' })
const genOct = (v: number) => num('SOUND GEN · OCT', v, { min: -4, max: 12 }, 68, { hint: 'sound-gen' })
const genLevel = (v: number) => num('SOUND GEN · Level', v, { min: 0, max: 127 }, 68, { hint: 'sound-gen' })
const genDuty = (v: number) =>
  num('SOUND GEN · Duty Cycle', v, { min: 0, max: 100 }, 68, { unit: '%', hint: 'sound-gen' })

/** p.68. The one documented way to obtain source audio on this box without recording anything. */
const generated: NonNullable<Recipe['sourceAudio']>['prep'] = {
  text: 'Make it on the box: hold [SHIFT] and press [RECORD SETTING] for the sound generator, dial the waveform in, then press [REC] and choose a pad to save it to',
  verified: cite(68),
}

// --- articulation ----------------------------------------------------------

function art(
  slot: NonNullable<Recipe['articulation']>[number]['slot'],
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  {
    id: 'sp-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'pad',
    title: 'Kick one-shot, dry and untouched',
    verified: false,
    sourceAudio: { need: 'A kick one-shot with the transient intact and no room on it' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(100),
      release(10),
      volume(118),
      fixedVel('Vel'),
      shuffle(),
    ],
    articulation: [art('downbeat', { velocity: 120 }, 'tr-rec')],
  },
  {
    id: 'sp-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'pad',
    title: 'Kick through the filter and drive, tail cut short',
    verified: false,
    sourceAudio: {
      need: 'A kick one-shot with body below the click — the drive works on what is already there',
    },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('BUS 1'),
      ...busOne(),
      attack(0),
      hold(74),
      release(4),
      volume(120),
      shuffle(),
    ],
    articulation: [art('accent', { velocity: 127 }, 'tr-rec')],
  },
  {
    id: 'sp-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'pad',
    title: 'Sine generated on the box, held under the bar',
    verified: false,
    sourceAudio: {
      need: 'A pure low sine with a stable, known pitch — nothing above the fundamental to filter',
      prep: generated,
      hint: 'sound-gen',
    },
    params: [
      genType('Sine 1'),
      genFreq(-24),
      genOct(-2),
      genLevel(110),
      gateMode('ON'),
      loop('OFF'),
      bus('DRY'),
      vinyl('No'),
      pitch(0),
      attack(2),
      hold(100),
      release(18),
      volume(112),
      shuffle(),
    ],
    articulation: [art('downbeat', { mode: 'HOLD STEP', 'hold-step': 4 }, 'tr-rec')],
  },
  {
    id: 'sp-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'pad',
    title: 'Generated pulse bass, driven and filtered on the bus',
    verified: false,
    sourceAudio: {
      need: 'A short pulse or square tone with harmonics above the fundamental — a sine has nothing for the drive to bite on',
      prep: generated,
      hint: 'sound-gen',
    },
    params: [
      genType('Pulse'),
      genFreq(-12),
      genDuty(34),
      genLevel(104),
      gateMode('ON'),
      loop('OFF'),
      bus('BUS 1'),
      ...busOne(),
      vinyl('No'),
      pitch(0),
      attack(0),
      hold(100),
      release(8),
      volume(108),
      shuffle(),
    ],
    articulation: [art('downbeat', { velocity: 112, mode: 'HOLD STEP', 'hold-step': 2 }, 'tr-rec')],
  },
  {
    id: 'sp-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'pad',
    title: 'Snare one-shot, flat and forward',
    verified: false,
    sourceAudio: { need: 'A snare one-shot, crack intact and dry' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(96),
      release(14),
      volume(116),
      fixedVel('Vel'),
      shuffle(),
    ],
    articulation: [art('backbeat', { velocity: 124 }, 'tr-rec')],
  },
  {
    id: 'sp-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'pad',
    title: 'Clap over the snare, top end left alone',
    verified: false,
    sourceAudio: { need: 'A stereo hand-clap one-shot — several hands rather than one' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(100),
      release(22),
      volume(108),
      shuffle(),
    ],
    articulation: [art('backbeat', { velocity: 110 }, 'tr-rec')],
  },
  {
    id: 'sp-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'pad',
    title: 'Rim click, trimmed to the transient',
    verified: false,
    sourceAudio: { need: 'A rim or cross-stick one-shot under 200 ms' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(40),
      release(2),
      volume(96),
      shuffle(),
    ],
    articulation: [art('offbeat', { velocity: 88 }, 'tr-rec')],
  },
  {
    id: 'sp-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'pad',
    title: 'Closed hat, offbeats pulled back off the grid',
    verified: false,
    sourceAudio: { need: 'A closed hat one-shot under 150 ms, dry' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(30),
      release(2),
      volume(84),
      shuffle(),
    ],
    // p.99: START is per step and negative values pull the hit earlier than the step.
    articulation: [art('offbeat', { velocity: 84, start: -6 }, 'tr-rec')],
  },
  {
    id: 'sp-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'pad',
    title: 'Hat through the drive, ghosts split into three',
    verified: false,
    sourceAudio: {
      need: 'A closed hat one-shot that is already lo-fi — a sampled machine hat, not a studio recording',
    },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('BUS 1'),
      ...busOne(),
      attack(0),
      hold(24),
      release(2),
      volume(88),
      shuffle(),
    ],
    // p.101's SUBSTEP table: `3` divides the step three ways, and `a` sounds all three. The
    // `mode` beside it is p.98's footnote — SUBSTEP exists only under TRIG.
    articulation: [
      art('offbeat', { velocity: 88 }, 'tr-rec'),
      art('ghost', { velocity: 46, mode: 'TRIG', substep: '3a' }, 'tr-rec'),
    ],
  },
  {
    id: 'sp-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'pad',
    title: 'Open hat let ring to its own end',
    verified: false,
    sourceAudio: { need: 'An open hat one-shot with a real tail to hold open' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(100),
      release(30),
      volume(104),
      shuffle(),
    ],
    // No `hold-step`, because it is not free: p.98's MODE table says that under HOLD STEP the
    // sample's GATE parameter *"is automatically set to 'ON'"*, and ON is the state where a
    // sample sounds only while it is held (p.30). One-shot is the third state of that same button
    // (p.31), so asking for a held step here would take the pad out of the state this recipe is
    // built on. An open hat ringing to its own end is what one-shot is for.
    articulation: [art('offbeat', { velocity: 106 }, 'tr-rec')],
  },
  {
    id: 'sp-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'pad',
    title: 'Quiet percussion sitting back in the room',
    verified: false,
    sourceAudio: { need: 'A shaker, tick or brushed one-shot under 100 ms' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('BUS 2'),
      ...busTwo(),
      attack(0),
      hold(50),
      release(6),
      volume(64),
      shuffle(),
    ],
    articulation: [art('ghost', { velocity: 42 }, 'tr-rec')],
  },
  {
    id: 'sp-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'pad',
    title: 'Struck metal, driven and rolled off',
    verified: false,
    sourceAudio: { need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('BUS 1'),
      ...busOne(),
      attack(0),
      hold(66),
      release(24),
      volume(96),
      shuffle(),
    ],
    articulation: [art('offbeat', { velocity: 98 }, 'tr-rec')],
  },
  {
    id: 'sp-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'pad',
    title: 'Tom pitched down a fourth, room behind it',
    verified: false,
    sourceAudio: { need: 'A single tom one-shot with the skin ringing, not gated' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('BUS 2'),
      ...busTwo(),
      vinyl('No'),
      pitch(-5),
      attack(0),
      hold(100),
      release(20),
      volume(110),
      shuffle(),
    ],
    // p.98's per-step PITCH is what turns one tom sample into a fill down the kit. `accent`
    // rather than `last-hit`: #108's reachability check found `last-hit` dead for `tom` —
    // no direction in the library emits it for this role, and the four that are reachable are
    // `downbeat`, `offbeat`, `accent` and `fill`.
    articulation: [
      art('fill', { velocity: 112, 'pitch-mode': 'CHROMATIC', pitch: -2 }, 'tr-rec'),
      art('accent', { velocity: 122 }, 'tr-rec'),
    ],
  },
  {
    id: 'sp-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'pad',
    title: 'Vocal cut at its transients and spread across the pads',
    verified: false,
    sourceAudio: {
      need: 'One or two bars of vocal with syllables that start clearly — AUTO MARK finds attacks, not meaning',
      prep: {
        text: 'Mark it, then split it: hold [SHIFT] and press [START/END], use AUTO MARK on TRANSIENT, then CHOP assigns each piece to its own pad',
        verified: cite(76),
      },
      hint: 'auto-mark',
    },
    params: [
      // One condition, then its value — see `AUTO_MARK_PARAMETERS`. `LEVEL` and `TIME DIVISION`
      // are the two this recipe does not choose, and their values are not authored because the
      // screen does not hold them.
      pick('AUTO MARK · PARAMETER', 'TRANSIENT', AUTO_MARK_PARAMETERS, 74, { hint: 'auto-mark' }),
      pick('AUTO MARK · TRANSIENT', 'MID', TRANSIENTS, 74, { hint: 'auto-mark' }),
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      attack(0),
      hold(100),
      release(8),
      volume(104),
      shuffle(),
    ],
    articulation: [art('accent', { velocity: 118 }, 'tr-rec')],
  },
  {
    id: 'sp-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'pad',
    title: 'Loop stretched to the pattern tempo and left running',
    verified: false,
    sourceAudio: {
      need: 'A sustained tonal loop of a whole number of bars, two seconds or longer — BPM SYNC needs the sample’s own tempo to be right first',
      prep: {
        text: 'Set the sample’s tempo before you sync it: [PITCH/SPEED], then BPM SET to AUTO to detect it or MANU to type it in',
        verified: cite(131),
      },
      hint: 'pitch-speed',
    },
    params: [
      gateMode('OFF'),
      loop('ON', 'Button lit — pressing the pad starts it, pressing again stops it (p.32)'),
      loopDir('Forwards'),
      bus('BUS 2'),
      ...busTwo(),
      bpmSync('ON', 'On, so the loop follows the pattern tempo rather than SPEED'),
      attack(24),
      hold(100),
      release(28),
      volume(88),
      shuffle(),
    ],
    // With GATE off, a looped sample is a toggle rather than a note — p.32: *"the loop switches
    // between playback and stopping with each press of the pad"* — so one step starts it and it
    // runs until something stops it. `HOLD STEP` would set GATE to ON (p.98) and turn a bed that
    // plays through the section into one that sounds only while a step is held, which is the
    // opposite of a texture. The `pad` recipe below is the same two controls wanting the other
    // answer, which is why they are two parameters here and not one.
    articulation: [art('downbeat', { velocity: 96 }, 'tr-rec')],
  },
  {
    id: 'sp-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'pad',
    title: 'Chord stab from a sample that already holds the chord',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * §12.4. A pad plays one sample (p.16) and CHROMATIC's polyphonic mode costs the whole bank
     * (p.38, and the module note), so a three-note stab is not reachable as three notes here. The
     * way out is a sample that is already the chord, transposed per step: TR-REC's `PITCH` is
     * -12-+12 on every step and `PITCH MODE CHROMATIC` lets each step differ (p.98).
     */
    sourceAudio: {
      need: 'Chord sample(s) — one per chord shape the hook plays; see Hook for which, and for the semitones on each step',
    },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      vinyl('No'),
      pitch(0),
      attack(0),
      hold(64),
      release(10),
      volume(112),
      shuffle(),
    ],
    articulation: [art('accent', { velocity: 120 }, 'tr-rec')],
  },
  {
    id: 'sp-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'pad',
    title: 'Rendered chord looped under a held step',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * §12.4's sustaining half, and **the one recipe here that needs both controls at once.**
     *
     * `GATE MODE ON` is what makes the sequencer's held step a length: the sample sounds while
     * the pad is held (p.30) and TR-REC's `HOLD STEP` is what holds it, *"the same results as
     * using a tie"* (p.98). p.98 would set this state itself — under HOLD STEP the GATE parameter
     * *"is automatically set to 'ON'"* — and it is authored anyway, because a reader looking at a
     * lit [GATE] button should find it in the guide rather than deduce it.
     *
     * `LOOP ON` is the half a single exclusive playback mode could not say, and it is what makes
     * the part work on a real sample: eight steps at 132 BPM is about 1.8 seconds, and a chord
     * recording shorter than that would simply stop halfway through the held note. Looped, it
     * fills whatever the step is held for (p.32), and the loop is inaudible under a sustained
     * chord. The two are independent buttons, so nothing here has to be given up for the other.
     */
    sourceAudio: {
      need:
        'Sustained chord sample(s) — one per chord shape the hook plays; see Hook. Length is not ' +
        'critical, because the loop fills the held step, but the loop point has to be clean',
    },
    params: [
      gateMode('ON'),
      loop('ON'),
      loopDir('Forwards'),
      bus('BUS 2'),
      ...busTwo(),
      vinyl('No'),
      pitch(0),
      attack(46),
      hold(100),
      release(40),
      volume(84),
      shuffle(),
    ],
    articulation: [art('downbeat', { mode: 'HOLD STEP', 'hold-step': 8 }, 'tr-rec')],
  },
  {
    id: 'sp-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'pad',
    title: 'Sample played backwards into the change',
    verified: false,
    sourceAudio: {
      need: 'A sample with a long decaying tail — reversed, that tail becomes the rise, so the tail is the part that matters',
    },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      reverse(),
      bus('BUS 2'),
      ...busTwo(),
      attack(0),
      hold(100),
      release(0),
      volume(100),
      shuffle(),
    ],
    articulation: [art('last-hit', { velocity: 127 }, 'tr-rec')],
  },
  {
    id: 'sp-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'pad',
    title: 'One-shot slam on the change, nothing in its way',
    verified: false,
    sourceAudio: { need: 'A one-shot with a big front — a crash, a gated slam, a reversed hit' },
    params: [
      gateMode('ONE-SHOT'),
      loop('OFF'),
      bus('DRY'),
      bpmSync('OFF', 'Off, so SPEED below can be set at all'),
      speed(92),
      attack(0),
      hold(100),
      release(36),
      volume(122),
      fixedVel('Fix'),
      shuffle(),
    ],
    articulation: [art('first-hit', { velocity: 127 }, 'tr-rec')],
  },
]

export const device: Device = {
  id: 'roland-sp-404mk2',
  name: 'SP-404MK2',
  maker: 'Roland',
  kind: 'sampler',

  /**
   * **Clock is asymmetric on this box, and the manual is the one drawing the distinction.**
   *
   * Receiving names both wires. p.197, `MIDI Sync`: *"Auto — The tempo automatically synchronizes
   * to the MIDI clocks if MIDI clocks are input via the MIDI IN connector or the USB port"*, with
   * `MIDI` and `USB` as the two explicit settings beside it.
   *
   * Sending names one. p.197, `MIDI Sync Out`: *"When this is ON, clocks, start and stop are
   * transmitted to the device connected to this unit's **MIDI OUT connector**"*. No page in 274
   * says clock leaves over USB — `USB-MIDI Thru` (p.198) passes *incoming* messages between the
   * two ports and is not this unit's own clock. So `sendTransport` is `midi-din` alone.
   *
   * That is the Mother-32's shape (#148/#149) on a very different box, and it matters for the
   * same reason: §7.4 ranks transports when it picks a clock source, and an undirected list would
   * let a rig be told to sync to this unit over a wire its clock does not use.
   *
   * The MIDI implementation chart (p.269) adds the condition that the field cannot carry: clock
   * out is *"Output when MIDI Sync Out is 'ON' **and when there is no tempo input from an
   * external device**"*. The box stops driving the moment something drives it — which is in
   * `sourceSetup`'s note, where a reader setting it up will see it.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
    sendTransport: ['midi-din'],
    receiveTransport: ['midi-din', 'usb'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'UTILITY > SYSTEM > MIDI > MIDI Sync Out',
        value: 'ON',
        note: 'Clock leaves the MIDI OUT jack only, and only while nothing is clocking this unit (p.269)',
      },
    ],
  },

  /**
   * Stereo LINE OUT on a pair of 1/4-inch TRS jacks, a stereo LINE IN pair and a front INPUT jack
   * for a mic or a guitar, and USB-C carrying audio as well as MIDI (p.14, p.13, p.266).
   * `individualOuts: 0` — one output pair and no separations; PHONES is a monitor of the same mix.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §3.3. The rear jacks a rig is patched with (p.14) and the front input (p.13). MIDI is a pair
   * of 3.5mm stereo-mini jacks rather than 5-pin DIN, which is on both jacks' notes because a
   * reader arriving with a standard MIDI cable finds nothing to plug it into.
   *
   * The `midi-din` transport is still what these carry: it names the wire protocol, not the
   * connector, and Roland's own answer is an adapter cable to a 5-pin socket. Which TRS polarity
   * the BMIDI-5-35 is, this manual never says.
   */
  jacks: [
    {
      id: 'MIDI OUT',
      direction: 'out',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      note: '3.5mm stereo-mini, not 5-pin — Roland’s TRS/MIDI cable is the BMIDI-5-35 (p.14)',
    },
    {
      id: 'MIDI IN',
      direction: 'in',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      note: '3.5mm stereo-mini, not 5-pin — Roland’s TRS/MIDI cable is the BMIDI-5-35 (p.14)',
    },
    { id: 'LINE OUT · L/MONO', direction: 'out', signal: ['audio'], note: 'Use this one alone for mono out' },
    { id: 'LINE OUT · R', direction: 'out', signal: ['audio'] },
    { id: 'LINE IN · L/MONO', direction: 'in', signal: ['audio'], note: 'Use this one alone for mono in' },
    { id: 'LINE IN · R', direction: 'in', signal: ['audio'] },
    {
      id: 'INPUT',
      direction: 'in',
      signal: ['audio'],
      note: 'Front panel, one jack for both — set the MIC/GUITAR switch to match what is plugged in (p.13)',
    },
  ],

  /**
   * §2.6/#111. **The box arrives with samples on it and no document lists one.** p.26 opens the
   * SAMPLE MODE chapter with *"There are many preset samples available on this unit by factory
   * default"*, p.266's internal storage line footnotes *"Include preload data"*, and p.192's
   * FACTORY RESET restores *"the samples and patterns … to the factory default data"*.
   *
   * That is `shipped-library` rather than `enumerable`: the content and where it lives are
   * established, the names are not, so every recipe above still describes its audio in
   * `sourceAudio.need` instead of naming a file. `reason` is that limit said to a reader.
   */
  content: {
    kind: 'shipped-library',
    library: 'preset samples',
    location: 'the pads themselves — p.26 says the unit powers up in sample mode with the pads lit orange, playing them',
    reason: 'p.26 says they are there and no page in the manual lists or counts one of them',
  },

  /**
   * §2.6/#142. p.98's TR-REC `MODE`: under `HOLD STEP`, *"The steps play back joined at the length
   * specified by the [CTRL 1] knob. Joining two steps gives the same results as using a tie"*, and
   * `HOLD STEP` itself is `1–32, LAST`.
   *
   * `per-note-value` rather than `tied-steps`: the control takes a *count of steps* on the step
   * being entered, not a tie flag on the step after it. The other TR-REC mode, `TRIG`, is a
   * trigger with no length at all — a box with both is described by the one that carries a value,
   * because that is the field a reader fills in.
   */
  noteDuration: { kind: 'per-note-value', control: 'HOLD STEP', unit: 'steps' },

  capabilityEvidence: {
    'clock.canSendClock': cite(197),
    'clock.canReceiveClock': cite(197),
    'clock.transport': cite(197),
    /**
     * #80/§7.4. Read, and the document does not say. p.5's one-sentence definition is *"The
     * SP-404MK2 lets you do everything from audio sampling to editing, creating your own songs
     * and performing… all in one unit"* — four jobs, none of them driving a rig. Nothing in the
     * MIDI chapter frames the box as a transport for other gear, and p.269's clock-out note
     * points the other way if anything: the unit stops sending clock the moment an external
     * tempo arrives.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.5 defines the box as sampling, editing, songwriting and performing “all in one unit” and no page gives it a role driving other gear; p.269 has its clock output yield as soon as an external tempo arrives',
    },
    'io.main': cite(266),
    'io.individualOuts': cite(266),
    'io.audioIn': cite(266),
    'io.usbAudio': cite(266),
    voices: cite(266),
    'features.perStep': { kind: 'manual', source: `${MANUAL}, p.98, p.99, p.101` },
    content: cite(26),
    noteDuration: cite(98),

    [jackFact('MIDI OUT')]: cite(14),
    [jackFact('MIDI IN')]: cite(14),
    [jackFact('LINE OUT · L/MONO')]: cite(14),
    [jackFact('LINE OUT · R')]: cite(14),
    [jackFact('LINE IN · L/MONO')]: cite(14),
    [jackFact('LINE IN · R')]: cite(14),
    [jackFact('INPUT')]: cite(13),
    [clockSourceSetupFact('midi-din')]: cite(197),
  },

  /**
   * p.266: `External dimensions 178 (W) x 276 (D) x 71 (H) mm`. **This box is portrait**, like the
   * Tracker Mini and unlike everything else in the library — 178 across is the span, and the 276
   * Roland calls depth is what `panelRiseMm` carries. `panel.ts` checks that pair against the
   * drawn aspect before either is believed.
   */
  physical: { panelSpanMm: 178, verified: cite(266) },

  panel: SP_404MK2_PANEL,

  manual: { title: 'SP-404MK2 Reference Manual', edition: 'v4.00' },

  productPage: 'https://www.roland.com/global/products/sp-404mk2/',

  /**
   * §2.2. One pool of sixteen — `Pads 16 pads + 1 sub pad` (p.266) — carrying every role, because
   * a pad is whatever sample is loaded into it. That is the Digitakt II's and the Tracker Mini's
   * argument on a third sampler.
   *
   * The sub pad is deliberately not a seventeenth: p.11 gives it as a function key (tap tempo,
   * retrigger, skip-back — `Sub Pad Mode`, p.195), not a sample slot.
   *
   * `polyphony: 1` — see the module note for why the 32-voice figure does not settle it and
   * CHROMATIC's `POLY` mode cannot be modelled.
   */
  voices: [
    {
      kind: 'pool',
      id: 'pad',
      label: 'Pad',
      count: 16,
      roles: [
        'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
        'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
        'vox-chop', 'riser', 'impact', 'sweep',
      ],
      polyphony: 1,
    },
  ],

  /**
   * Twelve of sixteen, and a judgement like every `comfortableVoices` in this library — no page
   * states a crowding threshold.
   *
   * The reason is that this box spends pads on itself. Resampling writes to a pad (p.62), BOUNCE
   * writes a whole pattern to one (p.106), CHOP scatters a sample across several (p.76), and
   * skip-back sampling lands on one whenever something worth keeping goes past (p.64). p.41 is
   * the manual saying so outright: SAMPLE MERGE exists partly to *"make more empty pads, if there
   * are no more pads available for assigning samples"*. A bank filled to sixteen by the guide has
   * taken away the working room the box is played with.
   */
  comfortableVoices: 12,

  features: { perStep: [...PER_STEP] },

  hints: {
    gate: 'Press [GATE]',
    'one-shot': 'Hold [VALUE], press [GATE]',
    loop: 'Press [LOOP]',
    'loop-reverse': 'Press [LOOP], then [REVERSE]',
    'ping-pong': 'Hold [SHIFT], press [LOOP]',
    reverse: 'Press [REVERSE]',
    envelope: 'Hold [SHIFT], press [PITCH/SPEED]',
    'pitch-speed': 'Press [PITCH/SPEED]',
    'vinyl-mode': 'Hold [SHIFT], turn [VALUE]',
    'bus-send': 'Hold [REMAIN], press the pad',
    'bus-assign': 'Press [BUS FX], then an effect button',
    'mfx-select': 'Hold [MFX], turn [VALUE]',
    'record-setting': 'Press [REC], then [RECORD SETTING]',
    'tr-rec': 'Hold [SUB PAD], press a pad',
    'sound-gen': 'Hold [SHIFT], press [RECORD SETTING]',
    'auto-mark': 'Hold [SHIFT], press [START/END]',
  },

  recipes,
}
