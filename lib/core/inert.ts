/**
 * §3.1/#388. The inert-parameter check, as data.
 *
 * Extracted from `scripts/audit-verified.ts` for `lib/studio/provenance.ts`'s reason: the guide
 * is going to need the same answer the audit prints, and a second implementation behind the
 * renderer would let the page and the report disagree about which values are doing nothing. The
 * finding lives here; the terminal report — how a candidate is laid out for a person to judge —
 * stays in the script, which re-exports what it moved so it is still the audit's front door.
 *
 * **It is in `core` rather than in `studio` because `render.ts` is a reader.** The Markdown
 * renderer is `lib/core/render.ts`, and `lib/core` does not import from `lib/studio` anywhere;
 * a finding the guide has to consult cannot live above the layer that consults it.
 *
 * **Two entry points, one judgement.** `recipeInertFindings` answers for one recipe, which is the
 * unit a renderer holds; `inertFindings` walks the library and sorts, which is the unit the audit
 * prints. The second is the first in a loop, so the report and the page cannot come apart.
 *
 * **This is not `provenance.ts`'s `moodInert`.** That one is about a *citation*: a param declaring
 * a mood axis it may not use, because its range is uncited and mood must not move an uncited
 * value. This one is about a *patch*: a param whose value is authored fine and whose block
 * nothing in the recipe is listening to. Same word, two debts, and neither is a subset of the
 * other.
 *
 * Nothing here reads a file or a browser, so a page can import it at build time.
 */

import type { Device, Recipe } from './device'
import { recipeRouting } from './device'
import type { AuthoredParam } from './params'
import { compareCodeUnits } from './resolver'

/**
 * The separator a manifest puts between a block and the control on it **unless it says otherwise**
 * — see `Device.inertBlockSeparator`, which is #466's cheap half. It is a convention, not a
 * rule, and a manifest is free to name a control `CUTOFF` with no prefix at all, and many
 * do. That is the reach of this check: it can only group what a naming convention already groups,
 * and a device whose names carry no separator it knows about is invisible to it rather than clean.
 * #388's option 1, and the reason for option 3 beside it.
 */
const BLOCK_SEP = ' · '

/**
 * The separator to read this device's names with. One line, and it is the only place the default
 * is applied — grouping, the route and depth tails, the level lookup and `inertCoverage` all take
 * it from here, so a device cannot be grouped on one separator and read on another.
 */
function separatorOf(device: Device): string {
  return device.inertBlockSeparator ?? BLOCK_SEP
}

/**
 * The block a parameter sits on, read off its name. `MOD OSC · PITCH ▸ OSC 1` → `MOD OSC`;
 * on a device declaring ` `, `LFO RATE` → `LFO`.
 *
 * **This is `module` read off the name rather than off the field**, and that is deliberate. A
 * `module` is optional, most devices do not set it, and the two coordinate systems disagree where
 * it matters most: `MIXER · MOD OSC` is authored `inModule('MIXER')` because that is the fader a
 * reader walks to, and it is the MOD OSC's level. The check needs the second reading, so it takes
 * the name apart and leaves `module` alone.
 */
function blockOf(name: string, sep: string): string | undefined {
  const i = name.indexOf(sep)
  return i === -1 ? undefined : name.slice(0, i)
}

/** The half after the block: `MOD OSC · PITCH ▸ OSC 1` → `PITCH ▸ OSC 1`. */
function withinBlock(name: string, block: string, sep: string): string {
  return name.slice(block.length + sep.length)
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

/** One candidate, with the evidence that raised it. Never a verdict — see `recipeInertFindings`. */
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
 * sets nine controls and hears nothing. The audit's `REACH` block is the recipe-level version of
 * this question — is anything asking for this? — and this is the parameter-level one: is anything
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
export function recipeInertFindings(device: Device, recipe: Recipe): InertFinding[] {
  const sep = separatorOf(device)
  const blocks = new Map<string, AuthoredParam[]>()
  for (const param of recipe.params) {
    const block = blockOf(param.name, sep)
    if (block === undefined) continue
    const group = blocks.get(block) ?? []
    group.push(param)
    blocks.set(block, group)
  }
  const found: InertFinding[] = []
  for (const [block, group] of blocks) {
    const finding = judgeBlock(device, recipe, block, group, sep)
    if (finding !== undefined) found.push(finding)
  }
  return found.sort((a, b) => compareCodeUnits(a.block, b.block))
}

/**
 * The same judgement over a whole library, sorted for a report (invariant 6).
 *
 * A loop over `recipeInertFindings` and nothing else, so the audit and anything that asks about a
 * single recipe cannot return different answers. The sort is by device, then recipe, then block;
 * a recipe holds at most one candidate per block, so re-sorting here cannot reorder within a
 * recipe and the two entry points agree line for line.
 */
export function inertFindings(devices: readonly Device[]): InertFinding[] {
  const found: InertFinding[] = []
  for (const device of devices) {
    for (const recipe of device.recipes) found.push(...recipeInertFindings(device, recipe))
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
  sep: string,
): InertFinding | undefined {
  /**
   * #511. **A typed routing counts as one of each, and is not read off its name.**
   *
   * The names below are how this check finds a routing spread over separate parameters, which is
   * how most of the library still spells one. Where a manifest carries `kind: 'modulation'` the
   * question is already answered by the shape: the ends are the routes and the depth is the
   * depth, so a device that migrates keeps being judged exactly as it was before it did. Without
   * this a migrated block would go quiet — its `DEST` and its `AMOUNT` gone as names, its
   * disconnection no longer visible — which is a check that stops working with no test failing.
   */
  const modulations = group.filter((p) => p.kind === 'modulation')
  const routes = [
    ...group.filter((p) => p.kind !== 'modulation' && ROUTE_NAME.test(withinBlock(p.name, block, sep))),
    ...modulations,
  ]
  const depths = [
    ...group.filter(
      (p) => p.kind === 'numeric' && DEPTH_NAME.test(withinBlock(p.name, block, sep)),
    ),
    ...modulations,
  ]
  /**
   * The block's audio level, which lives on another block's name: `MIXER · MOD OSC` is a MIXER
   * fader and a MOD OSC level at the same time. Read off the *tail* of the name, which is the
   * same inference the grouping runs on, in the other direction.
   */
  const level = recipe.params.find(
    (p) =>
      p.kind === 'numeric' &&
      p.name.endsWith(`${sep}${block}`) &&
      blockOf(p.name, sep) !== block,
  )

  if (routes.length > 0 && depths.length > 0) {
    // A routing points nowhere when the switch that aims it reads OFF, and a typed one when
    // either end does. A stated end is the box's own wiring and can never read OFF.
    const allOff = routes.every((p) =>
      p.kind === 'modulation'
        ? [p.source, p.destination].some((e) => e.kind === 'control' && OFF_VALUES.has(e.value))
        : typeof p.value === 'string' && OFF_VALUES.has(p.value),
    )
    // #511. A typed depth is inert at its own declared neutral, which is the number the box
    // prints and not always zero — the Circuit Tracks' is 64. Reading `=== 0` off a modulation
    // would call a live route dead on any box whose centre is not the bottom of the range.
    const noDepth = depths.every((p) => (p.kind === 'modulation' ? p.value === p.neutral : p.value === 0))
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

  if (routes.length === 0 && MODULATOR_BLOCK.test(block) && !pointedElsewhere(recipe, block, sep)) {
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
function pointedElsewhere(recipe: Recipe, block: string, sep: string): boolean {
  // §3.7/#496. The composed line: a preamble naming the block points it just as a tail would,
  // and reading half of what an author wrote would raise candidates the recipe already answers.
  const said: string[] = [recipeRouting(recipe) ?? '']
  for (const entry of recipe.patch ?? []) said.push(entry.from, entry.to, entry.note ?? '')
  for (const param of recipe.params) {
    if (blockOf(param.name, sep) === block) continue
    said.push(param.name, param.note ?? '')
    if (typeof param.value === 'string') said.push(param.value)
  }
  return said.some((s) => s.includes(block))
}

// ---------------------------------------------------------------------------
// §8/#388. What a renderer draws with it.
// ---------------------------------------------------------------------------

/**
 * §8/#388. **The candidates for one part, keyed by the block they were raised on.**
 *
 * The renderers look a group up in this rather than each finding the recipe and running the
 * check itself: `groupedParams` is shared for the same reason (#33), because *which* controls a
 * reader is told about is structure, and two implementations of it are two chances for the web
 * guide and the printed one to mark different boxes. The ink stays each renderer's own.
 *
 * Computed once per part rather than once per box. A recipe raises at most one candidate per
 * block, so a `Map` loses nothing.
 *
 * **An empty map is the right answer to a missing device or a missing recipe**, and to #107's
 * hoisted block, which has no single recipe behind it — a device-level control is shared by
 * every part on the box, and a candidate raised against one recipe says nothing about it.
 */
export function inertBlocks(
  device: Device | undefined,
  recipeId: string | undefined,
): ReadonlyMap<string, InertFinding> {
  if (device === undefined || recipeId === undefined) return new Map()
  const recipe = device.recipes.find((r) => r.id === recipeId)
  if (recipe === undefined) return new Map()
  return new Map(recipeInertFindings(device, recipe).map((f) => [f.block, f]))
}

/**
 * §8/#388. **The sentence a rendered module carries when nothing appears to be listening to it**,
 * or nothing at all.
 *
 * **Both halves of the match are exact, and the strictness is the point.** A candidate is matched
 * to a box only when the block it was raised on *is* the module the box is labelled with, and
 * when the box holds exactly as many controls as the block does. The two coordinate systems are
 * genuinely different — `blockOf` reads a name prefix, `module` is an authored field, and
 * `MIXER · MOD OSC` is deliberately on the MIXER box while belonging to the MOD OSC block — and
 * the renderer also draws a *subset* in two ordinary cases: #107 lifts a control out of a part,
 * and `groupedParams` cuts on adjacent runs, so a module interrupted and resumed is two boxes.
 * A count that has moved means the box on the page is not the group the check judged, so it stays
 * live. **Under-marking is the failure to prefer**: a box wrongly left live costs a reader
 * nothing, and a box wrongly marked inert costs them a control they should have set.
 *
 * **The wording is a qualification, not a verdict** (invariant 5). `Appears inert` says how sure
 * this is, and the evidence comes with it in the same breath — `4 routes off, 2 depths 0,
 * level 0`, or `no authored destination found`, which is a claim about what was looked at rather
 * than about the box. So a reader who knows the panel wires the thing anyway can see, on the
 * line, exactly what the guide did and did not check, and disagree with it on the spot. That is
 * what makes the line survive a false candidate: the check is inference from one recipe's
 * authored evidence (`recipeInertFindings` says how far that reaches), and a line that hid it
 * behind a flat "inert" would be asking to be believed instead.
 *
 * Both renderers print this string exactly, which is why it is here and not written twice. Where
 * they differ is everything else: Markdown hangs it off the module's label, the web view draws a
 * muted box around it.
 */
export function inertNotice(
  blocks: ReadonlyMap<string, InertFinding>,
  group: { module?: string; params: readonly unknown[] },
): string | undefined {
  if (group.module === undefined) return undefined
  const finding = blocks.get(group.module)
  if (finding === undefined || finding.params !== group.params.length) return undefined
  return `Appears inert — ${finding.detail}.`
}

// ---------------------------------------------------------------------------
// §3.1/#466. What the check could not look at.
// ---------------------------------------------------------------------------

/**
 * §3.1/#466. **Which devices the grouping could form a group on, and which it could not.**
 *
 * The separator is a convention, and the module doc above already says a device that names things
 * differently is *invisible to the check rather than clean*. That sentence was true and nothing
 * printed it: `INERT` said "2 candidates on 1 device" while thirteen of the library's forty-six
 * devices were the only ones it had ever read. More than half the library's authored parameters
 * had never been examined by it, and the line read as an all-clear.
 *
 * That is the same failure the check exists to catch, one level up — a signal that looks healthy
 * because something else stands in for it — so the fix is invariant 5 applied to the instrument:
 * say what was not examined. **It changes no predicate.** The judgement in `judgeBlock` is
 * untouched and the same recipes raise the same candidates; this only reports the denominator
 * those candidates were counted against.
 *
 * **It moves as the grouping widens, which is the point of having it.**
 * `Device.inertBlockSeparator` took nine manifests from unexamined to examined and the numbers
 * went 13/26 to 22/17 with the candidate list unchanged — a measurement that could not have
 * been stated before this line existed.
 * The seventeen that remain include the shapes no separator reaches, where the modulation source
 * is the *value* of a parameter rather than part of a name.
 *
 * **The three groups are a partition of the library, and the third is not a blind spot.** A
 * device with no authored parameters has nothing for a name convention to hide — a sequencer or a
 * mixer whose manifest is capabilities and no recipes is fully examined by an empty walk. Folding
 * it in with the twenty-six would overstate the debt, which is the mistake this function exists to
 * stop making in the other direction.
 */
export type InertCoverage = {
  /**
   * Devices with at least one parameter name their **own** separator splits — `separatorOf`, not
   * `BLOCK_SEP` — so a manifest declaring `' '` is examined on the character it actually names
   * blocks with. These are the ones the check has read.
   */
  examined: readonly string[]
  /**
   * Devices with authored parameters and not one name the check can group. Their silence in the
   * report says nothing about them, which is exactly what needed printing.
   */
  unexamined: readonly string[]
  /** Devices with no authored parameters at all. Nothing to group, so no gap to report. */
  noParams: readonly string[]
}

/**
 * The partition above, over a whole library, each list sorted by code unit (invariant 6, and the
 * locale rule in `CLAUDE.md`).
 *
 * It asks the same question of a name that `blockOf` does — is there a separator in it — so the
 * coverage cannot drift from what the walk actually grouped.
 */
export function inertCoverage(devices: readonly Device[]): InertCoverage {
  const examined: string[] = []
  const unexamined: string[] = []
  const noParams: string[] = []
  for (const device of devices) {
    const params = device.recipes.flatMap((r) => r.params)
    if (params.length === 0) noParams.push(device.id)
    else if (params.some((p) => blockOf(p.name, separatorOf(device)) !== undefined))
      examined.push(device.id)
    else unexamined.push(device.id)
  }
  const sorted = (ids: string[]): string[] => ids.sort(compareCodeUnits)
  return {
    examined: sorted(examined),
    unexamined: sorted(unexamined),
    noParams: sorted(noParams),
  }
}
