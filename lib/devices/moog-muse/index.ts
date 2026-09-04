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
 * ## The scale problem, and the decision taken — twice
 *
 * **This panel prints almost no numbers.** Sweeping the modules end to end, the manual gives a
 * printed scale for `FREQUENCY` (±7 semitones, p.27 and p.116), `OCTAVE` (`16' 8' 4' 2'`, p.28),
 * the waveform and mode option lists, `TEMPO` (30–300 BPM, p.65), and the MORE-menu settings —
 * and for **nothing else**. There is no Hz figure for either filter cutoff, no dB/oct slope, no
 * time unit of any kind for any envelope stage, no scale on any mixer fader, no delay time.
 * Every one of those is described by behaviour and by knob position.
 *
 * So this manifest was first authored on **Appendix A: MIDI CC, pp.120-122** — the one place Moog
 * publishes a numeric range per named parameter, a three-column `MIDI CC | MUSE CONTROL | RANGE`
 * table in which every row is populated — at `0-127` for every control the panel does not number.
 *
 * **#349 corrected that from the hardware.** The alternative the first pass rejected was percent,
 * on the grounds that *"`0-100%` is never printed as a range for these controls, so authoring
 * against it would be inventing a bound and calling it cited"*. The reasoning was sound and its
 * premise was wrong: **this box puts the value on its screen as the control is turned**, so a
 * reader standing at the machine can see it. `0-100 %` is not an invented bound, it is the scale
 * actually in force; `0-127` is the one nobody can see.
 *
 * The reading was taken control by control until every one of the 41 had an answer, and it is not
 * one scale:
 *
 * ```
 * percent    37   every oscillator, resonance, envelope stage, level, amount, pan, detune,
 *                 mixer and delay macro control
 * Hz          2   FILTER 1 · CUTOFF, FILTER 2 · CUTOFF
 * divisions   2   DELAY · TIME - L / R, under the CLOCK SYNC every recipe engages — #346
 * ```
 *
 * There is no shorter rule than that list. The reading's own working assumption — that a control
 * with a real quantity behind it shows a unit — died on `MOD OSC · FREQUENCY`, which is a
 * frequency and reads in percent. See `OBSERVED` for what the finding covers and the one control
 * in it that is inferred.
 *
 * The first two families are authored here on the scale the screen shows, cited `observed` —
 * *"somebody who turned the knob and read the limits, with the firmware version in the source
 * string"*. **The third is not**, and stays on the Appendix A scale it was already wrong on:
 * naming the division a knob lands on is #346's job and needs a reading nobody has taken.
 *
 * **What this did not license, and it is the whole discipline of the change: no value here was
 * converted.** `CC 46 = 120` did not become `94 %`. That arithmetic assumes CC value and displayed
 * percent are linearly related, which no page states and which is usually false on an analog
 * instrument — the same error an earlier draft made in the other direction, reading every value as
 * *"58% of the control's travel"*. §3.1's split is what makes re-authoring honest instead: the
 * **range** is a claim, and it is now observed rather than cited to a CC row; the **point** always
 * was taste (`verified: false` on every one of them). So each point below was *re-made* as a taste
 * judgment on the scale the reader can see, not carried across from the scale it was made on.
 *
 * **The CC numbers stay.** `midiCc` is retained wherever it was, because the Appendix A row is
 * still true — CC 67 still addresses FILTER 1 · CUTOFF — and it is what identifies a control to
 * anything automating it. What is gone is the *value* half of the instruction: `Send MIDI CC 67 =
 * 74` told a reader to send a number that is no longer the number on the line, and sending it now
 * lands somewhere unknown. `resolveParam` names the controller and asserts no value.
 *
 * `RECIEVE CC` stays in `midiSetup()` for the same reason. p.111 gives it as `(ON/OFF. DEFAULT:
 * OFF)`, so a box out of the case ignores CC until it is switched on — which still matters to
 * anything driving these controls, even though the guide no longer prints a value to send.
 *
 * ## Mood on a logarithmic scale, and the shape an offset has to have there
 *
 * §6 *adds* an offset to a value, so an offset is a fixed distance in the parameter's own units.
 * On percent that is already a musical statement — *a fifth of the travel* — and the five percent
 * controls that carry mood say their judgment in those words at each declaration.
 *
 * **On Hz it is not, and the fix is in the authoring rather than in the engine.** Both cutoffs
 * carried `darkness: -30` on the CC scale, which meant a third of that span. As a number of Hz,
 * one constant is most of the filter at 300 and inaudible at 6 k, so no single number can serve
 * both cutoffs of eighteen recipes. The distance that *is* fixed on a logarithmic scale is an
 * interval, and an interval is a ratio, so the amount is authored as a share of the point it
 * moves:
 *
 * ```
 * mood: [{ axis: 'darkness', amount: -Math.round(cutoff / 2) }]
 * ```
 *
 * **Halving a frequency is dropping an octave, at every frequency.** At full darkness a 6 kHz pad
 * lands on 3 kHz and a 160 Hz sub lands on 80 Hz — the same musical move on both, which `-30`
 * could never be. The engine still adds a constant; the logarithm is done once, here, where the
 * cutoff is known. `moog-subsequent-37` and `behringer-neutron` author the same shape at `0.45`,
 * and `akai-mpc-live-iii` hand-writes the ratio per recipe, so this is the library's existing
 * answer rather than a new mechanism.
 *
 * **The move is not symmetrical, and saying so is part of the claim.** §6.1 scales the amount by
 * how far the knob is from centre and flips its sign below it, so full brightness adds `+cutoff/2`
 * — a factor of 1.5, which is a fifth rather than an octave. An additive engine cannot be
 * symmetrical on a logarithmic parameter, and an octave down is the direction the axis is named
 * for. The alternative would be a multiplicative offset, which is an engine change and is not
 * needed for the move this axis is asked to make.
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
 *    usable as a range. The screen sidesteps the question by not showing a frequency at all: it is
 *    **percent**, confirmed at #349 against the expectation that a control with a real quantity
 *    behind it would show one. `AUDIO` is still carried beside it, because it decides what the
 *    oscillator *is* and how far a given percentage reaches.
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

/**
 * `0-127`, the Appendix A value space — **now used by two controls only**, `DELAY · TIME - L` and
 * `TIME - R`. Every other control that was authored on it moved to the scale its screen shows at
 * #349; those two show clock divisions under the `CLOCK SYNC` every recipe engages, and naming a
 * division is #346's job rather than this one's. They stay on the wrong scale, visibly, rather
 * than being quietly relabelled onto a right-looking one.
 */
const CC: Omit<NumericRange, 'verified'> = { min: 0, max: 127 }

/**
 * #349, and the first use of `observed` on any device in the library (#329).
 *
 * The kind exists for *"somebody who turned the knob and read the limits, with the firmware
 * version in the source string"*, and that is what this is. **The reading covered the panel and
 * settled every one of the 41 controls Appendix A numbers**, at firmware 1.4.0:
 *
 * ```
 * percent    37   every oscillator, resonance, envelope stage, level, amount, pan, detune,
 *                 mixer and delay macro control
 * Hz          2   FILTER 1 · CUTOFF, FILTER 2 · CUTOFF
 * divisions   2   DELAY · TIME - L / R, under the CLOCK SYNC every recipe engages
 * ```
 *
 * **It is a finding rather than a sample, and it was taken as one.** It ran until it had an answer
 * for every control, which is why it is quotable as the scale in force: the working assumption
 * partway through was that a control with a real quantity behind it would show a unit, and
 * `MOD OSC · FREQUENCY` broke it by reading in percent. There is no rule to derive from, only the
 * panel, and the panel was gone over.
 *
 * **One control is inferred rather than seen: `FILTER 2 · CUTOFF`**, from `FILTER 1 · CUTOFF` on
 * the same module. Two identical ladders behind one pair of knobs, and the manual describes them
 * as a pair throughout (pp.35-37).
 *
 * **The firmware is in the string and is not decoration.** A screen readout is a property of the
 * software, and 1.4.0 is the version the reading was taken on — the same version the manual this
 * folder otherwise cites is written for, which is why the two agree about everything else.
 */
const OBSERVED: Cite = { kind: 'observed', source: 'Muse, firmware 1.4.0' }

/** `0-100 %`, what the screen shows for 37 of the 41 controls Appendix A numbers (#349). */
const PERCENT: NumericRange = { min: 0, max: 100, verified: OBSERVED }

/**
 * `20 Hz - 20 kHz`, the two filter cutoffs, which are the one family on this panel that does not
 * read in percent. Full audio range, which is what every other Moog ladder in this library is
 * authored over — `moog-mother-32` has it from a printed sentence, *"change the Filter's Cutoff
 * frequency from 20Hz to 20kHz"*, and this box prints no such sentence anywhere.
 *
 * **The scale is logarithmic and nothing here declares that**, because `NumericRange` has no
 * field for it and does not need one to render a value: a cutoff of `450 Hz (20…20000 Hz)` reads
 * correctly whatever the taper. Where it matters is mood, and the answer is in the *amount* rather
 * than in the type — `-Math.round(cutoff / 2)`, an octave, which is a fixed interval at every
 * frequency where a fixed number of Hz is not. See the module note.
 */
const CUTOFF_HZ: NumericRange = { min: 20, max: 20000, verified: OBSERVED }

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
 * A control the panel does not number and the screen reads as a percentage. The **range** is the
 * observed one; the **point** is taste, as it always was.
 *
 * **Every value that goes through here was re-made at #349 rather than converted** — see the
 * module note for why converting would have been the same error in a new coat. What a number here
 * says is *where on this control's travel this sound sits*, which is what the CC number was
 * standing in for and what the screen now states outright.
 *
 * **`midiCc` is still declared and no longer carries a value.** The Appendix A row is unchanged
 * and CC 46 still addresses this control, so the number is worth keeping for anything automating
 * the box; what it cannot do any more is tell a reader what to send, because the number beside it
 * is a percentage and no page maps one onto the other. `resolveParam` writes `MIDI CC 46` and
 * stops there.
 */
function cc(name: string, value: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
  return percentParam(name, value, ccNumber, extra)
}

/**
 * The eight ENVELOPE faders: FILTER ENVELOPE and VCA ENVELOPE, ATTACK/DECAY/SUSTAIN/RELEASE,
 * CC 79-82 and 86-89. **The one group on this panel with two agreeing scales**, which is why the
 * name survives a change that made it build exactly what `cc` builds.
 *
 * Two pages, both checked against the rendered PDF rather than a text dump:
 *
 *  - **The panel prints a scale.** PDF p.38, the ENVELOPES module drawing: each bank of four
 *    vertical faders is crossed by five horizontal lines — bottom, three between, top, so four
 *    equal intervals to count along. The rotary controls drawn in the same figure (CUTOFF, VCA
 *    LEVEL, PAN, FEEDBACK, MIX) carry at most an unnumbered tick arc, and on PAN an `L 0 R`
 *    centre mark; none of that names a value.
 *  - **And a page maps a position to a value.** Printed p.19: *"the ATTACK, DECAY, SUSTAIN, and
 *    RELEASE sliders of the FILTER ENVELOPE all set to around 25% (or the second line from the
 *    bottom)"*. Five lines, four intervals, so the second from the bottom is 25% — the manual
 *    states the mapping and demonstrates it in one sentence.
 *
 * **p.19 is in percent, and since #349 so is the value.** That is the one place in this manifest
 * where the manual and the instrument turn out to have been saying the same thing all along, and
 * it is a check on the re-scaling rather than a coincidence: a fader authored at `25` here is the
 * second printed line from the bottom, in the manual's own words, on the panel in front of the
 * reader. Nothing in this file converts between the two, because there is nothing to convert.
 *
 * **The device-level notice these eight were the exception to is gone** (#349, see the note at
 * `controlPositions` below), and with it the one place the guide printed p.19's mapping. This
 * helper is now where that reading lives: *the second printed line from the bottom is 25%*, from
 * printed p.19 and PDF p.38, true of these eight faders and of nothing else on the panel.
 * `test/moog-muse.test.ts` pins the set at eight, so a control moved between the two helpers is a
 * failing test rather than a quiet change to what the box claims about its own panel.
 */
function fader(name: string, value: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
  return percentParam(name, value, ccNumber, extra)
}

/** What both percent paths share: the observed range, the taste point, and the CC number. */
function percentParam(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra,
): AuthoredParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: PERCENT,
    verified: false,
    unit: '%',
    ...extra,
    midiCc: ccNumber,
  }
}

/**
 * A filter cutoff, in Hz, on the observed range — the two controls on this panel the screen does
 * **not** read in percent (#349).
 *
 * The value is taste like every other point here, and the honest reading of what a number means
 * is *the corner this patch sits at*, not a knob position: the panel's arc is unnumbered and the
 * taper is unstated, so the screen is the only way to land on one of these exactly.
 *
 * `HIGH PASS` reverses which side of the knob is open (p.19), and the recipe carries it, so a
 * value here is the corner frequency either way rather than an amount of opening.
 *
 * **`darkness` is declared by `filters`, not here**, because the amount is a function of the point
 * and this helper does not choose the point. Passing it in is what makes the ratio visible at the
 * call site: an author reading `filters()` sees the cutoff and the octave it drops together.
 */
function cutoff(name: string, hz: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
  return {
    kind: 'numeric',
    name,
    value: hz,
    range: CUTOFF_HZ,
    verified: false,
    unit: 'Hz',
    ...extra,
    midiCc: ccNumber,
  }
}

/**
 * A control still on the Appendix A scale, which since #349 is the two `DELAY · TIME` knobs and
 * nothing else. The **range** is cited to the Appendix A row; the **point** is not, because no
 * page says where to set anything — and under `CLOCK SYNC` the knob steps through divisions the
 * manual never enumerates, which is #346 and is not fixed here.
 */
function ccScale(name: string, value: number, ccNumber: number, extra: NumExtra = {}): AuthoredParam {
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
      // #349, re-derived as travel: a fifth of the knob is an audible arrival of cross-modulation
      // that still leaves the note recognisable as the one the patch started from.
      mood: [{ axis: 'grit', amount: 20 }],
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
      // #349, re-derived as travel: a quarter of the fader, which takes the ring modulator from a
      // tint under the oscillators to plainly one of the voices in the mix.
      mood: [{ axis: 'grit', amount: 25 }],
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
    cutoff('FILTER 1 · CUTOFF', cutoff1, 67, {
      mood: [{ axis: 'darkness', amount: -Math.round(cutoff1 / 2) }],
    }),
    cc('FILTER 1 · RESONANCE', res1, 68, { note: 'Self-oscillates into a sine fully clockwise' }),
    cc('FILTER 1 · ENVELOPE AMOUNT', env1, 69, { note: 'Bipolar, no modulation at noon' }),
    sw('FILTER 1 · KB TRACKING', kb1, KB_TRACKING, 36),
    cutoff('FILTER 2 · CUTOFF', cutoff2, 72, {
      mood: [{ axis: 'darkness', amount: -Math.round(cutoff2 / 2) }],
    }),
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
 * than `cc`. Since #349 both helpers build the same percent parameter, and p.19's quotation is now
 * in the *same unit as the value beside it* — a fader authored at `25` is the second line from the
 * bottom, which is what the page says. That is the one corner of this manifest where the manual
 * and the instrument agree outright.
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
    // #349, re-derived as travel: a sixth of the fader down, enough to get notes out of each
    // other's way in a busy bar without turning the part staccato. Down four of the five printed
    // intervals would be that; this is well inside one of them.
    fader('VCA ENV · DECAY', decay, 87, { mood: [{ axis: 'density', amount: -15 }] }),
    fader('VCA ENV · SUSTAIN', sustain, 88),
    // #349, re-derived as travel: a fifth of the fader up, which carries the tail into the delay
    // rather than ending the note in front of it.
    fader('VCA ENV · RELEASE', release, 89, { mood: [{ axis: 'space', amount: 20 }] }),
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
 * Neither scale is printed in either mode, and the screen reads these two as divisions rather than
 * as the percentage every other macro here shows — so they are the two controls #349 left on the
 * CC scale for #346 to answer.
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
    // #346/#349. The only two controls left on the Appendix A scale, and deliberately so: under
    // the CLOCK SYNC above they step through divisions, which is neither the CC value written here
    // nor a percentage. Relabelling them would hide that; #346 is where it gets answered.
    ccScale('DELAY · TIME - L', 48, 93, { scope: 'song' }),
    ccScale('DELAY · TIME - R', 72, 94, { scope: 'song' }),
    cc('DELAY · FEEDBACK', 40, 103, { scope: 'song', note: 'Single repeat through to infinite' }),
    // `50`, and it has to be exactly that: the note names noon, and on a 0-100 readout noon is
    // 50. On the old CC scale it was 64 for the same reason, which is the one place in this file
    // where re-authoring and converting would have agreed.
    cc('DELAY · CHARACTER', 50, 104, {
      scope: 'song',
      note: 'Noon, where the default DJ-style filter on the repeats is doing nothing',
    }),
    // #349, re-derived as travel: a quarter of the knob, from a wash you notice only when it
    // stops to a delay that is part of the arrangement.
    cc('DELAY · MIX', 30, 105, { scope: 'song', mood: [{ axis: 'space', amount: 25 }] }),
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
/**
 * §3 Recipes. Eighteen, over seven roles — and one set serves both timbres.
 *
 * **Each point is read off the recipe's own title and the control's own note, and the numbers moved
 * a long way at #349 when that was done properly.** Three examples, because they are the check
 * anyone should apply to the rest:
 *
 *  - `muse-pad-soft` is *"two triangles"*, so `TRI/SAW` is `0` — the triangle end of the blend —
 *    and `WAVE MIX` is `0`, the tri/saw side of the slider against the pulse. It had carried a
 *    value that put most of a pulse wave into a patch whose title says there is none.
 *  - `muse-pad-bright` is a *"sawtooth pair"*, so `TRI/SAW` is `100` and `WAVE MIX` is again `0`.
 *    The two controls do not move together and reading the note is the only way to know it.
 *  - `muse-sub-clean` wants no filter envelope at all, and `ENVELOPE AMOUNT` is bipolar with none
 *    at noon, so it is `50`. It had been `0`, which on a bipolar control is not *off* — it is
 *    fully inverted, and it was the reading a unipolar assumption produces.
 *
 * **Percent points are multiples of five so a reader can land on them.** §8's reader is at the
 * machine with their hands on a knob and their eyes on the screen: *set it to 75* survives that
 * and `74` is a number they chase past. It is a legibility rule and it proves nothing on its own —
 * a converted value rounded onto the grid would sit on it just as neatly. What rules conversion
 * out is that these were chosen from the patch; the grid only makes them dialable.
 *
 * Where the manual anchors a position, the anchor is exact: a square wave is `50` on `PULSE WIDTH`
 * (p.19), a bipolar control at rest is `50`, a self-oscillating ladder is `100` on `RESONANCE`
 * (p.36). The cutoffs are in Hz and are corners rather than positions.
 */
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
      ...voice('OFF', 'OFF', 15),
      ...midiSetup(),
      // Triangles, so the blend is at its triangle end and no pulse is mixed in at all. PULSE
      // WIDTH is at the square position it rests at, inaudible behind a WAVE MIX of 0.
      ...osc1("8'", 0, 0, 50, 0),
      ...osc2("8'", 3, 0, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 10, 10, { osc1: 'ON', osc2: 'ON' }, 0, { f1: 'OFF', f2: 'OFF' }),
      // Two triangles into a clean ladder with no drive wanted: high enough to be present, short
      // of the unity gain p.19 puts at the top of the fader.
      ...mixer(65, 0, 65, 0, 0, 0),
      ...filters('STR', 'OFF', 1200, 15, 60, '1:2', 1400, 10, 55, '1:2'),
      ...filterEnv(65, 50, 60, 75),
      // "Nothing arriving at once" is the whole patch, and this is where it lives.
      ...vcaEnv(70, 50, 90, 80, 'ON'),
      ...vca(65, 50, 65),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.24, 20, 'PER-VOICE'),
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
      ...voice('OFF', 'OFF', 15),
      ...midiSetup(),
      ...osc1("16'", 0, 20, 50, 0),
      ...osc2("8'", -2, 20, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 10, 5, { osc1: 'ON', osc2: 'OFF' }, 10, { f1: 'ON', f2: 'OFF' }),
      // "Sixteen-foot underneath": the 16' is the body and the 8' sits below it. No noise, which
      // is top, and no ring modulator, which is more of it.
      ...mixer(70, 0, 60, 0, 0, 0),
      // Resonance is a peak, and a peak is something above the fundamental. Both low.
      ...filters('SER', 'OFF', 500, 10, 55, '1:2', 420, 10, 55, '1:2'),
      ...filterEnv(70, 60, 50, 80),
      ...vcaEnv(75, 55, 90, 85, 'ON'),
      ...vca(65, 50, 50),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.14, 15, 'PER-VOICE'),
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
      ...voice('OFF', 'OFF', 25),
      ...midiSetup(),
      // A sawtooth pair: the blend at its sawtooth end, and still no pulse in the mix.
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 4, 100, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 15, 10, { osc1: 'ON', osc2: 'ON' }, 15, { f1: 'OFF', f2: 'ON' }),
      // Saws are loud and the resonance needs headroom to sit above them.
      ...mixer(60, 0, 55, 0, 10, 0),
      // FILTER 1 is the highpass: a corner low enough to thin the bottom, and no envelope on it,
      // because sweeping a highpass corner reads as a filter sweep rather than as air. The
      // resonance the title is about is FILTER 2's, at the top.
      ...filters('PAR', 'ON', 180, 35, 50, '1:1', 6000, 45, 60, '1:1'),
      ...filterEnv(55, 60, 65, 70),
      ...vcaEnv(55, 55, 90, 75, 'ON'),
      ...vca(65, 50, 70),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.42, 20, 'PER-VOICE'),
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
      // huge and a triad is still a triad. No polyphony claim — see the module note. DETUNE is
      // what the stack is made of, so it is the one control here that is up.
      ...voice('ON', 'OFF', 30),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("8'", -3, 100, 50, 0, 'ON'),
      ...modOsc('OFF', 'SQUARE', 25, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(90, 15, 90, 0, 0, 40),
      // Clamped shut and opened by the envelope rather than by the knob: the corner sits under
      // the note and ENVELOPE AMOUNT well above noon is what throws it up on each attack.
      ...filters('SER', 'OFF', 300, 55, 85, '1:1', 450, 35, 70, '1:2'),
      // Nothing sustains: both envelopes are over before the key is.
      ...filterEnv(0, 20, 0, 15),
      ...vcaEnv(0, 25, 0, 20, 'ON'),
      ...vca(80, 50, 25),
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
      // A pulse-width pair: WAVE MIX all the way to the pulse side, and the width narrow either
      // side of the square at noon, which is where a pulse gets reedy rather than hollow.
      ...osc1("4'", 0, 0, 30, 100),
      ...osc2("4'", 2, 0, 35, 100, 'OFF'),
      ...modOsc('OFF', 'SINE', 30, 0, { osc1: 'OFF', osc2: 'OFF' }, 20, { f1: 'OFF', f2: 'ON' }),
      ...mixer(85, 0, 85, 10, 0, 0),
      ...filters('PAR', 'ON', 150, 25, 50, '1:1', 8000, 30, 75, '1:1'),
      ...filterEnv(0, 30, 0, 20),
      ...vcaEnv(0, 30, 0, 20, 'ON'),
      ...vca(80, 50, 45),
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
      ...voice('ON', 'OFF', 45),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 5, 100, 50, 0, 'ON'),
      ...fm('1>2', 55),
      ...modOsc('ON', 'SQUARE', 55, 20, { osc1: 'OFF', osc2: 'ON' }, 0, { f1: 'OFF', f2: 'OFF' }),
      // "Over the top of the mix" is a level instruction: the ring modulator is the loudest thing
      // in the fader bank, above both oscillators rather than beside them.
      ...mixer(70, 85, 70, 25, 15, 96, 'HIGH'),
      ...filters('SER', 'OFF', 700, 55, 70, '1:2', 800, 40, 60, '1:2'),
      ...filterEnv(0, 25, 10, 20),
      ...vcaEnv(0, 30, 10, 25, 'ON'),
      ...vca(75, 50, 35),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('RANDOM', 7.5, 20),
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
      // Under MONO, DETUNE differentiates the two oscillators' tracking rather than spreading
      // voices (p.105), so a moderate setting is a thickness rather than a chorus.
      ...voice('OFF', 'ON', 20),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("8'", 1, 100, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 20, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(75, 0, 70, 0, 0, 18),
      // Both corners above the line and KB TRACKING at 1:1, so the filter rises with the melody
      // instead of dulling its top octave.
      ...filters('SER', 'OFF', 2000, 30, 60, '1:1', 3200, 20, 55, '1:1'),
      ...filterEnv(5, 40, 55, 30),
      ...vcaEnv(5, 40, 90, 30, 'ON'),
      ...vca(80, 50, 0),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...pitchLfo(5.2, 50, 60, { osc1: 'ON', osc2: 'ON' }),
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
      ...voice('OFF', 'ON', 15),
      ...midiSetup(),
      // A square, which is the pulse at noon (p.19) with WAVE MIX fully across to it.
      ...osc1("8'", 0, 0, 50, 100),
      ...osc2("8'", -2, 0, 50, 100, 'ON'),
      ...modOsc('OFF', 'SINE', 20, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(85, 10, 85, 0, 0, 52),
      // "At the edge" is just short of the self-oscillation p.36 puts at fully clockwise, and the
      // envelope amount is the other half of the title.
      ...filters('SER', 'OFF', 550, 85, 90, '1:1', 900, 35, 60, '1:2'),
      ...filterEnv(0, 30, 25, 25),
      ...vcaEnv(0, 35, 90, 25, 'ON'),
      ...vca(85, 50, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...pitchLfo(6.4, 50, 55, { osc1: 'ON', osc2: 'ON' }),
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
      ...voice('OFF', 'ON', 40),
      ...midiSetup(),
      // Cross-modulation blurs the waveform anyway, so the blend is saw with a little pulse in it
      // rather than either extreme.
      ...osc1("8'", 0, 85, 50, 15),
      ...osc2("8'", 4, 85, 50, 15, 'OFF'),
      ...fm('2>1', 70, 10, 100),
      ...modOsc('ON', 'RAMP', 65, 25, { osc1: 'ON', osc2: 'OFF' }, 25, { f1: 'ON', f2: 'OFF' }),
      // "Driven into the mixer" is the instruction: both oscillators at the unity-gain end of
      // their faders, which is where p.19 says the drive is.
      ...mixer(95, 50, 95, 35, 15, 108, 'HIGH'),
      ...filters('SER', 'OFF', 800, 60, 65, '1:1', 750, 45, 55, '1:2'),
      ...filterEnv(5, 35, 35, 30),
      ...vcaEnv(0, 40, 85, 35, 'ON'),
      ...vca(75, 50, 0),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...pitchLfo(7.8, 70, 65, { osc1: 'ON', osc2: 'ON' }),
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
      // A bass wants the two oscillators tight against each other, so DETUNE is low.
      ...voice('OFF', 'ON', 10),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("16'", 0, 100, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 15, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(85, 0, 80, 0, 0, 34),
      // "Snapping the top off each note" is a large positive envelope amount on a corner that is
      // otherwise under the note, with a decay short enough to be a snap.
      ...filters('SER', 'OFF', 380, 40, 85, '1:2', 550, 20, 60, '1:2'),
      ...filterEnv(0, 25, 0, 20),
      ...vcaEnv(0, 35, 80, 20, 'ON'),
      ...vca(90, 50, 0),
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
      ...voice('OFF', 'ON', 5),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("8'", -1, 0, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 10, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(85, 0, 65, 0, 0, 20),
      // "Nothing above the fundamental" rules out both a resonant peak and a filter that opens,
      // so the envelope amounts are at the noon their note calls no modulation.
      ...filters('SER', 'OFF', 220, 10, 50, '1:2', 180, 5, 50, '1:2'),
      ...filterEnv(0, 40, 30, 30),
      ...vcaEnv(0, 45, 85, 30, 'ON'),
      ...vca(90, 50, 0),
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
      ...voice('OFF', 'ON', 35),
      ...midiSetup(),
      ...osc1("8'", 0, 90, 50, 10),
      ...osc2("16'", 3, 90, 50, 10, 'OFF'),
      ...fm('2>1', 45),
      ...modOsc('ON', 'SQUARE', 45, 0, { osc1: 'OFF', osc2: 'OFF' }, 20, { f1: 'ON', f2: 'OFF' }),
      // "Sitting under the note" puts the ring modulator well below the oscillators, which is the
      // opposite instruction to `muse-stab-dirty`'s and the same control.
      ...mixer(90, 40, 90, 20, 10, 114, 'HIGH'),
      ...filters('SER', 'OFF', 450, 50, 70, '1:2', 500, 35, 55, '1:2'),
      ...filterEnv(0, 30, 15, 25),
      ...vcaEnv(0, 40, 80, 25, 'ON'),
      ...vca(85, 50, 0),
      ...sharedDelay(),
      ...delayRouting('OFF'),
      ...lfo1('RANDOM', 5.5, 15),
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
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("16'", 0, 0, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 10, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      // "Nothing else in the mixer", said in the only place it can be said.
      ...mixer(95, 0, 0, 0, 0, 0),
      // A sub is a fundamental and nothing else: no resonant peak, and no envelope on either
      // corner, which is noon on a bipolar amount rather than zero.
      ...filters('SER', 'OFF', 160, 0, 50, '1:2', 130, 0, 50, 'OFF'),
      ...filterEnv(0, 40, 50, 30),
      ...vcaEnv(0, 50, 95, 30, 'OFF'),
      ...vca(95, 50, 0),
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
      // wave oscillator" — with KB TRACKING at 1:1 it plays. RESONANCE is `100` because fully
      // clockwise is what the page says, and ENVELOPE AMOUNT is `50` because an envelope on this
      // filter would bend the pitch of the sine rather than shape a tone.
      ...voice('OFF', 'ON', 0),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("16'", 0, 0, 50, 0, 'OFF'),
      ...modOsc('OFF', 'SINE', 10, 0, { osc1: 'OFF', osc2: 'OFF' }, 0, { f1: 'OFF', f2: 'OFF' }),
      ...mixer(0, 0, 0, 0, 0, 0),
      ...filters('SER', 'OFF', 200, 100, 50, '1:1', 140, 0, 50, 'OFF'),
      ...filterEnv(0, 40, 50, 30),
      ...vcaEnv(5, 45, 95, 35, 'OFF'),
      ...vca(90, 50, 0),
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
      ...voice('OFF', 'OFF', 30),
      ...midiSetup(),
      ...osc1("8'", 0, 10, 50, 0),
      ...osc2("8'", 6, 10, 50, 0, 'OFF'),
      // AUDIO off: eight independent per-voice LFOs, which is the whole point of this patch, so
      // the rate is at the bottom of the knob and the pitch amount is the audible one.
      ...modOsc('OFF', 'SINE', 5, 30, { osc1: 'ON', osc2: 'ON' }, 20, { f1: 'ON', f2: 'ON' }),
      ...mixer(60, 0, 60, 0, 15, 0),
      ...filters('STR', 'OFF', 600, 20, 55, '1:2', 700, 15, 55, '1:2'),
      ...filterEnv(85, 65, 60, 90),
      ...vcaEnv(90, 60, 90, 95, 'OFF'),
      // A texture sits under everything else, and the pair is wide.
      ...vca(55, 50, 85),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('TRIANGLE', 0.08, 35, 'PER-VOICE'),
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
      ...voice('OFF', 'OFF', 60),
      ...midiSetup(),
      ...osc1("8'", 0, 70, 50, 25),
      ...osc2("2'", -5, 70, 50, 25, 'ON'),
      ...modOsc('ON', 'NOISE', 70, 30, { osc1: 'ON', osc2: 'ON' }, 35, { f1: 'ON', f2: 'ON' }),
      // The title names the two loud things, so the oscillators are the support and the noise and
      // ring modulator are above them.
      ...mixer(40, 75, 40, 45, 85, 120, 'HIGH'),
      ...filters('PAR', 'ON', 160, 45, 50, 'OFF', 2200, 40, 60, 'OFF'),
      ...filterEnv(75, 60, 50, 85),
      ...vcaEnv(80, 60, 85, 90, 'OFF'),
      ...vca(55, 50, 80),
      ...sharedDelay(),
      ...delayRouting('ON'),
      ...lfo1('RANDOM', 1.6, 50, 'PER-VOICE'),
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
      ...voice('OFF', 'OFF', 5),
      ...midiSetup(),
      ...osc1("8'", 0, 0, 50, 0),
      ...osc2("4'", 0, 0, 50, 0, 'OFF'),
      ...mixer(70, 0, 60, 0, 0, 0),
      // A pluck is a filter envelope on an otherwise still corner.
      ...filters('SER', 'OFF', 1500, 15, 65, '1:1', 2000, 10, 55, '1:2'),
      ...filterEnv(0, 30, 0, 15),
      // "Nothing on the tail": no sustain and the shortest release on the device.
      ...vcaEnv(0, 30, 0, 10, 'ON'),
      ...vca(70, 50, 40),
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
      ...voice('OFF', 'OFF', 20),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 2, 100, 50, 0, 'OFF'),
      ...mixer(65, 0, 60, 0, 5, 0),
      ...filters('PAR', 'ON', 140, 25, 50, '1:1', 7000, 30, 70, '1:1'),
      ...filterEnv(0, 35, 5, 20),
      // "Long repeats" is the delay, not the release: the note itself is still short.
      ...vcaEnv(0, 35, 5, 25, 'ON'),
      ...vca(70, 50, 55),
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
  },

  /**
   * §3.1/#324, withdrawn at #349. **This box used to declare `controlPositions` and no longer
   * does, and the withdrawal is the finding rather than a tidy-up.**
   *
   * The declaration said: the knobs and the MIXER and WAVE MIX faders carry unnumbered ticks and
   * lines, no page maps a mark to a value, so MIDI CC is the exact setting and *by hand these are
   * set by ear*. Every clause of that was read off the manual and the last one is false. The
   * instrument shows the value on its screen as the control is turned, which is how the values in
   * this file were re-scaled at all — so a reader with the box in front of them sets these by
   * watching a number, not by ear, and the notice was steering them away from the one exact method
   * they have.
   *
   * The half that is still true — the panel's own printing is unnumbered — is not worth a notice
   * on its own. `ControlPositions` has one `kind`, `unmapped`, whose whole sentence is *there is no
   * exact way to do this by hand*; there is no shape in it for *the panel does not print it and the
   * screen does*. Saying that would be a second kind and a change to a sentence both renderers
   * write, which is engine work this manifest is not the place to do.
   *
   * **What is lost with it is p.19's mapping**, the one positive claim it carried: the ENVELOPE
   * faders' second printed line from the bottom is 25%. That is still true, still useful, and now
   * more useful than before — the faders are authored in percent, so a fader at `25` *is* that
   * line. It has nowhere to go that is not 144 copies of one sentence on the parameter lines,
   * which is exactly what #324 removed. It is recorded on `fader` above and is worth a home.
   *
   * The `capabilityEvidence` entry went with it. `DeviceSchema` requires the pair and refuses
   * either alone, which is the rule working: a reading that supports no claim says nothing.
   */

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
    /*
     * §8.1/#348. **VOICE CONTROL is a panel module with its own MORE button**, not somewhere
     * inside the PROGRAMMER. PDF p.106 is headed "VOICE CONTROL MORE MENU" and carries
     * `TIMBRE A VOICE COUNT` under it.
     *
     * This used to read `PROGRAMMER, VOICE CONTROL, MORE`, which sends a reader to the
     * PROGRAMMER first and leaves them looking for something that is not there. The PROGRAMMER
     * is where a MORE menu *appears* — p.90: "where you will navigate settings for the MORE
     * menus found throughout Muse" — not the way in.
     *
     * `midi-settings` below is genuinely reached through the PROGRAMMER (p.90 gives it the
     * configuration and MIDI/CV menus) and is correct as it stands. The distinction is whether
     * the menu belongs to a panel module or to the PROGRAMMER itself, so each of these is
     * checked against its own page rather than corrected by a rule.
     */
    'voice-count': 'VOICE CONTROL, then MORE',
    'midi-settings': 'PROGRAMMER, MENU, MIDI',
    'init-patch': 'Press INIT for a blank patch',
    'save-patch': 'SAVE, name it, CONFIRM',
    'arp-steps': 'Press ARP, then buttons 1-16',
  },

  recipes,
}
