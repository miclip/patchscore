import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
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
    expect(never.reduce((n, pair) => n + (authored.get(pair) ?? 0), 0)).toBe(54)
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
 * Where a recipe has no musical owner the record recommends deletion **later**: nothing is
 * deleted here, since that removes cited work and is the operator's call, and the audit's
 * dead-recipe line keeps them visible until it is made.
 */
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
    if (seen.size !== 1) throw new Error(`${deviceId} ${templateId}/${requestId} varies by seed: ${[...seen].join(' | ')}`)
    return [...seen][0]
  }

  it('pins the eight pairs, the ten recipes behind them, and that every one is on a one-assignable box', () => {
    for (const [pair, recipes] of Object.entries(EIGHT)) {
      expect(authoring(pair), pair).toEqual(
        recipes.map((id) => `${DEVICES.find((d) => d.recipes.some((r) => r.id === id))?.id}:${id}`).sort(),
      )
    }
    expect(Object.values(EIGHT).flat()).toHaveLength(10)
    // Six boxes, and each expands to exactly one assignable. The nominal polyphony varies —
    // Minitaur and Cascadia 1, Subsequent 37 2, MicroFreak and minilogue xd 4, Subharmonicon
    // 6 — and none of it matters to the question: a stack of four notes on the minilogue xd
    // is still one resolver voice, so a pad on it and a sub on it are the same voice asked for
    // twice, and the higher-ranked request gets it.
    const boxes = [
      ...new Set(Object.keys(EIGHT).flatMap((pair) => authoring(pair).map((s) => s.slice(0, s.indexOf(':'))))),
    ].sort()
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
    // would trade the sub for it. No owner — recommend deletion later. `bass-mid / clean`:
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
    // arrives, these are its recipes. Until then no owner — recommend deletion later.
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
      'generative-drift:soft:p1',
      'industrial-techno:dark:p4',
      'lydian-house:soft:p1',
      'slow-noir:soft:p1',
    ])
    // Verdict: opposite of every pad the library asks for but one, and that one never reaches
    // this box. No owner — recommend deletion later.
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
    // recommend deletion later.
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
