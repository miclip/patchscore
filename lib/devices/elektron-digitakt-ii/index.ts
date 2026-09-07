import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite } from '../../core/params'
import { DIGITAKT_II_PANEL } from './panel'

/**
 * Elektron Digitakt II (§2.3). Sixteen tracks, sixteen stereo voices, a 128-step sequencer, and
 * a sampler deep enough that **the interesting part of this manifest is what it cannot say.**
 *
 * ## `sampler`, in the manual's own words
 *
 * p.10: *"The Digitakt II is a compact drum machine and sampler from Elektron."* Both words, and
 * `sampler` is the one that discriminates — unlike the two Rolands in this library there is no
 * fixed instrument set, just sixteen fungible tracks each holding whatever sample is loaded. It
 * is the library's first `sampler`; the kind has existed unused since the first draft.
 *
 * ## One pool of sixteen, not sixteen plus sixteen
 *
 * p.17: *"The Digitakt II sequencer has 16 tracks that can be either an audio track or a MIDI
 * track. … Any of the sixteen tracks can be used as an audio track. This is the default track
 * setting. Each audio track contains one sample."* The two track types are **mutually
 * exclusive**, so modelling sixteen audio voices plus sixteen MIDI tracks would claim
 * thirty-two simultaneous things this box cannot do. One pool of sixteen, and a track spent on
 * MIDI is a track that has left the pool — a fact the guide cannot show, because §2.2 has no way
 * to say "this assignable exists only if you have not used it for something else".
 *
 * **Polyphony 1 per track needs two pages, not one.** "Each audio track contains one sample"
 * (p.17) says nothing about simultaneity on its own — a sampler can play one sample polyphonically.
 * What settles it is p.15, which gives the architecture as **"16 stereo audio voices"**: sixteen
 * voices across sixteen tracks is one voice each. So a chord asked for as three simultaneous notes
 * is not reachable by any patch here, and the way out is §12.4's `sampled-chord` — a sample that
 * *already contains* the chord, which is one note as far as the track is concerned.
 *
 * ## A trigger note per track mode, and this is the box that needed the shape (§2.1/§2.2/#86)
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. This
 * box had 270 of them, all on the one `track` pool, and it was the **only decline in that class
 * where the evidence for authoring a note was complete** — which is why the reason was never
 * about a missing citation but about where the field could live.
 *
 * **Both halves are printed.** p.25 states the convention outright: *"MIDI note numbers 16-84,
 * that corresponds to notes E2-C7 (C5, MIDI note 60, being middle C)"*. And p.53's TRIG page
 * screenshot shows the box's own display pairing them — `NOTE` reading `C 5 (60)` on an audio
 * track. So `{ note: 'C5', midi: 60 }` is writable here with a real citation, which is more than
 * the OP-XY, the SP-404MK2 or either Roland groovebox could offer.
 *
 * **It could not go on the pool, because a pool's note reaches every member alike and this pool
 * holds three different kinds of track.**
 *
 *  - **Whole-sample tracks** — `ONESHOT`, `WERP`, `STRETCH`, `REPITCH` — where `C5` does mean
 *    *play it as recorded*. This is the one case `TriggerNote` models.
 *  - **Sliced tracks**, and one is authored: `dt2-vox-chop-bright` selects `SLICE`. p.26 gives
 *    their note its own meaning — *"Slices play from C1 and upwards, wrapping around after the
 *    last slice, when using the Grid and Slice machines and set SLICE to NOTE"* — so the note
 *    there is a **slice address**, base `C1`, next semitone the next slice. `TriggerNote` refuses
 *    this explicitly: a slice base in that field would give two kinds of value one name.
 *    **p.26's `C1` is therefore read and deliberately not authored.** #369 settled that it never
 *    will be: an ordinal is outside what a guide can say, because the fact worth printing about a
 *    slice is which one holds the syllable and that is in the reader's audio, not on p.26. The
 *    mode below carries no note permanently rather than pending a shape.
 *  - **MIDI tracks.** p.53's own warning: *"Please note that MIDI tracks has a different set of
 *    parameters on the TRIG, SRC, FLTR, and AMP page."* A `NOTE` there is a note being sent out,
 *    not a loaded sample's original pitch. `MIDI` is a cited member of the `SRC MACHINE` set
 *    (p.93) and p.17 makes any of the sixteen tracks one, so the pool holds it whether or not a
 *    recipe has selected one.
 *
 * **`TrackMode` (§2.2) is the shape that holds all three, and this box is the first to use it.**
 * The pool declares three modes; the note sits on `whole-sample` and nowhere else; and each
 * recipe names the mode it puts the track in. Nothing is asked of the reader and nothing new is
 * carried in a permalink — the mode is a consequence of the recipe the resolver already chooses.
 * `selectedBy` ties each mode to the `SRC MACHINE` values that put it in force, so the mode and
 * the machine cannot drift apart: switch a recipe to `SLICE` and forget the mode and the device
 * stops building, rather than printing `C5` for a slice address.
 *
 * **What it moved: 270 blank grid parts became 6.** The six that remain are every `vox-chop` part
 * on the sliced recipe, and they are correct output — the model is right to say nothing where the
 * note the manual prints is a slice number. `test/elektron-digitakt-ii.test.ts` pins the counts
 * and the fact that the blanks and the sliced recipe are the same set.
 *
 * **This is not all of #86.** That issue is about whole-device configurations a reader chooses
 * before any part is placed — the MC-101's drum/tone split, the Octatrack's `TRACK 8` — which
 * reach the search, the permalink and the rack. None of that is here, and the `comfortableVoices`
 * note below still carries what this box cannot say: that a track spent on MIDI is a track that
 * has left the pool.
 *
 * ## One recipe per declared role, and why narrowing the pool was not an option
 *
 * The pool declares all 23 roles, and eight of them carried no recipe: `acid`, `arp`, `lead`,
 * `noise`, `ride`, `rim`, `sweep` and `tom`. That combination is worse than it looks. A role a
 * device declares and does not author resolves to a `no-recipe` shortfall, so the part is not
 * placed at all — over the eleven directions at seeds 1-6 this box was dropping 96 parts, and it
 * is now dropping 12.
 *
 * **Narrowing `roles` would have closed the same eight gaps and been a lie.** It is the honest
 * repair on a fixed-voice box, where a snare drum voice is a snare drum and cannot be told to be
 * a ride. Here a track is whatever is loaded into it, which is the argument the voices comment
 * below already makes, and there is no role in §2.2's vocabulary a sixteen-track sampler cannot
 * carry. Taking `ride` off the list would say this box cannot play a ride cymbal.
 *
 * So the target here is one recipe per declared role rather than the usual fifteen to twenty, and
 * the ceiling is two. `tom` is the only role with both, because §3.5 refuses a substitution
 * between opposite characters and two directions ask for opposite ends of it; `arp` needs one,
 * because the `bright` and `clean` requests are two apart and either serves the other.
 *
 * **What it cost the search is the part worth recording: nothing on the rig anyone can build.**
 * `measure:search` reports the worst legal rig unmoved at 46,609 nodes on `weave` seed 15, the
 * same direction and seed as before, and the catalogue benchmark up 146 nodes in 729,808. That is
 * #301's point arriving as a measurement rather than an argument: a recipe is priced by the role
 * it lands in, and eight of these nine landed in roles the crowded directions do not contend for.
 *
 * ## Numbers: this manual prints almost none
 *
 * Across the whole of "11. TRACK PARAMETERS" (pp.53-60) and APPENDIX A, exactly **three** numeric
 * ranges are printed: `VFAD (-64–64)` on p.54, `FADE (-64–63)` on p.58, and `HOLD (0–126)` on
 * p.56. ATK, DEC, PAN, VOL, cutoff, resonance and the rest are described in words and given no
 * scale at all — Elektron documents what a parameter does and leaves the range to the screen.
 *
 * So this manifest is **enum-dominated**, and every uncited numeric is absent rather than given
 * an invented `0-127`. That is the CRAVE's rule meeting a much deeper box, and it is why a
 * recipe here reads as a chain of machine and mode choices rather than a list of values.
 *
 * The `LFO WAVE` option set is omitted for a narrower reason: p.58 names the waveforms in prose
 * ("Triangle, Sine, Square, Sawtooth… Exponential and Ramp") while showing only `RND` as an
 * on-screen token, so the panel spelling of the other six is not printed anywhere. Authoring
 * `'Triangle'` would put a word on the screen the box does not show.
 *
 * ## §4.3 articulation, and where it stops (#57)
 *
 * `bindArticulation` produces one `set` of scalars applied to **every** hit sharing a
 * `PatternSlot`. Five things this box does are outside that, and none of them is approximated
 * here:
 *
 *  1. **Per-trig identity.** Parameter locks give *every trig* its own value (p.47). A `set` gives
 *     one value to all hits in a slot.
 *  2. **Arbitrary parameter names.** Any parameter on the PARAMETER pages can be locked (p.47);
 *     `set` keys must appear in a closed authored `perStep`.
 *  3. **Lock trigs.** `[FUNC] + [TRIG]` places a trig carrying locks that sounds no note (p.47).
 *     Our model has hits or nothing; there is no settings-only step.
 *  4. **The pattern budget.** *"Up to 80 different parameters can be locked in a pattern"* (p.47)
 *     is a pattern-wide resource. Nothing in this codebase counts anything across a pattern.
 *  5. **Stateful conditions.** PRE and NEI depend on the most recently evaluated condition on this
 *     or the *neighbour* track; 1ST and LST on where the pattern is in its loop; A:B on a
 *     repetition counter (pp.47-48). A `set` is a static scalar with no evaluation order, no
 *     cross-track reference and no loop context.
 *
 * So `articulation` below uses only the subset that stays true under that limitation: a scalar,
 * the same for every hit in the slot, with no state. `condition`, `fill` and `sample-lock` are
 * declared in `features.perStep` — they are documented capabilities and the field is an honest
 * description of the box — and no recipe reaches for them. See `PER_STEP` for which is which.
 *
 * **The shape #57 would need**, recorded rather than built: per-trig identity inside a slot;
 * typed parameter locks over a named parameter space, including lock-only trigs; pattern-wide
 * lock accounting against a budget; and an evaluable condition AST carrying track and loop
 * context so PRE, NEI, 1ST, LST and A:B can be *computed* rather than printed. That is four
 * separate pieces of engine, and none of it belongs in a device folder.
 */

const MANUAL = 'Digitakt II User Manual OS 1.15A'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * §2.1. Both halves of the addressing fact, from the two pages that print them.
 *
 * p.25 states the convention: *"MIDI note numbers 16-84, that corresponds to notes E2-C7 (C5,
 * MIDI note 60, being middle C)"*. p.53's TRIG page screenshot shows the box pairing them on an
 * audio track, `NOTE` reading `C 5 (60)`. Neither page alone is enough — the first gives the
 * octave mapping and the second gives the note the parameter actually rests at — and §2.1 refuses
 * a MIDI number derived from a note name by habit.
 */
const TRIGGER_NOTE_CITE: Cite = {
  kind: 'manual',
  source:
    `${MANUAL}, p.25 (MIDI note numbers 16-84 are E2-C7, "C5, MIDI note 60, being middle C"); ` +
    'p.53 (TRIG page NOTE reading "C 5 (60)" on an audio track)',
}

// ---------------------------------------------------------------------------
// Option sets, as the manual enumerates them
// ---------------------------------------------------------------------------

/** APPENDIX A.2, p.93. `MIDI` is the machine that makes a track a MIDI track (p.17). */
const SRC_MACHINES = ['ONESHOT', 'WERP', 'STRETCH', 'REPITCH', 'SLICE', 'GRID', 'MIDI'] as const
/**
 * ONESHOT's `PLAY` (Play Mode). p.93 introduces the parameter and stops at its description —
 * *"Play Mode sets the play mode of the sample"* — and the four values are printed as bullets on
 * **p.94**, which is what an option set has to cite. Checked by rendering both pages: the string
 * `FORWARD LOOP` does not occur in p.93's text at all, and the earlier p.93 citation here was
 * carried over from the adjacent `SRC MACHINE` list rather than read off the page.
 */
const PLAY_MODES = ['FORWARD', 'REVERSE', 'FORWARD LOOP', 'REVERSE LOOP'] as const
/**
 * APPENDIX A.3, pp.104-108. Reproduced with the manual's own numbering erratum noted: it labels
 * both COMB+ and LEGACY `A.3.5`.
 */
const FLTR_MACHINES = ['MULTI-MODE', 'LOWPASS 4', 'EQ', 'COMB-', 'COMB+', 'LEGACY'] as const
/** AMP page `MODE`, p.56. `HOLD` and `SUS`/`REL` are gated on which one is chosen. */
const AMP_MODES = ['AHD', 'ADSR'] as const
/** MOD page `MODE` (LFO Trig Mode), p.58. */
const LFO_MODES = ['FRE', 'TRG', 'HLD', 'ONE', 'HLF'] as const

/**
 * SOUND SETTINGS > TRACK > PORTAMENTO, p.38. Three printed option lists on one screen, and the
 * fourth setting on it is deliberately not here: `AMOUNT` names 100 as a full glide and prints
 * no scale that 100 sits on, so a value would be a number with no bounds behind it.
 *
 * These live in a menu rather than on the PARAMETER pages, which is why `portSlope` carries the
 * route in a note. The switch that puts them in force is `PORT` on TRIG PAGE 2 (p.55), and it is
 * absent for the reason `LFO WAVE` is: the manual describes it in prose ("turns the portamento
 * on/off") and prints no on-screen token for either state.
 */
const PORT_SLOPES = ['CONSTANT RATE', 'CONSTANT TIME'] as const
const PORT_STYLES = ['GLIDE', 'GLISSANDO'] as const
/** p.38's LEGATO ONLY, whose two states the page does print. */
const PORT_LEGATO = ['ON', 'OFF'] as const

/**
 * §2.3's per-step vocabulary: the per-trig capabilities this manual documents.
 *
 * **Six of these nine are reachable from `articulation` and three are not**, which is a sharper
 * case than any other manifest in the library — the Metropolix declares eight lanes none of which
 * can reach a guide, and the drum machines declare lanes all of which can.
 *
 * Reachable, because each is a scalar that stays true when applied to every hit in a slot:
 * `velocity` and `note-length` (VEL, LEN — p.53), `probability` (PROB, p.53, whose outcome is
 * *"re-evaluated every time a trig is set to play"*, so it carries no state between trigs),
 * `micro-timing` (p.45), and `retrig` with `retrig-rate` (RTRG and RATE, p.54 — the rate is
 * paired with the switch because "these hits retrig" without a rate is not an instruction anyone
 * can carry out).
 *
 * `portamento` is here on the strength of two pages rather than one. `PORT` is a TRIG PAGE 2
 * parameter (p.55), and p.53 says of the whole chapter that *"the track parameters may be locked
 * to other settings on any step of the pattern"*; Appendix B.2 lists Portamento On/Off among the
 * trig parameters it gives a CC for (p.109). So which steps glide is a per-step decision on this
 * box, and #283's slide is bindable rather than merely stated. `PTIM`, the time it glides over,
 * is left out for the usual reason: p.55 prints no scale for it.
 *
 * Declared and deliberately unreachable:
 *
 *  - `condition` — PRE, NEI, 1ST, LST and A:B are stateful (pp.47-48). See the module JSDoc.
 *  - `fill` — depends on whether the device is in FILL mode, which is global runtime state (p.54).
 *  - `sample-lock` — a per-step sample change (p.93). Expressible in principle and omitted in
 *    practice, because the value would be a sample name nobody can know (invariant 5).
 */
const PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'portamento',
  'condition',
  'fill',
  'sample-lock',
] as const

/** The subset `articulation` may use. Exported so the test can assert the boundary, not restate it. */
export const ARTICULABLE_PER_STEP = [
  'velocity',
  'note-length',
  'probability',
  'micro-timing',
  'retrig',
  'retrig-rate',
  'portamento',
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

/** An enum whose option set is cited and whose selection is taste (§3.2). */
function pick(name: string, value: string, values: readonly string[], page: number, note?: string): AuthoredParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...values], verified: cite(page) },
    verified: false,
    ...(note === undefined ? {} : { note }),
  }
}

/** One of the three numerics this manual gives a range for. */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: { mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]; note?: string } = {},
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

const src = (m: (typeof SRC_MACHINES)[number]) => pick('SRC MACHINE', m, SRC_MACHINES, 93)
const play = (m: (typeof PLAY_MODES)[number]) => pick('PLAY', m, PLAY_MODES, 94)
const fltr = (m: (typeof FLTR_MACHINES)[number]) => pick('FLTR MACHINE', m, FLTR_MACHINES, 104)
const ampMode = (m: (typeof AMP_MODES)[number]) => pick('AMP MODE', m, AMP_MODES, 56)
const lfoMode = (m: (typeof LFO_MODES)[number]) => pick('LFO MODE', m, LFO_MODES, 58)
const portSlope = (m: (typeof PORT_SLOPES)[number]) =>
  pick(
    'PORT SLOPE',
    m,
    PORT_SLOPES,
    38,
    'SOUND SETTINGS > TRACK > PORTAMENTO. Turn PORT on (TRIG PAGE 2) or none of these bite',
  )
const portStyle = (m: (typeof PORT_STYLES)[number]) => pick('PORT STYLE', m, PORT_STYLES, 38)
const portLegato = (m: (typeof PORT_LEGATO)[number]) => pick('PORT LEGATO ONLY', m, PORT_LEGATO, 38)
/** AMP `HOLD`, the one unipolar range the manual prints. Only exists when MODE is AHD (p.56). */
const hold = (v: number) =>
  num('HOLD', v, { min: 0, max: 126 }, 56, {
    mood: [{ axis: 'density', amount: -24 }],
    note: 'Only available when AMP MODE is AHD',
  })
/** LFO `FADE`, p.58. Positive fades out, negative fades in. */
const fade = (v: number) => num('FADE', v, { min: -64, max: 63 }, 58)
/** Retrig `VFAD`, p.54. The velocity curve of the retrig. */
const vfad = (v: number) => num('VFAD', v, { min: -64, max: 64 }, 54)

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
  {
    id: 'dt2-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    mode: 'whole-sample',
    title: 'One-shot kick, played forward and left alone',
    verified: false,
    sourceAudio: {
      need: 'A dry kick one-shot with a defined attack and no room on it',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('LOWPASS 4'), ampMode('AHD'), hold(24)],
    articulation: [art('downbeat', { velocity: 120 }, 'trig-params')],
  },
  {
    id: 'dt2-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Kick through the comb filter, tail chopped short',
    verified: false,
    sourceAudio: {
      need:
        'A kick one-shot with grit already in it — off tape, off vinyl, through an overdriven ' +
        'bus',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('COMB-'), ampMode('AHD'), hold(8)],
    articulation: [art('accent', { velocity: 127 }, 'trig-params')],
  },
  {
    id: 'dt2-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Sub sample repitched down, everything above it filtered off',
    verified: false,
    sourceAudio: {
      need:
        'A clean low sustained tone with a stable, known pitch — REPITCH transposes it, so the ' +
        'tuning has to be true before it moves',
    },
    params: [src('REPITCH'), play('FORWARD'), fltr('LOWPASS 4'), ampMode('AHD'), hold(96)],
    articulation: [art('downbeat', { 'note-length': 32 }, 'trig-params')],
  },
  {
    id: 'dt2-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Repitched bass with the multi-mode filter opened by the envelope',
    verified: false,
    sourceAudio: {
      need:
        'A short bass note with harmonics above the fundamental; a filtered sine repitches into ' +
        'nothing to bite on',
    },
    params: [src('REPITCH'), play('FORWARD'), fltr('MULTI-MODE'), ampMode('ADSR'), lfoMode('TRG'), fade(-20)],
    articulation: [art('downbeat', { velocity: 112, 'note-length': 12 }, 'trig-params')],
  },
  {
    id: 'dt2-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Snare one-shot, flat and forward',
    verified: false,
    sourceAudio: {
      need: 'A snare one-shot, crack intact and dry',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(20)],
    articulation: [art('backbeat', { velocity: 124 }, 'trig-params')],
  },
  {
    id: 'dt2-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Snare warped, with a retrig on the fill',
    verified: false,
    sourceAudio: {
      need: 'A snare one-shot with body for WERP to chew — a thin sample warps into a thinner one',
    },
    params: [src('WERP'), play('FORWARD'), fltr('COMB+'), ampMode('AHD'), hold(16), vfad(-32)],
    articulation: [
      art('backbeat', { velocity: 118 }, 'trig-params'),
      art('fill', { retrig: true, 'retrig-rate': '1/32' }, 'retrig'),
    ],
  },
  {
    id: 'dt2-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Clap sitting over the snare, top end left in',
    verified: false,
    sourceAudio: {
      need: 'A stereo hand-clap one-shot, several hands rather than one',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(28)],
    articulation: [art('backbeat', { velocity: 110 }, 'trig-params')],
  },
  {
    id: 'dt2-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Rim click, EQ narrowed to the wood',
    verified: false,
    sourceAudio: {
      need: 'A rimshot or cross-stick one-shot under 80 ms, close and dry, with no room on it',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(2)],
    articulation: [
      art('backbeat', { velocity: 102 }, 'trig-params'),
      art('ghost', { velocity: 44, probability: 70 }, 'trig-params'),
    ],
  },
  {
    id: 'dt2-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Closed hat, offbeats pulled back off the grid',
    verified: false,
    sourceAudio: {
      need: 'A closed hat one-shot under 150 ms, dry',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('MULTI-MODE'), ampMode('AHD'), hold(4)],
    articulation: [art('offbeat', { velocity: 84, 'micro-timing': -2 }, 'micro-timing')],
  },
  {
    id: 'dt2-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Hat with ghosts thinned out by probability',
    verified: false,
    sourceAudio: {
      need:
        'A closed hat one-shot that is already lo-fi — a sampled machine hat, not a studio ' +
        'recording',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('COMB-'), ampMode('AHD'), hold(3)],
    articulation: [
      art('offbeat', { velocity: 88 }, 'trig-params'),
      art('ghost', { velocity: 48, probability: 60 }, 'trig-params'),
    ],
  },
  {
    id: 'dt2-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Open hat let ring, filter out of the way',
    verified: false,
    sourceAudio: {
      need: 'An open hat one-shot with a real tail to hold open',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(72)],
    articulation: [art('offbeat', { velocity: 108, 'note-length': 16 }, 'trig-params')],
  },
  {
    id: 'dt2-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Ride let ring on the offbeat',
    verified: false,
    sourceAudio: {
      need:
        'A ride cymbal one-shot with the bow ring left on it, two seconds or longer; a gated ' +
        'ride has nothing for HOLD to hold',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(88)],
    articulation: [art('offbeat', { velocity: 96, 'note-length': 24 }, 'trig-params')],
  },
  {
    id: 'dt2-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Quiet percussion, half of it not playing',
    verified: false,
    sourceAudio: {
      need: 'A shaker, tick or brushed one-shot under 100 ms',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('MULTI-MODE'), ampMode('AHD'), hold(6)],
    articulation: [art('ghost', { velocity: 40, probability: 50 }, 'trig-params')],
  },
  {
    id: 'dt2-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Metallic hit through the resonant comb',
    verified: false,
    sourceAudio: {
      need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('COMB+'), ampMode('AHD'), hold(40)],
    articulation: [art('offbeat', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'dt2-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Low tom under the 4-pole, retrigged across the fill',
    verified: false,
    /**
     * `VFAD` is here because `RTRG` is: p.54 defines it as the velocity curve of the retrig, and
     * -32 "fades out to half the velocity during the set length". A roll that arrives at the same
     * weight it left is a machine playing a fill, so the curve is part of the gesture rather than
     * a decoration on it.
     */
    sourceAudio: {
      need: 'A low tom one-shot with the pitch drop already recorded into it, skin and all',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('LOWPASS 4'), ampMode('AHD'), hold(44), vfad(-32)],
    articulation: [
      art('accent', { velocity: 116 }, 'trig-params'),
      art('fill', { retrig: true, 'retrig-rate': '1/24' }, 'retrig'),
    ],
  },
  {
    id: 'dt2-tom-bright',
    role: 'tom',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Mid tom with the stick left in',
    verified: false,
    /**
     * The second tom, and the only role on this box carrying two recipes for a reason other than
     * taste: §3.5 refuses a substitution between opposite characters, and `bright` and `dark` are
     * opposites. One recipe here would leave whichever direction asked for the other end with no
     * tom on a box that plainly has sixteen tracks to put one on.
     */
    sourceAudio: {
      need: 'A mid or high tom one-shot recorded close, with the stick attack intact',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(26)],
    articulation: [
      art('offbeat', { velocity: 104 }, 'trig-params'),
      art('fill', { velocity: 120 }, 'trig-params'),
    ],
  },
  {
    id: 'dt2-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Noise burst through the legacy filter, struck rather than held',
    verified: false,
    /**
     * `LEGACY` rather than `LOWPASS 4`: p.108 gives it a 2-pole, 12 dB/octave slope against the
     * 4-pole's 24 dB (p.105), and on a source that is all top end the shallower slope is what
     * leaves the part audible after the filter has done its job.
     *
     * Struck rather than looped, because the direction that asks for `noise` patterns it on
     * `offbeat` and `accent`. A bed would be `FORWARD LOOP` and a different recipe.
     */
    sourceAudio: {
      need:
        'A noise recording with movement in it, such as tape hiss, a vinyl run-out or a cymbal ' +
        'wash; flat white noise gives the filter nothing to reveal',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('LEGACY'), ampMode('AHD'), hold(10)],
    articulation: [
      art('offbeat', { velocity: 90 }, 'trig-params'),
      art('accent', { velocity: 112 }, 'trig-params'),
    ],
  },
  {
    id: 'dt2-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'track',
    mode: 'sliced',
    title: 'Sliced vocal, a different slice under each hit',
    verified: false,
    sourceAudio: {
      need:
        'One or two bars of vocal with evenly spaced syllables, so the slice grid lands on them ' +
        'rather than between them',
    },
    params: [src('SLICE'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(18)],
    // The obvious articulation here is a per-step sample or slice lock, and it is exactly what
    // this model cannot carry: see `PER_STEP`. What was left was a velocity bump on `first-hit`,
    // and #108's reachability check found that dead: only Industrial Techno emits `first-hit` at
    // all, and only for `impact`. So this recipe articulates nothing, honestly.
  },
  {
    id: 'dt2-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Looped texture stretched under the track, LFO free-running',
    verified: false,
    sourceAudio: {
      need:
        'A sustained tonal source, two seconds or longer. STRETCH holds it under the whole bar, ' +
        'so a loop point that clicks will click every bar',
    },
    params: [src('STRETCH'), play('FORWARD LOOP'), fltr('LOWPASS 4'), ampMode('ADSR'), lfoMode('FRE'), fade(24)],
    articulation: [art('downbeat', { 'note-length': 64 }, 'trig-params')],
  },
  {
    id: 'dt2-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'One sample played as a line, a note lock on every trig',
    verified: false,
    /**
     * A lead on this box is one track and one voice (p.15), so it is monophonic by construction
     * and nothing here has to say so. The pitch comes from the same place the stab's does: `NOTE`
     * on TRIG PAGE 1, locked per step (p.53), with `TUNE` snapping to semitones by hand if the
     * line is played in rather than written (p.93).
     *
     * `ADSR` rather than `AHD`, because a lead is held for whatever `LEN` the trig carries and an
     * AHD envelope decides that itself. `HOLD` is therefore absent, and p.56 says it would be
     * unavailable anyway.
     */
    sourceAudio: {
      need:
        'A single sustained tone of known pitch, one note only, with a clean start; every trig ' +
        'repitches this one file, so anything recorded into it transposes with it',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('MULTI-MODE'), ampMode('ADSR')],
    articulation: [art('downbeat', { velocity: 110, 'note-length': 12 }, 'trig-params')],
  },
  {
    id: 'dt2-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Arpeggio written onto the grid, one note to a trig',
    verified: false,
    /**
     * **This box has no arpeggiator.** The word does not occur anywhere in the manual, and the
     * index (p.116) has no entry for one. So an `arp` here is a figure placed on the sequencer,
     * a `NOTE` lock to each trig (p.53), and that is what the guide should say rather than
     * pointing at a control the reader will go looking for and not find.
     *
     * Written out rather than warped from a recorded arpeggio, which the STRETCH machine would
     * also do: a recording moves as a block under a `NOTE` lock, so it keeps whatever chord it
     * was played over and stops following the direction's harmony after the first change.
     *
     * `clean` covers the `bright` request too, at §3.5's substitution distance of 2.
     */
    sourceAudio: {
      need: 'A short plucked or struck tone of known pitch, one note, decaying inside one step',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('LOWPASS 4'), ampMode('AHD'), hold(8)],
    articulation: [
      art('offbeat', { velocity: 92, 'note-length': 4 }, 'trig-params'),
      art('ghost', { velocity: 56, probability: 80 }, 'trig-params'),
    ],
  },
  {
    id: 'dt2-acid-hard',
    role: 'acid',
    character: 'hard',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Sampled acid line, the glide completing in a fixed time',
    verified: false,
    /**
     * The slide is what makes this role that role, and this box has one: `PORT` on TRIG PAGE 2
     * (p.55), configured in SOUND SETTINGS > TRACK > PORTAMENTO (p.38). Three of that screen's
     * four settings are here.
     *
     *  - `SLOPE CONSTANT TIME`, because p.38's other slope takes longer over wider intervals, and
     *    a line that glides for a different length of time depending on the interval stops
     *    sitting on the sixteenths.
     *  - `STYLE GLIDE`, p.38's continuous portamento. `GLISSANDO` quantises to semitones, which
     *    is a staircase rather than a slide.
     *  - `LEGATO ONLY ON`, so the glide happens between held notes and the unheld ones land flat.
     *    That is the 303 behaviour this role is named after, and it is why the accents below are
     *    the interesting trigs rather than all of them.
     *
     * `AMOUNT` is the fourth and stays off: p.38 names 100 as a full glide and prints no scale
     * for it, so any value would be a number with nothing behind it.
     *
     * **`LEGATO ONLY OFF` is the setting that lets the sequencer decide.** p.38's `ON` glides
     * only from a note still being held, which on a grid means engineering an overlap in `LEN`
     * before the glide will happen at all. `OFF` glides from the last note played, so the `PORT`
     * lock below is the whole decision about which steps slide.
     */
    sourceAudio: {
      need:
        'A short saw or square bass tone of one known pitch, with no filter movement recorded ' +
        'into it; the filter is the part this recipe is for',
    },
    routing:
      '**Slide:** `PORT` is on TRIG PAGE 2 and locks per step like the rest of the track ' +
      'parameters (p.53, p.55), so the accented steps below carry the glide and the others step ' +
      'flat. How it glides is the PORTAMENTO block in SOUND SETTINGS > TRACK, set above; `PTIM` ' +
      'sets how long it takes and this manual prints no scale for it, so find that one by ear',
    params: [
      src('ONESHOT'),
      play('FORWARD'),
      fltr('LOWPASS 4'),
      ampMode('AHD'),
      hold(6),
      portSlope('CONSTANT TIME'),
      portStyle('GLIDE'),
      portLegato('OFF'),
    ],
    articulation: [
      art('offbeat', { velocity: 88 }, 'trig-params'),
      art('accent', { velocity: 127, portamento: true }, 'portamento'),
    ],
  },
  {
    id: 'dt2-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Sample played backwards into the change',
    verified: false,
    /**
     * #452. **One gesture, and the reason is the document rather than the box.** `LFO MODE ONE`
     * and `FADE -48` are here with no destination and no depth, which is the state #452 was filed
     * about — but the repair a sibling would suggest is not available.
     *
     * p.114's APPENDIX C prints the audio-track destinations and gives the filter's as
     * *"FILTER: (machine dependent parameters)"*, so the cutoff has no spelling to author. The
     * depth is the harder half: p.59 describes `DEP` in prose — bipolar, *"a center setting,
     * 0.00, equals no modulation depth"* — and prints **no range** for it, or for `SPD`, anywhere
     * in the document. On the first Digitakt both are printed (`-64.00-63.00`, p.48), which is
     * exactly the kind of difference #196 says must not be assumed to carry between siblings, so
     * nothing is copied across and no numeric is authored here.
     *
     * **So the movement is unauthored, not absent**, and `routing` says which. The two are
     * different facts (invariant 5): a reader who owns this box can dial a depth in a few
     * seconds, and telling them the box cannot do it would be false.
     */
    sourceAudio: {
      need:
        'A bright metallic tail three to four bars long at your tempo — a crash left to ring, a ' +
        'bowed cymbal, a noise wash. REVERSE plays it backwards once per trig (p.94) and nothing ' +
        'here stretches it, so the file is the gesture: at `TUNE 0` it lasts exactly as long as ' +
        'it was recorded (p.93). The trig below holds three bars, so a shorter file leaves ' +
        'silence before the change and a longer one gets cut by the release',
    },
    routing:
      '**One gesture, and it does not come back.** `LFO MODE ONE` *"starts when a note is ' +
      'trigged, then runs to the end of the waveform and then stops"* (p.59), and `REVERSE` ' +
      'plays the sample once per trig (p.94). Put the trig three bars before the change; ' +
      'nothing retriggers it and nothing loops. **Set the depth by ear, because this manual ' +
      'prints no scale for it** — p.59 gives `DEP` and `SPD` in prose only, so open `DEP` from ' +
      '`0.00` until the rise is the size you want rather than reaching for a number here. **The ' +
      'cutoff is the destination the manual will not name:** p.114 prints it as `FILTER: ' +
      '(machine dependent parameters)`, and p.58\u2019s MOD page figure spells it `LP4 FREQ` only ' +
      'with the LOWPASS 4 machine loaded, not this one\u2019s multi-mode filter',
    params: [src('ONESHOT'), play('REVERSE'), fltr('MULTI-MODE'), ampMode('ADSR'), lfoMode('ONE'), fade(-48)],
    articulation: [art('last-hit', { velocity: 127, 'note-length': 48 }, 'trig-params')],
  },
  {
    id: 'dt2-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    mode: 'whole-sample',
    title: 'One-shot impact on the change, nothing else touched',
    verified: false,
    sourceAudio: {
      need: 'A one-shot with a big front — a crash, a gated slam, a reversed hit',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('LEGACY'), ampMode('AHD'), hold(110)],
    articulation: [art('first-hit', { velocity: 127 }, 'trig-params')],
  },
  {
    id: 'dt2-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Short chord stab from a sample that already contains the chord',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * §12.4. p.15 gives sixteen voices across sixteen tracks, so a track sounds one note and a
     * three-note stab is not reachable by any patch on this box. The way out is a sample that is
     * already the chord — once it is loaded, the chord *is* one note as far as the track is
     * concerned, which is exactly what `sampled-chord` says.
     *
     * **The two things that make the substitution legitimate are both on the page**, and they
     * are worth naming here because the TR-1000 passes the first and fails the second (see its
     * manifest; the TR-8S was thought to fail it too until #183 found the page that says
     * otherwise):
     *
     *  1. *It sustains.* The Oneshot machine *"plays the sample linearly (forward, reversed, or
     *     looped)"* (p.93); `FORWARD LOOP` holds a chord under a whole bar, and the pad below
     *     uses it.
     *  2. *It transposes per step.* TRIG PAGE 1 carries `NOTE` — *"Trig Note sets the pitch of
     *     the note when trigged"* — and p.53 says outright that *"Trigs can be locked to other
     *     settings on any step of the pattern by first pressing and holding a [TRIG] key, then
     *     changing the settings."* So each trigger can carry its own pitch, and the chord
     *     follows the progression. `TUNE` reaches the same place by hand: p.93 notes that
     *     pressing and turning DATA ENTRY *"snap[s] parameter values to semitones"*.
     *
     * Transposition preserves the recorded voicing and nothing else: it cannot invert or
     * re-voice the chord, so a changed shape is a second sample (§4.1). The Hook phase lists
     * which samples the part needs and the semitone offset to place on each trigger.
     */
    sourceAudio: {
      need:
        'Chord sample(s) — one per chord shape the hook plays; see Hook for which and for the ' +
        'transposition on each trigger',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('MULTI-MODE'), ampMode('AHD'), hold(22)],
    articulation: [art('accent', { velocity: 120, 'note-length': 8 }, 'trig-params')],
  },
  {
    id: 'dt2-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    mode: 'whole-sample',
    title: 'Rendered chord sample, looped and swelled',
    verified: false,
    realisation: 'sampled-chord',
    /**
     * `FORWARD LOOP` is the sustain half of §12.4's bar, and `ADSR` is what holds it: the chord
     * plays for as long as the trig's length. The transposition half is the same `NOTE` trig
     * lock the stab's note above sets out (p.53). Place the Hook phase's printed semitone offset
     * on each trigger; the chord moves as a block and keeps the voicing it was recorded with.
     */
    sourceAudio: {
      need:
        'Sustained chord sample(s), two seconds or longer — one per chord shape the hook plays; ' +
        'see Hook',
    },
    params: [src('STRETCH'), play('FORWARD LOOP'), fltr('LOWPASS 4'), ampMode('ADSR'), lfoMode('FRE'), fade(32)],
    articulation: [art('downbeat', { 'note-length': 96 }, 'trig-params')],
  },
  {
    id: 'dt2-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'track',
    mode: 'whole-sample',
    title: 'A recorded sweep stretched to land on the change',
    verified: false,
    /**
     * §4.2's transitional roles, and the sampler's answer to one: load the sweep rather than
     * build it. `STRETCH` is what makes that a bar count rather than a guess, since p.96 has it
     * stretching a sample "to the tempo of your project or pattern" with `BARS` setting the
     * sample's duration in bars. A four-bar sweep set to four bars ends where the section does,
     * at any BPM the direction picks.
     *
     * **The LFO would be the other way to do this and it cannot be authored here.** A sweep is an
     * LFO walking the cutoff, and naming an LFO without naming what it moves is the instruction
     * #332 found unfinishable. p.114 lists the audio-track destinations and prints the filter's
     * as `FILTER: (machine dependent parameters)`, so the cutoff has no spelling in the appendix.
     * Writing one would put a word on the screen the box does not show, which is the same reason
     * `LFO WAVE` is absent from this manifest.
     *
     * **Narrowed at #452, because the sentence used to claim more than the page supports.** It
     * read *"the on-screen spelling of the cutoff destination appears nowhere in this manual"*,
     * and p.58's MOD page figure does show one — `LP4 FREQ` — with the `LOWPASS 4` machine
     * loaded. p.114 also prints twenty-seven other destinations perfectly plainly. So what is
     * missing is a spelling for *this* filter, not a modulation surface for the box, and the
     * conclusion is unchanged: this recipe's `MULTI-MODE` cutoff still has no printed name.
     *
     * **No articulation, and this one is checked rather than assumed** (#108). No direction
     * authors a step variant for `sweep`, so `selectPattern` returns `none` in every section and
     * there is no slot for a gesture to address. See `lib/core/reachability.ts` on why that is a
     * standing state of the template library and not a hole in this recipe.
     */
    sourceAudio: {
      need:
        'A recording of a sweep, four bars or longer, that arrives at its top or bottom exactly ' +
        'at the end; BARS stretches it to the section, so where it ends is where the change is',
    },
    params: [src('STRETCH'), play('FORWARD'), fltr('LOWPASS 4'), ampMode('ADSR')],
  },
]

export const device: Device = {
  id: 'elektron-digitakt-ii',
  name: 'Digitakt II',
  maker: 'Elektron',
  kind: 'sampler',

  /**
   * Sends and receives on both transports. The rear panel carries MIDI In, Out and Thru DIN
   * sockets and a USB port (p.14), and the manual's SYNC settings cover clock over both —
   * `CLOCK SEND` "sets whether or not Digitakt II transmits MIDI clock" (p.77).
   *
   * **`preferredSource` is not claimed (§7.4/#80), and the manual's own definition is why.**
   * p.10 opens: *"The Digitakt II is a compact drum machine and sampler from Elektron"*, and
   * puts *"extensive possibilities to control external MIDI gear"* fourth in a list of four
   * capabilities. A possibility is not a job. p.11's overview does not mention external gear,
   * MIDI, or sync at all, and §16 SETUP EXAMPLES frames the box as a peer rather than a lead:
   * *"The Digitakt II likes to play with other machines... Digitakt II gets along with other
   * gear"* (p.86). Its worked examples do show it driving one — but between a sample-from-your-
   * phone example and a key-combination appendix, as one rig you could build.
   *
   * **The architecture argues the same way, and this is the part a jack list would hide.** p.17's
   * MIDI tracks do carry a purpose sentence — *"They are used to control external, MIDI equipped,
   * gear"* — but the pool comment above is the reason it cannot be read as this box's job: the
   * sixteen tracks are audio *or* MIDI, so every track spent sequencing something else is a track
   * taken from the sampler the manual calls the product. A box built to drive a rig does not
   * charge you a voice for it.
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  /**
   * Stereo main out, a stereo input for sampling (p.14, p.68), and class-compliant USB audio.
   * `individualOuts: 0` — this box has one output pair and no separations.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §2.6/#22. One entry, recording a decision rather than a citation — #80 asked this manual what
   * the box is for, and the answer it gives is "a drum machine and sampler". See the `clock`
   * comment.
   */
  /**
   * §2.6/#111. **This box ships a library nobody has listed, which is `shipped-library`.**
   *
   * p.70 §13.6: the storage opens on two directories, and "a wide array of factory samples are
   * available in the write protected FACTORY directory"; p.84 adds that they cannot be erased and
   * spend none of the 20 GB user area.
   *
   * **`unknown` was wrong here and it is worth saying why, because it looked careful.** The
   * reading did not run out — it answered. The box arrives with usable sample content in a place
   * a reader can open and browse. What no *document* does is print the filenames, and that is a
   * limit on the manual rather than on what anybody knows about the box; recording it as unknown
   * told a reader nothing was established when the useful half was.
   *
   * **`enumerable` was the other wrong answer**, and it failed the opposite way: it promises a
   * reader entries they can look up, and there is no list to look them up in. That is what
   * `shipped-library` is for — the content and its place are established, the names are not —
   * and it is why the eighteen recipes here still describe their audio in `sourceAudio.need`
   * rather than naming a file. `reason` is that fact said to a reader rather than to us.
   */
  content: {
    kind: 'shipped-library',
    library: 'a wide array of factory samples',
    location: 'the write-protected FACTORY directory on the +Drive',
    reason: 'p.70 says the directory is there and no page lists a single filename',
  },

  /**
   * §2.6/#142. p.53, the TRIG page: *"LEN — Trig Length sets the length of the note trig."* One
   * of the eight trig parameters, beside `NOTE`, `VEL` and `PROB`, and parameter-lockable like
   * the rest of them.
   *
   * The unit comes off p.43, which is where the manual states what its values mean rather than
   * that they exist: *"A LEN value of 1/16 adds a sixteenth note and advances the sequencer one
   * step. 1/8 adds an eighth note and advances the sequencer two steps."* Both pages are in the
   * citation, because the claim this field makes needs both halves and neither page carries it
   * alone.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'LEN',
    unit: 'note divisions — 1/16 is one step',
  },

  capabilityEvidence: {
    noteDuration: { kind: 'manual', source: `${MANUAL}, p.43, p.53` },
    content: cite(70),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.10 defines the box as “a compact drum machine and sampler” and lists controlling external gear as a possibility; p.86 frames it as a peer that “gets along with other gear”, and a MIDI track costs an audio track (p.17)',
    },
  },

  /** p.91: `Dimensions: W 215 × D 176 × H 63 mm`. 63 mm is how far off the desk it stands. */
  physical: { panelSpanMm: 215, verified: cite(91) },

  panel: DIGITAKT_II_PANEL,

  manual: { title: 'Digitakt II User Manual', edition: 'OS 1.15A' },

  productPage: 'https://www.elektron.se/explore/digitakt-ii',

  /**
   * §2.2. One pool of sixteen, `polyphony: 1` — see the module JSDoc for why that needs p.15 and
   * p.17 together rather than either alone.
   *
   * The pool carries every role because a sampler's track is whatever is loaded into it. That is
   * the Tracker Mini's argument on a box with twice the tracks.
   */
  voices: [
    {
      /**
       * **No `triggerNote`, and three `modes` instead** (§2.1/§2.2/#86).
       *
       * A pool's note reaches every member alike, and this pool does not hold members that are
       * addressed alike. It holds one set of sixteen tracks that the reader can make three
       * different kinds of thing, and `C5` is true of one of the three. Until modes existed the
       * only honest answer was to state nothing, on the one box in the library whose manual
       * supplies both halves of the fact with a citation for each.
       *
       * The mode a track is in is not a rig setting and is not asked of the reader: it is what
       * the recipe's own `SRC MACHINE` already selects, which is why `selectedBy` names that
       * parameter and the schema refuses a recipe whose machine and mode disagree.
       */
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 16,
      modes: [
        {
          /**
           * The four machines that play a loaded sample as a sample. p.93's `SRC MACHINE` set
           * gives all four, and p.94 gives `ONESHOT` its own play modes — on any of them the note
           * on the step is the sample's pitch, so `C5` is *play it as recorded* exactly as it is
           * on a tracker row.
           */
          id: 'whole-sample',
          label: 'ONESHOT / WERP / STRETCH / REPITCH',
          triggerNote: { note: 'C5', midi: 60, verified: TRIGGER_NOTE_CITE },
          selectedBy: {
            param: 'SRC MACHINE',
            values: ['ONESHOT', 'WERP', 'STRETCH', 'REPITCH'],
          },
        },
        {
          /**
           * **No note, and this is the refusal working rather than a gap.** p.26: *"Slices play
           * from C1 and upwards, wrapping around after the last slice, when using the Grid and
           * Slice machines and set SLICE to NOTE"*. So the note there is a slice address — an
           * ordinal wearing a note's shape — and `TriggerNote` says in as many words that putting
           * one in that field would give two kinds of value one name. p.26's `C1` is read and
           * deliberately not authored.
           *
           * **#369 decided that nothing will ever be able to say it, and this is final.** The
           * mapping is not the missing piece — p.26 prints it in full. What is missing is which
           * slice holds the syllable, which lives in the reader's audio file, so a slice ordinal
           * is outside what a guide can carry (invariant 5). This mode therefore has no
           * `triggerNote` permanently. What the box says about slices it says through the
           * `SRC MACHINE` value and the slice params on the recipe, which are the authority.
           * `DESIGN.md` §2.1/§4.1.
           *
           * **This mode deliberately declares no `noteAddressing`, and the reason is the
           * conditional in p.26's own sentence.** A `slice-ordinal` kind says *notes on this part
           * select slices*, and here that holds only *"when using the Grid and Slice machines
           * **and set SLICE to NOTE**"*. `SLICE` also takes a fixed number — p.98 proves it from
           * the other side, *"with SLICE set to 2 and LEN set to 3 the sample plays from the start
           * of slice 2 to the end of slice 4"* — and under a number the manual says nothing about
           * the step note, leaving p.53's general rule (*"Trig Note sets the pitch of the note when
           * trigged"*) in force. `dt2-vox-chop-bright` authors no `SLICE` at all, so this mode
           * cannot claim the note is an ordinal on it.
           *
           * Marking the mode would put the machine and the addressing one field apart with nothing
           * tying them, which is the drift `selectedBy` exists to stop, arriving through the door
           * it does not watch. **The mark belongs on a recipe that carries `SLICE NOTE` as a
           * param**, where the two cannot come apart — which is `CLAUDE.md`'s repair for the
           * TR-8S's tone table and the minilogue xd's `SHAPE`, and is what the Mini's
           * `beat-sliced` has by construction, its whole mode being one `PLAY MODE` value.
           *
           * A third route exists and is neither: p.28's **SLICES trig mode**, where *"the
           * [TRIG 1-16] keys trigger the slices defined by these machines"*. Keys, not notes, and
           * a global mode the reader chooses — recorded so the next reader does not find it and
           * think it changes the answer above.
           */
          id: 'sliced',
          label: 'SLICE / GRID',
          selectedBy: { param: 'SRC MACHINE', values: ['SLICE', 'GRID'] },
        },
        {
          /**
           * **No note, for a different reason.** p.17 makes any of the sixteen tracks a MIDI
           * track, and p.53 warns that *"MIDI tracks has a different set of parameters on the
           * TRIG, SRC, FLTR, and AMP page"* — a `NOTE` there is a note being sent out, not a
           * loaded sample's original pitch.
           *
           * No recipe names this mode and none is expected to: a MIDI track drives another box
           * rather than playing a part, and §2.2 has no role for that. It is declared because it
           * is the third thing a track can be, and leaving it out would make the table claim the
           * pool holds two kinds of member when the manual says three.
           * `test/elektron-digitakt-ii.test.ts` pins that no recipe selects it, so the day one
           * does, somebody re-reads p.53 first.
           */
          id: 'midi',
          label: 'MIDI',
          selectedBy: { param: 'SRC MACHINE', values: ['MIDI'] },
        },
      ],
      roles: [
        'kick', 'sub', 'bass-mid', 'snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat',
        'ride', 'metallic', 'tom', 'noise', 'texture', 'pad', 'lead', 'stab', 'arp', 'acid',
        'vox-chop', 'riser', 'impact', 'sweep',
      ],
      polyphony: 1,
    },
  ],

  /**
   * Twelve of sixteen. Every track spent on audio is a track not available as a MIDI track
   * (p.17), and MIDI tracks are a first-class use of this box rather than an afterthought — so a
   * rig that fills all sixteen has taken something away that the guide cannot show it taking.
   * The number is a judgement, like every `comfortableVoices` in this library; the manual states
   * no crowding threshold and could not.
   */
  comfortableVoices: 12,

  features: { perStep: [...PER_STEP] },

  hints: {
    'trig-params': 'Hold a [TRIG] key, turn DATA ENTRY',
    'micro-timing': 'Hold [TRIG], press [LEFT]/[RIGHT]',
    retrig: 'Press [TRIG PARAMETERS] twice',
    portamento: 'Press [TRIG PARAMETERS] twice, hold [TRIG]',
    machine: 'Hold [FUNC], press [SRC]',
  },

  recipes,
}
