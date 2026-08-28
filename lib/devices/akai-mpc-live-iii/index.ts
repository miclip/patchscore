import type { CapabilityEvidence, Device, JackSpec, JackSignalKind, Recipe } from '../../core/device'
import { jackFact } from '../../core/device'
import type { AuthoredParam, Cite, MoodOffset } from '../../core/params'
import { MPC_LIVE_III_PANEL } from './panel'

/**
 * Akai Professional MPC Live III (§2.3). A standalone MPC running MPC 3, and the largest box in
 * this library by a wide margin — 128 tracks of six types, 128 pads across eight banks, a
 * sampler, a mixer with submixes and returns, and eighteen bundled instrument plugins.
 *
 * **The interesting thing about this manual is where its numbers are.** It prints roughly 1,791
 * ranges and almost every one of them is in one chapter: `Appendix > Effects & Parameters`,
 * pp.392-521, laid out as `Parameter | Value Range | Default Value` tables for the built-in
 * effects and the bundled plugins. The chapter a sampler manifest would expect to live in —
 * `Track Edit Mode`, pp.209-274, where a drum pad's tuning, filter, envelope and levels actually
 * are — is written as prose and prints **no numeric range for any of them**. `Cutoff`, `Reso`,
 * `Atk`, `Decay`, `Sust`, `Release`, `Pad Level`, `Pad Pan`, `Pad Tuning` and layer `Fine` are
 * all named and all unbounded (checked pp.209-229, pp.231-275, pp.288-314, pp.330-332,
 * pp.388-391). The screenshot on p.222 shows `CUTOFF 127` and `SUSTAIN 127`, which is a picture
 * of one machine's state and not a printed scale, so nothing here reads a range off it.
 *
 * That single fact shapes the whole manifest, and it is why this box gets **three pools rather
 * than one**.
 *
 * ## Three pools, because the box has three parameter regimes
 *
 * p.44: *"Each sequence you create within a project is made up of tracks. There are six main
 * types of tracks... A single project can hold up to 128 tracks."* Two of those six make sound
 * from samples (Drum, Keygroup), one hosts a plugin instrument, and three route MIDI, CV or
 * audio elsewhere.
 *
 *  - **`pad`** is a drum track's pads. p.47: *"Remember that a drum track has 128 pads total — 16
 *    pads across eight banks."* A pad is a complete independent voice: its own samples over eight
 *    layers (p.213), its own filter and envelopes (pp.221-222), its own mute group and play mode
 *    (p.212), its own four insert effects and eight Drum FX (p.87, p.227). Its recipes are
 *    **enum-dominated**, because that is what the manual prints for it.
 *  - **`mono-track`** and **`poly-track`** are plugin tracks — one instrument each, played
 *    chromatically. Their recipes carry **real cited numbers**, because the plugin appendix
 *    tabulates every one. They are two pools rather than one because their polyphony differs and
 *    the manual prints both; see below.
 *
 * Modelling only the first would throw away every citable value on the box; modelling only the
 * second would throw away the pads, which is what an MPC *is*. The two are not disjoint hardware
 * — sixteen pads live inside one drum track, and that drum track is one of the 128 — and the
 * model cannot show that cost. It is negligible (16 of 128) and it is recorded here rather than
 * hidden, the way the Digitakt II records a MIDI track costing an audio track.
 *
 * ## `count` is a planning horizon on both pools
 *
 * The Deluge manifest states the rule and it applies unchanged: `count` bounds how many
 * assignables the resolver may consider, templates ask for roughly five to fifteen parts, and
 * headroom nobody can reach is pure cost because `expand()` materialises every member. So
 * both plugin pools are **16**, not p.44's 128 — behaviourally identical for every template this
 * is built for, and finite for the search. One horizon rather than two tuned numbers, and it is
 * matched to the pad bank for a second reason worth stating: §10's rack packs a panel's voice
 * banks with one column count for all of them, so three equal banks fill the drawn region and
 * three unequal ones leave it half empty. The horizon is free (this is the Deluge's rule); the
 * pad count is not, and was never moved. `pad` is **16** because that is the hardware number:
 * p.530 gives `(16) velocity- and pressure-sensitive pads` with `(8) banks accessible via Pad
 * Bank buttons`, and sixteen is the bank in front of you.
 *
 * Measured rather than assumed — the figures are in the commit that added this device.
 *
 * ## `polyphony`, and why the plugin tracks are two pools rather than one
 *
 * **This manual never publishes a global voice count.** Every architectural statement ends the
 * same way — *"limited only by the total number of voices available"* (p.211 for pads, p.233 for
 * keygroups) — and no page gives that total, including the specification tables on pp.529-530.
 *
 * What it prints instead is a polyphony *per instrument*, on that instrument's own page, and the
 * three this manifest actually loads do not agree:
 *
 *     TubeSynth    Polyphony: Legato, Retrigger, 2, 3, 4                 p.519
 *     Bassline     no Polyphony parameter; "classic mono synths"         p.428
 *     DrumSynth    nothing at all                                        pp.431, 433
 *
 * So a single plugin-track pool cannot state a true polyphony: 4 would promise four notes from a
 * Bassline and 1 would refuse the chord a TubeSynth really plays. **The pools are split on the
 * one fact that differs** — `mono-track` at 1, `poly-track` at 4. Both advertise every role,
 * because a plugin track hosts whatever is loaded.
 *
 * **DrumSynth's row is a gap, and it is recorded as one.** The plugin is named on exactly three
 * pages — p.5's contents, p.431 and p.433 — and none of them gives a voice count or a Polyphony
 * parameter, where every other bundled instrument checked has one. p.431's *"individual plugins
 * per track"* is about how many drum *types* an instance holds and says nothing about
 * simultaneous notes, so it is not evidence either way and is not used as any. `mono-track`'s 1
 * is therefore **authored, not cited**: it is right for Bassline on p.428's wording, it is the
 * conservative direction for DrumSynth (a percussion part needs one note, so under-claiming
 * costs nothing a guide would notice), and `capabilityEvidence` says so at `voices` rather than
 * letting one citation cover all three pools.
 *
 * **Read the page the recipes use, not a sibling's.** An earlier draft of this manifest put both
 * on one pool at 8, reasoning from a keygroup track's `2-32` (p.234), Electric's `1-16` (p.436)
 * and the Organ's `2-7` (p.492) — three scales that are all real, all printed, and belong to
 * three instruments no recipe here loads. That is `CLAUDE.md`'s cited-wrong-range trap with the
 * citation pointing at the wrong instrument rather than the wrong scale, and it is worth leaving
 * recorded: the check that catches it is asking which page governs *this* recipe.
 *
 * `pad` is `polyphony: 1` for a different reason, and it is not a polyphony limit at all. A drum
 * track triggers pads by fixed note number, so a pad sounds its own sample at its own pitch and
 * nothing in the pattern transposes it; a chord is unreachable however many voices exist.
 *
  * ## The `Sync` switch, six times over
 *
 * `CLAUDE.md` asks that a control with more than one printed scale carry the switch that selects
 * between them, and this manual reflows a rate or a time between an absolute unit and a musical
 * division **eighteen separate times** across the appendix. Four of them are reachable from the
 * recipes below and all four carry their switch as a param:
 *
 *     TubeSynth LFO Rate    Sync Off 0.01-20.00 Hz   Sync On 8/4 - 1/32    p.518
 *     AIR Delay Time        Sync Off 1 ms - 2.00 s   Sync On 1/32 - 8/4    p.392
 *     AIR Lo-Fi Rate        Sync Off 0.01-10.0 Hz    Sync On 8/4 - 16      p.414
 *     Bassline Delay Time   Free 1 ms - 2.00 s       Sync 1/32 - 8/4       p.429
 *
 * The same rule catches a subtler one on p.515: TubeSynth's Osc 1 `Fine` reads
 * `-12.00 - 0.00 - +12.00` under octaves 32'-2' and `-70.00 - 0.00 - +70.00` under `Wide`, so
 * every recipe that tunes an oscillator states its `Octave` first.
 *
 * ## What is not authored, and why
 *
 * **DrumSynth's `Model` and its eight parameter knobs.** p.431 gives both a `Value Range` of
 * `Varies` — the models and the knobs behind them change with the drum type, and no page
 * enumerates either. So these recipes set the drum type, the gain, the velocity response and the
 * four built-in effects, and say nothing about the model. That is the shape of the box, not a
 * gap in the reading.
 *
 * **The drum/keygroup filter `Type` list.** pp.222 and 243 both defer to `Appendix > Glossary >
 * Filter`, and p.389 gives prose categories with a handful of proper names (`Model1`-`Model3`,
 * `Vocal1`-`Vocal3`, `MPC3000 LPF`) rather than the dropdown. The enumerated filter lists that
 * *are* printed (p.473, p.442) belong to plugin instruments and are not this list. No filter-type
 * enum is authored for a pad.
 *
 * **BPM.** No minimum, maximum or resolution is printed anywhere (checked pp.62, 65, 73,
 * 107-110, 374, 384).
 *
 * **AIR Reverb's `Time`.** p.396 prints `0.4 ms - +inf s`. A range needs two finite ends, so the
 * space axis moves `Mix` instead, which is `0-100%` on the same page.
 *
 * ## How an insert effect is named, and why it is not named after the effect
 *
 * A recipe that loads one states the slot and then the slot's controls: `Insert 1` is an enum
 * over the category's printed `Options:` line (p.392 for delay and reverb, p.412 for harmonic),
 * and everything under it is `Insert 1 · <control>` using the control's own printed name.
 *
 * **This is the switch-carries-the-scale rule again, one level up.** `Drive` means `0 - 60 dB` in
 * `AIR Distortion` (p.413) and something else entirely in `Distortion Overdrive` (p.417), so the
 * range is only true once the slot says which of the twenty options is loaded. Addressing the
 * control by its slot also keeps it apart from DrumSynth's *own* `Distortion Drive` on p.432,
 * which is a different control that a recipe may set at the same time.
 *
 * ## Three controls this box prints that are deliberately not authored
 *
 * All three would have been accurate, and each collides with ordinary English that directions
 * were already written in — `air`, `room` and `one`. Invariant 3's check harvests parameter names
 * to make sure no template names a device, and widening its exemption list would have suppressed
 * a failure rather than recorded a fact, so the manifest gave the controls up instead:
 *
 *  - **The `AIR` prefix** on the four insert effects. It now lives in `Insert 1`'s *value*, which
 *    is where it belongs: a reader is told to load `AIR Reverb` by name, from the list the manual
 *    prints. Nothing is lost and the citation got sharper.
 *  - **AIR Reverb's `Room Size`** (p.396). Genuinely given up, and it is the cheapest of the
 *    three: `Insert 1 · Type` picks from sixteen named spaces on the same page — `Booth`, `Small
 *    Chamber`, `Concert Hall` — which tells a reader more about the size of the room than a
 *    percentage does, and `Insert 1 · Mix` carries the space axis.
 *  - **DrumSynth's `One-Shot`** (p.431), which chooses whether the sound plays in full or only
 *    for the note length. Five of the seven recipes that set it were stating its ordinary
 *    behaviour; two disabled it to let a cymbal ring. Removing it made two articulations inert
 *    and both were removed with it — which is a *correctness* gain that this pass turned up:
 *    the pad stab was setting a note length on a pad whose `Sample Play` is `One Shot`, and
 *    p.212 says that plays the entire sample from start to end whatever the note length says.
 */

const MANUAL = 'MPC Live III / MPC XL User Guide v3.7'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

function cites(pages: string): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages}` }
}

// ---------------------------------------------------------------------------
// §3.3 Jacks. p.376 is the Live III's rear panel; the specification's Connections block on
// p.530 counts the same sockets, and the two agree on every one.
// ---------------------------------------------------------------------------

const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack(
  id: string,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): JackSpec {
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
 * Every socket p.376 numbers, minus the three that carry no signal — the Kensington slot, the
 * grounding terminal and the power input. The MIDI DINs are declared **per port**, because the
 * panel prints them as two and two (`MIDI IN 1 / 2`, `MIDI OUT A / B`) and clock leaves by one
 * named port rather than by "MIDI".
 *
 * **Only `MIDI OUT A` and `MIDI IN 1` carry `clock`**, and that is a schema requirement rather
 * than a preference: two jacks claiming the same transport in the same direction leaves the rack
 * choosing, so the first port of each pair is named and the second is declared without it. p.62's
 * `Output Ports` list is what makes the choice real — sync is enabled per port, so a reader picks
 * one.
 *
 * The CV/Gate jacks are four sockets carrying eight signals. p.376: *"Use standard 1/8" (3.5 mm)
 * TS cables to send a single CV/Gate signal per output, or use a stereo TRS-to-dual mono TSF
 * breakout cable... to send two CV/Gate signals per output."* Each is therefore `pitch-cv` and
 * `gate` both, and the note carries the breakout requirement, which a reader cannot see from the
 * panel.
 *
 * **The three USB receptacles are declared as a transport and not as jacks**, which is the
 * Grandmother's and the Tracker Mini's split for the Grandmother's reason: `JackSpec.direction`
 * is one value and a USB receptacle is bidirectional, so naming it `in` or `out` is a coin-flip
 * between two true answers. It is sharper here than on either of those boxes. p.376 has the
 * USB-C port *"send/receive MIDI and audio data to/from your computer"* — both directions in one
 * sentence — and gives the USB-A ports flash drives, *"standard MIDI controllers"* and
 * *"supported class-compliant audio interfaces"*, which is a host port carrying MIDI inward and
 * audio outward at once. `usb` is in `clock.transport` and no cable is drawn to a socket, which
 * is the honest rendering rather than a guessed direction.
 */
const JACKS: JackSpec[] = [
  jack('MAIN L', 'out', ['audio'], 376, { note: 'Outputs 1,2 and Main L/R are the same pair' }),
  jack('MAIN R', 'out', ['audio'], 376),
  jack('OUT 3', 'out', ['audio'], 376),
  jack('OUT 4', 'out', ['audio'], 376),
  jack('OUT 5', 'out', ['audio'], 376),
  jack('OUT 6', 'out', ['audio'], 376),
  jack('PHONES', 'out', ['audio'], 376),
  jack('AUDIO IN 1', 'in', ['audio'], 376, { note: 'Combo XLR or 1/4" TRS; +48V is a screen button, not a switch (p.287)' }),
  jack('AUDIO IN 2', 'in', ['audio'], 376),
  jack('IN L (RCA)', 'in', ['audio'], 376, { note: 'Phono level, for a turntable; ground to the terminal beside it' }),
  jack('IN R (RCA)', 'in', ['audio'], 376),
  jack('MIDI IN 1', 'in', ['midi', 'clock'], 376, { clock: ['midi-din'] }),
  jack('MIDI IN 2', 'in', ['midi'], 376),
  jack('MIDI OUT A', 'out', ['midi', 'clock'], 376, { clock: ['midi-din'] }),
  jack('MIDI OUT B', 'out', ['midi'], 376),
  jack('CV/GATE 1/5', 'out', ['pitch-cv', 'gate'], 376, { note: 'One signal on a TS cable, two on a stereo TRS breakout' }),
  jack('CV/GATE 2/6', 'out', ['pitch-cv', 'gate'], 376),
  jack('CV/GATE 3/7', 'out', ['pitch-cv', 'gate'], 376),
  jack('CV/GATE 4/8', 'out', ['pitch-cv', 'gate'], 376),
]

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/** p.44. Six, and the list is closed there — p.45 offers "the five remaining track types". */
const TRACK_TYPES = ['Audio', 'Drum', 'Keygroup', 'Plugin', 'MIDI', 'CV'] as const
/**
 * The bundled instruments, as `Appendix > Plugins` heads them (pp.428-521). p.428 opens
 * *"Plugins included with your MPC purchase are described below"*, and each name below is a
 * section heading in that chapter rather than a list printed on one page — which is why the
 * citation names the span.
 */
const PLUGINS = [
  'Bassline', 'DrumSynth', 'Electric', 'Fabric XL', 'Fabric', 'Fabric Select',
  'Fabric Electric Piano', 'Fabric Piano', 'Hype', 'Mellotron', 'Odyssey', 'OPx-4', 'Organ',
  'Solina', 'Stage EP', 'Stage Piano', 'Studio Strings', 'TubeSynth',
] as const
/** p.431: *"You can add the following drum types as individual plugins per track."* */
const DRUM_TYPES = ['Clap', 'Crash', 'HiHat', 'Kick', 'Perc', 'Ride', 'Snare', 'Tom'] as const
/**
 * p.392 and p.412, the `Options:` lines that open two of the six effect categories. A recipe
 * loading an insert names the entry it wants from one of these rather than encoding it in a
 * parameter label, because *which* effect is loaded is what decides whose value table is in
 * force — `AIR Distortion`'s `Drive` is `0 - 60 dB` (p.413) and `Distortion Overdrive`'s is a
 * different control on a different page.
 */
const DELAY_REVERB_FX = [
  'AIR Delay', 'AIR Diff Delay', 'AIR Multitap Delay', 'AIR Non-Lin Reverb', 'AIR Reverb Pro',
  'AIR Reverb', 'AIR Spring Reverb', 'Delay Analog Sync', 'Delay Analog', 'Delay HP', 'Delay LP',
  'Delay Mono Sync', 'Delay Mono', 'Delay Multi-Tap', 'Delay Ping Pong', 'Delay Stereo',
  'Delay Sync (Stereo)', 'Delay Tape Sync', 'Reverb In Gate', 'Reverb Large 2', 'Reverb Large',
  'Reverb Medium', 'Reverb Out Gate', 'Reverb Small', 'Sample Delay',
] as const
const HARMONIC_FX = [
  'AIR Amp Sim', 'AIR Diode Clip', 'AIR Distortion', 'AIR Flavor', 'AIR Freq Shift', 'AIR Lo-Fi',
  'AIR Talk Box', 'AIR Tube Drive', 'AIR Utility', 'Decimator', 'Distortion Amp',
  'Distortion Custom', 'Distortion Fuzz', 'Distortion Grimey', 'Distortion Overdrive',
  'Frequency Shifter', 'Granulator', 'Resampler', 'TouchFX', 'XYFX',
] as const
/** p.212, drum pad Global tab. How much of the sample is played. */
const SAMPLE_PLAY = ['One Shot', 'Note Off', 'Note On'] as const
/** p.212, with the manual's own on-screen abbreviations in brackets. */
const LAYER_PLAY = ['Cycle (Cyc)', 'Velocity (Vel)', 'Random (Ran)', 'Crossfade'] as const
/** p.212. A number 2-32 is also selectable; the two named modes are what these recipes use. */
const PAD_POLY = ['Mono', 'Poly'] as const
/** p.227. Up to eight of these per pad in a drum track; their knob ranges are not printed. */
const DRUM_FX = [
  'Ring Mod', 'Bit Crush', 'Decimator', 'Tube Drive', 'Soft Clipper', 'Hard Clipper', 'Low Pass',
  'Gain', 'High Pass', 'Rectifier', 'Bass Enhancer (Tight)', 'Bass Enhancer (Medium)',
  'Bass Enhancer (Wide)', 'Wave Folder',
] as const
/** p.428, Bassline oscillator. */
const BASSLINE_WAVE = ['Saw Octave', 'Saw', 'Square', 'Sine'] as const
/** p.429, Bassline global. */
const DRIVE_TYPE = ['Overdrive', 'Clip'] as const
/** p.515. `Wide` is the setting that swaps `Fine`'s scale for the wider one — see the head note. */
const TS_OCTAVE_1 = ['Wide', "32'", "16'", "8'", "4'", "2'"] as const
/** p.515. Oscillator 2 goes down to LFO speed where oscillator 1 goes to `Wide`. */
const TS_OCTAVE_2 = ['LFO', "32'", "16'", "8'", "4'", "2'"] as const
/** p.515, Oscillator 1 and the Sub Oscillator. Oscillator 2 swaps Triangle for Noise. */
const TS_SHAPE_1 = ['Triangle', 'Saw', 'Square', 'Pulse'] as const
const TS_SHAPE_2 = ['Noise', 'Saw', 'Square', 'Pulse'] as const
/** p.518. The manual's own spelling, full stop after `Square` included. */
const TS_LFO_SHAPE = ['Sine', 'Square', 'Saw Up', 'Saw Down', 'Pump', 'S&H', 'Drift'] as const
/** p.518, LFO 1 only. LFO 2 has a different and longer destination list on the same page. */
const TS_LFO1_DEST = ['Off', 'Pitch', 'Filter', 'Level', 'Pan'] as const
/** p.396, AIR Reverb early-reflection type. */
const REVERB_TYPE = [
  'Off', 'Booth', 'Club', 'Room', 'Small Chamber', 'Medium Chamber', 'Large Chamber',
  'Small Studio', 'Large Studio', 'Scoring Stage', 'Philharmonic', 'Concert Hall', 'Church',
  'Opera House', 'Vintage 1', 'Vintage 2',
] as const
/** p.413, AIR Distortion. */
const DIST_MODE = ['Hard', 'Soft', 'Wrap'] as const
/** Used for every printed `Off, On` / `On, Off` switch; the page is cited per use. */
const OFF_ON = ['Off', 'On'] as const

/**
 * §2.3's per-step vocabulary — the per-event lanes this manual documents for the sequencer.
 *
 * `velocity` is the step sequencer's own (p.192: *"Each pad corresponds to a step in the bar and
 * will light with a color corresponding to its velocity"*, adjusted by tapping the velocity bar
 * or turning a Q-Link). `note-length` is p.196's gesture — *"press and hold the Step Button with
 * the desired note event, and then press another Step Button to set the note length"* — and the
 * value behind it is List Edit's `Length` (p.205). `probability` is List Edit's `Prob` column,
 * *"the probability percentage of the event"* (p.205).
 *
 * **`automation` is declared and no recipe reaches it.** Step Automation is a real per-step lane
 * (p.194), and it is a *curve over an arbitrary parameter*, not a scalar: an `ArticulationEntry`
 * gives one number to every hit in a slot, which is the one thing automation is not for. It is
 * declared because the box has it and withheld from every recipe because the model cannot carry
 * it — the Digitakt II's split, on a different lane.
 */
const PER_STEP = ['velocity', 'note-length', 'probability', 'automation'] as const

/** The subset `articulation` may use. Exported so the test asserts the boundary, not restates it. */
export const ARTICULABLE_PER_STEP = ['velocity', 'note-length', 'probability'] as const

// ---------------------------------------------------------------------------
// Param helpers (§3.1, §3.2)
// ---------------------------------------------------------------------------

/** An enum whose option set is cited and whose selection is taste (§3.2). */
function pick(
  name: string,
  value: string,
  values: readonly string[],
  page: number | string,
  note?: string,
): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: {
      values: [...values],
      verified: typeof page === 'number' ? cite(page) : cites(page),
    },
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
  extra: { unit?: string; mood?: MoodOffset[]; note?: string; step?: number } = {},
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

// The three that establish which parameter tables are in force (see the head note).
const trackType = (t: (typeof TRACK_TYPES)[number]) => pick('Track Type', t, TRACK_TYPES, 44)
const plugin = (p: (typeof PLUGINS)[number]) => pick('Plugin', p, PLUGINS, 'pp.428-521')
const drumType = (t: (typeof DRUM_TYPES)[number]) =>
  pick('Drum Type', t, DRUM_TYPES, 431, 'One DrumSynth instrument per plugin track')

/** DrumSynth's Drum Sound tab (p.431). `Model` and the eight knobs print `Varies` and are absent. */
const dsVelocity = (v: number) => num('Velocity', v, { min: 0, max: 100 }, 431, { unit: '%' })
const dsGain = (v: number) =>
  num('Gain', v, { min: -68, max: 12 }, 431, {
    unit: 'dB',
    note: 'p.431 prints "-Inf, -68.0 – 0 – +12.0 dB"; -Inf is a setting below the range, not part of it',
  })

/** DrumSynth's Trans/Dist tab (p.432). */
const dsTransAttack = (v: number, mood?: MoodOffset[]) =>
  num('Transient Attack', v, { min: -100, max: 100 }, 432, { unit: '%', ...(mood ? { mood } : {}) })
const dsTransSustain = (v: number, mood?: MoodOffset[]) =>
  num('Transient Sustain', v, { min: -100, max: 100 }, 432, { unit: '%', ...(mood ? { mood } : {}) })
const dsDistDrive = (v: number, mood?: MoodOffset[]) =>
  num('Distortion Drive', v, { min: 0, max: 60 }, 432, { unit: 'dB', ...(mood ? { mood } : {}) })
const dsDistMix = (v: number) => num('Distortion Mix', v, { min: 0, max: 100 }, 432, { unit: '%' })
const dsDistHighCut = (v: number, mood?: MoodOffset[]) =>
  num('Distortion High Cut', v, { min: 1000, max: 20000 }, 432, {
    unit: 'Hz',
    note: 'p.432 prints the range as 1.00 - 20.0 kHz',
    ...(mood ? { mood } : {}),
  })

/** DrumSynth's EQ/Comp tab (p.432). */
const dsLowFreq = (v: number) => num('EQ Low Freq', v, { min: 20, max: 1000 }, 432, { unit: 'Hz' })
const dsLowGain = (v: number, mood?: MoodOffset[]) =>
  num('EQ Low Gain', v, { min: -12, max: 12 }, 432, {
    unit: 'dB',
    note: 'A `Cut` setting sits below the numeric range on the same page',
    ...(mood ? { mood } : {}),
  })
const dsHighFreq = (v: number) =>
  num('EQ High Freq', v, { min: 1200, max: 20000 }, 432, {
    unit: 'Hz',
    note: 'p.432 prints the range as 1.20 - 20.0 kHz',
  })
const dsHighGain = (v: number, mood?: MoodOffset[]) =>
  num('EQ High Gain', v, { min: -12, max: 12 }, 432, { unit: 'dB', ...(mood ? { mood } : {}) })
const dsRatio = (v: number) =>
  num('Comp Ratio', v, { min: 1, max: 100 }, 432, {
    note: 'p.432 prints the range as 1.0:1 - 100.0:1; this is the left-hand number',
  })
const dsCompAttack = (v: number) =>
  num('Comp Attack', v, { min: 0.1, max: 300 }, 432, {
    unit: 'ms',
    note: 'p.432 prints the low end as 100 us',
  })
const dsCompThreshold = (v: number) =>
  num('Comp Threshold', v, { min: -60, max: 0 }, 432, { unit: 'dB' })

/** Bassline's Osc / Filter / Envelope tab (p.428). */
const blWave = (v: (typeof BASSLINE_WAVE)[number]) => pick('Waveform', v, BASSLINE_WAVE, 428)
const blSub = (v: number) => num('Sub-Octave', v, { min: 0, max: 100 }, 428, { unit: '%' })
const blFifth = (v: number) => num('Fifth', v, { min: 0, max: 100 }, 428, { unit: '%' })
const blCutoff = (v: number, mood?: MoodOffset[]) =>
  num('LP Cutoff', v, { min: 20, max: 20000 }, 428, { unit: 'Hz', ...(mood ? { mood } : {}) })
const blHpCutoff = (v: number) => num('HP Cutoff', v, { min: 10, max: 500 }, 428, { unit: 'Hz' })
const blReso = (v: number, mood?: MoodOffset[]) =>
  num('Reso', v, { min: 0, max: 100 }, 428, { unit: '%', ...(mood ? { mood } : {}) })
const blFilterEnv = (v: number) => num('Filter Env', v, { min: -100, max: 100 }, 428, { unit: '%' })
const blAmpDecay = (v: number, mood?: MoodOffset[]) =>
  num('Amp Decay', v, { min: 0, max: 100 }, 428, { unit: '%', ...(mood ? { mood } : {}) })
const blFilterDecay = (v: number) => num('Filter Decay', v, { min: 0, max: 100 }, 428, { unit: '%' })
const blGlide = (v: number) =>
  num('Glide Time', v, { min: 10, max: 2000 }, 428, {
    unit: 'ms',
    note: 'p.428 prints the range as 10.0 ms – 2.00 s',
  })
/** Bassline's Velocity / Global / Chorus tab (p.429). */
const blDriveType = (v: (typeof DRIVE_TYPE)[number]) => pick('Drive Type', v, DRIVE_TYPE, 429)
const blDriveAmount = (v: number, mood?: MoodOffset[]) =>
  num('Drive Amount', v, { min: 0, max: 100 }, 429, { unit: '%', ...(mood ? { mood } : {}) })
const blFilterControl = (v: number) =>
  num('Filter Control', v, { min: 0, max: 100 }, 429, {
    unit: '%',
    note: 'How far velocity opens the filter',
  })

/**
 * TubeSynth's Oscillator tab (p.515). **`Fine` is never authored without `Octave` beside it**:
 * p.515 prints two scales for it, `-70.00 – 0.00 – +70.00` under `Wide` and
 * `-12.00 – 0.00 – +12.00` under 32'-2', and the range below is the second one.
 */
const tsOctave1 = (v: (typeof TS_OCTAVE_1)[number]) => pick('Osc 1 Octave', v, TS_OCTAVE_1, 515)
const tsOctave2 = (v: (typeof TS_OCTAVE_2)[number]) => pick('Osc 2 Octave', v, TS_OCTAVE_2, 515)
const tsFine1 = (v: number) =>
  num('Osc 1 Fine', v, { min: -12, max: 12 }, 515, {
    unit: 'st',
    note: "This is the 32'-2' scale; under Osc 1 Octave `Wide` the same field reads -70.00 to +70.00",
  })
const tsShape1 = (v: (typeof TS_SHAPE_1)[number]) => pick('Osc 1 Shape', v, TS_SHAPE_1, 515)
const tsShape2 = (v: (typeof TS_SHAPE_2)[number]) => pick('Osc 2 Shape', v, TS_SHAPE_2, 515)
const tsSubShape = (v: (typeof TS_SHAPE_1)[number]) => pick('Sub Osc Shape', v, TS_SHAPE_1, 515)
const tsQuad = (v: (typeof OFF_ON)[number]) => pick('Quad', v, OFF_ON, 515)
const tsDetune = (v: number) => num('Detune', v, { min: 0, max: 100 }, 515, { unit: '%' })
const tsMicroDetune = (v: number) => num('Micro Detune', v, { min: 0, max: 100 }, 515, { unit: '%' })
/** TubeSynth's Mixer / Filter tab (p.516). */
const tsLevel = (which: 'Osc 1' | 'Osc 2' | 'Sub Osc' | 'Ring Mod', v: number) =>
  num(`${which} Level`, v, { min: 0, max: 100 }, 516, { unit: '%' })
const tsDrive = (v: number, mood?: MoodOffset[]) =>
  num('Mixer Drive', v, { min: 0, max: 100 }, 516, { unit: '%', ...(mood ? { mood } : {}) })
const tsCutoff = (v: number, mood?: MoodOffset[]) =>
  num('LP Cutoff', v, { min: 0, max: 100 }, 516, { unit: '%', ...(mood ? { mood } : {}) })
const tsReso = (v: number, mood?: MoodOffset[]) =>
  num('LP Reso', v, { min: 0, max: 100 }, 516, { unit: '%', ...(mood ? { mood } : {}) })
const tsSlope = (v: number) =>
  num('LP Slope', v, { min: 0, max: 24 }, 516, {
    note: 'p.516 prints the range as 0 - 24 dB/oct',
  })
const tsFilterEnv = (v: number) => num('LP Env', v, { min: -100, max: 100 }, 516, { unit: '%' })
const tsKeytrack = (v: number) => num('LP Keytrack', v, { min: 0, max: 100 }, 516, { unit: '%' })
/**
 * TubeSynth's Envelope tab (p.517). Attack, Decay and Release all print `1.00 ms – 100 s`; the
 * range below is that span in milliseconds, which is the unit the low end is printed in.
 */
const tsEnv = (
  stage: 'Amp Attack' | 'Amp Decay' | 'Amp Release' | 'Filter Attack' | 'Filter Decay' | 'Filter Release',
  v: number,
  mood?: MoodOffset[],
) =>
  num(stage, v, { min: 1, max: 100000 }, 517, {
    unit: 'ms',
    note: 'p.517 prints the range as 1.00 ms – 100 s',
    ...(mood ? { mood } : {}),
  })
const tsSustain = (which: 'Amp Sustain' | 'Filter Sustain', v: number, mood?: MoodOffset[]) =>
  num(which, v, { min: 0, max: 100 }, 517, { unit: '%', ...(mood ? { mood } : {}) })
/** TubeSynth's LFO tab (p.518). `Rate` carries `Sync`, which is what chooses its scale. */
const tsLfoShape = (v: (typeof TS_LFO_SHAPE)[number]) => pick('LFO 1 Shape', v, TS_LFO_SHAPE, 518)
const tsLfoDest = (v: (typeof TS_LFO1_DEST)[number]) => pick('LFO 1 Destination', v, TS_LFO1_DEST, 518)
const tsLfoSync = (v: (typeof OFF_ON)[number]) => pick('LFO 1 Sync', v, OFF_ON, 518)
const tsLfoRate = (v: number) =>
  num('LFO 1 Rate', v, { min: 0.01, max: 20 }, 518, {
    unit: 'Hz',
    note: 'This is the Sync Off scale; with LFO 1 Sync On the same field reads 8/4 to 1/32',
  })
const tsLfoDepth = (v: number, mood?: MoodOffset[]) =>
  num('LFO 1 Depth', v, { min: 0, max: 100 }, 518, { unit: '%', ...(mood ? { mood } : {}) })

// ---------------------------------------------------------------------------
// Drum-track pad helpers. Almost everything here is an enum, because almost everything the
// manual prints for a pad is one — see the head note.
// ---------------------------------------------------------------------------

const samplePlay = (v: (typeof SAMPLE_PLAY)[number]) => pick('Sample Play', v, SAMPLE_PLAY, 212)
const layerPlay = (v: (typeof LAYER_PLAY)[number]) => pick('Layer Play', v, LAYER_PLAY, 212)
const padPoly = (v: (typeof PAD_POLY)[number]) =>
  pick('Pad Polyphony', v, PAD_POLY, 212, 'A specific number 2-32 is also selectable')
const muteGroup = (v: number) =>
  num('Mute Group', v, { min: 1, max: 32 }, 212, {
    step: 1,
    note: 'p.212: one of the 32 available groups; a mute group affects pads within this track only',
  })
const globalSemi = (v: number) =>
  num('Global Semi', v, { min: -36, max: 36 }, 211, { unit: 'st', step: 1 })
const globalFine = (v: number) =>
  num('Global Fine', v, { min: -99, max: 99 }, 211, { unit: 'c', step: 1 })
const layerSemi = (v: number) =>
  num('Semi', v, { min: -36, max: 36 }, 217, {
    unit: 'st',
    step: 1,
    note: 'Per layer, and it changes the sample length unless Warp is on',
  })
const velStart = (v: number) => num('Vel Start', v, { min: 0, max: 127 }, 219, { step: 1 })
const velEnd = (v: number) => num('Vel End', v, { min: 0, max: 127 }, 219, { step: 1 })
const drumFx = (slot: number, v: (typeof DRUM_FX)[number]) =>
  pick(`Drum FX ${slot}`, v, DRUM_FX, 227, 'Up to eight per pad; the manual prints no knob ranges')
const artSpeed = (v: number) => num('Articulation Speed', v, { min: 25, max: 400 }, 227, { unit: '%' })
const artDynamics = (v: number, mood?: MoodOffset[]) =>
  num('Articulation Dynamics', v, { min: 0, max: 200 }, 227, { unit: '%', ...(mood ? { mood } : {}) })
const artStereo = (v: number, mood?: MoodOffset[]) =>
  num('Articulation Stereo', v, { min: 0, max: 100 }, 227, { unit: '%', ...(mood ? { mood } : {}) })

// ---------------------------------------------------------------------------
// Insert effects (§ p.87: four slots per pad, keygroup, track, submix or output).
// ---------------------------------------------------------------------------

/**
 * An insert slot, and then that slot's own controls. §3.3's `Insert 1` names an entry from the
 * category list above; every parameter under it is printed inside that effect's table and is
 * addressed by the slot rather than by the effect, so it cannot be confused with a same-named
 * control elsewhere in the same recipe — DrumSynth's own `Distortion Drive` on p.432 is a
 * different control from the `AIR Distortion` in an insert slot, and both may be reached.
 */
const insertFx = (v: string, values: readonly string[], page: number) =>
  pick('Insert 1', v, values, page, 'p.87: each pad, keygroup, track, submix or output takes four')
const delayReverbFx = (v: (typeof DELAY_REVERB_FX)[number]) => insertFx(v, DELAY_REVERB_FX, 392)
const harmonicFx = (v: (typeof HARMONIC_FX)[number]) => insertFx(v, HARMONIC_FX, 412)

/** AIR Reverb (p.396). Its `Time` prints `0.4 ms - +inf s`, so it is not authored. */
const reverbType = (v: (typeof REVERB_TYPE)[number]) => pick('Insert 1 · Type', v, REVERB_TYPE, 396)
const reverbMix = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Mix', v, { min: 0, max: 100 }, 396, { unit: '%', ...(mood ? { mood } : {}) })
const reverbPreDelay = (v: number) =>
  num('Insert 1 · Pre-Delay', v, { min: 0, max: 250 }, 396, { unit: 'ms' })
/** AIR Distortion (p.413). */
const distMode = (v: (typeof DIST_MODE)[number]) => pick('Insert 1 · Mode', v, DIST_MODE, 413)
const distDrive = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Drive', v, { min: 0, max: 60 }, 413, { unit: 'dB', ...(mood ? { mood } : {}) })
const distMix = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Mix', v, { min: 0, max: 100 }, 413, { unit: '%', ...(mood ? { mood } : {}) })
/** AIR Lo-Fi (p.414). */
const loFiBits = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Bit Depth', v, { min: 1, max: 16 }, 414, { unit: 'Bits', ...(mood ? { mood } : {}) })
const loFiRate = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Sample Rate', v, { min: 500, max: 50000 }, 414, { unit: 'Hz', ...(mood ? { mood } : {}) })
/** AIR Delay (p.392). `Time` is not authored; `Sync` is, because it is what chooses Time's scale. */
const delaySync = (v: (typeof OFF_ON)[number]) => pick('Insert 1 · Sync', v, OFF_ON, 392)
const delayFeedback = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Feedback', v, { min: 0, max: 100 }, 392, { unit: '%', ...(mood ? { mood } : {}) })
const delayMix = (v: number, mood?: MoodOffset[]) =>
  num('Insert 1 · Mix', v, { min: 0, max: 100 }, 392, { unit: '%', ...(mood ? { mood } : {}) })

/**
 * §3.1/#107. Timing Correct's `Swing`, p.75: *"set the amount of swing from 50% to 75%"*. It is
 * left per-part rather than hoisted: TC is applied to a selection or a track (p.74 lists six
 * places to open it, four of them track- or mode-scoped), so two parts on this box can genuinely
 * carry two settings — the MC-101's argument, on a much bigger box.
 */
const swing = (v: number) =>
  num('TC Swing', v, { min: 50, max: 75 }, 75, {
    unit: '%',
    mood: [{ axis: 'swing', amount: 14 }],
  })

/** A slot-wide articulation. Only keys in `ARTICULABLE_PER_STEP` may appear here. */
function art(
  slot: NonNullable<Recipe['articulation']>[number]['slot'],
  set: Record<string, number | string | boolean>,
  hint?: string,
): NonNullable<Recipe['articulation']>[number] {
  return { slot, set, ...(hint === undefined ? {} : { hint }) }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

/**
 * Twenty. Thirteen are plugin tracks with cited numbers; seven are drum-track pads, where the
 * manual prints enumerations and no ranges, so they read as a chain of mode choices in the
 * Digitakt II's manner. A `pad` recipe and a `track` recipe for the same part are two genuinely
 * different pieces of sound design on this box rather than one written twice, which is why both
 * regimes are authored at all.
 *
 * **Four were cut against a measurable rule rather than taste: a recipe whose character is never
 * requested for its role by any shipped direction.** Role coverage is explicitly not a target
 * (§3), and these four could not be selected as authored:
 *
 *     mpc-acid-dirty    `acid` is requested by no direction at all
 *     mpc-sweep-dark    `sweep` is only ever asked `soft`
 *     mpc-tom-soft      `tom` is only ever asked `bright` or `dark`
 *     mpc-stab-dirty    `stab` is only ever asked `hard` or `clean`
 *
 * The last is the one worth a sentence, because it was a `sampled-chord` and it is the Deluge's
 * argument arriving on a box that has it both ways. §7.1 ranks `polyphonic-voice` ahead of
 * `sampled-chord` for any multi-note part, and `mpc-stab-hard` on the `track` pool *is* a real
 * four-voice chord (p.519) — so the pad twin lost every comparison it could be in, on the same
 * device.
 * A sampled chord earns its place on a box that cannot sound three notes anywhere; this one can.
 *
 * **Two recipes fail the same rule and are kept, which is the rule being applied rather than
 * obeyed.** `mpc-snare-hard` is asked `clean`, and it stays because it is the only snare on a box
 * that plainly makes one; `mpc-vox-chop-bright` is asked `dirty`, and it stays because it carries
 * the only cited preparation procedure in the manifest (Chop Mode, p.304). §3.5's fallback means
 * an approximate character is still a usable answer; a role nothing asks for is not.
 */
const recipes: Recipe[] = [
  // --- DrumSynth on plugin tracks: percussion with real printed ranges ---------------------
  {
    id: 'mpc-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'mono-track',
    title: 'DrumSynth Kick, transient forward and the low band lifted',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('Kick'),
      dsVelocity(30), dsGain(-2),
      dsTransAttack(45, [{ axis: 'density', amount: -25 }]),
      dsDistDrive(6, [{ axis: 'grit', amount: 18 }]), dsDistMix(25),
      dsLowFreq(58), dsLowGain(3.5, [{ axis: 'darkness', amount: 3 }]),
      dsHighGain(-1.5, [{ axis: 'darkness', amount: -6 }]),
      dsRatio(4), dsCompAttack(8), dsCompThreshold(-14),
    ],
    articulation: [art('downbeat', { velocity: 120 }, 'step-velocity')],
  },
  {
    id: 'mpc-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'mono-track',
    title: 'DrumSynth Snare compressed flat, high band left open',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('Snare'),
      dsVelocity(45), dsGain(-3),
      dsTransAttack(30), dsTransSustain(-20, [{ axis: 'density', amount: -30 }]),
      dsDistDrive(4, [{ axis: 'grit', amount: 20 }]), dsDistMix(20),
      dsHighFreq(6000), dsHighGain(2.5, [{ axis: 'darkness', amount: -7 }]),
      dsRatio(6), dsCompAttack(3), dsCompThreshold(-18),
    ],
    articulation: [art('backbeat', { velocity: 124 }, 'step-velocity')],
  },
  {
    id: 'mpc-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'mono-track',
    title: 'DrumSynth Clap spread wide, sustain trimmed off the tail',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('Clap'),
      dsVelocity(55), dsGain(-5),
      dsTransSustain(-35, [{ axis: 'density', amount: -25 }]),
      dsHighFreq(8000), dsHighGain(4, [{ axis: 'darkness', amount: -8 }]),
      dsDistHighCut(18000, [{ axis: 'darkness', amount: -9000 }]),
      delayReverbFx('AIR Reverb'), reverbType('Small Chamber'), reverbMix(14, [{ axis: 'space', amount: 24 }]),
    ],
    articulation: [art('backbeat', { velocity: 112 }, 'step-velocity')],
  },
  {
    id: 'mpc-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'mono-track',
    title: 'DrumSynth HiHat, closed and dry, nothing on it',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('HiHat'),
      dsVelocity(65), dsGain(-9),
      dsTransSustain(-55, [{ axis: 'density', amount: -20 }]),
      dsHighFreq(11000), dsHighGain(1.5, [{ axis: 'darkness', amount: -6 }]),
      swing(54),
    ],
    articulation: [
      art('offbeat', { velocity: 88 }, 'step-velocity'),
      art('ghost', { velocity: 46, probability: 60 }, 'event-probability'),
    ],
  },
  {
    id: 'mpc-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'mono-track',
    title: 'DrumSynth HiHat let ring, high cut wide open',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('HiHat'),
      dsVelocity(60), dsGain(-8),
      dsTransSustain(25, [{ axis: 'density', amount: -30 }]),
      dsDistHighCut(20000, [{ axis: 'darkness', amount: -10000 }]),
      dsHighFreq(12000), dsHighGain(3),
    ],
    articulation: [art('offbeat', { velocity: 104 }, 'step-velocity')],
  },
  {
    id: 'mpc-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'mono-track',
    title: 'DrumSynth Ride, ping intact, a small room behind it',
    verified: false,
    params: [
      trackType('Plugin'), plugin('DrumSynth'), drumType('Ride'),
      dsVelocity(70), dsGain(-11),
      dsTransAttack(20), dsHighFreq(9000), dsHighGain(2.5, [{ axis: 'darkness', amount: -7 }]),
      delayReverbFx('AIR Reverb'), reverbType('Room'), reverbMix(12, [{ axis: 'space', amount: 20 }]),
    ],
    articulation: [art('offbeat', { velocity: 96 }, 'step-velocity')],
  },
  // --- Bassline on plugin tracks: the low end -----------------------------------------------
  {
    id: 'mpc-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'mono-track',
    title: 'Bassline sine with the sub-octave under it, filter almost shut',
    verified: false,
    params: [
      trackType('Plugin'), plugin('Bassline'),
      blWave('Sine'), blSub(70), blFifth(0),
      blCutoff(220, [{ axis: 'darkness', amount: -110 }]),
      blHpCutoff(10), blReso(8), blFilterEnv(0),
      blAmpDecay(72, [{ axis: 'density', amount: -22 }]), blFilterDecay(40),
      blGlide(35),
    ],
    articulation: [art('downbeat', { 'note-length': 240 }, 'step-note-length')],
  },
  {
    id: 'mpc-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'mono-track',
    title: 'Bassline saw through the overdrive, filter env doing the work',
    verified: false,
    params: [
      trackType('Plugin'), plugin('Bassline'),
      blWave('Saw'), blSub(35), blFifth(12),
      blCutoff(620, [{ axis: 'darkness', amount: -260 }]),
      blReso(38), blFilterEnv(55),
      blAmpDecay(46, [{ axis: 'density', amount: -18 }]), blFilterDecay(34),
      blDriveType('Overdrive'), blDriveAmount(44, [{ axis: 'grit', amount: 30 }]),
      blFilterControl(35),
    ],
    articulation: [art('downbeat', { velocity: 112, 'note-length': 88 }, 'step-note-length')],
  },
  // --- TubeSynth on plugin tracks: everything tonal -----------------------------------------
  {
    id: 'mpc-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'poly-track',
    title: 'TubeSynth pad, quad-detuned, slow in and slow out',
    verified: false,
    params: [
      trackType('Plugin'), plugin('TubeSynth'),
      tsOctave1("8'"), tsFine1(0), tsShape1('Triangle'), tsQuad('On'), tsDetune(28),
      tsOctave2("16'"), tsShape2('Saw'), tsMicroDetune(18), tsSubShape('Triangle'),
      tsLevel('Osc 1', 70), tsLevel('Osc 2', 45), tsLevel('Sub Osc', 30),
      tsCutoff(52, [{ axis: 'darkness', amount: -22 }]), tsReso(14), tsSlope(24),
      tsFilterEnv(20), tsKeytrack(30),
      tsEnv('Amp Attack', 900, [{ axis: 'density', amount: -400 }]),
      tsEnv('Amp Decay', 2400), tsSustain('Amp Sustain', 78),
      tsEnv('Amp Release', 3200),
      delayReverbFx('AIR Reverb'), reverbType('Concert Hall'), reverbPreDelay(35), reverbMix(34, [{ axis: 'space', amount: 30 }]),
    ],
  },
  {
    id: 'mpc-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'poly-track',
    title: 'TubeSynth lead, oscillators hard-synced feel, filter high and keytracked',
    verified: false,
    params: [
      trackType('Plugin'), plugin('TubeSynth'),
      tsOctave1("4'"), tsFine1(0), tsShape1('Pulse'), tsQuad('Off'),
      tsOctave2("8'"), tsShape2('Saw'), tsMicroDetune(9),
      tsLevel('Osc 1', 85), tsLevel('Osc 2', 55), tsLevel('Ring Mod', 10),
      tsCutoff(78, [{ axis: 'darkness', amount: -30 }]),
      tsReso(34, [{ axis: 'grit', amount: 10 }]), tsSlope(12), tsKeytrack(65),
      tsEnv('Amp Attack', 6), tsEnv('Amp Decay', 700),
      tsSustain('Amp Sustain', 62, [{ axis: 'density', amount: -20 }]),
      tsEnv('Amp Release', 300),
      tsDrive(22, [{ axis: 'grit', amount: 28 }]),
    ],
    articulation: [art('accent', { velocity: 122 }, 'step-velocity')],
  },
  {
    id: 'mpc-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'poly-track',
    title: 'TubeSynth stab, filter envelope snapped shut behind the amp',
    verified: false,
    /**
     * §12.4. No `sampled-chord` here and none is needed: p.519 gives TubeSynth a `Polyphony` of
     * up to 4, so a triad is a real triad on this track. That is also the whole reason this
     * recipe sits on `poly-track` and not beside the Bassline parts — see the head note.
     */
    params: [
      trackType('Plugin'), plugin('TubeSynth'),
      tsOctave1("8'"), tsFine1(0), tsShape1('Saw'), tsQuad('Off'),
      tsOctave2("8'"), tsShape2('Square'), tsMicroDetune(22),
      tsLevel('Osc 1', 80), tsLevel('Osc 2', 70),
      tsCutoff(58, [{ axis: 'darkness', amount: -26 }]), tsReso(28), tsSlope(24),
      tsFilterEnv(70),
      tsEnv('Filter Attack', 2), tsEnv('Filter Decay', 180), tsSustain('Filter Sustain', 10),
      tsEnv('Amp Attack', 2), tsEnv('Amp Decay', 260),
      tsSustain('Amp Sustain', 0, [{ axis: 'density', amount: 30 }]),
      tsEnv('Amp Release', 180),
    ],
    articulation: [art('accent', { velocity: 120, 'note-length': 48 }, 'step-note-length')],
  },
  {
    id: 'mpc-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'poly-track',
    title: 'TubeSynth arp, short and even, delay synced to the grid',
    verified: false,
    params: [
      trackType('Plugin'), plugin('TubeSynth'),
      tsOctave1("8'"), tsFine1(0), tsShape1('Square'), tsQuad('Off'),
      tsOctave2("4'"), tsShape2('Square'), tsMicroDetune(4),
      tsLevel('Osc 1', 75), tsLevel('Osc 2', 40),
      tsCutoff(66, [{ axis: 'darkness', amount: -24 }]), tsReso(12), tsSlope(12), tsKeytrack(45),
      tsEnv('Amp Attack', 1), tsEnv('Amp Decay', 140), tsSustain('Amp Sustain', 0),
      tsEnv('Amp Release', 90),
      delayReverbFx('AIR Delay'), delaySync('On'),
      delayFeedback(32, [{ axis: 'space', amount: 18 }]),
      delayMix(24, [{ axis: 'space', amount: 22 }]),
      swing(56),
    ],
    articulation: [art('offbeat', { velocity: 96, 'note-length': 24 }, 'step-note-length')],
  },
  {
    id: 'mpc-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'poly-track',
    title: 'TubeSynth riser: LFO on pitch, free-running, filter opening over the bar',
    verified: false,
    params: [
      trackType('Plugin'), plugin('TubeSynth'),
      tsOctave1("4'"), tsFine1(7), tsShape1('Saw'), tsQuad('On'), tsDetune(55),
      tsOctave2("2'"), tsShape2('Noise'),
      tsLevel('Osc 1', 60), tsLevel('Osc 2', 55),
      tsCutoff(40, [{ axis: 'darkness', amount: -18 }]), tsReso(46), tsSlope(24),
      tsFilterEnv(95),
      tsEnv('Filter Attack', 3200), tsEnv('Filter Decay', 400),
      tsSustain('Filter Sustain', 100),
      tsEnv('Amp Attack', 1800), tsSustain('Amp Sustain', 100), tsEnv('Amp Release', 260),
      tsLfoShape('Saw Up'), tsLfoDest('Pitch'), tsLfoSync('Off'), tsLfoRate(0.5),
      tsLfoDepth(18, [{ axis: 'grit', amount: 14 }]),
    ],
    articulation: [art('last-hit', { velocity: 127, 'note-length': 384 }, 'step-note-length')],
  },
  // --- Drum-track pads: samples, and the enums the manual actually prints for them ----------
  {
    id: 'mpc-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'pad',
    title: 'Rim one-shot on a pad, mono, nothing added',
    verified: false,
    sourceAudio: {
      need: 'A rimshot or cross-stick one-shot under 120 ms, dry',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('One Shot'), layerPlay('Velocity (Vel)'), padPoly('Mono'),
      globalSemi(0), globalFine(0), layerSemi(2),
      velStart(0), velEnd(127),
    ],
    articulation: [art('backbeat', { velocity: 96 }, 'step-velocity')],
  },
  {
    id: 'mpc-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'pad',
    title: 'Quiet percussion pad, layers cycling so repeats are not identical',
    verified: false,
    sourceAudio: {
      need: 'Two to four shaker, tick or brushed one-shots under 100 ms — one per layer, so the ' +
        'cycle has something to cycle through',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('One Shot'), layerPlay('Cycle (Cyc)'), padPoly('Poly'),
      velStart(0), velEnd(90),
      artSpeed(100), artDynamics(70, [{ axis: 'density', amount: 40 }]),
      artStereo(45, [{ axis: 'space', amount: 30 }]),
    ],
    articulation: [art('ghost', { velocity: 44, probability: 55 }, 'event-probability')],
  },
  {
    id: 'mpc-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'pad',
    title: 'Struck metal through the pad ring modulator',
    verified: false,
    sourceAudio: {
      need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('One Shot'), layerPlay('Velocity (Vel)'), padPoly('Poly'),
      layerSemi(-5),
      drumFx(1, 'Ring Mod'), drumFx(2, 'Wave Folder'),
      harmonicFx('AIR Distortion'), distMode('Wrap'), distDrive(14, [{ axis: 'grit', amount: 26 }]),
      distMix(55, [{ axis: 'grit', amount: 20 }]),
    ],
    articulation: [art('offbeat', { velocity: 100 }, 'step-velocity')],
  },
  {
    id: 'mpc-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'pad',
    title: 'Noise pad bit-crushed and sample-rate reduced',
    verified: false,
    sourceAudio: {
      need: 'A noise or hiss recording, half a second or longer — tape, vinyl run-out, room tone',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('Note On'), layerPlay('Velocity (Vel)'), padPoly('Mono'),
      drumFx(1, 'Bit Crush'), drumFx(2, 'Decimator'),
      harmonicFx('AIR Lo-Fi'), loFiBits(7, [{ axis: 'grit', amount: -4 }]),
      loFiRate(9000, [{ axis: 'darkness', amount: -4500 }]),
    ],
    articulation: [art('accent', { velocity: 108, 'note-length': 96 }, 'step-note-length')],
  },
  {
    id: 'mpc-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'pad',
    title: 'Sustained texture held under the bar, pad held rather than triggered',
    verified: false,
    /**
     * `Sample Play` is `Note On` and that is the whole recipe: p.212 — *"The sample will play only
     * as long as the pad is held. This is better for longer samples so you can control a sound's
     * duration by pressing and holding its corresponding pad."* Under `One Shot` the same sample
     * would run to its end regardless of the note length in the pattern, and the part would stop
     * being a texture and start being a very long one-shot.
     */
    sourceAudio: {
      need: 'A sustained tonal or atmospheric recording, two seconds or longer, with no transient ' +
        'at the front',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('Note On'), layerPlay('Crossfade'), padPoly('Mono'),
      globalSemi(-12), globalFine(-8),
      delayReverbFx('AIR Reverb'), reverbType('Large Studio'), reverbPreDelay(60),
      reverbMix(40, [{ axis: 'space', amount: 28 }]),
    ],
    articulation: [art('downbeat', { 'note-length': 768 }, 'step-note-length')],
  },
  {
    id: 'mpc-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'pad',
    title: 'Vocal chops across a pad bank, one syllable per pad',
    verified: false,
    sourceAudio: {
      need: 'One or two bars of vocal with evenly spaced syllables. Chop it in Chop Mode and ' +
        'assign the slices across a pad bank, so the pattern picks a slice by picking a pad',
      prep: {
        text: 'Sample Edit Mode > Chop, then Convert or Assign Slices to a new drum track',
        verified: cite(304),
      },
      hint: 'chop',
    },
    params: [
      trackType('Drum'), samplePlay('One Shot'), layerPlay('Velocity (Vel)'), padPoly('Poly'),
      globalSemi(0), globalFine(0),
      drumFx(1, 'High Pass'),
      delayReverbFx('AIR Delay'), delaySync('On'), delayFeedback(22),
      delayMix(18, [{ axis: 'space', amount: 20 }]),
    ],
    articulation: [art('accent', { velocity: 116 }, 'step-velocity')],
  },
  {
    id: 'mpc-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'pad',
    title: 'One-shot impact on its own pad, muting whatever else is in its group',
    verified: false,
    sourceAudio: {
      need: 'A one-shot with a big front — a crash, a gated slam, a reversed hit',
      hint: 'sample-assign',
    },
    params: [
      trackType('Drum'), samplePlay('One Shot'), layerPlay('Velocity (Vel)'), padPoly('Mono'),
      muteGroup(1),
      velStart(0), velEnd(127),
      delayReverbFx('AIR Reverb'), reverbType('Scoring Stage'),
      reverbMix(30, [{ axis: 'space', amount: 26 }]),
    ],
    articulation: [art('first-hit', { velocity: 127 }, 'step-velocity')],
  },
]

/** Everything a one-shot sample on a pad can be. See `voices` for the six roles left out. */
const PAD_ROLES = [
  'kick', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture', 'stab', 'vox-chop', 'riser', 'impact', 'sweep',
] as const

/** All twenty-three. A plugin track is whatever plugin is loaded, and one of them is a drum synth. */
const TRACK_ROLES = [
  'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
  'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
] as const

export const device: Device = {
  id: 'akai-mpc-live-iii',
  name: 'MPC Live III',
  maker: 'Akai Professional',

  /**
   * §2.3. `groovebox`, and the choice is against `sampler` rather than against nothing.
   *
   * The Digitakt II took `sampler` because it has no fixed instrument set — *"just sixteen
   * fungible tracks each holding whatever sample is loaded"* — and that discriminator does not
   * hold here. Four of this box's six track types are not samples at all (p.44), one of them
   * hosts eighteen bundled synth plugins (pp.428-521), and around the tracks sit a mixer with
   * eight submixes and four returns (pp.92-98), arrangement and song modes, and audio recording.
   * That is a self-contained production instrument, which is what `groovebox` names, and it puts
   * this box beside the Tracker Mini and the MC-101 rather than beside the Digitakt.
   */
  kind: 'groovebox',

  /**
   * §2.3/§7.4. Sends and receives, and **the two directions are not the same list**.
   *
   * p.63 prints the two settings next to each other and they differ by one option:
   *
   *     Receive   MIDI Clock, MIDI Time Code (MTC), Ableton Link, Off
   *     Send      MIDI Clock, MIDI Time Code (MTC), Off
   *
   * Ableton Link is on one and not the other, so `receiveTransport` carries `ableton-link` and
   * `sendTransport` does not. That is the manual's own answer rather than a reading of what Link
   * is: p.71 has a Link on/off button and p.61 makes it a property of the network connection, and
   * nothing here claims a direction the Send list does not print.
   *
   * **`preferredSource` is not claimed, and p.63 is why.** §7.4 lets a manifest say "this box's
   * job in a rig is to drive it", and this document does not say it: the sync section is a pair of
   * symmetric fields under one heading whose sentence is *"how MPC uses and synchronizes with
   * connected USB and MIDI devices"* (p.62), Receive is printed first, and the one asymmetry it
   * does state runs the other way — Link, a follower-side option. A box this size plainly *can*
   * lead a rig. That is not the same claim, and the difference is the one #80 was about.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'ableton-link'],
    sendTransport: ['midi-din', 'usb'],
    receiveTransport: ['midi-din', 'usb', 'ableton-link'],
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Menu > Preferences > MIDI / Sync',
        value: 'Send: MIDI Clock',
        note: 'Then tick Sync against MIDI Out A in the Output Ports list on the same screen — clock leaves only by a port set there',
      },
      {
        transport: 'usb',
        path: 'Menu > Preferences > MIDI / Sync',
        value: 'Send: MIDI Clock',
        note: 'Then tick Sync against the USB port in the Output Ports list; the USB-C port carries MIDI and audio both',
      },
    ],
  },

  /**
   * Stereo main pair, four further outputs, two audio inputs and class-compliant USB audio.
   *
   * `individualOuts: 4` rather than 6: p.376 has six 1/4" outputs and says outright that *"The
   * Main L/R outputs are the same as Outputs 1,2"*, so `main` and the first pair are one thing
   * counted once. p.530's `(6) 1/4" (6.35 mm) TRS outputs (3 stereo pairs)` is the same six.
   */
  io: { main: 'stereo', individualOuts: 4, audioIn: true, usbAudio: true },

  /**
   * §2.6/#111. **A library nobody has listed, which is `shipped-library`.**
   *
   * p.141 says where it is in as many words: the `Drums`, `Instruments` and `Samples` buttons each
   * *"enter the Expansions folder on the internal drive"*, filtered to kits, plugin presets and
   * samples respectively, and `Demos` enters the Demos folder. p.11 adds that `New Project`
   * *"will automatically load a small factory project"* with samples on Pad Bank A, and p.153 has
   * Sounds Mode searching *"any factory expansions or user expansions"*.
   *
   * What no document does is name a single expansion, count them, or say how much of the 128 GB
   * they occupy — checked pp.10-11, 59, 66, 139-142, 152-153, 529-530. So a reader can browse it
   * and cannot look anything up in it, which is exactly the gap between `enumerable` and this.
   */
  content: {
    kind: 'shipped-library',
    library: 'the factory Expansions — kits, plugin presets and samples',
    location: 'Browser > Expansions, or the Drums / Instruments / Samples buttons under Content',
    reason: 'p.141 says where the folder is and no page names a single expansion or file in it',
  },

  /**
   * §2.6/#142. A note carries its own length, and both halves of that need a page.
   *
   * **What the value is** comes from List Edit Mode, p.205: *"Length: This is the length of the
   * note event in ticks."* **Where it is entered** comes from the hardware step sequencer, p.196:
   * *"To adjust the note length, press and hold the Step Button with the desired note event, and
   * then press another Step Button to set the note length, relative to the current Time
   * Division."* Neither page carries the claim alone, so both are in the citation.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'Length',
    unit: 'ticks',
  },

  /** §10. p.530: `Dimensions (width x depth x height) — 436 x 256 x 67 mm`. 436 is the span. */
  physical: { panelSpanMm: 436, verified: cite(530) },

  panel: MPC_LIVE_III_PANEL,

  manual: { title: 'MPC Live III / MPC XL User Guide', edition: 'v3.7' },

  capabilityEvidence: {
    ...JACK_EVIDENCE,
    'clock.canSendClock': cite(63),
    'clock.canReceiveClock': cite(63),
    'clock.transport': cites('p.63, p.376'),
    'clock.sourceSetup[midi-din]': cites('p.62, p.63'),
    'clock.sourceSetup[usb]': cites('p.62, p.63'),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.62 heads the section "how MPC uses and synchronizes with connected USB and MIDI devices" and p.63 prints Receive above Send as a symmetric pair; the only asymmetry stated is Ableton Link, which appears on the receiving side only, so no page says leading a rig is this box’s job',
    },
    'io.main': cites('p.376, p.530'),
    'io.individualOuts': cites('p.376, p.530'),
    'io.audioIn': cites('p.376, p.530'),
    'io.usbAudio': cite(376),
    /**
     * §2.6/#120. **Read, and one component of this field is not stated anywhere** — so the whole
     * field is an `unknown` rather than a citation, because `capabilityEvidence` has one entry
     * per path and no way to cite three pools separately.
     *
     * What *is* established, and would be cited if the shape allowed it: 128 tracks (p.44), 128
     * pads as 16 across eight banks (p.47), 128 keygroups (p.49), the pad pool's polyphony of 1
     * from pads being triggered by fixed note number (p.211, p.217), and `poly-track`'s 4 from
     * TubeSynth's printed `Polyphony` (p.519). Bassline's monophony rests on p.428's "classic
     * mono synths" plus the absence of the `Polyphony` parameter its siblings carry, which is an
     * inference rather than a printed number.
     *
     * What is not: **DrumSynth's simultaneous-voice count.** See the head note.
     */
    voices: {
      kind: 'unknown',
      reason:
        'the counts are cited (p.44, p.47, p.49) and TubeSynth prints its polyphony (p.519), but DrumSynth is named on only three pages — p.5, p.431, p.433 — and none gives a voice count or a Polyphony parameter, so `mono-track`’s polyphony of 1 is authored rather than read and one entry cannot cite three pools apart',
    },
    'features.perStep': cites('p.192, p.196, p.205'),
    'features.lfo': cites('p.228, p.229'),
    'features.sidechain.internal': cite(405),
    'features.sidechain.fromExternalAudio': cites('p.147, p.405'),
    content: cite(141),
    noteDuration: cites('p.196, p.205'),
  },

  /**
   * §2.2. Three pools — see the head note for why one would not do, and for where `count` and
   * `polyphony` come from.
   *
   * **`pad` leaves six roles out**, and they are the six a fixed-note pad cannot carry: `sub`,
   * `bass-mid`, `pad`, `lead`, `arp` and `acid` all need the part to change pitch from step to
   * step, and a drum track has no per-note transposition to give them (p.211 and p.217 both put
   * transposition on the track or the layer, never on the event). Playing a bass line off pads
   * means one pad per note, which is a different instrument from the one a template asks for.
   * The pool advertises every role a one-shot really can hold, including the ones no recipe here
   * reaches: a role a pad could carry is a role this box can be asked for, and §7.3 reports the
   * absence honestly rather than the pool pretending the capability is missing.
   *
   * **The two plugin pools carry every role and differ only in `polyphony`, which is the honest
   * distinction between them.** A plugin track will host whatever you load, so nothing about the
   * *track* narrows what it can be asked for; what narrows it is how many notes the loaded
   * instrument sounds, and that is exactly the field `polyphony` is. Declaring narrower role
   * lists would hide capability the box has, and §12.4's note-count check already does the real
   * filtering — a three-note stab simply will not land on a monophonic instrument.
   */
  voices: [
    { kind: 'pool', id: 'pad', label: 'Pad', count: 16, roles: [...PAD_ROLES], polyphony: 1 },
    {
      kind: 'pool',
      id: 'mono-track',
      label: 'Mono Track',
      count: 16,
      roles: [...TRACK_ROLES],
      polyphony: 1,
    },
    {
      kind: 'pool',
      id: 'poly-track',
      label: 'Poly Track',
      count: 16,
      roles: [...TRACK_ROLES],
      polyphony: 4,
    },
  ],

  /**
   * Twelve of forty-eight, and openly a judgement — there is no number to cite, because the
   * quantity that would bound it is the one this manual never prints (see the head note).
   *
   * What the document does say is that the ceiling is CPU rather than architecture, and it says it
   * by the features it provides for hitting it: `Flatten Pad` exists *"if you need to reduce how
   * CPU-intensive a pad or track is"* (p.211), the warp algorithms carry their own warning that
   * they *"can be very CPU-intensive, and can result in audio drop-outs"* (p.62), and there is a
   * System Resources screen (p.58) because you are expected to watch it. Plugin tracks are the
   * expensive ones and this manifest puts thirty-two of them in reach, so twelve is deliberately
   * conservative. Crowding is a cost in the objective and never a feasibility limit (§12.4): if
   * this number is wrong nothing breaks, some guides are ranked differently.
   */
  comfortableVoices: 12,

  features: {
    perStep: [...PER_STEP],
    /**
     * Two per pad, and both sync. p.228: *"Tap LFO to cycle between the LFO 1 and LFO 2
     * controls"*, with `Rate [Sync]`, `Fade In [Sync]` and `Delay [Sync]` each taking *"one of
     * several time divisions... When None is selected, Sync is off"*. p.229 gives the four
     * destinations as sliders: Pitch, Filter, Amp, Pan.
     *
     * **The rate has no range and none is invented.** p.228 describes the `Rate` knob and stops —
     * *"At lower values, it might take some time for the LFO to complete a cycle, while higher
     * values will come closer to audible range"* — and the division list behind `[Sync]` is never
     * enumerated either. The plugin LFOs do print both (TubeSynth's is on p.518, and the recipes
     * use it); this field describes the *program* LFO, which does not.
     */
    lfo: { count: 2, syncable: true, destinations: ['Pitch', 'Filter', 'Amp', 'Pan'] },
    /**
     * `Mother Ducker` is a real sidechain and needs two pages to be one. p.405 gives the ducker a
     * `From: Bus 1–8` and its companion `Mother Ducker Input` a `To: Bus 1–8`, which is the
     * internal half. The external half is p.147: an audio track's `Audio Out` *"you can set to a
     * submix (Sub 1–8)"*, and its `Audio In` to the rear inputs — so a signal arriving at
     * `AUDIO IN 1` can reach a bus and duck what is listening to it.
     */
    sidechain: { internal: true, fromExternalAudio: true },
  },

  jacks: JACKS,

  hints: {
    'step-velocity': 'Tap the step velocity bar, or turn its Q-Link',
    'step-note-length': 'Hold the step, press a second step',
    'event-probability': 'List Edit Mode, the Prob column',
    'sample-assign': 'Press Load, then tap Sample Assign',
    chop: 'Sample Edit Mode, tap Chop',
  },

  recipes,
}
