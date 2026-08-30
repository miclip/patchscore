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
import { DFAM_PANEL } from './panel'

/**
 * Moog DFAM — Drummer From Another Mother (§2.3). One monophonic analog percussion voice, an
 * analog 8-step sequencer, and a **24-point patchbay: 15 inputs and 9 outputs** (printed p.40).
 *
 * **Source**: `manuals/DFAM_Manual.pdf`, 44 PDF pages. **The printed page number *is* the PDF page
 * number here**, checked against the footer rather than assumed — p.24's figure and p.39's blank
 * sheet both print their own number, and p.40's SPECIFICATIONS matches the table of contents entry
 * that names it. This is worth stating because the sibling Mother-32 manual is offset by one, and
 * carrying that offset across would put every citation in this file on the wrong page.
 *
 * ## What this box is, and the three ways it does not fit the model cleanly
 *
 * DFAM is a **drum synth with no drum kit**. It has one voice, one output, and eight steps. Where
 * a TR-1000 has a BD, an SD and an LT that can each hold a different part, this box has a single
 * VCA and whatever the eight steps are currently set to. That shapes three things:
 *
 * **1. One voice, and `comfortableVoices: 1` is the whole of it.** Fifteen roles are declared
 * below and exactly one of them can be occupied in any guide. That is not a limitation being
 * worked around — it is the box, and the resolver already says so honestly. The temptation worth
 * naming is the opposite one: declaring eight "voices" because there are eight steps. Steps are
 * not voices. They are one voice's pattern, which is what `features.perStep` is for.
 *
 * **2. There is no MIDI anywhere on this instrument, and no USB either.** p.40's rear-panel row is
 * two lines — a 1/4" audio jack and a power connector — and the patchbay is 3.5 mm throughout.
 * `transport: ['analog-clock']` is the entire clock story, in **both** directions, so this box
 * omits `sendTransport` and `receiveTransport`: they would say the same thing twice. It is the
 * first box in the library whose only clock transport is the analog one, which means that in any
 * rig clocked over MIDI DIN it genuinely cannot follow, and the guide now says so in those words
 * rather than telling a reader to sync a box that has no socket for the cable.
 *
 * **3. Moog's own answer to "how do I connect this" is a clock cable, not a note stream.** The
 * manual has two chapters on connecting DFAM to anything, and both are one cable into the same
 * hole: p.30 syncs two DFAMs by patching "from the TRIGGER output on the Patchbay of the Primary
 * unit, into the ADV / CLOCK input on the Secondary unit", and p.31 syncs a Mother-32 to it by
 * patching "from the ASSIGN output jack on the Mother-32 Patchbay, into the ADV / CLOCK input on
 * the DFAM". Neither chapter mentions pitch, and neither mentions a gate. **This box is clocked,
 * not played** — §7.4's cable is the relationship, and §3.3's voice-control bundle is the wrong
 * shape for it. See the note on `JACKS` for what that costs and what it does not.
 *
 * ## The patchbay, and the legend that names its ids
 *
 * `IN` and `OUT` are the panel's own silkscreen, printed as one legend over the block, and p.24
 * explains it: "There are 15 inputs LABELED in standard text, and 9 outputs identified by REVERSE
 * lettering." The ids below are that legend plus the point's own label, which is the Mother-32's
 * convention and is what makes `TRIGGER` — a jack that exists in both directions on this panel,
 * as `VELOCITY` also does — two distinct ids rather than a collision.
 *
 * ## Numbers: what this manual prints and what it does not
 *
 * Two controls have a range in the document, and they are the only parameters mood may move
 * (§3.1's legality gate):
 *
 *  - `CUTOFF` — "The Filter CUTOFF knob can be set manually from 20Hz to 20kHz — roughly the same
 *    range as human hearing" (p.18), and the panel silkscreens `20Hz`, `200Hz`, `2kHz`, `20kHz`
 *    around the knob, so a figure in hertz is one a reader can find on the panel.
 *  - `VCF DECAY` — "VCF Decay times range from 10ms to 10 seconds" (p.19).
 *
 * **`VCA DECAY` looks like it should be the third and is not.** p.21 is a whole page about it and
 * gives seven settings by clock position — 7 o'clock, 9, 10, 11, 12, past 12 — with a described
 * result for each and **not one number**. The VCF's decay page prints its milliseconds; the VCA's
 * does not. So `VCA DECAY` is `travel()` like the rest, and the difference between the two
 * envelope knobs in this file is a difference between two pages, not a judgement about the box.
 *
 * Everything else here is a knob with a tick ring and no printed scale — `RESONANCE`, `VOLUME`,
 * the three mixer levels, `NOISE / VCF MOD`, `1→2 FM AMOUNT`, both `FREQUENCY` knobs, `VCO DECAY`
 * — so those are `travel()` or `bipolar()`, provisional on both claims and deaf to mood, exactly
 * as the Cascadia's sliders and the Mother-32's tick rings are.
 *
 * **`bipolar()` exists because p.16 says these knobs are a different shape.** "All AMOUNT knobs on
 * DFAM are bipolar, meaning that they have both positive (+) and negative (–) modulation values
 * available", and the panel silkscreens `(-)` and `(+)` at the ends of each with centre detented.
 * Writing one of those as `67 % travel` would be true and useless at the machine; `+34 % travel`
 * is the same knob position said in the panel's own terms. It claims no more than `travel()` does
 * — the point is uncited, the range is uncited, and mood cannot touch it.
 *
 * ## Two switches whose scale another switch replaces
 *
 * CLAUDE.md's warning about a cited range being the *wrong* range applies here twice, and both
 * are handled the way the TR-8S and the minilogue xd handle theirs — by carrying the switch in the
 * recipe so the pairing cannot come apart:
 *
 *  - **`CUTOFF`'s 20 Hz-20 kHz is a manual-sweep range and says nothing about direction.** p.18
 *    describes the knob's effect twice, once for LOW PASS and once for HIGH PASS, and they are
 *    opposite. Every recipe therefore carries `VCF` beside `CUTOFF`.
 *  - **`RESONANCE` is not the same control in the two filter modes.** p.18: "In HIGH PASS mode,
 *    the RESONANCE knob does not have the same scaling as in LOW PASS mode." It has no cited range
 *    either way, so nothing here is dialled off the wrong scale — but the note is why `VCF` sits
 *    beside it too, and why the `self-oscillate` hint is written for LOW PASS specifically (p.18:
 *    "Resonance settings above 3 O'clock in LOW PASS mode will cause the Filter to self oscillate").
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The manual, by **printed** page — which is the PDF page here. See the header note. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Moog DFAM Owner’s Manual, p.${page}` }
}

/** §2.6/#22. Jack citations are recorded here and merged into `capabilityEvidence` below. */
const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

/**
 * A declared patch point (§3.3). The page is where the manual describes *this jack*.
 *
 * Generic in `Id` for the Cascadia's reason: the obvious `(id: string)` signature widens every id
 * the moment it is written, which would make `DfamJack` below `string` and turn `cable()`'s
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
 * §3.3. All twenty-four patch points, each cited on the page that describes it.
 *
 * The whole patchbay is declared rather than the subset the recipes reach for: a partial list
 * reads as a claim that the rest do not exist, and p.40 states the complement exactly — 24 jacks,
 * 15 in, 9 out. The order is the panel's own, read down each of the three columns in turn off the
 * drawing on p.38 and cross-checked against the figure on p.24.
 *
 * ## This box forms no voice-control bundle, and that is the right answer for it
 *
 * §3.3's pass pairs a section's sole `pitch-cv` socket with its sole `gate` socket. Under the
 * `IN ·` / `OUT ·` legend the whole patchbay is one section, so the pass would pair
 * `IN · VCO 1 CV` with whichever `gate` input sorts first by code unit — and on this panel that is
 * `IN · RUN / STOP`, the transport input, not `IN · TRIGGER`, the one p.24 calls out as "useful
 * when connecting to external sequencers". The Mother-32 has the same shape and gets the right
 * answer by alphabet: its note gate is `IN · GATE`, and `G` sorts ahead of its three
 * transport gates. That is luck, and it does not hold here.
 *
 * **The declarations below are the manual's, and they happen to close the hole rather than open
 * it.** `IN · TRIGGER` is `['gate', 'trigger']` because p.24 says "0 to +5V Pulse or Gate signal" —
 * both, in one sentence — and a socket carrying two kinds is never a bundle member, which is the
 * same rule that keeps the clock cable out of this pass. `IN · RUN / STOP` is a sole `gate`
 * (p.29's own heading is "RUN / STOP (GATE INPUT)"), so it is the section's only candidate, and
 * `bundles()` needs a pitch *and* a gate from one section — which it has. **So a bundle does
 * form, on the transport jack.** That is recorded here rather than engineered away: nothing in
 * this file is declared for the effect it has on the pass, and the fix is not a manifest's to
 * make.
 *
 * What makes it survivable is point 3 of the header note: Moog's own answer to connecting this box
 * is a clock cable into `IN · ADV / CLOCK`, which §7.4 decides and which this pass never touches.
 * The voice-control pairing is a second-best the manual never suggests, and if a guide ever prints
 * it, it will be printing a patch that works — the sequencer runs while the gate is high and
 * VCO 1 tracks the pitch — under a sentence that oversells what it is.
 */
const JACKS = [
  // -- column 1, top to bottom (p.38's drawing; each cited on its own page) -----------
  jack('IN · TRIGGER', 'in', ['gate', 'trigger'], 24, {
    note: 'Fires all three envelopes at the current step’s velocity without advancing the sequencer. 0 to +5 V, 10 V tolerant',
  }),
  jack('IN · VELOCITY', 'in', ['cv'], 25, {
    note: 'Normalled to the VELOCITY 1-8 knobs; sets the amplitude of all three envelopes. 0 to +5 V',
  }),
  jack('IN · EXT AUDIO', 'in', ['audio'], 25, {
    note: 'Replaces the noise generator in the mixer. Unity gain at Eurorack level — expects about 10 V peak to peak',
  }),
  jack('IN · NOISE LEVEL', 'in', ['cv'], 26, {
    note: 'Added to the NOISE / EXT LEVEL knob, so it can clip. 0 to +8 V',
  }),
  jack('IN · VCF MOD', 'in', ['cv'], 27, {
    note: 'Replaces noise as the filter’s modulation source; the only direct CV on cutoff. ±5 V',
  }),
  jack('IN · 1→2 FM AMT', 'in', ['cv'], 28, {
    note: 'Summed with the 1→2 FM AMOUNT knob. 0 to +8 V',
  }),
  jack('IN · TEMPO', 'in', ['cv'], 28, {
    note: '1 V/octave over the sequencer clock, summed with the TEMPO knob, up to audio rates. ±5 V',
  }),
  jack('OUT · TRIGGER', 'out', ['clock', 'trigger'], 29, {
    clock: ['analog-clock'],
    note: 'A pulse per sequencer note, roughly 1 ms wide, 0 to +5 V — p.30 syncs a second DFAM from exactly this jack',
  }),

  // -- column 2 ----------------------------------------------------------------------
  jack('IN · VCA CV', 'in', ['cv'], 24, {
    note: 'Summed with the internal VCA EG, so it can clip the VCA. 0 to +8 V',
  }),
  jack('IN · VCA DECAY', 'in', ['cv'], 25, {
    note: 'Summed with the VCA DECAY knob; set the knob to centre for the widest external range. ±5 V',
  }),
  jack('IN · VCF DECAY', 'in', ['cv'], 26, {
    note: 'Summed with the VCF DECAY knob; set the knob to centre for the widest external range. ±5 V',
  }),
  jack('IN · VCO DECAY', 'in', ['cv'], 26, {
    note: 'Summed with the VCO DECAY knob; set the knob to centre for the widest external range. ±5 V',
  }),
  jack('IN · VCO 1 CV', 'in', ['pitch-cv'], 27, {
    note: '1 V/octave on oscillator 1. For accurate tracking set VCO 1 FREQUENCY and VCO 1 EG AMOUNT to centre and SEQ PITCH MOD away from VCO 1&2',
  }),
  jack('IN · VCO 2 CV', 'in', ['pitch-cv'], 28, {
    note: '1 V/octave on oscillator 2. For accurate tracking set VCO 2 FREQUENCY and VCO 2 EG AMOUNT to centre and SEQ PITCH MOD to OFF',
  }),
  jack('IN · RUN / STOP', 'in', ['gate'], 29, {
    note: 'The sequencer runs while +5 V is applied and stops at 0 V. A clock here advances steps but does not sync the internal clock',
  }),
  jack('OUT · VELOCITY', 'out', ['cv'], 29, {
    note: 'The current step’s VELOCITY knob as a voltage. 0 to +5 V',
  }),

  // -- column 3 ----------------------------------------------------------------------
  jack('OUT · VCA', 'out', ['audio'], 25, {
    note: 'The main audio output of the internal VCA, after the VOLUME knob. ±5 V at Eurorack level',
  }),
  jack('OUT · VCA EG', 'out', ['cv'], 25, {
    note: 'A copy of the VCA’s own control voltage, set by the VELOCITY knobs, VCA DECAY and the VCA EG switch. 0 to +8 V',
  }),
  jack('OUT · VCF EG', 'out', ['cv'], 26, {
    note: 'A copy of the filter envelope, set by the VELOCITY knobs and VCF DECAY. 0 to +8 V',
  }),
  jack('OUT · VCO EG', 'out', ['cv'], 27, {
    note: 'A copy of the pitch envelope, set by the VELOCITY knobs and VCO DECAY. 0 to +8 V',
  }),
  jack('OUT · VCO 1', 'out', ['audio', 'cv'], 27, {
    note: 'Oscillator 1 direct, before the mixer — a sound source or a modulation source. ±5 V',
  }),
  jack('OUT · VCO 2', 'out', ['audio', 'cv'], 28, {
    note: 'Oscillator 2 direct, before the mixer — a sound source or a modulation source. ±5 V',
  }),
  jack('IN · ADV / CLOCK', 'in', ['clock', 'trigger'], 29, {
    clock: ['analog-clock'],
    note: 'One step per rising edge, and the TEMPO knob is then ignored. This is the hole p.30 and p.31 both patch into. 0 to +5 V, 10 V tolerant',
  }),
  jack('OUT · PITCH', 'out', ['pitch-cv'], 29, {
    note: 'The current step’s PITCH knob as a voltage, ±5 V over roughly ten octaves (p.22)',
  }),
  // `satisfies` rather than `as const`, which is the Mother-32's idiom and matters twice: it
  // type-checks every entry against `JackSpec` here, where the error points at the offending
  // jack, and it leaves the array mutable so the manifest can assign it without a cast. `as const`
  // makes it `readonly` and forces one.
] satisfies JackSpec[]

/** Every declared jack id, as a union of literals, so `cable()` catches a typo at compile time. */
export type DfamJack = (typeof JACKS)[number]['id']

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
 * it. A travel figure is somebody's taste, and mood arithmetic on top of taste inside bounds
 * nobody checked would be arithmetic dressed as authority.
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

/**
 * A **bipolar** knob position, as percent of travel either side of a detented centre.
 *
 * p.16: "All AMOUNT knobs on DFAM are bipolar, meaning that they have both positive (+) and
 * negative (–) modulation values available", and the panel prints `(-)` and `(+)` at the ends of
 * each. `0` is centre and means *no modulation at all*, which p.15 and p.19 both flag as the
 * setting that makes the matching DECAY knob appear broken — so it is a value worth being able to
 * write exactly rather than approximating as "50% travel".
 *
 * Uncited on both claims and mood-inert, exactly like `travel()`. The sign is the panel's; the
 * number is taste.
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
 * `false`; the cables the manual's own TIPs instruct carry the page that instructs them.
 */
function cable(
  from: DfamJack,
  to: DfamJack,
  note: string,
  instructedOn?: number,
): PatchEntry {
  return { from, to, note, verified: instructedOn === undefined ? false : cite(instructedOn) }
}

// ---------------------------------------------------------------------------
// Option sets (§3.2) — every one printed on the panel and explained on a page
// ---------------------------------------------------------------------------

/** p.13. Two waveforms per oscillator, and the page describes each one's use. */
const WAVE = ['TRIANGLE', 'SQUARE'] as const

/** p.15. The panel prints all three positions: `VCO 1&2`, `OFF`, `VCO 2`. */
const SEQ_PITCH_MOD = ['VCO 1&2', 'OFF', 'VCO 2'] as const

/** p.17. The panel prints `LP` and `HP` beside the switch. */
const VCF_MODE = ['LP', 'HP'] as const

/** p.20. `FAST` is a 1 ms attack; the page names the figure for that position only. */
const VCA_ATTACK = ['FAST', 'SLOW'] as const

/** p.14. */
const HARD_SYNC = ['ON', 'OFF'] as const

// ---------------------------------------------------------------------------
// Cited ranges (§3.1) — the only two knobs mood may move
// ---------------------------------------------------------------------------

/** p.18: "The Filter CUTOFF knob can be set manually from 20Hz to 20kHz". */
const CUTOFF_HZ = { min: 20, max: 20000 }

/** p.19: "VCF Decay times range from 10ms to 10 seconds". */
const VCF_DECAY_MS = { min: 10, max: 10000 }

// ---------------------------------------------------------------------------
// The voice, as one block of knobs
// ---------------------------------------------------------------------------

type VoiceOpts = {
  /** Oscillator 1: position, waveform, mixer level. */
  freq1: number
  wave1: (typeof WAVE)[number]
  level1: number
  /** Oscillator 2. Defaults to silent, which is a real setting on this box. */
  freq2?: number
  wave2?: (typeof WAVE)[number]
  level2?: number
  /** The third mixer channel: white noise, or whatever is in EXT AUDIO. */
  noise?: number
  /** The filter, and the switch its two knobs are only meaningful against. */
  mode: (typeof VCF_MODE)[number]
  cutoff: number
  /** Mood offset on `CUTOFF`, in hertz. One of only two mood-legal knobs on this panel. */
  darkness?: number
  resonance?: number
  /** The filter envelope: a cited decay, and a bipolar amount that may be zero. */
  vcfDecay: number
  /** Mood offset on `VCF DECAY`, in milliseconds. The other mood-legal knob. */
  space?: number
  vcfEgAmount?: number
  /** The amplitude envelope. p.21 gives no numbers, so the decay is travel. */
  attack: (typeof VCA_ATTACK)[number]
  vcaDecay: number
  /** The pitch envelope, shared by both oscillators, with a bipolar amount each. */
  vcoDecay?: number
  egAmount1?: number
  egAmount2?: number
  /** Where the eight PITCH knobs are pointed. `OFF` is what makes an unpitched hit. */
  seqPitch: (typeof SEQ_PITCH_MOD)[number]
  hardSync?: (typeof HARD_SYNC)[number]
  fm?: number
  noiseVcfMod?: number
  volume?: number
}

/**
 * The panel in one call, in the order a reader works across it: oscillators, mixer, filter,
 * amplifier, then the two things that route between them.
 *
 * Every recipe emits the full set rather than the subset it cares about, because this is a patch
 * to be dialled at the machine from wherever the previous patch left the knobs — §8 is read
 * standing at the box, and a parameter list that silently means "leave that one alone" is a list
 * that produces a different sound for every reader.
 */
function voice(o: VoiceOpts): AuthoredParam[] {
  return [
    travel('VCO 1 FREQUENCY', o.freq1),
    pick('VCO 1 WAVE', o.wave1, WAVE, cite(13)),
    travel('VCO 1 LEVEL', o.level1),
    travel('VCO 2 FREQUENCY', o.freq2 ?? 50),
    pick('VCO 2 WAVE', o.wave2 ?? 'TRIANGLE', WAVE, cite(13)),
    travel('VCO 2 LEVEL', o.level2 ?? 0),
    travel('NOISE / EXT LEVEL', o.noise ?? 0),
    pick('VCF', o.mode, VCF_MODE, cite(17)),
    num('CUTOFF', o.cutoff, CUTOFF_HZ, cite(18), {
      unit: 'Hz',
      ...(o.darkness === undefined ? {} : { mood: [{ axis: 'darkness', amount: o.darkness }] }),
    }),
    travel('RESONANCE', o.resonance ?? 20, {
      ...(o.mode === 'LP' && (o.resonance ?? 20) >= 70 ? { hint: 'self-oscillate' } : {}),
    }),
    num('VCF DECAY', o.vcfDecay, VCF_DECAY_MS, cite(19), {
      unit: 'ms',
      ...(o.space === undefined ? {} : { mood: [{ axis: 'space', amount: o.space }] }),
    }),
    bipolar('VCF EG AMOUNT', o.vcfEgAmount ?? 0),
    pick('VCA EG', o.attack, VCA_ATTACK, cite(20)),
    travel('VCA DECAY', o.vcaDecay),
    travel('VCO DECAY', o.vcoDecay ?? 20),
    bipolar('VCO 1 EG AMOUNT', o.egAmount1 ?? 0),
    bipolar('VCO 2 EG AMOUNT', o.egAmount2 ?? 0),
    pick('SEQ PITCH MOD', o.seqPitch, SEQ_PITCH_MOD, cite(15), {
      ...(o.seqPitch === 'OFF' ? { hint: 'seq-pitch-off' } : {}),
    }),
    pick('HARD SYNC', o.hardSync ?? 'OFF', HARD_SYNC, cite(14)),
    travel('1→2 FM AMOUNT', o.fm ?? 0),
    travel('NOISE / VCF MOD', o.noiseVcfMod ?? 0),
    travel('VOLUME', o.volume ?? 70),
  ]
}

/** How this box is driven, said once per recipe. p.30 and p.31 are both this sentence. */
const CLOCKED =
  'Plays its own 8-step analog sequencer. Clock it at ADV / CLOCK — one step per rising edge, and the TEMPO knob is then ignored'

/**
 * §4.3. **Velocity is per step here, so every articulation this box has is one knob at a
 * different position.** There is no accent button and no ghost lane — p.22's VELOCITY 1-8 knobs
 * are the entire dynamic vocabulary, and "Try varying Velocity values between steps on any
 * sequence for a more lifelike behavior" is the manual's own instruction for using them.
 *
 * **Which slots each recipe carries is decided per recipe, by #108's reachability walk, not by a
 * shared list.** The obvious authoring — one `accent` + `ghost` pair on all twenty-one — is
 * wrong, and quietly so: `sub`/`dark` is never emitted with an `accent`, and `ghost` is
 * unreachable for eight of these role-and-character pairs. Nine recipes were written that way
 * first and `test/reachability.test.ts` caught every one. The slot sets below are what the
 * templates actually emit for each pair, which is why `metallic` ends on `last-hit` and `tom` on
 * `fill` where the drums take `ghost`.
 *
 * Two recipes carry **no** articulation at all — `dfam-snare-dirty` and `dfam-sweep-soft` — because
 * no shipped template emits those pairs in any slot. The recipes stay: a template that asks for a
 * dirty snare later will find one. An articulation entry on them would be a gesture no guide can
 * ever print, which is the thing #108 exists to refuse.
 */
const ACCENT = { slot: 'accent' as const, set: { velocity: 88 }, hint: 'velocity-step' }
const GHOST = { slot: 'ghost' as const, set: { velocity: 34 }, hint: 'velocity-step' }
const FILL = { slot: 'fill' as const, set: { velocity: 76 }, hint: 'velocity-step' }
const LAST_HIT = { slot: 'last-hit' as const, set: { velocity: 96 }, hint: 'velocity-step' }
const FIRST_HIT = { slot: 'first-hit' as const, set: { velocity: 100 }, hint: 'velocity-step' }

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const RECIPES: Recipe[] = [
  // ---- low ---------------------------------------------------------------------------
  {
    id: 'dfam-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'voice',
    title: 'Square kick with the pitch envelope doing the whole thump',
    routing: `${CLOCKED}. No patch cable: the VCO envelope is normalled to both oscillators and VCO 1 EG AMOUNT is the only thing that decides how far the pitch falls`,
    params: voice({
      freq1: 22,
      wave1: 'SQUARE',
      level1: 82,
      mode: 'LP',
      cutoff: 320,
      darkness: -120,
      resonance: 34,
      vcfDecay: 90,
      space: 40,
      vcfEgAmount: 26,
      attack: 'FAST',
      vcaDecay: 26,
      vcoDecay: 16,
      egAmount1: 46,
      seqPitch: 'VCO 1&2',
      volume: 76,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'voice',
    title: 'Triangle kick, filter almost shut, the tail allowed to ring',
    routing: `${CLOCKED}. p.19: at 12 o'clock the VCF decay "is useful for allowing the decay of kick drums, toms, and other sounds to ring through naturally"`,
    params: voice({
      freq1: 18,
      wave1: 'TRIANGLE',
      level1: 86,
      mode: 'LP',
      cutoff: 180,
      darkness: -70,
      resonance: 22,
      vcfDecay: 260,
      space: 90,
      vcfEgAmount: 14,
      attack: 'FAST',
      vcaDecay: 36,
      vcoDecay: 22,
      egAmount1: 32,
      seqPitch: 'VCO 1&2',
      volume: 74,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'voice',
    title: 'Kick with noise shaking the filter, mixer pushed into clipping',
    routing: `${CLOCKED}. p.16 warns that high mixer levels "produce a more aggressive and clipped sound" on this all-analog path — here that is the point`,
    params: voice({
      freq1: 24,
      wave1: 'SQUARE',
      level1: 95,
      noise: 28,
      mode: 'LP',
      cutoff: 420,
      darkness: -150,
      resonance: 58,
      vcfDecay: 120,
      space: 45,
      vcfEgAmount: 34,
      attack: 'FAST',
      vcaDecay: 28,
      vcoDecay: 14,
      egAmount1: 52,
      seqPitch: 'VCO 1&2',
      noiseVcfMod: 30,
      volume: 78,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'voice',
    title: 'Sub with both envelopes flat, so only the sequencer moves the pitch',
    routing: `${CLOCKED}. p.15: with the VCO EG AMOUNT knobs at centre "no Pitch Modulation will occur", which the page calls "quite useful for creating sequenced bass lines"`,
    params: voice({
      freq1: 10,
      wave1: 'TRIANGLE',
      level1: 90,
      mode: 'LP',
      cutoff: 150,
      darkness: -60,
      resonance: 16,
      vcfDecay: 220,
      space: 70,
      vcfEgAmount: 0,
      attack: 'SLOW',
      vcaDecay: 44,
      vcoDecay: 20,
      egAmount1: 0,
      seqPitch: 'VCO 1&2',
      volume: 72,
    }),
    articulation: [GHOST],
    verified: false,
  },
  {
    id: 'dfam-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'voice',
    title: 'Sequenced bass line, square, filter tracking just above the fundamental',
    routing: `${CLOCKED}. p.13: the square wave is "useful for creating deep, hard-hitting bass sounds"`,
    params: voice({
      freq1: 28,
      wave1: 'SQUARE',
      level1: 84,
      mode: 'LP',
      cutoff: 480,
      darkness: -180,
      resonance: 30,
      vcfDecay: 180,
      space: 60,
      vcfEgAmount: 18,
      attack: 'SLOW',
      vcaDecay: 40,
      vcoDecay: 24,
      egAmount1: 0,
      seqPitch: 'VCO 1&2',
      volume: 72,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'voice',
    title: 'Bass with oscillator 2 folded in through linear FM',
    routing: `${CLOCKED}. p.14: turning 1→2 FM AMOUNT right increases the modulation of oscillator 2 by oscillator 1 — "complex, springy, bell-like, or aggressive" depending on where both are tuned`,
    params: voice({
      freq1: 26,
      wave1: 'SQUARE',
      level1: 62,
      freq2: 44,
      wave2: 'SQUARE',
      level2: 54,
      mode: 'LP',
      cutoff: 620,
      darkness: -200,
      resonance: 46,
      vcfDecay: 160,
      space: 55,
      vcfEgAmount: 24,
      attack: 'FAST',
      vcaDecay: 38,
      vcoDecay: 22,
      egAmount1: 0,
      seqPitch: 'VCO 1&2',
      fm: 44,
      volume: 70,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },

  // ---- backbeat ----------------------------------------------------------------------
  {
    id: 'dfam-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'voice',
    title: 'Snare from noise over a short square body, high-passed',
    routing: `${CLOCKED}. p.16: the white noise generator is "useful for creating snare drums and high-hats, and also for adding depth and attack to pitched percussion sounds"`,
    params: voice({
      freq1: 52,
      wave1: 'SQUARE',
      level1: 34,
      noise: 76,
      mode: 'HP',
      cutoff: 420,
      resonance: 30,
      vcfDecay: 90,
      space: 30,
      vcfEgAmount: 30,
      attack: 'FAST',
      vcaDecay: 24,
      vcoDecay: 14,
      egAmount1: 26,
      seqPitch: 'OFF',
      noiseVcfMod: 34,
      volume: 72,
    }),
    verified: false,
  },
  {
    id: 'dfam-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'voice',
    title: 'Snare with the body thinned right out and the noise on top',
    routing: `${CLOCKED}. p.17: high-pass mode is "ideal for crafting bright, thin, or snappier sounds"`,
    params: voice({
      freq1: 58,
      wave1: 'TRIANGLE',
      level1: 24,
      noise: 84,
      mode: 'HP',
      cutoff: 900,
      resonance: 24,
      vcfDecay: 60,
      space: 20,
      vcfEgAmount: 22,
      attack: 'FAST',
      vcaDecay: 20,
      vcoDecay: 12,
      egAmount1: 20,
      seqPitch: 'OFF',
      noiseVcfMod: 20,
      volume: 70,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-clap-hard',
    role: 'clap',
    character: 'hard',
    voice: 'voice',
    title: 'Clap: noise only, fast attack, decay just long enough to have a body',
    routing: `${CLOCKED}. p.21: a VCA decay around 9 o'clock is "useful for creating short blips, hits, and claps where a small portion of the body of a sound is desirable"`,
    params: voice({
      freq1: 50,
      wave1: 'SQUARE',
      level1: 0,
      noise: 92,
      mode: 'HP',
      cutoff: 700,
      resonance: 38,
      vcfDecay: 70,
      space: 25,
      vcfEgAmount: 34,
      attack: 'FAST',
      vcaDecay: 22,
      seqPitch: 'OFF',
      noiseVcfMod: 44,
      volume: 74,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },

  // ---- metal -------------------------------------------------------------------------
  {
    id: 'dfam-closed-hat-bright',
    role: 'closed-hat',
    character: 'bright',
    voice: 'voice',
    title: 'Tight hat: noise, high-passed, the shortest decay on the knob',
    routing: `${CLOCKED}. p.15 puts SEQ PITCH MOD at OFF for "droning and non-pitched percussion sounds like high-hats"; p.21 calls the minimum VCA decay "ideal for crafting short sounds with sharp attacks, such as tight hi-hats"`,
    params: voice({
      freq1: 64,
      wave1: 'SQUARE',
      level1: 12,
      noise: 88,
      mode: 'HP',
      cutoff: 3200,
      resonance: 26,
      vcfDecay: 30,
      space: 12,
      vcfEgAmount: 18,
      attack: 'FAST',
      vcaDecay: 8,
      seqPitch: 'OFF',
      noiseVcfMod: 24,
      volume: 66,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'voice',
    title: 'The same hat with the amplifier let go, so it rings instead of ticking',
    routing: `${CLOCKED}. One knob apart from the closed hat, which is what "open" means on a box with one voice: p.21's VCA decay is the whole difference`,
    params: voice({
      freq1: 64,
      wave1: 'SQUARE',
      level1: 12,
      noise: 88,
      mode: 'HP',
      cutoff: 3000,
      resonance: 28,
      vcfDecay: 240,
      space: 60,
      vcfEgAmount: 16,
      attack: 'FAST',
      vcaDecay: 42,
      seqPitch: 'OFF',
      noiseVcfMod: 26,
      volume: 66,
    }),
    articulation: [ACCENT, GHOST],
    verified: false,
  },
  {
    id: 'dfam-metallic-hard',
    role: 'metallic',
    character: 'hard',
    voice: 'voice',
    title: 'Hard sync and FM together: the sharp, clangorous end of this box',
    routing: `${CLOCKED}. p.14: hard sync is "useful for creating sharp, metallic, and flange-like sounds", and the page says the two oscillator interactions "can be utilized individually or at the same time"`,
    params: voice({
      freq1: 46,
      wave1: 'SQUARE',
      level1: 40,
      freq2: 72,
      wave2: 'SQUARE',
      level2: 72,
      mode: 'HP',
      cutoff: 1200,
      resonance: 42,
      vcfDecay: 140,
      space: 40,
      vcfEgAmount: 30,
      attack: 'FAST',
      vcaDecay: 26,
      vcoDecay: 18,
      egAmount2: 38,
      seqPitch: 'VCO 2',
      hardSync: 'ON',
      fm: 58,
      volume: 70,
    }),
    articulation: [ACCENT, LAST_HIT],
    verified: false,
  },
  {
    id: 'dfam-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'voice',
    title: 'Oscillator 2 patched into the filter, so pitch shakes the cutoff',
    routing: `${CLOCKED}. p.20's TIP verbatim: "Try patching out of VCO 2 into the VCF MOD input. With the NOISE / VCF MOD knob set at maximum, listen to how the Pitch of Oscillator 2 affects the sound of the Filter."`,
    params: voice({
      freq1: 42,
      wave1: 'SQUARE',
      level1: 58,
      freq2: 78,
      wave2: 'SQUARE',
      level2: 44,
      mode: 'HP',
      cutoff: 1600,
      resonance: 56,
      vcfDecay: 180,
      space: 50,
      vcfEgAmount: 22,
      attack: 'FAST',
      vcaDecay: 30,
      vcoDecay: 20,
      egAmount2: 30,
      seqPitch: 'VCO 2',
      fm: 34,
      noiseVcfMod: 100,
      volume: 70,
    }),
    patch: [
      cable(
        'OUT · VCO 2',
        'IN · VCF MOD',
        'Replaces white noise as the filter’s modulation source, so oscillator 2’s pitch shakes the cutoff instead',
        20,
      ),
    ],
    articulation: [ACCENT, LAST_HIT],
    verified: false,
  },
  {
    id: 'dfam-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'voice',
    title: 'Cymbal sizzle: noise on the filter, long decay, nothing pitched',
    routing: `${CLOCKED}. p.20: modulating cutoff from the noise generator is "useful for adding sizzle to cymbal sounds"`,
    params: voice({
      freq1: 70,
      wave1: 'SQUARE',
      level1: 18,
      freq2: 76,
      wave2: 'SQUARE',
      level2: 18,
      noise: 78,
      mode: 'HP',
      cutoff: 4200,
      resonance: 30,
      vcfDecay: 900,
      space: 200,
      vcfEgAmount: 12,
      attack: 'FAST',
      vcaDecay: 58,
      seqPitch: 'OFF',
      hardSync: 'ON',
      noiseVcfMod: 66,
      volume: 64,
    }),
    articulation: [ACCENT],
    verified: false,
  },

  // ---- body --------------------------------------------------------------------------
  {
    id: 'dfam-tom-soft',
    role: 'tom',
    character: 'soft',
    voice: 'voice',
    title: 'Triangle tom with the drum-head punch p.15 describes',
    routing: `${CLOCKED}. p.13: the triangle wave is "useful for crafting organic percussion sounds like toms or marimbas". p.15 puts the VCO decay at 9-10 o'clock for "the punch that occurs when a drum head is hit with a drum stick or beater"`,
    params: voice({
      freq1: 36,
      wave1: 'TRIANGLE',
      level1: 88,
      mode: 'LP',
      cutoff: 900,
      darkness: -280,
      resonance: 20,
      vcfDecay: 240,
      space: 70,
      vcfEgAmount: 16,
      attack: 'FAST',
      vcaDecay: 38,
      vcoDecay: 30,
      egAmount1: 34,
      seqPitch: 'VCO 1&2',
      volume: 72,
    }),
    articulation: [ACCENT, FILL],
    verified: false,
  },
  {
    id: 'dfam-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'voice',
    title: 'Tom with an exaggerated pitch spike and noise on the attack',
    routing: `${CLOCKED}. p.16: "larger values will result in more exaggerated and extreme sounds". The noise is p.16's other use for that channel — "adding depth and attack to pitched percussion sounds"`,
    params: voice({
      freq1: 40,
      wave1: 'TRIANGLE',
      level1: 80,
      noise: 34,
      mode: 'LP',
      cutoff: 1400,
      darkness: -420,
      resonance: 40,
      vcfDecay: 150,
      space: 45,
      vcfEgAmount: 28,
      attack: 'FAST',
      vcaDecay: 30,
      vcoDecay: 24,
      egAmount1: 64,
      seqPitch: 'VCO 1&2',
      volume: 74,
    }),
    articulation: [ACCENT, FILL],
    verified: false,
  },
  {
    id: 'dfam-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'voice',
    title: 'Noise alone, with the filter shaken by the same generator',
    routing: `${CLOCKED}. p.20: modulating cutoff from noise gives "dirty, distorted, or lo-fi sounds"`,
    params: voice({
      freq1: 50,
      wave1: 'SQUARE',
      level1: 0,
      noise: 100,
      mode: 'LP',
      cutoff: 2600,
      darkness: -900,
      resonance: 62,
      vcfDecay: 320,
      space: 90,
      vcfEgAmount: -24,
      attack: 'FAST',
      vcaDecay: 34,
      seqPitch: 'OFF',
      noiseVcfMod: 88,
      volume: 68,
    }),
    articulation: [ACCENT],
    verified: false,
  },
  {
    id: 'dfam-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'voice',
    title: 'Decays long enough to wash together, which p.21 calls drone-like',
    routing: `${CLOCKED}. p.21, past 12 o'clock: "Sounds begin to wash together in an almost drone-like manner, while retaining their individuality"`,
    params: voice({
      freq1: 34,
      wave1: 'TRIANGLE',
      level1: 66,
      freq2: 41,
      wave2: 'TRIANGLE',
      level2: 58,
      noise: 12,
      mode: 'LP',
      cutoff: 1100,
      darkness: -350,
      resonance: 44,
      vcfDecay: 2400,
      space: 700,
      vcfEgAmount: 14,
      attack: 'SLOW',
      vcaDecay: 78,
      vcoDecay: 40,
      egAmount1: 8,
      seqPitch: 'VCO 1&2',
      volume: 64,
    }),
    articulation: [ACCENT],
    verified: false,
  },

  // ---- tonal and transitional --------------------------------------------------------
  {
    id: 'dfam-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'voice',
    title: 'The eight steps played as a line rather than as a kit',
    routing: `${CLOCKED}. p.15: with both oscillators assigned, the PITCH knobs are "useful for creating sequenced bass and lead lines where Oscillator 1 and Oscillator 2 are tuned in unison". p.13 notes the oscillators "track pitch accurately over multiple octaves"`,
    params: voice({
      freq1: 62,
      wave1: 'SQUARE',
      level1: 70,
      freq2: 62,
      wave2: 'TRIANGLE',
      level2: 46,
      mode: 'LP',
      cutoff: 3400,
      darkness: -1100,
      resonance: 52,
      vcfDecay: 200,
      space: 60,
      vcfEgAmount: 30,
      attack: 'FAST',
      vcaDecay: 40,
      vcoDecay: 18,
      egAmount1: 0,
      seqPitch: 'VCO 1&2',
      volume: 70,
    }),
    articulation: [ACCENT],
    verified: false,
  },
  {
    id: 'dfam-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'voice',
    title: 'One hit with everything open: the loudest thing this box does',
    routing: `${CLOCKED}. p.21 at 10 o'clock is "ideal for short, but hard-hitting thumps"; the resonance here is p.18's self-oscillation territory, which adds a sine on top of the hit`,
    params: voice({
      freq1: 20,
      wave1: 'SQUARE',
      level1: 96,
      noise: 46,
      mode: 'LP',
      cutoff: 700,
      darkness: -240,
      resonance: 78,
      vcfDecay: 420,
      space: 120,
      vcfEgAmount: 44,
      attack: 'FAST',
      vcaDecay: 46,
      vcoDecay: 26,
      egAmount1: 70,
      seqPitch: 'VCO 1&2',
      noiseVcfMod: 36,
      volume: 82,
    }),
    articulation: [FIRST_HIT],
    verified: false,
  },
  {
    id: 'dfam-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'voice',
    title: 'A filter sweep by hand: the cutoff knob is the gesture',
    routing: `${CLOCKED}. p.19 calls a VCF decay at 12 o'clock "a more natural sweep of the Filter", and p.19's TIP: "Turning the RESONANCE knob to the right will exaggerate any modulation of the Filter's Cutoff Frequency"`,
    params: voice({
      freq1: 44,
      wave1: 'SQUARE',
      level1: 58,
      freq2: 51,
      wave2: 'SQUARE',
      level2: 44,
      noise: 20,
      mode: 'LP',
      cutoff: 1800,
      darkness: -600,
      resonance: 72,
      vcfDecay: 1600,
      space: 500,
      vcfEgAmount: 40,
      attack: 'SLOW',
      vcaDecay: 66,
      vcoDecay: 34,
      seqPitch: 'VCO 1&2',
      volume: 66,
    }),
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

/**
 * **One voice.** p.40's ANALOG SOUND ENGINE row names three sources — "VCO 1, VCO 2, White Noise
 * Generator" — and one of everything after them: one filter, one VCA, three envelopes that all
 * fire together. Three sources are not three voices; they are a mixer feeding one signal path,
 * which p.7's signal-flow diagram draws as a single line from MIX to VCF to VCA to OUT.
 *
 * **What the manual names, this box is offered for.** Every role below is one the document calls
 * by name on a page, which is a stricter bar than "the hardware could do it" and the bar the
 * Mother-32's `snare` was decided on. `closed-hat` and `open-hat` are the clearest case: the
 * Mother-32's manifest reasons its way *out* of hats on a box with the same one voice and one
 * envelope, and it is right to — nothing in that manual suggests them. Here p.15 names "high-hats"
 * as what SEQ PITCH MOD's OFF position is for, p.21 names "tight hi-hats" as what the minimum VCA
 * decay is for, and p.33 ships a factory preset called QUICK HATS. That is Moog authoring hats on
 * this instrument, not this library guessing.
 *
 * `lead` is on the list for the same reason and is worth flagging as the surprising one: p.15 says
 * the PITCH knobs are "useful for creating sequenced bass and lead lines", and p.13 says the
 * oscillators "track pitch accurately over multiple octaves, allowing your DFAM to be utilized for
 * a wide range of musical applications beyond percussive sounds alone". A percussion box that says
 * twice it is not only a percussion box.
 */
const VOICE_ROLES: Role[] = [
  'kick',
  'sub',
  'bass-mid',
  'snare',
  'clap',
  'closed-hat',
  'open-hat',
  'ride',
  'metallic',
  'tom',
  'noise',
  'texture',
  'lead',
  'impact',
  'sweep',
]

/**
 * Roles this box is **not** offered for, since a list invites the question.
 *
 * **`pad` and `stab` are the hardware answer, and they differ from the Mother-32's.** That box
 * declares both, on the argument that a one-note stab is still a stab and that its SUSTAIN switch
 * gives a pad a tail. This one has neither: p.40's MODULATION row lists three envelopes and every
 * one of them is described as a *decay* — "VCO EG with Voltage Controlled Decay, VCF EG with
 * Voltage Controlled Decay Time, VCA EG with with Voltage Controlled Decay Time and selectable
 * Attack Time". There is no sustain stage anywhere on this instrument, so a held chord has nothing
 * to hold. The longest thing it does is p.21's "almost drone-like", which is `texture`.
 *
 * **`riser` needs something to rise over and there is nothing.** The box has no LFO — p.40's
 * modulation row is the three envelopes and nothing else — and the longest envelope in the
 * document is the VCF's ten seconds (p.19). A multi-bar rise would have to come from outside, and
 * inventing it here is the thing invariant 5 forbids.
 *
 * `rim` and `ghost-perc` — no page names either, and the sounds p.21 lists nearest to them
 * ("short blips, hits, and claps") are already claimed by `clap`. `acid` — the ladder filter and
 * the 1 V/octave inputs would do it and no page says so, so declaring it would be this library's
 * claim rather than Moog's. `arp` — there is no arpeggiator, and an 8-step analog sequencer is not
 * one. `vox-chop` — no sampler and no audio memory of any kind.
 */

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'moog-dfam',
  name: 'DFAM',
  maker: 'Moog',
  kind: 'semi-modular',

  /**
   * **Analog clock in both directions, and nothing else on the instrument.**
   *
   * *Send.* `OUT · TRIGGER`, p.29: "This output provides a pulse derived from the Sequencer Clock
   * that can be used as a clock source for synchronizing to other instruments" — 0 to +5 V, about
   * 1 ms wide. p.30 is a whole chapter using exactly that jack to drive a second DFAM.
   *
   * *Receive.* `IN · ADV / CLOCK`, p.29: "This input allows the DFAM to be synchronized to an
   * external clock source such as another DFAM or a Mother-32." One step per rising edge.
   *
   * **No `sendTransport` or `receiveTransport`, because there is nothing to say.** §2.3's two
   * direction lists exist for a box whose directions differ, and the sibling Mother-32 is exactly
   * that box — it takes MIDI clock and can only send analog. This one has no MIDI connector at
   * all, so both directions are the same single transport and declaring them would restate
   * `transport` twice. A box states an asymmetry only when it has one.
   *
   * **No `sourceSetup`, and that is a real absence rather than an unresearched one.** #104's field
   * is for a clock output behind a setting; this one is behind nothing. p.29 says the trigger goes
   * out every time the sequencer plays a note — "Each time a new note is played via the sequencer,
   * a +5V Trigger signal is output both to DFAMs Envelope Generators and to the TRIGGER output
   * jack" — with no menu, no switch and no assignment. The Mother-32's identical-looking jack does
   * need one, because its ASSIGN output has sixteen possible sources; this one has no such choice.
   *
   * `preferredSource` is **not** claimed, and the pages that look like evidence for it are
   * recorded in `capabilityEvidence` below rather than in this sentence (§2.6/#120).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['analog-clock'],
  },

  /**
   * **One mono output, and the patchbay's audio jacks are not extra channels.**
   *
   * p.40's REAR PANEL row is one audio line: `1/4" TRS Headphone or 1/4" TS Instrument`. p.5 has
   * the reader "plug one end of a 1/4" TS instrument cable" into it. That is the whole mixer
   * story, so `individualOuts: 0`.
   *
   * `OUT · VCA`, `OUT · VCO 1` and `OUT · VCO 2` are declared jacks carrying audio and are *not*
   * counted here, exactly as the Mother-32's `OUT · VCA` is not. An individual out is a channel
   * you take to a desk alongside the main; a 3.5 mm Eurorack-level patch point is a modular
   * connection, and counting it would tell a reader to run three channels off a box that has one
   * quarter-inch jack.
   *
   * `audioIn` is `EXT AUDIO` (p.25), which replaces the noise generator in the mixer rather than
   * adding a channel. No USB port exists anywhere on the instrument, so `usbAudio: false`.
   */
  io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 319.3 mm across, cheeks included — the same enclosure as the Mother-32, and read off
   * a different manual's drawing to the same tenth of a millimetre. p.40's `SIZE (W X D X H)`
   * gives `12.57" x 4.21" x 5.24`, and unlike the sibling's table its axis letters are right.
   * See `panel.ts` for the aspect check that confirms it.
   */
  physical: {
    panelSpanMm: 319.3,
    verified: cite(40),
  },

  /** §10. A simplified original drawing of the panel, read off p.38 (see `panel.ts`). */
  panel: DFAM_PANEL,

  /** §3.3. Declared once, cited once, referenced by the recipes above. */
  /**
   * §10/#263. **Warm-up**, cited. p.6: *"Your DFAM is an all-analog instrument and should be
   * allowed a few minutes to warm up before use"* — the same sentence Moog print for the
   * Subharmonicon and the Mother-32, and the same answer: no `minutes`, because "a few" is not a
   * number and inventing one would look exactly like the entries that state a real figure.
   */
  warmUp: {
    note: 'A few minutes from cold before it holds pitch',
    verified: cite(6),
  },

  jacks: JACKS,

  /**
   * §2.6/#22. Every jack above, cited on the page that describes it, plus the scalar facts.
   *
   * **`clock.preferredSource` is `unknown`, and the reading behind that is worth recording.** This
   * box has two chapters about driving other gear — p.30 syncs a second DFAM from its TRIGGER
   * output, p.31 syncs it *to* a Mother-32 — and the second one puts this box on the receiving end
   * of the cable. p.7's DFAM OVERVIEW calls it "a vibrant deviation from the traditional drum
   * machine" and "an addition to the Mother-32 family", which is what it is rather than what its
   * job in a rig is. §7.4 does not admit a `canSendClock` page as evidence here, and p.30 is
   * exactly that: a page proving the jack works, in a chapter about two of these rather than about
   * leading a studio. So no page states that driving a rig is this box's job.
   *
   * **`features.lfo` is `cited-against`.** p.40's MODULATION row enumerates this instrument's
   * modulation sources — "VCO EG with Voltage Controlled Decay, VCF EG with Voltage Controlled
   * Decay Time, VCA EG with with Voltage Controlled Decay Time and selectable Attack Time" — and
   * an LFO is not among them. That is a specifications table answering the question rather than a
   * silence, which is why this is `cited-against` where the Mother-32's sidechain reading is
   * `unknown`. The nearest thing on the panel is the noise generator wired to the filter, which is
   * modulation but is not an oscillator anybody can set a rate on.
   *
   * `features.sidechain.fromExternalAudio` is the other reading: this box takes external audio at
   * `EXT AUDIO` (p.25) and none of the patchbay's nine outputs is an envelope follower or a
   * rectifier, so nothing here can derive a control voltage from an incoming signal and duck to
   * it — but no page states that either way, so this is a reading of the jack list rather than an
   * answer the document gives.
   */
  /**
   * §2.6/#142. **Nothing on this box sets how long a step sounds**, and p.22 says so by
   * enumerating rather than by omission — which is the difference between a finding and an
   * assumption. STEP CONTROLS: *"Each Sequencer step (1—8) features a PITCH knob, a VELOCITY
   * knob, and an LED that indicates the currently active step."* Two knobs and a light. No gate,
   * no length, no tie, no rest.
   *
   * What ends the note is the amplitude envelope, which is decay-only — there is no sustain stage
   * for a gate to release. p.21: *"The third and final Envelope Generator in your DFAM is
   * dedicated to modulating the Output volume of the VCA. The Decay time of this EG is set using
   * the VCA DECAY knob."* One knob for all eight steps.
   *
   * Both pages are in the citation because the claim needs both halves and neither carries it
   * alone: p.22 establishes that a step has no duration, p.21 names what decides it instead. The
   * first reading cited p.20 — the VCA section's opening — and quoted the knob from p.21, which
   * is a page reference and a fact from two different pages (§2.5).
   *
   * A step's velocity nudges it (p.22: *"steps with higher Velocity values may cause the Envelope
   * Generators to have slightly longer Decay times"*), and that is a side effect of level rather
   * than a duration anybody enters. It is not what this field is about.
   */
  noteDuration: {
    kind: 'trigger',
    reason: 'the VCA envelope decides, and `VCA DECAY` is the one knob that sets it',
  },

  capabilityEvidence: {
    noteDuration: { kind: 'manual', source: 'Moog DFAM Owner’s Manual, p.21, p.22' },
    ...JACK_EVIDENCE,
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.7’s DFAM OVERVIEW calls this box "a vibrant deviation from the traditional drum machine" and "an addition to the Mother-32 family of Semi-Modular Analog Synthesizers", which is what it is rather than its job in a rig’s topology. The two chapters about connecting it point the other way if anything: p.30 syncs a second DFAM from the TRIGGER output, and p.31 syncs this box *to* a Mother-32, putting it on the receiving end. p.30 proves the jack sends clock, and §7.4 does not admit a canSendClock page here. There is no chapter about driving external gear and no table-of-contents entry for one, so no page states what this box is for in a rig',
    },
    voices: cite(40),
    'features.perStep': cite(22),
    'features.lfo': {
      kind: 'cited-against',
      cite: cite(40),
      reason:
        'p.40’s MODULATION row enumerates this instrument’s modulation sources — the VCO, VCF and VCA envelope generators, each with voltage controlled decay — and no LFO appears in it or anywhere else in the document. The noise generator can be routed to the filter (p.20), which is modulation without being an oscillator with a rate',
    },
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'the box takes external audio at EXT AUDIO (p.25) and none of the patchbay’s nine outputs is an envelope follower or a rectifier, so nothing here can derive a control voltage from an incoming signal and duck to it — but no page states that either way, so this is a reading of the jack list rather than an answer the document gives',
    },
  },

  /** One voice, monophonic by p.40's single signal path. See `VOICE_ROLES` above. */
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: VOICE_ROLES, polyphony: 1 }],

  /**
   * One assignable exists, so one is the most that can ever be occupied (§12.4). Written out
   * rather than left to default — which would also give 1 — so the claim is visible, and because
   * the day this box gains a second assignable is the day the two numbers stop agreeing.
   */
  comfortableVoices: 1,

  /**
   * **`perStep` is two knobs, and p.22 is the page that names them both**: "Each Sequencer step
   * (1—8) features a PITCH knob, a VELOCITY knob, and an LED that indicates the currently active
   * step."
   *
   * **Both are knobs with no printed scale, so both are percent of travel** in the articulation
   * entries above. p.22 does give voltages — the PITCH knobs span "roughly a 10-octave range (+/- 5
   * Volts)" and "The full range of each Velocity knob is 0 Volts to 5 Volts" — but those are what
   * the *jack* puts out, not a scale printed anywhere a reader can see while turning the knob. A
   * guide that said `velocity: 4.4 V` would be citing a real number off the wrong face of the
   * control.
   *
   * **The list is short because the sequencer is analog.** There is no accent, no rest, no tie, no
   * glide, no ratchet and no probability — there is a pitch knob and a velocity knob per step, and
   * that is the entire per-step vocabulary of this instrument. Where the Mother-32 declares six
   * lanes off its p.24, this box has two, and the difference is thirty years of sequencer design
   * rather than a gap in the reading.
   *
   * **`lfo` is not declared at all** — see `capabilityEvidence`, where p.40's modulation row is
   * recorded as answering the question rather than being silent on it.
   */
  features: {
    perStep: ['pitch', 'velocity'],
  },

  /** §8.1. Jogs, not documentation — every one under eight words. */
  hints: {
    'velocity-step': 'Turn that step’s VELOCITY knob',
    'seq-pitch-off': 'SEQ PITCH MOD at OFF leaves it unpitched',
    'self-oscillate': 'Past 3 o’clock in LP it self-oscillates',
    'break-normal': 'A cable here replaces the default',
    'trigger-step': 'TRIGGER fires the step without advancing',
  },

  manual: { title: 'DFAM Owner’s Manual', edition: 'Drummer From Another Mother' },

  recipes: RECIPES,
}
