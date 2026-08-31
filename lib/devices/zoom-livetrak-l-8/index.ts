import type { Device } from '../../core/device'
import { LIVETRAK_L8_PANEL } from './panel'

/**
 * Zoom LiveTrak L-8 (§2.3, §2.4). An eight-channel mixer with a twelve-track recorder in it,
 * and the first device in this library that **is not an instrument**.
 *
 * ## Zero assignables is the whole point of this manifest
 *
 * §2.4 says it in one sentence — *"a device with no voices simply contributes no assignables and
 * still appears in rig integration"* — and this is the first manifest that exercises it. `voices`
 * is empty, so `expand()` returns nothing and the resolver never considers this box for a role.
 * `recipes` is empty for the same reason: a recipe addresses a voice, and there is no voice to
 * address. Neither array is a placeholder waiting to be filled. The L-8 makes no sound.
 *
 * What it does instead is the thing every rig in this library has been quietly missing: it is
 * where the audio goes. Six mic preamps, two line channels, a stereo master out and three
 * independent headphone mixes, and the guide's rig-integration phase now has an actual
 * destination to name rather than an implied one.
 *
 * Three consequences worth stating plainly, because all three are already handled and someone
 * will otherwise go looking for a bug:
 *
 *  - **The L-8 is always idle**, in the §7.1 sense of "zero occupied assignables". That costs one
 *    point on the last key of the `Score` vector, on *every* candidate assignment equally, so it
 *    cannot reorder anything — it is a constant, not a thumb on the scale.
 *  - **The guide's channel-plan line reads "no parts assigned; nothing to patch"**, which is the
 *    honest answer and already the renderer's first branch.
 *  - **The rack draws it with no voice field.** `panel.ts` authors none; a region filled with
 *    zero cells would claim a readout the box cannot produce.
 *
 * ## This box has no MIDI, and that is not a gap in the reading
 *
 * `canSendClock` and `canReceiveClock` are both `false`. The string "MIDI" does not appear once
 * in the 165,000 characters of the Operation Manual. There is no DIN socket in the connector
 * band (pp.5-7, p.10), the "Back" section is a POWER switch and an SD card slot (p.19), the
 * "Bottom" is a Micro USB port and a battery cover (p.20), and the specifications table's
 * channel list (p.110) is eight inputs and five outputs, all analog. The Micro USB port is an
 * audio interface and a card reader and a power inlet; the manual claims no MIDI class for it
 * anywhere.
 *
 * The box does have a *tempo*: 40.0-250.0 bpm, set by the TEMPO button or tapped in (p.17), and
 * the Delay send effect follows it (p.111). That tempo is internal and goes nowhere. Nothing can
 * sync to the L-8 and the L-8 cannot sync to anything, so in a rig it is an audio destination and
 * never a clock participant.
 *
 * **Two findings come out of that, and neither is fixed here.**
 *
 * First, `ClockSpec.transport` requires at least one entry, and the honest list for this box is
 * empty. `['usb']` is what is authored: the Micro USB 2.0 port is real and is the box's only
 * digital connection to anything, and both booleans beside it say no clock crosses it. Every
 * consumer that decides behaviour reads the booleans first — `selectClockSource` filters on
 * `canSendClock`, the rack's isolation check returns "cannot receive clock" before it looks at
 * the transport list — so nothing acts on the entry. It is still a claim the schema forced.
 *
 * Second, and visibly: the guide's rig-integration line is built as
 * `canSendClock ? 'sends clock' : 'receives clock only'`, which has no third branch, so this box
 * renders as *"receives clock only · usb"* — a sentence that is wrong twice. Fixing it is a
 * renderer change and out of scope for a device folder; it is recorded rather than reached for.
 *
 * ## I/O
 *
 * `individualOuts: 0` is a considered zero, not an unfilled one. The L-8 has five physical
 * outputs — MASTER OUT (XLR L/R), MASTER OUT PHONES, and MONITOR OUT PHONES A, B and C (p.110) —
 * and none of them is a per-part direct out. MONITOR OUT A-C are *bus* feeds, each carrying
 * either the master mix or a separate MIX A-C built in MIXER mode (p.11, p.36); they are cue
 * mixes for performers, and routing one part to one of them would cost every other part its
 * monitor. The field means "outs a part can be sent to on its own", and by that meaning there
 * are none.
 *
 * `usbAudio: true` — 12 channels in, 4 out, 24-bit at 44.1/48 kHz over USB 2.0 (p.110). Note the
 * recorder is 12 simultaneous record tracks and 10 playback tracks at 44.1/48/96 kHz, which is a
 * different pair of numbers on the same page and is not what this field carries.
 *
 * ## What is not modelled, and why not
 *
 * The L-8 is full of citable values that have nowhere to live in a manifest with no recipes:
 * eight send-effect types with two parameters each (p.111), a three-band EQ whose frequencies and
 * ±15 dB range are printed twice (p.8, p.110), a 75 Hz 12 dB/oct low cut, faders and sends
 * running -inf to +10 dB, gain from +10 to +54 dB. Every one of those is a **parameter of a
 * channel**, and a channel is not an assignable — it is where somebody else's part arrives. A
 * `Role` for "the thing plugged into channel 3" would be a fifth shared vocabulary (invariant 3),
 * and inventing a voice so the numbers have somewhere to sit would put the L-8 in the running for
 * a kick drum. The values stay in the manual until something in the design asks for them.
 *
 * Scenes, the SOUND PAD sampler (six pads playing WAVs off the SD card, pp.52-60), punch-in,
 * pre-record and the metronome are all real and all outside what a device manifest describes.
 */
export const device: Device = {
  id: 'zoom-livetrak-l-8',
  name: 'Zoom LiveTrak L-8',
  maker: 'Zoom',
  kind: 'mixer-recorder',

  /**
   * No MIDI anywhere on this box — see the module JSDoc. `transport` carries the USB port
   * because the schema requires a non-empty list and that port is the only digital connection
   * the box has; the two booleans beside it are what say no clock crosses it.
   */
  clock: { canSendClock: false, canReceiveClock: false, transport: ['usb'] },

  /**
   * §2.6/#22, §7.4/#80. **This box is half of the pair that proves `preferredSource` is not
   * derivable from `kind`, and it is the half that says nothing.**
   *
   * §7.4 uses the library's two `mixer-recorder`s to make that argument: the Model 2400 was
   * considered for the field and declines it in a reasoned comment of its own, and this desk
   * cannot send clock at all. Same kind, opposite ends of the topology — which is exactly why the
   * field exists and why no engine may infer it.
   *
   * So the entry records a closed question rather than an open one. There is no MIDI anywhere on
   * this box, `canSendClock` is false, and the schema refuses `preferredSource` without it; the
   * manual has no role sentence to weigh because it has no clock to write one about. The guide
   * already says this out loud — a LiveTrak in a rig is named as running free.
   */
  capabilityEvidence: {
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'no MIDI and no clock anywhere on this box, so the manual states nothing about leading a rig — and with `canSendClock: false` the field is not claimable in any case',
    },
  },

  /**
   * MASTER OUT is a balanced XLR pair (p.110). No per-part direct outs: MONITOR OUT A-C are cue
   * buses, not channel inserts. Eight analog inputs — six XLR/TRS combo MIC/LINE and two TS LINE
   * — and a USB audio interface of 12 in / 4 out.
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: true },

  /**
   * §10. 268 mm across, off the specifications table: *"268 mm (W) x 282 mm (D) x 74 mm (H)"*.
   *
   * A flat desktop mixer, so the surface you play is the top panel and the vendor's W is the
   * playing-orientation horizontal span. The check §2.3 asks for is in `panel.ts`: the cover's
   * plan drawing measures to an aspect of 0.951 against the specified 0.950, so the two numbers
   * are agreeing on purpose rather than by luck.
   */
  physical: {
    panelSpanMm: 268,
    verified: {
      kind: 'manual',
      source: 'Zoom LiveTrak L-8 Operation Manual E_02, p.110 (Specifications: External dimensions)',
    },
  },

  /** §10. A simplified original drawing of the top panel, read off the cover (see `panel.ts`). */
  panel: LIVETRAK_L8_PANEL,

  /** §2.4. No voices, so no assignables, so no recipes. Not a placeholder — the box is a mixer. */
  voices: [],
  productPage: 'https://zoomcorp.com/en/us/digital-mixer-multi-track-recorders/digital-mixer-recorder/LIVETRAK-L-8/',

  recipes: [],

  manual: { title: 'Zoom LiveTrak L-8 Operation Manual', edition: 'E_02' },
}
