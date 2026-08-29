import type {
  AuthoredParam,
  CapabilityEvidence,
  CiteKind,
  Device,
  Recipe,
  Verified,
} from '../core/index'
import { citedDocument, compareCodeUnits, effectiveVerified, rangeDocuments } from '../core/index'

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
  | 'unread-capability'
  | 'cited-against-capability'
  | 'partly-capability'

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
   * §2.6/#22/#120. **The capability facts a manifest has said something about**, and how.
   *
   * `capabilityFacts` = manualCapabilities + observedCapabilities + citedAgainstCapabilities +
   * uncheckedCapabilities + undocumentedCapabilities + unreadCapabilities + partlyCapabilities.
   * A fourth identity that has to add up, on the same terms as the other two — seven ways since
   * #236, six since #120, because one state kept being asked to answer several questions.
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
   *
   * `unread` is kept apart from both for the same reason one step further out. It *is* work
   * waiting, so it is not `undocumented`; and it is blocked on finding a document rather than on
   * reading one, so totalling it with `unchecked` would tell an author to go and read a file that
   * is not there. `cited-against` sits with the citations because it is one — a page was read and
   * it answers the question — and apart from them because what it supports is the *absence* of a
   * claim, which is not the thing `manual` and `observed` count.
   */
  capabilityFacts: number
  manualCapabilities: number
  observedCapabilities: number
  citedAgainstCapabilities: number
  uncheckedCapabilities: number
  undocumentedCapabilities: number
  unreadCapabilities: number
  /**
   * §2.6/#236. Facts a page establishes *part* of. Counted apart from `manualCapabilities`
   * because the manual does not back the whole claim, and apart from `undocumentedCapabilities`
   * because it backs most of it — which is the distinction the count existed without.
   */
  partlyCapabilities: number
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
  citedAgainstCapabilities: 0,
  partlyCapabilities: 0,
  uncheckedCapabilities: 0,
  undocumentedCapabilities: 0,
  unreadCapabilities: 0,
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
 * §2.6/#22/#120. How one piece of capability evidence was checked, or that it was not.
 *
 * Six states where `citeKind` has three, because `CapabilityEvidence` has three states
 * `Verified` cannot express. Kept as its own function rather than folded into `citeKind`, which
 * answers a question about a parameter claim and must keep answering exactly that.
 *
 * Only one of the six is a rename: `unknown` reports as `undocumented`, because the state is
 * about the *document* rather than about what anybody knows, and "unknown" beside "unchecked" in
 * a report reads as two spellings of the same shrug. The other five say what they are.
 */
export type EvidenceKind =
  | CiteKind
  | 'unchecked'
  | 'undocumented'
  | 'unread'
  | 'cited-against'
  | 'partly'

export function evidenceKind(evidence: CapabilityEvidence): EvidenceKind {
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
      case 'partly':
        into.counts.partlyCapabilities++
        // Reported, like the two below it, so somebody can disagree with the split — and because
        // "what is still open" is exactly the sentence a later author should be trying to close.
        into.findings.push({ deviceId: device.id, fact, kind: 'partly-capability' })
        break
      case 'cited-against':
        into.counts.citedAgainstCapabilities++
        // Reported for the reason `undocumented` is, and more so: this one says the document
        // answers in the other direction, which is the reading most worth disagreeing with.
        into.findings.push({ deviceId: device.id, fact, kind: 'cited-against-capability' })
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
      case 'unread':
        into.counts.unreadCapabilities++
        // A debt, and one nobody here can pay by reading harder — it is waiting on a file.
        into.findings.push({ deviceId: device.id, fact, kind: 'unread-capability' })
        break
    }
  }
}

export function auditDevice(device: Device, countedRecipes?: Set<string>): DeviceAudit {
  const audit: DeviceAudit = { deviceId: device.id, counts: { ...ZERO_COUNTS }, findings: [] }
  for (const recipe of device.recipes) {
    // §9/#193. **A recipe shared by reference is one recipe, and the library total says so.**
    //
    // `akai-mpc-xl` takes the Live III's recipes as the *same objects*, so summing the per-device
    // audits counted 283 points and 169 ranges that nobody authored — one manifest referencing
    // another's. Those totals are quoted in every device commit as evidence provenance did not
    // regress, so an inflating measure undermines the check it exists for.
    //
    // Identity, not recipe id, and that distinction is the whole rule. `akai-mpc-one-g2` shares
    // every id with the Live III and is a *different object*: it rewrites each citation onto the
    // v3.9 page somebody opened and compared, so `mpc-kick-hard` cites p.441 there against p.431
    // here. That is real provenance work and it is counted. De-duplicating by id would have
    // erased it, which is why the obvious fix was the wrong one.
    //
    // Per-device blocks pass no set and count everything: a reader of the MPC XL's row wants what
    // the XL offers, however it came to offer it.
    if (countedRecipes !== undefined) {
      // Keyed on content, not on object identity. Identity looks right and is load-path
      // dependent: the generated registry has `akai-mpc-xl` importing the Live III's module, so
      // the recipes are literally the same objects, while `loadDevices` parses each folder from
      // disk and produces separate ones. The audit runs on the second path, so an identity check
      // silently counted nothing and the totals did not move.
      const key = JSON.stringify(recipe)
      if (countedRecipes.has(key)) continue
      countedRecipes.add(key)
    }
    auditRecipe(device.id, recipe, audit)
  }
  auditCapabilities(device, audit)
  return audit
}

/**
 * §9/#193. The library's totals, with a recipe shared by reference counted once.
 *
 * Capability facts are summed rather than de-duplicated, and that is not an oversight: every
 * device declares its own, and two boxes citing the same page have each made the claim about
 * themselves.
 */
export function libraryCounts(devices: readonly Device[]): AuditCounts {
  const counted = new Set<string>()
  const ordered = [...devices].sort((a, b) => compareCodeUnits(a.id, b.id))
  return totalCounts(ordered.map((device) => auditDevice(device, counted)))
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
      citedAgainstCapabilities: acc.citedAgainstCapabilities + a.counts.citedAgainstCapabilities,
      uncheckedCapabilities: acc.uncheckedCapabilities + a.counts.uncheckedCapabilities,
      undocumentedCapabilities:
        acc.undocumentedCapabilities + a.counts.undocumentedCapabilities,
      unreadCapabilities: acc.unreadCapabilities + a.counts.unreadCapabilities,
      partlyCapabilities: acc.partlyCapabilities + a.counts.partlyCapabilities,
    }),
    { ...ZERO_COUNTS },
  )
}

// ---------------------------------------------------------------------------
// Where the citations point
// ---------------------------------------------------------------------------


