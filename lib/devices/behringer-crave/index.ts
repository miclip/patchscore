import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  PatchEntry,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { CRAVE_PANEL } from './panel'

/**
 * Behringer CRAVE (§2.3). One analog voice, a 3340 oscillator, a 24 dB/octave filter, an ADS
 * envelope, an LFO, a 32-step sequencer — and **thirty-three patch points on a box that already
 * makes a sound with nothing plugged in**.
 *
 * ## One manual, and it is a Quick Start Guide
 *
 * There is no reference manual. Everything below is cited to `CRAVE Quick Start Guide
 * BE_0718-AAJ_WW`, a 40-sheet multilingual document laid out two printed pages to a sheet, so a
 * page citation here is a *printed folio* — p.21 is the right-hand half of PDF sheet 11.
 *
 * The consequence is that this device is **short on numbers by comparison with anything else in
 * the library**. The Specifications pages (pp.70-72) are the only place a control range is
 * printed at all, and they print thirteen of them. Everything else on the panel — TEMPO/GATE
 * LENGTH, the swing that shares it, the ratchet that GLIDE becomes under SHIFT — is described in
 * words and given no scale. Those controls are **absent from every recipe below**, because §3.2
 * has no way to render a value whose legality nobody can check, and inventing a `0-127` to hang
 * one on would be exactly the fabrication `provisional` exists to prevent.
 *
 * `VC MIX` is the sharpest case and is worth naming: p.71 gives it as `lo/mix 1 to hi/mix 2`,
 * which is a real range with named ends and no numbers in it. It is a patchable *destination*
 * here — the jacks are declared and recipes cable to them — but never a rendered value.
 *
 * ## Why the patch list is the recipe (§3.3)
 *
 * The default signal path is already a complete voice: oscillator into a mixer with the noise
 * generator, into the filter, into the VCA, with the envelope and LFO switchable onto each. So a
 * CRAVE recipe is knob positions **plus the cables that reach past the switches** — the LFO onto
 * the oscillator when the switch is giving it to the filter, the envelope onto the VCA when the
 * envelope is committed elsewhere.
 *
 * **Every jack id is written `IN · NAME` or `OUT · NAME`, and both halves come off the page.**
 * The patchbay prints no section headings — it is one flat block of two rows — so the section
 * name the Cascadia uses does not exist here. What does exist is the manual's own division into
 * "Patchbay (3.5 mm TS connections) Input Section" and "Output Section" (p.21), and using that
 * as the qualifier does the same job for a reason the document supports.
 *
 * It also settles the duplicates, which are real and would otherwise be unresolvable standing at
 * the box:
 *
 *  - **`MULTIPLE` is silkscreened three times** — once as an input (48) and twice as outputs
 *    (58, 59), all three adjacent in the top row. The two outputs are the same name in the same
 *    direction, so the prefix alone is not enough and they are numbered `OUT · MULTIPLE 1` and
 *    `OUT · MULTIPLE 2`, in the panel's own left-to-right order.
 *  - **`VC MIX` is silkscreened twice**, input (47) and output (68), and a third time on a knob.
 *
 * The panel resolves all of this typographically — input labels are dark on light, outputs light
 * on dark, with a two-cell `IN`/`OUT` legend at the end of the lower row — which is a thing a
 * drawing can carry and an id cannot.
 *
 * A useful consequence of the prefix: **a cable must run `OUT · ` to `IN · `**, so the direction
 * rule the schema already enforces is visible in the data rather than only checked by it.
 *
 * ## The internal connections the manual states, and the one it does not
 *
 * Four jacks are described as "connected internally to VC MIX" — `MIX 1` (45), `MIX 2` (46),
 * `VC MIX` in (47) and `VC MIX` out (68). That is not a breakable normal but a hardwired block:
 * a voltage-controlled crossfader sitting *outside* the synth's own signal path, which p.20 says
 * in as many words — "This control requires patch cords to operate, as it is outside of the
 * internal sythesizer signal path" (the typo is the manual's). Nothing breaks; the block is inert
 * until it is patched, which is why recipes that use it patch all of it.
 *
 * `MULTIPLE` in (48) is a passive mult: "any signal entered here is passed out to both MULTIPLE
 * outputs".
 *
 * **The one real breakable normal is stated on a knob rather than on a jack**, and is easy to
 * miss: `MIX` (6) "adjust the mix between the VCO output and the internal noise generator. If an
 * external audio input is used, then this is added to the mix, instead of the noise." So patching
 * `IN · EXT AUDIO` displaces the noise generator. A recipe that wants the noise does not touch
 * that jack, and the two that want external audio say so in the note.
 *
 * `MIX CV` (49) is documented as, in full, "mix CV." — nothing more. By position and name it is
 * the CV input for the `MIX` knob, and that reading is left out of every note below because the
 * manual does not support it.
 *
 * ## Clock: receives, does not send
 *
 * `canReceiveClock` is explicit — p.20 item 24 says the TEMPO control sets the clock division
 * "if USB or MIDI clock is used". `canSendClock` is **false**, and that is a judgement about what
 * the document supports rather than about what the hardware can do. MIDI OUT/THRU is described
 * only as "passes through MIDI data received at the MIDI INPUT" (p.21 item 39), the patchbay has
 * no clock or run output among its fifteen, and the sequencer's own clock is nowhere claimed to
 * leave the box. See the note on `ASSIGN` below, which is the one place this may be too strict.
 *
 * ## What is not modelled
 *
 * The sequencer and arpeggiator (pp.20-21, 32 steps, 64 patterns, 8 banks), the SHIFT layer,
 * pattern save, and the MIDI channel DIP switches are performance and configuration rather than
 * per-part settings. `features` is omitted entirely: `perStep` needs the step vocabulary this
 * guide never enumerates, `sidechain` needs a documented ducking source, and the LFO's
 * destinations are a switch with two positions rather than a destination list.
 *
 * No recipe carries step hits. Patterns are template-owned (§4.3).
 */

// ---------------------------------------------------------------------------
// Citations and shared ranges
// ---------------------------------------------------------------------------

const GUIDE = 'CRAVE Quick Start Guide BE_0718-AAJ_WW'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${GUIDE}, p.${page}` }
}

/** `0 to 10`, the box's standard control travel. Nearly every knob — p.70, p.71. */
const TEN = { min: 0, max: 10 }
/** `-5 to +5`, the two centre-detented controls: oscillator FREQUENCY and MIX — p.70. */
const FIVE = { min: -5, max: 5 }
/** `5 to 95%`, pulse width — p.70. The one control the guide gives a unit for. */
const WIDTH = { min: 5, max: 95 }

// ---------------------------------------------------------------------------
// §3.3 The patchbay
// ---------------------------------------------------------------------------

/**
 * Preserves the literal id, so `CraveJack` is a union of literals rather than `string` and a
 * mistyped endpoint is a compile error before it is a Zod error. The Cascadia records what
 * happens without this: a file whose comment claimed a compile-time check it did not have.
 */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * §2.6/#22. **The page is recorded into `JACK_EVIDENCE`, not returned on the jack.**
 *
 * Jack citations moved into the device's one `capabilityEvidence` map, keyed by `jacks[<id>]`, so
 * that a renderer or the audit asks one question to learn who checked a socket, a menu path or a
 * track count. The citation still gets written beside the jack, which is where an author holding
 * the manual writes it; only its destination changed.
 *
 * Written out by hand instead, the map would restate every id as a string key a second time, and
 * a key that drifts from its jack is precisely the failure `DeviceSchema` now checks for. Better
 * not to create the opportunity: there is one spelling of each id in this file.
 */
function jack<Id extends string>(
  id: Id,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  note?: string,
): { id: Id; direction: 'in' | 'out'; signal: JackSignalKind[]; note?: string } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...(note === undefined ? {} : { note }) }
}

/**
 * All thirty-three patch points, in the panel's own order (p.21), each cited once.
 *
 * Declared whole rather than jack by jack. A partial patchbay reads as a claim that the rest do
 * not exist, and on a semi-modular the complement *is* the instrument.
 */
const JACKS = [
  // Input Section, items 40-57 (p.21).
  jack('IN · OSC CV', 'in', ['pitch-cv'], 21, 'Oscillator pitch CV, at 1V/octave'),
  jack('IN · OSC FM', 'in', ['cv'], 21),
  jack('IN · OSC MOD', 'in', ['cv'], 21),
  jack('IN · VCF CUTOFF', 'in', ['cv'], 21),
  jack('IN · VCF RES', 'in', ['cv'], 21),
  jack('IN · MIX 1', 'in', ['cv'], 21, 'Connected internally to VC MIX, not to the synth signal path'),
  jack('IN · MIX 2', 'in', ['cv'], 21, 'Connected internally to VC MIX, not to the synth signal path'),
  jack('IN · VC MIX', 'in', ['cv'], 21, 'The control voltage for the VC MIX crossfade'),
  /**
   * **Five signal kinds, because the patchbay list says "any signal".** MULTIPLE is a passive
   * split: whatever arrives leaves at both outputs, so naming one kind would be a guess dressed
   * as a reading, and naming two would be the same guess with a hedge. The five are every kind
   * a 3.5 mm patch cable on this box can carry; `midi` is the one that is genuinely absent,
   * because the MIDI ports are the rear DIN and USB and not part of the patchbay.
   *
   * This is the honest shape for a signal-agnostic utility, and the list is the reason the field
   * can hold it. `OUT · MULTIPLE 1` and `2` carry the same five for the same sentence.
   */
  jack(
    'IN · MULTIPLE',
    'in',
    ['audio', 'cv', 'gate', 'trigger', 'clock'],
    21,
    'Passed out to both MULTIPLE outputs',
  ),
  jack('IN · MIX CV', 'in', ['cv'], 21),
  jack('IN · EXT AUDIO', 'in', ['audio'], 21, 'Displaces the noise generator in the MIX control'),
  /**
   * The patchbay list gives this jack four words — "TEMPO - sequencer tempo" — and `clock` is
   * what a socket that sets a sequencer's tempo carries. Worth knowing that this box's own
   * `clock.transport` is `['midi-din', 'usb']` and names no analog transport, so the manifest now
   * says a hole takes tempo over a wire the clock spec does not offer. That gap is real and older
   * than this field: declaring `analog-clock` is a capability claim and wants its own page, so it
   * is not made here. The field surfacing it is the field working.
   */
  jack('IN · TEMPO', 'in', ['clock'], 21),
  jack('IN · PLAY/STOP', 'in', ['trigger'], 21, 'A trigger input: more than 3.2 V'),
  jack('IN · RESET', 'in', ['trigger'], 21, 'A trigger input: more than 3.2 V'),
  jack('IN · HOLD', 'in', ['trigger'], 21, 'A trigger input: more than 3.2 V'),
  /**
   * `gate`, not `trigger`, and the note beside it is why the distinction is worth having. The
   * electrical spec is the same 3.2 V threshold as PLAY/STOP, RESET and HOLD — but what this one
   * drives is the envelope, and the envelope's SUSTAIN is "held for as long as the key is held".
   * A duration that matters is the definition of a gate; the other three fire and are done.
   */
  jack('IN · ENV GATE', 'in', ['gate'], 21, 'A trigger input: more than 3.2 V'),
  jack('IN · VCA CV', 'in', ['cv'], 21),
  jack('IN · LFO RATE', 'in', ['cv'], 21),

  // Output Section, items 58-72 (p.21). The two MULTIPLE outputs are numbered left to right.
  jack(
    'OUT · MULTIPLE 1',
    'out',
    ['audio', 'cv', 'gate', 'trigger', 'clock'],
    21,
    'Copy of the MULTIPLE input',
  ),
  jack(
    'OUT · MULTIPLE 2',
    'out',
    ['audio', 'cv', 'gate', 'trigger', 'clock'],
    21,
    'Another copy of the MULTIPLE input',
  ),
  jack('OUT · OSC PULSE', 'out', ['audio'], 21),
  jack('OUT · OSC SAW', 'out', ['audio'], 21, 'Reverse sawtooth'),
  jack('OUT · ENV', 'out', ['cv'], 21, 'Unipolar: 0 to 8 V'),
  jack('OUT · NOISE', 'out', ['audio'], 21),
  jack('OUT · VCA/LINE', 'out', ['audio'], 70, 'The line-level audio output, 3.5 mm TS unbalanced'),
  jack('OUT · PHONES', 'out', ['audio'], 70, 'TRS, not TS like the rest of the patchbay'),
  jack('OUT · LFO TRI', 'out', ['cv'], 21),
  jack('OUT · LFO SQU', 'out', ['cv'], 21),
  jack('OUT · VC MIX', 'out', ['cv'], 21, 'The VC MIX crossfade result'),
  jack('OUT · ASSIGN', 'out', ['cv'], 21, 'What it carries is set in the SHIFT layer; see ASSIGN MODE'),
  jack('OUT · KB CV', 'out', ['pitch-cv'], 21),
  jack('OUT · GATE', 'out', ['gate'], 21, 'Unipolar: 0 / +5 V'),
  jack('OUT · VCF', 'out', ['audio'], 21, 'The filter output, ahead of the VCA'),
] as const

/** Every declared jack id, as a union of literals. `cable()` takes it. */
export type CraveJack = (typeof JACKS)[number]['id']

/**
 * A cable: two declared jacks and what it does.
 *
 * **Every one of these is `verified: false`.** The guide's own default-patch page (p.69) prints a
 * full set of knob positions and *no cables at all*, and there is no walkthrough anywhere in the
 * document that instructs a specific connection. So unlike the Cascadia — where the MAKE A SOUND
 * pages instruct four cables exactly and those four carry their page — nothing here can claim
 * more than "somebody patched this because it sounded right", which is what `false` says.
 */
function cable(from: CraveJack, to: CraveJack, note: string): PatchEntry {
  return { from, to, note, verified: false }
}

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
  unit?: string
  note?: string
}

/**
 * A numeric whose **range** is cited and whose **point is not** (§3.2). The guide states what the
 * control will accept and nothing about where to set it, so `verified: false` sits on every point
 * in this file.
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
 * A switch, whose option set is cited and whose selection is taste (§3.2).
 *
 * **Names are section-qualified and the silkscreen is not.** The panel prints `SHAPE` in both the
 * oscillator and the modulation sections and `MOD SOURCE` in both the oscillator and the filter,
 * so two rows of a rendered guide would carry one name and mean different things. The qualifier
 * is the specification table's own section heading (p.70), so both halves still come off the page.
 */
function sw(name: string, value: string, values: readonly string[], page: number, note?: string): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...(note === undefined ? {} : { note }),
  }
}

/** p.70, Oscillator (VCO) Section > Switches. */
const VCO_SHAPE = ['pulse', 'reverse saw'] as const
const VCO_MOD_SOURCE = ['env/osc mod', 'LFO'] as const
const VCO_MOD_DEST = ['width', 'frequency'] as const
/** p.70, Filter (VCF) Section > Switches. */
const VCF_MODE = ['low pass', 'high pass'] as const
const VCF_MOD_SOURCE = ['env', 'LFO'] as const
const VCF_MOD_POLARITY = ['positive', 'negative'] as const
/** p.70, Output (VCA) and Envelope Sections > Switches. */
const VCA_MODE = ['envelope', 'on'] as const
const SUSTAIN_SWITCH = ['on', 'off'] as const
/** p.71, Modulation Section > Switches. p.20 calls the first position "squarewave". */
const LFO_SHAPE = ['pulse', 'triangular'] as const

/**
 * The sixteen things `OUT · ASSIGN` can carry, verbatim and in the manual's order (p.63).
 *
 * Cited once here rather than restated per recipe, and present at all because `ASSIGN` is the
 * only output on this box whose meaning is *not* fixed by its silkscreen: p.21 describes it, in
 * full, as "assign output". A recipe that patches it and does not say which mode is asking the
 * reader to guess between sixteen.
 */
const ASSIGN_MODES = [
  'Sequencer Accent',
  'Sequencer Clock',
  'Sequencer Clock/2',
  'Sequencer Clock/4',
  'Sequencer Step Ramp',
  'Sequencer Step Saw',
  'Sequencer Step Triangle',
  'Sequencer Step Random',
  'Sequencer Step 1 Trigger Output',
  'MIDI Velocity',
  'MIDI Channel Pressure',
  'MIDI Pitch Bend',
  'MIDI CC1',
  'MIDI CC2',
  'MIDI CC4',
  'MIDI CC7',
] as const

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe below, explicitly rather than by omission.
 *
 * §3.1 makes the recipe citation the default a param inherits when it carries none. Nothing in
 * this guide cites a *recipe* — there is no page that says "these are the settings for a kick" —
 * so the chain has to terminate, and saying so is what stops a param's omitted citation from
 * quietly meaning something one day.
 */

/** The nine controls every recipe sets, in panel order. The voice is one path; all of it matters. */
function core(
  freq: number,
  width: number,
  oscMod: number,
  mix: number,
  cutoff: number,
  res: number,
  vcfMod: number,
  volume: number,
): AuthoredParam[] {
  return [
    num('FREQUENCY', freq, FIVE, 70),
    num('PULSE WIDTH', width, WIDTH, 70, { unit: '%' }),
    num('OSC MOD', oscMod, TEN, 70),
    num('MIX', mix, FIVE, 70, { note: 'Negative is oscillator, positive is noise or external audio' }),
    num('CUTOFF', cutoff, TEN, 70, {
      mood: [{ axis: 'darkness', amount: -4 }],
      note: '20 Hz to 20 kHz across the travel',
    }),
    num('RESONANCE', res, TEN, 70, { mood: [{ axis: 'grit', amount: 2 }] }),
    num('VCF MOD', vcfMod, TEN, 70),
    num('VOLUME', volume, TEN, 70),
  ]
}

/** ADS, and there is no release stage on this box — p.70 lists the envelope as `ADS`. */
function env(attack: number, decay: number, sustain: number, held: 'on' | 'off'): AuthoredParam[] {
  return [
    num('ATTACK', attack, TEN, 70, { note: '2 ms to 3 s across the travel' }),
    num('DECAY', decay, TEN, 70, {
      mood: [{ axis: 'density', amount: -2 }],
      note: '2 ms to 5 s across the travel',
    }),
    num('SUSTAIN', sustain, TEN, 70, { note: '0 to 8 V across the travel' }),
    sw('SUSTAIN SWITCH', held, SUSTAIN_SWITCH, 70, held === 'off' ? 'Off: the level decays after the attack' : undefined),
  ]
}

/**
 * §4.3/#283. **What this box does about an acid line's two gestures**, said on the page because
 * neither can be authored as a step here: `features` is omitted for the reason the header gives —
 * *"`perStep` needs the step vocabulary this guide never enumerates"* — so there is no lane to set
 * and the honest answer is a sentence rather than a value.
 *
 * The accent is real on the `dirty` recipe and unreachable from a pattern: `ASSIGN MODE` is on
 * `Sequencer Accent` (p.63) and the cable takes it to the cutoff, so accented steps do open the
 * filter — but which steps those are is entered on the box's own sequencer, and this guide never
 * says how.
 */
const ACCENT_UNREACHABLE =
  '**Accent:** ASSIGN is on Sequencer Accent (p.63) and the cable carries it to the cutoff, so an accented step opens the filter. Which steps are accented is entered on the sequencer itself — this guide never enumerates a step vocabulary, so the pattern above cannot name them'

const ACCENT_UNPATCHED =
  '**Accent:** nothing here carries a sequencer accent — that needs ASSIGN on Sequencer Accent and a cable to the cutoff, which is the `dirty` recipe beside this one. On this patch ASSIGN is doing the second envelope instead, so an accented step is played rather than programmed'

/** GLIDE is a panel knob, p.71, one setting for every note rather than a per-step lane. */
const slide = (value: string): string =>
  `**Slide:** \`GLIDE ${value}\` above, p.71's "0 to 2 s across the travel". One setting for every note rather than a lane, so the line slides between all of its steps or none of them`

const recipes: Recipe[] = [
  // ---- Low end -----------------------------------------------------------
  {
    id: 'crave-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Envelope-swept kick with the pitch falling into it',
    params: [
      ...core(-2, 50, 0, -5, 3.5, 2, 0, 8),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 2.5, 0, 'off'),
      num('GLIDE', 0, TEN, 71, { note: '0 to 2 s across the travel' }),
    ],
    patch: [
      cable('OUT · ENV', 'IN · OSC FM', 'The pitch drop — envelope onto the oscillator, over the switch'),
    ],
  },
  {
    id: 'crave-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Kick with the filter driven into itself',
    params: [
      ...core(-2, 50, 0, -4, 2, 8.5, 3, 8),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 3, 0, 'off'),
    ],
    patch: [
      cable('OUT · ENV', 'IN · OSC FM', 'The pitch drop'),
      cable('OUT · ENV', 'IN · VCF RES', 'Resonance rising with the hit, so the tail bites'),
    ],
  },
  {
    id: 'crave-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Flat sub, filter closed, nothing above the fundamental',
    params: [
      ...core(-5, 50, 0, -5, 1.5, 0, 0, 9),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 6, 8, 'on'),
    ],
    patch: [
      cable('OUT · ENV', 'IN · VCA CV', 'Envelope to the amplifier directly, so the switch is free'),
    ],
  },
  {
    id: 'crave-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Mid bass with the pulse width moving under it',
    params: [
      ...core(-3, 25, 6, -4, 4.5, 5, 4, 8),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'LFO', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 4, 3, 'on'),
      num('LFO RATE', 1.5, TEN, 71),
      sw('LFO SHAPE', 'triangular', LFO_SHAPE, 71),
    ],
    patch: [
      cable('OUT · ENV', 'IN · VCA CV', 'Envelope to the amplifier, leaving the switch for the filter'),
    ],
  },

  // ---- Acid, lead, stab --------------------------------------------------
  {
    id: 'crave-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Resonant sweep with the accent opening the filter',
    routing: `${ACCENT_UNREACHABLE}. ${slide('2')}`,
    params: [
      ...core(-1, 50, 0, -5, 2.5, 9, 6, 8),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 3, 1, 'off'),
      num('GLIDE', 2, TEN, 71, { note: '0 to 2 s across the travel' }),
      sw('ASSIGN MODE', 'Sequencer Accent', ASSIGN_MODES, 63),
    ],
    patch: [
      cable('OUT · ASSIGN', 'IN · VCF CUTOFF', 'Accent steps open the filter — set ASSIGN to Sequencer Accent'),
    ],
  },
  {
    id: 'crave-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Thinner acid line, high-pass, glide between steps',
    routing: `${ACCENT_UNPATCHED}. ${slide('3.5')}`,
    params: [
      ...core(0, 50, 0, -5, 3, 8, 5, 7.5),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'high pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 2.5, 0.5, 'off'),
      num('GLIDE', 3.5, TEN, 71, { note: '0 to 2 s across the travel' }),
    ],
    patch: [cable('OUT · ENV', 'IN · VCF CUTOFF', 'A second envelope path, on top of the switch')],
  },
  {
    id: 'crave-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Open lead, pulse width wide, filter mostly out of the way',
    params: [
      ...core(0, 80, 3, -5, 8, 3, 2, 8),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'LFO', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'LFO', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(1, 5, 7, 'on'),
      num('LFO RATE', 2, TEN, 71),
      sw('LFO SHAPE', 'triangular', LFO_SHAPE, 71),
      num('GLIDE', 1, TEN, 71, { note: '0 to 2 s across the travel' }),
    ],
    patch: [cable('OUT · LFO TRI', 'IN · OSC MOD', 'Vibrato, independent of the width modulation')],
  },
  {
    id: 'crave-lead-dark',
    role: 'lead',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Muted lead sitting under the top of the mix',
    params: [
      ...core(-1, 50, 0, -5, 4, 4, 3, 7.5),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'negative', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(2, 5, 6, 'on'),
    ],
    patch: [cable('OUT · ENV', 'IN · VCA CV', 'Envelope to the amplifier, so the switch stays on the filter')],
  },
  {
    id: 'crave-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Short stab, one note, filter snapping shut behind it',
    params: [
      ...core(-1, 50, 0, -5, 5, 6, 7, 8),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 1.5, 0, 'off'),
    ],
    patch: [cable('OUT · GATE', 'IN · ENV GATE', 'Retrigger the envelope from the sequencer gate')],
  },

  {
    id: 'crave-stab-clean',
    role: 'stab',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Plain stab, filter open, nothing added to it',
    params: [
      ...core(0, 50, 0, -5, 8.5, 0, 0, 7.5),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 2, 0, 'off'),
    ],
    patch: [cable('OUT · KB CV', 'IN · OSC CV', 'Pitch tracking taken over the patchbay, at 1V/octave')],
  },

  // ---- Noise-borne parts -------------------------------------------------
  {
    id: 'crave-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Raw noise through the filter, oscillator out of the mix',
    params: [
      ...core(0, 50, 0, 5, 6, 4, 0, 7),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 2, 0, 'off'),
    ],
    patch: [cable('OUT · ENV', 'IN · VCF CUTOFF', 'The filter closing across each hit')],
  },
  {
    id: 'crave-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Audio-rate square onto the oscillator, high-passed',
    params: [
      ...core(1, 50, 7, -5, 5.5, 7, 0, 7),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'LFO', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'high pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 2, 0, 'off'),
      // The LFO reaches 350 Hz (p.70), which is audio rate — this recipe is why that matters.
      num('LFO RATE', 10, TEN, 71, { note: 'At the top of the travel the LFO reaches 350 Hz' }),
      sw('LFO SHAPE', 'pulse', LFO_SHAPE, 71),
    ],
    patch: [cable('OUT · LFO SQU', 'IN · OSC FM', 'Audio-rate FM — the LFO tops out at 350 Hz')],
  },
  {
    id: 'crave-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Pitched tom, short fall, no noise in it',
    params: [
      ...core(-3, 50, 0, -5, 3, 3, 4, 8),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 3.5, 0, 'off'),
    ],
    patch: [cable('OUT · ENV', 'IN · OSC FM', 'The fall, shallower than the kick wants')],
  },

  // ---- Long parts --------------------------------------------------------
  {
    id: 'crave-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Slow crossfade between the voice and the noise',
    params: [
      ...core(-2, 50, 0, -2, 4, 2, 2, 6),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'LFO', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'LFO', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'on', VCA_MODE, 70, 'On: the VCA is open and the envelope is free for the filter'),
      ...env(6, 8, 8, 'on'),
      num('LFO RATE', 0.5, TEN, 71),
      sw('LFO SHAPE', 'triangular', LFO_SHAPE, 71),
    ],
    // The VC MIX block is inert until it is patched — p.20 says so of the knob. Using it means
    // patching all of it: two sources, the control voltage, and the result back into the voice.
    patch: [
      cable('OUT · VCF', 'IN · MIX 1', 'The voice into one side of the crossfader'),
      cable('OUT · NOISE', 'IN · MIX 2', 'Noise into the other'),
      cable('OUT · LFO TRI', 'IN · VC MIX', 'The LFO crossfades between them'),
      cable('OUT · VC MIX', 'IN · MULTIPLE', 'The result, mult-ed so it can go two places'),
    ],
  },
  {
    id: 'crave-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Long filter sweep, drawn by hand rather than played',
    params: [
      ...core(-2, 50, 0, -5, 1, 7, 9, 7),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'on', VCA_MODE, 70, 'On: the VCA stays open so the sweep is the whole gesture'),
      ...env(9, 9, 9, 'on'),
    ],
    patch: [cable('OUT · ENV', 'IN · VCF CUTOFF', 'The sweep itself, over the switch')],
  },
  {
    id: 'crave-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Pitch and filter climbing together into the change',
    params: [
      ...core(-4, 50, 8, -5, 2, 6, 8, 7),
      sw('VCO SHAPE', 'reverse saw', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'frequency', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'on', VCA_MODE, 70),
      ...env(10, 10, 10, 'on'),
    ],
    patch: [
      cable('OUT · ENV', 'IN · MULTIPLE', 'One envelope, two destinations'),
      cable('OUT · MULTIPLE 1', 'IN · OSC FM', 'Pitch climbing'),
      cable('OUT · MULTIPLE 2', 'IN · VCF CUTOFF', 'Filter opening with it'),
    ],
  },
  {
    id: 'crave-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'One-shot hit built from external audio rather than the oscillator',
    params: [
      ...core(0, 50, 0, 4, 7, 5, 6, 8),
      sw('VCO SHAPE', 'pulse', VCO_SHAPE, 70),
      sw('VCO MOD SOURCE', 'env/osc mod', VCO_MOD_SOURCE, 70),
      sw('VCO MOD DEST', 'width', VCO_MOD_DEST, 70),
      sw('VCF MODE', 'low pass', VCF_MODE, 70),
      sw('VCF MOD SOURCE', 'env', VCF_MOD_SOURCE, 70),
      sw('VCF MOD POLARITY', 'positive', VCF_MOD_POLARITY, 70),
      sw('VCA MODE', 'envelope', VCA_MODE, 70),
      ...env(0, 4, 0, 'off'),
    ],
    routing: 'MIX toward the noise end — with EXT AUDIO patched, that side of the crossfade is the external source, not the noise generator (p.20)',
    patch: [
      cable('OUT · PHONES', 'IN · EXT AUDIO', 'Feedback through the headphone output — displaces the noise generator'),
    ],
  },
]

// ---------------------------------------------------------------------------
// The device
// ---------------------------------------------------------------------------

/**
 * One voice, and these are the duties it is modelled as taking.
 *
 * **`pad` is deliberately absent** where the Cascadia claims it. The envelope is `ADS` (p.70) —
 * there is no release stage at all, so a pad's tail is not a matter of turning something up. That
 * is a fact about this box rather than a judgement about the part.
 *
 * The percussion roles that need a noise burst and a separate pitched body — `snare`, `clap`,
 * `rim` — are absent for the plainer reason that this is one monophonic voice with one envelope,
 * and a recipe claiming them would be claiming two.
 */
const VOICE_ROLES = [
  'kick',
  'sub',
  'bass-mid',
  'tom',
  'noise',
  'metallic',
  'texture',
  'lead',
  'stab',
  'acid',
  'riser',
  'impact',
  'sweep',
] as const

export const device: Device = {
  id: 'behringer-crave',
  name: 'CRAVE',
  maker: 'Behringer',
  kind: 'semi-modular',

  /**
   * Receives clock, does not claim to send it. p.20 item 24 is the receive half in as many
   * words — the TEMPO control "controls the value of clock division" when "USB or MIDI clock is
   * used". The send half is absent from the document: MIDI OUT/THRU "passes through MIDI data
   * received at the MIDI INPUT" (p.21 item 39), and there is no clock or run output anywhere in
   * the patchbay's fifteen. `preferredSource` is therefore not claimed either (§7.4), and the
   * pages behind that non-claim are in `capabilityEvidence` below rather than in this sentence
   * (§2.6/#120).
   */
  clock: { canSendClock: false, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  /**
   * `usbAudio: false` — the USB port is a class-compliant MIDI device and the specifications row
   * is headed "USB (MIDI)" (p.70). `audioIn: true` is the `EXT AUDIO` jack. One mono output,
   * `VCA/line`, 3.5 mm TS unbalanced; `individualOuts: 0` because PHONES is the same signal.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  physical: {
    panelSpanMm: 320,
    verified: cite(72),
  },

  panel: CRAVE_PANEL,
  jacks: [...JACKS],

  /**
   * §2.6. Every jack above, cited on the page that describes it — plus the recorded non-claim
   * for `clock.preferredSource` (§7.4/#80), which #120 moved out of the `clock` comment.
   *
   * `unknown` rather than `cited-against`: this document does not answer the question in the
   * other direction, it never raises it. It documents a clock coming *in* and no way for one to
   * leave, and the field is not claimable in any case with `canSendClock: false`.
   */
  /**
   * §2.6/#142. p.16, control (24): *"TEMPO/GATE LENGTH - this knob controls the sequencer tempo.
   * During step editing, it also controls the GATE length."* One knob, two jobs, and the second
   * one is per-step — control (29) confirms it by listing GATE LENGTH among what the
   * OCTAVE/LOCATION LEDs display.
   *
   * **`unit` is deliberately absent.** The quick-start names the knob and ranges nothing, here or
   * in the Specifications pages, and a scale invented to fill the field would be exactly the
   * claim §3.1 refuses. The guide names the control and stops, which is all this document
   * supports.
   */
  noteDuration: { kind: 'per-note-value', control: 'GATE LENGTH' },

  capabilityEvidence: {
    noteDuration: cite(16),
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.20 item 24 is the receive half in as many words — TEMPO "controls the value of clock division" when "USB or MIDI clock is used" — and the send half is absent from the document: MIDI OUT/THRU only "passes through MIDI data received at the MIDI INPUT" (p.21 item 39) and none of the patchbay’s fifteen jacks is a clock or run output, so no page states what this box is for in a rig',
    },
  },

  manual: { title: 'CRAVE Quick Start Guide', edition: 'BE_0718-AAJ_WW' },

  /**
   * One voice. "Number of voices: Monophonic" (p.70), stated rather than inferred from the panel.
   */
  voices: [
    { kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 1 },
  ],

  hints: {
    'assign-mode': 'Hold SHIFT + HOLD/REST, page 2',
    'shift-layer': 'Hold SHIFT, then the printed control',
  },

  recipes,
}
