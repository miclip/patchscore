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
 *     reached, and ranges for **community-added parameters only**: the advanced arpeggiator's
 *     `RHYTHM` and `RATCHET PROBABILITY`, and the `FILTER ROUTE` option set. Cited as `manual`
 *     with the tag in the source string, because a citation to a moving target that does not name
 *     the tag means nothing.
 *   - the unit — nothing here, deliberately. See below.
 *
 * **The split is strict, and it costs something.** A community menu doc stating a bound for a
 * *stock* parameter is not a substitute for the guidebook: it is prose about a moving target,
 * describing one firmware's behaviour, where the guidebook prints the box's own documented value.
 * So the envelope stages and the wavetable position are not authored here at all — the community
 * envelope menus do say "0 represents the minimum attack time, 50 represents the maximum", and
 * the guidebook prints no range for ADSR anywhere. Recipes are built from parameters the
 * guidebook does range: EQ, decimation and bitcrush, delay, reverb send, mod FX, arp gate and
 * octaves, pan.
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
 *   - **Envelope `ATTACK`/`DECAY`/`SUSTAIN`/`RELEASE` and wavetable `POSITION`.** See the source
 *     split above: the guidebook prints no range for either.
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

/** §3.2: the option set is legality and is cited; the selection is authority and is taste. */
function pick(name: string, value: string, options: string[], where: Cite): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: options, verified: where },
    verified: false,
  }
}

// ---------------------------------------------------------------------------
// Option sets, as the sources enumerate them
// ---------------------------------------------------------------------------

/**
 * p.81, verbatim: "Waveform Options. Digital: Sine, Saw, Square, Triangle. Analog Modelled:
 * Analog Saw, Analog Square. Audio: Wavetable, Sample, IN (Expandable to INL, INR, INLR)". The
 * `IN*` types monitor the physical inputs under stated conditions, so no recipe selects one —
 * they are listed because the option set is what the box offers, and trimming it to what happens
 * to be authored hides the box.
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
  {
    id: 'deluge-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Kit-row kick, bass lifted, edge from decimation',
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('REPEAT MODE', 'ONCE', REPEAT_MODES, cite(81)),
      num('EQ BASS AMOUNT', 33, Z50, cite(219), { note: '25 is neutral; above boosts' }),
      num('EQ BASS FREQUENCY', 14, Z50, cite(219)),
      num('DECIMATION', 6, Z50, cite(217), { mood: [{ axis: 'grit', amount: 10 }] }),
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
      pick('OSC TYPE', 'Sine', OSC_TYPES, cite(81)),
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
      pick('OSC TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Wavetable', OSC_TYPES, cite(81)),
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
      pick('OSC TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
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
      pick('OSC TYPE', 'Analog Square', OSC_TYPES, cite(81)),
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
      pick('OSC TYPE', 'Square', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Analog Saw', OSC_TYPES, cite(81)),
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
      // The DX7 engine is an OSC1 type on the subtractive engine (`dx_synth.md`). Its own
      // parameters — operator levels, coarse tuning, algorithm, feedback — carry no documented
      // range in any source, so none of them is authored here.
      pick('OSC 1 TYPE', 'DX7', [...OSC_TYPES, 'DX7'], DX7_OPTIONS_CITE),
      num('REVERB AMOUNT', 30, Z50, cite(225), { mood: [{ axis: 'space', amount: 20 }] }),
      num('DELAY AMOUNT', 11, Z50, cite(222), { mood: [{ axis: 'space', amount: 8 }] }),
      num('EQ TREBLE AMOUNT', 22, Z50, cite(219), { mood: [{ axis: 'darkness', amount: -8 }] }),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { automation: 1 }, hint: 'automation-view' }],
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
      pick('REPEAT MODE', 'LOOP', REPEAT_MODES, cite(81)),
      num('BITCRUSH', 21, Z50, cite(217), { mood: [{ axis: 'grit', amount: 18 }] }),
      num('DECIMATION', 13, Z50, cite(217), { mood: [{ axis: 'grit', amount: 12 }] }),
      num('EQ BASS AMOUNT', 16, Z50, cite(219)),
      swing(),
    ],
    articulation: [{ slot: 'first-hit', set: { velocity: 70 } }],
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
      pick('OSC TYPE', 'Saw', OSC_TYPES, cite(81)),
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
    params: [
      pick('OSC TYPE', 'Sample', OSC_TYPES, cite(81)),
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
      pick('OSC TYPE', 'Triangle', OSC_TYPES, cite(81)),
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

  // Rear panel, p.6: MIDI In/Out on 5-pin DIN, USB-B carrying USB MIDI, a Clock In jack, and four
  // Gate/Trigger outs whose trigger clock has an "adjustable PPQN out / 192 PPQN out". So it
  // sends or receives clock over any of the three.
  clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb', 'analog-clock'] },

  // Two 1/4" main outs, "Right" and "Left / Mono" (p.6, p.8), plus a headphone out; line in and
  // mic in; the two CV outs and four gate/trigger outs are control voltage, not audio, so
  // `individualOuts` is 0. The guidebook documents USB-B as MIDI, power and USB host only — there
  // is no USB audio interface mode, so `usbAudio` is false.
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

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
    'osc-type': 'Hold [SHIFT], press the OSC type pad',
    'env-menu': 'Press (SELECT), turn to ENV 1',
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

  recipes: RECIPES,
}
