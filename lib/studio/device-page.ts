import type {
  AuthoredParam,
  Character,
  Cite,
  Device,
  ModulationControl,
  ModulationEnd,
  Recipe,
  Role,
  Template,
  Verified,
} from '@/lib/core'
import {
  CHARACTERS,
  ROLES,
  clockWires,
  compareCodeUnits,
  effectiveVerified,
  evidenceFor,
  expand,
} from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'
import { deviceHref, deviceLabel, templateHref, plural } from './catalogue'
import { coverage } from './coverage'
import { auditDevice, rangeDocuments } from './provenance'
import type { AuditCounts, AuditFinding } from './provenance'

/**
 * #84. Everything a device page states, computed from the manifest and the resolver.
 *
 * Pure, and separate from the page so the claims can be tested without a renderer. Every number
 * below is derived: nothing on a device page is authored a second time, because a fact restated
 * by hand is a fact that goes stale the day the manifest changes.
 */

/**
 * `a`, `a and b`. Three lines, restated rather than imported: the same list-joining lives in
 * `components/guide/format.ts`, and a module under `lib/` reaching up into `components/` to
 * borrow it would be the wrong direction for one sentence's worth of punctuation.
 */
export function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}

/**
 * The clock sentence, in the terminology the guide uses: **clock source** and *sync to it*,
 * never master/slave.
 *
 * Four cases, not two. A box that can do neither would otherwise read "receives clock only",
 * which is wrong about the box, and its transports are suppressed in that case because naming a
 * wire implies a clock travels on it.
 *
 * This restates `lib/core/render.ts`'s four cases rather than importing them, exactly as
 * `components/guide/format.ts` restates `ioText` and for the same reason: everything in
 * `render.ts` returns Markdown-flavoured strings. `test/device-catalogue.test.ts` asserts the
 * two agree for every device in the registry, which is what keeps a restatement honest.
 */
export function clockText(device: Device): string {
  const { canSendClock, canReceiveClock } = device.clock
  const claim = canSendClock
    ? canReceiveClock
      ? 'sends clock'
      : 'sends clock, cannot receive'
    : canReceiveClock
      ? 'receives clock only'
      : 'no clock in or out'
  // A box whose two directions run on different wires says so here too. The device page is the
  // one view read with no rig around it, so it is the only place the whole asymmetry is visible
  // at once — the guide only ever shows the transport its rig resolved.
  const wires = clockWires(device)
  if (wires.kind === 'none') return claim
  if (wires.kind === 'both') return `${claim} · ${wires.transport.join('/')}`
  return `${claim} · out: ${wires.send.join('/')} · in: ${wires.receive.join('/')}`
}

/** What this box covers at which characters, ordered by the shared vocabulary (§3.4). */
export type RoleCover = {
  role: Role
  /** The characters the manifest authors for this role, in `CHARACTERS` order. */
  characters: readonly Character[]
  recipes: number
}

/** One voice group as the manifest declares it: a fixed voice, or a pool with its count. */
export type VoiceLine = {
  id: string
  label: string
  /** 1 for a fixed voice, the pool size for a pool. */
  count: number
  polyphony: number
  roles: readonly Role[]
}

/**
 * How much of one direction this box carries **on its own**, from a real resolve against a rig
 * of exactly this device. Not a role-name match: the resolver applies §3.4 character distance,
 * §12.4 polyphony and §12.6 distinctness, and a role list cannot see any of that.
 *
 * The counts are two, kept apart: a template's optional requests are filled if they fit and
 * dropped if they do not (§4.4), so folding them into one fraction understates a box that
 * covers everything a direction actually needs.
 */
export type DirectionFit = {
  templateId: string
  name: string
  href: string
  requests: number
  covered: number
  essential: number
  essentialCovered: number
  /** The roles this box carried, in template request order. */
  roles: readonly Role[]
}

export type DevicePage = {
  device: Device
  href: string
  title: string
  description: string
  /** §2.2. What the resolver sees: pool ordinals folded in. */
  assignables: number
  voices: readonly VoiceLine[]
  roles: readonly RoleCover[]
  /** Characters authored anywhere on this device, in `CHARACTERS` order. */
  characters: readonly Character[]
  provenance: AuditCounts
  /**
   * §2.6/#121. **Which** capability facts are not a supporting citation, grouped by state.
   *
   * The counts above say how many, and #121 is the issue that a count is not a location: a reader
   * told "three facts on this box were looked for and not found" has no way to learn whether that
   * is the clock topology they are about to rely on or something they will never touch. Empty
   * when every fact this manifest speaks to is cited, which is the common case and prints nothing.
   */
  capabilityGaps: readonly CapabilityGap[]
  /**
   * §3.2/#410. **Which page each parameter's claims were read off**, grouped so a reader can
   * find the one they arrived with. Empty for a box with no recipes.
   */
  paramProvenance: readonly ParamProvenanceGroup[]
  /**
   * §3.2/#478. **The drum sounds this box makes from scratch**, in sampling order — see
   * `kitRecipes`. Empty for a box that makes fewer than `KIT_MINIMUM` of them, which is most of
   * the library and every pure sampler.
   */
  kit: readonly Recipe[]
  /**
   * Every direction, in template order, with what this box alone covers of it. Empty for a box
   * with no assignables: three rows of "0 of 12" say the same thing three times, and the page
   * says it once in prose instead.
   */
  directions: readonly DirectionFit[]
}

/**
 * §2.6/#121. One non-citation state and the field paths it covers on this box.
 *
 * Paths rather than prose, and the manifest's own paths rather than a friendly rewrite: a reader
 * deciding whether `clock.preferredSource` matters to them is the case this exists for, and
 * "the clock topology" would be this page inventing a name for a field the manifest already
 * names. §10's rule about values applies — they render monospace, because they are identifiers.
 *
 * The *reasons* were kept off this page until #410. Each one is a paragraph (the Deluge's runs to
 * four clauses across three page references), and four of them stacked is #35's failure moved to a
 * new page — an argument that held while the guide printed the reason once, where the fact was
 * being acted on. §8 prints no capability evidence at all (§3.2), which left the reason reaching
 * no rendered surface, and #35's objection was to four paragraphs stacked rather than to the
 * finding. So it lands here, behind the path: see `CapabilityFactDisclosure`. §2.6 carries the
 * record.
 */
export type CapabilityGap = {
  kind: 'cited-against' | 'partly' | 'undocumented' | 'unread' | 'unchecked'
  /** Code unit order (§7.2), inherited from the audit — never manifest key order. */
  facts: readonly CapabilityFactDisclosure[]
}

/**
 * §2.6/#410. **One unsettled capability fact, with what the manifest actually recorded about it.**
 *
 * The path was all this carried, and #410 names the rest as the same gap: a `reason` is required
 * on three of these states and a `cited-against` carries a page, both counted by the audit and
 * rendered nowhere. A required field that reaches no surface is a field an author writes for the
 * schema rather than for a reader.
 *
 * Every field but `path` is optional because the states carry different evidence, and none is
 * synthesised for a state that has none: `unchecked` is `false` in the manifest and has nothing
 * to say, which is what it means.
 *
 * `partly` keeps `proven` and `open` apart rather than folding either into `reason`. That split
 * is the whole of #236 — one half has a page behind it and the other does not — and collapsing
 * them into a sentence here would restore the workaround the state was added to replace.
 */
export type CapabilityFactDisclosure = {
  /** The manifest's own field path: `clock.preferredSource`, not a friendlier rewrite. */
  path: string
  /** Required by the schema on `undocumented`, `unread` and `cited-against`; absent otherwise. */
  reason?: string
  /** The document read: `cited-against`'s page, and the page behind `partly`'s proven half. */
  cite?: Cite
  /** `partly` only: what that page establishes. */
  proven?: string
  /** `partly` only: what it leaves open, which is why the fact is not a plain citation. */
  open?: string
}

/**
 * What the manifest recorded at one path, flattened for the disclosure above.
 *
 * Read off `capabilityEvidence` rather than off the finding, because a finding says only that a
 * fact is unsettled. A path with no entry cannot reach here — the audit walks the same map — so
 * the empty result is the unreachable case and not a silent hole.
 */
function factDisclosure(device: Device, path: string): CapabilityFactDisclosure {
  const evidence = evidenceFor(device, path)
  if (evidence === undefined || evidence === false) return { path }
  switch (evidence.kind) {
    case 'unknown':
    case 'unread':
      return { path, reason: evidence.reason }
    case 'cited-against':
      return { path, reason: evidence.reason, cite: evidence.cite }
    case 'partly':
      return { path, cite: evidence.cite, proven: evidence.proven, open: evidence.open }
    default:
      // A citation, which the audit does not report as a gap. Unreachable through `auditDevice`.
      return { path }
  }
}

/**
 * Most work behind the finding first, least last. Not alphabetical and not the audit's order:
 * `cited-against` is a document answering no and `unchecked` is a book nobody opened, and a
 * reader scanning this block should meet them in that order rather than in the order `c` sorts
 * before `u`.
 */
// `partly` sits after `cited-against` and before `undocumented`: both of those carry a page,
// and a partly-cited fact is nearer a citation than a silence (§2.6/#236).
const CAPABILITY_GAP_ORDER = ['cited-against', 'partly', 'undocumented', 'unread', 'unchecked'] as const

const GAP_KIND_OF: Record<string, CapabilityGap['kind']> = {
  'cited-against-capability': 'cited-against',
  'partly-capability': 'partly',
  'undocumented-capability': 'undocumented',
  'unread-capability': 'unread',
  'unchecked-capability': 'unchecked',
}

/**
 * The device is a parameter because the findings carry a path and nothing else, and #410 asks
 * for the reason and the page behind it — both of which live on the manifest.
 */
export function capabilityGaps(
  device: Device,
  findings: readonly AuditFinding[],
): CapabilityGap[] {
  const byKind = new Map<CapabilityGap['kind'], CapabilityFactDisclosure[]>()
  for (const finding of findings) {
    // The parameter findings share the array and carry no `fact`; they are the other coordinate
    // system (§2.6) and belong to the tables above, not here.
    if (!('fact' in finding)) continue
    const kind = GAP_KIND_OF[finding.kind]
    if (kind === undefined) continue
    const facts = byKind.get(kind) ?? []
    facts.push(factDisclosure(device, finding.fact))
    byKind.set(kind, facts)
  }
  return CAPABILITY_GAP_ORDER.flatMap((kind) => {
    const facts = byKind.get(kind)
    return facts === undefined ? [] : [{ kind, facts }]
  })
}

export function directionFit(device: Device, template: Template): DirectionFit {
  const cover = coverage(device, template)
  return {
    templateId: template.id,
    name: template.name,
    href: templateHref(template),
    requests: cover.requests,
    covered: cover.covered,
    essential: cover.essential,
    essentialCovered: cover.essentialCovered,
    roles: cover.roles,
  }
}

export function rolesCovered(device: Device): readonly RoleCover[] {
  const byRole = new Map<Role, { characters: Set<Character>; recipes: number }>()
  for (const recipe of device.recipes) {
    const entry = byRole.get(recipe.role) ?? { characters: new Set<Character>(), recipes: 0 }
    entry.characters.add(recipe.character)
    entry.recipes++
    byRole.set(recipe.role, entry)
  }
  // Vocabulary order, not authoring order: a page that reordered itself when a recipe was added
  // would make two builds of the same library look like two different devices.
  return ROLES.filter((role) => byRole.has(role)).map((role) => {
    const entry = byRole.get(role) as { characters: Set<Character>; recipes: number }
    return {
      role,
      characters: CHARACTERS.filter((c) => entry.characters.has(c)),
      recipes: entry.recipes,
    }
  })
}

export function voiceLines(device: Device): readonly VoiceLine[] {
  return device.voices.map((voice) => ({
    id: voice.id,
    label: voice.label,
    count: voice.kind === 'pool' ? voice.count : 1,
    polyphony: voice.polyphony,
    roles: voice.roles,
  }))
}

/**
 * §3.2's counts as a sentence, because a table of numbers is a footnote and this is the point of
 * the page. Every number is the audit's own, and none of them is rounded.
 *
 * The word is **provisional** and stays provisional. A point value with no citation is a setting
 * somebody chose and nobody checked, and every softer word for that — uncited, unverified,
 * authored — makes it sound like a filing omission rather than what a reader is being handed.
 * Ranges keep their own word, `unverified`, for the same reason: it is the claim the audit makes
 * about a range, and one column heading cannot be true of both.
 *
 * A box with no recipes says so. `0 of 0 values provisional` is arithmetically true and tells a
 * reader nothing about a mixer that is in the library for its clock and its audio (§2.4).
 */
export function provenanceSentence(device: Device, counts: AuditCounts): string {
  if (counts.params === 0) {
    return 'No patch recipes are authored for this box, so it has no values and no ranges to cite.'
  }

  const parts: string[] = []
  const points = [`${counts.provisionalPoints} of ${counts.params} values provisional`]
  if (counts.manualPoints > 0) points.push(`${counts.manualPoints} cited to a manual page`)
  if (counts.observedPoints > 0) points.push(`${counts.observedPoints} observed on the unit`)
  parts.push(`${points.join(', ')}.`)

  if (counts.numerics === 0) return parts.join(' ')

  const ranges: string[] = []
  if (counts.manualRanges > 0) {
    const documents = rangeDocuments(device).map((document) => `the ${document}`)
    ranges.push(
      `${counts.manualRanges} of ${counts.numerics} ranges cited to ${andList(documents)}`,
    )
  }
  if (counts.observedRanges > 0) {
    const lead = ranges.length === 0 ? `of ${counts.numerics} ranges ` : ''
    ranges.push(`${counts.observedRanges} ${lead}observed on the unit`)
  }
  if (counts.unverifiedRanges > 0) ranges.push(`${counts.unverifiedRanges} unverified`)
  if (ranges.length === 0) {
    parts.push(`None of the ${counts.numerics} ranges carries a citation.`)
  } else {
    parts.push(`${ranges.join(', ')}.`)
  }

  return parts.join(' ')
}

/**
 * §2.6/#22. **What this box claims about its own capability facts**, as a sentence.
 *
 * `clock`, `io`, `voices` and `features` are read off a manual exactly as a range is, and until
 * #22 there was nowhere to say so — the TR-1000's nine page references lived in comments, which
 * this page could not read and the audit could not count.
 *
 * Every state gets words, and none of them borrows another's. **Cited** is the claim.
 * **Unchecked** is `false`: authored, nothing checked against, work waiting. **Undocumented** is
 * the finding — somebody went to the manual and it does not state the fact — and it is stated as
 * an achievement rather than a debt, because that is what it is. Rolling it into "unchecked"
 * would report finished research as a backlog and quietly invite somebody to do it again.
 * **Unread** is the missing file and **cited-against** is the document answering no, both from
 * #120.
 *
 * **The two #120 states used to be counted and not spoken**, which made the arithmetic here
 * silently wrong: `capabilityFacts` includes them, so a box with three `unread` facts reported
 * "0 of 5 cited" and accounted for two of the five. A sentence whose numbers do not add up is a
 * worse report than a missing sentence, and it is the same class of error #121 is about — the
 * count reaching a reader as though it were the whole finding.
 *
 * A box that has cited nothing says so plainly instead of scoring zero out of nothing. Silence is
 * not a debt here: invariant 4 is scoped to parameter values, and no manifest was ever asked to
 * cite `io.usbAudio`.
 *
 * §2.6/#121: **which** facts these numbers are about is `DevicePage.capabilityGaps`, beneath. A
 * count is not a location, and this sentence has never been able to be one.
 */
export function capabilitySentence(counts: AuditCounts): string {
  if (counts.capabilityFacts === 0) {
    return 'No capability facts on this box carry a citation yet — its clock, audio and voice claims are the manifest\u2019s own.'
  }

  const parts: string[] = []
  const cited = counts.manualCapabilities + counts.observedCapabilities
  parts.push(
    `${cited} of ${plural(counts.capabilityFacts, 'capability fact')} cited to a document`,
  )
  if (counts.observedCapabilities > 0) {
    parts.push(`${counts.observedCapabilities} of those observed on the unit`)
  }
  if (counts.partlyCapabilities > 0) {
    parts.push(`${counts.partlyCapabilities} partly cited`)
  }
  if (counts.citedAgainstCapabilities > 0) {
    parts.push(`${counts.citedAgainstCapabilities} cited against`)
  }
  if (counts.unreadCapabilities > 0) {
    parts.push(`${counts.unreadCapabilities} on a document nobody here can open`)
  }
  if (counts.uncheckedCapabilities > 0) {
    parts.push(`${counts.uncheckedCapabilities} unchecked`)
  }
  const lead = `${parts.join(', ')}.`
  if (counts.undocumentedCapabilities === 0) return lead
  return (
    `${lead} ${plural(counts.undocumentedCapabilities, 'fact')} ` +
    `${counts.undocumentedCapabilities === 1 ? 'was' : 'were'} looked for and the manual does not state ` +
    `${counts.undocumentedCapabilities === 1 ? 'it' : 'them'}.`
  )
}

/** `Roland TR-1000 — Patchscore`. The maker is in it: people search for the box by both. */
/**
 * §10/#291. Where the device page sends a reader who wants the maker's own words.
 *
 * Two states, and the second is a state rather than nothing rendered. A missing link is a gap in
 * the library — invariant 5 — and the reader looking at that row is usually the one person who
 * owns the box and could close it, so the page asks them instead of quietly printing one row
 * fewer and looking complete.
 *
 * The decision lives here rather than in the JSX so both halves are testable; every device in the
 * library currently declares the field, which would otherwise make the empty state unreachable
 * code that nobody notices has rotted.
 */
export type MakerLink = { kind: 'link'; href: string; host: string } | { kind: 'missing' }

/**
 * The host, without the `www.` nobody reads — `moogmusic.com`, `teenage.engineering`.
 *
 * The link is labelled with its destination rather than "Product page", so somebody can see they
 * are being sent to the maker and not to a shop before they tap it. `URL` throws on a malformed
 * string; the schema has already refused one, and a throw at build time is the right failure.
 */
export function makerLink(device: Device): MakerLink {
  if (device.productPage === undefined) return { kind: 'missing' }
  const host = new URL(device.productPage).host
  return {
    kind: 'link',
    href: device.productPage,
    host: host.startsWith('www.') ? host.slice(4) : host,
  }
}

export function deviceTitle(device: Device): string {
  return `${deviceLabel(device)} — Patchscore`
}

/**
 * The one sentence a search result shows. Counts, because the counts are what the page holds and
 * they are true of this build rather than a claim about it.
 *
 * A box with no recipes gets a different sentence. `0 recipes across 0 roles, 0 of 0 ranges
 * cited` is arithmetically true and tells a reader nothing, and a mixer-recorder is in the
 * library for its clock and its audio (§2.4) rather than for patches nobody has authored.
 */
export function deviceDescription(device: Device, page: Omit<DevicePage, 'description'>): string {
  const kind = device.kind.replace(/-/g, ' ')
  const lead = `${deviceLabel(device)} ${kind}`
  if (device.recipes.length === 0) {
    return `${lead}: no patch recipes authored. The clock, audio and panel facts Patchscore holds for this box.`
  }
  const cited = page.provenance.manualRanges + page.provenance.observedRanges
  return (
    `${lead}: ${plural(device.recipes.length, 'authored patch recipe')} across ` +
    `${plural(page.roles.length, 'role')}, ${plural(page.assignables, 'assignable voice')}, and ` +
    `${cited} of ${page.provenance.numerics} parameter ranges cited.`
  )
}

// ---------------------------------------------------------------------------
// §3.2/#410 — where one parameter's value, bounds and options were read off
// ---------------------------------------------------------------------------

/**
 * §3.2/#410. **One authored parameter, on one recipe, with its citations already inherited.**
 *
 * The three claims are kept apart because they are three claims, exactly as §3.1 keeps them
 * apart in the manifest: the *point* decides authority, the *range* and the *option set* decide
 * legality, and a cited range does not verify the number inside it. Each is absent when nothing
 * is in force — and the word for that absence is deliberately not stored, because a point with
 * no citation is `provisional` and a range with no citation is `unverified`, and one field
 * cannot carry both words honestly (§3.2). A renderer says which it is.
 *
 * **Inheritance is applied here and not left to the reader.** `effectiveVerified` is the same
 * function the audit and the resolver use, so a value the audit counts as cited cannot appear
 * uncited on this page — one rule, three readers (§3.1).
 *
 * **The point *value* is not carried, and that is a decision rather than an omission.** Mood
 * moves it (§6.1), so the authored number is often not the number on the guide line a reader
 * arrived from, and printing it here would look like the page disagreeing with the guide. What
 * survives mood is the range, which is also the thing #410 says a reader is usually asking
 * about. The recipe is what tells two lines of the same name apart, so the recipe is what
 * identifies an occurrence.
 */
export type ParamOccurrence = {
  recipeId: string
  /** The recipe's own title, role and character: how a reader recognises which line is theirs. */
  title: string
  role: Role
  character: Character
  kind: AuthoredParam['kind']
  /** Numerics only. Carried because `0…255` is half of what a reader is matching against. */
  unit?: string
  /** The citation in force for the point value. Absent → provisional. */
  point?: Cite
  /** Numerics only: the bounds and the citation in force for them. No cite → unverified. */
  range?: { min: number; max: number; cite?: Cite }
  /** Enums only: the option set and the citation in force for it. No cite → unverified. */
  options?: { values: readonly string[]; cite?: Cite }
  /**
   * §3.2/#511. **Modulations only: the ends, each as its own claim.**
   *
   * Invariant 4 says this page answers the per-value question and carries the citation in force
   * *on each claim separately*, because a cited range does not verify the point inside it. A
   * routing makes more claims than a knob — where the signal comes from, where it lands, which
   * options the box offers at each end — and folding them into the depth's two would be the same
   * collapse §3.2 already refused when an enum's option set was hidden behind its param's
   * citation. `range` above is the depth's, unchanged; these are the rest.
   */
  routing?: readonly ModulationClaimRow[]
}

/** One end of a routing, as the device page renders a claim: a label, a value, two citations. */
export type ModulationClaimRow = {
  part: 'source' | 'destination' | 'polarity'
  /** The control's name where the reader sets one, and the stated end's name where they do not. */
  label: string
  /** The selection, where the end is a control. A stated end *is* its label and has no value. */
  value?: string
  /** The citation in force on this end. Absent → provisional, exactly as a point's is. */
  cite?: Cite
  /** A control end's option set and the citation in force for it (§3.2). */
  options?: { values: readonly string[]; cite?: Cite }
}

/**
 * One parameter *name* and every recipe that authors it.
 *
 * **One occurrence per recipe, never one per name.** The TR-1000 authors `DECAY` on twenty-two
 * recipes across five pages of its reference manual; de-duplicating by name would pick one of
 * those five and silently discard the other four, which is the failure #410 exists to end rather
 * than a tidier version of it. Identical citations repeat, and that is the honest shape: it says
 * the same page backs all of them.
 */
export type ParamProvenanceEntry = {
  /** The authored name, unabbreviated — this is the string a reader arrives with. */
  name: string
  occurrences: readonly ParamOccurrence[]
}

/**
 * §3.1/§8/#410. **A group of parameters a reader can skim**, keyed by the panel module the
 * manifest names, or by the role of the recipe when it names none.
 *
 * Boxes here reach 1,328 authored parameters, so a flat list is a list nobody reads (#385 is the
 * sibling problem on the guide side, and reached the same answer: cut by module). Two thirds of
 * the library declares no module at all, though, and for those a single undifferentiated heap is
 * the same failure with a bigger font.
 *
 * **The fallback is the recipe's role, and there is no `Other` bucket.** A role is what the
 * parameter is *for* — it is one of the four shared vocabularies, every recipe has exactly one,
 * and this page already prints its role coverage in the same terms above. "Other" names nothing;
 * it is a heading that tells a reader only that the library had nowhere to put something, which
 * is invariant 5's honesty read backwards — a real fact reported as a gap.
 *
 * A discriminated union rather than one `label`, so a renderer cannot print a role where it
 * meant a module: the two are different kinds of claim, and a module is free prose in the
 * device's own words while a role is vocabulary.
 */
export type ParamProvenanceGroup =
  | { kind: 'module'; module: string; params: readonly ParamProvenanceEntry[] }
  | { kind: 'role'; role: Role; params: readonly ParamProvenanceEntry[] }

function occurrenceOf(recipe: Recipe, param: AuthoredParam): ParamOccurrence {
  const point = cited(effectiveVerified(param.verified, recipe.verified))
  const base: ParamOccurrence = {
    recipeId: recipe.id,
    title: recipe.title,
    role: recipe.role,
    character: recipe.character,
    kind: param.kind,
    ...(point === undefined ? {} : { point }),
  }
  if (param.kind === 'numeric') {
    const cite = cited(effectiveVerified(param.range.verified, recipe.verified))
    return {
      ...base,
      ...(param.unit === undefined ? {} : { unit: param.unit }),
      range: {
        min: param.range.min,
        max: param.range.max,
        ...(cite === undefined ? {} : { cite }),
      },
    }
  }
  if (param.kind === 'enum') {
    const cite = cited(effectiveVerified(param.options.verified, recipe.verified))
    return {
      ...base,
      options: { values: param.options.values, ...(cite === undefined ? {} : { cite }) },
    }
  }
  if (param.kind === 'modulation') {
    const cite = cited(effectiveVerified(param.range.verified, recipe.verified))
    const row = (part: ModulationClaimRow['part'], end: ModulationEnd | ModulationControl): ModulationClaimRow => {
      const own = cited(effectiveVerified(end.verified, recipe.verified))
      if ('kind' in end && end.kind === 'stated') {
        return { part, label: end.name, ...(own === undefined ? {} : { cite: own }) }
      }
      const control = end as ModulationControl
      const optionCite = cited(effectiveVerified(control.options.verified, recipe.verified))
      return {
        part,
        label: control.control,
        value: control.value,
        ...(own === undefined ? {} : { cite: own }),
        options: {
          values: control.options.values,
          ...(optionCite === undefined ? {} : { cite: optionCite }),
        },
      }
    }
    return {
      ...base,
      ...(param.unit === undefined ? {} : { unit: param.unit }),
      range: {
        min: param.range.min,
        max: param.range.max,
        ...(cite === undefined ? {} : { cite }),
      },
      routing: [
        row('source', param.source),
        row('destination', param.destination),
        ...(param.polarity === undefined ? [] : [row('polarity', param.polarity)]),
      ],
    }
  }
  return base
}

/**
 * The citation in force, or nothing. `false` and an omission that inherited nothing are the same
 * state here and are deliberately indistinguishable, exactly as they are in the audit
 * (`isCited`): both mean nobody checked.
 */
function cited(verified: Verified | undefined): Cite | undefined {
  return verified === undefined || verified === false ? undefined : verified
}

/**
 * §3.2/#410. Every authored parameter on the box, grouped and ordered so two builds of the same
 * library produce the same page.
 *
 * **Ordering, and none of it is authoring order.** Modules sort by code unit and roles by the
 * `ROLES` vocabulary, which is the order `rolesCovered` already prints on this same page —
 * a page that ordered its roles two ways would read as two pages. Names sort by code unit, and
 * occurrences by recipe id, which is unique within a manifest and therefore a total order. No
 * `localeCompare` anywhere: ICU collation varies by platform, and a page that reordered itself
 * on CI is invariant 6 broken with no error to show for it.
 *
 * Module groups come before role groups rather than interleaving by label, because the two are
 * answers to different questions — *where on the panel* and *what for* — and a reader working
 * down a panel should not have `kick` land between `FILTER` and `MIXER`.
 */
export function paramProvenance(device: Device): readonly ParamProvenanceGroup[] {
  const modules = new Map<string, Map<string, ParamOccurrence[]>>()
  const roles = new Map<Role, Map<string, ParamOccurrence[]>>()

  for (const recipe of device.recipes) {
    for (const param of recipe.params) {
      // The manifest's own answer to which group this belongs in: the panel block if the author
      // named one, and otherwise what the recipe is for. Never a third, empty answer.
      const into =
        param.module === undefined
          ? (roles.get(recipe.role) ?? new Map<string, ParamOccurrence[]>())
          : (modules.get(param.module) ?? new Map<string, ParamOccurrence[]>())
      if (param.module === undefined) roles.set(recipe.role, into)
      else modules.set(param.module, into)
      const occurrences = into.get(param.name) ?? []
      occurrences.push(occurrenceOf(recipe, param))
      into.set(param.name, occurrences)
    }
  }

  const entries = (byName: Map<string, ParamOccurrence[]>): ParamProvenanceEntry[] =>
    [...byName.keys()].sort(compareCodeUnits).map((name) => ({
      name,
      occurrences: (byName.get(name) as ParamOccurrence[])
        .slice()
        .sort((a, b) => compareCodeUnits(a.recipeId, b.recipeId)),
    }))

  return [
    ...[...modules.keys()].sort(compareCodeUnits).map(
      (module): ParamProvenanceGroup => ({
        kind: 'module',
        module,
        params: entries(modules.get(module) as Map<string, ParamOccurrence[]>),
      }),
    ),
    ...ROLES.filter((role) => roles.has(role)).map(
      (role): ParamProvenanceGroup => ({
        kind: 'role',
        role,
        params: entries(roles.get(role) as Map<string, ParamOccurrence[]>),
      }),
    ),
  ]
}

/**
 * §1/#478. **The order somebody builds a kit in**, which is not `ROLES` order and is not meant
 * to be.
 *
 * `ROLES` is filed by register — low, backbeat, metal, body, tonal, transitional — because that is
 * how a *direction* reaches for a part. Somebody standing at a box with a recorder is doing
 * something else: laying down the skins first, then the metal over them, then whatever fills the
 * gaps. So `tom` comes up beside the other struck heads instead of sitting under `body`, and
 * `ghost-perc` drops past the metal to sit with the fills, where it is actually reached for.
 *
 * The twelve are the drum-role subset of `ROLES` and nothing more. `sub`, `bass-mid`, `texture`
 * and the seven tonal roles are parts a kit plays *under*, not sounds a kit is made of, and
 * `riser`/`sweep` are §4.2 transitions that last bars rather than one shot. `impact` is the
 * transitional role that survives, because a one-shot is exactly what it already is.
 *
 * A local list rather than a fifth vocabulary in `lib/core` (invariant 3): nothing here crosses
 * the template/device boundary, no template or device may now say a word it could not before, and
 * the ordering is one page's answer to how a reader works rather than a claim the engine makes.
 */
export const KIT_ROLES: readonly Role[] = [
  // skins
  'kick', 'snare', 'clap', 'rim', 'tom',
  // metal
  'closed-hat', 'open-hat', 'ride', 'metallic',
  // the fills between them
  'ghost-perc', 'noise', 'impact',
]

/**
 * #478. How many kit sounds a box has to author before the page offers them as a kit.
 *
 * **Four, and the threshold is the feature rather than a guard against an empty list.** The claim
 * being made is *this box can make you a drum kit*, and a page that made it over one sound would
 * be making it falsely — the three boxes that fall below the line today author two `noise`
 * recipes, two `kick` recipes and one `metallic` respectively, which is one voice at a couple of
 * characters and not a kit anybody could play. Below four, the recipes are still on the page in
 * every other section; what is withheld is the claim, not the content.
 */
export const KIT_MINIMUM = 4

/**
 * §3.2/#478. **The drum sounds this box makes from scratch**, in the order somebody would sample
 * them. Empty when it does not make enough of them to call a kit.
 *
 * **A selection, not new machinery.** Every recipe returned is already rendered elsewhere on this
 * page and in guides; the whole of this function is *which* recipes and *in what order*.
 *
 * **`sourceAudio` is the line between making a sound and finding one** (§3/#101, narrowed to
 * files alone at #516 — a recipe declaring `soundSetup` makes its sound and belongs on this side).
 * A recipe that declares `sourceAudio` is telling the reader to go and load audio the box does not
 * generate, which is the opposite of the question this section answers — and it is what separates the twenty-four boxes
 * here from the samplers, which author plenty of drum-role recipes and not one kit sound. The
 * three MPCs are the case that shows why the test is per recipe rather than per device: they
 * author both, and eight of their thirteen drum-role recipes are patches for their own synth
 * engines.
 *
 * **Manifest order within a role, so duplicates stay distinct.** The Cascadia authors two kicks,
 * two `metallic` and two `noise` recipes — different patches for different sounds — and any
 * de-duplication by role would pick one of each and drop a third of the kit. `paramProvenance`
 * refuses the same collapse by name for the same reason.
 */
export function kitRecipes(device: Device): readonly Recipe[] {
  const qualifying = device.recipes.filter(
    (recipe) => recipe.sourceAudio === undefined && KIT_ROLES.includes(recipe.role),
  )
  if (qualifying.length < KIT_MINIMUM) return []
  // Built by walking the order rather than sorted into it: a filter per role preserves manifest
  // order within that role by construction, where a comparator would be relying on the sort
  // being stable.
  return KIT_ROLES.flatMap((role) => qualifying.filter((recipe) => recipe.role === role))
}

export function devicePage(device: Device): DevicePage {
  const assignables = expand(device).length
  // One audit, two readings of it: the counts for the sentence, the facts for the block under it.
  const audit = auditDevice(device)
  const partial: Omit<DevicePage, 'description'> = {
    device,
    href: deviceHref(device),
    title: deviceTitle(device),
    assignables,
    voices: voiceLines(device),
    roles: rolesCovered(device),
    characters: CHARACTERS.filter((c) => device.recipes.some((r) => r.character === c)),
    provenance: audit.counts,
    capabilityGaps: capabilityGaps(device, audit.findings),
    paramProvenance: paramProvenance(device),
    kit: kitRecipes(device),
    // Template order, which is the authored order of `lib/templates`.
    directions: assignables === 0 ? [] : TEMPLATES.map((t) => directionFit(device, t)),
  }
  return { ...partial, description: deviceDescription(device, partial) }
}
