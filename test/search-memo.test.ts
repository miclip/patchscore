import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NODE_CAP,
  assign,
  compareScore,
  measureMemoSearch,
  moodState,
  type AssignInput,
  type AssignmentResult,
  type Character,
  type Device,
  type Role,
  type RoleRequest,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { box, bruteForceBest, makeRecipe, request, withRoles } from './rigs'

/**
 * #159 item 2. The memo caches the best completion of a *canonical state* and serves it to any
 * later node reaching the same one, so this file exists to attack the single thing that can go
 * wrong: two nodes treated as one sub-problem when they are not.
 *
 * The assertion throughout is **byte-identical results**, not merely equal scores. §7.2 says the
 * seed permutes only among exactly equal choices and the first winner in DFS order is what the
 * guide shows, so a memo returning the other member of a tie would be wrong while scoring the
 * same, and a test comparing only `Score` would pass.
 *
 * `memo` on `AssignInput` defaults to off — see its docstring for the measurement that decided
 * that — so every case here asks for it explicitly and runs both ways round.
 */

// ---------------------------------------------------------------------------
// The comparison
// ---------------------------------------------------------------------------

/**
 * Everything an `AssignmentResult` says that a caller can see, except the node count, which is
 * the one field the memo is *meant* to change.
 *
 * Recipes and assignables are named by id rather than compared by identity: a stack candidate is
 * built fresh at every node it is materialised at (`materialiseStacks`), so a cached one is a
 * different object naming the same voices, and identity would fail on a correct memo.
 */
function shapeOf(result: AssignmentResult): string {
  return JSON.stringify({
    score: result.score as unknown as number[],
    assignments: result.assignments.map((a) => ({
      requestId: a.requestId,
      role: a.role,
      character: a.character,
      deviceId: a.deviceId,
      recipe: a.recipe.id,
      outcome: a.outcome,
      recipeCharacter: a.recipeCharacter,
      voices: a.assignables.map((x) => `${x.deviceId}/${x.voiceId}`),
      sections: a.sections,
    })),
    shortfalls: result.shortfalls.map((s) => ({
      requestId: s.requestId,
      reason: s.reason,
      kind: s.kind,
      because: 'because' in s ? s.because : undefined,
    })),
    occupancy: [...result.occupancy.entries()]
      .map(([key, bySection]) => [key, [...bySection.entries()].sort()] as const)
      .sort(),
    method: result.search.method,
  })
}

/**
 * The two runs, and whether the cap fired differently between them.
 *
 * **A cap that fires on one side and not the other is a legitimate difference, not a defect.**
 * §7.1's cap is a latency guard: hitting it swaps the exhaustive answer for the greedy one. The
 * memo makes the walk cheaper, so an input that blew the cap unmemoised can finish inside it
 * memoised, and then the two sides are answering different questions — one exhaustively, one
 * greedily. Every case that pins a cap low enough to matter has to say which it expects.
 */
function bothWays(input: AssignInput): {
  off: AssignmentResult
  on: AssignmentResult
  sameCapping: boolean
} {
  const off = assign({ ...input, memo: false })
  const on = assign({ ...input, memo: true })
  return { off, on, sameCapping: off.search.capped === on.search.capped }
}

function sameResult(input: AssignInput, where: string): void {
  const { off, on } = bothWays(input)
  expect(shapeOf(on), where).toBe(shapeOf(off))
}

/** Both node counts and the memo's own tally, for the cases that assert on them. */
function counts(input: AssignInput) {
  const comparison = measureMemoSearch(input)
  return {
    off: comparison.off.search.nodes,
    strict: comparison.strict.search.nodes,
    guarded: comparison.guarded.search.nodes,
    cached: comparison.guarded.memo.cached,
    hits: comparison.guarded.memo.hits,
    bounded: comparison.off.memo.bounded,
    leaves: comparison.off.memo.leaves,
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Three boxes whose kick voices are interchangeable at equal cost, so two same-role requests can
 * swap devices and reach one occupancy from two prefixes carrying different accumulated cost.
 * That is the pair the memo must treat as one sub-problem, and must not let contaminate each
 * other.
 */
const one = box('m-one', {
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
  recipes: [makeRecipe('one-hard', 'kick', 'hard', 'v'), makeRecipe('one-soft', 'kick', 'soft', 'v')],
})
const two = box('m-two', {
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
  recipes: [makeRecipe('two-clean', 'kick', 'clean', 'v')],
})
const three = box('m-three', {
  voices: [
    { kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'w', label: 'W', roles: ['snare'], polyphony: 1 },
  ],
  recipes: [
    makeRecipe('three-hard', 'kick', 'hard', 'v'),
    makeRecipe('three-snare', 'snare', 'hard', 'w'),
  ],
})

/** A pool, so symmetry breaking and the stack path are in play too. */
const pool = box('m-pool', {
  voices: [
    { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['kick', 'snare', 'pad'], polyphony: 1 },
  ],
  recipes: [
    makeRecipe('pool-kick', 'kick', 'hard', 'track'),
    makeRecipe('pool-snare', 'snare', 'hard', 'track'),
    makeRecipe('pool-pad', 'pad', 'hard', 'track', { realisation: 'polyphonic-voice' }),
  ],
})

function convergent(): Template {
  return withRoles([
    request({ id: 'r-a', role: 'kick', priority: 1 }),
    request({ id: 'r-b', role: 'kick', priority: 1 }),
    request({ id: 'r-c', role: 'kick', priority: 2 }),
    request({ id: 'r-d', role: 'snare', priority: 2 }),
  ])
}

const NEUTRAL = moodState()

function input(devices: Device[], template: Template, over: Partial<AssignInput> = {}): AssignInput {
  return { devices, template, mood: NEUTRAL, seed: 3, ...over }
}

const industrialTechno = TEMPLATES.find((t) => t.id === 'industrial-techno') as Template
const ambientDub = TEMPLATES.find((t) => t.id === 'ambient-dub') as Template

// ---------------------------------------------------------------------------

describe('the memo answers what the walk would have answered (#159)', () => {
  it('agrees on convergent states reached with different prefix costs', () => {
    const devices = [one, two, three]
    const template = convergent()
    // The fixture has to actually converge, or this asserts nothing.
    expect(counts(input(devices, template)).cached, 'nothing cached, so nothing served').toBeGreaterThan(0)
    for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
      sameResult(input(devices, template, { seed }), `convergent, seed ${seed}`)
    }
  })

  it('still agrees when the converging prefixes differ in every additive key', () => {
    // `r-a` and `r-b` want opposite characters, so the two orders reach one occupancy with
    // different `recipeDistance` *and* different `roleFitPenalty`. If a completion were stored
    // with the prefix folded into it, this is where it would show.
    const template = withRoles([
      request({ id: 'r-a', role: 'kick', priority: 1, character: 'hard' }),
      request({ id: 'r-b', role: 'kick', priority: 1, character: 'soft' }),
      request({ id: 'r-c', role: 'kick', priority: 2, character: 'clean' }),
      request({ id: 'r-d', role: 'snare', priority: 3 }),
    ])
    for (const seed of [0, 4, 9]) {
      sameResult(input([one, two, three, pool], template, { seed }), `mixed characters, seed ${seed}`)
    }
  })

  it('agrees where §12.6 distinct binds two same-role requests', () => {
    // `distinct` is the one constraint not derivable from occupancy — a device can be busy from
    // a request the rule does not touch — so the canonical key carries it by hand. The fuzz
    // below is what proves that carrying matters; this pins the plain cases.
    const template = withRoles([
      request({ id: 'r-a', role: 'kick', priority: 1, distinct: true }),
      request({ id: 'r-b', role: 'kick', priority: 1, distinct: true }),
      request({ id: 'r-c', role: 'kick', priority: 2, distinct: true }),
      request({ id: 'r-d', role: 'snare', priority: 2 }),
    ])
    const devices = [one, two, three, pool]
    for (const seed of [0, 1, 2, 6, 11]) {
      sameResult(input(devices, template, { seed }), `distinct, seed ${seed}`)
    }
  })

  it('agrees where distinct is unsatisfiable and forces a miss', () => {
    // Four distinct requests, three devices carrying the role: one has to miss, and which one
    // is a first-winner decision the memo must not move.
    const template = withRoles([
      request({ id: 'r-a', role: 'kick', priority: 1, distinct: true }),
      request({ id: 'r-b', role: 'kick', priority: 1, distinct: true }),
      request({ id: 'r-c', role: 'kick', priority: 1, distinct: true }),
      request({ id: 'r-d', role: 'kick', priority: 1, distinct: true }),
    ])
    for (const seed of [0, 2, 7]) {
      sameResult(input([one, two, three], template, { seed }), `distinct starved, seed ${seed}`)
    }
  })

  it('agrees where a request occupies no section at all', () => {
    // §4.2: a `transient` request naming no section of this structure occupies its voice in
    // *nothing*. `apply` still creates the occupancy entry and still counts the assignable
    // against `comfortableVoices`, so the voice is spent and its device is not idle, while
    // `keyIsFree` lets anything share it. A canonical key that skipped empty entries spelled two
    // different states the same way and the memo answered the wrong one — the fuzz found it, and
    // this is the shrunk case.
    const template = withRoles([
      request({ id: 'r-a', role: 'kick', priority: 1, sustain: 'transient', sections: ['Nowhere'] }),
      request({ id: 'r-b', role: 'kick', priority: 1, sustain: 'transient', sections: ['Nowhere'] }),
      request({ id: 'r-c', role: 'snare', priority: 2, sustain: 'transient', sections: ['Nowhere'] }),
    ])
    for (const seed of [0, 1, 2, 3]) {
      sameResult(input([one, two, three], template, { seed }), `sectionless, seed ${seed}`)
    }
  })

  it('agrees where the incumbent bound prunes most of the tree', () => {
    const measured = counts(input([...DEVICES], ambientDub, { seed: 2 }))
    expect(measured.bounded / measured.off, 'the bound is barely firing').toBeGreaterThan(0.5)
    sameResult(input([...DEVICES], ambientDub, { seed: 2 }), 'ambient-dub seed 2')
  })

  it('agrees when the cap fires on both sides', () => {
    // A capped walk stops for a reason with nothing to do with the objective, so nothing is
    // known about what it did not reach and no subtree containing the cap is ever cached. Both
    // sides fall back to greedy and must produce the same guide.
    for (const cap of [1, 7, 64, 500, 5_000]) {
      const args = { devices: DEVICES, template: industrialTechno, mood: NEUTRAL, seed: 9, nodeCap: cap }
      const { off, on, sameCapping } = bothWays(args)
      expect(off.search.capped, `cap ${cap} did not fire`).toBe(true)
      expect(sameCapping, `cap ${cap} fired on one side only`).toBe(true)
      expect(off.search.method, `cap ${cap}`).toBe('greedy')
      sameResult(args, `capped at ${cap}`)
    }
  })

  it('agrees on every shipped direction, over seeds and over the mood grid', () => {
    for (const template of TEMPLATES) {
      for (const seed of [0, 1, 5, 9, 17]) {
        sameResult({ devices: DEVICES, template, mood: NEUTRAL, seed }, `${template.id} seed ${seed}`)
      }
    }
    // `resolveCharacter` reads `darkness` and `grit` together (see `bench-decomposition.ts`), so
    // the corners of that pair are where a candidate list is likeliest to empty out.
    for (const darkness of [0, 100]) {
      for (const grit of [0, 100]) {
        sameResult(
          { devices: DEVICES, template: ambientDub, mood: moodState({ darkness, grit }), seed: 2 },
          `mood ${darkness}/${grit}`,
        )
      }
    }
  }, 180_000)

  it('reaches the same optimum as brute force with the memo on', () => {
    // Checked against the *independent* oracle as well as against the traversal it replaces, so
    // a mistake shared by both traversals cannot hide.
    const devices = [one, two, three]
    const template = convergent()
    const memoised = assign({ devices, template, mood: NEUTRAL, seed: 3, memo: true })
    expect(compareScore(memoised.score, bruteForceBest([...devices], template))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The fuzz
// ---------------------------------------------------------------------------

/**
 * Random rigs and random directions, memo on against memo off.
 *
 * Hand-built fixtures were not enough and this is the record of it. Three of the four parts of
 * the canonical key were already right by argument; the fourth — occupancy entries holding no
 * sections at all — was wrong, and every hand-written case above passed while it was wrong,
 * because no shipped direction produces one. Deleting any one part of the key today makes this
 * go red: `distinct`, the section lists, the request index, and the empty entries each cost
 * between 8 and 181 uncapped mismatches in a run this size.
 *
 * A seeded xorshift, not `Math.random`, so a failure names a trial number somebody can rerun.
 * This is a test rather than the resolver, so §7.2's ban on randomness is not in play, but a
 * fuzz nobody can reproduce is not worth having either.
 */
function xorshift(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

const FUZZ_ROLES: Role[] = ['kick', 'snare', 'sub', 'pad', 'lead']
const FUZZ_CHARACTERS: Character[] = ['hard', 'soft', 'clean', 'dark', 'bright', 'dirty']

function pick<T>(r: () => number, from: readonly T[]): T {
  return from[Math.floor(r() * from.length)] as T
}

function fuzzRig(r: () => number): Device[] {
  const out: Device[] = []
  for (let d = 0; d < 2 + Math.floor(r() * 3); d++) {
    const voices: Device['voices'][number][] = []
    const recipes: Device['recipes'][number][] = []
    for (let v = 0; v < 1 + Math.floor(r() * 3); v++) {
      const id = `v${v}`
      const roles = [...new Set([pick(r, FUZZ_ROLES), pick(r, FUZZ_ROLES)])]
      voices.push({
        kind: 'fixed',
        id,
        label: id.toUpperCase(),
        roles,
        polyphony: 1 + Math.floor(r() * 2),
      })
      for (const role of roles) {
        const character = pick(r, FUZZ_CHARACTERS)
        recipes.push(makeRecipe(`d${d}-${id}-${role}-${character}`, role, character, id))
      }
    }
    out.push(box(`box-${d}`, { voices, recipes }))
  }
  return out
}

function fuzzTemplate(r: () => number): Template {
  const roles: RoleRequest[] = []
  for (let i = 0; i < 2 + Math.floor(r() * 4); i++) {
    roles.push(
      request({
        id: `r-${i}`,
        role: pick(r, FUZZ_ROLES),
        priority: 1 + Math.floor(r() * 3),
        character: pick(r, FUZZ_CHARACTERS),
        // Half the requests carry §12.6, which is far denser than any real direction — no
        // shipped one uses it at all, so the constraint would otherwise go untested.
        ...(r() < 0.5 ? { distinct: true } : {}),
        // A transient request with no `sections` occupies nothing, which is the case the
        // hand-written fixtures all missed.
        ...(r() < 0.3 ? { sustain: 'transient' as const } : { sustain: 'continuous' as const }),
        ...(r() < 0.2 ? { optional: true, inessential: { reason: 'fuzz' } } : {}),
      }),
    )
  }
  return withRoles(roles)
}

describe('the memo survives random rigs (#159)', () => {
  it('matches the unmemoised walk on every uncapped case', () => {
    let ran = 0
    let cappingDiverged = 0
    const failures: string[] = []
    for (let trial = 1; trial <= 1_500; trial++) {
      const r = xorshift(trial)
      const devices = fuzzRig(r)
      const template = fuzzTemplate(r)
      for (const seed of [0, 1, 2]) {
        for (const nodeCap of [undefined, 12, 60]) {
          const args: AssignInput = { devices, template, mood: NEUTRAL, seed, nodeCap }
          ran++
          const { off, on, sameCapping } = bothWays(args)
          if (!sameCapping) {
            // The memo finished inside a cap the plain walk blew. Expected, and the memo's
            // answer is the exhaustive one, so it is the better of the two.
            cappingDiverged++
            expect(on.search.capped, `trial ${trial} seed ${seed} cap ${nodeCap}`).toBe(false)
            continue
          }
          if (shapeOf(on) !== shapeOf(off) && failures.length < 3) {
            failures.push(`trial ${trial} seed ${seed} cap ${nodeCap}\n  off ${shapeOf(off)}\n   on ${shapeOf(on)}`)
          }
        }
      }
    }
    expect(failures.join('\n')).toBe('')
    expect(ran).toBeGreaterThan(10_000)
    // The fuzz has to reach the cap divergence, or the branch above is dead and the caps in the
    // matrix are decoration.
    expect(cappingDiverged, 'no case ever capped one way and not the other').toBeGreaterThan(0)
  }, 120_000)
})

// ---------------------------------------------------------------------------

describe('what the memo costs and what it buys (#159)', () => {
  /**
   * The finding, asserted so it cannot rot quietly.
   *
   * §7.1's search is **bound-dominated**: it arrives at a node, fails the lower bound and
   * abandons it. On `industrial-techno` seed 9 that is 143,270 of 165,785 nodes, and a complete
   * assignment is reached seven times in the whole run. A memo keyed on canonical state can only
   * serve a node whose subtree was solved, and almost no subtree is.
   *
   * The bands are wide because the exact numbers move whenever a device or a recipe lands. What
   * must not move unnoticed is the *shape*: overwhelmingly bounded, a handful of leaves, and a
   * memo saving single-digit percentages at best.
   */
  it('finds the shipped worst case to be almost entirely bounded nodes', () => {
    const measured = counts({
      devices: DEVICES,
      template: industrialTechno,
      mood: NEUTRAL,
      seed: 9,
      nodeCap: 20_000_000,
    })
    expect(measured.bounded / measured.off).toBeGreaterThan(0.8)
    expect(measured.leaves).toBeLessThan(100)
    // Under 5% saved. If this ever fails high the memo has started earning its keep, and the
    // decision recorded on `AssignInput.memo` should be re-taken.
    expect(1 - measured.guarded / measured.off).toBeLessThan(0.05)
  }, 120_000)

  it('caches nothing at all under the strict rule', () => {
    // The obvious rule — cache only a subtree with no prune anywhere inside it — is inert here,
    // and `Outcome` records why. Kept as an assertion because it is the reason the guarded rule
    // exists, and because a change that made it work would be worth knowing about.
    const comparison = measureMemoSearch({
      devices: DEVICES,
      template: ambientDub,
      mood: NEUTRAL,
      seed: 2,
      nodeCap: 20_000_000,
    })
    expect(comparison.strict.memo.cached).toBe(0)
    expect(comparison.strict.memo.hits).toBe(0)
    expect(comparison.strict.search.nodes).toBe(comparison.off.search.nodes)
    expect(comparison.guarded.memo.cached).toBeGreaterThan(0)
  }, 60_000)

  it('leaves the shipped path on the unmemoised traversal', () => {
    // The default is off. If that flips, `DEFAULT_NODE_CAP`'s docstring and §7.1's recorded
    // worst case are both talking about a different search and have to be re-measured.
    const template = TEMPLATES.find((t) => t.id === 'weave') as Template
    const shipped = assign({ devices: DEVICES, template, mood: NEUTRAL, seed: 8 })
    const explicit = assign({ devices: DEVICES, template, mood: NEUTRAL, seed: 8, memo: false })
    expect(shipped.search.nodes).toBe(explicit.search.nodes)
    expect(shipped.search.nodeCap).toBe(DEFAULT_NODE_CAP)
  })
})
