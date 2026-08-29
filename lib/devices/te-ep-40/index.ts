import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type { AuthoredEnumParam, Cite, Verified } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { EP_40_PANEL } from './panel'

/**
 * teenage engineering EP–40 riddim (§2.3). The K.O. II's chassis and workflow with three things
 * bolted on: a **fourth play mode, `loop`**, a **ten-preset synth engine called supertone**, and a
 * **seventh effect**. Otherwise it is the same box — four groups of twelve pads, every pad holding
 * one of 999 sample slots, one effect selector for the whole machine.
 *
 * ## A note on section numbers in this file
 *
 * `§` means `DESIGN.md`, everywhere in this repository. This box's documentation numbers its own
 * sections too — `8.2.1`, `11.10.1` — and several of them collide. So a reference to this box's
 * own documentation is written **`guide 8.2.1`**, never with a section sign, and `§` keeps its
 * usual meaning throughout.
 *
 * ## The document is a web guide, and every citation carries a date
 *
 * **There is no PDF.** `manuals/te-ep-40/` is a nineteen-page mirror of
 * `teenage.engineering/guides/ep-40`, taken 2026-08-28, in the shape `manuals/te-ep-133/`,
 * `manuals/torso-t1/` and `manuals/deluge-community/` already use. A live URL cited without a date
 * means nothing, because the page can change under the citation, so every `source` below is a
 * guide path plus `mirrored 2026-08-28`, and carries the guide's own section number because that
 * is finer than a slug.
 *
 * **Three citations are `maker` rather than `manual`**, and each names a live teenage engineering
 * page and the date it was fetched: `physical.verified` and `panel.ts`'s `verified` for the
 * dimensions and the drawing, and one recipe's `prep` for a sixth sound band the guide's own list
 * does not carry. See the `maker` helper below.
 *
 * ## Every reading in this file came from a page that was opened
 *
 * `manuals/te-ep-40/VERSION` carries the warning the sibling earned: a text mirror with no images
 * is *absence of images*, never evidence that a figure does not exist. So the live pages were
 * opened and their linked assets listed, which is where the front view `panel.ts` measures came
 * from, and where the dimensions and the polyphony came from. Nothing below is recorded as
 * unrecoverable without that check having been made.
 *
 * ## This guide prints no parameter range at all
 *
 * Not "few" — for a sound parameter, none. Amplitude, pitch, pan, attack, release, trim start and
 * length, the sample tempo, all fourteen FX knobs, the sidechain's length and shape, the supertone
 * preset parameters, the sampling input level and threshold, swing, the note velocity of a step:
 * every one is named, given a knob, and left unbounded. Guide 8.2.1 is representative — *"the
 * (knobY) knob controls pan. pan gradually adjusts whether the sample is played on the left, right
 * or center audio channels"* — and then the sentence ends.
 *
 * So this is the OP-XY's and the K.O. II's file on a third teenage engineering box, and the same
 * rule applies: **an absent range beats an invented `0-100`**. Every parameter below is therefore
 * an enum whose *option set* is cited and whose *selection* is taste (§3.2), and **this device
 * declares no mood axes**, because the documented way to decline an axis is to have no parameter
 * that names one.
 *
 * Four things in the guide look like ranges and are not:
 *
 *  - **The MIDI CC map (guide 14.3) prints a `range` column reading `1-27` four times.** Two of
 *    those rows are `fx parameter (knobx)` and `fx parameter (knobY)`, which is tempting because
 *    each maps onto exactly one control. It is a MIDI data range rather than a scale the box
 *    displays — and it is a wrong one, since the sibling's identical table reads `1-127` and 27 is
 *    not a MIDI ceiling. A column that is both the wrong kind of number and mistyped is not a
 *    source for anything.
 *  - **Tempo is printed twice, and the two disagree on purpose.** Guide 8.5: *"the lowest tempo is
 *    40 bpm and the highest is 399 bpm"*, then *"the (knobX) knob has a range of 60 bpm to 180
 *    bpm, but if you type in the numbers you can go all the way down to 40 bpm and all the way up
 *    to 399 bpm"*. Two real scales on one control, which is `CLAUDE.md`'s two-scale trap — and the
 *    reason it costs nothing here is that tempo belongs to the pattern, so §4.3 makes it the
 *    template's business and no recipe carries it.
 *  - **The MIDI note map (guide 14.2) runs 36-83**, with `keys mode: 0-127` beside it. Those are
 *    note numbers for an external controller, not a pitch parameter.
 *  - **The sample recording rates are the one exception and are genuinely values**: `26,250`,
 *    `32,000` and `46,875` Hz, printed as three named settings at system codes 500-502. They are
 *    an enum with actual numbers in it, and two recipes below reach for the low one.
 *
 * ## The supertone is a synth engine, and the guide stops one step short of every value in it
 *
 * This is the biggest difference from the K.O. II, which has no synthesis of any kind. Guide
 * 8.1.1: *"holding sound and pressing (DOTR) will allow you to select a supertone sound with pads
 * 0-9. there are ten supertone sounds including synthesizers and dub sirens"*, and *"each
 * supertone has two preset parameters that can be adjusted using the (knobx) and (knoby) knobs"*.
 * Guide 8.2.3 adds that on a supertone the TRIM page is replaced by those parameters, and that
 * they *"include: age, filter cutoff, filter resonance, unison, tone, length, sweep, lfo speed,
 * tune"*. The store page calls it *"subtractive synth engine"*.
 *
 * **What is missing is exactly what a recipe would need.** No page names one of the ten, no page
 * says which two of the nine parameters a given supertone carries, and no page prints a scale for
 * any of them. So the three supertone recipes below carry the navigation in `prep`, name the two
 * knobs in `routing`, and set no supertone value — because setting one would invent both the
 * number and the parameter it belongs to.
 *
 * `features.lfo` is `unknown` for the same reason and is worth its own line: *"lfo speed"* is in
 * that list, so there is an LFO on this box, which the sibling's manifest could rule out entirely.
 * `DeviceFeatures['lfo']` wants `count`, `syncable` and `destinations`, and the guide gives none
 * of the three. A reading that gets as far as "there is one" and no further is `unknown` with the
 * reason saying so, not a declaration with three guesses in it.
 *
 * ## `loop` is a fourth play mode, and it is the reason one recipe is a `pad`
 *
 * Guide 8.2.1 gives four modes where the sibling gives three, and the fourth changes what the
 * sequencer can do with the part: *"use loop to loop your samples, they will run in the background
 * staying in time"*, and *"as they are always running, they cannot be recorded to the sequencer
 * and the loop startup sequence must be used"*. Guide 9.3 is that sequence — hold the group pad
 * and `RECORD` for two seconds to store which loop pads are armed in the pattern.
 *
 * **A part the sequencer cannot record cannot bear a step pattern**, and `bearsPattern()` says
 * which roles are handed one: every role except `pad`. So `loop` appears on exactly one recipe
 * below, `ep40-pad-clean`, and every other recipe uses a mode the sequencer can record. That is
 * not a preference — a `loop`-mode `kick` would be a guide printing steps for a pad that refuses
 * them.
 *
 * ## The FX selector is one slot for the whole box, so no recipe names an effect
 *
 * Guide 11 gives *"each group can send to one master fx and the sum of the mix is sent through a
 * master compressor"*, with *"use (minus) and (plus) to navigate through the fx"* and *"move the
 * FADER to adjust the amount of fx on the current group"*. Read together that is **one effect
 * loaded at a time, chosen with `-`/`+`, with a per-group send level**. A recipe carrying
 * `FX reverb` would be setting a box-wide control from inside one part, and a guide with two such
 * recipes would contradict itself in a way a reader could not resolve at the machine. `ParamScope`
 * reaches `pattern` and `song` and neither is *device*, so there is nowhere honest to put it, and
 * the effects appear below only in `routing` prose, which a reader reads as advice rather than as
 * a setting with provenance. **This is #25**, and it is the third box in the library to hit it
 * after the SP-404MK2's shared effect slot and the K.O. II's.
 *
 * ## The guide contradicts itself in five places, and the reference page wins each time
 *
 * Recorded rather than smoothed over, the way `lib/devices/moog-subsequent-37/panel.ts` records
 * its manual's six.
 *
 *  - **How many effects there are.** Guide 11's opening sentence names six — *"delay, reverb,
 *    distortion, chorus, filter, and compressor"* — and then guide 11.7 documents a **phaser**
 *    with its own two knobs. The store page settles it at *"7 main fx and 12 punch-in™ fx"*, so
 *    the sentence is the stale one and the section list is right.
 *  - **How many sound edit pages there are.** Guide 8.2 says *"navigate through 5 edit modes"* and
 *    then prints six subsections: sound, trim, envelope, time, midi and mute groups — with a
 *    seventh, supertone parameters, which guide 8.2.3 says *replaces* trim rather than adding to
 *    it. Six is what is documented; the 5 is not reachable by any reading of the same page.
 *  - **MIDI clock.** Guide 12.11 step 8 says *"choose from off, on or out"*. The settings table in
 *    guide 14 says `100 off` / `101 in (receive only)` / `102 out (send only)`. The table is the
 *    reference and is what `clock` below is built on.
 *  - **The metronome options.** Guide 12.5 offers three — *"on"*, *"rec"*, *"cnt"* — and the guide
 *    14 table prints two, codes 400 and 401, with no `cnt`. Not modelled either way; named here so
 *    the next reader does not go looking for a setting that may not exist.
 *  - **Note intervals.** Guide 4.7 and guide 10.4 both give eight — `1/1, 1/2, 1/4, 1/8, 1/8T,
 *    1/16, 1/16T, 1/32`. Guide 7.2 step 9 gives five, dropping `1/1`, `1/2` and `1/4`. The eight
 *    is right, and it is the sibling's contradiction in the same words.
 *
 * Two smaller errors in the same document, neither load-bearing: guide 14's opening paragraph
 * tells the reader to *"customize the behavior of your Medieval"*, which is another product
 * entirely, and guide 8.2.6's `root note` paragraph is a verbatim copy of its `midi channel`
 * paragraph, so the root-note control is named and never described. The settings table also
 * repeats two codes (`331` and `421` each appear twice).
 *
 * ## MIDI clock is one direction at a time, and it is off out of the box
 *
 * The same single setting the sibling carries, and it has the most consequence of anything here:
 *
 *     100  mid  clk  off   MIDI Clock Off (default)
 *     101  mid  clk  in    MIDI Clock in (receive only)
 *     102  mid  clk  out   MIDI Clock Out (send only)
 *
 * `ClockSpec` has no way to say *"and choosing one forecloses the other"*, so the constraint rides
 * on `sourceSetup`'s note and on the two MIDI jacks' notes, where a reader setting up a rig meets
 * it. The default mattering is the second half: a reader handed *"sync the rig to the riddim over
 * MIDI"* and left to find `mid > clk > out` gets silence, because the box ships with MIDI clock
 * off entirely.
 *
 * **The analog sync jacks are the exception and are genuinely symmetric.** `syn > in` and
 * `syn > out` are separate settings with separate rates, both defaulting to 1/16, and guide 12.6
 * wires one riddim to another. So `sync` goes both ways with nothing foreclosed, and the asymmetry
 * above is a MIDI asymmetry rather than a property of the box.
 *
 * ## Four groups of twelve, modelled as forty-eight fungible pads
 *
 * Guide 6: *"each group holds a collection of 12 samples that can be sequenced in a group specific
 * pattern. each project holds four groups"*. Forty-eight pads, and a pad takes any of the 999
 * sounds, so nothing distinguishes one from another and one pool is the honest shape.
 *
 * **The groups are advisory even though this box prints them on its face.** Guide 7.1 step 3
 * recommends `A` drums, `B` bass, `C` melodies, `D` loops — and then says *"this layout is of
 * course optional and you can put whatever sounds you want into each group"*. Unlike the K.O. II,
 * whose group pads read `A`-`D`, this panel draws a **drum, a bass guitar, keyboard keys and a
 * disc** on the four pads, in that order, which is the recommendation printed on the hardware. It
 * is still the recommendation: the sentence that makes it optional is on the same page as the
 * layout, and the box does not refuse a bass in the drum group. Four pools of twelve would have to
 * either assert the layout as fact or carry the same recipes four times, since recipe lookup keys
 * on `poolId`; both are worse than one pool of forty-eight. `routing` names the group anyway,
 * because a reader standing at the box wants somewhere to put the part.
 *
 * **Two things one pool cannot say, both raised rather than worked around** (skill §6, #57):
 *
 *  - **The ordinal is a count, not a legend.** `Pad 37` is what the resolver prints and nothing on
 *    the panel says `37` — the twelve pads in each group are a numpad, labelled `.`, `0`, `enter`,
 *    `1`-`9`. The one document that orders all forty-eight is the MIDI note map (guide 14.2),
 *    which runs group `a` at notes 36-47, `b` at 48-59, `c` at 60-71 and `d` at 72-83 in exactly
 *    that pad order — so ordinal *n* is note *35 + n*. A reader does not need the mapping (any
 *    free pad will do, which is the point of a pool) but it exists, and #86 is where a pool that
 *    wants to name its members belongs.
 *  - **The polyphony is the device's, not the pad's.** See `voices` below.
 *
 * ## What is not modelled
 *
 * Note intervals, swing, quantize and free time, timing correct, pattern length in bars, scenes,
 * song positions, the commit button and the shift+tempo loop recorder are all the shape of a
 * pattern, which §4.3 makes the template's business (invariant 3). Keys mode's scales are harmony,
 * which is the template's too — a device naming a scale is a device naming a genre. The OS 2.5
 * notes add three more scales (`BLU`, `H.MI`, `M.MI`) to the ten the settings table prints and
 * move their selection onto `KEYS` + the knobs; the count is recorded here only so a reader
 * comparing the table with the box does not think something is broken.
 *
 * Mute groups, solo, live state's per-button lockout and the note-repeat arpeggiator are
 * performance gestures with no value to author; the ones that change how a part sits are named in
 * `routing` instead.
 */

const GUIDE = 'EP–40 riddim guide'
const MIRRORED = 'mirrored 2026-08-28'

/**
 * Every citation is a guide path and the guide's own section number, plus the date the mirror was
 * taken — the form `manuals/README.md` prescribes for a source with no edition and no page.
 *
 * No section sign: these strings are rendered to a reader, where `§` reads as a reference to this
 * project's own specification rather than to teenage engineering's guide.
 */
function cite(where: string): Cite {
  return { kind: 'manual', source: `${GUIDE}, ${where}, ${MIRRORED}` }
}

/**
 * A live teenage engineering page that is not the guide. **The fetch date is not optional** — a
 * live URL cited without one means nothing, because the page can change under the citation.
 *
 * `panel.ts` carries the fourth of these, for the front view it measures.
 */
function maker(page: string, path: string, what: string): Cite {
  return {
    kind: 'maker',
    source: `teenage engineering EP–40 riddim ${page}, teenage.engineering/${path}, ${what}, fetched 2026-08-28`,
  }
}

const HARDWARE = '/ep-40/hardware-overview 1.1'
const SYNC_CONN = '/ep-40/hardware-overview 1.2'
const WORKFLOW = '/ep-40/workflow 6'
const SOUND = '/ep-40/modes 8.1'
const SUPERTONE = '/ep-40/modes 8.1.1'
const PLAY_MODE_PAGE = '/ep-40/modes 8.2.1'
const TIME_PAGE = '/ep-40/modes 8.2.5'
const STEP_PAGE = '/ep-40/play-and-record 9.2'
const SAMPLE_FN = '/ep-40/functions 10.1'
const CHOP_PAGE = '/ep-40/functions 10.3'
const SIDECHAIN = '/ep-40/effects 11.10.1'
const SYNC_TO_RIDDIM = '/ep-40/how-to 12.6'
const RESAMPLE_CHORD = '/ep-40/how-to 12.12'
const SYSTEM = '/ep-40/system 14'
const SPECS = '/ep-40/tech-specs 16'

/**
 * An enum: the option *set* is the legality claim and carries the section that prints it, the
 * *value* is taste and stays provisional (§3.2). On this box these are all the citations there
 * are, because no sound parameter anywhere in the guide has a printed range.
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

// ---------------------------------------------------------------------------
// Option sets, exactly as the guide enumerates them
// ---------------------------------------------------------------------------

/**
 * Guide 8.2.1, printed as four headed paragraphs: *"oneshot is monophonic, and plays the whole
 * sample, one at a time"*, *"key is polyphonic, and allows you to play multiples of the same
 * sample at once"*, *"legato is monophonic, and plays a sample one at a time. when changing the
 * note while being held, it will continue playing from the same point as it was left off"*, and
 * *"use loop to loop your samples, they will run in the background staying in time"*.
 *
 * The fourth is the one the K.O. II does not have, and the module JSDoc has the argument for why
 * only one recipe below uses it.
 *
 * This is the one parameter on the box that decides whether a part can hold a chord, so every
 * recipe below carries it.
 */
const PLAY_MODES = ['oneshot', 'key', 'legato', 'loop'] as const

/**
 * Guide 8.2.5, the TIME page: *"the (knobX) knob sets the time stretch mode (BPM, BAR or
 * reverse)"*. `BPM` stretches to the project tempo from a sample BPM the reader sets; `BAR` fits
 * the sample to a chosen number of bars; `reverse` plays it backwards.
 */
const TIME_MODES = ['BPM', 'BAR', 'reverse'] as const

/**
 * Guide 10.1, the sampling source list, printed in full as nine lines. The parenthesised strings
 * are what the display shows and they are the guide's own — `rsp` is resampling, `L.IN` and `R.IN`
 * take one channel of the stereo input as a mono source.
 */
const SAMPLE_SOURCES = [
  'mic',
  'line in mono (in)',
  'line in stereo (in)',
  'resample mono (rsp)',
  'resample stereo (rsp)',
  'line in left mono (L.IN)',
  'line in right mono (R.IN)',
  'usb mono (usb)',
  'usb stereo (usb)',
] as const

/**
 * Guide 14, system codes 500-502 — the only enum on this box whose options carry real numbers.
 * The `whats-new` page spells them out: *"lo is 26,250khz - which is very lo-fi. mid is 32,000khz
 * - which adds some charater. hi is the standard 46,875khz"*. The `khz` is the guide's own typo
 * for Hz, so the option strings below say `Hz` and a note says the guide does not.
 *
 * It is a **recording** rate, not a playback rate: guide 10.2 says an imported file keeps its own
 * rate if that is lower. So it belongs to a recipe that records its own audio, and the two that
 * reach for `lo` both do.
 */
const SAMPLE_RATES = ['lo — 26,250 Hz', 'mid — 32,000 Hz', 'hi — 46,875 Hz'] as const

/**
 * Guide 10.3, the two auto-chop modes: *"equal length auto chop will slice the audio into perfect,
 * even slices"* and *"attack mode auto chop will slice the loudest parts of the sample"*. Live
 * chop is the third way to cut a sample and is a gesture rather than a mode, so it is not in the
 * set — the page puts it under its own heading and it sets nothing.
 */
const CHOP_MODES = ['equal length', 'attack mode'] as const

/**
 * Every role, and the box earns it for the same reason the OP-XY, the SP-404MK2 and the K.O. II
 * do: a pad is whatever sample is loaded into it, and the guide's own layout advice is explicitly
 * optional.
 */
const PAD_ROLES: Role[] = [
  'kick', 'sub', 'bass-mid',
  'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic',
  'tom', 'noise', 'texture',
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  'riser', 'impact', 'sweep',
]

// ---------------------------------------------------------------------------
// What to load, and how the guide says to get it there
// ---------------------------------------------------------------------------

/**
 * A part played from the factory library.
 *
 * `need` is prose and stays prose (§3/#101). `prep` is the guide's own navigation, and it is worth
 * more on this box than on most: guide 8.1 prints a **numeric banding** of the factory content —
 * *"kicks are stored from 1-99. snares from 100-199. hi-hats from 200-299. percussion from
 * 300-399. bass from 400-499. melodic sounds from 500-599."* — so a reader who cannot be told a
 * sample's name can still be told which hundred to scroll into. The band is the caller's, because
 * only the recipe knows which part it is.
 *
 * `source` defaults to that page. One caller overrides it: the guide's list stops at 599 and the
 * product page prints a **sixth band, `600-699 FX`**, which the guide never mentions. That is a
 * `maker` citation and it is passed in rather than assumed.
 */
function fromLibrary(need: string, band: string, source: Verified = cite(SOUND)) {
  return {
    need,
    prep: {
      text: `Hold [SOUND] and type the sound number on the pads, then [ENTER]; the factory ${band}.`,
      verified: source,
    },
    hint: 'sound',
  }
}

/**
 * A part the reader records themselves. Guide 10.1 is the whole procedure and prints it in two
 * sentences: *"press and hold a pad while in sample mode to start recording"*, with *"the (knobX)
 * knob controls input level"* and *"the (knobY) knob adjusts the threshold"*.
 *
 * The twenty and forty second ceilings are the OS 2.5 note rather than the specifications page,
 * which is why they are quoted with the mono condition attached — *"now you can record mono
 * samples up to 40 seconds long. just switch the sample type to mono"*.
 */
function sampled(need: string) {
  return {
    need,
    prep: {
      text: 'Press [SAMPLE], hold a pad to record — [X] sets input level, [Y] the threshold. 20 seconds in stereo, 40 in mono.',
      verified: cite(SAMPLE_FN),
    },
    hint: 'sample',
  }
}

/**
 * A part played from the built-in synth engine. Guide 8.1.1 is the whole navigation, and the two
 * preset knobs it mentions are named in each caller's `routing` rather than set here — no page
 * says which two parameters a given supertone carries, let alone what they read.
 */
function supertone(need: string) {
  return {
    need,
    prep: {
      text: 'Hold [SOUND] and press [.], then choose one of the ten supertone sounds on pads 0-9.',
      verified: cite(SUPERTONE),
    },
    hint: 'supertone',
  }
}

const recipes: Recipe[] = [
  // -------------------------------------------------------------------------
  // Drum parts. `oneshot` throughout: guide 8.2.1 makes it monophonic and
  // whole-sample, which is what a struck part wants and what leaves the
  // polyphony budget alone.
  // -------------------------------------------------------------------------
  {
    id: 'ep40-kick-hard',
    role: 'kick',
    character: 'hard',
    voice: 'pad',
    title: 'Factory kick, one-shot and forward',
    sourceAudio: fromLibrary(
      'A short, dry kick with its weight low and no audible tail',
      'kicks are sounds 1-99',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group A, the drum pad. Trim the head in SOUND EDIT if the sample has a run-up — the start point is on [X] there',
  },
  {
    id: 'ep40-kick-soft',
    role: 'kick',
    character: 'soft',
    voice: 'pad',
    title: 'Factory kick, round with the tail left on',
    sourceAudio: fromLibrary(
      'A soft-attack kick with an audible tail, nothing clipped off the end',
      'kicks are sounds 1-99',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group A. Release is on [Y] in SOUND EDIT ENV — turned up it keeps playing after the pad is let go',
  },
  {
    id: 'ep40-snare-hard',
    role: 'snare',
    character: 'hard',
    voice: 'pad',
    title: 'Factory snare, cracked',
    sourceAudio: fromLibrary(
      'A snare with a hard transient and a short body',
      'snares are sounds 100-199',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing: 'Group A',
  },
  {
    id: 'ep40-clap-bright',
    role: 'clap',
    character: 'bright',
    voice: 'pad',
    title: 'Factory clap, wide',
    sourceAudio: fromLibrary(
      'A layered clap with a stereo spread, bright at the top',
      'claps sit with the snares, sounds 100-199',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing: 'Group A',
  },
  {
    id: 'ep40-rim-clean',
    role: 'rim',
    character: 'clean',
    voice: 'pad',
    title: 'Factory rim, dry',
    sourceAudio: fromLibrary(
      'A rimshot or cross-stick with no tail at all',
      'percussion is sounds 300-399',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing: 'Group A',
  },
  {
    id: 'ep40-ghost-perc-soft',
    role: 'ghost-perc',
    character: 'soft',
    voice: 'pad',
    title: 'Shaker sampled off the built-in mic',
    sourceAudio: sampled('A shaker or light percussion hit, recorded close and quiet'),
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
    ],
    routing:
      'Group A. System setting 301 turns pad velocity on for a soft touch, which is what lets a shaker sit under the beat rather than on it',
  },
  {
    id: 'ep40-closed-hat-bright',
    role: 'closed-hat',
    character: 'bright',
    voice: 'pad',
    title: 'Factory closed hat, clipped short',
    sourceAudio: fromLibrary(
      'A closed hi-hat, bright and very short',
      'hi-hats are sounds 200-299',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group A. Hold [TIMING] and the pad for note repeat at the current interval — the fast way to lay hats in',
  },
  {
    id: 'ep40-open-hat-dark',
    role: 'open-hat',
    character: 'dark',
    voice: 'pad',
    title: 'Factory open hat, closing on its own decay',
    sourceAudio: fromLibrary(
      'An open hi-hat with a long decay and no top-end sizzle',
      'hi-hats are sounds 200-299',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group A. Put it in a mute group with the closed hat so the closed hit cuts it, the way a real pair behaves',
  },
  {
    id: 'ep40-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'pad',
    title: 'Factory ride, one hit with the wash left on',
    sourceAudio: fromLibrary(
      'A ride cymbal struck once, with a long shimmer and a clear bell',
      'hi-hats and cymbals are sounds 200-299',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group A. Keep it out of the hat mute group — a ride that gets choked by every closed hat stops being a ride',
  },
  {
    id: 'ep40-tom-dark',
    role: 'tom',
    character: 'dark',
    voice: 'pad',
    title: 'Factory tom, low and dropping',
    sourceAudio: fromLibrary(
      'A low tom with a falling pitch and a short body',
      'percussion is sounds 300-399',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing: 'Group A',
  },
  {
    id: 'ep40-metallic-bright',
    role: 'metallic',
    character: 'bright',
    voice: 'pad',
    title: 'Struck metal, played up the keyboard',
    sourceAudio: sampled('One hit on something metal — a pan, a bike frame, a radiator'),
    params: [
      pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
    ],
    routing:
      'Group C. Press [KEYS] to transpose the pad across the twelve pads — a metal hit an octave up is where the inharmonic ring lives',
  },
  {
    id: 'ep40-noise-dirty',
    role: 'noise',
    character: 'dirty',
    voice: 'pad',
    title: 'Reversed noise wash, recorded at the low rate',
    sourceAudio: sampled('Room noise, tape hiss or a cymbal wash — anything without a pitch'),
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'line in stereo (in)', SAMPLE_SOURCES, cite(SAMPLE_FN), {
        hint: 'sample',
      }),
      pick('SAMPLE RATE', 'lo — 26,250 Hz', SAMPLE_RATES, cite(SYSTEM), {
        hint: 'sample-rate',
        note: 'Set before recording; the guide writes these as “khz” and means Hz',
      }),
      pick('TIME STRETCH MODE', 'reverse', TIME_MODES, cite(TIME_PAGE), { hint: 'time-mode' }),
    ],
    routing: 'Group D',
  },

  // -------------------------------------------------------------------------
  // Low parts. `legato` rather than `oneshot`: guide 8.2.1 makes it monophonic
  // and continues from where the last note left off, which is what a bass wants.
  // -------------------------------------------------------------------------
  {
    id: 'ep40-sub-dark',
    role: 'sub',
    character: 'dark',
    voice: 'pad',
    title: 'Factory sub, legato under the kick',
    sourceAudio: fromLibrary(
      'A sine or near-sine bass note with no harmonics above the fundamental',
      'bass is sounds 400-499',
    ),
    params: [pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group B, the bass pad. Make it the sidechain destination and the kick pad its source — the duck runs on note triggers rather than audio, so it works even where the kick is quiet',
  },
  {
    id: 'ep40-bass-mid-dirty',
    role: 'bass-mid',
    character: 'dirty',
    voice: 'pad',
    title: 'Bass resampled at the low rate',
    sourceAudio: sampled('One held bass note with harmonic content through the mids'),
    params: [
      pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'line in mono (in)', SAMPLE_SOURCES, cite(SAMPLE_FN), {
        hint: 'sample',
      }),
      pick('SAMPLE RATE', 'lo — 26,250 Hz', SAMPLE_RATES, cite(SYSTEM), {
        hint: 'sample-rate',
        note: 'The guide calls this one “very lo-fi”; set it before recording, not after',
      }),
    ],
    routing: 'Group B. Distortion is on the FX selector if the rate alone is not enough',
  },
  {
    id: 'ep40-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'pad',
    title: 'Supertone bass, legato so notes run into each other',
    sourceAudio: supertone('One of the ten supertone sounds — the engine’s own bass tones'),
    params: [pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group B. Hold the pad in MAIN and turn [X] and [Y] for this supertone’s two preset parameters — the guide’s list of what those can be includes filter cutoff and filter resonance, and does not say which supertone carries which',
  },

  // -------------------------------------------------------------------------
  // Tonal parts. `key` is the guide's own word for polyphonic (guide 8.2.1), so
  // these are real polyphonic voices rather than chords baked into a sample —
  // with two deliberate exceptions below.
  // -------------------------------------------------------------------------
  {
    id: 'ep40-pad-soft',
    role: 'pad',
    character: 'soft',
    voice: 'pad',
    title: 'Sustained pad, stretched to the bar',
    sourceAudio: fromLibrary(
      'A slow, sustained tone with no transient — strings, a bowed sound, a held synth note',
      'melodic sounds are 500-599',
    ),
    params: [
      pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('TIME STRETCH MODE', 'BAR', TIME_MODES, cite(TIME_PAGE), {
        hint: 'time-mode',
        note: '[Y] then sets how many bars it is stretched to',
      }),
    ],
    routing:
      'Group C, the keys pad. Attack is on [X] in SOUND EDIT ENV — turned up it fades the sample in rather than playing it as recorded',
  },
  {
    id: 'ep40-pad-clean',
    role: 'pad',
    character: 'clean',
    voice: 'pad',
    title: 'Loop pad, armed by the loop startup sequence',
    sourceAudio: fromLibrary(
      'A bar or two of sustained material that can repeat without a seam',
      'melodic sounds are 500-599',
    ),
    params: [
      pick('PLAY MODE', 'loop', PLAY_MODES, cite(PLAY_MODE_PAGE), {
        hint: 'play-mode',
        note: 'A loop pad runs in the background and cannot be recorded to the sequencer',
      }),
      pick('TIME STRETCH MODE', 'BAR', TIME_MODES, cite(TIME_PAGE), {
        hint: 'time-mode',
        note: 'Loops need time stretch on or they drift when the tempo changes',
      }),
    ],
    routing:
      'Group D. Unmute the pad, then hold that group pad and [RECORD] for two seconds until LSS flashes — that stores the loop as armed in this pattern, which is the only way a loop reaches the sequence. This is the one part on the box that carries no steps',
  },
  {
    id: 'ep40-texture-soft',
    role: 'texture',
    character: 'soft',
    voice: 'pad',
    title: 'Field recording stretched across bars',
    sourceAudio: sampled('A field recording or room tone — anything with movement and no beat'),
    params: [
      pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
      pick('TIME STRETCH MODE', 'BAR', TIME_MODES, cite(TIME_PAGE), { hint: 'time-mode' }),
    ],
    routing: 'Group D',
  },
  {
    id: 'ep40-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'pad',
    title: 'Supertone lead, legato so it slides between notes',
    sourceAudio: supertone('One of the ten supertone sounds — the engine’s own lead tones'),
    params: [pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group C. Press [KEYS] to play it across the twelve pads. The two preset parameters are on [X] and [Y] while the pad is held in MAIN',
  },
  {
    id: 'ep40-stab-hard',
    role: 'stab',
    character: 'hard',
    voice: 'pad',
    title: 'Chord stab resampled onto one pad',
    realisation: 'sampled-chord',
    sourceAudio: {
      need: 'A chord, played once and short — the notes are inside the sample rather than played from the pads',
      prep: {
        text: 'Load a sound, press [KEYS], press [SAMPLE] then [+] for resampling, then [SHIFT] and a pad to record hands free while you play the chord.',
        verified: cite(RESAMPLE_CHORD),
      },
      hint: 'resample',
    },
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group C. Resampling is what makes this one a sampled chord — the chord is recorded into the pad, so one voice plays all of it',
  },
  {
    id: 'ep40-arp-clean',
    role: 'arp',
    character: 'clean',
    voice: 'pad',
    title: 'Plucked tone through the note-repeat arpeggio',
    sourceAudio: fromLibrary(
      'A short plucked tone with a clean decay — a mallet, a pluck, a muted string',
      'melodic sounds are 500-599',
    ),
    params: [pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group C. In KEYS mode, hold [TIMING] and several pads and they arpeggiate in the order pressed, at the current note interval',
  },
  {
    id: 'ep40-vox-chop-clean',
    role: 'vox-chop',
    character: 'clean',
    voice: 'pad',
    title: 'Vocal phrase auto-chopped across a group',
    sourceAudio: sampled('A sung or spoken phrase, two to four seconds, one voice and no backing'),
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
      pick('CHOP MODE', 'attack mode', CHOP_MODES, cite(CHOP_PAGE), {
        hint: 'chop',
        note: 'Attack mode cuts at the loudest points; equal length cuts an even grid',
      }),
    ],
    routing:
      '[SHIFT] and [SAMPLE] is CHOP — hold a group pad to pick the mode, then [−]/[+] for the number of slices, and it scatters the phrase across as many pads as it needs. Give it group D, since it takes several',
  },

  // -------------------------------------------------------------------------
  // Transitional parts (§4.2) — section-scoped rather than owning a voice.
  // -------------------------------------------------------------------------
  {
    id: 'ep40-riser-bright',
    role: 'riser',
    character: 'bright',
    voice: 'pad',
    title: 'Riser stretched to the bars it has to fill',
    sourceAudio: sampled('A rising sweep, noise or tone, recorded longer than the gap it fills'),
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'line in stereo (in)', SAMPLE_SOURCES, cite(SAMPLE_FN), {
        hint: 'sample',
      }),
      pick('TIME STRETCH MODE', 'BAR', TIME_MODES, cite(TIME_PAGE), {
        hint: 'time-mode',
        note: '[Y] sets the bar count — the guide’s example is one bar or two',
      }),
    ],
    routing: 'Group D',
  },
  {
    id: 'ep40-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'pad',
    title: 'Downbeat impact from the effects band',
    sourceAudio: fromLibrary(
      'A single loud hit with a long tail — a crash, a slam, a hit with reverb already on it',
      'sound effects are 600-699',
      maker(
        'product page',
        'products/ep-40',
        'soundbank bands 01-399 drums, 400-499 bass, 500-599 keys, 600-699 FX',
      ),
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group D. Keep it out of any mute group — a mute group cuts everything else in it, which is the opposite of what a section marker wants',
  },
  {
    id: 'ep40-sweep-bright',
    role: 'sweep',
    character: 'bright',
    voice: 'pad',
    title: 'Supertone siren, leant on for the turnaround',
    sourceAudio: supertone(
      'One of the ten supertone sounds — the pressure-sensitive siren rather than a bass or lead tone',
    ),
    params: [pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group D. System setting 301 turns pad velocity on, which is what makes the pressure do anything. The two preset knobs are on [X] and [Y] with the pad held',
  },
]

export const device: Device = {
  id: 'te-ep-40',
  name: 'EP–40 riddim',
  maker: 'teenage engineering',
  kind: 'sampler',

  /**
   * §2.3, directional since #148/#149 — and directional here for the same reason the K.O. II is:
   * **MIDI clock is a single three-way setting, so this box sends or receives over MIDI, never
   * both.** See the module JSDoc for the settings table.
   *
   * `transport` is the union of both directions, which is what the field means, and both
   * `sendTransport` and `receiveTransport` are omitted because each transport does go both ways —
   * just not at the same time over MIDI. The exclusivity is not a direction, and declaring one of
   * the two would say something false in a different way: that the box cannot follow a MIDI clock,
   * which it plainly can (`101 mid clk in`).
   *
   * **`sync` is genuinely symmetric and is the wire to reach for.** Guide 14 gives `syn > in` and
   * `syn > out` separate rates with separate defaults, the specifications page prints both sockets
   * with the same tip and ring assignment, and guide 12.6 wires one riddim's sync out to another's
   * sync in.
   *
   * `transport` uses `midi-din` though both MIDI holes are 3.5 mm. `ClockTransport` is semantic —
   * the forty-odd `midi-din` declarations in this library mean "MIDI down a MIDI cable" as against
   * USB — and the specifications page settles the connector question in the jack notes:
   * *"MMA compliant pinout (type A)"*, which is the standard a plain TRS MIDI cable expects.
   *
   * **Bluetooth is deliberately absent.** The `whats-new` page mentions *"BLE MIDI clock"* once,
   * in a release note about jitter, and no other page in the guide mentions Bluetooth at all — no
   * pairing, no setting, no socket, nothing on the hardware page or the specifications page. One
   * changelog line is not enough to declare a transport a reader would then be told to use.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'sync'],
    sourceSetup: [
      {
        transport: 'sync',
        path: 'system settings > syn > out',
        value: '16',
        note: 'Codes 210/211/212 are 1/8, 1/16 and sync24, and 1/16 is the default. Two riddim units both want 1/16 in and out. Sync24 to a vintage box wants a 3.5 mm to DIN cable — a MIDI cable will not work. The in and out rates are separate settings.',
      },
      {
        transport: 'midi-din',
        path: 'system settings > mid > clk',
        value: 'out',
        note: 'Code 102, and it is send-only: the same setting is how the box receives clock (101), so choosing out gives up following anything. It ships off (100).',
      },
      {
        transport: 'usb',
        path: 'system settings > mid > clk',
        value: 'out',
        note: 'One setting covers both MIDI ports — the guide never separates USB from TRS here, so setting it for one sets it for the other.',
      },
    ],
  },

  /**
   * Guide 16: one *"Stereo Line input"* and one *"Stereo Headphone/Line Output"* — the output jack
   * is both, not two sockets. USB audio arrived in OS 2.5: *"riddim supports stereo audio in, as
   * both a sample source and an audio source. as well as usb audio out, to record sound directly
   * into your DAW"*, with system codes 510/511 choosing whether the USB input is a sample source
   * only or is also monitored live.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10. **176 mm across, and this box is portrait.**
   *
   * `tech-specs` is the page a size would sit on and it is purely electrical — bit depth, SNR,
   * impedance, jack voltages, the 96 ppqn clock — with no mechanical section at all. Nineteen
   * pages, and the only millimetre figures anywhere are connector sizes (3.5 mm). So the source is
   * teenage engineering's own store page, which prints *"dimensions: 240 x 176 x 16 mm | 9.5 x 7 x
   * 0.7 in"*. That is `maker` (#191), not `provisional` and not `manual`: a figure the
   * manufacturer publishes outside the manual, checkable by anyone with the link.
   *
   * **Which of the three numbers is the span is decided by the drawing, not by their order.**
   * §2.3's aspect check settles it: the published front view's panel face measures 289.00 × 394.00,
   * an aspect of **0.73350**, against 176/240's **0.73333** — 0.023% apart, where 240/176 would be
   * out by 86%. So 176 is across, 240 is down, and 16 mm is the thickness, which is not this
   * field. `panel.ts` has the measurement, and the two side views corroborate the thickness at
   * 16.2 mm on the same scale.
   */
  physical: {
    panelSpanMm: 176,
    verified: maker(
      'store page',
      'store/ep-40',
      'dimensions: 240 x 176 x 16 mm — 176 across in playing orientation, per the published front view',
    ),
  },

  /**
   * §10. Measured off teenage engineering's published vector front view and redrawn — see
   * `panel.ts`, which carries the figure's URL, the method, the aspect check that settles the
   * orientation above, and the 8 mm module the measurement recovers.
   *
   * Its `verified` is `maker` rather than `manual` for the same reason `physical.verified` is: the
   * figure is published outside the manual, because this box has no manual to publish it in.
   */
  panel: EP_40_PANEL,

  /**
   * §3.3. Every socket the guide names. The two MIDI holes and the two sync holes are all 3.5 mm
   * TRS and none of them is a 5-pin DIN, which is on their notes because a reader arriving with a
   * standard MIDI cable needs to know what to bring.
   *
   * The built-in microphone is not here: guide 10.1 makes it a sampling source, not a socket, and
   * it is reachable in `SAMPLE_SOURCES` where it belongs.
   */
  jacks: [
    {
      id: 'output',
      direction: 'out',
      signal: ['audio'],
      note: '3.5 mm stereo, line and headphones on the same jack. 5 dBu, 1.4 Vrms',
    },
    {
      id: 'input',
      direction: 'in',
      signal: ['audio'],
      note: '3.5 mm stereo line in. 6.5 kOhm, 0-12 dB analog gain, 8 dBu max. It reaches the FX send from MAIN, with input gain on [X] and send level on [Y]. A turntable needs its own RIAA amp first',
    },
    {
      id: 'sync out',
      direction: 'out',
      signal: ['clock'],
      clock: ['sync'],
      note: '3.5 mm. Clock on tip, start/stop on ring, 3.3 V. Sync24 to a vintage box wants a 3.5 mm to DIN cable, not a MIDI cable',
    },
    {
      id: 'sync in',
      direction: 'in',
      signal: ['clock'],
      clock: ['sync'],
      note: '3.5 mm. Clock on tip, start/stop on ring, 10 V max',
    },
    {
      id: 'midi out',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: '3.5 mm TRS type A, MMA compliant pinout, 3.3 V. Clock leaves here only while mid > clk is set to out, which is also what stops it arriving',
    },
    {
      id: 'midi in',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: '3.5 mm TRS type A, MMA compliant pinout, opto-coupled. Clock arrives here only while mid > clk is set to in — it ships off',
    },
    {
      id: 'usb-c',
      direction: 'in',
      signal: ['audio', 'midi', 'clock'],
      clock: ['usb'],
      note: 'MIDI with clock and transport, class-compliant stereo audio in and out since OS 2.5, sample transfer and firmware. Also powers the box at 5 V, 1 A minimum',
    },
  ],

  /**
   * §2.2. **One pool of forty-eight** — guide 6: *"each group holds a collection of 12 samples"*,
   * four groups to a project — carrying every role, because a pad is whatever sound is loaded into
   * it. The module JSDoc has the argument against four pools of twelve, including why the
   * pictograms printed on this box's group pads do not change it.
   *
   * **`polyphony: 12` is the device's budget and no page divides it.** The guide states no
   * polyphony anywhere in nineteen pages; the store page's details list does, as *"12 stereo / 16
   * mono poly voices"*. Twelve is the smaller of the two and therefore the number that holds
   * whichever a pad's sample turns out to be — an upper bound on the largest chord one `key`-mode
   * pad can sound, not a claim that forty-eight pads each have twelve. What the model cannot
   * express is that they share it, which is the Tracker Mini's and the OP-XY's shape and is #25.
   *
   * **The provenance of that number is a comment and not a citation, which #22 is against**, and
   * the reason is structural rather than an oversight: `capabilityEvidence` has one `voices` path
   * for the whole field, the count and the roles come off guide 6, and there is nowhere to hang a
   * second source for the polyphony alone. The store page is
   * `teenage.engineering/store/ep-40`, fetched 2026-08-28.
   */
  voices: [
    {
      kind: 'pool',
      id: 'pad',
      label: 'Pad',
      count: 48,
      roles: PAD_ROLES,
      polyphony: 12,
    },
  ],

  /**
   * §12.4. Sixteen of forty-eight, and like the sibling's this one is anchored to a printed figure
   * rather than being pure judgement: sixteen mono voices is the whole box, so a seventeenth
   * occupied pad cannot be heard alongside the other sixteen.
   *
   * It is still a judgement, and the claim is deliberately the weaker one — not that seventeen
   * parts are impossible, but that past sixteen the guide is filling pads the box cannot sound at
   * once. Two other pressures point the same way and neither is countable: sampling writes to a
   * pad, chopping scatters one sample across several, and the 999 slots share 128 MB.
   */
  comfortableVoices: 16,

  /**
   * §2.6/#111. **The box arrives loaded and no document names one sound.** Guide 8.1: *"out of the
   * box Riddim will come loaded with over 300 samples"*, and guide 7.1: *"by default, all 9
   * projects will have songs"* — where the K.O. II ships five populated and four empty, this one
   * ships nine. `erase-drive` confirms it from the other side: *"this will remove all your work
   * including all factory sounds"*.
   *
   * `shipped-library` rather than `enumerable`, and the distinction is sharper here than usual
   * because the guide gets *close* to a list. Guide 8.1 prints a **numeric banding** — kicks 1-99,
   * snares 100-199, hi-hats 200-299, percussion 300-399, bass 400-499, melodic 500-599 — which is
   * navigation, not an inventory: it says which hundred to scroll into and names nothing inside
   * it. A recipe cannot reference an entry from a band, so every recipe above still describes its
   * audio in prose and puts the band in `prep`, which is what `reason` says.
   *
   * **The guide's list is one band short**, and the sixth is on the product page rather than in
   * the guide: `600-699 FX`. One recipe reaches for it and carries that `maker` citation itself.
   *
   * The `credits` page lists forty-odd contributors by name and attaches no pack, kit or sample to
   * any of them, so it is not an inventory either.
   */
  content: {
    kind: 'shipped-library',
    library: 'over 300 factory samples, and all nine projects arrive with songs in them',
    location:
      'SOUND mode — hold [SOUND] and type the number; the factory bands are kicks 1-99, snares 100-199, hi-hats 200-299, percussion 300-399, bass 400-499, melodic 500-599, and sound effects 600-699',
    reason:
      'the sound page gives the count and the number bands and names not one sample; it also says a sample only has a name at all if it was imported or renamed with the EP Sample Tool',
  },

  /**
   * §2.6/#142. Guide 9.2: *"hold (shiftr) and turn (knoby) to change the note duration of all
   * notes in a chosen step. the maximum note duration is one bar and the minimum is one tick"* — a
   * length carried on the step, which is `per-note-value`.
   *
   * **`unit` is omitted deliberately.** The bounds are given as a bar and a tick, and a tick is
   * defined on the same page (96 ppqn, and the guide adds that the step resolution is 24 ticks),
   * but no page says what the display reads while the knob turns. A stated unit is a claim, and
   * the schema's own message says to omit it rather than write one.
   */
  noteDuration: { kind: 'per-note-value', control: 'note duration' },

  /**
   * **No `features.perStep`, and the omission is the point.**
   *
   * The per-step editing is real and documented: guide 9.2 gives velocity and duration their own
   * gestures on a chosen step, nudge in ticks or steps, and guide 9.5 records a fader position
   * into the pattern. Declaring those four would be true about the hardware.
   *
   * It would also be a lane no recipe here could ever reach, and this library has a rule against
   * that — `test/intellijel-metropolix.test.ts` holds every device that declares lanes *and has
   * recipes* to reaching at least one, because an unreached lane is a claim about the box that no
   * guide ever shows. An `articulation` sets a **value**, and not one of the four has a printed
   * scale: velocity least of all, which is the difference between this box and the OP-XY, whose
   * p.31 table prints ten velocities. Authoring `{ velocity: 100 }` here would invent the number
   * and the scale it sits on in one stroke.
   *
   * So the capability is recorded where a reading that ran out belongs — at `features.perStep` in
   * `capabilityEvidence` — rather than as a field no guide can ever print. The duration half of it
   * does reach a reader, through `noteDuration` above.
   *
   * **`sidechain.fromExternalAudio` is `cited-against` rather than false-by-omission**, and guide
   * 11.10.1 is unusually clear about it: *"sidechaining on riddim uses note triggers to engage the
   * sidechain compressor, this means you can trigger the sidechain compressor even without
   * sound"*. The source is a sound on a group pad, the destination is a group, and audio never
   * enters it. The live input can reach the FX send and is never named as a sidechain source.
   *
   * **`lfo` is `unknown`, and this is where this box parts company with the K.O. II**, whose guide
   * never uses the word. See the evidence entry.
   */
  features: {
    sidechain: { internal: true, fromExternalAudio: false },
  },

  /**
   * §2.6/#22. Capability citations keyed by field path, never in a comment where `npm run audit`
   * cannot see them. The three that are not citations each name what was read and where the
   * reading ran out.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(SYSTEM),
    'clock.canReceiveClock': cite(SYSTEM),
    'clock.transport': cite(HARDWARE),
    /**
     * §7.4/#80. Read, and the guide does not say. It has four worked sync recipes and they point
     * both ways — guide 12.6 wires two riddim units together, 12.7 clocks a pocket operator *from*
     * this box, 12.8 clocks this box *from* one, 12.9 does both with a vintage drum machine — so
     * the coverage is symmetric rather than preferential. And the one thing that would settle it
     * points away: MIDI clock ships off (code 100), which is not how a box that expects to lead a
     * rig arrives.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the four worked sync walkthroughs put this box on both ends in turn and no page gives it a role driving other gear; MIDI clock ships off at code 100, which points away rather than toward',
    },
    'io.main': cite(SPECS),
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'the specifications page prints one Stereo Line input and one Stereo Headphone/Line Output and no other audio socket, and the hardware page describes that one output as what a sound system, a mixer, a soundcard or headphones is plugged into — there is no per-group or per-pad output to count',
      cite: cite(SPECS),
    },
    'io.audioIn': cite(SPECS),
    'io.usbAudio': cite(HARDWARE),
    voices: cite(WORKFLOW),
    /**
     * Read, and the reading ran out one step short of a value. See the note at `features` for why
     * the field is not declared: the gestures are documented and their scales are not, so an
     * articulation could only invent the number it sets.
     */
    'features.perStep': {
      kind: 'unknown',
      reason:
        'the box carries per-step velocity, note duration, nudge and a recorded fader position, and the guide prints a scale for none of them — so the lanes are real and nothing here can set a value on one without inventing it; the duration reaches a reader through noteDuration instead',
    },
    'features.sidechain.internal': cite(SIDECHAIN),
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      reason:
        'the sidechain runs on note triggers rather than audio — the page says so in as many words and adds that it works “even without sound” — and its source is a sound held on a group pad, never the input',
      cite: cite(SIDECHAIN),
    },
    /**
     * Read, and the guide answers half the question. The supertone parameter page lists what the
     * two preset knobs can be and *"lfo speed"* is one of the nine, so there is an LFO on this box
     * — which is the opposite of the K.O. II, where the word appears nowhere and the fact is
     * `cited-against`. Every field the type wants is then missing.
     */
    'features.lfo': {
      kind: 'unknown',
      reason:
        'the supertone preset parameters are listed as including “lfo speed”, so an LFO exists on at least one of the ten supertone sounds, and no page anywhere says how many there are, whether one syncs to the clock, or what it reaches — the three things the field requires; the only vibrato the rest of the box has arrives from outside on MIDI CC 1',
    },
    content: cite(SOUND),
    noteDuration: cite(STEP_PAGE),

    [jackFact('output')]: cite(HARDWARE),
    [jackFact('input')]: cite(HARDWARE),
    [jackFact('sync out')]: cite(SYNC_CONN),
    [jackFact('sync in')]: cite(SYNC_CONN),
    [jackFact('midi out')]: cite(SPECS),
    [jackFact('midi in')]: cite(SPECS),
    [jackFact('usb-c')]: cite(HARDWARE),

    [clockSourceSetupFact('sync')]: cite(SYNC_TO_RIDDIM),
    [clockSourceSetupFact('midi-din')]: cite(SYSTEM),
    [clockSourceSetupFact('usb')]: cite(SYSTEM),
  },

  /** §8.1. Jogs, not documentation — every one under eight words. */
  hints: {
    sound: 'Press [SOUND], then a group and pad',
    'play-mode': 'Hold [SHIFT] + [SOUND], turn [X]',
    'time-mode': 'In SOUND EDIT, [+] to TIM',
    sample: 'Press [SAMPLE], hold a pad',
    resample: 'Press [SAMPLE], then [+] for RSP',
    'sample-rate': 'System settings, type 500',
    supertone: 'Hold [SOUND], press [.], pads 0-9',
    chop: 'Press [SHIFT] + [SAMPLE]',
  },

  manual: {
    title: 'EP–40 riddim guide',
    edition: 'teenage.engineering/guides/ep-40, mirrored 2026-08-28 (OS 2.5)',
  },

  recipes,
}
