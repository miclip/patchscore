import type { Device, ShippedPatch } from '@/lib/core'
import { deviceLabel } from './catalogue'
import type { PresetSession } from './preset-session'

/**
 * §2.6/#593. **The words a preset session says, in one place, because two surfaces say them.**
 *
 * The panel on the device page and the page at `presetsHref` are siblings in §8's sense: the
 * same reader, the same session, one folded and one laid open. Every sentence they share lives
 * here rather than in either of them, on `kit-text.ts`'s pattern, so parity is structural.
 * What each renderer owns is its ink.
 *
 * **Nothing here counts what it does not list.** The Muse ships 224 patches and declares twelve,
 * and no sentence below says *twelve of*, by operator decision (#593): a denominator turns a
 * fact about the box into a score of this library's authoring, which no rendered surface may
 * show. The panel and the page list what is declared and say nothing about the rest.
 */

/** `Moog Muse: factory patches`. The page's title and the panel's link, one string. */
export function presetTitle(device: Device): string {
  return `${deviceLabel(device)}: factory patches`
}

/**
 * What the list is, in one sentence, and the reason to open it (#593). No count: the entries
 * are the ones somebody who owns the box picked out, and a number in front of them would read
 * as the box's total.
 */
export const PRESET_LEAD =
  'The ones worth knowing, what each is for, and the figure written for it where one exists.'

/** The device page's panel heading — the section's name in #593, the reason to open the page. */
export const PRESET_HEADING = 'Explore your device'

/**
 * §3/#553. **The recipe that reaches a patch, and the claim the guide already makes about it.**
 *
 * `PRESET_RECIPE` opens a line that names the recipe, and `factoryPatchClaim` closes it with
 * the guide's own sentence for `Recipe.factoryPatch` — *Factory patch — the box ships X, which
 * arrives here already* (`render.ts`, `phase-sound.tsx`) — word for word, so three surfaces say
 * one thing about one field. The guide's second sentence, about *the settings below*, is left
 * off: there are no settings below on this surface. Hand-matched to the guide's rather than
 * imported from it, for the reason the riff page's is: the guide's lives in `lib/core` and a
 * shared constant across that boundary is more machinery than one sentence earns.
 */
export const PRESET_RECIPE = 'Recipe — '

export function factoryPatchClaim(patch: ShippedPatch): string {
  const where = patch.bank === undefined ? '' : ` in ${patch.bank}`
  return `Factory patch — the box ships ${patch.name}${where}, which arrives here already.`
}

/** The label in front of the link to the riff written for a patch. */
export const PRESET_FIGURE = 'Figure — '

/** The one sentence a search result shows. */
export function presetDescription(session: PresetSession): string {
  return (
    `Factory patches on the ${deviceLabel(session.device)} worth knowing, what each is for, ` +
    'and the figure written for it.'
  )
}
