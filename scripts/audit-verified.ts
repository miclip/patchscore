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
 */

import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AuthoredParam, Device, Recipe, Verified } from '../lib/core/index'
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

/** Only a citation counts. `false` is "authored, nothing checked against" — still unverified. */
export function isCited(v: Verified | undefined): boolean {
  return v !== undefined && v !== false
}

export type AuditKind = 'provisional-point' | 'unverified-range' | 'mood-inert'

export type AuditFinding = {
  deviceId: string
  recipeId: string
  paramName: string
  kind: AuditKind
}

export type AuditCounts = {
  params: number
  provisionalPoints: number
  unverifiedRanges: number
  moodInert: number
}

export type DeviceAudit = { deviceId: string; counts: AuditCounts; findings: AuditFinding[] }

function auditRecipe(deviceId: string, recipe: Recipe, into: DeviceAudit): void {
  for (const param of recipe.params as AuthoredParam[]) {
    into.counts.params++

    const point = effectiveVerified(param.verified, recipe.verified)
    if (!isCited(point)) {
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

    const range = effectiveVerified(param.range.verified, recipe.verified)
    if (isCited(range)) continue

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
  const audit: DeviceAudit = {
    deviceId: device.id,
    counts: { params: 0, provisionalPoints: 0, unverifiedRanges: 0, moodInert: 0 },
    findings: [],
  }
  for (const recipe of device.recipes) auditRecipe(device.id, recipe, audit)
  return audit
}

export function totalCounts(audits: DeviceAudit[]): AuditCounts {
  return audits.reduce<AuditCounts>(
    (acc, a) => ({
      params: acc.params + a.counts.params,
      provisionalPoints: acc.provisionalPoints + a.counts.provisionalPoints,
      unverifiedRanges: acc.unverifiedRanges + a.counts.unverifiedRanges,
      moodInert: acc.moodInert + a.counts.moodInert,
    }),
    { params: 0, provisionalPoints: 0, unverifiedRanges: 0, moodInert: 0 },
  )
}

function countsLine(label: string, c: AuditCounts): string {
  return (
    `${label.padEnd(24)} ${String(c.params).padStart(5)} params  ` +
    `${String(c.provisionalPoints).padStart(5)} provisional points  ` +
    `${String(c.unverifiedRanges).padStart(5)} unverified ranges  ` +
    `${String(c.moodInert).padStart(5)} mood-inert`
  )
}

export function formatAudit(audits: DeviceAudit[], verbose: boolean): string {
  const ordered = [...audits].sort((a, b) => compareCodeUnits(a.deviceId, b.deviceId))
  const lines: string[] = ['verified audit (DESIGN.md §3.2, §9)', '']

  if (ordered.length === 0) lines.push('  no device manifests found')
  for (const a of ordered) {
    lines.push(`  ${countsLine(a.deviceId, a.counts)}`)
    if (!verbose) continue
    for (const f of a.findings) lines.push(`      ${f.kind}: ${f.recipeId} / ${f.paramName}`)
  }

  lines.push('', `  ${countsLine('TOTAL', totalCounts(ordered))}`, '')
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
