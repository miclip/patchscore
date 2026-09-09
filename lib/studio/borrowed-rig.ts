import type { Device, DeviceId, StoredRigV1, StudioLoad } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'

/**
 * §5A.6/§8.2/#503/#520. **The reader's rig, borrowed and never written back.**
 *
 * Lifted out of `riff-page.ts` when a second surface needed exactly this (#520). A riff page and a
 * sound page both open on the boxes somebody owns so that the first thing they see is their own
 * rig rather than an empty list, and both **read** the studio document and never write one:
 * nothing in either page's import graph reaches `saveStudio` or `STUDIO_STORAGE_KEY`.
 * `test/riff-storage.test.ts` and `test/sample-storage.test.ts` each prove it with a `setItem`
 * that throws, and each walks its own route's files.
 *
 * That rule is the reason this is one module rather than two copies. A page a reader arrives at
 * from a search result must not rewrite the rig they built in the studio because they ticked a box
 * to see whether their sampler could play something; a second implementation of "read it, never
 * write it" is a second chance to get the second half wrong.
 */

// ---------------------------------------------------------------------------
// The rig, read and never written
// ---------------------------------------------------------------------------

/**
 * §8.2/#503. **The device ids a borrowing page opens with, reconciled against the catalogue this
 * build actually ships.**
 *
 * **Every failure is the same answer: no boxes.** `loadStudio` has four outcomes and three of them
 * mean the page has not been told what the reader owns — nothing stored yet, a document this build
 * cannot read, or no storage at all (a server render, blocked site data, a browser without any).
 * A page that guessed a rig from any of those would be showing somebody else's boxes, and a page
 * that reported the failure would be handing a reader a diagnostic about a document they have
 * never seen instead of the figure they came for. So all three open empty, the picker is empty,
 * and §7.3's gap says what to do about it — which is to tick a box.
 *
 * **Reconciled rather than trusted.** `loadStudio` already refuses a document naming a device this
 * build has never heard of, so this is the second gate rather than the first, and it earns its
 * place twice over: it filters through `DEVICES`, which drops anything that slipped past, and it
 * returns them in *registry* order (§7.2) rather than the order they were stored in, so two
 * readers whose rigs hold the same boxes see the same page.
 */
export function rigFromStudio(load: StudioLoad, devices: readonly Device[] = DEVICES): Device[] {
  if (load.status !== 'ok') return []
  return rigFromIds(
    load.doc.rig.devices.map((member) => member.deviceId),
    devices,
  )
}

/** The same reconciliation, given ids — what `RigPicker`'s `onToggle` hands back. */
export function rigFromIds(
  ids: readonly DeviceId[],
  devices: readonly Device[] = DEVICES,
): Device[] {
  const wanted = new Set(ids)
  return devices.filter((device) => wanted.has(device.id))
}

/**
 * The rig a stored document names, as ids, in registry order. Split out from `rigFromStudio`
 * because the picker is addressed by id and the resolver by object, and deriving one from the
 * other twice is how the two come to disagree about the order.
 */
export function rigIdsFromStudio(
  load: StudioLoad,
  devices: readonly Device[] = DEVICES,
): DeviceId[] {
  return rigFromStudio(load, devices).map((device) => device.id)
}

/** What a stored rig is called, for nothing more than a line saying where the boxes came from. */
export function storedRigName(load: StudioLoad): string | undefined {
  if (load.status !== 'ok') return undefined
  const rig: StoredRigV1 = load.doc.rig
  return rig.devices.length === 0 ? undefined : rig.name
}
