import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  moodState,
  resolveParams,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import {
  DUPLICATED_SYNTH_RECIPES,
  SYNTH_SLOTS,
  device,
} from '../lib/devices/polyend-tracker-mini/index'
import { auditDevice } from '../scripts/audit-verified'

const CITE_PREFIX = 'Polyend Tracker Mini Manual 2.2.1b, p.'

function pool(id: string) {
  const voice = device.voices.find((v) => v.id === id)
  if (voice === undefined || voice.kind !== 'pool') throw new Error(`no pool '${id}'`)
  return voice
}

function recipesOn(voice: string): Recipe[] {
  return device.recipes.filter((r) => r.voice === voice)
}

/** Everything a twin must carry identically. `id`, `voice` and `routing` are what may differ. */
function twinShape(r: Recipe) {
  const { id: _id, voice: _voice, routing: _routing, ...rest } = r
  return rest
}

describe('Tracker Mini manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  // -------------------------------------------------------------------------
  // The two pools — the reason this device is in the build (§2.1)
  // -------------------------------------------------------------------------

  it('declares 16 tracks as two pools of 8, not 8 tracks (p.22)', () => {
    expect(device.voices).toHaveLength(2)
    expect(device.voices.map((v) => v.kind)).toEqual(['pool', 'pool'])
    expect(device.voices.map((v) => v.id)).toEqual(['track-sample', 'track-synth'])
    expect(pool('track-sample').count).toBe(8)
    expect(pool('track-synth').count).toBe(8)

    // One track sounds one voice (p.104). The synth slots' 8-voice budget is a different
    // quantity and must not leak in here (§12.4: polyphony counts notes, never roles).
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
  })

  it('expands to 16 assignables in two pool namespaces (§2.2)', () => {
    const assignables = expand(device)
    expect(assignables).toHaveLength(16)

    expect(assignables.filter((a) => a.poolId === 'track-sample').map((a) => a.voiceId)).toEqual([
      'track-sample-1', 'track-sample-2', 'track-sample-3', 'track-sample-4',
      'track-sample-5', 'track-sample-6', 'track-sample-7', 'track-sample-8',
    ])
    expect(assignables.filter((a) => a.poolId === 'track-synth').map((a) => a.voiceId)).toEqual([
      'track-synth-1', 'track-synth-2', 'track-synth-3', 'track-synth-4',
      'track-synth-5', 'track-synth-6', 'track-synth-7', 'track-synth-8',
    ])
    // Every one carries an ordinal and its pool id, so occupancy and recipe lookup stay apart.
    expect(assignables.every((a) => a.ordinal !== undefined && a.poolId !== undefined)).toBe(true)
  })

  it('gives the two pools different roles, the synth pool a strict subset (p.22)', () => {
    const samples = new Set<string>(pool('track-sample').roles)
    const synths = new Set<string>(pool('track-synth').roles)

    // Tracks 1-8 take sample instruments, synths or MIDI: anything at all.
    expect(samples.size).toBe(ROLES.length)
    // Tracks 9-16 take synths and MIDI only. Strictly fewer, and strictly contained.
    expect(synths.size).toBeLessThan(samples.size)
    expect([...synths].filter((r) => !samples.has(r))).toEqual([])

    // Exactly one role needs recorded audio and so cannot exist on tracks 9-16. Everything
    // else, the whole drum kit included, is reachable from the five synth engines (PERC is a
    // drum machine in a synth slot, p.146). A role is what this box sounds *itself*: a MIDI
    // track addresses another device, which carries its own assignables.
    expect([...samples].filter((r) => !synths.has(r))).toEqual(['vox-chop'])
  })

  // -------------------------------------------------------------------------
  // Pool-keyed recipe lookup (§2.2)
  // -------------------------------------------------------------------------

  it('addresses every recipe to a pool id, never to an expanded track', () => {
    const poolIds = new Set(device.voices.map((v) => v.id))
    for (const recipe of device.recipes) {
      expect(poolIds, recipe.id).toContain(recipe.voice)
    }
    // Both pools are actually reached; a pool with no recipe would be a silent hole.
    expect(recipesOn('track-sample').length).toBeGreaterThan(0)
    expect(recipesOn('track-synth').length).toBeGreaterThan(0)
  })

  it('resolves one authored recipe from every ordinal in its pool (§2.2)', () => {
    // The point of keying on `poolId ?? voiceId`: one recipe serves all eight tracks. If this
    // broke, pools would just relocate the duplication instead of removing it.
    const assignables = expand(device)
    for (const recipe of device.recipes) {
      const members = assignables.filter((a) => a.poolId === recipe.voice)
      expect(members, recipe.id).toHaveLength(8)
      for (const member of members) {
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character)
        const where = `${recipe.id} on ${member.voiceId}`
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  it('keeps every sample-based recipe on the sample pool', () => {
    // A sample-based recipe is one that sets PLAY MODE — the parameter that only exists for a
    // sample instrument (p.127). Identified by what the recipe actually authors, not by whether
    // the resolver happens to substitute something else on the other pool.
    const sampleBased = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some((p) => p.name === 'PLAY MODE'),
    )
    expect(sampleBased.length).toBeGreaterThan(0)
    for (const recipe of sampleBased) {
      expect(recipe.voice, `${recipe.id} sets PLAY MODE`).toBe('track-sample')
    }

    // And the converse: nothing on tracks 9-16 sets it, because those tracks cannot load a
    // sample instrument at all (p.22).
    for (const recipe of recipesOn('track-synth')) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      expect(names, recipe.id).not.toContain('PLAY MODE')
      expect(names, recipe.id).toContain('MODEL')
    }
  })

  // -------------------------------------------------------------------------
  // The cross-pool duplication — step 4's cost, pinned
  // -------------------------------------------------------------------------

  it('duplicates every synth recipe across both pools, and counts the cost', () => {
    const twinned = recipesOn('track-synth')
    expect(twinned).toHaveLength(DUPLICATED_SYNTH_RECIPES)

    // 3 recipes authored once and carried twice: exactly what an engine allowing a recipe to
    // name several pools would save today. If this number grows, the schema change gets
    // cheaper — which is the whole reason it is asserted rather than described.
    expect(DUPLICATED_SYNTH_RECIPES).toBe(3)

    for (const synthRecipe of twinned) {
      const twin = recipesOn('track-sample').find(
        (r) => r.role === synthRecipe.role && r.character === synthRecipe.character,
      )
      expect(twin, `${synthRecipe.id} has no track-sample twin`).toBeDefined()
      // Identical but for id, voice and routing — the twins cannot drift apart.
      expect(twinShape(twin as Recipe)).toEqual(twinShape(synthRecipe))
      expect((twin as Recipe).id).not.toBe(synthRecipe.id)
      expect((twin as Recipe).routing).not.toBe(synthRecipe.routing)
    }
  })

  it('keeps sample-only step FX off the synth pool', () => {
    // `reverse-sample` (p.196), like Position and Slice, exists only for a sample instrument.
    // Nothing in the schema knows that, so it is asserted here.
    const SAMPLE_ONLY_FX = ['reverse-sample']
    for (const recipe of recipesOn('track-synth')) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(SAMPLE_ONLY_FX, `${recipe.id} sets ${key}`).not.toContain(key)
        }
      }
    }
    // And it is genuinely used somewhere, or the assertion above is testing nothing.
    const usedOnSamples = new Set(
      recipesOn('track-sample').flatMap((r) =>
        (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
      ),
    )
    for (const key of SAMPLE_ONLY_FX) expect(usedOnSamples).toContain(key)
  })

  // -------------------------------------------------------------------------
  // Content and citation discipline (§3.1, §3.2)
  // -------------------------------------------------------------------------

  it('carries 15-20 recipes on distinct (role, character, voice) triples (§3)', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)

    const triples = device.recipes.map((r) => `${r.role}\u0000${r.character}\u0000${r.voice}`)
    expect(new Set(triples).size).toBe(triples.length)

    // Two recipes sharing (role, character) on *different* pools is the whole point, and is
    // exactly what the old per-device key rejected.
    const pairs = device.recipes.map((r) => `${r.role}\u0000${r.character}`)
    expect(new Set(pairs).size).toBeLessThan(pairs.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        const where = `${recipe.id} / ${param.name}`
        // A documented bound for CUTOFF is not a citation for "CUTOFF sits at 46 for a dark
        // kick". Written at every site rather than inherited, so a later citation on the
        // recipe cannot promote values nobody checked.
        expect(param.verified, where).toBe(false)
        expect(param.range.verified, where).toMatchObject({
          kind: 'manual',
          source: expect.stringContaining(CITE_PREFIX),
        })
        // A step is a *granularity*, not a claim, so it needs no citation — but it must not
        // appear on a parameter whose grid nobody has a reason to believe. Seconds are the
        // one case here: the manual prints their bounds to two decimals (p.126).
        if (param.unit === 'Sec') expect(param.step, where).toBe(0.01)
        else expect(param.step, where).toBeUndefined()
      }

      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'enum') continue
        const where = `${recipe.id} / ${param.name}`
        // The two gates, on an enum. The option set is legality and is cited; the selection is
        // authority and is taste. Asserting them apart is what stops the citation drifting back
        // onto the param, where it would claim the choice was checked.
        expect(param.options.verified, where).toMatchObject({
          kind: 'manual',
          source: expect.stringContaining(CITE_PREFIX),
        })
        expect(param.verified, where).toBe(false)
        expect(param.options.values, where).toContain(param.value)
        expect(param.options.values.length, where).toBeGreaterThan(1)
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
    // No point is cited at all, enums included: `verified` on a param is a claim about the
    // selected value, and every selection here is taste. The option sets carry their own
    // citations, asserted below.
    expect(counts.manualPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
  })

  it('cites a page that exists in the manual, and never page 0', () => {
    const legality = device.recipes.flatMap((r) =>
      (r.params as AuthoredParam[]).flatMap((p) =>
        p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : [],
      ),
    )
    const pages = legality
      .filter((v) => v !== undefined && v !== false)
      .map((v) => Number((v as { source: string }).source.split('p.')[1]))
    expect(pages.length).toBeGreaterThan(0)
    for (const page of pages) {
      expect(Number.isInteger(page)).toBe(true)
      // The manual runs to p.343; the parameter chapters start at p.113.
      expect(page).toBeGreaterThanOrEqual(13)
      expect(page).toBeLessThanOrEqual(343)
    }
  })

  it('never authors Volume, whose printed lower bound is -inf dB (p.116)', () => {
    // The range is real and the manual states it; it just is not a finite number, and inventing
    // a floor to make it fit would be an invented claim (invariant 5).
    for (const recipe of device.recipes) {
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        expect(Number.isFinite(param.range.min), `${recipe.id} / ${param.name}`).toBe(true)
        expect(Number.isFinite(param.range.max), `${recipe.id} / ${param.name}`).toBe(true)
        expect(param.name, recipe.id).not.toBe('VOLUME')
      }
    }
  })

  it('authors at most three distinct synth recipes, one per project synth slot', () => {
    // **The project has three synth slots (p.32, p.146), shared across all sixteen tracks.**
    // The limit is on distinct recipes, not on tracks: the same patch on several tracks still
    // occupies one slot, so three recipes spread over sixteen tracks is realisable, while a
    // fourth distinct synth recipe describes a state the box cannot hold — every guide the
    // resolver can produce from it would be unbuildable.
    //
    // The engine has no concept of a device-global shared resource, so this is enforced at
    // authoring time, where it is cheap and checkable, rather than at resolve time.
    const distinct = new Set(
      device.recipes
        .filter((r) => (r.params as AuthoredParam[]).some((p) => p.name === 'MODEL'))
        .map((r) => `${r.role} ${r.character}`),
    )
    expect(SYNTH_SLOTS).toBe(3)
    expect(distinct.size).toBeLessThanOrEqual(SYNTH_SLOTS)

    // MODEL still offers all five engines. The options are what the box has; narrowing them to
    // what happens to be authored would hide the rest of the device.
    for (const recipe of device.recipes) {
      const model = (recipe.params as AuthoredParam[]).find((p) => p.name === 'MODEL')
      if (model === undefined) continue
      if (model.kind !== 'enum') throw new Error(`${recipe.id}: MODEL should be an enum`)
      expect(model.options.values).toEqual(['ACD', 'FAT', 'VAP', 'WTFM', 'PERC'])
    }

    // `acid` is legal on both pools and authored on neither, because the third slot went
    // elsewhere — a gap shown, not filled (§5).
    expect(new Set<string>(pool('track-sample').roles)).toContain('acid')
    expect(device.recipes.some((r) => r.role === 'acid')).toBe(false)
  })

  it('addresses steps only by PatternSlot, and uses every per-step feature it declares', () => {
    // Narrowed to the articulation, which is the only place an absolute index could appear:
    // `AuthoredNumericParam.step` is a knob's *granularity* and has nothing to do with a
    // sequencer step, so scanning the whole manifest for the word caught the wrong thing.
    const articulation = JSON.stringify(device.recipes.map((r) => r.articulation ?? []))
    expect(articulation).not.toContain('"step"')
    expect(articulation).not.toContain('"hits"')
    expect(JSON.stringify(device)).not.toContain('"hits"')

    const perStep = device.features?.perStep ?? []
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect([...used].filter((k) => !perStep.includes(k))).toEqual([])
    expect(perStep.filter((k) => !used.has(k))).toEqual([])
  })

  it('gives every recipe something to set', () => {
    for (const recipe of device.recipes) {
      const numerics = (recipe.params as AuthoredParam[]).filter((p) => p.kind === 'numeric')
      expect(numerics.length, recipe.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('declines the swing axis by simply having no param that declares it (§6)', () => {
    // There is no capability check and must not be one: swing on this box is a step FX and a
    // pattern property, not an instrument parameter, so no param offers the axis.
    const axes = new Set(
      device.recipes.flatMap((r) =>
        (r.params as AuthoredParam[]).flatMap((p) =>
          p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [],
        ),
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space'])
  })
})

// ---------------------------------------------------------------------------
// Seconds are authored and moved in hundredths
// ---------------------------------------------------------------------------

describe('time parameters (§6.1)', () => {
  function numerics(): AuthoredParam[] {
    return device.recipes
      .flatMap((r) => r.params as AuthoredParam[])
      .filter((p) => p.kind === 'numeric')
  }

  it('declares a hundredth step on every parameter measured in seconds', () => {
    const seconds = numerics().filter((p) => p.kind === 'numeric' && p.unit === 'Sec')
    expect(seconds.length).toBeGreaterThan(0)
    for (const p of seconds) {
      // The manual prints these bounds to two decimals (p.126), so a hundredth is the grid the
      // box works on. Without it §6.1 rounds to the default step of 1 — whole seconds.
      expect(p.kind === 'numeric' && p.step, p.name).toBe(0.01)
    }
  })

  it('moves a decay by hundredths rather than rounding it to a whole second', () => {
    const kick = device.recipes.find((r) => r.id === 'tm-kick-hard') as Recipe
    const at = (density: number) =>
      resolveParams(kick, moodState({ density })).find((p) => p.name === 'ENV DECAY')?.value

    // Authored 0.28, moved -0.09 at full density. A step of 1 would give 0 at every setting.
    expect(at(0)).toBe(0.37)
    expect(at(50)).toBe(0.28)
    expect(at(100)).toBe(0.19)
  })

  it('leaves no authored value unreachable on its own declared grid', () => {
    // A step the authored point does not sit on means the value cannot be dialled in as
    // written, which is an authoring error rather than a resolver one.
    for (const p of numerics()) {
      if (p.kind !== 'numeric' || p.step === undefined) continue
      const steps = p.value / p.step
      expect(Math.abs(steps - Math.round(steps)), `${p.name} ${p.value} on step ${p.step}`)
        .toBeLessThan(1e-9)
    }
  })
})
