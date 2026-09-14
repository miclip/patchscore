import type { Device, ShippedPatch } from '@/lib/core'
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
 * §3/#553/#593. **The recipe that reaches a patch, said once.**
 *
 * **The guide's own sentence is deliberately not reused here**, and the first version of this
 * page proved why. It read *Factory patch — the box ships 3 Osc Bass Love, which arrives here
 * already*, under a heading that is `3 Osc Bass Love`, on a page titled *factory patches*. It
 * repeated the name from the line above it and then stated the premise of the whole surface.
 *
 * On a guide that sentence earns its place: the reader asked for a `bass-mid · dirty`, the patch
 * is news, and naming it is the whole point. Here the patch is the heading and the only thing a
 * reader does not already know is that **the box can make this sound from scratch**. So that is
 * what the label says, and the line carries the recipe and nothing else.
 */
export const PRESET_RECIPE = 'Built by hand — '

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

/**
 * §3/#553/#598. **Said only where `PresetFigure.byHand` holds**: the recipe the figure landed
 * on names this patch, so the settings under it build the patch from scratch. The guide's and
 * the riff page's sentence, with the patch named in the first clause: on those surfaces a
 * *Factory patch — X* line stands above it and *it* has a referent, and here the line above is
 * the figure's title, so the sentence carries the name itself.
 */
export function presetByHand(patch: ShippedPatch): string {
  return `Load ${patch.name} and the settings below are already dialled. They build the same sound by hand.`
}

/** The link from a figure page back to the index that lists it. */
export function presetFigureBack(device: Device): string {
  return `Every patch on the ${deviceLabel(device)}`
}
