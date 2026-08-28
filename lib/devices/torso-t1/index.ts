import type { Device } from '../../core/device'
import type { Cite } from '../../core/params'
import { T1_PANEL } from './panel'

/**
 * Torso Electronics T-1 (§2.3). A desktop **algorithmic sequencer**: sixteen polyphonic tracks
 * per pattern, eighteen encoders and twenty-three keypads with no screen, MIDI over TRS and USB,
 * four CV outputs and two gate outputs, analog sync in and out, and Ableton Link over Wi-Fi.
 * **No sound engine of any kind.**
 *
 * ## The library's third `kind: 'sequencer'`, and the argument has not changed
 *
 * The overview says it in one sentence and the connections page repeats it: *"The T1 does not
 * generate audio; it controls external instruments and systems over MIDI, CV/Gate, analog clock,
 * and Wi-Fi (Ableton Link)."* The specifications page enumerates every socket on the back — four
 * CV out, one CV in, two gate out, clock and reset in and out, MIDI in, out and thru, USB-C — and
 * not one of them is audio.
 *
 * So the Metropolix's and the Hapax's reading applies unchanged, and the temptation arrives in
 * the same costume: sixteen tracks per pattern that look like voices. They are not. A track is a
 * MIDI channel and destination or a CV/gate assignment, and the sound belongs to whatever is on
 * the other end. `/t1/tracks-patterns-banks/tracks/` says so in its own words — *"one Track might
 * be a kick drum, another a bassline"* — and every one of those is a part played on another box.
 * Invented assignables would let the resolver put a kick "on the T-1", which is not a thing that
 * can happen.
 *
 * **`voices: []` therefore, and `recipes: []` with it.** A recipe must address a voice this
 * device declares (`DeviceSchema`), so a box with no voices can carry no recipe — the two are one
 * decision, not two. The twenty-two-page parameter reference is a reference for *this box's own
 * sequencer*, not for a sound: `STEPS 1-64`, `DIVISION 1/16`, `SUSTAIN 50%`, `TEMPO 24-280` are
 * settings of the pattern, which §4.3 makes the template's business rather than the device's.
 * They are cited below wherever they are a capability, and nowhere as a recipe, because there is
 * no part to hang one on.
 *
 * ## The document, and why every citation carries a date
 *
 * **The T-1 publishes no PDF.** `manuals/torso-t1/` is a text mirror of the official
 * documentation at `docs.torsoelectronics.com/t1/`, taken 2026-08-28, in the shape
 * `manuals/deluge-community/` already uses. `manuals/README.md` states the citation form and the
 * reason for it: a live URL cited without a date means nothing, because the page can change under
 * the citation. So every `source` here is a path plus `fetched 2026-08-28`.
 *
 * **Images were dropped in the conversion, and two facts in this file live only in one.** The
 * mirror's own README warns of it — *"a value that exists only in a picture is NOT in this
 * mirror"* — which is `CLAUDE.md`'s dimension-callout rule wearing a different file format. Two
 * readings came off the live pages rather than the text:
 *
 *  - **The silkscreen.** `/t1/what-is-the-t1/t1-overview/hardware-interface/` prints a table of
 *    seven numbered back-panel groups and no names. The figure beside it labels every socket:
 *    `gate a b`, `cv a b c d`, `cv mod in`, `sync in clk rst`, `sync out clk rst`,
 *    `midi in out thru`, `usb`. The jack ids below are those words. Read out of the text alone,
 *    this box would have had fifteen sockets with numbers for names.
 *  - **`cv mod`.** The text calls it "CV Input" and never says what it does; the silkscreen calls
 *    it `cv mod`, and `/t1/parameter-reference/shape/range-phrase/` closes the loop by listing
 *    `CV input | [VB16]` as one of the selectable Phrase shapes. So the socket is a modulation
 *    input for the pitch-movement shape, which is a different thing from a pitch or clock input
 *    and would have been guessed wrong from either name on its own.
 *
 * The panel figure is the third, and `panel.ts` records what came off it.
 *
 * ## Clock, and a `preferredSource` the documentation states as a role
 *
 * §7.4 asks for a judgement about this box's job in a rig rather than about its capability, and
 * warns that a `canSendClock` page must not stand in for one. This document answers in a field
 * labelled *Role*: `/t1/what-is-the-t1/t1-overview/power-and-connections/` opens with three
 * bullets — Power, Connections, and **`Role: Sequencer and clock hub for hybrid rigs`**. That is
 * Torso naming the job, not the wire, and it is corroborated rather than assumed:
 * `/t1/midi-and-analog-sync/clock-conversion/` opens *"The T1 can act as a clock bridge"* and
 * every one of its three quick-start recipes has the T-1 distributing timing outward.
 *
 * The claim's page is deliberately not the capability's. `clock.canSendClock` cites the T1 Config
 * MIDI I/O page, which proves only that the box can.
 *
 * **All four transports go both ways.** MIDI I/O offers Clock in and out on USB and on TRS
 * separately; Sync offers analog Clock In and Clock Out with their own PPQN; and Link is
 * peer-to-peer — *"any participant can adjust the tempo, and the change propagates to the rest"*,
 * with a worked example where tempo is set from the T-1 and a DAW follows. So neither
 * `sendTransport` nor `receiveTransport` is declared: both would restate `transport`. That is a
 * documented difference from the two MPCs, whose manuals print Ableton Link on the Receive list
 * and not the Send list, and which therefore split the two.
 *
 * **Every transport carries a `sourceSetup`** (§7.4/#104), because every one of them is a switch
 * in T1 Config rather than a default. A reader told "T-1 over MIDI, sync everything else to it"
 * and left to find TRS Clock Out for themselves gets silence.
 *
 * ## Two things the documentation says that this file does not simply repeat
 *
 * **`midi thru` is a thru or a second out, and the manifest declares the socket rather than the
 * setting.** T1 Config's `Thru port functionality` takes `Thru` (MIDI In -> Thru) or `Out 2`
 * (Out -> Thru). Both are real and neither is the box's state; the jack carries `midi` and its
 * note names the switch, which is the same move the recipes on a two-scale control make
 * (`CLAUDE.md`) — the pairing cannot come apart if it is not asserted in the first place.
 *
 * **The four CV outputs are not pitch outputs, and saying so has a consequence.** T1 Config's
 * CV/Gate menu gives `CV A`-`CV D` a `Function` of `Pitch`, `Velocity` or `Gate`, and no page
 * states a default. So `signal` is all three kinds, which is literally what the socket carries
 * across its settings — and §3.3's sole-kind rule then excludes them from primary voice-control
 * bundles, so **this box is not offered as a thing that plays another box's voice**. That is the
 * conservative answer and it is the right one: the Cascadia's end-of-attack outputs are the case
 * the rule exists for, and a guide that tells a reader to patch pitch out of a socket currently
 * set to Velocity is wrong in exactly that way. The jack notes name the setting that makes it a
 * pitch output, which is the honest form of the claim.
 *
 * **A second thing would have to change before that could be reconsidered, and it is worth
 * recording.** #201 pairs a multitrack CV sequencer's pitch and gate sockets by *trailing
 * ordinal* — the Hapax's `Cv out 1` with `gate out 1`. This box numbers nothing: its sockets are
 * `cv a`-`cv d` and `gate a`-`gate b`, and `/t1/appendix/t1-config/cv-gate/` pairs `CV A` with
 * `Gate A` in as many words (*"assign CV A and Gate A to Channel 1"*). So the shape #201 solved
 * is here with letters where it had digits, and `trailingOrdinal` reads digits. That is a finding
 * about the engine rather than a defect in this manifest (skill §6, #57), it is raised rather
 * than worked around, and it changes nothing today because the `Function` reading above already
 * settles the same question.
 *
 * ## What is not modelled
 *
 * Almost all of it, and by design. Euclidean steps and pulses, cycles, repeats, the phrase and
 * groove shapes, per-step parameter locks, the sixteen banks of sixteen patterns, CC tracks, FX
 * tracks, the chromatic keyboard, hold, mute and temp are sequencer configuration — the shape of
 * a pattern, which §4.3 makes the template's business. A device manifest contributes
 * `articulation` addressed by `PatternSlot`, and with no recipes there is nothing to hang it on.
 *
 * `noteDuration` is omitted for that reason and not for want of a page:
 * `/t1/parameter-reference/groove/sustain/` gives `SUSTAIN` a default of *"50%, equal to one full
 * division"* and would be a clean `per-note-value`. It is only ever read for a part a device
 * carries, this box carries none, and both neighbouring sequencers omit it too.
 */

const DOCS = 'Torso T-1 docs'
const FETCHED = 'fetched 2026-08-28'

/**
 * Every citation is a documentation path plus the date the mirror was taken, which is the form
 * `manuals/README.md` prescribes for a source that has no edition and no page.
 */
function cite(path: string): Cite {
  return { kind: 'manual', source: `${DOCS}, ${path}, ${FETCHED}` }
}

const SPECS = '/t1/what-is-the-t1/t1-overview/technical-specifications/'
const HARDWARE = '/t1/what-is-the-t1/t1-overview/hardware-interface/'
const POWER = '/t1/what-is-the-t1/t1-overview/power-and-connections/'
const OVERVIEW = '/t1/what-is-the-t1/t1-overview/'
const MIDI_CONN = '/t1/midi-and-analog-sync/midi-connectivity/'
const ANALOG_SYNC = '/t1/midi-and-analog-sync/analog-sync/'
const LINK = '/t1/midi-and-analog-sync/wifi-and-ableton-link/'
const CFG_SYNC = '/t1/appendix/t1-config/sync/'
const CFG_MIDI = '/t1/appendix/t1-config/midi-io/'
const CFG_CV_GATE = '/t1/appendix/t1-config/cv-gate/'
const PER_STEP_PAGE = '/t1/core-concepts/per-step-editing/'
const LFO_PAGE = '/t1/core-concepts/modulation/phrase-groove/'
const RANGE_PHRASE = '/t1/parameter-reference/shape/range-phrase/'
const TRACKS = '/t1/tracks-patterns-banks/tracks/'

/**
 * §2.3. The parameters `/t1/core-concepts/per-step-editing/` names as lockable to a single step,
 * in the order that page lists them under *"What You Can Change Per Step"*.
 *
 * **The list is the page's examples, and the page's mechanic is wider than its examples.** *"Turn
 * one or more parameter (KNOBS) to lock changes to that step"* is every track parameter on the
 * panel, and the sixth bullet is the open *"Tonal or modulation controls"*. Naming five is what
 * the document actually enumerates; naming eighteen would be this author generalising a sentence.
 *
 * **Declared, and currently unreachable**, exactly as the Hapax's eight note-event parameters and
 * the Metropolix's eight stage lanes are. `perStep` exists so a recipe's `articulation` can name a
 * lane this device has; this device has no recipes. They are here because the alternative is a
 * manifest that silently knows less than the document.
 */
const PER_STEP = ['pitch', 'velocity', 'timing', 'sustain', 'repeats'] as const

export const device: Device = {
  id: 'torso-t1',
  name: 'T-1',
  maker: 'Torso Electronics',
  kind: 'sequencer',

  /**
   * Sends and receives on all four transports, and T1 Config's two menus are the whole claim.
   *
   * MIDI I/O gives `Notes`, `Clock`, `Start / Stop` and `Program Change` their own enables, in
   * each direction, separately for USB and for TRS. Sync gives the analog clock a rate of 1, 2,
   * 4, 8, 12, 16 or 24 PPQN for Clock In and for Clock Out independently, a Clock Out pulse width
   * of 15% to 85%, and Reset In and Reset Out each a `reset` or `run` mode. The Link section
   * carries `Link Synchronisation` and `Start Stop Sync`.
   *
   * `preferredSource: true` on a page that names the box's role rather than its capability — see
   * the module JSDoc.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock', 'ableton-link'],
    preferredSource: true,

    /**
     * §7.4/#104. Four transports, four switches, and none of them is a default. The paths are
     * T1 Config's own menu names — this box has no screen, so the settings live in the companion
     * application and there is nowhere else for a reader to go.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'T1 Config > MIDI I/O > TRS > Out',
        value: 'Clock enabled',
        note: 'Enable Start / Stop on the same row for transport. Out 2 is configured separately, and only exists when the Thru port is set to Out 2.',
      },
      {
        transport: 'usb',
        path: 'T1 Config > MIDI I/O > USB > Out',
        value: 'Clock enabled',
        note: 'The same four message types as TRS, enabled independently: Notes, Clock, Start / Stop, Program Change.',
      },
      {
        transport: 'analog-clock',
        path: 'T1 Config > Sync > Analog clock > Clock Out',
        value: 'PPQN 24',
        note: '1, 2, 4, 8, 12, 16 or 24 — match the receiving device. Pulse Width sets how long each pulse stays high, 15% to 85%.',
      },
      {
        transport: 'ableton-link',
        path: 'T1 Config > Sync > Link > Link Synchronisation',
        value: 'enabled',
        note: 'Link is peer-to-peer, so this makes the T-1 a participant that can set the session tempo rather than a leader on a wire. Add Start Stop Sync for transport.',
      },
    ],
  },

  /**
   * §2.3's `main: 'none'`. Two pages say the same thing in the same words — *"The T1 is a
   * sequencer and does not generate audio"* — and the specifications page enumerates the back
   * panel without naming an audio socket. See the module JSDoc.
   */
  io: { main: 'none', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * §10. `304 mm x 114 mm x 39 mm (11.9" x 4.5" x 1.5")`, printed on the specifications page with
   * its own inch conversion, so the figure checks itself before anything else does.
   *
   * The box is played long-edge-on, which makes 304 the horizontal span and 114 the depth — and
   * unlike the Hapax, **the drawing can check it**: the front-panel figure's border measures
   * 1673 x 627.5 px, an aspect of 2.6661 against the specification's 2.6667. `panel.ts` records
   * the measurement. That agreement is what rejects the 39 mm, which a careless reading of three
   * numbers in a row could have taken for the rise.
   */
  physical: {
    panelSpanMm: 304,
    verified: { kind: 'manual', source: `${DOCS}, ${SPECS}, ${FETCHED}` },
  },

  /** §10. A simplified original drawing of the control surface — see `panel.ts` for the method. */
  panel: T1_PANEL,

  /**
   * §3.3. **The back panel, whole**, in the silkscreen's own words.
   *
   * **The names came off the figure, not the text.** The hardware-interface page's back-panel
   * table numbers seven groups and names none of the sockets; the drawing beside it labels every
   * one. Ids are `<group> · <socket>` exactly as the panel prints them: a legend under a run of
   * sockets, and a letter or a word over each.
   *
   * **`usb` is one socket in both directions and is declared as an output.** The Hapax has two
   * USB ports and could give one to each direction; this box has one, class-compliant MIDI runs
   * both ways over it, and clock can be enabled in either. `direction` takes one value, and the
   * one this box is authored for is the one its Role sentence names — so it is the `usb` clock
   * *output*, and its note says the rest rather than leaving a reader to assume the port is
   * one-way.
   *
   * **The two reset sockets carry two kinds because they have two modes**, and the modes differ
   * in exactly the way `JackSignalKind` separates: `reset` fires on a rising edge, where `run`
   * stays high for as long as the pattern plays. That is a trigger and a gate, and the note names
   * which setting picks which.
   */
  jacks: [
    {
      id: 'midi · in',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: '3.5 mm TRS Type A — Type B adapters are incompatible. Enable Clock under T1 Config > MIDI I/O > TRS > In to follow it.',
    },
    {
      id: 'midi · out',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: '3.5 mm TRS Type A. Clock and Start / Stop are enabled per message type under T1 Config > MIDI I/O > TRS > Out.',
    },
    {
      id: 'midi · thru',
      direction: 'out',
      signal: ['midi'],
      note: 'Thru or a second independent out, set by T1 Config > MIDI I/O > Thru port functionality: Thru forwards MIDI In, Out 2 gives a second sequencer output.',
    },
    {
      id: 'usb',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['usb'],
      note: 'Bidirectional and the power inlet too: USB-C at 5 V, 390 mA or more, class-compliant MIDI both ways, and Clock and Start / Stop enabled per direction in T1 Config.',
    },
    {
      id: 'cv mod · in',
      direction: 'in',
      signal: ['cv'],
      note: 'A modulation input, not a pitch or clock input: selecting [VB16] in the Phrase list makes this socket the shape that moves Range.',
    },
    {
      id: 'sync in · clk',
      direction: 'in',
      signal: ['clock'],
      clock: ['analog-clock'],
      note: 'Set Clock In PPQN to match the sender — 1, 2, 4, 8, 12, 16 or 24. Use a 3.5 mm mono (TS) cable.',
    },
    {
      id: 'sync in · rst',
      direction: 'in',
      signal: ['gate', 'trigger'],
      note: 'Two modes: reset starts or resets the Pattern on the rising edge; run starts on the rising edge and stops on the falling one.',
    },
    {
      id: 'sync out · clk',
      direction: 'out',
      signal: ['clock'],
      clock: ['analog-clock'],
      note: 'Clock Out has its own PPQN and a pulse width of 15% to 85%, both under T1 Config > Sync > Analog clock.',
    },
    {
      id: 'sync out · rst',
      direction: 'out',
      signal: ['gate', 'trigger'],
      note: 'Two modes: reset sends a short pulse when the Pattern starts; run stays high while the T-1 plays and low while it is stopped.',
    },
    {
      id: 'gate · a',
      direction: 'out',
      signal: ['gate'],
      note: 'Routing sets which MIDI channel the socket follows, 1 to 16; Trig sets V-trig or S-trig; Voice stealing takes Top, Bottom or Re-trig.',
    },
    { id: 'gate · b', direction: 'out', signal: ['gate'] },
    {
      id: 'cv · a',
      direction: 'out',
      signal: ['pitch-cv', 'cv', 'gate'],
      note: 'Function decides which: Pitch, Velocity or Gate. Set it to Pitch for an oscillator, then match Scaling to the destination — V/Oct, 1.2V/Oct or Hz/V. Pair it with gate · a, which is the routing T1 Config’s 2-voices preset uses.',
    },
    { id: 'cv · b', direction: 'out', signal: ['pitch-cv', 'cv', 'gate'] },
    { id: 'cv · c', direction: 'out', signal: ['pitch-cv', 'cv', 'gate'] },
    { id: 'cv · d', direction: 'out', signal: ['pitch-cv', 'cv', 'gate'] },
  ],

  /**
   * §2.6/#22. Every capability fact above, keyed by field path, plus the six negatives that make
   * this box a sequencer rather than an instrument.
   *
   * The six `cited-against` entries are #120's state for a document that answers in the other
   * direction. This documentation does not fail to say whether the box makes a sound; it says
   * twice that it does not, and enumerates the back panel without an audio socket. That is a
   * positive finding with a page, and it is the whole reason `voices` is empty.
   *
   * **`content` is the sixth**, and `DeviceSchema` asks for it in those words: a citation on that
   * path with no `content` declared is refused unless it is `cited-against`. The question
   * §2.6/#111 asks is what audio the box plays, and this box plays none — so the question is
   * answered rather than open, and the page it is answered on is named.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(CFG_MIDI),
    'clock.canReceiveClock': cite(CFG_MIDI),
    'clock.transport': cite(POWER),
    // §7.4's judgement, and deliberately not the capability's page: `Role: Sequencer and clock
    // hub for hybrid rigs` names the job, where the MIDI I/O page proves only that the box can.
    'clock.preferredSource': cite(POWER),

    'clock.sourceSetup[midi-din]': cite(CFG_MIDI),
    'clock.sourceSetup[usb]': cite(CFG_MIDI),
    'clock.sourceSetup[analog-clock]': cite(CFG_SYNC),
    'clock.sourceSetup[ableton-link]': cite(CFG_SYNC),

    'io.main': {
      kind: 'cited-against',
      reason:
        'the specifications page enumerates the whole back panel — 4 CV outputs, 1 CV input, clock and reset in and out, 2 gate outputs, MIDI in, out and thru, USB-C — and names no audio socket, which is the same answer the overview gives in words: the T1 does not generate audio',
      cite: cite(SPECS),
    },
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'the six CV and gate sockets carry pitch, velocity, gates and triggers as T1 Config assigns them; there is no audio to send anywhere, so there is no individual out to count',
      cite: cite(CFG_CV_GATE),
    },
    'io.audioIn': {
      kind: 'cited-against',
      reason:
        'the one input on the box other than MIDI and sync is cv mod, and the Phrase list makes it a modulation shape for pitch movement rather than a signal the box listens to',
      cite: cite(RANGE_PHRASE),
    },
    'io.usbAudio': {
      kind: 'cited-against',
      reason:
        'the USB-C port is described as power and class-compliant USB MIDI, and T1 Config divides what crosses it into Notes, Clock, Start / Stop and Program Change with no audio among them',
      cite: cite(CFG_MIDI),
    },
    voices: {
      kind: 'cited-against',
      reason:
        'the sixteen tracks per pattern are routings rather than voices: each one takes a MIDI channel and a destination or a CV/gate assignment, and the page describing them says a track might be a kick drum or a bassline — parts played on whatever is on the other end of the cable',
      cite: cite(TRACKS),
    },
    content: {
      kind: 'cited-against',
      reason:
        'there is nothing for this box to load audio into: it generates no audio at all, so its storage holds 16 banks of 16 patterns and their settings rather than samples, and no recipe here can carry sourceAudio because there is no voice to hang one on',
      cite: cite(OVERVIEW),
    },

    'features.perStep': cite(PER_STEP_PAGE),
    'features.lfo': cite(LFO_PAGE),

    'jacks[midi · in]': cite(MIDI_CONN),
    'jacks[midi · out]': cite(MIDI_CONN),
    'jacks[midi · thru]': cite(MIDI_CONN),
    'jacks[usb]': cite(POWER),
    // The socket the text calls "CV Input" and the panel calls `cv mod`; the Phrase list is what
    // says which of the two names describes the job.
    'jacks[cv mod · in]': cite(HARDWARE),
    'jacks[sync in · clk]': cite(ANALOG_SYNC),
    'jacks[sync in · rst]': cite(CFG_SYNC),
    'jacks[sync out · clk]': cite(ANALOG_SYNC),
    'jacks[sync out · rst]': cite(CFG_SYNC),
    'jacks[gate · a]': cite(CFG_CV_GATE),
    'jacks[gate · b]': cite(CFG_CV_GATE),
    'jacks[cv · a]': cite(CFG_CV_GATE),
    'jacks[cv · b]': cite(CFG_CV_GATE),
    'jacks[cv · c]': cite(CFG_CV_GATE),
    'jacks[cv · d]': cite(CFG_CV_GATE),
  },

  manual: {
    title: 'Torso T-1 documentation',
    edition: 'docs.torsoelectronics.com/t1/, mirrored 2026-08-28 (firmware 2.1.5)',
  },

  /**
   * §2.4. No voices, so no assignables, so no recipes — and sixteen tracks per pattern are the
   * reason this needs saying rather than being obvious. See the module JSDoc.
   */
  voices: [],
  recipes: [],

  /**
   * `perStep` is the five parameters the per-step page enumerates (see `PER_STEP` above).
   *
   * `lfo` is the two shapes the documentation itself calls LFO modulation: *"The two options for
   * LFO modulation on the T1 are Phrase, which adds pitch movement, and Groove, which adds
   * velocity movement."* They are tempo-synced by the modulation page's own first paragraph, and
   * their lengths are set in bars — 1, 2, 4, 8, 16, 32 or 64 — so `syncable: true` is the page's
   * claim rather than a reading of what an LFO usually is. Two, per track, with one destination
   * each: Phrase is bound to Range and Groove to Accent, and neither can be pointed elsewhere.
   *
   * **Random modulation is deliberately not counted here.** It is the box's other modulation
   * system, it can be assigned to nearly any parameter, and it is a sixteen-step pseudo-random
   * sequence rather than a shape — the same page separates the two, and folding them together
   * would make `count` mean two different things at once.
   *
   * No `sidechain`: it needs an audio path and there is none.
   */
  features: {
    perStep: [...PER_STEP],
    lfo: { count: 2, syncable: true, destinations: ['pitch', 'velocity'] },
  },
}
