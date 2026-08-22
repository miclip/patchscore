import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, RecipeId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import type { Character, Role } from './vocabulary'
import type { Assignable, Device } from './device'
import type { RoleRequest, Template } from './template'
import type { ResolvedParam } from './params'
import {
  assignableKey,
  bindArticulation,
  compareCodeUnits,
  densityBand,
  resolveParams,
  resolvePatch,
  selectPatterns,
  type BoundArticulation,
  type MoodState,
  type PatternSelection,
  type ResolvedPatchEntry,
} from './resolver'
import { assign, type Gap, type SearchReport } from './search'
import { chooseHook, chooseKey, type HookChoice } from './harmony'

/**
 * §7. The resolver, composed end to end. Pure functions, no React, and nothing imported from
 * `lib/devices/`.
 *
 * **The input is an *effective* template and *effective* devices.** A device reaching here is
 * already the shared definition composed with the user's rig overlay (#16); a template reaching
 * here is already the base template composed with its inspiration patches (§5). The caller does
 * both compositions — `applyInspirations(template, inspirations) -> Template` is a separate pure
 * function, specified in §5 and built at step 7 — so the resolver receives objects rather than
 * ids and rather than patch instructions. Doing one composition here and not the other would be
 * inconsistent for no reason.
 *
 * Pipeline, per §7, with step 1 (inspiration patching) performed by the caller before this runs:
 *
 *  2. Emit role requests, sorted by ascending priority (§4.4) — inside `assign`
 *  3. Expand all selected devices to `Assignable[]` (§2.2) — inside `assign`
 *  4. Resolve character per request (§6.2) — inside `assign`
 *  5. Select a pattern variant per request and section (§6.3) — **here, before assignment**
 *  6. Search assignments against the lexicographic objective (§7.1) — `assign`
 *  7. Resolve recipes, with fallback (§3.5) — inside `assign`
 *  8. Bind each recipe's articulation to the selected pattern's slots (§4.3) — here
 *  9. Resolve inherited citations, apply mood, stamp provenance (§3.1, §3.2) — here
 *
 * 10. Choose the key and one hook per role by seed, and resolve degrees to notes (§4.1) — here
 *
 * Step 10 was deferred at build step 5.5, which built `harmony.ts`'s arithmetic but left the
 * *choice* — which of `template.keys`, which of several authored hooks — unwired. It lands here
 * rather than in the renderer because it is a musical decision driven by the seed, and a
 * decision made during rendering would mean two renderers of one result could disagree about
 * what key the track is in. The renderer (§8, build step 6) renders; it decides nothing.
 */

// ---------------------------------------------------------------------------
// §7.4 Clock master
// ---------------------------------------------------------------------------

/** §7.4, in order. Anything a device declares beyond these ranks below both. */
export const TRANSPORT_PREFERENCE = ['midi-din', 'usb'] as const

export type ClockMaster = {
  deviceId: DeviceId
  deviceName: string
  /** The most-preferred transport this device actually declares. */
  transport: string
  /** §12.4: assignables occupied in at least one section. */
  occupiedAssignables: number
}

function transportRank(device: Device): number {
  for (let i = 0; i < TRANSPORT_PREFERENCE.length; i++) {
    const preferred = TRANSPORT_PREFERENCE[i] as string
    if (device.clock.transport.includes(preferred)) return i
  }
  return TRANSPORT_PREFERENCE.length
}

/**
 * §7.4. `canMaster`, then occupied-assignable count descending (§12.4), then transport
 * preference (`midi-din` > `usb`), then `deviceId` ascending by UTF-16 code unit (§7.2).
 *
 * **No seed.** Rerolling a pattern should not re-cable the rig, so this must be stable across
 * rerolls in a way that the assignment deliberately is not.
 *
 * Returns `undefined` when nothing in the rig can master — a real rig, and a fact the guide has
 * to state rather than paper over by nominating a device that cannot do it.
 */
export function selectClockMaster(
  devices: readonly Device[],
  occupied: Map<DeviceId, number>,
): ClockMaster | undefined {
  const capable = devices.filter((d) => d.clock.canMaster)
  if (capable.length === 0) return undefined

  const ranked = [...capable].sort((a, b) => {
    const byLoad = (occupied.get(b.id) ?? 0) - (occupied.get(a.id) ?? 0)
    if (byLoad !== 0) return byLoad
    const byTransport = transportRank(a) - transportRank(b)
    if (byTransport !== 0) return byTransport
    return compareCodeUnits(a.id, b.id)
  })

  const winner = ranked[0] as Device
  const rank = transportRank(winner)
  return {
    deviceId: winner.id,
    deviceName: winner.name,
    transport: (TRANSPORT_PREFERENCE[rank] ?? winner.clock.transport[0] ?? '') as string,
    occupiedAssignables: occupied.get(winner.id) ?? 0,
  }
}

/** §12.4. One per assignable occupied in at least one section, never one per section. */
function occupiedCounts(assignments: readonly ResolvedAssignment[]): Map<DeviceId, number> {
  const byDevice = new Map<DeviceId, Set<AssignableKey>>()
  for (const a of assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<AssignableKey>()
    set.add(assignableKey(a.assignable))
    byDevice.set(a.deviceId, set)
  }
  return new Map([...byDevice].map(([id, set]) => [id, set.size]))
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** What §8 renders for one part in one section. */
export type ResolvedSectionPattern = {
  section: SectionName
  /** Carries the band asked for and the band used, so §6.3's fallback is reported, not silent. */
  selection: PatternSelection
  /**
   * §7 step 8. Empty when the selection is 'none' — and empty is also correct when the device
   * simply had nothing to say about the slots this variant contains.
   */
  articulation: BoundArticulation[]
}

/**
 * Deliberately *not* the whole `Recipe`. §3.1: nothing downstream of the resolver sees an
 * `AuthoredParam`, and handing the renderer a `Recipe` would hand it `recipe.params` — authored
 * values with no provenance on them — one property access away from the resolved ones. Invariant
 * 4 is easier to keep when the unresolved form is simply not reachable.
 */
export type ResolvedRecipeRef = {
  id: RecipeId
  title: string
  /** The character actually authored, which for 'substituted' is not the one asked for. */
  character: Character
  outcome: 'exact' | 'substituted'
  routing?: string
}

export type ResolvedAssignment = {
  requestId: RequestId
  role: Role
  /** The character asked for, after §6.2 resolved the template pinning against mood. */
  character: Character
  priority: number
  optional: boolean
  assignable: Assignable
  deviceId: DeviceId
  deviceName: string
  recipe: ResolvedRecipeRef
  /** §7 step 9. Every one carries provenance — the type makes it unskippable (§3.1). */
  params: ResolvedParam[]
  patch: ResolvedPatchEntry[]
  sections: SectionName[]
  /** One entry per section this part occupies, in structure order. */
  patterns: ResolvedSectionPattern[]
}

export type ResolveInput = {
  /** Effective devices: shared definition composed with the user's overlay (#16). */
  devices: readonly Device[]
  /** Effective template: base composed with inspiration patches (§5), done by the caller. */
  template: Template
  mood: MoodState
  seed: number
}

/**
 * §7 step 10 / §4.1, and §8's opening phase. What the seed settled about the song itself,
 * before any of it reaches a device.
 */
export type ResolvedSong = {
  /** `bpm.default`. Nothing in the design gives the seed a tempo to pick, so it does not. */
  bpm: number
  /**
   * The key everything else resolved against. `undefined` only for a template authoring no
   * keys at all, which validation forbids and an effective template could still reach (§5) —
   * reported rather than guessed (invariant 5).
   */
  key: string | undefined
  /** Every key the template offers, so the alternatives a reroll could reach are visible. */
  keys: readonly string[]
  /**
   * One entry per role the template authors a hook for, by role in UTF-16 code unit order
   * (§7.2). A role with no authored hook has no entry — §4.1's rule that the guide omits the
   * hook rather than inventing one — and whether the role was *assigned* is a separate question
   * the renderer answers from `assignments`.
   */
  hooks: HookChoice[]
}

export type ResolveResult = {
  /** The effective template, passed through so §8 has structure, harmony and hooks to hand. */
  template: Template
  /**
   * The effective devices, passed through for the same reason the template is: §8's rig
   * integration phase needs clock, io and each device's `hints` table, and re-deriving that
   * from a separately held device list is how a guide comes to describe a rig it did not
   * resolve against.
   */
  devices: readonly Device[]
  /** §7 step 10. */
  song: ResolvedSong
  assignments: ResolvedAssignment[]
  gaps: Gap[]
  occupancy: Occupancy
  score: Score
  search: SearchReport
  /** `undefined` when nothing in the rig can master (§7.4). */
  clockMaster: ClockMaster | undefined
  /**
   * §7 step 5's output for **every** request, including the ones that became gaps. Pattern
   * selection depends only on template + mood, so it is meaningful whether or not the rig
   * could carry the part — and "we had a band-2 kick and nothing to play it on" is a more
   * useful gap than "no kick".
   */
  patterns: Map<RequestId, Map<SectionName, PatternSelection>>
}

// ---------------------------------------------------------------------------
// §7 The pipeline
// ---------------------------------------------------------------------------

export function resolve(input: ResolveInput): ResolveResult {
  const { devices, template, mood, seed } = input
  const deviceById = new Map(devices.map((d) => [d.id, d]))
  const requestById = new Map(template.roles.map((r) => [r.id, r]))

  // Step 5. Before assignment, because a variant's length and slot mix are part of what a
  // recipe has to articulate — and independent of the rig, because this reads only template
  // and mood. Two users with different boxes and the same inputs get the same rhythms.
  const patterns = new Map<RequestId, Map<SectionName, PatternSelection>>()
  for (const request of template.roles) {
    patterns.set(request.id, selectPatterns(template, request, mood))
  }

  // Steps 2, 3, 4, 6 and 7.
  const allocation = assign({ devices, template, mood, seed })

  // Steps 8 and 9.
  const assignments: ResolvedAssignment[] = allocation.assignments.map((a) => {
    const request = requestById.get(a.requestId) as RoleRequest
    const bySection = patterns.get(a.requestId)

    return {
      requestId: a.requestId,
      role: a.role,
      character: a.character,
      priority: request.priority,
      optional: request.optional === true,
      assignable: a.assignable,
      deviceId: a.deviceId,
      deviceName: deviceById.get(a.deviceId)?.name ?? a.deviceId,
      recipe: {
        id: a.recipe.id,
        title: a.recipe.title,
        character: a.recipeCharacter,
        outcome: a.outcome,
        ...(a.recipe.routing === undefined ? {} : { routing: a.recipe.routing }),
      },
      params: resolveParams(a.recipe, mood),
      patch: resolvePatch(a.recipe),
      sections: a.sections,
      patterns: a.sections.map((section) => {
        const selection: PatternSelection = bySection?.get(section) ?? {
          outcome: 'none',
          band: densityBand(mood.density),
        }
        return {
          section,
          selection,
          // A slot the variant does not contain is dropped silently (§7 step 8); a part with
          // no pattern at all has nothing to articulate against.
          articulation:
            selection.outcome === 'none' ? [] : bindArticulation(a.recipe, selection.pattern),
        }
      }),
    }
  })

  // Step 10. After assignment only because nothing above depends on it; the key is a function
  // of template and seed alone, so a rig change never moves it.
  const key = chooseKey(template.id, template.keys, seed)
  const hookRoles = [...new Set(template.hooks.map((h) => h.forRole))].sort(compareCodeUnits)
  const hooks =
    key === undefined
      ? []
      : hookRoles.flatMap((role) => chooseHook(template.hooks, role, key, seed) ?? [])

  return {
    template,
    devices,
    song: { bpm: template.bpm.default, key, keys: template.keys, hooks },
    assignments,
    gaps: allocation.gaps,
    occupancy: allocation.occupancy,
    score: allocation.score,
    search: allocation.search,
    clockMaster: selectClockMaster(devices, occupiedCounts(assignments)),
    patterns,
  }
}
