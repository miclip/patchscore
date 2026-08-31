import type { Device, Recipe } from '../../core/device'
import type { AuthoredParam, Cite, ParamScope } from '../../core/params'
import { TR_6S_PANEL } from './panel'

/**
 * Roland TR-6S (§2.3). Six instruments, a sixteen-step sequencer, and behind each of those six
 * slots the same three tone engines the TR-8S has — ACB, FM and a sampler.
 *
 * ## Two manuals, and the split is the usual Roland one
 *
 * `manuals/README.md` records the trap and this box is its clearest illustration: the Owner's
 * Manual is 41 pages that name every control and **document no parameter range at all**, and the
 * ranges live in a second document that Roland names with a third word again — not `reference`
 * (TR-1000), not `Reference` (TR-8S, MC-101) but **`TR-6S_Parameter_eng02_W.pdf`**, thirteen
 * pages of `Parameter | Value | Explanation`. Everything numeric below is cited to that Parameter
 * Guide. The handful of facts it does not carry — the panel span, the pattern Shuffle range, the
 * per-step gestures, the sample library — are cited to the Owner's Manual and say so.
 *
 * Both documents number their printed folios identically to their PDF pages; that was checked on
 * four footers in the Owner's Manual (10, 20, 30, 40) and four in the Parameter Guide (7, 8, 9,
 * 10) rather than assumed from the sibling.
 *
 * ## Six instruments, and that is the whole difference from the TR-8S
 *
 * `BD SD LT HC CH OH` — BASS DRUM, SNARE DRUM, LOW TOM, HAND CLAP, CLOSED HIHAT, OPEN HIHAT
 * (Owner's p.4, printed above the six level faders). Six, not eleven: **no rim shot, no mid or
 * high tom, no crash, no ride.** Owner's p.9 says it twice, once in prose — *"The 6 instruments
 * are collectively called a 'kit.'"* — and once in the pattern structure, where each variation
 * has *"seven tracks (ACCENT, BD, SD, LT, HC, CH, OH)"*.
 *
 * That shortage is what shapes the recipes. On the TR-8S the sample-borne roles went to CC and RC
 * because eleven slots can spare two; here there are six and none is spare, so the roles the
 * panel does not name are modelled on the slot whose own duty is nearest and the recipe's `TONE`
 * param says what has to be loaded for it. `rim` sits on HC, `ride` and `texture` on OH,
 * `metallic` on CH, `impact` and `bass-mid` on LT. Every one of those is a modelling choice and
 * none is a hardware limit: any tone loads into any instrument on this box.
 *
 * ## The parameter table is gated on the loaded tone, and the recipes have to say so
 *
 * The INST table (p.7) is in six blocks, and only the first applies unconditionally:
 *
 *  - **Common to all tones** — Tune, Decay, Level, Gain, Pan, ReverbSend, DelaySend, LFO, LFO
 *    Depth.
 *  - *"Only for ACB tones of the BD category"* — `Attack`.
 *  - *"Only for ACB tones of the SD category"* — `Snappy`.
 *  - *"Only for ACB tones of the TOM category"* — `Color`.
 *  - *"Sample tone only"* — Coarse Tune, Rate, Spread, Bit Reduce, Attack, Hold Mode/Time/Step
 *    and a filter with its own envelope.
 *  - *"FM tone only"* — `Morph`; and *"Only for FM tones of the FX/HIT–OTHERS categories"* —
 *    `FM Coarse`.
 *
 * So a recipe that sets `Snappy` is not merely suggesting a value; it is asserting that the SD
 * slot holds an ACB tone of the SD category, and on a box where any slot takes any tone that
 * assertion can be false. Every recipe here that reaches past the common block states the
 * requirement in its `TONE` param, and the ones that do not reach past it work on anything.
 *
 * `Color` earns a second note, and **its table is not the TR-8S's.** p.7 gives it five meanings
 * by tone family where the TR-8S gives four, and they do not line up: ambience on
 * `808 Low/Mid/High/Full Tom`, **resonance on `808 Noise Tom L/M/H`**, ambience on
 * `909 Low/Mid/High Tom` — where the TR-8S's 909 toms are resonance — pitch movement on
 * `707 Low/Mid/High/Full Tom`, ambience on `606 Floor/Low/High/Full Tom`. The tom recipe names
 * its family, and it names it off this page rather than off the sibling's.
 *
 * ## The Parameter Guide is a lightly-edited copy of the TR-8S's, and it still says so
 *
 * This is the "cited range can still be the wrong range" rule (CLAUDE.md) in a form the rule
 * does not quite cover: not two scales for one control, but **a page describing the wrong box.**
 * Four instances, all read on rendered pages:
 *
 *  - p.12, `TempoSync: INT` — *"The tempo operates according to the **TR-8S's** own setting."*
 *  - p.12, `LocalSw: SURFACE` — *"...if you want operations on the **TR-8S** to only control an
 *    external device."*
 *  - p.12, `Inst Note` — the row enumerates `BD/SD/LT/HC/CH/OH` and their Alts, and then the
 *    explanation says *"...instrument alternate sound, and **TRIGGER OUT**."* **There is no
 *    TRIGGER OUT jack on this box.** The rear panel (Owner's p.6) is POWER, USB, an SD card
 *    slot, `MIDI (OUT, IN)` and `OUT (L/MONO, R)`, and that is all of it.
 *  - p.6 refers to *"the instrument select **[BD]–[RC]** buttons"* and *"each level fader
 *    **BD–RC**"*, on a page whose own tables enumerate `BD, SD, LT, HC, CH, OH`.
 *
 * None of the four is cited anywhere below, and `clock.transport` deliberately omits `trigger`
 * for the third of them. A page can be the right page and still be describing the neighbour.
 *
 * ## Why there is no `sampled-chord` pad or stab here (§12.4)
 *
 * **The capability is real on this box, and the reason is musical rather than technical.** That
 * is worth stating plainly, because the TR-8S manifest reaches the opposite verdict on what it
 * says is a missing capability, and the difference is not between the two boxes.
 *
 * §12.4's `sampled-chord` needs a voice that can hold a chord *and move it*, and both halves are
 * documented here:
 *
 *  - **Hold.** p.7, *Sample tone only*: `Hold Mode  Whole, Time, Step`, with *"Whole: The sound
 *    is heard to the end without decaying."* A chord loaded here sustains under a bar.
 *  - **Move, in semitones.** `Coarse Tune  -24–0–+24`, *"Specifies the pitch in semitone steps"*
 *    (p.7) — and unlike the TR-8S's reading of its own equivalent, it **is** reachable per step.
 *    `KIT: CTRL` (p.6) has a second row: with `Sel = User`, each of `BD, SD, LT, HC, CH, OH` gets
 *    its own [CTRL] assignment, and the option list for it opens `(SAMPLE) Coarse, Rate, Spread,
 *    BitReduce, ...`. The [CTRL] knob is then motion-recordable per step — Owner's p.16,
 *    *"Operate a knob while holding down a pad [1]–[16]"*, with p.9 listing the per-instrument
 *    [TUNE], [DECAY] and [CTRL] knobs among the recordable controls.
 *
 * So the chain closes: assign this slot's [CTRL] to Coarse, then motion-record a semitone offset
 * at the steps where the chord changes.
 *
 * **It is not authored anyway, and the reason is the six.** A chord sample would occupy one of
 * six instruments, every one of which the panel names as a drum duty and every one of which the
 * kit needs. The TR-8S's argument for spending RC on a `texture` is that eleven slots can spare
 * one; the same argument run over six says the opposite, and `texture` on OH below is already
 * the most this box can give away. A rig of nothing but this box therefore gaps `pad` and
 * `stab`, and the guide says so — but it gaps them for want of a spare voice, not for want of a
 * mechanism, and a later pass that disagrees with the musical judgement should know the
 * mechanism is there and cited.
 *
 * ## What is not modelled
 *
 * The MASTER FX block (19 types, p.3), the kit reverb and delay (pp.2-3), the LFO's destination
 * list (p.7) and the whole INST FX parameter set beyond the one control each recipe reaches for
 * are all cited-able and all absent, for the reason §3 gives: a recipe is a small number of
 * settings that get one part sounding right, not a dump of the box's parameter space. `SCATTER`
 * (Owner's p.11), `ROLL` (Owner's p.5), `STEP LOOP` (p.23), the two fill-ins and instrument
 * grouping (p.24) are performance features rather than per-part settings.
 *
 * No recipe carries step hits. Patterns are template-owned (§4.3); what the device contributes
 * is `articulation`, addressed by `PatternSlot`.
 */

// ---------------------------------------------------------------------------
// Citations and shared ranges
// ---------------------------------------------------------------------------

/** The Parameter Guide, which is where every number below comes from. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `TR-6S Parameter Guide eng02, p.${page}` }
}

/** The Owner's Manual, for the few facts the Parameter Guide does not carry. */
function citeOwner(page: number): Cite {
  return { kind: 'manual', source: `TR-6S Owner's Manual eng02, p.${page}` }
}

/** `-128–0–+127`, the box's standard bipolar control (Tune, Color, LFO Depth) — p.7. */
const BIPOLAR = { min: -128, max: 127 }
/** `0–255`, the box's standard unipolar control. Nearly everything on pp.7-10. */
const UNIT = { min: 0, max: 255 }
/** `-24–0–+24` semitones — sample `Coarse Tune` and `FM Coarse`, both p.7. */
const COARSE = { min: -24, max: 24 }

/**
 * The INST FX type list, verbatim and in the manual's order (p.8). Cited once here rather than
 * restated per recipe: seventeen options on one page, and every recipe that picks one is picking
 * from this set.
 *
 * **Four longer than the TR-8S's thirteen** — `SATURATOR`, `FREQ SHIFT`, `RING MOD` and `SPREAD`
 * are on this box and not on that one, which is the opposite of what a box with five fewer
 * instruments suggests.
 */
const INST_FX_TYPES = [
  'THRU',
  'HPF',
  'LPF',
  'LPF/HPF',
  'H BOOST',
  'L BOOST',
  'L/H BOOST',
  'ISOLATOR',
  'TRANSIENT',
  'COMPRESSOR',
  'DRIVE',
  'COMP+DRV',
  'CRUSHER',
  'SATURATOR',
  'FREQ SHIFT',
  'RING MOD',
  'SPREAD',
] as const

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

type NumExtra = {
  mood?: { axis: 'darkness' | 'density' | 'grit' | 'swing' | 'space'; amount: number }[]
  step?: number
  unit?: string
  hint?: string
  note?: string
  scope?: ParamScope
}

/**
 * A numeric whose **range** is cited and whose **point is not** (§3.2). That split is the whole
 * discipline here: the manual states what the box will accept, and where to put the value inside
 * it is taste, so `verified: false` sits on every point in this file.
 */
function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: NumExtra = {},
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
 * The reverb and delay sends, which every instrument has (p.7). `space` is carried here and
 * nowhere else on this device, which is §6's intent — the axis is depth, and depth on a drum
 * machine is how much of each part goes to the two kit effects.
 *
 * Kick and sub deliberately take no `space` offset, the same call the TR-1000 and the TR-8S
 * make: a low part pushed into a reverb is the one place the axis reliably makes a rig worse.
 */
function sends(reverb: number, delay: number, space?: number): AuthoredParam[] {
  const offset = space === undefined ? {} : { mood: [{ axis: 'space' as const, amount: space }] }
  return [
    num('REVERB SEND', reverb, UNIT, 7, { ...offset, hint: 'reverb-send' }),
    num('DELAY SEND', delay, UNIT, 7, { ...offset, hint: 'delay-send' }),
  ]
}

/**
 * `SHUFFLE`, and §6's argument for swing being an ordinary parameter offset lands squarely on
 * this control: *"a SHUFFLE knob is a parameter whose value means timing"*.
 *
 * **Cited to the Owner's Manual, and it is the only numeric here that is.** The Parameter Guide
 * carries `GENERAL: Shuffle = PTN, SYSTEM` (p.11) — which of two settings is live — and never
 * prints the range of either. Owner's p.17's PTN SETTING table does: `Shuffle  -128–0–+127`.
 *
 * On this box `SHUFFLE` is a button rather than a knob (Owner's p.4), so the SYSTEM setting is
 * reached through it and the pattern setting through PTN SETTING. Pattern-wide, not
 * per-instrument, so it is the same value on every recipe — carried per recipe because a
 * rendered part has to say what the box should be set to, not because six parts disagree.
 */
function shuffle(): AuthoredParam {
  return {
    kind: 'numeric',
    name: 'SHUFFLE',
    value: 0,
    range: { ...BIPOLAR, verified: citeOwner(17) },
    verified: false,
    mood: [{ axis: 'swing', amount: 127 }],
    hint: 'ptn-shuffle',
    note: 'Pattern-wide: one setting for the whole pattern, not per instrument',
    scope: 'pattern',
  }
}

/**
 * The category and engine a recipe needs in the slot. Nothing to cite for the *selection* — no
 * tone list ships with this box, and the Owner's Manual names no such document either.
 *
 * The vocabulary is citable even though the contents are not: Owner's p.31 enumerates the
 * categories (`IMPORT, BD, SD, TOM, RS, HC, CH/OH, CC/RC, PERC1-5, FX/HIT, VOICE, SYNTH1,
 * SYNTH2, BASS, SCALED, CHORD, OTHERS, USER01-32`) and p.26 the tone types behind the INST
 * screen icons (`P Preset, S Sample, L Loop, U User, F FM`).
 */
function tone(value: string, note?: string): AuthoredParam {
  return { kind: 'text', name: 'TONE', value, verified: false, ...(note === undefined ? {} : { note }) }
}

/** INST FX type, whose option set is cited and whose selection is taste (§3.2). */
function instFx(value: (typeof INST_FX_TYPES)[number]): AuthoredParam {
  return {
    kind: 'enum',
    name: 'INST FX TYPE',
    value,
    options: { values: [...INST_FX_TYPES], verified: cite(8) },
    verified: false,
    hint: 'inst-edit',
  }
}

// ---------------------------------------------------------------------------
// Recipes (§3)
// ---------------------------------------------------------------------------

const recipes: Recipe[] = [
  // ---- BD ----------------------------------------------------------------
  {
    id: 'tr6s-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'Short, front-loaded kick',
    params: [
      tone('BD category, ACB', 'ATTACK below exists only for ACB tones of the BD category (p.7)'),
      num('TUNE', 4, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }], hint: 'inst-edit' }),
      num('DECAY', 92, UNIT, 7, { mood: [{ axis: 'density', amount: -40 }] }),
      num('ATTACK', 178, UNIT, 7, { note: 'Attack strength of the bass drum' }),
      instFx('TRANSIENT'),
      num('TRANSIENT ATTACK', 48, BIPOLAR, 8, { mood: [{ axis: 'grit', amount: 60 }] }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'bd',
    title: 'Long, tuned-down kick',
    params: [
      tone('BD category, ACB'),
      num('TUNE', -30, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 176, UNIT, 7, { mood: [{ axis: 'density', amount: -70 }] }),
      num('ATTACK', 64, UNIT, 7),
      instFx('LPF'),
      num('LPF DEPTH', 150, UNIT, 8, {
        mood: [{ axis: 'darkness', amount: 90 }],
        note: 'On this filter a *higher* Depth lowers the cutoff, deepening the LPF (p.8)',
      }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'downbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'bd',
    title: 'Driven kick with a broken top end',
    params: [
      tone('BD category, ACB'),
      num('TUNE', 0, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -50 }] }),
      num('DECAY', 110, UNIT, 7, { mood: [{ axis: 'density', amount: -45 }] }),
      num('ATTACK', 200, UNIT, 7),
      instFx('DRIVE'),
      num('DRIVE BALANCE', 190, { min: 1, max: 255 }, 9, {
        note: 'The range also carries OFF, which is not a number and so is not modelled here',
      }),
      num('DRIVE', 96, UNIT, 9, { mood: [{ axis: 'grit', amount: 120 }] }),
      num('DRIVE LEVEL', 110, UNIT, 9, { note: 'Drive raises output; trim it back here (p.9)' }),
      ...sends(0, 0),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'bd',
    title: 'Kick tuned into a sub tail',
    params: [
      tone('BD category, ACB'),
      num('TUNE', -96, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -30 }], hint: 'inst-edit' }),
      num('DECAY', 232, UNIT, 7, { mood: [{ axis: 'density', amount: -90 }] }),
      num('ATTACK', 0, UNIT, 7, { note: 'No click — the transient belongs to whatever plays the kick' }),
      instFx('LPF'),
      num('LPF DEPTH', 190, UNIT, 8, { mood: [{ axis: 'darkness', amount: 60 }] }),
      ...sends(0, 0),
      shuffle(),
    ],
    // No separation to route it to: this box has one stereo OUT and no assignable outs
    // (Owner's p.6), so a sub sharing the mix with the kick is a mix decision, not a patch one.
    routing: 'Pull the BD level fader back once the sub is in — one stereo OUT, nothing to split',
    verified: false,
  },

  // ---- SD ----------------------------------------------------------------
  {
    id: 'tr6s-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'sd',
    title: 'Tight snare, wires up',
    params: [
      tone('SD category, ACB', 'SNAPPY below exists only for ACB tones of the SD category (p.7)'),
      num('TUNE', 12, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -70 }], hint: 'inst-edit' }),
      num('DECAY', 84, UNIT, 7, { mood: [{ axis: 'density', amount: -40 }] }),
      num('SNAPPY', 190, UNIT, 7, { note: 'Volume of the snare wires' }),
      instFx('TRANSIENT'),
      num('TRANSIENT ATTACK', 40, BIPOLAR, 8, { mood: [{ axis: 'grit', amount: 60 }] }),
      ...sends(30, 12, 90),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'sd',
    title: 'Open snare with air on the tail',
    params: [
      tone('SD category, ACB'),
      num('TUNE', 34, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -90 }], hint: 'inst-edit' }),
      num('DECAY', 132, UNIT, 7, { mood: [{ axis: 'density', amount: -55 }] }),
      num('SNAPPY', 224, UNIT, 7),
      instFx('H BOOST'),
      num('H BOOST', 120, UNIT, 8, { mood: [{ axis: 'grit', amount: 60 }] }),
      num('H BOOST FREQUENCY', 168, UNIT, 8),
      ...sends(64, 28, 120),
      shuffle(),
    ],
    articulation: [
      { slot: 'backbeat', set: { accent: true }, hint: 'accent-step' },
      { slot: 'fill', set: { substep: '1/3' }, hint: 'sub-step' },
    ],
    verified: false,
  },
  {
    id: 'tr6s-snare-dirty',
    role: 'snare',
    character: 'dirty',
    voice: 'sd',
    title: 'Crushed snare, sampling rate pulled down',
    params: [
      tone('SD category, ACB'),
      num('TUNE', 8, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('DECAY', 100, UNIT, 7, { mood: [{ axis: 'density', amount: -40 }] }),
      num('SNAPPY', 160, UNIT, 7),
      instFx('CRUSHER'),
      num('CRUSHER BALANCE', 180, { min: 1, max: 255 }, 10),
      num('SAMPLERATE', 96, UNIT, 10, {
        mood: [{ axis: 'grit', amount: 110 }],
        note: 'Higher settings lower the sampling frequency — more lo-fi, not less (p.10)',
      }),
      num('CRUSHER FILTER', 190, UNIT, 10, { note: 'Lower it to take the harsh top off (p.10)' }),
      ...sends(24, 20, 70),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { flam: true }, hint: 'flam' }],
    verified: false,
  },

  // ---- LT ----------------------------------------------------------------
  {
    id: 'tr6s-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'lt',
    title: 'Low tom with the room left on',
    params: [
      tone(
        'TOM category, ACB — 808 Low/Mid/High/Full Tom',
        'COLOR is ambience on the 808 toms, and resonance on the 808 *Noise* Toms (p.7)',
      ),
      num('TUNE', -48, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -50 }], hint: 'inst-edit' }),
      num('DECAY', 168, UNIT, 7, { mood: [{ axis: 'density', amount: -70 }] }),
      num('COLOR', 72, BIPOLAR, 7, { note: 'On 808 toms this is the amount of noise/ambience' }),
      instFx('THRU'),
      ...sends(56, 24, 110),
      shuffle(),
    ],
    articulation: [{ slot: 'fill', set: { substep: '1/2' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr6s-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'lt',
    title: 'FM bass note held on the tom slot',
    /**
     * The one recipe here that uses the FM engine, and it is on LT because a bass part wants the
     * slot whose own duty is lowest. `FM COARSE` is the only parameter in this file that is
     * gated on a tone's *category* as well as its engine — p.7's *"Only for FM tones of the
     * FX/HIT–OTHERS categories"* — and `BASS` falls inside that span in the category list
     * (Owner's p.31), which is what makes the pairing legal rather than convenient.
     */
    params: [
      tone(
        'FM tone, BASS category',
        'MORPH needs an FM tone; FM COARSE additionally needs one of the FX/HIT–OTHERS categories (p.7)',
      ),
      num('TUNE', -20, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -70 }], hint: 'inst-edit' }),
      num('FM COARSE', -12, COARSE, 7, { unit: 'st', note: 'Pitch in semitone steps' }),
      num('DECAY', 148, UNIT, 7, { mood: [{ axis: 'density', amount: -60 }] }),
      num('MORPH', -40, { min: -128, max: 128 }, 7, {
        mood: [{ axis: 'grit', amount: 90 }],
        note: 'Printed as -128–0–128, asymmetric where every other bipolar here stops at +127',
      }),
      instFx('LPF'),
      num('LPF DEPTH', 120, UNIT, 8, { mood: [{ axis: 'darkness', amount: 80 }] }),
      ...sends(8, 16, 40),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { weak: true }, hint: 'weak-step' }],
    verified: false,
  },
  {
    id: 'tr6s-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'lt',
    title: 'One-shot hit dropped on the section boundary',
    sourceAudio: {
      need: 'A single loud hit — a crash, a slam, a reversed cymbal — under two seconds, imported as a user sample',
      prep: {
        text:
          "Owner's p.30, SAMPLE Import: copy the file to ROLAND\\TR-6S\\SAMPLE\\ on the SD card, " +
          'then [UTILITY] > "SAMPLE:Import". A single file may run to about 180 seconds at 44.1 kHz mono',
        verified: { kind: 'manual', source: "TR-6S Owner's Manual eng02, p.30" },
      },
    },
    params: [
      tone('Sample tone — FX/HIT category', 'COARSE TUNE and ATTACK below are sample-tone only (p.7)'),
      num('TUNE', -8, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('COARSE TUNE', -5, COARSE, 7, { unit: 'st' }),
      num('DECAY', 255, UNIT, 7, { note: 'A one-shot: let it run out rather than cutting it' }),
      num('ATTACK', 0, UNIT, 7, { note: 'Specifies the time over which the level rises (p.7)' }),
      num('LEVEL', 210, UNIT, 7),
      instFx('THRU'),
      ...sends(90, 40, 140),
      shuffle(),
    ],
    // `first-hit` is emitted by one direction for one role, and this is that role — see the
    // TR-8S's note on #108's reachability check, which found the slot dead everywhere else.
    articulation: [{ slot: 'first-hit', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },

  // ---- HC ----------------------------------------------------------------
  {
    id: 'tr6s-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'hc',
    title: 'Hand clap with a short room',
    params: [
      tone('HC category'),
      num('TUNE', 24, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 112, UNIT, 7, { mood: [{ axis: 'density', amount: -50 }] }),
      instFx('H BOOST'),
      num('H BOOST', 96, UNIT, 8, { mood: [{ axis: 'grit', amount: 50 }] }),
      ...sends(96, 36, 130),
      shuffle(),
    ],
    articulation: [{ slot: 'backbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'hc',
    title: 'Dry rim shot on the offbeat',
    /**
     * There is no RS instrument on this box — the panel stops at six and rim shot is not one of
     * them. `RS` is a tone *category* (Owner's p.31), and any tone loads into any instrument, so
     * the rim lives in the clap slot with the requirement written into `TONE`.
     *
     * Every parameter below is from p.7's *common to all tones* block, deliberately: a recipe
     * that cannot know whether the reader loaded an ACB tone or a sample must not reach into a
     * block that is gated on the answer.
     */
    params: [
      tone('RS category', 'HC holds it — this box has no rim shot instrument of its own'),
      num('TUNE', 16, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -50 }], hint: 'select-tone' }),
      num('DECAY', 40, UNIT, 7, { mood: [{ axis: 'density', amount: -18 }] }),
      instFx('THRU'),
      ...sends(20, 48, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { flam: true }, hint: 'flam' }],
    verified: false,
  },
  {
    id: 'tr6s-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'hc',
    title: 'Clap dropped under the groove',
    params: [
      tone('HC category'),
      num('TUNE', 20, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -40 }] }),
      num('DECAY', 56, UNIT, 7, { mood: [{ axis: 'density', amount: -20 }] }),
      num('LEVEL', 120, UNIT, 7, { note: 'Sits under everything; the level fader is this value' }),
      instFx('THRU'),
      ...sends(48, 40, 90),
      shuffle(),
    ],
    articulation: [{ slot: 'ghost', set: { weak: true }, hint: 'weak-step' }],
    verified: false,
  },

  // ---- CH ----------------------------------------------------------------
  {
    id: 'tr6s-closed-hat-hard',
    role: 'closed-hat',
    character: 'hard',
    voice: 'ch',
    title: 'Tight closed hat, forward in the bar',
    params: [
      tone('CH/OH category'),
      num('TUNE', 30, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -80 }], hint: 'inst-edit' }),
      num('DECAY', 44, UNIT, 7, { mood: [{ axis: 'density', amount: -20 }] }),
      instFx('TRANSIENT'),
      num('TRANSIENT ATTACK', 56, BIPOLAR, 8, { mood: [{ axis: 'grit', amount: 50 }] }),
      ...sends(16, 24, 80),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { substep: '1/2' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr6s-closed-hat-dirty',
    role: 'closed-hat',
    character: 'dirty',
    voice: 'ch',
    title: 'Closed hat bit-crushed into a tick',
    params: [
      tone('CH/OH category'),
      num('TUNE', 44, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -70 }] }),
      num('DECAY', 36, UNIT, 7, { mood: [{ axis: 'density', amount: -16 }] }),
      instFx('CRUSHER'),
      num('CRUSHER BALANCE', 220, { min: 1, max: 255 }, 10),
      num('SAMPLERATE', 128, UNIT, 10, { mood: [{ axis: 'grit', amount: 100 }] }),
      ...sends(12, 40, 90),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { substep: '1/4' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr6s-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'ch',
    title: 'Hat rung into a metal tick',
    /**
     * `RING MOD` is one of the four INST FX this box has and the TR-8S does not, and it is the
     * one that earns its place: p.10 gives it `Freq 0–8, 000 [Hz]` for the wide sweep and
     * `Fine -128–0–+127 [Hz]` for the narrow one, which turns a hihat into a pitched tick
     * without any tone being loaded for the purpose.
     *
     * The `Freq` range is printed with a thousands separator inside the range — `0–8, 000` — so
     * the upper bound is eight thousand hertz rather than eight.
     */
    params: [
      tone('CH/OH category'),
      num('TUNE', 60, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('DECAY', 52, UNIT, 7, { mood: [{ axis: 'density', amount: -22 }] }),
      instFx('RING MOD'),
      num('RING MOD FREQ', 1400, { min: 0, max: 8000 }, 10, { unit: 'Hz' }),
      num('RING MOD FINE', -18, BIPOLAR, 10, { unit: 'Hz' }),
      num('RING MOD BALANCE', 168, { min: 1, max: 255 }, 10, {
        mood: [{ axis: 'grit', amount: 80 }],
        note: 'The range also carries OFF, which is not a number and so is not modelled here',
      }),
      ...sends(16, 72, 110),
      shuffle(),
    ],
    articulation: [{ slot: 'offbeat', set: { 'alt-inst': true }, hint: 'alt-inst' }],
    verified: false,
  },

  // ---- OH ----------------------------------------------------------------
  {
    id: 'tr6s-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'oh',
    title: 'Open hat left ringing between the kicks',
    params: [
      tone('CH/OH category'),
      num('TUNE', 36, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -90 }], hint: 'inst-edit' }),
      num('DECAY', 150, UNIT, 7, { mood: [{ axis: 'density', amount: -60 }] }),
      instFx('H BOOST'),
      num('H BOOST', 104, UNIT, 8, { mood: [{ axis: 'grit', amount: 50 }] }),
      ...sends(40, 32, 110),
      shuffle(),
    ],
    // The choke, and on this box it is a kit setting rather than a patch: `KIT: MUTE` (p.6)
    // takes `OFF, BD, SD, LT, HC, CH, OH` per instrument, and the manual gives exactly this
    // pairing as its worked example — "By selecting the instrument that plays CloseHH, you can
    // use CloseHH to close (mute) the sustained sound of OpenHH."
    routing: 'KIT Edit > MUTE, OH = CH — the closed hat chokes the open one (p.6)',
    articulation: [{ slot: 'offbeat', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-ride-clean',
    role: 'ride',
    character: 'clean',
    voice: 'oh',
    title: 'Ride pattern on the open hat slot',
    /**
     * No ride cymbal instrument on this box either. `CC/RC` is a tone category (Owner's p.31)
     * and OH is the slot whose own duty is nearest — a sustaining metal voice with a choke
     * already wired to it. Common-block parameters only, for the reason the rim recipe gives.
     */
    params: [
      tone('CC/RC category', 'OH holds it — this box has no ride instrument of its own'),
      num('TUNE', 8, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }], hint: 'select-tone' }),
      num('DECAY', 190, UNIT, 7, { mood: [{ axis: 'density', amount: -70 }] }),
      num('LEVEL', 150, UNIT, 7),
      instFx('THRU'),
      ...sends(56, 32, 100),
      shuffle(),
    ],
    articulation: [{ slot: 'accent', set: { accent: true }, hint: 'accent-step' }],
    verified: false,
  },
  {
    id: 'tr6s-noise-soft',
    role: 'noise',
    character: 'soft',
    voice: 'oh',
    title: 'Open hat opened out into a wash',
    params: [
      tone('CH/OH category'),
      num('TUNE', -40, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -50 }] }),
      num('DECAY', 220, UNIT, 7, { mood: [{ axis: 'density', amount: -80 }] }),
      num('LEVEL', 110, UNIT, 7),
      instFx('LPF'),
      num('LPF DEPTH', 130, UNIT, 8, { mood: [{ axis: 'darkness', amount: 90 }] }),
      ...sends(140, 88, 140),
      shuffle(),
    ],
    // Authored on `fill`, which #108's reachability check found dead: no direction emits that
    // slot for `noise`, whose reachable set is `downbeat`, `offbeat` and `accent`. It moved to
    // `accent` rather than going, because subdividing the hit the variant leans on is what a
    // wash is for — a quarter-division under every step would be a different part.
    articulation: [{ slot: 'accent', set: { substep: '1/4' }, hint: 'sub-step' }],
    verified: false,
  },
  {
    id: 'tr6s-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'oh',
    title: 'A loop tone held open under the pattern',
    sourceAudio: {
      need:
        'A sustained tonal bed, two seconds or longer, loaded as a Loop tone — HOLD MODE Whole ' +
        'plays the whole file, so the file is the part',
    },
    params: [
      tone(
        'Sample tone — Loop',
        "A Loop tone is a sample tone, which is what lets COARSE TUNE and HOLD MODE below exist: Owner's p.31 lists L Loop among the icons of the SAMPLE screen (p.26 legends it separately on the INST screen, which is what makes it worth saying)",
      ),
      num('TUNE', -16, BIPOLAR, 7, { mood: [{ axis: 'darkness', amount: -60 }] }),
      num('COARSE TUNE', -12, COARSE, 7, { unit: 'st' }),
      {
        kind: 'enum',
        name: 'HOLD MODE',
        value: 'Whole',
        options: { values: ['Whole', 'Time', 'Step'], verified: cite(7) },
        verified: false,
        note: 'Whole: the sound is heard to the end without decaying (p.7)',
      },
      num('LEVEL', 96, UNIT, 7, { note: 'A bed, not a part — it sits below everything else' }),
      instFx('LPF'),
      num('LPF DEPTH', 140, UNIT, 8, { mood: [{ axis: 'darkness', amount: 90 }] }),
      ...sends(110, 72, 120),
      shuffle(),
    ],
    // A sample set to Hold Mode Whole outlives the pattern, and this box says so twice: Owner's
    // p.4 warns the sound "might not stop automatically" and gives [SHIFT] + [START/STOP] to
    // silence it, and `KIT: MUTE` (p.6) names sample tones alongside OpenHH as the things a
    // choke exists for.
    routing: 'KIT Edit > MUTE, OH = CH — a sustaining sample chokes like OpenHH (p.6)',
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'roland-tr-6s',
  name: 'TR-6S',
  maker: 'Roland',
  kind: 'drum-machine',

  /**
   * Both directions, and both are stated rather than inferred. Receiving: the sync chapter opens
   * *"The TR-6S can receive MIDI Clock (F8) data to synchronize its tempo. It can also receive
   * MIDI Start (FA) and MIDI Stop (FC) to start/stop itself."* (Owner's p.36), with `TempoSync`
   * choosing `AUTO, MIDI, USB, INT` (Parameter Guide p.12). Sending: `Sync Out  OFF, ON` —
   * *"whether clock, start, and stop messages are transmitted to other devices"* (p.12).
   *
   * **`trigger` is deliberately absent, and its absence is the finding.** The Parameter Guide's
   * `Inst Note` row (p.12) ends *"...and TRIGGER OUT"*, which on the TR-8S names a real jack and
   * a real step track. This box has neither: the rear panel is POWER, USB, an SD card slot,
   * `MIDI (OUT, IN)` and `OUT (L/MONO, R)` (Owner's p.6, read off the rendered artwork because
   * the silkscreen is inside the drawing), and the same page of the Parameter Guide calls the
   * instrument buttons `[BD]–[RC]` on a box whose buttons stop at `[OH]`. That document is a
   * lightly-edited copy of the TR-8S's and this is one of four places the original shows
   * through — see the module note. Citing it would have put a trigger output on a box that has
   * no output but the stereo pair.
   *
   * No DIN SYNC either: the two five-pin sockets are silkscreened `MIDI OUT` and `MIDI IN`, and
   * "DIN sync" occurs nowhere in either document. Thru is software (`Soft Thru`, `USBMidiThru`,
   * p.12), not a socket.
   *
   * **`preferredSource` is not claimed (§7.4/#80),** and the reading here is unusually clean.
   * Owner's p.36 does print one arrangement where this box leads — a MIDI cable from its
   * `MIDI OUT` to an MC-101's `MIDI IN` — but it prints it as the second of a matched pair, and
   * the chapter's own first sentence is about receiving. The manual has no marketing
   * introduction at all to weigh against that: p.1 is a version-check page and pp.8-9 are a
   * data-structure diagram of PATTERN / KIT / VARIATION / INST with no external gear on it. A
   * pair of symmetric options is not a job.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
    /**
     * §7.4/#104. One setting covers both transports, because the manual's setting is about MIDI
     * Clock rather than about a port: `Sync Out` sits in `SYNC/TEMPO` beside `TempoSync`, whose
     * own options *do* distinguish `MIDI` from `USB` for the receive direction. So the receive
     * side is per-port and the send side is not, which is asymmetric and is what the page says.
     *
     * **The USB entry is the weakest citation in this file, and it is an inference.** Owner's
     * p.36's two worked procedures are lopsided: the USB one is headed "TR-6S as Slave" and
     * draws the computer's `USB MIDI OUT` into this box, and the only arrangement where this box
     * is the source is the MC-101 one, over MIDI DIN. So no page shows clock leaving over USB.
     *
     * It is still not `sendTransport: ['midi-din']`, and the distinction matters because that
     * would be a claim rather than a silence — "this box cannot be a clock source over USB",
     * which no page in either document says. Three things on the pages that do talk about the
     * USB port point the other way:
     *
     *  - Owner's p.36, third block, *"Connecting a Computer via USB"*: *"you can synchronize the
     *    TR-6S with your DAW via USB MIDI"*, with no direction attached to the word.
     *  - `Sync Out` is portless where its neighbour is not (above), and Roland distinguishes
     *    ports on this table wherever it means to.
     *  - `USBMidiThru` (p.12) retransmits *"from the MIDI OUT connector and USB port"*, so the
     *    USB port is a MIDI output on this box and not only an input; and `Tx Nudge` (p.12) is
     *    a transmit-side clock setting — *"whether MIDI Clock messages are transmitted"* — which
     *    is likewise portless.
     *
     * Absence of a worked example is not a citation against, which is the rule `manuals/README.md`
     * states for `pdftotext` and holds just as well for a procedure nobody wrote down. The honest
     * position is that one portless switch governs both ports; if a reader ever establishes
     * otherwise on hardware, this is an `observed` citation waiting to be made, not a re-reading.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'UTILITY > SYNC/TEMPO > Sync Out',
        value: 'ON',
        note: 'Sends clock, start and stop together — there is no setting that sends one without the others',
      },
      {
        transport: 'usb',
        path: 'UTILITY > SYNC/TEMPO > Sync Out',
        value: 'ON',
        note: 'The same single setting; the table names no port on the send side',
      },
    ],
  },

  /**
   * §2.6/#111. **This box ships a library nobody has listed**, and it ships three kinds of it —
   * ACB tones, FM tones and preset samples — where the TR-8S's entry covers samples alone.
   *
   * Owner's p.26, "About the icons shown in the INST screen", legends all five: `P Preset:
   * Tones originally in the TR-6S`, `S Sample`, `L Loop`, `U User: Tones that use imported
   * samples`, `F FM: Tones that use the FM tone generator`. p.32 confirms the preset half is
   * read-only — *"Preset samples cannot be deleted."*
   *
   * **No document enumerates any of it.** The TR-1000 ships a `GEN/INST List` and authors a
   * cited enum off it; the TR-6S has no equivalent in `manuals/` and, more to the point, names
   * none — the Owner's Manual's only cross-reference in 41 pages is to the Parameter Guide, and
   * the Parameter Guide is thirteen pages of ranges ending in a signal-flow diagram. The only
   * tone names printed anywhere in either document are three incidental examples (`909 Bass1`,
   * `707Bass1/2`, `Prog.Trance Bass`). So no recipe names a tone, and each says its category and
   * engine instead.
   */
  content: {
    kind: 'shipped-library',
    library: 'the preset ACB tones, FM tones and samples supplied in the box',
    location: 'the INST screen, where preset entries are marked P, F for FM and U for imports',
    reason: "p.26 legends the icons and no page in either document prints the list",
  },

  /**
   * §2.6/#142. The same answer as both siblings, off this box's own page: a step triggers an
   * instrument and carries no length. The instrument's own `DECAY` decides how long it sounds
   * (Parameter Guide p.7, the page every recipe below cites for it), and the per-step material
   * the manual documents — sub steps, flams, accents, weak beats — adds gestures rather than
   * durations.
   */
  noteDuration: {
    kind: 'trigger',
    reason: "the instrument's own envelope ends it, and `DECAY` is what sets that",
  },

  /**
   * §2.6/#22. Every claim above and below has its page here rather than in a comment beside it.
   *
   * The split between the two documents is visible in this map and is the honest shape of it:
   * the capabilities are the Owner's Manual's, the parameter behaviour is the Parameter Guide's,
   * and `features.lfo` and the sidechain are the Parameter Guide's because **the Owner's Manual
   * never mentions either.** "LFO", "sidechain" and "side chain" occur nowhere in its 41 pages;
   * pp.24 and 26 both defer to the Parameter Guide instead.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(12),
    'clock.canReceiveClock': citeOwner(36),
    'clock.transport': citeOwner(6),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        "Owner's p.36 opens receive-first and pairs one arrangement where this box clocks an MC-101 with one where a DAW clocks it over USB; there is no self-description anywhere else in the book to weigh against that, since p.1 is a version-check page and pp.8-9 are a data-structure diagram",
    },
    'clock.sourceSetup[midi-din]': cite(12),
    'clock.sourceSetup[usb]': cite(12),
    'io.main': citeOwner(6),
    'io.individualOuts': citeOwner(6),
    'io.audioIn': citeOwner(6),
    'io.usbAudio': citeOwner(6),
    voices: citeOwner(9),
    'features.perStep': citeOwner(20),
    'features.sidechain.internal': cite(6),
    'features.sidechain.fromExternalAudio': cite(6),
    'features.lfo': cite(6),
    content: citeOwner(26),
    noteDuration: cite(7),
    'jacks[OUT · L/MONO]': citeOwner(6),
    'jacks[OUT · R]': citeOwner(6),
    'jacks[MIDI · IN]': citeOwner(6),
    'jacks[MIDI · OUT]': citeOwner(6),
    'jacks[PHONES]': citeOwner(5),
  },

  /**
   * The rear panel, verbatim off the artwork (Owner's p.6): `OUT (L/MONO, R) jacks`, `MIDI (OUT,
   * IN) connectors`, the USB port, an SD card slot and the `[POWER]` switch. `PHONES` is on the
   * front (p.5) and is the only thing there.
   *
   * **`individualOuts: 0`, and it is the biggest gap between this box and the TR-8S.** That box
   * has six assignable outs and a `KIT: OUTPUT` page that sends any of eleven instruments to
   * them; here there is one stereo pair and no such page. The string "ASSIGN" appears in this
   * manual only in the sense of assigning a *parameter* to a knob. Everything comes out the
   * same two jacks, which is why the `sub` recipe's routing line is a fader instruction.
   *
   * `audioIn: false` is a physical claim and is the interesting one, because the box plainly
   * processes external audio — `KIT: EXT IN` (Parameter Guide p.6) has gain, pan, both sends and
   * the whole side chain. **There is no input jack for it.** The Parameter Guide's audio diagram
   * (p.13) names the source `USB EXT IN`, so that path exists only with a computer attached, and
   * `usbAudio: true` is where it is recorded.
   *
   * One inconsistency worth knowing rather than smoothing over: Owner's p.4 describes the
   * `[VOLUME]` knob as adjusting *"the MIX OUT jack, PHONES jack's volume"*, and `MIX OUT` is
   * the TR-8S's label. It occurs exactly once in the book; the jack's own silkscreen and its own
   * callout both say `OUT`, and that is the id used below.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true },

  /**
   * §3.3/#103. The five sockets a reader patches. **The USB port is deliberately not among
   * them**, although it carries clock: `JackSpec.direction` is one of `in` or `out`, and USB is
   * both at once here — Owner's p.6 says it *"can be used to transfer USB MIDI and USB audio
   * data"* and `TempoSync: USB` receives clock over the same port `Sync Out` sends it out of.
   * Declaring a direction would be picking one of two true answers, so the `usb` transport
   * carries a `sourceSetup` and no socket, and the rack draws that honestly.
   */
  jacks: [
    { id: 'OUT · L/MONO', direction: 'out', signal: ['audio'] },
    { id: 'OUT · R', direction: 'out', signal: ['audio'] },
    { id: 'MIDI · OUT', direction: 'out', signal: ['clock', 'midi'], clock: ['midi-din'] },
    { id: 'MIDI · IN', direction: 'in', signal: ['clock', 'midi'], clock: ['midi-din'] },
    { id: 'PHONES', direction: 'out', signal: ['audio'], note: 'Front panel, not the rear' },
  ],

  /**
   * §10. 224 mm across, off the Main Specifications table: *"224 (W) x 132 (D) x 61 (H) mm"*.
   *
   * **Cited to the Owner's Manual because the Parameter Guide has no specifications section at
   * all** — it is thirteen pages of parameter tables and ends on a signal-flow diagram. This and
   * `SHUFFLE` are the two values in this file that do not come from the parameter document.
   *
   * The TR-6S is a landscape desktop box played lying flat, so the vendor's W is the
   * playing-orientation horizontal span and the 132 mm it calls *depth* is the panel's vertical
   * span. The aspect check §2.3 asks for is in `panel.ts`, and it does not come out exactly —
   * see there, because the 2.6% discrepancy is a fact about the figure rather than about the box.
   */
  physical: {
    panelSpanMm: 224,
    verified: { kind: 'manual', source: "TR-6S Owner's Manual eng02, p.40 (Main Specifications)" },
  },

  /** §10. A simplified original drawing of the top panel, read off the manual (see `panel.ts`). */
  panel: TR_6S_PANEL,

  /**
   * The six instruments, in panel order (Owner's p.4, printed above the faders as BASS DRUM,
   * SNARE DRUM, LOW TOM, HAND CLAP, CLOSED HIHAT, OPEN HIHAT). Every one is monophonic — one
   * trigger, one sound — so `polyphony` is 1 throughout; §2.2's meaning of the field is *notes
   * within one role*, and nothing on this box sounds two notes of one part at once.
   *
   * The roles are the duties each slot is modelled as taking, not a hardware limit, and on a
   * six-voice box that distinction does more work than it does on the TR-8S. `rim` on HC,
   * `ride` and `texture` on OH, `metallic` on CH, `impact` and `bass-mid` on LT are all
   * modelling: any tone loads into any instrument, and each of those recipes writes the
   * requirement into its `TONE` param. What the box cannot do is have two of them at once in one
   * slot, and that is exactly the crowding the resolver is for.
   *
   * A voice listing a role it has no recipe for is deliberate and is §3.5's `unvoiced` outcome —
   * the box can take the duty and nobody has authored the settings, which the guide renders as
   * "dial it by ear" rather than as a gap in the rig.
   */
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick', 'sub'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap', 'ghost-perc'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['tom', 'sub', 'bass-mid', 'impact'], polyphony: 1 },
    { kind: 'fixed', id: 'hc', label: 'HC', roles: ['clap', 'snare', 'ghost-perc', 'rim'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat', 'ghost-perc', 'metallic'], polyphony: 1 },
    { kind: 'fixed', id: 'oh', label: 'OH', roles: ['open-hat', 'noise', 'ride', 'texture'], polyphony: 1 },
  ],

  features: {
    /**
     * TR-REC's per-step vocabulary, all from Owner's p.20 with the gestures confirmed against
     * the shortcut list on p.38, and it is **neither sibling's list**. This box has the TR-8S's
     * flam *and* the TR-1000's probability, which no other Roland here does; it has neither the
     * TR-1000's `cycle` nor its `start-timing`.
     *
     *  - `accent` — hold the [BD] instrument button, press [SD], then pads. Accent is a **track**
     *    on this box, not a lane on each instrument: p.9 counts *"seven tracks (ACCENT, BD, SD,
     *    LT, HC, CH, OH)"*, and the level is one knob for the whole thing.
     *  - `substep` — `[SUB] + [1]–[16]`; `[SUB] + [VALUE]` chooses 1/2, 1/3 or 1/4
     *  - `flam` — the fourth option on that same [VALUE] list, which is why it is a separate
     *    claim here and not a division: a flammed step is not a subdivided one
     *  - `weak` — `[SHIFT] + [1]–[16]`
     *  - `alt-inst` — `[BD]–[OH] + [1]–[16]`, and only for tones whose name carries a `/`, such
     *    as `707Bass1/2` — which is why no recipe leans on it for a part that has to sound, only
     *    for colour
     *  - `probability` — long-press a pad, then [COPY] or [UTILITY] for PROB or SUB PROB
     *
     * **`velocity` is absent, and that is a reading rather than an omission.** The screen the
     * gestures above open is named the *"MOTION/VELOCITY input screen"* and p.38's section is
     * titled "Inputting Sub Steps, Weak Beats, Alternates, and Dynamics", so a per-step dynamics
     * facility is plainly there. No page in either document prints a procedure for setting a
     * value on it or a range for that value — every worked example on that screen is a motion
     * value or a probability. Both siblings declare `velocity` and cite a page that states the
     * gesture; there is no such page here, so claiming it would be the invented value §3.1
     * exists to refuse. No recipe below sets one.
     */
    perStep: ['accent', 'substep', 'flam', 'weak', 'alt-inst', 'probability'],

    /**
     * `internal: true` — the trigger is one of the six instruments and the enumeration is
     * exhaustive: `KIT: EXT IN` → `SideChnSrc  BD, SD, LT, HC, CH, OH`, *"Selects the instrument
     * that is used as the trigger for the side chain effect"* (Parameter Guide p.6).
     *
     * `fromExternalAudio: false`, and the field records where the *trigger* comes from, so
     * `false` is right — but on this box the thing being **ducked** is stranger than on either
     * sibling. The side chain lives on `EXT IN`, and this box's external input is `USB EXT IN`
     * (p.13's audio diagram): there is no input jack. So the feature ducks a computer's audio
     * and nothing else, and a reader with no computer attached has a side chain with nothing in
     * front of it.
     */
    sidechain: { internal: true, fromExternalAudio: false },

    /**
     * One LFO, shaped per kit (`KIT: LFO` — Waveform `SIN, TRI, SAW, SQR, S&H`, `Tempo Sync
     * OFF/ON`, and a `Rate` whose scale changes with it: `0–255` free, `64.00–0.25 step` in
     * quarter-step increments when synced, Parameter Guide p.6) and aimed per instrument (`LFO`
     * and `LFO Depth` in the INST table, p.7). The destinations here are the common-to-all-tones
     * half of that list; the rest of it only exists on sample and FM tones, so a flat list would
     * claim destinations that most kits do not have.
     */
    lfo: {
      count: 1,
      syncable: true,
      destinations: ['tune', 'decay', 'level', 'pan', 'reverb-send', 'delay-send', 'inst-fx'],
    },
  },

  /**
   * Gestures off the panel and the shortcut list (Owner's p.38). Jogs, not documentation
   * (invariant 7).
   */
  hints: {
    'accent-step': 'Hold [BD], press [SD], then pads',
    'sub-step': 'Press [SUB], then a pad',
    flam: 'Hold [SUB], turn [VALUE] to FLAM',
    'weak-step': 'Hold [SHIFT], press a pad',
    'alt-inst': 'Hold [BD]-[OH], press a pad',
    probability: 'Long-press a pad, press [COPY]',
    'motion-step': 'Hold a pad, turn a knob',
    'inst-edit': 'Hold [SHIFT], press [INST]',
    'kit-edit': 'Hold [SHIFT], press [KIT]',
    'sample-edit': 'Hold [SHIFT], press [SAMPLE]',
    'select-tone': 'Hold [KIT], press [INST]',
    'reverb-send': 'INST Edit > ReverbSend',
    'delay-send': 'INST Edit > DelaySend',
    'ptn-shuffle': 'Hold [SHIFT], press [PTN SELECT]',
  },

  /**
   * §12.4. **Deliberately left at the default of six.** The TR-1000 declares 8 of its 10 because
   * it is a box you overload; this is six tracks that are always there, always sequenced and
   * always mixed on six faders, and nothing in either document suggests a load at which it stops
   * being comfortable. Declaring a smaller number would be inventing a discomfort to look
   * cautious — and on a box with only six voices it would also be the difference between a rig
   * that resolves and one that does not.
   */

  manual: { title: 'TR-6S Parameter Guide', edition: 'eng02' },

  productPage: 'https://www.roland.com/global/products/tr-6s/',

  recipes,
}
