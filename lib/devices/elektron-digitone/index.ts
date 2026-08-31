import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset, ParamScope } from '../../core/params'
import { DIGITONE_PANEL } from './panel'

/**
 * Elektron Digitone (§2.3). Four synth tracks, four MIDI tracks, eight shared voices and one
 * four-operator FM engine. The Digitone II is its successor and `elektron-digitone-ii` was
 * authored first, so the useful thing this note can do is say where the two boxes and their two
 * documents genuinely differ — because on five separate points they do, and four of those points
 * change what this manifest is allowed to write down.
 *
 * ## 1. This manual prints its ranges, and the sibling's does not
 *
 * The Digitone II manifest records that Elektron *"documents what a parameter does and leaves the
 * range to the screen"*, and counts the printed ranges in OS 1.10's manual on two hands. That is
 * a fact about that document, not about Elektron: **OS 1.41's manual prints a range for very
 * nearly every parameter it defines.** §11 alone carries about forty, in the form §11.3.5 uses —
 * *"Harmonics controls waveform of the operators, C, A, and B1... (-26.00–26.00)"* — and §13
 * carries the rest.
 *
 * So where the sibling is enum-dominated and omits uncited numerics, this manifest is **numeric-
 * dominated and cites the range on almost all of them**. The two manifests look different because
 * the two manuals are, and that difference is the reading rather than a change of house style.
 *
 * The three parameters whose ranges the manual withholds are omitted here in the usual way:
 * `MULT` (given as a table of factors rather than a range, so it is an enum instead), the CHORUS
 * page's six knobs (§13.2 defines all six and bounds none), and micro timing — see 4 below.
 *
 * ## 2. Four synth tracks *and* four MIDI tracks, over eight shared voices
 *
 * The Digitone II's sixteen tracks are each audio **or** MIDI, so sequencing something else costs
 * a voice and its manifest writes that cost into `comfortableVoices`. **This box does not work
 * that way.** p.16 and p.17 give it *"four synth tracks"* and, separately, *"four MIDI tracks"*,
 * both present in every pattern. Driving external gear costs no synth track at all.
 *
 * `comfortableVoices` is therefore **omitted**, which leaves it at the assignable count of four.
 * That is not a shrug: the two costs that pushed the sibling from sixteen down to ten are a MIDI
 * track spending an audio track, which does not happen here, and a polyphonic part spending
 * several voices, which is already paid for by `polyphony` below.
 *
 * The voices themselves *are* a shared budget — p.37: *"The Digitone has eight voice polyphony"*,
 * with `VOICE STEALING` deciding what gives when *"you use more than eight voices at the same
 * time"* and `LOCKED VOICES` locking 1–8 of them to one track. `polyphony` is a per-assignable
 * claim with no way to say "these four share", so four members each declaring 8 would promise 32
 * simultaneous notes this box cannot sound. **This manifest declares 2**, which is eight divided
 * evenly by four and therefore a budget the box can always honour whatever the other three tracks
 * are doing. The sibling authored 4 out of 16 downward by judgement; here the same conservative
 * move happens to land on arithmetic. Both are recorded as `partly` in `capabilityEvidence`.
 *
 * ## 3. `ALGO` is still the switch, and it is cited to different pages
 *
 * `CLAUDE.md`'s rule — a value read off the wrong one of two printed scales is made up — bites
 * here exactly as it does on the successor, and this manual is explicit about which parameters
 * hang off the algorithm:
 *
 *  - `MIX` — *"Each algorithm has two carrier outputs (X and Y) that come from two different
 *    operators depending on what algorithm you chose"* (p.48).
 *  - `FDBK` — *"sets the amount of self modulation of the operator that has feedback. This
 *    operator is shown in the algorithm on the screen"* (p.48).
 *  - `LEV A` and `LEV B` — *"sets the modulation amount from operator A"* (p.48), where whether A
 *    modulates anything, and what, is the routing `ALGO` selects (p.90).
 *
 * So **every recipe below carries `ALGO`**, and since this box has one engine rather than five
 * that means every recipe without exception. The options are cited to p.47 — *"Algorithm selects
 * the set structure of how the four operators are connected to each other. (1–8)"* — and the
 * selection is taste, exactly as `GEN` is on the TR-1000.
 *
 * **What is not claimed is which routing each number is.** A.3 on p.90 explains what an algorithm
 * *is* and draws a two-operator example; it prints no numbered diagram of the eight. Nothing here
 * describes an algorithm's topology and no recipe title says what its algorithm does.
 *
 * `RATIO B` is the one printed range deliberately left unused, and this manual states the reason
 * twice (p.47 and p.90): *"The minimum value for B1 and B2 is .25. As you turn the encoder, B2
 * increases until it reaches the max (16). It then starts over from .25 and B1 increases to the
 * next value."* One authored number would not say which of the two operators it is. That the
 * Digitone II manifest reached the same conclusion is agreement, not inheritance — the sentence is
 * printed in both documents and was read in both.
 *
 * ## 4. Three per-step lanes the successor has that this box has not, and one it has differently
 *
 * **There is no retrig here.** The Digitone II's TRIG page carries `RTRG` and `RATE`, and its
 * manifest articulates both. This box's TRIG PARAMETERS page is `ROOT`, `VEL`, `LEN`, `PROB`,
 * `FLT.T`, `LFO.T`, `PTIM`, `PORT` (§11.2, pp.46-47) and that is the whole of it. The word
 * "retrig" occurs twice in 104 pages, both times about an envelope being retriggered (pp.50, 91).
 * So `retrig` and `retrig-rate` are absent from `features.perStep` rather than declared and
 * unreachable: the box does not do it.
 *
 * **Micro timing is omitted for a different reason than on the successor.** There, two printed
 * scales disagreed and a `set` had nowhere to name which. Here §10.6 prints exactly one — the
 * pop-up screenshot on p.38 reads `+1/128` — so that ambiguity does not arise. What arises
 * instead is that **no page bounds it**: §10.6's entire specification of the parameter is *"Press
 * [LEFT]/[RIGHT] keys to adjust the time offset."* A `set` carrying `-4` would be a value nobody
 * has established is reachable. The lane stays declared, because the box does it, and
 * unreachable, because the guide cannot say a legal value.
 *
 * **Two lanes the successor's manifest does not have are reachable here**, and they are cheap
 * and real: `FLT.T` *"controls if the filter envelope is trigged or not. (ON, OFF)"* and `LFO.T`
 * *"controls if the LFO is trigged or not. (ON, OFF)"* (p.47). Both are static booleans on a
 * trig, so a slot-wide `set` stays true of every hit sharing the slot.
 *
 * ## 5. Where this document contradicts itself, and where it prints a word twice
 *
 * Five of these, all left as found rather than smoothed over:
 *
 *  - **The first filter has two names.** p.12 item 6 calls it the *"base-width"* filter, p.17
 *    §5.3.3 calls the same thing *"the bandpass and multimode filters"*, and §11.8 — the section
 *    that defines the parameter and draws its response — says Base-Width throughout, as does
 *    §11.7's cross-reference. Two pages against one, and the deciding one is the section that
 *    specifies it. This manifest never names the filter, so nothing here depends on it; it is
 *    recorded because the next reader will hit the same three pages.
 *  - **The LFO trig modes are spelled twice.** §11.11.7 on p.54 defines them as `FRE`, `TRG`,
 *    `HLD`, `ONE`, `HLF`; the diagram table on p.55 heads its five columns `FREE`, `TRIG`,
 *    `HOLD`, `ONE`, `HALF`. The three-letter forms are what §11.11.7 presents as the parameter's
 *    settings and are the length the screen shows, so those are the tokens; the table's words
 *    label pictures. (The successor prints the long forms in the equivalent body text, which is
 *    why the two manifests carry different strings for the same five modes.)
 *  - **`FDBK` stops at 120, not 127.** p.48 gives `(0.00–120.00)` where every neighbouring
 *    parameter on the page runs to 127. It is printed once, so it is taken as printed.
 *  - **The DIN sync menu item has two names.** §14.5.2 on p.71 defines it as `OUT PORT FUNC`;
 *    §16.1's worked procedure on p.82 tells the reader to *"set OUT PORT CONFIG to DIN24"*. The
 *    `clock.sourceSetup` entry below carries p.71's spelling, on the same rule as the filter
 *    above — the section that defines the setting wins over the one that uses it — and this is
 *    the one of the four that a reader would actually trip over, since it is a menu item they go
 *    looking for.
 *  - **A cross-reference is off by five.** §11.11.4 on p.54 sends the reader to Appendix C *"on
 *    page 104"*; the table of contents and the appendix's own footer both say 99. Page numbers
 *    below are the footers, checked at pp.5, 6, 7, 8, 47, 88 and 93 — printed folio equals PDF
 *    page throughout this document.
 *
 * ## `LEN` has a range and no unit, and that is a claim rather than an omission
 *
 * p.46: *"Trig Length sets the duration of the notes... (0.125–128, INF)"*. No page in this
 * manual maps that scale onto note values — the successor's does, which is why its `noteDuration`
 * carries `unit: 'note divisions — 1/16 is one step'` and this one carries none. `NoteDuration`
 * makes `unit` optional for exactly this case. Where a recipe articulates `note-length` below, the
 * number is on the printed 0.125–128 scale and the guide claims nothing more about it than that
 * it is what goes in the field.
 */

const MANUAL = 'Digitone User Manual OS 1.41'

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
 * SYN1 `ALGO`, p.47: *"Algorithm selects the set structure of how the four operators are
 * connected to each other. (1–8)"* The screen prints the selection as a numeral, so these are
 * the tokens. See the module note for why no routing is described.
 */
const ALGOS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

/**
 * FLTR page 1 `TYPE`, p.51, reproduced with the manual's own typography — including `4 pole`
 * where its three neighbours are hyphenated. The p.51 screenshot shows the screen abbreviating
 * the last one to `LP4`, and the abbreviations for the other three are not printed anywhere, so
 * the long forms are what a manifest can cite.
 */
const FILTER_TYPES = [
  'OFF',
  '2-pole (12 dB) Lowpass',
  '2-pole (12 dB) Highpass',
  '4 pole (24 dB) Lowpass',
] as const

/**
 * SOUND SETUP `PLAY MODE`, p.29. **This is the switch a chord recipe cannot come apart from**: a
 * `polyphonic-voice` recipe on a Sound left in `MONO` sounds one note of the chord, so the two
 * chordal recipes below carry `POLY` beside their notes for the same reason every recipe carries
 * `ALGO`.
 */
const PLAY_MODES = ['POLY', 'POLY M.LFO', 'MONO', 'MONO LEG.'] as const

/** LFO `MODE` (Trig Mode), p.54. See the module note for why not the p.55 table's long forms. */
const LFO_MODES = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'] as const

/**
 * LFO `WAVE`, p.55. §11.11.5 on p.54 names the seven in English ("Triangle, Sine, Square,
 * Sawtooth, Exponential, Ramp, and Random"); the LFO WAVEFORMS AND TRIG MODES table on p.55
 * prints the on-screen tokens down its left edge, which is what an option set has to carry.
 */
const LFO_WAVES = ['TRI', 'SIN', 'SQR', 'SAW', 'EXP', 'RMP', 'RND'] as const

/**
 * LFO `MULT`, p.55. §11.11.2 describes it in prose and gives no range; the speed table on p.55
 * heads its twelve columns with the factors themselves, which is why this is an enum rather than
 * one of this manual's many numerics. `1K` and `2K` are the table's own spelling.
 */
const LFO_MULTS = ['1', '2', '4', '8', '16', '32', '64', '128', '256', '512', '1K', '2K'] as const

/** SYN2 page 2 `PHRT` (Phase Reset), p.50 — the manual lists all five with what each resets. */
const PHASE_RESETS = ['OFF', 'ALL', 'C', 'A+B', 'A+B2'] as const

/** The on/off pairs: `ATRG`/`BTRG` and `ARST`/`BRST` (pp.49-51), and `AENR` (p.53). */
const ON_OFF = ['ON', 'OFF'] as const

/** DELAY `X` (Ping-pong), p.61. Printed OFF first, unlike the ON/OFF pairs above. */
const PINGPONG = ['OFF', 'ON'] as const

/**
 * §2.3's per-step vocabulary — the per-trig capabilities this manual documents.
 *
 * Reachable from `articulation`, because each is a scalar or a boolean that stays true applied to
 * every hit sharing a slot: `velocity` and `note-length` (VEL, LEN — p.46), `probability` (PROB,
 * p.46, whose outcome is *"re-evaluated every time a trig is set to play"*, so it carries no
 * state), `filter-trig` and `lfo-trig` (FLT.T, LFO.T — p.47), and `portamento` with
 * `portamento-time` (PORT and PTIM, p.47 — paired, because a glide with no time is not an
 * instruction anyone can carry out).
 *
 * Declared and deliberately unreachable:
 *
 *  - `micro-timing` — one printed scale and no printed range. See the module note.
 *  - `condition` — PRE, NEI, 1ST and A:B are stateful (pp.40-41), depending on the previously
 *    evaluated condition on this or the neighbour track, on where the pattern is in its loop, or
 *    on a repetition counter. A `set` is a static scalar with no evaluation order.
 *  - `fill` — depends on whether the device is in FILL mode, which is global runtime state (p.41).
 *  - `sound-lock` — a per-step Sound change from the pool (p.40). Expressible in principle and
 *    omitted in practice, because the value would be a Sound name nobody can know (invariant 5):
 *    p.27's pool holds 128 and the only two the document names anywhere are `B001` and `B002` on
 *    p.89, cited there as demonstrations of what feedback does rather than as parts.
 */
const PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'filter-trig',
  'lfo-trig',
  'portamento',
  'portamento-time',
  'micro-timing',
  'condition',
  'fill',
  'sound-lock',
] as const

/** The subset `articulation` may use. Exported so the test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'filter-trig',
  'lfo-trig',
  'portamento',
  'portamento-time',
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

/** An enum whose option set is cited and whose selection is taste (§3.2). */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  page: number,
  note?: string,
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...(note === undefined ? {} : { note }),
  }
}

/** A numeric whose range this manual prints and whose point inside it is taste (§3.2). */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: { mood?: MoodOffset[]; unit?: string; scope?: ParamScope; note?: string } = {},
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

// -- SYN1: the FM engine's routing and ratios -------------------------------

/** The switch every algorithm-dependent value on this box hangs off. */
const algo = (n: (typeof ALGOS)[number]) => pick('ALGO', n, ALGOS, 47)

/** p.47. C *"always works like a carrier"* and is *"limited mostly to integers"* (p.90). */
const ratioC = (v: number) => num('RATIO C', v, { min: 0.25, max: 16 }, 47)

/** p.47. A *"has a more extensive number of ratio values to allow for more inharmonic relationships"* (p.90). */
const ratioA = (v: number) => num('RATIO A', v, { min: 0.25, max: 16 }, 47)

/** p.47. Negative shapes operator C, positive shapes A and B1 (p.92). */
const harm = (v: number) =>
  num('HARM', v, { min: -26, max: 26 }, 47, {
    mood: [{ axis: 'darkness', amount: -10 }],
    note: 'Negative changes the harmonics of operator C, positive changes A and B1',
  })

/** p.47. *"Up until a parameter value of around 64, the offset is very slight."* */
const dtun = (v: number) => num('DTUN', v, { min: 0, max: 127 }, 47)

/** p.48, and the one parameter on the page that stops at 120. Which operator it reaches is ALGO's answer. */
const fdbk = (v: number) =>
  num('FDBK', v, { min: 0, max: 120 }, 48, {
    mood: [{ axis: 'grit', amount: 8 }],
    note: 'Self-modulates whichever operator the selected ALGO draws with a feedback loop',
  })

/** p.48. Which two timbres it crosses between is ALGO's answer, not this one's. */
const mix = (v: number) =>
  num('MIX', v, { min: -64, max: 63 }, 48, {
    note: 'Crossfades the X and Y carrier outputs the selected ALGO puts there',
  })

// -- SYN2: the two operator envelopes ---------------------------------------

/** p.48. *"it is important that you turn the LEV parameters up, since they set the amount of frequency modulation."* */
const levA = (v: number) => num('LEV A', v, { min: 0, max: 127 }, 48)
const decA = (v: number) => num('DEC A', v, { min: 0, max: 127 }, 48)
const endA = (v: number) => num('END A', v, { min: 0, max: 127 }, 48)

/** p.49. Macro-mapped across B1 and B2 by the graph on the same page. */
const levB = (v: number) =>
  num('LEV B', v, { min: 0, max: 127 }, 49, {
    note: 'Macro-mapped across B1 and B2 — see the graph on p.49',
  })
const decB = (v: number) => num('DEC B', v, { min: 0, max: 127 }, 49)

/** p.49. ON makes the envelope ADE; OFF makes it ASDE, sustaining for the note length. */
const aTrig = (v: (typeof ON_OFF)[number]) =>
  pick('ATRG', v, ON_OFF, 49, 'ON gives ADE, OFF gates it into ASDE for the note length')
const bTrig = (v: (typeof ON_OFF)[number]) => pick('BTRG', v, ON_OFF, 51)

/** p.50 / p.51. Whether the operator envelopes restart when retrigged. */
const aReset = (v: (typeof ON_OFF)[number]) => pick('ARST', v, ON_OFF, 50)

/** p.50. Whether the operator phases return to 0 on a trig, and which ones. */
const phrt = (v: (typeof PHASE_RESETS)[number]) => pick('PHRT', v, PHASE_RESETS, 50)

// -- FLTR: multimode first page, base-width second --------------------------

const fltrType = (v: (typeof FILTER_TYPES)[number]) => pick('TYPE', v, FILTER_TYPES, 51)

const freq = (v: number) =>
  num('FREQ', v, { min: 0, max: 127 }, 51, {
    mood: [{ axis: 'darkness', amount: -14 }],
    note: 'Cutoff of the multimode filter, FLTR page 1',
  })

const reso = (v: number) => num('RESO', v, { min: 0, max: 127 }, 51)

/** p.51. Bipolar, so a negative depth closes the filter as the envelope opens. */
const fltrEnv = (v: number) => num('ENV', v, { min: -64, max: 63 }, 51)

/** p.52. With BASE at 0 the pair is a lowpass; with WIDTH at 127 it is a highpass. */
const base = (v: number) => num('BASE', v, { min: 0, max: 127 }, 52, { note: 'FLTR page 2' })
const width = (v: number) => num('WIDTH', v, { min: 0, max: 127 }, 52, { note: 'FLTR page 2' })

// -- AMP --------------------------------------------------------------------

const ampAtk = (v: number) => num('ATK', v, { min: 0, max: 127 }, 52, { note: 'AMP page 1' })

const ampDec = (v: number) =>
  num('DEC', v, { min: 0, max: 127 }, 52, {
    mood: [{ axis: 'density', amount: -20 }],
    note: 'AMP page 1',
  })

const ampSus = (v: number) => num('SUS', v, { min: 0, max: 127 }, 53, { note: 'AMP page 1' })

/**
 * p.53, `(0–126, INF)`. The range here is the numeric part; `INF` sits above 126 as a separate
 * setting and a numeric point cannot be it.
 */
const ampRel = (v: number) =>
  num('REL', v, { min: 0, max: 126 }, 53, { note: 'AMP page 1; INF sits above 126' })

/** p.53. *"the amount of overdrive and clipping distortion of the signal entering the filter."* */
const drv = (v: number) =>
  num('DRV', v, { min: 0, max: 127 }, 53, { mood: [{ axis: 'grit', amount: 10 }] })

/** p.53, `(OFF, 0.01–127.00)`. OFF sits below 0.01 and is not a point on this range. */
const revSend = (v: number) =>
  num('REV', v, { min: 0.01, max: 127 }, 53, {
    mood: [{ axis: 'space', amount: 16 }],
    note: 'AMP page 2; OFF sits below 0.01',
  })

const delSend = (v: number) =>
  num('DEL', v, { min: 0.01, max: 127 }, 53, {
    mood: [{ axis: 'space', amount: 10 }],
    note: 'AMP page 2; OFF sits below 0.01',
  })

const chrSend = (v: number) =>
  num('CHR', v, { min: 0.01, max: 127 }, 53, { note: 'AMP page 2; OFF sits below 0.01' })

/** p.53. OFF *"lets the envelope cycle complete"* rather than restarting it on every trig. */
const aenr = (v: (typeof ON_OFF)[number]) => pick('AENR', v, ON_OFF, 53)

// -- LFO --------------------------------------------------------------------

const lfoSpd = (v: number) =>
  num('SPD', v, { min: -64, max: 63 }, 54, {
    note: 'Bipolar — negative values run the cycle backward',
  })

const lfoMult = (v: (typeof LFO_MULTS)[number]) => pick('MULT', v, LFO_MULTS, 55)
const lfoWave = (v: (typeof LFO_WAVES)[number]) => pick('WAVE', v, LFO_WAVES, 55)
const lfoMode = (v: (typeof LFO_MODES)[number]) => pick('MODE', v, LFO_MODES, 54)

/** p.54. Positive fades out, negative fades in. */
const lfoFade = (v: number) => num('FADE', v, { min: -64, max: 63 }, 54)

const lfoDep = (v: number) => num('DEP', v, { min: -64, max: 63 }, 54)

// -- Pattern-level: the sends and the master page ---------------------------

/**
 * p.60: the chorus, delay and reverb *"are send effects and are on a pattern level. It means that
 * all the Sounds in a pattern shares the same effect settings but have individual send levels."*
 * So the effect's own parameters are hoisted out of the per-part list by `scope`, while the sends
 * above stay per-track.
 */
const delayTime = (v: number) =>
  num('TIME', v, { min: 1, max: 128 }, 61, {
    scope: 'pattern',
    note: 'Relative to BPM, measured in 128th notes — see the divide-ratio table on p.61',
  })

const delayFdbk = (v: number) =>
  num('FDBK', v, { min: 0, max: 198 }, 61, {
    scope: 'pattern',
    note: 'DELAY page; high settings swell — this is not the SYN1 FDBK',
  })

const pingpong = (v: (typeof PINGPONG)[number]) =>
  pick('X', v, PINGPONG, 61, 'DELAY page ping-pong; WID sets how wide it swings')

const reverbDec = (v: number) =>
  num('DEC', v, { min: 1, max: 127 }, 62, {
    scope: 'pattern',
    mood: [{ axis: 'space', amount: 14 }],
    note: 'REVERB page; INF sits above 127',
  })

const reverbFreq = (v: number) =>
  num('FREQ', v, { min: 0, max: 127 }, 62, {
    scope: 'pattern',
    note: 'REVERB page FB shelving frequency, not the filter cutoff',
  })

/** p.62. *"introduces overdrive distortion at the very end of the Digitone signal path."* */
const movd = (v: number) =>
  num('MOVD', v, { min: 0, max: 127 }, 62, {
    scope: 'pattern',
    mood: [{ axis: 'grit', amount: 6 }],
    note: 'MASTER page 1 — one setting for the whole pattern',
  })

/**
 * The TEMPO menu's swing, p.41: *"Turn DATA ENTRY knob E to set the SWING ratio to 51-80%. The
 * default setting is equal spacing, 50%."* One setting for the whole pattern (p.27 lists swing
 * among what a pattern contains), so it is hoisted out of the per-part list by `scope`.
 */
const swing = (v: number) =>
  num('SWING', v, { min: 51, max: 80 }, 41, {
    unit: '%',
    scope: 'pattern',
    mood: [{ axis: 'swing', amount: 12 }],
    note: 'One setting for the whole pattern, not per track',
  })

const playMode = (v: (typeof PLAY_MODES)[number]) => pick('PLAY MODE', v, PLAY_MODES, 29)

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: Recipe['articulation'] extends (infer E)[] | undefined
    ? E extends { slot: infer S }
      ? S
      : never
    : never,
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  // -------------------------------------------------------------------------
  // Percussion. One engine, so these differ from the tonal parts by envelope and
  // ratio rather than by machine.
  // -------------------------------------------------------------------------
  {
    id: 'dn-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Integer carrier, modulation gone in a fortieth of the decay',
    verified: false,
    params: [
      algo('1'),
      playMode('MONO'),
      ratioC(1),
      harm(-9),
      fdbk(18),
      mix(-38),
      levA(96),
      decA(14),
      endA(0),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(44),
      ampAtk(0),
      ampDec(36),
      ampSus(0),
      drv(74),
      swing(52),
    ],
    articulation: [art('downbeat', { velocity: 120 }, 'trig-params')],
  },
  {
    id: 'dn-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'Carrier alone, harmonics pulled back toward the sine',
    verified: false,
    params: [
      algo('1'),
      playMode('MONO'),
      ratioC(1),
      harm(-22),
      fdbk(0),
      mix(-64),
      levA(16),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(31),
      ampAtk(2),
      ampSus(104),
      ampRel(38),
    ],
    articulation: [art('downbeat', { 'note-length': 4 }, 'trig-params')],
  },
  {
    id: 'dn-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'Ratio two above the carrier, overdriven into the ladder',
    verified: false,
    params: [
      algo('2'),
      playMode('MONO'),
      ratioC(1),
      ratioA(2),
      harm(11),
      fdbk(62),
      mix(-16),
      levA(78),
      decA(52),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(58),
      reso(46),
      ampDec(30),
      ampSus(58),
      drv(96),
      movd(28),
    ],
    articulation: [art('downbeat', { velocity: 112, 'note-length': 1 }, 'trig-params')],
  },
  {
    id: 'dn-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'Inharmonic pair, base-width filter taking the low end out',
    verified: false,
    params: [
      algo('4'),
      playMode('MONO'),
      ratioC(1),
      ratioA(7.5),
      harm(16),
      fdbk(88),
      mix(12),
      levA(104),
      decA(20),
      endA(6),
      fltrType('2-pole (12 dB) Highpass'),
      freq(52),
      base(46),
      ampDec(26),
      ampSus(0),
      drv(64),
      swing(52),
    ],
    articulation: [art('backbeat', { velocity: 124 }, 'trig-params')],
  },
  {
    id: 'dn-rim-bright',
    role: 'rim',
    character: 'bright',
    voice: 'track',
    title: 'Short metallic click, phase reset on every hit so it lands the same',
    verified: false,
    params: [
      algo('3'),
      playMode('MONO'),
      ratioC(4),
      ratioA(11),
      harm(20),
      fdbk(30),
      mix(28),
      levA(70),
      decA(6),
      phrt('ALL'),
      fltrType('2-pole (12 dB) Highpass'),
      freq(74),
      ampDec(9),
      ampSus(0),
    ],
    articulation: [art('offbeat', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'dn-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Tick under everything, half of it not playing',
    verified: false,
    params: [
      algo('3'),
      playMode('MONO'),
      ratioC(2),
      ratioA(9),
      harm(4),
      fdbk(24),
      mix(6),
      levA(48),
      decA(4),
      fltrType('2-pole (12 dB) Highpass'),
      freq(68),
      ampDec(7),
      ampSus(0),
      swing(58),
    ],
    articulation: [art('ghost', { velocity: 40, probability: 50 }, 'trig-params')],
  },
  {
    id: 'dn-closed-hat-bright',
    role: 'closed-hat',
    character: 'bright',
    voice: 'track',
    title: 'Feedback near its ceiling, highpassed and cut off short',
    verified: false,
    params: [
      algo('5'),
      playMode('MONO'),
      ratioC(8),
      ratioA(13.5),
      harm(24),
      fdbk(116),
      mix(20),
      levA(112),
      decA(3),
      phrt('ALL'),
      fltrType('2-pole (12 dB) Highpass'),
      freq(92),
      ampDec(5),
      ampSus(0),
      swing(56),
    ],
    articulation: [
      art('offbeat', { velocity: 88 }, 'trig-params'),
      art('ghost', { velocity: 44, probability: 60 }, 'trig-params'),
    ],
  },
  {
    id: 'dn-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'track',
    title: 'Same feedback, let ring, lowpass taking the fizz off',
    verified: false,
    params: [
      algo('5'),
      playMode('MONO'),
      ratioC(8),
      ratioA(13.5),
      harm(14),
      fdbk(104),
      mix(16),
      levA(100),
      decA(44),
      endA(20),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(78),
      ampDec(62),
      ampSus(0),
      ampRel(40),
      swing(56),
    ],
    articulation: [art('offbeat', { velocity: 104, 'note-length': 2 }, 'trig-params')],
  },
  {
    id: 'dn-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'track',
    title: 'Long inharmonic wash, amp envelope left to complete between hits',
    verified: false,
    params: [
      algo('6'),
      playMode('MONO'),
      ratioC(6),
      ratioA(14.5),
      harm(22),
      fdbk(72),
      mix(30),
      levA(84),
      decA(96),
      endA(34),
      fltrType('2-pole (12 dB) Highpass'),
      freq(70),
      ampDec(88),
      ampSus(0),
      ampRel(60),
      aenr('OFF'),
      revSend(28),
    ],
    articulation: [art('offbeat', { velocity: 84 }, 'trig-params')],
  },
  {
    id: 'dn-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'track',
    title: 'Bell partials off the harmonics series, struck and left to ring',
    verified: false,
    params: [
      algo('4'),
      playMode('MONO'),
      ratioC(1),
      ratioA(3.5),
      harm(26),
      dtun(18),
      fdbk(46),
      mix(24),
      levA(92),
      decA(66),
      endA(12),
      fltrType('2-pole (12 dB) Lowpass'),
      freq(96),
      reso(28),
      ampDec(74),
      ampSus(0),
      ampRel(52),
      revSend(40),
    ],
    articulation: [art('accent', { velocity: 110 }, 'trig-params')],
  },
  {
    id: 'dn-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    title: 'Body held on the carrier, top rolled off at the filter',
    verified: false,
    params: [
      algo('1'),
      playMode('MONO'),
      ratioC(1),
      harm(-12),
      fdbk(26),
      mix(-24),
      levA(64),
      decA(28),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(48),
      ampDec(52),
      ampSus(0),
      drv(38),
    ],
    articulation: [art('accent', { velocity: 116 }, 'trig-params')],
  },
  {
    id: 'dn-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track',
    title: 'Both operator groups at full modulation, nothing tonal left in it',
    verified: false,
    params: [
      algo('7'),
      playMode('MONO'),
      ratioC(15),
      ratioA(13.75),
      harm(25),
      dtun(112),
      fdbk(120),
      mix(0),
      levA(127),
      levB(127),
      decB(80),
      fltrType('2-pole (12 dB) Highpass'),
      freq(56),
      width(96),
      ampSus(72),
      drv(88),
      movd(34),
    ],
    articulation: [art('accent', { velocity: 100 }, 'trig-params')],
  },

  // -------------------------------------------------------------------------
  // Tonal parts. Two of them carry PLAY MODE POLY, and that is the switch the
  // notes cannot come apart from.
  // -------------------------------------------------------------------------
  {
    id: 'dn-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'Gated operator envelopes, so the modulation lasts as long as the note does',
    verified: false,
    /**
     * §12.4. `realisation` stays at its default `polyphonic-voice` because this box sounds the
     * notes itself — but only in `POLY`. p.29's `MONO` *"is monophonic"*, and the same Sound left
     * there would sound one note of the chord while the guide read as correct, so the mode sits
     * in the params beside the notes.
     */
    params: [
      algo('6'),
      playMode('POLY M.LFO'),
      ratioC(1),
      ratioA(2),
      harm(-7),
      dtun(38),
      fdbk(12),
      mix(4),
      levA(52),
      levB(44),
      aTrig('OFF'),
      bTrig('OFF'),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(62),
      fltrEnv(18),
      ampAtk(48),
      ampSus(96),
      ampRel(88),
      revSend(56),
      lfoMode('FRE'),
      lfoWave('SIN'),
      lfoSpd(12),
      lfoMult('8'),
      lfoDep(14),
      reverbDec(96),
    ],
    articulation: [art('downbeat', { 'note-length': 16 }, 'trig-params')],
  },
  {
    id: 'dn-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'Chord played as a chord, operator envelopes trigged so every note bites',
    verified: false,
    params: [
      algo('2'),
      playMode('POLY'),
      ratioC(1),
      ratioA(4),
      harm(9),
      fdbk(34),
      mix(-8),
      levA(88),
      decA(22),
      aTrig('ON'),
      aReset('ON'),
      phrt('A+B'),
      fltrType('2-pole (12 dB) Lowpass'),
      freq(72),
      reso(38),
      fltrEnv(30),
      ampAtk(0),
      ampDec(24),
      ampSus(0),
      delSend(22),
    ],
    articulation: [art('accent', { velocity: 118, 'note-length': 1 }, 'trig-params')],
  },
  {
    id: 'dn-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    title: 'One note at a time, held notes not retriggering the envelope',
    verified: false,
    params: [
      algo('2'),
      playMode('MONO LEG.'),
      ratioC(1),
      ratioA(3),
      harm(19),
      dtun(22),
      fdbk(44),
      mix(18),
      levA(82),
      decA(58),
      endA(28),
      fltrType('2-pole (12 dB) Lowpass'),
      freq(86),
      reso(42),
      fltrEnv(24),
      ampAtk(4),
      ampSus(88),
      ampRel(30),
      delSend(34),
      delayTime(24),
      delayFdbk(84),
      pingpong('ON'),
    ],
    articulation: [art('accent', { velocity: 118, 'note-length': 2 }, 'trig-params')],
  },
  {
    id: 'dn-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'track',
    title: 'Short plucks with the LFO restarted on every trig',
    verified: false,
    params: [
      algo('3'),
      playMode('MONO'),
      ratioC(1),
      ratioA(6),
      harm(13),
      fdbk(28),
      mix(10),
      levA(74),
      decA(11),
      phrt('ALL'),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(80),
      reso(34),
      fltrEnv(26),
      ampDec(13),
      ampSus(0),
      delSend(30),
      lfoMode('TRG'),
      lfoWave('SAW'),
      lfoSpd(32),
      lfoMult('16'),
      lfoFade(20),
      lfoDep(-18),
      swing(54),
    ],
    articulation: [
      art('offbeat', { velocity: 100, 'note-length': 0.5 }, 'trig-params'),
      art('ghost', { velocity: 62, probability: 70 }, 'trig-params'),
    ],
  },
  {
    id: 'dn-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'track',
    title: 'Resonant line that slides, portamento locked onto the accents only',
    verified: false,
    params: [
      algo('1'),
      playMode('MONO LEG.'),
      ratioC(1),
      harm(6),
      fdbk(58),
      mix(-30),
      levA(70),
      decA(18),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(50),
      reso(96),
      fltrEnv(38),
      ampDec(20),
      ampSus(24),
      drv(84),
      swing(55),
    ],
    articulation: [
      art('offbeat', { velocity: 108, 'note-length': 0.5 }, 'trig-params'),
      art('accent', { velocity: 127, portamento: true, 'portamento-time': 34 }, 'trig-params'),
    ],
  },
  {
    id: 'dn-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'Detuned bed with both envelopes gated and the amp never resetting',
    verified: false,
    params: [
      algo('8'),
      playMode('POLY M.LFO'),
      ratioC(1),
      ratioA(1),
      harm(-4),
      dtun(74),
      fdbk(8),
      mix(0),
      levA(36),
      levB(30),
      aTrig('OFF'),
      bTrig('OFF'),
      aenr('OFF'),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(54),
      base(12),
      width(104),
      ampAtk(76),
      ampSus(90),
      ampRel(110),
      chrSend(64),
      revSend(78),
      reverbDec(120),
      reverbFreq(58),
    ],
    articulation: [art('downbeat', { 'note-length': 32, 'lfo-trig': false }, 'trig-params')],
  },

  // -------------------------------------------------------------------------
  // Transitional (§4.2). Section-scoped rather than owning a voice for a track.
  // -------------------------------------------------------------------------
  {
    id: 'dn-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'One LFO pass into the change, running to the end of the waveform and stopping',
    verified: false,
    params: [
      algo('7'),
      playMode('MONO'),
      ratioC(2),
      ratioA(12),
      harm(21),
      fdbk(76),
      mix(8),
      levA(96),
      decA(120),
      endA(96),
      fltrType('2-pole (12 dB) Highpass'),
      freq(60),
      fltrEnv(48),
      ampAtk(96),
      ampSus(110),
      ampRel(24),
      revSend(52),
      lfoMode('ONE'),
      lfoWave('RMP'),
      lfoSpd(6),
      lfoMult('4'),
      lfoFade(-46),
      lfoDep(52),
    ],
    articulation: [art('last-hit', { velocity: 127, 'note-length': 16 }, 'trig-params')],
  },
  {
    id: 'dn-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'One hit on the change, master overdrive taking the tail with it',
    verified: false,
    params: [
      algo('7'),
      playMode('MONO'),
      ratioC(1),
      ratioA(10.25),
      harm(-18),
      dtun(96),
      fdbk(110),
      mix(-20),
      levA(127),
      decA(74),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(38),
      ampDec(96),
      ampSus(0),
      ampRel(88),
      drv(112),
      movd(72),
      revSend(64),
      reverbDec(127),
    ],
    articulation: [art('first-hit', { velocity: 127, 'filter-trig': true }, 'trig-params')],
  },
  {
    id: 'dn-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'track',
    title: 'Half a triangle across the section, closing rather than opening',
    verified: false,
    params: [
      algo('8'),
      playMode('MONO'),
      ratioC(1),
      ratioA(2),
      harm(-16),
      dtun(48),
      fdbk(20),
      mix(-12),
      levA(58),
      levB(48),
      bTrig('OFF'),
      fltrType('4 pole (24 dB) Lowpass'),
      freq(88),
      reso(56),
      ampAtk(30),
      ampSus(96),
      ampRel(96),
      revSend(70),
      lfoMode('HLF'),
      lfoWave('TRI'),
      lfoSpd(3),
      lfoMult('2'),
      lfoFade(-40),
      lfoDep(-58),
    ],
    articulation: [art('last-hit', { velocity: 96, 'note-length': 24 }, 'trig-params')],
  },
]

export const device: Device = {
  id: 'elektron-digitone',
  name: 'Digitone',
  maker: 'Elektron',

  /**
   * **`groovebox`, on what the box is rather than on what the maker calls it.**
   *
   * §2.3's rule is that a kind earns its place when the alternatives would make a manifest say
   * something false, and `synth` on this box would: a `synth` is a voice a rig plays, and this is
   * four sequenced tracks with a Sound each, 128 patterns to a project (p.27), song mode (p.43),
   * chains (p.43), four MIDI tracks driving other people's gear (p.17), three send effects into an
   * internal mixer and a master overdrive (p.15). That is a self-contained multi-part production
   * instrument, which is what `groovebox` names, and it is the same reading its successor's
   * manifest makes of the same architecture with twelve more tracks.
   *
   * **One page will look like it disagrees, and it is worth naming so the next reader does not
   * have to re-derive this.** p.11 §2 says *"Digitone is maybe the most unique synthesizer we have
   * ever created"*, and the p.12 panel figure silkscreens `Polyphonic Digital Synthesizer` above
   * the wordmark. Both are the maker describing the sound engine — the thing that makes this box
   * different from the Digitakt in the same case — rather than classifying the instrument. `kind`
   * describes the box, and on the box's own data structure the two Elektron siblings in that case
   * are the same shape with different generators inside them.
   */
  kind: 'groovebox',

  /**
   * §7.4. Sends and receives on both wires, and **sends on a third it cannot receive on** — the
   * same shape as the successor, read off this manual's own pages.
   *
   * `CLOCK SEND` *"sets whether or not Digitone transmits MIDI clock"* and `CLOCK RECEIVE` *"sets
   * whether or not Digitone responds to MIDI clock sent from external devices"* (p.71). Both are
   * global on/off with no port named; the port is chosen separately by `OUTPUT TO` and `INPUT
   * FROM`, whose options are DISABLED, MIDI, USB and MIDI+USB (p.72).
   *
   * **`din-sync` is send-only, and the asymmetry is on the rear panel.** p.14 names the two
   * outbound ports `MIDI THRU/SYNC B` and `MIDI OUT/SYNC A`, each *"can also be configured to
   * send DIN sync to legacy instruments"*, and p.71's `OUT PORT FUNC` gives `DIN 24` and `DIN 48`.
   * `MIDI IN` is described only as *"MIDI data input"*; there is no SYNC C and no page describes
   * a DIN sync input. p.88's specification agrees in four words: *"MIDI In/Out/Thru with DIN Sync
   * out"*.
   *
   * **`preferredSource` is not claimed (§7.4/#80).** §16.2 on p.82 pairs it with a Digitakt and
   * says only *"the Digitakt is set to send clock and the Digitone to receive it"* for that one
   * example, which is a setting rather than a job; §16.1 has it driving a monophonic bass machine
   * the other way round on the next paragraph. The manual describes a peer both times.
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
        note: 'PORT CONFIG > OUT PORT FUNC must be MIDI; DIN 24 and DIN 48 carry no MIDI data',
      },
      {
        transport: 'usb',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUTPUT TO',
        value: 'USB (or MIDI+USB), with SYNC > CLOCK SEND on',
        note: 'MIDI+USB lets MIDI data limit the USB speed; use USB alone for large transfers',
      },
      {
        transport: 'din-sync',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUT PORT FUNC',
        value: 'DIN 24',
        note: 'No MIDI data leaves that port while it is set; THRU PORT FUNC does the same on SYNC B',
      },
    ],
  },

  /**
   * Stereo main out, a stereo input for processing external audio, and class-compliant USB audio.
   * `individualOuts: 0` — p.88 enumerates the sockets (*"2 × 1/4” impedance balanced audio out
   * jacks"*, *"2 × 1/4” audio in jacks"*, one headphone jack) and p.14 numbers all nine rear
   * connectors, and there is no track output among them.
   *
   * `audioIn` is not just a socket: §13.6 and §13.7 give INPUT L and INPUT R their own level, pan
   * and three send levels on MASTER pages 2 and 3, so external audio goes through the same
   * chorus, delay and reverb the tracks do.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §2.6/#142. p.46: *"LEN — Trig Length sets the duration of the notes. When a note has finished
   * playing a NOTE OFF command is sent. The INF setting equals infinite note length. (0.125–128,
   * INF)"*.
   *
   * **`unit` is omitted, and that is the finding rather than a gap in the reading.** The
   * successor's manual maps its LEN values onto note divisions and its manifest cites the two
   * pages that do it. This one prints the range and never says what `1` is. Naming a unit here
   * would be inventing the mapping; leaving it out makes the guide print the number and claim
   * nothing about it, which is what the reader can actually verify at the machine.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'LEN',
  },

  capabilityEvidence: {
    'clock.canSendClock': cite(71),
    'clock.canReceiveClock': cite(71),
    /**
     * **`partly`, because two of the three transports have a page and the third has an
     * inference.** `unknown` would say the reading came back with nothing when it came back with
     * most of it, and a plain citation would claim a page for the half that has none.
     */
    'clock.transport': {
      kind: 'partly',
      cite: cites('p.14, p.71, p.88'),
      proven:
        'p.88 specifies “MIDI In/Out/Thru with DIN Sync out”, p.14 names the two outbound ports SYNC A and SYNC B, and p.71’s OUT PORT FUNC offers DIN 24 and DIN 48',
      open:
        'no page names USB as a clock transport — CLOCK SEND and CLOCK RECEIVE are unqualified (p.71) and the port is chosen by OUTPUT TO / INPUT FROM over “MIDI data” generally (p.72), so USB is read off those two together rather than cited',
    },
    'clock.sourceSetup[midi-din]': cites('p.71, p.72'),
    'clock.sourceSetup[usb]': {
      kind: 'partly',
      cite: cites('p.71, p.72'),
      proven:
        'the menu path and both option lists — SYNC > CLOCK SEND, and OUTPUT TO offering USB and MIDI+USB',
      open:
        'that MIDI clock is among the “MIDI data” OUTPUT TO routes, which no page states in those words',
    },
    'clock.sourceSetup[din-sync]': cites('p.14, p.71, p.82'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the manual states only what the box can do — §16.1 on p.82 has it clocking a monophonic bass machine and §16.2 on the same page has it receiving clock from a Digitakt, so the two worked examples point in opposite directions and neither is a job',
    },
    'io.main': cites('p.14, p.88'),
    'io.individualOuts': cites('p.14, p.88'),
    'io.audioIn': cites('p.14, p.63, p.88'),
    'io.usbAudio': cites('p.20, p.74, p.79'),
    /**
     * See the module note. The eight and the poly/mono split are read off two pages; the 2 is
     * authored downward from them, because `polyphony` cannot say the eight are shared.
     */
    voices: {
      kind: 'partly',
      cite: cites('p.15, p.16, p.29, p.37'),
      proven:
        'four synth tracks and four separate MIDI tracks in every pattern (pp.16-17), “eight audio voices” in the architecture diagram (p.15), “The Digitone has eight voice polyphony” with LOCKED VOICES locking 1–8 of them to one track (p.37), and PLAY MODE making a Sound POLY or MONO (p.29)',
      open:
        'those eight voices are one budget all four tracks draw on, and `polyphony` is a per-assignable claim with no way to say so — four members each declaring 8 would promise 32 simultaneous notes, so 2 is authored as the even split rather than cited',
    },
    'features.perStep': cites('pp.38, 40-41, 46-47'),
    'features.lfo': cites('p.54, p.55, p.99'),
    /**
     * §2.6/#111. **`cited-against`, the state that carries a page for a no.**
     *
     * The pages answer, and they answer that there is no audio here for a recipe to load. Which
     * is why not one of the recipes above carries `sourceAudio`.
     */
    content: {
      kind: 'cited-against',
      cite: cites('p.15, p.27, p.89'),
      reason:
        'p.15’s audio voice runs the FM engine through overdrive and two filters into the amp with no sample player in it, p.89 opens “At its core, the Digitone is a four operator Frequency Modulation (FM) synth”, and p.27 defines a Sound as “the SYN1, SYN2, FLTR, AMP, and LFO PARAMETER pages settings” — so the 2048 the +Drive holds are stored parameter settings rather than audio a recipe could name',
    },
    noteDuration: cite(46),
  },

  /** p.88: `Dimensions: W 215 × D 176 × H 63 mm`. 63 mm is how far off the desk it stands. */
  physical: { panelSpanMm: 215, verified: cite(88) },

  panel: DIGITONE_PANEL,

  manual: { title: 'Digitone User Manual', edition: 'OS 1.41' },

  productPage: 'https://www.elektron.se/explore/digitone',

  /**
   * §2.2. One pool of four synth tracks (p.16). See the module note for why `polyphony` is 2 and
   * not 8, and `capabilityEvidence.voices` for the same thing said where the audit can see it.
   *
   * **`vox-chop` is the one role the pool declines, and it declines it on architecture.** p.15's
   * voice is FM into overdrive into two filters into an amp, and p.89 calls the engine a four
   * operator FM synth; nothing in that chain plays back recorded audio, and a vocal chop is a
   * piece of recorded audio. Every other role is left in — an FM engine at inharmonic ratios with
   * feedback near its ceiling makes noise and metal as readily as it makes tones, which is what
   * the percussion recipes above are.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Synth track',
      count: 4,
      roles: [
        'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
        'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
        'riser', 'impact', 'sweep',
      ],
      polyphony: 2,
    },
  ],

  features: {
    perStep: [...PER_STEP],
    /**
     * Two LFOs per track, one to each LFO page (p.54; LFO page 2 *"contains the same parameters
     * as LFO page 1, but controls the behavior of LFO 2"*). Synced by `MULT`, which multiplies
     * `SPD` *"either by multiplying the current tempo (BPM settings) or by multiplying a fixed
     * tempo of 120 BPM"* (p.54), with the resulting whole-note values tabulated on p.55.
     *
     * Destinations are APPENDIX C's list (p.99), reduced to the groups it prints. Note the
     * appendix names the MIDI-track destinations too; only the audio-track column is listed here,
     * because a MIDI track is not one of this pool's four.
     */
    lfo: {
      count: 2,
      syncable: true,
      destinations: [
        'SYN: Algorithm, Ratio C/A/B and the four ratio offsets, Harmonics, Detune, Feedback, Mix',
        'SYN: A and B Attack, Decay, End, Level and Delay, plus the AB and Pitch macros',
        'FILTER: Frequency, Resonance, Envelope Depth, Attack, Decay, Sustain, Release, Base, Width, Env. Delay',
        'AMPLIFIER: Attack, Decay, Sustain, Release, Drive, Pan, Volume, Reverb Send, Delay Send, Chorus Send',
      ],
    },
  },

  hints: {
    'trig-params': 'Hold a [TRIG] key, turn DATA ENTRY',
    algo: 'Press [SYN1], turn knob A',
    'sound-setup': 'Hold [FUNC], press [TRIG PARAMETERS]',
    voice: 'Press [VOICE]',
    tempo: 'Press [TEMPO], turn knob E',
  },

  recipes,
}
