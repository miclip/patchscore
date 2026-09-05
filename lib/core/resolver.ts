import type { AssignableKey } from './occupancy'
import type { SectionName } from './ids'
import {
  CHAR,
  CHARACTERS,
  type Character,
  type CharVector,
  type MoodAxis,
  type MoodState,
  type Role,
} from './vocabulary'
import {
  patchVoiceCeiling,
  realisationOf,
  realisationRank,
  requiredVoicePolyphony,
} from './device'
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
 * §6's `MoodState`, `NEUTRAL_MOOD` and `moodState` moved to `vocabulary.ts` in #310, where
 * `template.ts` can reach them without importing this file. Nothing else about them changed;
 * `lib/core/index.ts` exports them from there, so every caller through the barrel is unaffected.
 */

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
          // §2.1. Carried through, never defaulted: a voice with no trigger note is one whose
          // note the reader chooses, and inventing one here would be invariant 5's failure.
          ...(voice.triggerNote === undefined ? {} : { triggerNote: voice.triggerNote }),
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
          /**
           * §2.2/#86. The panel's own name where the manifest gave one, the counted form where it
           * did not. `Pad 37` is a control the EP-133 does not have; `D · .` is the one it does.
           */
          label: voice.memberLabels?.[ordinal - 1] ?? `${voice.label} ${ordinal}`,
          ordinal,
          roles: Object.freeze([...voice.roles]) as Role[],
          polyphony: voice.polyphony,
          // §2.1. Every member of a pool is addressed alike, so each carries the pool's own.
          ...(voice.triggerNote === undefined ? {} : { triggerNote: voice.triggerNote }),
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
 * §6.3. The section's `energy` quantised to a band. `TemplateSchema` bounds energy to 0-1, and
 * `Math.min(3, ...)` catches `energy === 1`, which would otherwise floor to a fourth band that
 * does not exist.
 *
 * Energy is the band's *source*: a Drop is busier than an Intro because the template says so,
 * not because the listener moved a knob. Fixed constants, inclusive-below and exclusive-above.
 * Not tunable: a moving edge would make invariant 6 depend on a config file.
 */
export function energyBand(energy: number): DensityBand {
  return Math.min(3, Math.floor(energy * 4)) as DensityBand
}

/**
 * §6.3. Density is a *lean*, not the band itself: one band sparser, as authored, or one band
 * busier. Three zones, not four — the knob can move the arrangement by at most one band, so
 * the shape the template authored across its sections survives any setting of it.
 */
export { DENSITY_DETENTS } from './vocabulary'

export function densityShift(density: number): -1 | 0 | 1 {
  return density < 25 ? -1 : density < 75 ? 0 : 1
}


/**
 * §6.3. The band one request plays in one section: the section's energy band, shifted by
 * density, clamped into the four that exist. Clamping is not belt-and-braces: energy 1 leaned
 * up is 4 and energy 0 leaned down is -1, and a request for either would surface in the guide
 * as "nothing authored at band 4".
 */
export function patternBand(energy: number, density: number): DensityBand {
  const shifted = energyBand(energy) + densityShift(density)
  return Math.min(3, Math.max(0, shifted)) as DensityBand
}

/**
 * §6.3. The band for a named section of a template. The single place `structure` is read for
 * its energy, so the pipeline's no-pattern fallback and `selectPattern` cannot drift apart.
 *
 * A section outside `structure` throws rather than defaulting: there is no energy to quantise,
 * and answering with a band anyway would be a number with nothing behind it.
 */
export function bandFor(
  template: Template,
  section: SectionName,
  state: MoodState,
): DensityBand {
  const found = template.structure.find((s) => s.name === section)
  if (found === undefined) {
    throw new Error(`section '${section}' is not in template '${template.id}' structure`)
  }
  return patternBand(found.energy, state.density)
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
      /** The band asked for: the section's energy band, shifted by density (§6.3). */
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
 * Density never mutates hits (§4.3) — it leans the band the section's energy already chose,
 * and the band selects which authored variant is in play.
 */
export function selectPattern(
  template: Template,
  request: RoleRequest,
  section: SectionName,
  state: MoodState,
): PatternSelection {
  const band = bandFor(template, section, state)
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

/** Every recipe this device authors for that voice and role, before any filtering. */
export function recipesFor(device: Device, assignable: Assignable, role: Role): Recipe[] {
  const voiceKey = recipeVoiceKey(assignable)
  return device.recipes.filter((r) => r.role === role && r.voice === voiceKey)
}

/**
 * §12.4. Whether this assignable can carry `notes` simultaneous notes in this role *at all* —
 * either because the voice sounds that many itself, or because the device authors a recipe for
 * this voice and role that gets there another way (a chord in one sample).
 *
 * Character is deliberately not consulted. This is the rig question §7.3 asks before the
 * authoring question: a voice whose only pad recipe is the wrong character is still a voice
 * that can play a pad, and the gap it produces is `no-recipe` ("dial it by ear"), not
 * `no-capable-voice`. The same has to hold for a chord sample, or a request for three notes
 * would report "nothing can carry this" against a box that plainly does it.
 */
export function canCarryNotes(
  device: Device,
  assignable: Assignable,
  role: Role,
  notes: number,
): boolean {
  // The fast path stays, and #85 does not belong here. This asks whether the *box* can carry the
  // notes at all — "the voice sounds that many itself" — and a four-voice synth does, whatever any
  // one patch spends. A capped recipe is a reason not to *choose* that recipe, never a reason to
  // report the rig cannot play the part; §7.3 wants `no-recipe` there, not `no-capable-voice`.
  if (assignable.polyphony >= notes) return true
  return recipesFor(device, assignable, role).some(
    (recipe) =>
      requiredVoicePolyphony(recipe, notes) <= patchVoiceCeiling(recipe, assignable.polyphony),
  )
}

/**
 * §12.4/#40. How many interchangeable voices the pool this assignable belongs to has — 1 for a
 * `fixed` voice, which is a pool of itself.
 *
 * `Assignable` carries its own ordinal but not its pool's size, and deliberately: the ordinal is
 * an identity and the size is a fact about the device. So the count is read back off `voices`
 * rather than duplicated onto every member, where the two could disagree.
 */
export function poolWidth(device: Device, assignable: Assignable): number {
  if (assignable.poolId === undefined) return 1
  for (const voice of device.voices) {
    if (voice.kind === 'pool' && voice.id === assignable.poolId) return voice.count
  }
  return 1
}

/**
 * §12.4/#40. Whether `notes` simultaneous notes can be had from this pool by **stacking** —
 * `notes` of its members playing the same patch, one note of the chord each, which is the
 * method the Polyend manual itself prescribes (p.103: "To create chords, multiple tracks would
 * be used when each track represents a note. A triad would therefore need 3 tracks").
 *
 * Three conditions, and each of them is the gate rather than a convenience:
 *
 *  - **A pool, never a set of fixed voices.** This is the gate #40 asked to be argued. Pool
 *    members are *interchangeable by construction* — `roles`, `polyphony` and the recipe key are
 *    all per-pool (§2.2) — so every voice in a stack provably runs the same patch, which is what
 *    makes the result one chord rather than three sounds. Three fixed voices are three
 *    individually authored timbres; a TR-1000's LT, MT and HT handed a triad would produce three
 *    differently tuned toms, not a pad. That also answers §12.4's drum-machine worry without a
 *    tonal-role list and without a device declaration: fungibility is exactly the property
 *    stacking needs, `kind: 'pool'` is exactly the claim that the voices have it, and neither
 *    needs a fifth shared vocabulary (invariant 3).
 *  - **Enough members to go round.** A four-note chord on a three-track pool is not a stack.
 *  - **A `polyphonic-voice` recipe.** Each voice plays *one* note, so the recipe only ever needs
 *    polyphony 1 — but stacking a `sampled-chord` recipe is meaningless: it would put the whole
 *    chord on each of three voices. So the sampled route and the stacked route stay distinct all
 *    the way down, which is also why they are two `Score` keys and not one.
 *
 * Character is not consulted, for the reason `canCarryNotes` gives: this is the rig question
 * §7.3 asks before the authoring question.
 *
 * A voice whose own polyphony already reaches `notes` is refused here. Stacking it would be
 * strictly dominated — same recipe, same character, `stackedChords` charged and three voices
 * occupied instead of one — so it is not a branch worth giving the search.
 */
export function canStackNotes(
  device: Device,
  assignable: Assignable,
  role: Role,
  notes: number,
): boolean {
  if (notes <= 1) return false
  if (assignable.polyphony >= notes) return false
  if (assignable.poolId === undefined) return false
  if (poolWidth(device, assignable) < notes) return false
  return recipesFor(device, assignable, role).some(
    (recipe) =>
      realisationOf(recipe) === 'polyphonic-voice' &&
      // One note each in a stack, so a patch capped at one is fine here — but a cap of zero would
      // not be, and reading the ceiling keeps the two call sites asking the same question.
      requiredVoicePolyphony(recipe, 1) <= patchVoiceCeiling(recipe, assignable.polyphony),
  )
}

/**
 * §12.4/#40. The recipes one voice of a stack may run: scored for **one note**, because that is
 * all it plays, with the sampled-chord route excluded for the reason `canStackNotes` gives.
 *
 * Filtering after `scoreRecipes` rather than inside it keeps one sort: at `notes = 1` realisation
 * does not decide above character, so removing entries cannot reorder the ones that remain.
 */
export function stackRecipes(
  device: Device,
  assignable: Assignable,
  role: Role,
  want: Character,
): { recipe: Recipe; distanceSq: number }[] {
  return scoreRecipes(device, assignable, role, want, 1).filter(
    (x) => realisationOf(x.recipe) === 'polyphonic-voice',
  )
}

/**
 * Candidate recipes for one assignable and role. Ordered by realisation first when the part has
 * more than one note (§12.4, matching §7.1's key order), then nearest character, then recipe id
 * in UTF-16 code unit order (§7.2 — §3.5 originally wrote `localeCompare` here). Opposites are
 * excluded, never merely ranked last, and so is any recipe needing more polyphony than the
 * assignable has.
 *
 * Realisation appears **twice**, and the two appearances answer different questions.
 *
 *  - *Above* character, for a part of more than one note: taking the real voice is worth a
 *    character substitution (§7.1), because a chord sample cannot be inverted or moved to the
 *    next section's degrees.
 *  - *Below* character, always: at equal character distance a real voice still wins. This is
 *    what decides between two recipes sharing `(role, character, voice)` — legal since §3's key
 *    gained realisation (§12.4) — and without it a one-note part would pick between them by
 *    which id happens to sort first, which for a sampled chord means being handed a chord where
 *    it asked for a note.
 *
 * It is deliberately not above character for a one-note part: there is no chord to invert, so
 * the trade that justifies the substitution is not available to buy.
 */
export function scoreRecipes(
  device: Device,
  assignable: Assignable,
  role: Role,
  want: Character,
  notes = 1,
): { recipe: Recipe; distanceSq: number }[] {
  const realisationDecides = notes > 1
  return recipesFor(device, assignable, role)
    // §12.4/#85. Against the patch's ceiling rather than the box's, which is the whole of the
    // fix: this is where a recipe is *chosen*, and a UNISON patch on a four-voice synth sounds
    // one note however many the box has. `canCarryNotes` above deliberately still asks about the
    // box, because a capped recipe is a reason not to pick this patch and never a reason to tell
    // a reader their rig cannot play the part.
    .filter(
      (recipe) =>
        requiredVoicePolyphony(recipe, notes) <= patchVoiceCeiling(recipe, assignable.polyphony),
    )
    .map((recipe) => ({ recipe, distanceSq: characterDistanceSq(recipe.character, want) }))
    .filter((x) => x.distanceSq < MAX_SUBSTITUTION_DISTANCE_SQ)
    .sort(
      (a, b) =>
        (realisationDecides ? realisationRank(a.recipe) - realisationRank(b.recipe) : 0) ||
        a.distanceSq - b.distanceSq ||
        realisationRank(a.recipe) - realisationRank(b.recipe) ||
        compareCodeUnits(a.recipe.id, b.recipe.id),
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
  /** §12.4. Simultaneous notes the request needs. Recipes that cannot reach it are excluded. */
  notes = 1,
): RecipeResolution {
  const best = scoreRecipes(device, assignable, role, want, notes)[0]
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
 * §3.2: articulation values carry their own citation, or the recipe's behind it, on §3.1's
 * inheritance rules — and are `authored` or `provisional` only, since mood never touches them,
 * so `derived` cannot arise here.
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
      // Resolved **per entry**, not hoisted: two articulations in one recipe can come off two
      // pages, and one of them can be a guess in a recipe that is otherwise cited.
      provenance: citedProvenance(inheritVerified(entry.verified, recipe.verified)),
    })
  }
  return out
}

/**
 * §3.3. Patch cables are rendered values, so invariant 4 applies to them exactly as it does
 * to parameters — and, since #49, on the same *inheritance* as parameters too: a `PatchEntry`
 * carries its own `verified`, the recipe's is the default behind it, and mood never touches
 * either.
 *
 * **What this provenance is about is the connection, not the endpoints.** That the jacks exist
 * is device data, cited once each on `Device.jacks` (§3.3), and nothing here restates it. What
 * is left in doubt per entry is whether connecting these two is the right move — taste for a
 * cable somebody patched by ear, cited for one the manual instructs — so the resolution is per
 * entry rather than hoisted once for the list.
 */
export type ResolvedPatchEntry = { from: string; to: string; note?: string; provenance: Provenance }

export function resolvePatch(recipe: Recipe): ResolvedPatchEntry[] {
  return (recipe.patch ?? []).map((entry: PatchEntry) => ({
    from: entry.from,
    to: entry.to,
    ...(entry.note === undefined ? {} : { note: entry.note }),
    provenance: citedProvenance(inheritVerified(entry.verified, recipe.verified)),
  }))
}

/**
 * §3/#101. The source audio, carried through for the renderer with the procedure's provenance
 * already decided.
 *
 * **`need` carries no provenance, and that is a decision rather than an omission.** Invariant 4
 * governs rendered *values* — a setting the resolver could have moved, with a range behind it and
 * a page that could confirm it. "A sustained tonal source, two seconds or longer" is none of
 * those: it is an instruction about content to obtain before you start, exactly as `routing` is
 * an instruction about signal flow, and neither has a page or a range. Stamping it provisional
 * would badge honest guidance as an unchecked guess, which is the opposite of what that mark
 * means (§3.2).
 *
 * The `prep` procedure is a different claim and does carry one: p.104's render-to-audio steps are
 * the manual's, and a preparation somebody worked out by ear is not. `verified` there is required
 * on the authored shape, so no inheritance from the recipe is involved and mood never touches it —
 * the same shape as a patch entry's, minus the default.
 */
export type ResolvedSourceAudio = {
  need: string
  prep?: { text: string; provenance: Provenance }
  hint?: string
}

export function resolveSourceAudio(recipe: Recipe): ResolvedSourceAudio | undefined {
  const source = recipe.sourceAudio
  if (source === undefined) return undefined
  return {
    need: source.need,
    ...(source.prep === undefined
      ? {}
      : { prep: { text: source.prep.text, provenance: citedProvenance(source.prep.verified) } }),
    ...(source.hint === undefined ? {} : { hint: source.hint }),
  }
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
 * §3.1/#324, narrowed at #349. **The controller is named and no value is asserted.**
 *
 * This used to read `Send MIDI CC 87 = 72`, composed here rather than in the device folder so the
 * number in the sentence was the number on the line after mood had moved it. That was right for as
 * long as the value on the line *was* a CC value. It is not: the one box that declares `midiCc`
 * authors its controls on the scale its screen shows — percent, and Hz for the filter cutoffs —
 * and no page maps either onto a CC value. `Send MIDI CC 67 = 74` beside `74 %` would be telling a
 * reader to send a number that lands somewhere nobody has measured.
 *
 * So what survives is the half that is still true and still worth printing: **which controller
 * addresses this control**, which is what identifies it to anything automating the box. The
 * composition stays here rather than moving back into device prose because a note written at
 * authoring time is what #324 removed, and nothing about #349 makes that safe again.
 *
 * **An authored note keeps its place in front.** It says something about the control that this
 * cannot — *"Bipolar, no modulation at noon"* — and the joint is ` · `, which is the separator the
 * library's notes already use.
 */
function midiInstruction(ccNumber: number): string {
  return `MIDI CC ${ccNumber}`
}

function noteWithInstruction(
  note: string | undefined,
  instruction: string | undefined,
): string | undefined {
  if (instruction === undefined) return note
  return note === undefined ? instruction : `${note} · ${instruction}`
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
      // §3.2. **An enum's legality gate, carried for the same reason a range's is.** `options`
      // is to an enum exactly what `range` is to a numeric — the claim that says what the box
      // offers, cited independently of whether anyone checked which option suits the sound —
      // and a `ResolvedParam` that carried only half of that table made every consumer blind to
      // the other half. It reaches the guide's block sentence (§3.2) and nothing else: unlike a
      // range, the option set itself is not printed beside the value.
      ...(param.kind === 'enum'
        ? { optionsVerified: inheritVerified(param.options.verified, recipeVerified) }
        : {}),
      ...(param.hint === undefined ? {} : { hint: param.hint }),
      ...(param.note === undefined ? {} : { note: param.note }),
      // Carried, never computed, for the same reason `scope` is: which panel block a control
      // sits on is a fact about the box. Absent stays absent — there is no module to derive.
      ...(param.module === undefined ? {} : { module: param.module }),
      // #107. Carried, never computed: what one setting covers is a fact about the box, and
      // the resolver has nothing to add to it.
      ...(param.scope === undefined ? {} : { scope: param.scope }),
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

  // §3.1/#324, narrowed at #349: the instruction names the controller and asserts no value, so
  // there is nothing here that mood can leave stale. See `midiInstruction`.
  const note = noteWithInstruction(
    param.note,
    param.midiCc === undefined ? undefined : midiInstruction(param.midiCc),
  )

  return {
    name: param.name,
    value,
    ...(param.unit === undefined ? {} : { unit: param.unit }),
    // #29/§8: the bounds travel with the value, carrying the range's own claim already
    // resolved — the renderer must never have to re-run §3.1's inheritance to print them.
    range: { min: param.range.min, max: param.range.max, verified: rangeCite },
    provenance,
    ...(param.hint === undefined ? {} : { hint: param.hint }),
    ...(param.midiCc === undefined ? {} : { midiCc: param.midiCc }),
    ...(note === undefined ? {} : { note }),
    ...(param.module === undefined ? {} : { module: param.module }),
    ...(param.scope === undefined ? {} : { scope: param.scope }),
  }
}

/** §7 step 9 for a whole recipe. Authored order, which is the order the guide renders. */
export function resolveParams(recipe: Recipe, state: MoodState): ResolvedParam[] {
  return recipe.params.map((param) => resolveParam(param, recipe.verified, state))
}
