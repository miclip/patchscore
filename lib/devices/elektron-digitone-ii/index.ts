import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset, ParamScope } from '../../core/params'
import { DIGITONE_II_PANEL } from './panel'

/**
 * Elektron Digitone II (§2.3). Sixteen tracks, sixteen voices, five SYN machines and a 128-step
 * sequencer — the sibling of `elektron-digitakt-ii` with the sampler taken out and four synthesis
 * engines put in. Most of what that manifest discovered about Elektron documentation holds here
 * unchanged, so this note is about the three places the two boxes genuinely differ.
 *
 * ## 1. The voices are a shared budget, and the model has no word for that
 *
 * The Digitakt II is one voice per track and that is the end of it. This box is not: p.47 gives
 * *"16 voice polyphony"* over the same sixteen tracks, `VOICES` locks *"the number of voices
 * (1–16) you want to lock to a specific track"*, and p.37's `PLAY MODE` makes a preset `POLY` or
 * `MONO`. So a track really does sound chords — but only out of one pool of sixteen that every
 * other track is drawing from at the same time.
 *
 * `polyphony` is a per-assignable claim (§2.2) with no way to say "these sixteen share". Sixteen
 * pool members each declaring 16 would promise **256 simultaneous notes** this box cannot sound,
 * and declaring 1 would refuse the chord it plainly plays. **This manifest declares 4 and says so
 * out loud** in `capabilityEvidence.voices` as a `partly` fact: the sixteen and the poly/mono
 * split are cited, the 4 is authored downward from them. It is the MPC Live III's move — that
 * manifest's `mono-track` 1 is *"authored, not cited"* for the same reason, and under-claiming
 * costs a guide nothing while over-claiming would let a request land on a voice that cannot
 * carry it.
 *
 * **This is a finding rather than a defect (#57).** What the model would need is a device-level
 * voice budget that pool members spend against, which is an engine change and does not belong in
 * a device folder. Recorded here rather than approximated.
 *
 * ## 2. Algorithm-dependent values, and the one place they stop being authorable
 *
 * `CLAUDE.md`'s rule is that a value read off the wrong one of two printed scales is made up, and
 * that the recipe must carry the switch. On this box the switch is `ALGO`, and the manual is
 * explicit about what depends on it:
 *
 *  - `MIX` — *"Each algorithm has two carrier outputs (X and Y) that come from two different
 *    operators depending on what algorithm you chose"* (p.90). The same number is a different
 *    crossfade under a different algorithm.
 *  - `FDBK` — *"sets the amount of self modulation of the operator that has feedback. This
 *    operator is shown in the algorithm on the screen"* (p.90). Which operator it reaches is the
 *    algorithm's choice, not the parameter's.
 *  - `LEV (A)` and `LEV (B)` — *"sets the modulation amount from operator A"* (p.90), where
 *    whether A modulates anything, and what, is the routing `ALGO` selects (p.89).
 *
 * So **every FM TONE recipe below carries `ALGO`**, and it sits beside those values rather than
 * being left to whatever the loaded preset had. The options are cited to p.107 — *"The Digitone
 * II has eight different algorithms"* — and the selection is taste, exactly as `GEN` is on the
 * TR-1000.
 *
 * **What is *not* claimed is which routing each number is.** p.107 prints the eight diagrams
 * unnumbered, in two rows of four; only the p.89 screenshot ties a number to a picture, and one
 * anchor plus an assumed reading order is not a citation. Nothing here describes an algorithm's
 * topology, and no recipe title says what its algorithm does.
 *
 * **FM DRUM is where the rule bites hardest, and the honest answer is subtraction.** Its `ALGO`
 * *"selects the structure of how the three operators are connected"* (p.94) — but no page states
 * how many algorithms it has, and the parameter renders as a block diagram rather than a number,
 * so there is no token to author. Its `FDBK`, `RATIO`, `MOD` and `DEC` are algorithm-dependent
 * in exactly the way FM TONE's are, and with the switch unauthorable **they are omitted rather
 * than printed unpinned**. The seven FM DRUM recipes below carry the machine, the filter, the
 * amplitude envelope and the FX page, and stop there.
 *
 * ## 3. Micro timing has two printed scales, so no recipe articulates it
 *
 * `micro-timing` is declared in `features.perStep` and is deliberately absent from
 * `ARTICULABLE_PER_STEP`, which is the one place this manifest diverges from its sibling's
 * subset. The manual prints the displacement twice, in different units:
 *
 *     [TRIG] + [LEFT]/[RIGHT] pop-up      screen reads `+1/384`         p.48
 *     NOTE EDIT menu, TIME                "The full range is -23–23"    p.44
 *
 * An articulation `set` carries a bare scalar and has nowhere to name which of the two it is in.
 * `-2` would be a third of a step in one reading and a 192nd of one in the other, and a reader
 * standing at the machine has no way to tell which was meant. That is the same failure as the
 * minilogue xd's `SHAPE`, arriving in a field that has no room for the switch — so the lane stays
 * declared, because the box does it, and unreachable, because the guide cannot say it.
 *
 * ## No trigger note, because nothing on this box has an original pitch (§2.1/#334)
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. This
 * box has 216, all on the one `track` pool, and it declines for the plainest reason in the whole
 * class: **`TriggerNote` is a sampler's fact, and there is no sampler here.**
 *
 * The field holds *the note that plays this part's sound as it is* — a loaded sample's original
 * pitch, where writing anything else transposes the recording. Every machine on this box is a
 * synthesis engine (`FM TONE`, `FM DRUM`, `WAVETONE`, `SWARMER`), and a synth has no "as
 * recorded" pitch to be at. Its note is the pitch you want, which under §4.1 is the direction's
 * decision and belongs in the template.
 *
 * The library already states this rule from the other side, on the Tracker Mini's `track-synth`:
 * *"has no sample to be at its original pitch, so its note is the reader's."* The Digitone II is
 * the first box where that is true of the whole instrument, so there is no second pool to hold
 * the exception in — which is the same structural point as the Digitakt II's, arrived at from the
 * opposite direction.
 *
 * **The manual is consistent about it across three chapters.**
 *
 *  - p.42 defines what a step is: *"NOTE TRIGS trigger preset notes or MIDI notes"*, against
 *    *"LOCK TRIGS trigger parameter locks (but do not trigger notes)"*. The note is the content
 *    of the trig, not an address it is sent to.
 *  - p.44's NOTE EDIT is the sharpest evidence, because it shows **several notes on one step** —
 *    the screen prints `E 5`, `G 5` and `C 5` with their own time, length and velocity, and the
 *    text is *"Press and turn DATA ENTRY knob A to select any note in the Chromatic scale."* A
 *    single `TriggerNote` cannot be a chord, and `polyphony: 4` below is the model agreeing.
 *  - p.57 names it: *"Trig Note sets the pitch of the note when trigged."* The same page warns
 *    that *"MIDI tracks have a different set of parameters on the TRIG, SYN, FLTR, and AMP
 *    pages"*, so the pool's third kind of track does not share the meaning either.
 *
 * ## The octave convention, recorded and deliberately not used
 *
 * p.24 states it outright: *"MIDI note numbers 16-84, that corresponds to notes E2-C7 (C5, MIDI
 * note 60, being middle C)"*, and confirms it from the floor — *"Note numbers 0-15 correspond to
 * notes C0 through to D#1"*. p.38 agrees from a third place, keytracking being *"centered around
 * middle C (C5)"*, and p.57's TRIG screen prints the pair as `C 5 (60)`.
 *
 * So `C5` is 60 here and `0` is `C0`: the same numbering as the Digitakt II and the Tracker Mini,
 * and an octave below the SP-404MK2's. It is recorded because the library holds two conventions
 * and a rendered note name shows neither (#352). **No value is authored from it** — a pitch on
 * this box is the direction's, resolved against the song's key, and that is a different field.
 *
 * ## Numbers: this manual prints almost none, again
 *
 * Elektron documents what a parameter does and leaves the range to the screen, so across the
 * whole of "11. TRACK PARAMETERS", "12. FX AND MIXER PARAMETERS" and APPENDIX A the printed
 * ranges are countable on two hands: `HARM (-26.00–26.00)` and `MIX (-64–63)` on p.90, `RATIO B
 * (0.25–16.0)` on p.90, `VFAD (-64–64)` and retrig `LEN (0,125–INF)` on p.58, `HOLD (0–126)` on
 * p.61 and again on p.97, `FADE (-64–63)` on p.63, bit reduction *"from 16 bits to 1 bit"* on
 * p.62, swing *"51-80%"* on p.23 and the compressor's `DRY/WET MIX` 0 to 127 on p.68. APPENDIX C
 * is a CC and NRPN table and prints no values at all.
 *
 * This manifest is therefore **enum-dominated** like its sibling, and every uncited numeric is
 * absent rather than given an invented `0-127`.
 *
 * `RATIO B` is the one printed range deliberately left unused. The parameter displays as a *pair*
 * — the p.89 screenshot shows `4.00` over `1.00` — because *"B2 increases until it reaches the
 * max (16). It then starts over from .25 and B1 increases to the next value"* (p.90). One
 * authored number would not say which operator it is, which is the cited-wrong-scale trap wearing
 * a parameter's name instead of a switch's.
 */

const MANUAL = 'Digitone II User Manual OS 1.10'

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
 * The MACHINE SEL screen, p.89. `MIDI` is the machine that turns a track into a MIDI track
 * (p.17), and no recipe here reaches for it — a MIDI track makes no sound.
 */
const SYN_MACHINES = ['FM TONE', 'FM DRUM', 'WAVETONE', 'SWARMER', 'MIDI'] as const

/**
 * The FLTR MACHINE SEL screen, p.101. Screen and the A.3.1-A.3.6 headings on pp.102-105 agree
 * character for character, hyphens and trailing signs included, so there is no second spelling
 * to choose between.
 */
const FLTR_MACHINES = [
  'MULTI-MODE',
  'LOWPASS 4',
  'LEGACY LP/HP',
  'COMB-',
  'COMB+',
  'EQUALIZER',
] as const

/** AMP page `MODE`, p.61. `HOLD` exists only under AHD; `SUS` and `REL` only under ADSR. */
const AMP_MODES = ['AHD', 'ADSR'] as const

/**
 * MOD page `MODE` (LFO Trig Mode), p.63. Note these are the full words — the sibling Digitakt II
 * prints `FRE`/`TRG`/`HLD`/`ONE`/`HLF` for the same five, and copying its list across would have
 * put four tokens on this screen that it does not show.
 */
const LFO_MODES = ['FREE', 'TRIG', 'HOLD', 'ONE', 'HALF'] as const

/**
 * MOD page `WAVE`, p.64. The prose on p.63 names the waveforms in English ("Triangle, Sine,
 * Square, Sawtooth… Exponential and Ramp"); the LFO WAVEFORMS AND TRIGMODES table on p.64 prints
 * the on-screen tokens, which is what an option set has to carry. That table is why this device
 * can author an LFO waveform where the Digitakt II could not.
 */
const LFO_WAVES = ['TRI', 'SINE', 'SQR', 'SAW', 'EXPO', 'RAMP', 'RAND'] as const

/**
 * FM TONE `ALGO`. p.107: *"The Digitone II has eight different algorithms where the four
 * operators are routed in different ways."* The screen prints the selection as a numeral (p.89
 * shows `1`), so these are the tokens. See the module note for why no routing is described.
 */
const ALGOS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

/** FM TONE `PHRT` (Phase Reset), p.92 — the manual lists all five with what each resets. */
const PHASE_RESETS = ['OFF', 'ALL', 'C', 'A+B', 'A+B2'] as const

/** WAVETONE `TBL1`/`TBL2` (Wavetable), p.97. `PRIM` is Sin/Tri/Saw/Square; `HARM` is the long list. */
const WAVETABLES = ['PRIM', 'HARM'] as const

/**
 * WAVETONE `MOD` (Oscillator Modulation), p.97, reproduced with the manual's own typography.
 * `RING MODE FIXED` is almost certainly a slip for `RING MOD FIXED`, and it is left as printed:
 * that string occurs exactly once in 122 pages, the screen shows an icon rather than a token, and
 * the index carries neither form. Correcting it would put a word on the box that no document does.
 */
const OSC_MODS = ['OFF', 'RING MOD', 'RING MODE FIXED', 'HARD SYNC'] as const

/** WAVETONE `RSET` (Oscillator Phase Reset), p.97. */
const OSC_PHASE_RESETS = ['OFF', 'ON', 'RAND'] as const

/** WAVETONE `TYPE` (Noise Type), p.98. `S&H` is the manual's own spelling. */
const NOISE_TYPES = ['GRAIN', 'TUNED', 'S&H'] as const

/**
 * SWARMER `M.OCT` (Main Octave), p.98. The body text on p.99 describes it in prose — *"detunes
 * the main oscillator down one or two octaves"* — and the three values themselves appear only in
 * the screen's own selector graphic, which is what this cites.
 */
const MAIN_OCTAVES = ['0', '-1', '-2'] as const

/** FX page `SR.RT` and `OD.RT`, p.62 — before or after the filter machine. */
const FX_ROUTINGS = ['PRE', 'POST'] as const

/** FLTR page 2 `RSET` (Filter Envelope Reset), p.60. */
const ENV_RESETS = ['ON', 'OFF'] as const

/**
 * SETUP menu `PLAY MODE`, p.37. **This is the switch a chord recipe cannot come apart from**: a
 * `polyphonic-voice` recipe on a preset left in `MONO` sounds one note of the chord, so the two
 * pad-and-stab recipes below carry `POLY` beside their notes for the same reason every FM TONE
 * recipe carries `ALGO`.
 */
const PLAY_MODES = ['POLY', 'POLY M.LFO', 'MONO', 'MONO LEG.'] as const

/**
 * §2.3's per-step vocabulary — the per-trig capabilities this manual documents.
 *
 * Reachable from `articulation`, because each is a scalar that stays true applied to every hit
 * sharing a slot: `velocity` and `note-length` (VEL, LEN — p.57), `probability` (PROB, p.57,
 * whose outcome is *"re-evaluated every time a trig is set to play"*, so it carries no state),
 * and `retrig` with `retrig-rate` (RTRG and RATE, p.58 — paired, because "these hits retrig" with
 * no rate is not an instruction anyone can carry out).
 *
 * Declared and deliberately unreachable:
 *
 *  - `micro-timing` — two printed scales and nowhere in a `set` to name which. See the module note.
 *  - `condition` — PRE, NEI, 1ST, LST and A:B are stateful (p.51), depending on the previously
 *    evaluated condition on this or the neighbour track, on where the pattern is in its loop, or
 *    on a repetition counter. A `set` is a static scalar with no evaluation order.
 *  - `fill` — depends on whether the device is in FILL mode, which is global runtime state (p.52).
 *  - `preset-lock` — a per-step preset change from the pool (p.50). Expressible in principle and
 *    omitted in practice, because the value would be a preset name nobody can know (invariant 5)
 *    — p.29's pool holds 128 and no page prints one of their names.
 */
const PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'condition',
  'fill',
  'preset-lock',
] as const

/** The subset `articulation` may use. Exported so the test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'retrig',
  'retrig-rate',
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

/** One of the handful of numerics this manual gives a range for. */
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

const syn = (m: (typeof SYN_MACHINES)[number]) => pick('SYN MACHINE', m, SYN_MACHINES, 89)
const fltr = (m: (typeof FLTR_MACHINES)[number]) => pick('FLTR MACHINE', m, FLTR_MACHINES, 101)
const ampMode = (m: (typeof AMP_MODES)[number]) => pick('AMP MODE', m, AMP_MODES, 61)
const lfoMode = (m: (typeof LFO_MODES)[number]) => pick('LFO MODE', m, LFO_MODES, 63)
const lfoWave = (w: (typeof LFO_WAVES)[number]) => pick('LFO WAVE', w, LFO_WAVES, 64)
const playMode = (m: (typeof PLAY_MODES)[number]) => pick('PLAY MODE', m, PLAY_MODES, 37)
const phaseReset = (v: (typeof PHASE_RESETS)[number]) => pick('PHRT', v, PHASE_RESETS, 92)
const envReset = (v: (typeof ENV_RESETS)[number]) => pick('RSET', v, ENV_RESETS, 60)
const oscMod = (v: (typeof OSC_MODS)[number]) => pick('MOD', v, OSC_MODS, 97)
const oscPhase = (v: (typeof OSC_PHASE_RESETS)[number]) => pick('RSET', v, OSC_PHASE_RESETS, 97)
const table = (name: 'TBL1' | 'TBL2', v: (typeof WAVETABLES)[number]) =>
  pick(name, v, WAVETABLES, 97)
const noiseType = (v: (typeof NOISE_TYPES)[number]) => pick('TYPE', v, NOISE_TYPES, 98)
const mainOctave = (v: (typeof MAIN_OCTAVES)[number]) => pick('M.OCT', v, MAIN_OCTAVES, 98)
const srRouting = (v: (typeof FX_ROUTINGS)[number]) => pick('SR.RT', v, FX_ROUTINGS, 62)
const odRouting = (v: (typeof FX_ROUTINGS)[number]) => pick('OD.RT', v, FX_ROUTINGS, 62)

/** FM TONE `ALGO`, the switch every algorithm-dependent value on this box hangs off. */
const algo = (n: (typeof ALGOS)[number]) => pick('ALGO', n, ALGOS, 107)

/** FM TONE `HARM`, p.90. Negative shapes operator C, positive shapes A and B1 (p.109). */
const harm = (v: number) =>
  num('HARM', v, { min: -26, max: 26 }, 90, {
    mood: [{ axis: 'darkness', amount: -10 }],
    note: 'Negative changes operator C, positive changes A and B1',
  })

/** FM TONE `MIX`, p.90. Which two timbres it crosses between is `ALGO`'s answer, not this one's. */
const mix = (v: number) =>
  num('MIX', v, { min: -64, max: 63 }, 90, {
    note: 'Crossfades the X and Y carrier outputs the selected ALGO puts there',
  })

/** AMP `HOLD`, p.61. Only exists when MODE is AHD, which is why it never appears without it. */
const hold = (v: number) =>
  num('HOLD', v, { min: 0, max: 126 }, 61, {
    mood: [{ axis: 'density', amount: -24 }],
    note: 'Only available when AMP MODE is AHD',
  })

/** WAVETONE noise-envelope `HOLD`, p.97 — its own parameter on SYN page 3, not the AMP page's. */
const noiseHold = (v: number) =>
  num('HOLD', v, { min: 0, max: 126 }, 97, {
    mood: [{ axis: 'density', amount: -18 }],
    note: 'The noise amp envelope on SYN page 3, not the AMP page',
  })

/** LFO `FADE`, p.63. Positive fades out, negative fades in. */
const fade = (v: number) => num('FADE', v, { min: -64, max: 63 }, 63)

/** Retrig `VFAD`, p.58. The velocity curve across the retrig. */
const vfad = (v: number) => num('VFAD', v, { min: -64, max: 64 }, 58)

/**
 * FX page `BR`, p.62: *"Bit Reduction sets the bit depth. The parameter range is from 16 bits to
 * 1 bit."* The only numeric here carrying the `grit` axis.
 *
 * **No `unit`, and that is the units vocabulary being obeyed rather than an omission.** `Bits` is
 * in the reviewed list as a *box-printed* spelling — the Tracker Mini and the MPCs put it on the
 * screen that way — and this manual prints "bits" only in the prose sentence above, which is the
 * same standing the TR-8S's "semitone" has. Adding a second, lowercase spelling of a unit already
 * in the list is exactly the drift that test exists to stop, so the reading goes in `note` where
 * prose belongs.
 */
const bitReduction = (v: number) =>
  num('BR', v, { min: 1, max: 16 }, 62, {
    mood: [{ axis: 'grit', amount: -5 }],
    note: 'The range is bit depth: 16 is untouched audio, 1 is the far end',
  })

/**
 * The TEMPO menu's `SWING`, p.23: *"The swing ratio can be set to 51-80%. The default setting is
 * equal spacing, 50%."* One setting for the whole pattern (p.16 lists swing among what a pattern
 * contains), so it is hoisted out of the per-part list by `scope`.
 */
const swing = (v: number) =>
  num('SWING', v, { min: 51, max: 80 }, 23, {
    unit: '%',
    scope: 'pattern',
    mood: [{ axis: 'swing', amount: 12 }],
    note: 'One setting for the whole pattern, not per track',
  })

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: Recipe['articulation'] extends (infer E)[] | undefined ? (E extends { slot: infer S } ? S : never) : never,
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
  // FM DRUM — six percussion parts. No `ALGO`, and nothing that depends on one.
  // -------------------------------------------------------------------------
  {
    id: 'dn2-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'FM DRUM kick, four-pole filter under it and nothing else in the way',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(22),
      bitReduction(16),
      swing(52),
    ],
    articulation: [art('downbeat', { velocity: 120 }, 'trig-params')],
  },
  {
    id: 'dn2-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'FM DRUM snare through the EQ, tail cut at the hold',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('EQUALIZER'),
      ampMode('AHD'),
      hold(18),
      bitReduction(16),
      vfad(-32),
      swing(52),
    ],
    articulation: [
      art('backbeat', { velocity: 124 }, 'trig-params'),
      art('fill', { retrig: true, 'retrig-rate': '1/32' }, 'retrig'),
    ],
  },
  {
    id: 'dn2-closed-hat-bright',
    role: 'closed-hat',
    character: 'bright',
    voice: 'track',
    title: 'FM DRUM hat, top left in and the offbeats thinned',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('EQUALIZER'),
      ampMode('AHD'),
      hold(4),
      bitReduction(16),
      swing(56),
    ],
    articulation: [
      art('offbeat', { velocity: 88 }, 'trig-params'),
      art('ghost', { velocity: 44, probability: 60 }, 'trig-params'),
    ],
  },
  {
    id: 'dn2-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'track',
    title: 'FM DRUM open hat let ring, lowpass taking the fizz off',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(68),
      bitReduction(16),
      swing(56),
    ],
    articulation: [art('offbeat', { velocity: 104, 'note-length': '1/8' }, 'trig-params')],
  },
  {
    id: 'dn2-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    title: 'FM DRUM tom, body held and the top rolled off',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(46),
      bitReduction(16),
    ],
    articulation: [art('accent', { velocity: 116 }, 'trig-params')],
  },
  {
    id: 'dn2-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'FM DRUM tick under everything, half of it not playing',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('MULTI-MODE'),
      ampMode('AHD'),
      hold(5),
      bitReduction(14),
      swing(58),
    ],
    articulation: [art('ghost', { velocity: 40, probability: 50 }, 'trig-params')],
  },
  {
    id: 'dn2-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'FM DRUM hit on the change, bit-crushed and left long',
    verified: false,
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('LEGACY LP/HP'),
      ampMode('AHD'),
      hold(104),
      bitReduction(8),
      odRouting('POST'),
    ],
    articulation: [art('first-hit', { velocity: 127 }, 'trig-params')],
  },

  // -------------------------------------------------------------------------
  // FM TONE — every one carries ALGO, because everything beside it depends on which.
  // -------------------------------------------------------------------------
  {
    id: 'dn2-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'FM TONE sub, harmonics pulled back toward the sine',
    verified: false,
    params: [
      syn('FM TONE'),
      algo('1'),
      playMode('MONO'),
      harm(-14),
      mix(-40),
      phaseReset('ALL'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(88),
      bitReduction(16),
    ],
    articulation: [art('downbeat', { 'note-length': '1/4' }, 'trig-params')],
  },
  {
    id: 'dn2-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'track',
    title: 'FM TONE struck through the resonant comb',
    verified: false,
    params: [
      syn('FM TONE'),
      algo('4'),
      playMode('MONO'),
      harm(18),
      mix(24),
      phaseReset('A+B'),
      fltr('COMB+'),
      ampMode('AHD'),
      hold(36),
      bitReduction(16),
    ],
    articulation: [art('offbeat', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'dn2-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    title: 'FM TONE lead, one note at a time and the filter opened',
    verified: false,
    params: [
      syn('FM TONE'),
      algo('2'),
      playMode('MONO LEG.'),
      harm(20),
      mix(16),
      phaseReset('C'),
      fltr('MULTI-MODE'),
      envReset('ON'),
      ampMode('ADSR'),
      lfoMode('TRIG'),
      lfoWave('TRI'),
      fade(-24),
      bitReduction(16),
    ],
    articulation: [art('accent', { velocity: 118, 'note-length': '1/8' }, 'trig-params')],
  },
  {
    id: 'dn2-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'track',
    title: 'FM TONE arpeggio, LFO restarted on every trig',
    verified: false,
    params: [
      syn('FM TONE'),
      algo('3'),
      playMode('MONO'),
      harm(12),
      mix(8),
      phaseReset('ALL'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(9),
      lfoMode('TRIG'),
      lfoWave('SAW'),
      fade(18),
      bitReduction(16),
      swing(54),
    ],
    articulation: [art('offbeat', { velocity: 100, 'note-length': '1/16' }, 'trig-params')],
  },
  {
    id: 'dn2-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'FM TONE chord stab, played as a real chord',
    verified: false,
    /**
     * §12.4. Unlike the Digitakt II — which reaches a chord only through a sample that already
     * contains one — this box sounds the notes itself, so `realisation` stays at its default
     * `polyphonic-voice`. What makes that true is `PLAY MODE POLY` (p.37) sitting in the params
     * beside the notes: the same preset in `MONO` sounds one note of the three, and the guide
     * would read as correct while describing a patch that cannot play the part.
     */
    params: [
      syn('FM TONE'),
      algo('5'),
      playMode('POLY'),
      harm(6),
      mix(-12),
      phaseReset('A+B2'),
      fltr('MULTI-MODE'),
      envReset('ON'),
      ampMode('AHD'),
      hold(20),
      bitReduction(16),
    ],
    articulation: [art('accent', { velocity: 118, 'note-length': '1/8' }, 'trig-params')],
  },
  {
    id: 'dn2-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'FM TONE pad held on the note length, LFO free-running under it',
    verified: false,
    params: [
      syn('FM TONE'),
      algo('6'),
      playMode('POLY M.LFO'),
      harm(-6),
      mix(0),
      phaseReset('OFF'),
      fltr('LOWPASS 4'),
      envReset('OFF'),
      ampMode('ADSR'),
      lfoMode('FREE'),
      lfoWave('SINE'),
      fade(30),
      bitReduction(16),
    ],
    articulation: [art('downbeat', { 'note-length': '1/1' }, 'trig-params')],
  },

  // -------------------------------------------------------------------------
  // WAVETONE — two oscillators, phase distortion, ring mod and hard sync, plus its own noise.
  // -------------------------------------------------------------------------
  {
    id: 'dn2-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'WAVETONE bass hard-synced, overdrive after the filter',
    verified: false,
    params: [
      syn('WAVETONE'),
      playMode('MONO'),
      table('TBL1', 'PRIM'),
      table('TBL2', 'PRIM'),
      oscMod('HARD SYNC'),
      oscPhase('ON'),
      fltr('LOWPASS 4'),
      envReset('ON'),
      ampMode('AHD'),
      hold(14),
      bitReduction(11),
      odRouting('POST'),
    ],
    articulation: [art('downbeat', { velocity: 112, 'note-length': '1/16' }, 'trig-params')],
  },
  {
    id: 'dn2-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'track',
    title: 'WAVETONE acid line, legato slides and the ladder squeezed',
    verified: false,
    routing:
      '**Slide:** `PLAY MODE MONO LEG.` above, and the `note-length` on the offbeat trigs below. This box has no portamento lane — its predecessor does, and the difference is real (p.57 lists VEL, LEN and PROB here, and PORT and PTIM there) — so the slide is a legato setting plus notes long enough to run into the next, rather than a step you mark',
    params: [
      syn('WAVETONE'),
      playMode('MONO LEG.'),
      table('TBL1', 'PRIM'),
      table('TBL2', 'HARM'),
      oscMod('OFF'),
      oscPhase('ON'),
      fltr('LOWPASS 4'),
      envReset('ON'),
      ampMode('AHD'),
      hold(7),
      lfoMode('ONE'),
      lfoWave('EXPO'),
      fade(-32),
      bitReduction(12),
      odRouting('PRE'),
      swing(55),
    ],
    articulation: [
      art('offbeat', { velocity: 108, 'note-length': '1/16' }, 'trig-params'),
      // The lean the line is built around, and the reason it is a second entry rather than a
      // larger number on the first: `offbeat` says how the ordinary steps sit and `accent` says
      // which one is louder than them, so collapsing the two would leave the part with one
      // velocity and nothing to be accented against. VEL is p.57's per-trig lane, and 120 over
      // the 108 above is a jump a listener hears without the step leaving the line.
      art('accent', { velocity: 120 }, 'trig-params'),
    ],
  },
  {
    id: 'dn2-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'WAVETONE clap built out of the noise section, grain wide open',
    verified: false,
    params: [
      syn('WAVETONE'),
      playMode('MONO'),
      table('TBL1', 'PRIM'),
      oscMod('OFF'),
      oscPhase('RAND'),
      noiseType('GRAIN'),
      noiseHold(16),
      fltr('EQUALIZER'),
      ampMode('AHD'),
      hold(24),
      bitReduction(16),
    ],
    articulation: [art('backbeat', { velocity: 112 }, 'trig-params')],
  },
  {
    id: 'dn2-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'WAVETONE riser, one LFO pass into the change',
    verified: false,
    params: [
      syn('WAVETONE'),
      playMode('MONO'),
      table('TBL1', 'HARM'),
      table('TBL2', 'HARM'),
      oscMod('RING MOD'),
      oscPhase('ON'),
      noiseType('S&H'),
      noiseHold(96),
      fltr('MULTI-MODE'),
      envReset('OFF'),
      ampMode('ADSR'),
      lfoMode('ONE'),
      lfoWave('RAMP'),
      fade(-48),
      bitReduction(16),
    ],
    articulation: [art('last-hit', { velocity: 127, 'note-length': '1/2' }, 'trig-params')],
  },

  // -------------------------------------------------------------------------
  // SWARMER — one main oscillator and six detuned ones. One page, no algorithm.
  // -------------------------------------------------------------------------
  {
    id: 'dn2-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'SWARMER bed an octave down, animation left running',
    verified: false,
    params: [
      syn('SWARMER'),
      playMode('POLY M.LFO'),
      mainOctave('-1'),
      fltr('LOWPASS 4'),
      envReset('OFF'),
      ampMode('ADSR'),
      lfoMode('FREE'),
      lfoWave('SINE'),
      fade(40),
      bitReduction(16),
    ],
    articulation: [art('downbeat', { 'note-length': '1/1' }, 'trig-params')],
  },
  {
    id: 'dn2-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'track',
    title: 'SWARMER sweep two octaves down, closing across the section',
    verified: false,
    params: [
      syn('SWARMER'),
      playMode('MONO'),
      mainOctave('-2'),
      fltr('MULTI-MODE'),
      envReset('OFF'),
      ampMode('ADSR'),
      lfoMode('HALF'),
      lfoWave('TRI'),
      fade(-40),
      bitReduction(16),
    ],
    articulation: [art('last-hit', { velocity: 96, 'note-length': '1/2' }, 'trig-params')],
  },
  // ---------------------------------------------------------------------------
  // #345. Three of the pool's four unserved roles. The fourth, `vox-chop`, came
  // off the pool instead — see the `voices` note for why.
  // ---------------------------------------------------------------------------
  {
    id: 'dn2-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track',
    title: 'FM DRUM rim, all transient and no body',
    verified: false,
    /**
     * Three directions ask for this role and all three ask for `clean`, so one recipe is exact
     * everywhere rather than substituting anywhere.
     *
     * FM DRUM rather than WAVETONE: a rim is almost entirely transient, and FM DRUM is the
     * machine built around one. `AHD` with a short `HOLD` is what leaves the click and nothing
     * after it — a rim with a tail is a tom.
     *
     * `clean` is authored as an absence as much as a choice: `BR` is where this box's grit lives,
     * and p.62's scale is bit *depth* rather than an amount — 16 is untouched audio and 1 is the
     * far end — so a clean part sits at the top of it, not the bottom.
     */
    params: [
      syn('FM DRUM'),
      playMode('MONO'),
      fltr('EQUALIZER'),
      ampMode('AHD'),
      hold(6),
      bitReduction(16),
    ],
    articulation: [
      art('accent', { velocity: 118 }, 'trig-params'),
      art('ghost', { velocity: 46 }, 'trig-params'),
    ],
  },
  {
    id: 'dn2-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'track',
    title: 'WAVETONE ride, S&H noise rung through the comb',
    verified: false,
    /**
     * **A ride is inharmonic and sustained, and that pair is what picks the machine.** WAVETONE's
     * noise section is the only place on this box that makes an unpitched wash — p.98 gives
     * `TYPE` as `GRAIN`, `TUNED` or `S&H`, and `S&H` is the one whose steps do not settle onto a
     * pitch. `COMB+` then gives it the ringing the noise on its own does not have, which is the
     * same pairing `dn2-metallic-bright` uses one role along and for the same reason.
     *
     * `noiseHold(110)` against the AMP page's `hold(96)` is the ring: p.97's noise envelope is
     * its own, so the wash outlasts the strike rather than being cut with it.
     */
    params: [
      syn('WAVETONE'),
      playMode('MONO'),
      table('TBL1', 'HARM'),
      oscMod('OFF'),
      oscPhase('RAND'),
      noiseType('S&H'),
      noiseHold(110),
      fltr('COMB+'),
      ampMode('AHD'),
      hold(96),
      bitReduction(12),
    ],
    articulation: [
      art('offbeat', { velocity: 94 }, 'trig-params'),
      art('accent', { velocity: 116 }, 'trig-params'),
    ],
  },
  {
    id: 'dn2-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track',
    title: 'WAVETONE noise struck on the grid, bit-reduced hard',
    verified: false,
    /**
     * **The one role on this box whose name matches a section of the machine**, which is worth
     * saying because it makes the choice unarguable rather than tasteful: WAVETONE carries a noise
     * generator with its own type and its own envelope (pp.97-98), so a noise part here is that
     * section turned up and the oscillators turned down.
     *
     * `GRAIN` rather than the ride's `S&H`: p.98's grain noise is the broadband one, and the
     * direction asking patterns this on `accent`, `downbeat` and `offbeat` — a struck part wants
     * a full spectrum to strike, where a ride wants the stepping character.
     *
     * **Struck rather than held, read off the direction rather than assumed.** A bed would be
     * `ADSR` with a long sustain, which is `dn2-texture-soft` and a different part.
     *
     * `BR 3` is near the far end of p.62's scale, which counts bit depth downwards — 16 is
     * untouched audio and 1 is the most reduced. A `dirty` part belongs at the bottom of that
     * range and a value above 16 is not a heavier setting, it is off the scale.
     */
    params: [
      syn('WAVETONE'),
      playMode('MONO'),
      table('TBL1', 'PRIM'),
      oscMod('OFF'),
      oscPhase('RAND'),
      noiseType('GRAIN'),
      noiseHold(30),
      fltr('MULTI-MODE'),
      ampMode('AHD'),
      hold(18),
      bitReduction(3),
    ],
    articulation: [
      art('offbeat', { velocity: 96 }, 'trig-params'),
      art('accent', { velocity: 122 }, 'trig-params'),
    ],
  },
]

export const device: Device = {
  id: 'elektron-digitone-ii',
  name: 'Digitone II',
  maker: 'Elektron',

  /**
   * **`groovebox`, and the manual names no category at all**, so this is a judgement rather than
   * a reading. p.11 gets closest — *"the latest creature in Elektron's history of digital products
   * with an FM synthesis heart"* — and the word "synthesizer" appears in this document only about
   * *other people's* boxes, in §15.3's "CONTROLLING A SYNTHESIZER USING THE MIDI TRACKS".
   *
   * What decides it is what the box is *for* rather than what one track contains. Sixteen
   * sequenced tracks with a kit per pattern and 128 patterns to a project (p.16), song mode
   * (p.53), PERFORM KIT mode (p.55), three send effects into a mixer, and a master compressor
   * with a sixteen-track sidechain source (p.15, p.68) — that is a self-contained multi-part
   * production instrument, which is what `groovebox` names.
   *
   * **The argument that points the other way is recorded rather than buried, because it is a
   * real one.** The sibling Digitakt II is a `sampler` because its sixteen tracks hold whatever
   * audio is loaded into them; split the same way, these sixteen hold a synthesis engine chosen
   * from a list of four (p.89) and can load no audio at all, which reads as `synth`. That split
   * describes what a *track* holds. `kind` describes what the *box* is, and `DEVICE_KINDS`'s own
   * rule is that a kind earns its place when the alternatives would make a manifest say something
   * false: `synth` on a box whose entire data structure is projects, patterns, kits and songs
   * would put the identity in the voice and leave the arrangement unnamed.
   *
   * Neither reading is forced by a page, and both are written down here so the next person to
   * disagree is disagreeing with an argument rather than with a bare field.
   */
  kind: 'groovebox',

  /**
   * §7.4. Sends and receives on both wires, and **sends on a third it cannot receive on.**
   *
   * `CLOCK SEND` *"sets whether or not Digitone II transmits MIDI clock"* and `CLOCK RECEIVE`
   * *"sets whether or not Digitone II responds to MIDI clock sent from external devices"* (p.74).
   * Both are global on/off with no port named; the port is chosen separately by `OUTPUT TO` and
   * `INPUT FROM`, whose options are DISABLED, MIDI, USB and MIDI+USB (p.75).
   *
   * **`din-sync` is send-only, and the asymmetry is on the rear panel.** p.14 names the two
   * outbound ports `MIDI OUT/SYNC A` and `MIDI THRU/SYNC B`, each *"can also be configured to
   * send DIN sync to legacy instruments"*, and p.75's `OUT PORT FUNC` gives `DIN 24` and `DIN 48`.
   * `MIDI IN` is described only as *"MIDI data input"* — there is no SYNC C, and no page describes
   * a DIN sync input. So `receiveTransport` is the two MIDI wires and `transport` carries the
   * third for sending.
   *
   * **`preferredSource` is not claimed (§7.4/#80).** p.86's own framing is peer-to-peer —
   * *"machines or controls other synthesizers: Digitone II gets along with other gear"* — and
   * the architecture charges for the job the way its sibling's does: a MIDI track is a track that
   * has stopped being one of the sixteen audio tracks (p.16). A box built to drive a rig does not
   * take a voice to do it.
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
   * `individualOuts: 0` — p.87 enumerates the sockets (*"2 × 1/4" impedance balanced audio out
   * jacks"*) and p.14 numbers them, and there is no track output among them. p.78's note that
   * *"Audio from the TRACK OUTPUTS is always without any effects"* names a jack neither page
   * carries and is read as boilerplate rather than as evidence of one.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §2.6/#142. p.57's TRIG page: *"LEN — Trig Length sets the length of the note trig."* The unit
   * comes off pp.45-46, which is where the manual says what the values *mean* rather than that
   * the parameter exists: *"A LEN value of 1/16 adds a sixteenth note and advances the sequencer
   * one step. 1/8 adds an eighth note and advances the sequencer two steps… 1/4 adds a quarter
   * note and advances the sequencer four steps."* All three pages are in the citation, because
   * the claim needs both halves and no page carries them together.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'LEN',
    unit: 'note divisions — 1/16 is one step',
  },

  capabilityEvidence: {
    'clock.canSendClock': cite(74),
    'clock.canReceiveClock': cite(74),
    /**
     * **`partly`, because two of the three transports have a page and the third has an
     * inference.** `unknown` would say the reading came back with nothing when it came back with
     * most of it, and a plain citation would claim a page for the half that has none.
     */
    'clock.transport': {
      kind: 'partly',
      cite: cites('p.14, p.75, p.87'),
      proven:
        'p.87 specifies “MIDI In/Out/Thru with DIN Sync out”, p.14 names the two outbound ports SYNC A and SYNC B, and p.75’s OUT PORT FUNC offers DIN 24 and DIN 48',
      open:
        'no page names USB as a clock transport — CLOCK SEND and CLOCK RECEIVE are unqualified (p.74) and the port is chosen by OUTPUT TO / INPUT FROM over “MIDI data” generally (p.75), so USB is read off those two together rather than cited',
    },
    'clock.sourceSetup[midi-din]': cites('p.74, p.75'),
    'clock.sourceSetup[usb]': {
      kind: 'partly',
      cite: cites('p.74, p.75'),
      proven: 'the menu path and both option lists — SYNC > CLOCK SEND, and OUTPUT TO offering USB and MIDI+USB',
      open: 'that MIDI clock is among the “MIDI data” OUTPUT TO routes, which no page states in those words',
    },
    'clock.sourceSetup[din-sync]': cites('p.75, p.82'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the manual gives the box no category noun at all; p.86 frames it as a peer that “gets along with other gear”, and p.16’s sixteen tracks are audio or MIDI, so sequencing something else costs a voice',
    },
    'io.main': cites('p.14, p.87'),
    'io.individualOuts': cites('p.14, p.87'),
    'io.audioIn': cites('p.14, p.87'),
    'io.usbAudio': cites('p.78, p.80'),
    /**
     * See the module note. The sixteen and the poly/mono split are read off two pages; the 4 is
     * authored downward from them because `polyphony` cannot say the sixteen are shared.
     */
    voices: {
      kind: 'partly',
      cite: cites('p.15, p.37, p.47'),
      proven:
        'sixteen tracks that are audio or MIDI (p.16), sixteen audio voices (p.15), “16 voice polyphony” with VOICES locking 1–16 of them to one track (p.47), and PLAY MODE making a preset POLY or MONO (p.37)',
      open:
        'those sixteen voices are one budget every track draws on, and `polyphony` is a per-assignable claim with no way to say so — sixteen members each declaring 16 would promise 256 simultaneous notes, so 4 is authored conservatively rather than cited',
    },
    'features.perStep': cites('pp.48, 50-52, 57-58'),
    'features.lfo': cites('p.63, p.118'),
    'features.sidechain.internal': cite(68),
    'features.sidechain.fromExternalAudio': cite(68),
    /**
     * §2.6/#111. **`cited-against`, the state that carries a page for a no.**
     *
     * The Muse's reading on a different engine: the pages answer, and they answer that there is
     * no audio here for a recipe to load. Which is why not one of the nineteen recipes above
     * carries `sourceAudio`, where all eighteen of the Digitakt II's do.
     */
    content: {
      kind: 'cited-against',
      cite: cites('p.15, p.16, p.89'),
      reason:
        'p.15’s audio-voice architecture runs SYN MACHINE into the filters and the amp with no sample player in it, p.89’s machine list is four synthesis engines plus MIDI, and p.16 defines a preset as “a collection of the synth track settings” — so the factory presets p.22 counts are stored parameter settings rather than audio a recipe could name',
    },
    noteDuration: cites('p.45, p.46, p.57'),
  },

  /** p.87: `Dimensions: W 215 × D 176 × H 63 mm`. 63 mm is how far off the desk it stands. */
  physical: { panelSpanMm: 215, verified: cite(87) },

  panel: DIGITONE_II_PANEL,

  manual: { title: 'Digitone II User Manual', edition: 'OS 1.10' },

  productPage: 'https://www.elektron.se/explore/digitone-ii',

  /**
   * §2.2. One pool of sixteen. See the module note for why `polyphony` is 4 and not 16, and
   * `capabilityEvidence.voices` for the same thing said where the audit can see it.
   *
   * The pool carries every role because a track holds whichever of four engines you assign it
   * (p.89), and between FM DRUM's percussion and FM TONE's tonal work there is no role the box
   * declines on architecture. That is the Digitakt II's argument with machines in place of
   * samples.
   */
  voices: [
    {
      /**
       * **No `triggerNote`** (§2.1/#334), because the field is a sampler's fact and there is no
       * sampler here. It holds a loaded sample's original pitch; every machine on this box is a
       * synthesis engine, which has none. p.42 makes the note the content of a trig (*"NOTE TRIGS
       * trigger preset notes or MIDI notes"*), p.44's NOTE EDIT puts three of them on one step,
       * and p.57 says *"Trig Note sets the pitch of the note when trigged"* — musical content,
       * which §4.1 leaves to the direction. See the head note; the tests are in
       * `test/elektron-digitone-ii.test.ts`.
       */
      /**
       * **`vox-chop` came off this list at #345, and four sentences in this file had already
       * made the argument.** The head note opens by calling this box *"the sibling of
       * `elektron-digitakt-ii` with the sampler taken out"*; the trigger-note section says *"there
       * is no sampler here"*; `capabilityEvidence` records that p.15's audio-voice architecture
       * *"runs SYN MACHINE into the filters and the amp with no sample player in it"*; and p.89's
       * machine list is four synthesis engines plus MIDI.
       *
       * A `vox-chop` is a recording cut into pieces and re-triggered. This box cannot hold a
       * recording, so the role was a promise none of its machines can keep — and #340's placement
       * control was offering it to readers on the strength of that promise. The other twenty-two
       * stay: every one of them is a sound four synthesis engines make.
       */
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 16,
      roles: [
        'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
        'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
        'riser', 'impact', 'sweep',
      ],
      polyphony: 4,
    },
  ],

  /**
   * Ten of sixteen, and openly a judgement — the manual states no crowding threshold and could
   * not. Two separate costs push it below the track count and they are not the same cost: a track
   * spent as a MIDI track is one of the sixteen gone (p.16), and a polyphonic part spends several
   * of the sixteen *voices* (p.47) while occupying one track. The Digitakt II's twelve answers
   * only the first, because on that box a track is always one voice.
   */
  comfortableVoices: 10,

  features: {
    perStep: [...PER_STEP],
    /**
     * Three LFOs per audio track (p.63; two on MIDI tracks), synced by `MULT`, which multiplies
     * `SPD` *"either by multiplying the current tempo (BPM settings), or by multiplying a fixed
     * tempo of 120 BPM"* (p.63). Destinations are APPENDIX D's list (p.118), reduced to the
     * groups it prints — the SYN row is genuinely generic there, given as *"Data entry knob A,
     * page 1–4 (machine dependent)"* rather than by parameter name.
     */
    lfo: {
      count: 3,
      syncable: true,
      destinations: [
        'SYN: data entry knobs A-H, pages 1-4 (machine dependent)',
        'FILTER: Attack, Decay, Sustain, Release, Frequency, Base, Width, Env. Reset',
        'AMP: Attack, Hold, Decay, Sustain, Release, Pan, Volume',
        'FX: Delay Send, Reverb Send, Chorus Send, Bit Reduction, SRR, SRR Routing, Overdrive',
        'LFO: the other LFOs’ Speed, Multiplier, Fade, Waveform, Start Phase, Trig Mode, Depth',
      ],
    },
    /**
     * The master compressor's `SCS` (Sidechain Source) takes both: *"TRK1–16 sets the sidechain
     * source to be the sound sent from one of the separate audio tracks"* and *"IN LR sets the
     * sidechain source to be the sound coming from IN L/R"* (p.68).
     */
    sidechain: { internal: true, fromExternalAudio: true },
  },

  hints: {
    'trig-params': 'Hold a [TRIG] key, turn DATA ENTRY',
    retrig: 'Press [TRIG PARAMETERS] twice',
    machine: 'Hold [FUNC], press [SYN]',
    'voice-setup': 'Press [VOICE SETUP]',
    tempo: 'Press [TEMPO], turn knob D',
  },

  recipes,
}
