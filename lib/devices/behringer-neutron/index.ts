import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  PatchEntry,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import { NEUTRON_PANEL, NEUTRON_PANEL_SPAN_MM } from './panel'

/**
 * Behringer NEUTRON (§2.3). Two 3340 oscillators, a 12 dB/octave multi-mode filter with two
 * outputs, two full ADSR envelopes, a five-shape LFO, a sample & hold, a slew limiter, two
 * attenuators, an analog bucket-brigade delay, a soft-clipping overdrive — and **fifty-six patch
 * points on a box that already makes a sound with nothing plugged in**.
 *
 * ## One manual, and this time it is a real one
 *
 * `NEUTRON_M_EN.pdf`, 34 pages, English throughout. Unlike the CRAVE's multilingual quick-start
 * it carries a proper Specifications chapter (pp.25-26) which prints **a range for nearly every
 * control on the panel**, plus an electrical line for every one of the fifty-six sockets. So most
 * of this manifest's numbers have a legality claim behind them rather than being omitted for want
 * of a scale, which is the opposite of the CRAVE's situation on the same maker's shelf.
 *
 * **Pagination is the easy case for once.** The folio is printed in the *header* rather than the
 * footer, and it equals the PDF page on all thirty-two numbered pages — p.2 is PDF 2, p.33 is PDF
 * 33, with an unnumbered cover and back cover either side. Every citation below is that number.
 *
 * ## Two controls whose printed range depends on a switch
 *
 * CLAUDE.md's standing warning — a cited range can still be the wrong range — applies twice here,
 * and both are handled the way it prescribes: **the recipe carries the switch, so the pairing
 * cannot come apart.**
 *
 *  - **`TUNE` has two scales.** p.25: `Tune (OSC 1&2): +1/-1 octave (8', 16' or 32') or +10/-10
 *    (full range)`. The same knob is ±12 semitones under any one of the three octave feet and
 *    ±120 semitones with all three LEDs lit. So `tune()` below takes the range *with* the value
 *    and emits `OSC n RANGE` beside it; there is no way to author a tune figure in this file
 *    without saying which scale it was read off.
 *  - **`LFO RATE` has two scales, and the second is not even a number.** p.25 gives the knob as
 *    `Rate: 0 to 10 (0.01Hz to 10kHz)`. But §5.7 (p.13) says that with MIDI clock sync engaged
 *    *"The LFO rate position determines the clock multiplier-divider"*, and prints the
 *    twenty-one division values the travel selects instead. A synced recipe therefore renders
 *    `LFO DIVISION` from that list and **no `LFO RATE` number at all**, because the number would
 *    be read off a scale that is not in force.
 *
 * ## Four controls this file renders as percent of travel
 *
 * p.25 gives `Attenuator 1: +4 dB to -∞`, `Attenuator 2: 0 dB to -∞` and overdrive `Level: 0 dB
 * to -∞`; `OSC mix` it gives as `(linear blend control between OSC 1&2)` with no figures at all.
 * A range needs two finite numbers, so these four go through `travel()` — percent of knob travel,
 * with **both claims unverified**, exactly as the Minitaur handles its `0 to Self-Oscillation`
 * resonance. `% travel` is a fact about a knob anybody can see; it is not a claim that the box
 * displays 0-100.
 *
 * ## The patchbay, and why a recipe here is knobs plus cables
 *
 * The default signal path is already a complete voice — p.21 prints the normalised routing as a
 * table and then as a block diagram:
 *
 *     OUTPUT FROM                    GOES TO             THEN INTO
 *     OSC MIX + EXT INPUT + NOISE    VCF>OD>VCA>DELAY    LINE OUT + Headphones
 *     ENV 1                          VCA CV
 *     LFO (BIPOLAR)                  ATT 2               ATT 1
 *     ATTENUATOR 2                   PULSE WIDTH 1&2
 *     NOISE                          SAMPLE AND HOLD
 *     LFO (BIPOLAR)                  FILTER DEPTH        VCF FREQUENCY CV
 *     ENV 2                          ENV DEPTH           VCF FREQUENCY CV
 *     ASSIGN                         ATT1 CV
 *     LFO (BIPOLAR)                  MULT INPUT
 *     ENV 2                          INVERT
 *     E. GATE1                       E. GATE2            UNLESS OVERRIDDEN USING
 *                                                        E. GATE 2 INPUT
 *
 * Reproduced row by row rather than paraphrased, because two of them run together easily and the
 * difference matters: the bipolar LFO reaches **ATT 1** through ATT 2, and it is `ATTENUATOR 2`
 * — a row of its own — that reaches the two pulse widths.
 *
 * So a NEUTRON recipe is knob positions **plus the cables that go past those defaults**. Each
 * cable's `note` says which of the two it is doing — replacing a stated normal, or supplying a
 * modulation the panel leaves empty — which is the convention the Cascadia established and the
 * only way a reader can predict what a cable will do.
 *
 * **Every jack id is written `IN · NAME` or `OUT · NAME`, and that division is the panel's own
 * word.** The two blocks are silkscreened `IN` and `OUT`, and the manual splits its list the same
 * way (*Input Patch Bay Section*, p.8; *Output Patch Bay Section*, p.9).
 *
 * The prefix is load-bearing twice over. `OSC 1` and `OSC 2` are each printed on both sides and
 * collide exactly without it — item 45 is OSC 1's pitch input and item 77 is its audio output,
 * which are about as different as two holes on this panel get. And nine more pairs are
 * distinguished only by a suffix word that is easy to lose while reading at the machine:
 * `INVERT IN` against `INVERT`, `MULT` against `MULT 1`, `ATT1 IN` against `ATT1`, `SLEW IN`
 * against `SLEW`, `S&H IN` against `S&H`, `SUM1(A)` against `SUM1`, and so on. It also makes the
 * direction rule visible in the data: **a cable runs `OUT · ` to `IN · `.**
 *
 * The rear panel (p.9 §3.2.2) is its own section and takes `REAR · `. `REAR · OUTPUT` and
 * `OUT · OUTPUT` are two sockets carrying one signal, which p.10 states in as many words: the
 * ¼" rear output *"is also duplicated on the patch bay via a 3.5 mm output"*.
 *
 * ## Six places this manual contradicts itself
 *
 * Recorded rather than smoothed over, the way the Subsequent 37's six are.
 *
 *  1. **Delay time.** p.12 §4.7: *"Delay times of 24 ms to 640 ms can be set."* p.25: `Time: 25
 *     ms to 640 ms`. One millisecond apart. The specification table wins here, because that is
 *     the page whose job is ranges; the prose figure is recorded on the parameter's note.
 *  2. **The LFO's fifth shape.** p.11 lists `Sine, Triangle, Sawtooth, Square, Reverse Sawtooth`;
 *     p.25 lists `Sine, Triangle, Sawtooth, Square and Ramp`. Same waveform, two names. The
 *     option set below is p.25's, since that is where the switch's legality claim lives, and the
 *     other name is carried on the note so a reader looking at p.11 is not lost.
 *  3. **What the LFO reaches the filter through.** p.11 §4.5: *"By default, the LFO is patched
 *     through the FILTER DEPTH control."* p.21's table agrees. But there is no control called
 *     `FILTER DEPTH` on this panel — item (16) is `MOD DEPTH`, and p.7 defines it as *"the depth
 *     of filter modulation from the FREQ MOD input"*. They are the same knob under two names.
 *     This file uses the silkscreen, because §8 has somebody standing at the box.
 *  4. **What feeds attenuator 2.** p.12 §4.12 and p.21's table both say the *bipolar* LFO output
 *     is routed to the attenuator 2 input by default; the block diagram immediately below that
 *     table on the same page labels the same arrow `UNI-POLAR LFO`. Two of the three say bipolar,
 *     so bipolar is what the notes below say, and the disagreement is recorded here rather than
 *     hidden.
 *  5. **A copy-paste in the specifications.** p.26 gives `LFO TRIG` as `Control voltage: -5 V to
 *     +5 V (S&H triggers @ 1.6 V)` — an S&H threshold on the LFO's trigger row, three rows after
 *     the genuine `SAMPLE & HOLD CLOCK ... (S&H triggers @ 3 V)`, with LFO RATE and LFO SHAPE
 *     between them. The jack is declared as a trigger input on p.8's own description (*"LFO TRIG
 *     – LFO Trigger input"*) and the stray threshold is not quoted anywhere below.
 *  6. **How far the oscillators reach in full-range mode.** p.10 §4.4 says *"a range from 0.7 Hz
 *     to over 50 kHz when all range LEDs are illuminated"*; p.25 says `Oscillators: 2 (0.7 Hz to
 *     55 kHz across 4 ranges)`. Same floor, two ceilings — "over 50 kHz" is vaguer rather than
 *     wrong, and the specification's figure is the one quoted below, on the page whose job is
 *     ranges.
 *
 * ## Paraphonic is two notes, and every recipe says which mode it is in
 *
 * p.14 §5.15 is the sentence that settles the number: *"Note that a Neutron in Paraphonic mode
 * will handle 2 notes."* Two oscillators that can take independent pitches, through **one**
 * filter, **one** VCA and one pair of envelopes — so this is one assignable at `polyphony: 2`,
 * not two voices. The device-level field cannot say *"2 notes, but only with the switch in"*, so
 * **every recipe carries `PARAPHONIC`**, and the monophonic ones carry `patchPolyphony: 1` so the
 * resolver never hands a two-note part to a patch that cannot sound it. That is the arrangement
 * the Matriarch's `VOICE MODE` and the minilogue xd's `DUO` already established.
 *
 * ## Clock: receives, does not claim to send
 *
 * `canReceiveClock` is explicit and has a whole section — §5.7 and §5.12 (p.13): *"The LFO will
 * sync to the beat when receiving MIDI clock"*, over DIN or over USB from a DAW. `canSendClock`
 * is `false`, and the reason is in `capabilityEvidence` rather than in this sentence (§2.6/#120).
 *
 * ## What is not modelled
 *
 * **There is no sequencer, and that is a fact with consequences.** p.25's Synthesizer
 * Architecture list is exhaustive and has no sequencer or arpeggiator on it; p.10 §4.3 has the
 * reader connecting *"an external keyboard with MIDI output"*. So `patternEntry` is `external`,
 * no recipe carries `articulation`, `features.perStep` is absent, and **`swing` is the one mood
 * axis this box declines** — nothing on it decides where a note falls. `sidechain` is absent for
 * the ordinary reason that no page documents a ducking source.
 *
 * The SysEx-and-app-only features of §5.18 (autoglide, key split, LFO shape order, LFO phase) are
 * absent too: they are configuration reached from a computer, not a control a reader dials at the
 * machine, and §8 is about the machine.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = 'Neutron User Manual'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

// ---------------------------------------------------------------------------
// Ranges. Every one from the Specifications chapter on printed p.25 unless noted.
// ---------------------------------------------------------------------------

/** `0 to 100%` — pulse width, volume, noise, VCA bias, both filter depths, repeats, delay mix. */
const PERCENT = { min: 0, max: 100 }
/** `0 to 10` — resonance ("capable of self oscillation") and the overdrive TONE. */
const ZERO_TEN = { min: 0, max: 10 }
/** `Drive: 0 to 11`. The manual means it; the knob has eleven. */
const DRIVE_RANGE = { min: 0, max: 11 }
/** `Cutoff frequency: 10 Hz to 15 kHz`. */
const CUTOFF_HZ = { min: 10, max: 15000 }
/** `Rate: 0 to 10  (0.01Hz to 10kHz)` — the knob scale, free-running only. See the header. */
const LFO_RATE = { min: 0, max: 10 }

/**
 * The four envelope stages, in **milliseconds** — `Attack: 300 µs to 5 s`, `Decay: 2.4 ms to 10
 * s`, `Release: 1.5 ms to 6 s`, all identical for envelopes 1 and 2.
 *
 * Milliseconds rather than seconds for the Minitaur's arithmetic reason: §3.2's mood grid
 * defaults to `step: 1` where a param declares none, so a value in seconds is rounded to the
 * nearest whole second the moment a mood offset is non-zero — which would turn a 180 ms kick
 * decay into 0. The manual's own µs figures convert exactly: 300 µs is 0.3 ms.
 */
const ATTACK_MS = { min: 0.3, max: 5000 }
const DECAY_MS = { min: 2.4, max: 10000 }
const RELEASE_MS = { min: 1.5, max: 6000 }
/** `Sustain: 0 V to 9 V` — a level given as a voltage, which is what the box actually puts out. */
const SUSTAIN_V = { min: 0, max: 9 }

/** `Time: 25 ms to 640 ms`. p.12's prose says 24 ms; see contradiction 1 in the header. */
const DELAY_MS = { min: 25, max: 640 }
/** `Rate: 0.26 Hz to 28 Hz (can be clocked from extrenal source)` — the manual's typo, not ours. */
const SH_RATE_HZ = { min: 0.26, max: 28 }
/** `Glide: 500 µs to 1 s`, in milliseconds for the reason the envelope stages are. */
const SH_GLIDE_MS = { min: 0.5, max: 1000 }
/** `Slew rate: 1 ms to 3 s`. */
const SLEW_MS = { min: 1, max: 3000 }
/** `Portamento time: 0 to 10 s`. */
const PORTA_MS = { min: 0, max: 10000 }

/** `Tune (OSC 1&2): +1/-1 octave (8', 16' or 32')` — twelve semitones either side. */
const TUNE_OCTAVE_ST = { min: -12, max: 12 }
/** `... or +10/-10 (full range)`, the all-three-LEDs mode. Ten octaves either side. */
const TUNE_FULL_ST = { min: -120, max: 120 }

// ---------------------------------------------------------------------------
// Option sets (§3.2). The legality claim is cited; the selection is taste.
// ---------------------------------------------------------------------------

const ON_OFF = ['on', 'off'] as const
/** p.25, Oscillator Section: `Shape (OSC 1&2): Tone Mod, Square, Sawtooth, Triangular or Sine`. */
const OSC_SHAPES = ['Tone Mod', 'Square', 'Sawtooth', 'Triangular', 'Sine'] as const
/** p.25: `Range (OSC 1&2): 8', 16' or 32' or full range (all 3 LEDs)`. */
const OSC_RANGES = ["8'", "16'", "32'", 'full range'] as const
/** p.25, Filter Section: `Filter mode, high pass, band pass and low pass`. */
const VCF_MODES = ['high pass', 'band pass', 'low pass'] as const
/** p.25, LFO Section. p.11 calls the fifth `Reverse Sawtooth`; see contradiction 2. */
const LFO_SHAPES = ['Sine', 'Triangle', 'Sawtooth', 'Square', 'Ramp'] as const

/**
 * The twenty-one clock divisions the LFO RATE travel selects **when MIDI clock sync is on**,
 * verbatim and in the manual's own order — p.13 §5.7, *"from counter clock wise to clockwise"*.
 *
 * Cited once here rather than restated per recipe, and present at all because this is the second
 * of the two scales the same knob carries. A synced recipe that printed `LFO RATE 6.5` would be
 * quoting a number off a scale the box has switched out from under it.
 */
const LFO_DIVISIONS = [
  '4/1', '3/1', '2/1', '3/2', '1/1', '1/2', '3/8', '1/3', '1/4', '1/5', '3/16',
  '1/6', '1/7', '1/8', '3/32', '1/12', '1/16', '1/24', '1/32', '1/48', '1/64',
] as const

// ---------------------------------------------------------------------------
// §3.3 The patchbay
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
  extra: { note?: string; clock?: string[] } = {},
): { id: Id; direction: 'in' | 'out'; signal: JackSignalKind[]; note?: string; clock?: string[] } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...extra }
}

/**
 * All sixty-one sockets, cited once each: the fifty-six patch points in the panel's own reading
 * order (pp.8-9, items 45-100), the MIDI IN DIN on the top panel (item 38), and the four rear
 * connectors (p.9, items 101-103 and 106).
 *
 * Declared whole rather than jack by jack. A partial patchbay reads as a claim that the rest do
 * not exist, and on a semi-modular the complement *is* the instrument.
 *
 * **Names are the manual's own list, not the silkscreen**, and the two differ only in whitespace
 * — the panel prints `PW 1` and `E. GATE 1` where p.8 prints `PW1` and `E. GATE1`. The list is
 * what is being cited, so the list is what is written.
 *
 * Signal kinds come from the electrical tables on p.26, which give every socket a line: a
 * `Control voltage: 1 V per octave` row is `pitch-cv`, a plain `Signal input` on an audio stage
 * is `audio`, and `-5 V to +5 V` is `cv`.
 *
 * Seven utility inputs take either and declare both, and p.26 says so in two different ways. It
 * spells it out for five: `SLEW IN` is `Signal or CV input`, and all four `SUM` inputs are
 * `Signal input or CV input`. For the other two families it gives a bare `Signal input`, and the
 * reading comes from what the manual does with them elsewhere — p.21's tip 5 patches the LFO into
 * `ATT 1 IN` and p.12 §4.12 normals it into `ATT 2 IN`, both control voltages, while p.24's
 * *Quantum Loop* patches `OSC MIX` — audio — into `S&H IN` against p.21's normalled `NOISE`.
 */
const JACKS = [
  // ---- Input Patch Bay Section, items 45-76 (p.8) --------------------------
  jack('IN · OSC 1', 'in', ['pitch-cv'], 8, { note: '1 V per octave (p.26)' }),
  jack('IN · OSC 2', 'in', ['pitch-cv'], 8, { note: '1 V per octave (p.26)' }),
  jack('IN · OSC1+2', 'in', ['pitch-cv'], 8, { note: 'Both oscillators at once, 1 V per octave' }),
  jack('IN · INVERT IN', 'in', ['audio', 'cv'], 8, {
    note: 'Whatever arrives leaves OUT · INVERT with its polarity flipped',
  }),
  jack('IN · SHAPE 1', 'in', ['cv'], 8, { note: '±5 V; only bites with OSC 1 shape set to blend' }),
  jack('IN · SHAPE 2', 'in', ['cv'], 8, { note: '±5 V; only bites with OSC 2 shape set to blend' }),
  /**
   * Both pulse-width inputs are **normalled to attenuator 2's output**, which is itself fed by
   * the LFO (p.21). So a cable here replaces the default PWM rather than adding to it — which is
   * why the note says so and why the recipes that want their own PWM say which they are doing.
   */
  jack('IN · PW1', 'in', ['cv'], 8, { note: 'Replaces the ATT 2 output normalled here (p.21)' }),
  jack('IN · PW2', 'in', ['cv'], 8, { note: 'Replaces the ATT 2 output normalled here (p.21)' }),
  jack('IN · VCF', 'in', ['audio'], 8, {
    note: 'Replaces the OSC MIX + EXT INPUT + NOISE sum normalled into the filter',
  }),
  jack('IN · FREQ MOD', 'in', ['cv'], 8, {
    note: 'Replaces the LFO normalled here; MOD DEPTH is its attenuator',
  }),
  jack('IN · RES', 'in', ['cv'], 8, { note: '±5 V into the resonance' }),
  jack('IN · OD IN', 'in', ['audio'], 8, { note: 'Replaces the filter output normalled here' }),
  jack('IN · VCA IN', 'in', ['audio'], 8, { note: 'Replaces the overdrive output normalled here' }),
  jack('IN · VCA CV', 'in', ['cv'], 8, {
    note: 'Replaces ENV 1, normalled here; ±9 V, and VCA BIAS opens the VCA without it',
  }),
  jack('IN · DELAY IN', 'in', ['audio'], 8, { note: 'Replaces the VCA output normalled here' }),
  jack('IN · DELAY TIME', 'in', ['cv'], 8, { note: '±5 V; nothing is normalled here' }),
  /**
   * `gate`, not `trigger`, and p.26 is why the distinction earns its keep. The threshold is a
   * trigger's (*"envelope triggers @ 1.5 V"*) but what this drives is an ADSR whose sustain holds
   * for as long as the gate does — a duration that matters is the definition of a gate.
   */
  jack('IN · E. GATE1', 'in', ['gate'], 8, { note: 'Envelope 1 gate; triggers at 1.5 V (p.26)' }),
  jack('IN · E. GATE2', 'in', ['gate'], 8, {
    note: 'Replaces E. GATE1, which is normalled here so one gate plays both envelopes (p.21)',
  }),
  jack('IN · S&H IN', 'in', ['audio', 'cv'], 8, {
    note: 'Replaces NOISE, normalled here — the source the S&H samples',
  }),
  jack('IN · S&H CLOCK', 'in', ['clock', 'trigger'], 8, {
    note: 'Replaces the RATE knob as the sample clock; triggers at 3 V (p.26)',
  }),
  jack('IN · LFO RATE', 'in', ['cv'], 8, { note: '±5 V; nothing is normalled here' }),
  jack('IN · LFO SHAPE', 'in', ['cv'], 8, {
    note: '±5 V; only bites with the LFO set to blend rather than switch (p.13 §5.4)',
  }),
  jack('IN · LFO TRIG', 'in', ['trigger'], 8, { note: 'Restarts the LFO phase' }),
  /**
   * A passive mult, normalled from the bipolar LFO (p.21) — which is why p.24's *Edge Synth*
   * can call `MULT 1` "LFO BY DEFAULT" without patching anything into it.
   *
   * **`clock` is deliberately not among its kinds**, unlike the CRAVE's `MULTIPLE`. p.26 says
   * *"Input Signal is duplicated on Mult 1 and Mult 2 outputs"* and this patchbay names no clock
   * signal anywhere in its fifty-six holes, so declaring one here would put a tempo through a
   * socket no page of this manual connects to tempo.
   */
  jack('IN · MULT', 'in', ['audio', 'cv', 'gate', 'trigger'], 8, {
    note: 'Replaces the bipolar LFO normalled here; copied to both MULT outputs',
  }),
  jack('IN · ATT1 IN', 'in', ['audio', 'cv'], 8, {
    note: 'Attenuator 1 is a VCA: the knob and IN · ATT1 CV both scale what arrives here',
  }),
  jack('IN · ATT1 CV', 'in', ['cv'], 8, { note: 'Replaces ASSIGN, normalled here (p.21)' }),
  jack('IN · ATT2 IN', 'in', ['audio', 'cv'], 8, {
    note: 'Replaces the bipolar LFO normalled here, whose output goes on to PW1 and PW2',
  }),
  jack('IN · SLEW IN', 'in', ['audio', 'cv'], 8, { note: 'Signal or CV (p.26)' }),
  jack('IN · SUM1(A)', 'in', ['audio', 'cv'], 8),
  jack('IN · SUM1(B)', 'in', ['audio', 'cv'], 8),
  jack('IN · SUM2(A)', 'in', ['audio', 'cv'], 8),
  jack('IN · SUM2(B)', 'in', ['audio', 'cv'], 8),

  // ---- Output Patch Bay Section, items 77-100 (p.9) -----------------------
  jack('OUT · OSC 1', 'out', ['audio'], 9, { note: 'Max +14 dBu (p.26)' }),
  jack('OUT · OSC 2', 'out', ['audio'], 9, { note: 'Max +14 dBu (p.26)' }),
  jack('OUT · OSC Mix', 'out', ['audio'], 9, { note: 'The OSC MIX blend, max +14 dBu (p.26)' }),
  jack('OUT · VCF 1', 'out', ['audio'], 9, { note: 'The mode the MODE button selects' }),
  /**
   * The second filter output, and the reason it is worth patching: p.11 prints the mapping from
   * the selected mode to what VCF 2 carries, and summing the two gives filter shapes the mode
   * button cannot reach — *"a notch filter can be created ... by summing VCF 1 and VCF 2, then
   * patching the summed output into OD IN"* (p.11, and again as tip 6 on p.21).
   *
   * The mapping itself is printed as three glyph pairs rather than words, so it is **not quoted
   * as a claim anywhere in this file**. What is quoted is the notch recipe, which the manual
   * states twice in prose.
   */
  jack('OUT · VCF 2', 'out', ['audio'], 9, { note: 'The alternate mode; sum with VCF 1 for a notch' }),
  jack('OUT · OVERDRIVE', 'out', ['audio'], 9, { note: 'Max +18 dBu (p.26)' }),
  jack('OUT · VCA', 'out', ['audio'], 9, { note: 'Ahead of the delay, max +18 dBu (p.26)' }),
  jack('OUT · OUTPUT', 'out', ['audio'], 9, {
    note: 'The main output post delay — the same signal as the rear ¼" jack (p.10)',
  }),
  jack('OUT · NOISE', 'out', ['audio'], 9, { note: 'White noise, max +18 dBu (p.26)' }),
  jack('OUT · ENV1', 'out', ['cv'], 9, { note: 'Unipolar: 0 V to +9 V (p.26)' }),
  jack('OUT · ENV2', 'out', ['cv'], 9, { note: 'Unipolar: 0 V to +9 V (p.26)' }),
  jack('OUT · INVERT', 'out', ['audio', 'cv'], 9, { note: 'Inverts signals up to ±9.5 V (p.26)' }),
  jack('OUT · LFO', 'out', ['cv'], 9, { note: 'Bipolar: -5 V to +5 V (p.26)' }),
  jack('OUT · LFO UNI', 'out', ['cv'], 9, { note: 'Unipolar: 0 V to +5 V (p.26)' }),
  jack('OUT · S&H', 'out', ['cv'], 9, { note: 'Tracks the sampled voltage up to 9.5 V (p.26)' }),
  jack('OUT · MULT 1', 'out', ['audio', 'cv', 'gate', 'trigger'], 9, { note: 'Copy of IN · MULT' }),
  jack('OUT · MULT 2', 'out', ['audio', 'cv', 'gate', 'trigger'], 9, {
    note: 'Another copy of IN · MULT',
  }),
  jack('OUT · MIDI GATE', 'out', ['gate'], 9, { note: 'Unipolar: 0 V to +3.3 V (p.26)' }),
  jack('OUT · ATT1', 'out', ['audio', 'cv'], 9, { note: 'Up to ±9.5 V, depending on what arrives' }),
  jack('OUT · ATT2', 'out', ['audio', 'cv'], 9, {
    note: 'Also normalled on to PW1 and PW2, which is where the default PWM comes from (p.21)',
  }),
  jack('OUT · SLEW', 'out', ['audio', 'cv'], 9, { note: 'Up to ±9.5 V, depending on what arrives' }),
  jack('OUT · SUM1', 'out', ['audio', 'cv'], 9, { note: 'SUM1(A) + SUM1(B)' }),
  jack('OUT · SUM2', 'out', ['audio', 'cv'], 9, { note: 'SUM2(A) + SUM2(B)' }),
  jack('OUT · ASSIGN', 'out', ['cv'], 9, {
    note: 'What it carries is set in the SHIFT layer; see ASSIGN SOURCE. Normalled to ATT1 CV',
  }),

  // ---- MIDI and the rear panel (p.8 item 38; p.9 items 101-103, 106) ------
  jack('MIDI IN', 'in', ['midi', 'clock'], 8, {
    clock: ['midi-din'],
    note: 'On the top panel beside VOLUME, not the rear',
  }),
  jack('REAR · MIDI THRU', 'out', ['midi'], 9, {
    note: 'Passes through MIDI data received at MIDI IN; it originates nothing',
  }),
  jack('REAR · INPUT', 'in', ['audio'], 9, { note: 'Mono unbalanced ¼", 100 kΩ (p.25)' }),
  jack('REAR · OUTPUT', 'out', ['audio'], 9, { note: 'Balanced ¼" TRS, max 12 dBu (p.25)' }),
  jack('REAR · PHONES', 'out', ['audio'], 9, {
    note: 'Balanced ¼" TRS with its own level knob; 8 Ω (p.25)',
  }),
] as const

/** Every declared jack id, as a union of literals. `cable()` takes it. */
export type NeutronJack = (typeof JACKS)[number]['id']

/**
 * A cable: two declared jacks, what it does, and whether **the connection itself** is cited.
 *
 * The endpoints need no citation here — `JACKS` above says each socket exists, once, on its own
 * page. What is left in doubt is whether connecting these two is the right move, and unusually
 * for a Behringer document this manual answers that in several places: the ten *Tips and Tricks
 * of the Patch Bay* on p.21 and the three patched *Preset Patches* on p.24 each instruct specific
 * connections in prose. Those carry their page; everything else is taste and renders provisional.
 */
function cable(from: NeutronJack, to: NeutronJack, note: string, page?: number): PatchEntry {
  return { from, to, note, verified: page === undefined ? false : cite(page) }
}

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type Extra = Omit<Partial<AuthoredNumericParam>, 'kind' | 'name' | 'value' | 'range'>

/**
 * A numeric whose **range** is cited and whose **point is not** (§3.2). The specifications state
 * what each control accepts and nothing about where to set it, so `verified: false` sits on every
 * point in this file.
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
 * A knob position on a control whose printed range has a **word at one end**, as percent of
 * travel — the Minitaur's answer to `0 to Self-Oscillation`, and there are four of them here.
 *
 * Both claims are unverified and both render that way: the point is uncited so the guide marks it
 * provisional, and `range.verified` is `false` so mood may not move a figure nobody checked.
 * `% travel` is a fact about a knob anyone can see; it is not a claim that the box displays
 * 0-100.
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

/** A switch or a button state, whose option set is cited and whose selection is taste (§3.2). */
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

/**
 * **`TUNE` and the `RANGE` that says which scale it was read off, emitted together.**
 *
 * The whole point of this helper is that it is impossible to author a tune figure in this file
 * without the switch beside it: p.25 gives the knob two scales (±1 octave under 8'/16'/32',
 * ±10 octaves in full range) and a semitone number is meaningless until you know which. See the
 * header.
 */
function tune(osc: 1 | 2, semitones: number, range: (typeof OSC_RANGES)[number]): AuthoredParam[] {
  const full = range === 'full range'
  return [
    pick(`OSC ${osc} RANGE`, range, OSC_RANGES, 25, {
      note: full
        ? 'All three octave LEDs lit — this is the ±10 octave scale TUNE is read against'
        : 'One octave LED lit — this is the ±1 octave scale TUNE is read against',
    }),
    num(`OSC ${osc} TUNE`, semitones, full ? TUNE_FULL_ST : TUNE_OCTAVE_ST, 25, {
      unit: 'st',
      note: full
        ? 'p.25 gives the full-range scale as +10/-10 octaves, and the oscillators as 0.7 Hz to 55 kHz across four ranges; p.10 says "over 50 kHz" for the same mode'
        : "p.25 gives the 8'/16'/32' scale as +1/-1 octave",
    }),
  ]
}

/** One oscillator, whole: the range and tune pair, then its shape and pulse width. */
function osc(
  n: 1 | 2,
  semitones: number,
  range: (typeof OSC_RANGES)[number],
  shape: (typeof OSC_SHAPES)[number],
  width: number,
): AuthoredParam[] {
  return [
    ...tune(n, semitones, range),
    pick(`OSC ${n} SHAPE`, shape, OSC_SHAPES, 25, {
      hint: 'osc-shape-blend',
      note:
        shape === 'Tone Mod' || shape === 'Square'
          ? 'PULSE WIDTH only affects these two shapes (p.10)'
          : undefined,
    }),
    num(`OSC ${n} WIDTH`, width, PERCENT, 25, { unit: '%' }),
  ]
}

/** The filter, whole. `darkness` lives on FREQ, which is the one knob the whole box bends around. */
function filter(
  mode: (typeof VCF_MODES)[number],
  freqHz: number,
  reso: number,
  keyTrack: 'on' | 'off',
  modDepth: number,
  envDepth: number,
): AuthoredParam[] {
  return [
    pick('VCF MODE', mode, VCF_MODES, 25),
    num('VCF FREQ', freqHz, CUTOFF_HZ, 25, {
      unit: 'Hz',
      // Log control, so a flat offset would be inaudible at the top and slam shut at the bottom.
      mood: [{ axis: 'darkness', amount: -Math.round(freqHz * 0.45) }],
    }),
    num('VCF RESO', reso, ZERO_TEN, 25, {
      mood: [{ axis: 'grit', amount: 2 }],
      note: 'Self-resonates at or near maximum, and plays in tune with KEY TRK on (p.11)',
    }),
    pick('VCF KEY TRK', keyTrack, ON_OFF, 25, {
      note: 'Cutoff follows the last MIDI note received (p.11)',
    }),
    num('VCF MOD DEPTH', modDepth, PERCENT, 25, {
      unit: '%',
      note: 'Depth of the LFO normalled to FREQ MOD; p.11 and p.21 call this knob FILTER DEPTH',
    }),
    num('VCF ENV DEPTH', envDepth, PERCENT, 25, {
      unit: '%',
      note: 'Depth of ENVELOPE 2, which is normalled to the filter (p.12)',
    }),
  ]
}

/** One ADSR. Envelope 1 is normalled to the VCA, envelope 2 to the filter (p.12). */
function env(n: 1 | 2, attack: number, decay: number, sustain: number, release: number): AuthoredParam[] {
  return [
    num(`ENV ${n} A`, attack, ATTACK_MS, 25, { unit: 'ms', note: '300 µs to 5 s, linear attack' }),
    num(`ENV ${n} D`, decay, DECAY_MS, 25, {
      unit: 'ms',
      mood: [{ axis: 'density', amount: -Math.round(decay * 0.35) }],
      note: '2.4 ms to 10 s, exponential decay',
    }),
    num(`ENV ${n} S`, sustain, SUSTAIN_V, 25, { unit: 'V', note: 'A level, given as a voltage' }),
    num(`ENV ${n} R`, release, RELEASE_MS, 25, { unit: 'ms', note: '1.5 ms to 6 s, exponential release' }),
  ]
}

/** The overdrive. `grit` lives on DRIVE, which is what the section is for. */
function overdrive(drive: number, tone: number, level: number): AuthoredParam[] {
  return [
    num('OD DRIVE', drive, DRIVE_RANGE, 25, { mood: [{ axis: 'grit', amount: 3 }] }),
    num('OD TONE', tone, ZERO_TEN, 25, {
      note: 'Left boosts the lows, right thins them and lifts the highs (p.7)',
    }),
    travel('OD LEVEL', level, 'p.25 gives this as "0 dB to -∞" — a named endpoint, so percent of travel'),
  ]
}

/** The bucket-brigade delay. `space` lives on MIX, and nowhere else on this box. */
function delay(timeMs: number, repeats: number, mix: number): AuthoredParam[] {
  return [
    num('DELAY TIME', timeMs, DELAY_MS, 25, {
      unit: 'ms',
      note: 'p.12 gives the low end as 24 ms; the specifications say 25 ms',
    }),
    num('DELAY REPEATS', repeats, PERCENT, 25, {
      unit: '%',
      note: 'Fully right with MIX right, repeats build without end (p.7)',
    }),
    num('DELAY MIX', mix, PERCENT, 25, { unit: '%', mood: [{ axis: 'space', amount: 22 }] }),
  ]
}

/**
 * The LFO, free-running: a shape and a **knob position**, the scale p.25 prints as
 * `0 to 10 (0.01Hz to 10kHz)`.
 */
function lfo(shape: (typeof LFO_SHAPES)[number], rate: number, keySync: 'on' | 'off'): AuthoredParam[] {
  return [
    pick('LFO SHAPE', shape, LFO_SHAPES, 25, {
      hint: 'lfo-shape-blend',
      note: shape === 'Ramp' ? 'p.11 calls this shape Reverse Sawtooth' : undefined,
    }),
    pick('LFO MIDI CLOCK SYNC', 'off', ON_OFF, 13, {
      hint: 'lfo-clock-sync',
      note: 'Off, so the RATE knob is the 0-10 frequency scale rather than a clock division',
    }),
    num('LFO RATE', rate, LFO_RATE, 25, { note: '0.01 Hz to 10 kHz across the travel' }),
    pick('LFO KEY SYNC', keySync, ON_OFF, 25, { note: 'Restarts the LFO phase on each MIDI note' }),
  ]
}

/**
 * The LFO, locked to the incoming clock: a shape and a **division**, from the twenty-one values
 * the same knob travel selects once sync is on (p.13 §5.7).
 *
 * There is deliberately **no `LFO RATE` number here.** See the header: the 0-10 scale is not in
 * force in this mode, so quoting a position on it would be quoting the wrong scale.
 */
function lfoSynced(
  shape: (typeof LFO_SHAPES)[number],
  division: (typeof LFO_DIVISIONS)[number],
  keySync: 'on' | 'off',
): AuthoredParam[] {
  return [
    pick('LFO SHAPE', shape, LFO_SHAPES, 25, {
      hint: 'lfo-shape-blend',
      note: shape === 'Ramp' ? 'p.11 calls this shape Reverse Sawtooth' : undefined,
    }),
    pick('LFO MIDI CLOCK SYNC', 'on', ON_OFF, 13, {
      hint: 'lfo-clock-sync',
      note: 'On, so the RATE knob picks a clock division rather than a frequency',
    }),
    pick('LFO DIVISION', division, LFO_DIVISIONS, 13, {
      note: 'Set by the LFO RATE knob position, anticlockwise 4/1 to clockwise 1/64',
    }),
    pick('LFO KEY SYNC', keySync, ON_OFF, 25, { note: 'Restarts the LFO phase on each MIDI note' }),
  ]
}

/** The three that every recipe sets whatever else it does. */
function output(oscMix: number, noise: number, vcaBias: number, volume: number): AuthoredParam[] {
  return [
    travel('OSC MIX', oscMix, 'p.25 gives this only as a linear blend between OSC 1 and 2, with no scale'),
    num('NOISE', noise, PERCENT, 25, { unit: '%', note: 'White noise injected into the filter (p.7)' }),
    num('VCA BIAS', vcaBias, PERCENT, 25, {
      unit: '%',
      note: 'Opens the VCA without a note — turn it down for a gated part (p.10)',
    }),
    num('VOLUME', volume, PERCENT, 25, { unit: '%' }),
  ]
}

/** The two switches that decide how many notes the patch can sound and how the pair relate. */
function voiceMode(paraphonic: 'on' | 'off', oscSync: 'on' | 'off'): AuthoredParam[] {
  return [
    pick('PARAPHONIC', paraphonic, ON_OFF, 25, {
      note:
        paraphonic === 'on'
          ? 'Two MIDI notes take the two oscillators independently — two notes, not more (p.14)'
          : 'Both oscillators follow one note',
    }),
    pick('OSC SYNC', oscSync, ON_OFF, 25, {
      note: 'OSC 1 restarts the period of OSC 2, so both share a base frequency (p.7)',
    }),
  ]
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * `verified: false` on every recipe below, explicitly rather than by omission.
 *
 * §3.1 makes the recipe citation the default a param inherits when it carries none. p.24's four
 * *Preset Patches* come closest to a cited recipe — they are named sounds with drawn knob
 * positions — but the positions are drawn rather than printed, and reading a pointer angle off a
 * 12 mm knob is estimation whatever the render resolution. So the *cables* those pages instruct
 * carry p.24 and p.21, and the numbers do not.
 */

const recipes: Recipe[] = [
  // ---- Low end -----------------------------------------------------------
  {
    id: 'neutron-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Envelope-swept kick, pitch falling through an attenuator',
    routing: 'Both oscillators tuned low and locked; ENV 2 drives the pitch drop through ATT 1',
    params: [
      ...voiceMode('off', 'on'),
      ...osc(1, -12, "32'", 'Sine', 50),
      ...osc(2, -12, "32'", 'Triangular', 50),
      ...output(35, 0, 0, 80),
      ...filter('low pass', 220, 3, 'off', 0, 30),
      ...env(1, 0.3, 180, 0, 30),
      ...env(2, 0.3, 55, 0, 20),
      ...overdrive(2, 4, 70),
      travel(
        'ATTENUATOR 1',
        12,
        'p.25 gives this as "+4 dB to -∞" — a named endpoint, so percent of travel. Low: a 9 V envelope into a 1 V/octave input is nine octaves',
      ),
    ],
    patch: [
      cable(
        'OUT · ENV2',
        'IN · ATT1 IN',
        'supplies the pitch envelope — ATT 1 IN has no normal, and the attenuator is what keeps 9 V from becoming nine octaves',
      ),
      cable(
        'OUT · ATT1',
        'IN · OSC1+2',
        'supplies pitch modulation to both oscillators at once; OSC1+2 has no normal',
      ),
    ],
  },
  {
    id: 'neutron-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Kick driven into the overdrive, resonance rising with the hit',
    routing: 'The pitch drop as above, plus ENV 2 opening the resonance so the tail bites',
    params: [
      ...voiceMode('off', 'on'),
      ...osc(1, -12, "32'", 'Square', 40),
      ...osc(2, -10, "32'", 'Sawtooth', 50),
      ...output(45, 8, 0, 78),
      ...filter('low pass', 180, 7, 'off', 0, 35),
      ...env(1, 0.3, 200, 0, 40),
      ...env(2, 0.3, 70, 0, 25),
      ...overdrive(8, 3, 55),
      travel('ATTENUATOR 1', 15, 'p.25 gives this as "+4 dB to -∞" — a named endpoint, so percent of travel'),
    ],
    patch: [
      cable('OUT · ENV2', 'IN · ATT1 IN', 'supplies the pitch envelope; ATT 1 IN has no normal'),
      cable('OUT · ATT1', 'IN · OSC1+2', 'supplies pitch modulation to both oscillators'),
      cable(
        'OUT · ENV2',
        'IN · RES',
        'supplies resonance modulation — RES has no normal, so the bite arrives with the hit',
      ),
    ],
  },
  {
    id: 'neutron-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Flat sub, one sine, nothing above the fundamental',
    routing: 'No cables. The normalled path is already the whole part',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, -12, "32'", 'Sine', 50),
      ...osc(2, -12, "32'", 'Sine', 50),
      ...output(0, 0, 0, 88),
      ...filter('low pass', 120, 0, 'off', 0, 0),
      ...env(1, 4, 2000, 8, 120),
      ...env(2, 4, 2000, 0, 60),
      ...overdrive(0, 5, 75),
    ],
  },
  {
    id: 'neutron-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Sub with a fifth over it, both oscillators soft-shaped',
    routing:
      'No cables. A fifth rather than an octave, because ±12 semitones is the whole travel under one octave foot (p.25)',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, -12, "32'", 'Triangular', 50),
      ...osc(2, -5, "32'", 'Sine', 50),
      ...output(50, 0, 0, 85),
      ...filter('low pass', 160, 1, 'off', 0, 10),
      ...env(1, 2, 1500, 7, 90),
      ...env(2, 2, 900, 0, 60),
      ...overdrive(1, 5, 78),
    ],
  },
  {
    id: 'neutron-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Overdriven mid bass, both oscillators a beat apart',
    routing: 'No cables. DRIVE past halfway is where the soft clipping starts adding harmonics',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "16'", 'Sawtooth', 50),
      ...osc(2, 1, "16'", 'Square', 35),
      ...output(50, 0, 0, 76),
      ...filter('low pass', 900, 5, 'on', 0, 45),
      ...env(1, 1, 400, 5, 80),
      ...env(2, 1, 260, 2, 60),
      ...overdrive(7, 6, 60),
    ],
  },
  {
    id: 'neutron-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Resonant sweep with the filter tracking the keyboard',
    routing: 'PORTA TIME does the slides between notes; ENV 2 does the sweep. **Accent:** there is no sequencer and no arpeggiator here \u2014 p.25\u2019s architecture list is exhaustive and p.10 \u00a74.3 has every note arriving from an external keyboard \u2014 so an accented step is played on whatever drives this box, and nothing here stores which steps are accented. **Slide:** `PORTA TIME 120 ms` above, off fully left and growing to the right (p.7), one setting for every note rather than a per-step lane',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "16'", 'Sawtooth', 50),
      ...osc(2, 0, "16'", 'Square', 25),
      ...output(20, 0, 0, 76),
      ...filter('low pass', 600, 8, 'on', 0, 70),
      ...env(1, 1, 300, 3, 40),
      ...env(2, 1, 180, 0, 40),
      ...overdrive(5, 7, 62),
      num('PORTA TIME', 120, PORTA_MS, 25, {
        unit: 'ms',
        note: 'Off fully left; the slide between MIDI notes grows to the right (p.7)',
      }),
    ],
  },
  {
    id: 'neutron-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Acid line squeezed through the overdrive and back into the filter',
    routing: 'VCF 1 into OD IN by cable so the drive sits after a filter that is already screaming. **Accent:** there is no sequencer and no arpeggiator here \u2014 p.25\u2019s architecture list is exhaustive and p.10 \u00a74.3 has every note arriving from an external keyboard \u2014 so an accented step is played on whatever drives this box, and nothing here stores which steps are accented. **Slide:** `PORTA TIME 90 ms` above, off fully left (p.7), one setting for every note rather than a per-step lane',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "16'", 'Sawtooth', 50),
      ...osc(2, -12, "16'", 'Sawtooth', 50),
      ...output(30, 0, 0, 72),
      ...filter('low pass', 450, 9, 'on', 0, 65),
      ...env(1, 1, 260, 2, 35),
      ...env(2, 1, 150, 0, 30),
      ...overdrive(10, 8, 50),
      num('PORTA TIME', 90, PORTA_MS, 25, { unit: 'ms', note: 'Off fully left (p.7)' }),
    ],
    patch: [
      cable(
        'OUT · VCF 2',
        'IN · OD IN',
        'replaces the VCF 1 output normalled into the overdrive — VCF 2 is the mode the button is not showing (p.11)',
      ),
    ],
  },

  // ---- Body and percussion ------------------------------------------------
  {
    id: 'neutron-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Tuned tom, pitch dropping a fourth into the body',
    routing: 'ENV 2 through ATT 1 into the pitch, as the kicks do, with a longer decay',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, -5, "16'", 'Sine', 50),
      ...osc(2, -5, "16'", 'Triangular', 50),
      ...output(30, 6, 0, 78),
      ...filter('low pass', 700, 4, 'off', 0, 30),
      ...env(1, 0.3, 420, 0, 60),
      ...env(2, 0.3, 140, 0, 40),
      ...overdrive(3, 5, 68),
      travel('ATTENUATOR 1', 20, 'p.25 gives this as "+4 dB to -∞" — a named endpoint, so percent of travel'),
    ],
    patch: [
      cable('OUT · ENV2', 'IN · ATT1 IN', 'supplies the pitch envelope; ATT 1 IN has no normal'),
      cable('OUT · ATT1', 'IN · OSC1+2', 'supplies pitch modulation to both oscillators'),
    ],
  },
  {
    id: 'neutron-noise-bright',
    role: 'noise',
    character: 'bright',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Filtered white noise, oscillators out of the mix entirely',
    routing: 'No cables. NOISE up, VCA BIAS down, and the band pass picks the band',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "8'", 'Square', 50),
      ...osc(2, 0, "8'", 'Square', 50),
      ...output(50, 100, 0, 72),
      ...filter('band pass', 4500, 6, 'off', 0, 25),
      ...env(1, 0.3, 60, 0, 20),
      ...env(2, 0.3, 45, 0, 15),
      ...overdrive(1, 8, 70),
    ],
  },
  {
    id: 'neutron-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Sync-and-FM clang, OSC 1 restarting OSC 2 out of tune',
    routing: 'p.21 tip 8: OSC 1 into OSC 2 with OSC SYNC active, which is FM synthesis on this box',
    params: [
      ...voiceMode('off', 'on'),
      ...osc(1, 0, "8'", 'Sawtooth', 50),
      ...osc(2, 7, "8'", 'Square', 30),
      ...output(70, 0, 0, 70),
      ...filter('high pass', 900, 5, 'off', 0, 20),
      ...env(1, 0.3, 120, 0, 45),
      ...env(2, 0.3, 90, 0, 30),
      ...overdrive(4, 9, 62),
    ],
    patch: [
      cable(
        'OUT · OSC 1',
        'IN · OSC 2',
        'the manual’s tip 8: supplies audio-rate FM into a pitch input with OSC SYNC active',
        21,
      ),
    ],
  },

  // ---- Tonal --------------------------------------------------------------
  {
    id: 'neutron-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Single-note lead, delay on and the filter wide',
    routing: 'No cables. The delay is the whole treatment',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "8'", 'Sawtooth', 50),
      ...osc(2, -12, "8'", 'Square', 40),
      ...output(35, 0, 0, 74),
      ...filter('low pass', 6000, 3, 'on', 15, 30),
      ...env(1, 6, 500, 7, 200),
      ...env(2, 6, 350, 3, 150),
      ...overdrive(3, 6, 68),
      ...lfo('Triangle', 3.5, 'on'),
      ...delay(260, 30, 25),
    ],
  },
  {
    id: 'neutron-lead-hard',
    role: 'lead',
    character: 'hard',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Hard mono lead through the overdrive, no delay',
    routing: 'No cables. PORTA TIME short enough to bend rather than slide',
    params: [
      ...voiceMode('off', 'on'),
      ...osc(1, 0, "8'", 'Sawtooth', 50),
      ...osc(2, 0, "8'", 'Sawtooth', 50),
      ...output(50, 0, 0, 72),
      ...filter('low pass', 3500, 6, 'on', 0, 45),
      ...env(1, 1, 350, 6, 90),
      ...env(2, 1, 200, 2, 70),
      ...overdrive(9, 7, 55),
      num('PORTA TIME', 40, PORTA_MS, 25, { unit: 'ms', note: 'Off fully left (p.7)' }),
    ],
  },
  {
    id: 'neutron-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Two-note stab, oscillators taking a note each',
    routing: 'PARAPHONIC on, so two held notes split across the two oscillators (p.5)',
    params: [
      ...voiceMode('on', 'off'),
      ...osc(1, 0, "8'", 'Sawtooth', 50),
      ...osc(2, 0, "8'", 'Sawtooth', 50),
      ...output(50, 0, 0, 74),
      ...filter('low pass', 2600, 5, 'on', 0, 55),
      ...env(1, 0.3, 220, 0, 60),
      ...env(2, 0.3, 130, 0, 40),
      ...overdrive(5, 6, 62),
    ],
  },
  {
    id: 'neutron-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Two-note pad, slow ADSR, delay wide open',
    routing:
      'PARAPHONIC on. The full ADSR is why this box gets a pad and the CRAVE, which has no release stage, does not',
    params: [
      ...voiceMode('on', 'off'),
      ...osc(1, 0, "16'", 'Triangular', 50),
      ...osc(2, 0.5, "16'", 'Sawtooth', 50),
      ...output(50, 0, 12, 70),
      ...filter('low pass', 2200, 2, 'on', 30, 30),
      ...env(1, 900, 2500, 7, 2400),
      ...env(2, 1400, 3000, 4, 1800),
      ...overdrive(1, 5, 72),
      ...lfoSynced('Sine', '1/1', 'off'),
      ...delay(520, 45, 40),
    ],
  },
  {
    id: 'neutron-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Dark two-note pad, filter low and the LFO breathing under it',
    routing: 'LFO into ATT 1, ATT 1 into FREQ MOD — a slower, shallower sweep than MOD DEPTH alone',
    params: [
      ...voiceMode('on', 'off'),
      ...osc(1, -12, "16'", 'Triangular', 50),
      ...osc(2, -11.5, "16'", 'Triangular', 50),
      ...output(50, 0, 10, 70),
      ...filter('low pass', 700, 3, 'off', 0, 25),
      ...env(1, 1200, 3000, 6, 3200),
      ...env(2, 1800, 3500, 3, 2400),
      ...overdrive(0, 3, 74),
      ...lfoSynced('Triangle', '2/1', 'off'),
      travel('ATTENUATOR 1', 30, 'p.25 gives this as "+4 dB to -∞" — a named endpoint, so percent of travel'),
    ],
    patch: [
      cable(
        'OUT · LFO',
        'IN · ATT1 IN',
        'the shape of the manual’s tip 5, sent at the filter instead of the delay: ATT 1 IN has no normal',
      ),
      cable(
        'OUT · ATT1',
        'IN · FREQ MOD',
        'replaces the LFO normalled to FREQ MOD, now attenuated twice so the sweep stays under the note',
      ),
    ],
  },
  {
    id: 'neutron-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Sample-and-hold gliding the cutoff, delay long',
    routing:
      'Two of the manual’s own patches at once — p.21’s tip 1 and p.24’s Quantum Loop — with GLIDE smoothing the steps',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "16'", 'Triangular', 50),
      ...osc(2, 0, "16'", 'Sine', 50),
      ...output(40, 20, 25, 68),
      ...filter('low pass', 1400, 4, 'off', 50, 20),
      ...env(1, 700, 2200, 6, 2000),
      ...env(2, 900, 2400, 3, 1600),
      ...overdrive(0, 5, 72),
      ...delay(600, 55, 45),
      num('S&H RATE', 4.5, SH_RATE_HZ, 25, {
        unit: 'Hz',
        note: 'The knob, or IN · S&H CLOCK if something else is clocking it',
      }),
      num('S&H GLIDE', 260, SH_GLIDE_MS, 25, {
        unit: 'ms',
        note: 'Limits the rate of change between samples, so the steps become a glide (p.12)',
      }),
    ],
    patch: [
      cable(
        'OUT · OSC Mix',
        'IN · S&H IN',
        'the manual’s Quantum Loop patch: replaces the NOISE normalled into the sample & hold, so the steps track the oscillators rather than hiss',
        24,
      ),
      cable(
        'OUT · S&H',
        'IN · FREQ MOD',
        'the manual’s tip 1, and the second half of Quantum Loop: replaces the LFO normalled to FREQ MOD with a random stepped voltage',
        21,
      ),
    ],
  },

  // ---- Transitional -------------------------------------------------------
  {
    id: 'neutron-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Noise riser, the slow attack doing the climb',
    routing: 'ENV 2 into ATT 1 into the pitch, upward this time, over a long attack',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, 0, "8'", 'Sawtooth', 50),
      ...osc(2, 0, "8'", 'Square', 30),
      ...output(60, 55, 0, 70),
      ...filter('band pass', 3000, 7, 'off', 0, 90),
      ...env(1, 2400, 800, 9, 300),
      ...env(2, 3000, 600, 9, 200),
      ...overdrive(3, 8, 62),
      travel('ATTENUATOR 1', 45, 'p.25 gives this as "+4 dB to -∞" — a named endpoint, so percent of travel'),
    ],
    patch: [
      cable('OUT · ENV2', 'IN · ATT1 IN', 'supplies the climb; ATT 1 IN has no normal'),
      cable('OUT · ATT1', 'IN · OSC1+2', 'supplies pitch modulation to both oscillators'),
    ],
  },
  {
    id: 'neutron-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Low impact into a long delay tail',
    routing: 'No cables. The overdrive and the delay carry it after the envelope has gone',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, -24, 'full range', 'Sine', 50),
      ...osc(2, -19, 'full range', 'Triangular', 50),
      ...output(45, 30, 0, 80),
      ...filter('low pass', 400, 5, 'off', 0, 40),
      ...env(1, 0.3, 900, 0, 600),
      ...env(2, 0.3, 300, 0, 200),
      ...overdrive(8, 3, 58),
      ...delay(640, 65, 50),
    ],
  },
  {
    id: 'neutron-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    verified: false,
    patchPolyphony: 1,
    title: 'Slow filter sweep across a held pair of oscillators',
    routing: 'Slew-limited LFO into the cutoff, so the turn at each end is soft',
    params: [
      ...voiceMode('off', 'off'),
      ...osc(1, -12, "16'", 'Sawtooth', 50),
      ...osc(2, -11.5, "16'", 'Sawtooth', 50),
      ...output(50, 15, 40, 68),
      ...filter('low pass', 800, 6, 'off', 60, 20),
      ...env(1, 1800, 4000, 8, 3000),
      ...env(2, 2400, 4000, 6, 2400),
      ...overdrive(2, 4, 68),
      ...lfoSynced('Triangle', '4/1', 'off'),
      num('SLEW', 800, SLEW_MS, 25, {
        unit: 'ms',
        note: 'Limits how fast the voltage may change, which rounds the ends of the sweep (p.8)',
      }),
    ],
    patch: [
      cable('OUT · LFO', 'IN · SLEW IN', 'supplies the sweep; SLEW IN has no normal'),
      cable(
        'OUT · SLEW',
        'IN · FREQ MOD',
        'replaces the LFO normalled to FREQ MOD with the slew-limited copy of itself',
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
 * **`pad` is here where the CRAVE's is deliberately absent**, and the difference is a fact about
 * the boxes rather than a judgement about the part: p.25 gives this one two `ADSR` envelopes
 * where the CRAVE's is `ADS`, so a pad's tail is a knob here and is nothing at all there.
 *
 * `snare`, `clap`, `rim` and the hats are absent for the plainer reason the CRAVE records: this
 * is one voice with one filter and one VCA, and a recipe claiming a noise burst *and* a separate
 * pitched body at once would be claiming two.
 */
const VOICE_ROLES = [
  'kick',
  'sub',
  'bass-mid',
  'tom',
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
  id: 'behringer-neutron',
  name: 'NEUTRON',
  maker: 'Behringer',
  kind: 'semi-modular',

  /**
   * Receives clock, does not claim to send it. §5.7 and §5.12 (p.13) are the receive half in as
   * many words — *"The LFO will sync to the beat when receiving MIDI clock"*, and *"Use this
   * function to sync the LFO to your DAWs MIDI Clock"* over USB. The pages behind the non-claim
   * on the other side are in `capabilityEvidence` below rather than in this sentence (§2.6/#120).
   */
  clock: { canSendClock: false, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  /**
   * `main: 'mono'` — one balanced ¼" TRS output, described on p.4 as a *"Servo balanced mono
   * output"* and specified at max 12 dBu (p.25). `individualOuts: 0` because PHONES is the same
   * signal at a different level. `audioIn` is the rear ¼" INPUT, which p.10 §4.1 and p.25 both
   * describe. `usbAudio: false` — see the evidence below.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * 80 HP at the Eurorack 5.08 mm/HP. p.26's `Dimensions` row gives 424 mm, which is the factory
   * chassis including its end cheeks; the aspect check in `panel.ts` shows the drawn panel is the
   * Eurorack one, and §6 (p.18) is a page on removing the chassis from around it.
   */
  physical: {
    panelSpanMm: NEUTRON_PANEL_SPAN_MM,
    verified: cite(26),
  },

  panel: NEUTRON_PANEL,
  jacks: [...JACKS],

  /**
   * §2.6/#142. **Nothing on this box sets a note's length, because nothing on it holds a
   * pattern.** p.12 §4.9: *"Both envelopes are triggered when a MIDI note is received unless the
   * E.GATE 1/2 inputs are used"*, and p.26 puts the threshold on those inputs at 1.5 V. The
   * envelopes are ADSR, so the sustain holds for as long as the gate does — the length is
   * whatever is playing the box, every time.
   */
  noteDuration: {
    kind: 'gate',
    source: 'the held MIDI note, or a gate at IN · E. GATE1 / IN · E. GATE2',
  },

  /**
   * §8/#65. p.10 §4.3 has the reader *"Connect an external keyboard with MIDI output directly to
   * the Neutron MIDI IN 5-pin DIN type input or via MIDI over USB"*, and p.25's Synthesizer
   * Architecture list — two oscillators, one LFO, one VCF, two envelope generators — is
   * exhaustive with no sequencer or arpeggiator on it.
   */
  patternEntry: {
    kind: 'external',
    reason:
      'it has no sequencer, keyboard or arpeggiator, so every note arrives over MIDI or as a gate and a pitch voltage',
  },

  /**
   * One LFO, syncable, and the destinations are the ones the box reaches **without a cable** —
   * p.21's DEFAULT ROUTINGS table. Everything else the LFO can reach it reaches through the
   * patchbay, which `jacks` already describes; listing those here would be listing the patchbay
   * twice.
   */
  features: {
    lfo: {
      count: 1,
      syncable: true,
      destinations: [
        'VCF frequency, via MOD DEPTH',
        'PULSE WIDTH 1 & 2, via ATTENUATOR 2',
        'MULT 1 and MULT 2, via MULT IN',
      ],
    },
  },

  capabilityEvidence: {
    noteDuration: cite(12),
    patternEntry: cite(10),
    ...JACK_EVIDENCE,

    'clock.canReceiveClock': cite(13),
    /**
     * p.25's Connectivity block names both transports — `MIDI In/Out (soft Thru)  5-pin DIN/ 16
     * channels` and `USB (MIDI)  USB 2.0, type B`. p.13 establishes that clock is *received* and
     * never says over what, so it is the right page for the field above and the wrong one here.
     */
    'clock.transport': cite(25),
    /**
     * `unknown`, and the reason is the whole point of the state: the document does not answer.
     *
     * It answers for the DIN — p.9 item 106 says MIDI THRU *"is used to pass through MIDI data
     * received at the MIDI INPUT"*, which originates nothing — and p.25's Synthesizer
     * Architecture list has no sequencer or clock generator on it. But p.9 item 107 says the USB
     * port is *"capable of sending and receiving MIDI information"* without saying what it sends,
     * and no page anywhere states that this box emits a clock. Read, and the reading ran out.
     */
    'clock.canSendClock': {
      kind: 'unknown',
      reason:
        'p.9 item 106 answers for the DIN — MIDI THRU "is used to pass through MIDI data received at the MIDI INPUT" — and p.25’s Synthesizer Architecture list names no sequencer or clock generator, but item 107 leaves USB open with "capable of sending and receiving MIDI information" and no page states that this box emits clock',
    },
    /**
     * `cited-against`: the manual answers the question and the answer is no. §5.12 (p.13) tells
     * the reader to *"sync the LFO to your DAWs MIDI Clock so the Neutron's LFO plays in time
     * with your song"* and §5.7 has it syncing *to* received clock; p.10 §4.3 sets the box up
     * from an external keyboard. Every arrow in this document points inward.
     */
    'clock.preferredSource': {
      kind: 'cited-against',
      cite: cite(13),
      reason:
        'the manual answers the question and the answer is no: §5.7 has the LFO syncing to received MIDI clock and §5.12 tells the reader to "sync the LFO to your DAWs MIDI Clock so the Neutron’s LFO plays in time with your song", which is a box following a rig rather than setting its tempo, and there is no chapter about driving external gear at all',
    },

    'io.main': cite(25),
    'io.individualOuts': cite(9),
    'io.audioIn': cite(9),
    /**
     * `cited-against`: p.25 heads the row `USB (MIDI)` and the whole USB block gives `Type: Class
     * compliant USB 2.0, type B` with no audio row anywhere in it, and p.9 item 107 calls it *"a
     * class-compliant USB MIDI device"*. The document says what the port is for, and it is not
     * audio.
     */
    'io.usbAudio': {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'the specifications head the row "USB (MIDI)" and the USB block gives only "Class compliant USB 2.0, type B" with no audio row, while p.9 item 107 calls it "a class-compliant USB MIDI device"',
    },

    voices: cite(14),
    'features.lfo': cite(21),
    /**
     * `cited-against`: this box ships no audio content because it holds none. p.25's Synthesizer
     * Architecture list is exhaustive — two V3340 oscillators, one LFO, one filter, two envelope
     * generators, all analog — with no sample memory, no preset store and no factory library on
     * it. p.24's *Preset Patches* are four printed knob drawings for the reader to dial, not
     * anything the box recalls. No recipe here carries `sourceAudio` and none could.
     */
    content: {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'p.25’s Synthesizer Architecture list is exhaustive and entirely analog — 2 x V3340, 1 LFO, 1 VCF, 2 analog envelope generators — with no sample memory, preset store or factory library on it, and p.24’s "Preset Patches" are knob drawings the reader dials rather than anything the box holds',
    },
  },

  manual: { title: 'Neutron User Manual', edition: 'NEUTRON_M_EN' },

  /**
   * **One voice at `polyphony: 2`, and the two are the two oscillators.** p.14 §5.15 is the
   * sentence: *"Note that a Neutron in Paraphonic mode will handle 2 notes."* Two pitches through
   * one filter and one VCA is one assignable, not two — see the header for why every recipe
   * carries `PARAPHONIC` and the monophonic ones carry `patchPolyphony: 1`.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 2 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,

  /**
   * §8.1. Jogs, all five off the Advanced Features table on p.17, which prints an Access and an
   * Action column for every one of them.
   *
   * **The two blend jogs are separate because the box is**, and one jog covering both was wrong.
   * p.17 and p.13 §5.4 agree: an oscillator's blend is reached by holding *that oscillator's*
   * RANGE and then pressing PARAPHONIC, while the LFO's is reached by holding LFO KEY SYNC — not
   * a RANGE button at all, since the LFO section has none. A single hint reading "hold that
   * section's RANGE" named a control the LFO does not have and left out the press that toggles.
   */
  hints: {
    'osc-shape-blend': 'Hold that OSC’s RANGE, press PARAPHONIC',
    'lfo-shape-blend': 'Hold LFO KEY SYNC, press PARAPHONIC',
    'lfo-clock-sync': 'Hold LFO KEY SYNC, then press OSC SYNC',
    'assign-source': 'Hold OSC SYNC, then the RANGE buttons',
    'note-priority': 'Hold OSC SYNC, then press VCF MODE',
  },

  recipes,
}
