import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type {
  AuthoredEnumParam,
  AuthoredNumericParam,
  AuthoredTextParam,
  Cite,
} from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { PLAY_PLUS_PANEL } from './panel'

/**
 * Polyend Play+ (§2.3). A sixteen-track groovebox whose tracks come in **two disjoint pools** —
 * "Play+ has 16 tracks, 8 for MIDI / Synths and 8 sample tracks" (p.42).
 *
 * That is nearly the Tracker Mini's shape and is worth contrasting with it, because the difference
 * removes the sibling's one real cost. On the Tracker Mini pool B's capability is a strict *subset*
 * of pool A's — tracks 1-8 host samples, synths and MIDI while 9-16 host synths and MIDI — so every
 * synth recipe there exists twice, once per pool, and `onBothPools` exists to stop the twins
 * drifting. Here the split is total: an audio sample track cannot host a synth and a MIDI / Synth
 * track cannot play a sample. p.201 states the toggle rather than an overlap — "the [Audio/MIDI]
 * button can switch between working with 8 audio sample tracks or working with 8 MIDI / Synth
 * tracks" — so **no recipe below is duplicated**, and the pool a recipe names is the only pool
 * that could ever run it.
 *
 * ## The mode is a parameter, because every knob has three printed scales
 *
 * This is the trap CLAUDE.md names, and this box is the worst case of it in the library. p.60:
 * "Some functions change when in MIDI / Synth Mode, indicated in Italic text in the table below to
 * reflect a MIDI or a Synth parameter." The *same physical knob* is `Filter Cutoff` on an audio
 * track (a DJ filter, 100-0-100 either side of centre, p.66), `CC#74` on a MIDI track, and an
 * arbitrary patch macro in Synth mode (p.66, p.93). `Sample Start` is a sample position in ms and
 * also `Chord` (p.68). `Panning` is a stereo position and also `MIDI Note Length` (p.65). `Volume`
 * is dB and also `Velocity` (p.65).
 *
 * A cutoff of 44 is therefore meaningless until the mode is fixed, and the citation beside it
 * proves nothing on its own. So **every recipe carries `TRACK MODE` as its first parameter**, and
 * every synth recipe carries `SYNTH MODEL` beside it — the same repair the TR-8S makes with its
 * tone category and the minilogue xd with its oscillator switch. The pairing cannot come apart,
 * because the switch travels in the recipe.
 *
 * ## Three synth slots, and PERC is why that is not three recipes
 *
 * "Play+ has 3 synthesizers which operate with patches" (p.94), and a patch is one slot. The
 * Tracker Mini reads its identical constraint as a cap of three distinct synth recipes; the Play+
 * gets far more out of the same three slots because of one engine.
 *
 * **PERC is a whole drum machine in one slot.** p.90: "PERC is a unique drum machine that is loaded
 * into one synth engine instrument. It uses 1 voice but can play back up to five unique drum sounds
 * at once." Its parameter tables (pp.111-116) are one table per *part* inside one patch, and each
 * part answers to its own note: Kick on C4, Toms on C0-B3 and C5+, Snare on D4, Hi Hat on E4-G4,
 * Cymbal on A4, Percussion on B4 (pp.111-113). The parts' parameter groups are disjoint, so six
 * recipes below share one patch and one slot without ever contending for a value.
 *
 * **The authoring rule that follows, and it is not the obvious one:** at most one recipe per PERC
 * *part group*. Two roles on the same group would fight — `closed-hat` and `open-hat` both want
 * Hi Hat's Model, Timbre, HPF Cutoff, LPF Cutoff and Tone/Noise Mix, of which only Closed Decay and
 * Open Decay are separate (p.112), and `clap` and `ghost-perc` would each want a different
 * `Percussion · Model` on the same note B4 (p.113). So the hat pair is split across the two pools:
 * `closed-hat` is PERC, `open-hat` is a sample. `test/polyend-play-plus.test.ts` pins the rule.
 *
 * The budget therefore spends as: **PERC (one slot, six drum recipes) + ACD + WTFM**. Two slots for
 * two voices is a poor return next to PERC's six, which is exactly why PERC gets the first one.
 *
 * ## What is deliberately not authored
 *
 *  - **No `pad` and no `stab`**, and the reason is two reasons because the two pools declare them
 *    for two different sets of tracks. Neither is a capability claim; both resolve as honest gaps
 *    (invariant 5).
 *
 *    On **`track-synth`** it is the slot budget above. `pad` and `stab` are among the most heavily
 *    served roles in the library — 48 and 45 recipes across thirty-odd boxes — and with only two
 *    non-PERC patches to spend, spending one on a 49th pad rather than on the engines this box is
 *    distinctive for (a 303-lineage acid voice, a 2-op FM metallic) buys the search work and says
 *    nothing new.
 *
 *    On **`track-sample`** the budget does not apply at all — there are eight tracks and twelve
 *    recipes already on them — so the reason has to be something else, and it is `polyphony: 1`
 *    (p.141). **Every shipped request for either role asks for three or four notes**: `pad` at 3
 *    or 4 in all five directions that want one, `stab` at 3 or 4 in all three. A monophonic pool
 *    is filtered out on capability before any recipe is consulted, so a sampled pad or stab here
 *    could not be selected by anything the library ships — it would be an authored recipe no
 *    reader can reach, which is what `audit`'s `REACH` block exists to name. A `sampled-chord`
 *    would dodge the filter and lose anyway: §7.1 ranks `polyphonic-voice` above it, and the
 *    polyphonic pool is on this same box.
 *
 *    **This paragraph used to cover all three roles with the slot argument alone**, which was a
 *    synth-pool reason standing in for a sample-pool question it never asked. #345 is what went
 *    and asked it, and `lead` came back with a different answer — see below.
 *  - **`lead` was in that list and is not any more.** Both directions that ask for one ask at
 *    **polyphony 1**, which is exactly what a sample track sounds, so neither half of the
 *    paragraph above reaches it: no synth slot is spent and no capability filter applies.
 *    `pp-lead-bright` is on `track-sample` for that reason and states it there.
 *  - **PERC's own FX and EQ section** (p.114: Waveshaper Type, EQ Low 80Hz / Mid 2.5kHz /
 *    High 12kHz, each -18dB to +18dB). It is one section for the whole PERC patch, so a value set
 *    by the kick recipe would silently be the snare's and the hat's too. A per-recipe parameter
 *    that is really patch-global is a claim this shape cannot make honestly, so it is omitted
 *    rather than authored six times with six different numbers.
 *  - **Master Volume and track Volume**, both printed as "-inf dB to 12 dB" (p.61, p.65). `-inf` is
 *    not a finite number, `NumericRange` rightly refuses it, and inventing a floor to make it fit
 *    would be the invented claim §3.1 exists to prevent. This is the sibling's `-inf dB to 24.00 dB`
 *    problem, unchanged.
 *  - **`Note` on a sample track.** p.64 describes the gesture — "Adjustments across the note range
 *    are made in semitones, 1 note per iteration" — and never prints the range. `Microtune` is used
 *    instead wherever pitch is wanted, because p.64 does print its bounds.
 *  - **`Kick · Pitch` and `Snare · Pitch`**, whose range p.111 and p.112 print as `C0-B8`. Note
 *    names are not a numeric range and not a practical enum at 108 entries, so both sit as `text`
 *    with the span in the `note` where a reader can act on it.
 *
 * ## No trigger note on either pool, and the two pools decline for different reasons (§2.1/#334)
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. This
 * box has 240, and the two pools have to be answered separately because they fail differently.
 *
 * ### `track-sample`: the note exists, and the number that would make it authorable does not
 *
 * A step on a sample track already carries its own sound. p.67's `Sample` is *"The sample that is
 * selected and used as a steps sound source. Typically would be set in the work step then placed
 * on the grid"*, so what a step needs is a sample and a position, and it has both before any note
 * is considered.
 *
 * There **is** a note beside it, and p.64 gives it a default: `Note` *"Sets the pitch note for
 * the sample"*, adjusted *"in semitones, 1 note per iteration"*, and — *"Play+ assumes the note
 * 'C4' as the default for the sample and adjustments would therefore reference this expected
 * default."* That is exactly the fact `TriggerNote` was built for, and it still cannot be
 * authored, because **`TriggerNote` is a `note` *and* a `midi`** and no page in the 254 anchors
 * `C4` to a number. p.211's MIDI-mode table gives `Note` as *"MIDI Note Tune — Tunes the MIDI
 * note in semitone steps"*, with no number; the only numbered range on that page is a program
 * change. §2.1 refuses `verified: false` on this field precisely so the missing half cannot be
 * filled in by habit, and the habit here is expensive: read as scientific pitch notation `C4` is
 * 60, and one octave is the difference between a sample playing as recorded and playing wrong.
 *
 * **The one `Middle C` in the manual is not this box's.** p.226's Tracker MIDI Integration prints
 * two settings columns, and `Middle C  C-5` stands in the left one, under `Tracker:` and
 * `Config > MIDI` — the *connected Tracker's* configuration page. The Play+ column beside it is
 * `Menu > MIDI > CC Mapping > Jack Channel 1` and carries CC numbers only. Borrowing that line
 * would be authoring this box from a screenshot of another one, and #352 is what it would cost:
 * under `Middle C C-5` the Tracker Mini's `C5` **is** 60, so the same reading would make this
 * box's `C4` 48.
 *
 * ### `track-synth`: there is no one note, because PERC's parts each have their own
 *
 * A pool's `triggerNote` addresses every member alike, and this pool holds two incompatible
 * kinds of patch. On an ordinary synth patch — `ACD` and `WTFM` below — a note is a musical
 * pitch the part plays, which is the direction's business and not a fixed address. On `PERC` the
 * note *is* the address, and there are six of them: Kick `C4`, Snare `D4`, Hi Hat `E4-G4`, Cymbal
 * `A4`, Percussion `B4`, Toms `C0-B3` and `C5` up (pp.111-113). Those are already recorded, on
 * each PERC recipe's `routing`, which is the honest place for an instruction that addresses one
 * part rather than the pool.
 *
 * So a pool-wide value would have to be one of six drum addresses and a musical pitch at once,
 * and #334's third category — a note that selects *which sound* rather than which pitch — is the
 * one `TriggerNote` explicitly declines to model until the vocabulary can say it.
 *
 * So the 240 blanks are correct output. The tests are in `test/polyend-play-plus.test.ts`.
 *
 * ## Citation regime
 *
 * Legality is cited, authority almost never is. Every *range* and every *option set* is the
 * manual's own with the page that carries it; every *point* is taste and stays `verified: false`
 * (§3.2). There are exactly **two** exceptions in this file, both the same sentence: p.116 says of
 * the PERC Hi Hat and Cymbal Timbre that "A value of 12 is a good starting point and is the best
 * match of TR-808". That is a manual stating a *point*, which is rare enough to be worth naming,
 * so those two carry `manual` authority and every other point here does not.
 *
 * ## The manual argues with itself, repeatedly
 *
 * Recorded rather than smoothed over, because a reader who checks will find them.
 *
 *  - **How many synth models.** p.13 says five, p.35 and p.94 say four, p.90 says six, p.91 says
 *    five. The *named* evidence is consistent at six every time it appears — p.90 describes ACD,
 *    FAT, VAP, WTFM, PERC and DIRT by name, and p.94's `/Patches` tree draws six folders on the
 *    same page whose prose says four. DIRT is the newest model and the counts read as an
 *    un-propagated revision, so `SYNTH_MODELS` carries six and cites p.90.
 *  - **How many synth slots.** p.92 says "each of the four synthesizers" and then, in the next
 *    sentence of the same numbered step, "Each of the 3 synths". Three is right everywhere else
 *    (p.90, p.91, p.94, p.96) and three is what the slot budget above assumes.
 *  - **How many macros.** p.90 and p.93 say six, p.117 says "3 of the panel knobs", and the per-
 *    engine tables list seven `Macros` rows (pp.98, 100, 104, 110). Nothing here depends on the
 *    number, so nothing here picks one.
 *  - **p.17 names the wrong product** — "Under-powering the *Tracker* from a hub" — carried over
 *    from the sibling's manual.
 *  - **p.89 prints `Sample End` with `Sample Start`'s description**, so the end parameter's prose
 *    is the start parameter's. p.68 has both correctly and is what is cited.
 *  - **`EQ 99000 Hz`** (p.191), out of step with the 115 / 330 / 990 / 3000 progression beside it
 *    and above audible range. Not used here.
 *  - **`Repeat Grid` lists `3 Hits|1 Step` twice** (p.72). See `REPEAT_GRIDS`.
 *  - **USB hubs** are unsupported on p.231 and p.234 and assumed on p.208 and p.227.
 */

/**
 * Ranges exactly as the manual's own "Range / Options" blocks and Range columns print them. These
 * are the cited claim; the point inside is taste.
 */
const PCT = { min: 0, max: 100 } //                  0-100%
const BIPOLAR = { min: -100, max: 100 } //           -100 to +100
const NOTE_TRACK = { min: -200, max: 200 } //        -200% to 200%
const VOICE_VOL = { min: 0, max: 200 } //            0-200%
const PAN = { min: -100, max: 100 } //               100L - Center - 100R
const CENTS = { min: -100, max: 100 } //             -100 to 0 to +100 cents
const DJ_FILTER = { min: 1, max: 100 } //            Low-Pass 1-100 / High Pass 1-100
const BITS = { min: 4, max: 16 } //                  from 4 bits up to 16 bits
const SWING_RANGE = { min: 25, max: 75 } //          25% to 75%
const SECONDS_10 = { min: 0, max: 10 } //            0.00-10 Sec
const SECONDS_3 = { min: 0, max: 3 } //              0.00 - 3 Sec
const SECONDS_2 = { min: 0, max: 2 } //              0-2 Sec
const MS_10 = { min: 0, max: 10 } //                 0-10 ms
const AUDIO_HZ = { min: 20, max: 20000 } //          20Hz - 20kHz
const HAT_HZ = { min: 10, max: 20000 } //            10Hz - 20kHz
const CYM_FILTER_HZ = { min: 500, max: 10000 } //    500Hz-10kHz
const CYM_TONE_HZ = { min: 80, max: 880 } //         80Hz-880Hz
const TIMBRE_24 = { min: 0, max: 24 } //             0-24
const TIMBRE_200 = { min: 0, max: 200 } //           0-200
const PITCH_MOD = { min: -1000, max: 1000 } //       -1000 to 1000
const FM_PCT = { min: 0, max: 1000 } //              0% to 1000%
const FM_RATIO = { min: 0.25, max: 12 } //           0.25 - 12
const UNITLESS_100 = { min: 0, max: 100 } //         0-100, no unit printed

/** A citation. The page is the one carrying that parameter's own printed bound or option list. */
function cite(page: number): Cite {
  return { kind: 'manual', source: `Polyend Play+ Manual Rev 2, p.${page}` }
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
 * A time in seconds. Identical to `num` but for the step, which is a hundredth: the engine tables
 * print these bounds to two decimals — `0.00-10 Sec`, p.97 — so a hundredth is the grid the box
 * itself works on, and the default step of 1 would round every mood offset to a whole second.
 */
function secs(
  name: string,
  value: number,
  bounds: { min: number; max: number },
  page: number,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return num(name, value, bounds, page, { unit: 'Sec', step: 0.01, ...extra })
}

function pick(
  name: string,
  value: string,
  values: string[],
  page: number,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values, verified: cite(page) },
    verified: false,
    ...extra,
  }
}

function text(name: string, value: string, note: string): AuthoredTextParam {
  return { kind: 'text', name, value, verified: false, note }
}

// ---------------------------------------------------------------------------
// Option sets, as printed
// ---------------------------------------------------------------------------

/**
 * p.201: "the [Audio/MIDI] button can switch between working with 8 audio sample tracks or working
 * with 8 MIDI / Synth tracks". This is the switch that decides which of a knob's three printed
 * scales is in force, so it leads every recipe below.
 */
const TRACK_MODES = ['Audio sample', 'MIDI / Synth']

/** p.90, which names all six. See the header for the four counts the prose gives. */
const SYNTH_MODELS = ['ACD', 'FAT', 'VAP', 'WTFM', 'PERC', 'DIRT']

/**
 * p.66's DJ filter, whose two halves are two different filters with two different scales sharing
 * one knob: "Range is 100-0 anticlockwise - low pass filtering. Turning clockwise 0-100 high pass
 * filtering. Centre position applies 'No Filter' to the sound." p.188's signal-chain diagram
 * prints the pair as `Low-Pass 1-100` and `High Pass 1-100`, which is where `DJ_FILTER` comes
 * from and why every `CUTOFF` below is preceded by the side it is measured on.
 */
const FILTER_MODES = ['Low-Pass', 'No Filter', 'High Pass']

/** p.72, verbatim and in printed order. */
const REPEAT_TYPES = [
  'Off', 'Straight', 'Fade', 'Raise', 'Pong', 'Arp Down', 'Arp Up', 'Tank', 'Alien', 'Echo',
  'Your Crush', 'Glitter', 'Effectron', 'To And From', 'Round Trip', 'Octaves', 'Game Over',
  'Down And Up',
]

/**
 * p.72, in printed order — **with one of the two `3 Hits|1 Step` entries dropped.** The page prints
 * it twice in immediate succession ("2 Hits|1 Step, 3 Hits|1 Step, 3 Hits|1 Step, 4 Hits|1 Step"),
 * which is a typo rather than two distinct densities: nothing else in the list repeats, and the
 * sequence either side of it is strictly ascending. A duplicated option would surface to a reader
 * as two identical rows to choose between, so the repeat is dropped and recorded here instead.
 */
const REPEAT_GRIDS = [
  '2 Hits|1 Step', '3 Hits|1 Step', '4 Hits|1 Step', '8 Hits|1 Step',
  '3 Hits|4 Steps', '4 Hits|4 Steps', '6 Hits|4 Steps', '8 Hits|4 Steps', '16 Hits|4 Steps',
  '2 Hits|8 Steps', '3 Hits|8 Steps', '4 Hits|8 Steps', '6 Hits|8 Steps', '8 Hits|8 Steps',
  '16 Hits|8 Steps', '32 Hits|8 Steps',
]

/** p.189's Reverb column, in printed order. `Big Room` is starred as the default. */
const REVERB_PRESETS = [
  'Big Room', 'Small Room', 'Uncharted', 'Drone', 'Analog Repeats', 'Late', 'Bounce',
  'Stereo Drums', 'Bright Sky', 'Space', 'Transparent Hall', 'Custom',
]

/** p.189's Delay column, in printed order. `Dubster` is starred as the default. */
const DELAY_PRESETS = [
  'Dubster', 'Triple Dubster', 'Bucket', 'Nanorobot', 'Widea', 'Brighteen', 'Monoroom',
  'Stereoroom', 'Pipe', 'Degradah', 'Mononono', 'Cleanio', 'Twoism', 'Warbliani', 'Rabbithole',
  'Stringston', 'Metalhead', 'Shock', 'Stringston Jr', 'Superfario', 'Custom',
]

/**
 * pp.111-113. The sixteen body wavetables, shared by the PERC Kick, Toms and Snare. Printed with
 * the shaper prefix inconsistent — `tzFM1`, `txFM3`, `tzFM7`, `txFM11` — which is reproduced rather
 * than tidied, because a reader is matching these against the box's own screen.
 */
const BODY_WAVES = [
  'Sat-Sin', 'Triangle', 'Square', 'Square FM', 'FM1', 'FM3', 'FM7', 'FM 11',
  'tzFM1', 'txFM3', 'tzFM7', 'txFM11', 'Glitch 1', 'Glitch 2', 'Glitch 3', 'Glitch 4',
]

const KICK_MODELS = ['Classic8', 'Synced8', 'Classic9'] //                              p.111
const TOM_MODELS = ['Classic', 'Classic+', 'Resonant'] //                               p.111
const SNARE_MODELS = ['Classic8', 'Classic9', 'Classic9+', 'Modern', 'Modern+'] //      p.112
const HAT_MODELS = ['Classic', 'FM'] //                                                 p.112
const CYMBAL_MODELS = ['Classic', 'FM'] //                                              p.113
const PERC_MODELS = ['Clap', 'Clap+', 'Maracas', 'Shaker', 'Cowbell'] //                p.113

/** p.97. ACD's three, and `Low Pass RD3` is the 303-lineage filter the engine exists for. */
const ACD_FILTERS = [
  'Low Pass State Variable 12dB', 'Low Pass State Variable 24dB', 'Low Pass RD3',
]

/** p.107. WTFM's fifteen, verbatim. */
const WTFM_FILTERS = [
  'Low Pass MG 24dB', 'Low Pass OB 24dB', 'Low Pass OB 12dB', 'Low Pass SVF 24dB',
  'Low Pass SVF 12dB', 'Hi Pass OB 24dB', 'Hi Pass OB 12dB', 'Hi Pass SVF 24dB',
  'Hi Pass SVF 12dB', 'Band Pass OB 24dB', 'Band Pass OB 12dB', 'Band Pass SVF 24dB',
  'Band Pass SVF 12dB', 'Notch SVF 24dB', 'Notch SVF 12dB',
]

/** p.107. The wavetable row each WTFM operator sweeps. */
const WTFM_CHARACTERS = [
  'Smoother', 'Sharper', 'Wilder', 'Add 1', 'Add 2', 'Add 3', 'Add 5', 'Add 7', 'Add 11',
]

/** p.98. Shared by every engine's modulation section. */
const GLIDE_MODES = ['Always', 'Overlap', 'Legato', 'Legato Overlap']

// ---------------------------------------------------------------------------
// Shared parameters
// ---------------------------------------------------------------------------

/** Which of the knob's three printed scales is in force. See the header. */
function audioMode(): AuthoredEnumParam {
  return pick('TRACK MODE', 'Audio sample', TRACK_MODES, 201, {
    hint: 'mode-toggle',
    note: 'function pads green in audio, purple in MIDI / Synth',
  })
}

function synthMode(model: string): AuthoredEnumParam[] {
  return [
    pick('TRACK MODE', 'MIDI / Synth', TRACK_MODES, 201, {
      hint: 'mode-toggle',
      note: 'function pads green in audio, purple in MIDI / Synth',
    }),
    pick('SYNTH MODEL', model, SYNTH_MODELS, 90, { hint: 'pick-synth' }),
  ]
}

/**
 * §6.1. The swing axis, as an ordinary cited numeric (#62).
 *
 * p.62: "A setting of 50% is default and applies no swing. Range is 25% to 75%. Values <50% apply a
 * swing for notes to play early and >50% plays late." The bounds **and** the neutral point are both
 * printed, so nothing here is a guess but the taste of where to sit inside it — and the point stays
 * `verified: false` because the page states where neutral is, not that this part wants to be there.
 *
 * `scope: 'pattern'` because the same page says so: "Select all tracks to apply a global swing
 * value", and the swing knob addresses whichever tracks are selected. Printing it once per part
 * would have a reader set one control twenty times.
 *
 * `amount` is 25, the distance from 50 to each printed bound, so the whole sweep of the knob moves
 * the value and no part of the travel is spent against a clamp.
 */
function swing(): AuthoredNumericParam {
  return num('SWING', 50, SWING_RANGE, 62, {
    unit: '%',
    mood: [{ axis: 'swing', amount: 25 }],
    note: '50% is no swing; select all tracks to set it once for the pattern',
    scope: 'pattern',
  })
}

/**
 * The master reverb's character, which the send amount alone does not carry. p.194: the preset
 * "will automatically configure the style and character of the main reverb. This applies to the
 * main FX and therefore will take input from all send signals" — one instance for the whole box,
 * hence `scope: 'pattern'`, and hence it appears only on the recipes that actually send to it.
 */
function reverbPreset(value: string): AuthoredEnumParam {
  return pick('REVERB PRESET', value, REVERB_PRESETS, 189, {
    hint: 'master-fx',
    note: 'one reverb for the whole box; every send lands in this preset',
    scope: 'pattern',
  })
}

/** The delay's character. p.195, and the same one-instance reasoning as `reverbPreset`. */
function delayPreset(value: string): AuthoredEnumParam {
  return pick('DELAY PRESET', value, DELAY_PRESETS, 189, {
    hint: 'master-fx',
    note: 'one delay for the whole box; every send lands in this preset',
    scope: 'pattern',
  })
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** An audio sample track will play whatever is loaded on it, so it declines no role. */
const SAMPLE_POOL_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture',
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
]

/**
 * MIDI / Synth tracks take synths and MIDI only — p.42 splits the sixteen tracks exactly, and p.201
 * states the toggle. A role here is what this box can *sound itself*: a MIDI track addresses another
 * device, and that device carries its own assignables, so counting external gear towards these roles
 * would count the same part twice.
 *
 * That subtracts exactly one role, and the same one it subtracts on the sibling. `vox-chop` is a
 * chopped vocal by definition and needs recorded audio, which this pool cannot hold. Everything else
 * is reachable from the six engines, the whole drum kit included, because PERC really is a drum
 * machine in a synth slot (pp.111-113).
 */
const SYNTH_POOL_ROLES: Role[] = SAMPLE_POOL_ROLES.filter((r) => r !== 'vox-chop')

// ---------------------------------------------------------------------------
// Synth recipes — slot 1: PERC
// ---------------------------------------------------------------------------

/**
 * Six recipes, one PERC patch, one synth slot. Each addresses its own part on its own note, and the
 * parts' parameter groups do not overlap, so all six can sound at once from a single loaded patch.
 * The note each part answers to is in `routing`, because a reader placing a step needs it and no
 * parameter carries it.
 */
const PERC_RECIPES: Recipe[] = [
  {
    id: 'pp-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track-synth',
    title: 'Sat-Sin kick, long modulated body, hard transient',
    routing: 'PERC on a synth slot — the Kick part answers to C4 (p.111)',
    params: [
      ...synthMode('PERC'),
      /**
       * p.115 is unusually forthcoming about the choice: "Classic8 vs Synced8 model - Synched8
       * resets the oscillator for each note, resulting in a predictable transient, but can click
       * when notes overlap. Classic, as in the TR-808, does not reset the oscillator, so the
       * transient can be slightly different each time." A hard kick wants the 808 behaviour, and a
       * four-on-the-floor pattern never overlaps its own notes, so the click risk does not apply.
       */
      pick('KICK · MODEL', 'Classic8', KICK_MODELS, 111, { hint: 'edit-patch' }),
      text('KICK · PITCH', 'C1', 'p.111 prints the span as C0-B8; C4 is the trigger note, not the tuning'),
      pick('KICK · BODY WAVE', 'Sat-Sin', BODY_WAVES, 111, {
        note: 'p.115: every wavetable starts at a sine at 0% and ends differently at 100%',
      }),
      num('KICK · BODY ATTACK', 0.4, MS_10, 111, { unit: 'ms', step: 0.1 }),
      secs('KICK · BODY DECAY', 0.42, SECONDS_10, 111, {
        mood: [{ axis: 'density', amount: -0.12 }],
      }),
      secs('KICK · MOD DECAY', 0.08, SECONDS_10, 111),
      num('KICK · MOD AMOUNT', 62, BIPOLAR, 111, {
        mood: [{ axis: 'grit', amount: 18 }],
        note: 'p.116: on Classic8 this modulates wavetable position, not pitch',
      }),
      /**
       * p.116 explains the sign, and the sign is the whole parameter: "the transient is an impulse
       * (for positive values of the parameter) or a short burst of noise (for negative values)".
       * Positive keeps the attack identical every hit, which is what `hard` is asking for.
       */
      num('KICK · TRANSIENT TIMBRE', 34, BIPOLAR, 111, { mood: [{ axis: 'grit', amount: 20 }] }),
      num('KICK · TRANSIENT LEVEL', 78, PCT, 111, { unit: '%' }),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { volume: 100 } },
      { slot: 'accent', set: { volume: 112 } },
    ],
    verified: false,
  },
  {
    id: 'pp-snare-bright',
    role: 'snare',
    character: 'bright',
    voice: 'track-synth',
    title: 'Classic9 snare, snap forward of the body',
    routing: 'PERC on a synth slot — the Snare part answers to D4 (p.112)',
    params: [
      ...synthMode('PERC'),
      pick('SNARE · MODEL', 'Classic9', SNARE_MODELS, 112, { hint: 'edit-patch' }),
      text('SNARE · PITCH', 'D3', 'p.112 prints the span as C0-B8; D4 is the trigger note'),
      num('SNARE · TONE', 62, PCT, 112, {
        unit: '%',
        note: 'p.116: sets the balance between the two body oscillators',
      }),
      pick('SNARE · BODY WAVE', 'Triangle', BODY_WAVES, 112),
      secs('SNARE · BODY DECAY', 0.18, SECONDS_10, 112, {
        mood: [{ axis: 'density', amount: -0.05 }],
      }),
      num('SNARE · SNAP ATTACK', 0.2, MS_10, 112, { unit: 'ms', step: 0.1 }),
      secs('SNARE · SNAP DECAY', 0.24, SECONDS_10, 112, {
        mood: [{ axis: 'density', amount: -0.07 }],
      }),
      num('SNARE · SNAP TIMBRE', 74, PCT, 112, {
        unit: '%',
        mood: [{ axis: 'darkness', amount: -22 }],
        note: 'p.116: the cutoff of the snap stage filters',
      }),
      num('SNARE · BODY/SNAP MIX', 30, BIPOLAR, 112),
      swing(),
    ],
    articulation: [
      { slot: 'backbeat', set: { volume: 100 } },
      { slot: 'fill', set: { 'repeat-grid': '4 Hits|1 Step' }, hint: 'pick-repeat' },
    ],
    verified: false,
  },
  {
    id: 'pp-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'track-synth',
    title: 'Six-oscillator hat, short, top end left open',
    routing: 'PERC on a synth slot — the Hi Hat part answers to E4-G4 (p.112)',
    params: [
      ...synthMode('PERC'),
      /** p.116: "Classic is based on 6 square oscillators, based on TR-808". */
      pick('HI HAT · MODEL', 'Classic', HAT_MODELS, 112, { hint: 'edit-patch' }),
      /**
       * **The one place in this file where the manual states a point.** p.116: "Timbre - sets
       * either relative tuning of the square oscillators or a preset configuration of the FM
       * algorithm. A value of 12 is a good starting point and is the best match of TR-808." That is
       * authority, not legality, so `verified` here is a citation rather than `false` — and it is
       * the reason this parameter reads `authored` in the audit while every neighbour reads
       * `provisional`.
       */
      num('HI HAT · TIMBRE', 12, TIMBRE_24, 112, {
        verified: cite(116),
        note: 'p.116 names 12 as the best match of the TR-808',
      }),
      secs('HI HAT · CLOSED DECAY', 0.09, SECONDS_10, 112, {
        mood: [{ axis: 'density', amount: -0.03 }],
      }),
      secs('HI HAT · OPEN DECAY', 0.6, SECONDS_10, 112),
      num('HI HAT · DECAY SHAPE', 40, PCT, 112, { unit: '%' }),
      num('HI HAT · HPF CUTOFF', 6800, HAT_HZ, 112, {
        unit: 'Hz',
        step: 10,
        mood: [{ axis: 'darkness', amount: -1800 }],
      }),
      num('HI HAT · LPF CUTOFF', 16000, HAT_HZ, 112, {
        unit: 'Hz',
        step: 10,
        mood: [{ axis: 'darkness', amount: -4200 }],
      }),
      num('HI HAT · TONE/NOISE MIX', -40, BIPOLAR, 112, {
        note: 'negative favours noise over the tuned oscillators',
      }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: 88 } },
      { slot: 'ghost', set: { volume: 62, chance: '70% Chance' } },
    ],
    verified: false,
  },
  {
    id: 'pp-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'track-synth',
    title: 'Long cymbal body, impact kept short over it',
    routing: 'PERC on a synth slot — the Cymbal part answers to A4 (p.113)',
    params: [
      ...synthMode('PERC'),
      pick('CYMBAL · MODEL', 'Classic', CYMBAL_MODELS, 113, { hint: 'edit-patch' }),
      /** The same p.116 sentence covers the Cymbal: it is headed "Hihat and Cymbal". */
      num('CYMBAL · TIMBRE', 12, TIMBRE_24, 113, {
        verified: cite(116),
        note: 'p.116 names 12 as the best match of the TR-808',
      }),
      num('CYMBAL · BODY FILTER', 4200, CYM_FILTER_HZ, 113, {
        unit: 'Hz',
        step: 10,
        mood: [{ axis: 'darkness', amount: -1400 }],
      }),
      num('CYMBAL · IMPACT FILTER', 7600, CYM_FILTER_HZ, 113, { unit: 'Hz', step: 10 }),
      secs('CYMBAL · BODY DECAY', 2.4, SECONDS_10, 113, {
        mood: [{ axis: 'density', amount: -0.6 }],
      }),
      secs('CYMBAL · IMPACT DECAY', 0.35, SECONDS_10, 113),
      num('CYMBAL · TONE PITCH', 520, CYM_TONE_HZ, 113, { unit: 'Hz', step: 5 }),
      num('CYMBAL · TONE/NOISE MIX', -30, BIPOLAR, 113),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: 82 } },
      { slot: 'accent', set: { volume: 96 } },
    ],
    verified: false,
  },
  {
    id: 'pp-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track-synth',
    title: 'Shaker, short and behind the beat',
    routing: 'PERC on a synth slot — the Percussion part answers to B4 (p.113)',
    params: [
      ...synthMode('PERC'),
      pick('PERCUSSION · MODEL', 'Shaker', PERC_MODELS, 113, { hint: 'edit-patch' }),
      num('PERCUSSION · VARIATION', 38, UNITLESS_100, 113, { mood: [{ axis: 'grit', amount: 16 }] }),
      num('PERCUSSION · TIMBRE', 56, UNITLESS_100, 113, {
        mood: [{ axis: 'darkness', amount: -18 }],
      }),
      secs('PERCUSSION · DECAY', 0.14, SECONDS_2, 113, {
        mood: [{ axis: 'density', amount: -0.04 }],
      }),
      swing(),
    ],
    /** `ghost` is the only slot any direction emits for `ghost-perc` (#108). */
    articulation: [{ slot: 'ghost', set: { volume: 54, micromove: 3 } }],
    verified: false,
  },
  {
    id: 'pp-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track-synth',
    title: 'Three detuned oscillators, pitch falling through the decay',
    routing: 'PERC on a synth slot — the Toms part answers to C0-B3 and C5 up (p.111)',
    params: [
      ...synthMode('PERC'),
      /** p.115: "Resonant is based on 3 detuned oscillators like the TR-909, with the same noise transient." */
      pick('TOM · MODEL', 'Resonant', TOM_MODELS, 111, { hint: 'edit-patch' }),
      pick('TOM · BODY WAVE', 'Sat-Sin', BODY_WAVES, 111),
      num('TOM · BODY ATTACK', 0.6, MS_10, 111, { unit: 'ms', step: 0.1 }),
      secs('TOM · BODY DECAY', 0.9, SECONDS_10, 111, {
        mood: [{ axis: 'density', amount: -0.24 }],
      }),
      secs('TOM · MOD DECAY', 0.2, SECONDS_10, 111),
      num('TOM · PITCH MOD', -320, PITCH_MOD, 111, {
        step: 10,
        mood: [{ axis: 'darkness', amount: -180 }],
      }),
      num('TOM · WAVE MOD', 24, BIPOLAR, 111),
      num('TOM · TRANSIENT TIMBRE', 60, TIMBRE_200, 111, {
        note: 'p.116: the cutoff of a low-pass on constant white noise, not a burst',
      }),
      num('TOM · TRANSIENT LEVEL', 44, PCT, 111, { unit: '%' }),
      swing(),
    ],
    articulation: [
      { slot: 'fill', set: { volume: 96 } },
      { slot: 'accent', set: { volume: 104 } },
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Synth recipes — slots 2 and 3
// ---------------------------------------------------------------------------

const SYNTH_RECIPES: Recipe[] = [
  /**
   * Slot 2. ACD is the engine this box has for exactly this: p.90 calls it "a recreation of iconic
   * single-oscillator monophonic analog synths ... Paying homage to Japanese legends", and its
   * filter list ends in `Low Pass RD3` (p.97) — the 303 model. Everything an acid line needs is a
   * printed parameter here, glide included.
   *
   * `patchPolyphony: 1` because p.90 says monophonic and means it; a one-voice patch is what the
   * engine is, not a restriction chosen here.
   */
  {
    id: 'pp-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'track-synth',
    title: 'Saw through the RD3 filter, envelope hard into resonance',
    routing:
      'ACD on a synth slot of its own — one of the three (p.94). **Slide:** `VOICE · GLIDE MODE Legato` with `GLIDE TIME 0.06 s` above — p.98\u2019s "Legato i.e. Envelopes are not triggered", the slide that does not re-attack. It is a voice setting rather than one of the five step lanes (p.60), so it acts wherever two notes overlap and the pattern\u2019s ties decide where that is',
    patchPolyphony: 1,
    params: [
      ...synthMode('ACD'),
      num('OSCILLATOR · SAW MIX', 100, PCT, 97, { unit: '%', hint: 'edit-patch' }),
      num('OSCILLATOR · SQUARE MIX', 0, PCT, 97, { unit: '%' }),
      num('OSCILLATOR · SUB MIX', 18, PCT, 97, { unit: '%' }),
      pick('FILTER · TYPE', 'Low Pass RD3', ACD_FILTERS, 97),
      num('FILTER · CUTOFF', 620, AUDIO_HZ, 97, {
        unit: 'Hz',
        step: 10,
        mood: [{ axis: 'darkness', amount: -260 }],
      }),
      num('FILTER · RESONANCE', 78, PCT, 97, { unit: '%', mood: [{ axis: 'grit', amount: 14 }] }),
      num('FILTER · ENV AMT', 64, BIPOLAR, 97, {
        unit: '%',
        mood: [{ axis: 'grit', amount: 18 }],
      }),
      num('FILTER · NOTE TRACK', 100, NOTE_TRACK, 97, { unit: '%' }),
      secs('AMPLIFIER · ATTACK', 0, SECONDS_10, 97),
      secs('AMPLIFIER · DECAY', 0.22, SECONDS_10, 97, {
        mood: [{ axis: 'density', amount: -0.06 }],
      }),
      num('AMPLIFIER · SUSTAIN', 0, PCT, 97, { unit: '%' }),
      secs('AMPLIFIER · RELEASE', 0.08, SECONDS_10, 97),
      secs('MODULATION · DECAY', 0.18, SECONDS_10, 98),
      /** p.98: "Legato i.e. Envelopes are not triggered" — the slide that does not re-attack. */
      pick('VOICE · GLIDE MODE', 'Legato', GLIDE_MODES, 98),
      secs('VOICE · GLIDE TIME', 0.06, SECONDS_3, 98),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: 92 } },
      { slot: 'accent', set: { volume: 110 } },
    ],
    verified: false,
  },
  /**
   * Slot 3. p.90: WTFM is "a unique 2-operator FM synth engine that utilized wavetable based
   * oscillators driven by a 3x feedback system ... crafting cutting-edge metallic tones". A
   * seven-to-one operator ratio with feedback on the modulator is the inharmonic end of that, and
   * the band-pass keeps it a texture rather than a lead.
   */
  {
    id: 'pp-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'track-synth',
    title: '7:1 FM with feedback, band-passed to a struck-metal ring',
    routing: 'WTFM on a synth slot of its own — one of the three (p.94)',
    params: [
      ...synthMode('WTFM'),
      num('OSCILLATOR · FM', 340, FM_PCT, 107, {
        unit: '%',
        step: 10,
        hint: 'edit-patch',
        mood: [{ axis: 'grit', amount: 160 }],
      }),
      num('OSCILLATOR · RATIO 1', 1, FM_RATIO, 107, { step: 0.25 }),
      num('OSCILLATOR · RATIO 2', 7, FM_RATIO, 107, { step: 0.25 }),
      num('OSCILLATOR · SHAPE 1', 42, UNITLESS_100, 107, {
        mood: [{ axis: 'darkness', amount: -14 }],
      }),
      num('OSCILLATOR · SHAPE 2', 68, UNITLESS_100, 107),
      pick('OSCILLATOR · CHARACTER 2', 'Add 7', WTFM_CHARACTERS, 107),
      num('OSCILLATOR · FEEDBACK 2', 26, PCT, 107, {
        unit: '%',
        mood: [{ axis: 'grit', amount: 22 }],
      }),
      pick('FILTER · TYPE', 'Band Pass SVF 12dB', WTFM_FILTERS, 107),
      num('FILTER · CUTOFF', 3200, AUDIO_HZ, 107, {
        unit: 'Hz',
        step: 10,
        mood: [{ axis: 'darkness', amount: -1100 }],
      }),
      num('FILTER · RESONANCE', 34, PCT, 107, { unit: '%' }),
      secs('AMPLIFIER ENV · ATTACK', 0, SECONDS_10, 108),
      secs('AMPLIFIER ENV · DECAY', 0.9, SECONDS_10, 108, {
        mood: [{ axis: 'density', amount: -0.22 }],
      }),
      num('AMPLIFIER ENV · SUSTAIN', 0, PCT, 108, { unit: '%' }),
      secs('AMPLIFIER ENV · RELEASE', 1.2, SECONDS_10, 108),
      num('VOICE · VOLUME', 120, VOICE_VOL, 110, { unit: '%' }),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { volume: 104 } },
      { slot: 'offbeat', set: { volume: 84, micromove: -2 } },
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Sample recipes
// ---------------------------------------------------------------------------

/**
 * Every one of these is an audio sample track, so every knob below is on its audio-mode scale and
 * `TRACK MODE` says so first. p.86's pack checklist is the reason `sourceAudio` can be as specific
 * as it is: the box wants "0 dB Sample volume level" and "C Note pitch tuning of melodic samples",
 * and it is those conventions a reader is matching when they pick a file.
 */
const SAMPLE_RECIPES: Recipe[] = [
  {
    id: 'pp-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track-sample',
    title: 'Wide clap, high-passed and pushed off centre',
    sourceAudio: {
      need: 'A stereo hand-clap one-shot — several hands, not one; its own width is what gets panned',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'High Pass', FILTER_MODES, 66, {
        note: 'centre is No Filter; the knob high-passes clockwise and low-passes anticlockwise',
      }),
      num('FILTER CUTOFF', 18, DJ_FILTER, 188, {
        mood: [{ axis: 'darkness', amount: -8 }],
      }),
      num('RESONANCE', 12, PCT, 66, { unit: '%' }),
      num('PANNING', 8, PAN, 65),
      num('SAMPLE ATTACK', 0, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 22, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -6 }] }),
      num('REVERB SEND', 24, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 26 }] }),
      reverbPreset('Stereo Drums'),
      swing(),
    ],
    articulation: [{ slot: 'backbeat', set: { volume: 0, panning: 8 } }],
    verified: false,
  },
  {
    id: 'pp-open-hat-bright',
    role: 'open-hat',
    character: 'bright',
    voice: 'track-sample',
    title: 'Open hat left to ring, tuned up a touch',
    /**
     * The sample half of the hat pair. See the header: `closed-hat` is PERC, and putting the open
     * hat there too would have both recipes setting one Hi Hat group's Model, Timbre and filters.
     * A sample track has no such contention, and p.86 requires a `HiHat` folder in every pack.
     */
    sourceAudio: {
      need: 'An open hi-hat one-shot with the tail intact, not gated — the ring is the part that matters',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'High Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 26, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -12 }] }),
      num('MICROTUNE', 20, CENTS, 64, { unit: 'c' }),
      num('SAMPLE ATTACK', 0, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 48, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -14 }] }),
      num('DELAY SEND', 14, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 20 }] }),
      delayPreset('Stereoroom'),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: -3 } },
      { slot: 'accent', set: { volume: 2 } },
    ],
    verified: false,
  },
  {
    id: 'pp-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track-sample',
    title: 'Dry click off centre, nothing on the tail',
    sourceAudio: {
      need: 'A short dry rimshot or stick click under 120 ms, no room on it',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'High Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 12, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -6 }] }),
      num('PANNING', -14, PAN, 65),
      num('SAMPLE DECAY', 8, PCT, 69, { unit: '%', step: 0.1 }),
      num('REVERB SEND', 6, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 14 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'ghost', set: { volume: -9 } },
      { slot: 'offbeat', set: { volume: -4, micromove: 2 } },
    ],
    verified: false,
  },
  {
    id: 'pp-bass-mid-dark',
    role: 'bass-mid',
    character: 'dark',
    voice: 'track-sample',
    title: 'Sampled bass note, filter closed, a little drive under it',
    /**
     * `prep` is real here rather than invented: p.86's checklist makes the tuning convention an
     * "Absolute" requirement — "C Note pitch tuning of melodic samples. Note parameter assumes
     * original pitch of samples is C4" — so a bass sampled at any other pitch will play the wrong
     * note from every step. p.150 is why the folder is findable at all.
     */
    sourceAudio: {
      need: 'A sustained electric or synth bass note with no movement in it — one steady pitch',
      prep: {
        text: 'Tune the sample to C4 before loading; the Note parameter reckons from C4. Every factory pack but Intellectual and Slam Modeling carries a Bass folder.',
        verified: cite(86),
      },
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 44, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -16 }] }),
      num('RESONANCE', 18, PCT, 66, { unit: '%' }),
      num('MICROTUNE', -8, CENTS, 64, { unit: 'c' }),
      num('SAMPLE ATTACK', 1.5, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 34, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -8 }] }),
      num('OVERDRIVE', 12, PCT, 71, { unit: '%', mood: [{ axis: 'grit', amount: 24 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { volume: 0 } },
      { slot: 'offbeat', set: { volume: -4 } },
    ],
    verified: false,
  },
  {
    id: 'pp-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track-sample',
    title: 'Sub tone under everything, filter well down, full bit depth',
    sourceAudio: {
      need: 'A clean sine or near-sine sub one-shot with no harmonics above the fundamental',
      prep: {
        text: 'Tune the sample to C4 before loading; the Note parameter reckons from C4.',
        verified: cite(86),
      },
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 28, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -10 }] }),
      num('MICROTUNE', -12, CENTS, 64, { unit: 'c' }),
      num('SAMPLE ATTACK', 0.4, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 46, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -10 }] }),
      /** p.71: "Default is 16 bits which is the normal sample state." Held there on purpose. */
      num('BIT DEPTH', 16, BITS, 71, {
        unit: 'Bits',
        note: '16 is the unreduced state; a sub is the last thing to crush',
      }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { volume: 0 } }],
    verified: false,
  },
  {
    id: 'pp-vox-chop-dirty',
    role: 'vox-chop',
    character: 'dirty',
    voice: 'track-sample',
    title: 'Vocal chopped across the row, crushed and repeated',
    /**
     * p.68 documents the gesture rather than merely permitting it: "The sample start and end are
     * useful in chopping sample slices across pads on the sequencer grid." Sample Start and End
     * themselves take no authored value here because p.68 will not give them one — "Depends on
     * sample duration" is the whole of their printed range.
     */
    sourceAudio: {
      need: 'A vocal phrase two to four bars long with clear syllable edges — a held note has nothing to cut on',
      prep: {
        text: 'Move Sample Start and Sample End per step to place a different slice on each pad of the row.',
        verified: cite(68),
      },
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      num('BIT DEPTH', 8, BITS, 71, { unit: 'Bits', mood: [{ axis: 'grit', amount: -3 }] }),
      num('OVERDRIVE', 36, PCT, 71, { unit: '%', mood: [{ axis: 'grit', amount: 30 }] }),
      pick('FILTER', 'High Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 10, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -5 }] }),
      num('DELAY SEND', 22, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 24 }] }),
      delayPreset('Degradah'),
      pick('REPEAT TYPE', 'Glitter', REPEAT_TYPES, 72, { hint: 'pick-repeat' }),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { volume: 0 } },
      { slot: 'accent', set: { 'repeat-grid': '8 Hits|4 Steps' }, hint: 'pick-repeat' },
    ],
    verified: false,
  },
  {
    id: 'pp-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track-sample',
    title: 'One pitched sample carrying the line, filter open and a synced delay behind it',
    /**
     * §345. **The one of the three unauthored tonal roles that the polyphony argument does not
     * exclude**, and it is a sample track rather than a synth slot, so the three-patch budget the
     * module note spends on PERC, ACD and WTFM is not what decides it. See that note for `pad` and
     * `stab`, which are excluded and stay so.
     *
     * `major-key-electro` and `relay` both ask `lead` at **polyphony 1**, which is what this pool
     * sounds (p.141). A lead is one note at a time by definition, so the sample pool is not a
     * compromise here the way it would be for a chord — it is the right pool.
     *
     * **What it is not: `pp-arp-bright` with a different id.** That recipe is a pitched sample too,
     * and everything it does is the step repeat — p.72's `Arp Up`, *"the arp will repeat by
     * changing notes"*. This one sets no repeat at all. Its notes come from the direction's hook
     * (#100), which both of the two that ask for a lead carry, so the line is written rather than
     * generated and the box's job is to make one sample sing across it.
     *
     * **No glide, and it is the pool rather than an omission.** `pp-acid-dirty` slides with
     * `VOICE · GLIDE MODE` (p.98) — a synth voice setting, on a synth patch. p.60's five step
     * lanes carry no portamento and no sample-track page prints one, so a sampled line on this box
     * changes pitch in steps. Saying so is invariant 5; authoring a glide from the synth page
     * would be reading a value off the wrong instrument.
     */
    sourceAudio: {
      need: 'A single sustained tone with a definite pitch — a bowed note, a held saw, a struck ' +
        'bell that rings — long enough to hold the longest note in the line',
      prep: {
        text: 'Tune the sample to C4 before loading; the Note parameter reckons from C4.',
        verified: cite(86),
      },
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      /*
       * p.66 makes this one DJ-style knob rather than a cutoff: *"Range is 100-0 anticlockwise -
       * low pass filtering. Turning clockwise 0-100 high pass filtering. Centre position applies
       * 'No Filter'."* So the number only means anything with `FILTER` beside it, which is why
       * the pair travels together on every recipe here.
       */
      num('FILTER CUTOFF', 84, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -26 }] }),
      num('RESONANCE', 26, PCT, 66, { unit: '%', mood: [{ axis: 'grit', amount: 12 }] }),
      num('MICROTUNE', 6, CENTS, 64, {
        unit: 'c',
        note: 'A few cents sharp, so the line sits above a pad rather than beating with it',
      }),
      num('SAMPLE ATTACK', 3, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 58, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -14 }] }),
      num('OVERDRIVE', 22, PCT, 71, { unit: '%', mood: [{ axis: 'grit', amount: 26 }] }),
      num('PANNING', 0, PAN, 65),
      num('DELAY SEND', 30, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 24 }] }),
      delayPreset('Cleanio'),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { volume: 0 } },
      { slot: 'accent', set: { volume: 3 } },
      { slot: 'offbeat', set: { volume: -6 } },
    ],
    verified: false,
  },
  {
    id: 'pp-arp-bright',
    role: 'arp',
    character: 'bright',
    voice: 'track-sample',
    title: 'One pitched sample arpeggiated by the step repeat',
    /**
     * The arp is the step repeat, not a separate mode. p.72 lists `Arp Up` and `Arp Down` among the
     * repeat types and says what makes them different from the rest: "Some options are based on
     * tuning. For example the arp will repeat by changing notes." So a single pitched sample and a
     * repeat grid are the whole mechanism, and both are cited.
     */
    sourceAudio: {
      need: 'A short plucked or bell-like one-shot with a definite pitch — the repeat retunes it',
      prep: {
        text: 'Tune the sample to C4 before loading; the Note parameter reckons from C4.',
        verified: cite(86),
      },
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('REPEAT TYPE', 'Arp Up', REPEAT_TYPES, 72, {
        hint: 'pick-repeat',
        note: 'p.72: the arp repeats by changing notes, unlike the other types',
      }),
      pick('REPEAT GRID', '4 Hits|1 Step', REPEAT_GRIDS, 72, {
        note: 'p.72: repeated notes are filtered to the selected scale when Scale Filter is on',
      }),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 78, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -22 }] }),
      num('SAMPLE DECAY', 26, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -7 }] }),
      num('DELAY SEND', 18, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 22 }] }),
      delayPreset('Cleanio'),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: -5 } },
      { slot: 'downbeat', set: { volume: 0 } },
    ],
    verified: false,
  },
  {
    id: 'pp-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track-sample',
    title: 'Slow fade in, wet, sat off to one side',
    sourceAudio: {
      need: 'A sustained atmospheric recording several seconds long — field noise, tape hiss, a held chord',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 52, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -18 }] }),
      num('SAMPLE ATTACK', 24, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 62, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -12 }] }),
      num('PANNING', -20, PAN, 65),
      num('REVERB SEND', 62, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 30 }] }),
      reverbPreset('Transparent Hall'),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { volume: -8 } }],
    verified: false,
  },
  {
    id: 'pp-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'track-sample',
    title: 'Noise burst crushed to five bits and driven',
    sourceAudio: {
      need: 'A noise or static burst under a second — white, vinyl crackle, or a blown-out cymbal',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      num('BIT DEPTH', 5, BITS, 71, { unit: 'Bits', mood: [{ axis: 'grit', amount: -1 }] }),
      num('OVERDRIVE', 58, PCT, 71, { unit: '%', mood: [{ axis: 'grit', amount: 30 }] }),
      pick('FILTER', 'High Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 34, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -14 }] }),
      num('SAMPLE DECAY', 30, PCT, 69, { unit: '%', step: 0.1, mood: [{ axis: 'density', amount: -8 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { volume: -3 } },
      { slot: 'accent', set: { volume: -10, chance: '50% Chance' } },
    ],
    verified: false,
  },
  {
    id: 'pp-sweep-dark',
    role: 'sweep',
    character: 'dark',
    voice: 'track-sample',
    title: 'Resonant filter closing over a long wash',
    sourceAudio: {
      need: 'A long noise or pad wash, four bars or more, with no transient at the front',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 36, DJ_FILTER, 188, {
        mood: [{ axis: 'darkness', amount: -20 }],
        note: 'p.66: the filter can be set per step, so this is where the sweep is drawn',
      }),
      num('RESONANCE', 62, PCT, 66, { unit: '%', mood: [{ axis: 'grit', amount: 16 }] }),
      num('SAMPLE ATTACK', 42, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 70, PCT, 69, { unit: '%', step: 0.1 }),
      num('REVERB SEND', 48, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 28 }] }),
      reverbPreset('Space'),
      swing(),
    ],
    articulation: [
      { slot: 'first-hit', set: { volume: -10 } },
      { slot: 'last-hit', set: { volume: -2 } },
    ],
    verified: false,
  },
  {
    id: 'pp-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'track-sample',
    title: 'Rising repeat tightening into the bar line',
    /**
     * `Raise` is the repeat type doing the work, and it is a printed option rather than a
     * description of one (p.72). The grid is the densest eight-step figure on the page, so the
     * ratchet accelerates across the run-up rather than ticking evenly.
     */
    sourceAudio: {
      need: 'A rising noise sweep or reverse cymbal one to two bars long',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      pick('REPEAT TYPE', 'Raise', REPEAT_TYPES, 72, { hint: 'pick-repeat' }),
      pick('REPEAT GRID', '16 Hits|8 Steps', REPEAT_GRIDS, 72),
      pick('FILTER', 'High Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 20, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -9 }] }),
      num('SAMPLE ATTACK', 66, PCT, 69, { unit: '%', step: 0.1 }),
      num('DELAY SEND', 34, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 26 }] }),
      delayPreset('Rabbithole'),
      swing(),
    ],
    articulation: [{ slot: 'last-hit', set: { volume: 2 } }],
    verified: false,
  },
  {
    id: 'pp-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'track-sample',
    title: 'Downbeat hit, driven, with the tail left long',
    sourceAudio: {
      need: 'A low boom or reverse-tailed hit with weight under 100 Hz and a tail of a bar or so',
      hint: 'pick-sample',
    },
    params: [
      audioMode(),
      num('OVERDRIVE', 44, PCT, 71, { unit: '%', mood: [{ axis: 'grit', amount: 28 }] }),
      pick('FILTER', 'Low-Pass', FILTER_MODES, 66),
      num('FILTER CUTOFF', 62, DJ_FILTER, 188, { mood: [{ axis: 'darkness', amount: -20 }] }),
      num('SAMPLE ATTACK', 0, PCT, 69, { unit: '%', step: 0.1 }),
      num('SAMPLE DECAY', 74, PCT, 69, { unit: '%', step: 0.1 }),
      num('REVERB SEND', 40, PCT, 70, { unit: '%', mood: [{ axis: 'space', amount: 26 }] }),
      reverbPreset('Big Room'),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { volume: 3 } }],
    verified: false,
  },
]

// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'polyend-play-plus',
  name: 'Play+',
  maker: 'Polyend',
  kind: 'groovebox',

  /**
   * Both directions, both transports, and the manual states each as its own menu setting rather
   * than leaving one to be assumed from the other (p.205):
   *
   *  - `Clock In` — "Sets the Play+ clock input for internal generated clock (default) or an
   *    external clock received through the USB Input or MIDI In jack."
   *  - `Clock Out` — "Sends the Play+ clock output to other devices. Off, USB, MIDI Out jack or
   *    USB+MIDI jack options."
   *
   * p.204 adds the two behaviours a reader is likely to meet before they meet the menu: "When Play+
   * sends MIDI clock it will continue to do so even if the sequencer is stopped", and it "will issue
   * a warning message if the external MIDI clock assigned from the primary device is lost".
   *
   * `midi-din` is declared because the supplied Type B adapter is what the 3.5mm jack is for; the
   * TRS detail lives on the jacks below.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],

    /**
     * §7.4/#80. **`preferredSource: true`, on a role sentence rather than on the jack.** Everything
     * above this line is capability: the box has a MIDI Out and a clock can be routed out of it.
     * §7.4 asks whether driving a rig is this box's *job*, and p.207 answers it in a heading —
     * "Example Configuration 1: Play+ as the primary lead connected to Elektron Digitakt", drawn
     * with `Clock In: Internal`, `Clock out: MIDI Out jack`, and the caption "Transport control e.g.
     * Play, Stop and Clock is dictated by Play and its current Tempo. Digitakt will follow the lead
     * of Play+ as will other devices."
     *
     * The claim is "this box can lead", never "this box leads over that one": the same chapter
     * draws Play+ following an external clock on p.208 and p.209, and prints the leading case first.
     */
    preferredSource: true,

    /**
     * §7.4/#104. Clock output is a menu here, and a rig phase naming this box as the clock source
     * is an instruction nothing downstream can obey until it is set.
     *
     * Two entries because the menu takes a different value for each transport, and printing `USB` at
     * somebody holding a MIDI cable is worse than printing nothing. The strings are p.205's own —
     * `MIDI Out jack`, not "the MIDI jack" — because §8 is read at the machine and that is what is
     * on the screen.
     *
     * `Transport Out` sits beside `Clock Out` on the same page with the same four options and is
     * not authored here: a clock without transport leaves a follower running but never started, so
     * it is named in the note rather than left to be discovered. The matching `Clock In` row is also
     * not authored, for the reason `sourceSetup` is named for the half it covers.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Menu > MIDI > Clock Out',
        value: 'MIDI Out jack',
        note: 'Off, USB, MIDI Out jack, USB+MIDI jack — set Transport Out the same way for Play/Stop',
      },
      {
        transport: 'usb',
        path: 'Menu > MIDI > Clock Out',
        value: 'USB',
        note: 'Off, USB, MIDI Out jack, USB+MIDI jack — set Transport Out the same way for Play/Stop',
      },
    ],
  },

  /**
   * One stereo output on a 3.5mm jack, doubling as the headphone out, with a supplied breakout to
   * two 6.3mm mono (p.15). No individual outs on the panel — there is one audio socket on the box.
   *
   * `usbAudio` is true and is **output only**, which is worth stating because the field cannot.
   * p.230: "Play+ can send audio out over a connected USB connection. This will send 28 channels of
   * mono audio or 14 stereo channels out to the connected device", and the table there is one stereo
   * pair per audio track plus the synth tracks, the delay and the reverb. There is no USB audio
   * input, and no audio input of any kind — see `capabilityEvidence`.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true },

  /**
   * §10/#103. Two 3.5mm MIDI sockets and nothing else that carries a clock.
   *
   * p.15's hardware overview dimensions the rear edge and names every hole on it: `Out`, `MIDI Out`,
   * `MIDI In`, `Micro SD`, `USB`, `Power`, plus a recessed reset. Not one of them says `CLK`, so the
   * MIDI pair is what carries `midi-din` and what the rack labels.
   *
   * `usb` is not declared as a jack, and the omission is the honest one: the USB-C socket is the
   * power inlet as well as the data port ("the USB connection is also the source of power for
   * Play+", p.208), MIDI and audio over it are settings rather than a second pair of holes, and one
   * socket carrying both directions is a shape `JackSpec.direction` cannot state. A rig that
   * resolves onto USB draws its sockets unlabelled.
   *
   * `Out` is on the panel and is not declared, because nothing names it: `io` already carries the
   * audio path and §3.3's list is for jacks something references.
   */
  jacks: [
    {
      id: 'MIDI Out',
      direction: 'out',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      // Type B is the uncommon one, and a reader reaching for a Type A cable gets silence with
      // nothing on screen to explain it. p.15's callout: "3.5mm Jack to 5 Pin MIDI adapter (type B)
      // supplied", restated at p.202: "Play+ uses a Type B, TRS to MIDI Adapter."
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.15, p.202)',
    },
    {
      id: 'MIDI In',
      direction: 'in',
      signal: ['clock', 'midi'],
      clock: ['midi-din'],
      note: '3.5mm TRS — use the supplied Type B adapter for 5-pin MIDI (p.15, p.202)',
    },
  ],

  /**
   * §2.6/#111. **The box ships a library, and no document lists it.**
   *
   * p.13: "Over 5000 stereo and mono samples are provided to get started but you can add your own
   * using the supplied microSD card." p.87's card-structure drawing puts the number of packs at 22 —
   * it draws `/Dirty Click Pack` and labels the branch below it "Other 21 Sample Packs" — and p.86
   * fixes where they live, in a `Sample Packs` folder on the card.
   *
   * `shipped-library` rather than `enumerable`, and the distinction is doing real work here. Packs
   * *are* named in three places, and none of them is a list: p.79's screen shot shows six with a
   * scrollbar cutting it off, p.148's table gives eleven but exists to say which packs carry a synth
   * folder rather than to enumerate the library, and p.87 deconstructs one. Sixteen distinct names
   * against a stated twenty-two, and no page prints the contents of any pack. So a recipe cannot
   * reference an entry the way a TR-1000 recipe references a generator, and the twelve sample
   * recipes above each say what they need in prose instead.
   *
   * Two adjacent claims deliberately not made here. Factory **patches** exist — p.94 draws
   * `/Patches` with one folder per engine — but exactly one patch name is printed in the whole
   * document (`DawgHouse`, in a screen mock on p.91), so there is nothing to enumerate and nothing
   * to point a reader at. And an `Artist Samples` folder exists (p.33, p.80) with no artist named
   * anywhere.
   */
  content: {
    kind: 'shipped-library',
    library: 'over 5000 samples across 22 factory sample packs',
    location: 'the Sample Packs folder on the supplied 16GB microSD card',
    reason: 'p.13 and p.87 give the counts; no page lists a pack, and only 16 of 22 are ever named',
  },

  /**
   * §2.6/#142. **This box holds two answers and the field can only carry one, so it carries
   * neither — and says exactly that at `capabilityEvidence.noteDuration`.**
   *
   * On an audio sample track a step carries no length. What it carries is a sample and the trim
   * on it: p.68's Sample Start and Sample End are "in ms with respect to the full sample
   * duration", and Sample Attack and Decay (p.69) shape the fade at either end as a percentage
   * "as sample duration varies". Nothing there is a note length and there is nothing to enter, so
   * that pool is `trigger` and the reason would be the sample's own length.
   *
   * On a MIDI / Synth track the Panning knob is reassigned: "Panning switches to MIDI Note Length
   * applied with respect to step length" (p.65), printed in the parameter table as "Length of MIDI
   * Note, 1 Step at global tempo" and measured in steps (p.211). That is a `per-note-value` with
   * its control named, and it is right for the eight synth recipes here and wrong for the twelve
   * sample ones.
   *
   * **Declaring either one would be a device-level claim no page supports device-wide**, and #142
   * makes the field a positive claim requiring a citation precisely so that cannot happen quietly:
   * `DeviceSchema` refuses a declaration whose evidence is not a `Cite`, so a half-true
   * declaration cannot be softened with `partly` and kept. The choice is the claim or the reasoned
   * non-claim, and on a box where the claim is false for two fifths of its recipes the non-claim
   * is the honest one.
   *
   * Nothing true is lost by it. `noteDurationNotice` carries the evidence through to the reader
   * alongside the unknown state, so the `proven` half below — the sample-track answer, with its
   * pages — still reaches the guide; it reaches it as prose rather than as a structured claim the
   * Hook phase would apply to all sixteen tracks.
   *
   * The repair is the per-voice override `NoteDuration`'s own doc-comment names for the day a box
   * genuinely holds two answers at once, recording that no manifest here does. This one does. That
   * is an engine change and not a device folder's to make (invariant 2), so it is written down.
   */

  capabilityEvidence: {
    'clock.canSendClock': cite(205),
    'clock.canReceiveClock': cite(205),
    'clock.transport': cite(205),
    /** The role sentence and the drawn topology, not the menu that carries the clock out. */
    'clock.preferredSource': cite(207),

    [jackFact('MIDI Out')]: cite(15),
    [jackFact('MIDI In')]: cite(15),
    [clockSourceSetupFact('midi-din')]: cite(205),
    [clockSourceSetupFact('usb')]: cite(205),

    'io.main': cite(15),
    'io.individualOuts': cite(15),
    /**
     * `cited-against`, and this is the state for it: a page was read and it answers no. p.15's
     * hardware overview dimensions the rear edge and names every socket on it — `Out`, `MIDI Out`,
     * `MIDI In`, `Micro SD`, `USB`, `Power` — and there is no input among them. p.230 closes the
     * other door: USB audio is described only as "Play+ can send audio out", with a table of
     * fourteen output pairs and no input.
     */
    'io.audioIn': {
      kind: 'cited-against',
      cite: cite(15),
      reason: 'p.15 names every socket on the rear edge and none of them is an audio input',
    },
    'io.usbAudio': cite(230),

    /**
     * **`partly`, because the pool model cannot hold the synth side's shared budget.**
     *
     * p.42 establishes the split and p.141 the sample pool's monophony, and both halves of
     * `track-sample` are fully cited by them. `track-synth` is where a plain citation would
     * overclaim: `VoiceSpec.polyphony` is per pool *member*, so `polyphony: 8` on a pool of eight
     * reads as sixty-four simultaneous notes, and this box has eight.
     */
    'voices': {
      kind: 'partly',
      cite: cite(42),
      proven:
        'the track split and the sample pool entirely — p.42 gives "Play+ has 16 tracks, 8 for MIDI / Synths and 8 sample tracks", and p.141 gives the audio side one note per track ("One track will allow one note, Two tracks for 2 notes and so forth"), corroborated by p.77\'s "Play+ operates with 8 voices to cover the 8 audio tracks"',
      open:
        'the synth pool\'s polyphony, where 8 is a ceiling and not an allocation. p.91: "Up to 8 voices of polyphony are available in total in Play+ across all synths. The 8 voices are divided and allocated per synth, for example Synth 1 = 3, Synth 2 = 3, Synth 3 = 2." That is one budget shared across three slots, and `VoiceSpec.polyphony` is per pool member with no way to say "shared" — so the declared 8 is the most one synth track can reach with the others idle, never what eight of them hold at once. The same gap swallows the slot count: eight pool members map onto three patches (p.94), which the pool cannot state either',
    },
    'features.perStep': cite(60),
    /**
     * Real and well documented. p.197: "any track can be used as a sound source for sidechaining
     * the limiter". p.189 lists eight `Sidechain Track 1`-`Sidechain Track 8` limiter presets, p.191
     * gives the custom parameters `Sidechain On/Off` and `Sidechain Channel Track 1 - Track 8`, and
     * p.199 walks the procedure with the ducking amount on the Limiter knob.
     */
    'features.sidechain.internal': cite(197),
    /**
     * The negative follows from the same absence as `io.audioIn` and is cited to the same drawing:
     * a sidechain from external audio needs external audio to arrive, and no socket on this box
     * admits any. p.197 scopes the feature to "any track", which is to say any of its own.
     */
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      cite: cite(197),
      reason: 'p.197 scopes the sidechain source to a Play+ track, and p.15 shows no audio input to key from',
    },
    /**
     * `unknown`, and the reading is finished rather than abandoned. Every engine's table was read
     * (pp.97-110) and each carries a modulation section — Frequency `0.1 to 100Hz`, a six-shape
     * Waveform and a three-state Retrigger — so LFOs plainly exist. What `LfoSpec` asks for is not
     * there:
     *
     *  - `count` is not a property of the box. ACD, FAT and DIRT carry one modulation section; VAP
     *    and WTFM carry `LFO 1` and `LFO 2`. How many are running is a property of which engine is
     *    loaded into which of the three slots, which is a property of the patch somebody built.
     *  - `syncable` has no answer the document will support. VAP and WTFM print an `LFO 1 Sync`
     *    row, and its Description column reads "When set to On, Oscillator 2 resets on each cycle of
     *    Oscillator 1 (Osc 1 controls pitch)" — the oscillator Sync row's text, copied onto the LFO
     *    (pp.102, 108). What LFO sync does here is therefore not stated anywhere, and `false` would
     *    be a claim and `true` a guess.
     *  - `destinations` differ per engine and are a mod matrix on two of them (pp.103, 109).
     *
     * Nothing reads `features.lfo` today, so the field stays off rather than being filled with the
     * one engine's answer that happens to fit the shape.
     */
    'features.lfo': {
      kind: 'unknown',
      reason:
        'pp.97-110 give every engine a modulation section but no per-box LFO count, and the LFO Sync rows on pp.102 and 108 print the oscillator Sync description instead of their own',
    },

    content: cite(87),
    /**
     * **`partly`, and this is the two-answer problem put where the audit can see it.**
     *
     * p.68 proves the declared `trigger` for the sample pool and proves nothing about the other
     * eight tracks, where the same knob carries a real note length.
     */
    noteDuration: {
      kind: 'partly',
      cite: cite(68),
      proven:
        'the audio sample tracks, where a step carries no length at all — p.68 gives Sample Start and Sample End as positions "in ms with respect to the full sample duration", and p.69 gives Attack and Decay as percentages of that duration, so what ends the note is the sample',
      open:
        'the MIDI / Synth tracks, which do carry one. p.65: "Panning switches to MIDI Note Length applied with respect to step length", printed in the parameter table on p.211 as "Length of MIDI Note, 1 Step at global tempo" and measured in steps. That is a `per-note-value` with its control named, so the declared `trigger` is true of one pool and not of the other. The repair is the per-voice override this field\'s own doc-comment names for a box holding two answers at once, which is an engine change rather than a device folder\'s to make',
    },
  },

  /**
   * §10. 282 mm, measured off the dimensioned plan view in 1.2 Hardware Overview (p.15) — the same
   * figure `panel.ts` measures every control against, and the aspect check that confirms it is
   * documented there.
   *
   * The Play+ is landscape, so unlike its portrait sibling there is no orientation trap: the maker's
   * width and the span of the panel as played are the same edge. The third number on that page,
   * 35 mm, is the depth dimensioned on the rear-panel elevation directly above the plan view, and
   * the aspect is what rejects it.
   */
  physical: {
    panelSpanMm: 282,
    verified: { kind: 'manual', source: 'Polyend Play+ Manual Rev 2, p.15 (Hardware Overview)' },
  },

  /** §10. A simplified original drawing of the panel, read off the manual (see `panel.ts`). */
  panel: PLAY_PLUS_PANEL,

  /**
   * p.42, and the pools are disjoint: "Play+ has 16 tracks, 8 for MIDI / Synths and 8 sample
   * tracks". The grid shows one bank of eight at a time and `[Shift] + [Audio/MIDI]` swaps which
   * (p.92).
   *
   * **`track-sample` is monophonic, and the manual says so in the plainest terms it uses anywhere.**
   * p.141, on building a chord across the grid: "Each voice in the audio model is represented by a
   * track. Each note requires one voice. One track will allow one note, Two tracks for 2 notes and
   * so forth." p.77 agrees from the other side — "Play+ operates with 8 voices to cover the 8 audio
   * tracks". A chord on this pool is several tracks, which is what §12.4 counts.
   *
   * **`track-synth` is polyphonic, and 8 is a ceiling rather than an allowance.** p.13 calls them
   * "8 Polyphonic MIDI / Synth tracks" and p.212 states it directly. The number comes from p.91:
   * "Up to 8 voices of polyphony are available in total in Play+ across all synths. The 8 voices are
   * divided and allocated per synth, for example Synth 1 = 3, Synth 2 = 3, Synth 3 = 2." So eight is
   * a state the box can genuinely hold — one synth, every voice — and the manual's own example
   * spends them 3/3/2. A patch that needs its own share says so: the ACD recipe declares
   * `patchPolyphony: 1` because p.90 calls that engine monophonic.
   *
   * **No `triggerNote` on either pool** (§2.1/#334), declined separately because the two pools
   * fail differently. On `track-sample` the fact exists and half of it is missing: p.64 states
   * *"Play+ assumes the note 'C4' as the default for the sample"*, and no page in the 254 anchors
   * `C4` to a number, so the required `midi` would have to be invented — and p.226's `Middle C
   * C-5` belongs to the *connected Tracker's* `Config > MIDI`, not to this box. On `track-synth`
   * there is no single note to have: PERC gives each part its own address (Kick `C4`, Snare `D4`,
   * Hi Hat `E4-G4`, Cymbal `A4`, Percussion `B4`, Toms `C0-B3` and `C5` up, pp.111-113, carried on
   * each recipe's `routing`) while an ordinary patch takes musical notes. See the head note; the
   * tests are in `test/polyend-play-plus.test.ts`.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track-sample',
      label: 'Track',
      count: 8,
      roles: SAMPLE_POOL_ROLES,
      polyphony: 1,
    },
    {
      kind: 'pool',
      id: 'track-synth',
      label: 'Synth Track',
      count: 8,
      roles: SYNTH_POOL_ROLES,
      polyphony: 8,
    },
  ],

  /**
   * This device's own per-step names, not a shared vocabulary: `perStep` is a validation table
   * compared only against this device's own articulation keys, so a name here that no recipe reaches
   * for validates nothing. Each is a parameter §4 documents as settable on a step — Volume and
   * Panning p.65, Repeat Grid p.72, Chance p.73, Micromove p.75 — and p.60's overview is what
   * establishes that the knob section addresses a step at all.
   *
   * **`volume` is two scales, exactly as the knobs above it are, and an articulation has nowhere
   * to say which.** On an audio track it is decibels relative to the sample — p.89: "Adjusts the
   * sample volume level with respect to its current level. 0dB refers to original level" — so the
   * sample recipes accent in dB around 0. On a MIDI / Synth track the same knob is velocity:
   * p.65, "Volume switches to MIDI Note Velocity over a 0-127 range and default at 100", so the
   * synth recipes accent around 100. The two are not interchangeable and a velocity written on a
   * dB track would be an accent of +96 dB against a ceiling of +12. Nothing in `ArticulationEntry`
   * can carry the distinction, so `test/polyend-play-plus.test.ts` pins it per pool instead.
   *
   * `sidechain` is declared because the limiter really does key off a track (see
   * `capabilityEvidence`). `lfo` is omitted, with its reasoning in the same place.
   */
  features: {
    perStep: ['volume', 'panning', 'repeat-grid', 'chance', 'micromove'],
    sidechain: { internal: true, fromExternalAudio: false },
  },

  /** Gestures off the panel and the menus. Jogs, not documentation (invariant 7). */
  hints: {
    // p.92: "Press [Shift] + [Audio/MIDI]. The Function buttons will be lit purple for MIDI and
    // Synth tracks as opposed to green when purely in audio sample track mode."
    'mode-toggle': 'Hold [Shift], press [Audio/MIDI]',
    // p.92: the three synth slots sit in the device list on the (Sample) knob.
    'pick-synth': 'Turn (Sample) to a Synth slot',
    // p.67, p.92: primary picks the sample, double tap for the folder.
    'pick-sample': 'Turn (Sample); double tap for (Folder)',
    // p.96: "Turn (Screen) to highlight 'Edit Patch'. Press (Screen) to open the patch editor."
    'edit-patch': 'Screen menu > Synths > Edit Patch',
    // p.190: Master FX is the secondary function on the View button.
    'master-fx': 'Hold [Shift], press [Master FX]',
    // p.72's pair, both on one knob.
    'pick-repeat': 'Turn (Repeat Type); double tap for (Grid)',
    // p.43: "Tap the [Select] Pad, column 20, last on the right."
    'select-track': 'Tap [Select], the last pad column',
  },

  /**
   * A taste judgement, not a limit the manual states. All eight audio tracks are playable at once
   * and p.77 gives them a voice each, so eight is free; the synth side adds parts that cost from a
   * shared budget of eight voices across three slots (p.91), and the grid shows one bank of eight
   * rows at a time (p.42), so a reader is swapping banks to reach the rest. Ten is where the two
   * halves stay manageable together at the machine.
   *
   * Raise it and nothing breaks: crowding is a cost in the objective, never a feasibility limit.
   */
  comfortableVoices: 10,

  manual: { title: 'Polyend Play+ Manual', edition: 'Rev 2' },

  productPage: 'https://polyend.com/play-plus/',

  recipes: [...PERC_RECIPES, ...SYNTH_RECIPES, ...SAMPLE_RECIPES],
}
