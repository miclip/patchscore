import { describe, expect, expectTypeOf, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'
import {
  DENSITY_BANDS,
  MAX_SUBSTITUTION_DISTANCE_SQ,
  MoodStateSchema,
  NEUTRAL_MOOD,
  assignableKey,
  bandFallbackOrder,
  bandFor,
  bindArticulation,
  characterDistanceSq,
  compareCodeUnits,
  densityShift,
  energyBand,
  expand,
  expandAll,
  inheritVerified,
  moodState,
  nearestCharacter,
  patternBand,
  recipeVoiceKey,
  resolveCharacter,
  resolveParam,
  resolveParams,
  resolvePatch,
  resolveRecipe,
  scoreRecipes,
  sectionsFor,
  selectPattern,
  selectPatterns,
  type Assignable,
  type AuthoredEnumParam,
  type AuthoredTextParam,
  type Cite,
  type MoodState,
  type Pattern,
  type RoleRequest,
  type SectionName,
  type Template,
} from '../lib/core/index'
import { device, numericParam, poolDevice, recipe, template } from './fixtures'

const MANUAL: Cite = { kind: 'manual', source: 'fixture manual p.42' }
const OBSERVED: Cite = { kind: 'observed', source: 'fixture unit, firmware 1.11' }

function assignableFor(dev: ReturnType<typeof device>, voiceId: string): Assignable {
  const found = expand(dev).find((a) => a.voiceId === voiceId)
  if (found === undefined) throw new Error(`no assignable '${voiceId}' in ${dev.id}`)
  return found
}

// ---------------------------------------------------------------------------
// §6 Mood
// ---------------------------------------------------------------------------

describe('MoodState (§6)', () => {
  it('carries all five axes, always', () => {
    expect(NEUTRAL_MOOD).toEqual({ darkness: 50, density: 50, grit: 50, swing: 50, space: 50 })
    // A partial state would make "the knob is centred" and "the knob was not sent"
    // indistinguishable to §6.1's arithmetic.
    expect(MoodStateSchema.safeParse({ darkness: 50, density: 50, grit: 50, swing: 50 }).success)
      .toBe(false)
    expect(MoodStateSchema.safeParse({ ...NEUTRAL_MOOD, warmth: 50 }).success).toBe(false)
    expect(MoodStateSchema.safeParse({ ...NEUTRAL_MOOD, grit: 101 }).success).toBe(false)
    expect(MoodStateSchema.safeParse({ ...NEUTRAL_MOOD, grit: -1 }).success).toBe(false)
    expect(MoodStateSchema.safeParse(NEUTRAL_MOOD).success).toBe(true)
  })

  it('is frozen, so one caller cannot re-centre the neutral for everyone', () => {
    expect(() => {
      ;(NEUTRAL_MOOD as MoodState).grit = 90
    }).toThrow()
  })
})

// ---------------------------------------------------------------------------
// §7.2 Ordering
// ---------------------------------------------------------------------------

describe('string ordering (§7.2)', () => {
  it('compares by UTF-16 code unit', () => {
    // ICU collation puts 'a' before 'B'; code units do not. That divergence is exactly the
    // silent cross-platform failure §7.2 exists to prevent.
    expect(compareCodeUnits('B', 'a')).toBe(-1)
    expect(compareCodeUnits('a', 'B')).toBe(1)
    expect(compareCodeUnits('a', 'a')).toBe(0)
    expect(['a', 'B', 'A', 'b'].sort(compareCodeUnits)).toEqual(['A', 'B', 'a', 'b'])
  })

})

// ---------------------------------------------------------------------------
// §2.2 / §7 step 3 — expansion
// ---------------------------------------------------------------------------

describe('expand (§2.2, §7 step 3)', () => {
  it('flattens fixed voices one-for-one', () => {
    const assignables = expand(device())
    expect(assignables.map((a) => a.voiceId)).toEqual(['bd', 'lt'])
    expect(assignables[0]).toEqual({
      deviceId: 'fixture-drum',
      voiceId: 'bd',
      label: 'BD',
      roles: ['kick'],
      polyphony: 1,
    })
    // No pool identity on a fixed voice, so `poolId ?? voiceId` falls through to the voice.
    expect(assignables[0]?.poolId).toBeUndefined()
    expect(assignables[0]?.ordinal).toBeUndefined()
  })

  it('folds the pool ordinal into voiceId and label, keeping poolId for recipe lookup', () => {
    const assignables = expand(poolDevice())
    expect(assignables).toHaveLength(8)
    expect(assignables.map((a) => a.voiceId)).toEqual([
      'track-1', 'track-2', 'track-3', 'track-4', 'track-5', 'track-6', 'track-7', 'track-8',
    ])
    expect(assignables[2]).toEqual({
      deviceId: 'fixture-tracker',
      voiceId: 'track-3',
      poolId: 'track',
      label: 'Track 3',
      ordinal: 3,
      roles: ['kick', 'sub', 'pad', 'lead'],
      polyphony: 4,
    })
  })

  it('gives a device with no voices no assignables, which is not an error (§2.4)', () => {
    expect(expand(device({ id: 'fixture-mixer', kind: 'mixer-recorder', voices: [], recipes: [] })))
      .toEqual([])
  })

  it('keys occupancy on device/voice, ordinal already folded in (§4.2)', () => {
    expect(assignableKey(assignableFor(device(), 'bd'))).toBe('fixture-drum/bd')
    expect(assignableKey(assignableFor(poolDevice(), 'track-3'))).toBe('fixture-tracker/track-3')
  })

  it('keys recipe lookup on poolId ?? voiceId, so one pool recipe serves every ordinal (§2.2)', () => {
    expect(recipeVoiceKey(assignableFor(device(), 'bd'))).toBe('bd')
    for (const a of expand(poolDevice())) expect(recipeVoiceKey(a)).toBe('track')
  })
})

describe('expand purity (obligation 6, §4.2)', () => {
  it('returns the same assignables for the same device across two resolves', () => {
    const dev = device()
    expect(expand(dev)).toBe(expand(dev))
  })

  it('returns deep-equal assignables for two structurally equal devices', () => {
    // Two guides open in two tabs, each with its own copy of the manifest: the expansion is a
    // pure function of device data and must not vary with object identity.
    expect(expand(device())).toEqual(expand(device()))
  })

  it('refuses per-guide state on an Assignable - occupancy lives in Occupancy', () => {
    const assignable = assignableFor(device(), 'bd')
    expect(Object.isFrozen(assignable)).toBe(true)
    expect(() => {
      ;(assignable as unknown as Record<string, unknown>)['occupancy'] = new Map()
    }).toThrow()
    expect(() => {
      ;(assignable as unknown as Record<string, unknown>)['label'] = 'mutated'
    }).toThrow()
    // A later resolve must not see the attempted mutation.
    expect(assignableFor(device(), 'bd').label).toBe('BD')
  })

  it('expands a rig in device order, then authored voice order', () => {
    const all = expandAll([device(), poolDevice()])
    expect(all.map((a) => `${a.deviceId}/${a.voiceId}`).slice(0, 4)).toEqual([
      'fixture-drum/bd',
      'fixture-drum/lt',
      'fixture-tracker/track-1',
      'fixture-tracker/track-2',
    ])
    expect(all).toHaveLength(10)
    expect(Object.isFrozen(all)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §3.4 / §6.2 — character
// ---------------------------------------------------------------------------

describe('character geometry (§3.4)', () => {
  it('makes an orthogonal character substitutable and an opposite refusable', () => {
    expect(characterDistanceSq('hard', 'hard')).toBe(0)
    // sqrt(2) in §3.4's units: orthogonal, acceptable.
    expect(characterDistanceSq('hard', 'dark')).toBe(2)
    // 2 in §3.4's units: the direct opposite, refused.
    expect(characterDistanceSq('hard', 'soft')).toBe(4)
    expect(characterDistanceSq('clean', 'dirty')).toBe(4)
    expect(characterDistanceSq('hard', 'dark')).toBeLessThan(MAX_SUBSTITUTION_DISTANCE_SQ)
    expect(characterDistanceSq('hard', 'soft')).not.toBeLessThan(MAX_SUBSTITUTION_DISTANCE_SQ)
  })

  it('breaks a tie by UTF-16 code unit, never by locale (§7.2)', () => {
    // The origin is equidistant from all six. The winner is the first by code unit.
    expect(nearestCharacter({ force: 0, tone: 0, grit: 0 })).toBe('bright')
    // 'dark' before 'dirty' by code unit ('a' < 'i'), and both are equidistant from here.
    expect(nearestCharacter({ force: 0, tone: -0.5, grit: 0.5 })).toBe('dark')
  })
})

describe('resolveCharacter (§6.2)', () => {
  const table: [string, ReturnType<typeof moodState>, Parameters<typeof resolveCharacter>[0], string][] = [
    ['neutral leaves the template pinning alone', moodState(), 'hard', 'hard'],
    ['neutral leaves a tonal pinning alone', moodState(), 'bright', 'bright'],
    ['a push short of the pinning does not flip it', moodState({ grit: 99 }), 'hard', 'hard'],
    ['full grit flips hard to dirty', moodState({ grit: 100 }), 'hard', 'dirty'],
    ['full cleanliness flips hard to clean', moodState({ grit: 0 }), 'hard', 'clean'],
    ['full darkness cancels a bright pinning back to the origin', moodState({ darkness: 100 }), 'bright', 'bright'],
    ['darkness deepens an already dark pinning', moodState({ darkness: 100 }), 'dark', 'dark'],
    ['light flips a dark pinning to bright', moodState({ darkness: 0 }), 'dark', 'bright'],
    // {1,-1,1} is equidistant from hard, dark and dirty; the code-unit tie-break picks dark.
    ['grit and darkness together still land on one character', moodState({ darkness: 100, grit: 100 }), 'hard', 'dark'],
    ['axes the geometry does not read are inert', moodState({ swing: 100, space: 0, density: 3 }), 'soft', 'soft'],
  ]

  for (const [name, state, base, expected] of table) {
    it(name, () => {
      expect(resolveCharacter(base, state)).toBe(expected)
    })
  }

  it('is exactly §6.2 - darkness pushes tone down, grit pushes grit up', () => {
    // 'bright' at full darkness lands on the origin ({0,1,0} + {0,-1,0}), where the UTF-16
    // tie-break decides and 'bright' happens to win its own tie. Pinned deliberately: it is
    // the case that proves the tie-break is what resolves the flip, not an accident.
    expect(resolveCharacter('bright', moodState({ darkness: 100 }))).toBe('bright')
    // One notch short of full, 'bright' is unambiguously still nearest to itself.
    expect(resolveCharacter('bright', moodState({ darkness: 99 }))).toBe('bright')
  })
})

// ---------------------------------------------------------------------------
// §6.3 / §4.3 — density and pattern selection
// ---------------------------------------------------------------------------

describe('energyBand (§6.3)', () => {
  it('has fixed edges, inclusive-below and exclusive-above', () => {
    expect([0, 0.24, 0.25, 0.49, 0.5, 0.74, 0.75, 0.99].map(energyBand)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ])
  })

  it('keeps full energy inside the four bands that exist', () => {
    // floor(1 * 4) is 4, which is not a band. The min is load-bearing, not belt-and-braces.
    expect(energyBand(1)).toBe(3)
  })
})

describe('densityShift (§6.3)', () => {
  it('is three zones - sparser, as authored, busier - not four bands', () => {
    expect([0, 24, 25, 49, 50, 74, 75, 100].map(densityShift)).toEqual([
      -1, -1, 0, 0, 0, 0, 1, 1,
    ])
  })
})

describe('patternBand (§6.3)', () => {
  it('takes the band from energy and leans it by density', () => {
    expect(patternBand(0.5, 50)).toBe(2)
    expect(patternBand(0.5, 0)).toBe(1)
    expect(patternBand(0.5, 100)).toBe(3)
  })

  it('clamps at both ends rather than asking for a band that does not exist', () => {
    expect(patternBand(0, 0)).toBe(0) // 0 - 1
    expect(patternBand(0, 100)).toBe(1)
    expect(patternBand(1, 50)).toBe(3)
    expect(patternBand(1, 100)).toBe(3) // 3 + 1
  })

  it('leans by at most one band, so the knob can never flatten the arrangement (§4.3)', () => {
    for (const density of [0, 24, 25, 49, 50, 74, 75, 100]) {
      const quiet = patternBand(0.1, density)
      const loud = patternBand(0.9, density)
      // The Drop is never sparser than the Intro, whatever the listener does to the knob.
      expect(loud, `d=${density}`).toBeGreaterThanOrEqual(quiet)
      expect(Math.abs(patternBand(0.5, density) - energyBand(0.5)), `d=${density}`).toBeLessThanOrEqual(1)
    }
  })
})

describe('bandFor (§6.3)', () => {
  it('reads energy from the named section, so one template spans several bands', () => {
    const t = template() // Intro 0.2, Build 0.5, Drop 0.9
    expect(bandFor(t, 'Intro', moodState())).toBe(0)
    expect(bandFor(t, 'Build', moodState())).toBe(2)
    expect(bandFor(t, 'Drop', moodState())).toBe(3)
  })

  it('throws for a section outside `structure` rather than inventing a band', () => {
    expect(() => bandFor(template(), 'Outro' as SectionName, moodState())).toThrow(/structure/)
  })
})

describe('bandFallbackOrder (§6.3)', () => {
  it('tries the band asked for, then the nearest lower, then the nearest higher', () => {
    expect(bandFallbackOrder(2)).toEqual([2, 1, 0, 3])
    expect(bandFallbackOrder(0)).toEqual([0, 1, 2, 3])
    expect(bandFallbackOrder(3)).toEqual([3, 2, 1, 0])
    expect(bandFallbackOrder(1)).toEqual([1, 0, 2, 3])
  })
})

describe('sectionsFor (§4.2)', () => {
  it('gives a continuous request every section, in structure order', () => {
    const request = template().roles.find((r) => r.id === 'r-kick')!
    expect(sectionsFor(request, template())).toEqual(['Intro', 'Build', 'Drop'])
  })

  it('gives a transient request only the sections it lists, still in structure order', () => {
    const request: RoleRequest = {
      id: 'r-riser',
      role: 'riser',
      priority: 4,
      character: 'bright',
      sustain: 'transient',
      // Authored out of structure order on purpose: the resolver must not inherit that order.
      sections: ['Drop', 'Intro'],
    }
    expect(sectionsFor(request, template())).toEqual(['Intro', 'Drop'])
  })
})

describe('selectPattern (§7 step 5, §6.3)', () => {
  const kick = template().roles.find((r) => r.id === 'r-kick')!

  function kickPattern(over: Partial<Pattern> = {}): Pattern {
    return {
      id: 'p-kick',
      forRole: 'kick',
      band: 2,
      length: 16,
      hits: [{ step: 1, slot: 'downbeat' }],
      ...over,
    }
  }

  it("selects the variant authored for the section's own band", () => {
    const t = template({
      patterns: [kickPattern({ id: 'p-b2', band: 2 }), kickPattern({ id: 'p-b3', band: 3 })],
    })
    // Drop is energy 0.9 -> band 3; density 60 is the neutral zone, so no lean.
    const selection = selectPattern(t, kick, 'Drop', moodState({ density: 60 }))
    expect(selection.outcome).toBe('exact')
    expect(selection).toMatchObject({ band: 3, usedBand: 3 })
    expect(selection.outcome !== 'none' && selection.pattern.id).toBe('p-b3')
  })

  it('gives one request different bands in different sections at one density (§6.3)', () => {
    const t = template({
      patterns: DENSITY_BANDS.map((band) => kickPattern({ id: `p-b${band}`, band })),
    })
    const at = (section: SectionName) => {
      const sel = selectPattern(t, kick, section, moodState())
      expect(sel.outcome, section).toBe('exact')
      return sel.outcome === 'none' ? -1 : sel.usedBand
    }
    // The whole point of the fix: energy 0.2 / 0.5 / 0.9 are three different bands, so the
    // Intro is not handed the Drop's variant.
    expect([at('Intro'), at('Build'), at('Drop')]).toEqual([0, 2, 3])
  })

  it('leans that band by density, one band and no further (§6.3)', () => {
    const t = template({
      patterns: DENSITY_BANDS.map((band) => kickPattern({ id: `p-b${band}`, band })),
    })
    const at = (density: number) => {
      const sel = selectPattern(t, kick, 'Build', moodState({ density }))
      return sel.outcome === 'none' ? -1 : sel.usedBand
    }
    // Build is energy 0.5 -> band 2.
    expect([at(0), at(24), at(25), at(74), at(75), at(100)]).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('falls back to the nearest lower band, and reports it (§6.3)', () => {
    const t = template({ patterns: [kickPattern({ id: 'p-b1', band: 1 })] })
    // Drop's band 3, leaned up and clamped back to 3.
    const selection = selectPattern(t, kick, 'Drop', moodState({ density: 100 }))
    expect(selection).toMatchObject({ outcome: 'fallback', band: 3, usedBand: 1 })
  })

  it('falls back upward only when there is nothing lower', () => {
    const t = template({ patterns: [kickPattern({ id: 'p-b3', band: 3 })] })
    // Intro's band 0, leaned down and clamped back to 0.
    const selection = selectPattern(t, kick, 'Intro', moodState({ density: 0 }))
    expect(selection).toMatchObject({ outcome: 'fallback', band: 0, usedBand: 3 })
  })

  it('omits the pattern rather than inventing one when the role has none (invariant 5)', () => {
    const t = template({ patterns: [kickPattern({ forRole: 'snare' })] })
    expect(selectPattern(t, kick, 'Drop', moodState())).toEqual({ outcome: 'none', band: 3 })
  })

  it('honours section eligibility, and an omitted `sections` means every section', () => {
    const t = template({
      patterns: [
        kickPattern({ id: 'p-drop', band: 3, sections: ['Drop'] }),
        kickPattern({ id: 'p-any', band: 1 }),
      ],
    })
    expect(selectPattern(t, kick, 'Drop', moodState({ density: 60 }))).toMatchObject({
      outcome: 'exact',
      usedBand: 3,
    })
    // Intro asks for band 0, and the band-3 variant is not eligible there anyway, so the
    // band-1 variant is used and reported.
    expect(selectPattern(t, kick, 'Intro', moodState({ density: 60 }))).toMatchObject({
      outcome: 'fallback',
      band: 0,
      usedBand: 1,
    })
  })

  it('picks deterministically among several variants in one band, and exposes the rest', () => {
    const t = template({
      patterns: [
        kickPattern({ id: 'p-zulu', band: 2 }),
        kickPattern({ id: 'p-alpha', band: 2 }),
      ],
    })
    const selection = selectPattern(t, kick, 'Build', moodState({ density: 60 }))
    expect(selection.outcome !== 'none' && selection.pattern.id).toBe('p-alpha')
    expect(selection.outcome !== 'none' && selection.candidates.map((p) => p.id)).toEqual([
      'p-alpha',
      'p-zulu',
    ])
  })

  it('never mutates hits - the knob selects a variant, it does not edit one (§4.3)', () => {
    const authored = kickPattern({
      id: 'p-b2',
      band: 2,
      hits: [{ step: 1, slot: 'downbeat' }, { step: 9, slot: 'accent', velocity: 110 }],
    })
    const t = template({ patterns: [authored] })
    for (const density of [0, 30, 60, 100]) {
      for (const section of ['Intro', 'Build', 'Drop'] as SectionName[]) {
        const selection = selectPattern(t, kick, section, moodState({ density }))
        expect(selection.outcome !== 'none' && selection.pattern.hits).toEqual(authored.hits)
      }
    }
  })

  it('is a pure function of template, request, section and mood', () => {
    const t = template({
      patterns: DENSITY_BANDS.map((band) => kickPattern({ id: `p-b${band}`, band })),
    })
    for (const section of ['Intro', 'Build', 'Drop'] as SectionName[]) {
      const once = selectPattern(t, kick, section, moodState({ density: 40 }))
      const twice = selectPattern(t, kick, section, moodState({ density: 40 }))
      expect(twice).toEqual(once)
    }
  })

  it('is independent of the rig - no Device can reach this decision (obligation 4)', () => {
    // Structural, not incidental: adding a device parameter breaks this test rather than
    // quietly making two users with different boxes get different rhythms.
    expectTypeOf<Parameters<typeof selectPattern>>().toEqualTypeOf<
      [Template, RoleRequest, SectionName, MoodState]
    >()
    expectTypeOf<Parameters<typeof selectPatterns>>().toEqualTypeOf<
      [Template, RoleRequest, MoodState]
    >()
  })

  it('selects once per section a request occupies', () => {
    const t = template({
      patterns: [
        kickPattern({ id: 'p-drop', band: 3, sections: ['Drop'] }),
        kickPattern({ id: 'p-any', band: 1 }),
      ],
    })
    const bySection = selectPatterns(t, kick, moodState({ density: 60 }))
    expect([...bySection.keys()]).toEqual(['Intro', 'Build', 'Drop'])
    expect(bySection.get('Drop')).toMatchObject({ band: 3, usedBand: 3 })
    expect(bySection.get('Build')).toMatchObject({ band: 2, usedBand: 1 })
    expect(bySection.get('Intro')).toMatchObject({ band: 0, usedBand: 1 })
  })
})

// ---------------------------------------------------------------------------
// §3.5 — recipe selection
// ---------------------------------------------------------------------------

describe('resolveRecipe (§3.5)', () => {
  const bd = assignableFor(device(), 'bd')

  it('reports an exact authored (role, character) as exact', () => {
    const dev = device({ recipes: [recipe({ character: 'hard' })] })
    expect(resolveRecipe(dev, bd, 'kick', 'hard')).toMatchObject({
      outcome: 'exact',
      character: 'hard',
      distanceSq: 0,
    })
  })

  it('substitutes the nearest neighbour and names what it actually used', () => {
    const dev = device({ recipes: [recipe({ id: 'fx-kick-dark', character: 'dark' })] })
    const resolution = resolveRecipe(dev, bd, 'kick', 'hard')
    expect(resolution).toMatchObject({ outcome: 'substituted', character: 'dark', distanceSq: 2 })
  })

  it('never substitutes an opposite - that is unvoiced, not a bad match', () => {
    const dev = device({ recipes: [recipe({ id: 'fx-kick-soft', character: 'soft' })] })
    expect(resolveRecipe(dev, bd, 'kick', 'hard')).toEqual({ outcome: 'unvoiced', distanceSq: 0 })
  })

  it('is unvoiced when nothing is authored for the role on this voice', () => {
    // The voice can serve the role; nobody has authored it. That is an authoring gap (§3.5),
    // not a rig gap (§7.3), and the UI must distinguish them.
    expect(resolveRecipe(device(), assignableFor(device(), 'lt'), 'sub', 'dark')).toEqual({
      outcome: 'unvoiced',
      distanceSq: 0,
    })
  })

  it('matches a pool recipe from any ordinal (§2.2)', () => {
    const dev = poolDevice()
    for (const voiceId of ['track-1', 'track-5', 'track-8']) {
      expect(resolveRecipe(dev, assignableFor(dev, voiceId), 'kick', 'hard')).toMatchObject({
        outcome: 'exact',
      })
    }
  })

  it('breaks a distance tie by recipe id in UTF-16 order, not by authored order', () => {
    // 'bright' and 'dark' are both orthogonal to 'hard': distance 2 either way.
    const dev = device({
      recipes: [
        recipe({ id: 'fx-zulu', character: 'bright' }),
        recipe({ id: 'fx-alpha', character: 'dark' }),
      ],
    })
    expect(resolveRecipe(dev, bd, 'kick', 'hard')).toMatchObject({ recipe: { id: 'fx-alpha' } })

    // Swap only the ids. If the tie broke on authored order or on character, this would not move.
    const swapped = device({
      recipes: [
        recipe({ id: 'fx-alpha', character: 'bright' }),
        recipe({ id: 'fx-zulu', character: 'dark' }),
      ],
    })
    expect(resolveRecipe(swapped, bd, 'kick', 'hard')).toMatchObject({
      recipe: { id: 'fx-alpha' },
      character: 'bright',
    })
  })

  it('ranks candidates nearest-first and drops opposites entirely', () => {
    const dev = device({
      recipes: [
        recipe({ id: 'fx-soft', character: 'soft' }),
        recipe({ id: 'fx-dark', character: 'dark' }),
        recipe({ id: 'fx-hard', character: 'hard' }),
      ],
    })
    expect(scoreRecipes(dev, bd, 'kick', 'hard').map((x) => x.recipe.id)).toEqual([
      'fx-hard',
      'fx-dark',
    ])
  })
})

// ---------------------------------------------------------------------------
// §7 step 8 — articulation
// ---------------------------------------------------------------------------

describe('bindArticulation (§7 step 8, §4.3)', () => {
  const pattern: Pattern = {
    id: 'p-kick',
    forRole: 'kick',
    band: 2,
    length: 16,
    hits: [
      { step: 9, slot: 'accent' },
      { step: 1, slot: 'downbeat' },
      { step: 5, slot: 'accent' },
    ],
  }

  it('drops a slot the selected variant does not contain, silently', () => {
    const r = recipe({
      articulation: [
        { slot: 'accent', set: { velocity: 110 } },
        // No 'last-hit' in this variant. Not a gap: the device had nothing to say about a
        // slot with no hits in it.
        { slot: 'last-hit', set: { cycle: 2 }, hint: 'apply-cycle' },
      ],
    })
    expect(bindArticulation(r, pattern).map((a) => a.slot)).toEqual(['accent'])
  })

  it('binds a present slot to every step carrying it, ascending', () => {
    const r = recipe({ articulation: [{ slot: 'accent', set: { velocity: 110 } }] })
    expect(bindArticulation(r, pattern)[0]).toMatchObject({
      slot: 'accent',
      set: { velocity: 110 },
      steps: [5, 9],
    })
  })

  it('keeps authored order and carries the hint key through', () => {
    const r = recipe({
      articulation: [
        { slot: 'downbeat', set: { probability: 100 } },
        { slot: 'accent', set: { cycle: 2 }, hint: 'apply-cycle' },
      ],
    })
    const bound = bindArticulation(r, pattern)
    expect(bound.map((a) => a.slot)).toEqual(['downbeat', 'accent'])
    expect(bound[0]?.hint).toBeUndefined()
    expect(bound[1]?.hint).toBe('apply-cycle')
  })

  it('stamps the recipe citation, and can only be authored or provisional (§3.2)', () => {
    const cited = recipe({
      verified: MANUAL,
      articulation: [{ slot: 'accent', set: { velocity: 110 } }],
    })
    expect(bindArticulation(cited, pattern)[0]?.provenance).toEqual({
      state: 'authored',
      cite: MANUAL,
    })

    for (const verified of [false, undefined] as const) {
      const r = recipe({ verified, articulation: [{ slot: 'accent', set: { velocity: 110 } }] })
      expect(bindArticulation(r, pattern)[0]?.provenance).toEqual({ state: 'provisional' })
    }
  })

  it('lets each articulation override the recipe, in both directions (§3.1)', () => {
    // The same repair as `resolvePatch`, applied in the same pass. §3 names params, patch
    // entries *and* articulation entries as inheriting the recipe citation; only params could,
    // and this shape had the identical defect without a device having found it yet.
    const bound = bindArticulation(
      recipe({
        verified: MANUAL,
        articulation: [
          { slot: 'downbeat', set: { probability: 100 } },
          { slot: 'accent', set: { velocity: 110 }, verified: OBSERVED },
        ],
      }),
      pattern,
    )
    expect(bound.map((a) => a.provenance)).toEqual([
      { state: 'authored', cite: MANUAL },
      { state: 'authored', cite: OBSERVED },
    ])

    // An explicit `false` on the entry beats an inherited citation, and a citation on the entry
    // survives an uncited recipe. Provenance is resolved per entry, never hoisted for the list.
    const mixed = bindArticulation(
      recipe({
        verified: MANUAL,
        articulation: [{ slot: 'accent', set: { velocity: 110 }, verified: false }],
      }),
      pattern,
    )
    expect(mixed[0]?.provenance).toEqual({ state: 'provisional' })

    const lifted = bindArticulation(
      recipe({
        verified: false,
        articulation: [{ slot: 'accent', set: { velocity: 110 }, verified: MANUAL }],
      }),
      pattern,
    )
    expect(lifted[0]?.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('binds nothing when the recipe authors no articulation', () => {
    expect(bindArticulation(recipe({ articulation: undefined }), pattern)).toEqual([])
  })
})

describe('resolvePatch (§3.3, invariant 4)', () => {
  it('stamps provenance on a patch cable, inherited from the recipe', () => {
    const r = recipe({ verified: OBSERVED, patch: [{ from: 'OSC1 SUB', to: 'FILTER IN' }] })
    expect(resolvePatch(r)).toEqual([
      { from: 'OSC1 SUB', to: 'FILTER IN', provenance: { state: 'authored', cite: OBSERVED } },
    ])
    expect(resolvePatch(recipe({ verified: false, patch: [{ from: 'A', to: 'B', note: 'n' }] })))
      .toEqual([{ from: 'A', to: 'B', note: 'n', provenance: { state: 'provisional' } }])
  })

  it('lets each cable override the recipe, in both directions (§3.1)', () => {
    // The repair #49 produced. A patch entry's `verified` claims that *this connection* is the
    // right choice — the jacks' own existence is cited once each on the device (§3.3) — so one
    // recipe can hold a cable the manual instructs beside two somebody patched by ear. Three
    // entries, three different claims, resolved per entry rather than hoisted for the list.
    const resolved = resolvePatch(
      recipe({
        verified: MANUAL,
        patch: [
          { from: 'A', to: 'B' },
          { from: 'C', to: 'D', verified: OBSERVED },
          { from: 'E', to: 'F', verified: false },
        ],
      }),
    )
    expect(resolved.map((e) => e.provenance)).toEqual([
      { state: 'authored', cite: MANUAL },
      { state: 'authored', cite: OBSERVED },
      // The direction `||` gets wrong: an explicit `false` on the entry beats an inherited cite.
      { state: 'provisional' },
    ])
  })

  it('lets a cable be cited inside an uncited recipe', () => {
    // The direction an author actually reaches for on a semi-modular: the whole recipe is
    // patched by ear, except the one connection the manual walks you through.
    expect(
      resolvePatch(recipe({ verified: false, patch: [{ from: 'A', to: 'B', verified: MANUAL }] })),
    ).toEqual([{ from: 'A', to: 'B', provenance: { state: 'authored', cite: MANUAL } }])
  })
})

// ---------------------------------------------------------------------------
// §3.1 — inheritance
// ---------------------------------------------------------------------------

describe('inheritVerified (§3.1)', () => {
  it('lets the more specific claim win, in both directions', () => {
    // Omitted on the param → inherit.
    expect(inheritVerified(undefined, MANUAL)).toEqual(MANUAL)
    // A citation on the param overrides an inherited one.
    expect(inheritVerified(OBSERVED, MANUAL)).toEqual(OBSERVED)
    // An explicit `false` on the param overrides an inherited citation. This is the direction
    // that is easy to get wrong with `??`.
    expect(inheritVerified(false, MANUAL)).toBe(false)
    // And a citation on the param survives a recipe that verifies nothing.
    expect(inheritVerified(MANUAL, false)).toEqual(MANUAL)
  })

  it('treats a recipe with no claim as unverified, not as absent', () => {
    expect(inheritVerified(undefined, undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §3.2 / §6.1 — mood, provenance
// ---------------------------------------------------------------------------

describe('resolveParam provenance (§3.2, obligations 5 and 5a)', () => {
  /** TUNE 52 in 0..100, moved -12 at full darkness. */
  function tune(over: Record<string, unknown> = {}) {
    return numericParam({
      name: 'TUNE',
      value: 52,
      range: { min: 0, max: 100, verified: MANUAL },
      mood: [{ axis: 'darkness', amount: -12 }],
      ...over,
    })
  }

  it('point verified + range verified + mood moved it → derived', () => {
    const resolved = resolveParam(tune({ verified: MANUAL }), false, moodState({ darkness: 100 }))
    expect(resolved.value).toBe(40)
    expect(resolved.provenance).toEqual({
      state: 'derived',
      cite: MANUAL,
      rangeCite: MANUAL,
      from: 52,
      axes: ['darkness'],
    })
  })

  it('point verified + range verified + mood centred → authored', () => {
    const resolved = resolveParam(tune({ verified: MANUAL }), false, moodState())
    expect(resolved.value).toBe(52)
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('point verified + range unverified → authored, and mood is inhibited (obligation 5b)', () => {
    // §3.2's legality gate: a verified range is what makes a derived value legal at all. The
    // engine leaves the parameter alone rather than generating inside bounds nobody checked -
    // and this holds however impeccable the point citation is.
    const param = tune({ verified: MANUAL, range: { min: 0, max: 100, verified: false } })
    const resolved = resolveParam(param, MANUAL, moodState({ darkness: 100 }))
    expect(resolved.value).toBe(52)
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('point unverified + range verified + mood moved it → provisional, still showing the move', () => {
    // `provisional` dominates `derived`: the move is legal and is recorded, but it inherits no
    // authority the starting point never had.
    const resolved = resolveParam(tune({ verified: false }), MANUAL, moodState({ darkness: 100 }))
    expect(resolved.value).toBe(40)
    expect(resolved.provenance).toEqual({ state: 'provisional', from: 52, axes: ['darkness'] })
  })

  it('point unverified + no move → provisional, with nothing to render as a move', () => {
    const resolved = resolveParam(tune({ verified: false }), MANUAL, moodState())
    expect(resolved.value).toBe(52)
    expect(resolved.provenance).toEqual({ state: 'provisional' })
  })

  it('never stamps `authored` on a value mood actually moved (obligation 5)', () => {
    for (const point of [MANUAL, OBSERVED, false] as const) {
      const resolved = resolveParam(tune({ verified: point }), false, moodState({ darkness: 0 }))
      expect(resolved.value).not.toBe(52)
      expect(resolved.provenance.state).not.toBe('authored')
    }
  })

  it('carries both citations on a derived value, and they need not be the same kind', () => {
    // A documented range with a point checked on the unit: two independent claims (§3.2).
    const param = tune({ verified: OBSERVED, range: { min: 0, max: 100, verified: MANUAL } })
    expect(resolveParam(param, false, moodState({ darkness: 100 })).provenance).toMatchObject({
      state: 'derived',
      cite: OBSERVED,
      rangeCite: MANUAL,
    })
  })

  it('treats an observed point as authored, exactly like a manual one', () => {
    expect(resolveParam(tune({ verified: OBSERVED }), false, moodState()).provenance).toEqual({
      state: 'authored',
      cite: OBSERVED,
    })
  })
})

/**
 * §3.1/#324, narrowed at #349. **The MIDI instruction names the controller and no value at all.**
 *
 * The history is worth keeping, because the field survives the sentence that justified it. The
 * Muse authored the instruction as prose in the device folder — `Send MIDI CC 87 = ${value}`
 * written at authoring time — so a value mood then moved left the guide printing `54 → 36` on the
 * line and *"send 54"* underneath it. #324 moved the composition here, after mood, which is the
 * only place the number in the sentence can be the number on the line.
 *
 * **#349 removed the number instead.** The one device that declares `midiCc` re-authored its
 * controls on the scale its screen shows — percent, and Hz for the two filter cutoffs — and no
 * page maps either onto a CC value, so `Send MIDI CC 67 = 74` beside `74 %` names a number that
 * lands somewhere nobody has measured. What is left is which controller addresses the control,
 * which is true, useful to anything automating the box, and cannot go stale.
 *
 * So these pin the property the field is now worth having for: **the instruction is the same in
 * every branch** — moved, unmoved, clamped and inhibited — because it depends on nothing the mood
 * knobs can change. A regression to an instruction carrying a value fails four of these at once.
 */
describe('the MIDI instruction names the controller and asserts no value (§3.1/#324, #349)', () => {
  /** CC 87 on 0..127, moved +18 when density is at the floor — the Muse's VCA ENV DECAY. */
  function decay(over: Record<string, unknown> = {}) {
    return numericParam({
      name: 'VCA ENV · DECAY',
      value: 54,
      range: { min: 0, max: 127, verified: MANUAL },
      midiCc: 87,
      mood: [{ axis: 'density', amount: -18 }],
      ...over,
    })
  }

  it('names neither the moved value nor the value it moved from', () => {
    const resolved = resolveParam(decay(), MANUAL, moodState({ density: 0 }))
    expect(resolved.value).toBe(72)
    expect(resolved.note).toBe('MIDI CC 87')
    // Both numbers are on the line above — `72` as the value and `54` struck through — and
    // neither belongs in an instruction that no longer promises what sending one would do.
    expect(resolved.provenance).toMatchObject({ state: 'derived', from: 54 })
    expect(resolved.note).not.toContain('72')
    expect(resolved.note).not.toContain('54')
  })

  it('says the same thing when the knobs are centred', () => {
    const resolved = resolveParam(decay(), MANUAL, moodState())
    expect(resolved.value).toBe(54)
    expect(resolved.note).toBe('MIDI CC 87')
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('says the same thing where the value was clamped', () => {
    // §6.1 clamps to the range before this runs. The clamp is visible in `value`, which is what
    // the reader dials; the instruction beside it has nothing to be wrong about.
    const resolved = resolveParam(
      decay({ value: 120, mood: [{ axis: 'density', amount: -18 }] }),
      MANUAL,
      moodState({ density: 0 }),
    )
    expect(resolved.value).toBe(127)
    expect(resolved.note).toBe('MIDI CC 87')
  })

  it('says the same thing when an unverified range inhibits mood (§3.2)', () => {
    const resolved = resolveParam(
      decay({ range: { min: 0, max: 127, verified: false } }),
      MANUAL,
      moodState({ density: 0 }),
    )
    expect(resolved.value).toBe(54)
    expect(resolved.note).toBe('MIDI CC 87')
  })

  it('keeps an authored note in front of the instruction, joined the way notes are joined', () => {
    const resolved = resolveParam(
      decay({ note: 'Bipolar, centred at noon' }),
      MANUAL,
      moodState({ density: 0 }),
    )
    expect(resolved.note).toBe('Bipolar, centred at noon · MIDI CC 87')
  })

  it('says nothing at all about MIDI on a control that declares no CC', () => {
    const resolved = resolveParam(decay({ midiCc: undefined }), MANUAL, moodState({ density: 0 }))
    expect(resolved.note).toBeUndefined()
    expect(resolved.midiCc).toBeUndefined()
    // And an authored note is left exactly as authored, rather than acquiring a separator.
    const withNote = resolveParam(
      decay({ midiCc: undefined, note: 'Bipolar, centred at noon' }),
      MANUAL,
      moodState(),
    )
    expect(withNote.note).toBe('Bipolar, centred at noon')
  })

  it('carries the number itself, so a consumer need not read the sentence', () => {
    expect(resolveParam(decay(), MANUAL, moodState()).midiCc).toBe(87)
  })
})

describe('resolveParam inheritance (obligation 5c, §3.1)', () => {
  it('inherits the recipe citation when the param omits one', () => {
    const param = numericParam({ verified: undefined, range: { min: 0, max: 100 } })
    expect(resolveParam(param, MANUAL, moodState()).provenance).toEqual({
      state: 'authored',
      cite: MANUAL,
    })
  })

  it('lets an explicit param `false` override an inherited citation', () => {
    const param = numericParam({ verified: false })
    expect(resolveParam(param, MANUAL, moodState()).provenance).toEqual({ state: 'provisional' })
  })

  it('lets a param citation override an uncited recipe', () => {
    expect(resolveParam(numericParam({ verified: OBSERVED }), false, moodState()).provenance)
      .toEqual({ state: 'authored', cite: OBSERVED })
  })

  it('inherits the recipe citation onto an omitted range, which then permits mood', () => {
    const param = numericParam({
      value: 52,
      range: { min: 0, max: 100 },
      mood: [{ axis: 'grit', amount: 10 }],
    })
    expect(resolveParam(param, MANUAL, moodState({ grit: 100 })).value).toBe(62)
    // ...and the same param under a recipe that verifies nothing is deaf to the knob.
    expect(resolveParam(param, false, moodState({ grit: 100 })).value).toBe(52)
  })

  it('lets an explicit `range.verified: false` inhibit mood under a cited recipe', () => {
    const param = numericParam({
      value: 52,
      range: { min: 0, max: 100, verified: false },
      mood: [{ axis: 'grit', amount: 10 }],
    })
    expect(resolveParam(param, MANUAL, moodState({ grit: 100 })).value).toBe(52)
  })

  it('resolves range and point independently - one inherited, one explicit', () => {
    const param = numericParam({
      value: 52,
      verified: false,
      range: { min: 0, max: 100 },
      mood: [{ axis: 'grit', amount: 10 }],
    })
    // Range inherits the recipe's citation (mood allowed); the point's explicit false stands.
    expect(resolveParam(param, MANUAL, moodState({ grit: 100 }))).toMatchObject({
      value: 62,
      provenance: { state: 'provisional', from: 52, axes: ['grit'] },
    })
  })
})

describe('mood arithmetic (§6.1)', () => {
  function p(over: Record<string, unknown> = {}) {
    return numericParam({
      value: 50,
      range: { min: 0, max: 100, verified: MANUAL },
      verified: MANUAL,
      mood: [{ axis: 'grit', amount: 20 }],
      ...over,
    })
  }

  it('is exactly ((knob - 50) / 50) * amount', () => {
    expect(resolveParam(p(), false, moodState({ grit: 100 })).value).toBe(70)
    expect(resolveParam(p(), false, moodState({ grit: 75 })).value).toBe(60)
    expect(resolveParam(p(), false, moodState({ grit: 50 })).value).toBe(50)
    expect(resolveParam(p(), false, moodState({ grit: 0 })).value).toBe(30)
  })

  it('sums every declared axis', () => {
    const param = p({
      mood: [
        { axis: 'grit', amount: 20 },
        { axis: 'darkness', amount: -10 },
      ],
    })
    // grit full (+20), darkness full (-10) → 60.
    expect(resolveParam(param, false, moodState({ grit: 100, darkness: 100 })).value).toBe(60)
  })

  it('names only the axes that actually contributed', () => {
    const param = p({
      mood: [
        { axis: 'grit', amount: 20 },
        // Declared, but the knob is centred, so it did nothing and must not be named.
        { axis: 'space', amount: 30 },
      ],
    })
    expect(resolveParam(param, false, moodState({ grit: 100 })).provenance).toMatchObject({
      state: 'derived',
      axes: ['grit'],
    })
  })

  it('clamps to the declared range', () => {
    expect(resolveParam(p({ value: 95 }), false, moodState({ grit: 100 })).value).toBe(100)
    expect(resolveParam(p({ value: 5 }), false, moodState({ grit: 0 })).value).toBe(0)
  })

  it('rounds to the authored step, and stays inside the range while doing it', () => {
    // 50 + ((90 - 50) / 50) * 20 = 66, snapped to the nearest multiple of 5.
    expect(resolveParam(p({ step: 5 }), false, moodState({ grit: 90 })).value).toBe(65)
    // A coarse step whose grid would carry the clamped value back out of range: the range wins.
    const coarse = p({ value: 9, range: { min: 0, max: 10, verified: MANUAL }, step: 4, mood: [{ axis: 'grit', amount: 4 }] })
    const resolved = resolveParam(coarse, false, moodState({ grit: 100 }))
    expect(resolved.value).toBeLessThanOrEqual(10)
    expect(resolved.value).toBe(8)
  })

  it('does not render float residue for a fractional step', () => {
    const param = p({
      value: 0.2,
      range: { min: 0, max: 1, verified: MANUAL },
      step: 0.1,
      mood: [{ axis: 'grit', amount: 0.1 }],
    })
    expect(resolveParam(param, false, moodState({ grit: 100 })).value).toBe(0.3)
  })

  it('is authored, not derived, when the push rounds away to nothing', () => {
    // A knob that moved the arithmetic but not the value has not moved the value, and
    // rendering `50 → 50` with a derived badge would claim work the reader cannot see.
    const param = p({ step: 10, mood: [{ axis: 'grit', amount: 2 }] })
    const resolved = resolveParam(param, false, moodState({ grit: 100 }))
    expect(resolved.value).toBe(50)
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('leaves a numeric with no `mood` entry alone, however loud the knobs', () => {
    const param = p({ mood: undefined })
    const loud = moodState({ darkness: 100, density: 100, grit: 100, swing: 100, space: 100 })
    expect(resolveParam(param, false, loud)).toMatchObject({
      value: 50,
      provenance: { state: 'authored', cite: MANUAL },
    })
  })

  it('carries unit, hint and note through untouched', () => {
    const param = p({ unit: 'Hz', hint: 'fine-adjust', note: 'ear-tuned' })
    expect(resolveParam(param, false, moodState())).toMatchObject({
      unit: 'Hz',
      hint: 'fine-adjust',
      note: 'ear-tuned',
    })
  })
})

describe('non-numeric params (§3.1, §6.1)', () => {
  it('copies an enum through and can only be authored or provisional', () => {
    const param: AuthoredEnumParam = {
      kind: 'enum',
      name: 'MODE',
      value: 'analog',
      options: { values: ['analog', 'digital'] },
    }
    const loud = moodState({ darkness: 100, grit: 100 })
    expect(resolveParam(param, MANUAL, loud)).toEqual({
      name: 'MODE',
      value: 'analog',
      provenance: { state: 'authored', cite: MANUAL },
    })
    expect(resolveParam({ ...param, verified: false }, MANUAL, loud).provenance).toEqual({
      state: 'provisional',
    })
  })

  it('copies text through on the same terms', () => {
    const param: AuthoredTextParam = { kind: 'text', name: 'ROUTING', value: 'out 3/4' }
    expect(resolveParam(param, OBSERVED, moodState({ space: 100 }))).toEqual({
      name: 'ROUTING',
      value: 'out 3/4',
      provenance: { state: 'authored', cite: OBSERVED },
    })
  })
})

describe('resolveParams (§7 step 9)', () => {
  it('resolves a whole recipe in authored order, stamping every value', () => {
    const r = recipe({
      verified: MANUAL,
      params: [
        numericParam({ name: 'TUNE', value: 52, mood: [{ axis: 'darkness', amount: -12 }] }),
        numericParam({ name: 'DECAY', value: 38, verified: false }),
        { kind: 'text', name: 'ROUTING', value: 'out 3/4' },
      ],
    })
    const resolved = resolveParams(r, moodState({ darkness: 100 }))
    expect(resolved.map((x) => x.name)).toEqual(['TUNE', 'DECAY', 'ROUTING'])
    expect(resolved.map((x) => x.provenance.state)).toEqual([
      'derived',
      'provisional',
      'authored',
    ])
    // Invariant 4: every rendered value carries provenance, with no exceptions to check for.
    for (const param of resolved) expect(param.provenance).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// #29 — the bounds survive resolution
// ---------------------------------------------------------------------------

describe('resolved ranges (#29, §8)', () => {
  const bounded = (over: Record<string, unknown> = {}) =>
    numericParam({
      name: 'DECAY',
      value: 38,
      range: { min: 0, max: 100, verified: MANUAL },
      ...over,
    })

  it('carries the bounds onto the resolved param, so §8 can print them', () => {
    expect(resolveParam(bounded(), MANUAL, moodState()).range).toEqual({
      min: 0,
      max: 100,
      verified: MANUAL,
    })
  })

  it('resolves the range citation once here, never leaving inheritance for the renderer', () => {
    // Range with no `verified` of its own inherits the recipe's, exactly as the point does.
    const inherited = bounded({ range: { min: 0, max: 100 } })
    expect(resolveParam(inherited, OBSERVED, moodState()).range?.verified).toEqual(OBSERVED)
    // And an unverified range resolves to `false`, not to `undefined` — "unverified" is a
    // decided answer, and the renderer must not have to tell it apart from "not yet asked".
    const unverified = bounded({ range: { min: 0, max: 100, verified: false } })
    expect(resolveParam(unverified, MANUAL, moodState()).range?.verified).toBe(false)
  })

  it('gives an enum no range, because its legality gate is `options` (§3.2)', () => {
    const enumParam = {
      kind: 'enum' as const,
      name: 'MODE',
      value: 'poly',
      options: { values: ['poly', 'mono'], verified: MANUAL },
    }
    expect(resolveParam(enumParam, MANUAL, moodState()).range).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// §6.1 — a centred knob changes nothing, rounding included
// ---------------------------------------------------------------------------

describe('neutral mood is inert (§6.1, NEUTRAL_MOOD)', () => {
  const secs = (over: Record<string, unknown> = {}) =>
    numericParam({
      name: 'DECAY',
      value: 0.28,
      unit: 'Sec',
      range: { min: 0, max: 10, verified: MANUAL },
      mood: [{ axis: 'density', amount: -0.09 }],
      ...over,
    })

  it('leaves an authored value off the default grid exactly as authored', () => {
    // The bug this pins: with no `step`, the grid defaults to 1, and rounding ran even when
    // mood had moved nothing — so a cited 0.28 was rendered as 0 under a neutral mood.
    const resolved = resolveParam(secs(), MANUAL, NEUTRAL_MOOD)
    expect(resolved.value).toBe(0.28)
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('holds for a provisional point too, where the badge would have hidden the change', () => {
    const resolved = resolveParam(secs({ verified: false }), MANUAL, NEUTRAL_MOOD)
    expect(resolved.value).toBe(0.28)
    expect(resolved.provenance).toEqual({ state: 'provisional' })
  })

  it('leaves the value alone when two declared axes cancel exactly', () => {
    // Both axes contribute, so `axes` is non-empty — but the net move is zero, and zero move
    // must mean zero change. This is why the guard tests the offset, not the axis list.
    const param = numericParam({
      value: 0.5,
      range: { min: 0, max: 10, verified: MANUAL },
      mood: [
        { axis: 'grit', amount: 4 },
        { axis: 'density', amount: -4 },
      ],
    })
    const resolved = resolveParam(param, MANUAL, moodState({ grit: 100, density: 100 }))
    expect(resolved.value).toBe(0.5)
    expect(resolved.provenance).toEqual({ state: 'authored', cite: MANUAL })
  })

  it('still rounds once mood actually moves the value', () => {
    // The grid is for landing a *moved* value where the instrument can sit; it is not
    // suspended, only skipped when there is nothing to land.
    const moved = resolveParam(secs({ step: 0.01 }), MANUAL, moodState({ density: 100 }))
    expect(moved.value).toBe(0.19)
    expect(moved.provenance).toMatchObject({ state: 'derived', from: 0.28 })
  })

  it('holds across the whole authored library, which is where it was caught', () => {
    for (const device of DEVICES) {
      for (const recipe of device.recipes) {
        const resolved = resolveParams(recipe, NEUTRAL_MOOD)
        recipe.params.forEach((authored, i) => {
          const got = resolved[i] as (typeof resolved)[number]
          expect(got.value, `${device.id} / ${recipe.id} / ${authored.name}`).toBe(authored.value)
          expect(got.provenance.state, `${device.id} / ${recipe.id} / ${authored.name}`)
            .not.toBe('derived')
        })
      }
    }
  })
})
