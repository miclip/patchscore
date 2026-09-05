import type { Device, Recipe } from '../../core/device'
import { clockSourceSetupFact, jackFact } from '../../core/device'
import type { AuthoredEnumParam, Cite } from '../../core/params'
import type { Role } from '../../core/vocabulary'
import { EP_133_PANEL } from './panel'

/**
 * teenage engineering EP–133 K.O. II (§2.3). A sampler and its own sequencer: **four groups of
 * twelve pads**, every pad holding one of 999 sample slots, six send effects behind one selector,
 * and no synthesis of any kind.
 *
 * ## A note on section numbers in this file
 *
 * `§` means `DESIGN.md`, everywhere in this repository. This box's documentation numbers its own
 * sections too — `8.2.1`, `11.9.1` — and several of them collide (`§6` is mood, guide 6 is the
 * project structure; `§10` is the UI direction, guide 10 is the function reference). So a
 * reference to this box's own documentation is written **`guide 8.2.1`**, never with a section
 * sign, and `§` keeps its usual meaning throughout.
 *
 * ## The document is a web guide, and every citation carries a date
 *
 * **There is no PDF.** `manuals/README.md` records the finding — teenage engineering's downloads
 * page for this box offers a firmware utility and a link to a web guide, nothing else — so
 * `manuals/te-ep-133/` is a nineteen-page mirror of `teenage.engineering/guides/ep-133`, taken
 * 2026-08-28, in the shape `manuals/torso-t1/` and `manuals/deluge-community/` already use. A live
 * URL cited without a date means nothing, because the page can change under the citation, so every
 * `source` below is a guide path plus `mirrored 2026-08-28`, and carries the guide's own section
 * number because that is finer than a slug.
 *
 * **Images were dropped in the conversion, and the text mirror is not the whole document.** The
 * mirror's `screen.md` ends at the words *"icon map"* with the map itself gone, and two lists a
 * reader would want are printed on the panel rather than in the prose. One of them is recovered
 * and one is not, and the difference is instructive:
 *
 *  - **The fader assignments — recovered.** Guide 9.4 says *"the fader assignments can be found
 *    printed above the pads"* and stops; the changelog gets as far as *"(level, pitch, pan,
 *    etc.)"*. They are printed above the pads, and teenage engineering publish a front view that
 *    shows them. One per sample pad, in pad order:
 *
 *        7 LEVEL    8 PITCH    9 TIME
 *        4 LPF      5 HPF      6 → FX
 *        1 ATK      2 REL      3 PAN
 *        . TUNE     0 VEL      ENTER MOD
 *
 *    Twelve, matching the twelve pads, and the three the changelog names are among them. See
 *    `panel.ts` for the figure and the measurement.
 *  - **The punch-in effects — still not recovered.** Guide 11.7 says *"holding down FX turns the
 *    pads into punch-in fx"* and *"each one adds a unique character"* and never names one. The
 *    front view does not carry them either — they are the pads' *held-FX* meanings, and nothing
 *    is printed for them. The only ones named anywhere are four incidental changelog lines:
 *    *"Beat repeat (FX+1)"*, *"punch in fx pad 0"*, *"punch-in FX ENTER"*, *"tape-stop-punch in
 *    FX"*. That is not a roster, and this file does not invent one.
 *
 * **`pdftotext` is not evidence a manual is silent, and neither is a text mirror.** That is
 * `CLAUDE.md`'s dimension-callout rule in a different file format, and this device sprang it: an
 * earlier draft of this manifest recorded both rosters as unrecoverable and shipped no panel at
 * all, on the reasoning that a mirror with no images means no figure exists. The figure existed,
 * linked from the very page the mirror was taken from.
 *
 * ## This guide prints no parameter range at all
 *
 * Not "few" — for a sound parameter, none. Amplitude, pitch, pan, attack, release, trim start and
 * length, the sample tempo, all twelve FX knobs, the sidechain's length and shape, the sampling
 * input level and threshold, swing, the note velocity of a step: every one is named, given a knob,
 * and left unbounded. Guide 8.2.1 is representative — *"the (knobY) knob controls pan. pan
 * gradually adjusts whether the sample is played on the left, right or center audio channels"* —
 * and then the sentence ends.
 *
 * So this is the OP-XY's file on a second teenage engineering box, and the same rule applies: **an
 * absent range beats an invented `0-100`**. `lib/devices/teenage-engineering-op-xy/index.ts`
 * records what the alternative cost — 160 mood-inert parameters and a guide full of bounds nobody
 * had checked. Every parameter below is therefore an enum whose *option set* is cited and whose
 * *selection* is taste (§3.2), and **this device declares no mood axes**, because the documented
 * way to decline an axis is to have no parameter that names one.
 *
 * Four things in the guide look like ranges and are not:
 *
 *  - **The MIDI CC map (guide 14.5) prints a `range` column reading `1-127` four times.** Two of
 *    those rows are `fx parameter (knobx)` and `fx parameter (knoby)`, which is tempting because
 *    each maps onto exactly one control. It is still the MIDI data range rather than the scale the
 *    box displays, and no page states what the FX knobs read on screen. The OP-XY's third costume.
 *  - **Tempo is printed twice, and the two disagree on purpose.** Guide 8.4: *"the lowest tempo is
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
 * ## The guide contradicts itself in three places, and the reference page wins each time
 *
 * Recorded rather than smoothed over, the way `lib/devices/moog-subsequent-37/panel.ts` records
 * its manual's six.
 *
 *  - **Note intervals.** Guide 4.7 and guide 10.4 both give eight — `1/1, 1/2, 1/4, 1/8, 1/8T,
 *    1/16, 1/16T, 1/32`. Guide 7.2 step 9 gives five, dropping `1/1`, `1/2` and `1/4`. The eight
 *    is right; the walkthrough predates the OS 2.0 note that added *"1/1, 1/2 and 1/4 timing
 *    intervals"*.
 *  - **MIDI clock.** Guide 12.9 step 8 says *"choose from off, on or out"*. The settings table in
 *    guide 14 says `100 off` / `101 in (receive only)` / `102 out (send only)`. The table is the
 *    reference and is what `clock` below is built on.
 *  - **Pattern length display.** Guide 7.1 prints `ln.1`, guide 7.2 prints `len:1` for the same
 *    thing. Cosmetic, and named here only so the next reader does not go looking for two features.
 *
 * ## MIDI clock is one direction at a time, and it is off out of the box
 *
 * This is the fact with the most consequence, and it is a single setting rather than two:
 *
 *     100  mid  clk  off   MIDI Clock Off (default)
 *     101  mid  clk  in    MIDI Clock in (receive only)
 *     102  mid  clk  out   MIDI Clock Out (send only)
 *
 * `ClockSpec` has no way to say *"and choosing one forecloses the other"*, so the constraint rides
 * on `sourceSetup`'s note and on the two MIDI jacks' notes, where a reader setting up a rig meets
 * it. That is the OP-XY's multi-out answer — six mutually exclusive modes on one jack — reached
 * again on a different mechanism. The default mattering is the second half: a reader handed
 * *"sync to the K.O. II over MIDI"* and left to find `mid > clk > out` gets silence, because the
 * box ships with MIDI clock off entirely.
 *
 * **The analog sync jacks are the exception and are genuinely symmetric.** `syn > in` and
 * `syn > out` are separate settings with separate rates, both defaulting to 1/16, and guide 12.4
 * has two K.O. IIs wired one to the other. So `sync` goes both ways with nothing foreclosed, and
 * the asymmetry above is a MIDI asymmetry rather than a property of the box.
 *
 * ## Four groups of twelve, modelled as forty-eight fungible pads
 *
 * Guide 6: *"each group holds a collection of 12 samples that can be sequenced in a group specific
 * pattern. each project holds four groups"*. Forty-eight pads, and a pad takes any of the 999
 * sounds, so nothing distinguishes one from another and one pool is the honest shape.
 *
 * **The groups are advisory, and binding roles to them would be inventing an assignment.** Guide
 * 7.1 step 3 recommends `A` drums, `B` bass, `C` melodies, `D` loops — and then says *"this layout
 * is of course optional and you can put whatever sounds you want into each group"*. Four pools of
 * twelve would have to either assert that layout as fact or carry the same recipes four times,
 * since recipe lookup keys on `poolId`; both are worse than one pool of forty-eight.
 *
 * **Two things one pool cannot say, both raised rather than worked around** (skill §6, #57):
 *
 *  - **The ordinal is a count, not a legend.** `Pad 37` is what the resolver prints and nothing on
 *    the panel says `37` — the twelve pads in each group are a numpad, labelled `.`, `0`, `enter`,
 *    `1`-`9`. The one document that orders all forty-eight is the MIDI note map (guide 14.2),
 *    which runs group `a` at notes 36-47, `b` at 48-59, `c` at 60-71 and `d` at 72-83 in exactly
 *    that pad order — so ordinal *n* is note *35 + n*, and `Pad 37` is group `d`'s `.` pad. A
 *    reader does not need the mapping (any free pad will do, which is the point of a pool) but it
 *    exists, and #86 is where a pool that wants to name its members belongs.
 *  - **The polyphony is the device's, not the pad's.** See `voices` below.
 *
 * ## No trigger note, and that is a reading rather than an omission (§2.1/#334)
 *
 * #334 counts the parts across the library whose grid says which steps to hit and never what to
 * write on them. This box has 252 of them, every one on the pad pool, and the answer is not the
 * one the two Polyend boxes reached: **nothing is written on a step here at all.**
 *
 * Guide 9.2, the step sequencer's own page: *"hold (RECORD) and press a pad to record the chosen
 * pad to that step. when a pad is recorded to a given step it will light up."* The instruction at
 * the machine is a pad press and the confirmation is the pad lighting, so the grid is already
 * complete without a note, and one printed beside it would name a second way to do a thing this
 * box does one way.
 *
 * **`VoiceSpec.triggerNote` is one note that addresses a voice, and this pool has no such note.**
 * The Tracker's `C5` is one fact about eight interchangeable tracks (§2.1). Guide 14.2 gives each
 * of these forty-eight pads its own instead — `36`/`c2` at group `a`'s `.` through `83`/`b5` at
 * group `d`'s `9`, one per pad, the same table the ordinal mapping above is read off. The note
 * therefore follows from *which pad an assignment landed on* and is not a property of the pool,
 * and a pool's `triggerNote` reaches every member alike: authoring one would tell a reader to
 * address forty-eight pads with a note that reaches one of them.
 *
 * **The box does have a root note, and it is the reader's.** Guide 8.2.5: *"the (knobY) knob
 * controls the MIDI root note. this allows you to set the MIDI root note of your sample and ensure
 * that the root note on the device matches with the root note on the sample."* No value and no
 * default is printed anywhere, because there is none to print — it is set per pad to whatever the
 * loaded sample's own pitch is, and guide 12.9 step 6 has it governing the MIDI that pad *sends*.
 * `ep133-lead-bright` carries that in `routing`, which is the honest place for it: an instruction
 * to go and set a control, not a value cited to a page that prints no value. Keys mode is the same
 * shape — guide 9.3 turns the twelve pads into a chromatic keyboard for one sample, and *"holding
 * (KEYS) and selecting a pad will transpose the scale"*.
 *
 * So the 252 blanks are correct output rather than the gap #334 is about, and
 * `test/te-ep-133.test.ts` pins the count with the blank arm named — the way the Polyend files pin
 * theirs at zero, and for the same reason: a number that moves is a prompt to re-read the box.
 * **What would be wrong here is a note.** If a reader driving this box from an external sequencer
 * ever needs one, the thing missing is a *per-member address* — `35 + ordinal`, derived rather
 * than authored — and not a value to put in the field this box declines. `capabilityEvidence`
 * cannot record that either: §2.6's paths are closed and none of them names a trigger note, so
 * adding one is an engine change rather than a device's to make.
 *
 * ## The FX selector is one slot for the whole box, so no recipe names an effect
 *
 * Guide 11: *"the (FX) button is where you'll find delay, reverb, distortion, chorus, filter, and
 * compressor"*, then *"each group can send to one master fx and the sum of the mix is sent through
 * a master compressor"*, then *"choose fx: use (minus) and (plus) to navigate through the fx"* and
 * *"move the FADER to adjust the amount of fx on the current group"*.
 *
 * Read together that is **one effect loaded at a time, chosen with `-`/`+`, with a per-group send
 * level** — one selector, six choices, four sends. A recipe carrying `FX reverb` would then be
 * setting a box-wide control from inside one part, and a guide with two such recipes would
 * contradict itself in a way a reader could not resolve at the machine. `ParamScope` reaches
 * `pattern` and `song` and neither is *device*, so there is nowhere honest to put it, and the
 * effects appear below only in `routing` prose, which a reader reads as advice rather than as a
 * setting with provenance. **This is #25** — a device-global resource an assignment consumes —
 * and it is the second box in the library to hit it after the SP-404MK2's shared effect slot.
 *
 * The reading itself is a reading, and the guide could be clearer: *"each group can send to one
 * master fx"* would also parse as one effect per group. The conservative half of the ambiguity is
 * the one that cannot print a falsehood, and it is the half taken here.
 *
 * ## Two standing library rules this box meets differently, both recorded
 *
 *  - **No `features.perStep`**, though the per-step editing is real. See the note at `features`.
 *  - **No numeric, so no mood.** Above.
 *
 * ## What is not modelled
 *
 * Note intervals, swing, quantize and free time, timing correct, pattern length in bars, scenes,
 * song positions and the commit button are all the shape of a pattern, which §4.3 makes the
 * template's business (invariant 3). Keys mode's thirteen scales are harmony, which is the
 * template's too — a device naming a scale is a device naming a genre.
 *
 * Mute groups, solo and the note-repeat arpeggiator are performance gestures with no value to
 * author; the ones that change how a part sits are named in `routing` instead.
 */

const GUIDE = 'EP–133 K.O. II guide'
const MIRRORED = 'mirrored 2026-08-28'

/**
 * Every citation is a guide path and the guide's own section number, plus the date the mirror was
 * taken — the form `manuals/README.md` prescribes for a source with no edition and no page.
 *
 * No section sign: these strings are rendered to a reader, where `§` reads as a reference to this
 * project's own specification rather than to teenage engineering's guide.
 *
 * **The two `maker` citations in this file carry a date for the same reason**, in the same words —
 * `physical.verified` and `panel.ts`'s `verified` both cite a live teenage engineering page, and a
 * live URL cited without a date means nothing whatever kind it is. Nothing in this manifest cites
 * a source that cannot be dated.
 */
function cite(where: string): Cite {
  return { kind: 'manual', source: `${GUIDE}, ${where}, ${MIRRORED}` }
}

const HARDWARE = '/ep-133/hardware-overview 1.1'
const SYNC_CONN = '/ep-133/hardware-overview 1.2'
const WORKFLOW = '/ep-133/workflow 6'
const SOUND = '/ep-133/modes 8.1'
const PLAY_MODE_PAGE = '/ep-133/modes 8.2.1'
const TIME_PAGE = '/ep-133/modes 8.2.4'
const EDIT_MODES = '/ep-133/modes 8.2'
const STEP_PAGE = '/ep-133/play-and-record 9.2'
const SAMPLE_FN = '/ep-133/functions 10.1'
const SIDECHAIN = '/ep-133/effects 11.9.1'
const RESAMPLE_CHORD = '/ep-133/how-to 12.10'
const SYNC_TO_DRUM = '/ep-133/how-to 12.7'
const SYSTEM = '/ep-133/system 14'
const SPECS = '/ep-133/tech-specs 16'

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
 * Guide 8.2.1, printed as three headed paragraphs: *"oneshot is monophonic, and plays the whole
 * sample, one at a time"*, *"key is polyphonic, and allows you to play multiples of the same
 * sample at once"*, *"legato is monophonic, and plays a sample one at a time. when changing the
 * note while being held, it will continue playing from the same point as it was left off"*.
 *
 * This is the one parameter on the box that decides whether a part can hold a chord, so every
 * recipe below carries it.
 */
const PLAY_MODES = ['oneshot', 'key', 'legato'] as const

/**
 * Guide 8.2.4, the TIM page: *"the (knobX) knob sets the time stretch mode (BPM, BAR or
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
 * *"lo is 26,250khz - which is very lo-fi. mid is 32,000khz - which adds some charater. hi is the
 * standard 46,875khz"*. The `khz` is the guide's own typo for Hz, so the option strings below say
 * `Hz` and a note says the guide does not.
 *
 * It is a **recording** rate, not a playback rate: it applies to what the box samples, and guide
 * 10.2 says an imported file keeps its own rate if that is lower. So it belongs to a recipe that
 * records its own audio, and the two that reach for `lo` both do.
 */
const SAMPLE_RATES = ['lo — 26,250 Hz', 'mid — 32,000 Hz', 'hi — 46,875 Hz'] as const

/**
 * Every role, and the box earns it for the same reason the OP-XY and the SP-404MK2 do: a pad is
 * whatever sample is loaded into it, and the guide's own layout advice is explicitly optional.
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
 */
function fromLibrary(need: string, band: string) {
  return {
    need,
    prep: {
      text: `Hold [SOUND] and type the sound number on the pads, then [ENTER]; the factory ${band}.`,
      verified: cite(SOUND),
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

const recipes: Recipe[] = [
  // -------------------------------------------------------------------------
  // Drum parts. `oneshot` throughout: guide 8.2.1 makes it monophonic and
  // whole-sample, which is what a struck part wants and what leaves the
  // polyphony budget alone.
  // -------------------------------------------------------------------------
  {
    id: 'ep133-kick-hard',
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
      'Group A, following the guide’s own layout advice. Trim the head in SOUND EDIT TRI if the sample has a run-up — the start point is on [X] there',
  },
  {
    id: 'ep133-kick-soft',
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
    id: 'ep133-snare-hard',
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
    id: 'ep133-clap-bright',
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
    id: 'ep133-rim-clean',
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
    id: 'ep133-ghost-perc-soft',
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
    id: 'ep133-closed-hat-bright',
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
    id: 'ep133-open-hat-dark',
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
    id: 'ep133-tom-dark',
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
    id: 'ep133-metallic-bright',
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
    id: 'ep133-noise-dirty',
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
    id: 'ep133-sub-dark',
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
      'Group B. Make it the sidechain destination and the kick pad its source — the duck runs on note triggers rather than audio, so it works even where the kick is quiet',
  },
  {
    id: 'ep133-bass-mid-dirty',
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
    id: 'ep133-acid-dirty',
    role: 'acid',
    character: 'dirty',
    voice: 'pad',
    title: 'Squelch line, legato so notes run into each other',
    sourceAudio: fromLibrary(
      'A resonant sawtooth bass note, one sustained note rather than a phrase',
      'bass is sounds 400-499',
    ),
    params: [pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group B. The filter is one of the six on the FX selector, with cutoff on [X] and resonance on [Y] — turn the group’s fader up to send into it. **Accent:** the per-step velocity is real on this box and has no printed scale anywhere in the guide, so no value is set here rather than one invented. Mark the accented steps by ear on the box itself. **Slide:** `PLAY MODE legato` above is the guide’s own sense of the word — monophonic, and a held note "will continue playing from the same point as it was left off" — which joins the notes without bending the pitch between them. There is no portamento on this box, so an acid line here steps between its notes',
  },

  // -------------------------------------------------------------------------
  // Tonal parts. `key` is the guide's own word for polyphonic (guide 8.2.1), so
  // these are real polyphonic voices rather than chords baked into a sample —
  // with one deliberate exception below.
  // -------------------------------------------------------------------------
  {
    id: 'ep133-pad-soft',
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
      'Group C. Attack is on [X] in SOUND EDIT ENV — turned up it fades the sample in rather than playing it as recorded',
  },
  {
    id: 'ep133-texture-soft',
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
    id: 'ep133-lead-bright',
    role: 'lead',
    character: 'bright',
    voice: 'pad',
    title: 'Single-note lead, legato so it slides between notes',
    sourceAudio: fromLibrary(
      'A bright sustained tone with a clear fundamental — the sample’s own root matters here',
      'melodic sounds are 500-599',
    ),
    params: [pick('PLAY MODE', 'legato', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group C. The MIDI root note is on [Y] in SOUND EDIT MID — set it to the sample’s own pitch or the whole keyboard is transposed wrong',
  },
  {
    id: 'ep133-stab-hard',
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
    id: 'ep133-arp-clean',
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
    id: 'ep133-vox-chop-clean',
    role: 'vox-chop',
    character: 'clean',
    voice: 'pad',
    title: 'Vocal phrase auto-chopped across a group',
    sourceAudio: sampled('A sung or spoken phrase, two to four seconds, one voice and no backing'),
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
    ],
    routing:
      '[SHIFT] and [SAMPLE] is CHOP — attack mode slices at the loudest points, equal length slices evenly, and both scatter the phrase across as many pads as it needs. Give it group D, since it takes several',
  },

  // -------------------------------------------------------------------------
  // Transitional parts (§4.2) — section-scoped rather than owning a voice.
  // -------------------------------------------------------------------------
  {
    id: 'ep133-riser-bright',
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
    id: 'ep133-impact-hard',
    role: 'impact',
    character: 'hard',
    voice: 'pad',
    title: 'Downbeat impact, one hit with its tail intact',
    sourceAudio: fromLibrary(
      'A single loud hit with a long tail — a crash, a slam, a hit with reverb already on it',
      'percussion is sounds 300-399',
    ),
    params: [pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' })],
    routing:
      'Group D. Keep it out of any mute group — a mute group cuts everything else in it, which is the opposite of what a section marker wants',
  },
  {
    id: 'ep133-ride-bright',
    role: 'ride',
    character: 'bright',
    voice: 'pad',
    title: 'Ride let ring, played rather than triggered',
    sourceAudio: sampled(
      'A ride cymbal with the bow ring left on it, two seconds or longer — a gated ride has no ' +
      'tail for `key` mode to hold',
    ),
    /**
     * `key` rather than `oneshot`, and the difference is what a ride needs. Guide 8.2.1 gives
     * `oneshot` as the mode that plays a sample through on a press; `key` is the one that follows
     * the pad, so a ride can be choked by letting go and left ringing by holding on. That is the
     * one gesture a cymbal part actually has on this box, since nothing here is a decay control.
     *
     * The same choice as `ep133-metallic-bright` one role along, and for the same reason: both are
     * struck metal whose length is the player's rather than the patch's.
     */
    params: [
      pick('PLAY MODE', 'key', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'mic', SAMPLE_SOURCES, cite(SAMPLE_FN), { hint: 'sample' }),
    ],
    routing:
      'Group C, beside the hats. Hold the pad to let it ring and release to choke it — `key` mode ' +
      'follows the pad, so the length of the hit is the length of the press',
  },
  {
    id: 'ep133-sweep-soft',
    role: 'sweep',
    character: 'soft',
    voice: 'pad',
    title: 'A recorded sweep fitted to the bars it crosses',
    sourceAudio: sampled(
      'A recording of a filter sweep, four bars or longer, that arrives where it is going right ' +
      'at the end — `BAR` fits it to the gap, so where it ends is where the change is',
    ),
    /**
     * §4.2, and **the mechanism is the riser's rather than a modulator**, because this box has no
     * modulator to reach for. There is no LFO, no envelope beyond attack and release, and the FX
     * selector is one slot for the whole box (see the head note) — so nothing here can move a
     * filter under one part without moving it under all of them.
     *
     * What the box does have is time stretch. Guide 8.2.4's `BAR` mode fits a sample to a bar
     * count the reader sets, which is what makes a recorded sweep land on the change at whatever
     * tempo the direction picks. `ep133-riser-bright` uses the same mode one role along; the
     * difference is what is loaded and how long it runs.
     *
     * **No articulation, and on this box that is not a choice**: `features` declares no per-step
     * lane at all, so no recipe here articulates anything. It happens to agree with the two
     * directions asking for `sweep`, neither of which authors a step variant for it (#108).
     */
    params: [
      pick('PLAY MODE', 'oneshot', PLAY_MODES, cite(PLAY_MODE_PAGE), { hint: 'play-mode' }),
      pick('SAMPLE SOURCE', 'line in stereo (in)', SAMPLE_SOURCES, cite(SAMPLE_FN), {
        hint: 'sample',
      }),
      pick('TIME STRETCH MODE', 'BAR', TIME_MODES, cite(TIME_PAGE), {
        hint: 'time-mode',
        note: '[Y] sets the bar count — set it to the gap the sweep has to cross',
      }),
    ],
    routing:
      'Group D, with the other transitional parts. One press starts it; `BAR` is what keeps it ' +
      'landing on the change when the tempo moves',
  },
]

export const device: Device = {
  id: 'te-ep-133',
  name: 'EP–133 K.O. II',
  maker: 'teenage engineering',
  kind: 'sampler',

  /**
   * §2.3, directional since #148/#149 — and directional here for a reason no other box in the
   * library has: **MIDI clock is a single three-way setting, so this box sends or receives over
   * MIDI, never both.** See the module JSDoc for the settings table.
   *
   * `transport` is the union of both directions, which is what the field means, and both
   * `sendTransport` and `receiveTransport` are omitted because each transport does go both ways —
   * just not at the same time over MIDI. The exclusivity is not a direction, and declaring one of
   * the two would say something false in a different way: that the box cannot follow a MIDI clock,
   * which it plainly can (`101 mid clk in`).
   *
   * **`sync` is genuinely symmetric and is the wire to reach for.** Guide 14 gives `syn > in` and
   * `syn > out` separate rates with separate defaults, the specifications page prints both sockets
   * with the same tip and ring assignment, and guide 12.4 wires one K.O. II's sync out to
   * another's sync in. Nothing is foreclosed.
   *
   * `transport` uses `midi-din` though both MIDI holes are 3.5 mm. `ClockTransport` is semantic —
   * the forty-odd `midi-din` declarations in this library mean "MIDI down a MIDI cable" as against
   * USB — and the specifications page settles the connector question in the jack notes:
   * *"MMA compliant pinout (type A)"*, which is the standard a plain TRS MIDI cable expects.
   *
   * **Bluetooth is deliberately absent.** `whats-new` mentions *"BLE MIDI clock"* once, in a
   * release note, and no other page in the guide mentions Bluetooth at all — no pairing, no
   * setting, no socket, nothing on the hardware page or the specifications page. One changelog
   * line is not enough to declare a transport a reader would then be told to use.
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
        note: 'Codes 210/211/212 are 1/8, 1/16 and sync24, and 1/16 is the default. Sync24 to a vintage box wants a 3.5 mm to DIN cable — a MIDI cable will not work. The in and out rates are separate settings.',
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
   * is both, not two sockets. USB audio arrived in OS 2.5: *"ko2 supports stereo audio in, as both
   * a sample source and an audio source. as well as usb audio out, to record sound directly into
   * your DAW"*.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10. **176 mm across, and this box is portrait.**
   *
   * `tech-specs` is the page a size would sit on and it is purely electrical — bit depth, SNR,
   * impedance, jack voltages, the 96 ppqn clock — with no mechanical section at all. Nineteen
   * pages, and the only millimetre figures anywhere are connector sizes (3.5 mm). So the source is
   * teenage engineering's own product page, `teenage.engineering/products/ep-133`, which prints
   * *"dimensions and weight / 240 mm x 176 mm x 16 mm / 9.45" x 6.93" x 0.63" inches / 620 g /
   * 22 oz"*. That is `maker` (#191), not `provisional` and not `manual`: a figure the manufacturer
   * publishes outside the manual, checkable by anyone with the link.
   *
   * **Which of the three numbers is the span is decided by the drawing, not by their order**, and
   * an earlier draft of this file got it wrong by taking the first as the width. §2.3's aspect
   * check settles it: the published front view's outline measures 288.545 × 393.520, an aspect of
   * **0.73324**, against 176/240's **0.73333** — 0.013% apart, where 240/176 would be out by 86%.
   * So 176 is across, 240 is down, and 16 mm is the thickness, which is not this field. The
   * printed inches agree with the millimetres to four figures (9.45/6.93 = 1.3636 = 240/176), so
   * the two units corroborate each other and the drawing chooses between the two readings.
   * `panel.ts` has the measurement.
   */
  physical: {
    panelSpanMm: 176,
    verified: {
      kind: 'maker',
      source:
        'teenage engineering EP–133 K.O. II product page, teenage.engineering/products/ep-133, 240 x 176 x 16 mm — 176 across in playing orientation, per the published front view, fetched 2026-08-28',
    },
  },

  /**
   * §10. Measured off teenage engineering's published vector front view and redrawn — see
   * `panel.ts`, which carries the figure's URL, the method, the aspect check that settles the
   * orientation above, and the 8 mm module the measurement recovers.
   *
   * Its `verified` is `maker` rather than `manual` for the same reason `physical.verified` is: the
   * figure is published outside the manual, because this box has no manual to publish it in.
   */
  panel: EP_133_PANEL,

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
      note: '3.5 mm stereo line in. 6.5 kOhm, 0-12 dB analog gain, 8 dBu max. A turntable needs its own RIAA amp first',
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
   * it. The module JSDoc has the argument against four pools of twelve and the note-map ordering
   * that gives the ordinal a meaning.
   *
   * **`polyphony: 12` is the device's budget and no page divides it.** The figure is stated twice
   * and in neither place as a per-pad ceiling: the OS 2.0 release note says *"ko2 goes from 12
   * mono/6 stereo sounds to up to 16 mono and 12 stereo sounds"*, and the product page's
   * highlights say *"twelve stereo voices, sixteen mono"*. Twelve is the smaller of the two and
   * therefore the number that holds whichever a pad's sample turns out to be — an upper bound on
   * the largest chord one `key`-mode pad can sound, not a claim that forty-eight pads each have
   * twelve. What the model cannot express is that they share it, which is the Tracker Mini's and
   * the OP-XY's shape and is #25.
   *
   * The release note's own caveat is worth carrying: *"watch out for time stretched, stereo and
   * high pitched samples as they may reduce the polyphony"*.
   */
  voices: [
    {
      kind: 'pool',
      id: 'pad',
      label: 'Pad',
      count: 48,
      /**
       * §2.2/#86. **Nothing on this box says `37`.**
       *
       * Forty-eight pads in four groups of twelve, each group a numpad labelled `.`, `0`, `enter`
       * and `1`-`9`. The counted form the pool would otherwise print — `Pad 37` — names a control
       * that does not exist, and a reader at the machine looking for it finds four pads marked `1`
       * and none marked `37`.
       *
       * The order is the manifest's own, and it is checkable: guide 14.2's MIDI note map runs
       * group `a` at notes 36-47, `b` at 48-59, `c` at 60-71 and `d` at 72-83 in exactly that pad
       * order, so ordinal *n* is note *35 + n*. That makes ordinal 37 group `d`'s `.` pad — which
       * is what the header above this file already worked out, and what `A · .` … `D · 9` spells.
       *
       * Display only (§2.2/#86): `voiceId` is still `pad-37` and the ordinal is still 37, so
       * nothing the resolver does changes.
       */
      memberLabels: ['a', 'b', 'c', 'd'].flatMap((group) =>
        ['.', '0', 'enter', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
          (pad) => `${group.toUpperCase()} · ${pad}`,
        ),
      ),
      /**
       * §2.1/#334. **No `triggerNote`, and it was read for rather than left out.** Guide 9.2
       * records a step by pressing the pad, so nothing is written on a step; guide 14.2 gives
       * each of the forty-eight pads its own note, `36`-`83`, so there is none this pool shares.
       * A pool's trigger note reaches every member alike, which is the shape the fact would have
       * to take and the shape this box refuses. See the header for the reading and
       * `test/te-ep-133.test.ts` for what holds it in place.
       */
      roles: PAD_ROLES,
      polyphony: 12,
    },
  ],

  /**
   * §12.4. Sixteen of forty-eight, and unusually for a `comfortableVoices` this one is anchored to
   * a printed figure rather than being pure judgement: sixteen mono voices is the whole box, so a
   * seventeenth occupied pad cannot be heard alongside the other sixteen.
   *
   * It is still a judgement, and the claim is deliberately the weaker one — not that seventeen
   * parts are impossible, but that past sixteen the guide is filling pads the box cannot sound at
   * once. Two other pressures point the same way and neither is countable: sampling writes to a
   * pad, chopping scatters one sample across several, and the 999 slots share 128 MB.
   */
  comfortableVoices: 16,

  /**
   * §2.6/#111. **The box arrives loaded and no document names one sound.** Guide 8.1: *"out of the
   * box K.O.II will come loaded with over 300 samples"*, and guide 7.1: *"your K.O.II will come
   * with projects 1-5 populated with sounds and projects 6-9 completely empty"*. `erase-drive`
   * confirms it from the other side — *"this will remove all your work as well as all factory
   * sounds. once removed factory sounds can not be recovered!"*
   *
   * `shipped-library` rather than `enumerable`, and the distinction is sharper here than usual
   * because the guide gets *close* to a list. Guide 8.1 prints a **numeric banding** — kicks 1-99,
   * snares 100-199, hi-hats 200-299, percussion 300-399, bass 400-499, melodic 500-599 — which is
   * navigation, not an inventory: it says which hundred to scroll into and names nothing inside
   * it. A recipe cannot reference an entry from a band, so every recipe above still describes its
   * audio in prose and puts the band in `prep`, which is what `reason` says.
   *
   * The `credits` page lists eleven content contributors by name and attaches no pack, kit or
   * sample to any of them, so it is not an inventory either.
   */
  content: {
    kind: 'shipped-library',
    library: 'over 300 factory samples, and projects 1-5 arrive populated',
    location:
      'SOUND mode — hold [SOUND] and type the number; the factory bands are kicks 1-99, snares 100-199, hi-hats 200-299, percussion 300-399, bass 400-499, melodic 500-599',
    reason:
      'the sound page gives the count and the number bands and names not one sample; it also says a sample only has a name at all if it was imported or renamed with the EP Sample Tool',
  },

  /**
   * §2.6/#142. Guide 9.2: *"hold (shift) and turn (knoby) to change the note duration of all notes
   * in a chosen step. the maximum note duration is one bar and the minimum is one tick"* — a
   * length carried on the step, which is `per-note-value`.
   *
   * **`unit` is omitted deliberately.** The bounds are given as a bar and a tick, and a tick is
   * defined elsewhere (96 ppqn, guide 9.2 and guide 16), but no page says what the display reads
   * while the knob turns. A stated unit is a claim, and the schema's own message says to omit it
   * rather than write one.
   */
  noteDuration: { kind: 'per-note-value', control: 'note duration' },

  /**
   * **No `features.perStep`, and the omission is the point.**
   *
   * The per-step editing is real and documented: guide 9.2 gives velocity and duration their own
   * gestures on a chosen step, guide 9.2 gives nudge in ticks or steps, and guide 9.4 records a
   * fader position to the current step (*"this is latching, not momentary"*). Declaring those four
   * would be true about the hardware.
   *
   * It would also be a lane no recipe here could ever reach, and this library has a rule against
   * that — `test/intellijel-metropolix.test.ts` holds every device that declares lanes *and has
   * recipes* to reaching at least one, because an unreached lane is, in the MC-101 test's words, a
   * claim about the box that no guide ever shows. An `articulation` sets a **value**, and not one
   * of the four has a printed scale: velocity least of all, which is the difference between this
   * box and the OP-XY, whose p.31 table prints ten velocities and is where every one of that
   * device's articulations comes from. Authoring `{ velocity: 100 }` here would invent the number
   * and the scale it sits on in one stroke.
   *
   * So the capability is recorded where a reading that ran out belongs — at `features.perStep` in
   * `capabilityEvidence` — rather than as a field no guide can ever print. The duration half of it
   * does reach a reader, through `noteDuration` above.
   *
   * **`sidechain.fromExternalAudio` is `cited-against` rather than false-by-omission**, and guide
   * 11.9.1 is unusually clear about it: *"sidechaining on ko2 uses note triggers to engage the
   * sidechain compressor, this means you can trigger the sidechain compressor even without
   * sound"*. The source is a sound on a pad, the destination is a group, and audio never enters
   * it. The live input can reach the FX send and is never named as a sidechain source.
   *
   * **No `lfo`.** See the evidence entry: the six SOUND EDIT pages are enumerated and none is a
   * modulation source.
   */
  features: {
    sidechain: { internal: true, fromExternalAudio: false },
  },

  /**
   * §2.6/#22. Capability citations keyed by field path, never in a comment where `npm run audit`
   * cannot see them. The four that are not citations each name what was read and where the reading
   * ran out.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(SYSTEM),
    'clock.canReceiveClock': cite(SYSTEM),
    'clock.transport': cite(HARDWARE),
    /**
     * §7.4/#80. Read, and the guide does not say. It has three worked sync recipes and they point
     * both ways — guide 12.5 clocks a pocket operator *from* the K.O. II, guide 12.6 clocks the
     * K.O. II *from* one, guide 12.7 does both with a vintage drum machine — so the coverage is
     * symmetric rather than preferential. And the one thing that would settle it points away:
     * MIDI clock ships off (code 100), which is not how a box that expects to lead a rig arrives.
     */
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'the three worked sync walkthroughs put this box on both ends in turn and no page gives it a role driving other gear; MIDI clock ships off at code 100, which points away rather than toward',
    },
    'io.main': cite(SPECS),
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'the specifications page prints one Stereo Line input and one Stereo Headphone/Line Output and no other audio socket, and the hardware page describes that one output as what a mixer, a soundcard or headphones is plugged into — there is no per-group or per-pad output to count',
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
        'the box carries per-step velocity, note duration, nudge and a latched fader position, and the guide prints a scale for none of them — so the lanes are real and nothing here can set a value on one without inventing it; the duration reaches a reader through noteDuration instead',
    },
    'features.sidechain.internal': cite(SIDECHAIN),
    'features.sidechain.fromExternalAudio': {
      kind: 'cited-against',
      reason:
        'the sidechain runs on note triggers rather than audio — the page says so in as many words and adds that it works “even without sound” — and its source is a sound held on a group pad, never the input',
      cite: cite(SIDECHAIN),
    },
    'features.lfo': {
      kind: 'cited-against',
      reason:
        'the per-sound edit surface is enumerated as exactly six pages — sound, trim, envelope, time, midi and mute group — and none of them is a modulation source; the word LFO does not appear anywhere in the nineteen-page guide, and the only vibrato on the box arrives from outside on MIDI CC 1',
      cite: cite(EDIT_MODES),
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

    [clockSourceSetupFact('sync')]: cite(SYNC_TO_DRUM),
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
  },

  manual: {
    title: 'EP–133 K.O. II guide',
    edition: 'teenage.engineering/guides/ep-133, mirrored 2026-08-28 (OS 2.5)',
  },
  productPage: 'https://teenage.engineering/products/ep-133',

  recipes,
}
