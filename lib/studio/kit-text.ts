import type { Device } from '@/lib/core'
import { authoredClaims, citationSentence } from '@/lib/core'
import { deviceLabel, plural } from './catalogue'
import { andList } from './device-page'
import type { KitSession } from './kit-session'

/**
 * §3.7/#478. **The words a kit session says, in one place, because two surfaces say them.**
 *
 * The Markdown renderer and the standalone page are siblings in §8's sense: the same reader, the
 * same session, one of them on paper and one on a screen. Every sentence they share lives here
 * rather than in either of them, so parity is structural rather than something a test notices
 * after the two have drifted. What each renderer owns is its *ink* — a heading level, a
 * monospace span, an ordinal gutter — and none of that is here.
 */

/** `Intellijel Cascadia: build a kit`. The page's title and the document's heading, one string. */
export function kitTitle(device: Device): string {
  return `${deviceLabel(device)}: build a kit`
}

/**
 * What the list is, in one sentence.
 *
 * *makes on its own* carries the fact that matters and carries it in the words a reader would
 * use: §3.6 excludes any recipe declaring `sourceAudio`, so there is nothing to load. Saying
 * *Nothing is loaded* after it restated the same thing as a negative, which is a sentence about
 * what this page is not doing rather than about the box.
 */
export function kitLead(session: KitSession): string {
  return (
    `${plural(session.slots.length, 'drum sound')} this box makes on its own, in the order to ` +
    'build them.'
  )
}

/**
 * §3.7. **The destination, once: the reader's own gear.**
 *
 * An instruction rather than a statement about what this page does not do. The page is reached
 * with no rig, so it knows of no box to send a sound to, and it asks nothing of this device
 * either — whether a box can record is a fact no manifest states.
 */
export const KIT_DESTINATION = 'Record each hit with the sampler, recorder, or DAW you use.'

/**
 * §3.7. The action that ends every slot, up to the slot's name — which each renderer sets in its
 * own monospace: backticks in Markdown, a `mono` span on the page.
 */
export const KIT_RECORD = 'Record one hit with your recorder as '

/**
 * §3.2/invariant 4. **One citation sentence for the whole session**, over the settings it
 * renders and no others, with no mark or page on any value.
 *
 * `citationSentence` is §8's own and `authoredClaims` projects the three claims §3.2 counts
 * straight off the authored params — nothing is resolved to build it. No #107 hoisting, because
 * there is none to do: each slot is a separate patch built one at a time, and a control that
 * appears in two of them is set twice by a reader who builds both.
 */
export function kitCitation(session: KitSession): string | undefined {
  return citationSentence(
    session.slots.flatMap((slot) => authoredClaims(slot.recipe.params, slot.recipe.verified)),
  )
}

/**
 * §3.7/invariant 5. **The core kit sounds this list does not cover**, written as the thing to do
 * about them.
 *
 * It makes no claim about the box and none about this library: *nothing here makes a snare* is a
 * claim nobody checked, and what has or has not been authored is never the reader's business.
 * What they are given is the action, which is the only part of it they can use.
 */
export function kitGap(session: KitSession): string | undefined {
  if (session.absent.length === 0) return undefined
  const names = session.absent.map((role) => role.replace(/-/g, ' '))
  return `Bring ${andList(names)} from another box or a sample library.`
}

/** The one sentence a search result shows. Counts, because the counts are what the page holds. */
export function kitDescription(session: KitSession): string {
  return (
    `${plural(session.slots.length, 'drum sound')} the ${deviceLabel(session.device)} makes on ` +
    'its own, with the cables and the settings for each.'
  )
}
