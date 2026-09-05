import type { Device, Recipe } from "../../core/device";
import type {
  AuthoredParam,
  Cite,
  MoodOffset,
  NumericRange,
  ParamScope,
} from "../../core/params";
import { MUSE_PANEL } from "./panel";

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
 * ## `patchPolyphony`: MONO is cited, UNISON is observed, and they arrive at the same number
 *
 * §12.4/#85. `Assignable.polyphony` is a fact about the box; what a patch spends is a fact about
 * the patch. Two VOICE CONTROL buttons bear on it, and **each is settled by a different kind of
 * evidence** — which is the distinction this section exists to draw, and it survives #383 intact
 * even though the conclusion it was attached to did not.
 *
 *  - **`MONO`** (p.105), in full: *"Enables mono mode on the currently selected timbre, which will
 *    restrict the timbre to operating in a monophonic mode. Only one voice will be used at a time
 *    and polyphonic playing will be disabled."* That is `patchPolyphony: 1`, stated outright, and
 *    every `sub` and `bass-mid` recipe here carries it.
 *  - **`UNISON`** (p.105), in full: *"Enables unison mode on the currently selected timbre, which
 *    will stack any currently unused voices on top of the active ones."* The page stops there. It
 *    is `patchPolyphony: 1` as well, and **the evidence is the instrument rather than the
 *    sentence** — see below.
 *
 * ### What was observed, and what this file used to argue instead
 *
 * #383, at the box, firmware 1.4.0, one variable at a time and `STACK` off throughout:
 *
 * ```
 * UNISON off, DVA on     one note   ->  one voice
 * UNISON off, DVA off    one note   ->  one voice
 * UNISON on              one note   ->  four voices
 * UNISON on              chord      ->  indistinguishable from a single note
 * ```
 *
 * **The last row is the finding: with UNISON engaged a chord does not sound as a chord.**
 * `DYNAMIC VOICE ALLOCATION` is ruled out in both of its states, and `STACK` is not involved —
 * it was off, and every recipe here sets `MULTI MODE ON`, under which p.105 says it is ignored
 * anyway.
 *
 * ### How much weight each row carries, which is not the same for all four
 *
 * **Rows one to three are measured.** The voice meter says one voice per note with UNISON off in
 * both `DVA` states, and four voices on one note with it on. Those are readings.
 *
 * **Row four is a listening test.** *"Indistinguishable from a single note"* is what a player
 * heard, and **the meter cannot corroborate it**: the timbre is capped at four voices, so it
 * reads `4` whether UNISON is holding all four on the first note or spreading them one each
 * across three. The instrument offers no display that separates those two states.
 *
 * So what is established is that UNISON puts every voice on one note, and that a chord under it
 * did not sound like a chord to somebody playing one. **The mechanism joining them is a reading
 * of p.104, not a measurement** — the page says *currently unused* voices are stacked and says
 * nothing about handing them back, so the second note finding none follows from the sentence
 * rather than from an instrument that reported it. That reading, the listening test and the
 * manual agree, and none of the three is a meter.
 *
 * **This is recorded here so a later reading knows what it is contradicting.** If somebody
 * establishes that a chord does sound and the earlier one was mistaken, what fails is the
 * inference and the listening test together — not a measurement, because none was taken of the
 * thing in question.
 *
 * **This file used to conclude the opposite, and the tell is worth keeping.** It said UNISON
 * *"stacks whatever is spare, so one note gets the lot and four notes get one each — the thickness
 * is dynamic and the polyphony is unchanged"*, and closed with **"which is what the sentence
 * says"**. That clause is the error. p.104's sentence says voices that are *currently unused* get
 * stacked; when the first note arrives every voice is unused, so it takes all of them and the
 * second finds none. **Nothing on the page says voices are handed back as more notes arrive** —
 * that half was supplied by the reader and then attributed to Moog.
 *
 * So the manual is accurate and the inference from it was wrong, which is #381's shape two hours
 * later on the same device: a careful argument resting on a clause that claims the page states
 * something it does not. The distinction the old section drew — a cited fact is not an inferred
 * one — was the right distinction applied to the wrong side of itself.
 *
 * **The two UNISON recipes now declare `patchPolyphony: 1`**: `muse-stab-hard` and
 * `muse-stab-dirty`. `muse-stab-bright` sets `UNISON OFF` and is untouched. They stay UNISON
 * stabs — fat and monophonic is what the box does, and turning the switch off to make them
 * chordal would be a different change with a musical argument behind it.
 *
 * ### What that costs, and it is not nothing: both recipes stop being offered
 *
 * **Every `stab` request this library ships asks for a chord.** `hip-hop` wants `polyphony: 4`,
 * `industrial-techno` and `lydian-house` want `3`. `patchVoiceCeiling` takes the lower of the
 * assignable's four and the patch's one, so these two recipes are now **genuinely infeasible for
 * all three** — not deprioritised, excluded.
 *
 * **They were being offered before, and that was the defect.** In the `industrial-techno` rig the
 * Muse was taking a three-note stab on `muse-stab-hard`, a patch that sounds one note. The guide
 * read as correct and described something the box in front of the reader could not play, which is
 * the failure `patchPolyphony` exists to prevent and the one somebody hit at the machine. The
 * stab now goes elsewhere and the Muse keeps `pad`.
 *
 * So the recipes losing work is the repair rather than a side effect. What they are still right
 * for is a single-note stab, which is what a fat mono stab is, and no direction currently asks
 * for one.
 *
 * ### The conclusion is limited to the four-voice split, deliberately
 *
 * **Only the four-voice split was tested**, which is the split `TIMBRE A VOICE COUNT 4` gives and
 * the only one any recipe here authors. Whether UNISON collapses to one note at *every* voice
 * count is unknown: a timbre allocated six or eight voices was not tried.
 *
 * `patchPolyphony: 1` is therefore right for every recipe in this file and is **not** modelled as
 * a function of the count. Making it one would mean authoring a rule across a range nobody has
 * played, which is the thing this manifest is most careful not to do — and the guide sets the
 * count itself, so the untested region is not one a reader following it can reach. If somebody
 * plays a chord under UNISON at a different allocation and it sounds, this becomes conditional
 * and the recipes are where it changes.
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
 * percent    28   every oscillator, resonance, envelope SUSTAIN, level, detune, mixer and
 *                 delay macro control
 * seconds     6   ATTACK / DECAY / RELEASE on both envelopes, 0…10 s — #381
 * signed      2   both FILTER · ENVELOPE AMOUNT knobs, -100…100 with 0 at noon
 * side        1   VCA · PAN, which reads 100L through 0 to 100R
 * Hz          2   FILTER 1 · CUTOFF, FILTER 2 · CUTOFF
 * divisions   2   DELAY · TIME - L / R, under the CLOCK SYNC every recipe engages — #346,
 *                 and the one family here that is an enum rather than a number
 * ```
 *
 * There is no shorter rule than that list. The reading's own working assumption — that a control
 * with a real quantity behind it shows a unit — died on `MOD OSC · FREQUENCY`, which is a
 * frequency and reads in percent. See `OBSERVED` for what the finding covers and the one control
 * in it that is inferred.
 *
 * **The seconds row came third and it split a group this file had called homogeneous** (#381).
 * Six of the eight ENVELOPE faders read in seconds and the two `SUSTAIN` faders read in percent,
 * because a sustain is a level and the other three stages are times. See `ENVELOPE_SECONDS` for
 * why the two agreeing scales #349 was so pleased with were never agreeing about the same thing.
 *
 * **All five families are authored here on the scale the screen shows**, cited `observed` —
 * *"somebody who turned the knob and read the limits, with the firmware version in the source
 * string"*. The last of them took a second visit to the box. #349 left the two `DELAY · TIME`
 * knobs on Appendix A's `0-127` because naming the division a knob lands on needed a reading
 * nobody had taken; #346 took it, and those two are now an **enum of divisions** rather than a
 * number of any kind — see `DELAY_DIVISIONS`.
 *
 * **So no range on this device cites Appendix A any more**, and the helpers that built that
 * citation went with the last caller. The appendix was never wrong about anything — CC 93 does
 * accept `0-127` — it was answering a question nobody at the machine is asking. What survives of
 * it is `midiCc` on the 39 controls that are still numbers, which is what a CC row is for: it
 * says which controller addresses a knob and asserts nothing about the scale beside it.
 *
 * ## The three bipolar controls
 *
 * `FILTER 1 · ENVELOPE AMOUNT`, `FILTER 2 · ENVELOPE AMOUNT` and `VCA · PAN` all carried a note
 * saying they rest at noon while the number beside them said `50`. On a `0-100 %` readout that is
 * not a contradiction so much as a control whose scale nobody had looked at closely enough — and
 * when they were looked at, none of the three reads in percent. The two envelope amounts are
 * signed, `-100` to `100`, each read at the box in its own right. `PAN` is a side and a distance,
 * `100L` through `0` to `100R`, which is not a signed number at all; it is authored as a magnitude
 * from centre, and since every recipe here sits at centre no recipe has yet had to say which side.
 *
 * All three are now authored the way the screen states them, and the resting position each recipe
 * uses is a **cited point** rather than taste, because the reading settles where noon is. The CC
 * numbers are untouched — 69, 75 and 10 — because the Appendix A rows never moved; it is still
 * only the value half of the instruction that is gone.
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
 * **The CC numbers stay.** `midiCc` is retained on every control that has one, because the
 * Appendix A row is still true — CC 67 still addresses FILTER 1 · CUTOFF — and it is what
 * identifies a control to anything automating it. What is gone is the *value* half of the
 * instruction: `Send MIDI CC 67 = 74` told a reader to send a number that is no longer the number
 * on the line, and sending it now lands somewhere unknown. `resolveParam` names the controller and
 * asserts no value.
 *
 * The two `DELAY · TIME` knobs are the exception and only in where the number is written: an
 * `AuthoredEnumParam` has no `midiCc` field, so `division` puts CC 93 and 94 in the note itself.
 * See that helper for why authored prose is safe there and was not at #324.
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
 *
 * ## No trigger note, and no blanks either (§2.1/#334)
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. **This
 * box has none** — every grid part it takes is a `sub`, and every one of those carries the
 * direction's own pitch. So this section is not a repair; it is the record of why the field is
 * declined on a box the sweep barely touches, written down before somebody adds a recipe and asks.
 *
 * `TriggerNote` means *the note that plays this part's sound as it is* — a loaded sample's
 * original pitch. **There is no sample here to have one**, and `capabilityEvidence.content`
 * already carries the pages that say so: p.116's `SOUND ENGINE  Analog` with a module list that
 * has no sample player in it, and pp.117-118 with no audio input to record one through. A patch
 * on this box is a set of panel positions, not a file. The same three pages the `voices` evidence
 * cites — pp.8, 106, 116 — are the ones that make it two analog timbres rather than a pool of
 * loaded sounds.
 *
 * p.27 says what a note does here instead, on the control that would carry it: `FREQUENCY`
 * *"detunes each oscillator from the pitch associated with a keyboard note"*, and *"when set to
 * noon will be in tune with the keyboard note (if a C is pressed, a C will sound based on the
 * OCTAVE setting)"*. A pressed C sounds a C. That is musical pitch — the direction's under §4.1,
 * reaching the page through `RoleRequest.pitch` and its hooks — not an address this folder could
 * cite, and not an "as recorded" root, because nothing is recorded.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const MANUAL = "Muse User's Manual v1.4.0";

function cite(page: number): Cite {
  return { kind: "manual", source: `${MANUAL}, p.${page}` };
}

/**
 * #349 and #346, and the first use of `observed` on any device in the library (#329).
 *
 * The kind exists for *"somebody who turned the knob and read the limits, with the firmware
 * version in the source string"*, and that is what this is. **The reading covered the panel and
 * settled every one of the 41 controls Appendix A numbers**, at firmware 1.4.0:
 *
 * ```
 * percent    28   every oscillator, resonance, envelope SUSTAIN, level, detune, mixer and
 *                 delay macro control
 * seconds     6   ATTACK / DECAY / RELEASE on both envelopes, 0…10 s
 * signed      2   both FILTER · ENVELOPE AMOUNT knobs, -100…100 with 0 at noon
 * side        1   VCA · PAN, which reads 100L through 0 to 100R
 * Hz          2   FILTER 1 · CUTOFF, FILTER 2 · CUTOFF
 * divisions   2   DELAY · TIME - L / R, under the CLOCK SYNC every recipe engages
 * ```
 *
 * **The delay row came second, and it is #346 rather than #349.** That pass read the other 39 and
 * left the delay's two TIME knobs alone: they show a division rather than a number, so there are
 * no limits to note — the reading is the list of what the knob steps through, which means
 * stepping it. #346 stepped it. See `DELAY_DIVISIONS` for what that covers and where it stops.
 *
 * **The seconds row came third and is #381**, and unlike the other two it *corrects* the pass
 * before it rather than extending it. #349 read these six as percent and had two pages agreeing
 * with it; both readings of those pages were right and the inference from them was not. The
 * envelope faders were re-read at the box, one screen at a time, and `ATTACK`, `DECAY` and
 * `RELEASE` show `0-10 s` on both envelopes while `SUSTAIN` shows a percentage on both. See
 * `ENVELOPE_SECONDS`.
 *
 * **The three readings share this citation rather than splitting into three.** Same instrument,
 * same firmware, same screen; what a `Cite` names is the evidence, and splitting it would produce
 * sources differing only in which evening somebody stood at the box.
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
 * **That is the only one.** `FILTER 2 · ENVELOPE AMOUNT` sits on the same module and would have
 * taken the same argument in one line; it was read instead, separately, and both amounts carry the
 * citation on their own account. Naming the inference above is worth something only while there is
 * exactly one, so the second was taken to the box rather than reasoned into place.
 *
 * **The reading also settles some points and not others**, which is why `verified` on a point is
 * not uniform across this file. Where a control's own note says it rests at noon, the observation
 * says which number noon is — so `FILTER 1 · ENVELOPE AMOUNT 0` and `VCA · PAN 0` are cited
 * points. Nothing about the reading says a lead wants `80`, so every other point here is taste,
 * exactly as it was.
 *
 * **The firmware is in the string and is not decoration.** A screen readout is a property of the
 * software, and 1.4.0 is the version the reading was taken on — the same version the manual this
 * folder otherwise cites is written for, which is why the two agree about everything else.
 */
const OBSERVED: Cite = { kind: "observed", source: "Muse, firmware 1.4.0" };

/** `0-100 %`, what the screen shows for 28 of the 41 controls Appendix A numbers (#349, #381). */
const PERCENT: NumericRange = { min: 0, max: 100, verified: OBSERVED };

/**
 * `0-10 s`, the six envelope **time** stages — `ATTACK`, `DECAY` and `RELEASE` on both the
 * FILTER ENVELOPE and the VCA ENVELOPE (#381). `SUSTAIN` is not among them: it is a level, it
 * stays on `PERCENT`, and on both envelopes the screen agrees.
 *
 * ## Why #349 authored all eight as percent, which is the part worth keeping
 *
 * This file used to call the eight ENVELOPE faders *"the one group on this panel with two
 * agreeing scales"*, and it argued that from two pages, both checked against the rendered PDF
 * rather than a text dump:
 *
 *  - **The panel prints a scale.** PDF p.38, the ENVELOPES module drawing: each bank of four
 *    vertical faders is crossed by five horizontal lines — bottom, three between, top, so four
 *    equal intervals to count along. The rotary controls drawn in the same figure (CUTOFF, VCA
 *    LEVEL, PAN, FEEDBACK, MIX) carry at most an unnumbered tick arc, and on PAN an `L 0 R`
 *    centre mark; none of that names a value.
 *  - **And a page maps a position to a value.** Printed p.19: *"the ATTACK, DECAY, SUSTAIN, and
 *    RELEASE sliders of the FILTER ENVELOPE all set to around 25% (or the second line from the
 *    bottom)"*. Five lines, four intervals, so the second from the bottom is 25%.
 *
 * **Both readings are correct and the inference from them is not.** p.19's percentages describe
 * **fader travel, not parameter value**. *"25% (or the second line from the bottom)"* is a
 * sentence about where to put your finger, and the parenthesis is what gives it away: it glosses
 * a position, not a quantity. The screen shows the value that position produces, and for three of
 * these four stages that value is a time.
 *
 * So this is `CLAUDE.md`'s standing trap wearing a new coat. The rule is that a cited range can
 * still be the wrong range where a manual prints more than one scale for a control. Here the
 * manual prints a scale for the **control** and the instrument prints a scale for the
 * **parameter**, and #349 read the first as evidence about the second *because they agreed on a
 * number*. Agreement was the trap: `25` is a legitimate percentage of travel and a nonsense count
 * of seconds, and nothing on the page distinguishes them. p.19 still says what it always said,
 * and it is still true — it is a fader-position instruction, and the pages `fader` used to quote
 * are quoted above so that nobody re-derives the same conclusion from them a third time.
 *
 * **Nothing was converted, because nothing could be.** `DECAY 25` meant a quarter of the fader's
 * travel; turning that into seconds needs the taper, envelope times are rarely linear, and no page
 * gives one. So all six time arguments in all eighteen recipes were re-authored from what the part
 * is doing — a snappy closed pluck is a number somebody picks, not one anybody computes — and the
 * old percentages were used for nothing but keeping the *ordering* within each role sensible.
 *
 * ## The granularity is an authoring assumption and says nothing about the display
 *
 * `step` is `0.1` here. **That is a choice about the numbers this folder writes, not a claim about
 * what the instrument's screen shows.** The reading settled the *span* — `0-10 s` on all six — and
 * nobody recorded how many decimal places the readout carries or how finely the fader resolves.
 * A tenth of a second is the coarsest unit that still separates a 0.2 s stab tail from a 0.3 s
 * one, so it is what these recipes are authored on and what mood rounds a moved value back onto.
 * If somebody reads the display precision off the box and it is finer or coarser than this, the
 * step changes and no citation moves, because none was ever made.
 *
 * Both envelopes were read (#381's comment closes the issue's open question): `FILTER ENVELOPE`
 * and `VCA ENVELOPE` are the same shape, so the split is six time faders to two level faders and
 * every time fader on the panel is in here.
 */
const ENVELOPE_SECONDS: NumericRange = { min: 0, max: 10, verified: OBSERVED };

/**
 * `20 Hz - 20 kHz`, the two filter cutoffs — the one family here that reads in a real unit rather
 * than in a bare number. Full audio range, which is what every other Moog ladder in this library is
 * authored over — `moog-mother-32` has it from a printed sentence, *"change the Filter's Cutoff
 * frequency from 20Hz to 20kHz"*, and this box prints no such sentence anywhere.
 *
 * **The scale is logarithmic and nothing here declares that**, because `NumericRange` has no
 * field for it and does not need one to render a value: a cutoff of `450 Hz (20…20000 Hz)` reads
 * correctly whatever the taper. Where it matters is mood, and the answer is in the *amount* rather
 * than in the type — `-Math.round(cutoff / 2)`, an octave, which is a fixed interval at every
 * frequency where a fixed number of Hz is not. See the module note.
 */
const CUTOFF_HZ: NumericRange = { min: 20, max: 20000, verified: OBSERVED };

/**
 * `-100…100`, both filter `ENVELOPE AMOUNT` knobs — the two controls on this panel whose screen
 * puts a **sign** on the number (#349's reading, re-read for the bipolar controls).
 *
 * The note on this parameter has always said *"Bipolar, no modulation at noon"*, and until now the
 * number beside it contradicted the sentence: on `0-100 %` the resting position is `50`, which
 * reads as half of something rather than as none of it. The screen shows `0` there and a sign
 * either side of it, so the value and the note now say the same thing.
 *
 * **The recipe points were rescaled, and that is not the conversion #349 refused.** `2x-100` is
 * the exact restatement of a position on the knob's travel as a position on the printed scale —
 * the same physical place on the same knob, relabelled by the scale that is actually in force.
 * What #349 refused was `CC 46 = 120` becoming `94 %`, which assumes a linear map between two
 * *different* quantities that no page states. There is no taper assumption here and nothing is
 * being inferred: noon is noon on both scales, and each end is each end.
 *
 * **Both controls were read, rather than one being carried across from the other.** They sit on
 * the same module and the sibling argument would have been easy to make, but it is not what
 * happened and the distinction is the whole of `OBSERVED`'s discipline: `FILTER 2 · CUTOFF` is
 * inferred and says so, and it remains the only inference in this folder.
 */
const BIPOLAR_AMOUNT: NumericRange = {
  min: -100,
  max: 100,
  verified: OBSERVED,
};

/**
 * `0…100`, `VCA · PAN` — a **magnitude**, because the screen's scale is not a signed number.
 *
 * The readout is `100L` through `0` to `100R`: a side and a distance, not a negative and a
 * positive. `NumericRange` has one number line and no field for a side, so the honest range is
 * the distance from centre.
 *
 * **Authoring this as `-100…100` was the alternative and it would have been a false claim.** No
 * screen on this box ever shows `-40`; it shows `40L`. A reader told to set `-40` has to invent
 * which side that is, and the two conventions in circulation disagree. The `100L / 0 / 100R`
 * shape is stated in the note instead, where it is a fact about the instrument rather than a
 * number the guide made up.
 *
 * **Every recipe centres the knob, so the range is only ever exercised at `0`** — which is why
 * `panParam` writes the centre and offers no way to leave it. Where a side would go if one were
 * ever wanted is an open question with a rendered consequence, and it is left open there rather
 * than answered here by an unused branch.
 */
const PAN_MAGNITUDE: NumericRange = { min: 0, max: 100, verified: OBSERVED };

// ---------------------------------------------------------------------------
// Param helpers (§3.1: the range is cited, the point is taste)
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: MoodOffset[];
  unit?: string;
  step?: number;
  note?: string;
  hint?: string;
  scope?: ParamScope;
};

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
function cc(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra = {},
): AuthoredParam {
  return percentParam(name, value, ccNumber, extra);
}

/**
 * An envelope **time** stage: `ATTACK`, `DECAY` or `RELEASE`, on either envelope — CC 79, 80, 82
 * and 86, 87, 89. Six of the eight ENVELOPE faders, on the `0-10 s` their screens show (#381).
 *
 * **The point is taste and the value is a duration**, so what a number here says is *how long this
 * stage of this part lasts* — 0.2 s on a stab tail, 6 s on a texture's swell. It is not a position
 * on the fader and it is not derived from one; see `ENVELOPE_SECONDS` for why no such derivation
 * exists and what p.19 is actually about.
 *
 * `step` is `0.1`, which is an authoring granularity rather than an observed display precision.
 * The same note, with the reasoning, is at `ENVELOPE_SECONDS`.
 */
function timeFader(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra = {},
): AuthoredParam {
  return {
    kind: "numeric",
    name,
    value,
    range: ENVELOPE_SECONDS,
    verified: false,
    unit: "s",
    step: 0.1,
    ...extra,
    midiCc: ccNumber,
  };
}

/**
 * §6.1. **A mood offset on an envelope time, authored as a share of the time it moves.**
 *
 * This is the argument the two filter cutoffs already make, in the one other place on this box
 * where it applies. An offset is a fixed distance in the parameter's own units, and a fixed
 * distance is only a musical statement on a scale where equal distances sound equal. On percent
 * they did — `-15` was *a sixth of the fader*, which reads the same wherever the fader is. On
 * these six the authored times run from `0` to `6 s`, a span across which a constant is either
 * the whole envelope or nothing: `-0.3 s` erases a 0.3 s stab tail and is inaudible on a 6 s
 * texture swell.
 *
 * What is fixed on a scale like that is a **ratio**, so the amount is computed from the point:
 * roughly a third of it, which is a clear move at every length and a fatal one at none.
 *
 * **The floor is one tenth**, because a tenth is the granularity these recipes are authored on
 * (see `ENVELOPE_SECONDS`) and an amount that rounded to `0` would declare an axis that cannot
 * move the value — a knob listed as a cause of nothing. The shortest release on the box is
 * `0.1 s` and it is the only value the floor is load-bearing for.
 *
 * The rounding happens in tenths and only then divides, so the amount always lands on the same
 * grid the point is authored on, and IEEE arithmetic gives the same answer on every platform
 * (invariant 6). `roundToStep` puts the moved value back on that grid at render.
 */
function envelopeShare(seconds: number): number {
  return Math.max(1, Math.round(seconds * 3)) / 10;
}

/**
 * An envelope **level** stage: `SUSTAIN`, on either envelope — CC 81 and 88. The two ENVELOPE
 * faders #381 left alone, and the reason they were left alone is the whole shape of that issue:
 * a sustain is a level, not a time, and a level is the one stage of an ADSR that a percentage is
 * the right unit for. Both screens show a percentage and both are authored on it.
 *
 * **This is what remains of the group `fader` used to build.** Until #381 all eight went through
 * one helper because the manifest believed all eight were percent; six of them are seconds, so
 * the helper split and only the two level faders kept the percent path.
 * `test/moog-muse.test.ts` pins the split at six and two, so a stage moved between the two
 * helpers is a failing test rather than a quiet change to what unit the box is claimed to show.
 */
function levelFader(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra = {},
): AuthoredParam {
  return percentParam(name, value, ccNumber, extra);
}

/** What both percent paths share: the observed range, the taste point, and the CC number. */
function percentParam(
  name: string,
  value: number,
  ccNumber: number,
  extra: NumExtra,
): AuthoredParam {
  return {
    kind: "numeric",
    name,
    value,
    range: PERCENT,
    verified: false,
    unit: "%",
    ...extra,
    midiCc: ccNumber,
  };
}

/**
 * A filter `ENVELOPE AMOUNT`, on the signed scale its screen shows (#349). **Both of them**: two
 * separate readings, taken at the same session at the box, which agreed on `-100 to 100`.
 *
 * **Two observations, one scale — and the helper is shared for the scale, not for the reading.**
 * The distinction is the point rather than pedantry: a shared helper is what an inference would
 * look like from inside this file, so it has to be said here that neither control's range comes
 * from the other's. `FILTER 2 · CUTOFF` is the single place this manifest infers a scale from a
 * neighbour, and it stays the single place — see `OBSERVED`.
 *
 * **The point authority splits with the value, and that is the interesting half.** At `0` the
 * position is not taste: the note says there is no modulation at noon and the screen says noon is
 * `0`, so the reading settles where the knob goes and the point is cited to the observation. Any
 * other number is a judgment about how much envelope this patch wants, exactly as it always was,
 * and stays `verified: false`.
 *
 * That is §3.1 used as intended rather than a special case. `verified` on a point asks *did
 * somebody check this number* — and for the resting position of a bipolar control somebody did.
 * The same reading does not tell anyone that a lead wants `80`.
 */
function envAmount(
  filter: 1 | 2,
  value: number,
  extra: NumExtra = {},
): AuthoredParam {
  return {
    kind: "numeric",
    name: `FILTER ${filter} · ENVELOPE AMOUNT`,
    value,
    range: BIPOLAR_AMOUNT,
    // The observation covers noon and nothing else on either control. See `BIPOLAR_AMOUNT`.
    verified: value === 0 ? OBSERVED : false,
    ...extra,
    midiCc: filter === 1 ? 69 : 75,
  };
}

/**
 * `VCA · PAN`, centred. **It takes no argument, because every recipe here centres it and there is
 * no settled way to write one that does not.**
 *
 * `0` with no unit is what the screen shows at noon — not `0L`, not `0 %` — and p.42 says the
 * knob rests there, so the point carries the observation rather than being taste. That is the
 * whole of what this helper knows.
 *
 * **An off-centre pan is a design question, not a missing parameter.** The screen reads `40L`: a
 * distance and a side, and `NumericRange` has one number line with no room for the second half.
 * The obvious dodge is to put the side in `unit`, and a first pass here did exactly that. It is
 * wrong in three ways at once — `L` and `R` are not units and are not in the vocabulary the rest
 * of the library uses; the rendered bounds would become side-specific, so `40 L (0…100 L)` claims
 * a range that does not exist; and nothing would exercise it, so the first recipe to want a
 * hard-left pad would be the first to find out what it prints.
 *
 * So the branch is not here. A recipe that wants an off-centre pan has to settle the
 * representation first — a signed range with a stated convention, a second param naming the side,
 * or something else — and that is a decision with a rendered consequence, which makes it a
 * decision somebody should take deliberately rather than inherit from a helper written in
 * advance. Deleting the unused half is what forces that.
 */
function panParam(): AuthoredParam {
  return {
    kind: "numeric",
    name: "VCA · PAN",
    value: 0,
    range: PAN_MAGNITUDE,
    // Noon is where the reading lands, and it is the only point on this control it settles.
    verified: OBSERVED,
    note: "Bipolar, centred at noon — the screen reads 100L through 0 to 100R",
    midiCc: 10,
  };
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
function cutoff(
  name: string,
  hz: number,
  ccNumber: number,
  extra: NumExtra = {},
): AuthoredParam {
  return {
    kind: "numeric",
    name,
    value: hz,
    range: CUTOFF_HZ,
    verified: false,
    unit: "Hz",
    ...extra,
    midiCc: ccNumber,
  };
}

/**
 * A `DELAY · TIME` knob, in the divisions its screen shows under `CLOCK SYNC` (#346). The two
 * controls on this panel whose value is **not a number at all**.
 *
 * **An enum rather than a numeric, because a division is not a point on a scale.** `1/8 D` is
 * three quarters of a beat and sits between `1/8` and `1/4`, but it is not three quarters of
 * anything the knob prints and there is no interval it lies inside. What the sweep is, is an
 * ordered list of names, which is what `options` holds. §3.2's split survives the change of kind
 * intact: the option set is the claim somebody checked, and which division a general-purpose
 * stereo delay wants is taste, exactly as `DECAY 38` is taste.
 *
 * **The CC number is in the note rather than in `midiCc`, and that is a loss stated rather than
 * papered over.** `AuthoredEnumParam` has no `midiCc` field — nothing in the library has needed
 * one — so the resolver cannot compose the instruction for these two lines and this helper writes
 * it, in `midiInstruction`'s own wording so the reader sees one sentence shape down the page.
 *
 * What made authored MIDI prose dangerous at #324 was the **value** interpolated into it:
 * `Send MIDI CC 87 = 54` went stale the moment mood moved the number. There is no value here to
 * go stale. The sentence names a controller and stops, an enum takes no mood, and CC 93 could not
 * carry a division if it wanted to — which is the whole of what #346 found.
 */
function division(
  name: string,
  value: string,
  ccNumber: number,
  note: string,
): AuthoredParam {
  return {
    kind: "enum",
    name,
    value,
    options: { values: [...DELAY_DIVISIONS], verified: OBSERVED },
    // Taste. The reading says which divisions the knob reaches, and nothing about which one a
    // delay under every part on this box should sit on.
    verified: false,
    // One processor for the whole patch — see `sharedDelay`. Baked in rather than passed, because
    // there is no second kind of caller: these are the only two controls that take divisions.
    scope: "song",
    note: `${note} · MIDI CC ${ccNumber}`,
  };
}

/** A control the module page *does* scale. Same split: range cited, point taste. */
function num(
  name: string,
  value: number,
  bounds: Omit<NumericRange, "verified">,
  page: number,
  extra: NumExtra = {},
): AuthoredParam {
  return {
    kind: "numeric",
    name,
    value,
    range: { ...bounds, verified: cite(page) },
    verified: false,
    ...extra,
  };
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
    kind: "enum",
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Option sets, verbatim and in the manual's own order
// ---------------------------------------------------------------------------

/** The panel's two-state buttons. `0-63 off/ 64-127 on` throughout Appendix A. */
const OFF_ON = ["OFF", "ON"] as const;
/** p.28. "a standard based around classic pipe organ stop footage settings." */
const OCTAVES = ["16'", "8'", "4'", "2'"] as const;
/** p.31, the MODULATION OSCILLATOR's five-position selector. The specs page (p.116) calls RAMP
 *  "Reverse Sawtooth"; the panel and p.31 call it RAMP, and the panel name is the one used. */
const MOD_WAVES = ["SINE", "SAWTOOTH", "RAMP", "SQUARE", "NOISE"] as const;
/** p.53, LFO 1 and LFO 2. USER's contents are chosen in the MORE menu and are not a fifth name. */
const LFO_WAVES = ["TRIANGLE", "SAWTOOTH", "SQUARE", "RANDOM", "USER"] as const;
/** p.36. The panel prints the ratios; Appendix A prints the same three as OFF/HALF/FULL. */
const KB_TRACKING = ["OFF", "1:2", "1:1"] as const;
/** pp.36-37. The panel abbreviates; the body text spells them SERIAL, STEREO, PARALLEL. */
const FILTER_ORDER = ["SER", "STR", "PAR"] as const;
/** p.34, the MIXER's only MORE-menu entry. */
const OVERLOAD_RANGE = ["LOW", "HIGH"] as const;
/** p.44. `EVEN` is avoided throughout — see the module note on the p.43/p.44 contradiction. */
const PAN_SPREAD_MODE = ["L/R", "EVEN"] as const;
/**
 * p.110, both MIDI channel settings: `(OMNI, 1-16. DEFAULT: 1)`.
 *
 * An enum rather than a numeric `1..16`, because `OMNI` is one of the printed options and is not a
 * number. Declaring the range as `{ min: 1, max: 16 }` would drop it from the option set and quote
 * the page for a claim the page does not make — §3.2's point that an enum's *options* are their own
 * cited claim, in the direction where the list has a member no interval can hold.
 */
const MIDI_CHANNELS = [
  "OMNI",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
] as const;

/** p.47, which divisions the delay's TIME knobs may reach when CLOCK SYNC is on. */
const DELAY_SYNC_TYPE = ["COMBO", "STRGHT", "TRIP", "DOT"] as const;

/**
 * The divisions a `DELAY · TIME` knob steps through at `SYNC TYPE COMBO` — `observed` (#346), and
 * the only option set in this file that no page prints.
 *
 * p.47 gives `SYNC TYPE` as `COMBO, STRGHT, TRIP, DOT`, which is which *families* the knob may
 * reach. **The divisions themselves are never enumerated**, here or anywhere in the manual; p.46
 * says only that the knobs *"will only be able to jump between tempo divisions of the global
 * TEMPO"*. So this was read off the instrument at firmware 1.4.0, with `CLOCK SYNC` on and
 * `SYNC TYPE` at the `COMBO` every recipe here sets.
 *
 * **p.46 rather than p.45, checked on the rendered page.** #346 quotes the sentence as printed
 * p.45 and it is not: the folio sits at the foot of the page and reads 46 under the CLOCK SYNC
 * entry, which is also the page `sharedDelay` has always cited for that switch. p.45 is where the
 * module opens, and TIME-L is on it.
 *
 * **In duration order, because that is the order the knob sweeps them**, and `COMBO` interleaves
 * the three families rather than grouping them:
 *
 * ```
 * 1/16   1/8 T   1/16 D  1/8   1/4 T   1/8 D  1/4   1/2 T   1/4 D
 * 0.25    0.333   0.375  0.5    0.667   0.75  1.0    1.333  1.5     beats
 * ```
 *
 * Straight, dotted and triplet sort into one continuous sweep by time. That is a fact about the
 * instrument no page states, and it is what lets a reader turn toward a target without knowing
 * which family the target belongs to.
 *
 * **Nine, and neither end of the knob is among them.** The full sweep runs `1/64 T` fully
 * counter-clockwise to `1 D` fully clockwise and both ends were read — but what lies between them
 * and this run was not. The nine are the run that is **contiguous**: stepping from any one of them
 * to any other passes only through divisions somebody has seen. Adding the two endpoints would
 * make the list look like what the control accepts while hiding two unread gaps inside itself,
 * which is invariant 5 in the one direction an option set can break it.
 *
 * Nine is also the whole musically useful middle for a delay, `1/16` to `1/4 D`, so no recipe here
 * is short of a division it can honestly reach for.
 */
const DELAY_DIVISIONS = [
  "1/16",
  "1/8 T",
  "1/16 D",
  "1/8",
  "1/4 T",
  "1/8 D",
  "1/4",
  "1/2 T",
  "1/4 D",
] as const;
/** p.68, the ARPEGGIATOR's three operational modes. */
const ARP_DIRECTION = ["ORD", "PTN", "RND"] as const;
/** p.71, which divisions the ARPEGGIATOR's CLOCK DIV knob is allowed to reach. */
const ARP_CLOCK_DIV = ["STRGHT", "TRPLT", "DOTTED", "COMBO"] as const;

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
    sw("VOICE CONTROL · UNISON", unison, OFF_ON, 105, {
      note: "Stacks every unused voice onto the first note held, so the timbre plays one note at a time",
    }),
    sw("VOICE CONTROL · MONO", mono, OFF_ON, 105),
    cc("VOICE CONTROL · DETUNE", detune, 92, {
      note: "Between voices when poly, between stacked voices under UNISON, between the two oscillators under MONO",
    }),
    {
      kind: "numeric",
      name: "TIMBRE A VOICE COUNT",
      value: 4,
      // p.106 states the rule — "The Voice Count settings for TIMBRE A and B will move with
      // respect to each other and always sum to eight" — and prints an example reading 6 and 2,
      // but it prints no minimum and no maximum for the field itself. `0` to `8` was an inference
      // from the sum rule, uncited on purpose because attributing an inference to a document is
      // the thing this file is most careful about.
      //
      // **It is now read rather than inferred (#329), and the inference was right** — including
      // the part that looked least likely. A minimum of `0` means a timbre can be given no voices
      // at all, which the sum rule implies and no page confirms.
      range: { min: 0, max: 8, verified: OBSERVED },
      verified: false,
      scope: "song",
      hint: "voice-count",
      note: "Four each. The counts always sum to eight, so setting this sets the other",
    },
    sw("DYNAMIC VOICE ALLOCATION", "OFF", OFF_ON, 106, {
      scope: "song",
      hint: "voice-count",
      note: "Its printed default. On, a busy timbre steals from the other and the four-each split stops holding",
    }),
  ];
}

/** OSCILLATOR 1 (pp.27-28). `FREQUENCY` is the one knob on this panel with a real printed scale. */
function osc1(
  octave: string,
  freq: number,
  triSaw: number,
  pulseWidth: number,
  waveMix: number,
): AuthoredParam[] {
  return [
    sw("OSC 1 · OCTAVE", octave, OCTAVES, 28),
    num("OSC 1 · FREQUENCY", freq, { min: -7, max: 7 }, 27, {
      unit: "st",
      note: "Bipolar, in tune at noon; a perfect fifth either way",
    }),
    cc("OSC 1 · TRI/SAW", triSaw, 46, {
      note: "Triangle fully counter-clockwise, sawtooth fully clockwise",
    }),
    cc("OSC 1 · PULSE WIDTH", pulseWidth, 47, {
      note: "A square wave sits at noon",
    }),
    cc("OSC 1 · WAVE MIX", waveMix, 48, {
      note: "The slider: triangle/sawtooth on the left against the pulse wave on the right",
    }),
  ];
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
    sw("OSC 2 · OCTAVE", octave, OCTAVES, 28),
    num("OSC 2 · FREQUENCY", freq, { min: -7, max: 7 }, 27, { unit: "st" }),
    cc("OSC 2 · TRI/SAW", triSaw, 51),
    cc("OSC 2 · PULSE WIDTH", pulseWidth, 52),
    cc("OSC 2 · WAVE MIX", waveMix, 53),
    sw("SYNC 2▸1", sync, OFF_ON, 28, {
      note: "Locks oscillator 2 to the phase of oscillator 1",
    }),
  ];
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
function fm(
  direction: "2>1" | "1>2",
  amount: number,
  minAmt = 0,
  maxAmt = 100,
): AuthoredParam[] {
  const on = direction === "2>1" ? "2▸1" : "1▸2";
  const off = direction === "2>1" ? "1▸2" : "2▸1";
  return [
    sw(`FM · ${on}`, "ON", OFF_ON, direction === "2>1" ? 28 : 29, {
      note:
        direction === "2>1"
          ? "Oscillator 2 modulating the frequency of oscillator 1, at audio rate"
          : "Oscillator 1 modulating the frequency of oscillator 2, at audio rate",
    }),
    sw(`FM · ${off}`, "OFF", OFF_ON, direction === "2>1" ? 29 : 28),
    cc("FM AMOUNT", amount, 57, {
      // #349, re-derived as travel: a fifth of the knob is an audible arrival of cross-modulation
      // that still leaves the note recognisable as the one the patch started from.
      mood: [{ axis: "grit", amount: 20 }],
      note: "Sweeps between the two limits below rather than between zero and full",
    }),
    num(`${direction} FM MIN AMT`, minAmt, { min: 0, max: 100 }, 29, {
      unit: "%",
      hint: "edit-submenu",
    }),
    num(`${direction} FM MAX AMT`, maxAmt, { min: 0, max: 100 }, 29, {
      unit: "%",
      hint: "edit-submenu",
    }),
  ];
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
    sw("MOD OSC · AUDIO", audio, OFF_ON, 30, {
      note:
        audio === "ON"
          ? "Audio rate: a third oscillator, roughly 20 Hz to 3 kHz across the knob"
          : "Sub-audio: eight per-voice LFOs, one for each voice",
    }),
    sw("MOD OSC · WAVEFORM", waveform, MOD_WAVES, 31),
    cc("MOD OSC · FREQUENCY", freq, 25, {
      note: "The range of this knob differs with the AUDIO button above",
    }),
    cc("MOD OSC · PITCH AMOUNT", pitchAmount, 31),
    sw("MOD OSC · PITCH ▸ OSC 1", pitchTargets.osc1, OFF_ON, 31),
    sw("MOD OSC · PITCH ▸ OSC 2", pitchTargets.osc2, OFF_ON, 31),
    cc("MOD OSC · FILTER AMOUNT", filterAmount, 39),
    sw("MOD OSC · FILTER ▸ 1", filterTargets.f1, OFF_ON, 31),
    sw("MOD OSC · FILTER ▸ 2", filterTargets.f2, OFF_ON, 31),
  ];
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
  overloadRange: string = "LOW",
): AuthoredParam[] {
  return [
    cc("MIXER · OSC 1", osc1Level, 58),
    cc("MIXER · RING MOD", ringMod, 60, {
      // #349, re-derived as travel: a quarter of the fader, which takes the ring modulator from a
      // tint under the oscillators to plainly one of the voices in the mix.
      mood: [{ axis: "grit", amount: 25 }],
      note: "Sum and difference tones of the two oscillators — inharmonic as they detune",
    }),
    cc("MIXER · OSC 2", osc2Level, 59),
    cc("MIXER · MOD OSC", modOscLevel, 61),
    cc("MIXER · NOISE", noise, 62, { note: "White noise" }),
    {
      kind: "numeric",
      name: "MIXER · OVERLOAD",
      value: overload,
      // No page prints a scale for this fader and no CC row names it, so p.34 still quantifies
      // neither the LOW nor the HIGH range. The screen does: `0-100%`, read at the instrument
      // (#329). That is what `observed` is for, and it is the reason this number stopped being
      // relative within this guide and became a position a reader can find on the panel.
      range: { min: 0, max: 100, verified: OBSERVED },
      unit: "%",
      verified: false,
    },
    sw("OVERLOAD RANGE", overloadRange, OVERLOAD_RANGE, 34, {
      hint: "edit-submenu",
      note: "LOW narrows the drive range for finer control",
    }),
  ];
}

/**
 * FILTERS (pp.35-37). Two ladder filters, one of them switchable to highpass, in one of three
 * routings — and three switches that decide what the FILTER 1 knobs mean.
 *
 * Both `ENVELOPE AMOUNT` knobs go through `envAmount`, on the signed `-100…100` their screens
 * show, with `0` at noon. Each was read at the box; neither is inferred from the other.
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
    sw("FILTER · ORDER", order, FILTER_ORDER, 36, {
      note: "SERIAL, STEREO or PARALLEL — with HIGH PASS this decides bandpass, stereo lowpass or notch",
    }),
    sw("LINK FILTERS", "OFF", OFF_ON, 36, {
      note: "Off, so FILTER 1 CUTOFF is an absolute cutoff rather than the spacing between the two",
    }),
    sw("FILTER 1 · HIGH PASS", highPass, OFF_ON, 35, {
      note:
        highPass === "ON"
          ? "Highpass: the knob is fully open counter-clockwise, the opposite of lowpass"
          : "Lowpass",
    }),
    cutoff("FILTER 1 · CUTOFF", cutoff1, 67, {
      mood: [{ axis: "darkness", amount: -Math.round(cutoff1 / 2) }],
    }),
    cc("FILTER 1 · RESONANCE", res1, 68, {
      note: "Self-oscillates into a sine fully clockwise",
    }),
    envAmount(1, env1, { note: "Bipolar, no modulation at noon" }),
    sw("FILTER 1 · KB TRACKING", kb1, KB_TRACKING, 36),
    cutoff("FILTER 2 · CUTOFF", cutoff2, 72, {
      mood: [{ axis: "darkness", amount: -Math.round(cutoff2 / 2) }],
    }),
    cc("FILTER 2 · RESONANCE", res2, 73),
    envAmount(2, env2, { note: "Bipolar, no modulation at noon" }),
    sw("FILTER 2 · KB TRACKING", kb2, KB_TRACKING, 36),
  ];
}

/**
 * FILTER ENVELOPE (pp.38-41), normalised to FILTER CUTOFF.
 *
 * **The manual prints no time unit for any stage — not milliseconds and not seconds**, and that
 * sentence is unchanged from before #381 because it was never the problem. What the manual prints
 * is percentages of *fader travel*: p.19's initialized VCA envelope, *"ATTACK set to 0%, DECAY
 * 25%, SUSTAIN 90%, and RELEASE set around 35%"*, and the FILTER ENVELOPE's four sliders *"all set
 * to around 25% (or the second line from the bottom)"* on the same page.
 *
 * The instrument prints the unit the manual does not, and it is not one unit for the four:
 * `ATTACK`, `DECAY` and `RELEASE` read `0-10 s`, `SUSTAIN` reads a percentage. So `attack`,
 * `decay` and `release` here are **durations in seconds** and `sustain` is a level in percent —
 * see `ENVELOPE_SECONDS` for how #349 came to author all four the same way and why p.19 is not
 * evidence against this.
 */
function filterEnv(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  loop = "OFF",
): AuthoredParam[] {
  return [
    timeFader("FILTER ENV · ATTACK", attack, 79),
    timeFader("FILTER ENV · DECAY", decay, 80),
    levelFader("FILTER ENV · SUSTAIN", sustain, 81),
    timeFader("FILTER ENV · RELEASE", release, 82),
    sw("FILTER ENV · LOOP", loop, OFF_ON, 39, {
      note: "Looping, the envelope runs like an LFO",
    }),
  ];
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
    timeFader("VCA ENV · ATTACK", attack, 86),
    // #381, re-derived as a duration: about a third off the decay, enough to get notes out of
    // each other's way in a busy bar without turning the part staccato. A *share* rather than a
    // constant, for the reason the cutoffs take one — see `envelopeShare`.
    timeFader("VCA ENV · DECAY", decay, 87, {
      mood: [{ axis: "density", amount: -envelopeShare(decay) }],
    }),
    levelFader("VCA ENV · SUSTAIN", sustain, 88),
    // #381, re-derived as a duration: about a third more tail, which carries the note into the
    // delay rather than ending it in front of it.
    timeFader("VCA ENV · RELEASE", release, 89, {
      mood: [{ axis: "space", amount: envelopeShare(release) }],
    }),
    sw("VCA ENV · VELOCITY", velocity, OFF_ON, 39),
  ];
}

/**
 * VCA (pp.42-44). Every control here is **per timbre** — p.42 says "the currently active timbre
 * (A/B)" of both LEVEL and PAN — which is why the block carries the hint that reaches them.
 *
 * **`PAN` is not a parameter of this function.** Its screen is `100L / 0 / 100R` rather than a
 * percentage, and every recipe centres it, so `panParam` writes the centre and takes nothing.
 * Moving a pad off centre is a change to how a side is represented at all — see `panParam`.
 *
 * `PAN SPRD MODE` stays at its printed default `L/R` (p.44): under `EVEN` the manual names two
 * different knobs for the spread width on facing pages, and that is not resolved here.
 */
function vca(level: number, panSpread: number): AuthoredParam[] {
  return [
    cc("VCA · LEVEL", level, 7, { hint: "timbre-select" }),
    panParam(),
    cc("VCA · PAN SPREAD", panSpread, 9, {
      note: "All voices sit at the PAN position fully counter-clockwise",
    }),
    sw("VCA · PAN SPRD MODE", "L/R", PAN_SPREAD_MODE, 44, {
      hint: "edit-submenu",
    }),
  ];
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
    sw("DELAY · TIMBRE A / TIMBRE B", through, OFF_ON, 47, {
      note: "Two separate buttons, one per timbre — engage the one for the timbre this part is on. Disengaged, this part bypasses the delay on a fully analog path",
    }),
  ];
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
 * **Both times are authored as those divisions** (#346), which is what the knobs read under that
 * switch — `1/8` on the left against `1/8 D` on the right. That is a stereo delay rather than two
 * copies of one: the right repeat falls between the left ones, so the pair widens without either
 * side being long enough to smear a part.
 *
 * **One pair for the whole guide, which is why the choice is a conservative one.** These are
 * `song` scoped and identical in every recipe by construction, so a division picked to flatter a
 * lead is imposed on the sub sitting beside it. `1/8` against `1/8 D` is the setting that stays
 * out of the way of any part this box is given — the same judgment `FEEDBACK` and `MIX` are made
 * on, two lines below, and the reason none of these three is authored per recipe.
 *
 * `LINK DELAYS` is off, for the reason `LINK FILTERS` is: engaged, `TIME-L` stops being the left
 * delay time and becomes an offset between the channels (p.46).
 */
function sharedDelay(): AuthoredParam[] {
  return [
    sw("DELAY · CLOCK SYNC", "ON", OFF_ON, 46, {
      scope: "song",
      note: "Both TIME knobs jump between divisions of the global TEMPO",
    }),
    sw("DELAY · SYNC TYPE", "COMBO", DELAY_SYNC_TYPE, 47, {
      scope: "song",
      hint: "edit-submenu",
      note: "Its printed default — every division rather than only straight, triplet or dotted ones",
    }),
    sw("DELAY · LINK DELAYS", "OFF", OFF_ON, 46, {
      scope: "song",
      note: "Off, so TIME-L is the left delay time rather than an offset against the right",
    }),
    // #346. The two controls #349 left on the Appendix A scale, now on the one the CLOCK SYNC
    // above puts in force. A reader turns the knob until the screen reads the division, which is
    // §8's premise and is why no CC-to-division mapping is needed to state either of these.
    division(
      "DELAY · TIME - L",
      "1/8",
      93,
      "Straight, against the dotted right",
    ),
    division(
      "DELAY · TIME - R",
      "1/8 D",
      94,
      "Dotted, so its repeat falls between the left one’s",
    ),
    cc("DELAY · FEEDBACK", 40, 103, {
      scope: "song",
      note: "Single repeat through to infinite",
    }),
    // `50`, and it has to be exactly that: the note names noon, and on a 0-100 readout noon is
    // 50. On the old CC scale it was 64 for the same reason, which is the one place in this file
    // where re-authoring and converting would have agreed.
    cc("DELAY · CHARACTER", 50, 104, {
      scope: "song",
      note: "Noon, where the default DJ-style filter on the repeats is doing nothing",
    }),
    // #349, re-derived as travel: a quarter of the knob, from a wash you notice only when it
    // stops to a delay that is part of the arrangement.
    cc("DELAY · MIX", 30, 105, {
      scope: "song",
      mood: [{ axis: "space", amount: 25 }],
    }),
  ];
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
    sw("MULTI MODE", "ON", OFF_ON, 110, {
      scope: "song",
      hint: "midi-settings",
      note: "Its printed default, and what makes the two timbres separately playable",
    }),
    sw("MIDI IN CHANNEL", "1", MIDI_CHANNELS, 110, {
      scope: "song",
      hint: "midi-settings",
      note: "TIMBRE A listens here",
    }),
    sw("MULTI IN B CHANNEL", "2", MIDI_CHANNELS, 110, {
      scope: "song",
      hint: "midi-settings",
      note: "TIMBRE B listens here. Both default to 1, so this must be changed or the two timbres double on one channel",
    }),
    // Without this every `Send MIDI CC …` note above is inert, which makes it the same shape as
    // `MIDI CLOCK OUT` defaulting to off (§7.4/#104): one unstated setting that stalls everything
    // depending on it.
    sw("RECIEVE CC", "ON", OFF_ON, 111, {
      scope: "song",
      hint: "midi-settings",
      note: "Defaults to OFF, so the box ignores CC until this is set. The manual's spelling",
    }),
  ];
}

/**
 * LFO 1 (pp.52-53, 57). `SYNC` is `OFF` on every recipe so that the printed Hz range is the one in
 * force — with it on, `RATE` jumps between clock divisions the manual never enumerates.
 *
 * `RATE MIN` and `RATE MAX` are carried because they are what the cited range actually is: p.52
 * says the knob *"defaults to 0.01 Hz–40.00 Hz but has a maximum range of 0.00 Hz – 1.00 kHz
 * (configurable in MORE menu)"*, and those two settings are saved per patch.
 */
function lfo1(
  waveform: string,
  rate: number,
  amplitude: number,
  perVoice = "GLOBAL",
): AuthoredParam[] {
  return [
    sw("LFO 1 · WAVEFORM", waveform, LFO_WAVES, 53),
    num("LFO 1 · RATE", rate, { min: 0.01, max: 40 }, 52, {
      unit: "Hz",
      step: 0.01,
      note: "The default range; RATE MIN and RATE MAX in the MORE menu can widen it to 1 kHz",
    }),
    cc("LFO 1 · AMPLITUDE", amplitude, 13, {
      note: "An attenuator ahead of every destination",
    }),
    sw("LFO 1 · SYNC", "OFF", OFF_ON, 57, {
      hint: "edit-submenu",
      note: "Off, so RATE is the free-running Hz scale rather than tempo divisions",
    }),
    sw("LFO 1 · LFO TYPE", perVoice, ["GLOBAL", "PER-VOICE"], 57, {
      hint: "edit-submenu",
      note: "PER-VOICE gives eight separate LFOs, one per voice",
    }),
  ];
}

/**
 * PITCH LFO (pp.58-60). A variable-skew LFO *"specifically dialed in for subtle vibrato amounts"*,
 * with four hardwired destination buttons of its own.
 *
 * `AMOUNT` is the one modulation depth on this box with a stated musical size: p.59's tip says
 * turning it to maximum gives *"+/- 2 semitone movement"*. The knob itself is still unnumbered, so
 * the percentage its screen shows carries the value and the semitone figure is the note beside it.
 */
function pitchLfo(
  rate: number,
  shape: number,
  amount: number,
  targets: { osc1: string; osc2: string },
): AuthoredParam[] {
  return [
    num("PITCH LFO · RATE", rate, { min: 0.01, max: 40 }, 58, {
      unit: "Hz",
      step: 0.01,
    }),
    cc("PITCH LFO · SHAPE", shape, 19, {
      note: "Sawtooth fully counter-clockwise, a symmetrical triangle at noon, ramp fully clockwise",
    }),
    cc("PITCH LFO · AMOUNT", amount, 20, {
      note: "Bipolar, no modulation at noon; ±2 semitones at maximum",
    }),
    sw("PITCH LFO · ▸ OSC 1", targets.osc1, OFF_ON, 59),
    sw("PITCH LFO · ▸ OSC 2", targets.osc2, OFF_ON, 59),
    sw("PITCH LFO · SYNC", "OFF", OFF_ON, 60, { hint: "edit-submenu" }),
  ];
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
function arp(
  direction: string,
  octaveRange: number,
  gateLength: number,
  clockDiv: string,
): AuthoredParam[] {
  return [
    sw("ARP · ON", "ON", OFF_ON, 68),
    sw("ARP · DIRECTION", direction, ARP_DIRECTION, 68, {
      note: "ORD plays the notes in the order they were pressed; PTN follows the MORE menu pattern; RND is random",
    }),
    num("ARP · OCTAVE RANGE", octaveRange, { min: 1, max: 4 }, 68, {
      note: "How many octaves the pattern spans",
    }),
    num("ARP · GATE LENGTH", gateLength, { min: 1, max: 99 }, 70, {
      unit: "%",
      note: "One length for every step, as a proportion of the step",
    }),
    num("ARP · SWING", 50, { min: 25, max: 75 }, 71, {
      unit: "%",
      mood: [{ axis: "swing", amount: 18 }],
      hint: "edit-submenu",
      note: "50% is straight",
    }),
    sw("ARP · CLOCK DIV", clockDiv, ARP_CLOCK_DIV, 71, {
      hint: "edit-submenu",
      note: "Which divisions the CLOCK DIV knob is allowed to reach",
    }),
  ];
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
 *    at noon, so both filters sit at `0` on the signed scale their screens show. It is worth
 *    knowing what `0` used to mean here: before #349 the value was `0` on a *percent* readout,
 *    where that is not *off* but fully inverted — the reading a unipolar assumption produces. The
 *    number is the same and it is now the right number for the opposite reason.
 *
 * **Percent points are multiples of five so a reader can land on them.** §8's reader is at the
 * machine with their hands on a knob and their eyes on the screen: *set it to 75* survives that
 * and `74` is a number they chase past. It is a legibility rule and it proves nothing on its own —
 * a converted value rounded onto the grid would sit on it just as neatly. What rules conversion
 * out is that these were chosen from the patch; the grid only makes them dialable.
 *
 * **The grid is a rule about percentages and it stops at the six envelope times** (#381). Five
 * percent of a fader's travel is a step a reader can see; five *seconds* is most of the envelope,
 * and rounding a 0.3 s stab tail onto a multiple of five would delete it. Those six are authored
 * in tenths of a second instead, which is the same legibility argument answered in the unit the
 * screen is actually showing — see `ENVELOPE_SECONDS`, which is also where the granularity is
 * stated as an authoring choice rather than as something anybody read off the display.
 *
 * **And they carry no ordering claim over from the percentages they replace.** The old numbers
 * were positions on a fader; the new ones are durations, chosen from what each part is doing —
 * a stab is over before the next one, a texture is still arriving. Where the two happen to agree
 * about which part is longer, that is because the musical reading was the same both times, not
 * because anything was converted.
 *
 * Where the manual anchors a position, the anchor is exact: a square wave is `50` on `PULSE WIDTH`
 * (p.19), a self-oscillating ladder is `100` on `RESONANCE` (p.36), and a bipolar control at rest
 * is `0` — both `ENVELOPE AMOUNT` knobs and `VCA · PAN`. Those resting positions are the points
 * here that carry a citation; every other number in this file is taste. The cutoffs are in Hz and
 * are corners rather than positions.
 */
const recipes: Recipe[] = [
  // ---- pad: the reason an eight-voice box is in the library ---------------
  {
    id: "muse-pad-soft",
    role: "pad",
    character: "soft",
    voice: "timbre",
    verified: false,
    title:
      "Two triangles a fifth apart, filters in stereo, nothing arriving at once",
    params: [
      ...voice("OFF", "OFF", 15),
      ...midiSetup(),
      // Triangles, so the blend is at its triangle end and no pulse is mixed in at all. PULSE
      // WIDTH is at the square position it rests at, inaudible behind a WAVE MIX of 0.
      ...osc1("8'", 0, 0, 50, 0),
      ...osc2("8'", 3, 0, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 10, 10, { osc1: "ON", osc2: "ON" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      // Two triangles into a clean ladder with no drive wanted: high enough to be present, short
      // of the unity gain p.19 puts at the top of the fader.
      ...mixer(65, 0, 65, 0, 0, 0),
      ...filters("STR", "OFF", 1200, 15, 20, "1:2", 1400, 10, 10, "1:2"),
      ...filterEnv(1.5, 2, 60, 2.5),
      // "Nothing arriving at once" is the whole patch, and this is where it lives.
      ...vcaEnv(2, 2, 90, 3, "ON"),
      ...vca(65, 65),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("TRIANGLE", 0.24, 20, "PER-VOICE"),
    ],
  },
  {
    id: "muse-pad-dark",
    role: "pad",
    character: "dark",
    voice: "timbre",
    verified: false,
    title:
      "Both filters low and serial, sixteen-foot underneath, no top at all",
    params: [
      ...voice("OFF", "OFF", 15),
      ...midiSetup(),
      ...osc1("16'", 0, 20, 50, 0),
      ...osc2("8'", -2, 20, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 10, 5, { osc1: "ON", osc2: "OFF" }, 10, {
        f1: "ON",
        f2: "OFF",
      }),
      // "Sixteen-foot underneath": the 16' is the body and the 8' sits below it. No noise, which
      // is top, and no ring modulator, which is more of it.
      ...mixer(70, 0, 60, 0, 0, 0),
      // Resonance is a peak, and a peak is something above the fundamental. Both low.
      ...filters("SER", "OFF", 500, 10, 10, "1:2", 420, 10, 10, "1:2"),
      ...filterEnv(2, 2.5, 50, 3),
      ...vcaEnv(2.5, 2.5, 90, 3.5, "ON"),
      ...vca(65, 50),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("TRIANGLE", 0.14, 15, "PER-VOICE"),
    ],
  },
  {
    id: "muse-pad-bright",
    role: "pad",
    character: "bright",
    voice: "timbre",
    verified: false,
    title:
      "Sawtooth pair, highpass in parallel with the lowpass, resonance up in the air",
    params: [
      ...voice("OFF", "OFF", 25),
      ...midiSetup(),
      // A sawtooth pair: the blend at its sawtooth end, and still no pulse in the mix.
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 4, 100, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 15, 10, { osc1: "ON", osc2: "ON" }, 15, {
        f1: "OFF",
        f2: "ON",
      }),
      // Saws are loud and the resonance needs headroom to sit above them.
      ...mixer(60, 0, 55, 0, 10, 0),
      // FILTER 1 is the highpass: a corner low enough to thin the bottom, and no envelope on it,
      // because sweeping a highpass corner reads as a filter sweep rather than as air. The
      // resonance the title is about is FILTER 2's, at the top.
      ...filters("PAR", "ON", 180, 35, 0, "1:1", 6000, 45, 20, "1:1"),
      ...filterEnv(1.2, 2.5, 65, 2.2),
      ...vcaEnv(1.5, 2.5, 90, 2.5, "ON"),
      ...vca(65, 70),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("TRIANGLE", 0.42, 20, "PER-VOICE"),
    ],
  },

  // ---- stab: short, and where UNISON earns its place — two of them mono ---
  {
    id: "muse-stab-hard",
    role: "stab",
    character: "hard",
    voice: "timbre",
    verified: false,
    title:
      "Unison stack on a fast envelope, serial filters clamped shut behind it",
    // #383. UNISON without MONO, and it is monophonic anyway: the first note takes every unused
    // voice and the second finds none, which is what the box does rather than what p.104 says.
    // See the module note for the observation and for the argument this replaces. DETUNE is what
    // the stack is made of, so it is the one control here that is up.
    patchPolyphony: 1,
    params: [
      ...voice("ON", "OFF", 30),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("8'", -3, 100, 50, 0, "ON"),
      ...modOsc("OFF", "SQUARE", 25, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(90, 15, 90, 0, 0, 30),
      // Clamped shut and opened by the envelope rather than by the knob: the corner sits under
      // the note and ENVELOPE AMOUNT well above noon is what throws it up on each attack. `70` on
      // the signed scale is over a third of the way up from centre.
      ...filters("SER", "OFF", 300, 55, 70, "1:1", 450, 35, 40, "1:2"),
      // Nothing sustains: both envelopes are over before the key is.
      ...filterEnv(0, 0.2, 0, 0.2),
      ...vcaEnv(0, 0.3, 0, 0.2, "ON"),
      ...vca(80, 25),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("SQUARE", 4.8, 0),
    ],
  },
  {
    id: "muse-stab-bright",
    role: "stab",
    character: "bright",
    voice: "timbre",
    verified: false,
    title:
      "Pulse-width pair four feet up, highpass parallel, a hard clip on the tail",
    params: [
      ...voice("OFF", "OFF", 20),
      ...midiSetup(),
      // A pulse-width pair: WAVE MIX all the way to the pulse side, and the width narrow either
      // side of the square at noon, which is where a pulse gets reedy rather than hollow.
      ...osc1("4'", 0, 0, 30, 100),
      ...osc2("4'", 2, 0, 35, 100, "OFF"),
      ...modOsc("OFF", "SINE", 30, 0, { osc1: "OFF", osc2: "OFF" }, 20, {
        f1: "OFF",
        f2: "ON",
      }),
      ...mixer(85, 0, 85, 10, 0, 0),
      ...filters("PAR", "ON", 150, 25, 0, "1:1", 8000, 30, 50, "1:1"),
      ...filterEnv(0, 0.4, 0, 0.3),
      ...vcaEnv(0, 0.4, 0, 0.2, "ON"),
      ...vca(80, 45),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("TRIANGLE", 3.2, 0),
    ],
  },
  {
    id: "muse-stab-dirty",
    role: "stab",
    character: "dirty",
    voice: "timbre",
    verified: false,
    title:
      "Ring modulator over the top of the mix, oscillator two syncing hard",
    // #383, the same as `muse-stab-hard`: UNISON spends every voice on the first note.
    patchPolyphony: 1,
    params: [
      ...voice("ON", "OFF", 45),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 5, 100, 50, 0, "ON"),
      ...fm("1>2", 55),
      ...modOsc("ON", "SQUARE", 55, 20, { osc1: "OFF", osc2: "ON" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      // "Over the top of the mix" is a level instruction: the ring modulator is the loudest thing
      // in the fader bank, above both oscillators rather than beside them.
      ...mixer(70, 85, 70, 25, 15, 75, "HIGH"),
      ...filters("SER", "OFF", 700, 55, 40, "1:2", 800, 40, 20, "1:2"),
      ...filterEnv(0, 0.3, 10, 0.3),
      ...vcaEnv(0, 0.4, 10, 0.3, "ON"),
      ...vca(75, 35),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("RANDOM", 7.5, 20),
    ],
  },

  // ---- lead: two mono, one that keeps its voices --------------------------
  {
    id: "muse-lead-bright",
    role: "lead",
    character: "bright",
    voice: "timbre",
    verified: false,
    title: "Mono sawtooth with the filter tracking the keyboard one to one",
    patchPolyphony: 1,
    params: [
      // Under MONO, DETUNE differentiates the two oscillators' tracking rather than spreading
      // voices (p.105), so a moderate setting is a thickness rather than a chorus.
      ...voice("OFF", "ON", 20),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("8'", 1, 100, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 20, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(75, 0, 70, 0, 0, 15),
      // Both corners above the line and KB TRACKING at 1:1, so the filter rises with the melody
      // instead of dulling its top octave.
      ...filters("SER", "OFF", 2000, 30, 20, "1:1", 3200, 20, 10, "1:1"),
      ...filterEnv(0.1, 0.8, 55, 0.6),
      ...vcaEnv(0.1, 0.9, 90, 0.6, "ON"),
      ...vca(80, 0),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...pitchLfo(5.2, 50, 60, { osc1: "ON", osc2: "ON" }),
    ],
  },
  {
    id: "muse-lead-hard",
    role: "lead",
    character: "hard",
    voice: "timbre",
    verified: false,
    title: "Mono square, resonance at the edge, envelope thrown at the cutoff",
    patchPolyphony: 1,
    params: [
      ...voice("OFF", "ON", 15),
      ...midiSetup(),
      // A square, which is the pulse at noon (p.19) with WAVE MIX fully across to it.
      ...osc1("8'", 0, 0, 50, 100),
      ...osc2("8'", -2, 0, 50, 100, "ON"),
      ...modOsc("OFF", "SINE", 20, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(85, 10, 85, 0, 0, 40),
      // "At the edge" is just short of the self-oscillation p.36 puts at fully clockwise, and the
      // envelope amount is the other half of the title.
      ...filters("SER", "OFF", 550, 85, 80, "1:1", 900, 35, 20, "1:2"),
      ...filterEnv(0, 0.5, 25, 0.4),
      ...vcaEnv(0, 0.6, 90, 0.5, "ON"),
      ...vca(85, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...pitchLfo(6.4, 50, 55, { osc1: "ON", osc2: "ON" }),
    ],
  },
  {
    id: "muse-lead-dirty",
    role: "lead",
    character: "dirty",
    voice: "timbre",
    verified: false,
    title:
      "Cross-modulated pair driven into the mixer, still one note at a time",
    patchPolyphony: 1,
    params: [
      ...voice("OFF", "ON", 40),
      ...midiSetup(),
      // Cross-modulation blurs the waveform anyway, so the blend is saw with a little pulse in it
      // rather than either extreme.
      ...osc1("8'", 0, 85, 50, 15),
      ...osc2("8'", 4, 85, 50, 15, "OFF"),
      ...fm("2>1", 70, 10, 100),
      ...modOsc("ON", "RAMP", 65, 25, { osc1: "ON", osc2: "OFF" }, 25, {
        f1: "ON",
        f2: "OFF",
      }),
      // "Driven into the mixer" is the instruction: both oscillators at the unity-gain end of
      // their faders, which is where p.19 says the drive is.
      ...mixer(95, 50, 95, 35, 15, 85, "HIGH"),
      ...filters("SER", "OFF", 800, 60, 30, "1:1", 750, 45, 10, "1:2"),
      ...filterEnv(0.1, 0.6, 35, 0.6),
      ...vcaEnv(0, 0.9, 85, 0.7, "ON"),
      ...vca(75, 0),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...pitchLfo(7.8, 70, 65, { osc1: "ON", osc2: "ON" }),
    ],
  },

  // ---- bass-mid and sub: MONO, and the manual says so outright -----------
  {
    id: "muse-bass-mid-hard",
    role: "bass-mid",
    character: "hard",
    voice: "timbre",
    verified: false,
    title:
      "Mono sawtooth at eight foot, filter envelope snapping the top off each note",
    patchPolyphony: 1,
    params: [
      // A bass wants the two oscillators tight against each other, so DETUNE is low.
      ...voice("OFF", "ON", 10),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("16'", 0, 100, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 15, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(85, 0, 80, 0, 0, 25),
      // "Snapping the top off each note" is a large positive envelope amount on a corner that is
      // otherwise under the note, with a decay short enough to be a snap.
      ...filters("SER", "OFF", 380, 40, 70, "1:2", 550, 20, 20, "1:2"),
      ...filterEnv(0, 0.3, 0, 0.2),
      ...vcaEnv(0, 0.4, 80, 0.2, "ON"),
      ...vca(90, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("TRIANGLE", 0.8, 0),
    ],
  },
  {
    id: "muse-bass-mid-dark",
    role: "bass-mid",
    character: "dark",
    voice: "timbre",
    verified: false,
    title:
      "Mono triangle pair, both ladders low, nothing above the fundamental",
    patchPolyphony: 1,
    params: [
      ...voice("OFF", "ON", 5),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("8'", -1, 0, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 10, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(85, 0, 65, 0, 0, 15),
      // "Nothing above the fundamental" rules out both a resonant peak and a filter that opens,
      // so the envelope amounts are at the noon their note calls no modulation.
      ...filters("SER", "OFF", 220, 10, 0, "1:2", 180, 5, 0, "1:2"),
      ...filterEnv(0, 0.8, 30, 0.6),
      ...vcaEnv(0, 1, 85, 0.6, "ON"),
      ...vca(90, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("TRIANGLE", 0.5, 0),
    ],
  },
  {
    id: "muse-bass-mid-dirty",
    role: "bass-mid",
    character: "dirty",
    voice: "timbre",
    verified: false,
    title: "Mono, overload up and the ring modulator sitting under the note",
    patchPolyphony: 1,
    params: [
      ...voice("OFF", "ON", 35),
      ...midiSetup(),
      ...osc1("8'", 0, 90, 50, 10),
      ...osc2("16'", 3, 90, 50, 10, "OFF"),
      ...fm("2>1", 45),
      ...modOsc("ON", "SQUARE", 45, 0, { osc1: "OFF", osc2: "OFF" }, 20, {
        f1: "ON",
        f2: "OFF",
      }),
      // "Sitting under the note" puts the ring modulator well below the oscillators, which is the
      // opposite instruction to `muse-stab-dirty`'s and the same control.
      ...mixer(90, 40, 90, 20, 10, 90, "HIGH"),
      ...filters("SER", "OFF", 450, 50, 40, "1:2", 500, 35, 10, "1:2"),
      ...filterEnv(0, 0.5, 15, 0.4),
      ...vcaEnv(0, 0.7, 80, 0.5, "ON"),
      ...vca(85, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("RANDOM", 5.5, 15),
    ],
  },
  {
    id: "muse-sub-dark",
    role: "sub",
    character: "dark",
    voice: "timbre",
    verified: false,
    title: "Mono sixteen-foot triangle, one ladder, nothing else in the mixer",
    patchPolyphony: 1,
    params: [
      ...voice("OFF", "ON", 0),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("16'", 0, 0, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 10, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      // "Nothing else in the mixer", said in the only place it can be said.
      ...mixer(95, 0, 0, 0, 0, 0),
      // A sub is a fundamental and nothing else: no resonant peak, and no envelope on either
      // corner, which is noon on a bipolar amount rather than zero.
      ...filters("SER", "OFF", 160, 0, 0, "1:2", 130, 0, 0, "OFF"),
      ...filterEnv(0, 0.8, 50, 0.6),
      ...vcaEnv(0, 1.2, 95, 0.6, "OFF"),
      ...vca(95, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("TRIANGLE", 0.1, 0),
    ],
  },
  {
    id: "muse-sub-clean",
    role: "sub",
    character: "clean",
    voice: "timbre",
    verified: false,
    title:
      "Mono sine from a self-oscillating ladder tracking the keys, mixer shut",
    patchPolyphony: 1,
    params: [
      // p.36's tip: "setting RESONANCE fully clockwise allows you to use either filter as a sine
      // wave oscillator" — with KB TRACKING at 1:1 it plays. RESONANCE is `100` because fully
      // clockwise is what the page says, and both ENVELOPE AMOUNTs are `0` — noon on the signed
      // scale — because an envelope on this filter would bend the pitch of the sine rather than
      // shape a tone.
      ...voice("OFF", "ON", 0),
      ...midiSetup(),
      ...osc1("16'", 0, 0, 50, 0),
      ...osc2("16'", 0, 0, 50, 0, "OFF"),
      ...modOsc("OFF", "SINE", 10, 0, { osc1: "OFF", osc2: "OFF" }, 0, {
        f1: "OFF",
        f2: "OFF",
      }),
      ...mixer(0, 0, 0, 0, 0, 0),
      ...filters("SER", "OFF", 200, 100, 0, "1:1", 140, 0, 0, "OFF"),
      ...filterEnv(0, 0.8, 50, 0.6),
      ...vcaEnv(0.1, 1, 95, 0.7, "OFF"),
      ...vca(90, 0),
      ...sharedDelay(),
      ...delayRouting("OFF"),
      ...lfo1("TRIANGLE", 0.1, 0),
    ],
  },

  // ---- texture: eight voices held, non-melodic ---------------------------
  {
    id: "muse-texture-soft",
    role: "texture",
    character: "soft",
    voice: "timbre",
    verified: false,
    title:
      "Per-voice modulation oscillators drifting the pitches apart under a stereo pair",
    params: [
      ...voice("OFF", "OFF", 30),
      ...midiSetup(),
      ...osc1("8'", 0, 10, 50, 0),
      ...osc2("8'", 6, 10, 50, 0, "OFF"),
      // AUDIO off: eight independent per-voice LFOs, which is the whole point of this patch, so
      // the rate is at the bottom of the knob and the pitch amount is the audible one.
      ...modOsc("OFF", "SINE", 5, 30, { osc1: "ON", osc2: "ON" }, 20, {
        f1: "ON",
        f2: "ON",
      }),
      ...mixer(60, 0, 60, 0, 15, 0),
      ...filters("STR", "OFF", 600, 20, 10, "1:2", 700, 15, 10, "1:2"),
      ...filterEnv(5, 4, 60, 5),
      ...vcaEnv(6, 4.5, 90, 6, "OFF"),
      // A texture sits under everything else, and the pair is wide.
      ...vca(55, 85),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("TRIANGLE", 0.08, 35, "PER-VOICE"),
    ],
  },
  {
    id: "muse-texture-dirty",
    role: "texture",
    character: "dirty",
    voice: "timbre",
    verified: false,
    title:
      "Noise and ring modulator held under a random LFO, overload wide open",
    params: [
      ...voice("OFF", "OFF", 60),
      ...midiSetup(),
      ...osc1("8'", 0, 70, 50, 25),
      ...osc2("2'", -5, 70, 50, 25, "ON"),
      ...modOsc("ON", "NOISE", 70, 30, { osc1: "ON", osc2: "ON" }, 35, {
        f1: "ON",
        f2: "ON",
      }),
      // The title names the two loud things, so the oscillators are the support and the noise and
      // ring modulator are above them.
      ...mixer(40, 75, 40, 45, 85, 95, "HIGH"),
      ...filters("PAR", "ON", 160, 45, 0, "OFF", 2200, 40, 20, "OFF"),
      ...filterEnv(4, 3, 50, 4),
      ...vcaEnv(4.5, 4, 85, 5, "OFF"),
      ...vca(55, 80),
      ...sharedDelay(),
      ...delayRouting("ON"),
      ...lfo1("RANDOM", 1.6, 50, "PER-VOICE"),
    ],
  },

  // ---- arp: the one role that reaches the ARPEGGIATOR --------------------
  {
    id: "muse-arp-clean",
    role: "arp",
    character: "clean",
    voice: "timbre",
    verified: false,
    title:
      "Triangle pluck through two octaves, gates short, nothing on the tail",
    params: [
      ...voice("OFF", "OFF", 5),
      ...midiSetup(),
      ...osc1("8'", 0, 0, 50, 0),
      ...osc2("4'", 0, 0, 50, 0, "OFF"),
      ...mixer(70, 0, 60, 0, 0, 0),
      // A pluck is a filter envelope on an otherwise still corner.
      ...filters("SER", "OFF", 1500, 15, 30, "1:1", 2000, 10, 10, "1:2"),
      ...filterEnv(0, 0.5, 0, 0.2),
      // "Nothing on the tail": no sustain and the shortest release on the device.
      ...vcaEnv(0, 0.4, 0, 0.1, "ON"),
      ...vca(70, 40),
      ...arp("ORD", 2, 34, "STRGHT"),
      ...sharedDelay(),
      ...delayRouting("ON"),
    ],
  },
  {
    id: "muse-arp-bright",
    role: "arp",
    character: "bright",
    voice: "timbre",
    verified: false,
    title:
      "Sawtooth over four octaves in random order, filter tracking, long repeats",
    params: [
      ...voice("OFF", "OFF", 20),
      ...midiSetup(),
      ...osc1("8'", 0, 100, 50, 0),
      ...osc2("4'", 2, 100, 50, 0, "OFF"),
      ...mixer(65, 0, 60, 0, 5, 0),
      ...filters("PAR", "ON", 140, 25, 0, "1:1", 7000, 30, 40, "1:1"),
      ...filterEnv(0, 0.6, 5, 0.3),
      // "Long repeats" is the delay, not the release: the note itself is still short.
      ...vcaEnv(0, 0.5, 5, 0.3, "ON"),
      ...vca(70, 55),
      ...arp("RND", 4, 22, "COMBO"),
      ...sharedDelay(),
      ...delayRouting("ON"),
    ],
  },
];

// ---------------------------------------------------------------------------
// §2.3 Manifest
// ---------------------------------------------------------------------------

/**
 * The seven roles one timbre of this synthesizer can honestly claim.
 *
 * `pad` and `texture` are polyphonic uses of four voices; `lead`, `bass-mid` and `sub` are the
 * monophonic ones, and each says so with `MONO` and `patchPolyphony: 1` rather than by
 * implication. **`stab` is both**, which is the one place the split is not by role: its two
 * UNISON recipes spend every voice on the first note and carry the same `patchPolyphony: 1`
 * without carrying `MONO` (#383), and `muse-stab-bright` leaves UNISON off and stays chordal. `arp` is here — and is *not* here for the minilogue xd — because this box's
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
const TIMBRE_ROLES = [
  "pad",
  "stab",
  "lead",
  "bass-mid",
  "sub",
  "texture",
  "arp",
] as const;

export const device: Device = {
  id: "moog-muse",
  name: "Muse",
  maker: "Moog",
  kind: "synth",

  /**
   * Both directions, three transports, and the two directions are not the same set — see the
   * module note. `preferredSource` is not claimed (§7.4): this box can drive a rig and nothing in
   * the document says that is its job.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ["midi-din", "usb", "analog-clock"],
    sendTransport: ["midi-din", "analog-clock"],
    receiveTransport: ["midi-din", "usb", "analog-clock"],
    sourceSetup: [
      {
        transport: "midi-din",
        path: "CLOCK MORE > MIDI CLOCK OUT",
        value: "ON",
        note: "Defaults to OFF, so nothing leaves the MIDI OUT until this is set",
      },
      {
        transport: "analog-clock",
        path: "CLOCK MORE > CLOCK OUT SOURCE",
        value: "INT CLOCK",
        note: "The default; STRT/STOP follows MIDI transport instead",
      },
    ],
  },

  capabilityEvidence: {
    "clock.canSendClock": {
      kind: "manual",
      source: `${MANUAL}, p.66`,
    },
    "clock.canReceiveClock": {
      kind: "manual",
      source: `${MANUAL}, p.66`,
    },
    "clock.transport": {
      kind: "manual",
      source: `${MANUAL}, pp.26, 66`,
    },
    /**
     * §2.6/#120, §7.4/#80. Read and silent, which is `unknown` rather than a claim either way.
     * p.65 says the CLOCK section *"establishes the global tempo for Muse"* — about itself — and
     * pp.66-67 give a rich set of outputs a rig could follow. Capability on both sides, and no
     * sentence anywhere saying whether driving a rig is what this box is for.
     */
    "clock.preferredSource": {
      kind: "unknown",
      reason:
        'p.66 gives both halves as capabilities — `MIDI CLOCK OUT (OFF, SEQ, ON. DEFAULT: OFF)` and `CLOCK SOURCE (AUTO, INTERNAL, ANALOG, MIDI IN, USB. DEFAULT: AUTO)` — and p.65 describes the CLOCK section as establishing the tempo "for Muse"; nothing states a role in a rig, and the send half defaulting to off argues mildly against one',
    },
    "clock.sourceSetup[midi-din]": {
      kind: "manual",
      source: `${MANUAL}, p.66`,
    },
    "clock.sourceSetup[analog-clock]": {
      kind: "manual",
      source: `${MANUAL}, pp.66-67`,
    },
    "io.main": { kind: "manual", source: `${MANUAL}, p.117` },
    "io.individualOuts": { kind: "manual", source: `${MANUAL}, p.117` },
    /**
     * `cited-against`, and this is the state that carries a page because the document answers no.
     * p.117's REAR PANEL block lists audio outputs, headphones, pedal inputs, CV inputs, CV
     * outputs; p.118 adds clock in, clock out, MIDI and the two USB ports. There is no audio input
     * of any kind. p.26's connector walkthrough lists the same fourteen and no other.
     */
    "io.audioIn": {
      kind: "cited-against",
      cite: { kind: "manual", source: `${MANUAL}, pp.26, 117-118` },
      reason:
        "p.26 walks every rear connector and pp.117-118's REAR PANEL block lists them again — audio outputs, headphones, two pedal inputs, two CV inputs, two CV outputs, clock in, clock out, MIDI in/out/thru, two USB ports and the IEC. Fourteen jacks and not one of them takes audio; the pedal inputs are TRS control, not a signal path",
    },
    "io.usbAudio": {
      kind: "cited-against",
      cite: { kind: "manual", source: `${MANUAL}, p.118` },
      reason:
        "p.118 gives both ports as MIDI and only MIDI — `USB B: USB-B connector for interfacing with a computer or other host MIDI device` and `USB A (HOST): USB-A connector for connecting to other instruments with Muse as the MIDI host` — and the MIDI line beside them reads `5 Pin DIN MIDI IN, OUT, THRU; MIDI over USB`, with no audio class mentioned anywhere",
    },
    voices: { kind: "manual", source: `${MANUAL}, pp.8, 106, 116` },
    "features.lfo": { kind: "manual", source: `${MANUAL}, pp.52, 57-58, 63` },
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
      kind: "cited-against",
      cite: { kind: "manual", source: `${MANUAL}, pp.12, 116-118` },
      reason:
        "p.116 gives `SOUND ENGINE  Analog` and lists every module — oscillators, ring modulator, noise, mixer, filters, envelopes, VCA, delay — with no sample player among them, and pp.117-118 show no audio input of any kind; the 224 factory patches p.12 counts are stored panel settings rather than audio a recipe could load, so no recipe here carries `sourceAudio`",
    },
    noteDuration: { kind: "manual", source: `${MANUAL}, p.84` },
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
  noteDuration: { kind: "per-note-value", control: "GATE" },

  /**
   * `MAIN OUT LEFT (MONO)` and `MAIN OUT RIGHT`, 1/4" TRS (p.117), and nothing else — the
   * headphone jack on the front edge of the Left-Hand Controller carries the same signal. No audio
   * input and no USB audio; both are `cited-against` above rather than merely unclaimed.
   */
  io: { main: "stereo", individualOuts: 0, audioIn: false, usbAudio: false },

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
    note: "Touches up tuning for the current temperature; takes a few seconds",
    path: "PROGRAMMER > TUNING > START QUICK TUNE",
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
    summary:
      "Full TUNING and AUTOCAL, beside the quick tune on the same settings page",
    caution:
      "Moog say the instrument is calibrated and tuned at the factory, and not to run full TUNING or AUTOCAL unless there is a significant problem that cannot be solved by other means",
    verified: cite(112),
  },

  manual: { title: "Moog Muse User's Manual", edition: "Version 1.4.0" },

  productPage: "https://www.moogmusic.com/synthesizers/muse/",

  /**
   * **Two timbres, four notes each.** The module note is the long form; the short form is that the
   * eight voices are shared between two independent patches whose counts always sum to eight
   * (p.106), so four is the count each one can rely on whatever the other is doing.
   */
  voices: [
    {
      /**
       * **No `triggerNote`** (§2.1/#334). The field is a loaded sample's original pitch and there
       * is no sample here — `capabilityEvidence.content` carries p.116's `SOUND ENGINE  Analog`
       * and a module list with no sample player in it. p.27 says what a note does instead:
       * `FREQUENCY` *"detunes each oscillator from the pitch associated with a keyboard note"*,
       * and at noon *"if a C is pressed, a C will sound"*. Musical pitch, which §4.1 leaves to the
       * direction. See the head note; the tests are in `test/moog-muse.test.ts`.
       */
      kind: "pool",
      id: "timbre",
      label: "Timbre",
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
      destinations: [
        "pitch",
        "filter-cutoff",
        "pulse-width",
        "vca-level",
        "pan",
        "delay-time",
      ],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    "edit-submenu": "Press MORE in that section",
    "timbre-select": "Light TIMBRE A or B first",
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
    "voice-count": "VOICE CONTROL, then MORE",
    "midi-settings": "PROGRAMMER, MENU, MIDI",
    "init-patch": "Press INIT for a blank patch",
    "save-patch": "SAVE, name it, CONFIRM",
    "arp-steps": "Press ARP, then buttons 1-16",
  },

  recipes,
};
