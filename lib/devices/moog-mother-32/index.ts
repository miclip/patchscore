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
import { MOTHER_32_PANEL } from './panel'

/**
 * Moog Mother-32 (§2.3) — one monophonic analog voice, a 32-step analog sequencer, and a
 * **32-point patchbay: 18 inputs and 14 outputs** (printed p.70).
 *
 * **Source**: `manuals/Mother_32_Users_Manual.pdf`, 73 PDF pages. **The printed page number is
 * the PDF page number minus one**, checked against the footer on several pages rather than
 * assumed, and every citation below is a *printed* page — the number a reader sees at the bottom
 * of the sheet. The document names itself "Mother-32 User Manual Version 2" on printed p.71, and
 * that is the edition; it documents the v2.0 firmware, which is why the TEMPO input has four
 * modes rather than the one earlier manuals describe (p.55, p.59).
 *
 * ---------------------------------------------------------------------------------------------
 * ## What a Mother-32 recipe is
 *
 * The same shape as the Cascadia's and the CRAVE's — a patch list plus knob positions (§3.3) —
 * with one difference that shows up in the recipes below and is worth stating first:
 *
 * **The most useful modulation on this box needs no cable at all.** The envelope generator is
 * *normalled* to the up position of `VCO MOD SOURCE`, so a pitch drop is two switches and a knob
 * and nothing plugged in (p.49: "When a cable is plugged into the VCO MOD input, it overrides the
 * normalization of the EG to the UP position of the VCO MOD SOURCE switch"). White noise is
 * normalled to the clockwise end of `MIX` the same way (p.48), and the selected LFO waveshape is
 * "automatically transmitted to the VCO MOD SOURCE and VCF MOD SOURCE selector switches with no
 * patching required" (p.13). So `m32-kick-hard` and `m32-sub-dark` carry **no `patch` at all**,
 * deliberately, and say so in `routing`. A guide that invented a cable for them would be telling
 * a reader to undo the box's own wiring for no gain.
 *
 * The normals that a cable *does* replace are stated on the jack's own page, and every patch entry
 * below whose cable breaks one says which in its `note`:
 *
 *     IN · EXT. AUDIO   replaces white noise at the clockwise end of MIX      p.47, p.13
 *     IN · VCO MOD      replaces the EG at the up position of VCO MOD SOURCE  p.49
 *     IN · MIX 1        replaces a normalled 0 V                              p.50
 *     IN · MIX 2        replaces a normalled nominal +5 V                     p.50
 *
 * ## Jack ids are qualified `IN ·` / `OUT ·`, and that is the panel's own word
 *
 * §3.3 requires section-qualified ids because panels reuse names, and this panel reuses exactly
 * one: **`GATE` is silkscreened twice**, once as the envelope generator's gate input and once as
 * the keyboard's gate output. So a qualifier is needed, and there are two candidates.
 *
 * The manual's own chapter headings (`ENVELOPE GENERATOR`, `KEYBOARD`, `VOLTAGE CONTROLLED
 * OSCILLATOR`, `CLOCK/TEMPO`, …) are the Cascadia's convention and were tried first. **They break
 * the voice-control pass** (§3.3/§7): a bundle is a *section's* pitch-and-gate pair, and under
 * those headings this box's pitch input (`VCO 1V/OCT`, under VOLTAGE CONTROLLED OSCILLATOR) and
 * its gate input (`GATE`, under ENVELOPE GENERATOR) fall in different sections, so the Mother-32
 * would form no input bundle and could never be the *target* of a voice-control cable — for a box
 * whose whole selling point is that other gear can play it. That is a modelling artefact, not a
 * fact about the hardware.
 *
 * `IN` and `OUT` are the panel's own legend, printed over the patchbay and explained on p.46:
 * "Patch points whose labels are written in standard text are inputs, while patch points whose
 * labels are reversed are outputs." Under that qualifier the pairs come out right in both
 * directions — `OUT · KB` with `OUT · GATE`, `IN · VCO 1V/OCT` with `IN · GATE` — and `IN · GATE`
 * sorts ahead of `IN · HOLD`, `IN · RESET` and `IN · RUN / STOP` by code unit, so the note gate is
 * chosen over the three sequencer-transport gates without a special case. The manual's headings
 * survive as the comments that group the list.
 *
 * `MIDI IN` carries no separator on purpose. It is the front-panel 5-pin DIN rather than a
 * patchbay point, an id with no section pairs with nothing (§3.3), and a MIDI cable is not a
 * pitch-and-gate bundle.
 *
 * ## Clock: the asymmetry here is not benign, and #103's field cannot express it
 *
 * This box **receives** clock over MIDI DIN and over an analog clock at `IN · TEMPO`, and
 * **sends** clock only as pulses out of `OUT · ASSIGN`. It has no MIDI output of any kind —
 * printed p.70's MIDI block is one line, `INPUT: Din Jack` — so `midi-din` is receive-only and
 * `analog-clock` is send-only, in opposite directions.
 *
 * **This is the box that made `ClockSpec` directional.** It carried one transport list for both
 * directions, and the Cascadia records the same asymmetry harmlessly, because that box sends over
 * `midi-din` as well. Here it was not harmless: §7.4 ranked transports `midi-din > usb` off the
 * undirected list, so a rig choosing this box printed **"Clock source — Mother-32 over
 * `midi-din`. Sync everything else to it."** over a socket the instrument does not have. Both
 * halves of the claim were true and the type could not hold them apart; declaring only
 * `analog-clock` would have fixed the send side by lying about the receive side.
 *
 * `clock.sendTransport` and `clock.receiveTransport` (§2.3) hold them apart now, `transport`
 * stays the union of the two, and this box resolves as an `analog-clock` source — which is the
 * wire the tempo actually leaves on, and the one `sourceSetup` below tells a reader to switch on.
 *
 * ## Numbers: what this manual prints and what it does not
 *
 * Four controls have a range in the document and they are the only parameters mood may move
 * (§3.1's legality gate):
 *
 *  - `CUTOFF` — "change the Filter's Cutoff frequency from 20Hz to 20kHz" (p.14), and the panel
 *    silkscreens `20Hz`, `200Hz`, `2KHz`, `20KHz` beside it, so a figure in hertz is a number a
 *    reader can actually find on the knob.
 *  - `PULSE WIDTH` — "from about 2% at the full counterclockwise position to about 98% at the full
 *    clockwise position. At mid position a Square wave is output" (p.11).
 *  - `LFO RATE` — "from about 0.1Hz to approximately 350Hz" (p.13).
 *  - `FREQUENCY` — "up or down one octave from its center position" (p.11).
 *
 * Everything else on this panel is a knob with a tick ring and no numbers — `MIX`, `RESONANCE`,
 * `VCO MOD AMOUNT`, `VCF MOD AMOUNT`, `ATTACK`, `DECAY`, `VC MIX`, `VOLUME`, `GLIDE` — so those
 * are `travel()`, percent of travel, provisional on both claims and deaf to mood, exactly as the
 * Cascadia's sliders are.
 *
 * **`LFO RATE` is a cited range that is the wrong range under one condition**, and CLAUDE.md's
 * note is about exactly this. p.13 continues: "The LFO can reach up to 600Hz if an external
 * control voltage is applied to the LFO RATE patchpoint." 0.1-350 Hz is the *knob's* travel and
 * stays correct when something is patched — the CV sums on top of the knob rather than replacing
 * its scale — so the range is not switch-gated the way the minilogue's `SHAPE` is. It is recorded
 * because the 600 Hz figure is the one that looks like the parameter's maximum and is not.
 *
 * **`TEMPO` is authored nowhere.** The knob's 20-300 BPM (p.54) is the internal clock only: "When
 * synchronized to an external clock (analog or MIDI) … the TEMPO knob is used to [select] one of
 * the twenty-four available clock division values." One knob, two scales, and which one is in
 * force is decided by whether the rig is driving this box — a fact no recipe can see. Tempo is the
 * arrangement's business in any case, and no device in this library authors it.
 *
 * **`SWING` is a real control and is deliberately absent from every recipe.** The panel prints
 * `(SWING)` under `TEMPO / GATE LENGTH` and p.19 describes it as a percentage with "Swing Amount
 * at 50% (12:00 on the TEMPO knob)" — a centre and a direction, and no minimum or maximum
 * anywhere. Authoring 0-100 to hang a value on would be inventing bounds (invariant 5), and
 * `travel()` on it would be a second, quieter invention: a percentage of travel that happens to
 * read like the percentage the manual names. So the `swing` mood axis goes **unserved on a box
 * that has swing**, which is a different finding from the Cascadia's — that box has no sequencer
 * and nothing to swing (§6.1 lets a device decline an axis by having no param that declares it).
 * The distinction is recorded here so the next person comparing the two does not read one silence
 * as the other.
 *
 * The same limit costs two more axes. `density` and `space` are usually carried by envelope
 * times, and this document prints none: p.15's `ATTACK` and p.16's `DECAY` are described in words
 * and given no figures, and p.70's specifications row is `ENVELOPE: VCF and / or VCA (Attack,
 * Decay)`. So the axes this box answers are `darkness` (at `CUTOFF`, and at `FREQUENCY` where a
 * part can afford an octave) and `grit` (at `PULSE WIDTH`, which p.11 explains harmonically: "The
 * thinner the wave, the more the upper harmonics are accentuated"). Three of five decline, all
 * three for want of a printed scale rather than for want of hardware.
 *
 * **Nothing here is an `observed` citation.** Nobody has taken a reading off the instrument.
 *
 * ## The nine factory patches, and why they are not cited
 *
 * pp.64-66 print nine of Moog's own patches — `OCTAVE BOUNCE BACK`, `NOISE TRANSIENT`,
 * `METAL SNARE`, `SEQUENCER BASS`, `RESONANT HIGH PASS FILTER`, `8-BIT PERCUSSION`, `'80S TOMS`,
 * `SHORT BRASS`, `FILTER KICK` — each as a full panel drawing with pointer angles, circled switch
 * positions and cables drawn as curves across the patchbay. They are the strongest content in the
 * document and **none of them is cited as a value or as a cable below**, for two separate reasons
 * that are worth keeping apart:
 *
 *  - A knob **pointer angle is not a number the manual printed**. Turning one into a figure means
 *    choosing a mapping from rotation to percent of travel, and that arithmetic would be ours
 *    wearing the manual's authority — the same move §3.1 refuses for a range nobody stated.
 *  - A cable's **endpoints could not be read reliably** at the scale these figures are drawn.
 *    Rendered at 200 dpi, a curve crossing four columns of 9.7 mm sockets on a 13.4 mm pitch
 *    lands ambiguously between neighbours often enough that a cited cable would sometimes be the
 *    socket next door — which is precisely the failure §2.6 keys evidence by id to prevent.
 *
 * What the pages *do* establish, unambiguously, is their own titles, and one of those is
 * load-bearing: `METAL SNARE` is why `snare` appears in `VOICE_ROLES` on a monophonic box where
 * the CRAVE's manifest reasons its way out of the role. Moog authored a snare on this instrument
 * and printed it; the recipe below is our own, and the role is theirs.
 *
 * ## What the manual *does* instruct, and what those cables carry
 *
 * Four cables here are not taste. The control chapters print TIPs that name both endpoints and
 * the switch positions that make them work, and those carry the page that instructs them:
 *
 *     OUT · VCO PULSE -> IN · EXT. AUDIO   p.11   MIX blends saw and pulse; VCO WAVE must be SAW
 *     OUT · KB        -> IN · LFO RATE     p.13   LFO rate follows the pitch of each note
 *     OUT · VCF       -> IN · EXT. AUDIO   p.14   resonance in HI PASS; RESONANCE fully ccw
 *     OUT · KB        -> IN · VCF CUTOFF   p.14   the VCF as a self-oscillating sine source
 *
 * Every other cable is `verified: false` and renders provisional, which is what §3.3 says a
 * connection somebody patched because it sounded right is worth. The last of the four appears
 * twice in this file at two different provenances — cited in `m32-sub-clean`, which reproduces
 * p.14's use of it, and `false` in `m32-stab-hard` and `m32-tom-dark`, which borrow the cable for
 * a different end. That the field can tell those apart is the whole of #49.
 *
 * ## What is deliberately not authored
 *
 *  - **A resonance figure.** p.14 says "Settings above 3 o'clock will cause the Filter to
 *    self-oscillate", which is a clock face rather than a scale. It reaches the reader as a hint.
 *  - **Envelope times.** See above; the document prints none.
 *  - **`features.sidechain`.** This box has an external audio input (p.47) and no envelope
 *    follower anywhere among the patchbay's fourteen outputs, so nothing here can derive a control
 *    voltage from incoming audio and duck to it. No page says so either way, which is what the
 *    `capabilityEvidence` entry records.
 *  - **Any cable into `IN · VCO 1V/OCT`.** p.48 describes that input as accepting "a -5 to +5V
 *    control voltage", so an envelope into it is electrically fine and musically ordinary. It is
 *    still the socket a note's pitch arrives by, which is what makes it `pitch-cv` (§3.3), and the
 *    vocabulary exists to refuse an envelope at a note input. Every pitch gesture below therefore
 *    goes through the normalled EG at `VCO MOD` instead, which is the same sound through the
 *    socket the panel provides for it.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by **printed** page (PDF page minus one). */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Mother-32 User Manual (Version 2), p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared patch point (§3.3). The page is where the manual describes *this jack*.
 *
 * Generic in `Id` for the reason the Cascadia's is: the obvious `(id: string)` signature widens
 * every id the moment it is written, which would make `Mother32Jack` below `string` and turn
 * `cable()`'s endpoint check into no check at all.
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
 * §3.3. All thirty-two patch points, plus the MIDI DIN, each cited once on the page that
 * describes it.
 *
 * The whole patchbay is declared rather than the subset the recipes reach for: a partial list
 * reads as a claim that the rest do not exist, and p.70 states the complement exactly — 32 jacks,
 * 18 in, 14 out. The comments are the manual's own chapter headings; the ids are the panel's
 * silkscreen under the `IN`/`OUT` legend (see the header note).
 */
const JACKS = [
  // -- EXTERNAL AUDIO INPUT / MIX CONTROL VOLTAGE INPUT / VCA (p.47) -----------------
  jack('IN · EXT. AUDIO', 'in', ['audio'], 47, {
    note: 'Unity gain at Eurorack level — expects about 10 V peak to peak; a line signal needs amplifying first',
  }),
  jack('IN · MIX CV', 'in', ['cv'], 47, {
    note: 'With MIX at centre, -5 V to +5 V crossfades the VCO against the EXT. AUDIO side',
  }),
  jack('IN · VCA CV', 'in', ['cv'], 47, {
    note: '0 to +8 V in EG mode, ±5 V in ON mode, summed with the VCA MODE switch',
  }),
  jack('OUT · VCA', 'out', ['audio'], 47, { note: 'After the VOLUME attenuator, ±5 V typical' }),

  // -- NOISE (p.48) ------------------------------------------------------------------
  jack('OUT · NOISE', 'out', ['audio'], 48, {
    note: 'White noise, ±5 V typical — also normalled to the clockwise end of MIX',
  }),

  // -- VOLTAGE CONTROLLED FILTER (p.48) ----------------------------------------------
  jack('IN · VCF CUTOFF', 'in', ['cv'], 48, {
    note: 'Summed with the CUTOFF knob and the VCF modulation; ±5 V sweeps 20 Hz to 20 kHz from centre',
  }),
  jack('IN · VCF RES.', 'in', ['cv'], 48, { note: 'Summed with the RESONANCE knob' }),
  jack('OUT · VCF', 'out', ['audio'], 48, { note: 'The Moog ladder filter, about ±5 V at maximum' }),

  // -- VOLTAGE CONTROLLED OSCILLATOR (pp.48-49) --------------------------------------
  /**
   * **`pitch-cv`, and the only one on this box.** p.48 calls it "a 1V/Octave Exponential
   * frequency modulation input" and tells a reader to use this input "when using an external CV
   * controller … for proper 1V/Octave tracking". That is the socket a note's pitch arrives by,
   * which is the definition §3.3 gives, and the reason nothing in this file patches into it.
   */
  jack('IN · VCO 1V/OCT', 'in', ['pitch-cv'], 48, {
    note: 'Summed with FREQUENCY, the keyboard CV and any VCO modulation; ±5 V sweeps 8 Hz to 8 kHz',
  }),
  jack('IN · VCO LIN FM', 'in', ['cv'], 49, {
    note: 'Linear FM, accepts ±5 V — the manual offers it for audio-rate modulation',
  }),
  jack('IN · VCO MOD', 'in', ['cv'], 49, {
    note: 'Replaces the EG normalled to the up position of VCO MOD SOURCE; VCO MOD AMOUNT then attenuates it',
  }),
  jack('OUT · VCO SAW', 'out', ['audio'], 49, { note: 'The VCO sawtooth, ±5 V' }),
  jack('OUT · VCO PULSE', 'out', ['audio'], 49, { note: 'The VCO pulse, ±5 V' }),

  // -- LOW FREQUENCY OSCILLATOR (pp.49-50) -------------------------------------------
  jack('IN · LFO RATE', 'in', ['cv'], 49, {
    note: 'Summed with the RATE knob; from centre, ±5 V sweeps roughly 0.18 Hz to 190 Hz, 600 Hz at maximum',
  }),
  /**
   * **`cv` and not `['cv', 'audio']`**, on the Cascadia's rule and for the same reason its
   * `VCO A · FM 1` is not audio: p.50 says of each of these only "This output is the LFO Square
   * waveform (+/-5V)". The audio-rate claim is real and is on p.13, a page about the LFO section
   * rather than about this socket, and `m32-metallic-dirty` below patches one of them into linear
   * FM on the strength of it. Reading `audio` in here off that page would render as though the
   * jack's own description said it.
   *
   * These two are also where the manual's section headings slip: p.50 prints them under
   * "VOLTAGE CONTROLLED OSCILLATOR (Continued)" although the LFO section opened on p.49. The
   * comment above uses the heading that introduces them; the erratum is recorded rather than
   * tidied away.
   */
  jack('OUT · LFO SQ', 'out', ['cv'], 50, { note: 'The LFO square, ±5 V' }),
  jack('OUT · LFO TRI', 'out', ['cv'], 50, { note: 'The LFO triangle, ±5 V' }),

  // -- VC MIX — voltage controlled, DC coupled mixer (pp.50-51) ----------------------
  jack('IN · MIX 1', 'in', ['cv'], 50, {
    note: 'Replaces a normalled 0 V at the counterclockwise end of VC MIX; DC coupled, ±5 V',
  }),
  jack('IN · MIX 2', 'in', ['cv'], 50, {
    note: 'Replaces a normalled nominal +5 V at the clockwise end of VC MIX; DC coupled, ±5 V',
  }),
  jack('IN · VC MIX CTRL', 'in', ['cv'], 50, {
    note: 'Summed with the VC MIX knob; from centre, ±5 V crossfades MIX 1 against MIX 2',
  }),
  jack('OUT · VC MIX', 'out', ['cv'], 51, {
    note: 'With nothing in MIX 1 or MIX 2 the knob makes this a fixed 0 to +5 V source',
  }),

  // -- MULTIPLE (p.51) ---------------------------------------------------------------
  /**
   * **`cv` alone, where the CRAVE's `MULTIPLE` carries five kinds.** The two boxes have the same
   * utility and their manuals say opposite things about it: the CRAVE's patchbay list offers
   * "any signal entered here", while p.51 here is a buffered splitter with a warning in capitals
   * — "Do not use the Mult to mix two signals together. It is designed to be used ONLY as a CV
   * signal splitter." So the honest list is one member, and the difference between the two
   * manifests is the difference between the two pages rather than an inconsistency.
   */
  jack('IN · MULT', 'in', ['cv'], 51, { note: 'Buffered CV splitter input — the manual restricts it to CV' }),
  jack('OUT · MULT 1', 'out', ['cv'], 51, { note: 'Buffered copy 1 of the MULT input' }),
  jack('OUT · MULT 2', 'out', ['cv'], 51, { note: 'Buffered copy 2 of the MULT input' }),

  // -- ASSIGNABLE OUTPUT (p.52) ------------------------------------------------------
  /**
   * **Three kinds, because sixteen sources are three different things.** p.52 enumerates them:
   * clock at three divisions, an accent pulse and a step-1 trigger, and ten control voltages
   * (step ramp/saw/triangle/random and six MIDI values). The list is `['clock', 'trigger', 'cv']`
   * and never `['gate']`, so the §7 voice-control pass — which wants a *single-purpose* output —
   * correctly declines to treat this as a gate source, and the one clock cable §7.4 decides is
   * not restated here.
   *
   * `clock: ['analog-clock']` because this is the only socket on the box a tempo can leave by,
   * and its factory default is the clock: p.59's Setup page 1 prints "2: Sequencer Clock
   * (Default)", p.61's globals repeat it.
   */
  jack('OUT · ASSIGN', 'out', ['clock', 'trigger', 'cv'], 52, {
    clock: ['analog-clock'],
    note: 'Sixteen sources, chosen in Setup page 1; the factory default is the sequencer clock, one pulse per step',
  }),

  // -- ENVELOPE GENERATOR (p.53) -----------------------------------------------------
  jack('IN · GATE', 'in', ['gate'], 53, {
    note: 'Accepts a 0 to +5 V gate to trigger the EG, and tolerates 10 V gates',
  }),
  jack('OUT · EG', 'out', ['cv'], 53, { note: 'The onboard envelope, 0 to +7.5 V' }),

  // -- KEYBOARD (p.53) ---------------------------------------------------------------
  jack('OUT · KB', 'out', ['pitch-cv'], 53, {
    note: 'The note CV, -5 V to +5 V, after GLIDE and MIDI pitch bend',
  }),
  jack('OUT · GATE', 'out', ['gate'], 53, {
    note: 'A +5 V gate on every new note from the keyboard, the sequencer or MIDI',
  }),

  // -- CLOCK / TEMPO (pp.54-56) ------------------------------------------------------
  /**
   * **Two kinds, chosen by a setting, which is the case the list exists for** — the TR-1000's
   * `TRG IN` in different clothes. p.55 gives this socket four modes and Setup page 3 selects
   * them (p.59): TEMPO CV and Step Address CV are control voltages, Single Clock Advance and
   * Analog Clock are clock. The panel draws it circled, which p.46's legend calls a gate input.
   *
   * `clock: ['analog-clock']` is the receive half of this box's clock, and p.55's priority rules
   * put it above everything: "A connected Analog Clock will override a connected MIDI clock,
   * and / or the internal clock."
   */
  jack('IN · TEMPO', 'in', ['clock', 'cv'], 55, {
    clock: ['analog-clock'],
    note: 'Four modes in Setup page 3; the default is Single Clock Advance, one step per rising edge',
  }),
  jack('IN · RUN / STOP', 'in', ['gate'], 56, {
    note: 'A level, not a pulse: the sequencer plays for as long as +5 V is applied. Triggers from about +3.2 V',
  }),
  jack('IN · RESET', 'in', ['gate'], 56, {
    note: 'Step 1 repeats for as long as +5 V is applied, then the pattern advances. Triggers from about +3.2 V',
  }),
  jack('IN · HOLD', 'in', ['gate'], 56, {
    note: 'The current step repeats for as long as +5 V is applied. Triggers from about +3.2 V',
  }),

  // -- the front-panel MIDI DIN, which is not a patchbay point ------------------------
  /**
   * Declared although it is not one of the thirty-two, because §10's rack labels a clock socket
   * from a jack's own id and a box that declares none gets an unlabelled hole. This is where a
   * MIDI clock arrives (p.54), and it is the only MIDI connector on the instrument — p.70's MIDI
   * block is one line, `INPUT: Din Jack`, and there is no output and no USB port anywhere.
   *
   * **`['midi', 'clock']`, and the second member is the schema's own implication.** §3.3 checks
   * that a jack claiming a clock transport also carries `clock` in `signal`, because telling the
   * rack a socket takes tempo while telling a signal-aware consumer it does not is worse than
   * either answer alone. It is true of this hole in the plainest way: p.70's `DATA` row for this
   * connector reads "Note, Clock, CC, etc.", so a cable here really does carry both a MIDI stream
   * and a tempo. It is the one place in this file where two members of a deliberately disjoint
   * vocabulary sit together, and the pair is a fact rather than an author who could not choose.
   */
  jack('MIDI IN', 'in', ['midi', 'clock'], 54, {
    clock: ['midi-din'],
    note: 'The only MIDI connector on the box: input only, 5-pin DIN, on the front panel',
  }),
  // `satisfies` rather than an annotation: an annotation would widen every id above back to
  // `string` and take `Mother32Jack` with it.
] satisfies JackSpec[]

/** Every declared jack id, as a union of literals, so `cable()` catches a typo at compile time. */
export type Mother32Jack = (typeof JACKS)[number]['id']

// ---------------------------------------------------------------------------
// Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A numeric whose **range** the manual prints. The point inside it is taste and says so.
 *
 * `verified: false` is written on the point explicitly rather than left to inherit, for the
 * Cascadia's reason: the recipes here carry `verified: false` too, so it changes nothing today,
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
 * it. A travel figure is somebody's taste, and mood arithmetic on top of taste inside bounds
 * nobody checked would be arithmetic dressed as authority. `% travel` is a fact about a knob
 * anyone can see; it is emphatically not a claim that the box displays 0-100.
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
 * these two is the right move (§3.3/#49). For most of what follows that is taste, so it is
 * `false`; the four cables the manual's own TIPs instruct carry the page that instructs them.
 */
function cable(
  from: Mother32Jack,
  to: Mother32Jack,
  note: string,
  instructedOn?: number,
): PatchEntry {
  return { from, to, note, verified: instructedOn === undefined ? false : cite(instructedOn) }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/** p.11: "select between two oscillator waveforms: Sawtooth (Saw) and Pulse". The panel prints glyphs. */
const VCO_WAVE = ['PULSE', 'SAW'] as const

/** p.12, and the panel's own two positions under the switch. */
const VCO_MOD_SOURCE = ['EG / VCO MOD', 'LFO'] as const
const VCO_MOD_DEST = ['PULSE WIDTH', 'FREQUENCY'] as const

/** p.13: "The LFO has two available modulation shapes: Square and Triangle." */
const LFO_WAVE = ['SQUARE', 'TRIANGLE'] as const

/** p.14: "This switch selects between LOW PASS and HI PASS Filter modes." */
const VCF_MODE = ['HI PASS', 'LOW PASS'] as const

/** p.15: the two VCF modulation switches. The polarity switch is silkscreened `+` and `−`. */
const VCF_MOD_SOURCE = ['EG', 'LFO'] as const
const VCF_MOD_POLARITY = ['+', '−'] as const

/** p.16: the SUSTAIN switch, and the VCA's two modes. */
const SUSTAIN = ['ON', 'OFF'] as const
const VCA_MODE = ['ON', 'EG'] as const

/**
 * The sixteen things `OUT · ASSIGN` can carry, in Setup page 1's order and words (p.59).
 *
 * Present at all because `ASSIGN` is the one output whose meaning its silkscreen does not fix: a
 * recipe that patches it and does not say which source is asking the reader to guess between
 * sixteen. p.52 describes each of them in full under the same numbering.
 */
const ASSIGN_SOURCES = [
  'Accent',
  'Sequencer Clock',
  'Sequencer Clock / 2',
  'Sequencer Clock / 4',
  'Sequencer Step Ramp',
  'Sequencer Step Saw',
  'Sequencer Step Triangle',
  'Sequencer Step Random',
  'Sequencer Step 1 Trigger Output',
  'MIDI Velocity',
  'MIDI Channel Pressure',
  'MIDI Pitch Bend',
  'MIDI CC 1',
  'MIDI CC 2',
  'MIDI CC 4',
  'MIDI CC 7',
] as const

// ---------------------------------------------------------------------------
// Cited ranges
// ---------------------------------------------------------------------------

/**
 * p.11: "tune the pitch of the Oscillator up or down one octave from its center position".
 *
 * **Written in semitones, which is a unit change and not arithmetic.** An octave is twelve
 * semitones by definition, `st` is the unit the library already reviewed for a detune control
 * (#29, and the Cascadia's fine tune uses it), and a rendered `-10 st` is a figure a reader can
 * hold against another box's transpose. Widening the reviewed unit set to admit `oct` for one
 * knob would be the tail wagging the dog.
 *
 * The page's own caveat is why no recipe below sits on either end: the control is "calibrated at
 * the factory to provide slightly more than +/-1 octave from center", and "the maximum and
 * minimum positions will have some variation in the tuning amount over an octave". The printed
 * bound is exact; the hardware at that bound is not.
 */
const FREQ_ST = { min: -12, max: 12 }

/** p.11: "from about 2% … to about 98% … At mid position a Square wave is output." */
const PULSE_WIDTH = { min: 2, max: 98 }

/** p.14: "change the Filter's Cutoff frequency from 20Hz to 20kHz", and the panel marks the decades. */
const CUTOFF_HZ = { min: 20, max: 20000 }

/** p.13: "ranges from about 0.1Hz to approximately 350Hz". See the header note on the 600 Hz figure. */
const LFO_HZ = { min: 0.1, max: 350 }

// ---------------------------------------------------------------------------
// The blocks every recipe sets
// ---------------------------------------------------------------------------

/**
 * The oscillator, mixer and filter knobs — the seven that decide what the voice sounds like.
 *
 * `pulseWidth` is optional and is omitted on the saw recipes rather than set to an inert 50: a
 * rendered row saying `PULSE WIDTH 50%` on a part whose oscillator is a sawtooth is a value with
 * no subject, which is #101's complaint one control along.
 */
function voice(opts: {
  freq: number
  wave: (typeof VCO_WAVE)[number]
  pulseWidth?: number
  pulseWidthGrit?: number
  mix: number
  cutoff: number
  darkness: number
  resonance: number
  mode: (typeof VCF_MODE)[number]
  volume: number
  freqDarkness?: number
}): AuthoredParam[] {
  return [
    num('FREQUENCY', opts.freq, FREQ_ST, cite(11), {
      unit: 'st',
      ...(opts.freqDarkness === undefined
        ? {}
        : { mood: [{ axis: 'darkness', amount: opts.freqDarkness }] }),
    }),
    pick('VCO WAVE', opts.wave, VCO_WAVE, cite(11)),
    ...(opts.pulseWidth === undefined
      ? []
      : [
          num('PULSE WIDTH', opts.pulseWidth, PULSE_WIDTH, cite(11), {
            unit: '%',
            note: 'Thinner accentuates the upper harmonics; mid position is a square wave',
            ...(opts.pulseWidthGrit === undefined
              ? {}
              : { mood: [{ axis: 'grit', amount: opts.pulseWidthGrit }] }),
          }),
        ]),
    travel('MIX', opts.mix, {
      note: 'Counterclockwise is the VCO, clockwise is white noise or whatever is in EXT. AUDIO',
    }),
    num('CUTOFF', opts.cutoff, CUTOFF_HZ, cite(14), {
      unit: 'Hz',
      mood: [{ axis: 'darkness', amount: opts.darkness }],
    }),
    travel('RESONANCE', opts.resonance, { hint: 'self-oscillate' }),
    pick('VCF MODE', opts.mode, VCF_MODE, cite(14)),
    travel('VOLUME', opts.volume),
  ]
}

/** The VCO modulation block. `EG / VCO MOD` selects the normalled envelope unless VCO MOD is patched. */
function vcoMod(
  source: (typeof VCO_MOD_SOURCE)[number],
  dest: (typeof VCO_MOD_DEST)[number],
  amount: number,
): AuthoredParam[] {
  return [
    pick('VCO MOD SOURCE', source, VCO_MOD_SOURCE, cite(12), {
      ...(source === 'EG / VCO MOD'
        ? { note: 'The EG is normalled here — a cable in VCO MOD replaces it' }
        : {}),
    }),
    pick('VCO MOD DEST', dest, VCO_MOD_DEST, cite(12)),
    travel('VCO MOD AMOUNT', amount),
  ]
}

/** The VCF modulation block. */
function vcfMod(
  source: (typeof VCF_MOD_SOURCE)[number],
  polarity: (typeof VCF_MOD_POLARITY)[number],
  amount: number,
): AuthoredParam[] {
  return [
    pick('VCF MOD SOURCE', source, VCF_MOD_SOURCE, cite(15)),
    pick('VCF MOD POLARITY', polarity, VCF_MOD_POLARITY, cite(15)),
    travel('VCF MOD AMOUNT', amount),
  ]
}

/**
 * The envelope and the amplifier. Attack and Decay only — p.70's specifications row reads
 * `ENVELOPE: VCF and / or VCA (Attack, Decay)` and SUSTAIN is a switch rather than a level, so
 * there is no sustain value to author and no release stage: with SUSTAIN off "the Attack stage
 * immediately moves to the Decay stage", and with it on the decay is what a released note does
 * (pp.16, 17).
 */
function eg(
  attack: number,
  sustain: (typeof SUSTAIN)[number],
  decay: number,
  vcaMode: (typeof VCA_MODE)[number],
): AuthoredParam[] {
  return [
    travel('ATTACK', attack),
    pick('SUSTAIN', sustain, SUSTAIN, cite(16), { hint: 'sustain-legato' }),
    travel('DECAY', decay),
    pick('VCA MODE', vcaMode, VCA_MODE, cite(16), {
      ...(vcaMode === 'ON'
        ? { note: 'ON holds the amplifier open, so the part sounds without a gate' }
        : {}),
    }),
  ]
}

/** The LFO, where a recipe uses it. */
function lfo(rate: number, wave: (typeof LFO_WAVE)[number], extra: Partial<AuthoredNumericParam> = {}): AuthoredParam[] {
  return [
    num('LFO RATE', rate, LFO_HZ, cite(13), { unit: 'Hz', ...extra }),
    pick('LFO WAVE', wave, LFO_WAVE, cite(13)),
  ]
}

/** GLIDE, per-step on this box even though the rate is not (p.26). */
function glide(value: number): AuthoredParam {
  return travel('GLIDE', value, { hint: 'glide-step' })
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * How this box is driven, said once per recipe. Unlike the Cascadia it has a sequencer of its
 * own, so the sentence is about the choice rather than about the absence.
 */
const PLAYED =
  'Played from its own 32-step sequencer, from MIDI IN, or from pitch and gate at VCO 1V/OCT and GATE'

/**
 * `verified: false` on every recipe, explicitly rather than by omission. §3.1 makes the recipe
 * citation the default a param inherits when it carries none, and nothing here cites a *recipe* —
 * no page says "these are the settings for a kick" — so the chain has to terminate, and saying so
 * is what stops an omitted citation from quietly meaning something one day.
 */
const RECIPES: Recipe[] = [
  // ---- low --------------------------------------------------------------------------
  {
    id: 'm32-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'Kick from the normalled envelope: no cables, the pitch drop is two switches',
    routing: `${PLAYED}. No patch cable: the EG is already normalled to the up position of VCO MOD SOURCE (p.49), so VCO MOD DEST at FREQUENCY is the whole pitch drop`,
    params: [
      ...voice({
        freq: 0,
        freqDarkness: -12,
        wave: 'SAW',
        mix: 0,
        cutoff: 110,
        darkness: -40,
        resonance: 28,
        mode: 'LOW PASS',
        volume: 78,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 34),
      ...vcfMod('EG', '+', 40),
      ...eg(0, 'OFF', 16, 'EG'),
      glide(0),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'm32-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'voice',
    title: 'Kick with the pulse folded back in beside the saw',
    routing: `${PLAYED}. p.11's TIP: with VCO WAVE on SAW and the pulse in EXT. AUDIO, MIX blends the two waveforms instead of blending in noise`,
    params: [
      ...voice({
        freq: 0,
        freqDarkness: -12,
        wave: 'SAW',
        pulseWidth: 22,
        pulseWidthGrit: 14,
        mix: 55,
        cutoff: 140,
        darkness: -50,
        resonance: 62,
        mode: 'LOW PASS',
        volume: 74,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 30),
      ...vcfMod('EG', '+', 35),
      ...eg(0, 'OFF', 20, 'EG'),
      glide(0),
    ],
    patch: [
      cable(
        'OUT · VCO PULSE',
        'IN · EXT. AUDIO',
        'Replaces the white noise normalled to the clockwise end of MIX, so MIX now blends saw against pulse',
        11,
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Sub an octave down with the ladder shut over it',
    routing: `${PLAYED}. No patch cable: the normalled signal path is already VCO into the mixer into the filter into the VCA, and this part is that path with the filter closed`,
    params: [
      ...voice({
        freq: -10,
        wave: 'SAW',
        mix: 0,
        cutoff: 70,
        darkness: -25,
        resonance: 8,
        mode: 'LOW PASS',
        volume: 82,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 0),
      ...vcfMod('LFO', '+', 0),
      ...eg(0, 'ON', 55, 'EG'),
      glide(0),
    ],
    verified: false,
  },
  {
    id: 'm32-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    title: 'Sine sub from the filter self-oscillating, tracked by the keyboard',
    routing: `${PLAYED}. p.14's TIP in full: LOW PASS with RESONANCE and MIX at maximum turns the ladder into a sine source. The TIP also asks for a dead patch cable in EXT. AUDIO — a cable with one end, which cannot be a patch entry, so it is stated here`,
    params: [
      // No FREQUENCY, VCO WAVE or PULSE WIDTH: the oscillator is not the source of this part, and
      // a rendered oscillator setting would be a value with no subject.
      travel('MIX', 100, { note: 'p.14 wants it at maximum, with a dead cable in EXT. AUDIO' }),
      num('CUTOFF', 60, CUTOFF_HZ, cite(14), {
        unit: 'Hz',
        mood: [{ axis: 'darkness', amount: -20 }],
        note: 'With the filter self-oscillating this is the pitch of the sine, not a corner frequency',
      }),
      travel('RESONANCE', 100, { hint: 'self-oscillate' }),
      pick('VCF MODE', 'LOW PASS', VCF_MODE, cite(14)),
      travel('VOLUME', 76),
      ...vcfMod('LFO', '+', 0),
      ...eg(0, 'ON', 45, 'EG'),
      glide(0),
    ],
    patch: [
      cable('OUT · KB', 'IN · VCF CUTOFF', 'The note CV tunes the self-oscillating filter', 14),
    ],
    verified: false,
  },
  {
    id: 'm32-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Mid bass with the pulse width moving and the LFO tracking the notes',
    routing: `${PLAYED}. p.13's TIP: the keyboard CV at LFO RATE makes the width modulation speed up as the line climbs`,
    params: [
      ...voice({
        freq: 0,
        freqDarkness: -12,
        wave: 'PULSE',
        pulseWidth: 34,
        pulseWidthGrit: 16,
        mix: 0,
        cutoff: 620,
        darkness: -180,
        resonance: 48,
        mode: 'LOW PASS',
        volume: 78,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 26),
      ...vcfMod('EG', '+', 30),
      ...lfo(3.2, 'TRIANGLE'),
      ...eg(0, 'ON', 38, 'EG'),
      glide(8),
    ],
    articulation: [
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      // Glide is per-step; the *rate* is not, and stays on the panel knob above (p.26).
      { slot: 'offbeat', set: { glide: true }, hint: 'glide-step' },
    ],
    patch: [
      cable('OUT · KB', 'IN · LFO RATE', 'LFO rate follows the pitch of each note played', 13),
    ],
    verified: false,
  },

  // ---- acid, lead, stab, pad --------------------------------------------------------
  {
    id: 'm32-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    title: 'Resonant line with accented steps opening the filter',
    routing: `${PLAYED}. ASSIGN is set to Accent, so only the steps marked with RESET / ACCENT push the cutoff`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 0,
        cutoff: 240,
        darkness: -80,
        resonance: 78,
        mode: 'LOW PASS',
        volume: 76,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('EG', '+', 52),
      ...eg(0, 'OFF', 24, 'EG'),
      glide(22),
      pick('ASSIGN OUTPUT', 'Accent', ASSIGN_SOURCES, cite(59), { hint: 'assign-jack' }),
    ],
    /**
     * The one gesture this recipe is entirely *about*, and it was the one recipe on the box not
     * carrying it. Everything else here already says the accent lane is doing the work — the
     * title, the `routing` sentence, the ASSIGN source set to Accent and the cable summing that
     * output into the cutoff — and none of it told the reader *which steps to mark*. The three
     * sibling recipes above and below author exactly this entry, on the same lane p.24 lists as
     * per-step ("Accent ... defined per-step"), so this is the file's own convention arriving
     * where its case is strongest: elsewhere an accent is a louder step, and here it is a louder
     * step that opens the filter, because the patch cable makes the lane a cutoff modulator.
     *
     * Reachable rather than hopeful (#108): the `acid` role is requested by one direction and its
     * four bands each emit `accent`, so this lands in a rendered guide rather than sitting in the
     * manifest waiting for one.
     */
    articulation: [
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      // The other half of the idiom, and the box has the lane for it: GLIDE is per-step here even
      // though the rate is not (p.26), which is exactly the shape a slide has — the rate is a
      // setting and which steps slide is a decision. `m32-bass-mid-dirty` pairs the same two
      // entries. The offbeat strikes are the ones that lean into the next step, so they are where
      // a line like this slides.
      { slot: 'offbeat', set: { glide: true }, hint: 'glide-step' },
    ],
    patch: [
      cable(
        'OUT · ASSIGN',
        'IN · VCF CUTOFF',
        'Accented steps add to the cutoff; nothing is displaced, this input only sums (p.48)',
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    title: 'Hi-pass line with MIX turned into the resonance control',
    routing: `${PLAYED}. p.14's TIP: the hi-pass ladder is non-resonant, so the filter's own output goes back into EXT. AUDIO and MIX becomes the resonance — which is why RESONANCE itself stays fully counterclockwise`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 62,
        cutoff: 900,
        darkness: -300,
        resonance: 0,
        mode: 'HI PASS',
        volume: 74,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('EG', '+', 44),
      ...eg(0, 'OFF', 22, 'EG'),
      glide(16),
    ],
    /**
     * Both gestures, on the lanes p.24 and p.26 declare. The `dirty` recipe beside this one routes
     * ASSIGN into the cutoff so its accent opens the filter as well as leaning on the step; this
     * one has no cable going spare, so the accent is the level alone. That is a smaller gesture
     * and still the box's own — `m32-kick-hard` articulates the same lane with no cable at all,
     * which is what says the accent is audible without one.
     */
    articulation: [
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      { slot: 'offbeat', set: { glide: true }, hint: 'glide-step' },
    ],
    patch: [
      cable(
        'OUT · VCF',
        'IN · EXT. AUDIO',
        'Replaces the noise normalled to the clockwise end of MIX; MIX now feeds the filter back into itself',
        14,
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'Open lead with vibrato taken through linear FM',
    routing: `${PLAYED}. The LFO reaches the pitch through VCO LIN FM rather than through VCO MOD, which leaves the VCO MOD path on the envelope`,
    params: [
      ...voice({
        freq: 0,
        wave: 'PULSE',
        pulseWidth: 62,
        pulseWidthGrit: 12,
        mix: 0,
        cutoff: 3800,
        darkness: -1400,
        resonance: 22,
        mode: 'LOW PASS',
        volume: 76,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('LFO', '+', 14),
      ...lfo(5.4, 'TRIANGLE'),
      ...eg(6, 'ON', 40, 'EG'),
      glide(10),
    ],
    /**
     * **Gate length is eighths of a step, not a percentage** — p.25: "Gate Length is set per-step
     * and determines the duration that a note is held relative to the length of its step (from
     * 1/8 - 8/8)". `6/8` is a long note that is still not the maximum, and the maximum is a
     * different gesture: the same page calls it "a 'Tie'", which is why p.24 lists `tie` as a
     * seventh lane beside this one.
     *
     * **It only sounds with SUSTAIN on**, and the page says so in capitals — "IMPORTANT: Make
     * sure the SUSTAIN switch is set to ON for different Gate Lengths to sound correctly." So the
     * gesture lives on this recipe rather than on a short percussive one, where it would be an
     * instruction that does nothing. That pairing is the CLAUDE.md rule about a cited value read
     * off the wrong scale, arriving on an articulation instead of a parameter.
     */
    articulation: [{ slot: 'offbeat', set: { 'gate-length': '6/8' }, hint: 'gate-length' }],
    patch: [
      cable(
        'OUT · LFO TRI',
        'IN · VCO LIN FM',
        'Vibrato, and nothing is displaced — LIN FM has no normal of its own (p.49)',
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    title: 'Short stab with the filter tracking the note it lands on',
    routing: `${PLAYED}. One note: this box is monophonic (p.70), so a stab here is a single-note stab and a request for a triad reports the shortfall`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 0,
        cutoff: 1400,
        darkness: -500,
        resonance: 40,
        mode: 'LOW PASS',
        volume: 78,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('EG', '+', 48),
      ...eg(0, 'OFF', 14, 'EG'),
      glide(0),
    ],
    patch: [
      cable(
        'OUT · KB',
        'IN · VCF CUTOFF',
        'Higher notes land brighter. The same cable p.14 instructs for a sine source, borrowed here for a different end',
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    title: 'Slow pad with the width and the cutoff drifting apart',
    routing: `${PLAYED}. One note (p.70). The pad is declared so that a three-note request reports the shortfall rather than "nothing in your rig plays this"`,
    params: [
      ...voice({
        freq: 0,
        wave: 'PULSE',
        pulseWidth: 46,
        pulseWidthGrit: 8,
        mix: 0,
        cutoff: 1600,
        darkness: -700,
        resonance: 14,
        mode: 'LOW PASS',
        volume: 70,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 30),
      ...vcfMod('LFO', '+', 18),
      ...lfo(0.4, 'TRIANGLE', { mood: [{ axis: 'space', amount: -0.25 }] }),
      ...eg(34, 'ON', 62, 'EG'),
      glide(0),
    ],
    patch: [
      cable(
        'OUT · LFO TRI',
        'IN · VCF CUTOFF',
        'A second, slower LFO path onto the cutoff, summed with the panel VCF MOD (p.48)',
      ),
    ],
    verified: false,
  },

  // ---- percussion, taken from the noise source -------------------------------------
  {
    id: 'm32-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'voice',
    title: 'Noise snare with the oscillator roughened underneath it',
    routing: `${PLAYED}. MIX sits toward the noise end with enough oscillator left to hear the FM. The role exists on this box because Moog printed a METAL SNARE patch for it (p.64)`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 72,
        cutoff: 1800,
        darkness: -600,
        resonance: 58,
        mode: 'LOW PASS',
        volume: 76,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('EG', '+', 46),
      ...eg(0, 'OFF', 12, 'EG'),
      glide(0),
    ],
    articulation: [
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      { slot: 'fill', set: { ratchet: 3 }, hint: 'ratchet' },
    ],
    patch: [
      cable(
        'OUT · NOISE',
        'IN · VCO LIN FM',
        'Noise into linear FM breaks up the pitched part of the hit; the noise still reaches the mixer normalled (p.48)',
      ),
    ],
    verified: false,
  },
  {
    id: 'm32-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'voice',
    title: 'Pitched tom with a shallow fall and a little noise on the front',
    routing: `${PLAYED}. A shallower VCO MOD AMOUNT than the kick wants — the fall is a tom's, not a drop`,
    params: [
      ...voice({
        freq: 0,
        freqDarkness: -12,
        wave: 'SAW',
        mix: 18,
        cutoff: 420,
        darkness: -140,
        resonance: 44,
        mode: 'LOW PASS',
        volume: 78,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 22),
      ...vcfMod('EG', '+', 30),
      ...eg(0, 'OFF', 26, 'EG'),
      glide(0),
    ],
    articulation: [{ slot: 'fill', set: { ratchet: 2 }, hint: 'ratchet' }],
    patch: [
      cable('OUT · KB', 'IN · VCF CUTOFF', 'Higher toms open the filter with the pitch'),
    ],
    verified: false,
  },
  {
    id: 'm32-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    title: 'Hi-passed noise chopped by a fast square',
    routing: `${PLAYED}. RESONANCE stays at zero: p.14 warns that resonance in HI PASS "will reintroduce bottom end into a sound"`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 100,
        cutoff: 2600,
        darkness: -900,
        resonance: 0,
        mode: 'HI PASS',
        volume: 72,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 0),
      ...vcfMod('EG', '+', 34),
      ...lfo(42, 'SQUARE', { mood: [{ axis: 'density', amount: 18 }] }),
      ...eg(0, 'OFF', 18, 'EG'),
      glide(0),
    ],
    patch: [
      cable('OUT · LFO SQ', 'IN · VCF CUTOFF', 'A square at forty-odd hertz gates the noise into a rattle'),
    ],
    verified: false,
  },
  {
    id: 'm32-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'voice',
    title: 'Audio-rate square into linear FM, then hi-passed',
    routing: `${PLAYED}. p.13 says the LFO "is also capable of audio-rate modulation" and p.49 offers LIN FM for exactly that; neither page instructs this cable, so it is ours`,
    params: [
      ...voice({
        freq: 10,
        wave: 'PULSE',
        pulseWidth: 12,
        pulseWidthGrit: 10,
        mix: 0,
        cutoff: 3200,
        darkness: -1100,
        resonance: 52,
        mode: 'HI PASS',
        volume: 72,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 0),
      ...vcfMod('EG', '+', 26),
      ...lfo(210, 'SQUARE', { note: 'Well above the sub-audio range — the knob reaches about 350 Hz' }),
      ...eg(0, 'OFF', 16, 'EG'),
      glide(0),
    ],
    articulation: [{ slot: 'last-hit', set: { ratchet: 4 }, hint: 'ratchet' }],
    patch: [
      cable('OUT · LFO SQ', 'IN · VCO LIN FM', 'Audio-rate FM: the inharmonic clang is the whole part'),
    ],
    verified: false,
  },
  {
    id: 'm32-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'One-shot impact: noise across the front, pitch dropping behind it',
    routing: `${PLAYED}. VCA MODE stays on EG so the hit ends by itself`,
    params: [
      ...voice({
        freq: 0,
        freqDarkness: -12,
        wave: 'SAW',
        mix: 64,
        cutoff: 700,
        darkness: -240,
        resonance: 66,
        mode: 'LOW PASS',
        volume: 80,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 52),
      ...vcfMod('EG', '+', 40),
      ...eg(0, 'OFF', 34, 'EG'),
      glide(0),
    ],
    articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
    patch: [
      cable('OUT · NOISE', 'IN · VCO LIN FM', 'Noise on the oscillator turns the drop into a crash'),
    ],
    verified: false,
  },

  // ---- long parts, played with the amplifier held open -----------------------------
  {
    id: 'm32-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Drone with the VC mixer crossfading an LFO against the envelope on the cutoff',
    routing: `${PLAYED}. VCA MODE ON, so this sounds without a gate (p.16). The VC MIX knob is the crossfade between the two modulators, and it is the control to move while listening`,
    params: [
      ...voice({
        freq: 0,
        wave: 'PULSE',
        pulseWidth: 40,
        pulseWidthGrit: 10,
        mix: 40,
        cutoff: 900,
        darkness: -350,
        resonance: 30,
        mode: 'LOW PASS',
        volume: 66,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 22),
      ...vcfMod('LFO', '+', 0),
      ...lfo(0.3, 'TRIANGLE', { mood: [{ axis: 'space', amount: -0.2 }] }),
      ...eg(60, 'ON', 70, 'ON'),
      travel('VC MIX', 50, { note: 'Counterclockwise is MIX 1, clockwise is MIX 2' }),
      glide(0),
    ],
    patch: [
      cable('OUT · LFO TRI', 'IN · MIX 1', 'Replaces the 0 V normalled to MIX 1 (p.50)'),
      cable('OUT · EG', 'IN · MIX 2', 'Replaces the nominal +5 V normalled to MIX 2 (p.50)'),
      cable('OUT · VC MIX', 'IN · VCF CUTOFF', 'The crossfaded result drives the cutoff'),
    ],
    verified: false,
  },
  {
    id: 'm32-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'voice',
    title: 'Long resonant sweep drawn by the envelope rather than the panel',
    routing: `${PLAYED}. VCA MODE ON and VCF MOD AMOUNT at zero: the sweep arrives entirely over the cable, so the panel modulation path stays free`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 30,
        cutoff: 180,
        darkness: -60,
        resonance: 70,
        mode: 'LOW PASS',
        volume: 70,
      }),
      ...vcoMod('LFO', 'PULSE WIDTH', 0),
      ...vcfMod('EG', '+', 0),
      ...eg(82, 'ON', 86, 'ON'),
      glide(0),
    ],
    patch: [
      cable('OUT · EG', 'IN · VCF CUTOFF', 'The sweep itself, summed with the CUTOFF knob (p.48)'),
    ],
    verified: false,
  },
  {
    id: 'm32-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    title: 'Pitch and filter climbing together off one envelope, split by the mult',
    routing: `${PLAYED}. The pitch climb is the normalled EG at VCO MOD (p.49), so the mult is free to take the same envelope to two filter destinations. p.51 restricts the mult to CV, which is what this is`,
    params: [
      ...voice({
        freq: 0,
        wave: 'SAW',
        mix: 34,
        cutoff: 300,
        darkness: -100,
        resonance: 56,
        mode: 'LOW PASS',
        volume: 70,
      }),
      ...vcoMod('EG / VCO MOD', 'FREQUENCY', 68),
      ...vcfMod('EG', '+', 0),
      ...eg(90, 'ON', 90, 'ON'),
      glide(0),
    ],
    patch: [
      cable('OUT · EG', 'IN · MULT', 'One envelope, two destinations'),
      cable('OUT · MULT 1', 'IN · VCF CUTOFF', 'The cutoff opening with the pitch'),
      cable('OUT · MULT 2', 'IN · VCF RES.', 'Resonance rising with it, so the top of the climb screams'),
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/**
 * **One voice.** p.70's specifications open `POLYPHONY: Monophonic`, and that sentence is the
 * whole basis for `polyphony: 1` — not an inference from the panel, which is the mistake the
 * Cascadia's manifest warns about.
 *
 * `pad` and `stab` are declared anyway, and both have recipes. A Mother-32 stab is a real sound;
 * it is a one-note one. Declaring the role is what makes a three-note request report the
 * *shortfall* ("needs 3 notes") instead of the much stronger "nothing in your rig plays this
 * part" — the Subsequent 37's reasoning, on a box with a third of the polyphony.
 *
 * **`snare` is declared where the CRAVE's manifest reasons its way out of it**, and the reason is
 * the document rather than a different judgement about the hardware. Both boxes are one
 * monophonic voice with one envelope; only one of them has a factory patch called `METAL SNARE`
 * printed in its manual (p.64). Moog authored a snare on this instrument, so the role is not a
 * claim this library is making on its own.
 *
 * **`pad` is declared where the CRAVE's is not**, and that difference is hardware. The CRAVE's
 * envelope is `ADS` with no release at all; this one has a SUSTAIN switch and a DECAY that serves
 * as the release — "the Attack stage immediately moves to the Decay stage when complete, or when
 * a note is released" (p.16) — so a pad's tail exists here.
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
  'acid',
  'riser',
  'impact',
  'sweep',
]

/**
 * Roles this box is **not** offered for, since a list invites the question. `arp` — there is no
 * arpeggiator; a 32-step sequencer is not one, and nothing in the manual claims it is. `vox-chop`
 * — no sampler and no audio memory of any kind. `clap`, `rim`, `ghost-perc`, `closed-hat`,
 * `open-hat`, `ride` — one monophonic voice with one envelope cannot hold a hat part and anything
 * else at once, and the noise source that would make them is the one `noise`, `snare` and
 * `texture` already claim.
 */

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'moog-mother-32',
  name: 'Mother-32',
  maker: 'Moog',
  kind: 'semi-modular',

  /**
   * **Receives** clock two ways and **sends** it one way, and the two sets do not overlap — which
   * the two direction lists below now state outright, where a comment used to have to.
   *
   * *Receive.* p.54: "Mother-32 can follow its own internal clock, an external clock signal
   * connected to the TEMPO input jack, or a MIDI clock signal arriving at the MIDI IN port", and
   * p.55's priority rules rank them — internal, then MIDI, then analog on top. Follow MIDI Clock
   * is on in the factory defaults (p.61).
   *
   * *Send.* Only as pulses at `OUT · ASSIGN`: p.52's source 2 is "CLOCK (Default) … a 0 to +5V
   * Clock signal at the internal clock tempo, one pulse per step", and Setup page 5 sets the
   * outgoing PPQN (p.60). There is no MIDI output on the instrument — p.70's MIDI block is one
   * line, `INPUT: Din Jack` — so nothing leaves over `midi-din`, and there is no USB port at all.
   *
   * `preferredSource` is **not** claimed, and the pages that look like the evidence for it are
   * recorded in `capabilityEvidence` below rather than in this sentence (§2.6/#120).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    /**
     * The union of the two lists below, which is what `transport` means: every wire this box
     * carries clock on, in either direction. Neither direction speaks both.
     */
    transport: ['midi-din', 'analog-clock'],
    /** Pulses at `OUT · ASSIGN`, and nothing else. There is no MIDI output on the instrument. */
    sendTransport: ['analog-clock'],
    /** MIDI clock at `MIDI IN` (p.54), an analog clock at `IN · TEMPO` (p.55). */
    receiveTransport: ['midi-din', 'analog-clock'],
    /**
     * §7.4/#104. The clock leaves by a jack that does fifteen other things, so where that switch
     * lives is exactly what this field is for — even though the factory setting is already the
     * clock. A reader whose ASSIGN is on MIDI CC 1 gets silence otherwise.
     */
    sourceSetup: [
      {
        transport: 'analog-clock',
        path: 'SETUP > PAGE 1: ASSIGNABLE OUTPUT JACK',
        value: '2: Sequencer Clock (Default)',
        note: 'Setup mode opens on (SHIFT) + RESET + SET END + STEP 8. Page 5 sets the outgoing PPQN; the factory value is 4, a sixteenth note',
      },
    ],
  },

  /**
   * Rear panel, p.70: one 1/4" TS `AUDIO / HEADPHONE` jack, and nothing else but power and a
   * Kensington slot. One output, so `mono`. `individualOuts: 0` — the patchbay is covered in
   * outputs but they are modular-level patch points rather than a channel per part, and this box
   * carries one part in any case. `audioIn: true` is the `EXT. AUDIO` patch point (p.47).
   * `usbAudio: false`, and not because USB carries only MIDI here: there is no USB port.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 319.3 mm across, from p.70's DIMENSIONS row, cheeks included.
   *
   * **The row's axis letters are wrong and the drawing is what settles it.** p.70 reads
   * `SIZE (W x D x H cm): 31.93 x 10.69 (including knob elevation) x 13.3`, which makes 10.69 cm
   * the depth and 13.3 cm the height. The panel figure measures 2.356 wide to tall, against
   * 319.3/133 = 2.401 and 319.3/106.9 = 2.987 — so the face is 319.3 x 133 and the 106.9 is how
   * far the box stands off the desk. `panel.ts` carries the working.
   *
   * This is the third time in this library a stated dimension has meant something other than it
   * appears to, and it is a *third* way of being wrong: the Tracker Mini's 170 mm is a vertical
   * span called a width, the Cascadia's 348 mm silently includes wood cheeks, and here two axis
   * letters are simply swapped. The lesson is not any one of the three; it is that only the
   * drawing is reliable.
   */
  physical: {
    panelSpanMm: 319.3,
    verified: cite(70),
  },

  /** §10. A simplified original drawing of the panel, read off p.68 (see `panel.ts`). */
  panel: MOTHER_32_PANEL,

  /** §3.3. Declared once, cited once, referenced by every cable above. */
  /**
   * §10/#263. **Warm-up**, cited. p.9: *"Mother-32 is an analog instrument and should be allowed a few minutes to warm up before
   * use"*. No `minutes`, for the reason the Subharmonicon's entry gives: the manual declines to
   * put a number on it and so does this.
   *
   * The rig is what makes this worth carrying: a reader sees which of the boxes in front of them
   * need the time, and no single manual can tell them that.
   */
  warmUp: {
    note: 'A few minutes from cold before it holds pitch',
    verified: cite(9),
  },

  /**
   * §10/#263. **A pointer, not a procedure.** This is service work and the manual says so; see the
   * `Calibration` type for why the steps are deliberately not here.
   */
  calibration: {
    summary: 'VCO offset and gain trims, through four holes in the front panel with the supplied tool',
    caution:
      'Moog say the internal tuning trimpots are not designed for unlimited use, and to calibrate only when it is absolutely necessary. The instrument leaves the factory calibrated',
    verified: cite(62),
  },

  jacks: JACKS,

  /**
   * §2.6/#22. Every jack above, cited on the page that describes it, plus four facts that are
   * not jacks.
   *
   * **`clock.preferredSource` is `unknown`, and the two pages that look like its evidence are
   * named there rather than left for the next reader to rediscover.** This is a box that could
   * plausibly claim the field — it has a sequencer, an internal clock, and a clock output on by
   * default — so the non-claim is a decision rather than an omission.
   *
   * p.9's ABOUT MOTHER-32 is the sentence that nearly does it: "Mother-32 is the ideal foundation
   * for any analog sequencing or compositional studio, as well as a bedrock for live performers."
   * Read against the two claims the library already holds, it falls on the other side. The Tracker
   * Mini's cited sentence is about a *position in a rig* — "the centre piece of a setup" — where
   * this one is about the instrument's place in a studio, and the paragraph it opens goes on about
   * the sound engine and the patchbay rather than about driving anything. The manual has no
   * chapter about clocking external gear, and its table of contents has no entry for one.
   *
   * The concrete facts all point at a socket rather than at a job, and §7.4 rules that out
   * explicitly: `OUT · ASSIGN` leaves the factory set to the sequencer clock (p.59, p.61) and
   * Setup page 5 sets its PPQN (p.60), which is what a `canSendClock` page says and no more.
   *
   * So `unknown` — read, and the document does not answer the question — and not `cited-against`,
   * which is for a document that answers *no*: p.9 leans the other way, it simply does not get
   * there. Nothing here rests on the tie-break either way, and §7.4 will say so in the guide's own
   * words: nothing in the rig claims that job, so transport, then name, settled it.
   *
   * `features.sidechain.*` is the other reading: this box takes external audio and has no envelope
   * follower, so nothing on it can duck to what is coming in, and no page discusses it either way.
   */
  /**
   * §2.6/#142. **A length you set per step, and it is a fraction of the step rather than a
   * duration.** p.25: *"Gate Length is set per-step and determines the duration that a note is
   * held relative to the length of its step (from 1/8 - 8/8)"* — and the top of the travel is a
   * tie: *"the longest duration (clockwise) acts as a 'Tie'. This means that a note is held
   * through to the next step."*
   *
   * The unit is the whole point of writing it out rather than saying "gate length". A hook asking
   * for eight bars cannot be entered as a number here; it is eight bars of tied steps, and a
   * reader who is told the field exists and not what it is measured in will look for a value that
   * does not exist. `per-note-value` rather than `tied-steps` because there *is* a per-step value
   * with a stated range — the tie is one end of it, not the only gesture.
   *
   * **`SUSTAIN` rides with it, and the manual bolds the pairing itself** on the same page:
   * *"IMPORTANT: Make sure the SUSTAIN switch is set to ON for different Gate Lengths to sound
   * correctly."* It is not a second scale in CLAUDE.md's sense — it does not change what 5/8
   * means — but a gate length entered with that switch off does not sound, so printing the value
   * without it is printing an instruction that fails silently at the machine. It travels in the
   * unit because that is what reaches the reader; the page carries both.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'GATE LENGTH',
    unit:
      'eighths of its own step, 1/8 to 8/8 — full clockwise ties it to the next, ' +
      'and `SUSTAIN` must be ON for any of it to sound',
  },

  capabilityEvidence: {
    noteDuration: cite(25),
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.9’s ABOUT MOTHER-32 calls this box "the ideal foundation for any analog sequencing or compositional studio, as well as a bedrock for live performers", which is its place in a studio rather than its job in a rig’s topology — the Tracker Mini’s claim is cited to a sentence about being "the centre piece of a setup", and this is not that sentence. Everything concrete points at a socket instead: OUT · ASSIGN leaves the factory set to the sequencer clock (p.59, p.61) with its PPQN on Setup page 5 (p.60), and §7.4 does not admit a canSendClock page here. There is no chapter about driving external gear and no table-of-contents entry for one, so no page states what this box is for in a rig',
    },
    'clock.sourceSetup[analog-clock]': cite(59),
    voices: cite(70),
    'features.perStep': cite(24),
    'features.lfo': cite(13),
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at EXT. AUDIO (p.47) and none of the patchbay’s fourteen outputs is an envelope follower or a rectifier, so nothing here can derive a control voltage from an incoming signal and duck to it — but no page states that either way, so this is a reading of the jack list rather than an answer the document gives',
    },
  },

  /** One voice, monophonic per p.70. See `VOICE_ROLES` above for what it is offered for. */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 1 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible, and because
   * the day this box gains a second assignable is the day the two numbers stop agreeing.
   */
  comfortableVoices: 1,

  /**
   * **`perStep` is the sequencer's own list**, from p.24: while a step is being edited "you can
   * modify any of the other parameters for that step including Gate Length (note duration),
   * Accent, Rest, Tie, Glide On/Off and Ratchet count", and the same page confirms all of them are
   * "defined per-step".
   *
   * **`tie` and `gate-length` overlap and both are declared**, because p.24 lists both and p.25
   * explains why: the maximum gate length *is* a tie ("All 8 OCTAVE / LOCATION LEDs light red
   * indicating maximum Gate Length or a 'Tie'"). Collapsing them would drop a lane the manual
   * names; treating them as unrelated would let a recipe ask for both at once.
   *
   * **Four lanes are reached and two are not.** `accent`, `glide`, `ratchet` and `gate-length`
   * carry gestures below; `rest` and `tie` do not, and are declared because they are true of the
   * box rather than because a recipe uses them. Every authored slot was checked against #108's
   * reachability walk before it was written rather than after — `last-hit` is emitted for
   * `metallic` and `first-hit` for `impact`, both by exactly one direction, which is the trap that
   * check exists to catch.
   *
   * **`lfo` counts one, and it does not sync.** p.13: "The LFO has two available modulation
   * shapes: Square and Triangle", one RATE knob, one CV input, and nothing anywhere in the manual
   * about resetting or locking it to the clock — the only input in the section is a continuous
   * rate CV (p.49). The destinations are the two the panel switches reach without a cable, plus
   * everything the two waveform outputs can be patched to.
   *
   * **`sidechain` is not declared.** See `capabilityEvidence` above: there is no envelope follower
   * on this box, so the `fromExternalAudio` half cannot be true, and nothing on it ducks itself.
   */
  features: {
    perStep: ['gate-length', 'accent', 'rest', 'tie', 'glide', 'ratchet'],
    lfo: {
      count: 1,
      syncable: false,
      destinations: ['pulse-width', 'frequency', 'filter-cutoff'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    'setup-mode': 'Hold SHIFT + RESET + SET END + STEP 8',
    'assign-jack': 'Setup page 1 chooses the ASSIGN source',
    'tempo-mode': 'Setup page 3 chooses the TEMPO mode',
    'break-normal': 'A cable here replaces the default',
    'self-oscillate': 'Past 3 o’clock the filter self-oscillates',
    'sustain-legato': 'SUSTAIN ON plays legato, OFF retriggers',
    'glide-step': 'Turn GLIDE clockwise to glide a step',
    'accent-step': 'RESET / ACCENT accents the step being edited',
    ratchet: 'Hold SHIFT, turn GLIDE for 1-4',
    'gate-length': 'Turn GATE LENGTH while editing a step',
    swing: 'Hold SHIFT, turn TEMPO for swing',
  },

  manual: { title: 'Mother-32 User Manual', edition: 'Version 2' },

  recipes: RECIPES,
}
