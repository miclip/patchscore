import type { Device, DeviceKind, Riff, SampleTarget, ShippedPatch, Template } from '@/lib/core'
import { devicePagePath, referenceSlug } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RECORD_RIFFS } from '@/lib/riffs'
import { TEMPLATES } from '@/lib/templates'
import { ANY_KIND, NO_DEVICE_FILTER, deviceView, kindsPresent, riffView, templateView } from './picker'
import type { DeviceFilter, PickerView } from './picker'

/**
 * #84. The two browsable catalogues, declared as data so one shell can draw both.
 *
 * `deviceView` and `templateView` already return the same `PickerView`, so the search, the
 * counting and the list markup are written once in `components/catalogue/browse.tsx` and the
 * differences between the two catalogues live here. Devices search on name, maker and kind and
 * carry a kind filter; directions search on name and authored keys and have no kind to filter
 * on. `lib/studio/picker.ts` carries the argument for which fields earn a place.
 *
 * `CatalogueSource` is not `Catalogue` from `lib/core`. That one is the id-space a permalink is
 * decoded against (#12). This one is a browsable list and reaches no state at all.
 *
 * **Nothing here is a selection.** The picker's `retained` rule exists because a filter must
 * never hide a device you own; a catalogue index has no rig behind it, so `search` is given an
 * empty selection and every row it returns is a match. See `Browse`, which draws no kept group.
 */

/** The kind label a person reads: the authored `drum-machine`, opened out. */
export function kindLabel(kind: DeviceKind): string {
  return kind.replace(/-/g, ' ')
}

export type CatalogueSource<T> = {
  /** Slugs the control ids and marks the rendered list. Also the route these pages live under. */
  id: 'devices' | 'directions' | 'riffs'
  /** For the count line, which says a number and then a noun. */
  noun: { one: string; many: string }
  /** The visually hidden label on the search box. */
  searchLabel: string
  placeholder: string
  /**
   * The kinds this build ships, in the order the registry first mentions them. Empty means the
   * catalogue has nothing to filter on and the shell draws no select. A `Template` has no kind,
   * and giving it one to make the two catalogues symmetric would be the page dictating the data
   * model (invariant 3).
   */
  kinds: readonly DeviceKind[]
  /** Said when the search matched nothing. Authored per catalogue: the two read differently. */
  empty: string
  /**
   * The catalogue, filtered, in source order. Registry order for devices (§7.2), authored order
   * for directions. Ranking by match quality would give the site a second opinion about which
   * device is first, and the resolver's tie-breaks are documented against one.
   *
   * Directions take the same `DeviceFilter` and ignore its `kind`, which stays `ANY_KIND`
   * because the shell only ever draws the select for a catalogue that declares kinds.
   */
  search: (filter: DeviceFilter) => PickerView<T>
  /** A stable React key. */
  keyOf: (item: T) => string
}

export const DEVICE_CATALOGUE: CatalogueSource<Device> = {
  id: 'devices',
  noun: { one: 'device', many: 'devices' },
  searchLabel: 'Search devices by name, maker or kind',
  placeholder: 'Search name, maker, kind',
  kinds: kindsPresent(DEVICES),
  empty: 'No device matches that.',
  search: (filter) => deviceView(DEVICES, [], filter),
  keyOf: (device) => device.id,
}

export const DIRECTION_CATALOGUE: CatalogueSource<Template> = {
  id: 'directions',
  noun: { one: 'direction', many: 'directions' },
  searchLabel: 'Search directions by name or key',
  placeholder: 'Search name, key',
  kinds: [],
  empty: 'No direction matches that.',
  search: (filter) => templateView(TEMPLATES, undefined, filter.query),
  keyOf: (template) => template.id,
}

/**
 * §5A. The third catalogue, and the narrowest search of the three: a riff is found by what it is
 * named for or by the part it is, and it has no maker and no key list to match on.
 *
 * **The record-named entries only** (§5A.7, #598). A figure named for a factory patch is listed
 * on the box that ships the patch and has no page here, so searching it here would find a
 * card with a 404 behind it. `RECORD_RIFFS` is the one filter, shared with the route and the
 * sitemap.
 *
 * **The label names neither kind of reference, and that is deliberate** (§5A.5, #566). It said
 * *record* until a riff arrived named for a factory patch, and the repair is not to list both:
 * `RiffSchema` requires the reference verbatim inside `name`, so somebody typing *Blue Monday*
 * matches the title without the label having promised it. A label enumerating the kinds goes
 * stale the next time one is added, and this one already did.
 */
export const RIFF_CATALOGUE: CatalogueSource<Riff> = {
  id: 'riffs',
  noun: { one: 'riff', many: 'riffs' },
  searchLabel: 'Search riffs by name or part',
  placeholder: 'Search name, part',
  kinds: [],
  empty: 'No riff matches that.',
  search: (filter) => riffView(RECORD_RIFFS, filter.query),
  keyOf: (riff) => riff.id,
}

/** The filter a catalogue opens on: everything shown, nothing typed. */
export const NO_CATALOGUE_FILTER: DeviceFilter = NO_DEVICE_FILTER

/**
 * The count under the controls. While a search is running it reports what matched against the
 * size of the whole catalogue, so a reader can see how much of the library they have hidden.
 */
export function countLine<T>(view: PickerView<T>, noun: CatalogueSource<T>['noun']): string {
  if (view.filtering) return `${view.matched} of ${view.total} match`
  return `${view.total} ${view.total === 1 ? noun.one : noun.many}`
}

// ---------------------------------------------------------------------------
// Naming and addressing
// ---------------------------------------------------------------------------

/**
 * How the box is named in prose: maker and name, unless the manifest's name already carries the
 * maker. One of the thirteen does, and `Zoom Zoom LiveTrak L-8` is not a device anybody owns.
 */
export function deviceLabel(device: Device): string {
  const lower = device.name.toLowerCase()
  return lower.startsWith(device.maker.toLowerCase()) ? device.name : `${device.maker} ${device.name}`
}

/**
 * `/devices/roland-tr-1000`. One place, so the sitemap, the card and the canonical agree — and
 * since #487 the guide as well, which is why the shape itself is `devicePagePath` in `lib/core`:
 * the Markdown renderer links here too and cannot import from this layer.
 */
export function deviceHref(device: Device): string {
  return devicePagePath(device.id)
}

/**
 * §3.7/#478. `/devices/roland-tr-1000/kit` — the standalone kit session, under the device it is
 * about, because that is what it is a view of. One place, so the device page's link, the sitemap
 * and the page's own canonical cannot disagree.
 *
 * A path rather than a route object, and derived from `deviceHref` rather than rebuilt: a kit
 * page exists only where a device page does.
 */
export function kitHref(device: Device): string {
  return `${devicePagePath(device.id)}/kit`
}

/**
 * §2.6/#593. `/devices/moog-muse/presets` — the factory patches a box ships, laid open, under
 * the device they belong to. One place, so the device page's link, the sitemap and the page's
 * own canonical cannot disagree, for `kitHref`'s reason: a presets page exists only where a
 * device page does.
 */
export function presetsHref(device: Device): string {
  return `${devicePagePath(device.id)}/presets`
}

/**
 * §3.7/#598. `muse-runner`: the segment a shipped patch is addressed by under `presetsHref`.
 * `referenceSlug` of the name the box prints, which is the same slugging a riff's id opens with,
 * so the address of a patch and the opening of the figure written for it agree by construction.
 * The bank is not in it: none has been read on any box, and `presetSession` refuses two patches
 * whose slugs collide rather than letting a bank decide an address nobody can type.
 */
export function presetSlug(patch: ShippedPatch): string {
  return referenceSlug(patch.name)
}

/**
 * §3.7/#598. `/devices/moog-muse/presets/muse-runner` — one preset figure, on the box that
 * ships the patch, under the index that lists it. One place, for `presetsHref`'s reason: the
 * index card, the sitemap and the page's own canonical cannot disagree.
 */
export function presetFigureHref(device: Device, patch: ShippedPatch): string {
  return `${presetsHref(device)}/${presetSlug(patch)}`
}

/** `/directions/ambient-dub`. The device pages link here, so it lives beside `deviceHref`. */
export function templateHref(template: Template): string {
  return `/directions/${template.id}`
}

/**
 * §5A. `/riffs/blue-monday-bass`. One place, so the index card, the sitemap and the page's own
 * canonical cannot disagree — the reason `templateHref` and `kitHref` are each one place.
 * **Only a record-named riff has a page here** (#598); a patch-named one is addressed by
 * `presetFigureHref`, and this returns an address that 404s for it.
 */
export function riffHref(riff: Riff): string {
  return `/riffs/${riff.id}`
}

/**
 * §3.8/#520. `/samples/wobble-bass`. One place, so the index card, the sitemap and the page's own
 * canonical cannot disagree — the reason `riffHref`, `templateHref` and `kitHref` are each one
 * place.
 */
export function sampleHref(target: SampleTarget): string {
  return `/samples/${target.id}`
}

/**
 * `3 sections`, `1 part`. Exported because both catalogue halves need it and a second private
 * copy is how `1 parts` reached a live meta description: the device page had this helper, the
 * direction page did not, and the direction page is the one that shipped a one-part direction.
 *
 * Only for nouns that can genuinely be one. Bars and sections never are, so they do not need it
 * and `num` is right to have no opinion about the noun beside it.
 */
export function plural(n: number, one: string): string {
  return `${n} ${n === 1 ? one : `${one}s`}`
}
