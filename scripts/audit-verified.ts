/**
 * §9's third guard: the `verified` audit, as a command-line report.
 *
 * The counting moved to `lib/studio/provenance.ts` when a device page started printing the same
 * numbers (#84), and §3.1/#388's inert check to `lib/core/inert.ts` when the guide needed the
 * same answer; both are re-exported below so this module is still the one place the audit is
 * imported from. What stays here is the report: how the counts and the candidates are laid out
 * for a terminal, and the walk over the device folder that feeds them.
 *
 * The three counts are kept separate, and the split by `Cite.kind`, for the reasons that module
 * gives.
 */

import { relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AuditCounts, AuditFinding, DeviceAudit } from '../lib/studio/provenance'
import { auditDevice, libraryCounts, totalCounts } from '../lib/studio/provenance'
import type { Device, Template } from '../lib/core/index'
import { inertCoverage, inertFindings, unrequestedRecipes } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
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
export type { InertCoverage, InertFinding, InertKind } from '../lib/core/index'
export { inertCoverage, inertFindings }
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

/**
 * §3.5/#314. **Recipes no direction can ask for**, which is the one debt the rest of this audit
 * cannot see.
 *
 * Every other line here is about a *value*: cited, provisional, unread. This is about whether the
 * value is reachable at all. A recipe authored for a `(role, character)` that no template requests
 * is honest work on a page nobody will ever be sent to — green in the manifest, counted in the
 * totals, and dead.
 *
 * **It was invisible until now and it stayed invisible for months.** `unrequestedRecipes` has
 * existed since #81 and was used only by tests, so the number could only be found by writing a
 * script on purpose. Doing that in September 2026 turned up 28 unreachable `acid` recipes across
 * 20 devices (#283) and later 13 more, seven of them one character of `snare`. Both were closed by
 * writing a *direction*, not by touching a device — which is the finding this line exists to make
 * routine rather than archaeological.
 *
 * **The fix is almost never in the device folder.** §3.5 refuses a substitution between opposite
 * characters outright — `bright` and `dark` are distance 4 apart — so a direction asking for one
 * can never reach the other. A recipe appearing here means either a direction should ask for it,
 * or it should not have been authored. Both are decisions above a manifest.
 *
 * Listed rather than counted, because the list is the actionable part and a healthy library keeps
 * it short. If it ever runs past the cap below, the length is itself the report.
 */
function reachBlock(devices: readonly Device[], templates: readonly Template[]): string[] {
  const dead = devices.flatMap((device) => unrequestedRecipes(device, templates))
  const lines = [
    '  REACH',
    `    dead   ${n(dead.length)} recipes on ${n(new Set(dead.map((r) => r.deviceId)).size).trim()} ` +
      `devices — authored, and no direction asks for them`,
  ]
  const SHOWN = 12
  for (const ref of dead.slice(0, SHOWN)) {
    lines.push(`      ${ref.deviceId.padEnd(28)}${ref.role} ${ref.character}`)
  }
  if (dead.length > SHOWN) lines.push(`      … and ${String(dead.length - SHOWN)} more`)
  return lines
}

// ---------------------------------------------------------------------------
// §2.3/#480. EDITIONS — whether the document a manifest cites is still the one the maker
// publishes. Hand-recorded on `Device.manual.currentEditionConfirmedOn`; no fetching.
// ---------------------------------------------------------------------------

/** What the report counts, ids sorted by code unit so the list is stable on any platform. */
export type EditionCurrency = {
  /** Cites an edition, and carries a date somebody confirmed that edition current. */
  dated: { deviceId: string; on: string }[]
  /** Cites an edition nobody has checked against what the maker publishes now. */
  open: string[]
  /** Names a manual with no edition, so there is no cited edition to confirm. */
  absent: string[]
}

export function editionCurrency(devices: readonly Device[]): EditionCurrency {
  const dated: { deviceId: string; on: string }[] = []
  const open: string[] = []
  const absent: string[] = []
  for (const d of devices) {
    if (d.manual?.edition === undefined) absent.push(d.id)
    else if (d.manual.currentEditionConfirmedOn === undefined) open.push(d.id)
    else dated.push({ deviceId: d.id, on: d.manual.currentEditionConfirmedOn })
  }
  const byId = (a: string, b: string): number => compareCodeUnits(a, b)
  dated.sort((a, b) => byId(a.deviceId, b.deviceId))
  open.sort(byId)
  absent.sort(byId)
  return { dated, open, absent }
}

/**
 * §2.3/#480. **A citation can be correct and the document behind it superseded**, and until this
 * block nothing here could tell the two apart. The Cascadia cited v1.1 on all 175 of its
 * citations while Intellijel published v1.4; the Metropolix cited v1.6, which was current. Every
 * check in the repo read the two the same way.
 *
 * `dated` is the answer somebody recorded by hand, on a date. `open` is the manifests where the
 * question has not been asked. `absent` is the denominator's other half: a manual named with no
 * edition, so there is no cited edition to confirm and this block can say nothing about it.
 *
 * **Both lists print in full**, like the inert `gaps` list and for its reason. They are facts
 * about how much of the library has been checked, they shrink one manifest at a time, and a
 * reader asking whether their box was looked at is asking about the one name a cap would hide.
 * `absent` is named as well as counted because a manifest citing no edition is not a clean
 * result: nobody can confirm a printing it never wrote down.
 *
 * Nothing gates. An unchecked edition is a question nobody has asked, and the date it wants is a
 * person opening a downloads page.
 */
function editionBlock(devices: readonly Device[]): string[] {
  const { dated, open, absent } = editionCurrency(devices)
  const cited = dated.length + open.length
  const lines = [
    '  EDITIONS',
    `    dated  ${n(dated.length)} of ${String(cited)} cited editions carry a date somebody ` +
      `confirmed them current on`,
    `    open   ${n(open.length)} editions nobody has checked against what the maker publishes now`,
    ...idLines(open),
    `    absent ${n(absent.length)} ${absent.length === 1 ? 'manifest names' : 'manifests name'} ` +
      `a manual with no edition, so there is no cited edition to confirm`,
    ...idLines(absent),
  ]
  return lines
}

/** Device ids, three to a line, in the order they were given. Shared by both lists above. */
function idLines(ids: readonly string[]): string[] {
  const PER_LINE = 3
  const lines: string[] = []
  for (let i = 0; i < ids.length; i += PER_LINE) {
    lines.push(
      `      ${ids
        .slice(i, i + PER_LINE)
        .map((id) => id.padEnd(28))
        .join('')
        .trimEnd()}`,
    )
  }
  return lines
}

// ---------------------------------------------------------------------------
// §3.1/#388. INERT — a value authored where something else in the same recipe stops it doing
// anything. The finding is `lib/core/inert.ts`; what is here is the report.
// ---------------------------------------------------------------------------

/**
 * The report. Every line is a **candidate** for a human to judge — route it, drop it, or say why
 * the check cannot see the destination — and all three are decisions above a manifest, which is
 * why nothing here fails a build.
 *
 * Listed rather than counted, for `REACH`'s reason: the list is the actionable part. The cap is
 * higher than `REACH`'s because a healthy library raises *no* candidates at all, so the list is
 * the work queue rather than a sample of it.
 */
function inertBlock(devices: readonly Device[]): string[] {
  const found = inertFindings(devices)
  const devicesAffected = new Set(found.map((f) => f.deviceId)).size
  const lines = [
    '  INERT',
    `    blocks ${n(found.length)} candidates on ${n(devicesAffected).trim()} ` +
      `${devicesAffected === 1 ? 'device' : 'devices'} — authored, and nothing in the recipe ` +
      `appears to be listening`,
  ]
  const SHOWN = 20
  for (const f of found.slice(0, SHOWN)) {
    lines.push(
      `      ${f.deviceId.padEnd(20)}${f.recipeId.padEnd(22)}${f.block.padEnd(10)}` +
        `${String(f.params).padStart(2)} params — ${f.detail}`,
    )
  }
  if (found.length > SHOWN) lines.push(`      … and ${String(found.length - SHOWN)} more`)
  lines.push(...coverageLines(devices))
  return lines
}

/**
 * §3.1/#466. **The denominator the count above was taken against, in two lines.**
 *
 * The candidate count is a floor, and until #466 nothing said so. `INERT` printed *"2 candidates
 * on 1 device"* while the grouping had only ever read the thirteen manifests naming blocks with
 * ` · ` — every parameter on the other twenty-six was invisible to it rather than clean. A line
 * that reads as an all-clear over a library it has more than half not looked at is the failure the
 * check itself exists to catch, so this is invariant 5 turned on the instrument.
 *
 * **`reach` and `gaps` are the same total split by one question: could a group be formed here?**
 * They are named for the `caps`/`gaps` pair above and split on the same principle. `reach` is the
 * denominator — how many manifests the check actually read, and how many had nothing to read.
 * `gaps` is the debt: manifests with parameters authored under names no separator groups, whose
 * silence in `blocks` says nothing about them.
 *
 * **The gap list is printed in full rather than capped.** `blocks` shows twenty and counts the
 * rest, because that list is a work queue a healthy library keeps empty. This one is the opposite
 * shape: it is a fact about the library's *reach*, it shrinks only when the grouping widens, and a
 * reader asking "was my box looked at?" is asking about one name a `… and 5 more` would hide.
 *
 * **A device with no authored parameters is counted on `reach` and never named on `gaps`.** It has
 * nothing for a naming convention to hide, so calling seven capability-only manifests unreadable
 * would overstate the debt in the direction opposite the one this line exists to correct.
 */
function coverageLines(devices: readonly Device[]): string[] {
  const { examined, unexamined, noParams } = inertCoverage(devices)
  const lines = [
    `    reach  ${n(examined.length)} of ${String(devices.length)} devices examined — ` +
      `${String(noParams.length)} more author no parameters, so there is nothing to group`,
    `    gaps   ${n(unexamined.length)} unexamined — parameters authored, and no name this ` +
      `check can group`,
  ]
  const PER_LINE = 3
  for (let i = 0; i < unexamined.length; i += PER_LINE) {
    lines.push(
      `      ${unexamined
        .slice(i, i + PER_LINE)
        .map((id) => id.padEnd(28))
        .join('')
        .trimEnd()}`,
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
  lines.push(...reachBlock(DEVICES, TEMPLATES), '')
  lines.push(...editionBlock(DEVICES), '')
  lines.push(...inertBlock(DEVICES), '')
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
