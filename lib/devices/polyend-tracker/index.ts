import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type {
  AuthoredEnumParam,
  AuthoredNumericParam,
  AuthoredParam,
  AuthoredTextParam,
  Cite,
} from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { TRACKER_PANEL } from './panel'

/**
 * Polyend Tracker (§2.3). **Eight tracks, one voice each, and a sampler behind all of them** —
 * the box the Tracker Mini and the Play+ are both descended from, and the plainest shape of the
 * three.
 *
 * p.18: *"Tracker has 8 tracks, each of which can be configured with unique patterns made up of
 * one or more instrument combinations."* p.98 gives the voice: *"Each track in Tracker can handle
 * one voice which can play multiple notes, but not simultaneously... A triad would need 3 tracks
 * to play the chord."* So one pool of eight, `polyphony: 1`, and no second pool — unlike the
 * Mini's split into sample and synth tracks, every track here does the same thing, because there
 * is no synth engine on this box at all. Everything it sounds, it plays from a sample.
 *
 * That single fact shapes the whole manifest. There is no `MODEL` param anywhere below, no
 * engine to pick; there are eight play modes instead (p.121), and **the play mode is the switch
 * that governs the rest of the instrument page.** `Position` is a wavetable index under Wavetable
 * and a time in seconds under Granular; `Start` and `End` are free bounds under 1-Shot and
 * constrained against `Loop Start` / `Loop End` under the three loop modes. So every recipe that
 * carries one of those carries `PLAY MODE` beside it, which is CLAUDE.md's rule about a control
 * with more than one printed scale, applied to the one control on this box that has eight.
 *
 * Two more switch-carries-with-value pairings, both for the same reason:
 *
 *  - **`FILTER TYPE` travels with `CUTOFF`.** Both Cutoff and Resonance print `0% to 100%`
 *    (p.111) and that range does not move, but `Disabled` makes both inert and the three live
 *    types sweep in different directions. A cutoff with no type beside it is a number with no
 *    subject.
 *  - **`AUTOMATION DESTINATION` and `AUTOMATION TYPE` travel with every envelope value.** There
 *    is no dedicated amp envelope on this box: Attack, Decay, Sustain and Release exist on the
 *    Instrument Automation page and only apply to the destination selected, and only while Type
 *    reads `Envelope` (p.115: *"Available parameters will depend on the destination and the
 *    automation type selected"*). An ADSR authored without those two names an envelope the
 *    reader has no way to find.
 *
 * **Citation regime: legality is cited, authority never is.** Every *point* below is taste and
 * stays `verified: false`, enums included; every *range* and every *option set* is the manual's
 * own, cited to the page carrying it (§3.2). The manual cooperates — the instrument pages print
 * a Range column (ch.6) and the step FX chapter prints a "Value Ranges" block per effect (ch.7)
 * — and it never says which value suits a dark kick, so no point is ever cited.
 *
 * **Nothing in ch.6 prints a default.** A search of all 308 pages turns up exactly one:
 * *"For example Panning will reset to 0"* (p.112). The numbers visible in the manual's
 * screenshots are illustrative and contradict each other across pages — Attack reads `0.020s` on
 * p.109 and `1.000s` on p.119 — so none of them is treated here as a default, and no point
 * borrows one.
 *
 * ## Four limits on what is authored, recorded rather than fudged (invariant 5)
 *
 *  - **Volume is not authored.** p.110 prints its range as *"-inf dB to 24.00 dB"*. `-inf` is not
 *    a finite number, `NumericRange` rightly refuses it, and inventing a floor to make it fit is
 *    the invented claim §3.1 exists to prevent. The same trap as the Tracker Mini's, on the same
 *    parameter.
 *  - **`Reverb send` and `Delay send` are authored from the prose and the contradiction is
 *    recorded.** p.114 prints `Range 0-100%` for both while the screen beside it renders `-inf
 *    dB`. Two further pages take the percent side — the step FX sends print `0-100%` (pp.174,
 *    175) and p.105's FX table restates *"Amount of send effect 0-100%"* — so the percent range
 *    is what is cited, and the dB rendering is a manual inconsistency rather than a second scale
 *    in force. Anyone who finds the box disagreeing should trust the box and change this.
 *  - **`Position`, `Start`, `End`, `Window` are `unscaled`.** Their Range cells read literally
 *    *"Variable"* (pp.123, 131, 136), because the scale is the loaded sample's own length. Any
 *    `NumericRange` here would be invented, and an absolute time would point at a different place
 *    in every file a reader opens. `Window` additionally *"has a maximum value based on the
 *    original file"* (p.130), so even its ceiling is a property of the audio.
 *  - **LFO `Amount` has no printed range**, the way the Mini's does not: p.120's *"The amount
 *    will set how much of the envelope is applied 0-100%"* is the **envelope's** Amount, in the
 *    envelope's own subsection, and the same field means something else with Type set to LFO.
 *    Borrowing that bound would be the TR-8S `SNAPPY` mistake.
 *
 * ## One trap this manual sets that the Mini's does not
 *
 * **The five LFO rate tables are not one table.** ch.7 prints a rate list under each LFO step FX,
 * and the Volume LFO's (`g`, p.165) is a *different scale* from the other four (`h`/`j`/`k`/`l`,
 * pp.166-169): at value 128 the `g` table prints **2** where the others print **3/4**, and `g`
 * stops at `/12` where the others run on to `/64`. A rate copied between LFO types lands on a
 * different division. Nothing below authors a step-FX LFO rate, which is how this manifest avoids
 * the pairing rather than solving it; the instrument-page `LFO SPEED` list (p.117) is a sixth,
 * separate list and is the only one used here.
 *
 * The same page carries the exception a flat list cannot: *"128 to 32 Step Speed options are not
 * available with Volume as the destination."* The one recipe below that sets an LFO speed
 * modulates Granular Position, where the whole list is legal — which is why the options stay
 * complete rather than being trimmed to one destination's subset.
 *
 * ## Manual contradictions, recorded rather than smoothed over
 *
 *  - **p.50's config summary says "Sets the Tracker **Mini** clock output"** — the wrong device,
 *    copied from the sibling manual — and gives Clock Sync Correction as `-6 to +6` where p.251,
 *    the chapter that owns the setting, says `-50 to +50`. p.251 is what is cited below.
 *  - **p.194's sampling diagram says "Max 45 sec audio sample"** where pp.193, 195 and 196 all say
 *    approximately 133 seconds. Nothing here depends on either figure.
 *  - **p.13's rear-panel callout says the Line In is "TR Mono"** while p.187 says the jack
 *    *"allows Stereo (TRS) and Mono (TS) audio inputs"* and converts stereo to mono on record.
 *    `io.audioIn` is true either way, and p.187 is the page cited because it is the one describing
 *    the input rather than dimensioning the case.
 */

/**
 * Ranges exactly as the manual's own Range column and "Value Ranges" blocks print them. These
 * are the cited claim; the point inside is taste.
 */
const PCT = { min: 0, max: 100 } //                 0-100%
const PAN = { min: -50, max: 50 } //                -50L (fully left) to +50R (fully right)
const SEMITONES_24 = { min: -24, max: 24 } //       -24 Semitones to +24 Semitones
const CENTS_100 = { min: -100, max: 100 } //        -100 Cents to +100 Cents
const BITS = { min: 4, max: 16 } //                 4-16
const SECONDS_10 = { min: 0, max: 10 } //           0-10 Seconds
const GRAIN_MS = { min: 1, max: 1000 } //           1-1000ms
const SLICES = { min: 1, max: 48 } //               1 - 48
const SWING_PCT = { min: 25, max: 75 } //           25 - 75%
const MICRO_CENTS = { min: -99, max: 99 } //        -99 to +99 Cents

/** A range citation. The page is the one carrying that parameter's own printed bound. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Polyend Tracker Manual 1.9.2a, p.${page}` }
}

/**
 * §2.1. **The citation the `track` pool's trigger note rests on, and why it names four pages.**
 *
 * This manual never prints the Tracker Mini's one-line version of the fact — *"plays a sample at
 * its original pitch"* appears nowhere in its 308 pages — so the note-name claim is assembled
 * from the three pages that each hold a piece of it:
 *
 *  - **p.74** says what the field is: *"Note. This sets the pitch of the step and is important
 *    for creating melodies or beats based on sample mapped drum hits."* So a drum hit on this box
 *    is addressed by a note, and there is a note it wants.
 *  - **p.86** names it. Step 11 of the percussion fill walkthrough reads *"Set to C5, the root
 *    note for the sample"*, and the pattern printed below it comes out `C5` on all eight steps of
 *    the percussion track.
 *  - **p.122** says what happens if you write anything else: *"Note value affects pitch... A
 *    higher note value will play the sample faster. A lower note value will play the sample
 *    slower."* That is what makes `C5` addressing rather than taste — every other note is the
 *    same sample transposed.
 *
 * The **MIDI** number is a separate claim and needs its own pages, which is `CLAUDE.md`'s hazard
 * about a cited range being the wrong range, wearing note names instead of knob values. `C5` is a
 * number only once you know this box's octave numbering, and the box has a setting for it:
 * `Config > MIDI > Middle C`, *"Sets Tracker's middle C as C-3, C-4, C-5, C-6"* (p.251). **p.253**
 * shows the ordinary configuration with `Middle C  C-5`, and **p.254** confirms it from the other
 * side — an Ableton Live example whose caption is *"Tracker Middle C adjusted from C-5 to C-3 to
 * match Ableton Live"*, Live being a host that calls middle C `C3`. So out of the box the `C5` on
 * p.86 **is** middle C: MIDI 60. Scientific pitch notation would have said 72, and `DESIGN.md
 * §4.1` is the standing note that SPN is a convention rather than a fact about instruments.
 *
 * ## Two other notes in this manual that are not this one
 *
 *  - **p.77's `C0` is a keyboard shortcut, not a pitch claim.** *"Hold & release [Note] will set
 *    an empty step to default note i.e. C0"* describes what the button does to a blank step. It
 *    is the value you get for not choosing one, where `C5` is the value that plays the sample as
 *    it was recorded, and anyone grepping this manual for "default note" lands on `C0` first.
 *  - **"Root note" means something else three pages over.** `Config > Project Settings > Pads
 *    Root Note` sets *"the root note between C2 - C4 of the bottom left pad in the 4 x 12 grid"*,
 *    default `C3` (pp.49, 96). That is the pad grid's origin, a property of the controller
 *    layout; p.86's *"root note for the sample"* is a property of the audio. Same two words, and
 *    borrowing `C3` from the nearer one would be the TR-8S `SNAPPY` mistake in note names.
 *
 * ## Beat Slice, and why this manual leaves it open where the Mini's closes it
 *
 * §4.1's third category — a note that *addresses a piece of audio* rather than sounding a pitch —
 * is not modelled anywhere, and the Tracker's reason for leaving it alone is weaker than the
 * Mini's, which is exactly why it is written down.
 *
 * The Mini's manual settles it in a sentence: *"The first slice of a beat slice sample will be
 * triggered using note C2"* (Mini p.90). **This manual says no such thing.** What it establishes
 * is narrower: under Beat Slice the slice is selected by a step FX, p.164's `S`, which *"plays a
 * selected slice on the triggered step"*, and every example step there carries a note (`F5`) in
 * the Note column *beside* the `S` value. **What that accompanying note means is unstated.** The
 * nearest page, p.126, describes the pads rather than the sequencer — under Slice they *"play
 * the selected slice melodically in the current pitch scale"*, under Beat Slice they *"select and
 * play each slice individually"* — and neither sentence says what a written step note does.
 *
 * So no slice address is authored, on either recipe: the manual does not supply one, and
 * inventing the mapping is invariant 5's line. That leaves `tr-vox-chop-dirty` with the pool's
 * `C5` and nothing of its own, and what keeps that from reaching a reader is a separate fact
 * rather than an argument about the note — the one direction that reaches the recipe hooks the
 * role, and #100 gives a hooked part's notes to its hook, so no shipped guide prints a note
 * there. The test beside this holds that shut. If it ever fails, a direction has begun asking for
 * the beat-sliced patch unhooked, and the answer is to settle what a step note does under Beat
 * Slice — from the box, since p.164 does not say — rather than to widen the test.
 */
const TRIGGER_NOTE_CITE: Cite = {
  kind: 'manual',
  source:
    'Polyend Tracker Manual 1.9.2a, p.74 (Note sets the step pitch, for sample-mapped drum hits); ' +
    'p.86 (C5, the root note for the sample); p.122 (note value affects sample pitch); ' +
    'p.253, p.254 (Middle C setting, shown as C-5, so that C5 is MIDI 60)',
}

function num(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
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
 * A time in seconds. Identical to `num` but for the step, which the box works in thousandths:
 * p.120 prints the envelope range as `0-10 Seconds` and notes *"0-1 Sec has a better resolution
 * of control"*, and every screen renders three decimals (`0.020s`, `1.000s`). The default step of
 * 1 would round every mood offset here to a whole second.
 */
function secs(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return num(name, value, bounds, page, { unit: 'Sec', step: 0.001, ...extra })
}

/**
 * An enum, with its two claims kept apart exactly as `num` keeps a range and a point apart
 * (§3.2). The option *set* is legality and is cited: "Beat Slice" either appears in the Play Mode
 * list on p.121 or it does not. The *value* is which one this recipe reaches for, and that is
 * taste, so it stays provisional.
 */
function pick(
  name: string,
  value: string,
  options: string[],
  page: number,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: cite(page) },
    verified: false,
    ...extra,
  }
}

/**
 * §3.2. A setting the manual gives **no scale for**, so there is no legality gate for a citation
 * to attach to and the point is provisional by construction. On this box that is the sample
 * playback positions — `Start`, `End`, `Position`, `Window` — whose Range cells read `Variable`
 * because the scale is the loaded file's own length (pp.123, 131, 136).
 */
function unscaled(
  name: string,
  value: string,
  extra: Partial<AuthoredTextParam> = {},
): AuthoredTextParam {
  return { kind: 'text', name, value, verified: false, ...extra }
}

/**
 * §6.1. The swing axis, as an ordinary cited numeric (#62).
 *
 * p.151, the Swing step FX (`I`): *"Range is 25 - 75%"*, and *"50% is no swing"*. Everything the
 * axis needs is printed there — the bounds **and** the neutral point. The point stays
 * `verified: false`: the page prints where the neutral *is*, not that this recipe should sit
 * there, and §3.2 splits those two claims exactly this way.
 *
 * **Pattern-wide, though it is entered on a step.** The same page: *"Applies a swing from any
 * step track for the entire pattern"*, and *"Also applied to MIDI Out"*. So the `note` says so,
 * because the value appears under every part this box carries and a reader should not set it
 * eight times.
 *
 * `amount` is 25, the distance from 50 to each printed bound, so the whole sweep of the axis
 * moves the value and no part of the travel is spent against a clamp.
 */
function swing(): AuthoredNumericParam {
  return num('SWING', 50, SWING_PCT, 151, {
    unit: '%',
    mood: [{ axis: 'swing', amount: 25 }],
    hint: 'pick-fx',
    note: '50% is no swing; set once, it applies across the whole pattern and to MIDI Out',
    scope: 'pattern',
  })
}

/** p.121, the Play Mode list, as the on-screen selector prints them. */
const PLAY_MODES = [
  '1-Shot',
  'Forward loop',
  'Backward loop',
  'Pingpong loop',
  'Slice',
  'Beat Slice',
  'Wavetable',
  'Granular',
]

/** p.111: "Options; Disabled, Low-pass, High-pass, Band-pass." */
const FILTER_TYPES = ['Disabled', 'Low-pass', 'High-pass', 'Band-pass']

/**
 * p.115, the Instrument Automation page, read off the on-screen selectors.
 *
 *  - `Destination` is the six the screen lists. Every envelope and LFO on this box is *per
 *    destination*; there is no global amp envelope, which is why `DESTINATION` appears beside
 *    every ADSR value below.
 *  - `Type` is `Off / Envelope / LFO`, and it decides which of the remaining columns exist at all.
 *  - `Shape` is the LFO's five.
 */
const AUTOMATION_DESTINATIONS = [
  'Volume',
  'Panning',
  'Cutoff',
  'Wavetable Position',
  'Granular Position',
  'Finetune',
]
const AUTOMATION_TYPES = ['Off', 'Envelope', 'LFO']
const LFO_SHAPES = ['Rev Saw', 'Saw', 'Triangle', 'Square', 'Random']

/**
 * p.117, the `Speed In Steps` table, read across its columns. Twenty-nine intervals, bare as the
 * table prints them; the screen appends `steps` or `step`, which the parameter's `note` says
 * rather than this list inventing a spelling for the entries a scrolled window never shows.
 *
 * `65` is the manual's, not a transcription slip for 64 — and note that the five step-FX LFO rate
 * tables in ch.7 print `64` in that position and are different lists again. See the header.
 *
 * The footnote carves out an exception no flat list can carry: *"128 to 32 Step Speed options are
 * not available with Volume as the destination."* The one use here modulates Granular Position,
 * where the whole list is legal, so the options stay complete.
 */
const LFO_SPEEDS = [
  '128', '96', '65', '48', '32',
  '24', '16', '12', '8', '6',
  '4', '3', '2', '3/2', '1',
  '3/4', '1/2', '3/8', '1/3', '1/4',
  '3/16', '1/6', '1/8', '1/12', '1/16',
  '1/24', '1/32', '1/48', '1/64',
]

/** p.136, the Granular parameter table's own Range column. */
const GRAIN_SHAPES = ['Square', 'Triangle', 'Gauss']
const GRAIN_LOOPS = ['Forward', 'Reverse', 'Pingpong']

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * Every role, because a sampler with 48 instrument slots (p.28, p.44) pointed at any recording
 * can be any part there is. The eight tracks are identical in capability — p.18 gives them no
 * split of any kind — so there is one pool and it takes the whole list.
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
// Shared parameter shapes
// ---------------------------------------------------------------------------


/**
 * The amplitude envelope, which on this box is six settings and not four.
 *
 * There is no dedicated amp envelope: Attack, Decay, Sustain and Release live on the Instrument
 * Automation page and shape **whichever destination is selected**, and only while Type reads
 * `Envelope` (p.115: *"Available parameters will depend on the destination and the automation
 * type selected"*). So the destination and the type travel with every envelope below, for the
 * same reason `FILTER TYPE` travels with `CUTOFF` — an ADSR without them is a scale with no
 * switch, and a reader has no page to enter it on.
 *
 * `density` rides on Decay and Release: a denser arrangement wants shorter sounds, which is the
 * convention the rest of the library already follows on envelope times.
 */
function ampEnv(
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  mood: { decay?: number; release?: number; sustain?: number } = {},
): AuthoredParam[] {
  return [
    pick('AUTOMATION DESTINATION', 'Volume', AUTOMATION_DESTINATIONS, 115, {
      hint: 'inst-automation',
      note: 'the envelope shapes this destination only — there is no global amp envelope',
    }),
    pick('AUTOMATION TYPE', 'Envelope', AUTOMATION_TYPES, 115),
    secs('ATTACK', attack, SECONDS_10, 120),
    secs(
      'DECAY',
      decay,
      SECONDS_10,
      120,
      mood.decay === undefined ? {} : { mood: [{ axis: 'density', amount: mood.decay }] },
    ),
    num('SUSTAIN', sustain, PCT, 120, {
      unit: '%',
      ...(mood.sustain === undefined ? {} : { mood: [{ axis: 'density', amount: mood.sustain }] }),
    }),
    secs(
      'RELEASE',
      release,
      SECONDS_10,
      120,
      mood.release === undefined ? {} : { mood: [{ axis: 'density', amount: mood.release }] },
    ),
  ]
}

/**
 * The filter, as the pair p.111 makes it. `Disabled` leaves both controls inert and the three
 * live types sweep in different directions, so the type is never left off a cutoff.
 */
function filter(
  type: string,
  cutoff: number,
  resonance: number,
  darkness: number,
): AuthoredParam[] {
  return [
    pick('FILTER TYPE', type, FILTER_TYPES, 111, { hint: 'inst-params' }),
    num('CUTOFF', cutoff, PCT, 111, {
      unit: '%',
      mood: [{ axis: 'darkness', amount: darkness }],
    }),
    num('RESONANCE', resonance, PCT, 111, {
      unit: '%',
      note: 'band-pass has no adjustable width — Q is fixed on this box',
    }),
  ]
}

/** p.114's instrument effects. See the header on the printed-range contradiction on the sends. */
function drive(overdrive: number, bits: number): AuthoredParam[] {
  return [
    num('OVERDRIVE', overdrive, PCT, 114, {
      unit: '%',
      mood: [{ axis: 'grit', amount: 18 }],
    }),
    num('BIT DEPTH', bits, BITS, 114, {
      mood: [{ axis: 'grit', amount: -4 }],
      note: '16 is the sample untouched; lower crushes it',
    }),
  ]
}

function reverbSend(value: number, space = 22): AuthoredNumericParam {
  return num('REVERB SEND', value, PCT, 114, {
    unit: '%',
    mood: [{ axis: 'space', amount: space }],
    note: 'p.114 prints 0-100% while the screen beside it renders dB — the percent scale is cited',
  })
}

function delaySend(value: number, space = 16): AuthoredNumericParam {
  return num('DELAY SEND', value, PCT, 114, {
    unit: '%',
    mood: [{ axis: 'space', amount: space }],
    note: 'p.114 prints 0-100% while the screen beside it renders dB — the percent scale is cited',
  })
}

/** The 1-Shot bounds, whose scale is the loaded file (p.123). */
function oneShot(start: string, end: string): AuthoredParam[] {
  return [
    pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
    unscaled('START', start),
    unscaled('END', end),
  ]
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

/**
 * Nineteen recipes across sixteen roles. Every one of them loads audio, because that is the only
 * thing this box does — there is no engine to pick, so `sourceAudio` carries what to put in the
 * slot and `params` carries what to do to it once it is there.
 *
 * The five roles the pool declares and nothing here authors — `bass-mid`, `metallic`, `stab`,
 * `arp` and `acid` — are legal and unauthored, which resolves as an honest gap rather than a
 * guess (invariant 5). A sampler can be any of them; nobody has written the sheet.
 */
const RECIPES: Recipe[] = [
  // ---- Drums ---------------------------------------------------------------
  {
    id: 'tr-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Short electronic kick, driven and flat-topped',
    sourceAudio: {
      need: 'A dry electronic kick with a fast pitch drop and no room tail',
      hint: 'load-sample',
    },
    params: [
      ...oneShot('At the transient, no lead-in', 'Just past the body, before any tail'),
      ...filter('Low-pass', 88, 6, -14),
      num('TUNE', -2, SEMITONES_24, 110, { unit: 'st' }),
      ...drive(24, 16),
      ...ampEnv(0, 0.26, 0, 0.09, { decay: -0.06 }),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' },
      { slot: 'downbeat', set: { 'micro-tune': -14 } },
    ],
    verified: false,
  },
  {
    id: 'tr-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'Sine sub an octave down, filter closed over it',
    sourceAudio: {
      need: 'A clean sine or triangle bass note, one sustained pitch, no transient',
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', 'Forward loop', PLAY_MODES, 121, {
        hint: 'play-mode',
        note: 'Start / End and Loop Start / End cannot cross over',
      }),
      unscaled('LOOP START', 'Inside the steady part of the note'),
      unscaled('LOOP END', 'One cycle later, at the same zero crossing'),
      ...filter('Low-pass', 34, 4, -16),
      num('TUNE', -12, SEMITONES_24, 110, { unit: 'st' }),
      num('FINETUNE', 0, CENTS_100, 110, { unit: 'c' }),
      ...ampEnv(0.004, 0.4, 100, 0.14, { release: -0.06 }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { 'gate-length': 88 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'Cracking snare, top end left open',
    sourceAudio: { need: 'A snare with a hard crack and a short noise tail', hint: 'load-sample' },
    params: [
      ...oneShot('At the crack', 'Where the tail drops into the noise floor'),
      ...filter('High-pass', 18, 12, -10),
      ...drive(18, 16),
      ...ampEnv(0, 0.19, 0, 0.07, { decay: -0.05 }),
      reverbSend(14),
      swing(),
    ],
    articulation: [
      { slot: 'backbeat', set: { volume: 100 }, hint: 'pick-fx' },
      { slot: 'fill', set: { roll: 3 } },
    ],
    verified: false,
  },
  {
    id: 'tr-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'Wide clap, high-passed and sent to the plate',
    sourceAudio: { need: 'A layered clap with several fast slaps before the body', hint: 'load-sample' },
    params: [
      ...oneShot('Just before the first slap', 'End of the body, tail trimmed'),
      ...filter('High-pass', 26, 8, -12),
      num('PANNING', 6, PAN, 110),
      ...ampEnv(0, 0.24, 0, 0.11),
      reverbSend(28, 26),
      swing(),
    ],
    articulation: [{ slot: 'backbeat', set: { 'reverb-send': 44 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track',
    title: 'Dry rimshot, off to one side',
    sourceAudio: { need: 'A single dry rimshot or cross-stick, no room', hint: 'load-sample' },
    params: [
      ...oneShot('At the stick', 'Immediately after the click'),
      ...filter('Band-pass', 62, 22, -18),
      num('PANNING', -18, PAN, 110),
      num('TUNE', 2, SEMITONES_24, 110, { unit: 'st' }),
      ...ampEnv(0, 0.08, 0, 0.04),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { volume: 72 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track',
    title: 'Tight closed hat, chance thinning the offbeats',
    sourceAudio: { need: 'A short closed hi-hat, cut before any decay', hint: 'load-sample' },
    params: [
      ...oneShot('At the transient', 'Before the ring begins'),
      ...filter('High-pass', 34, 6, -14),
      num('PANNING', 12, PAN, 110),
      ...ampEnv(0, 0.055, 0, 0.03, { decay: -0.02 }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { chance: 82 }, hint: 'pick-fx' },
      { slot: 'ghost', set: { volume: 38 } },
    ],
    verified: false,
  },
  {
    id: 'tr-open-hat-dirty',
    role: 'open-hat',
    character: 'dirty',
    voice: 'track',
    title: 'Open hat crushed to eight bits',
    sourceAudio: { need: 'An open hi-hat with a long metallic ring', hint: 'load-sample' },
    params: [
      ...oneShot('At the transient', 'Let the ring run to silence'),
      ...filter('High-pass', 30, 14, -12),
      ...drive(38, 8),
      ...ampEnv(0, 0.42, 0, 0.16, { decay: -0.12 }),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { 'bit-depth': 6 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'track',
    title: 'Ride ping, wide and quiet under the kit',
    sourceAudio: { need: 'A ride cymbal ping with the bell audible and a long wash', hint: 'load-sample' },
    params: [
      ...oneShot('At the stick', 'Well into the wash'),
      ...filter('High-pass', 22, 4, -16),
      num('PANNING', -22, PAN, 110),
      ...ampEnv(0, 1.4, 0, 0.5, { decay: -0.4 }),
      reverbSend(18),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { volume: 64 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Quiet shaker ghosts, half of them dropped',
    sourceAudio: { need: 'A soft shaker or brush hit, no attack spike', hint: 'load-sample' },
    params: [
      ...oneShot('Just inside the attack', 'Before the decay ends'),
      ...filter('Band-pass', 58, 10, -20),
      num('PANNING', 24, PAN, 110),
      ...ampEnv(0.006, 0.07, 0, 0.04),
      swing(),
    ],
    articulation: [
      { slot: 'ghost', set: { volume: 26, chance: 58, 'random-volume': 18 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tr-ghost-perc-dark',
    role: 'ghost-perc',
    character: 'dark',
    voice: 'track',
    /**
     * The `soft` ghost is a shaker through a band-pass at `CUTOFF 58` — the airy end of p.111's
     * three live types. This is a low drum through a low-pass at 26, which fills the same holes in
     * the pattern with body instead of air.
     *
     * The amp envelope is longer at every stage than the shaker's, and that is the sound rather
     * than a preference: a low hit with a shaker's 70 ms decay is a click with no pitch in it. The
     * `BIT DEPTH 12` is the one place this recipe reaches for p.114 — just enough to keep the tail
     * from sounding clean, which is where a quiet low hit otherwise starts sounding like a mistake.
     */
    title: 'Low drum ghosts under the pattern, lowpassed and slightly crushed',
    sourceAudio: { need: 'A low tom, floor kick or dull conga, no attack spike', hint: 'load-sample' },
    params: [
      ...oneShot('Just inside the attack', 'After the body, before the tail ends'),
      ...filter('Low-pass', 26, 14, -20),
      num('PANNING', -18, PAN, 110),
      ...drive(8, 12),
      ...ampEnv(0.004, 0.22, 0, 0.12),
      swing(),
    ],
    articulation: [
      { slot: 'ghost', set: { volume: 30, chance: 58, 'random-volume': 18 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tr-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    title: 'Low tom tuned down, glide on the fills',
    sourceAudio: { need: 'A single low tom with an audible pitch fall', hint: 'load-sample' },
    params: [
      ...oneShot('At the head', 'Where the pitch settles out'),
      ...filter('Low-pass', 46, 16, -18),
      num('TUNE', -5, SEMITONES_24, 110, { unit: 'st' }),
      ...ampEnv(0, 0.55, 0, 0.2, { decay: -0.18 }),
      swing(),
    ],
    articulation: [{ slot: 'fill', set: { glide: 32 }, hint: 'pick-fx' }],
    verified: false,
  },

  // ---- Sliced audio: the thing this box is for ------------------------------
  {
    id: 'tr-vox-chop-bright',
    role: 'vox-chop',
    character: 'bright',
    voice: 'track',
    title: 'Sixteen even slices of a vocal phrase',
    sourceAudio: {
      need: 'One bar of a sung or spoken phrase, already in time with the project tempo',
      hint: 'slice-sample',
    },
    params: [
      pick('PLAY MODE', 'Slice', PLAY_MODES, 121, { hint: 'play-mode' }),
      num('NUMBER OF SLICES', 16, SLICES, 127, {
        hint: 'slice-sample',
        note: 'set the count, then Slice Evenly — up to 48 are possible',
      }),
      ...filter('High-pass', 16, 8, -14),
      num('FINETUNE', 0, CENTS_100, 110, { unit: 'c' }),
      ...ampEnv(0, 0.3, 100, 0.06, { release: -0.03 }),
      delaySend(20),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { slice: 1 }, hint: 'pick-fx' },
      { slot: 'accent', set: { slice: 9 } },
      { slot: 'offbeat', set: { slice: 14, 'gate-length': 40 } },
    ],
    verified: false,
  },
  {
    id: 'tr-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'track',
    title: 'Transient-sliced phrase, crushed and driven',
    sourceAudio: {
      need: 'A busy vocal or breakbeat phrase with clear transients to slice on',
      hint: 'slice-sample',
    },
    params: [
      pick('PLAY MODE', 'Beat Slice', PLAY_MODES, 121, { hint: 'play-mode' }),
      num('NUMBER OF SLICES', 24, SLICES, 127, { hint: 'slice-sample' }),
      ...filter('Band-pass', 54, 30, -16),
      ...drive(46, 9),
      ...ampEnv(0, 0.22, 100, 0.05),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { slice: 1 }, hint: 'pick-fx' },
      { slot: 'offbeat', set: { slice: 7, 'reverse-sample': '<<<' } },
      { slot: 'accent', set: { roll: 4, overdrive: 70 } },
    ],
    verified: false,
  },

  // ---- Granular and wavetable ---------------------------------------------
  {
    id: 'tr-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'Long Gaussian grains drifting through a held note',
    sourceAudio: {
      need: 'Several seconds of a sustained, unchanging sound — a bowed note, a held pad, room tone',
      hint: 'scan-grain',
    },
    params: [
      pick('PLAY MODE', 'Granular', PLAY_MODES, 121, { hint: 'play-mode' }),
      unscaled('POSITION', 'Somewhere in the steady middle of the file', { hint: 'scan-grain' }),
      num('LENGTH', 640, GRAIN_MS, 136, { unit: 'ms' }),
      pick('SHAPE', 'Gauss', GRAIN_SHAPES, 136),
      pick('LOOP', 'Forward', GRAIN_LOOPS, 136),
      pick('AUTOMATION DESTINATION', 'Granular Position', AUTOMATION_DESTINATIONS, 115, {
        hint: 'inst-automation',
      }),
      pick('AUTOMATION TYPE', 'LFO', AUTOMATION_TYPES, 115),
      pick('SHAPE (LFO)', 'Triangle', LFO_SHAPES, 115),
      pick('SPEED', '8', LFO_SPEEDS, 117, {
        note: 'in pattern steps; the whole list is legal here, unlike on a volume destination',
      }),
      unscaled('AMOUNT', 'Enough drift to hear, not enough to leave the note'),
      ...filter('Low-pass', 56, 6, -20),
      reverbSend(42, 30),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { 'gate-length': 100 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track',
    title: 'Tiny reversed grains, overdriven into a hiss',
    sourceAudio: {
      need: 'Any noisy source — tape hiss, radio static off the built-in tuner, a cymbal wash',
      hint: 'record-audio',
    },
    params: [
      pick('PLAY MODE', 'Granular', PLAY_MODES, 121, { hint: 'play-mode' }),
      unscaled('POSITION', 'Anywhere; the source has no structure to find', { hint: 'scan-grain' }),
      num('LENGTH', 22, GRAIN_MS, 136, { unit: 'ms' }),
      pick('SHAPE', 'Square', GRAIN_SHAPES, 136),
      pick('LOOP', 'Reverse', GRAIN_LOOPS, 136),
      ...filter('Band-pass', 68, 34, -22),
      ...drive(58, 7),
      ...ampEnv(0.02, 0.3, 100, 0.12),
      swing(),
    ],
    articulation: [{ slot: 'offbeat', set: { volume: 34, chance: 64 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    title: 'Wavetable lead, window scanned open',
    sourceAudio: {
      need: 'A wavetable file — the SD card ships a Wavetables_2048 folder, or any 2048-sample-frame WAV',
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', 'Wavetable', PLAY_MODES, 121, { hint: 'play-mode' }),
      unscaled('WINDOW', '2048 — divisions of 2 down from the file maximum', {
        note: 'the ceiling is a property of the source file, not of the box',
      }),
      unscaled('POSITION', 'Two thirds through the table, where the harmonics thicken'),
      ...filter('Low-pass', 82, 26, -24),
      num('TUNE', 12, SEMITONES_24, 110, { unit: 'st' }),
      num('FINETUNE', 6, CENTS_100, 110, { unit: 'c' }),
      ...ampEnv(0.01, 0.5, 72, 0.35, { release: -0.12 }),
      delaySend(26),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' },
      { slot: 'downbeat', set: { glide: 18 } },
    ],
    verified: false,
  },

  // ---- Chords, which cost a render on this box ------------------------------
  {
    id: 'tr-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'A rendered triad, played back as one long note',
    realisation: 'sampled-chord',
    sourceAudio: {
      need: 'A single sample of the whole chord, sustaining, so one track can hold it',
      prep: {
        text: 'Play the triad across three tracks, then Render: it "bounces or exports an audio file based on the selected pattern / tracks which can then be made immediately available as a sample"',
        verified: { kind: 'manual', source: 'Polyend Tracker Manual 1.9.2a, p.187' },
      },
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', 'Forward loop', PLAY_MODES, 121, { hint: 'play-mode' }),
      unscaled('LOOP START', 'After the attack, in the steady part'),
      unscaled('LOOP END', 'Before the release begins'),
      ...filter('Low-pass', 48, 8, -20),
      ...ampEnv(1.6, 1.0, 88, 2.4, { release: -0.9 }),
      reverbSend(48, 32),
      delaySend(18),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { 'gate-length': 100 }, hint: 'pick-fx' }],
    verified: false,
  },

  // ---- Transitional --------------------------------------------------------
  {
    id: 'tr-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track',
    title: 'Noise riser opening upward across the bar',
    sourceAudio: { need: 'A long noise sweep or a bowed cymbal, several bars of rising energy', hint: 'load-sample' },
    params: [
      ...oneShot('At the quiet start', 'At the peak, before any drop'),
      ...filter('High-pass', 12, 30, -10),
      ...ampEnv(1.2, 0.4, 96, 0.3),
      reverbSend(36, 28),
      swing(),
    ],
    articulation: [
      { slot: 'first-hit', set: { 'high-pass': 10 }, hint: 'pick-fx' },
      { slot: 'last-hit', set: { 'high-pass': 74, volume: 100 } },
    ],
    verified: false,
  },
  {
    id: 'tr-riser-dark',
    role: 'riser',
    character: 'dark',
    voice: 'track',
    /**
     * **The darkness here is static, and that is the box rather than a choice.**
     *
     * The obvious dark riser closes a low-pass across the bar while the level climbs. This box
     * will not do it, twice over. Its per-step FX lanes include `high-pass` and no low-pass at
     * all (p.129's list), so the closing cannot be drawn per step the way the bright riser draws
     * its opening. And the Instrument Automation page has **one** envelope shaping **one**
     * destination (p.115) — point it at `Cutoff` and the amp envelope is gone, because there is
     * no global one underneath it.
     *
     * So the two halves cannot both move: either the filter closes or the level swells. The level
     * is the half that carries a riser, so the filter is set once at `CUTOFF 30` and stays there,
     * and the climb is `volume` on the step lane from 34 to 100. What arrives is pressure with no
     * top on it, which is the distinction from `bright` — that one opens a high-pass upward and
     * is heard as the bottom falling away.
     *
     * Recorded rather than worked around: a reader who wants the filter to move as well has to
     * automate it by hand, and the guide should not imply otherwise.
     */
    title: 'Low rumble swelling across the bar with the filter held shut',
    sourceAudio: {
      need: 'A long low rumble, sub sweep or bowed low string, several bars of rising energy',
      hint: 'load-sample',
    },
    params: [
      ...oneShot('At the quiet start', 'At the peak, before any drop'),
      ...filter('Low-pass', 30, 22, -26),
      ...ampEnv(1.6, 0.5, 98, 0.4),
      reverbSend(24, 28),
      swing(),
    ],
    articulation: [
      { slot: 'first-hit', set: { volume: 34 }, hint: 'pick-fx' },
      { slot: 'last-hit', set: { volume: 100 } },
    ],
    verified: false,
  },
  {
    id: 'tr-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'track',
    title: 'Reversed grains washing in before the change',
    sourceAudio: { need: 'A cymbal wash or any sound with a long, smooth decay', hint: 'scan-grain' },
    params: [
      pick('PLAY MODE', 'Granular', PLAY_MODES, 121, { hint: 'play-mode' }),
      unscaled('POSITION', 'Late in the file, in the decay'),
      num('LENGTH', 380, GRAIN_MS, 136, { unit: 'ms' }),
      pick('SHAPE', 'Triangle', GRAIN_SHAPES, 136),
      pick('LOOP', 'Reverse', GRAIN_LOOPS, 136),
      ...filter('Low-pass', 60, 4, -22),
      ...ampEnv(0.9, 0.6, 90, 1.1, { release: -0.4 }),
      reverbSend(54, 34),
      swing(),
    ],
    articulation: [{ slot: 'last-hit', set: { volume: 88, 'reverb-send': 72 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track',
    title: 'One-shot hit on the downbeat, tail in the plate',
    sourceAudio: { need: 'A single loud impact — a slammed door, a big drum, a crash', hint: 'record-audio' },
    params: [
      ...oneShot('At the hit', 'Well into the decay'),
      ...filter('Low-pass', 74, 10, -22),
      num('TUNE', -3, SEMITONES_24, 110, { unit: 'st' }),
      ...drive(30, 14),
      ...ampEnv(0, 1.1, 0, 0.6, { decay: -0.3 }),
      reverbSend(56, 30),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { volume: 100, 'reverb-send': 80 }, hint: 'pick-fx' }],
    verified: false,
  },

  // ---- The five #345 roles, and what each of them turns on -------------------
  {
    id: 'tr-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'A rendered chord struck short, one track holding all of it',
    realisation: 'sampled-chord',
    /**
     * **One recipe answers all three requests, which the geometry rather than the sound decided.**
     * Three directions ask for `stab` and want `hard`, `dark` and `clean` — and §3.4 puts each of
     * those three at sqrt(2) from the other two, so any one of them reaches all three inside
     * §3.5's radius. `hard` is the exact match for the one that asks at the highest priority.
     *
     * `sampled-chord` for the reason `tr-pad-soft` gives above: a track sounds one note, and all
     * three requests ask for three or four at once. The render procedure is the same (p.187) and
     * so is the trade — a changed voicing is a second sample (§4.1), and the Hook phase says
     * which.
     *
     * Where this differs from the pad is the envelope and the play mode. A stab is struck and
     * gone, so `1-Shot` rather than `Forward loop` and no loop points: the sample's own end is
     * the end of the note.
     */
    sourceAudio: {
      need: 'A single sample of the whole chord, short and struck rather than sustaining',
      prep: {
        text: 'Play the chord across three tracks, then Render: it "bounces or exports an audio file based on the selected pattern / tracks which can then be made immediately available as a sample"',
        verified: { kind: 'manual', source: 'Polyend Tracker Manual 1.9.2a, p.187' },
      },
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
      ...filter('Low-pass', 74, 22, -26),
      ...ampEnv(0.01, 0.34, 0, 0.2),
      delaySend(24),
      swing(),
    ],
    // No `gate-length`: `1-Shot` plays the sample to its own end, so a gate lock on one has
    // nothing to act on. The Tracker Mini's manual states it outright and this box's play mode
    // is the same one; the envelope above is what shortens the strike.
    articulation: [{ slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' }],
    verified: false,
  },
  {
    id: 'tr-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'track',
    title: 'Bass an octave down with the filter envelope opening each note',
    /**
     * Five directions ask for this role, three `dark` and two `dirty`, which §3.4 puts at sqrt(2)
     * — so one recipe reaches all five and `dark` is the exact match for the majority.
     *
     * The filter envelope is the part: `AUTOMATION DESTINATION Cutoff` with an envelope is what
     * gives a bass note its shape on this box, and it is the same mechanism the lead uses one
     * destination along.
     */
    sourceAudio: {
      need:
        'A short bass note with harmonics above the fundamental — a filtered sine transposes into ' +
        'nothing to bite on',
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
      num('TUNE', -12, SEMITONES_24, 110, { unit: 'st' }),
      num('FINETUNE', 0, CENTS_100, 110, { unit: 'c' }),
      ...filter('Low-pass', 44, 34, -18),
      ...ampEnv(0.01, 0.42, 24, 0.18),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' },
      { slot: 'ghost', set: { volume: 42 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tr-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'track',
    title: 'Struck metal bit-crushed and band-passed onto its ring',
    /**
     * Three directions ask, wanting `bright`, `dark` and `dirty`. §3.4 puts `bright` and `dark` at
     * distance 2 — the one §3.5 refuses — while `dirty` sits at sqrt(2) from each, so it is the
     * only single character that reaches all three. The same arithmetic decided the Tracker
     * Mini's `metallic`, and it is worth naming as arithmetic rather than as a taste for grit.
     *
     * `bit-depth` and `overdrive` are per-step effects on this box rather than instrument
     * parameters, which is why the grit here is in the articulation and the routing rather than
     * in the params.
     */
    sourceAudio: {
      need:
        'A struck metal one-shot — bell, spring, pipe, anvil, brake drum. Inharmonic is the point, ' +
        'so a recording with one clear pitch is the wrong one',
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
      num('TUNE', -3, SEMITONES_24, 110, { unit: 'st' }),
      ...filter('Band-pass', 70, 58, -28),
      ...ampEnv(0.01, 1.1, 0, 0.4),
      reverbSend(30),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 100, overdrive: 60 }, hint: 'pick-fx' },
      { slot: 'offbeat', set: { volume: 78 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tr-acid-hard',
    role: 'acid',
    character: 'hard',
    voice: 'track',
    title: 'Acid line with the glide carried on the steps that slide',
    /**
     * **Both halves of this role are per-step effects here, which is the whole reason it works.**
     * `glide` is one (7.8, and this manifest declares it), so the slide is placed on the steps
     * that should slide rather than switched on for the track; `volume` is another, so the accent
     * is the same kind of thing. #283 asks a box to bind or state each; this one binds both.
     *
     * The filter envelope is the squelch. `AUTOMATION DESTINATION Cutoff` with a fast decay is
     * what a resonant sweep per note is on this box, and the resonance is high enough that the
     * peak is the sound rather than a colour on it.
     *
     * **The line's pitch is per step and is not authored here.** A tracker row carries its own
     * note, so the Hook phase supplies the figure and this recipe supplies the voice.
     */
    sourceAudio: {
      need:
        'A short saw or square bass tone of one known pitch, with no filter movement recorded ' +
        'into it — the filter is the part this recipe is for',
      hint: 'load-sample',
    },
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
      num('TUNE', -12, SEMITONES_24, 110, { unit: 'st' }),
      ...filter('Low-pass', 32, 76, -16),
      ...ampEnv(0.01, 0.26, 0, 0.12),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 100 }, hint: 'pick-fx' },
      { slot: 'offbeat', set: { glide: 40 }, hint: 'pick-fx' },
    ],
    verified: false,
  },
  {
    id: 'tr-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'track',
    title: 'Arpeggio from the box\u2019s own step effect, one chord code per step',
    /**
     * **This box has an arpeggiator and it is a step effect, so it costs both FX slots.** p.156:
     * *"Arpeggiator. This needs a note value and works in conjunction with the MIDI Chord which
     * must also be assigned to the other FX slot."* FX1 carries the arp type and rate, FX2 carries
     * the chord code, and a step has two slots — so **an arpeggiated step can carry no
     * articulation at all**, because every lane in `features.perStep` here is a step effect
     * needing a slot of its own. That is the constraint the Tracker Mini's manifest learned the
     * hard way and it is the same one, on the same effect, in the bigger box's manual.
     *
     * **The chord code is the direction's, not this folder's** (§4.1, invariant 3). p.156 maps a
     * hex code to a chord quality, and which one a bar wants is harmony. So `routing` points at
     * the Hook phase for the quality and at the page for the codes, and none is authored here.
     *
     * `clean` covers Generative Drift's `bright` request at §3.5's substitution distance.
     */
    sourceAudio: {
      need: 'A short plucked or struck tone of one known pitch, decaying inside a step',
      hint: 'load-sample',
    },
    routing:
      '**FX1 = the arp, FX2 = MIDI Chord** \u2014 the arpeggiator needs both slots on the step, so an ' +
      'arpeggiated step can carry no other effect (p.156). Set the arp value to the direction you ' +
      'want followed by the tempo divider; the MIDI Chord value is a hex code for the chord ' +
      'quality, which p.156 tabulates. Take the quality from the Hook phase \u2014 the step\u2019s own ' +
      'note is the root the arpeggio is built on',
    params: [
      pick('PLAY MODE', '1-Shot', PLAY_MODES, 121, { hint: 'play-mode' }),
      ...filter('Low-pass', 82, 18, -28),
      ...ampEnv(0.01, 0.2, 0, 0.1),
      delaySend(28),
      swing(),
    ],
    verified: false,
  },
]

export const device: Device = {
  id: 'polyend-tracker',
  name: 'Tracker',
  maker: 'Polyend',
  kind: 'groovebox',

  /**
   * Clock goes both ways and both directions are one menu apart. p.251's Config table, `MIDI`:
   *
   *  - `Clock In` — *"Sets the Tracker clock between the internal generated clock (default) or an
   *    external clock received through the USB or MIDI In jack."*
   *  - `Clock Out` — *"Sends the Tracker clock output to other devices. Off, USB, MIDI Out jack
   *    or USB+MIDI jack options."*
   *
   * `midi-din` is declared because the supplied Type B adapter is what the 3.5mm jack is for
   * (p.13, p.250); the TRS detail lives on the jacks.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],

    /**
     * §7.4/#80. **`preferredSource: true`, and the evidence is the manual's own worked topology
     * rather than the existence of a socket.** Everything above this line is capability. §7.4
     * asks whether driving a rig is this box's *job*, and p.253 answers it by drawing the case
     * first: §11.3 "Typical MIDI Configurations" opens with Tracker as the primary lead — Clock
     * In `Internal`, Clock Out `MIDI Out jack`, the downstream gear following.
     *
     * The manual documents the other direction too, which is why the claim is "this box can lead"
     * and never "this box leads over that one": p.264's MIDI Synthesizer configuration sets Clock
     * In to `MIDI In jack` and Clock Out to `Off`, and p.265 is explicit that *"Tracker's
     * sequencer must be stopped"* to use it that way. Following costs this box its sequencer;
     * leading does not.
     *
     * The citation is p.253, the page that draws the role, not p.251, the menu that carries the
     * clock out.
     */
    preferredSource: true,

    /**
     * §7.4. **Clock output on this box is a menu**, and a rig phase naming the Tracker as the
     * source is an instruction nothing can obey until it is set.
     *
     * Two entries because the menu takes two different values for the two transports this box
     * declares, and printing `USB` at a reader patching a MIDI cable is worse than printing
     * nothing. The strings are the menu's own, spelled as p.251 spells them — `MIDI Out jack`,
     * not "the MIDI jack" — because §8 is read at the machine and that is what is on the screen.
     *
     * The matching `Clock In` row is not authored here: `sourceSetup` is named for the half it
     * covers, and what syncing costs a receiver is a separate piece of work per receiving box.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Config > MIDI > Clock Out',
        value: 'MIDI Out jack',
        note: 'Off, USB, MIDI Out jack, USB+MIDI jack — set Transport Out the same way for Play/Stop',
      },
      {
        transport: 'usb',
        path: 'Config > MIDI > Clock Out',
        value: 'USB',
        note: 'Off, USB, MIDI Out jack, USB+MIDI jack — set Transport Out the same way for Play/Stop',
      },
    ],
  },

  /**
   * One 3.5mm stereo `Out` doubling as headphone out, one `Line In`, one `Mic` (p.13, p.187). No
   * individual outs — p.13 names every hole on the rear edge and there is one audio output among
   * them.
   *
   * `usbAudio: false`. See `capabilityEvidence` for what was read.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10/#103. **The clock jacks are the MIDI pair, and there is no socket called `CLK`.**
   *
   * p.13's hardware overview dimensions the rear edge and names every hole on it: `Out`,
   * `Line In`, `Mic`, `MIDI Out`, `MIDI In`, `Micro SD`, `USB`, `Power`. Clock leaves and arrives
   * over MIDI, so the MIDI pair is what carries `midi-din` and what the rack labels.
   *
   * `usb` is not declared as a jack, and the omission is the honest one: one socket carrying both
   * directions is a shape `JackSpec.direction` cannot state, and p.13 captions it `USB Power
   * Input`. A rig that resolved onto USB draws its sockets unlabelled.
   *
   * `Out`, `Line In` and `Mic` are on the panel and are not declared here, because nothing
   * references them: `io` already carries the audio path, and §3.3's list is for jacks something
   * points at.
   */
  jacks: [
    {
      id: 'MIDI Out',
      direction: 'out',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      // Type B is the uncommon one, and a reader reaching for a Type A cable gets silence with
      // nothing on screen to explain it. p.13's callout: "3.5mm Jack to 5 Pin MIDI adapter (type
      // B) supplied", restated at p.250: "Tracker uses a TRS to Type B MIDI Adapter."
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.250)',
    },
    {
      id: 'MIDI In',
      direction: 'in',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.13, p.250)',
    },
  ],

  /**
   * §2.6/#111. **Nine named factory packs, and the count is inside a drawing.**
   *
   * p.30, the "Default SD card structure" folder tree: *"Tracker comes with 9 factory packs
   * installed onto the SD Card"*, followed by the nine folder names — `/ARC Noise`,
   * `/Jamie Lidell`, `/Legowelt`, `/Loops n trouble`, `/Oneven FM`, `/Plughugger`,
   * `/Simulacrum Sounds`, `/Stazma & Concrete Collage`, `/Wavetables_2048`. The same card ships an
   * `/Instruments` tree of `.pti` files under `/Drum Kits`, `/Instrument Kits`, `/Progressions`
   * and `/Synths`.
   *
   * p.183 says the same thing in prose, which is what makes this safe rather than lucky: *"Of
   * course Tracker already is supplied out of the box with a number of samples and instruments
   * pre-loaded to the supplied SD Card."*
   *
   * `shipped-library` and not `enumerable`, because the packs are named and their *contents* are
   * not. Nine folder names cannot be referenced by a recipe, so the nineteen below still say what
   * they need in prose.
   */
  content: {
    kind: 'shipped-library',
    library: '9 factory sample packs, plus a .pti instrument tree',
    location: '/Samples and /Instruments on the supplied 16GB microSD card',
    reason: 'p.30 names the nine packs and the count; no page lists what is inside one',
  },

  /**
   * §2.6. **A step on this box carries no length**, and what ends a note is the next note on the
   * same track — *"Each track in Tracker can handle one voice which can play multiple notes, but
   * not simultaneously"* (p.98) — or one of the three Special Note Commands on p.99.
   *
   * `OFF` of the three, and the page says why the other two would be a different instruction:
   * `OFF` *"will act as 'Note-Off' and trigger the release phase of the envelope to reduce the
   * sound"*, which is what a hook means by a note stopping. `CUT` *"will immediately stop the
   * audio sound"* and `FAD` *"will gradually reduce the audio sound and fade it out"* — both are
   * edits to the sound rather than the end of a note, and printing either would be this manifest
   * choosing an effect on the reader's behalf.
   */
  noteDuration: { kind: 'until-next', noteOff: 'OFF' },

  capabilityEvidence: {
    'clock.canSendClock': cite(251),
    'clock.canReceiveClock': cite(251),
    'clock.transport': cite(251),
    /** The drawn topology, not the menu that carries the clock out. */
    'clock.preferredSource': cite(253),

    [jackFact('MIDI Out')]: cite(13),
    [jackFact('MIDI In')]: cite(13),
    [clockSourceSetupFact('midi-din')]: cite(251),
    [clockSourceSetupFact('usb')]: cite(251),

    'io.main': cite(13),
    'io.individualOuts': cite(13),
    'io.audioIn': cite(187),
    /**
     * **The one capability claim on this box that rests on an enumeration rather than a
     * sentence.** p.187 is headed "Audio Sources" and answers the question directly — *"There are
     * a number of sources where Tracker can access audio"* — then numbers all of them: Line Input,
     * Mic Input, Render, FM Radio, SD Card. USB is not among the five.
     *
     * The other direction is p.13, which captions the USB-C socket `USB Power Input`, and ch.11,
     * which scopes USB on this box to MIDI (p.250: *"Tracker has USB MIDI"*). No page anywhere in
     * 308 describes the Tracker as an audio interface.
     *
     * Recorded as `cited-against` rather than `unknown` because p.187 is a closed list that was
     * written to be one. If a firmware note later adds USB audio, this is the entry to change.
     */
    'io.usbAudio': {
      kind: 'cited-against',
      cite: cite(187),
      reason:
        'p.187 enumerates the five sources Tracker can take audio from — Line Input, Mic Input, Render, FM Radio, SD Card — and USB is not one; p.13 captions the USB-C socket "USB Power Input" and p.250 scopes USB to MIDI',
    },

    /**
     * The count and the polyphony come from two pages and agree. p.28's architecture diagram:
     * *"8 Tracks / Voices per Project"*, beside *"Maximum 48 Instrument slots are available per
     * Project"*. p.98 gives the per-track figure: *"Each track in Tracker can handle one voice
     * which can play multiple notes, but not simultaneously... A triad would need 3 tracks to
     * play the chord."*
     *
     * Whole rather than `partly`, unlike the Play+: there is no second pool here whose polyphony
     * is a shared budget, because there is no synth engine. Eight tracks, one voice each, and the
     * only thing any of them does is play a sample.
     */
    voices: cite(28),

    /** p.143's "Step FX Reference", which lists every effect this box puts on a step. */
    'features.perStep': cite(143),

    /**
     * The master limiter's `Sidechain` row, p.243: *"Selects the audio signal used to trigger
     * limiting. The normal state is disabled which uses the main audio. Alternatively individual
     * tracks or line in L or R can be selected."* Options `Disable, Track 1-8, Line In L R`.
     *
     * Both halves come off that one row, which is why both cite the same page: `Track 1-8` is the
     * internal key and `Line In L R` is the external one. The external half is the rarer claim in
     * this library and it is printed, not inferred — this box will duck its master bus from
     * whatever is plugged into the Line In.
     */
    'features.sidechain.internal': cite(243),
    'features.sidechain.fromExternalAudio': cite(243),

    /**
     * Read in full and it does not answer the question `LfoSpec` asks. The automation section
     * (pp.115-120) gives **six destinations** — Volume, Panning, Cutoff, Wavetable Position,
     * Granular Position, Finetune — and *"Each destination has the option of an LFO, envelope or
     * no automation"*, so the LFO is per destination and how many are running is a property of a
     * patch rather than of the box. `count` has no honest value. `syncable` would be true and
     * would say far less than p.117 does, which also carves out an exception a boolean cannot
     * carry: *"128 to 32 Step Speed options are not available with Volume as the destination."*
     */
    'features.lfo': {
      kind: 'unknown',
      reason:
        'pp.115-120 document the automation section in full but give no per-box LFO count: the LFO is one option per destination, so the number running is a property of the patch',
    },

    content: cite(30),
    noteDuration: cite(99),
  },

  /**
   * §10. 282 mm, measured off the dimensioned plan view in 1.2 Hardware Overview (p.13), which
   * dimensions the case directly: 282 mm across, 207 mm deep, 33 mm thick. The Tracker plays flat
   * on a desk in landscape, so the maker's width and the played span are the same edge — no
   * orientation trap of the kind the portrait Tracker Mini sets.
   */
  physical: {
    panelSpanMm: 282,
    verified: { kind: 'manual', source: 'Polyend Tracker Manual 1.9.2a, p.13 (Hardware Overview)' },
  },

  /** §10. A simplified original drawing of the panel, read off the manual (see `panel.ts`). */
  panel: TRACKER_PANEL,

  /**
   * One pool. p.18: *"Tracker has 8 tracks, each of which can be configured with unique patterns
   * made up of one or more instrument combinations."* Nothing splits them — there is no synth
   * engine to reserve tracks for, so unlike the Mini and the Play+ this box has one kind of track
   * and every role reaches every one of the eight.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 8,
      roles: TRACK_ROLES,
      polyphony: 1,
      /**
       * §2.1. **The note that plays a loaded sample as it was recorded.** On this box that is
       * a fact about the hardware rather than a musical choice — p.122's *"Note value affects
       * pitch"* means any other note is the same sample transposed, so a reader told to hit a
       * step and not told what to write on it is one step away from a kick a fifth too high.
       *
       * On the one pool, because there is only one and every track on it plays a sample: this box
       * has no synth engine (p.98, and the header above), so unlike the Mini there is no second
       * kind of track whose note would be the reader's own.
       */
      triggerNote: { note: 'C5', midi: 60, verified: TRIGGER_NOTE_CITE },
    },
  ],

  /**
   * This device's own per-step FX names (ch.7), not §2.3's five: `perStep` is an open list
   * compared only against this device's own articulation keys, so a name here that no recipe
   * reaches for validates nothing. Every one of these thirteen is used by a recipe below, and
   * each carries its own printed page — Volume p.146, Micro Tuning p.148, Glide p.149, Gate
   * Length p.153, Chance p.154, Roll p.155, Random Volume p.161, Reverse Sample p.162, Slice
   * p.164, Overdrive p.170, High Pass p.173, Reverb Send p.175, Bit Depth p.176.
   *
   * **Panning (p.147) is deliberately absent, and the box does it.** It was listed here until the
   * manifest test asked which recipe reached for it and the answer was none — the pans below are
   * the *instrument* Panning on p.110, a different control on a different page. Keeping the
   * step-FX name against nothing would only make the table look fuller than the recipes are,
   * which is the Tracker Mini's `low-pass` finding (#108) in a new place.
   *
   * The chapter documents thirty-seven and the architecture diagram on p.28 says *"a list of 29
   * FX"*; the shortfall is the six MIDI CC slots counted as one and the manual's own arithmetic,
   * and it does not affect anything here.
   *
   * `sidechain` is declared and `lfo` is not — see `capabilityEvidence` for both.
   */
  features: {
    perStep: [
      'volume',
      'micro-tune',
      'glide',
      'gate-length',
      'chance',
      'roll',
      'random-volume',
      'reverse-sample',
      'slice',
      'overdrive',
      'high-pass',
      'reverb-send',
      'bit-depth',
    ],
    sidechain: { internal: true, fromExternalAudio: true },
  },

  /** Gestures off the panel and the menus. Jogs, not documentation (invariant 7). */
  hints: {
    // p.103: "Hold [FX1] or [FX2] + Turn (Jog). The FX type is selected with a default value."
    // p.103 also notes recording mode has to be on first: "Select recording mode, Press [Rec]."
    'pick-fx': 'Press [Rec], hold [FX1], turn (Jog)',
    // p.45: "Press [Sample Loader] to open the sample browser", then "press the [Add], 1st Screen
    // button. This will add or replace in the selected instrument slot."
    'load-sample': '[Sample Loader], highlight, press [Add]',
    // p.121, p.127: the play mode lives on the Sample Playback page, on screen buttons 7 and 8.
    'play-mode': '[Sample Playback], screen buttons 7/8',
    // p.109: "The two pages are accessible directly from toggling the [Instrument Parameter]
    // button", and "Screen buttons select the parameter options... then turn (Jog) to adjust."
    'inst-params': 'Screen button picks, (Jog) adjusts',
    // p.109, p.115. The automation page is page 2 of 2.
    'inst-automation': 'Press [Instrument Parameter] again for page 2',
    // p.136: "Hold to play the grain from the current position selected. Also hold while
    // adjusting position to 'scan' for the desired sound."
    'scan-grain': 'Hold [Preview] while turning (Jog)',
    // p.128: set the count on screen button 3, then Slice Evenly on screen button 2.
    'slice-sample': '[No of Slices], then [Slice Evenly]',
    // p.197: "Press [Sample Recorder] to open the sampler page", then Source, Monitor, Gain, and
    // "Press [Save & Load], 7th Screen button" to keep it.
    'record-audio': '[Sample Recorder], set [Source], press [Record]',
  },

  /**
   * A taste judgement, not a limit the manual states. All eight tracks play at once; seven is how
   * many parts stay manageable at the machine, on a screen showing four tracks at a time by
   * default (p.18) and eight only with a modifier held. Raise it and nothing breaks: crowding is
   * a cost in the objective, never a feasibility limit (§12.4).
   */
  comfortableVoices: 7,

  manual: { title: 'Polyend Tracker Manual', edition: '1.9.2a' },

  productPage: 'https://polyend.com/tracker/',

  recipes: RECIPES,
}
