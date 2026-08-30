import type { CapabilityEvidence, Device, JackSignalKind, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { ANALOG_RYTM_MKII_PANEL } from './panel'

/**
 * Elektron Analog Rytm MKII (§2.3). Twelve drum tracks over **eight analog voice circuits**, a
 * sampler on every one of them, and an appendix of thirty-four MACHINES that rewrite the SRC
 * page under each track.
 *
 * ## The MACHINE is the parameter, and every recipe carries it
 *
 * p.21: *"Select a drum track MACHINE by quickly pressing the [SRC] key twice… A MACHINE makes
 * use of the physical percussion sound generator of the voice circuit in a certain way… These
 * MACHINE-specific synthesis parameters are on the SRC parameter page. If you select another
 * MACHINE, it engages the sound generator differently."* Appendix A says the same from the other
 * end (p.77): *"With one exception, each page contains the same parameters on all drum tracks.
 * The exception is the SRC page, where parameters will vary depending on the active MACHINE."*
 *
 * So the SRC page is **not one control surface with a switch on it** — it is thirty-four
 * different control surfaces, and `CLAUDE.md`'s rule about a cited range being the wrong range
 * applies to every value on it. Three collisions in this appendix make that concrete rather than
 * theoretical:
 *
 *  - **`SNP` is two different parameters.** "Snap Amount", a *level*, on BD HARD (p.97) and
 *    SD CLASSIC (p.99); "Snap", a *length*, on BT CLASSIC (p.105).
 *  - **`DEC` inverts between two snare machines.** SD NATURAL's `DEC` is Noise Decay and its
 *    `BDY` is Decay Time (p.100); SD ACOUSTIC's `DEC` is the decay (p.101). A value moved from
 *    one to the other lands on the wrong envelope.
 *  - **`WAV` names three waveforms on BD HARD and six on BD SHARP** (p.97, p.99), so the same
 *    abbreviation cites two different option sets.
 *
 * Every recipe below therefore opens with a `MACHINE` enum whose options are the machines that
 * page says the track can take, and every SRC parameter after it is read off that machine's own
 * entry. The pairing cannot come apart, which is the point.
 *
 * **Which machines a track can take is itself cited**, from the eight sentences Appendix D prints
 * above its sections (pp.96, 97, 101, 103, 105 twice, 106, 108). They are not a uniform list:
 * `RS HARD`, `RS CLASSIC` and `CP CLASSIC` are the only machines restricted to two tracks
 * (*"can **only** be used on the RS and CP tracks"*, p.101), while the seven bass drums and five
 * snares are available on four (p.97). See `MACHINES_FOR`.
 *
 * ## Numbers: this manual prints almost none, and Appendix D prints two
 *
 * Across the whole of Appendix D — thirty-four machines, two hundred-odd parameters — exactly
 * **two** carry a printed numeric range: SD FM's `FMA (0–127)` on p.100 and SY RAW's `LEV
 * (0–127)` on p.104. Everything else is described in words and given no scale. Appendix A is
 * barely richer: `TUN (-24–+24)`, `FIN (-64–+63)`, `STA`/`END (0-120)`, `HLD (AUTO, 1–127)`,
 * `PAN` at `-64`/`0`/`+63` and `SPH (0-127)`, and nothing at all for `FRQ`, `RES`, `OVR`, or any
 * of the four filter envelope stages.
 *
 * This is the Digitakt II's situation on a box twice as deep, and it gets the Digitakt II's
 * answer: **the manifest is enum-dominated, and every uncited numeric is absent rather than
 * given an invented `0-127`.** Reading SY RAW's `LEV (0–127)` onto the twenty-two other machines
 * that also have a `LEV` would be exactly the invention `DESIGN.md` §3.1 refuses — plausible,
 * probably even right, and not something any page says.
 *
 * **What that costs is mood, and it is worth naming.** A device declines an axis by having no
 * param that declares it (§6), and the axes this box can declare are the ones with a printed
 * range behind them: `density` and `space` from the AMP page's `HLD` and `PAN`, which every drum
 * track has (p.79); `darkness` from `TUN` on the recipes that load a sample (p.78); and `grit`
 * from `FMA` on the one machine whose amount the manual ranged (p.100). `OVR`, the overdrive
 * that would carry `grit` across the whole box, is named on p.79 and ranged nowhere.
 *
 * ## Twelve tracks, eight voices, and the coupling this model cannot express (§6/#57)
 *
 * p.21 states it outright: *"8 individual track Sounds can be voiced simultaneously with the
 * eight physical voices… The BD, SD, BT, and LT are independent tracks with their separate
 * voices. Tracks RS-CP, MT-HT, CH-OH and CY-CB, each pair is shown with a coupling on the front
 * panel… If you play or trigger both tracks of a coupled pair, the right-hand track has a higher
 * priority. Track CP mutes track RS, HT mutes MT, OH mutes CH and CB mutes CY."* p.66 restates it
 * by number: *"Some of the ANALOG RYTMS MKII's tracks (3/4, 7/8, 9/10, 11/12) share the same
 * voice"*, and p.13 gives the architecture: *"There are eight analog voice circuits."*
 *
 * **Twelve assignables are declared, not eight, and the reasoning matters more than the count.**
 * The two candidate models fail in opposite directions:
 *
 *  - *Eight assignables*, each coupled pair merged into one, is exactly true about simultaneity
 *    and false about the box. It would mean no guide could ever ask this machine for a closed hat
 *    **and** an open hat, because both would want the `CH-OH` assignable — and every pattern ever
 *    written on a Rytm has both. The guide would print `open-hat: not assigned` on a box that
 *    plays open hats, which is a gap reported where there is none. Invariant 5 asks for gaps shown
 *    honestly; inventing one is the same offence as hiding one.
 *  - *Twelve assignables* claims twelve simultaneous notes where the box has eight, and that
 *    overclaim is real.
 *
 * Twelve is chosen because the pairs Elektron coupled are the pairs that **do not overlap by
 * construction** — a closed hat is what stops an open hat, a clap and a rimshot answer each other
 * rather than sound together — so the second model's error is a musical edge case where the
 * first's is the common case. `comfortableVoices: 8` carries the truth back as a crowding cost,
 * which is what that field is for.
 *
 * **`comfortableVoices` is not p.21 restated, and it must not be cited as though it were.**
 * `CAPABILITY_FACTS` deliberately has no slot for it, and the reason given in `device.ts` is this
 * exact temptation: a page saying "eight voice circuits" is not a page saying "eight parts is
 * where this box gets crowded". The eight happens to be both here. It is still a judgement.
 *
 * **The shape §6 would need, recorded rather than built**: mutual exclusion between two *named*
 * assignables — "these two exist, and at most one of them sounds at a time". Nothing in `Voice`
 * can say it; `polyphony` counts notes on one assignable and cannot reach across two. That is an
 * engine change and it does not belong in a device folder.
 *
 * ## What `articulation` can carry here, and what it cannot
 *
 * The sequencer's per-step vocabulary is unusually wide, and most of it is outside §4.3's one
 * scalar per `PatternSlot`. Reachable, because each stays true applied to every hit in a slot:
 * `velocity` and `note-length` (`VEL 1 to 127`, `LEN`, p.43), `probability` (`PRB`, *"the
 * probability outcome is re-evaluated every time a trig is set to play"*, p.43, so it carries no
 * state), `micro-timing` (p.39), `retrig` with `retrig-rate` (p.41, whose rate list is printed),
 * and `accent` — a per-step trig placed with the note (p.49), whose level is a track setting, so
 * "these hits are accented" is a complete instruction.
 *
 * Declared in `features.perStep` and deliberately unreachable:
 *
 *  - `parameter-lock` — *any* parameter, per trig (p.47). A `set` gives one value to a whole slot
 *    over a closed authored key list.
 *  - `sound-lock` — a different Sound per step from the Sound pool (p.48). Expressible in
 *    principle; the value would be a Sound name nobody can know (invariant 5).
 *  - `condition` — the conditional locks of p.48 are stateful in the way the Digitakt II's are.
 *  - `fill` — depends on whether the box is in FILL mode, which is global runtime state (p.49).
 *  - `trig-mute` — a per-step mute lane (p.49); a slot that is muted is a slot with no hits, which
 *    the pattern says already.
 *  - `swing` — per-step swing trigs, but one `51-80%` ratio for the pattern (p.50), and the groove
 *    is the direction's business rather than the box's.
 *  - `parameter-slide` — needs *two* trigs to mean anything (p.50), and a slot is one value.
 *
 * ## The FX track is not an assignable
 *
 * p.15 gives a thirteenth track carrying DELAY, REVERB, DISTORTION, COMPRESSOR and an LFO, and
 * every drum track sends to the first two from its own AMP page (`DEL`, `REV`, p.79). It holds no
 * Sound and plays no part, so it is no assignable; the two send amounts live on the recipes that
 * use them, which is where a reader dialling one part in wants to find them.
 */

const MANUAL = 'Analog Rytm MKII User Manual OS 1.71'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * A citation over several pages, with consecutive runs collapsed — `p.96, pp.97-101, pp.103-104`.
 *
 * A MACHINE option set is assembled out of two to four of Appendix D's families and a reader
 * checking one entry needs the page it is printed on, not the page the permission sentence is on.
 * Collapsing runs is what keeps the string readable at nine pages; the set is the claim and the
 * formatting is only how it reads.
 */
function citePages(pages: readonly number[]): Cite {
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const runs: number[][] = []
  for (const page of sorted) {
    const run = runs[runs.length - 1]
    if (run !== undefined && page === (run[run.length - 1] as number) + 1) run.push(page)
    else runs.push([page])
  }
  const parts = runs.map((run) => {
    const first = run[0] as number
    const last = run[run.length - 1] as number
    return first === last ? `p.${first}` : `pp.${first}-${last}`
  })
  return { kind: 'manual', source: `${MANUAL}, ${parts.join(', ')}` }
}

// ---------------------------------------------------------------------------
// The MACHINE lists, as Appendix D's own sentences scope them
// ---------------------------------------------------------------------------

/**
 * APPENDIX D, pp.96-109. Every machine, grouped by the sentence that says which tracks may load
 * it — and the sentences are not one shape, which is why they are transcribed rather than
 * summarised. Two of them say "MACHINE" singular and one says "only"; a grep for the plural
 * finds neither.
 *
 * **Each family carries its own page list, and the list covers the names as well as the
 * sentence.** A track's option set is assembled from two to four of these families, so citing
 * the governing sentence alone would attach a one-page citation to a claim built out of six —
 * the `BD` list runs to twenty machines whose names are printed across pp.96-101 and 103-104,
 * and a reader sent to p.97 to check `SD ACOUSTIC` would not find it there. `pagesFor` unions
 * the contributing families instead, so the citation moves whenever the list does.
 *
 * The D.3 snares are the case that makes the distinction visible: their *permission* is p.97's
 * sentence, printed above D.2, while their *names* are on pp.99-101. Both halves are in the list.
 */
type Family = { readonly values: readonly string[]; readonly pages: readonly number[] }

/** p.96: *"The MACHINES below can be used on all tracks: BD, SD, RS, CP, BT, LT, MT, HT, CH, OH, CY and CB."* */
const ANY_TRACK: Family = { values: ['DISABLE', 'UT NOISE', 'UT IMPULSE'], pages: [96] }
/** p.97: *"The MACHINES below can be used on the BD, SD, RS and CP tracks."* Names on pp.97-99. */
const BD_MACHINES: Family = {
  values: ['BD HARD', 'BD CLASSIC', 'BD FM', 'BD PLASTIC', 'BD SILKY', 'BD SHARP', 'BD ACOUSTIC'],
  pages: [97, 98, 99],
}
/** Governed by the same p.97 sentence; D.3's own names are on pp.99-101. */
const SD_MACHINES: Family = {
  values: ['SD HARD', 'SD CLASSIC', 'SD FM', 'SD NATURAL', 'SD ACOUSTIC'],
  pages: [97, 99, 100, 101],
}
/** p.101: *"The MACHINES below can **only** be used on the RS and CP tracks."* D.4 and D.5. */
const RS_CP_ONLY: Family = {
  values: ['RS HARD', 'RS CLASSIC', 'CP CLASSIC'],
  pages: [101, 102],
}
/** p.103: the same sentence as p.97, printed again above D.6. `SY RAW` is named on p.104. */
const SY_MACHINES: Family = {
  values: ['SY DUAL VCO', 'SY CHIP', 'SY RAW'],
  pages: [103, 104],
}
/** p.105: *"The MACHINE below can be used on the BT track."* Singular; there is one. */
const BT_MACHINES: Family = { values: ['BT CLASSIC'], pages: [105] }
/** p.105: *"The MACHINE below can be used on the LT, MT, and HT tracks."* */
const XT_MACHINES: Family = { values: ['XT CLASSIC'], pages: [105] }
/** p.106: *"The MACHINES below can be used on the CH and OH tracks."* D.9 and D.10, names pp.106-107. */
const HAT_MACHINES: Family = {
  values: ['HH BASIC', 'HH LAB', 'CH CLASSIC', 'CH METALLIC', 'OH CLASSIC', 'OH METALLIC'],
  pages: [106, 107],
}
/** p.108: *"The MACHINES below can be used on the CY and CB tracks."* D.11 and D.12, names pp.108-109. */
const CY_CB_MACHINES: Family = {
  values: ['CY CLASSIC', 'CY METALLIC', 'CY RIDE', 'CB CLASSIC', 'CB METALLIC'],
  pages: [108, 109],
}

/** The families a track draws on, in the order Appendix D prints them. */
const FAMILIES_FOR = {
  bd: [ANY_TRACK, BD_MACHINES, SD_MACHINES, SY_MACHINES],
  sd: [ANY_TRACK, BD_MACHINES, SD_MACHINES, SY_MACHINES],
  rs: [ANY_TRACK, BD_MACHINES, SD_MACHINES, RS_CP_ONLY, SY_MACHINES],
  cp: [ANY_TRACK, BD_MACHINES, SD_MACHINES, RS_CP_ONLY, SY_MACHINES],
  bt: [ANY_TRACK, BT_MACHINES],
  lt: [ANY_TRACK, XT_MACHINES],
  mt: [ANY_TRACK, XT_MACHINES],
  ht: [ANY_TRACK, XT_MACHINES],
  ch: [ANY_TRACK, HAT_MACHINES],
  oh: [ANY_TRACK, HAT_MACHINES],
  cy: [ANY_TRACK, CY_CB_MACHINES],
  cb: [ANY_TRACK, CY_CB_MACHINES],
} as const satisfies Record<string, readonly Family[]>

/**
 * What each of the twelve tracks may load, with the page set that supports the whole list.
 *
 * **`BD`, `SD`, `RS` and `CP` do not carry the same list**, which is the asymmetry worth
 * preserving: all four take the bass drums, the snares and the synths, and only RS and CP take
 * the rimshots and the hand clap. Flattening that to "the first four tracks share a list" would
 * put `CP CLASSIC` on the BD track, where p.101 says it cannot go.
 */
const MACHINES_FOR = Object.fromEntries(
  Object.entries(FAMILIES_FOR).map(([track, families]) => [
    track,
    {
      values: families.flatMap((f) => [...f.values]),
      pages: [...new Set(families.flatMap((f) => [...f.pages]))].sort((a, b) => a - b),
    },
  ]),
) as Record<keyof typeof FAMILIES_FOR, { values: string[]; pages: number[] }>

type TrackId = keyof typeof FAMILIES_FOR

// ---------------------------------------------------------------------------
// The pages every drum track shares (APPENDIX A, pp.77-80)
// ---------------------------------------------------------------------------

/** FLTR `TYP`, p.79. Seven types, and the manual's own names for them. */
const FILTER_TYPES = [
  '2-pole Lowpass', '1-pole Lowpass', 'Bandpass', '1-pole Highpass', '2-pole Highpass',
  'Bandstop', 'Peak',
] as const
/** SMPL `LOP`, p.78. */
const LOOP = ['OFF', 'ON'] as const
/** LFO `MOD` (Trig Mode), p.80. */
const LFO_MODES = ['FREE', 'TRIG', 'HOLD', 'ONE', 'HALF'] as const
/**
 * LFO `WAV`, p.80: *"There are seven waveforms: Triangle, Sine, Square, Sawtooth, Exponential,
 * Ramp and Random."* The panel spellings are not printed, so these are the manual's words.
 */
const LFO_WAVES = [
  'Triangle', 'Sine', 'Square', 'Sawtooth', 'Exponential', 'Ramp', 'Random',
] as const
/** RETRIG rate, p.41. Printed in full, and `1/16` is *"the nominal retrig rate, one trig per step"*. */
const RETRIG_RATES = [
  '1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/8', '1/10', '1/12', '1/16', '1/20', '1/24',
  '1/32', '1/40', '1/48', '1/64', '1/80',
] as const

/**
 * The three-waveform oscillator shared by BD HARD, BD CLASSIC and the A.1 SRC page (pp.77, 97):
 * *"sets the oscillator waveform to sine, asymmetric sine or triangle"*.
 *
 * **Not the same list as BD SHARP's or BD ACOUSTIC's**, which p.99 gives as six — Sine,
 * Asymmetric Sine, Triangle, Sinetooth, Sawtooth, Square. One abbreviation, two option sets,
 * which is the whole reason `MACHINE` sits beside it in every recipe.
 */
const WAV_3 = ['sine', 'asymmetric sine', 'triangle'] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type Mood = { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }

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

/** One of the handful of numerics this manual gives a range for. */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: { mood?: Mood[]; unit?: string; note?: string } = {},
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

/**
 * The MACHINE, first in every recipe. `track` picks the cited list, so a machine can only be
 * written against a track the manual puts it on — a typo lands on the schema rather than on a
 * reader.
 */
function machine(track: TrackId, value: string): AuthoredParam {
  const { values, pages } = MACHINES_FOR[track]
  return {
    kind: 'enum',
    name: 'MACHINE',
    value,
    options: { values: [...values], verified: citePages(pages) },
    verified: false,
    note: 'Press [SRC] twice to change it',
  }
}

/** Exported so the test can assert the composed page sets rather than restate them. */
export const MACHINE_PAGES = Object.fromEntries(
  Object.entries(MACHINES_FOR).map(([track, m]) => [track, m.pages]),
) as unknown as Readonly<Record<TrackId, readonly number[]>>

/**
 * AMP `HLD`, p.79: *"Range (AUTO, 1–127). The AUTO setting means the hold phase is determined by
 * the time the pad of the drum track is physically pressed."*
 *
 * The numeric half is authored here and `AUTO` is not, because they are two different controls
 * wearing one name: a number is a fixed hold, `AUTO` hands the length to a finger on a pad, and a
 * sequenced part has no finger. `1-127` is the range a guide can move, which is what makes this
 * the box's `density` knob — shorter holds, denser part.
 */
function hold(v: number, amount = -18): AuthoredParam {
  return num('HLD', v, { min: 1, max: 127 }, 79, {
    mood: [{ axis: 'density', amount }],
    note: 'AUTO, the other setting, hands the hold to how long the pad is held',
  })
}

/** AMP `PAN`, p.79: bipolar, *"-64 sending all sound to the left channel and +63 … to the right"*. */
function pan(v: number, amount = 0): AuthoredParam {
  return amount === 0
    ? num('PAN', v, { min: -64, max: 63 }, 79)
    : num('PAN', v, { min: -64, max: 63 }, 79, { mood: [{ axis: 'space', amount }] })
}

/**
 * SMPL `TUN`, p.78: *"Range (-24–+24), equivalent to four octaves."* Only on recipes that load a
 * sample — on a Sound with `SMP` at OFF it is a transpose with nothing to transpose.
 */
function sampleTune(v: number, amount = -4): AuthoredParam {
  return num('TUN', v, { min: -24, max: 24 }, 78, {
    unit: 'st',
    mood: [{ axis: 'darkness', amount }],
  })
}

/** SMPL `STA` and `END`, p.78: *"The extreme values of the range (0-120)"*, and codependent. */
function start(v: number): AuthoredParam {
  return num('STA', v, { min: 0, max: 120 }, 78, { note: 'Set together with END' })
}
function end(v: number): AuthoredParam {
  return num('END', v, { min: 0, max: 120 }, 78, { note: 'Set together with STA' })
}

/** FLTR `TYP`, p.79. */
const filter = (t: (typeof FILTER_TYPES)[number]) => pick('TYP', t, FILTER_TYPES, 79)
/** LFO `MOD` and `WAV`, p.80. */
const lfoMode = (m: (typeof LFO_MODES)[number]) => pick('MOD', m, LFO_MODES, 80)
const lfoWave = (w: (typeof LFO_WAVES)[number]) => pick('WAV', w, LFO_WAVES, 80)
/** SRC `WAV` on the three-waveform bass drums, pp.77/97. */
const wav3 = (w: (typeof WAV_3)[number]) => pick('WAV', w, WAV_3, 97)
/** SMPL `LOP`, p.78. */
const loop = (v: (typeof LOOP)[number]) => pick('LOP', v, LOOP, 78)

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: NonNullable<Recipe['articulation']>[number]['slot'],
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// The sequencer's per-step vocabulary (§2.3)
// ---------------------------------------------------------------------------

/**
 * What this sequencer can do to one step, in this box's own words. See the module JSDoc for
 * which of these `articulation` can reach and why the other seven cannot.
 */
const PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'accent',
  'swing',
  'parameter-lock',
  'sound-lock',
  'condition',
  'fill',
  'trig-mute',
  'parameter-slide',
] as const

/** The subset `articulation` may use. Exported so the test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'accent',
] as const

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  // --- BD (voice circuit 1, independent) ---------------------------------
  {
    id: 'rytm-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'BD HARD on a sine, 2-pole lowpass, downbeat at velocity 120',
    verified: false,
    params: [
      machine('bd', 'BD HARD'),
      wav3('sine'),
      filter('2-pole Lowpass'),
      hold(12),
      pan(0),
    ],
    articulation: [
      art('downbeat', { velocity: 120, accent: true }, 'accent'),
      art('ghost', { velocity: 62, probability: 70 }, 'trig-params'),
    ],
  },
  {
    id: 'rytm-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'bd',
    title: 'BD FM through the 1-pole lowpass, downbeat at velocity 124 with an accent trig',
    verified: false,
    params: [
      machine('bd', 'BD FM'),
      filter('1-pole Lowpass'),
      hold(18),
      pan(0),
    ],
    articulation: [art('downbeat', { velocity: 124, accent: true }, 'accent')],
  },
  {
    id: 'rytm-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'bd',
    /**
     * `SY DUAL VCO` is a synth machine on a drum track, and p.103 is what makes the pitch
     * usable rather than decorative: *"Value 0 corresponds to note C-2. One octave corresponds
     * to 24 units."* Two anchors and no min or max, so `TUN` is not authored as a numeric — the
     * scale is stated and the ends are not.
     */
    title: 'SY DUAL VCO through the 2-pole lowpass, LFO free-running, downbeat trigs 1/4',
    verified: false,
    params: [
      machine('bd', 'SY DUAL VCO'),
      filter('2-pole Lowpass'),
      hold(96, -32),
      pan(0),
      lfoMode('FREE'),
    ],
    articulation: [art('downbeat', { 'note-length': '1/4' }, 'trig-params')],
  },

  // --- SD (voice circuit 2, independent) ---------------------------------
  {
    id: 'rytm-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'sd',
    title: 'SD HARD through the bandpass, backbeat at velocity 122, ghosts at probability 55',
    verified: false,
    params: [
      machine('sd', 'SD HARD'),
      filter('Bandpass'),
      hold(14),
      pan(0),
    ],
    articulation: [
      art('backbeat', { velocity: 122, accent: true }, 'accent'),
      art('ghost', { velocity: 44, probability: 55 }, 'trig-params'),
    ],
  },
  {
    id: 'rytm-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'sd',
    /**
     * The one machine in Appendix D whose amount the manual ranged (p.100), which is why this is
     * the only recipe here that can hand `grit` a knob to turn. `OVR` on the AMP page would do it
     * for every recipe and is ranged nowhere (p.79).
     */
    title: 'SD FM through the 1-pole highpass, backbeat at velocity 118, 1/32 retrig on the fill',
    verified: false,
    params: [
      machine('sd', 'SD FM'),
      num('FMA', 78, { min: 0, max: 127 }, 100, { mood: [{ axis: 'grit', amount: 24 }] }),
      filter('1-pole Highpass'),
      hold(10),
      pan(0),
    ],
    articulation: [
      art('backbeat', { velocity: 118 }, 'trig-params'),
      art('fill', { retrig: true, 'retrig-rate': '1/32' }, 'retrig'),
    ],
  },

  // --- RS and CP (voice circuit 3, shared; CP mutes RS) -------------------
  {
    id: 'rytm-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'rs',
    title: 'RS CLASSIC through the bandpass, offbeats at velocity 96 and micro-timing -2',
    verified: false,
    params: [
      machine('rs', 'RS CLASSIC'),
      filter('Bandpass'),
      hold(6),
      pan(-22, -10),
    ],
    articulation: [art('offbeat', { velocity: 96, 'micro-timing': -2 }, 'micro-timing')],
  },
  {
    id: 'rytm-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'rs',
    title: 'RS HARD through the peak filter, ghosts at velocity 38 and probability 50',
    verified: false,
    params: [
      machine('rs', 'RS HARD'),
      filter('Peak'),
      hold(4),
      pan(18, 12),
    ],
    articulation: [art('ghost', { velocity: 38, probability: 50 }, 'trig-params')],
  },
  {
    id: 'rytm-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'cp',
    /**
     * The other half of voice circuit 3, and p.21's priority rule runs this way round: *"Track CP
     * mutes track RS."* A guide asking for both a clap and a rimshot gets them, and a step
     * carrying both hears the clap.
     */
    title: 'CP CLASSIC through the 1-pole highpass, backbeat at velocity 112 with an accent trig',
    verified: false,
    params: [
      machine('cp', 'CP CLASSIC'),
      filter('1-pole Highpass'),
      hold(20),
      pan(0),
    ],
    articulation: [art('backbeat', { velocity: 112, accent: true }, 'accent')],
  },

  // --- BT (voice circuit 4, independent) ---------------------------------
  {
    id: 'rytm-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'bt',
    /**
     * `SNP` here is *"Snap"*, a length (p.105), where BD HARD's `SNP` is *"Snap Amount"*, a level
     * (p.97). Nothing but the MACHINE beside it says which one this track is showing.
     */
    title: 'BT CLASSIC through the 2-pole lowpass, fill hits at velocity 110',
    verified: false,
    params: [
      machine('bt', 'BT CLASSIC'),
      filter('2-pole Lowpass'),
      hold(48, -26),
      pan(0),
    ],
    articulation: [art('fill', { velocity: 110 }, 'trig-params')],
  },

  // --- LT, MT, HT (LT independent; MT and HT share circuit 6) -------------
  {
    id: 'rytm-tom-soft',
    role: 'tom',
    character: 'soft',
    voice: 'lt',
    title: 'XT CLASSIC on the low tom, 2-pole lowpass, fill hits at velocity 96',
    verified: false,
    params: [
      machine('lt', 'XT CLASSIC'),
      filter('2-pole Lowpass'),
      hold(40, -22),
      pan(-30, -14),
    ],
    articulation: [art('fill', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'rytm-tom-hard',
    role: 'tom',
    character: 'hard',
    voice: 'mt',
    title: 'XT CLASSIC on the mid tom, bandpass, fill hits at velocity 114 with accent trigs',
    verified: false,
    params: [
      machine('mt', 'XT CLASSIC'),
      filter('Bandpass'),
      hold(28, -18),
      pan(0),
    ],
    articulation: [art('fill', { velocity: 114, accent: true }, 'accent')],
  },
  {
    id: 'rytm-tom-bright',
    role: 'tom',
    character: 'bright',
    voice: 'ht',
    /**
     * The top of a three-tom fill, and the pair that costs something: p.21 has `HT` muting `MT`,
     * so a fill whose mid tom is still ringing when the high tom lands loses the tail. The guide
     * cannot show that — see the module JSDoc — and a fill written in sixteenths does not hit it.
     */
    title: 'XT CLASSIC on the high tom, 1-pole highpass, fill hits at velocity 118',
    verified: false,
    params: [
      machine('ht', 'XT CLASSIC'),
      filter('1-pole Highpass'),
      hold(20, -14),
      pan(30, 14),
    ],
    articulation: [art('fill', { velocity: 118 }, 'trig-params')],
  },

  // --- CH and OH (voice circuit 7, shared; OH mutes CH) ------------------
  {
    id: 'rytm-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'ch',
    title: 'CH CLASSIC through the 2-pole highpass, offbeats at velocity 88 and micro-timing -3',
    verified: false,
    params: [
      machine('ch', 'CH CLASSIC'),
      filter('2-pole Highpass'),
      hold(3),
      pan(12, 10),
    ],
    articulation: [art('offbeat', { velocity: 88, 'micro-timing': -3 }, 'micro-timing')],
  },
  {
    id: 'rytm-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'ch',
    /**
     * Three parameters on the whole SRC page — `TUN`, `DEC`, `LEV` (p.107) — which is the
     * shortest machine on the box that still makes a sound. The character comes from the metal
     * rather than from anything to turn.
     */
    title: 'CH METALLIC through the bandstop, ghosts at velocity 40 and probability 60',
    verified: false,
    params: [
      machine('ch', 'CH METALLIC'),
      filter('Bandstop'),
      hold(2),
      pan(-12, 10),
    ],
    articulation: [
      art('offbeat', { velocity: 92 }, 'trig-params'),
      art('ghost', { velocity: 40, probability: 60 }, 'trig-params'),
    ],
  },
  {
    id: 'rytm-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'oh',
    /**
     * The other half of voice circuit 7, and the pair whose sharing is the point rather than the
     * cost: p.21's *"OH mutes CH"* is the hi-hat choke every drum machine wants, arriving here as
     * a property of the circuit instead of as a setting.
     */
    title: 'OH CLASSIC through the 2-pole highpass, offbeat trigs 1/8 at velocity 104',
    verified: false,
    params: [
      machine('oh', 'OH CLASSIC'),
      filter('2-pole Highpass'),
      hold(56, -30),
      pan(0),
    ],
    articulation: [art('offbeat', { velocity: 104, 'note-length': '1/8' }, 'trig-params')],
  },

  // --- CY and CB (voice circuit 8, shared; CB mutes CY) ------------------
  {
    id: 'rytm-ride-clean',
    role: 'ride',
    character: 'clean',
    voice: 'cy',
    /**
     * `CY RIDE` splits decay in two — `HIT (Hit Decay)` is *"the top decay"* and `DEC (Tail
     * Decay)` is *"the tail decay"* (p.108) — so `DEC` on this machine is not the `DEC` any other
     * cymbal machine shows. `TYP` is left off: p.108 says it *"selects different sets of
     * fundamental oscillator frequencies"* and enumerates none of them, and an option set nobody
     * printed is not one to author.
     */
    title: 'CY RIDE through the 1-pole highpass, offbeats at velocity 84',
    verified: false,
    params: [
      machine('cy', 'CY RIDE'),
      filter('1-pole Highpass'),
      hold(72, -34),
      pan(26, 14),
    ],
    articulation: [art('offbeat', { velocity: 84 }, 'trig-params')],
  },
  {
    id: 'rytm-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'cy',
    title: 'CY METALLIC through the bandstop, accent slot at velocity 116',
    verified: false,
    params: [
      machine('cy', 'CY METALLIC'),
      filter('Bandstop'),
      hold(44, -24),
      pan(-26, 14),
    ],
    articulation: [art('accent', { velocity: 116, accent: true }, 'accent')],
  },
  {
    id: 'rytm-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'cb',
    title: 'CB METALLIC through the peak filter, offbeats at velocity 98 and micro-timing 2',
    verified: false,
    params: [
      machine('cb', 'CB METALLIC'),
      filter('Peak'),
      hold(16),
      pan(34, 12),
    ],
    articulation: [art('offbeat', { velocity: 98, 'micro-timing': 2 }, 'micro-timing')],
  },
  {
    id: 'rytm-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'cb',
    /**
     * `UT NOISE` is one of the three machines p.96 puts on every track, so this could sit
     * anywhere; it sits on `CB` because that is the track a pattern is least likely to want for
     * anything else, and because the cowbell's circuit is the one whose partner (`CY`) already
     * has two recipes to lose it to.
     */
    title: 'UT NOISE through the bandpass, triangle LFO free-running from SPH 0, downbeat trigs 1/2',
    verified: false,
    params: [
      machine('cb', 'UT NOISE'),
      filter('Bandpass'),
      hold(88, -36),
      pan(0),
      lfoMode('FREE'),
      lfoWave('Triangle'),
      num('SPH', 0, { min: 0, max: 127 }, 80),
    ],
    articulation: [art('downbeat', { 'note-length': '1/2' }, 'trig-params')],
  },

  // --- The sampler, which every drum track also has (APPENDIX A.2, p.78) --
  {
    id: 'rytm-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'sd',
    /**
     * §2.6/#111. The SMPL page is on every drum track and is the only place on this box where a
     * numeric can be authored freely: `TUN`, `STA` and `END` are three of the six ranges Appendix
     * A prints. `MACHINE` is `DISABLE` because p.96 says what that is for — *"Select DISABLE,
     * then save, to be able to make a sample-based Sound accessible, for loading and Sound
     * Locking, on any of the 12 Tracks"* — so the analog generator is out of the way and the
     * track is the sampler alone.
     */
    title: 'A vocal windowed STA 12 to END 46 with LOP OFF, analog voice disabled',
    verified: false,
    sourceAudio: {
      need:
        'One or two bars of vocal with evenly spaced syllables; STA and END are a window on one ' +
        'file, not a slice grid, so the window has to land on a syllable',
      prep: { text: 'Load it to a sample slot first — a project holds 127', verified: cite(14) },
      hint: 'sample',
    },
    params: [
      machine('sd', 'DISABLE'),
      sampleTune(0),
      start(12),
      end(46),
      loop('OFF'),
      filter('Bandpass'),
      hold(22),
      pan(0),
    ],
    articulation: [art('offbeat', { velocity: 106 }, 'trig-params')],
  },
  {
    id: 'rytm-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'lt',
    title: 'A sample windowed STA 0 to END 120 with LOP ON, analog voice disabled, sine LFO',
    verified: false,
    sourceAudio: {
      need:
        'A sustained tonal source two seconds or longer, with a loop point that does not click — ' +
        'LOP holds it for the length of the trig and the click comes back every bar',
      prep: { text: 'Load it to a sample slot first — a project holds 127', verified: cite(14) },
      hint: 'sample',
    },
    params: [
      machine('lt', 'DISABLE'),
      sampleTune(-12, -6),
      start(0),
      end(120),
      loop('ON'),
      filter('2-pole Lowpass'),
      hold(110, -40),
      pan(0),
      lfoMode('FREE'),
      lfoWave('Sine'),
    ],
    articulation: [art('downbeat', { 'note-length': '1/1' }, 'trig-params')],
  },
]

// ---------------------------------------------------------------------------
// Jacks (§2.6/#22). Every declared jack needs a `capabilityEvidence` entry, so the helper
// writes the key rather than leaving it to be remembered — `moog-dfam`'s answer.
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

/**
 * The rear panel in the manual's own numbered order (p.12, items 1-12), read off the artwork as
 * well as the prose because the silkscreen sits inside the drawing and does not extract.
 *
 * **Eight `TRACK OUT` jacks for twelve tracks, and the pairing is the same one the voices have.**
 * p.12's prose calls them only *"Individual drum voice outputs"* and gives no count; p.76 gives
 * it — *"8 x 1/4" impedance balanced individual track output jacks"* — and the panel labels them
 * `BD`, `SD`, `RS/CP`, `BT`, `LT`, `MT/HT`, `CH/OH`, `CY/CB`. That is one jack per *voice
 * circuit*, not per track, which is why the count matches p.13's eight and not p.15's twelve.
 * The RD-9 has the same shape at a smaller scale, one jack for both its hats.
 *
 * **These outs are always live**, which is unusual enough to carry: p.65 says of the routing
 * matrix that *"each track will still send to its individual output"* even with ROUTE TO MAIN
 * off, and p.27 repeats it for the per-kit override.
 *
 * **`POWER` and `DC IN` are omitted** for the ordinary reason — an inlet and a switch are not
 * things a reader patches. **The USB port is omitted too**, following the RD-9 and the TR-6S:
 * `direction` is one of `in` or `out` and this port is both at once (p.62's `INPUT FROM` and
 * `OUTPUT TO` each name it), so the `usb` transport carries a `sourceSetup` and no socket.
 *
 * The CV jacks are declared under the panel's own label. The manual names them four ways —
 * `EXP/CV IN CONTROL INPUT` (p.12), `EXP/CV IN 1` (pp.27, 66), `CONTROL IN A/B` (p.67) — and the
 * silkscreen a reader is looking at says `Control In 1` and `Control In 2`.
 */
const JACKS = [
  jack('HEADPHONES OUT', 'out', ['audio'], 12, { note: '1/4" stereo (TRS)' }),
  jack('MAIN OUT L', 'out', ['audio'], 12, { note: '1/4" TS unbalanced or TRS balanced' }),
  jack('MAIN OUT R', 'out', ['audio'], 12, { note: '1/4" TS unbalanced or TRS balanced' }),
  jack('EXT IN L', 'in', ['audio'], 12, { note: '1/4" mono, unbalanced — external audio in' }),
  jack('EXT IN R', 'in', ['audio'], 12, { note: '1/4" mono, unbalanced — external audio in' }),
  jack('TRACK OUT · BD', 'out', ['audio'], 12, { note: 'Voice circuit 1; always live (p.65)' }),
  jack('TRACK OUT · SD', 'out', ['audio'], 12, { note: 'Voice circuit 2; always live (p.65)' }),
  jack('TRACK OUT · RS/CP', 'out', ['audio'], 12, {
    note: 'One jack for both — RS and CP share voice circuit 3 (p.21)',
  }),
  jack('TRACK OUT · BT', 'out', ['audio'], 12, { note: 'Voice circuit 4; always live (p.65)' }),
  jack('TRACK OUT · LT', 'out', ['audio'], 12, { note: 'Voice circuit 5; always live (p.65)' }),
  jack('TRACK OUT · MT/HT', 'out', ['audio'], 12, {
    note: 'One jack for both — MT and HT share voice circuit 6 (p.21)',
  }),
  jack('TRACK OUT · CH/OH', 'out', ['audio'], 12, {
    note: 'One jack for both — CH and OH share voice circuit 7 (p.21)',
  }),
  jack('TRACK OUT · CY/CB', 'out', ['audio'], 12, {
    note: 'One jack for both — CY and CB share voice circuit 8 (p.21)',
  }),
  jack('AUDIO IN L', 'in', ['audio'], 12, { note: '1/4" mono, balanced — sampling or sound card' }),
  jack('AUDIO IN R', 'in', ['audio'], 12, { note: '1/4" mono, balanced — sampling or sound card' }),
  jack('MIDI IN', 'in', ['clock', 'midi'], 12, { clock: ['midi-din'] }),
  jack('MIDI OUT/SYNC A', 'out', ['clock', 'midi'], 12, {
    clock: ['midi-din', 'din-sync'],
    note: 'OUT PORT FUNC picks MIDI, DIN 24 or DIN 48; a DIN setting carries no MIDI data (p.62)',
  }),
  /**
   * **Declared as `midi` alone, and the DIN sync it can also send lives in the note.** p.12 gives
   * this socket the same three `THRU PORT FUNC` options as `MIDI OUT/SYNC A` — MIDI, DIN 24,
   * DIN 48 (p.62) — so on the page the box has two clock outputs on each of two transports.
   * `DeviceSchema` refuses that, and it is right to: the rack draws one cable per transport per
   * direction, and a reader told to take clock from either of two sockets has been given a choice
   * rather than an instruction. `MIDI OUT/SYNC A` is the one the `sourceSetup` above names, so it
   * is the one that carries the claim.
   */
  jack('MIDI THRU/SYNC B', 'out', ['midi'], 12, {
    note: 'Forwards MIDI IN; THRU PORT FUNC can switch it to DIN 24 or DIN 48 instead (p.62)',
  }),
  jack('CONTROL IN 1', 'in', ['cv'], 12, {
    note: '1/4"; expression pedal or CV. -5 V to +5 V on tip, +5 V supplied on ring (p.76)',
  }),
  jack('CONTROL IN 2', 'in', ['cv'], 12, {
    note: '1/4"; expression pedal or CV. -5 V to +5 V on tip, +5 V supplied on ring (p.76)',
  }),
] as const

// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'elektron-analog-rytm-mkii',
  name: 'Analog Rytm MKII',
  maker: 'Elektron',

  /** p.8, the manual's own first sentence about it: *"a hybrid analog/digital drum machine"*. */
  kind: 'drum-machine',

  /**
   * §7.4. Sends and receives on both wires, and **sends on a third it cannot receive on** — the
   * Digitone II's shape exactly, because it is the same rear panel and the same two menus.
   *
   * p.61 gives the four switches in one list: `CLOCK RECEIVE` *"will when active make Analog Rytm
   * MKII respond to MIDI clock sent from external devices"*, `CLOCK SEND` *"…transmit MIDI
   * clock"*, and `TRANSPORT RECEIVE`/`TRANSPORT SEND` for *"play, stop, continue and song position
   * pointer"*. None of the four names a port; the port is chosen separately by p.62's `INPUT FROM`
   * and `OUTPUT TO`, whose options are DISABLED, MIDI, USB and MIDI+USB.
   *
   * **`usb` is a reading of those two pages together rather than a sentence.** No page in this
   * manual says "MIDI clock over USB": p.62 routes *"MIDI data"* to and from the USB port, p.68
   * offers USB MIDI *"if you wish to send and receive MIDI over USB"*, and clock is MIDI data.
   * The `sourceSetup` below is where that reading is written down, so a reader gets the menu path
   * rather than the inference.
   *
   * **`din-sync` is send-only, and the asymmetry is on the rear panel.** p.12 names two outbound
   * ports that *"can also be configured to send DIN sync to legacy instruments"* and p.62 gives
   * them `DIN 24` and `DIN 48`. `MIDI IN` is *"MIDI data input"* and nothing more; p.76's hardware
   * line reads *"MIDI In/Out/Thru with DIN Sync **out**"*. There is no Sync C.
   *
   * **`preferredSource` is not claimed (§7.4/#80).** p.8 calls the box a drum machine and stops.
   * §16 SETUP EXAMPLES does show it leading — p.72 has it driving other Elektron gear — but the
   * same section shows it taking clock, and the manual never says which job is its own.
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
        note: 'PORT CONFIG > OUT PORT FUNC must be MIDI; DIN 24 or DIN 48 carries no MIDI data',
      },
      {
        transport: 'usb',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUTPUT TO',
        value: 'USB (or MIDI+USB), with SYNC > CLOCK SEND on',
        note: 'USB CONFIG must be USB MIDI or USB AUDIO/MIDI rather than OVERBRIDGE (p.68)',
      },
      {
        transport: 'din-sync',
        path: 'SETTINGS > MIDI CONFIG > PORT CONFIG > OUT PORT FUNC',
        value: 'DIN 24 or DIN 48',
        note: 'THRU PORT FUNC offers the same three options on the other socket',
      },
    ],
  },

  /**
   * Stereo main out, **eight individual outs for eight voice circuits** (p.76's count against
   * p.12's labels), a balanced stereo input for sampling, and class-compliant USB audio: p.18
   * says the box *"can, therefore, stream audio and MIDI directly over USB"*, and p.67-68's USB
   * CONFIG makes the three modes exclusive — OVERBRIDGE, USB MIDI, USB AUDIO/MIDI.
   *
   * **The channel count of that stream is not claimed.** p.65's `USB IN` and `USB OUT` are a
   * stereo pair with selectable sources, and the manual sends anyone wanting Overbridge's own
   * channel structure to Elektron's website. `usbAudio` is a yes-or-no field and this is a yes.
   */
  io: { main: 'stereo', individualOuts: 8, audioIn: true, usbAudio: true },

  jacks: [...JACKS],

  /**
   * §2.6/#111. **This box ships content nobody has listed, which is `shipped-library`.**
   *
   * p.19: *"You find several preset patterns, kits, and Sounds"*; p.20 quantifies only the slots
   * — *"Pattern A01 to B16 are by default used by factory preset content"*; p.58 puts samples on
   * the +Drive, *"several preset samples can be found in one of the ten subdirectories"*, and
   * names none of the ten; p.70's factory reset says *"Sound bank A will be overwritten with the
   * factory Sounds"*.
   *
   * **`enumerable` is the wrong answer and p.26 is the trap.** It prints *"the capacity of 4096
   * Sounds"* — a capacity, not a count, and not a list. Four assertions that content exists and
   * no page naming one item is exactly the state `shipped-library` was added for: the content and
   * its place are established, the names are not, and that is why the two sampler recipes above
   * still describe their audio in `sourceAudio.need` rather than naming a file.
   */
  content: {
    kind: 'shipped-library',
    library: 'several preset Sounds, kits, patterns and samples',
    location: 'Sound bank A, patterns A01-B16, and the ten +Drive sample subdirectories',
    reason: 'four pages say the content is there and none of them names a single Sound or sample',
  },

  /**
   * §2.6/#142. p.43, the TRIG menu: *"LEN sets the length of the note trig."* One of the eight
   * trig parameters beside `NOT`, `VEL` and `PRB`, and parameter-lockable like the rest.
   *
   * The unit comes off p.40, which is where the manual says what its values *mean* rather than
   * that they exist: *"A LEN value of 1/16 adds a sixteenth note and advances the sequencer one
   * step… 1/4 adds a quarter note and advances the sequencer four steps."* Both pages are in the
   * citation because the claim needs both halves and neither carries it alone.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'LEN',
    unit: 'note divisions — 1/16 is one step',
  },

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    'clock.canSendClock': cite(61),
    'clock.canReceiveClock': cite(61),
    'clock.transport': { kind: 'manual', source: `${MANUAL}, p.12, p.62` },
    'clock.sourceSetup[midi-din]': { kind: 'manual', source: `${MANUAL}, p.61, p.62` },
    'clock.sourceSetup[usb]': { kind: 'manual', source: `${MANUAL}, p.62, p.68` },
    'clock.sourceSetup[din-sync]': cite(62),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.8 calls the box "a hybrid analog/digital drum machine" and names no job beyond that; §16 SETUP EXAMPLES has it driving other Elektron gear on p.72 and taking clock elsewhere in the same section, and p.61 gives CLOCK SEND and CLOCK RECEIVE as one symmetric pair of switches. Capability on both sides, a job stated on neither',
    },
    'io.main': cite(12),
    'io.individualOuts': cite(76),
    'io.audioIn': cite(12),
    'io.usbAudio': cite(18),
    voices: cite(21),
    'features.perStep': { kind: 'manual', source: `${MANUAL}, pp.39-50` },
    content: { kind: 'manual', source: `${MANUAL}, p.19, p.58, p.70` },
    noteDuration: { kind: 'manual', source: `${MANUAL}, p.40, p.43` },
    /**
     * §2.6. The LFO is per track and its shape is on p.80 — speed, multiplier, fade, destination,
     * waveform, start phase, trig mode and depth, one per drum track and one more for the FX
     * track (p.15). What no page gives is a *count* of LFOs per track or a routing topology
     * beyond `DST`'s free choice of destination, which is what `features.lfo` would hold.
     */
    'features.lfo': {
      kind: 'unknown',
      reason:
        'p.80 documents one LFO per track parameter by parameter and p.15 adds one for the FX track, but no page states a per-track LFO count or any routing beyond DST choosing a single destination',
    },
    /**
     * §2.6. The compressor on p.83 has a `SEQ` (Sidechain EQ) with `OFF, LPF, HPF, HIT` and a
     * `MIX`, and it sits on the master bus fed by every track — so it ducks the mix against
     * itself, which is not the same claim as a sidechain a part can key. No page describes
     * keying it from one track or from the external inputs.
     */
    'features.sidechain.internal': {
      kind: 'unknown',
      reason:
        "p.83's compressor is a master-bus effect with a sidechain EQ (SEQ: OFF, LPF, HPF, HIT) and no page describes keying it from a nominated track, so what a reader could key it from is not established",
    },
  },

  /**
   * p.76: *"Dimensions: W385 × D225 × H82 mm (15.2 × 8.85 × 3.3″) including knobs, jacks, and
   * feet."* 82 mm is how far the box stands off the desk; the panel drawing's own aspect picks
   * 385 x 225 out of the three and rejects the other reading, which `panel.ts` sets out.
   */
  physical: { panelSpanMm: 385, verified: cite(76) },

  panel: ANALOG_RYTM_MKII_PANEL,

  manual: { title: 'Analog Rytm MKII User Manual', edition: 'OS 1.71' },

  /**
   * §2.2. Twelve tracks, `polyphony: 1` each. p.21 names all twelve in the order the pads run —
   * BD, SD, RS, CP, BT, LT, MT, HT, CH, OH, CY, CB — and the eight-circuit coupling behind them
   * is the module JSDoc's subject.
   *
   * `polyphony: 1` needs no second page here the way the Digitakt II's did: p.21 counts *"8
   * individual track Sounds… with the eight physical voices"*, so a track is at most one voice
   * and a voice is one note.
   *
   * The `roles` lists are bounded by the MACHINE lists rather than by taste. `BD`, `SD`, `RS` and
   * `CP` reach the tonal roles because p.103's three SY machines are synth voices on those four
   * tracks; `LT`, `MT` and `HT` do not, because p.105 gives them one machine and it is a tom.
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'ghost-perc', 'vox-chop'], polyphony: 1 },
    { kind: 'fixed', id: 'rs', label: 'RS', roles: ['rim', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'cp', label: 'CP', roles: ['clap', 'snare'], polyphony: 1 },
    { kind: 'fixed', id: 'bt', label: 'BT', roles: ['tom', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'texture'], polyphony: 1 },
    { kind: 'fixed', id: 'mt', label: 'MT', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ht', label: 'HT', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OH', roles: ['open-hat', 'noise'], polyphony: 1 },
    { kind: 'fixed', id: 'cy', label: 'CY', roles: ['ride', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'cb', label: 'CB', roles: ['metallic', 'noise'], polyphony: 1 },
  ],

  /**
   * §12.4. Eight, and unlike every other `comfortableVoices` in this library the number is not
   * only a judgement — p.21 puts eight voice circuits under the twelve tracks, so the ninth part
   * assigned here is the first one that has to share.
   *
   * **It is still authored as a judgement rather than cited as a fact**, and the distinction is
   * the one `device.ts` makes when it keeps this field out of `CAPABILITY_FACTS`: "eight voice
   * circuits" and "eight parts is where this box gets crowded" are different sentences, and only
   * the first is printed. They agree here. Citing the page would make the manual say the second.
   */
  comfortableVoices: 8,

  features: { perStep: [...PER_STEP] },

  hints: {
    machine: 'Press [SRC] twice',
    'trig-params': 'Hold a [TRIG] key, turn DATA ENTRY',
    'micro-timing': 'Hold [TRIG], press [LEFT]/[RIGHT]',
    retrig: 'Hold [TRIG], press [RTRG]',
    accent: 'Hold the note trig, press [BANK F]',
    sample: '[SMPL], then turn SMP',
  },

  recipes,
}
