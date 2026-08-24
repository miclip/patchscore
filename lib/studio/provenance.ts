import type { AuthoredParam, CiteKind, Device, Recipe, Verified } from '../core/index'

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
  /**
   * #29. Numerics with no `unit`, a subset of `numerics`. A number to watch, never a finding:
   * see the header. It is deliberately outside the two totals that must add up, because it is
   * not a third way for a param to be classified — it cuts across all of them.
   */
  unitlessNumerics: number
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
      unitlessNumerics: acc.unitlessNumerics + a.counts.unitlessNumerics,
    }),
    { ...ZERO_COUNTS },
  )
}
