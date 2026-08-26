import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset, NumericRange } from '../../core/params'
import { MINILOGUE_XD_PANEL } from './panel'

/**
 * KORG minilogue xd (§2.3). Two analog oscillators, a digital MULTI ENGINE, one filter, two
 * envelopes, one LFO, three effects — and **four analog voices behind one keyboard**.
 *
 * ## The library's first `kind: 'synth'`, and what that costs
 *
 * Twelve devices in, nothing in the registry was a synthesizer. The Cascadia and the CRAVE are
 * `semi-modular`, which §2.3 reserves for a normalised instrument whose point is the patchbay;
 * the Deluge, the MC-101 and the Tracker Mini are multi-part boxes. `synth` was in `DEVICE_KINDS`
 * from the start with nothing behind it, so this manifest does not widen the picker's filter — it
 * fills a slot that was already offered and, until now, could only ever have returned nothing.
 *
 * ## `polyphony: 4` is one assignable, and VOICE MODE is a knob
 *
 * This is the claim the whole manifest turns on, and it is the one an author coming from the
 * drum machines will get wrong. p.66 states `Maximum polyphony  4 voices`, and p.17 opens the
 * VOICE MODE section with *"The minilogue xd features four analog synthesizer voices. By changing
 * the Voice mode, you can combine and allocate the voices in different ways."*
 *
 * Four voices is **capacity inside one part**, not four parts. §12.4 says `polyphony` counts
 * *notes*, never roles, and the four voices here are exactly that: one patch, one signal path,
 * one set of knob positions, sounding up to four notes of it at once. There is no second patch
 * to put on voice 2 — VCO 1's WAVE switch is in one position for all four.
 *
 * So this device declares **one** `Assignable` of `polyphony: 4`. Declaring four of polyphony 1
 * would be the same error as declaring a TR-1000's BD twice: it would let the resolver hand a
 * pad to "voice 1" and a bass to "voice 2" and print two different patches for one panel, which
 * is not a thing this box can do. `test/korg-minilogue-xd.test.ts` holds that line from both
 * ends — a four-note part fits inside the single assignable, and two simultaneous role requests
 * cannot both be served by it.
 *
 * **VOICE MODE is therefore a recipe parameter** (pp.17-18), sitting alongside CUTOFF and
 * RESONANCE, and never a voice count:
 *
 *  - **POLY at depth 0** is four voices under four keys, and it is what every recipe on a role
 *    that can be asked for more than two notes selects — `pad`, `stab`, `texture`, without
 *    exception.
 *  - **POLY turned right is DUO**, and *this is a polyphony setting wearing a knob*. p.17:
 *    *"Turn the knob to the right to switch to DUO mode, which stacks two voices when playing a
 *    key."* Two voices per key out of four is **two notes**, so a non-zero depth halves what the
 *    patch can play — and the resolver, which sees only `polyphony: 4`, has no way to know. Used
 *    on `lead` alone.
 *  - **UNISON** stacks all four into one, *"as a mono synth"* (p.17). One note. Used on `sub`
 *    and `bass-mid` alone.
 *
 * The last two are the one place this model is looser than the hardware, and it is worth being
 * exact about where the looseness lives. `Assignable.polyphony` is a fact about the box and is
 * right at 4. What is missing is a way for a *recipe* to say "and this patch spends them" —
 * `Recipe` has `realisation`, which can only ever lower a request's demand (§12.4), and nothing
 * that lowers a voice's supply. So a DUO recipe handed a triad, or a UNISON one handed a dyad,
 * would render a patch that cannot play the part.
 *
 * Rather than paper over it, both are **confined to roles that are one or two notes in practice
 * and both say so in a note the reader sees at the machine**; `test/korg-minilogue-xd.test.ts`
 * holds the confinement from the manifest side. The honest fix, if a template ever asks for a
 * three-note `lead`, is a supply-side counterpart to `realisation` on `Recipe` — an engine
 * change, made deliberately, and not a value quietly edited here.
 *  - **CHORD** and **ARP/LATCH** are used by no recipe, deliberately. CHORD makes one key sound a
 *    whole chord, so a guide that prints a triad to play would have the box sound three chords —
 *    and it fits neither `Realisation`: `polyphonic-voice` overstates what the reader plays and
 *    `sampled-chord` renders as *"load a chord sample"*, which is not something this instrument
 *    has any way to do. ARP is a performance mode over notes the template already sequences.
 *    Both are in the `VOICE MODE TYPE` option list, cited, because they exist; neither is chosen.
 *
 * ## What is left out, and why
 *
 * Actual values only (§3.2). **Four of this panel's knobs print a range that a switch elsewhere
 * can replace**, and a value read off the wrong one of two scales is a fabrication however
 * carefully the range beside it is cited. Each is handled at the place the switch is chosen:
 *
 *  - **`EFFECTS TIME`** — p.26, in full: *"The setting range differs depending on the effect type
 *    you select."* No bounds at all are printed, so it is absent from every recipe.
 *  - **`MULTI ENGINE SHAPE` under VPM** — p.22 gives `MOD DEPTH [0.00:15.00...]` and then
 *    *"(range changes depending on TYPE)"*. The VPM recipes set the oscillator type and leave
 *    the shape knob unstated. Under NOISE the same knob has four *fully printed* ranges (p.20),
 *    in three different units, and `noiseEngine` picks the one its type names.
 *  - **`LFO RATE`** — `[0...1023 / 4, 2, 1, 0, 3/4...1/64]` (p.25). The left scale holds in
 *    1-SHOT and NORMAL; BPM swaps in the right one, whose options the page prints with an
 *    ellipsis and therefore does not print. No recipe selects BPM.
 *  - **`VOICE MODE DEPTH`** — a different scale under each of the four modes (pp.17-18), two of
 *    them numeric and two of them lists. `poly`, `duo` and `unison` each pair the mode with its
 *    own range, so the pairing cannot come apart.
 *
 * **`MASTER`** is absent for the plainer reason: the output level knob is listed on p.5 and
 * never scaled anywhere.
 *
 * The **USR** engine is absent for a different reason: a user oscillator is a file you load
 * (p.22, the logue SDK), so its `TYPE` list is whatever is on the unit and its `SHAPE` means
 * whatever that oscillator decides. Nothing about it is citable from this document.
 *
 * Also unmodelled: the 16-step sequencer, motion sequencing, the joystick and CV IN assignments,
 * poly chain, and the GLOBAL settings. Patterns are template-owned (§4.3), so no recipe carries
 * step hits, and `features.perStep` is omitted — this box's per-step data is note and motion
 * recording rather than a vocabulary of per-step switches.
 *
 * **No `jacks`.** §3.3's patch points are for a box a recipe cables *into itself*; this one has
 * no audio patchbay. SYNC, CV IN, MIDI and the outputs are rig connections, and §10's rack
 * already draws those from `clock` and `io`.
 *
 * ## Clock: both directions, and three transports
 *
 * `canSendClock` and `canReceiveClock` are both true and both stated. p.58 gives the send half
 * outright — with `Clock Source` set to `Internal`, *"the tempo that is set using the TEMPO knob
 * on the minilogue xd will be sent as MIDI timing clock data"* — and the receive half is
 * `Clock Source [Auto (USB), Auto (MIDI), Internal]` on p.46. The third transport is the volca
 * sync pair: `SYNC OUT` puts out *"a 5 V pulse, 15 ms long at the beginning of each step"* and
 * `SYNC IN` overrides the MIDI setting entirely (p.7, p.46). It carries no start or stop (p.55),
 * which is why it is a transport and not a reason to claim `preferredSource` — a synth is not a
 * box whose job in a rig is to drive it (§7.4).
 */

// ---------------------------------------------------------------------------
// Citations and the ranges the panel repeats
// ---------------------------------------------------------------------------

const MANUAL = "minilogue xd Owner's Manual E 9"

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * `[0...1023]`, and it is worth naming how many controls share it: SHAPE on both oscillators,
 * CROSS MOD DEPTH, all three MIXER levels, CUTOFF, RESONANCE, all four AMP EG stages, both EG
 * stages, and LFO RATE. Every one of those is cited individually below — a shared constant here
 * is the *value* being reused, never the citation, because the pages differ (pp.18-25).
 */
const K: Omit<NumericRange, 'verified'> = { min: 0, max: 1023 }

// ---------------------------------------------------------------------------
// Param helpers (§3.1: the range is cited, the point is taste)
// ---------------------------------------------------------------------------

type NumExtra = { mood?: MoodOffset[]; unit?: string; note?: string; hint?: string }

/**
 * A numeric whose **range** is cited and whose **point is not**. The manual states what each
 * control will accept and never where to set it for a sound, so `verified: false` sits on every
 * point in this file — the same split the CRAVE and the Cascadia make.
 */
function num(
  name: string,
  value: number,
  bounds: Omit<NumericRange, 'verified'>,
  page: number,
  extra: NumExtra = {},
): AuthoredParam {
  return { kind: 'numeric', name, value, range: { ...bounds, verified: cite(page) }, verified: false, ...extra }
}

/** A switch: the option set is cited, the position chosen is taste (§3.2). */
function sw(
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

// ---------------------------------------------------------------------------
// Option sets, verbatim and in the manual's own order
// ---------------------------------------------------------------------------

/** p.17, Voice mode list. All four exist; two are chosen — see the module note. */
const VOICE_MODES = ['POLY', 'UNISON', 'CHORD', 'ARP/LATCH'] as const
/** p.18, VCO 1 and VCO 2. The panel prints the waveform glyphs; the manual prints the names. */
const VCO_WAVES = ['SQR', 'TRI', 'SAW'] as const
const VCO_OCTAVES = ["16'", "8'", "4'", "2'"] as const
/** p.19, both switches, printed `[OFF/ON]`. */
const OFF_ON = ['OFF', 'ON'] as const
/** p.19, MULTI ENGINE. */
const MULTI_ENGINES = ['NOISE', 'VPM', 'USR'] as const
/** p.20, the four noise generators. */
const NOISE_TYPES = ['High', 'Low', 'Peak', 'Decim'] as const
/** p.21, all sixteen VPM oscillator types, in the manual's order. */
const VPM_TYPES = [
  'Sin1', 'Sin2', 'Sin3', 'Sin4',
  'Saw1', 'Saw2', 'Squ1', 'Squ2',
  'Fat1', 'Fat2', 'Air1', 'Air2',
  'Decay1', 'Decay2', 'Creep', 'Throat',
] as const
/** p.23, both three-position switches in the FILTER section. */
const THIRDS = ['0%', '50%', '100%'] as const
/** p.24, what the second envelope is applied to. */
const EG_TARGETS = ['PITCH', 'PITCH 2', 'CUTOFF'] as const
/** p.25, the LFO. */
const LFO_MODES = ['1-SHOT', 'NORMAL', 'BPM'] as const
const LFO_TARGETS = ['CUTOFF', 'SHAPE', 'PITCH'] as const
/** p.26, the two EFFECTS switches. */
const FX_SLOTS = ['DEL', 'REV', 'MOD'] as const
const FX_STATES = ['OFF', 'ON', 'SELECT'] as const

// ---------------------------------------------------------------------------
// Sections, in panel order. Every recipe is these blocks in this sequence.
// ---------------------------------------------------------------------------

/**
 * The two program-wide settings a recipe is entitled to state. PORTAMENTO is a front-panel knob
 * (p.17); Swing lives in PROGRAM EDIT and carries the hint that reaches it (p.41).
 *
 * Swing is the only param on this device that declares the `swing` axis, which is how §6 wants a
 * device to opt in — no capability check, just a parameter that names the axis.
 */
function program(portamento: number, swing: number): AuthoredParam[] {
  return [
    num('PORTAMENTO', portamento, { min: 0, max: 127 }, 17),
    num('SWING', swing, { min: -75, max: 75 }, 41, {
      unit: '%',
      mood: [{ axis: 'swing', amount: 45 }],
      hint: 'seq-parameter',
      note: '0 is straight; the arpeggiator uses the same value',
    }),
  ]
}

/**
 * The three rungs of the voice-mode ladder, and **each one says what it costs**.
 *
 * `VOICE MODE DEPTH` is not one knob with one meaning: p.17 gives it a different scale under
 * every mode, and under two of them turning it right *spends voices*. That makes the choice of
 * helper a polyphony decision, not a flavour one, so there are three of them rather than one
 * with a number:
 *
 *     poly()          4 notes   POLY, depth 0
 *     duo(depth)      2 notes   POLY, depth right — "stacks two voices when playing a key"
 *     unison(detune)  1 note    UNISON — "as a mono synth"
 *
 * The engine cannot express the last two: nothing on `Recipe` caps the notes a recipe will
 * accept, so a `duo` recipe handed a triad would render a patch that cannot play it. The
 * response is the one §3.2 takes everywhere else — confine it and state it — so `duo` is used
 * only on `lead` and `unison` only on `sub` and `bass-mid`, each carries a note the reader sees
 * at the machine, and `test/korg-minilogue-xd.test.ts` holds the confinement.
 *
 * Everything that can be asked for more than two notes — `pad`, `stab`, `texture` — takes
 * `poly()` and keeps all four voices. That is not a preference: a `pad` request is the one the
 * templates actually make at three and four notes.
 */
function poly(): AuthoredParam[] {
  return [
    sw('VOICE MODE TYPE', 'POLY', VOICE_MODES, 17),
    num('VOICE MODE DEPTH', 0, K, 17, {
      note: 'Left at 0 — turning right crosses into DUO, which spends two voices on every key',
    }),
  ]
}

/** POLY with the knob right: DUO, two voices stacked and detuned per key (p.17). Two notes. */
function duo(depth: number): AuthoredParam[] {
  return [
    sw('VOICE MODE TYPE', 'POLY', VOICE_MODES, 17),
    num('VOICE MODE DEPTH', depth, K, 17, {
      note: 'Right of 0 is DUO: two voices stacked and detuned per key, so this patch plays two notes at a time',
    }),
  ]
}

/** UNISON: all four voices on one note, detuned against each other (p.17). Mono, and it says so. */
function unison(detune: number): AuthoredParam[] {
  return [
    sw('VOICE MODE TYPE', 'UNISON', VOICE_MODES, 17, {
      note: 'All four voices stack into one — this patch plays a single note at a time',
    }),
    num('VOICE MODE DEPTH', detune, { min: 0, max: 50 }, 17, { unit: 'c', note: 'Detune between the stacked voices' }),
  ]
}

function vco1(wave: string, octave: string, pitch: number, shape: number): AuthoredParam[] {
  return [
    sw('VCO 1 · WAVE', wave, VCO_WAVES, 18),
    sw('VCO 1 · OCTAVE', octave, VCO_OCTAVES, 18),
    num('VCO 1 · PITCH', pitch, { min: -1200, max: 1200 }, 18, { unit: 'c' }),
    num('VCO 1 · SHAPE', shape, K, 18, { note: 'Shape, complexity, or duty cycle of the selected wave' }),
  ]
}

/**
 * VCO 2 carries three controls VCO 1 does not: the two modulation switches and CROSS MOD DEPTH,
 * all three of which act *on* oscillator 2 (p.19). `CROSS MOD DEPTH` is the device's second grit
 * parameter, because pitch modulation from oscillator 1 is where this box's dirt comes from.
 */
function vco2(
  wave: string,
  octave: string,
  pitch: number,
  shape: number,
  sync: string,
  ring: string,
  crossMod: number,
): AuthoredParam[] {
  return [
    sw('VCO 2 · WAVE', wave, VCO_WAVES, 18),
    sw('VCO 2 · OCTAVE', octave, VCO_OCTAVES, 18),
    num('VCO 2 · PITCH', pitch, { min: -1200, max: 1200 }, 18, { unit: 'c' }),
    num('VCO 2 · SHAPE', shape, K, 18),
    sw('VCO 2 · SYNC', sync, OFF_ON, 19, { note: 'Locks oscillator 2 to the phase of oscillator 1' }),
    sw('VCO 2 · RING', ring, OFF_ON, 19, { note: 'Oscillator 1 ring-modulates oscillator 2' }),
    num('CROSS MOD DEPTH', crossMod, K, 19, {
      mood: [{ axis: 'grit', amount: 110 }],
      note: 'Oscillator 1 modulating the pitch of oscillator 2',
    }),
  ]
}

/**
 * The MULTI ENGINE as a noise generator (p.20). Its SHAPE knob is the one control on this panel
 * whose *range and unit both change with a switch*, and all four are printed — so each is cited
 * where it is stated rather than flattened onto one invented scale.
 */
const NOISE_SHAPE: Record<
  (typeof NOISE_TYPES)[number],
  { bounds: Omit<NumericRange, 'verified'>; note: string }
> = {
  High: { bounds: { min: 10, max: 21000 }, note: 'CUTOFF — the high-pass filter on the noise' },
  Low: { bounds: { min: 10, max: 21000 }, note: 'CUTOFF — the low-pass filter on the noise' },
  Peak: { bounds: { min: 110, max: 880 }, note: 'BANDWIDTH — the peak filter width' },
  Decim: { bounds: { min: 240, max: 48000 }, note: 'RATE — the decimator sample rate' },
}

function noiseEngine(type: (typeof NOISE_TYPES)[number], shape: number): AuthoredParam[] {
  const { bounds, note } = NOISE_SHAPE[type]
  return [
    sw('MULTI ENGINE · NOISE/VPM/USR', 'NOISE', MULTI_ENGINES, 19),
    sw('MULTI ENGINE · TYPE', type, NOISE_TYPES, 20),
    num('MULTI ENGINE · SHAPE', shape, bounds, 20, { unit: 'Hz', note }),
  ]
}

/**
 * The MULTI ENGINE as a VPM oscillator (p.21). **No SHAPE value**: p.22 prints `MOD DEPTH
 * [0.00:15.00...]` followed by *"(range changes depending on TYPE)"*, which is a range with no
 * bounds, and §3.2 has nowhere to hang a value whose legality nobody can check.
 */
function vpmEngine(type: (typeof VPM_TYPES)[number]): AuthoredParam[] {
  return [
    sw('MULTI ENGINE · NOISE/VPM/USR', 'VPM', MULTI_ENGINES, 19),
    sw('MULTI ENGINE · TYPE', type, VPM_TYPES, 21, {
      hint: 'multi-alt',
      note: 'SHAPE sets MOD DEPTH here, on a scale the manual gives no bounds for',
    }),
  ]
}

/** The three source levels (p.22). Balance is the whole of this section. */
function mix(vco1Level: number, vco2Level: number, multi: number): AuthoredParam[] {
  return [
    num('MIXER · VCO 1', vco1Level, K, 22),
    num('MIXER · VCO 2', vco2Level, K, 22),
    num('MIXER · MULTI', multi, K, 22),
  ]
}

/** The filter (p.23). CUTOFF carries darkness and RESONANCE carries grit, on every recipe. */
function filt(cutoff: number, resonance: number, drive: string, keytrack: string): AuthoredParam[] {
  return [
    num('CUTOFF', cutoff, K, 23, {
      mood: [{ axis: 'darkness', amount: -230 }],
      note: 'Set too low and the patch may be barely audible',
    }),
    num('RESONANCE', resonance, K, 23, { mood: [{ axis: 'grit', amount: 150 }] }),
    sw('DRIVE', drive, THIRDS, 23, { note: 'The filter drive circuit, in three stages' }),
    sw('KEYTRACK', keytrack, THIRDS, 23, { note: '100% moves the cutoff with the key, centred on C4' }),
  ]
}

/** AMP EG (p.24) — the amplitude envelope, and where density and space are declared. */
function ampEg(attack: number, decay: number, sustain: number, release: number): AuthoredParam[] {
  return [
    num('AMP EG · ATTACK', attack, K, 24),
    num('AMP EG · DECAY', decay, K, 24, { mood: [{ axis: 'density', amount: -140 }] }),
    num('AMP EG · SUSTAIN', sustain, K, 24),
    num('AMP EG · RELEASE', release, K, 24, { mood: [{ axis: 'space', amount: 170 }] }),
  ]
}

/** The second envelope (p.24). Two stages, a bipolar amount, and a three-way destination. */
function eg(attack: number, decay: number, int: number, target: string): AuthoredParam[] {
  return [
    num('EG · ATTACK', attack, K, 24),
    num('EG · DECAY', decay, K, 24),
    num('EG · INT', int, { min: -100, max: 100 }, 24, { unit: '%', note: 'Negative applies the envelope downwards' }),
    sw('EG · TARGET', target, EG_TARGETS, 24),
  ]
}

/**
 * The LFO (p.25).
 *
 * **`RATE` is `[0...1023]` only in 1-SHOT and NORMAL**, and that is why no recipe below selects
 * BPM. p.25 prints the knob as `[0...1023 / 4, 2, 1, 0, 3/4...1/64]`: two scales behind one
 * control, and in BPM mode the right-hand one replaces the left entirely. A numeric `260` under
 * BPM is not a value the box can be at — it is a reading off the scale the mode has switched
 * away from, which is a fabrication wearing a cited range (invariant 5).
 *
 * Nor can BPM be authored as the enum it really is: the manual prints its divisions with an
 * ellipsis, so the option set is not on the page and §3.2 has no citable legality gate for it.
 * So `BPM` is in `LFO_MODES` because the switch has it, and is chosen by nothing — the same
 * call, for the same reason, as `EFFECTS · TIME`.
 */
function lfo(wave: string, mode: string, rate: number, int: number, target: string): AuthoredParam[] {
  return [
    sw('LFO · WAVE', wave, VCO_WAVES, 25),
    sw('LFO · MODE', mode, LFO_MODES, 25),
    num('LFO · RATE', rate, K, 25),
    num('LFO · INT', int, { min: 0, max: 511 }, 25, { hint: 'lfo-invert' }),
    sw('LFO · TARGET', target, LFO_TARGETS, 25),
  ]
}

/**
 * The effects (p.26), and a deliberate limitation stated rather than hidden. All three effects
 * can be on at once, each keeping its own stored on/off, time and depth — but there is one pair
 * of knobs and one selector, so a recipe can only state the settings of the effect it names. The
 * two it does not name keep whatever the program already held.
 */
function fx(slot: string, state: string, depth: number): AuthoredParam[] {
  return [
    sw('EFFECTS · DEL/REV/MOD', slot, FX_SLOTS, 26, {
      note: 'Selects which effect the two knobs below are setting; the other two keep their stored values',
    }),
    sw('EFFECTS · OFF/ON/SELECT', state, FX_STATES, 26, { hint: 'fx-subtype' }),
    num('EFFECTS · DEPTH', depth, { min: 0, max: 100 }, 26, {
      unit: '%',
      mood: [{ axis: 'space', amount: 20 }],
    }),
  ]
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe, explicitly rather than by omission — the same reasoning the
 * CRAVE records. §3.1 makes the recipe citation the default a param inherits when it carries
 * none, and every param here carries its own, so the chain has to terminate somewhere. Nothing
 * in this manual says "these are the settings for a pad".
 *
 * **Every recipe is `polyphonic-voice`, by omission and on purpose.** §12.4's other realisation
 * is a chord baked into one sample, and there is no sample anywhere in this instrument. That is
 * what makes `pad` and `stab` here genuinely different from the Tracker Mini's chord pad: asked
 * for a triad, this box sounds three of its four voices, and asked for a four-note voicing it
 * sounds all four. §7.1 ranks that ahead of a chord sample and ahead of character fidelity, so a
 * rig holding both will bring the pad here.
 */
const recipes: Recipe[] = [
  // ---- pad: all six characters, because this is the role the box is for ---
  {
    id: 'mxd-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Slow triangle pad, four voices, nothing sharp anywhere in it',
    params: [
      ...program(12, 0),
      ...poly(),
      ...vco1('TRI', "8'", 0, 300),
      ...vco2('TRI', "8'", 7, 240, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 900),
      ...mix(720, 600, 90),
      ...filt(430, 120, '0%', '50%'),
      ...ampEg(560, 700, 830, 720),
      ...eg(400, 620, 22, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 150, 90, 'SHAPE'),
      ...fx('REV', 'ON', 55),
    ],
  },
  {
    id: 'mxd-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Low pad with the filter shut down over the top of it',
    params: [
      ...program(20, 0),
      ...poly(),
      ...vco1('SAW', "16'", 0, 380),
      ...vco2('TRI', "8'", -9, 200, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 400),
      ...mix(700, 540, 120),
      ...filt(300, 180, '50%', '50%'),
      ...ampEg(620, 760, 800, 780),
      ...eg(500, 700, -18, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 110, 70, 'CUTOFF'),
      ...fx('REV', 'ON', 62),
    ],
  },
  {
    id: 'mxd-pad-bright',
    role: 'pad',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Open saw pad, filter well out of the way, top end left alone',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SAW', "8'", 0, 520),
      ...vco2('SAW', "8'", 11, 480, 'OFF', 'OFF', 0),
      ...noiseEngine('High', 9000),
      ...mix(700, 660, 140),
      ...filt(760, 200, '0%', '100%'),
      ...ampEg(420, 640, 860, 700),
      ...eg(320, 560, 30, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 190, 60, 'SHAPE'),
      ...fx('MOD', 'ON', 45),
    ],
  },
  {
    id: 'mxd-pad-clean',
    role: 'pad',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Plain four-voice pad, no drive, no ring, nothing added',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('TRI', "8'", 0, 300),
      ...vco2('SQR', "8'", 4, 512, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 2000),
      ...mix(760, 500, 0),
      ...filt(600, 60, '0%', '50%'),
      ...ampEg(380, 640, 840, 640),
      ...eg(300, 520, 14, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 140, 40, 'SHAPE'),
      ...fx('MOD', 'ON', 30),
    ],
  },
  {
    id: 'mxd-pad-dirty',
    role: 'pad',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Pad with cross modulation under it and the drive circuit open',
    params: [
      ...program(24, 0),
      ...poly(),
      ...vco1('SAW', "8'", 0, 620),
      ...vco2('SQR', "8'", -14, 700, 'OFF', 'ON', 340),
      ...vpmEngine('Air2'),
      ...mix(680, 620, 300),
      ...filt(480, 520, '100%', '50%'),
      ...ampEg(520, 700, 760, 700),
      ...eg(420, 640, 26, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 170, 120, 'SHAPE'),
      ...fx('REV', 'ON', 48),
    ],
  },
  {
    id: 'mxd-pad-hard',
    role: 'pad',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Square pad that arrives quickly and holds its edge',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SQR', "8'", 0, 620),
      ...vco2('SAW', "4'", 6, 540, 'ON', 'OFF', 0),
      ...noiseEngine('Peak', 620),
      ...mix(740, 520, 160),
      ...filt(620, 420, '50%', '100%'),
      ...ampEg(90, 520, 780, 460),
      ...eg(60, 480, 40, 'CUTOFF'),
      ...lfo('SQR', 'NORMAL', 200, 50, 'CUTOFF'),
      ...fx('DEL', 'ON', 34),
    ],
  },

  // ---- stab: short, four-voice, and the second reason this box is here -----
  {
    id: 'mxd-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Four-voice stab with the filter snapping shut behind the chord',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SAW', "8'", 0, 480),
      ...vco2('SAW', "8'", 9, 460, 'OFF', 'OFF', 0),
      ...noiseEngine('Peak', 500),
      ...mix(780, 620, 180),
      ...filt(560, 520, '50%', '50%'),
      ...ampEg(0, 300, 0, 240),
      ...eg(0, 260, 62, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 200, 0, 'CUTOFF'),
      ...fx('DEL', 'ON', 28),
    ],
  },
  {
    id: 'mxd-stab-clean',
    role: 'stab',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Plain chord stab, filter open, no drive on it at all',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SQR', "8'", 0, 512),
      ...vco2('TRI', "8'", 5, 300, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 6000),
      ...mix(760, 480, 60),
      ...filt(720, 120, '0%', '50%'),
      ...ampEg(0, 340, 120, 300),
      ...eg(0, 300, 20, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 160, 0, 'SHAPE'),
      ...fx('REV', 'ON', 26),
    ],
  },
  {
    id: 'mxd-stab-dirty',
    role: 'stab',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Ring-modulated stab, drive at full, chord still readable under it',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SAW', "8'", 0, 700),
      ...vco2('SQR', "4'", -22, 760, 'OFF', 'ON', 420),
      ...vpmEngine('Fat1'),
      ...mix(700, 560, 380),
      ...filt(500, 620, '100%', '50%'),
      ...ampEg(0, 320, 60, 280),
      ...eg(0, 280, 54, 'CUTOFF'),
      ...lfo('SQR', 'NORMAL', 240, 60, 'SHAPE'),
      ...fx('DEL', 'ON', 32),
    ],
  },
  {
    id: 'mxd-stab-bright',
    role: 'stab',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Sharp top-end stab, oscillator sync doing the work',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SAW', "8'", 0, 560),
      ...vco2('SAW', "4'", 240, 620, 'ON', 'OFF', 0),
      ...noiseEngine('High', 12000),
      ...mix(660, 700, 200),
      ...filt(820, 300, '0%', '100%'),
      ...ampEg(0, 280, 40, 260),
      ...eg(0, 240, 48, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 220, 0, 'SHAPE'),
      ...fx('DEL', 'ON', 30),
    ],
  },

  // ---- lead ---------------------------------------------------------------
  {
    id: 'mxd-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Sync lead, DUO stacked, sitting over the top of the mix',
    params: [
      ...program(30, 0),
      ...duo(760),
      ...vco1('SAW', "8'", 0, 520),
      ...vco2('SAW', "8'", 300, 600, 'ON', 'OFF', 0),
      ...noiseEngine('High', 14000),
      ...mix(700, 640, 80),
      ...filt(780, 340, '0%', '100%'),
      ...ampEg(60, 480, 760, 380),
      ...eg(40, 420, 34, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 210, 60, 'PITCH'),
      ...fx('DEL', 'ON', 36),
    ],
  },
  {
    id: 'mxd-lead-dark',
    role: 'lead',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Muted lead an octave down, filter tracking the keys only halfway',
    params: [
      ...program(48, 0),
      ...duo(620),
      ...vco1('TRI', "8'", 0, 340),
      ...vco2('SAW', "16'", -6, 300, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 1200),
      ...mix(720, 520, 60),
      ...filt(400, 260, '50%', '50%'),
      ...ampEg(120, 560, 720, 520),
      ...eg(90, 500, -22, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 130, 80, 'PITCH'),
      ...fx('REV', 'ON', 44),
    ],
  },
  {
    id: 'mxd-lead-dirty',
    role: 'lead',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Cross-modulated lead, drive up, pitch never quite settling',
    params: [
      ...program(36, 0),
      ...duo(820),
      ...vco1('SAW', "8'", 0, 660),
      ...vco2('SQR', "8'", -18, 720, 'OFF', 'OFF', 520),
      ...vpmEngine('Creep'),
      ...mix(680, 600, 320),
      ...filt(540, 600, '100%', '50%'),
      ...ampEg(70, 500, 700, 420),
      ...eg(50, 460, 44, 'CUTOFF'),
      ...lfo('SQR', 'NORMAL', 260, 140, 'PITCH'),
      ...fx('DEL', 'ON', 40),
    ],
  },

  // ---- low end: the two roles UNISON is confined to -----------------------
  {
    id: 'mxd-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Four voices stacked into one mid bass, barely detuned',
    params: [
      ...program(0, 0),
      ...unison(6),
      ...vco1('SAW', "16'", 0, 400),
      ...vco2('TRI', "16'", -5, 260, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 700),
      ...mix(780, 520, 60),
      ...filt(330, 240, '50%', '50%'),
      ...ampEg(0, 520, 600, 260),
      ...eg(0, 420, -26, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 120, 0, 'CUTOFF'),
      ...fx('MOD', 'OFF', 0),
    ],
  },
  {
    id: 'mxd-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Mid bass through the drive circuit with the resonance up on it',
    params: [
      ...program(0, 0),
      ...unison(22),
      ...vco1('SAW', "16'", 0, 640),
      ...vco2('SQR', "16'", -12, 700, 'OFF', 'OFF', 260),
      ...vpmEngine('Fat2'),
      ...mix(740, 560, 260),
      ...filt(400, 640, '100%', '50%'),
      ...ampEg(0, 480, 560, 240),
      ...eg(0, 400, 38, 'CUTOFF'),
      ...lfo('SQR', 'NORMAL', 180, 90, 'CUTOFF'),
      ...fx('MOD', 'ON', 22),
    ],
  },
  {
    id: 'mxd-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Flat sub, one triangle at 16 feet, nothing above the fundamental',
    params: [
      ...program(0, 0),
      ...unison(0),
      ...vco1('TRI', "16'", 0, 200),
      ...vco2('TRI', "16'", 0, 200, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 200),
      ...mix(900, 300, 0),
      ...filt(220, 0, '0%', '0%'),
      ...ampEg(0, 640, 780, 300),
      ...eg(0, 400, 0, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 100, 0, 'CUTOFF'),
      ...fx('MOD', 'OFF', 0),
    ],
  },
  {
    id: 'mxd-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Plain sub with a short tail and no drive anywhere on the path',
    params: [
      ...program(0, 0),
      ...unison(0),
      ...vco1('SQR', "16'", 0, 512),
      ...vco2('TRI', "16'", 0, 220, 'OFF', 'OFF', 0),
      ...noiseEngine('Low', 300),
      ...mix(860, 260, 0),
      ...filt(280, 40, '0%', '0%'),
      ...ampEg(0, 420, 520, 200),
      ...eg(0, 340, 12, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 90, 0, 'CUTOFF'),
      ...fx('MOD', 'OFF', 0),
    ],
  },

  // ---- texture: the sustaining, non-melodic use of four voices ------------
  {
    id: 'mxd-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Held bed, LFO on the shapes, the notes never arriving together',
    params: [
      ...program(64, 0),
      ...poly(),
      ...vco1('TRI', "8'", 0, 260),
      ...vco2('TRI', "4'", 14, 300, 'OFF', 'OFF', 0),
      ...noiseEngine('Peak', 300),
      ...mix(620, 560, 240),
      ...filt(460, 160, '0%', '50%'),
      ...ampEg(760, 820, 900, 900),
      ...eg(700, 800, 18, 'CUTOFF'),
      ...lfo('TRI', 'NORMAL', 150, 180, 'SHAPE'),
      ...fx('REV', 'ON', 72),
    ],
  },
  {
    id: 'mxd-texture-dirty',
    role: 'texture',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Decimated noise bed with the oscillators well behind it',
    params: [
      ...program(0, 0),
      ...poly(),
      ...vco1('SQR', "8'", 0, 760),
      ...vco2('SAW', "2'", -30, 800, 'OFF', 'ON', 600),
      ...noiseEngine('Decim', 1800),
      ...mix(320, 300, 820),
      ...filt(520, 560, '100%', '0%'),
      ...ampEg(600, 780, 820, 860),
      ...eg(520, 720, 46, 'CUTOFF'),
      ...lfo('SQR', 'NORMAL', 220, 220, 'CUTOFF'),
      ...fx('REV', 'ON', 66),
    ],
  },
]

// ---------------------------------------------------------------------------
// §2.3 Manifest
// ---------------------------------------------------------------------------

/**
 * The six roles one four-note analog voice can honestly claim.
 *
 * `pad` and `stab` are the reason the device is in the library: four voices, one patch, real
 * simultaneous notes. `lead`, `bass-mid` and `sub` are the monophonic uses of the same voice,
 * and `texture` is the sustained non-melodic one.
 *
 * Everything else is absent for reasons the box states about itself. There is one envelope pair
 * and one filter, so the percussion roles that need a noise transient over an independent pitched
 * body — `kick`, `snare`, `clap`, `rim` — would be claiming two voices out of one. `arp` is a
 * near miss worth naming: the box has an arpeggiator (`ARP/LATCH`, p.18), but it arpeggiates keys
 * a player holds rather than a part a template sequenced, and no recipe here selects it.
 */
const VOICE_ROLES = ['pad', 'stab', 'lead', 'bass-mid', 'sub', 'texture'] as const

export const device: Device = {
  id: 'korg-minilogue-xd',
  name: 'minilogue xd',
  maker: 'KORG',
  kind: 'synth',

  /**
   * Both directions, three transports. See the module note: p.58 for sending MIDI clock, p.46 for
   * `Clock Source`, and pp.7/46/55 for the volca-style sync pair, which overrides the MIDI
   * setting whenever a cable is in `SYNC IN`.
   *
   * `preferredSource` is not claimed (§7.4). This box can drive a rig and its job is not to —
   * the pages behind that are in `capabilityEvidence` below, not in this comment (§2.6/#120).
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb', 'sync'] },

  /**
   * §2.6/#22, §7.4/#80. **One entry, and it is about a field that is not here.**
   *
   * #80 asked every box in the library whether driving a rig is its job, and this manual answers
   * with capabilities on both sides and no sentence choosing between them. That is the
   * read-and-silent state rather than the answers-no one (#120): nothing here argues the box
   * should be played by something else, and nothing here says it should lead.
   */

  capabilityEvidence: {
    /**
     * §2.6/#120/#142. `unread`, and it is the state's ordinary case rather than an edge one: the
     * minilogue xd's manual is not in `manuals/` at all. Nobody here has opened the document that
     * would answer whether its 16-step sequencer carries a note length, so the reading is blocked
     * on a file rather than on an author's afternoon — and recording it as `unknown` would render
     * a missing document as a finished finding.
     */
    noteDuration: {
      kind: 'unread',
      reason: "the minilogue xd manual is not in `manuals/`; no document here was opened for it",
    },
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.58 gives the send half — with `Clock Source` set to `Internal` the TEMPO knob’s tempo "will be sent as MIDI timing clock data" — and p.46 the receive half, `Clock Source [Auto (USB), Auto (MIDI), Internal]`; both are capabilities and neither is a role, and the volca-style `SYNC OUT` pulse carries no start or stop at all (p.7, p.46, p.55)',
    },
  },

  /**
   * `OUTPUT L/MONO and R jacks` (p.66) is a stereo main and nothing else — the headphones jack
   * carries the same signal (p.7), so `individualOuts` is 0. There is no audio input: `CV IN 1`
   * and `2` take control voltage, not audio. `usbAudio` is false; p.66 lists a `USB B port` and
   * p.56 describes it carrying MIDI.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * 500 mm across, from the `Dimensions (W x D x H)` line on p.66. The 300 mm rise on the panel
   * is the *depth* off the same line; see `panel.ts` for why, and for the check that the drawing
   * on p.5 is the keyboard rather than the module.
   */
  physical: { panelSpanMm: 500, verified: cite(66) },

  panel: MINILOGUE_XD_PANEL,

  manual: { title: "minilogue xd/minilogue xd module Owner's Manual", edition: 'E 9' },

  /**
   * **One voice, four notes.** p.66: `Maximum polyphony  4 voices`. The module note above is the
   * long form of why this is one assignable rather than four; the short form is that the four
   * voices share one set of knob positions, so they are capacity within a part and never parts.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 4 }],

  hints: {
    'seq-parameter': 'EDIT MODE, PROGRAM EDIT, button 7',
    'multi-alt': 'Hold SHIFT, turn SHAPE',
    'lfo-invert': 'Hold SHIFT, turn INT to invert',
    'fx-subtype': 'Hold SHIFT, flip to SELECT',
    'init-program': 'Start from an init program, 201 up',
    'save-program': 'WRITE, pick a slot, WRITE again',
  },

  recipes,
}
