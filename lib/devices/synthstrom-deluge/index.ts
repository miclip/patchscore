import type { Device, Recipe } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { DELUGE_PANEL } from './panel'

/**
 * Synthstrom Audible Deluge (§2.3), running **community firmware `release_1_2_1` (Chopin)**.
 *
 * That assumption is load-bearing and is stated rather than implied. Community firmware adds
 * whole synth engines and views that stock does not have — the DX7 oscillator type, Automation
 * View, Performance View, the chord keyboards — so a guide written against stock would send this
 * user hunting for controls their box does not have, and would miss the ones it does. Two
 * features used below are gated behind community toggles that must be switched on:
 *
 *   - `DX7 ENGINE` — required for the DX7 oscillator type (`dx_synth.md`)
 *   - `Chord Keyboards (CHRD)` — required for the chord keyboard layouts (`chord_keyboard.md`)
 *
 * `DX7 ENGINE` is the one a recipe actually depends on, and that recipe says so in its `routing`
 * line — it is documented as experimental, and a recipe resting on an experimental feature should
 * admit it. The chord keyboards are an *assumption about this rig*, not something any recipe below
 * uses: they change how a part is played in, so the hint table names them and nothing else claims
 * them.
 *
 * **Sources, and which does what.** Three, answering different questions:
 *
 *   - `Deluge-Guidebook-4p1-OLED.pdf` (OS 4.1) — **every stock parameter range and option set**,
 *     cited as `manual` with a page. This is the only source for anything the stock box has.
 *   - `manuals/deluge-community/` @ `release_1_2_1` — which features exist and how they are
 *     reached, ranges for **community-added parameters**: the advanced arpeggiator's `RHYTHM` and
 *     `RATCHET PROBABILITY`, and the `FILTER ROUTE` option set — and, by the operator decision
 *     recorded below, the **envelope stage ranges** for a stock control the guidebook never ranges.
 *     Cited as `manual` with the tag in the source string, because a citation to a moving target
 *     that does not name the tag means nothing.
 *   - the unit — nothing here, deliberately. See below.
 *
 * **The split used to be strict, and the strictness had a cost this manifest was paying (#173).**
 * The rule was that a community menu doc stating a bound for a *stock* parameter is prose about a
 * moving target where the guidebook prints the box's own documented value, so the envelope stages
 * were not authored at all. The consequence was structural rather than cosmetic: with no attack,
 * no decay, no sustain, no release and nothing routing an envelope to pitch, **no recipe here
 * could describe a sound whose shape over time is the point** — which is every drum — and the only
 * way left to get one was to ask the reader to go and find a recording of it. Every percussive
 * role on this box needed a sample and every tonal role was synthesised, and that split was a fact
 * about the manifest, not about the Deluge.
 *
 * **The operator has ruled that `menus/envelope/*.md` establishes each 0-50 range**, and the four
 * files are unambiguous about it — *"0 represents the minimum attack time, 50 represents the
 * maximum"*, *"0 represents the shortest possible decay, 50 represents the longest"*, *"0 causes
 * the envelope to decay to 0, 50 means the envelope does not decay"*, *"0 represents a minimum
 * release time... 50 represents the maximum release time"*. The guidebook prints the *control*
 * (§4.5's workflow step 6, "ENV 1 to shape amplitude"; p.122's matrix, where ENV 1 is Hard Connect
 * to Overall Volume and ENV 2 is free) and never prints its bounds; the tagged community menus
 * print the bounds. Both halves are cited, each to the source that actually carries it.
 *
 * The rest of the split is unchanged, and so is the reason for it. This is a ruling about four
 * files, not a licence to reach for the community docs whenever the guidebook is silent — the
 * wavetable position still has no authored range, and `test/deluge.test.ts` pins the small list of
 * names a community citation may appear on.
 *
 * **No `observed` citation appears in this file.** `observed` means somebody took the reading off
 * the instrument (§3.1: "An observation is a real citation, not a hedge"). Nobody has. Where a
 * community-added parameter has no documented bound the answer is to author no numeric for it,
 * not to dress an invention as a reading — so the DX7 recipe sets the oscillator type the docs
 * enumerate and leaves operator levels, coarse tuning and envelope rates alone, because
 * `dx_synth.md` states no range for any of them.
 *
 * **What is deliberately not authored**, so that a guide stays realisable when several of these
 * recipes land in one song (invariant 5):
 *
 *   - **Filter `CUTOFF` and `RESONANCE`.** The guidebook documents the filter thoroughly (p.98)
 *     and never prints a range for either. The Deluge's 0-50 display scale is documented for many
 *     parameters but not for these, and assuming it here would be an inference, not a citation.
 *   - **`LFO RATE`, and LFO shape on its own.** Shapes and sync divisions are enumerated (p.84)
 *     and the rate is not — and a shape with no rate, no sync interval and no patched destination
 *     is not an instruction, it is a decoration. Nothing here sets an LFO.
 *   - **Wavetable `POSITION`.** No source prints a range for it. The envelope stages used to sit
 *     on this line beside it and no longer do — see the source split above.
 *   - **`PAN`.** p.86 prints "32L - 0 - 32R", which is a left/right *label* scale, not a signed
 *     number line. Encoding left as negative would be an inference about how the box represents
 *     the value, and `NumericRange` would then carry a bound nobody printed. A cited range has to
 *     be the range as printed, not a plausible transcription of it.
 *   - **Reverb `WIDTH`, `DAMPENING`, `SIZE`, `PAN`.** p.225 is explicit that only `AMOUNT` "is
 *     specific to each sound, synth, etc while all other parameters are common across sounds,
 *     instruments and song". Two recipes asking for different reverb widths could not both be
 *     honoured, so only `REVERB AMOUNT` is authored.
 *   - **Grain FX** and the analog delay model. `community_features.md` calls Grain FX
 *     "resource-intensive... suggested to use only one instance per song", which is exactly a
 *     recipe that stops being realisable the moment the resolver picks it twice.
 *
 * The box's own limit is CPU, not a track count: "Deluge's maximum voice count relies on the CPU
 * loading and processing power available, but around 64 is the limit for most basic synth sounds"
 * (p.99), with voices released by priority as load demands. Nothing here claims a hardware
 * capacity — `count` and `comfortableVoices` below mean different things, and neither is it.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The official guidebook, by printed page. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Deluge Official Guidebook OS 4.1 (OLED), p.${page}` }
}

/**
 * A community firmware doc, by file, **naming the tag**. The community docs move in a way a PDF
 * does not, so a citation that omits the tag says nothing checkable.
 */
function community(file: string): Cite {
  return { kind: 'manual', source: `Deluge community firmware release_1_2_1, ${file}` }
}

/**
 * Most Deluge parameters run on one display scale and, where a source prints it, it prints
 * `0-50`. Every use below cites the page or file that prints it for *that* parameter; there is no
 * blanket "everything is 0-50" claim here, because the sources do not make one.
 */
const Z50 = { min: 0, max: 50 }
/** p.84: "Number of octave range of arpeggiator.1-8". */
const OCTAVES = { min: 1, max: 8 }

/**
 * §3.2/#173. **A patch cable's depth is signed, and both halves of that are cited.**
 *
 * The guidebook establishes the connection and its sign and stops there: p.122's matrix ticks
 * ENV 2 against `Pitch / Transpose: Overall`, so the route exists; p.120 walks the reader through
 * making it and ends *"Depth can be positive and negative values"*. Neither page prints a bound.
 * `automation_view.md` @ `release_1_2_1` does, for exactly this class of parameter: *"For patch
 * cables / modulation depth, the grid value ranges for each pad have been adapted to accomodate
 * the full -50 to +50 range... The bottom pad in the grid will set the value to -50 and the top
 * pad in the grid will set the value to +50."*
 *
 * **This is not the `PAN` case, and the difference is the whole test.** `PAN` is excluded below
 * because p.86 prints "32L - 0 - 32R", a left/right *label* scale, and turning that into a signed
 * number line would be a transcription rather than a reading. Here the source prints the signed
 * numbers themselves — `-50` and `+50`, as numbers, against the two ends of the control — so the
 * range is the range as printed.
 */
const PITCH_DEPTH = { min: -50, max: 50 }

/**
 * Both halves in one citation, the same way `DX7_OPTIONS_CITE` spans two sources: naming only the
 * community doc would leave the connection and its sign unsubstantiated, and naming only the
 * guidebook would leave the bound invented.
 */
const PITCH_DEPTH_CITE: Cite = {
  kind: 'manual',
  source:
    'Deluge Official Guidebook OS 4.1 (OLED), p.120 and p.122 + community firmware release_1_2_1, automation_view.md',
}

function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  where: Cite,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name,
    value,
    range: { ...bounds, verified: where },
    verified: false,
    ...extra,
  }
}

/**
 * §6.1. The swing axis, as an ordinary cited numeric (#62).
 *
 * Guidebook p.39: *"Press [SHIFT] + turn (TEMPO) button. A swing % value between 1-99 can be
 * dialled in"*, with the diagram spelling out the neutral and both directions — `50 = Off`,
 * `51-99 = notes late`, `1-49 = notes early`. Bounds and neutral both printed, so the only
 * taste here is sitting at the neutral by default.

 * **The point stays `verified: false`, and that is not an oversight.** The page prints where the
 * neutral *is*; it does not say that this recipe should sit there. Those are two claims, and
 * §3.2 splits them exactly this way: the range is the legality gate and carries the citation,
 * the point is authority and is taste. Badging the point `manual` would put the manual's name to
 * "a soft pad wants no swing", which no page states. The neutral is a property of the scale, so
 * it travels on the range's own citation and in the `note` — which is how `EQ BASS AMOUNT`'s
 * "25 is neutral" is already carried on the Deluge.
 *
 * **Song-wide, and the page says so**: *"operates generically and not at an individual note
 * level"*. The `note` carries that, because the value appears under every part this box carries
 * and it is one setting, not one per clip.
 *
 * The community firmware this rig runs moves the *interval* menu to `SONG > SWING INTERVAL` and
 * adds a `TAP TEMPO`-held gesture for it (`community_features.md` 3.4), but the amount, its
 * range and the [SHIFT] + (TEMPO) gesture are the guidebook's and are unchanged — so the
 * citation is the guidebook, which is the document that actually prints the bounds.
 *
 * `amount` is 49, the distance from 50 to each printed bound, so the whole sweep of the knob
 * moves the value and no part of the travel is spent against a clamp.
 */
function swing(): AuthoredNumericParam {
  return num('SWING', 50, { min: 1, max: 99 }, cite(39), {
    unit: '%',
    mood: [{ axis: 'swing', amount: 49 }],
    hint: 'swing-amount',
    note: '50 is off, above is late, below is early — song-wide, not per clip',
    // `song`, not `pattern`, on the strength of this parameter's own note above — *song-wide,
    // not per clip* — which is the claim this file already commits to. Nothing here re-reads a
    // page to add to it. Hoisted the same way `pattern` is; only the printed word differs (#107).
    scope: 'song',
  })
}

/**
 * §3.2/#173. **One ADSR stage, cited to the menu file that prints its range.**
 *
 * Each of the four files carries its own sentence, so each stage cites its own file rather than
 * one blanket "the envelope menus say 0-50" — the same discipline every other range here follows.
 * `which` is 1 or 2 because the box has two per voice and the printed name (`ATTACK`) does not say
 * which one; p.122's matrix lists them as separate modulation sources, and ENV 1 is Hard Connect
 * to Overall Volume while ENV 2 is free, so they are not interchangeable and the name carries the
 * ordinal for the same reason `OSC 1 TYPE` does.
 */
function env(
  which: 1 | 2,
  stage: 'ATTACK' | 'DECAY' | 'SUSTAIN' | 'RELEASE',
  value: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  const file = `menus/envelope/${stage.toLowerCase()}.md`
  return num(`ENV ${which} ${stage}`, value, Z50, community(file), extra)
}

/** §3.2: the option set is legality and is cited; the selection is authority and is taste. */
function pick(
  name: string,
  value: string,
  options: string[],
  where: Cite,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: where },
    verified: false,
    ...extra,
  }
}

// ---------------------------------------------------------------------------
// Option sets, as the sources enumerate them
// ---------------------------------------------------------------------------

/**
 * §2.4 Views, p.18 — **which kind of clip to make, as a parameter rather than as prose (#172).**
 *
 * The page enumerates the whole set twice: the CLIP VIEW caption reads *"Single synth, kit, audio,
 * MIDI or CV clips configured as individual sequences"*, and the panel callout beside it names
 * each view and how the box shows it — SYNTH CLIP VIEW "Synth button lit red", KIT CLIP VIEW "Kit
 * button lit red", AUDIO CLIP VIEW "All buttons off / unlit", MIDI CLIP VIEW, CV CLIP VIEW. All
 * five are listed for the same reason the `IN*` oscillator types are: the option set is what the
 * box offers, and no recipe here selects Audio, MIDI or CV.
 *
 * **Why this is a parameter at all.** `deluge-kick-hard` was titled "Kit-row kick" and printed
 * nothing a reader could act on to get to a kit — and its one machine-readable identifier,
 * `OSC 1 TYPE`, is a *synth-page* label, so the guide pointed away from the page the values belong
 * on. A title is prose: §3's params are what the renderer surfaces, what `verified` attaches to
 * and what the audit counts, so a claim that lives only in a title is invisible to all three. This
 * is the same move the TR-8S makes with its loaded tone and the minilogue xd with its scale
 * switch — the thing that decides *which control* a value belongs to travels with the value.
 *
 * The selection stays taste (`verified: false`) like every other `pick` here: p.18 prints the set,
 * not the claim that a hard kick wants a kit row.
 */
const CLIP_TYPES = ['Synth', 'Kit', 'Audio', 'MIDI', 'CV']

/**
 * p.81, verbatim: "Waveform Options. Digital: Sine, Saw, Square, Triangle. Analog Modelled:
 * Analog Saw, Analog Square. Audio: Wavetable, Sample, IN (Expandable to INL, INR, INLR)". The
 * `IN*` types monitor the physical inputs under stated conditions, so no recipe selects one —
 * they are listed because the option set is what the box offers, and trimming it to what happens
 * to be authored hides the box.
 *
 * **The parameter is `OSC 1 TYPE` everywhere, and that spelling is deliberate (#172).** The
 * guidebook's table gives this control as the `TYPE` parameter of the `OSCILLATOR 1 / CARRIER 1
 * (FM)` function, and gives oscillator 2 a `TYPE` of its own on p.82 — the printed name alone does
 * not say which oscillator, and the row it sits in is what disambiguates it. The manifest used to
 * spell the same control two ways, `OSC TYPE` on eighteen recipes and `OSC 1 TYPE` on the DX7 one;
 * they are one control, and the name that carries the ordinal is the one that survives.
 */
const OSC_TYPES = [
  'Sine',
  'Saw',
  'Square',
  'Triangle',
  'Analog Saw',
  'Analog Square',
  'Wavetable',
  'Sample',
  'IN',
  'INL',
  'INR',
  'INLR',
]

/** p.83: "Switches LPF type between 12dB per Octave, 24dB per octave and DRIVe filter". */
const LPF_MODES = ['12dB/Octave', '24dB/Octave', 'DRIVE']

/** p.216: "'OFF', 'FLANGER', 'CHORUS' or 'PHASER'". */
const MOD_FX_TYPES = ['OFF', 'FLANGER', 'CHORUS', 'PHASER']

/** p.81, sample playback: ONCE, CUT, LOOP, STRETCH. */
const REPEAT_MODES = ['ONCE', 'CUT', 'LOOP', 'STRETCH']

/**
 * Community `release_1_2_1` replaced the stock `Mode` pad with an **`Arp preset`** shortcut that
 * sets three settings at once, so the stock OFF/UP/DOWN/BOTH/RANDOM list on p.253 no longer
 * describes this firmware. `community_features.md` §4.3.8 enumerates the presets, `Custom`
 * included — that one opens a submenu for Octave Mode and Note Mode rather than fixing them.
 */
const ARP_PRESETS = ['Off', 'Up', 'Down', 'Both', 'Random', 'Custom']

/**
 * The DX7 option array spans both sources, and so does its citation: p.81 carries the stock
 * oscillator types, `dx_synth.md` @ `release_1_2_1` carries the DX7 entry community firmware
 * adds. Citing only the community doc would leave eleven of the twelve options unsubstantiated.
 */
const DX7_OPTIONS_CITE: Cite = {
  kind: 'manual',
  source:
    'Deluge Official Guidebook OS 4.1 (OLED), p.81 + community firmware release_1_2_1, dx_synth.md',
}

/** `community_features.md`, `FILTER ROUTE`, SOUND menu only — community-added. */
const FILTER_ROUTES = ['HPF TO LPF', 'LPF TO HPF', 'PARALLEL']

/**
 * **The first thing the reader does at the box, so it is the first parameter printed (#172).**
 *
 * Every recipe carries one. The split is not a taste call recipe by recipe — it follows the sound
 * source, which is the line the guidebook itself draws: §5.2 (p.108) says *"If synth clips mainly
 * support melodic elements with the ability for sample use, kits would more often be used with
 * samples as the primary elements"*. So a recipe that loads a one-shot is a **kit row** and a
 * recipe that sounds the internal engine is a **synth clip**, which lands exactly on this
 * manifest's `sourceAudio` recipes — all nine of them, and only them, set `OSC 1 TYPE` to Sample.
 *
 * Neither Audio, MIDI nor CV is selected anywhere, and that is the same fact twice: an audio clip
 * has no oscillator at all, so `OSC 1 TYPE`, `REPEAT MODE` and the rest of what these recipes set
 * do not exist on one; MIDI and CV clips drive something that is not this box.
 *
 * The `clip-type` hint carries the gesture — [SHIFT] + [SYNTH] creates a synth clip (p.87),
 * [SHIFT] + [KIT] creates a kit clip (p.112), both from clip view.
 */
function clipType(value: 'Synth' | 'Kit'): AuthoredEnumParam {
  return pick('CLIP TYPE', value, CLIP_TYPES, cite(18), { hint: 'clip-type' })
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------

/**
 * One general pool. Synth clips and kit rows between them cover every role there is: a kit row
 * holds a sample and does the drum roles, a synth clip does the tonal ones, and a MIDI or CV clip
 * drives something else entirely. There is no capability line to draw inside this device, so
 * there is one pool and not several — the Tracker Mini's two pools exist because *that* box draws
 * one.
 */
const TRACK_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture',
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
]

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

const RECIPES: Recipe[] = [
  // ---- low ------------------------------------------------------------------------
  /**
   * #173. **The kick set, and why it is three recipes rather than one.**
   *
   * The directions ask for `soft`, `hard`, `dark`, `hard`, `hard`. `hard` is three of the five and
   * industrial-techno is one of them, which is the case the operator raised: *"for the deluge and
   * a techno direction, why not use the Kit source and a TR-808 or something vs a Sample?"*. So
   * `hard` is where a synthesised recipe has to land. Putting it on `dark` instead would have left
   * the complaint alive on the direction that prompted it.
   *
   * **A sine with a pitch drop is not only a clean kick.** That reading is true of a *bare* sine,
   * and it is why `dark` below is worth having. It is not true of what this box does with one:
   * this manifest already carries `DECIMATION` and `BITCRUSH` (p.217), and sine plus a fast pitch
   * drop plus saturation is not an approximation of a hard techno kick, it is how one is made. The
   * `hard` recipe reaches for edge the way the old sampled recipe did, on the same two controls,
   * with the shape underneath it now specified rather than sourced.
   *
   *   - `hard`  — synthesised, fast drop, decimated and crushed. Three directions.
   *   - `dark`  — synthesised, gentler drop, longer body, no saturation at all. One direction.
   *   - `dirty` — the sampled recipe, which keeps its place because a loaded one-shot is how
   *               plenty of people do it and the point was never to remove that route.
   *
   * **Kit, not Synth, on both synthesised recipes, and that is the point of the row hint.** The
   * drums belong in one kit clip, and p.87 documents making a row of it synthesised rather than
   * sampled — "CREATING A NEW SYNTHESIZER ROW IN A KIT CLIP... Press [AUDITION] + [SYNTH] to
   * create a synth clip on the row selected". A `Kit` clip type with no `sourceAudio` is a
   * combination the manifest could not express before #172 modelled the clip type at all.
   *
   * **How the two envelopes divide the work** (p.122's matrix, and §6.3 on p.125): ENV 1 is *Hard
   * Connect* to Overall Volume — "ENV1 controls volume amplitude by default" — so its four stages
   * shape the amplitude with no patching. ENV 2 "has freely assignable destinations", and the
   * matrix ticks it against `Pitch / Transpose: Overall`, which is the pitch drop.
   *
   * **`ENV 2 SUSTAIN` is 25, not 0, and the difference is the whole of p.125.** The community menu
   * file says "0 causes the envelope to decay to 0", and that is the *volume* reading — §6.3 is
   * explicit that a second scale is in force here: *"When either of the 2 envelopes modulate a
   * parameter other than volume level, it does so with a 'bipolar' behaviour... when the sustain
   * is set to 25 (default for ENV2), that stage of the envelope will match the current setting of
   * the target parameter without modulation. Sustain settings below 25 will then modulate the
   * parameter lower than its current setting"*. So on a pitch destination 25 is the note and 0 is
   * *below* the note — an envelope that ends flat and stays there. This manifest had 0, with a
   * note claiming it returned the pitch to the note, which was the CLAUDE.md failure exactly: a
   * cited range with the point read off the wrong one of two printed scales. The bound is still
   * `sustain.md`'s 0-50; what changed is which scale that bound is being read on.
   *
   * `ENV 1 SUSTAIN` stays 0, and the asymmetry is the same sentence: p.125's bipolar rule is for
   * "a parameter other than volume level", and ENV 1's destination *is* volume level.
   *
   * **No `ENV 2 RELEASE`.** With ENV 1's amplitude already at silence, a pitch still moving after
   * note-off is inaudible, and authoring a value nobody can hear is the decoration this manifest
   * refuses elsewhere. `ENV 1 RELEASE` *is* authored, because a grid note can end before the decay
   * has finished and then the release is what the reader hears.
   */
  {
    id: 'deluge-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Synth kick on a kit row — sine, fast pitch drop, decimated',
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sine', OSC_TYPES, cite(81), { hint: 'kit-synth-row' }),
      env(1, 'ATTACK', 1, {
        hint: 'env-menu',
        note: 'the menus recommend at least 1; 0 is likely to click',
      }),
      env(1, 'DECAY', 17, { note: '0 is the shortest decay, 50 the longest' }),
      env(1, 'SUSTAIN', 0, { note: '0 decays away to nothing, which is what a drum does' }),
      env(1, 'RELEASE', 5),
      env(2, 'ATTACK', 1),
      env(2, 'DECAY', 6, { note: 'this is how fast the pitch falls' }),
      env(2, 'SUSTAIN', 25, {
        note: 'p.125: on a pitch destination 25 is the note itself, and below 25 goes flat',
      }),
      num('ENV 2 → PITCH DEPTH', 22, PITCH_DEPTH, PITCH_DEPTH_CITE, {
        hint: 'env2-pitch',
        note: 'destination is Pitch / Transpose: Overall; positive lifts the attack above the note',
      }),
      // The edge, on the two controls the old sampled recipe already used. Below every `dirty`
      // recipe on this box, which is what keeps `hard` and `dirty` apart as characters rather
      // than as labels.
      num('DECIMATION', 12, Z50, cite(217), { mood: [{ axis: 'grit', amount: 12 }] }),
      num('BITCRUSH', 6, Z50, cite(217), { mood: [{ axis: 'grit', amount: 6 }] }),
      num('EQ BASS AMOUNT', 33, Z50, cite(219), { note: '25 is neutral; above boosts' }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 127 }, hint: 'note-velocity' }],
    verified: false,
  },
  /**
   * #173. **The clean one. Same construction, every value pulled the other way.**
   *
   * `dark` is lydian-house's request, and a bare sine with a gentle drop is exactly right for it —
   * which is the reading that made `dark` look like the whole answer, and is why it survives as
   * one of three rather than as the only one. Against `hard`: the pitch drop is smaller (13 against
   * 22) and slower (`ENV 2 DECAY` 11 against 6), the body is longer (`ENV 1 DECAY` 26 against 17),
   * and there is no `DECIMATION` and no `BITCRUSH` at all. The treble is cut and carries the
   * darkness axis, the way `sub`/`dark` and `open-hat`/`dark` already do on this box.
   */
  {
    id: 'deluge-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'track',
    title: 'Clean sine kick, long body, gentle pitch drop',
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sine', OSC_TYPES, cite(81), { hint: 'kit-synth-row' }),
      env(1, 'ATTACK', 1, {
        hint: 'env-menu',
        note: 'the menus recommend at least 1; 0 is likely to click',
      }),
      env(1, 'DECAY', 26, { note: 'longer than the hard kick — this is the body' }),
      env(1, 'SUSTAIN', 0, { note: '0 decays away to nothing, which is what a drum does' }),
      env(1, 'RELEASE', 8),
      env(2, 'ATTACK', 1),
      env(2, 'DECAY', 11, { note: 'slower than the hard kick — the drop is a fall, not a click' }),
      env(2, 'SUSTAIN', 25, {
        note: 'p.125: on a pitch destination 25 is the note itself, and below 25 goes flat',
      }),
      num('ENV 2 → PITCH DEPTH', 13, PITCH_DEPTH, PITCH_DEPTH_CITE, {
        hint: 'env2-pitch',
        note: 'destination is Pitch / Transpose: Overall; positive lifts the attack above the note',
      }),
      num('EQ TREBLE AMOUNT', 18, Z50, cite(219), {
        mood: [{ axis: 'darkness', amount: -6 }],
        note: '25 is neutral; below cuts',
      }),
      num('EQ BASS AMOUNT', 34, Z50, cite(219), { note: '25 is neutral; above boosts' }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { velocity: 108 } }],
    verified: false,
  },
  /**
   * #173. **The sampled kick, moved to `dirty` and made to earn it.**
   *
   * It kept its slot for as long as it was the only kick here. It is not any more, and two kicks
   * cannot share `(kick, hard, track)` — §3's uniqueness key admits a second recipe only on a
   * different key, and the Tracker Mini pad pair is not a precedent for this because that pair
   * splits on `Realisation`, which is a claim about *note count*. Two kicks are both one note.
   *
   * `hard` and `dirty` are orthogonal in `CHAR` rather than near-synonyms, so this is a real move
   * — but it had to be earned by the parameters and not by the slot. As authored it was an EQ bass
   * lift and `DECIMATION 6` of 50, which is the "edge" its old title claimed and is not a dirty
   * kick. The decimation is up to 21 and `BITCRUSH` is authored beside it, which puts this recipe
   * in the same band as the three other `dirty` recipes on this box (`bass-mid` at 14/9, `acid` at
   * 17/7, `noise` at 13/21), and the title says what it now is. Both ranges are p.217's, unchanged.
   *
   * It also has to stay clear of `hard`, which now carries the same two controls at 12/6. It does,
   * on both, and by a margin larger than the gap between any two `dirty` recipes here — otherwise
   * the two characters would be one sound at two labels, which is the failure the move was for.
   */
  {
    id: 'deluge-kick-dirty',
    role: 'kick',
    character: 'dirty',
    voice: 'track',
    title: 'Sampled kick, decimated and crushed',
    sourceAudio: {
      need: 'A 909-style kick — click on the front, short body, no room on it',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('REPEAT MODE', 'ONCE', REPEAT_MODES, cite(81)),
      num('DECIMATION', 21, Z50, cite(217), { mood: [{ axis: 'grit', amount: 16 }] }),
      num('BITCRUSH', 13, Z50, cite(217), { mood: [{ axis: 'grit', amount: 12 }] }),
      num('EQ BASS AMOUNT', 33, Z50, cite(219), { note: '25 is neutral; above boosts' }),
      num('EQ BASS FREQUENCY', 14, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 127 }, hint: 'note-velocity' }],
    verified: false,
  },
  {
    id: 'deluge-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'Sine sub with the top end cut away',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Sine', OSC_TYPES, cite(81)),
      num('EQ TREBLE AMOUNT', 17, Z50, cite(219), {
        mood: [{ axis: 'darkness', amount: -6 }],
        note: '25 is neutral; below cuts',
      }),
      num('EQ BASS AMOUNT', 31, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { velocity: 112 } }],
    verified: false,
  },
  {
    id: 'deluge-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'Analog saw bass through the drive filter, crushed',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
      pick('LPF MODE', 'DRIVE', LPF_MODES, cite(83)),
      num('DECIMATION', 14, Z50, cite(217), { mood: [{ axis: 'grit', amount: 14 }] }),
      num('BITCRUSH', 9, Z50, cite(217), { mood: [{ axis: 'grit', amount: 12 }] }),
      num('EQ BASS AMOUNT', 29, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { probability: 90 }, hint: 'note-probability' }],
    verified: false,
  },

  // ---- backbeat and metal ---------------------------------------------------------
  {
    id: 'deluge-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'track',
    title: 'Snare with the treble lifted, rolling on the fill',
    sourceAudio: {
      need: 'A 909-style snare — noise and crack over a short body, dry',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      num('EQ TREBLE AMOUNT', 34, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -7 }] }),
      num('EQ TREBLE FREQUENCY', 30, Z50, cite(219)),
      num('REVERB AMOUNT', 8, Z50, cite(225), { mood: [{ axis: 'space', amount: 12 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'backbeat', set: { velocity: 118 } },
      { slot: 'fill', set: { iteration: '2 of 4' }, hint: 'note-iteration' },
    ],
    verified: false,
  },
  {
    id: 'deluge-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'Clap sitting back in the reverb',
    sourceAudio: {
      need: 'A 909-style clap — several hands and a short room tail, in stereo',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      num('REVERB AMOUNT', 19, Z50, cite(225), { mood: [{ axis: 'space', amount: 16 }] }),
      num('EQ TREBLE AMOUNT', 31, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -5 }] }),
      swing(),
    ],
    articulation: [{ slot: 'backbeat', set: { velocity: 110 } }],
    verified: false,
  },
  {
    id: 'deluge-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track',
    title: 'Dry rim, thinned out, dropped in and out',
    sourceAudio: {
      need: 'An 808-style rim — a dry woodblock tick, close to transient-only',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      num('EQ BASS AMOUNT', 19, Z50, cite(219), { note: '25 is neutral; below cuts' }),
      num('EQ TREBLE AMOUNT', 28, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -4 }] }),
      swing(),
    ],
    articulation: [{ slot: 'ghost', set: { probability: 55 }, hint: 'note-probability' }],
    verified: false,
  },
  {
    id: 'deluge-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
    title: 'Closed hat with the bass rolled off',
    sourceAudio: {
      need: 'An 808-style closed hat — a short metallic tick under 150 ms, dry',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('REPEAT MODE', 'CUT', REPEAT_MODES, cite(81)),
      num('EQ TREBLE AMOUNT', 32, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -6 }] }),
      num('EQ BASS AMOUNT', 18, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { velocity: 88 } }],
    verified: false,
  },
  {
    id: 'deluge-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'track',
    title: 'Open hat filtered down, decaying into the bar',
    sourceAudio: {
      need: 'A 909-style open hat — a real sampled tail to gate',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('LPF MODE', '24dB/Octave', LPF_MODES, cite(83)),
      num('EQ TREBLE AMOUNT', 20, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -8 }] }),
      num('REVERB AMOUNT', 10, Z50, cite(225), { mood: [{ axis: 'space', amount: 12 }] }),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { velocity: 96 } }],
    verified: false,
  },
  {
    id: 'deluge-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Quiet percussion filling the gaps',
    sourceAudio: {
      need: 'A 707-style shaker or tambourine — a soft tick under 100 ms',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      num('REVERB AMOUNT', 12, Z50, cite(225), { mood: [{ axis: 'space', amount: 14 }] }),
      num('EQ BASS AMOUNT', 20, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'ghost', set: { probability: 45 }, hint: 'note-probability' }],
    verified: false,
  },

  // ---- tonal ----------------------------------------------------------------------
  {
    id: 'deluge-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'Wavetable pad, slow chorus, wide reverb send',
    /**
     * §3/#101. **A wavetable oscillator has no sound until a file is chosen**, and this recipe
     * said `OSC 1 TYPE Wavetable` and stopped — the reader set the type and got nothing, with no
     * line telling them why. p.87: the shortcut is "to select audio or wavetable file as
     * oscillator 1". p.95's CREATING A WAVETABLE SYNTHESIZER is the procedure: *"Navigate the SD
     * card files to select the wavetable to load. Press (SELECT) to load the desired wavetable
     * file."*
     *
     * Every `Sample` recipe on this box already carries a `sourceAudio`; this was the only
     * `Wavetable` one and it was the only recipe missing it. The rule was known and applied to
     * one oscillator type and not the other.
     *
     * **Three conditions the note now states, all p.110, and all of them fail quietly.** A
     * wavetable must be `WAV or AIFF and MONO`; a stereo file *"is not compatible with the
     * wavetable engine"* and loads as a sample instead, with no error. And Deluge *"will
     * interpret any audio file less than 20ms and when loaded in the synth as a single-cycle
     * waveform"*, for which *"the wavetable navigation parameter is not available"* — so a short
     * file leaves `WAVE` doing nothing at all.
     *
     * The last of those contradicted this recipe's own guidance, which promised that WAVE sweeps
     * across the cycles. True of a multi-cycle table and false of a single cycle, and the note
     * did not say which it needed.
     */
    sourceAudio: {
      need:
        'A multi-cycle wavetable that drifts rather than steps — soft, vowel- or string-like, ' +
        'with each cycle close to its neighbour. WAVE sweeps across the cycles, so a table whose ' +
        'frames jump reads as stepping under a slow pad. ' +
        'It must be WAV or AIFF and MONO (p.110): a stereo file is not compatible with the ' +
        'wavetable engine and silently loads as a sample instead, which is the thing to suspect ' +
        'if the type will not stay set. ' +
        'It must also be longer than 20 ms — Deluge reads anything shorter as a single-cycle ' +
        'waveform, and wave navigation is not available for single cycles (p.110), so WAVE will ' +
        'do nothing and the pad will not drift. ' +
        'Bring your own: the factory card is samples in SAMPLES/ARTISTS and SAMPLES/DRUMS and ' +
        'the guidebook names no wavetable folder. Load it and the type below sets itself',
    },
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Wavetable', OSC_TYPES, cite(81), { hint: 'load-wavetable' }),
      pick('MOD FX TYPE', 'CHORUS', MOD_FX_TYPES, cite(216)),
      num('MOD FX RATE', 9, Z50, cite(229)),
      num('REVERB AMOUNT', 27, Z50, cite(225), { mood: [{ axis: 'space', amount: 18 }] }),
      num('EQ TREBLE AMOUNT', 27, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -7 }] }),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { automation: 1 }, hint: 'automation-view' }],
    verified: false,
  },
  {
    id: 'deluge-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    title: 'Analog saw lead, treble up, delay trailing behind',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
      pick('LPF MODE', '12dB/Octave', LPF_MODES, cite(83)),
      num('EQ TREBLE AMOUNT', 33, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -9 }] }),
      // Rate without amount is a delay nobody can hear; both are authored or neither is.
      num('DELAY AMOUNT', 14, Z50, cite(222), { mood: [{ axis: 'space', amount: 10 }] }),
      num('DELAY RATE', 24, Z50, cite(222)),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 124 } }],
    verified: false,
  },
  {
    id: 'deluge-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'Square stab through a fast phaser',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Analog Square', OSC_TYPES, cite(81)),
      pick('MOD FX TYPE', 'PHASER', MOD_FX_TYPES, cite(216)),
      num('MOD FX RATE', 16, Z50, cite(229)),
      num('MOD FX FEEDBACK', 18, Z50, cite(229), { note: 'Flanger and phaser types only' }),
      num('EQ TREBLE AMOUNT', 29, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -6 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 120 } }],
    verified: false,
  },
  {
    id: 'deluge-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'track',
    title: 'Two-octave arp on a rhythm preset, with ratchets',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Square', OSC_TYPES, cite(81)),
      pick('ARP PRESET', 'Up', ARP_PRESETS, community('community_features.md')),
      num('ARP GATE', 22, Z50, cite(102), {
        hint: 'arp-menu',
        mood: [{ axis: 'density', amount: 8 }],
        note: '50 fills the whole time slot; 25 is half the note division',
      }),
      num('ARP OCTAVES', 2, OCTAVES, cite(84)),
      num('ARP RHYTHM', 11, Z50, community('community_features.md'), {
        note: '51 rhythm patterns, 0-50; 0 is the straight one',
      }),
      num('ARP RATCHET PROBABILITY', 14, Z50, community('community_features.md'), {
        note: '0 is never, 50 is always',
      }),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { probability: 95 } }],
    verified: false,
  },
  {
    id: 'deluge-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'track',
    title: 'Saw through the drive ladder, filters in series',
    routing:
      '**Slide:** none is programmed here. The four step lanes this box declares are velocity, probability, iteration and automation — none of them a glide — so a slide on this part is a portamento set on the synth itself and applied to every note, not a step you mark',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
      pick('LPF MODE', 'DRIVE', LPF_MODES, cite(83)),
      pick('FILTER ROUTE', 'HPF TO LPF', FILTER_ROUTES, community('community_features.md')),
      num('DECIMATION', 17, Z50, cite(217), { mood: [{ axis: 'grit', amount: 16 }] }),
      num('BITCRUSH', 7, Z50, cite(217), { mood: [{ axis: 'grit', amount: 10 }] }),
      swing(),
    ],
    articulation: [{ slot: 'accent', set: { velocity: 127 } }],
    verified: false,
  },
  {
    id: 'deluge-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'DX7 bed sent to the reverb and the delay',
    params: [
      clipType('Synth'),
      // The DX7 engine is an OSC1 type on the subtractive engine (`dx_synth.md`). Its own
      // parameters — operator levels, coarse tuning, algorithm, feedback — carry no documented
      // range in any source, so none of them is authored here.
      pick('OSC 1 TYPE', 'DX7', [...OSC_TYPES, 'DX7'], DX7_OPTIONS_CITE),
      num('REVERB AMOUNT', 30, Z50, cite(225), { mood: [{ axis: 'space', amount: 20 }] }),
      num('DELAY AMOUNT', 11, Z50, cite(222), { mood: [{ axis: 'space', amount: 8 }] }),
      num('EQ TREBLE AMOUNT', 22, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -8 }] }),
      swing(),
    ],
    routing:
      'Needs the DX7 ENGINE community setting on; create with CUSTOM 1 + SYNTH. Documented as experimental.',
    verified: false,
  },
  {
    id: 'deluge-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track',
    title: 'Crushed noise wash under the drums',
    // #173's lineage reframe stops here, and that is the reframe working rather than an omission.
    // "An 808-style kick" is a recommendation about a sound; there is no drum-machine lineage for
    // room tone, and naming one to match the others would be the invention the reframe replaced.
    sourceAudio: {
      need:
        'A noise or air bed that loops without a seam — rain, tape hiss, room tone. It plays ' +
        'under everything on LOOP, so a click at the loop point is audible every pass',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('REPEAT MODE', 'LOOP', REPEAT_MODES, cite(81)),
      num('BITCRUSH', 21, Z50, cite(217), { mood: [{ axis: 'grit', amount: 18 }] }),
      num('DECIMATION', 13, Z50, cite(217), { mood: [{ axis: 'grit', amount: 12 }] }),
      num('EQ BASS AMOUNT', 16, Z50, cite(219)),
      swing(),
    ],
    verified: false,
  },

  // ---- transitional ---------------------------------------------------------------
  {
    id: 'deluge-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'Saw riser, top end open, thrown into the reverb',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Saw', OSC_TYPES, cite(81)),
      num('EQ TREBLE AMOUNT', 35, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -8 }] }),
      num('REVERB AMOUNT', 23, Z50, cite(225), { mood: [{ axis: 'space', amount: 16 }] }),
      num('DELAY AMOUNT', 16, Z50, cite(222), { mood: [{ axis: 'space', amount: 10 }] }),
      swing(),
    ],
    articulation: [{ slot: 'last-hit', set: { automation: 1 }, hint: 'automation-view' }],
    verified: false,
  },
  {
    id: 'deluge-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'Downbeat impact, decimated, long reverb send',
    // Left generic for the same reason as the noise bed above: an impact is whatever is big
    // enough, and no drum machine owns that sound.
    sourceAudio: {
      need: 'A one-shot with a big front — a crash, a gated slam',
    },
    params: [
      clipType('Kit'),
      pick('OSC 1 TYPE', 'Sample', OSC_TYPES, cite(81)),
      num('DECIMATION', 20, Z50, cite(217), { mood: [{ axis: 'grit', amount: 14 }] }),
      num('REVERB AMOUNT', 34, Z50, cite(225), { mood: [{ axis: 'space', amount: 14 }] }),
      num('EQ BASS AMOUNT', 32, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { velocity: 127 } }],
    verified: false,
  },
  {
    id: 'deluge-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'track',
    title: 'Slow phaser sweep across the transition',
    params: [
      clipType('Synth'),
      pick('OSC 1 TYPE', 'Triangle', OSC_TYPES, cite(81)),
      pick('MOD FX TYPE', 'PHASER', MOD_FX_TYPES, cite(216)),
      num('MOD FX RATE', 7, Z50, cite(229)),
      num('MOD FX FEEDBACK', 22, Z50, cite(229), { note: 'Flanger and phaser types only' }),
      num('REVERB AMOUNT', 26, Z50, cite(225), { mood: [{ axis: 'space', amount: 18 }] }),
      swing(),
    ],
    articulation: [{ slot: 'last-hit', set: { automation: 1 }, hint: 'automation-view' }],
    verified: false,
  },
]

export const device: Device = {
  id: 'synthstrom-deluge',
  name: 'Deluge',
  maker: 'Synthstrom Audible',
  kind: 'groovebox',

  /**
   * Rear panel, p.6: MIDI In/Out on 5-pin DIN, USB-B carrying USB MIDI, a Clock In jack, and four
   * Gate/Trigger outs whose trigger clock has an "adjustable PPQN out / 192 PPQN out". So it
   * sends or receives clock over any of the three.
   *
   * **`preferredSource` is not claimed (§7.4/#80), and this one was close.** Of the nine boxes
   * #80 asked about, this is the one with the most designed-in support for driving other gear: a
   * whole clip *type* per external device, MIDI clips and CV clips with their own arpeggiators,
   * and §12.2's "Typical MIDI Set Up" drawing (p.239) with a synth module captioned
   * *"controllable via the Deluge sequencer"* hanging off its MIDI out.
   *
   * It is still not a statement of what this box is *for*, and the guidebook never makes one —
   * there is no positioning sentence anywhere in it. §1.4 "System Architecture" (p.9) is an
   * entirely *internal* diagram: oscillators, engines, kit, effects, sequencer, and no external
   * device on it at all. The nearest thing to a role sentence is p.253's *"Deluge can be a
   * controller for external MIDI devices"* — "can be", the capability hedge this field exists to
   * refuse — and §§12.4-12.6 spend four printed pages on the Deluge as the *follower*, taking
   * system-level commands from outside. The MIDI chapter is symmetric, and a box documented
   * symmetrically has not been told which end of the cable is its job.
   *
   * **p.18 is not the evidence either**, and was considered: it is §2.4 "Views", a taxonomy of
   * clip/song/arranger/keyboard view whose only external-gear content is a bracket grouping the
   * MIDI and CV clip views. A list of view modes is not a claim about a rig.
   */
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb', 'analog-clock'] },

  // Two 1/4" main outs, "Right" and "Left / Mono" (p.6, p.8), plus a headphone out; line in and
  // mic in; the two CV outs and four gate/trigger outs are control voltage, not audio, so
  // `individualOuts` is 0. The guidebook documents USB-B as MIDI, power and USB host only — there
  // is no USB audio interface mode, so `usbAudio` is false.
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §2.6/#111. **The card the box ships with arrives loaded, and §2.1 is titled "Factory
   * Library".**
   *
   * PDF page 18, printed p.12: "The Deluge is supplied with a formatted SD card loaded with the
   * factory library. Samples are streamed directly from the SD card when in use, making it an
   * integral part of the device." The File Structure drawing below it annotates each folder, and
   * the annotations are the finding: `SAMPLES/ARTISTS` is "Supplied artist samples" and
   * `SAMPLES/DRUMS` is "Supplied drum samples", against `CLIPS`, `RECORD` and `RESAMPLE` marked
   * user files or initially empty. The card is not blank and the guidebook says which two folders
   * are ours.
   *
   * **This was recorded `unknown` on a search of the guidebook, and the answer was in a drawing.**
   * The reasoning was that the book enumerates synth presets, not samples, and that p.309 says
   * only where samples must live (`/Samples`) — both true, and neither is this page. `pdftotext`
   * returns the folder names without the annotations that give them meaning, which is the fourth
   * fact in this pass to live where a text dump cannot reach it. The page was rendered.
   *
   * Not `enumerable`: the drawing prints example filenames for KITS and SYNTHS (`000 TR-808.XML`
   * through `042 Phil Elverum.XML`) and none at all for the two sample folders, and those two are
   * what a `sourceAudio` recipe here loads — every one of them is a Sample oscillator.
   */
  content: {
    kind: 'shipped-library',
    library: 'a factory library on the supplied SD card',
    location: 'SAMPLES/ARTISTS and SAMPLES/DRUMS',
    reason: 'p.12 marks both folders as supplied samples and never names one of them',
  },

  /**
   * §2.6/#22. **Two entries: one page, and one finding that is not a page.**
   *
   * This manifest's pages are otherwise still in the comments above — the TR-1000 is the one that
   * has migrated, and its map is the worked example. `content` is here because §2.6/#111 requires
   * it of any box a recipe loads audio onto, and it is a citation because the guidebook answers.
   * `clock.preferredSource` is the opposite case: #80 asked a question this guidebook does not
   * answer, and `unknown` exists so that finding can be written down instead of reading as
   * silence. Not `cited-against` (#120): the guidebook does not answer in the other direction
   * either, it hedges and then documents both directions at equal length. See the `clock` comment
   * for what was read and rejected.
   */
  /**
   * §2.6/#142. **A note's length is its extent on the grid, and you set it with two pads.** p.48:
   * *"Note lengths can be set when entering clip notes by pressing the note START [PAD] + END
   * [PAD] on the same row"*, with the extension pads dimly lit to show the length and a press on
   * one of them shortening it.
   *
   * `per-note-value` even though there is no numeric field, and the distinction is not worth a
   * sixth state: the note carries a length of its own, the reader sets it per note, and the unit
   * is the grid's own step — which is the unit the hook is already printed in. What `control`
   * names here is the gesture rather than a screen label, because that is what this box gives a
   * reader to point at.
   */
  noteDuration: {
    kind: 'per-note-value',
    control: 'the note’s extent on the grid — hold its start pad and press its end pad',
    unit: 'grid steps at the current zoom',
  },

  capabilityEvidence: {
    noteDuration: cite(48),
    // §2.6/#111. §2.1 Factory Library, and the File Structure drawing beneath it — see `content`.
    content: cite(12),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the guidebook never states what this box is for; p.253 hedges to “can be a controller for external MIDI devices”, §1.4’s architecture diagram (p.9) is entirely internal, and §§12.4-12.6 document the Deluge as the follower at equal length',
    },
  },

  /**
   * §10. 305 mm horizontal span, from Synthstrom's published 305 x 208 x 46 mm.
   *
   * Orientation checked against the diagrams rather than assumed: the plan view in 1.2 What's in
   * the Box (p.3) is landscape and measures ~1.48 in aspect against 305/208 = 1.47, and the Rear
   * Panel / Front Panel drawings (p.6) show the jack-bearing long edge running horizontally. So
   * the stated width is the horizontal span here, as it is for the TR-1000 and as it is *not* for
   * the Tracker Mini.
   *
   * The guidebook states no dimensions anywhere — the Overview drawings carry no dimension lines
   * unlike the Tracker Mini's, there is no specifications section, and the index has no Dimensions
   * entry — so the citation is Synthstrom's published specifications rather than a page number.
   * That is still a `manual` cite under §3.1's actual test: a document anyone can go and re-read,
   * as against a reading only re-takeable on one unit. It is emphatically not `false`, which would
   * claim nobody checked.
   *
   * Third-party listings circulate 317 mm. The manufacturer's own figure is the one authored here.
   */
  physical: {
    panelSpanMm: 305,
    verified: {
      kind: 'manual',
      source: 'Synthstrom Deluge product specifications, synthstrom.com/product/deluge',
    },
  },
  /** §10. A simplified original drawing of the panel, read off the manual (see `panel.ts`). */
  panel: DELUGE_PANEL,

  /**
   * **`count` is a planning horizon, not a track count (§2.1).** It bounds how many assignables
   * the resolver may consider, and the resolver can never occupy more than the template has role
   * requests — templates ask for roughly five to fifteen, and the golden template asks for eleven.
   * 24 clears the top of that band with room to spare, so **for the templates this is built for**
   * it is behaviourally identical to unbounded: no guide a larger number could produce is one this
   * cannot. That equivalence is conditional, not absolute — a template asking for more than 24
   * parts would notice, and the number would have to move with it. It is finite because `expand()`
   * materialises every member and the §7.1 search ranges over all of them, so headroom nobody can
   * reach is pure cost.
   *
   * The hardware has no track limit to state, and the guidebook says so outright: "Deluge does
   * not enforce firm limits on how many tracks or voices may sound at once thus allowing the user
   * as many as they wish. The ultimate limitation will inevitably be based on Deluge's CPU
   * loading" (p.288), and "Can create unlimited clips" (p.301). That is a fact about the box, and
   * `count` is a fact about the search — which is exactly why they are not the same number.
   *
   * `polyphony` is notes within one role (§12.4), not roles. 8 is the firmware's own default:
   * "Updated default `Max Voices` for new synth's to `8 voices`" (`community_features.md`
   * @ `release_1_2_1`). A sound can be configured higher — old synths default to 16 — so this is
   * a conservative planning bound rather than a hardware maximum.
   */
  voices: [
    /**
     * §12.4: **no `sampled-chord` recipe here, because this voice does not need one.** The
     * substitution exists for a box that cannot sound three notes on one voice; this pool sounds
     * eight, and already carries a real `pad`/`soft` and `stab`/`hard`. §7.1 ranks
     * `polyphonic-voice` ahead of `sampled-chord` and ahead of character fidelity for any
     * multi-note part, so a chord-sample twin on this voice would lose every comparison it could
     * ever be in. The Deluge is the box a sampled chord loses *to*, which is the outcome §7.1 is
     * for — see `test/polyphony.test.ts`.
     */
    { kind: 'pool', id: 'track', label: 'Track', count: 24, roles: TRACK_ROLES, polyphony: 8 },
  ],

  /**
   * **Provisional, and openly a taste call — see #14.** There is no number to cite. The box does
   * not refuse a thirteenth part; it releases voices by priority as CPU load demands (p.99), and
   * the guidebook's own practical figures are generous — "up to 110" sample voices at once, "around
   * 64" for simple synth voices (p.288). What it also says is that every *loaded* sound costs
   * something even when silent: "This may begin to affect CPU performance if you have more than 50
   * to 100 sounds loaded" (p.288).
   *
   * So 12 is a judgement about where a Deluge stops being pleasant to work on rather than where it
   * stops working, and it is deliberately conservative. Crowding is a *cost* in the objective,
   * never a feasibility limit (§12.4) — if this number is wrong nothing breaks, some guides are
   * just ranked differently.
   */
  comfortableVoices: 12,

  /**
   * Per-step capabilities, in this device's own names. `velocity` and `probability` are the
   * guidebook's (velocity 0-127 p.299, probability 5-100% p.64); `iteration` is its
   * iteration-dependence, printed as "1 of 2" through "8 of 8" on **p.65**, which is why the
   * articulation carries the string and not a bare number; `automation` is community Automation
   * View, which records a parameter value per step (`automation_view.md`).
   *
   * Two LFOs, both syncable — but only on this firmware. Stock 4.1 is explicit that "LFO1 has an
   * additional SYNC parameter... LFO2 is retriggerable and exists for each voice separately"
   * (p.126); community `release_1_2_1` adds "LFO2 can be synchronized as well, using the labelled
   * LFO2 sync pad". So `syncable: true` is a claim about the community firmware, not about a
   * stock Deluge.
   */
  features: {
    perStep: ['velocity', 'probability', 'iteration', 'automation'],
    sidechain: { internal: true, fromExternalAudio: false },
    // Destinations are the mod matrix's own per-voice rows, p.122: "Pitch / Transpose: Overall",
    // "LPF / HPF Frequency / Resonance", "Oscillator Volume", "Pan", "Wavetable Position". A
    // subset — the matrix is larger — chosen as the ones a recipe would reach for.
    lfo: {
      count: 2,
      syncable: true,
      destinations: ['pitch', 'lpf-frequency', 'hpf-frequency', 'level', 'pan', 'wave-position'],
    },
  },

  /** Gestures off the panel. Jogs, not documentation (invariant 7). */
  hints: {
    // The clip type is the first thing a recipe asks for, so the gesture that makes one is a jog.
    // p.87: "Press [SHIFT] + [SYNTH] to create a synth clip"; p.112: "Press [SHIFT] + [KIT] to
    // create a kit clip". Both from clip view, which is where a reader already is.
    'clip-type': 'From clip view: [SHIFT] + [KIT] or [SYNTH]',
    'osc-type': 'Hold [SHIFT], press the OSC type pad',
    // #101. Loading the file *is* the gesture, and it sets the type on the way: p.95 step 3 is
    // "[SHIFT] + [BROWSE] for SAMPLE 1 ... Sample 1 will apply to Oscillator 1", then (SELECT)
    // accepts the whole note range and opens the browser, and (SELECT) again loads.
    'load-wavetable': '[SHIFT] + [BROWSE], then (SELECT) twice',
    // #173. Two envelope jogs, written for a reader who has not opened this menu before: one to
    // find the stages at all, one for the patch that is not on any pad — p.120's procedure is
    // drill into the destination, press (SELECT) again, and the modulation sources appear.
    'env-menu': 'Press (SELECT), ENV 1, then ATTACK / DECAY',
    'env2-pitch': 'In PITCH, press (SELECT) again, pick ENV 2',
    // p.87: "Press [AUDITION] + [SYNTH] to create a synth clip on the row selected".
    'kit-synth-row': '[AUDITION] + [SYNTH] makes a synth row',
    'arp-menu': 'Hold [SHIFT], press [ARP]',
    'note-velocity': 'Hold the note pad, turn (SELECT)',
    'note-probability': 'Hold pad, turn (SELECT) anticlockwise',
    'note-iteration': 'Hold pad, turn (SELECT) past 100%',
    'automation-view': 'In a clip, press [CLIP] to automate',
    'dx7-new': 'CUSTOM 1 + [SYNTH] makes a DX7 synth',
    'max-voices': 'VOICE menu, then MAX VOICES',
    'swing-amount': 'Hold [SHIFT], turn (TEMPO)',
    // Community views this rig has. Neither is used by a recipe; both change how a part is
    // played in, so they are reachable as jogs rather than buried in a comment.
    'performance-view': 'From song view, press [KEYBOARD]',
    'chord-keyboard': 'Turn (SELECT) + [KEYBOARD] to cycle layouts',
  },

  /**
   * Both halves of the source, in runtime metadata rather than only in a comment: the guidebook
   * edition the ranges came from, and the firmware the box is actually running. A guide rendered
   * from this device is wrong for a stock Deluge, and the manifest should say so out loud.
   */
  manual: {
    title: 'Deluge Official Guidebook',
    edition: 'OS 4.1 (OLED) + community firmware release_1_2_1 (Chopin)',
  },

  productPage: 'https://synthstrom.com/product/deluge/',


  recipes: RECIPES,
}
