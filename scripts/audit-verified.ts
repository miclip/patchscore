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
import type { AuthoredParam, Device, Recipe, Template } from '../lib/core/index'
import { unrequestedRecipes } from '../lib/core/index'
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
// §3.1/#388. INERT — a value authored where something else in the same recipe stops it doing
// anything.
// ---------------------------------------------------------------------------

/**
 * The separator a device *may* put between a block and the control on it. It is a convention, not
 * a rule, and most of the library does not follow it — a manifest is free to name a control
 * `CUTOFF` with no prefix at all, and many do. That is the whole reach of this check: it can only
 * group what a naming convention already groups, and a device that names things differently is
 * invisible to it rather than clean. #388's option 1, and the reason for option 3 beside it.
 */
const BLOCK_SEP = ' · '

/**
 * The block a parameter sits on, inferred from its name. `MOD OSC · PITCH ▸ OSC 1` → `MOD OSC`.
 *
 * **This is `module` read off the name rather than off the field**, and that is deliberate. A
 * `module` is optional, most devices do not set it, and the two coordinate systems disagree where
 * it matters most: `MIXER · MOD OSC` is authored `inModule('MIXER')` because that is the fader a
 * reader walks to, and it is the MOD OSC's level. The check needs the second reading, so it takes
 * the name apart and leaves `module` alone.
 */
function blockOf(name: string): string | undefined {
  const i = name.indexOf(BLOCK_SEP)
  return i === -1 ? undefined : name.slice(0, i)
}

/** The half after the block: `MOD OSC · PITCH ▸ OSC 1` → `PITCH ▸ OSC 1`. */
function withinBlock(name: string, block: string): string {
  return name.slice(block.length + BLOCK_SEP.length)
}

/**
 * A control that points the block at something. `▸` is the arrow the library already uses for a
 * hardwired destination switch; `DEST`/`TARGET`/`ROUTE` cover the boxes that spell it instead
 * (the minilogue xd's `LFO · TARGET`).
 */
const ROUTE_NAME = /▸|DEST|TARGET|ROUTE/

/** A depth control: how far the route moves what it points at. */
const DEPTH_NAME = /AMOUNT|DEPTH/

/**
 * A block that makes modulation rather than sound, for the destinationless shape only. Narrow on
 * purpose: an envelope is hardwired to something on nearly every box, so matching `ENV` here
 * would report a page of blocks that are working exactly as the panel wires them.
 */
const MODULATOR_BLOCK = /LFO|MOD OSC/

/** What a switch reads when it is not routing anything. */
const OFF_VALUES = new Set(['OFF', 'NONE'])

export type InertKind =
  /** Every route off, every depth zero, and no level — the block is wired to nothing. */
  | 'disconnected'
  /** A modulator with nowhere to point: nothing in the recipe routes it anywhere. */
  | 'destinationless'

/** One candidate, with the evidence that raised it. Never a verdict — see `inertFindings`. */
export type InertFinding = {
  deviceId: string
  recipeId: string
  block: string
  kind: InertKind
  /**
   * How many parameters the **inferred block** holds — the group the name prefix defines, and
   * nothing else. A level fader authored on another block (`MIXER · MOD OSC`) is read as evidence
   * and reported as `level 0`, but it is not counted here: the count has to mean the same thing
   * for both shapes, and it is the block a reader walks to. #388's own figure for the Muse's MOD
   * OSC is nine.
   */
  params: number
  /** The evidence, in the order a reader would check it. */
  detail: string
}

/**
 * §3.1/#388. **Parameters authored where something else in the same recipe makes them inert.**
 *
 * The guide prints an inert value in the same ink as one that matters, so a reader at the machine
 * sets nine controls and hears nothing. `REACH` above is the recipe-level version of this
 * question — is anything asking for this? — and this is the parameter-level one: is anything
 * listening to it?
 *
 * **Inert is not the same as zero, and a predicate on one parameter would be worse than no check
 * at all.** `MIXER · MOD OSC 0` is *correct* on all three Muse `pad` recipes and on
 * `muse-texture-soft`: the fader is the oscillator's audio level, and a MOD OSC used purely as a
 * modulator is routed, has depth, and is deliberately kept out of the mix. A rule that flagged
 * those would teach people to skip the block, which costs more than the check is worth. So the
 * condition is a **conjunction over a group of related parameters** — no route on *and* no depth
 * *and* no level. Any one of the three alone has an honest reading.
 *
 * **The group is inferred from the name prefix** (#388's option 1), not declared. That is cheap,
 * needs no manifest change, and is wrong the moment a device names things differently — which is
 * why this **reports candidates and never fails** (option 3, and how `REACH` already behaves). A
 * report that is sometimes wrong costs a reading; a gate that is sometimes wrong costs a
 * workaround.
 *
 * **Every entry is a candidate rather than a finding of fact, and the wording says so** (invariant
 * 5). What this reads is one recipe's authored evidence: its parameters, its patch entries, its
 * routing prose. It cannot see what the panel wires without asking, what a device's manifest says
 * elsewhere, or what a mechanism the manifest declares outside its parameter model — the Muse's
 * MOD MAP — would do. So `destinationless` says *no authored destination found*, which is a claim
 * about what was looked at, and not that the box has nowhere to point the thing.
 *
 * The depth clause is redundant against the route clause in strict logic — a route that is off
 * moves nothing whatever the depth says. It is kept because the report is read by a person, and
 * three facts pointing the same way is what makes a finding actionable rather than arguable. It
 * also keeps the check conservative on bipolar depths, where the neutral point is the middle of
 * the range rather than `0`.
 */
export function inertFindings(devices: readonly Device[]): InertFinding[] {
  const found: InertFinding[] = []
  for (const device of devices) {
    for (const recipe of device.recipes) {
      const blocks = new Map<string, AuthoredParam[]>()
      for (const param of recipe.params) {
        const block = blockOf(param.name)
        if (block === undefined) continue
        const group = blocks.get(block) ?? []
        group.push(param)
        blocks.set(block, group)
      }
      for (const [block, group] of blocks) {
        const finding = judgeBlock(device, recipe, block, group)
        if (finding !== undefined) found.push(finding)
      }
    }
  }
  return found.sort(
    (a, b) =>
      compareCodeUnits(a.deviceId, b.deviceId) ||
      compareCodeUnits(a.recipeId, b.recipeId) ||
      compareCodeUnits(a.block, b.block),
  )
}

function judgeBlock(
  device: Device,
  recipe: Recipe,
  block: string,
  group: readonly AuthoredParam[],
): InertFinding | undefined {
  const routes = group.filter((p) => ROUTE_NAME.test(withinBlock(p.name, block)))
  const depths = group.filter(
    (p) => p.kind === 'numeric' && DEPTH_NAME.test(withinBlock(p.name, block)),
  )
  /**
   * The block's audio level, which lives on another block's name: `MIXER · MOD OSC` is a MIXER
   * fader and a MOD OSC level at the same time. Read off the *tail* of the name, which is the
   * same inference the grouping runs on, in the other direction.
   */
  const level = recipe.params.find(
    (p) =>
      p.kind === 'numeric' &&
      p.name.endsWith(`${BLOCK_SEP}${block}`) &&
      blockOf(p.name) !== block,
  )

  if (routes.length > 0 && depths.length > 0) {
    const allOff = routes.every((p) => typeof p.value === 'string' && OFF_VALUES.has(p.value))
    const noDepth = depths.every((p) => p.value === 0)
    const noLevel = level === undefined || level.value === 0
    if (!allOff || !noDepth || !noLevel) return undefined
    const parts = [
      `${String(routes.length)} routes off`,
      `${String(depths.length)} depths 0`,
      level === undefined ? 'no level' : 'level 0',
    ]
    return {
      deviceId: device.id,
      recipeId: recipe.id,
      block,
      kind: 'disconnected',
      params: group.length,
      detail: parts.join(', '),
    }
  }

  if (routes.length === 0 && MODULATOR_BLOCK.test(block) && !pointedElsewhere(recipe, block)) {
    return {
      deviceId: device.id,
      recipeId: recipe.id,
      block,
      kind: 'destinationless',
      params: group.length,
      detail: 'no authored destination found',
    }
  }
  return undefined
}

/**
 * Whether anything else in the *recipe* names the block as a source. A modular device points its
 * LFO with a cable rather than a switch — the Cascadia's `LFO X / Y / Z · RATE` is the only
 * parameter on that block, and `patch` carries `LFO X / Y / Z · LFO X → VCF · FM 3` — and a device
 * may say it in `routing` prose or in a note. All of it counts: the question is whether the recipe
 * points the block anywhere, not whether it does so with a parameter.
 *
 * A recipe is all this sees, which is why a negative answer raises a candidate rather than settles
 * one. The name is matched as a substring, so the failure is toward silence: prose that happens to
 * contain the block's name clears it.
 */
function pointedElsewhere(recipe: Recipe, block: string): boolean {
  const said: string[] = [recipe.routing ?? '']
  for (const entry of recipe.patch ?? []) said.push(entry.from, entry.to, entry.note ?? '')
  for (const param of recipe.params) {
    if (blockOf(param.name) === block) continue
    said.push(param.name, param.note ?? '')
    if (typeof param.value === 'string') said.push(param.value)
  }
  return said.some((s) => s.includes(block))
}

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
