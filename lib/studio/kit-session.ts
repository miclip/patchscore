import type { Device, Recipe, Role } from '@/lib/core'
import { READER_SUPPLIED, type RecordingDestination } from './destination'
import { KIT_ROLES, kitRecipes } from './device-page'

/**
 * §3.7/#478. **A kit session: the sounds one box makes, in the order they are built, with the
 * slot each one is going to end up in.**
 *
 * Pure, and deliberately a view model rather than a renderer. Nothing here draws anything, and
 * nothing here resolves: `kitRecipes` has already decided which recipes qualify and in what
 * order (§3.6), and this adds exactly the two facts a reader working down that list needs and
 * the selection alone does not carry — **what to call each sound once it exists**, and **which
 * core kit sounds this box will not be giving them**.
 *
 * **What it is not**, and each of these is a boundary rather than an omission:
 *
 *  - **No recording capability.** No device gained a field, no manifest says whether a box can
 *    sample, and nothing here asks one. The destination is the reader's, below.
 *  - **No song.** No mood, no arrangement, no step pattern, no tempo — §3.6's limit, unchanged.
 *    A kit is twelve sounds, not an arrangement of them.
 *  - **No new recipes.** Every `Recipe` below is the same object the device page and the guide
 *    already render, by reference.
 */

/*
 * §3.7. **Where the sounds go**: `RecordingDestination`, and the whole argument for it, moved to
 * `destination.ts` at #520 when a rig-wide sample session needed the identical answer. Nothing
 * about this surface changed — the model still names no destination device, because it knows of
 * none: this page is reached with no rig and no direction (§3.6), so the other boxes in the room
 * are not facts it holds.
 */

/** §3.7. One sound in the session: what it is called, what plays it, and what builds it. */
export type KitSlot = {
  /**
   * `KICK 1`, `CLOSED HAT 2` — the role, spelled for a label, with its position within that
   * role in this kit.
   *
   * **Always numbered, even where the role appears once.** The alternative — bare `KICK` until
   * a second one exists — renames an existing slot the day a device folder authors another
   * kick, and a slot name is the thing a reader has written on a pad, a file or a strip of
   * tape. Numbering from the start costs one character and never moves.
   *
   * Derived from the role and the kit order, so it is a pure function of the manifest: same
   * manifest, same names, on any platform (invariant 6). It is not authored anywhere and must
   * not become authorable — a name a device folder could set would be a device naming something
   * outside its own capabilities, and two boxes would spell `CLOSED HAT` differently by Tuesday.
   */
  name: string
  role: Role
  recipe: Recipe
}

/** §3.7. What one box offers somebody building a kit at it. */
export type KitSession = {
  device: Device
  destination: RecordingDestination
  /** `kitRecipes` order, one slot each. */
  slots: readonly KitSlot[]
  /** Core kit roles this box authors nothing for, in kit order — see `CORE_KIT_ROLES`. */
  absent: readonly Role[]
  /**
   * §3.7/#496. **The routing preamble every slot in this session shares**, or `undefined` where
   * they do not all share one — see `sharedRoutingPreamble`.
   *
   * A renderer that has this says it once, in the header, and prints each slot's own half under
   * that slot. A renderer with `undefined` here prints `recipeRouting` per slot, exactly as
   * before: nothing is dropped, because a fact that is not shared has no header to go in.
   */
  routingPreamble?: string
}

/**
 * §3.7/#496. **The routing preamble every one of these recipes carries, if they all carry the
 * same one.**
 *
 * The predicate is *identical and authored on every one of them*, and both halves matter. Authored
 * (§3), so the thing hoisted is a fact somebody marked as being about the box rather than a prefix
 * that happens to match today. Every one, because a header sentence is a claim over the whole
 * page: one slot out of eight without it and the header would be saying something untrue of the
 * sound a reader is looking at.
 *
 * Six of the nine boxes with a kit answer this; three write each routing line whole and answer
 * `undefined`, which is why the fix is a split rather than a renderer trick (#496).
 */
export function sharedRoutingPreamble(recipes: readonly Recipe[]): string | undefined {
  const first = recipes[0]?.routingPreamble
  if (first === undefined) return undefined
  return recipes.every((recipe) => recipe.routingPreamble === first) ? first : undefined
}

/**
 * §3.7. **The three kit roles that are colour rather than kit** — `KIT_ROLES`' own last group,
 * the fills a reader reaches for after the skins and the metal are down.
 *
 * Named here so `CORE_KIT_ROLES` can be one list minus another instead of a second ordering to
 * keep in step with the first. §3.6 already files `KIT_ROLES` in three groups; this is the third
 * of them, quoted rather than re-derived.
 */
const KIT_FILL_ROLES: readonly Role[] = ['ghost-perc', 'noise', 'impact']

/**
 * §3.7/invariant 5. **The kit sounds whose absence is worth saying out loud**, in kit order:
 * the skins and the metal, which is `KIT_ROLES` without the fills.
 *
 * **A gap is only honest if it is a gap in something.** Reported against all twelve roles, the
 * Cascadia — a mono synth that makes a genuinely usable kick, tom, metallic, noise and impact —
 * would be listed as missing `ghost-perc`, which nobody was looking for and which is not a hole
 * in a kit. Reported against the nine, it says it has no snare, clap, rim, closed hat, open hat
 * or ride, and every one of those is a sound a reader will notice they cannot play.
 *
 * The line is not "which roles are common" but which ones a kit is *made of*: the fills are what
 * goes between the sounds a beat is built from, and a kit with no `ghost-perc` is a kit.
 */
export const CORE_KIT_ROLES: readonly Role[] = KIT_ROLES.filter(
  (role) => !KIT_FILL_ROLES.includes(role),
)

/**
 * §3.7. `closed-hat` → `CLOSED HAT`. The role id, spelled for a label a reader writes on a pad.
 *
 * No `toLocaleUpperCase`, no `Intl`: role ids are ASCII by construction (§1), and a locale-aware
 * upper case is exactly the class of call CLAUDE.md forbids for producing different bytes on two
 * machines with no error anywhere.
 */
function slotLabel(role: Role): string {
  return role.replace(/-/g, ' ').toUpperCase()
}

/**
 * §3.7. **The session for one box, or `undefined` where there is no kit to have a session
 * about.**
 *
 * `undefined` rather than an empty session, because §3.6's `KIT_MINIMUM` is a claim and not a
 * length check: below four kit sounds the product does not say *this box can make you a kit*,
 * and a session carrying no slots and nine absent roles would be that claim made in the
 * negative, on a page for a box whose recipes are all still there to read.
 */
export function kitSession(device: Device): KitSession | undefined {
  const recipes = kitRecipes(device)
  if (recipes.length === 0) return undefined

  // Counted as the ordered list is walked, so the ordinal is the reader's own position in the
  // kit rather than anything about where the recipe sits in the manifest.
  const seen = new Map<Role, number>()
  const slots = recipes.map((recipe): KitSlot => {
    const ordinal = (seen.get(recipe.role) ?? 0) + 1
    seen.set(recipe.role, ordinal)
    return { name: `${slotLabel(recipe.role)} ${ordinal}`, role: recipe.role, recipe }
  })

  const preamble = sharedRoutingPreamble(recipes)
  return {
    device,
    destination: READER_SUPPLIED,
    slots,
    absent: CORE_KIT_ROLES.filter((role) => !seen.has(role)),
    ...(preamble === undefined ? {} : { routingPreamble: preamble }),
  }
}
