import type { Character, Device, Role, Template } from '@/lib/core'
import { CHARACTERS, NEUTRAL_MOOD, ROLES, expand, resolve } from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'
import { deviceHref, deviceLabel } from './catalogue'
import { auditDevice } from './provenance'
import type { AuditCounts } from './provenance'

/**
 * #84. Everything a device page states, computed from the manifest and the resolver.
 *
 * Pure, and separate from the page so the claims can be tested without a renderer. Every number
 * below is derived: nothing on a device page is authored a second time, because a fact restated
 * by hand is a fact that goes stale the day the manifest changes.
 */

function plural(n: number, one: string): string {
  return `${n} ${n === 1 ? one : `${one}s`}`
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
  const { canSendClock, canReceiveClock, transport } = device.clock
  const claim = canSendClock
    ? canReceiveClock
      ? 'sends clock'
      : 'sends clock, cannot receive'
    : canReceiveClock
      ? 'receives clock only'
      : 'no clock in or out'
  if (!canSendClock && !canReceiveClock) return claim
  return `${claim} · ${transport.join('/')}`
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
  required: number
  requiredCovered: number
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
   * Every direction, in template order, with what this box alone covers of it. Empty for a box
   * with no assignables: three rows of "0 of 12" say the same thing three times, and the page
   * says it once in prose instead.
   */
  directions: readonly DirectionFit[]
}

/**
 * The seed is fixed and the mood is neutral, because coverage is a property of the box and the
 * direction rather than of a roll. Seed permutes only among exactly equal costs (invariant 6),
 * so this is the same answer on every machine and in every build.
 */
const COVERAGE_SEED = 1

export function directionFit(device: Device, template: Template): DirectionFit {
  const result = resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed: COVERAGE_SEED })
  const required = template.roles.filter((r) => r.optional !== true)
  const covered = new Set(result.assignments.map((a) => a.requestId))
  return {
    templateId: template.id,
    name: template.name,
    href: `/directions/${template.id}`,
    requests: template.roles.length,
    covered: result.assignments.length,
    required: required.length,
    requiredCovered: required.filter((r) => covered.has(r.id)).length,
    roles: template.roles.filter((r) => covered.has(r.id)).map((r) => r.role),
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

/** `Roland TR-1000 — Patchscore`. The maker is in it: people search for the box by both. */
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
  const partial: Omit<DevicePage, 'description'> = {
    device,
    href: deviceHref(device),
    title: deviceTitle(device),
    assignables,
    voices: voiceLines(device),
    roles: rolesCovered(device),
    characters: CHARACTERS.filter((c) => device.recipes.some((r) => r.character === c)),
    provenance: auditDevice(device).counts,
    // Template order, which is the authored order of `lib/templates`.
    directions: assignables === 0 ? [] : TEMPLATES.map((t) => directionFit(device, t)),
  }
  return { ...partial, description: deviceDescription(device, partial) }
}
