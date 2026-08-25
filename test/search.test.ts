import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NODE_CAP,
  GAP_REASONS,
  NO_ROOM_CAUSES,
  assign,
  assignableKey,
  compareScore,
  expand,
  moodState,
  quantiseDistance,
  resolveCharacter,
  resolveRecipe,
  sectionsFor,
  type Assignable,
  type AssignmentResult,
  type Character,
  type Device,
  type Recipe,
  type Role,
  type RoleRequest,
  type Score,
  type Template,
} from '../lib/core/index'
import {
  box,
  bruteForceBest,
  keys,
  makeRecipe,
  placement,
  request,
  withRoles,
} from './rigs'

// ---------------------------------------------------------------------------
// Rig fixtures — hand-authored boxes with known properties (§7.1)
// ---------------------------------------------------------------------------

/** Fixed voices, one recipe each. The TR-1000 shape. */
const drumBox = box('a-drum', {
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare', 'clap'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['sub', 'bass-mid', 'tom'], polyphony: 1 },
    { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat'], polyphony: 1 },
  ],
  comfortableVoices: 4,
  recipes: [
    makeRecipe('drum-kick-hard', 'kick', 'hard', 'bd'),
    makeRecipe('drum-snare-hard', 'snare', 'hard', 'sd'),
    makeRecipe('drum-hat-dirty', 'closed-hat', 'dirty', 'ch'),
    makeRecipe('drum-bassmid-dark', 'bass-mid', 'dark', 'lt'),
  ],
})

/** A pool. Eight interchangeable tracks, polyphonic. The Tracker Mini shape. */
const tracker = box('b-tracker', {
  kind: 'groovebox',
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 8,
      roles: ['kick', 'sub', 'pad', 'lead', 'texture'],
      polyphony: 4,
    },
  ],
  comfortableVoices: 8,
  recipes: [
    makeRecipe('track-kick-hard', 'kick', 'hard', 'track'),
    makeRecipe('track-sub-dark', 'sub', 'dark', 'track'),
    makeRecipe('track-pad-dark', 'pad', 'dark', 'track'),
    makeRecipe('track-texture-dark', 'texture', 'dark', 'track'),
  ],
})

// ---------------------------------------------------------------------------
// The rig x template matrix, shared by the optimality and completeness tests
// ---------------------------------------------------------------------------

/**
 * The rig the design warns about: `idleDevices` *shrinks* as a partial assignment extends,
 * so a bound built from the current idle count is not a lower bound and prunes the optimum.
 * Devices differ in what they can reach, which is what makes the admissible bound - the
 * count of devices no *remaining* request could legally reach - different from the current
 * count rather than accidentally equal to it.
 */
const wide = box('a-wide', {
  voices: [
    { kind: 'fixed', id: 'x1', label: 'X1', roles: ['kick', 'sub'], polyphony: 2 },
    { kind: 'fixed', id: 'x2', label: 'X2', roles: ['sub', 'kick'], polyphony: 2 },
  ],
  comfortableVoices: 2,
  recipes: [
    makeRecipe('wide-kick', 'kick', 'hard', 'x1'),
    makeRecipe('wide-sub', 'sub', 'dark', 'x1'),
    makeRecipe('wide-kick-2', 'kick', 'hard', 'x2'),
    makeRecipe('wide-sub-2', 'sub', 'dark', 'x2'),
  ],
})
const narrow = box('b-narrow', {
  voices: [{ kind: 'fixed', id: 'y1', label: 'Y1', roles: ['sub'], polyphony: 2 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('narrow-sub', 'sub', 'dark', 'y1')],
})
/** Reachable by nothing in the templates below: permanently idle, and provably so. */
const unreachable = box('c-unreachable', {
  voices: [{ kind: 'fixed', id: 'z1', label: 'Z1', roles: ['vox-chop'], polyphony: 1 }],
  comfortableVoices: 1,
  recipes: [makeRecipe('unreach-vox', 'vox-chop', 'hard', 'z1')],
})

const rigs: [string, Device[]][] = [
  ['one box', [drumBox]],
  ['two boxes', [drumBox, tracker]],
  ['non-monotone idle', [wide, narrow, unreachable]],
  ['non-monotone idle, tracker added', [wide, narrow, unreachable, tracker]],
]

const templates: [string, Template][] = [
  [
    'kick + sub',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
    ]),
  ],
  [
    'two subs and a kick',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 2 }),
    ]),
  ],
  [
    'with an optional part and a transient',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 2 }),
      request({ id: 'r-tex', role: 'texture', character: 'dark', priority: 4, optional: true }),
      request({
        id: 'r-tr',
        role: 'kick',
        priority: 3,
        sustain: 'transient',
        sections: ['Drop'],
      }),
    ]),
  ],
]


// ---------------------------------------------------------------------------
// Reading a Score without hard-coding the miss-prefix length
// ---------------------------------------------------------------------------


function gapFor(result: AssignmentResult, requestId: string) {
  return result.shortfalls.find((g) => g.requestId === requestId)
}

// ---------------------------------------------------------------------------
// §7.1 The objective
// ---------------------------------------------------------------------------

describe('compareScore (§7.1)', () => {
  it('compares element by element, first difference deciding', () => {
    // One miss at priority 1 is worse than any number of misses at priority 2.
    expect(compareScore([1, 0, 0, 0, 0, 0, 0] as Score, [0, 9, 0, 0, 0, 0, 0] as Score)).toBe(1)
    // Crowding outranks optional misses.
    expect(compareScore([0, 1, 0, 0, 0, 0] as Score, [0, 0, 9, 0, 0, 0] as Score)).toBe(1)
    // Recipe quality outranks role fit.
    expect(compareScore([0, 0, 0, 1000, 0, 0] as Score, [0, 0, 0, 0, 9, 0] as Score)).toBe(1)
    // Idle devices rank last and are nearly cosmetic.
    expect(compareScore([0, 0, 0, 0, 0, 3] as Score, [0, 0, 0, 0, 1, 0] as Score)).toBe(-1)
    expect(compareScore([0, 0, 0, 0, 0, 0] as Score, [0, 0, 0, 0, 0, 0] as Score)).toBe(0)
  })
})

describe('quantiseDistance (§7.1)', () => {
  it('turns the only non-integer input into an exact integer', () => {
    expect(quantiseDistance(0)).toBe(0)
    expect(quantiseDistance(1)).toBe(1000)
    // sqrt(2), the orthogonal substitution.
    expect(quantiseDistance(2)).toBe(1414)
    expect(quantiseDistance(3)).toBe(1732)
  })
})

// ---------------------------------------------------------------------------
// The ruling: unvoiced neither fills nor occupies
// ---------------------------------------------------------------------------

describe('unvoiced neither fills nor occupies (§3.5, §7.3)', () => {
  // The motivating rig: LT serves sub, bass-mid and tom; only bass-mid is authored.
  const t = withRoles([
    request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
    request({ id: 'r-bassmid', role: 'bass-mid', character: 'dark', priority: 1 }),
  ])
  const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })

  it('does not let the unvoiced request take the voice the voiceable one needs', () => {
    expect(placement(result, 'r-bassmid')).toBe('a-drum/lt')
    expect(placement(result, 'r-sub')).toBeUndefined()
  })

  it('reserves nothing in Occupancy for the unvoiced request', () => {
    const lt = result.occupancy.get('a-drum/lt')
    expect([...(lt?.values() ?? [])]).toEqual(['r-bassmid', 'r-bassmid', 'r-bassmid'])
    expect([...result.occupancy.keys()]).toEqual(['a-drum/lt'])
  })

  it('counts the unvoiced request as a miss at its priority', () => {
    expect(keys(result.score).misses[0]).toBe(1)
  })

  it('reports it as a no-recipe gap naming the voice that could have carried it', () => {
    const gap = gapFor(result, 'r-sub')
    expect(gap?.reason).toBe('no-recipe')
    expect(gap?.capable.map((a: Assignable) => assignableKey(a))).toEqual(['a-drum/lt'])
  })

  it('never scores the unvoiced fill inside recipeDistance', () => {
    // A large finite penalty there would rank below crowding and optionalMisses, so the search
    // would prefer a voice it cannot describe over one it can.
    expect(keys(result.score).recipeDistance).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §7.3 Gap reasons
// ---------------------------------------------------------------------------

describe('gap reasons (§7.3)', () => {
  it('names exactly the three, and does not collapse them', () => {
    expect(GAP_REASONS).toEqual(['no-capable-voice', 'no-recipe', 'no-room'])
    expect(NO_ROOM_CAUSES).toEqual(['contended', 'crowding', 'distinct'])
  })

  it('no-capable-voice: nothing in the rig declares the role - the fix is buying', () => {
    const t = withRoles([request({ id: 'r-acid', role: 'acid' })])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(gapFor(result, 'r-acid')).toMatchObject({ reason: 'no-capable-voice', capable: [] })
  })

  it('no-capable-voice also covers a polyphony nothing in the rig can meet (§12.4)', () => {
    const t = withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', polyphony: 6 }),
    ])
    const result = assign({ devices: [tracker], template: t, mood: moodState(), seed: 1 })
    // The tracker declares `pad` but only 4-note polyphony, so the rig genuinely cannot.
    expect(gapFor(result, 'r-pad')?.reason).toBe('no-capable-voice')
  })

  it('no-recipe: capable but nothing authored - the fix is authoring, and it names the voice', () => {
    const t = withRoles([request({ id: 'r-tom', role: 'tom' })])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    const gap = gapFor(result, 'r-tom')
    expect(gap?.reason).toBe('no-recipe')
    expect(gap?.capable.map((a: Assignable) => assignableKey(a))).toEqual(['a-drum/lt'])
  })

  it('no-recipe covers a character too far to substitute, not only an absent role', () => {
    // A 'soft' kick against an authored 'hard' one: distance 2, the direct opposite, refused.
    const t = withRoles([request({ id: 'r-kick', role: 'kick', character: 'soft' })])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(gapFor(result, 'r-kick')).toMatchObject({ reason: 'no-recipe', character: 'soft' })
    expect(gapFor(result, 'r-kick')?.capable.map((a: Assignable) => a.voiceId)).toEqual(['bd'])
  })

  it('no-room / contended: the voice was taken, and the sentence says by what', () => {
    const t = withRoles([
      request({ id: 'r-kick-1', role: 'kick', priority: 1 }),
      request({ id: 'r-kick-2', role: 'kick', priority: 2 }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    // Ascending priority: 1 is most important, so it is the one that gets the voice.
    expect(placement(result, 'r-kick-1')).toBe('a-drum/bd')
    const gap = gapFor(result, 'r-kick-2')
    expect(gap).toMatchObject({ reason: 'no-room', because: 'contended' })
    expect(gap?.capable.map((a: Assignable) => assignableKey(a))).toEqual(['a-drum/bd'])
    expect(gap?.reason === 'no-room' && gap.detail).toBe('the a-drum BD is carrying kick')
  })

  it('no-room / contended names a holder decided *after* the gapped request', () => {
    // One voice, two equal-priority requests, so exactly one is missed either way. The tie
    // falls to `recipeDistance`, which prefers the exact sub over the substituted tom - so
    // the voice goes to the request the search decided *second*. Classification runs against
    // the finished allocation, and looking only backwards, as the search must, would leave
    // this gap unable to name what took its voice.
    const oneVoice = box('a-one', {
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['tom', 'sub'], polyphony: 1 }],
      comfortableVoices: 1,
      recipes: [
        makeRecipe('one-tom-dark', 'tom', 'dark', 'v'),
        makeRecipe('one-sub-dark', 'sub', 'dark', 'v'),
      ],
    })
    const t = withRoles([
      request({ id: 'r-1-tom', role: 'tom', character: 'hard', priority: 1 }),
      request({ id: 'r-2-sub', role: 'sub', character: 'dark', priority: 1 }),
    ])
    const result = assign({ devices: [oneVoice], template: t, mood: moodState(), seed: 1 })
    expect(placement(result, 'r-2-sub')).toBe('a-one/v')
    const gap = gapFor(result, 'r-1-tom')
    expect(gap).toMatchObject({ reason: 'no-room', because: 'contended' })
    expect(gap?.reason === 'no-room' && gap.detail).toBe('the a-one V is carrying sub')
  })

  it('reports an unfilled optional request as a gap, but not as a required miss', () => {
    const t = withRoles([
      request({ id: 'r-acid', role: 'acid', priority: 4, optional: true }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(gapFor(result, 'r-acid')).toMatchObject({ optional: true, reason: 'no-capable-voice' })
    expect(keys(result.score).misses.every((m) => m === 0)).toBe(true)
    expect(keys(result.score).optionalMisses).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// §7.1 The rig fixture table — relative outcomes, never cost numbers
// ---------------------------------------------------------------------------

describe('rig fixtures (§7.1, obligation 2)', () => {
  it('one box: each part lands on the voice that declares it', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick' }),
      request({ id: 'r-snare', role: 'snare' }),
      request({ id: 'r-hat', role: 'closed-hat', character: 'dirty' }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(placement(result, 'r-kick')).toBe('a-drum/bd')
    expect(placement(result, 'r-snare')).toBe('a-drum/sd')
    expect(placement(result, 'r-hat')).toBe('a-drum/ch')
    expect(result.shortfalls).toEqual([])
  })

  it('two boxes: the sub goes to the tracker, because the drum box cannot voice it', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick' }),
      request({ id: 'r-sub', role: 'sub', character: 'dark' }),
    ])
    const result = assign({ devices: [drumBox, tracker], template: t, mood: moodState(), seed: 1 })
    expect(placement(result, 'r-kick')).toBe('a-drum/bd')
    expect(placement(result, 'r-sub')?.startsWith('b-tracker/track-')).toBe(true)
  })

  it('two boxes: the kick stays put rather than piling on, so no box sits idle', () => {
    // Both boxes can voice a hard kick. Everything above `idleDevices` ties, so the last key
    // decides - and it decides for spreading the parts, never against filling one.
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick' }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', polyphony: 3 }),
    ])
    const result = assign({ devices: [drumBox, tracker], template: t, mood: moodState(), seed: 1 })
    expect(placement(result, 'r-kick')).toBe('a-drum/bd')
    expect(placement(result, 'r-pad')?.startsWith('b-tracker/')).toBe(true)
    expect(keys(result.score).idleDevices).toBe(0)
  })

  it('crowding outranks an optional part (§7.1)', () => {
    // A four-voice box, three required parts, and an optional fourth that would take it to a
    // fifth occupied assignable. Leaving `texture` unfilled is the better guide.
    const small = box('a-small', {
      voices: [
        { kind: 'pool', id: 'v', label: 'V', count: 5, roles: ['kick', 'sub', 'texture'], polyphony: 4 },
      ],
      comfortableVoices: 3,
      recipes: [
        makeRecipe('small-kick', 'kick', 'hard', 'v'),
        makeRecipe('small-sub', 'sub', 'dark', 'v'),
        makeRecipe('small-tex', 'texture', 'dark', 'v'),
      ],
    })
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 2 }),
      request({ id: 'r-tex', role: 'texture', character: 'dark', priority: 4, optional: true }),
    ])
    const result = assign({ devices: [small], template: t, mood: moodState(), seed: 1 })
    expect(keys(result.score).crowdOverflow).toBe(0)
    const gap = gapFor(result, 'r-tex')
    expect(gap).toMatchObject({ reason: 'no-room', because: 'crowding' })
    expect(gap?.reason === 'no-room' && gap.detail).toBe(
      'your a-small is already at 3 of 3 comfortable voices',
    )
    // ...and the three required parts are all filled, which is what crowding must never cost.
    expect(result.assignments).toHaveLength(3)
  })

  it('recipe quality outranks role fit (§7.1)', () => {
    // `near` lists the role second (roleFit 1) but has it authored exactly.
    // `far` lists it first (roleFit 0) and can only substitute an orthogonal character.
    const rig = box('a-rig', {
      voices: [
        { kind: 'fixed', id: 'far', label: 'Far', roles: ['sub', 'kick'], polyphony: 1 },
        { kind: 'fixed', id: 'near', label: 'Near', roles: ['kick', 'sub'], polyphony: 1 },
      ],
      comfortableVoices: 2,
      recipes: [
        makeRecipe('rig-far-sub-bright', 'sub', 'bright', 'far'),
        makeRecipe('rig-near-sub-dark', 'sub', 'dark', 'near'),
      ],
    })
    const t = withRoles([request({ id: 'r-sub', role: 'sub', character: 'dark' })])
    const result = assign({ devices: [rig], template: t, mood: moodState(), seed: 1 })
    expect(placement(result, 'r-sub')).toBe('a-rig/near')
    expect(result.assignments[0]?.outcome).toBe('exact')
    expect(keys(result.score).roleFitPenalty).toBe(1)
  })

  it('never trades a required part for a tidier rig - idle ranks last (§7.1)', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-snare', role: 'snare', priority: 1 }),
      request({ id: 'r-hat', role: 'closed-hat', character: 'dirty', priority: 1 }),
    ])
    // The tracker can carry none of these but the kick; it stays idle rather than costing a part.
    const result = assign({ devices: [drumBox, tracker], template: t, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(3)
    expect(keys(result.score).misses.every((m) => m === 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §4.2 Occupancy
// ---------------------------------------------------------------------------

describe('occupancy (§4.2)', () => {
  it('keys on device/voice and stores the request id, never the role id', () => {
    const t = withRoles([request({ id: 'r-kick', role: 'kick' })])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect([...result.occupancy.keys()]).toEqual(['a-drum/bd'])
    expect([...(result.occupancy.get('a-drum/bd') ?? new Map())]).toEqual([
      ['Intro', 'r-kick'],
      ['Build', 'r-kick'],
      ['Drop', 'r-kick'],
    ])
  })

  it('gives a transient request only the sections it lists (§4.2)', () => {
    const t = withRoles([
      request({
        id: 'r-riser',
        role: 'kick',
        sustain: 'transient',
        sections: ['Build'],
      }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect([...(result.occupancy.get('a-drum/bd') ?? new Map()).keys()]).toEqual(['Build'])
  })

  it('lets two transient requests share one voice in disjoint sections', () => {
    const t = withRoles([
      request({ id: 'r-a', role: 'kick', sustain: 'transient', sections: ['Build'] }),
      request({ id: 'r-b', role: 'kick', sustain: 'transient', sections: ['Drop'] }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(result.shortfalls).toEqual([])
    expect([...(result.occupancy.get('a-drum/bd') ?? new Map())]).toEqual([
      ['Build', 'r-a'],
      ['Drop', 'r-b'],
    ])
  })

  it('refuses two requests on one voice in the same section', () => {
    const t = withRoles([
      request({ id: 'r-a', role: 'kick', sustain: 'transient', sections: ['Build'] }),
      request({ id: 'r-b', role: 'kick', sustain: 'transient', sections: ['Build', 'Drop'] }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(1)
    expect(result.shortfalls).toHaveLength(1)
  })

  it('counts an assignable occupied in any section once, for crowding (§12.4)', () => {
    const t = withRoles([
      request({ id: 'r-a', role: 'kick', sustain: 'transient', sections: ['Build'] }),
      request({ id: 'r-b', role: 'kick', sustain: 'transient', sections: ['Drop'] }),
    ])
    const one = box('a-one', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      comfortableVoices: 1,
      recipes: [makeRecipe('one-kick', 'kick', 'hard', 'bd')],
    })
    const result = assign({ devices: [one], template: t, mood: moodState(), seed: 1 })
    // Two requests, one physical voice, comfortable with one: no overflow.
    expect(keys(result.score).crowdOverflow).toBe(0)
  })

  it('contains nothing for a request that was not filled', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick' }),
      request({ id: 'r-acid', role: 'acid' }),
    ])
    const result = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    const stored = [...result.occupancy.values()].flatMap((m) => [...m.values()])
    expect(stored).not.toContain('r-acid')
  })
})

// ---------------------------------------------------------------------------
// §12.6 distinct
// ---------------------------------------------------------------------------

describe('distinct (§12.6)', () => {
  const twinA = box('a-twin', {
    voices: [{ kind: 'pool', id: 'v', label: 'V', count: 4, roles: ['tom'], polyphony: 1 }],
    comfortableVoices: 4,
    recipes: [makeRecipe('twin-a-tom', 'tom', 'hard', 'v')],
  })
  const twinB = box('b-twin', {
    voices: [{ kind: 'pool', id: 'v', label: 'V', count: 4, roles: ['tom'], polyphony: 1 }],
    comfortableVoices: 4,
    recipes: [makeRecipe('twin-b-tom', 'tom', 'hard', 'v')],
  })
  const t = withRoles([
    request({ id: 'r-tom-1', role: 'tom', distinct: true }),
    request({ id: 'r-tom-2', role: 'tom', distinct: true }),
  ])

  it('keeps two distinct requests for one role on different devices', () => {
    const result = assign({ devices: [twinA, twinB], template: t, mood: moodState(), seed: 1 })
    const a = result.assignments.find((x) => x.requestId === 'r-tom-1')?.deviceId
    const b = result.assignments.find((x) => x.requestId === 'r-tom-2')?.deviceId
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(a).not.toBe(b)
  })

  it('makes the surplus an ordinary gap when one box is all there is', () => {
    const result = assign({ devices: [twinA], template: t, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(1)
    // Not silently collapsed onto the same box: it becomes a gap like any other.
    expect(result.shortfalls).toHaveLength(1)
    const gap = result.shortfalls[0]
    expect(gap).toMatchObject({ reason: 'no-room', because: 'distinct' })
    expect(gap?.reason === 'no-room' && gap.detail).toBe(
      'this tom must sit on a different device from the other tom, and only 1 in your rig can carry it',
    )
  })

  it('leaves requests that do not ask for it alone - the default is false', () => {
    const plain = withRoles([
      request({ id: 'r-tom-1', role: 'tom' }),
      request({ id: 'r-tom-2', role: 'tom' }),
    ])
    const result = assign({ devices: [twinA], template: plain, mood: moodState(), seed: 1 })
    expect(result.assignments).toHaveLength(2)
    expect(new Set(result.assignments.map((x) => x.deviceId))).toEqual(new Set(['a-twin']))
  })
})

// ---------------------------------------------------------------------------
// §7.2 Seeding
// ---------------------------------------------------------------------------

/**
 * Two *fixed* voices that tie in every key of the vector: same roles at the same index, the
 * same authored character, one device, so `roleFit`, `recipeDistance`, `crowdOverflow` and
 * `idleDevices` are all identical whichever one is taken.
 *
 * Fixed rather than pooled on purpose. Pool ordinals used to be where this property was
 * demonstrated, and §7.1's symmetry breaking has since made them canonical - the seed may
 * still permute among equal scores, but two members of one pool are no longer two choices for
 * it to permute between. A tie has to be built out of things the search can still tell apart.
 */
const twins = box('a-twins', {
  voices: [
    { kind: 'fixed', id: 'v1', label: 'V1', roles: ['pad'], polyphony: 4 },
    { kind: 'fixed', id: 'v2', label: 'V2', roles: ['pad'], polyphony: 4 },
  ],
  comfortableVoices: 2,
  recipes: [
    makeRecipe('twins-pad-dark-1', 'pad', 'dark', 'v1'),
    makeRecipe('twins-pad-dark-2', 'pad', 'dark', 'v2'),
  ],
})

describe('seeding (§7.2)', () => {
  const t = withRoles([request({ id: 'r-pad', role: 'pad', character: 'dark', polyphony: 3 })])

  function run(seed: number) {
    return assign({ devices: [twins], template: t, mood: moodState(), seed })
  }

  it('is reproducible: the same seed gives the same answer', () => {
    expect(placement(run(7), 'r-pad')).toBe(placement(run(7), 'r-pad'))
    expect(run(7).score).toEqual(run(7).score)
  })

  it('permutes among exactly equal scores, and only there', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    const chosen = new Set(seeds.map((s) => placement(run(s), 'r-pad')))
    // Different seeds reach different voices...
    expect(chosen.size).toBeGreaterThan(1)
    // ...and every one of them costs exactly the same, which is why the seed was free to move.
    const scores = new Set(seeds.map((s) => JSON.stringify(run(s).score)))
    expect(scores.size).toBe(1)
  })

  it('leaves pool ordinals canonical: no seed moves a part off the lowest free track (§7.1)', () => {
    const pooled = withRoles([request({ id: 'r-pad', role: 'pad', character: 'dark', polyphony: 3 })])
    const seen = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) =>
        placement(assign({ devices: [tracker], template: pooled, mood: moodState(), seed }), 'r-pad'),
      ),
    )
    expect([...seen]).toEqual(['b-tracker/track-1'])
  })

  it('does not permute where a real difference exists', () => {
    // The kick can only be voiced by the drum box's BD; no seed may move it.
    const kickOnly = withRoles([request({ id: 'r-kick', role: 'kick' })])
    const seen = new Set(
      [1, 2, 3, 4, 5].map(
        (seed) =>
          placement(assign({ devices: [drumBox], template: kickOnly, mood: moodState(), seed }), 'r-kick'),
      ),
    )
    expect([...seen]).toEqual(['a-drum/bd'])
  })
})

// ---------------------------------------------------------------------------
// §7.1 Optimality — brute force as the oracle
// ---------------------------------------------------------------------------

describe('branch-and-bound optimality (§7.1, obligation 3)', () => {
  for (const [rigName, devices] of rigs) {
    for (const [tName, t] of templates) {
      it(`finds the optimum for ${rigName} / ${tName}, on every seed`, () => {
        const optimum = bruteForceBest(devices, t)
        // Seeds permute the candidate order among ties, so each one walks the tree
        // differently. An inadmissible bound would prune the optimum on some of them.
        for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
          const result = assign({ devices, template: t, mood: moodState(), seed })
          expect(result.search.capped).toBe(false)
          expect(result.score).toEqual(optimum)
        }
      })
    }
  }

  it('actually exercises a shrinking idle count, or it would prove nothing', () => {
    const t = templates[1]?.[1] as Template
    const result = assign({
      devices: [wide, narrow, unreachable],
      template: t,
      mood: moodState(),
      seed: 1,
    })
    // Three devices. One is permanently unreachable, so the best possible idle count is 1 -
    // and reaching it means the count fell from 3 to 1 along the winning branch.
    expect(keys(result.score).idleDevices).toBe(1)
    expect(result.assignments.length).toBeGreaterThan(1)
  })

  it('counts every selected device with no occupied assignables, voiceless ones included', () => {
    // §7.1 literally. A mixer-recorder contributes no assignables (§2.4) so it is always
    // idle - a constant across every candidate solution, which is why it cannot change
    // which assignment wins even though it moves the number.
    const mixer = box('d-mixer', { kind: 'mixer-recorder', voices: [], recipes: [] })
    const t = withRoles([request({ id: 'r-kick', role: 'kick' })])
    const withMixer = assign({ devices: [drumBox, mixer], template: t, mood: moodState(), seed: 1 })
    const without = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    expect(keys(withMixer.score).idleDevices).toBe(keys(without.score).idleDevices + 1)
    expect(placement(withMixer, 'r-kick')).toBe(placement(without, 'r-kick'))
  })
})

// ---------------------------------------------------------------------------
// §7.1 The idle bound is counted per request, not per device
// ---------------------------------------------------------------------------

/**
 * Five boxes that are interchangeable for the requests below, so *every* one of them is
 * reachable and idle at the root. Reachability alone says nothing here — it would let all five
 * wake up — and the count of remaining requests is the only thing that says they cannot.
 *
 * Two properties are deliberate, and the fixture proves nothing without either:
 *
 *  - `comfortableVoices: 1` over a `polyphony: 2` voice. Piling two parts onto one box costs
 *    `crowdOverflow`, which outranks `idleDevices`, so the optimum genuinely spreads and the
 *    idle floor the bound computes is the idle count the optimum actually reaches.
 *  - **One role per voice, and every request asking for it.** `roleFitPenalty` sits *above*
 *    `idleDevices` in the vector, so a voice whose second role answers a request makes the bound
 *    differ on `roleFit` and the comparison never reaches the idle key at all. That is what a
 *    first draft of this fixture did, and it pruned identically under both bounds while looking
 *    like a test of the new one.
 */
const interchangeable: Device[] = ['p', 'q', 'r', 's', 't'].map((tag) =>
  box(`${tag}-any`, {
    voices: [{ kind: 'fixed', id: `${tag}1`, label: `${tag.toUpperCase()}1`, roles: ['sub'], polyphony: 2 }],
    comfortableVoices: 1,
    recipes: [makeRecipe(`${tag}-sub`, 'sub', 'dark', `${tag}1`)],
  }),
)

const twoSubs = withRoles([
  request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1 }),
  request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 1 }),
])

describe('the idle bound counts remaining requests, not reachable devices (§7.1)', () => {
  /**
   * The precondition the whole block rests on. If a later edit made the rig no larger than the
   * template, `min(reachableIdle, remaining)` would collapse onto `reachableIdle` and every case
   * below would pass while testing the old bound.
   */
  it('really does offer more reachable idle devices than there are requests', () => {
    expect(interchangeable.length).toBeGreaterThan(twoSubs.roles.length)
    // Every box is a live candidate for every request, so none is idle by unreachability.
    for (const device of interchangeable) {
      const a = expand(device)[0] as Assignable
      expect(a.roles).toEqual(['sub'])
    }
  })

  /**
   * The obligation: a *tighter* bound is still an admissible one. Brute force enumerates the
   * whole tree with no bound at all, so if the strengthened floor ever exceeded the true final
   * idle count it would prune the optimum and these would disagree.
   *
   * Three templates, because the three ways a remaining request can fail to wake an idle device
   * are the three ways the bound could have been wrong: it takes a candidate, it takes the miss
   * branch, or `distinct` blocks it — and the bound deliberately ignores the last two.
   */
  const cases: [string, Template][] = [
    ['two requests, five boxes', twoSubs],
    [
      'a request no box can reach, so fewer wake than remain',
      withRoles([
        request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1 }),
        request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 1 }),
        request({ id: 'r-vox', role: 'vox-chop', priority: 2 }),
      ]),
    ],
    [
      'distinct subs, which the bound is allowed to ignore',
      withRoles([
        request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1, distinct: true }),
        request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 1, distinct: true }),
        request({ id: 'r-sub-3', role: 'sub', character: 'dark', priority: 2, distinct: true }),
      ]),
    ],
  ]

  for (const [name, t] of cases) {
    it(`matches brute force: ${name}`, () => {
      const optimum = bruteForceBest(interchangeable, t)
      // Seeds permute the candidate order among ties, and every candidate here is a tie, so
      // each seed walks a different tree.
      for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
        const result = assign({ devices: interchangeable, template: t, mood: moodState(), seed })
        expect(result.search.capped, `seed ${seed}`).toBe(false)
        expect(result.score, `seed ${seed}`).toEqual(optimum)
      }
    })
  }

  /**
   * And the floor is reached, not merely respected. Two requests over five one-voice boxes:
   * crowding outranks idleness, so the optimum uses two boxes and leaves three idle — exactly
   * `5 - min(5, 2)`, the number the bound computes at the root.
   */
  it('leaves exactly the devices idle that the bound says it must', () => {
    const result = assign({
      devices: interchangeable,
      template: twoSubs,
      mood: moodState(),
      seed: 1,
    })
    expect(keys(result.score).idleDevices).toBe(interchangeable.length - twoSubs.roles.length)
    expect(result.assignments.length).toBe(twoSubs.roles.length)
  })

  /**
   * Not a performance budget, a smoke alarm — the same reasoning as the node counts in
   * `test/search-symmetry.test.ts`, and the reason no exact figure is asserted.
   *
   * Under the old bound nothing here could be cut on idleness: with every box reachable, the
   * count of individually unreachable idle devices is 0 at every interior node, so the bound's
   * idle key reads 0 against an incumbent's 3 and no interior branch is ever cut — 32 nodes
   * visited where the strengthened bound visits 12. The ceiling is loose enough to survive a
   * harmless change to these fixtures and tight enough to fail if the strengthening is
   * reverted.
   */
  it('prunes on idleness rather than walking the whole tree', () => {
    const result = assign({
      devices: interchangeable,
      template: twoSubs,
      mood: moodState(),
      seed: 1,
    })
    expect(result.search.nodes).toBeLessThan(30)
  })
})

// ---------------------------------------------------------------------------
// §7.1 The relaxed suffix bound
// ---------------------------------------------------------------------------

const SUFFIX_ROLES = ['kick', 'sub', 'pad', 'lead'] as const

/**
 * Four boxes that each author every role, but each at a *different* character, and none of them
 * at the characters the template below asks for. So every candidate carries a real
 * `recipeDistance` and there is no free assignment anywhere in the tree — which is the condition
 * under which a bound built only from the partial assignment is nearly useless: at depth one it
 * has charged for one request and says nothing at all about the other four.
 *
 * `comfortableVoices: 1` over two voices keeps crowding in play, and the reversed role list on
 * `v2` gives the two voices different `roleFit` for the same role, so that key moves too.
 */
const suffixBoxes: Device[] = (['hard', 'bright', 'dark', 'clean'] as const).map((character, i) =>
  box(`${'abcd'[i] as string}-box`, {
    voices: [
      { kind: 'fixed', id: 'v1', label: 'V1', roles: [...SUFFIX_ROLES], polyphony: 2 },
      { kind: 'fixed', id: 'v2', label: 'V2', roles: [...SUFFIX_ROLES].reverse(), polyphony: 2 },
    ],
    comfortableVoices: 1,
    recipes: SUFFIX_ROLES.flatMap((role) => [
      makeRecipe(`${i}-${role}-1`, role, character, 'v1'),
      makeRecipe(`${i}-${role}-2`, role, (['hard', 'bright', 'dark', 'clean'] as const)[(i + 1) % 4] as Character, 'v2'),
    ]),
  }),
)

/**
 * Five requests, four fillable and one — `vox-chop` — that no box in the rig plays at all. The
 * unfillable one is deliberate: it is the only part of the suffix floor that reaches `misses`,
 * the highest-ranked key, and charging for it at the root is worth more than every distance term
 * below it put together.
 */
const suffixTemplate = withRoles([
  request({ id: 'r-1', role: 'kick', character: 'dirty', priority: 1 }),
  request({ id: 'r-2', role: 'sub', character: 'dirty', priority: 1 }),
  request({ id: 'r-3', role: 'pad', character: 'clean', priority: 2 }),
  request({ id: 'r-4', role: 'lead', character: 'dirty', priority: 2 }),
  request({ id: 'r-5', role: 'vox-chop', character: 'hard', priority: 1 }),
])

describe('the relaxed suffix bound (§7.1)', () => {
  /**
   * The obligation, same as every other bound in this file: brute force enumerates the tree with
   * no bound at all, so a floor that ever exceeded the true remaining cost would prune the
   * optimum and the two would disagree. Every seed, because seeds permute ties and each one walks
   * a different tree.
   */
  it('finds the optimum, on every seed', () => {
    const optimum = bruteForceBest(suffixBoxes, suffixTemplate)
    for (const seed of [0, 1, 2, 3, 5, 8, 13, 21]) {
      const result = assign({
        devices: suffixBoxes,
        template: suffixTemplate,
        mood: moodState(),
        seed,
      })
      expect(result.search.capped, `seed ${seed}`).toBe(false)
      expect(result.score, `seed ${seed}`).toEqual(optimum)
    }
  })

  /**
   * The rig really is the hard case the comment above claims: nothing is free, so the bound has
   * something to charge for at every level.
   */
  it('really is a rig where no assignment is free', () => {
    const result = assign({
      devices: suffixBoxes,
      template: suffixTemplate,
      mood: moodState(),
      seed: 1,
    })
    expect(keys(result.score).recipeDistance).toBeGreaterThan(0)
    // Four fillable parts and one that nothing in the rig plays.
    expect(result.assignments.length).toBe(4)
    expect(keys(result.score).misses[0]).toBe(1)
  })

  /**
   * And it is exercised, not merely correct. A smoke alarm rather than a budget — no exact figure
   * is asserted, for the reason `test/search-symmetry.test.ts` gives — but the gap being measured
   * is large: the same fixture walks 435 nodes with the suffix terms removed from `lowerBound`
   * and 27 with them, so this ceiling fails loudly if the bound is reverted or weakened, and
   * survives any harmless change to the fixtures.
   */
  it('prunes on what the remaining requests must still cost', () => {
    const result = assign({
      devices: suffixBoxes,
      template: suffixTemplate,
      mood: moodState(),
      seed: 1,
    })
    expect(result.search.nodes).toBeLessThan(100)
  })
})

// ---------------------------------------------------------------------------
// §7.3 Is the three-reason enum complete?
// ---------------------------------------------------------------------------

function occupiedByDevice(result: AssignmentResult): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  for (const a of result.assignments) {
    const set = out.get(a.deviceId) ?? new Set<string>()
    set.add(assignableKey(a.assignable))
    out.set(a.deviceId, set)
  }
  return out
}

/**
 * A candidate the objective had no reason to refuse: free in every section this request needs,
 * legal under `distinct`, and costing no extra crowding. Filling one strictly improves the
 * vector — `missesByPriority` for a required request, `optionalMisses` for an optional one,
 * with every higher key unchanged — so the search must always take it.
 *
 * If this ever returns something, the objective declined a capable, voiceable, uncrowded
 * request for no reason, and that is a finding about §7.1 rather than a fourth gap reason.
 */
function refusedForNoReason(
  result: AssignmentResult,
  devices: Device[],
  t: Template,
  gap: AssignmentResult['shortfalls'][number],
): string | undefined {
  if (gap.reason !== 'no-room') return undefined
  const request = t.roles.find((r) => r.id === gap.requestId)
  if (request === undefined) return undefined
  const wanted = sectionsFor(request, t)
  const occupied = occupiedByDevice(result)

  for (const a of gap.capable) {
    const key = assignableKey(a)
    const held = result.occupancy.get(key)
    if (held !== undefined && wanted.some((section) => held.has(section))) continue

    if (request.distinct === true) {
      const clash = result.assignments.some((x) => {
        const other = t.roles.find((r) => r.id === x.requestId)
        return (
          other?.distinct === true && other.role === request.role && x.deviceId === a.deviceId
        )
      })
      if (clash) continue
    }

    const device = devices.find((d) => d.id === a.deviceId)
    if (device === undefined) continue
    const comfortable = device.comfortableVoices ?? expand(device).length
    const onDevice = occupied.get(a.deviceId)
    // An assignable already occupied in a disjoint section adds no *new* occupied assignable
    // (§12.4), so taking it cannot crowd the box at all.
    const alreadyCounted = onDevice?.has(key) ?? false
    const wouldCrowd = !alreadyCounted && (onDevice?.size ?? 0) >= comfortable
    if (!wouldCrowd) return key
  }
  return undefined
}

describe('the gap enum is complete (§7.3)', () => {
  const seeds = [0, 1, 2, 3, 5, 8, 13, 21]

  it('never declines a free, distinct-legal, uncrowded candidate', () => {
    for (const [rigName, devices] of rigs) {
      for (const [tName, t] of templates) {
        for (const seed of seeds) {
          const result = assign({ devices, template: t, mood: moodState(), seed })
          for (const gap of result.shortfalls) {
            const refused = refusedForNoReason(result, devices, t, gap)
            expect(
              refused === undefined
                ? undefined
                : `${rigName} / ${tName} / seed ${seed}: ${gap.requestId} could have taken ${refused}`,
            ).toBeUndefined()
          }
        }
      }
    }
  })

  it('never blames crowding for a required miss - misses outrank crowdOverflow', () => {
    // A required request beats crowding outright, so no amount of over-subscription can
    // justify dropping one. If this fires, the objective's key order is not what §7.1 says.
    for (const [rigName, devices] of rigs) {
      for (const [tName, t] of templates) {
        for (const seed of seeds) {
          const result = assign({ devices, template: t, mood: moodState(), seed })
          for (const gap of result.shortfalls) {
            if (gap.reason !== 'no-room' || gap.optional) continue
            expect(`${rigName} / ${tName} / ${gap.requestId}: ${gap.because}`).not.toContain(
              'crowding',
            )
          }
        }
      }
    }
  })

  it('every no-room gap carries a cause and a sentence', () => {
    for (const [, devices] of rigs) {
      for (const [, t] of templates) {
        const result = assign({ devices, template: t, mood: moodState(), seed: 1 })
        for (const gap of result.shortfalls) {
          expect(GAP_REASONS).toContain(gap.reason)
          if (gap.reason !== 'no-room') continue
          expect(NO_ROOM_CAUSES).toContain(gap.because)
          expect(gap.detail.length).toBeGreaterThan(0)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §7.1 The node cap
// ---------------------------------------------------------------------------

describe('node cap (§7.1)', () => {
  const t = withRoles([
    request({ id: 'r-a', role: 'pad', character: 'dark', priority: 1 }),
    request({ id: 'r-b', role: 'pad', character: 'dark', priority: 2 }),
    request({ id: 'r-c', role: 'pad', character: 'dark', priority: 3 }),
  ])

  it('reports an uncapped search honestly', () => {
    const result = assign({ devices: [tracker], template: t, mood: moodState(), seed: 1 })
    expect(result.search).toMatchObject({ capped: false, method: 'exhaustive' })
    expect(result.search.nodes).toBeGreaterThan(0)
    expect(result.search.nodeCap).toBe(DEFAULT_NODE_CAP)
  })

  it('falls back to greedy and says so - no silent truncation', () => {
    const result = assign({ devices: [tracker], template: t, mood: moodState(), seed: 1, nodeCap: 3 })
    expect(result.search).toMatchObject({ capped: true, method: 'greedy', nodeCap: 3 })
    // The counter reports what was visited and never overshoots the cap it is compared to.
    expect(result.search.nodes).toBeLessThanOrEqual(3)
    // The greedy answer is still a real, complete answer.
    expect(result.assignments).toHaveLength(3)
    expect(result.shortfalls).toEqual([])
  })

  it('is deterministic under the cap too', () => {
    const a = assign({ devices: [tracker], template: t, mood: moodState(), seed: 4, nodeCap: 3 })
    const b = assign({ devices: [tracker], template: t, mood: moodState(), seed: 4, nodeCap: 3 })
    expect(a.assignments.map((x) => assignableKey(x.assignable))).toEqual(
      b.assignments.map((x) => assignableKey(x.assignable)),
    )
  })
})

// ---------------------------------------------------------------------------
// Determinism of the whole call
// ---------------------------------------------------------------------------

describe('determinism (invariant 6)', () => {
  it('same inputs and seed give a byte-identical result', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2, polyphony: 3 }),
      request({ id: 'r-tex', role: 'texture', character: 'dark', priority: 4, optional: true }),
    ])
    const once = assign({ devices: [drumBox, tracker], template: t, mood: moodState(), seed: 99 })
    const twice = assign({ devices: [drumBox, tracker], template: t, mood: moodState(), seed: 99 })
    const shape = (r: AssignmentResult) => ({
      assignments: r.assignments.map((a) => [a.requestId, assignableKey(a.assignable), a.recipe.id]),
      gaps: r.shortfalls.map((g) => [g.requestId, g.reason]),
      score: r.score,
      occupancy: [...r.occupancy].map(([k, m]) => [k, [...m]]),
    })
    expect(JSON.stringify(shape(once))).toBe(JSON.stringify(shape(twice)))
  })

  it('routes mood through character resolution, so the knobs reach recipe choice (§6.2)', () => {
    // A 'hard' kick pinned by the template, with grit pegged, resolves to 'dirty' (§6.2) -
    // and the drum box authors only a hard one, so the substitution shows up in the score.
    const t = withRoles([request({ id: 'r-kick', role: 'kick', character: 'hard' })])
    const neutral = assign({ devices: [drumBox], template: t, mood: moodState(), seed: 1 })
    const gritty = assign({
      devices: [drumBox],
      template: t,
      mood: moodState({ grit: 100 }),
      seed: 1,
    })
    expect(neutral.assignments[0]?.outcome).toBe('exact')
    expect(gritty.assignments[0]?.outcome).toBe('substituted')
    expect(gritty.assignments[0]?.character).toBe('dirty')
    expect(gritty.assignments[0]?.recipeCharacter).toBe('hard')
    expect(keys(gritty.score).recipeDistance).toBeGreaterThan(keys(neutral.score).recipeDistance)
  })
})
