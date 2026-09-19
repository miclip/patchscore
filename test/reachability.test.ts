import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  MAX_SUBSTITUTION_DISTANCE_SQ,
  characterDistanceSq,
  deadArticulationSlots,
  expandAll,
  moodState,
  reachableSlots,
  resolve,
  resolveCharacter,
  unpatternedArticulation,
  unrequestedRecipes,
  type Character,
  type Device,
  type Recipe,
  type Template,
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
   * is for. Ambient Dub emits it too since #57, still on `impact`: the step that starts a swell
   * is the same entry gesture at the other pole of the force axis. `last-hit` is still Industrial
   * Techno's alone.
   */
  it('names the two slots only three directions emit, and the one role they emit them for', () => {
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
      'ambient-dub/impact',
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
    // **23 and 54 since #538's tom fill; 24 and 57 after its noise wash; 25 and 58 after its
    // clap; 26 and 62 before that, and #541's was a pair joining.** `tom / soft` was reachable only as a substitution on the one
    // box whose sole tom was soft; `ct-tom-hard` answers that box's tom requests exactly now, so
    // nothing selects a soft tom anywhere. Worth being plain about: the trade was a real
    // `no-recipe` closed against a pair going dark, and it is the right trade, but it is not
    // this list getting shorter.
    //
    // 23 and 54 still, since #57 gave the library a soft impact. `authored.size` moves to 87,
    // the first pair the library has carried on `impact` that is not `hard`, and it does not
    // join this list: the Digitakt II authors it, Ambient Dub asks for it, and a solo Digitakt
    // II selects it on every seed below. The box matters. On a mono synth the one voice goes to
    // the pad at priority 1 for the whole track, a transient cannot share it, and the pair would
    // sit on this list while being asked for, which is the finding the list exists to catch. A
    // sixteen-track sampler has a track to spare after the top eleven.
    expect(selected.has('impact / soft')).toBe(true)
    const never = [...authored.keys()].filter((pair) => !selected.has(pair)).sort()
    expect(never).toEqual([
      'arp / dark',
      'bass-mid / bright',
      'bass-mid / clean',
      'bass-mid / hard',
      'bass-mid / soft',
      'lead / hard',
      'lead / soft',
      'metallic / hard',
      'noise / bright',
      'noise / dark',
      'noise / hard',
      'pad / bright',
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
    ])
    expect(authored.size).toBe(87)
    // **54 since #538 gave Breakbeat a `tom / soft` fill.** The three recipes #541 watched go
    // dark — the Rytm's, the DFAM's and the Circuit Tracks' — are back off the list by the shape
    // the list rewards: a direction asking. The Rytm's is selected exactly; the other two boxes
    // have no voice to spare for an optional part after their four drums, and stay dark by the
    // rig rather than by the library, which is the honest state for them.
    //
    // It was 57 since #538 gave Ambient Dub a `noise / soft`. One recipe left the list, the TR-6S's
    // *Open hat opened out into a wash* — the only soft noise in the library, and the second
    // pair this list has lost to a direction asking rather than a recipe being deleted.
    //
    // It was 58 since #538 gave Hip-Hop a `clap / soft`: four recipes left the list — the
    // RD-8's, the RD-9's, the TR-1000's and the TR-8S's, which all describe the same part in the
    // same words and which no direction had asked for. A pair leaving because a direction now
    // wants it is the shape this list exists to reward.
    //
    // It was 62 since #541: `tom / soft` joined carrying its three recipes (the Rytm, the DFAM and the
    // Circuit Tracks). `authored.size` is unchanged at 86, because `tom / hard` was authored on
    // eight boxes already and a ninth adds no pair — which is why recipes-behind is the number
    // worth pinning beside it. A pair can go dark with the pair count saying nothing at all.
    //
    // **22 and 44 since Drum and Bass asked for a dark pad.** `pad / dark` carried ten recipes,
    // more than any other pair on this list, and it left by the shape the list rewards: a second
    // direction asking, at p5, and two boxes with a voice to spare after the sub landing it at
    // neutral. `authored.size` is unchanged at 87.
    expect(never.reduce((n, pair) => n + (authored.get(pair) ?? 0), 0)).toBe(44)
  })

  it('selects the soft impact on a solo Digitakt II, on every measured seed (#57)', () => {
    // The pair's one recipe, on the one box that authors it, picked by the resolver with
    // nothing else on the rig. Asserted as the pick, since the pick is what the reader is told
    // to build, and on all four of #538's seeds so a seed-dependent tie cannot hide a miss.
    const dub = templateById('ambient-dub')
    if (dub === undefined) throw new Error('ambient-dub missing from the templates')
    for (const seed of [1, 2, 3, 4]) {
      const { assignments } = resolve({
        devices: [deviceById('elektron-digitakt-ii')],
        template: dub,
        seed,
      })
      expect(assignments.find((a) => a.requestId === 'r-impact')?.recipe.id, `seed ${String(seed)}`).toBe(
        'dt2-impact-soft',
      )
    }
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

/**
 * #538, the third pair. **A request whose priority was measured rather than felt**, and the
 * measurement is what this block pins: the one box that authors a soft noise has six fixed
 * voices, and the one that takes `noise` also takes `texture` and `ride`, both asked for at 3.
 * At 3 the wash wins the voice on the box's own role order (§7.1's role-fit key); at 4 it loses
 * to the texture; as an `optional` request it loses the same tie, because an optional miss ranks
 * below a required one. Two of those three shapes reach nothing, and a direction asking for a
 * pair nothing can select is the finding this file exists to make.
 */
describe('#538 Ambient Dub asks for a soft noise, and the one box that wrote it plays it', () => {
  const dub = templateById('ambient-dub')
  if (dub === undefined) throw new Error('ambient-dub missing from the templates')
  const request = dub.roles.find((r) => r.id === 'r-noise')
  if (request === undefined) throw new Error('ambient-dub has no r-noise')
  const tr6s = deviceById('roland-tr-6s')

  /** The same request at another priority, or another shape, for the measurement. */
  const shaped = (over: Partial<typeof request>) => ({
    ...dub,
    roles: dub.roles.map((r) => (r.id === 'r-noise' ? { ...r, ...over } : r)),
  })

  it('asks for `noise` as `soft`, at priority 3, and is the only direction that asks for it soft', () => {
    expect(request.priority).toBe(3)
    expect(request.character).toBe('soft')
    expect(request.optional).toBeUndefined()
    const noises = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'noise').map((r) => `${t.id}:${r.character}`),
    )
    expect(noises.filter((n) => n.endsWith(':soft'))).toEqual(['ambient-dub:soft'])
  })

  it('selects `noise / soft` in the solo sweep, and only on the box that authored it', () => {
    const { selected } = selectedPairs()
    expect(selected.has('noise / soft')).toBe(true)
    // Ninety-six fills over 46 boxes x 4 seeds: four exact, the rest `dirty` at sqrt(2). Pinned
    // by character rather than by box, because a second soft noise landing anywhere is the
    // number that should move first.
    const picked = new Map<string, number>()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        const { assignments } = resolve({ devices: [device], template: dub, seed })
        const noise = assignments.find((a) => a.requestId === 'r-noise')
        if (noise === undefined) continue
        picked.set(noise.recipe.character, (picked.get(noise.recipe.character) ?? 0) + 1)
      }
    }
    expect([...picked].sort()).toEqual([
      ['dirty', 92],
      ['soft', 4],
    ])
    for (const seed of [1, 2, 3, 4]) {
      const { assignments } = resolve({ devices: [tr6s], template: dub, seed })
      expect(assignments.find((a) => a.requestId === 'r-noise')?.recipe.id, `seed ${seed}`).toBe(
        'tr6s-noise-soft',
      )
    }
  })

  it('takes that voice from the texture at 3, and would lose it at 4 or as an optional part', () => {
    // The cost, stated: the wash and the loop texture want the same voice on this box, and the
    // wash wins because the box's author listed `noise` ahead of `texture` on it. That is the
    // objective's role-fit key deciding a tie at equal priority and equal distance (§7.1).
    const at3 = resolve({ devices: [tr6s], template: dub, seed: 1 })
    expect(at3.shortfalls.find((s) => s.requestId === 'r-texture')?.reason).toBe('no-room')
    expect(at3.shortfalls.find((s) => s.requestId === 'r-ride')?.reason).toBe('no-room')

    // At 4 the texture outranks it and the pair goes dark again on the only box that has it.
    const at4 = resolve({ devices: [tr6s], template: shaped({ priority: 4 }), seed: 1 })
    expect(at4.assignments.find((a) => a.requestId === 'r-noise')).toBeUndefined()
    expect(at4.assignments.find((a) => a.requestId === 'r-texture')?.recipe.id).toBe('tr6s-texture-soft')

    // And `optional` at 3 loses the same tie, because an optional miss ranks below a required
    // one — which is why the request is `inessential` and not `optional`.
    const optional = resolve({
      devices: [tr6s],
      template: shaped({ optional: true, inessential: { reason: 'measured, not authored' } }),
      seed: 1,
    })
    expect(optional.assignments.find((a) => a.requestId === 'r-noise')).toBeUndefined()
    expect(optional.assignments.find((a) => a.requestId === 'r-texture')?.recipe.id).toBe(
      'tr6s-texture-soft',
    )
  })

  it('drops no noise for want of a recipe: `hard` is the one refused opposite, and it sits beside a dirty one', () => {
    // The MicroFreak's `hard` noise is the only opposite in the library, and that box authors a
    // dirty one too — so no box lost its only candidate to §3.5's refusal. The reasons left are
    // the rig's: a voice that went to a part ranked above, or no voice that plays a noise.
    for (const device of DEVICES) {
      const { shortfalls } = resolve({ devices: [device], template: dub, seed: 1 })
      const noise = shortfalls.find((s) => s.requestId === 'r-noise')
      if (noise !== undefined) expect(noise.reason, device.id).not.toBe('no-recipe')
    }
  })
})

/**
 * #538, the fourth pair, and the cheapest shape a request can have: `optional`, priority 4,
 * transient over three sections. Three boxes authored a soft tom and every one of them says
 * *fill* in its title; no direction had a fill for a tom that was not `dark`, `bright` or `hard`,
 * and `hard` is the refused opposite. The direction whose drums are the piece asks now.
 */
describe('#538 Breakbeat asks for a soft tom fill, and the box with a spare tom voice plays it', () => {
  const bk = templateById('breakbeat')
  if (bk === undefined) throw new Error('breakbeat missing from the templates')
  const request = bk.roles.find((r) => r.id === 'r-tom')
  if (request === undefined) throw new Error('breakbeat has no r-tom')
  const rytm = deviceById('elektron-analog-rytm-mkii')

  it('asks for `tom` as `soft`, optional, in the three sections where the full break plays', () => {
    expect(request.character).toBe('soft')
    expect(request.priority).toBe(4)
    expect(request.optional).toBe(true)
    expect(request.inessential).toBeDefined()
    expect(request.sections).toEqual(['First Drop', 'Second Drop', 'Rollout'])
    // Every tom in the library follows the key (#339), and a fill under a bass holding one note
    // for two bars is the case that rule was written for.
    expect(request.followsKey).toBe(true)
    const toms = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'tom').map((r) => `${t.id}:${r.character}`),
    )
    expect(toms.filter((n) => n.endsWith(':soft'))).toEqual(['breakbeat:soft'])
  })

  it('emits `fill` on every band, in the closing beat, which is the slot all three recipes articulate', () => {
    const variants = bk.patterns.filter((p) => p.forRole === 'tom')
    expect(variants.map((p) => p.band).sort()).toEqual([0, 1, 2, 3])
    for (const pattern of variants) {
      expect(pattern.length, pattern.id).toBe(32)
      const fills = pattern.hits.filter((h) => h.slot === 'fill')
      expect(fills.length, pattern.id).toBeGreaterThan(0)
      // "A 16th run in the closing beat of the variant" — the last four steps and nowhere else.
      for (const hit of fills) expect(hit.step, `${pattern.id} step ${hit.step}`).toBeGreaterThan(28)
      // And never the backbeat: the snare owns that slot in this direction.
      expect(pattern.hits.some((h) => h.slot === 'backbeat'), pattern.id).toBe(false)
    }
    for (const [deviceId, recipeId] of [
      ['elektron-analog-rytm-mkii', 'rytm-tom-soft'],
      ['moog-dfam', 'dfam-tom-soft'],
      ['novation-circuit-tracks', 'ct-tom-soft'],
    ] as const) {
      const slots = (recipeById(deviceById(deviceId), recipeId).articulation ?? []).map((a) => a.slot)
      expect(slots, recipeId).toContain('fill')
    }
  })

  it('selects `tom / soft` on the Rytm at every seed, and displaces nothing on any box', () => {
    const { selected } = selectedPairs()
    expect(selected.has('tom / soft')).toBe(true)
    for (const seed of [1, 2, 3, 4]) {
      const { assignments } = resolve({ devices: [rytm], template: bk, seed })
      const tom = assignments.find((a) => a.requestId === 'r-tom')
      expect(tom?.recipe.id, `seed ${seed}`).toBe('rytm-tom-soft')
      // Its own tom voice, after the four drums the direction ranks above it are placed — the
      // reason priority 4 is enough here where Ambient Dub's wash needed 3.
      expect(assignments.map((a) => a.requestId).sort()).toEqual([
        'r-closed-hat',
        'r-kick',
        'r-rim',
        'r-snare',
        'r-tom',
      ])
    }
    // Eighty fills over 46 boxes x 4 seeds: four exact, the rest `dark` or `bright` at sqrt(2).
    // The two other boxes that author a soft tom have no voice to spare for an optional part
    // after their drums, so they stay dark by the rig, not by the library.
    const picked = new Map<string, number>()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        const { assignments } = resolve({ devices: [device], template: bk, seed })
        const tom = assignments.find((a) => a.requestId === 'r-tom')
        if (tom === undefined) continue
        picked.set(tom.recipe.character, (picked.get(tom.recipe.character) ?? 0) + 1)
      }
    }
    expect([...picked].sort()).toEqual([
      ['bright', 22],
      ['dark', 54],
      ['soft', 4],
    ])
  })

  it('costs no other request its part: an optional fill at the bottom of the list moves nothing above it', () => {
    // Asserted against the direction with the request removed, box by box and seed by seed:
    // every other assignment is identical. That is what `optional` promises the search and what
    // priority 4 promises the reader, and it is the difference between this request and the
    // Ambient Dub wash, which displaced a texture, two sweeps and a riser.
    const without = { ...bk, roles: bk.roles.filter((r) => r.id !== 'r-tom') }
    const others = (t: typeof bk, device: Device, seed: number) =>
      resolve({ devices: [device], template: t, seed })
        .assignments.filter((a) => a.requestId !== 'r-tom')
        .map((a) => `${a.requestId}=${a.recipe.id}`)
        .sort()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        expect(others(bk, device, seed), `${device.id} seed ${seed}`).toEqual(others(without, device, seed))
      }
    }
  })
})

describe('#57 Industrial Techno asks for a dark sweep, and the boxes that wrote one play it', () => {
  const techno = templateById('industrial-techno')
  if (techno === undefined) throw new Error('industrial-techno missing from the templates')
  const request = techno.roles.find((r) => r.id === 'r-sweep')
  if (request === undefined) throw new Error('industrial-techno has no r-sweep')

  it('asks for `sweep` as `dark`, at priority 5, transient on the Intro and the Outro', () => {
    // `sweep / dark` was the second-largest unasked block #57 measured: eleven recipes on eleven
    // boxes, reachable only as a substitution for the `soft` the two ambient directions ask for.
    // The Intro and Outro are the one band pair in this direction with no transient on it, so
    // the six sections still program as three, and the three gestures can take turns on one
    // voice. Not `optional`: measured, it changes nothing on any solo rig, so the field would
    // only say the direction would rather not spend a voice on it, and where one is free it would.
    expect(request.character).toBe('dark')
    expect(request.priority).toBe(5)
    expect(request.optional).toBeUndefined()
    expect(request.inessential).toBeDefined()
    expect(request.sustain).toBe('transient')
    expect(request.sections).toEqual(['Intro', 'Outro'])
    const sweeps = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'sweep').map((r) => `${t.id}:${r.character}`),
    )
    expect(sweeps.filter((n) => n.endsWith(':dark'))).toEqual(['industrial-techno:dark'])
  })

  it('selects `sweep / dark` in the solo sweep, on the three boxes with a voice to spare at priority 5', () => {
    // Sixty fills over 46 boxes x 4 seeds: twelve exact, the rest `soft` at sqrt(2). Eight of
    // the eleven boxes that author the dark one are mono synths whose voice is spent at
    // priority 1 on a solo rig — the #538 arithmetic — but a transient asked for in two sections
    // is not a continuous part: beside a drum machine, the Crave, the Model D and the Mother-32
    // each take it exactly, chained on the one voice with the riser and the impact.
    const picked = new Map<string, number>()
    const exact = new Set<string>()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        const { assignments } = resolve({ devices: [device], template: techno, seed })
        const sweep = assignments.find((a) => a.requestId === 'r-sweep')
        if (sweep === undefined) continue
        picked.set(sweep.recipe.character, (picked.get(sweep.recipe.character) ?? 0) + 1)
        if (sweep.recipe.character === 'dark') exact.add(device.id)
      }
    }
    expect([...picked].sort()).toEqual([
      ['dark', 12],
      ['soft', 48],
    ])
    expect([...exact].sort()).toEqual([
      'elektron-digitone-ii',
      'elektron-octatrack-mkii',
      'polyend-play-plus',
    ])
  })

  it('costs no other request its part on any solo rig', () => {
    // Asserted against the direction with the request removed, box by box and seed by seed:
    // every other assignment is identical. The same request on the Breakdown and Outro was
    // measured first and displaced the optional `noise` on two boxes, because there it overlapped
    // the riser and could not share its voice; on the Intro and Outro it moves nothing.
    const without = { ...techno, roles: techno.roles.filter((r) => r.id !== 'r-sweep') }
    const others = (t: typeof techno, device: Device, seed: number) =>
      resolve({ devices: [device], template: t, seed })
        .assignments.filter((a) => a.requestId !== 'r-sweep')
        .map((a) => `${a.requestId}=${a.recipe.id}`)
        .sort()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        expect(others(techno, device, seed), `${device.id} seed ${seed}`).toEqual(others(without, device, seed))
      }
    }
  })
})

// ---------------------------------------------------------------------------
// #538 — the eight pairs that had never been decided, declined with the evidence
// ---------------------------------------------------------------------------

/**
 * #538's ledger stands at 23 pairs / 54 recipes. Fifteen of those carry a written decision in
 * #560 or #562; these eight carried none anywhere in the repository, only a row in a pull
 * request body that reasoned about them without resolving anything. This block is the decision
 * for all eight, and every claim in it is measured: each authoring box solo, under every
 * direction that requests the role, on seeds 1-4, with the outcome pinned — the exact sibling
 * that wins the part where the part lands, and the higher-ranked request holding the voice
 * where it does not.
 *
 * **All eight are declined, and no template or recipe changes.** The verdict was the likely one
 * from the arithmetic — every recipe is on a box that expands to one assignable — and the value
 * is in the reasons, which differ:
 *
 *   - *Geometry.* The box has one voice. Where the role is ranked below a sub, kick, pad,
 *     bass-mid or acid request, that request takes the voice first and the role is a
 *     `no-room/contended` gap whatever character it asked for. Where the role *is* ranked first,
 *     the box authors the requested character exactly, and §3.5 has nothing to substitute for.
 *   - *Not rescued by §3.5.* Substitution reaches a pair only when the request is within sqrt(2)
 *     of it **and** nothing nearer is on the box **and** the voice is free. For every one of the
 *     eight, at least one of those fails on every direction, and which one is said per pair.
 *   - *Not rescued by the mood knobs either, with one exception worth stating.* `resolveCharacter`
 *     moves a request along tone and grit and never force, so no knob can make any direction ask
 *     for `hard` or `soft`: six of the eight are unreachable by construction. `noise / dark` is
 *     knob-reachable as a request and still loses the voice. **`bass-mid / clean` is reached** —
 *     grit at 0 re-pins Lydian House's and Relay's dark p1 bass to `clean`, and both boxes'
 *     clean recipes are selected. It stays on the ledger because the ledger is measured neutral,
 *     and it is the one of the eight that is *retained* rather than recommended for deletion:
 *     the same shape #562 found for `acid / dirty`.
 *   - *Absent direction versus geometry.* Three pairs describe a part a direction could plausibly
 *     want (`lead / soft`, `sub / soft`, `noise / dark`) and would still not land on the box that
 *     wrote it, because the box's voice is spent above the role. That is a content finding for
 *     #57, recorded as such, and not a reason to bend any direction that exists.
 *
 * Where a recipe has no musical owner the record used to recommend deletion **later**. **The
 * operator has now decided, and the answer is to keep them** (#538): the work is correct and
 * cited, a direction or a device that has not been written yet could reach any of it, and a
 * ledger that says plainly *nobody reaches this* is the honest version of the same fact. What
 * deletion would buy is a tidier audit; what it would cost is authored work and the evidence
 * behind it.
 *
 * So the twenty-two are kept and this file is their record. The price is stated rather than
 * hidden: `npm run audit` counts recipes no guide reaches, and #57's coverage table is that much
 * more optimistic than a reader's rig will be.
 */
// The per-pair decision records below share one helper set. `outcome` is the whole method:
// one request, one box solo, every seed, and one answer or a thrown seed-variance.

const SEEDS = [1, 2, 3, 4]

/** Every recipe in the library authored on this pair, as `device:recipe`. */
const authoring = (pair: string) => {
  const [role, character] = pair.split(' / ')
  return DEVICES.flatMap((d) =>
    d.recipes.filter((r) => r.role === role && r.character === character).map((r) => `${d.id}:${r.id}`),
  ).sort()
}

const template = (id: string): Template => {
  const found = templateById(id)
  if (found === undefined) throw new Error(`${id} missing from the templates`)
  return found
}

/**
 * What one request gets on one box solo, on every seed, with the mood neutral. `landed:` names
 * the recipe that took the part; `held:` names the request holding the voice when it did not.
 * Asserted seed by seed rather than once, so a tie the seed permutes cannot hide a miss.
 */
const outcome = (deviceId: string, templateId: string, requestId: string, mood?: ReturnType<typeof moodState>) => {
  const t = template(templateId)
  const seen = new Set<string>()
  for (const seed of SEEDS) {
    const { assignments, shortfalls } = resolve({ devices: [deviceById(deviceId)], template: t, mood, seed })
    const a = assignments.find((x) => x.requestId === requestId)
    if (a !== undefined) {
      seen.add(`landed:${a.recipe.id}`)
      continue
    }
    const gap = shortfalls.find((x) => x.requestId === requestId)
    if (gap === undefined) throw new Error(`${templateId}/${requestId} neither assigned nor a shortfall on ${deviceId}`)
    const because = gap.reason === 'no-room' ? `/${gap.because}` : ''
    const held = assignments.map((x) => x.requestId).sort().join('+')
    seen.add(`${gap.reason}${because} held:${held}`)
  }
  const [only] = seen
  if (seen.size !== 1 || only === undefined) {
    throw new Error(`${deviceId} ${templateId}/${requestId} varies by seed: ${[...seen].join(' | ')}`)
  }
  return only
}

/** The `device:recipe` spelling `authoring` returns, for a list of recipe ids the record names. */
const spelled = (recipes: readonly string[]) =>
  recipes.map((id) => `${DEVICES.find((d) => d.recipes.some((r) => r.id === id))?.id}:${id}`).sort()

/** The boxes behind a set of pairs, each once, sorted by code unit. */
const boxesBehind = (pairs: Record<string, readonly string[]>) =>
  [...new Set(Object.keys(pairs).flatMap((pair) => authoring(pair).map((s) => s.slice(0, s.indexOf(':')))))].sort()

/** One box's row of a pinned matrix: the direction's outcome at neutral, at 0 and at 100. */
type PinnedMatrix = Record<string, Record<string, Record<string, readonly [string, string, string]>>>

/** A pinned matrix with one cell per row: the neutral outcome alone. */
type PinnedNeutral = Record<string, Record<string, Record<string, string>>>

/**
 * The rows a pinned matrix over these pairs must have, derived from the live library: for every
 * role the pairs name, every box authoring one of those pairs, under every direction requesting
 * the role. A matrix is checked against this, never only against itself, so a box or a direction
 * added later fails here rather than going unmeasured.
 */
function expectedRows(pairs: Record<string, readonly string[]>) {
  const roles = [...new Set(Object.keys(pairs).map((pair) => pair.slice(0, pair.indexOf(' /'))))].sort()
  return roles.map((role) => {
    const boxes = [
      ...new Set(
        Object.keys(pairs)
          .filter((pair) => pair.startsWith(`${role} /`))
          .flatMap((pair) => authoring(pair).map((x) => x.slice(0, x.indexOf(':')))),
      ),
    ].sort()
    const asking = TEMPLATES.flatMap((t) => {
      const request = t.roles.find((r) => r.role === role)
      return request === undefined ? [] : [{ templateId: t.id, requestId: request.id }]
    })
    return { role, boxes, asking }
  })
}

/** The key-set half of a matrix check: exactly these roles, these boxes per role, these directions per box. */
function expectKeys(rows: ReturnType<typeof expectedRows>, matrix: Record<string, Record<string, Record<string, unknown>>>) {
  expect(Object.keys(matrix).sort()).toEqual(rows.map((r) => r.role))
  for (const { role, boxes, asking } of rows) {
    expect(Object.keys(matrix[role] ?? {}).sort(), role).toEqual(boxes)
    for (const box of boxes) {
      expect(Object.keys(matrix[role]?.[box] ?? {}).sort(), `${role} ${box}`).toEqual(asking.map((a) => a.templateId).sort())
    }
  }
}

/**
 * A pinned matrix, checked exhaustively against the live library rather than only against
 * itself: the keys as `expectKeys`, and every cell as `outcome`'s answer at neutral and at the
 * two ends of `axis` — with the quarter detents asserted to equal neutral, since the re-pin
 * tables in each block prove they move nothing. Returns the number of box×direction rows
 * walked, for the caller to pin.
 */
function checkMatrix(pairs: Record<string, readonly string[]>, matrix: PinnedMatrix, axis: 'darkness' | 'grit'): number {
  const rows = expectedRows(pairs)
  expectKeys(rows, matrix)
  let walked = 0
  for (const { role, boxes, asking } of rows) {
    for (const box of boxes) {
      for (const { templateId, requestId } of asking) {
        const [neutral, at0, at100] = matrix[role]?.[box]?.[templateId] ?? ['', '', '']
        const where = `${role} ${box} ${templateId} ${axis}`
        expect(outcome(box, templateId, requestId), `${where} neutral`).toBe(neutral)
        expect(outcome(box, templateId, requestId, moodState({ [axis]: 0 })), `${where} 0`).toBe(at0)
        expect(outcome(box, templateId, requestId, moodState({ [axis]: 100 })), `${where} 100`).toBe(at100)
        expect(outcome(box, templateId, requestId, moodState({ [axis]: 25 })), `${where} 25`).toBe(neutral)
        expect(outcome(box, templateId, requestId, moodState({ [axis]: 75 })), `${where} 75`).toBe(neutral)
        walked += 1
      }
    }
  }
  return walked
}

/** As `checkMatrix`, for a matrix pinned at neutral only. */
function checkNeutral(pairs: Record<string, readonly string[]>, matrix: PinnedNeutral): number {
  const rows = expectedRows(pairs)
  expectKeys(rows, matrix)
  let walked = 0
  for (const { role, boxes, asking } of rows) {
    for (const box of boxes) {
      for (const { templateId, requestId } of asking) {
        expect(outcome(box, templateId, requestId), `${role} ${box} ${templateId}`).toBe(matrix[role]?.[box]?.[templateId] ?? '')
        walked += 1
      }
    }
  }
  return walked
}

describe('#538 the eight pairs no decision had been written for, declined with the evidence', () => {
  /** The pairs and the recipes behind them, exactly as the ledger carries them. */
  const EIGHT: Record<string, readonly string[]> = {
    'bass-mid / clean': ['minitaur-bass-mid-clean', 'sub37-bass-mid-clean'],
    'bass-mid / soft': ['sub37-bass-mid-soft'],
    'lead / soft': ['mf-lead-soft', 'subh-lead-soft'],
    'noise / dark': ['cascadia-noise-dark'],
    'noise / hard': ['mf-noise-hard'],
    'pad / hard': ['mxd-pad-hard'],
    'sub / hard': ['minitaur-sub-hard'],
    'sub / soft': ['minitaur-sub-soft'],
  }

  it('pins the eight pairs, the ten recipes behind them, and that every one is on a one-assignable box', () => {
    for (const [pair, recipes] of Object.entries(EIGHT)) expect(authoring(pair), pair).toEqual(spelled(recipes))
    expect(Object.values(EIGHT).flat()).toHaveLength(10)
    // Six boxes, and each expands to exactly one assignable. The nominal polyphony varies —
    // Minitaur and Cascadia 1, Subsequent 37 2, MicroFreak and minilogue xd 4, Subharmonicon
    // 6 — and none of it matters to the question: a stack of four notes on the minilogue xd
    // is still one resolver voice, so a pad on it and a sub on it are the same voice asked for
    // twice, and the higher-ranked request gets it.
    const boxes = boxesBehind(EIGHT)
    expect(boxes).toEqual([
      'arturia-microfreak',
      'intellijel-cascadia',
      'korg-minilogue-xd',
      'moog-minitaur',
      'moog-subharmonicon',
      'moog-subsequent-37',
    ])
    for (const id of boxes) expect(expandAll([deviceById(id)]), id).toHaveLength(1)
  })

  it('leaves all eight on the never-selected ledger, and no direction asks for any of them', () => {
    const { selected } = selectedPairs()
    for (const pair of Object.keys(EIGHT)) expect(selected.has(pair), pair).toBe(false)
    const asked = new Set(TEMPLATES.flatMap((t) => t.roles.map((r) => `${r.role} / ${r.character}`)))
    for (const pair of Object.keys(EIGHT)) expect(asked.has(pair), pair).toBe(false)
  })

  it('`bass-mid / clean` and `bass-mid / soft`: the bass lands only at p1, and then the dark sibling wins exactly', () => {
    // Five directions ask for a bass-mid. The two that rank it first get it, as `dark`, and
    // both boxes author a dark bass — so the exact answer wins and neither `clean` (sqrt(2)
    // from `dark`) nor `soft` (sqrt(2) from everything) is consulted. The three that rank it
    // second lose the voice to the sub at p1, except Major-Key Electro on the Subsequent 37,
    // which has no sub request: there the bass lands, as the `dirty` the box also authors. On
    // the Minitaur the same request loses to the kick.
    for (const box of ['moog-minitaur', 'moog-subsequent-37']) {
      const prefix = box === 'moog-minitaur' ? 'minitaur' : 'sub37'
      expect(outcome(box, 'lydian-house', 'r-bass-mid')).toBe(`landed:${prefix}-bass-mid-dark`)
      expect(outcome(box, 'relay', 'r-bass-mid')).toBe(`landed:${prefix}-bass-mid-dark`)
      expect(outcome(box, 'ambient-dub', 'r-bass-mid')).toBe('no-room/contended held:r-sub')
      expect(outcome(box, 'industrial-techno', 'r-bass-mid')).toBe('no-room/contended held:r-sub')
    }
    expect(outcome('moog-subsequent-37', 'major-key-electro', 'r-bass-mid')).toBe('landed:sub37-bass-mid-dirty')
    expect(outcome('moog-minitaur', 'major-key-electro', 'r-bass-mid')).toBe('no-room/contended held:r-kick')
    // The ranks and characters the reasoning rests on, pinned so a direction moving its bass
    // shows up here rather than silently changing which sentence above is true.
    const bass = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'bass-mid').map((r) => `${t.id}:${r.character}:p${String(r.priority)}`),
    )
    expect(bass.sort()).toEqual([
      'ambient-dub:dark:p2',
      'industrial-techno:dirty:p2',
      'lydian-house:dark:p1',
      'major-key-electro:dirty:p2',
      'relay:dark:p1',
    ])
    // Verdicts. `bass-mid / soft`: a triangle bass with a slow attack is Ambient Dub's shape,
    // and Ambient Dub's bass is p2 on a box whose voice the p1 sub takes; asking `soft` at p1
    // would trade the sub for it. No owner — kept, and the ledger is the record (#538). `bass-mid / clean`:
    // retained, because the grit knob reaches it (below), which is the one thing on this list
    // that the neutral sweep cannot see.
  })

  it('`bass-mid / clean` is the exception: grit at 0 re-pins the p1 dark bass to clean, and both boxes play theirs', () => {
    // `resolveCharacter` adds grit from the knob; from `dark` at grit 0 the vector sits at
    // equal distance from `dark` and `clean`, and `clean` sorts first by code unit. Lydian
    // House and Relay both rank the bass first, so the re-pinned request meets a free voice
    // and an exact recipe. The ledger stays as it is — it is measured neutral, and a pair a
    // knob reaches is not the same as one a direction asks for — but a recipe a reader can
    // reach by turning one knob down is not dead work.
    expect(resolveCharacter('dark', moodState({ grit: 0 }))).toBe('clean')
    const gritDown = moodState({ grit: 0 })
    expect(outcome('moog-minitaur', 'lydian-house', 'r-bass-mid', gritDown)).toBe('landed:minitaur-bass-mid-clean')
    expect(outcome('moog-minitaur', 'relay', 'r-bass-mid', gritDown)).toBe('landed:minitaur-bass-mid-clean')
    expect(outcome('moog-subsequent-37', 'lydian-house', 'r-bass-mid', gritDown)).toBe('landed:sub37-bass-mid-clean')
    expect(outcome('moog-subsequent-37', 'relay', 'r-bass-mid', gritDown)).toBe('landed:sub37-bass-mid-clean')
  })

  it('`lead / soft`: the lead lands only under Relay, as the bright the box also authors; elsewhere the voice is gone', () => {
    // Four directions ask for a lead. Relay's two requests never share a section — the bass
    // takes Enter, Walk, Press and Haul, the lead Trade, Ease, Reply and Depart — so one voice
    // carries both in turn and the lead lands; both boxes author a bright lead, which is what
    // Relay asks for. Slow Noir is the plausible owner of a soft lead and asks `bright` at p1
    // because its lead is the one thing that cuts through a minor ballad; on these two boxes it
    // would not matter, since the pad at p1 takes the voice under it. Hard Techno's `dirty` p2
    // and Major-Key Electro's `bright` p3 lose the voice to the sub, the bass-mid or the kick.
    for (const [box, prefix] of [
      ['arturia-microfreak', 'mf'],
      ['moog-subharmonicon', 'subh'],
    ] as const) {
      expect(outcome(box, 'relay', 'r-lead')).toBe(`landed:${prefix}-lead-bright`)
      expect(outcome(box, 'slow-noir', 'r-lead')).toBe('no-room/contended held:r-pad')
    }
    expect(outcome('arturia-microfreak', 'hard-techno', 'r-lead')).toBe('no-room/contended held:r-sub')
    expect(outcome('arturia-microfreak', 'major-key-electro', 'r-lead')).toBe('no-room/contended held:r-bass-mid')
    expect(outcome('moog-subharmonicon', 'hard-techno', 'r-lead')).toBe('no-room/contended held:r-kick')
    expect(outcome('moog-subharmonicon', 'major-key-electro', 'r-lead')).toBe('no-room/contended held:r-kick')
    const relay = template('relay')
    const sectionsOf = (id: string) => relay.roles.find((r) => r.id === id)?.sections ?? []
    expect(sectionsOf('r-bass-mid').filter((s) => sectionsOf('r-lead').includes(s))).toEqual([])
    // Slow Noir's pad and lead share priority 1, and the pad takes the voice on both boxes.
    // Pinned because it is the fact that makes a soft lead unreachable here even under a
    // direction that asked for one: it is geometry, not the absent request.
    const noir = template('slow-noir')
    expect(noir.roles.find((r) => r.id === 'r-pad')?.priority).toBe(1)
    expect(noir.roles.find((r) => r.id === 'r-lead')?.priority).toBe(1)
    // Verdict: a direction whose lead is soft and ranked above its pad does not exist; if one
    // arrives, these are its recipes. Until then no owner — kept, and the ledger is the record (#538).
  })

  it('`noise / dark` and `noise / hard`: both noise requests sit below a part that takes the whole box', () => {
    // Ambient Dub asks `soft` at p3, Industrial Techno `dirty` at p5 and optional. The Cascadia
    // and the MicroFreak each have one voice, and on both directions it is spent at p1 — on the
    // sub or the kick, or the pad — long before the noise is considered.
    expect(outcome('intellijel-cascadia', 'ambient-dub', 'r-noise')).toBe('no-room/contended held:r-sub')
    expect(outcome('intellijel-cascadia', 'industrial-techno', 'r-noise')).toBe('no-room/contended held:r-kick')
    expect(outcome('arturia-microfreak', 'ambient-dub', 'r-noise')).toBe('no-room/contended held:r-pad')
    expect(outcome('arturia-microfreak', 'industrial-techno', 'r-noise')).toBe('no-room/contended held:r-sub')
    // §3.5 on top of that. `hard` is the opposite of the `soft` Ambient Dub asks for and is
    // refused outright; from Industrial Techno's `dirty` it is sqrt(2), as is the dirty noise
    // the MicroFreak also authors, which answers exactly. `dark` is sqrt(2) from both requests,
    // and the Cascadia's dirty noise is the exact answer to one of them.
    expect(characterDistanceSq('soft', 'hard')).toBe(4)
    expect(characterDistanceSq('dirty', 'hard')).toBe(2)
    expect(characterDistanceSq('soft', 'dark')).toBe(2)
    expect(characterDistanceSq('dirty', 'dark')).toBe(2)
    // The darkness knob does re-pin Ambient Dub's wash to `dark`, and on the Cascadia it changes
    // nothing: the voice is still the sub's. Knob-reachable as a request, never as a part.
    expect(resolveCharacter('soft', moodState({ darkness: 100 }))).toBe('dark')
    expect(outcome('intellijel-cascadia', 'ambient-dub', 'r-noise', moodState({ darkness: 100 }))).toBe(
      'no-room/contended held:r-sub',
    )
    // Verdicts. A slewed pink-noise bed is a real ambient part and Ambient Dub is its owner —
    // but the Cascadia is a one-voice modular whose voice is the sub's on that direction, so an
    // absent request is not what keeps it dark. Recommend deletion later for both; the Cascadia
    // one is the better candidate for a second life on a box with a voice to spare, and that is
    // a #57 note, not a change here.
  })

  it('`pad / hard`: four notes and still one voice; the soft pad wins exact at p1, the dark p4 pad loses the voice', () => {
    // Six directions ask for a pad, five of them `soft` at p1 — the opposite of `hard`, refused
    // by §3.5 before any tie is weighed — and Industrial Techno `dark` at p4. On the four soft-p1
    // directions the minilogue xd's soft pad wins exactly, on every seed. Breakbeat's p5 pad and
    // Industrial Techno's p4 pad both lose the voice to the sub above them. That is the one
    // #538's diagnosis singled out: the box authors a dark pad too, so even with the voice free
    // the exact sibling would answer, and the four-note polyphony the panel advertises is a
    // stack the resolver counts as one assignable.
    expect(characterDistanceSq('soft', 'hard')).toBe(4)
    for (const id of ['ambient-dub', 'generative-drift', 'lydian-house', 'slow-noir']) {
      expect(outcome('korg-minilogue-xd', id, 'r-pad'), id).toBe('landed:mxd-pad-soft')
    }
    expect(outcome('korg-minilogue-xd', 'breakbeat', 'r-pad')).toBe('no-room/contended held:r-sub')
    expect(outcome('korg-minilogue-xd', 'industrial-techno', 'r-pad')).toBe('no-room/contended held:r-sub')
    expect(deviceById('korg-minilogue-xd').voices.map((v) => v.polyphony)).toEqual([4])
    const pads = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'pad').map((r) => `${t.id}:${r.character}:p${String(r.priority)}`),
    )
    expect(pads.sort()).toEqual([
      'ambient-dub:soft:p1',
      'breakbeat:soft:p5',
      'drum-and-bass:dark:p5',
      'generative-drift:soft:p1',
      'industrial-techno:dark:p4',
      'lydian-house:soft:p1',
      'slow-noir:soft:p1',
    ])
    // Verdict: opposite of every pad the library asks for but one, and that one never reaches
    // this box. No owner — kept, and the ledger is the record (#538).
  })

  it('`sub / hard` and `sub / soft`: the dark sub wins exactly on seven directions; the other two spend the voice above the sub', () => {
    // Nine directions ask for a sub. Seven ask `dark` and rank it first or second with nothing
    // the Minitaur can play above it, and the Minitaur's dark sub takes the part exactly on
    // every one — both `hard` and `soft` are sqrt(2) from `dark` and never consulted. Hip-Hop
    // ranks its `dark` sub third behind a kick the box also plays; Acid Lineage ranks its
    // `clean` sub fourth behind an acid line at p1.
    for (const id of ['ambient-dub', 'breakbeat', 'generative-drift', 'hard-techno', 'industrial-techno', 'slow-noir', 'weave']) {
      expect(outcome('moog-minitaur', id, 'r-sub'), id).toBe('landed:minitaur-sub-dark')
    }
    expect(outcome('moog-minitaur', 'hip-hop', 'r-sub')).toBe('no-room/contended held:r-kick')
    expect(outcome('moog-minitaur', 'acid-lineage', 'r-sub')).toBe('no-room/contended held:r-acid')
    const subs = TEMPLATES.flatMap((t) => t.roles.filter((r) => r.role === 'sub').map((r) => `${t.id}:${r.character}`))
    expect(subs.filter((s) => !s.endsWith(':dark'))).toEqual(['acid-lineage:clean'])
    // Verdicts. `sub / hard`, a sub with the envelope snapping shut: no direction's sub is a
    // transient and none should be. `sub / soft`, the swell with no transient: Ambient Dub's
    // shape, and Ambient Dub's sub is `dark` at p1 with the Minitaur's dark sub answering it
    // exactly, so the request that would want it is the one it loses to. No owner for either —
    // kept, and the ledger is the record (#538).
  })

  it('no mood knob reaches `hard` or `soft` from any character a direction pins these roles at', () => {
    // The structural half of six declines. `resolveCharacter` moves tone and grit and never
    // force, so a request on the tone or grit axis can be pushed anywhere on the disc except
    // onto `hard` or `soft`. Every direction asking for a bass-mid, lead, noise, pad or sub
    // pins it at `dark`, `dirty`, `bright`, `clean` or `soft`, and `soft` is on the wrong end
    // of the one axis no knob moves. Swept at every knob detent that changes the answer.
    const pinned = new Set<Character>(
      TEMPLATES.flatMap((t) =>
        t.roles.filter((r) => ['bass-mid', 'lead', 'noise', 'pad', 'sub'].includes(r.role)).map((r) => r.character),
      ),
    )
    expect([...pinned].sort()).toEqual(['bright', 'clean', 'dark', 'dirty', 'soft'])
    for (const base of CHARACTERS) {
      const reach = new Set<Character>()
      for (const darkness of [0, 25, 50, 75, 100]) {
        for (const grit of [0, 25, 50, 75, 100]) reach.add(resolveCharacter(base, moodState({ darkness, grit })))
      }
      if (base === 'hard' || base === 'soft') {
        expect(reach.has(base), base).toBe(true)
        expect(reach.has(base === 'hard' ? 'soft' : 'hard'), base).toBe(false)
      } else {
        expect(reach.has('hard'), base).toBe(false)
        expect(reach.has('soft'), base).toBe(false)
      }
    }
  })
})

describe('#538 the seven tone-axis pairs, decided with the evidence: four retained, three declined', () => {
  /**
   * The seven pairs on the ledger whose character sits on the tone axis, and the recipes behind
   * them. They are one group because the darkness knob is the one thing that moves a request
   * along that axis, and the previous block's structural test was about the axis no knob moves.
   * Here the knob is the question: a pair a reader reaches by turning darkness down or up is
   * not dead work, however the neutral sweep counts it.
   */
  const SEVEN: Record<string, readonly string[]> = {
    'arp / dark': ['mf-arp-dark'],
    'bass-mid / bright': ['sub37-bass-mid-bright'],
    'noise / bright': ['neutron-noise-bright'],
    'pad / bright': ['mf-pad-bright', 'mxd-pad-bright', 'muse-pad-bright', 'subh-pad-bright'],
    'pad / dark': [
      'cascadia-pad-dark',
      'gm-pad-dark',
      'mat-pad-dark',
      'mf-pad-dark',
      'muse-pad-dark',
      'mxd-pad-dark',
      'neutron-pad-dark',
      'opxy-pad-dark',
      'sub37-pad-dark',
      'subh-pad-dark',
    ],
    'stab / bright': ['mf-stab-bright', 'muse-stab-bright', 'mxd-stab-bright'],
    'stab / dark': ['mxd-stab-dark', 'sub37-stab-dark'],
  }

  const darkest = moodState({ darkness: 100 })
  const brightest = moodState({ darkness: 0 })

  /**
   * The whole sweep, pinned cell by cell: every box that authors one of the seven pairs, every
   * direction that requests that role, at neutral and at the two darkness ends — the only
   * detents that re-pin a request, as the structural test below proves. Keyed by role rather
   * than pair, so the two pad pairs share their ten boxes and the two stab pairs their four,
   * and a box authoring both is measured once. Each cell is `outcome`'s answer, which is one
   * string across seeds 1-4 or a throw. 81 rows, 243 cells.
   *
   * The per-pair tests below are the reasoning, and they quote the cells that carry it. This is
   * the coverage: a cell changing here is a resolve changing on a solo box, whether or not a
   * sentence below was written about it.
   */
  const MATRIX: PinnedMatrix = {
  'arp': {
    'arturia-microfreak': {
      'generative-drift': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
      'major-key-electro': [
        'no-room/contended held:r-bass-mid',
        'no-room/contended held:r-bass-mid',
        'no-room/contended held:r-bass-mid',
      ],
    },
  },
  'bass-mid': {
    'moog-subsequent-37': {
      'ambient-dub': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'landed:sub37-bass-mid-dark',
        'landed:sub37-bass-mid-bright',
        'landed:sub37-bass-mid-dark',
      ],
      'major-key-electro': [
        'landed:sub37-bass-mid-dirty',
        'landed:sub37-bass-mid-bright',
        'landed:sub37-bass-mid-dark',
      ],
      'relay': [
        'landed:sub37-bass-mid-dark',
        'landed:sub37-bass-mid-bright',
        'landed:sub37-bass-mid-dark',
      ],
    },
  },
  'noise': {
    'behringer-neutron': {
      'ambient-dub': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-recipe held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-recipe held:r-sub',
      ],
    },
  },
  'pad': {
    'arturia-microfreak': {
      'ambient-dub': [
        'landed:mf-pad-soft',
        'landed:mf-pad-bright',
        'landed:mf-pad-dark',
      ],
      'breakbeat': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'drum-and-bass': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'generative-drift': [
        'landed:mf-pad-soft',
        'landed:mf-pad-bright',
        'landed:mf-pad-dark',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'landed:mf-pad-soft',
        'landed:mf-pad-bright',
        'landed:mf-pad-dark',
      ],
      'slow-noir': [
        'landed:mf-pad-soft',
        'landed:mf-pad-bright',
        'landed:mf-pad-dark',
      ],
    },
    'behringer-neutron': {
      'ambient-dub': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'breakbeat': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'drum-and-bass': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'generative-drift': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
      'slow-noir': [
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
      ],
    },
    'intellijel-cascadia': {
      'ambient-dub': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'breakbeat': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'drum-and-bass': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'generative-drift': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
      'slow-noir': [
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
      ],
    },
    'korg-minilogue-xd': {
      'ambient-dub': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-bright',
        'landed:mxd-pad-dark',
      ],
      'breakbeat': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'drum-and-bass': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'generative-drift': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-bright',
        'landed:mxd-pad-dark',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-bright',
        'landed:mxd-pad-dark',
      ],
      'slow-noir': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-bright',
        'landed:mxd-pad-dark',
      ],
    },
    'moog-grandmother': {
      'ambient-dub': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'breakbeat': [
        'no-capable-voice held:r-snare',
        'no-capable-voice held:r-snare',
        'no-capable-voice held:r-snare',
      ],
      'drum-and-bass': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'generative-drift': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-arp',
        'no-capable-voice held:r-sub',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
      'slow-noir': [
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
      ],
    },
    'moog-matriarch': {
      'ambient-dub': [
        'no-room/contended held:r-sub',
        'landed:mat-pad-soft',
        'no-room/contended held:r-sub',
      ],
      'breakbeat': [
        'no-room/contended held:r-snare',
        'no-room/contended held:r-snare',
        'no-room/contended held:r-snare',
      ],
      'drum-and-bass': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'generative-drift': [
        'no-room/contended held:r-sub',
        'landed:mat-pad-soft',
        'no-room/contended held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'landed:mat-pad-soft',
        'no-room/contended held:r-bass-mid',
        'landed:mat-pad-dark',
      ],
      'slow-noir': [
        'landed:mat-pad-soft',
        'no-room/contended held:r-lead',
        'landed:mat-pad-dark',
      ],
    },
    'moog-muse': {
      'ambient-dub': [
        'landed:muse-pad-soft',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
      'breakbeat': [
        'landed:muse-pad-soft',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
      'drum-and-bass': [
        'landed:muse-pad-dark',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
      'generative-drift': [
        'landed:muse-pad-soft',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
      'industrial-techno': [
        'no-room/contended held:r-bass-mid+r-sub',
        'no-room/contended held:r-bass-mid+r-sub',
        'no-room/contended held:r-bass-mid+r-sub',
      ],
      'lydian-house': [
        'landed:muse-pad-soft',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
      'slow-noir': [
        'landed:muse-pad-soft',
        'landed:muse-pad-bright',
        'landed:muse-pad-dark',
      ],
    },
    'moog-subharmonicon': {
      'ambient-dub': [
        'no-room/contended held:r-sub',
        'landed:subh-pad-bright',
        'no-room/contended held:r-sub',
      ],
      'breakbeat': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'drum-and-bass': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'generative-drift': [
        'no-room/contended held:r-sub',
        'landed:subh-pad-bright',
        'no-room/contended held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-bass-mid',
        'landed:subh-pad-bright',
        'no-room/contended held:r-bass-mid',
      ],
      'slow-noir': [
        'landed:subh-pad-soft',
        'landed:subh-pad-bright',
        'landed:subh-pad-dark',
      ],
    },
    'moog-subsequent-37': {
      'ambient-dub': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'breakbeat': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'drum-and-bass': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'generative-drift': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
      'slow-noir': [
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
        'no-capable-voice held:r-lead',
      ],
    },
    'teenage-engineering-op-xy': {
      'ambient-dub': [
        'landed:opxy-pad-soft',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'breakbeat': [
        'landed:opxy-pad-soft',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'drum-and-bass': [
        'landed:opxy-pad-dark',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'generative-drift': [
        'landed:opxy-pad-soft',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'industrial-techno': [
        'no-room/contended held:r-bass-mid+r-clap+r-closed-hat+r-impact+r-kick+r-open-hat+r-riser+r-stab+r-sub+r-sweep',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'lydian-house': [
        'landed:opxy-pad-soft',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
      'slow-noir': [
        'landed:opxy-pad-soft',
        'landed:opxy-pad-soft',
        'landed:opxy-pad-dark',
      ],
    },
  },
  'stab': {
    'arturia-microfreak': {
      'hip-hop': [
        'no-room/contended held:r-vox-chop',
        'no-room/contended held:r-vox-chop',
        'no-room/contended held:r-vox-chop',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
    },
    'korg-minilogue-xd': {
      'hip-hop': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
    },
    'moog-muse': {
      'hip-hop': [
        'no-recipe held:r-sub+r-texture',
        'landed:muse-stab-bright',
        'no-recipe held:r-sub+r-texture',
      ],
      'industrial-techno': [
        'no-room/contended held:r-bass-mid+r-sub',
        'no-room/contended held:r-bass-mid+r-sub',
        'no-recipe held:r-bass-mid+r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-bass-mid+r-pad',
        'no-room/contended held:r-bass-mid+r-pad',
        'no-room/contended held:r-bass-mid+r-pad',
      ],
    },
    'moog-subsequent-37': {
      'hip-hop': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
    },
  },
  }

  it('pins every box × direction × detent for the five roles, exactly, and the quarter detents move none of them', () => {
    // 81 until Drum and Bass asked for a dark pad: ten more `pad` rows, one per authoring box.
    expect(checkMatrix(SEVEN, MATRIX, 'darkness')).toBe(91)
  })

  it('pins the seven pairs, the twenty-two recipes behind them, and the ten boxes with their voice counts', () => {
    for (const [pair, recipes] of Object.entries(SEVEN)) expect(authoring(pair), pair).toEqual(spelled(recipes))
    expect(Object.values(SEVEN).flat()).toHaveLength(22)
    const boxes = boxesBehind(SEVEN)
    expect(boxes).toEqual([
      'arturia-microfreak',
      'behringer-neutron',
      'intellijel-cascadia',
      'korg-minilogue-xd',
      'moog-grandmother',
      'moog-matriarch',
      'moog-muse',
      'moog-subharmonicon',
      'moog-subsequent-37',
      'teenage-engineering-op-xy',
    ])
    // Two of the ten are not one-voice boxes, and both matter below: the Muse's second voice is
    // where a stab lands once the knob has re-pinned it, and the OP-XY's eight tracks are where
    // the one direction asking for a dark pad gets it.
    const voices = Object.fromEntries(boxes.map((id) => [id, expandAll([deviceById(id)]).length]))
    expect(voices).toEqual({
      'arturia-microfreak': 1,
      'behringer-neutron': 1,
      'intellijel-cascadia': 1,
      'korg-minilogue-xd': 1,
      'moog-grandmother': 1,
      'moog-matriarch': 1,
      'moog-muse': 2,
      'moog-subharmonicon': 1,
      'moog-subsequent-37': 1,
      'teenage-engineering-op-xy': 8,
    })
  })

  it('leaves six of the seven on the never-selected ledger; `pad / dark` left it when a second direction asked', () => {
    // All seven sat on the ledger when #538 measured them. Drum and Bass then asked for a dark
    // pad at p5 behind six other parts, and on the two boxes with a voice to spare after the sub
    // — the Muse and the OP-XY — the request lands the dark recipe at neutral. That is the shape
    // the ledger exists to reward: a pair leaving because a direction wants it. The other six
    // stay, and `stab / dark` stays while being asked for, which is the finding that stands.
    const { selected } = selectedPairs()
    for (const pair of Object.keys(SEVEN)) expect(selected.has(pair), pair).toBe(pair === 'pad / dark')
    const asked = new Set(TEMPLATES.flatMap((t) => t.roles.map((r) => `${r.role} / ${r.character}`)))
    expect(Object.keys(SEVEN).filter((pair) => asked.has(pair))).toEqual(['pad / dark', 'stab / dark'])
  })

  it('the darkness knob re-pins every character to `bright` at 0, and only the three off the tone axis to `dark` at 100', () => {
    // The structural half of the seven. `resolveCharacter` adds a full unit of tone at either
    // end of the knob. At 0 that lands every character on or nearer `bright` than anything
    // else, and the two ties — `clean` and `dirty` at equal distance from `bright` — fall to
    // `bright` by code unit. At 100 the same push lands `dirty`, `hard` and `soft` on a tie
    // with `dark` and code unit picks `dark`; it lands `bright` on the origin, equidistant from
    // all six, and `bright` sorts first; and it lands `clean` on a tie with `dark` that `clean`
    // wins. So no knob moves a `bright` or a `clean` request to `dark`, which is the fact under
    // `arp / dark` below, and every request that is not `bright` or `clean` can be pushed there.
    // The quarter detents move nothing, so the sweep below is the two ends and neutral.
    for (const base of CHARACTERS) {
      expect(resolveCharacter(base, brightest), `${base} at 0`).toBe('bright')
      expect(resolveCharacter(base, moodState({ darkness: 25 })), `${base} at 25`).toBe(base)
      expect(resolveCharacter(base, moodState({ darkness: 75 })), `${base} at 75`).toBe(base)
    }
    expect(resolveCharacter('dirty', darkest)).toBe('dark')
    expect(resolveCharacter('hard', darkest)).toBe('dark')
    expect(resolveCharacter('soft', darkest)).toBe('dark')
    expect(resolveCharacter('dark', darkest)).toBe('dark')
    expect(resolveCharacter('bright', darkest)).toBe('bright')
    expect(resolveCharacter('clean', darkest)).toBe('clean')
  })

  it('`arp / dark`: declined — both arp requests lose the MicroFreak\'s voice above them, and neither can be re-pinned to `dark`', () => {
    // Two directions ask for an arp. Generative Drift asks `bright` at p2, the opposite of
    // `dark` and refused by §3.5 before the voice is weighed; Major-Key Electro asks `clean` at
    // p3, sqrt(2) away. On the one box that authors a dark arp the voice is spent at p1 either
    // way, on the pad or the bass. The knob does not help: `bright` and `clean` are the two
    // characters darkness at 100 leaves where they are.
    expect(characterDistanceSq('bright', 'dark')).toBe(4)
    expect(characterDistanceSq('clean', 'dark')).toBe(2)
    for (const mood of [undefined, brightest, darkest]) {
      expect(outcome('arturia-microfreak', 'generative-drift', 'r-arp', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('arturia-microfreak', 'major-key-electro', 'r-arp', mood)).toBe('no-room/contended held:r-bass-mid')
    }
    const arps = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'arp').map((r) => `${t.id}:${r.character}:p${String(r.priority)}`),
    )
    expect(arps.sort()).toEqual(['generative-drift:bright:p2', 'major-key-electro:clean:p3'])
    // Verdict: a damped harmonic arpeggio is a real part, and a direction that wants it dark
    // and ranks it above its pad does not exist; on a one-voice box nothing below p1 lands.
    // No owner — kept, and the ledger is the record (#538).
  })

  it('`bass-mid / bright`: retained — darkness at 0 re-pins the three landed basses to `bright`, and the Subsequent 37 plays it', () => {
    // The neutral picture is the one the previous block pinned: the two p1 dark basses land
    // as the dark recipe, Major-Key Electro's p2 dirty bass lands as the dirty one, and the two
    // p2 basses under a sub lose the voice. Darkness at 0 moves the three that land onto the
    // bright recipe, which answers exactly, and moves nothing for the two that do not — the sub
    // still ranks above them and still takes the voice.
    for (const id of ['lydian-house', 'relay', 'major-key-electro']) {
      expect(outcome('moog-subsequent-37', id, 'r-bass-mid', brightest), id).toBe('landed:sub37-bass-mid-bright')
    }
    expect(outcome('moog-subsequent-37', 'lydian-house', 'r-bass-mid')).toBe('landed:sub37-bass-mid-dark')
    expect(outcome('moog-subsequent-37', 'relay', 'r-bass-mid')).toBe('landed:sub37-bass-mid-dark')
    expect(outcome('moog-subsequent-37', 'major-key-electro', 'r-bass-mid')).toBe('landed:sub37-bass-mid-dirty')
    for (const mood of [undefined, brightest, darkest]) {
      expect(outcome('moog-subsequent-37', 'ambient-dub', 'r-bass-mid', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('moog-subsequent-37', 'industrial-techno', 'r-bass-mid', mood)).toBe('no-room/contended held:r-sub')
    }
    // Verdict: one knob, three directions, exact. Retained.
  })

  it('`noise / bright`: declined — both noise requests sit under a part that takes the Neutron\'s voice, at every detent', () => {
    // Ambient Dub asks `soft` at p3, Industrial Techno `dirty` at p5 and optional; both are
    // sqrt(2) from `bright`. On the Neutron the voice goes at p1 to the sub or the kick. At
    // darkness 0 both requests re-pin to `bright`, the exact character, and the voice is still
    // gone. At 100 both re-pin to `dark`, the opposite, and the gap changes its reason to
    // `no-recipe` — the box's only noise is refused — while the sub holds the voice under it.
    expect(characterDistanceSq('soft', 'bright')).toBe(2)
    expect(characterDistanceSq('dirty', 'bright')).toBe(2)
    for (const mood of [undefined, brightest]) {
      expect(outcome('behringer-neutron', 'ambient-dub', 'r-noise', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('behringer-neutron', 'industrial-techno', 'r-noise', mood)).toBe('no-room/contended held:r-kick')
    }
    expect(outcome('behringer-neutron', 'ambient-dub', 'r-noise', darkest)).toBe('no-recipe held:r-sub')
    expect(outcome('behringer-neutron', 'industrial-techno', 'r-noise', darkest)).toBe('no-recipe held:r-sub')
    // Verdict: filtered white noise with the oscillators out of the mix is a part any of the
    // two noise directions could carry, and both rank the noise where a one-voice box never
    // reaches it. No owner — kept, and the ledger is the record (#538).
  })

  it('`pad / bright`: retained — darkness at 0 re-pins every p1 soft pad to `bright`, and all four boxes play theirs', () => {
    // Five directions ask a soft pad and four rank it first. On the MicroFreak and the
    // minilogue xd the four p1 pads land as the soft recipe and, at darkness 0, as the bright
    // one; Breakbeat's p5 and Industrial Techno's p4 lose the voice to the sub at any detent.
    // The Muse has a second voice, so Breakbeat's p5 pad lands too. The Subharmonicon is the
    // interesting one: at neutral its voice goes to the sub or the bass at p1 on three of the
    // four, and only Slow Noir's pad lands. At darkness 0 the sub and the bass re-pin to
    // `bright`, the box's sub is `dark` — refused as the opposite — and its bass is `dirty`, a
    // substitution, so the pad's exact bright recipe takes the p1 voice on all four.
    const p1 = ['ambient-dub', 'generative-drift', 'lydian-house', 'slow-noir']
    for (const [box, prefix] of [
      ['arturia-microfreak', 'mf'],
      ['korg-minilogue-xd', 'mxd'],
    ] as const) {
      for (const id of p1) {
        expect(outcome(box, id, 'r-pad'), `${box} ${id}`).toBe(`landed:${prefix}-pad-soft`)
        expect(outcome(box, id, 'r-pad', brightest), `${box} ${id}`).toBe(`landed:${prefix}-pad-bright`)
      }
      for (const mood of [undefined, brightest, darkest]) {
        expect(outcome(box, 'breakbeat', 'r-pad', mood), box).toBe('no-room/contended held:r-sub')
        expect(outcome(box, 'industrial-techno', 'r-pad', mood), box).toBe('no-room/contended held:r-sub')
      }
    }
    for (const id of [...p1, 'breakbeat']) {
      expect(outcome('moog-muse', id, 'r-pad'), id).toBe('landed:muse-pad-soft')
      expect(outcome('moog-muse', id, 'r-pad', brightest), id).toBe('landed:muse-pad-bright')
    }
    expect(outcome('moog-muse', 'industrial-techno', 'r-pad')).toBe('no-room/contended held:r-bass-mid+r-sub')
    expect(outcome('moog-subharmonicon', 'slow-noir', 'r-pad')).toBe('landed:subh-pad-soft')
    expect(outcome('moog-subharmonicon', 'ambient-dub', 'r-pad')).toBe('no-room/contended held:r-sub')
    expect(outcome('moog-subharmonicon', 'generative-drift', 'r-pad')).toBe('no-room/contended held:r-sub')
    expect(outcome('moog-subharmonicon', 'lydian-house', 'r-pad')).toBe('no-room/contended held:r-bass-mid')
    for (const id of p1) expect(outcome('moog-subharmonicon', id, 'r-pad', brightest), id).toBe('landed:subh-pad-bright')
    expect(deviceById('moog-subharmonicon').recipes.filter((r) => r.role === 'sub').map((r) => r.character)).toEqual(['dark'])
    expect(deviceById('moog-subharmonicon').recipes.filter((r) => r.role === 'bass-mid').map((r) => r.character)).toEqual([
      'dark',
      'dirty',
    ])
    // Verdict: one knob, four directions, every authoring box, exact. Retained.
  })

  it('`pad / dark`: retained — darkness at 100 reaches it on six boxes, and on the OP-XY the direction that asks for it gets it', () => {
    // Industrial Techno asks `dark` at p4, and did so alone until Drum and Bass asked at p5;
    // that direction's cells are at the end of this block. Six of the ten boxes
    // reach the pair by the knob. On the MicroFreak, the minilogue xd and the Muse the p1 soft
    // pads re-pin to `dark` at 100 and land the dark recipe; the Matriarch does the same under
    // the two directions whose p1 pad wins its voice at neutral, and the Subharmonicon under
    // the one. Industrial Techno's p4 pad loses every one of those voices above it.
    const p1 = ['ambient-dub', 'generative-drift', 'lydian-house', 'slow-noir']
    for (const [box, prefix] of [
      ['arturia-microfreak', 'mf'],
      ['korg-minilogue-xd', 'mxd'],
      ['moog-muse', 'muse'],
    ] as const) {
      for (const id of p1) expect(outcome(box, id, 'r-pad', darkest), `${box} ${id}`).toBe(`landed:${prefix}-pad-dark`)
    }
    expect(outcome('moog-muse', 'breakbeat', 'r-pad', darkest)).toBe('landed:muse-pad-dark')
    for (const id of ['lydian-house', 'slow-noir']) {
      expect(outcome('moog-matriarch', id, 'r-pad'), id).toBe('landed:mat-pad-soft')
      expect(outcome('moog-matriarch', id, 'r-pad', darkest), id).toBe('landed:mat-pad-dark')
    }
    expect(outcome('moog-subharmonicon', 'slow-noir', 'r-pad', darkest)).toBe('landed:subh-pad-dark')
    for (const box of ['arturia-microfreak', 'korg-minilogue-xd']) {
      expect(outcome(box, 'industrial-techno', 'r-pad', darkest), box).toBe('no-room/contended held:r-sub')
    }
    expect(outcome('moog-muse', 'industrial-techno', 'r-pad', darkest)).toBe('no-room/contended held:r-bass-mid+r-sub')
    expect(outcome('moog-matriarch', 'industrial-techno', 'r-pad', darkest)).toBe('no-room/contended held:r-sub')
    expect(outcome('moog-subharmonicon', 'industrial-techno', 'r-pad', darkest)).toBe('no-room/contended held:r-sub')
    // The OP-XY is the sixth, and the one where the asking direction is the one that lands it.
    // Eight tracks, and at neutral ten of Industrial Techno's thirteen requests hold them — the
    // three transients share tracks across sections — so the p4 pad is contended on every seed.
    // At darkness 100 the p2 closed hat re-pins from `dirty` to `dark`, the box's only closed
    // hat is `bright`, the opposite, and that request drops to `no-recipe`; the track it would
    // have held goes to the pad, and the pad is exact. At 0 the same request is `bright` and
    // lands, and the pad re-pins to `bright` and takes the soft recipe at sqrt(2), so the knob
    // reaches the part at both ends and the dark recipe at one.
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-pad')).toBe(
      'no-room/contended held:r-bass-mid+r-clap+r-closed-hat+r-impact+r-kick+r-open-hat+r-riser+r-stab+r-sub+r-sweep',
    )
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-pad', darkest)).toBe('landed:opxy-pad-dark')
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-pad', brightest)).toBe('landed:opxy-pad-soft')
    // The release itself, pinned on the hat rather than inferred from the pad: the hat lands
    // its bright recipe at neutral and at 0, and at 100 it is the request with no recipe while
    // the pad is among the ten holding a track. Seed by seed, like every other cell.
    expect(resolveCharacter('dirty', darkest)).toBe('dark')
    expect(characterDistanceSq('dark', 'bright')).toBe(MAX_SUBSTITUTION_DISTANCE_SQ)
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-closed-hat')).toBe('landed:opxy-closed-hat-bright')
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-closed-hat', brightest)).toBe('landed:opxy-closed-hat-bright')
    expect(outcome('teenage-engineering-op-xy', 'industrial-techno', 'r-closed-hat', darkest)).toBe(
      'no-recipe held:r-bass-mid+r-clap+r-impact+r-kick+r-open-hat+r-pad+r-riser+r-stab+r-sub+r-sweep',
    )
    expect(deviceById('teenage-engineering-op-xy').recipes.filter((r) => r.role === 'closed-hat').map((r) => r.character)).toEqual([
      'bright',
    ])
    for (const id of [...p1, 'breakbeat']) {
      expect(outcome('teenage-engineering-op-xy', id, 'r-pad', darkest), id).toBe('landed:opxy-pad-dark')
    }
    // Drum and Bass asks `dark` at p5 behind a continuous sub at p1, so on every one-voice box
    // the pad loses the voice to the sub at neutral — the one-voice rows are `held:r-sub`. At
    // darkness 0 the sub re-pins to `bright`, which the Grandmother, the Matriarch and the
    // Subharmonicon author no sub for, so the voice passes to the kick and the pad is still out.
    // The Muse's second voice and the OP-XY's eight tracks land it exactly at neutral and at 100,
    // and land the box's bright and soft pads at 0: the dark pad is selected in the solo sweep,
    // which is what moved the pair off the ledger above.
    for (const box of ['moog-muse', 'teenage-engineering-op-xy']) {
      expect(outcome(box, 'drum-and-bass', 'r-pad'), box).toMatch(/^landed:.*-pad-dark$/)
      expect(outcome(box, 'drum-and-bass', 'r-pad', darkest), box).toMatch(/^landed:.*-pad-dark$/)
    }
    expect(outcome('moog-muse', 'drum-and-bass', 'r-pad', brightest)).toBe('landed:muse-pad-bright')
    expect(outcome('teenage-engineering-op-xy', 'drum-and-bass', 'r-pad', brightest)).toBe('landed:opxy-pad-soft')
    for (const box of ['moog-grandmother', 'moog-matriarch', 'moog-subharmonicon']) {
      expect(outcome(box, 'drum-and-bass', 'r-pad', brightest), box).toMatch(/held:r-kick$/)
    }
    // The other four boxes never reach it, and not for the reason the ledger implies. Every pad
    // request in the library asks for three or four notes, and the Cascadia and the
    // Grandmother sound one, the Neutron and the Subsequent 37 two: `no-capable-voice` on
    // every direction at every detent, before character or rank is consulted. A one-voice
    // drone and a two-note pad are honest recipes on those boxes, and no pad request the
    // library carries can be answered by them.
    const asked = TEMPLATES.flatMap((t) => t.roles.filter((r) => r.role === 'pad').map((r) => r.polyphony))
    expect(asked.sort()).toEqual([3, 3, 3, 3, 3, 4, 4])
    for (const [box, polyphony] of [
      ['behringer-neutron', 2],
      ['intellijel-cascadia', 1],
      ['moog-grandmother', 1],
      ['moog-subsequent-37', 2],
    ] as const) {
      expect(expandAll([deviceById(box)]).map((a) => a.polyphony), box).toEqual([polyphony])
      // The exact cells are in `MATRIX`; this reads the reason off every one of them, so the
      // sentence above is asserted on all eighteen cells per box and not on a sample.
      for (const [id, cells] of Object.entries(MATRIX['pad']?.[box] ?? {})) {
        for (const cell of cells) expect(cell.split(' ')[0], `${box} ${id}`).toBe('no-capable-voice')
      }
      expect(Object.keys(MATRIX['pad']?.[box] ?? {})).toHaveLength(7)
    }
    // Verdict: asked for by one direction, reached exactly on that direction by one knob on the
    // one box with tracks to spare, and reached on five more under the soft-pad directions.
    // Retained. The four recipes the note count excludes are a separate question from this
    // pair — they are a #57 note about what a pad request asks for, not a ledger entry.
  })

  it('`stab / bright`: retained — darkness at 0 re-pins Hip-Hop\'s stab to `bright`, and the Muse\'s second voice plays it', () => {
    // Three directions ask for a stab: Hip-Hop `dark` at p4 and four notes, Industrial Techno
    // `hard` at p3 and three, Lydian House `clean` at p3 and three. On the MicroFreak and the
    // minilogue xd the one voice is spent above every stab at every detent. The Muse is the
    // case. At neutral Hip-Hop's stab is `no-recipe` there: its hard and dirty stabs are
    // unison patches capped at one note, the only four-note stab it has is `bright`, and
    // `bright` is the opposite of `dark`. Darkness at 0 re-pins the request to `bright`, the
    // exact answer, and the p4 stab takes the second voice from the p5 texture that held it.
    for (const mood of [undefined, brightest, darkest]) {
      expect(outcome('arturia-microfreak', 'hip-hop', 'r-stab', mood)).toBe('no-room/contended held:r-vox-chop')
      expect(outcome('arturia-microfreak', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('arturia-microfreak', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('korg-minilogue-xd', 'hip-hop', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-pad')
    }
    expect(outcome('moog-muse', 'hip-hop', 'r-stab')).toBe('no-recipe held:r-sub+r-texture')
    expect(outcome('moog-muse', 'hip-hop', 'r-stab', brightest)).toBe('landed:muse-stab-bright')
    expect(outcome('moog-muse', 'hip-hop', 'r-texture', brightest)).toBe('no-room/contended held:r-stab+r-sub')
    // The other two stab directions on the Muse, at every detent: the second voice is the
    // bass's under both, and the knob moves the reason once — at 100 Industrial Techno's
    // `hard` re-pins to `dark`, which the box has no four-note answer to — and never the part.
    for (const mood of [undefined, brightest]) {
      expect(outcome('moog-muse', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-bass-mid+r-sub')
    }
    expect(outcome('moog-muse', 'industrial-techno', 'r-stab', darkest)).toBe('no-recipe held:r-bass-mid+r-sub')
    for (const mood of [undefined, brightest, darkest]) {
      expect(outcome('moog-muse', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-bass-mid+r-pad')
    }
    const muse = deviceById('moog-muse').recipes.filter((r) => r.role === 'stab')
    expect(muse.map((r) => `${r.character}:${String(r.patchPolyphony ?? 'full')}`).sort()).toEqual([
      'bright:full',
      'dirty:1',
      'hard:1',
    ])
    const stabs = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'stab').map((r) => `${t.id}:${r.character}:p${String(r.priority)}:${String(r.polyphony)}`),
    )
    expect(stabs.sort()).toEqual(['hip-hop:dark:p4:4', 'industrial-techno:hard:p3:3', 'lydian-house:clean:p3:3'])
    // Verdict: one knob, one direction, one box, exact. Retained. The MicroFreak's and the
    // minilogue xd's bright stabs are dark by the rig — a one-voice box under a direction that
    // ranks its stab third or fourth — which is the state the ledger is for.
  })

  it('`stab / dark`: declined — asked for at p4, and the one box that could carry four notes spends its voice at p3', () => {
    // Hip-Hop asks for exactly this, at p4 and four notes. The minilogue xd is the only one of
    // the two authoring boxes that can sound four notes, and under Hip-Hop its voice goes to
    // the p3 sub on every seed; under the other two stab directions it goes to the sub or the
    // pad, and no detent moves any of it. The Subsequent 37 sounds two notes, every stab
    // request asks for three or four, and it is `no-capable-voice` on all three directions
    // before the character is consulted — the same fact as the four pads above.
    for (const mood of [undefined, brightest, darkest]) {
      expect(outcome('korg-minilogue-xd', 'hip-hop', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-pad')
    }
    expect(outcome('moog-subsequent-37', 'hip-hop', 'r-stab')).toBe('no-capable-voice held:r-sub')
    expect(outcome('moog-subsequent-37', 'industrial-techno', 'r-stab')).toBe('no-capable-voice held:r-sub')
    expect(outcome('moog-subsequent-37', 'lydian-house', 'r-stab')).toBe('no-capable-voice held:r-bass-mid')
    for (const [id, cells] of Object.entries(MATRIX['stab']?.['moog-subsequent-37'] ?? {})) {
      for (const cell of cells) expect(cell.split(' ')[0], id).toBe('no-capable-voice')
    }
    expect(Object.keys(MATRIX['stab']?.['moog-subsequent-37'] ?? {})).toHaveLength(3)
    expect(expandAll([deviceById('moog-subsequent-37')]).map((a) => a.polyphony)).toEqual([2])
    const hipHop = template('hip-hop')
    expect(hipHop.roles.find((r) => r.id === 'r-sub')?.priority).toBe(3)
    expect(hipHop.roles.find((r) => r.id === 'r-stab')?.priority).toBe(4)
    // Verdict: this is one of the three #538 measured as asked for and never landing, and the
    // measurement holds — the request exists, the geometry defeats it, and moving Hip-Hop's
    // stab above its sub to reach a recipe is the change #538 ruled out. The minilogue xd's
    // recipe is dark by the rig and stays; the Subsequent 37's cannot answer any stab the
    // library asks for. No owner for the pair — the Subsequent 37's is kept, and the ledger is the record (#538) for
    // later, and the minilogue xd's stays as the answer to a rig with a voice to spare.
  })
})

describe('#538 the five grit-axis pairs, decided with the evidence: two retained, three declined', () => {
  /**
   * The five pairs on the ledger whose character sits on the grit axis, with the recipes behind
   * them. The grit knob is the one that moves a request along it, and the same shape as the tone
   * block applies: a pair the knob reaches is not dead work, and one it cannot reach on any
   * direction from any box is decided here, one way or the other.
   */
  const FIVE: Record<string, readonly string[]> = {
    'pad / dirty': ['mxd-pad-dirty'],
    'stab / clean': ['crave-stab-clean', 'mat-stab-clean', 'mf-stab-clean', 'mxd-stab-clean'],
    'stab / dirty': ['minitaur-stab-dirty', 'muse-stab-dirty', 'mxd-stab-dirty', 'subh-stab-dirty'],
    'sub / dirty': ['sub37-sub-dirty'],
    'texture / dirty': ['muse-texture-dirty', 'mxd-texture-dirty'],
  }

  const dirtiest = moodState({ grit: 100 })
  const cleanest = moodState({ grit: 0 })

  /** As `MATRIX` above, on the grit axis. 46 rows, 138 cells. */
  const MATRIX: PinnedMatrix = {
  'pad': {
    'korg-minilogue-xd': {
      'ambient-dub': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-clean',
        'landed:mxd-pad-dirty',
      ],
      'breakbeat': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'drum-and-bass': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'generative-drift': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-clean',
        'landed:mxd-pad-dirty',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-clean',
        'landed:mxd-pad-dirty',
      ],
      'slow-noir': [
        'landed:mxd-pad-soft',
        'landed:mxd-pad-clean',
        'landed:mxd-pad-dirty',
      ],
    },
  },
  'stab': {
    'arturia-microfreak': {
      'hip-hop': [
        'no-room/contended held:r-vox-chop',
        'no-room/contended held:r-vox-chop',
        'no-room/contended held:r-vox-chop',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-bass-mid',
      ],
    },
    'behringer-crave': {
      'hip-hop': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-bass-mid',
      ],
    },
    'korg-minilogue-xd': {
      'hip-hop': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'industrial-techno': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
    },
    'moog-matriarch': {
      'hip-hop': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
      ],
      'industrial-techno': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-bass-mid',
      ],
    },
    'moog-minitaur': {
      'hip-hop': [
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
        'no-capable-voice held:r-kick',
      ],
      'industrial-techno': [
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
        'no-capable-voice held:r-sub',
      ],
      'lydian-house': [
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
        'no-capable-voice held:r-bass-mid',
      ],
    },
    'moog-muse': {
      'hip-hop': [
        'no-recipe held:r-sub+r-texture',
        'landed:muse-stab-bright',
        'no-recipe held:r-sub+r-texture',
      ],
      'industrial-techno': [
        'no-room/contended held:r-bass-mid+r-sub',
        'no-room/contended held:r-bass-mid+r-sub',
        'no-room/contended held:r-bass-mid+r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-bass-mid+r-pad',
        'no-room/contended held:r-bass-mid+r-pad',
        'no-room/contended held:r-bass-mid+r-pad',
      ],
    },
    'moog-subharmonicon': {
      'hip-hop': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
      ],
      'industrial-techno': [
        'no-room/contended held:r-kick',
        'no-room/contended held:r-kick',
        'no-room/contended held:r-sub',
      ],
      'lydian-house': [
        'no-room/contended held:r-bass-mid',
        'no-room/contended held:r-bass-mid',
        'no-room/contended held:r-bass-mid',
      ],
    },
  },
  'sub': {
    'moog-subsequent-37': {
      'acid-lineage': [
        'no-room/contended held:r-acid',
        'no-room/contended held:r-acid',
        'no-room/contended held:r-acid',
      ],
      'ambient-dub': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'breakbeat': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'drum-and-bass': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'generative-drift': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'hard-techno': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'hip-hop': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'industrial-techno': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
      'slow-noir': [
        'no-room/contended held:r-lead',
        'no-room/contended held:r-lead',
        'no-room/contended held:r-lead',
      ],
      'weave': [
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
        'landed:sub37-sub-dark',
      ],
    },
  },
  'texture': {
    'korg-minilogue-xd': {
      'ambient-dub': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
      'drone-study': [
        'landed:mxd-texture-soft',
        'landed:mxd-texture-soft',
        'landed:mxd-texture-dirty',
      ],
      'generative-drift': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
      'hip-hop': [
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
        'no-room/contended held:r-sub',
      ],
      'slow-noir': [
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
        'no-room/contended held:r-pad',
      ],
    },
    'moog-muse': {
      'ambient-dub': [
        'no-room/contended held:r-pad+r-sub',
        'no-room/contended held:r-pad+r-sub',
        'no-room/contended held:r-pad+r-sub',
      ],
      'drone-study': [
        'landed:muse-texture-soft',
        'landed:muse-texture-soft',
        'landed:muse-texture-dirty',
      ],
      'generative-drift': [
        'no-room/contended held:r-pad+r-sub',
        'no-room/contended held:r-pad+r-sub',
        'no-room/contended held:r-pad+r-sub',
      ],
      'hip-hop': [
        'landed:muse-texture-soft',
        'no-room/contended held:r-stab+r-sub',
        'landed:muse-texture-dirty',
      ],
      'slow-noir': [
        'no-room/contended held:r-lead+r-pad',
        'no-room/contended held:r-lead+r-pad',
        'no-room/contended held:r-lead+r-pad',
      ],
    },
  },
  }

  it('pins the five pairs, the twelve recipes behind them, and the eight boxes with their voice counts', () => {
    for (const [pair, recipes] of Object.entries(FIVE)) expect(authoring(pair), pair).toEqual(spelled(recipes))
    expect(Object.values(FIVE).flat()).toHaveLength(12)
    const boxes = boxesBehind(FIVE)
    expect(boxes).toEqual([
      'arturia-microfreak',
      'behringer-crave',
      'korg-minilogue-xd',
      'moog-matriarch',
      'moog-minitaur',
      'moog-muse',
      'moog-subharmonicon',
      'moog-subsequent-37',
    ])
    const voices = Object.fromEntries(boxes.map((id) => [id, expandAll([deviceById(id)]).length]))
    expect(voices).toEqual({
      'arturia-microfreak': 1,
      'behringer-crave': 1,
      'korg-minilogue-xd': 1,
      'moog-matriarch': 1,
      'moog-minitaur': 1,
      'moog-muse': 2,
      'moog-subharmonicon': 1,
      'moog-subsequent-37': 1,
    })
  })

  it('leaves all five on the never-selected ledger; one is asked for by a direction and four by none', () => {
    const { selected } = selectedPairs()
    for (const pair of Object.keys(FIVE)) expect(selected.has(pair), pair).toBe(false)
    const asked = new Set(TEMPLATES.flatMap((t) => t.roles.map((r) => `${r.role} / ${r.character}`)))
    expect(Object.keys(FIVE).filter((pair) => asked.has(pair))).toEqual(['stab / clean'])
  })

  it('pins every box × direction × detent for the four roles, exactly, and the quarter detents move none of them', () => {
    // 46 until Drum and Bass, which asks for a `pad` and a `sub`: one row each.
    expect(checkMatrix(FIVE, MATRIX, 'grit')).toBe(48)
  })

  it('the grit knob re-pins `hard` and `soft` to `dirty` at 100 and to `clean` at 0, and never moves `dark` onto `dirty`', () => {
    // The structural half of the five. A full unit of grit either way: at 100 `hard` and `soft`
    // tie between themselves and `dirty` and code unit picks `dirty`; `clean` lands on the origin
    // and takes `bright`, the first by code unit; `dark` ties with `dirty` and keeps itself. At 0
    // the mirror: `dark`, `hard` and `soft` go to `clean`, `dirty` lands on the origin and goes
    // to `bright`. Two consequences carry the verdicts below. No sub request can reach `dirty`,
    // because every sub is `dark` or `clean` and neither moves there. And every soft pad and
    // texture request reaches `dirty` at 100, exactly.
    for (const base of CHARACTERS) {
      expect(resolveCharacter(base, moodState({ grit: 25 })), `${base} at 25`).toBe(base)
      expect(resolveCharacter(base, moodState({ grit: 75 })), `${base} at 75`).toBe(base)
    }
    expect(CHARACTERS.map((c) => `${c}>${resolveCharacter(c, dirtiest)}`)).toEqual([
      'hard>dirty',
      'soft>dirty',
      'bright>bright',
      'dark>dark',
      'clean>bright',
      'dirty>dirty',
    ])
    expect(CHARACTERS.map((c) => `${c}>${resolveCharacter(c, cleanest)}`)).toEqual([
      'hard>clean',
      'soft>clean',
      'bright>bright',
      'dark>clean',
      'clean>clean',
      'dirty>bright',
    ])
  })

  it('`pad / dirty`: retained — grit at 100 re-pins the four p1 soft pads to `dirty`, and the minilogue xd plays it', () => {
    // The box authors a pad on all six characters, so whatever a pad request is re-pinned to,
    // the exact recipe answers. At neutral the four p1 soft pads land the soft one; at grit 100
    // the dirty one; at 0 the clean one. Breakbeat's p5 and Industrial Techno's p4 lose the
    // voice to the sub at every detent, and Industrial Techno's `dark` is the one pad character
    // the knob never moves.
    for (const id of ['ambient-dub', 'generative-drift', 'lydian-house', 'slow-noir']) {
      expect(outcome('korg-minilogue-xd', id, 'r-pad'), id).toBe('landed:mxd-pad-soft')
      expect(outcome('korg-minilogue-xd', id, 'r-pad', dirtiest), id).toBe('landed:mxd-pad-dirty')
      expect(outcome('korg-minilogue-xd', id, 'r-pad', cleanest), id).toBe('landed:mxd-pad-clean')
    }
    for (const mood of [undefined, cleanest, dirtiest]) {
      expect(outcome('korg-minilogue-xd', 'breakbeat', 'r-pad', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'industrial-techno', 'r-pad', mood)).toBe('no-room/contended held:r-sub')
    }
    expect(deviceById('korg-minilogue-xd').recipes.filter((r) => r.role === 'pad').map((r) => r.character).sort()).toEqual([
      ...CHARACTERS,
    ].sort())
    // Verdict: one knob, four directions, exact. Retained.
  })

  it('`stab / clean`: declined — asked for at p3, and on every authoring box the voice is spent above it at every detent', () => {
    // Lydian House asks for exactly this, at p3 and three notes; Hip-Hop's `dark` p4 and
    // Industrial Techno's `hard` p3 both re-pin to `clean` at grit 0. None of it lands. The
    // minilogue xd and the Matriarch spend their voice at p1 on the pad, the kick, the sub or
    // the bass under every stab direction. The Crave sounds one note and is `no-capable-voice`
    // on all three. The MicroFreak's clean stab is a paraphonic patch capped at one note, so it
    // could not answer a three-note request even with the voice free — and the voice is not
    // free, it is the vox chop's, the sub's or the pad's.
    for (const [box, held] of [
      ['korg-minilogue-xd', { 'hip-hop': 'r-sub', 'industrial-techno': 'r-sub', 'lydian-house': 'r-pad' }],
      ['arturia-microfreak', { 'hip-hop': 'r-vox-chop', 'industrial-techno': 'r-sub', 'lydian-house': 'r-pad' }],
    ] as const) {
      for (const [id, holder] of Object.entries(held)) {
        expect(outcome(box, id, 'r-stab'), `${box} ${id}`).toBe(`no-room/contended held:${holder}`)
        expect(outcome(box, id, 'r-stab', cleanest), `${box} ${id}`).toBe(`no-room/contended held:${holder}`)
      }
    }
    // At grit 100 Lydian House's `clean` re-pins to `bright`, and on two boxes the p1 voice
    // changes hands from the pad to the bass. The soft pad re-pinned to `dirty` loses its exact
    // answer on both; on the MicroFreak the dark bass keeps one, and on the Matriarch both are
    // substitutions at sqrt(2) and the tie no longer falls to the pad. The stab still does not
    // get the voice either way.
    expect(outcome('arturia-microfreak', 'lydian-house', 'r-stab', dirtiest)).toBe('no-room/contended held:r-bass-mid')
    expect(outcome('moog-matriarch', 'lydian-house', 'r-stab', dirtiest)).toBe('no-room/contended held:r-bass-mid')
    expect(outcome('arturia-microfreak', 'lydian-house', 'r-bass-mid', dirtiest)).toBe('landed:mf-bass-mid-dark')
    expect(outcome('moog-matriarch', 'lydian-house', 'r-bass-mid', dirtiest)).toBe('landed:mat-bass-mid-dirty')
    expect(deviceById('moog-matriarch').recipes.filter((r) => r.role === 'bass-mid').map((r) => r.character)).toEqual(['dirty'])
    expect(deviceById('moog-matriarch').recipes.filter((r) => r.role === 'pad').map((r) => r.character)).toEqual(['soft', 'dark'])
    expect(outcome('korg-minilogue-xd', 'lydian-house', 'r-stab', dirtiest)).toBe('no-room/contended held:r-pad')
    expect(outcome('moog-matriarch', 'hip-hop', 'r-stab')).toBe('no-room/contended held:r-kick')
    expect(outcome('moog-matriarch', 'industrial-techno', 'r-stab')).toBe('no-room/contended held:r-kick')
    expect(outcome('moog-matriarch', 'lydian-house', 'r-stab')).toBe('no-room/contended held:r-pad')
    for (const [id, cells] of Object.entries(MATRIX['stab']?.['behringer-crave'] ?? {})) {
      for (const cell of cells) expect(cell.split(' ')[0], id).toBe('no-capable-voice')
    }
    expect(Object.keys(MATRIX['stab']?.['behringer-crave'] ?? {})).toHaveLength(3)
    expect(expandAll([deviceById('behringer-crave')]).map((a) => a.polyphony)).toEqual([1])
    expect(recipeById(deviceById('arturia-microfreak'), 'mf-stab-clean').patchPolyphony).toBe(1)
    const stabs = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'stab').map((r) => `${t.id}:${r.character}:p${String(r.priority)}:${String(r.polyphony)}`),
    )
    expect(stabs.sort()).toEqual(['hip-hop:dark:p4:4', 'industrial-techno:hard:p3:3', 'lydian-house:clean:p3:3'])
    // Verdict: one of the three #538 measured as asked for and never landing, and it holds. The
    // request exists and every box that could answer it is a one-voice box with its voice spent
    // at p1. Moving Lydian House's stab above its pad to reach a recipe is the change #538 ruled
    // out. The minilogue xd's and the Matriarch's are dark by the rig and stay; the Crave's and
    // the MicroFreak's cannot answer any stab the library asks for — keep, and the ledger is the record (#538), for
    // those two later.
  })

  it('`stab / dirty`: declined — reached by grit from two stab requests, and on every box the voice is gone or the patch is one note', () => {
    // Industrial Techno's `hard` p3 re-pins to `dirty` at 100, and Hip-Hop's `dark` is sqrt(2)
    // from it at neutral. On the minilogue xd and the Subharmonicon the one voice is the sub's
    // or the kick's at every detent. The Minitaur sounds one note and is `no-capable-voice` on
    // all three. The Muse's dirty stab is a unison patch capped at one note, so under Hip-Hop
    // at neutral the stab is `no-recipe` — the only four-note stab it has is `bright`, the
    // opposite of `dark` — and at grit 0 the request re-pins to `clean`, `bright` is sqrt(2)
    // from that, and the bright stab lands on the second voice. That is `stab / bright` again,
    // reached by a second knob; the dirty patch is never consulted for a part of three notes.
    for (const mood of [undefined, cleanest, dirtiest]) {
      expect(outcome('korg-minilogue-xd', 'hip-hop', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('moog-subharmonicon', 'hip-hop', 'r-stab', mood)).toBe('no-room/contended held:r-kick')
      expect(outcome('moog-subharmonicon', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-bass-mid')
    }
    expect(outcome('moog-subharmonicon', 'industrial-techno', 'r-stab')).toBe('no-room/contended held:r-kick')
    expect(outcome('moog-subharmonicon', 'industrial-techno', 'r-stab', dirtiest)).toBe('no-room/contended held:r-sub')
    for (const [id, cells] of Object.entries(MATRIX['stab']?.['moog-minitaur'] ?? {})) {
      for (const cell of cells) expect(cell.split(' ')[0], id).toBe('no-capable-voice')
    }
    expect(Object.keys(MATRIX['stab']?.['moog-minitaur'] ?? {})).toHaveLength(3)
    expect(expandAll([deviceById('moog-minitaur')]).map((a) => a.polyphony)).toEqual([1])
    expect(outcome('moog-muse', 'hip-hop', 'r-stab')).toBe('no-recipe held:r-sub+r-texture')
    expect(outcome('moog-muse', 'hip-hop', 'r-stab', cleanest)).toBe('landed:muse-stab-bright')
    expect(outcome('moog-muse', 'hip-hop', 'r-stab', dirtiest)).toBe('no-recipe held:r-sub+r-texture')
    for (const mood of [undefined, cleanest, dirtiest]) {
      expect(outcome('moog-muse', 'industrial-techno', 'r-stab', mood)).toBe('no-room/contended held:r-bass-mid+r-sub')
      expect(outcome('moog-muse', 'lydian-house', 'r-stab', mood)).toBe('no-room/contended held:r-bass-mid+r-pad')
    }
    expect(recipeById(deviceById('moog-muse'), 'muse-stab-dirty').patchPolyphony).toBe(1)
    expect(characterDistanceSq('dark', 'dirty')).toBe(2)
    expect(characterDistanceSq('clean', 'bright')).toBe(2)
    // Verdict: no owner. The minilogue xd's and the Subharmonicon's are dark by the rig and
    // stay; the Minitaur's and the Muse's cannot answer any stab the library asks for —
    // those two are kept, and the ledger is the record (#538).
  })

  it('`sub / dirty`: declined — the dark sub wins exactly on seven directions, and no knob moves a sub request to `dirty`', () => {
    // Nine directions ask for a sub, eight `dark` and Acid Lineage `clean`. The Subsequent 37's
    // dark sub answers seven exactly, at neutral and at grit 0 where `dark` re-pins to `clean`
    // and the dark one is still the nearest the box has. Slow Noir's p2 sub loses the voice to
    // the p1 lead and Acid Lineage's p4 sub to the p1 acid line. Grit at 100 leaves `dark` on
    // `dark` and sends `clean` to `bright`, so no sub request is ever `dirty`.
    for (const id of ['ambient-dub', 'breakbeat', 'generative-drift', 'hard-techno', 'hip-hop', 'industrial-techno', 'weave']) {
      for (const mood of [undefined, cleanest, dirtiest]) {
        expect(outcome('moog-subsequent-37', id, 'r-sub', mood), id).toBe('landed:sub37-sub-dark')
      }
    }
    for (const mood of [undefined, cleanest, dirtiest]) {
      expect(outcome('moog-subsequent-37', 'slow-noir', 'r-sub', mood)).toBe('no-room/contended held:r-lead')
      expect(outcome('moog-subsequent-37', 'acid-lineage', 'r-sub', mood)).toBe('no-room/contended held:r-acid')
    }
    expect(resolveCharacter('dark', dirtiest)).toBe('dark')
    expect(resolveCharacter('clean', dirtiest)).toBe('bright')
    const subs = TEMPLATES.flatMap((t) => t.roles.filter((r) => r.role === 'sub').map((r) => `${t.id}:${r.character}`))
    expect(subs.filter((s) => !s.endsWith(':dark'))).toEqual(['acid-lineage:clean'])
    // Verdict: a sub with the ladder driven into itself is a sound, and not one any direction's
    // sub is or should be — the dark sub is the exact answer wherever the box gets the part.
    // No owner — kept, and the ledger is the record (#538).
  })

  it('`texture / dirty`: retained — grit at 100 re-pins the soft textures to `dirty`, and both boxes play it where the texture lands', () => {
    // Five directions ask for a texture, all `soft`. Drone Study ranks it first, and on both
    // boxes it lands the soft recipe at neutral and the dirty one at grit 100. On the minilogue
    // xd the other four lose the one voice to the pad or the sub at every detent. The Muse's
    // second voice takes Hip-Hop's p5 texture too — soft at neutral, dirty at 100 — and at grit
    // 0 loses it to the p4 stab that `clean` lets the bright stab answer. Ambient Dub, Generative
    // Drift and Slow Noir spend both Muse voices above the texture.
    for (const [box, prefix] of [
      ['korg-minilogue-xd', 'mxd'],
      ['moog-muse', 'muse'],
    ] as const) {
      expect(outcome(box, 'drone-study', 'r-texture'), box).toBe(`landed:${prefix}-texture-soft`)
      expect(outcome(box, 'drone-study', 'r-texture', cleanest), box).toBe(`landed:${prefix}-texture-soft`)
      expect(outcome(box, 'drone-study', 'r-texture', dirtiest), box).toBe(`landed:${prefix}-texture-dirty`)
    }
    for (const mood of [undefined, cleanest, dirtiest]) {
      expect(outcome('korg-minilogue-xd', 'ambient-dub', 'r-texture', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('korg-minilogue-xd', 'generative-drift', 'r-texture', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('korg-minilogue-xd', 'hip-hop', 'r-texture', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('korg-minilogue-xd', 'slow-noir', 'r-texture', mood)).toBe('no-room/contended held:r-pad')
      expect(outcome('moog-muse', 'ambient-dub', 'r-texture', mood)).toBe('no-room/contended held:r-pad+r-sub')
      expect(outcome('moog-muse', 'generative-drift', 'r-texture', mood)).toBe('no-room/contended held:r-pad+r-sub')
      expect(outcome('moog-muse', 'slow-noir', 'r-texture', mood)).toBe('no-room/contended held:r-lead+r-pad')
    }
    expect(outcome('moog-muse', 'hip-hop', 'r-texture')).toBe('landed:muse-texture-soft')
    expect(outcome('moog-muse', 'hip-hop', 'r-texture', dirtiest)).toBe('landed:muse-texture-dirty')
    expect(outcome('moog-muse', 'hip-hop', 'r-texture', cleanest)).toBe('no-room/contended held:r-stab+r-sub')
    const textures = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'texture').map((r) => `${t.id}:${r.character}:p${String(r.priority)}`),
    )
    expect(textures.sort()).toEqual([
      'ambient-dub:soft:p3',
      'drone-study:soft:p1',
      'generative-drift:soft:p4',
      'hip-hop:soft:p5',
      'slow-noir:soft:p3',
    ])
    // Verdict: one knob, two directions, both boxes, exact. Retained.
  })
})

describe('#538 the three force-axis pairs, decided with the evidence: one retained, two declined', () => {
  /**
   * The last three of the fifteen. `hard` sits on the one axis no knob moves, so unlike the
   * tone and grit blocks the question is not which detent re-pins a request onto the pair —
   * none does, and the structural test below sweeps every combination of both knobs to say so.
   * The question is §3.5: whether a request that a knob has moved *near* `hard` can be handed
   * the hard recipe by substitution, because the box's other recipes are further or refused.
   * One box says yes.
   */
  const THREE: Record<string, readonly string[]> = {
    'bass-mid / hard': ['minitaur-bass-mid-hard', 'model-d-bass-mid-hard', 'muse-bass-mid-hard', 'sub37-bass-mid-hard'],
    'lead / hard': ['mf-lead-hard', 'muse-lead-hard', 'neutron-lead-hard', 'sub37-lead-hard'],
    'metallic / hard': ['cascadia-metallic-hard', 'dfam-metallic-hard'],
  }

  const DETENTS = [0, 25, 50, 75, 100]

  /**
   * Neutral only. The two knobs do move these allocations — a Minitaur bass at grit 0 lands the
   * clean recipe, a Muse lead at darkness 100 the dirty one — and those are the tone and grit
   * pairs' cells, pinned in the blocks above and in #565. What a detent can do *for `hard`* is
   * the substitution question, and the one row where the answer is yes is pinned on its own
   * below, at every one of the twenty-five combinations. 42 rows.
   */
  const MATRIX: PinnedNeutral = {
    'bass-mid': {
      'behringer-model-d': {
        'ambient-dub': 'no-room/contended held:r-sub',
        'industrial-techno': 'no-room/contended held:r-kick',
        'lydian-house': 'landed:model-d-bass-mid-dirty',
        'major-key-electro': 'no-room/contended held:r-kick',
        'relay': 'landed:model-d-bass-mid-dirty',
      },
      'moog-minitaur': {
        'ambient-dub': 'no-room/contended held:r-sub',
        'industrial-techno': 'no-room/contended held:r-sub',
        'lydian-house': 'landed:minitaur-bass-mid-dark',
        'major-key-electro': 'no-room/contended held:r-kick',
        'relay': 'landed:minitaur-bass-mid-dark',
      },
      'moog-muse': {
        'ambient-dub': 'no-room/contended held:r-pad+r-sub',
        'industrial-techno': 'landed:muse-bass-mid-dirty',
        'lydian-house': 'landed:muse-bass-mid-dark',
        'major-key-electro': 'landed:muse-bass-mid-dirty',
        'relay': 'landed:muse-bass-mid-dark',
      },
      'moog-subsequent-37': {
        'ambient-dub': 'no-room/contended held:r-sub',
        'industrial-techno': 'no-room/contended held:r-sub',
        'lydian-house': 'landed:sub37-bass-mid-dark',
        'major-key-electro': 'landed:sub37-bass-mid-dirty',
        'relay': 'landed:sub37-bass-mid-dark',
      },
    },
    'lead': {
      'arturia-microfreak': {
        'hard-techno': 'no-room/contended held:r-sub',
        'major-key-electro': 'no-room/contended held:r-bass-mid',
        'relay': 'landed:mf-lead-bright',
        'slow-noir': 'no-room/contended held:r-pad',
      },
      'behringer-neutron': {
        'hard-techno': 'no-room/contended held:r-kick',
        'major-key-electro': 'no-room/contended held:r-kick',
        'relay': 'landed:neutron-lead-bright',
        'slow-noir': 'landed:neutron-lead-bright',
      },
      'moog-muse': {
        'hard-techno': 'landed:muse-lead-dirty',
        'major-key-electro': 'landed:muse-lead-bright',
        'relay': 'landed:muse-lead-bright',
        'slow-noir': 'landed:muse-lead-bright',
      },
      'moog-subsequent-37': {
        'hard-techno': 'no-room/contended held:r-sub',
        'major-key-electro': 'no-room/contended held:r-bass-mid',
        'relay': 'landed:sub37-lead-bright',
        'slow-noir': 'landed:sub37-lead-bright',
      },
    },
    'metallic': {
      'intellijel-cascadia': {
        'generative-drift': 'no-room/contended held:r-sub',
        'industrial-techno': 'no-room/contended held:r-kick',
        'weave': 'no-room/contended held:r-kick',
      },
      'moog-dfam': {
        'generative-drift': 'no-room/contended held:r-sub',
        'industrial-techno': 'no-room/contended held:r-kick',
        'weave': 'no-room/contended held:r-kick',
      },
    },
  }

  it('pins the three pairs, the ten recipes behind them, and the eight boxes with their voice counts', () => {
    for (const [pair, recipes] of Object.entries(THREE)) expect(authoring(pair), pair).toEqual(spelled(recipes))
    expect(Object.values(THREE).flat()).toHaveLength(10)
    const boxes = boxesBehind(THREE)
    expect(boxes).toEqual([
      'arturia-microfreak',
      'behringer-model-d',
      'behringer-neutron',
      'intellijel-cascadia',
      'moog-dfam',
      'moog-minitaur',
      'moog-muse',
      'moog-subsequent-37',
    ])
    const voices = Object.fromEntries(boxes.map((id) => [id, expandAll([deviceById(id)]).length]))
    expect(voices).toEqual({
      'arturia-microfreak': 1,
      'behringer-model-d': 1,
      'behringer-neutron': 1,
      'intellijel-cascadia': 1,
      'moog-dfam': 1,
      'moog-minitaur': 1,
      'moog-muse': 2,
      'moog-subsequent-37': 1,
    })
  })

  it('leaves all three on the never-selected ledger, and no direction asks for any of them', () => {
    const { selected } = selectedPairs()
    for (const pair of Object.keys(THREE)) expect(selected.has(pair), pair).toBe(false)
    const asked = new Set(TEMPLATES.flatMap((t) => t.roles.map((r) => `${r.role} / ${r.character}`)))
    for (const pair of Object.keys(THREE)) expect(asked.has(pair), pair).toBe(false)
  })

  it('pins every box × direction at neutral for the three roles, exactly', () => {
    expect(checkNeutral(THREE, MATRIX)).toBe(42)
  })

  it('no combination of the two knobs moves any character these roles are requested at onto `hard`', () => {
    // The structural half. `resolveCharacter` adds tone and grit and never force, so the
    // vector can be pushed anywhere on the disc but never off it: `hard` is reached from `hard`
    // and from nothing else, at every one of the twenty-five detent pairs. The three roles are
    // requested at `bright`, `dark` and `dirty`, and the exact set each of those reaches is
    // pinned, so a change to the geometry shows up as a set changing and not as a sweep that
    // still happens to avoid `hard`.
    const requested = new Map<Character, Set<string>>()
    for (const t of TEMPLATES) {
      for (const r of t.roles) {
        if (!['bass-mid', 'lead', 'metallic'].includes(r.role)) continue
        requested.set(r.character, (requested.get(r.character) ?? new Set()).add(`${t.id}:${r.role}`))
      }
    }
    expect([...requested.keys()].sort()).toEqual(['bright', 'dark', 'dirty'])
    const reach = (base: Character) => {
      const seen = new Set<Character>()
      for (const darkness of DETENTS) for (const grit of DETENTS) seen.add(resolveCharacter(base, moodState({ darkness, grit })))
      return [...seen].sort()
    }
    expect(reach('bright')).toEqual(['bright', 'clean', 'dirty'])
    expect(reach('dark')).toEqual(['bright', 'clean', 'dark', 'dirty'])
    expect(reach('dirty')).toEqual(['bright', 'dark', 'dirty'])
    expect(reach('clean')).toEqual(['bright', 'clean', 'dark'])
    expect(reach('hard')).toEqual(['bright', 'clean', 'dark', 'dirty', 'hard'])
    expect(reach('soft')).toEqual(['bright', 'clean', 'dark', 'dirty', 'soft'])
  })

  it('`bass-mid / hard`: retained — grit at 0 sends the p1 dark bass to `clean`, and on the Model D the hard recipe is the only answer left', () => {
    // Five directions ask for a bass-mid, two of them `dark` at p1. On the Model D those two
    // land at neutral, as the dirty recipe — sqrt(2) from `dark`, and the box's only bass
    // within reach, since `hard` is sqrt(2) too and `model-d-bass-mid-dirty` sorts first by
    // code unit on the tie. Grit at 0 re-pins `dark` to `clean`. `dirty` is the opposite of
    // `clean` and is refused; `hard` is sqrt(2) from it, and it is the only candidate. So the
    // hard bass lands, by substitution, on both p1 directions, on every seed, at the five of
    // the twenty-five knob positions whose vector is nearer `clean` than anything else.
    expect(characterDistanceSq('dark', 'dirty')).toBe(2)
    expect(characterDistanceSq('dark', 'hard')).toBe(2)
    expect(characterDistanceSq('clean', 'dirty')).toBe(MAX_SUBSTITUTION_DISTANCE_SQ)
    expect(characterDistanceSq('clean', 'hard')).toBe(2)
    expect(deviceById('behringer-model-d').recipes.filter((r) => r.role === 'bass-mid').map((r) => r.character).sort()).toEqual([
      'dirty',
      'hard',
    ])
    for (const id of ['lydian-house', 'relay']) {
      const landsHard: string[] = []
      for (const darkness of DETENTS) {
        for (const grit of DETENTS) {
          const mood = moodState({ darkness, grit })
          const got = outcome('behringer-model-d', id, 'r-bass-mid', mood)
          const want = resolveCharacter('dark', mood) === 'clean' ? 'landed:model-d-bass-mid-hard' : 'landed:model-d-bass-mid-dirty'
          expect(got, `${id} darkness ${String(darkness)} grit ${String(grit)}`).toBe(want)
          if (got.endsWith('-hard')) landsHard.push(`d${String(darkness)}g${String(grit)}`)
        }
      }
      expect(landsHard, id).toEqual(['d0g0', 'd0g25', 'd25g0', 'd25g25', 'd50g0'])
    }
    // The other three directions on the Model D, and the other three boxes: the voice is the
    // sub's or the kick's under the p2 requests; and where the bass lands, an exact or nearer
    // sibling is always there. The Minitaur and the Subsequent 37 author a clean bass, so the
    // same re-pin lands it exactly (#565 pinned the Minitaur's and the Subsequent 37's). The
    // Muse has `dark` and `hard` both at sqrt(2) from `clean`, and `muse-bass-mid-dark` wins
    // the tie by code unit — the one place the hard recipe is a candidate and loses.
    for (const mood of [undefined, moodState({ grit: 0 })]) {
      expect(outcome('behringer-model-d', 'ambient-dub', 'r-bass-mid', mood)).toBe('no-room/contended held:r-sub')
      expect(outcome('behringer-model-d', 'major-key-electro', 'r-bass-mid', mood)).toBe('no-room/contended held:r-kick')
      expect(outcome('moog-minitaur', 'lydian-house', 'r-bass-mid', mood)).toBe(
        mood === undefined ? 'landed:minitaur-bass-mid-dark' : 'landed:minitaur-bass-mid-clean',
      )
      expect(outcome('moog-subsequent-37', 'relay', 'r-bass-mid', mood)).toBe(
        mood === undefined ? 'landed:sub37-bass-mid-dark' : 'landed:sub37-bass-mid-clean',
      )
      expect(outcome('moog-muse', 'lydian-house', 'r-bass-mid', mood)).toBe('landed:muse-bass-mid-dark')
      expect(outcome('moog-muse', 'relay', 'r-bass-mid', mood)).toBe('landed:muse-bass-mid-dark')
    }
    expect(outcome('behringer-model-d', 'industrial-techno', 'r-bass-mid')).toBe('no-room/contended held:r-kick')
    expect(outcome('behringer-model-d', 'industrial-techno', 'r-bass-mid', moodState({ grit: 0 }))).toBe('no-room/contended held:r-sub')
    expect('muse-bass-mid-dark' < 'muse-bass-mid-hard').toBe(true)
    // Verdict: reached, by one knob on one box, as the substitution a reader gets when the
    // knob has ruled out the alternative. Not an exact answer and not asked for — but a Model D
    // is a common box, Lydian House and Relay are two directions, and grit at 0 is a knob
    // position, so the recipe does reach a guide. Retained. The other three are dark by
    // the rig or by a nearer sibling and stay with the pair.
  })

  it('`lead / hard`: declined — every lead request lands its exact or nearer sibling, or loses the voice above it', () => {
    // Four directions ask for a lead: Slow Noir `bright` p1, Relay `bright` p2, Hard Techno
    // `dirty` p2, Major-Key Electro `bright` p3. All four boxes author a bright lead, so the
    // three bright requests land it exactly wherever the voice is free — Relay on all four,
    // Slow Noir on the Neutron, the Muse and the Subsequent 37, and on the MicroFreak the p1
    // pad takes the voice from the p1 lead. Hard Techno's `dirty` lands the Muse's dirty lead
    // exactly and loses the voice to the sub or the kick elsewhere. The Neutron is the one box
    // where `hard` is ever a candidate at neutral: its two leads are `bright` and `hard`, both
    // sqrt(2) from `dirty`, and the voice is the kick's before the tie is weighed.
    expect(characterDistanceSq('bright', 'hard')).toBe(2)
    expect(characterDistanceSq('dirty', 'hard')).toBe(2)
    for (const box of ['arturia-microfreak', 'behringer-neutron', 'moog-muse', 'moog-subsequent-37']) {
      expect(deviceById(box).recipes.filter((r) => r.role === 'lead').map((r) => r.character), box).toContain('bright')
    }
    expect(deviceById('behringer-neutron').recipes.filter((r) => r.role === 'lead').map((r) => r.character).sort()).toEqual([
      'bright',
      'hard',
    ])
    expect(outcome('behringer-neutron', 'hard-techno', 'r-lead')).toBe('no-room/contended held:r-kick')
    expect(outcome('behringer-neutron', 'hard-techno', 'r-lead', moodState({ grit: 0 }))).toBe('no-room/contended held:r-sub')
    // A knob cannot make `hard` the nearest candidate on any of the four: `bright` and `dirty`
    // reach `clean`, `dark`, `dirty` and `bright`, and every box authors a bright lead, which
    // is exact or sqrt(2) from all of those. Where `hard` ties it — `clean` and `dirty` are
    // sqrt(2) from both — the bright recipe sorts first by code unit on every box. Pinned as
    // the sweep of both knobs on the two boxes with a free voice under Relay.
    for (const box of ['behringer-neutron', 'moog-subsequent-37', 'moog-muse', 'arturia-microfreak']) {
      for (const darkness of DETENTS) {
        for (const grit of DETENTS) {
          const got = outcome(box, 'relay', 'r-lead', moodState({ darkness, grit }))
          expect(got.startsWith('landed:') && !got.endsWith('-hard'), `${box} d${String(darkness)} g${String(grit)}: ${got}`).toBe(true)
        }
      }
    }
    // Verdict: a hard lead is a real part — Hard Techno's is `dirty` because grit is the point
    // there, and the other three want a lead that cuts by being bright, not by hitting. No
    // owner, and no knob position on any box hands it the part — kept, and the ledger is the record (#538).
  })

  it('`metallic / hard`: declined — both boxes are one voice, spent at p1 under all three directions at every knob position', () => {
    // Three directions ask for a metallic: Generative Drift `bright` p3, Industrial Techno
    // `dark` p3, Weave `dirty` p4 and optional. The Cascadia and the DFAM each have one voice,
    // and under every one of those the sub or the kick has it at p1. The knobs move which of
    // the two holds it and never the metallic, so the pair is dark by the rig at every one of
    // the twenty-five positions on both boxes.
    for (const box of ['intellijel-cascadia', 'moog-dfam']) {
      for (const id of ['generative-drift', 'industrial-techno', 'weave']) {
        for (const darkness of DETENTS) {
          for (const grit of DETENTS) {
            const got = outcome(box, id, 'r-metallic', moodState({ darkness, grit }))
            expect(got.startsWith('no-room/contended held:'), `${box} ${id} d${String(darkness)} g${String(grit)}: ${got}`).toBe(true)
          }
        }
      }
    }
    expect(deviceById('intellijel-cascadia').recipes.filter((r) => r.role === 'metallic').map((r) => r.character).sort()).toEqual([
      'dark',
      'hard',
    ])
    expect(deviceById('moog-dfam').recipes.filter((r) => r.role === 'metallic').map((r) => r.character).sort()).toEqual(['dirty', 'hard'])
    const metallics = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.role === 'metallic').map((r) => `${t.id}:${r.character}:p${String(r.priority)}`),
    )
    expect(metallics.sort()).toEqual(['generative-drift:bright:p3', 'industrial-techno:dark:p3', 'weave:dirty:p4'])
    // Verdict: a struck, inharmonic hit is Industrial Techno's shape and it asks `dark` at p3,
    // which on a one-voice box is two ranks below the voice. The Cascadia's dark metallic would
    // answer that request exactly if it ever reached the box, and never does either. No owner
    // for `hard` — kept, and the ledger is the record (#538).
  })
})
