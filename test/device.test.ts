import { describe, expect, it } from 'vitest'
import {
  DEVICE_KINDS,
  DeviceKindSchema,
  DeviceSchema,
  JackSignalKindSchema,
  RecipeSchema,
  TrackModeSchema,
  TriggerNoteSchema,
  VoiceSpecSchema,
  articulablePerStep,
  clockSourceSetupFact,
  evidenceFor,
  expand,
  jackFact,
  triggerNoteFor,
  type Assignable,
  type Recipe,
  type TrackMode,
  type TriggerNote,
  type Verified,
} from '../lib/core/index'
import { device, enumParam, numericParam, poolDevice, recipe } from './fixtures'

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

describe('TriggerNote (§2.1)', () => {
  const CITE = { kind: 'manual', source: 'Fixture Manual, p.90' } as const
  const good = { note: 'C5', midi: 60, verified: CITE }

  it('accepts a cited note', () => {
    expect(TriggerNoteSchema.safeParse(good).success).toBe(true)
  })

  it('refuses an uncited one, whether it says so or stays silent (invariant 5)', () => {
    // `Cite`, not `Verified`, and the difference is not pedantry. A note that does not address
    // the voice does not sound it, so a guessed one is an instruction that fails at the machine
    // rather than a rough setting a reader nudges — and it fails invisibly, since nothing on the
    // page distinguishes a guessed `C5` from a read one. There is no state between "the manual
    // says which note" and "we do not model this voice's addressing".
    expect(TriggerNoteSchema.safeParse({ ...good, verified: false }).success).toBe(false)
    expect(TriggerNoteSchema.safeParse({ note: 'C5', midi: 60 }).success).toBe(false)
  })

  it('holds `midi` to a whole MIDI note number', () => {
    expect(TriggerNoteSchema.safeParse({ ...good, midi: -1 }).success).toBe(false)
    expect(TriggerNoteSchema.safeParse({ ...good, midi: 128 }).success).toBe(false)
    expect(TriggerNoteSchema.safeParse({ ...good, midi: 60.5 }).success).toBe(false)
    expect(TriggerNoteSchema.safeParse({ ...good, midi: 0 }).success).toBe(true)
    expect(TriggerNoteSchema.safeParse({ ...good, midi: 127 }).success).toBe(true)
  })

  it('needs a note the box actually prints, and nothing else', () => {
    expect(TriggerNoteSchema.safeParse({ ...good, note: '' }).success).toBe(false)
    expect(TriggerNoteSchema.safeParse({ ...good, octave: 5 }).success).toBe(false)
  })

  it('is optional on both voice shapes', () => {
    const fixed = { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }
    const pooled = { kind: 'pool', id: 't', label: 'T', count: 8, roles: ['pad'], polyphony: 1 }
    expect(VoiceSpecSchema.safeParse(fixed).success).toBe(true)
    expect(VoiceSpecSchema.safeParse({ ...fixed, triggerNote: good }).success).toBe(true)
    expect(VoiceSpecSchema.safeParse({ ...pooled, triggerNote: good }).success).toBe(true)
    expect(VoiceSpecSchema.safeParse({ ...fixed, triggerNote: { note: 'C5' } }).success).toBe(false)

  })

  it('is a fact about a voice, and a recipe may not carry one', () => {
    // A patch that wanted a different note from its track's would be a *sliced* instrument, where
    // a note is a slice address rather than a pitch or an original-pitch marker — a different
    // kind of value with the same shape. Until the vocabulary can say which of the two a voice
    // is doing, one name for both is the thing this refuses (§4.1's third category).
    expect(RecipeSchema.safeParse({ ...recipe(), triggerNote: good }).success).toBe(false)
  })
})

describe('expand carries the trigger note (§2.1, §2.2)', () => {
  const NOTE: TriggerNote = {
    note: 'C5',
    midi: 60,
    verified: { kind: 'manual', source: 'Fixture Manual, p.90' },
  }

  it('gives every member of a pool the pool\'s own, and leaves a silent voice silent', () => {
    const box = poolDevice({
      voices: [
        { kind: 'pool', id: 'sample', label: 'Sample', count: 3, roles: ['pad'], polyphony: 1, triggerNote: NOTE },
        { kind: 'pool', id: 'synth', label: 'Synth', count: 2, roles: ['pad'], polyphony: 1 },
      ],
    })
    const out = expand(box)
    const sample = out.filter((a) => a.poolId === 'sample')
    const synth = out.filter((a) => a.poolId === 'synth')

    expect(sample).toHaveLength(3)
    for (const a of sample) expect(a.triggerNote).toEqual(NOTE)
    expect(synth).toHaveLength(2)
    // Absent, not defaulted: a track whose note the reader chooses says nothing.
    for (const a of synth) expect(Object.keys(a)).not.toContain('triggerNote')
  })

  it('carries a fixed voice\'s own', () => {
    const box = device({
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1, triggerNote: NOTE }],
    })
    expect(expand(box)[0]?.triggerNote).toEqual(NOTE)
  })
})

/**
 * §2.2/#86. **Track modes: a pool whose members are not addressed alike.**
 *
 * The contract has four parts and they fail in different places on purpose. The *shape* of a mode
 * is `TrackModeSchema`'s; a pool declaring one note and a table of them at once is
 * `VoiceSpecSchema`'s; whether a recipe names a mode its voice has, and whether the machine it
 * carries agrees with that mode, are `DeviceSchema`'s, because both are cross-references between
 * two halves of one manifest; and which note a part ends up with is `triggerNoteFor`'s.
 *
 * Tested here against fixtures rather than only through the Digitakt II, so that the rules stand
 * on their own and the next device to declare modes meets them stated rather than inferred.
 */
describe('TrackMode (§2.2/#86)', () => {
  const CITE = { kind: 'manual', source: 'Fixture Manual, p.90' } as const
  const NOTE: TriggerNote = { note: 'C5', midi: 60, verified: CITE }

  const WHOLE: TrackMode = {
    id: 'whole-sample',
    label: 'ONESHOT',
    triggerNote: NOTE,
    selectedBy: { param: 'MACHINE', values: ['ONESHOT', 'REPITCH'] },
  }
  const SLICED: TrackMode = {
    id: 'sliced',
    label: 'SLICE',
    selectedBy: { param: 'MACHINE', values: ['SLICE'] },
  }

  const machine = (value: string) =>
    enumParam({ name: 'MACHINE', value, options: { values: ['ONESHOT', 'REPITCH', 'SLICE'] } })

  /** A pool declaring both modes, and one recipe on it in whichever mode is asked for. */
  function moded(over: { modes?: TrackMode[]; recipes?: Partial<Recipe>[] } = {}) {
    return poolDevice({
      voices: [
        {
          kind: 'pool',
          id: 'track',
          label: 'Track',
          count: 3,
          roles: ['kick', 'sub', 'pad', 'lead'],
          polyphony: 4,
          modes: over.modes ?? [WHOLE, SLICED],
        },
      ],
      recipes: (over.recipes ?? [{ mode: 'whole-sample' }]).map((r, i) =>
        recipe({
          id: `fx-track-${String(i)}`,
          voice: 'track',
          articulation: undefined,
          params: [machine('ONESHOT')],
          ...r,
        }),
      ),
    })
  }

  describe('the shape of one mode', () => {
    it('accepts a mode with a note and a mode without one', () => {
      expect(TrackModeSchema.safeParse(WHOLE).success).toBe(true)
      expect(TrackModeSchema.safeParse(SLICED).success).toBe(true)
      // The whole point of the table: a mode may decline a note, and declining is not an error.
      expect(TrackModeSchema.safeParse({ id: 'midi', label: 'MIDI' }).success).toBe(true)
    })

    it('holds a mode to the same citation rule a voice-level note has (invariant 5)', () => {
      // `TriggerNoteSchema` is reused rather than restated, so an uncited note is unauthorable
      // wherever it is written. Asserted here because "reused" is a claim about a file somebody
      // could change without meaning to.
      expect(
        TrackModeSchema.safeParse({ ...WHOLE, triggerNote: { note: 'C5', midi: 60 } }).success,
      ).toBe(false)
      expect(
        TrackModeSchema.safeParse({ ...WHOLE, triggerNote: { ...NOTE, verified: false } }).success,
      ).toBe(false)
    })

    it('needs an id, a label and, where present, a selector with something in it', () => {
      expect(TrackModeSchema.safeParse({ ...WHOLE, id: '' }).success).toBe(false)
      expect(TrackModeSchema.safeParse({ ...WHOLE, label: '' }).success).toBe(false)
      expect(
        TrackModeSchema.safeParse({ ...WHOLE, selectedBy: { param: 'MACHINE', values: [] } })
          .success,
      ).toBe(false)
      expect(
        TrackModeSchema.safeParse({ ...WHOLE, selectedBy: { param: '', values: ['ONESHOT'] } })
          .success,
      ).toBe(false)
      // Strict: a field nobody defined is a typo, not an extension.
      expect(TrackModeSchema.safeParse({ ...WHOLE, note: 'C5' }).success).toBe(false)
    })
  })

  describe('what a voice may declare', () => {
    const pool = {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 3,
      roles: ['pad'],
      polyphony: 1,
    }

    it('takes two or more modes on a pool, and none on a fixed voice', () => {
      expect(VoiceSpecSchema.safeParse({ ...pool, modes: [WHOLE, SLICED] }).success).toBe(true)
      // One mode is a pool addressed alike, which `triggerNote` already says with less machinery.
      expect(VoiceSpecSchema.safeParse({ ...pool, modes: [WHOLE] }).success).toBe(false)
      const fixed = { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }
      expect(VoiceSpecSchema.safeParse({ ...fixed, modes: [WHOLE, SLICED] }).success).toBe(false)
    })

    it('refuses a pool that declares a note and a table of notes at once', () => {
      // Two answers to one question, and nothing downstream could pick between them. A pool whose
      // members are not addressed alike says so by declaring modes; one whose members are says so
      // by carrying the note itself.
      expect(
        VoiceSpecSchema.safeParse({ ...pool, modes: [WHOLE, SLICED], triggerNote: NOTE }).success,
      ).toBe(false)
    })

    it('refuses two modes with one id, because a recipe names a mode by its id', () => {
      expect(
        VoiceSpecSchema.safeParse({ ...pool, modes: [WHOLE, { ...SLICED, id: 'whole-sample' }] })
          .success,
      ).toBe(false)
    })
  })

  describe('what a recipe may name (DeviceSchema, because it crosses the manifest)', () => {
    it('accepts a recipe naming a mode its voice declares', () => {
      expect(DeviceSchema.safeParse(moded()).success).toBe(true)
    })

    it('refuses a recipe on a moded voice that names no mode', () => {
      // The load-bearing one. Omission would resolve to *no note*, which is byte for byte what an
      // honest decline looks like — so a forgotten `mode` would read as "this box states nothing"
      // for as long as nobody checked the manual again.
      expect(DeviceSchema.safeParse(moded({ recipes: [{}] })).success).toBe(false)
    })

    it('refuses a mode the voice does not declare', () => {
      expect(DeviceSchema.safeParse(moded({ recipes: [{ mode: 'granular' }] })).success).toBe(false)
    })

    it('refuses a mode on a voice that has none', () => {
      // `poolDevice`'s own pool declares no modes, so this is the typo case: a field the author
      // meant to be load-bearing, silently doing nothing.
      const plain = poolDevice({
        recipes: [recipe({ id: 'fx-track-kick-hard', voice: 'track', articulation: undefined, mode: 'whole-sample' })],
      })
      expect(DeviceSchema.safeParse(plain).success).toBe(false)
    })
  })

  describe('selectedBy: the mode and the switch cannot come apart', () => {
    it('refuses a recipe whose machine contradicts the mode it names', () => {
      // The failure this exists to prevent: switch the machine to SLICE, forget the mode, and the
      // guide prints an original-pitch note for a slice address. CLAUDE.md's TR-8S and minilogue
      // xd rule, reaching a second kind of value.
      const wrong = moded({ recipes: [{ mode: 'whole-sample', params: [machine('SLICE')] }] })
      expect(DeviceSchema.safeParse(wrong).success).toBe(false)
    })

    it('refuses a recipe that carries no selector param at all', () => {
      // Not the same as disagreeing, and worse: there is nothing on the page telling the reader
      // which mode the track is in, so the note would rest on a switch the guide never names.
      const silent = moded({ recipes: [{ mode: 'whole-sample', params: [numericParam()] }] })
      expect(DeviceSchema.safeParse(silent).success).toBe(false)
    })

    it('accepts any of the selector values, not only the first', () => {
      const second = moded({ recipes: [{ mode: 'whole-sample', params: [machine('REPITCH')] }] })
      expect(DeviceSchema.safeParse(second).success).toBe(true)
    })

    it('leaves a mode with no selector unchecked, for a box with no one param that says so', () => {
      const unselected = moded({
        modes: [{ id: 'whole-sample', label: 'Sample' }, SLICED],
        recipes: [{ mode: 'whole-sample', params: [numericParam()] }],
      })
      expect(DeviceSchema.safeParse(unselected).success).toBe(true)
    })
  })

  describe('expansion carries the table, not a selection', () => {
    it('gives every member the same table and no note of its own', () => {
      const members = expand(moded())
      expect(members).toHaveLength(3)
      for (const member of members) {
        expect(member.modes?.map((m) => m.id)).toEqual(['whole-sample', 'sliced'])
        // Absent: the note is the mode's, and a member carrying one too would be a second
        // authority over the same fact.
        expect(Object.keys(member)).not.toContain('triggerNote')
      }
    })

    it('does not multiply members by modes, which is the property that keeps expand cheap', () => {
      // Three tracks and two modes are three assignables. Six would mean the selection had been
      // pushed into the `Assignable`, which is what §2.2 refuses.
      expect(expand(moded())).toHaveLength(3)
    })

    it('shares one frozen array across the pool rather than copying it per member', () => {
      const members = expand(moded())
      const first = members[0]?.modes
      expect(first).toBeDefined()
      expect(Object.isFrozen(first)).toBe(true)
      for (const member of members) expect(member.modes).toBe(first)
    })

    it('leaves a pool with no modes exactly as it was', () => {
      const members = expand(poolDevice())
      expect(members).toHaveLength(8)
      for (const member of members) expect(Object.keys(member)).not.toContain('modes')
    })
  })

  describe('triggerNoteFor: which note the part actually gets', () => {
    const moded3 = expand(moded())[0] as Assignable
    const plain = expand(
      poolDevice({
        voices: [
          { kind: 'pool', id: 'track', label: 'Track', count: 2, roles: ['pad'], polyphony: 1, triggerNote: NOTE },
        ],
      }),
    )[0] as Assignable

    it('falls back to the voice\'s own note where there are no modes', () => {
      // Every device in the library but one goes down this branch, so it is the behaviour that
      // must not have moved.
      expect(triggerNoteFor(recipe({ voice: 'track' }), plain)).toEqual(NOTE)
    })

    it('returns the named mode\'s note where there are', () => {
      expect(triggerNoteFor(recipe({ voice: 'track', mode: 'whole-sample' }), moded3)).toEqual(NOTE)
    })

    it('returns nothing for a mode that declines a note', () => {
      // The half that had to keep working: giving this box a note was never the point, giving it
      // the note true of the track in front of the reader was.
      expect(triggerNoteFor(recipe({ voice: 'track', mode: 'sliced' }), moded3)).toBeUndefined()
    })

    it('is total where a device would not have built', () => {
      // `DeviceSchema` refuses both of these, so neither is reachable through the registry. A
      // total function is cheaper than a cast, and asserting that is cheaper than trusting it.
      expect(triggerNoteFor(recipe({ voice: 'track' }), moded3)).toBeUndefined()
      expect(triggerNoteFor(recipe({ voice: 'track', mode: 'granular' }), moded3)).toBeUndefined()
      expect(triggerNoteFor(recipe({ voice: 'track', mode: 'whole-sample' }), undefined)).toBeUndefined()
    })
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

  /** §2.6/#22. The citation lives at `jacks[<id>]` now, and every declared jack needs one. */
  function jackEvidence(...ids: string[]): Record<string, unknown> {
    return Object.fromEntries(ids.map((id) => [jackFact(id), JACK_CITE]))
  }

  function patchable(over: Record<string, unknown> = {}) {
    return device({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
      ],
      capabilityEvidence: jackEvidence('VCO A · SAW', 'VCF · IN'),
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
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCO A · SAW', direction: 'in', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
      ],
    })
    const parsed = DeviceSchema.safeParse(dup)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('must be unique')
  })

  it('accepts a signal list naming two kinds one socket really carries (§3.3)', () => {
    // What the list is for. A DC-coupled input the manual offers for audio-rate modulation is
    // both things at once, and so is a ring modulator input; neither is an author hedging.
    const two = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio', 'cv'] },
      ],
    })
    const parsed = DeviceSchema.safeParse(two)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('rejects a jack with no signal at all (§3.3)', () => {
    // Required, like `direction`: a socket whose signal nobody stated is a socket every consumer
    // has to guess about, and §10 is the record of what guessing produces.
    const empty = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: [] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
      ],
    })
    expect(DeviceSchema.safeParse(empty).success).toBe(false)
  })

  it('rejects a signal list repeating one kind (§3.3)', () => {
    // A repeat says nothing the singleton did not, and would render twice at the machine.
    const dup = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio', 'audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
      ],
    })
    const parsed = DeviceSchema.safeParse(dup)
    expect(parsed.success).toBe(false)
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toContain('twice')
  })

  it('keeps pitch-cv and cv as two separate kinds (§3.3)', () => {
    // The split exists so a consumer matching an output's kinds against an input's cannot make an
    // LFO a legal source for a note socket. Both are legal values and neither is the other, and a
    // pitch jack carries `pitch-cv` alone — labelling it both would put the shared `cv` member
    // straight back and undo the reason for the member.
    const pitched = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['pitch-cv'] },
        { id: 'VCF · IN', direction: 'in', signal: ['cv'] },
      ],
    })
    const parsed = DeviceSchema.safeParse(pitched)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(JackSignalKindSchema.safeParse('pitch-cv').success).toBe(true)
    expect(JackSignalKindSchema.safeParse('pitch').success).toBe(false)
    expect(JackSignalKindSchema.safeParse('cv').success).toBe(true)
  })

  it('rejects anything outside the closed signal vocabulary (§3.3)', () => {
    const bogus = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['line-level'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
      ],
    })
    expect(DeviceSchema.safeParse(bogus).success).toBe(false)
  })

  /**
   * §2.3/§7.4. **Clock is directional, and `transport` alone could not say so.**
   *
   * The Mother-32 receives clock over MIDI DIN and sends it only as pulses at `OUT · ASSIGN`; it
   * has no MIDI output of any kind. With one list for both directions §7.4 ranked it at
   * `midi-din` and the guide named a socket the box does not have. These are the rules that keep
   * the two lists from drifting back into meaning nothing.
   */
  describe('directional clock transports (§2.3)', () => {
    const clocked = (clock: Record<string, unknown>) => DeviceSchema.safeParse(device({ clock } as never))

    it('takes a box whose two directions run on different wires', () => {
      const parsed = clocked({
        canSendClock: true,
        canReceiveClock: true,
        transport: ['midi-din', 'analog-clock'],
        sendTransport: ['analog-clock'],
        receiveTransport: ['midi-din', 'analog-clock'],
      })
      expect(parsed.success).toBe(true)
    })

    it('leaves a symmetric box exactly as it was, with both fields omitted', () => {
      // The whole point of making these optional: twelve manifests said what they meant before
      // directions existed and still do. A required field here would have been a rewrite of every
      // one of them to state something none of them needed to distinguish.
      expect(clocked({ canSendClock: true, canReceiveClock: true, transport: ['midi-din', 'usb'] }).success).toBe(true)
    })

    it('refuses a direction list without the capability it describes', () => {
      // The same refusal `preferredSource` and `sourceSetup` already get. A field the engine
      // would never read is how a manifest comes to claim something nothing acts on.
      expect(
        clocked({ canSendClock: false, canReceiveClock: true, transport: ['usb'], sendTransport: ['usb'] }).success,
      ).toBe(false)
      expect(
        clocked({ canSendClock: true, canReceiveClock: false, transport: ['usb'], receiveTransport: ['usb'] }).success,
      ).toBe(false)
    })

    it('refuses a direction that widens `transport` rather than narrowing it', () => {
      // `transport` stays the complete list, so everything still reading it — the device page,
      // the jack cross-checks — is reasoning from the whole box and not from half of it.
      expect(
        clocked({
          canSendClock: true,
          canReceiveClock: true,
          transport: ['midi-din'],
          sendTransport: ['analog-clock'],
        }).success,
      ).toBe(false)
    })

    it('refuses a transport that neither direction carries', () => {
      // Only checkable with both lists present; with one absent it defaults to all of
      // `transport` and the union is total by construction.
      expect(
        clocked({
          canSendClock: true,
          canReceiveClock: true,
          transport: ['midi-din', 'usb', 'analog-clock'],
          sendTransport: ['analog-clock'],
          receiveTransport: ['midi-din'],
        }).success,
      ).toBe(false)
    })

    it('refuses a sourceSetup for a transport the box can only receive on', () => {
      // #104's setup is the switch that makes a box *emit*. Against the undirected list this
      // could not be caught: `midi-din` is on the box, just not on its output.
      const parsed = clocked({
        canSendClock: true,
        canReceiveClock: true,
        transport: ['midi-din', 'analog-clock'],
        sendTransport: ['analog-clock'],
        receiveTransport: ['midi-din', 'analog-clock'],
        sourceSetup: [{ transport: 'midi-din', path: 'SETUP > CLOCK', value: 'On' }],
      })
      expect(parsed.success).toBe(false)
      // Asserted on the message, because this fixture also trips §2.6's "every setup has an
      // evidence entry" rule — and a refusal for the wrong reason is a test that stops testing
      // this one the moment the evidence is filled in.
      expect(
        parsed.success ? [] : parsed.error.issues.map((i) => i.message),
      ).toContain('every clock.sourceSetup transport must be one this box can send over')
    })
  })

  it("refuses a clock-carrying jack whose signal list omits 'clock' (§3.3)", () => {
    // `signal` and `clock` answer different questions — what is in the cable, and which wire
    // protocol carries it — and this is the one place they are not free of each other. A
    // manifest telling the rack this socket takes tempo and telling a signal-aware consumer it
    // does not is worse than either answer on its own.
    const contradiction = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
        { id: 'MIDI IN', direction: 'in', signal: ['midi'], clock: ['midi-din'] },
      ],
      capabilityEvidence: jackEvidence('VCO A · SAW', 'VCF · IN', 'MIDI IN'),
    })
    const parsed = DeviceSchema.safeParse(contradiction)
    expect(parsed.success).toBe(false)
    const issues = JSON.stringify(parsed.success ? [] : parsed.error.issues)
    expect(issues).toContain("does not include 'clock'")
  })

  it('accepts the same jack once its signal list says it carries clock (§3.3)', () => {
    // And both fields stay: `midi` is the notes, `clock` the tempo, `midi-din` the wire.
    const ok = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
        { id: 'MIDI IN', direction: 'in', signal: ['clock', 'midi'], clock: ['midi-din'] },
      ],
      capabilityEvidence: jackEvidence('VCO A · SAW', 'VCF · IN', 'MIDI IN'),
    })
    const parsed = DeviceSchema.safeParse(ok)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it("allows a jack to carry 'clock' with no transport established yet (§3.3)", () => {
    // The converse is deliberately unchecked. A box can have a socket somebody has read as a
    // clock output while the transport question is still open — the Cascadia's `MIDI CLK` is
    // exactly that today — and refusing it would push authors into inventing a transport.
    const noTransport = patchable({
      jacks: [
        { id: 'VCO A · SAW', direction: 'out', signal: ['audio'] },
        { id: 'VCF · IN', direction: 'in', signal: ['audio'] },
        { id: 'MIDI CLK', direction: 'out', signal: ['clock'] },
      ],
      capabilityEvidence: jackEvidence('VCO A · SAW', 'VCF · IN', 'MIDI CLK'),
    })
    const parsed = DeviceSchema.safeParse(noTransport)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('requires every declared jack to carry evidence, `false` included (§2.6/#22)', () => {
    // The claim did not become optional when it stopped being a field. A jack whose page nobody
    // has found is a real state and says so; a jack with no entry at all is an omission, and the
    // check moved from `JackSpecSchema` to `DeviceSchema` because that is where the map is in
    // scope. Both halves are asserted here, because only the second one is new.
    expect(
      DeviceSchema.safeParse(
        patchable({
          capabilityEvidence: {
            [jackFact('VCO A · SAW')]: false,
            [jackFact('VCF · IN')]: JACK_CITE,
          },
        }),
      ).success,
    ).toBe(true)

    const missing = DeviceSchema.safeParse(
      patchable({ capabilityEvidence: { [jackFact('VCF · IN')]: JACK_CITE } }),
    )
    expect(missing.success).toBe(false)
    expect(JSON.stringify(missing.success ? [] : missing.error.issues)).toContain(
      'has no capabilityEvidence entry',
    )

    // And a jack list with no map at all, which is the shape every manifest had before #22.
    expect(DeviceSchema.safeParse(patchable({ capabilityEvidence: undefined })).success).toBe(false)
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

  it('accepts io.main: none, for a box with no audio path (§2.3)', () => {
    // Adding this dropped an assumption true of every device in the library until now: that
    // everything has an audio output. `mono` on a box with none would make both renderers print
    // a main out that does not exist and make the rack draw a jack nobody can plug into.
    const silent = device({ io: { main: 'none', individualOuts: 0, audioIn: false, usbAudio: false } })
    const parsed = DeviceSchema.safeParse(silent)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    // `none` says there is no *main* bus, not that there is no audio anywhere: the combination
    // with individual outs, an input or USB audio is legal and consumers have to handle it.
    expect(
      DeviceSchema.safeParse(
        device({ io: { main: 'none', individualOuts: 2, audioIn: true, usbAudio: true } }),
      ).success,
    ).toBe(true)
    // And the closed list is still closed.
    expect(
      DeviceSchema.safeParse(
        device({ io: { main: 'silent' as never, individualOuts: 0, audioIn: false, usbAudio: false } }),
      ).success,
    ).toBe(false)
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

  it('rejects an articulation on a lane the box has and a set cannot carry (§3/#514)', () => {
    // The lane is real — it is in `perStep`, so the check above passes — and an `ArticulationEntry`
    // still cannot say it: one name and one scalar is not a destination, an evaluation order or a
    // filename. Eight device folders drew this boundary beside their manifest and nothing enforced
    // it; the Deluge, which drew it nowhere, shipped `{ automation: 1 }` twice (#514, #452).
    const features = { perStep: ['velocity', 'automation'], perStepUnreachable: ['automation'] }
    const bad = device({
      features,
      recipes: [recipe({ articulation: [{ slot: 'accent', set: { automation: 1 } }] })],
    })
    expect(DeviceSchema.safeParse(bad).success).toBe(false)

    // The same recipe against the same box, with the boundary undeclared: this is what every
    // manifest allowed before #514.
    const permissive = device({
      features: { perStep: ['velocity', 'automation'] },
      recipes: [recipe({ articulation: [{ slot: 'accent', set: { automation: 1 } }] })],
    })
    expect(DeviceSchema.safeParse(permissive).success).toBe(true)

    // A lane it does not name is untouched.
    const good = device({
      features,
      recipes: [recipe({ articulation: [{ slot: 'accent', set: { velocity: 110 } }] })],
    })
    expect(DeviceSchema.safeParse(good).success).toBe(true)
  })

  it('refuses an unreachable lane the device never declared it has (§3/#514)', () => {
    // Naming it only in `perStepUnreachable` excludes nothing and reads as if it did — and it
    // would be the manifest saying the sequencer does something and does not do it at once.
    const bad = device({ features: { perStep: ['velocity'], perStepUnreachable: ['automation'] } })
    expect(DeviceSchema.safeParse(bad).success).toBe(false)
  })

  it('derives the articulable lanes from the two lists, in declaration order (§3/#514)', () => {
    const parsed = DeviceSchema.parse(
      device({
        features: {
          perStep: ['velocity', 'automation', 'probability', 'condition'],
          perStepUnreachable: ['automation', 'condition'],
        },
      }),
    )
    expect(articulablePerStep(parsed)).toEqual(['velocity', 'probability'])

    // Omitting `perStepUnreachable` declares nothing unreachable, so nothing is excluded. A box
    // with no per-step lanes at all articulates nothing.
    const plain = DeviceSchema.parse(device({ features: { perStep: ['velocity', 'probability'] } }))
    expect(articulablePerStep(plain)).toEqual(['velocity', 'probability'])
    const noLanes = device({ features: {}, recipes: [recipe({ articulation: undefined })] })
    expect(articulablePerStep(DeviceSchema.parse(noLanes))).toEqual([])
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

  /**
   * §3/#516. **`soundSetup` is checked the way `sourceAudio` is**, because the two fields are
   * peers: both are a recipe reaching into a device-level table, and a jog that names no entry
   * prints nothing at the machine while every test in the folder still passes.
   */
  it('rejects a built-in-sound hint the device never authored', () => {
    const base = {
      sound: 'One of the ten supertones',
      prep: { text: 'Hold SOUND and press dot', verified: { kind: 'manual', source: 'p.8' } },
    }
    expect(
      DeviceSchema.safeParse(
        device({ recipes: [recipe({ soundSetup: { ...base, hint: 'apply-cycle' } as never })] }),
      ).success,
    ).toBe(true)
    const bad = DeviceSchema.safeParse(
      device({ recipes: [recipe({ soundSetup: { ...base, hint: 'press-it' } as never })] }),
    )
    expect(bad.success).toBe(false)
    expect(JSON.stringify(bad.success ? [] : bad.error.issues)).toContain(
      "soundSetup references hint 'press-it'",
    )
  })

  /**
   * §3/#516. **Two claims, and the schema holds both apart.** `sound` is the choice and carries no
   * citation slot at all — no page narrows the ten supertones, which is exactly why the box is not
   * `enumerable` (§2.6). `prep` is the manual's procedure, is **required**, and `verified` inside
   * it is required rather than inherited from the recipe, the shape `SourceAudio.prep` and a
   * `JackSpec` carry.
   *
   * `prep` is required where `SourceAudio`'s is optional, and the asymmetry is the point of the
   * field: it exists to record a gesture. A built-in sound with no way in is a recipe, not a
   * setup, and a `sound` line alone would be an uncited sentence with nothing behind it.
   */
  it('keeps the choice uncited and the procedure cited, and requires the procedure', () => {
    const cite: Verified = { kind: 'manual', source: 'Guide 8.1.1' }
    const ok = { sound: 'One of the ten supertones', prep: { text: 'Hold SOUND', verified: cite } }
    expect(RecipeSchema.safeParse(recipe({ soundSetup: ok })).success).toBe(true)
    // `false` is a real state — somebody worked the gesture out and no page prints it.
    expect(
      RecipeSchema.safeParse(
        recipe({ soundSetup: { ...ok, prep: { text: 'Hold SOUND', verified: false } } }),
      ).success,
    ).toBe(true)

    // A choice with no way in is not a setup.
    expect(
      RecipeSchema.safeParse(recipe({ soundSetup: { sound: 'A siren' } as never })).success,
    ).toBe(false)
    // A procedure with no citation, and one with no choice above it.
    expect(
      RecipeSchema.safeParse(
        recipe({ soundSetup: { ...ok, prep: { text: 'Hold SOUND' } } as never }),
      ).success,
    ).toBe(false)
    expect(
      RecipeSchema.safeParse(
        recipe({ soundSetup: { prep: { text: 'Hold SOUND', verified: cite } } as never }),
      ).success,
    ).toBe(false)
    expect(RecipeSchema.safeParse(recipe({ soundSetup: { ...ok, sound: '' } })).success).toBe(false)
    // And no citation may be smuggled onto the choice, which is the whole of what uncited means.
    expect(
      RecipeSchema.safeParse(recipe({ soundSetup: { ...ok, verified: cite } as never })).success,
    ).toBe(false)
  })

  /**
   * §3/#516. **A voice generates the sound or it does not**, so the two fields are mutually
   * exclusive and the schema is where that is settled.
   *
   * It is a schema rule rather than a library convention because the rules written over
   * `sourceAudio` read it as a fact about the voice. #506's source-length sweep demands a duration
   * of every file-fed recipe on a held role; the EP-40's supertone recipes matched while loading
   * nothing, and #517 shipped an exclusion list of one to get past it. That list is gone, and this
   * refusal is what replaced it — `test/source-length.test.ts` asks one question of one field and
   * this guarantees the answer means what it says.
   */
  it('refuses a recipe that claims both a file and a built-in sound', () => {
    const both = RecipeSchema.safeParse(
      recipe({
        sourceAudio: { need: 'A sustained tonal source, two seconds or longer' },
        soundSetup: {
          sound: 'One of the ten supertones',
          prep: { text: 'Hold SOUND', verified: { kind: 'manual', source: 'p.8' } },
        },
      }),
    )
    expect(both.success).toBe(false)
    expect(JSON.stringify(both.success ? [] : both.error.issues)).toContain(
      'never both',
    )
    // Either alone is fine, so the refusal is about the pair rather than about the field.
    expect(
      RecipeSchema.safeParse(recipe({ sourceAudio: { need: 'A short, dark kick with no tail' } }))
        .success,
    ).toBe(true)
    expect(
      RecipeSchema.safeParse(
        recipe({
          soundSetup: {
            sound: 'One of the ten supertones',
            prep: { text: 'Hold SOUND', verified: { kind: 'manual', source: 'p.8' } },
          },
        }),
      ).success,
    ).toBe(true)
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
