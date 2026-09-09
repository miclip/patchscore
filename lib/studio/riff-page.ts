import type { Device, DeviceId, Riff, StoredRigV1, StudioLoad } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { riffHref } from './catalogue'
import { riffDescription, riffTitle } from './riff-text'

/**
 * §5A. Everything a riff page states that is not a sentence, computed off the entry.
 *
 * The mirror of `direction-page.ts`, and deliberately not symmetric with it: a riff has no
 * structure, no harmonic cycle and no list of competing requests, and giving it those so the two
 * pages matched would be the page dictating the data model (invariant 3). What it has instead is
 * one part, one figure and one grid.
 *
 * Sentences live in `riff-text.ts`, which the Markdown export shares (#495). This file holds the
 * addressing, the counts, and the one piece of logic a *page* needs and a document does not: how
 * a rig arrives from storage.
 */

export type RiffPage = {
  riff: Riff
  href: string
  /** `The Blue Monday bass — Patchscore`, the shape every catalogue title has. */
  title: string
  description: string
}

export function riffPageTitle(riff: Riff): string {
  return `${riffTitle(riff)} — Patchscore`
}

export function riffPage(riff: Riff): RiffPage {
  return {
    riff,
    href: riffHref(riff),
    title: riffPageTitle(riff),
    description: riffDescription(riff),
  }
}

// ---------------------------------------------------------------------------
// The rig, read and never written
// ---------------------------------------------------------------------------

/**
 * §8.2/#503. **The device ids this page opens with, reconciled against the catalogue this build
 * actually ships.**
 *
 * A riff page borrows the reader's rig so that the first thing they see is their own boxes rather
 * than an empty list — and borrows it in the strictest sense of the word. It **reads** the studio
 * document and never writes one: nothing here, and nothing on the page above it, can reach
 * `saveStudio` or `STUDIO_STORAGE_KEY`. `test/riff-storage.test.ts` proves it with a `setItem`
 * that throws.
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

/** The same reconciliation, given ids — what the picker's `onToggle` hands back. */
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
