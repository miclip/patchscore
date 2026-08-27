import { describe, expect, it } from 'vitest'
import { assign, measureAssignWithoutMatchingRepair, compareScore, moodState } from '../lib/core/index'
import type {
  AssignmentResult,
  Character,
  Device,
  Role,
  RoleRequest,
  Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno, weave } from '../lib/templates/index'
import { bruteForceBest, box, keys, makeRecipe, placement, request, withRoles } from './rigs'

/**
 * §7.1/#78. `liveFloor`'s one-step matching repair — the part of the bound that knows two
 * remaining requests may be costed against the *same voice* and that §4.2 will not let both
 * have it.
 *
 * Everything here is an oracle comparison rather than an assertion about the floor's value.
 * `bruteForceBest` enumerates every legal assignment and scores it with a second implementation
 * of §7.1's vector, so a repair that overcharges — which is the failure mode, since an
 * inadmissible bound prunes the answer rather than producing a visibly wrong one — shows up as
 * the search and the oracle disagreeing. Asserting the floor directly would need it exported,
 * and would then be asserting the implementation against itself.
 *
 * The fixtures are built so the repair is not merely *available* but *decisive*: each one states
 * its premise as its own test, because a fixture that quietly stopped colliding would leave every
 * assertion below passing and meaning nothing.
 */

const MOOD = moodState({})
const SEEDS = Array.from({ length: 24 }, (_, i) => i)

function best(devices: Device[], template: Template, seed = 0) {
  return assign({ devices, template, mood: MOOD, seed, nodeCap: 20_000_000 })
}

/** The search and the oracle, on every seed. §7.2's seed permutes only exactly-equal scores. */
function agreesWithOracle(devices: Device[], template: Template): void {
  const oracle = bruteForceBest(devices, template)
  for (const seed of SEEDS) {
    const found = best(devices, template, seed)
    expect(found.search.capped, `capped on seed ${String(seed)}`).toBe(false)
    expect(
      compareScore(found.score, oracle),
      `seed ${String(seed)}: search ${JSON.stringify(found.score)} vs oracle ${JSON.stringify(oracle)}`,
    ).toBe(0)
  }
}

// ---------------------------------------------------------------------------
// A collision the repair has to break, and it costs something to break it
// ---------------------------------------------------------------------------

/**
 * `v1` is the cheapest voice for **both** requests: it plays kick at `roles` index 0 and snare at
 * index 1, and authors an exact recipe for each. Every other route is worse in some way, which
 * is what makes breaking the tie cost a real point rather than nothing.
 */
const shared = box('a-shared', {
  voices: [{ kind: 'fixed', id: 'v1', label: 'V1', roles: ['kick', 'snare'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('shared-kick', 'kick', 'hard', 'v1'), makeRecipe('shared-snare', 'snare', 'hard', 'v1')],
})

/** Plays the kick exactly, but the author listed the role second — so `roleFit` costs 1. */
const kickFallback = box('b-kick', {
  voices: [{ kind: 'fixed', id: 'w1', label: 'W1', roles: ['tom', 'kick'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('fallback-kick', 'kick', 'hard', 'w1')],
})

/** Plays the snare at `roles` index 0 but only at the wrong character — so `distance` costs. */
const snareFallback = box('c-snare', {
  voices: [{ kind: 'fixed', id: 'u1', label: 'U1', roles: ['snare'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('fallback-snare', 'snare', 'soft', 'u1')],
})

const pair: RoleRequest[] = [
  request({ id: 'r-kick', role: 'kick', priority: 1, character: 'hard' }),
  request({ id: 'r-snare', role: 'snare', priority: 2, character: 'hard' }),
]
const COLLIDING = [shared, kickFallback, snareFallback]
const bothWantOne = withRoles(pair)

describe('the matching repair breaks a contested voice (§7.1/#78)', () => {
  it('is a real collision: alone, each request takes the same voice', () => {
    // The premise. Both are asserted from the *public* search rather than read off the ladder,
    // so this stays true of whatever the floor is doing internally.
    const kickAlone = best(COLLIDING, withRoles([pair[0] as RoleRequest]))
    const snareAlone = best(COLLIDING, withRoles([pair[1] as RoleRequest]))
    expect(placement(kickAlone, 'r-kick')).toBe('a-shared/v1')
    expect(placement(snareAlone, 'r-snare')).toBe('a-shared/v1')
  })

  it('agrees with the oracle once they have to share', () => {
    agreesWithOracle(COLLIDING, bothWantOne)
  })

  it('gives the voice to the request whose alternative is worse', () => {
    // `recipeDistance` outranks `roleFitPenalty`, so the snare — whose only other route is a
    // substituted recipe — keeps `v1`, and the kick takes the exact recipe at the worse role
    // index. This is `compareGiveUp`'s answer, and it is also the true optimum.
    const found = best(COLLIDING, bothWantOne)
    expect(placement(found, 'r-snare')).toBe('a-shared/v1')
    expect(placement(found, 'r-kick')).toBe('b-kick/w1')
    expect(keys(found.score).recipeDistance).toBe(0)
    expect(keys(found.score).roleFitPenalty).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// The alternative is a miss, which is the branch the shipped library never takes
// ---------------------------------------------------------------------------

/**
 * Instrumenting the repair over all seven shipped directions and 24 seeds found **not one**
 * bucket member whose escape from the contested voice was a miss — every one of them had another
 * voice to go to. So the branch that costs a miss, and `compareGiveUp`'s rank ordering that
 * decides *which* request eats it, are exercised here or nowhere.
 */
const ONLY_SHARED = [shared]

describe('the matching repair costs a miss when there is nowhere else to go (§7.1/#78)', () => {
  it('agrees with the oracle', () => {
    agreesWithOracle(ONLY_SHARED, bothWantOne)
  })

  it('spends the voice on the higher priority and reports the other as no-room', () => {
    const found = best(ONLY_SHARED, bothWantOne)
    expect(placement(found, 'r-kick')).toBe('a-shared/v1')
    expect(placement(found, 'r-snare')).toBeUndefined()
    const shortfall = found.shortfalls.find((s) => s.requestId === 'r-snare')
    expect(shortfall?.reason).toBe('no-room')
    expect(keys(found.score).misses).toEqual([0, 1])
  })
})

// ---------------------------------------------------------------------------
// §4.2. Transient requests share voices legally, and must not be repaired
// ---------------------------------------------------------------------------

/**
 * **The rule the repair rests on, stated as the case that breaks it.**
 *
 * The exclusion is that two *continuous* requests cannot share an assignable — each occupies
 * every section, so neither can take a voice the other has. §4.2 says nothing of the kind about
 * a transient request: two of them in disjoint sections share one voice quite legally, which is
 * the whole reason occupancy is per-section. Bucket them and the floor charges one of them for
 * moving off a voice it was never going to be evicted from, which makes the bound exceed the
 * true optimum — and a bound that exceeds the optimum prunes it.
 *
 * Six of the forty-eight authored requests are transient and none of them collide, so the
 * shipped library would not have caught this either.
 */
const TRANSIENT_PAIR: RoleRequest[] = [
  request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: ['Intro'] }),
  request({ id: 't-snare', role: 'snare', priority: 2, character: 'hard', sustain: 'transient', sections: ['Drop'] }),
]
const sharesLegally = withRoles(TRANSIENT_PAIR)

describe('§4.2 transient requests share a voice and are not repaired (§7.1/#78)', () => {
  it('is a real collision: alone, each request takes the same voice', () => {
    const kickAlone = best(COLLIDING, withRoles([TRANSIENT_PAIR[0] as RoleRequest]))
    const snareAlone = best(COLLIDING, withRoles([TRANSIENT_PAIR[1] as RoleRequest]))
    expect(placement(kickAlone, 't-kick')).toBe('a-shared/v1')
    expect(placement(snareAlone, 't-snare')).toBe('a-shared/v1')
  })

  it('agrees with the oracle, which lets them share', () => {
    agreesWithOracle(COLLIDING, sharesLegally)
    agreesWithOracle(ONLY_SHARED, sharesLegally)
  })

  it('really does put both on the one voice, in disjoint sections', () => {
    for (const rig of [COLLIDING, ONLY_SHARED]) {
      const found = best(rig, sharesLegally)
      expect(placement(found, 't-kick')).toBe('a-shared/v1')
      expect(placement(found, 't-snare')).toBe('a-shared/v1')
      expect(keys(found.score).misses).toEqual([0, 0])
    }
  })

  it('is not repaired even when one of the pair is continuous', () => {
    // A mixed bucket is the subtler version: the continuous one may be bucketed and the
    // transient one may not, and a repair that bucketed both would evict a request §4.2 was
    // going to let stay.
    const mixed = withRoles([
      request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: ['Intro'] }),
      request({ id: 'r-snare', role: 'snare', priority: 2, character: 'hard' }),
    ])
    agreesWithOracle(COLLIDING, mixed)
    agreesWithOracle(ONLY_SHARED, mixed)
  })
})

// ---------------------------------------------------------------------------
// The generator, shared by both sweeps
// ---------------------------------------------------------------------------

/**
 * **An inadmissible bound does not produce a visibly wrong answer. It produces a *missing* one**,
 * and only when the answer it prunes had not already been found by some other path — which on a
 * two-request fixture it almost always has, because `orderedCandidates` is greedy and the greedy
 * path on a tiny tree is usually optimal. Every hand-built case above was checked against a
 * deliberately broken `compareGiveUp`, and three of the four breakages sailed through all of
 * them. The rigs where a wrong repair actually costs the optimum are ones whose first leaf is
 * *not* optimal, and those are easier to generate than to design.
 *
 * One generator, two sweeps below, because they answer different questions and neither implies
 * the other: whether the repaired floor still finds the optimum (against `bruteForceBest`, an
 * independent enumeration), and whether it finds the *same guide* the unrepaired floor did
 * (against `measureAssignWithoutMatchingRepair`, the same code with the repair switched off).
 *
 * Deterministic throughout — an LCG keyed on the fixture number, seeds 0..7 — so a failure names
 * a fixture that can be rebuilt exactly. No `Math.random`: a fuzz test nobody can reproduce is a
 * flake generator.
 *
 * It carries every shape the repair has an opinion about, because a generator that emits only
 * plain continuous singles is blind to most of the argument:
 *
 *  - **transient** requests, which §4.2 lets share a voice and the repair must therefore leave
 *    alone. Without these, a `continuous` guard deleted from the bucketing passes everything.
 *  - **optional** requests, whose miss is charged below `crowdOverflow` rather than above it.
 *  - **`distinct`** pairs (§12.6), a constraint the floor deliberately ignores.
 *  - **pools**, where `breakPoolSymmetry` and the repair both have a claim on the same voices.
 *  - **multi-note** requests, reaching both routes §12.4 allows — a `sampled-chord` recipe on one
 *    voice, and a stack across a pool, which the floor treats as conflict-free and the repair
 *    must therefore never bucket.
 */
function lcg(seed: number): (n: number) => number {
  let s = (seed * 2654435761) >>> 0
  return (n: number) => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s % n
  }
}

const SWEEP_ROLES: Role[] = ['kick', 'snare', 'closed-hat', 'sub', 'bass-mid', 'pad']
const SWEEP_CHARS: Character[] = ['hard', 'soft', 'dark', 'bright']
/** The three sections `test/fixtures.ts` gives every generated template. */
const SWEEP_SECTIONS = ['Intro', 'Build', 'Drop']

/**
 * `wide` is the one knob, and it exists because the two sweeps can afford different sizes.
 * `bruteForceBest` enumerates every legal assignment, so its sweep has to stay at two to four
 * requests over six roles; the differential sweep runs no oracle and can take four to seven
 * requests over four roles, which is where voices actually get contested. On the narrow setting
 * the repair fires on well under 1% of the pairs — enough to be exercised, not enough to be a
 * test of it.
 */
function generated(fixture: number, wide = false): { devices: Device[]; template: Template } {
  const r = lcg(wide ? fixture + 5_000_000 : fixture)
  const roleSource = wide ? SWEEP_ROLES.slice(0, 4) : SWEEP_ROLES
  const devices: Device[] = []
  const deviceCount = 2 + r(wide ? 4 : 3)
  for (let d = 0; d < deviceCount; d++) {
    const id = `box-${String.fromCharCode(97 + d)}`
    const voices = []
    const recipes = []
    const roleFor = (): Role[] => {
      const roles: Role[] = []
      const roleCount = 1 + r(3)
      for (let k = 0; k < roleCount; k++) {
        const role = roleSource[r(roleSource.length)] as Role
        if (!roles.includes(role)) roles.push(role)
      }
      return roles
    }
    // A third of the boxes are pool devices, which is where symmetry breaking and stacking live.
    if (r(3) === 0) {
      const roles = roleFor()
      const count = 2 + r(3)
      const polyphony = 1 + r(2)
      voices.push({ kind: 'pool' as const, id: 'track', label: 'Track', count, roles, polyphony })
      for (const role of roles) {
        if (r(4) === 0) continue
        const character = SWEEP_CHARS[r(SWEEP_CHARS.length)] as Character
        // Left at the default `polyphonic-voice`, which is what `canStackNotes` requires — so a
        // pool of monophonic tracks can spread a chord and the stack route is really reachable.
        recipes.push(makeRecipe(`${id}-track-${role}`, role, character, 'track'))
      }
      devices.push(box(id, { voices, recipes, comfortableVoices: 1 + r(count) }))
      continue
    }
    const voiceCount = 1 + r(2)
    for (let v = 0; v < voiceCount; v++) {
      const roles = roleFor()
      const vid = `v${String(v)}`
      voices.push({ kind: 'fixed' as const, id: vid, label: vid.toUpperCase(), roles, polyphony: 1 })
      for (const role of roles) {
        // A quarter of the role declarations get no recipe, so `unvoiced` and the gap it produces
        // are in the sweep rather than only the happy path.
        if (r(4) === 0) continue
        const character = SWEEP_CHARS[r(SWEEP_CHARS.length)] as Character
        // §12.4's other route: one monophonic voice reaching a chord from a sample.
        const sampled = r(4) === 0
        recipes.push(
          makeRecipe(
            `${id}-${vid}-${role}${sampled ? '-chord' : ''}`,
            role,
            character,
            vid,
            sampled ? { realisation: 'sampled-chord' } : {},
          ),
        )
      }
    }
    devices.push(box(id, { voices, recipes, comfortableVoices: 1 + r(voiceCount) }))
  }

  const roles: RoleRequest[] = []
  const requestCount = wide ? 4 + r(4) : 2 + r(3)
  for (let i = 0; i < requestCount; i++) {
    const base = {
      id: `q${String(i)}`,
      role: roleSource[r(roleSource.length)] as Role,
      priority: 1 + r(3),
      character: SWEEP_CHARS[r(SWEEP_CHARS.length)] as Character,
    }
    const extra: Partial<RoleRequest> = {}
    // §4.4/#81: `optional` is a claim about the objective and `inessential` the claim to the
    // reader, and the schema requires the second wherever the first is made.
    if (r(5) === 0) {
      extra.optional = true
      extra.inessential = { reason: 'generated fixture' }
    }
    // §12.4: more notes than one voice of most of these rigs has.
    if (r(5) === 0) extra.polyphony = 2 + r(2)
    if (r(3) !== 0) {
      roles.push(request({ ...base, ...extra }))
      continue
    }
    const wanted = SWEEP_SECTIONS.filter(() => r(2) === 0)
    roles.push(
      request({
        ...base,
        ...extra,
        sustain: 'transient',
        sections: wanted.length > 0 ? wanted : [SWEEP_SECTIONS[r(SWEEP_SECTIONS.length)] as string],
      }),
    )
  }
  // §12.6: a quarter of the fixtures make their first two requests a `distinct` pair on one
  // role — two toms that are meant to be two boxes.
  if (r(4) === 0 && roles.length >= 2) {
    const role = roleSource[r(roleSource.length)] as Role
    for (const i of [0, 1]) {
      roles[i] = request({ ...(roles[i] as RoleRequest), role, distinct: true, polyphony: undefined })
    }
  }
  return { devices, template: withRoles(roles) }
}

// ---------------------------------------------------------------------------
// Sweep one: the repair changes nothing but the node count
// ---------------------------------------------------------------------------

/**
 * A **total, order-stable spelling of a whole `AssignmentResult`**, for diffing two of them.
 *
 * Total by construction rather than by a list of fields somebody has to remember to extend:
 * `stable` walks whatever is there, sorts object keys and `Map` entries by code unit, and
 * distinguishes an absent key from one holding `undefined` — which `JSON.stringify` alone does
 * not, and which is exactly how a dropped optional field would hide. So it compares score,
 * assignments in order, their voices, sections, recipes and every param and citation inside
 * them, occupancy per assignable per section, shortfalls with their reasons, causes and capable
 * lists, and the cap and method.
 *
 * `search.nodes` is the one thing left out, because it is the one thing the two paths are
 * *meant* to differ on. Everything else differing is the bug this sweep is looking for.
 */
function stable(value: unknown): unknown {
  if (value === undefined) return '\u0000undefined'
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stable)
  if (value instanceof Map) {
    return {
      '\u0000map': [...value.entries()]
        .map(([k, v]) => [String(k), stable(v)] as const)
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    }
  }
  if (value instanceof Set) {
    return {
      '\u0000set': [...value].map((v) => String(v)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    }
  }
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    out[key] = stable(source[key])
  }
  return out
}

function shapeOf(result: AssignmentResult): string {
  const { nodes: _nodes, ...report } = result.search
  return JSON.stringify(
    stable({
      score: result.score,
      // Unsorted on purpose. Both paths walk `ctx.requests` in the same order, so the order is
      // part of what has to match; sorting first would forgive a reordering that nothing should
      // be able to cause.
      assignments: result.assignments,
      shortfalls: result.shortfalls,
      occupancy: result.occupancy,
      search: report,
    }),
  )
}

describe('the matching repair changes only the node count (§7.1/#78)', () => {
  it('produces the same guide as the unrepaired floor on 2,000 generated rigs', () => {
    let checked = 0
    let differed = 0
    for (let fixture = 0; fixture < 2000; fixture++) {
      const { devices, template } = generated(fixture, true)
      for (let seed = 0; seed < 8; seed++) {
        const input = { devices, template, mood: MOOD, seed, nodeCap: 20_000_000 }
        const repaired = assign(input)
        const plain = measureAssignWithoutMatchingRepair(input)
        expect(
          shapeOf(repaired),
          `fixture ${String(fixture)} seed ${String(seed)}: the repair moved something ` +
            `other than the node count`,
        ).toBe(shapeOf(plain))
        // The cap is lifted clear on both, so neither is allowed to degrade to greedy — a pair
        // that both capped would agree trivially and prove nothing.
        expect(repaired.search.capped).toBe(false)
        expect(plain.search.capped).toBe(false)
        if (repaired.search.nodes !== plain.search.nodes) differed++
        checked++
      }
    }
    // Two premises. A sweep that silently stopped generating would pass in silence, and a sweep
    // where the repair never fired would be comparing the same code with itself.
    expect(checked).toBe(16_000)
    // The second premise, and the one that makes the first mean anything: **the two paths have
    // to actually diverge**. A differential test between a floor and itself passes perfectly.
    // 2,459 of the 16,000 pairs walked a different number of nodes when this was written; the
    // threshold is set well below that, because the figure is allowed to drift and zero is not.
    expect(differed, 'the repair never pruned anything, so this sweep proves nothing').
      toBeGreaterThan(1000)
  })
})

// ---------------------------------------------------------------------------
// Sweep two: and the answer is still the optimum
// ---------------------------------------------------------------------------

/**
 * The independent half. Sweep one would pass if both paths were wrong in the same way — they are
 * the same code either side of one branch, and that is precisely what a differential test cannot
 * see. `bruteForceBest` enumerates every legal assignment and scores it with a second
 * implementation of §7.1's vector, sharing no path with the search beyond the public helpers.
 *
 * It is a net rather than a proof, and it is a net with a known hole: an `alternativeTo` that
 * drops the stack option passes every fixture here, correctly, because ignoring an option only
 * lowers the floor and a lower floor is always admissible. What it does catch, and what nothing
 * else here caught, is every way of handing the contested voice to the wrong request.
 */
describe('the repaired floor still finds the optimum (§7.1/#78)', () => {
  it('agrees with brute force on 1,700 generated rigs, eight seeds each', () => {
    let checked = 0
    for (let fixture = 0; fixture < 1700; fixture++) {
      const { devices, template } = generated(fixture)
      const oracle = bruteForceBest(devices, template)
      for (let seed = 0; seed < 8; seed++) {
        const found = assign({ devices, template, mood: MOOD, seed, nodeCap: 20_000_000 })
        expect(found.search.capped, `fixture ${String(fixture)} seed ${String(seed)} capped`).toBe(false)
        expect(
          compareScore(found.score, oracle),
          `fixture ${String(fixture)} seed ${String(seed)}: ` +
            `search ${JSON.stringify(found.score)} vs oracle ${JSON.stringify(oracle)}`,
        ).toBe(0)
        checked++
      }
    }
    expect(checked).toBe(13_600)
  })
})

describe('the baseline path really is the floor as it stood (§7.1/#78)', () => {
  /**
   * `measureAssignWithoutMatchingRepair` is only worth diffing against if it is the *old* search rather
   * than a plausible reconstruction of it, and the way to know is that it still walks the tree
   * the old search walked. It does, on every one of the 168 searches in
   * `test/search-bound.test.ts`'s matrix; this pins the one that matters most.
   *
   * 165,785 is the figure that runs through all of this work — the worst case in that matrix, the
   * precondition in `scripts/bench-bound.ts`, and the measurement `DEFAULT_NODE_CAP` was last
   * raised against. It belongs to the *unrepaired* floor, so re-recording the matrix for the
   * repaired search leaves it untouched. It moves only when a device or a direction moves.
   */
  it('walks the recorded 165,785 nodes on industrial-techno seed 9', () => {
    const input = {
      devices: [...DEVICES],
      template: industrialTechno,
      mood: MOOD,
      seed: 9,
      nodeCap: 20_000_000,
    }
    expect(measureAssignWithoutMatchingRepair(input).search.nodes).toBe(165_785)
    // And the repaired floor is emphatically not walking it.
    expect(assign(input).search.nodes).toBeLessThan(20_000)
  })
})

describe('the repair prunes, rather than merely being admissible (§7.1/#78)', () => {
  const RIG = DEVICES.filter((d) =>
    ['roland-tr-8s', 'synthstrom-deluge', 'elektron-digitakt-ii'].includes(d.id),
  )

  it('is the rig it says it is', () => {
    expect(RIG).toHaveLength(3)
  })

  it('walks far fewer nodes than the unrepaired floor would', () => {
    for (const seed of SEEDS) {
      const found = assign({ devices: [...RIG], template: weave, mood: MOOD, seed, nodeCap: 20_000_000 })
      expect(found.search.capped).toBe(false)
      expect(found.search.nodes, `seed ${String(seed)}, unrepaired walks 157`).toBeLessThan(80)
    }
  })
})
