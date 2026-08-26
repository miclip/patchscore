import type { Device } from './device'
import type { DeviceId } from './ids'

/**
 * §8 phase 7's first half: **what can duck what, in this rig.**
 *
 * The section used to print the field and nothing else — one line per declaring box, reading
 * `TR-8S — internal` or `Deluge — internal`. Every word of that is true and none of it is an
 * answer to the question a reader standing at the rack is actually asking, which is *can I pump
 * this rig off the kick, and if so where does the cable go*. "Internal" does not say. Worse, the
 * word is the same on a box that can duck to another box's audio and on a box that cannot, so
 * the one case where the reader has something to patch looked identical to the case where they
 * have nothing to patch and must program the duck inside each box separately.
 *
 * Like `fx.ts` and `arrangement.ts` this module derives and renders nothing. Both renderers read
 * it, so "nothing here ducks to another box" is decided once. The wording is written twice; the
 * fact is not, and `test/guide-view.test.ts` holds the two copies to the same facts.
 *
 * **What the two booleans mean, because they are easy to read backwards.**
 * `SidechainSpec.fromExternalAudio` records where the **trigger** comes from, never what is
 * being ducked. The TR-8S's comment is the one that states it, and it states it because the box
 * is the trap: `KIT: EXT IN` on a TR-8S ducks the external input *from* an internal instrument,
 * so external audio is all over that feature and the trigger is still internal. The TR-1000 was
 * authored with the same page read the other way round and said `true` for two commits (its
 * Owner's Manual p.30 lists "Apply a side chain" among the things you can do *to* EXT IN audio,
 * and the Reference Manual's SIDE CHAIN `SOURCE` enumerates the trigger: `OFF, BD (A,B)-RC`,
 * every one of them an instrument). One flag read backwards is one guide telling its reader to
 * patch a cable that does nothing.
 *
 * **A trigger needs a socket.** `fromOtherBoxes` requires `io.audioIn` as well as the flag,
 * because the sentence it produces is a patching instruction and a box with no input has
 * nowhere for the cable to go. The two come apart only in a manifest that declares an external
 * trigger on a box with no audio input, which nothing in the library does; the per-box grouping
 * still follows the declaration, so such a box would say something visibly odd rather than
 * quietly losing its flag.
 *
 * **Boxes that declare no sidechain are not listed as having none.** A missing `features
 * .sidechain` is an absence of documentation as often as an absence of capability — the ZOIA
 * records exactly that, `unread`, because its module index is not in `manuals/` — so this
 * section names what a box can do and never speaks for a box that has said nothing (invariant
 * 5). The rig-level sentence is therefore about the duckers, never about the rack.
 */

/** One box that declares a sidechain, in the rig's own device order. */
export type Ducker = {
  deviceId: DeviceId
  name: string
}

/** A ducker whose trigger can arrive as audio from somewhere else in the rig. */
export type ExternalDucker = Ducker & {
  /** Its own parts can trigger it as well, so the patch is a choice rather than the only way. */
  alsoSelf: boolean
}

export type SidechainReading = {
  /** Duckers that take a trigger from another box's audio, and have a jack for it to arrive at. */
  fromOtherBoxes: readonly ExternalDucker[]
  /** Duckers whose only documented trigger is one of their own parts. */
  selfOnly: readonly Ducker[]
  /** Duckers that declare the feature with neither trigger — the schema allows it; say so. */
  unstated: readonly Ducker[]
  /**
   * One box in the rig, so "another box" is not a possibility to discuss. #144 is the same
   * shape one section up: rig-wide phrasing read at a one-box rig states something false about
   * a rack the reader can see the whole of.
   */
  alone: boolean
}

export function sidechainReading(devices: readonly Device[]): SidechainReading {
  const fromOtherBoxes: ExternalDucker[] = []
  const selfOnly: Ducker[] = []
  const unstated: Ducker[] = []
  for (const device of devices) {
    const spec = device.features?.sidechain
    if (spec === undefined) continue
    const ref = { deviceId: device.id, name: device.name }
    if (spec.fromExternalAudio && device.io.audioIn) {
      fromOtherBoxes.push({ ...ref, alsoSelf: spec.internal })
    } else if (spec.internal) {
      selfOnly.push(ref)
    } else {
      unstated.push(ref)
    }
  }
  return { fromOtherBoxes, selfOnly, unstated, alone: devices.length === 1 }
}

/** Nothing in this rig declares a sidechain at all. */
export function noDuckers(reading: SidechainReading): boolean {
  return (
    reading.fromOtherBoxes.length === 0 &&
    reading.selfOnly.length === 0 &&
    reading.unstated.length === 0
  )
}

/**
 * The rig holds more than one box, something ducks, and none of it can be triggered from
 * anywhere but inside itself — the case the old rendering could not distinguish from the one
 * where a cable does the job.
 */
export function pumpIsBoxByBox(reading: SidechainReading): boolean {
  return !reading.alone && reading.fromOtherBoxes.length === 0 && reading.selfOnly.length > 0
}
