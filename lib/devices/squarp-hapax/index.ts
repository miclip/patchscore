import type { Device } from '../../core/device'
import type { Cite } from '../../core/params'
import { HAPAX_PANEL } from './panel'

/**
 * Squarp Hapax (§2.3). A desktop **sequencer**: two projects of sixteen tracks each, a 128-pad
 * matrix, four MIDI outputs, four CV/gate pairs, and **no sound engine of any kind**.
 *
 * ## The library's second `kind: 'sequencer'`, and it reads the same way the first did
 *
 * Everything this box emits is control data. Its outputs are four MIDI ports, two USB ports,
 * four CV outputs and four gate outputs (p.28); its inputs are two MIDI ports, two USB ports and
 * two CV inputs (p.27). There is no audio path, no oscillator and no filter anywhere in 159
 * pages, and the two connectivity figures that enumerate every socket on the back name not one
 * audio jack.
 *
 * So the Metropolix's argument applies unchanged (`lib/devices/intellijel-metropolix/index.ts`),
 * and the temptation is the same one wearing a bigger number: Hapax has **sixteen tracks per
 * project** that look like voices, and modelling them as voices would put sixteen — or
 * thirty-two — assignables into every search on this rig. They are not voices. A track is a
 * stream of MIDI or CV going out a port to whatever is patched there; the sound belongs to that
 * other box, and so does the recipe. Invented assignables would let the resolver put a kick "on
 * the Hapax", which is not a thing that can happen.
 *
 * **`voices: []` therefore, and `recipes: []` with it.** A recipe must address a voice this
 * device declares (`DeviceSchema`), so a box with no voices can carry no recipe — the two are one
 * decision, not two.
 *
 * **`io.main: 'none'`.** `mono` or `stereo` would make both renderers print a main out that is
 * not there and make §10's rack draw an audio jack nobody can plug into. `audioIn: false` and
 * `usbAudio: false` for the same reason: both USB ports carry MIDI, and p.90 describes them as
 * sixteen independent MIDI ports each.
 *
 * There is one place audio touches this box and it is not an audio path: §11.12 (p.148) has a
 * DAW send an *audio* clock signal into a CV input, because a computer's USB MIDI clock jitters.
 * That is a voltage arriving at a CV socket to be counted, not a signal the box listens to, and
 * it is recorded at `jacks[Cv in 1]` rather than in `io`.
 *
 * ## Clock, and why `preferredSource` is citable here rather than argued
 *
 * §7.4 asks for a judgement and this manual supplies one in its own words. p.130's CLOCK SOURCE
 * table opens: *"INTERNAL — Hapax will use its internal clock (to be the synchronisation
 * leader)."* That is the manual naming the box's job in a rig, not a capability, which is exactly
 * the distinction `preferredSource` exists to carry. The Tracker Mini's claim rests on the same
 * kind of sentence (*"a perfect fit for the centre piece of a setup"*, p.283 of that manual); the
 * Metropolix's rests on a definition, its manual's own first line calling it a musical sequencer.
 * This one is the least argued of the three, because the word is on the page.
 *
 * The box sends and receives on all three transports, and the settings pages are exhaustive
 * about both directions: CLOCK SOURCE takes MIDI IN A, MIDI IN B, USB HOST, USB DEVICE, CV IN 1
 * or CV IN 2 (p.130), and Sync output offers CLOCK+TRANSPORT on MIDI A-D and on both USB ports
 * (p.132) plus GATE CLOCK on any of the four gate outputs (p.133).
 *
 * **Every transport needs a setting turned on, so all three carry a `sourceSetup`** (§7.4/#104).
 * This is the case that field was added for: a reader told "Hapax over `midi-din`, sync
 * everything else to it" and left to discover Sync output for themselves gets silence, because
 * every port ships at `––`.
 *
 * ## Two things the manual says that this file does not repeat
 *
 * **p.90 lists MIDI C and MIDI D as track *input* ports, and the box has no such sockets.**
 * §1.24 is explicit twice over — *"Hapax can simultaneously receive MIDI from all 16 channels of
 * each of its 4 inputs: in A, in B, usb host, usb device"* (p.27) — and the input strip drawn
 * beneath it labels two MIDI sockets, not four. The output strip on p.28 labels four. So the
 * INPUT PORT row on p.90 names two ports that are not on the back of the box, and this file
 * declares the sockets the figures draw. Recorded rather than smoothed over, in the manner
 * `moog-subsequent-37` records its manual's six disagreements.
 *
 * **A footswitch socket is documented and never located.** §11.5 (p.140) assigns commands to
 * PEDAL (TIP) and PEDAL (RING) and describes mono and stereo pedals, so the jack plainly exists,
 * but neither connectivity figure labels it and no page names its silkscreen. §3.3 wants the
 * name on the panel; there is no page that prints one, so the socket stays undeclared rather
 * than being given an id this author made up.
 *
 * ## What is not modelled
 *
 * Almost all of it, and by design. The eight per-track effects and their parameters (ch.7), the
 * five algorithms (ch.8), the two project LFOs (p.108), patterns, sections, songs, follow
 * actions, MPE, time elasticity and the whole settings tree are sequencer configuration — the
 * shape of a pattern, which §4.3 makes the template's business rather than the device's. A
 * device manifest contributes `articulation` addressed by `PatternSlot`, and with no recipes
 * there is nothing to hang articulation on.
 *
 * `noteDuration` is omitted for that reason and not for want of a page: p.47's NOTE LENGTH runs
 * `1/16 … INFINITY` per note event and would be a clean `per-note-value`. It is only ever read
 * for a part a device carries, this box carries none, and the Metropolix — the neighbouring
 * sequencer, in the same position — omits it too.
 *
 * ## The panel, and why it took a projection to draw
 *
 * Neither document contains a plan view of the control surface: the manual's illustrations are
 * OLED screenshots, pad-grid schematics and two rear-panel strips, and the Quickstart's INTERFACE
 * OVERVIEW (p.16) is drawn in axonometric. That is measurable rather than merely suggestive — a
 * parallel projection maps a flat panel by an affine transform — and `panel.ts` records the
 * mapping, the two checks that fell out of it, and the one block on the right that is drawn as a
 * plain grid rather than measured control by control.
 */

const MANUAL = 'Hapax Manual (22 June 2026)'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * §2.3. The eight parameters every note event carries, in the order p.47 prints them and under
 * the names the left screen puts over the eight encoders: *"Each note event includes its own set
 * of 8 parameters : Note & Octave, Velocity, Length, μTime, Chance, Roll, Math."* Seven names for
 * eight encoders, because pitch and octave take one each.
 *
 * **Declared, and currently unreachable**, exactly as the Metropolix's eight stage lanes are.
 * `perStep` exists so a recipe's `articulation` can name a lane this device has; this device has
 * no recipes, so all eight are true about the hardware and unable to become an instruction. They
 * are here because the alternative is a manifest that silently knows less than the manual.
 */
const PER_STEP = [
  'pitch',
  'octave',
  'velocity',
  'length',
  'utime',
  'chance',
  'roll',
  'math',
] as const

export const device: Device = {
  id: 'squarp-hapax',
  name: 'Hapax',
  maker: 'Squarp Instruments',
  kind: 'sequencer',

  /**
   * Sends and receives on all three transports, and the two settings pages are the whole claim.
   *
   * Receiving (p.130): CLOCK SOURCE takes `MIDI IN A`, `MIDI IN B`, `USB HOST`, `USB DEVICE`,
   * `CV IN 1`, `CV IN 2` or `MIDI AUTO`. The CV entries are a step-advance trigger clock whose
   * expected rate is set by CV CLOCK RATE, from 1/4 (1 PPQN) to 1/96 (24 PPQN) (p.131).
   *
   * Sending (pp.132-133): MIDI A, MIDI B, MIDI C, MIDI D, USB DEVICE and USB HOST each take
   * `CLOCK+TRANSPORT`, `CLOCK` or `TRANSPORT`; GATE CLOCK puts a 50% duty-cycle clock on any one
   * of the four gate outputs at a rate GATE CLOCK DIV sets from 1/96 to 1/1.
   *
   * `preferredSource: true` on the manual's own word — p.130 glosses the internal clock as being
   * *"the synchronisation leader"*. See the module JSDoc.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb', 'analog-clock'],
    preferredSource: true,

    /**
     * §7.4/#104. Every port ships at `––` and emits nothing until it is set, so all three
     * transports carry their menu path in the box's own words.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'settings > sync output > MIDI A',
        value: 'CLOCK+TRANSPORT',
        note: 'MIDI B, C and D have the same row and the same four options; set the one the cable is in.',
      },
      {
        transport: 'usb',
        path: 'settings > sync output > USB DEVICE',
        value: 'CLOCK+TRANSPORT',
        note: 'USB HOST has the same row. Either port can also send on virtual cables 2-16.',
      },
      {
        transport: 'analog-clock',
        path: 'settings > sync output > GATE CLOCK',
        value: 'GATE 1',
        note: 'GATE 2, 3 and 4 are the other choices, and GATE CLOCK DIV sets the rate — 1/96 to 1/1.',
      },
    ],
  },

  /**
   * §2.3's `main: 'none'`. Every socket on this box carries MIDI, pitch CV, a gate or USB; the
   * two connectivity figures (pp.27-28) enumerate the back panel and name no audio jack at all.
   * See the module JSDoc for the one place audio touches the box, which is a CV input counting a
   * pulse train rather than an audio path.
   */
  io: { main: 'none', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * §10. **The only figure in this manifest with no page behind it**, so `verified: false`
   * rather than a citation-shaped comment (the `teenage-engineering-op-xy` case, recorded there
   * at `physical`).
   *
   * Neither document prints a dimension. The manual has no specifications page — it is a print
   * of the online manual and ends at the shortcut tables — and the Quickstart is a poster. The
   * word `mm` occurs in neither except as a connector size.
   *
   * The figure is Squarp's, by way of two retailers, and they disagree in a way that resolves
   * cleanly: one prints `385 x 206 x 58 mm`, the other `358 x 206 x 58 mm = 14.1 x 8.1 x 2.3 in`.
   * 358 mm is 14.09", so the second is internally consistent and the first has transposed two
   * digits; 385 mm would be 15.16". So 358 is the width, and the panel is played long-edge-on,
   * which makes 358 the horizontal span and 206 the depth.
   *
   * **The drawing cannot check it**, which is the difference from the OP-XY, where a measured
   * panel aspect landed within 1% of the store figure. The only full-panel figure here is an
   * axonometric one, and a parallel projection foreshortens the two axes by different amounts, so
   * the ratio of its drawn edges is not the ratio of the real ones. Nothing available corroborates
   * 358 x 206 beyond the inch conversion printed beside it.
   */
  physical: {
    panelSpanMm: 358,
    // #191. Squarp publishes it and the note above resolves which of their two figures is right,
    // by the inch conversion printed beside one of them. That is a reading somebody did, not an
    // absence — `false` said nobody had looked. The source names the disagreement so the next
    // reader meets it rather than rediscovering it.
    verified: {
      kind: 'maker',
      source: 'Squarp Hapax product page, 358 x 206 x 58 mm (the 385 figure elsewhere transposes two digits)',
    },
  },

  /** §10. A simplified original drawing of the control surface — see `panel.ts` for the method. */
  panel: HAPAX_PANEL,

  /**
   * §3.3. **The back panel, whole**, as the two connectivity figures label it (pp.27-28). Both
   * strips draw every socket and grey out the half the page is not about, so between them they
   * name the panel.
   *
   * **Ids are the figures' labels, extended by the routing menu's ordinal.** The figures label
   * groups — `Cv out 1+2+3+4`, `gate out 1+2+3+4` — while the box addresses the sockets one at a
   * time: p.90's OUTPUT PORT row offers `CV 1 … CV 4` and `GATE 1 … GATE 4` separately, and
   * p.130's CLOCK SOURCE offers `CV IN 1` and `CV IN 2`. So `Cv out 3` is the figure's word and
   * the menu's number, which is what a reader is looking at and what they will select. That is a
   * naming decision and is stated as one.
   *
   * **`(trs)` stays on the two sockets the figure puts it on.** MIDI in B and MIDI out D are
   * 3.5 mm TRS where A, B and C out and A in are 5-pin DIN, and a reader reaching for a DIN
   * cable needs to know before they reach.
   *
   * **One socket carries clock per transport per direction**, which is what the schema allows and
   * the rack can draw. Every one of those has a `note` naming the alternatives, because on this
   * box the alternative is always a different real socket rather than a menu the reader cannot
   * see.
   */
  jacks: [
    {
      id: 'midi in A',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: 'CLOCK SOURCE = MIDI IN A makes this the sync input; MIDI IN B is the other choice (p.130).',
    },
    {
      id: 'midi in B (trs)',
      direction: 'in',
      signal: ['midi'],
      note: '3.5 mm TRS rather than 5-pin DIN (p.27).',
    },
    {
      id: 'Cv in 1',
      direction: 'in',
      signal: ['cv', 'gate', 'clock'],
      clock: ['analog-clock'],
      note: 'Step-advance clock at the rate CV CLOCK RATE sets, 1/4 (1 PPQN) to 1/96 (24 PPQN); CV IN 2 is the other choice. Also takes CV RESET and CV RUN gates, and an audio-rate sync signal from a DAW (pp.130-131, 148).',
    },
    {
      id: 'Cv in 2',
      direction: 'in',
      signal: ['cv', 'gate'],
      note: 'Input range is set for both CV inputs together: -5V to +5V, 0V to +5V or -1V to +1V (p.139).',
    },
    {
      id: 'usb device',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['usb'],
      note: 'Bidirectional: it appears to a computer as 16 independent MIDI ports each way (p.90) and carries sync in either direction (pp.130, 132).',
    },
    {
      id: 'usb host',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['usb'],
      note: 'Bidirectional: it hosts a class-compliant controller or instrument and carries MIDI and sync both ways (pp.27-28, 130, 132).',
    },
    {
      id: 'midi out A',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: 'Sync output must be set to CLOCK+TRANSPORT for the port the cable is in; B, C and D send the same clock (p.132).',
    },
    { id: 'midi out B', direction: 'out', signal: ['midi'] },
    {
      id: 'midi out C',
      direction: 'out',
      signal: ['midi'],
      note: 'Also the DIN-sync (Sync24) port for vintage gear, at a pulse rate DIN SYNC sets from 1/96 to 1/1 (p.132).',
    },
    {
      id: 'midi out D (trs)',
      direction: 'out',
      signal: ['midi'],
      note: '3.5 mm TRS rather than 5-pin DIN (p.28).',
    },
    {
      id: 'Cv out 1',
      direction: 'out',
      signal: ['pitch-cv'],
      note: 'CV OUT TYPE is one setting for all four: 1V/OCTAVE, 1.2V/OCTAVE (Buchla) or HZ/V (Korg MS, Yamaha CS). C5 is 0V on the V/octave scale (pp.139-140, 148).',
    },
    { id: 'Cv out 2', direction: 'out', signal: ['pitch-cv'] },
    { id: 'Cv out 3', direction: 'out', signal: ['pitch-cv'] },
    { id: 'Cv out 4', direction: 'out', signal: ['pitch-cv'] },
    {
      id: 'gate out 1',
      direction: 'out',
      signal: ['gate', 'clock'],
      clock: ['analog-clock'],
      note: 'GATE CLOCK selects which of the four gate outputs carries the clock, and GATE CLOCK DIV its rate (p.133). GATE POLARITY sets the ON level to 5V or 0V for all four (p.140).',
    },
    { id: 'gate out 2', direction: 'out', signal: ['gate'] },
    { id: 'gate out 3', direction: 'out', signal: ['gate'] },
    {
      id: 'gate out 4',
      direction: 'out',
      signal: ['gate'],
      note: 'Any gate output can instead be a run signal (GATE RUN) or a start/stop trigger (TRIG RESET) (p.133).',
    },
  ],

  /**
   * §2.6/#22. Every capability fact above, keyed by field path, plus the six negatives that make
   * this box a sequencer rather than an instrument.
   *
   * The six `cited-against` entries are the state #120 added for a document that answers in the
   * other direction: §1.24 does not fail to say whether this box makes a sound, it enumerates
   * every socket on the back and none of them is audio. That is a positive finding with a page,
   * and it is the whole reason `voices` is empty.
   *
   * **`content` is the sixth, and `DeviceSchema` asks for it in those words.** A citation on that
   * path with no `content` declared is refused with *"a reading that supports no claim is
   * `cited-against`"*, which is exactly the shape of this reading: the question §2.6/#111 asks is
   * what audio the box plays, and this box plays none, so it is answered rather than open. No
   * device in the library has reached `user-supplied`, because proving an absence of shipped
   * content is expensive — that is not what this says. It says the question does not arise, and
   * names the page it does not arise on.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(132),
    'clock.canReceiveClock': cite(130),
    'clock.transport': cite(130),
    'clock.preferredSource': cite(130),

    'clock.sourceSetup[midi-din]': cite(132),
    'clock.sourceSetup[usb]': cite(132),
    'clock.sourceSetup[analog-clock]': cite(133),

    'io.main': {
      kind: 'cited-against',
      reason:
        '§1.24 enumerates the back panel in both directions — four MIDI outs, two MIDI ins, two USB ports, four CV outs, four gate outs, two CV ins — and no audio socket appears in either figure or either paragraph',
      cite: cite(28),
    },
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'the eight per-track outputs on p.90 are CV and gate sockets carrying pitch and triggers; there is no audio to send anywhere, so there is no individual out to count',
      cite: cite(90),
    },
    'io.audioIn': {
      kind: 'cited-against',
      reason:
        'the only signal p.148 sends into this box that could be called audio is a clock pulse train arriving at a CV input to be counted, which is a sync source rather than an audio path',
      cite: cite(148),
    },
    'io.usbAudio': {
      kind: 'cited-against',
      reason:
        'p.90 describes both USB ports as sixteen independent MIDI ports of sixteen channels each, and no page describes audio over either',
      cite: cite(90),
    },
    voices: {
      kind: 'cited-against',
      reason:
        'the sixteen tracks per project are routings rather than voices: p.90 sets each one to a MIDI port and channel or to a CV/gate pair, and the sound is made by whatever is on the other end of that cable',
      cite: cite(90),
    },
    content: {
      kind: 'cited-against',
      reason:
        'there is nothing for this box to load audio into: §1.24 enumerates the back panel and no socket on it carries audio, so the SD card holds projects, settings and .mid files (pp.93, 130) rather than samples, and no recipe here can carry sourceAudio because there is no voice to hang one on',
      cite: cite(28),
    },
    'features.perStep': cite(47),

    'jacks[midi in A]': cite(27),
    'jacks[midi in B (trs)]': cite(27),
    'jacks[Cv in 1]': cite(27),
    'jacks[Cv in 2]': cite(27),
    'jacks[usb device]': cite(27),
    'jacks[usb host]': cite(27),
    'jacks[midi out A]': cite(28),
    'jacks[midi out B]': cite(28),
    'jacks[midi out C]': cite(28),
    'jacks[midi out D (trs)]': cite(28),
    'jacks[Cv out 1]': cite(28),
    'jacks[Cv out 2]': cite(28),
    'jacks[Cv out 3]': cite(28),
    'jacks[Cv out 4]': cite(28),
    'jacks[gate out 1]': cite(28),
    'jacks[gate out 2]': cite(28),
    'jacks[gate out 3]': cite(28),
    'jacks[gate out 4]': cite(28),
  },

  manual: { title: 'Hapax Manual', edition: '22 June 2026 (hapaxOS 3.10)' },

  /**
   * §2.4. No voices, so no assignables, so no recipes — and thirty-two tracks are the reason this
   * needs saying rather than being obvious. See the module JSDoc.
   */
  voices: [],
  recipes: [],

  features: { perStep: [...PER_STEP] },
}
