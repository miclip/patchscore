import { describe, expect, it } from 'vitest'
import { DeviceSchema, RecipeSchema, VoiceSpecSchema, type Assignable } from '../lib/core/index'
import { device, poolDevice, recipe } from './fixtures'

describe('VoiceSpec (§2.1)', () => {
  it('accepts both authored shapes', () => {
    expect(
      VoiceSpecSchema.safeParse({
        kind: 'fixed',
        id: 'bd',
        label: 'BD',
        roles: ['kick'],
        polyphony: 1,
      }).success,
    ).toBe(true)
    expect(
      VoiceSpecSchema.safeParse({
        kind: 'pool',
        id: 'track',
        label: 'Track',
        count: 8,
        roles: ['kick', 'pad'],
        polyphony: 4,
      }).success,
    ).toBe(true)
  })

  it('requires a pool to declare its count and a fixed voice not to', () => {
    expect(
      VoiceSpecSchema.safeParse({ kind: 'pool', id: 't', label: 'T', roles: ['pad'], polyphony: 1 })
        .success,
    ).toBe(false)
    expect(
      VoiceSpecSchema.safeParse({
        kind: 'fixed',
        id: 'bd',
        label: 'BD',
        roles: ['kick'],
        polyphony: 1,
        count: 8,
      }).success,
    ).toBe(false)
  })

  it('rejects a kind outside the union', () => {
    expect(
      VoiceSpecSchema.safeParse({ kind: 'voice', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 })
        .success,
    ).toBe(false)
  })

  it('requires polyphony to be a whole note count of at least one (§12.4)', () => {
    const base = { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'] }
    expect(VoiceSpecSchema.safeParse({ ...base, polyphony: 0 }).success).toBe(false)
    expect(VoiceSpecSchema.safeParse({ ...base, polyphony: 1.5 }).success).toBe(false)
    expect(VoiceSpecSchema.safeParse({ ...base, polyphony: 3 }).success).toBe(true)
  })

  it('rejects unknown roles', () => {
    const base = { kind: 'fixed', id: 'bd', label: 'BD', polyphony: 1 }
    expect(VoiceSpecSchema.safeParse({ ...base, roles: ['thump'] }).success).toBe(false)
    expect(VoiceSpecSchema.safeParse({ ...base, roles: [] }).success).toBe(false)
  })
})

describe('Assignable (§2.2, §4.2)', () => {
  const fixed: Assignable = {
    deviceId: 'roland-tr-1000',
    voiceId: 'bd',
    label: 'BD',
    roles: ['kick'],
    polyphony: 1,
  }
  const pooled: Assignable = {
    deviceId: 'polyend-tracker-mini',
    voiceId: 'track-3',
    poolId: 'track',
    label: 'Track 3',
    ordinal: 3,
    roles: ['kick', 'pad'],
    polyphony: 4,
  }

  it('separates the pool a voice came from and the ordinal it got (§2.2)', () => {
    // Recipe lookup keys on `poolId ?? voiceId`, so both have to survive the flattening;
    // the lookup itself is the registry's and the resolver's (build steps 2 and 3).
    expect(fixed.poolId).toBeUndefined()
    expect(fixed.ordinal).toBeUndefined()
    expect(pooled.poolId).toBe('track')
    expect(pooled.ordinal).toBe(3)
  })

  it('carries no per-guide state', () => {
    // §4.2: hanging occupancy on an Assignable makes expand() impure and unshareable.
    const keys = Object.keys(pooled).sort()
    expect(keys).toEqual(['deviceId', 'label', 'ordinal', 'polyphony', 'poolId', 'roles', 'voiceId'])
    expect(keys).not.toContain('occupancy')
    expect(keys).not.toContain('sections')
  })
})

describe('Recipe (§3)', () => {
  it('accepts the authored shape', () => {
    expect(RecipeSchema.safeParse(recipe()).success).toBe(true)
  })

  it('rejects a role or character outside the shared vocabulary', () => {
    expect(RecipeSchema.safeParse(recipe({ role: 'cowbell' as never })).success).toBe(false)
    expect(RecipeSchema.safeParse(recipe({ character: 'warm' as never })).success).toBe(false)
  })

  it('accepts a false recipe-level citation, meaning everything under it is provisional', () => {
    expect(RecipeSchema.safeParse(recipe({ verified: false })).success).toBe(true)
  })

  it('carries a patch list for semi-modular devices (§3.3)', () => {
    expect(
      RecipeSchema.safeParse(recipe({ patch: [{ from: 'OSC1 SUB', to: 'FILTER IN' }] })).success,
    ).toBe(true)
    expect(RecipeSchema.safeParse(recipe({ patch: [{ from: 'OSC1 SUB' } as never] })).success).toBe(
      false,
    )
  })
})

describe('Device manifest (§2.3)', () => {
  it('accepts a fixed-voice device and a pool device', () => {
    expect(DeviceSchema.safeParse(device()).success).toBe(true)
    expect(DeviceSchema.safeParse(poolDevice()).success).toBe(true)
  })

  it('accepts a device with no voices at all (§2.4)', () => {
    // A mixer-recorder contributes no assignables and still appears in rig integration.
    const mixer = device({
      id: 'tascam-model-2400',
      kind: 'mixer-recorder',
      voices: [],
      recipes: [],
      features: undefined,
      hints: undefined,
    })
    expect(DeviceSchema.safeParse(mixer).success).toBe(true)
  })

  it('rejects a kind outside the closed list', () => {
    expect(DeviceSchema.safeParse(device({ kind: 'eurorack' as never })).success).toBe(false)
  })

  it('rejects duplicate voice ids and duplicate recipe ids', () => {
    expect(
      DeviceSchema.safeParse(
        device({
          voices: [
            { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
            { kind: 'fixed', id: 'bd', label: 'BD2', roles: ['kick'], polyphony: 1 },
          ],
        }),
      ).success,
    ).toBe(false)
    expect(DeviceSchema.safeParse(device({ recipes: [recipe(), recipe()] })).success).toBe(false)
  })

  it('allows one recipe per (role, character) and no more (§3)', () => {
    const twoCharacters = device({
      recipes: [recipe(), recipe({ id: 'fx-kick-dirty', character: 'dirty' })],
    })
    expect(DeviceSchema.safeParse(twoCharacters).success).toBe(true)

    const collision = device({
      recipes: [recipe(), recipe({ id: 'fx-kick-hard-again' })],
    })
    expect(DeviceSchema.safeParse(collision).success).toBe(false)
  })

  it('counts (role, character) across the whole device, not per voice', () => {
    // §3's rule as written is per device. The consequence, worth seeing: a device cannot
    // author the same (role, character) for two of its own voices.
    const twoVoicesOneFlavour = device({
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'bd2', label: 'BD2', roles: ['kick'], polyphony: 1 },
      ],
      recipes: [recipe(), recipe({ id: 'fx-kick-hard-2', voice: 'bd2' })],
    })
    expect(DeviceSchema.safeParse(twoVoicesOneFlavour).success).toBe(false)
  })

  it('rejects a recipe pointing at a voice the device does not declare', () => {
    expect(DeviceSchema.safeParse(device({ recipes: [recipe({ voice: 'sd' })] })).success).toBe(
      false,
    )
  })

  it('rejects an articulation the box physically cannot do (§3)', () => {
    // Every key in an articulation.set must appear in this device's features.perStep.
    const bad = device({
      recipes: [recipe({ articulation: [{ slot: 'accent', set: { substep: 2 } }] })],
    })
    expect(DeviceSchema.safeParse(bad).success).toBe(false)

    const good = device({
      features: { perStep: ['velocity', 'substep'] },
      recipes: [recipe({ articulation: [{ slot: 'accent', set: { substep: 2 } }] })],
    })
    expect(DeviceSchema.safeParse(good).success).toBe(true)
  })

  it('rejects an articulation hint the device never authored', () => {
    expect(
      DeviceSchema.safeParse(
        device({
          recipes: [recipe({ articulation: [{ slot: 'accent', set: { velocity: 110 }, hint: 'open-comp' }] })],
        }),
      ).success,
    ).toBe(false)
  })

  it('takes clock transports as open strings and the main output as a closed pair', () => {
    // DESIGN.md gives an example transport list but never freezes it, so a box with an
    // unanticipated transport still parses; only an empty name is refused.
    expect(
      DeviceSchema.safeParse(
        device({ clock: { canMaster: true, canSlave: true, transport: ['bluetooth'] } }),
      ).success,
    ).toBe(true)
    expect(
      DeviceSchema.safeParse(device({ clock: { canMaster: true, canSlave: true, transport: [''] } }))
        .success,
    ).toBe(false)
    expect(
      DeviceSchema.safeParse(
        device({ io: { main: 'quad' as never, individualOuts: 0, audioIn: false, usbAudio: false } }),
      ).success,
    ).toBe(false)
  })

  it('rejects a comfortableVoices of zero (§12.4 counts occupied assignables)', () => {
    expect(DeviceSchema.safeParse(device({ comfortableVoices: 0 })).success).toBe(false)
    // Cascadia declares 1.
    expect(DeviceSchema.safeParse(device({ comfortableVoices: 1 })).success).toBe(true)
  })

  it('rejects an unknown top-level key rather than dropping it', () => {
    expect(DeviceSchema.safeParse({ ...device(), voicez: [] }).success).toBe(false)
  })
})
