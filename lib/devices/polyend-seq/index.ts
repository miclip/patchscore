import type { Device } from '../../core/device'
import type { Cite } from '../../core/params'
import { SEQ_PANEL } from './panel'

/**
 * Polyend Seq (§2.3). A 60 cm desktop **sequencer**: eight tracks of thirty-two steps on a
 * 256-key grid, six clickable encoders, a four-line screen, two MIDI outputs — and **no sound
 * engine of any kind**.
 *
 * ## The library's fourth `kind: 'sequencer'`, and this one says so in its own first sentence
 *
 * p.1: *"The Polyend Seq is a polyphonic MIDI step sequencer designed for spontaneous performance
 * and instant creativity."* Everything it emits is control data. p.3 enumerates the back panel
 * left to right — a footswitch socket, two MIDI DIN outputs, a MIDI thru, a MIDI input, one USB
 * type B, a hidden firmware button, the 5 V inlet and the power switch — and the photograph above
 * it on p.2 shows the same eight things with their silkscreen legible. There is no audio socket
 * in either, and no oscillator or filter anywhere in sixteen pages.
 *
 * So the argument the Metropolix, the Hapax and the T-1 make applies unchanged, and this box
 * makes it easier than any of them: p.10 tells the story of *why* there is nothing to sound. The
 * CV outputs were designed in and then taken out — *"we planned a full set of 8 CV channels of
 * four outputs of the gate, pitch, velocity, and modulation located on the back panel… So we
 * decided to take out all the CV outputs from the Seq housing and made a separate instrument out
 * of it"* — and that instrument is Poly, a separate Eurorack module. The absence is a design
 * decision the manual narrates, not a reading that ran out.
 *
 * The temptation here is the eight track buttons. They are not voices. p.5's `Channel out` and
 * `MIDI Out` set each track to a MIDI channel and a port, and the sound belongs to whatever is on
 * the other end of that cable; modelling them as voices would put eight assignables into every
 * search on this rig and let the resolver put a kick "on the Seq", which is not a thing that can
 * happen. **`voices: []` therefore, and `recipes: []` with it** — a recipe must address a voice
 * this device declares (`DeviceSchema`), so the two are one decision rather than two.
 *
 * **`io.main: 'none'`**, and `audioIn`, `usbAudio` and `individualOuts` with it. `mono` or
 * `stereo` would make both renderers print a main out that is not there and make §10's rack draw
 * an audio jack nobody can plug into.
 *
 * ## Clock, and the setting that is per *track* rather than per port
 *
 * The box sends and receives on both its transports, and p.5's Tempo knob is the whole claim.
 * Receiving: *"Clock: Choose from internal, locked or external clock over USB and MIDI
 * connection. The Seq clock is a 48 PPQN MIDI standard."* Sending: the per-track `MIDI Out` row
 * offers `Out1, Out2, USB, Out1+Clk, Out2+Clk, USB+Clk`.
 *
 * That second list is why both transports carry a `sourceSetup` (§7.4/#104), and it is a sharper
 * case than the Hapax's. On this box clock output is not a port setting at all — it is a property
 * of a *track*, chosen from the same six-option row that chooses the port. A reader told "Seq
 * over `midi-din`, sync everything else to it" and left to find that row on their own gets a
 * cable full of notes and no tempo, and nothing on the panel to explain it, because `Out1` and
 * `Out1+Clk` are one setting apart and both look right.
 *
 * `preferredSource: true` on the manual's own word: p.10, *"Remember that the Seq can be the
 * heart of a sophisticated hardware rig, but will also do great with a favorite DAW."* §7.4 asks
 * for a judgement about the box's job in a rig rather than a capability, which is exactly what
 * that sentence supplies — the same footing as the Tracker Mini's *"centre piece of a setup"* and
 * the Hapax's *"synchronisation leader"*.
 *
 * ## Two things the manual says that this file records rather than smooths over
 *
 * **`MIDI Thru` is a hardware thru and nothing else.** p.9: *"There is no MIDI soft thru
 * implemented."* So the socket forwards what arrives at `MIDI In` and carries none of what the
 * Seq sequences — which is the opposite of what a reader reaching for a third output would
 * assume, and is why the jack's note says it rather than leaving `midi` to imply it.
 *
 * **Swing stops working when the box follows.** p.9: *"Swing parameter is not accessible while
 * Seq works on the external MIDI clock, in this setting, Seq won't send or receive swing from
 * external gear."* Nothing in the schema can carry that, because it is a consequence of the clock
 * decision on a control this manifest does not model. It is recorded here so the next reader
 * meets it instead of rediscovering it.
 *
 * ## What is not modelled
 *
 * Almost all of it, and by design. The 256 patterns and their linking, the 39 scales, the 29
 * chords, the play modes, the roll curves, quantize, random and the per-track polymetry are
 * sequencer configuration — the shape of a pattern, which §4.3 makes the template's business
 * rather than the device's. A device manifest contributes `articulation` addressed by
 * `PatternSlot`, and with no recipes there is nothing to hang articulation on.
 *
 * `noteDuration` is omitted for that reason and not for want of a page: p.8's step `Length`
 * *"edits the time span for single edited step"* and its track `Gate mode` sets gate time from 5%
 * to 100%, which is a clean `per-note-value`. It is only ever read for a part a device carries,
 * this box carries none, and all three neighbouring sequencers omit it too.
 *
 * ## The manual, and how its pages are cited
 *
 * `Polyend-Seq-Manual-2v2v6.pdf` is a print of the online manual — dompdf in the producer field,
 * YouTube embed URLs left in the body where the videos were — and **it carries no printed folios
 * at all**. The footers of pp.5, 9 and 14 were rendered and looked at: they are blank. So the
 * usual trap cannot spring here, because there is no printed number to disagree with the PDF one,
 * and every `p.N` below is the PDF page.
 *
 * `pdfimages -list` says the same thing the other way round: the only figures in the document are
 * on pp.2, 3, 10, 12, 13, 15 and 16. Pages 4 to 9 — every knob section, every parameter list, the
 * whole clock claim — are text and nothing else, so the extraction is the page.
 */

const MANUAL = 'Polyend Seq Manual 2.2.6'

function cite(...pages: number[]): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages.map((p) => `p.${p}`).join(', ')}` }
}

/**
 * §2.3. The twelve step parameters, in the order the six knob sections print them under their own
 * `Step parameters:` headings (pp.6-8), and under the names those headings use.
 *
 * **Declared, and currently unreachable**, exactly as the Hapax's eight note-event parameters and
 * the Metropolix's eight stage lanes are. `perStep` exists so a recipe's `articulation` can name
 * a lane this device has; this device has no recipes, so all twelve are true about the hardware
 * and unable to become an instruction. They are here because the alternative is a manifest that
 * silently knows less than the manual.
 */
const PER_STEP = [
  'note',
  'chord',
  'transpose',
  'link to',
  'velocity',
  'modulation',
  'move',
  'nudge',
  'length',
  'roll',
  'velo curve',
  'note curve',
] as const

export const device: Device = {
  id: 'polyend-seq',
  name: 'Seq',
  maker: 'Polyend',
  kind: 'sequencer',

  /**
   * Sends and receives on both transports, and p.5's Tempo knob is the whole claim — see the
   * module JSDoc. There is no analog clock socket on this box: the CV side of it became Poly.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['midi-din', 'usb'],
    preferredSource: true,

    /**
     * §7.4/#104. Clock output is a **per-track** choice on this box, made from the same row that
     * chooses the port, and a track set to `Out1` rather than `Out1+Clk` sends notes and no
     * tempo. Both transports therefore carry their path in the box's own words.
     *
     * The path is not a menu tree, because the Seq has none — p.1 is emphatic that *"There are no
     * hidden menus"*, and p.5 says the Tempo knob *"can also be used with the track buttons in
     * order to set their advanced MIDI and clock settings"*. So the path is the gesture.
     */
    sourceSetup: [
      {
        transport: 'midi-din',
        path: 'Tempo knob + track button > MIDI Out',
        value: 'Out1+Clk',
        note: 'Out2+Clk sends it out MIDI Out 2 instead; set it on the track whose cable is in the port. The plain Out1 and Out2 options send notes with no clock.',
      },
      {
        transport: 'usb',
        path: 'Tempo knob + track button > MIDI Out',
        value: 'USB+Clk',
        note: 'The same six-option row. Plain USB sends notes with no clock.',
      },
    ],
  },

  /**
   * §2.3's `main: 'none'`. Every socket on the back of this box carries MIDI, a switch closure or
   * power; p.3 enumerates them and p.2 photographs them, and neither names an audio jack. See the
   * module JSDoc for the page that says why there is not even a CV one.
   */
  io: { main: 'none', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * §10. p.14's specification line, read against the drawing rather than off the axis words:
   * it calls 145 mm the *width* and 600 mm the *length*, and the horizontal span of the surface as
   * played is the 600. `panel.ts` records the aspect check that settles it, which is the whole
   * reason this number is trustworthy rather than merely printed.
   */
  physical: {
    panelSpanMm: 600,
    verified: {
      kind: 'manual',
      source: `${MANUAL}, p.14 (Technical specifications), against the panel drawing on p.3`,
    },
  },

  /** §10. A simplified original drawing of the control surface — see `panel.ts` for the method. */
  panel: SEQ_PANEL,

  /**
   * §3.3. **The back panel, whole**, in p.3's own order and under its own names, checked against
   * the photograph on p.2 where the silkscreen is legible: `Footswitch`, `MIDI Out 1`, `MIDI Out
   * 2`, `MIDI Thru`, `MIDI In`, `USB`, `5VDC`.
   *
   * **Three of those are not declared, because they carry no signal.** The hidden firmware button
   * — p.11 puts it *"about 10mm below the back panel surface"*, and the photograph shows two
   * unlabelled holes on the strip without saying which one it is — the 5 V inlet and the power
   * switch are on the back panel and are not sockets a cable in this guide ever goes into.
   *
   * **`Footswitch` is the library's first pedal socket**, and it is declared where the Hapax's was
   * not: that manual assigns commands to a pedal it never locates or names, while this one prints
   * the name on the panel *and* in the text. `trigger` is the signal — p.3 gives it a single
   * press and a double press, which is a contact closing rather than a level being held.
   *
   * **`USB` is one socket in both directions and is declared as an output**, following the T-1,
   * which has the same shape for the same reason. The Hapax has two USB ports and can give one to
   * each direction; this box has one, class-compliant MIDI runs both ways over it (p.9), and
   * clock can be enabled in either. `direction` takes one value, and the one this box is authored
   * for is the one its `preferredSource` sentence names — so it is the `usb` clock *output*, and
   * its note says the rest rather than leaving a reader to assume the port is one-way.
   *
   * **One socket carries clock per transport per direction**, which is what the schema allows and
   * the rack can draw, so `MIDI Out 1` holds the `midi-din` output and `MIDI Out 2`'s note names
   * itself as the alternative.
   */
  jacks: [
    {
      id: 'Footswitch',
      direction: 'in',
      signal: ['trigger'],
      note: '6.35 mm (1/4") jack. A single press starts and stops playback; a double press starts recording — the same punch-in as holding Stop then Play.',
    },
    {
      id: 'MIDI Out 1',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: 'Clock leaves here only for a track whose MIDI Out is set to Out1+Clk; MIDI Out 2 is the other 5-pin DIN output and takes Out2+Clk.',
    },
    {
      id: 'MIDI Out 2',
      direction: 'out',
      signal: ['midi'],
      note: 'A second independent 5-pin DIN output, per track rather than a copy of the first.',
    },
    {
      id: 'MIDI Thru',
      direction: 'out',
      signal: ['midi'],
      note: 'A hardware thru of MIDI In. p.9: there is no MIDI soft thru, so nothing the Seq sequences appears here.',
    },
    {
      id: 'MIDI In',
      direction: 'in',
      signal: ['midi', 'clock'],
      clock: ['midi-din'],
      note: 'Takes the external clock the Tempo knob’s Clock setting follows, and records notes and velocity from a controller onto the tracks that are turned on.',
    },
    {
      id: 'USB',
      direction: 'out',
      signal: ['midi', 'clock'],
      clock: ['usb'],
      note: 'One USB type B socket, bidirectional and class-compliant, and a second way to power the box. A track set to USB+Clk sends clock here; the Clock setting can equally follow one arriving.',
    },
  ],

  /**
   * §2.6/#22. Every capability fact above, keyed by field path, plus the six negatives that make
   * this box a sequencer rather than an instrument.
   *
   * The six `cited-against` entries are the state #120 added for a document that answers in the
   * other direction. p.3 does not fail to say whether this box makes a sound: it enumerates every
   * socket on the back panel, and p.10 goes further and says where the CV outputs went. That is a
   * positive finding with a page, and it is the whole reason `voices` is empty.
   *
   * **`content` is the sixth, and `DeviceSchema` asks for it in those words.** A citation on that
   * path with no `content` declared is refused with *"a reading that supports no claim is
   * `cited-against`"*, which is exactly the shape of this reading: the question §2.6/#111 asks is
   * what audio the box plays, and this box plays none, so it is answered rather than open.
   *
   * **`noteDuration` deliberately has no entry**, and that is not the same omission. p.8 answers
   * *yes* — a per-step Length and a 5%-100% Gate mode — so `cited-against` would be false and
   * `unknown` would be a lie. The field is absent for an architectural reason rather than an
   * evidential one, and the module JSDoc is where that belongs.
   */
  capabilityEvidence: {
    'clock.canSendClock': cite(5),
    'clock.canReceiveClock': cite(5),
    'clock.transport': cite(5),
    'clock.preferredSource': cite(10),

    'clock.sourceSetup[midi-din]': cite(5),
    'clock.sourceSetup[usb]': cite(5),

    'io.main': {
      kind: 'cited-against',
      reason:
        'p.3 enumerates the back panel left to right — footswitch, two MIDI DIN outputs, a MIDI thru, a MIDI input, one USB type B, the firmware button, the 5 V inlet and the power switch — and the photograph on p.2 shows the same panel with its silkscreen legible; no audio socket appears in either',
      cite: cite(2, 3),
    },
    'io.individualOuts': {
      kind: 'cited-against',
      reason:
        'the eight tracks are routed by p.5’s Channel out and MIDI Out to a MIDI channel and a port; there is no audio to send anywhere, so there is no individual out to count',
      cite: cite(5),
    },
    'io.audioIn': {
      kind: 'cited-against',
      reason:
        'the only input sockets p.3 names are MIDI In and the footswitch, and p.9 describes what arrives as notes, velocity and transport',
      cite: cite(3, 9),
    },
    'io.usbAudio': {
      kind: 'cited-against',
      reason:
        'p.9 describes the USB port as fully class-compliant MIDI and nothing else, and p.3 calls it a socket "for bidirectional MIDI communication"',
      cite: cite(3, 9),
    },
    voices: {
      kind: 'cited-against',
      reason:
        'p.1 calls the box a MIDI step sequencer and p.10 says the eight CV channels of gate, pitch, velocity and modulation were designed in and then taken out of the housing to become Poly, a separate module; the eight tracks are routings to a MIDI channel and port (p.5), and the sound is made by whatever is on the other end of that cable',
      cite: cite(1, 5, 10),
    },
    content: {
      kind: 'cited-against',
      reason:
        'there is nothing for this box to load audio into: p.1 calls it a MIDI step sequencer, p.3 enumerates a back panel with no audio socket on it, and no recipe here can carry sourceAudio because there is no voice to hang one on',
      cite: cite(1, 3),
    },

    'features.perStep': cite(6, 7, 8),

    'jacks[Footswitch]': cite(2, 3),
    'jacks[MIDI Out 1]': cite(2, 3),
    'jacks[MIDI Out 2]': cite(2, 3),
    'jacks[MIDI Thru]': cite(2, 3),
    'jacks[MIDI In]': cite(2, 3),
    'jacks[USB]': cite(2, 3),
  },

  manual: { title: 'Polyend Seq Manual', edition: 'Version 2.2.6' },

  /**
   * §2.4. No voices, so no assignables, so no recipes — and eight track buttons under a 256-key
   * grid are the reason this needs saying rather than being obvious. See the module JSDoc.
   */
  voices: [],
  recipes: [],

  features: { perStep: [...PER_STEP] },
}
