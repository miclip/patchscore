import type { Device, PatchUse, Recipe, Riff, ShippedPatch } from '@/lib/core'
import { patchUseIssues, shippedPatchKey } from '@/lib/core'
import { RIFFS } from '@/lib/riffs'

/**
 * §2.6/#593. **A preset session: the factory patches one box ships, what each is for, and where
 * this library already reaches it.**
 *
 * Pure, and a view model rather than a renderer, on the pattern of `kitSession` (§3.7/#478):
 * nothing here draws anything and nothing here resolves. A device folder has already declared
 * the fact (`Device.factoryPatches`, #592) and the judgement beside it (`Device.patchUses`),
 * and this adds the two joins a reader looking down that list needs and the folder does not
 * carry:
 *
 *  - **which recipes reach the patch** — `Recipe.factoryPatch` (§3/#553), read off the same
 *    folder, matched on the shipped name and bank exactly. Five of the Muse's twelve today.
 *  - **which figure was written for it** — the riff whose `reference` is of kind `patch` and
 *    names it (§5A.5). Twelve of twelve today.
 *
 * **The second join points from the device to the riff and never back.** A riff names no box
 * (invariant 3) and gains no field here; it names a patch, and a box that ships a patch by that
 * name may link out to it. That is the whole architectural point of the surface (#593): a
 * preset belongs to one box, and the box is where it is listed.
 *
 * **What it is not**, and each is a boundary rather than an omission:
 *
 *  - **No song.** No mood, no arrangement, no rig, no direction. A preset is a sound the box
 *    ships, and this page is reached with none of those in hand.
 *  - **No count of anything it does not list.** The Muse ships 224 and twelve are declared;
 *    the session carries the twelve and no denominator, by operator decision (#593). A count of
 *    the rest is the library's authoring state, which no rendered surface may show.
 *  - **No ordering.** The entries come in the order the folder authored them, and the folder
 *    says why (the Muse's `PATCH_USES`). No maker prints a list, so there is no order to
 *    follow, and a sort here would overrule the one place that has thought about it.
 */

/** §2.6/#593. One shipped patch: the fact, the judgement, and where the library reaches it. */
export type PresetEntry = {
  /** The name and bank as the box prints them — `Device.factoryPatches`' own object. */
  patch: ShippedPatch
  /** What it is for, in the folder's words — `PatchUse.use`. */
  use: string
  /**
   * Recipes on this box whose `factoryPatch` names this patch, in manifest order. Often empty:
   * #563 declined seven of the Muse's twelve because no recipe's settings reach them, and an
   * empty list here is that decline kept, not a gap to fill.
   */
  recipes: readonly Recipe[]
  /** The figure written for this patch, where a riff's `reference` names it. */
  riff?: Riff
}

/** §2.6/#593. What one box offers somebody exploring the patches it ships. */
export type PresetSession = {
  device: Device
  /** `Device.patchUses` order, one entry each. */
  entries: readonly PresetEntry[]
}

/**
 * §2.6/#593. **The riff written for a patch, by name.**
 *
 * `Riff.reference` carries a name and no bank, so the match is on the name alone, and it is a
 * name join rather than a device join: a second box shipping a patch called *Vox Humana* would
 * reach the same figure, which is right, because the figure is named for the patch and not for
 * the box. **Two riffs naming one patch is refused rather than resolved**: a link is to *the*
 * figure written for a patch, and which of two that should be is an authoring decision, so it
 * throws here and `test/preset-session.test.ts` sees it before a page does.
 */
function figureFor(patch: ShippedPatch, riffs: readonly Riff[]): Riff | undefined {
  const matches = riffs.filter(
    (riff) => riff.reference.kind === 'patch' && riff.reference.name === patch.name,
  )
  if (matches.length > 1) {
    throw new Error(
      `factory patch '${patch.name}' is the reference of ${matches.length} riffs (${matches.map((r) => r.id).join(', ')}); a preset links to one figure, so decide which`,
    )
  }
  return matches[0]
}

/**
 * §2.6/#593. **The session for one box, or `undefined` where the box has not declared both
 * halves.**
 *
 * `undefined` rather than an empty session, for the kit's reason (§3.7): a page that says *here
 * are the patches worth knowing* over nothing is a claim made in the negative. The same answer
 * for a box with the fact and no judgement — `factoryPatches` and no `patchUses` — because a
 * list of names with nothing under them is a list a reader can already get off the box.
 *
 * Throws where the two declarations disagree. `DeviceSchema` refuses that at authoring time, so
 * a device built past it is the only way to reach the throw, and the throw is what keeps a
 * mismatched list from rendering with a row missing.
 */
export function presetSession(
  device: Device,
  riffs: readonly Riff[] = RIFFS,
): PresetSession | undefined {
  const shipped = device.factoryPatches
  const uses = device.patchUses
  if (shipped === undefined || uses === undefined) return undefined

  const issues = patchUseIssues(shipped, uses)
  if (issues.length > 0) {
    throw new Error(`${device.id}: ${issues.map((issue) => issue.message).join('; ')}`)
  }

  const byKey = new Map(shipped.map((patch) => [shippedPatchKey(patch), patch]))
  const entries = uses.map((use: PatchUse): PresetEntry => {
    const key = shippedPatchKey(use)
    // `patchUseIssues` has already refused a key with no patch behind it.
    const patch = byKey.get(key) as ShippedPatch
    const recipes = device.recipes.filter(
      (recipe) =>
        recipe.factoryPatch !== undefined && shippedPatchKey(recipe.factoryPatch) === key,
    )
    const riff = figureFor(patch, riffs)
    return { patch, use: use.use, recipes, ...(riff === undefined ? {} : { riff }) }
  })

  return { device, entries }
}
