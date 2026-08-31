import type { Character, Device, Role, Template } from '@/lib/core'
import { CHARACTERS, ROLES, clockWires, expand } from '@/lib/core'
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
function andList(items: readonly string[]): string {
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
 * The *reasons* stay on the facts and are not printed here. Each one is a paragraph (the
 * Deluge's runs to four clauses across three page references), and four of them stacked is #35's
 * failure moved to a new page. The reason reaches a reader in the guide, once, where the fact is
 * being acted on.
 */
export type CapabilityGap = {
  kind: 'cited-against' | 'partly' | 'undocumented' | 'unread' | 'unchecked'
  /** Code unit order (§7.2), inherited from the audit — never manifest key order. */
  facts: readonly string[]
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

export function capabilityGaps(findings: readonly AuditFinding[]): CapabilityGap[] {
  const byKind = new Map<CapabilityGap['kind'], string[]>()
  for (const finding of findings) {
    // The parameter findings share the array and carry no `fact`; they are the other coordinate
    // system (§2.6) and belong to the tables above, not here.
    if (!('fact' in finding)) continue
    const kind = GAP_KIND_OF[finding.kind]
    if (kind === undefined) continue
    const facts = byKind.get(kind) ?? []
    facts.push(finding.fact)
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
    capabilityGaps: capabilityGaps(audit.findings),
    // Template order, which is the authored order of `lib/templates`.
    directions: assignables === 0 ? [] : TEMPLATES.map((t) => directionFit(device, t)),
  }
  return { ...partial, description: deviceDescription(device, partial) }
}
