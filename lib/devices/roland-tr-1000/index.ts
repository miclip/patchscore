import type { Device } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import { TR_1000_PANEL } from './panel'

/**
 * Roland TR-1000 (§2.3). Ten instrument tracks, four of them layer tracks.
 *
 * **Every point value here is provisional; every bound around it is cited.** Two documents do
 * the work. The owner's manual (TR-1000_eng02_W.pdf) documents the *panel* — which knob does
 * what, which screen a parameter lives on, which gesture enters a step — and defers parameter
 * values to the Reference Manual ("For details on the parameter's value, refer to the
 * 'Reference Manual' (Roland website)", p.17). The Reference Manual
 * (TR-1000_reference_eng02_W.pdf) carries the Parameter list, which states the bounds. So:
 *
 *  - the capability data below (tracks, jacks, clock, per-step features, gestures) is read
 *    off the owner's manual and is the reason this file can be written at all. Those page
 *    references stay in comments: invariant 4 is scoped to parameter values, and a wrong
 *    `individualOuts` is visible to anyone holding the box in a way a wrong DECAY is not;
 *  - every recipe carries `verified: false`, and so does every numeric *point*, because a
 *    documented range for TUNE is not a citation for "TUNE sits at 44 for a hard kick".
 *    Citing the page for a taste judgement would be exactly the fraud invariant 4 prevents.
 *
 * `GEN` used to be the exception: its citation sat on the param, on the argument that a
 * generator *name* is checkable where a knob position is not. The name is indeed checkable —
 * `909 Bass Drum` either exists in the Preset GEN/INST List under BD_E or it does not — but
 * `verified` on a param is a claim about the *selected value*, and which generator suits a hard
 * kick is taste. The citation now sits on the option set, which is what it was always about, and
 * every `GEN` point is provisional like every other point here. See `EnumOptions` in
 * `lib/core/params.ts` and the `gen()` helper below.
 *
 * Points stay explicitly `false` at every site rather than inheriting the recipe's citation.
 * The redundancy is the point: nothing is promoted to `authored` until a human writes the
 * citation on that exact claim. Inheritance would flip 84 values at once, and legality is its
 * own claim (§3.1) - which is why the *ranges* and *option sets* are cited and the points inside
 * them are not.
 *
 * **Every parameter here is one the Reference Manual's Parameter list exposes for that
 * generator**, with the manual's own bounds and units, cited to the page carrying its table.
 * The old `% travel` knob positions are gone: they were panel estimates dressed as values, and
 * a range nobody documented is a range mood must not move (§3.2). Generators differ in what
 * they expose, so recipes differ in which parameters they set - `808 Snare Drum` has no DECAY
 * and `909 Bass Drum` calls its tuning PITCH, with TUNE meaning the pitch envelope instead.
 * No recipe *selects* a generator whose table is "Global parameters only" — `808 Rim Shot`,
 * `909 Rim Shot` and `808 Closed HiHat` expose nothing but PHASE and DELAY, and a recipe with
 * nothing to set is not a recipe. They are still *offered* in the option arrays, along with
 * several 707/727 and CR78 entries that reach only their Common block: the options are what
 * the list documents for the role, and narrowing them to what happens to be authored today
 * would hide the rest of the box from anyone reading the guide.
 */

/**
 * Ranges, exactly as the Reference Manual's Value column prints them (§3.1). These are the
 * *bounds*, and they are the cited claim; the point value inside them is taste and stays
 * `verified: false`.
 */
const PCT = { min: 0, max: 100 } //        0.0%-100.0%
const BIPOLAR = { min: -100, max: 100 } // -100.0%-0.0%-100.0%
const SEMITONES = { min: -12, max: 12 } // -12St-0-12St
const SEMITONES_24 = { min: -24, max: 24 } // -24St-24St

/**
 * A range citation. The page is the Parameter list page carrying the table for that generator:
 * p.59 ANALOG, p.60-62 ACB, p.63 FM. `Global`, `606 Common`, `CR78 Common` and `707/727 Common`
 * are their own blocks on those pages, and a generator gets its common block *plus* its own.
 */
function cite(page: number): Cite {
  return { kind: 'manual', source: `TR-1000 Reference Manual (eng02) v1.13+, p.${page}` }
}

/**
 * One GEN parameter. `unit` is the manual's own ('%' or 'St'), never "% travel" - these are
 * screen values with printed bounds, not knob positions estimated off the panel.
 *
 * No `step`: the tables print `0.0%` and `-12St`, which implies a resolution but never states
 * one, and inferring 0.1 from a decimal point would be an invented claim (invariant 5).
 */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  unit: string,
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: cite(page) },
    unit,
    verified: false,
    ...extra,
  }
}

/**
 * The two per-instrument sends, on every recipe.
 *
 * **The page is 71, not 54.** p.54 prints `RVB SEND` and `DLY SEND` with the same explanations
 * and it is the wrong table: that block is `KIT` → `EXT IN`, the sends for audio arriving at the
 * EXTERNAL IN jacks. The per-instrument sends are the `MIXER` block on p.71, which is the track's
 * own mixer stage — `MIXER : RVB SEND` and `MIXER : DLY SEND` in the audio diagram (p.33). Two
 * tables printing one parameter name is exactly the trap §3.1 exists for, and the citation has to
 * be the page that documents *this* parameter.
 *
 * p.71's Value column prints `0%-100%`, without the decimal the GEN pages print on `0.0%-100.0%`.
 * The bounds are the same two numbers and `PCT` carries them; no `step` is authored here for the
 * same reason it is authored nowhere else on this box (see `num`).
 *
 * A send is on **every** recipe including the ones that send nothing, because zero is an
 * instruction here rather than an omission: the sends are kit state, edited in place (p.34) and
 * saved deliberately (p.50), so a recipe silent about them inherits whatever the last kit left
 * there. "Set it to 0" is a thing a reader does.
 *
 * `space` is declared only where the part is one a reverb belongs on. A kick or a sub in the
 * reverb is mud at any setting, so those sends are flat *and* inert — §6.1's model is that a
 * device declines an axis by having no parameter that declares it, which is a per-parameter
 * decision, not a per-device one.
 *
 * Where `space` *is* declared, its amount never exceeds the point it moves. §6.1's offset is
 * bipolar around a centred axis, so an amount larger than the point hits the bottom of the
 * range before the knob does, and the last of the travel stops changing anything. Keeping
 * amount <= point means the whole sweep of `space` moves the send. It does **not** mean every
 * send reaches zero at the bottom — the crash still sends 16 to the reverb there — and it
 * should not: how dry the driest setting is remains a per-part decision, and a crash with no
 * reverb at all is a different sound rather than a drier one.
 */
function send(
  which: 'RVB' | 'DLY',
  value: number,
  space?: number,
): AuthoredNumericParam {
  return num(`${which} SEND`, value, PCT, '%', 71, {
    hint: which === 'RVB' ? 'reverb-send' : 'delay-send',
    ...(space === undefined ? {} : { mood: [{ axis: 'space', amount: space }] }),
  })
}

/**
 * §6.1. The swing axis, and the reason #62 turned out to be an authoring gap rather than a hole
 * in the model.
 *
 * The issue argued that no parameter could carry a `swing` offset, because swing is a timing
 * transform and mood moves parameter values. **A SHUFFLE knob is a parameter whose value means
 * timing.** Roland already did that abstraction; the model did not need to. So this is an
 * ordinary cited numeric declaring a mood axis, exactly as `TUNE` declares `darkness`, and the
 * engine learns nothing new.
 *
 * **Which of the three shuffle controls this is, because they are not interchangeable:**
 *
 *  - **Master Shuffle** — TEMPO screen, [C1] knob, `-100–+100` (p.18). Global to the box, and
 *    not saved with the pattern.
 *  - **Track SHUFFLE** — TRACK SETTING screen, [C6/VALUE] knob, `-100–+100` (p.19). Per track,
 *    and the page says it plainly: *"For all tracks, this parameter is scaled by Master
 *    Shuffle found in TEMPO"*. **A guide that told you to set this could be telling you to set
 *    something inert**, because the scaler it depends on lives on a screen we never mentioned.
 *    That is why it is not the one authored here, tempting though a genuinely per-track control
 *    is when a recipe is per track.
 *  - **Pattern Shuffle** — PTN SETTING screen (p.26), `-100–+100`, *"Adjusts the timing of every
 *    other step to create a swinging rhythm."* Nothing scales it, and it is saved with the
 *    pattern, which is the thing a guide is helping somebody build. This one.
 *
 * The `note` carries the scope, because the value is on every recipe and the reader should not
 * conclude it is per voice: it is one setting for the whole pattern, and seeing it under the
 * kick and the hat is the same number twice, not two.
 *
 * **This note claims no neutral, unlike the other two boxes', because p.26 states none.** The
 * Tracker Mini prints "50% is no swing" and the Deluge prints "50 = Off"; the PTN SETTING table
 * prints a range and a sentence and stops. `0` is the obvious neutral for a symmetric timing
 * offset, and it is still only our reading, so it is not stated in the reader's voice. p.19's
 * "SHUFFLE=0" diagram is not borrowable for it: that is the *track* control, a different
 * parameter on a different screen, and the whole reason this one was chosen over it.
 *
 * `amount` is 100, which is exactly the distance from the point to each bound — the same rule
 * `send` follows for `space`. The full sweep of the knob moves the value and no part of the
 * travel is spent against a clamp.
 */
function shuffle(): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name: 'SHUFFLE',
    value: 0,
    range: { min: -100, max: 100, verified: cite(26) },
    mood: [{ axis: 'swing', amount: 100 }],
    hint: 'ptn-shuffle',
    note: 'Pattern-wide: one setting for every track, saved with the pattern',
    scope: 'pattern',
    verified: false,
  }
}

/**
 * §0's reader, and #58: *"a tempo-synced LFO on a filter cutoff"* is the thing they are stuck on,
 * and every part of it is an ordinary parameter with a printed range. **No engine change, no
 * schema change** — which is the whole finding of that issue.
 *
 * **The parameter list prints two MOD tables, and they differ.** This is the p.54-vs-p.71 trap
 * `send` documents, in a second place:
 *
 *     p.56, above SIDE CHAIN            p.71, beside MIXER  <- the one cited here
 *     ----------------------            ---------------------------------------
 *     WAVE   SINE, TRI, SAW, SQR, S&H   WAVE   SINE, TRI, SAW, SQR, S&H
 *     TIME   10.0s-100ms                TIME   10.0s-100ms
 *     STEP   64.00Stp-0.25Stp           STEP   64.00Stp-0.25Stp
 *     NOTE   1/1-1/32                   NOTE   1/1-1/32
 *     PHASE  0deg-359deg                PHASE  0-359deg
 *     SYNC   TIME, STEP, NOTE           DEST   1-3
 *     TARGET -                          TARGET -
 *     AMOUNT -100.0%-0.0%-+100.0%       AMOUNT -100.0%-0.0%-100.0%
 *
 * p.56 has a `SYNC` selector and no `DEST`; p.71 has `DEST` and no `SYNC`. Whether that is one
 * block listed twice with a row missing from each, or two different modulation blocks, the
 * manual never says — and nothing here guesses.
 *
 * **p.71 is the table this recipe cites, because p.39 says so.** The instrument-edit procedure
 * — track select, then SHIFT + [FILTER] for the MODULATION screen — ends with *"For details on
 * the parameters, refer to 'MOD' (p. 71)"*. So the recipe authors what p.71 lists and does not
 * import p.56's `SYNC`: a control taken from a table this screen is not directed to would be a
 * claim about a screen nobody checked.
 *
 * **The p.71 table has no `SYNC` row, so tempo sync is expressed by `NOTE`.** Its three rate
 * rows share one Explanation cell — TIME free running, STEP counting sequencer steps, NOTE
 * locked to the clock — and setting `NOTE` alone is unambiguous under either reading. Where
 * p.56's selector does turn up on the screen in front of the reader, the `note` tells them to
 * point it at NOTE, which costs nothing and closes the one gap the ambiguity could open.
 *
 * **`NOTE` is a `text` param, not an enum.** The Value column prints the span `1/1-1/32` and
 * never the divisions inside it — whether the box offers dotted or triplet values is not on the
 * page — so an `options` list would be an invented legality claim (§3.2). `1/1` is one of the
 * two endpoints the table actually prints, which is why it is the division chosen: nothing here
 * rests on a reading of what lies between them. One cycle per bar also happens to be the
 * musical answer for a backbeat clap — successive hits land at different points of the sweep, so
 * the part moves across bars rather than wobbling within one.
 *
 * **`TARGET` is a `text` param because the manual's Value column is literally `-`.** It names no
 * legal set at all, so there is nothing to cite and nothing to pick from; what the recipe can
 * honestly say is which parameter it means, and `FILTER` is one this recipe already sets.
 *
 * Names are prefixed `MOD` where the table prints them bare. A flat `AMOUNT` beside `CLAPS` and
 * `SPEED` would be unreadable at the machine, and the same reasoning already gave `RVB SEND` its
 * prefix. The screen itself is reached by SHIFT + [FILTER] (p.39), which is the hint.
 */
function mod(target: string, amount: number, wave: string, note: string): AuthoredParam[] {
  return [
    {
      kind: 'enum',
      name: 'MOD WAVE',
      value: wave,
      options: { values: ['SINE', 'TRI', 'SAW', 'SQR', 'S&H'], verified: cite(71) },
      verified: false,
      hint: 'mod-screen',
    },
    // The tempo-synced rate. See above for why this is text and why the division is an endpoint.
    {
      kind: 'text',
      name: 'MOD NOTE',
      value: note,
      verified: false,
      note: 'Tempo-synced rate; if the screen offers a SYNC selector, point it at NOTE',
    },
    // Built inline rather than through `num`, which takes a unit: the table prints none for
    // DEST, and an empty string is not "no unit", it is a schema error waiting to happen.
    {
      kind: 'numeric',
      name: 'MOD DEST',
      value: 1,
      range: { min: 1, max: 3, verified: cite(71) },
      verified: false,
      note: 'Which of the three assignment slots this uses',
    },
    { kind: 'text', name: 'MOD TARGET', value: target, verified: false },
    num('MOD AMOUNT', amount, BIPOLAR, '%', 71),
  ]
}

/**
 * Generators, by name, from the Preset GEN/INST List.
 *
 * `GEN` used to hold one of `Analog / ACB / FM / PCM / Sample`. Those five are real — both
 * manuals name them on p.14 — but they are *folders*, and SELECT GEN is three knobs, not one:
 * [C4] picks the category, [C5] the folder, [C6/VALUE] the generator (Reference Manual p.37).
 * Naming only the folder never gets anyone to a sound, which fails the point of the guide.
 * So `GEN` now holds what the [C6] knob lands on, and the options are drawn from the list's own
 * Category column for the role.
 *
 * Each option below is a verbatim Name from GEN list p.1, and its category is the one the list
 * prints beside it. p.1 carries the whole classic set (808/909/8X/9X/707/727/606/CR78 and the
 * FM models), so one page covers every role this device has a recipe for and the citation is
 * one page rather than a scatter.
 *
 * The option sets are a curated subset, not the whole category — p.1 lists these, and the list
 * runs to 25 pages of them. The citation claims exactly that each named generator appears on
 * p.1 under that category. It claims nothing about the choice, which is taste.
 */
const GEN_CITE = {
  kind: 'manual',
  source: 'TR-1000 Preset GEN/INST List (eng02) v1.20, GEN list p.1',
} as const

const BD_GENS = [
  '808 Bass Drum',
  '909 Bass Drum',
  '8X Bass Drum',
  '9X Bass Drum',
  '707 Bass 1-2',
  '606 Bass Drum',
  'CR78 Bass Drum',
  'FM Kick Model1',
  'FM Kick Model2',
]

const SD_GENS = [
  '808 Snare Drum',
  '909 Snare Drum',
  '8X Snare Drum',
  '9X Snare Drum',
  '707 Snare 1-2',
  '606 Snare Drum',
  'CR78 Snare Drum',
  'FM Snare Model',
]

const TOM_GENS = [
  '808 Low Tom',
  '808 High Tom',
  '909 Low Tom',
  '909 High Tom',
  '8X Tom',
  '9X Tom',
  '707 Tom',
  '606 Tom',
  'FM Tom Model',
]

const STICK_GENS = ['808 Rim Shot', '909 Rim Shot', '8X Rim Shot', '9X Rim Shot', 'CR78 Rim Shot-CL']

const CLAP_GENS = [
  '808 Hand Clap',
  '909 Hand Clap',
  '8X Hand Clap',
  '9X Hand Clap',
  '707 Clap-Tamb',
  'FM Clap Model',
]

/**
 * HIHAT_E splits by name, not by a column: the list gives Closed and Open as separate
 * generators, so a closed-hat recipe must not be offered the open ones. `CR78 HiHat` is the one
 * HIHAT_E entry on p.1 with no Closed/Open pair, and it sits with the closed set because that is
 * what a CR-78 hat is.
 */
const CLOSED_HAT_GENS = [
  '808 Closed HiHat',
  '8X Closed HiHat',
  '9X Closed HiHat',
  '707 Closed HiHat',
  '606 Closed HiHat',
  'CR78 HiHat',
]

const OPEN_HAT_GENS = [
  '808 Open HiHat',
  '8X Open HiHat',
  '9X Open HiHat',
  '707 Open HiHat',
  '606 Open HiHat',
]

const CRASH_GENS = [
  '808 Cymbal',
  '8X Crash Cymbal',
  '9X Crash Cymbal',
  '707 Crash Cymbal',
  '606 Crash Cymbal',
  'CR78 Cymbal',
  'FM Cymbal Model',
]

const RIDE_GENS = ['9X Ride Cymbal', '707 Ride Cymbal', 'CR78 Metallic']

/**
 * BD-HT sound layers A and B together, so those tracks have two GEN slots and the recipe's
 * `MIX` balances them. What is authored here is layer A; layer B is not authored at all rather
 * than guessed (invariant 5).
 */
function gen(value: string, options: string[]): AuthoredEnumParam {
  return {
    kind: 'enum',
    name: 'GEN',
    value,
    // The list is the legality claim and is cited; which generator this recipe reaches for is
    // taste, and stays provisional exactly as a numeric point does (§3.2).
    options: { values: options, verified: GEN_CITE },
    verified: false,
    hint: 'Hold [SHIFT]+[GEN], select with [C6]',
  }
}

export const device: Device = {
  id: 'roland-tr-1000',
  name: 'TR-1000',
  maker: 'Roland',
  kind: 'drum-machine',

  // MIDI IN/OUT1/OUT2-THRU, both OUT connectors switchable to DIN SYNC; USB clock; CLK OUT
  // mini-jack; TRG IN usable as a clock source (p.11-12, p.30, p.33 sync settings).
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'din-sync', 'usb', 'analog-clock', 'trigger'],
  },

  // MIX OUT L/MONO+R, ten INDIVIDUAL OUT/TRIGGER OUT jacks (BD-RC), ANALOG FX OUT L/R,
  // EXTERNAL IN L/R, USB-C audio to a computer (p.11-12).
  io: { main: 'stereo', individualOuts: 10, audioIn: true, usbAudio: true },

  /**
   * §10. 486 mm horizontal span. Reference Manual p.74 gives 486 (W) x 311 (D) x 125 (H) mm.
   *
   * Unlike the Tracker Mini, Roland's stated width *is* the horizontal span here — but that was
   * checked rather than assumed, because the convention demonstrably does not always hold. The
   * Top panel/front panel diagram (Owner's Manual p.9) shows a landscape box with its sixteen
   * step keys running across the bottom, and the drawing's aspect (~1.60) matches 486/311 = 1.56.
   *
   * Read the specifications table on the *rendered* page: `pdftotext` scrambles that table's
   * columns, so the W/D/H order is only trustworthy from the page itself.
   *
   * The widest box in the seed set by a long way, and the rack has to show that.
   */
  physical: {
    panelSpanMm: 486,
    verified: { kind: 'manual', source: 'TR-1000 Reference Manual eng02, p.74 (Main specifications)' },
  },
  /** §10. A simplified original drawing of the panel, read off the manual (see `panel.ts`). */
  panel: TR_1000_PANEL,

  /**
   * ## Why there is no `sampled-chord` pad or stab here (§12.4)
   *
   * The same answer as the TR-8S, reached down a different corridor, and the two together are
   * what make it a fact about this class of box rather than about one manual's omissions.
   *
   * **Sustain passes.** p.64's sample block gives `HLD MODE  WHOLE, TIME, STEP` with *"WHOLE:
   * The entire sample is played without any decrease in volume"*, and the box loads user samples.
   * A chord loaded here will sustain.
   *
   * **Per-step transposition fails.** p.30 lists what motion records into steps — for RIM
   * SHOT–RIDE CYMBAL, the `[TUNE]`, `[DECAY]` and `[CTRL]` knobs — and gives the exact per-step
   * form: hold a step key, then *"use the [C1]–[C6/VALUE] knobs to record the motions of the
   * controllers into the step."* The mechanism is there. What is missing is a semitone parameter
   * at the end of it:
   *
   *  - `TUNE` in the instrument tables (pp.59-62) is *"Adjusts the tuning (pitch)"*, with no
   *    semitone scale printed for it.
   *  - `COARSE` is the semitone control — `-12St–12St`, *"Sets the pitch of the sample in
   *    semitones"* (p.64) — and it lives on the **sample edit screen**, where p.42 puts it on the
   *    `[C4]` knob alongside `SLICE NUM`, `SPEED`, `BPM SYNC` and `STRETCH`. That is an editor,
   *    not one of the performance knobs p.30 records.
   *  - KNOB ASSIGN (p.36) is the bridge that would settle it, and **the manual never says what
   *    can be assigned**. It describes the mechanism — *"assign up to four parameters to a knob,
   *    and set the minimum and maximum values per parameter"* — and prints no target list. Two
   *    things would have to be true for the substitution to work and neither is on the page: that
   *    `COARSE` is assignable at all, and what knob position corresponds to a given semitone.
   *    Assuming the first is inventing a capability; assuming the second is inventing a value.
   *
   * So: holds a chord, cannot move it. `pad` and `stab` stay gaps on a TR-1000-only rig, which is
   * what invariant 5 asks for — the hole is shown rather than filled with a chord that disagrees
   * with the harmony from bar three onward.
   */
  /**
   * The ten tracks, in panel order (p.14). BD-HT are layer tracks and sound generators A and
   * B together; RS-RC are single tracks. Either way one track sounds one note, so polyphony
   * is 1 everywhere (§12.4: polyphony counts notes, never roles).
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'sub', 'bass-mid'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HT', roles: ['tom', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'rs', label: 'RS', roles: ['rim', 'ghost-perc', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'hc', label: 'HC', roles: ['clap', 'snare', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OH', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'cc', label: 'CC', roles: ['impact', 'metallic', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'rc', label: 'RC', roles: ['ride', 'metallic', 'closed-hat'], polyphony: 1 },
  ],

  /**
   * §2.3's five step-parameter keys, which are this device's STEP EDIT screen (p.17): the
   * screen labels them VELOCITY, PROB, SUBSTEP, CYCLE and START, and `probability` and
   * `start-timing` are those two spelled out. `accent`, `weak` and `alt-inst` are three more
   * per-step capabilities the manual documents as their own gestures (p.17-18) rather than as
   * STEP EDIT fields, and the articulation below uses all three.
   *
   * **`lfo` is omitted, and after #58 the reason is a finding rather than an absence.** The MOD
   * block is fully documented — p.71's table, reached by SHIFT + [FILTER] (p.39), and now
   * authored on `tr1000-clap-bright`. What the manual describes is a topology `LfoSpec`'s
   * `{ count, syncable, destinations[] }` cannot state:
   *
   *  - `DEST` is `1-3`, *"Sets the assignment number of the LFO"*. Three **assignment slots**,
   *    not three LFOs — the table says "the LFO" throughout, singular — so `count: 3` would put
   *    a number in a field that means something else.
   *  - `TARGET` *"Selects the parameter to be modulated"*, and its Value column is literally
   *    `-`. **Any parameter.** `destinations: string[]` would have to enumerate every knob on
   *    the box, and the enumeration would be ours rather than the manual's.
   *
   * `syncable` is **not** among the problems, and an earlier draft of this comment wrongly said
   * it was. This LFO demonstrably syncs — `NOTE` is a tempo division on both MOD tables and
   * p.56's carries an explicit `SYNC` selector — so `true` would be answerable and correct. The
   * field is unusable for the two reasons above, not for three.
   *
   * Whether `WAVE` and the rate rows are per assignment or shared across all three, p.71 does
   * not say, and nothing here pretends to know — any more than it guesses which of the two MOD
   * tables in the parameter list (p.56, p.71) governs which screen.
   *
   * The field is left off rather than bent to fit, because nothing reads `features.lfo` — no
   * resolver, no renderer, no validation, no recipe. A more elaborate shape for a field with no
   * consumer is harder to delete than a simple one, and this project has already paid twice for
   * types settled before real data met them (`PatchEntry`, #49; params, the step 1 review). When
   * something needs to read it — rig integration saying what modulation a box has, or checking
   * that a recipe's LFO target is reachable — it can be modelled against three authored devices
   * and a consumer, in one pass instead of two.
   */
  features: {
    perStep: [
      'velocity',
      'probability',
      'substep',
      'cycle',
      'start-timing',
      'accent',
      'weak',
      'alt-inst',
    ],
    sidechain: { internal: true, fromExternalAudio: true },
  },

  /** Gestures, straight off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'accent-step': 'ACCENT [STEP], then step keys',
    'weak-step': 'Hold [SHIFT], press step keys',
    'sub-step': 'Press [SUB], then step keys',
    'alt-inst': 'Hold LAYER [B], press step keys',
    'step-edit': 'Hold step key, turn [C1]-[C5]',
    'layer-ab': 'LAYER [A]/[B] selects the layer',
    'select-gen': 'Hold [SHIFT], press [GEN]',
    'motion-rec': 'MOTION [REC] lit, then move knob',
    'mod-screen': 'Hold [SHIFT], press [FILTER]',
    'ptn-shuffle': 'Hold [SHIFT], press [PTN SELECT]',
    'reverb-send': 'Hold [BD]-[RC], turn REVERB [LEVEL]',
    'delay-send': 'Hold [BD]-[RC], turn DELAY [LEVEL]',
  },

  /**
   * §2.3. Ten tracks exist, but eight occupied at once is what this box carries before it
   * feels over-subscribed — a musical judgement about the device, not a limit the manual
   * states (§12.4 counts an assignable once if it is occupied in any section).
   */
  comfortableVoices: 8,

  manual: { title: 'TR-1000 Owner’s Manual', edition: 'eng02' },

  recipes: [
    // ---- BD -------------------------------------------------------------------------
    {
      id: 'tr1000-kick-hard',
      role: 'kick',
      character: 'hard',
      voice: 'bd',
      title: 'Tight forward kick, fast tail',
      params: [
        gen('909 Bass Drum', BD_GENS),
        num('PITCH', -12, BIPOLAR, '%', 59, { mood: [{ axis: 'darkness', amount: -18 }], hint: 'Tuning; TUNE is the pitch envelope' }),
        num('DECAY', 32, PCT, '%', 59),
        num('TUNE', 30, BIPOLAR, '%', 59, { hint: 'Pitch-envelope intensity, not tuning' }),
        num('ATTACK', 74, PCT, '%', 59),
        send('RVB', 0),
        send('DLY', 0),
        shuffle(),
      ],
      articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
      routing: 'INDIVIDUAL OUT BD — effects are bypassed on that jack',
      verified: false,
    },
    {
      id: 'tr1000-kick-dark',
      role: 'kick',
      character: 'dark',
      voice: 'bd',
      title: 'Low long kick that owns the bottom',
      params: [
        gen('808 Bass Drum', BD_GENS),
        num('TUNE', -45, BIPOLAR, '%', 59, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('TONE', -20, BIPOLAR, '%', 59),
        num('DECAY', 78, PCT, '%', 59, { mood: [{ axis: 'density', amount: -20 }] }),
        send('RVB', 0),
        send('DLY', 0),
        shuffle(),
      ],
      articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-kick-dirty',
      role: 'kick',
      character: 'dirty',
      voice: 'bd',
      title: 'Saturated kick with an audible click',
      params: [
        gen('8X Bass Drum', BD_GENS),
        num('TUNE', -8, BIPOLAR, '%', 60, { mood: [{ axis: 'darkness', amount: -18 }] }),
        num('DECAY', 44, PCT, '%', 60),
        num('ATTACK', 76, PCT, '%', 60, { hint: 'This is the click' }),
        num('EXCITE', 62, PCT, '%', 60, { mood: [{ axis: 'grit', amount: 30 }], hint: 'Odd-harmonic distortion' }),
        num('BODY DEP', 40, PCT, '%', 60),
        send('RVB', 0),
        send('DLY', 0),
        shuffle(),
      ],
      articulation: [
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
        { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
      ],
      verified: false,
    },
    {
      id: 'tr1000-sub-dark',
      role: 'sub',
      character: 'dark',
      voice: 'bd',
      title: 'Kick tuned down into a sustained sub',
      params: [
        gen('9X Bass Drum', BD_GENS),
        num('COARSE', -12, SEMITONES, 'St', 61, { hint: 'An octave down, in semitones' }),
        num('TUNE', -70, BIPOLAR, '%', 61, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('DECAY', 92, PCT, '%', 61, { mood: [{ axis: 'density', amount: -25 }] }),
        num('P. AMOUNT', 12, PCT, '%', 61, { hint: 'Near-flat pitch envelope' }),
        num('DRIVE', 18, PCT, '%', 61),
        send('RVB', 0),
        send('DLY', 0),
        shuffle(),
      ],
      routing: 'INDIVIDUAL OUT BD so the sub stays out of the bus effects',
      verified: false,
    },

    // ---- SD -------------------------------------------------------------------------
    {
      id: 'tr1000-snare-hard',
      role: 'snare',
      character: 'hard',
      voice: 'sd',
      title: 'Cracking snare, short and centred',
      params: [
        gen('909 Snare Drum', SD_GENS),
        num('TUNE', 16, BIPOLAR, '%', 60, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('TONE', 62, PCT, '%', 60),
        num('SNAPPY', 70, PCT, '%', 60),
        send('RVB', 0),
        send('DLY', 0),
        shuffle(),
      ],
      articulation: [
        { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
        { slot: 'ghost', set: { weak: true }, hint: 'weak-step' },
      ],
      routing: 'INDIVIDUAL OUT SD — effects are bypassed on that jack',
      verified: false,
    },
    {
      id: 'tr1000-snare-bright',
      role: 'snare',
      character: 'bright',
      voice: 'sd',
      title: 'Thin high snare that cuts over a busy top',
      params: [
        gen('606 Snare Drum', SD_GENS),
        num('TUNE', 45, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -25 }] }),
        num('DECAY', 30, PCT, '%', 62),
        num('SNAPPY', 55, BIPOLAR, '%', 62),
        send('RVB', 24, 20),
        send('DLY', 12, 12),
        shuffle(),
      ],
      articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-snare-dirty',
      role: 'snare',
      character: 'dirty',
      voice: 'sd',
      title: 'Ragged snare with an FM edge',
      params: [
        gen('FM Snare Model', SD_GENS),
        num('TUNE', 10, BIPOLAR, '%', 63, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('DECAY', 34, PCT, '%', 63),
        num('FM DEPTH', 68, PCT, '%', 63, { mood: [{ axis: 'grit', amount: 25 }] }),
        num('NOISE', 45, PCT, '%', 63),
        num('COARSE', 0, SEMITONES_24, 'St', 63),
        send('RVB', 18, 16),
        send('DLY', 14, 14),
        shuffle(),
      ],
      articulation: [
        { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
        { slot: 'fill', set: { substep: '1/2' }, hint: 'sub-step' },
      ],
      verified: false,
    },

    // ---- LT / HT --------------------------------------------------------------------
    {
      id: 'tr1000-tom-dark',
      role: 'tom',
      character: 'dark',
      voice: 'lt',
      title: 'Low tom with a slow fall',
      params: [
        gen('909 Low Tom', TOM_GENS),
        num('TUNE', -55, BIPOLAR, '%', 60, { mood: [{ axis: 'darkness', amount: -18 }] }),
        num('COLOR', 35, PCT, '%', 60, { hint: 'Ambience, i.e. noise amount' }),
        num('DECAY', 72, PCT, '%', 60, { mood: [{ axis: 'density', amount: -18 }] }),
        send('RVB', 20, 18),
        send('DLY', 8, 8),
        shuffle(),
      ],
      articulation: [{ slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' }],
      verified: false,
    },
    {
      id: 'tr1000-tom-bright',
      role: 'tom',
      character: 'bright',
      voice: 'ht',
      title: 'High tom, tight enough to sit in a fill',
      params: [
        gen('909 High Tom', TOM_GENS),
        num('TUNE', 40, BIPOLAR, '%', 60, { mood: [{ axis: 'darkness', amount: -22 }] }),
        num('COLOR', 25, PCT, '%', 60),
        num('DECAY', 40, PCT, '%', 60, { mood: [{ axis: 'density', amount: -12 }] }),
        send('RVB', 26, 20),
        send('DLY', 10, 10),
        shuffle(),
      ],
      articulation: [{ slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' }],
      verified: false,
    },

    // ---- RS -------------------------------------------------------------------------
    {
      id: 'tr1000-rim-clean',
      role: 'rim',
      character: 'clean',
      voice: 'rs',
      title: 'Dry rim, no tail at all',
      params: [
        gen('8X Rim Shot', STICK_GENS),
        num('TUNE', 20, BIPOLAR, '%', 60, { mood: [{ axis: 'darkness', amount: -18 }] }),
        num('TONE', 30, BIPOLAR, '%', 60),
        num('DECAY', 8, PCT, '%', 60, { hint: 'Floor it; the tail is the enemy' }),
        num('BODY', 25, PCT, '%', 60),
        send('RVB', 8, 8),
        send('DLY', 0),
        shuffle(),
      ],
      verified: false,
    },
    {
      id: 'tr1000-ghost-perc-soft',
      role: 'ghost-perc',
      character: 'soft',
      voice: 'rs',
      title: 'Barely-there rim under the backbeat',
      params: [
        gen('9X Rim Shot', STICK_GENS),
        num('TUNE', -10, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -14 }] }),
        num('DECAY', 12, PCT, '%', 62),
        num('COARSE', -3, SEMITONES, 'St', 62),
        num('FREQ MOD', 20, PCT, '%', 62),
        send('RVB', 22, 20),
        send('DLY', 14, 14),
        shuffle(),
      ],
      articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },

    // ---- HC -------------------------------------------------------------------------
    {
      id: 'tr1000-clap-bright',
      role: 'clap',
      character: 'bright',
      voice: 'hc',
      title: 'Wide clap sitting on top of the snare',
      params: [
        gen('9X Hand Clap', CLAP_GENS),
        num('FILTER', 35, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -30 }], hint: 'Clap brightness' }),
        num('CLAPS', 70, PCT, '%', 62),
        num('SPEED', 55, PCT, '%', 62),
        num('MIX', 20, BIPOLAR, '%', 62, { hint: 'Clap against tail, not layers' }),
        num('TAIL DCY', 62, PCT, '%', 62, { mood: [{ axis: 'density', amount: -18 }] }),
        // #58. A tempo-synced triangle on this recipe's own FILTER: one cycle per bar, so the
        // two backbeat claps in a bar sit at different points of the sweep.
        ...mod('FILTER', 22, 'TRI', '1/1'),
        send('RVB', 30, 22),
        send('DLY', 14, 14),
        shuffle(),
      ],
      articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-clap-soft',
      role: 'clap',
      character: 'soft',
      voice: 'hc',
      title: 'Soft clap layered behind, not in front',
      params: [
        gen('808 Hand Clap', CLAP_GENS),
        num('CLP SIZE', -25, BIPOLAR, '%', 59, { mood: [{ axis: 'darkness', amount: -20 }], hint: 'Thickness of the sound' }),
        num('TAIL LVL', 38, PCT, '%', 59, { mood: [{ axis: 'density', amount: -12 }] }),
        send('RVB', 34, 24),
        send('DLY', 10, 10),
        shuffle(),
      ],
      articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },

    // ---- CH -------------------------------------------------------------------------
    {
      id: 'tr1000-closed-hat-clean',
      role: 'closed-hat',
      character: 'clean',
      voice: 'ch',
      title: 'Clipped closed hat, straight sixteenths',
      params: [
        gen('9X Closed HiHat', CLOSED_HAT_GENS),
        num('TUNE', 10, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -22 }] }),
        num('DECAY', 14, PCT, '%', 62, { mood: [{ axis: 'density', amount: -6 }] }),
        num('ERROR', 8, PCT, '%', 62, { hint: 'Noise into the DA converter' }),
        send('RVB', 6, 6),
        send('DLY', 0),
        shuffle(),
      ],
      articulation: [{ slot: 'offbeat', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },
    {
      id: 'tr1000-closed-hat-dirty',
      role: 'closed-hat',
      character: 'dirty',
      voice: 'ch',
      title: 'Grainy CR-78 hat with a metallic edge',
      params: [
        gen('CR78 HiHat', CLOSED_HAT_GENS),
        num('TUNE', -5, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('DECAY', 20, PCT, '%', 62, { mood: [{ axis: 'density', amount: -8 }] }),
        num('METALLIC', 72, PCT, '%', 62, { mood: [{ axis: 'grit', amount: 20 }], hint: 'Metal-like overtone level' }),
        send('RVB', 10, 10),
        send('DLY', 8, 8),
        shuffle(),
      ],
      articulation: [
        { slot: 'offbeat', set: { weak: true }, hint: 'weak-step' },
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      ],
      verified: false,
    },

    // ---- OH -------------------------------------------------------------------------
    {
      id: 'tr1000-open-hat-bright',
      role: 'open-hat',
      character: 'bright',
      voice: 'oh',
      title: 'Open hat that rings into the next downbeat',
      params: [
        gen('9X Open HiHat', OPEN_HAT_GENS),
        num('TUNE', 28, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -26 }] }),
        num('DECAY', 58, PCT, '%', 62, { mood: [{ axis: 'density', amount: -16 }] }),
        num('ERROR', 10, PCT, '%', 62),
        send('RVB', 16, 16),
        send('DLY', 20, 18),
        shuffle(),
      ],
      articulation: [{ slot: 'offbeat', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-open-hat-dark',
      role: 'open-hat',
      character: 'dark',
      voice: 'oh',
      title: 'Dull open hat, more air than sizzle',
      params: [
        gen('606 Open HiHat', OPEN_HAT_GENS),
        num('TUNE', -18, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('DECAY', 64, PCT, '%', 62, { mood: [{ axis: 'density', amount: -16 }] }),
        num('TONE', -35, BIPOLAR, '%', 62, { hint: 'Brightness of the cymbal' }),
        send('RVB', 14, 12),
        send('DLY', 12, 12),
        shuffle(),
      ],
      articulation: [{ slot: 'offbeat', set: { weak: true }, hint: 'weak-step' }],
      verified: false,
    },

    // ---- CC / RC --------------------------------------------------------------------
    {
      id: 'tr1000-impact-hard',
      role: 'impact',
      character: 'hard',
      voice: 'cc',
      title: 'Crash marking the top of a section',
      params: [
        gen('9X Crash Cymbal', CRASH_GENS),
        num('TUNE', 0, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -20 }] }),
        num('DECAY', 84, PCT, '%', 62, { mood: [{ axis: 'density', amount: -20 }] }),
        send('RVB', 42, 26),
        send('DLY', 18, 16),
        shuffle(),
      ],
      articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
      verified: false,
    },
    {
      id: 'tr1000-ride-clean',
      role: 'ride',
      character: 'clean',
      voice: 'rc',
      title: 'Even ride holding the top of the bar',
      params: [
        gen('9X Ride Cymbal', RIDE_GENS),
        num('TUNE', 12, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -16 }] }),
        num('DECAY', 74, PCT, '%', 62, { mood: [{ axis: 'density', amount: -14 }] }),
        send('RVB', 14, 14),
        send('DLY', 8, 8),
        shuffle(),
      ],
      articulation: [
        { slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' },
        { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      ],
      verified: false,
    },
  ],
}
