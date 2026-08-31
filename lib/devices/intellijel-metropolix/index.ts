import type { Device } from '../../core/device'
import type { Cite } from '../../core/params'
import { METROPOLIX_PANEL } from './panel'

/**
 * Intellijel Metropolix (§2.3). A 34 HP Eurorack **sequencer**: two pitch-and-gate tracks, eight
 * modulation lanes, eight stages, and **no sound engine of any kind**.
 *
 * ## Why this is the library's first `kind: 'sequencer'`
 *
 * Everything this box emits is control data. Its outputs are two assignable jacks, a clock out,
 * and a pitch and gate pair per track (p.18); its inputs are clock, reset and three CV aux jacks
 * (p.19). There is no audio path, no oscillator and no filter anywhere in 205 pages.
 *
 * `semi-modular` would say the opposite of the truth: the Cascadia's defining property is that it
 * makes a sound with nothing patched into it, and the kind implies voices, assignables and
 * recipes. `groovebox` would claim self-contained sound generation, which is the one thing this
 * box is defined by not doing. Both would make the manifest state something false, which is the
 * test §2.3 says a new kind has to pass.
 *
 * ## What follows from that, and it is most of this file
 *
 * **`voices: []` and `recipes: []`.** §2.4's rule, reached from a new direction: a device with no
 * voices contributes no assignables and still appears in rig integration. The temptation here is
 * specific and worth naming — Metropolix has two tracks that *look* like voices, and modelling
 * them as two `fixed` voices would put two assignables into every search on this rig. They are
 * not voices. A track is a stream of pitch and gate going out a jack to whatever is patched
 * there; the sound belongs to that other box, and so does the recipe. Two invented assignables
 * would let the resolver put a kick "on the Metropolix", which is not a thing that can happen.
 *
 * **`io.main: 'none'`.** §2.3's other new value, and this device is why it exists. `mono` would
 * make both renderers print a main out that is not there and make §10's rack draw an audio jack
 * nobody can plug into. `audioIn: false` and `usbAudio: false` for the same reason: the USB port
 * carries MIDI, not audio (p.179).
 *
 * **No `hints`, and jacks only where something points at them.** `hints` exists to be referenced
 * by recipes (§3.3) and there are no recipes, so it stays absent — the same call the LiveTrak L-8
 * and the Euroburo record.
 *
 * `jacks` was absent for the same reason and is no longer, because the reason stopped being true.
 * Inter-device routing points at jacks with no recipe anywhere in sight: it reads a target box's
 * pitch and gate inputs and a source box's pitch and gate outputs, and this is the box in the
 * library whose entire job is to be that source. So the two track sections are declared — whole,
 * as §3.3 requires, not "the jacks the router happens to want" — and the other eight front-panel
 * jacks stay out until something points at them.
 *
 * **What is deliberately still absent, and the one trap in it.** `A` and `B` (p.18) are
 * user-assignable and genuinely carry pitch, gate, trigger, clock or CV depending on a menu
 * (pp.115-117), so their `signal` list would be five kinds long and they can never be a primary
 * voice-control socket — nothing is lost by waiting. `CLK` out, `CLK` in, `RESET`, `X`, `Y` and
 * `Z` are the rest. Whoever declares those has a decision to make first: **the panel silkscreens
 * both clock jacks `CLK`**, output and input alike, distinguished on the artwork only by the
 * black tile the outputs sit on. Jack ids are unique per device (§3.3), so those two need a
 * qualification the panel does not print — the body text's `CLOCK OUT` / `CLOCK IN` is the
 * obvious source for it. That is a naming decision, not a transcription, and it is not made here.
 *
 * ## Clock, and the one thing deliberately not claimed
 *
 * Metropolix both sends and receives. `CLOCK OUT` "outputs a clock from Metropolix" and
 * `CLOCK IN` takes "an external clock source" (pp.18-19) — that is the `analog-clock` transport.
 * Over USB it can send MIDI clock and transport, and "can also lock to an external MIDI clock
 * arriving via the USB port" (p.179).
 *
 * **`midi-din` is omitted, and the omission is the interesting half.** Metropolix has no MIDI
 * socket of its own. p.179 gives three ways to get MIDI in or out of it, and every one is an
 * accessory: a USB Micro Extender module, the Metropolix Solo Kit (which brings TRS Type-A MIDI
 * jacks), or the Metropolix Backpack (which brings a 10-pin connector to an Intellijel case's DIN
 * sockets). `transport` describes the box a person owns, not the box plus a shopping list, so it
 * lists what is built in.
 *
 * **`preferredSource: true`, and this was the first device in the library to claim it** — #80 has
 * since added a second, the Tracker Mini, and §7.4 ranks neither above the other. §7.4 says
 * the field is a topology judgement a manifest states and the engine does not infer, and the
 * evidence here is not a capability but a definition: the manual's own first line calls this a
 * "musical sequencer", the box has no voice to be played by anything else, and its entire output
 * is timing and control for other boxes. A rig containing it is a rig it drives. That is the
 * claim the Model 2400 could not honestly make from a manual proving only that a desk *can*
 * generate clock.
 *
 * ## What is not modelled
 *
 * Almost all of it, and by design. Playback order, sequence length, clock division, swing, slide,
 * gate length, scales and quantisation, the 64 presets, the eight MOD lane destinations and the
 * whole ALT layer are sequencer configuration — the shape of a pattern, which §4.3 makes the
 * template's business rather than the device's. A device manifest contributes `articulation`
 * addressed by `PatternSlot`, and with no recipes there is nothing to hang articulation on.
 */

const MANUAL = 'Metropolix Manual v1.6'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

/**
 * §2.3. The eight per-stage lanes, in the panel's own left-to-right order (p.17, callout 8), and
 * named on p.32: *"GATE override; PITCH override; RATCHet count; PROBability of playback;
 * ACCUMulated transposition, and a dedicated CV lane. Each stage also has a SKIP feature, and a
 * pitch SLIDE option."*
 *
 * **Declared, and currently unreachable.** `perStep` exists so a recipe's `articulation` can name
 * a lane this device actually has, and every other manifest that declares one has recipes using
 * it — the MC-101's own test asserts that a lane nobody reaches for is "a claim about the box
 * that no guide ever shows". This device has no recipes, so all eight are exactly that: true
 * about the hardware, and unable to become an instruction until something gives Metropolix a
 * recipe to carry. They are here because the alternative is a manifest that silently knows less
 * than the manual, and the gap is stated rather than left to be discovered.
 */
const PER_STAGE = ['slide', 'skip', 'pitch', 'gate', 'ratch', 'prob', 'accum', 'cv'] as const

export const device: Device = {
  id: 'intellijel-metropolix',
  name: 'Metropolix',
  maker: 'Intellijel',
  kind: 'sequencer',

  /**
   * Sends and receives, over the two transports the module has without an accessory: the front
   * panel's CLOCK OUT and CLOCK IN jacks (pp.18-19), and MIDI clock over the rear USB port both
   * ways (p.179). `midi-din` is absent because every MIDI socket this box can reach belongs to an
   * optional module, case or kit — see the module JSDoc.
   *
   * `preferredSource` because driving a rig is what this device is *for*, not merely something it
   * can do. §7.4 asks for a judgement and this manual supplies one.
   */
  clock: {
    canSendClock: true,
    canReceiveClock: true,
    transport: ['usb', 'analog-clock'],
    preferredSource: true,
  },

  /**
   * §2.3's `main: 'none'`. Every jack on this panel carries pitch, gate, clock or CV; there is no
   * audio output to name and no audio input to declare. The USB port is MIDI (p.179), not audio.
   */
  io: { main: 'none', individualOuts: 0, audioIn: false, usbAudio: false },

  /**
   * 34 HP, which is the only width the manual prints (p.204, TECHNICAL SPECIFICATIONS). Converted
   * at the Eurorack pitch of 5.08 mm: 34 x 5.08 = 172.72, carried as 172.7.
   *
   * The same page prints `Maximum Depth: 25 mm`, which is **not** a panel dimension — it is how
   * far the module sticks out behind the rails. §2.3's orientation trap from a third direction,
   * and taking it as the rise would draw this module seven times too short. The rise is measured
   * off the panel figure instead; see `panel.ts`.
   */
  physical: { panelSpanMm: 172.7, verified: cite(204) },

  panel: METROPOLIX_PANEL,

  /**
   * §3.3. **The two track sections, whole.** p.18's OUTPUTS: "By default, the 1 V/Oct pitch
   * generated by Track 1 is sent out this jack" and "Track 1's gate signal (off = 0V; on = +5V)
   * is sent out this jack", and the same two sentences again for Track 2.
   *
   * **Section-qualified off the panel, which prints less than the body text does.** The
   * silkscreen under each of these four holes is a bare `PITCH` or `GATE`; the track number is a
   * column header, `TRK 1` and `TRK 2`, printed above the pitch row and inherited by the gate row
   * beneath it. So the panel's own name for the first is `TRK 1` + `PITCH`, which is what a reader
   * is looking at. The manual's prose calls it `TRACK 1 PITCH OUT` — spelled out, with a suffix
   * the panel does not carry — and that is the one string not used here, because §3.3 says the id
   * is the silkscreen. `TRK 1` also matches the register `panel.ts` already prints for `CTRL 1`.
   *
   * Both are single-kind, and that is what makes them usable as a primary voice-control bundle: a
   * 1V/oct output is `pitch-cv` and nothing else, a +5V gate is `gate` and nothing else. Contrast
   * `A` and `B`, which carry five kinds between them and therefore never qualify.
   *
   * `Trk Out Swap` can exchange the two tracks' outputs, which is a setting rather than a property
   * of the hole — the same shape as the TR-1000's `Trig In`, and noted where a reader meets it.
   */
  jacks: [
    { id: 'TRK 1 · PITCH', direction: 'out', signal: ['pitch-cv'] },
    { id: 'TRK 1 · GATE', direction: 'out', signal: ['gate'] },
    {
      id: 'TRK 2 · PITCH',
      direction: 'out',
      signal: ['pitch-cv'],
      note: 'Trk Out Swap exchanges the two tracks at these jacks (p.18)',
    },
    { id: 'TRK 2 · GATE', direction: 'out', signal: ['gate'] },
  ],

  /** §2.6/#22. The four declared jacks, on the OUTPUTS page that describes each of them. */
  capabilityEvidence: {
    'jacks[TRK 1 · PITCH]': cite(18),
    'jacks[TRK 1 · GATE]': cite(18),
    'jacks[TRK 2 · PITCH]': cite(18),
    'jacks[TRK 2 · GATE]': cite(18),
  },

  manual: { title: 'Metropolix Manual', edition: 'v1.6' },

  productPage: 'https://intellijel.com/shop/desktop/metropolix-solo/',

  /**
   * §2.4. No voices, so no assignables, so no recipes — and the two tracks are the reason this
   * needs saying rather than being obvious. See the module JSDoc.
   */
  voices: [],
  recipes: [],

  features: { perStep: [...PER_STAGE] },
}
