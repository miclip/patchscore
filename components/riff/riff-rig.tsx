'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DeviceId } from '@/lib/core'
import { MAX_RIG_DEVICES, loadStudio, resolveRiff } from '@/lib/core'
import { riffById } from '@/lib/riffs'
import { browserEnv } from '@/lib/studio/browser-env'
import { rigFromIds, rigIdsFromStudio } from '@/lib/studio/riff-page'
import { riffGap } from '@/lib/studio/riff-text'
import { CATALOGUE } from '@/lib/studio/session'
import { RigPicker } from '@/components/rig/rig-picker'
import { RiffVoice } from './riff-voice'

/**
 * §5A/#503. **The rig half of a riff page: the boxes the reader owns, and where the figure lands
 * on them.**
 *
 * The one client boundary on the route. Everything else — the technique, the notes, the grid — is
 * a property of the entry and is prerendered; only *where it plays* depends on what somebody
 * ticked, and only that is here.
 *
 * ---------------------------------------------------------------------------
 * It reads the studio and never writes it
 * ---------------------------------------------------------------------------
 *
 * The rig is borrowed so that the first thing a reader sees is their own boxes rather than an
 * empty list — and borrowed in the strictest sense. `loadStudio` is the only storage call in this
 * component's whole import graph: there is no `createStudioSync`, no `syncStudio`, no
 * `saveStudio`, and nothing writes `STUDIO_STORAGE_KEY`. Ticking a box here changes this page and
 * nothing else, and closing the tab leaves the reader's studio exactly as they left it.
 *
 * That is a *rule*, not a happy accident of the current code, and `test/riff-storage.test.ts`
 * holds it with a `setItem` that throws. A riff page is somewhere a reader arrives from a search
 * result to look at one figure; silently rewriting the rig they had built in the studio because
 * they ticked a box to see whether their Digitakt could play it would be the worst kind of
 * surprise — invisible, and only discovered later.
 *
 * **The read happens in an effect, never in render** (#12). Nothing may reach `window` while
 * React is rendering, which is what keeps the server's markup and the client's first markup the
 * same bytes; `browser-env.ts` says so and `test/studio-render.test.ts` is where it is enforced
 * for the studio.
 *
 * **Every storage failure is the same answer: no boxes.** Nothing stored yet, a document this
 * build cannot read, or no storage at all are three ways of not having been told what the reader
 * owns. A page that guessed would be showing somebody else's rig; a page that reported the
 * failure would hand a reader a diagnostic about a document they have never seen instead of the
 * figure they came for. So all three open with an empty picker and §7.3's honest gap, which says
 * the one thing they can act on: tick a box.
 *
 * ---------------------------------------------------------------------------
 * No Studio controls
 * ---------------------------------------------------------------------------
 *
 * No direction, no mood, no seed, no tempo, no key, no inspirations, no placements, no permalink.
 * Every one of those belongs to a *song*, and a riff is one figure; reaching for any of them
 * would need a `Template`, which is the whole of why a riff is not one (§5A.1).
 *
 * The picker is the only control, and it is `RigPicker` rather than the studio's: that one
 * carries inspiration filters, a gap filter that needs a direction to answer, a multi-part filter
 * about a song's parts, and a patchbay with a clock source and an `out` run leaving for a guide.
 * See `rig-picker.tsx`. The only thing it changes is this page.
 */
export function RiffRig({ riffId }: { riffId: string }) {
  const riff = riffById(riffId)
  const [selected, setSelected] = useState<readonly DeviceId[]>([])

  useEffect(() => {
    // Read once, on mount, and never again — there is nothing here that writes, so there is
    // nothing to keep in step. `rigIdsFromStudio` answers `[]` for every failure and reconciles
    // an `ok` document against the catalogue this build ships (§7.2's registry order).
    setSelected(rigIdsFromStudio(loadStudio(browserEnv().storage, CATALOGUE)))
  }, [])

  const devices = useMemo(() => rigFromIds(selected), [selected])
  const resolution = useMemo(
    () => (riff === undefined ? undefined : resolveRiff(riff, devices)),
    [riff, devices],
  )

  function onToggle(id: DeviceId, on: boolean) {
    setSelected((current) => {
      if (!on) return current.filter((held) => held !== id)
      if (current.includes(id)) return current
      // #301's cap, honoured here as it is in the studio: a rig larger than ten cannot be reached
      // through any picker, and this one is a picker.
      if (current.length >= MAX_RIG_DEVICES) return current
      return [...current, id]
    })
  }

  if (riff === undefined || resolution === undefined) return null

  return (
    <div className="columns riff-rig">
      <RigPicker selected={selected} onToggle={onToggle} />

      <section className="panel riff-panel riff-where-panel">
        <header>
          <h2>Where it plays</h2>
        </header>
        {resolution.outcome === 'played' ? (
          <RiffVoice riff={riff} voice={resolution.voice} />
        ) : (
          <p className="riff-gap">{riffGap(riff, resolution.gap, resolution.devices)}</p>
        )}
      </section>
    </div>
  )
}
