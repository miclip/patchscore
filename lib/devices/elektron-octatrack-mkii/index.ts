import type { CapabilityEvidence, Device, JackSignalKind, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { OCTATRACK_MKII_PANEL } from './panel'

/**
 * Elektron Octatrack MKII (§2.3). Eight stereo audio tracks, each of which is whatever machine
 * you assign to it, a crossfader over sixteen scenes, and **a manual that prints almost no
 * numbers at all.**
 *
 * ## Eight audio tracks, and the eight MIDI tracks are not voices
 *
 * p.55, the first sentence of chapter 11: *"The Octatrack MKII sequencer can control 8 audio
 * stereo tracks and 8 MIDI tracks at the same time."* **At the same time** is the load-bearing
 * half, and it is what makes this box the opposite of the Digitakt II: there, sixteen tracks are
 * audio *or* MIDI and a MIDI track costs an audio track, so the manifest models one pool of
 * sixteen and writes the cost into `comfortableVoices`. Here the two sets coexist, and the
 * reason the MIDI tracks are absent from `voices` is the plain one — they make no sound. There
 * is no role a soundless track could serve and no assignable it could be. p.137's MIDI note map
 * says the same thing from the other side, listing `Audio Track 1-8 Sample Trigger` and
 * `MIDI Track 1-8 Play` as two separate blocks of notes.
 *
 * **Polyphony 1 is this manifest's reading, not a printed line**, which is why `voices` carries
 * a `partly` rather than a citation (§2.6/#236). p.55 gives the count and gives it plainly. No
 * page anywhere states how many samples one audio track can sound at once — the word
 * "polyphony" does not occur in the document — and the architecture is what settles it: a track
 * holds one machine, a machine holds one sample (Appendix A, pp.117-121), and p.137's chromatic
 * map moves *the* track sample rather than adding a second. So a chord asked for as three
 * simultaneous notes is not reachable by any patch here, and the way out is §12.4's
 * `sampled-chord`, exactly as on the Digitakt II.
 *
 * ## #86's third instance, and it is not the MIDI tracks
 *
 * §2.2 says an `Assignable` is a pure function of device data, so a box whose tracks are
 * fungible has to commit to one split in its manifest. #86 records that with two devices. This
 * is a third, and it is worth naming precisely because it is easy to point at the wrong thing:
 * the MIDI tracks are not it (they cost nothing), and the five machine types are not it either
 * (a track with any of them assigned is still one track).
 *
 * **It is `TRACK 8`.** p.36, in §8.6.1 AUDIO: *"TRACK 8 offers two settings. Only one setting can
 * be activated at a time. MASTER will when active turn track 8 into a master track. The track
 * effects of track 8 will then affect all the other tracks as well as any audio coming from the
 * external inputs. NORMAL will make track 8 function like all the other tracks."* A master track
 * has no SRC page at all — p.36: *"AMP SETUP, LFO MAIN/SETUP and FX1 and FX2 MAIN/SETUP are the
 * only TRACK PARAMETER pages available to a master track"* — so it cannot play a sample, and the
 * pool is seven. Both shapes are ordinary; the model can only hold one.
 *
 * A footnote still covers it, so nothing here argues for building #86: the pool stays eight and
 * `comfortableVoices` carries the cost, which is the Digitakt II's answer at half the scale.
 *
 * ## Numbers: five ranges in a hundred and forty-six pages
 *
 * Appendix A (pp.117-121) and Appendix B (pp.122-136) describe every machine and every effect
 * parameter and print a scale for almost none of them. The parameter screens beside the prose
 * are screen *graphics* — rendered and read, not grepped — and they carry current values, not
 * limits. `BASE`, `WIDTH`, `Q`, `DEPTH`, `ATK`, `DEC`, `HOLD`, `VOL`, `BAL`, `SPD`, `DEP` and the
 * rest have no printed range anywhere in the document.
 *
 * So this manifest is **enum-dominated**, like the Digitakt II's and for the same reason, and
 * every uncited numeric is absent rather than given an invented `0-127`. What is here:
 *
 *  - `PTCH`, -12 to +12 semitones. Two independent pages: pp.118-119 give it in prose (*"The max
 *    setting pitches the sample up an octave, a min setting pitches the sample down an octave.
 *    Integer changes are equivalent to semitones"*), and p.137's note map gives it as a table,
 *    `C5 (72) - C7 (96)` mapped to `Track Sample Pitch -12` through `Track Sample Pitch +12`.
 *  - `TUNE` on the comb filter, -2 to +2 semitones — p.130, *"changes the pitch by up to 2
 *    semitones up or down"*.
 *  - `NUM` on the phaser and `TAPS` on the chorus, 2 to 10 — from the effects' own printed names,
 *    *"B.5 2-10 STAGE PHASER"* (p.126) and *"B.7 2-10 TAP CHORUS"* (p.128), each beside a
 *    parameter that selects the count.
 *  - `TIME` on the delay, 1 to 128 — p.133 prints the whole table, setting against divide ratio,
 *    from `1` (1/128) to `128` (a whole bar).
 *
 * Two of those carry mood, and the two axes this box declares are `darkness` (on `PTCH`) and
 * `space` (on the delay's `TIME`). It declines the other three by having no param that declares
 * them, which is §6's mechanism and not a capability check.
 *
 * ## The FX slots are two different lists, and the recipe carries which
 *
 * This is CLAUDE.md's cited-range trap in enum form. p.62 prints the assignable effects twice:
 * ten for FX1, and the same ten plus **Echo Freeze Delay, Gatebox Plate Reverb, Spring Reverb and
 * Dark Reverb** for FX2. A delay or a reverb authored into FX1 would carry a p.62 citation and
 * name an effect that slot does not offer, so `FX1` and `FX2` are separate parameters with
 * separate option sets rather than one shared list.
 *
 * The option sets are the **on-screen spellings**, not p.62's prose names, and every one of the
 * fifteen was read off a rendered FX SETUP figure: p.62 (`NONE` through `CHORUS`), p.131
 * (`DJ EQUALIZER` through `COMPRESSOR`), p.133 (`COMB FILTER` through `DELAY`) and p.136
 * (`COMB FILTER` through `DARK REV`). The prose and the screen disagree for four of them — p.62's
 * *"12/24dB Multi Mode Filter"* is `FILTER` on the box, *"2-band Parametric EQ"* is `EQUALIZER`,
 * *"DJ-style Kill EQ"* is `DJ EQUALIZER`, and the three reverbs are `PLATE REV`, `SPRING REV` and
 * `DARK REV` — and §8 is read at the machine, so the screen wins.
 *
 * ## Two settings that live on a different page from the one that names them
 *
 * `LOOP MODE` and `TIMESTRETCH` are sample attributes, set in the audio editor's ATTRIBUTES menu
 * (p.85), and they only apply while the *track's* `LOOP` and `TSTR` are set to `AUTO` in SRC
 * SETUP (p.118, and p.109 step 9 walks it). The recipes carry the attribute, whose option set
 * p.85 prints in full, and each one's `note` names the switch that has to be `AUTO` for it to be
 * in force. The track-level parameters are deliberately **not** authored as enums: `AUTO` and
 * `OFF` are the only two values any page prints for them (p.109, p.118), and an option set of two
 * would be a legality claim this manual does not support.
 *
 * `LEN` is the same shape one level down and is handled the same way, but with the switch as a
 * real parameter rather than a note, because here the manual states the dependency as two
 * different option sets: p.118, *"If SLIC is set to ON LEN can be set to either SLIC or TIME…
 * If SLIC is set to OFF, LEN can be set to either OFF or TIME."* Every recipe that sets `LEN`
 * sets `SLIC` beside it.
 *
 * ## §4.3 articulation, and how little of this sequencer it can reach
 *
 * `bindArticulation` produces one `set` of scalars applied to every hit sharing a `PatternSlot`.
 * The Octatrack's sequencer is mostly outside that, and none of it is approximated:
 *
 *  1. **Per-trig identity.** *"Parameter locks is a powerful feature that allows every trig to
 *     have its unique parameter values"* (p.67). A `set` gives one value to every hit in a slot.
 *  2. **Arbitrary parameter names.** Anything on the MAIN pages can be locked (p.57, p.67);
 *     `set` keys must appear in a closed authored `perStep`.
 *  3. **Lock trigs and trigless trigs.** Both place a step that carries settings and sounds
 *     nothing (p.66). Our model has hits or nothing.
 *  4. **Stateful conditions.** `PRE` and `NEI` depend on the most recently evaluated condition on
 *     this track or the one before it, `1ST` on where the pattern is in its loop, and `A:B` on a
 *     repetition counter (p.77). A `set` is a static scalar with no evaluation order, no
 *     cross-track reference and no loop context.
 *  5. **One-shot trigs are armed, not set.** *"If a track contains several one shot trigs, all one
 *     shot trigs of that track will be disarmed once one of the one shot trigs has been
 *     activated"* — and that disarming reaches every other pattern (p.66). That is device state
 *     across a whole project, which nothing in this codebase models.
 *
 * There is also no velocity here, and its absence is a fact about the box rather than an
 * omission: an audio track's TRIG page has no `VEL`. Level per hit exists only as a parameter
 * lock on `VOL`, whose range p.58 does not print, so nothing in this manifest sets one.
 *
 * What is left is four lanes that stay true as a slot-wide scalar, and they are what
 * `ARTICULABLE_PER_STEP` names. See `PER_STEP` for which is which.
 */

const MANUAL = 'Octatrack MKII User Manual OS 1.40A'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/** A claim that needed more than one page. Both halves get named, in the order they were read. */
function cites(...pages: number[]): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages.map((p) => `p.${p}`).join(', ')}` }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/**
 * The SRC SETUP machine list, in the order the screen prints it (p.118's FLEX SETUP figure,
 * rendered — the list does not extract from the text layer). p.55 names all five in prose in the
 * same breath: *"Flex and Static machines are used to process samples. Thru and Neighbor machines
 * offer various audio routing options. Pickup machines act as looper devices."*
 */
const MACHINES = ['STATIC', 'FLEX', 'THRU', 'NEIGHBOR', 'PICKUP'] as const

/**
 * FX1's eleven, screen spellings. p.62 lists the ten assignable effects; `NONE` is the eleventh
 * entry and p.62's own FX1 SETUP figure shows it at the top of the list.
 */
const FX1_EFFECTS = [
  'NONE',
  'FILTER',
  'EQUALIZER',
  'DJ EQUALIZER',
  'PHASER',
  'FLANGER',
  'CHORUS',
  'SPATIALIZER',
  'COMB FILTER',
  'COMPRESSOR',
  'LO-FI',
] as const

/** FX2's fifteen: FX1's eleven, plus the four p.62 gives only to the second slot. */
const FX2_EFFECTS = [...FX1_EFFECTS, 'DELAY', 'PLATE REV', 'SPRING REV', 'DARK REV'] as const

/** Audio editor, ATTRIBUTES menu, `LOOP MODE` — p.85 prints all three. */
const LOOP_MODES = ['OFF', 'ON', 'PINGPONG'] as const

/**
 * Audio editor, ATTRIBUTES menu, `TIMESTRETCH` — p.85 prints all three.
 *
 * The manual spells the third one two ways: `BEAT` on p.85 where the setting is defined, and
 * `BEATS` on p.109 step 8 in the tutorial. p.85 is the page that defines it and p.118's `TSNS`
 * description agrees with it (*"when the timestretch algorithm is set to BEAT"*), so `BEAT` is
 * what a reader will find on the screen.
 */
const TIMESTRETCH_MODES = ['OFF', 'NORMAL', 'BEAT'] as const

/** FLEX/STATIC SETUP, `SLIC` — on or off (p.118). */
const SLIC_SETTINGS = ['ON', 'OFF'] as const

/** FLEX/STATIC SETUP, `LEN`, **when `SLIC` is ON** (p.118). */
const LEN_WITH_SLICES = ['SLIC', 'TIME'] as const

/** FLEX/STATIC SETUP, `LEN`, **when `SLIC` is OFF** (p.118). The two sets are not the same. */
const LEN_WITHOUT_SLICES = ['OFF', 'TIME'] as const

/** AMP SETUP, `AMP` — how the amplitude envelope restarts (p.59). */
const AMP_MODES = ['ANLG', 'RTRG', 'R+T', 'TTRG'] as const

/** AMP SETUP, `ATCK` — *"LIN will make the envelope attack work in a linear fashion"* (p.59). */
const ATTACK_SHAPES = ['LIN', 'LOG'] as const

/** LFO SETUP, `TRIG` — eight, printed across pp.60-61 as one bulleted list. */
const LFO_TRIG_MODES = [
  'FREE',
  'TRIG',
  'HOLD',
  'ONE',
  'HALF',
  'SYNC TRIG',
  'SYNC ONE',
  'SYNC HALF',
] as const

/** Multi mode filter SETUP, `HP` and `LP` — *"Select between 12 dB or 24 dB"* (p.123). */
const FILTER_SLOPES = ['12', '24'] as const

/**
 * Spatializer SETUP, `PHSE` — p.129 prints the four screen tokens in its own prose: *"none of the
 * channels (NONE), the left channel (L), the right channel (R) or both the left and right channel
 * (L,R)"*.
 */
const PHASE_INVERSIONS = ['NONE', 'L', 'R', 'L,R'] as const

/**
 * §2.3's per-step vocabulary: the per-trig capabilities this manual documents.
 *
 * Ten lanes, four of which `articulation` can reach. That ratio is the sharpest in the library
 * and it is the honest one — this sequencer's whole character is per-trig identity, and per-trig
 * identity is the thing §4.3 does not have.
 *
 * Reachable, because each stays true when applied to every hit in a slot:
 * `micro-timing` (p.76, `TRIG OFFSET` on a 1/384 grid), `trig-count` (p.77, *"A setting of 2-8
 * adds additional trig repeats of the original trig"*), `swing-trig` (p.74, a swing trig on a
 * step, with one amount for the track) and `slide-trig` (p.74, values slide from this trig to the
 * next).
 *
 * Declared and deliberately unreachable:
 *
 *  - `parameter-lock` — the mechanism itself (p.67); a lane whose value is *any parameter*.
 *  - `sample-lock` — a per-trig sample change (p.67). Expressible in principle and omitted in
 *    practice, because the value would be a sample name nobody can know (invariant 5).
 *  - `trig-condition` — `PRE`, `NEI`, `1ST` and `A:B` are stateful (p.77). See the module JSDoc.
 *  - `one-shot-trig` — arming state that survives a pattern change (p.66).
 *  - `lock-trig` and `trigless-trig` — steps that carry settings and sound nothing (p.66). Our
 *    model has hits or nothing.
 */
const PER_STEP = [
  'micro-timing',
  'trig-count',
  'swing-trig',
  'slide-trig',
  'parameter-lock',
  'sample-lock',
  'trig-condition',
  'one-shot-trig',
  'lock-trig',
  'trigless-trig',
] as const

/** The subset `articulation` may use. Exported so the test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'micro-timing',
  'trig-count',
  'swing-trig',
  'slide-trig',
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

/** An enum whose option set is cited and whose selection is taste (§3.2). */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  where: Cite,
  note?: string,
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: where },
    verified: false,
    ...(note === undefined ? {} : { note }),
  }
}

/** One of the five numerics this manual gives a range for. */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  where: Cite,
  extra: {
    unit?: string
    mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
    note?: string
  } = {},
): AuthoredParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: where },
    verified: false,
    ...extra,
  }
}

const machine = (m: (typeof MACHINES)[number]) => pick('MACHINE', m, MACHINES, cite(118))

const fx1 = (e: (typeof FX1_EFFECTS)[number]) =>
  pick('FX1', e, FX1_EFFECTS, cites(62, 131), 'FX1 cannot hold the delay or any of the reverbs')

const fx2 = (e: (typeof FX2_EFFECTS)[number]) => pick('FX2', e, FX2_EFFECTS, cites(62, 133, 136))

/**
 * `PTCH`, the one numeric on this box that two separate pages agree on. Carries `darkness`,
 * which is the axis a sampler answers most directly: pitching the whole sample down is what
 * darkens it, since there is no cutoff on this manual with a scale to move.
 */
const ptch = (v: number, mood = true) =>
  num('PTCH', v, { min: -12, max: 12 }, cites(118, 137), {
    unit: 'st',
    ...(mood ? { mood: [{ axis: 'darkness' as const, amount: -5 }] } : {}),
  })

/** Comb filter `TUNE` — *"changes the pitch by up to 2 semitones up or down"* (p.130). */
const combTune = (v: number) => num('TUNE', v, { min: -2, max: 2 }, cite(130), { unit: 'st' })

/** Phaser `NUM`, the stage count, from the effect's own printed name (p.126). */
const phaserStages = (v: number) => num('NUM', v, { min: 2, max: 10 }, cite(126))

/** Chorus `TAPS`, the tap count, from the effect's own printed name (p.128). */
const chorusTaps = (v: number) => num('TAPS', v, { min: 2, max: 10 }, cite(128))

/**
 * Delay `TIME`. p.133 prints the whole table — `128` is a whole bar, `1` is a 1/128 — so the
 * bounds are read off the table rather than inferred. Carries `space`: a longer division is
 * more of the room, which is what the axis asks for.
 */
const delayTime = (v: number) =>
  num('TIME', v, { min: 1, max: 128 }, cite(133), {
    mood: [{ axis: 'space', amount: 24 }],
    note: 'p.133: 128 is a whole bar, 64 a 1/2, 32 a 1/4, 16 a 1/8, 8 a 1/16',
  })

const ampMode = (m: (typeof AMP_MODES)[number]) => pick('AMP', m, AMP_MODES, cite(59))
const attack = (m: (typeof ATTACK_SHAPES)[number]) => pick('ATCK', m, ATTACK_SHAPES, cite(59))

const lfoTrig = (m: (typeof LFO_TRIG_MODES)[number]) =>
  pick(
    'TRIG',
    m,
    LFO_TRIG_MODES,
    cites(60, 61),
    'p.60 prints no scale for SPD or DEP; it suggests 16, 32 or 64 for straight beats',
  )

const slic = (m: (typeof SLIC_SETTINGS)[number]) => pick('SLIC', m, SLIC_SETTINGS, cite(118))

/** `LEN` with `SLIC` ON. Never authored without the `SLIC` beside it — the option set depends on it. */
const lenSliced = (m: (typeof LEN_WITH_SLICES)[number]) =>
  pick('LEN', m, LEN_WITH_SLICES, cite(118), 'This option set only exists while SLIC is ON')

/** `LEN` with `SLIC` OFF. A different option set for the same control (p.118). */
const lenUnsliced = (m: (typeof LEN_WITHOUT_SLICES)[number]) =>
  pick('LEN', m, LEN_WITHOUT_SLICES, cite(118), 'This option set only exists while SLIC is OFF')

/** Audio editor ATTRIBUTES, `LOOP MODE`. Only in force while the track's `LOOP` is `AUTO`. */
const loopMode = (m: (typeof LOOP_MODES)[number]) =>
  pick('LOOP MODE', m, LOOP_MODES, cite(85), 'Set the track LOOP to AUTO in SRC SETUP first (p.118)')

/** Audio editor ATTRIBUTES, `TIMESTRETCH`. Only in force while the track's `TSTR` is `AUTO`. */
const timestretch = (m: (typeof TIMESTRETCH_MODES)[number]) =>
  pick(
    'TIMESTRETCH',
    m,
    TIMESTRETCH_MODES,
    cite(85),
    'Set the track TSTR to AUTO in SRC SETUP first (p.109, p.118)',
  )

const filterSlope = (name: 'HP' | 'LP', v: (typeof FILTER_SLOPES)[number]) =>
  pick(name, v, FILTER_SLOPES, cite(123), 'Filter slope, in dB per octave')

const spatializerPhase = (v: (typeof PHASE_INVERSIONS)[number]) =>
  pick('PHSE', v, PHASE_INVERSIONS, cite(129))

/**
 * §17.3, p.109. The one documented preparation routine in the manual, and the only reason any
 * recipe here can promise a loop stays in time: set `TSTR` to OFF, find the sample's own tempo by
 * moving the Octatrack's until it loops seamlessly, write that into `ORIGINAL TEMPO`, then set
 * `TSTR` back to AUTO. Every looped or stretched recipe below points at it.
 */
const PREP_A_LOOP = {
  text:
    'Run §17.3 on the sample first: TSTR OFF, trim the start point, match the Octatrack tempo ' +
    'until the loop is seamless, then set that as ORIGINAL TEMPO and TSTR back to AUTO',
  verified: cite(109),
} as const

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: Recipe['articulation'] extends (infer E)[] | undefined ? (E extends { slot: infer S } ? S : never) : never,
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// Jacks (§3.3). p.14's numbered rear-panel list, read off the rendered artwork as well as the
// prose because the silkscreen sits inside the drawing.
//
// `POWER` and `DC In` are omitted for the ordinary reason — an inlet and a switch are not things
// a reader patches — and `Compact Flash` for the same one. **`USB` is omitted too**, following
// the Analog Rytm MKII and the RD-9: `direction` is one of `in` or `out` and this port is
// neither, being a disk connection (p.32, USB DISK MODE) rather than a signal socket.
//
// The panel prints the input pairs as two columns, `C A` over `D B`; p.14 item 8 writes them
// `INPUT C/D, A/B`. They are declared one jack each, under the silkscreen's own single letters.
// ---------------------------------------------------------------------------

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

const BALANCED = '1/4" mono TS unbalanced, or TRS balanced'

const JACKS = [
  jack('HEADPHONES', 'out', ['audio'], 14, { note: '1/4" stereo (TRS)' }),
  jack('MAIN OUT L', 'out', ['audio'], 14, { note: BALANCED }),
  jack('MAIN OUT R', 'out', ['audio'], 14, { note: BALANCED }),
  jack('CUE OUT L', 'out', ['audio'], 14, {
    note: `${BALANCED}. A second stereo bus, not a per-track out — STUDIO mode makes it assignable (p.63)`,
  }),
  jack('CUE OUT R', 'out', ['audio'], 14, { note: BALANCED }),
  jack('INPUT A', 'in', ['audio'], 14, { note: `${BALANCED}. Pair AB, and a Thru machine listens to the pair` }),
  jack('INPUT B', 'in', ['audio'], 14, { note: BALANCED }),
  jack('INPUT C', 'in', ['audio'], 14, { note: `${BALANCED}. Pair CD` }),
  jack('INPUT D', 'in', ['audio'], 14, { note: BALANCED }),
  jack('MIDI IN', 'in', ['clock', 'midi'], 14, { clock: ['midi-din'] }),
  jack('MIDI OUT', 'out', ['clock', 'midi'], 14, { clock: ['midi-din'] }),
  jack('MIDI THRU', 'out', ['midi'], 14, { note: 'Forwards data from MIDI IN' }),
] as const

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  {
    id: 'ot-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Flex one-shot kick, envelope restarted on every trig',
    verified: false,
    sourceAudio: {
      need: 'A dry kick one-shot with a defined attack and no room on it',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('FILTER'),
      filterSlope('LP', '24'),
      fx2('COMPRESSOR'),
    ],
  },
  {
    id: 'ot-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'track',
    title: 'Kick through the lo-fi collection, tail left where it lands',
    verified: false,
    sourceAudio: {
      need: 'A kick one-shot with grit already in it — off tape, off vinyl, through an overdriven bus',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(-2),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('LO-FI'),
      fx2('COMPRESSOR'),
    ],
    articulation: [art('accent', { 'trig-count': 2 }, 'trig-count')],
  },
  {
    id: 'ot-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'Sub sample dropped an octave, everything above it filtered off',
    verified: false,
    sourceAudio: {
      need:
        'A clean low sustained tone with a stable, known pitch — PTCH transposes it, so the ' +
        'tuning has to be true before it moves',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(-12),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('ON'),
      timestretch('OFF'),
      ampMode('ANLG'),
      attack('LOG'),
      fx1('FILTER'),
      filterSlope('LP', '24'),
      filterSlope('HP', '12'),
    ],
  },
  {
    id: 'ot-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'Bass through the comb filter, tuned a semitone sharp of the note',
    verified: false,
    sourceAudio: {
      need:
        'A short bass note with harmonics above the fundamental; a filtered sine gives the comb ' +
        'nothing to ring on',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(-5),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('COMB FILTER'),
      combTune(1),
      fx2('COMPRESSOR'),
    ],
    articulation: [art('downbeat', { 'slide-trig': true }, 'trig-edit')],
  },
  {
    id: 'ot-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'Snare one-shot, flat and forward through the parametric EQ',
    verified: false,
    sourceAudio: { need: 'A snare one-shot, crack intact and dry', hint: 'quick-assign' },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('EQUALIZER'),
      fx2('COMPRESSOR'),
    ],
  },
  {
    id: 'ot-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'Clap over the snare, on a short plate',
    verified: false,
    sourceAudio: {
      need: 'A stereo hand-clap one-shot, several hands rather than one',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(2),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('EQUALIZER'),
      fx2('PLATE REV'),
    ],
    articulation: [art('backbeat', { 'trig-count': 2 }, 'trig-count')],
  },
  {
    id: 'ot-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
    title: 'Closed hat, offbeats nudged back off the grid',
    verified: false,
    sourceAudio: { need: 'A closed hat one-shot under 150 ms, dry', hint: 'quick-assign' },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('FILTER'),
      filterSlope('HP', '12'),
    ],
    articulation: [art('offbeat', { 'micro-timing': -6 }, 'micro-timing')],
  },
  {
    id: 'ot-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'track',
    title: 'Open hat let ring, top end left alone',
    verified: false,
    sourceAudio: { need: 'An open hat one-shot with a real tail to hold open', hint: 'quick-assign' },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('ANLG'),
      attack('LIN'),
      fx1('EQUALIZER'),
    ],
    articulation: [art('offbeat', { 'swing-trig': true }, 'trig-edit')],
  },
  {
    id: 'ot-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Quiet percussion, each ghost repeated three times inside its step',
    verified: false,
    sourceAudio: { need: 'A shaker, tick or brushed one-shot under 100 ms', hint: 'quick-assign' },
    params: [
      machine('FLEX'),
      ptch(3),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LOG'),
      fx1('FILTER'),
      filterSlope('HP', '24'),
    ],
    articulation: [art('ghost', { 'trig-count': 3, 'micro-timing': 4 }, 'trig-count')],
  },
  {
    id: 'ot-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'track',
    title: 'Metal hit rung out by the comb filter, two semitones sharp',
    verified: false,
    sourceAudio: {
      need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('COMB FILTER'),
      combTune(2),
      fx2('LO-FI'),
    ],
    articulation: [art('offbeat', { 'micro-timing': 8 }, 'micro-timing')],
  },
  {
    id: 'ot-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'track',
    title: 'Sliced vocal, one slice per trig',
    verified: false,
    /**
     * `SLIC ON` is what makes `STRT` select slices rather than sweep a position (p.118), and it is
     * also what puts `LEN` on the `SLIC`/`TIME` option set rather than the `OFF`/`TIME` one — the
     * pair travels together for that reason.
     *
     * The obvious articulation is a per-trig slice or sample lock, and it is exactly what §4.3
     * cannot carry (see `PER_STEP`). What it can carry is where the slices land, so this one
     * nudges rather than pretending to choose.
     */
    sourceAudio: {
      need:
        'One or two bars of vocal with evenly spaced syllables, so the slice grid lands on them ' +
        'rather than between them',
      hint: 'audio-editor',
    },
    params: [
      machine('FLEX'),
      ptch(0),
      slic('ON'),
      lenSliced('SLIC'),
      loopMode('OFF'),
      timestretch('BEAT'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('EQUALIZER'),
      fx2('DELAY'),
      delayTime(16),
    ],
    articulation: [art('accent', { 'micro-timing': -4 }, 'micro-timing')],
  },
  {
    id: 'ot-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'Static loop stretched under the bar, ping-ponging at its ends',
    verified: false,
    sourceAudio: {
      need:
        'A sustained tonal source, two seconds or longer, streamed from the card rather than ' +
        'loaded to RAM — a Static machine will take a file of any size (p.119)',
      prep: PREP_A_LOOP,
      hint: 'audio-editor',
    },
    params: [
      machine('STATIC'),
      ptch(-3),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('PINGPONG'),
      timestretch('NORMAL'),
      ampMode('ANLG'),
      attack('LOG'),
      lfoTrig('FREE'),
      fx1('SPATIALIZER'),
      spatializerPhase('L,R'),
      fx2('DARK REV'),
    ],
  },
  {
    id: 'ot-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'Riser pitched up across the bar by a one-shot LFO',
    verified: false,
    /**
     * `ONE` is the LFO trig mode that *"will make the LFO restart when a sample is trigged, run
     * for one cycle and then stop"* (p.60) — a single ramp per trig, which is the shape a riser
     * wants. What the manual does not print is a scale for `SPD` or `DEP`, so neither is
     * authored: p.60's own advice is *"For LFO speed synchronised to straight beats, try settings
     * of 16, 32 or 64"*, and that is the note on the parameter rather than an invented range.
     */
    sourceAudio: {
      need: 'A sustained noise or a held tone with no transient — the rise has to come from the LFO',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(0, false),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('ON'),
      timestretch('OFF'),
      ampMode('R+T'),
      attack('LOG'),
      lfoTrig('ONE'),
      fx1('FILTER'),
      filterSlope('LP', '12'),
    ],
    articulation: [art('last-hit', { 'slide-trig': true }, 'trig-edit')],
  },
  {
    id: 'ot-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'One impact on the change, streamed off the card',
    verified: false,
    sourceAudio: {
      need: 'A one-shot with a big front — a crash, a gated slam, a reversed hit',
      hint: 'quick-assign',
    },
    params: [
      machine('STATIC'),
      ptch(0),
      slic('OFF'),
      lenUnsliced('OFF'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('EQUALIZER'),
      fx2('PLATE REV'),
    ],
    articulation: [art('first-hit', { 'micro-timing': -2 }, 'micro-timing')],
  },
  {
    id: 'ot-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'track',
    title: 'Sweep dropped an octave into a bar-long delay',
    verified: false,
    sourceAudio: {
      need: 'A noise wash or a cymbal swell with a long tail, two seconds or more',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(-7),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('NORMAL'),
      ampMode('ANLG'),
      attack('LOG'),
      lfoTrig('HALF'),
      fx1('FILTER'),
      filterSlope('LP', '24'),
      fx2('DELAY'),
      delayTime(64),
    ],
  },
  {
    id: 'ot-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'Short stab from a sample that already contains the chord',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * §12.4. One track sounds one sample, so a three-note stab is not reachable by any patch on
     * this box (see the module JSDoc for why `voices` records that as a reading rather than a
     * citation). The way out is a sample that is already the chord — once it is loaded, the chord
     * *is* one note as far as the track is concerned.
     *
     * **Both halves of the substitution are on the page.** It sustains: `LOOP MODE ON` *"will loop
     * a sample or sample slice containing a loop marker"* (p.85), and the pad below holds one
     * under a whole bar that way. And it transposes per step: `PTCH` is a SRC MAIN parameter, and
     * *"MAIN pages… offer parameters that are possible to parameter lock"* (p.57), so each trig
     * can carry its own transposition and the chord follows the progression. p.137's note map
     * gives the same movement from a keyboard, `C5`-`C7` mapped to `Track Sample Pitch -12` to
     * `+12`.
     *
     * **The ceiling is two octaves and it is printed**: `PTCH` runs -12 to +12 (pp.118-119,
     * p.137), so a progression that walks further than an octave either way needs a second
     * sample. Transposition preserves the recorded voicing and nothing else — it cannot invert or
     * re-voice the chord, so a changed shape is a second sample too (§4.1). The Hook phase lists
     * which samples the part needs and the semitone offset for each trigger.
     */
    sourceAudio: {
      need:
        'Chord sample(s) — one per chord shape the hook plays, and one more for any move further ' +
        'than twelve semitones; see Hook for which and for the offset on each trigger',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(0, false),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('OFF'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LIN'),
      fx1('EQUALIZER'),
      fx2('COMPRESSOR'),
    ],
  },
  {
    id: 'ot-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'Rendered chord sample looped and stretched under the bar',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * The sustain half of §12.4's bar, held by `LOOP MODE ON` rather than by an envelope: a Static
     * machine streams from the card (p.119), so the sample can be as long as the section. The
     * transposition half is the same `PTCH` parameter lock the stab's note above sets out, with
     * the same two-octave ceiling.
     */
    sourceAudio: {
      need:
        'Sustained chord sample(s), two seconds or longer — one per chord shape the hook plays; ' +
        'see Hook',
      prep: PREP_A_LOOP,
      hint: 'audio-editor',
    },
    params: [
      machine('STATIC'),
      ptch(0, false),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('ON'),
      timestretch('NORMAL'),
      ampMode('ANLG'),
      attack('LOG'),
      lfoTrig('FREE'),
      fx1('CHORUS'),
      chorusTaps(6),
      fx2('DARK REV'),
    ],
  },
  {
    id: 'ot-lead-clean',
    role: 'lead',
    character: 'clean',
    voice: 'track',
    title: 'Single-note lead played by locking PTCH on each trig',
    verified: false,
    /**
     * A melodic line on this box is a `PTCH` parameter lock per trig — SRC MAIN parameters are
     * lockable (p.57, p.67) and `PTCH` moves in semitones (p.118).
     *
     * **The line has to fit in two octaves**, and that is a printed limit rather than a caution:
     * `PTCH` runs -12 to +12, and p.138 says the same of playing the track from a keyboard —
     * *"The 2-octave range is only valid for audio tracks. On MIDI tracks, notes can be played and
     * recorded over the full 128 MIDI note range."* A part that needs more range wants one of the
     * MIDI tracks and an instrument on the other end of the cable, which is a different box's job.
     */
    sourceAudio: {
      need:
        'One sustained single note, recorded at a known pitch — every other note in the line is ' +
        'this one transposed, so its tuning is the tuning of the whole part',
      hint: 'quick-assign',
    },
    params: [
      machine('FLEX'),
      ptch(0, false),
      slic('OFF'),
      lenUnsliced('TIME'),
      loopMode('ON'),
      timestretch('OFF'),
      ampMode('RTRG'),
      attack('LOG'),
      fx1('PHASER'),
      phaserStages(4),
      fx2('DELAY'),
      delayTime(24),
    ],
    articulation: [art('accent', { 'slide-trig': true }, 'trig-edit')],
  },
]

export const device: Device = {
  id: 'elektron-octatrack-mkii',
  name: 'Octatrack MKII',
  maker: 'Elektron',

  /**
   * p.11, chapter 2's own opening: *"With the Octatrack we wanted to create a sampler that would
   * regard recorded material not as inflexible sounds, but rather as something highly
   * malleable."* The same page calls it one of *"the most widely used live performance samplers"*.
   */
  kind: 'sampler',

  /**
   * §7.4. Sends and receives, over the DIN sockets and only there.
   *
   * p.40, §8.7.2 SYNC, gives all four switches: `CLOCK SEND` *"will when active make the MKII
   * transmit MIDI clock"*, `CLOCK RECEIVE` *"…receive MIDI clock from external devices"*, and
   * `TRANSPORT SEND`/`TRANSPORT RECEIVE` for *"play, stop, continue and song position pointer"*.
   *
   * **`usb` is not declared, and its absence is a reading rather than an oversight.** The manual
   * never mentions USB MIDI. p.14 gives the port one job — *"For connecting the unit to a
   * computer"* — p.32's USB DISK MODE is the only use it describes (*"make the Compact Flash card
   * appear as an external mass storage device"*), and p.112 says even a firmware upgrade *"can not
   * be sent over the Octatrack's USB port"* and has to go over MIDI. Declaring `usb` here would
   * have the rig phase draw a clock cable into a disk connection.
   *
   * **`preferredSource: true`, on pages that name the box's job rather than its capability.**
   * §2.1.4 is headed LIVE SETUP HUB and reads *"The two input pairs combined with the extensive
   * audio routing possibilities allow the Octatrack MKII to function as a mixer. Connect for
   * example a Machinedrum and a Monomachine to the inputs and enjoy a complete live setup"*
   * (p.11). §16.1 is headed OCTATRACK MKII AS A PERFORMANCE HUB and builds exactly that rig,
   * with step 3 *"Enable both TRANSPORT SEND and CLOCK SEND"* and the two other machines then
   * following its tempo and transport (p.96).
   *
   * **The architecture argues the same way, and this is the half the Digitakt II fails.** That
   * box's MIDI tracks carry the same purpose sentence, and its manifest still declines this field,
   * because sixteen tracks are audio *or* MIDI and every track spent sequencing something else is
   * a track taken from the sampler. Here p.55 says the eight MIDI tracks run *at the same time* as
   * the eight audio ones — driving a rig costs this box nothing — and §16.5, OCTATRACK MKII AS A
   * MIDI CONTROL CENTER, spends them doing it (p.102).
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din'],
    preferredSource: true,
    sourceSetup: [
      {
        transport: 'midi-din',
        path: '[PROJ] > MIDI > SYNC',
        value: 'CLOCK SEND',
        note: 'Enable TRANSPORT SEND beside it for play, stop, continue and song position',
      },
    ],
  },

  /**
   * Stereo main out, four balanced inputs across two pairs, and a second stereo pair labelled
   * `CUE OUT` (p.14, p.116).
   *
   * **`individualOuts: 0`, and the cue pair is why that needs saying.** It is a second bus rather
   * than a set of per-track outs: p.63 routes a track to it with `[CUE] + [TRACK]` and notes the
   * track *"will still be audible from the main outputs"*, and STUDIO mode is what makes it
   * *"a pair of assignable outputs"* (p.63). p.116's hardware list is the count — two main jacks,
   * two cue jacks, four input jacks, one headphone jack — and there is nothing else to separate a
   * track into.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  jacks: [...JACKS],

  /**
   * §2.6/#111. **A card of samples nobody has listed, which is `shipped-library`.**
   *
   * p.23: *"The Compact Flash card that came shipped with your Octatrack MKII contains a set
   * called 'PRESETS'. This set contains a project also named 'PRESETS'."* p.25 says what is in
   * it: *"The audio pool belonging to the 'PRESETS' set found on the bundled Compact Flash card
   * is full of samples."* p.27 says where a reader goes to see them: *"Inside the set folder a
   * folder called AUDIO is located. This is the audio pool of the set."*
   *
   * `enumerable` would be the wrong answer and it is the tempting one: the box shows the reader a
   * browsable list on its own screen. But `enumerable` promises entries a *recipe* can reference,
   * and no document prints a single filename — so the eighteen recipes here describe their audio
   * in `sourceAudio.need` instead, which is what `reason` says out loud.
   */
  content: {
    kind: 'shipped-library',
    library: 'the sample pool of the bundled card’s “PRESETS” set',
    location: 'the AUDIO folder inside the PRESETS set on the Compact Flash card',
    reason: 'p.25 says the pool is full of samples and no page lists a single filename',
  },

  /**
   * §2.6/#142. **An audio track's trig carries no length**, which is the `trigger` case.
   *
   * There is no `LEN` on the TRIG page here the way there is on a Digitakt — the sequencer's trig
   * types are sample, note, lock, trigless, one-shot, swing, slide and recorder (pp.66-67), and
   * none of them holds a duration. What decides how long a hit sounds is the AMP page's `HOLD` and
   * `REL` (p.58) and the SRC page's `LEN` (p.118), and `LEN` becomes per-trig only if a reader
   * parameter-locks it (p.67) — which is a lock like any other, not a field on the step.
   */
  noteDuration: {
    kind: 'trigger',
    reason:
      'a sample trig holds no length; the AMP page’s HOLD and REL and the SRC page’s LEN decide ' +
      'it, and LEN is per-trig only if you parameter-lock it',
  },

  capabilityEvidence: {
    ...JACK_EVIDENCE,

    'clock.canSendClock': cite(40),
    'clock.canReceiveClock': cite(40),
    'clock.transport': {
      kind: 'partly',
      cite: cites(14, 40),
      proven: 'p.14 gives MIDI In, Out and Thru DIN sockets and p.40 the four clock and transport switches',
      open:
        'that the USB port carries no MIDI is nowhere stated as such — p.14 and p.32 give it only ' +
        'a computer-disk job, and p.112 rules it out for firmware, which is the nearest the manual comes',
    },
    'clock.preferredSource': cites(11, 96, 102),
    'clock.sourceSetup[midi-din]': cite(40),

    'io.main': cites(14, 116),
    'io.individualOuts': cites(63, 116),
    'io.audioIn': cite(14),
    'io.usbAudio': {
      kind: 'unknown',
      reason:
        'the only use any page gives the USB port is USB DISK MODE, mounting the Compact Flash card as mass storage (p.32); p.116 lists a “Hi-speed USB 2.0 port” and no page claims audio over it',
    },

    voices: {
      kind: 'partly',
      cite: cites(55, 137),
      proven:
        'p.55 gives eight audio stereo tracks running at the same time as eight MIDI tracks, and p.137’s note map lists the two blocks separately',
      open:
        'how many samples one audio track can sound at once — the word polyphony does not occur in the manual, and the 1 is read off the architecture (a track holds one machine, a machine one sample)',
    },
    'features.perStep': cites(66, 67, 74, 76, 77),
    content: cites(23, 25, 27),
    noteDuration: cites(58, 67, 118),
  },

  /**
   * p.116, under PHYSICAL SPECIFICATIONS: *"Dimensions: W 340 × D 184 × H 63 mm (13.3" × 7.2" ×
   * 2.5") (including knobs, jacks, and rubber feet)"*. 63 mm is how far off the desk it stands.
   */
  physical: { panelSpanMm: 340, verified: cite(116) },

  /**
   * §10. Measured off p.12's vector geometry rather than a rendering of it, because the callout
   * discs sit on top of five of the keys in any raster. `panel.ts` carries the method, and the
   * one figure it cannot settle: the drawn aspect anchors the rise at 176.00 mm against p.116's
   * 184 mm depth, which is quoted over protruding jacks and rubber feet.
   */
  panel: OCTATRACK_MKII_PANEL,

  manual: { title: 'Octatrack MKII User Manual', edition: 'OS 1.40A' },

  /**
   * §2.2. One pool of eight, `polyphony: 1`. See the module JSDoc for why the polyphony is a
   * reading rather than a citation, and why the eight MIDI tracks are not here.
   *
   * The pool carries every role because a sampler's track is whatever is loaded into it — the
   * Tracker Mini's argument, and the Digitakt II's, on a box with half the tracks and a machine
   * list under each one.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 8,
      roles: [
        'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
        'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
        'vox-chop', 'riser', 'impact', 'sweep',
      ],
      polyphony: 1,
    },
  ],

  /**
   * Six of eight, and both missing tracks have a page behind them rather than a feeling.
   *
   * Track 8 goes to the master track in the setups this manual leads with — §16.1 and §16.4 both
   * end on *"Turn track 8 into a master track to affect the incoming audio with the master track
   * effects"* (p.97, p.101) — and a master track has no SRC page, so it plays nothing (p.36). And
   * at least one more goes to a Thru machine or a track recorder in any of those rigs, which is
   * what the two input pairs are for (p.117, p.44).
   *
   * The number is still a judgement, like every `comfortableVoices` in this library; no page
   * states a crowding threshold and none could.
   */
  comfortableVoices: 6,

  features: { perStep: [...PER_STEP] },

  hints: {
    'quick-assign': 'Double-press [TRACK], pick the machine',
    'src-setup': '[FUNC] + [SRC]',
    'amp-setup': '[FUNC] + [AMP]',
    'fx-setup': '[FUNC] + [FX1] or [FX2]',
    'audio-editor': '[TRACK] + [BANK], then [FX1] for ATTRIBUTES',
    'micro-timing': 'Hold [TRIG], press [LEFT]/[RIGHT]',
    'trig-count': 'Hold [TRIG], press [UP]/[DOWN]',
    'trig-edit': '[FUNC] + [BANK] while grid recording',
  },

  recipes,
}
