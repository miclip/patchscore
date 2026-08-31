import type { Device } from '../../core/device'
import { ZOIA_EUROBURO_PANEL } from './panel'

/**
 * Empress ZOIA Euroburo (§2.3, §2.4). The library's first `fx-processor`, its first Eurorack
 * module, and its second device with nothing to assign.
 *
 * ## The honest disclaimer first, because it is the biggest thing about this manifest
 *
 * **The manual says this box is a synthesizer, and this manifest says it is an effect.** p.1:
 * *"The ZOIA Euroburo is, in essence, a fully featured modular synthesizer within a single
 * module… Instead of thinking of the ZOIA as simply a module, it is probably more accurate to
 * think of it as a platform. It provides the basic tools so that you can build your own effects,
 * synths, and instruments."*
 *
 * `kind: 'fx-processor'` and zero voices come from §2.5, which named this box as the library's
 * fx-processor before anybody opened the manual. That is a design decision and it is defensible —
 * a rig gains more from knowing there is a processor in it than from a device whose voice list
 * would have to be invented patch by patch — but it is **not what the document says**, and the
 * distinction matters because every other manifest in this library is a reading of a manual.
 *
 * The concrete cost: a ZOIA patch that is three oscillators and a filter is a synth voice this
 * model cannot offer to any role, and no guide will ever suggest one. That is recorded here
 * rather than hidden, and it is the deferred question this device raises.
 *
 * ## Zero assignables, and the L-8 already proved the path
 *
 * `voices` and `recipes` are both empty. §2.4: *"a device with no voices simply contributes no
 * assignables and still appears in rig integration"*. It is permanently idle in §7.1's sense — a
 * constant on the last key of the `Score` vector, applied to every candidate equally, so it can
 * never reorder them — and it shows up in the guide twice: a rig-integration block with an honest
 * channel plan, and the Master FX list, where `kind === 'fx-processor'` is already first-class
 * evidence.
 *
 * ## A platform manual, not a parameter manual, and that shapes what is absent
 *
 * This is a 44-page document about the *hardware and the editing workflow*: the knob, the action
 * buttons, the grid, connections, pages, patches, the config menu, the SD card. **It never
 * enumerates the module library.** ZOIA's actual sound-shaping — its oscillators, filters,
 * delays, reverbs, LFOs, sequencers and clock modules — lives in a separate module index that is
 * not in `manuals/`.
 *
 * So three fields that would ordinarily be filled are deliberately empty, and each is an absence
 * of documentation rather than of capability:
 *
 *  - **no `features.lfo`** — the manual mentions no LFO. ZOIA certainly has them; this document
 *    does not say so, and `manuals/README.md` forbids authoring from memory. Recorded as `unread`
 *    in `capabilityEvidence` since #120, because the missing document is the finding.
 *  - **no `features.sidechain`** — likewise, and likewise recorded. A ZOIA patch can obviously
 *    duck one signal from another; nothing here documents it, and the field would be a guess.
 *  - **no `features.perStep`** — this box has no step sequencer of its own that the manual
 *    describes, and nothing addresses steps.
 *
 * `hints` and `jacks` are absent for a different, structural reason: both exist to be referenced
 * by recipes (§2.3, §3.3), and a device with no recipes would be declaring a table nothing reads.
 *
 * ## What the manual does document, and what is used
 *
 * Audio in (L/R), audio out (L/R), a headphone out that is *"a clone of what's sent to the main
 * audio outputs"* (p.5), four CV inputs and four CV outputs with selectable ranges of -5V to 5V,
 * 0V to 5V or 0V to 10V (p.6), two 1/8" TRS MIDI ports of *"MIDI Type A spec"* with 5-pin dongles
 * included (p.26), and a microSD card for patches. No USB anywhere.
 */
export const device: Device = {
  id: 'empress-zoia-euroburo',
  name: 'ZOIA Euroburo',
  maker: 'Empress Effects',
  kind: 'fx-processor',

  /**
   * **The weakest claim in this file, and it is flagged rather than smoothed over.**
   *
   * `canSendClock: false` records the *document*, not the box. This manual documents three MIDI
   * behaviours and no more — program change to load a patch, CC #60 to bypass, and CC control of
   * starred parameters (p.26) — and says nothing about transmitting clock. Whether a ZOIA patch
   * can emit one is a question about the module library, which this manual never lists.
   *
   * `canReceiveClock: true` is an inference from three cited facts and is stated as such so it
   * can be overruled in one read: the four CV inputs exist *"to connect the Euroburo to other
   * eurorack modules"* and accept 0-10V (p.6); a Eurorack clock is a voltage on such an input;
   * and Empress's own name for the option on those inputs is **`clk filter`** (p.7). The prose
   * beside it explains the filter as a noise threshold and never uses the word clock, which is
   * why this is an inference and not a citation.
   *
   * `transport` carries the CV inputs and the MIDI ports. The sockets are 1/8" TRS Type A rather
   * than 5-pin, but *"the included 1/8" TRS to-5-pin dongles"* (p.26) are what the box ships
   * with, so a reader told to run MIDI clock into it can.
   */
  clock: { canSendClock: false, canReceiveClock: true, transport: ['analog-clock', 'midi-din'] },

  /**
   * §2.6/#22, §7.4/#80. **The one entry in this map, and it is about a field that is not here.**
   *
   * #80 asked every box in the library whether driving a rig is its job. On this one the question
   * is closed before it is asked: `preferredSource` requires `canSendClock`, and the schema
   * refuses the pair — so the field could not be claimed even if somebody wanted to. The entry is
   * still worth writing, because "the schema would have refused it" is not the same finding as
   * "the manual does not say", and this manual does not say either. It documents three MIDI
   * behaviours and no transmission at all (see the `clock` comment above), so there is no role
   * sentence to read one way or the other.
   *
   * Recorded rather than omitted, so the decision reads as a decision. Compare the Cascadia,
   * whose entry says something different again: there the box plainly sends clock, so the question
   * is live rather than closed by the hardware, and its manual answers it in the negative. Until
   * #120 those two findings wore the same word; the Cascadia's is `cited-against` now and carries
   * its pages, and this one stays `unknown` because silence is what this document actually is.
   *
   * ## Three more entries, and they are the reason `unread` exists (#120)
   *
   * The module index is not in `manuals/` (see the module JSDoc), so `features.lfo` and both
   * `features.sidechain` paths are absences of *documentation* rather than of capability — and
   * that is not the same finding as `unknown`. Nobody read a document and came back empty here:
   * the document that would answer is out of reach, and the work is blocked on finding a file
   * rather than on an author's afternoon. Written `unknown`, it would have reported a missing
   * manual as finished research, which is the exact failure #118 hit and #120 fixed.
   *
   * `features.*` paths are accepted whether or not the feature is declared, which is what makes
   * this expressible at all: evidence *about an absence* is what invariant 5 asks for.
   */
  capabilityEvidence: {
    'clock.preferredSource': {
      kind: 'unknown',
      reason:
        'this manual documents no clock transmission at all, so it states nothing about leading a rig either — and with `canSendClock: false` the field is not claimable in any case',
    },

    'features.lfo': {
      kind: 'unread',
      reason:
        'ZOIA’s LFOs live in the module library, and the document that enumerates it — the module index — is not in `manuals/`; this 44-page hardware manual is about the knob, the grid, the pages and the connections, and mentions no LFO anywhere',
    },

    'features.sidechain.internal': {
      kind: 'unread',
      reason:
        'same document, same absence: a ZOIA patch can plainly duck one signal from another, and the module index that would say how is not in `manuals/` — this manual never describes a ducking source',
    },

    'features.sidechain.fromExternalAudio': {
      kind: 'unread',
      reason:
        'same document, same absence: the audio inputs are documented (p.5) and the modules that would read them for a ducking source are in the module index, which is not in `manuals/`',
    },
  },

  /**
   * Stereo in, stereo out, and a headphone out that duplicates the main pair rather than being a
   * third destination (p.5). `individualOuts: 0` — the four CV outputs are control voltage, not
   * audio, and there is no second audio pair to send a part to on its own.
   *
   * `usbAudio: false`, and this is a checked absence rather than an unfilled field: the word USB
   * does not occur in the manual. Patches move on a microSD card (p.28) and firmware arrives the
   * same way (p.27).
   */
  io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },

  /**
   * §10. 34 HP across. The specifications give *"Size: 34hp Eurorack Format Module"* (p.29) and
   * no millimetre figure at all, so the number here is that value converted at the defined
   * 5.08 mm per HP: 34 x 5.08 = 172.72, authored as 172.7.
   *
   * This is the library's first module rather than a box on a desk, and the orientation question
   * §2.3 exists for has a different answer because of it: a module is played bolted upright into
   * a case, so its horizontal span is the HP width, and the 28 mm the specifications call
   * *depth* is what sticks out behind the rails — invisible in a front-panel view. `panel.ts`
   * carries the rise, which the manual never states and which was therefore measured off the
   * cover drawing.
   */
  physical: {
    panelSpanMm: 172.7,
    verified: {
      kind: 'manual',
      source: 'ZOIA Euroburo User Manual Rrev2 (firmware 2.30), p.29 (Specifications)',
    },
  },

  /** §10. A simplified original drawing of the front panel, read off the cover (see `panel.ts`). */
  panel: ZOIA_EUROBURO_PANEL,

  /** §2.4. No voices, so no assignables, so no recipes. See the module JSDoc for the cost. */
  voices: [],
  recipes: [],

  manual: { title: 'ZOIA Euroburo User Manual', edition: 'Rrev2 (firmware 2.30)' },

  productPage: 'https://empresseffects.com/products/zoia-euroburo',
}
