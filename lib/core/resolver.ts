import { z } from 'zod'
import type { AssignableKey } from './occupancy'
import type { SectionName } from './ids'
import {
  CHAR,
  CHARACTERS,
  MOOD_AXES,
  type Character,
  type CharVector,
  type MoodAxis,
  type Role,
} from './vocabulary'
import type {
  ArticulationEntry,
  Assignable,
  Device,
  PatchEntry,
  Recipe,
} from './device'
import type {
  DensityBand,
  Pattern,
  PatternHit,
  RoleRequest,
  Template,
} from './template'
import type {
  AuthoredNumericParam,
  AuthoredParam,
  Cite,
  Provenance,
  ResolvedParam,
  Verified,
} from './params'

/**
 * §7. The resolver's pure foundation: everything in the pipeline that does not need the
 * assignment search.
 *
 * This module imports nothing from `lib/devices/` and never will (build step 3, #4): the
 * caller resolves ids to objects and hands the objects in, so a device that exists only at
 * runtime — a user overlay, a row from a database — resolves without a redeploy.
 *
 * Two rules govern every comparison below, and both fail silently rather than loudly when
 * broken (§7.2):
 *
 *  - **String order is by UTF-16 code unit.** No `localeCompare`, no `Intl`, no
 *    `toLocaleString`. ICU collation varies by Node build and by ambient locale, so a tie
 *    broken with it produces different bytes on a laptop and on CI with no error anywhere.
 *  - **No `Math.random()`, and no float where an integer will do.** Character geometry is
 *    compared as *squared* distance, which keeps every comparison to exact integer-valued
 *    arithmetic on small doubles and avoids `Math.sqrt` — whose precision the language spec
 *    leaves implementation-approximated. Squaring is monotone on non-negative distances, so
 *    ordering and §3.5's `d < 2` threshold (`dSq < 4`) are unchanged by it.
 */

// ---------------------------------------------------------------------------
// §6 Mood
// ---------------------------------------------------------------------------

/**
 * §6. The five continuous 0-100 knobs, applied *after* recipe resolution. Every axis is
 * always present: a device declines an axis by having no param that declares it (§3.1), not
 * by the axis being absent from the input, and a partial `MoodState` would make "the knob is
 * centred" and "the knob was not sent" indistinguishable to `§6.1`'s arithmetic.
 */
export type MoodState = Record<MoodAxis, number>

export const MoodStateSchema = z.strictObject(
  Object.fromEntries(MOOD_AXES.map((axis) => [axis, z.number().min(0).max(100)])) as {
    [K in MoodAxis]: z.ZodNumber
  },
)

/** Every knob centred. `§6.1`'s offset is zero here, so a neutral mood changes nothing. */
export const NEUTRAL_MOOD: MoodState = Object.freeze(
  Object.fromEntries(MOOD_AXES.map((axis) => [axis, 50])) as MoodState,
)

/** Convenience for tests and callers: a neutral mood with named axes overridden. */
export function moodState(over: Partial<MoodState> = {}): MoodState {
  return { ...NEUTRAL_MOOD, ...over }
}

// ---------------------------------------------------------------------------
// §7.2 Ordering primitives
// ---------------------------------------------------------------------------

/** UTF-16 code unit comparison. The only string ordering allowed anywhere (§7.2). */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

// ---------------------------------------------------------------------------
// §7 step 3 / §2.2 — expansion
// ---------------------------------------------------------------------------

/** `${deviceId}/${voiceId}`, pool ordinal already folded into `voiceId` (§4.2). */
export function assignableKey(assignable: Assignable): AssignableKey {
  return `${assignable.deviceId}/${assignable.voiceId}`
}

/**
 * §2.2's load-bearing detail: recipe lookup keys on `poolId ?? voiceId`, so one authored
 * pool recipe serves every ordinal. Without this, pools move the 8x duplication from the
 * voice list to the recipe list.
 */
export function recipeVoiceKey(assignable: Assignable): string {
  return assignable.poolId ?? assignable.voiceId
}

/**
 * Expansion is memoised on the device *object*, which is sound only because the result is
 * frozen: two callers holding the same array cannot diverge, and nothing can hang per-guide
 * state on an `Assignable` (§4.2 — the reason occupancy lives in `Occupancy` instead).
 *
 * A device manifest is data and is never mutated in place; a caller composing a user overlay
 * (#16) produces a *new* device object, which therefore gets its own expansion.
 */
const expansions = new WeakMap<Device, readonly Assignable[]>()

/**
 * §2.2. Flatten both authored voice shapes into the one shape the resolver knows.
 *
 * Pure and cacheable (§7 step 3): identical for every guide ever resolved, carrying no
 * per-guide state. A device with no voices — a mixer-recorder, an fx-processor (§2.4) —
 * contributes no assignables and is not an error.
 */
export function expand(device: Device): readonly Assignable[] {
  const cached = expansions.get(device)
  if (cached !== undefined) return cached

  const out: Assignable[] = []
  for (const voice of device.voices) {
    if (voice.kind === 'fixed') {
      out.push(
        Object.freeze({
          deviceId: device.id,
          voiceId: voice.id,
          label: voice.label,
          roles: Object.freeze([...voice.roles]) as Role[],
          polyphony: voice.polyphony,
        }),
      )
      continue
    }
    // 'track' x 8 becomes 'track-1'..'track-8' / 'Track 1'..'Track 8'. The ordinal is folded
    // into `voiceId` here so that everything downstream — occupancy keys included — sees one
    // flat namespace, while `poolId` survives for recipe lookup.
    for (let ordinal = 1; ordinal <= voice.count; ordinal++) {
      out.push(
        Object.freeze({
          deviceId: device.id,
          voiceId: `${voice.id}-${ordinal}`,
          poolId: voice.id,
          label: `${voice.label} ${ordinal}`,
          ordinal,
          roles: Object.freeze([...voice.roles]) as Role[],
          polyphony: voice.polyphony,
        }),
      )
    }
  }

  const frozen = Object.freeze(out) as readonly Assignable[]
  expansions.set(device, frozen)
  return frozen
}

/**
 * Every assignable in the rig, in device order then authored voice order. No sort: the caller
 * chose the device order and the author chose the voice order, and re-sorting here would
 * silently overrule both. §7.1's search does its own ordering by `(score, deviceId, voiceId)`.
 */
export function expandAll(devices: readonly Device[]): readonly Assignable[] {
  return Object.freeze(devices.flatMap((device) => [...expand(device)]))
}

// ---------------------------------------------------------------------------
// §3.4 / §6.2 — character
// ---------------------------------------------------------------------------

function distanceSq(a: CharVector, b: CharVector): number {
  const f = a.force - b.force
  const t = a.tone - b.tone
  const g = a.grit - b.grit
  return f * f + t * t + g * g
}

/**
 * §3.4's geometry, squared. `hard → dark` is 2 (orthogonal, an acceptable substitution);
 * `hard → soft` is 4 (direct opposite, refused by §3.5's threshold).
 */
export function characterDistanceSq(a: Character, b: Character): number {
  return distanceSq(CHAR[a], CHAR[b])
}

/** §3.5 refuses a substitution at distance >= 2, i.e. squared distance >= 4: the opposite. */
export const MAX_SUBSTITUTION_DISTANCE_SQ = 4

/**
 * §6.2. Nearest of the six, tie-broken by UTF-16 code unit (§7.2) rather than "alphabetical",
 * which was locale-dependent as written. The tie is not hypothetical: full grit on a `hard`
 * request lands exactly equidistant from `hard` and `dirty`, and the tie-break is what makes
 * that flip to `dirty` reproducible.
 */
export function nearestCharacter(v: CharVector): Character {
  let best: Character = CHARACTERS[0]
  let bestD = distanceSq(v, CHAR[best])
  for (const candidate of CHARACTERS) {
    const d = distanceSq(v, CHAR[candidate])
    if (d < bestD || (d === bestD && compareCodeUnits(candidate, best) < 0)) {
      best = candidate
      bestD = d
    }
  }
  return best
}

/**
 * §6.2. Precedence between the template's character and the mood knobs falls out of §3.4's
 * geometry — there is no threshold constant to tune. Mood can push `hard` → `dirty` at high
 * grit, but cannot flip the axis the template pinned unless the push exceeds it.
 */
export function resolveCharacter(base: Character, state: MoodState): Character {
  const v: CharVector = { ...CHAR[base] }
  v.tone += ((state.darkness - 50) / 50) * -1
  v.grit += (state.grit - 50) / 50
  return nearestCharacter(v)
}

// ---------------------------------------------------------------------------
// §6.3 / §4.3 — pattern selection
// ---------------------------------------------------------------------------

/**
 * §6.3. Fixed constants, inclusive-below and exclusive-above. Not tunable: a moving edge
 * would make invariant 6 depend on a config file.
 */
export function densityBand(density: number): DensityBand {
  return density < 25 ? 0 : density < 50 ? 1 : density < 75 ? 2 : 3
}

/**
 * §6.3's fallback order, made explicit rather than computed at the point of use: the target
 * band, then the nearest *lower* bands, then the nearest higher. Lower first because a knob
 * turned up should never silently produce something busier than the band actually authored
 * above it.
 */
export function bandFallbackOrder(band: DensityBand): DensityBand[] {
  const order: DensityBand[] = [band]
  for (let lower = band - 1; lower >= 0; lower--) order.push(lower as DensityBand)
  for (let higher = band + 1; higher <= 3; higher++) order.push(higher as DensityBand)
  return order
}

/**
 * §4.2. Continuous requests occupy every section; transient requests occupy only the ones
 * they list. Returned in `structure` order rather than authored order, so two templates that
 * list the same sections differently still resolve identically.
 */
export function sectionsFor(request: RoleRequest, template: Template): SectionName[] {
  const all = template.structure.map((s) => s.name)
  if (request.sustain === 'continuous') return all
  const wanted = new Set(request.sections ?? [])
  return all.filter((name) => wanted.has(name))
}

/**
 * §6.3. Band fallback is *reported*, not silent — "no band-3 kick authored for this template;
 * using band 2". A knob that visibly does nothing is a bug report waiting to happen.
 *
 * `outcome: 'none'` is invariant 5 applied to rhythm: the guide omits the pattern for that
 * part and says so, rather than inventing hits.
 */
export type PatternSelection =
  | {
      outcome: 'exact' | 'fallback'
      /** The band the density knob asked for. */
      band: DensityBand
      /** The band actually used. Differs from `band` only when `outcome` is 'fallback'. */
      usedBand: DensityBand
      pattern: Pattern
      /**
       * Every variant eligible at `usedBand`, ordered by id. `pattern` is the first. §4.1
       * says the seed picks among multiple authored *hooks*; nothing in the design says the
       * same for patterns yet, so this stays deterministic and exposes the alternatives for
       * whoever settles that question.
       */
      candidates: readonly Pattern[]
    }
  | { outcome: 'none'; band: DensityBand }

function eligible(template: Template, role: Role, section: SectionName, band: DensityBand) {
  return template.patterns
    .filter(
      (p) =>
        p.forRole === role &&
        p.band === band &&
        (p.sections === undefined || p.sections.includes(section)),
    )
    .sort((a, b) => compareCodeUnits(a.id, b.id))
}

/**
 * §7 step 5. Depends only on template + mood, so **pattern selection is independent of the
 * rig**: two users with different boxes and the same inputs get the same rhythms. That is
 * why no `Device` appears in this signature, and it is a cheap test to write.
 *
 * Density never mutates hits (§4.3) — it selects which authored variant is in play.
 */
export function selectPattern(
  template: Template,
  request: RoleRequest,
  section: SectionName,
  state: MoodState,
): PatternSelection {
  const band = densityBand(state.density)
  for (const candidateBand of bandFallbackOrder(band)) {
    const candidates = eligible(template, request.role, section, candidateBand)
    const first = candidates[0]
    if (first === undefined) continue
    return {
      outcome: candidateBand === band ? 'exact' : 'fallback',
      band,
      usedBand: candidateBand,
      pattern: first,
      candidates: Object.freeze(candidates),
    }
  }
  return { outcome: 'none', band }
}

/** §7 step 5: one variant per request *per section*. Keyed in `structure` order. */
export function selectPatterns(
  template: Template,
  request: RoleRequest,
  state: MoodState,
): Map<SectionName, PatternSelection> {
  const out = new Map<SectionName, PatternSelection>()
  for (const section of sectionsFor(request, template)) {
    out.set(section, selectPattern(template, request, section, state))
  }
  return out
}

// ---------------------------------------------------------------------------
// §3.5 — recipe selection has three outcomes
// ---------------------------------------------------------------------------

/**
 * §3.5. 23 roles x 6 characters = 138 slots per device and you author 15-20, so exact match
 * fails constantly — but "no recipe → gap" is wrong, because the device *can* do it.
 *
 * `unvoiced` and §7.3's gap are different failures and the UI must distinguish them: one is
 * fixed by authoring a recipe, the other by buying a box.
 */
export type RecipeResolution =
  | {
      outcome: 'exact' | 'substituted'
      recipe: Recipe
      /** The character actually authored, which for 'substituted' is not the one asked for. */
      character: Character
      /** Squared §3.4 distance. 0 for 'exact'. §7.1 quantises the root for `Score`. */
      distanceSq: number
    }
  | { outcome: 'unvoiced'; distanceSq: 0 }

/**
 * Candidate recipes for one assignable and role, nearest character first, ties broken by
 * recipe id in UTF-16 code unit order (§7.2 — §3.5 originally wrote `localeCompare` here).
 * Opposites are excluded, never merely ranked last.
 */
export function scoreRecipes(
  device: Device,
  assignable: Assignable,
  role: Role,
  want: Character,
): { recipe: Recipe; distanceSq: number }[] {
  const voiceKey = recipeVoiceKey(assignable)
  return device.recipes
    .filter((r) => r.role === role && r.voice === voiceKey)
    .map((recipe) => ({ recipe, distanceSq: characterDistanceSq(recipe.character, want) }))
    .filter((x) => x.distanceSq < MAX_SUBSTITUTION_DISTANCE_SQ)
    .sort(
      (a, b) =>
        a.distanceSq - b.distanceSq || compareCodeUnits(a.recipe.id, b.recipe.id),
    )
}

/**
 * §7 step 7. Whether the assignable may *legally* serve the role is the search's question
 * (§7.1), not this one: it filters candidates before a recipe is ever looked up, and asking
 * again here would report `unvoiced` — "nothing authored" — for a rig gap.
 */
export function resolveRecipe(
  device: Device,
  assignable: Assignable,
  role: Role,
  want: Character,
): RecipeResolution {
  const best = scoreRecipes(device, assignable, role, want)[0]
  if (best === undefined) return { outcome: 'unvoiced', distanceSq: 0 }
  return {
    outcome: best.distanceSq === 0 ? 'exact' : 'substituted',
    recipe: best.recipe,
    character: best.recipe.character,
    distanceSq: best.distanceSq,
  }
}

// ---------------------------------------------------------------------------
// §3.1 — verified inheritance
// ---------------------------------------------------------------------------

/**
 * §3.1. `verified` omitted on a param means "inherit the recipe's"; a citation written on the
 * param overrides an inherited one, and an explicit `false` on the param overrides an
 * inherited citation too. **More specific always wins, in both directions.**
 *
 * A recipe with no `verified` of its own inherits nothing, which is `false`: unverified is
 * the floor, not an absence.
 *
 * Resolution happens here, once, before any provenance is stamped. The inherited value is
 * never re-read downstream.
 */
export function inheritVerified(own: Verified | undefined, fromRecipe: Verified | undefined): Verified {
  if (own !== undefined) return own
  return fromRecipe ?? false
}

// ---------------------------------------------------------------------------
// §7 step 8 — articulation bound to the selected pattern
// ---------------------------------------------------------------------------

/**
 * §3.2: articulation values carry the recipe's citation on the same inheritance rules and are
 * `authored` or `provisional` only — mood never touches them, so `derived` cannot arise here.
 */
export type BoundArticulation = {
  slot: ArticulationEntry['slot']
  set: ArticulationEntry['set']
  /** The steps in the selected variant carrying this slot, ascending. Never empty. */
  steps: number[]
  /** A key into the owning device's `hints` table. */
  hint?: string
  provenance: Provenance
}

function citedProvenance(verified: Verified): Provenance {
  return verified === false ? { state: 'provisional' } : { state: 'authored', cite: verified }
}

/**
 * §7 step 8. A slot the selected variant does not contain is **dropped silently** — not a
 * gap. The device simply had nothing to say about a slot with no hits in it, which is the
 * whole reason articulation addresses `PatternSlot`s rather than absolute step indices (§3):
 * `{ step: 13 }` is only correct for one variant, `{ slot: 'last-hit' }` survives all of them.
 */
export function bindArticulation(recipe: Recipe, pattern: Pattern): BoundArticulation[] {
  const stepsBySlot = new Map<PatternHit['slot'], number[]>()
  for (const hit of pattern.hits) {
    const existing = stepsBySlot.get(hit.slot)
    if (existing === undefined) stepsBySlot.set(hit.slot, [hit.step])
    else existing.push(hit.step)
  }

  const provenance = citedProvenance(inheritVerified(undefined, recipe.verified))
  const out: BoundArticulation[] = []
  // Authored order is preserved: an author who writes accent before last-hit meant that
  // reading order, and there is nothing to sort by that would beat it.
  for (const entry of recipe.articulation ?? []) {
    const steps = stepsBySlot.get(entry.slot)
    if (steps === undefined) continue
    out.push({
      slot: entry.slot,
      set: entry.set,
      steps: [...steps].sort((a, b) => a - b),
      ...(entry.hint === undefined ? {} : { hint: entry.hint }),
      provenance,
    })
  }
  return out
}

/**
 * §3.3. Patch cables are rendered values, so invariant 4 applies to them exactly as it does
 * to parameters. `PatchEntry` carries no `verified` of its own, so the recipe's is the only
 * claim there is — and, like articulation, mood never touches it.
 */
export type ResolvedPatchEntry = { from: string; to: string; note?: string; provenance: Provenance }

export function resolvePatch(recipe: Recipe): ResolvedPatchEntry[] {
  const provenance = citedProvenance(inheritVerified(undefined, recipe.verified))
  return (recipe.patch ?? []).map((entry: PatchEntry) => ({
    from: entry.from,
    to: entry.to,
    ...(entry.note === undefined ? {} : { note: entry.note }),
    provenance,
  }))
}

// ---------------------------------------------------------------------------
// §6.1 / §3.2 — mood application and provenance
// ---------------------------------------------------------------------------

/**
 * How many decimal places a step implies, so a fractional step does not render float
 * residue: `0.1` must not produce `0.30000000000000004`. `toFixed` is not locale-aware
 * (`toLocaleString` is), so this stays inside §7.2's rule.
 *
 * Returns -1 for a step written in exponent form, which means "do not clean up" — the
 * arithmetic is deterministic either way and guessing a precision there would be worse.
 */
function stepDecimals(step: number): number {
  if (Number.isInteger(step)) return 0
  const text = String(step)
  if (text.includes('e') || text.includes('E')) return -1
  const dot = text.indexOf('.')
  if (dot === -1) return -1
  return Math.min(text.length - dot - 1, 20)
}

/**
 * §6.1's `round(x, step)`, anchored at zero, then pulled back inside the range.
 *
 * §6.1 writes the clamp *inside* the round, which is not sufficient on its own: rounding a
 * clamped value to a coarse step can carry it back out (max 10, step 4 → `round(2.5) * 4` is
 * 12). An out-of-range value is illegal on the actual instrument, so the range wins and the
 * grid yields — stepping back by one before a final hard clamp for the degenerate case of a
 * range narrower than a single step.
 */
function roundToStep(value: number, step: number, min: number, max: number): number {
  let out = Math.round(value / step) * step
  if (out > max) out -= step
  if (out < min) out += step
  out = clamp(out, min, max)
  const decimals = stepDecimals(step)
  return decimals < 0 ? out : Number(out.toFixed(decimals))
}

/**
 * §6.1's offset, and the axes that actually contributed. An axis at exactly 50 contributes
 * zero and is not listed — `Provenance.axes` answers "which knobs did it", and a knob that
 * did nothing is not an answer.
 */
function moodContribution(
  param: AuthoredNumericParam,
  state: MoodState,
): { offset: number; axes: MoodAxis[] } {
  let offset = 0
  // A Map, not an array, because an author may legitimately declare the same axis twice
  // (two separate reasons this parameter moves with grit); those sum but are named once.
  const contributed = new Map<MoodAxis, number>()
  for (const entry of param.mood ?? []) {
    const amount = ((state[entry.axis] - 50) / 50) * entry.amount
    offset += amount
    contributed.set(entry.axis, (contributed.get(entry.axis) ?? 0) + amount)
  }
  const axes: MoodAxis[] = []
  for (const [axis, amount] of contributed) if (amount !== 0) axes.push(axis)
  return { offset, axes }
}

/**
 * §7 step 9, and the only place an `AuthoredParam` becomes a `ResolvedParam`.
 *
 * §3.2's two gates are orthogonal, which is why §3.1 gives the range its own `verified`:
 *
 *  - **The range is the legality gate.** A `derived` value needs a verified *range* to be
 *    legal at all. If the range is unverified, mood must not move the parameter — the engine
 *    leaves it alone rather than generating inside bounds nobody checked. This holds even
 *    when the point itself is impeccably cited.
 *  - **The point is the authority gate.** It decides `authored` vs `provisional`, and
 *    nothing else.
 *
 * The range has a third job that is neither gate: it is *rendered* (#29). `DECAY 38 (0-100)`
 * tells a reader at the machine which screen they should be looking at, where a bare `38` does
 * not — so the bounds are carried onto the `ResolvedParam` rather than being consumed here.
 *
 * **`provisional` dominates `derived`.** Moving an unverified point inside a verified range
 * is legal, but inherits no authority the starting point never had: the badge stays, and
 * `from`/`axes` still record the move. Refusing to apply mood to provisional params would
 * make a device with an unverified recipe silently ignore the knobs — a bug report, and the
 * debt hidden rather than shown.
 */
export function resolveParam(
  param: AuthoredParam,
  recipeVerified: Verified | undefined,
  state: MoodState,
): ResolvedParam {
  const point = inheritVerified(param.verified, recipeVerified)

  if (param.kind !== 'numeric') {
    return {
      name: param.name,
      value: param.value,
      provenance: citedProvenance(point),
      ...(param.hint === undefined ? {} : { hint: param.hint }),
      ...(param.note === undefined ? {} : { note: param.note }),
    }
  }

  const rangeCite = inheritVerified(param.range.verified, recipeVerified)
  const declaresMood = (param.mood?.length ?? 0) > 0
  // The legality gate. Note the asymmetry that §3.2 insists on: an unverified range does not
  // make the value provisional, it makes the parameter deaf to mood.
  const moodAllowed = declaresMood && rangeCite !== false

  let value = param.value
  let axes: MoodAxis[] = []
  if (moodAllowed) {
    const contribution = moodContribution(param, state)
    axes = contribution.axes
    // **A zero net offset leaves the authored value exactly as authored.** `NEUTRAL_MOOD`
    // promises that centred knobs change nothing, and rounding is not exempt from that: with
    // no `step` declared the grid defaults to 1, so an authored `0.28 Sec` was being rounded
    // to `0` by a mood that had not moved it at all — the value the guide printed was one the
    // author never wrote and no citation covered.
    //
    // The grid exists to land a *moved* value where the instrument can actually sit. An
    // unmoved value is already where its author put it, and snapping a cited point onto a
    // step we defaulted to is inventing, not quantising (invariant 5).
    //
    // Tested on the *offset*, not on `axes`: two authored entries that cancel exactly have
    // both axes contributing and a net move of zero, and zero move must mean zero change.
    if (contribution.offset !== 0) {
      const raw = clamp(param.value + contribution.offset, param.range.min, param.range.max)
      value = roundToStep(raw, param.step ?? 1, param.range.min, param.range.max)
    }
  }

  // "Moved" is measured on the *result*, not on the offset. A push that rounding or clamping
  // erases has not moved anything, and rendering `TUNE 52 → 52` with a derived badge would
  // claim arithmetic that is not visible in the value.
  const moved = value !== param.value

  let provenance: Provenance
  if (point === false) {
    provenance = moved ? { state: 'provisional', from: param.value, axes } : { state: 'provisional' }
  } else if (moved && rangeCite !== false) {
    provenance = {
      state: 'derived',
      cite: point,
      rangeCite: rangeCite as Cite,
      from: param.value,
      axes,
    }
  } else {
    provenance = { state: 'authored', cite: point }
  }

  return {
    name: param.name,
    value,
    ...(param.unit === undefined ? {} : { unit: param.unit }),
    // #29/§8: the bounds travel with the value, carrying the range's own claim already
    // resolved — the renderer must never have to re-run §3.1's inheritance to print them.
    range: { min: param.range.min, max: param.range.max, verified: rangeCite },
    provenance,
    ...(param.hint === undefined ? {} : { hint: param.hint }),
    ...(param.note === undefined ? {} : { note: param.note }),
  }
}

/** §7 step 9 for a whole recipe. Authored order, which is the order the guide renders. */
export function resolveParams(recipe: Recipe, state: MoodState): ResolvedParam[] {
  return recipe.params.map((param) => resolveParam(param, recipe.verified, state))
}
