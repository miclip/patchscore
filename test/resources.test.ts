import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  assign,
  assignableKey,
  moodState,
  type AssignmentResult,
  type Device,
  type Recipe,
} from '../lib/core/index'
import { box, bruteForceBest, keys, makeRecipe, placement, request, withRoles } from './rigs'

/**
 * §2.3/#25. A device-global resource that assignments consume, distinct from the voices they
 * occupy — the Tracker Mini's three synth slots across sixteen tracks.
 *
 * Two claims are being tested and they are different in kind. The schema half is authoring
 * discipline: a consumption naming nothing, or spending more than exists, is refused where it is
 * cheap to fix. The resolver half is the one the issue is actually about — the constraint is
 * **feasibility and not cost**, so it excludes allocations rather than ranking them, and the
 * unit it counts is the *loaded patch* rather than the assignment, which is not always the same
 * thing as the recipe record (`sharedAs`).
 */

const consumes = (resource = 'synth-slot', amount?: number): Partial<Recipe> => ({
  consumes: amount === undefined ? [{ resource }] : [{ resource, amount }],
})

/** Four interchangeable tracks behind two synth slots. The Tracker Mini's shape, shrunk. */
function slotBox(limit: number, over: Partial<Device> = {}): Device {
  return box('a-slots', {
    kind: 'groovebox',
    voices: [
      {
        kind: 'pool',
        id: 'track',
        label: 'Track',
        count: 4,
        roles: ['kick', 'sub', 'pad', 'lead'],
        polyphony: 4,
      },
    ],
    comfortableVoices: 4,
    resources: [{ id: 'synth-slot', limit, label: 'synth slots' }],
    recipes: [
      makeRecipe('slot-kick-hard', 'kick', 'hard', 'track', consumes()),
      makeRecipe('slot-sub-hard', 'sub', 'hard', 'track', consumes()),
      makeRecipe('slot-pad-hard', 'pad', 'hard', 'track', consumes()),
      makeRecipe('slot-lead-hard', 'lead', 'hard', 'track', consumes()),
    ],
    ...over,
  })
}

function gapFor(result: AssignmentResult, id: string) {
  return result.shortfalls.find((s) => s.requestId === id)
}

// ---------------------------------------------------------------------------
// §2.3 The manifest
// ---------------------------------------------------------------------------

describe('a device declaring resources (§2.3/#25)', () => {
  it('parses, with recipes consuming what it declares', () => {
    expect(DeviceSchema.safeParse(slotBox(3)).success).toBe(true)
  })

  it('takes a citation for the limit at `resources`, like any other capability fact (§2.6)', () => {
    const cited = slotBox(3, {
      capabilityEvidence: { resources: { kind: 'manual', source: 'Fixture p.7' } },
    })
    expect(DeviceSchema.safeParse(cited).success).toBe(true)
  })

  it('refuses two resources under one id', () => {
    const twice = slotBox(3, {
      resources: [
        { id: 'synth-slot', limit: 3, label: 'synth slots' },
        { id: 'synth-slot', limit: 4, label: 'synth slots' },
      ],
    })
    const parsed = DeviceSchema.safeParse(twice)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.error?.issues)).toContain('unique')
  })

  it('refuses a recipe consuming a resource the device does not declare', () => {
    const stray = slotBox(3, {
      recipes: [makeRecipe('slot-kick-hard', 'kick', 'hard', 'track', consumes('voice-pool'))],
    })
    const parsed = DeviceSchema.safeParse(stray)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.error?.issues)).toContain('does not declare')
  })

  it('refuses a recipe that spends more than the whole limit: it could never be assigned', () => {
    const greedy = slotBox(2, {
      recipes: [makeRecipe('slot-kick-hard', 'kick', 'hard', 'track', consumes('synth-slot', 3))],
    })
    const parsed = DeviceSchema.safeParse(greedy)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.error?.issues)).toContain('could never be assigned')
  })

  it('refuses one recipe naming the same resource twice', () => {
    const doubled = slotBox(3, {
      recipes: [
        makeRecipe('slot-kick-hard', 'kick', 'hard', 'track', {
          consumes: [{ resource: 'synth-slot' }, { resource: 'synth-slot', amount: 2 }],
        }),
      ],
    })
    expect(DeviceSchema.safeParse(doubled).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §7.1 The constraint in the search
// ---------------------------------------------------------------------------

describe('the resolver spends resources by loaded patch (§7.1/#25)', () => {
  const four = withRoles([
    request({ id: 'r-kick', role: 'kick' }),
    request({ id: 'r-sub', role: 'sub' }),
    request({ id: 'r-pad', role: 'pad' }),
    request({ id: 'r-lead', role: 'lead' }),
  ])

  it('fills every part when the box has slots for all four', () => {
    const result = assign({ devices: [slotBox(4)], template: four, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(4)
    expect(keys(result.score).misses).toEqual([0])
  })

  it('stops at the limit: four free tracks, two slots, two parts', () => {
    const result = assign({ devices: [slotBox(2)], template: four, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(2)
    expect(keys(result.score).misses).toEqual([2])
    // The voices were never the binding thing — half the pool is still idle.
    expect(result.occupancy.size).toBe(2)
  })

  it('says so honestly: the gap is no-room for a resource, not crowding', () => {
    const result = assign({ devices: [slotBox(2)], template: four, mood: moodState(), seed: 1 })
    const gap = result.shortfalls[0]
    expect(gap).toMatchObject({ reason: 'no-room', because: 'resource' })
    // §7.3 is read at the machine, so the sentence uses the box's own word for the thing.
    expect(gap?.reason === 'no-room' ? gap.detail : '').toContain('2 synth slots')
  })

  it('charges one patch once however many voices play it', () => {
    // Two lead parts at one character resolve to one recipe, so one slot carries both — which is
    // the whole subtlety of #25 and the reason the authoring cap it replaced was on *recipes*.
    const twoLeads = withRoles([
      request({ id: 'r-lead-a', role: 'lead' }),
      request({ id: 'r-lead-b', role: 'lead' }),
    ])
    const result = assign({ devices: [slotBox(1)], template: twoLeads, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(2)
    expect(result.assignments.map((a) => a.recipe.id)).toEqual(['slot-lead-hard', 'slot-lead-hard'])
    expect(keys(result.score).misses).toEqual([0])
  })

  it('counts an amount above one', () => {
    const heavy = slotBox(3, {
      resources: [{ id: 'synth-slot', limit: 3, label: 'synth slots' }],
      recipes: [
        makeRecipe('slot-pad-hard', 'pad', 'hard', 'track', consumes('synth-slot', 2)),
        makeRecipe('slot-lead-hard', 'lead', 'hard', 'track', consumes('synth-slot', 2)),
      ],
    })
    const both = withRoles([
      request({ id: 'r-pad', role: 'pad' }),
      request({ id: 'r-lead', role: 'lead' }),
    ])
    const result = assign({ devices: [heavy], template: both, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(1)
    expect(keys(result.score).misses).toEqual([1])
  })

  it('leaves a rig whose devices declare nothing exactly as it was', () => {
    const plain = slotBox(4, {
      resources: undefined,
      recipes: slotBox(4).recipes.map((r) => ({ ...r, consumes: undefined })),
    })
    const result = assign({ devices: [plain], template: four, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(4)
    expect(result.score).toEqual(
      assign({ devices: [slotBox(4)], template: four, mood: moodState(), seed: 1 }).score,
    )
  })
})

// ---------------------------------------------------------------------------
// §7.1 The constraint against the objective, and against the oracle
// ---------------------------------------------------------------------------

/**
 * The rig where taking the locally better candidate loses the guide a part: the tracker plays an
 * *exact* kick and the drum box only a substituted one, so the first candidate the search ranks
 * spends the single slot the pad then needs. Getting this right means releasing the slot on the
 * way back out — a charge that leaked on `undo` would leave the pad unfillable for the rest of
 * the search and the miss would stand.
 */
const oneSlot = box('a-slots', {
  kind: 'groovebox',
  voices: [
    { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['kick', 'pad'], polyphony: 4 },
  ],
  comfortableVoices: 4,
  resources: [{ id: 'synth-slot', limit: 1, label: 'synth slots' }],
  recipes: [
    makeRecipe('slot-kick-hard', 'kick', 'hard', 'track', consumes()),
    makeRecipe('slot-pad-hard', 'pad', 'hard', 'track', consumes()),
  ],
})

const plainDrum = box('b-drum', {
  voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('drum-kick-dirty', 'kick', 'dirty', 'bd')],
})

// ---------------------------------------------------------------------------
// §2.3 One patch written twice
// ---------------------------------------------------------------------------

/**
 * The Tracker Mini's shape, shrunk to the part that matters: recipe lookup keys on
 * `poolId ?? voiceId` (§2.2), so a synth recipe cannot reach the other pool and `onBothPools`
 * writes it twice — identical but for `id`, `voice` and a routing line. The twins are **one
 * patch**, and counting them as two would refuse a part on a box with a slot still free.
 */
function twinned(sharedKey: string | undefined, over: Partial<Device> = {}): Device {
  const patch = (id: string, voice: string): Recipe =>
    makeRecipe(id, 'pad', 'hard', voice, {
      consumes: [
        sharedKey === undefined
          ? { resource: 'synth-slot' }
          : { resource: 'synth-slot', sharedAs: sharedKey },
      ],
    })
  return box('a-twins', {
    kind: 'groovebox',
    // **One track in each pool**, so two parts cannot both hide on one of them. With a wider
    // pool the search would put both pads on one pool under one recipe, which is the *other*
    // sharing rule (§7.1's distinct-recipe count) and would pass whatever this one did.
    voices: [
      { kind: 'pool', id: 'sample', label: 'Track', count: 1, roles: ['pad'], polyphony: 4 },
      { kind: 'pool', id: 'synth', label: 'Synth Track', count: 1, roles: ['pad'], polyphony: 4 },
    ],
    comfortableVoices: 2,
    resources: [{ id: 'synth-slot', limit: 1, label: 'synth slots' }],
    recipes: [patch('tm-pad-hard-sample', 'sample'), patch('tm-pad-hard-synth', 'synth')],
    ...over,
  })
}

/** Two pads, one track in each pool, so one of them lands on each. */
const twoPads = withRoles([
  request({ id: 'r-pad-a', role: 'pad' }),
  request({ id: 'r-pad-b', role: 'pad' }),
])

describe('two recipe records that are one patch (§2.3/#25)', () => {
  it('spends one slot between them, so the second part is not refused', () => {
    const devices = [twinned('tm-pad-hard')]
    const result = assign({ devices, template: twoPads, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(2)
    expect(keys(result.score).misses).toEqual([0])
    // Both pools carry a part, which is the case the sharing key exists for: without it the
    // twins are two ids, and the second pool would have been refused on a box holding one patch.
    expect(new Set(result.assignments.map((a) => a.recipe.id)).size).toBe(2)
    expect(result.score).toEqual(bruteForceBest(devices, twoPads))
  })

  it('spends two without it, because two ids are two patches until a recipe says otherwise', () => {
    const devices = [twinned(undefined)]
    const result = assign({ devices, template: twoPads, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(1)
    expect(keys(result.score).misses).toEqual([1])
    expect(result.score).toEqual(bruteForceBest(devices, twoPads))
  })

  it('does not merge two genuinely different patches that share a resource', () => {
    // Same shape, distinct keys: two things, two slots, one limit — one part.
    const devices = [
      twinned('tm-pad-hard', {
        recipes: [
          makeRecipe('tm-pad-hard-sample', 'pad', 'hard', 'sample', {
            consumes: [{ resource: 'synth-slot', sharedAs: 'one-patch' }],
          }),
          makeRecipe('tm-pad-hard-synth', 'pad', 'hard', 'synth', {
            consumes: [{ resource: 'synth-slot', sharedAs: 'another-patch' }],
          }),
        ],
      }),
    ]
    const result = assign({ devices, template: twoPads, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(1)
    expect(keys(result.score).misses).toEqual([1])
  })

  it('releases the shared slot only when the last holder lets go', () => {
    // Three pads on a two-slot box, two of them one patch: the twins share a slot and the third
    // takes the other, so nothing is missed — and a release on the *first* twin to be undone
    // would have freed a slot that was still in use.
    const devices = [
      twinned('tm-pad-hard', {
        voices: [
          { kind: 'pool', id: 'sample', label: 'Track', count: 1, roles: ['pad'], polyphony: 4 },
          {
            kind: 'pool',
            id: 'synth',
            label: 'Synth Track',
            count: 2,
            roles: ['pad'],
            polyphony: 4,
          },
        ],
        comfortableVoices: 3,
        resources: [{ id: 'synth-slot', limit: 2, label: 'synth slots' }],
        recipes: [
          makeRecipe('tm-pad-hard-sample', 'pad', 'hard', 'sample', {
            consumes: [{ resource: 'synth-slot', sharedAs: 'tm-pad-hard' }],
          }),
          makeRecipe('tm-pad-hard-synth', 'pad', 'hard', 'synth', {
            consumes: [{ resource: 'synth-slot', sharedAs: 'tm-pad-hard' }],
          }),
          makeRecipe('tm-pad-dark-synth', 'pad', 'dark', 'synth', consumes()),
        ],
      }),
    ]
    const three = withRoles([
      request({ id: 'r-pad-a', role: 'pad' }),
      request({ id: 'r-pad-b', role: 'pad' }),
      request({ id: 'r-pad-c', role: 'pad', character: 'dark' }),
    ])
    const result = assign({ devices, template: three, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(3)
    expect(keys(result.score).misses).toEqual([0])
    expect(result.score).toEqual(bruteForceBest(devices, three))
  })

  it('refuses two recipes that share a key and disagree about the cost', () => {
    const disagreeing = twinned('tm-pad-hard', {
      resources: [{ id: 'synth-slot', limit: 3, label: 'synth slots' }],
      recipes: [
        makeRecipe('tm-pad-hard-sample', 'pad', 'hard', 'sample', {
          consumes: [{ resource: 'synth-slot', sharedAs: 'tm-pad-hard' }],
        }),
        makeRecipe('tm-pad-hard-synth', 'pad', 'hard', 'synth', {
          consumes: [{ resource: 'synth-slot', sharedAs: 'tm-pad-hard', amount: 2 }],
        }),
      ],
    })
    const parsed = DeviceSchema.safeParse(disagreeing)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.error?.issues)).toContain('one loaded thing has one cost')
  })
})

describe('a resource the objective has to route around (§7.1/#25)', () => {
  const both = withRoles([
    request({ id: 'r-kick', role: 'kick' }),
    request({ id: 'r-pad', role: 'pad' }),
  ])
  const devices = [oneSlot, plainDrum]
  const result = assign({ devices, template: both, mood: moodState(), seed: 1 })

  it('takes the substituted kick elsewhere rather than losing the pad', () => {
    expect(keys(result.score).misses).toEqual([0])
    expect(placement(result, 'r-kick')).toBe('b-drum/bd')
    expect(placement(result, 'r-pad')).toBe('a-slots/track-1')
  })

  it('agrees with the brute-force oracle, which checks the budget at the leaf', () => {
    expect(result.score).toEqual(bruteForceBest([...devices], both))
  })

  it('is the same answer on every seed: the constraint is not a tie-break', () => {
    for (const seed of [0, 1, 2, 7, 99]) {
      const again = assign({ devices, template: both, mood: moodState(), seed })
      expect(again.score).toEqual(result.score)
      expect(again.assignments.map((a) => a.assignables.map(assignableKey).join('+'))).toEqual(
        result.assignments.map((a) => a.assignables.map(assignableKey).join('+')),
      )
    }
  })
})
