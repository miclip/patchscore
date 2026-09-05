import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assign, measureAssignWithoutMatchingRepair, compareScore, moodState } from '../lib/core/index'
import type {
  AssignInput,
  AssignmentResult,
  Character,
  Device,
  Role,
  RoleRequest,
  Score,
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
    // The snare keeps `v1` because its escape is a **miss**: `c-snare` authors the part at
    // `soft`, and a `hard` request cannot substitute that far — `resolveRecipe` returns
    // `no-recipe`, which is why `ONLY_SHARED` below can reuse the same pair. A miss outranks
    // every key a landed option charges, so `compareGiveUp` hands the voice to the snare, and
    // the kick takes its exact recipe at the worse role index. That is also the true optimum.
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
// §4.2. A bucket is a clique in "shares a section", and a transient may be in it
// ---------------------------------------------------------------------------

/**
 * **The rule the repair rests on, stated as the cases either side of it.**
 *
 * The exclusion is pairwise and it is about sections, not about `sustain`: two requests may
 * share one assignable exactly when they occupy no section in common, so a bucket has to be a
 * set in which *every* pair overlaps. Continuous requests are that for free — `sectionsFor`
 * hands each of them the whole structure. A transient request is in or out on the same test.
 *
 * Both answers matter, and they fail in opposite directions. Bucket a pair §4.2 was going to
 * let share and the floor charges an eviction that never happens: the bound rises above the
 * optimum and **prunes it**, which is a missing answer rather than a visibly wrong one. Refuse
 * to bucket a pair that really does contend and the bound is merely weaker — which is what
 * `ambient-dub` was paying, 25,798 nodes against 759, for one transient request in nine.
 *
 * The three sections are `test/fixtures.ts`'s: Intro, Build, Drop.
 */
const DISJOINT_PAIR: RoleRequest[] = [
  request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: ['Intro'] }),
  request({ id: 't-snare', role: 'snare', priority: 2, character: 'hard', sustain: 'transient', sections: ['Drop'] }),
]
const sharesLegally = withRoles(DISJOINT_PAIR)

/** The same two parts, moved so that both are in Build. Now they contend, and the floor may say so. */
const OVERLAPPING_PAIR: RoleRequest[] = [
  request({
    id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient',
    sections: ['Intro', 'Build'],
  }),
  request({
    id: 't-snare', role: 'snare', priority: 2, character: 'hard', sustain: 'transient',
    sections: ['Build', 'Drop'],
  }),
]
const contendInBuild = withRoles(OVERLAPPING_PAIR)

/** One of each. A continuous request occupies every section, so it overlaps any transient that
 * occupies one — the mixed pair is always a clique, and it is the shape the shipped library
 * actually has. */
const mixedPair = withRoles([
  request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: ['Intro'] }),
  request({ id: 'r-snare', role: 'snare', priority: 2, character: 'hard' }),
])

describe('§4.2 disjoint sections share a voice and are not repaired (§7.1/#78)', () => {
  it('is a real collision: alone, each request takes the same voice', () => {
    const kickAlone = best(COLLIDING, withRoles([DISJOINT_PAIR[0] as RoleRequest]))
    const snareAlone = best(COLLIDING, withRoles([DISJOINT_PAIR[1] as RoleRequest]))
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
})

describe('§4.2 transient requests that overlap are bucketed like any other (§7.1/#78)', () => {
  it('is a real collision: alone, each request takes the same voice', () => {
    const kickAlone = best(COLLIDING, withRoles([OVERLAPPING_PAIR[0] as RoleRequest]))
    const snareAlone = best(COLLIDING, withRoles([OVERLAPPING_PAIR[1] as RoleRequest]))
    expect(placement(kickAlone, 't-kick')).toBe('a-shared/v1')
    expect(placement(snareAlone, 't-snare')).toBe('a-shared/v1')
  })

  it('agrees with the oracle, which does not let them share', () => {
    agreesWithOracle(COLLIDING, contendInBuild)
    agreesWithOracle(ONLY_SHARED, contendInBuild)
  })

  it('splits them, exactly as it splits two continuous requests', () => {
    // Both want Build, so §4.2 gives the voice to one of them — the same answer the continuous
    // pair gets, and `compareGiveUp` hands it to the same request for the same reason.
    const found = best(COLLIDING, contendInBuild)
    expect(placement(found, 't-snare')).toBe('a-shared/v1')
    expect(placement(found, 't-kick')).toBe('b-kick/w1')
  })

  it('reports one of them as no-room when the shared voice is the only one', () => {
    const found = best(ONLY_SHARED, contendInBuild)
    expect(placement(found, 't-kick')).toBe('a-shared/v1')
    expect(placement(found, 't-snare')).toBeUndefined()
    expect(keys(found.score).misses).toEqual([0, 1])
  })
})

describe('§4.2 a mixed bucket is a clique, so the transient is in it (§7.1/#78)', () => {
  it('agrees with the oracle', () => {
    agreesWithOracle(COLLIDING, mixedPair)
    agreesWithOracle(ONLY_SHARED, mixedPair)
  })

  it('splits them: the continuous request occupies Intro too', () => {
    const found = best(ONLY_SHARED, mixedPair)
    expect(placement(found, 't-kick')).toBe('a-shared/v1')
    expect(placement(found, 'r-snare')).toBeUndefined()
    expect(keys(found.score).misses).toEqual([0, 1])
  })
})

/**
 * The diagonal of `ctx.overlap`, which is the degenerate case the pairwise test also has to
 * answer: a request that occupies **no** section conflicts with nobody, including a copy of
 * itself, so it must never be bucketed.
 *
 * `parseTemplate` refuses this shape — a transient request must list at least one section and
 * every name must be in the structure (§4.2) — and `assign` does not parse its input, so the
 * only way here is a hand-built `Template`, which is exactly what every test in this file uses.
 * The guard is one array read and it is the same read the pairs make.
 */
const offStructure = withRoles([
  request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: ['Nowhere'] }),
  request({ id: 't-snare', role: 'snare', priority: 2, character: 'hard', sustain: 'transient', sections: ['Nowhere'] }),
])

describe('§4.2 a request occupying no section is not bucketed (§7.1/#78)', () => {
  it('lets both have the one voice, and charges neither a miss', () => {
    const found = best(ONLY_SHARED, offStructure)
    expect(placement(found, 't-kick')).toBe('a-shared/v1')
    expect(placement(found, 't-snare')).toBe('a-shared/v1')
    expect(keys(found.score).misses).toEqual([0, 0])
  })
})

// ---------------------------------------------------------------------------
// Three on one voice, where the clique is a choice rather than the whole group
// ---------------------------------------------------------------------------

/**
 * `v1` is the cheapest voice for all three parts, so the bucket on it has three candidates. The
 * role order is `snare` first so that the snare's seat here beats its exact-recipe escape
 * outright rather than tying with it — a tie would be resolved by the seed (§7.2), and a premise
 * that moves with the seed is not a premise.
 */
const shared3 = box('a-shared3', {
  voices: [{ kind: 'fixed', id: 'v1', label: 'V1', roles: ['snare', 'kick', 'closed-hat'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [
    makeRecipe('shared3-kick', 'kick', 'hard', 'v1'),
    makeRecipe('shared3-snare', 'snare', 'hard', 'v1'),
    makeRecipe('shared3-hat', 'closed-hat', 'hard', 'v1'),
  ],
})
/**
 * The two ends of the chain pay `recipeDistance` to leave `v1` and the middle pays only
 * `roleFitPenalty`, so the optimum is the two disjoint ends sharing the voice — the arrangement
 * a bucket of all three would charge an eviction for. `dark` rather than `soft` because a `hard`
 * request cannot substitute a `soft` recipe at all: that pairing is outside the radius
 * `resolveRecipe` allows and comes back `no-recipe`, which is a miss and not a distance.
 */
const kickDistance = box('b-kick3', {
  voices: [{ kind: 'fixed', id: 'w1', label: 'W1', roles: ['kick'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('distance-kick', 'kick', 'dark', 'w1')],
})
const hatDistance = box('d-hat3', {
  voices: [{ kind: 'fixed', id: 'x1', label: 'X1', roles: ['closed-hat'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('distance-hat', 'closed-hat', 'dark', 'x1')],
})
/** Exact recipe, second in `roles` — the cheap escape, on the key `recipeDistance` outranks. */
const snareFit = box('c-snare3', {
  voices: [{ kind: 'fixed', id: 'u1', label: 'U1', roles: ['tom', 'snare'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('fit-snare', 'snare', 'hard', 'u1')],
})
const TRIO = [shared3, kickDistance, snareFit, hatDistance]

function trio(sections: string[][]): Template {
  return withRoles([
    request({ id: 't-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'transient', sections: sections[0] }),
    request({ id: 't-snare', role: 'snare', priority: 2, character: 'hard', sustain: 'transient', sections: sections[1] }),
    request({ id: 't-hat', role: 'closed-hat', priority: 3, character: 'hard', sustain: 'transient', sections: sections[2] }),
  ])
}

describe('a bucket of three, and a bucket that could only be two (§7.1/#78)', () => {
  it('is a real collision: alone, each of the three takes the same voice', () => {
    const all = trio([['Intro'], ['Intro'], ['Intro']])
    for (const role of all.roles) {
      const alone = best(TRIO, withRoles([role]))
      expect(placement(alone, role.id), role.id).toBe('a-shared3/v1')
    }
  })

  it('agrees with the oracle when all three pairs overlap', () => {
    // Intro∩Build, Build∩Drop, Drop∩Intro — a triangle, so the whole group is one clique and
    // exactly one of the three keeps `v1`.
    agreesWithOracle(TRIO, trio([['Intro', 'Build'], ['Build', 'Drop'], ['Drop', 'Intro']]))
  })

  it('agrees with the oracle on a chain, where the clique cannot be all three', () => {
    // Intro / Intro+Drop / Drop. The first and the last are disjoint and may share `v1`; the
    // middle one overlaps both. No clique holds all three, and the greedy cover takes the first
    // two and leaves the third to its unrepaired cheapest.
    agreesWithOracle(TRIO, trio([['Intro'], ['Intro', 'Drop'], ['Drop']]))
  })

  it('really does put the two disjoint ends on the one voice', () => {
    // The observable that a bucket of all three would have destroyed: the kick and the hat
    // legally share `v1`, and it is the snare in the middle that has to move.
    const found = best(TRIO, trio([['Intro'], ['Intro', 'Drop'], ['Drop']]))
    expect(placement(found, 't-kick')).toBe('a-shared3/v1')
    expect(placement(found, 't-hat')).toBe('a-shared3/v1')
    expect(placement(found, 't-snare')).toBe('c-snare3/u1')
    expect(keys(found.score).recipeDistance).toBe(0)
    expect(keys(found.score).misses).toEqual([0, 0, 0])
  })
})

// ---------------------------------------------------------------------------
// Where a wrong bucket actually costs the answer
// ---------------------------------------------------------------------------

/**
 * **The fixtures above cannot catch an over-charging bucket, and that is not a slip.**
 *
 * An inadmissible floor prunes the optimum, and pruning it only loses it if it had not already
 * been found — so on any rig whose *first* leaf is optimal, every wrong bucket in the world is
 * invisible. `orderedCandidates` is greedy and the first leaf of a two-request fixture is
 * almost always optimal, which is why the mutation battery below reports three of six breakages
 * as surviving everything else in this file.
 *
 * This rig is built the other way round. `v1` plays all four roles and plays them exactly, so
 * the first leaf gives it to the continuous sub — and the two transients, locked out of every
 * section by a request that occupies all of them, each pay a substituted recipe. The optimum is
 * the sub stepping off `v1` and paying one substitution so that the two transients, whose
 * sections are disjoint, can legally share it. `recipeDistance` outranks `roleFitPenalty`, so
 * one substitution beats two and the optimum is real; it is also two levels down, which is what
 * puts it behind the bound.
 *
 * Bucket that disjoint pair and the floor charges one of them a substitution it will not pay.
 * The bound at "the sub stepped off" then ties the first leaf's distance and loses on role fit,
 * the branch is cut, and the search reports the first leaf. That is the whole failure mode, in
 * one rig of five boxes.
 */
const allFour = box('p-one', {
  voices: [
    { kind: 'fixed', id: 'v1', label: 'V1', roles: ['sub', 'kick', 'snare', 'closed-hat'], polyphony: 1 },
  ],
  comfortableVoices: 1,
  recipes: [
    makeRecipe('one-sub', 'sub', 'hard', 'v1'),
    makeRecipe('one-kick', 'kick', 'hard', 'v1'),
    makeRecipe('one-snare', 'snare', 'hard', 'v1'),
    makeRecipe('one-hat', 'closed-hat', 'hard', 'v1'),
  ],
})

/** One role, authored at `dark` — reachable from a `hard` request, and it costs a substitution. */
function elsewhere(id: string, voiceId: string, role: Role): Device {
  return box(id, {
    voices: [{ kind: 'fixed', id: voiceId, label: voiceId.toUpperCase(), roles: [role], polyphony: 1 }],
    comfortableVoices: 1,
    recipes: [makeRecipe(`${id}-${role}`, role, 'dark', voiceId)],
  })
}

const BLOCKING = [
  allFour,
  elsewhere('p-sub', 's1', 'sub'),
  elsewhere('p-kick', 'k1', 'kick'),
  elsewhere('p-snare', 'n1', 'snare'),
  elsewhere('p-hat', 'h1', 'closed-hat'),
]

/** The continuous sub in front, then one transient per section list given. */
function blocked(sections: string[][]): Template {
  const ids = ['t-kick', 't-snare', 't-hat']
  const roles: Role[] = ['kick', 'snare', 'closed-hat']
  return withRoles([
    request({ id: 'r-sub', role: 'sub', priority: 1, character: 'hard' }),
    ...sections.map((wanted, i) =>
      request({
        id: ids[i] as string,
        role: roles[i] as Role,
        priority: 2 + i,
        character: 'hard',
        sustain: 'transient',
        sections: wanted,
      }),
    ),
  ])
}

const blockedDisjoint = blocked([['Intro'], ['Drop']])
const blockedNowhere = blocked([['Nowhere'], ['Nowhere']])
const blockedChain = blocked([['Intro'], ['Intro', 'Drop'], ['Drop']])
/**
 * A star: the first overlaps both of the others and they do not overlap each other. Joining a
 * clique against the *seed* rather than against every member already in it buckets all three.
 */
const blockedStar = blocked([['Intro', 'Build'], ['Build'], ['Intro']])
/**
 * The same three parts ordered so that the middle one is reachable from two seeds — the first
 * bucket takes it, and a second bucket, seeded by the request the first one could not hold, can
 * reach it again. It must not be charged its escape twice.
 */
const blockedTwice = blocked([['Intro'], ['Drop'], ['Intro', 'Drop']])

describe('the exclusion is load-bearing, on a rig whose first leaf is not the optimum (§7.1/#78)', () => {
  it('is the shape it says it is: the first leaf gives the shared voice to the sub', () => {
    // The premise, from the public search: alone, the sub takes `v1` — so the first leaf of the
    // full search does too, and everything after it is the search climbing back off that.
    const alone = best(BLOCKING, withRoles([blockedDisjoint.roles[0] as RoleRequest]))
    expect(placement(alone, 'r-sub')).toBe('p-one/v1')
  })

  it('steps the sub off the voice so the disjoint pair can share it', () => {
    const found = best(BLOCKING, blockedDisjoint)
    expect(placement(found, 'r-sub')).toBe('p-sub/s1')
    expect(placement(found, 't-kick')).toBe('p-one/v1')
    expect(placement(found, 't-snare')).toBe('p-one/v1')
    expect(keys(found.score).misses).toEqual([0, 0, 0])
  })

  it('agrees with the oracle on every section shape', () => {
    agreesWithOracle(BLOCKING, blockedDisjoint)
    agreesWithOracle(BLOCKING, blockedNowhere)
    agreesWithOracle(BLOCKING, blockedChain)
    agreesWithOracle(BLOCKING, blockedStar)
    agreesWithOracle(BLOCKING, blockedTwice)
  })

  it('leaves every request on the one voice when none of them occupies a section', () => {
    // Nothing conflicts with nothing, so the sub keeps `v1` and both transients join it there.
    const found = best(BLOCKING, blockedNowhere)
    for (const id of ['r-sub', 't-kick', 't-snare']) {
      expect(placement(found, id), id).toBe('p-one/v1')
    }
    expect(keys(found.score).recipeDistance).toBe(0)
  })

  it('breaks the chain in the middle, where the clique cannot hold all three', () => {
    const found = best(BLOCKING, blockedChain)
    expect(placement(found, 't-kick')).toBe('p-one/v1')
    expect(placement(found, 't-hat')).toBe('p-one/v1')
    expect(placement(found, 't-snare')).toBe('p-snare/n1')
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
 * The mode is the one knob, and it exists because the sweeps can afford different sizes.
 *
 *  - `narrow` is what `bruteForceBest` can enumerate: two to four requests over six roles.
 *  - `wide` runs no oracle and takes four to seven requests over four roles, which is where
 *    voices actually get contested. On `narrow` the repair fires on well under 1% of the pairs
 *    — enough to be exercised, not enough to be a test of it.
 *  - `transient` makes **every** request transient over three roles, so the section clique is
 *    the thing under test rather than a decoration: some pairs overlap and get bucketed, some
 *    are disjoint and must not be, and the same corpus is small enough for the oracle.
 *
 * Each mode draws from its own `lcg` stream, so adding one leaves the fixtures the others
 * generate — and the recorded figures below — exactly where they were.
 */
type SweepMode = 'narrow' | 'wide' | 'transient'
const STREAM: Record<SweepMode, number> = { narrow: 0, wide: 5_000_000, transient: 9_000_000 }

function generated(fixture: number, mode: SweepMode = 'narrow'): { devices: Device[]; template: Template } {
  const r = lcg(fixture + STREAM[mode])
  const wide = mode === 'wide'
  const roleSource =
    mode === 'wide' ? SWEEP_ROLES.slice(0, 4) : mode === 'transient' ? SWEEP_ROLES.slice(0, 3) : SWEEP_ROLES
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
    // Short-circuited on purpose: in `transient` mode the draw is never made, so the other two
    // modes keep the stream they had.
    if (mode !== 'transient' && r(3) !== 0) {
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
      const { devices, template } = generated(fixture, 'wide')
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
    // Two thousand rigs, each searched twice, is about 38 s of real work — genuinely this test's
    // own rather than the runner being busy, so it declares its own limit instead of leaning on
    // `vitest.config.ts`'s 30 s floor. That floor exists to stop a *trivial* test failing when a
    // parallel worker starves it; a sweep that legitimately takes longer than it has to say so,
    // the way `search-symmetry.test.ts`'s cap sweep asks for 120 s and says why.
  }, 180_000)
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

// ---------------------------------------------------------------------------
// Sweep three: rigs where every request is transient
// ---------------------------------------------------------------------------

/**
 * The two sweeps above generate a transient request about one time in three, and a *pair* of
 * them landing on the same voice is rarer still — which is how the exclusion could be
 * `sustain === 'continuous'` for as long as it was and cost only `ambient-dub`'s node count.
 * This corpus is transient throughout and over three roles, so the section clique is the thing
 * being exercised: overlapping pairs that must be bucketed, disjoint pairs that must not, and
 * chains where no clique holds the whole group.
 *
 * Both detectors run in the same walk, because the corpus is small enough to afford the oracle
 * and each answers a question the other cannot. `bruteForceBest` says the answer is still the
 * optimum — an over-charging bucket prunes it. `measureAssignWithoutMatchingRepair` says the
 * whole result is the one the unrepaired floor reaches — a bound is allowed to move the node
 * count and nothing else.
 */
describe('the section clique holds when every request is transient (§7.1/#78)', () => {
  const CORPUS = Array.from({ length: 600 }, (_, i) => generated(i, 'transient'))

  it('carries both kinds of pair, so it is a test of the clique and not just of the bucket', () => {
    let overlapping = 0
    let disjoint = 0
    for (const { template } of CORPUS) {
      const wanted = template.roles.map((role) => new Set(role.sections ?? []))
      let hasOverlap = false
      let hasDisjoint = false
      for (let a = 0; a < wanted.length; a++) {
        for (let b = a + 1; b < wanted.length; b++) {
          const shares = [...(wanted[a] as Set<string>)].some((name) =>
            (wanted[b] as Set<string>).has(name),
          )
          if (shares) hasOverlap = true
          else hasDisjoint = true
        }
      }
      if (hasOverlap) overlapping++
      if (hasDisjoint) disjoint++
    }
    // 564 and 204 of the 600 when this was written. The thresholds sit well below both,
    // because the figures may drift with the generator and zero of either would mean this
    // corpus was quietly testing only half of the rule.
    expect(overlapping, 'no fixture has an overlapping pair to bucket').toBeGreaterThan(300)
    expect(disjoint, 'no fixture has a disjoint pair to leave alone').toBeGreaterThan(100)
  })

  it('finds the optimum, and the same whole result, on 600 all-transient rigs', () => {
    let differed = 0
    let checked = 0
    for (const [fixture, { devices, template }] of CORPUS.entries()) {
      const oracle = bruteForceBest(devices, template)
      for (let seed = 0; seed < 4; seed++) {
        const input = { devices, template, mood: MOOD, seed, nodeCap: 20_000_000 }
        const repaired = assign(input)
        const plain = measureAssignWithoutMatchingRepair(input)
        const where = `fixture ${String(fixture)} seed ${String(seed)}`
        expect(repaired.search.capped, `${where} capped`).toBe(false)
        expect(plain.search.capped, `${where} capped unrepaired`).toBe(false)
        expect(shapeOf(repaired), `${where}: the repair moved more than the node count`).toBe(
          shapeOf(plain),
        )
        expect(
          compareScore(repaired.score, oracle),
          `${where}: search ${JSON.stringify(repaired.score)} vs oracle ${JSON.stringify(oracle)}`,
        ).toBe(0)
        if (repaired.search.nodes !== plain.search.nodes) differed++
        checked++
      }
    }
    expect(checked).toBe(2_400)
    // 150 of the 2,400 walked a different number of nodes when this was written. Zero would
    // mean transient requests were being bucketed nowhere and this sweep compared the same
    // floor with itself.
    expect(differed, 'the repair never fired on an all-transient rig').toBeGreaterThan(50)
  })
})

describe('the baseline path really is the floor as it stood (§7.1/#78)', () => {
  /**
   * `measureAssignWithoutMatchingRepair` is only worth diffing against if it is the *old* search rather
   * than a plausible reconstruction of it, and the way to know is that it still walks the tree
   * the old search walked. It does, on every one of the 168 searches in
   * `test/search-bound.test.ts`'s matrix; this pins the one that matters most.
   *
   * 165,785 was the figure that ran through all of this work — the worst case in that matrix, the
   * precondition in `scripts/bench-bound.ts`, and the measurement `DEFAULT_NODE_CAP` was last
   * raised against. It belongs to the *unrepaired* floor, so re-recording the matrix for the
   * repaired search leaves it untouched. It moves only when a device or a direction moves, and
   * the Subharmonicon is a device moving: **165,785 → 221,573**, a rise of 33.7% on a floor with
   * no matching repair to protect it, against 14.4% on the repaired one over the same rig. Both
   * numbers grew for the same reason and the gap between the two growth rates is the repair
   * doing its job on a larger library.
   *
   * The TR-6S is the next device to move it: **221,573 → 471,392**, a rise of 112.7%. This is
   * the one place the two growth rates come out close — the repaired sweep doubled too
   * (`test/search-symmetry.test.ts` records 9,507 → 19,066) — and the reason is in that file's
   * note. The repair collapses requests that §4.2 will not let share a voice; a box with six
   * voices and fifteen roles gives it fewer such pairs to collapse per unit of branching than a
   * box with more voices does, so on this device the floor and the repaired search grow at
   * nearly the same rate. That is the repair being less effective here, not absent.
   *
   * **Two changes moved it after the TR-6S, and the figure below carries both.** #183 came first
   * and was small: the TR-8S's RC slot gained `pad` and `stab` when §12.4's `sampled-chord` route
   * turned out to be open there, taking the floor 471,392 → 493,870 and leaving the repaired
   * sweep's worst case untouched at 19,066.
   *
   * The MPC Live III is the larger half — **493,870 → 664,888**, a rise of 34.6% — and the two
   * growth rates come apart again, which is the more usual shape: the repaired sweep rose 12.1%
   * over the same device (`test/search-symmetry.test.ts` records 19,066 → 21,368). Close to three
   * times the gap, and it is what the TR-6S note predicts from the other end. This box declares *two* pools
   * whose role sets barely overlap — sixteen fixed-note pads carrying seventeen roles, sixteen
   * chromatic tracks carrying all twenty-three — so most request pairs land in exactly the
   * position the repair is for: two requests §4.2 will not let share a voice, on a device with
   * plenty of voices to separate them onto. The unrepaired floor pays for all of it and the
   * repaired search collapses most of it.
   *
   * **The MPC XL moves it again, 664,888 → 900,769, a rise of 35.5%**, and the paragraph above
   * is why the two halves of that sentence are nearly the same number twice: the XL takes the
   * Live III's three pools and all nineteen of its recipes by reference, so it presents the
   * search with the identical shape a second time, and the floor grows by almost exactly what
   * the first copy cost it. The repaired sweep rose 24.9% over the same device
   * (`test/search-symmetry.test.ts` records 21,368 → 26,688), so the gap between the two rates
   * narrowed from three times to one and a half. A duplicate is the one kind of new device whose
   * request pairs the repair has already seen the shape of.
   *
   * **The OP-XY takes it 900,769 → 1,200,163, a rise of 33.3%**, and the two rates come apart
   * again — the repaired sweep rose 11.9% over the same device (`test/search-symmetry.test.ts`
   * records 26,688 → 29,870), so the gap is back to about two and four fifths. That is the MPC
   * XL paragraph read in reverse: the XL was a duplicate and its request pairs were a shape the
   * repair had already collapsed, where this box is a single pool of eight carrying all
   * twenty-three roles. Eight voices and twenty-three roles is the TR-6S's ratio turned the
   * other way up — plenty of roles the repair can prove will not share a voice, and enough
   * voices to separate them onto — which is precisely the position the repair is for. The
   * unrepaired floor pays for every one of those pairs and the repaired search collapses them.
   *
   * **The MPC One G2 takes it 1,200,163 → 1,615,995, a rise of 34.6%**, against 19.4% on the
   * repaired sweep over the same device (`test/search-symmetry.test.ts` records 29,870 → 35,678)
   * — the gap back to about one and four fifths, which is the MPC XL's shape again rather than
   * the OP-XY's. That is what it should be: this box is the third copy of the Live III's three
   * pools and twenty recipes, so its request pairs are the shape the repair has already
   * collapsed twice. Two duplicates of one engine have now moved this floor by almost the same
   * amount — 35.5% and 34.6% — while moving the repaired search by 24.9% and 19.4%. Sharing an
   * engine buys the reader a consistent guide and buys the search nothing.
   */
  /**
   * **The Muse breaks the run, and it breaks it downwards: 1,615,995 -> 55,575, a fall of 96.6%.**
   *
   * Every entry above this one records the unrepaired floor *rising* as a device landed, and each
   * came with a rate to compare against the repaired sweep. This one has no such pair, because
   * the two numbers converged: on `industrial-techno` seed 9 the search now walks 55,575
   * unrepaired against 55,217 repaired. **The repair prunes 0.6% here, where it pruned 98.3%.**
   *
   * It is not the repair that broke, and the direction of the change is how that is known. The
   * repair can only ever remove nodes, so a *floor* falling 29-fold is the underlying problem
   * getting easier rather than the bound getting weaker. The Muse answers seven of the tonal
   * requests `industrial-techno` makes, so a strong incumbent is reached far earlier in the walk
   * and ordinary cost pruning removes what the matching repair used to have to prove unreachable.
   * There is nothing left for it to collapse.
   *
   * Measured across the seeds rather than inferred from one: 1,590,389/1,561,663/1,717,339 before
   * against 51,591/48,660/56,183 after on seeds 1, 3 and 5, with the repaired walk roughly
   * doubling (25,285 -> 51,233, 23,554 -> 48,302, 28,046 -> 55,825). The effect is the whole
   * direction, not one seed.
   *
   * **So this fixture has stopped being a demonstration of the repair, and the assertion below no
   * longer claims to be one.** The claim itself is intact and is held next door: `the repair
   * prunes, rather than merely being admissible` runs a three-device rig where the incumbent is
   * poor, the repair still has pairs to collapse, and the gap is still enormous. That block is
   * now the only place the pruning ratio is asserted, which is worth knowing before anyone
   * deletes it as redundant.
   *
   * What survives here is narrower and still worth pinning: the two walks are reproducible to the
   * node (invariant 6), and the repaired walk stays inside a bound that is nowhere near the cap.
   * If a later device sends the floor back up without the repaired figure following it, the run
   * of paragraphs above resumes and this note is the gap in it.
   *
   * **The SP-404MK2 re-records both figures and moves them together**, which is the case the
   * paragraph above says to watch for and the reassuring version of it: the floor goes
   * 55,575 -> 58,872 and the repaired walk 55,217 -> 58,485, a 5.9% rise on each. The gap between
   * them stays where the Muse left it, so the repair is neither doing more work nor less — the
   * problem simply got a little bigger, which is what a nineteen-recipe pool over seventeen roles
   * does to the direction that asks for the most of them.
   *
   * **The EP-133 does it again and keeps the gap**: the floor goes 58,872 -> 63,283 and the
   * repaired walk 58,485 -> 62,885, 7.5% on each. Two devices in a row moving both figures by the
   * same fraction is the note above's reassuring case a second time — the repair is doing neither
   * more work nor less, and the problem is simply a little bigger.
   *
   * **The EP-40 makes it three in a row**: the floor goes 63,283 -> 71,296 and the repaired walk
   * 62,885 -> 70,887, 12.7% on each, with the absolute gap between them unchanged at about four
   * hundred nodes. Three devices moving both figures together is as good as this fixture's
   * evidence gets that the repair is stable — what it still is not is a demonstration that the
   * repair *prunes*, which is next door.
   */
  /**
   * The MC-707 moves both figures together again, and by far the most any device has: 71,296 ->
   * 118,860 unrepaired and 70,887 -> 118,224 repaired, 66.7% on each. The absolute gap between
   * them widens from about four hundred nodes to 636, which is the first time it has moved at
   * all — and it is the same sibling-pair effect `search-symmetry.test.ts` records, where two
   * boxes carrying the same twenty recipes give every request two exactly-equal candidates.
   */
  /**
   * The MicroFreak moves both figures together once more, and again by the most yet: 118,860 ->
   * 197,832 unrepaired and 118,224 -> 197,192 repaired, 66.4% on each. **The absolute gap holds at
   * 640 nodes**, against the MC-707's 636, so the one figure that has stayed still through five
   * devices and a near-tripling of the walk is the distance between the two paths, which is the
   * claim this fixture exists to make.
   *
   * `search-bound.test.ts` records this device moving `industrial-techno` while leaving `weave`
   * flat, a different shape from the MC-707's row even though the number here looks like a repeat
   * of it. This seed sits on the direction that pays.
   */
  /**
   * **The Circuit Tracks moves both figures together for a sixth time — and moves the gap.**
   * 197,832 -> 283,787 unrepaired and 197,192 -> 282,897 repaired, 43.5% on each.
   *
   * The paragraph above calls the absolute distance between the two paths the one figure that has
   * stayed still, at 636 then 640 through five devices and a near-tripling of the walk. **It is
   * 890 here**, up 39%, and that is the first move worth reading rather than rounding. It is
   * still small against the walk — three parts in a thousand, where it was three parts in a
   * thousand before — so what has held is the *proportion* rather than the count, and the earlier
   * paragraphs were reading a constant into six hundred-odd nodes that were tracking the problem
   * size all along. Recorded as a correction to that reading rather than as a defect: the repair
   * is still admissible and still cheap, and this fixture's claim survives with the weaker and
   * truer form of it.
   */
  /**
   * **The RD-8 takes both figures down together — and closes the gap between them to nothing.**
   * 815,668 -> 673,907 unrepaired and 815,041 -> 673,907 repaired, 17.4% off each. It is the
   * first device to make this walk cheaper; `search-bound.test.ts` carries the direction-by-
   * direction row and the attribution, and `search-symmetry.test.ts` the aggregate.
   *
   * **The gap is 0 nodes**, against 636, 640, 890 and 627 through the seven devices before it.
   * The paragraph above already retreated from calling that distance a constant, on the reading
   * that it tracks problem size rather than standing still; zero is that retreat completed. What
   * it means here is narrow and worth stating exactly: **on this seed the repair now prunes
   * nothing** — it costs nothing either, which is the admissibility claim this fixture exists to
   * make, and it is unchanged. That the repair *does* prune is a different claim, asserted next
   * door on a rig chosen for it, and that block is untouched.
   */
  /**
   * **The NEUTRON puts both figures back up together, and the gap stays at zero.** 673,907 ->
   * 728,391 unrepaired and 673,907 -> 728,391 repaired, 8.1% on each. Two devices running, two
   * measurements identical to the node.
   *
   * A second consecutive zero is worth more than the first was. One could be the coincidence the
   * paragraph above was careful not to over-read; two, across a device that took the walk down
   * and a device that took it back up, says the repair genuinely prunes nothing *on this seed* —
   * a property of which rig wins `industrial-techno` at seed 9, not of the repair. Its cost is
   * still nil, which is all this fixture claims.
   */
  /**
   * **The MODEL D puts both figures up again and the gap stays at zero — a third time.** 728,391
   * -> 832,343 unrepaired and 728,391 -> 832,343 repaired, 14.3% on each.
   *
   * This is the seed the fixture is pinned to, and it is worth saying what happened to it rather
   * than only what happened here. `search-bound.test.ts` records that seed 9 became
   * `industrial-techno`'s *worst* seed with this device, taking the title from seed 0 while the
   * direction's peak fell — so this walk got 14.3% dearer in a sweep whose maximum got 1.3%
   * cheaper. The fixture is measuring one seed and has never claimed otherwise; the two numbers
   * disagreeing in sign is the clearest reminder yet that it cannot stand in for the table.
   *
   * Three consecutive zeroes now, across a device that took the walk down, one that took it up,
   * and one that took it up while moving which seed is worst. The repair prunes nothing *here*
   * and costs nothing here, which is the admissibility claim, and that it does prune is still
   * asserted next door on a rig chosen for it.
   */
  /**
   * **The Digitone II puts both figures up once more and the gap stays at zero — a fourth time.**
   * 832,343 -> 858,219 unrepaired and 832,343 -> 858,219 repaired, 3.1% on each.
   *
   * The seed this fixture is pinned to stopped being the direction's worst again, and in the
   * opposite direction from last time. `search-bound.test.ts` records the peak moving off seed 9
   * onto seed 3 while the whole row rose 13.2%, so this walk got 3.1% dearer in a sweep whose
   * maximum got four times that. The previous entry called the two numbers disagreeing in sign the
   * clearest reminder that one seed cannot stand in for the table; agreeing in sign and by a factor
   * of four is the same reminder said more quietly.
   *
   * Four consecutive zeroes, across four devices that between them took the walk down, up, up while
   * moving which seed is worst, and up while moving it back off this one.
   *
   * **The Analog Rytm MKII halves both figures and the gap stays at zero — a fifth time.**
   * 858,219 -> 431,610 unrepaired and 858,219 -> 431,610 repaired, -49.7% on each. This is the
   * first device to take the walk *down*, and `search-bound.test.ts` records the same fall across
   * the whole row: the direction's peak went 942,024 -> 506,335. A box whose recipes answer
   * `industrial-techno`'s drum requests on exact `(role, character)` keys feeds `liveFloor` a
   * larger admissible value earlier, so it prunes more — which is what the repair is for, arriving
   * from the library rather than from the bound.
   *
   * Five consecutive zeroes now, across five devices that between them took the walk down, up, up,
   * up, and down again by half.
   *
   * **The Octatrack MKII takes it back up 8.4% and the gap stays at zero — a sixth time.**
   * 431,610 -> 467,921 unrepaired and the same repaired. The interesting half is the comparison:
   * `search-bound.test.ts` records the direction's peak moving only 506,335 -> 518,084, so this
   * one seed got dearer by nearly four times what the row's maximum did — while still sitting at
   * the *bottom* of that row, tied with seeds 10, 18 and 20 and a whisker above seed 13. A seed
   * near its row's floor can move four times as far as the row's ceiling, which is the standing
   * reminder in a sharper form than usual: one seed cannot stand in for the table.
   *
   * Six consecutive zeroes, across six devices that between them took the walk down, up, up, up,
   * down by half, and up again.
   *
   * **The Digitone takes it up another 8.4% and the gap stays at zero — a seventh time.**
   * 467,921 -> 507,297 unrepaired and the same repaired. The comparison inverts the last entry
   * rather than repeating it: `search-bound.test.ts` records the direction's peak moving 518,084
   * -> 566,355, which is 9.3%, so this time the one seed moved slightly *less* than the row's
   * maximum instead of nearly four times as much. Same standing lesson from the other side — the
   * relationship between a seed and its row is not stable either, so a fixture pinned to one seed
   * is a walk being watched rather than a summary of the table.
   *
   * The peak also moved again, seed 2 -> seed 4, while this seed stayed near the row's floor.
   *
   * Seven consecutive zeroes, across seven devices that between them took the walk down, up, up,
   * up, down by half, up, and up.
   *
   * **The Digitakt takes it up 7.8% and the gap stays at zero — an eighth time.**
   * 507,297 -> 547,067 unrepaired and the same repaired. `search-bound.test.ts` records the
   * direction's peak moving 566,355 -> 631,238, which is 11.5%, so this seed again moved a little
   * *less* than the row's maximum — the same relationship the Digitone entry above records, from
   * the sibling box, which is the first time two consecutive entries have agreed about anything.
   * Two agreements do not make the relationship stable; the entry before them moved four times the
   * row's maximum in the other direction.
   *
   * The peak moved seed 4 -> seed 3, and this seed is still near the row's floor — 547,067 against
   * a row minimum of 547,066, which three other seeds share.
   *
   * Eight consecutive zeroes, across eight devices that between them took the walk down, up, up,
   * up, down by half, up, up, and up.
   *
   * **The Play+ takes it up 6.2% and the gap stays at zero — a ninth time.**
   * 547,067 -> 581,048 unrepaired and the same repaired. `search-bound.test.ts` records the
   * direction's peak moving 631,238 -> 691,974, which is 9.6%, so this seed moved *less* than the
   * row's maximum for the third consecutive device — the relationship the Digitone and Digitakt
   * entries above both recorded, now agreeing three times running. It is still not a law: the
   * entry before those three moved four times the row's maximum in the other direction, and this
   * box moved a *different* direction (`weave`) 2.15x while moving this one a sixteenth.
   *
   * The peak moved seed 3 -> seed 12, and this seed is once again at the row's exact floor —
   * 581,048, shared with seeds 13, 18 and 20.
   *
   * Nine consecutive zeroes, across nine devices that between them took the walk down, up, up,
   * up, down by half, up, up, up, and up.
   *
   * **The Tracker takes it up 7.0% and the gap stays at zero — a tenth time.**
   * 581,048 -> 621,490 unrepaired and the same repaired. `search-bound.test.ts` records the
   * direction's peak moving 691,974 -> 728,123, which is 5.2%, so this seed moved *more* than the
   * row's maximum — and the three-in-a-row relationship the Digitone, Digitakt and Play+ entries
   * recorded is broken on the fourth. That is the useful outcome: those three entries said in
   * turn that it was not yet a law, and this is the device that shows they were right to.
   *
   * The peak moved seed 12 -> seed 18, and this seed is one node off the row's floor — 621,490
   * against 621,489 on seed 13, where it sat exactly on the floor last time.
   *
   * Ten consecutive zeroes, across ten devices that between them took the walk down, up, up, up,
   * down by half, up, up, up, up, and up.
   *
   * **One recipe takes it up 0.24% and the gap stays at zero — an eleventh time.**
   * 621,490 -> 622,990 unrepaired and the same repaired. Every entry above it is a device; this
   * one is `tr1000-metallic-dirty`, a single recipe on a track the TR-1000 already declared for
   * the role. So the eleventh zero is the cheapest evidence in this list that the repair does not
   * depend on how much content arrives at once — the ten before it each brought a manifest, and
   * this one brought seven parameters.
   *
   * `search-bound.test.ts` records the direction's peak moving 728,123 -> 729,675, which is
   * 0.21%, so this seed again moved a shade *more* than the row's maximum, as the Tracker entry
   * above did. Both figures are small enough that the comparison is arithmetic rather than a
   * finding.
   *
   * The peak stayed on seed 18 — the first entry here that does not move it — and this seed is
   * still one node off the row's floor, 622,990 against 622,989 on seed 13, exactly the pairing
   * the entry above recorded.
   *
   * Eleven consecutive zeroes, across ten devices and one recipe that between them took the walk
   * down, up, up, up, down by half, up, up, up, up, up, and up.
   *
   * **Two recipes take it up 0.02% and the gap stays at zero — a twelfth time.** 622,990 ->
   * 623,123 unrepaired and the same repaired. Like the entry above it this is content rather than
   * a manifest — the TR-1000's `bass-mid` pair on the LT, a track that already declared the role —
   * and it is the smallest move in this list by an order of magnitude, which is the point of
   * recording it: the repair holds at 133 nodes exactly as it holds at 300,000.
   *
   * `search-bound.test.ts` records the direction's peak moving 729,675 -> 729,808, 0.018%, so this
   * seed and the row's maximum moved by the same 133 nodes. The peak stayed on seed 18 for the
   * second entry running, and this seed is still one node off the row's floor — 623,123 against
   * 623,122 on seed 13.
   *
   * Twelve consecutive zeroes, across ten devices and two content changes that between them took
   * the walk down, up, up, up, down by half, up, up, up, up, up, up, and up.
   *
   * **Nine recipes take it up 0.0002% and the gap stays at zero — a thirteenth time.** 623,123 ->
   * 623,124 unrepaired and the same repaired: one node, which is the smallest move this list can
   * record. Content again rather than a manifest — the Digitakt II's eight unauthored roles, and
   * the second recipe `tom` needed because §3.5 refuses a substitution between opposite
   * characters.
   *
   * **One node is the finding, not a rounding error.** Nine recipes arriving on a sixteen-track
   * pool that already declared all 23 roles cost this direction essentially nothing, because
   * `industrial-techno` asks this box for one of the nine (`noise`, and optionally) and the
   * other eight only widen a pool the search was already walking. A recipe is priced by the role
   * it lands in, and eight of these landed in roles nothing here contends for.
   *
   * `search-bound.test.ts` records the direction's peak moving 729,808 -> 729,954, which is
   * 0.02%, so this seed moved a hundredth of what the row's maximum did. That is the reverse of
   * the Tracker and TR-1000 entries above and it is the same non-finding: both figures are too
   * small for the comparison to be anything but arithmetic.
   *
   * The peak stayed on seed 18 for the third entry running, and this seed is still one node off
   * the row's floor — 623,124 against 623,123 on seed 13, which is exactly the pairing the two
   * entries above recorded, one node higher.
   *
   * Thirteen consecutive zeroes, across ten devices and three content changes that between them
   * took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, and up.
   *
   * **Seven recipes take it up 0.0002% and the gap stays at zero — a fourteenth time.** 623,124 ->
   * 623,125 unrepaired and the same repaired: one node again, which is the same smallest move the
   * entry above records. Content again, and the same shape of it one generation back — the
   * Digitakt's seven unauthored roles (#345), on a box whose pool of eight also declares all 23.
   *
   * **The same one node for a different reason, and the difference is worth the sentence.** The
   * entry above explains its node by the pool being sixteen wide and the direction contending for
   * one of the nine new roles. This pool is *half* that, and the figure came out identical. So the
   * price is not the pool's width: it is that `industrial-techno` asks this box for exactly one of
   * the seven (`noise`, and optionally), and the other six land in roles nothing here contends
   * for. A recipe is priced by the role it lands in, twice over now, measured on two pool sizes.
   *
   * `search-bound.test.ts` records the direction's peak moving 729,954 -> 730,100, which is 0.02%,
   * so this seed again moved a hundredth of what the row's maximum did.
   *
   * The peak stayed on seed 18 for the fourth entry running, and this seed is still one node off
   * the row's floor — 623,125 against 623,124 on seed 13, the same pairing three entries running
   * have recorded, each one node higher than the last.
   *
   * Fourteen consecutive zeroes, across ten devices and four content changes that between them
   * took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, and up.
   *
   * **#383 takes it down by a quarter and the gap stays at zero — a fifteenth time.** 623,125 ->
   * 468,909 unrepaired and the same repaired. This is the largest fall in the list after the
   * halving above, and it is the first entry where the cause is a *feasibility* change rather
   * than a manifest or a recipe count: `muse-stab-hard` and `muse-stab-dirty` are capped at one
   * note, every `stab` request in the library asks for three or four, so two recipes stopped
   * being candidates and the subtrees under them are gone.
   *
   * **That is the direction to want, and it is #25's shape.** A constraint that prunes the tree
   * rather than complicating it: an infeasible partial assignment is cut where an expensive one
   * still has to be explored. It is a real prune rather than a measurement artefact — the
   * unrepaired and repaired walks fell together and by the same amount, which is what a branch
   * disappearing looks like and not what a cheaper bound looks like.
   *
   * **And it is the first entry that ends a run of one-node moves rather than adding to it.**
   * The four entries above each moved this seed by a single node, because each added recipes to
   * roles this direction does not contend for. Two recipes leaving the *contended* `stab` role
   * is worth 154,216 nodes, which is the same lesson from the other side: a recipe is priced by
   * the role it lands in.
   *
   * `search-bound.test.ts` records the direction's peak moving 730,100 -> 543,140 over the same
   * change, a fall of 26% against this seed's 25%, so for once the two figures agree closely
   * enough for the comparison to say something: the saving is spread across the row rather than
   * concentrated in the seeds that were worst.
   *
   * Fifteen consecutive zeroes, across ten devices and five content changes that between them
   * took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, up, and down
   * by a quarter.
   *
   * **Eight recipes and two narrowings take it up 2.0% and the gap stays at zero — a sixteenth
   * time.** 468,909 -> 478,142 unrepaired and the same repaired. The Circuit Tracks' six
   * unauthored drum roles and two synth ones (#345), with `riser` and `sweep` taken *off* the
   * drum pool in the same change.
   *
   * **Read this entry against the one directly above it rather than against the run of one-node
   * moves.** They are the same rule in opposite directions, and they are the two largest content
   * moves in this list for the same reason. #383 took two recipes *out* of contention on `stab`,
   * a role every direction in the library asks three or four notes of, and the walk fell 154,216
   * nodes. This puts recipes *into* contention on `impact`, `noise` and `riser`, which
   * `industrial-techno` asks this box for, and the walk rises 9,233.
   *
   * The four entries before those two moved this seed by a single node each, and the difference
   * is not the recipe count — nine recipes cost one node at #380 and eight cost 9,233 here. It is
   * whether the role is contended. This box has six assignables, so a candidate added to a role
   * the direction wants lands on a pool the search was already fighting over; the Digitakt II's
   * nine landed on a sixteen-track pool in roles nothing here asks for.
   *
   * The two narrowings pull the other way and are not separable from the total. `riser` and
   * `sweep` came off `DRUM_ROLES`, which takes four candidate assignables out of two requests
   * `industrial-techno` and `ambient-dub` make — so +9,233 is already net of that, and the
   * additions alone cost more.
   *
   * `search-bound.test.ts` records the direction's peak moving 543,140 -> 554,182, which is 2.0%.
   * This seed moved 2.0% as well, so like the entry above it the two figures agree closely enough
   * for the comparison to say something: the cost is spread across the row rather than landing on
   * the seeds that were already worst.
   *
   * The peak stayed on seed 18 for the sixth entry running, and this seed is still one node off
   * the row's floor — 478,142 against 478,141 on seed 13, the same pairing five entries running
   * have recorded, through a fall of a quarter and a rise of a fiftieth.
   *
   * Sixteen consecutive zeroes, across eleven devices and six content changes that between them
   * took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, up, down by a
   * quarter, and up.
   *
   * **Seven recipes take it up 2.25% and the gap stays at zero — a seventeenth time.** 478,142 ->
   * 488,909 unrepaired and the same repaired. The Tracker Mini's seven unauthored roles (#345),
   * all of them on the sample pool.
   *
   * **The third #345 device in a row, and the three of them together are the finding this list
   * can now make.** They cost one node, 9,233 and 10,767, and the recipe counts were nine, eight
   * and seven — so the cost falls as the count falls only by coincidence. What separates them is
   * whether `industrial-techno` contends for the roles:
   *
   *  - the Digitakt II's nine landed on a sixteen-track pool, in roles this direction does not
   *    ask that box for, and cost **one node**;
   *  - the Circuit Tracks' eight landed on a six-assignable box in `impact`, `noise` and `riser`,
   *    which it does ask for, and cost **9,233**;
   *  - the Tracker Mini's seven land in `sub`, `metallic`, `impact`, `noise` and `riser` on an
   *    eight-track sample pool, and cost **10,767**.
   *
   * `sub` is the one to look at. It is the most crowded role in the library at 49 recipes, and
   * `industrial-techno` asks for it at priority 1 — so a fiftieth candidate lands in the most
   * contended place there is. Four figures is what that is worth, and four figures is 2% of this
   * walk. **That is the measurement #301 asks for and it says the same thing every time**: the
   * legal-rig line did not move at all, 46,609 nodes on weave seed 15, because no rig anybody can
   * build holds this box and the forty-five others.
   *
   * `search-bound.test.ts` records the direction's peak moving 554,182 -> 566,810, which is
   * 2.28% against this seed's 2.25% — the two agreeing again, as they have since #383.
   *
   * The peak stayed on seed 18 for the seventh entry running, and this seed is still one node off
   * the row's floor — 488,909 against 488,908 on seed 13, the same pairing six entries running
   * have recorded.
   *
   * Seventeen consecutive zeroes, across twelve devices and seven content changes that between
   * them took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, up, down
   * by a quarter, up, and up.
   *
   * **Seven recipes take it up one node and the gap stays at zero — an eighteenth time.** 488,909
   * -> 488,910 unrepaired and the same repaired. The Octatrack MKII's six unauthored roles
   * (#345), authored as seven recipes because `tom` needed both ends of a character pair.
   *
   * **This is the rule stated three entries ago, tested and confirmed.** Those entries said the
   * cost is not the recipe count but whether `industrial-techno` contends for the roles, and this
   * is the prediction they make: of the six roles authored here — `acid`, `arp`, `noise`, `ride`,
   * `rim`, `tom` — this direction asks for exactly one, `noise`, at priority 5 and optional. So
   * the tree got wider almost entirely where nobody walks, and one node is what that costs.
   *
   * Set beside its neighbours the arithmetic is now four points on one line: nine recipes cost
   * one node, eight cost 9,233, seven cost 10,767, and seven cost one. The counts are 9, 8, 7, 7
   * and the costs span four orders of magnitude. **Contention explains all four and recipe count
   * explains none of them.**
   *
   * `search-bound.test.ts` records the direction's peak moving 566,810 -> 566,908, which is 98
   * nodes against this seed's one — the row's maximum moving a hundred times more than its floor,
   * the pattern the two cheap entries above also show and the two expensive ones invert.
   *
   * The peak stayed on seed 18 for the eighth entry running, and this seed is still one node off
   * the row's floor — 488,910 against 488,909 on seed 13, the same pairing seven entries running
   * have recorded.
   *
   * Eighteen consecutive zeroes, across thirteen devices and eight content changes that between
   * them took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, up, down
   * by a quarter, up, up, and up.
   *
   * **Six recipes take it up one node and the gap stays at zero — a nineteenth time.** 488,910 ->
   * 488,911 unrepaired and the same repaired. The SP-404MK2's six unauthored roles (#345).
   *
   * The rule holds a second time running, and for the same reason: `industrial-techno` asks this
   * box for one of the six, `noise`, at priority 5 and optional. Five points on the line now, and
   * the recipe counts (9, 8, 7, 7, 6) still explain none of the costs (1, 9,233, 10,767, 1, 1).
   *
   * `search-bound.test.ts` records the direction's peak moving 566,908 -> 567,006, 98 nodes again
   * against this seed's one.
   *
   * The peak stayed on seed 18 for the ninth entry running, and this seed is still one node off
   * the row's floor — 488,911 against 488,910 on seed 13.
   *
   * Nineteen consecutive zeroes, across fourteen devices and nine content changes that between
   * them took the walk down, up, up, up, down by half, up, up, up, up, up, up, up, up, up, down
   * by a quarter, up, up, up, and up.
   *
   * **Five recipes take it up 0.9% and the gap stays at zero — a twentieth time.** 488,911 ->
   * 493,352 unrepaired and the same repaired. The Polyend Tracker's five unauthored roles (#345).
   *
   * **4,441 nodes, and the rule that has held for five entries says why it is not one.** The two
   * cheap entries above it each gave `industrial-techno` a single optional role; this one gives
   * it three it actually contends for — `bass-mid` and `stab` at priority 2 and 3, both required,
   * plus `metallic`. Six points on the line now:
   *
   *   9 recipes -> 1 node        (Digitakt II, uncontended)
   *   8 recipes -> 9,233         (Circuit Tracks, three contended on six assignables)
   *   7 recipes -> 10,767        (Tracker Mini, `sub` at priority 1)
   *   7 recipes -> 1 node        (Octatrack MKII, one optional)
   *   6 recipes -> 1 node        (SP-404MK2, one optional)
   *   5 recipes -> 4,441         (Polyend Tracker, three contended)
   *
   * The counts run 9, 8, 7, 7, 6, 5 and the costs run 1, 9,233, 10,767, 1, 1, 4,441. **Six
   * measurements and the correlation with recipe count is still nothing at all.**
   *
   * `search-bound.test.ts` records the direction's peak moving 567,006 -> 571,779, 0.8% against
   * this seed's 0.9% — the two agreeing, which is what the contended entries do and the cheap
   * ones do not.
   *
   * The peak stayed on seed 18 for the tenth entry running, and this seed is still one node off
   * the row's floor — 493,352 against 493,351 on seed 13.
   *
   * Twenty consecutive zeroes, across fifteen devices and ten content changes.
   *
   * **Five recipes take it up 1.9% and the gap stays at zero — a twenty-first time.** 493,352 ->
   * 502,585 unrepaired and the same repaired. The OP-XY's five unauthored roles (#345).
   *
   * 9,233 nodes, and the rule holds a seventh time: `industrial-techno` asks this box for three
   * of the five — `impact` at priority 4 and required, `riser`, and `noise` — on an eight-track
   * pool it is already filling. **Two devices in this batch moved it by nothing at all** (the
   * EP–133 and the EP–40, whose new roles that direction never asks for), and they are not in
   * this list because there was nothing to record.
   *
   * Seven measurements, counts 9, 8, 7, 7, 6, 5, 5 against costs 1, 9,233, 10,767, 1, 1, 4,441,
   * 9,233. The two 9,233s are a coincidence of arithmetic rather than a pattern; what is not a
   * coincidence is that every four-figure cost belongs to a device this direction contends with
   * and every one-node cost does not.
   *
   * `search-bound.test.ts` records the direction's peak moving 571,779 -> 582,821, 1.9% against
   * this seed's 1.9%.
   *
   * The peak stayed on seed 18 for the eleventh entry running, and this seed is still one node
   * off the row's floor — 502,585 against 502,584 on seed 13.
   *
   * Twenty-one consecutive zeroes, across sixteen devices and eleven content changes.
   */
  it('walks the recorded 502,585 nodes on industrial-techno seed 9', () => {
    const input = {
      devices: [...DEVICES],
      template: industrialTechno,
      mood: MOOD,
      seed: 9,
      nodeCap: 20_000_000,
    }
    expect(measureAssignWithoutMatchingRepair(input).search.nodes).toBe(502_585)
    // The ceiling is loosened rather than re-tightened onto the last measurement, per the
    // standing note: it was 20,000, then 25,000, then 35,000, then 70,000, and each time a device
    // pushed the repaired walk past it. A ceiling sitting one node above the last measurement
    // stops guarding anything and starts re-recording the measurement a second time. 260,000 is
    // now 1,200,000, on the eighth device to push past it and by far the widest jump: the RD-9
    // took the repaired walk from 282,897 to 815,041, and the cap moved to 2,000,000 beneath it.
    // Kept deliberately loose, as every raise before it was.
    expect(assign(input).search.nodes).toBeLessThan(1_200_000)
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

// ---------------------------------------------------------------------------
// The mutation battery: every way of getting the bucket wrong, and who catches it
// ---------------------------------------------------------------------------

/**
 * **A test suite is only worth what it rejects, and this one has to be asked.**
 *
 * The failure mode of a bound is invisible: an over-charging floor does not produce a wrong
 * answer, it produces a *missing* one, and only on a rig whose first leaf was not already the
 * optimum. When this repair was first written, three of four deliberately broken versions
 * sailed through every hand-built case in this file. That check was done by hand, once, and
 * then thrown away. This runs it on every commit instead.
 *
 * Each mutation is a textual edit to `lib/core/search.ts`, compiled and imported as its own
 * module — so it is the shipped source that gets broken, not a reimplementation of it that
 * could drift. The anchor for each edit is asserted to appear exactly once, which means a
 * refactor that moves the code fails here loudly rather than quietly mutating nothing.
 *
 * Every mutation below makes the floor **over-charge**, because that is the direction that
 * breaks the search. Under-charging is admissible by construction — it is why an
 * `alternativeTo` that forgot the stack option would pass everything here, as the sweep above
 * already says. Those are weakenings to be found by the node count, not by correctness.
 *
 * The corpus is this file's own fixtures first, then generated rigs, and the test reports which
 * one did the catching — so "the hand-built cases have teeth" is a claim with an answer rather
 * than an assumption.
 */
type Mutation = {
  /** Also the mutant module's filename. */
  name: string
  /**
   * The edits, each anchored on a string that must appear in `lib/core/search.ts` exactly once.
   *
   * Plural because a rule may be enforced in more than one place, and a mutation that breaks
   * only one of them is an *equivalent* mutant — it changes the source and cannot change the
   * answer, so it passes for a reason that has nothing to do with the corpus. The overlap rule
   * is the case in point: the collision pre-check filters on it as well as the clique, and
   * removing either alone leaves the other doing the whole job.
   */
  edits: { find: string; replace: string }[]
  /** The rule it breaks, in the header's terms. */
  breaks: string
  /**
   * Whether a fixture *in this file* has to catch it, rather than one of the 300 generated rigs.
   *
   * Recorded rather than derived, because it is the thing worth knowing: a hand-built rig can be
   * read and argued with, a generated one can only be re-run. The three that say `false` are the
   * three about `compareGiveUp`, and they are caught by generated narrow fixture 56 — a rig
   * nobody designed, which is the point of having the sweep as well.
   */
  handBuilt: boolean
}

const MUTATIONS: Mutation[] = [
  {
    name: 'bucket-ignores-overlap',
    handBuilt: true,
    edits: [
      {
        find: '          if (ctx.overlap[(members[m] as number) * n + b] === 0) {',
        replace: '          if (false) {',
      },
      {
        find: '        if (scratch.slot[b] === slot && ctx.overlap[b * n + j] === 1) {',
        replace: '        if (scratch.slot[b] === slot) {',
      },
    ],
    breaks: 'the clique: any two requests on one voice are bucketed, disjoint sections or not',
  },
  {
    name: 'clique-joins-against-the-seed-only',
    handBuilt: true,
    edits: [
      { find: '        for (let m = 0; m < size; m++) {', replace: '        for (let m = 0; m < 1; m++) {' },
    ],
    breaks: 'every pair: a request joins if it overlaps the seed, without meeting the rest',
  },
  {
    name: 'bucket-charges-a-member-twice',
    handBuilt: true,
    edits: [
      {
        find: '        if (scratch.slot[b] !== slot || scratch.bucketed[b] === 1) continue',
        replace: '        if (scratch.slot[b] !== slot) continue',
      },
    ],
    breaks: 'one bucket per request: a member of two overlapping cliques pays both escapes',
  },
  {
    name: 'keeper-is-the-first-member',
    handBuilt: false,
    edits: [
      {
        find: '        if (keeps < 0 || compareGiveUp(scratch, b, keeps) < 0) keeps = b',
        replace: '        if (keeps < 0) keeps = b',
      },
    ],
    breaks: 'the minimising member: the sum charged is no longer the smallest of the k sums',
  },
  {
    name: 'keeper-is-the-wrong-way-round',
    handBuilt: false,
    edits: [
      {
        find: '        if (keeps < 0 || compareGiveUp(scratch, b, keeps) < 0) keeps = b',
        replace: '        if (keeps < 0 || compareGiveUp(scratch, b, keeps) > 0) keeps = b',
      },
    ],
    breaks: 'the same, maximised: the voice goes to whoever loses least by giving it up',
  },
  {
    name: 'the-miss-is-not-ranked-first',
    handBuilt: false,
    edits: [
      {
        find: `        scratch.rank[b] =
          alt !== null
            ? ctx.missSlots + 1
            : request.optional === true
              ? ctx.missSlots
              : request.priority - 1`,
        replace: '        scratch.rank[b] = 0',
      },
    ],
    breaks: "compareGiveUp's prefix: a member whose only escape is a miss no longer keeps the voice",
  },
]

const SEARCH_SOURCE = fileURLToPath(new URL('../lib/core/search.ts', import.meta.url))
const MUTANT_DIR = mkdtempSync(join(tmpdir(), 'matching-floor-mutants-'))
afterAll(() => {
  rmSync(MUTANT_DIR, { recursive: true, force: true })
})

/**
 * `lib/core/search.ts` with one edit applied, as a live module.
 *
 * Its sibling imports are rewritten to absolute paths so the file can live in a temp directory
 * and still reach the rest of `lib/core` — which resolves to the very same modules the real
 * search uses, so nothing here is a second copy of anything but `search.ts` itself.
 */
async function mutantAssign(m: Mutation): Promise<(input: AssignInput) => AssignmentResult> {
  let source = readFileSync(SEARCH_SOURCE, 'utf8')
  for (const edit of m.edits) {
    expect(
      source.split(edit.find).length - 1,
      `${m.name}: an anchor is no longer in lib/core/search.ts exactly once, so this mutation ` +
        `is stale and is testing nothing`,
    ).toBe(1)
    source = source.replace(edit.find, edit.replace)
  }
  const file = join(MUTANT_DIR, `${m.name}.ts`)
  writeFileSync(file, source.replaceAll("from './", `from '${dirname(SEARCH_SOURCE)}/`))
  const mod = (await import(/* @vite-ignore */ file)) as {
    assign: (input: AssignInput) => AssignmentResult
  }
  return mod.assign
}

/** One rig, one direction, and the optimum an independent enumeration says it has. */
type Case = { name: string; devices: Device[]; template: Template }

const HAND_BUILT: Case[] = [
  { name: 'two continuous requests on one voice', devices: COLLIDING, template: bothWantOne },
  { name: 'two continuous requests, no escape but the miss', devices: ONLY_SHARED, template: bothWantOne },
  { name: 'two transients in disjoint sections', devices: COLLIDING, template: sharesLegally },
  { name: 'two transients in disjoint sections, one voice', devices: ONLY_SHARED, template: sharesLegally },
  { name: 'two transients that overlap in Build', devices: COLLIDING, template: contendInBuild },
  { name: 'a transient and a continuous request', devices: COLLIDING, template: mixedPair },
  { name: 'a request occupying no section', devices: ONLY_SHARED, template: offStructure },
  { name: 'three transients, every pair overlapping', devices: TRIO, template: trio([['Intro', 'Build'], ['Build', 'Drop'], ['Drop', 'Intro']]) },
  { name: 'three transients in a chain', devices: TRIO, template: trio([['Intro'], ['Intro', 'Drop'], ['Drop']]) },
  // The three whose first leaf is not the optimum. Everything above this line is blind to a
  // bucket that over-charges without pruning anything.
  { name: 'a blocked disjoint pair', devices: BLOCKING, template: blockedDisjoint },
  { name: 'a blocked pair occupying no section', devices: BLOCKING, template: blockedNowhere },
  { name: 'a blocked chain of three', devices: BLOCKING, template: blockedChain },
  { name: 'a blocked star of three', devices: BLOCKING, template: blockedStar },
  { name: 'a blocked three where two buckets reach one request', devices: BLOCKING, template: blockedTwice },
]

const GENERATED: Case[] = [
  ...Array.from({ length: 150 }, (_, i) => ({ name: `generated narrow ${String(i)}`, ...generated(i) })),
  ...Array.from({ length: 150 }, (_, i) => ({
    name: `generated transient ${String(i)}`,
    ...generated(i, 'transient'),
  })),
]

/**
 * The first case on which the mutant disagrees with the oracle, or `null` if it survived
 * everything. Four seeds per case: the seed permutes only exactly-equal scores (§7.2), so a
 * pruned optimum can hide behind a tie on one of them.
 */
function caughtBy(
  broken: (input: AssignInput) => AssignmentResult,
  corpus: readonly Case[],
  oracles: readonly Score[],
): string | null {
  for (const [i, entry] of corpus.entries()) {
    for (let seed = 0; seed < 4; seed++) {
      const found = broken({
        devices: entry.devices,
        template: entry.template,
        mood: MOOD,
        seed,
        nodeCap: 20_000_000,
      })
      if (found.search.capped) return `${entry.name} (capped)`
      if (compareScore(found.score, oracles[i] as Score) !== 0) return entry.name
    }
  }
  return null
}

describe('the battery: a broken repair is caught, and named (§7.1/#78)', () => {
  const handOracles = HAND_BUILT.map((c) => bruteForceBest(c.devices, c.template))
  const generatedOracles = GENERATED.map((c) => bruteForceBest(c.devices, c.template))

  it('the unmutated search passes the whole corpus, so the corpus is not the failure', () => {
    expect(caughtBy(assign, HAND_BUILT, handOracles)).toBeNull()
    expect(caughtBy(assign, GENERATED, generatedOracles)).toBeNull()
  })

  it.each(MUTATIONS)('catches $name, which breaks $breaks', async (mutation: Mutation) => {
    const broken = await mutantAssign(mutation)
    const hand = caughtBy(broken, HAND_BUILT, handOracles)
    const rest = hand === null ? caughtBy(broken, GENERATED, generatedOracles) : null
    expect(
      hand ?? rest,
      `${mutation.name} survived every fixture in this file and 300 generated rigs — ` +
        `nothing here is testing ${mutation.breaks}`,
    ).not.toBeNull()
    if (mutation.handBuilt) {
      expect(
        hand,
        `${mutation.name} is only caught by a generated rig now (${String(rest)}). It used to be ` +
          `caught by a fixture in this file, and a corpus that loses a hand-built case loses the ` +
          `part of itself anyone can read.`,
      ).not.toBeNull()
    }
  })

  /**
   * The one case-specific claim, because it is the whole reason the exclusion is about sections
   * rather than about `sustain`: bucket two transients whose sections are disjoint and the
   * hand-built pair says so immediately, without needing a generated rig to find it.
   */
  it('is caught on the disjoint pair itself, not somewhere in the sweep', async () => {
    const broken = await mutantAssign(MUTATIONS[0] as Mutation)
    const disjoint: Case[] = [
      { name: 'a blocked disjoint pair', devices: BLOCKING, template: blockedDisjoint },
    ]
    const oracles = disjoint.map((c) => bruteForceBest(c.devices, c.template))
    expect(caughtBy(broken, disjoint, oracles)).toBe('a blocked disjoint pair')
  })
})
