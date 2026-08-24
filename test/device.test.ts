import { describe, expect, it } from 'vitest'
import {
  DEVICE_KINDS,
  DeviceKindSchema,
  DeviceSchema,
  RecipeSchema,
  VoiceSpecSchema,
  expand,
  type Assignable,
  type Verified,
} from '../lib/core/index'
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

  it('lets a patch entry and an articulation carry their own citation (§3.1, §3.3)', () => {
    // The repair #49 produced. §3 always said the recipe citation is inherited by "any param,
    // patch entry or articulation entry that does not carry its own" — and only params could.
    const cited = { kind: 'manual', source: 'fixture manual p.25' } as const
    expect(
      RecipeSchema.safeParse(
        recipe({ patch: [{ from: 'VCO B · SAW', to: 'VCO A · SYNC', verified: cited }] }),
      ).success,
    ).toBe(true)
    expect(
      RecipeSchema.safeParse(
        recipe({ articulation: [{ slot: 'accent', set: { velocity: 110 }, verified: cited }] }),
      ).success,
    ).toBe(true)

    // `false` is a legal, meaningful value on both: "this one is a guess, in a recipe that is
    // otherwise cited". It is the direction an inheritance built on `||` gets wrong.
    expect(
      RecipeSchema.safeParse(
        recipe({ patch: [{ from: 'A', to: 'B', verified: false }] }),
      ).success,
    ).toBe(true)
    expect(
      RecipeSchema.safeParse(
        recipe({ articulation: [{ slot: 'accent', set: { velocity: 110 }, verified: false }] }),
      ).success,
    ).toBe(true)

    // And a malformed citation is still refused on both, rather than shrugged through.
    expect(
      RecipeSchema.safeParse(
        recipe({ patch: [{ from: 'A', to: 'B', verified: { kind: 'rumour' } as never }] }),
      ).success,
    ).toBe(false)
    expect(
      RecipeSchema.safeParse(
        recipe({
          articulation: [{ slot: 'accent', set: { velocity: 1 }, verified: { kind: 'manual' } as never }],
        }),
      ).success,
    ).toBe(false)
  })
})

describe('Device manifest (§2.3)', () => {
  /**
   * §3.3. A jack exists or it does not, and that is device-level — the same standing as a
   * per-step capability in `features.perStep`, which a recipe may reference and may not invent.
   */
  const JACK_CITE = { kind: 'manual', source: 'fixture manual p.25' } as const

  function patchable(over: Record<string, unknown> = {}) {
    return device({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', verified: JACK_CITE },
        { id: 'VCF · IN', direction: 'in', verified: JACK_CITE },
      ],
      recipes: [recipe({ patch: [{ from: 'VCO A · SAW', to: 'VCF · IN' }] })],
      ...over,
    } as never)
  }

  it('accepts a patch entry whose endpoints the device declares (§3.3)', () => {
    const parsed = DeviceSchema.safeParse(patchable())
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('rejects a patch entry naming a jack the device does not declare (§3.3)', () => {
    // The check this repair exists for: before it, a typo in a jack name rendered happily and
    // sent a reader hunting for a socket that is not on the box.
    const bad = patchable({
      recipes: [recipe({ patch: [{ from: 'VCO A · SAW', to: 'VCF · INN' }] })],
    })
    const parsed = DeviceSchema.safeParse(bad)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('does not declare')
  })

  it('rejects a patch entry with no jack list at all to check against', () => {
    const bare = device({ recipes: [recipe({ patch: [{ from: 'A', to: 'B' }] })] } as never)
    expect(DeviceSchema.safeParse(bare).success).toBe(false)
  })

  it('rejects a cable that leaves an input or arrives at an output (§3.3)', () => {
    // A cable runs output to input. Reversed endpoints are a real authoring mistake and the
    // declared direction is what makes them catchable.
    const reversed = patchable({
      recipes: [recipe({ patch: [{ from: 'VCF · IN', to: 'VCO A · SAW' }] })],
    })
    const parsed = DeviceSchema.safeParse(reversed)
    expect(parsed.success).toBe(false)
    const issues = JSON.stringify(parsed.success ? [] : parsed.error.issues)
    expect(issues).toContain('must be an output')
    expect(issues).toContain('must be an input')
  })

  it('rejects two jack declarations sharing one id (§3.3)', () => {
    // Same reason voice ids are unique: a patch entry names one, and two declarations make the
    // citation and the direction ambiguous rather than merely redundant.
    const dup = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', verified: JACK_CITE },
        { id: 'VCO A · SAW', direction: 'in', verified: JACK_CITE },
        { id: 'VCF · IN', direction: 'in', verified: JACK_CITE },
      ],
    })
    const parsed = DeviceSchema.safeParse(dup)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('must be unique')
  })

  it('requires a jack declaration to carry a citation, `false` included (§3.3)', () => {
    // `verified` is not optional here. A jack whose page nobody has found is a real state and
    // says so; a jack with no claim at all is an omission the type should not permit.
    expect(
      DeviceSchema.safeParse(
        patchable({
          jacks: [
            { id: 'VCO A · SAW', direction: 'out', verified: false },
            { id: 'VCF · IN', direction: 'in', verified: JACK_CITE },
          ],
        }),
      ).success,
    ).toBe(true)
    expect(
      DeviceSchema.safeParse(
        patchable({
          jacks: [
            { id: 'VCO A · SAW', direction: 'out' },
            { id: 'VCF · IN', direction: 'in', verified: JACK_CITE },
          ],
        }),
      ).success,
    ).toBe(false)
  })

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

  it('accepts every kind in the closed list, and only those', () => {
    // The list is closed because `kind` drives a user-visible filter and a free-text kind would
    // make that filter a list of typos. Asserted over `DEVICE_KINDS` rather than as a literal
    // list, so adding one here cannot silently pass while the schema rejects it.
    for (const kind of DEVICE_KINDS) {
      const parsed = DeviceSchema.safeParse(device({ kind }))
      expect(parsed.success, kind).toBe(true)
    }
    expect(DeviceKindSchema.options).toEqual([...DEVICE_KINDS])
  })

  it('accepts a sequencer: no voices, no recipes, and that is the whole point (§2.3, §2.4)', () => {
    // A Eurorack sequencer has pitch and gate tracks, modulation lanes, and no sound engine at
    // all. `semi-modular` would imply a normalised audio instrument — and voices, assignables
    // and recipes it does not have — while `groovebox` would imply self-contained sound
    // generation, which is the one thing it is defined by not doing. Both would make the
    // manifest state something false, which is the test a new kind has to pass.
    const sequencer = device({
      id: 'intellijel-metropolix',
      kind: 'sequencer',
      voices: [],
      recipes: [],
      features: undefined,
      hints: undefined,
    })
    const parsed = DeviceSchema.safeParse(sequencer)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    // And it behaves like §2.4's other voiceless boxes rather than needing a special case.
    expect(expand(parsed.success ? parsed.data : sequencer)).toHaveLength(0)
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

  it('allows one recipe per (role, character, voice) and no more (§3)', () => {
    const twoCharacters = device({
      recipes: [recipe(), recipe({ id: 'fx-kick-dirty', character: 'dirty' })],
    })
    expect(DeviceSchema.safeParse(twoCharacters).success).toBe(true)

    const collision = device({
      recipes: [recipe(), recipe({ id: 'fx-kick-hard-again' })],
    })
    expect(DeviceSchema.safeParse(collision).success).toBe(false)
  })

  it('counts (role, character) per voice, not across the whole device (§3)', () => {
    // The uniqueness key must match the lookup key (`poolId ?? voiceId`, §2.2). Two voices of
    // one flavour — LT and MT both taking tom+dark, or a tonal recipe a two-pool device needs
    // on each pool — is legal authoring, and the old device-wide key rejected it.
    const twoVoicesOneFlavour = device({
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'bd2', label: 'BD2', roles: ['kick'], polyphony: 1 },
      ],
      recipes: [recipe(), recipe({ id: 'fx-kick-hard-2', voice: 'bd2' })],
    })
    expect(DeviceSchema.safeParse(twoVoicesOneFlavour).success).toBe(true)
  })

  it('still rejects the same (role, character) twice on one voice (§3)', () => {
    // Narrowed, not removed: within a single voice the rule is unchanged, so a lookup can
    // never face two equally-exact candidates.
    const sameVoiceTwice = device({
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'bd2', label: 'BD2', roles: ['kick'], polyphony: 1 },
      ],
      recipes: [recipe(), recipe({ id: 'fx-kick-hard-2' })],
    })
    expect(DeviceSchema.safeParse(sameVoiceTwice).success).toBe(false)
  })

  it('applies the same key to a pool, whose recipes address the pool id (§2.2)', () => {
    // Two pools on one device may each carry the same (role, character); one pool may not
    // carry it twice.
    const twoPools = device({
      voices: [
        { kind: 'pool', id: 'p-a', label: 'A', count: 2, roles: ['kick'], polyphony: 1 },
        { kind: 'pool', id: 'p-b', label: 'B', count: 2, roles: ['kick'], polyphony: 1 },
      ],
      recipes: [
        recipe({ id: 'fx-kick-hard-a', voice: 'p-a' }),
        recipe({ id: 'fx-kick-hard-b', voice: 'p-b' }),
      ],
    })
    expect(DeviceSchema.safeParse(twoPools).success).toBe(true)

    const onePoolTwice = device({
      voices: [{ kind: 'pool', id: 'p-a', label: 'A', count: 2, roles: ['kick'], polyphony: 1 }],
      recipes: [
        recipe({ id: 'fx-kick-hard-a', voice: 'p-a' }),
        recipe({ id: 'fx-kick-hard-a2', voice: 'p-a' }),
      ],
    })
    expect(DeviceSchema.safeParse(onePoolTwice).success).toBe(false)
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
        device({ clock: { canSendClock: true, canReceiveClock: true, transport: ['bluetooth'] } }),
      ).success,
    ).toBe(true)
    expect(
      DeviceSchema.safeParse(device({ clock: { canSendClock: true, canReceiveClock: true, transport: [''] } }))
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

describe('physical panel span (§10)', () => {
  const CITED = { kind: 'manual', source: 'Fixture Manual p.1' } as const

  it('requires a span — a device the rack cannot draw is not a legal device', () => {
    const { physical: _dropped, ...noWidth } = device()
    expect(DeviceSchema.safeParse(noWidth).success).toBe(false)
  })

  it('rejects a span that is not a positive, finite measurement', () => {
    for (const panelSpanMm of [0, -170, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(DeviceSchema.safeParse(device({ physical: { panelSpanMm, verified: CITED } })).success).toBe(false)
    }
    expect(DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170, verified: CITED } })).success).toBe(true)
  })

  it('carries provenance the same way a numeric range does (§3.1)', () => {
    // A manual page, an observation off the unit, or an explicit `false` — the same three states
    // as every other checked value in the library, and no fourth one invented for widths.
    const states: Verified[] = [CITED, { kind: 'observed', source: 'Fixture unit, tape measure' }, false]
    for (const verified of states) {
      expect(DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170, verified } })).success).toBe(true)
    }
  })

  it('makes provenance mandatory, and refuses an empty or malformed citation', () => {
    expect(DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170 } as never })).success).toBe(false)
    expect(
      DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170, verified: { kind: 'manual', source: '' } } })).success,
    ).toBe(false)
    // A bare string is not a citation. `false` is the only non-Cite the field accepts, and it is
    // a claim in its own right: nobody checked.
    expect(
      DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170, verified: 'p.13' } as never })).success,
    ).toBe(false)
    expect(
      DeviceSchema.safeParse(device({ physical: { panelSpanMm: 170, verified: true } as never })).success,
    ).toBe(false)
  })

  it('rejects an unknown key inside physical', () => {
    expect(
      DeviceSchema.safeParse(
        device({ physical: { panelSpanMm: 170, verified: CITED, heightMm: 20 } as never }),
      ).success,
    ).toBe(false)
  })
})


describe('panel layout (§10)', () => {
  const CITED = { kind: 'manual', source: 'Fixture Manual p.9' } as const
  const layout = (over: Record<string, unknown> = {}) => ({
    panelRiseMm: 200,
    verified: CITED,
    features: [{ kind: 'screen', x: 10, y: 10, w: 50, h: 30 }],
    ...over,
  })

  it('is optional: a box nobody has drawn is still a legal manifest', () => {
    expect(DeviceSchema.safeParse(device()).success).toBe(true)
    expect(DeviceSchema.safeParse(device({ panel: layout() as never })).success).toBe(true)
  })

  it('needs a rise and a citation, the same as a span does', () => {
    expect(DeviceSchema.safeParse(device({ panel: layout({ panelRiseMm: 0 }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ panelRiseMm: -1 }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ verified: undefined }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ verified: 'p.9' }) as never })).success).toBe(false)
    // `false` stays legal: a drawing nobody has checked is a claim, not a hole.
    expect(DeviceSchema.safeParse(device({ panel: layout({ verified: false }) as never })).success).toBe(true)
  })

  it('refuses an empty drawing and an unknown feature kind', () => {
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: [] }) as never })).success).toBe(false)
    expect(
      DeviceSchema.safeParse(
        device({ panel: layout({ features: [{ kind: 'lcd', x: 1, y: 1, w: 2, h: 2 }] }) as never }),
      ).success,
    ).toBe(false)
    // Strict objects, so a typo is a build failure rather than a silently ignored coordinate.
    expect(
      DeviceSchema.safeParse(
        device({ panel: layout({ features: [{ kind: 'screen', x: 1, y: 1, w: 2, h: 2, z: 3 }] }) as never }),
      ).success,
    ).toBe(false)
  })

  it('refuses a feature that falls off the panel', () => {
    // `device()` is 400 mm wide, so this screen runs 10 mm past the right edge.
    expect(
      DeviceSchema.safeParse(
        device({ panel: layout({ features: [{ kind: 'screen', x: 360, y: 10, w: 50, h: 30 }] }) as never }),
      ).success,
    ).toBe(false)
    expect(
      DeviceSchema.safeParse(
        device({ panel: layout({ features: [{ kind: 'screen', x: 10, y: 190, w: 50, h: 30 }] }) as never }),
      ).success,
    ).toBe(false)
    expect(
      DeviceSchema.safeParse(
        device({ panel: layout({ features: [{ kind: 'knob', x: -1, y: 10, d: 12 }] }) as never }),
      ).success,
    ).toBe(false)
  })

  it('allows at most one voice field', () => {
    const one = [{ kind: 'voices', x: 10, y: 10, w: 100, h: 40 }]
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: one }) as never })).success).toBe(true)
    expect(
      DeviceSchema.safeParse(device({ panel: layout({ features: [...one, ...one] }) as never })).success,
    ).toBe(false)
  })

  it('needs at least one row and column in a grid', () => {
    const grid = (over: Record<string, unknown>) => [
      { kind: 'grid', x: 10, y: 10, w: 100, h: 40, cols: 4, rows: 2, ...over },
    ]
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: grid({}) }) as never })).success).toBe(true)
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: grid({ cols: 0 }) }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: grid({ rows: 1.5 }) }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: grid({ shape: 'slider' }) }) as never })).success).toBe(false)
    expect(DeviceSchema.safeParse(device({ panel: layout({ features: grid({ shape: 'fader' }) }) as never })).success).toBe(true)
  })
})
