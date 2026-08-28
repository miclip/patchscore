import type { CapabilityEvidence, Device, JackSignalKind, JackSpec, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, AuthoredParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { MINITAUR_PANEL } from './panel'

/**
 * Moog Minitaur (§2.3) — one monophonic analog voice, two oscillators, a Moog ladder filter,
 * two envelopes and an LFO. No keyboard, no sequencer, no arpeggiator: **every note this box
 * plays arrives from somewhere else**, over MIDI or as a gate and a pitch voltage.
 *
 * **Source**: `manuals/Minitaur_Manual.pdf`, 19 PDF pages, © 2012 Moog Music, from
 * [Moog's CDN](https://cdn.inmusicbrands.com/Moog/Minitaur/Minitaur_Manual.pdf) — the same path
 * the Subsequent 37 manual came from. PDF pages 17-19 are a **firmware v2.1 addendum** bound
 * onto the back of the original document, describing firmware v2.0 and later. Its pages carry no
 * printed folio, so the few citations that reach it name the PDF page and say `(unnumbered)` —
 * see `addendum()`. Two things below depend on it and could not be authored honestly without
 * it: the `DECAY/RELEASE MODE` param, and what actually happens to a note above the box's range.
 *
 * ## The page offset here is not an offset, it is a spread
 *
 * `manuals/README.md` records the Metropolix as printed folio = PDF page − 1, and the Mother-32
 * carries the same offset in its own manifest rather than in the README. This document is laid
 * out differently again and neither arithmetic applies: the page box is **792 × 612 pt,
 * landscape letter**, and every PDF page carries **two printed pages side by side**. So
 *
 *     printed 2N-3 (left) and printed 2N-2 (right)  are both on  PDF page N
 *     printed p                                     is on        PDF page floor((p + 3) / 2)
 *
 * Checked against the footers on three spreads rather than derived: PDF 4 foots `5` and `6`,
 * PDF 14 foots `25` and `26`, PDF 16 foots `29` and `30`. **Every citation below is a printed
 * page**, the number a reader sees at the bottom of the sheet, and `pdftotext` on a single PDF
 * page returns *both* of them interleaved — which is why a grep that looks like it found a
 * parameter on the wrong page has probably found it on the facing one.
 *
 * ## What this manual is unusually good at, and the one place it is not
 *
 * **Appendix E, printed p.29, states the range of nearly every control in physical units** —
 * `CUTOFF: 20Hz to 20KHz`, `ATTACK TIME: 1 msec to 30 sec`, `OSCILLATOR 2 Frequency: ± 12
 * Semitones`, `SUSTAIN LEVEL: 0 to 100%`, `LFO RATE: 0.01 to 100Hz`. That is rarer than it
 * sounds and it is worth more than a 0-1023 encoder scale, because a figure in hertz or seconds
 * says what the sound *is* rather than where a number lands. Those ranges are cited on the
 * params below and are what lets mood move this box at all (§3.1's legality gate).
 *
 * **One control's range is a named endpoint rather than a number**, and CLAUDE.md's
 * cited-wrong-range note is about exactly this shape. p.29: `RESONANCE: 0 to Self-Oscillation`.
 * There is no figure at the top of that travel, so `RES` is `travel()` — percent of the knob,
 * provisional on both claims, and deaf to mood — rather than a number with a made-up ceiling.
 * The CRAVE's `lo/mix 1 to hi/mix 2` is the same shape and is handled the same way.
 *
 * ## The knobs are unmarked, and only one of them is not
 *
 * The front panel (printed p.6) is a tick ring per knob and no numbers, with **exactly one
 * exception**: `CUTOFF` is silkscreened `20Hz`, `80Hz`, `320Hz`, `1.2KHz`, `5KHz`, `20KHz`, so a
 * figure in hertz is a number a reader can actually find on the panel in front of them.
 * Everything else carries its cited range because the *document* states it, not because the
 * *panel* prints it — a reader setting `AMPLIFIER DECAY/RELEASE` to `0.4 s` is setting it by ear
 * against a stated end-to-end range, and the note on each such param says so. Two knobs carry a
 * centre detent worth naming instead of a number, and the panel marks both with `−` and `+`:
 * `VCO 2 FREQ` (centre is unison, p.9) and `EG AMOUNT`, whose centre is no envelope at all —
 * that one is Appendix E's `-100% TO +100%` on p.29, since p.13 describes what positive and
 * negative settings *do* without ever stating what sits between them.
 *
 * The one landmark the manual does give for an unmarked knob is a good one and is used below:
 * *"The VCOs begin to clip the filter at about 2 o'clock creating more aggressive sounds"*
 * (p.11). That is where `grit` pushes the oscillator levels.
 *
 * ## Clock: `cited-against`, which is rare and is the strongest answer available
 *
 * The MIDI implementation chart on printed p.25 has a row for it, and the row answers:
 *
 *     SYSTEM REAL TIME
 *              Clock          NO           YES     Receives Timing Clock
 *
 * Transmitted **no**, recognised **yes**. So `canSendClock: false` is not an author declining to
 * look — it is a document saying no, recorded as `cited-against` with the page (§2.6). The
 * receive half is corroborated on p.16, where `LFO MIDI SYNC ON/OFF (CC# 87)` is *"the ability
 * of the Minitaur's LFO to sync to MIDI Clock messages"* and defaults to ON.
 *
 * Clock arrives over both wires — DIN `MIDI · IN` and `USB MIDI` — so `transport` lists both and
 * `receiveTransport` is omitted, which means all of them. `sendTransport` is moot: §2.3's
 * `sendTransports()` returns nothing for a box that cannot send, whatever the list says.
 *
 * ## The panel, and a measurement that had to be redone
 *
 * Drawn — see `panel.ts`, which carries the method and the numbers. Two things are worth having
 * here because they are about the *document* rather than about the drawing:
 *
 * **The figure is vector artwork, so the geometry is exact.** `pdftocairo -svg` on PDF page 4
 * gives 900 paths; the only rasters on the page are two 16 x 15 px glyph icons. There was never
 * any need to measure a render, and a first pass that did measure one concluded the figure was
 * stretched and left the panel undrawn. It was not stretched. Every knob is a circle to four
 * decimal places in the vector data. The render's connected components had merged each knob with
 * its own pointer and tick marks. `CLAUDE.md` already says a `pdftotext` dump is not evidence a
 * manual is silent; the same caution applies one tool along, and the artwork was there to read.
 *
 * **The drawn aspect picks a rise that no pair of the stated dimensions gives.** p.30 lists
 * `222.3mm x 130.2mm x 79.4mm` and the drawing measures 1.5837, which none of 1.7074, 2.7997 or
 * 1.6398 matches. §2.3's instruction is to read the rise off the drawing, and at the cited
 * 222.3 mm span that is 140.36 mm — longer than the 130.2 mm footprint because the top of this
 * box slopes, so the face you play is longer than the edge it stands on. The Mother-32's panel
 * comment records the mirror image, where the table's axis letters were wrong and the drawing
 * chose between them.
 *
 * ## The manual contradicts itself about octave naming, on one page
 *
 * Printed p.9 says the highest pitch is *"C5 (523.25 Hz) or MIDI note value 72"*, and eleven
 * lines later says *"the pitch of VCO 2 is limited to note 72 (C4)"*. Both name MIDI 72; they
 * disagree about what to call it. 523.25 Hz is the arbiter — that is C5 where middle C is C4,
 * which is §8's convention and the one `render.ts` states in the guide ("Octaves put middle C at
 * C4"). Moog's own house convention puts middle C at C3, which is where the `C4` came from.
 * Recorded rather than smoothed over, because a reader checking our note names against this
 * manual will hit it.
 *
 * ## What this box cannot be given, and why the role list is short
 *
 * **MIDI notes 0-72** (p.5, p.9, and p.25's chart prints `NOTE NUMBER | NO | 0-72`). The highest
 * pitch is C5, 523.25 Hz.
 *
 * **What happens above that is not silence, and an earlier draft of this comment said it was.**
 * The addendum (PDF p.17) documents the behaviour outright: *"if you play a note which is above
 * C5, the Minitaur will play the equivalent pitch (C, D, E etc.) in its top octave, instead of
 * always playing the highest C for all notes above C5."* So from v2.0 the box **folds** an
 * over-range note into its top octave by pitch class, and before that it **clamped** every one
 * of them to the top C. Either way it sounds a note. The damage a guide does by handing this box
 * a part it cannot reach is **a wrong octave, or a line collapsed onto one pitch** — not a
 * missing part, which is what the first version of this paragraph claimed.
 *
 * **`lead` is still not offered, and the reason is musical rather than protective.** It is a
 * monophonic analog *bass* synth; a lead belongs on something that can carry one. The range
 * corroborates it — all three authored lead hooks sit at `baseOctave: 4` and exceed MIDI 72 in
 * seven of the eight keys their templates offer — but the role list is not a guard, and calling
 * it one was wrong twice over: it does not describe what the hardware does, and it does not hold.
 *
 * **`stab` is a real uncovered hole, and it is recorded rather than quietly left.** Two of the
 * three authored stab hooks also sit at `baseOctave: 4`. Resolved through every key their
 * templates offer, `house-hook-stab-1` puts eleven of its twelve notes above 72 in A lydian and
 * `house-hook-stab-2` puts all twelve over, the top by thirteen semitones — five of nine
 * hook-and-key combinations breach. Nothing in the engine can stop it: `chooseHook` takes no
 * `Device`, hooks are resolved from the template alone, and `ResolvedNote.midi` is deliberately
 * unclamped. So a rig that puts the industrial-techno or lydian-house stab here will print notes
 * this box folds down an octave.
 *
 * The role stays, because refusing `stab` on the strength of two hooks in one direction would
 * cost every rig that pairs this box with a direction whose stab sits where a bass synth can
 * play it — and the header's own later sentence is the honest general statement: **a voice's
 * pitch range is as real a constraint as its polyphony, and nothing in §2.2 can say it.** That
 * is a finding filed against the model, not a fact about this box.
 *
 * A second mismatch sits on the same path and is already narrated where a reader meets it: all
 * three stab hooks are chordal, three notes on one step, against a voice with `polyphony: 1`.
 * `minitaur-stab-hard`'s `routing` says so in as many words.
 *
 * ## No sequencer, and the guide's phase 5 assumes one
 *
 * There is no internal sequencer and no arpeggiator on this box — p.9's first sentence is that
 * it *"responds to MIDI messages on both DIN and USB MIDI Inputs"*, and that is the whole of how
 * it is played. §8 phase 5 renders a step pattern per part, which for this box is a pattern to
 * enter **on whatever is driving it**. That is #65's open problem (*"the guide assumes every
 * part is step-programmed"*) and this device is another instance of it, not a new one. No
 * `features.perStep` is declared, because per-step lanes are a property of a sequencer this box
 * does not have.
 */

/**
 * The manual, by **printed** page — see the spread arithmetic in the header. `Minitaur Manual`
 * is what the document calls itself on its own cover.
 */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog Minitaur Manual, p.${page}` }
}

/**
 * The **v2.1 addendum** bound onto the back of the same file, PDF pages 17-19.
 *
 * Its pages carry no printed folio, so there is no number a reader can see at the bottom of the
 * sheet and the citation names the PDF page instead — stated as such rather than dressed as a
 * printed page. It is a different document by a different date and the distinction matters:
 * everything it describes is firmware v2.0 or later, and a box on earlier firmware behaves as
 * the body of the manual says.
 */
function addendum(pdfPage: number): Cite {
  return {
    kind: 'manual',
    source: `Moog Minitaur Firmware v2.1 Addendum, PDF p.${pdfPage} (unnumbered)`,
  }
}

/** The addendum page carrying DECAY & RELEASE MODES and WRAP TOP OCTAVE BEHAVIOR. */
const ADDENDUM_MODES = addendum(17)

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared socket on the back panel (§3.3). The page is where the manual describes *this* jack.
 *
 * Ids are qualified with the panel's own bracket legends, which printed p.18's figure draws as
 * headers over groups of sockets: `AUDIO` over `OUT` and `IN`, and `CONTROLLER INPUTS` over
 * `PITCH CV`, `FILTER CV`, `VOLUME CV` and `GATE`. §3.3 wants the panel's word and that is it.
 *
 * **A jack's `capabilityEvidence` page says the socket exists and what it is for; anything a
 * `note` adds from elsewhere names its own page.** p.18 describes all six sockets and their
 * bracket grouping, which is what the entry at `jacks[<id>]` claims — but the voltage scaling,
 * the connector types and the envelope behaviour are on pp.10, 13, 15, 17 and 30, and a note
 * that carried them silently read as though p.18 had said all of it. That is CLAUDE.md's
 * cited-wrong-range failure one field over: the citation is right and the prose beside it
 * reaches past what the page supports.
 *
 * The qualifier also decides something load-bearing, exactly as it did on the Mother-32: the
 * pitch input and the gate input have to land in **one** section for §7's voice-control pass to
 * see them as a bundle, or nothing in a rig could ever be wired up to play this box — which is
 * the entire point of a synthesizer with no keyboard. Under `CONTROLLER INPUTS ·` they do.
 */
function jack(
  id: string,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  page: number,
  note?: string,
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return { id, direction, signal, ...(note === undefined ? {} : { note }) }
}

/**
 * The back panel, left to right as printed p.18 draws it.
 *
 * **The headphone output is deliberately absent.** It is silkscreened as a pictogram with no
 * text at all, so there is no panel word to qualify an id with, and it is a monitoring output
 * rather than a patch point — nothing in a rig is wired *from* it. `io.main` already says this
 * box leaves by one mono output.
 *
 * **`MIDI · IN` and `USB MIDI` are absent too**, on the CRAVE's convention: those are ports, not
 * patch points, and `clock.transport` already carries both. `USB MIDI` could not be declared
 * honestly in any case — `JackSpec.direction` is one of `in` or `out`, and printed p.18 calls
 * that socket *"USB MIDI IN-OUT"*.
 */
const JACKS: readonly JackSpec[] = [
  jack('AUDIO · OUT', 'out', ['audio'], 18, 'Unbalanced line level; 1/4" TS (p.30)'),
  jack('AUDIO · IN', 'in', ['audio'], 18, 'Mixes with the VCOs ahead of the filter; +4dBu line level, 1/4" TS (p.30)'),
  jack(
    'CONTROLLER INPUTS · PITCH CV',
    'in',
    ['pitch-cv'],
    18,
    '0 to +5 V. Controls both oscillators at 1 V per octave (p.10), unless the input has been re-mapped (addendum PDF p.18)',
  ),
  jack(
    'CONTROLLER INPUTS · FILTER CV',
    'in',
    ['cv'],
    18,
    '0 to +5 V. Adds to the CUTOFF setting, about one octave per volt (p.13). The one controller input the addendum’s CV re-mapping does not cover',
  ),
  jack(
    'CONTROLLER INPUTS · VOLUME CV',
    'in',
    ['cv'],
    18,
    '0 to +5 V: 0 V silences it and +5 V is the level the VOLUME knob is set to (p.17), unless the input has been re-mapped (addendum PDF p.18)',
  ),
  jack(
    'CONTROLLER INPUTS · GATE',
    'in',
    ['gate'],
    18,
    'A +5 V trigger. Fires both envelopes together and overrides MIDI triggering while applied (p.15), unless the input has been re-mapped (addendum PDF p.18)',
  ),
]

// ---------------------------------------------------------------------------
// §3.1/§3.2 Parameter helpers
// ---------------------------------------------------------------------------

/**
 * A control whose **range** the document states, in the unit the document states it in.
 *
 * The range is cited and the point is not (§3.1's two claims): Appendix E says how far the knob
 * goes, and where in that travel this recipe wants it is taste. A verified range is also what
 * lets mood move the value at all, which on this box is most of what mood has to work with.
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
 * A knob position on a control with **no stated range**, as percent of travel.
 *
 * Two of them on this box, and each for its own reason: `RES`, whose printed range ends at
 * "Self-Oscillation" rather than at a number (p.29), and `VOLUME`, which Appendix E lists as
 * `MASTER VOLUME` with no range beside it. Both claims are unverified and both render that way —
 * the point is uncited so the guide marks it provisional (§3.2), and `range.verified` is `false`
 * so mood may not move a figure nobody checked. `% travel` is a fact about a knob anyone can
 * see; it is not a claim that the box displays 0-100.
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

/** Both oscillator switches offer the same two shapes: Sawtooth (LED off) or Square (LED on). */
const WAVES = ['Sawtooth', 'Square'] as const

/**
 * The two panel switches Appendix E lists as `On/Off`: `GLIDE` (p.11) and `RELEASE` (p.15).
 * p.11 carries the GLIDE switch and the MIX section; the RELEASE switch is described on p.15.
 */
const ON_OFF = ['On', 'Off'] as const

// Ranges, every one from Appendix E on printed p.29 unless noted.
const PERCENT = { min: 0, max: 100 }
/** `FILTER ENV. AMOUNT: -100% TO +100%` — bipolar, centre detent is no envelope at all. */
const BIPOLAR_PERCENT = { min: -100, max: 100 }
/** `OSCILLATOR 2 Frequency: ± 12 Semitones`, corroborated as "+/-1 octave" on p.9. */
const SEMITONES = { min: -12, max: 12 }
/** `FINE TUNE: ± 1 Semitone`, described on p.10 as "approximately +/-1 semitone". */
const FINE_TUNE_ST = { min: -1, max: 1 }
/** `CUTOFF: 20Hz to 20KHz`, and the only range this panel also silkscreens (p.6). */
const CUTOFF_HZ = { min: 20, max: 20000 }
/**
 * `ATTACK / DECAY / RELEASE TIME: 1 msec to 30 sec`, written in **milliseconds**.
 *
 * Milliseconds rather than seconds, and the reason is arithmetic rather than taste: §3.2's mood
 * grid defaults to `step: 1` when a param declares none, so a value in seconds is rounded to the
 * nearest whole second the moment any mood offset is non-zero — which would turn a 90 ms
 * amplifier decay into 0. In milliseconds the default grid is already the right resolution and
 * every authored value here is a whole number. The manual's own phrasing is "1 msec to 30 sec",
 * so this is the unit it states first.
 */
const MILLISECONDS = { min: 1, max: 30000 }
/** `LFO RATE WITH RATE LED: 0.01 to 100Hz`. */
const LFO_HZ = { min: 0.01, max: 100 }

/** The note that travels with every time, since the knob prints no scale. */
const TIME_NOTE = '1 ms fully anticlockwise to 30 s fully clockwise; set it by ear'

/** Both `DECAY/RELEASE` knobs carry this: one knob, two segments, and a mode that swaps them. */
const DECAY_RELEASE_NOTE =
  'One knob for both segments. In Mode 1 the RELEASE switch decides whether you hear the ' +
  'release at all; in Mode 2 it decides which of the two the knob is editing — see ' +
  '`DECAY/RELEASE MODE`'

/** Addendum, PDF p.17. */
const DECAY_RELEASE_MODES = ['MODE 1', 'MODE 2'] as const

/**
 * The eight controls every recipe sets, in panel order: the two oscillators and their levels,
 * the filter, and the filter envelope. Written once because every recipe sets all of them —
 * this is a one-knob-per-function box with nothing hidden in a menu, so a recipe that left a
 * knob out would be leaving it wherever the last patch put it.
 */
function core(
  wave1: (typeof WAVES)[number],
  wave2: (typeof WAVES)[number],
  detune: number,
  lvl1: number,
  lvl2: number,
  cutoffHz: number,
  res: number,
  egAmount: number,
): AuthoredParam[] {
  return [
    /**
     * §3.1. The twenty-second control on the panel, and the one a recipe cannot leave out.
     *
     * It detunes **both** oscillators against everything else in the rig by up to a semitone,
     * and p.10 says it "does not transmit MIDI" — nor receive it, so the panel is the only place
     * it can be set and nothing else on the box will move it back. A recipe that omitted it
     * would be leaving the whole voice wherever the last patch left it, which is precisely what
     * the note on `core()` warns about.
     */
    num('FINE TUNE', 0, FINE_TUNE_ST, cite(29), {
      unit: 'st',
      note: 'Centred is in tune. Adjusts both oscillators together, and neither sends nor receives MIDI (p.10)',
    }),
    pick('OSCILLATOR 1', wave1, WAVES, cite(9), {
      note: 'The switch LED is off for Sawtooth and on for Square',
    }),
    pick('OSCILLATOR 2', wave2, WAVES, cite(9)),
    num('VCO 2 FREQ', detune, SEMITONES, cite(29), {
      unit: 'st',
      note: 'Centre is unison with VCO 1; the panel marks only − and +',
    }),
    num('VCO 1 LVL', lvl1, PERCENT, cite(29), {
      unit: '%',
      mood: [{ axis: 'grit', amount: 3 }],
      hint: 'Past 2 o’clock it clips the filter',
    }),
    num('VCO 2 LVL', lvl2, PERCENT, cite(29), {
      unit: '%',
      mood: [{ axis: 'grit', amount: 3 }],
      // p.11, and the only landmark this manual gives for an unmarked knob.
      note: 'The VCOs begin to clip the filter at about 2 o’clock, which is where grit pushes them',
    }),
    num('CUTOFF', cutoffHz, CUTOFF_HZ, cite(29), {
      unit: 'Hz',
      /**
       * **Scaled to the authored value, because the control is logarithmic and the offset is
       * not.** §6's `amount` is the offset at full deflection, so one flat figure cannot serve a
       * knob whose printed scale runs 20Hz, 80Hz, 320Hz, 1.2KHz, 5KHz, 20KHz — a step that is a
       * gentle nudge at 5 kHz slams a 320 Hz recipe onto the 20 Hz floor. A flat −1200 did
       * exactly that to eleven of the fifteen recipes below.
       *
       * Forty percent of the authored point keeps the *musical* size of the move constant across
       * the panel: full darkness always takes the filter down by roughly the same fraction of an
       * octave wherever it started. The Mother-32 reaches the same shape from the other end, by
       * hand-authoring a darkness figure per recipe from −25 to −1400 against the same 20 Hz to
       * 20 kHz range; deriving it keeps the fifteen recipes here from drifting apart.
       */
      mood: [{ axis: 'darkness', amount: -Math.round(cutoffHz * 0.4) }],
      note: 'The one knob on this panel with a printed scale: 20Hz, 80Hz, 320Hz, 1.2KHz, 5KHz, 20KHz',
    }),
    travel('RES', res, {
      // The named-endpoint trap, recorded on the value it applies to.
      note: 'p.29 gives this range as "0 to Self-Oscillation" — a named endpoint, not a number, so this is percent of travel',
    }),
    num('EG AMOUNT', egAmount, BIPOLAR_PERCENT, cite(29), {
      unit: '%',
      note: 'How much the filter envelope adds to or subtracts from CUTOFF; centre is none',
    }),
  ]
}

/** The two envelopes, filter first then amplifier, exactly as the panel stacks them (p.6). */
function envelopes(
  fAttack: number,
  fDecay: number,
  fSustain: number,
  aAttack: number,
  aDecay: number,
  aSustain: number,
  release: (typeof ON_OFF)[number],
): AuthoredParam[] {
  return [
    num('FILTER ATTACK', fAttack, MILLISECONDS, cite(29), { unit: 'ms', note: TIME_NOTE }),
    num('FILTER DECAY/RELEASE', fDecay, MILLISECONDS, cite(29), {
      unit: 'ms',
      note: DECAY_RELEASE_NOTE,
    }),
    num('FILTER SUSTAIN', fSustain, PERCENT, cite(29), { unit: '%' }),
    num('AMPLIFIER ATTACK', aAttack, MILLISECONDS, cite(29), { unit: 'ms', note: TIME_NOTE }),
    num('AMPLIFIER DECAY/RELEASE', aDecay, MILLISECONDS, cite(29), {
      unit: 'ms',
      // Scaled to the authored point for the same reason `CUTOFF` is: a flat offset that suits a
      // 1.5 s pad tail is most of a 90 ms stab. Half the value at full deflection.
      mood: [{ axis: 'density', amount: Math.round(aDecay * 0.5) }],
      note: DECAY_RELEASE_NOTE,
    }),
    num('AMPLIFIER SUSTAIN', aSustain, PERCENT, cite(29), { unit: '%' }),
    pick('RELEASE', release, ON_OFF, cite(29), {
      // p.15 for what the switch does to both envelopes; the mode it depends on is the param
      // below, and `DECAY_RELEASE_NOTE` explains the pairing.
      note: 'In Mode 1: on, the release time equals the decay time; off, the envelope stops dead at note-off',
    }),
    /**
     * §3.2/CLAUDE.md. **The switch that decides what `DECAY/RELEASE` means, carried as a param
     * so the pairing cannot come apart.**
     *
     * The v2.1 addendum (PDF p.17, unnumbered) documents two modes. In **Mode 1** the two
     * segments are linked and the knob sets both, which is what the values above assume. In
     * **Mode 2** they are independent and the `RELEASE ON/OFF` switch changes *which segment the
     * knob is editing* — lit edits release, dark edits decay — so the same knob position means a
     * different envelope.
     *
     * Mode 1 is the factory default (addendum PDF p.18), so an untouched box matches the values
     * above. It is reachable from the panel alone by holding `RELEASE ON/OFF` for a second, and
     * the addendum notes the choice is "remembered on power-down" — so a reader whose box has
     * been switched has no indication, which is exactly why it travels with the value. The TR-8S
     * and the minilogue xd both solved the same shape the same way.
     */
    pick('DECAY/RELEASE MODE', 'MODE 1', DECAY_RELEASE_MODES, ADDENDUM_MODES, {
      note: 'Hold RELEASE ON/OFF for one second to toggle; remembered on power-down. Mode 1 links decay and release, which is what the times above assume',
    }),
  ]
}

/**
 * The modulation section. Every recipe sets it, and most set it to nothing — an LFO amount left
 * where the last patch put it is a wobble nobody asked for, and p.16 warns that on power-up
 * these two knobs act directly until a Mod Wheel message arrives.
 */
function mod(rateHz: number, toVco: number, toVcf: number): AuthoredParam[] {
  return [
    num('LFO RATE', rateHz, LFO_HZ, cite(29), { unit: 'Hz' }),
    num('VCO LFO AMT', toVco, PERCENT, cite(29), {
      unit: '%',
      note: 'Up to ±1 octave of pitch at full travel (p.16)',
    }),
    num('VCF LFO AMT', toVcf, PERCENT, cite(29), {
      unit: '%',
      note: 'Up to ±5 octaves of cutoff at full travel (p.16)',
    }),
  ]
}

/** Glide, which is off on most of these and is the Taurus gesture on the acid lines (p.11). */
function glide(on: (typeof ON_OFF)[number], rate: number): AuthoredParam[] {
  return [
    pick('GLIDE', on, ON_OFF, cite(29)),
    num('GLIDE RATE', rate, PERCENT, cite(29), {
      unit: '%',
      note: 'Instantaneous fully anticlockwise to extremely long fully clockwise (p.11)',
    }),
  ]
}

/** The output stage. Appendix E lists `MASTER VOLUME` with no range, so it is percent of travel. */
function out(volume: number): AuthoredParam[] {
  return [
    travel('VOLUME', volume, {
      // The panel silkscreens `VOLUME / <headphone pictogram>`. The word is taken and the
      // pictogram described, rather than reproduced as an emoji: it would be the only emoji in a
      // parameter name in the library, and §8 has this read at arm's length in poor light.
      note: 'Panelled `VOLUME` beside a headphone pictogram — one knob sets the output and the headphones together (p.17)',
    }),
  ]
}

// ---------------------------------------------------------------------------
// §3 Recipes
// ---------------------------------------------------------------------------

/**
 * Five roles, all of them in the bottom two octaves. See the header for why `lead` is not among
 * them: this box sounds nothing above MIDI 72 and nothing in the model can say so, so the role
 * list is the guard.
 *
 * Ordered best-first, because `roleFitPenalty` (§7.1) is the role's index in this list — a rig
 * with something else that plays `stab` should give this box the sub and take the stab elsewhere.
 */
const VOICE_ROLES: readonly Role[] = ['sub', 'bass-mid', 'acid', 'stab', 'kick']

const recipes: Recipe[] = [
  // ---- sub -------------------------------------------------------------------------------
  {
    id: 'minitaur-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'One oscillator under the filter, nothing above it',
    routing: 'One VCO only — VCO 2 is down, so there is nothing to beat against and the pitch is dead still.',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 80, 5, 0),
      ...envelopes(1, 400, 100, 5, 600, 100, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-sub-clean',
    role: 'sub',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'Square fundamental, filter open enough to keep the edge honest',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 320, 0, 0),
      ...envelopes(1, 300, 100, 3, 500, 100, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-sub-hard',
    role: 'sub',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Short sub with the filter envelope snapping shut behind it',
    params: [
      ...core('Square', 'Sawtooth', 0, 100, 0, 80, 20, 45),
      ...envelopes(1, 120, 0, 1, 180, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(72),
    ],
  },
  {
    id: 'minitaur-sub-soft',
    role: 'sub',
    character: 'soft',
    voice: 'voice',
    verified: false,
    title: 'Slow swell, no transient at all',
    params: [
      ...core('Square', 'Square', 0, 95, 0, 200, 0, 20),
      ...envelopes(600, 1500, 90, 800, 2000, 95, 'On'),
      ...mod(0.2, 0, 4),
      ...glide('Off', 0),
      ...out(68),
    ],
  },

  // ---- bass-mid --------------------------------------------------------------------------
  {
    id: 'minitaur-bass-mid-hard',
    role: 'bass-mid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Two sawtooths a hair apart, filter envelope on every note',
    routing:
      'VCO 2 is one semitone sharp rather than in unison — the beat is what fills the mid, and it costs nothing.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 1, 85, 70, 320, 25, 55),
      ...envelopes(1, 250, 20, 2, 350, 30, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Both oscillators past two o’clock, clipping the filter on purpose',
    routing:
      'Both levels are pushed past the point p.11 says the VCOs start clipping the filter. That clipping is the sound here, not a fault.',
    params: [
      ...core('Sawtooth', 'Sawtooth', -12, 95, 95, 320, 40, 50),
      ...envelopes(1, 300, 25, 2, 400, 35, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(65),
    ],
  },
  {
    id: 'minitaur-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Octave-down square, filter low and static',
    params: [
      ...core('Square', 'Square', -12, 80, 80, 200, 10, 10),
      ...envelopes(1, 500, 60, 5, 600, 60, 'On'),
      ...mod(0.4, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-bass-mid-clean',
    role: 'bass-mid',
    character: 'clean',
    voice: 'voice',
    verified: false,
    title: 'One sawtooth, no resonance, nothing in the way',
    params: [
      ...core('Sawtooth', 'Square', 0, 100, 0, 1200, 0, 25),
      ...envelopes(1, 300, 40, 2, 400, 45, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },

  // ---- acid ------------------------------------------------------------------------------
  {
    id: 'minitaur-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'Ladder filter near self-oscillation, glide between every note',
    routing:
      'Glide is on and the rate is short — p.11 offers EXP as the Taurus curve, "fast and then slows as it approaches the target note", but that is a MIDI-only setting (CC# 92) and cannot be reached from the panel.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 0, 90, 0, 320, 78, 70),
      ...envelopes(1, 140, 0, 1, 220, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('On', 12),
      ...out(68),
    ],
  },
  {
    id: 'minitaur-acid-bright',
    role: 'acid',
    character: 'bright',
    voice: 'voice',
    verified: false,
    title: 'Thinner line, cutoff up and the envelope doing the shape',
    params: [
      ...core('Sawtooth', 'Square', 0, 80, 0, 1200, 65, 60),
      ...envelopes(1, 100, 0, 1, 160, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('On', 8),
      ...out(68),
    ],
  },
  {
    id: 'minitaur-acid-hard',
    role: 'acid',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Every note the same length, filter slammed shut behind each one',
    params: [
      ...core('Sawtooth', 'Sawtooth', 0, 95, 0, 200, 70, 85),
      ...envelopes(1, 80, 0, 1, 120, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },

  // ---- stab ------------------------------------------------------------------------------
  {
    id: 'minitaur-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'One note, gone before the next beat',
    routing:
      'One note is all this is — the box is monophonic, so a stab here is a single pitch and the rig has to find its chord elsewhere.',
    params: [
      ...core('Sawtooth', 'Sawtooth', 7, 90, 60, 320, 45, 75),
      ...envelopes(1, 60, 0, 1, 90, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(70),
    ],
  },
  {
    id: 'minitaur-stab-dirty',
    role: 'stab',
    character: 'dirty',
    voice: 'voice',
    verified: false,
    title: 'A fifth apart and both oscillators overdriving the filter',
    params: [
      ...core('Sawtooth', 'Square', 7, 95, 95, 200, 55, 70),
      ...envelopes(1, 70, 0, 1, 100, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(64),
    ],
  },

  // ---- kick ------------------------------------------------------------------------------
  {
    id: 'minitaur-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    verified: false,
    title: 'Filter thump — the weight is the envelope, not a pitch drop',
    routing:
      'There is no envelope route to the oscillators on this box: `EG AMOUNT` reaches the filter and nothing reaches pitch, so this is a filter thump rather than the pitch-drop kick a synth with a pitch envelope makes. It is solid and it is low; it will not click.',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 80, 55, 90),
      ...envelopes(1, 50, 0, 1, 90, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(75),
    ],
  },
  {
    id: 'minitaur-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'voice',
    verified: false,
    title: 'Longer thump with the filter barely open',
    params: [
      ...core('Square', 'Square', 0, 100, 0, 20, 40, 70),
      ...envelopes(1, 90, 0, 1, 140, 0, 'Off'),
      ...mod(0.5, 0, 0),
      ...glide('Off', 0),
      ...out(75),
    ],
  },
]

export const device: Device = {
  id: 'moog-minitaur',
  name: 'Minitaur',
  maker: 'Moog',
  /**
   * `synth` rather than `semi-modular`. The four `CONTROLLER INPUTS` accept control voltage, but
   * they are **inputs only** — there is no patchbay, nothing on this box outputs a voltage, and
   * so no cable can be run from one point on it to another. §2.3's `semi-modular` means a
   * normalised instrument you can re-route; this is a sound module you can drive.
   */
  kind: 'synth',
  clock: {
    // p.25's implementation chart: Clock transmitted NO, recognised YES. See the header.
    canSendClock: false,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
  },
  /** p.30: one mono 1/4" out, a mono 1/4" in, and USB that carries MIDI only — never audio. */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },
  physical: {
    // p.30: 8.75" x 5.12" x 3.12" (222.3mm x 130.2mm x 79.4mm). The span is the width.
    panelSpanMm: 222.3,
    verified: cite(30),
  },
  panel: MINITAUR_PANEL,
  jacks: [...JACKS],
  capabilityEvidence: {
    ...JACK_EVIDENCE,
    voices: cite(29),
    'io.main': cite(30),
    'io.audioIn': cite(30),
    'clock.canReceiveClock': cite(25),
    /**
     * The rare one. p.25's MIDI implementation chart prints `Clock | NO | YES | Receives Timing
     * Clock` — transmitted no. That is a document answering the question in the negative, which
     * is `cited-against` rather than `unknown`, and it carries the page (§2.6).
     */
    'clock.canSendClock': {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'the MIDI implementation chart’s SYSTEM REAL TIME row prints Clock as TRANSMITTED = NO and RECOGNIZED = YES, with the remark "Receives Timing Clock". The box has no sequencer, no arpeggiator and no other time source, and its MIDI output carries Control Change from the panel knobs (p.9) rather than a clock',
    },
    'clock.preferredSource': {
      kind: 'cited-against',
      cite: cite(25),
      reason:
        'a box that cannot transmit clock cannot be a rig’s clock source, and p.25 says it cannot. This is not the usual "no page states what this box is for in a rig" — the question is settled one level down, by the capability rather than by the intent',
    },
    'features.lfo': cite(16),
    // §8/#65. The same page as `features.perStep` below and the same reading of it, because it
    // is the same negative: Appendix E's synth-engine list is exhaustive and no sequencer is on
    // it. The two facts are not the same claim — one is about per-step lanes, one about whether
    // a pattern can be entered here at all — but p.29 is what establishes both.
    patternEntry: cite(29),
    'features.perStep': {
      kind: 'cited-against',
      // p.29, not p.9. p.9 says the box responds to MIDI, which is a positive statement about
      // input — a box can do that and still have a sequencer. The negative is Appendix E's
      // synth-engine list, which is exhaustive and contains no sequencer.
      cite: cite(29),
      reason:
        'there is no sequencer and no arpeggiator to have per-step lanes. Appendix E’s SYNTH ENGINE list runs Oscillator Section, Filter Section, Envelope Generator Section (x2), Modulation Section and Performance Controls and stops; the contents list carries no sequencer chapter; and p.9 describes every note as arriving over DIN or USB MIDI',
    },
    'features.sidechain.internal': {
      kind: 'cited-against',
      cite: cite(29),
      reason:
        'Appendix E’s synth engine list has no compressor, ducker or envelope follower, and the VOLUME CV input (p.17) takes a voltage from outside rather than deriving one from audio',
    },
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at AUDIO · IN and mixes it into the filter (p.18), and the VOLUME CV jack could duck it from a voltage — but nothing on this box turns audio into that voltage, and no page states either way, so this is a reading of the jack list rather than an answer the document gives',
    },
    noteDuration: {
      kind: 'cited-against',
      // p.14 carries both halves in one sentence — "The EGs are started by a Gate or MIDI Note
      // message" — where p.9 carries only the MIDI half and never mentions the Gate input.
      cite: cite(14),
      reason:
        'note length is set by whatever is driving the box, because nothing on the box sets it: there is no sequencer with a gate-length lane, and p.14 has the envelopes started by "a Gate or MIDI Note message", both of which carry their duration from the sender (p.9 for MIDI, p.15 for the GATE jack)',
    },
  },
  manual: { title: 'Minitaur Manual', edition: '©2012 Moog Music' },
  /**
   * One monophonic analog voice (p.29: "TYPE: Programmable Monophonic Analog Bass Synthesizer").
   * Two oscillators, but they are one voice — both follow the same note.
   */
  /**
   * §8/#65. Every note this box plays arrives from somewhere else — p.9's first sentence is that
   * it *"responds to MIDI messages on both DIN and USB MIDI Inputs"*, and Appendix E's engine
   * list on p.29 is exhaustive with no sequencer on it. Phase 5 used to draw this box a step
   * grid, which is an instruction it cannot carry out.
   */
  patternEntry: {
    kind: 'external',
    reason:
      'it has no sequencer, keyboard or arpeggiator, so every note arrives over MIDI or as a gate and a pitch voltage',
  },

  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: [...VOICE_ROLES], polyphony: 1 }],
  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible.
   */
  comfortableVoices: 1,
  hints: {
    'midi-only': 'MIDI CC only — not on the panel',
    'centre-detent': 'Centre is the neutral position',
  },
  recipes,
}
