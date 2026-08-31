import { describe, expect, it } from 'vitest'
import {
  DENSITY_BANDS,
  DENSITY_DETENTS,
  TRANSITIONAL_ROLES,
  TemplateSchema,
  bandFor,
  moodState,
  parseKey,
  resolve,
  resolveHook,
  sectionsFor,
  type DensityBand,
  type Role,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, ambientDub, industrialTechno, majorKeyElectro, templateById } from '../lib/templates/index'

/**
 * The two directions added after Industrial Techno, and *only* what is new about them.
 *
 * `templates.test.ts` already sweeps every template in the registry for the rules that hold for
 * all of them — four bands per patterned role, no band fallback, one hit per step, ghosts quiet
 * and accents loud, no device word anywhere. Repeating any of that here would be a second copy
 * of a passing test. What this file asserts is the thing a generic sweep cannot: that these two
 * templates are *different from the first one*, along the axes they were written to be different
 * along. A second genre that exercises the same code paths as the first is a bigger content
 * library and not a better-tested engine.
 */

const NEUTRAL = moodState({ density: DENSITY_DETENTS[1] })

/** The band each section asks for, in `structure` order: the arrangement, as a vector (§6.3). */
function bandVector(template: Template, density: number): DensityBand[] {
  return template.structure.map((s) => bandFor(template, s.name, moodState({ density })))
}

function rolesOf(template: Template): Set<Role> {
  return new Set(template.roles.map((r) => r.role))
}

function patternedRoles(template: Template): Set<Role> {
  return new Set(template.patterns.map((p) => p.forRole))
}

// ---------------------------------------------------------------------------
// The registry entries themselves
// ---------------------------------------------------------------------------

describe('the registry carries eight directions (§4)', () => {
  it('holds both new templates, in id order, reachable by id', () => {
    // Eight now, and every arrival has slotted in by id rather than at the end, which is what
    // the registry's UTF-16 ordering is for (§7.2). The other files own the other arrivals:
    // `small-rig-directions.test.ts` the two a one-voice box can finish, and
    // `simultaneous-directions.test.ts` the two a box with several voices can. `generative-drift`
    // has no such file — it is a full-rig direction with nothing to prove about a small one — so
    // this list is the whole of what pins its registration. This file stays the record of the
    // pair that came in with #6.
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'ambient-dub',
      'drone-study',
      'generative-drift',
      'industrial-techno',
      'lydian-house',
      'major-key-electro',
      'relay',
      'weave',
    ])
    expect(templateById('ambient-dub')).toBe(ambientDub)
    expect(templateById('major-key-electro')).toBe(majorKeyElectro)
  })

  it('parses both new templates against the schema', () => {
    for (const template of [ambientDub, majorKeyElectro]) {
      const parsed = TemplateSchema.safeParse(template)
      expect(parsed.error?.issues ?? [], `${template.id} failed TemplateSchema`).toEqual([])
    }
  })

  it('asks a different arrangement per direction, at the neutral detent (§6.3)', () => {
    // Not "the templates differ" — the *arrangements* differ. Three genres that resolve to the
    // same band vector are one genre with three names as far as §6.3 is concerned.
    expect(bandVector(ambientDub, DENSITY_DETENTS[1])).toEqual([0, 1, 2, 3, 1, 0])
    expect(bandVector(industrialTechno, DENSITY_DETENTS[1])).toEqual([0, 1, 3, 1, 3, 0])
    expect(bandVector(majorKeyElectro, DENSITY_DETENTS[1])).toEqual([0, 1, 3, 2, 3, 0])

    const vectors = TEMPLATES.map((t) => bandVector(t, DENSITY_DETENTS[1]).join(''))
    expect(new Set(vectors).size).toBe(TEMPLATES.length)
  })

  it('fills every request of both new directions on the full library (§7.3)', () => {
    // A gap caused by the rig is honest (invariant 5); a gap caused by the template asking for
    // a character no device authors for the role is a content bug in *this* layer. Against the
    // whole library there is no rig excuse left, so anything missing here is self-inflicted.
    for (const template of [ambientDub, majorKeyElectro]) {
      const result = resolve({ devices: DEVICES, template, mood: NEUTRAL, seed: 7 })
      expect(
        result.shortfalls.map((g) => `${g.requestId}: ${g.reason}`),
        `${template.id} has a hole nothing in the rig explains`,
      ).toEqual([])
      expect(result.assignments).toHaveLength(template.roles.length)
    }
  })
})

// ---------------------------------------------------------------------------
// The roles these two reach that Industrial Techno never asks for
// ---------------------------------------------------------------------------

describe('the new directions reach roles Industrial Techno never asks for (§1)', () => {
  /** The vocabulary the first template left untouched, and which of the two now covers it. */
  const NEWLY_REQUESTED: Record<string, Template> = {
    rim: ambientDub,
    ride: ambientDub,
    texture: ambientDub,
    sweep: ambientDub,
    'ghost-perc': ambientDub,
    snare: majorKeyElectro,
    tom: majorKeyElectro,
    lead: majorKeyElectro,
    arp: majorKeyElectro,
    'vox-chop': majorKeyElectro,
  }

  it('asks for ten roles the first template does not, and asks each somewhere', () => {
    const techno = rolesOf(industrialTechno)
    for (const [role, template] of Object.entries(NEWLY_REQUESTED)) {
      expect(techno.has(role as Role), `industrial-techno already requests '${role}'`).toBe(false)
      expect(rolesOf(template).has(role as Role), `${template.id} is missing '${role}'`).toBe(true)
    }
  })

  it('authors four bands for each newly-patterned role rather than leaving it to fallback', () => {
    // The generic sweep in `templates.test.ts` proves *a* role with patterns has four bands.
    // This proves the specific new ones are patterned at all, which is what a fallback-free
    // guide for these directions depends on.
    const patterned: [Role, Template][] = [
      ['rim', ambientDub],
      ['ride', ambientDub],
      ['ghost-perc', ambientDub],
      ['snare', majorKeyElectro],
      ['tom', majorKeyElectro],
      ['lead', majorKeyElectro],
      ['arp', majorKeyElectro],
      ['vox-chop', majorKeyElectro],
    ]
    for (const [role, template] of patterned) {
      const bands = template.patterns.filter((p) => p.forRole === role).map((p) => p.band).sort()
      expect(bands, `${template.id}: '${role}'`).toEqual([...DENSITY_BANDS])
    }
  })
})

// ---------------------------------------------------------------------------
// Ambient Dub — the shape techno does not have
// ---------------------------------------------------------------------------

describe('ambient-dub rises and recedes rather than dropping (§4)', () => {
  const energies = () => ambientDub.structure.map((s) => s.energy)

  it('has one crest, climbed to and left, with no return', () => {
    const curve = energies()
    const peak = curve.indexOf(Math.max(...curve))
    expect(curve.filter((e) => e === curve[peak])).toHaveLength(1)
    for (let i = 1; i <= peak; i++) {
      expect(curve[i] as number, `section ${i} does not climb`).toBeGreaterThan(curve[i - 1] as number)
    }
    for (let i = peak + 1; i < curve.length; i++) {
      expect(curve[i] as number, `section ${i} does not recede`).toBeLessThan(curve[i - 1] as number)
    }
  })

  it('is the shape industrial techno is not', () => {
    // The contrast is the point: techno dips and returns to a second peak at least as high as
    // the first, which is what a drop *is*. If this ever stops being true of the first template
    // the sentence above about ambient dub stops being interesting.
    const curve = industrialTechno.structure.map((s) => s.energy)
    const peak = Math.max(...curve)
    const firstPeak = curve.indexOf(peak)
    const dip = curve.slice(0, firstPeak).some((e, i) => i > 0 && e < (curve[i - 1] as number))
    const returns = curve.slice(firstPeak + 1).some((e) => e >= (curve[firstPeak - 1] as number))
    expect(dip || returns, 'industrial techno no longer drops and returns').toBe(true)
  })

  it('asks every band at neutral density, which the techno curve never does', () => {
    expect(new Set(bandVector(ambientDub, DENSITY_DETENTS[1]))).toEqual(new Set(DENSITY_BANDS))
    // Techno's curve skips band 2 entirely at the middle detent: its band-2 content is only
    // reachable by moving the knob. This template makes every band reachable as authored.
    expect(bandVector(industrialTechno, DENSITY_DETENTS[1])).not.toContain(2)
  })

  it('counts bars off the grid, and asymmetrically about its crest', () => {
    const bars = ambientDub.structure.map((s) => s.bars)
    const powerOfTwo = (n: number) => (n & (n - 1)) === 0
    for (const n of bars) expect(powerOfTwo(n), `${n} bars is a power of two`).toBe(false)
    // ...where every section of the first template is one.
    for (const s of industrialTechno.structure) expect(powerOfTwo(s.bars)).toBe(true)

    const peak = ambientDub.structure.findIndex(
      (s) => s.energy === Math.max(...ambientDub.structure.map((x) => x.energy)),
    )
    const climb = bars.slice(0, peak).reduce((a, b) => a + b, 0)
    const recede = bars.slice(peak + 1).reduce((a, b) => a + b, 0)
    expect(recede, 'the recede is not longer than the climb').toBeGreaterThan(climb)
  })

  it('moves as a whole arrangement at every detent (§6.3)', () => {
    expect(bandVector(ambientDub, DENSITY_DETENTS[0])).toEqual([0, 0, 1, 2, 0, 0])
    expect(bandVector(ambientDub, DENSITY_DETENTS[1])).toEqual([0, 1, 2, 3, 1, 0])
    expect(bandVector(ambientDub, DENSITY_DETENTS[2])).toEqual([1, 2, 3, 3, 2, 1])
    const vectors = DENSITY_DETENTS.map((d) => bandVector(ambientDub, d).join(''))
    expect(new Set(vectors).size).toBe(DENSITY_DETENTS.length)
  })

  it('leaves its three sustained parts without a step grid, on purpose (invariant 5)', () => {
    const patterned = patternedRoles(ambientDub)
    for (const role of ['pad', 'texture', 'sweep'] as Role[]) {
      expect(rolesOf(ambientDub).has(role), `'${role}' is not requested`).toBe(true)
      expect(patterned.has(role), `'${role}' has invented hits`).toBe(false)
    }
  })

  it('offers only dorian keys, because the cycle leans on a major IV', () => {
    for (const key of ambientDub.keys) {
      expect(parseKey(key)?.mode, key).toBe('dorian')
    }
    expect(ambientDub.harmony.progression.map((p) => p.degree)).toContain('IV')
  })
})

// ---------------------------------------------------------------------------
// Major-Key Electro — the mode nothing else reaches, and a scoped tonal part
// ---------------------------------------------------------------------------

describe('major-key-electro is the only direction in a major key (§4.1)', () => {
  it('offers major keys and nothing else', () => {
    expect(majorKeyElectro.keys.length).toBeGreaterThan(1)
    for (const key of majorKeyElectro.keys) {
      const parsed = parseKey(key)
      expect(parsed, `${key} does not parse`).toBeDefined()
      expect(parsed?.mode, key).toBe('major')
    }
  })

  it('is the only template that reaches the major mode at all', () => {
    for (const template of TEMPLATES) {
      if (template.id === majorKeyElectro.id) continue
      for (const key of template.keys) {
        expect(parseKey(key)?.mode, `${template.id} offers ${key}`).not.toBe('major')
      }
    }
  })

  it('spells every hook against every key it offers', () => {
    // A degree that cannot be spelt in one of the offered keys is a content bug that only
    // shows up on the reroll that picks that key — so all of them, here, rather than the one
    // the seed happens to choose.
    for (const key of majorKeyElectro.keys) {
      for (const hook of majorKeyElectro.hooks) {
        const resolved = resolveHook(hook, key)
        expect(
          resolved.outcome === 'resolved' ? 'resolved' : `${resolved.reason}: ${resolved.detail}`,
          `${hook.id} in ${key}`,
        ).toBe('resolved')
      }
    }
  })

  it('scopes a tonal part to two sections, which no transitional role is doing (§4.2)', () => {
    const chop = majorKeyElectro.roles.find((r) => r.id === 'r-vox-chop')
    expect(chop).toBeDefined()
    expect(chop?.sustain).toBe('transient')
    expect(chop?.sections).toEqual(['Hook', 'Peak'])
    // The claim that makes it interesting: transience is a property of the *request*, not of
    // the three roles §4.2 introduced it for.
    expect(TRANSITIONAL_ROLES).not.toContain(chop?.role)
    // And it occupies exactly those two of the six sections, in structure order (§4.2).
    expect(sectionsFor(chop as NonNullable<typeof chop>, majorKeyElectro)).toEqual(['Hook', 'Peak'])
  })

  it('programs every part it asks for', () => {
    // This template's counterpart to ambient dub's three sustained parts: nothing here is
    // pattern-less, so a reader is never told a part exists and then handed no rhythm for it.
    const patterned = patternedRoles(majorKeyElectro)
    for (const role of rolesOf(majorKeyElectro)) {
      expect(patterned.has(role), `'${role}' is requested with no pattern`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Transient scoping, everywhere
// ---------------------------------------------------------------------------

describe('every transient request names sections that exist (§4.2)', () => {
  it('scopes each one to a real, non-empty subset of its own structure', () => {
    for (const template of TEMPLATES) {
      const known = new Set(template.structure.map((s) => s.name))
      for (const request of template.roles) {
        const where = `${template.id} ${request.id}`
        if (request.sustain === 'transient') {
          expect(request.sections?.length ?? 0, where).toBeGreaterThan(0)
          for (const section of request.sections ?? []) {
            expect(known.has(section), `${where} names '${section}'`).toBe(true)
          }
          expect((request.sections ?? []).length, where).toBeLessThan(template.structure.length)
        } else {
          expect(request.sections, `${where} is continuous and lists sections`).toBeUndefined()
        }
      }
    }
  })
})
