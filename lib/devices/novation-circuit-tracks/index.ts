import type { Device, Recipe } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { CIRCUIT_TRACKS_PANEL } from './panel'

/**
 * Novation Circuit Tracks (§2.3). A battery-powered groovebox: two six-voice synth tracks, four
 * sample-based drum tracks, two MIDI tracks, and a 32-pad grid that is the whole user interface.
 *
 * ## Two documents, and the split is the #18 trap wearing a different maker's name
 *
 * `CLAUDE.md` records the Roland split — an Owner's Manual that names the controls and a
 * Reference Manual that ranges them — and warns to assume it on every Roland box. **Novation
 * splits its documentation the same way**, and this manifest is the evidence that the warning
 * should not have been scoped to one maker:
 *
 *  - `circuit_tracks_user_guide_v3_en.pdf`, 109pp — the **only** document in `manuals/` when
 *    this device was authored. It names every control, explains every view, and ranges almost
 *    nothing that a recipe needs. Its account of the eight Macro encoders is p.34: *"the audible
 *    effect of any adjustment will depend to a large degree on the source Patch itself"*, and
 *    then a paragraph recommending experimentation. Authored from this alone, every sound-design
 *    value on this box would be a provisional point on an **uncited range**, which by §3.1 is
 *    also a mood-inert one: the whole `darkness`/`grit`/`space` surface would be dead.
 *  - `circuit_tracks_programmer_s_reference_guide_v3.pdf`, 22pp — fetched from Novation's own
 *    downloads page during this authoring pass, because the User Guide names it three times
 *    (pp.34, 62, 107: *"The separate downloadable document Circuit Tracks Programmer's Reference
 *    Guide contains full details"*). It is `Parameter | CC/NRPN | Control No. | Range | Default`
 *    tables for the entire synth engine, the drum tracks, the FX and the mixer. **Every numeric
 *    range in this file comes from it.**
 *
 * The User Guide keeps the jobs it is actually the source for: the panel, the rear connectors,
 * the per-step lanes, the sequencer, the clock, and the pages a reader is sent to at the machine.
 *
 * Printed folio equals PDF page in both documents, checked against seven footers in the User
 * Guide and three in the Programmer's Reference. **The Programmer's Reference table of contents
 * is one page ahead of its own footers** — it lists Drum Control at 12 and the footer under Drum
 * Control reads 11 — so every citation here is to a footer that was rendered and looked at, not
 * to a contents line.
 *
 * ## What the box shows you, and what it does not
 *
 * **No Macro has a numeric readout.** The encoders are endless, and the only feedback is the
 * brightness of the LED beneath them (User Guide p.34). So a line reading `FILTER FREQ 42` on
 * this box is not a number a reader can dial by eye the way a TR-1000's `DECAY 38` is: it is the
 * value the parameter takes, reachable exactly over MIDI CC and by ear on the panel.
 *
 * That is recorded rather than worked around, and it did not change the authoring: the values
 * are real values on real cited scales, and every one of them is the number the parameter holds.
 * What it changes is a reader's gesture, and `hints` says which encoder each one is under so the
 * gesture is at least the right one. **The step lanes are the opposite** — velocity, gate and
 * probability all render as counted pads (pp.42, 45, 47), so every `articulation` value below is
 * something a reader can set exactly and see.
 *
 * ## The MIDI tracks are not assignables, and the engine cannot express what they do
 *
 * Two of the eight tracks are MIDI tracks. They *make no sound* — they send notes and CC out of
 * the `MIDI Out` socket to whatever is plugged into it (p.59) — so they are not `voices` here,
 * and this manifest declares six assignables against the box's eight tracks.
 *
 * **The thing they do have no way to be said.** `patternDriver` (`lib/core/pipeline.ts`) is the
 * pass that answers "which box in this rig plays this one", and it resolves a driver by pairing
 * a `pitch-cv` output with a `gate` output — `bundles()` filters on exactly those two signal
 * kinds. A Circuit Tracks driving a Minitaur over 5-pin DIN is invisible to it, because the
 * whole pairing is about voltage: there is no note-and-gate pair to find on a MIDI socket, and
 * the two MIDI tracks are the *allocation* of that link, which nothing in the pass models
 * either.
 *
 * So a rig holding this box and a MIDI-only synth gets `nothing-drives`, which is **wrong about
 * the rig and right about the model**. Recording it here rather than reaching into
 * `lib/core/` is deliberate on two counts: it is #57's "the box does not fit the model" case,
 * which is a finding rather than a failure; and the repair is a routing model, not a special
 * case — a `midi` bundle is a different shape from a CV bundle (one socket, sixteen channels,
 * an allocation of tracks to channels) and inventing half of it inside one device folder would
 * be worse than the honest gap. The consequence a reader sees is that the rig phase says nothing
 * about the two MIDI tracks; the consequence this file accepts is that no recipe here claims
 * they exist.
 *
 * The external audio inputs are the mirror image and *are* expressible, though not by the field
 * that first looked like their home: `Inputs 1` and `2` mix into the box, are sent to the FX, and
 * can be **ducked by** a drum track (p.93). That is `io.audioIn`, and it is declared.
 * `features.sidechain.fromExternalAudio` is not the field for it and is `false` — it records
 * where a duck's *trigger* comes from, and every trigger on this box is one of Drum 1-4. The
 * `features` comment below has the full reading and the page.
 *
 * ## Citation regime
 *
 * §3.2's split, as the Tracker Mini states it: **legality is cited, authority is not.** Every
 * range and every option set carries the page that prints it; every point stays
 * `verified: false`, because no page says which cutoff suits a dark kick. Capability facts are
 * all in `capabilityEvidence`, keyed by field path (§2.6/#22) — none of them is in a comment.
 *
 * ## What is not modelled, and why
 *
 *  - **Patch and sample selection as a parameter.** A synth track picks one of 128 Patches and a
 *    drum track one of 64 samples (p.16), and `Patch Select` / `drum N patch select` are real
 *    cited parameters (Programmer's Reference pp.10, 11). No document prints the *names*, so an
 *    enum here would have 128 members reading `0`-`127`, which is a slot number and not a claim
 *    about the box. `content` carries the honest version instead, and each recipe's
 *    `sourceAudio` says what to go and find.
 *  - **Pattern length, sync rate and play order** (pp.53-56). Real parameters, and §3's rule is
 *    that a recipe never authors step counts or bar structure.
 *  - **The Master Filter.** One knob across the whole mix (p.94), always active, one setting for
 *    the box. It is not a per-part parameter and would be the same line under every part.
 *  - **Scales and root note** (pp.30-32). Harmony is the template's, never the device's.
 */

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

/** The User Guide. Printed folio equals PDF page — checked on pp.11, 15, 18, 60, 88, 104, 105. */
function ug(page: number): Cite {
  return { kind: 'manual', source: `Circuit Tracks User Guide v3, p.${page}` }
}

/**
 * The Programmer's Reference Guide, and the source of every range below.
 *
 * Cited by **footer**, not by its own table of contents, which runs one page ahead of the
 * footers throughout. Checked on the rendered pp.3, 9, 11 and 12.
 */
function prg(page: number): Cite {
  return { kind: 'manual', source: `Circuit Tracks Programmer's Reference Guide v3, p.${page}` }
}

/** One claim answered across several User Guide pages — the MPC manifests' `cites` shape. */
function ugPages(pages: string): Cite {
  return { kind: 'manual', source: `Circuit Tracks User Guide v3, ${pages}` }
}

/** Novation's published specification, for the one figure neither document states (§10). */
const MAKER_SPEC: Cite = {
  kind: 'maker',
  source:
    'Novation Circuit Tracks product specifications, novationmusic.com/products/circuit-tracks — "Length 240mm, Depth 210mm, Height 45mm", fetched 2026-08-29',
}

// ---------------------------------------------------------------------------
// Ranges, exactly as the Programmer's Reference prints them
// ---------------------------------------------------------------------------

type Bounds = { min: number; max: number; verified: Cite }

/**
 * **Everything on this box is 0-127, and that is a fact about the document rather than a
 * shortcut.** The Programmer's Reference ranges every continuous parameter over the full
 * seven-bit CC span; where a parameter is signed it prints the span *and* the signed reading it
 * stands for — `0 – 127 (-64 – 63)` — and the box itself displays neither. So the authored scale
 * is the printed 0-127 one throughout, and the signed ones carry a `note` giving where the
 * centre is, because "64 is no pitch shift" is the thing a reader needs and the number alone
 * does not say.
 */
const CC_FULL: Bounds = { min: 0, max: 127, verified: prg(3) } //  0 – 127, Synths 1 & 2
const ENV_FULL: Bounds = { min: 0, max: 127, verified: prg(4) } // 0 – 127, Envelope / LFO / FX
const DRUM_FULL: Bounds = { min: 0, max: 127, verified: prg(11) } // 0 – 127, Drum Control
const PROJ_FULL: Bounds = { min: 0, max: 127, verified: prg(12) } // 0 – 127, Project Control

/**
 * **One param name carries an arrow instead of the manual's word, and the reason is invariant 3.**
 *
 * p.3 prints `env 2 to frequency`. Authored verbatim, that name puts the token `to` into the
 * device vocabulary `test/templates.test.ts` builds — and two shipped directions have the word
 * in ordinary prose (`'dub is mostly space, and this is the first thing to go'`), so a faithful
 * name here would have failed the invariant-3 test in two templates that name no device at all.
 * The arrow is the MC-101's own convention for a routing in a parameter name (`Overdrive →
 * Chorus`), it reads the same at the machine, and it carries no English word. Recorded because
 * the next author to reach for a manual's exact wording will hit the same wall.
 */

/** `pre FX level` / `post FX level`, p.3: `52 – 82 (-12 – 18)`, noted there as `-12 to +18 dB`. */
const FX_LEVEL: Bounds = { min: 52, max: 82, verified: prg(3) }

/** `lfo 1 phase offset`, p.4: `0 – 119`, noted as `(0° - 357°) in steps of 3°`. */
const LFO_PHASE: Bounds = { min: 0, max: 119, verified: prg(4) }

/** `lfo rate sync` / `chorus rate sync` / `delay time sync`, pp.4, 12: `0 – 35`. */
const SYNC_INDEX: Bounds = { min: 0, max: 35, verified: prg(4) }

/**
 * `Swing`, User Guide p.86: *"Altering the Swing parameter from its default value of 50 (the
 * range is 20 to 80)"*. The one mood-carrying value on this box that the User Guide ranges by
 * itself — and the one the Programmer's Reference does not carry at all.
 */
const SWING: Bounds = { min: 20, max: 80, verified: ug(86) }

// ---------------------------------------------------------------------------
// Option sets. The set is the box's claim (§3.2); which one a recipe reaches for is taste.
// ---------------------------------------------------------------------------

/** p.3, `Polyphony Mode`: `0=Mono, 1=Mono AG, 2=Poly`. */
const POLYPHONY_MODES = ['Mono', 'Mono AG', 'Poly']

/**
 * p.9, the Osc Waveform Table, in full: fourteen waveforms then sixteen wavetables. Listed
 * complete rather than narrowed to what is authored, because an option set is a claim about the
 * *box* and a shortened one would say the Circuit Tracks has six oscillator shapes.
 *
 * The six `digital vocal` wavetables are why this box carries a `vox-chop` recipe without being
 * a sampler: they are formant tables in the oscillator, so the part is played rather than
 * chopped, and `ct-vox-chop-bright` says so in its `routing`.
 */
const OSC_WAVES = [
  'sine',
  'triangle',
  'sawtooth',
  'saw 9:1 PW',
  'saw 8:2 PW',
  'saw 7:3 PW',
  'saw 6:4 PW',
  'saw 5:5 PW',
  'saw 4:6 PW',
  'saw 3:7 PW',
  'saw 2:8 PW',
  'saw 1:9 PW',
  'pulse width',
  'square',
  'sine table',
  'analogue pulse',
  'analogue sync',
  'triangle-saw blend',
  'digital nasty 1',
  'digital nasty 2',
  'digital saw-square',
  'digital vocal 1',
  'digital vocal 2',
  'digital vocal 3',
  'digital vocal 4',
  'digital vocal 5',
  'digital vocal 6',
  'random collection 1',
  'random collection 2',
  'random collection 3',
]

/** p.9, the Filter Table's `Type` block: six filters, two slopes each of three families. */
const FILTER_TYPES = [
  'low pass 12dB',
  'low pass 24dB',
  'band pass 6/6 dB',
  'band pass 12/12 dB',
  'high pass 12dB',
  'high pass 24dB',
]

/**
 * p.9's two tables, and **they are not the same list.** The Filter Table's `Drive Type` block and
 * the Distortion Table print the same seven shapes in the same order, and the fifth is spelled
 * `rectifier` in one and `rectify` in the other. One constant served both here for a commit, and
 * that made the Distortion enum's option set — the legality claim, the thing that carries the
 * page — print a word that page does not. A cited option set is a claim about the box, so a
 * near-copy of the right list is the same defect as a wrong range with a careful citation.
 */
const FILTER_DRIVE_TYPES = [
  'diode',
  'valve',
  'clipper',
  'cross-over',
  'rectifier',
  'bit reducer',
  'rate reducer',
]

/** p.9, the Distortion Table. `rectify`, where the Filter Table above says `rectifier`. */
const DISTORTION_TYPES = [
  'diode',
  'valve',
  'clipper',
  'cross-over',
  'rectify',
  'bit reducer',
  'rate reducer',
]

/**
 * p.3, `routing`: `0=Normal, 1=Osc 1 bypasses the filter, 2=Osc 1 + Osc 2 bypasses the filter`.
 * The manual's own wording, kept whole — "Normal / Osc 1 bypass / both bypass" would be this
 * file paraphrasing a switch a reader has to find on a screen.
 */
const OSC_ROUTINGS = [
  'Normal',
  'Osc 1 bypasses the filter',
  'Osc 1 + Osc 2 bypasses the filter',
]

/** p.10, the LFO Waveform Table, values 0-37. */
const LFO_WAVES = [
  'sine',
  'triangle',
  'sawtooth',
  'square',
  'random S/H',
  'time S/H',
  'piano envelope',
  'sequence 1',
  'sequence 2',
  'sequence 3',
  'sequence 4',
  'sequence 5',
  'sequence 6',
  'sequence 7',
  'alternative 1',
  'alternative 2',
  'alternative 3',
  'alternative 4',
  'alternative 5',
  'alternative 6',
  'alternative 7',
  'alternative 8',
  'chromatic',
  'chromatic 16',
  'major',
  'major 7',
  'minor 7',
  'min arp 1',
  'min arp 2',
  'diminished',
  'dec minor',
  'minor 3rd',
  'pedal',
  '4ths',
  '4ths x12',
  '1625 maj',
  '1625 Min',
  '2511',
]

/** p.4, `chorus type`: `0=Phaser, 1=Chorus`. One switch, two states. */
const CHORUS_TYPES = ['Phaser', 'Chorus']

/**
 * ## Two option sets this box has and no recipe here names, for two different reasons
 *
 * **The reverb and delay types are one setting for the whole box.** p.90: *"It is not possible
 * to use different reverb presets on different tracks"*, and the delay is the same grid. That is
 * the MC-101's shared-MFX case exactly — two recipes each naming a type would describe a Project
 * the box cannot hold, and nothing would fail until somebody stood at the machine. So the sends
 * are authored, per track and cited, and the type is left to the reader with the `routing` line
 * pointing at FX View.
 *
 * Worth recording while looking at it: **the two documents count reverbs differently.** Project
 * Control gives `type` as `0 – 5` — Chamber, Small Room, Large Room, Small Hall, Large Hall,
 * Great Hall (p.12) — while the User Guide's FX grid shows *eight* presets, Small Chamber through
 * Large Hall – long reflection (p.91). They are not the same list and neither is wrong: the eight
 * are pads, each a stored setting of the engine, and the six are the engine's own type values,
 * which a pad sets along with `decay` and `damping`. An author reaching for "the reverb list"
 * has to say which one they mean.
 *
 * **The sidechain source is the reader's rig, not this recipe's.** p.12 gives `synth N source` as
 * `0=Drum 1 … 4=OFF`, and which of the four drum tracks carries the kick is decided by the
 * resolver at assignment time — a recipe naming `Drum 1` would be guessing at an ordinal it
 * cannot see (§2.2). What *is* per-track and knowable is the ducking envelope, so that is
 * authored and the source stays prose in `routing`.
 */

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
 * A signed parameter, authored on the printed 0-127 scale with the centre named.
 *
 * The Programmer's Reference prints these as `0 – 127 (-64 – 63)` with a default of `64 (0)`.
 * Authoring the signed half instead would put a negative number in a guide beside a control that
 * shows no number at all, and would mean two scales in one file for one parameter — the exact
 * shape of `CLAUDE.md`'s wrong-printed-scale warning. So the span is the printed one and the note
 * carries what the parenthesis was for.
 */
function signed(
  name: string,
  value: number,
  bounds: Bounds,
  extra: Partial<AuthoredNumericParam> = {},
): AuthoredNumericParam {
  return num(name, value, bounds, { note: '64 is the centre; below it is negative', ...extra })
}

/**
 * §6.1's swing axis, as an ordinary cited numeric.
 *
 * User Guide p.86 ranges it `20 to 80` around a stated neutral of 50, and `amount: 30` is the
 * distance from that neutral to each bound, so the whole travel is reachable and no part of it
 * is spent against a clamp. Unlike the MC-101's `SHUFFLE`, **the neutral is printed** — *"its
 * default value of 50"* — so the centre is a reading of the page rather than a reading of the
 * range's symmetry, and the point still stays `verified: false` because choosing 50 for this
 * part is taste like every other point here.
 *
 * `scope: 'song'` because Tempo View's Swing belongs to the Project: p.85 makes tempo *"the
 * default tempo for a new Project"* and p.86 puts Swing on the same view's Macro 2. There is no
 * per-track and no per-pattern swing on this box, so one part carrying it means all six do.
 */
function swing(): AuthoredNumericParam {
  return num('SWING', 50, SWING, {
    mood: [{ axis: 'swing', amount: 30 }],
    hint: 'open-tempo',
    scope: 'song',
    note: 'One setting for the whole Project, not per track',
  })
}

/** A track's reverb send, which lives on the FX grid rather than on the track (p.90). */
function reverbSend(value: number, extra: Partial<AuthoredNumericParam> = {}): AuthoredNumericParam {
  return num('REVERB SEND', value, PROJ_FULL, { hint: 'open-fx', ...extra })
}

/** A track's delay send, same grid and same Macros (p.91). */
function delaySend(value: number, extra: Partial<AuthoredNumericParam> = {}): AuthoredNumericParam {
  return num('DELAY SEND', value, PROJ_FULL, { hint: 'open-fx', ...extra })
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/**
 * What a drum track can carry: **whatever a one-shot sample can be.** A track holds one active
 * sample, plays it from a step, and offers pitch, decay, distortion, EQ, level and pan over it
 * (Programmer's Reference p.11). Nothing about that is percussion-specific, so the list is not
 * the percussion roles plus a couple of extras — it is every role a fired sample can serve.
 *
 * `riser`, `sweep` and `impact` are here because the reader chooses the sample: a riser is a
 * riser sample fired at a section boundary, which is what `Sample Flip` (p.62) makes native —
 * the sample can be swapped *per step*, so a one-off at a boundary costs no track. `noise` is
 * here for the same reason and `vox-chop` too, since chopping is literally what per-step sample
 * flip does.
 *
 * **`texture` is the one that is not here, and its absence is the real limit**: nothing on a
 * drum track loops or sustains, so a bed is beyond it however the sample was recorded.
 *
 * The tonal roles are out for a different reason: pitch is a per-track offset, not a per-step
 * note, so a drum track cannot follow a progression.
 */
const DRUM_ROLES: Role[] = [
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
  'vox-chop',
  'impact',
  'riser',
  'sweep',
]

/**
 * What a synth track can carry. Two oscillators with wavetables, a six-mode filter, three
 * envelopes, two LFOs and a twelve-slot mod matrix (Programmer's Reference pp.3-5) — a full
 * subtractive voice, six notes deep (User Guide p.35: *"Circuit Tracks' synth engines are
 * 'six-note polyphonic'"*).
 *
 * `noise` is here because the voice has a noise oscillator with its own level (`noise level`,
 * CC 56, p.3) — a synth track can be a noise part outright, not only a filtered oscillator with
 * some noise under it. `riser` and `sweep` are here because an LFO-swept filter over a held note
 * is what those parts are on a subtractive voice.
 *
 * **`vox-chop` is deliberately absent, and it was here for a commit.** The oscillator carries six
 * `digital vocal` wavetables (p.9), and a formant timbre is not a chopped phrase: a vox-chop part
 * is a recording cut into pieces and re-triggered, and this voice has no sampler to cut anything.
 * Declaring the role off a wavetable name would promise a reader a part the box cannot make. The
 * drum pool carries `vox-chop` instead, where per-step sample flip really is chopping.
 *
 * `texture`, `riser` and `sweep` are declared without recipes, which is §2.1's honest shape — the
 * voice can carry them and nobody here has authored one.
 */
const SYNTH_ROLES: Role[] = [
  'sub',
  'bass-mid',
  'pad',
  'lead',
  'stab',
  'arp',
  'acid',
  'noise',
  'texture',
  'riser',
  'sweep',
]

// ---------------------------------------------------------------------------
// Drum tracks
// ---------------------------------------------------------------------------

/**
 * A drum recipe reaches for the six parameters a drum track has and nothing else: `level`,
 * `pitch`, `decay`, `distortion`, `EQ` and `pan` (Programmer's Reference p.11), plus the two FX
 * sends on the FX grid (p.12). That is the whole per-track surface, and the User Guide agrees
 * from the panel side: *"Only the even-numbered Macros are active when a drum track is
 * selected"* (p.63), with Macro 2 = Pitch, 4 = Decay, 6 = Distortion, 8 = EQ.
 *
 * **`EQ` is one control and one number**, not a three-band section. p.63's table names it `EQ`
 * flat, and the Programmer's Reference gives it one CC per track with a signed range — so a
 * recipe says `EQ 78` and means *this track's one EQ control, turned up*, which is what a reader
 * turning Macro 8 gets. The three-band `EQ bass / mid / treble` on p.4 is the **synth** engine's
 * and appears only on synth recipes.
 *
 * Every drum recipe carries `sourceAudio`: a drum track plays a sample, the samples are factory
 * content nobody has enumerated (see `content`), and a cutoff on a track with nothing loaded is
 * a setting with no subject.
 */
const DRUM_RECIPES: Recipe[] = [
  {
    id: 'ct-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'drum-track',
    title: 'Tight kick, tuned down, with the tail cut off it',
    sourceAudio: { need: 'A short, dry electronic kick with little sub tail', hint: 'pick-sample' },
    params: [
      num('LEVEL', 118, DRUM_FULL),
      signed('PITCH', 56, DRUM_FULL, {
        hint: 'drum-macro-2',
        mood: [{ axis: 'darkness', amount: -6 }],
        note: '64 is the sample at its own pitch; below it is down',
      }),
      num('DECAY', 34, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -18 }] }),
      num('DISTORTION', 18, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 46 }] }),
      signed('EQ', 58, DRUM_FULL, { hint: 'drum-macro-8' }),
      reverbSend(0),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { velocity: 120 }, hint: 'edit-velocity' },
      { slot: 'ghost', set: { velocity: 48 }, hint: 'edit-velocity' },
    ],
    routing: 'Leave both FX sends at 0 — a kick with reverb on it is what the Master Filter cannot undo',
    verified: false,
  },
  {
    id: 'ct-kick-dark',
    role: 'kick',
    character: 'dark',
    voice: 'drum-track',
    title: 'Long kick that owns the bottom of the pattern',
    sourceAudio: { need: 'A sustained 909-family kick with an audible sub decay', hint: 'pick-sample' },
    params: [
      num('LEVEL', 122, DRUM_FULL),
      signed('PITCH', 50, DRUM_FULL, { hint: 'drum-macro-2', mood: [{ axis: 'darkness', amount: -8 }] }),
      num('DECAY', 92, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -26 }] }),
      num('DISTORTION', 8, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 34 }] }),
      signed('EQ', 46, DRUM_FULL, { hint: 'drum-macro-8', note: '64 is flat; below it takes the top off' }),
      reverbSend(0),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { velocity: 112 }, hint: 'edit-velocity' }],
    verified: false,
  },
  {
    id: 'ct-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'drum-track',
    title: 'Flat, forward snare with a short tail',
    sourceAudio: { need: 'A dry snare with body rather than a long rattle', hint: 'pick-sample' },
    params: [
      num('LEVEL', 112, DRUM_FULL),
      signed('PITCH', 68, DRUM_FULL, { hint: 'drum-macro-2' }),
      num('DECAY', 44, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -20 }] }),
      num('DISTORTION', 26, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 50 }] }),
      signed('EQ', 74, DRUM_FULL, { hint: 'drum-macro-8', mood: [{ axis: 'darkness', amount: -22 }] }),
      reverbSend(12, { mood: [{ axis: 'space', amount: 40 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'backbeat', set: { velocity: 120 }, hint: 'edit-velocity' },
      { slot: 'fill', set: { 'micro-step': 4 }, hint: 'drum-micro-step' },
    ],
    verified: false,
  },
  {
    id: 'ct-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'drum-track',
    title: 'Wide clap sitting above the snare',
    sourceAudio: { need: 'A layered clap with a visible spread of hits', hint: 'pick-sample' },
    params: [
      num('LEVEL', 104, DRUM_FULL),
      signed('PAN', 78, DRUM_FULL, { note: '64 is centre; above it is right' }),
      signed('PITCH', 72, DRUM_FULL, { hint: 'drum-macro-2' }),
      num('DECAY', 62, DRUM_FULL, { hint: 'drum-macro-4' }),
      signed('EQ', 92, DRUM_FULL, { hint: 'drum-macro-8', mood: [{ axis: 'darkness', amount: -34 }] }),
      reverbSend(38, { mood: [{ axis: 'space', amount: 46 }] }),
      delaySend(14, { mood: [{ axis: 'space', amount: 28 }] }),
      swing(),
    ],
    articulation: [{ slot: 'backbeat', set: { velocity: 104 }, hint: 'edit-velocity' }],
    verified: false,
  },
  {
    id: 'ct-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'drum-track',
    title: 'Dry rim on the off-beats, panned away from the snare',
    sourceAudio: { need: 'A single dry rimshot or side-stick', hint: 'pick-sample' },
    params: [
      num('LEVEL', 92, DRUM_FULL),
      signed('PAN', 48, DRUM_FULL, { note: '64 is centre; below it is left' }),
      signed('PITCH', 66, DRUM_FULL, { hint: 'drum-macro-2' }),
      num('DECAY', 22, DRUM_FULL, { hint: 'drum-macro-4' }),
      num('DISTORTION', 0, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 38 }] }),
      reverbSend(8, { mood: [{ axis: 'space', amount: 32 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { velocity: 88 }, hint: 'edit-velocity' },
      { slot: 'ghost', set: { probability: 62.5 }, hint: 'edit-probability' },
    ],
    verified: false,
  },
  {
    id: 'ct-closed-hat-clean',
    role: 'closed-hat',
    character: 'clean',
    voice: 'drum-track',
    title: 'Short closed hat, sixteenths, low in the mix',
    sourceAudio: { need: 'A closed hat short enough not to ring into the next step', hint: 'pick-sample' },
    params: [
      num('LEVEL', 84, DRUM_FULL),
      signed('PAN', 54, DRUM_FULL, { note: '64 is centre; below it is left' }),
      signed('PITCH', 74, DRUM_FULL, { hint: 'drum-macro-2' }),
      num('DECAY', 16, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -10 }] }),
      signed('EQ', 88, DRUM_FULL, { hint: 'drum-macro-8', mood: [{ axis: 'darkness', amount: -30 }] }),
      reverbSend(4),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { velocity: 88 }, hint: 'edit-velocity' },
      { slot: 'ghost', set: { velocity: 40, probability: 75 }, hint: 'edit-probability' },
    ],
    verified: false,
  },
  {
    id: 'ct-open-hat-dirty',
    role: 'open-hat',
    character: 'dirty',
    voice: 'drum-track',
    title: 'Open hat pushed into the distortion, ringing across the beat',
    sourceAudio: { need: 'An open hat with a long metallic tail', hint: 'pick-sample' },
    params: [
      num('LEVEL', 96, DRUM_FULL),
      signed('PAN', 76, DRUM_FULL, { note: '64 is centre; above it is right' }),
      signed('PITCH', 70, DRUM_FULL, { hint: 'drum-macro-2' }),
      num('DECAY', 104, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -30 }] }),
      num('DISTORTION', 72, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 44 }] }),
      signed('EQ', 84, DRUM_FULL, { hint: 'drum-macro-8', mood: [{ axis: 'darkness', amount: -26 }] }),
      delaySend(20, { mood: [{ axis: 'space', amount: 34 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { velocity: 104 }, hint: 'edit-velocity' },
      { slot: 'accent', set: { velocity: 120 }, hint: 'edit-velocity' },
    ],
    verified: false,
  },
  {
    id: 'ct-tom-soft',
    role: 'tom',
    character: 'soft',
    voice: 'drum-track',
    title: 'Low tom for fills, tuned under the snare',
    sourceAudio: { need: 'A single low tom with a clean pitch to it', hint: 'pick-sample' },
    params: [
      num('LEVEL', 100, DRUM_FULL),
      signed('PITCH', 52, DRUM_FULL, { hint: 'drum-macro-2', mood: [{ axis: 'darkness', amount: -10 }] }),
      num('DECAY', 76, DRUM_FULL, { hint: 'drum-macro-4', mood: [{ axis: 'density', amount: -20 }] }),
      num('DISTORTION', 6, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 30 }] }),
      signed('EQ', 56, DRUM_FULL, { hint: 'drum-macro-8' }),
      reverbSend(24, { mood: [{ axis: 'space', amount: 40 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'fill', set: { velocity: 104 }, hint: 'edit-velocity' },
      { slot: 'accent', set: { velocity: 120 }, hint: 'edit-velocity' },
    ],
    verified: false,
  },
  {
    id: 'ct-metallic-dirty',
    role: 'metallic',
    character: 'dirty',
    voice: 'drum-track',
    title: 'Bent metal hit, rate-reduced, off the grid',
    sourceAudio: { need: 'Any struck metal — a cowbell, a cymbal edge, a found clang', hint: 'pick-sample' },
    params: [
      num('LEVEL', 88, DRUM_FULL),
      signed('PAN', 40, DRUM_FULL, { note: '64 is centre; below it is left' }),
      signed('PITCH', 88, DRUM_FULL, { hint: 'drum-macro-2', mood: [{ axis: 'darkness', amount: -12 }] }),
      num('DECAY', 58, DRUM_FULL, { hint: 'drum-macro-4' }),
      num('DISTORTION', 96, DRUM_FULL, { hint: 'drum-macro-6', mood: [{ axis: 'grit', amount: 30 }] }),
      signed('EQ', 96, DRUM_FULL, { hint: 'drum-macro-8', mood: [{ axis: 'darkness', amount: -32 }] }),
      delaySend(34, { mood: [{ axis: 'space', amount: 44 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { velocity: 112, 'micro-step': 2 }, hint: 'drum-micro-step' },
      { slot: 'offbeat', set: { probability: 37.5 }, hint: 'edit-probability' },
    ],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// Synth tracks
// ---------------------------------------------------------------------------

/**
 * A synth recipe is a patch, and the patch is real: two oscillators with independent wave,
 * detune and level; a drive stage; a six-mode filter with its own envelope; three envelopes; a
 * chorus/phaser and three-band EQ after it; and twelve mod matrix slots, each with two sources,
 * a depth and a destination (Programmer's Reference pp.3-5).
 *
 * **Two things a reader has to know, and both are in `routing` where they apply.**
 *
 *  - A patch is *edited* from a computer. The Macros reach four parameters each on the factory
 *    patches (User Guide p.34) and the assignments differ per patch; everything else is over MIDI
 *    or in Novation Components. So a recipe naming twelve parameters is naming a patch, and the
 *    reader's route to it is the Patch it starts from plus what the Macros are wired to.
 *  - **`Env 1` is the amplitude envelope and `Env 2` is the filter's.** The Programmer's
 *    Reference names them only by number, and `env 2 to frequency` on p.3 is what settles it —
 *    the second envelope is the one with a routing to the filter. Every recipe below names them
 *    `AMP` and `FILTER ENV` rather than by number, because a reader turning Macro 3 sees
 *    *3 Amp Envelope* on the panel and not *Env 1*.
 */
const SYNTH_RECIPES: Recipe[] = [
  {
    id: 'ct-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'synth-track',
    title: 'Mono sine sub, filtered flat, nothing above the fundamental',
    patchPolyphony: 1,
    params: [
      pick('POLYPHONY MODE', 'Mono', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'sine', OSC_WAVES, prg(9)),
      num('OSC 1 LEVEL', 127, CC_FULL),
      num('OSC 2 LEVEL', 0, CC_FULL),
      pick('FILTER TYPE', 'low pass 24dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 34, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -22 }],
      }),
      num('FILTER RESONANCE', 0, CC_FULL, { hint: 'synth-macro-6' }),
      num('AMP ATTACK', 2, ENV_FULL),
      num('AMP DECAY', 90, ENV_FULL),
      num('AMP SUSTAIN', 110, ENV_FULL),
      num('AMP RELEASE', 24, ENV_FULL, { mood: [{ axis: 'density', amount: -16 }] }),
      num('PORTAMENTO RATE', 18, CC_FULL, { note: 'Only audible in a Mono polyphony mode' }),
      num('SIDECHAIN ATTACK', 0, PROJ_FULL),
      num('SIDECHAIN HOLD', 34, PROJ_FULL),
      num('SIDECHAIN DECAY', 78, PROJ_FULL, { mood: [{ axis: 'density', amount: -24 }] }),
      num('SIDECHAIN DEPTH', 96, PROJ_FULL, { mood: [{ axis: 'density', amount: 24 }] }),
      reverbSend(0),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { gate: 4 }, hint: 'edit-gate' }],
    routing:
      'Sidechain this track to the kick drum track — Shift + FX, then a preset in the Synth row',
    verified: false,
  },
  {
    id: 'ct-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'synth-track',
    title: 'Detuned saw bass with the drive stage into the filter',
    patchPolyphony: 1,
    params: [
      pick('POLYPHONY MODE', 'Mono AG', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'sawtooth', OSC_WAVES, prg(9)),
      pick('OSC 2 WAVE', 'saw 7:3 PW', OSC_WAVES, prg(9)),
      num('OSC 1 LEVEL', 120, CC_FULL),
      num('OSC 2 LEVEL', 96, CC_FULL),
      signed('OSC 2 CENTS', 71, CC_FULL, { note: '64 is in tune; this is a few cents sharp' }),
      pick('ROUTING', 'Normal', OSC_ROUTINGS, prg(3)),
      num('FILTER DRIVE', 78, CC_FULL, { hint: 'patch-editor', mood: [{ axis: 'grit', amount: 40 }] }),
      pick('DRIVE TYPE', 'valve', FILTER_DRIVE_TYPES, prg(9)),
      pick('FILTER TYPE', 'low pass 24dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 52, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -26 }],
      }),
      num('FILTER RESONANCE', 34, CC_FULL, { hint: 'synth-macro-6' }),
      signed('ENV 2 → FREQUENCY', 84, CC_FULL, { hint: 'synth-macro-4' }),
      num('FILTER ENV ATTACK', 0, ENV_FULL),
      num('FILTER ENV DECAY', 46, ENV_FULL, { mood: [{ axis: 'density', amount: -18 }] }),
      num('AMP DECAY', 68, ENV_FULL),
      num('AMP SUSTAIN', 46, ENV_FULL),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { gate: 2, velocity: 120 }, hint: 'edit-gate' },
      { slot: 'offbeat', set: { gate: 1, velocity: 88 }, hint: 'edit-gate' },
    ],
    verified: false,
  },
  {
    id: 'ct-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'synth-track',
    title: 'Resonant squelch with the filter envelope doing the work',
    patchPolyphony: 1,
    params: [
      pick('POLYPHONY MODE', 'Mono AG', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'square', OSC_WAVES, prg(9)),
      num('OSC 1 LEVEL', 127, CC_FULL),
      num('OSC 2 LEVEL', 0, CC_FULL),
      pick('FILTER TYPE', 'low pass 24dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 38, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -24 }],
      }),
      num('FILTER RESONANCE', 104, CC_FULL, { hint: 'synth-macro-6' }),
      num('Q NORMALIZE', 40, CC_FULL, {
        note: 'Lower values let resonance take more of the level back',
      }),
      signed('ENV 2 → FREQUENCY', 106, CC_FULL, { hint: 'synth-macro-4' }),
      num('FILTER ENV ATTACK', 0, ENV_FULL),
      num('FILTER ENV DECAY', 34, ENV_FULL, { mood: [{ axis: 'density', amount: -20 }] }),
      num('FILTER ENV SUSTAIN', 0, ENV_FULL),
      num('AMP DECAY', 52, ENV_FULL),
      num('AMP SUSTAIN', 64, ENV_FULL),
      num('PORTAMENTO RATE', 34, CC_FULL, { note: 'The glide between tied steps' }),
      num('DISTORTION LEVEL', 54, ENV_FULL, { hint: 'synth-macro-8', mood: [{ axis: 'grit', amount: 44 }] }),
      pick('DISTORTION TYPE', 'diode', DISTORTION_TYPES, prg(9)),
      delaySend(28, { mood: [{ axis: 'space', amount: 36 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { velocity: 120 }, hint: 'edit-velocity' },
      { slot: 'offbeat', set: { gate: 16 }, hint: 'edit-gate' },
    ],
    routing: 'Gate 16 on a step ties it into the next — that is the glide, and it needs Portamento up',
    verified: false,
  },
  {
    id: 'ct-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'synth-track',
    title: 'Hard sync lead that cuts over the pattern',
    patchPolyphony: 1,
    params: [
      pick('POLYPHONY MODE', 'Mono', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'analogue sync', OSC_WAVES, prg(9)),
      num('OSC 1 VIRTUAL SYNC DEPTH', 78, CC_FULL, { hint: 'synth-macro-2' }),
      num('OSC 1 LEVEL', 127, CC_FULL),
      pick('OSC 2 WAVE', 'sawtooth', OSC_WAVES, prg(9)),
      num('OSC 2 LEVEL', 62, CC_FULL),
      signed('OSC 2 SEMITONES', 71, CC_FULL, { note: '64 is unison, so this is seven semitones up' }),
      pick('FILTER TYPE', 'low pass 12dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 96, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -34 }],
      }),
      num('FILTER RESONANCE', 26, CC_FULL, { hint: 'synth-macro-6' }),
      num('AMP ATTACK', 6, ENV_FULL),
      num('AMP DECAY', 72, ENV_FULL),
      num('AMP SUSTAIN', 88, ENV_FULL),
      num('AMP RELEASE', 40, ENV_FULL, { mood: [{ axis: 'density', amount: -14 }] }),
      // **No `unit`.** 70 is the raw 52-82 index the Programmer's Reference ranges; the decibels
      // are what that index *stands for*, and `unit: 'dB'` would have printed "70 dB".
      num('POST FX LEVEL', 70, FX_LEVEL, { note: '52 is -12 dB, 64 is 0 dB, 82 is +18 dB' }),
      delaySend(42, { mood: [{ axis: 'space', amount: 40 }] }),
      reverbSend(18, { mood: [{ axis: 'space', amount: 32 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'downbeat', set: { velocity: 120 }, hint: 'edit-velocity' },
      { slot: 'accent', set: { gate: 6 }, hint: 'edit-gate' },
    ],
    verified: false,
  },
  {
    id: 'ct-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'synth-track',
    title: 'Slow six-voice pad, chorused, opening under everything',
    params: [
      pick('POLYPHONY MODE', 'Poly', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'triangle-saw blend', OSC_WAVES, prg(9)),
      pick('OSC 2 WAVE', 'sawtooth', OSC_WAVES, prg(9)),
      num('OSC 1 LEVEL', 104, CC_FULL),
      num('OSC 2 LEVEL', 96, CC_FULL),
      signed('OSC 2 CENTS', 58, CC_FULL, { note: '64 is in tune; this is a few cents flat' }),
      num('OSC 1 DENSITY', 48, CC_FULL, { hint: 'synth-macro-1' }),
      num('OSC 1 DENSITY DETUNE', 34, CC_FULL, { hint: 'synth-macro-2' }),
      pick('FILTER TYPE', 'low pass 12dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 62, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -30 }],
      }),
      num('FILTER RESONANCE', 14, CC_FULL, { hint: 'synth-macro-6' }),
      num('AMP ATTACK', 68, ENV_FULL, { mood: [{ axis: 'density', amount: -22 }] }),
      num('AMP DECAY', 96, ENV_FULL),
      num('AMP SUSTAIN', 104, ENV_FULL),
      num('AMP RELEASE', 92, ENV_FULL),
      pick('LFO 1 WAVEFORM', 'triangle', LFO_WAVES, prg(10)),
      num('LFO 1 RATE', 28, ENV_FULL),
      num('LFO 1 SLEW RATE', 40, ENV_FULL),
      pick('CHORUS TYPE', 'Chorus', CHORUS_TYPES, prg(4)),
      num('CHORUS LEVEL', 72, ENV_FULL, { hint: 'synth-macro-8' }),
      num('CHORUS RATE', 30, ENV_FULL),
      num('SIDECHAIN ATTACK', 6, PROJ_FULL),
      num('SIDECHAIN HOLD', 50, PROJ_FULL),
      num('SIDECHAIN DECAY', 96, PROJ_FULL, { mood: [{ axis: 'density', amount: -22 }] }),
      num('SIDECHAIN DEPTH', 58, PROJ_FULL, { mood: [{ axis: 'density', amount: 30 }] }),
      reverbSend(64, { mood: [{ axis: 'space', amount: 50 }] }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { gate: 16 }, hint: 'edit-gate' }],
    routing:
      'Sidechain to a drum track if the pad is fighting the kick — Shift + FX, Synth row, preset 1-7',
    verified: false,
  },
  {
    id: 'ct-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'synth-track',
    title: 'Short filtered chord, no tail, straight on the beat',
    params: [
      pick('POLYPHONY MODE', 'Poly', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'sawtooth', OSC_WAVES, prg(9)),
      pick('OSC 2 WAVE', 'square', OSC_WAVES, prg(9)),
      num('OSC 1 LEVEL', 118, CC_FULL),
      num('OSC 2 LEVEL', 74, CC_FULL),
      pick('FILTER TYPE', 'band pass 12/12 dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 74, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -28 }],
      }),
      num('FILTER RESONANCE', 48, CC_FULL, { hint: 'synth-macro-6' }),
      signed('ENV 2 → FREQUENCY', 78, CC_FULL, { hint: 'synth-macro-4' }),
      num('AMP ATTACK', 0, ENV_FULL),
      num('AMP DECAY', 30, ENV_FULL, { mood: [{ axis: 'density', amount: -14 }] }),
      num('AMP SUSTAIN', 0, ENV_FULL),
      num('AMP RELEASE', 12, ENV_FULL),
      num('FILTER DRIVE', 44, CC_FULL, { hint: 'patch-editor', mood: [{ axis: 'grit', amount: 42 }] }),
      pick('DRIVE TYPE', 'clipper', FILTER_DRIVE_TYPES, prg(9)),
      delaySend(22, { mood: [{ axis: 'space', amount: 34 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'accent', set: { velocity: 120, gate: 1 }, hint: 'edit-gate' },
      { slot: 'offbeat', set: { probability: 50 }, hint: 'edit-probability' },
    ],
    verified: false,
  },
  {
    id: 'ct-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'synth-track',
    title: 'Plucked sixteenths, one note per step, delay carrying the rest',
    patchPolyphony: 1,
    params: [
      pick('POLYPHONY MODE', 'Mono', POLYPHONY_MODES, prg(3)),
      pick('OSC 1 WAVE', 'analogue pulse', OSC_WAVES, prg(9)),
      signed('OSC 1 PULSE WIDTH INDEX', 88, CC_FULL, { hint: 'synth-macro-2' }),
      num('OSC 1 LEVEL', 122, CC_FULL),
      num('OSC 2 LEVEL', 0, CC_FULL),
      pick('FILTER TYPE', 'low pass 12dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 84, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -30 }],
      }),
      num('FILTER RESONANCE', 20, CC_FULL, { hint: 'synth-macro-6' }),
      num('AMP ATTACK', 0, ENV_FULL),
      num('AMP DECAY', 38, ENV_FULL, { mood: [{ axis: 'density', amount: -16 }] }),
      num('AMP SUSTAIN', 0, ENV_FULL),
      num('AMP RELEASE', 20, ENV_FULL),
      num('EQ TREBLE LEVEL', 76, ENV_FULL, {
        note: '64 is flat; above it lifts the top',
        mood: [{ axis: 'darkness', amount: -18 }],
      }),
      delaySend(56, { mood: [{ axis: 'space', amount: 44 }] }),
      reverbSend(20, { mood: [{ axis: 'space', amount: 30 }] }),
      swing(),
    ],
    articulation: [
      { slot: 'offbeat', set: { velocity: 88 }, hint: 'edit-velocity' },
      { slot: 'ghost', set: { velocity: 48, probability: 75 }, hint: 'edit-probability' },
    ],
    routing:
      'The delay preset is what makes this an arp — the pattern is one note a step, the repeats are FX View',
    verified: false,
  },
  {
    id: 'ct-texture-dark',
    role: 'texture',
    character: 'dark',
    voice: 'synth-track',
    title: 'Noise bed under a slow filter, sitting below the parts',
    params: [
      pick('POLYPHONY MODE', 'Poly', POLYPHONY_MODES, prg(3)),
      num('NOISE LEVEL', 96, CC_FULL),
      num('OSC 1 LEVEL', 34, CC_FULL),
      pick('OSC 1 WAVE', 'digital nasty 2', OSC_WAVES, prg(9)),
      num('OSC 2 LEVEL', 0, CC_FULL),
      pick('FILTER TYPE', 'low pass 24dB', FILTER_TYPES, prg(9)),
      num('FILTER FREQUENCY', 44, CC_FULL, {
        hint: 'synth-macro-5',
        mood: [{ axis: 'darkness', amount: -26 }],
      }),
      num('FILTER RESONANCE', 30, CC_FULL, { hint: 'synth-macro-6' }),
      num('AMP ATTACK', 92, ENV_FULL, { mood: [{ axis: 'density', amount: -26 }] }),
      num('AMP SUSTAIN', 90, ENV_FULL),
      num('AMP RELEASE', 106, ENV_FULL),
      pick('LFO 1 WAVEFORM', 'sine', LFO_WAVES, prg(10)),
      num('LFO 1 RATE', 12, ENV_FULL),
      num('LFO 1 RATE SYNC', 20, SYNC_INDEX, { note: 'An index into the sync-rate list, not a rate' }),
      num('EQ BASS LEVEL', 74, ENV_FULL, { note: '64 is flat; above it lifts the bottom' }),
      reverbSend(88, { mood: [{ axis: 'space', amount: 38 }] }),
      swing(),
    ],
    articulation: [{ slot: 'downbeat', set: { gate: 16, velocity: 64 }, hint: 'edit-gate' }],
    verified: false,
  },
]

// ---------------------------------------------------------------------------
// The device
// ---------------------------------------------------------------------------

export const device: Device = {
  id: 'novation-circuit-tracks',
  name: 'Circuit Tracks',
  maker: 'Novation',
  kind: 'groovebox',

  /**
   * §2.3/§7.4. **Clock is asymmetric on this box, and the asymmetry is a whole socket.**
   *
   * It receives clock over MIDI DIN and USB — p.85: *"External MIDI clock can be applied either
   * via the USB port or the MIDI In port"* — and sends over those two **plus** the rear `Sync`
   * jack, *"a 3.5 mm TRS jack socket supplying a clock signal of 5 V amplitude, at a rate
   * proportional to the tempo clock"* (p.18). There is no analogue sync **input**: the rear panel
   * has one Sync socket and it is an output. Declaring `analog-clock` undirected would have the
   * guide telling a reader to sync this box to a Eurorack clock over a hole that does not exist,
   * which is the Mother-32 defect `ClockSpec` was widened to prevent.
   *
   * **`preferredSource` is deliberately absent, and `capabilityEvidence` says why.** The manual
   * describes both directions as ordinary and chooses neither.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    sendTransport: ['midi-din', 'usb', 'analog-clock'],
    receiveTransport: ['midi-din', 'usb'],

    /**
     * §7.4/#104. Both directions are a Setup View toggle rather than a default, and the guide
     * has to say so before it tells anyone to sync anything.
     *
     * p.104's `MIDI I/O` table puts MIDI Clock Rx on Pad 31 and Tx on Pad 32, both on by
     * default; p.105's `Clock settings` is what makes the Tx one load-bearing — *"If Clock Tx is
     * ON, Circuit Tracks is the clock master and its clock … will be available as MIDI Clock at
     * the rear panel USB and MIDI Out connectors."* One pad governs both transports, which is why
     * the two entries name the same pad.
     *
     * The analogue rate is a separate choice on the same page and is carried as a `note`, not as
     * a third entry: p.105 gives Pads 17-21 as 1, 2, 4, 8 and 24 ppqn with 2 the default, and
     * *"Swing (if set to something other than 50%) is not applied to the analogue clock output"*
     * — which matters here, because every recipe in this file carries a `SWING`.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Setup View (Shift + Save) > MIDI data control',
        value: 'Pad 32 — MIDI Clock Tx on',
        note: 'On by default; the same pad governs USB',
      },
      {
        transport: 'usb',
        path: 'Setup View (Shift + Save) > MIDI data control',
        value: 'Pad 32 — MIDI Clock Tx on',
        note: 'On by default; the same pad governs the MIDI Out socket',
      },
      {
        transport: 'analog-clock',
        path: 'Setup View (Shift + Save) > Clock sync rates',
        value: 'Pads 17-21 — 1, 2, 4, 8 or 24 ppqn',
        note: '2 ppqn by default, 5 V amplitude; Swing is not applied to this output',
      },
    ],
  },

  /**
   * p.18's rear panel. Stereo out on two 1/4" TS jacks with the L socket carrying a mono mix when
   * nothing is in the R; two line-level 1/4" TS inputs that mix in and can be sent to the FX and
   * ducked by a drum track (p.93); no individual outs.
   *
   * `usbAudio: false` is a **cited-against**, not an omission — p.18, on the USB-C port:
   * *"NOTE – Circuit Tracks' USB port does not carry audio."* The port is MIDI class compliant
   * and is the power inlet, and that is all it is.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 240 mm across.
   *
   * **Neither document states a dimension.** The User Guide has no specifications section at all
   * — it runs from the introduction to Bootloader Mode and then to the trademark notice — and the
   * Programmer's Reference is 22pp of MIDI tables. A grep is not evidence of that (`CLAUDE.md`),
   * so the rear-panel and top-view pages were rendered and read, and the last three pages
   * looked at: there is no table anywhere in either book.
   *
   * So the figure is Novation's own published specification, which is what `maker` is for
   * (#191): `Length 240mm, Depth 210mm, Height 45mm`. The Circuit Tracks is a landscape desktop
   * box played lying flat, so there is no orientation trap — the length is the horizontal span as
   * played, and the depth is the panel's rise, which `panel.panelRiseMm` carries. 240 / 210 is
   * 1.143 and the Top View figure measures 1.164, a residual of 1.9%; `panel.ts` records the
   * measurement and what was done with the difference.
   */
  physical: { panelSpanMm: 240, verified: MAKER_SPEC },

  /** §10. A simplified original drawing of the top panel, read off the manual (see `panel.ts`). */
  panel: CIRCUIT_TRACKS_PANEL,

  /**
   * §2.1's two pools. Both are genuine pools rather than named voices: the two synth tracks are
   * identical and interchangeable, and so are the four drum tracks, so a recipe keyed on the pool
   * serves every ordinal (§2.2).
   *
   * **`count` is the hardware count, not a headroom choice.** Unlike the MC-101, where eight of
   * sixteen pads are declared because nothing could ever occupy the ninth, this box has exactly
   * two synth tracks and exactly four drum tracks. There is nothing to trim.
   *
   * **`polyphony: 6` on the synth pool is cited to prose rather than to a specification table**,
   * because there is no specification table (see `physical`). p.35: *"Circuit Tracks' synth
   * engines are 'six-note polyphonic' – that is, you can assign up to six notes to any step in
   * the pattern, if the Patch you've selected is suitably polyphonic."* The conditional in that
   * sentence is real and is why four recipes here carry `patchPolyphony: 1`: a patch in a Mono
   * polyphony mode sounds one note however many the step holds, and §12.4's field exists exactly
   * so a monophonic patch on a six-voice track cannot be handed a triad.
   *
   * **A drum track is 1, and that *is* a judgement — the pages cited here do not establish it.**
   * It read "one active sample, one hit at a time (p.62)" for a commit, and only the first half
   * of that is on the page: p.62 says a track *"can use any one of 64 pre-loaded samples"* and
   * that Sample Flip swaps which one plays per step. Neither it nor any other page says what
   * happens when a step retriggers a sample that is still sounding — whether the second hit cuts
   * the first or overlaps it — and the Programmer's Reference has one `drum N` CC set per track
   * with nothing about voice count. So 1 is an authoring choice, chosen because a drum track
   * carries one part and one part is what a role request asks for, and it is not dressed as a
   * citation. `voices` in `capabilityEvidence` cites p.35 for the polyphony it *does* establish,
   * which is the synth tracks'.
   *
   * ## `sampled-chord` is declined, and by absence rather than by argument
   *
   * A drum track can hold a rendered chord — the samples are the reader's to choose. What it
   * cannot do is move it: `drum N pitch` is one CC for the whole track (Programmer's Reference
   * p.11), not a per-step value, so a chord pinned to one pitch would play the same chord under
   * every degree. And the six voices on a synth track make the substitute pointless — §7.1 ranks
   * a polyphonic voice ahead of a sampled chord, and there is a real polyphonic voice here.
   */
  voices: [
    { kind: 'pool', id: 'synth-track', label: 'Synth', count: 2, roles: SYNTH_ROLES, polyphony: 6 },
    { kind: 'pool', id: 'drum-track', label: 'Drum', count: 4, roles: DRUM_ROLES, polyphony: 1 },
  ],

  /**
   * The per-step lanes, in this box's own names, all four of them a **counted pad display**
   * rather than a number on a screen:
   *
   *  - `velocity` — p.42, sixteen pads standing for sixteen increments of eight, with the real
   *    value 7-bit underneath: *"the velocity value is set internally to 7-bit accuracy: a value
   *    between 0 and 127"*. Fixed Velocity is 96 (p.43).
   *  - `gate` — p.45, *"any value between one-sixth and 16, in increments of one-sixth of a
   *    Step, giving a total of 96 possible values"*. A gate of 16 on a step ties it (p.51).
   *  - `probability` — p.47, eight values from 12.5% to 100%, one per lit pad.
   *  - `micro-step` — p.48, *"delaying individual notes on a step by between one and five
   *    'ticks', where a tick is a sixth of a step"*.
   *  - `sample-flip` — p.62, a drum-track-only lane: a *different sample* on a single step,
   *    which is how this box overcomes one-sample-per-track. Declared because it is per-step and
   *    no recipe uses it, since which sample to flip to is the reader's library.
   *
   * **Two of those five are not the same on both pools, and the list cannot say so.** `gate` is a
   * synth-track lane: p.66 has Gate View on a *drum* track showing micro steps, so a drum track
   * has no gate at all and its hits are as long as `DECAY` makes them (p.63). `micro-step` is on
   * both and reached by two different gestures — Shift + Gate on a synth (p.48), plain Gate View
   * on a drum (p.66) — which is why `hints` carries `synth-micro-step` and `drum-micro-step`
   * rather than one key. `perStep` is one flat list of names per device with nowhere to record
   * either fact, so both live here and in the `noteDuration` comment below, which is the same
   * divergence seen from the other side.
   *
   * **`sidechain.fromExternalAudio` is `false`, and it was `true` here for a commit because p.93
   * reads naturally the wrong way round.** That page opens *"Each of the synth tracks and external
   * audio inputs (represented by the MIDI tracks) can be Side Chained"*, so external audio is all
   * over the feature — and `lib/core/sidechain.ts` is explicit that the flag *"records where the
   * **trigger** comes from, never what is being ducked"*. On this box the inputs are the thing
   * ducked, and the trigger is enumerated on the same page: *"Pads 5 to 8 on the top row let you
   * select which Drum track will be the side chain trigger"* — four options, all internal.
   *
   * This is the TR-1000's mistake exactly, on the same field, from the same shape of sentence,
   * and that manifest's comment is what named it. The cost of getting it wrong is a guide telling
   * a reader to patch a cable into `Inputs 1` to duck the synths, which would do nothing.
   *
   * `lfo` is two per synth track with a `rate sync` value alongside the free rate (Programmer's
   * Reference p.4), and the destinations are the Mod Matrix Table's own (p.9), abbreviated to
   * the families a reader would recognise on a menu.
   */
  features: {
    perStep: ['velocity', 'gate', 'probability', 'micro-step', 'sample-flip'],
    sidechain: { internal: true, fromExternalAudio: false },
    lfo: {
      count: 2,
      syncable: true,
      destinations: [
        'osc pitch',
        'osc v-sync',
        'osc pulse width',
        'osc level',
        'noise level',
        'ring modulation level',
        'filter drive amount',
        'filter frequency',
        'filter resonance',
        'LFO rate',
        'amp envelope decay',
        'filter envelope decay',
      ],
    },
  },

  /**
   * §2.6/#111. **The box arrives full and no document lists what is in it**, which is
   * `shipped-library`.
   *
   * p.16: each synth track *"can use any of 128 Patches"*, each drum track *"any of 64 percussion
   * samples"*, and p.33 says the Patches *"have been developed specifically for Circuit Tracks"*.
   * So a reader is not starting from an empty box, and Preset View is where they look. What no
   * page anywhere does is print a name: there is no patch list and no sample list in either
   * document, which is why every drum recipe here describes its audio in prose instead of naming
   * an entry the way a TR-1000 recipe names a `GEN`.
   *
   * Not `enumerable` — no list exists to reference. Not `user-supplied` — the box ships the
   * content and telling a stock owner to source their own kick would be wrong. Not `unknown` —
   * the reading finished, and it finished with a *yes*.
   */
  content: {
    kind: 'shipped-library',
    library: '128 factory synth Patches and 64 factory drum samples',
    location: 'Preset View — select the track, then press Preset',
    reason: 'Neither document prints a patch or sample name, only the counts',
  },

  /**
   * §2.6/#142. **`noteDuration` is not declared, because this box holds two answers and the field
   * holds one.** It was declared as `per-note-value` on `Gate` for a commit, and that was wrong
   * for four of the six assignables.
   *
   *  - **On a synth track it is exactly that.** p.45, Gate View: *"The number represents the time
   *    – as the number of steps – for which the notes at the step will sound"*, on a sixteen-pad
   *    fader quantised to 96 values, with 16 tying the step to the next (p.51).
   *  - **On a drum track Gate View is not a gate at all.** p.66: *"To adjust the micro step
   *    values, press Gate View for the relevant drum track. Pads 17 to 22 display the micro step
   *    values."* The same button, the same view name, a different lane — and no note length
   *    anywhere in it. What decides how long a drum hit sounds is `DECAY`, the sample's own
   *    envelope on Macro 4 (p.63), which is a sound-design parameter and not a per-note value.
   *
   * The sibling manifest that misled this one is the MC-101's, whose `LEN` genuinely is one lane
   * on one step editor for both of its pools. Reading "one answer for both pools" across from
   * there is how the wrong claim got written; the pages above are what caught it.
   *
   * **The model gap, stated rather than worked around.** `NoteDuration` is device-level by
   * design, and `lib/core/device.ts` says a per-voice override is *"the right shape the day a box
   * genuinely holds two answers at once, and no manifest here does"*. One does now. Declaring the
   * synth answer would print `Gate 4` under a drum part whose Gate View shows micro steps;
   * declaring nothing makes the Hook phase say the question is unestablished, which understates
   * what is known and misleads nobody. Widening the field is an engine change and belongs in an
   * issue, not in this folder (#57: the box not fitting is a finding).
   *
   * `capabilityEvidence` carries the reading at the `noteDuration` path as **`cited-against`**,
   * with a citation spanning pp.45, 63 and 66. It was `unknown` first, and that was the weaker
   * reading of the same three pages: `unknown` is a reading that ran out, and this one did not.
   * The pages answer, and what they answer is that no one device-level model is true of both
   * pools — a refutation of the field's premise, which is the state that carries a page.
   */

  /**
   * §2.6/#22. The page behind every capability fact above, keyed by field path — never in a
   * comment, which is the whole point of #22.
   */
  capabilityEvidence: {
    'clock.canSendClock': ug(105),
    'clock.canReceiveClock': ug(85),
    'clock.transport': ug(18),
    /**
     * #120's reasoned non-claim. The reading finished and the document does not answer, so this
     * is `unknown` rather than `unread`: both books are in `manuals/` and both were opened.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.85 describes following an external clock as automatic and p.105 describes leading as a default-on toggle, one paragraph each and neither choosing; the only self-description in either document is p.7’s "Novation Circuit Tracks Groovebox" on the packing list',
    },
    'io.main': ug(18),
    'io.individualOuts': ug(18),
    'io.audioIn': ug(18),
    /** The one `cited-against` here: a page that answers **no** to the claim the field makes. */
    'io.usbAudio': {
      kind: 'cited-against',
      reason: 'The rear-panel callout for the USB-C port states outright that it carries no audio',
      cite: ug(18),
    },
    /**
     * **`partly` (§2.6/#236), and the two states it was in before are both in this file's history
     * for a reason.**
     *
     * It read `ug(35)` for two commits, which was an overclaim: a `voices` entry covers everything
     * the array asserts, and this array asserts three things — two pools at their counts, six-note
     * polyphony on one, one-note on the other. Two of the three are on a page; the third is an
     * authoring choice no document supports.
     *
     * So it moved to `unknown`, and that was an *under*claim of the same fact. `unknown` says a
     * reading came back with nothing when this one came back with two thirds, and the entry had to
     * write the missing distinction into its own reason: *"one `voices` path covers all three
     * claims, so it cannot say two of them are cited and the third is not."* An author narrating a
     * limit of the model in prose is what #22 exists to stop, and it is what #236 was filed on.
     *
     * `partly` says it in the schema instead: the page that proves what it proves, and the half it
     * leaves open, as two fields because they are two different kinds of thing. The audit now
     * counts this apart from both `manual` and `undocumented`, which is the honest place for a
     * fact that is two thirds cited.
     */
    voices: {
      kind: 'partly',
      cite: { kind: 'manual', source: 'Circuit Tracks User Guide v3, pp.35 and 64' },
      proven:
        'p.35 gives the synth tracks six-note polyphony ("Circuit Tracks’ synth engines are six-note polyphonic") and p.64 the eight-track split ("two synths, two MIDI and four drums")',
      open:
        'no page in either document states a drum track’s playback polyphony — whether a step retriggering a sounding sample cuts it or overlaps it is nowhere — so the 1 here is an authoring choice, argued in the `voices` comment above and supported by nothing',
    },
    'features.perStep': ug(41),
    'features.sidechain.internal': ug(93),
    /**
     * A document answering **no**, which is what `cited-against` is for: p.93 enumerates the
     * trigger and every one of the four options is a drum track.
     */
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      reason:
        'p.93 enumerates the side chain trigger as Drum 1-4 and nothing else; the external audio inputs appear on that page as things being ducked, which is the opposite end of the feature from the one this field records',
      cite: ug(93),
    },
    'features.lfo': prg(4),
    content: ug(16),
    /**
     * **`cited-against`, and `unknown` was the weaker reading of the same pages.** `unknown` is
     * for a reading that ran out; this one did not — three pages answer, and the reason it was
     * first recorded as `unknown` is written into that entry's own text: *"the documents were
     * opened and they do answer, twice."* A state that says nobody found an answer is the wrong
     * home for a fact three pages settle.
     *
     * What they settle is a **no**, and this is the state that carries a page for it. The claim
     * `noteDuration` would make is that one duration model is true of this box. p.45 gives a
     * synth track a per-note Gate in steps; p.66 has Gate View on a *drum* track showing micro
     * steps, so there is no gate there to read; p.63 puts a drum hit's length on the DECAY macro,
     * which is sound design and not a per-note value. Three pages, two incompatible answers, one
     * device-level field — the documents refute the field's premise rather than falling silent.
     *
     * **It does not say this box has no note duration**, and the reason says so, because a reader
     * meeting `cited-against` on this path could take it that way and be wrong about half the
     * machine. The synth tracks have a real per-note Gate; what has no answer is the *device*.
     */
    noteDuration: {
      kind: 'cited-against',
      reason:
        'three pages answer and the answers are incompatible at device level: p.45 gives a synth track a per-note Gate in steps, p.66 has Gate View on a drum track showing micro steps rather than a length, and p.63 puts a drum hit’s duration on the DECAY macro, which is sound design and not a per-note value — so the pages refute the premise that one device-level model fits, rather than being silent on it, and this is not a claim that the box expresses no duration at all',
      cite: ugPages('pp.45, 63, 66'),
    },
    'jacks[Sync]': ug(18),
    'jacks[MIDI In]': ug(18),
    'jacks[MIDI Out]': ug(18),
    'jacks[MIDI Thru]': ug(106),
    'jacks[Inputs 1]': ug(18),
    'jacks[Inputs 2]': ug(18),
    'clock.sourceSetup[midi-din]': ug(105),
    'clock.sourceSetup[usb]': ug(105),
    'clock.sourceSetup[analog-clock]': ug(105),
  },

  /**
   * §3.3. The sockets something here references. The audio outputs and the headphone jack are
   * not declared: `io` already carries the audio path and nothing in this file patches them.
   *
   * **`MIDI Thru` carries no `clock` entry and that is a decision.** It is a hardware thru by
   * default, and Advanced Setup View can make it *"act as a second MIDI Out"* (p.106) — which
   * would then carry clock. Declaring the transport on both sockets would leave the rack choosing
   * between two holes for one cable, which is the ambiguity `JackSpec.clock` exists to prevent.
   * `MIDI Out` is the one that carries clock without anybody changing a setting, so it is the one
   * that claims it, and the thru's own note says what the other setting does.
   *
   * The USB-C port takes and sends clock over `usb` and is deliberately **not** a jack here: it
   * is bidirectional and `direction` is single-valued, so one entry would have to lie about half
   * of what it does. The transport is declared on `clock` where it belongs and needs no socket.
   */
  jacks: [
    {
      id: 'Sync',
      direction: 'out',
      signal: ['clock'],
      clock: ['analog-clock'],
      note: '3.5 mm TRS, 5 V — output only, there is no analogue sync input on this box',
    },
    { id: 'MIDI In', direction: 'in', signal: ['clock', 'midi'], clock: ['midi-din'] },
    { id: 'MIDI Out', direction: 'out', signal: ['clock', 'midi'], clock: ['midi-din'] },
    {
      id: 'MIDI Thru',
      direction: 'out',
      signal: ['midi'],
      note: 'A hardware thru by default; Advanced Setup View can make it a second MIDI Out (p.106)',
    },
    {
      id: 'Inputs 1',
      direction: 'in',
      signal: ['audio'],
      note: 'Unbalanced 1/4" TS, line level — mixes in, takes the FX, and can be ducked by a drum track',
    },
    { id: 'Inputs 2', direction: 'in', signal: ['audio'], note: 'Unbalanced 1/4" TS, line level' },
  ],

  /**
   * Gestures off the panel and the shortcut pages. Jogs, not documentation (invariant 7).
   *
   * The `macro-*` keys are the ones that matter most on this box, because a Macro shows no
   * number: the hint is how a reader knows which of eight encoders a value belongs under.
   *
   * **They split by track type, and the split is not cosmetic — the same encoder has two names.**
   * Macro 6 is `Resonance` on a synth track and `Distortion` on a drum track, and Macro 8 is `FX`
   * and `EQ`. One `macro-6` key printed the drum legend beside a synth's `FILTER RESONANCE`,
   * which is how this was found: in the rendered guide, not in a test.
   *
   * **The two halves are not equally solid, either.** p.63 on the drum tracks: *"Unlike the synth
   * Macros, the functions are fixed for drums"*, and the four even Macros are the only live ones.
   * The synth legends are weaker by the manual's own account — p.15 says they *"describe in
   * general terms each encoder's function as applied to the synth tracks for the default
   * Patches"*, and p.34 warns that *"With certain Patches, some Macros will be assigned a function
   * quite different to their normal one"*. So a `synth-macro-*` hint is a jog for a reader on a
   * factory patch and never a claim about every patch, and it is only used where the parameter is
   * the one the legend names. `FILTER DRIVE` matches no legend, so it takes `patch-editor`
   * instead of being filed under the nearest encoder.
   */
  hints: {
    'synth-macro-1': 'Synth: Macro 1 · Oscillator',
    'synth-macro-2': 'Synth: Macro 2 · Oscillator Mod',
    'synth-macro-4': 'Synth: Macro 4 · Filter Envelope',
    'synth-macro-5': 'Synth: Macro 5 · Filter Frequency',
    'synth-macro-6': 'Synth: Macro 6 · Resonance',
    'synth-macro-8': 'Synth: Macro 8 · FX',
    'drum-macro-2': 'Drum: Macro 2 · Pitch',
    'drum-macro-4': 'Drum: Macro 4 · Decay',
    'drum-macro-6': 'Drum: Macro 6 · Distortion',
    'drum-macro-8': 'Drum: Macro 8 · EQ',
    'patch-editor': 'Novation Components, or over MIDI',
    'open-fx': 'Press FX, then turn this track’s Macro',
    'open-tempo': 'Press Tempo/Swing, turn Macro 2',
    'edit-velocity': 'Press Velocity, hold the step',
    'edit-gate': 'Synth: press Gate, hold the step',
    'edit-probability': 'Shift + Pattern Settings, hold the step',
    'synth-micro-step': 'Synth: Shift + Gate, hold the step',
    'drum-micro-step': 'Drum: press Gate, hold the step',
    'pick-sample': 'Select the track, press Preset',
  },

  manual: { title: 'Circuit Tracks Programmer’s Reference Guide', edition: 'v3' },

  recipes: [...DRUM_RECIPES, ...SYNTH_RECIPES],
}
