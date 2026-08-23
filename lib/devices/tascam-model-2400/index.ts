import type { Device } from '../../core/device'
import { MODEL_2400_PANEL } from './panel'

/**
 * Tascam Model 2400 (§2.3, §2.4). Twenty-two channels of analogue mixer with a twenty-four track
 * recorder inside them, and the box §2.5 named as the library's `mixer-recorder` before anybody
 * opened a manual. The third device with nothing to assign, and by some distance the largest
 * thing in the rack: 680.5 mm across, against the Euroburo's 172.7.
 *
 * ## Zero assignables, for the third time, and the reasoning has not moved
 *
 * `voices` and `recipes` are both empty. §2.4: *"a device with no voices simply contributes no
 * assignables and still appears in rig integration"*. It is permanently idle in §7.1's sense — a
 * constant on the last key of the `Score` vector applied to every candidate equally — and it
 * appears in the guide twice, in rig integration and in the Master FX list where
 * `kind === 'mixer-recorder'` is already first-class evidence.
 *
 * ## What is new: this is the first box that sends clock and cannot receive it
 *
 * Every previous device either does both or does neither. This one is strictly a source, and the
 * manual is unambiguous in both directions:
 *
 *  - **Sends.** *"This unit can generate MIDI TIMECODE and MIDI CLOCK when the recorder is
 *    playing back or recording. The generated MIDI data is output from the MIDI OUT connector
 *    and simultaneously sent to a computer connected by USB"* (p.45). `MIDI CLOCK/SPP` is an
 *    on/off setting, off by default, and the feature list on p.5 names the purpose outright:
 *    *"output to drum machines and sequencers with MTC/MIDI CLOCK output"*.
 *  - **Does not receive.** The MIDI IN connector exists, and the block diagram on p.74 labels
 *    exactly what it does: `MIDI IN (USB conversion)`, against `MIDI OUT (MTC, MIDI CLOCK, MIDI
 *    message out)`. p.5 agrees — MIDI IN is there so a keyboard reaches a DAW. Nothing routes it
 *    to this unit's own transport, and the word "synchronize" occurs once in the whole manual,
 *    describing a DAW following *this* box.
 *
 * **That combination is why this is the library's first `clock.preferredSource`.** The manual
 * describes a box the room runs to and not one that follows anything: MIDI OUT generates MTC and
 * MIDI clock to the DIN socket and to a computer at the same time (p.45), MIDI IN is a
 * pass-through for a keyboard, and the single occurrence of "synchronize" in the whole document
 * is a DAW following *this* unit. That is a topology judgement about what the box is *for*, which
 * §7.4 says a manifest states and the engine does not infer.
 *
 * It was reached, for a while, by two rules that both got the right answer for the wrong reason.
 * First occupied-assignable count, which a zero-assignable box can never have, so this one won
 * only when nothing else could send clock — correct in a rig of this and a Euroburo, and correct
 * by luck. Then `!canReceiveClock`, which is a *capability* standing in for an intent: it would
 * have elected this box in every rig it appears in without anyone ever writing down that a
 * recorder should lead. Both are gone. What remains is the sentence above, authored here, where
 * the evidence for it is.
 *
 * The rack's isolation reason is the honest half of the same fact: with any other box as the
 * source, this one reads "cannot receive clock", which is exactly true.
 *
 * ## I/O, and why `individualOuts` is 8 rather than 4 or 0
 *
 * `MAIN OUTPUT L/R` is a balanced XLR pair (p.70). The separations are the **`SUB OUTPUT` jacks
 * (1-2/3-4/5-6/7-8)** — eight TRS jacks on four sub buses, each with its own fader (p.13), and
 * each input channel carries `1-2 / 3-4 / 5-6 / 7-8 / MAIN` assign switches on its strip. The
 * field counts *jacks*, following the same call the TR-8S made about `ASSIGN A-C`, so eight is
 * the number: two mono parts panned hard apart genuinely leave on their own sockets.
 *
 * Two things that look like separations and are not. `AUX OUTPUT 1-5` are sends — one bus fed
 * from every channel at once, which is the opposite of a separation. `INSERT` jacks on channels
 * 1-12 are TRS break points, tip send and ring return (p.70): taking one as an output opens the
 * channel unless the cable is half-normalled, so it is a patch point rather than a feed.
 *
 * The real separation story on this box is USB, and `usbAudio` carries it: **24 channels out,
 * 22 channels in**, USB audio class 2.0 and mass storage over one Type-B socket (p.71). That is
 * every channel to a computer at once, which no jack count expresses.
 *
 * ## What the schema cannot hold, and is therefore absent
 *
 * `features` is omitted entirely rather than half-filled. This box has a great deal that a
 * *recipe* would use and a device manifest has nowhere to put: an analogue channel compressor
 * (threshold -35 to 0 dB), three-band analogue channel EQ (±15 dB, 10 kHz shelf / mid peak /
 * 60 Hz shelf), a digital master-bus compressor and four-band master EQ, sixteen preset effects,
 * and a 100 Hz low cut at -18 dB/oct (pp.72-73). Every one is citable. None of them is a
 * `DeviceFeatures` field: `perStep` needs steps, `lfo` needs an LFO, and `sidechain` needs a
 * documented ducking source, which this manual never describes. Inventing a field to hold them
 * would be the fifth shared vocabulary invariant 3 forbids.
 *
 * `hints` and `jacks` are absent for the structural reason the L-8 and the Euroburo record: both
 * exist to be referenced by recipes, and there are none.
 */
export const device: Device = {
  id: 'tascam-model-2400',
  name: 'Model 2400',
  maker: 'Tascam',
  kind: 'mixer-recorder',

  /**
   * A clock source that cannot be slaved — see the module JSDoc, which is where the evidence for
   * all three fields sits. `MIDI OUT` carries MTC and MIDI clock (p.45, p.74); `MIDI IN` is a
   * USB conversion path for a keyboard (p.5, p.74). The generated clock also reaches a computer
   * over USB, which is why both transports are listed.
   *
   * `preferredSource` is the separate claim, and deliberately not implied by the two booleans
   * above: this desk is what a studio runs to (§7.4). Nothing else in the library claims it.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: false,
    transport: ['midi-din', 'usb'],
    preferredSource: true,
  },

  /**
   * `MAIN OUTPUT L/R` XLR out, eight `SUB OUTPUT` jacks on four assignable buses, twenty-two
   * analogue inputs in, and a USB audio interface of 24 out / 22 in (pp.70-71).
   */
  io: { main: 'stereo', individualOuts: 8, audioIn: true, usbAudio: true },

  /**
   * §10. 680.5 mm across, off the dimensioned plan view: *"680.5 × 132.5 × 568.0mm (W x H x D,
   * including protrusions)"* with side panels, and 638.5 mm without (p.72).
   *
   * **680.5, the figure with the side panels on**, because §2.3 asks how much room the box takes
   * up in a row and the cheeks are bolted to it. A desk mixer lies flat, so the surface you play
   * is the top panel and the 568.0 mm the table calls *depth* is its vertical span — `panel.ts`
   * carries that, along with the aspect check, which passes to within a tenth of a percent
   * against the drawing.
   */
  physical: {
    panelSpanMm: 680.5,
    verified: {
      kind: 'manual',
      source: 'Tascam Model 2400 Owner’s Manual, p.73 (Dimensional drawings)',
    },
  },

  /** §10. A simplified original drawing of the top panel, read off p.73 (see `panel.ts`). */
  panel: MODEL_2400_PANEL,

  /** §2.4. No voices, so no assignables, so no recipes. It is a desk, not an instrument. */
  voices: [],
  recipes: [],

  manual: { title: 'Model 2400 Owner’s Manual', edition: 'D01438920C' },
}
