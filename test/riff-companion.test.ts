import { describe, expect, it } from 'vitest'
import type {
  Device,
  Recipe,
  ResourceSpec,
  ResourceUse,
  Riff,
  RiffCompanion,
  RiffResolution,
} from '@/lib/core'
import {
  RiffSchema,
  assign,
  assignableKey,
  moodState,
  at,
  recipesFitTogether,
  resolveCompanionAlone,
  resolveRiff,
  variant,
  withoutCompanion,
} from '@/lib/core'
import { RIFFS } from '@/lib/riffs'
import { DEVICES } from '@/lib/devices/registry.generated'
import { presetCompanion, type PresetFigure } from '@/lib/studio/preset-session'
import { box, makeRecipe, request, withRoles } from './rigs'

/**
 * §5A.3/§5A.9. **A riff with a companion is a two-part allocation**: the host plays if it can,
 * then the companion plays if any placement of the host leaves it room, then each takes its best
 * candidate in that order. Fixtures assert which box and which voice, never a cost number.
 */

/** A struck `bass-mid / hard` host with a held `pad / soft` companion, one bar each. */
function pairRiff(over: Partial<RiffCompanion> = {}): Riff {
  return {
    id: 'fixture-pair',
    name: 'The fixture pair',
    reference: { kind: 'record', name: 'fixture pair' },
    technique: ['Play the bass.'],
    bpm: { min: 100, max: 140, default: 120 },
    key: 'A minor',
    request: {
      id: 'fixture-pair',
      role: 'bass-mid',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
      reArticulatesHook: true,
    },
    hook: {
      id: 'fixture-pair-hook',
      forRole: 'bass-mid',
      bars: 1,
      baseOctave: 2,
      notes: [{ step: 1, degree: 1, octave: 0, len: 4 }],
    },
    pattern: variant('fixture-pair-grid', 'bass-mid', 0, 16, at('accent', 110, 1)),
    companion: {
      request: { id: 'fixture-pair-pad', role: 'pad', priority: 1, character: 'soft', sustain: 'continuous' },
      technique: ['Hold the pad under it.'],
      hook: {
        id: 'fixture-pair-pad-hook',
        forRole: 'pad',
        bars: 1,
        baseOctave: 3,
        notes: [{ step: 1, degree: 1, octave: 0, len: 16 }],
      },
      ...over,
    },
  }
}

const bass = (id: string, voice: string, over: Partial<Recipe> = {}): Recipe =>
  makeRecipe(id, 'bass-mid', 'hard', voice, over)
const pad = (id: string, voice: string, over: Partial<Recipe> = {}): Recipe =>
  makeRecipe(id, 'pad', 'soft', voice, over)

/** One box, one voice answering both roles: the two parts cannot both have it. */
const oneVoice = (): Device =>
  box('one-voice', {
    voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['bass-mid', 'pad'], polyphony: 1 }],
    recipes: [bass('one-bass', 'v'), pad('one-pad', 'v')],
  })

/** One box with a voice for each role. */
const twoVoices = (over: Partial<Device> = {}): Device =>
  box('two-voices', {
    voices: [
      { kind: 'fixed', id: 'a', label: 'A', roles: ['bass-mid'], polyphony: 1 },
      { kind: 'fixed', id: 'b', label: 'B', roles: ['pad'], polyphony: 1 },
    ],
    recipes: [bass('two-bass', 'a'), pad('two-pad', 'b')],
    ...over,
  })

function played(r: RiffResolution) {
  expect(r.outcome).toBe('played')
  expect(r.companion?.outcome).toBe('played')
  if (r.outcome !== 'played' || r.companion?.outcome !== 'played') throw new Error('not played')
  return { host: r.voice, companion: r.companion.voice }
}

describe('resolveRiff with a companion (§5A.3/§5A.9)', () => {
  it('parses: the fixture is a legal riff', () => {
    const parsed = RiffSchema.safeParse(pairRiff())
    expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true)
  })

  it('leaves a riff without one exactly as it was: no `companion` key at all', () => {
    for (const riff of RIFFS) {
      const r = resolveRiff(riff, DEVICES)
      expect('companion' in r, riff.id).toBe(riff.companion !== undefined)
    }
  })

  it('never puts the two parts on one voice: one voice for both is a `no-room` companion', () => {
    const r = resolveRiff(pairRiff(), [oneVoice()])
    expect(r.outcome).toBe('played')
    expect(r.companion?.outcome).toBe('gap')
    if (r.companion?.outcome !== 'gap') return
    expect(r.companion.gap.reason).toBe('no-room')
    if (r.companion.gap.reason !== 'no-room') return
    // The voice could carry it on a rig with no host on it, which is what makes it this gap.
    expect(r.companion.gap.capable.map((a) => a.voiceId)).toEqual(['v'])
  })

  it('shares a box where the box has a voice for each, and splits its voices between them', () => {
    const { host, companion } = played(resolveRiff(pairRiff(), [twoVoices()]))
    expect(host.device.id).toBe('two-voices')
    expect(companion.device.id).toBe('two-voices')
    expect(host.assignables.map((a) => a.voiceId)).toEqual(['a'])
    expect(companion.assignables.map((a) => a.voiceId)).toEqual(['b'])
    // The host's patch affinities are the host's; the companion is never told to load a patch.
    expect(companion.factoryPatch).toBeUndefined()
  })

  it('takes a pool member each, never the same one', () => {
    const pool = (count: number): Device =>
      box('pool', {
        voices: [
          { kind: 'pool', id: 'track', label: 'Track', count, roles: ['bass-mid', 'pad'], polyphony: 1 },
        ],
        recipes: [bass('pool-bass', 'track'), pad('pool-pad', 'track')],
      })
    const { host, companion } = played(resolveRiff(pairRiff(), [pool(3)]))
    const hostKeys = host.assignables.map(assignableKey)
    const companionKeys = companion.assignables.map(assignableKey)
    expect(hostKeys.some((k) => companionKeys.includes(k))).toBe(false)
    expect(host.assignables.map((a) => a.voiceId)).toEqual(['track-1'])
    expect(companion.assignables.map((a) => a.voiceId)).toEqual(['track-2'])

    const crowded = resolveRiff(pairRiff(), [pool(1)])
    expect(crowded.outcome).toBe('played')
    expect(crowded.companion?.outcome === 'gap' && crowded.companion.gap.reason).toBe('no-room')
  })

  it('moves the host off its one-part answer where that answer leaves the companion nowhere', () => {
    // The host alone prefers `shared`, where `bass-mid` is the voice's first role; `elsewhere`
    // plays it as a second role. `shared` is the only box with a pad. Greedy host-first would
    // put the host on `shared` and report the companion a gap on a rig that plays both.
    const shared = box('shared', {
      voices: [{ kind: 'fixed', id: 'x', label: 'X', roles: ['bass-mid', 'pad'], polyphony: 1 }],
      recipes: [bass('shared-bass', 'x'), pad('shared-pad', 'x')],
    })
    const elsewhere = box('elsewhere', {
      voices: [{ kind: 'fixed', id: 'y', label: 'Y', roles: ['lead', 'bass-mid'], polyphony: 1 }],
      recipes: [bass('elsewhere-bass', 'y')],
    })
    const alone = resolveRiff(withoutCompanion(pairRiff()), [shared, elsewhere])
    expect(alone.outcome === 'played' && alone.voice.device.id).toBe('shared')

    const { host, companion } = played(resolveRiff(pairRiff(), [shared, elsewhere]))
    expect(host.device.id).toBe('elsewhere')
    expect(companion.device.id).toBe('shared')
  })

  it('keeps the host on its one-part answer whenever the companion has room beside it', () => {
    const r = resolveRiff(pairRiff(), [twoVoices(), oneVoice()])
    const alone = resolveRiff(withoutCompanion(pairRiff()), [twoVoices(), oneVoice()])
    const { host } = played(r)
    expect(alone.outcome === 'played' && alone.voice.recipe.id).toBe(host.recipe.id)
  })

  describe('on one box, both recipes have to load together (§2.3)', () => {
    const slotted = (padOver: { sharedAs?: string }): Device =>
      twoVoices({
        resources: [{ id: 'slot', limit: 1, label: 'sample slots' }],
        recipes: [
          bass('two-bass', 'a', { consumes: [{ resource: 'slot', sharedAs: 'kit' }] }),
          pad('two-pad', 'b', { consumes: [{ resource: 'slot', ...padOver }] }),
        ],
      })

    it('refuses a pair that needs two slots on a box with one', () => {
      const device = slotted({})
      const [b, p] = device.recipes as [Recipe, Recipe]
      expect(recipesFitTogether(device, [b])).toBe(true)
      expect(recipesFitTogether(device, [b, p])).toBe(false)
      const r = resolveRiff(pairRiff(), [device])
      expect(r.outcome).toBe('played')
      expect(r.companion?.outcome === 'gap' && r.companion.gap.reason).toBe('no-room')
    })

    it('allows it where the two recipes are one loaded thing', () => {
      const device = slotted({ sharedAs: 'kit' })
      expect(recipesFitTogether(device, device.recipes)).toBe(true)
      played(resolveRiff(pairRiff(), [device]))
    })
  })

  describe('reports an honest `pad / soft` gap', () => {
    const bassOnly = box('bass-only', {
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['bass-mid'], polyphony: 1 }],
      recipes: [bass('bass-only-bass', 'v')],
    })

    it('no-such-role where nothing on the rig plays a pad, and the host still plays', () => {
      const r = resolveRiff(pairRiff(), [bassOnly])
      expect(r.outcome).toBe('played')
      expect(r.companion?.outcome).toBe('gap')
      if (r.companion?.outcome !== 'gap') return
      expect(r.companion.gap).toMatchObject({ reason: 'no-capable-voice', because: 'no-such-role' })
      // The notes are the companion's own, resolved in the riff's key.
      expect(r.companion.notes.outcome === 'resolved' && r.companion.notes.hook.notes[0]?.note).toBe(
        'A3',
      )
    })

    it('no-recipe where a voice plays pads and nothing is written for one', () => {
      const unwritten = box('unwritten', {
        voices: [{ kind: 'fixed', id: 'p', label: 'P', roles: ['pad'], polyphony: 1 }],
        recipes: [makeRecipe('unwritten-kick', 'kick', 'hard', 'p')],
      })
      const r = resolveRiff(pairRiff(), [bassOnly, unwritten])
      expect(r.companion?.outcome === 'gap' && r.companion.gap.reason).toBe('no-recipe')
    })

    it('resolves the companion alone where the host has nowhere to play', () => {
      const padOnly = box('pad-only', {
        voices: [{ kind: 'fixed', id: 'p', label: 'P', roles: ['pad'], polyphony: 1 }],
        recipes: [pad('pad-only-pad', 'p')],
      })
      const r = resolveRiff(pairRiff(), [padOnly])
      expect(r.outcome).toBe('gap')
      expect(r.companion?.outcome === 'played' && r.companion.voice.device.id).toBe('pad-only')
    })
  })

  it('is deterministic: the same pair on every run and in every rig order', () => {
    const rig = [twoVoices(), oneVoice(), ...DEVICES.slice(0, 8)]
    const first = resolveRiff(pairRiff(), rig)
    const again = resolveRiff(pairRiff(), rig)
    const reversed = resolveRiff(pairRiff(), [...rig].reverse())
    const where = (r: RiffResolution) => {
      const { host, companion } = played(r)
      return [host.recipe.id, host.assignables.map(assignableKey), companion.recipe.id, companion.assignables.map(assignableKey)]
    }
    expect(where(again)).toEqual(where(first))
    expect(where(reversed)).toEqual(where(first))
  })
})

/**
 * §2.3/#25. **A pair on one box is feasible exactly where `assign` would load both.** Each fixture
 * is one box with a voice for each role and one recipe on each, so the search has no alternative
 * to take: it assigns both requests or it refuses one for room, and `recipesFitTogether` and
 * `resolveRiff`'s companion have to agree with it. Differential rather than hand-computed, so the
 * expected answer is the search's and not this file's.
 */
describe('pair feasibility agrees with `assign` (§2.3/#25)', () => {
  type Case = {
    label: string
    resources?: ResourceSpec[]
    bass?: ResourceUse[]
    pad?: ResourceUse[]
    fits: boolean
  }
  const slot = (limit: number): ResourceSpec => ({ id: 'slot', limit, label: 'slots' })
  const ram = (limit: number): ResourceSpec => ({ id: 'ram', limit, label: 'memory' })
  const cases: Case[] = [
    { label: 'ordinary: neither recipe consumes anything', fits: true },
    { label: 'ordinary: one slot each, two slots', resources: [slot(2)], bass: [{ resource: 'slot' }], pad: [{ resource: 'slot' }], fits: true },
    { label: 'over the limit: one slot each, one slot', resources: [slot(1)], bass: [{ resource: 'slot' }], pad: [{ resource: 'slot' }], fits: false },
    {
      label: 'shared: two recipes that are one loaded thing, one slot',
      resources: [slot(1)],
      bass: [{ resource: 'slot', sharedAs: 'kit' }],
      pad: [{ resource: 'slot', sharedAs: 'kit' }],
      fits: true,
    },
    {
      label: 'multi-resource, within both',
      resources: [slot(1), ram(2)],
      bass: [{ resource: 'slot' }, { resource: 'ram' }],
      pad: [{ resource: 'ram' }],
      fits: true,
    },
    {
      label: 'multi-resource, over one of them',
      resources: [slot(1), ram(2)],
      bass: [{ resource: 'slot' }, { resource: 'ram' }],
      pad: [{ resource: 'slot' }, { resource: 'ram' }],
      fits: false,
    },
    { label: 'amount > 1, over', resources: [ram(3)], bass: [{ resource: 'ram', amount: 2 }], pad: [{ resource: 'ram', amount: 2 }], fits: false },
    { label: 'amount > 1, exactly at the limit', resources: [ram(4)], bass: [{ resource: 'ram', amount: 2 }], pad: [{ resource: 'ram', amount: 2 }], fits: true },
    { label: 'undeclared resource on one recipe', resources: [slot(4)], bass: [{ resource: 'slot' }], pad: [{ resource: 'mystery' }], fits: false },
    { label: 'undeclared resource on a box with no budget at all', pad: [{ resource: 'slot' }], fits: false },
  ]

  const deviceFor = (c: Case): Device =>
    twoVoices({
      ...(c.resources === undefined ? {} : { resources: c.resources }),
      recipes: [
        bass('two-bass', 'a', c.bass === undefined ? {} : { consumes: c.bass }),
        pad('two-pad', 'b', c.pad === undefined ? {} : { consumes: c.pad }),
      ],
    })

  const searchLoadsBoth = (device: Device, order: 'bass-first' | 'pad-first'): boolean => {
    const requests = [
      request({ id: 'b', role: 'bass-mid', character: 'hard' }),
      request({ id: 'p', role: 'pad', character: 'soft' }),
    ]
    const template = withRoles(order === 'bass-first' ? requests : [...requests].reverse())
    return assign({ devices: [device], template, mood: moodState(), seed: 1 }).assignments.length === 2
  }

  it.each(cases)('$label', (c) => {
    const device = deviceFor(c)
    const both = searchLoadsBoth(device, 'bass-first')
    // The fixture's own expectation is checked against the search first, so a wrong fixture
    // fails as a wrong fixture rather than as a disagreement.
    expect(both).toBe(c.fits)
    expect(searchLoadsBoth(device, 'pad-first')).toBe(both)
    expect(recipesFitTogether(device, device.recipes)).toBe(both)
    expect(recipesFitTogether(device, [...device.recipes].reverse())).toBe(both)
    const r = resolveRiff(pairRiff(), [device])
    const pairPlayed = r.outcome === 'played' && r.companion?.outcome === 'played'
    expect(pairPlayed).toBe(both)
  })
})

describe('a preset figure’s companion (§5A.9/§3.7)', () => {
  const figure = { riff: pairRiff() } as PresetFigure

  it('is never placed on the box the page is for, which is playing the host', () => {
    const pageBox = twoVoices()
    const r = presetCompanion(figure, [pageBox], pageBox)
    expect(r?.outcome === 'gap' && r.gap.reason).toBe('no-capable-voice')
  })

  it('goes to another box on the reader’s rig, with nothing occupied there', () => {
    const pageBox = twoVoices()
    const r = presetCompanion(figure, [pageBox, oneVoice()], pageBox)
    expect(r?.outcome === 'played' && r.voice.device.id).toBe('one-voice')
  })

  it('is undefined for a figure with no companion', () => {
    expect(presetCompanion({ riff: withoutCompanion(pairRiff()) } as PresetFigure, [oneVoice()], oneVoice())).toBeUndefined()
    expect(resolveCompanionAlone(withoutCompanion(pairRiff()), DEVICES)).toBeUndefined()
  })
})
