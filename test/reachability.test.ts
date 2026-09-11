import { describe, expect, it } from 'vitest'
import {
  deadArticulationSlots,
  reachableSlots,
  resolve,
  unpatternedArticulation,
  unrequestedRecipes,
  type Device,
  type Recipe,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice, formatAudit } from '../scripts/audit-verified'
import { TEMPLATES, droneStudy, templateById } from '../lib/templates/index'
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
   * `first-hit` and `last-hit` exist in the shared vocabulary and, for a long time, exactly one
   * direction emitted them, for exactly one role each. Nine of the fourteen findings this check
   * first produced were a device reaching for one of those two slots on some other role. Hard
   * Techno now emits `first-hit` too, on the same role — a crash's entry gesture is what the slot
   * is for — and `last-hit` is still Industrial Techno's alone.
   */
  it('names the two slots only two directions emit, and the roles they emit them for', () => {
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
    expect([...(emitters.get('first-hit') ?? [])].sort()).toEqual([
      'hard-techno/impact',
      'industrial-techno/impact',
    ])
    expect([...(emitters.get('last-hit') ?? [])].sort()).toEqual(['industrial-techno/metallic'])
  })
})

// ---------------------------------------------------------------------------
// The two things it must not confuse with dead authoring
// ---------------------------------------------------------------------------

describe('#108 keeps the template-library gaps out of the findings', () => {
  it('says nothing about a recipe no direction can reach', () => {
    /**
     * **This was `acid`, then `crave-lead-dark`, and the changes are the point of keeping the
     * history.** The example here used to be *"`acid` is legal on five boxes and requested by no
     * direction"* — 28 recipes over 20 boxes, every slot on them unreachable, and none of it a
     * device-folder bug. #283 closed that by authoring `acid-lineage`, and the example moved to
     * `crave-lead-dark`: a `dark` lead where both directions requesting `lead` ask for `bright`,
     * which §3.5 excludes outright rather than ranking last. #538 deleted that recipe and its
     * twin on the minilogue xd as the two the library had no direction for and no case for
     * writing one — so a live example would now be a catalogue with nothing on the list, which
     * proves nothing about what the check does when something is.
     *
     * So the claim is carried by a fixture that is certain to keep carrying it. Three kicks on
     * one box, against a template asking for `hard`: the `hard` one articulates a slot the
     * template emits; the `dark` one — inside the radius, a candidate — articulates a slot it
     * never emits, which is the finding #108 exists to make; and the `soft` one is the refused
     * opposite and carries the *same* dead slot. The check must name the second and never the
     * third. Whatever `unrequestedRecipes` names is a template-library gap (#81), and it must not
     * also appear as dead authoring in a device folder.
     */
    const template = fixtureTemplate()
    expect(template.roles.find((r) => r.role === 'kick')?.character).toBe('hard')
    const kick = (id: string, character: 'hard' | 'dark' | 'soft', slot: 'downbeat' | 'fill') =>
      fixtureRecipe({ id, character, articulation: [{ slot, set: { velocity: 100 } }] })
    const device = fixtureDevice({
      recipes: [
        kick('fx-kick-hard', 'hard', 'downbeat'),
        kick('fx-kick-dark', 'dark', 'fill'),
        kick('fx-kick-soft', 'soft', 'fill'),
      ],
    })

    const unrequested = unrequestedRecipes(device, [template]).map((r) => r.recipeId)
    expect(unrequested).toEqual(['fx-kick-soft'])
    const findings = deadArticulationSlots(device, [template])
    expect(findings.map((f) => f.recipeId)).toEqual(['fx-kick-dark'])
    for (const found of findings) expect(unrequested).not.toContain(found.recipeId)

    // And the library, from the same side: nothing `unrequestedRecipes` names anywhere in it is
    // also a dead-slot finding. Not pinned to a recipe, because the healthy state of this list
    // is empty and #538 got it there.
    const libraryUnrequested = DEVICES.flatMap((d) => unrequestedRecipes(d, TEMPLATES)).map(
      (r) => r.recipeId,
    )
    for (const found of DEVICES.flatMap((d) => deadArticulationSlots(d, TEMPLATES))) {
      expect(libraryUnrequested).not.toContain(found.recipeId)
    }
    // The role that used to be the example, asserted from the other side: a direction asks for
    // it, so nothing about it is unreachable any more.
    expect(libraryUnrequested).not.toContain('crave-acid-dirty')
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

// ---------------------------------------------------------------------------
// #538 — what a resolve ever selects, which is a different question from what a request names
// ---------------------------------------------------------------------------

/**
 * #538's predicate, run as it was measured: every device solo, every shipped direction, seeds
 * 1-4 — 2,024 resolves at forty-six boxes and eleven directions when it was measured, 2,208 at
 * twelve. A `(role, character)` pair is *selected* if any of those resolves assigns a recipe
 * authored on it.
 *
 * Solo rigs are the generous case, and that is why they are the case: with one box the resolver
 * has nothing carrying the requested character and §3.5 substitutes into the neighbours, where a
 * large rig finds the exact one and substitutes less. It is the issue's measurement, not a proof
 * about every rig somebody could build.
 *
 * **Selected is not requested.** `unrequestedRecipes` above asks which pairs no direction names,
 * and the answer was 44; substitution reaches fifteen of those, so the first figure overstates
 * the problem — `snare / hard` is named by nothing and reached by everything. The other way round
 * is the one this block exists for: a pair a direction *could* reach and never does, because a
 * closer one is always there. `tom / hard` sat at sqrt(2) from both toms the library asked for
 * and lost every time, on eight boxes, until Hard Techno named it.
 */
function selectedPairs(): { authored: Map<string, number>; selected: Set<string> } {
  const authored = new Map<string, number>()
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      const pair = `${recipe.role} / ${recipe.character}`
      authored.set(pair, (authored.get(pair) ?? 0) + 1)
    }
  }
  const selected = new Set<string>()
  for (const device of DEVICES) {
    for (const template of TEMPLATES) {
      for (const seed of [1, 2, 3, 4]) {
        const { assignments } = resolve({ devices: [device], template, seed })
        // `a.role` is the request's; `a.recipe.character` is the one authored, which for a
        // substitution is not the one asked for — and the authored pair is the one in question.
        for (const a of assignments) selected.add(`${a.role} / ${a.recipe.character}`)
      }
    }
  }
  return { authored, selected }
}

describe('#538 Acid Lineage asks for a clean sub, and a resolve can now select one', () => {
  const acid = templateById('acid-lineage')
  if (acid === undefined) throw new Error('acid-lineage missing from the templates')
  const request = acid.roles.find((r) => r.id === 'r-sub')
  if (request === undefined) throw new Error('acid-lineage has no r-sub')

  it('asks for `sub` as `clean`', () => {
    // Every other direction with a sub asks for `dark`, and all thirty-nine boxes that author
    // a sub author a dark one — so `clean` was authored on eight of them and selected on none.
    // Pinned so that a second direction moving to `clean` shows up here as the count changing.
    expect(request.character).toBe('clean')
    const subs = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'sub').map((r) => `${t.id}:${r.character}`),
    )
    expect(subs.filter((s) => s.endsWith(':clean'))).toEqual(['acid-lineage:clean'])
  })

  it('selects `sub / clean` somewhere in the solo sweep, and loses no pair that was selected before', () => {
    const { authored, selected } = selectedPairs()
    expect(selected.has('sub / clean')).toBe(true)
    // The ledger as #538 measured it: 86 authored pairs, 25 never selected, 59 recipes behind
    // them. It was 87, 29 and 82 when the issue was filed; `sub / clean` left by being asked for
    // and `lead / dark` by its two recipes being deleted (#539), and `tom / hard` and
    // `lead / dirty` left when Hard Techno asked for both. A pair leaving this list is progress;
    // a pair joining it is the finding coming back, and the failure names which.
    //
    // **26 and 62 since #541, and that is a pair joining.** `tom / soft` was reachable only as a
    // substitution on the one box whose sole tom was soft; `ct-tom-hard` answers that box's tom
    // requests exactly now, so nothing selects a soft tom anywhere. Worth being plain about: the
    // trade was a real `no-recipe` closed against a pair going dark, and it is the right trade,
    // but it is not this list getting shorter.
    const never = [...authored.keys()].filter((pair) => !selected.has(pair)).sort()
    expect(never).toEqual([
      'arp / dark',
      'bass-mid / bright',
      'bass-mid / clean',
      'bass-mid / hard',
      'bass-mid / soft',
      'clap / soft',
      'lead / hard',
      'lead / soft',
      'metallic / hard',
      'noise / bright',
      'noise / dark',
      'noise / hard',
      'noise / soft',
      'pad / bright',
      'pad / dark',
      'pad / dirty',
      'pad / hard',
      'stab / bright',
      'stab / clean',
      'stab / dark',
      'stab / dirty',
      'sub / dirty',
      'sub / hard',
      'sub / soft',
      'texture / dirty',
      // #541. Joined when `ct-tom-hard` was authored to close Hard Techno's `no-recipe` on the
      // Circuit Tracks. No direction asks for a soft tom, so this pair was only ever reached by
      // §3.5 substitution — and that box, whose only tom was soft, was the last place it won one.
      // The Rytm's and the DFAM's soft toms lose their tie-breaks to an exact answer elsewhere.
      'tom / soft',
    ])
    expect(authored.size).toBe(86)
    // 62 since #541: `tom / soft` joined carrying its three recipes (the Rytm, the DFAM and the
    // Circuit Tracks). `authored.size` is unchanged at 86, because `tom / hard` was authored on
    // eight boxes already and a ninth adds no pair — which is why recipes-behind is the number
    // worth pinning beside it. A pair can go dark with the pair count saying nothing at all.
    expect(never.reduce((n, pair) => n + (authored.get(pair) ?? 0), 0)).toBe(62)
  })

  it('moves three solo rigs from the dark sub to the clean one, and no other', () => {
    // The five mono synths that author a clean sub put their one voice on the acid line, so the
    // three boxes with a voice to spare are where the change is audible. Asserted as the pick
    // rather than as reachability, because the pick is what the reader is told to build.
    for (const [deviceId, recipeId] of [
      ['arturia-microfreak', 'mf-sub-clean'],
      ['korg-minilogue-xd', 'mxd-sub-clean'],
      ['moog-muse', 'muse-sub-clean'],
    ] as const) {
      const { assignments } = resolve({ devices: [deviceById(deviceId)], template: acid, seed: 1 })
      expect(assignments.find((a) => a.requestId === 'r-sub')?.recipe.id, deviceId).toBe(recipeId)
    }
    // A box with only a dark sub keeps the part, as a substitution the guide names — `dark` is
    // at sqrt(2) from `clean` (§3.4), never refused.
    const { assignments } = resolve({
      devices: [deviceById('elektron-digitakt')],
      template: acid,
      seed: 1,
    })
    const sub = assignments.find((a) => a.requestId === 'r-sub')
    expect(sub?.recipe.id).toBe('dt-sub-dark')
  })

  it('drops no sub for want of a recipe: every solo shortfall on the part is the rig, not authoring', () => {
    // The one opposite in the library is the Subsequent 37's `dirty` sub, and it sits beside a
    // dark one — so no box lost its only candidate. A `no-recipe` here would mean one had. The
    // two reasons left are the rig's: a mono box whose voice went to the acid line, and a box
    // with no voice that plays a sub at all.
    for (const device of DEVICES) {
      const { shortfalls } = resolve({ devices: [device], template: acid, seed: 1 })
      const sub = shortfalls.find((s) => s.requestId === 'r-sub')
      if (sub !== undefined) expect(sub.reason, device.id).not.toBe('no-recipe')
    }
  })
})
