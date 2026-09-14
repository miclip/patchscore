import type { Device } from '@/lib/core'
import { deviceLabel } from './catalogue'
import type { PresetFigure, PresetSession } from './preset-session'

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
 * §2.6/#593/#598. **Nothing about a recipe, on any preset surface.** Two attempts at a line
 * about `Recipe.factoryPatch` stood here and both failed the same way: *Factory patch — the box
 * ships X, which arrives here already* under a heading that is X, then *Built by hand — <recipe
 * title>*, which on a page about presets reads as an instruction to assemble the thing the page
 * just said to load, with the recipe's title sitting where a description of the patch belongs.
 * A sentence about the recipe/patch relationship is meaningful on a guide, where the reader
 * asked for a `lead / bright` and the patch is the shortcut; here the patch is the subject, and
 * a preset is a thing you load. Operator decision, #598: a preset entry is the name, what it is
 * for, and the figure. `Recipe.factoryPatch` itself is untouched and still renders on a guide.
 */

/** The label in front of the link to the riff written for a patch. */
export const PRESET_FIGURE = 'Figure — '

/** The one sentence a search result shows. */
export function presetDescription(session: PresetSession): string {
  return (
    `Factory patches on the ${deviceLabel(session.device)} worth knowing, what each is for, ` +
    'and the figure written for it.'
  )
}

// ---------------------------------------------------------------------------
// §3.7/#598. The figure page
// ---------------------------------------------------------------------------

/**
 * `The Muse Runner floating-arrival lead on the Moog Muse`. The figure's own name, which
 * carries the patch's verbatim (§5A.5), and then the box, because the page is under the box
 * and a search result has to say which one before the reader opens it.
 */
export function presetFigureTitle(device: Device, figure: PresetFigure): string {
  return `${figure.riff.name} on the ${deviceLabel(device)}`
}

/**
 * The one sentence a search result shows. Opens with a verb, on `riffDescription`'s rule
 * (§5A.5): something to do rather than a table of contents. It names the box outright where a
 * riff's says *the boxes you own*, since here the box is known and is the whole point of the
 * page, and the figure is one **written here**, so nothing suggests the patch ships with notes.
 */
export function presetFigureDescription(device: Device, figure: PresetFigure): string {
  return (
    `Load ${figure.riff.reference.name} on the ${deviceLabel(device)} and practise the technique ` +
    'against a figure written here, with the settings on that box.'
  )
}

/**
 * `On the Moog Muse`: the heading over the box's block on the figure page, after *The
 * technique*, *The chords*, *The notes* and *The grid*. A riff page heads the same block *Where
 * it plays*, a question with one answer here, already in the title and the address bar. Not
 * *The settings*, because the block's own `Settings` sub-heading sits inside it and a heading
 * that restates the one under it is the copy #593 took off this surface.
 */
export function presetBoxHeading(device: Device): string {
  return `On the ${deviceLabel(device)}`
}

/** The link from a figure page back to the index that lists it. */
export function presetFigureBack(device: Device): string {
  return `Every patch on the ${deviceLabel(device)}`
}
