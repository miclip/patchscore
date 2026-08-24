import type {
  AuthoredParam,
  CapabilityEvidence,
  CiteKind,
  Device,
  Recipe,
  Verified,
} from '../core/index'
import { citedDocument, effectiveVerified, rangeDocuments } from '../core/index'

/**
 * Re-exported, not redefined. These moved into `core` when the guide needed them: `lib/core`
 * cannot import from `lib/studio`, and a second copy here would let the guide and the audit
 * disagree about which document a value cites.
 */
export { citedDocument, effectiveVerified, rangeDocuments }

/**
 * §3.2's three debts, counted. One implementation, two readers (#84).
 *
 * `npm run audit` prints these at the command line and a device page prints them on the web,
 * and the two must agree: a page that counted provisional values its own way would be a second
 * opinion about how much of the library is cited. The counting lives here; `scripts/audit-verified.ts`
 * keeps the report formatting and re-exports what it moved, and nothing here reads a file or a
 * browser, so a page can import it at build time.
 *
 * The three counts stay separate because they are three different debts and one hides inside
 * another if you total them:
 *
 *  - provisional points   — the point value has no citation, so it renders with the badge
 *  - unverified ranges    — the bounds have no citation, so mood must not move the value
 *  - mood-inert params    — a param that declares a `mood` entry *and* sits in an unverified
 *                           range: it advertises an axis that provably does nothing
 *
 * Mood-inert is a subset of unverified ranges on purpose. It is the expensive half of that debt,
 * and rolling it into the total is how it stops being noticed.
 *
 * A fourth number sits alongside them and is not a fourth debt: how many numerics carry no unit
 * (#29). Unitless is often correct, so there is no finding for it and no target of zero.
 *
 * Cited points and ranges are split by `Cite.kind` (§3.1). Neither kind is a debt, and they
 * answer different questions: "how much of this device rests on one person's ear" is only
 * answerable if the counts are kept apart. Each half is a total, so every param is exactly one
 * of manual / observed / provisional on its point, and every numeric exactly one of the three on
 * its range.
 */


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

export type AuditKind =
  | 'provisional-point'
  | 'unverified-range'
  | 'mood-inert'
  | 'unchecked-capability'
  | 'undocumented-capability'

/**
 * §2.6/#22. Where a capability finding points: at a **field path**, not a recipe and a parameter.
 *
 * `recipeId` and `paramName` are the coordinates of a parameter claim and there is no honest
 * value for them here — a capability fact belongs to the box, not to a patch. So the two
 * coordinate systems are a discriminated union rather than one shape with fields left blank,
 * which is the same reason `Provenance` is a union rather than one object with optional halves:
 * a blank field is a claim nobody made, and it reads as one.
 */
export type AuditFinding =
  | { deviceId: string; recipeId: string; paramName: string; kind: AuditKind }
  | { deviceId: string; fact: string; kind: AuditKind }

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
  /**
   * #29. Numerics with no `unit`, a subset of `numerics`. A number to watch, never a finding:
   * see the header. It is deliberately outside the two totals that must add up, because it is
   * not a third way for a param to be classified — it cuts across all of them.
   */
  unitlessNumerics: number
  /**
   * §2.6/#22. **The capability facts a manifest has said something about**, and how.
   *
   * `capabilityFacts` = manualCapabilities + observedCapabilities + uncheckedCapabilities +
   * undocumentedCapabilities. A fourth identity that has to add up, on the same terms as the
   * other two.
   *
   * **Silence is not counted, and that is the whole shape of this number.** A manifest that says
   * nothing about `io.usbAudio` has no entry, contributes nothing here, and owes nothing —
   * invariant 4 is scoped to parameter values and #22 deliberately did not widen it. What the
   * audit can now see is the set of claims somebody actually made, which is what was invisible
   * while these lived in comments. A denominator of "every fact every device could cite" would
   * be a debt this project never took on, and printing it would make fourteen honest manifests
   * look delinquent.
   *
   * `undocumented` is kept apart from `unchecked` for the reason the two states exist at all: one
   * is work waiting to be done and the other is work that was done and came back empty. Adding
   * them would report finished research as a backlog.
   */
  capabilityFacts: number
  manualCapabilities: number
  observedCapabilities: number
  uncheckedCapabilities: number
  undocumentedCapabilities: number
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
  unitlessNumerics: 0,
  capabilityFacts: 0,
  manualCapabilities: 0,
  observedCapabilities: 0,
  uncheckedCapabilities: 0,
  undocumentedCapabilities: 0,
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
    // #29. Counted, not flagged: no finding is pushed and no zero is aimed at.
    if (param.unit === undefined) into.counts.unitlessNumerics++

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

/**
 * §2.6/#22. How one piece of capability evidence was checked, or that it was not.
 *
 * Four states where `citeKind` has three, because `CapabilityEvidence` has a state `Verified`
 * cannot express. Kept as its own function rather than folded into `citeKind`, which answers a
 * question about a parameter claim and must keep answering exactly that.
 */
export function evidenceKind(
  evidence: CapabilityEvidence,
): CiteKind | 'unchecked' | 'undocumented' {
  if (evidence === false) return 'unchecked'
  return evidence.kind === 'unknown' ? 'undocumented' : evidence.kind
}

/**
 * §2.6/#22. Every capability fact this manifest has said something about, counted and — for the
 * two states that are not citations — reported.
 *
 * **Paths are walked in code unit order, not insertion order** (§7.2). Object key order is an
 * authoring accident: moving a line in a manifest would otherwise reorder the audit's findings
 * and make a diff of two reports say something happened when nothing did.
 */
function auditCapabilities(device: Device, into: DeviceAudit): void {
  const evidence = device.capabilityEvidence ?? {}
  const paths = Object.keys(evidence).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  for (const fact of paths) {
    into.counts.capabilityFacts++
    switch (evidenceKind(evidence[fact] as CapabilityEvidence)) {
      case 'manual':
        into.counts.manualCapabilities++
        break
      case 'observed':
        into.counts.observedCapabilities++
        break
      case 'unchecked':
        into.counts.uncheckedCapabilities++
        into.findings.push({ deviceId: device.id, fact, kind: 'unchecked-capability' })
        break
      case 'undocumented':
        into.counts.undocumentedCapabilities++
        // A finding, but not a debt: it is reported so somebody can disagree with the reading,
        // not so somebody can go and do the work again.
        into.findings.push({ deviceId: device.id, fact, kind: 'undocumented-capability' })
        break
    }
  }
}

export function auditDevice(device: Device): DeviceAudit {
  const audit: DeviceAudit = { deviceId: device.id, counts: { ...ZERO_COUNTS }, findings: [] }
  for (const recipe of device.recipes) auditRecipe(device.id, recipe, audit)
  auditCapabilities(device, audit)
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
      unitlessNumerics: acc.unitlessNumerics + a.counts.unitlessNumerics,
      capabilityFacts: acc.capabilityFacts + a.counts.capabilityFacts,
      manualCapabilities: acc.manualCapabilities + a.counts.manualCapabilities,
      observedCapabilities: acc.observedCapabilities + a.counts.observedCapabilities,
      uncheckedCapabilities: acc.uncheckedCapabilities + a.counts.uncheckedCapabilities,
      undocumentedCapabilities:
        acc.undocumentedCapabilities + a.counts.undocumentedCapabilities,
    }),
    { ...ZERO_COUNTS },
  )
}

// ---------------------------------------------------------------------------
// Where the citations point
// ---------------------------------------------------------------------------


