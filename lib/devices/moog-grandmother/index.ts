import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  JackSpec,
  PatchEntry,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { GRANDMOTHER_PANEL } from './panel'

/**
 * Moog Grandmother (§2.3) — one monophonic analog voice with **two** oscillators, a 32-note
 * keyboard, an arpeggiator, a 256-step sequencer, a spring reverb tank, and **41 patch points:
 * 21 inputs and 16 outputs plus four parallel-wired mults** (printed p.54).
 *
 * **Source**: `manuals/Grandmother_Manual_Version_2.pdf`, 56 PDF pages. **The printed page number
 * is the PDF page number**, checked against the footer on pp.9, 14, 20, 29, 39 and 54 rather than
 * assumed — unlike the Mother-32, which is offset by one. The document names itself "Grandmother
 * User's Manual" and its file is Version 2; `manual.edition` records that.
 *
 * ---------------------------------------------------------------------------------------------
 * ## What a Grandmother recipe is
 *
 * A patch list plus knob positions (§3.3), like the Mother-32's, with three differences that
 * change what the recipes below can say.
 *
 * **1. Two oscillators, so a recipe has a relationship to state and not just a waveform.** Every
 * voice recipe below sets both OCTAVE switches, both WAVEFORM knobs, and — the load-bearing one —
 * whether `SYNC` is lit, because that is what decides what the FREQUENCY knob does. See the
 * numbers section.
 *
 * **2. The modulation section does nothing until the MOD slider is up, and the manual says so
 * outright.** p.23: "The PITCH AMT, CUTOFF AMT, and PULSE WIDTH AMT knobs are used to specify the
 * maximum amount of modulation to be applied to specific parameters. **In order to actually apply
 * the modulation and hear the effect, the MOD wheel must be set to a greater than minimum
 * position.**" So a recipe that sets `CUTOFF AMT` and stops has printed a value that does
 * nothing, which is #101's complaint in its purest form. Every recipe here that touches an AMT
 * knob also carries `MOD` and says what it is for.
 *
 * **3. Three of this box's most useful modulations need a cable, where the Mother-32's needed
 * none.** There is no normalled envelope-to-pitch switch here: the envelope reaches the filter
 * through `ENVELOPE AMT` on the panel and reaches *anything else* only out of `+ ENV OUT`. A
 * pitch drop on this box is a cable, and the recipes that want one carry it.
 *
 * The cable Moog itself reaches for most often is not one of the recipes' below, and is worth
 * naming for whoever authors the next recipe here: **`ARP/SEQ · KB OUT` into `MODULATION · RATE
 * IN`**, which makes the LFO track the keyboard. p.23's TIP instructs it — "Patching from the KB
 * OUT in the ARP / SEQ section, into the RATE IN jack will cause the LFO to track the pitch of the
 * keyboard just as Oscillator 1 and 2. This will also allow the LFO to exceed the range of the
 * panel RATE control" — p.24 adds that the jack is on the 1 V/oct standard, and **three of the
 * fourteen factory presets use it**: FUNKY ROBOT (p.45), HAUNTED CAVE (p.46) and 3 SAWS (p.51).
 * No recipe below needs it, so none carries it; a fourth `texture` or `metallic` recipe probably
 * should.
 *
 * What *is* normalled is the audio path, and the four cables that break it say which:
 *
 *     MIXER · OSC 1 IN            replaces Oscillator 1 at the mixer            p.40, p.15
 *     MIXER · OSC 2 IN            replaces Oscillator 2 at the mixer            p.40, p.15
 *     MIXER · NOISE IN            replaces the noise generator at the mixer     p.40, p.15
 *     FILTER · INPUT              replaces the MIXER OUTPUT into the ladder     p.41
 *     ENVELOPE · TRIGGER IN       replaces the keyboard / arp / sequencer gate  p.41
 *     OUTPUT · VCA IN             replaces the filter output into the VCA       p.42
 *     OUTPUT · REVERB IN          replaces the VCA output into the reverb       p.42
 *
 * ## Jack ids are qualified by **module**, and the Mother-32's fix is deliberately not copied
 *
 * §3.3 requires section-qualified ids, and this panel needs it badly: `INPUT` and `OUTPUT` are
 * each silkscreened three times (UTILITIES twice, FILTER once), `WAVE OUT` twice, `PITCH IN`
 * twice. The qualifier is the nine module names the panel prints and the patch point index uses
 * as its own headings (pp.39-42) — `ARP/SEQ`, `MODULATION`, `OSCILLATORS`, `MIXER`, `UTILITIES`,
 * `FILTER`, `ENVELOPE`, `OUTPUT`, and on the rear panel `ARP/SEQ CV` and `AUDIO`.
 *
 * The Mother-32 rejected exactly this scheme and qualified on `IN ·` / `OUT ·` instead, because
 * under its chapter headings its pitch input and its gate input fell in different sections and it
 * could never be the *target* of a voice-control cable — for a box whose selling point is being
 * played by other gear. **That reasoning does not transfer, and the difference is hardware.**
 *
 * Under module qualifiers this box forms **one output bundle and no input bundle**, and both are
 * true:
 *
 *  - `ARP/SEQ · KB OUT` (1 V/oct, p.29) pairs with `ARP/SEQ · GATE OUT` in the same module, so
 *    the Grandmother can drive other boxes — which is p.7's own description of it: "a powerful
 *    keyboard front end for expanding a Mother-32, DFAM, or any Eurorack modular system".
 *  - There is **no pitch-and-gate pair to play *into***, and that is a fact about the instrument
 *    rather than about the qualifier. Its pitch inputs are `OSCILLATORS · 1 PITCH IN` and
 *    `OSCILLATORS · 2 PITCH IN` — one per oscillator, each summing with the keyboard (pp.12-13) —
 *    so a single pitch cable moves *one* oscillator and leaves the other on the keyboard's note.
 *    Playing this box from outside takes a mult and three cables, and a two-cable bundle into it
 *    would be wrong on the hardware. `IN ·` / `OUT ·` qualifiers would have manufactured that
 *    bundle out of a naming convention, which is worse than not having one. The pass reports
 *    nothing about a box with no input bundle, so nothing false is printed either.
 *
 * **Every `direction` below is checkable twice, and the second check is off the drawing.** The
 * patch point index's prose is the first: it says outright which points are inputs and which are
 * outputs. The panel figures are the second — this panel silkscreens **output** labels reversed,
 * white on black (`GATE OUT`, `KB OUT`, `WAVE OUT`, `S/H OUT`, `OUTPUT`), and inputs in plain
 * text (`RATE IN`, `SYNC IN`, `PITCH IN`, `PWM IN`). Every direction in this list agrees with both.
 *
 * That convention is **observed, not stated**: nothing in this document explains its own legend,
 * where the Mother-32's p.46 does — "Patch points whose labels are written in standard text are
 * inputs, while patch points whose labels are reversed are outputs." Same convention, same maker,
 * and only one of the two manuals tells you. It is recorded as an observation because that is
 * what it is, and because it is the cheap way to check a forty-one-jack list.
 *
 * `MIDI IN`, `MIDI OUT` and `MIDI THRU` carry no separator, for the Mother-32's reason: they are
 * rear-panel DINs rather than patchbay points, an id with no section pairs with nothing, and a
 * MIDI cable is not a pitch-and-gate bundle.
 *
 * **The USB port is declared as a transport and not as a jack.** It carries clock (see below) but
 * it is a single bidirectional receptacle, and `JackSpec.direction` is one value: declaring it
 * `in` or `out` would be a coin-flip between two true answers. The Tracker Mini's manifest makes
 * the same split for the same reason — a transport does not need a jack.
 *
 * **The four MULT points are declared `out`, and the document is what breaks the tie.** p.25 says
 * they "can be employed either as inputs or outputs", so neither direction is the whole truth and
 * the schema has no third value. p.54's specifications refuse to classify them too, listing "21
 * Inputs / 16 Outputs / 4 Parallel-wired Mults" as three categories — but **p.7 buckets them**,
 * counting the same 41 points as "21 inputs and 20 outputs". That is the manual's own answer, so
 * `out` it is. The cost is real and is not hidden: no recipe below patches *into* a mult, because
 * the type cannot express the cable, and the mult recipes the manual's own TIPs suggest (p.25's
 * two-filter and merge patches) are therefore not authored.
 *
 * **The cost is not hypothetical: Moog's own presets patch into a mult.** `STEPPED DRONE` (p.49)
 * runs the attenuator's output *into* the top-left mult point and takes two cables back out of it,
 * to `OSCILLATORS · 2 PITCH IN` and `FILTER · CUTOFF IN` — a one-to-two fan-out that this manifest
 * cannot express in either direction, because the mult is `out` at both ends of it. A future
 * `direction: 'either'` would be the fix; until then this note is the honest record of what is
 * missing rather than a silence about it.
 *
 * The four are numbered `MULT 1`-`MULT 4`. The panel prints one `MULT` over the cluster and
 * **the four carry no `IN`/`OUT` silkscreen at all** — they are a passive multiple, so the
 * convention above has nothing to say about them and there is no label to read. Ids must be
 * unique, so the numbers are ours and are the one thing in this list that is not silkscreen.
 *
 * ## Clock: symmetric, which is what makes it the Mother-32's opposite
 *
 * The Mother-32 is the box that made `ClockSpec` directional, because it receives over MIDI and
 * sends only as analog pulses. **This box sends and receives over all three of its wires**, so
 * `sendTransport` and `receiveTransport` are omitted — which is what the fields mean when absent,
 * and is worth stating because the two boxes are otherwise so close.
 *
 * *Receive.* p.35's `CLOCK IN` "allows Grandmother to be synchronized to an external clock source
 * such as a DFAM, Mother-32, or any other instrument that outputs clock sync", with the incoming
 * PPQN on the Global Settings page (p.38). p.37's `MIDI CLOCK INPUT` sets whether the arpeggiator
 * and sequencer follow MIDI Clock and MIDI Start/Stop. p.36: "MIDI signals may be sent and
 * received via USB".
 *
 * *Send.* p.35's `CLOCK OUT` "allows Grandmother to transmit clock sync to other instruments
 * based on the ARP / SEQ RATE knob setting, and the Global CLOCK OUTPUT PPQN setting", and the
 * same paragraph ends "**Grandmother can also send Clock information via MIDI**". p.37's `MIDI
 * CLOCK OUTPUT` is the switch for it.
 *
 * `usb` is two printed sentences rather than one, and that is stated rather than glossed: p.36
 * says MIDI is sent and received over USB, p.37 says MIDI Clock is among what is sent and
 * received. Nothing in the document says clock over USB in a single breath.
 *
 * ## Numbers: what this manual prints, and the two that are printed conditionally
 *
 * Three controls have a range in the document:
 *
 *  - `CUTOFF` — p.16, the low-pass filter "begins to attenuate (or reduce) harmonic content, from
 *    10Hz to 20kHz", and p.7's feature list repeats it as "Classic 4-pole 10Hz to 20kHz Ladder
 *    filter". **The panel silkscreens 20Hz, 200Hz, 2kHz and 20kHz**, so the leftmost figure a
 *    reader can find on the knob is 20 and the range authored here starts at 10. Every value
 *    below sits far inside both, so the disagreement never reaches a rendered number — it is
 *    recorded because the next author will find it.
 *  - `MODULATION RATE` — p.23: "The RATE knob sets the frequency of the LFO from .07 Hz to
 *    1.3 kHz." A knob that reaches audio rate, which is why p.24's TECH TIP is about playing it.
 *  - `OSCILLATOR 2 FREQUENCY` — p.12: "This knob detunes Oscillator 2 from Oscillator 1 over a
 *    range of +/- 7 semi-tones." See below; this is the conditional one.
 *
 * `ARP / SEQ RATE`'s 20-280 BPM (p.27) is **authored nowhere**, on the Mother-32's reasoning: it
 * is the internal tempo, the template owns tempo, and the same page says that once the box is
 * synced "the RATE knob selects timing values that are musical subdivisions of this external
 * tempo" — a different parameter wearing the same knob.
 *
 * Everything else on this panel is a knob with a tick ring and no numbers — the three mixer
 * levels, `RESONANCE`, `ENVELOPE AMT`, `ATTACK`, `DECAY`, `SUSTAIN`, `RELEASE`, `VOLUME`, `MIX`,
 * `HIGH PASS`, `ATTENUATOR`, `GLIDE`, and the three modulation AMT knobs — so those are
 * `travel()`, percent of travel, provisional on both claims and deaf to mood.
 *
 * ### `FREQUENCY` is a cited range that is wrong under two conditions, and one of them is not
 * documented anywhere
 *
 * CLAUDE.md's note is about exactly this, and this is the worst case in the library so far.
 * p.12 gives ±7 semitones and then immediately takes it back twice:
 *
 *  - "When the SYNC button is lit … **The range of the FREQUENCY knob is also greatly
 *    increased.**" No figure is given for the increased range.
 *  - "NOTE: The range of the FREQUENCY knob can be specified in the Global Settings." **The
 *    Global Settings chapter (pp.37-38) does not contain it.** Nine settings are documented and
 *    the FREQUENCY range is not among them; p.37 points at moogmusic.com "for information on
 *    advanced Global Settings". So the manual promises a setting it never prints.
 *
 * The fix is CLAUDE.md's: **the recipe carries the switch, so the pairing cannot come apart.**
 * Every recipe that sets `FREQUENCY` also sets `SYNC`, and the two are written by one helper that
 * will not let them separate — `osc2()` emits the cited ±7 semitone range only with `SYNC OFF`,
 * and with `SYNC ON` it emits `travel()` instead, because "greatly increased" is not a number.
 * The undocumented global setting is why even the ±7 figure carries no `verified` point: it is
 * the factory range and the document says so nowhere.
 *
 * ## Per-step, and the lanes this box does not have
 *
 * p.27: "Each step can be entered as a Note or a Rest, and individual steps can also be entered
 * with a Tie and/or an Accent." Three lanes, and p.30 confirms all three off the Left-Hand
 * Controller's shifted buttons — (TIE) on PLAY, (REST) on HOLD, (ACCENT) on TAP. There is no
 * per-step gate length, no per-step glide (GLIDE is one knob for the instrument) and no ratchet:
 * the Mother-32 has all three and this box has none of them, which is the difference between a
 * step sequencer with a step editor and one you play into.
 *
 * **The accent lane goes somewhere unusual and the manual is emphatic about it.** p.30: "The
 * Accent function utilizes a dedicated envelope with a fast attack and release time … This Accent
 * envelope appears at the KB VEL OUT jack (ARP/SEQ module) when the Sequencer is playing only.
 * NOTE: **In order to for Grandmother to reflect this dynamic change, you will need to connect a
 * patch cable from the KB VEL OUT jack (ARP / SEQ module) to the CUTOFF IN jack on the Filter
 * module.**" So an accent on this box is inaudible until a cable is patched, and every recipe here
 * that authors an accent carries that cable and cites the page that instructs it.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by printed page — which is the PDF page on this document. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Grandmother User’s Manual (Version 2), p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared patch point (§3.3). The page is where the manual describes *this jack* — for the
 * front and rear patch points that is the PATCH POINT INDEX, pp.39-42, which describes all
 * forty-one of them and gives each one's impedance and voltage range.
 *
 * Generic in `Id` for the Cascadia's reason: an `(id: string)` signature widens every id the
 * moment it is written, which would make `GrandmotherJack` below `string` and turn `cable()`'s
 * endpoint check into no check at all.
 */
function jack<Id extends string>(
  id: Id,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): JackSpec & { id: Id } {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return {
    id,
    direction,
    signal,
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
    ...(extra.note === undefined ? {} : { note: extra.note }),
  }
}

/**
 * §3.3. All forty-one patch points, plus the two 1/4" audio jacks and the three MIDI DINs.
 *
 * The whole set is declared rather than the subset the recipes reach for: a partial list reads as
 * a claim that the rest do not exist, and p.54 states the complement exactly — 41 points, 21 in,
 * 16 out, 4 mults. The comments are the patch point index's own module headings.
 */
const JACKS = [
  // -- ARP / SEQ MODULE (p.39) -------------------------------------------------------
  jack('ARP/SEQ · GATE OUT', 'out', ['gate'], 39, {
    note: '+8 V gate on each new note from the keyboard, the arpeggiator or the sequencer',
  }),
  jack('ARP/SEQ · KB OUT', 'out', ['pitch-cv'], 39, {
    note: '1 V/oct (p.29), -5 to +5 V — a global setting switches it to 0 to 10 V (p.38)',
  }),
  jack('ARP/SEQ · KB VEL OUT', 'out', ['cv'], 39, {
    note: 'Key velocity, 0 to +5 V; during sequencer playback it carries the accent envelope instead',
  }),

  // -- MODULATION MODULE (p.39) ------------------------------------------------------
  jack('MODULATION · RATE IN', 'in', ['cv'], 39, {
    note: 'Summed with the RATE knob, and on the 1 V/oct standard so the LFO can be played (p.24)',
  }),
  jack('MODULATION · SYNC IN', 'in', ['trigger'], 39, {
    note: 'A rising edge resets the modulation oscillator to the start of its cycle',
  }),
  jack('MODULATION · WAVE OUT', 'out', ['cv'], 39, {
    note: 'The selected waveform at the current rate, 10 V peak to peak, DC coupled',
  }),
  jack('MODULATION · S/H OUT', 'out', ['cv'], 39, {
    note: 'Noise sampled at each zero crossing of the modulation oscillator; nothing routes it internally (p.24)',
  }),

  // -- OSCILLATORS MODULE (pp.39-40) -------------------------------------------------
  jack('OSCILLATORS · 1 WAVE OUT', 'out', ['audio'], 39, {
    note: 'Oscillator 1 at its OCTAVE and WAVEFORM settings, AC coupled',
  }),
  jack('OSCILLATORS · 1 PITCH IN', 'in', ['pitch-cv'], 39, {
    note: 'Summed with the keyboard note — moves Oscillator 1 only',
  }),
  jack('OSCILLATORS · 1 PWM IN', 'in', ['cv'], 39, {
    note: 'Only does anything with SQUARE or NARROW PULSE selected (p.24)',
  }),
  jack('OSCILLATORS · 2 WAVE OUT', 'out', ['audio'], 39, {
    note: 'Oscillator 2 at its OCTAVE, FREQUENCY and WAVEFORM settings and the state of SYNC (p.13)',
  }),
  jack('OSCILLATORS · 2 PITCH IN', 'in', ['pitch-cv'], 40, {
    note: 'Summed with the keyboard note — moves Oscillator 2 only',
  }),
  jack('OSCILLATORS · 2 LIN FM IN', 'in', ['cv'], 40, {
    note: 'Linear FM — "brash, metallic, or bell-like tones" (p.13); takes audio as readily as CV',
  }),

  // -- MIXER MODULE (p.40) -----------------------------------------------------------
  jack('MIXER · OSC 1 IN', 'in', ['audio', 'cv'], 40, {
    note: 'Replaces Oscillator 1 at the mixer; the OSCILLATOR 1 knob then sets this level',
  }),
  jack('MIXER · OSC 2 IN', 'in', ['audio', 'cv'], 40, {
    note: 'Replaces Oscillator 2 at the mixer; the OSCILLATOR 2 knob then sets this level',
  }),
  jack('MIXER · NOISE IN', 'in', ['audio', 'cv'], 40, {
    note: 'Replaces the noise generator at the mixer; the NOISE knob then sets this level',
  }),
  jack('MIXER · OUTPUT', 'out', ['audio'], 40, {
    note: 'All three mixer channels summed, before the ladder filter. DC coupled (p.14)',
  }),

  // -- UTILITIES MODULE (pp.40-41) ---------------------------------------------------
  // Four jacks wired in parallel. `out` per p.7's own bucketing — see the header note.
  jack('UTILITIES · MULT 1', 'out', ['audio', 'cv'], 40, {
    note: 'Four points wired in parallel — one in, up to three out. Merges only AC-coupled audio (p.25)',
  }),
  jack('UTILITIES · MULT 2', 'out', ['audio', 'cv'], 40, {
    note: 'Four points wired in parallel — one in, up to three out. Merges only AC-coupled audio (p.25)',
  }),
  jack('UTILITIES · MULT 3', 'out', ['audio', 'cv'], 40, {
    note: 'Four points wired in parallel — one in, up to three out. Merges only AC-coupled audio (p.25)',
  }),
  jack('UTILITIES · MULT 4', 'out', ['audio', 'cv'], 40, {
    note: 'Four points wired in parallel — one in, up to three out. Merges only AC-coupled audio (p.25)',
  }),
  jack('UTILITIES · HIGH PASS FILTER INPUT', 'in', ['audio'], 40, {
    note: 'The static -6 dB/oct high pass is not in the audio path until something is patched here (p.25)',
  }),
  jack('UTILITIES · HIGH PASS FILTER OUTPUT', 'out', ['audio'], 40, {
    note: '10 V peak to peak, AC coupled',
  }),
  jack('UTILITIES · ATTENUATOR INPUT', 'in', ['cv'], 40, { note: '-8 to +8 V into the bipolar attenuator' }),
  jack('UTILITIES · ATTENUATOR OUTPUT', 'out', ['cv'], 41, {
    note: 'Centre is zero output; with nothing patched in, the input is normalled and this is a -8/+8 V DC source (p.26)',
  }),

  // -- FILTER (LOW PASS FILTER) MODULE (p.41) ----------------------------------------
  jack('FILTER · INPUT', 'in', ['audio'], 41, {
    note: 'Replaces the normalled MIXER OUTPUT into the ladder filter',
  }),
  jack('FILTER · OUTPUT', 'out', ['audio'], 41, {
    note: 'The -24 dB/oct Moog ladder filter, 10 V peak to peak, AC coupled',
  }),
  jack('FILTER · ENV AMT IN', 'in', ['cv'], 41, {
    note: 'Summed with the ENVELOPE AMT knob, -8 to +8 V, DC coupled',
  }),
  jack('FILTER · CUTOFF IN', 'in', ['cv'], 41, {
    note: 'Summed with KBD TRACK, ENVELOPE AMT and the CUTOFF knob',
  }),

  // -- ENVELOPE MODULE (p.41) --------------------------------------------------------
  jack('ENVELOPE · TRIGGER IN', 'in', ['gate', 'trigger'], 41, {
    note: 'Anything over +1.2 V retriggers the envelope (p.20); replaces the normalled keyboard gate',
  }),
  jack('ENVELOPE · + ENV OUT', 'out', ['cv'], 41, {
    note: 'The ADSR shape, 10 V peak to peak, DC coupled — the only way the envelope reaches anything but the filter',
  }),
  jack('ENVELOPE · – ENV OUT', 'out', ['cv'], 41, { note: 'An inverted copy of + ENV OUT' }),

  // -- OUTPUT MODULE (pp.41-42) ------------------------------------------------------
  jack('OUTPUT · VCA AMT IN', 'in', ['cv'], 41, {
    note: 'Multiplied with the current settings in ENV or KB RLS; in DRONE it sets the level outright (p.22)',
  }),
  jack('OUTPUT · VCA IN', 'in', ['audio'], 42, {
    note: 'Replaces the normalled filter output into the amplifier',
  }),
  jack('OUTPUT · REVERB IN', 'in', ['audio'], 42, {
    note: 'Replaces the normalled VCA output into the spring reverb tank',
  }),

  // -- REAR: ARP / SEQ CV PANEL (p.42) -----------------------------------------------
  jack('ARP/SEQ CV · CLOCK IN', 'in', ['clock', 'trigger'], 42, {
    clock: ['analog-clock'],
    note: 'CLOCK or STEP-ADVANCE, chosen in the Global Settings; incoming PPQN is set there too (p.38)',
  }),
  jack('ARP/SEQ CV · ON / OFF IN', 'in', ['gate'], 42, {
    note: 'Over 2.5 V plays the arpeggiator or sequencer, under 2.5 V stops it',
  }),
  jack('ARP/SEQ CV · RESET IN', 'in', ['trigger'], 42, {
    note: 'Over 2.5 V returns to the start of the pattern without stopping',
  }),
  jack('ARP/SEQ CV · CLOCK OUT', 'out', ['clock'], 42, {
    clock: ['analog-clock'],
    note: '0 to +5 V at the ARP / SEQ RATE, at the Global CLOCK OUTPUT PPQN — 2 PPQN from the factory (p.38)',
  }),

  // -- REAR: AUDIO OUT PANEL (pp.34, 42) ---------------------------------------------
  jack('AUDIO · EURORACK OUT', 'out', ['audio'], 42, {
    note: 'The main output at Eurorack level, after REVERB MIX but before VOLUME — so VOLUME does not touch it',
  }),
  jack('AUDIO · REVERB OUT', 'out', ['audio'], 42, {
    note: 'Straight off the spring tank and always 100% wet (p.21), so the reverb can be a standalone processor',
  }),
  jack('AUDIO · MAIN OUT / HEADPHONE OUT', 'out', ['audio'], 34, {
    note: '1/4" TRS — use a TS instrument cable for line level or phase cancellation weakens it (p.54)',
  }),
  jack('AUDIO · INSTRUMENT IN', 'in', ['audio'], 34, {
    note: '1/4", no gain control — a line source needs about 10 V peak to peak to reach the mixer properly',
  }),

  // -- REAR: MIDI (p.36) -------------------------------------------------------------
  /**
   * `['midi', 'clock']` on the two that carry tempo, and the second member is the schema's own
   * implication: a jack with a `clock` transport must carry `clock` in `signal`. `MIDI THRU`
   * passes the input along unchanged and originates nothing, so it claims no transport — and it
   * must not, because two jacks claiming `midi-din` in one direction would leave the rack
   * choosing between them.
   */
  jack('MIDI IN', 'in', ['midi', 'clock'], 36, {
    clock: ['midi-din'],
    note: 'MIDI Clock and Start/Stop are followed or ignored per the Global Settings (p.37)',
  }),
  jack('MIDI OUT', 'out', ['midi', 'clock'], 36, {
    clock: ['midi-din'],
    note: 'Everything originating on this box, MIDI Clock included when the Global Setting sends it (p.37)',
  }),
  jack('MIDI THRU', 'out', ['midi'], 36, { note: 'The MIDI IN signal passed along unchanged' }),
]

/** Every declared jack id, as a union of literals, so `cable()` catches a typo at compile time. */
export type GrandmotherJack = (typeof JACKS)[number]['id']

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A numeric whose **range** the manual prints. The point inside it is taste and says so.
 *
 * `verified: false` is written on the point explicitly rather than left to inherit, for the
 * Mother-32's reason: the recipes here carry `verified: false` too, so it changes nothing today,
 * and the day one of them gains a default citation an omitted point would silently claim the
 * manual prints this knob position.
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
 * A knob position on a control with **no printed scale**, as percent of travel.
 *
 * Both claims are unverified and both render as such: the point is uncited so the guide marks it
 * provisional (§3.2), and `range.verified` is explicitly `false` so mood is not allowed to move
 * it. `% travel` is a fact about a knob anyone can see; it is emphatically not a claim that the
 * box displays 0-100.
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

/**
 * A cable: two declared jacks, what it does, and whether *the connection itself* is cited.
 *
 * The endpoints carry no citation and need none — `JACKS` says each socket exists, once, on its
 * own page. What is left for the entry to claim is the only thing in doubt: whether connecting
 * these two is the right move (§3.3/#49). Most of what follows is taste, so it is `false`; the
 * cables the manual's own TIPs and NOTEs instruct carry the page that instructs them.
 */
function cable(
  from: GrandmotherJack,
  to: GrandmotherJack,
  note: string,
  instructedOn?: number,
): PatchEntry {
  return { from, to, note, verified: instructedOn === undefined ? false : cite(instructedOn) }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/** p.11: "The choices are 32', 16', 8', and 4'." p.12 for Oscillator 2's own four. */
const OSC1_OCTAVE = ["32'", "16'", "8'", "4'"] as const
const OSC2_OCTAVE = ["16'", "8'", "4'", "2'"] as const

/** pp.11-12: "The choices are Triangle, Saw, Square, and Narrow Pulse", described on pp.13-14. */
const OSC_WAVE = ['TRIANGLE', 'SAW', 'SQUARE', 'NARROW PULSE'] as const

/** p.11's SYNC button. Lit or not, and p.12 says the FREQUENCY knob's range moves with it. */
const SYNC = ['OFF', 'ON'] as const

/** p.23: "The choices are Sine, Sawtooth, Ramp, and Square." */
const MOD_WAVE = ['SINE', 'SAWTOOTH', 'RAMP', 'SQUARE'] as const

/** p.17, and the panel's own three positions under the switch. 1:1 is 1 V/oct. */
const KBD_TRACK = ['1:2', 'OFF', '1:1'] as const

/** p.21's three VCA modes, each with its own paragraph. */
const VCA_MODE = ['ENV', 'KB RLS', 'DRONE'] as const

/** p.27's ARP / SEQ switches. The third does two jobs, which is why its values are bare. */
const ARP_MODE = ['ARP', 'SEQ', 'REC'] as const
const DIRECTION = ['ORDR', 'FWD / BKWD', 'RNDM'] as const
const OCT_SEQ = ['1', '2', '3'] as const

// ---------------------------------------------------------------------------
// Ranges the manual prints
// ---------------------------------------------------------------------------

/**
 * p.16: the ladder filter "begins to attenuate (or reduce) harmonic content, from 10Hz to 20kHz",
 * repeated at p.7. The panel's own decade marks start at 20 Hz — see the header note.
 */
const CUTOFF_HZ = { min: 10, max: 20000 }

/** p.23: "The RATE knob sets the frequency of the LFO from .07 Hz to 1.3 kHz." */
const MOD_HZ = { min: 0.07, max: 1300 }

/** p.12: "detunes Oscillator 2 from Oscillator 1 over a range of +/- 7 semi-tones" — SYNC off. */
const DETUNE_ST = { min: -7, max: 7 }

// ---------------------------------------------------------------------------
// Parameter blocks
// ---------------------------------------------------------------------------

/** Oscillator 1: the octave switch and the waveform knob, which is all it has. */
function osc1(octave: (typeof OSC1_OCTAVE)[number], wave: (typeof OSC_WAVE)[number]): AuthoredParam[] {
  return [
    pick('OSCILLATOR 1 OCTAVE', octave, OSC1_OCTAVE, cite(11)),
    pick('OSCILLATOR 1 WAVEFORM', wave, OSC_WAVE, cite(11)),
  ]
}

/**
 * Oscillator 2, and **the one helper in this file that exists to stop two values coming apart.**
 *
 * `SYNC` and `FREQUENCY` are emitted together, always, and the sync state decides which kind of
 * parameter `FREQUENCY` is: with SYNC off it is a detune in semitones inside p.12's cited ±7,
 * and with SYNC on p.12 says only that the range "is greatly increased", so it becomes percent of
 * travel. A `FREQUENCY 4 st` printed beside a lit SYNC button would be a number read off a scale
 * that is not in force — CLAUDE.md's rule, and the reason the two cannot be set separately here.
 */
function osc2(opts: {
  octave: (typeof OSC2_OCTAVE)[number]
  wave: (typeof OSC_WAVE)[number]
  sync: (typeof SYNC)[number]
  /** Semitones when `sync` is `OFF`, percent of travel when it is `ON`. */
  frequency: number
  detuneGrit?: number
}): AuthoredParam[] {
  return [
    pick('OSCILLATOR 2 OCTAVE', opts.octave, OSC2_OCTAVE, cite(12)),
    pick('OSCILLATOR 2 WAVEFORM', opts.wave, OSC_WAVE, cite(12)),
    pick('SYNC', opts.sync, SYNC, cite(11), {
      ...(opts.sync === 'ON'
        ? { note: 'Lit, so FREQUENCY varies the sync timbre rather than the tuning, over a range p.12 does not print' }
        : {}),
    }),
    opts.sync === 'OFF'
      ? num('OSCILLATOR 2 FREQUENCY', opts.frequency, DETUNE_ST, cite(12), {
          unit: 'st',
          hint: 'detune-centre',
          ...(opts.detuneGrit === undefined
            ? {}
            : { mood: [{ axis: 'grit', amount: opts.detuneGrit }] }),
        })
      : travel('OSCILLATOR 2 FREQUENCY', opts.frequency, {
          note: 'With SYNC lit this sets the sync timbre; the manual prints no scale for it',
        }),
  ]
}

/** The three mixer levels. All three overdrive past 1 o'clock and the manual says so three times. */
function mixer(osc1Level: number, osc2Level: number, noise: number): AuthoredParam[] {
  return [
    travel('OSCILLATOR 1', osc1Level, { hint: 'mixer-drive' }),
    travel('OSCILLATOR 2', osc2Level),
    travel('NOISE', noise),
  ]
}

/** The ladder filter. `CUTOFF` is the one control on this panel mood is allowed to move. */
function filter(opts: {
  cutoff: number
  darkness: number
  resonance: number
  envAmt: number
  track: (typeof KBD_TRACK)[number]
}): AuthoredParam[] {
  return [
    num('CUTOFF', opts.cutoff, CUTOFF_HZ, cite(16), {
      unit: 'Hz',
      mood: [{ axis: 'darkness', amount: opts.darkness }],
    }),
    travel('RESONANCE', opts.resonance, { hint: 'self-oscillate' }),
    travel('ENVELOPE AMT', opts.envAmt, { hint: 'bipolar-centre' }),
    pick('KBD TRACK', opts.track, KBD_TRACK, cite(17)),
  ]
}

/**
 * The envelope and the amplifier. Four stages, and SUSTAIN is a level rather than a time —
 * p.19: "While the Attack, Decay, and Release parameters deal with time, the Sustain parameter
 * controls level." It is also the one fader in this module, which is why the panel draws it as
 * one.
 */
function env(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  vca: (typeof VCA_MODE)[number],
): AuthoredParam[] {
  return [
    travel('ATTACK', attack),
    travel('DECAY', decay),
    travel('SUSTAIN', sustain),
    travel('RELEASE', release),
    pick('VCA MODE', vca, VCA_MODE, cite(21), {
      ...(vca === 'DRONE'
        ? { note: 'DRONE holds the amplifier open, so the part sounds without a key held' }
        : {}),
      ...(vca === 'KB RLS'
        ? { note: 'Instant attack at full sustain while held, then the RELEASE time' }
        : {}),
    }),
  ]
}

/** The output stage. `MIX` is the spring tank, and it is the only effect on this instrument. */
function out(volume: number, reverb: number): AuthoredParam[] {
  return [travel('VOLUME', volume), travel('MIX', reverb, { hint: 'reverb-wet' })]
}

/**
 * The modulation section. **`MOD` is not optional here** — p.23 says the three AMT knobs do
 * nothing until the MOD slider is off its minimum, so a block that set an amount and left the
 * slider unstated would print a value with no effect. See the header.
 */
function mod(opts: {
  rate: number
  wave: (typeof MOD_WAVE)[number]
  pitchAmt?: number
  cutoffAmt?: number
  pulseWidthAmt?: number
  wheel: number
}): AuthoredParam[] {
  return [
    num('MODULATION RATE', opts.rate, MOD_HZ, cite(23), { unit: 'Hz' }),
    pick('MODULATION WAVEFORM', opts.wave, MOD_WAVE, cite(23)),
    ...(opts.pitchAmt === undefined ? [] : [travel('PITCH AMT', opts.pitchAmt)]),
    ...(opts.cutoffAmt === undefined ? [] : [travel('CUTOFF AMT', opts.cutoffAmt)]),
    ...(opts.pulseWidthAmt === undefined
      ? []
      : [
          travel('PULSE WIDTH AMT', opts.pulseWidthAmt, {
            note: 'Only reaches an oscillator whose WAVEFORM is SQUARE or NARROW PULSE (p.24)',
          }),
        ]),
    travel('MOD', opts.wheel, { hint: 'mod-gate' }),
  ]
}

/**
 * GLIDE, one knob for the whole instrument rather than a per-step lane. No printed time range:
 * p.10 says only that "the GLIDE knob sets the amount of time needed to complete this transition"
 * and that raising it lengthens the glide.
 *
 * `legato` reaches a mode that is not on the panel at all, and **the manual names the button for
 * it twice, differently.** p.10: "continue to press the **HOLD** button while turning the GLIDE
 * knob to the right"; p.33: "hold the **SHIFT** button and turn the GLIDE knob to the right".
 * Those are the same button — the middle Left-Hand Controller button is silkscreened `[SHIFT]`
 * above and `HOLD` below (see `panel.ts`, where all three are measured) — so the two pages agree
 * and the hint can say so in one gesture. Both pages recommend it for the same thing, which is
 * why exactly one recipe here uses it: "Legato glide is useful when creating acid-style
 * sequences."
 */
function glide(value: number, legato = false): AuthoredParam {
  return travel('GLIDE', value, legato ? { hint: 'legato-glide' } : {})
}

/** The arpeggiator's three switches, for the recipes that are about the arpeggiator. */
function arp(
  direction: (typeof DIRECTION)[number],
  octaves: (typeof OCT_SEQ)[number],
): AuthoredParam[] {
  return [
    pick('MODE', 'ARP', ARP_MODE, cite(27)),
    pick('DIRECTION', direction, DIRECTION, cite(28)),
    pick('OCT / SEQ', octaves, OCT_SEQ, cite(28), {
      note: 'In ARP this is how many octaves the pattern repeats over; in SEQ it chooses the sequence file',
    }),
  ]
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * How this box is driven, said once per recipe. It has a keyboard, an arpeggiator and a
 * sequencer, and it can be played over MIDI — but it cannot usefully be played from a single
 * pitch-and-gate pair, for the reason in the header, so the sentence says what it does say.
 */
const PLAYED =
  'Played from its own 32-note keyboard, from the arpeggiator or the 256-step sequencer, or over MIDI IN'

/**
 * The accent cable, which p.30 instructs in as many words. Used by every accented recipe.
 *
 * A function rather than one shared object: `PatchEntry` is plain data and nothing mutates it
 * today, but eight recipes aliasing one literal is a shape that only has to be wrong once.
 */
const accentCable = (): PatchEntry =>
  cable(
    'ARP/SEQ · KB VEL OUT',
    'FILTER · CUTOFF IN',
    'Makes a sequencer accent audible — the accent envelope only exists at this jack',
    30,
  )

/**
 * `verified: false` on every recipe, explicitly rather than by omission. §3.1 makes the recipe
 * citation the default a param inherits when it carries none, and nothing here cites a *recipe*.
 *
 * The fourteen factory presets on pp.45-51 are the nearest thing the document has, and they are
 * **filled-in patch sheets**: a pointer angle drawn on each knob, cables drawn between jacks, and
 * a name. The names are real evidence and `VOICE_ROLES` above uses them. The angles are not — a
 * pointer read off a drawing and converted through a printed scale is a measurement of a picture,
 * and putting a page number beside it would make it look like a value Moog printed. So the chain
 * terminates here, and saying so is what stops an omitted citation from quietly meaning something
 * one day.
 */
const RECIPES: Recipe[] = [
  // ---- low --------------------------------------------------------------------------
  {
    id: 'gm-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'Kick with the envelope cabled to Oscillator 1’s pitch',
    routing: `${PLAYED}. Two cables: + ENV OUT to OSCILLATORS 1 PITCH IN for the drop — there is no normalled envelope-to-pitch route on this box — and KB VEL OUT to CUTOFF IN, without which p.30 says the accent is inaudible`,
    params: [
      ...osc1("32'", 'TRIANGLE'),
      ...osc2({ octave: "16'", wave: 'TRIANGLE', sync: 'OFF', frequency: 0 }),
      ...mixer(82, 0, 0),
      ...filter({ cutoff: 120, darkness: -40, resonance: 30, envAmt: 66, track: 'OFF' }),
      ...env(0, 14, 0, 12, 'ENV'),
      ...out(78, 0),
      glide(0),
    ],
    patch: [
      cable(
        'ENVELOPE · + ENV OUT',
        'OSCILLATORS · 1 PITCH IN',
        'The pitch drop — a short DECAY makes it a click, a longer one a boom',
      ),
      accentCable(),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'gm-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Sub from both triangles an octave apart, filter almost shut',
    routing: `${PLAYED}. No cable — the mixer, the ladder filter and the amplifier are all normalled`,
    params: [
      ...osc1("32'", 'TRIANGLE'),
      ...osc2({ octave: "16'", wave: 'TRIANGLE', sync: 'OFF', frequency: 0 }),
      ...mixer(72, 58, 0),
      ...filter({ cutoff: 180, darkness: -55, resonance: 12, envAmt: 0, track: 'OFF' }),
      ...env(4, 30, 92, 22, 'ENV'),
      ...out(74, 0),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'gm-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Two saws detuned into an overdriven mixer',
    routing: `${PLAYED}. No cable. The dirt is the mixer: p.14 and p.15 both say settings above 1 o'clock impart gentle distortion, and higher settings more`,
    params: [
      ...osc1("16'", 'SAW'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 3, detuneGrit: 3 }),
      ...mixer(92, 88, 0),
      ...filter({ cutoff: 900, darkness: -30, resonance: 34, envAmt: 40, track: '1:2' }),
      ...env(0, 42, 44, 26, 'ENV'),
      ...out(70, 8),
      glide(6),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    patch: [accentCable()],
    verified: false,
  },
  {
    id: 'gm-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    title: 'Acid line: one saw, resonance near self-oscillation, envelope on the cutoff',
    routing: `${PLAYED}. One cable, and it is the one p.30 instructs: KB VEL OUT to CUTOFF IN, so an accented step opens the filter further than an unaccented one`,
    params: [
      ...osc1("8'", 'SAW'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 0 }),
      ...mixer(84, 0, 0),
      ...filter({ cutoff: 1200, darkness: -35, resonance: 78, envAmt: 74, track: '1:1' }),
      ...env(0, 22, 6, 18, 'ENV'),
      ...out(70, 6),
      glide(18, true),
    ],
    patch: [accentCable()],
    /**
     * Both halves of the idiom, on the two lanes p.27 declares. The accent is the one every
     * accented recipe here carries, with the cable p.30 instructs; the tie is what makes the
     * slide happen, because this box's glide is one knob rather than a lane and only *reaches*
     * a note that overlaps the one before it. p.10 and p.33 name the legato mode this recipe
     * already sets, and the manual's own words for what it is for are "Legato glide is useful
     * when creating acid-style sequences" — so the tie is the missing per-step half of an
     * instruction the manual gives whole.
     */
    articulation: [
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      { slot: 'offbeat', set: { tie: true }, hint: 'tie-step' },
    ],
    verified: false,
  },

  // ---- backbeat ---------------------------------------------------------------------
  {
    id: 'gm-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'voice',
    title: 'Snare: noise over a short mid tone, both through the ladder',
    routing: `${PLAYED}. No cable. Noise is one of the three normalled mixer channels, so the body and the crack share one filter and one envelope`,
    params: [
      ...osc1("8'", 'TRIANGLE'),
      ...osc2({ octave: "4'", wave: 'SQUARE', sync: 'OFF', frequency: 5 }),
      ...mixer(46, 30, 88),
      ...filter({ cutoff: 2400, darkness: -25, resonance: 44, envAmt: 30, track: 'OFF' }),
      ...env(0, 16, 0, 14, 'ENV'),
      ...out(74, 12),
      glide(0),
    ],
    articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
    patch: [accentCable()],
    verified: false,
  },

  // ---- metal ------------------------------------------------------------------------
  {
    id: 'gm-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'voice',
    title: 'Hard sync, and FREQUENCY as a timbre knob rather than a tuning one',
    routing: `${PLAYED}. No cable. p.11: "Sync is useful for creating sharp, metallic, and flange-like sounds"`,
    params: [
      ...osc1("8'", 'SAW'),
      ...osc2({ octave: "4'", wave: 'SAW', sync: 'ON', frequency: 64 }),
      ...mixer(30, 88, 0),
      ...filter({ cutoff: 4800, darkness: -20, resonance: 22, envAmt: 34, track: '1:1' }),
      ...env(0, 26, 18, 20, 'ENV'),
      ...out(70, 14),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'gm-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'voice',
    title: 'Linear FM from Oscillator 1 into Oscillator 2',
    routing: `${PLAYED}. One cable: OSCILLATORS 1 WAVE OUT to OSCILLATORS 2 LIN FM IN. p.13 calls linear FM here "brash, metallic, or bell-like"`,
    params: [
      ...osc1("8'", 'TRIANGLE'),
      ...osc2({ octave: "4'", wave: 'TRIANGLE', sync: 'OFF', frequency: -5, detuneGrit: 4 }),
      ...mixer(0, 90, 0),
      ...filter({ cutoff: 3200, darkness: -25, resonance: 30, envAmt: 28, track: '1:1' }),
      ...env(2, 34, 10, 26, 'ENV'),
      ...out(68, 22),
      glide(0),
    ],
    patch: [
      cable(
        'OSCILLATORS · 1 WAVE OUT',
        'OSCILLATORS · 2 LIN FM IN',
        'Oscillator 1 is the modulator, so its level in the mixer is down and only Oscillator 2 is heard',
      ),
    ],
    verified: false,
  },

  // ---- body -------------------------------------------------------------------------
  {
    id: 'gm-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'voice',
    title: 'Tom: one triangle, envelope to pitch, a touch of noise for the skin',
    routing: `${PLAYED}. Two cables, the same pair as the kick's: + ENV OUT to OSCILLATORS 1 PITCH IN, shorter and shallower, and KB VEL OUT to CUTOFF IN for the accent (p.30)`,
    params: [
      ...osc1("16'", 'TRIANGLE'),
      ...osc2({ octave: "8'", wave: 'TRIANGLE', sync: 'OFF', frequency: 2 }),
      ...mixer(80, 22, 18),
      ...filter({ cutoff: 700, darkness: -30, resonance: 38, envAmt: 32, track: 'OFF' }),
      ...env(0, 24, 0, 20, 'ENV'),
      ...out(74, 10),
      glide(0),
    ],
    patch: [
      cable('ENVELOPE · + ENV OUT', 'OSCILLATORS · 1 PITCH IN', 'The pitch fall that makes it a tom and not a click'),
      accentCable(),
    ],
    articulation: [{ slot: 'fill', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'gm-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    title: 'Noise alone, filtered hard and driven into the mixer',
    routing: `${PLAYED}. No cable — the noise generator is normalled to its own mixer channel`,
    params: [
      ...osc1("8'", 'SAW'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 0 }),
      ...mixer(0, 0, 96),
      ...filter({ cutoff: 3600, darkness: -30, resonance: 56, envAmt: 24, track: 'OFF' }),
      ...env(0, 30, 24, 26, 'ENV'),
      ...out(66, 16),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'gm-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Sample and hold stepping the cutoff, into the spring tank',
    routing: `${PLAYED}. One cable: S/H OUT to CUTOFF IN. p.24 is explicit that nothing routes the sample-and-hold internally, so without the cable this recipe is silent motion`,
    params: [
      ...osc1("16'", 'TRIANGLE'),
      ...osc2({ octave: "8'", wave: 'TRIANGLE', sync: 'OFF', frequency: 4, detuneGrit: 2 }),
      ...mixer(64, 60, 14),
      ...filter({ cutoff: 1400, darkness: -30, resonance: 46, envAmt: 0, track: 'OFF' }),
      ...env(56, 60, 88, 82, 'DRONE'),
      ...out(62, 68),
      ...mod({ rate: 2.2, wave: 'SQUARE', wheel: 0 }),
      glide(40),
    ],
    patch: [
      cable(
        'MODULATION · S/H OUT',
        'FILTER · CUTOFF IN',
        'Random steps on the cutoff at the modulation rate; nothing routes S/H internally',
      ),
    ],
    verified: false,
  },

  // ---- tonal ------------------------------------------------------------------------
  {
    id: 'gm-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    title: 'Pad: slow attack, sustain held, spring reverb well up',
    routing: `${PLAYED}. No cable. Every voice here is monophonic, so a chord is stacked by hand or by holding the arpeggiator`,
    params: [
      ...osc1("16'", 'TRIANGLE'),
      ...osc2({ octave: "8'", wave: 'TRIANGLE', sync: 'OFF', frequency: 3, detuneGrit: 2 }),
      ...mixer(66, 62, 6),
      ...filter({ cutoff: 1600, darkness: -35, resonance: 20, envAmt: 22, track: '1:2' }),
      ...env(62, 50, 90, 78, 'ENV'),
      ...out(66, 62),
      ...mod({ rate: 0.4, wave: 'SINE', cutoffAmt: 30, wheel: 45 }),
      glide(24),
    ],
    verified: false,
  },
  {
    id: 'gm-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    title: 'Dark pad: saws an octave down, cutoff low, no modulation at all',
    routing: `${PLAYED}. No cable`,
    params: [
      ...osc1("32'", 'SAW'),
      ...osc2({ octave: "16'", wave: 'SAW', sync: 'OFF', frequency: -4, detuneGrit: 2 }),
      ...mixer(70, 66, 0),
      ...filter({ cutoff: 620, darkness: -45, resonance: 26, envAmt: 14, track: '1:2' }),
      ...env(48, 56, 86, 84, 'ENV'),
      ...out(66, 54),
      glide(30),
    ],
    verified: false,
  },
  {
    id: 'gm-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'Lead: narrow pulse over a saw, glide on, cutoff tracking the keyboard',
    routing: `${PLAYED}. No cable`,
    params: [
      ...osc1("8'", 'NARROW PULSE'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 2 }),
      ...mixer(76, 58, 0),
      ...filter({ cutoff: 3800, darkness: -25, resonance: 32, envAmt: 30, track: '1:1' }),
      ...env(6, 38, 70, 34, 'ENV'),
      ...out(72, 24),
      ...mod({ rate: 5.2, wave: 'SINE', pitchAmt: 18, wheel: 30 }),
      glide(34),
    ],
    verified: false,
  },
  {
    id: 'gm-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    title: 'Stab: everything short, KB RLS so the tail is the release and nothing else',
    routing: `${PLAYED}. No cable. p.21's KB RLS gives an instant attack at full sustain while the key is held, then the RELEASE time`,
    params: [
      ...osc1("8'", 'SQUARE'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: -3, detuneGrit: 3 }),
      ...mixer(80, 72, 0),
      ...filter({ cutoff: 2200, darkness: -30, resonance: 40, envAmt: 46, track: '1:2' }),
      ...env(0, 20, 62, 16, 'KB RLS'),
      ...out(74, 18),
      glide(0),
    ],
    articulation: [{ slot: 'offbeat', set: { accent: true }, hint: 'accent-step' }],
    patch: [accentCable()],
    verified: false,
  },
  {
    id: 'gm-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'voice',
    title: 'Arpeggio over two octaves, in the order the notes were held',
    routing: `${PLAYED}, with MODE on ARP. Hold the notes and press PLAY; HOLD keeps the pattern running once your hand is off (p.30)`,
    params: [
      ...osc1("8'", 'SQUARE'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 2 }),
      ...mixer(74, 54, 0),
      ...filter({ cutoff: 3000, darkness: -25, resonance: 34, envAmt: 38, track: '1:1' }),
      ...env(0, 26, 30, 22, 'ENV'),
      ...out(70, 26),
      ...arp('ORDR', '2'),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'gm-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'voice',
    title: 'Arpeggio, one octave, forward and back, triangles only',
    routing: `${PLAYED}, with MODE on ARP and DIRECTION on FWD / BKWD`,
    params: [
      ...osc1("8'", 'TRIANGLE'),
      ...osc2({ octave: "8'", wave: 'TRIANGLE', sync: 'OFF', frequency: 0 }),
      ...mixer(70, 52, 0),
      ...filter({ cutoff: 2600, darkness: -20, resonance: 14, envAmt: 20, track: '1:1' }),
      ...env(4, 30, 26, 26, 'ENV'),
      ...out(68, 34),
      ...arp('FWD / BKWD', '1'),
      glide(0),
    ],
    verified: false,
  },

  // ---- transitional (§4.2) ----------------------------------------------------------
  {
    id: 'gm-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    title: 'Riser: the modulation oscillator on the pitch, rate climbing under your hand',
    routing: `${PLAYED}. No cable — PITCH AMT reaches both oscillators from the panel. Raise MOD as the section builds; p.23 is explicit that nothing happens until it is off its minimum`,
    params: [
      ...osc1("8'", 'SAW'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 4, detuneGrit: 3 }),
      ...mixer(76, 70, 12),
      ...filter({ cutoff: 5200, darkness: -20, resonance: 50, envAmt: 0, track: 'OFF' }),
      ...env(70, 40, 94, 60, 'DRONE'),
      ...out(64, 46),
      ...mod({ rate: 8.5, wave: 'SAWTOOTH', pitchAmt: 62, cutoffAmt: 44, wheel: 70 }),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'gm-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'Impact: noise and both oscillators at once into the spring tank',
    routing: `${PLAYED}. No cable. The tank is what makes it an impact rather than a hit — p.21's MIX at maximum leaves only the reverb`,
    params: [
      ...osc1("32'", 'SAW'),
      ...osc2({ octave: "16'", wave: 'NARROW PULSE', sync: 'OFF', frequency: -6, detuneGrit: 4 }),
      ...mixer(88, 84, 76),
      ...filter({ cutoff: 1800, darkness: -35, resonance: 48, envAmt: 52, track: 'OFF' }),
      ...env(0, 46, 0, 70, 'ENV'),
      ...out(78, 84),
      glide(0),
    ],
    articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
    patch: [accentCable()],
    verified: false,
  },
  {
    id: 'gm-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    title: 'Sweep: the high pass patched in front of the ladder, so both ends close',
    routing: `${PLAYED}. Two cables, and they are p.15's own TIP: MIXER OUTPUT to the HIGH PASS FILTER INPUT, then its OUTPUT to the FILTER INPUT — "Now you have two filters for sculpting sounds"`,
    params: [
      ...osc1("16'", 'SAW'),
      ...osc2({ octave: "8'", wave: 'SAW', sync: 'OFF', frequency: 5, detuneGrit: 3 }),
      ...mixer(72, 68, 30),
      travel('HIGH PASS', 46, { note: 'Static -6 dB/oct, and only in the path because it is patched (p.25)' }),
      ...filter({ cutoff: 900, darkness: -50, resonance: 42, envAmt: 0, track: 'OFF' }),
      ...env(64, 50, 92, 76, 'DRONE'),
      ...out(64, 58),
      ...mod({ rate: 0.2, wave: 'RAMP', cutoffAmt: 56, wheel: 60 }),
      glide(0),
    ],
    patch: [
      cable('MIXER · OUTPUT', 'UTILITIES · HIGH PASS FILTER INPUT', 'Takes the mixer out of the normalled path', 15),
      cable('UTILITIES · HIGH PASS FILTER OUTPUT', 'FILTER · INPUT', 'Puts it back, one filter later', 15),
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/**
 * **One voice.** p.54's specifications read `POLYPHONY: Monophonic`, and that sentence is the
 * whole basis for `polyphony: 1` — not an inference from the two oscillators, which are one
 * voice's two oscillators and not two voices.
 *
 * `pad` and `stab` are declared anyway, and both have recipes. A Grandmother pad is a real sound;
 * it is a one-note one. Declaring the role is what makes a three-note request report the
 * *shortfall* ("needs 3 notes") instead of the much stronger "nothing in your rig plays this
 * part" — the Mother-32's reasoning, on a box with the same polyphony and a longer tail.
 *
 * **`arp` is declared here where the Mother-32's manifest reasons its way out of it**, and the
 * difference is hardware rather than judgement. That box has a 32-step sequencer and no
 * arpeggiator, and its manifest says so. This one has both: p.27's "The Arpeggiator takes the
 * notes being held on the keyboard, and plays them one at a time in a repeating, rhythmic
 * pattern", with a DIRECTION switch and an octave-span switch of its own (p.28).
 *
 * **The four percussion roles are this library's claim and not Moog's, and the preset list is why
 * that has to be said.** The Mother-32's manifest gives itself `snare` on the strength of a
 * factory patch: Moog printed `METAL SNARE` in that manual, so the role is not a claim the library
 * is making on its own. **That argument does not transfer.** The fourteen factory presets here
 * (pp.45-51) are FUNKY ROBOT, SHOWDOWN GUITAR, DYNASTY PLUCKS, HAUNTED CAVE, ULTRA SUB BASS,
 * CAVERN STRINGS, J-BASS, AUTO ZAP BASS, STEPPED DRONE, CYCLICAL PATTERNS, BAG PIPES, PIANO BASS,
 * LIFT OFF and 3 SAWS — **not one of them is a drum.** Moog authored no percussion on this
 * instrument.
 *
 * `kick`, `snare`, `tom` and `impact` are declared anyway, on the hardware and on nothing else,
 * and the hardware is not in doubt: two oscillators and a white noise channel through one ladder
 * filter and one four-stage envelope, with `+ ENV OUT` available to cable onto either oscillator's
 * pitch. That is a kick, and the recipes below build one. It is worth contrasting with the CRAVE,
 * whose manifest reasons its way *out* of `snare` — its envelope is `ADS` with no release at all,
 * where this one has a sustain level, a release stage and three VCA modes (p.21).
 *
 * What the preset list does ground is the tonal half, and it grounds it well: four of the fourteen
 * are basses, which is `sub` and `bass-mid`; CAVERN STRINGS, HAUNTED CAVE and BAG PIPES are `pad`
 * and `texture`; DYNASTY PLUCKS, SHOWDOWN GUITAR and 3 SAWS are `lead` and `stab`; STEPPED DRONE
 * and CYCLICAL PATTERNS are what an arpeggiator and a sequencer are for; and LIFT OFF is a riser.
 */
const VOICE_ROLES: Role[] = [
  'kick',
  'sub',
  'bass-mid',
  'snare',
  'tom',
  'noise',
  'metallic',
  'texture',
  'pad',
  'lead',
  'stab',
  'arp',
  'acid',
  'riser',
  'impact',
  'sweep',
]

/**
 * Roles this box is **not** offered for, since a list invites the question. `vox-chop` — no
 * sampler and no audio memory of any kind. `clap`, `rim`, `ghost-perc`, `closed-hat`, `open-hat`,
 * `ride` — one monophonic voice with one envelope cannot hold a hat part and anything else at
 * once, and the noise source that would make them is the one `noise`, `snare` and `texture`
 * already claim.
 */

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'moog-grandmother',
  name: 'Grandmother',
  maker: 'Moog',
  kind: 'semi-modular',

  /**
   * **Sends and receives on all three of its wires**, which is what makes this box the
   * Mother-32's opposite and the reason `sendTransport` and `receiveTransport` are omitted: they
   * mean "all of `transport`" when absent, and here that is true.
   *
   * *Receive.* p.35's `CLOCK IN` "allows Grandmother to be synchronized to an external clock
   * source such as a DFAM, Mother-32, or any other instrument that outputs clock sync", in either
   * CLOCK or STEP-ADVANCE mode (p.38). p.37's `MIDI CLOCK INPUT` chooses among following MIDI
   * Clock with Start/Stop, following the clock only, and ignoring both.
   *
   * *Send.* p.35's `CLOCK OUT` "allows Grandmother to transmit clock sync to other instruments
   * based on the ARP / SEQ RATE knob setting, and the Global CLOCK OUTPUT PPQN setting", and the
   * same paragraph closes "Grandmother can also send Clock information via MIDI". p.37's `MIDI
   * CLOCK OUTPUT` is the switch.
   *
   * `usb` rests on two sentences rather than one — p.36's "MIDI signals may be sent and received
   * via USB" and p.37's MIDI Clock settings — and that is stated here rather than glossed.
   *
   * `preferredSource` is **not** claimed. See `capabilityEvidence` below (§2.6/#120).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    /**
     * §7.4/#104. **MIDI clock leaves only if a global setting says so, and p.37 prints no
     * default for it** — the one setting on that page which does not. So a reader told to sync
     * the rig to this box over MIDI has to be told where the switch is, or gets silence.
     *
     * Both MIDI transports take the same setting because there is one setting: p.37's option list
     * is about MIDI Clock, not about a port, and p.36 says MIDI goes out over both the DIN and
     * USB. The analog `CLOCK OUT` needs nothing switched on and so declares nothing — its PPQN
     * default of 2 (p.38) is the analog-clock convention and is on the jack's own note.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'GLOBAL SETTINGS > MIDI CLOCK OUTPUT (A#0)',
        value: 'SEND MIDI CLOCK + MIDI START/STOP COMMANDS (F0)',
        note: 'Global Settings opens on HOLD + SYNC held together until SYNC blinks; press SYNC to exit',
      },
      {
        transport: 'usb',
        path: 'GLOBAL SETTINGS > MIDI CLOCK OUTPUT (A#0)',
        value: 'SEND MIDI CLOCK + MIDI START/STOP COMMANDS (F0)',
        note: 'One setting covers both MIDI ports; p.36 sends and receives MIDI over USB as well as the DINs',
      },
    ],
  },

  /**
   * Rear panel, pp.34-36: one 1/4" TRS `MAIN OUT / HEADPHONE OUT`, one 1/4" `INSTRUMENT IN`, and
   * two 3.5 mm outputs — `EURORACK OUT`, which duplicates the main output at Eurorack level, and
   * `REVERB OUT`, which is the spring tank alone. One output pair, so `mono`.
   *
   * `individualOuts: 0` — `EURORACK OUT` is the same signal at another level and `REVERB OUT` is
   * an effect send, so neither is a channel per part, and this box carries one part in any case.
   * `audioIn: true` is `INSTRUMENT IN` (p.34), which p.7 calls out as the point of the box's other
   * job: "an ideal analog audio processor for external sound sources". `usbAudio: false` — p.36's
   * USB is MIDI only.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 584.2 mm across, from p.54's DIMS row — **the imperial figure, because the metric one on
   * the same line is a digit transposition of it.** 23" is 58.42 cm; the line prints 54.82 cm,
   * while the depth and height on either side of it convert exactly. p.7's plan view measures an
   * aspect of 1.638, against 1.614 for 584.2 x 361.9 and 1.515 for 548.2 x 361.9, and its
   * keyboard decodes to 19 white keys on a 23.81 mm pitch — full size, as p.54's `32 Full-Size
   * Keys` requires, and not the 22.3 mm the narrower span would give. `panel.ts` carries the
   * working.
   *
   * This is the fourth stated dimension in the library to mean something other than it appears
   * to, and the *second* case of an imperial/metric pair that disagrees — the Subsequent 37 has
   * one too, and there it was the **imperial** half that was wrong. The lesson is not which
   * column to trust; it is that only the drawing settles it.
   */
  physical: {
    panelSpanMm: 584.2,
    verified: cite(54),
  },

  /** §10. A simplified original drawing of the panel, off p.52 scaled onto p.7 (see `panel.ts`). */
  panel: GRANDMOTHER_PANEL,

  /** §3.3. Declared once, cited once, referenced by every cable above. */
  /**
   * §10/#263. **Warm-up**, cited. p.6, in the same words Moog use for the Matriarch: *"should be allowed 10-15 minutes to warm
   * up"*. Two boxes, one house style, and both ranges are printed rather than shared by assumption.
   *
   * The rig is what makes this worth carrying: a reader sees which of the boxes in front of them
   * need the time, and no single manual can tell them that.
   */
  warmUp: {
    note: '10 to 15 minutes from cold before it holds pitch',
    minutes: { min: 10, max: 15 },
    verified: cite(6),
  },

  jacks: JACKS,

  /**
   * §2.6/#22. Every jack above, cited on the page that describes it, plus the facts that are not
   * jacks.
   *
   * **`clock.preferredSource` is `unknown`, and the sentence that looks like its evidence is
   * named here rather than left for the next reader to rediscover.** p.7's overview ends: "In
   * addition to its standalone function, Grandmother is also an ideal analog audio processor for
   * external sound sources, and a powerful keyboard front end for expanding a Mother-32, DFAM, or
   * any Eurorack modular system." That is a sentence about this box's place in a rig, and it is
   * the strongest such sentence in any Moog manual in this library — stronger than the p.9
   * paragraph the Mother-32's manifest weighs and rejects.
   *
   * It still falls on the other side, and the reason is what the sentence is *about*. A "keyboard
   * front end" is about notes: the thing it says this box supplies to a Mother-32 is what leaves
   * `KB OUT` and `GATE OUT`, and that claim is already carried — it is why this box forms an
   * output bundle and drives voice control. p.38's LOCAL OFF is the same claim again, in the same
   * terms: "Grandmother's Keyboard, PITCH wheel, and Arpeggiator are only transmitted through the
   * KB OUT, GATE OUT, KB VELOCITY OUT jacks, and MIDI". Neither says anything about tempo, and
   * `preferredSource` is a claim about tempo.
   *
   * The concrete clock facts all point at a socket rather than at a job, and §7.4 rules that out
   * explicitly: `CLOCK OUT` transmits sync (p.35), `MIDI CLOCK OUTPUT` can send it (p.37), and
   * `CLOCK OUTPUT PPQN` sets its resolution (p.38) — which is what a `canSendClock` page says and
   * no more. There is no chapter about clocking external gear and no table-of-contents entry for
   * one.
   *
   * So `unknown` — read, and the document does not answer *this* question — and not
   * `cited-against`, which is for a document that answers no. The library's two
   * `preferredSource: true` claims stay the two dedicated transports, which is what the field is
   * for.
   *
   * `features.sidechain.*` is the other reading: this box takes external audio at `INSTRUMENT IN`
   * and none of its sixteen outputs is an envelope follower or a rectifier, so nothing on it can
   * derive a control voltage from an incoming signal and duck to it.
   */
  /**
   * §2.6/#142. **A sequencer step is a note, a rest or a tie, and none of the three is a
   * length.** p.27 enumerates it rather than leaving it to be inferred: *"Each step can be
   * entered as a Note or a Rest, and individual steps can also be entered with a Tie and/or an
   * Accent."* The ARP/SEQ panel drawn beside that sentence carries RATE, MODE, DIRECTION and
   * OCT/SEQ — there is no gate-length control on it, and a guide that named one would send
   * somebody hunting the front of a Grandmother for a knob Moog did not put there.
   *
   * p.30 is what a tie *does*: *"a tie is used to string two individual notes together
   * musically"*, and the note beneath it — *"if the same note is tied together multiple times in
   * a row, it will be heard during playback as if that one note is being held continuously."*
   * Both pages, because the claim needs the absence and the gesture and neither page has both.
   *
   * **The manual does not say what proportion of a step the sequencer's gate occupies**, and
   * nothing here pretends otherwise. p.29's GATE OUT is about the jack, not about a value.
   */
  noteDuration: { kind: 'tied-steps', control: 'TIE' },

  capabilityEvidence: {
    noteDuration: { kind: 'manual', source: 'Moog Grandmother User’s Manual (Version 2), p.27, p.30' },
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.7’s overview calls this box "a powerful keyboard front end for expanding a Mother-32, DFAM, or any Eurorack modular system", and p.38’s LOCAL OFF says the same thing in the same terms — but both are about the notes it supplies, which leave KB OUT and GATE OUT and are already carried as an output bundle, rather than about the tempo the rig runs on. Everything concrete points at a socket instead: CLOCK OUT transmits sync (p.35), MIDI CLOCK OUTPUT can send it (p.37), CLOCK OUTPUT PPQN sets its resolution (p.38), and §7.4 does not admit a canSendClock page here. There is no chapter about clocking external gear and no table-of-contents entry for one, so no page states what this box is for in a rig’s tempo topology',
    },
    'clock.sourceSetup[midi-din]': cite(37),
    'clock.sourceSetup[usb]': cite(37),
    voices: cite(54),
    'features.perStep': cite(27),
    'features.lfo': cite(23),
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at INSTRUMENT IN (p.34) and none of its sixteen outputs is an envelope follower or a rectifier, so nothing here can derive a control voltage from an incoming signal and duck to it — but no page states that either way, so this is a reading of the jack list rather than an answer the document gives',
    },
  },

  /** One voice, monophonic per p.54. See `VOICE_ROLES` above for what it is offered for. */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 1 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,

  /**
   * **`perStep` is three lanes and the manual names exactly three.** p.27: "Each step can be
   * entered as a Note or a Rest, and individual steps can also be entered with a Tie and/or an
   * Accent", and p.30 gives each one a shifted button on the Left-Hand Controller — (TIE) on
   * PLAY, (REST) on HOLD, (ACCENT) on TAP.
   *
   * **There is no gate-length lane, no per-step glide and no ratchet**, and that is the difference
   * between this sequencer and the Mother-32's, which has all three. GLIDE here is one knob on the
   * Left-Hand Controller for the whole instrument, and nothing in the document makes it per-step.
   *
   * **`lfo` counts one, and it *is* resettable but does not sync.** p.23 gives it one RATE knob
   * reaching 1.3 kHz and four waveshapes; p.24's `SYNC IN` "will reset the LFO wave to its
   * starting point" on a gate or trigger. That is a phase reset, not a tempo lock — nothing in
   * the document divides or multiplies the clock into it — so `syncable` is `false` and the reset
   * lives on the jack, where it is a cable a recipe can carry. The destinations are the three the
   * panel's AMT knobs reach without a cable, and p.23 names them: the pitch of both oscillators,
   * the cutoff, and the pulse width.
   *
   * **`sidechain` is not declared.** See `capabilityEvidence` above.
   */
  features: {
    perStep: ['rest', 'tie', 'accent'],
    lfo: {
      count: 1,
      syncable: false,
      destinations: ['frequency', 'filter-cutoff', 'pulse-width'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'global-settings': 'Hold HOLD + SYNC until SYNC blinks',
    'mod-gate': 'The AMT knobs do nothing until MOD is up',
    'accent-step': 'REC mode, then TAP adds an accent',
    'rest-step': 'REC mode, then HOLD adds a rest',
    'tie-step': 'REC mode, then PLAY adds a tie',
    'self-oscillate': 'Past 3 o’clock the ladder self-oscillates',
    'detune-centre': '12 o’clock is unison with Oscillator 1',
    'bipolar-centre': '12 o’clock is off; either way from there',
    'mixer-drive': 'Past 1 o’clock the mixer starts to overdrive',
    'reverb-wet': 'Fully clockwise is reverb only, no dry',
    'kb-octave': 'Hold SHIFT, then ◄ KB or KB ►',
    'fine-rate': 'Hold SHIFT while turning MODULATION RATE',
    'legato-glide': 'Hold SHIFT, turn GLIDE right for legato',
    'tap-tempo': 'Tap three times; hold a second to exit',
  },

  manual: { title: 'Grandmother User’s Manual', edition: 'Version 2' },

  productPage: 'https://www.moogmusic.com/synthesizers/grandmother/',

  recipes: RECIPES,
}
