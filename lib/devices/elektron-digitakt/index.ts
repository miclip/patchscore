import type { Device, JackSignalKind, Recipe } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { DIGITAKT_PANEL } from './panel'

/**
 * Elektron Digitakt (§2.3). Eight audio tracks, eight audio voices, eight *separate* MIDI tracks,
 * and four sample machines — and **the interesting part of this manifest is everything its
 * successor's could not say.**
 *
 * ## This manual prints ranges. The Digitakt II's does not.
 *
 * `lib/devices/elektron-digitakt-ii/index.ts` records that across the whole of its "TRACK
 * PARAMETERS" chapter and its APPENDIX A, exactly three numeric ranges are printed, so that
 * manifest is enum-dominated and its mood surface is one parameter. This manual is the opposite
 * document about nearly the same box: it states a scale in the house style `Decay Time sets the
 * length of the decay phase of the amp envelope. (0-126, INF)` (p.46), and it does so nearly
 * everywhere. So the recipes below read as values rather than as a chain of mode choices, and
 * **eight of the box's controls carry a real mood offset** where the successor's manifest reaches
 * one: `FREQ` for darkness, `BR`, `SRR` and `OVER` for grit, `HOLD` and `AMP DEC` for density,
 * and `DEL` and `REV` for space.
 *
 * **"Nearly" is doing work, and the exceptions are worth counting rather than waving at.** Across
 * the five PARAMETER pages and APPENDIX A there are two kinds of exception, and they are not
 * degrees of one thing.
 *
 * **Three parameters defer their scale to somewhere else in the document.** Not one of them is a
 * silence: the values are printed, just not beside the entry that names the control.
 *
 *  - `DEST` (p.48) names no destinations and points at APPENDIX C, which enumerates them on p.92.
 *  - `WAVE` (p.48) names its waveforms in prose and prints their seven screen tokens in the figure
 *    on the same page.
 *  - `MULT` (p.47) gives no scale at all — but p.49's LFO speed table prints its twelve factors as
 *    its own column headings, and p.47's own screen graphic prints the `BPM` prefix that says
 *    which family a factor belongs to, so the values exist across those two pages.
 *
 * **Separately, one parameter is a silence, and it is the only one in the manual.** FLTR page 2's
 * `DEL` (Envelope delay, p.45) is described and never given values anywhere in this document. It
 * is a different case from the three above rather than the extreme of them, and it is why `DEL`
 * is the one parameter on the five pages that no recipe below authors.
 *
 * That is the same relationship the Digitone pair has and it is worth naming as a pattern rather
 * than as a surprise: **Elektron's older manuals state the scale and the newer ones leave it to
 * the screen.** Where a value here is uncited it is because *this* document is silent about that
 * one control, not because the reading stopped.
 *
 * ## Eight and eight, not one pool of sixteen
 *
 * This is the sharpest divergence from the successor and it inverts its central argument.
 *
 * p.17: *"The Digitakt has eight audio tracks (TRK 1-8). Each audio track contains one sample"*
 * and, separately, *"The Digitakt has eight **dedicated** MIDI tracks (TRK 9-16)."* p.16's data
 * structure diagram draws them side by side — `8 AUDIO TRACKS (per pattern)` and `8 MIDI TRACKS
 * (per pattern)` — and the panel legends them in two rows of silkscreen. The two sets are
 * **hardware-separate**, where the Digitakt II's sixteen are one pool a track leaves when it is
 * spent on MIDI.
 *
 * So the pool here is eight, and sequencing external gear costs this box nothing. **That matters
 * for `clock.preferredSource` and it does not settle it** — see the `clock` note, which is where
 * the successor's architectural argument is retired without being replaced by its opposite.
 *
 * **Polyphony 1 per track needs two pages, exactly as it does on the successor.** *"Each audio
 * track contains one sample"* (p.17) says nothing about simultaneity on its own; p.15's
 * architecture gives *"eight audio voices"*, and eight voices across eight tracks is one voice
 * each. A chord asked for as three simultaneous notes is unreachable by any patch here, and the
 * way out is §12.4's `sampled-chord`.
 *
 * **The voices are mono.** p.15 draws one `PAN` per voice into the mixer, and every summing
 * option in the sampler says so out loud: `IN L+R`, `MAIN L+R` and `USB L+R` each carry *"The
 * audio is summed together to mono"* (p.59). The successor's p.15 says *"16 stereo audio
 * voices"*. That is why `PAN` is a real per-track control on this box, and why no recipe below
 * sets it: where a part sits in the field is a mix decision the guide has no business making.
 *
 * ## A control with two printed scales, and the rule it triggers
 *
 * `CLAUDE.md`'s cited-wrong-range note has a third instance here. p.44's `11.4.6 RESO/GAIN` is
 * **one knob with two names and two scales**: *"Resonance sets the resonance behavior of the
 * filter... (0.00-127.00) Gain sets the amount of boost/cut around the center frequency of the
 * EQ. (-64.00-63.00)"*. Which of the two is in force is decided by `TYPE` on the same page — a
 * filter setting or one of `EQ 1-5`.
 *
 * The fix is the one the TR-8S and the minilogue xd reached: **the recipe carries the switch**.
 * Every recipe below that touches this knob carries `TYPE`, and `reso()` and `gain()` are two
 * separate helpers on two separate ranges so the pairing cannot come apart in editing. A
 * `RESO 96` beside a `TYPE` of `EQ 3` would be a value read off the wrong one of two printed
 * scales, however carefully the citation beside it was written.
 *
 * ## Four machines, and one of them has no TUNE
 *
 * APPENDIX A (pp.82-87) gives four: `ONESHOT`, `WERP`, `REPITCH` and `SLICE`. There is no
 * `STRETCH`, no `GRID`, and **no `MIDI` machine** — a MIDI track on this box is a track, not a
 * machine, which is the same fact as the pool being eight.
 *
 * The trap inside the appendix is that the four do not carry the same parameters, and one
 * difference changes what a recipe can ask for: **`REPITCH` has no `TUNE`** (p.85 lists `PLAY`,
 * `BR`, `SAMP`, `STRT`, `LEN`, `BARS`, `LEV` and nothing else). Repitch is a tempo-matching
 * machine — it *"achieves this by automatically applying repitching of the sample to match the
 * target tempo"* — not a transpose. So the sub, bass and tom recipes below transpose on
 * `ONESHOT`'s `TUNE (-60.00-+24.00)`, which is the machine that has the parameter.
 *
 * **Three of the four machines are reached by a recipe and `REPITCH` is not**, which is a
 * statement about it rather than an omission: it and `WERP` do the same job — a sample stretched
 * to the project tempo — and they differ in what they spend to do it. Werp *"cut[s] into small
 * time segments and played consecutively aligned to the tempo"* (p.83) and keeps the pitch, and
 * Repitch moves the pitch with the tempo. A texture that follows the tempo and changes key when
 * the BPM does is a specific effect rather than a default, and it is not one any direction here
 * asks for. The machine is in the option set because the box has it.
 *
 * ## Mood, and the one axis this box declines
 *
 * Because the ranges are printed, eight controls carry real offsets: `FREQ` for `darkness`, `BR`,
 * `SRR` and `OVER` for `grit`, `HOLD` and `AMP DEC` for `density`, and `DEL` and `REV` for
 * `space`.
 *
 * **`swing` is declined, by having no param that declares it** (§6, and there is no capability
 * check for this). Swing on this box is one pattern-wide setting reached from the TEMPO menu —
 * *"Turn DATA ENTRY knob E to set the SWING ratio to 51-80%"* (p.39) — so it is not a per-part
 * value a recipe can carry, and `ParamScope`'s `pattern` would not fix that: the offset would
 * still be authored once per track and applied to a control there is only one of.
 *
 * ## §4.3 articulation, and where it stops (#57)
 *
 * `bindArticulation` produces one `set` of scalars applied to **every** hit sharing a
 * `PatternSlot`. The successor's manifest sets out five things that puts out of reach — per-trig
 * identity, arbitrary locked parameter names, lock trigs, the pattern-wide lock budget, and
 * stateful conditions — and **every one of them is true of this box too**, from the same pages in
 * this document: parameter locks give every trig its own value (p.37), `[FUNC] + [TRIG]` places a
 * lock trig that sounds no note (p.37), and PRE, NEI, 1ST and A:B all depend on evaluation order,
 * loop position or the neighbour track (p.38). Nothing here approximates any of them. See
 * `PER_STEP` for which per-step features are reachable and which are declared and left alone.
 *
 * One per-step feature exists here that the successor's manifest does not list: **sound locks**
 * (p.37), a whole Sound swapped on one step, on top of the sample locks both boxes have. It is
 * declared and unreachable for the same reason a sample lock is — the value would be the name of
 * a Sound nobody can know (invariant 5).
 */

const MANUAL = 'Digitakt User Manual OS 1.51'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

function cites(pages: string): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages}` }
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/**
 * APPENDIX A — the four section headings, which is where the machine names are printed, and they
 * are **on four different pages**: `A.2 ONESHOT` p.82, `A.3 WERP` p.83, `A.4 REPITCH` p.85,
 * `A.5 SLICE` p.86. The option set cites the span rather than any one of them, because no single
 * page carries the list; p.82's `A.1` gives only the menu that opens it (`[FUNC] + [SRC]`).
 *
 * The prose spells them in title case (*"The Oneshot machine is the default machine"*); the
 * headings are the spelling a reader sees on the MACHINE list.
 */
const MACHINES = ['ONESHOT', 'WERP', 'REPITCH', 'SLICE'] as const

/**
 * `PLAY` (Play Mode). Printed as bullets in this order, and **printed once per machine rather
 * than once**: `A.2.2` on p.82 for Oneshot, `A.3.2` on p.84 for Werp, `A.4.1` on p.85 for
 * Repitch, `A.5.2` on p.86 for Slice.
 *
 * The four values are identical on all four pages, which is exactly what makes citing the wrong
 * one easy and invisible — a Werp recipe whose `PLAY` cites p.82 is citing a page that describes
 * a different machine's parameter and happens to agree. So `play()` takes the machine's own page
 * and every call site passes the one it is on; there is no default.
 *
 * `WERP`'s `MODE` is a *different* parameter with the same four values — see `SEG_MODES`.
 */
const PLAY_MODES = ['REVERSE', 'REVERSE LOOP', 'FORWARD LOOP', 'FORWARD'] as const

/** Where each machine's own `PLAY` entry is printed. Repitch is listed for completeness. */
const PLAY_PAGE = { ONESHOT: 82, WERP: 84, REPITCH: 85, SLICE: 86 } as const

/** `WERP`'s `MODE` (Segment Mode), p.84 — how each warped segment plays, not the whole sample. */
const SEG_MODES = ['REVERSE', 'REVERSE LOOP', 'FORWARD LOOP', 'FORWARD'] as const

/**
 * `TYPE` (Filter/EQ Type), p.44: *"(OFF, 2-pole Lowpass, 2-pole Highpass, EQ 1-5)"*.
 *
 * `EQ 1-5` is expanded to its five members rather than kept as one token, on p.45's own reading:
 * *"The five different settings of the EQ lets you select the bandwidth of the frequency range
 * that the EQ affects."* Five numbered settings, so a recipe can name which. The expansion is the
 * only place this list departs from the page's characters, and it is a reading rather than an
 * invention — but see the module note: which member is chosen is also what decides whether the
 * knob beside it is `RESO` or `GAIN`.
 */
const FLTR_TYPES = [
  'OFF',
  '2-pole Lowpass',
  '2-pole Highpass',
  'EQ 1',
  'EQ 2',
  'EQ 3',
  'EQ 4',
  'EQ 5',
] as const

/** `ROUT` (SRR Routing), p.46. Whether sample rate reduction happens before or after the filters. */
const SRR_ROUTINGS = ['PRE', 'POST'] as const

/** LFO `MODE` (Trig Mode), p.48. The screen's abbreviations, from the prose of `11.7.7`. */
const LFO_MODES = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'] as const

/**
 * LFO `WAVE`, p.48 — **and this is a set the successor's manifest could not write down.**
 *
 * There, the waveforms are named only in prose (*"Triangle, Sine, Square, Sawtooth… Exponential
 * and Ramp"*) with `RND` the one on-screen token, so authoring `'Triangle'` would have put a word
 * on the screen the box does not show, and the option set was omitted. This manual prints all
 * seven as tokens: the `LFO waveforms and trig modes` figure on p.48 labels its seven rows `TRI`,
 * `SIN`, `SQR`, `SAW`, `EXP`, `RMP`, `RND` down the left edge, against the five trig modes across
 * the top. Rendered and read, not taken from the text layer.
 */
const LFO_WAVES = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'] as const

/**
 * `DEST` (Destination), the modulation target — **and an LFO without one modulates nothing**, so
 * every recipe below that sets an LFO sets this.
 *
 * p.48's parameter entry names no destinations and sends the reader to APPENDIX C, which
 * enumerates them on p.92 under two headings. Only the `AUDIO TRACKS` column is here: the
 * `MIDI TRACKS` column belongs to the eight MIDI tracks, which are not assignables on this box.
 *
 * **The seven `LFO1:` entries are excluded, and p.92 is what excludes them.** Each is printed
 * *"(Only available for LFO2)"*, and every recipe here writes LFO page 1. Including them would put
 * seven options in the list that the LFO these recipes use cannot select.
 *
 * `FILTER: SSR Routing` is reproduced with the manual's own typo — the parameter is `SRR`, Sample
 * Rate Reduction, everywhere else in the document (p.46, and `FILTER: Sample Rate Reduction` four
 * lines above it on this same page). An option set is what the page prints.
 */
const LFO_DESTINATIONS = [
  'META: None',
  'MACHINE: Tune',
  'MACHINE: Play Mode',
  'MACHINE: Bit Reduction',
  'MACHINE: Sample Slot',
  'MACHINE: Data entry knob E (machine dependent)',
  'MACHINE: Data entry knob F (machine dependent)',
  'MACHINE: Data entry knob G (machine dependent)',
  'MACHINE: Level',
  'FILTER: Frequency',
  'FILTER: Resonance',
  'FILTER: Envelope Depth',
  'FILTER: Attack Time',
  'FILTER: Decay Time',
  'FILTER: Sustain Level',
  'FILTER: Release Time',
  'FILTER: Base',
  'FILTER: Width',
  'FILTER: Env. Delay',
  'FILTER: Sample Rate Reduction',
  'FILTER: SSR Routing',
  'AMPLIFIER: Attack Time',
  'AMPLIFIER: Hold Time',
  'AMPLIFIER: Decay Time',
  'AMPLIFIER: Overdrive',
  'AMPLIFIER: Delay Send',
  'AMPLIFIER: Reverb Send',
  'AMPLIFIER: Pan',
  'AMPLIFIER: Volume',
] as const

/**
 * `MULT` (Multiplier), the factor `SPD` is multiplied by — **and the second control on this box
 * whose value is meaningless without the family it belongs to.**
 *
 * p.47's entry gives no scale and describes two families: *"Multiplier multiplies the SPD
 * parameter by the set factor either by multiplying the current tempo (BPM settings), or by
 * multiplying a fixed tempo of 120 BPM."* p.49's LFO speed table supplies the twelve factors as
 * its own column headings, and its caption scopes the table to `MULT (set to a BPM value)` — the
 * tempo-synced family.
 *
 * **So the factors alone are the wrong thing to author**, and this is `CLAUDE.md`'s cited-wrong-
 * range trap wearing a different hat: `MULT 16` read off p.49's table and then dialled on the
 * fixed-120 family is a number taken from a scale that is not in force, exactly as `RESO 96`
 * beside an EQ `TYPE` would be. There the recipe carries the switch as a separate param. Here it
 * cannot, because there is no separate switch — and the box's own answer is better than a switch.
 *
 * **Rendering p.47 is what settles it.** The LFO PAGE 1 screen graphic draws the MULT field as two
 * lines, `BPM` over `16`: the family is not a mode hidden somewhere else, it is *part of the token
 * on the screen*. So the option set is the twelve BPM tokens, and a value here cannot come apart
 * from its family however the recipe is later edited. The other family is displayed as the bare
 * factor with no prefix, and is deliberately not in this list — nothing here reaches for it.
 *
 * The citation names both pages because the claim needs both halves and neither carries it alone:
 * p.47 for the prefix and that the two families exist, p.49 for the twelve factors. What no page
 * does is print these twelve tokens as a list, which is why the reading is recorded here rather
 * than left for someone to reconstruct.
 */
const LFO_MULTIPLIERS = [
  'BPM 1', 'BPM 2', 'BPM 4', 'BPM 8', 'BPM 16', 'BPM 32',
  'BPM 64', 'BPM 128', 'BPM 256', 'BPM 512', 'BPM 1K', 'BPM 2K',
] as const

/** `SEG` (Segment Size) on the Werp machine, p.84. */
const WERP_SEGMENTS = ['1/32', '1/16', '1/8'] as const

/** `BARS` on Werp and Repitch, pp.84-85 — the sample's duration in bars, relative to the BPM. */
const BARS = ['1', '2', '4', '8'] as const

/** `GRID` (Slice Grid) on the Slice machine, p.87 — how many slices the sample is cut into. */
const SLICE_GRIDS = ['4', '8', '16', '32', '64'] as const

/**
 * §2.3's per-step vocabulary: the per-trig capabilities this manual documents.
 *
 * **Seven of these eleven are reachable from `articulation` and four are not.** Reachable,
 * because each is a scalar that stays true when applied to every hit in a slot: `velocity` and
 * `note-length` (VEL, LEN — p.43), `probability` (PROB, p.43, whose outcome is *"re-evaluated
 * every time a trig is set to play"*, so it carries no state between trigs), `micro-timing`
 * (p.34), and the three retrig fields (`RETRIG`, `RATE` and the retrig `VEL` curve — pp.34-35;
 * the rate is paired with the switch because "these hits retrig" without a rate is not an
 * instruction anyone can carry out).
 *
 * Declared and deliberately unreachable:
 *
 *  - `condition` — PRE, NEI, 1ST and A:B are stateful (p.38). See the module JSDoc.
 *  - `fill` — depends on whether the box is in FILL mode, which is global runtime state (p.39).
 *  - `sample-lock` — a per-step sample change (p.83). Expressible in principle and omitted in
 *    practice, because the value would be a sample name nobody can know (invariant 5).
 *  - `sound-lock` — p.37, and a whole Sound rather than one sample. Omitted for the same reason.
 */
const PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'retrig-velocity',
  'condition',
  'fill',
  'sample-lock',
  'sound-lock',
] as const

/** The subset `articulation` may use. Exported so a test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'retrig-velocity',
] as const

/**
 * `RATE` in the retrig menu, p.34. Quoted here rather than declared as an option set because it
 * is a per-step field reached through `articulation`, not a parameter on a PARAMETER page.
 */
const RETRIG_RATES = [
  '1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/8', '1/10',
  '1/12', '1/16', '1/20', '1/24', '1/32', '1/40', '1/48', '1/64', '1/80',
] as const

// ---------------------------------------------------------------------------
// Param helpers (§3.1, §3.2)
// ---------------------------------------------------------------------------

type Axis = 'darkness' | 'density' | 'grit' | 'swing' | 'space'

/**
 * An enum whose option set is cited and whose selection is taste (§3.2).
 *
 * `where` is a page number for the ordinary case and a whole `Cite` for the two option sets whose
 * printing is spread over more than one page — the machine list and the LFO destinations.
 */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  where: number | Cite,
  note?: string,
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: typeof where === 'number' ? cite(where) : where },
    verified: false,
    ...(note === undefined ? {} : { note }),
  }
}

/** A numeric whose range is cited and whose point is taste (§3.1). */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: { mood?: { axis: Axis; amount: number }[]; note?: string; unit?: string } = {},
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

// --- SRC page, per machine (APPENDIX A, pp.82-87) ---------------------------

const machine = (m: (typeof MACHINES)[number]) =>
  pick('MACHINE', m, MACHINES, cites('pp.82-87'))
/** The page is the *machine's* PLAY entry, never a sibling's. See `PLAY_PAGE`. */
const play = (on: keyof typeof PLAY_PAGE, m: (typeof PLAY_MODES)[number]) =>
  pick('PLAY', m, PLAY_MODES, cite(PLAY_PAGE[on]))
const segMode = (m: (typeof SEG_MODES)[number]) => pick('WERP MODE', m, SEG_MODES, 84)
const seg = (v: (typeof WERP_SEGMENTS)[number]) => pick('SEG', v, WERP_SEGMENTS, 84)
const bars = (v: (typeof BARS)[number]) => pick('BARS', v, BARS, 84)
const sliceGrid = (v: (typeof SLICE_GRIDS)[number]) => pick('GRID', v, SLICE_GRIDS, 87)

/**
 * `TUNE`, p.82. Bipolar; 0 leaves the pitch unchanged, and pressing and turning DATA ENTRY snaps
 * to semitones, which is what makes an authored value here readable as an interval.
 * **Absent on the Repitch machine** — see the module JSDoc.
 */
const tune = (v: number) =>
  num('TUNE', v, { min: -60, max: 24 }, 82, {
    unit: 'st',
    note: 'Press and turn DATA ENTRY to snap to semitones; hold [FUNC] and turn for octaves',
  })

/** `BR` (Bit Reduction), p.83. On every machine, and the cheapest grit this box has. */
const br = (v: number) =>
  num('BR', v, { min: 0, max: 127 }, 83, { mood: [{ axis: 'grit', amount: 40 }] })

/** `STRT` and `LEN` on the SRC page, pp.83, 85. Not the TRIG page's `LEN` — see `PER_STEP`. */
const strt = (v: number) => num('STRT', v, { min: 0, max: 120 }, 83)
const srcLen = (v: number) =>
  num('SRC LEN', v, { min: 0, max: 120 }, 83, {
    note: 'Sample length on the SRC page; the TRIG page has a different LEN',
  })
const loop = (v: number) =>
  num('LOOP', v, { min: 0, max: 120 }, 83, {
    note: 'Only reached when PLAY is FORWARD LOOP or REVERSE LOOP',
  })
const lev = (v: number) => num('LEV', v, { min: 0, max: 127 }, 83)

/** Slice machine, pp.86-87. `SLICE` also takes `NOTE`, which is a position rather than a number. */
const slice = (v: number) =>
  num('SLICE', v, { min: 1, max: 64 }, 86, {
    note: 'A NOTE setting sits below 1 and plays slices from the [TRIG] keys instead',
  })
const sliceLen = (v: number) =>
  num('SLICE LEN', v, { min: 1, max: 64 }, 86, { note: 'How many slices play consecutively' })

// --- FLTR pages 1 and 2 (pp.44-46) ------------------------------------------

const fltrType = (t: (typeof FLTR_TYPES)[number]) => pick('TYPE', t, FLTR_TYPES, 44)
const fltrAtk = (v: number) => num('FLTR ATK', v, { min: 0, max: 127 }, 44)
const fltrDec = (v: number) => num('FLTR DEC', v, { min: 0, max: 127 }, 44)
const fltrSus = (v: number) => num('SUS', v, { min: 0, max: 127 }, 44)

/** `FREQ`, p.44. Cutoff for a filter `TYPE`, centre frequency for an EQ one. */
const freq = (v: number) =>
  num('FREQ', v, { min: 0, max: 127 }, 44, { mood: [{ axis: 'darkness', amount: -36 }] })

/**
 * `RESO`, p.44 — **the filter half of the RESO/GAIN knob.** Only legal beside a filter `TYPE`;
 * beside an EQ one the same knob is `GAIN` on a different scale. See the module JSDoc.
 */
const reso = (v: number) =>
  num('RESO', v, { min: 0, max: 127 }, 44, {
    note: 'The RESO/GAIN knob reading as resonance, which is what a filter TYPE makes it',
  })

/** `GAIN`, p.44 — the EQ half of the same knob, on its own printed scale. */
const gain = (v: number) =>
  num('GAIN', v, { min: -64, max: 63 }, 44, {
    note: 'The RESO/GAIN knob reading as EQ boost/cut, which is what an EQ TYPE makes it',
  })

/** `ENV` (Env. Depth), p.44. Bipolar: how far the filter envelope moves the cutoff. */
const env = (v: number) => num('ENV', v, { min: -64, max: 63 }, 44)

/** `SRR` (Sample Rate Reduction) and its routing, p.46. */
const srr = (v: number) =>
  num('SRR', v, { min: 0, max: 127 }, 46, { mood: [{ axis: 'grit', amount: 36 }] })
const srrRout = (v: (typeof SRR_ROUTINGS)[number]) => pick('ROUT', v, SRR_ROUTINGS, 46)

/** `BASE` and `WIDTH`, p.46 — the base-width filter, a highpass and a lowpass in series. */
const base = (v: number) => num('BASE', v, { min: 0, max: 127 }, 46)
const width = (v: number) => num('WIDTH', v, { min: 0, max: 127 }, 46)

// --- AMP page (pp.46-47) ----------------------------------------------------

const ampAtk = (v: number) => num('AMP ATK', v, { min: 0, max: 127 }, 46)

/**
 * `HOLD`, p.46. *"(0-126, NOTE)"* — the range is the fixed hold times; `NOTE` is a position past
 * 126 where the hold phase follows Note On and Note Off instead, which no numeric range can say.
 */
const hold = (v: number) =>
  num('HOLD', v, { min: 0, max: 126 }, 46, {
    mood: [{ axis: 'density', amount: -24 }],
    note: 'A NOTE setting sits past 126 and follows Note On/Off instead',
  })

/** `DEC` on the AMP page, p.46. `INF` sits past 126 in the same way `HOLD`'s `NOTE` does. */
const ampDec = (v: number) =>
  num('AMP DEC', v, { min: 0, max: 126 }, 46, {
    mood: [{ axis: 'density', amount: -20 }],
    note: 'An INF setting sits past 126 and never decays',
  })

/** `OVER` (Overdrive), p.46. Clipping distortion into the filter. */
const over = (v: number) =>
  num('OVER', v, { min: 0, max: 127 }, 46, { mood: [{ axis: 'grit', amount: 30 }] })

/**
 * `DEL` and `REV`, the two send levels on the AMP page, p.46. Both print *"(OFF, 0.01-127.00)"*,
 * so `OFF` is a position below the range rather than its floor. `DEL` is the Delay Send here;
 * FLTR page 2 has a different `DEL` (envelope delay), which this manifest does not author because
 * p.45 prints no range for it.
 */
const delSend = (v: number) =>
  num('DEL', v, { min: 0.01, max: 127 }, 46, {
    mood: [{ axis: 'space', amount: 28 }],
    note: 'Delay Send on the AMP page; OFF sits below 0.01 as its own position',
  })
const revSend = (v: number) =>
  num('REV', v, { min: 0.01, max: 127 }, 46, {
    mood: [{ axis: 'space', amount: 34 }],
    note: 'OFF sits below 0.01 as its own position',
  })

/** `VOL`, p.47. Independent of the track level. */
const vol = (v: number) => num('VOL', v, { min: 0, max: 127 }, 47)

// --- LFO page (pp.47-48) ----------------------------------------------------

const lfoMode = (m: (typeof LFO_MODES)[number]) => pick('LFO MODE', m, LFO_MODES, 48)
const lfoWave = (w: (typeof LFO_WAVES)[number]) => pick('WAVE', w, LFO_WAVES, 48)

/**
 * `DEST`, cited to the appendix that enumerates it rather than to the entry that defers.
 *
 * The values are APPENDIX C's spellings, which is where the set is printed. **The screen
 * abbreviates them** — p.47's LFO PAGE 1 graphic shows `FILT FREQ` in the DEST field for what
 * p.92 calls `FILTER: Frequency` — so the note carries the short form a reader is looking at.
 */
const dest = (d: (typeof LFO_DESTINATIONS)[number]) =>
  pick(
    'DEST',
    d,
    LFO_DESTINATIONS,
    cites('p.48, p.92'),
    'APPENDIX C spelling; the screen abbreviates it (FILTER: Frequency shows as FILT FREQ). Press [YES] to confirm',
  )

/** `MULT`, as the screen spells it: the family and the factor are one token. See above. */
const mult = (v: (typeof LFO_MULTIPLIERS)[number]) =>
  pick(
    'MULT',
    v,
    LFO_MULTIPLIERS,
    cites('p.47, p.49'),
    'The BPM family: the factor multiplies the current tempo, not a fixed 120. The screen prints BPM above the number',
  )

/**
 * `PHAS` (Start Phase), p.48: *"sets the point within the wave cycle where the LFO will start when
 * it is trigged. 0 makes the LFO start at the beginning of a complete wave cycle, 64 makes it
 * start at the center."*
 *
 * Only authored on a recipe whose `LFO MODE` restarts the cycle on a trig. Under `FRE` the LFO
 * *"run[s] continuously, never restarting"* (p.48), so a start phase there is a number with
 * nothing to apply to.
 */
const phas = (v: number) => num('PHAS', v, { min: 0, max: 127 }, 48)

/** `SPD`, p.47. Bipolar; a negative value plays the cycle backwards. */
const spd = (v: number) =>
  num('SPD', v, { min: -64, max: 63 }, 47, {
    note: 'Try 8, 16 or 32 to sync the LFO to straight beats',
  })

/** `FADE`, p.48. Positive fades the modulation out, negative fades it in. */
const fade = (v: number) => num('FADE', v, { min: -64, max: 63 }, 48)

/** `DEP` (Depth), p.48. Bipolar; 0.00 is no modulation. */
const dep = (v: number) => num('DEP', v, { min: -64, max: 63 }, 48)

// --- Articulation -----------------------------------------------------------

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: Recipe['articulation'] extends (infer E)[] | undefined ? (E extends { slot: infer S } ? S : never) : never,
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// Rear panel (§3.3). p.14 numbers nine connectors and p.81 gives the socket types.
// ---------------------------------------------------------------------------

type JackId =
  | 'HEADPHONES'
  | 'OUTPUT L'
  | 'OUTPUT R'
  | 'INPUT L'
  | 'INPUT R'
  | 'MIDI IN'
  | 'MIDI OUT/SYNC A'
  | 'MIDI THRU/SYNC B'

const JACK_EVIDENCE: Record<string, Cite> = {}

function jack(
  id: JackId,
  direction: 'in' | 'out',
  signal: JackSignalKind[],
  source: Cite,
  extra: { note?: string; clock?: string[] } = {},
): { id: JackId; direction: 'in' | 'out'; signal: JackSignalKind[]; note?: string; clock?: string[] } {
  JACK_EVIDENCE[`jacks[${id}]`] = source
  return { id, direction, signal, ...extra }
}

/**
 * The rear panel in the manual's own numbered order (p.14, items 1-9), with the socket types from
 * p.81's HARDWARE column.
 *
 * **`POWER` and `DC IN` are omitted** for the ordinary reason: an inlet and a switch are not
 * things a reader patches. **The USB port is omitted too**, following the Analog Rytm MKII and
 * the RD-9 in this library: `direction` is one of `in` or `out` and this port is both at once
 * (p.69's `INPUT FROM` and `OUTPUT TO` each name it), so the `usb` transport carries a
 * `sourceSetup` and no socket.
 *
 * **`MIDI THRU/SYNC B` is declared as `midi` alone**, and the DIN sync it can also send lives in
 * its note. p.69 gives it the same three `THRU PORT FUNCTIONALITY` options as the OUT port, so on
 * the page this box has two clock outputs on each of two transports. `DeviceSchema` refuses that,
 * and rightly — the rack draws one cable per transport per direction, and a reader told to take
 * clock from either of two sockets has been given a choice rather than an instruction.
 * `MIDI OUT/SYNC A` is the socket the `sourceSetup` names, so it is the one that carries the
 * claim. That is the Analog Rytm MKII's resolution of the same rear panel.
 */
const JACKS = [
  jack('HEADPHONES', 'out', ['audio'], cites('p.14, p.81'), { note: '1/4" stereo (TRS)' }),
  jack('OUTPUT L', 'out', ['audio'], cites('p.14, p.81'), {
    note: '1/4" TS unbalanced or TRS balanced; impedance balanced',
  }),
  jack('OUTPUT R', 'out', ['audio'], cites('p.14, p.81'), {
    note: '1/4" TS unbalanced or TRS balanced; impedance balanced',
  }),
  jack('INPUT L', 'in', ['audio'], cites('p.14, p.81'), {
    note: '1/4" mono, unbalanced — sampling or audio processing',
  }),
  jack('INPUT R', 'in', ['audio'], cites('p.14, p.81'), {
    note: '1/4" mono, unbalanced — sampling or audio processing',
  }),
  jack('MIDI IN', 'in', ['clock', 'midi'], cite(14), { clock: ['midi-din'] }),
  jack('MIDI OUT/SYNC A', 'out', ['clock', 'midi'], cites('p.14, p.69'), {
    clock: ['midi-din', 'din-sync'],
    note: 'OUT PORT FUNCTIONALITY picks MIDI, DIN 24 or DIN 48; a DIN setting carries no MIDI data (p.69)',
  }),
  jack('MIDI THRU/SYNC B', 'out', ['midi'], cites('p.14, p.69'), {
    note: 'Forwards MIDI IN; THRU PORT FUNCTIONALITY can switch it to DIN 24 or DIN 48 instead (p.69)',
  }),
] as const

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  {
    id: 'dt-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'One-shot kick, played forward through the two-pole lowpass',
    verified: false,
    sourceAudio: { need: 'A dry kick one-shot with a defined attack and no room on it' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('2-pole Lowpass'),
      freq(96),
      reso(28),
      ampAtk(0),
      hold(18),
      ampDec(42),
      over(14),
      vol(112),
    ],
    articulation: [art('downbeat', { velocity: 120 }, 'trig-params')],
  },
  {
    id: 'dt-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'track',
    title: 'Kick bit-crushed before the filter, tail chopped short',
    verified: false,
    sourceAudio: {
      need: 'A kick one-shot with grit already in it — off tape, off vinyl, through an overdriven bus',
    },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      br(52),
      srr(40),
      srrRout('PRE'),
      fltrType('2-pole Lowpass'),
      freq(84),
      reso(44),
      hold(8),
      ampDec(30),
      over(62),
    ],
    articulation: [art('accent', { velocity: 127 }, 'trig-params')],
  },
  {
    id: 'dt-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'Sub tuned an octave down, everything above it filtered off',
    verified: false,
    sourceAudio: {
      need:
        'A clean low sustained tone with a stable, known pitch — TUNE transposes it, so the tuning ' +
        'has to be true before it moves',
    },
    /**
     * `ONESHOT` rather than `REPITCH`, and the module JSDoc says why: p.85 gives Repitch no `TUNE`
     * at all. `-12.00` is one octave, which is what pressing and turning DATA ENTRY snaps to
     * (p.82).
     */
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      tune(-12),
      fltrType('2-pole Lowpass'),
      freq(46),
      reso(12),
      env(0),
      ampAtk(0),
      hold(72),
      ampDec(64),
      vol(118),
    ],
    articulation: [art('downbeat', { 'note-length': 32 }, 'trig-params')],
  },
  {
    id: 'dt-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'Tuned bass with the filter envelope opening each note',
    verified: false,
    sourceAudio: {
      need:
        'A short bass note with harmonics above the fundamental; a filtered sine transposes into ' +
        'nothing to bite on',
    },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      tune(-5),
      br(24),
      fltrType('2-pole Lowpass'),
      fltrAtk(0),
      fltrDec(46),
      fltrSus(20),
      freq(52),
      reso(72),
      env(38),
      hold(12),
      ampDec(48),
      over(40),
    ],
    articulation: [art('downbeat', { velocity: 112, 'note-length': 12 }, 'trig-params')],
  },
  {
    id: 'dt-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'Snare one-shot with the crack lifted by a narrow EQ',
    verified: false,
    sourceAudio: { need: 'A snare one-shot, crack intact and dry' },
    /**
     * `TYPE` is an EQ setting, so the RESO/GAIN knob is reading as `GAIN` on `-64.00-63.00` — see
     * the module JSDoc. `EQ 4` is a narrower band than `EQ 1`: p.45 says the five settings select
     * the bandwidth, *"The higher the Q value, the narrower the bandwidth"*.
     */
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('EQ 4'),
      freq(78),
      gain(22),
      ampAtk(0),
      hold(20),
      ampDec(52),
      revSend(18),
      vol(110),
    ],
    articulation: [art('backbeat', { velocity: 124 }, 'trig-params')],
  },
  {
    id: 'dt-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'track',
    title: 'Snare sample-rate crushed after the filter, with a retrig on the fill',
    verified: false,
    sourceAudio: {
      need: 'A snare one-shot with body to lose — a thin sample crushes into a thinner one',
    },
    /** `ROUT` is `POST`, so the reduction lands on the filtered signal rather than feeding it. */
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      br(36),
      srr(64),
      srrRout('POST'),
      fltrType('2-pole Highpass'),
      freq(34),
      reso(30),
      hold(16),
      ampDec(44),
      over(48),
    ],
    articulation: [
      art('backbeat', { velocity: 118 }, 'trig-params'),
      art('fill', { retrig: true, 'retrig-rate': '1/32', 'retrig-velocity': -64 }, 'retrig'),
    ],
  },
  {
    id: 'dt-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'Clap over the snare with the base-width filter opened wide',
    verified: false,
    sourceAudio: { need: 'A hand-clap one-shot, several hands rather than one' },
    /**
     * p.46: with `BASE` at 0 and `WIDTH` at 127 the base-width filter does not affect the sound,
     * so this pair is a deliberate near-bypass that still lifts the bottom off the clap.
     */
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('EQ 2'),
      freq(92),
      gain(16),
      base(26),
      width(127),
      hold(28),
      ampDec(58),
      revSend(34),
    ],
    articulation: [art('backbeat', { velocity: 110 }, 'trig-params')],
  },
  {
    id: 'dt-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
    title: 'Closed hat, offbeats pulled back off the grid',
    verified: false,
    sourceAudio: { need: 'A closed hat one-shot under 150 ms, dry' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('2-pole Highpass'),
      freq(58),
      reso(18),
      ampAtk(0),
      hold(4),
      ampDec(16),
      vol(96),
    ],
    articulation: [art('offbeat', { velocity: 84, 'micro-timing': -2 }, 'micro-timing')],
  },
  {
    id: 'dt-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'track',
    title: 'Bit-reduced hat with ghosts thinned out by probability',
    verified: false,
    sourceAudio: {
      need: 'A closed hat one-shot that is already lo-fi — a sampled machine hat, not a studio recording',
    },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      br(78),
      fltrType('2-pole Highpass'),
      freq(64),
      reso(36),
      hold(3),
      ampDec(14),
    ],
    articulation: [
      art('offbeat', { velocity: 88 }, 'trig-params'),
      art('ghost', { velocity: 48, probability: 60 }, 'trig-params'),
    ],
  },
  {
    id: 'dt-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'track',
    title: 'Open hat let ring, filter out of the way',
    verified: false,
    sourceAudio: { need: 'An open hat one-shot with a real tail to hold open' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('OFF'),
      hold(72),
      ampDec(96),
      revSend(26),
      vol(104),
    ],
    articulation: [art('offbeat', { velocity: 108, 'note-length': 16 }, 'trig-params')],
  },
  {
    id: 'dt-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Quiet percussion, half of it not playing',
    verified: false,
    sourceAudio: { need: 'A shaker, tick or brushed one-shot under 100 ms' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('2-pole Highpass'),
      freq(42),
      reso(10),
      hold(6),
      ampDec(18),
      vol(72),
    ],
    articulation: [art('ghost', { velocity: 40, probability: 50 }, 'trig-params')],
  },
  {
    id: 'dt-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'track',
    title: 'Metallic hit driven into the resonant lowpass',
    verified: false,
    sourceAudio: { need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      br(44),
      fltrType('2-pole Lowpass'),
      freq(70),
      reso(112),
      env(-24),
      fltrDec(58),
      hold(40),
      ampDec(72),
      over(56),
    ],
    articulation: [art('offbeat', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'dt-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    title: 'Tom tuned down a fourth, top end rolled off',
    verified: false,
    sourceAudio: { need: 'A single tom hit with a pitched body rather than a slap' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      tune(-5),
      fltrType('2-pole Lowpass'),
      freq(54),
      reso(20),
      hold(24),
      ampDec(68),
      delSend(20),
    ],
    articulation: [art('fill', { velocity: 116 }, 'trig-params')],
  },
  {
    id: 'dt-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'track',
    title: 'Vocal cut into sixteen slices, one slice per hit',
    verified: false,
    sourceAudio: {
      need:
        'One or two bars of vocal with evenly spaced syllables, so a sixteen-way slice grid lands ' +
        'on them rather than between them',
    },
    /**
     * `SLICE` is a fixed slice number rather than `NOTE`, and that is the honest half of what this
     * machine can do here: p.87's LINEAR LOCKS and RANDOM LOCKS allocate a *different* slice to
     * every trig, which is per-trig identity and outside what `articulation` can carry (#57). One
     * slice under every hit is what a slot-wide `set` actually means.
     */
    params: [
      machine('SLICE'),
      play('SLICE', 'FORWARD'),
      sliceGrid('16'),
      slice(1),
      sliceLen(1),
      fltrType('EQ 3'),
      freq(80),
      gain(12),
      hold(18),
      ampDec(40),
      delSend(24),
    ],
    articulation: [art('accent', { velocity: 118 }, 'trig-params')],
  },
  {
    id: 'dt-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'Loop warped to the project tempo, LFO free-running over the cutoff',
    verified: false,
    sourceAudio: {
      need:
        'A sustained two- or four-bar loop whose own tempo you know. WERP cuts it into segments and ' +
        'realigns them, so BARS has to match what the loop actually is',
    },
    /**
     * `SPD 16` against `MULT BPM 8` reads 1 in p.49's table — one full cycle in the sixteen steps the
     * sequencer takes to cross a bar, so the filter breathes once a bar under the loop. `FRE`
     * leaves it running across trigs, which is why no `PHAS` is authored here: p.48's start phase
     * is the point a *trigged* LFO starts from, and this one never restarts.
     */
    params: [
      machine('WERP'),
      play('WERP', 'FORWARD LOOP'),
      seg('1/16'),
      segMode('FORWARD'),
      bars('4'),
      fltrType('2-pole Lowpass'),
      freq(62),
      reso(24),
      lfoWave('SIN'),
      lfoMode('FRE'),
      dest('FILTER: Frequency'),
      spd(16),
      mult('BPM 8'),
      dep(28),
      fade(24),
      hold(96),
      revSend(48),
    ],
    articulation: [art('downbeat', { 'note-length': 64 }, 'trig-params')],
  },
  {
    id: 'dt-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'Sample played backwards, LFO sweeping the cutoff once into the change',
    verified: false,
    sourceAudio: {
      need:
        'A sample with a long decaying tail — REVERSE turns that tail into the rise, so the tail is ' +
        'the part that matters',
    },
    /**
     * `ONE` runs the waveform once and stops, which is what makes the LFO an envelope (p.48) —
     * and it is the one mode on this box where `PHAS` matters, because it is the phase the single
     * sweep starts from. 0 starts the ramp at the beginning of its cycle.
     *
     * `SPD 4` against `MULT BPM 8` reads 4 in p.49's table, and the table's unit is whole notes per
     * cycle where 1 is sixteen sequencer steps — so the sweep takes four bars and then stops,
     * which is a riser rather than a wobble.
     */
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'REVERSE'),
      fltrType('2-pole Lowpass'),
      freq(40),
      reso(58),
      lfoWave('RMP'),
      lfoMode('ONE'),
      dest('FILTER: Frequency'),
      spd(4),
      mult('BPM 8'),
      phas(0),
      dep(52),
      fade(-48),
      hold(110),
      ampDec(96),
      revSend(56),
    ],
    articulation: [art('last-hit', { velocity: 127, 'note-length': 48 }, 'trig-params')],
  },
  {
    id: 'dt-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'One-shot impact on the change, nothing else touched',
    verified: false,
    sourceAudio: { need: 'A one-shot with a big front — a crash, a gated slam, a reversed hit' },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      strt(0),
      srcLen(120),
      lev(120),
      fltrType('OFF'),
      hold(110),
      ampDec(120),
      revSend(64),
      vol(124),
    ],
    articulation: [art('first-hit', { velocity: 127 }, 'trig-params')],
  },
  {
    id: 'dt-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'Short chord stab from a sample that already contains the chord',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * §12.4. p.15 gives eight voices across eight tracks, so a track sounds one note and a
     * three-note stab is not reachable by any patch on this box. The way out is a sample that is
     * already the chord — once it is loaded, the chord *is* one note as far as the track is
     * concerned.
     *
     * **Both things that make the substitution legitimate are on the page:**
     *
     *  1. *It sustains.* The Oneshot machine *"plays the sample linearly (forward, reversed, or
     *     looped)"* (p.82), and `FORWARD LOOP` holds a chord under a whole bar — which is what the
     *     pad below uses.
     *  2. *It transposes per step.* The TRIG page carries `NOTE`, *"Trig Note sets the pitch of the
     *     note when trigged"* on `(-48-+24)` (p.43), and p.43 opens by saying the audio track
     *     parameters *"may be locked to other settings on any step of the pattern by first pressing
     *     and holding a [TRIG] key"*. So each trigger can carry its own pitch and the chord follows
     *     the progression. `TUNE` reaches the same place by hand (p.82).
     *
     * Transposition preserves the recorded voicing and nothing else: it cannot invert or re-voice
     * the chord, so a changed shape is a second sample (§4.1). The Hook phase lists which samples
     * the part needs and the semitone offset to place on each trigger.
     */
    sourceAudio: {
      need:
        'Chord sample(s) — one per chord shape the hook plays; see Hook for which and for the ' +
        'transposition on each trigger',
    },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD'),
      fltrType('2-pole Lowpass'),
      freq(88),
      reso(34),
      env(20),
      fltrDec(30),
      ampAtk(0),
      hold(22),
      ampDec(36),
      delSend(30),
    ],
    articulation: [art('accent', { velocity: 120, 'note-length': 8 }, 'trig-params')],
  },
  {
    id: 'dt-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'Rendered chord sample, looped and swelled',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * `FORWARD LOOP` is the sustain half of §12.4's bar and `LOOP` is where it returns to; the
     * transposition half is the same `NOTE` trig lock the stab's note above sets out (p.43). Place
     * the Hook phase's printed semitone offset on each trigger; the chord moves as a block and
     * keeps the voicing it was recorded with.
     */
    sourceAudio: {
      need:
        'Sustained chord sample(s), two seconds or longer — one per chord shape the hook plays; ' +
        'see Hook',
    },
    params: [
      machine('ONESHOT'),
      play('ONESHOT', 'FORWARD LOOP'),
      strt(4),
      srcLen(110),
      loop(30),
      fltrType('2-pole Lowpass'),
      freq(56),
      reso(16),
      // SPD 8 against MULT BPM 4 reads 4 in p.49's table: one cycle every four bars, which on
      // AMPLIFIER: Volume is a breath rather than a tremolo. `FRE`, so no PHAS — see the texture.
      lfoWave('TRI'),
      lfoMode('FRE'),
      dest('AMPLIFIER: Volume'),
      spd(8),
      mult('BPM 4'),
      dep(18),
      fade(32),
      ampAtk(48),
      hold(120),
      ampDec(110),
      revSend(72),
    ],
    articulation: [art('downbeat', { 'note-length': 96 }, 'trig-params')],
  },
]

export const device: Device = {
  id: 'elektron-digitakt',
  name: 'Digitakt',
  maker: 'Elektron',

  /** p.59, the manual's own sentence: *"Digitakt is a very competent and accessible sampler."* */
  kind: 'sampler',

  /**
   * §7.4. Sends and receives on both wires, and **sends on a third it cannot receive on** — the
   * Digitone's and the Analog Rytm MKII's shape exactly, because it is the same rear panel and
   * the same two menus.
   *
   * p.69 gives the switches in one list: `CLOCK RECEIVE` *"sets whether or not Digitakt responds
   * to MIDI clock sent from external devices"* and `CLOCK SEND` *"sets whether or not Digitakt
   * transmits MIDI clock"*. Neither names a port; the port is chosen separately by `INPUT FROM`
   * and `OUTPUT TO` on the same page, whose options are DISABLED, MIDI, USB and MIDI+USB.
   *
   * **`din-sync` is send-only, and the asymmetry is on the rear panel.** p.14 names the two
   * outbound ports `MIDI OUT/SYNC A` and `MIDI THRU/SYNC B`, each of which *"can also be
   * configured to send DIN sync to legacy instruments"*, and p.69's `OUT PORT FUNCTIONALITY`
   * gives `DIN 24` and `DIN 48`. `MIDI IN` is *"MIDI data input"* and nothing more; p.81's
   * hardware line agrees in five words — *"MIDI In/Out/Thru with DIN Sync out"*.
   *
   * ## `preferredSource` is not claimed, and the successor's reason is not this one
   *
   * The Digitakt II's manifest declines this field partly on architecture: its sixteen tracks are
   * audio *or* MIDI, so *"a box built to drive a rig does not charge you a voice for it"*.
   * **That argument is not available here and its opposite is true** — p.16 and p.17 give this
   * box eight audio tracks and eight *dedicated* MIDI tracks, so sequencing eight external
   * instruments costs it no audio voice at all.
   *
   * It still does not claim the field, because §7.4 asks what the box is *for* rather than what it
   * can afford. The panel's own line under the screen reads `8 Voice Digital Drum Computer &
   * Sampler` (p.12), p.59 calls it a sampler, and §17 SETUP EXAMPLES frames it as a peer:
   * *"The Digitakt likes to play with other machines... Digitakt gets along with other gear"*
   * (p.76). Its worked examples do show it clocking a legacy bass machine over DIN sync — and the
   * next one has a phone as the audio source and the Digitakt as the sampler. A capability, and a
   * cheap one on this box, is still not a job.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'din-sync'],
    receiveTransport: ['midi-din', 'usb'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'SETTINGS > MIDI CONFIG > SYNC > CLOCK SEND',
        value: 'on',
        note: 'PORT CONFIG > OUT PORT FUNCTIONALITY must be MIDI; DIN 24 and DIN 48 carry no MIDI data',
      },
      {
        transport: 'usb',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUTPUT TO',
        value: 'USB (or MIDI+USB), with SYNC > CLOCK SEND on',
        note: 'MIDI+USB lets MIDI data limit the USB speed; use USB alone for large transfers',
      },
      {
        transport: 'din-sync',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUT PORT FUNCTIONALITY',
        value: 'DIN 24 or DIN 48',
        note: 'No MIDI data leaves that port while it is set; THRU PORT FUNCTIONALITY does the same on SYNC B',
      },
    ],
  },

  /**
   * Stereo main out, a stereo input for sampling, and class-compliant USB audio. p.81 enumerates
   * the sockets — *"2 x 1/4” impedance balanced audio out jacks"*, *"2 x 1/4” audio in jacks"*,
   * *"1 x 1/4” stereo headphone jack"* — and p.14 numbers all nine rear connectors, and there is
   * no track output among them, so `individualOuts: 0`.
   *
   * **p.68's `ROUTE TO MAIN` mentions `TRACK OUTPUTS` and they are not sockets.** *"Note that
   * each track still sends to its TRACK OUTPUTS"* sits beside *"Tracks that are routed to not
   * send audio to MAIN OUT still send audio on separate outputs **in Overbridge**"*, which is the
   * plug-in's channel structure over USB. Reading that as eight individual outs would put eight
   * holes on the rear panel that p.14 and p.81 both say are not there.
   *
   * `usbAudio` is p.20: the box *"is a class compliant device"* and *"can, therefore, stream
   * audio and MIDI directly over USB to and from supported computers/phones/tablets"*.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  jacks: [...JACKS],

  /**
   * §2.6/#111. **This box ships a library nobody has listed, which is `shipped-library`.**
   *
   * p.63 §15.2: the storage opens on three directories and *"A wide array of preset samples are
   * available in the write protected FACTORY directory"*; p.21 adds that there are also preset
   * patterns and Sounds, and p.66 that the FACTORY directory cannot be written to.
   *
   * Not `enumerable`, because no page prints a filename, so a recipe has nothing to reference and
   * the eighteen below describe their audio in `sourceAudio.need` instead. Not `unknown` either:
   * the reading did not run out, it answered — the box arrives with usable sample content in a
   * place a reader can open and browse. `reason` is that limit said to a reader rather than to us.
   */
  content: {
    kind: 'shipped-library',
    library: 'a wide array of preset samples, plus preset patterns and Sounds',
    location: 'the write-protected FACTORY directory on the +Drive',
    reason: 'p.63 says the directory is there and no page lists a single filename',
  },

  /**
   * §2.6/#142. p.43, the TRIG page: *"LEN — Trig Length sets the length of the note trig. In LIVE
   * RECORDING mode, the duration of pressing the [TRIG] keys overrides this general setting.
   * (0-127, INF)"*.
   *
   * The unit comes off p.33, which is where this manual says what the values *mean* rather than
   * that they exist: *"A LEN value of 1/16 adds a sixteenth note and advances the sequencer one
   * step. 1/8 adds an eighth note and advances the sequencer two steps."* Both pages are in the
   * citation, because the claim needs both halves and neither carries it alone.
   *
   * **The Digitone's manifest has the same field with no unit, and the difference is real rather
   * than an inconsistency here.** That manual prints the range and never says what `1` is; this
   * one prints the sentence, in the same words its own successor uses.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'LEN',
    unit: 'note divisions — 1/16 is one step',
  },

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    'clock.canSendClock': cite(69),
    'clock.canReceiveClock': cite(69),
    /**
     * **`partly`, because two of the three transports have a page and the third has an
     * inference** — the Digitone's reading of the same two menus, on the same rear panel.
     */
    'clock.transport': {
      kind: 'partly',
      cite: cites('p.14, p.69, p.81'),
      proven:
        'p.81 specifies “MIDI In/Out/Thru with DIN Sync out”, p.14 names the two outbound ports SYNC A and SYNC B, and p.69’s OUT PORT FUNCTIONALITY offers DIN 24 and DIN 48',
      open:
        'no page names USB as a clock transport — CLOCK SEND and CLOCK RECEIVE are unqualified (p.69) and the port is chosen by OUTPUT TO / INPUT FROM over “MIDI data” generally (p.69), so USB is read off those two together rather than cited',
    },
    'clock.sourceSetup[midi-din]': cite(69),
    'clock.sourceSetup[usb]': {
      kind: 'partly',
      cite: cite(69),
      proven:
        'the menu path and both option lists — SYNC > CLOCK SEND, and OUTPUT TO offering USB and MIDI+USB',
      open:
        'that MIDI clock is among the “MIDI data” OUTPUT TO routes, which no page states in those words',
    },
    'clock.sourceSetup[din-sync]': cites('p.14, p.69, p.76'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the manual says what the box is rather than what it leads — p.12’s panel line “8 Voice Digital Drum Computer & Sampler” and p.59’s “Digitakt is a very competent and accessible sampler” — and p.76 frames it as a peer that “gets along with other gear”, with one worked example clocking a bass machine and the next sampling a phone; the successor’s architectural argument that a MIDI track costs an audio track does not apply here, because p.16 and p.17 give this box eight dedicated MIDI tracks that cost it nothing',
    },
    'io.main': cites('p.14, p.81'),
    'io.individualOuts': cites('p.14, p.68, p.81'),
    'io.audioIn': cites('p.14, p.59, p.81'),
    'io.usbAudio': cites('p.20, p.59, p.77'),
    voices: cites('p.15, p.16, p.17'),
    'features.perStep': cites('pp.34-35, 37-39, 43, 83'),
    noteDuration: cites('p.33, p.43'),
    content: cites('p.21, p.63, p.66'),
  },

  /** p.81: *"Dimensions: W 215 x D 176 x H 63 mm"*. 63 mm is how far off the desk it stands. */
  physical: { panelSpanMm: 215, verified: cite(81) },

  panel: DIGITAKT_PANEL,

  manual: { title: 'Digitakt User Manual', edition: 'OS 1.51' },

  productPage: 'https://www.elektron.se/explore/digitakt',

  /**
   * §2.2. **One pool of eight**, `polyphony: 1` — see the module JSDoc for why that needs p.15 and
   * p.17 together rather than either alone, and for why the eight MIDI tracks are not here.
   *
   * The pool carries every role because a sampler's track is whatever is loaded into it: p.82 says
   * *"You can assign any machine to any audio track"*, and the `KICK SNARE TOM CLAP COWBELL CLOSED
   * HAT OPEN HAT CYMBAL` legend printed under the keys is where a factory kit puts its parts, not
   * a fixed instrument set.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Audio track',
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
   * Seven of eight. A judgement, like every `comfortableVoices` in this library — no page states a
   * crowding threshold and none could.
   *
   * **It is not the successor's judgement and it is not made the successor's way.** There, twelve
   * of sixteen leaves room for the MIDI tracks a full pool would have taken away. Here the MIDI
   * tracks are separate hardware and cost nothing, so the only thing a spare track buys is a place
   * to put the part a guide did not think of: p.59's sampler writes to a track, and the box a
   * reader is standing at is one they are still adding to.
   */
  comfortableVoices: 7,

  features: { perStep: [...PER_STEP] },

  hints: {
    'trig-params': 'Hold a [TRIG] key, turn DATA ENTRY',
    'micro-timing': 'Hold [TRIG], press [LEFT]/[RIGHT]',
    retrig: 'Hold [TRIG], press [UP]/[DOWN]',
    machine: 'Hold [FUNC], press [SRC]',
  },

  recipes,
}

/**
 * The retrig rates p.34 prints, kept beside the manifest because `articulation` carries one of
 * them as a bare string and there is nowhere in `ArticulationEntry` to cite an option set.
 * `1/16` is the nominal rate, one trig per step.
 */
export const RETRIG_RATE_OPTIONS = RETRIG_RATES
