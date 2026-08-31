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
import { SUBHARMONICON_PANEL } from './panel'

/**
 * Moog Subharmonicon — six oscillators into one filter and one VCA, two four-step sequencers,
 * four rhythm generators, and a **32-point patchbay: 17 inputs and 15 outputs** (printed p.31,
 * corroborated by p.58's PATCHBAY row).
 *
 * **Source**: `manuals/Subharmonicon_Manual.pdf`, 58 PDF pages. **The printed folio is the PDF
 * page + 1** for PDF pages 7-54, checked against three footers rather than assumed — PDF 17
 * prints 18, PDF 30 prints 31, PDF 49 prints 50. The offset is *not* constant and that is worth
 * stating: PDF p.6 is a two-folio spread carrying both 6 and 7, and from PDF p.56 the offset is
 * +2, which is where the SPECIFICATIONS at printed p.58 live. Every citation below is the
 * **printed** number, so a reader turning to it in the book lands on the right page and a reader
 * scrolling the PDF has to subtract.
 *
 * ## What this box is
 *
 * Two VCOs, each with two subharmonic oscillators tuned by an integer divider — printed p.18:
 * "The SUB 1 frequency is equal to the initial pitch of VCO 1, divided by a whole number integer
 * value from 1 to 16." Six sound sources, and printed p.21 says where they go: "The mixer sets
 * the individual levels of all six Subharmonicon sound sources. The combined signal exits the
 * mixer and enters the filter section." Printed p.23 closes it: "The combined output signal from
 * the mixer is internally wired to the input of the filter", then "Before the sound leaves your
 * Subharmonicon, it passes through the Voltage Controlled Amplifier". The signal-flow spread
 * draws exactly one MIXER, one VCF and one VCA with six lines arriving at the first.
 *
 * ## Six oscillators, one voice, `polyphony: 6` — and the caveat the field cannot carry
 *
 * §2.2: `polyphony` is **notes, never roles**, and six notes really can sound at once here. This
 * is the Matriarch's shape one number larger — one assignable, several notes inside it — and not
 * a pool, because six pool members would be six independently assignable parts and these six
 * share one filter, one amplifier and one envelope pair. #135's probe predicted the search would
 * take it, and the measurement below confirms it against the real manifest rather than the probe.
 *
 * **What `polyphony: 6` does not say is that the six pitches are free, and they are not.** Four
 * of the six are *subharmonics*: VCO 1 divided by an integer 1-16, VCO 2 divided by another.
 * A chord on this box is an undertone chord, and which chords exist is decided by the integers
 * rather than by the reader. That is the instrument — printed p.9 calls it "an intensely creative
 * semi-modular analog polyrhythmic synthesizer that uses mathematical ratios to tune its four
 * subharmonic oscillators" — and it is a constraint no field in the model expresses. So every
 * chord recipe below says it in `routing`, in the manual's own terms, rather than letting
 * `polyphony: 6` imply a triad the box may not be able to make. **Flagged rather than modelled:**
 * a "which pitches can this voice sound together" claim would be a fifth vocabulary (invariant 3)
 * built for one device.
 *
 * ## The polyrhythm, and §4.3's one grid
 *
 * #135 named this as the sharpest mismatch to expect: two sequencers running independent
 * divisions against a step vocabulary that assumes one grid. What the reading found is narrower
 * than that and worth stating exactly.
 *
 * This box's own grid is **four steps** (printed p.26: "Each sequencer features four individual
 * steps"), advanced not by a clock but by any or all of four rhythm generators, each dividing the
 * tempo by an integer 1-16 (printed p.30). A sequencer with no generator assigned does not play
 * at all: "In order for a sequencer to play, it must receive clock information from at least one
 * of the rhythm generators" (p.26).
 *
 * **The collision §4.3 would have had does not happen, because the layer that would collide is
 * one this device never touches.** Step *placement* is the template's (§4.3), and a device's only
 * step-addressed contribution is `articulation`, addressed by `PatternSlot`. This box has no
 * per-step dynamic lane of any kind — the only per-step control is a pitch knob (p.26) — so it
 * authors no articulation at all, and nothing here ever names a step. See `features.perStep`.
 *
 * **What is left is a real limit and it is stated in prose, where the model has no field for it.**
 * A template's sixteen-step pattern is not something this box can be made to play; four steps and
 * an integer divider are what it has. So every recipe's `routing` says what the dividers are set
 * to and that the pattern above is the target they are aimed at. That is the DFAM's answer —
 * "Plays its own 8-step analog sequencer" — with more to say, because there are four dividers
 * rather than one tempo knob.
 *
 * ## Numbers: this manual prints a great many, and that is unusual
 *
 * Six controls carry a printed range, so six are mood-legal (§3.1's legality gate):
 *
 *  - `VCO 1 FREQ` / `VCO 2 FREQ` — p.18: "The range of this knob is four octaves. Rotating the
 *    VCO 1 FREQ knob fully counter-clockwise will specify the initial pitch as Middle C (262 Hz)
 *    on a piano. Rotating this knob fully clockwise will specify the initial pitch as the highest
 *    C (4186 Hz) on a piano." p.19 repeats it word for word for VCO 2.
 *  - `SUB n FREQ` — the integer divider, 1 to 16 (pp.18, 19, 20).
 *  - `CUTOFF` — p.23: "This knob sets the Cutoff Frequency for the Filter, from 20 Hz to 20k Hz."
 *  - `VCF ATTACK` / `VCA ATTACK` — p.24: "with a range of 1 millisecond to 10 seconds".
 *  - `VCF DECAY` / `VCA DECAY` — p.24 and p.25: "a range of 5 milliseconds to 10 seconds".
 *  - `RHYTHM 1-4` — p.30: "Rotating this knob chooses an integer value from 1 (fully clockwise)
 *    to 16 (fully counter-clockwise)."
 *
 * Everything else is a knob with a tick ring and no printed scale — the six mixer levels,
 * `RESONANCE` and `VOLUME` — so those are `travel()`, provisional on both claims and deaf to
 * mood. `VCF EG AMT` is `bipolar()`: p.24 says "In the center position, the VCF EG has no effect.
 * Positive (+) values will cause the VCF EG to open the filter on the Attack stage", and the
 * panel silkscreens `(–)` and `(+)` at its ends — the only ± marking on any knob here.
 *
 * **The pitch knobs are authored in hertz and the note is still the reader's.** A recipe places
 * the register, because a sub sits low and a lead sits high and that is a patch decision; which
 * note it is belongs to the direction's key, and the manual's own patch sheets say so in the same
 * words — "Sequencer pitches are suggestions; adjust to taste" (p.45), "Tune SEQ 1 and SEQ 2 to
 * desired pitches" (p.49).
 *
 * ## The factory patch sheets are a citable source, and only for some of the knobs
 *
 * Printed pp.45-49 are **ten named patch sheets** — AQUATIC CHORDS, MELLOW HARMONIES, SLIP &
 * FALL, POINT ZERO, THREE HANDS ON THE WHEEL, BATERIA, SPIRAL WAYS, STAR-GATE, POLY ROCK, CLOUD
 * PATH — each a full panel drawing with every pointer, every lit button, every LED and every
 * patch cable drawn in. p.45 says what they are for: "Use these presets as a starting point for
 * your explorations." Two recipes below are read off one each, so their cables carry the page and
 * so do some of their knobs.
 *
 * **Which knobs, and why not the rest.** A drawn pointer is a documented position on a control
 * whose scale is *linear travel* — the six mixer levels, `RESONANCE`, `VOLUME` — and those take
 * the sheet's citation through `travel()`. It is **not** a documented figure on a control whose
 * scale is a taper the manual never prints: `CUTOFF` at a fifth of its travel is not 4 kHz, and
 * a decay knob at a third is not 3.3 seconds. Converting one would be a number nobody stated,
 * dressed in a page. The integer knobs — the four `SUB FREQ` and the four `RHYTHM` — are a third
 * case and are also uncited: their drawn pointers do not land on tick centres, which the sheets
 * themselves explain ("Tune all Subharmonic Oscillators to desired interval", p.46). Only a
 * pointer at a mechanical stop is unambiguous there, because p.18 and p.30 both name the stops.
 *
 * **The sheets are patch sheets and not audio, so `content` stays silent** (§2.6/#111). It is
 * worth saying because a named, enumerated list of ten is exactly the shape `enumerable` was
 * built for, and this is not it: nothing here loads a sample, no recipe carries `sourceAudio`,
 * and a box whose voices generate their own sound was never asked the question. The twelve pages
 * that follow, printed pp.50-55, are blank sheets for the reader's own patches.
 *
 * ## Two switches whose scale another control replaces
 *
 * CLAUDE.md's warning about a cited range being the *wrong* range applies here twice, and both
 * are handled the way the TR-8S and the minilogue xd handle theirs — by carrying the other
 * control in the recipe so the pairing cannot come apart:
 *
 *  - **`QUANTIZE` replaces the `VCO n FREQ` scale.** p.18: "Engaging the QUANTIZE settings will
 *    limit the available values for the VCO 1 FREQ knob to the specific scale steps set by the
 *    current value of the QUANTIZE button." A frequency in hertz is only a continuous frequency
 *    with QUANTIZE off, so every recipe carries `QUANTIZE` beside the two `FREQ` knobs.
 *  - **`SEQ OCT` replaces the STEP knobs' scale.** p.28 gives it three positions — ±5, ±2, ±1
 *    octaves per step — and p.26 says "The behavior of the individual STEP knobs is also
 *    determined by the current setting of the QUANTIZE button and the SEQ OCT button". No recipe
 *    authors a STEP value, but every one states `SEQ OCT`, because how far a step may swing is
 *    the difference between a bass line and an arpeggio.
 *
 * ## Three things this box does not have, each read rather than assumed
 *
 * **No noise source.** p.58's `SOURCES` row enumerates the sound engine — "VCO 1, SUB 1, SUB 2 /
 * VCO 2, SUB 1, SUB 2" — and there is no noise generator anywhere on the panel or in the
 * document. The DFAM's snares come out of its white noise; there is none here, so `snare` and
 * `noise` are not offered. See `VOICE_ROLES`.
 *
 * **No audio input.** p.31 enumerates all seventeen inputs and not one of them accepts audio;
 * the closest is `IN · VCA`, a control voltage summed with the VCA envelope (p.33). This is the
 * first Moog semi-modular in the library with no external audio path at all — the Mother-32 has
 * `EXT. AUDIO` and the DFAM has `EXT AUDIO`.
 *
 * **No MIDI output and no USB.** p.31's output column has no MIDI entry, the rear panel is one
 * 1/4" jack, a barrel connector and a Kensington slot (p.8), and the string "USB" does not occur
 * in the document. MIDI arrives at a 3.5 mm `MIDI IN` through the supplied five-pin DIN adapter
 * (p.37) and leaves nowhere.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by **printed** page — which is the PDF page + 1 here. See the header note. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Subharmonicon Manual, p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared patch point (§3.3). The page is where the manual describes *this jack*.
 *
 * Generic in `Id` for the Cascadia's reason: the obvious `(id: string)` signature widens every id
 * the moment it is written, which would make `SubJack` below `string` and turn `cable()`'s
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
 * §3.3. All thirty-two patch points, each cited on the page that describes it.
 *
 * The whole patchbay is declared rather than the subset the recipes reach for: a partial list
 * reads as a claim that the rest do not exist, and p.31 states the complement exactly —
 * "Subharmonicon contains a total of 32 patch points. Of these, 17 are inputs, identified by
 * normal text on the panel. The remaining 15 are outputs, indicated by reversed-color text over
 * an inverse background." p.58's PATCHBAY row says the same in three lines. The order below is
 * the panel's own, read across each of the eight rows in turn off the drawing on printed p.50 and
 * cross-checked against the chapter's own `ROW ONE`..`ROW EIGHT` headings.
 *
 * The `IN ·` / `OUT ·` prefix is that legend, and it is doing real work here rather than being a
 * convention copied from the DFAM: **five labels appear twice on this panel** — `VCA`, `CLOCK`,
 * `VCO 1`, `VCO 2` and `TRIGGER` each exist as both an input and an output — and the only thing
 * the silkscreen distinguishes them by is reversed lettering. A bare `VCA` would be unresolvable
 * standing at the machine and ambiguous in a patch entry.
 *
 * **`IN · MIDI IN` takes the prefix where its siblings' `MIDI IN` does not**, and the difference
 * is the panel rather than a change of mind. The Mother-32, Grandmother and Matriarch all
 * declare a bare `MIDI IN`, and that manifest says why: it is a front-panel 5-pin DIN rather than
 * a patchbay point. This box has no DIN socket at all. Its MIDI arrives at a 3.5 mm jack in row
 * eight of the patchbay itself, through the adapter in the box (p.37), so it sits under the
 * `IN / OUT` legend with the other thirty-one and is qualified like them.
 *
 * ## Voice control: never a source, and a target on the wrong socket
 *
 * §3.3's pass pairs a section's `pitch-cv` socket with its `gate` socket, where both are
 * *single-purpose*. Under the `IN ·` / `OUT ·` legend the whole patchbay is two sections, and the
 * two directions come out differently.
 *
 * **No source bundle, and that is simply true of the box.** The outputs offer two sole `pitch-cv`
 * sockets, `OUT · SEQ 1` and `OUT · SEQ 2`, and **no sole `gate` output at all** — `OUT · TRIGGER`
 * is a trigger (p.37), and the three clock outputs are clocks. So this box is never proposed as a
 * rig's voice-control source, which is right: nothing here emits a note gate.
 *
 * **A target bundle does form, and it lands on `IN · PLAY`.** This is the DFAM's finding a second
 * time, in a different box's shape, and it is recorded rather than engineered away. `IN · VCO 1`
 * and `IN · VCO 2` are both sole `pitch-cv`, so `bundles()` takes the first by code unit; the
 * section's only sole `gate` input is `IN · PLAY`, because `IN · TRIGGER` is a trigger (p.35) and
 * `IN · RESET` carries two kinds. So a rig with a sequencer in it is told to patch pitch into
 * `IN · VCO 1` and gate into `IN · PLAY` — a cable that works, and under a sentence that oversells
 * it. The gate starts and stops the sequencer (p.34: "A gate signal received here will toggle the
 * status of the PLAY button"); what actually sounds the notes is the rhythm generators, and no
 * external gate reaches them.
 *
 * **Nothing here is declared for the effect it has on that pass.** `IN · PLAY` is a gate because
 * p.34 calls it one, `IN · TRIGGER` is a trigger because p.35 does, and adding a second kind to
 * either to break the pairing would be a manifest lying about a socket to steer a consumer. The
 * DFAM's note reaches the same conclusion from the same corner and says the fix is not a
 * manifest's to make; two boxes hitting it is the evidence that the rule wants a look, not that
 * either box is authored wrong.
 *
 * What makes it survivable is the same thing that makes it survivable there: **the relationship
 * this box really has with a rig is a clock cable**, and §7.4 decides that one. p.38 clocks a DFAM
 * from `OUT · CLOCK`, p.39 clocks this box from a Mother-32 into `IN · CLOCK`, and the manual
 * gives the two directions equal weight.
 */
const JACKS = [
  // -- row one -----------------------------------------------------------------------
  jack('IN · VCO 1', 'in', ['pitch-cv'], 31, {
    note: '1 V/octave, summed with the VCO 1 FREQ knob and Sequencer 1’s STEP knobs. Normalled onward to VCO 2 until a cable lands in IN · VCO 2. -5 V to +5 V',
  }),
  jack('IN · VCO 1 SUB', 'in', ['cv'], 31, {
    note: 'Chooses the 1-16 divider for both of VCO 1’s subharmonics. Centre both SUB FREQ knobs first, for bipolar control. -5 V to +5 V',
  }),
  jack('IN · VCO 1 PWM', 'in', ['cv'], 32, {
    note: 'Pulse width of VCO 1 and its two subharmonics; needs the square wave. A cable here replaces the normalled SUB 1 sawtooth. -5 V to +5 V',
  }),
  jack('OUT · VCA', 'out', ['audio'], 32, {
    note: 'The whole instrument at Eurorack level, after the VCA. 10 V peak to peak',
  }),

  // -- row two -----------------------------------------------------------------------
  jack('OUT · VCO 1', 'out', ['audio', 'cv'], 32, {
    note: 'VCO 1 direct, before the mixer. The manual’s own row heading is AUDIO/CV OUTPUT, so it is a sound source or a modulation source. 10 V peak to peak',
  }),
  jack('OUT · VCO 1 SUB 1', 'out', ['audio', 'cv'], 32, {
    note: 'VCO 1’s first subharmonic, before the mixer. 10 V peak to peak',
  }),
  jack('OUT · VCO 1 SUB 2', 'out', ['audio', 'cv'], 32, {
    note: 'VCO 1’s second subharmonic, before the mixer. 10 V peak to peak',
  }),
  jack('IN · VCA', 'in', ['cv'], 33, {
    note: 'Summed with the VCA EG rather than replacing it, so it raises and lowers the output level. 0 V to +8 V',
  }),

  // -- row three ---------------------------------------------------------------------
  jack('IN · VCO 2', 'in', ['pitch-cv'], 33, {
    note: '1 V/octave, summed with the VCO 2 FREQ knob and Sequencer 2’s STEP knobs. A cable here breaks the normal from IN · VCO 1. -5 V to +5 V',
  }),
  jack('IN · VCO 2 SUB', 'in', ['cv'], 33, {
    note: 'Chooses the 1-16 divider for both of VCO 2’s subharmonics. Centre both SUB FREQ knobs first. -5 V to +5 V',
  }),
  jack('IN · VCO 2 PWM', 'in', ['cv'], 33, {
    note: 'Pulse width of VCO 2 and its two subharmonics. A cable here replaces the normalled sawtooth. -5 V to +5 V',
  }),
  jack('OUT · VCA EG', 'out', ['cv'], 33, {
    note: 'A copy of the amplitude envelope. 0 V to +8 V',
  }),

  // -- row four ----------------------------------------------------------------------
  jack('OUT · VCO 2', 'out', ['audio', 'cv'], 34, {
    note: 'VCO 2 direct, before the mixer. 10 V peak to peak',
  }),
  jack('OUT · VCO 2 SUB 1', 'out', ['audio', 'cv'], 34, {
    note: 'VCO 2’s first subharmonic, before the mixer. 10 V peak to peak',
  }),
  jack('OUT · VCO 2 SUB 2', 'out', ['audio', 'cv'], 34, {
    note: 'VCO 2’s second subharmonic, before the mixer. 10 V peak to peak',
  }),
  jack('IN · CUTOFF', 'in', ['cv'], 34, {
    note: 'With the CUTOFF knob centred this sweeps the filter through ±5 octaves. -5 V to +5 V',
  }),

  // -- row five ----------------------------------------------------------------------
  jack('IN · PLAY', 'in', ['gate'], 34, {
    note: 'Toggles the PLAY button — rising edge starts, falling edge stops. The button still works by hand and overrides it. 0 V to +10 V',
  }),
  jack('IN · RESET', 'in', ['trigger', 'gate'], 35, {
    note: 'A trigger resets both sequencers to Step 1 and the rhythm generators to their starting phase; a held gate is a Hold, and the envelopes keep firing. 0 V to +10 V',
  }),
  jack('IN · TRIGGER', 'in', ['trigger'], 35, {
    note: 'Starts both envelopes. They will not restart while either is in its Attack stage. 0 V to +10 V',
  }),
  jack('OUT · VCF EG', 'out', ['cv'], 35, {
    note: 'A copy of the filter envelope. 0 V to +8 V',
  }),

  // -- row six -----------------------------------------------------------------------
  jack('IN · RHYTHM 1', 'in', ['cv'], 35, {
    note: 'Sets the 1-16 divider of rhythm generator 1. Centre the RHYTHM 1 knob for the widest range. -5 V to +5 V',
  }),
  jack('IN · RHYTHM 2', 'in', ['cv'], 35, {
    note: 'Sets the 1-16 divider of rhythm generator 2. Centre the RHYTHM 2 knob for the widest range. -5 V to +5 V',
  }),
  jack('IN · RHYTHM 3', 'in', ['cv'], 36, {
    note: 'Sets the 1-16 divider of rhythm generator 3. Centre the RHYTHM 3 knob for the widest range. -5 V to +5 V',
  }),
  jack('IN · RHYTHM 4', 'in', ['cv'], 36, {
    note: 'Sets the 1-16 divider of rhythm generator 4. Centre the RHYTHM 4 knob for the widest range. -5 V to +5 V',
  }),

  // -- row seven ---------------------------------------------------------------------
  jack('OUT · SEQ 1', 'out', ['pitch-cv'], 36, {
    note: 'Sequencer 1’s current step as a pitch voltage, respecting QUANTIZE and SEQ OCT. Hold either button until it flashes to de-couple this jack from it. -5 V to +5 V',
  }),
  jack('OUT · SEQ 1 CLK', 'out', ['clock'], 36, {
    note: 'A clock at Sequencer 1’s own polyrhythmic tempo. p.38 offers it as a way to clock a DFAM with a polyrhythm rather than with the beat. 0 V to +5 V',
  }),
  jack('OUT · SEQ 2', 'out', ['pitch-cv'], 36, {
    note: 'Sequencer 2’s current step as a pitch voltage, respecting QUANTIZE and SEQ OCT. -5 V to +5 V',
  }),
  jack('OUT · SEQ 2 CLK', 'out', ['clock'], 37, {
    note: 'A clock at Sequencer 2’s own polyrhythmic tempo. 0 V to +5 V',
  }),

  // -- row eight ---------------------------------------------------------------------
  jack('IN · MIDI IN', 'in', ['midi', 'clock'], 37, {
    clock: ['midi-din'],
    note: 'A 3.5 mm socket fed by the supplied five-pin DIN adapter (MIDI Type A). Takes clock, note data and CCs. MIDI clock overrides the internal clock *and* anything at IN · CLOCK',
  }),
  jack('IN · CLOCK', 'in', ['clock'], 37, {
    clock: ['analog-clock'],
    note: 'One rising edge per pulse, overriding the internal clock and the TEMPO knob. This is the hole p.39 patches a Mother-32 into. 0 V to +10 V',
  }),
  jack('OUT · CLOCK', 'out', ['clock'], 37, {
    clock: ['analog-clock'],
    note: 'Whatever clock is currently in force — internal, analog or MIDI — and only while PLAY is lit. This is the hole p.38 clocks a DFAM from. 0 V to +10 V',
  }),
  jack('OUT · TRIGGER', 'out', ['trigger'], 37, {
    note: 'A 1 ms pulse every time the envelopes fire, from the sequencers or from the TRIGGER button. 0 V to +5 V',
  }),
  // `satisfies` rather than `as const`, which is the Mother-32's idiom and matters twice: it
  // type-checks every entry against `JackSpec` here, where the error points at the offending
  // jack, and it leaves the array mutable so the manifest can assign it without a cast.
] satisfies JackSpec[]

/** Every declared jack id, as a union of literals, so `cable()` catches a typo at compile time. */
export type SubJack = (typeof JACKS)[number]['id']

// ---------------------------------------------------------------------------
// Parameter helpers (§3.1, §3.2)
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
 * it. Only three controls on this panel are in this state — the six mixer levels, `RESONANCE`
 * and `VOLUME` — which is unusually few, because this manual prints ranges for almost everything
 * else.
 *
 * **`where` is for the one case where a knob position is not taste**: the ten factory patch
 * sheets on printed pp.45-49 draw every pointer, so a position read off one of them is a
 * *documented* position and carries the page. It applies to these controls and to no others —
 * see the header's note on why a pointer angle cannot become a figure in hertz or milliseconds.
 */
function travel(
  name: string,
  value: number,
  extra: Partial<AuthoredNumericParam> & { where?: Cite } = {},
): AuthoredNumericParam {
  const { where, ...rest } = extra
  return {
    kind: 'numeric',
    name,
    value,
    unit: '% travel',
    range: { min: 0, max: 100, verified: false },
    verified: where ?? false,
    ...rest,
  }
}

/**
 * A **bipolar** knob position, as percent of travel either side of a detented centre.
 *
 * `VCF EG AMT` is the only knob on this panel drawn this way, and p.24 is why: "In the center
 * position, the VCF EG has no effect. Positive (+) values will cause the VCF EG to open the
 * filter on the Attack stage, and close the filter on the Decay stage. Inverse (–) values will
 * close the filter during the Attack stage". The panel silkscreens `(–)` and `(+)` at its ends.
 * `0` is centre and means *no envelope on the filter at all*, which is a setting worth being able
 * to write exactly rather than approximating as "50% travel".
 */
function bipolar(
  name: string,
  value: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    unit: '% travel from centre',
    range: { min: -100, max: 100, verified: false },
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
 * `false`; the cables the manual's own patch sheets and notes instruct carry the page.
 */
function cable(from: SubJack, to: SubJack, note: string, instructedOn?: number): PatchEntry {
  return { from, to, note, verified: instructedOn === undefined ? false : cite(instructedOn) }
}

// ---------------------------------------------------------------------------
// Option sets (§3.2) — every one printed on the panel and explained on a page
// ---------------------------------------------------------------------------

/**
 * p.19, p.20. **The panel prints waveform glyphs rather than words**, so the option values are
 * the manual's names for the switch positions: "In the UP position…", "In the MIDDLE position…",
 * "In the DOWN position…". Naming them `SQUARE` and `SAW` would read better and would be a name
 * this instrument does not use, and the middle position is neither — it is a square VCO with two
 * sawtooth subharmonics, one of which is normalled to its pulse width. The `wave-switch` hint is
 * what tells a reader which glyph is which.
 */
const WAVE = ['UP', 'MIDDLE', 'DOWN'] as const

/**
 * p.21. Four LEDs and an all-off state, and the page names all five: "There are four quantized
 * settings… With all LEDs off, no Quantization value is selected, and the Quantize function is
 * off." The four values are the panel's own silkscreen.
 */
const QUANTIZE = ['12-ET', '8-ET', '12-JI', '8-JI', 'OFF'] as const

/** p.28. Three LEDs, printed exactly like this: five, two or one octave either side per step. */
const SEQ_OCT = ['±5', '±2', '±1'] as const

/**
 * p.30, and p.9's feature callout. Each rhythm generator has two buttons under it, `SEQ 1` and
 * `SEQ 2`, and either, both or neither may be lit: "Each rhythm generator can be set to drive a
 * single sequencer – or both." `LIT` and `UNLIT` are the manual's own words for the two states
 * ("Engaging this button (lit)…").
 */
const BUTTON = ['LIT', 'UNLIT'] as const

// ---------------------------------------------------------------------------
// Cited ranges (§3.1) — six controls, which is unusually many
// ---------------------------------------------------------------------------

/**
 * p.18: "The range of this knob is four octaves. Rotating the VCO 1 FREQ knob fully
 * counter-clockwise will specify the initial pitch as Middle C (262 Hz) on a piano. Rotating this
 * knob fully clockwise will specify the initial pitch as the highest C (4186 Hz) on a piano."
 * p.19 repeats it for VCO 2.
 *
 * **This is the *initial* pitch, and only with QUANTIZE off** — see the header. Every recipe
 * carries `QUANTIZE` so the pairing cannot come apart.
 */
const VCO_HZ = { min: 262, max: 4186 }

/** pp.18, 19, 20: "divided by a whole number integer value from 1 to 16". 1 is unison. */
const SUB_DIV = { min: 1, max: 16 }

/** p.23: "This knob sets the Cutoff Frequency for the Filter, from 20 Hz to 20k Hz." */
const CUTOFF_HZ = { min: 20, max: 20000 }

/** p.24: both attack knobs, "with a range of 1 millisecond to 10 seconds". */
const ATTACK_MS = { min: 1, max: 10000 }

/** p.24 (VCF) and p.25 (VCA): "a range of 5 milliseconds to 10 seconds". */
const DECAY_MS = { min: 5, max: 10000 }

/** p.30: "an integer value from 1 (fully clockwise) to 16 (fully counter-clockwise)". */
const RHYTHM_DIV = { min: 1, max: 16 }

// ---------------------------------------------------------------------------
// The panel, as one block of controls
// ---------------------------------------------------------------------------

type Wave = (typeof WAVE)[number]
type Quantize = (typeof QUANTIZE)[number]
type SeqOct = (typeof SEQ_OCT)[number]
type Button = (typeof BUTTON)[number]

type VoiceOpts = {
  /** Oscillator 1: initial pitch in hertz, waveform, and its two integer subharmonic dividers. */
  freq1: number
  wave1: Wave
  sub1a: number
  sub1b: number
  /** Oscillator 2. Defaults to the same waveform and unison dividers, silent at the mixer. */
  freq2?: number
  wave2?: Wave
  sub2a?: number
  sub2b?: number
  /** The mixer's six channels, in panel order. Anything omitted is down. */
  lvlVco1: number
  lvlSub1a?: number
  lvlSub1b?: number
  lvlVco2?: number
  lvlSub2a?: number
  lvlSub2b?: number
  /** The filter. `darkness` is a mood offset on `CUTOFF`, in hertz. */
  cutoff: number
  darkness?: number
  resonance?: number
  /** The two AD envelopes. `space` offsets `VCA DECAY`, `vcfSpace` offsets `VCF DECAY`, both ms. */
  vcfAttack: number
  vcfDecay: number
  vcfSpace?: number
  vcfEgAmt?: number
  vcaAttack: number
  vcaDecay: number
  space?: number
  volume?: number
  /** Shared by both oscillators and both sequencers, and both change other controls' scales. */
  quantize: Quantize
  seqOct: SeqOct
  /** Which of each sequencer's three destination buttons are lit. Order: OSC, SUB 1, SUB 2. */
  assign1: [Button, Button, Button]
  assign2?: [Button, Button, Button]
  /** The four tempo dividers, and which sequencer each advances. `density` offsets all four. */
  rhythm: [number, number, number, number]
  density?: number
  /** Per generator, the two buttons beneath it: `[SEQ 1, SEQ 2]`. */
  drives: [[Button, Button], [Button, Button], [Button, Button], [Button, Button]]
  /**
   * The factory patch sheet this recipe is read off, when it is one. Cites the *untapered* knob
   * positions — the six levels, `RESONANCE`, `VOLUME` — and nothing else. See `travel()`.
   */
  sheet?: Cite
}

/**
 * The panel in one call, in the order a reader works across it: oscillators, mixer, filter,
 * envelopes, output, then the sequencer and polyrhythm settings that decide when any of it
 * sounds.
 *
 * Every recipe emits the full set rather than the subset it cares about, because this is a patch
 * to be dialled at the machine from wherever the previous patch left the knobs — §8 is read
 * standing at the box, and a parameter list that silently means "leave that one alone" is a list
 * that produces a different sound for every reader. On this panel that is **forty-two controls** —
 * twenty-four knobs, two switches and sixteen buttons — which is a long list and is the
 * instrument: none of them recalls a setting, because there is no memory anywhere in a 100%
 * analog signal path (p.45).
 *
 * **Fourteen of the panel's fifty-six controls are deliberately not here**, and each for a
 * reason that belongs to another layer. The eight `STEP` knobs are pitch and pitch is the
 * direction's (§4.3), `TEMPO` is the song's (#167), and `RESET`, `EG`, `NEXT`, `PLAY` and
 * `TRIGGER` are performance rather than patch — a guide that told a reader to press PLAY would
 * be authoring the moment they start.
 */
function voice(o: VoiceOpts): AuthoredParam[] {
  const assign2 = o.assign2 ?? o.assign1
  /** Present only on the two recipes read off a factory patch sheet. */
  const sheet = o.sheet === undefined ? {} : { where: o.sheet }
  return [
    // -- oscillator 1 -----------------------------------------------------------------
    num('VCO 1 FREQ', o.freq1, VCO_HZ, cite(18), { unit: 'Hz', hint: 'tune-pitch' }),
    pick('VCO 1 WAVE', o.wave1, WAVE, cite(19), { hint: 'wave-switch' }),
    num('SUB 1 FREQ (VCO 1)', o.sub1a, SUB_DIV, cite(18), { hint: 'sub-divider' }),
    num('SUB 2 FREQ (VCO 1)', o.sub1b, SUB_DIV, cite(19), { hint: 'sub-divider' }),

    // -- oscillator 2 -----------------------------------------------------------------
    num('VCO 2 FREQ', o.freq2 ?? o.freq1, VCO_HZ, cite(19), { unit: 'Hz', hint: 'tune-pitch' }),
    pick('VCO 2 WAVE', o.wave2 ?? o.wave1, WAVE, cite(20), { hint: 'wave-switch' }),
    num('SUB 1 FREQ (VCO 2)', o.sub2a ?? 1, SUB_DIV, cite(20), { hint: 'sub-divider' }),
    num('SUB 2 FREQ (VCO 2)', o.sub2b ?? 1, SUB_DIV, cite(20), { hint: 'sub-divider' }),

    // -- the mixer: six sources into one filter ---------------------------------------
    travel('VCO 1 LEVEL', o.lvlVco1, sheet),
    travel('SUB 1 LEVEL (VCO 1)', o.lvlSub1a ?? 0, sheet),
    travel('SUB 2 LEVEL (VCO 1)', o.lvlSub1b ?? 0, sheet),
    travel('VCO 2 LEVEL', o.lvlVco2 ?? 0, sheet),
    travel('SUB 1 LEVEL (VCO 2)', o.lvlSub2a ?? 0, sheet),
    travel('SUB 2 LEVEL (VCO 2)', o.lvlSub2b ?? 0, sheet),

    // -- filter and amplifier ---------------------------------------------------------
    num('CUTOFF', o.cutoff, CUTOFF_HZ, cite(23), {
      unit: 'Hz',
      ...(o.darkness === undefined ? {} : { mood: [{ axis: 'darkness', amount: o.darkness }] }),
    }),
    travel('RESONANCE', o.resonance ?? 20, {
      ...sheet,
      ...((o.resonance ?? 20) >= 85 ? { hint: 'self-oscillate' } : {}),
    }),
    num('VCF ATTACK', o.vcfAttack, ATTACK_MS, cite(24), { unit: 'ms' }),
    num('VCF DECAY', o.vcfDecay, DECAY_MS, cite(24), {
      unit: 'ms',
      ...(o.vcfSpace === undefined ? {} : { mood: [{ axis: 'space', amount: o.vcfSpace }] }),
    }),
    bipolar('VCF EG AMT', o.vcfEgAmt ?? 0),
    num('VCA ATTACK', o.vcaAttack, ATTACK_MS, cite(24), { unit: 'ms' }),
    num('VCA DECAY', o.vcaDecay, DECAY_MS, cite(25), {
      unit: 'ms',
      hint: 'decay-length',
      ...(o.space === undefined ? {} : { mood: [{ axis: 'space', amount: o.space }] }),
    }),
    travel('VOLUME', o.volume ?? 70, sheet),

    // -- shared: the two buttons that replace other controls' scales -------------------
    pick('QUANTIZE', o.quantize, QUANTIZE, cite(21)),
    pick('SEQ OCT', o.seqOct, SEQ_OCT, cite(28)),

    // -- what each sequencer's four steps move ----------------------------------------
    pick('SEQ 1 ASSIGN · OSC 1', o.assign1[0], BUTTON, cite(26)),
    pick('SEQ 1 ASSIGN · SUB 1', o.assign1[1], BUTTON, cite(26)),
    pick('SEQ 1 ASSIGN · SUB 2', o.assign1[2], BUTTON, cite(26)),
    pick('SEQ 2 ASSIGN · OSC 2', assign2[0], BUTTON, cite(27)),
    pick('SEQ 2 ASSIGN · SUB 1', assign2[1], BUTTON, cite(27)),
    pick('SEQ 2 ASSIGN · SUB 2', assign2[2], BUTTON, cite(27)),

    // -- the polyrhythm: four dividers, and which sequencer each advances --------------
    ...o.rhythm.flatMap((divider, i): AuthoredParam[] => {
      const [toSeq1, toSeq2] = o.drives[i] as [Button, Button]
      return [
        num(`RHYTHM ${i + 1}`, divider, RHYTHM_DIV, cite(30), {
          ...(o.density === undefined ? {} : { mood: [{ axis: 'density', amount: o.density }] }),
          ...(i === 0 ? { hint: 'rhythm-divider' } : {}),
        }),
        pick(`RHYTHM ${i + 1} · SEQ 1`, toSeq1, BUTTON, cite(30)),
        pick(`RHYTHM ${i + 1} · SEQ 2`, toSeq2, BUTTON, cite(30)),
      ]
    }),
  ]
}

/** Both buttons under a rhythm generator dark: the generator is running and drives nothing. */
const IDLE: [Button, Button] = ['UNLIT', 'UNLIT']
const TO_SEQ_1: [Button, Button] = ['LIT', 'UNLIT']
const TO_SEQ_2: [Button, Button] = ['UNLIT', 'LIT']
const TO_BOTH: [Button, Button] = ['LIT', 'LIT']

/** Sequencer step knobs moving the oscillator's pitch and nothing else — the ordinary case. */
const PITCH_ONLY: [Button, Button, Button] = ['LIT', 'UNLIT', 'UNLIT']
/** Step knobs moving the oscillator *and* its first subharmonic, so the interval walks. */
const PITCH_AND_SUB_1: [Button, Button, Button] = ['LIT', 'LIT', 'UNLIT']
/** Step knobs moving only the dividers: the root stays put and the chord inverts under it. */
const SUBS_ONLY: [Button, Button, Button] = ['UNLIT', 'LIT', 'LIT']

/**
 * How this box is driven, said once per recipe and then extended by each one.
 *
 * §7.4's cable is `IN · CLOCK` or `IN · MIDI IN`; what happens after it arrives is this box's
 * own business, and it is four dividers rather than a step grid. See the header.
 */
const CLOCKED =
  'Clock it at IN · CLOCK, or over MIDI at IN · MIDI IN, which overrides both the internal clock and the analog one. Its own grid is four steps advanced by the RHYTHM dividers, so the pattern above is what to aim them at rather than something the box can play literally'

/**
 * §1. Fourteen roles, and the two that are missing are missing for a reason worth stating.
 *
 * **`snare` and `noise` are not offered, because this box has no noise source.** p.58's `SOURCES`
 * row is a complete enumeration of the sound engine — "VCO 1, SUB 1, SUB 2 / VCO 2, SUB 1,
 * SUB 2" — and six oscillators is all of it. The DFAM's snares come out of its white noise
 * generator through a high-pass filter; there is no noise generator here and no high-pass mode,
 * only the 4-pole ladder low-pass (p.23). A snare made of detuned square waves would be a claim
 * this box cannot keep.
 *
 * **`kick` and `tom` are offered, and the manual is the reason rather than optimism.** Printed
 * p.47's BATERIA patch sheet is a factory preset whose own NOTES read "Kick drum tuning is
 * controlled via filter CUTOFF. Adjust VCF DECAY and EG AMT knobs for different kick drum
 * flavors" — the ladder filter pinged by its own envelope, which is a drum the box demonstrably
 * makes.
 *
 * `pad` and `stab` are here on `polyphony: 6`, with the undertone caveat in the header and in
 * each chord recipe's `routing`.
 */
const VOICE_ROLES: Role[] = [
  'kick',
  'sub',
  'bass-mid',
  'tom',
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

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * §4.3/#108. **The only articulation this box can make, and it is a pitch rather than a level.**
 *
 * There is no velocity lane, no accent button and no ghost lane anywhere on this instrument —
 * p.26 enumerates a step as "a variable tuning knob and an LED" and that is all of it. So an
 * accent here is not a louder step, because nothing can make one; it is the step taken up an
 * octave, which is exactly the range `SEQ OCT` at ±1 gives every step (p.28).
 *
 * **It goes only on the recipes where the sequencer is actually driving pitch**, which is what
 * `SEQ 1 ASSIGN · OSC 1` decides. On the two drum recipes and on `subh-impact-hard` every assign
 * button is dark and the steps move nothing, and on `subh-texture-soft` and
 * `subh-metallic-bright` they move the dividers instead — a pitch gesture on any of those would
 * be an instruction with no subject. `subh-sub-dark` and `subh-arp-bright` are left out for
 * #108's reason rather than a musical one: no direction requesting those pairs emits `accent`.
 *
 * **`subh-acid-dirty` was in that second list and is not any more.** Its `SEQ 1 ASSIGN` is lit on
 * pitch and sub 1, so it always passed the musical test above; what it lacked was a direction. The
 * day one arrived that requests `acid` and emits `accent` in every band, the exclusion had nothing
 * left holding it up — which is the whole shape of #108's rule working in the direction nobody
 * writes down: a slot goes dead when the last direction stops emitting it, and comes alive when
 * the first one starts. Nothing about the box changed.
 */
const ACCENT_OCTAVE = {
  slot: 'accent' as const,
  set: { pitch: '+1 octave' },
  hint: 'accent-octave',
}

/** Said by every recipe that stacks more than two sources. See the header on `polyphony: 6`. */
const UNDERTONE =
  'The chord is an undertone chord: every note under the two VCOs is that VCO divided by a whole number, so the SUB FREQ integers decide which chord exists. If the direction wants an interval these dividers cannot make, move a VCO rather than forcing a divider'

const RECIPES: Recipe[] = [
  // ---- low ---------------------------------------------------------------------------
  {
    id: 'subh-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Two octaves under the oscillator, with the oscillator itself muted',
    routing: `${CLOCKED}. The VCO is silent at the mixer and only its subharmonics are heard — SUB 1 at ÷4 is two octaves down, SUB 2 at ÷8 is three. That is how this box reaches below its own 262 Hz floor (p.18)`,
    params: voice({
      freq1: 262,
      wave1: 'UP',
      sub1a: 4,
      sub1b: 8,
      lvlVco1: 0,
      lvlSub1a: 88,
      lvlSub1b: 34,
      cutoff: 180,
      darkness: -70,
      resonance: 14,
      vcfAttack: 4,
      vcfDecay: 220,
      vcfSpace: 70,
      vcfEgAmt: 8,
      vcaAttack: 6,
      vcaDecay: 280,
      space: 90,
      volume: 72,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      rhythm: [4, 8, 16, 16],
      density: -3,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    title: 'Square bass an octave down, filter tracking just above the fundamental',
    routing: `${CLOCKED}. SUB 1 at ÷2 puts the body one octave under the VCO and the VCO is left in the mix under it, so the line has an upper edge to filter`,
    params: voice({
      freq1: 294,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 4,
      lvlVco1: 40,
      lvlSub1a: 82,
      lvlSub1b: 22,
      cutoff: 520,
      darkness: -180,
      resonance: 28,
      vcfAttack: 3,
      vcfDecay: 180,
      vcfSpace: 60,
      vcfEgAmt: 20,
      vcaAttack: 4,
      vcaDecay: 210,
      space: 60,
      volume: 72,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      rhythm: [4, 8, 16, 16],
      density: -3,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Both oscillators and three subharmonics pushed into the mixer',
    routing: `${CLOCKED}. p.21: "The mixer can be pushed into a warm distortion by setting the sound sources near their maximum levels" — here that is the point, and five channels are near the top. ${UNDERTONE}`,
    params: voice({
      freq1: 294,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 3,
      freq2: 296,
      wave2: 'UP',
      sub2a: 2,
      sub2b: 6,
      lvlVco1: 86,
      lvlSub1a: 92,
      lvlSub1b: 74,
      lvlVco2: 80,
      lvlSub2a: 88,
      cutoff: 760,
      darkness: -240,
      resonance: 44,
      vcfAttack: 2,
      vcfDecay: 150,
      vcfSpace: 45,
      vcfEgAmt: 28,
      vcaAttack: 2,
      vcaDecay: 190,
      space: 50,
      volume: 66,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [4, 4, 16, 16],
      density: -3,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'The ladder filter self-oscillating, opened by a sequencer clock',
    routing: `${CLOCKED}. This is the BATERIA patch sheet (p.47) read off its own drawing: every mixer level is fully down, RESONANCE is fully up, and what you hear is the filter's own oscillation gated by a clock. The sheet's NOTES are the tuning instruction — "Kick drum tuning is controlled via filter CUTOFF. Adjust VCF DECAY and EG AMT knobs for different kick drum flavors"`,
    patch: [
      cable(
        'OUT · SEQ 2 CLK',
        'IN · VCA',
        'Sequencer 2’s own polyrhythm opens the amplifier — this is what makes the drum, since no oscillator reaches the mixer',
        47,
      ),
      cable(
        'OUT · SEQ 1 CLK',
        'IN · CUTOFF',
        'Sequencer 1’s clock kicks the filter, so the drum is pitched by a pulse rather than by a note',
        47,
      ),
      cable(
        'OUT · SEQ 1',
        'IN · RHYTHM 1',
        'The sequencer sets its own divider, so the pattern walks its rate instead of repeating',
        47,
      ),
      cable(
        'OUT · SEQ 2',
        'IN · RHYTHM 2',
        'The same feedback on the second generator, which is what keeps the two sides from locking',
        47,
      ),
    ],
    params: voice({
      sheet: cite(47),
      freq1: 262,
      wave1: 'UP',
      sub1a: 1,
      sub1b: 1,
      sub2a: 1,
      sub2b: 1,
      lvlVco1: 0,
      cutoff: 62,
      darkness: -20,
      resonance: 100,
      vcfAttack: 1,
      vcfDecay: 95,
      vcfSpace: 25,
      vcfEgAmt: 60,
      vcaAttack: 1,
      vcaDecay: 130,
      space: 30,
      volume: 100,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: ['UNLIT', 'UNLIT', 'UNLIT'],
      rhythm: [8, 4, 1, 16],
      density: -3,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, TO_SEQ_1],
    }),
    verified: false,
  },
  {
    id: 'subh-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'voice',
    title: 'The same filter ping, tuned up and given a longer tail',
    routing: `${CLOCKED}. The kick's trick at a higher CUTOFF and a longer VCF DECAY, which is what p.47 means by "different kick drum flavors" — one control decides the pitch of the drum`,
    params: voice({
      freq1: 262,
      wave1: 'UP',
      sub1a: 3,
      sub1b: 6,
      lvlVco1: 18,
      lvlSub1a: 30,
      cutoff: 165,
      darkness: -45,
      resonance: 88,
      vcfAttack: 1,
      vcfDecay: 240,
      vcfSpace: 70,
      vcfEgAmt: 48,
      vcaAttack: 1,
      vcaDecay: 260,
      space: 80,
      volume: 72,
      quantize: 'OFF',
      seqOct: '±1',
      assign1: ['UNLIT', 'UNLIT', 'UNLIT'],
      rhythm: [8, 16, 16, 16],
      density: -4,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    verified: false,
  },

  // ---- tonal: the chords this box exists to make -------------------------------------
  {
    id: 'subh-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'voice',
    title: 'All six sources up, the filter crescendoing under them',
    routing: `${CLOCKED}. Read off the SPIRAL WAYS patch sheet (p.48), whose NOTES give the two intervals in the manual's own words: "Tune SUB VCO 1 FREQ 1 to a Fifth. Tune SUB VCO 2 SUB 2 to a Major 3rd." In the undertone series those are the ÷3 and ÷5 dividers, and "Adjust VCF ATTACK for crescendo depth" is the sheet's own instruction for how far the filter travels. ${UNDERTONE}`,
    patch: [
      cable(
        'OUT · VCF EG',
        'IN · RHYTHM 1',
        'The filter envelope bends the first divider, so the chord’s own swell decides how fast it re-voices',
        48,
      ),
    ],
    params: voice({
      sheet: cite(48),
      freq1: 330,
      wave1: 'DOWN',
      sub1a: 3,
      sub1b: 4,
      freq2: 392,
      wave2: 'DOWN',
      sub2a: 2,
      sub2b: 5,
      lvlVco1: 60,
      lvlSub1a: 60,
      lvlSub1b: 60,
      lvlVco2: 64,
      lvlSub2a: 100,
      lvlSub2b: 100,
      cutoff: 420,
      darkness: -140,
      resonance: 35,
      vcfAttack: 2400,
      vcfDecay: 1600,
      vcfSpace: 700,
      vcfEgAmt: 72,
      vcaAttack: 900,
      vcaDecay: 4800,
      space: 2200,
      volume: 100,
      quantize: '8-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [12, 16, 1, 1],
      density: -4,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'voice',
    title: 'A low undertone chord with the ladder almost shut over it',
    routing: `${CLOCKED}. Both VCOs sit near the bottom of their four octaves and the chord is built entirely underneath them, so the filter has very little above the fundamentals to remove. ${UNDERTONE}`,
    params: voice({
      freq1: 262,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 3,
      freq2: 311,
      wave2: 'UP',
      sub2a: 2,
      sub2b: 6,
      lvlVco1: 44,
      lvlSub1a: 74,
      lvlSub1b: 58,
      lvlVco2: 40,
      lvlSub2a: 70,
      lvlSub2b: 46,
      cutoff: 280,
      darkness: -110,
      resonance: 22,
      vcfAttack: 1600,
      vcfDecay: 2400,
      vcfSpace: 900,
      vcfEgAmt: 34,
      vcaAttack: 1200,
      vcaDecay: 5200,
      space: 2400,
      volume: 74,
      quantize: '8-JI',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [16, 12, 1, 1],
      density: -4,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-pad-bright',
    role: 'pad',
    character: 'bright',
    voice: 'voice',
    title: 'Chord voiced high, with the sequencers moving the dividers under a fixed root',
    routing: `${CLOCKED}. SEQ 1 ASSIGN leaves OSC 1 dark and lights both SUB buttons, which p.26 describes exactly: the step knobs move "the integer value of SUB 1" while the VCO holds. The root stays put and the chord inverts underneath it, which is a voicing this box can do and a keyboard cannot. ${UNDERTONE}`,
    params: voice({
      freq1: 880,
      wave1: 'DOWN',
      sub1a: 2,
      sub1b: 3,
      freq2: 1046,
      wave2: 'DOWN',
      sub2a: 3,
      sub2b: 5,
      lvlVco1: 52,
      lvlSub1a: 66,
      lvlSub1b: 52,
      lvlVco2: 48,
      lvlSub2a: 62,
      lvlSub2b: 44,
      cutoff: 3400,
      darkness: -900,
      resonance: 30,
      vcfAttack: 700,
      vcfDecay: 1800,
      vcfSpace: 600,
      vcfEgAmt: 46,
      vcaAttack: 600,
      vcaDecay: 3600,
      space: 1600,
      volume: 70,
      quantize: '12-JI',
      seqOct: '±1',
      assign1: SUBS_ONLY,
      assign2: SUBS_ONLY,
      rhythm: [8, 12, 1, 1],
      density: -3,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    title: 'The whole chord through a fast envelope and a hard filter edge',
    routing: `${CLOCKED}. Both envelopes at their 1 ms attack (p.24), a short VCA decay, and the filter opened hard by the envelope rather than by the CUTOFF knob. ${UNDERTONE}`,
    params: voice({
      freq1: 440,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 3,
      freq2: 523,
      wave2: 'UP',
      sub2a: 2,
      sub2b: 5,
      lvlVco1: 66,
      lvlSub1a: 72,
      lvlSub1b: 58,
      lvlVco2: 62,
      lvlSub2a: 68,
      lvlSub2b: 50,
      cutoff: 620,
      darkness: -220,
      resonance: 48,
      vcfAttack: 1,
      vcfDecay: 140,
      vcfSpace: 45,
      vcfEgAmt: 78,
      vcaAttack: 1,
      vcaDecay: 180,
      space: 60,
      volume: 76,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [4, 4, 1, 1],
      density: -2,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-stab-dirty',
    role: 'stab',
    character: 'dirty',
    voice: 'voice',
    title: 'Six channels near maximum, so the mixer clips before the filter sees it',
    routing: `${CLOCKED}. p.21: "The mixer can be pushed into a warm distortion by setting the sound sources near their maximum levels." All six are, and the two VCOs are two hertz apart so the chord beats against itself. ${UNDERTONE}`,
    params: voice({
      freq1: 392,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 3,
      freq2: 394,
      wave2: 'MIDDLE',
      sub2a: 2,
      sub2b: 5,
      lvlVco1: 92,
      lvlSub1a: 96,
      lvlSub1b: 88,
      lvlVco2: 94,
      lvlSub2a: 90,
      lvlSub2b: 84,
      cutoff: 1100,
      darkness: -380,
      resonance: 56,
      vcfAttack: 1,
      vcfDecay: 170,
      vcfSpace: 55,
      vcfEgAmt: 64,
      vcaAttack: 1,
      vcaDecay: 220,
      space: 70,
      volume: 62,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [4, 3, 1, 1],
      density: -2,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'One oscillator high, a fifth under it, filter well open',
    routing: `${CLOCKED}. VCO 2 is down at the mixer, so the line is a single voice with its ÷3 subharmonic a twelfth below to give it body. SEQ OCT at ±2 lets the four steps cover four octaves (p.28)`,
    params: voice({
      freq1: 1046,
      wave1: 'DOWN',
      sub1a: 3,
      sub1b: 6,
      lvlVco1: 86,
      lvlSub1a: 34,
      lvlSub1b: 12,
      cutoff: 5200,
      darkness: -1600,
      resonance: 38,
      vcfAttack: 6,
      vcfDecay: 320,
      vcfSpace: 110,
      vcfEgAmt: 52,
      vcaAttack: 4,
      vcaDecay: 380,
      space: 140,
      volume: 74,
      quantize: '12-ET',
      seqOct: '±2',
      assign1: PITCH_ONLY,
      rhythm: [2, 16, 1, 1],
      density: -1,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-lead-soft',
    role: 'lead',
    character: 'soft',
    voice: 'voice',
    title: 'Sawtooth line with a slow filter attack behind every note',
    routing: `${CLOCKED}. The VCF envelope is slower than the VCA's, so each note arrives dull and opens after it — p.24's Attack range starts at 1 ms and reaches 10 seconds, and this sits well inside it`,
    params: voice({
      freq1: 698,
      wave1: 'DOWN',
      sub1a: 2,
      sub1b: 4,
      lvlVco1: 74,
      lvlSub1a: 42,
      lvlSub1b: 18,
      cutoff: 1400,
      darkness: -520,
      resonance: 26,
      vcfAttack: 380,
      vcfDecay: 900,
      vcfSpace: 320,
      vcfEgAmt: 40,
      vcaAttack: 90,
      vcaDecay: 700,
      space: 300,
      volume: 70,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      rhythm: [4, 16, 1, 1],
      density: -2,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },
  {
    id: 'subh-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'voice',
    title: 'Two sequencers on coprime dividers, one playing both oscillators',
    routing: `${CLOCKED}. This is the polyrhythm doing the arpeggio: RHYTHM 1 at ÷3 advances Sequencer 1 and RHYTHM 2 at ÷4 advances Sequencer 2, so the two four-step figures realign every twelve. The cable is p.26's own example — SEQ 1 into VCO 2 — which puts one sequencer's pitch on both oscillators while the other keeps its own`,
    patch: [
      cable(
        'OUT · SEQ 1',
        'IN · VCO 2',
        'p.26: "connecting the SEQ 1 output jack to the VCO 2 input jack would allow Sequencer 1 to modify the pitch of VCO 2". A cable here also breaks the normal from IN · VCO 1',
        26,
      ),
    ],
    params: voice({
      freq1: 523,
      wave1: 'DOWN',
      sub1a: 2,
      sub1b: 4,
      freq2: 659,
      wave2: 'DOWN',
      sub2a: 3,
      sub2b: 6,
      lvlVco1: 70,
      lvlSub1a: 46,
      lvlVco2: 64,
      lvlSub2a: 40,
      cutoff: 3600,
      darkness: -1100,
      resonance: 34,
      vcfAttack: 2,
      vcfDecay: 210,
      vcfSpace: 70,
      vcfEgAmt: 58,
      vcaAttack: 1,
      vcaDecay: 190,
      space: 65,
      volume: 72,
      quantize: '12-ET',
      seqOct: '±2',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [3, 4, 1, 1],
      density: -2,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    title: 'Ladder filter near self-oscillation, envelope opening it every step',
    routing: `${CLOCKED}. p.23 is the whole patch: "Pushing the RESONANCE level to its maximum and lowering the CUTOFF value can cause the filter to self-oscillate." This sits just under that, so the resonance sings without taking over, and VCF EG AMT does the rest`,
    params: voice({
      freq1: 330,
      wave1: 'UP',
      sub1a: 2,
      sub1b: 4,
      lvlVco1: 88,
      lvlSub1a: 56,
      cutoff: 340,
      darkness: -120,
      resonance: 86,
      vcfAttack: 1,
      vcfDecay: 190,
      vcfSpace: 60,
      vcfEgAmt: 84,
      vcaAttack: 1,
      vcaDecay: 210,
      space: 70,
      volume: 74,
      quantize: '12-ET',
      seqOct: '±1',
      assign1: PITCH_AND_SUB_1,
      rhythm: [2, 16, 1, 1],
      density: -1,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    articulation: [ACCENT_OCTAVE],
    verified: false,
  },

  // ---- body ---------------------------------------------------------------------------
  {
    id: 'subh-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Very slow dividers, a long filter swell, nothing arriving on a beat',
    routing: `${CLOCKED}. Both generators are near ÷16, so the four steps take a long time to come round and the part reads as a drift rather than a figure. The cable feeds the filter envelope back into a divider, which is SLIP & FALL's and SPIRAL WAYS' shared trick (pp.46, 48). ${UNDERTONE}`,
    patch: [
      cable(
        'OUT · VCF EG',
        'IN · RHYTHM 1',
        'The swell moves its own divider, so the texture never settles into a period',
        48,
      ),
    ],
    params: voice({
      freq1: 262,
      wave1: 'MIDDLE',
      sub1a: 2,
      sub1b: 5,
      freq2: 349,
      wave2: 'MIDDLE',
      sub2a: 3,
      sub2b: 7,
      lvlVco1: 38,
      lvlSub1a: 52,
      lvlSub1b: 44,
      lvlVco2: 34,
      lvlSub2a: 48,
      lvlSub2b: 40,
      cutoff: 620,
      darkness: -240,
      resonance: 42,
      vcfAttack: 6000,
      vcfDecay: 8000,
      vcfSpace: 1800,
      vcfEgAmt: 56,
      vcaAttack: 3200,
      vcaDecay: 9000,
      space: 900,
      volume: 66,
      quantize: '8-JI',
      seqOct: '±1',
      assign1: SUBS_ONLY,
      assign2: SUBS_ONLY,
      rhythm: [14, 16, 1, 1],
      density: -5,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'voice',
    title: 'Coprime dividers ringing against each other with the filter wide open',
    routing: `${CLOCKED}. The four dividers are 5, 7, 11 and 13 against two VCOs a tone apart, so nothing in the chord shares a partial and the result is inharmonic. The cable puts a subharmonic on the other oscillator's pulse width at audio rate, which p.32 says a cable there replaces the normalled sawtooth`,
    patch: [
      cable(
        'OUT · VCO 1 SUB 2',
        'IN · VCO 2 PWM',
        'Audio-rate pulse-width modulation across the two oscillators; p.33 says this cable overrides the internal sawtooth connection',
      ),
    ],
    params: voice({
      freq1: 1318,
      wave1: 'UP',
      sub1a: 5,
      sub1b: 7,
      freq2: 1480,
      wave2: 'UP',
      sub2a: 11,
      sub2b: 13,
      lvlVco1: 54,
      lvlSub1a: 62,
      lvlSub1b: 58,
      lvlVco2: 50,
      lvlSub2a: 56,
      lvlSub2b: 52,
      cutoff: 8600,
      darkness: -2600,
      resonance: 44,
      vcfAttack: 1,
      vcfDecay: 420,
      vcfSpace: 150,
      vcfEgAmt: 40,
      vcaAttack: 1,
      vcaDecay: 460,
      space: 170,
      volume: 68,
      quantize: 'OFF',
      seqOct: '±2',
      assign1: SUBS_ONLY,
      assign2: SUBS_ONLY,
      rhythm: [3, 5, 7, 1],
      density: -2,
      drives: [TO_SEQ_1, TO_SEQ_2, TO_BOTH, IDLE],
    }),
    verified: false,
  },

  // ---- transitional (§4.2) -------------------------------------------------------------
  {
    id: 'subh-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'voice',
    title: 'A ten-second filter attack with the sequencer climbing under it',
    routing: `${CLOCKED}. p.24's Attack range tops out at 10 seconds and this uses most of it, so the section arrives as the filter does. SEQ OCT at ±5 gives the four steps the widest climb the box has (p.28)`,
    patch: [
      cable(
        'OUT · SEQ 1',
        'IN · CUTOFF',
        'The sequencer opens the filter in steps as well as playing the pitch — the AQUATIC CHORDS and STAR-GATE sheets both draw this cable',
        45,
      ),
    ],
    params: voice({
      freq1: 523,
      wave1: 'DOWN',
      sub1a: 2,
      sub1b: 3,
      freq2: 659,
      wave2: 'DOWN',
      sub2a: 2,
      sub2b: 4,
      lvlVco1: 62,
      lvlSub1a: 48,
      lvlVco2: 58,
      lvlSub2a: 44,
      cutoff: 240,
      darkness: -80,
      resonance: 62,
      vcfAttack: 8000,
      vcfDecay: 600,
      vcfSpace: 200,
      vcfEgAmt: 96,
      vcaAttack: 1200,
      vcaDecay: 2400,
      space: 800,
      volume: 72,
      quantize: '12-ET',
      seqOct: '±5',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [2, 3, 1, 1],
      density: -1,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'Every source at the bottom of its range, fired once by the trigger button',
    routing: `${CLOCKED}. All four dividers are near ÷16 under low VCOs, so what lands is the bottom of the box. Hit TRIGGER by hand for the one-shot: with the EG button lit, p.28 says it "will instantly restart the envelope generators without waiting for the next step". ${UNDERTONE}`,
    params: voice({
      freq1: 262,
      wave1: 'UP',
      sub1a: 8,
      sub1b: 12,
      freq2: 277,
      wave2: 'UP',
      sub2a: 10,
      sub2b: 16,
      lvlVco1: 30,
      lvlSub1a: 92,
      lvlSub1b: 78,
      lvlVco2: 26,
      lvlSub2a: 88,
      lvlSub2b: 72,
      cutoff: 140,
      darkness: -40,
      resonance: 34,
      vcfAttack: 1,
      vcfDecay: 900,
      vcfSpace: 300,
      vcfEgAmt: 48,
      vcaAttack: 1,
      vcaDecay: 1600,
      space: 600,
      volume: 82,
      quantize: 'OFF',
      seqOct: '±1',
      assign1: ['UNLIT', 'UNLIT', 'UNLIT'],
      rhythm: [16, 16, 1, 1],
      density: -4,
      drives: [TO_SEQ_1, IDLE, IDLE, IDLE],
    }),
    verified: false,
  },
  {
    id: 'subh-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'voice',
    title: 'The filter falling through five octaves under a held chord',
    routing: `${CLOCKED}. VCF EG AMT is inverted, so p.24's "Inverse (–) values will close the filter during the Attack stage" makes the sweep go downward instead of up. The cable adds the filter envelope to the amplifier so the level falls with it. ${UNDERTONE}`,
    patch: [
      cable(
        'OUT · VCF EG',
        'IN · VCA',
        'Summed with the VCA envelope rather than replacing it (p.33), so the chord fades as the filter closes',
      ),
    ],
    params: voice({
      freq1: 440,
      wave1: 'DOWN',
      sub1a: 2,
      sub1b: 4,
      freq2: 554,
      wave2: 'DOWN',
      sub2a: 3,
      sub2b: 6,
      lvlVco1: 48,
      lvlSub1a: 56,
      lvlSub1b: 44,
      lvlVco2: 44,
      lvlSub2a: 52,
      lvlSub2b: 40,
      cutoff: 6200,
      darkness: -1800,
      resonance: 40,
      vcfAttack: 5000,
      vcfDecay: 6000,
      vcfSpace: 1500,
      vcfEgAmt: -88,
      vcaAttack: 800,
      vcaDecay: 7000,
      space: 1800,
      volume: 68,
      quantize: '8-ET',
      seqOct: '±1',
      assign1: PITCH_ONLY,
      assign2: PITCH_ONLY,
      rhythm: [12, 16, 1, 1],
      density: -4,
      drives: [TO_SEQ_1, TO_SEQ_2, IDLE, IDLE],
    }),
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'moog-subharmonicon',
  name: 'Subharmonicon',
  maker: 'Moog',
  kind: 'semi-modular',

  /**
   * **The directions differ, so both subsets are declared** — §2.3's case for `sendTransport` and
   * `receiveTransport`, and the same asymmetry the Mother-32 has for the same reason.
   *
   * *Receive, two ways.* `IN · CLOCK`, p.37: "A clock signal received via this jack will override
   * the internal clock setting." `IN · MIDI IN`, p.37: "Subharmonicon can receive master clock
   * (TEMPO) information, note data, and various CC (Control Change) messages via MIDI… Clock
   * information from a connected MIDI source will override the internal clock setting and any
   * connected external analog clock source." p.25 states the whole precedence in one note: analog
   * beats internal, MIDI beats both.
   *
   * *Send, one way.* `OUT · CLOCK`, p.37: "The clock signal available from this jack reflects the
   * current clock source, be it internal, external, or MIDI." p.38 is a chapter using exactly
   * that jack to drive a DFAM. **There is no MIDI output anywhere on the instrument** — p.31's
   * output column has no MIDI entry, the rear panel is an audio jack, a barrel connector and a
   * Kensington slot (p.8), and the string "USB" does not occur in the document. So a rig clocked
   * over MIDI DIN can drive this box and cannot be driven by it, which is the opposite half of
   * the DFAM's problem and is stated here rather than inferred from `transport` alone.
   *
   * **No `sourceSetup`, and that is a real absence rather than an unresearched one.** #104's
   * field is for a clock output behind a setting; this one is behind nothing. p.37 attaches one
   * condition and it is a transport state rather than a setting: "The clock signal is only
   * present while the sequencer(s) are playing and the PLAY button is lit." The Mother-32's
   * identical-looking jack needs an entry because its `ASSIGN` output has sixteen possible
   * sources; this one has no such choice, and the condition is carried on the jack's own note
   * where a reader meets it.
   *
   * `preferredSource` is **not** claimed, and the three pages that look like evidence either way
   * are recorded in `capabilityEvidence` below rather than in this sentence (§2.6/#120).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    /** The union of the two lists below, which is what `transport` means (§2.3). */
    transport: ['midi-din', 'analog-clock'],
    /** A pulse at `OUT · CLOCK`, and nothing else. There is no MIDI output on the instrument. */
    sendTransport: ['analog-clock'],
    /** MIDI clock at `IN · MIDI IN` and an analog clock at `IN · CLOCK`, both p.37. */
    receiveTransport: ['midi-din', 'analog-clock'],
  },

  /**
   * **One mono output that is also the headphone socket, and no audio input at all.**
   *
   * p.58's REAR PANEL row is one audio line: `AUDIO: 1/4" TRS Headphone or 1/4" TS Instrument`.
   * p.8 has the reader "plug one end of a 1/4" instrument cable" into it and adds that the same
   * jack takes headphones, "providing the same signal to each ear" — which is why this is `mono`
   * rather than `stereo` despite the TRS. So `individualOuts: 0`.
   *
   * `OUT · VCA`, `OUT · VCO 1` and the five other audio-carrying patch points are declared jacks
   * and are *not* counted here, exactly as the Mother-32's and the DFAM's are not. An individual
   * out is a channel you take to a desk alongside the main; a 3.5 mm Eurorack-level patch point
   * is a modular connection.
   *
   * **`audioIn: false` is a positive reading rather than a silence.** p.31 enumerates all
   * seventeen inputs and not one accepts audio — the nearest, `IN · VCA`, is a control voltage
   * summed with the amplifier envelope (p.33). Both sibling semi-modulars have an external audio
   * input and this one does not.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * §10. 319.3 mm across, cheeks included — the same enclosure as the Mother-32 and the DFAM, and
   * p.9 says so: "As with Mother-32 and DFAM, Subharmonicon conforms to the 60HP Eurorack format;
   * features aluminum rails, finished wood side pieces". p.58's `SIZE (WxDxH)` gives
   * `12.57" x 4.21" x 5.24"`. The drawn unit measures 532.0000 x 225.9336 pt off the vector
   * paths of printed p.50, an aspect of 2.35467 against 2.40075 for this pair and 2.98690 for
   * the depth, so the pair is the one §2.3 asks for. See `panel.ts` for that check in full, and
   * for the second one this box's drawing allowed that the DFAM's did not: its metal panel
   * proper is faithful to 0.20% of Eurorack's 60HP x 3U.
   */
  physical: {
    panelSpanMm: 319.3,
    verified: cite(58),
  },

  /**
   * §10. A simplified original drawing of the panel, measured off printed p.50's **vector paths**
   * rather than a render of them — `pdfimages` reports no raster image on that page. See
   * `panel.ts` for the method and for what the first, rasterised, pass got wrong.
   */
  panel: SUBHARMONICON_PANEL,

  /** §3.3. Declared once, cited once, referenced by the recipes above. */
  /**
   * §10/#263. **Warm-up**, cited. p.7: *"Subharmonicon is an analog instrument and should be allowed a few minutes to warm up
   * before use"*. **"A few" is not a number and does not become one** — no `minutes` here, because
   * turning it into 5 would be a figure with no source behind it (invariant 5).
   *
   * The rig is what makes this worth carrying: a reader sees which of the boxes in front of them
   * need the time, and no single manual can tell them that.
   */
  warmUp: {
    note: 'A few minutes from cold before it holds pitch',
    verified: cite(7),
  },

  jacks: JACKS,

  /**
   * §2.6/#142. **Nothing on this box sets how long a note sounds**, and the manual settles it
   * from three directions rather than by omission.
   *
   * p.26 enumerates what a step has: "Each step includes a variable tuning knob and an LED to
   * indicate the current active step." One knob and a light — no gate, no length, no tie, no
   * rest. p.37 says what the sequencer emits: `TRIGGER/CV OUTPUT: 0V to +5V Pulse; 1
   * millisecond`, a fixed pulse carrying no duration. p.25 says what happens when one arrives:
   * "When a trigger is received, the VCA EG will complete the Attack stage, and then proceed to
   * the Decay stage." So `VCA DECAY` is the whole answer, and p.25 gives its range.
   *
   * **A gate is possible here and it never comes from the sequencer**, which is why this is
   * `trigger` rather than `gate`. p.25's next sentence — "When a gate is received, the VCA will
   * complete the Attack stage and hold at the maximum level until the gate ends" — is about a
   * gate at `IN · TRIGGER` (p.35: "Continuous high voltage = GATE") or the panel's own TRIGGER
   * button held down with the EG button unlit (p.29). Both are the reader's hand or another box,
   * not a length this instrument's pattern can carry.
   */
  noteDuration: {
    kind: 'trigger',
    reason: 'the VCA envelope decides, and `VCA DECAY` is the one knob that sets it',
  },

  /**
   * §2.6/#22. Every jack above, cited on the page that describes it, plus the scalar facts.
   *
   * **`clock.preferredSource` is `unknown`, and this box makes the reading harder than most.** It
   * has a clock output, an internal tempo and a whole chapter about driving another instrument —
   * p.38: "Use a patch cable to connect the Subharmonicon CLOCK output jack to the DFAM ADV/CLOCK
   * input jack. This will allow Subharmonicon to serve as the clock for both units." That is a
   * `canSendClock` page, which §7.4 does not admit here, and the facing page cancels the reading
   * anyway: p.39 patches a Mother-32's ASSIGN output into this box's CLOCK input, "This will
   * allow Mother-32 to serve as the clock for both units". The manual gives the two directions
   * equal weight, one page each. The nearest thing to a statement of purpose is p.9's ABOUT
   * SUBHARMONICON, and it says the box "can perform as a standalone electronic instrument" —
   * a capability rather than a job in a rig's topology, and the Tracker Mini's cited claim is
   * about being "the centre piece of a setup", which this is not.
   *
   * **`features.lfo` is `cited-against`.** p.58's ANALOG SOUND ENGINE block enumerates this
   * instrument — `SOURCES`, `FILTER`, `ENVELOPES` — and there is no modulation row and no LFO in
   * it. p.9's feature list enumerates the same instrument a second way, six callouts long, and
   * has none either. Two independent enumerations of what this box contains, neither containing
   * one, is a document answering the question rather than being silent on it. The only
   * modulation the manual names anywhere is the normalled subharmonic sawtooth on pulse width
   * (pp.19, 20), which is an audio-rate oscillator doing modulation and is not an LFO with a
   * rate anybody can set.
   *
   * **`features.sidechain` is `cited-against` on both halves**, and for once the reading is
   * simple rather than a judgement about a jack list: p.31 enumerates all seventeen inputs and
   * none of them accepts audio, so no external signal can reach this box to duck to, and p.58's
   * sound-engine block names no compressor for an internal one to live in.
   */
  capabilityEvidence: {
    ...JACK_EVIDENCE,
    noteDuration: { kind: 'manual', source: 'Moog Subharmonicon Manual, p.25, p.26, p.37' },
    'clock.canSendClock': cite(37),
    'clock.canReceiveClock': cite(37),
    'clock.transport': cite(37),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.9’s ABOUT SUBHARMONICON says the box "can perform as a standalone electronic instrument", which is a capability rather than its job in a rig’s topology — the Tracker Mini’s claim is cited to a sentence about being "the centre piece of a setup", and this is not that sentence. The two chapters about connecting it cancel each other: p.38 clocks a DFAM from OUT · CLOCK and p.39 clocks this box from a Mother-32 into IN · CLOCK, one page each and neither presented as the normal case. §7.4 does not admit a canSendClock page here, and p.38 is exactly that. There is no chapter about leading a studio and no table-of-contents entry for one, so no page states what this box is for in a rig',
    },
    'io.main': cite(58),
    'io.audioIn': cite(31),
    'io.usbAudio': cite(58),
    voices: cite(58),
    'features.perStep': cite(26),
    'features.lfo': {
      kind: 'cited-against',
      cite: cite(58),
      reason:
        'p.58’s ANALOG SOUND ENGINE block enumerates this instrument as SOURCES, FILTER and ENVELOPES with no modulation row and no LFO, and p.9’s six feature callouts enumerate it a second way with none either. The only modulation named anywhere is the subharmonic sawtooth normalled to pulse width (pp.19, 20), which is an audio-rate oscillator rather than an oscillator with a rate a reader can set',
    },
    'features.sidechain.internal': {
      kind: 'cited-against',
      cite: cite(58),
      reason:
        'p.58’s ANALOG SOUND ENGINE block is a complete enumeration of the signal path — six sources, one ladder filter, two AD envelopes — and names no compressor or level detector for an internal sidechain to live in',
    },
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      cite: cite(31),
      reason:
        'p.31 enumerates all seventeen inputs and not one of them accepts audio, so no external signal can reach this box for anything to duck to. This is a stronger reading than the Mother-32’s and the DFAM’s, which are unknown because both boxes do take external audio and the question is only whether anything derives a control voltage from it',
    },
  },

  /**
   * **One voice, six notes.** See the header for why `polyphony: 6` is the honest number and for
   * the constraint it cannot carry — the four notes under the two VCOs are integer subharmonics
   * of them, so the chord is an undertone chord and the dividers decide which one exists.
   */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 6 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4) — the number is
   * assignables, not notes, and this box's six notes all live inside the one. Written out rather
   * than left to default, which would also give 1, so the claim is visible.
   */
  comfortableVoices: 1,

  /**
   * **`perStep` is one knob, and p.26 is the page that says so by enumerating**: "Each step
   * includes a variable tuning knob and an LED to indicate the current active step."
   *
   * It is a knob with no printed scale whose swing another button decides — `SEQ OCT` picks ±5,
   * ±2 or ±1 octaves and `QUANTIZE` decides which scale steps inside that are reachable (p.26,
   * p.28) — so there is no honest per-step value to write and **no recipe here carries an
   * `articulation` entry at all**. That is not an omission: an articulation is a *gesture* on a
   * chosen step, and the only gesture this sequencer has is a different pitch, which is the
   * template's business and not a device's (§4.3). Where the DFAM has a velocity knob per step
   * and can accent, this box has no dynamics anywhere in its sequencer.
   *
   * **`lfo` and `sidechain` are not declared at all** — see `capabilityEvidence`, where p.58's
   * enumeration of the sound engine is recorded as answering both questions rather than being
   * silent on them.
   */
  features: {
    perStep: ['pitch'],
  },

  /** §8.1. Jogs, not documentation — every one under eight words. */
  hints: {
    'tune-pitch': 'Tune to the key; QUANTIZE snaps it',
    'wave-switch': 'Square up, saw down, PWM centre',
    'sub-divider': 'Divides the VCO pitch by this integer',
    'self-oscillate': 'Full RESONANCE and the ladder sings',
    'accent-octave': 'No velocity here; move the step instead',
    'decay-length': 'Nothing else sets how long it rings',
    'rhythm-divider': 'Divides the tempo; 1 is the tempo',
  },

  manual: {
    title: 'Subharmonicon Manual',
    edition: 'Semi-Modular Analog Polyrhythmic Synthesizer',
  },

  recipes: RECIPES,
}
