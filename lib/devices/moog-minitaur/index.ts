import type { CapabilityEvidence, Device, JackSignalKind, JackSpec, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'

/**
 * Moog Minitaur (§2.3) — one monophonic analog voice, two oscillators, a Moog ladder filter,
 * two envelopes and an LFO. No keyboard, no sequencer, no arpeggiator: **every note this box
 * plays arrives from somewhere else**, over MIDI or as a gate and a pitch voltage.
 *
 * **Source**: `manuals/Minitaur_Manual.pdf`, 19 PDF pages, © 2012 Moog Music, from
 * [Moog's CDN](https://cdn.inmusicbrands.com/Moog/Minitaur/Minitaur_Manual.pdf) — the same path
 * the Subsequent 37 manual came from. PDF pages 17-19 are a **firmware v2.1 addendum** bound
 * onto the back of the original document; nothing below cites them except where it says so.
 *
 * ## The page offset here is not an offset, it is a spread
 *
 * `manuals/README.md` records the Metropolix as printed folio = PDF page − 1 and the Mother-32
 * as the same. This document is laid out differently and the usual arithmetic does not apply to
 * it: the page box is **792 × 612 pt, landscape letter**, and every PDF page carries **two
 * printed pages side by side**. So
 *
 *     printed 2N-3 (left) and printed 2N-2 (right)  are both on  PDF page N
 *     printed p                                     is on        PDF page floor((p + 3) / 2)
 *
 * Checked against the footers on three spreads rather than derived: PDF 4 foots `5` and `6`,
 * PDF 14 foots `25` and `26`, PDF 16 foots `29` and `30`. **Every citation below is a printed
 * page**, the number a reader sees at the bottom of the sheet, and `pdftotext` on a single PDF
 * page returns *both* of them interleaved — which is why a grep that looks like it found a
 * parameter on the wrong page has probably found it on the facing one.
 *
 * ## What this manual is unusually good at, and the one place it is not
 *
 * **Appendix E, printed p.29, states the range of nearly every control in physical units** —
 * `CUTOFF: 20Hz to 20KHz`, `ATTACK TIME: 1 msec to 30 sec`, `OSCILLATOR 2 Frequency: ± 12
 * Semitones`, `SUSTAIN LEVEL: 0 to 100%`, `LFO RATE: 0.01 to 100Hz`. That is rarer than it
 * sounds and it is worth more than a 0-1023 encoder scale, because a figure in hertz or seconds
 * says what the sound *is* rather than where a number lands. Those ranges are cited on the
 * params below and are what lets mood move this box at all (§3.1's legality gate).
 *
 * **One control's range is a named endpoint rather than a number**, and CLAUDE.md's
 * cited-wrong-range note is about exactly this shape. p.29: `RESONANCE: 0 to Self-Oscillation`.
 * There is no figure at the top of that travel, so `RES` is `travel()` — percent of the knob,
 * provisional on both claims, and deaf to mood — rather than a number with a made-up ceiling.
 * The CRAVE's `lo/mix 1 to hi/mix 2` is the same shape and is handled the same way.
 *
 * ## The knobs are unmarked, and only one of them is not
 *
 * The front panel (printed p.6) is a tick ring per knob and no numbers, with **exactly one
 * exception**: `CUTOFF` is silkscreened `20Hz`, `80Hz`, `320Hz`, `1.2KHz`, `5KHz`, `20KHz`, so a
 * figure in hertz is a number a reader can actually find on the panel in front of them.
 * Everything else carries its cited range because the *document* states it, not because the
 * *panel* prints it — a reader setting `AMPLIFIER DECAY/RELEASE` to `0.4 s` is setting it by ear
 * against a stated end-to-end range, and the note on each such param says so. Two knobs carry a
 * centre detent worth naming instead of a number, and the panel marks both with `−` and `+`:
 * `VCO 2 FREQ` (centre is unison, p.9) and `EG AMOUNT` (centre is no envelope, p.13).
 *
 * The one landmark the manual does give for an unmarked knob is a good one and is used below:
 * *"The VCOs begin to clip the filter at about 2 o'clock creating more aggressive sounds"*
 * (p.11). That is where `grit` pushes the oscillator levels.
 *
 * ## Clock: `cited-against`, which is rare and is the strongest answer available
 *
 * The MIDI implementation chart on printed p.25 has a row for it, and the row answers:
 *
 *     SYSTEM REAL TIME
 *              Clock          NO           YES     Receives Timing Clock
 *
 * Transmitted **no**, recognised **yes**. So `canSendClock: false` is not an author declining to
 * look — it is a document saying no, recorded as `cited-against` with the page (§2.6). The
 * receive half is corroborated on p.16, where `LFO MIDI SYNC ON/OFF (CC# 87)` is *"the ability
 * of the Minitaur's LFO to sync to MIDI Clock messages"* and defaults to ON.
 *
 * Clock arrives over both wires — DIN `MIDI · IN` and `USB MIDI` — so `transport` lists both and
 * `receiveTransport` is omitted, which means all of them. `sendTransport` is moot: §2.3's
 * `sendTransports()` returns nothing for a box that cannot send, whatever the list says.
 *
 * ## No panel, and the aspect check is why
 *
 * §10 wants a drawn panel and printed p.6 has a fully-labelled front-panel figure, so this
 * looked like the DFAM case. It is not. The skill's rule is to **check the aspect before
 * believing either number**, and this figure fails it:
 *
 *     drawn panel border, measured at 300 dpi     1184.5 x 748.0 px    aspect 1.5836
 *     222.3 / 130.2  (width / depth, the top face)                     aspect 1.7074
 *     222.3 /  79.4  (width / height)                                  aspect 2.7997
 *     130.2 /  79.4  (depth / height)                                  aspect 1.6398
 *
 * No pair of the specification's three dimensions (p.30) produces the drawn aspect, and the
 * scale factors disagree by 8% between the axes — 2.216 in/px horizontally against 2.053
 * vertically. A drawing that were to scale would give one factor. This one is an illustration
 * in the OVERVIEW chapter rather than the DFAM's 1:1 blank patch sheet, and there is no second
 * document here to fall back on the way the Subsequent 37 falls back on its Quickstart poster.
 *
 * Backing out a rise from the drawn aspect would give 222.3 / 1.5836 = 140.4 mm, which is deeper
 * than the whole box; assuming instead that the top face is inset from the stated depth would
 * give about 120.8 mm, which is a number no page states and which `PanelLayout.verified` would
 * then have to cite. Both are estimates wearing a measurement's clothes, and §10's standard is
 * explicit that a panel with estimated coordinates is worse than no panel at all, because it
 * looks exactly like the ones that were done properly. So `panel` is omitted and the rack falls
 * back to the generated panel built from the jacks and voice below.
 *
 * ## The manual contradicts itself about octave naming, on one page
 *
 * Printed p.9 says the highest pitch is *"C5 (523.25 Hz) or MIDI note value 72"*, and eleven
 * lines later says *"the pitch of VCO 2 is limited to note 72 (C4)"*. Both name MIDI 72; they
 * disagree about what to call it. 523.25 Hz is the arbiter — that is C5 where middle C is C4,
 * which is §8's convention and the one `render.ts` states in the guide ("Octaves put middle C at
 * C4"). Moog's own house convention puts middle C at C3, which is where the `C4` came from.
 * Recorded rather than smoothed over, because a reader checking our note names against this
 * manual will hit it.
 *
 * ## What this box cannot be given, and why the role list is short
 *
 * **MIDI notes 0-72** (p.5, p.9): it sounds nothing above C5. That is a real ceiling and the
 * engine has no field for it — `Assignable` carries `roles` and `polyphony` and no pitch range —
 * so the protection here is the role list rather than a capability check. `lead` is deliberately
 * **not** offered: a lead hook authored at `baseOctave` 4 or 5 would resolve to notes this box
 * silently will not play, and a guide that assigns a part the hardware drops is worse than a
 * guide that reports a gap (invariant 5). The five roles below all sit in the bottom two octaves
 * where a bass synth belongs, so the ceiling cannot be reached from any of them.
 *
 * That is a finding rather than a workaround, and it is filed as one: a voice's **pitch range**
 * is as real a constraint as its polyphony, and nothing in §2.2 can say it.
 *
 * ## No sequencer, and the guide's phase 5 assumes one
 *
 * There is no internal sequencer and no arpeggiator on this box — p.9's first sentence is that
 * it *"responds to MIDI messages on both DIN and USB MIDI Inputs"*, and that is the whole of how
 * it is played. §8 phase 5 renders a step pattern per part, which for this box is a pattern to
 * enter **on whatever is driving it**. That is #65's open problem (*"the guide assumes every
 * part is step-programmed"*) and this device is another instance of it, not a new one. No
 * `features.perStep` is declared, because per-step lanes are a property of a sequencer this box
 * does not have.
 */

/**
 * The manual, by **printed** page — see the spread arithmetic in the header. `Minitaur Manual`
 * is what the document calls itself on its own cover.
 */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Minitaur Manual, p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared socket on the back panel (§3.3). The page is where the manual describes *this* jack.
 *
 * Ids are qualified with the panel's own bracket legends, which printed p.18's figure draws as
 * headers over groups of sockets: `AUDIO` over `OUT` and `IN`, and `CONTROLLER INPUTS` over
 * `PITCH CV`, `FILTER CV`, `VOLUME CV` and `GATE`. §3.3 wants the panel's word and that is it.
 *
 * The qualifier also decides something load-bearing, exactly as it did on the Mother-32: the
 * pitch input and the gate input have to land in **one** section for §7's voice-control pass to
 * see them as a bundle, or nothing in a rig could ever be wired up to play this box — which is
 * the entire point of a synthesizer with no keyboard. Under `CONTROLLER INPUTS ·` they do.
 */
function jack(
  id: string,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  note?: string,
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...(note === undefined ? {} : { note }) }
}

/**
 * The back panel, left to right as printed p.18 draws it.
 *
 * **The headphone output is deliberately absent.** It is silkscreened as a pictogram with no
 * text at all, so there is no panel word to qualify an id with, and it is a monitoring output
 * rather than a patch point — nothing in a rig is wired *from* it. `io.main` already says this
 * box leaves by one mono output.
 *
 * **`MIDI · IN` and `USB MIDI` are absent too**, on the CRAVE's convention: those are ports, not
 * patch points, and `clock.transport` already carries both. `USB MIDI` could not be declared
 * honestly in any case — `JackSpec.direction` is one of `in` or `out`, and printed p.18 calls
 * that socket *"USB MIDI IN-OUT"*.
 */
const JACKS: readonly JackSpec[] = [
  jack('AUDIO · OUT', 'out', ['audio'], 18, 'Unbalanced line level, 1/4" TS'),
  jack('AUDIO · IN', 'in', ['audio'], 18, 'Mixes with the VCOs ahead of the filter; +4dBu line level'),
  jack('CONTROLLER INPUTS · PITCH CV', 'in', ['pitch-cv'], 18, 'Both oscillators, at 1V/octave; 0 to +5 V'),
  jack('CONTROLLER INPUTS · FILTER CV', 'in', ['cv'], 18, 'Adds to the CUTOFF setting, about one octave per volt'),
  jack('CONTROLLER INPUTS · VOLUME CV', 'in', ['cv'], 18, '0 V silences it; +5 V is the level the VOLUME knob is set to'),
  jack('CONTROLLER INPUTS · GATE', 'in', ['gate'], 18, 'A +5 V trigger; fires both envelopes and overrides MIDI triggering'),
]

// ---------------------------------------------------------------------------
// §3.1/§3.2 Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A control whose **range** the document states, in the unit the document states it in.
 *
 * The range is cited and the point is not (§3.1's two claims): Appendix E says how far the knob
 * goes, and where in that travel this recipe wants it is taste. A verified range is also what
 * lets mood move the value at all, which on this box is most of what mood has to work with.
 */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  where: Cite,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: where },
    verified: false,
    ...extra,
  }
}

/**
 * A knob position on a control with **no stated range**, as percent of travel.
 *
 * Two of them on this box, and each for its own reason: `RES`, whose printed range ends at
 * "Self-Oscillation" rather than at a number (p.29), and `VOLUME`, which Appendix E lists as
 * `MASTER VOLUME` with no range beside it. Both claims are unverified and both render that way —
 * the point is uncited so the guide marks it provisional (§3.2), and `range.verified` is `false`
 * so mood may not move a figure nobody checked. `% travel` is a fact about a knob anyone can
 * see; it is not a claim that the box displays 0-100.
 */
function travel(
  name: string,
  value: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
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

/** §3.2: the option set is legality and is cited; the selection is authority and is taste. */
function pick(
  name: string,
  value: string,
  options: readonly string[],
  where: Cite,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...options], verified: where },
    verified: false,
    ...extra,
  }
}

/** Both oscillator switches offer the same two shapes: Sawtooth (LED off) or Square (LED on). */
const WAVES = ['Sawtooth', 'Square'] as const

/** printed p.11's `RELEASE` switch, and p.15's description of what it does to both envelopes. */
const ON_OFF = ['On', 'Off'] as const

// Ranges, every one from Appendix E on printed p.29 unless noted.
const PERCENT = { min: 0, max: 100 }
/** `FILTER ENV. AMOUNT: -100% TO +100%` — bipolar, centre detent is no envelope at all. */
const BIPOLAR_PERCENT = { min: -100, max: 100 }
/** `OSCILLATOR 2 Frequency: ± 12 Semitones`, corroborated as "+/-1 octave" on p.9. */
const SEMITONES = { min: -12, max: 12 }
/** `CUTOFF: 20Hz to 20KHz`, and the only range this panel also silkscreens (p.6). */
const CUTOFF_HZ = { min: 20, max: 20000 }
/** `ATTACK / DECAY / RELEASE TIME: 1 msec to 30 sec`, written in seconds. */
const SECONDS = { min: 0.001, max: 30 }
/** `LFO RATE WITH RATE LED: 0.01 to 100Hz`. */
const LFO_HZ = { min: 0.01, max: 100 }

/** The note that travels with every time in seconds, since the knob prints no scale. */
const TIME_NOTE = '1 ms fully anticlockwise to 30 s fully clockwise; set it by ear'

/**
 * The eight controls every recipe sets, in panel order: the two oscillators and their levels,
 * the filter, and the filter envelope. Written once because every recipe sets all of them —
 * this is a one-knob-per-function box with nothing hidden in a menu, so a recipe that left a
 * knob out would be leaving it wherever the last patch put it.
 */
function core(
  wave1: (typeof WAVES)[number],
  wave2: (typeof WAVES)[number],
  detune: number,
  lvl1: number,
  lvl2: number,
  cutoffHz: number,
  res: number,
  egAmount: number,
): AuthoredParam[] {
  return [
    pick('OSCILLATOR 1', wave1, WAVES, cite(9), {
      note: 'The switch LED is off for Sawtooth and on for Square',
    }),
    pick('OSCILLATOR 2', wave2, WAVES, cite(9)),
    num('VCO 2 FREQ', detune, SEMITONES, cite(29), {
      unit: 'st',
      note: 'Centre is unison with VCO 1; the panel marks only − and +',
    }),
    num('VCO 1 LVL', lvl1, PERCENT, cite(29), {
      unit: '%',
      mood: [{ axis: 'grit', amount: 3 }],
      hint: 'Past 2 o’clock it clips the filter',
    }),
    num('VCO 2 LVL', lvl2, PERCENT, cite(29), {
      unit: '%',
      mood: [{ axis: 'grit', amount: 3 }],
      // p.11, and the only landmark this manual gives for an unmarked knob.
      note: 'The VCOs begin to clip the filter at about 2 o’clock, which is where grit pushes them',
    }),
    num('CUTOFF', cutoffHz, CUTOFF_HZ, cite(29), {
      unit: 'Hz',
      mood: [{ axis: 'darkness', amount: -1200 }],
      note: 'The one knob on this panel with a printed scale: 20Hz, 80Hz, 320Hz, 1.2KHz, 5KHz, 20KHz',
    }),
    travel('RES', res, {
      // The named-endpoint trap, recorded on the value it applies to.
      note: 'p.29 gives this range as "0 to Self-Oscillation" — a named endpoint, not a number, so this is percent of travel',
    }),
    num('EG AMOUNT', egAmount, BIPOLAR_PERCENT, cite(29), {
      unit: '%',
      note: 'How much the filter envelope adds to or subtracts from CUTOFF; centre is none',
    }),
  ]
}

/** The two envelopes, filter first then amplifier, exactly as the panel stacks them (p.6). */
function envelopes(
  fAttack: number,
  fDecay: number,
  fSustain: number,
  aAttack: number,
  aDecay: number,
  aSustain: number,
  release: (typeof ON_OFF)[number],
): AuthoredParam[] {
  return [
    num('FILTER ATTACK', fAttack, SECONDS, cite(29), { unit: 's', note: TIME_NOTE }),
    num('FILTER DECAY/RELEASE', fDecay, SECONDS, cite(29), {
      unit: 's',
      note: 'One knob for both segments — which one you hear is the RELEASE switch below',
    }),
    num('FILTER SUSTAIN', fSustain, PERCENT, cite(29), { unit: '%' }),
    num('AMPLIFIER ATTACK', aAttack, SECONDS, cite(29), { unit: 's', note: TIME_NOTE }),
    num('AMPLIFIER DECAY/RELEASE', aDecay, SECONDS, cite(29), {
      unit: 's',
      mood: [{ axis: 'density', amount: 0.05 }],
      note: 'One knob for both segments — which one you hear is the RELEASE switch below',
    }),
    num('AMPLIFIER SUSTAIN', aSustain, PERCENT, cite(29), { unit: '%' }),
    pick('RELEASE', release, ON_OFF, cite(29), {
      // p.15: the switch is the whole of the release stage on this box.
      note: 'On, the release time equals the decay time; off, the envelope stops dead at note-off',
    }),
  ]
}

/**
 * The modulation section. Every recipe sets it, and most set it to nothing — an LFO amount left
 * where the last patch put it is a wobble nobody asked for, and p.16 warns that on power-up
 * these two knobs act directly until a Mod Wheel message arrives.
 */
function mod(rateHz: number, toVco: number, toVcf: number): AuthoredParam[] {
  return [
    num('LFO RATE', rateHz, LFO_HZ, cite(29), { unit: 'Hz' }),
    num('VCO LFO AMT', toVco, PERCENT, cite(29), {
      unit: '%',
      note: 'Up to ±1 octave of pitch at full travel (p.16)',
    }),
    num('VCF LFO AMT', toVcf, PERCENT, cite(29), {
      unit: '%',
      note: 'Up to ±5 octaves of cutoff at full travel (p.16)',
    }),
  ]
}

/** Glide, which is off on most of these and is the Taurus gesture on the acid lines (p.11). */
function glide(on: (typeof ON_OFF)[number], rate: number): AuthoredParam[] {
  return [
    pick('GLIDE', on, ON_OFF, cite(29)),
    num('GLIDE RATE', rate, PERCENT, cite(29), {
      unit: '%',
      note: 'Instantaneous fully anticlockwise to extremely long fully clockwise (p.11)',
    }),
  ]
}

/** The output stage. Appendix E lists `MASTER VOLUME` with no range, so it is percent of travel. */
function out(volume: number): AuthoredParam[] {
  return [
    travel('VOLUME / 🎧', volume, {
      note: 'Post-VCA, and it sets the headphone level at the same time (p.17)',
    }),
  ]
}

// ---------------------------------------------------------------------------
// §3 Recipes
// ---------------------------------------------------------------------------

/**
 * Five roles, all of them in the bottom two octaves. See the header for why `lead` is not among
 * them: this box sounds nothing above MIDI 72 and nothing in the model can say so, so the role
 * list is the guard.
 *
 * Ordered best-first, because `roleFitPenalty` (§7.1) is the role's index in this list — a rig
 * with something else that plays `stab` should give this box the sub and take the stab elsewhere.
 */
const VOICE_ROLES: readonly Role[] = ['sub', 'bass-mid', 'acid', 'stab', 'kick']

const recipes: Recipe[] = [
  // ---- sub -------------------------------------------------------------------------------
  {
    id: 'minitaur-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'One oscillator under the filter, nothing above it',
    routing: 'One VCO only — VCO 2 is down, so there is nothing to beat against and the pitch is dead still.',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 80, 5, 0),
      ...envelopes(0.001, 0.4, 100, 0.005, 0.6, 100, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Square fundamental, filter open enough to keep the edge honest',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 320, 0, 0),
      ...envelopes(0.001, 0.3, 100, 0.003, 0.5, 100, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-sub-hard',
    role: 'sub',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Short sub with the filter envelope snapping shut behind it',
    params: [
      ...core('Square', 'Sawtooth', 0, 100, 0, 80, 20, 45),
      ...envelopes(0.001, 0.12, 0, 0.001, 0.18, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(72),
    ],
  },
  {
    id: 'minitaur-sub-soft',
    role: 'sub',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Slow swell, no transient at all',
    params: [
      ...core('Square', 'Square', 0, 95, 0, 200, 0, 20),
      ...envelopes(0.6, 1.5, 90, 0.8, 2, 95, 'On'),
      ...mod(0.2, 0, 4),
      ...glide('Off', 0),
      ...out(68),
    ],
  },

  // ---- bass-mid --------------------------------------------------------------------------
  {
    id: 'minitaur-bass-mid-hard',
    role: 'bass-mid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Two sawtooths a hair apart, filter envelope on every note',
    routing:
      'VCO 2 is one semitone sharp rather than in unison — the beat is what fills the mid, and it costs nothing.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 1, 85, 70, 320, 25, 55),
      ...envelopes(0.001, 0.25, 20, 0.002, 0.35, 30, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Both oscillators past two o’clock, clipping the filter on purpose',
    routing:
      'Both levels are pushed past the point p.11 says the VCOs start clipping the filter. That clipping is the sound here, not a fault.',
    params: [
      ...core('Sawtooth', 'Sawtooth', -12, 95, 95, 320, 40, 50),
      ...envelopes(0.001, 0.3, 25, 0.002, 0.4, 35, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(65),
    ],
  },
  {
    id: 'minitaur-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Octave-down square, filter low and static',
    params: [
      ...core('Square', 'Square', -12, 80, 80, 200, 10, 10),
      ...envelopes(0.001, 0.5, 60, 0.005, 0.6, 60, 'On'),
      ...mod(0.4, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-bass-mid-clean',
    role: 'bass-mid',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'One sawtooth, no resonance, nothing in the way',
    params: [
      ...core('Sawtooth', 'Square', 0, 100, 0, 1200, 0, 25),
      ...envelopes(0.001, 0.3, 40, 0.002, 0.4, 45, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },

  // ---- acid ------------------------------------------------------------------------------
  {
    id: 'minitaur-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Ladder filter near self-oscillation, glide between every note',
    routing:
      'Glide is on and the rate is short — p.11 offers EXP as the Taurus curve, "fast and then slows as it approaches the target note", but that is a MIDI-only setting (CC# 92) and cannot be reached from the panel.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 0, 90, 0, 320, 78, 70),
      ...envelopes(0.001, 0.14, 0, 0.001, 0.22, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('On', 12),
      ...out(68),
    ],
  },
  {
    id: 'minitaur-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Thinner line, cutoff up and the envelope doing the shape',
    params: [
      ...core('Sawtooth', 'Square', 0, 80, 0, 1200, 65, 60),
      ...envelopes(0.001, 0.1, 0, 0.001, 0.16, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('On', 8),
      ...out(68),
    ],
  },
  {
    id: 'minitaur-acid-hard',
    role: 'acid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Every note the same length, filter slammed shut behind each one',
    params: [
      ...core('Sawtooth', 'Sawtooth', 0, 95, 0, 200, 70, 85),
      ...envelopes(0.001, 0.08, 0, 0.001, 0.12, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },

  // ---- stab ------------------------------------------------------------------------------
  {
    id: 'minitaur-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'One note, gone before the next beat',
    routing:
      'One note is all this is — the box is monophonic, so a stab here is a single pitch and the rig has to find its chord elsewhere.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 7, 90, 60, 320, 45, 75),
      ...envelopes(0.001, 0.06, 0, 0.001, 0.09, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-stab-dirty',
    role: 'stab',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'A fifth apart and both oscillators overdriving the filter',
    params: [
      ...core('Sawtooth', 'Square', 7, 95, 95, 200, 55, 70),
      ...envelopes(0.001, 0.07, 0, 0.001, 0.1, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(64),
    ],
  },

  // ---- kick ------------------------------------------------------------------------------
  {
    id: 'minitaur-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Filter thump — the weight is the envelope, not a pitch drop',
    routing:
      'There is no envelope route to the oscillators on this box: `EG AMOUNT` reaches the filter and nothing reaches pitch, so this is a filter thump rather than the pitch-drop kick a synth with a pitch envelope makes. It is solid and it is low; it will not click.',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 80, 55, 90),
      ...envelopes(0.001, 0.05, 0, 0.001, 0.09, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(75),
    ],
  },
  {
    id: 'minitaur-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Longer thump with the filter barely open',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 20, 40, 70),
      ...envelopes(0.001, 0.09, 0, 0.001, 0.14, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(75),
    ],
  },
]

export const device: Device = {
  id: 'moog-minitaur',
  name: 'Minitaur',
  maker: 'Moog',
  /**
   * `synth` rather than `semi-modular`. The four `CONTROLLER INPUTS` accept control voltage, but
   * they are **inputs only** — there is no patchbay, nothing on this box outputs a voltage, and
   * so no cable can be run from one point on it to another. §2.3's `semi-modular` means a
   * normalised instrument you can re-route; this is a sound module you can drive.
   */
  kind: 'synth',
  clock: {
    // p.25's implementation chart: Clock transmitted NO, recognised YES. See the header.
    canSendClock: false,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
  },
  /** p.30: one mono 1/4" out, a mono 1/4" in, and USB that carries MIDI only — never audio. */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },
  physical: {
    // p.30: 8.75" x 5.12" x 3.12" (222.3mm x 130.2mm x 79.4mm). The span is the width.
    panelSpanMm: 222.3,
    verified: cite(30),
  },
  // No `panel` — see the header. The figure on p.6 is not to scale and nothing else here is.
  jacks: [...JACKS],
  capabilityEvidence: {
    ...JACK_EVIDENCE,
    voices: cite(29),
    'io.main': cite(30),
    'io.audioIn': cite(30),
    'clock.canReceiveClock': cite(25),
    /**
     * The rare one. p.25's MIDI implementation chart prints `Clock | NO | YES | Receives Timing
     * Clock` — transmitted no. That is a document answering the question in the negative, which
     * is `cited-against` rather than `unknown`, and it carries the page (§2.6).
     */
    'clock.canSendClock': {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'the MIDI implementation chart’s SYSTEM REAL TIME row prints Clock as TRANSMITTED = NO and RECOGNIZED = YES, with the remark "Receives Timing Clock". The box has no sequencer, no arpeggiator and no other time source, and its MIDI output carries Control Change from the panel knobs (p.9) rather than a clock',
    },
    'clock.preferredSource': {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'a box that cannot transmit clock cannot be a rig’s clock source, and p.25 says it cannot. This is not the usual "no page states what this box is for in a rig" — the question is settled one level down, by the capability rather than by the intent',
    },
    'features.lfo': cite(16),
    'features.perStep': {
      kind: 'cited-against',
      cite: cite(9),
      reason:
        'there is no sequencer and no arpeggiator to have per-step lanes. p.9 opens by saying the box "responds to MIDI messages on both DIN and USB MIDI Inputs", the contents list no sequencer chapter, and Appendix E’s synth engine section (p.29) lists oscillators, filter, envelopes and modulation and nothing else',
    },
    'features.sidechain.internal': {
      kind: 'cited-against',
      cite: cite(29),
      reason:
        'Appendix E’s synth engine list has no compressor, ducker or envelope follower, and the VOLUME CV input (p.17) takes a voltage from outside rather than deriving one from audio',
    },
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at AUDIO · IN and mixes it into the filter (p.18), and the VOLUME CV jack could duck it from a voltage — but nothing on this box turns audio into that voltage, and no page states either way, so this is a reading of the jack list rather than an answer the document gives',
    },
    noteDuration: {
      kind: 'cited-against',
      cite: cite(9),
      reason:
        'note length is set by whatever is driving the box, because nothing on the box sets it: there is no sequencer with a gate-length lane, and p.9 describes every note as arriving as a MIDI message or a Gate voltage whose duration is the sender’s',
    },
  },
  manual: { title: 'Minitaur Manual', edition: '©2012 Moog Music' },
  /**
   * One monophonic analog voice (p.29: "TYPE: Programmable Monophonic Analog Bass Synthesizer").
   * Two oscillators, but they are one voice — both follow the same note.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 1 }],
  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,
  hints: {
    'midi-only': 'MIDI CC only — not on the panel',
    'centre-detent': 'Centre is the neutral position',
  },
  recipes,
}
