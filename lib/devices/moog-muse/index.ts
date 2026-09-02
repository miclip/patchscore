import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset, NumericRange, ParamScope } from '../../core/params'
import { MUSE_PANEL } from './panel'

/**
 * Moog Muse (§2.3). Two analog oscillators and a third modulation oscillator per voice, a ring
 * modulator, noise, two ladder filters, two envelopes, three LFOs, a stereo Diffusion Delay —
 * and **eight analog voices split across two independent timbres**.
 *
 * ## The claim this manifest turns on: two assignables, not one, and not eight
 *
 * p.116: `POLYPHONY  8 Voices`, and `SYNTHESIZER TYPE  Polyphonic, Bi-timbral Analog
 * Synthesizer`. p.8 says what bi-timbral buys: *"each patch is bi-timbral, with two completely
 * independent synthesizer timbres capable of being split across the keyboard, stacked and layered
 * together, and having voices allocated to either timbre via the Voice Control module."*
 *
 * That is the whole modelling decision, and it lands **between** the two answers the library
 * already had.
 *
 * **It is not the minilogue xd's answer (one assignable).** That box's four voices share one set
 * of knob positions, so they are capacity inside a part and can never be two parts. The Muse's two
 * timbres are two complete patches — two filter settings, two envelopes, two oscillator pairs —
 * and p.110 closes it: `MULTI MODE (OFF/ON. DEFAULT: ON)`, *"allowing Muse's two timbres to be
 * controlled independently via external MIDI control. If ON, messages at MIDI CHANNEL IN will
 * control TIMBRE A of Muse while TIMBRE B will be independently controlled via messages at MULTI
 * IN B CHANNEL."* In a rig driven over MIDI — which is every rig this generator describes — the
 * Muse plays **two parts at once, on two channels, by default.** Declaring one assignable would
 * throw that away and let the guide use half an instrument.
 *
 * **It is not eight assignables either.** There is no per-voice patch; a voice is not a part.
 *
 * So: **a `pool` of two timbres**, which is also what makes the recipes below eighteen rather
 * than thirty-six. Recipe lookup keys on `poolId ?? voiceId` (§2.2), so one recipe serves either
 * ordinal — and the two timbres genuinely are fungible for the purpose of choosing a sound. The
 * one asymmetry the manual states is positional, not tonal: under `SPLIT`, *"TIMBRE A will always
 * be to the left of the split point and TIMBRE B to the right"* (p.106), and `SWAP TIMBRE
 * SETTINGS` exists to exchange them. Either timbre can be any sound.
 *
 * ## `polyphony: 4`, and why that is the honest number rather than 8
 *
 * The eight voices are **shared**, and the engine has no vocabulary for a pool of assignables
 * drawing on one budget. Two assignables of 8 would claim sixteen notes this box cannot sound.
 * Two of 4 claim eight, which is exactly what it has.
 *
 * The manual authorises the split precisely. p.106: `TIMBRE A VOICE COUNT` and `TIMBRE B VOICE
 * COUNT`, with *"The Voice Count settings for TIMBRE A and B will move with respect to each other
 * and always sum to eight to avoid voice stealing conflicts. If 6 voices are allocated for TIMBRE
 * A then 2 will be allocated for TIMBRE B, etc."* Four and four is the even division of that
 * eight, and p.105 says the same thing from the other side: engaging `STACK` *"also reduces
 * available polyphony by half"*.
 *
 * **This under-claims a single-timbre patch and does so deliberately.** One timbre alone can have
 * all eight. But a number the resolver reads has to hold whatever the other timbre is doing, and
 * four is the count that is true no matter what lands on the other one. Every recipe carries
 * `TIMBRE A VOICE COUNT 4` as a param so the reader sets the box to the split the guide assumed.
 *
 * ## `patchPolyphony`: MONO is cited, UNISON is not, and they are not treated alike
 *
 * §12.4/#85. `Assignable.polyphony` is a fact about the box; what a patch spends is a fact about
 * the patch. Two VOICE CONTROL buttons bear on it and **the manual is precise about one and silent
 * about the other**:
 *
 *  - **`MONO`** (p.105), in full: *"Enables mono mode on the currently selected timbre, which will
 *    restrict the timbre to operating in a monophonic mode. Only one voice will be used at a time
 *    and polyphonic playing will be disabled."* That is `patchPolyphony: 1`, stated outright, and
 *    every `sub` and `bass-mid` recipe here carries it.
 *  - **`UNISON`** (p.105), in full: *"Enables unison mode on the currently selected timbre, which
 *    will stack any currently unused voices on top of the active ones."* **That is not a mono
 *    mode and must not be modelled as one.** It stacks whatever is spare, so one note gets the
 *    lot and four notes get one each — the thickness is dynamic and the polyphony is unchanged.
 *    No recipe here claims `patchPolyphony` on the strength of UNISON, and the two that use it
 *    (`stab`) leave the count alone, which is what the sentence says.
 *
 * The MIDI implementation agrees and is worth naming because it is the check: `108 Voice Unison`
 * and `109 Voice Mono` are both `0-63 off/ 64-127 on` (p.122). There is **no unison-count
 * parameter anywhere on this instrument** — not on the panel, not in the VOICE CONTROL MORE menu
 * (p.106, four entries, none of them a count), not in the CC table. An authored "8-voice unison"
 * would be an invention.
 *
 * **`UNISON` and `MONO` together are undocumented**, so no recipe engages both. p.41 treats them
 * as alternatives (*"when operating Muse in either UNISON or MONO mode"*) and nothing states what
 * the pair does. That is a gap, and it is left as one.
 *
 * ## The scale problem, and the decision taken
 *
 * **This panel prints almost no numbers.** Sweeping the modules end to end, the manual gives a
 * printed scale for `FREQUENCY` (±7 semitones, p.27 and p.116), `OCTAVE` (`16' 8' 4' 2'`, p.28),
 * the waveform and mode option lists, `TEMPO` (30–300 BPM, p.65), and the MORE-menu settings —
 * and for **nothing else**. There is no Hz figure for either filter cutoff, no dB/oct slope, no
 * time unit of any kind for any envelope stage, no scale on any mixer fader, no delay time.
 * Every one of those is described by behaviour and by knob position.
 *
 * The one place Moog publishes a numeric range per named parameter is **Appendix A: MIDI CC,
 * pp.120-122**, a three-column `MIDI CC | MUSE CONTROL | RANGE` table in which every row is
 * populated. So that is the scale used here for every control the panel does not number, cited to
 * the page its CC row is printed on (CC 1-37 on p.120, 39-75 on p.121, 76-116 on p.122).
 *
 * **Two alternatives were considered and rejected, and the reasons matter more than the choice.**
 *
 *  - *Percent.* The instrument's own screens are in percent throughout, and p.19 authors a patch
 *    in it — *"ATTACK set to 0%, DECAY 25%, SUSTAIN 90%, and RELEASE set around 35%"*, which is
 *    the only place the manual prints envelope values at all. But `0-100%` is never printed as a
 *    range **for these controls**, so authoring against it would be inventing a bound and calling
 *    it cited. Invariant 5 forbids exactly that. The p.19 figures are recorded here rather than
 *    used, so a later author is not tempted to mix the two scales.
 *  - *Omitting the controls.* That would leave a synthesizer manifest with an octave switch and a
 *    waveform list, which is not a device.
 *
 * **`0-127` is a real claim and a narrow one, and the narrowness is the point.** It says the
 * parameter's *value space* is what CC `n` addresses — checkable by anyone holding the document.
 * It says nothing about where to set the knob, which is why every point below is
 * `verified: false`, and it says nothing about how far round the knob any value sits.
 *
 * **That second silence is easy to fill by accident and must not be.** An earlier draft had every
 * value read *"the panel is unmarked, so by hand this is 58% of the control's travel"*, which
 * quietly asserts a linear map between CC value and rotation. No page states one, and on an analog
 * instrument it is usually false — a filter cutoff is normally tapered. So each value is stated as
 * the instruction that is actually documented, `Send MIDI CC 67 = 74`, followed by the gap left
 * open rather than papered: there is no printed knob position for it.
 *
 * This is why `RECIEVE CC` is in `midiSetup()`. p.111 gives it as `(ON/OFF. DEFAULT: OFF)`, so a
 * box straight out of the case ignores every one of those instructions until it is switched on.
 *
 * ## Controls whose scale a switch replaces, and where each is pinned
 *
 * `CLAUDE.md`'s rule: where a manual prints more than one scale for a control, the recipe carries
 * the switch, so the pairing cannot come apart. Six on this box, and each is solved at the point
 * the switch is chosen rather than by a note asking the reader to be careful.
 *
 *  - **`FILTER 1 CUTOFF` / `RESONANCE` / `ENVELOPE AMOUNT`** become *spacing* controls when
 *    `LINK FILTERS` is engaged — the panel prints `(SPACING)` under the knob — and which of three
 *    spacing behaviours applies is then `LINK MODE (CUTOFF, INV CUTOFF, ALL KNOBS. DEFAULT:
 *    CUTOFF)` (p.37). **Every recipe here sets `LINK FILTERS` to `OFF` and says so**, which makes
 *    all three absolute and makes `LINK MODE` irrelevant. Noon on that knob means two completely
 *    different things across that switch, so the switch travels with the value.
 *  - **`FILTER 1 CUTOFF` again**: `HIGH PASS` reverses which side of the knob is open. p.19 is
 *    explicit — *"Keep FILTER 1 completely open (which in the case of a HIGHPASS filter means the
 *    CUTOFF knob is fully counterclockwise)"*. `HIGH PASS` is a param on every recipe.
 *  - **`FM AMOUNT`** has no intrinsic scale at all: what the knob sweeps is set by `2>1 FM MIN
 *    AMT` / `2>1 FM MAX AMT` / `1>2 FM MIN AMT` / `1>2 FM MAX AMT`, each `(0-100)` (p.29), and
 *    p.28 notes the limits may be inverted. Recipes using FM carry the pair for the direction
 *    they engage.
 *  - **`MOD OSC FREQUENCY`** has two printed scales chosen by the `AUDIO` button (p.30) — off is
 *    *"sub-audio frequencies to around 1kHz"*, on is *"around 20Hz … to around 3 kHz"*. Both are
 *    hedged with "around" and the lower bound of the first is not a figure at all, so neither is
 *    usable as a range; the CC scale is, and `AUDIO` is carried beside it so the pitch is never
 *    read off the wrong one.
 *  - **`OVERLOAD`** has two ranges selected by `OVERLOAD RANGE (LOW, HIGH. DEFAULT: LOW)` (p.34)
 *    and **neither is quantified anywhere**. It is the one numeric here with an uncited range —
 *    which makes it mood-inert by §3.1, correctly, because a mood offset would be moving a value
 *    along a scale nobody has printed. `OVERLOAD RANGE` is carried with it regardless.
 *  - **`LFO RATE`** is `0.01 Hz–40.00 Hz` by default and jumps to unprinted clock divisions when
 *    `SYNC` is on (p.52, p.57). Every recipe sets `SYNC` to `OFF`, which puts the Hz scale in
 *    force and lets the cited range be the real one.
 *
 * ## What is left out, and why
 *
 * **The 64-step sequencer and the MOD MAP.** Patterns are template-owned (§4.3), so no recipe
 * carries step hits; and a 16-slot modulation matrix per timbre with a 34-entry source list, a
 * 33-entry controller list, an 18-entry function list and a 69-entry destination list
 * (pp.98-102) is a patch language, not a parameter. The `ASSIGN` buttons that write into it are
 * likewise absent.
 *
 * **`VELO AMT` and the three envelope `CURVE` settings.** p.40 gives the curves as *"ranging from
 * 100% logarithmic, through linear, to 100% exponential"* and prints no default; `VELO AMT` is the
 * one MORE-menu entry on the page with no parenthetical range at all. Both are real controls with
 * no statable bound.
 *
 * **`PAN SPREAD` in `EVEN` mode.** The manual contradicts itself over which knob sets the width —
 * p.43 says `PAN SPREAD`, p.44 says *"controlled by the PAN knob setting"*. Every recipe here
 * leaves `PAN SPRD MODE` at its printed default `L/R` (p.44), where the two pages agree.
 *
 * **The `G MOD EDIT` soft button**, which repoints the envelope and LFO panel controls at the two
 * global generators (p.40, p.53). It is a transient editing mode with no indication but a flashing
 * MORE button, not a stored panel position, so it is described here rather than carried on
 * eighteen recipes — but it is why an envelope fader can appear not to do what the guide says.
 *
 * ## Clock: both directions, and the two are not the same set of wires
 *
 * `CLOCK SOURCE (AUTO, INTERNAL, ANALOG, MIDI IN, USB. DEFAULT: AUTO)` (p.66) is the receive half
 * and names all three transports. The send half does not: `MIDI CLOCK OUT (OFF, SEQ, ON. DEFAULT:
 * OFF)` (p.66) turns on MIDI clock, and the rear `CLOCK OUT` jack (p.26) carries an analog clock
 * whose signal `CLOCK OUT SOURCE` selects — but **nothing states that MIDI CLOCK OUT reaches the
 * USB port.** The adjacent `SEND CC` setting says *"via the MIDI OUT and USB outputs"* (p.111)
 * and clock's does not, which is a difference in the document rather than in the reading. So
 * `receiveTransport` carries `usb` and `sendTransport` does not (§7.4/#149) — an asymmetry the
 * box states rather than one this manifest assumes.
 *
 * `MIDI CLOCK OUT` defaults to `OFF`, which is exactly the #104 case: a reader told to make the
 * Muse the clock source, who does nothing else, gets silence. `sourceSetup` carries the menu path.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = "Muse User's Manual v1.4.0"

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * A citation into Appendix A, which is a **second document within one manual** and is named as
 * one on purpose.
 *
 * `citedDocument` takes everything before the trailing `, p.N`, so this resolves to
 * `Muse User's Manual v1.4.0 Appendix A (MIDI CC)` — one document across its three pages, sitting
 * beside the plain `Muse User's Manual v1.4.0` that the module pages cite. The guide's citation
 * sentence therefore names both, and that is the useful outcome rather than an accident of
 * string-building: a reader who sees a range attributed to the CC appendix knows the number is
 * the parameter's MIDI value space and not a scale printed beside the knob. Folding the two into
 * one name would hide exactly the distinction the module note spends four paragraphs on.
 *
 * **The CC number is deliberately not in the string.** It would make every row a different
 * document to `citedDocument`, which reads the whole prefix — sixty citation "documents" in the
 * sentence, one per control. The row is found by the control's own name in the table's
 * `MUSE CONTROL` column, and the page narrows it to one of three.
 */
function ccCite(ccNumber: number): Cite {
  return { kind: 'manual', source: `${MANUAL} Appendix A (MIDI CC), p.${ccPage(ccNumber)}` }
}

/**
 * Which of Appendix A's three pages a CC row is printed on. The table is one flat list in
 * ascending CC order with no section breaks, so the page follows from the number — checked
 * against the numbers actually printed on each page rather than assumed from an even split:
 * p.120 ends at 37, p.121 runs 39 to 75, and p.122 runs 76 to 116.
 *
 * Derived rather than passed so that a citation cannot name the wrong page. Sixty-odd call sites
 * each repeating a page number is sixty chances to typo one, and a typo here is the failure mode
 * `CLAUDE.md` cares about most: a value that looks cited and is not.
 */
function ccPage(ccNumber: number): number {
  if (ccNumber <= 37) return 120
  if (ccNumber <= 75) return 121
  return 122
}

/** `0-127`, the range every continuous control on this panel is addressed over. */
const CC: Omit<NumericRange, 'verified'> = { min: 0, max: 127 }

// ---------------------------------------------------------------------------
// Param helpers (§3.1: the range is cited, the point is taste)
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: MoodOffset[]
  unit?: string
  step?: number
  note?: string
  hint?: string
  scope?: ParamScope
}

/**
 * A control the panel does not number, valued on its MIDI CC scale. The **range** is cited to the
 * Appendix A row; the **point** is not, because no page says where to set anything.
 */
/**
 * **The CC number is part of what the reader is told, not just where the range came from.**
 *
 * A bare `74 (0…127)` beside an unmarked knob is not a reproducible instruction. Naming the CC
 * makes it one — `send MIDI CC 67 = 74` sets this control exactly — and it also identifies the row
 * the range is cited to, in a three-page table sorted by CC number.
 *
 * **What this note must not do is convert the value into a knob position, and an earlier draft of
 * it did.** It read *"the panel is unmarked, so by hand this is 58% of the control's travel"*,
 * which asserts that CC value and physical rotation are linearly related. **No page says that.**
 * Appendix A verifies a *value space* — that CC 67 accepts 0-127 — and says nothing about how far
 * round the knob any of those values sits. On an analog synthesiser that mapping is very often not
 * linear (a filter cutoff is usually tapered), so the sentence was not merely uncited, it was
 * likely false. It is exactly the failure `CLAUDE.md` describes: a figure that reads as precise,
 * carries a citation beside it, and is made up.
 *
 * So the note gives the exact instruction, and the gap is stated rather than filled — which is
 * what invariant 5 asks for. **Where that gap is stated moved in #324.** It was a second sentence
 * appended here to all 41 controls, which reached a reader as 76 resolved parameters carrying one
 * 25-word sentence on the rig #324 reported, on a page §8 says is read at the machine, on a
 * phone (#21). It is one fact about one manual, so it is now declared once on the device at
 * `controlPositions` and rendered once above this box's settings by both renderers.
 *
 * What is left on the parameter line is the instruction itself, which is the part that varies per
 * control — and **it is no longer written here either.** This helper authors `midiCc` and
 * `resolveParam` composes the sentence after mood, because a sentence written at authoring time
 * carries the authored value and mood then moves it (#324). See `ccParam` below.
 *
 * **The device-level notice is about what this helper builds and not what `fader` builds** (#325).
 * Its `mapped` field names the ENVELOPE faders as the exception, because those eight do carry a
 * printed scale.
 */
function cc(name: string, value: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
  return ccParam(name, value, ccNumber, extra)
}

/**
 * The eight ENVELOPE faders: FILTER ENVELOPE and VCA ENVELOPE, ATTACK/DECAY/SUSTAIN/RELEASE,
 * CC 79-82 and 86-89. Addressed over the same Appendix A scale as `cc`, and **without its closing
 * sentence, because on these eight that sentence is false** (#325).
 *
 * Two pages, both checked against the rendered PDF rather than a text dump:
 *
 *  - **The panel prints a scale.** PDF p.38, the ENVELOPES module drawing: each bank of four
 *    vertical faders is crossed by five horizontal lines — bottom, three between, top, so four
 *    equal intervals to count along. The rotary controls drawn in the same figure (CUTOFF, VCA
 *    LEVEL, PAN, FEEDBACK, MIX) carry at most an unnumbered tick arc, and on PAN an `L 0 R`
 *    centre mark; none of that names a value, let alone a CC value.
 *  - **And a page maps a position to a value.** Printed p.19: *"the ATTACK, DECAY, SUSTAIN, and
 *    RELEASE sliders of the FILTER ENVELOPE all set to around 25% (or the second line from the
 *    bottom)"*. Five lines, four intervals, so the second from the bottom is 25% — the manual
 *    states the mapping and demonstrates it in one sentence.
 *
 * **What this helper deliberately does not do is print a fader line beside the CC value.** p.19
 * licenses exactly one pairing — 25% is the second line — and says nothing about where CC 52, or
 * any other authored number, sits on that travel. Deriving a line from a CC value needs
 * CC-to-percent to be linear, which is the same unstated assumption the note above `cc` rejects
 * for knobs; `CLAUDE.md`'s *"a cited range can still be the wrong range"* is about exactly this
 * shape, two printed scales for one control with no page converting between them. So the value
 * stays on the Appendix A scale it was authored on, and the note stops after the instruction that
 * sets it.
 *
 * **Since #324 this builds the same parameter `cc` does**, because the sentence that separated
 * them moved off the parameter line and onto the device. The name is kept, and is the reason
 * these eight are still visible as a group: `controlPositions.mapped` on the device excludes
 * *the ENVELOPE faders* from a notice that would otherwise be a false claim about them, and this
 * is what says which controls that phrase is naming. `test/moog-muse.test.ts` pins the set at
 * eight, so a control moved between the two helpers is a failing test rather than a quiet change
 * to what the box claims about its own panel.
 */
function fader(name: string, value: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
  return ccParam(name, value, ccNumber, extra)
}

/**
 * What both CC paths share: the Appendix A range, the taste point, and the CC number.
 *
 * **The number is declared and the sentence is not written here** (#324). `resolveParam` composes
 * *"Send MIDI CC 87 = 36"* after mood has moved the value, which is the only place it can be
 * written without going stale — this helper used to interpolate the *authored* number into a note,
 * so `VCA ENV · DECAY` under a density knob printed `54 → 36` on the line and told the reader to
 * send `54` underneath it. Two of the eight faders and several of the knobs carry mood, so the
 * guide was wrong wherever it was most obviously wrong.
 */
function ccParam(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra,
): AuthoredParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...CC, verified: ccCite(ccNumber) },
    verified: false,
    ...extra,
    midiCc: ccNumber,
  }
}

/** A control the module page *does* scale. Same split: range cited, point taste. */
function num(
  name: string,
  value: number,
  bounds: Omit<NumericRange, 'verified'>,
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

/** A switch: the option set is cited, the position chosen is taste (§3.2). */
function sw(
  name: string,
  value: string,
  values: readonly string[],
  page: number,
  extra: { note?: string; hint?: string; scope?: ParamScope } = {},
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

/** The panel's two-state buttons. `0-63 off/ 64-127 on` throughout Appendix A. */
const OFF_ON = ['OFF', 'ON'] as const
/** p.28. "a standard based around classic pipe organ stop footage settings." */
const OCTAVES = ["16'", "8'", "4'", "2'"] as const
/** p.31, the MODULATION OSCILLATOR's five-position selector. The specs page (p.116) calls RAMP
 *  "Reverse Sawtooth"; the panel and p.31 call it RAMP, and the panel name is the one used. */
const MOD_WAVES = ['SINE', 'SAWTOOTH', 'RAMP', 'SQUARE', 'NOISE'] as const
/** p.53, LFO 1 and LFO 2. USER's contents are chosen in the MORE menu and are not a fifth name. */
const LFO_WAVES = ['TRIANGLE', 'SAWTOOTH', 'SQUARE', 'RANDOM', 'USER'] as const
/** p.36. The panel prints the ratios; Appendix A prints the same three as OFF/HALF/FULL. */
const KB_TRACKING = ['OFF', '1:2', '1:1'] as const
/** pp.36-37. The panel abbreviates; the body text spells them SERIAL, STEREO, PARALLEL. */
const FILTER_ORDER = ['SER', 'STR', 'PAR'] as const
/** p.34, the MIXER's only MORE-menu entry. */
const OVERLOAD_RANGE = ['LOW', 'HIGH'] as const
/** p.44. `EVEN` is avoided throughout — see the module note on the p.43/p.44 contradiction. */
const PAN_SPREAD_MODE = ['L/R', 'EVEN'] as const
/**
 * p.110, both MIDI channel settings: `(OMNI, 1-16. DEFAULT: 1)`.
 *
 * An enum rather than a numeric `1..16`, because `OMNI` is one of the printed options and is not a
 * number. Declaring the range as `{ min: 1, max: 16 }` would drop it from the option set and quote
 * the page for a claim the page does not make — §3.2's point that an enum's *options* are their own
 * cited claim, in the direction where the list has a member no interval can hold.
 */
const MIDI_CHANNELS = [
  'OMNI', '1', '2', '3', '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15', '16',
] as const

/** p.47, which divisions the delay's TIME knobs may reach when CLOCK SYNC is on. */
const DELAY_SYNC_TYPE = ['COMBO', 'STRGHT', 'TRIP', 'DOT'] as const
/** p.68, the ARPEGGIATOR's three operational modes. */
const ARP_DIRECTION = ['ORD', 'PTN', 'RND'] as const
/** p.71, which divisions the ARPEGGIATOR's CLOCK DIV knob is allowed to reach. */
const ARP_CLOCK_DIV = ['STRGHT', 'TRPLT', 'DOTTED', 'COMBO'] as const

// ---------------------------------------------------------------------------
// Sections, in panel order. Every recipe is these blocks in this sequence.
// ---------------------------------------------------------------------------

/**
 * VOICE CONTROL (pp.104-106). Four claims that have to travel together.
 *
 * `DETUNE` is the reason they cannot be split: p.105 gives it a different job under each mode —
 * *"When used polyphonically, DETUNE adds subtle pitch offsets to each voice… When UNISON mode is
 * engaged, DETUNE creates tuning offsets between the stacked voices used. When MONO mode is
 * engaged, DETUNE subtly differentiates the tracking behavior between the two oscillators"*. One
 * knob, three meanings, selected by the two buttons beside it.
 *
 * `TIMBRE A VOICE COUNT` is carried because this manifest's `polyphony: 4` assumes it. p.106's
 * sum-to-eight rule means setting it also sets the other one.
 */
function voice(unison: string, mono: string, detune: number): AuthoredParam[] {
  return [
    sw('VOICE CONTROL · UNISON', unison, OFF_ON, 105, {
      note: 'Stacks any currently unused voices onto the active ones — thickness varies with how many notes are held',
    }),
    sw('VOICE CONTROL · MONO', mono, OFF_ON, 105),
    cc('VOICE CONTROL · DETUNE', detune, 92, {
      note: 'Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO',
    }),
    {
      kind: 'numeric',
      name: 'TIMBRE A VOICE COUNT',
      value: 4,
      // **Uncited on purpose.** p.106 states the rule — "The Voice Count settings for TIMBRE A and
      // B will move with respect to each other and always sum to eight" — and prints an example
      // reading 6 and 2, but it prints no minimum and no maximum for the field itself. `0` to `8`
      // follows from the sum rule rather than from the page, and a range is a claim about what the
      // control accepts. Citing p.106 for it would attribute an inference to a document.
      range: { min: 0, max: 8 },
      verified: false,
      scope: 'song',
      hint: 'voice-count',
      note: 'Four each. The counts always sum to eight, so setting this sets the other',
    },
    sw('DYNAMIC VOICE ALLOCATION', 'OFF', OFF_ON, 106, {
      scope: 'song',
      hint: 'voice-count',
      note: 'Its printed default. On, a busy timbre steals from the other and the four-each split stops holding',
    }),
  ]
}

/** OSCILLATOR 1 (pp.27-28). `FREQUENCY` is the one knob on this panel with a real printed scale. */
function osc1(octave: string, freq: number, triSaw: number, pulseWidth: number, waveMix: number): AuthoredParam[] {
  return [
    sw('OSC 1 · OCTAVE', octave, OCTAVES, 28),
    num('OSC 1 · FREQUENCY', freq, { min: -7, max: 7 }, 27, {
      unit: 'st',
      note: 'Bipolar, in tune at noon; a perfect fifth either way',
    }),
    cc('OSC 1 · TRI/SAW', triSaw, 46, { note: 'Triangle fully counter-clockwise, sawtooth fully clockwise' }),
    cc('OSC 1 · PULSE WIDTH', pulseWidth, 47, { note: 'A square wave sits at noon' }),
    cc('OSC 1 · WAVE MIX', waveMix, 48, {
      note: 'The slider: triangle/sawtooth on the left against the pulse wave on the right',
    }),
  ]
}

/** OSCILLATOR 2 (pp.27-28), plus the hard sync that only exists in this direction. */
function osc2(
  octave: string,
  freq: number,
  triSaw: number,
  pulseWidth: number,
  waveMix: number,
  sync: string,
): AuthoredParam[] {
  return [
    sw('OSC 2 · OCTAVE', octave, OCTAVES, 28),
    num('OSC 2 · FREQUENCY', freq, { min: -7, max: 7 }, 27, { unit: 'st' }),
    cc('OSC 2 · TRI/SAW', triSaw, 51),
    cc('OSC 2 · PULSE WIDTH', pulseWidth, 52),
    cc('OSC 2 · WAVE MIX', waveMix, 53),
    sw('SYNC 2▸1', sync, OFF_ON, 28, { note: 'Locks oscillator 2 to the phase of oscillator 1' }),
  ]
}

/**
 * FM (pp.28-29), and the four limits without which `FM AMOUNT` means nothing.
 *
 * p.28: *"The range of this control can be configured in the MORE menu allowing you to dial in
 * precise FM depths… even allowing for inverted FM relationships on either side of the knob."* So
 * a bare `FM AMOUNT 70` is a number on an unknown scale. `direction` picks which routing button is
 * engaged, and the pair of limits printed for that direction rides along at their defaults.
 *
 * This is the device's grit carrier: audio-rate cross-modulation is where its dirt comes from, and
 * unlike `OVERLOAD` it has a cited range for mood to move it along.
 */
function fm(direction: '2>1' | '1>2', amount: number, minAmt = 0, maxAmt = 100): AuthoredParam[] {
  const on = direction === '2>1' ? '2▸1' : '1▸2'
  const off = direction === '2>1' ? '1▸2' : '2▸1'
  return [
    sw(`FM · ${on}`, 'ON', OFF_ON, direction === '2>1' ? 28 : 29, {
      note:
        direction === '2>1'
          ? 'Oscillator 2 modulating the frequency of oscillator 1, at audio rate'
          : 'Oscillator 1 modulating the frequency of oscillator 2, at audio rate',
    }),
    sw(`FM · ${off}`, 'OFF', OFF_ON, direction === '2>1' ? 29 : 28),
    cc('FM AMOUNT', amount, 57, {
      mood: [{ axis: 'grit', amount: 22 }],
      note: 'Sweeps between the two limits below rather than between zero and full',
    }),
    num(`${direction} FM MIN AMT`, minAmt, { min: 0, max: 100 }, 29, { unit: '%', hint: 'edit-submenu' }),
    num(`${direction} FM MAX AMT`, maxAmt, { min: 0, max: 100 }, 29, { unit: '%', hint: 'edit-submenu' }),
  ]
}

/**
 * MODULATION OSCILLATOR (pp.30-32) — the third VCO per voice, and eight LFOs when it is slow.
 *
 * `AUDIO` is carried on every use because it decides both the `FREQUENCY` scale and what the
 * oscillator *is*: p.30 says the low-frequency behaviour *"is always per-voice, providing 8
 * individual LFOs"*, and p.34 says its mixer fader stops being a level and starts modulating the
 * DC offset into the mixer.
 */
function modOsc(
  audio: string,
  waveform: string,
  freq: number,
  pitchAmount: number,
  pitchTargets: { osc1: string; osc2: string },
  filterAmount: number,
  filterTargets: { f1: string; f2: string },
): AuthoredParam[] {
  return [
    sw('MOD OSC · AUDIO', audio, OFF_ON, 30, {
      note: audio === 'ON'
        ? 'Audio rate: a third oscillator, roughly 20 Hz to 3 kHz across the knob'
        : 'Sub-audio: eight per-voice LFOs, one for each voice',
    }),
    sw('MOD OSC · WAVEFORM', waveform, MOD_WAVES, 31),
    cc('MOD OSC · FREQUENCY', freq, 25, {
      note: 'The range of this knob differs with the AUDIO button above',
    }),
    cc('MOD OSC · PITCH AMOUNT', pitchAmount, 31),
    sw('MOD OSC · PITCH ▸ OSC 1', pitchTargets.osc1, OFF_ON, 31),
    sw('MOD OSC · PITCH ▸ OSC 2', pitchTargets.osc2, OFF_ON, 31),
    cc('MOD OSC · FILTER AMOUNT', filterAmount, 39),
    sw('MOD OSC · FILTER ▸ 1', filterTargets.f1, OFF_ON, 31),
    sw('MOD OSC · FILTER ▸ 2', filterTargets.f2, OFF_ON, 31),
  ]
}

/**
 * MIXER (pp.33-34). Six faders, and `OVERLOAD` is the odd one out.
 *
 * p.33 states the design: *"Muse defaults to mixing signals precisely and cleanly, however the
 * classic Moog mixer behavior can still be achieved by using the OVERLOAD slider to add soft
 * clipping and saturation."* p.19 adds the level that matters for authoring: *"Each channel in the
 * mixer is at a strong unity gain level when the fader is at its maximum."*
 *
 * **`OVERLOAD` carries an uncited range and therefore cannot take a mood offset**, which is the
 * right outcome rather than a limitation to work around. Neither of its two ranges is quantified
 * (p.34), and Appendix A's `65 Clipping Level` is never tied to this fader by any page — a very
 * likely identification, and likely is not cited. `RING MOD` carries the mixer's grit instead,
 * on a range that is genuinely printed.
 */
function mixer(
  osc1Level: number,
  ringMod: number,
  osc2Level: number,
  modOscLevel: number,
  noise: number,
  overload: number,
  overloadRange: string = 'LOW',
): AuthoredParam[] {
  return [
    cc('MIXER · OSC 1', osc1Level, 58),
    cc('MIXER · RING MOD', ringMod, 60, {
      mood: [{ axis: 'grit', amount: 26 }],
      note: 'Sum and difference tones of the two oscillators — inharmonic as they detune',
    }),
    cc('MIXER · OSC 2', osc2Level, 59),
    cc('MIXER · MOD OSC', modOscLevel, 61),
    cc('MIXER · NOISE', noise, 62, { note: 'White noise' }),
    {
      kind: 'numeric',
      name: 'MIXER · OVERLOAD',
      value: overload,
      // Uncited on purpose: p.34 quantifies neither the LOW nor the HIGH range, and no CC row
      // names this fader. An uncited range is mood-inert (§3.1), which is the honest result.
      range: { min: 0, max: 127 },
      verified: false,
      note: 'No page prints a scale for this fader and no CC row names it, so this number is relative within this guide rather than a position on the panel',
    },
    sw('OVERLOAD RANGE', overloadRange, OVERLOAD_RANGE, 34, {
      hint: 'edit-submenu',
      note: 'LOW narrows the drive range for finer control',
    }),
  ]
}

/**
 * FILTERS (pp.35-37). Two ladder filters, one of them switchable to highpass, in one of three
 * routings — and three switches that decide what the FILTER 1 knobs mean.
 *
 * `LINK FILTERS` is `OFF` in every recipe. That is not a preference: with it on, FILTER 1's CUTOFF
 * becomes a spacing control (the panel prints `(SPACING)` under it), and under `LINK MODE: ALL
 * KNOBS` its RESONANCE and ENVELOPE AMOUNT do too. Off, all three are absolute and the numbers
 * below mean what they say.
 *
 * `ORDER` is architectural rather than flavour. p.37: *"With ORDER set to SERIAL and FILTER 1 set
 * to HIGH PASS, a bandpass filter will result. With ORDER set to STEREO and both filters as LOW
 * PASS, a stereo lowpass filter will result. With ORDER set to PARALLEL and FILTER 1 set to HIGH
 * PASS, a notch filter will result."* And `STEREO` hard-pans the two filters left and right, so it
 * changes the image as well as the response.
 *
 * **No slope is claimed.** The manual prints no dB/octave figure for either filter, on the module
 * pages or in the specifications. "Discrete Moog transistor ladder" is the whole characterisation.
 */
function filters(
  order: string,
  highPass: string,
  cutoff1: number,
  res1: number,
  env1: number,
  kb1: string,
  cutoff2: number,
  res2: number,
  env2: number,
  kb2: string,
): AuthoredParam[] {
  return [
    sw('FILTER · ORDER', order, FILTER_ORDER, 36, {
      note: 'SERIAL, STEREO or PARALLEL — with HIGH PASS this decides bandpass, stereo lowpass or notch',
    }),
    sw('LINK FILTERS', 'OFF', OFF_ON, 36, {
      note: 'Off, so FILTER 1 CUTOFF is an absolute cutoff rather than the spacing between the two',
    }),
    sw('FILTER 1 · HIGH PASS', highPass, OFF_ON, 35, {
      note: highPass === 'ON'
        ? 'Highpass: the knob is fully open counter-clockwise, the opposite of lowpass'
        : 'Lowpass',
    }),
    cc('FILTER 1 · CUTOFF', cutoff1, 67, { mood: [{ axis: 'darkness', amount: -30 }] }),
    cc('FILTER 1 · RESONANCE', res1, 68, { note: 'Self-oscillates into a sine fully clockwise' }),
    cc('FILTER 1 · ENVELOPE AMOUNT', env1, 69, { note: 'Bipolar, no modulation at noon' }),
    sw('FILTER 1 · KB TRACKING', kb1, KB_TRACKING, 36),
    cc('FILTER 2 · CUTOFF', cutoff2, 72, { mood: [{ axis: 'darkness', amount: -30 }] }),
    cc('FILTER 2 · RESONANCE', res2, 73),
    cc('FILTER 2 · ENVELOPE AMOUNT', env2, 75, { note: 'Bipolar, no modulation at noon' }),
    sw('FILTER 2 · KB TRACKING', kb2, KB_TRACKING, 36),
  ]
}

/**
 * FILTER ENVELOPE (pp.38-41), normalised to FILTER CUTOFF.
 *
 * The manual prints no time unit for any stage — not milliseconds and not seconds. Its only
 * envelope figures are percentages of fader travel: p.19's initialized VCA envelope, *"ATTACK set
 * to 0%, DECAY 25%, SUSTAIN 90%, and RELEASE set around 35%"*, and the FILTER ENVELOPE's four
 * sliders *"all set to around 25% (or the second line from the bottom)"* on the same page.
 *
 * That second quotation is a printed position, so these eight controls go through `fader` rather
 * than `cc` — see the note there for why the percentage is not converted into the CC value beside
 * it, or the CC value into a fader line.
 */
function filterEnv(attack: number, decay: number, sustain: number, release: number, loop = 'OFF'): AuthoredParam[] {
  return [
    fader('FILTER ENV · ATTACK', attack, 79),
    fader('FILTER ENV · DECAY', decay, 80),
    fader('FILTER ENV · SUSTAIN', sustain, 81),
    fader('FILTER ENV · RELEASE', release, 82),
    sw('FILTER ENV · LOOP', loop, OFF_ON, 39, {
      note: 'Looping, the envelope runs like an LFO',
    }),
  ]
}

/**
 * VCA ENVELOPE (pp.38-41), normalised to VCA level — and where density and space are declared,
 * the same two knobs the minilogue xd and the Subsequent 37 declare them on.
 */
function vcaEnv(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  velocity: string,
): AuthoredParam[] {
  return [
    fader('VCA ENV · ATTACK', attack, 86),
    fader('VCA ENV · DECAY', decay, 87, { mood: [{ axis: 'density', amount: -18 }] }),
    fader('VCA ENV · SUSTAIN', sustain, 88),
    fader('VCA ENV · RELEASE', release, 89, { mood: [{ axis: 'space', amount: 22 }] }),
    sw('VCA ENV · VELOCITY', velocity, OFF_ON, 39),
  ]
}

/**
 * VCA (pp.42-44). Every control here is **per timbre** — p.42 says "the currently active timbre
 * (A/B)" of both LEVEL and PAN — which is why the block carries the hint that reaches them.
 *
 * `PAN SPRD MODE` stays at its printed default `L/R` (p.44): under `EVEN` the manual names two
 * different knobs for the spread width on facing pages, and that is not resolved here.
 */
function vca(level: number, pan: number, panSpread: number): AuthoredParam[] {
  return [
    cc('VCA · LEVEL', level, 7, { hint: 'timbre-select' }),
    cc('VCA · PAN', pan, 10, { note: 'Bipolar, centred at noon' }),
    cc('VCA · PAN SPREAD', panSpread, 9, {
      note: 'All voices sit at the PAN position fully counter-clockwise',
    }),
    sw('VCA · PAN SPRD MODE', 'L/R', PAN_SPREAD_MODE, 44, { hint: 'edit-submenu' }),
  ]
}

/**
 * DIFFUSION DELAY (pp.45-49). **One processor for the whole patch, with a routing button per
 * timbre — and that asymmetry is the whole shape of this block.**
 *
 * This was modelled wrongly at first and the error is worth recording, because a pool makes it
 * invisible. The delay was authored as an ordinary per-recipe block, so two timbres could be
 * handed two different `MIX` values, two different `FEEDBACK`s, two different `TIME`s. There is
 * one set of those knobs on the panel. The guide would have printed two numbers for one control
 * and left the reader to guess which the box kept — exactly the defect §3.1/#107 records for the
 * Tracker Mini's `SWING`, arriving through a pool instead of through nine tracks.
 *
 * pp.45-47 are unambiguous about the topology. There is one `DIFFUSION DELAY`, *"a powerful
 * stereo signal processor"*, with one `TIME-L`, one `TIME-R`, one `FEEDBACK`, one `CHARACTER` and
 * one `MIX`. What is per-timbre is two **routing buttons**: `TIMBRE A` — *"Routes TIMBRE A to the
 * DIFFUSION DELAY when engaged. TIMBRE A is fully bypassed for a completely analog signal when
 * disengaged"* — and `TIMBRE B`, worded identically. The settings are stored with the patch, and a
 * patch holds both timbres.
 *
 * So the knobs carry `scope: 'song'` and are **identical in every recipe**, which is what lets
 * `hoistedParams` state them once above the parts rather than per part. `song` rather than
 * `pattern`: these are patch settings, and a patch on this box outlives any one pattern.
 *
 * **The per-timbre control that survives is the bypass**, and it is the useful one: a bass can sit
 * dry while a pad is wet, off the same delay. It stays unscoped and per-recipe, because two parts
 * genuinely can answer it differently — they are two separate buttons.
 *
 * It carries **no `timbre-select` hint**, and that is a correction rather than an omission. That
 * hint means *"light TIMBRE A or B first, then set the control"*, which is true of `VCA LEVEL` and
 * `PAN` (p.42: *"the currently active timbre (A/B)"*). It is false here: `TIMBRE A` and `TIMBRE B`
 * in the delay are two independent latching buttons, not a selector, and telling a reader to light
 * a timbre before pressing one would send them to the wrong part of the panel.
 */
function delayRouting(through: string): AuthoredParam[] {
  return [
    sw('DELAY · TIMBRE A / TIMBRE B', through, OFF_ON, 47, {
      note: 'Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path',
    }),
  ]
}

/**
 * The one delay setting the patch carries, shared by both timbres. Every recipe includes it
 * unchanged; `hoistedParams` only lifts a scoped parameter when every occurrence agrees, so
 * varying any of these would silently drop them back into the per-part list and reintroduce the
 * conflict this exists to prevent.
 *
 * The values are a general-purpose short stereo delay: audible, not dominant, and safe under any
 * of the parts this device is given. **`DELAY · MIX` still carries the `space` axis** — mood is
 * uniform across a guide, so every occurrence moves together and the parameter stays hoistable.
 *
 * `CLOCK SYNC` is on, so both `TIME` knobs jump between divisions of the global tempo rather than
 * running free, which is what makes one shared setting musical across parts at different rates.
 * Neither scale is printed, in either mode — see the module note.
 *
 * `LINK DELAYS` is off, for the reason `LINK FILTERS` is: engaged, `TIME-L` stops being the left
 * delay time and becomes an offset between the channels (p.46).
 */
function sharedDelay(): AuthoredParam[] {
  return [
    sw('DELAY · CLOCK SYNC', 'ON', OFF_ON, 46, {
      scope: 'song',
      note: 'Both TIME knobs jump between divisions of the global TEMPO',
    }),
    sw('DELAY · SYNC TYPE', 'COMBO', DELAY_SYNC_TYPE, 47, {
      scope: 'song',
      hint: 'edit-submenu',
      note: 'Its printed default — every division rather than only straight, triplet or dotted ones',
    }),
    sw('DELAY · LINK DELAYS', 'OFF', OFF_ON, 46, {
      scope: 'song',
      note: 'Off, so TIME-L is the left delay time rather than an offset against the right',
    }),
    cc('DELAY · TIME - L', 48, 93, { scope: 'song' }),
    cc('DELAY · TIME - R', 72, 94, { scope: 'song' }),
    cc('DELAY · FEEDBACK', 54, 103, { scope: 'song', note: 'Single repeat through to infinite' }),
    cc('DELAY · CHARACTER', 64, 104, {
      scope: 'song',
      note: 'Noon, where the default DJ-style filter on the repeats is doing nothing',
    }),
    cc('DELAY · MIX', 38, 105, { scope: 'song', mood: [{ axis: 'space', amount: 30 }] }),
  ]
}

/**
 * §7.4/#104-shaped, but for note data rather than clock. **The two timbres both listen to MIDI
 * channel 1 out of the box, and a guide that does not say so is describing a rig that cannot
 * work.**
 *
 * p.110 gives `MULTI MODE (OFF/ON. DEFAULT: ON)` — *"If ON, messages at MIDI CHANNEL IN will
 * control TIMBRE A of Muse while TIMBRE B will be independently controlled via messages at MULTI
 * IN B CHANNEL"* — and then gives `MIDI IN CHANNEL (OMNI, 1-16. DEFAULT: 1)` and `MULTI IN B
 * CHANNEL (OMNI, 1-16. DEFAULT: 1)`. Both default to **1**. So the mode that makes this box two
 * parts is already on, and the two channels it splits them by are the same channel until somebody
 * changes one.
 *
 * That is the whole basis of this manifest's `pool` of two (see the module note), so leaving it
 * unstated would be describing a two-part instrument and then handing the reader a rig where both
 * parts double on one channel. Two settings, stated once for the box: A on 1, B on 2.
 *
 * `scope: 'song'` because they are global settings rather than per-part ones — the guide should
 * say them once above the parts, not once per part.
 *
 * The channel numbers themselves are taste, like every point value here; what the manual supplies
 * is the range, the defaults, and the requirement that the two differ.
 */
function midiSetup(): AuthoredParam[] {
  return [
    sw('MULTI MODE', 'ON', OFF_ON, 110, {
      scope: 'song',
      hint: 'midi-settings',
      note: 'Its printed default, and what makes the two timbres separately playable',
    }),
    sw('MIDI IN CHANNEL', '1', MIDI_CHANNELS, 110, {
      scope: 'song',
      hint: 'midi-settings',
      note: 'TIMBRE A listens here',
    }),
    sw('MULTI IN B CHANNEL', '2', MIDI_CHANNELS, 110, {
      scope: 'song',
      hint: 'midi-settings',
      note: 'TIMBRE B listens here. Both default to 1, so this must be changed or the two timbres double on one channel',
    }),
    // Without this every `Send MIDI CC …` note above is inert, which makes it the same shape as
    // `MIDI CLOCK OUT` defaulting to off (§7.4/#104): one unstated setting that stalls everything
    // depending on it.
    sw('RECIEVE CC', 'ON', OFF_ON, 111, {
      scope: 'song',
      hint: 'midi-settings',
      note: "Defaults to OFF, so the box ignores CC until this is set. The manual's spelling",
    }),
  ]
}

/**
 * LFO 1 (pp.52-53, 57). `SYNC` is `OFF` on every recipe so that the printed Hz range is the one in
 * force — with it on, `RATE` jumps between clock divisions the manual never enumerates.
 *
 * `RATE MIN` and `RATE MAX` are carried because they are what the cited range actually is: p.52
 * says the knob *"defaults to 0.01 Hz–40.00 Hz but has a maximum range of 0.00 Hz – 1.00 kHz
 * (configurable in MORE menu)"*, and those two settings are saved per patch.
 */
function lfo1(waveform: string, rate: number, amplitude: number, perVoice = 'GLOBAL'): AuthoredParam[] {
  return [
    sw('LFO 1 · WAVEFORM', waveform, LFO_WAVES, 53),
    num('LFO 1 · RATE', rate, { min: 0.01, max: 40 }, 52, {
      unit: 'Hz',
      step: 0.01,
      note: 'The default range; RATE MIN and RATE MAX in the MORE menu can widen it to 1 kHz',
    }),
    cc('LFO 1 · AMPLITUDE', amplitude, 13, { note: 'An attenuator ahead of every destination' }),
    sw('LFO 1 · SYNC', 'OFF', OFF_ON, 57, {
      hint: 'edit-submenu',
      note: 'Off, so RATE is the free-running Hz scale rather than tempo divisions',
    }),
    sw('LFO 1 · LFO TYPE', perVoice, ['GLOBAL', 'PER-VOICE'], 57, {
      hint: 'edit-submenu',
      note: 'PER-VOICE gives eight separate LFOs, one per voice',
    }),
  ]
}

/**
 * PITCH LFO (pp.58-60). A variable-skew LFO *"specifically dialed in for subtle vibrato amounts"*,
 * with four hardwired destination buttons of its own.
 *
 * `AMOUNT` is the one modulation depth on this box with a stated musical size: p.59's tip says
 * turning it to maximum gives *"+/- 2 semitone movement"*. The knob itself is still unnumbered, so
 * the CC scale carries the value and the semitone figure is the note beside it.
 */
function pitchLfo(rate: number, shape: number, amount: number, targets: { osc1: string; osc2: string }): AuthoredParam[] {
  return [
    num('PITCH LFO · RATE', rate, { min: 0.01, max: 40 }, 58, { unit: 'Hz', step: 0.01 }),
    cc('PITCH LFO · SHAPE', shape, 19, {
      note: 'Sawtooth fully counter-clockwise, a symmetrical triangle at noon, ramp fully clockwise',
    }),
    cc('PITCH LFO · AMOUNT', amount, 20, {
      note: 'Bipolar, no modulation at noon; ±2 semitones at maximum',
    }),
    sw('PITCH LFO · ▸ OSC 1', targets.osc1, OFF_ON, 59),
    sw('PITCH LFO · ▸ OSC 2', targets.osc2, OFF_ON, 59),
    sw('PITCH LFO · SYNC', 'OFF', OFF_ON, 60, { hint: 'edit-submenu' }),
  ]
}

/**
 * ARPEGGIATOR (pp.68-73), for the `arp` recipes only — and **the only place this device declares
 * the `swing` axis**.
 *
 * That confinement is a fact about the box rather than an omission. `SWING (25% - 75%. DEFAULT:
 * 50%)` (p.71) is an arpeggiator setting; a pad on this instrument has no swing control to move,
 * so a pad recipe declaring the axis would be inventing one. §6: a device declines an axis by
 * having no param that declares it, and here that decision is made per recipe because that is
 * where it is true.
 *
 * `CLOCK DIV` the knob is not authored: the manual prints only which *families* of division it may
 * reach (`STRGHT, TRPLT, DOTTED, COMBO`, p.71) and never the divisions themselves. The one
 * enumerated division list in the document, `INT CLOCK DIV` on p.67, belongs to the rear CLOCK OUT
 * jack — a different parameter, and borrowing it would be a value read off the wrong scale.
 */
function arp(direction: string, octaveRange: number, gateLength: number, clockDiv: string): AuthoredParam[] {
  return [
    sw('ARP · ON', 'ON', OFF_ON, 68),
    sw('ARP · DIRECTION', direction, ARP_DIRECTION, 68, {
      note: 'ORD plays the notes in the order they were pressed; PTN follows the MORE menu pattern; RND is random',
    }),
    num('ARP · OCTAVE RANGE', octaveRange, { min: 1, max: 4 }, 68, {
      note: 'How many octaves the pattern spans',
    }),
    num('ARP · GATE LENGTH', gateLength, { min: 1, max: 99 }, 70, {
      unit: '%',
      note: 'One length for every step, as a proportion of the step',
    }),
    num('ARP · SWING', 50, { min: 25, max: 75 }, 71, {
      unit: '%',
      mood: [{ axis: 'swing', amount: 18 }],
      hint: 'edit-submenu',
      note: '50% is straight',
    }),
    sw('ARP · CLOCK DIV', clockDiv, ARP_CLOCK_DIV, 71, {
      hint: 'edit-submenu',
      note: 'Which divisions the CLOCK DIV knob is allowed to reach',
    }),
  ]
}

// ---------------------------------------------------------------------------
// §3 Recipes. Eighteen, over seven roles — and one set serves both timbres.
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  // ---- pad: the reason an eight-voice box is in the library ---------------
  {
    id: 'muse-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'timbre',
    verified: false,
    title: 'Two triangles a fifth apart, filters in stereo, nothing arriving at once',
    params: [
      ...voice('OFF', 'OFF', 18),
      ...midiSetup(),
      ...osc1("8'", 0, 12, 64, 30),
      ...osc2("8'", 3, 20, 70, 34, 'OFF'),
      ...modOsc('OFF', 'SINE', 22, 14, { osc1: 'ON', osc2: 'ON' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(96, 0, 92, 0, 0, 0),
      ...filters('STR', 'OFF', 62, 18, 44, '1:2', 66, 14, 40, '1:2'),
      ...filterEnv(78, 74, 62, 88),
      ...vcaEnv(84, 70, 108, 96, 'ON'),
      ...vca(96, 64, 58),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.24, 30, 'PER-VOICE'),
    ],
  },
  {
    id: 'muse-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'timbre',
    verified: false,
    title: 'Both filters low and serial, sixteen-foot underneath, no top at all',
    params: [
      ...voice('OFF', 'OFF', 22),
      ...midiSetup(),
      ...osc1("16'", 0, 30, 58, 42),
      ...osc2("8'", -2, 26, 62, 38, 'OFF'),
      ...modOsc('OFF', 'SINE', 16, 10, { osc1: 'ON', osc2: 'OFF' }, 12, { f1: 'ON', f2: 'OFF' }),
      ...mixer(104, 0, 88, 0, 6, 0),
      ...filters('SER', 'OFF', 34, 26, 30, '1:2', 30, 20, 24, '1:2'),
      ...filterEnv(90, 96, 40, 100),
      ...vcaEnv(88, 84, 104, 104, 'ON'),
      ...vca(92, 60, 46),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.14, 22, 'PER-VOICE'),
    ],
  },
  {
    id: 'muse-pad-bright',
    role: 'pad',
    character: 'bright',
    voice: 'timbre',
    verified: false,
    title: 'Sawtooth pair, highpass in parallel with the lowpass, resonance up in the air',
    params: [
      ...voice('OFF', 'OFF', 26),
      ...midiSetup(),
      ...osc1("8'", 0, 112, 76, 88),
      ...osc2("4'", 4, 108, 80, 84, 'OFF'),
      ...modOsc('OFF', 'SINE', 30, 18, { osc1: 'ON', osc2: 'ON' }, 20, { f1: 'OFF', f2: 'ON' }),
      ...mixer(92, 0, 90, 0, 10, 0),
      ...filters('PAR', 'ON', 46, 40, 58, '1:1', 100, 34, 54, '1:1'),
      ...filterEnv(66, 80, 74, 92),
      ...vcaEnv(72, 76, 106, 98, 'ON'),
      ...vca(94, 64, 72),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.42, 34, 'PER-VOICE'),
    ],
  },

  // ---- stab: short, chordal, and where UNISON earns its place ------------
  {
    id: 'muse-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'timbre',
    verified: false,
    title: 'Unison stack on a fast envelope, serial filters clamped shut behind it',
    params: [
      // UNISON without MONO: the spare voices pile onto whatever is held, so a one-note stab is
      // huge and a triad is still a triad. No polyphony claim — see the module note.
      ...voice('ON', 'OFF', 34),
      ...midiSetup(),
      ...osc1("8'", 0, 120, 46, 96),
      ...osc2("8'", -3, 116, 50, 92, 'ON'),
      ...modOsc('OFF', 'SQUARE', 40, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(112, 20, 108, 0, 0, 40),
      ...filters('SER', 'OFF', 44, 62, 96, '1:1', 52, 40, 78, '1:2'),
      ...filterEnv(2, 34, 8, 24),
      ...vcaEnv(2, 40, 24, 30, 'ON'),
      ...vca(104, 64, 40),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('SQUARE', 4.8, 0),
    ],
  },
  {
    id: 'muse-stab-bright',
    role: 'stab',
    character: 'bright',
    voice: 'timbre',
    verified: false,
    title: 'Pulse-width pair four feet up, highpass parallel, a hard clip on the tail',
    params: [
      ...voice('OFF', 'OFF', 20),
      ...midiSetup(),
      ...osc1("4'", 0, 30, 96, 118),
      ...osc2("4'", 2, 26, 104, 114, 'OFF'),
      ...modOsc('OFF', 'SINE', 46, 0, { osc1: 'OFF', osc2: 'OFF' }, 26, { f1: 'OFF', f2: 'ON' }),
      ...mixer(100, 0, 98, 12, 0, 0),
      ...filters('PAR', 'ON', 38, 30, 84, '1:1', 108, 44, 72, '1:1'),
      ...filterEnv(0, 44, 0, 30),
      ...vcaEnv(0, 46, 18, 34, 'ON'),
      ...vca(100, 64, 66),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 3.2, 0),
    ],
  },
  {
    id: 'muse-stab-dirty',
    role: 'stab',
    character: 'dirty',
    voice: 'timbre',
    verified: false,
    title: 'Ring modulator over the top of the mix, oscillator two syncing hard',
    params: [
      ...voice('ON', 'OFF', 48),
      ...midiSetup(),
      ...osc1("8'", 0, 118, 40, 100),
      ...osc2("4'", 5, 122, 44, 104, 'ON'),
      ...fm('1>2', 62),
      ...modOsc('ON', 'SQUARE', 74, 22, { osc1: 'OFF', osc2: 'ON' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(88, 84, 82, 30, 24, 96, 'HIGH'),
      ...filters('SER', 'OFF', 56, 74, 88, '1:2', 60, 52, 70, '1:2'),
      ...filterEnv(0, 30, 12, 26),
      ...vcaEnv(0, 38, 20, 32, 'ON'),
      ...vca(96, 64, 52),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('RANDOM', 7.5, 26),
    ],
  },

  // ---- lead: two mono, one that keeps its voices --------------------------
  {
    id: 'muse-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'timbre',
    verified: false,
    title: 'Mono sawtooth with the filter tracking the keyboard one to one',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 30),
      ...midiSetup(),
      ...osc1("8'", 0, 122, 64, 96),
      ...osc2("8'", 1, 118, 68, 92, 'OFF'),
      ...modOsc('OFF', 'SINE', 34, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(104, 0, 98, 0, 0, 18),
      ...filters('SER', 'OFF', 74, 48, 60, '1:1', 84, 30, 44, '1:1'),
      ...filterEnv(8, 56, 66, 40),
      ...vcaEnv(6, 60, 110, 46, 'ON'),
      ...vca(102, 64, 0),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...pitchLfo(5.2, 64, 74, { osc1: 'ON', osc2: 'ON' }),
    ],
  },
  {
    id: 'muse-lead-hard',
    role: 'lead',
    character: 'hard',
    voice: 'timbre',
    verified: false,
    title: 'Mono square, resonance at the edge, envelope thrown at the cutoff',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 26),
      ...midiSetup(),
      ...osc1("8'", 0, 0, 64, 122),
      ...osc2("8'", -2, 0, 58, 118, 'ON'),
      ...modOsc('OFF', 'SINE', 28, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(112, 12, 106, 0, 0, 52),
      ...filters('SER', 'OFF', 52, 88, 104, '1:1', 62, 46, 62, '1:2'),
      ...filterEnv(0, 40, 30, 34),
      ...vcaEnv(0, 52, 106, 38, 'ON'),
      ...vca(106, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...pitchLfo(6.4, 64, 70, { osc1: 'ON', osc2: 'ON' }),
    ],
  },
  {
    id: 'muse-lead-dirty',
    role: 'lead',
    character: 'dirty',
    voice: 'timbre',
    verified: false,
    title: 'Cross-modulated pair driven into the mixer, still one note at a time',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 44),
      ...midiSetup(),
      ...osc1("8'", 0, 106, 52, 108),
      ...osc2("8'", 4, 110, 48, 112, 'OFF'),
      ...fm('2>1', 84, 10, 100),
      ...modOsc('ON', 'RAMP', 88, 34, { osc1: 'ON', osc2: 'OFF' }, 30, { f1: 'ON', f2: 'OFF' }),
      ...mixer(96, 66, 92, 44, 18, 108, 'HIGH'),
      ...filters('SER', 'OFF', 60, 80, 76, '1:1', 58, 60, 58, '1:2'),
      ...filterEnv(4, 46, 40, 44),
      ...vcaEnv(2, 54, 104, 48, 'ON'),
      ...vca(98, 64, 0),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...pitchLfo(7.8, 88, 82, { osc1: 'ON', osc2: 'ON' }),
    ],
  },

  // ---- bass-mid and sub: MONO, and the manual says so outright -----------
  {
    id: 'muse-bass-mid-hard',
    role: 'bass-mid',
    character: 'hard',
    voice: 'timbre',
    verified: false,
    title: 'Mono sawtooth at eight foot, filter envelope snapping the top off each note',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 16),
      ...midiSetup(),
      ...osc1("8'", 0, 120, 64, 88),
      ...osc2("16'", 0, 118, 64, 84, 'OFF'),
      ...modOsc('OFF', 'SINE', 24, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(108, 0, 102, 0, 0, 34),
      ...filters('SER', 'OFF', 48, 54, 92, '1:2', 56, 32, 60, '1:2'),
      ...filterEnv(0, 38, 14, 28),
      ...vcaEnv(0, 48, 96, 32, 'ON'),
      ...vca(108, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('TRIANGLE', 0.8, 0),
    ],
  },
  {
    id: 'muse-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'timbre',
    verified: false,
    title: 'Mono triangle pair, both ladders low, nothing above the fundamental',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 12),
      ...midiSetup(),
      ...osc1("16'", 0, 8, 64, 24),
      ...osc2("8'", -1, 14, 64, 28, 'OFF'),
      ...modOsc('OFF', 'SINE', 18, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(112, 0, 94, 0, 0, 20),
      ...filters('SER', 'OFF', 30, 22, 40, '1:2', 26, 16, 30, '1:2'),
      ...filterEnv(0, 54, 26, 40),
      ...vcaEnv(0, 62, 100, 44, 'ON'),
      ...vca(106, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('TRIANGLE', 0.5, 0),
    ],
  },
  {
    id: 'muse-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'timbre',
    verified: false,
    title: 'Mono, overload up and the ring modulator sitting under the note',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 40),
      ...midiSetup(),
      ...osc1("8'", 0, 114, 56, 96),
      ...osc2("16'", 3, 116, 60, 100, 'OFF'),
      ...fm('2>1', 54),
      ...modOsc('ON', 'SQUARE', 66, 0, { osc1: 'OFF', osc2: 'OFF' }, 24, { f1: 'ON', f2: 'OFF' }),
      ...mixer(100, 58, 96, 26, 14, 114, 'HIGH'),
      ...filters('SER', 'OFF', 52, 70, 80, '1:2', 54, 48, 56, '1:2'),
      ...filterEnv(0, 42, 20, 32),
      ...vcaEnv(0, 50, 98, 36, 'ON'),
      ...vca(100, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('RANDOM', 5.5, 18),
    ],
  },
  {
    id: 'muse-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'timbre',
    verified: false,
    title: 'Mono sixteen-foot triangle, one ladder, nothing else in the mixer',
    patchPolyphony: 1,
    params: [
      ...voice('OFF', 'ON', 0),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 64, 0),
      ...osc2("16'", 0, 0, 64, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 14, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(118, 0, 0, 0, 0, 0),
      ...filters('SER', 'OFF', 26, 10, 18, '1:2', 22, 8, 14, 'OFF'),
      ...filterEnv(0, 60, 40, 44),
      ...vcaEnv(2, 70, 112, 48, 'OFF'),
      ...vca(112, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('TRIANGLE', 0.1, 0),
    ],
  },
  {
    id: 'muse-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'timbre',
    verified: false,
    title: 'Mono sine from a self-oscillating ladder tracking the keys, mixer shut',
    patchPolyphony: 1,
    params: [
      // p.36's tip: "setting RESONANCE fully clockwise allows you to use either filter as a sine
      // wave oscillator" — with KB TRACKING at 1:1 it plays. The mixer is closed behind it.
      ...voice('OFF', 'ON', 0),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 64, 0),
      ...osc2("16'", 0, 0, 64, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 12, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(0, 0, 0, 0, 0, 0),
      ...filters('SER', 'OFF', 34, 127, 0, '1:1', 24, 6, 0, 'OFF'),
      ...filterEnv(0, 50, 64, 40),
      ...vcaEnv(4, 66, 114, 52, 'OFF'),
      ...vca(110, 64, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('TRIANGLE', 0.1, 0),
    ],
  },

  // ---- texture: eight voices held, non-melodic ---------------------------
  {
    id: 'muse-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'timbre',
    verified: false,
    title: 'Per-voice modulation oscillators drifting the pitches apart under a stereo pair',
    params: [
      ...voice('OFF', 'OFF', 44),
      ...midiSetup(),
      ...osc1("8'", 0, 18, 68, 26),
      ...osc2("8'", 6, 24, 72, 30, 'OFF'),
      // AUDIO off: eight independent per-voice LFOs, which is the whole point of this patch.
      ...modOsc('OFF', 'SINE', 10, 30, { osc1: 'ON', osc2: 'ON' }, 22, { f1: 'ON', f2: 'ON' }),
      ...mixer(88, 0, 86, 0, 16, 0),
      ...filters('STR', 'OFF', 54, 30, 36, '1:2', 58, 26, 32, '1:2'),
      ...filterEnv(104, 90, 70, 112),
      ...vcaEnv(108, 88, 112, 116, 'OFF'),
      ...vca(88, 64, 96),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.08, 44, 'PER-VOICE'),
    ],
  },
  {
    id: 'muse-texture-dirty',
    role: 'texture',
    character: 'dirty',
    voice: 'timbre',
    verified: false,
    title: 'Noise and ring modulator held under a random LFO, overload wide open',
    params: [
      ...voice('OFF', 'OFF', 62),
      ...midiSetup(),
      ...osc1("8'", 0, 96, 44, 74),
      ...osc2("2'", -5, 102, 40, 78, 'ON'),
      ...modOsc('ON', 'NOISE', 96, 40, { osc1: 'ON', osc2: 'ON' }, 44, { f1: 'ON', f2: 'ON' }),
      ...mixer(72, 92, 70, 56, 84, 120, 'HIGH'),
      ...filters('PAR', 'ON', 40, 66, 50, 'OFF', 76, 58, 46, 'OFF'),
      ...filterEnv(92, 84, 58, 104),
      ...vcaEnv(96, 82, 108, 110, 'OFF'),
      ...vca(84, 64, 88),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('RANDOM', 1.6, 60, 'PER-VOICE'),
    ],
  },

  // ---- arp: the one role that reaches the ARPEGGIATOR --------------------
  {
    id: 'muse-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'timbre',
    verified: false,
    title: 'Triangle pluck through two octaves, gates short, nothing on the tail',
    params: [
      ...voice('OFF', 'OFF', 14),
      ...midiSetup(),
      ...osc1("8'", 0, 10, 64, 20),
      ...osc2("4'", 0, 16, 64, 24, 'OFF'),
      ...mixer(98, 0, 88, 0, 0, 0),
      ...filters('SER', 'OFF', 66, 24, 54, '1:1', 74, 18, 40, '1:2'),
      ...filterEnv(0, 44, 8, 30),
      ...vcaEnv(0, 46, 12, 34, 'ON'),
      ...vca(98, 64, 44),
      ...arp('ORD', 2, 34, 'STRGHT'),
      ...sharedDelay(),
      ...delayRouting('ON'),
    ],
  },
  {
    id: 'muse-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'timbre',
    verified: false,
    title: 'Sawtooth over four octaves in random order, filter tracking, long repeats',
    params: [
      ...voice('OFF', 'OFF', 22),
      ...midiSetup(),
      ...osc1("8'", 0, 120, 72, 104),
      ...osc2("4'", 2, 116, 76, 100, 'OFF'),
      ...mixer(94, 0, 92, 0, 8, 0),
      ...filters('PAR', 'ON', 36, 38, 70, '1:1', 104, 40, 58, '1:1'),
      ...filterEnv(0, 50, 6, 36),
      ...vcaEnv(0, 48, 10, 40, 'ON'),
      ...vca(96, 64, 78),
      ...arp('RND', 4, 22, 'COMBO'),
      ...sharedDelay(),
      ...delayRouting('ON'),
    ],
  },
]

// ---------------------------------------------------------------------------
// §2.3 Manifest
// ---------------------------------------------------------------------------

/**
 * The seven roles one timbre of this synthesizer can honestly claim.
 *
 * `pad`, `stab` and `texture` are polyphonic uses of four voices; `lead`, `bass-mid` and `sub` are
 * the monophonic ones, and each says so with `MONO` and `patchPolyphony: 1` rather than by
 * implication. `arp` is here — and is *not* here for the minilogue xd — because this box's
 * arpeggiator is a sequenced part rather than a keyboard effect: it has its own `CLOCK DIV` off
 * the global tempo (p.68), sixteen step buttons that program rests, a `LENGTH` reaching 64 steps,
 * a per-step `GATE LENGTH` and `GATE PROB`, and a `HOLD` key so it runs without hands (pp.68-71).
 *
 * The percussion roles are absent for a reason the box states about itself: two envelopes and two
 * filters per voice, both normalised, cannot give a noise transient an independent pitched body,
 * so `kick`, `snare`, `clap` and `rim` would be claiming two voices out of one. `acid` is absent
 * because the roles it wants — a resonant lowpass with per-step slide and accent — need a
 * sequencer this manifest does not model.
 */
const TIMBRE_ROLES = ['pad', 'stab', 'lead', 'bass-mid', 'sub', 'texture', 'arp'] as const

export const device: Device = {
  id: 'moog-muse',
  name: 'Muse',
  maker: 'Moog',
  kind: 'synth',

  /**
   * Both directions, three transports, and the two directions are not the same set — see the
   * module note. `preferredSource` is not claimed (§7.4): this box can drive a rig and nothing in
   * the document says that is its job.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    sendTransport: ['midi-din', 'analog-clock'],
    receiveTransport: ['midi-din', 'usb', 'analog-clock'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'CLOCK MORE > MIDI CLOCK OUT',
        value: 'ON',
        note: 'Defaults to OFF, so nothing leaves the MIDI OUT until this is set',
      },
      {
        transport: 'analog-clock',
        path: 'CLOCK MORE > CLOCK OUT SOURCE',
        value: 'INT CLOCK',
        note: 'The default; STRT/STOP follows MIDI transport instead',
      },
    ],
  },

  capabilityEvidence: {
    'clock.canSendClock': {
      kind: 'manual',
      source: `${MANUAL}, p.66`,
    },
    'clock.canReceiveClock': {
      kind: 'manual',
      source: `${MANUAL}, p.66`,
    },
    'clock.transport': {
      kind: 'manual',
      source: `${MANUAL}, pp.26, 66`,
    },
    /**
     * §2.6/#120, §7.4/#80. Read and silent, which is `unknown` rather than a claim either way.
     * p.65 says the CLOCK section *"establishes the global tempo for Muse"* — about itself — and
     * pp.66-67 give a rich set of outputs a rig could follow. Capability on both sides, and no
     * sentence anywhere saying whether driving a rig is what this box is for.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.66 gives both halves as capabilities — `MIDI CLOCK OUT (OFF, SEQ, ON. DEFAULT: OFF)` and `CLOCK SOURCE (AUTO, INTERNAL, ANALOG, MIDI IN, USB. DEFAULT: AUTO)` — and p.65 describes the CLOCK section as establishing the tempo "for Muse"; nothing states a role in a rig, and the send half defaulting to off argues mildly against one',
    },
    'clock.sourceSetup[midi-din]': {
      kind: 'manual',
      source: `${MANUAL}, p.66`,
    },
    'clock.sourceSetup[analog-clock]': {
      kind: 'manual',
      source: `${MANUAL}, pp.66-67`,
    },
    'io.main': { kind: 'manual', source: `${MANUAL}, p.117` },
    'io.individualOuts': { kind: 'manual', source: `${MANUAL}, p.117` },
    /**
     * `cited-against`, and this is the state that carries a page because the document answers no.
     * p.117's REAR PANEL block lists audio outputs, headphones, pedal inputs, CV inputs, CV
     * outputs; p.118 adds clock in, clock out, MIDI and the two USB ports. There is no audio input
     * of any kind. p.26's connector walkthrough lists the same fourteen and no other.
     */
    'io.audioIn': {
      kind: 'cited-against',
      cite: { kind: 'manual', source: `${MANUAL}, pp.26, 117-118` },
      reason:
        "p.26 walks every rear connector and pp.117-118's REAR PANEL block lists them again — audio outputs, headphones, two pedal inputs, two CV inputs, two CV outputs, clock in, clock out, MIDI in/out/thru, two USB ports and the IEC. Fourteen jacks and not one of them takes audio; the pedal inputs are TRS control, not a signal path",
    },
    'io.usbAudio': {
      kind: 'cited-against',
      cite: { kind: 'manual', source: `${MANUAL}, p.118` },
      reason:
        'p.118 gives both ports as MIDI and only MIDI — `USB B: USB-B connector for interfacing with a computer or other host MIDI device` and `USB A (HOST): USB-A connector for connecting to other instruments with Muse as the MIDI host` — and the MIDI line beside them reads `5 Pin DIN MIDI IN, OUT, THRU; MIDI over USB`, with no audio class mentioned anywhere',
    },
    voices: { kind: 'manual', source: `${MANUAL}, pp.8, 106, 116` },
    'features.lfo': { kind: 'manual', source: `${MANUAL}, pp.52, 57-58, 63` },
    /**
     * §2.6/#111. **`cited-against`, and the reason is that this field asks a question about audio
     * that this box does not answer yes to.**
     *
     * The tempting reading is `shipped-library`: p.12 says *"Muse ships with a total of 224
     * bi-timbral patches… grouped thematically into 14 banks"* and names all sixteen banks (MUSE,
     * CLASSIC, FAST PAD, SLOW PAD, KEYS, PLUCK, METAL, BASS, LEAD, SPLITS (1), SPLITS (2), ARP,
     * CINEMATIC, ODDITY, and two empty USER banks), while never printing one of the 224 patch
     * names — which looks exactly like factory content a document does not enumerate.
     *
     * It is the wrong field. `DeviceContent` is *"whether the box ships usable audio at all"*, the
     * companion to `Recipe.sourceAudio`, and `contentNotice` renders nothing unless some recipe
     * loads audio. A factory patch here is a set of panel positions, not a file: p.116 gives
     * `SOUND ENGINE  Analog`, the module list has no sample player, and pp.26/117-118 show no
     * audio input to record one through. No recipe on this device carries `sourceAudio` and none
     * can, so declaring `shipped-library` would put a claim in the manifest that can never reach a
     * reader — the unreachable-declaration failure `test/device-content.test.ts` exists to catch.
     *
     * The 224 patches are still worth a reader's time, and they reach them through `hints`
     * (`init-patch`, `save-patch`) rather than through a field about sample libraries.
     */
    content: {
      kind: 'cited-against',
      cite: { kind: 'manual', source: `${MANUAL}, pp.12, 116-118` },
      reason:
        'p.116 gives `SOUND ENGINE  Analog` and lists every module — oscillators, ring modulator, noise, mixer, filters, envelopes, VCA, delay — with no sample player among them, and pp.117-118 show no audio input of any kind; the 224 factory patches p.12 counts are stored panel settings rather than audio a recipe could load, so no recipe here carries `sourceAudio`',
    },
    noteDuration: { kind: 'manual', source: `${MANUAL}, p.84` },
    /**
     * §3.1/#324. **A reading that finished and came back empty**, which is `unknown` and not a
     * page: the claim is that no page pairs a panel mark with a value, and no document asserts
     * that. The pages read are in the reason, and both renderers print them.
     *
     * The two halves of the reading are in there because they are what makes it a finding rather
     * than a shrug — the drawings say marks exist, Appendix A says values exist, and the join
     * between them is what is missing.
     */
    controlPositions: {
      kind: 'unknown',
      reason:
        "the module drawings show what the panel prints beside a continuous control — p.28's WAVE MIX knobs carry a tick arc with waveform symbols at the two ends and its FM AMOUNT knob one labelled `1◂2` and `1▸2`, p.33's six MIXER faders carry horizontal lines with no figures against them, and p.38's CUTOFF, VCA LEVEL, PAN, FEEDBACK and MIX carry the same unnumbered tick arcs — while Appendix A (pp.120-122) gives every one of them a CC number over `0-127`; no page in either set pairs a mark with a value, and the manual documents no on-screen readout when a panel control is turned (p.90's encoders are the PROGRAMMER's)",
    },
  },

  /**
   * §3.1/#324. **The panel prints marks, and not one of them names a value.**
   *
   * `controls` is deliberately not *"the rotary controls"*, which is what #325 said and what the
   * panel disproves: p.33 draws the MIXER as six vertical faders and p.28 calls WAVE MIX *"2
   * knobs and a slider"*, so seven of the 33 controls this covers are not rotary at all. They are
   * in the same state as the knobs — a mark to move to, and no page saying what value it is — and
   * a notice worded around knobs would silently drop them.
   *
   * `mapped` is the eight the claim must not reach (#325). The ENVELOPE faders are drawn with
   * five lines on p.38 and p.19 reads the second from the bottom as 25%, which is a printed
   * setting, so telling a reader there is none would be false where it matters most: they are the
   * controls a reader is most likely to want to set by hand while playing.
   */
  controlPositions: {
    kind: 'unmapped',
    controls: 'The knobs, and the MIXER and WAVE MIX faders',
    markings: 'unnumbered ticks and lines',
    exact: 'MIDI CC',
    /**
     * The one positive claim here, and the only cited one: p.19 sets the FILTER ENVELOPE's four
     * sliders *"to around 25% (or the second line from the bottom)"*, which pairs a printed
     * position with a value in the manual's own words. p.38 draws both banks with five lines
     * across four faders, so the second from the bottom is a quarter of the travel.
     */
    mapped: {
      controls:
        'the FILTER and VCA ENVELOPE faders, where the second printed line from the bottom is 25%',
      cite: { kind: 'manual', source: `${MANUAL}, pp.19, 38` },
    },
  },

  /**
   * §8/#65. **A length per note, not per step, and not a tie.**
   *
   * p.84's `GATE` page: *"The GATE page displays the gate lengths of all notes in the current
   * step… Press down on the SELECT encoder and you can select notes individually for editing…
   * Gate lengths may be set anywhere from a minimum of 1 to 100 as a percentage of the step
   * length, or from the full step length (1S) up to the max length of the current sequence."* A
   * step holds up to eight notes and each carries its own gate, so this is finer than per-step.
   *
   * **No `unit` is declared, and that is the honest reading rather than an omission.** The control
   * has two printed regimes on one value — `1`-`100` as a percentage of the step, then `1S` upward
   * counted in whole steps — and p.84's own screen shows `50` and `16S` side by side in one row. A
   * single unit string would name one of the two and make the other a lie, and §3's rule is that a
   * stated unit is a claim. `1S` is not `1`, and `100` is not `1S`.
   *
   * **`TIE` is a preset of this control, not a second mechanism.** p.84: *"Sets gate length to a
   * maximum value of 1S (i.e. the entire length of the step) and will not retrigger the envelopes
   * of that voice in the next step."* Length past one step comes from the `nS` value; the tie only
   * pins the gate and suppresses the retrigger, so `tied-steps` would be the wrong kind.
   *
   * The arpeggiator's `GATE LENGTH` is a different control and does not answer this: it is *"a
   * gate length globally for every STEP"* (p.70), one setting for the whole pattern, which is why
   * the `arp` recipes carry it as an ordinary param and this field cites the sequencer instead.
   */
  noteDuration: { kind: 'per-note-value', control: 'GATE' },

  /**
   * `MAIN OUT LEFT (MONO)` and `MAIN OUT RIGHT`, 1/4" TRS (p.117), and nothing else — the
   * headphone jack on the front edge of the Left-Hand Controller carries the same signal. No audio
   * input and no USB audio; both are `cited-against` above rather than merely unclaimed.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * 990 mm across, from the `DIMENSIONS  (W x D x H): 99 x 42 x 11 (cm)` line on p.118. See
   * `panel.ts` for the aspect check that picks the width out of those three figures, and for the
   * 23.07 mm white-key pitch that independently confirms it.
   */
  physical: { panelSpanMm: 990, verified: cite(118) },

  panel: MUSE_PANEL,

  /**
   * §10/#263. **The one box in the library with a tuning routine a player runs.**
   *
   * p.112: QUICK TUNE *"touches up the tuning for the current temperature conditions and takes a
   * few seconds"*, and Moog note that it saves its measurements, so the more environments it is
   * run in the more robust the instrument's tuning becomes. That is a thing to do during a
   * session, which is why it is `quickTune` and reaches the guide rather than only the device
   * page.
   */
  quickTune: {
    note: 'Touches up tuning for the current temperature; takes a few seconds',
    path: 'PROGRAMMER > TUNING > START QUICK TUNE',
    verified: cite(112),
  },

  /**
   * §10/#263. **The same page, and the opposite claim.** Full TUNING and AUTOCAL sit beside QUICK
   * TUNE under *"the instrument is calibrated & tuned at the factory in a controlled environment,
   * so do not run full TUNING or AUTOCAL unless there is a significant problem that cannot be
   * solved by other means"*. A pointer, never steps — see the `Calibration` type. Putting both in
   * one field would have blurred exactly the distinction that makes either safe to print.
   */
  calibration: {
    summary: 'Full TUNING and AUTOCAL, beside the quick tune on the same settings page',
    caution:
      'Moog say the instrument is calibrated and tuned at the factory, and not to run full TUNING or AUTOCAL unless there is a significant problem that cannot be solved by other means',
    verified: cite(112),
  },

  manual: { title: "Moog Muse User's Manual", edition: 'Version 1.4.0' },

  productPage: 'https://www.moogmusic.com/synthesizers/muse/',

  /**
   * **Two timbres, four notes each.** The module note is the long form; the short form is that the
   * eight voices are shared between two independent patches whose counts always sum to eight
   * (p.106), so four is the count each one can rely on whatever the other is doing.
   */
  voices: [
    {
      kind: 'pool',
      id: 'timbre',
      label: 'Timbre',
      count: 2,
      roles: [...TIMBRE_ROLES],
      polyphony: 4,
    },
  ],

  features: {
    /**
     * Five: LFO 1 and LFO 2 on the panel, the PITCH LFO beside them, and the two global LFOs
     * p.52 adds — *"Muse also contains two global LFOs G LFO 1, G LFO 2 which have all the
     * parameters of the main LFOs and are assignable via the MOD MAP."* All are syncable to the
     * global tempo (`SYNC (ON, OFF. DEFAULT: OFF)`, p.57). The destinations named here are a
     * readable few off the 69-entry printed list on pp.101-102, which is complete.
     */
    lfo: {
      count: 5,
      syncable: true,
      destinations: ['pitch', 'filter-cutoff', 'pulse-width', 'vca-level', 'pan', 'delay-time'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'edit-submenu': 'Press MORE in that section',
    'timbre-select': 'Light TIMBRE A or B first',
    'voice-count': 'PROGRAMMER, VOICE CONTROL, MORE',
    'midi-settings': 'PROGRAMMER, MENU, MIDI',
    'init-patch': 'Press INIT for a blank patch',
    'save-patch': 'SAVE, name it, CONFIRM',
    'arp-steps': 'Press ARP, then buttons 1-16',
  },

  recipes,
}
