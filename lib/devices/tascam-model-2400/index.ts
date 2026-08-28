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
 *  - **Does not receive**, and the MIDI Implementation Chart on p.65 settles it in one place:
 *    every cell in its Recognized column is `NO`, for Clock, Song Position and Quarter frame
 *    alike. The block diagram on p.74 labels
 *    exactly what it does: `MIDI IN (USB conversion)`, against `MIDI OUT (MTC, MIDI CLOCK, MIDI
 *    message out)`. p.5 agrees — MIDI IN is there so a keyboard reaches a DAW. Nothing routes it
 *    to this unit's own transport, and the word "synchronize" occurs once in the whole manual,
 *    describing a DAW following *this* box.
 *
 * **A computer still drives its transport, which is why `dawTransport` is declared** (§7.4/#79).
 * p.5's feature list names *"DAW transport control and track recording control functions with
 * HUI/MCU emulation supported by major DAWs"*, and p.48 spells out what that carries: *"REC READY
 * operations, playing, stopping and other transport functions, and using markers"*, under Mackie
 * Control and HUI emulation. So a clock cable cannot reach this desk and a DAW can, and the guide
 * used to tell a reader it "runs free" in exactly the workflow the box is built for. The flag is
 * unchanged — `canReceiveClock` stays false, this box never becomes a follower and no cable is
 * drawn — and only the sentence moves.
 *
 * **That combination is not a reason to claim `clock.preferredSource`, and this manifest briefly
 * did.** The manual proves two things: the box generates MTC and MIDI clock at MIDI OUT and over
 * USB at the same time (p.45), and MIDI IN is a pass-through for a keyboard rather than a way in
 * for clock (p.5, p.74). Both are already said by `canSendClock: true` and
 * `canReceiveClock: false`. Neither of them says this desk should lead **every rig it is put in**,
 * which is what the field means (§7.4) — a person might well run a studio to this recorder, and
 * might equally put it in a corner behind a sequencer that drives everything. The manual has no
 * opinion, so nor does the manifest.
 *
 * That mistake has now been made three times in one section, each time by letting something the
 * box *can do* stand in for something a person decided. First occupied-assignable count, which a
 * zero-assignable box can never have, so this one won only when nothing else could send clock —
 * right in a rig of this and a Euroburo, and right by luck. Then `!canReceiveClock` as a ranking
 * key, which would have elected this box in every rig it appears in with nobody ever writing that
 * down. Then this field, which is the same inference moved out of the engine and into a manifest,
 * where it is harder to see. All three are gone.
 *
 * The consequence is worth stating because it is what the guide now says: with something else
 * leading, this box reads "cannot receive clock" and runs free, which is exactly true and is the
 * honest half of the same fact.
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
   * A clock source that cannot itself be synced to anything — see the module JSDoc, which is
   * where the evidence for both halves sits. `MIDI OUT` carries MTC and MIDI clock (p.45, p.74); `MIDI IN` is a
   * USB conversion path for a keyboard (p.5, p.74). The generated clock also reaches a computer
   * over USB, which is why both transports are listed.
   *
   * **No `preferredSource`**, and its absence is a decision rather than an omission: the field
   * says a box's job is to drive a rig, and nothing in this manual says that about this desk.
   * See the module JSDoc for why it was here and why it is not.
   */
  clock: { canSendClock: true, canReceiveClock: false, transport: ['midi-din', 'usb'] },

  /**
   * §7.4/#79. A clock cable cannot reach this desk; a DAW can. p.5 lists *"DAW transport control
   * ... with HUI/MCU emulation"* and p.48 says what travels: *"REC READY operations, playing,
   * stopping and other transport functions, and using markers"*.
   */
  // The protocol only. The wire is USB and is already in `jacks` and the rig diagram; the
  // guide's sentence reads "over HUI/MCU", and "over HUI/MCU over USB" doubles the preposition.
  dawTransport: { protocol: 'HUI/MCU' },

  /**
   * §2.6/#22, §7.4/#80. **One entry, recording the non-claim the module JSDoc argues for.**
   *
   * The pages were in that comment and are now here, which is what #22 exists for and what #120
   * made possible for a field that is deliberately absent. `unknown` and not `cited-against`:
   * this manual has no opinion to cite. It proves two capabilities and never says what the desk
   * is for, which is a different finding from the Cascadia’s manual arguing the other way.
   */
  capabilityEvidence: {
    // §7.4/#79. p.48 is the page that says what the protocol carries; p.5 only lists the feature.
    dawTransport: { kind: 'manual', source: 'TASCAM Model 2400 Owner’s Manual, p.48' },
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'p.45 and the p.74 block diagram prove the box generates MTC and MIDI clock at MIDI OUT and over USB at once, and p.5 and p.74 that MIDI IN is a keyboard pass-through to a computer — both already said by `canSendClock: true` and `canReceiveClock: false`; the word "synchronize" occurs once in the manual, describing a DAW following this box, and no page says this desk should lead every rig it is put in',
    },
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
