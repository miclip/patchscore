import type {
  Device,
  DeviceId,
  DeviceKind,
  ResolveResult,
  Role,
  Template,
  TemplateId,
} from '@/lib/core'

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
 *  - *Section names fail too.* 'Intro', 'Outro' and 'Peak' each appear in two directions, and
 *    which two is an accident of authoring vocabulary rather than a fact about the music. Most
 *    directions here name their sections in words nobody else uses, so the field discriminates
 *    beautifully for those and not at all for the others — and a field that works only because
 *    one author chose unusual words is not a field worth searching.
 *  - *Keys pass.* 'major' finds Major-Key Electro and excludes every other one, 'dorian' finds
 *    Ambient Dub alone, 'minor' finds Industrial Techno, 'lydian' finds Lydian House. Real
 *    distinctions, already authored, each one genuinely narrowing the list — and each direction
 *    added since has kept them exclusive, which is why the mode a direction offers is a content
 *    decision and not only a musical one.
 *  - *BPM is not a term.* It is authored and numeric, so it does not belong in a text box. If
 *    direction filtering ever wants a tempo range that is a different control, and not at seven
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
  return [
    device.name,
    device.maker,
    device.kind,
    device.kind.replace(/-/g, ' '),
    /**
     * **Roles, which pass this file's own test for devices and failed it for directions.**
     *
     * The rule above is that a field earns a place by *excluding* something, and roles were
     * rejected for templates because every template requests a kick — a term matching all of them
     * is noise wearing the costume of a feature.
     *
     * Devices are the other way round, measured across the 34 shipped: **13 of 23 roles match half
     * the library or less** — `ride` 8, `sweep` 9, `vox-chop` 12, `acid` and `arp` 15 apiece. Only
     * five match more than 70%, and even the worst (`sub`, 27 of 34) still excludes seven boxes.
     *
     * So "who can play an acid line" is a question this list can now answer, which is the question
     * somebody buying or choosing a box actually has. The weak terms stay weak — searching `sub`
     * narrows little — and that is a property of the library rather than of the field.
     *
     * From `recipes` rather than `voices.roles`: a voice advertising a role its device has no
     * recipe for would put a box in the results that cannot actually be asked for it (§3).
     */
    ...new Set(device.recipes.map((recipe) => recipe.role)),
  ]
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
  /**
   * **Boxes that carry more than one part at once**, which is not a kind and cannot be one.
   *
   * A control rather than a search term, for the reason BPM is not a term above: it is a property
   * with two states, not a word somebody types. And it could not be a term here even if it were —
   * `Circuit Tracks` and `Tracker Mini` have the word in their names, so a text match would return
   * the two boxes whose names say "track" rather than the fourteen that have them.
   *
   * It discriminates well: 14 of 34, and they spread across `groovebox`, `sampler` and `synth`, so
   * no kind filter collects them. That is exactly the gap — the count is already on every row and
   * there was no way to ask for it.
   */
  multiPart: boolean
  /**
   * §7.3. **Only boxes that would fill a gap in the rig as it stands.**
   *
   * The other two filters ask what a box *is*; this one asks what it would *do for you*, which is
   * the question somebody with a direction chosen and a hole in their guide actually has. It
   * needs the resolve to answer, so `deviceView` takes the unfilled roles beside the filter
   * rather than the filter carrying them — a set of roles is not a setting a reader chose.
   *
   * Inert with nothing unfilled, which is the honest behaviour: a rig that covers its direction
   * has no gap to fill, and a filter that then hid everything would be reporting a hole that is
   * not there.
   */
  fillsGap: boolean
}

export const NO_DEVICE_FILTER: DeviceFilter = {
  query: '',
  kind: ANY_KIND,
  multiPart: false,
  fillsGap: false,
}

/**
 * §2.2. More than one part at once — a pool with several members, or several voices.
 *
 * Asked of the *authored* shape rather than of `expand()`, because a reader choosing a box is
 * asking what the hardware does, and both shapes answer it: a Deluge's pool of 24 and a TR-1000's
 * eleven named instruments are both boxes that carry a lot at once.
 */
/**
 * §7.3. **The roles this direction asked for and did not get**, which is the set a reader is
 * shopping against.
 *
 * `not-needed` is excluded and that is the whole judgement here: a direction that says it is
 * finished without a ride is not a rig missing a ride, and offering to sell somebody a box for it
 * would be the guide's own advice contradicted by its picker. The other two kinds are both real
 * absences — the rig cannot, or nobody has written the recipe — and a different box can answer
 * either one.
 */
export function rolesLeftUnfilled(result: ResolveResult): ReadonlySet<Role> {
  const out = new Set<Role>()
  for (const shortfall of result.shortfalls) {
    if (shortfall.kind === 'not-needed') continue
    out.add(shortfall.role)
  }
  return out
}

/**
 * Whether this box has a recipe for something the rig is missing.
 *
 * From `recipes` rather than `voices.roles`, for the reason the role search gives: a voice
 * advertising a role its device cannot actually be asked for would offer a box that changes
 * nothing (§3).
 */
export function fillsAGap(device: Device, unfilled: ReadonlySet<Role>): boolean {
  return device.recipes.some((recipe) => unfilled.has(recipe.role))
}

export function carriesSeveralParts(device: Device): boolean {
  let total = 0
  for (const voice of device.voices) total += voice.kind === 'pool' ? voice.count : 1
  return total > 1
}

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
  unfilled: ReadonlySet<Role> = new Set(),
): PickerView<Device> {
  const terms = queryTerms(filter.query)
  const chosen = new Set(selected)
  // `fillsGap` with nothing unfilled is not filtering: there is no gap, so the answer is every
  // box, and treating it as active would report a hole the rig does not have.
  const gapping = filter.fillsGap && unfilled.size > 0
  const filtering = terms.length > 0 || filter.kind !== ANY_KIND || filter.multiPart || gapping
  return view(
    devices,
    (device) =>
      (filter.kind === ANY_KIND || device.kind === filter.kind) &&
      (!filter.multiPart || carriesSeveralParts(device)) &&
      (!gapping || fillsAGap(device, unfilled)) &&
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

/** The parts of a scroll container `centreOffset` reads. A subset of `HTMLElement`. */
export type ScrollBox = {
  readonly scrollHeight: number
  readonly clientHeight: number
  readonly scrollTop: number
}

/** The parts of a row `centreOffset` reads. A subset of `HTMLElement`. */
export type ScrollRow = {
  readonly offsetTop: number
  readonly offsetHeight: number
}

/**
 * Where to scroll a picker list so the chosen row sits in the middle of it (#391).
 *
 * `.picker-list` is a 21rem scroll box and the direction list is longer than that, so a choice
 * arriving from a permalink was often below the fold — the panel opened on the top of the list
 * with nothing saying the reader's own direction was further down.
 *
 * Returns `undefined` where there is nothing to do, so the caller leaves `scrollTop` alone rather
 * than writing a `0` that looks the same and is a decision:
 *
 *  - **the list is not scrollable** — every row is already visible;
 *  - **the row is already inside the middle band** — re-centring a row the reader can see is
 *    motion nobody asked for. The band is the middle half, wide enough that an ordinary choice
 *    near the centre is left where it is.
 *
 * Clamped to the scrollable range, so a row near either end settles against that end. Centring
 * the first row is impossible and asking for it is not an error.
 */
export function centreOffset(box: ScrollBox, row: ScrollRow): number | undefined {
  if (box.scrollHeight <= box.clientHeight) return undefined
  const band = box.clientHeight / 4
  const top = row.offsetTop - box.scrollTop
  if (top >= band && top + row.offsetHeight <= box.clientHeight - band) return undefined
  const wanted = row.offsetTop - box.clientHeight / 2 + row.offsetHeight / 2
  return Math.max(0, Math.min(wanted, box.scrollHeight - box.clientHeight))
}
