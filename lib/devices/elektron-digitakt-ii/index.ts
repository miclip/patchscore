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
    title: 'Clap sitting over the snare, top end left in',
    verified: false,
    sourceAudio: {
      need: 'A stereo hand-clap one-shot, several hands rather than one',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(28)],
    articulation: [art('backbeat', { velocity: 110 }, 'trig-params')],
  },
  {
    id: 'dt2-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
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
    title: 'Open hat let ring, filter out of the way',
    verified: false,
    sourceAudio: {
      need: 'An open hat one-shot with a real tail to hold open',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('EQ'), ampMode('AHD'), hold(72)],
    articulation: [art('offbeat', { velocity: 108, 'note-length': 16 }, 'trig-params')],
  },
  {
    id: 'dt2-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
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
    title: 'Metallic hit through the resonant comb',
    verified: false,
    sourceAudio: {
      need: 'A struck metal one-shot — bell, spring, pipe, anvil; inharmonic is the point',
    },
    params: [src('ONESHOT'), play('FORWARD'), fltr('COMB+'), ampMode('AHD'), hold(40)],
    articulation: [art('offbeat', { velocity: 96 }, 'trig-params')],
  },
  {
    id: 'dt2-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'track',
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
    id: 'dt2-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'Sample played backwards into the change',
    verified: false,
    sourceAudio: {
      need:
        'A sample with a long decaying tail — REVERSE turns that tail into the rise, so the tail ' +
        'is the part that matters',
    },
    params: [src('ONESHOT'), play('REVERSE'), fltr('MULTI-MODE'), ampMode('ADSR'), lfoMode('ONE'), fade(-48)],
    articulation: [art('last-hit', { velocity: 127, 'note-length': 48 }, 'trig-params')],
  },
  {
    id: 'dt2-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
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
     * are worth naming here because two other boxes in this library pass the first and fail the
     * second (see the TR-8S and TR-1000 manifests):
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

  capabilityEvidence: {
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

  /**
   * §2.2. One pool of sixteen, `polyphony: 1` — see the module JSDoc for why that needs p.15 and
   * p.17 together rather than either alone.
   *
   * The pool carries every role because a sampler's track is whatever is loaded into it. That is
   * the Tracker Mini's argument on a box with twice the tracks.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 16,
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
    machine: 'Hold [FUNC], press [SRC]',
  },

  recipes,
}
