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
import { auditDevice, libraryCounts, totalCounts } from '../lib/studio/provenance'
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
 * Four lines per device, five once a manifest has capability entries: the point claim and the
 * range claim are about different things and a single line long enough to hold both is a line
 * nobody reads, #29's unit count is not a claim about verification at all, and §2.6's capability
 * counts are a different kind of claim about a different kind of thing.
 *
 * **The capability counts print only when there is something to print.** Their total is the
 * number of facts a manifest has *spoken about*, not the number it could speak about (see
 * `AuditCounts`), so a device with no entries has no lines rather than rows of zeros — and a row
 * of zeros in a debt table reads as a debt, which is exactly what a manifest that was never asked
 * to cite its capabilities does not have.
 *
 * **`caps` and `gaps` are the same total split by one question: is there a document behind this
 * entry?** (#120.) `caps` holds the three states that can point at one, `cited-against` included,
 * because a page that answers *no* is still a page somebody read. `gaps` holds the three that
 * cannot, and they are three rather than one because they cost different things — `unchecked` is
 * an afternoon nobody has spent, `undocumented` is finished research, and `unread` is blocked on
 * a file that is not in `manuals/` at all. One line for all six was tried first and ran to 120
 * columns, which is a line nobody reads either.
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
        `${n(c.observedCapabilities)} observed  ${n(c.citedAgainstCapabilities)} cited-against  ` +
        // §2.6/#236. On the `caps` line rather than `gaps`: it points at a page, which is what
        // this line is for, and calling a two-thirds-cited fact a gap is the understatement the
        // state was added to stop.
        `${n(c.partlyCapabilities)} partly`,
      `    gaps   ${n(c.uncheckedCapabilities)} unchecked  ` +
        `${n(c.undocumentedCapabilities)} undocumented  ${n(c.unreadCapabilities)} unread`,
    )
  }
  return lines
}

/** Two coordinate systems, one line each. A capability fact has no recipe and says so (§2.6). */
export function findingLine(f: AuditFinding): string {
  return 'fact' in f ? `${f.kind}: ${f.fact}` : `${f.kind}: ${f.recipeId} / ${f.paramName}`
}

export function formatAudit(
  audits: DeviceAudit[],
  verbose: boolean,
  /**
   * §9/#193. The library totals, de-duplicated by recipe identity. Passed in rather than derived
   * from `audits`, because a summed audit cannot tell a shared object from a copied one — that is
   * exactly the fact it has already lost.
   */
  total?: AuditCounts,
): string {
  const ordered = [...audits].sort((a, b) => compareCodeUnits(a.deviceId, b.deviceId))
  const lines: string[] = ['verified audit (DESIGN.md §3.2, §9)', '']

  if (ordered.length === 0) lines.push('  no device manifests found')
  for (const a of ordered) {
    lines.push(...countsBlock(a.deviceId, a.counts), '')
    if (!verbose) continue
    for (const f of a.findings) lines.push(`      ${findingLine(f)}`)
    lines.push('')
  }

  lines.push(...countsBlock('TOTAL', total ?? totalCounts(ordered)), '')
  return lines.join('\n')
}

async function main(argv: string[]): Promise<number> {
  const verbose = argv.includes('--verbose')
  const rootFlag = argv.indexOf('--root')
  const devicesRoot = rootFlag === -1 ? DEFAULT_DEVICES_ROOT : (argv[rootFlag + 1] ?? '')

  let audits: DeviceAudit[]
  let total: AuditCounts | undefined
  try {
    const loaded = await loadDevices(devicesRoot)
    audits = loaded.map((l) => auditDevice(l.device))
    // #193. The TOTAL is a second pass, sharing one `Set` so a recipe held by two manifests is
    // counted once. The per-device blocks above stay whole.
    total = libraryCounts(loaded.map((l) => l.device))
  } catch (err) {
    if (err instanceof RegistryError) {
      process.stderr.write(`audit: ${relative(process.cwd(), devicesRoot)} does not validate\n`)
      for (const p of err.problems) process.stderr.write(`${formatProblem(p)}\n`)
    } else {
      process.stderr.write(`audit: ${err instanceof Error ? err.message : String(err)}\n`)
    }
    return 1
  }

  process.stdout.write(`${formatAudit(audits, verbose, total)}\n`)
  // A report, not a gate: provisional values are legal and shown honestly (invariant 5).
  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) process.exit(await main(process.argv.slice(2)))
