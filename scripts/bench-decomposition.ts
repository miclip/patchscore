/**
 * #159's decomposition probe: does §7.1's search ever split into independent sub-problems?
 *
 * Decomposition is #159's item 1, and it stands or falls on its own — item 2, memoising on
 * canonical state, is a separate move that neither needs this to hold nor is refuted by it
 * failing. Two requests interact only if something in the objective or the constraints can see
 * them both. In §7.1 that is a
 * *device*-level relationship, not an assignable-level one:
 *
 *  - occupancy couples two requests that could take the same assignable;
 *  - `crowdOverflow` couples every request on one device, through `comfortableVoices`;
 *  - `idleDevices` couples every request that could have kept a device busy.
 *
 * The last two are per device, so device reach is the coupling. `buildCtx` already computes
 * exactly that set — `reach.push(new Set([...candidates.map(c => c.deviceId),
 * ...plans.map(p => p.deviceId)]))` — and it is the only thing this script reproduces. Nothing
 * here re-implements scoring or search: it re-runs the *candidate and stack construction*
 * through the same exported helpers `buildCtx` calls (`expand`, `resolveCharacter`,
 * `canCarryNotes`, `canStackNotes`, `resolveRecipe`, `stackRecipes`), in the same order and
 * with the same gates, and asks which devices survive.
 *
 * Two requests are then in the same component when their reach sets intersect, or when §12.6's
 * `distinct` binds them — same role, both flagged — transitively. That is #159's relation as it
 * is written there, and the second edge is device-level too, because `violatesDistinct` compares
 * `taken.deviceId`.
 *
 * A request whose reach is empty inside a given rig is a *forced miss*: the search has only the
 * miss branch there, so it is no sub-problem anyone could solve separately. Every count this
 * script prints is therefore a count of **branching** components, and forced misses are reported
 * apart from them rather than as singletons.
 *
 * Sections:
 *
 *   A  reproduce reach, and prove the reproduction is faithful — the union of the per-device
 *      reaches must equal the reach computed over the whole rig at once, or the per-device
 *      precompute section B depends on is not a decomposition of the real construction.
 *   B  `industrial-techno` over **every** subset of the shipped registry of size 2..19, at every
 *      point of the mood grid `{0, 50, 100}^5`.
 *   C  the templates x seeds baseline, with the cap lifted, so §7.1's 165,785 is a measurement
 *      here rather than a number copied forward.
 *
 *   npm run bench:decomposition
 */

import {
  DEFAULT_NODE_CAP,
  MOOD_AXES,
  assign,
  canCarryNotes,
  canStackNotes,
  compareCodeUnits,
  expand,
  moodState,
  resolveCharacter,
  resolveRecipe,
  stackRecipes,
  type Assignable,
  type Device,
  type DeviceId,
  type MoodState,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

// ---------------------------------------------------------------------------
// Formatting. No `toLocaleString` anywhere (invariant 6 / §7.2).
// ---------------------------------------------------------------------------

function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ---------------------------------------------------------------------------
// A. Reach, reproduced from the search's own candidate and stack construction
// ---------------------------------------------------------------------------

/**
 * The devices request `index` could occupy, ignoring occupancy — `buildCtx`'s `reach[index]`.
 *
 * Mirrors the body of `buildCtx`'s per-request loop exactly: role filter, then the two
 * capability routes, then the recipe resolution that drops `unvoiced`, then the per-pool stack
 * plans behind `canStackNotes` and a usable `stackRecipes` head. Requests come back in
 * `buildCtx`'s order — priority, then request id by code unit — so an index here is the same
 * index there.
 */
function reachOf(
  devices: readonly Device[],
  template: Template,
  mood: MoodState,
): { requestId: string; role: string; distinct: boolean; reach: Set<DeviceId> }[] {
  const assignables: Assignable[] = []
  const owner = new Map<Assignable, Device>()
  // Keyed exactly as `poolGroupKey` does, NUL separator and all, so a device whose pool id
  // collides with another's cannot merge two groups here and not there.
  const poolGroups = new Map<string, { device: Device; members: Assignable[] }>()
  for (const device of devices) {
    for (const assignable of expand(device)) {
      assignables.push(assignable)
      owner.set(assignable, device)
      const poolId = assignable.poolId
      if (poolId === undefined) continue
      const key = `${assignable.deviceId}\u0000${poolId}`
      const existing = poolGroups.get(key)
      if (existing === undefined) poolGroups.set(key, { device, members: [assignable] })
      else existing.members.push(assignable)
    }
  }

  const requests = [...template.roles].sort(
    (a, b) => a.priority - b.priority || compareCodeUnits(a.id, b.id),
  )

  return requests.map((request) => {
    const character = resolveCharacter(request.character, mood)
    const notes = request.polyphony ?? 1
    const reach = new Set<DeviceId>()

    for (const assignable of assignables) {
      if (!assignable.roles.includes(request.role)) continue
      const device = owner.get(assignable)
      if (device === undefined) continue
      if (
        !canCarryNotes(device, assignable, request.role, notes) &&
        !canStackNotes(device, assignable, request.role, notes)
      ) {
        continue
      }
      const resolution = resolveRecipe(device, assignable, request.role, character, notes)
      // The human ruling `buildCtx` records: unvoiced is not a candidate.
      if (resolution.outcome === 'unvoiced') continue
      reach.add(assignable.deviceId)
    }

    if (notes > 1) {
      for (const { device, members } of poolGroups.values()) {
        const representative = members[0]
        if (representative === undefined) continue
        if (!representative.roles.includes(request.role)) continue
        if (!canStackNotes(device, representative, request.role, notes)) continue
        if (stackRecipes(device, representative, request.role, character)[0] === undefined) {
          continue
        }
        reach.add(representative.deviceId)
      }
    }

    return {
      requestId: request.id,
      role: request.role as string,
      distinct: request.distinct === true,
      reach,
    }
  })
}

/** Each axis at its floor, its centre and its ceiling. */
const MOOD_LEVELS = [0, 50, 100] as const

/**
 * The full Cartesian grid, `{0, 50, 100}^5` — 243 settings.
 *
 * Not one axis at a time. `resolveCharacter` reads `darkness` and `grit` *together*, moving one
 * vector before taking the nearest character, so a combined state is not the union of two
 * single-axis states: `darkness 0` alone and `grit 0` alone can each leave a request's character
 * where it was while the pair moves it. Sweeping the axes singly would leave exactly the region
 * where a candidate list is most likely to empty out untested.
 *
 * Labels name only the axes that are off centre, so `neutral` reads as `neutral` and a combined
 * state reads as the two things that moved.
 */
function moodSettings(): { label: string; mood: MoodState }[] {
  let out: { label: string; mood: MoodState }[] = [{ label: '', mood: moodState() }]
  for (const axis of MOOD_AXES) {
    const next: { label: string; mood: MoodState }[] = []
    for (const entry of out) {
      for (const value of MOOD_LEVELS) {
        next.push({
          label:
            value === 50 ? entry.label : `${entry.label === '' ? '' : `${entry.label} `}${axis} ${value}`,
          mood: { ...entry.mood, [axis]: value },
        })
      }
    }
    out = next
  }
  return out.map((entry) => ({ ...entry, label: entry.label === '' ? 'neutral' : entry.label }))
}

function sectionA(): {
  settings: { label: string; mood: MoodState; masks: number[] }[]
  requestIds: string[]
  distinctGroup: number[]
} {
  console.log('A. REACH, reproduced from the search\'s candidate and stack construction')
  console.log(`   ${DEVICES.length} devices, direction ${industrialTechno.id}`)

  const shape = reachOf(DEVICES, industrialTechno, moodState())
  const requestIds = shape.map((r) => r.requestId)

  // §12.6's edge, as a group id per request: same role, both `distinct: true`, or -1 for a
  // request the constraint does not touch. Built once — neither the role nor the flag depends
  // on mood or on which devices are in the rig.
  const groupOf = new Map<string, number>()
  const distinctGroup = shape.map((r) => {
    if (!r.distinct) return -1
    const existing = groupOf.get(r.role)
    if (existing !== undefined) return existing
    const next = groupOf.size
    groupOf.set(r.role, next)
    return next
  })
  const bound = distinctGroup.filter((g) => g >= 0).length
  // No shipped direction uses `distinct`, so on this library the edge never fires and would go
  // out untested. Two fabricated requests on disjoint devices, bound by §12.6, must come back as
  // one component and must come back as two without the flag — otherwise the sweep below is
  // reporting a relation it does not actually implement.
  const joined = componentsOf([0b01, 0b10], [7, 7], 0b11).components
  const apart = componentsOf([0b01, 0b10], [-1, -1], 0b11).components
  if (joined !== 1 || apart !== 2) {
    throw new Error(`the §12.6 join is not wired: bound ${joined}, unbound ${apart}`)
  }
  console.log(
    `   §12.6 distinct: ${bound} of ${requestIds.length} requests carry it` +
      `${bound === 0 ? ' — the join is exercised by a self-check and idle on this direction' : ''}`,
  )

  // The faithfulness check the whole of B rests on. If the per-device reaches do not union to
  // the whole-rig reach, then reach is not a per-device property and no bitmask precompute is
  // allowed to stand in for re-running the construction per subset — so this throws rather than
  // printing a failure line above five million numbers that would then mean nothing.
  const settings: { label: string; mood: MoodState; masks: number[] }[] = []
  for (const { label, mood } of moodSettings()) {
    const whole = reachOf(DEVICES, industrialTechno, mood)
    const masks = new Array<number>(whole.length).fill(0)
    for (let d = 0; d < DEVICES.length; d++) {
      const device = DEVICES[d] as Device
      const single = reachOf([device], industrialTechno, mood)
      for (let i = 0; i < single.length; i++) {
        if ((single[i] as { reach: Set<DeviceId> }).reach.has(device.id)) {
          masks[i] = (masks[i] as number) | (1 << d)
        }
      }
    }
    for (let i = 0; i < whole.length; i++) {
      let expected = 0
      for (let d = 0; d < DEVICES.length; d++) {
        if ((whole[i] as { reach: Set<DeviceId> }).reach.has((DEVICES[d] as Device).id)) {
          expected |= 1 << d
        }
      }
      if (expected !== masks[i]) {
        throw new Error(
          `reach is not a per-device property: ${requestIds[i] as string} at mood ${label}` +
            ` unions to ${masks[i] as number} across singletons but is ${expected} on the whole` +
            ` rig. The subset sweep below would be measuring something else.`,
        )
      }
    }
    settings.push({ label, mood, masks })
  }
  console.log(
    `   union of the ${DEVICES.length} singleton reaches == whole-rig reach:` +
      ` OK, all ${settings.length} mood settings`,
  )

  const neutral = settings.find((x) => x.label === 'neutral') as { masks: number[] }
  console.log('\n   per request, at a neutral mood, on the whole 19-device rig')
  for (let i = 0; i < requestIds.length; i++) {
    const mask = neutral.masks[i] as number
    const names = DEVICES.filter((_, d) => (mask & (1 << d)) !== 0).map((x) => x.id)
    const width = names.length
    console.log(
      `     ${(requestIds[i] as string).padEnd(12)} ${String(width).padStart(2)}/19  ` +
        (width === 0 ? '(forced miss on any rig)' : names.join(' ')),
    )
  }

  // The five axes are not five inputs to reach. `resolveCharacter` reads `darkness` and `grit`
  // and nothing else, so `density`, `swing` and `space` cannot move a candidate list — report
  // which of the 243 settings collapse onto identical masks rather than implying 243 independent
  // sweeps. The `(darkness, grit)` pairs beside each group are the check on that claim: if a
  // group ever held two different pairs, or one pair appeared in two groups, the collapse would
  // be something other than "only these two axes matter".
  console.log(`\n   mood settings that produce identical reach, of ${group(settings.length)}`)
  const byKey = new Map<string, { labels: string[]; pairs: Set<string> }>()
  for (const s of settings) {
    const key = s.masks.join(',')
    const pair = `${s.mood.darkness}/${s.mood.grit}`
    const bucket = byKey.get(key)
    if (bucket === undefined) byKey.set(key, { labels: [s.label], pairs: new Set([pair]) })
    else {
      bucket.labels.push(s.label)
      bucket.pairs.add(pair)
    }
  }
  for (const { labels, pairs } of byKey.values()) {
    // The plainest member names the group: fewest axes off centre, then code unit order (§7.2).
    const named = [...labels].sort(
      (a, b) => a.length - b.length || compareCodeUnits(a, b),
    )[0] as string
    console.log(
      `     ${named.padEnd(24)} ${String(labels.length).padStart(3)} settings` +
        `   darkness/grit ${[...pairs].sort(compareCodeUnits).join(' ')}`,
    )
  }

  return { settings, requestIds, distinctGroup }
}

// ---------------------------------------------------------------------------
// B. Every device subset, size 2..19
// ---------------------------------------------------------------------------

/**
 * Connected components of the **branching** requests, inside one rig.
 *
 * #159's relation exactly: "Requests interact only through shared assignables, crowding on a
 * shared device, and `distinct` (§12.6). Join requests whose capable-device sets intersect."
 * So two edges, and both are device-level:
 *
 *  - reach sets intersect — which covers shared assignables and shared-device crowding, since
 *    an assignable belongs to exactly one device and `comfortableVoices` is per device;
 *  - `distinct` (§12.6), joining two requests that share a role and both carry `distinct: true`.
 *    `violatesDistinct` compares `taken.deviceId`, so the constraint binds at device level too,
 *    and joining unconditionally rather than only when the reaches already meet is the
 *    conservative direction: a pair whose reaches are disjoint cannot in fact bind, and merging
 *    them anyway can only *under*-report decomposition.
 *
 * Requests with an empty reach in this rig are **not** components. The search has only the miss
 * branch for them, so they are not a sub-problem anyone could solve separately; they are counted
 * as `forced` and everything reported as a component count is a count of branching requests.
 */
function componentsOf(
  masks: readonly number[],
  distinctGroup: readonly number[],
  subset: number,
): { components: number; largest: number; branching: number; forced: number } {
  const n = masks.length
  const live: number[] = []
  // `distinctGroup[i]` is a group id shared by same-role `distinct: true` requests, or -1.
  // Carried alongside the mask so the union below can see both edges at once.
  const liveGroup: number[] = []
  let forced = 0
  for (let i = 0; i < n; i++) {
    const m = (masks[i] as number) & subset
    if (m === 0) {
      forced++
      continue
    }
    live.push(m)
    liveGroup.push(distinctGroup[i] as number)
  }
  const k = live.length

  const parent = new Array<number>(k)
  for (let i = 0; i < k; i++) parent[i] = i
  const find = (x: number): number => {
    let r = x
    while ((parent[r] as number) !== r) r = parent[r] as number
    let c = x
    while ((parent[c] as number) !== c) {
      const next = parent[c] as number
      parent[c] = r
      c = next
    }
    return r
  }
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const overlap = ((live[i] as number) & (live[j] as number)) !== 0
      const bound =
        (liveGroup[i] as number) >= 0 && (liveGroup[i] as number) === (liveGroup[j] as number)
      if (!overlap && !bound) continue
      const a = find(i)
      const b = find(j)
      if (a !== b) parent[a] = b
    }
  }

  const sizes = new Map<number, number>()
  for (let i = 0; i < k; i++) {
    const root = find(i)
    sizes.set(root, (sizes.get(root) ?? 0) + 1)
  }
  let largest = 0
  for (const size of sizes.values()) if (size > largest) largest = size
  return { components: sizes.size, largest, branching: k, forced }
}

function popcount(x: number): number {
  let n = 0
  let v = x
  while (v !== 0) {
    v &= v - 1
    n++
  }
  return n
}

function sectionB(
  settings: { label: string; mood: MoodState; masks: number[] }[],
  requestIds: string[],
  distinctGroup: readonly number[],
): void {
  const total = 1 << DEVICES.length
  let subsetCount = 0
  for (let s = 0; s < total; s++) if (popcount(s) >= 2) subsetCount++

  console.log('\nB. EVERY DEVICE SUBSET OF SIZE 2..19, industrial-techno')
  console.log(
    `   ${group(subsetCount)} subsets x ${settings.length} mood settings` +
      ` = ${group(subsetCount * settings.length)} rigs`,
  )

  // Distinct mask tuples only. Every mood setting is still swept; settings whose reach is
  // byte-identical share one pass, which is an identity and not a sample.
  const distinct = new Map<string, string[]>()
  for (const s of settings) {
    const key = s.masks.join(',')
    const bucket = distinct.get(key)
    if (bucket === undefined) distinct.set(key, [s.label])
    else bucket.push(s.label)
  }
  console.log(
    `   ${group(distinct.size)} distinct reach groups among them, swept once each`,
  )

  const started = process.hrtime.bigint()
  for (const [key, labels] of distinct) {
    const masks = key.split(',').map((x) => Number(x))
    // Histogram of branching-component counts, and the worst split seen.
    const histogram = new Map<number, number>()
    let split = 0
    let bestSplit: { subset: number; components: number; largest: number; branching: number } | null =
      null
    let worstLargest = 0
    // Rig sizes at which a split survives at all. The question is not whether some two-box rig
    // decomposes but whether a rig anyone assembles does, so the size a split stops happening at
    // is the finding, not the raw count.
    const splitBySize = new Map<number, number>()
    let fullRigComponents = 0
    for (let subset = 0; subset < total; subset++) {
      const size = popcount(subset)
      if (size < 2) continue
      const r = componentsOf(masks, distinctGroup, subset)
      histogram.set(r.components, (histogram.get(r.components) ?? 0) + 1)
      if (r.largest > worstLargest) worstLargest = r.largest
      if (size === DEVICES.length) fullRigComponents = r.components
      if (r.components >= 2) {
        splitBySize.set(size, (splitBySize.get(size) ?? 0) + 1)
        split++
        if (bestSplit === null || r.largest < bestSplit.largest) {
          bestSplit = {
            subset,
            components: r.components,
            largest: r.largest,
            branching: r.branching,
          }
        }
      }
    }

    const named = [...labels].sort(
      (a, b) => a.length - b.length || compareCodeUnits(a, b),
    )[0] as string
    console.log(`\n   ${named}   (${labels.length} of ${group(settings.length)} mood settings)`)
    const counts = [...histogram.keys()].sort((a, b) => a - b)
    for (const c of counts) {
      console.log(
        `     ${c} branching component${c === 1 ? ' ' : 's'}` +
          `  ${group(histogram.get(c) as number).padStart(9)} subsets` +
          (c === 0 ? '  (every request a forced miss)' : ''),
      )
    }
    console.log(
      `     subsets that split into >= 2 branching components: ${group(split)}` +
        ` of ${group(subsetCount)}`,
    )
    console.log(
      `     largest branching component ever seen: ${worstLargest} of ${requestIds.length} requests`,
    )
    console.log(
      `     the whole ${DEVICES.length}-device rig: ${fullRigComponents}` +
        ` branching component${fullRigComponents === 1 ? '' : 's'}`,
    )
    if (splitBySize.size > 0) {
      const sizes = [...splitBySize.keys()].sort((a, b) => a - b)
      console.log(
        `     splits by rig size: ` +
          sizes.map((n) => `${n} devices x${group(splitBySize.get(n) as number)}`).join(', '),
      )
    }
    if (bestSplit !== null) {
      const found = bestSplit
      const names = DEVICES.filter((_, d) => (found.subset & (1 << d)) !== 0).map((x) => x.id)
      console.log(
        `     best split: ${found.components} branching components,` +
          ` largest ${found.largest} of ${found.branching} branching requests`,
      )
      console.log(`       rig: ${names.join(' ')}`)
    }
  }
  const ms = Number((process.hrtime.bigint() - started) / 1_000_000n)
  console.log(`\n   swept in ${group(ms)} ms`)
}

// ---------------------------------------------------------------------------
// C. The templates x seeds baseline, measured rather than copied
// ---------------------------------------------------------------------------

const SWEEP_SEEDS = Array.from({ length: 24 }, (_, i) => i)
/** High enough that nothing caps, so a worst case is a worst case and not a report of the cap. */
const LIFTED_CAP = 20_000_000

function sectionC(): void {
  console.log('\nC. BASELINE, cap lifted')
  console.log(
    `   ${DEVICES.length} devices, ${TEMPLATES.length} directions, seeds 0..23,` +
      ` cap ${group(LIFTED_CAP)} (shipped cap ${group(DEFAULT_NODE_CAP)})`,
  )

  let worst = { nodes: -1, where: '', ms: 0 }
  let capped = 0
  let overShipped = 0
  const perDirection: { id: string; nodes: number; seed: number; ms: number }[] = []
  for (const template of TEMPLATES) {
    let best = { nodes: -1, seed: -1, ms: 0 }
    for (const seed of SWEEP_SEEDS) {
      const started = process.hrtime.bigint()
      const result = assign({
        devices: DEVICES,
        template,
        mood: moodState(),
        seed,
        nodeCap: LIFTED_CAP,
      })
      const ms = Number((process.hrtime.bigint() - started) / 1_000_000n)
      if (result.search.capped) capped++
      if (result.search.nodes > DEFAULT_NODE_CAP) overShipped++
      if (result.search.nodes > best.nodes) best = { nodes: result.search.nodes, seed, ms }
    }
    perDirection.push({ id: template.id, ...best })
    if (best.nodes > worst.nodes) {
      worst = { nodes: best.nodes, where: `${template.id} seed ${best.seed}`, ms: best.ms }
    }
  }

  console.log('\n   per direction, worst over the seeds')
  for (const row of [...perDirection].sort((a, b) => (a.nodes > b.nodes ? -1 : a.nodes < b.nodes ? 1 : 0))) {
    console.log(
      `     ${row.id.padEnd(20)} ${group(row.nodes).padStart(9)} nodes  seed ${row.seed}` +
        `  ${group(row.ms)} ms`,
    )
  }
  console.log(
    `\n   worst ${group(worst.nodes)} nodes  ${worst.where}  ${group(worst.ms)} ms` +
      `   capped ${capped}   over the shipped cap ${overShipped} of ${TEMPLATES.length * SWEEP_SEEDS.length}`,
  )
}

// ---------------------------------------------------------------------------

const { settings, requestIds, distinctGroup } = sectionA()
sectionB(settings, requestIds, distinctGroup)
sectionC()
console.log()
