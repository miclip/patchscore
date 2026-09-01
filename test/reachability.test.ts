import { describe, expect, it } from 'vitest'
import {
  deadArticulationSlots,
  reachableSlots,
  unpatternedArticulation,
  unrequestedRecipes,
  type Device,
  type Recipe,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice, formatAudit } from '../scripts/audit-verified'
import { TEMPLATES, droneStudy } from '../lib/templates/index'
import { device as fixtureDevice, recipe as fixtureRecipe, template as fixtureTemplate } from './fixtures'

/**
 * #108. A recipe may author an articulation for a slot no direction ever emits, and nothing fails:
 * `bindArticulation` drops a slot with no hits silently, which is right at resolve time and is
 * exactly why the authoring mistake is invisible. This is the check, and the two halves it needs
 * are here — that it *bites* on the case that prompted it, and that the library is clean.
 */

function deviceById(id: string): Device {
  const found = DEVICES.find((d) => d.id === id)
  if (found === undefined) throw new Error(`${id} missing from the registry`)
  return found
}

function recipeById(device: Device, id: string): Recipe {
  const found = device.recipes.find((r) => r.id === id)
  if (found === undefined) throw new Error(`${id} missing from ${device.id}`)
  return found
}

// ---------------------------------------------------------------------------
// The case that prompted it
// ---------------------------------------------------------------------------

describe('#108 the tm-texture-soft finding, reconstructed', () => {
  /**
   * The offending entry, put back on the recipe as it actually shipped. Reconstructed rather than
   * asserted against the live manifest, because the fix removed it — and a proof that only holds
   * while the bug is present is not a regression test. This is the shape somebody could write
   * again tomorrow, and the check has to catch it then.
   */
  function withFirstHit(): Recipe {
    return {
      ...recipeById(deviceById('polyend-tracker-mini'), 'tm-texture-soft'),
      articulation: [{ slot: 'first-hit', set: { 'low-pass': 55 } }],
    }
  }

  it('the only direction asking for `texture` emits three slots, and `first-hit` is not one', () => {
    const { slots, requested } = reachableSlots(withFirstHit(), TEMPLATES)
    expect(requested).toBe(true)
    expect(slots).toEqual(['downbeat', 'offbeat', 'accent'])
  })

  it('flags the slot, and says what is reachable instead', () => {
    const tracker = deviceById('polyend-tracker-mini')
    const staged: Device = {
      ...tracker,
      recipes: tracker.recipes.map((r) => (r.id === 'tm-texture-soft' ? withFirstHit() : r)),
    }
    expect(deadArticulationSlots(staged, TEMPLATES)).toEqual([
      {
        deviceId: 'polyend-tracker-mini',
        recipeId: 'tm-texture-soft',
        role: 'texture',
        character: 'soft',
        slot: 'first-hit',
        reachable: ['downbeat', 'offbeat', 'accent'],
      },
    ])
  })

  it('holds at every density, because the knob leans the band and never adds a slot', () => {
    // The four variants Drone Study authors for `texture` are the whole reachable set, and none
    // of them contains an entry gesture — so no detent can produce one. Asserted against the
    // template directly, so a variant gaining a `first-hit` later shows up here first.
    const slots = new Set(droneStudy.patterns.flatMap((p) => p.hits.map((h) => h.slot)))
    expect([...slots].sort()).toEqual(['accent', 'downbeat', 'offbeat'])
  })
})

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

describe('#108 no device authors a slot no direction emits', () => {
  it('finds nothing, across every device and every template', () => {
    const findings = DEVICES.flatMap((device) => deadArticulationSlots(device, TEMPLATES))
    // Printed whole rather than counted: a finding that appears should say which recipe and which
    // slot in the failure output, not just that the number moved.
    expect(findings).toEqual([])
  })

  /**
   * The systemic cause, recorded so the next author does not rediscover it one recipe at a time:
   * `first-hit` and `last-hit` exist in the shared vocabulary and exactly one direction emits
   * them, for exactly one role each. Nine of the fourteen findings this check first produced were
   * a device reaching for one of those two slots on some other role.
   */
  it('names the two slots only one direction emits, and the roles it emits them for', () => {
    const emitters = new Map<string, Set<string>>()
    for (const template of TEMPLATES) {
      for (const pattern of template.patterns) {
        for (const hit of pattern.hits) {
          if (hit.slot !== 'first-hit' && hit.slot !== 'last-hit') continue
          const key = `${template.id}/${pattern.forRole}`
          if (!emitters.has(hit.slot)) emitters.set(hit.slot, new Set())
          emitters.get(hit.slot)?.add(key)
        }
      }
    }
    expect([...(emitters.get('first-hit') ?? [])].sort()).toEqual(['industrial-techno/impact'])
    expect([...(emitters.get('last-hit') ?? [])].sort()).toEqual(['industrial-techno/metallic'])
  })
})

// ---------------------------------------------------------------------------
// The two things it must not confuse with dead authoring
// ---------------------------------------------------------------------------

describe('#108 keeps the template-library gaps out of the findings', () => {
  it('says nothing about a recipe no direction can reach', () => {
    /**
     * **This was `acid`, and the change is the point of keeping the history.** The example here
     * used to be *"`acid` is legal on five boxes and requested by no direction"* — 28 recipes over
     * 20 boxes, every slot on them unreachable, and none of it a device-folder bug. #283 closed
     * that by authoring `acid-lineage`, so the whole set became reachable in one commit and the
     * example had to move.
     *
     * What is left is the same finding arriving by the other route: a recipe whose *character* no
     * direction asks for on that role. `crave-lead-dark` is a `dark` lead and both directions that
     * request `lead` ask for `bright`, which §3.5 excludes outright rather than ranking last — so
     * the recipe is legal, authored, and reached through nothing. The `clean` vox-chops and the
     * `dirty` snares are the same shape.
     *
     * The claim being defended never depended on which example carried it: whatever
     * `unrequestedRecipes` names is a template-library gap (#81), and it must never also appear as
     * dead authoring in a device folder.
     */
    const unrequested = DEVICES.flatMap((d) => unrequestedRecipes(d, TEMPLATES))
    expect(unrequested.map((r) => r.recipeId)).toContain('crave-lead-dark')
    // The role that used to be the example, asserted from the other side now: a direction asks
    // for it, so nothing about it is unreachable any more.
    expect(unrequested.map((r) => r.recipeId)).not.toContain('crave-acid-dirty')
    const roles = new Set(unrequested.map((r) => r.role))
    expect(roles.has('acid')).toBe(false)
    for (const found of DEVICES.flatMap((d) => deadArticulationSlots(d, TEMPLATES))) {
      expect(unrequested.map((r) => r.recipeId)).not.toContain(found.recipeId)
    }
  })

  it('says nothing about a requested role no direction patterns, and names it separately', () => {
    // `pad` is requested by three directions and none of them authors a variant for it, so
    // `selectPattern` returns 'none' in every section and there is no variant for a slot to be
    // missing from. The recipes keep their gestures.
    const unpatterned = DEVICES.flatMap((d) => unpatternedArticulation(d, TEMPLATES))
    expect(unpatterned.map((r) => r.recipeId)).toContain('tm-pad-soft-chord')
    expect(reachableSlots(
      recipeById(deviceById('polyend-tracker-mini'), 'tm-pad-soft-chord'),
      TEMPLATES,
    )).toEqual({ slots: [], requested: true })
    // The asymmetry this produces, asserted rather than tidied away: the chord `pad` keeps its
    // entry gesture and the chord `stab` lost one, because `stab` is patterned and `pad` is not.
    const tracker = deviceById('polyend-tracker-mini')
    const slotsOf = (id: string) =>
      (recipeById(tracker, id).articulation ?? []).map((a) => a.slot)
    expect(slotsOf('tm-pad-soft-chord')).toEqual(['first-hit'])
    expect(slotsOf('tm-stab-hard-chord')).toEqual(['accent'])
  })
})

// ---------------------------------------------------------------------------
// The rules the walk follows
// ---------------------------------------------------------------------------

describe('#108 reachability follows the resolver, not a restatement of it', () => {
  it('ignores a request whose character this recipe could never serve (§3.5)', () => {
    // The fixture template asks for `kick` as `hard`, and `soft` is its opposite — excluded from
    // candidacy outright rather than ranked last, so a `soft` kick is never reached through that
    // request and its slots are not reachable through it either. `dark` is inside the radius and
    // is, which is the contrast: role match alone is not the rule.
    const template = fixtureTemplate()
    expect(template.roles.find((r) => r.role === 'kick')?.character).toBe('hard')
    expect(reachableSlots(fixtureRecipe({ character: 'soft' }), [template])).toEqual({
      slots: [],
      requested: false,
    })
    expect(reachableSlots(fixtureRecipe({ character: 'dark' }), [template])).toEqual({
      slots: ['downbeat', 'last-hit'],
      requested: true,
    })
  })

  it('counts only the variant that is actually selected, not every variant authored', () => {
    // Two variants at the same band and section. `selectPattern` takes the first by id in code
    // unit order and never the second, so the second's slots are not reachable — which is the
    // whole difference between this and grepping the template for slot names.
    const template = fixtureTemplate({
      patterns: [
        {
          id: 'a-kick-b2',
          forRole: 'kick',
          band: 2,
          length: 16,
          hits: [{ step: 1, slot: 'downbeat' }],
        },
        {
          id: 'b-kick-b2',
          forRole: 'kick',
          band: 2,
          length: 16,
          hits: [{ step: 1, slot: 'fill' }],
        },
      ],
    })
    const grepped = new Set(template.patterns.flatMap((p) => p.hits.map((h) => h.slot)))
    expect([...grepped].sort()).toEqual(['downbeat', 'fill'])
    expect(reachableSlots(fixtureRecipe(), [template]).slots).toEqual(['downbeat'])
  })

  it('reaches a band the section energy alone would not, because density leans it (§6.3)', () => {
    // One variant, at band 3. The fixture's busiest section is energy 0.9 → band 3 exactly, so
    // this passes at the neutral detent; drop the variant to band 1 and only a section at band 1,
    // or a leaned band 2, finds it. Both are walked, so both count.
    const only = (band: 0 | 1 | 2 | 3) =>
      fixtureTemplate({
        patterns: [
          { id: 'fx-kick', forRole: 'kick', band, length: 16, hits: [{ step: 1, slot: 'ghost' }] },
        ],
      })
    for (const band of [0, 1, 2, 3] as const) {
      expect(reachableSlots(fixtureRecipe(), [only(band)]).slots, `band ${band}`).toEqual(['ghost'])
    }
  })

  it('reports a recipe with no articulation at all as nothing, not as clean-by-accident', () => {
    const device = fixtureDevice({ recipes: [fixtureRecipe({ articulation: undefined })] })
    expect(deadArticulationSlots(device, [fixtureTemplate()])).toEqual([])
    expect(unpatternedArticulation(device, [fixtureTemplate()])).toEqual([])
  })
})

/**
 * §3.5/#314. The audit reports unreachable recipes, so the debt is found at authoring time rather
 * than by writing a script on purpose.
 *
 * `unrequestedRecipes` has existed since #81 and was used only by tests, which is why the number
 * could go unexamined for months: it took an ad-hoc script to turn up 28 dead `acid` recipes
 * (#283), and another to turn up 13 more. Both were closed by writing a direction. A debt nobody
 * can see is a debt nobody pays.
 */
describe('the audit surfaces unreachable recipes (#314)', () => {
  const report = formatAudit(
    DEVICES.map((device) => auditDevice(device)),
    false,
  )

  it('prints a REACH block with the count and the devices', () => {
    expect(report).toContain('REACH')
    const dead = DEVICES.flatMap((device) => unrequestedRecipes(device, TEMPLATES))
    expect(report).toMatch(new RegExp(`dead\\s+${String(dead.length)} recipes`))
    expect(report).toContain(`${String(new Set(dead.map((r) => r.deviceId)).size)} devices`)
  })

  it('names each one, so the line is actionable rather than a score', () => {
    // The list is the useful half: a count tells you there is work, a name tells you where.
    for (const ref of DEVICES.flatMap((d) => unrequestedRecipes(d, TEMPLATES)).slice(0, 12)) {
      expect(report, ref.recipeId).toContain(ref.deviceId)
      expect(report, ref.recipeId).toContain(`${ref.role} ${ref.character}`)
    }
  })

  /**
   * The audit is a report and never a gate — it always exits 0, because provisional values are
   * legal and shown honestly (invariant 5). This line is the same: an unreachable recipe is a
   * decision waiting to be made, not a build failure.
   */
  it('does not make the audit fail', () => {
    expect(report).toContain('TOTAL')
    expect(report.trimEnd().endsWith('more') || report.includes('REACH')).toBe(true)
  })
})
