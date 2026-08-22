import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import type { Character, Role } from './vocabulary'
import type { Assignable, Device, Recipe } from './device'
import type { RoleRequest, Template } from './template'
import {
  assignableKey,
  compareCodeUnits,
  expand,
  resolveCharacter,
  resolveRecipe,
  sectionsFor,
  type MoodState,
} from './resolver'

/**
 * §7.1. Assignment is a bounded search over a lexicographic objective.
 *
 * Greedy highest-priority-first piles everything onto whichever device scores well per-role in
 * isolation — the TR-1000 wins kick, snare, hat *and* sub while the Deluge sits idle. The
 * problem is tiny (<= ~20 requests, <= ~8 devices), so it is searched rather than guessed.
 *
 * **`unvoiced` neither fills nor occupies.** A request whose only reachable assignables have no
 * usable recipe (§3.5) is *not* a candidate: it counts as a miss and reserves no voice. An
 * unvoiced request produces no part — no step programming, no sound design, nothing to render —
 * so letting it hold a voice is strictly harmful. Consider an LT serving `sub`, `bass-mid` and
 * `tom` where `sub` is unvoiced and `bass-mid` has a real recipe: if unvoiced filled, `sub`
 * would take the LT and `bass-mid` would become the miss, which is plainly the worse guide.
 *
 * The distinction §3.5 cares about is a *reporting* distinction, and it is recovered in the
 * gap's `reason` (§7.3) rather than in the objective — a `no-recipe` gap names the assignables
 * that could have carried the part, which is the useful half of treating unvoiced as filled
 * with none of the cost.
 */

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type Assignment = {
  requestId: RequestId
  role: Role
  /** The character asked for, after §6.2 resolved the template pinning against mood. */
  character: Character
  assignable: Assignable
  deviceId: DeviceId
  recipe: Recipe
  /** Never 'unvoiced' — an unvoiced request is a gap, not an assignment. */
  outcome: 'exact' | 'substituted'
  /** The character actually authored, which for 'substituted' is not the one asked for. */
  recipeCharacter: Character
  /** The sections this request occupies on this assignable (§4.2). */
  sections: SectionName[]
}

/**
 * §7.3. Three reasons, because the reasons exist to tell the user what to *do* and there are
 * exactly three actions: buy something, wait for us to author something, or change the
 * arrangement. A fourth top-level reason would split the third action into cases that all
 * resolve the same way, which is why the sub-cause of `no-room` is a field and not a sibling.
 */
export const GAP_REASONS = ['no-capable-voice', 'no-recipe', 'no-room'] as const
export type GapReason = (typeof GAP_REASONS)[number]

/**
 * Why the objective ranked some other allocation higher. `no-room` rather than
 * `rig-too-small` deliberately: crowding is often fixed by raising `comfortableVoices` rather
 * than by buying anything, and the name must not prejudge which.
 */
export const NO_ROOM_CAUSES = ['contended', 'crowding', 'distinct'] as const
export type NoRoomCause = (typeof NO_ROOM_CAUSES)[number]

type GapBase = {
  requestId: RequestId
  role: Role
  character: Character
  priority: number
  optional: boolean
  /**
   * Empty for 'no-capable-voice'. For 'no-recipe', every assignable that could have carried
   * the part — "your TR-1000 BD can do it, dial it by ear". For 'no-room', the ones that
   * could have carried it and did not get it.
   */
  capable: readonly Assignable[]
}

/**
 * `because` and `detail` live on `no-room` alone rather than being optional everywhere, so it
 * is a type error to build a `no-room` gap without saying what gave way — the same discipline
 * as `ResolvedParam.provenance` being non-optional (§3.1).
 */
export type Gap =
  | (GapBase & { reason: 'no-capable-voice' | 'no-recipe' })
  | (GapBase & { reason: 'no-room'; because: NoRoomCause; detail: string })

/** §7.1: "If the cap is hit, fall back to the greedy result **and log it** — no silent truncation." */
export type SearchReport = {
  /** Nodes visited before the search finished or hit the cap. */
  nodes: number
  nodeCap: number
  capped: boolean
  method: 'exhaustive' | 'greedy'
}

export type AssignmentResult = {
  assignments: Assignment[]
  occupancy: Occupancy
  score: Score
  gaps: Gap[]
  search: SearchReport
}

/** §7.1. Tiny problem, generous ceiling; the cap exists to bound pathology, not to tune. */
export const DEFAULT_NODE_CAP = 50_000

// ---------------------------------------------------------------------------
// §7.1 The objective
// ---------------------------------------------------------------------------

/**
 * Smaller is better; compare element by element, first difference decides. Both vectors come
 * from the same template and therefore have the same length — the miss prefix is sized by the
 * template's highest priority, not by the outcome, so the shape does not move between two
 * candidate solutions.
 */
export function compareScore(a: Score, b: Score): number {
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) return left < right ? -1 : 1
  }
  return 0
}

/**
 * §7.1: `recipeDistance` is the only non-integer input and is quantised before it enters the
 * vector, so the comparison stays exact and cannot drift across platforms (invariant 6).
 *
 * The squared distances that reach here are 0, 1, 2 or 3 — every character component is in
 * {-1, 0, 1} and §3.5 refuses anything at 4 — so the root is taken on a handful of small
 * integers and the x1000 rounding leaves an enormous margin.
 */
export function quantiseDistance(distanceSq: number): number {
  return Math.round(Math.sqrt(distanceSq) * 1000)
}

// ---------------------------------------------------------------------------
// §7.2 Seeding
// ---------------------------------------------------------------------------

/** FNV-1a over UTF-16 code units. No locale, no platform-dependent hashing. */
function hash32(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * xorshift32, entirely in uint32 arithmetic. No float anywhere in the stream and no
 * `Math.random` (§7.2): a numeric seed drives every tie-break, and "reroll" changes the seed.
 */
function nextUint32(state: number): number {
  let x = state >>> 0
  x ^= x << 13
  x >>>= 0
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

/**
 * §7.2: "The seed only permutes among *exactly equal* scores." Everything else has already
 * been ordered deterministically before this runs, so this permutes within a tied group only.
 *
 * The stream is seeded from the request id rather than from traversal history, so a node's
 * permutation does not depend on which branch reached it — the same seed gives the same
 * ordering whether it is reached by the exhaustive search or by the greedy fallback.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  if (items.length < 2) return items
  // xorshift32 has a fixed point at zero, so a seed that mixes to zero is nudged off it.
  let state = (seed >>> 0) === 0 ? 0x9e3779b9 : seed >>> 0
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    state = nextUint32(state)
    const j = state % (i + 1)
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}

// ---------------------------------------------------------------------------
// Precomputation
// ---------------------------------------------------------------------------

type Candidate = {
  assignable: Assignable
  key: AssignableKey
  recipe: Recipe
  outcome: 'exact' | 'substituted'
  recipeCharacter: Character
  distance: number
  /** §7.1: the role's index within `voice.roles`. An authoring hint, ranked accordingly. */
  roleFit: number
}

type Ctx = {
  template: Template
  devices: readonly Device[]
  deviceById: Map<DeviceId, Device>
  /** Every selected device, in the order the caller passed them. */
  deviceIds: DeviceId[]
  comfortable: Map<DeviceId, number>
  requests: RoleRequest[]
  wanted: Character[]
  sections: SectionName[][]
  /** Role + polyphony only: what the *rig* can carry, before recipes or occupancy. */
  capable: Assignable[][]
  /** Capable, and with a usable recipe. The candidate pool before occupancy and `distinct`. */
  voiceable: Candidate[][]
  /** Devices a request could legally occupy, ignoring occupancy — for the idle lower bound. */
  suffixReach: Set<DeviceId>[]
  missSlots: number
  seed: number
  nodeCap: number
}

function buildCtx(input: AssignInput): Ctx {
  const { template, devices, mood, seed } = input

  const deviceById = new Map<DeviceId, Device>()
  const assignableOwner = new Map<AssignableKey, Device>()
  const assignables: Assignable[] = []
  const comfortable = new Map<DeviceId, number>()
  const deviceIds: DeviceId[] = []
  for (const device of devices) {
    deviceById.set(device.id, device)
    const expanded = expand(device)
    // §2.3: `comfortableVoices` omitted means the device is comfortable with all of them.
    comfortable.set(device.id, device.comfortableVoices ?? expanded.length)
    deviceIds.push(device.id)
    for (const assignable of expanded) {
      assignables.push(assignable)
      assignableOwner.set(assignableKey(assignable), device)
    }
  }

  // §4.4: ascending priority, most important first. Ties by request id in UTF-16 order (§7.2),
  // so the traversal does not depend on authoring order within one priority level.
  const requests = [...template.roles].sort(
    (a, b) => a.priority - b.priority || compareCodeUnits(a.id, b.id),
  )

  const wanted: Character[] = []
  const sections: SectionName[][] = []
  const capable: Assignable[][] = []
  const voiceable: Candidate[][] = []
  const reach: Set<DeviceId>[] = []

  for (const request of requests) {
    const character = resolveCharacter(request.character, mood)
    wanted.push(character)
    sections.push(sectionsFor(request, template))

    const fits = assignables.filter(
      (a) =>
        a.roles.includes(request.role) &&
        a.polyphony >= (request.polyphony ?? 1),
    )
    capable.push(fits)

    const candidates: Candidate[] = []
    for (const assignable of fits) {
      const key = assignableKey(assignable)
      const owner = assignableOwner.get(key)
      if (owner === undefined) continue
      const resolution = resolveRecipe(owner, assignable, request.role, character)
      // The human ruling: unvoiced is not a candidate. It neither fills nor occupies, and is
      // recovered as a `no-recipe` gap reason instead.
      if (resolution.outcome === 'unvoiced') continue
      candidates.push({
        assignable,
        key,
        recipe: resolution.recipe,
        outcome: resolution.outcome,
        recipeCharacter: resolution.character,
        distance: quantiseDistance(resolution.distanceSq),
        roleFit: assignable.roles.indexOf(request.role),
      })
    }
    voiceable.push(candidates)
    reach.push(new Set(candidates.map((c) => c.assignable.deviceId)))
  }

  // Suffix unions: which devices any *remaining* request could still reach. `suffixReach[i]`
  // covers requests i..n-1, and `suffixReach[n]` is empty.
  const suffixReach: Set<DeviceId>[] = new Array(requests.length + 1)
  suffixReach[requests.length] = new Set()
  for (let i = requests.length - 1; i >= 0; i--) {
    const union = new Set(suffixReach[i + 1])
    for (const id of reach[i] ?? []) union.add(id)
    suffixReach[i] = union
  }

  // The miss prefix is sized by the template, not by the outcome, so every candidate solution
  // produces a vector of the same shape and `compareScore` never compares ragged tuples.
  const missSlots = requests.reduce((max, r) => Math.max(max, r.priority), 0)

  return {
    template,
    devices,
    deviceById,
    deviceIds,
    comfortable,
    requests,
    wanted,
    sections,
    capable,
    voiceable,
    suffixReach,
    missSlots,
    seed,
    nodeCap: input.nodeCap ?? DEFAULT_NODE_CAP,
  }
}

// ---------------------------------------------------------------------------
// Search state
// ---------------------------------------------------------------------------

type State = {
  misses: number[]
  optionalMisses: number
  recipeDistance: number
  roleFitPenalty: number
  /** Occupied assignables per device — one entry per assignable occupied in >= 1 section. */
  occupiedByDevice: Map<DeviceId, Set<AssignableKey>>
  occupancy: Occupancy
  chosen: (Candidate | null)[]
}

function emptyState(ctx: Ctx): State {
  return {
    misses: new Array(ctx.missSlots).fill(0),
    optionalMisses: 0,
    recipeDistance: 0,
    roleFitPenalty: 0,
    occupiedByDevice: new Map(ctx.devices.map((d) => [d.id, new Set<AssignableKey>()])),
    occupancy: new Map(),
    chosen: new Array(ctx.requests.length).fill(null),
  }
}

function crowdOverflow(ctx: Ctx, state: State): number {
  let total = 0
  for (const id of ctx.deviceIds) {
    const occupied = state.occupiedByDevice.get(id)?.size ?? 0
    total += Math.max(0, occupied - (ctx.comfortable.get(id) ?? 0))
  }
  return total
}

/**
 * §7.1, literally: "devices with zero occupied assignables". *Every* selected device counts,
 * a voiceless mixer-recorder included — it contributes no assignables (§2.4) and so is always
 * idle, which is a constant across every candidate solution and therefore never changes which
 * assignment wins.
 *
 * §12.4: an assignable occupied in *any* section counts once — the physical voice is committed
 * for the whole build even if its part only plays in Build.
 */
function idleDevices(ctx: Ctx, state: State): number {
  let idle = 0
  for (const id of ctx.deviceIds) {
    if ((state.occupiedByDevice.get(id)?.size ?? 0) === 0) idle++
  }
  return idle
}

function scoreOf(ctx: Ctx, state: State): Score {
  return [
    ...state.misses,
    crowdOverflow(ctx, state),
    state.optionalMisses,
    state.recipeDistance,
    state.roleFitPenalty,
    idleDevices(ctx, state),
  ] as unknown as Score
}

/**
 * §7.1's branch-and-bound bound, **per key, and one key is not monotone.**
 *
 * Misses, crowding, recipe distance and role fit only grow as the assignment extends, so the
 * partial value bounds them. `idleDevices` *shrinks*, so the current idle count is not a lower
 * bound and using it prunes the optimum. The admissible bound is the number of devices that no
 * remaining request could legally reach — those are idle now and can never stop being idle.
 */
function lowerBound(ctx: Ctx, state: State, next: number): Score {
  const reachable = ctx.suffixReach[next] ?? new Set<DeviceId>()
  let unreachableIdle = 0
  // A voiceless device is in no request's reachable set, so it is counted here exactly as
  // `idleDevices` counts it — the bound stays exact at the leaf.
  for (const id of ctx.deviceIds) {
    if ((state.occupiedByDevice.get(id)?.size ?? 0) !== 0) continue
    if (!reachable.has(id)) unreachableIdle++
  }
  return [
    ...state.misses,
    crowdOverflow(ctx, state),
    state.optionalMisses,
    state.recipeDistance,
    state.roleFitPenalty,
    unreachableIdle,
  ] as unknown as Score
}

function apply(ctx: Ctx, state: State, index: number, candidate: Candidate): void {
  const request = ctx.requests[index] as RoleRequest
  let bySection = state.occupancy.get(candidate.key)
  if (bySection === undefined) {
    bySection = new Map()
    state.occupancy.set(candidate.key, bySection)
  }
  for (const section of ctx.sections[index] ?? []) bySection.set(section, request.id)
  state.occupiedByDevice.get(candidate.assignable.deviceId)?.add(candidate.key)
  state.recipeDistance += candidate.distance
  state.roleFitPenalty += candidate.roleFit
  state.chosen[index] = candidate
}

function undo(ctx: Ctx, state: State, index: number, candidate: Candidate): void {
  const bySection = state.occupancy.get(candidate.key)
  if (bySection !== undefined) {
    for (const section of ctx.sections[index] ?? []) bySection.delete(section)
    if (bySection.size === 0) {
      state.occupancy.delete(candidate.key)
      // Only now does the assignable stop being occupied, and only then can the device's
      // occupied count fall. §12.4 counts assignables, not sections.
      state.occupiedByDevice.get(candidate.assignable.deviceId)?.delete(candidate.key)
    }
  }
  state.recipeDistance -= candidate.distance
  state.roleFitPenalty -= candidate.roleFit
  state.chosen[index] = null
}

function applyMiss(ctx: Ctx, state: State, index: number): void {
  const request = ctx.requests[index] as RoleRequest
  // §4.4: `optional: true` removes a request from the miss objective entirely — filled if it
  // fits, dropped without complaint if not.
  if (request.optional === true) state.optionalMisses++
  else state.misses[request.priority - 1] = (state.misses[request.priority - 1] ?? 0) + 1
}

function undoMiss(ctx: Ctx, state: State, index: number): void {
  const request = ctx.requests[index] as RoleRequest
  if (request.optional === true) state.optionalMisses--
  else state.misses[request.priority - 1] = (state.misses[request.priority - 1] ?? 0) - 1
}

/**
 * §12.6. Requests sharing a role and carrying `distinct: true` may not land on the same
 * `deviceId`. A local authoring statement, made by the person who knows whether two toms are
 * meant to be two boxes — deliberately *not* a `Score` key, because inserting one silently
 * reorders every key beneath it.
 */
function violatesDistinct(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  const request = ctx.requests[index] as RoleRequest
  if (request.distinct !== true) return false
  for (let i = 0; i < index; i++) {
    const other = ctx.requests[i] as RoleRequest
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    if (other.distinct !== true || other.role !== request.role) continue
    if (taken.assignable.deviceId === candidate.assignable.deviceId) return true
  }
  return false
}

/**
 * The same rule as `violatesDistinct`, but scanning *every* other request rather than only the
 * ones already decided. The search can only look backwards — later requests have no device
 * yet — while classification runs against a finished allocation, where the constraint is
 * symmetric and looking only backwards would miss the request that actually blocked this one.
 */
function distinctBlocked(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  const request = ctx.requests[index] as RoleRequest
  if (request.distinct !== true) return false
  for (let i = 0; i < ctx.requests.length; i++) {
    if (i === index) continue
    const other = ctx.requests[i] as RoleRequest
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    if (other.distinct !== true || other.role !== request.role) continue
    if (taken.assignable.deviceId === candidate.assignable.deviceId) return true
  }
  return false
}

function isFree(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  const bySection = state.occupancy.get(candidate.key)
  if (bySection === undefined) return true
  // §4.2: conflict is same section, same assignable. Two transient requests in disjoint
  // sections share a voice quite legally, which is the whole reason occupancy is per-section.
  for (const section of ctx.sections[index] ?? []) {
    if (bySection.has(section)) return false
  }
  return true
}

/**
 * §7.2: "Candidates sort by `(score, deviceId, voiceId)`, with `score` compared
 * lexicographically — fully deterministic. The seed only permutes among exactly equal scores."
 *
 * The score used here is the partial vector that *would* result from taking the candidate.
 * Misses are identical across candidates at one node, so this ranks them by exactly the keys
 * that differ: crowding first, then recipe quality, then role fit, then idleness.
 */
function orderedCandidates(ctx: Ctx, state: State, index: number): Candidate[] {
  const legal = (ctx.voiceable[index] ?? []).filter(
    (c) => isFree(ctx, state, index, c) && !violatesDistinct(ctx, state, index, c),
  )
  if (legal.length < 2) return legal

  const scored = legal.map((candidate) => {
    apply(ctx, state, index, candidate)
    const score = scoreOf(ctx, state)
    undo(ctx, state, index, candidate)
    return { candidate, score }
  })

  scored.sort(
    (a, b) =>
      compareScore(a.score, b.score) ||
      compareCodeUnits(a.candidate.assignable.deviceId, b.candidate.assignable.deviceId) ||
      compareCodeUnits(a.candidate.assignable.voiceId, b.candidate.assignable.voiceId),
  )

  // Permute within exactly-equal-score runs only. Everything else keeps the deterministic
  // (deviceId, voiceId) order it was just given.
  const request = ctx.requests[index] as RoleRequest
  const nodeSeed = (hash32(request.id) ^ (ctx.seed >>> 0)) >>> 0
  const out: Candidate[] = []
  let runStart = 0
  for (let i = 1; i <= scored.length; i++) {
    const endOfRun =
      i === scored.length ||
      compareScore((scored[i] as { score: Score }).score, (scored[runStart] as { score: Score }).score) !== 0
    if (!endOfRun) continue
    const run = scored.slice(runStart, i).map((s) => s.candidate)
    out.push(...(run.length > 1 ? seededShuffle(run, nodeSeed + runStart) : run))
    runStart = i
  }
  return out
}

// ---------------------------------------------------------------------------
// The search
// ---------------------------------------------------------------------------

type Solution = { score: Score; chosen: (Candidate | null)[] }

function snapshot(ctx: Ctx, state: State): Solution {
  return { score: scoreOf(ctx, state), chosen: [...state.chosen] }
}

function search(ctx: Ctx): { best: Solution | undefined; nodes: number; capped: boolean } {
  const state = emptyState(ctx)
  let best: Solution | undefined
  let nodes = 0
  let capped = false

  function dfs(index: number): void {
    if (capped) return
    // Checked before the increment, so `nodes` reports what was actually visited and never
    // overshoots the cap it is being compared against.
    if (nodes >= ctx.nodeCap) {
      capped = true
      return
    }
    nodes++

    if (best !== undefined && compareScore(lowerBound(ctx, state, index), best.score) >= 0) return

    if (index === ctx.requests.length) {
      const score = scoreOf(ctx, state)
      if (best === undefined || compareScore(score, best.score) < 0) best = snapshot(ctx, state)
      return
    }

    for (const candidate of orderedCandidates(ctx, state, index)) {
      apply(ctx, state, index, candidate)
      dfs(index + 1)
      undo(ctx, state, index, candidate)
      if (capped) return
    }

    // The miss branch is explored last: filling is usually better, so taking it first would
    // delay a good incumbent and weaken every bound below. It is explored at all because
    // leaving a low-priority part out can genuinely beat crowding a box to fit it.
    applyMiss(ctx, state, index)
    dfs(index + 1)
    undoMiss(ctx, state, index)
  }

  dfs(0)
  return { best, nodes, capped }
}

/**
 * §7.1's fallback: one pass, best candidate at each step, no backtracking. Deterministic on
 * the same ordering — and on the same seed — as the exhaustive search.
 */
function greedy(ctx: Ctx): Solution {
  const state = emptyState(ctx)
  for (let index = 0; index < ctx.requests.length; index++) {
    const candidate = orderedCandidates(ctx, state, index)[0]
    if (candidate === undefined) applyMiss(ctx, state, index)
    else apply(ctx, state, index, candidate)
  }
  return snapshot(ctx, state)
}

// ---------------------------------------------------------------------------
// §7.3 Gaps
// ---------------------------------------------------------------------------

/**
 * Which assignable, in the winning allocation, the guide should point at when it explains a
 * `no-room` gap. Deterministic: the voiceable candidates are already in (deviceId, voiceId)
 * order, so this is the first one, never an arbitrary one.
 */
function firstWhere(
  candidates: readonly Candidate[],
  predicate: (c: Candidate) => boolean,
): Candidate | undefined {
  for (const candidate of candidates) if (predicate(candidate)) return candidate
  return undefined
}

/**
 * §7.3. Classified against the **winning allocation**, not against candidate existence: the
 * question a gap answers is "why did this part not get made", and that is a fact about the
 * assignment that won, not about what was theoretically reachable at the start.
 *
 * The three sub-causes of `no-room` are checked in an order derived from the objective rather
 * than chosen by taste:
 *
 *  - A candidate that is **free and distinct-legal** in the finished allocation could have
 *    been taken without displacing anyone, so the only key that can have argued against it is
 *    `crowdOverflow` — the one key ranking above `optionalMisses`. That is crowding.
 *  - Otherwise, if a candidate is free but the `distinct` rule (§12.6) forbids it, that rule
 *    is what is binding.
 *  - Otherwise every candidate is carrying something else, which is contention.
 */
function classify(ctx: Ctx, state: State, index: number): Gap {
  const request = ctx.requests[index] as RoleRequest
  const capable = ctx.capable[index] ?? []
  const voiceable = ctx.voiceable[index] ?? []
  const base = {
    requestId: request.id,
    role: request.role,
    character: ctx.wanted[index] as Character,
    priority: request.priority,
    optional: request.optional === true,
  }

  // "Nothing in your rig covers this." The fix is buying.
  if (capable.length === 0) {
    return { ...base, reason: 'no-capable-voice', capable: [] }
  }
  // "Your TR-1000 BD can do it — dial it by ear." The fix is authoring, not buying.
  if (voiceable.length === 0) {
    return { ...base, reason: 'no-recipe', capable }
  }

  const named = voiceable.map((c) => c.assignable)
  const free = firstWhere(voiceable, (c) => isFree(ctx, state, index, c))

  const freeAndLegal = firstWhere(
    voiceable,
    (c) => isFree(ctx, state, index, c) && !distinctBlocked(ctx, state, index, c),
  )
  if (freeAndLegal !== undefined) {
    const deviceId = freeAndLegal.assignable.deviceId
    const occupied = state.occupiedByDevice.get(deviceId)?.size ?? 0
    return {
      ...base,
      reason: 'no-room',
      capable: named,
      because: 'crowding',
      detail: `your ${ctx.deviceById.get(deviceId)?.name ?? deviceId} is already at ${occupied} of ${ctx.comfortable.get(deviceId) ?? occupied} comfortable voices`,
    }
  }

  if (free !== undefined) {
    const devices = new Set(named.map((a) => a.deviceId)).size
    return {
      ...base,
      reason: 'no-room',
      capable: named,
      because: 'distinct',
      detail: `this ${request.role} must sit on a different device from the other ${request.role}, and only ${devices} in your rig can carry it`,
    }
  }

  // Every candidate is occupied. Name the first one and what it is carrying.
  const blocker = voiceable[0] as Candidate
  const holderId = firstOccupant(ctx, state, index, blocker)
  const holder = ctx.requests.find((r) => r.id === holderId)
  const deviceName = ctx.deviceById.get(blocker.assignable.deviceId)?.name ?? blocker.assignable.deviceId
  return {
    ...base,
    reason: 'no-room',
    capable: named,
    because: 'contended',
    detail: `the ${deviceName} ${blocker.assignable.label} is carrying ${holder?.role ?? holderId ?? 'another part'}`,
  }
}

/** The request already holding the first section of this candidate that we needed. */
function firstOccupant(
  ctx: Ctx,
  state: State,
  index: number,
  candidate: Candidate,
): RequestId | undefined {
  const bySection = state.occupancy.get(candidate.key)
  if (bySection === undefined) return undefined
  for (const section of ctx.sections[index] ?? []) {
    const holder = bySection.get(section)
    if (holder !== undefined) return holder
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export type AssignInput = {
  /**
   * Objects, never ids (#4): the caller resolves them, so a device that exists only at
   * runtime — a user overlay, a row from a database — resolves without a redeploy.
   */
  devices: readonly Device[]
  template: Template
  mood: MoodState
  seed: number
  nodeCap?: number
}

/** §7 step 6. Search assignments against the lexicographic objective, producing `Occupancy`. */
export function assign(input: AssignInput): AssignmentResult {
  const ctx = buildCtx(input)
  const outcome = search(ctx)

  // §7.1: on the cap, the greedy result stands and the fallback is reported. Reporting it in
  // the result rather than writing to a console keeps the resolver pure and the claim testable.
  const solution = outcome.capped ? greedy(ctx) : outcome.best ?? greedy(ctx)

  // Replay the winner to rebuild occupancy: the search unwinds its own state on the way out,
  // and a snapshot of every live Map at every improvement would cost more than one replay.
  const state = emptyState(ctx)
  const assignments: Assignment[] = []
  const unfilled: number[] = []
  for (let index = 0; index < ctx.requests.length; index++) {
    const request = ctx.requests[index] as RoleRequest
    const candidate = solution.chosen[index]
    if (candidate === null || candidate === undefined) {
      applyMiss(ctx, state, index)
      unfilled.push(index)
      continue
    }
    apply(ctx, state, index, candidate)
    assignments.push({
      requestId: request.id,
      role: request.role,
      character: ctx.wanted[index] as Character,
      assignable: candidate.assignable,
      deviceId: candidate.assignable.deviceId,
      recipe: candidate.recipe,
      outcome: candidate.outcome,
      recipeCharacter: candidate.recipeCharacter,
      sections: [...(ctx.sections[index] ?? [])],
    })
  }

  // Second pass: gaps are classified against the *finished* allocation, so "the LT is
  // carrying sub" can name a request that was decided after this one.
  const gaps = unfilled.map((index) => classify(ctx, state, index))

  return {
    assignments,
    occupancy: state.occupancy,
    score: scoreOf(ctx, state),
    gaps,
    search: {
      nodes: outcome.nodes,
      nodeCap: ctx.nodeCap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
  }
}
