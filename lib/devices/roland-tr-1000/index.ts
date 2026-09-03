import type { Device } from '../../core/device'
import { jackFact } from '../../core/device'
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
 *    references used to live in comments, where `npm run audit` could not see them and neither
 *    could a reader of the device page — this box's nine of them are what #22 was about. They
 *    are now in `capabilityEvidence` below, keyed by field path (§2.6), and the comments keep
 *    only the *reasoning*: which of two tables is in force, why a field is absent, what a page
 *    does not say. A comment is a fine place to argue and a bad place to cite;
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
/**
 * **`COARSE` is settled per generator. The category is not the unit and neither is the
 * instrument.** Only the generator's own parameter table answers, and two tables under one
 * category heading disagree:
 *
 *  - p.60, under `CATEGORY: ACB`, `8X Bass Drum`, `8X Snare Drum`, `8X Tom`, `8X Rim Shot` and
 *    `8X Closed HiHat` each print `COARSE  -12St-0-12St  Sets the pitch in semitones.`, while
 *    `8X Hand Clap`, a few tables down that same page and the same category, prints
 *    `FILTER CLAPS SPEED MIX CLAP DCY TAIL DCY` and no `COARSE` at all;
 *  - p.62 splits again: `9X Rim Shot` carries it, and `9X Hand Clap`, `9X Closed HiHat`,
 *    `9X Open HiHat`, `9X Crash Cymbal` and `9X Ride Cymbal` do not.
 *
 * **The instrument is not the unit either, which is the trap worth naming.** `8X Closed HiHat`
 * (p.60) prints `COARSE`; `9X Closed HiHat` (p.62) prints `TUNE DECAY ERROR` and stops. Same
 * instrument, same category, different generator, opposite answer.
 *
 * And do not reach for the obvious mnemonic. "The pitched instruments have it" reads well and
 * p.61 falsifies it: `8X Open HiHat` prints `COARSE`, and so does `8X Crash Cymbal`, whose
 * explanation column reads *"Pitch of the cymbal in semitones"*. There is no rule above the
 * table. Read the table.
 *
 * Where a generator has no `COARSE`, its recipe keeps `TUNE` alone. That is an honest state and
 * not a hole to fill (invariant 5). Where it has one, cite it to the page carrying *that
 * generator's* table: p.60 and p.61 for the 8X family, p.62 for 9X, p.63 for FM, and the FM
 * range is `-24St-24St` rather than `-12St-0-12St`. A citation naming the right document and the
 * wrong table proves nothing.
 */
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
 * The *other* book. Roland ships two, and the panel is only in one of them: the rear-jack tables
 * and the project SOUND parameters are Owner's Manual pages, while every recipe value above comes
 * from the Reference Manual. Two helpers rather than one page number, so a citation cannot name
 * the wrong document by omission.
 */
function owner(page: number | string): Cite {
  return { kind: 'manual', source: `TR-1000 Owner’s Manual (eng02), p.${page}` }
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
 *
 * **`METALLIC_GENS` is the exception to the paragraph above and carries its own citation.** It
 * is not drawn from the list at all; the Reference Manual prints its two names itself, as the
 * header of the block that gives them `METALLIC`. Its comment says why, and `gen()` takes the
 * page as an argument so the exception is written at the call site rather than assumed here.
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
 * The two generators p.62 gives a `METALLIC` parameter to, and the reason this list is not
 * `CLOSED_HAT_GENS`. p.62's block header is literally `CR78 HiHat, CR78 Cymbal`, and the row
 * under it is `METALLIC  0.0%-100.0%  "Adjusts the level of the metal-like overtones."` **No
 * other block on p.62 exposes `METALLIC`** — that is the fact this set rests on, and it is the
 * whole of it. The page's other hat blocks are not uniform and it would be wrong to say they
 * were: the 9X hats reach `TUNE`, `DECAY` and `ERROR`, the 606 hats reach `TONE` over the 606
 * Common `TUNE`/`DECAY`, and `9X Open HiHat` and `606 Open HiHat` add `MUTE TRG` on top of
 * either. What every one of them has in common is only the absence that matters here.
 *
 * Offering the wider hat set would let a reader switch to `808 Closed HiHat` and leave a
 * `METALLIC` value on screen that the box no longer has a knob for - the two-printed-scales
 * trap in its other shape, where the second scale is no scale at all.
 *
 * **This set is cited to p.62 rather than to the GEN list, and the difference is the point.**
 * Every other option set here claims "these names appear on GEN list p.1 under this category",
 * which is a claim about a document. This one claims something narrower and stronger: p.62 prints
 * these two names together as the heading of the block that gives them `METALLIC`, so the page
 * that licenses the parameter is the same page that enumerates the set. Citing the list instead
 * would name a document for a set the list did not draw, and would leave `CR78 Cymbal` resting on
 * a page nobody here has opened.
 *
 * SELECT GEN picks the category per track with no restriction printed (Reference p.37, steps
 * 1-5), so the RC track can reach either of them.
 */
const METALLIC_GENS = ['CR78 HiHat', 'CR78 Cymbal']

/**
 * BD-HT sound layers A and B together, so those tracks have two GEN slots and the recipe's
 * `MIX` balances them. What is authored here is layer A; layer B is not authored at all rather
 * than guessed (invariant 5).
 *
 * **`where` defaults to the GEN list and is a parameter because one option set is not from it.**
 * A citation has to name the document that prints the set it sits on, and `METALLIC_GENS` is
 * printed by the Reference Manual's own p.62 block header rather than by the list — see its
 * comment. Defaulting rather than requiring keeps the other nineteen call sites saying what they
 * said, and makes the one exception visible at the site instead of hidden in a helper.
 */
function gen(value: string, options: string[], where: Cite = GEN_CITE): AuthoredEnumParam {
  return {
    kind: 'enum',
    name: 'GEN',
    value,
    // The list is the legality claim and is cited; which generator this recipe reaches for is
    // taste, and stays provisional exactly as a numeric point does (§3.2).
    options: { values: options, verified: where },
    verified: false,
    hint: 'Hold [SHIFT]+[GEN], select with [C6]',
  }
}

export const device: Device = {
  id: 'roland-tr-1000',
  name: 'TR-1000',
  maker: 'Roland',
  kind: 'drum-machine',

  /**
   * MIDI IN/OUT1/OUT2-THRU, both OUT connectors switchable to DIN SYNC; USB clock; CLK OUT
   * mini-jack; TRG IN usable as a clock source. Cited per fact in `capabilityEvidence` below.
   *
   * **No single page carries all five transports**, which is why `clock.transport` is cited to
   * the rear-panel connector tables (p.12) — the one page that names every socket they run on —
   * rather than to any of the four pages that establish them one at a time: p.30 for MIDI and
   * DIN sync, p.31's `Tempo Sync  Auto, MIDI, USB, INT` for USB, p.32's `Trig In` for the
   * analog pair. The send and receive capabilities themselves are p.30, which is the
   * synchronization chapter and states both in its first sentence.
   *
   * An earlier version of this comment cited **p.33 for "sync settings"**. p.33 is `BACKUP`
   * under Various settings; the sync setting is the GENERAL block on p.31. That is the whole
   * argument for moving these out of comments — a page number nothing reads is a page number
   * nobody rechecks.
   *
   * **`preferredSource` is not claimed (§7.4/#80), and p.30 is why it must not be.** p.30 is
   * already the citation for `canSendClock` in the map below, and reaching for the same page a
   * second time to claim the judgement is the precise error §2.6 warns about: a `canSendClock`
   * page proves the capability, and this field exists because a capability is not a job. Read as
   * a role page it does not even point that way — the chapter is *"Synchronization with other
   * devices and external audio input"*, its first sentence is receive-side (*"The TR-1000 can
   * receive MIDI clocks (F8) for synchronizing its tempo"*), and its only remark about topology
   * puts this box **in the middle of somebody else's chain**: *"The MIDI OUT 2 connector can be
   * used as a MIDI THRU connector. Use this connector when you want to connect multiple devices
   * and place the TR-1000 in the middle of the chain."* A pass-through link is not a lead.
   *
   * Roland's own positioning says the same thing outright. p.7's message from the developers
   * calls this *"the most complete rhythm machine ever made"* and asks to be *"an integral part
   * of their studios"* — a part, not a centre — and every sequencing claim on that page is about
   * sequencing itself: off-grid capability, per-track shuffle, individual track timing, song
   * mode. Nothing about sequencing external instruments. p.13's "Overview of the TR-1000" reads
   * like the page that would settle it and is a data-hierarchy diagram with no prose at all.
   *
   * The asymmetry is the finding worth keeping. This box has `Tempo Sync`, `Rx Start Stop Cont`
   * and `Trig In Sync Clock` on the receive side, and on the send side a `CLK OUT` jack, a
   * `Sync Out Clock` value and no parameter for enabling MIDI clock transmission anywhere. It is
   * documented as a box that follows, with sockets that let it lead.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'din-sync', 'usb', 'analog-clock', 'trigger'],
  },

  // MIX OUT L/MONO+R, ten INDIVIDUAL OUT/TRIGGER OUT jacks (BD-RC), ANALOG FX OUT L/R,
  // EXTERNAL IN L/R, USB-C audio to a computer. All four claims are the p.12 connector tables;
  // the citations are in `capabilityEvidence` below, one per field.
  io: { main: 'stereo', individualOuts: 10, audioIn: true, usbAudio: true },

  /**
   * §10/#103. **The sockets clock actually uses, so the rack stops inventing them.**
   *
   * The rack drew `CLK OUT` and `CLK IN` on every panel, derived from `canSendClock` and
   * `canReceiveClock`. Half of that is right here and half is fiction: the Owner's Manual p.12
   * lists the TRIGGER/CV jacks as `TRG IN`, `TRG OUT`, `FILTER CV IN` and `CLK OUT`, and there is
   * no clock *input* jack on this box under any name. What the diagram was telling a reader to
   * patch into does not exist.
   *
   * Only the clock-carrying jacks are declared. p.12 lists a dozen more — MIX OUT, ANALOG FX OUT,
   * EXTERNAL IN, the ten BD-RC jacks, CONTROL, USB — and `io` already carries the audio ones as
   * counts; listing them again here would restate the manifest in a second vocabulary for no
   * consumer. §3.3's rule is unchanged: a jack is declared when something names it.
   *
   * **Which socket the rack draws depends on the rig**, which is why `clock` is per transport.
   * §7.4 prefers `midi-din`, so in almost every rig this box is patched at `MIDI IN` / `MIDI
   * OUT1` — and `CLK OUT` is the right label only for a rig that resolved onto the minijack.
   *
   * `usb` and the DIN SYNC *input* are deliberately absent. The USB COMPUTER port is one socket
   * carrying both directions (p.12) and `JackSpec.direction` cannot say so; the two DIN SYNC
   * connectors are the switchable *OUT* pair, and the `IN connector` is MIDI only, so this box
   * sends DIN sync and does not take it. A rig resolving either draws its socket unlabelled,
   * which claims nothing.
   */
  jacks: [
    // p.12, MIDI connectors: `OUT1 connector or DIN SYNC 1 connector`, `IN connector`. Named
    // with the section, as §3.3 requires — a bare `IN` is unresolvable on a box with this many.
    { id: 'MIDI OUT1', direction: 'out', signal: ['clock', 'midi'], clock: ['midi-din'] },
    { id: 'MIDI IN', direction: 'in', signal: ['clock', 'midi'], clock: ['midi-din'] },
    {
      id: 'DIN SYNC 1',
      direction: 'out',
      // DIN sync is clock and run/stop and nothing else — no notes travel over it, which is why
      // `midi` is absent here and present on MIDI OUT1, the connector this shares.
      signal: ['clock'],
      clock: ['din-sync'],
      note: 'The same connector as MIDI OUT1, switched to DIN SYNC',
    },
    // p.12: "Use this jack to output synchronization signals to an external device."
    { id: 'CLK OUT', direction: 'out', signal: ['clock'], clock: ['analog-clock'] },
    /**
     * p.12 describes `TRG IN` only as "Connect a device that has a TRIGGER OUT jack here" — it
     * is p.32 that makes it a clock input, and it is a *setting*, not a property of the hole:
     * the project SOUND parameter `Trig In` takes `Sync, Start, Head, Clock`, and `Sync` is
     * "Uses the trigger input as the clock signal". A reader who patches this jack and leaves
     * `Trig In` alone gets no sync, so the note carries the setting with the socket.
     *
     * Both `analog-clock` and `trigger` land here, which is the case `JackSpec.clock` is a list
     * for: one socket, and p.32's parameter chooses what arriving pulses mean.
     */
    {
      id: 'TRG IN',
      direction: 'in',
      // The two-kind case `signal` is a list for, and the same socket as the `clock` list below:
      // p.12 documents it as a trigger input, p.32's `Trig In = Sync` makes arriving pulses the
      // clock instead. One hole, two meanings, and a setting chooses.
      signal: ['trigger', 'clock'],
      clock: ['analog-clock', 'trigger'],
      note: 'Set Trig In = Sync (Owner’s Manual p.32) or the pulses are not treated as clock',
    },
  ],

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
   * **Not the same answer as the TR-8S** — that box's route turned out to be open (#183), and the
   * difference is instructive rather than embarrassing. There, `Coarse` is assignable to a
   * performance `[CTRL]` knob and p.28 prints the list saying so. Here the semitone control sits
   * on the sample edit screen and the one page that would bridge it, KNOB ASSIGN (p.36), prints
   * no target list at all. So this is a gap because the manual does not answer, not because the
   * class of box cannot do it.
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

    /**
     * **`fromExternalAudio` was `true` and it was the page read backwards.** The field records
     * where the *trigger* comes from, which is the TR-8S comment's point and this box's trap in
     * the same words: Owner's p.30 lists "Apply a side chain" among the things you can do to the
     * audio arriving at EXTERNAL IN, so external audio there is the signal being **ducked**,
     * never the thing doing the ducking. The trigger is enumerated on the other page and the
     * enumeration is exhaustive — Reference p.56's SIDE CHAIN `SOURCE`, *"Selects the instrument
     * that is used as the trigger for the side chain effect"*, values `OFF, BD (A,B)–RC`, every
     * one of them one of this box's own instruments. Reference p.36 says it again in prose:
     * *"You can use the pattern (note data) of one track to automatically control the volume of
     * another track"*.
     *
     * The cost of the old value was a sentence a reader could act on and get nothing from: §8
     * phase 7 offered a cable into EXTERNAL IN to pump the rig off this box, and there is no
     * such feature.
     */
    sidechain: { internal: true, fromExternalAudio: false },
  },

  /**
   * §2.6/#22. **The nine Owner's Manual pages this box's capability facts come off, as data.**
   *
   * Every one of these was a page number in a comment until #22. The claims did not change and
   * neither did the reading behind them; what changed is that `npm run audit` can now count them,
   * the device page can print them, and a wrong one is a thing a reviewer can be pointed at. Two
   * of them were wrong. `clock`'s comment cited p.33 for the sync settings and p.33 is the backup
   * procedure, and nothing in the codebase was in a position to notice.
   *
   * Read on the rendered pages, not off `pdftotext`: p.12's connector tables and p.17's STEP EDIT
   * table both have the column structure the text dump scrambles.
   *
   *   p.12    the rear-panel connector tables — every socket on the box, by section
   *   p.14    "The variations (A-H) and fill-ins each have 10 tracks (BD, SD, LT, HT, RS, HC,
   *           CH, OH, CC and RC)", and the four layer / six single split
   *   p.17    the STEP EDIT parameter table (VELOCITY, START, SUBSTEP, PROB, CYCLE), plus
   *           weak beats and ALT INST as their own gestures
   *   p.18    ACCENT [STEP], the third gesture `perStep` names
   *   p.30    the synchronization chapter: receives MIDI clock, drives MIDI devices, and
   *           "the output can be set to the DIN sync protocol"
   *
   * `features.sidechain` was split across two documents and no longer is, and the split was the
   * shape of the error. The external half cited Owner's p.30 — "Apply a side chain", one item in
   * a list of things you can do *to* EXTERNAL IN audio — for a field that records where the
   * trigger comes from. The Reference Manual's SIDE CHAIN block answers both halves at once and
   * exhaustively: `SOURCE  OFF, BD (A,B)–RC` is the instrument that triggers it, and external
   * audio is not among the values. Two paths, one page — and the per-fact keying is what let one
   * of them be corrected without disturbing the other.
   *
   * `comfortableVoices` is deliberately not here. Eight is a musical judgement about this box
   * (§12.4) and no page states it; a slot to cite it in would only invite citing p.14, which
   * says ten.
   */
  /**
   * §2.6/#142. **A step on this box fires an instrument; nothing about it is a length.** The
   * per-step gestures the Owner's Manual enumerates (pp.17-18, cited at `features.perStep`) are
   * sub steps, flams, alternates and accents — no gate, no length, no tie. What ends the sound is
   * the instrument's own envelope, and `DECAY` is the parameter that sets it (Reference p.59,
   * where every recipe below already cites it).
   *
   * Worth stating rather than leaving absent, because the Hook phase would otherwise print a
   * duration beside a drum voice and imply there is somewhere to put it.
   */
  noteDuration: {
    kind: 'trigger',
    reason: "the instrument's own envelope ends it, and `DECAY` is what sets that",
  },

  capabilityEvidence: {
    noteDuration: cite(59),
    'clock.canSendClock': owner(30),
    'clock.canReceiveClock': owner(30),
    'clock.transport': owner(12),

    'io.main': owner(12),
    'io.individualOuts': owner(12),
    'io.audioIn': owner(12),
    'io.usbAudio': owner(12),

    voices: owner(14),

    'features.perStep': owner('17-18'),
    'features.sidechain.internal': cite(56),
    'features.sidechain.fromExternalAudio': cite(56),
    /**
     * §2.6's read-and-silent state, and the reason it exists — `unknown` in the strictest sense,
     * which is why #120 left it exactly where it was while three states grew around it. This is
     * not "nobody checked" and not "nobody could": the MOD block has been read closely enough to
     * author a recipe from it (see `features` above), and the answer is that the manual does not
     * state the two things `LfoSpec` needs.
     */
    /**
     * §7.4/#80. Not `owner(30)`, which is `clock.canSendClock` three lines above and would be
     * that citation wearing this field's name. See the `clock` comment for what p.30, p.7 and
     * p.13 actually say.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.7 positions this as “the most complete rhythm machine ever made” and “an integral part of their studios”; p.30’s sync chapter is receive-framed and its one topology note places the TR-1000 in the middle of another chain, so no page states that leading a rig is its job',
    },

    'features.lfo': {
      kind: 'unknown',
      reason:
        'p.71 gives DEST 1-3 as assignment slots for one LFO, not a count, and TARGET’s Value column is literally “-”; neither `count` nor `destinations` has an answer the manual prints',
    },

    // The five clock-carrying sockets, all on p.12's TRIGGER/CV and MIDI connector tables.
    [jackFact('MIDI OUT1')]: owner(12),
    [jackFact('MIDI IN')]: owner(12),
    [jackFact('DIN SYNC 1')]: owner(12),
    [jackFact('CLK OUT')]: owner(12),
    [jackFact('TRG IN')]: owner(12),
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

  productPage: 'https://www.roland.com/global/products/tr-1000/',

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
        num('COARSE', -2, SEMITONES, 'St', 60, { hint: 'A whole tone down' }),
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
        num('COARSE', 3, SEMITONES, 'St', 60, { hint: 'A minor third up, to cut' }),
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
    /**
     * The RC track playing the *metallic* part rather than the ride. RS, CC and RC all declare
     * the role and this is the one that can be spared: `metallic` is one ring every four bars,
     * and on the directions that ask for it the CC track is already carrying the crash, so
     * authoring it there buys the ring by dropping `impact`. RC costs nothing a direction was
     * already using.
     *
     * **`METALLIC` is the only parameter on this box that names metal, and p.62 gives it to two
     * generators.** The block header is `CR78 HiHat, CR78 Cymbal`; `TUNE` and `DECAY` come from
     * `CR78 Common` above it. `CR78 Cymbal` is the one of the two this recipe reaches for,
     * because `tr1000-closed-hat-dirty` already holds `CR78 HiHat` and a generator authored
     * twice would make the option sets decoration.
     *
     * `GEN` is carried, with `METALLIC_GENS` as its option set, so that the three values stay
     * one page's pairing: every generator a reader can switch to from here still has the knob
     * this recipe tells them to set.
     *
     * Longer `DECAY` and more `METALLIC` than `tr1000-closed-hat-dirty`, because the two parts
     * want opposite things from the CR-78 sound: the hat wants the hit and none of the ring,
     * this wants the ring. Both points are provisional, as every point on this box is.
     */
    {
      id: 'tr1000-metallic-dirty',
      role: 'metallic',
      character: 'dirty',
      voice: 'rc',
      title: 'CR-78 metal ringing across the bar line',
      params: [
        gen('CR78 Cymbal', METALLIC_GENS, cite(62)),
        num('TUNE', 18, BIPOLAR, '%', 62, { mood: [{ axis: 'darkness', amount: -24 }] }),
        num('DECAY', 46, PCT, '%', 62, { mood: [{ axis: 'density', amount: -12 }] }),
        num('METALLIC', 88, PCT, '%', 62, {
          mood: [{ axis: 'grit', amount: 12 }],
          hint: 'Metal-like overtone level',
        }),
        send('RVB', 20, 20),
        send('DLY', 14, 14),
        shuffle(),
      ],
      articulation: [
        { slot: 'downbeat', set: { accent: true }, hint: 'accent-step' },
        { slot: 'offbeat', set: { weak: true }, hint: 'weak-step' },
      ],
      verified: false,
    },
  ],
}
