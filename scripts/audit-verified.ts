/**
 * §9's third guard: the `verified` audit. §3.2 requires three counts kept *separate*, because
 * they are three different debts and one of them hides inside another if you total them:
 *
 *  - provisional points   — the point value has no citation, so it renders with the badge
 *  - unverified ranges    — the bounds have no citation, so mood must not move the value
 *  - mood-inert params    — a param that declares a `mood` entry *and* sits in an unverified
 *                           range: it advertises an axis that provably does nothing
 *
 * Mood-inert is a subset of unverified ranges on purpose. It is the expensive half of that
 * debt, and rolling it into the total is exactly how it stops being noticed.
 *
 * Cited points and ranges are then split by `Cite.kind` (§3.1). Neither kind is a debt — an
 * observation is often better evidence than a manual, being the actual instrument — but they
 * answer different questions, and "how much of this device rests on one person's ear" is only
 * answerable if the counts are kept apart. Each half is a total: every param is exactly one of
 * manual / observed / provisional on its point, and every numeric exactly one of the three on
 * its range.
 */

import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AuthoredParam, CiteKind, Device, Recipe, Verified } from '../lib/core/index'
import {
  DEFAULT_DEVICES_ROOT,
  RegistryError,
  compareCodeUnits,
  formatProblem,
  loadDevices,
} from './gen-registry'

/**
 * §3.1 inheritance: omitted means "inherit the recipe's", and an explicit `false` on the param
 * overrides an inherited citation — more specific wins in both directions, which is exactly
 * `??` and not `||`.
 */
export function effectiveVerified(
  own: Verified | undefined,
  inherited: Verified | undefined,
): Verified | undefined {
  return own ?? inherited
}

/**
 * How the claim was checked, or `undefined` for no claim at all. `false` is "authored, nothing
 * checked against" — still unverified, and deliberately indistinguishable here from an omission
 * that inherited nothing.
 */
export function citeKind(v: Verified | undefined): CiteKind | undefined {
  return v === undefined || v === false ? undefined : v.kind
}

/** Only a citation counts. `false` is "authored, nothing checked against" — still unverified. */
export function isCited(v: Verified | undefined): boolean {
  return citeKind(v) !== undefined
}

export type AuditKind = 'provisional-point' | 'unverified-range' | 'mood-inert'

export type AuditFinding = {
  deviceId: string
  recipeId: string
  paramName: string
  kind: AuditKind
}

/**
 * `params` = manualPoints + observedPoints + provisionalPoints, and
 * `numerics` = manualRanges + observedRanges + unverifiedRanges. Both identities hold by
 * construction; a count that stops adding up means a case was added without a home.
 */
export type AuditCounts = {
  params: number
  manualPoints: number
  observedPoints: number
  provisionalPoints: number
  /** Only numerics have a range, so the range counts are over these, not over `params`. */
  numerics: number
  manualRanges: number
  observedRanges: number
  unverifiedRanges: number
  moodInert: number
}

export const ZERO_COUNTS: AuditCounts = {
  params: 0,
  manualPoints: 0,
  observedPoints: 0,
  provisionalPoints: 0,
  numerics: 0,
  manualRanges: 0,
  observedRanges: 0,
  unverifiedRanges: 0,
  moodInert: 0,
}

export type DeviceAudit = { deviceId: string; counts: AuditCounts; findings: AuditFinding[] }

function auditRecipe(deviceId: string, recipe: Recipe, into: DeviceAudit): void {
  for (const param of recipe.params as AuthoredParam[]) {
    into.counts.params++

    const point = citeKind(effectiveVerified(param.verified, recipe.verified))
    if (point === 'manual') into.counts.manualPoints++
    else if (point === 'observed') into.counts.observedPoints++
    else {
      into.findings.push({
        deviceId,
        recipeId: recipe.id,
        paramName: param.name,
        kind: 'provisional-point',
      })
      into.counts.provisionalPoints++
    }

    // Ranges exist only on numerics; enum and text params have no legality gate to fail.
    if (param.kind !== 'numeric') continue
    into.counts.numerics++

    const range = citeKind(effectiveVerified(param.range.verified, recipe.verified))
    if (range === 'manual') {
      into.counts.manualRanges++
      continue
    }
    if (range === 'observed') {
      into.counts.observedRanges++
      continue
    }

    into.findings.push({
      deviceId,
      recipeId: recipe.id,
      paramName: param.name,
      kind: 'unverified-range',
    })
    into.counts.unverifiedRanges++

    if (param.mood !== undefined && param.mood.length > 0) {
      into.findings.push({
        deviceId,
        recipeId: recipe.id,
        paramName: param.name,
        kind: 'mood-inert',
      })
      into.counts.moodInert++
    }
  }
}

export function auditDevice(device: Device): DeviceAudit {
  const audit: DeviceAudit = { deviceId: device.id, counts: { ...ZERO_COUNTS }, findings: [] }
  for (const recipe of device.recipes) auditRecipe(device.id, recipe, audit)
  return audit
}

export function totalCounts(audits: DeviceAudit[]): AuditCounts {
  return audits.reduce<AuditCounts>(
    (acc, a) => ({
      params: acc.params + a.counts.params,
      manualPoints: acc.manualPoints + a.counts.manualPoints,
      observedPoints: acc.observedPoints + a.counts.observedPoints,
      provisionalPoints: acc.provisionalPoints + a.counts.provisionalPoints,
      numerics: acc.numerics + a.counts.numerics,
      manualRanges: acc.manualRanges + a.counts.manualRanges,
      observedRanges: acc.observedRanges + a.counts.observedRanges,
      unverifiedRanges: acc.unverifiedRanges + a.counts.unverifiedRanges,
      moodInert: acc.moodInert + a.counts.moodInert,
    }),
    { ...ZERO_COUNTS },
  )
}

const n = (v: number): string => String(v).padStart(5)

/**
 * Two lines per device, because the point claim and the range claim are about different things
 * and a single line long enough to hold both is a line nobody reads.
 */
export function countsBlock(label: string, c: AuditCounts): string[] {
  return [
    `  ${label}`,
    `    points ${n(c.params)} total  ${n(c.manualPoints)} manual  ` +
      `${n(c.observedPoints)} observed  ${n(c.provisionalPoints)} provisional`,
    `    ranges ${n(c.numerics)} total  ${n(c.manualRanges)} manual  ` +
      `${n(c.observedRanges)} observed  ${n(c.unverifiedRanges)} unverified  ` +
      `${n(c.moodInert)} mood-inert`,
  ]
}

export function formatAudit(audits: DeviceAudit[], verbose: boolean): string {
  const ordered = [...audits].sort((a, b) => compareCodeUnits(a.deviceId, b.deviceId))
  const lines: string[] = ['verified audit (DESIGN.md §3.2, §9)', '']

  if (ordered.length === 0) lines.push('  no device manifests found')
  for (const a of ordered) {
    lines.push(...countsBlock(a.deviceId, a.counts), '')
    if (!verbose) continue
    for (const f of a.findings) lines.push(`      ${f.kind}: ${f.recipeId} / ${f.paramName}`)
    lines.push('')
  }

  lines.push(...countsBlock('TOTAL', totalCounts(ordered)), '')
  return lines.join('\n')
}

async function main(argv: string[]): Promise<number> {
  const verbose = argv.includes('--verbose')
  const rootFlag = argv.indexOf('--root')
  const devicesRoot = rootFlag === -1 ? DEFAULT_DEVICES_ROOT : (argv[rootFlag + 1] ?? '')

  let audits: DeviceAudit[]
  try {
    audits = (await loadDevices(devicesRoot)).map((l) => auditDevice(l.device))
  } catch (err) {
    if (err instanceof RegistryError) {
      process.stderr.write(`audit: ${relative(process.cwd(), devicesRoot)} does not validate\n`)
      for (const p of err.problems) process.stderr.write(`${formatProblem(p)}\n`)
    } else {
      process.stderr.write(`audit: ${err instanceof Error ? err.message : String(err)}\n`)
    }
    return 1
  }

  process.stdout.write(`${formatAudit(audits, verbose)}\n`)
  // A report, not a gate: provisional values are legal and shown honestly (invariant 5).
  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) process.exit(await main(process.argv.slice(2)))
