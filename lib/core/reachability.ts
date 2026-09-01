import type { Device, Recipe } from './device'
import type { Template } from './template'
import { PATTERN_SLOTS, moodState, type PatternSlot } from './vocabulary'
import {
  DENSITY_DETENTS,
  MAX_SUBSTITUTION_DISTANCE_SQ,
  characterDistanceSq,
  selectPatterns,
} from './resolver'

/**
 * §3/§4.3/#108. **Which authored articulation slots can ever fire**, checked across the whole
 * library rather than per device.
 *
 * A recipe's `articulation` addresses a `PatternSlot` rather than an absolute step, and that is
 * the right shape — it survives every variant density can select (§3, §4.3). What it does not do
 * is guarantee that any variant *contains* the slot. `tm-texture-soft` authored
 * `{ slot: 'first-hit', set: { 'low-pass': 55 } }` and the only direction that requests `texture`
 * emits `downbeat`, `offbeat` and `accent` and nothing else, so the entry was dead from the day it
 * was written. Nothing failed: `bindArticulation` drops a slot with no hits silently, which is
 * correct at resolve time (§7 step 8 — a variant that does not contain the gesture should not have
 * one invented for it) and is exactly why the authoring mistake is invisible.
 *
 * **This is an authoring check, not a resolver constraint, and it belongs to neither layer.**
 * Reachability is a fact about a *device and the template library together*: the device cannot see
 * it, because a recipe naming a template would breach invariant 3, and the template cannot see it,
 * because it does not know a device exists. So the question can only be asked from outside both,
 * by something handed both — which is what this module is. It reads its inputs as arguments and
 * imports no registry, so `lib/core` still knows about no particular device or genre.
 *
 * ## What "can ever fire" is taken to mean
 *
 * Not "some variant somewhere contains the slot". `selectPattern` takes `candidates[0]` at the
 * first non-empty band in the fallback order, so a variant that is never first at its band is
 * never selected and its slots are not reachable through it. Rather than restate that rule, this
 * walks the resolver's own `selectPatterns` at each of the three density detents — the only three
 * values §12.2 lets the UI produce — for every section the request occupies. The union of the slots
 * in what actually comes back is the reachable set, so the answer moves automatically if band
 * fallback or detent policy ever changes.
 *
 * Mood's other five axes are not swept, because pattern selection reads `density` and nothing else
 * (§7 step 5) — sweeping them would be a slower way of asking the same question six times.
 *
 * ## Which requests count
 *
 * A recipe is reached through a *request*, so only requests it could actually serve contribute:
 * the role must match exactly, which is how `recipesFor` filters, and the character must be within
 * §3.5's substitution radius, since `scoreRecipes` excludes an opposite outright rather than
 * ranking it last. Both conditions are the resolver's own, imported rather than re-derived.
 *
 * Polyphony and voice capacity are deliberately *not* consulted. Those depend on the assignable a
 * search happens to pick and on the rig it was picked from, and a check that guessed at them would
 * report a dead slot for a recipe that is merely hard to place. Every uncertainty here resolves in
 * favour of calling a slot reachable: this exists to find authoring that is certainly dead, and a
 * false positive would send someone deleting a working gesture.
 *
 * ## Two things this must not confuse with dead authoring
 *
 * The walk learns three different facts and only one of them is a device-folder bug. Reporting
 * them as one list buries the actionable finding under nineteen entries about the template
 * library, so they are returned separately.
 *
 *  - **Dead slot.** The role is patterned — some selectable variant emits *something* — and the
 *    authored slot is not among what it emits. This is the finding: somebody wrote a gesture for
 *    a moment the directions never produce. Fixable in the device folder, and only there.
 *  - **Unpatterned role.** The role is requested and no template authors a variant for it at all,
 *    so `selectPattern` returns `none` in every section and the guide prints no step programming
 *    for the part. Nothing in the recipe is wrong; there is no variant for a slot to be missing
 *    from. Ambient Dub's `texture` says why a template may decline to author one — four bands of
 *    invented 16ths would be the guide lying about what the part does — so this is a standing
 *    state of the library, not a defect queue.
 *  - **Unrequested recipe.** No direction asks for the role at all. The fix is a template (#81's
 *    "more templates"), never a recipe.
 *
 * The middle case is why an empty reachable set never produces a finding. It also produces an
 * asymmetry worth naming rather than smoothing over: the Tracker Mini's chord `pad` keeps a
 * `first-hit` entry while its chord `stab` loses one, because `stab` is patterned and `pad` is not.
 * That is the rule working. A slot is dead when the directions demonstrably do not contain it; a
 * slot on a part with no rhythm at all is waiting on a decision nobody has made yet, and deleting
 * it would destroy authoring on the strength of a template that has not been written.
 */
export type DeadArticulation = {
  deviceId: string
  recipeId: string
  role: string
  character: string
  /** The authored slot that no selectable variant emits. */
  slot: PatternSlot
  /** What *is* reachable for this recipe, so the finding says what to author instead. */
  reachable: PatternSlot[]
}

/** In `PATTERN_SLOTS` order, so a finding reads in the vocabulary's order and not encounter order. */
function ordered(slots: ReadonlySet<PatternSlot>): PatternSlot[] {
  return PATTERN_SLOTS.filter((slot) => slots.has(slot))
}

/**
 * Every slot a selectable variant can emit for this recipe, and whether any request reaches it
 * at all. The two answers come back together because they are one walk, and because "empty" is
 * ambiguous without the second: no reachable slots can mean the directions ask for this role and
 * never articulate it, or that nothing asks for the role.
 */
export function reachableSlots(
  recipe: Recipe,
  templates: readonly Template[],
): { slots: PatternSlot[]; requested: boolean } {
  const found = new Set<PatternSlot>()
  let requested = false
  for (const template of templates) {
    for (const request of template.roles) {
      if (request.role !== recipe.role) continue
      // §3.5's radius: an opposite character is excluded from candidacy, not merely ranked last,
      // so a request that could never take this recipe cannot make its slots reachable either.
      if (characterDistanceSq(recipe.character, request.character) >= MAX_SUBSTITUTION_DISTANCE_SQ) {
        continue
      }
      requested = true
      for (const density of DENSITY_DETENTS) {
        const bySection = selectPatterns(template, request, moodState({ density }))
        for (const selection of bySection.values()) {
          if (selection.outcome === 'none') continue
          for (const hit of selection.pattern.hits) found.add(hit.slot)
        }
      }
    }
  }
  return { slots: ordered(found), requested }
}

/**
 * §3/#108. Authored articulation slots no selectable variant can emit, for every recipe on one
 * device that some direction actually asks for.
 *
 * Findings come back in authored order — device folder order, then the recipe's own articulation
 * order — because that is the order somebody fixing them reads the file in. No comparator is
 * involved, so nothing here can sort differently on two machines (§7.2).
 */
export function deadArticulationSlots(
  device: Device,
  templates: readonly Template[],
): DeadArticulation[] {
  const out: DeadArticulation[] = []
  for (const recipe of device.recipes) {
    if (recipe.articulation === undefined) continue
    const { slots, requested } = reachableSlots(recipe, templates)
    // No request, or a requested role no template patterns: neither is dead authoring, and both
    // have their own reporter below.
    if (!requested || slots.length === 0) continue
    const reachable = new Set(slots)
    for (const entry of recipe.articulation) {
      if (reachable.has(entry.slot)) continue
      out.push({
        deviceId: device.id,
        recipeId: recipe.id,
        role: recipe.role,
        character: recipe.character,
        slot: entry.slot,
        reachable: slots,
      })
    }
  }
  return out
}

/** A recipe named by one of the two template-library reporters below. */
export type RecipeRef = { deviceId: string; recipeId: string; role: string; character: string }

function ref(device: Device, recipe: Recipe): RecipeRef {
  return {
    deviceId: device.id,
    recipeId: recipe.id,
    role: recipe.role,
    character: recipe.character,
  }
}

/**
 * Recipes no direction asks for. Authoring that is fine and has nowhere to be used yet, so it is
 * reported as the template-library gap it is (#81) rather than as dead authoring.
 */
export function unrequestedRecipes(device: Device, templates: readonly Template[]): RecipeRef[] {
  return device.recipes
    .filter((recipe) => !reachableSlots(recipe, templates).requested)
    .map((recipe) => ref(device, recipe))
}

/**
 * Recipes carrying articulation for a role that *is* requested and that no template patterns, so
 * no variant is selected in any section and nothing the recipe articulates against exists.
 *
 * Not a defect in either layer, and named because it is otherwise indistinguishable from a clean
 * result: `deadArticulationSlots` returns nothing for these, and it should, but "no findings"
 * would then cover both a device with correct slots and a device whose gestures have nowhere to
 * land. A template authoring variants for one of these roles later turns each entry into either a
 * live gesture or a genuine dead-slot finding, and this is the list to re-check when one does.
 */
export function unpatternedArticulation(
  device: Device,
  templates: readonly Template[],
): RecipeRef[] {
  return device.recipes
    .filter((recipe) => {
      if (recipe.articulation === undefined) return false
      const { slots, requested } = reachableSlots(recipe, templates)
      return requested && slots.length === 0
    })
    .map((recipe) => ref(device, recipe))
}
