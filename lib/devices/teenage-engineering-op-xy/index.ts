import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type { AuthoredEnumParam, AuthoredNumericParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { OP_XY_PANEL } from './panel'

/**
 * teenage engineering OP-XY (§2.3). Eight instrument tracks in **one pool**, each of which can
 * hold any of the eight synth engines or any of the three samplers.
 *
 * ## This manual prints one numeric range in 135 pages
 *
 * Not "few". One. Every synth engine, every effect, the envelopes, the filter, all four LFOs,
 * every send and the whole mix section is described the same way — *"rotate the dark gray knob
 * to adjust the cutoff"* — and then the sentence ends. There is no Range column, no parameter
 * appendix to go looking for, and no unit beside a knob.
 *
 * The exception is axis's `ratio`, p.93: *"goes from a detune (from 0-50) to ascending fifths
 * (from 51-100)."* Confirmed against a 200 dpi render, not the text layer. It is the only
 * `verified` numeric range in this file and `RATIO` below is the only numeric parameter.
 *
 * **Every other numeric is absent rather than given an invented `0-100`.** That is the Digitakt
 * II's rule (`lib/devices/elektron-digitakt-ii/index.ts`) applied to a manual thinner still —
 * three printed ranges there, one here — and it is why a recipe below reads as a chain of engine
 * and mode choices rather than a list of values. An earlier draft of this file gave every knob a
 * `0-100` range marked unverified. It produced 160 mood-inert parameters and a guide full of
 * bounds nobody had checked, which is the invented claim §3.1 exists to prevent wearing an
 * honesty badge.
 *
 * Three things that look like ranges and are not:
 *
 *  - **The midi CC table (p.122) prints a `range` column and every row says `0-127`.** That is
 *    the MIDI data range, and its `track parameters` row covers `cc 12-47` — the entire synth
 *    surface — so reading it as a parameter scale would put one bound on two hundred unrelated
 *    knobs. `CLAUDE.md`'s cited-wrong-range trap, third costume after the TR-8S's `SNAPPY` and
 *    the minilogue xd's `SHAPE`.
 *  - **Screenshot values are not defaults.** On four of the eight engine pages the header strip's
 *    labels do not match that engine's own parameter names — p.93's axis strip reads
 *    `shape 80 | ratio 80 | shape 80 | vibrato 80`, with `shape` twice and a `vibrato` axis does
 *    not have. Placeholder artwork.
 *  - **`26kHz` beside the filter graph on p.44** is an axis label on a picture, too small to
 *    resolve. Not cited.
 *
 * ### So the citations live on the option sets
 *
 * The guide names its modes even where it will not bound its knobs, and an enum's option list is
 * the legality claim exactly as a numeric range is (§3.2): the set is cited, the selection is
 * taste. That is the TR-1000's `GEN` pattern, and on this box it is nearly every citation there
 * is. With no numerics to carry them, the device declares **no mood axes at all** — the
 * documented way to decline an axis is to have no parameter that names it, and that is now
 * literally true here rather than an unverified range quietly swallowing the offset.
 *
 * **`ENGINE` is cited to a page span, deliberately.** p.92 states *"OP-XY features 8 synth
 * engines"* and prints **no list**; the names exist only as the nine §20 section headings,
 * pp.93-101. Citing the set to p.92 would be exactly the error the Digitakt II manifest records
 * against itself — a citation carried over from an adjacent page rather than read off the one
 * carrying the claim — so the source names the span where each option is actually printed.
 *
 * ## Reading this manual: the OCR substitutes digits for letters
 *
 * The text layer is Adobe Paper Capture over outlined artwork. p.55 extracts *settings* as
 * `sett1n s` — a `1` for an `i` and a dropped `g`. Anything it does to prose it will do to a
 * number, and a value with a corrupted digit is untraceable. **Every digit in this file was
 * confirmed against a rendered page**, including the folio it is cited to: `0-50`/`51-100`
 * (p.93), the ten printed velocity values (p.31), `8 synth engines` (p.92), `24 different one
 * shot samples` (p.79), `20 seconds` (p.75), `24-voice polyphony` (p.1), and the electrical
 * figures on p.3.
 *
 * Printed folio = PDF page − 4 for PDF 5-56; **PDF 57 is unnumbered**; = PDF − 5 for PDF 58-135.
 * Established by rendering the page-number corner of twenty-seven pages across the book and
 * reading them, rather than by extracting text. The front-of-book index is separately one low in
 * places — it puts §15.3 at 55, §18.4 at 80, §19 at 81 and §22 at 104 — so nothing here is cited
 * from it.
 *
 * ## Two capacity facts a reader needs and the model can only half hold
 *
 * **The multi-out is one jack with six mutually exclusive modes** (p.87): midi, cv/gate, sync8,
 * sync16, sync24, audio. Choosing one forecloses the other five, and *"multi-out cannot be
 * changed while plugged in"*. So this box cannot simultaneously clock a drum machine over
 * sync24, sequence a synth over MIDI, drive a modular over cv/gate and run an effects loop — it
 * does one of those at a time. `ClockSpec` cannot say "and then the MIDI transport is gone", so
 * the constraint rides on the jack's own note, which reaches the rig phase.
 *
 * **The eight auxiliary tracks are fixed in purpose and are not assignables**: aux 1 brain
 * (p.54), aux 2 punch-in FX (p.55), aux 3 external midi (p.56), aux 4 external cv (p.58), aux 5
 * external audio (p.59), aux 7 FX I and aux 8 FX II (p.63). They are the box's own routing, not
 * eight more places to put a part. p.5 calls all sixteen "tracks" and p.1's highlights say "16
 * programmable tracks"; p.42 is the one that governs here — *"instrument mode holds 8 instrument
 * tracks"*.
 */

/**
 * Every page below is a **printed folio**, read off that page's own rendered footer — never off
 * the OCR text layer and never off the front-of-book index.
 */
function cite(page: number): Cite {
  return { kind: 'manual', source: `OP-XY full guide v1.1.15, p.${page}` }
}

/** For an option set the manual prints across a span of pages rather than on one. */
function citeSpan(span: string): Cite {
  return { kind: 'manual', source: `OP-XY full guide v1.1.15, ${span}` }
}

/**
 * An enum: the option *set* is the legality claim and carries the page that prints it, the
 * *value* is taste and stays provisional (§3.2). On this box these are almost all the citations
 * there are.
 */
function pick(
  name: string,
  value: string,
  options: readonly string[],
  source: Cite,
  extra: Partial<AuthoredEnumParam> = {},
): AuthoredEnumParam {
  return {
    kind: 'enum',
    name,
    value,
    options: { values: [...options], verified: source },
    verified: false,
    ...extra,
  }
}

/**
 * **The only numeric helper, for the only parameter with a printed range.** Written as a
 * one-parameter special case rather than a general `num(name, value, bounds, page)` so that a
 * second numeric cannot appear without somebody writing a second page number and meaning it.
 *
 * p.93 gives the scale and where it divides. It does not say where a recipe should sit inside
 * it, so the point is taste and stays `verified: false` like every other point in this library.
 */
function axisRatio(value: number): AuthoredNumericParam {
  return {
    kind: 'numeric',
    name: 'RATIO',
    value,
    range: { min: 0, max: 100, verified: cite(93) },
    verified: false,
    hint: 'engine',
    note: '0-50 detunes the second oscillator; 51-100 stacks ascending fifths',
  }
}

// ---------------------------------------------------------------------------
// Option sets, exactly as the manual enumerates them
// ---------------------------------------------------------------------------

/**
 * The nine §20 headings, pp.93-101 — one engine per page, in the manual's own order. `external`
 * is among them and no recipe selects it: p.96 makes it a MIDI sequencing track rather than a
 * sound, and a part on it is sounded by another box carrying its own assignables.
 */
const ENGINES = [
  'axis',
  'dissolve',
  'epiano',
  'external',
  'hardsync',
  'organ',
  'prism',
  'simple',
  'wavetable',
] as const
const ENGINE_SET = citeSpan('§20 pp.93-101, one engine per page')

/** The three §18 samplers, each printed as its own heading: p.77, p.79, p.83. */
const SAMPLERS = ['one shot synth sampler', 'drum sampler', 'multisampler'] as const
const SAMPLER_SET = citeSpan('§18 pp.77-83, one sampler per section')

/** p.43: *"rotate the dark gray knob to select between poly, mono and legato."* */
const PLAY_MODES = ['poly', 'mono', 'legato'] as const

/**
 * p.33, arpeggio. The manual writes *"patterns include: up / down / up/down / up/repeat/down /
 * random / play order"* — **"include", not "are"** — so this is a set of options proven
 * available rather than a proven-complete list, which is all an enum's legality gate claims.
 */
const ARP_PATTERNS = ['up', 'down', 'up/down', 'up/repeat/down', 'random', 'play order'] as const

/** The six §21 send effects, one per heading, pp.103-108. p.102 gives the count and no names. */
const SEND_FX = ['chorus', 'delay', 'distortion', 'lofi', 'phaser', 'reverb'] as const
const SEND_FX_SET = citeSpan('§21 pp.103-108, one effect per section')

/**
 * p.59, the external audio track's input list, printed in full: *"you can select from: mic,
 * headset, audio input, usb audio and main output."* `main output` is the resampling path.
 */
const SAMPLE_INPUTS = ['mic', 'headset', 'audio input', 'usb audio', 'main output'] as const

/**
 * The whole role sheet, and the box earns it. Each of the eight tracks takes *any* engine or
 * *any* of the three samplers (p.42), so there is no role one track can reach and another
 * cannot — which is what makes this a single pool where the Tracker Mini needs two.
 */
const TRACK_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture',
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
]

/**
 * What to load on a sampler track, and how to get it there.
 *
 * `need` is prose and stays prose (§3/#101) — a closed vocabulary of source kinds would be a
 * fifth shared vocabulary, which invariant 3 forbids. `prep` carries p.75's sampling procedure,
 * which the manual does print; which recording suits a dark kick is on no page and is never
 * cited.
 */
function drumAudio(need: string) {
  return {
    need,
    prep: {
      text: 'Press [sample] from any screen; the white knob sets the record threshold and recording starts when the input crosses it (p.79). Maximum 20 seconds.',
      verified: cite(75),
    },
    hint: 'sample',
  }
}

/**
 * A drum-sampler part: which sampler, and which input the audio came from.
 *
 * There is nothing else honest to add. The drum sampler's own four controls are source, gain,
 * threshold and key select (p.79); gain and threshold are recording settings rather than sound
 * design, and neither carries a scale.
 */
function drumPart(input: string): AuthoredEnumParam[] {
  return [
    pick('ENGINE', 'drum sampler', SAMPLERS, SAMPLER_SET, { hint: 'engine' }),
    pick('SAMPLE SOURCE', input, SAMPLE_INPUTS, cite(59), { hint: 'sample' }),
  ]
}

/**
 * §4.3. **`velocity` is not a continuous parameter on this box.** p.31's reference table gives
 * the step component ten printed values — 4, 8, 16, 32, 64, 100, 112, 127, 0 and random, one per
 * accidental key — and those are the only velocities a step component can force. Every value
 * used below is one of the ten, read off a 300 dpi render of that table.
 */
function velocity(slot: 'accent' | 'backbeat' | 'offbeat' | 'ghost', value: number) {
  return { slot, set: { velocity: value }, hint: 'step-velocity', verified: cite(31) }
}

const recipes: Recipe[] = [
  // ---------------------------------------------------------------------------
  // Drum sampler parts (p.79) — 24 one-shots across the keyboard on one track.
  // ---------------------------------------------------------------------------
  {
    id: 'opxy-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'track',
    title: 'Drum sampler kick, tight and forward',
    sourceAudio: drumAudio('A short, dry kick one-shot with its weight low and no audible tail'),
    params: drumPart('audio input'),
    articulation: [velocity('accent', 127), velocity('ghost', 32)],
    routing: 'Percussion group — p.73: any percussive engine routes there automatically',
  },
  {
    id: 'opxy-kick-soft',
    role: 'kick',
    character: 'soft',
    voice: 'track',
    title: 'Drum sampler kick, round and long',
    sourceAudio: drumAudio('A soft-attack kick one-shot with an audible tail'),
    params: drumPart('audio input'),
    articulation: [velocity('ghost', 32)],
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'track',
    title: 'Drum sampler snare, cracked',
    sourceAudio: drumAudio('A snare one-shot with a hard transient and a short body'),
    params: drumPart('audio input'),
    articulation: [velocity('backbeat', 127), velocity('ghost', 16)],
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'track',
    title: 'Drum sampler clap, wide',
    sourceAudio: drumAudio('A layered clap one-shot with a stereo spread'),
    params: drumPart('audio input'),
    articulation: [velocity('backbeat', 112)],
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'track',
    title: 'Drum sampler rim, dry',
    sourceAudio: drumAudio('A rimshot or cross-stick one-shot with no tail'),
    params: drumPart('audio input'),
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-closed-hat-bright',
    role: 'closed-hat',
    character: 'bright',
    voice: 'track',
    title: 'Drum sampler closed hat, clipped',
    sourceAudio: drumAudio('A closed hi-hat one-shot, bright and very short'),
    params: drumPart('audio input'),
    articulation: [velocity('offbeat', 64), velocity('accent', 112)],
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'track',
    title: 'Drum sampler open hat, closing',
    sourceAudio: drumAudio('An open hi-hat one-shot with a long decay'),
    params: drumPart('audio input'),
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'track',
    title: 'Drum sampler tom, low and dropping',
    sourceAudio: drumAudio('A low tom one-shot with a falling pitch'),
    params: drumPart('audio input'),
    routing: 'Percussion group (p.73)',
  },
  {
    id: 'opxy-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'track',
    title: 'Drum sampler shaker, under the beat',
    sourceAudio: drumAudio('A shaker or light percussion one-shot'),
    params: drumPart('mic'),
    articulation: [velocity('ghost', 16)],
    routing: 'Percussion group (p.73)',
  },

  // ---------------------------------------------------------------------------
  // Synth engine parts. Each engine's four encoders are named on its own page and
  // scaled on none of them, so a recipe names the engine and the mode and stops.
  // ---------------------------------------------------------------------------
  {
    id: 'opxy-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'track',
    title: 'hardsync sub, sealed under the kick',
    params: [
      pick('ENGINE', 'hardsync', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'mono', PLAY_MODES, cite(43), { hint: 'play-mode' }),
    ],
    routing:
      'Melodic group — p.73: synth engines route there automatically. p.97 offers hardsync for "solid basses"; its sub encoder adds the octave below',
  },
  {
    id: 'opxy-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'track',
    title: 'prism bass, detuned across the mids',
    params: [
      pick('ENGINE', 'prism', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'mono', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX I', 'distortion', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.99 gives prism as "bread and butter basses"; detune is its third encoder',
  },
  {
    id: 'opxy-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'track',
    title: 'axis pad, slow strings',
    params: [
      pick('ENGINE', 'axis', ENGINES, ENGINE_SET, { hint: 'engine' }),
      /** The only numeric on this device. See `axisRatio`. */
      axisRatio(34),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX I', 'reverb', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.93 calls axis an fm engine "tailored for creating lush string sounds"',
  },
  {
    id: 'opxy-pad-dark',
    role: 'pad',
    character: 'dark',
    voice: 'track',
    title: 'dissolve pad, tonal noise',
    params: [
      pick('ENGINE', 'dissolve', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX II', 'reverb', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.94 gives dissolve as "a tonal noise synth engine, perfect for ambient pads"',
  },
  {
    id: 'opxy-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'track',
    title: 'prism lead, wide and cutting',
    params: [
      pick('ENGINE', 'prism', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'legato', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX I', 'delay', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.99 offers prism for "synth leads"; stereo is its fourth encoder',
  },
  {
    id: 'opxy-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'track',
    title: 'hardsync stab, jabbed',
    params: [
      pick('ENGINE', 'hardsync', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
    ],
    routing: 'Melodic group (p.73). p.97: hardsync is "perfect for stabs, jabs and solid basses"',
  },
  {
    id: 'opxy-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'track',
    title: 'simple through the arpeggio player',
    params: [
      pick('ENGINE', 'simple', ENGINES, ENGINE_SET, { hint: 'engine' }),
      /** p.32: a player is added per track; p.33 prints the arpeggio's pattern list. */
      pick('PLAYER PATTERN', 'up/down', ARP_PATTERNS, cite(33), { hint: 'player' }),
      pick('FX II', 'delay', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing: 'Melodic group (p.73). p.100 gives simple as "great for leads and plucks"',
  },
  {
    id: 'opxy-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'track',
    title: 'simple squelch through distortion',
    params: [
      pick('ENGINE', 'simple', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'legato', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX I', 'distortion', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    /**
     * The first articulation on a melodic part here, and the step components are the same ones
     * the drum parts use: p.30 names the lanes for a *step*, not for a drum track, and p.31's
     * table is the same ten printed velocities either way. Both values below are off that table.
     *
     * 127 against 32 rather than something in between, because on a line like this the accent is
     * the loudest thing in it and the quiet steps are what make it read as one — the same
     * contrast `opxy-kick-hard` uses, on a part where it is the whole idiom rather than a detail.
     */
    articulation: [velocity('accent', 127), velocity('ghost', 32)],
    routing:
      'Melodic group (p.73). The squelch is M3 cutoff and resonance with envelope amount up (p.44) — the page names all three encoders and scales none of them. **Slide:** `PLAY MODE legato` above, so the line slides where one step runs into the next. `portamento` is a step component too (p.30) and its values sit in p.31’s table beside the velocities, but only the velocity row of that table has been read off the page — so no per-step portamento value is set here rather than one guessed at',
  },
  {
    id: 'opxy-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'track',
    title: 'dissolve bed, barely pitched',
    params: [
      pick('ENGINE', 'dissolve', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX II', 'reverb', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.94: dissolve’s swarm encoder "modulates the oscillators with noise"',
  },
  {
    id: 'opxy-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'track',
    title: 'wavetable bell, inharmonic',
    params: [
      pick('ENGINE', 'wavetable', ENGINES, ENGINE_SET, { hint: 'engine' }),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
      pick('FX I', 'chorus', SEND_FX, SEND_FX_SET, { hint: 'fx' }),
    ],
    routing:
      'Melodic group (p.73). p.101 ships nine wavetables and names none of them; the fourth encoder is what makes the tone inharmonic',
  },
  {
    id: 'opxy-vox-chop-clean',
    role: 'vox-chop',
    character: 'clean',
    voice: 'track',
    title: 'One-shot sampler vocal, played across the keys',
    realisation: 'sampled-chord',
    sourceAudio: {
      need: 'A single sustained vowel or a short vocal phrase, sampled or copied to the sample library',
      prep: {
        text: 'Sample it with [sample] (p.75), or copy an aiff or wav to the sample library over usb-c. A pitch in the file name, e.g. "a3", sets its root.',
        verified: cite(85),
      },
      hint: 'sample',
    },
    params: [
      pick('ENGINE', 'one shot synth sampler', SAMPLERS, SAMPLER_SET, { hint: 'engine' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_INPUTS, cite(59), { hint: 'sample' }),
      pick('PLAY MODE', 'poly', PLAY_MODES, cite(43), { hint: 'play-mode' }),
    ],
    routing: 'Melodic group (p.73)',
  },
]

export const device: Device = {
  id: 'teenage-engineering-op-xy',
  name: 'OP-XY',
  maker: 'teenage engineering',
  kind: 'groovebox',

  /**
   * §2.3, directional since #148/#149.
   *
   * **Sending is documented three times over.** p.113 sets the multi-out to `sync24` and says
   * *"clock, start, stop and reset will all be transmitted over the cable"*; p.114 does the same
   * for `sync8` (*"an 8th note clock"*); p.87 offers bluetooth midi. The multi-out's `midi` mode
   * (p.87) carries MIDI clock as any MIDI port does.
   *
   * **Receiving is real but thinner, and the difference is worth stating.** p.88, the system
   * settings midi page, is the general claim — it *"allows you to set how midi clock, notes and
   * other midi messages are sent and received"*. p.87 is explicit for bluetooth: *"sending and
   * receiving notes and clock"*. p.90's devices view shows a per-device `clock` row taking
   * `in`/`out`/`both`/`off`. What no page states in words is that the box's own transport
   * *follows* an incoming clock, so `canReceiveClock` rests on p.88's sentence and the
   * qualification reaches a reader through the jack note.
   *
   * `receiveTransport` omits `sync`, and that is not fussiness: the multi-out is an output. The
   * sync8/sync16/sync24 modes appear only as things OP-XY emits and there is no sync input on
   * the box, so declaring the transport bidirectionally would have the rack draw a cable into a
   * hole that does not exist — the Mother-32's finding (#57), one box later.
   *
   * `transport` uses `midi-din` though every MIDI hole here is 3.5 mm. `ClockTransport` is
   * semantic, and the forty-odd `midi-din` declarations in this library mean "MIDI down a MIDI
   * cable" as against USB. Inventing `midi-trs` would make this box unwireable with every other
   * one over a difference that is an adapter cable, and p.111 names the adapter, so the jack
   * does too.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'sync'],
    receiveTransport: ['midi-din', 'usb'],
    sourceSetup: [
      {
        transport: 'sync',
        path: 'com > light gray knob',
        value: 'sync24',
        note: 'sync8 and sync16 sit on the same knob. A vintage box wants a 3.5 mm to DIN sync cable. Multi-out cannot be changed with a cable in it.',
      },
      {
        transport: 'midi-din',
        path: 'com > light gray knob',
        value: 'midi',
        note: 'A type A TRS to MIDI DIN cable reaches a 5-pin box (p.111). This mode and sync are mutually exclusive.',
      },
      {
        transport: 'usb',
        path: 'com > M3 (devices) > clock',
        value: 'out',
        note: 'Set per connected device, from the devices view.',
      },
    ],
  },

  /** p.3: one 3.5 mm stereo line-out, no individual outs, a 3.5 mm stereo line-in, usb audio. */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10. **288 mm, and the one field here whose source is not the manual.**
   *
   * `verified: false` is not a workaround: it is the state `Verified` exists to express. `Cite`
   * has two kinds, `manual` and `observed` — a page somebody can turn to, or somebody who
   * measured the thing — and this figure is neither, so it renders provisional and says so. An
   * honest gap that is shown beats a number presented as fact (invariant 5).
   *
   * **Where 288 comes from**: teenage engineering's product page,
   * `teenage.engineering/store/op-xy`, which prints *"dimensions: 288 x 102 x 29 mm | 11.4 x 4 x
   * 1.2 in"* and *"weight: 900 g | 31.7 oz"*. 288 x 102 is the top face in playing orientation;
   * 29 mm is the thickness, and is not this field.
   *
   * **The manual does not carry it, and this note exists so nobody checks again.** §1.4
   * *technical specifications* (p.3) is where a size would sit and it lists the jacks, the
   * 16-hour battery, the 480 x 220 display and the 8 GB of storage; §1.5 gives levels, SNR,
   * impedance and gain. Neither prints a width, a depth or a weight. All 135 pages were rendered
   * and looked at to be sure of that, because `pdftotext` extracts nothing from a dimension
   * callout inside a drawing and a grep over the text layer would have proved nothing. The only
   * millimetre figures anywhere in the guide are connector sizes — 3.5 mm and 6.35 mm jacks.
   *
   * **The store figure and the panel drawing check each other, and neither derives from the
   * other.** `panel.ts` measures the p.5 figure at 300 dpi and gets 3049 x 1091 px, an aspect of
   * 2.7947; 288/102 is 2.8235. They agree to **1.02%** — a number from teenage engineering
   * landing within one per cent of a measurement taken off their drawing. Deriving the span from
   * that measured aspect instead would have been circular, and would have produced an invented
   * value with a citation-shaped comment beside it.
   */
  physical: {
    panelSpanMm: 288,
    // #191. Not `false`: teenage engineering publishes this and somebody checked it, which is
    // what `provisional` denied. The guide prints no dimension anywhere — §1.4 technical
    // specifications lists jacks, battery, display and storage — so the manual cannot carry it
    // and `maker` is the honest kind. The note above records the 1.02% agreement with the p.5
    // drawing, which is corroboration rather than the source.
    verified: { kind: 'maker', source: 'teenage engineering OP-XY product page, 288 x 102 mm' },
  },

  panel: OP_XY_PANEL,

  /**
   * p.3, all five on the right-hand edge, in the order the §1.3 callout draws them:
   * usb c · audio in · midi in · multi out · audio out.
   */
  jacks: [
    {
      id: 'audio out',
      direction: 'out',
      signal: ['audio'],
      note: '3.5 mm stereo line-out with headset mic support. 8 dBu, 2 Vrms (p.3).',
    },
    {
      id: 'multi out',
      direction: 'out',
      signal: ['audio', 'midi', 'clock', 'cv', 'gate'],
      clock: ['sync'],
      note: 'One jack, six mutually exclusive modes — midi, cv/gate, sync8, sync16, sync24, audio (p.87). Cannot be changed with a cable in it. CV on tip, gate on ring; ±5 V CV, 5.2 V sync/gate (pp.3, 58).',
    },
    {
      id: 'midi in',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: '3.5 mm TRS. The manual does not state which TRS type this input is — it names type A only for the multi-out (p.111). Clock arrives here per p.88, which says midi clock is sent and received without saying the transport follows it.',
    },
    {
      id: 'audio in',
      direction: 'in',
      signal: ['audio'],
      note: '3.5 mm stereo line-in. 13 kOhm, 0-31 dB analog gain (p.3). Reaches auxiliary track 5 (p.59).',
    },
    {
      id: 'usb c',
      direction: 'in',
      signal: ['audio', 'midi', 'clock'],
      clock: ['usb'],
      note: 'Audio/MIDI host and device (p.3). Class 1 and class 2 compliant interfaces only (p.117).',
    },
  ],

  /**
   * p.42: *"instrument mode holds 8 instrument tracks. an instrument can either be a sampler or
   * a built-in synth engine."* One pool, because nothing distinguishes track 3 from track 6.
   *
   * **`polyphony: 24` is the device's whole budget and the manual never divides it.** p.1's
   * highlights print "24-voice polyphony" for the box; p.43 establishes that a track can be set
   * to `poly`; no page states a per-track ceiling. 24 is therefore the largest chord this manual
   * supports on one track — an upper bound, not a claim that eight tracks each have 24. What the
   * model cannot express is that the eight share it, the same shape as the Tracker Mini's three
   * synth slots: a device-global budget the engine has no concept of. No template in this library
   * comes near it, so it is recorded here rather than improvised into the resolver.
   */
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 8,
      roles: TRACK_ROLES,
      polyphony: 24,
    },
  ],

  /**
   * `perStep` is this box's own step-component vocabulary, from the names on p.30 and the 14 × 10
   * reference table on p.31 — the one page in the guide dense with printed values, and the source
   * of every articulation above.
   *
   * **Sidechain: this box calls it `duck` and it is an LFO type in all but name** (p.46), sourced
   * from *"any of the 8 instrument (1-8) or 8 auxiliary (9-16) tracks as well as the metronome"*,
   * with a source type of audio or note data. `internal: true` is clean. `fromExternalAudio` is
   * `false` rather than true: auxiliary track 5 *is* the external audio input (p.59) and duck can
   * name any auxiliary track, so it looks reachable — but p.46 never mentions p.59 and p.59 never
   * mentions duck, and joining two pages into a capability neither states is an inference wearing
   * two citations. The reasoning is recorded at the evidence path instead.
   *
   * **`destinations` is empty, and that is the honest entry rather than a shrug.** p.45 gives the
   * count (one LFO per track) and pp.48-50 give the tempo sync, so two of this field's three
   * claims are cited. The third is not enumerable: the destination knob selects *a module and
   * then an encoder on it*, so the real destination set is every parameter on the track and it
   * changes with the engine loaded. Listing the four LFO *types* here — element, random, tremolo,
   * value — would be a category error, and an earlier draft of this file made it.
   */
  features: {
    perStep: [
      'pulse',
      'hold',
      'multiply',
      'velocity',
      'ramp-up',
      'ramp-down',
      'random',
      'portamento',
      'bend',
      'tonality',
      'jump',
      'skip-parameter-lock',
      'skip-step-component',
      'skip-trigger',
    ],
    sidechain: { internal: true, fromExternalAudio: false },
    lfo: { count: 1, syncable: true, destinations: [] },
  },

  /**
   * p.52: *"OP-XY comes with presets for every engine and category of sound."* Browsable and
   * un-enumerated, which is exactly `shipped-library`.
   *
   * Not `enumerable`: no page lists what ships. Three screenshots appear to — the projects folder
   * (p.37), the preset browser (p.52) and the sample library (p.85) — and they show the *same
   * seven names* as each other. A list reused across projects, presets and samples is mock data,
   * not an inventory, and a recipe naming one of them would put the manual's authority behind a
   * screenshot.
   *
   * Not `user-supplied` either, though p.85 reads that way on its own — it says *"OP-XY stores
   * all of your samples"* throughout and never claims factory samples. But presets ship (p.52)
   * and factory projects ship (p.37), so the box does not arrive empty.
   */
  content: {
    kind: 'shipped-library',
    library: 'factory presets for every engine and category, and a factory projects folder',
    location: 'shift + a track button for presets, shift + projects for the folder',
    reason:
      'pp.52 and 37 say both exist, and the only screens that look like inventories reuse one set of seven names across all three browsers',
  },

  /**
   * §8/#65. p.31's `hold` step component holds a step for 1 to 9 steps or a random count — a
   * per-note value entered on the step itself.
   */
  noteDuration: { kind: 'per-note-value', control: 'hold (step component)' },

  /**
   * §2.6/#22. Capability citations keyed by field path, never in a comment where `npm run audit`
   * cannot see them. Each `unknown` names what was read and where the reading ran out.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(113),
    'clock.canReceiveClock': cite(88),
    'clock.transport': cite(87),
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'No page argues this box should lead a rig rather than follow one. Sending clock is documented three times (pp.87, 113, 114) and receiving once in words (p.88), which is a difference in coverage rather than a printed preference.',
    },
    'io.main': cite(3),
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'p.3 lists every jack: one 3.5 mm stereo line-out, one multi-out, midi in, line-in and usb-c. The multi-out carries a stereo aux send in its audio mode (p.115), which is a routable send rather than a per-track individual out, and it is unavailable whenever the port is doing anything else.',
      cite: cite(3),
    },
    'io.audioIn': cite(3),
    'io.usbAudio': cite(3),
    voices: cite(42),
    'features.perStep': cite(30),
    'features.sidechain.internal': cite(46),
    'features.sidechain.fromExternalAudio': {
      kind: 'unknown',
      reason:
        'Reachable on the evidence and stated on no page. p.46 lets duck take any of the 8 auxiliary tracks as its source and p.59 makes auxiliary track 5 the external audio input, but neither page mentions the other, and joining them would be my inference rather than the manual’s claim.',
    },
    'features.lfo': cite(45),
    content: cite(52),
    noteDuration: cite(31),
    [jackFact('audio out')]: cite(3),
    [jackFact('multi out')]: cite(87),
    [jackFact('midi in')]: cite(3),
    [jackFact('audio in')]: cite(3),
    [jackFact('usb c')]: cite(3),
    [clockSourceSetupFact('sync')]: cite(113),
    [clockSourceSetupFact('midi-din')]: cite(87),
    [clockSourceSetupFact('usb')]: cite(90),
  },

  /** §8.1. Jogs, not documentation — under eight words each. */
  hints: {
    engine: 'Hold [shift], press [M1]',
    'play-mode': 'Hold [shift] in [M2]',
    fx: 'Auxiliary, then hold [shift] + [FX I]',
    player: 'Hold [shift], press [player]',
    sample: 'Press [sample], hold [M1] to record',
    'step-velocity': 'Hold [shift], velocity key, then a sharp',
  },

  manual: { title: 'OP-XY full guide', edition: 'v1.1.15' },

  productPage: 'https://teenage.engineering/products/op-xy',

  recipes,
}
