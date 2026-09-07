import { describe, expect, it } from 'vitest'
import {
  lowEndPairing,
  resolve,
  type Device,
  type Recipe,
  type ResolveResult,
  type RoleRequest,
  type Template,
} from '../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * §8/#264. The low-end pair, tested as *derivation* rather than as prose.
 *
 * The sentence the two renderers build from this is asserted in `test/guide-view.test.ts`, where
 * every other sibling-parity claim lives (#33). What is asserted here is the fact underneath it:
 * which two parts, which section, and — most of the issue's substance — the cases where there is
 * nothing to say.
 *
 * The golden scenario is the fixture for a reason beyond convenience. Its kick recipe's `TUNE`
 * carries **no unit at all**, which is exactly the case #264's first draft disqualified and this
 * one must not, and `never reads a tuning parameter` below asserts that property of the fixture
 * rather than assuming it — so a later edit that quietly gives it a unit fails here instead of
 * making the test stop testing anything.
 */

const run = (template: Template, devices: readonly Device[] = GOLDEN_DEVICES): ResolveResult =>
  resolve({ devices: [...devices], template, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })

const golden = () => lowEndPairing(run(GOLDEN_TEMPLATE))

const withRoles = (roles: RoleRequest[]): Template => ({ ...GOLDEN_TEMPLATE, roles })

const withStructure = (structure: Template['structure']): Template => ({
  ...GOLDEN_TEMPLATE,
  structure,
})

const subRequest = GOLDEN_TEMPLATE.roles.find((r) => r.role === 'sub') as RoleRequest

describe('lowEndPairing names both parts (§8/#264)', () => {
  it('pairs the resolved kick with the resolved sub, naming the box each came out of', () => {
    const pairing = golden()
    expect(pairing?.kick).toEqual({ deviceName: 'Golden Drum' })
    expect(pairing?.sub).toEqual({ deviceName: 'Golden Tracker' })
    // Two boxes here, so the instruction names both. The one-box sentence is asserted in
    // `test/guide-view.test.ts`, on the Tracker Mini rig that actually carries both parts.
    expect(pairing?.sameDevice).toBe(false)
  })

  it('carries the key the guide resolved against', () => {
    expect(golden()?.key).toBe(run(GOLDEN_TEMPLATE).song.key)
    expect(golden()?.key).toBeTypeOf('string')
  })

  it('carries the key as undefined where the direction authors none, and still pairs', () => {
    // §7 step 10: validation forbids a direction with no keys, and an effective template can
    // still reach it (§5). The pair is unaffected — two parts have pitches whether or not the
    // song states a key, which is the whole difference from #264's first, arithmetic draft.
    const pairing = lowEndPairing(run({ ...GOLDEN_TEMPLATE, keys: [], hooks: [] }))
    expect(pairing).toBeDefined()
    expect(pairing?.key).toBeUndefined()
  })
})

describe('lowEndPairing picks the section to listen in (§4.2/§6.3)', () => {
  it('takes the busiest section both parts occupy', () => {
    // Intro 0.2, Build 0.5, Drop 0.9 — and both parts are continuous, so all three are shared.
    expect(golden()?.listenIn).toBe('Drop')
  })

  it('takes the busiest *shared* one, not the busiest in the direction', () => {
    const roles = GOLDEN_TEMPLATE.roles.map((r) =>
      r.id === 'r-sub' ? { ...r, sustain: 'transient' as const, sections: ['Intro', 'Build'] } : r,
    )
    expect(lowEndPairing(run(withRoles(roles)))?.listenIn).toBe('Build')
  })

  it('breaks a tie on authored structure order, never on the section name', () => {
    // Equal energy, and the names sort the other way round — so a tie-break that reached for the
    // name would answer 'Alpha' and the authored order answers 'Zulu'.
    const pairing = lowEndPairing(
      run(
        withStructure([
          { name: 'Zulu', bars: 16, energy: 0.5 },
          { name: 'Alpha', bars: 16, energy: 0.5 },
        ]),
      ),
    )
    expect(pairing?.listenIn).toBe('Zulu')
  })

  it('is the dominant request of each role that decides it (§4.4/§7.2)', () => {
    const twoSubs = (firstPriority: number, secondPriority: number): RoleRequest[] => [
      ...GOLDEN_TEMPLATE.roles.map((r) =>
        r.id === 'r-sub'
          ? { ...r, priority: firstPriority, sustain: 'transient' as const, sections: ['Build'] }
          : r,
      ),
      {
        ...subRequest,
        id: 'r-sub-2',
        priority: secondPriority,
        sustain: 'transient' as const,
        sections: ['Drop'],
      },
    ]

    // Equal priority: `r-sub` wins on the id tie-break, so its section decides.
    const tied = run(withRoles(twoSubs(subRequest.priority, subRequest.priority)))
    expect(tied.assignments.filter((a) => a.role === 'sub')).toHaveLength(2)
    expect(lowEndPairing(tied)?.listenIn).toBe('Build')

    // The second request now matters more, and the answer follows the direction rather than the id.
    const ranked = run(withRoles(twoSubs(3, 1)))
    expect(ranked.assignments.filter((a) => a.role === 'sub')).toHaveLength(2)
    expect(lowEndPairing(ranked)?.listenIn).toBe('Drop')
  })
})

describe('lowEndPairing is silent where there is no pair (invariant 5)', () => {
  it('says nothing when the direction asks for no sub', () => {
    const roles = GOLDEN_TEMPLATE.roles.filter((r) => r.role !== 'sub')
    expect(lowEndPairing(run(withRoles(roles)))).toBeUndefined()
  })

  it('says nothing when the direction asks for no kick', () => {
    const roles = GOLDEN_TEMPLATE.roles.filter((r) => r.role !== 'kick')
    expect(lowEndPairing(run(withRoles(roles)))).toBeUndefined()
  })

  it('says nothing when the sub was asked for and the rig could not carry it', () => {
    // The drum machine alone: its `lt` voice declares `sub`, and nothing authors a sub recipe
    // for it, so the request becomes a §7.3 shortfall rather than an assignment.
    const drum = GOLDEN_DEVICES.filter((d) => d.id === 'a-drum')
    const result = run(GOLDEN_TEMPLATE, drum)
    expect(result.assignments.some((a) => a.role === 'kick')).toBe(true)
    expect(result.assignments.some((a) => a.role === 'sub')).toBe(false)
    expect(lowEndPairing(result)).toBeUndefined()
  })

  it('says nothing when the two parts never sound at once', () => {
    const roles = GOLDEN_TEMPLATE.roles.map((r) => {
      if (r.id === 'r-kick') return { ...r, sustain: 'transient' as const, sections: ['Intro'] }
      if (r.id === 'r-sub') return { ...r, sustain: 'transient' as const, sections: ['Drop'] }
      return r
    })
    const result = run(withRoles(roles))
    expect(result.assignments.filter((a) => a.role === 'kick' || a.role === 'sub')).toHaveLength(2)
    expect(lowEndPairing(result)).toBeUndefined()
  })
})

describe('lowEndPairing never reads a tuning parameter (#264)', () => {
  it('pairs a kick whose TUNE carries no unit at all — the case the unit gate lost', () => {
    const drum = GOLDEN_DEVICES.find((d) => d.id === 'a-drum') as Device
    const kickRecipe = drum.recipes.find((r) => r.id === 'drum-kick-hard') as Recipe
    const tune = kickRecipe.params.find((p) => p.name === 'TUNE')
    expect(tune).toBeDefined()
    expect(tune && 'unit' in tune ? tune.unit : undefined).toBeUndefined()
    expect(golden()).toBeDefined()
  })

  it('derives exactly the same facts when that TUNE does carry semitones', () => {
    const drum = GOLDEN_DEVICES.find((d) => d.id === 'a-drum') as Device
    const inSemitones: Device = {
      ...drum,
      recipes: drum.recipes.map((r) =>
        r.id !== 'drum-kick-hard'
          ? r
          : {
              ...r,
              params: r.params.map((p) => (p.name === 'TUNE' ? { ...p, unit: 'st' } : p)),
            },
      ),
    }
    const devices = GOLDEN_DEVICES.map((d) => (d.id === 'a-drum' ? inSemitones : d))
    expect(lowEndPairing(run(GOLDEN_TEMPLATE, devices))).toEqual(golden())
  })
})
