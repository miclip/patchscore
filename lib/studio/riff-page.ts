import type { Riff } from '@/lib/core'
import { riffHref } from './catalogue'
import { riffDescription, riffTitle } from './riff-text'

/**
 * §5A. Everything a riff page states that is not a sentence, computed off the entry.
 *
 * The mirror of `direction-page.ts`, and deliberately not symmetric with it: a riff has no
 * structure, no harmonic cycle and no list of competing requests, and giving it those so the two
 * pages matched would be the page dictating the data model (invariant 3). What it has instead is
 * one part, one figure and one grid.
 *
 * Sentences live in `riff-text.ts`, which the Markdown export shares (#495). This file holds the
 * addressing and the counts; how a rig arrives from storage moved to `borrowed-rig.ts` at #520,
 * and is re-exported at the foot of this file.
 */

export type RiffPage = {
  riff: Riff
  href: string
  /** `The Blue Monday bass — Patchscore`, the shape every catalogue title has. */
  title: string
  description: string
}

export function riffPageTitle(riff: Riff): string {
  return `${riffTitle(riff)} — Patchscore`
}

export function riffPage(riff: Riff): RiffPage {
  return {
    riff,
    href: riffHref(riff),
    title: riffPageTitle(riff),
    description: riffDescription(riff),
  }
}

/*
 * §5A.6/#520. **The rig helpers moved to `borrowed-rig.ts`** when the samples surface needed the
 * same four functions with the same rule behind them. They are re-exported here so every existing
 * importer, and `test/riff-storage.test.ts`'s own import list, is unchanged.
 */
export { rigFromIds, rigFromStudio, rigIdsFromStudio, storedRigName } from './borrowed-rig'
