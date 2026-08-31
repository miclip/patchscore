import type { CapabilityEvidence, Device, JackSignalKind, PatchEntry, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import { MODEL_D_PANEL, MODEL_D_PANEL_SPAN_MM } from './panel'

/**
 * Behringer MODEL D (§2.3). Three oscillators, a 24 dB/octave ladder filter switchable low- or
 * high-pass, two contour generators, one triangle/square LFO, a noise source and an external
 * input that feeds back on itself — **one monophonic analog voice, and a famous one**, since this
 * is a circuit-level homage to the 1970 Minimoog Model D.
 *
 * ## Source
 *
 * `manuals/MODEL_D_M_EN.pdf`, 44 pages, English throughout, © 2018 MUSIC Group. From
 * [archive.org](https://archive.org/download/behringer_model_d_user_manual_en) — the MusicTribe
 * CDN does not resolve, which `manuals/README.md` records for every Behringer document here.
 *
 * **Pagination is the easy case.** The folio is printed in the header and equals the PDF page;
 * checked on five spreads rather than assumed — PDF 5 heads `5`, PDF 12 heads `12`, PDF 15 heads
 * `15`, PDF 22 heads `22`, PDF 30 heads `30`. Every citation below is that number.
 *
 * ## The README undersold this manual, and the reason is worth keeping
 *
 * `manuals/README.md` records it as *"44pp / 97k chars / **3 ranges**. Longest of the four and the
 * emptiest of numbers — a Minimoog clone documented in prose. Expect a manifest that is mostly
 * provisional."* That count came from a regex over a text dump, and it is wrong about the
 * document: **printed p.34 is a full Specifications chapter that gives a range for every knob and
 * every switch on the panel**, plus an electrical line for all fifteen 3.5 mm sockets. The regex
 * missed it because the chapter is a two-column table whose cells run `Cutoff frequency: -4 to
 * +4` — a colon and a hyphen, not the `A to B Hz` shape the counter was looking for.
 *
 * This is the skill file's standing warning arriving from an unusual direction: a grep over a text
 * dump is not evidence a manual is silent, and here it was not even evidence about how many
 * numbers it holds. The page was rendered and read (`pdftoppm -r 200`) before any value below was
 * written, and the extraction was checked against the render cell by cell.
 *
 * So most of this manifest's numbers carry a legality claim. What stays provisional is every
 * *point* — no page of this document says where to set a knob for a sound, and the one page that
 * prints knob positions sets them all to a calibration jig (p.15).
 *
 * ## Four printed scales, and only one of them is 0 to 10
 *
 * CLAUDE.md's warning is that a cited range can still be the wrong range. This panel carries four
 * different scales and they sit side by side:
 *
 *  - **`0 to 10`** — the volumes, `GLIDE`, `MOD DEPTH`, `LFO RATE`, `FILTER EMPHASIS`, both
 *    `AMOUNT OF CONTOUR` knobs, both `SUSTAIN` knobs and both output volumes.
 *  - **`-4 to +4`** — `CUTOFF FREQUENCY`, and nothing else. The knob is silkscreened `-4 -2 2 4`
 *    (p.40) and p.34 agrees.
 *  - **semitones** — `TUNE` at `-2 to +2` and the two `FREQUENCY` knobs at `-7 to +7`. p.12 is
 *    what makes them semitones and hedges while doing it: *"The TUNE knob and OSCILLATOR-2 and -3
 *    FREQUENCY knobs are marked in units of semitones as a general guide."* The hedge is on the
 *    note of each such param rather than smoothed away.
 *  - **milliseconds and seconds** — all four `ATTACK` and `DECAY` knobs. The silkscreen runs
 *    `10 200 600 M-SEC` up one side and `1 5 10 SEC` down the other (p.40), and p.34 states the
 *    travel end to end. These are authored in **ms**, which is the unit the panel itself prints.
 *
 * A `MOD MIX` of `6` and a `CUTOFF FREQUENCY` of `6` would look like the same kind of number and
 * only one of them exists, which is why each range below names the scale it came off.
 *
 * ## Three controls whose value means nothing without the switch beside it
 *
 * Handled the way CLAUDE.md prescribes — **the recipe carries the switch, so the pairing cannot
 * come apart**:
 *
 *  1. **`OSC 3 FREQUENCY` and `OSC 3 CONTROL`.** p.8 item (6): `TUNE` adjusts all three
 *     oscillators *"(OSC3 is not affected if the OSC3 CONTROL switch is off.)"*, and p.9 item
 *     (13) adds that with it off *"the keyboard, Pitch wheel, and Modulation wheel, will have no
 *     effect on OSC 3"*. A semitone figure for OSC 3 is a different claim under each. `osc3()`
 *     emits `RANGE`, `CONTROL`, `FREQUENCY` and `WAVEFORM` together and there is no way to author
 *     one without the others.
 *  2. **`MOD MIX` and its two source switches.** p.13 §4.8: *"First set the 2 switches to choose
 *     from internal LFO or internal Noise, OSC 3 or the filter envelope, and then use the MOD MIX
 *     knob to vary the mix between them."* The knob's two ends are named after whatever those
 *     switches select, so `modulation()` emits all three.
 *  3. **`EXT IN VOLUME` and what is plugged into `EXT`.** p.12 §4.4.1 is unambiguous: *"If
 *     nothing is connected to the external input, then instead of any external audio coming in at
 *     this point, the main MODEL D output is automatically connected here. This creates a feedback
 *     path from the output back into the mixer section, to get extra phat bass or extra crunch. In
 *     this case, the EXT IN volume control will adjust the level of the incoming main audio fed
 *     back into the mixer section."* Same knob, two jobs. `extIn()` takes which one it is doing
 *     and says so on the note; every recipe below uses the feedback reading, and no recipe patches
 *     `EXT`. `test/behringer-model-d.test.ts` holds that pairing rather than a comment.
 *
 * ## `MOD MIX` is percent of travel, because its ends are words
 *
 * p.34 gives it as `Modulation mix: (OSC 3 or filter EG) to (noise/ext mod source, or LFO)` — no
 * figures at all — and the panel confirms it, printing `2 4 6 8` with the two source names where
 * `0` and `10` sit on every neighbouring knob. So it goes through `travel()`: percent of knob
 * travel, **both claims unverified**, exactly as the Minitaur's `0 to Self-Oscillation` resonance
 * and the CRAVE's `lo/mix 1 to hi/mix 2` do. `% travel` is a fact about a knob anybody can see; it
 * is not a claim that the box displays 0-100.
 *
 * ## Where the grit comes from, and why it is a mixer control
 *
 * This box has no overdrive stage. Its dirt is the feedback path above — `EXT IN` switched on
 * with nothing in the socket, so the main output re-enters the mixer — and p.12 adds the part
 * that makes it a two-knob gesture: *"The level is still dependent on the setting of the main
 * output volume knob (44) and the position of the main ON switch (47)."* So the recipes that want
 * crunch carry `MAIN VOLUME` beside `EXT IN VOLUME` and the `grit` mood axis lands on both, and
 * the recipes that do not want it carry neither.
 *
 * ## Four places this manual contradicts itself
 *
 * Recorded rather than smoothed over, the way the Subsequent 37's six and the Neutron's six are.
 *
 *  1. **The calibration table sets a knob to a position its own scale does not have.** p.15's
 *     *Control Settings for Calibration* lists `CUTOFF FREQ  5` — on the knob p.34 and the p.40
 *     silkscreen both give as `-4 to +4`. The drawn pointer in the same figure on the same page
 *     sits near `-3`, so the table agrees with neither the scale nor the drawing beside it. **No
 *     value below is taken from that table**, and `CUTOFF FREQUENCY` is authored on the `-4 to
 *     +4` scale throughout.
 *  2. **A sixth waveform with two names.** p.5 and p.34 both list `wide pulse`; p.9 item (16)
 *     lists *"medium pulse"* in the same position of the same list. Two pages against one, and
 *     the option sets below are p.34's — the page whose job is ranges — with the other name on
 *     the note.
 *  3. **`TS` or `TRS` on the rear outputs.** p.11 item (50) calls them *"these ¼" TRS outputs"*;
 *     p.34 specifies `High output  1/4" TS, unbalanced` and `Low output  1/4" TS, unbalanced`.
 *     The specification wins, and both are recorded on the jack notes. What both pages agree on
 *     is that they are mono and not a stereo pair — p.11 says so in as many words.
 *  4. **`DECAY` names two different controls in each contour section.** The panel prints `DECAY`
 *     over a knob and `FILTER DECAY` / `LOUD DECAY` beside a switch; p.10 item (30) resolves it by
 *     calling the knob `DECAY TIME` and the switch `DECAY`. This file follows p.10 —
 *     `FILTER DECAY TIME` and `LOUDNESS DECAY TIME` for the knobs, `FILTER DECAY` and
 *     `LOUD DECAY` for the switches — so a reader is never told to set two controls with one name.
 *
 * ## Clock: neither direction, and no page of this manual says so
 *
 * There is **no MIDI implementation chart in this document** — the whole MIDI chapter (§7,
 * pp.30-33) is SysEx, and the only occurrence of *"MIDI Clock"* in forty-four pages is the
 * glossary definition on p.37. So nothing here is settled by the page that usually settles it,
 * and all three clock facts are `unknown` in `capabilityEvidence` below rather than
 * `cited-against` (§2.6/#120).
 *
 * **Two of the three were `cited-against` first, and the correction is the interesting part.**
 * (`canSendClock` was `unknown` from the start, on its own USB-shaped reason.) p.34's
 * Synthesizer Architecture block lists what this box contains and nothing on it is tempo-driven —
 * no sequencer, no arpeggiator, no delay, and an LFO given as a free-running range with a CV
 * input. That reading is sound and it is why `canReceiveClock` is `false`. What it is not is a
 * page answering the question: an omission from a list of contents is an absence, and
 * `cited-against` is for a document that addresses the question and comes back negative — the
 * Minitaur's implementation chart printing `Clock | NO | YES`. Reporting an inference as a
 * citation overstates what was read, which is the failure `unknown` exists to prevent.
 *
 * ## What is not modelled
 *
 * **No sequencer, no arpeggiator, no keyboard.** p.34's architecture list has none of them and
 * p.12 §4.3 has the reader connecting *"the MIDI OUT output of an external MIDI keyboard"*. So
 * `patternEntry` is `external`, no recipe carries `articulation`, `features.perStep` is absent,
 * and **`swing` is one of the two mood axes this box declines** — nothing on it decides where a
 * note falls. `space` is the other, and for the plainer reason that there is no delay, no reverb
 * and no ambience control anywhere on the panel.
 *
 * **Poly Chain is out of scope, deliberately.** p.29 §6.4 wires up to sixteen MODEL Ds into one
 * polyphonic instrument, and it is the only patch this manual actually instructs. But it is a
 * claim about *several* of these boxes, and `voices` describes one — a guide cannot promise
 * sixteen-note polyphony to a reader who owns one MODEL D. `voices` is therefore one monophonic
 * assignable, which p.34 states in one word.
 *
 * The SysEx-only settings of §7.2 (note priority, bend range, transpose, note-zero-volts,
 * modulation curve) are absent for the reason the Neutron's app-only features are: they are
 * configuration reached from a computer, not a control a reader dials at the machine, and §8 is
 * about the machine. `MULTI TRIGGER` is the exception and appears on the legato recipes, because
 * p.13 §4.9 gives it a route that needs no computer — the `A-440` switch at power-on.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = 'MODEL D User Manual'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/** The Specifications chapter. Every range below comes from it unless the call site says otherwise. */
const SPECS = 34

// ---------------------------------------------------------------------------
// Ranges (§3.1). Each names the scale it was read off; see the header.
// ---------------------------------------------------------------------------

/** `0 to 10`, the scale on twelve of the twenty-nine knobs. */
const ZERO_TEN = { min: 0, max: 10 }
/** `Cutoff frequency: -4 to +4`. The one knob on this panel that runs through zero. */
const CUTOFF = { min: -4, max: 4 }
/** `Tune: -2 to +2`, in semitones per p.12's hedge. */
const TUNE_ST = { min: -2, max: 2 }
/** `Frequency (OSC 2 and 3): -7 to +7`, in semitones per p.12's hedge. */
const OSC_FREQ_ST = { min: -7, max: 7 }
/**
 * `Attack: 1 ms to 10 s`, in **milliseconds** — the Minitaur's and the Neutron's arithmetic
 * reason. §3.2's mood grid defaults to `step: 1`, so a value in seconds rounds to the nearest
 * whole second the moment a mood offset is non-zero, which would turn a 40 ms attack into 0.
 */
const ATTACK_MS = { min: 1, max: 10000 }
/**
 * `Decay: 4 ms to >35 s`.
 *
 * The upper endpoint is **open**, and 35 000 is the manual's own stated floor for it rather than a
 * ceiling anybody measured — every value inside this range is legal by p.34, which is what a range
 * claims. The panel's printed scale stops earlier still, at `10 SEC` (p.40), so the last stretch
 * of this travel is past the last mark on the knob. Both facts are on the note of every decay
 * param below.
 */
const DECAY_MS = { min: 4, max: 35000 }

// ---------------------------------------------------------------------------
// Option sets (§3.2). The legality claim is cited; the selection is taste.
// ---------------------------------------------------------------------------

const ON_OFF = ['on', 'off'] as const
/** `Range (OSC 1, 2, and 3): LO, 32', 16', 8', 4', 2'`. */
const OSC_RANGES = ['LO', "32'", "16'", "8'", "4'", "2'"] as const
/** `Waveform (OSC 1 and 2): triangular, triangular/saw, saw, square, wide pulse, narrow pulse`. */
const OSC12_WAVES = [
  'triangular',
  'triangular/saw',
  'saw',
  'square',
  'wide pulse',
  'narrow pulse',
] as const
/** `Waveform (OSC 3): triangular, reverse saw, saw, square, wide pulse, narrow pulse`. */
const OSC3_WAVES = [
  'triangular',
  'reverse saw',
  'saw',
  'square',
  'wide pulse',
  'narrow pulse',
] as const
/** `Filter mode: low pass/high pass`, a 24 dB/octave ladder either way. */
const FILTER_MODES = ['low pass', 'high pass'] as const
/** `Noise source: pink or white`. */
const NOISE_COLOURS = ['pink', 'white'] as const
/** `Modulation source: OSC 3 or filter EG` — the left end of the MOD MIX travel. */
const MOD_SOURCE_A = ['OSC 3', 'filter EG'] as const
/**
 * `Modulation source: (noise or external modulation source) or LFO` — the right end.
 *
 * The first option is one option and not two: p.9 item (17) says the `MOD SOURCE` socket
 * *"allows connection of an external modulation source. If nothing is connected here, then the
 * internal Noise generator is available as a modulation source."* The switch selects a position;
 * what arrives there depends on the socket.
 */
const MOD_SOURCE_B = ['noise or external mod source', 'LFO'] as const
/** `LFO waveform: triangular or square`. The panel prints the two glyphs rather than the words. */
const LFO_WAVES = ['triangular', 'square'] as const

// ---------------------------------------------------------------------------
// §3.3 The patch points
// ---------------------------------------------------------------------------

/**
 * §2.6/#22. Jack citations live in the device's one `capabilityEvidence` map, keyed by
 * `jacks[<id>]`. Generated inside `jack()` rather than written out, so there is exactly one
 * spelling of each id in this file and a key cannot drift from its socket.
 */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack<Id extends string>(
  id: Id,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string } = {},
): { id: Id; direction: 'in' | 'out'; signal: JackSignalKind[]; note?: string } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...extra }
}

/**
 * All twenty sockets, cited once each: the fifteen 3.5 mm patch points in the panel's own
 * reading order (pp.9-11, items 17-19, 26-29, 37-41, 46, 48-49), the two MIDI DINs and the USB
 * port on the top panel (p.8, items 1-3), and the two rear ¼" outputs (p.11, item 50).
 *
 * Declared whole rather than socket by socket. A partial list reads as a claim that the rest do
 * not exist, and on a box this small the complement is most of what makes it semi-modular.
 *
 * **Names are the silkscreen**, which p.40's patch sheet prints beside every bore. Two of them are
 * glyphs rather than words — the two LFO outputs are marked with a triangle and a square wave —
 * so those take the manual's own names from p.9 items (26) and (27), `LFO Triangular` and `LFO
 * Square`, shortened to what fits a label. The direction is silkscreened too, as a small `▼` over
 * an input and `▲` over an output; that is the panel agreeing with the `direction` field below on
 * every one of the fifteen.
 *
 * Signal kinds come from p.34's `Inputs (TS 3.5 mm)` and `Outputs (TS 3.5 mm)` tables, which give
 * every socket a line: `Control voltage: 1 V per octave` is `pitch-cv`, `Control voltage: -5 V to
 * +5 V` and `0 to +5 V` are `cv`, `Gate: +5 V input triggers ...` is `gate`, and an audio stage is
 * `audio`.
 */
const JACKS = [
  // ---- Oscillator bank, items 17-19 (p.9) ---------------------------------
  jack('MOD SOURCE', 'in', ['cv', 'audio'], 9, {
    note: 'Replaces the internal noise generator as the modulation source; noise returns when it is empty (p.34)',
  }),
  jack('OSC 1V/OCT', 'in', ['pitch-cv'], 9, {
    note: 'Moves all three oscillators — 1 V per octave (p.34)',
  }),
  jack('LFO CV', 'in', ['cv'], 9, {
    note: '-5 V to +5 V; takes the LFO up to 300 Hz, past the 200 Hz the knob reaches (p.34)',
  }),

  // ---- Mixer, items 26-29 (p.9) -------------------------------------------
  jack('LFO TRI', 'out', ['cv'], 9, { note: 'The triangle LFO at ±2 V (p.34); silkscreened as a glyph' }),
  jack('LFO SQR', 'out', ['cv'], 9, { note: 'The square LFO at ±2 V (p.34); silkscreened as a glyph' }),
  /**
   * The one socket on this box whose *emptiness* is a setting. See the header: with nothing here
   * the main output is normalled back in, and `EXT IN VOLUME` becomes the feedback amount.
   */
  jack('EXT', 'in', ['audio'], 9, {
    note: 'Empty, the main output is normalled here as a feedback path — 1 MΩ input (p.12, p.34)',
  }),
  jack('MIX', 'out', ['audio'], 9, { note: 'The mixer sum ahead of the filter, max 0 dBu (p.34)' }),

  // ---- Modifiers, items 37-41 (p.10) --------------------------------------
  jack('CUT CV', 'in', ['cv'], 10, { note: '0 to +5 V onto the cutoff frequency (p.34)' }),
  /**
   * `gate`, not `trigger`, and the same reasoning the Neutron records: p.34 heads the row `Gate:
   * +5 V input triggers the filter contour`, and what it drives is a contour whose sustain holds
   * for as long as the gate does (p.10 item 35). A duration that matters is a gate.
   */
  jack('FC GATE', 'in', ['gate'], 10, { note: 'Triggers the filter contour at +5 V (p.34)' }),
  jack('FILT CONT', 'out', ['cv'], 10, { note: 'The filter contour, 0 to +4 V (p.34)' }),
  jack('LC GATE', 'in', ['gate'], 10, { note: 'Triggers the loudness contour at +5 V (p.34)' }),
  jack('LOUD CONT', 'out', ['cv'], 10, { note: 'The loudness contour, 0 to +4.6 V (p.34)' }),

  // ---- Output, items 46, 48-49 (p.11) -------------------------------------
  jack('LOUD CV', 'in', ['cv'], 11, { note: '0 to +5 V onto the loudness (p.34)' }),
  jack('MAIN', 'out', ['audio'], 11, {
    note: 'The 3.5 mm main output, max 0 dBu. In a Eurorack this is the only main output (p.11)',
  }),
  jack('PHONES', 'out', ['audio'], 11, {
    note: '3.5 mm TRS with its own volume knob; 8 Ω, max -3.5 dBu (p.34)',
  }),

  // ---- MIDI and USB on the top panel (p.8, items 1-3) ---------------------
  jack('MIDI IN', 'in', ['midi'], 8, { note: 'Receives MIDI from an external source; 16 channels (p.34)' }),
  jack('MIDI THRU', 'out', ['midi'], 8, {
    note: 'Passes through what arrives at MIDI IN; it originates nothing. There is no MIDI OUT DIN',
  }),
  jack('USB', 'in', ['midi'], 8, {
    note: 'Type B, class compliant, MIDI both ways — the only route MIDI leaves this box by (p.8)',
  }),

  // ---- The rear panel (p.11, item 50) -------------------------------------
  /**
   * Two ¼" jacks carrying one signal at two levels, and both are mono: p.11 says *"note that they
   * are both Mono, and not left/right"*. p.11 calls them TRS and p.34 calls them TS — see
   * contradiction 3 in the header. **Neither survives the move into a Eurorack case** (p.32),
   * which is why `MAIN` above carries the note it does.
   */
  jack('REAR · LOW', 'out', ['audio'], 11, {
    note: 'Instrument level, 30 dB below HIGH, 1 kΩ. Not present once the module is racked (p.32)',
  }),
  jack('REAR · HIGH', 'out', ['audio'], 11, {
    note: 'Line level, max 0 dBu, 1.2 kΩ. Not present once the module is racked (p.32)',
  }),
] as const

/** Every declared jack id, as a union of literals. `cable()` takes it. */
export type ModelDJack = (typeof JACKS)[number]['id']

/**
 * A cable: two declared jacks, and what it does.
 *
 * **Every one below is `verified: false`, and that is a fact about the document rather than an
 * omission.** This manual instructs exactly one patch — p.29 §6.4 runs `MIDI THRU` to the next
 * MODEL D's `MIDI IN` for a Poly Chain — and that one is between two boxes rather than inside
 * one. Its four hookup diagrams (pp.26-29) show MIDI and audio and never a 3.5 mm cable; p.13
 * §4.12 says only that the CV and gate sockets *"allow for further experimentation"*. So the
 * sockets carry pages and the connections do not.
 */
function cable(from: ModelDJack, to: ModelDJack, note: string): PatchEntry {
  return { from, to, note, verified: false }
}

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type Extra = Omit<Partial<AuthoredNumericParam>, 'kind' | 'name' | 'value' | 'range'>

/**
 * A numeric whose **range** is cited and whose **point is not** (§3.2). p.34 states what each
 * control accepts and no page states where to set it, so `verified: false` sits on every point in
 * this file.
 */
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

/**
 * A knob position on a control whose printed range has **words at both ends**, as percent of
 * travel — the Minitaur's answer to `0 to Self-Oscillation`, and `MOD MIX` is this panel's one
 * case. Both claims are unverified and both render that way.
 */
function travel(name: string, value: number, note: string): AuthoredParam {
  return {
    kind: 'numeric',
    name,
    value,
    unit: '% travel',
    range: { min: 0, max: 100, verified: false },
    verified: false,
    note,
  }
}

/** A switch position, whose option set is cited and whose selection is taste (§3.2). */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  page: number,
  extra: { note?: string; hint?: string } = {},
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...extra,
  }
}

/** Milliseconds, with p.34's own end-to-end figures and p.40's shorter printed scale on the note. */
function attack(name: string, ms: number): AuthoredParam {
  return num(name, ms, ATTACK_MS, SPECS, {
    unit: 'ms',
    note: 'p.34 gives the travel as 1 ms to 10 s; the knob is silkscreened 10/200/600 M-SEC then 1/5/10 SEC',
  })
}

function decay(name: string, ms: number, mood?: AuthoredNumericParam['mood']): AuthoredParam {
  return num(name, ms, DECAY_MS, SPECS, {
    unit: 'ms',
    note: 'p.34 gives the travel as "4 ms to >35 s" — an open top end, so this range is its stated floor; the knob is silkscreened only as far as 10 SEC',
    ...(mood === undefined ? {} : { mood }),
  })
}

// ---------------------------------------------------------------------------
// Sections, each emitted whole so a value never leaves the switch that scales it
// ---------------------------------------------------------------------------

/**
 * `TUNE` and `GLIDE`, the two controls that are about playing rather than about the sound.
 *
 * `TUNE` moves all three oscillators together — except OSC 3 with its `CONTROL` switch off, which
 * `osc3()` below is what states.
 */
function perf(tuneSt: number, glide: number): AuthoredParam[] {
  return [
    num('TUNE', tuneSt, TUNE_ST, SPECS, {
      unit: 'st',
      step: 0.1,
      note: 'Moves OSC 1, 2 and 3 together (p.8). p.12 calls the marks semitones "as a general guide"',
    }),
    num('GLIDE', glide, ZERO_TEN, SPECS, {
      note: 'Portamento between notes; off fully anticlockwise (p.8)',
    }),
  ]
}

/** OSC 1: a range and a shape. It is the one oscillator with no `FREQUENCY` knob of its own. */
function osc1(range: (typeof OSC_RANGES)[number], wave: (typeof OSC12_WAVES)[number]): AuthoredParam[] {
  return [
    pick('OSC 1 RANGE', range, OSC_RANGES, SPECS, {
      note: 'Six overlapping ranges across 0.1 Hz to 20 kHz (p.34); LO puts it below audio',
    }),
    pick('OSC 1 WAVEFORM', wave, OSC12_WAVES, SPECS, {
      note: wave === 'wide pulse' ? 'p.9 calls this shape "medium pulse"' : undefined,
    }),
  ]
}

/** OSC 2: a range, a frequency in semitones, and a shape. */
function osc2(
  range: (typeof OSC_RANGES)[number],
  semitones: number,
  wave: (typeof OSC12_WAVES)[number],
): AuthoredParam[] {
  return [
    pick('OSC 2 RANGE', range, OSC_RANGES, SPECS),
    num('OSC 2 FREQUENCY', semitones, OSC_FREQ_ST, SPECS, {
      unit: 'st',
      step: 0.1,
      note: 'Offset from OSC 1 within the selected range; p.12 calls the marks semitones "as a general guide"',
    }),
    pick('OSC 2 WAVEFORM', wave, OSC12_WAVES, SPECS, {
      note: wave === 'wide pulse' ? 'p.9 calls this shape "medium pulse"' : undefined,
    }),
  ]
}

/**
 * **OSC 3, whole and inseparable.** See the header: `CONTROL` off takes this oscillator off the
 * keyboard *and* out from under `TUNE`, which changes what its `FREQUENCY` figure means. There is
 * no way to author one of these four without the other three.
 */
function osc3(
  range: (typeof OSC_RANGES)[number],
  control: 'on' | 'off',
  semitones: number,
  wave: (typeof OSC3_WAVES)[number],
): AuthoredParam[] {
  return [
    pick('OSC 3 RANGE', range, OSC_RANGES, SPECS, {
      note:
        range === 'LO'
          ? 'LO — this is OSC 3 used as a second modulation source rather than as a voice (p.13)'
          : undefined,
    }),
    pick('OSC 3 CONTROL', control, ON_OFF, SPECS, {
      note:
        control === 'on'
          ? 'On, so OSC 3 follows the keyboard and TUNE moves it with the other two (p.8, p.9)'
          : 'Off, so the keyboard, pitch wheel, mod wheel and TUNE all leave OSC 3 where it is (p.8, p.9)',
    }),
    num('OSC 3 FREQUENCY', semitones, OSC_FREQ_ST, SPECS, {
      unit: 'st',
      step: 0.1,
      note:
        control === 'on'
          ? 'Offset from OSC 1, and the only pitch control OSC 3 answers to besides TUNE. p.12 calls the marks semitones "as a general guide"'
          : 'A free-running position: with CONTROL off nothing else moves this oscillator. p.12 calls the marks semitones "as a general guide"',
    }),
    pick('OSC 3 WAVEFORM', wave, OSC3_WAVES, SPECS, {
      note:
        wave === 'reverse saw'
          ? 'Reverse saw is OSC 3’s own shape — OSC 1 and 2 carry triangular/saw in this position (p.34)'
          : wave === 'wide pulse'
            ? 'p.9 calls this shape "medium pulse"'
            : undefined,
    }),
  ]
}

/** One mixer channel: the on/off switch, and a level only when the switch is on. */
function channel(name: string, level: number | null): AuthoredParam[] {
  if (level === null) return [pick(name, 'off', ON_OFF, SPECS)]
  return [pick(name, 'on', ON_OFF, SPECS), num(`${name} VOLUME`, level, ZERO_TEN, SPECS)]
}

/** The noise channel, which carries a colour as well as a level. */
function noise(level: number | null, colour: (typeof NOISE_COLOURS)[number]): AuthoredParam[] {
  if (level === null) return [pick('NOISE', 'off', ON_OFF, SPECS)]
  return [
    pick('NOISE', 'on', ON_OFF, SPECS),
    num('NOISE VOLUME', level, ZERO_TEN, SPECS),
    pick('WHITE / PINK', colour, NOISE_COLOURS, SPECS, {
      note: 'Pink tilts the noise toward the low end; white is flat',
    }),
  ]
}

/**
 * **The external input channel, and which of its two jobs this recipe is asking it to do.**
 *
 * With nothing in `EXT` the main output is normalled back into the mixer and this knob is the
 * feedback amount (p.12 §4.4.1) — which is the only overdrive this box has. `MAIN VOLUME` comes
 * with it because p.12 says the feedback level depends on that knob too, so the pair is the
 * gesture and one of them alone is half of it.
 */
function feedback(level: number, mainVolume: number): AuthoredParam[] {
  return [
    pick('EXT IN', 'on', ON_OFF, SPECS, { hint: 'feedback-path' }),
    num('EXT IN VOLUME', level, ZERO_TEN, SPECS, {
      mood: [{ axis: 'grit', amount: 2 }],
      note: 'Nothing patched at EXT, so this is the output fed back into the mixer — "extra phat bass or extra crunch" (p.12)',
    }),
    num('MAIN VOLUME', mainVolume, ZERO_TEN, SPECS, {
      mood: [{ axis: 'grit', amount: 1 }],
      note: 'The feedback level depends on this knob as well as on EXT IN VOLUME (p.12)',
    }),
  ]
}

/** The external input switched off, which is what a recipe wanting no feedback says. */
function noFeedback(): AuthoredParam[] {
  return [pick('EXT IN', 'off', ON_OFF, SPECS, { note: 'No feedback path into the mixer (p.12)' })]
}

/**
 * **The modulation section, whole.** The two switches name the two ends of the `MOD MIX` travel,
 * so a mix figure without them is a number with no scale (p.13 §4.8) — see the header.
 *
 * `OSCILLATOR MODULATION` and `FILTER MODULATION` are the two destinations the box reaches with no
 * cable, and a mix that reaches neither is inaudible, so they are emitted here rather than left to
 * the filter section.
 */
function modulation(opts: {
  sourceA: (typeof MOD_SOURCE_A)[number]
  sourceB: (typeof MOD_SOURCE_B)[number]
  mix: number
  depth: number
  lfoWave: (typeof LFO_WAVES)[number]
  lfoRate: number
  toOscillators: 'on' | 'off'
  toFilter: 'on' | 'off'
}): AuthoredParam[] {
  return [
    pick('OSC 3 / FILTER EG', opts.sourceA, MOD_SOURCE_A, SPECS, {
      note: 'What sits at the anticlockwise end of MOD MIX (p.13)',
    }),
    pick('NOISE (MOD SRC) / LFO', opts.sourceB, MOD_SOURCE_B, SPECS, {
      note: 'What sits at the clockwise end of MOD MIX (p.13)',
    }),
    travel(
      'MOD MIX',
      opts.mix,
      'p.34 gives this knob only as a blend between the two switch positions, with words where 0 and 10 sit on its neighbours — so percent of travel. 0% is fully toward the left switch',
    ),
    num('MOD DEPTH', opts.depth, ZERO_TEN, SPECS, {
      note: 'How much of the mix is applied; a MIDI mod wheel moves it too (p.8)',
    }),
    pick('LFO WAVEFORM', opts.lfoWave, LFO_WAVES, SPECS, {
      note: 'Silkscreened as two glyphs rather than as words',
    }),
    num('LFO RATE', opts.lfoRate, ZERO_TEN, SPECS, {
      note: '0.05 Hz to 200 Hz across the travel, and up to 300 Hz with a voltage at LFO CV (p.34)',
    }),
    pick('OSCILLATOR MODULATION', opts.toOscillators, ON_OFF, SPECS, {
      note: 'On, the modulation mix moves all three oscillators (p.8)',
    }),
    pick('FILTER MODULATION', opts.toFilter, ON_OFF, SPECS, {
      note: 'On, the modulation mix moves the cutoff (p.10)',
    }),
  ]
}

/** Both destinations off, which is a shorter and truer thing to say than a mix nothing receives. */
function noModulation(): AuthoredParam[] {
  return [
    pick('OSCILLATOR MODULATION', 'off', ON_OFF, SPECS),
    pick('FILTER MODULATION', 'off', ON_OFF, SPECS),
  ]
}

/**
 * The filter, whole. `darkness` lives on `CUTOFF FREQUENCY` and `grit` on `FILTER EMPHASIS`,
 * which are the two knobs the whole box bends around.
 *
 * `KEYBOARD CONTROL 1` and `2` are one control in two switches and p.10 item (31) prints the
 * table: neither is no tracking, switch 1 alone is a third, switch 2 alone is two thirds, both is
 * the maximum. Emitted as a pair because either alone is a different amount.
 */
function filter(opts: {
  mode: (typeof FILTER_MODES)[number]
  cutoff: number
  emphasis: number
  contour: number
  keyTrack1: 'on' | 'off'
  keyTrack2: 'on' | 'off'
  attack: number
  decay: number
  sustain: number
  decaySwitch: 'on' | 'off'
}): AuthoredParam[] {
  return [
    pick('FILTER MODE', opts.mode, FILTER_MODES, SPECS, {
      note: '24 dB per octave either way (p.34)',
    }),
    num('CUTOFF FREQUENCY', opts.cutoff, CUTOFF, SPECS, {
      step: 0.5,
      mood: [{ axis: 'darkness', amount: -2 }],
      note: 'The one knob on this panel marked -4 to +4. p.15’s calibration table prints a 5 here, which is not on the scale',
    }),
    num('FILTER EMPHASIS', opts.emphasis, ZERO_TEN, SPECS, {
      mood: [{ axis: 'grit', amount: 2 }],
      note: 'Resonance — a level boost at the cutoff frequency (p.10)',
    }),
    num('AMOUNT OF CONTOUR', opts.contour, ZERO_TEN, SPECS, {
      note: 'How far the filter contour shifts the cutoff (p.10)',
    }),
    pick('KEYBOARD CONTROL 1', opts.keyTrack1, ON_OFF, SPECS, {
      note: 'A third of maximum tracking on its own, and with switch 2 the maximum (p.10)',
    }),
    pick('KEYBOARD CONTROL 2', opts.keyTrack2, ON_OFF, SPECS, {
      note: 'Two thirds of maximum tracking on its own, and with switch 1 the maximum (p.10)',
    }),
    attack('FILTER ATTACK', opts.attack),
    decay('FILTER DECAY TIME', opts.decay),
    num('FILTER SUSTAIN', opts.sustain, ZERO_TEN, SPECS, {
      note: 'The cutoff the contour holds after attack and decay (p.10)',
    }),
    pick('FILTER DECAY', opts.decaySwitch, ON_OFF, SPECS, {
      note: 'The switch, not the knob: on, the cutoff takes the decay time to fall after a note is released (p.10)',
    }),
  ]
}

/** The loudness contour. `density` lives on its decay, which is what shortens a part. */
function loudness(
  attackMs: number,
  decayMs: number,
  sustain: number,
  decaySwitch: 'on' | 'off',
): AuthoredParam[] {
  return [
    attack('LOUDNESS ATTACK', attackMs),
    decay('LOUDNESS DECAY TIME', decayMs, [
      { axis: 'density', amount: -Math.round(decayMs * 0.35) },
    ]),
    num('LOUDNESS SUSTAIN', sustain, ZERO_TEN, SPECS, {
      note: 'The level the contour holds after attack and decay (p.10)',
    }),
    pick('LOUD DECAY', decaySwitch, ON_OFF, SPECS, {
      note: 'The switch, not the knob: off, the note stops the moment it is released (p.10)',
    }),
  ]
}

/**
 * §4.9.1. Multi-trigger, on the recipes where legato is the point.
 *
 * The one SysEx setting that has a route at the machine: p.13 has the reader flick `A-440` on and
 * off within five seconds of power-up, and counts the LED flashes back. Off is the default and is
 * legato — *"playing a new note will change the pitch, but with no new triggering unless all notes
 * are released"*.
 */
function multiTrigger(value: 'on' | 'off'): AuthoredParam {
  return pick('MULTI TRIGGER', value, ON_OFF, 13, {
    hint: 'power-on-mode',
    note:
      value === 'off'
        ? 'Off is legato: a new note takes the pitch and leaves the contours where they are (p.13)'
        : 'On: every new note retriggers both contours (p.13)',
  })
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe below, explicitly rather than by omission.
 *
 * §3.1 makes the recipe citation the default a param inherits when it carries none. The nearest
 * thing this manual has to a cited patch is p.15's *Control Settings for Calibration*, which is a
 * jig for a voltmeter rather than a sound — and one of its rows is a knob position off the wrong
 * scale (contradiction 1). Nothing below is taken from it.
 */
const recipes: Recipe[] = [
  // ---- Low end -----------------------------------------------------------
  {
    id: 'model-d-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Kick with the filter contour patched onto the pitch',
    routing:
      'FILT CONT into OSC 1V/OCT is the whole trick: the filter envelope becomes a pitch envelope, and the filter decay time is the only thing shaping it',
    params: [
      ...perf(0, 0),
      ...osc1("32'", 'triangular'),
      ...osc2("32'", 0, 'triangular'),
      ...osc3("32'", 'on', 0, 'triangular'),
      ...channel('OSC 1', 10),
      ...channel('OSC 2', null),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...feedback(3, 7),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: -1,
        emphasis: 3,
        contour: 4,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 1,
        decay: 55,
        sustain: 0,
        decaySwitch: 'off',
      }),
      ...loudness(1, 220, 0, 'off'),
    ],
    patch: [
      cable(
        'FILT CONT',
        'OSC 1V/OCT',
        'supplies the pitch drop. FILT CONT puts out 0 to +4 V (p.34) and OSC 1V/OCT is a volt per octave, so the full contour is four octaves — nothing on this box attenuates a patch cable, and FILTER DECAY TIME is what keeps the sweep short',
      ),
    ],
  },
  {
    id: 'model-d-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'One triangle at 32 feet, nothing above the fundamental',
    routing: 'No cables. The normalled path is already the whole part',
    params: [
      ...perf(0, 0),
      ...osc1("32'", 'triangular'),
      ...osc2("32'", 0, 'triangular'),
      ...osc3("32'", 'on', 0, 'triangular'),
      ...channel('OSC 1', 10),
      ...channel('OSC 2', null),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: -3,
        emphasis: 0,
        contour: 0,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 4,
        decay: 400,
        sustain: 8,
        decaySwitch: 'off',
      }),
      ...loudness(4, 1200, 9, 'on'),
    ],
  },
  {
    id: 'model-d-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Sub with a fifth over it, both oscillators triangular',
    routing:
      'No cables. A fifth rather than an octave, because ±7 semitones is the whole OSC 2 travel within one range (p.34)',
    params: [
      ...perf(0, 0),
      ...osc1("32'", 'triangular'),
      ...osc2("32'", 7, 'triangular'),
      ...osc3("32'", 'on', 0, 'triangular'),
      ...channel('OSC 1', 10),
      ...channel('OSC 2', 4),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: -2,
        emphasis: 1,
        contour: 1,
        keyTrack1: 'on',
        keyTrack2: 'off',
        attack: 4,
        decay: 600,
        sustain: 8,
        decaySwitch: 'off',
      }),
      ...loudness(4, 1500, 9, 'on'),
    ],
  },
  {
    id: 'model-d-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Two saws a beat apart, driven through the feedback path',
    routing: 'No cables. EXT IN with nothing patched is where the crunch comes from (p.12)',
    params: [
      ...perf(0, 0),
      ...osc1("16'", 'saw'),
      ...osc2("16'", 0.3, 'saw'),
      ...osc3("16'", 'on', -0.4, 'saw'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...feedback(6, 7),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: 0,
        emphasis: 5,
        contour: 4,
        keyTrack1: 'on',
        keyTrack2: 'off',
        attack: 2,
        decay: 350,
        sustain: 4,
        decaySwitch: 'on',
      }),
      ...loudness(2, 500, 6, 'on'),
    ],
  },
  {
    id: 'model-d-bass-mid-hard',
    role: 'bass-mid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'All three oscillators stacked across two octaves',
    routing: 'No cables. OSC 3 an octave under the pair, which is what the LO-adjacent 32 feet is for',
    params: [
      ...perf(0, 0),
      ...osc1("16'", 'square'),
      ...osc2("16'", 0.2, 'saw'),
      ...osc3("32'", 'on', 0, 'square'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 7),
      ...channel('OSC 3', 6),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: 0,
        emphasis: 3,
        contour: 5,
        keyTrack1: 'on',
        keyTrack2: 'on',
        attack: 1,
        decay: 260,
        sustain: 3,
        decaySwitch: 'on',
      }),
      ...loudness(1, 380, 5, 'on'),
    ],
  },

  // ---- Tonal -------------------------------------------------------------
  {
    id: 'model-d-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Three saws detuned across an open filter',
    routing: 'No cables. Legato, so a held line slurs rather than restriking (p.13)',
    params: [
      ...perf(0, 2),
      ...osc1("8'", 'saw'),
      ...osc2("8'", 0.4, 'saw'),
      ...osc3("8'", 'on', -0.5, 'saw'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 8),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: 2,
        emphasis: 2,
        contour: 3,
        keyTrack1: 'on',
        keyTrack2: 'on',
        attack: 6,
        decay: 700,
        sustain: 7,
        decaySwitch: 'on',
      }),
      ...loudness(6, 900, 8, 'on'),
      multiTrigger('off'),
    ],
  },
  {
    id: 'model-d-lead-dirty',
    role: 'lead',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Lead pushed into the feedback path, resonance up',
    routing: 'No cables. Multi-trigger on, so every note in a line restrikes both contours (p.13)',
    params: [
      ...perf(0, 1),
      ...osc1("8'", 'saw'),
      ...osc2("8'", 0.5, 'square'),
      ...osc3("8'", 'on', -1, 'saw'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 5),
      ...noise(null, 'pink'),
      ...feedback(7, 8),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: 1,
        emphasis: 7,
        contour: 4,
        keyTrack1: 'on',
        keyTrack2: 'on',
        attack: 2,
        decay: 400,
        sustain: 6,
        decaySwitch: 'on',
      }),
      ...loudness(2, 500, 7, 'on'),
      multiTrigger('on'),
    ],
  },
  {
    id: 'model-d-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Short filter-swept stab, contour hard over the cutoff',
    routing: 'No cables. LOUD DECAY off, so releasing the key stops the note dead (p.10)',
    params: [
      ...perf(0, 0),
      ...osc1("8'", 'square'),
      ...osc2("8'", 0.2, 'saw'),
      ...osc3("16'", 'on', 0, 'square'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 7),
      ...channel('OSC 3', 5),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: -1,
        emphasis: 6,
        contour: 8,
        keyTrack1: 'on',
        keyTrack2: 'off',
        attack: 1,
        decay: 120,
        sustain: 1,
        decaySwitch: 'off',
      }),
      ...loudness(1, 160, 2, 'off'),
      multiTrigger('on'),
    ],
  },
  {
    id: 'model-d-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'One saw, resonance high, filter tracking the keyboard',
    routing: 'No cables. GLIDE does the slides; both KEYBOARD CONTROL switches keep the peak in tune. **Accent:** there is no sequencer and no arpeggiator here — p.34\u2019s architecture list is exhaustive and carries neither — so an accented step is something the player does at the keyboard driving it, and nothing on this box stores which steps are accented. **Slide:** `GLIDE 2` above, p.8\u2019s \"portamento between notes\", one setting for every note rather than a per-step lane',
    params: [
      ...perf(0, 2),
      ...osc1("8'", 'saw'),
      ...osc2("8'", 0, 'saw'),
      ...osc3("8'", 'on', 0, 'saw'),
      ...channel('OSC 1', 10),
      ...channel('OSC 2', null),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: -1,
        emphasis: 9,
        contour: 7,
        keyTrack1: 'on',
        keyTrack2: 'on',
        attack: 1,
        decay: 200,
        sustain: 1,
        decaySwitch: 'on',
      }),
      ...loudness(1, 300, 4, 'on'),
      multiTrigger('off'),
    ],
  },
  {
    id: 'model-d-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Three triangles drifting, slow attack on both contours',
    routing:
      'No cables. A monophonic pad: one note held, three oscillators barely apart, and the filter opening under it',
    params: [
      ...perf(0, 4),
      ...osc1("8'", 'triangular'),
      ...osc2("8'", 0.3, 'triangular'),
      ...osc3("16'", 'on', -0.4, 'triangular'),
      ...channel('OSC 1', 8),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 7),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...modulation({
        sourceA: 'OSC 3',
        sourceB: 'LFO',
        mix: 100,
        depth: 2,
        lfoWave: 'triangular',
        lfoRate: 1,
        toOscillators: 'on',
        toFilter: 'off',
      }),
      ...filter({
        mode: 'low pass',
        cutoff: 0,
        emphasis: 1,
        contour: 3,
        keyTrack1: 'on',
        keyTrack2: 'off',
        attack: 1800,
        decay: 3000,
        sustain: 7,
        decaySwitch: 'on',
      }),
      ...loudness(1200, 2500, 9, 'on'),
      multiTrigger('off'),
    ],
  },
  {
    id: 'model-d-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'OSC 3 at audio rate modulating the other two',
    routing:
      'No cables. OSC 3 in the 2-foot range with CONTROL off runs at a fixed frequency against two that track, so the sidebands move with the note and the timbre goes inharmonic',
    params: [
      ...perf(0, 0),
      ...osc1("8'", 'triangular'),
      ...osc2("8'", 0.2, 'triangular'),
      ...osc3("2'", 'off', 3, 'square'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 7),
      ...channel('OSC 3', null),
      ...noise(null, 'pink'),
      ...noFeedback(),
      ...modulation({
        sourceA: 'OSC 3',
        sourceB: 'LFO',
        mix: 0,
        depth: 6,
        lfoWave: 'triangular',
        lfoRate: 0,
        toOscillators: 'on',
        toFilter: 'off',
      }),
      ...filter({
        mode: 'low pass',
        cutoff: 2,
        emphasis: 4,
        contour: 4,
        keyTrack1: 'on',
        keyTrack2: 'on',
        attack: 1,
        decay: 300,
        sustain: 2,
        decaySwitch: 'on',
      }),
      ...loudness(1, 400, 3, 'on'),
    ],
  },
  {
    id: 'model-d-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'OSC 3 in LO wobbling a pair of triangles',
    routing:
      'No cables. OSC 3 RANGE at LO is the manual’s own worked example of a second modulation source (p.13)',
    params: [
      ...perf(0, 3),
      ...osc1("8'", 'triangular'),
      ...osc2("8'", 0.4, 'triangular'),
      ...osc3('LO', 'on', -2, 'triangular'),
      ...channel('OSC 1', 8),
      ...channel('OSC 2', 7),
      ...channel('OSC 3', null),
      ...noise(2, 'pink'),
      ...noFeedback(),
      ...modulation({
        sourceA: 'OSC 3',
        sourceB: 'LFO',
        mix: 20,
        depth: 4,
        lfoWave: 'triangular',
        lfoRate: 1,
        toOscillators: 'on',
        toFilter: 'on',
      }),
      ...filter({
        mode: 'low pass',
        cutoff: -1,
        emphasis: 3,
        contour: 2,
        keyTrack1: 'on',
        keyTrack2: 'off',
        attack: 900,
        decay: 2500,
        sustain: 6,
        decaySwitch: 'on',
      }),
      ...loudness(700, 2200, 8, 'on'),
    ],
  },
  {
    id: 'model-d-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'White noise alone, high-pass and resonant',
    routing:
      'No cables. Every oscillator switched out, so the noise generator is the only thing in the mixer',
    params: [
      ...perf(0, 0),
      ...osc1("8'", 'saw'),
      ...osc2("8'", 0, 'saw'),
      ...osc3("8'", 'on', 0, 'saw'),
      ...channel('OSC 1', null),
      ...channel('OSC 2', null),
      ...channel('OSC 3', null),
      ...noise(9, 'white'),
      ...feedback(4, 7),
      ...noModulation(),
      ...filter({
        mode: 'high pass',
        cutoff: 1,
        emphasis: 6,
        contour: 3,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 1,
        decay: 140,
        sustain: 0,
        decaySwitch: 'off',
      }),
      ...loudness(1, 180, 0, 'off'),
    ],
  },

  // ---- Transitional (§4.2) -----------------------------------------------
  {
    id: 'model-d-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Rising sweep with the LFO shivering the pitch',
    routing:
      'No cables. The lift is the filter contour over a long attack; the LFO into the oscillators is what keeps it from sounding static',
    params: [
      ...perf(0, 0),
      ...osc1("8'", 'saw'),
      ...osc2("8'", 0.5, 'saw'),
      ...osc3("16'", 'on', -0.5, 'saw'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 6),
      ...noise(3, 'white'),
      ...noFeedback(),
      ...modulation({
        sourceA: 'OSC 3',
        sourceB: 'LFO',
        mix: 100,
        depth: 3,
        lfoWave: 'triangular',
        lfoRate: 7,
        toOscillators: 'on',
        toFilter: 'off',
      }),
      ...filter({
        mode: 'low pass',
        cutoff: -3,
        emphasis: 7,
        contour: 10,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 4000,
        decay: 2000,
        sustain: 10,
        decaySwitch: 'on',
      }),
      ...loudness(3500, 1500, 10, 'on'),
    ],
  },
  {
    id: 'model-d-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Noise and low oscillators hit at once, contour onto the cutoff',
    routing:
      'LOUD CONT into CUT CV adds the loudness contour to the cutoff on top of AMOUNT OF CONTOUR, so the two envelopes shape the filter together',
    params: [
      ...perf(0, 0),
      ...osc1("32'", 'saw'),
      ...osc2("32'", 0.7, 'saw'),
      ...osc3("16'", 'on', -0.6, 'saw'),
      ...channel('OSC 1', 9),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 6),
      ...noise(7, 'white'),
      ...feedback(6, 8),
      ...noModulation(),
      ...filter({
        mode: 'low pass',
        cutoff: 1,
        emphasis: 4,
        contour: 6,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 1,
        decay: 700,
        sustain: 0,
        decaySwitch: 'off',
      }),
      ...loudness(1, 900, 0, 'off'),
    ],
    patch: [
      cable(
        'LOUD CONT',
        'CUT CV',
        'supplies a second envelope to the cutoff. LOUD CONT puts out 0 to +4.6 V and CUT CV takes 0 to +5 V (p.34), so the whole contour lands inside what the input accepts',
      ),
    ],
  },
  {
    id: 'model-d-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Slow triangle LFO walking the cutoff across a held chord of one',
    routing:
      'LFO TRI into CUT CV rather than through the modulation mix, so MOD DEPTH is left for the oscillators and the sweep runs at its own full ±2 V',
    params: [
      ...perf(0, 0),
      ...osc1("16'", 'saw'),
      ...osc2("16'", 0.3, 'saw'),
      ...osc3("32'", 'on', 0, 'saw'),
      ...channel('OSC 1', 8),
      ...channel('OSC 2', 8),
      ...channel('OSC 3', 6),
      ...noise(2, 'pink'),
      ...noFeedback(),
      ...modulation({
        sourceA: 'OSC 3',
        sourceB: 'LFO',
        mix: 100,
        depth: 1,
        lfoWave: 'triangular',
        lfoRate: 1,
        toOscillators: 'on',
        toFilter: 'off',
      }),
      ...filter({
        mode: 'low pass',
        cutoff: -2,
        emphasis: 6,
        contour: 2,
        keyTrack1: 'off',
        keyTrack2: 'off',
        attack: 2000,
        decay: 4000,
        sustain: 8,
        decaySwitch: 'on',
      }),
      ...loudness(1500, 3000, 9, 'on'),
    ],
    patch: [
      cable(
        'LFO TRI',
        'CUT CV',
        'supplies the sweep straight from the LFO’s own output at ±2 V (p.34), bypassing the modulation mix — CUT CV has nothing normalled to it',
      ),
    ],
  },
]

// ---------------------------------------------------------------------------
// §2.3 The manifest
// ---------------------------------------------------------------------------

/**
 * One voice, and these are the duties it is modelled as taking.
 *
 * **The backbeat roles are absent and the reason is the same one the CRAVE and the Neutron
 * record**: this is one filter and one VCA, so a recipe claiming a noise burst *and* a pitched
 * body at once would be claiming two voices. `noise` is here because that is the one of them this
 * box can do honestly — the noise generator alone through the filter, with every oscillator
 * switched out.
 *
 * `arp` and `vox-chop` are absent for a different reason again: there is no arpeggiator (p.34) and
 * nothing that plays a sample, so both would be a promise the box cannot keep.
 */
const VOICE_ROLES = [
  'kick',
  'sub',
  'bass-mid',
  'noise',
  'metallic',
  'texture',
  'pad',
  'lead',
  'stab',
  'acid',
  'riser',
  'impact',
  'sweep',
] as const

export const device: Device = {
  id: 'behringer-model-d',
  name: 'MODEL D',
  maker: 'Behringer',
  /**
   * `semi-modular`, and the Minitaur's test is what settles it. That box declares `synth` because
   * its CV jacks are inputs only, so no cable can be run from one point on it to another. This one
   * has five outputs on the panel — `LFO TRI`, `LFO SQR`, `MIX`, `FILT CONT`, `LOUD CONT` — so it
   * can be re-routed into itself, which two recipes above do. p.6 says so in a heading of its own:
   * *"Semi-Modular Design ... requires no patching for immediate performance"*.
   */
  kind: 'semi-modular',

  /**
   * **Neither direction.** There is no MIDI implementation chart in this document and no page
   * mentions clock in connection with this box at all — the only occurrence of *"MIDI Clock"* in
   * forty-four pages is the glossary definition on p.37. The two halves get different evidence
   * below for different reasons, and both live in `capabilityEvidence` rather than here
   * (§2.6/#120). `transport` names the two wires MIDI travels on, which is the honest reading of
   * a required field on a box that carries no clock over either.
   */
  clock: { canSendClock: false, canReceiveClock: false, transport: ['midi-din', 'usb'] },

  /**
   * `main: 'mono'` — p.11 item (50) on the two rear ¼" outputs: *"note that they are both Mono,
   * and not left/right"*, one instrument level and one line level. `individualOuts: 0` because
   * `MAIN`, `PHONES` and the two rear jacks are one signal at four levels rather than four parts.
   * `audioIn` is the `EXT` socket, which p.9 item (28) describes as taking *"any external
   * line-level audio source"*. `usbAudio: false` — see the evidence below.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * 70 HP at the Eurorack 5.08 mm/HP. p.34's `Dimensions` row gives 374 mm, which is the factory
   * chassis including its wooden end cheeks; the aspect check in `panel.ts` shows the drawn panel
   * is the Eurorack one, and §8 (p.32) is a chapter on taking the chassis off around it.
   */
  physical: { panelSpanMm: MODEL_D_PANEL_SPAN_MM, verified: cite(SPECS) },

  panel: MODEL_D_PANEL,
  /**
   * §10/#263. **Warm-up**, cited. p.12 §4.3.1 Warm Up Time: *"We recommend leaving 15 minutes or more time for the MODEL D to
   * warm up"*. A floor with no ceiling, so `max` is absent rather than guessed at.
   *
   * The rig is what makes this worth carrying: a reader sees which of the boxes in front of them
   * need the time, and no single manual can tell them that.
   */
  warmUp: {
    note: '15 minutes or more from cold',
    minutes: { min: 15 },
    verified: cite(12),
  },

  /**
   * §10/#263. **A pointer, not a procedure.** This is service work and the manual says so; see the
   * `Calibration` type for why the steps are deliberately not here.
   */
  calibration: {
    summary: 'PITCH CV, oscillator and octave RANGE calibration, via trimpots on the PCB',
    caution:
      'The manual puts it under a warning triangle: undertaken only by an experienced service technician, to prevent personal injury or damage to the unit. The front panel has to be lifted to reach the board, and trimpot damage is not covered under warranty',
    verified: cite(14),
  },

  jacks: [...JACKS],

  /**
   * §2.6/#142. **Nothing on this box sets a note's length, because nothing on it holds a note.**
   * p.10 item (30) describes both contours as decaying *"after a note or external trigger is
   * released"*, and p.34 puts the trigger threshold on `FC GATE` and `LC GATE` at +5 V. The
   * contours are attack-decay-sustain, so the sustain holds for as long as the gate does — the
   * length is whatever is playing the box, every time.
   */
  noteDuration: {
    kind: 'gate',
    source: 'the held MIDI note, or a gate at FC GATE / LC GATE',
  },

  /**
   * §8/#65. p.12 §4.3 has the reader *"Connect the MIDI OUT output of an external MIDI keyboard
   * directly to the MIDI IN 5-pin DIN type input of the MODEL D"*, and p.34's Synthesizer
   * Architecture list — monophonic, analog, three oscillators, one LFO, one VCF, two envelopes —
   * is exhaustive with no sequencer, arpeggiator or keyboard on it.
   */
  patternEntry: {
    kind: 'external',
    reason:
      'it has no sequencer, keyboard or arpeggiator, so every note arrives over MIDI or as a gate and a pitch voltage',
  },

  /**
   * One LFO, and the destinations are the two it reaches **without a cable** — p.8 item (7) for
   * the oscillators and p.10 item (32) for the filter, both by way of the modulation mix.
   * Everything else it can reach it reaches through `LFO TRI` and `LFO SQR`, which `jacks`
   * already describes; listing those here would be listing the patchbay twice.
   */
  features: {
    lfo: {
      count: 1,
      syncable: false,
      destinations: [
        'the three oscillators, via OSCILLATOR MODULATION',
        'the filter cutoff, via FILTER MODULATION',
      ],
    },
  },

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    noteDuration: cite(10),
    patternEntry: cite(12),

    /**
     * `unknown`, and the distinction it turns on is worth stating because this entry was
     * `cited-against` first and that was wrong.
     *
     * The reading behind it is real and stands: p.34's Synthesizer Architecture block lists what
     * this box contains — `Number of voices Monophonic`, `Type Analog`, `Oscillators 3`, `LFO 1`,
     * `VCF 1`, `Envelopes VCA, VCF` — and nothing on it is tempo-driven. The LFO is a free-running
     * frequency range with a CV input and no sync of any kind; there is no sequencer, no
     * arpeggiator, no delay. **But a list that omits a thing is not a page that answers no.**
     *
     * `cited-against`'s bar is a document that addresses the question and comes back negative, the
     * way the Minitaur's does: its MIDI implementation chart prints `Clock | NO | YES` in as many
     * words. This manual has no implementation chart at all — §7 (pp.30-33) is SysEx only — and
     * the sole occurrence of *"MIDI Clock"* in forty-four pages is the glossary definition on
     * p.37, which is about the term rather than about this box. So the honest state is the one for
     * a reading that ran out: read, and the document does not say. There is no `cite` here for the
     * same reason — an `unknown` names no page, because no page answered.
     */
    'clock.canReceiveClock': {
      kind: 'unknown',
      reason:
        'no page addresses whether this box responds to MIDI clock. §7 (pp.30-33) is SysEx only with no MIDI implementation chart anywhere in the document, and the only occurrence of "MIDI Clock" in 44 pages is the glossary definition on p.37. p.34’s Synthesizer Architecture list carries nothing tempo-driven — the LFO is "1 (0.05 Hz to 200 Hz, up to 300 Hz with external CV input)", free-running with no sync control, and there is no sequencer, arpeggiator or delay — but an omission from a list of contents is not a page answering no, so this is a reading that ran out rather than a documented negative',
    },
    /**
     * `unknown`, and the reason is the whole point of the state: one half is answered and the
     * other is not.
     *
     * The DIN side is settled — p.34's Connectivity row reads `MIDI In/Thru`, there is no MIDI
     * OUT socket at all, and p.8 item (3) says `MIDI THRU` *"is used to pass through MIDI data
     * received at the MIDI INPUT"*, which originates nothing. But p.8 item (1) says the USB port
     * *"sends MIDI data to an application"* without saying what data, and there is no
     * implementation chart in this document to ask. Read, and the reading ran out.
     */
    'clock.canSendClock': {
      kind: 'unknown',
      reason:
        'the DIN side is answered — p.34 heads the row "MIDI In/Thru", there is no MIDI OUT socket, and p.8 item (3) says MIDI THRU passes through what arrives at MIDI IN, which originates nothing — but p.8 item (1) gives USB MIDI OUT as "sends MIDI data to an application" without saying what, and §7 (pp.30-33) is SysEx only, so this manual has no MIDI implementation chart to settle it',
    },
    /** p.34's Connectivity block names both wires: `MIDI In/Thru  5-pin DIN / 16 channels` and `USB (MIDI)  USB 2.0, type B`. */
    'clock.transport': cite(SPECS),
    /**
     * `unknown`, and it follows the entry above rather than standing on its own.
     *
     * The Minitaur reaches `cited-against` here by settling the question one level down: a chart
     * says the box cannot transmit clock, so it cannot be a rig's source. That move needs the
     * level below to be *settled*, and here neither half of it is — `canSendClock` is `unknown`
     * because the USB side is open, and `canReceiveClock` is `unknown` for the reason above. An
     * inference from two non-answers is a third non-answer, not a citation.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'no page says what this box is for in a rig, and the capability question it would rest on is not settled either: p.34’s architecture list names no sequencer, arpeggiator or clock generator, but that omission is what leaves both `canSendClock` and `canReceiveClock` unknown above rather than answering them, and an inference from two non-answers is a third',
    },

    'io.main': cite(11),
    'io.individualOuts': cite(11),
    'io.audioIn': cite(9),
    /**
     * `cited-against`: p.34 heads the Connectivity row `USB (MIDI)` and the whole `USB` block
     * gives `Type: Class compliant USB 2.0, type B` with `Supported Operating Systems` and no
     * audio row anywhere in it, while p.8 item (1) calls the port *"a class-compliant USB MIDI
     * device"*. The document says what the port is for, and it is not audio.
     */
    'io.usbAudio': {
      kind: 'cited-against',
      cite: cite(SPECS),
      reason:
        'the specifications head the row "USB (MIDI)", the USB block gives only "Class compliant USB 2.0, type B" with no audio row, and p.8 item (1) calls it "a class-compliant USB MIDI device"',
    },

    /** p.34: `Number of voices  Monophonic`, in one word. */
    voices: cite(SPECS),

    /**
     * §2.6/#236. **A page that proves part of this claim and not the rest.**
     *
     * `features.lfo` asserts three things at once, and p.34 establishes two of them. The count is
     * printed — `LFO  1 (0.05 Hz to 200 Hz, up to 300 Hz with external CV input)` — and the two
     * destinations are the ones the box reaches with no cable, which p.8 item (7) and p.10 item
     * (32) each state in a sentence. `syncable: false` is the third claim and **no page addresses
     * it**: this manual never mentions clock in connection with the box, so a `false` here is a
     * reading of an absence rather than something a page says.
     *
     * Every other state would be wrong about that, which is what #236 exists for. A plain `Cite`
     * would claim p.34 backs all three. `unknown` would say the reading came back with nothing,
     * when it came back with two of three — and the audit would then count a two-thirds-cited
     * fact as undocumented, which invariant 5 asks it not to.
     */
    'features.lfo': {
      kind: 'partly',
      cite: cite(SPECS),
      proven:
        'the count and the rate range — p.34 prints "LFO  1 (0.05 Hz to 200 Hz, up to 300 Hz with external CV input)" — and the two cable-free destinations, which p.8 item (7) gives as the oscillators and p.10 item (32) as the filter',
      open:
        'whether the LFO can be synced. No page of this manual mentions clock in connection with this box, and there is no sync control on the panel, so `syncable: false` is read off an absence rather than off a statement',
    },
    /**
     * `cited-against`: there is no sequencer and no arpeggiator, so there are no per-step lanes to
     * have. p.34's architecture list is exhaustive and carries neither, the contents list has no
     * sequencer chapter, and p.12 §4.3 sets the box up from an external MIDI keyboard.
     */
    'features.perStep': {
      kind: 'cited-against',
      cite: cite(SPECS),
      reason:
        'p.34’s Synthesizer Architecture list runs Number of voices, Type, Oscillators, LFO, VCF and Envelopes and stops; there is no sequencer chapter in the contents, and p.12 §4.3 has every note arriving from an external MIDI keyboard',
    },
    'features.sidechain.internal': {
      kind: 'cited-against',
      cite: cite(SPECS),
      reason:
        'p.34’s architecture list has no compressor, ducker or envelope follower, and the LOUD CV input (p.11 item 48) takes a voltage from outside rather than deriving one from audio',
    },
    /**
     * `unknown` rather than `cited-against`, and the difference is real. The box does take
     * external audio at `EXT` and its `LOUD CV` input could duck the voice from a voltage — but
     * nothing on this box turns audio into that voltage, and no page states either way. That is a
     * reading of the jack list, not an answer the document gives.
     */
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at EXT and mixes it into the filter (p.12 §4.4.1), and LOUD CV could duck the voice from a voltage (p.11 item 48) — but nothing on this box turns audio into that voltage, and no page states either way',
    },

    /**
     * `cited-against`: this box ships no audio content because it holds none. p.34's Synthesizer
     * Architecture list is exhaustive and entirely analog, with no sample memory, no preset store
     * and no factory library on it; the specifications carry no memory or program-count row at
     * all. The manual's own answer to recalling a sound is paper — p.13 §4.12: *"Make copies of
     * the patch sheet in this manual, and record your favorite settings"*, and pp.40-41 are two
     * blank copies of that sheet. No recipe here carries `sourceAudio` and none could.
     */
    content: {
      kind: 'cited-against',
      cite: cite(SPECS),
      reason:
        'p.34’s Synthesizer Architecture list is exhaustive and entirely analog — monophonic, 3 oscillators, 1 LFO, 1 VCF, 2 envelopes — with no sample memory, preset store or program count anywhere in the specifications, and p.13 §4.12 gives the box’s own recall mechanism as "Make copies of the patch sheet in this manual", of which pp.40-41 are two blank copies',
    },
  },

  manual: { title: 'MODEL D User Manual', edition: 'MODEL_D_M_EN' },

  /** One monophonic analog voice — p.34: `Number of voices  Monophonic`. See the header on Poly Chain. */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 1 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,

  /**
   * §8.1. Two jogs, both about something a reader would otherwise hunt for.
   *
   * The first is the `A-440` power-on gesture from p.13 §4.9, which is how the three special modes
   * are reached without a computer. The second is the feedback path, whose whole trick is that
   * *nothing* is plugged in — a reader looking for the overdrive will look for a knob labelled one.
   */
  hints: {
    'power-on-mode': 'At power-on, flick A-440 to set it',
    'feedback-path': 'Leave EXT empty — the output feeds back',
  },

  recipes,
}
