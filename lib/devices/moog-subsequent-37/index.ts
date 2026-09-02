import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset, NumericRange } from '../../core/params'
import { SUBSEQUENT_37_PANEL } from './panel'

/**
 * Moog Subsequent 37 (§2.3). Two variable-waveshape oscillators, a square sub, a pink noise
 * generator, an external input that doubles as mixer feedback, one Moog ladder filter, two
 * DAHDSR envelopes, two modulation busses — and **two notes**.
 *
 * ## `polyphony: 2` is the reason this box is here
 *
 * Every voice the library holds is 1, 4 or 8. p.9 opens with *"The Subsequent 37 is a 2-note
 * paraphonic analog synthesizer"*, and p.61 states it twice more — `TYPE: Programmable
 * Paraphonic Analog Synthesizer`, `POLYPHONY: Selectable Monophonic or Duophonic`. Two is the
 * middle value nothing else in the registry has, and it is the value that tests whether
 * `polyphony` means what §2.2 says it means.
 *
 * It means **notes inside one part**, and paraphony is exactly that and no more. p.9 again:
 * DUO MODE *"allows each of the Subsequent 37's highly stable oscillators to play completely
 * independent pitches from one another. Voices are then processed through a single, classic
 * 20Hz-20kHz Moog Ladder Filter."* Two pitches, one filter, one amplifier, one filter envelope,
 * one amp envelope. The shared filter is a property of how the sound comes out, not of how much
 * the part can carry, so it changes nothing about the number: this device declares **one**
 * assignable of `polyphony: 2`.
 *
 * ## It fails a triad, and that is the useful part
 *
 * Both shipped tonal templates ask for three notes or more — `industrial-techno` for a triad
 * `stab` and a triad `pad`, `ambient-dub` for a four-note `pad` — so every one of those requests
 * lands on the far side of this box's line, and **all of them report the same thing**:
 * `no-capable-voice` because `polyphony`. *This box plays stabs and pads; it does not play
 * three-note ones.*
 *
 * That is a claim about capacity and it is the only claim `polyphony` is entitled to make.
 * `roles` says what a voice can be asked to do; `polyphony` says how many notes it can do it
 * with; and the shared filter, amplifier and envelope pair say what it will sound like doing it.
 * Three separate facts, and folding the third into the first would be a taste judgement wearing
 * a capability claim — a `no-such-role` gap renders as *"nothing in your rig plays this part"*,
 * which is a stronger statement than this instrument deserves. It sustains, it takes two
 * independent pitches, and p.26 sells the interval outright: OSC 2's FREQUENCY knob fully
 * clockwise is *"a perfect fifth interval against oscillator 1 ... allowing you to play 'power
 * chords' with just one finger"*.
 *
 * So `pad` and `stab` are both declared, both authored with a DUO MODE recipe that genuinely
 * plays two notes, and both refused at three by the number rather than by the role list. Holding
 * this box beside the minilogue xd then puts the line where it belongs, on the hardware rather
 * than on the recipe library: both carry a **two-note** pad and stab, and at **three** the Korg
 * still carries them and this one reports `polyphony`. Nothing about that difference is a fact
 * about who authored what.
 *
 * ## DUO MODE is a button, and it is a polyphony setting wearing one
 *
 * `Assignable.polyphony` is 2 because that is the box's capacity. What a *recipe* leaves itself
 * is a different question, and two front-panel switches decide it (p.26):
 *
 *     DUO MODE off                   1 note   monophonic, the default
 *     DUO MODE on, KB CTRL HI or LO  2 notes  OSC 1 and OSC 2 take the two outer keys
 *     DUO MODE on, KB CTRL OFF       1 note   "OSC 2 drones and does not follow the keyboard"
 *
 * The third rung is the one that would be got wrong. DUO MODE is lit, the panel looks
 * duophonic, and the part still plays one note — because the second oscillator has been taken
 * off the keyboard entirely and parked on a fixed pitch. So DUO MODE alone never means two
 * notes; **the pair does**, and every recipe here states both.
 *
 * `Recipe` cannot express this, exactly as it could not for the minilogue xd: `realisation`
 * lowers what a request *demands* (§12.4) and nothing lowers what a voice *supplies*. So the
 * response is the same one — confine it and state it. `duo()` is used on the two roles the
 * templates ask for more than one note of, `stab` and `pad`, and nowhere else; `mono()` and
 * `drone()` are used only on roles that are one note in practice; each says what it costs in a
 * note the reader sees at the machine, and `test/moog-subsequent-37.test.ts` holds the
 * confinement from the manifest side.
 *
 * ## The switch-gated scales, and what each recipe has to carry because of them
 *
 * Actual values only (§3.2). Four of this panel's controls print a scale that a switch
 * elsewhere replaces, and a value read off the wrong one of two scales is a fabrication however
 * carefully the range beside it is cited. Each is paired with its switch at the point the switch
 * is chosen, so the pairing cannot come apart:
 *
 *  - **`OSC 2 FREQUENCY`** — `±7 semitones` normally, and p.26 continues: with `KB CTRL` at OFF,
 *    *"The FREQUENCY control knob's range is extended to +/- 3 octaves"*, which is five times the
 *    span behind the same knob. The panel keeps its `-7 ... +7` silkscreen in both states, which
 *    is the TR-8S `SNAPPY` failure exactly: the printed scale stays put while the scale in force
 *    changes. `mono()`, `duo()` and `drone()` each carry `KB CTRL` beside `FREQUENCY`.
 *  - **`LFO RATE`** — `0.1Hz ... 100Hz` by default (p.22); `HI RANGE` *"increased by 10x ... from
 *    1Hz ... through 1,000Hz"* (p.23); and under `SYNC` the knob leaves Hz altogether and
 *    *"selects between clock divisions"* (p.23). Three meanings, two units. `lfoFree()` states
 *    `HI RANGE` and `SYNC` beside a Hz value; `lfoSynced()` states `SYNC` on and gives a
 *    division from the list p.52 prints in full, with **no** Hz value anywhere near it.
 *  - **`KNOB SHIFT`** — one button turns all eight envelope knobs into other parameters with
 *    other units: ATTACK becomes DELAY, DECAY becomes HOLD, SUSTAIN becomes VEL AMT, RELEASE
 *    becomes KB TRACK (p.30, and the strip is silkscreened in that order). The shifted knobs
 *    keep the unshifted tick marks, so nothing on the panel tells a reader which layer they are
 *    looking at. Every recipe states `KNOB SHIFT` off before it states a single envelope time.
 *  - **`ARPEGGIATOR RATE`** — `2 BPM` to `280 BPM`, replaced by clock divisions under the
 *    arpeggiator's own `SYNC` (p.15). No recipe touches it; the arpeggiator is not used at all
 *    (see below), so the trap is recorded rather than handled.
 *
 * ## What is left out, and why
 *
 * **`GLIDE TIME` has a scale but no unit and no seconds anywhere.** p.21 describes the knob and
 * the three glide types and never prints a time. The `0 ... 10` calibration on the panel is real
 * and is what the range cites; a millisecond figure beside it would be invented. Worth having
 * anyway, because Moog's own Quickstart names a value on that scale for the one sound this box
 * is most asked for — *"For classic 'acid' style sequences: Turn on Legato Glide, set Glide Type
 * to EXP, and set the GLIDE TIME knob to 2"* — and `sub37-acid-dirty` is that instruction.
 *
 * **The LFO has a third range nobody documented.** CC 76 and CC 78 (p.54) give
 * `0 = Low Range, 43 = Med Range, 85 = Hi Range`, the programmable-destination list calls it
 * `LFO1RNGE: LFO 1 Range (LOW, MED, HIGH)` (p.51), and the NRPN chart gives the parameter three
 * values (p.56). But pp.22-23 describe **two** — the default and `HI RANGE` — and the low range's
 * endpoints are printed nowhere. The specifications line `LFO: 0.01Hz - 1000Hz` (p.61) is the
 * only hint, and it does not agree with the union of the two documented ranges either. So
 * `HI RANGE` is authored as the panel's own two-state switch, which is what a reader has in
 * front of them, and no value is ever placed in a range this document does not bound.
 *
 * **`MOD 2` is never stated.** The two busses are identical (p.22) and each holds its own stored
 * settings, so a recipe that needs one modulation route states one and leaves the other where
 * the preset had it — the same call the minilogue xd makes for the two effects it does not name.
 *
 * **The arpeggiator and the 64-step sequencer are absent.** Patterns are template-owned (§4.3),
 * so no recipe carries step hits, and `features.perStep` is omitted: this box's per-step data is
 * note, velocity and ratchet recording rather than a vocabulary of per-step switches.
 *
 * Also unmodelled: `FINE TUNE` (a tuning control, not a sound-design one), the master and
 * headphone `VOLUME` knobs (monitoring), the CONTROLLERS menu's per-controller modulation
 * amounts, CV mapping, and the GLOBAL menu.
 *
 * **No `jacks`.** §3.3's patch points are for a box a recipe cables *into itself*. Every socket
 * on this one is on the left-side panel and every one of them is a rig connection — audio out,
 * external audio in, four CV/gate inputs, MIDI DIN in and out, USB (pp.7-8). §10's rack already
 * draws those from `clock` and `io`. `FDBK / EXT IN` is the closest thing to an internal patch
 * and it needs no cable at all: p.27, *"When nothing is plugged into the EXT IN jack ... the
 * FDBK / EXT IN knob takes the output of the mixer and feeds it back into this mixer channel"*.
 *
 * ## Clock: both directions, two transports
 *
 * `canSendClock` is true and it is a menu setting, not an assumption: `SEND CLOCK: OFF, ARP, ON`
 * (MIDI MENU 3.4, p.37) — *"OFF never sends MIDI clock. ARP sends MIDI clock only when the Arp
 * or Seq is running. ON sends MIDI clock all the time."* `canReceiveClock` is true on the
 * strength of every `SYNC` switch on the box: the arpeggiator's (p.15), both LFOs' (p.23) and
 * both envelopes' (pp.31, 33) all lock to *"external MIDI clock"*, and `FOLLOW SPP` follows
 * Song Position Pointer (p.37).
 *
 * Two transports, and clock is not port-specific — it rides the general routing, `IN PORTS` and
 * `OUT PORTS` both defaulting to `BOTH` over DIN and USB (pp.35-36). There is no analog clock
 * jack; the four CV sockets are pitch, filter, volume and gate, all inputs (p.61).
 *
 * `preferredSource` is not claimed (§7.4). This box can drive a rig; driving one is not its job,
 * and since #120 the pages behind that sit in `capabilityEvidence` rather than in this sentence.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/**
 * **The document, named precisely, because a near-miss exists and is hard to catch.** The 2014
 * Sub 37's manual is the same length with the same structure and near-identical ranges, and
 * citing it would give a real page number from a real Moog manual describing a different
 * instrument. This one says "Subsequent 37" 148 times and "Sub 37" never.
 *
 * No edition string is printed anywhere on the cover or title page; the only dating is the
 * ©2017 colophon. So `manual.edition` is omitted rather than filled with a copyright year
 * dressed up as an edition.
 */
const MANUAL = "Subsequent 37 User's Manual"

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * The scale this panel repeats more than any other: **`0 ... 10`**, on all five mixer levels
 * (p.27), on RESONANCE and MULTIDRIVE (p.28) and on both envelopes' SUSTAIN (pp.31-32). Every
 * one is cited individually below — the constant here is the *value* being reused, never the
 * citation, because the pages differ.
 */
const TEN: Omit<NumericRange, 'verified'> = { min: 0, max: 10 }

/** The bipolar amount scale: `-5 ... 0 ... +5`, on four knobs across two sections. */
const BIPOLAR: Omit<NumericRange, 'verified'> = { min: -5, max: 5 }

/**
 * Every envelope time knob, in milliseconds: *"Its value ranges from 1 millisecond to 10
 * seconds"* (pp.30, 31, 32, 33 — once per stage, twice per envelope).
 *
 * Milliseconds rather than seconds because that is the unit a reader can act on: `DECAY 600 ms`
 * is a number, `DECAY 0.6 s` beside `ATTACK 0.004 s` is a decimal-point hunt at the machine.
 *
 * The panel disagrees with the prose at the bottom of this scale and the disagreement is
 * recorded rather than resolved: the silkscreen reads `M-SEC .1` where the prose says 1
 * millisecond, a decade apart. The prose is what the range cites, because it is stated in words
 * on four separate pages and the silkscreen is one ambiguous tick label.
 */
const EG_MS: Omit<NumericRange, 'verified'> = { min: 1, max: 10000 }

// ---------------------------------------------------------------------------
// Param helpers (§3.1: the range is cited, the point is taste)
// ---------------------------------------------------------------------------

type NumExtra = { mood?: MoodOffset[]; unit?: string; step?: number; note?: string; hint?: string }

/**
 * A numeric whose **range** is cited and whose **point is not**. This manual states what each
 * control will accept and never where to set it for a sound — there is no patch chapter, no
 * suggested-settings table and no example appendix in its 61 pages — so `verified: false` sits
 * on every point in this file, the same split the CRAVE, the Cascadia and the minilogue make.
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
// Option sets, in the manual's own words and the manual's own order
// ---------------------------------------------------------------------------

/** Every lit/unlit switch on this panel. Cited per button, at the page that describes it. */
const OFF_ON = ['OFF', 'ON'] as const
/** p.25. Four pitch ranges, "The lowest setting is 16', and the highest setting is 2'". */
const OCTAVES = ["16'", "8'", "4'", "2'"] as const
/**
 * p.25. **The WAVE knob is continuous** — "vary either oscillator's waveform from triangle to
 * sawtooth to square to narrow pulse ... there are no discrete steps between settings". These
 * are the four named waypoints, not four positions, and every recipe that picks one carries the
 * note saying so. An enum of the named points is the honest shape: it lets a recipe say
 * something a reader can set exactly, and §3.2 has nowhere to hang a value on a scale the
 * manual never numbers.
 */
const WAVES = ['TRIANGLE', 'SAWTOOTH', 'SQUARE', 'NARROW PULSE'] as const
/** p.26. Three states, two of them LEDs on the panel and the third being neither lit. */
const KB_CTRL = ['HI', 'LO', 'OFF'] as const
/** p.29. One, two, three and four poles. The panel prints the dB figures. */
const SLOPES = ['6', '12', '18', '24'] as const
/** p.21. Linear constant rate, linear constant time, exponential. */
const GLIDE_TYPES = ['LCR', 'LCT', 'EXP'] as const
/** p.21 for glide, p.23 for the modulation bus. Same three positions, two different switches. */
const OSC_TARGETS = ['1', '2', 'BOTH'] as const
/** p.61, `MOD SOURCES`, verbatim and in the order the specifications line prints them. */
const MOD_SOURCES = ['Triangle', 'Square', 'Saw', 'Ramp', 'Sample & Hold', 'Filter EG/PGM'] as const
/**
 * p.23. *"This switch toggles through seven various modulation destinations, including LFO rate
 * (of the other LFO), VCA level, oscillator 1 waveshape, oscillator 2 waveshape, both
 * oscillators' waveshapes, noise level, EG times, or other various destinations assigned via the
 * MOD CONTROLLERS menu."* The first entry names the *other* bus, so the list is per bus.
 */
const MOD_DESTS = [
  'LFO 2 RATE',
  'VCA LEVEL',
  'OSC 1 WAVE',
  'OSC 2 WAVE',
  'BOTH',
  'NOISE LEVEL',
  'EG TIME/PGM',
] as const
/**
 * p.52, in full, longest first — 21 divisions, from four whole notes (384 MIDI clocks) to a
 * 1/64 triplet (1 clock). This is the list `SYNC` swaps in for the LFO RATE knob's Hz scale,
 * and unlike the minilogue xd's equivalent the manual prints all of it, so a synced LFO can be
 * authored with a cited option set instead of being confined to the free-running side.
 */
const CLOCK_DIVISIONS = [
  '4 WHOLE', '3 WHOLE', '2 WHOLE', 'WH + 1/2', 'WH', '1/2 DOT', 'WH T',
  '1/2', '1/4 DOT', '1/2 T', '1/4', '1/8 DOT', '1/4 T', '1/8',
  '1/16 DOT', '1/8 T', '1/16', '1/16 T', '1/32', '1/32 T', '1/64 T',
] as const

// ---------------------------------------------------------------------------
// Sections, in panel order. Every recipe is these blocks in this sequence.
// ---------------------------------------------------------------------------

/**
 * The one program-wide setting a recipe states. Swing lives in `PRESET EDIT > ARPEGGIATOR`
 * (p.40), ranges `0%` to `100%` and is straight at 50 — *"When SWING is set to a value below
 * 50%, it will move the off-beats earlier in time."*
 *
 * It is the only param on this device that declares the `swing` axis, which is how §6 wants a
 * device to opt in — no capability check, just a parameter that names it. The note is not
 * optional: this swings the box's **own** arpeggiator and step sequencer, so a part sequenced
 * anywhere else will not hear it, and a knob that silently does nothing is worse than an axis
 * honestly declined.
 */
function program(swing: number): AuthoredParam[] {
  return [
    num('SWING', swing, { min: 0, max: 100 }, 40, {
      unit: '%',
      step: 1,
      mood: [{ axis: 'swing', amount: 40 }],
      hint: 'swing-menu',
      note: '50 is straight; it swings the onboard arpeggiator and sequencer, nothing played from elsewhere',
    }),
  ]
}

type GlideSpec = {
  on: 'OFF' | 'ON'
  type: (typeof GLIDE_TYPES)[number]
  osc: (typeof OSC_TARGETS)[number]
  time: number
  gated: 'OFF' | 'ON'
  legato: 'OFF' | 'ON'
}

/**
 * The glide section (p.21). `TIME` is the panel's own `0 ... 10` calibration and carries no
 * unit, because the manual prints no seconds figure for glide anywhere in 61 pages.
 *
 * `TYPE` travels with it always, and not because a range changes — because the knob's *meaning*
 * does. LCR is a constant *rate*, so the glide gets longer as the interval widens; LCT is a
 * constant *time* whatever the interval; EXP is a curve that starts fast and slows into the
 * target note. Three different things behind one number.
 */
function glide(spec: GlideSpec): AuthoredParam[] {
  /**
   * **Off is one line, not six.**
   *
   * `GLIDE · ON` gates the whole section: with it dark, `TYPE`, `OSC`, `TIME`, `GATED` and
   * `LEGATO` do nothing at all. Printing them anyway gave fourteen of this box's recipes a screen
   * of glide settings under a switch that says the glide is off — five values a reader can set
   * carefully and hear no difference from, which is worse than saying nothing because it looks
   * like instruction.
   *
   * The one line that survives is the one that does work: a reader whose panel still has glide on
   * from the last patch needs telling to turn it off, and that is all they need.
   */
  if (spec.on === 'OFF') {
    return [sw('GLIDE · ON', spec.on, OFF_ON, 21, { note: 'Must be lit for any glide at all' })]
  }
  return [
    sw('GLIDE · ON', spec.on, OFF_ON, 21, { note: 'Must be lit for any glide at all' }),
    sw('GLIDE · TYPE', spec.type, GLIDE_TYPES, 21, {
      note: 'LCR is constant rate, LCT constant time, EXP fast then slowing',
    }),
    sw('GLIDE · OSC', spec.osc, OSC_TARGETS, 21),
    num('GLIDE · TIME', spec.time, TEN, 21, {
      step: 0.5,
      note: 'The panel calibration; this manual prints no glide time in seconds',
    }),
    sw('GLIDE · GATED', spec.gated, OFF_ON, 21, { note: 'On, the pitch only glides while a key is held' }),
    sw('GLIDE · LEGATO', spec.legato, OFF_ON, 21, {
      note: 'On, glide happens only between overlapping notes',
    }),
  ]
}

/** Oscillator 1 (p.25). Octave, waveshape, and nothing else — OSC 1 is the reference. */
function osc1(octave: (typeof OCTAVES)[number], wave: (typeof WAVES)[number]): AuthoredParam[] {
  return [
    sw('OSC 1 · OCTAVE', octave, OCTAVES, 25),
    sw('OSC 1 · WAVE', wave, WAVES, 25, {
      note: 'The knob is continuous; these are its four named points',
    }),
  ]
}

/**
 * Oscillator 2 (pp.25-26), less its two pitch controls, which belong with the voicing switches
 * below because `KB CTRL` decides what scale `FREQUENCY` is on.
 *
 * `HARD SYNC` locks OSC 2's phase to OSC 1 — and p.26 carries the warning that makes it usable:
 * *"If oscillator 1's frequency is higher than oscillator 2's, oscillator 2 will be unable to
 * complete its cycle, resulting in little or no output from oscillator 2."*
 */
function osc2(
  octave: (typeof OCTAVES)[number],
  wave: (typeof WAVES)[number],
  hardSync: 'OFF' | 'ON',
  kbReset: 'OFF' | 'ON',
): AuthoredParam[] {
  return [
    sw('OSC 2 · OCTAVE', octave, OCTAVES, 25),
    sw('OSC 2 · WAVE', wave, WAVES, 25, {
      note: 'The knob is continuous; these are its four named points',
    }),
    sw('OSC · HARD SYNC', hardSync, OFF_ON, 26, {
      note: 'Keep OSC 2 at or above OSC 1 or it barely sounds',
    }),
    sw('OSC · KB RESET', kbReset, OFF_ON, 26, {
      note: 'A defined leading edge, at the cost of a click on hard attacks',
    }),
  ]
}

/**
 * The three rungs of the voicing ladder (p.26), and **each one says what it costs**.
 *
 *     mono(freq, beat)      1 note   DUO MODE off
 *     duo(kbCtrl, ...)      2 notes  DUO MODE on, KB CTRL HI or LO
 *     drone(octaves, ...)   1 note   DUO MODE on, KB CTRL OFF — OSC 2 leaves the keyboard
 *
 * The pair is load-bearing twice over, which is why there are three helpers and not one switch
 * with an argument. It decides **how many notes** the patch plays, and it decides **which scale
 * FREQUENCY is on** — `±7 semitones` under HI and LO, `±3 octaves` under OFF. Splitting them
 * makes it impossible to write a recipe where the two come apart.
 *
 * `KB CTRL` is stated even in `mono()`, where p.26 makes it inert ("how OSC 2 responds to the
 * keyboard *when in DUO MODE*"). One line buys the guarantee that a FREQUENCY value is never
 * printed beside a KB CTRL position nobody set.
 */
function mono(frequency: number, beat: number): AuthoredParam[] {
  return [
    sw('OSC · DUO MODE', 'OFF', OFF_ON, 26, {
      note: 'Off: one note at a time, both oscillators on the same key',
    }),
    sw('OSC · KB CTRL', 'HI', KB_CTRL, 26, { note: 'Inert while DUO MODE is off; set so FREQUENCY keeps its semitone scale' }),
    num('OSC 2 · FREQUENCY', frequency, { min: -7, max: 7 }, 26, {
      unit: 'st',
      step: 0.5,
      note: 'Centre is unison with OSC 1; fully clockwise is a fifth',
    }),
    num('OSC 2 · BEAT FREQ', beat, { min: -3.5, max: 3.5 }, 26, {
      unit: 'Hz',
      step: 0.5,
      note: 'A constant beat rate at every pitch, unlike FREQUENCY',
    }),
  ]
}

/** DUO MODE with the keyboard split across both oscillators (p.26). **Two notes.** */
function duo(kbCtrl: 'HI' | 'LO', frequency: number, beat: number): AuthoredParam[] {
  return [
    sw('OSC · DUO MODE', 'ON', OFF_ON, 26, {
      note: 'On: the two oscillators take independent pitches, so this patch plays two notes',
    }),
    sw('OSC · KB CTRL', kbCtrl, KB_CTRL, 26, {
      note: 'HI puts OSC 2 on the top note and OSC 1 on the bottom; LO swaps them',
    }),
    num('OSC 2 · FREQUENCY', frequency, { min: -7, max: 7 }, 26, {
      unit: 'st',
      step: 0.5,
      note: 'Leave near centre: this is a detune on top of a note OSC 2 is already playing',
    }),
    num('OSC 2 · BEAT FREQ', beat, { min: -3.5, max: 3.5 }, 26, { unit: 'Hz', step: 0.5 }),
  ]
}

/**
 * DUO MODE with `KB CTRL` at OFF (p.26): *"OSC 2 drones and does not follow the keyboard. The
 * FREQUENCY control knob's range is extended to +/- 3 octaves."*
 *
 * **One note, and a drone under it.** The panel is lit exactly as it is for `duo()` and the part
 * is monophonic, which is the whole reason DUO MODE alone is never allowed to mean two notes
 * here. It buys the other printed FREQUENCY scale, so the second range is exercised by real
 * recipes rather than sitting in the file unused.
 *
 * **The extended scale is carried in semitones, not octaves**, and that is a deliberate choice
 * against the manual's own wording. `test/units.test.ts` pins the unit vocabulary precisely so a
 * new unit gets looked at, and the two things `oct` would have bought are both better had
 * another way: p.26's phrasing survives in the note below, and a reader comparing `-36 ... 36 st`
 * against the normal `-7 ... 7 st` can see at a glance that one scale is five times the other,
 * where two different units would have hidden it. An octave is twelve semitones by definition
 * and the box is on 12-TET unless somebody changes the global tuning scale (p.44), so the
 * conversion introduces no judgement. What it avoids is a fourth scale in the pitch-interval
 * family — the library already carries `St`, `st` and `c`, and #29 lists that spread as drift to
 * be repaired rather than widened.
 */
function drone(frequencySemitones: number, beat: number): AuthoredParam[] {
  return [
    sw('OSC · DUO MODE', 'ON', OFF_ON, 26, {
      note: 'On, but with KB CTRL off the part is still one note plus a drone',
    }),
    sw('OSC · KB CTRL', 'OFF', KB_CTRL, 26, {
      note: 'Off: OSC 2 leaves the keyboard and holds a fixed pitch',
    }),
    num('OSC 2 · FREQUENCY', frequencySemitones, { min: -36, max: 36 }, 26, {
      unit: 'st',
      step: 1,
      note: 'The extended scale — p.26 prints it as +/- 3 octaves — in force only while KB CTRL is off',
    }),
    num('OSC 2 · BEAT FREQ', beat, { min: -3.5, max: 3.5 }, 26, { unit: 'Hz', step: 0.5 }),
  ]
}

/**
 * The mixer (p.27). Five sources into one filter, and the only balance control the box has.
 *
 * The page carries the fact a recipe most needs: *"Mixer settings higher than 5 will overdrive
 * the input of the filter ... A setting of 5 or below delivers a clean signal to the filter."*
 * That is where this instrument's dirt starts, before MULTIDRIVE is touched at all, so a `clean`
 * recipe keeps every channel at or under 5 and a `dirty` one does not.
 */
function mix(osc1Level: number, sub: number, osc2Level: number, noise: number, feedback: number): AuthoredParam[] {
  return [
    num('MIXER · OSC 1', osc1Level, TEN, 27, { step: 0.5 }),
    num('MIXER · SUB 1', sub, TEN, 27, { step: 0.5, note: 'Always a square, always an octave below OSC 1' }),
    num('MIXER · OSC 2', osc2Level, TEN, 27, { step: 0.5 }),
    num('MIXER · NOISE', noise, TEN, 27, { step: 0.5, note: 'Pink, not white' }),
    num('MIXER · FDBK / EXT IN', feedback, TEN, 27, {
      step: 0.5,
      mood: [{ axis: 'grit', amount: 2 }],
      note: 'With nothing in EXT IN this feeds the mixer output back into itself',
    }),
  ]
}

/**
 * The ladder filter (pp.28-29), and where three of the five mood axes are declared.
 *
 * **`CUTOFF`'s darkness amount is proportional to the authored value, and that is deliberate.**
 * The range is `20Hz` to `20kHz` — three decades — so a fixed offset in device units is the
 * wrong shape twice over: 400 Hz would shut a bass patch sitting at 300 and be inaudible on a
 * lead sitting at 6k. §6.1 applies the offset linearly in device units and has no notion of a
 * logarithmic control, so the scaling belongs where the value is authored. `Math.round` keeps it
 * an integer, so nothing here can drift across platforms (§7.2).
 *
 * `RESONANCE` carries grit for the reason p.28 gives: *"Settings above 7 cause the filter to
 * self-oscillate."*
 */
function filt(
  cutoff: number,
  resonance: number,
  multidrive: number,
  slope: (typeof SLOPES)[number],
  egAmount: number,
  kbTrack: number,
): AuthoredParam[] {
  return [
    num('CUTOFF', cutoff, { min: 20, max: 20000 }, 28, {
      unit: 'Hz',
      step: 10,
      mood: [{ axis: 'darkness', amount: -Math.round(cutoff * 0.45) }],
      note: 'Fully down closes the filter completely',
    }),
    num('RESONANCE', resonance, TEN, 28, {
      step: 0.5,
      mood: [{ axis: 'grit', amount: 2.5 }],
      hint: 'self-oscillation',
    }),
    num('MULTIDRIVE', multidrive, TEN, 28, {
      step: 0.5,
      mood: [{ axis: 'grit', amount: 3.5 }],
      note: 'Tube-like warmth at the bottom, hard clipping at the top',
    }),
    sw('FILTER · SLOPE', slope, SLOPES, 29, { note: 'dB per octave: one, two, three or four poles' }),
    num('FILTER · EG AMT', egAmount, BIPOLAR, 28, {
      step: 0.5,
      note: 'Bipolar: below centre the envelope pulls the cutoff down',
    }),
    num('FILTER · KB TRACK', kbTrack, { min: 0, max: 2 }, 29, {
      step: 0.5,
      note: '1.0 is 1:1 tracking centred on C3; 2.0 is 2:1',
    }),
  ]
}

/**
 * The filter envelope (pp.30-31), preceded by the switch that decides which parameters the four
 * knobs under it even are.
 *
 * `KNOB SHIFT` is stated once, at the head of the envelope block, and it is stated on every
 * recipe. Without it a reader with the button blinking sets DELAY, HOLD, VEL AMT and KB TRACK to
 * four envelope times, against tick marks that still read `M-SEC .1 ... 10 SEC` because the
 * silkscreen does not change with the layer.
 */
function filterEg(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  loop: 'OFF' | 'ON' = 'OFF',
): AuthoredParam[] {
  return [
    sw('ENV · KNOB SHIFT', 'OFF', OFF_ON, 30, {
      note: 'Unlit, or the eight knobs below are DELAY, HOLD, VEL AMT and KB TRACK instead',
    }),
    num('FILTER EG · ATTACK', attack, EG_MS, 30, { unit: 'ms' }),
    num('FILTER EG · DECAY', decay, EG_MS, 30, { unit: 'ms' }),
    num('FILTER EG · SUSTAIN', sustain, TEN, 31, { step: 0.5, note: '0 to 100%, calibrated 1 to 10' }),
    num('FILTER EG · RELEASE', release, EG_MS, 31, { unit: 'ms' }),
    sw('FILTER EG · LOOP', loop, OFF_ON, 31, {
      note: 'On, the envelope repeats for as long as a note is held — a multistage LFO',
    }),
  ]
}

/**
 * The amplifier envelope (pp.32-33), and where `density` and `space` are declared — both
 * proportional to the authored time, for the reason `CUTOFF` is: an envelope time in
 * milliseconds spans four decades and a fixed offset is the wrong shape at both ends.
 *
 * `MULTI TRIG` is here rather than in a helper of its own because it is the switch that decides
 * whether a legato line re-attacks, which is a decision about the part and not about the sound
 * (p.32).
 */
function ampEg(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  multiTrig: 'OFF' | 'ON',
  loop: 'OFF' | 'ON' = 'OFF',
): AuthoredParam[] {
  return [
    /**
     * §3/#320. **Under about 10 ms the VCA opens fast enough to click on the first note**, and
     * the manual never says so — it prints the range (p.32, "1 millisecond to 10 seconds") and
     * nothing about what a 2 ms attack sounds like.
     *
     * Reported from a Subsequent 37 on a desk, not measured here, so it is a `note` rather than a
     * range or a cited claim. It stays prose for a second reason as well: the threshold is a
     * judgement about a sound, and turning "about 10" into an authored bound would make a
     * recipe's own value illegal on a box where the transient is the point — an `acid` line with
     * no sustain wants that click.
     *
     * What the reader needs is to know the tick is the instrument rather than a mistake they
     * made, and which knob removes it.
     */
    num('AMP EG · ATTACK', attack, EG_MS, 32, {
      unit: 'ms',
      ...(attack < 10
        ? { note: 'The VCA opens fast here; a click on the first note is the attack, not a fault' }
        : {}),
    }),
    num('AMP EG · DECAY', decay, EG_MS, 32, {
      unit: 'ms',
      mood: [{ axis: 'density', amount: -Math.round(decay * 0.4) }],
    }),
    num('AMP EG · SUSTAIN', sustain, TEN, 32, { step: 0.5, note: '0 to 100%, calibrated 1 to 10' }),
    num('AMP EG · RELEASE', release, EG_MS, 32, {
      unit: 'ms',
      mood: [{ axis: 'space', amount: Math.round(release * 0.8) }],
    }),
    sw('AMP EG · MULTI TRIG', multiTrig, OFF_ON, 32, {
      note: 'On, every note re-attacks even when you play legato',
    }),
    sw('AMP EG · LOOP', loop, OFF_ON, 33, {
      note: 'Off on everything but a bed: looping the amplitude re-articulates a held note',
    }),
  ]
}

type ModCommon = {
  source: (typeof MOD_SOURCES)[number]
  kbReset: 'OFF' | 'ON'
  pitchAmt: number
  osc: (typeof OSC_TARGETS)[number]
  filterAmt: number
  dest: (typeof MOD_DESTS)[number]
  modAmt: number
}

function modTail(spec: ModCommon): AuthoredParam[] {
  return [
    sw('MOD 1 · KB RESET', spec.kbReset, OFF_ON, 23, { note: 'On, the LFO restarts at zero on every note' }),
    num('MOD 1 · PITCH AMT', spec.pitchAmt, BIPOLAR, 22, { step: 0.5 }),
    sw('MOD 1 · OSC', spec.osc, OSC_TARGETS, 23, { note: 'Which oscillator PITCH AMT reaches' }),
    num('MOD 1 · FILTER AMT', spec.filterAmt, BIPOLAR, 22, { step: 0.5 }),
    sw('MOD 1 · DEST', spec.dest, MOD_DESTS, 23),
    num('MOD 1 · MOD AMT', spec.modAmt, BIPOLAR, 22, { step: 0.5 }),
  ]
}

/**
 * Modulation bus 1 with the LFO **free-running**, in hertz (pp.22-23).
 *
 * `HI RANGE` and `SYNC` are both stated, in that order, before the number they qualify. The Hz
 * bounds come from whichever of the two documented ranges `HI RANGE` names — `0.1 ... 100` off,
 * `1 ... 1,000` on — so the value and the scale it was read from cannot be separated.
 */
function lfoFree(
  rate: number,
  hiRange: 'OFF' | 'ON',
  spec: ModCommon,
): AuthoredParam[] {
  const bounds = hiRange === 'ON' ? { min: 1, max: 1000 } : { min: 0.1, max: 100 }
  return [
    sw('MOD 1 · SOURCE', spec.source, MOD_SOURCES, 61),
    sw('MOD 1 · HI RANGE', hiRange, OFF_ON, 23, { note: 'On, the LFO runs ten times faster' }),
    sw('MOD 1 · SYNC', 'OFF', OFF_ON, 23, { note: 'Off, so RATE is in hertz rather than clock divisions' }),
    num('MOD 1 · LFO RATE', rate, bounds, hiRange === 'ON' ? 23 : 22, { unit: 'Hz', step: 0.1 }),
    ...modTail(spec),
  ]
}

/**
 * Modulation bus 1 with the LFO **locked to the clock** (p.23): *"the LFO RATE knob selects
 * between clock divisions of the internal or external MIDI clock"*.
 *
 * There is no Hz value here and there must not be — the knob has left that scale entirely. The
 * division comes from the list p.52 prints in full, which is what makes this authorable at all;
 * the minilogue xd's equivalent had to be abandoned because Korg printed its divisions behind an
 * ellipsis (§3.2 has no citable legality gate for a list that is not on the page).
 */
function lfoSynced(
  division: (typeof CLOCK_DIVISIONS)[number],
  spec: ModCommon,
): AuthoredParam[] {
  return [
    sw('MOD 1 · SOURCE', spec.source, MOD_SOURCES, 61),
    sw('MOD 1 · HI RANGE', 'OFF', OFF_ON, 23),
    sw('MOD 1 · SYNC', 'ON', OFF_ON, 23, {
      note: 'On, so the RATE knob picks a division and no longer reads in hertz',
    }),
    sw('MOD 1 · LFO RATE (division)', division, CLOCK_DIVISIONS, 52, { hint: 'lfo-divisions' }),
    ...modTail(spec),
  ]
}

/** The modulation settings a recipe reaches for when it wants the bus quiet but stated. */
const MOD_IDLE: ModCommon = {
  source: 'Triangle',
  kbReset: 'OFF',
  pitchAmt: 0,
  osc: 'BOTH',
  filterAmt: 0,
  dest: 'VCA LEVEL',
  modAmt: 0,
}

function modOver(over: Partial<ModCommon>): ModCommon {
  return { ...MOD_IDLE, ...over }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe, explicitly rather than by omission. §3.1 makes the recipe
 * citation the default a param inherits when it carries none; every param here carries its own,
 * so the chain has to terminate somewhere, and nothing in this manual says "these are the
 * settings for a bass".
 *
 * **Every recipe is `polyphonic-voice`, by omission and on purpose.** §12.4's other realisation
 * is a chord baked into a sample, and there is not a sample anywhere in this instrument — it is
 * `SOUND ENGINE: 100% Analog` (p.61). So the two notes it offers are two real notes, and §7.1
 * ranks that ahead of a chord sample when a rig holds both.
 */
const recipes: Recipe[] = [
  // ---- bass-mid: six characters, because this is what the box is for ------
  {
    id: 'sub37-bass-mid-hard',
    role: 'bass-mid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Square and sub, four poles, the filter envelope doing the punch',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'SQUARE'),
      ...osc2("8'", 'SAWTOOTH', 'OFF', 'ON'),
      ...mono(0, 0),
      ...mix(6.5, 7, 4, 0, 0),
      ...filt(320, 4.5, 3, '24', 3, 0.5),
      ...filterEg(2, 180, 1.5, 120),
      ...ampEg(2, 400, 6, 120, 'ON'),
      ...lfoFree(4.5, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Mixer pushed past unity with feedback under it and MultiDrive on top',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'SAWTOOTH'),
      ...osc2("16'", 'NARROW PULSE', 'OFF', 'OFF'),
      ...mono(-0.5, 1),
      ...mix(8.5, 7.5, 8, 1.5, 3),
      ...filt(260, 6.5, 7.5, '24', 2.5, 0.5),
      ...filterEg(2, 260, 2, 200),
      ...ampEg(2, 500, 6.5, 180, 'ON'),
      ...lfoFree(5.5, 'OFF', modOver({ source: 'Saw', dest: 'OSC 2 WAVE', modAmt: 1 })),
    ],
  },
  {
    id: 'sub37-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Bass line over a fixed drone, filter shut most of the way down',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'LCR', osc: '1', time: 1, gated: 'ON', legato: 'ON' }),
      ...osc1("16'", 'TRIANGLE'),
      ...osc2("16'", 'SQUARE', 'OFF', 'OFF'),
      // KB CTRL off: OSC 2 leaves the keyboard, and FREQUENCY moves to the +/- 3 octave scale.
      ...drone(-12, 0.5),
      ...mix(6, 7.5, 4.5, 0, 0),
      ...filt(180, 3.5, 2, '24', 1.5, 0),
      ...filterEg(4, 300, 2, 240),
      ...ampEg(4, 700, 7, 260, 'OFF'),
      ...lfoFree(2.5, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-bass-mid-clean',
    role: 'bass-mid',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Every mixer channel at or under five, so nothing overdrives the filter',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'TRIANGLE'),
      ...osc2("8'", 'TRIANGLE', 'OFF', 'OFF'),
      ...mono(0, 0),
      ...mix(5, 4.5, 3, 0, 0),
      ...filt(600, 1.5, 0, '24', 2, 0.5),
      ...filterEg(3, 220, 2.5, 150),
      ...ampEg(3, 500, 6.5, 140, 'OFF'),
      ...lfoFree(4, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-bass-mid-bright',
    role: 'bass-mid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Two saws an octave apart with the filter well open and two poles',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("16'", 'SAWTOOTH', 'OFF', 'ON'),
      ...mono(0.5, 0.5),
      ...mix(6.5, 5, 6, 0, 0),
      ...filt(2400, 2.5, 1.5, '12', 3.5, 1),
      ...filterEg(2, 160, 3, 140),
      ...ampEg(2, 420, 6.5, 130, 'ON'),
      ...lfoFree(5, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-bass-mid-soft',
    role: 'bass-mid',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Triangles, a slow attack and nothing sharp anywhere in it',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'LCT', osc: 'BOTH', time: 1.5, gated: 'ON', legato: 'ON' }),
      ...osc1("16'", 'TRIANGLE'),
      ...osc2("8'", 'TRIANGLE', 'OFF', 'OFF'),
      ...mono(-0.5, 0.5),
      ...mix(5.5, 5, 3.5, 0, 0),
      ...filt(500, 1, 0, '24', 1.5, 0.5),
      ...filterEg(60, 500, 3.5, 400),
      ...ampEg(45, 900, 7.5, 420, 'OFF'),
      ...lfoFree(3.5, 'OFF', modOver({ pitchAmt: 0.5, osc: 'BOTH' })),
    ],
  },

  // ---- sub: the octave-below square, and what surrounds it ---------------
  {
    id: 'sub37-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Sub oscillator and a 16-foot triangle, everything above 200 Hz gone',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'TRIANGLE'),
      ...osc2("16'", 'TRIANGLE', 'OFF', 'OFF'),
      ...mono(0, 0),
      ...mix(4.5, 9, 0, 0, 0),
      ...filt(150, 1, 0, '24', 1, 0),
      ...filterEg(3, 250, 2, 200),
      ...ampEg(3, 800, 8, 200, 'OFF'),
      ...lfoFree(2, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-sub-dirty',
    role: 'sub',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Sub through mixer feedback, hard clipping under the fundamental',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'SQUARE'),
      ...osc2("16'", 'SQUARE', 'OFF', 'OFF'),
      ...mono(-1, 1.5),
      ...mix(7.5, 9.5, 2, 0.5, 4),
      ...filt(200, 5.5, 8, '24', 1.5, 0),
      ...filterEg(3, 300, 2.5, 220),
      ...ampEg(3, 750, 8, 200, 'OFF'),
      ...lfoFree(2, 'OFF', MOD_IDLE),
    ],
  },

  // ---- acid: glide, resonance and a short filter envelope ----------------
  {
    id: 'sub37-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    // Moog's own instruction, from the Quickstart: legato glide, EXP, TIME 2, ties between
    // notes of different pitches. The ties are the template's business (§4.3); the rest is here.
    routing: '**Accent:** this manual documents note, velocity and ratchet *recording* rather than a per-step accent lane, so there is no lane here to mark one step louder than its neighbours \u2014 the accent is in the playing, and nothing on this box stores which steps carry it. **Slide:** the `GLIDE` section above is the slide, and on the `dirty` line it is Moog\u2019s own acid instruction verbatim \u2014 *\"Turn on Legato Glide, set Glide Type to EXP, and set the GLIDE TIME knob to 2\"* (p.21). `LEGATO ON` means the pitch only travels between notes that overlap, so the ties in the pattern above are what decide which steps slide',
    title: 'Legato glide on EXP at 2, resonance up, MultiDrive behind it',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'EXP', osc: 'BOTH', time: 2, gated: 'OFF', legato: 'ON' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("8'", 'NARROW PULSE', 'OFF', 'ON'),
      ...mono(0.5, 0.5),
      ...mix(7.5, 3, 6.5, 0, 2),
      ...filt(420, 8, 6, '24', 4, 1),
      ...filterEg(2, 140, 0.5, 120),
      ...ampEg(2, 260, 5, 90, 'OFF'),
      ...lfoFree(6, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Squelch with the cutoff already high and the envelope pushing further',
    routing: '**Accent:** this manual documents note, velocity and ratchet *recording* rather than a per-step accent lane, so there is no lane here to mark one step louder than its neighbours \u2014 the accent is in the playing, and nothing on this box stores which steps carry it. **Slide:** the `GLIDE` section above, `LEGATO ON` and `TIME 1.5` \u2014 shorter than the `dirty` line\u2019s 2, so the pitch arrives sooner. Legato means the pitch only travels between overlapping notes, so the ties in the pattern above decide which steps slide',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'EXP', osc: 'BOTH', time: 1.5, gated: 'OFF', legato: 'ON' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("4'", 'SAWTOOTH', 'OFF', 'ON'),
      ...mono(0, 0.5),
      ...mix(7, 2, 4.5, 0, 0),
      ...filt(1600, 7, 2.5, '18', 4.5, 1.5),
      ...filterEg(2, 120, 0.5, 100),
      ...ampEg(2, 240, 4.5, 80, 'OFF'),
      ...lfoFree(6.5, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-acid-hard',
    role: 'acid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Four poles, a very short decay and no sustain at all',
    routing: '**Accent:** this manual documents note, velocity and ratchet *recording* rather than a per-step accent lane, so there is no lane here to mark one step louder than its neighbours \u2014 the accent is in the playing, and nothing on this box stores which steps carry it. **Slide:** the `GLIDE` section above, `LEGATO ON` and `TIME 1` \u2014 the shortest of the three, which is what keeps a line this separated from smearing. Legato means the pitch only travels between overlapping notes, so the ties in the pattern above decide which steps slide',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'EXP', osc: 'BOTH', time: 1, gated: 'OFF', legato: 'ON' }),
      ...osc1("8'", 'SQUARE'),
      ...osc2("8'", 'SQUARE', 'ON', 'ON'),
      ...mono(2.5, 0),
      ...mix(8, 4, 5.5, 0, 0),
      ...filt(560, 6.5, 4, '24', 4.5, 1),
      ...filterEg(1, 90, 0, 70),
      ...ampEg(1, 180, 3.5, 60, 'ON'),
      ...lfoFree(7, 'OFF', MOD_IDLE),
    ],
  },

  // ---- lead: one note, and everything the box has behind it --------------
  {
    id: 'sub37-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Two saws, a fifth of detune and vibrato at the rate the manual names',
    params: [
      ...program(50),
      ...glide({ on: 'ON', type: 'LCR', osc: 'BOTH', time: 1, gated: 'ON', legato: 'ON' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("8'", 'SAWTOOTH', 'OFF', 'OFF'),
      ...mono(7, 0.5),
      ...mix(7, 2, 6, 0, 0),
      ...filt(3200, 2.5, 1.5, '12', 3, 1),
      ...filterEg(8, 300, 5, 240),
      ...ampEg(8, 600, 8, 260, 'OFF'),
      // p.23: "modulation at normal vibrato rates (between 5 and 10Hz) is possible" in either range.
      ...lfoFree(6, 'OFF', modOver({ pitchAmt: 1, osc: 'BOTH' })),
    ],
  },
  {
    id: 'sub37-lead-hard',
    role: 'lead',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Narrow pulse into four poles, MultiDrive taking the edge off nothing',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'NARROW PULSE'),
      ...osc2("8'", 'SQUARE', 'OFF', 'ON'),
      ...mono(-0.5, 0),
      ...mix(8, 3, 6.5, 0, 0),
      ...filt(1800, 4, 5, '24', 3.5, 1),
      ...filterEg(2, 200, 3.5, 140),
      ...ampEg(2, 380, 7, 120, 'ON'),
      ...lfoFree(6, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-lead-dirty',
    role: 'lead',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Hard sync with the LFO dragging oscillator two through the sync tear',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("4'", 'SAWTOOTH', 'ON', 'ON'),
      ...mono(3.5, 0),
      ...mix(4, 2, 9, 1, 3.5),
      ...filt(2200, 5.5, 7, '18', 3, 1),
      ...filterEg(2, 260, 4, 200),
      ...ampEg(2, 520, 7.5, 180, 'ON'),
      // The one place a synced LFO earns its place: a division, not a rate, so the sync tear
      // moves in time with the track (p.23, list p.52).
      ...lfoSynced('1/8', modOver({ source: 'Ramp', pitchAmt: 3, osc: '2' })),
    ],
  },

  // ---- stab: the only role that spends the second note ------------------
  {
    id: 'sub37-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Two notes through one filter, envelope shut before the next beat',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("8'", 'SAWTOOTH', 'OFF', 'ON'),
      // DUO MODE on with KB CTRL at HI: this is the one recipe pair that plays two notes.
      ...duo('HI', 0, 0.5),
      ...mix(7, 2, 7, 0, 0),
      ...filt(1400, 4.5, 3.5, '24', 4, 1),
      ...filterEg(2, 150, 1, 110),
      ...ampEg(2, 300, 4, 120, 'ON'),
      ...lfoFree(5, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-stab-dark',
    role: 'stab',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Two low notes, filter kept under a kilohertz, no top on it at all',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("16'", 'SQUARE'),
      ...osc2("16'", 'TRIANGLE', 'OFF', 'ON'),
      ...duo('LO', -0.5, 0.5),
      ...mix(6.5, 4, 6.5, 0, 0),
      ...filt(500, 3, 2, '24', 2.5, 0.5),
      ...filterEg(4, 220, 1.5, 180),
      ...ampEg(4, 420, 4.5, 200, 'ON'),
      ...lfoFree(3, 'OFF', MOD_IDLE),
    ],
  },

  // ---- texture: the box's own looping envelope, used as one --------------
  {
    id: 'sub37-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'A fifth droning under one held note, the filter envelope looping over both',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'TRIANGLE'),
      ...osc2("16'", 'SAWTOOTH', 'OFF', 'OFF'),
      // KB CTRL off, so OSC 2 leaves the keyboard and holds a pitch of its own: +7 semitones on
      // the extended scale is a fifth above where OSC 2's own octave setting already puts it.
      // The part is one note and the bed is the second oscillator, which is why this is
      // `drone()` and not `duo()`.
      ...drone(7, 0.5),
      // Pink noise, low, as air rather than as a source (p.27).
      ...mix(4.5, 3, 5, 2.5, 0),
      ...filt(700, 3, 0.5, '12', 3.5, 0.5),
      // p.31: "When LOOP is illuminated, an envelope's delay, attack, hold, decay, and release
      // stages will loop continuously for as long as a note is held ... it is possible to use
      // the filter's envelope generator as a multistage LFO. The shorter the envelope times, the
      // faster the loop will repeat." Long times here, so the bed breathes rather than wobbles.
      ...filterEg(3200, 4500, 6, 3800, 'ON'),
      // The amplitude envelope is emphatically *not* looping: that would re-articulate the held
      // note and turn a bed into a pulse.
      ...ampEg(2400, 6000, 9, 4000, 'OFF', 'OFF'),
      ...lfoFree(0.2, 'OFF', modOver({ filterAmt: 1.5, pitchAmt: 0.5, osc: '2' })),
    ],
  },

  // ---- pad: the second role that spends the second note ------------------
  {
    id: 'sub37-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Two held pitches through one closed ladder, drifting against each other',
    params: [
      ...program(50),
      // No glide: p.17 notes the tie shortcut does not work in DUO MODE, and a pad whose two
      // voices slide independently under one filter is a smear rather than a chord.
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("8'", 'TRIANGLE', 'OFF', 'OFF'),
      // The whole point of the recipe: DUO MODE with KB CTRL at HI is two independent pitches.
      // BEAT FREQ rather than FREQUENCY does the drift, because p.26 says it beats at the same
      // rate on every note — which is what keeps a held chord moving evenly across the keyboard.
      ...duo('HI', 0, 1),
      ...mix(5.5, 4.5, 5, 0.5, 0),
      ...filt(420, 2.5, 1, '24', 2, 0.5),
      ...filterEg(700, 1400, 5, 900),
      ...ampEg(600, 1800, 8.5, 1200, 'OFF'),
      ...lfoFree(0.6, 'OFF', modOver({ pitchAmt: 0.5, osc: '2', filterAmt: 1 })),
    ],
  },

  // ---- arp: a short, repeatable pluck the template sequences ------------
  {
    id: 'sub37-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Short pluck, two poles, the filter envelope opening on every note',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'SAWTOOTH'),
      ...osc2("4'", 'SQUARE', 'OFF', 'ON'),
      ...mono(0.5, 0.5),
      ...mix(6.5, 2, 5, 0, 0),
      ...filt(2600, 3.5, 1, '12', 4, 1.5),
      ...filterEg(1, 110, 0.5, 90),
      ...ampEg(1, 190, 2.5, 90, 'ON'),
      ...lfoFree(6, 'OFF', MOD_IDLE),
    ],
  },
  {
    id: 'sub37-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'One oscillator, nothing over unity, decay just long enough to ring',
    params: [
      ...program(50),
      ...glide({ on: 'OFF', type: 'LCR', osc: 'BOTH', time: 0, gated: 'OFF', legato: 'OFF' }),
      ...osc1("8'", 'TRIANGLE'),
      ...osc2("8'", 'TRIANGLE', 'OFF', 'ON'),
      ...mono(0, 0),
      ...mix(5, 2.5, 2, 0, 0),
      ...filt(1800, 1.5, 0, '24', 2.5, 1),
      ...filterEg(1, 130, 1, 100),
      ...ampEg(1, 220, 3, 110, 'OFF'),
      ...lfoFree(5, 'OFF', MOD_IDLE),
    ],
  },
]

// ---------------------------------------------------------------------------
// §2.3 Manifest
// ---------------------------------------------------------------------------

/**
 * The eight roles one paraphonic analog voice can honestly claim.
 *
 * `bass-mid`, `sub` and `acid` are why the box is in a rack at all; `lead` and `arp` are the
 * other monophonic uses of the same voice; `stab` and `pad` are the two that spend the second
 * note, and the two the templates ask for more notes of than this box has; `texture` is the
 * sustaining, non-melodic use of the same signal path.
 *
 * **A role is declared on what the voice can be asked to do, never on how well it will do it at
 * a given size, and never on whether anybody has authored a recipe yet.** Those are three
 * different questions and only the first belongs here. Withholding `pad` because two notes makes
 * a thin one would report *"nothing in your rig plays this part"* about an instrument that
 * sustains, filters and takes two independent pitches — `polyphony: 2` is where the size lives,
 * and it refuses the triad on its own in words that are actually true, *needs 3 notes at once
 * and the most any voice here can sound is 2*. Withholding `texture` for want of a recipe would
 * be the same error one step further back: an empty slot in this file is not a fact about the
 * hardware, and the honest response to one is to fill it. The box holds a bed with the parts the
 * manual describes — two looping DAHDSR envelopes it calls multistage LFOs itself (pp.31, 33),
 * two modulation busses, and an OSC 2 that leaves the keyboard on command.
 *
 * The percussion roles are absent for a reason of a different kind, and it survives both
 * corrections: there is one filter and one amp envelope, so a kick with a noise transient over
 * an independent pitched body would be claiming two voices out of one. That is a structural
 * limit rather than a size or an authoring one, no note count fixes it, and it is the same call
 * the minilogue xd makes with four times the polyphony to make it with.
 */
const VOICE_ROLES = ['bass-mid', 'sub', 'acid', 'lead', 'stab', 'pad', 'texture', 'arp'] as const

export const device: Device = {
  id: 'moog-subsequent-37',
  name: 'Subsequent 37',
  maker: 'Moog',
  kind: 'synth',

  /**
   * Both directions, two transports. `SEND CLOCK: OFF, ARP, ON` is a real menu setting (p.37);
   * every `SYNC` switch on the box locks to external MIDI clock (pp.15, 23, 31, 33); and clock
   * rides the general port routing rather than a dedicated jack, `IN PORTS` and `OUT PORTS`
   * both defaulting to `BOTH` (pp.35-36).
   *
   * `preferredSource` is not claimed (§7.4). A synth with a sequencer in it can drive a rig and
   * that is not its job — see `capabilityEvidence` below for what the manual actually says.
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  /**
   * §2.6/#22, §7.4/#80. **One entry, and it is about a field this manifest does not declare.**
   *
   * #120 gave a reasoned non-claim somewhere to live besides a comment. This one is `unknown` and
   * not `cited-against`, and the difference is worth stating because the Cascadia next door is
   * the other call: that manual answers the question in one direction, and this one answers it in
   * both. p.9's overview calls the box "the ideal instrument for any synthesist" and "a powerful
   * MIDI controller" inside the same section; p.8 gives the wiring for controlling other gear and
   * the wiring for being controlled, a paragraph each. A document that says both has not said
   * this box's job is to lead a rig, and it has not said the reverse either.
   *
   * Two things the pages do *not* print, recorded so nobody looks for them twice: there is no
   * manufacturer default beside `SEND CLOCK` or `FOLLOW SPP` (p.35's menu map and p.37's prose
   * both leave them unmarked, where `SEND ST/STP` is marked "(default)"), and there is no global
   * receive-clock setting at all — following an external clock is per-section, on the SYNC
   * buttons.
   */
  /**
   * §2.6/#142. The step sequencer ties, exactly as the semi-modulars do. p.17, Step Sequencer
   * Basics: *"After entering a note, pressing the TIE button will tie (connect) your previous note
   * to the next note you play"*, and the sentence that settles the state is two lines below it —
   * *"if you play the same note as the previous one using a tie, you will effectively double the
   * length of the note."* Stacking ties is the whole of how a longer note is entered.
   *
   * **p.17 and not p.16**, which is where the panel's `LATCH / TIE` button lives and which says
   * only what the button becomes in record mode. The first reading cited it and quoted p.17,
   * which is a page reference and a fact from two different pages — §2.5's failure exactly.
   *
   * **The arpeggiator's GATE LENGTH is not this**, and the page that proves it is the page it is
   * printed on. p.40 puts `ARPEGGIATOR (PRESET EDIT 1.1)` and `SEQUENCER (PRESET EDIT 1.2)` one
   * above the other: GATE LENGTH is in the first — *"specifies how long the arpeggiator's gate
   * stays on for each note"*, `OFF` to `100%`, default 50% — and the second holds `MOD DST`,
   * `SEQ MOD AMT` and no gate length at all. Its neighbour SWING *is* described as swinging
   * "your sequence data", which is suggestive and is not a printed claim about GATE LENGTH.
   * Reading it as a sequencer gate length would be the cited-range-wrong-scale trap in CLAUDE.md,
   * one field over.
   */
  noteDuration: { kind: 'tied-steps', control: 'TIE' },

  capabilityEvidence: {
    noteDuration: cite(17),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'no page states that leading a rig is this synth’s job, and the pages that come closest point both ways: p.9’s overview calls it "the ideal instrument for any synthesist" and "a powerful MIDI controller" in one section, and p.8 gives one paragraph for wiring it as a controller and one for controlling it from an external one; `SEND CLOCK: OFF, ARP, ON` (p.37) is a capability with no printed default, and p.15 warns that with SYNC on "the arp/sequencer will not play unless MIDI clock is received"',
    },
  },

  /**
   * p.61: `AUDIO OUTPUT: 1xTS, 1xTRS Headphone` — **one mono output**, and the headphone jack
   * carries the same signal, which p.34 is explicit about: *"Although it will drive both sides
   * of the headphones it is still a monaural signal as it is identical on both sides."* So
   * `individualOuts` is 0 and `main` is `mono`, which nothing else in this library's synths is.
   *
   * `audioIn` is true and it is a real signal path rather than a control input: `AUDIO INPUT:
   * 1xTS` (p.61), and p.8 — *"the jack labeled EXT IN allows the Subsequent 37 to shape and
   * filter external sounds"* — through the mixer's own FDBK / EXT IN channel. The four CV
   * sockets are pitch, filter, volume and gate and are all inputs, so none of them changes this.
   *
   * `usbAudio` is false, stated outright on p.8: *"The Subsequent 37 supports MIDI I/O over USB,
   * but not audio data."*
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * 680 mm across, the metric figure from the `DIMENSIONS` line on p.61.
   *
   * **That line disagrees with itself and only on this axis.** It prints `6.75" H x 26.375" W x
   * 14.75 D / 17cm H x 68cm W x 37.5cm D`; height and depth convert cleanly and width does not —
   * 26.375" is 66.99 cm, not 68. Moog's own product listing gives 26.75", which is 67.9 cm and
   * rounds to the printed metric figure, so the imperial column is where the typo is. The metric
   * number is the one carried here, and `panel.ts` records the check.
   */
  physical: { panelSpanMm: 680, verified: cite(61) },

  panel: SUBSEQUENT_37_PANEL,

  manual: { title: "Subsequent 37 User's Manual" },

  productPage: 'https://www.moogmusic.com/synthesizers/subsequent-37/',

  /**
   * **One voice, two notes.** p.61: `POLYPHONY: Selectable Monophonic or Duophonic`. The module
   * note above is the long form; the short form is that both oscillators share one filter, one
   * amplifier and one pair of envelopes, so the two pitches are capacity inside a part and never
   * two parts.
   *
   * `comfortableVoices` is omitted, which leaves it at the assignable count — 1. Declaring the
   * number the default already gives would add a line and change nothing.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 2 }],

  hints: {
    'panel-init': 'Hold PANEL/INIT to start clean',
    'save-preset': 'SAVE, name it, hold SAVE again',
    'swing-menu': 'PRESET EDIT, ARPEGGIATOR, SWING',
    'self-oscillation': 'Above 7 the filter sings by itself',
    'lfo-divisions': 'RATE picks divisions while SYNC is lit',
    'ext-in-key': 'External audio needs a key held down',
  },

  recipes,
}
