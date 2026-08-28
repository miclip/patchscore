import type { CapabilityEvidence, Device, JackSignalKind, JackSpec } from '../../core/device'
import { jackFact } from '../../core/device'
import type { Cite } from '../../core/params'
import { device as liveIII } from '../akai-mpc-live-iii/index'
import { MPC_XL_PANEL } from './panel'

/**
 * Akai Professional MPC XL (§2.3). The larger of the two boxes running MPC 3, and the sibling of
 * the MPC Live III.
 *
 * ## One operating system, two chassis
 *
 * The two boxes share a manual, and the way the manual is split is the whole argument for how
 * this file is written. `MPC Live III / MPC XL User Guide v3.7` says "MPC" through every
 * operation chapter, pp.10-368, and names a model only where the hardware differs. The appendix
 * that carries almost every printed range, `Effects & Parameters` on pp.392-521, is one chapter
 * for both. What splits is `Hardware Features`, at pp.369-376 for the Live III and pp.377-387
 * for the XL, and the specification tables behind it, pp.529-530 against pp.531-533.
 *
 * **The siblings share the MPC engine and every recipe value. They differ in hardware I/O,
 * screen and control surface.** That is the claim this manifest rests on, and it is what the
 * split above says: a recipe here sets `Sample Play` on a drum pad (p.212), or `Cutoff` on a
 * TubeSynth (p.516), and both pages are in the shared half. Both boxes load the same eighteen
 * bundled plugins, hold the same 128 tracks of six types, and put sixteen pads across eight banks
 * under your hands (p.530 for the Live III, p.532 for the XL).
 *
 * So this file takes from `lib/devices/akai-mpc-live-iii`:
 *
 *     recipes            every recipe and every value inside one
 *     voices             the three pools: pad, mono-track, poly-track
 *     comfortableVoices  twelve
 *     features           perStep, lfo, sidechain
 *     hints              the five action jogs
 *     content            the factory Expansions
 *     noteDuration       Length, in ticks
 *     kind, manual       groovebox; the shared document
 *     clock              the same MIDI / Sync screen, p.62 and p.63
 *
 * and states here, with its own citations: the identity, the 543 mm span, the sockets, `io`, and
 * the evidence for each of those. Everything the sibling's evidence map already answers off a
 * shared page is read back out of it by `shared()` below, so one reading is cited once.
 *
 * ## The three differences, and what each costs
 *
 *  - **I/O** (pp.386-387, p.533). Eight audio outputs where the Live III has six, four MIDI
 *    outputs where it has two, eight CV/Gate sockets where it has four, four line-level audio
 *    inputs and two front instrument inputs where it has one XLR/TRS pair and a phono pair, two
 *    headphone outputs where it has one, and two footswitch inputs where it has none. `io` and
 *    `jacks` below carry all of it.
 *  - **Screen** (p.532 against p.530). A 10.1" 1280x800 multi-touch display with seventeen
 *    128x32 OLEDs beside the Q-Links, against a 6.9" display and no OLEDs. Nothing in this schema
 *    holds a screen size, so it is recorded here and nowhere else.
 *  - **Control surface** (p.532 against p.530). Seventeen Q-Link knobs and 105 buttons, against
 *    four Q-Links and 60 buttons. This is why `panel` is absent; see below.
 *
 * Two more differences run the other way and this schema has no field for either: the Live III
 * has an internal battery (p.105, a chapter the manual heads *Battery Usage (MPC Live III Only)*)
 * and an internal speaker and microphone (p.64's preference is labelled *MPC Live III only*).
 * The XL has neither, and runs on its adapter (p.533).
 *
 * None of the five reaches a recipe.
 *
 * ## The panel is its own drawing
 *
 * `panel.ts` is measured off p.377 and shares nothing with the sibling's, which is the point:
 * seventeen Q-Links against four, seventeen OLED strips the Live III does not have at all, and a
 * surface 107 mm wider to put them on. Its head note carries the measurement, the aspect check
 * against p.533 and the 1.2% residual between the two.
 */

const MANUAL = 'MPC Live III / MPC XL User Guide v3.7'

function cite(page: number): Cite {
  return { kind: 'manual', source: `${MANUAL}, p.${page}` }
}

function cites(pages: string): Cite {
  return { kind: 'manual', source: `${MANUAL}, ${pages}` }
}

/**
 * §2.6. One citation from the sibling's evidence map, for a fact both boxes read off the same
 * page of the shared operation chapters.
 *
 * It throws rather than falling back, and the throw is the point: `gen-registry` imports every
 * manifest, so a fact renamed or dropped in the sibling fails the build here instead of quietly
 * leaving this box's capability uncited. Hardware facts are never fetched this way — every one of
 * them is written out below against a page from pp.377-387 or pp.531-533.
 */
function shared(path: string): CapabilityEvidence {
  const evidence = liveIII.capabilityEvidence?.[path]
  if (evidence === undefined) {
    throw new Error(`the MPC Live III manifest carries no capability evidence at '${path}'`)
  }
  return evidence
}

// ---------------------------------------------------------------------------
// §3.3 Jacks. p.386 is the rear panel and p.387 the front; the Connections block on p.533 counts
// the same sockets, and the two agree on every one.
// ---------------------------------------------------------------------------

const JACK_EVIDENCE: Record<string, CapabilityEvidence> = {}

function jack(
  id: string,
  direction: JackSpec['direction'],
  signal: JackSignalKind[],
  page: number,
  extra: { note?: string; clock?: string[] } = {},
): JackSpec {
  JACK_EVIDENCE[jackFact(id)] = cite(page)
  return {
    id,
    direction,
    signal,
    ...(extra.clock === undefined ? {} : { clock: extra.clock }),
    ...(extra.note === undefined ? {} : { note: extra.note }),
  }
}

/**
 * Every socket pp.386-387 number, minus the ones that carry no signal in §3.3's vocabulary: the
 * power input, the power switch, the grounding terminal, the two rear USB-A ports, the USB-C
 * port, the front USB-A port and the SD card slot.
 *
 * **The two footswitch inputs are left out as well, and that one is a judgement.** p.387 has
 * `FS 1/2` taking *"optional 1/4" (6.35 mm) TS footswitches"*, which is a switch closure to
 * ground. The nearest member of `JackSignalKind` is `trigger`, and declaring it would tell the
 * rack it may run a cable from another box's trigger output into this hole. That cable is wrong,
 * so the sockets are recorded here and not declared.
 *
 * **The MIDI DINs are declared per port** and only `MIDI OUT A` and `MIDI IN 1` carry `clock`,
 * which the schema requires: one socket per transport and direction, or the rack has to choose
 * which of four outputs to draw. p.62's `Output Ports` list makes the choice real, since sync is
 * enabled per port. The XL has four outputs where the Live III has two, and `A` is still the one
 * the `clock.sourceSetup` note names.
 *
 * **Eight CV/Gate sockets carrying sixteen signals.** The silkscreen numbers them `1/9` through
 * `8/16` and p.386 gives the rule: *"Use standard 1/8" (3.5 mm) TS cables to send a single
 * CV/Gate signal per output, or use a stereo TRS-to-dual mono TSF breakout cable... to send two
 * CV/Gate signals per output."* Each is `pitch-cv` and `gate` both. That is double the Live III's
 * four, and it is the difference most likely to change which box a rig patches into.
 *
 * **`INPUT 3/4` is one stereo pair on two sets of sockets.** p.386 item 11: the rear `Phono/Line`
 * switch chooses the 1/4" pair or the RCA pair, and both are declared because both are holes on
 * the panel a reader can be told to use. `INPUT 1/2` splits the same way against the front
 * `INST 1/2`, decided by the `Rear/Front` switches on the top panel (p.385).
 *
 * **The three USB receptacles are a transport and not jacks**, following the sibling and the
 * Grandmother: `JackSpec.direction` is one value and a USB receptacle is bidirectional. p.386
 * has the USB-C port *"send and receive MIDI and audio data to and from your computer"*, both
 * directions in one sentence. `usb` is in `clock.transport` and no cable is drawn to a socket.
 */
const JACKS: JackSpec[] = [
  jack('MAIN L', 'out', ['audio'], 386, { note: 'Outputs 1,2 and Main L/R are the same pair' }),
  jack('MAIN R', 'out', ['audio'], 386),
  jack('OUT 3', 'out', ['audio'], 386),
  jack('OUT 4', 'out', ['audio'], 386),
  jack('OUT 5', 'out', ['audio'], 386),
  jack('OUT 6', 'out', ['audio'], 386),
  jack('OUT 7', 'out', ['audio'], 386),
  jack('OUT 8', 'out', ['audio'], 386),
  jack('PHONES 1/4"', 'out', ['audio'], 387, { note: 'Front panel; the Mix knob beside it balances Main against Outputs 3/4' }),
  jack('PHONES 1/8"', 'out', ['audio'], 387),
  jack('INPUT 1', 'in', ['audio'], 386, { note: 'Combo XLR or 1/4" TRS; +48V is a switch on the top panel, and Rear/Front chooses this over INST 1 (p.385)' }),
  jack('INPUT 2', 'in', ['audio'], 386, { note: 'Rear/Front on the top panel chooses this over INST 2 (p.385)' }),
  jack('INPUT 3/4 L (1/4")', 'in', ['audio'], 386, { note: 'Line level; set the Phono/Line switch beside it to Line' }),
  jack('INPUT 3/4 R (1/4")', 'in', ['audio'], 386),
  jack('INPUT 3/4 L (RCA)', 'in', ['audio'], 386, { note: 'Phono level; set Phono/Line to Phono and ground to the terminal beside it' }),
  jack('INPUT 3/4 R (RCA)', 'in', ['audio'], 386),
  jack('INST 1', 'in', ['audio'], 387, { note: 'Front panel, unbalanced TS for a guitar or bass; set Rear/Front under Gain 1 to Front (p.385)' }),
  jack('INST 2', 'in', ['audio'], 387),
  jack('MIDI IN 1', 'in', ['midi', 'clock'], 386, { clock: ['midi-din'] }),
  jack('MIDI IN 2', 'in', ['midi'], 386),
  jack('MIDI OUT A', 'out', ['midi', 'clock'], 386, { clock: ['midi-din'] }),
  jack('MIDI OUT B', 'out', ['midi'], 386),
  jack('MIDI OUT C', 'out', ['midi'], 386),
  jack('MIDI OUT D', 'out', ['midi'], 386),
  jack('CV/GATE 1/9', 'out', ['pitch-cv', 'gate'], 386, { note: 'One signal on a TS cable, two on a stereo TRS breakout' }),
  jack('CV/GATE 2/10', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 3/11', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 4/12', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 5/13', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 6/14', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 7/15', 'out', ['pitch-cv', 'gate'], 386),
  jack('CV/GATE 8/16', 'out', ['pitch-cv', 'gate'], 386),
]

export const device: Device = {
  id: 'akai-mpc-xl',
  name: 'MPC XL',
  maker: 'Akai Professional',

  /** §2.3. The sibling's reasoning, unchanged: a self-contained production instrument. */
  kind: liveIII.kind,

  /**
   * §2.3/§7.4. Taken from the sibling whole, because the screen behind it is one screen. p.62
   * heads `MIDI / Sync` with *"how MPC uses and synchronizes with connected USB and MIDI
   * devices"* and never names a model, and p.63 prints the same asymmetric pair for both boxes:
   * Receive offers Ableton Link, Send does not.
   *
   * The setup note names `MIDI Out A`, which the XL has along with B, C and D (p.386). Nothing
   * about four ports changes the instruction, since sync is ticked per port in the same list.
   */
  clock: liveIII.clock,

  /**
   * Eight 1/4" outputs, four audio inputs, two instrument inputs and class-compliant USB audio.
   *
   * `individualOuts: 6` rather than 8, for the sibling's reason: p.386 says *"The Main L/R
   * outputs are the same as Outputs 1,2"*, so the main pair and outputs 1,2 are one thing counted
   * once, leaving 3 through 8. p.533's `(8) 1/4" (6.35 mm) TRS outputs (4 stereo pairs)` is the
   * same eight. Six individual outputs against the Live III's four is a real rig difference: two
   * more parts can leave this box on their own pair.
   */
  io: { main: 'stereo', individualOuts: 6, audioIn: true, usbAudio: true },

  content: liveIII.content,

  noteDuration: liveIII.noteDuration,

  /**
   * §10. p.533: `Dimensions (display flat) (width x depth x height) — 543 x 488 x 94 mm`. 543 is
   * the span.
   *
   * `(display flat)` qualifies the triple, and it is worth reading before trusting it. The XL's
   * screen tilts, so height and depth move with it; the width does not, and the width is the only
   * figure §10 asks for. 107 mm wider than the Live III's 436 (p.530), which is what a rack of
   * side-by-side panels will show.
   */
  physical: { panelSpanMm: 543, verified: cite(533) },

  /** §10. Measured off p.377's plan view; see `panel.ts` for the measurement and its checks. */
  panel: MPC_XL_PANEL,

  manual: liveIII.manual,

  capabilityEvidence: {
    ...JACK_EVIDENCE,

    // Read off the shared MIDI / Sync screen. Same page, same reading, cited once.
    'clock.canSendClock': shared('clock.canSendClock'),
    'clock.canReceiveClock': shared('clock.canReceiveClock'),
    'clock.sourceSetup[midi-din]': shared('clock.sourceSetup[midi-din]'),
    'clock.sourceSetup[usb]': shared('clock.sourceSetup[usb]'),
    'clock.preferredSource': shared('clock.preferredSource'),
    // p.63 for the transports; the rear panel page is this box's, not the sibling's.
    'clock.transport': cites('p.63, p.386'),

    'io.main': cites('p.386, p.533'),
    'io.individualOuts': cites('p.386, p.533'),
    'io.audioIn': cites('p.386, p.387, p.533'),
    'io.usbAudio': cite(386),

    /**
     * §2.6/#120. The sibling's `unknown`, and it transfers with the pools it describes. Its
     * reason turns on DrumSynth having no printed voice count anywhere in the appendix, and the
     * appendix is one chapter for both boxes. p.532's pad row repeats p.530's for this chassis:
     * sixteen pads across eight banks.
     */
    voices: shared('voices'),

    'features.perStep': shared('features.perStep'),
    'features.lfo': shared('features.lfo'),
    'features.sidechain.internal': shared('features.sidechain.internal'),
    'features.sidechain.fromExternalAudio': shared('features.sidechain.fromExternalAudio'),
    content: shared('content'),
    noteDuration: shared('noteDuration'),
  },

  /**
   * §2.2. The sibling's three pools, unchanged, because the architecture they model is in the
   * shared half of the manual: p.44's six track types, p.47's 128 pads as 16 across eight banks,
   * pp.428-521's plugins. p.532 confirms this chassis has the same sixteen pads and eight banks.
   */
  voices: liveIII.voices,

  /**
   * Twelve, the same judgement as the sibling, and this box has more headroom rather than less:
   * p.533 gives it an 8-core processor and 16 GB against p.530's quad-core and 8 GB. The number
   * is not raised, because nothing prints a voice count for either box and a bigger CPU is not a
   * figure. Crowding is a cost in the objective and never a feasibility limit (§12.4).
   */
  comfortableVoices: liveIII.comfortableVoices,

  features: liveIII.features,

  jacks: JACKS,

  hints: liveIII.hints,

  recipes: liveIII.recipes,
}
