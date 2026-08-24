/**
 * §9's third guard: the `verified` audit, as a command-line report.
 *
 * The counting moved to `lib/studio/provenance.ts` when a device page started printing the same
 * numbers (#84), and is re-exported below so this module is still the one place the audit is
 * imported from. What stays here is the report: how the counts are laid out for a terminal, and
 * the walk over the device folder that feeds them.
 *
 * The three counts are kept separate, and the split by `Cite.kind`, for the reasons that module
 * gives.
 */

import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AuditCounts, AuditFinding, DeviceAudit } from '../lib/studio/provenance'
import { auditDevice, totalCounts } from '../lib/studio/provenance'
import {
  DEFAULT_DEVICES_ROOT,
  RegistryError,
  compareCodeUnits,
  formatProblem,
  loadDevices,
} from './gen-registry'

/**
 * Re-exported so `scripts/audit-verified.ts` stays the audit's front door: the CLI, its tests and
 * anything else that grew up importing from here keep working, and there is still exactly one
 * implementation behind them.
 */
export type { AuditCounts, AuditFinding, AuditKind, DeviceAudit } from '../lib/studio/provenance'
export {
  ZERO_COUNTS,
  auditDevice,
  citeKind,
  effectiveVerified,
  evidenceKind,
  isCited,
  totalCounts,
} from '../lib/studio/provenance'

const n = (v: number): string => String(v).padStart(5)

/**
 * Four lines per device: the point claim and the range claim are about different things and a
 * single line long enough to hold both is a line nobody reads, #29's unit count is not a claim
 * about verification at all, and §2.6's capability line counts a different kind of claim about a
 * different kind of thing.
 *
 * **The capability line prints only when there is something to print.** Its total is the number
 * of facts a manifest has *spoken about*, not the number it could speak about (see `AuditCounts`),
 * so a device with no entries has no line rather than a row of zeros — and a row of zeros in a
 * debt table reads as a debt, which is exactly what a manifest that was never asked to cite its
 * capabilities does not have.
 */
export function countsBlock(label: string, c: AuditCounts): string[] {
  const lines = [
    `  ${label}`,
    `    points ${n(c.params)} total  ${n(c.manualPoints)} manual  ` +
      `${n(c.observedPoints)} observed  ${n(c.provisionalPoints)} provisional`,
    `    ranges ${n(c.numerics)} total  ${n(c.manualRanges)} manual  ` +
      `${n(c.observedRanges)} observed  ${n(c.unverifiedRanges)} unverified  ` +
      `${n(c.moodInert)} mood-inert`,
    // Its own line, and worded as an observation rather than as a column beside the debts —
    // a number in the debt table reads as a debt whatever the header says.
    `    units  ${n(c.unitlessNumerics)} of ${n(c.numerics).trim()} numerics carry no unit ` +
      `(watched, not a target)`,
  ]
  if (c.capabilityFacts > 0) {
    lines.push(
      `    caps   ${n(c.capabilityFacts)} total  ${n(c.manualCapabilities)} manual  ` +
        `${n(c.observedCapabilities)} observed  ${n(c.uncheckedCapabilities)} unchecked  ` +
        `${n(c.undocumentedCapabilities)} undocumented`,
    )
  }
  return lines
}

/** Two coordinate systems, one line each. A capability fact has no recipe and says so (§2.6). */
export function findingLine(f: AuditFinding): string {
  return 'fact' in f ? `${f.kind}: ${f.fact}` : `${f.kind}: ${f.recipeId} / ${f.paramName}`
}

export function formatAudit(audits: DeviceAudit[], verbose: boolean): string {
  const ordered = [...audits].sort((a, b) => compareCodeUnits(a.deviceId, b.deviceId))
  const lines: string[] = ['verified audit (DESIGN.md §3.2, §9)', '']

  if (ordered.length === 0) lines.push('  no device manifests found')
  for (const a of ordered) {
    lines.push(...countsBlock(a.deviceId, a.counts), '')
    if (!verbose) continue
    for (const f of a.findings) lines.push(`      ${findingLine(f)}`)
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
