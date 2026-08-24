import type { Device, DeviceKind, Template } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { TEMPLATES } from '@/lib/templates'
import { ANY_KIND, deviceView, kindsPresent, templateView } from './picker'
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
  id: 'devices' | 'directions'
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

/** The filter a catalogue opens on: everything shown, nothing typed. */
export const NO_CATALOGUE_FILTER: DeviceFilter = { query: '', kind: ANY_KIND }

/**
 * The count under the controls. While a search is running it reports what matched against the
 * size of the whole catalogue, so a reader can see how much of the library they have hidden.
 */
export function countLine<T>(view: PickerView<T>, noun: CatalogueSource<T>['noun']): string {
  if (view.filtering) return `${view.matched} of ${view.total} match`
  return `${view.total} ${view.total === 1 ? noun.one : noun.many}`
}
