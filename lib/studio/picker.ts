import type { Device, DeviceId, DeviceKind, Template, TemplateId } from '@/lib/core'

/**
 * #53. Searching and filtering the two picker lists — pure, and deliberately **not symmetric**.
 *
 * The lists grow: ten devices are queued against today's four, and templates follow once #9
 * lands. A list of cards is right for three of anything and survives nothing.
 *
 * **What each list matches on, and why they differ.** The two were nearly given the same fields
 * out of a wish for symmetry, and that would have been wrong — a `Template` has no maker and no
 * kind, and inventing either to feed a search box would be the search dictating the data model.
 * Invariant 3 keeps templates device-agnostic; they are not devices with the hardware removed.
 *
 *  - **Devices: name, maker, kind.** All three exclude. 'roland' narrows to one maker, 'synth'
 *    finds the synths, and the metadata is already on every card.
 *  - **Directions: name and authored keys.** Nothing else.
 *
 * The test for whether a field belongs in a search is whether it **excludes** anything. A term
 * that matches everything is noise wearing the costume of a feature, and it teaches a user that
 * the search is broken. Applied to what a template carries:
 *
 *  - *Roles fail.* Every template requests a kick, so 'kick' would return all of them. The few
 *    discriminating roles — acid, vox-chop — are not worth the false confidence the universal
 *    ones create.
 *  - *Section names fail too.* 'Intro', 'Outro' and 'Peak' each appear in two of the three
 *    templates authored, so a section search returns most of the list — which is the same
 *    failure as a universal role, just short of total. Ambient Dub happens to name its sections
 *    differently, and a field that discriminates only because one author chose unusual words is
 *    not a field worth searching.
 *  - *Keys pass.* 'major' finds Major-Key Electro and excludes the other two, 'dorian' finds
 *    Ambient Dub alone, 'minor' finds Industrial Techno. Real distinctions, already authored,
 *    each one genuinely narrowing the list.
 *  - *BPM is not a term.* It is authored and numeric, so it does not belong in a text box. If
 *    direction filtering ever wants a tempo range that is a different control, and not at three
 *    templates.
 *
 * And the name carries most of the weight anyway: 'techno', 'dub', 'electro' are how a person
 * actually looks for a genre.
 *
 * **This is a view, and only a view.** Nothing here returns a selection, and no caller can use
 * it to change one — which is what keeps #12's permalink and stored rig out of it. The filter
 * state lives inside each picker component and never reaches `GuideInputsV1`.
 */

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * The separator between fields in a row's haystack.
 *
 * A newline, and that is load-bearing rather than arbitrary: terms are split on whitespace, so
 * no term can ever contain one. A single term therefore cannot match across two fields — a
 * search for '1000 drum' does not find a TR-1000 whose kind happens to follow its name — while
 * two terms are still free to match one field each, which is what makes 'roland tr' work.
 */
const FIELD_BREAK = '\n'

/**
 * `toLowerCase`, never `toLocaleLowerCase`: the latter is ambient-locale dependent, and this
 * file is one of the places where that would be invisible until someone in another locale typed
 * a Turkish dotless i. Case folding is the only text transformation here — no stemming, no
 * fuzzy matching, nothing a user would have to model in their head to predict a result.
 */
function fold(text: string): string {
  return text.toLowerCase()
}

/** The terms in a query. Whitespace-separated; an empty or blank query has none. */
export function queryTerms(query: string): readonly string[] {
  return fold(query)
    .split(/\s+/)
    .filter((term) => term.length > 0)
}

/**
 * Every term must appear somewhere in the row. **AND, not OR**: adding a word to a search should
 * narrow the result, which is the behaviour anyone who has used a search box expects, and OR
 * would make the list grow as you typed.
 */
export function matches(fields: readonly string[], terms: readonly string[]): boolean {
  if (terms.length === 0) return true
  const haystack = fields.map(fold).join(FIELD_BREAK)
  return terms.every((term) => haystack.includes(term))
}

/**
 * A device's searchable text: name, maker, kind.
 *
 * The kind goes in twice — as authored (`drum-machine`) and with its hyphens opened out (`drum
 * machine`) — because both are things a person types, and a vocabulary that is hyphenated for
 * the schema's benefit should not decide how someone searches.
 */
export function deviceFields(device: Device): readonly string[] {
  return [device.name, device.maker, device.kind, device.kind.replace(/-/g, ' ')]
}

/** A direction's searchable text: the name, and the keys it authors. Nothing else — see above. */
export function templateFields(template: Template): readonly string[] {
  return [template.name, ...template.keys]
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** The sentinel for "no kind filter". A string rather than `undefined` so it can be a `<option>`. */
export const ANY_KIND = 'any'
export type KindFilter = DeviceKind | typeof ANY_KIND

export type DeviceFilter = {
  query: string
  kind: KindFilter
}

export const NO_DEVICE_FILTER: DeviceFilter = { query: '', kind: ANY_KIND }

/**
 * One entry as the picker should draw it.
 *
 * `retained` is the interesting flag: the row failed the active search or filter and is on the
 * list anyway, because it is selected. **Losing sight of your own rig because you typed in a
 * search box is the failure this exists to prevent** — the picker is the only place the rig is
 * visible, and a filter is a question about the catalogue, not an instruction to forget what you
 * own. It is rendered as a quiet mark rather than silently, so the list never looks like it is
 * disobeying its own filter.
 */
export type PickerRow<T> = {
  item: T
  selected: boolean
  retained: boolean
}

export type PickerView<T> = {
  /** What to draw, in the source list's own order. */
  rows: readonly PickerRow<T>[]
  /** How many entries the query and filter actually matched. */
  matched: number
  /** How many are on the list only because they are selected. */
  retained: number
  /** The whole catalogue, for an honest "n of m". */
  total: number
  /** Whether any search or filter is active at all. */
  filtering: boolean
}

function view<T>(
  items: readonly T[],
  keep: (item: T) => boolean,
  isSelected: (item: T) => boolean,
  filtering: boolean,
): PickerView<T> {
  const rows: PickerRow<T>[] = []
  let matched = 0
  let retained = 0

  // Source order throughout: registry order for devices (§7.2), authored order for templates.
  // Ranking by match quality would give the page a second opinion about which entry is first,
  // and the resolver's tie-breaks are documented against exactly one.
  for (const item of items) {
    const selected = isSelected(item)
    const hit = keep(item)
    if (hit) matched++
    else if (selected) retained++
    else continue
    rows.push({ item, selected, retained: !hit })
  }

  return { rows, matched, retained, total: items.length, filtering }
}

/** The kinds this build actually ships, in the order the registry first mentions them. */
export function kindsPresent(devices: readonly Device[]): readonly DeviceKind[] {
  const seen: DeviceKind[] = []
  for (const device of devices) {
    if (!seen.includes(device.kind)) seen.push(device.kind)
  }
  return seen
}

export function deviceView(
  devices: readonly Device[],
  selected: readonly DeviceId[],
  filter: DeviceFilter,
): PickerView<Device> {
  const terms = queryTerms(filter.query)
  const chosen = new Set(selected)
  const filtering = terms.length > 0 || filter.kind !== ANY_KIND
  return view(
    devices,
    (device) =>
      (filter.kind === ANY_KIND || device.kind === filter.kind) &&
      matches(deviceFields(device), terms),
    (device) => chosen.has(device.id),
    filtering,
  )
}

export function templateView(
  templates: readonly Template[],
  selected: TemplateId | undefined,
  query: string,
): PickerView<Template> {
  const terms = queryTerms(query)
  return view(
    templates,
    (template) => matches(templateFields(template), terms),
    (template) => template.id === selected,
    terms.length > 0,
  )
}
