import type { Device, Recipe } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { MC_101_PANEL } from './panel'

/**
 * Roland MC-101 (§2.3). A four-track groovebox, and the fifth device in §2.5's seed order.
 *
 * **Two manuals, and the split matters.** Roland ships an Owner's Manual that names the controls
 * and a Reference Manual that documents parameter ranges (`manuals/README.md`), and on top of
 * that an Update manual carrying everything added after the box shipped. All three are cited
 * here and they answer different questions:
 *
 *  - `MC-101 Reference Manual eng01` — the part, pad and clip parameter tables (pp.45-51), the
 *    91 MFX types (pp.52-87), the panel (pp.4-6). It has **no specifications section**: it ends
 *    at the block diagram on p.89, so it states no polyphony, no dimensions and no jack sizes.
 *  - `MC-101 Owner's Manual eng02` — the specifications, and so the panel span (§10).
 *  - `MC-101 Update eng08` — Ver.1.80's **tone partial editor**, which is where the synthesis
 *    parameters actually live. Without it a tone recipe can only reach the part-level *offsets*
 *    on p.45; with it there is a real filter, two real LFOs and four real envelopes. Every value
 *    it carries is cited with its version, because a reader on Ver.1.11 does not have the screen.
 *
 * ## Why two pools, and what each one is
 *
 * The box has four tracks (Reference p.7: *"The MC-101 can simultaneously play back up to four
 * independent tracks"*), and a track is created as one of four types — TONE, DRUM, DRUM + COMP,
 * LOOPER (p.16). Modelling the four tracks as one pool of four assignables is the literal
 * reading and it is **wrong about the machine**: a DRUM track is not one part, it is a kit of
 * sixteen, *"16 instruments … one instrument to each pad"* (p.17), and each pad has its own
 * level, pan, tuning, filter offsets, sends and EQ (`PAD CTRL` / `PAD EQ`, p.47). A guide that
 * said "MC-101 Track 1 = kick, Track 2 = snare" would be telling you to spend half the box on
 * two drums that belong on two pads of one track.
 *
 * So the pools are the two granularities the box actually has:
 *
 *  - `drum-pad`, **8** — the pads of one DRUM track. Percussive roles, one sample each.
 *  - `tone-track`, **3** — the tracks left over, as TONE tracks. Tonal roles.
 *
 * 8 + 3 is a *configuration the box can hold*: one drum track plus three tone tracks is four
 * tracks. It is not the only one — four TONE tracks and no drums is equally legal, and so is a
 * second drum kit — and the model cannot say that, exactly as the Tracker Mini's model cannot
 * say that its synth pool is a subset of its sample pool. The honest cost is recorded here
 * rather than fudged: **this device is authored as one drum kit plus three tone parts**, and a
 * rig that wants a fourth tonal part on an MC-101 gets an honest gap.
 *
 * **The kit has sixteen pads and the pool declares eight**, which is §2.1's rule rather than a
 * rounding: *"`count` bounds what the resolver may consider, not what the hardware has… above
 * that headroom the extra members are unreachable, and no guide exists that a larger count
 * could produce and a smaller one could not."* The busiest template in the library asks for
 * seven percussive parts, so pads 9-16 could never be occupied by anything; declaring them
 * would add eight cells to the panel and eight branches to the search in exchange for nothing.
 * Eight is one clear of that worst case, and `test/mc-101.test.ts` measures the worst case
 * against the count rather than trusting this paragraph — so a template that ever asks for a
 * ninth percussive part fails there instead of quietly losing a part.
 *
 * A note on ordinals (§2.2): pool ordinals start at 1, so `tone-track` expands to "TONE Track
 * 1-3" while the panel calls the tracks 1-4. The `routing` lines say so — the pads are numbered
 * 1-16 and do match.
 *
 * ## What is not modelled, and why
 *
 *  - **LOOPER tracks.** A looper track plays audio you recorded, which is not a role request
 *    the resolver has anything to say about. It costs a track when you use one, and that is the
 *    argument for `comfortableVoices` below rather than for a third pool.
 *  - **DRUM + COMP** (p.16, *"maximum one track"*) is a drum track with six compressors
 *    (`DRUM COMP1-6`, p.46) rather than a fifth kind of part. `OUT ASSIGN` on a pad already
 *    names `COMP1`-`COMP6`, so a recipe can reach it without a pool of its own.
 *  - **Sidechain.** `features.sidechain` is omitted, not declared false. The box has no
 *    sidechain input and no sidechain compressor; what it has is MOTION DESIGNER, described as
 *    *"a convenient way to create effects such as ducking (side-chain)"* (p.27) — you draw the
 *    duck as a motion curve, step by step. That is a different mechanism and `{ internal,
 *    fromExternalAudio }` cannot say it; declaring it would render as "declared, no source
 *    listed", which is worse than the absence.
 *  - **Step counts and clip length.** `Step Length 1-128` and `Scale` (p.37) are real
 *    parameters and are deliberately not authored: §3's rule is that a recipe never authors
 *    step counts or bar structure, and clip length is exactly that.
 *
 * ## Two manual defects, quoted rather than repaired
 *
 * The Reference Manual carries uncorrected MC-707 text in two places, and both contradict the
 * four-track statements on pp.4, 7, 16 and 40: *"Up to eight track types can be freely combined
 * in each track"* (p.16), and *"TRACK 1-8: Output of tracks 1-8"* in the Scatter Position
 * explanation (p.32). Nothing here is authored from either sentence.
 *
 * ## Citation regime
 *
 * §3.2's split, as the Tracker Mini states it: **legality is cited, authority is not.** Every
 * range and every option set carries the page that prints it; every point stays
 * `verified: false`, because no page says which value suits a dark kick.
 *
 * Capability data — track count, clock, per-step lanes — is **not yet migrated** and its pages are
 * still in the comments below. §2.6/#22 gives capability facts a home in `capabilityEvidence`,
 * keyed by field path, and this manifest has moved exactly one fact into it; the TR-1000 is the
 * one that has moved all of them. Nothing forces the rest, because this box declares no jacks and
 * no clock setup — the two families §2.6 makes mandatory — and invariant 4 is scoped to parameter
 * values. It is a debt of authoring, and it is worth naming as one rather than letting a comment
 * read as the settled regime.
 *
 * The one entry is `clock.preferredSource`, and it is there because #80 asked a question this
 * manifest had no way to answer in the negative. A page reference in a comment is a page nothing
 * rechecks; a recorded non-claim is a decision the audit counts. See the `clock` comment.
 *
 * One thing that regime cannot cover, and it is a real gap rather than an oversight:
 * **the per-step lanes have no printed ranges.** p.22 and p.23 name `VEL`, `STA`, `LEN`, `MTE`
 * and `SUB` and describe what each does, and print no bounds for any of them — only MTE's
 * "with a setting of 0" and SUB's "1/2" and "1/3" examples. So every articulation value below is
 * provisional, and stays that way until somebody reads them off a unit.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The Reference Manual. Printed page number and PDF page agree throughout this document. */
function ref(page: number): Cite {
  return { kind: 'manual', source: `MC-101 Reference Manual eng01, p.${page}` }
}

/**
 * The Update manual, which is organised by firmware version rather than by subject. The version
 * travels in the citation because it is load-bearing: a reader on the shipping firmware does not
 * have the screen these values are on.
 */
function upd(page: number, version: string): Cite {
  return { kind: 'manual', source: `MC-101 Update eng08, p.${page} (Ver.${version})` }
}

// ---------------------------------------------------------------------------
// Ranges, exactly as the manuals' Value columns print them
// ---------------------------------------------------------------------------

type Bounds = { min: number; max: number; verified: Cite }

/** `Part Parameter (KNOB CTRL)`, p.45 — the part layer of a TONE track. */
const PART_LEVEL: Bounds = { min: 0, max: 127, verified: ref(45) } //          0-127
const PART_PAN: Bounds = { min: -64, max: 63, verified: ref(45) } //           L64-0-63R
const PART_SEND: Bounds = { min: 0, max: 127, verified: ref(45) } //           0-127
const COARSE_TUNE: Bounds = { min: -48, max: 48, verified: ref(45) } //        -48-+48
const FINE_TUNE: Bounds = { min: -50, max: 50, verified: ref(45) } //          -50-+50
const PART_OFFSET: Bounds = { min: -64, max: 63, verified: ref(45) } //        -64-+63
const OCT_SHIFT: Bounds = { min: -3, max: 3, verified: ref(45) } //            -3-+3
const PORTA_TIME: Bounds = { min: 0, max: 127, verified: ref(45) } //          0-127, TONE

/** `PAD CTRL` and `PAD EQ`, p.47 — the per-key layer of a DRUM kit. */
const PAD_LEVEL: Bounds = { min: 0, max: 127, verified: ref(47) } //           0-127
const PAD_PAN: Bounds = { min: -64, max: 63, verified: ref(47) } //            L64-0-63R
const PAD_SEND: Bounds = { min: 0, max: 127, verified: ref(47) } //            0-127
const KEY_OFFSET: Bounds = { min: -24, max: 24, verified: ref(47) } //         -24-+24
const PAD_FINE: Bounds = { min: -50, max: 50, verified: ref(47) } //           -50-+50 [cent]
const PAD_OFFSET: Bounds = { min: -100, max: 100, verified: ref(47) } //       -100-+100
const PAD_EQ_GAIN: Bounds = { min: -24, max: 24, verified: ref(47) } //        -24.0-+24.0 [dB]
const PAD_EQ_FREQ: Bounds = { min: 20, max: 16000, verified: ref(47) } //      20-16000 [Hz]

/** Clip settings, p.37. */
const SHUFFLE: Bounds = { min: -50, max: 50, verified: ref(37) } //            -50-+50

/** MFX parameters, pp.54-70. Each carries the page of its own effect's table. */
const MFX_LEVEL_54: Bounds = { min: 0, max: 127, verified: ref(54) } //        0-127
const SUPER_FILTER_CUTOFF: Bounds = { min: 0, max: 127, verified: ref(54) } // 0-127
const SUPER_FILTER_RESO: Bounds = { min: 0, max: 100, verified: ref(54) } //   0-100
const BOOST_GAIN: Bounds = { min: 0, max: 12, verified: ref(54) } //           0-+12 [dB]
const OD_DRIVE: Bounds = { min: 0, max: 127, verified: ref(63) } //            0-127
const OD_TONE: Bounds = { min: 0, max: 127, verified: ref(63) } //             0-127
const OD_GAIN: Bounds = { min: -15, max: 15, verified: ref(63) } //            -15-+15 [dB]
const CRUSH_RATE: Bounds = { min: 0, max: 127, verified: ref(70) } //          0-127
const CRUSH_BITS: Bounds = { min: 0, max: 20, verified: ref(70) } //           0-20
const CRUSH_LEVEL: Bounds = { min: 0, max: 127, verified: ref(70) } //         0-127

/** The Ver.1.80 tone partial editor, Update pp.1-3. */
const PARTIAL_1023: Bounds = { min: 0, max: 1023, verified: upd(2, '1.80') } //   0-1023
const PARTIAL_ENV_DEPTH: Bounds = { min: -63, max: 63, verified: upd(2, '1.80') } // -63-+63
const PARTIAL_KEY_FOLLOW: Bounds = { min: -200, max: 200, verified: upd(2, '1.80') } // -200-+200
const LFO_RATE: Bounds = { min: 0, max: 1023, verified: upd(3, '1.80') } //       0-1023
const LFO_DEPTH: Bounds = { min: -100, max: 100, verified: upd(3, '1.80') } //    -100-+100
const LFO_PAN_DEPTH: Bounds = { min: -63, max: 63, verified: upd(3, '1.80') } //  -63-+63
const ANALOG_FEEL: Bounds = { min: 0, max: 127, verified: upd(1, '1.80') } //     0-127
const SUPERSAW_DETUNE: Bounds = { min: 0, max: 127, verified: upd(2, '1.80') } // 0-127
const PARTIAL_LEVEL: Bounds = { min: 0, max: 127, verified: upd(1, '1.80') } //   0-127

// ---------------------------------------------------------------------------
// Option sets. The set is the box's claim (§3.2); which one this recipe reaches for is taste.
// ---------------------------------------------------------------------------

/** p.45: "MONO, POLY, TONE". TONE defers to the tone's own setting. */
const MONO_POLY = ['MONO', 'POLY', 'TONE']

/** p.45: "OFF, ON, TONE". */
const OFF_ON_TONE = ['OFF', 'ON', 'TONE']

/**
 * p.47: "DRY, MFX, COMP1-6", expanded. The six compressors are the DRUM + COMP track type's
 * (p.16, p.46); on a plain DRUM track only DRY and MFX are reachable, which is why a recipe
 * naming a COMP says so in its `routing`.
 */
const PAD_OUT_ASSIGN = ['DRY', 'MFX', 'COMP1', 'COMP2', 'COMP3', 'COMP4', 'COMP5', 'COMP6']

/**
 * p.47: "OFF, 1-31", expanded — "The Mute Group function allows you to designate two or more
 * keys that are not allowed to sound simultaneously." This is how a closed hat chokes an open
 * one on this box, and it is the reason both hat recipes name the same group.
 */
const MUTE_GROUPS = ['OFF', ...Array.from({ length: 31 }, (_, i) => String(i + 1))]

/** Update p.1, Ver.1.80, `OSC (OSC TYPE)`. */
const OSC_TYPES = ['PCM', 'VA', 'PCM-Sync', 'SuperSAW', 'Noise']

/** Update p.1, Ver.1.80, `WAV (VA: WAVE FORM)`. */
const VA_WAVES = ['SAW', 'SQR', 'TRI', 'SIN', 'RAMP', 'JUNO', 'TRI2', 'TRI3', 'SIN2']

/** Update p.2, Ver.1.80. The two filter families, and each family's own type list. */
const FILTER_FAMILY = ['TVF', 'VCF']
const TVF_TYPES = ['OFF', 'LPF', 'BPF', 'HPF', 'PKG', 'LPF2', 'LPF3']
const VCF_TYPES = ['FLAT', 'TYPE-JP', 'TYPE-M', 'TYPE-P']

/**
 * Update p.2, Ver.1.80: "-12, -18, -24 [dB/Oct]". Authored as an enum rather than a numeric
 * because the box offers exactly three slopes, and as bare strings rather than with a `dB/Oct`
 * unit because a unit belongs to a numeric scale and this is a three-way switch.
 */
const FILTER_SLOPES = ['-12', '-18', '-24']

/** Update p.3, Ver.1.80, `WAV (WAVE TYPE)` for LFO 1/2. */
const LFO_WAVES = ['SIN', 'TRI', 'SAW-UP', 'SAW-DW', 'SQR', 'RND', 'TRP', 'S&H', 'CHS', 'VSIN', 'STEP']

/** p.54, `05 Super Filter`: "LPF, BPF, HPF, NOTCH". */
const SUPER_FILTER_TYPES = ['LPF', 'BPF', 'HPF', 'NOTCH']

/** p.54, `04 Low Boost`: the nine centre frequencies it offers, in Hz. */
const BOOST_FREQS = ['50', '56', '63', '71', '80', '90', '100', '112', '125']

/** p.54, `04 Low Boost`: "WIDE, MID, NARROW". */
const BOOST_WIDTHS = ['WIDE', 'MID', 'NARROW']

/**
 * p.52, the whole MFX type list, 00-90. Listed in full rather than narrowed to what is
 * authored: an option set is a claim about the *box*, and a shortened one would say the MC-101
 * offers eight effects. Names are the manual's own, including the arrow in the combination
 * names — the text layer renders it as a digit, the rendered page shows an arrow.
 */
const MFX_TYPES = [
  '00 Thru',
  '01 Equalizer', '02 Spectrum', '03 Isolator', '04 Low Boost', '05 Super Filter',
  '06 Step Filter', '07 Enhancer', '08 Auto Wah', '09 Humanizer', '10 Speaker Simulator',
  '11 Phaser 1', '12 Phaser 2', '13 Phaser 3', '14 Step Phaser', '15 Multi Stage Phaser',
  '16 Infinite Phaser', '17 Ring Modulator', '18 Tremolo', '19 Auto Pan', '20 Slicer',
  '21 Rotary', '22 VK Rotary',
  '23 Chorus', '24 Flanger', '25 Step Flanger', '26 Hexa-Chorus', '27 Tremolo Chorus',
  '28 Space-D',
  '29 Overdrive', '30 Distortion', '31 T-Scream', '32 Guitar Amp Simulator', '33 Compressor',
  '34 Limiter', '35 Sustainer', '36 Gate',
  '37 Delay', '38 Modulation Delay', '39 3Tap Pan Delay', '40 4Tap Pan Delay',
  '41 Multi Tap Delay', '42 Reverse Delay', '43 Time Ctrl Delay', '44 Tape Echo',
  '45 LOFI Compress', '46 Bit Crusher',
  '47 Pitch Shifter', '48 2Voice Pitch Shifter',
  '49 Overdrive → Chorus', '50 Overdrive → Flanger', '51 Overdrive → Delay',
  '52 Distortion → Chorus', '53 Distortion → Flanger', '54 Distortion → Delay',
  '55 OD/DS → TouchWah', '56 OD/DS → AutoWah', '57 GtAmpSim → Chorus', '58 GtAmpSim → Flanger',
  '59 GtAmpSim → Phaser', '60 GtAmpSim → Delay', '61 EPAmpSim → Tremolo',
  '62 EPAmpSim → Chorus', '63 EPAmpSim → Flanger', '64 EPAmpSim → Phaser',
  '65 EPAmpSim → Delay', '66 Enhancer → Chorus', '67 Enhancer → Flanger',
  '68 Enhancer → Delay', '69 Chorus → Delay', '70 Flanger → Delay', '71 Chorus → Flanger',
  '72 CE-1', '73 SBF-325', '74 SDD-320', '75 2Tap Pan Delay', '76 Transient', '77 Mid-Side EQ',
  '78 Mid-Side Compressor', '79 Tone Fattener', '80 Mid-Side Delay', '81 RD EPAmpSim',
  '82 DJFX Looper', '83 BPM Looper', '84 Saturator', '85 Warm Saturator', '86 Fuzz',
  '87 JUNO-106 Chorus', '88 Multi Mode Filter', '89 HMS Distortion', '90 Phaser 100',
]

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

function num(
  name: string,
  value: number,
  bounds: Bounds,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return { kind: 'numeric', name, value, range: { ...bounds }, verified: false, ...extra }
}

/**
 * An enum, with its two claims kept apart (§3.2): the option *set* is legality and carries the
 * page that prints it, the selected *value* is taste and stays provisional.
 */
function pick(name: string, value: string, values: string[], cite: Cite): AuthoredEnumParam {
  return { kind: 'enum', name, value, options: { values, verified: cite }, verified: false }
}

/**
 * §6.1's swing axis, as an ordinary cited numeric.
 *
 * p.37, the clip's own `Shuffle`: *"Adjusts the strength of shuffle (bounce) for the playback
 * timing. This can be set individually for each clip."* Range `-50-+50`, and `amount: 50` is the
 * distance from 0 to each printed bound, so the whole travel of the knob is reachable and no
 * part of it is spent against a clamp.
 *
 * **The manual does not print a neutral**, unlike the Tracker Mini's Swing FX where "50% is no
 * swing" is on the page. 0 sitting at the centre of a symmetric signed range is the obvious
 * reading and it is still a reading, so it stays `verified: false` like every other point here
 * and the `note` says only what the page says: one setting, per clip.
 */
function shuffle(): AuthoredNumericParam {
  return num('SHUFFLE', 0, SHUFFLE, {
    mood: [{ axis: 'swing', amount: 50 }],
    hint: 'open-clip',
    note: 'One setting for the whole clip, not per step',
  })
}

/** A pad's pan, which the box displays as `L64-0-63R` rather than as a signed number. */
function padPan(value: number): AuthoredNumericParam {
  return num('PAN', value, PAD_PAN, { note: 'Shown as L64-0-63R; negative is left' })
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * What a DRUM kit pad can carry. A pad holds one instrument or one sample (p.17) and plays it
 * at one pitch per hit, so the tonal roles are not here — a pitched line belongs on a TONE
 * track, which is what the other pool is.
 */
const DRUM_PAD_ROLES: Role[] = [
  'kick',
  'snare',
  'clap',
  'rim',
  'ghost-perc',
  'closed-hat',
  'open-hat',
  'ride',
  'metallic',
  'tom',
  'noise',
  'impact',
]

/**
 * What a TONE track can carry. p.16: *"This is a synthesizer sound engine. It can also be used
 * as a pitched sampler"* — which is why `vox-chop` is here alongside the synth roles.
 */
const TONE_ROLES: Role[] = [
  'sub',
  'bass-mid',
  'pad',
  'lead',
  'stab',
  'arp',
  'acid',
  'vox-chop',
  'texture',
  'riser',
  'sweep',
]

// ---------------------------------------------------------------------------
// Drum kit pads
// ---------------------------------------------------------------------------

/**
 * Pad recipes reach for `PAD CTRL` and `PAD EQ` (p.47) and nothing else, and the omission is
 * deliberate: **MFX on a drum track belongs to the kit, not to the pad.** The KIT EDIT menu's
 * MULTI FX is one effect for all sixteen instruments (p.34, p.46), so two pad recipes each
 * naming a different MFX type would describe a kit the box cannot hold — the same class of
 * mistake as authoring a fourth Tracker Mini synth against three slots, and unlike that one it
 * would be invisible until somebody stood at the machine.
 *
 * What *is* per-pad is which pads reach that shared effect at all: `OUT ASSIGN` selects
 * `DRY`, `MFX` or one of the six compressors, per key (p.47). So the recipes say whether a pad
 * is in the kit's effect or out of it, and leave what that effect is to the reader.
 */
const DRUM_RECIPES: Recipe[] = [
  {
    id: 'mc101-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'drum-pad',
    title: 'Tight kick, tuned down, no tail on it',
    params: [
      num('LEVEL', 118, PAD_LEVEL),
      num('KEY OFFSET', -2, KEY_OFFSET, { unit: 'st', mood: [{ axis: 'darkness', amount: -3 }] }),
      num('CUTOFF OFST', 24, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -34 }] }),
      num('DECAY OFST', -34, PAD_OFFSET, { mood: [{ axis: 'density', amount: -22 }] }),
      num('RELEASE OFST', -46, PAD_OFFSET),
      pick('OUT ASSIGN', 'DRY', PAD_OUT_ASSIGN, ref(47)),
      num('REVERB SEND', 0, PAD_SEND),
      shuffle(),
    ],
    articulation: [
      { slot: 'accent', set: { velocity: 120 }, hint: 'edit-step' },
      { slot: 'ghost', set: { velocity: 54 }, hint: 'weak-hit' },
    ],
    routing: 'OUT ASSIGN DRY keeps the kick clear of whatever the kit MFX is doing',
    verified: false,
  },
  {
    id: 'mc101-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'drum-pad',
    title: 'Long low kick that owns the bottom of the kit',
    params: [
      num('LEVEL', 122, PAD_LEVEL),
      num('KEY OFFSET', -7, KEY_OFFSET, { unit: 'st', mood: [{ axis: 'darkness', amount: -4 }] }),
      num('FINE OFST', -12, PAD_FINE, { unit: 'c' }),
      num('CUTOFF OFST', -18, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -30 }] }),
      num('DECAY OFST', 42, PAD_OFFSET, { mood: [{ axis: 'density', amount: -26 }] }),
      pick('EQ SWITCH', 'ON', ['OFF', 'ON'], ref(47)),
      num('LOW GAIN', 4, PAD_EQ_GAIN, { unit: 'dB', hint: 'open-sound' }),
      num('LOW FREQ', 63, PAD_EQ_FREQ, { unit: 'Hz' }),
      pick('OUT ASSIGN', 'DRY', PAD_OUT_ASSIGN, ref(47)),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { velocity: 112 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'drum-pad',
    title: 'Flat, forward snare with the tail cut short',
    params: [
      num('LEVEL', 112, PAD_LEVEL),
      num('KEY OFFSET', 1, KEY_OFFSET, { unit: 'st' }),
      num('ATTACK OFST', -28, PAD_OFFSET),
      num('DECAY OFST', -24, PAD_OFFSET, { mood: [{ axis: 'density', amount: -20 }] }),
      num('CUTOFF OFST', 18, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -30 }] }),
      num('REVERB SEND', 14, PAD_SEND, { mood: [{ axis: 'space', amount: 34 }] }),
      pick('OUT ASSIGN', 'MFX', PAD_OUT_ASSIGN, ref(47)),
      shuffle(),
    ],
    articulation: [
      { slot: 'backbeat', set: { velocity: 116 }, hint: 'edit-step' },
      { slot: 'fill', set: { 'sub-step': '1/2' }, hint: 'edit-step' },
    ],
    routing: 'OUT ASSIGN MFX puts this pad through the kit effect; the kick stays DRY',
    verified: false,
  },
  {
    id: 'mc101-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'drum-pad',
    title: 'Wide clap sitting above the snare',
    params: [
      num('LEVEL', 104, PAD_LEVEL),
      padPan(9),
      num('CUTOFF OFST', 38, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('FINE OFST', 18, PAD_FINE, { unit: 'c' }),
      num('RELEASE OFST', 22, PAD_OFFSET),
      num('REVERB SEND', 34, PAD_SEND, { mood: [{ axis: 'space', amount: 40 }] }),
      num('DELAY SEND', 10, PAD_SEND, { mood: [{ axis: 'space', amount: 22 }] }),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { velocity: 108, 'start-timing': 2 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'drum-pad',
    title: 'Short closed hat, choking the open one',
    params: [
      num('LEVEL', 88, PAD_LEVEL),
      padPan(-14),
      pick('MUTE GRP', '1', MUTE_GROUPS, ref(47)),
      num('CUTOFF OFST', 46, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -36 }] }),
      num('DECAY OFST', -52, PAD_OFFSET, { mood: [{ axis: 'density', amount: -18 }] }),
      num('RELEASE OFST', -58, PAD_OFFSET),
      shuffle(),
    ],
    articulation: [
      { slot: 'offbeat', set: { 'start-timing': 3 }, hint: 'edit-step' },
      { slot: 'ghost', set: { velocity: 44 }, hint: 'weak-hit' },
    ],
    routing: 'Same MUTE GRP as the open hat, so one cuts the other off',
    verified: false,
  },
  {
    id: 'mc101-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'drum-pad',
    title: 'Half-open hat, more air than sizzle',
    params: [
      num('LEVEL', 84, PAD_LEVEL),
      padPan(16),
      pick('MUTE GRP', '1', MUTE_GROUPS, ref(47)),
      num('CUTOFF OFST', -22, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -34 }] }),
      num('RELEASE OFST', -14, PAD_OFFSET, { mood: [{ axis: 'density', amount: -24 }] }),
      pick('EQ SWITCH', 'ON', ['OFF', 'ON'], ref(47)),
      num('HIGH GAIN', -5, PAD_EQ_GAIN, { unit: 'dB', hint: 'open-sound' }),
      num('REVERB SEND', 20, PAD_SEND, { mood: [{ axis: 'space', amount: 30 }] }),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { velocity: 92 }, hint: 'edit-step' }],
    routing: 'Same MUTE GRP as the closed hat',
    verified: false,
  },
  {
    id: 'mc101-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'drum-pad',
    title: 'Dry rim, hard left, nothing on it',
    params: [
      num('LEVEL', 78, PAD_LEVEL),
      padPan(-34),
      num('KEY OFFSET', 3, KEY_OFFSET, { unit: 'st' }),
      num('DECAY OFST', -62, PAD_OFFSET),
      pick('OUT ASSIGN', 'DRY', PAD_OUT_ASSIGN, ref(47)),
      num('REVERB SEND', 0, PAD_SEND, { mood: [{ axis: 'space', amount: 24 }] }),
      shuffle(),
    ],
    verified: false,
  },
  {
    id: 'mc101-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'drum-pad',
    title: 'Low tom, pitched down, long enough to bend',
    params: [
      num('LEVEL', 100, PAD_LEVEL),
      num('KEY OFFSET', -9, KEY_OFFSET, { unit: 'st', mood: [{ axis: 'darkness', amount: -5 }] }),
      num('CUTOFF OFST', -12, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -32 }] }),
      num('DECAY OFST', 36, PAD_OFFSET, { mood: [{ axis: 'density', amount: -28 }] }),
      num('REVERB SEND', 26, PAD_SEND, { mood: [{ axis: 'space', amount: 32 }] }),
      shuffle(),
    ],
    articulation: [{ slot: 'fill', set: { velocity: 104, 'sub-step': '1/3' }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'drum-pad',
    title: 'Quiet percussion filling the gaps, half of it missing',
    params: [
      num('LEVEL', 56, PAD_LEVEL),
      padPan(22),
      num('CUTOFF OFST', -30, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -26 }] }),
      num('DECAY OFST', -44, PAD_OFFSET),
      num('DELAY SEND', 22, PAD_SEND, { mood: [{ axis: 'space', amount: 30 }] }),
      shuffle(),
    ],
    articulation: [
      { slot: 'ghost', set: { velocity: 38, 'mute-probability': 48 }, hint: 'edit-step' },
    ],
    routing: 'MTE is a *mute* probability: 0 sounds every time, higher drops more hits',
    verified: false,
  },
  {
    id: 'mc101-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'drum-pad',
    title: 'Detuned metal hit, resonant and slightly wrong',
    params: [
      num('LEVEL', 92, PAD_LEVEL),
      num('KEY OFFSET', 7, KEY_OFFSET, { unit: 'st' }),
      num('FINE OFST', -34, PAD_FINE, { unit: 'c', mood: [{ axis: 'grit', amount: 16 }] }),
      num('RESO OFST', 58, PAD_OFFSET, { mood: [{ axis: 'grit', amount: 30 }] }),
      num('CUTOFF OFST', 30, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -34 }] }),
      pick('EQ SWITCH', 'ON', ['OFF', 'ON'], ref(47)),
      num('MID GAIN', 6, PAD_EQ_GAIN, { unit: 'dB', hint: 'open-sound' }),
      pick('OUT ASSIGN', 'MFX', PAD_OUT_ASSIGN, ref(47)),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 110 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'drum-pad',
    title: 'One-shot crash marking the top of a section',
    params: [
      num('LEVEL', 116, PAD_LEVEL),
      num('KEY OFFSET', -3, KEY_OFFSET, { unit: 'st' }),
      num('RELEASE OFST', 64, PAD_OFFSET, { mood: [{ axis: 'density', amount: -30 }] }),
      num('CUTOFF OFST', 26, PAD_OFFSET, { mood: [{ axis: 'darkness', amount: -38 }] }),
      num('REVERB SEND', 52, PAD_SEND, { mood: [{ axis: 'space', amount: 40 }] }),
      pick('OUT ASSIGN', 'MFX', PAD_OUT_ASSIGN, ref(47)),
      shuffle(),
    ],
    articulation: [{ slot: 'first-hit', set: { velocity: 127 }, hint: 'edit-step' }],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Tone tracks
// ---------------------------------------------------------------------------

/**
 * Tone recipes work at two depths, and which one a recipe reaches for is a real choice rather
 * than a stylistic one.
 *
 * **The part layer** (`Part Parameter (KNOB CTRL)`, p.45) is a set of *offsets* against whatever
 * tone is loaded: `Cutoff Offset -64-+63`, `Decay Time Offset -64-+63`, and so on. It is what
 * the [C1]-[C4] knobs address, it is what MOTION records, and it works on the firmware the box
 * shipped with. A value here means "move the loaded tone this far", not "set the filter here".
 *
 * **The partial layer** (Update p.1-3) is the Ver.1.80 tone partial editor, and it is absolute:
 * `CUT 0-1023`, `RES 0-1023`, four envelopes, two LFOs. It says what the sound *is* rather than
 * how far it has been nudged.
 *
 * The two are never mixed inside one recipe. A guide that listed `CUTOFF 18` and `CUT 640` in
 * one block would be asking a reader to hold two different meanings of the same word on one
 * screen, and the offset one only means anything relative to a preset the guide does not name.
 * So the offset recipes stay honest about being offsets, and the three that describe a sound
 * from the ground up — `acid`, `lead`, `riser` — say Ver.1.80 in every citation they carry.
 *
 * MFX *is* per tone here (the MULTI FX entry of the TONE EDIT menu, p.33), unlike on a drum
 * track where it belongs to the kit — so a tone recipe may name a type and set its parameters.
 */
const TONE_RECIPES: Recipe[] = [
  {
    id: 'mc101-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'tone-track',
    title: 'Sine sub, one note at a time, nothing above the fundamental',
    params: [
      pick('MONO/POLY', 'MONO', MONO_POLY, ref(45)),
      num('OCT SHIFT', -1, OCT_SHIFT),
      num('CUTOFF', -34, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -20 }] }),
      num('RESONANCE', -18, PART_OFFSET),
      num('ATTACK', -20, PART_OFFSET),
      num('RELEASE', -24, PART_OFFSET, { mood: [{ axis: 'density', amount: -16 }] }),
      pick('MFX TYPE', '04 Low Boost', MFX_TYPES, ref(52)),
      pick('BOOST FREQUENCY', '63', BOOST_FREQS, ref(54)),
      num('BOOST GAIN', 5, BOOST_GAIN, { unit: 'dB', hint: 'open-sound' }),
      pick('BOOST WIDTH', 'NARROW', BOOST_WIDTHS, ref(54)),
      num('REVERB SEND', 0, PART_SEND),
      shuffle(),
    ],
    routing: 'Keep the sub mono and dry — the reverb and delay sends stay at 0',
    articulation: [{ slot: 'downbeat', set: { 'note-length': 12 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'tone-track',
    title: 'Overdriven mid bass with a bit of slide between notes',
    params: [
      pick('MONO/POLY', 'MONO', MONO_POLY, ref(45)),
      pick('PORTAMENT', 'ON', OFF_ON_TONE, ref(45)),
      num('PORTA TIME', 18, PORTA_TIME, { note: 'TONE is also selectable, deferring to the tone' }),
      num('CUTOFF', 12, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -22 }] }),
      num('RESONANCE', 16, PART_OFFSET, { mood: [{ axis: 'grit', amount: 14 }] }),
      num('DECAY', -14, PART_OFFSET, { mood: [{ axis: 'density', amount: -14 }] }),
      pick('MFX TYPE', '29 Overdrive', MFX_TYPES, ref(52)),
      num('DRIVE', 62, OD_DRIVE, { mood: [{ axis: 'grit', amount: 34 }], hint: 'open-sound' }),
      num('TONE', 74, OD_TONE, { mood: [{ axis: 'darkness', amount: -26 }] }),
      num('HIGH GAIN', -4, OD_GAIN, { unit: 'dB' }),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { 'motion-sound': 96 }, hint: 'motion-step' }],
    verified: false,
  },
  {
    id: 'mc101-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'tone-track',
    title: 'Resonant mono line, filter envelope doing the work',
    params: [
      pick('OSC', 'VA', OSC_TYPES, upd(1, '1.80')),
      pick('WAV', 'SAW', VA_WAVES, upd(1, '1.80')),
      pick('M/P', 'MONO', ['MONO', 'POLY'], upd(1, '1.80')),
      pick('PRT', 'ON', ['OFF', 'ON'], upd(1, '1.80')),
      pick('TVF/VCF', 'VCF', FILTER_FAMILY, upd(2, '1.80')),
      pick('TYP', 'TYPE-JP', VCF_TYPES, upd(2, '1.80')),
      pick('SLP', '-24', FILTER_SLOPES, upd(2, '1.80')),
      num('CUT', 316, PARTIAL_1023, { mood: [{ axis: 'darkness', amount: -180 }] }),
      num('RES', 780, PARTIAL_1023, { mood: [{ axis: 'grit', amount: 140 }] }),
      num('ENV', 48, PARTIAL_ENV_DEPTH, { mood: [{ axis: 'grit', amount: 12 }] }),
      num('T3D', 240, PARTIAL_1023, { mood: [{ axis: 'density', amount: -90 }], note: 'Filter envelope decay' }),
      num('ANL', 34, ANALOG_FEEL, { mood: [{ axis: 'grit', amount: 26 }] }),
      shuffle(),
    ],
    routing: 'Ver.1.80 or later — the partial editor is SHIFT + [SOUND], then PARTIAL',
    articulation: [{ slot: 'accent', set: { 'motion-filter': 118 }, hint: 'motion-step' }],
    verified: false,
  },
  {
    id: 'mc101-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'tone-track',
    title: 'Slow polyphonic pad, opening under the drums',
    params: [
      pick('MONO/POLY', 'POLY', MONO_POLY, ref(45)),
      num('ATTACK', 34, PART_OFFSET, { mood: [{ axis: 'density', amount: -18 }] }),
      num('RELEASE', 40, PART_OFFSET, { mood: [{ axis: 'space', amount: 16 }] }),
      num('CUTOFF', -12, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -24 }] }),
      num('VIB RATE', -14, PART_OFFSET),
      num('VIB DEPTH', 8, PART_OFFSET),
      num('REVERB SEND', 68, PART_SEND, { mood: [{ axis: 'space', amount: 40 }] }),
      num('DELAY SEND', 24, PART_SEND, { mood: [{ axis: 'space', amount: 30 }] }),
      num('LEVEL', 92, PART_LEVEL),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { 'note-length': 96 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'tone-track',
    title: 'Detuned saw lead, wide and on top of everything',
    params: [
      pick('OSC', 'SuperSAW', OSC_TYPES, upd(1, '1.80')),
      num('DET', 44, SUPERSAW_DETUNE, { mood: [{ axis: 'grit', amount: 30 }] }),
      pick('M/P', 'MONO', ['MONO', 'POLY'], upd(1, '1.80')),
      pick('TVF/VCF', 'TVF', FILTER_FAMILY, upd(2, '1.80')),
      pick('TYP', 'LPF', TVF_TYPES, upd(2, '1.80')),
      num('CUT', 810, PARTIAL_1023, { mood: [{ axis: 'darkness', amount: -260 }] }),
      num('RES', 210, PARTIAL_1023),
      num('KF', 60, PARTIAL_KEY_FOLLOW),
      num('T1A', 40, PARTIAL_1023, { note: 'Amp envelope attack' }),
      num('T4R', 300, PARTIAL_1023, { mood: [{ axis: 'density', amount: -110 }], note: 'Amp envelope release' }),
      num('LEV', 108, PARTIAL_LEVEL),
      shuffle(),
    ],
    routing: 'Ver.1.80 or later — SuperSAW and DET live in the partial editor',
    articulation: [{ slot: 'accent', set: { velocity: 118 }, hint: 'edit-step' }],
    verified: false,
  },
  /**
   * There is no `sampled-chord` twin of this recipe, and the reason is worth recording because
   * the box invites one: a TONE track *"can also be used as a pitched sampler"* (p.16), so a
   * chord stab living inside one WAV is entirely real here.
   *
   * It would never be chosen. §7.1 ranks a real polyphonic voice above a baked-in chord
   * whenever both can serve the request, and the widest chord any authored hook asks for is
   * four notes against this pool's polyphony of four — so the twin would sit in the library
   * unreachable by every template in it. That is the same decoration the pad pool's count
   * argument refuses, and it is refused here for the same reason. `mc101-vox-chop-dirty` is
   * what a sample on a TONE track looks like when the guide can actually reach it.
   */
  {
    id: 'mc101-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'tone-track',
    title: 'Short chord stab, played on the track',
    params: [
      pick('MONO/POLY', 'POLY', MONO_POLY, ref(45)),
      num('ATTACK', -40, PART_OFFSET),
      num('DECAY', -26, PART_OFFSET, { mood: [{ axis: 'density', amount: -18 }] }),
      num('RELEASE', -34, PART_OFFSET),
      num('CUTOFF', 20, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -26 }] }),
      num('RESONANCE', 10, PART_OFFSET, { mood: [{ axis: 'grit', amount: 12 }] }),
      num('DELAY SEND', 18, PART_SEND, { mood: [{ axis: 'space', amount: 26 }] }),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 116, 'note-length': 3 }, hint: 'edit-step' }],
    verified: false,
  },
  {
    id: 'mc101-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'tone-track',
    title: 'Chopped vocal one-shot, sample rate pulled down',
    sourceAudio: {
      need:
        'A vocal one-shot per note — a word or a syllable, dry, so the bit crusher is the only ' +
        'dirt on it',
      prep: {
        text: 'Load the chop from the SD card: Sound Browser, WAVE FILE.',
        verified: false,
      },
      hint: 'load-sample',
    },
    params: [
      pick('MONO/POLY', 'MONO', MONO_POLY, ref(45)),
      num('COARSE TUNE', -5, COARSE_TUNE, { unit: 'st', mood: [{ axis: 'darkness', amount: -4 }] }),
      num('FINE TUNE', -18, FINE_TUNE, { unit: 'c', mood: [{ axis: 'grit', amount: 14 }] }),
      num('ATTACK', -48, PART_OFFSET),
      num('RELEASE', -28, PART_OFFSET, { mood: [{ axis: 'density', amount: -16 }] }),
      num('CUTOFF', 8, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -24 }] }),
      pick('MFX TYPE', '46 Bit Crusher', MFX_TYPES, ref(52)),
      num('SAMPLE RATE', 42, CRUSH_RATE, { mood: [{ axis: 'grit', amount: -22 }], hint: 'open-sound' }),
      num('BIT DOWN', 7, CRUSH_BITS, { mood: [{ axis: 'grit', amount: 6 }] }),
      num('LEVEL', 96, CRUSH_LEVEL),
      num('DELAY SEND', 30, PART_SEND, { mood: [{ axis: 'space', amount: 32 }] }),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 118 }, hint: 'edit-step' }],
    routing: 'A pitched sampler on a TONE track (p.16) — one chop per note',
    verified: false,
  },
  {
    id: 'mc101-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'tone-track',
    title: 'Plucked arp running through the delay',
    params: [
      pick('MONO/POLY', 'MONO', MONO_POLY, ref(45)),
      pick('LEGATO', 'OFF', OFF_ON_TONE, ref(45)),
      num('OCT SHIFT', 1, OCT_SHIFT),
      num('ATTACK', -50, PART_OFFSET),
      num('DECAY', -30, PART_OFFSET, { mood: [{ axis: 'density', amount: -20 }] }),
      num('CUTOFF', 30, PART_OFFSET, { mood: [{ axis: 'darkness', amount: -30 }] }),
      num('DELAY SEND', 52, PART_SEND, { mood: [{ axis: 'space', amount: 34 }] }),
      num('PAN', -20, PART_PAN, { note: 'Shown as L64-0-63R; negative is left' }),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { 'motion-fx': 88 }, hint: 'motion-step' }],
    verified: false,
  },
  {
    id: 'mc101-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'tone-track',
    title: 'Filter opening across the bar, drawn rather than played',
    params: [
      pick('OSC', 'Noise', OSC_TYPES, upd(1, '1.80')),
      pick('LFO1 WAV', 'SAW-UP', LFO_WAVES, upd(3, '1.80')),
      pick('LFO1 SYN', 'ON', ['OFF', 'ON'], upd(3, '1.80')),
      num('LFO1 RAT', 512, LFO_RATE, { note: 'RATE NOTE takes over once SYN is ON' }),
      num('LFO1 FLT', 84, LFO_DEPTH, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('LFO1 AMP', 32, LFO_DEPTH),
      num('LFO1 PAN', 24, LFO_PAN_DEPTH, { mood: [{ axis: 'space', amount: 30 }] }),
      pick('MFX TYPE', '05 Super Filter', MFX_TYPES, ref(52)),
      pick('FILTER TYPE', 'HPF', SUPER_FILTER_TYPES, ref(54)),
      num('FILTER CUTOFF', 40, SUPER_FILTER_CUTOFF, { mood: [{ axis: 'darkness', amount: -24 }] }),
      num('FILTER RESONANCE', 58, SUPER_FILTER_RESO, { mood: [{ axis: 'grit', amount: 26 }] }),
      num('LEVEL', 88, MFX_LEVEL_54),
      shuffle(),
    ],
    articulation: [
      { slot: 'last-hit', set: { 'motion-filter': 122, 'motion-mod': 96 }, hint: 'motion-step' },
    ],
    routing: 'Ver.1.80 or later for the LFO page; draw the sweep with MOTION DESIGNER if you prefer',
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'roland-mc-101',
  name: 'MC-101',
  maker: 'Roland',
  kind: 'groovebox',

  /**
   * Full-size 5-pin DIN `MIDI IN` and `MIDI OUT` on the rear panel, plus a USB type-B port that
   * carries *"USB MIDI and USB audio data"* (Reference p.6). Both directions of clock are
   * documented and both are switchable: `Sync Src AUTO, INT, MIDI, USB` chooses the tempo
   * source, `Sync Out` and `SyncOut USB` decide whether clock, start and stop leave the box
   * (p.40). p.44 states it plainly — *"The MC-101 can transmit and receive MIDI clock (F8) to
   * synchronize its tempo."*
   *
   * **`preferredSource` is not claimed (§7.4/#80), and p.44 is the page that decides it — read
   * whole.** That sentence is the one quoted above, and it is symmetric: transmit *and* receive.
   * The chapter it opens, "Interoperation with Other Devices", is **one page long** and holds
   * exactly two diagrams, one for each direction. In the first a computer's `USB MIDI OUT` feeds
   * this box's `USB MIDI IN` — the DAW is the source and the MC-101 follows. In the second the
   * MC-101's `MIDI OUT` feeds a TR-8S's `MIDI IN`, and there it leads. A pair of options, drawn
   * on one page, with no prose choosing between them.
   *
   * So the one documented arrangement in which this box leads is real, and it is not a claim
   * about the box's job — which is exactly the distinction §7.4 exists to hold. Roland never
   * makes such a claim here: neither book has a features list or a prose introduction, the
   * Owner's Manual p.8 "An Overview of the MC-101" is an internal block diagram from System
   * Setting down to MASTER FX with no external gear on it anywhere, the Reference Manual's
   * rear-panel illustration (p.6) draws a computer, an SD card and speakers and no instrument at
   * all, and the only place either book says what the box *is* is the Owner's Manual
   * specifications table: *"Roland MC-101: Groovebox"* (p.19).
   *
   * The trap worth naming, since a first pass fell into it: read as a summary, p.44 sounds like
   * "the MC-101 clocks a DAW and a TR-8S". The DAW diagram points the other way.
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] },

  /**
   * §2.6/#22. One fact, recording a decision rather than a citation — see the module JSDoc for
   * why the rest of this box's capability pages are still in comments, and the `clock` comment
   * for what the Reference Manual's p.44 actually shows.
   */
  capabilityEvidence: {
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'Reference p.44’s one-page “Interoperation with Other Devices” draws this box following a DAW and leading a TR-8S, one diagram each and no prose choosing; the only self-description in either book is Owner’s p.19’s “Roland MC-101: Groovebox”',
    },
  },

  /**
   * `OUT L/MONO` and `OUT R`, and nothing else: *"If you're outputting in mono, connect the
   * L/MONO jack"* (p.6). No individual outs — the `OUT (Ch 1-2)` and `OUT (Ch 3-4)` on the block
   * diagram (p.89) are **USB** channels, not sockets, and reading them as jacks is the mistake
   * this comment exists to prevent.
   *
   * `audioIn: false` is about the panel: there is no analog audio input on this box, front or
   * rear (p.6 — the front carries `PHONES` alone). Audio *does* come in over USB, and that is
   * what `usbAudio` says; the looper's own record sources are `PC`, `TRK1-4` and `MIXOUT`
   * (p.25), all internal or USB.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true },

  /**
   * §10. 174 mm across, off the Main Specifications table: *"174 (W) x 133 (D) x 58 (H) mm"*.
   *
   * **The specification is only in the Reference Manual's absence.** That document has no
   * specifications section at all — it ends at the block diagram on p.89 — so the dimensions,
   * like the polyphony, are the Owner's Manual's to state, and this is one of the two values
   * here cited to it.
   *
   * Unlike the Tracker Mini, the vendor's stated width **is** the playing-orientation horizontal
   * span: the MC-101 is a landscape desktop box, played lying flat, so the surface you play is
   * the top panel and its horizontal span is the 174 mm W. The 133 mm the spec sheet calls
   * *depth* is the panel's vertical span, which is what `panel.panelRiseMm` carries. 174 / 133
   * is 1.31, and that is the aspect the top-panel drawing is drawn at — checked, because a
   * number that happens to agree with the spec sheet is only worth having once somebody has
   * confirmed it is not agreeing by accident.
   */
  physical: {
    panelSpanMm: 174,
    verified: { kind: 'manual', source: "MC-101 Owner's Manual eng02, p.19 (Main Specifications)" },
  },

  /** §10. A simplified original drawing of the top panel, read off the manual (see `panel.ts`). */
  panel: MC_101_PANEL,

  /**
   * §2.1's two pools, and the configuration argument for them is in the module JSDoc above.
   *
   * **`polyphony` on `tone-track` is 4, and no manual states a number.** All three MC-101
   * documents are silent: the Reference Manual has no specifications section, the Owner's
   * Manual's specifications table gives power, dimensions and weight only, and the Update
   * manual only ever mentions polyphony to say it *drops* — *"If VCF is selected, the
   * simultaneous polyphony will be less than when TVF is selected"*, and the same for a -24 dB
   * slope (Update p.2, Ver.1.80). So the honest reading is that the figure is load-dependent
   * and undocumented, and 4 is a deliberately small number chosen to cover the widest chord a
   * template authors (a triad) with one note in hand. It is not a citation and is not dressed
   * as one. What *is* documented is that the part is polyphonic at all: `Mono/Poly MONO, POLY,
   * TONE` (p.45).
   *
   * A drum pad is 1, and that one is not a judgement: a pad holds one instrument and sounds it
   * one hit at a time (p.17). The pool's `count` of 8 against a kit of 16 is the headroom
   * argument in the module JSDoc above, not a claim about the hardware.
   */
  /**
   * ## Two `sampled-chord` declines, for two different reasons (§12.4)
   *
   * **The drum pool: it can hold a chord and cannot move it.** User samples load onto a pad, so
   * a rendered chord will sound. What a pad cannot do is follow a progression, and a chord
   * pinned to one pitch plays the same chord under every degree — a drone that disagrees with
   * the harmony rather than a pad. Three routes were checked and all three fail:
   *
   *  - **`Key Offset` is per pad, not per step.** Reference p.47 gives it as `-24–+24`, *"Shifts
   *    the pitch in units of a semitone"* — the right units, in the wrong place: it is a kit
   *    setting for the key, and nothing makes it step-lockable.
   *  - **Motion recording reaches `Coarse Tune`, but only track-wide** (pp.27-28). A DRUM track
   *    carries all sixteen pads, so motion-recording its Coarse Tune to follow the progression
   *    would retune the kick and the clap on the same steps. That is worse than the gap it
   *    fills: a gap says "your rig cannot do this", where this would say "do this" and be wrong.
   *  - **Spending a second DRUM track on the chord is unrepresentable here**, and that is a fact
   *    about the model rather than about the box. `Assignable` is a pure function of device data
   *    (§2.2) — identical for every guide ever resolved — so "use one of the four tracks as a
   *    second drum track this time" has nowhere to live. This manifest commits once to eight
   *    pads plus three TONE tracks and every guide gets that shape. The Digitakt II records the
   *    same limit from the other side, where `comfortableVoices: 12` stands in for tracks spent
   *    on MIDI being audio tracks lost.
   *
   * **The TONE tracks decline for a different reason: they do not need a substitute.** That
   * argument was already recorded on `mc101-stab-hard` before this pass and is not restated
   * here — a TONE track *"can also be used as a pitched sampler"* (p.16), so the twin is real,
   * and §7.1 would never choose it over the polyphonic recipe already sitting on that voice.
   * Measured since: chosen in 0 of 24 (6 characters x 4 note counts) cases.
   */
  voices: [
    { kind: 'pool', id: 'drum-pad', label: 'Drum Pad', count: 8, roles: DRUM_PAD_ROLES, polyphony: 1 },
    { kind: 'pool', id: 'tone-track', label: 'TONE Track', count: 3, roles: TONE_ROLES, polyphony: 4 },
  ],

  /**
   * A taste call, on a box whose real limit is four tracks rather than a voice count.
   *
   * Eight is roughly "a working kit plus the three tone tracks": five pads carrying parts, and
   * every tonal track in use. Past that the guide is asking a reader to hold more parts than a
   * two-line display and one bank of pads makes pleasant. Crowding is a *cost* in the objective
   * and never a feasibility limit (§12.4), so if this is wrong nothing breaks — some guides are
   * ranked differently.
   */
  comfortableVoices: 8,

  /**
   * The per-step lanes, in this device's own names. `perStep` is an open list compared only
   * against this device's own articulation keys, and this one spans **two step editors** because
   * the device spans two kinds of track:
   *
   *  - A TONE track's STEP EDIT screen (p.22) puts `NOTE`, `VEL`, `STA` and `LEN` on the four
   *    knobs. `note-length` is that `LEN` and appears only on tone recipes.
   *  - A DRUM track's TR-REC EDIT STEP screen (p.23) puts `VEL`, `STA`, `MTE` and `SUB` there.
   *    `sub-step` and `mute-probability` are those two and appear only on drum recipes.
   *
   * **`mute-probability` is named for what it is, and the name is load-bearing.** p.23:
   * *"MTE: Adjusts the probability that a mute note will sound. With a setting of 0, the note
   * sounds each time; higher values decrease the probability that the note will sound."* It is
   * the *inverse* of every other probability lane in this library — the Deluge's `probability`
   * and the Tracker Mini's `chance` both rise towards certainty. Calling this one `probability`
   * would make `probability: 80` read as "usually plays" and mean "usually does not", in a
   * document whose whole purpose is to be right at the machine.
   *
   * The four `motion-*` lanes are MOTION (p.27), *"Recording Knob Movement in Steps"* — one
   * value per step per knob, `OFF, 0-127`, named for the four buttons that select them
   * (`SND`, `FLT`, `MOD`, `FX`). Each addresses whatever that knob is currently assigned to
   * (`KNOB ASSIGN`, p.38), which is why a motion articulation is a jog to a lane rather than a
   * claim about a parameter.
   *
   * **No printed ranges.** Neither step editor prints bounds for any of `VEL`, `STA`, `LEN`,
   * `MTE` or `SUB` — only MTE's "with a setting of 0" and SUB's "1/2" and "1/3" examples. The
   * motion lanes are the exception and the only one: `OFF, 0-127` is printed on p.27.
   *
   * `lfo` is declared from the Ver.1.80 partial editor (Update p.3): two LFOs per partial, a
   * `SYN (SYNC TEMPO)` switch with a note-length rate when it is on, and depth controls for
   * filter, pitch, amp and pan. Every one of those is a printed parameter rather than a
   * paraphrase.
   *
   * `sidechain` is omitted deliberately — see the module JSDoc.
   */
  features: {
    perStep: [
      'velocity',
      'start-timing',
      'note-length',
      'mute-probability',
      'sub-step',
      'motion-sound',
      'motion-filter',
      'motion-mod',
      'motion-fx',
    ],
    lfo: { count: 2, syncable: true, destinations: ['filter', 'pitch', 'amp', 'pan'] },
  },

  /** Gestures off the panel and the shortcut list (p.42). Jogs, not documentation (invariant 7). */
  hints: {
    'open-sound': 'Hold [SHIFT], press [SOUND]',
    'open-clip': 'Hold [SHIFT], press PAD [CLIP]',
    'open-multi-fx': 'Hold [SHIFT], press [MULTI FX]',
    'edit-step': 'SEQ mode: hold [SHIFT], press the pad',
    'weak-hit': 'Hold TRACK SEL, press the pad',
    'motion-step': 'On EDIT STEP, press the [VALUE] dial',
    'load-sample': 'NOTE mode: hold [SHIFT], press the pad',
    'knob-value': 'Hold [SHIFT], turn [C1]-[C4]',
  },

  manual: { title: 'MC-101 Reference Manual', edition: 'eng01' },

  recipes: [...DRUM_RECIPES, ...TONE_RECIPES],
}
