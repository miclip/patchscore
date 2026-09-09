import type { SampleTarget } from '@/lib/core'
import { sampleHref } from './catalogue'
import { sampleDescription, sampleTitle } from './sample-text'

/**
 * §3.8/#520. Everything a sound page states that is not a sentence, computed off the target.
 *
 * `riff-page.ts`' sibling, and deliberately smaller: a target has no notes, no grid, no key and no
 * tempo, so what is left is the addressing and the two strings a tab and a search result show.
 * How a rig arrives from storage is `borrowed-rig.ts`', shared with the riff page because it is
 * the same borrowing under the same rule.
 */

export type SamplePage = {
  target: SampleTarget
  href: string
  /** `Wobble bass — Patchscore`, the shape every catalogue title has. */
  title: string
  description: string
}

export function samplePageTitle(target: SampleTarget): string {
  return `${sampleTitle(target)} — Patchscore`
}

export function samplePage(target: SampleTarget): SamplePage {
  return {
    target,
    href: sampleHref(target),
    title: samplePageTitle(target),
    description: sampleDescription(target),
  }
}
