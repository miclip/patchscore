import type {
  CapabilityEvidence,
  Device,
  JackSignalKind,
  JackSpec,
  PatchEntry,
  Recipe,
} from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { CASCADIA_PANEL } from './panel'

/**
 * Intellijel Cascadia (§2.3) — "a standalone semi-modular tabletop synthesizer" (p.8), one
 * monophonic voice and **over 100 eurorack-compatible patch points**.
 *
 * This is the first manifest in the library whose recipes carry a `patch` list, and the reason
 * it was scheduled: §3.3 says a patchable device's recipe *is* a patch list plus knob positions,
 * and until now that shape had never met real data. What follows is that data. The findings it
 * produced are recorded below rather than smoothed over, because a device authored to test a
 * shape is only useful if it reports what the shape did.
 *
 * **Source**: `manuals/cascadia_manual_v1.4_2026.04.13.pdf`, 122 pages, printed page number ==
 * PDF page number, checked on ten footers across the book. One document, no firmware split —
 * Intellijel reissues the whole manual per firmware, so unlike the Deluge there is no second
 * source to read alongside it.
 *
 * **Re-cited from v1.1 (2023.04.18) at #481.** Eighteen of the nineteen pages this file cites sit
 * at the same index in v1.4, and the reason is where the twelve added pages went in rather than
 * how many there are.
 *
 * **Pages 1-92 align index for index. Divergence begins at p.93**, which is the inserted ESG
 * section: v1.1's p.93 is v1.4's p.94, and everything after it moves. The shift is not a single
 * block — the Config App chapter takes further insertions on the way through (v1.1's p.99 is
 * v1.4's p.103, its p.106 is v1.4's p.113) — so a page number below 93 transfers and a page number
 * above it has to be found again. Every one of the eighteen sits below 93, which is why they hold.
 *
 * The nineteenth is above it *and* is a page v1.4 splits in two: v1.1's p.110 carried FIRMWARE
 * UPDATES and TECHNICAL SPECIFICATIONS together, where v1.4 gives them pp.118 and 122. The
 * citation is on `physical.panelSpanMm`, so it follows the specifications table to 122 and not the
 * firmware text to 118. Each page was matched against what its citation is *for* rather than
 * against its first line — a page surviving is not the cited fact surviving, and this is the one
 * that proves the difference. No authored value moved.
 *
 * ### The four post-v1.1 features, and what each one got
 *
 * v1.4's change log (pp.118-121) runs to 1.4 (Feb 27, 2024). Each entry was read against the
 * pages that describe it and answered separately. **One is content; three are facts about the
 * box.** "Assessed and capability-only" is a result here, not a shortfall — a mode that changes
 * how the instrument is played and controlled is not a way to make a part sound.
 *
 * ```
 * feature                       verdict            where it landed
 * Entropic Sequence Generator   authored           cascadia-sweep-soft, cited p.93
 * MPE                           capability-only    MIDI PITCH / CC / MOD notes, pp.101-102
 * Dual Mono MIDI Mode           capability-only    MIDI CC / MOD signal kinds, p.100
 * assignable CCs 0-127          capability-only    MIDI CC / MOD notes, pp.109-110
 * ```
 *
 *  - **The ESG is the one that reached existing content**, because it *"will replace the Tilt LFO
 *    on Env B"* and this file already authors RISE, FALL and SHAPE. Every LFO-mode recipe now
 *    names which shape is in force; see `ENV_B_LFO_SHAPES`.
 *  - **MPE** is a way of playing the box, not a sound it makes: p.101 gives the three axes and
 *    p.102 says which socket carries each. Recorded on the jacks that carry them.
 *  - **Dual Mono** is the one that changes what a socket *is* — p.100 puts voice 2's pitch on the
 *    `MIDI CC` jack and voice 2's gate on `MIDI MOD`, "thus disabling these two jacks as MOD
 *    sources on the first channel". The signal lists say so; the voice count deliberately does
 *    not, for the reason set out beside the jacks.
 *  - **The 0-127 CC range is the one with a caveat, and it is worth stating precisely**: the
 *    change log records the firmware gaining it at 1.2.6.0, but v1.1's manual *already printed*
 *    `(0 - 127)` on its pp.103-104, word for word what v1.4 prints on pp.109-110. So this is new
 *    to the manifest and not new to the document, and describing it as an edition difference
 *    would be wrong. It is recorded because those pages had never been cited here, not because
 *    they changed.
 *
 * ---------------------------------------------------------------------------------------------
 * ## What a Cascadia recipe actually is
 *
 * **The default signal path is already a complete voice.** With no cables at all: MIDI or CV in,
 * VCO A's sine and the ring modulator into the mixer, mixer into the filter, filter into VCA A,
 * Envelope A on the VCA, Envelope B on the filter, VCA A out to MAIN. Most inputs on this box are
 * normalled to something, and the manual states each one as a `DEFAULT ROUTING:` paragraph under
 * the jack it belongs to.
 *
 * Not *all* of them, and the recipes below depend on the difference. `VCO A · FM 1`,
 * `VCF · FM 3`, `VCF · Q`, `WAVE FOLDER · FOLD` and `LFO X / Y / Z · RATE CV` have no normal at
 * all — the manual says so in as many words, "there is no normal routing, and the FM 3 slider
 * will have no effect" — so a cable into one of those is the whole gesture rather than a
 * replacement for anything.
 *
 * So a patch entry here does one of two things, and its `note` says which: it **replaces** a
 * stated normal, or it **supplies** a modulation the panel leaves empty. A guide that listed
 * cables without saying which would be telling a reader to do something whose effect they could
 * not predict.
 *
 * ## Jack names are section-qualified, and they have to be
 *
 * §3.3 argues patch points are verifiable on the same terms as parameter values because the jacks
 * are named in the manual. That holds — every jack in `JACKS` below is printed on the panel and
 * described in an "X Jacks" page — but it needs one qualification the design did not anticipate:
 * **the names are not unique**. `IN` is silkscreened in the S&H, mixer, filter, wave folder and
 * VCA sections; `TRIG` appears twice; `PITCH`, `SYNC`, `LEVEL`, `RATE`, `MAIN`, `GATE` and `FM 1`
 * all repeat. A bare `from: 'IN'` would be unresolvable at the machine.
 *
 * So every jack id is written `SECTION · JACK`, using the section name the panel itself prints.
 * Nothing is left to discipline: the core refuses a patch entry naming a jack this device does
 * not declare, or one that leaves an input, and `cable()` takes the declared ids as a type so the
 * same mistake is a compile error first.
 *
 * ## What this device found, and what was done about it — #49
 *
 * `PatchEntry` did **not** survive contact unchanged, and the defect was in the type rather than
 * in the data. It took two attempts to name it properly, and the first one was wrong.
 *
 * The visible symptom was that a cable's provenance could only come from `Recipe.verified`, while
 * §3 had always said the recipe citation is inherited by "any param, patch entry or articulation
 * entry that does not carry its own". So `verified` was added to both entry kinds — a real repair,
 * and `ArticulationEntry` had the identical defect nobody had found yet — and every cable was
 * given a page.
 *
 * That was still wrong, because **a cable carries three claims, not one**:
 *
 *     the `from` jack exists      documented — p.27
 *     the `to` jack exists        documented — p.68
 *     connecting them is right    taste
 *
 * Citing the cable to a page made it assert all three, and the middle claim was the only one that
 * page actually supported. Twenty-seven cables asserted a provenance the data did not support,
 * and the handful of jacks they share had their citations copied over and over.
 *
 * The right shape is the one the codebase already used for articulation keys against
 * `features.perStep`: **the fact belongs to the device**. `JACKS` declares each patch point once,
 * cited once, and a cable references two of them. What is left for the cable's own `verified` is
 * exactly one question — is this connection the right choice — and for taste-authored patching
 * the honest answer is `false`, which is what it now says.
 *
 * Four cables here are not taste. The MAKE A SOUND walkthrough (pp.11-16) builds a patch cable by
 * lettered cable and instructs them exactly, so those carry the page that instructs them. That
 * the field discriminates between the two is the evidence it is pulling its weight.
 *
 * ---------------------------------------------------------------------------------------------
 * ## Numbers: what this manual does and does not print
 *
 * **Cascadia is set with sliders, and its sliders carry no scale.** There are no numbers beside
 * the FREQ, Q, FM, mixer or fold travels — not on the panel, not in the manual, and the
 * TECHNICAL SPECIFICATIONS page (p.122) lists dimensions and power and nothing else. There is no
 * cutoff range in Hz anywhere in the document, and no resonance figure.
 *
 * So the library splits three ways here, and each way is a different claim:
 *
 *  - **Cited ranges**, where the manual prints one, and these are the only parameters mood may
 *    move (§3.1's legality gate). There are more of them than the paragraph above suggests: the
 *    envelope stage times are printed in full for all three speed settings (p.31), sustain is
 *    "0 V at the bottom and 5 V at the top" (p.28), the octave selectors are eight detents
 *    labelled 0-7 (pp.22, 26), pulse width runs "a 50% duty cycle... approximately a 95% duty
 *    cycle" (p.23), the LFO phase offset is "from 0° at the bottom, to 360° at the top" (p.36),
 *    and the slew maximum is "about 1 second... or 5 seconds" for a 5 V change (p.57).
 *  - **Cited option sets** — filter modes, sub types, noise colours, envelope modes, switch
 *    positions. §3.2: the option set is the legality claim and is cited; which one a recipe picks
 *    is taste. This is the largest category on this box, because most of Cascadia's decisions are
 *    switch positions rather than knob values.
 *  - **Slider travel**, for the controls with no scale at all. See `travel()` below. These are
 *    provisional on both claims and mood never touches them.
 *
 * **Nothing here is an `observed` citation.** Nobody has taken a reading off the instrument, and
 * §3.1 keeps `observed` for somebody who has.
 *
 * ## What is deliberately not authored
 *
 *  - **A filter cutoff or resonance in Hz.** The manual never prints one. `travel()` says where
 *    to put the slider and claims nothing about what frequency that is.
 *  - **LFO X's rate as a number.** p.61 prints "from approximately 15s... to approximately 75 Hz",
 *    which is a period at one end and a frequency at the other. That is not a range; converting
 *    one end to match the other would be arithmetic nobody printed, so the rate is travel.
 *  - **Envelope B's stage times.** p.34 explicitly defers them ("The following section provides
 *    only a generic overview"), so its *modes* are cited and its stage values are travel.
 *    **Corrected at #452:** the DETAILS chapters are not silent after all — p.83 gives RISE
 *    *"from 2ms at the bottom, to 5 seconds at the top"* and p.84 the same sentence for FALL, on
 *    the pages that discuss ENVELOPE mode. The sliders here stay `travel` because that is what
 *    every unmarked Cascadia control is in this file, but the ceiling is a fact now and the riser
 *    below uses it.
 *  - **Any per-step articulation.** Cascadia has no sequencer, so `features.perStep` is absent
 *    and no recipe articulates. See `routing` on the recipes: this box is played from whatever
 *    is sequencing the rig.
 *  - **`swing`.** Checked against the manual, not assumed: the words *swing*, *shuffle* and
 *    *groove* do not appear in it once. Cascadia has no sequencer and therefore no timing
 *    control to offer — every mention of a sequencer in the manual is an *external* one feeding
 *    the box — so no parameter declares the axis and §6.1 lets it decline by simply not
 *    appearing, exactly as a box with no drive stage declines `grit`.
 *
 *    Recorded here rather than left as an omission (#62). The other three devices in this
 *    library all carry a shuffle parameter — TR-1000 pattern `SHUFFLE`, Tracker Mini `SWING`,
 *    Deluge song swing — and without this line the next person to compare them has no way to
 *    tell a box that has nothing from a box nobody got to.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by printed page. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Intellijel Cascadia Manual v1.4, p.${page}` }
}

/**
 * The manual by several printed pages, ascending — `pp.18, 100, 102, 109`.
 *
 * §2.6/#481. Three of the MIDI / CV outputs answer to more than one page now, because v1.4
 * documents modes that change what leaves the socket. The alternative was to move the citation to
 * whichever page was read most recently, which would have quietly dropped the page that says the
 * jack exists at all — and that page is the one a reader looking for the socket needs.
 */
function citePages(pages: readonly number[]): Cite {
  const ascending = [...pages].sort((a, b) => a - b)
  return { kind: 'manual', source: `Intellijel Cascadia Manual v1.4, pp.${ascending.join(', ')}` }
}

/**
 * A declared patch point (§3.3). The page is where the manual describes *this jack*.
 *
 * **Generic in `Id` so the literal survives.** The obvious signature — `(id: string) => JackSpec`
 * — widens every id to `string` the moment it is written, which makes `CascadiaJack` below
 * `string` too and quietly turns the endpoint check into no check at all. It did exactly that for
 * one commit: `cable()` accepted arbitrary text and typechecked, while the comment beside it
 * claimed otherwise. The type-level tripwire in `test/cascadia.test.ts` is there so a silent
 * widening fails the build instead of a reviewer.
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
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number | readonly number[],
  note?: string,
): JackSpec & { id: Id } {
  JACK_EVIDENCE[jackFact(id)] = typeof page === 'number' ? cite(page) : citePages(page)
  return { id, direction, signal, ...(note === undefined ? {} : { note }) }
}

/**
 * §3.3. The patch points these recipes reach for, each cited **once**, on the page that
 * describes it.
 *
 * Sections are declared whole rather than jack by jack: this is the VCF's jack complement, not
 * "the three VCF jacks a recipe happens to use". A partial section reads as a claim that the
 * others do not exist. The patchbay utilities nothing here reaches for — MIXUVERTER, MULTS, SUM,
 * BI ▸ UNI, EXP SRC — are simply absent; a recipe that needs one declares its section then.
 *
 * Section names are the panel's own headers, verbatim, because that is what the reader is
 * looking at: `SLEW / ENV FOLLOW` and not `SLEW`, even where the shorter one would be
 * unambiguous. Jack names are the silkscreen where there is one, and the body text's name where
 * the panel prints only a waveform glyph — VCO B's four outputs, and most of the patchbay.
 */
const JACKS = [
  // §1 MIDI / CV (pp.17-21). Every jack in this section is an output.
  //
  // **None of them carries `midi`**, which is worth saying because the section's name suggests
  // otherwise: these eight are the pitch, CV, gate, trigger and clock this box *derives* from an
  // incoming MIDI stream, and the MIDI ports themselves are on the back panel and not declared
  // here. `signal` describes what is in the cable, not where the box learned it, so `MIDI PITCH`
  // is `pitch-cv` — 1.A calls it a "1V/octave CV output with a 10 octave range (±5V)" — and the
  // rest are the plain control voltages and pulses their own pages describe.
  //
  // **Three of these answer to more than one page after #481**, because v1.4 documents two MIDI
  // modes that change what leaves the socket — and both are box-wide settings made at boot or in
  // the Config app, not per-part controls.
  //
  // **The manifest still declares one voice with one default topology, and the reason is a limit
  // in the schema rather than a judgement about the feature.** `JackSpec.signal` is a flat list and
  // `Device.voices` is a fixed set: neither can be qualified by a mode, so there is no way to write
  // "while the box is in Dual Mono, `MIDI CC` carries voice 2's pitch and there is a second voice
  // to assign". A `Device` describes one topology, and the one it describes here is the box as it
  // ships and as p.100's own instructions assume you are leaving it.
  //
  // Dual Mono's second voice is real, and declaring it unconditionally would be worse than not
  // declaring it: it exists only while that mode is set, so the resolver would be offered a voice
  // most readers' boxes do not have and would allocate parts to it. Expressing this properly is a
  // change to `lib/core`, not something a device folder can reach, and nothing has asked for it
  // yet — one box, one mode.
  //
  // **What that costs, stated rather than hidden.** `MIDI CC` declares `pitch-cv` and `MIDI MOD`
  // declares `gate` on p.100's authority, and those are true *in Dual Mono only*. The signal list
  // is unconditional, so nothing in the type system stops a future recipe patching `MIDI CC` into
  // a pitch input without putting the box in the mode that makes it a pitch. `test/cascadia.test.ts`
  // holds a tripwire on exactly that: a recipe reaching for either as a pitch or gate source has
  // to come here and read this first.
  jack(
    'MIDI / CV · MIDI PITCH',
    'out',
    ['pitch-cv'],
    [17, 101],
    'p.101: in MPE this is the X-axis, and MPE Pitch Bend Range is set to 48 semitones',
  ),
  jack(
    'MIDI / CV · MIDI CC',
    'out',
    ['cv', 'pitch-cv'],
    [18, 100, 102, 109],
    'p.102: the MPE Y-axis (Timbre), as CC 74 unipolar. p.100: in Dual Mono it carries voice 2’s pitch instead, so it stops being a mod source for voice 1. p.109: any CC 0-127, unipolar or bipolar',
  ),
  jack('MIDI / CV · MIDI LFO', 'out', ['cv'], 19),
  jack('MIDI / CV · MIDI CLK', 'out', ['clock'], 20),
  jack('MIDI / CV · MIDI VEL', 'out', ['cv'], 21),
  jack(
    'MIDI / CV · MIDI MOD',
    'out',
    ['cv', 'gate'],
    [21, 100, 102, 110],
    'p.102: the MPE Z-axis (Pressure), as Output Type = Pressure (Aftertouch). p.100: in Dual Mono it carries voice 2’s gate instead, so it stops being a mod source for voice 1. p.110: any CC 0-127, unipolar or bipolar',
  ),
  jack('MIDI / CV · MIDI GATE', 'out', ['gate'], 21),
  jack('MIDI / CV · MIDI TRIG', 'out', ['trigger'], 21),

  // §2 VCO A (p.25). Every jack in this section is an input; the waveforms leave via the mixer.
  jack('VCO A · PITCH', 'in', ['pitch-cv'], 25),
  jack('VCO A · PWM', 'in', ['cv'], 25),
  /**
   * **`FM 1` and `FM 2` are the same kind of input and do not carry the same signal list**, which
   * looks like an oversight and is the pages being honest. 2.C describes FM 1 as an exponential
   * FM input and says nothing about what rate it takes or what feeds it by default; 2.E says
   * FM 2 "uses VCO B's Sine Wave output as the FM 2 source" if nothing is patched, and that is a
   * waveform, named on the page. So `audio` is read for FM 2 and would be inference for FM 1 —
   * audio-rate FM through this socket certainly works, but the manual discusses it in a DETAILS
   * chapter about FM in general rather than beside this jack. Adding it here on that basis is
   * exactly the move CLAUDE.md's cited-wrong-range note is about: it would render as a read page.
   */
  jack('VCO A · FM 1', 'in', ['cv'], 25),
  jack('VCO A · IM', 'in', ['cv'], 25),
  jack('VCO A · FM 2', 'in', ['audio', 'cv'], 25),
  jack('VCO A · SYNC', 'in', ['audio'], 25),

  // §3 VCO B (p.27). The four outputs carry only waveform glyphs on the panel; these are the
  // manual's names for them.
  jack('VCO B · PITCH', 'in', ['pitch-cv'], 27),
  jack('VCO B · SYNC', 'in', ['audio'], 27),
  jack('VCO B · SINE', 'out', ['audio', 'cv'], 27),
  jack('VCO B · TRIANGLE', 'out', ['audio', 'cv'], 27),
  jack('VCO B · SAW', 'out', ['audio', 'cv'], 27),
  jack('VCO B · SQUARE', 'out', ['audio', 'cv'], 27),

  // §4 ENVELOPE A (pp.32-33)
  jack('ENVELOPE A · GATE', 'in', ['gate'], 32),
  jack('ENVELOPE A · CTRL', 'in', ['cv'], 32),
  jack('ENVELOPE A · RETRIG', 'in', ['trigger'], 33),
  jack('ENVELOPE A · EOH', 'out', ['gate', 'trigger'], 33),
  jack('ENVELOPE A · EOA', 'out', ['gate', 'trigger'], 33),
  jack('ENVELOPE A · ENV A', 'out', ['cv'], 33),

  // §5 ENVELOPE B (p.39). The first three are modulation inputs for the sliders above them.
  jack('ENVELOPE B · RISE', 'in', ['cv'], 39),
  jack('ENVELOPE B · FALL', 'in', ['cv'], 39),
  jack('ENVELOPE B · SHAPE', 'in', ['cv'], 39),
  jack('ENVELOPE B · GATE/SYNC', 'in', ['gate', 'trigger', 'clock'], 39),
  jack('ENVELOPE B · EOF', 'out', ['gate', 'trigger'], 39),
  jack('ENVELOPE B · ENV B', 'out', ['cv'], 39),

  // §6 LINE IN (p.40)
  jack('LINE IN · LINE IN', 'out', ['audio'], 40, 'an output: it taps the back panel input after the LEVEL slider'),

  // §7 MIXER (p.43)
  jack('MIXER · IN 1', 'in', ['audio'], 43),
  jack('MIXER · IN 2', 'in', ['audio'], 43),
  jack('MIXER · VCO A TRI', 'out', ['audio'], 43),
  jack('MIXER · VCO A SAW', 'out', ['audio'], 43),
  jack('MIXER · SUB', 'out', ['audio'], 43, 'panel silkscreen is SUB; p.43 calls it VCO A PULSE OUT, which p.42 contradicts'),
  jack('MIXER · NOISE', 'out', ['audio'], 43),
  jack('MIXER · MIXER', 'out', ['audio'], 43),

  // §8 VCF (p.49). LP4 and HP4 are live whatever MODE selects; VCF carries the selected mode.
  jack('VCF · FM 1', 'in', ['cv'], 49),
  /**
   * **1V/oct and still `cv`, deliberately.** 8.B says this input "accepts 1 V/oct signals" and is
   * "ideal for tracking keyboards", which is the strongest case in this manifest for `pitch-cv`
   * on a jack that is not one. It stays `cv` because the member is about what the voltage means
   * and not how it is scaled: what arrives here is a filter cutoff. Patching a keyboard's pitch
   * output into it is a real cable — and the reason a router has to treat `pitch-cv` as something
   * a `cv` input accepts, rather than intersecting the two lists.
   */
  jack('VCF · FM 2', 'in', ['cv'], 49),
  jack('VCF · FM 3', 'in', ['cv'], 49),
  jack('VCF · Q', 'in', ['cv'], 49),
  jack('VCF · IN', 'in', ['audio'], 49),
  jack('VCF · LP4', 'out', ['audio'], 49),
  jack('VCF · HP4', 'out', ['audio'], 49),
  jack('VCF · VCF', 'out', ['audio'], 49),

  // §9 WAVE FOLDER (p.51). No output of its own — it leaves at OUTPUT CONTROL · FOLD.
  jack('WAVE FOLDER · FOLD', 'in', ['cv'], 51),
  jack('WAVE FOLDER · IN', 'in', ['audio'], 51),

  // §10 VCA A (p.53). Also no output of its own; OUTPUT CONTROL · VCA A is where it leaves.
  jack('VCA A · AUX IN', 'in', ['audio'], 53),
  jack('VCA A · IN', 'in', ['audio'], 53),
  jack('VCA A · LEVEL', 'in', ['cv'], 53),

  /**
   * §11 PUSH GATE (p.54). **The note is the hazard, and it is why no recipe here reaches for this
   * socket.** p.54 states two things about the MANUAL GATE button: it gates Envelope A and
   * Envelope B by default when nothing is patched into either of their GATE inputs, and a cable
   * inserted into `GATE OUT` stops it doing so. So the one control that makes this box speak with
   * no sequencer attached is disarmed by patching the jack whose name says it carries that gate —
   * which is exactly "anything a name alone would mislead a reader about".
   */
  jack(
    'PUSH GATE · GATE OUT',
    'out',
    ['gate'],
    54,
    'a cable here stops the MANUAL GATE button triggering Envelope A and Envelope B, which by default it does whenever nothing is patched into either of their GATE inputs',
  ),

  // §12 UTILITIES — the sections these recipes use (pp.56, 58, 62, 65, 68, 70)
  jack('S&H · TRIG', 'in', ['trigger', 'clock'], 56),
  jack('S&H · IN', 'in', ['audio', 'cv'], 56),
  jack('S&H · OUT', 'out', ['cv'], 56),
  jack('SLEW / ENV FOLLOW · IN', 'in', ['audio', 'cv'], 58),
  jack('SLEW / ENV FOLLOW · OUT', 'out', ['cv'], 58),
  jack('LFO X / Y / Z · LFO X', 'out', ['cv'], 62),
  jack('LFO X / Y / Z · LFO Y', 'out', ['cv'], 62),
  jack('LFO X / Y / Z · LFO Z', 'out', ['cv'], 62),
  jack('LFO X / Y / Z · RATE CV', 'in', ['cv'], 62),
  jack('INVERT · IN', 'in', ['cv'], 65),
  jack('INVERT · OUT', 'out', ['cv'], 65),
  jack('RING MOD · IN 1', 'in', ['audio', 'cv'], 68),
  jack('RING MOD · IN 2', 'in', ['audio', 'cv'], 68),
  jack('RING MOD · OUT', 'out', ['audio', 'cv'], 68),
  jack('VCA B / LPF · IN', 'in', ['audio'], 70),
  jack('VCA B / LPF · CV IN', 'in', ['cv'], 70),
  jack('VCA B / LPF · VCA B OUT', 'out', ['audio'], 70),
  jack('VCA B / LPF · LPF B OUT', 'out', ['audio'], 70),

  // §13 I/O CONTROL (pp.71-74)
  jack('EXT IN · PITCH', 'in', ['pitch-cv'], 71),
  jack('EXT IN · GATE', 'in', ['gate'], 71),
  jack('EXT IN · TRIG', 'in', ['trigger'], 72),
  jack('I/O CONTROL · FX IN', 'in', ['audio'], 73),
  jack('I/O CONTROL · FX MIX', 'out', ['audio'], 73),
  jack('OUTPUT CONTROL · FOLD', 'out', ['audio'], 74),
  jack('OUTPUT CONTROL · VCA A', 'out', ['audio'], 74),
  jack('OUTPUT CONTROL · MAIN 1', 'in', ['audio'], 74),
  jack('OUTPUT CONTROL · MAIN 2', 'in', ['audio'], 74),
  jack('OUTPUT CONTROL · MAIN', 'out', ['audio'], 74),
  // `satisfies` rather than a type annotation: an annotation would widen every `id` above back to
  // `string` and take `CascadiaJack` with it. This still fails the build if an entry is not a
  // `JackSpec`, which is the only thing the annotation was buying.
] satisfies JackSpec[]

/**
 * Every declared jack id, as a union of literals. `cable()` takes it, so a mistyped endpoint is a
 * compile error — the Zod check in the codegen (§9) catches the same mistake for every device,
 * and this catches it a step earlier for this one.
 *
 * Exported for `test/cascadia.test.ts`, which asserts at type level that this union is narrow.
 * `Device.jacks` is `JackSpec[]`, so the literals cannot be recovered from the manifest once it
 * is typed as a `Device` — this alias is the only handle a test has on the narrow type.
 */
export type CascadiaJack = (typeof JACKS)[number]['id']

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A numeric whose **range** the manual prints. The point inside it is taste and says so.
 *
 * `verified: false` is written on the point explicitly rather than left to inherit. The recipe's
 * `verified` is `false` too, so this changes nothing today — it is written because the day
 * somebody gives a recipe a default citation, an omitted point would silently claim the manual
 * prints this slider position, which it does not.
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
 * A slider position on a control with **no printed scale**, expressed as percent of travel.
 *
 * This is the honest floor for a box whose panel carries no numbers. Three things make it a
 * description rather than an invention:
 *
 *  - The unit says what is being measured. `% travel` is a fact about a fader anyone can see; it
 *    is emphatically not a claim that the box displays 0-100, which is the inference the Deluge
 *    refused to make about its own 0-50 scale.
 *  - **Both claims are unverified and both render as such.** The point is uncited, so the value
 *    carries the provisional badge (§3.2); the range is explicitly `verified: false`, so it is
 *    counted as an unverified-range debt by the audit and, more importantly, mood is not allowed
 *    to move it. A travel figure is somebody's taste, and mood arithmetic on top of taste inside
 *    bounds nobody checked would be arithmetic dressed as authority.
 *  - `range.verified` is written `false` rather than omitted, and so is the point in `num`. Both
 *    are explicit because inheritance is a real mechanism (§3.1) and silence would mean "take the
 *    recipe's", which is a claim rather than an absence.
 *
 * The alternative was to author no slider positions at all, which would leave every recipe on
 * this box as a bare cable list — and §3.3 says a semi-modular's recipe is a patch list **plus
 * knob positions**. A provisional number a reader can dial and then move is worth more than a
 * silence, provided it is marked, and §3.2 exists precisely so that it can be.
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
  options: string[],
  where: Cite,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: where },
    verified: false,
    ...extra,
  }
}

/**
 * A cable: two declared jacks, what it does, and whether *the connection itself* is cited.
 *
 * The endpoints carry no citation here and do not need one — `JACKS` above says each jack
 * exists, once, on its own page. What is left for the entry to claim is the only thing left in
 * doubt: **whether connecting these two is the right move**. For almost everything below that is
 * taste, so it is `false` and renders provisional, which is the honest answer and the one the
 * shape could not give before the jack list existed.
 *
 * `recommended` is the exception, and the manual supplies real ones: the MAKE A SOUND walkthrough
 * (pp.11-16) builds a patch cable by lettered cable and instructs several of these exactly. Those
 * carry the page that instructs them.
 */
function cable(from: CascadiaJack, to: CascadiaJack, note: string, recommended?: number): PatchEntry {
  return { from, to, note, verified: recommended === undefined ? false : cite(recommended) }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/**
 * p.44: "a selectable output with eight filtering options", enumerated pp.46-48. Two errata are
 * reproduced as-is on purpose: the body text at p.46 says "six possible filter types" and then
 * lists eight, and it spells the last mode `PHZR` where the panel silkscreens `PHZ`. The panel
 * spelling is used, because the panel is what the reader is looking at.
 */
const FILTER_MODES = ['LP1', 'LP2', 'LP4', 'BP2', 'BP4', 'HP4', 'NT2', 'PHZ']

/** p.42: "SUB -1 (top)", "OR (middle)", "SUB -2 (bottom)". */
const SUB_TYPES = ['SUB -1', 'OR', 'SUB -2']

/** p.42: "Switches between one of three colors of noise: WHITE, PINK and ALT." */
const NOISE_TYPES = ['WHITE', 'ALT', 'PINK']

/**
 * p.42/#479. **`ALT` is not a sound, and a recipe that stops at `ALT` has not chosen one.**
 *
 * The switch has three positions and the third defers: *"ALT: Uses the currently loaded
 * ALTernative digital noise source."* Which one is loaded is set by a button combination off the
 * panel — *"hold down the MANUAL GATE [11.1] button while pressing one of the four MIDI/CV section
 * buttons"* — and the four are named on the page: Cymbal, Crunch, Crackle and Velvet.
 *
 * This is CLAUDE.md's standing trap with the switch off the panel entirely. The TR-8S carries its
 * loaded tone and the minilogue xd its `NOISE` type for the same reason: a value read against the
 * wrong one of several scales is made up, however carefully the page beside it is cited. A `noise
 * dirty` on Cymbal and a `noise dirty` on Velvet are not the same part.
 *
 * **The loading action lives in the parameter's `note`, not in `hints`.** §8.1 makes hints
 * toggleable, so a reader with them off would see `Crunch` and have no route to it; invariant 7
 * makes a hint a jog rather than the value, and *how you load the source* is the value here. The
 * manifest used to carry `'noise-alt': 'Hold MANUAL GATE, press MIDI CC'` in its hint table
 * attached to nothing at all, which is what #479 found.
 *
 * **The three sub-variants are deliberately not authored, and the page is why.** Each source
 * cycles three further variations — Crunch's are *"three different downsampling variations"* — and
 * the manual gives them no names, no numbers and no display: there is nothing to write down that a
 * reader could confirm they had reached. §3.2 would need an option set, and inventing `1 / 2 / 3`
 * would be an interface the box does not have. What makes that safe rather than a gap is the
 * page's own closing note — *"switching to a new noise type will always select the first
 * variation"* — so selecting the source lands somewhere definite, and the recipe describes a state
 * the reader can actually reach.
 */
const ALT_NOISE_SOURCES = ['Cymbal', 'Crunch', 'Crackle', 'Velvet']

/**
 * p.31, and it is a range selector rather than a preference: each position rescales every
 * envelope stage, which is why `ENV_A_TIMES` below is keyed by it.
 */
const ENV_SPEEDS = ['FAST', 'MED', 'SLOW']

/** pp.29-30: "X (Off)", "AHDSR (bottom)", "Gate Extender (top)". */
const HOLD_POSITIONS = ['Gate Extender', 'X', 'AHDSR']

/** p.32: "LEVEL", "X (OFF)", "TIME" — what a voltage at CTRL IN does to the envelope. */
const CTRL_SOURCES = ['LEVEL', 'X', 'TIME']

/** p.35: "ENVELOPE MODE (top position)", "LFO MODE (middle position)", "BURST MODE (bottom)". */
const ENV_B_MODES = ['ENV', 'LFO', 'BURST']

/**
 * p.35: with MODE at ENV or BURST the switch "selects between CYCLE, AHR, and AD modes"; with
 * MODE at LFO it selects `FREE`, `SYNC` or `LFV`. One physical switch, two printed label
 * columns, so one option set with all six — the panel prints all six beside the same toggle.
 */
const ENV_B_TYPES = ['CYCLE', 'AHR', 'AD', 'FREE', 'SYNC', 'LFV']

/**
 * p.93/#481. **Which LFO the middle MODE position actually runs — and it is not a control on the
 * panel.**
 *
 * `MODE` at `LFO` and `TYPE` at `FREE` or `SYNC` do not settle what Envelope B is doing, because
 * an instrument-wide setting decides whether those two positions drive the factory tilting LFO or
 * the Entropic Sequence Generator, which "replaces the Free/Sync tilting LFO". p.93 gives both
 * ways to set it: hold `MIDI LFO [1.C]` while powering on, or set `LFO Shape` in the Env B section
 * of the Intellijel Config app. It survives power cycles either way.
 *
 * **This is CLAUDE.md's "a cited range can still be the wrong range", in its switch form.** Under
 * the ESG the same three sliders mean sequence rate, sequence length and regeneration probability,
 * so a `RISE` figure cited to the LFO pages is a different quantity from a `RISE` figure cited to
 * p.93. The TR-8S and the minilogue xd solve this by putting the switch in the recipe, and so does
 * every LFO-mode recipe below: the value and the mode it belongs to cannot come apart.
 *
 * `scope: 'song'` because it is one setting for the instrument rather than for a part — it is not
 * reached from the patch at all, and the guide states it once above the parts rather than inside
 * one of them.
 *
 * Both option strings are the manual's own: p.93 names "the factory default 'Tilting LFO'" and
 * "the alternate 'Entropic Sequence Generator'".
 */
const ENV_B_LFO_SHAPES = ['Tilting LFO', 'Entropic Sequence Generator']

/** p.24: "Hard Sync (bottom position); No Sync (middle position); and Soft Sync (top position)". */
const SYNC_TYPES = ['SOFT', 'X', 'HARD']

/** p.23-24: the two VCO A frequency-modulation switches. */
const FM_TYPES = ['TZFM', 'EXP']
const FM_COUPLING = ['AC', 'DC']

/** p.27: "VCO/LFO selector", and p.27's pitch source, "PITCH A+B" or "PITCH B". */
const VCO_B_RANGE = ['VCO', 'LFO']
const PITCH_SOURCES = ['PITCH A+B', 'PITCH B']

/** p.58: "toggles the slew's response curve between LIN(ear) and EXP(onential)". */
const SLEW_SHAPES = ['LIN', 'EXP']

/** p.42: "Engaging SOFT CLIP will soft clip the signals... prior to leaving the mixer". */
const ON_OFF = ['ON', 'OFF']

// ---------------------------------------------------------------------------
// Cited ranges
// ---------------------------------------------------------------------------

/**
 * p.31, printed in full for each ENVELOPE SPEED position. Decay and Release share one printed
 * range at every speed — the manual writes them as one line, `D/R` — so both parameters below
 * cite the same bounds, which is what the page says rather than a simplification of it.
 *
 * Milliseconds throughout. The manual mixes `ms` and `s` within one line ("0.6 ms - 2.5 s"); one
 * unit for one parameter is the transcription, and no arithmetic beyond the unit change happens.
 *
 * The parameters below are named `HOLD`, `ATTACK`, `DECAY`, `SUSTAIN`, `RELEASE` rather than the
 * `H A D S R` the panel silkscreens under the sliders. Both are the manual's — p.28 writes "A
 * (Attack) time slider" — and the long form is the one that survives being read on a phone next
 * to four other devices' parameters. The letters stay on the drawn panel, where there is a slider
 * under each of them.
 */
const ENV_A_TIMES = {
  FAST: { hold: { min: 0.001, max: 2500 }, attack: { min: 0.2, max: 1500 }, decay: { min: 0.6, max: 2500 } },
  MED: { hold: { min: 0.001, max: 10000 }, attack: { min: 2, max: 10000 }, decay: { min: 3.5, max: 10000 } },
  SLOW: { hold: { min: 0.001, max: 60000 }, attack: { min: 9.3, max: 60000 }, decay: { min: 30, max: 60000 } },
} as const

/** p.28: "It is 0 V at the bottom and 5 V at the top." */
const SUSTAIN_V = { min: 0, max: 5 }

/**
 * p.93: the ESG "can generate repeatable random voltage sequences from 1 - 16 steps in length",
 * and again under the slider — "FALL [5.4] : Sets the sequence length (from 1 to 16 steps)".
 *
 * A count, so the range is legality in the strongest sense on this box: a 17-step sequence is not
 * a taste the reader is being talked out of, it is a setting the slider cannot reach.
 */
const ESG_STEPS = { min: 1, max: 16 }

/**
 * p.93: "SHAPE [5.5] : Sets the per-step regeneration probability (from 0% to 100%)."
 *
 * Note which slider this is **not**. Under the tilting LFO the same slider is `TILT`, and under
 * the envelope it is `SHAPE` with no printed scale at all — the reason every other Envelope B
 * slider in this file is `travel`. The percentage exists only in the ESG's own section, which is
 * why the recipe that authors it also authors `ENV_B_LFO_SHAPES`.
 */
const ESG_REGEN_PCT = { min: 0, max: 100 }

/** pp.22, 26: "This 8-position selector knob... Each clockwise rotation shifts the tuning up by one octave", detents 0-7. */
const OCTAVE = { min: 0, max: 7 }

/** pp.22, 26: "finely adjusts the tuning frequency over a range of approximately 12 semitones", "a ±6 semitone sweep". */
const FINE_TUNE = { min: -6, max: 6 }

/** p.23: "a pulse wave with a 50% duty cycle (a square wave)... approximately a 95% duty cycle". */
const PULSE_WIDTH = { min: 50, max: 95 }

/** p.36: "the slider offsets the LFO's phase — from 0° at the bottom, to 360° at the top." */
const PHASE_DEG = { min: 0, max: 360 }

/** p.57: "nearly instantaneous at the knob's minimum... to a clockwise maximum of about 1 second... (LIN)". */
const SLEW_LIN_MS = { min: 0, max: 1000 }

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/**
 * **One voice, and that is the entire point of `comfortableVoices` (§12.4).** p.7 calls Cascadia
 * "a deep and flexible semi-modular mono synth", and that sentence is the whole basis for
 * `polyphony: 1`.
 *
 * **Do not reach for a component count to support it.** The obvious argument — one VCA, one
 * filter, one signal path — is wrong, and it is contradicted on the same page it would cite:
 * p.7's feature list includes "an additional VCA/LPF/LPG", and this manifest declares its jacks
 * (`VCA B / LPF`, four of them) a hundred lines above. One recipe here even routes a sub through
 * that second filter instead of the main one. Counting the parts on this panel argues for more
 * than one voice, not fewer; what makes it monophonic is that the manufacturer says so.
 *
 * `polyphony: 1` is therefore a hardware fact rather than a planning bound, and it is the fact
 * that produces this device's honest gaps: the golden template asks for a three-note stab and a
 * three-note pad (§12.4), and this box cannot voice either. Both roles are declared anyway, and
 * both have recipes — a Cascadia stab is a real sound, it is just a one-note one — so the gap
 * the guide prints names the shortfall ("needs 3 notes") instead of the vaguer "nothing in your
 * rig plays this part". Declaring the role is what makes the reason visible.
 */
const VOICE_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'tom', 'noise', 'texture', 'metallic',
  'pad', 'lead', 'stab', 'acid',
  'riser', 'impact', 'sweep',
]

/**
 * Roles this box is **not** offered for, and why, since a short list invites the question:
 * `arp` (no arpeggiator and no sequencer of any kind), `vox-chop` (no sampler), and the
 * backbeat/metal drum roles `snare`, `clap`, `rim`, `ghost-perc`, `closed-hat`, `open-hat`,
 * `ride` (one voice cannot hold a hat part and the lead at once, and the noise source that would
 * make them is the same one `noise` and `texture` already claim).
 */

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/**
 * How this box is driven, said once per recipe because it is the thing a reader of a Cascadia
 * page most needs and the guide has nowhere else to put it: there is no sequencer here.
 *
 * **The third way in is the front panel, and it is named because a reader with no controller
 * has no other one.** #478's kit section renders these recipes to somebody standing at the box
 * with a recorder and nothing plugged in; p.54's MANUAL GATE button is what makes a sound for
 * them, and a routing line that offered only two sockets they are not using read as *you cannot
 * play this yet*.
 *
 * **The qualifying clause is p.54's own and is not padding.** The button gates an envelope only
 * while that envelope's own GATE input is empty (pp.32, 39 say the same from the envelope end),
 * and three recipes here do patch `ENVELOPE B · GATE/SYNC` — for those the button still reaches
 * Envelope A and no longer reaches B. Stated flatly, the offer would be false on three of the
 * twenty-one; stated with the condition, it is true on all of them and tells a reader what to
 * look at when a hold does nothing. `test/cascadia.test.ts` holds the kit recipes to leaving
 * both envelopes under the button.
 */
const PLAYED =
  'played from MIDI IN or EXT IN PITCH/GATE, or by holding the front panel MANUAL GATE button, ' +
  'which gates any envelope whose own GATE input is empty (p.54) — Cascadia has no sequencer ' +
  'of its own'

const RECIPES: Recipe[] = [
  // ---- low --------------------------------------------------------------------------
  {
    id: 'cascadia-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'Sine kick: Envelope B dropped into VCO A pitch, filter bypassed to the amp',
    routing: `${PLAYED}. Envelope B does the pitch drop, Envelope A the body`,
    params: [
      pick('VCO A · TZFM/EXP', 'EXP', FM_TYPES, cite(23)),
      pick('VCO A · AC/DC', 'DC', FM_COUPLING, cite(24)),
      num('VCO A · OCTAVE', 1, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO A · PITCH', 0, FINE_TUNE, cite(22), { unit: 'st' }),
      travel('VCO A · FM 1', 22, { note: 'how far the pitch falls' }),
      pick('ENVELOPE B · MODE', 'ENV', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · TYPE', 'AD', ENV_B_TYPES, cite(35)),
      travel('ENVELOPE B · RISE', 0),
      travel('ENVELOPE B · FALL', 12, { note: 'the drop; longer is a boomier kick' }),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      pick('ENVELOPE A · HOLD POSITION', 'X', HOLD_POSITIONS, cite(29)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 190, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -70 }, { axis: 'space', amount: 60 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
      travel('MIXER · SUB', 58),
      pick('MIXER · SUB TYPE', 'SUB -1', SUB_TYPES, cite(42)),
      pick('MIXER · SOFT CLIP', 'ON', ON_OFF, cite(42)),
    ],
    patch: [
      cable(
        'ENVELOPE B · ENV B',
        'VCO A · FM 1',
        'FM 1 has no normal, so this cable is the whole pitch drop',
      ),
      cable(
        'VCF · LP4',
        'VCA A · IN',
        'breaks the VCF OUT normal — LP4 is always live whatever MODE says (p.49)',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'voice',
    title: 'Folded kick: the wave folder back into the mixer, soft clip engaged',
    routing: `${PLAYED}. The folder replaces the ring modulator on mixer channel 1`,
    params: [
      num('VCO A · OCTAVE', 1, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      travel('WAVE FOLDER · FOLD', 64, { note: 'more folds, more upper harmonics' }),
      travel('WAVE FOLDER · MOD', 30),
      travel('MIXER · IN 1', 52),
      travel('MIXER · SUB', 66),
      pick('MIXER · SUB TYPE', 'SUB -1', SUB_TYPES, cite(42)),
      pick('MIXER · SOFT CLIP', 'ON', ON_OFF, cite(42)),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 210, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -80 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('VCO A · PW', 62, PULSE_WIDTH, cite(23), {
        unit: '%',
        mood: [{ axis: 'grit', amount: 18 }],
      }),
    ],
    patch: [
      cable(
        'OUTPUT CONTROL · FOLD',
        'MIXER · IN 1',
        'breaks the RING MOD normal on IN 1; FOLD is the folder’s only output (p.74)',
      ),
      cable(
        'ENVELOPE A · ENV A',
        'WAVE FOLDER · FOLD',
        'FOLD MOD has no normal — the fold count now follows the amp envelope',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Sub one octave down, straight past the filter',
    routing: `${PLAYED}. The mixer’s SUB jack is a direct output, so nothing else is heard`,
    params: [
      pick('MIXER · SUB TYPE', 'SUB -1', SUB_TYPES, cite(42)),
      num('VCO A · OCTAVE', 2, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO A · PITCH', 0, FINE_TUNE, cite(22), { unit: 'st' }),
      pick('ENVELOPE A · SPEED', 'MED', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 4, ENV_A_TIMES.MED.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 400, ENV_A_TIMES.MED.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 300, ENV_A_TIMES.MED.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 220 }],
      }),
      travel('VCA A · LEVEL', 0, { note: 'base level at zero; the envelope opens it' }),
      travel('VCA A · MOD', 100),
    ],
    patch: [
      cable(
        'MIXER · SUB',
        'VCA A · IN',
        'breaks the VCF OUT normal — the sub reaches the amp without touching the filter',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    title: 'Two octaves down through the ladder filter, resonance off',
    routing: `${PLAYED}. Filter B’s ladder is the second low pass, reached from the utilities`,
    params: [
      pick('MIXER · SUB TYPE', 'SUB -2', SUB_TYPES, cite(42)),
      pick('MIXER · SOFT CLIP', 'OFF', ON_OFF, cite(42)),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      travel('VCA B / LPF · CV', 46, { note: 'with nothing patched, this is a manual cutoff' }),
      pick('ENVELOPE A · SPEED', 'MED', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 6, ENV_A_TIMES.MED.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 500, ENV_A_TIMES.MED.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'MIXER · SUB',
        'VCA B / LPF · IN',
        'breaks the RING MOD normal into VCA B',
      ),
      cable(
        'VCA B / LPF · LPF B OUT',
        'VCA A · IN',
        'breaks the VCF OUT normal; the four-pole ladder replaces the main filter',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Saw and pulse driven into the filter, amp envelope on the cutoff',
    routing: `${PLAYED}. VCF LEVEL above unity is where the dirt comes from (p.48)`,
    params: [
      travel('MIXER · SAW', 74),
      travel('MIXER · PULSE', 52),
      num('VCO A · PW', 68, PULSE_WIDTH, cite(23), {
        unit: '%',
        mood: [{ axis: 'grit', amount: 16 }],
      }),
      num('VCO A · OCTAVE', 2, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('VCF · MODE', 'LP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 34),
      travel('VCF · Q', 30),
      travel('VCF · LEVEL', 70, { note: 'the LEVEL LED reddens as the filter input clips (p.48)' }),
      travel('VCF · FM 1', 44),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 2, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 260, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -90 }],
      }),
      num('ENVELOPE A · SUSTAIN', 1, SUSTAIN_V, cite(28), { unit: 'V' }),
      pick('MIXER · SOFT CLIP', 'OFF', ON_OFF, cite(42)),
      // p.15's "dirty things up a bit", which the two cited cables below belong to.
      pick('VCO A · TZFM/EXP', 'TZFM', FM_TYPES, cite(23)),
      pick('VCO A · AC/DC', 'AC', FM_COUPLING, cite(24)),
      travel('VCO A · IM MOD', 58, { note: 'p.15 says adjust this to taste; it is the wobble depth' }),
    ],
    patch: [
      cable(
        'ENVELOPE A · ENV A',
        'VCF · FM 1',
        'breaks the ENV B normal on FM 1 (p.44) — cutoff now tracks the amp exactly',
      ),
      // The manual's cable "C" and cable "D", instructed on p.15.
      cable(
        'LFO X / Y / Z · LFO Y',
        'VCO A · IM',
        'the manual’s cable “C”: LFO Y modulates the FM 2 index; breaks the ENV A normal on IM',
        15,
      ),
      cable(
        'INVERT · OUT',
        'LFO X / Y / Z · RATE CV',
        'the manual’s cable “D”: RATE CV has no normal, and INVERT takes ENV B unless patched',
        15,
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    title: 'Triangle bass under a two-pole filter, no resonance',
    routing: `${PLAYED}. The triangle is a direct mixer output; the pulse and saw stay down`,
    params: [
      pick('VCF · MODE', 'LP2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 26),
      travel('VCF · Q', 8),
      num('VCO A · OCTAVE', 2, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO A · PITCH', 0, FINE_TUNE, cite(22), { unit: 'st' }),
      pick('ENVELOPE A · SPEED', 'MED', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 8, ENV_A_TIMES.MED.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 340, ENV_A_TIMES.MED.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -110 }],
      }),
      num('ENVELOPE A · SUSTAIN', 2, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 260, ENV_A_TIMES.MED.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 200 }],
      }),
    ],
    patch: [
      cable(
        'MIXER · VCO A TRI',
        'VCF · IN',
        'breaks the MIXER OUT normal — only the triangle reaches the filter',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    title: 'Resonant ladder squelch, envelope on the cutoff, driven in',
    routing: `${PLAYED}. Q high enough to whistle: every LP mode self-oscillates (p.46). **Accent:** and **Slide:** both belong to whatever is driving this box. Cascadia has no sequencer, no arpeggiator and no step editor, so there is no step here to accent and none to slide from \u2014 both gestures arrive with the notes, from the controller or sequencer playing it`,
    params: [
      pick('VCF · MODE', 'LP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 22),
      travel('VCF · Q', 78, { note: 'near self-oscillation; back off if it takes over' }),
      travel('VCF · FM 1', 66),
      travel('VCF · LEVEL', 64),
      travel('MIXER · SAW', 80),
      num('VCO A · OCTAVE', 2, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 150, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -60 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
      pick('ENVELOPE A · CTRL SOURCE', 'TIME', CTRL_SOURCES, cite(32), ),
    ],
    patch: [
      cable(
        'ENVELOPE A · ENV A',
        'VCF · FM 1',
        'breaks the ENV B normal on FM 1 (p.44) — one envelope, both jobs',
      ),
      cable(
        'ENVELOPE A · EOA',
        'ENVELOPE B · GATE/SYNC',
        'breaks the external-gate normal: Envelope B fires when the attack ends',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    title: 'Band-pass squelch with the pulse thinned right down',
    routing: `${PLAYED}. BP4 keeps the top and drops the weight. **Accent:** and **Slide:** both belong to whatever is driving this box. Cascadia has no sequencer, no arpeggiator and no step editor, so there is no step here to accent and none to slide from \u2014 both gestures arrive with the notes, from the controller or sequencer playing it`,
    params: [
      pick('VCF · MODE', 'BP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 46),
      travel('VCF · Q', 70),
      travel('VCF · FM 1', 58),
      travel('MIXER · PULSE', 76),
      num('VCO A · PW', 88, PULSE_WIDTH, cite(23), {
        unit: '%',
        mood: [{ axis: 'grit', amount: 6 }],
      }),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 120, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -50 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'ENVELOPE A · ENV A',
        'VCF · FM 1',
        'breaks the ENV B normal on FM 1 (p.44)',
      ),
    ],
    verified: false,
  },

  // ---- body and metal ---------------------------------------------------------------
  {
    id: 'cascadia-metallic-dark',
    role: 'metallic',
    character: 'dark',
    voice: 'voice',
    title: 'Ring modulator fed a square, notched rather than filtered',
    routing: `${PLAYED}. RING MOD is already on mixer channel 1 (p.43); this changes what it eats`,
    params: [
      pick('VCF · MODE', 'NT2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 38),
      travel('VCF · Q', 54),
      travel('MIXER · IN 1', 82),
      travel('MIXER · IN 2', 0, { note: 'VCO A’s sine off, so only the ring output is heard' }),
      num('VCO B · OCTAVE', 4, OCTAVE, cite(26), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO B · PITCH', 3, FINE_TUNE, cite(26), {
        unit: 'st',
        note: 'detune from VCO A is what makes it clang',
      }),
      pick('VCO B · PITCH SOURCE', 'PITCH B', PITCH_SOURCES, cite(27)),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 320, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -100 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'VCO B · SQUARE',
        'RING MOD · IN 2',
        'breaks the VCO B sine normal — a square through the ring modulator is harsher',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-metallic-hard',
    role: 'metallic',
    character: 'hard',
    voice: 'voice',
    title: 'Hard-synced ring mod, high-passed to a strike',
    routing: `${PLAYED}. VCO A syncs to VCO B by default (p.25); this drives the sync harder`,
    params: [
      pick('VCO A · SYNC TYPE', 'HARD', SYNC_TYPES, cite(24)),
      pick('VCF · MODE', 'HP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 54),
      travel('VCF · Q', 40),
      travel('MIXER · IN 1', 74),
      num('VCO A · OCTAVE', 5, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO B · OCTAVE', 3, OCTAVE, cite(26)),
      pick('VCO B · PITCH SOURCE', 'PITCH B', PITCH_SOURCES, cite(27)),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 160, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -60 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'VCO B · SQUARE',
        'VCO A · SYNC',
        'breaks the VCO B SAW normal — a square edge is a sharper sync trigger',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'voice',
    title: 'Tuned tom: sine with a short pitch fall, no sub under it',
    routing: `${PLAYED}. Same pitch-drop idea as the kick, tuned up and shortened`,
    params: [
      pick('VCO A · TZFM/EXP', 'EXP', FM_TYPES, cite(23)),
      pick('VCO A · AC/DC', 'DC', FM_COUPLING, cite(24)),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      num('VCO A · PITCH', -2, FINE_TUNE, cite(22), { unit: 'st' }),
      travel('VCO A · FM 1', 16),
      travel('MIXER · IN 2', 72, { note: 'IN 2 is VCO A’s sine by default (p.43)' }),
      travel('MIXER · SUB', 0),
      pick('ENVELOPE B · MODE', 'ENV', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · TYPE', 'AD', ENV_B_TYPES, cite(35)),
      travel('ENVELOPE B · FALL', 20),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 300, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -90 }, { axis: 'space', amount: 80 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'ENVELOPE B · ENV B',
        'VCO A · FM 1',
        'FM 1 has no normal; this is the fall',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    title: 'Noise alone through the filter, cutoff sampled and held',
    routing: `${PLAYED}. S&H is clocked from MIDI CLK by default (p.56), so it moves in time`,
    params: [
      pick('MIXER · NOISE TYPE', 'ALT', NOISE_TYPES, cite(42)),
      // #479. Beside `NOISE TYPE`, deliberately, rather than hoisted: the two are one decision,
      // and a `song`-scoped line above the parts would put the pair on opposite sides of the page.
      pick('MIXER · ALT NOISE SOURCE', 'Crunch', ALT_NOISE_SOURCES, cite(42), {
        note: 'not on the panel — hold MANUAL GATE and press MIDI CC to load it; a fresh source always comes up on the first of its three variations',
      }),
      travel('MIXER · NOISE', 84),
      pick('VCF · MODE', 'BP2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 48),
      travel('VCF · Q', 46),
      travel('VCF · FM 3', 62, { note: 'FM 3 is attenuverted, so this sets the step depth' }),
      pick('ENVELOPE A · SPEED', 'MED', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 12, ENV_A_TIMES.MED.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 600, ENV_A_TIMES.MED.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 3, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'MIXER · NOISE',
        'VCF · IN',
        'breaks the MIXER OUT normal — the oscillators drop out entirely',
      ),
      cable(
        'S&H · OUT',
        'VCF · FM 3',
        'FM 3 has no normal; stepped voltages walk the cutoff',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-noise-dark',
    role: 'noise',
    character: 'dark',
    voice: 'voice',
    title: 'Pink noise slewed smooth, low-passed and sitting still',
    routing: `${PLAYED}. Slew turns the stepped S&H into a drift (p.57)`,
    params: [
      pick('MIXER · NOISE TYPE', 'PINK', NOISE_TYPES, cite(42)),
      travel('MIXER · NOISE', 70),
      pick('VCF · MODE', 'LP2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 24),
      travel('VCF · Q', 18),
      travel('VCF · FM 3', 34),
      pick('SLEW / ENV FOLLOW · SHAPE', 'EXP', SLEW_SHAPES, cite(58)),
      num('SLEW / ENV FOLLOW · RATE', 620, SLEW_LIN_MS, cite(57), {
        unit: 'ms',
        note: 'the cited maximum is the LIN figure; EXP runs to about five times it',
      }),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 400, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 2000, ENV_A_TIMES.SLOW.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 3, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'MIXER · NOISE',
        'VCF · IN',
        'breaks the MIXER OUT normal',
      ),
      cable(
        'SLEW / ENV FOLLOW · OUT',
        'VCF · FM 3',
        'FM 3 has no normal; SLEW takes S&H by default (p.58), so this drifts',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Sample & hold on the fold amount: a new colour on every note',
    routing:
      `${PLAYED}. The manual's own patch (p.14): Envelope B clocks the S&H, the S&H sets the fold`,
    params: [
      travel('WAVE FOLDER · FOLD', 40),
      travel('WAVE FOLDER · MOD', 68, { note: 'how far the random voltage moves the fold' }),
      travel('VCA A · AUX IN', 62, { note: 'AUX IN is the folder by default (p.53); raise it to hear this at all' }),
      pick('ENVELOPE B · MODE', 'ENV', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · TYPE', 'AD', ENV_B_TYPES, cite(35)),
      pick('VCF · MODE', 'LP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 30),
      travel('VCF · Q', 22),
      num('VCO A · OCTAVE', 4, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      travel('MIXER · IN 2', 60),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 900, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 3000, ENV_A_TIMES.SLOW.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 4000, ENV_A_TIMES.SLOW.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 3000 }],
      }),
    ],
    patch: [
      // The manual's cable "A" and cable "B", instructed step by step on p.14. Two of the four
      // cited *connections* in this file: the rest of these recipes patch by ear.
      cable(
        'ENVELOPE B · ENV B',
        'S&H · TRIG',
        'the manual’s cable “A”: every note clocks a new random voltage; breaks the MIDI CLK normal',
        14,
      ),
      cable(
        'S&H · OUT',
        'WAVE FOLDER · FOLD',
        'the manual’s cable “B”: FOLD MOD has no normal, so this is the whole gesture',
        14,
      ),
    ],
    verified: false,
  },

  // ---- tonal ------------------------------------------------------------------------
  {
    id: 'cascadia-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'Two saws a fifth apart, filter opened, ring mod out of the way',
    routing: `${PLAYED}. VCO B replaces the ring modulator on mixer channel 1`,
    params: [
      pick('VCO B · RANGE', 'VCO', VCO_B_RANGE, cite(27)),
      pick('VCO B · PITCH SOURCE', 'PITCH A+B', PITCH_SOURCES, cite(27)),
      num('VCO B · PITCH', 0, FINE_TUNE, cite(26), { unit: 'st' }),
      num('VCO B · OCTAVE', 4, OCTAVE, cite(26)),
      num('VCO A · OCTAVE', 4, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      travel('MIXER · IN 1', 62),
      travel('MIXER · SAW', 70),
      pick('VCF · MODE', 'LP2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 68),
      travel('VCF · Q', 34),
      pick('ENVELOPE A · SPEED', 'MED', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 10, ENV_A_TIMES.MED.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 500, ENV_A_TIMES.MED.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 320, ENV_A_TIMES.MED.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 260 }],
      }),
    ],
    patch: [
      cable(
        'VCO B · SAW',
        'MIXER · IN 1',
        'breaks the RING MOD normal on IN 1 — a second saw instead of the clang',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    title: 'One-note stab: folded pulse, gate extended so a trigger fills it',
    routing:
      `${PLAYED}. One note, not a chord — this box has one voice, so a chord request gets a gap`,
    params: [
      pick('ENVELOPE A · HOLD POSITION', 'Gate Extender', HOLD_POSITIONS, cite(29), ),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · HOLD', 90, ENV_A_TIMES.FAST.hold, cite(31), {
        unit: 'ms',
        note: 'gate extender: the longer of this and the incoming gate wins (p.30)',
      }),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 200, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'density', amount: -70 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
      travel('WAVE FOLDER · FOLD', 48),
      travel('MIXER · IN 1', 58),
      travel('MIXER · PULSE', 44),
      num('VCO A · PW', 74, PULSE_WIDTH, cite(23), {
        unit: '%',
        mood: [{ axis: 'grit', amount: 12 }],
      }),
      pick('VCF · MODE', 'BP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 52),
      travel('VCF · Q', 44),
    ],
    patch: [
      cable(
        'OUTPUT CONTROL · FOLD',
        'MIXER · IN 1',
        'breaks the RING MOD normal on IN 1; FOLD is the folder’s output (p.74)',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    title: 'One-voice drone, Envelope B cycling under the cutoff',
    routing:
      `${PLAYED}. Monophonic: a pad request of more than one note is an honest gap, not this`,
    params: [
      pick('ENVELOPE B · MODE', 'LFO', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · LFO SHAPE', 'Tilting LFO', ENV_B_LFO_SHAPES, cite(93), {
        scope: 'song',
        note: 'the factory default; a box switched to the ESG goes back at boot or in the Config app',
      }),
      pick('ENVELOPE B · TYPE', 'SYNC', ENV_B_TYPES, cite(35)),
      num('ENVELOPE B · PHASE', 90, PHASE_DEG, cite(36), { unit: '°' }),
      travel('ENVELOPE B · RATE', 22),
      pick('VCF · MODE', 'LP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 28),
      travel('VCF · Q', 36),
      travel('VCF · FM 3', 40),
      travel('MIXER · SAW', 54),
      travel('MIXER · IN 2', 46),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1200, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 4000, ENV_A_TIMES.SLOW.decay, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 5000, ENV_A_TIMES.SLOW.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 4000 }],
      }),
    ],
    patch: [
      cable(
        'ENVELOPE B · ENV B',
        'VCF · FM 3',
        'FM 3 has no normal — ENV B keeps its own normal on FM 1 as well',
      ),
      cable(
        'MIDI / CV · MIDI CLK',
        'ENVELOPE B · GATE/SYNC',
        'breaks the external-gate normal; in LFO SYNC the cycle locks to clock',
      ),
    ],
    verified: false,
  },

  // ---- transitional (§4.2) ----------------------------------------------------------
  {
    id: 'cascadia-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    /**
     * #452. **Already routed, and the list that said otherwise was reading names.** The chain is
     * `ENVELOPE B` in `ENV`/`AHR` with its rise, the cable into `VCF · FM 3`, and `travel('VCF ·
     * FM 3', 92)` as the depth — a source, a destination and an amount, none of which is spelled
     * `LFO` or `MOD`, which is exactly why a name-matcher missed it.
     *
     * What was missing is what a reader needs beside it: where the gate comes from, that this
     * does not repeat, and how long it can climb for. All three are on the page.
     */
    title: 'Slow rise on the cutoff, noise climbing under it',
    routing: `${PLAYED}. **One gate, one climb — this does not repeat.** p.83: the attack *"is triggered by the rising edge of a gate signal sent to the GATE/SYNC [5.D] input"*, and with nothing patched there that gate is the played note or the front-panel MANUAL GATE button (p.39). Hold it for the whole build — *"If the gate length is shorter than the rise time, the envelope will begin to fall before reaching its maximum value"* (p.83). \`CYCLE\` is the Envelope B type that repeats; this is \`AHR\`, so one gate is one gesture. **The climb has a ceiling:** p.83 tops the RISE slider out at five seconds, which is under three bars at 134 BPM. Past that the filter holds where it arrived rather than falling back, so a longer section still works — it simply stops travelling`,
    params: [
      pick('ENVELOPE B · MODE', 'ENV', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · TYPE', 'AHR', ENV_B_TYPES, cite(35)),
      travel('ENVELOPE B · RISE', 88, { note: 'the whole gesture is this slider' }),
      travel('ENVELOPE B · FALL', 20),
      pick('VCF · MODE', 'HP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 20),
      travel('VCF · Q', 58),
      travel('VCF · FM 3', 92),
      pick('MIXER · NOISE TYPE', 'WHITE', NOISE_TYPES, cite(42)),
      travel('MIXER · NOISE', 72),
      travel('MIXER · SAW', 30),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 600, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 5, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 900, ENV_A_TIMES.SLOW.decay, cite(31), { unit: 'ms' }),
    ],
    patch: [
      cable(
        'ENVELOPE B · ENV B',
        'VCF · FM 3',
        'FM 3 has no normal; FM 3 is attenuverted so the sweep can be inverted too',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'Burst of pulses into the amp, folded on the way',
    routing: `${PLAYED}. Envelope B in BURST is a pulse train inside one envelope (p.35)`,
    params: [
      pick('ENVELOPE B · MODE', 'BURST', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · TYPE', 'AD', ENV_B_TYPES, cite(35)),
      travel('ENVELOPE B · RATE', 70, { note: 'how fast the pulses repeat' }),
      travel('ENVELOPE B · LENGTH', 34, { note: 'how long the burst lasts' }),
      travel('WAVE FOLDER · FOLD', 72),
      travel('MIXER · IN 1', 66),
      pick('MIXER · SOFT CLIP', 'ON', ON_OFF, cite(42)),
      pick('VCF · MODE', 'BP2', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 44),
      travel('VCF · Q', 50),
      num('VCO A · OCTAVE', 2, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'FAST', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 1, ENV_A_TIMES.FAST.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · DECAY', 700, ENV_A_TIMES.FAST.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 400 }],
      }),
      num('ENVELOPE A · SUSTAIN', 0, SUSTAIN_V, cite(28), { unit: 'V' }),
    ],
    patch: [
      cable(
        'ENVELOPE B · ENV B',
        'VCA A · LEVEL',
        'breaks the ENV A normal on LEVEL MOD — the burst becomes the amplitude',
      ),
      cable(
        'OUTPUT CONTROL · FOLD',
        'MIXER · IN 1',
        'breaks the RING MOD normal on IN 1',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    title: 'LFO X walking the cutoff of a phaser',
    routing: `${PLAYED}. LFO X is free-running (p.61): it does not lock to the rig’s clock`,
    params: [
      pick('VCF · MODE', 'PHZ', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 32),
      travel('VCF · Q', 62),
      travel('VCF · FM 3', 74),
      travel('LFO X / Y / Z · RATE', 14, { note: 'no printed scale; slow end is roughly 15 s' }),
      travel('MIXER · SAW', 58),
      // #479's second question, answered rather than left: a level with no type inherits whatever
      // the switch happens to be on, which on this box can be `ALT` and therefore any of twelve
      // sounds. `PINK` is named on the same page as the dark one — "darker than white... more
      // energy to the lower frequencies" — which is what a `sweep dark` wants under it.
      pick('MIXER · NOISE TYPE', 'PINK', NOISE_TYPES, cite(42)),
      travel('MIXER · NOISE', 26),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 500, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 1500, ENV_A_TIMES.SLOW.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 1200 }],
      }),
    ],
    patch: [
      cable(
        'LFO X / Y / Z · LFO X',
        'VCF · FM 3',
        'FM 3 has no normal; a bipolar ±5 V triangle either side of the setting (p.62)',
      ),
    ],
    verified: false,
  },
  {
    id: 'cascadia-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'voice',
    /**
     * §4.2/#481. **The Entropic Sequence Generator, and the only box in the library with one.**
     *
     * Envelope B's middle MODE position runs one of two entirely different circuits depending on a
     * setting made at boot, so this recipe and `cascadia-pad-dark` are the same three sliders
     * meaning different things — see `ENV_B_LFO_SHAPES`. That is why both name the shape and why
     * neither may be read without it.
     *
     * **A sweep rather than a pad or a texture, and the manual is what decided it.** p.93 does not
     * only describe the circuit, it tells you what to *do* with it: *"It can be fun to raise the
     * SHAPE slider (or use the CV input) to mutate sequences, then lower it to lock them in."*
     * That is a gesture with a beginning and an end rather than a setting, which is what §4.2
     * means by transitional — the reader arrives at a section with an eleven-step sequence already
     * running, scrambles it across the join, and drops the slider to keep whatever landed.
     *
     * The two roles that looked more obvious are both wrong for it. A `texture` is a bed that
     * holds, and `cascadia-texture-soft` already holds that slot with the manual's own cited S&H
     * patch from p.14. A `pad` is worse than merely occupied: every pad request in this library
     * asks for three or four notes and this box is monophonic, so `cascadia-pad-dark` is never
     * selected in any rig, and an ESG authored beside it would never have been read.
     *
     * **The rate is `travel` and that is a decision, not an omission.** p.90 prints a real scale
     * for this slider — 0.05 Hz to about 800 Hz free-running, and a 2-to-8 multiply/divide series
     * when synced — but every word of it is about the *tilting* LFO. p.93 gives the ESG no numbers
     * at all. Citing p.90 here would be the exact failure CLAUDE.md names: a range correctly cited
     * off the wrong printed scale. The two sliders p.93 *does* put numbers on are cited to p.93.
     *
     * **Eleven steps against a four-bar phrase.** Sixteen would lock to the bar and stop being a
     * drift; eleven walks, so the sequence the reader locks in is one they have not heard land
     * that way before. The authored `SHAPE` is the low end of p.93's advice — where the sequence
     * repeats — because that is where the gesture *starts*; the raise and the drop are the part
     * the reader performs, and the note on the slider says so.
     */
    title: 'Scramble the entropic sequence across the join, then lock what lands',
    routing:
      `${PLAYED}. The gesture is one slider: SHAPE up to mutate the eleven-step cutoff sequence, down to keep it (p.93)`,
    params: [
      pick('ENVELOPE B · MODE', 'LFO', ENV_B_MODES, cite(35)),
      pick('ENVELOPE B · LFO SHAPE', 'Entropic Sequence Generator', ENV_B_LFO_SHAPES, cite(93), {
        scope: 'song',
        note: 'hold MIDI LFO while powering on, or set LFO Shape in the Intellijel Config app',
      }),
      pick('ENVELOPE B · TYPE', 'SYNC', ENV_B_TYPES, cite(35)),
      travel('ENVELOPE B · RISE', 34, {
        note: 'sequence rate; in SYNC it divides or multiplies the clock at GATE/SYNC, and p.93 prints no scale saying which position does which',
      }),
      num('ENVELOPE B · FALL', 11, ESG_STEPS, cite(93), {
        // `step`, not the manual's plural `steps`: #29's vocabulary already carries the singular
        // for a count of sequencer steps, off the TR-8S's p.27, and a second spelling of one
        // quantity is the drift that test exists to stop.
        unit: 'step',
        note: 'sequence length; 11 never lands square against four bars',
      }),
      num('ENVELOPE B · SHAPE', 22, ESG_REGEN_PCT, cite(93), {
        unit: '%',
        note: 'start low, so it repeats; run it up to scramble, then back down to lock',
      }),
      pick('VCF · MODE', 'LP4', FILTER_MODES, cite(46)),
      travel('VCF · FREQ', 40),
      travel('VCF · Q', 34, { note: 'enough resonance that each step is audible as a step' }),
      travel('VCF · FM 3', 46, { note: 'how far one step moves the cutoff' }),
      travel('MIXER · SAW', 48),
      travel('MIXER · IN 2', 40),
      num('VCO A · OCTAVE', 3, OCTAVE, cite(22), { mood: [{ axis: 'darkness', amount: -1 }] }),
      pick('ENVELOPE A · SPEED', 'SLOW', ENV_SPEEDS, cite(31)),
      num('ENVELOPE A · ATTACK', 400, ENV_A_TIMES.SLOW.attack, cite(31), { unit: 'ms' }),
      num('ENVELOPE A · SUSTAIN', 4, SUSTAIN_V, cite(28), { unit: 'V' }),
      num('ENVELOPE A · RELEASE', 1800, ENV_A_TIMES.SLOW.decay, cite(31), {
        unit: 'ms',
        mood: [{ axis: 'space', amount: 1400 }],
      }),
    ],
    patch: [
      cable(
        'MIDI / CV · MIDI CLK',
        'ENVELOPE B · GATE/SYNC',
        'breaks the external-gate normal; in LFO SYNC this clock is the step rate (p.93)',
      ),
      cable(
        'ENVELOPE B · ENV B',
        'VCF · FM 3',
        'FM 3 has no normal — each step arrives as a new cutoff and holds until the next',
      ),
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'intellijel-cascadia',
  name: 'Cascadia',
  maker: 'Intellijel',
  kind: 'semi-modular',

  /**
   * **Sends** clock: "If enabled in the Intellijel Config app, the MIDI OUT jack transmits
   * Cascadia's internal MIDI Tap Clock... Tap Clock output is enabled, by default, in the factory
   * settings" (p.78), and the same of the USB MIDI port. **Receives** clock at MIDI IN or USB, and
   * switches to it automatically: "if you send MIDI Clock into Cascadia, then it will
   * automatically switch over to MIDI clock mode" (p.20).
   *
   * `analog-clock` is in the list because the MIDI CLK jack (1.D) is a real clock *output* at a
   * selectable division — "/6 (clock out = 1/16 notes)" and so on, p.20. It is one-way: nothing on
   * this box takes an analog clock in. `ClockSpec` carries one transport list for both directions,
   * so a send-only transport cannot be marked as such; the Deluge's manifest has the same
   * asymmetry from the other side (four gate/trigger outs, one clock in). Worth knowing before
   * anyone reads this field as a symmetric claim.
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb', 'analog-clock'] },

  /**
   * Back panel, p.76: one ¼" balanced `LINE OUT`, one ¼" `PHONES OUT`, one ¼" balanced `LINE IN`.
   * One output jack, so `mono` — this box has no stereo image to lose.
   *
   * `individualOuts: 0` although the front panel is covered in output jacks. Those are
   * modular-level patch points, not a channel per part, and in any case this device carries one
   * part: there is nothing to separate. The FX SEND/RETURN loop is an insert for a pedal (p.77),
   * not a second output. USB is MIDI only (p.78), so no USB audio.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 348 mm horizontal span, from p.122's TECHNICAL SPECIFICATIONS.
   *
   * **The figure includes the wood end cheeks**, and the page says so: "Width: 348mm (including
   * wood end cheeks)". This is the second time in this library that a stated width has meant
   * something other than it appears to — the Tracker Mini's 170 mm is its *vertical* span — so it
   * is written down rather than left for the next person to rediscover. Somebody measuring the
   * metal panel will get a smaller number, conclude 348 is wrong, and change it. It is not wrong:
   * 348 mm is how much room this box takes on the desk, which is what a rack of panels drawn
   * side by side is measuring, and it is the same test that settled the Tracker Mini at 130.
   *
   * The consequence is in `panel.ts` and matters: since the span already covers the cheeks, the
   * drawn panel must not add any of its own, or the drawing would be wider than the number claims.
   *
   * Orientation is not in doubt here — p.8's panel drawing is landscape and measures 1.416 in
   * aspect against 348/246 = 1.415 — but the check was run anyway, because that is the discipline
   * this field asks for.
   */
  physical: {
    panelSpanMm: 348,
    verified: cite(122),
  },

  /** §10. A simplified original drawing of the panel, read off p.8 (see `panel.ts`). */
  panel: CASCADIA_PANEL,

  /**
   * §10/#263. **A pointer, and the strongest caution in the library.**
   *
   * p.22: four trim pots surround VCO A's PITCH knob — pitch offset, oscillator tracking, high
   * frequency compensation and octave tracking. Intellijel's own words are *"in general, you
   * should never need to touch these, as the oscillator was carefully calibrated before leaving
   * the factory"*, and three of the four add *"needed only if you have a tracking issue and are
   * instructed to tweak this by Intellijel Tech Support"*.
   *
   * That last clause is why this is a pointer rather than a procedure even by the standards of
   * the other two entries. The MODEL D's says a service technician; the Mother-32's says only
   * when absolutely necessary. This one says wait to be told by the maker. Printing the four
   * functions as steps would be inviting a reader to do something Intellijel ask them to phone
   * about first.
   *
   * The pitch offset is the one a player might legitimately want, since it sets what the knob's
   * noon position means — so the summary names it and stops there.
   */
  calibration: {
    summary:
      'Four trim pots around VCO A’s PITCH knob: pitch offset, oscillator tracking, high frequency compensation and octave tracking',
    caution:
      'Intellijel say you should never need to touch these, as the oscillator was calibrated at the factory, and that three of the four are needed only if you have a tracking issue and are instructed to adjust them by Intellijel Tech Support',
    verified: cite(22),
  },

  /** §3.3. Declared once, cited once, referenced by every cable below. */
  jacks: JACKS,

  /** §2.6. Every jack above, cited on the page that describes it. */
  /**
   * §2.6/#22. The jack citations, plus **the recorded non-claim for `clock.preferredSource`**
   * (§7.4/#80).
   *
   * This box sends clock and sends it well — the MIDI OUT jack transmits Tap Clock by default and
   * MIDI CLK is a divided clock output (see the `clock` comment) — so unlike the ZOIA and the
   * LiveTrak the question §7.4 asks is live here rather than closed by the hardware. The manual
   * answers it, and the answer is no.
   *
   * **Where the capability is documented, and what those pages actually say.** p.20 is the front
   * panel's `MIDI CLK` jack — an analog clock output with a division list, plus tap tempo framed
   * as *"particularly useful if you're not controlling Cascadia via MIDI"*. p.78's back-panel MIDI
   * entries and p.113's Config App rows are the DIN and USB halves, and they say more than a jack
   * list: both describe the port transmitting Cascadia's own Tap Clock and name a setup with no
   * DAW in it as what that is for, and p.78 records the DIN output as on in the factory settings.
   * (They also use the older clock vocabulary this project does not — CLAUDE.md — which is why
   * they are described here rather than quoted. p.78 and p.113 disagree with each other about the
   * USB default; the DIN one is consistent.) There is no chapter about driving external gear and
   * the table of contents has no entry for one: everything about this box clocking anything else
   * lives in those two jack-and-settings descriptions.
   *
   * **None of that is this field.** §7.4 is a job, not a capability, and "if you enable it, this
   * output sends a clock, which is handy when there is no DAW" is a description of what a socket
   * does — the same class of page §2.6 already refuses as evidence here, because a `canSendClock`
   * page proves the capability and this field exists precisely because a capability is not a job.
   * The comparison that settles it is the Tracker Mini's p.283, which calls that box a fit for the
   * centre piece of a setup and is about the box rather than about one of its sockets.
   *
   * **What the manual says the box is, it says four times over and consistently.** The cover:
   * *"Advanced, Performance-Oriented, Semi-Modular Synthesizer"*. p.7's OVERVIEW: *"a synthesist's
   * synthesizer — a well-considered, finely-honed, stand-alone instrument capable of both nuance
   * and bombast"*, and *"a deep and flexible semi-modular mono synth"*. p.7's *"whether used
   * stand-alone or as part of a larger system"* looks like the sentence that settles it the other
   * way and points back once the paragraph above it is read: those patch points *"conform to the
   * Eurorack standard, meaning you can expand Cascadia's capabilities through the use of external
   * modules"*, so the larger system extends this box rather than follows it — and the same
   * sentence closes on *"the desktop to the eurorack"*. p.11's MAKE A SOUND: *"If you're playing
   * Cascadia via a MIDI controller, connect its MIDI OUT to Cascadia's MIDI IN jack"*, and in that
   * page's panel figure every signal arrow but the audio output points inward. p.78's MIDI IN, the
   * jack immediately above the clock-carrying one: *"whichever controller, sequencer or MIDI
   * interface you'll use to play Cascadia"*. The box cannot start or stop anything either — the
   * manual documents no MIDI Start, Stop or Continue, and prints no MIDI implementation chart.
   *
   * **This is `cited-against`, the state #120 built for it, and #80's FLAG is what asked for it.**
   * Recorded as `unknown`, this reading rendered as silence — as though somebody had opened the
   * manual and found nothing, when what they found was an answer. A plain `Cite` on the path is
   * still the wrong shape and for the reason it always was: `Verified` here reads as evidence
   * *for* a field that is deliberately absent, and the audit would count this identically to the
   * Tracker Mini's claim and print "83 of 83 cited" over two opposite decisions. `cited-against`
   * is that citation hung off its own state — the page is visible, the reason carries the reading,
   * and the count stays apart from the claims.
   *
   * The pages behind this were re-read against the rendered PDF for #120, and one sentence in the
   * old note did not survive it: p.78 and p.113 were described as jack lists and settings tables
   * mentioning the clock output only in passing, and they are more than that. The finding holds;
   * the sentence supporting it did not, and the reason below says what those pages say.
   */
  /**
   * §2.6/#142. **This box has no sequencer of its own, so nothing it owns sets a note's length —
   * the gate that plays it does.** p.83 on Envelope B: *"The attack portion of the envelope is
   * triggered by the rising edge of a gate signal sent to the GATE/SYNC [5.D] input. The envelope
   * holds (sustains) its maximum value for as long as the gate signal is high, then triggers the
   * release stage when the gate signal goes low."*
   *
   * The same reading #120 recorded at `clock.preferredSource`, one field over: this is an
   * instrument something else plays. p.39 names the default sources when nothing is patched — the
   * MIDI GATE, the GATE CV input, or the front-panel MANUAL GATE button — so the answer to "how
   * long is the note" is always somewhere other than this panel.
   */
  noteDuration: {
    kind: 'gate',
    source: 'the gate that plays it holds it, from MIDI, a patched gate, or the MANUAL GATE button',
  },

  capabilityEvidence: {
    noteDuration: cite(83),
    // §8/#65. p.78 describes MIDI IN as being for "whichever controller, sequencer or MIDI
    // interface you'll use to play Cascadia" — the manual saying in its own words that the
    // notes come from elsewhere. The same page already carries the `clock.preferredSource`
    // reading below, and this is the other half of what it establishes.
    patternEntry: cite(78),
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'cited-against',
      cite: cite(7),
      reason:
        'the manual answers the question and the answer is no: p.7’s OVERVIEW calls this “a synthesist’s synthesizer — a well-considered, finely-honed, stand-alone instrument”, the cover an “Advanced, Performance-Oriented, Semi-Modular Synthesizer”, p.11’s MAKE A SOUND has a controller playing it with every signal arrow but the audio output pointing inward, and p.78’s MIDI IN is for “whichever controller, sequencer or MIDI interface you’ll use to play Cascadia”; p.78 and p.113 do describe the MIDI OUT and USB ports sending this box’s own Tap Clock for a setup with no DAW in it, DIN on by default, but that is a socket’s description rather than the box’s job (§7.4), and there is no chapter about driving external gear at all',
    },
  },

  /**
   * One voice. `polyphony: 1` is the manufacturer's own description — "a deep and flexible
   * semi-modular mono synth" (p.7) — and deliberately not an inference from the parts on the
   * panel, which include a second VCA and a second filter. See `VOICE_ROLES` above.
   */
  /**
   * §8/#65. No sequencer, which the provenance notes above already record as the reason
   * `features.perStep` is absent and no recipe articulates. p.78's MIDI IN is for *"whichever
   * controller, sequencer or MIDI interface you'll use to play Cascadia"*. The recipes' own
   * `routing` prose says the same thing to a human; this says it where the renderer can read it.
   */
  patternEntry: {
    kind: 'external',
    reason:
      'it has no sequencer, so it is played from whichever controller or sequencer is driving the rig',
  },

  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 1 }],

  /**
   * **§12.4 called this the clearest example of why the field exists, and it is.** Everywhere else
   * `comfortableVoices` is a taste call about crowding; here it is arithmetic. One assignable
   * exists, so one is the most that can ever be occupied, and the number is not a judgement about
   * where the box stops being pleasant to work on — there is no second part to crowd it.
   *
   * It is written out rather than left to default (which would also give 1) because a reader
   * should be able to see the claim, and because the day this device gains a second assignable is
   * the day the two numbers stop agreeing.
   */
  comfortableVoices: 1,

  /**
   * **No `perStep`**, and that is a fact about the box rather than an authoring gap: Cascadia has
   * no sequencer, no arpeggiator and no step editor. It is played from whatever is sequencing the
   * rig, which is what every recipe's `routing` line says. With no `perStep` there is no
   * articulation to author, and §3's device-level check has nothing to reject.
   *
   * **Sidechain from external audio is real here** and is unusual enough to be worth stating: the
   * back-panel LINE IN reaches the front panel at the LINE IN output jack (p.40), the SLEW / ENV
   * FOLLOW utility is "a full-wave rectifier applied to the source, and low-pass filtered to
   * approx 70 Hz" (p.58), and the INVERT utility turns that envelope upside down (p.65). Patch the
   * inverted follower at VCA A's LEVEL MOD and the voice ducks to whatever is coming in. There is
   * no *internal* sidechain — nothing on this box ducks itself — so the two flags differ.
   *
   * `lfo` counts **three**: LFO X, Y and Z, "three bipolar, rate-linked, triangle-wave LFOs"
   * (p.61). None of them syncs — pp.61-62 mention no clock, sync or reset input, and the only
   * input in the section is a continuous rate CV. Envelope B in LFO mode is a fourth modulator and
   * *is* clock-syncable (p.39), and it is not counted here: `LfoSpec` has one `syncable` for the
   * whole group and cannot say "three free-running and one that locks", so the number describes
   * the section the panel labels LFO and the comment carries the rest.
   */
  features: {
    sidechain: { internal: false, fromExternalAudio: true },
    lfo: {
      count: 3,
      syncable: false,
      destinations: ['pitch', 'pulse-width', 'filter-frequency', 'fold', 'level'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'channel-learn': 'Press the button beside MIDI PITCH',
    'tap-clock': 'Long-press MIDI CLK for TAP',
    'break-normal': 'A cable here replaces the default',
    'octave-detents': 'Eight detents, one octave each',
    'env-speed': 'FAST/MED/SLOW rescales every stage',
    'fine-tune': 'Trimmers around the knob set the sweep',
    'manual-gate': 'MANUAL GATE fires both envelopes',
  },

  manual: {
    title: 'Intellijel Cascadia Manual',
    edition: 'v1.4 (2026.04.13)',
    // #480/#481. v1.4 is the edition every citation here reads, and #481 established it as the
    // one Intellijel publishes. This is the box the field exists for: it cited v1.1 for months
    // while v1.4 was on the downloads page.
    currentEditionConfirmedOn: '2026-09-08',
  },

  productPage: 'https://intellijel.com/shop/eurorack/cascadia/',

  recipes: RECIPES,
}
