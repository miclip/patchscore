import type { Device, DeviceId } from '@/lib/core'
import { clockSourceBasis, selectClockSource } from '@/lib/core'
import type { ClockSourceBasis } from '@/lib/core'
import { deviceLabel } from './catalogue'

/**
 * #138. The picker's patchbay: the rig drawn as cables while you assemble it.
 *
 * §0's persona owns hardware and patches it. The picker is the first thing they touch and it
 * looks like a settings dialogue, which is the complaint. This module derives what a cable
 * between two boxes would *be* — never how it is drawn, which belongs to the component, and
 * never what the resolver decides, which belongs to `lib/core`.
 *
 * **This claims connectivity, not a channel.** `components/rack/model.ts`'s `AUDIO_OMISSION`
 * refuses to draw audio in the rack, and for a good reason: *"the resolver assigns parts to
 * voices, not to a destination box or mixer channel, so there is no authored endpoint to cable
 * to — and inventing one would be a plausible fiction."* Nothing here invents an endpoint. It
 * says a wire runs between two boxes and what that wire can carry; which socket and which
 * channel stay the reader's, exactly as the rack already says in words.
 *
 * ## The three kinds, and why the third is not a hedge
 *
 * A cable's kind is a statement about **how much is settled**, which is the same axis this
 * codebase already uses for values (`authored` / `derived` / `provisional`) and for the clock
 * source itself (`claimed` / `contested` / `tie-break`):
 *
 *  - `clock` — the box takes clock and is not an audio endpoint. The wire is a clock wire.
 *  - `audio` — the box cannot take clock at all, and is where audio lands. `canReceiveClock:
 *    false` on the two mixer-recorders is not a shortfall to apologise for; it is the whole
 *    reason the wire is the other kind.
 *  - `either` — the box takes clock **and** is an audio endpoint, so both wires are real and
 *    nothing here has any business ranking them. Not "unknown", and not "carries both": the
 *    reader decides, and the drawing says so rather than guessing.
 *
 * A box that can do neither gets no cable, and is reported as running free — the same honest
 * empty socket the rack already draws (invariant 5). Nothing is drawn where nothing is known.
 *
 * ## What it does not decide
 *
 * The clock source comes from `selectClockSource`, §7.4's own function, rather than a second
 * ranking written here. That is deliberate and load-bearing: §7.4 spends sixty lines refusing
 * to infer a topology judgement from `kind`, from `!canReceiveClock` and from load, and a
 * picker that ranked sources its own way would be a second answer to the one question the
 * guide already answers. The basis travels with it, so a `tie-break` can be drawn as the
 * non-judgement it is (#121) rather than as advice.
 */

export type PatchKind = 'clock' | 'audio' | 'either'

/** One run, from the clock source to one other box in the rig. */
export type PatchLink = {
  deviceId: DeviceId
  deviceName: string
  kind: PatchKind
  /**
   * A stable identity colour, as an integer hue in degrees.
   *
   * **Identity, not category** — the VCV rule recorded on #138: colour is how you follow one
   * cable across a crowded view, and kind is carried structurally instead so that it survives
   * the forced-colours ramp, where hue does not exist at all.
   *
   * Derived from the device id, never from the order rows were ticked. Patch order is not rig
   * state and must not become rig state: the same rig assembled in a different sequence has to
   * draw identically, or the permalink stops replaying what it promised (invariant 6).
   */
  hue: number
}

export type Patchbay = {
  /** Undefined when nothing selected can send clock — then there is no rig topology to draw. */
  source: { deviceId: DeviceId; deviceName: string; basis: ClockSourceBasis } | undefined
  links: PatchLink[]
  /** Selected boxes with no cable: they take no clock and are no audio endpoint. */
  free: { deviceId: DeviceId; deviceName: string }[]
}

/**
 * §2.4. An audio endpoint is a box whose *job* is to receive audio, which `kind` already says.
 *
 * **Not `io.audioIn`**, and the difference is the whole accuracy of this module. Thirteen of
 * eighteen manifests set `audioIn: true`, because a Mother-32 takes external audio into its
 * filter and a Subsequent 37 has an EXT IN. Those are patch points for processing a signal, not
 * places a rig's audio lands, and reading the flag as "this is where audio goes" would draw an
 * audio cable into a monosynth and call it routing.
 */
function isAudioEndpoint(device: Device): boolean {
  return device.kind === 'mixer-recorder' || device.kind === 'fx-processor'
}

/**
 * Kind is a pure function of two capability facts, in this order. Both are declared, neither is
 * inferred, and there is no fallback branch — a box that answers no to both gets no cable at
 * all rather than a cable with nothing to say.
 */
function patchKind(device: Device): PatchKind | undefined {
  const takesClock = device.clock.canReceiveClock
  const takesAudio = isAudioEndpoint(device)
  if (takesClock && takesAudio) return 'either'
  if (takesClock) return 'clock'
  if (takesAudio) return 'audio'
  return undefined
}

/**
 * A hue from the device id: sum of code units, spread around the wheel by a step coprime with
 * 360 so that ids adjacent in the registry do not land adjacent in colour.
 *
 * Code units rather than any locale-aware transform (§7.2), and integer arithmetic throughout,
 * so this is identical on every platform (invariant 6).
 */
function hueOf(id: DeviceId): number {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum = (sum + id.charCodeAt(i) * (i + 1)) % 360
  return (sum * 47) % 360
}

/**
 * The rig as runs from the clock source outward.
 *
 * A star, not a chain. Real clock distribution is one output fanned out (or daisy-chained
 * through MIDI THRU, which no manifest models), so drawing box-to-box-to-box would claim a
 * topology the data cannot support. The source is excluded from its own links: a box does not
 * patch to itself.
 *
 * Order follows `devices` as given, so the caller's order — registry order, in the picker —
 * decides the drawing, and nothing here re-sorts it (#53's rule for the list applies to the
 * cables over it).
 */
export function patchbay(devices: readonly Device[]): Patchbay {
  const source = selectClockSource(devices, new Map())
  const links: PatchLink[] = []
  const free: { deviceId: DeviceId; deviceName: string }[] = []

  for (const device of devices) {
    if (source !== undefined && device.id === source.deviceId) continue
    const kind = patchKind(device)
    if (kind === undefined) {
      free.push({ deviceId: device.id, deviceName: deviceLabel(device) })
      continue
    }
    links.push({
      deviceId: device.id,
      deviceName: deviceLabel(device),
      kind,
      hue: hueOf(device.id),
    })
  }

  return {
    source:
      source === undefined
        ? undefined
        : {
            deviceId: source.deviceId,
            deviceName: source.deviceName,
            basis: clockSourceBasis(source),
          },
    // With no source there is nothing to patch *from*, so every box is unreached rather than
    // wrongly cabled. Said plainly instead of drawing a star with no centre.
    links: source === undefined ? [] : links,
    free:
      source === undefined
        ? devices.map((d) => ({ deviceId: d.id, deviceName: deviceLabel(d) }))
        : free,
  }
}
