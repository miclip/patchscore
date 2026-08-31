import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import { device as rd9 } from '../behringer-rd-9'
import { RD8_PANEL } from './panel'

/**
 * Behringer RHYTHM DESIGNER RD-8 (§2.3). Sixteen analog drum sounds on eleven voices, a 64-step
 * sequencer, a shared Wave Designer and a 12 dB state-variable filter on one FX bus, and eleven
 * individual outputs.
 *
 * ## The document
 *
 * `RHYTHM_DESIGNER_RD-8_M_EN.pdf`, 30pp, English only. **Printed folio equals PDF page** —
 * checked at pp.5, 12 and 24, where the header reads `5`, `12`, `24` on PDF pages 5, 12 and 24.
 * Every `p.N` below is both. The cover carries no revision; p.4 says the book is *based on the
 * initial software release, V1.1.8*, which is the firmware and is the only version claim in it.
 *
 * It splits the same way the RD-9's does, and the split is the shape of the whole manifest:
 *
 *  - **Printed and cited**: tempo, swing, probability, flam, filter step values, pattern lengths,
 *    step sizes and every preference option set (pp.14-21); and four controls in the
 *    Specifications table — the filter's cutoff and resonance and the Wave Designer's attack and
 *    sustain, all on p.26.
 *  - **Never printed anywhere**: every voice pot. `LEVEL`, `TUNING`, `TONE`, `DECAY`, `SNAPPY`
 *    and `OFFSET` are described in words on pp.7 and 9 — "turn CCW for shorter, CW for longer" —
 *    and given no scale in 30 pages. p.26's Sound Controls block lists them by name only
 *    ("Bass drum  Level, tone, decay, tuning").
 *
 * So those six are authored with `travel()`, the DFAM's shape: a position as percent of the
 * knob's own travel, **uncited on both claims and therefore mood-inert (§3.1)**.
 *
 * ## The RD-9 is the same chassis, and this file says so out loud
 *
 * Invariant 2 allows a folder to import a sibling and requires the importer to make a break loud.
 * `CHASSIS` below is that guard. It is **not** a source of values — every page number in this
 * file was read in the RD-8's own manual — it is an exhaustive claim about which capability facts
 * the two boxes make from the same hardware, and where each book prints them. It throws three
 * ways: on a fact the RD-9 carries that this map has no answer for, on a fact whose RD-9 evidence
 * is not a manual citation of the RD-9's own book, and on a citation that has moved to a page
 * this map does not expect. A near-clone that silently stops being one fails the build.
 *
 * **Recipes are not borrowed and could not be**, which is the finding the guard exists to make
 * visible rather than to hide. The two boxes share a sequencer and an FX bus and share almost no
 * voices: this is the 808 set — congas, claves, maracas, cow bell, cymbal — against the RD-9's
 * 909 set, and the differences reach the controls.
 *
 *  - **There is no Enhanced Mode**, so there is no `PITCH`, no `PITCH DEPTH` and no hi-hat
 *    `TUNE`. The word does not appear in 30 pages in that sense. The RD-9's three recipes that
 *    carry `ENHANCED MODE = On` have nothing to map onto.
 *  - **The bass drum has no `ATTACK`.** Its four controls are `LEVEL`, `TONE`, `DECAY` and a
 *    `TUNING` knob that sits in the ACCENT column and tunes the bass drum only (p.9, control 2).
 *  - **Five voice switches make sixteen sounds out of eleven voices** (p.9): LOW/MID/HI TOM
 *    become LOW/MID/HI CONGA, RIM SHOT becomes CLAVES, HAND CLAP becomes MARACAS. Every recipe
 *    on one of those five carries `VOICE SWITCH` so the reader is never left holding two sounds.
 *  - **Eleven individual outs, not ten** (p.8, items 68-78; p.26). The hats have one jack each
 *    here where the RD-9 shares one between them.
 *  - **Accent is a track, not a step gesture.** p.9 (1) describes one global ACCENT with its own
 *    LEVEL and its own SELECT button, and p.20 gives it its own `Accent Step Values (1 - 64)`
 *    lane. The RD-9's "press the step twice" accent is not in this book, so `accent-step` says
 *    what this box actually does.
 *  - **The trigger outputs are unassigned and 1 ms.** p.8 gives all three as `+5 v 1ms pulse`
 *    with no voice named, against the RD-9's 2 ms outputs wired to RIM SHOT, CLAP and an
 *    assignable third.
 *
 * ## The RD-9's SWING trap does not exist here, and that had to be checked rather than assumed
 *
 * `behringer-rd-9` carries a long note on `SWING` being printed three ways, with the Swing
 * Preference deciding which range is in force. **This manual prints one range, four times**:
 * p.6 (31) `50% straight to 75% full swing`, p.17 §11.14 the same, p.19 Global Parameters
 * `50 – 75 %`, p.21 Pattern Parameters `50 – 75 %`. There is no negative swing anywhere — the
 * string `25%` does not occur in the document.
 *
 * The preference is still paired with the value in every recipe below, because it still decides
 * *which stored copy* the sequencer plays (p.18), and a reader who sets a pattern swing while the
 * box is reading the global one has changed nothing. It is no longer holding two scales apart.
 *
 * ## Three places this manual contradicts itself
 *
 * Recorded rather than smoothed over, because each would otherwise become a citation that says
 * something the page does not.
 *
 * **1. PREFS is step key 5, not 6.** p.15 §11.5 says *"select PREFS (Step key 6)"*, but p.13
 * says FILTER is step button 6, p.17 §12 says *"press CHAIN/PREFS (STEP BUTTON 5)"*, and the
 * panel's own step-key silkscreen (p.24) runs `MIDI  USB  CLOCK  MAP  PREFS  FILTER  POLY  RAND
 * PROB  FLAM  RPT`, which puts PREFS at 5 and FILTER at 6. Two independent readings against one,
 * so `hints` says 5.
 *
 * **2. The RETURN jack is unbalanced on p.8 and balanced on p.26.** p.8 (63) reads
 * `¼" (6.35 mm) Unbalanced connector`; p.26's Connectivity block reads
 * `Return (Input)  1 x 1/4" TRS, balanced`. Nothing here depends on which is right, so the jack
 * note says what p.8 says and this paragraph records that p.26 disagrees.
 *
 * **3. Pattern repeats are 1-100 on p.19 and 99 on p.26.** p.19's Song Arrangement table gives
 * `Pattern Repeats (1 – 16)  No. of Repeats (1 - 100)`; p.26 says `Pattern mode  Up to 99
 * iterations per pattern/part`. Song arrangement is not modelled, so no value here rests on it.
 *
 * ## What is not modelled
 *
 * Songs, song chaining, Auto Fill, Step Repeat, the SysEx format (pp.21-23) and the MIDI note map
 * (p.15) are arrangement and configuration rather than per-part settings. There is no LFO and no
 * sidechain anywhere in the document, so `features` declares neither.
 *
 * No recipe carries step hits. Patterns are template-owned (§4.3).
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = 'RHYTHM DESIGNER RD-8 User Manual'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

// ---------------------------------------------------------------------------
// The near-clone guard (invariant 2)
// ---------------------------------------------------------------------------

/** The RD-9 manifest's own citation string, so a page can be recovered from it and checked. */
const RD9_CITE = /^RD-9 User Manual V 1\.0, p\.(\d+)$/

/**
 * Every capability fact the RD-9 declares, and this box's answer to it.
 *
 * `rd9` is the page that manifest cites today and `rd8` is the page in **this** manual carrying
 * the same fact — read here, not translated. A `reason` instead means the two boxes genuinely
 * answer differently and the fact below is authored from scratch.
 *
 * The `jacks[...]` family is deliberately outside this map: the two rear panels are not the same
 * panel (eleven individual outs against ten, unnamed trigger outputs against three assigned
 * ones), so every jack here is its own reading of p.8. `assertChassis` says so once rather than
 * carrying twenty-one identical exclusions.
 */
const CHASSIS: Record<string, { rd9: number; rd8: number } | { reason: string }> = {
  'clock.canSendClock': { rd9: 9, rd8: 8 },
  'clock.canReceiveClock': { rd9: 19, rd8: 17 },
  'clock.transport': { rd9: 33, rd8: 26 },
  'clock.sourceSetup[midi-din]': { rd9: 19, rd8: 17 },
  'clock.sourceSetup[usb]': { rd9: 19, rd8: 17 },
  'clock.sourceSetup[analog-clock]': { rd9: 19, rd8: 17 },
  'io.main': { rd9: 33, rd8: 26 },
  'io.individualOuts': { rd9: 33, rd8: 26 },
  'io.audioIn': { rd9: 33, rd8: 26 },
  'io.usbAudio': { rd9: 10, rd8: 8 },
  voices: { rd9: 33, rd8: 26 },
  'features.perStep': { rd9: 26, rd8: 20 },
  noteDuration: { rd9: 8, rd8: 7 },
  'clock.preferredSource': {
    reason:
      'the RD-9 reads its own §14 DAW Control chapter against its marketing page. This book has no DAW chapter at all, so the reading is a different one and is written out below',
  },
  content: {
    reason:
      'the RD-9 answers with seven analog voices and four sampled ones. Every sound on this box is analog (p.26), so the citation is not the same claim',
  },
}

/**
 * Runs once at import. Three ways to fail, and each names the fact rather than the file.
 */
function assertChassis(): void {
  for (const path of Object.keys(rd9.capabilityEvidence ?? {})) {
    if (path.startsWith('jacks[')) continue
    if (!(path in CHASSIS)) {
      throw new Error(
        `behringer-rd-8: the RD-9 declares '${path}' and this manifest's CHASSIS map has no answer for it (§2.6, invariant 2)`,
      )
    }
  }
  for (const [path, entry] of Object.entries(CHASSIS)) {
    const evidence = rd9.capabilityEvidence?.[path]
    if (evidence === undefined) {
      throw new Error(`behringer-rd-8: the RD-9 no longer declares '${path}', which CHASSIS maps`)
    }
    if ('reason' in entry) continue
    if (evidence === false || !('kind' in evidence) || evidence.kind !== 'manual') {
      throw new Error(
        `behringer-rd-8: '${path}' is shared with the RD-9, but the RD-9's evidence for it is not a manual citation`,
      )
    }
    const match = RD9_CITE.exec(evidence.source)
    if (match === null) {
      throw new Error(
        `behringer-rd-8: '${path}' cites '${evidence.source}', which is not the RD-9 manual this map was written against`,
      )
    }
    if (Number(match[1]) !== entry.rd9) {
      throw new Error(
        `behringer-rd-8: '${path}' has moved to RD-9 p.${match[1]}; CHASSIS expects p.${entry.rd9}, so the RD-8 page beside it needs re-reading`,
      )
    }
  }
}

assertChassis()

/** The RD-8 page for a fact the two boxes share. Throws on anything this map calls unshared. */
function shared(path: string): Cite {
  const entry = CHASSIS[path]
  if (entry === undefined || 'reason' in entry) {
    throw new Error(`behringer-rd-8: '${path}' is not a shared chassis fact and has no mapped page`)
  }
  return cite(entry.rd8)
}

// ---------------------------------------------------------------------------
// §3.3 The rear panel
// ---------------------------------------------------------------------------

/** §2.6/#22. The page goes here, keyed by `jacks[<id>]`, and never into a comment. */
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
 * The rear panel in its own left-to-right order (p.8, items 60-84). There is no front panel:
 * `PHONES` is item 61 on the back beside `MONO`.
 *
 * **The USB port is deliberately absent**, following the RD-9 and the TR-6S: `JackSpec.direction`
 * is one of `in` or `out` and this port is both — p.17 §11.13 takes sync *from* USB and p.14
 * §11.2 forwards MIDI *to* it. The `usb` transport carries a `sourceSetup` and no socket.
 *
 * `POWER` (60) and `BOOT` (84) are omitted for the ordinary reason: an inlet and a button are not
 * things a reader patches.
 *
 * **Eleven individual outs for eleven voices**, one each, and five of them carry two silkscreened
 * names because the switch above the voice decides which sound is in circuit. Inserting a jack
 * cuts that voice from the MONO output (p.8 §4.1).
 */
const JACKS = [
  jack('PHONES', 'out', ['audio'], 8, { note: '6.35 mm (¼") TRS, on the rear beside MONO' }),
  jack('OUT · MONO', 'out', ['audio'], 8, { note: 'The main output; p.26 gives it as TRS, servo-balanced' }),
  jack('IN · RETURN', 'in', ['audio'], 8, {
    note: 'Sums audio back in after the filter bus — for processing a voice outside the box',
  }),
  jack('MIDI · IN', 'in', ['clock', 'midi'], 8, { clock: ['midi-din'] }),
  jack('MIDI · OUT', 'out', ['clock', 'midi'], 8, { clock: ['midi-din'] }),
  jack('MIDI · THRU', 'out', ['midi'], 8, { note: 'A direct copy of MIDI IN, for chaining' }),
  jack('OUT · CH', 'out', ['audio'], 8, { note: 'Closed Hat; inserting it cuts that voice from MONO' }),
  jack('OUT · OH', 'out', ['audio'], 8, { note: 'Open Hat; inserting it cuts that voice from MONO' }),
  jack('OUT · CY', 'out', ['audio'], 8, { note: 'Cymbal; inserting it cuts that voice from MONO' }),
  jack('OUT · CB', 'out', ['audio'], 8, { note: 'Cow Bell; inserting it cuts that voice from MONO' }),
  jack('OUT · CP/MA', 'out', ['audio'], 8, { note: 'Hand Clap or Maracas, whichever the switch has' }),
  jack('OUT · RS/CL', 'out', ['audio'], 8, { note: 'Rim Shot or Claves, whichever the switch has' }),
  jack('OUT · HT/HC', 'out', ['audio'], 8, { note: 'High Tom or High Conga, whichever the switch has' }),
  jack('OUT · MT/MC', 'out', ['audio'], 8, { note: 'Mid Tom or Mid Conga, whichever the switch has' }),
  jack('OUT · LT/LC', 'out', ['audio'], 8, { note: 'Low Tom or Low Conga, whichever the switch has' }),
  jack('OUT · SD', 'out', ['audio'], 8, { note: 'Snare Drum; inserting it cuts that voice from MONO' }),
  jack('OUT · BD', 'out', ['audio'], 8, { note: 'Bass Drum; inserting it cuts that voice from MONO' }),
  jack('TRIGGER OUT 1', 'out', ['trigger'], 8, { note: '+5 V, 1 ms pulse; the manual assigns it no voice' }),
  jack('TRIGGER OUT 2', 'out', ['trigger'], 8, { note: '+5 V, 1 ms pulse; the manual assigns it no voice' }),
  jack('TRIGGER OUT 3', 'out', ['trigger'], 8, { note: '+5 V, 1 ms pulse; the manual assigns it no voice' }),
  jack('SYNC · IN', 'in', ['clock'], 8, {
    clock: ['analog-clock'],
    note: '1/8" TRS — clock on tip, start/stop on ring. Do not exceed +15 V (p.8)',
  }),
  jack('SYNC · OUT', 'out', ['clock'], 8, {
    clock: ['analog-clock'],
    note: '1/8" jack, unbalanced (p.8); p.26 gives the pair as 2 x 1/8" TS',
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
 * checked would be arithmetic dressed as authority.
 *
 * Every voice pot on this box is in this state, for the reason in the module note: pp.7 and 9
 * describe them in words and p.26 lists them by name.
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

/** p.21, Pattern Parameters — and p.19's Global table agrees. See the module note on SWING. */
const SWING_PCT = { min: 50, max: 75 }
/** p.19 / p.21, `0 – 100 %`. p.16: 0% never triggers, 100% triggers as programmed. */
const PROB_PCT = { min: 0, max: 100 }
/** p.26, Analog Filter: `Cutoff  10 Hz - 15 kHz, adjustable`. */
const CUTOFF_HZ = { min: 10, max: 15000 }
/** p.26, Analog Filter: `Resonance  0 - 10, adjustable`. */
const RESONANCE = { min: 0, max: 10 }
/** p.26, Wave Designer: `Attack  -15 to +15 dB, adjustable`. */
const WD_ATTACK_DB = { min: -15, max: 15 }
/** p.26, Wave Designer: `Sustain  -24 to +24 dB, adjustable`. */
const WD_SUSTAIN_DB = { min: -24, max: 24 }

/** p.18, the three-way preference every sequencer parameter answers to. */
const PREFERENCE = ['Song', 'Global', 'Pattern'] as const
/** p.16 §11.12, in the manual's own spelling. `1/16` is called the default there. */
const STEP_SIZES = ['1/8', '1/8T', '1/16', '1/16T', '1/32'] as const
/** p.19, `Global Filter Enable`: `0 = Off, 1 = On`. p.5 (5) names the ON button. */
const ON_OFF = ['Off', 'On'] as const
/** p.19, `Global Filter Mode`: `0 = LPF, 1 = HPF`. p.5 (4) names the button. */
const FILTER_MODES = ['LPF', 'HPF'] as const

// ---------------------------------------------------------------------------
// The blocks every recipe shares
// ---------------------------------------------------------------------------

/**
 * §3.1/#107. **The pattern's own settings**, hoisted above the parts because one control serves
 * every voice on the box.
 *
 * Each number is paired with the preference that decides which stored copy is in force (p.18).
 * Unlike the RD-9, that pairing is not holding two printed scales apart — this book prints one
 * swing range — but it is still what decides whether a pattern's stored value is the one played.
 */
function pattern(): AuthoredParam[] {
  return [
    pick('SWING PREFERENCE', 'Pattern', PREFERENCE, 18, {
      scope: 'pattern',
      note: 'Chooses which stored Swing the sequencer uses — Global, Song or Pattern',
      hint: 'clock-prefs',
    }),
    num('SWING', 50, SWING_PCT, 21, {
      unit: '%',
      scope: 'pattern',
      mood: [{ axis: 'swing', amount: 25 }],
      note: '50 is straight and 75 is full swing (p.17)',
      hint: 'data-mode',
    }),
    pick('PROB PREFERENCE', 'Pattern', PREFERENCE, 18, {
      scope: 'pattern',
      note: 'p.16 adds that the steps are stored per pattern while the amount is one number',
      hint: 'clock-prefs',
    }),
    num('PROB', 90, PROB_PCT, 21, {
      unit: '%',
      scope: 'pattern',
      mood: [{ axis: 'density', amount: 10 }],
      note: 'Only steps switched on in the PROB menu are affected (p.16)',
      hint: 'prob-step',
    }),
    pick('STEP SIZE PREFERENCE', 'Pattern', PREFERENCE, 18, { scope: 'pattern', hint: 'clock-prefs' }),
    pick('STEP SIZE', '1/16', STEP_SIZES, 16, {
      scope: 'pattern',
      note: 'One step is 1/16 of a bar, so sixteen steps make one bar (p.16)',
      hint: 'step-size',
    }),
  ]
}

/**
 * The shared FX bus: Wave Designer into Analog Filter, one set of four controls for every voice
 * sent to it (pp.12-13, and the routing diagram on p.13).
 *
 * `scope: 'pattern'` is p.21's claim — Filter Mode, Filter Enable, Filter Automation and the 64
 * Filter Step Values are all stored per pattern. Two parts asking for different settings is a
 * real conflict at the box, and the guide prints both rather than hoisting one over the other.
 *
 * `ATTACK 0` and `SUSTAIN 0` are bypass, and that is the manual's own claim rather than an
 * inference from the dB scale: p.12 says *"With both ATTACK and SUSTAIN controls set to 12
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
    pick('FILTER', 'On', ON_OFF, 19, {
      scope: 'pattern',
      note: 'The ON button engages the filter into the circuit (p.5)',
    }),
    pick('FILTER MODE', mode, FILTER_MODES, 19, {
      scope: 'pattern',
      note: 'The HPF button toggles it; LPF is the default (p.5)',
    }),
    num('CUTOFF', cutoffHz, CUTOFF_HZ, 26, {
      unit: 'Hz',
      scope: 'pattern',
      mood: [{ axis: 'darkness', amount: -2500 }],
      note: 'One filter for the whole box — every voice on the FX bus shares it (p.13)',
      hint: 'fx-send',
    }),
    num('RESONANCE', resonance, RESONANCE, 26, {
      scope: 'pattern',
      mood: [{ axis: 'grit', amount: 3 }],
      note: 'A peak at the cutoff point (p.13)',
    }),
    num('WAVE DESIGNER ATTACK', attackDb, WD_ATTACK_DB, 26, {
      unit: 'dB',
      scope: 'pattern',
      note: '0 dB is 12 o’clock and is bypass (p.12)',
    }),
    num('WAVE DESIGNER SUSTAIN', sustainDb, WD_SUSTAIN_DB, 26, {
      unit: 'dB',
      scope: 'pattern',
      mood: [{ axis: 'space', amount: 8 }],
      note: 'Acts like a compressor upward, and shortens the tail downward (p.12)',
    }),
  ]
}

/** p.7 (52): "Level of the 11 voices, plus Accent." Every voice has one and nothing else. */
function level(value: number): AuthoredNumericParam {
  return travel('LEVEL', value, { note: 'Level against the other voices (p.9)' })
}

/**
 * p.9. The five columns whose switch picks one of two sounds, each with its own pair.
 *
 * This is the RD-8's version of the trap `CLAUDE.md` records for the TR-8S's INST table: two
 * sounds behind one set of controls, and a value that means nothing until you know which one is
 * in circuit. `CLAVES` and `RIM SHOT` share a level knob, a sequencer track and the `RS/CL` jack,
 * so a recipe naming neither has told a reader nothing about what will play. Every recipe on one
 * of these five carries the switch, which is why the pairing cannot come apart.
 */
const VOICE_SWITCHES: Record<string, readonly [string, string]> = {
  lt: ['LOW TOM', 'LOW CONGA'],
  mt: ['MID TOM', 'MID CONGA'],
  ht: ['HI TOM', 'HI CONGA'],
  rs: ['RIM SHOT', 'CLAVES'],
  cp: ['HAND CLAP', 'MARACAS'],
}

function voiceSwitch(voiceId: string, value: string): AuthoredEnumParam {
  const options = VOICE_SWITCHES[voiceId]
  if (options === undefined) throw new Error(`behringer-rd-8: '${voiceId}' has no voice switch`)
  if (!options.includes(value)) {
    throw new Error(`behringer-rd-8: '${value}' is not one of ${voiceId}'s two sounds`)
  }
  return pick('VOICE SWITCH', value, options, 9, {
    note: 'The switch above the column decides which of the two sounds is in circuit (p.7)',
    hint: 'voice-switch',
  })
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe, explicitly rather than by omission.
 *
 * §3.1 makes the recipe citation the default a param inherits when it carries none. No page in
 * this manual says "these are the settings for a kick" — the nearest thing is p.9's paragraph of
 * prose per voice — so the inheritance chain has to terminate, and saying so is what stops an
 * omitted citation from quietly meaning something later.
 */

const recipes: Recipe[] = [
  // ---- Bass drum ---------------------------------------------------------
  {
    id: 'rd8-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    verified: false,
    title: 'Short 808 kick with the top left on it',
    params: [
      ...pattern(),
      travel('TUNING', 40, { note: 'CCW for low sounds, CW to raise the pitch (p.9)' }),
      travel('TONE', 64, { note: 'CCW removes high frequency information (p.9)' }),
      travel('DECAY', 30, { note: 'How long the drum rings; CW for longer (p.9)' }),
      level(80),
    ],
    articulation: [
      { slot: 'downbeat', set: { accent: true }, hint: 'accent-step', verified: cite(9) },
    ],
  },
  {
    id: 'rd8-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'bd',
    verified: false,
    title: 'Long kick pushed through the Wave Designer and into the filter',
    params: [
      ...pattern(),
      travel('TUNING', 32),
      travel('TONE', 46, { note: 'Back off the top so the filter has something to bite on' }),
      travel('DECAY', 78, { note: 'CW for longer tones (p.9)' }),
      level(82),
      ...fxBus('LPF', 1800, 6, 9, 6),
    ],
    routing:
      'Send the bass drum to the FX bus: press SEND, use SELECT to light BASS DRUM, press SEND again (p.12)',
    articulation: [
      { slot: 'downbeat', set: { accent: true }, hint: 'accent-step', verified: cite(9) },
    ],
  },
  {
    id: 'rd8-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'bd',
    verified: false,
    title: 'Bass drum tuned down and held out as a sub tone',
    params: [
      ...pattern(),
      travel('TUNING', 10, { note: 'Near the bottom of its travel — CCW for low sounds (p.9)' }),
      travel('TONE', 28, { note: 'CCW to take the high frequencies off (p.9)' }),
      travel('DECAY', 96, { note: 'The longest ring the voice has (p.9)' }),
      level(84),
    ],
    routing:
      'Take it out of BD INDIVIDUAL OUTPUT so it can be compressed on its own — inserting the jack cuts it from MONO (p.8)',
  },

  // ---- Snare -------------------------------------------------------------
  {
    id: 'rd8-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'sd',
    verified: false,
    title: 'Snare with the snares wide open',
    params: [
      ...pattern(),
      travel('TONE', 70, { note: 'CCW reduces the high frequencies (p.7)' }),
      travel('SNAPPY', 80, { note: 'CW increases snap — the mic moving toward the bottom head (p.9)' }),
      level(72),
    ],
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step', verified: cite(9) },
    ],
  },
  {
    id: 'rd8-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'sd',
    verified: false,
    title: 'Snare opened up so it cuts over the hats',
    params: [...pattern(), travel('TONE', 88), travel('SNAPPY', 66), level(68)],
    articulation: [
      { slot: 'fill', set: { 'note-repeat': 4 }, hint: 'note-repeat-step', verified: cite(16) },
    ],
  },
  {
    id: 'rd8-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'sd',
    verified: false,
    title: 'Snare turned right down for ghost notes between the backbeats',
    params: [
      ...pattern(),
      travel('TONE', 40, { note: 'CCW takes the top off so it sits under the backbeat (p.7)' }),
      travel('SNAPPY', 28),
      level(24),
    ],
    articulation: [
      { slot: 'ghost', set: { probability: 55 }, hint: 'prob-step', verified: cite(16) },
    ],
  },

  // ---- Hand clap ---------------------------------------------------------
  {
    id: 'rd8-clap-hard',
    role: 'clap',
    character: 'hard',
    voice: 'cp',
    verified: false,
    title: 'Clap on the backbeat at full level',
    params: [
      ...pattern(),
      voiceSwitch('cp', 'HAND CLAP'),
      travel('OFFSET', 42, { note: 'Length of the hand clap, short CCW to long CW (p.9)' }),
      level(80),
    ],
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step', verified: cite(9) },
    ],
  },
  {
    id: 'rd8-clap-soft',
    role: 'clap',
    character: 'soft',
    voice: 'cp',
    verified: false,
    title: 'Clap spread long and tucked under the snare',
    params: [
      ...pattern(),
      voiceSwitch('cp', 'HAND CLAP'),
      travel('OFFSET', 74, { note: 'CW lengthens it, so the hits smear rather than crack (p.9)' }),
      level(38),
    ],
    /**
     * §4.3/#108. `ghost`, not `offbeat` — the reachable set for a clap is backbeat, accent, fill
     * and ghost, so an articulation on `offbeat` would silently never apply. The same reading the
     * RD-9's clap recipe records.
     */
    articulation: [
      { slot: 'ghost', set: { probability: 70 }, hint: 'prob-step', verified: cite(16) },
    ],
  },

  // ---- Rim shot ----------------------------------------------------------
  {
    id: 'rd8-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'rs',
    verified: false,
    title: 'Dry rim shot, nothing on the bus',
    params: [...pattern(), voiceSwitch('rs', 'RIM SHOT'), level(58)],
    routing:
      'The switch above this column picks RIM SHOT or CLAVES — they share the level knob, the track and the RS/CL jack (p.9)',
    articulation: [
      { slot: 'offbeat', set: { probability: 80 }, hint: 'prob-step', verified: cite(16) },
    ],
  },

  // ---- Hats --------------------------------------------------------------
  {
    id: 'rd8-closed-hat-hard',
    role: 'closed-hat',
    character: 'hard',
    voice: 'ch',
    verified: false,
    title: 'Tight closed hat on every sixteenth',
    params: [
      ...pattern(),
      travel('TONE', 76, { note: 'The closed hat has LEVEL and TONE and nothing else (p.9)' }),
      level(56),
    ],
    articulation: [
      { slot: 'offbeat', set: { 'note-repeat': 2 }, hint: 'note-repeat-step', verified: cite(16) },
    ],
  },
  {
    id: 'rd8-closed-hat-dark',
    role: 'closed-hat',
    character: 'dark',
    voice: 'ch',
    verified: false,
    title: 'Closed hat filtered back so it sits behind the snare',
    params: [...pattern(), travel('TONE', 34, { note: 'CCW reduces the high frequencies (p.7)' }), level(44)],
  },
  {
    id: 'rd8-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'oh',
    verified: false,
    title: 'Open hat ringing into the next closed hat',
    params: [
      ...pattern(),
      travel('TONE', 82),
      travel('DECAY', 62, { note: 'How long the hat rings; CW for longer (p.7)' }),
      level(52),
    ],
    routing:
      'Programme a closed hat on the step straight after — it cuts the open hat, which is the classic trick (p.9)',
  },
  {
    id: 'rd8-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'oh',
    verified: false,
    title: 'Open hat held long and high-passed into a noise wash',
    params: [
      ...pattern(),
      travel('TONE', 72),
      travel('DECAY', 94, { note: 'The longest tail the voice has (p.7)' }),
      level(46),
      ...fxBus('HPF', 3600, 7, 4, 14),
    ],
    routing:
      'Send the open hat to the FX bus: press SEND, use SELECT to light OPEN HAT, press SEND again (p.12)',
  },

  // ---- Cow bell and cymbal -----------------------------------------------
  {
    id: 'rd8-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'cb',
    verified: false,
    title: 'Cow bell as the metal that is not a hat',
    params: [...pattern(), level(54)],
    routing:
      'The cow bell has one control and it is LEVEL (p.9) — everything else about it happens in the pattern',
  },
  {
    id: 'rd8-metallic-dark',
    role: 'metallic',
    character: 'dark',
    voice: 'cy',
    verified: false,
    title: 'Cymbal darkened and filtered into a metallic bed',
    params: [
      ...pattern(),
      travel('TONE', 30, { note: 'CCW removes high frequency information (p.9)' }),
      travel('DECAY', 84, { note: 'How long the cymbal rings (p.9)' }),
      level(40),
      ...fxBus('LPF', 2600, 4, -3, 12),
    ],
    routing:
      'Send the cymbal to the FX bus: press SEND, use SELECT to light CYMBAL, press SEND again (p.12)',
  },
  {
    id: 'rd8-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'cy',
    verified: false,
    title: 'Cymbal on the first step of the section and nowhere else',
    params: [...pattern(), travel('TONE', 80), travel('DECAY', 90), level(84)],
    articulation: [
      { slot: 'first-hit', set: { accent: true }, hint: 'accent-step', verified: cite(9) },
    ],
  },

  // ---- Toms and congas ---------------------------------------------------
  {
    id: 'rd8-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'lt',
    verified: false,
    title: 'Low tom tuned to the bottom of its travel',
    params: [
      ...pattern(),
      voiceSwitch('lt', 'LOW TOM'),
      travel('TUNING', 16, { note: 'CCW for low sounds (p.9)' }),
      level(64),
    ],
    articulation: [{ slot: 'fill', set: { random: true }, hint: 'random-step', verified: cite(16) }],
  },
  {
    id: 'rd8-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'mt',
    verified: false,
    title: 'Mid tom hit flat and short',
    params: [...pattern(), voiceSwitch('mt', 'MID TOM'), travel('TUNING', 50), level(66)],
    articulation: [
      { slot: 'fill', set: { 'note-repeat': 2 }, hint: 'note-repeat-step', verified: cite(16) },
    ],
  },
  {
    id: 'rd8-tom-bright',
    role: 'tom',
    character: 'bright',
    voice: 'ht',
    verified: false,
    title: 'Hi conga up at the top of its range, answering the snare',
    params: [
      ...pattern(),
      voiceSwitch('ht', 'HI CONGA'),
      travel('TUNING', 82, { note: 'CW raises the pitch (p.9)' }),
      level(62),
    ],
    articulation: [{ slot: 'fill', set: { flam: 10 }, hint: 'flam-step', verified: cite(16) }],
  },
]

// ---------------------------------------------------------------------------
// The device
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'behringer-rd-8',
  name: 'RD-8',
  maker: 'Behringer',
  kind: 'drum-machine',

  /**
   * Both directions, both stated. Receiving: p.17 §11.13 lists the four sync options — `INT`,
   * `MIDI` (taken from the MIDI IN port), `USB`, and `TRIG` (taken from the SYNC IN port).
   * Sending: p.8 (83) `SYNC OUT – SYNC external devices to the Rhythm Designer`, and p.5 says
   * the box *"can also send and receive clock information with highly accurate timing"*.
   *
   * Three transports and each has its own socket or port: `midi-din` at MIDI IN/OUT, `usb` at the
   * type-B port, `analog-clock` at the two 1/8" jacks. p.8 records what is on the analog pair —
   * start/stop on ring and clock on tip — and p.14 §11.3's Analog Clock Mode table gives the
   * rates it will follow: 1, 2, 4, 24 and 48 PPQ, with 24 PPQ called the default there.
   *
   * **`preferredSource` is not claimed (§7.4/#80)**, and the reason is this box's own rather than
   * the RD-9's. p.5 has it leading — *"the RD-8 lets you control external synths and hardware
   * sequencers to create songs without a digital audio workstation (DAW) in sight"* — and the
   * same paragraph gives send and receive in one symmetric sentence. Against that, p.5 also has
   * it following (*"The RD-8 can be controlled by a DAW if required"*), and the only worked
   * hook-up in the book, §15's set-up example on p.24, draws USB to a laptop in both directions
   * and labels neither end as the one that leads. This manual has no DAW Control chapter to
   * settle it the way the RD-9's does.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    /**
     * §7.4/#104. **One setting covers all three**: p.17 §11.13's four options are a single source
     * selector, and `INT` is the one that leaves this box running its own clock. Nothing in the
     * document gates the outputs separately — there is no "clock out on/off" in 30 pages — so
     * SYNC OUT and MIDI OUT carry the clock whenever the box has one to give.
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
        note: 'The same one selector — p.17 lists four sources and no per-port send setting',
      },
      {
        transport: 'analog-clock',
        path: 'Press CYCLE (with the sequencer stopped) until INT is lit',
        value: 'INT',
        note: 'SYNC OUT is a 1/8" jack: clock on tip, start/stop on ring (p.8)',
      },
    ],
  },

  /**
   * p.26's Connectivity block, read straight off it. `main: 'mono'` — there is one `MONO` output,
   * *"1 x 1/4" TRS, servo-balanced"*, and the box has no stereo pair at all. `individualOuts: 11`
   * — *"Voice out  11 x 1/4" TS, unbalanced"*, one per voice, which p.8 §4.1 states again as
   * *"11 independent voice ¼" (6.35 mm) jacks"*. `audioIn: true` is the `RETURN` jack, which p.8
   * describes as summing audio back in after the filter bus.
   *
   * `usbAudio: false`: p.8 §4.2 is explicit — *"The RD-8 is a USB Class Compliant MIDI device"* —
   * and p.26's row reads `USB  Class compliant USB 2.0, type B` under a heading that lists it
   * beside the MIDI ports. p.5 gives the port's purpose as *"sync and midi triggering"*.
   */
  io: { main: 'mono', individualOuts: 11, audioIn: true, usbAudio: false },

  /**
   * §10. 498 mm across. p.26's Physical block gives `Dimensions (H x W x D)  77 x 498 x 265 mm
   * (3.0 x 19.6 x 10.4")`, and the inch conversion confirms the reading — 498 mm is 19.6", which
   * is the W. This is a landscape desktop box played lying flat, so the vendor's W is the
   * playing-orientation horizontal span.
   */
  physical: {
    panelSpanMm: 498,
    verified: cite(26),
  },

  /** §10. Measured off p.24's top view. `panel.ts` documents the figure and the checks. */
  panel: RD8_PANEL,

  jacks: [...JACKS],

  /**
   * §2.6/#22. Every capability claim in this manifest, with the page it was read on.
   *
   * Thirteen of them come through `shared()`, which fails the build if the RD-9 stops making the
   * same claim from the same page of its own book. Two are this box's own and are written out.
   */
  capabilityEvidence: {
    'clock.canSendClock': shared('clock.canSendClock'),
    'clock.canReceiveClock': shared('clock.canReceiveClock'),
    'clock.transport': shared('clock.transport'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.5 has the box leading — "the RD-8 lets you control external synths and hardware sequencers to create songs without a DAW in sight" — and gives send and receive in one symmetric sentence, then says in the same column that it "can be controlled by a DAW if required". The only worked hook-up, §15 on p.24, draws USB in both directions and labels neither end. Nothing in 30 pages states which job it is for',
    },
    'clock.sourceSetup[midi-din]': shared('clock.sourceSetup[midi-din]'),
    'clock.sourceSetup[usb]': shared('clock.sourceSetup[usb]'),
    'clock.sourceSetup[analog-clock]': shared('clock.sourceSetup[analog-clock]'),
    'io.main': shared('io.main'),
    'io.individualOuts': shared('io.individualOuts'),
    'io.audioIn': shared('io.audioIn'),
    'io.usbAudio': shared('io.usbAudio'),
    voices: shared('voices'),
    'features.perStep': shared('features.perStep'),
    /**
     * §2.6/#111. **This box loads nothing**, and p.26's Specifications answer it rather than
     * failing to raise it. The Voices block gives `Number of sounds  16` and `Type  Analog` with
     * no second row, so every sound is a fixed circuit; the Songs and Pattern storage blocks list
     * what the box holds as `16 songs, 16 patterns each` and `64 steps`, which is sequencer data.
     * There is no card slot, no sample import and no audio memory anywhere in 30 pages.
     *
     * So no recipe carries `sourceAudio` and none could: there is nothing to load.
     */
    content: {
      kind: 'cited-against',
      cite: cite(26),
      reason:
        'the Specifications Voices block gives all sixteen sounds as Analog, and the storage blocks list what the box stores as 16 songs of 16 patterns of 64 steps — sequencer data and no audio. There is no card slot, no import path and no sample memory in 30 pages',
    },
    noteDuration: shared('noteDuration'),
    ...JACK_EVIDENCE,
  },

  /**
   * §2.6/#142. A step fires a voice and carries no length. Where a voice has a `DECAY` knob that
   * is what ends it (p.7, control 55: *"Changes the decay time of the voice. Turn CCW for
   * shorter, CW for longer"*), and the five voices with no decay control — rim shot, hand clap,
   * cow bell, closed hat and the congas — ring for as long as their circuit does. The per-step
   * material this box documents adds gestures rather than durations: accent, probability, flam,
   * note repeat and random are all on/off or a count.
   */
  noteDuration: {
    kind: 'trigger',
    reason: 'the voice’s own circuit ends it, and there is no length field on a step',
  },

  /**
   * The eleven voices, labelled with their own VOICE SELECT buttons (p.7, control 58) and listed
   * in p.26's Sound Controls block. Every one is monophonic — one trigger, one sound.
   *
   * **Sixteen sounds on eleven voices** (p.26, `Number of sounds  16` against `Number of
   * simultaneous voices  11 (12 including global accent)`): five columns carry a switch that
   * swaps the tom for a conga, the rim shot for claves and the hand clap for maracas (p.9). The
   * model has no way to express one slot holding two sounds, so the voice is declared once under
   * the name the panel prints first and every recipe on it carries `VOICE SWITCH`.
   *
   * **The closed hat cuts the open hat** — p.9 describes a closed hat programmed straight after
   * an open hat cutting it, *"which is a classic drum machine trick to simulate a real hi-hat"*.
   * The model has no way to express two voices that cannot sound together either, so both are
   * declared and the fact lives here and in `rd8-open-hat-bright`'s routing line.
   *
   * The roles are duties each slot is modelled as taking, not a hardware limit. `sub` on the bass
   * drum is a low `TUNING` and a long `DECAY`; `noise` on the open hat is a long decay through
   * the high-pass; `metallic` on the cow bell and the cymbal is what they are. A voice listing a
   * role it has no recipe for is §3.5's `unvoiced` outcome and is deliberate.
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BASS DRUM', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SNARE DRUM', roles: ['snare', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LOW TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'mt', label: 'MID TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HI TOM', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'rs', label: 'RIM SHOT', roles: ['rim', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'cp', label: 'HAND CLAP', roles: ['clap', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'cb', label: 'COW BELL', roles: ['metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'cy', label: 'CYMBAL', roles: ['metallic', 'impact'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OPEN HAT', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CLOSED HAT', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
  ],

  features: {
    /**
     * The per-step lanes, in this box's own words rather than a shared vocabulary — p.20's
     * Pattern Data table is the exhaustive list, because it is the byte layout: *"Events include
     * Step On/Off, Step Prob on/off, step flam on/off, Step Repeat on/off. Step repeat size"*,
     * with the bit masks spelled out on p.21.
     *
     *  - `accent` — ACCENT is a voice with its own track (p.20's `Accent Step Values (1 - 64)`);
     *    select it and enter steps, and everything on that step is emphasised (p.9)
     *  - `probability` — SETTINGS > PROB (step key 9), select a voice, then the steps (p.16)
     *  - `flam` — SETTINGS > FLAM (step key 10), select a voice, then the steps (p.16)
     *  - `note-repeat` — SETTINGS > RPT (step key 11); 1, 2, 4 or 8 per step (p.16)
     *  - `random` — SETTINGS > RAND (step key 8); marks steps that may fire a random voice from
     *    the selected group (p.16)
     *  - `filter-automation` — SETTINGS > FILTER (step key 6); each of the 64 steps holds a
     *    filter value of 0-255 (p.13, and the `Filter Step Values (1 - 64)` row on p.19)
     *
     * **`velocity` is absent and that is a reading.** p.9 says accent *"can also be programmed
     * via MIDI or USB by using a velocity value of 110 or higher"*, so the box responds to
     * velocity from outside. Nothing on the panel enters one: p.21's bit layout has a single
     * accent-track bit and no level field, and there is no per-step dynamics page anywhere.
     * Claiming it would put a control on this box that only a computer has.
     */
    perStep: ['accent', 'probability', 'flam', 'note-repeat', 'random', 'filter-automation'],
  },

  /**
   * Gestures off the settings chapter (pp.14-17). Jogs, not documentation (invariant 7).
   *
   * `PREFS` is step key 5 here, against p.15's own "Step key 6" — see the module note.
   */
  hints: {
    'accent-step': 'Select ACCENT, then enter the step',
    'voice-switch': 'Flip the switch above the column',
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
   * §12.4. **Left at the default**, as all three 808/909-family boxes in the library are. Eleven
   * voices are always present, always sequenced and always mixed on eleven level knobs; nothing
   * in the document suggests a load at which the box stops being comfortable, and p.26's `Number
   * of simultaneous voices  11` is a capacity rather than a judgement about how many parts belong
   * on it in a rig.
   */

  manual: { title: 'RHYTHM DESIGNER RD-8 User Manual', edition: 'software V1.1.8' },

  productPage: 'https://www.behringer.com/en/products/0704-AAA',

  recipes,
}
