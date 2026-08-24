import { describe, expect, it } from 'vitest'
import {
  assign,
  assignableKey,
  moodState,
  type Assignable,
  type AssignmentResult,
  type Character,
  type Device,
  type Score,
} from '../lib/core/index'
import { box, bruteForceBest, keys, makeRecipe, request, withRoles } from './rigs'

/**
 * §12.4 stacking — one part spread over several interchangeable voices of one device pool.
 *
 * The mechanism DESIGN deferred and then described in full: "the answer for a role with **no
 * chord sample authored**". These tests are the fixtures §12.4 says the two open questions had
 * to be decided in front of — what stacking costs, and where it sits against `sampled-chord`.
 *
 * Nothing here asserts a cost *number*. §7.1's fixtures assert relative outcomes so they
 * survive a re-ordering of the lower keys, and the keys these exercise are near the bottom.
 */

const SEEDS = [0, 1, 2, 3, 5, 8, 13, 21]

/** Three mono tracks, a real per-voice pad recipe, and no chord sample anywhere. */
const monoPool = box('a-tracker', {
  kind: 'groovebox',
  voices: [
    { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad', 'kick'], polyphony: 1 },
  ],
  comfortableVoices: 4,
  recipes: [
    makeRecipe('track-pad-dark', 'pad', 'dark', 'track'),
    makeRecipe('track-kick-hard', 'kick', 'hard', 'track'),
  ],
})

/** One eight-note voice: the part one box can carry on its own. */
const polySynth = box('b-poly', {
  kind: 'synth',
  voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['pad'], polyphony: 8 }],
  recipes: [makeRecipe('v-pad-dark', 'pad', 'dark', 'v')],
})

/** One mono voice that reaches a triad the other way — a chord in one sample. */
const chordSampler = box('c-sampler', {
  kind: 'sampler',
  voices: [{ kind: 'fixed', id: 's', label: 'Sample', roles: ['pad'], polyphony: 1 }],
  recipes: [
    makeRecipe('s-pad-dark', 'pad', 'dark', 's', { realisation: 'sampled-chord' }),
  ],
})

/** One monophonic voice on its own box — the shape #40 asks for a rack of. */
function mono(id: string, character: Character = 'dark'): Device {
  return box(id, {
    kind: 'synth',
    voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['pad'], polyphony: 1 }],
    recipes: [makeRecipe(`${id}-v-pad`, 'pad', character, 'v')],
  })
}

/** Three separate fixed voices on one box: interchangeable in fact, not by declaration. */
const threeFixed = box('a-three-fixed', {
  kind: 'synth',
  voices: [
    { kind: 'fixed', id: 'v1', label: 'V1', roles: ['pad'], polyphony: 1 },
    { kind: 'fixed', id: 'v2', label: 'V2', roles: ['pad'], polyphony: 1 },
    { kind: 'fixed', id: 'v3', label: 'V3', roles: ['pad'], polyphony: 1 },
  ],
  recipes: [
    makeRecipe('v1-pad-dark', 'pad', 'dark', 'v1'),
    makeRecipe('v2-pad-dark', 'pad', 'dark', 'v2'),
    makeRecipe('v3-pad-dark', 'pad', 'dark', 'v3'),
  ],
})

const triad = withRoles([
  request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
])

function placed(result: AssignmentResult, requestId: string): string[] {
  const found = result.assignments.find((a) => a.requestId === requestId)
  return (found?.assignables ?? []).map((a: Assignable) => assignableKey(a))
}

function run(devices: Device[], t = triad, seed = 1): AssignmentResult {
  return assign({ devices, template: t, mood: moodState(), seed })
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

describe('stacking eligibility is inferred, never declared (§12.4)', () => {
  it('a request for more notes than one voice sounds stacks, with no template gate', () => {
    // The template says `polyphony: 3` and nothing else. There is no opt-in on the request,
    // none on the device, and none in the rig — the note count is the whole trigger.
    const result = run([monoPool])
    expect(placed(result, 'r-pad')).toEqual([
      'a-tracker/track-1',
      'a-tracker/track-2',
      'a-tracker/track-3',
    ])
    expect(result.gaps).toEqual([])
  })

  it('a one-note request never stacks, however many free voices the pool has', () => {
    const t = withRoles([request({ id: 'r-pad', role: 'pad', character: 'dark' })])
    expect(placed(run([monoPool], t), 'r-pad').length).toBe(1)
  })

  it('a kick takes one voice and one voice only, across a rack that could stack a pad', () => {
    // The case that has to keep working, and the reason eligibility is a note count rather
    // than a rig property: a rack of monosynths is exactly the rig stacking exists for, and a
    // kick asked for at one note must still come out as one kick on one voice.
    const kickBoxes = ['a-one', 'b-two', 'c-three'].map((id) =>
      box(id, {
        kind: 'synth',
        voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['kick'], polyphony: 1 }],
        recipes: [makeRecipe(`${id}-v-kick`, 'kick', 'hard', 'v')],
      }),
    )
    const t = withRoles([request({ id: 'r-kick', role: 'kick', character: 'hard' })])
    const result = run(kickBoxes, t)
    expect(placed(result, 'r-kick')).toEqual(['a-one/v'])
    expect(result.assignments[0]?.members.length).toBe(1)
    expect(keys(result.score).stackedVoices).toBe(0)
  })

  it('stacks three separate fixed voices on one device — no pool required', () => {
    // The pool is an efficiency device inside the search, never the licence to stack. Three
    // fixed mono voices on one box are three voices, and a triad fits across them.
    const result = run([threeFixed])
    expect(placed(result, 'r-pad')).toEqual([
      'a-three-fixed/v1',
      'a-three-fixed/v2',
      'a-three-fixed/v3',
    ])
    expect(result.gaps).toEqual([])
  })

  it('stacks across separate devices: a Cascadia and a Crave and one more (#40)', () => {
    // #40's own words — "a rack of Moog semi-modulars, a Cascadia plus a Crave, anything
    // all-monophonic". Three boxes, one note each, one part.
    const result = run([mono('a-cascadia'), mono('b-crave'), mono('c-moog')])
    expect(placed(result, 'r-pad')).toEqual(['a-cascadia/v', 'b-crave/v', 'c-moog/v'])
    expect(result.assignments.length).toBe(1)
    expect(result.gaps).toEqual([])
  })

  it('gives each member its own resolved recipe, outcome and character', () => {
    // Two boxes authoring the same role at different characters. One is exact for a dark pad,
    // the other is a substitution, and the part is honest about being both.
    const exact = mono('a-exact', 'dark')
    const substituted = mono('b-sub', 'soft')
    const third = mono('c-third', 'dark')
    const found = run([exact, substituted, third]).assignments[0]
    expect(found?.members.map((m) => m.deviceId)).toEqual(['a-exact', 'b-sub', 'c-third'])
    expect(found?.members.map((m) => m.outcome)).toEqual(['exact', 'substituted', 'exact'])
    expect(found?.members.map((m) => m.recipeCharacter)).toEqual(['dark', 'soft', 'dark'])
    expect(found?.members.map((m) => m.recipe.id)).toEqual([
      'a-exact-v-pad',
      'b-sub-v-pad',
      'c-third-v-pad',
    ])
    // The fields a renderer already reads still describe the first voice, unchanged.
    expect(found?.recipe.id).toBe('a-exact-v-pad')
    expect(found?.outcome).toBe('exact')
    expect(found?.deviceId).toBe('a-exact')
  })

  it('splits the notes across the members, and the shares sum to the request', () => {
    const found = run([mono('a-one'), mono('b-two'), mono('c-three')]).assignments[0]
    expect(found?.members.map((m) => m.notes)).toEqual([1, 1, 1])

    // A two-note voice and a one-note voice make a triad, and carry 2 and 1 respectively.
    const duo = box('a-duo', {
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['pad'], polyphony: 2 }],
      recipes: [makeRecipe('a-duo-v-pad', 'pad', 'dark', 'v')],
    })
    const mixed = run([duo, mono('b-solo')]).assignments[0]
    expect(mixed?.members.map((m) => m.notes)).toEqual([2, 1])
    expect(mixed?.members.reduce((sum, m) => sum + m.notes, 0)).toBe(3)
  })

  it('never spends a fourth voice once three cover a triad', () => {
    // Minimality: the enumeration stops the moment the count is covered, so no option contains
    // a voice that could be removed while still carrying the part.
    const four = [mono('a-one'), mono('b-two'), mono('c-three'), mono('d-four')]
    expect(placed(run(four), 'r-pad').length).toBe(3)
  })

  it('needs the whole stack free, and gaps honestly when the pool is one voice short', () => {
    const twoTracks = box('a-two', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 2, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const gap = run([twoTracks]).gaps[0]
    expect(gap).toMatchObject({ reason: 'no-capable-voice', because: 'polyphony', notes: 3 })
    // The voices declare the role and still cannot carry it, so they are `roleVoices` and not
    // `capable` — the distinction §7.3 draws so `capable` means one thing everywhere.
    expect(gap?.capable).toEqual([])
    expect(gap?.reason === 'no-capable-voice' && gap.roleVoices.length).toBe(2)
  })

  it('takes ceil(notes / polyphony) voices, not one per note', () => {
    const twoNoteTracks = box('a-duo', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 2 },
      ],
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    expect(placed(run([twoNoteTracks]), 'r-pad')).toEqual(['a-duo/track-1', 'a-duo/track-2'])
  })
})

// ---------------------------------------------------------------------------
// One recipe, several voices
// ---------------------------------------------------------------------------

describe('a stack is one part, not several (§12.4)', () => {
  it('shares one recipe across a pool stack, because its members share everything', () => {
    const found = run([monoPool]).assignments[0]
    expect(found?.recipe.id).toBe('track-pad-dark')
    expect(found?.assignables.length).toBe(3)
    // The one voice the guide names it by is the lowest member, and `assignable` still points
    // at a real voice for every consumer that never learned about stacks.
    expect(found?.assignable.voiceId).toBe('track-1')
  })

  it('never stacks a chord sample: a sample that carries the chord carries it alone', () => {
    const sampledPool = box('a-sampled', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('track-pad-dark', 'pad', 'dark', 'track', { realisation: 'sampled-chord' }),
      ],
    })
    const found = run([sampledPool]).assignments[0]
    expect(found?.assignables.length).toBe(1)
    expect(keys(run([sampledPool]).score).stackedVoices).toBe(0)
  })

  it('occupies every member under the same request id, in every section', () => {
    const result = run([monoPool])
    for (const voiceId of ['track-1', 'track-2', 'track-3']) {
      const bySection = result.occupancy.get(`a-tracker/${voiceId}`)
      expect([...(bySection?.values() ?? [])], voiceId).toEqual(['r-pad', 'r-pad', 'r-pad'])
    }
    // And the fourth track is untouched, so a later part can still have it.
    expect(result.occupancy.get('a-tracker/track-4')).toBeUndefined()
  })

  it('names its members in ordinal order whatever order they were chosen in', () => {
    // r-kick takes track-1 first, so the pad's members are 2, 3, 4 — and are reported in that
    // order rather than in the order the dominance rule walked them.
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2, polyphony: 3 }),
    ])
    expect(placed(run([monoPool], t), 'r-pad')).toEqual([
      'a-tracker/track-2',
      'a-tracker/track-3',
      'a-tracker/track-4',
    ])
  })
})

// ---------------------------------------------------------------------------
// Crowding
// ---------------------------------------------------------------------------

describe('every member of a stack costs a voice (§12.4)', () => {
  it('charges crowding for all three, so a triad on a tracker is as expensive as three parts', () => {
    const tight = box('a-tight', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      // One voice past comfortable for a two-voice stack, three past it for a triad.
      comfortableVoices: 1,
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    expect(keys(run([tight]).score).crowdOverflow).toBe(2)

    const pair = withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 2 }),
    ])
    expect(keys(run([tight], pair).score).crowdOverflow).toBe(1)
  })

  it('keeps the whole stack off a box it would over-subscribe', () => {
    // The tight box is comfortable with nothing, so any voice of it taken costs a point of
    // `crowdOverflow`. Spreading the triad onto it would also wake an otherwise idle device,
    // which the objective mildly likes — and crowding outranks idleness, so it does not.
    const roomy = box('b-roomy', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      comfortableVoices: 4,
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const tight = box('a-tight', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      comfortableVoices: 0,
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const result = run([tight, roomy])
    expect(placed(result, 'r-pad').every((k) => k.startsWith('b-roomy/'))).toBe(true)
    expect(keys(result.score).crowdOverflow).toBe(0)
  })

  it('spreads across boxes when nothing is crowded, which is what idleDevices asks for', () => {
    // The mirror of the case above, and the reason it needed a crowded box to be a test of
    // crowding at all: with room everywhere, the last key in the vector prefers a triad that
    // wakes two boxes over one that leaves a box switched on and unused.
    const left = box('a-left', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      comfortableVoices: 4,
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const right = box('b-right', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      comfortableVoices: 4,
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const devices = new Set(run([left, right]).assignments[0]?.members.map((m) => m.deviceId))
    expect(devices.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Where a stack sits in the objective
// ---------------------------------------------------------------------------

describe('the ranking §12.4 left open, decided (§7.1)', () => {
  it('a single genuinely polyphonic voice beats a stack, on every seed', () => {
    for (const seed of SEEDS) {
      expect(placed(run([monoPool, polySynth], triad, seed), 'r-pad'), `seed ${seed}`).toEqual([
        'b-poly/v',
      ])
    }
  })

  it('beats a stack even when the polyphonic voice is on a crowded box', () => {
    const crowdedPoly = box('b-poly', {
      kind: 'synth',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['pad'], polyphony: 8 }],
      comfortableVoices: 0,
      recipes: [makeRecipe('v-pad-dark', 'pad', 'dark', 'v')],
    })
    // `crowdOverflow` outranks `stackedVoices`, so this is the one thing that reverses it —
    // and the assertion is that the rest of the vector does not.
    expect(placed(run([monoPool, crowdedPoly]), 'r-pad')).not.toEqual(['b-poly/v'])
  })

  it('a chord sample beats a stack: stacking is for when no sample is authored', () => {
    // §12.4 refused to decide this in advance of a fixture. This is the fixture, and it agrees
    // with the worked example already in DESIGN — `tm-pad-soft-chord` "costs none of the box's
    // three synth slots, a real advantage", and a three-track stack costs three tracks.
    expect(placed(run([monoPool, chordSampler]), 'r-pad')).toEqual(['c-sampler/s'])
  })

  it('a stack beats a miss, which is the whole of #40', () => {
    const result = run([monoPool])
    expect(result.assignments.length).toBe(1)
    expect(result.gaps).toEqual([])
    expect(keys(result.score).misses.reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('a stack beats an optional miss too, but loses to a required one', () => {
    // Four tracks, a required triad and an optional kick. Filling the triad takes three of the
    // four and the kick still fits; nothing has to give way.
    const t = withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
      request({ id: 'r-kick', role: 'kick', priority: 2, optional: true }),
    ])
    const result = run([monoPool], t)
    expect(result.gaps).toEqual([])
    expect(placed(result, 'r-kick')).toEqual(['a-tracker/track-4'])
  })

  it('prefers the smaller stack when two pools could both carry the part', () => {
    const duoAndMono = box('a-mixed', {
      voices: [
        { kind: 'pool', id: 'duo', label: 'Duo', count: 4, roles: ['pad'], polyphony: 2 },
        { kind: 'pool', id: 'mono', label: 'Mono', count: 4, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [
        makeRecipe('duo-pad-dark', 'pad', 'dark', 'duo'),
        makeRecipe('mono-pad-dark', 'pad', 'dark', 'mono'),
      ],
    })
    // Two voices spent, not three: `stackedVoices` counts voices beyond the first.
    expect(placed(run([duoAndMono]), 'r-pad')).toEqual(['a-mixed/duo-1', 'a-mixed/duo-2'])
  })
})

// ---------------------------------------------------------------------------
// Determinism and occupancy interaction
// ---------------------------------------------------------------------------

describe('a stack is deterministic and interacts with occupancy correctly (§7.2, §4.2)', () => {
  it('picks the same members on every seed', () => {
    const first = placed(run([monoPool], triad, SEEDS[0]), 'r-pad')
    for (const seed of SEEDS) {
      expect(placed(run([monoPool], triad, seed), 'r-pad'), `seed ${seed}`).toEqual(first)
    }
  })

  it('two section-disjoint stacks share the same voices, as §4.2 allows', () => {
    const t = withRoles([
      request({
        id: 'r-pad-a',
        role: 'pad',
        character: 'dark',
        priority: 1,
        polyphony: 3,
        sustain: 'transient',
        sections: ['Intro'],
      }),
      request({
        id: 'r-pad-b',
        role: 'pad',
        character: 'dark',
        priority: 1,
        polyphony: 3,
        sustain: 'transient',
        sections: ['Drop'],
      }),
    ])
    const result = run([monoPool], t)
    expect(placed(result, 'r-pad-a')).toEqual(placed(result, 'r-pad-b'))
    expect(keys(result.score).crowdOverflow).toBe(0)
  })

  it('reports contention against the member that was actually taken', () => {
    const threeTracks = box('a-three', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 3, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const t = withRoles([
      request({ id: 'r-pad-1', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
      request({ id: 'r-pad-2', role: 'pad', character: 'dark', priority: 2, polyphony: 3 }),
    ])
    const result = run([threeTracks], t)
    expect(placed(result, 'r-pad-1').length).toBe(3)
    const gap = result.gaps.find((g) => g.requestId === 'r-pad-2')
    expect(gap).toMatchObject({ reason: 'no-room', because: 'contended' })
    expect(gap?.reason === 'no-room' && gap.detail).toContain('is carrying pad')
  })

  it('honours `distinct`, which for a stack means the device *sets* may not intersect', () => {
    const t = withRoles([
      request({
        id: 'r-pad-1',
        role: 'pad',
        character: 'dark',
        priority: 1,
        polyphony: 3,
        distinct: true,
      }),
      request({
        id: 'r-pad-2',
        role: 'pad',
        character: 'dark',
        priority: 2,
        polyphony: 3,
        distinct: true,
      }),
    ])
    // Eight free tracks on one box would hold both stacks, and `distinct` says they may not.
    const eight = box('a-eight', {
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 8, roles: ['pad'], polyphony: 1 },
      ],
      recipes: [makeRecipe('track-pad-dark', 'pad', 'dark', 'track')],
    })
    const result = run([eight], t)
    expect(result.assignments.length).toBe(1)
    expect(result.gaps[0]).toMatchObject({ reason: 'no-room', because: 'distinct' })
  })

  it('`distinct` blocks two stacks that would share even one box out of three', () => {
    const t = withRoles([
      request({
        id: 'r-pad-1',
        role: 'pad',
        character: 'dark',
        priority: 1,
        polyphony: 3,
        distinct: true,
      }),
      request({
        id: 'r-pad-2',
        role: 'pad',
        character: 'dark',
        priority: 2,
        polyphony: 3,
        distinct: true,
      }),
    ])
    // Three two-voice boxes: six voices, enough for both triads, and no way to split them that
    // keeps the device sets apart. A triad needs three voices and no box holds three, so each
    // one spans at least two of the three boxes and the two must overlap.
    const pair = (id: string, count: number): Device =>
      box(id, {
        kind: 'synth',
        voices: [
          { kind: 'pool', id: 'v', label: 'Voice', count, roles: ['pad'], polyphony: 1 },
        ],
        recipes: [makeRecipe(`${id}-v-pad`, 'pad', 'dark', 'v')],
      })
    const result = run([pair('a-two', 2), pair('b-two', 2), pair('c-two', 2)], t)
    expect(result.assignments.length).toBe(1)
    expect(result.gaps[0]).toMatchObject({ reason: 'no-room', because: 'distinct' })
  })
})

// ---------------------------------------------------------------------------
// Optimality
// ---------------------------------------------------------------------------

/**
 * The oracle in `test/rigs.ts` enumerates **every** N-subset of a pool, where the search forms
 * exactly one canonical combination per pool. If collapsing those subsets ever cost the
 * optimum, it fails here rather than passing quietly.
 */
describe('stacking does not cost the optimum (§7.1, obligation 3)', () => {
  const rigs: [string, Device[]][] = [
    ['mono pool alone', [monoPool]],
    ['mono pool + a polyphonic voice', [monoPool, polySynth]],
    ['mono pool + a chord sampler', [monoPool, chordSampler]],
    ['all three', [monoPool, polySynth, chordSampler]],
    ['three separate monosynths', [mono('a-cascadia'), mono('b-crave'), mono('c-moog')]],
    [
      'monosynths and a pool, mixed',
      [mono('a-cascadia'), mono('b-crave'), monoPool],
    ],
    ['three fixed voices on one box', [threeFixed]],
    ['fixed voices and a polyphonic box', [threeFixed, polySynth]],
  ]
  const templates: [string, ReturnType<typeof withRoles>][] = [
    ['one triad', triad],
    [
      'a triad and a kick',
      withRoles([
        request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
        request({ id: 'r-kick', role: 'kick', priority: 2 }),
      ]),
    ],
    [
      'two triads over one pool',
      withRoles([
        request({ id: 'r-pad-1', role: 'pad', character: 'dark', priority: 1, polyphony: 3 }),
        request({ id: 'r-pad-2', role: 'pad', character: 'dark', priority: 2, polyphony: 2 }),
      ]),
    ],
    [
      'section-disjoint triads',
      withRoles([
        request({
          id: 'r-pad-a',
          role: 'pad',
          character: 'dark',
          priority: 1,
          polyphony: 3,
          sustain: 'transient',
          sections: ['Intro', 'Build'],
        }),
        request({
          id: 'r-pad-b',
          role: 'pad',
          character: 'dark',
          priority: 1,
          polyphony: 2,
          sustain: 'transient',
          sections: ['Drop'],
        }),
      ]),
    ],
  ]

  for (const [rigName, devices] of rigs) {
    for (const [tName, t] of templates) {
      it(`${rigName} / ${tName}: matches brute force on every seed`, () => {
        const oracle = bruteForceBest(devices, t)
        for (const seed of SEEDS) {
          const result = assign({ devices, template: t, mood: moodState(), seed })
          expect(result.search.capped, `capped on seed ${seed}`).toBe(false)
          expect(result.score as unknown as Score, `seed ${seed}`).toEqual(oracle)
        }
      })
    }
  }
})
