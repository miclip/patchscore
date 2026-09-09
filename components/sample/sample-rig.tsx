'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExportActions } from '@/components/export-actions'
import { RigPicker } from '@/components/rig/rig-picker'
import type { DeviceId } from '@/lib/core'
import { MAX_RIG_DEVICES, loadStudio, resolveSample } from '@/lib/core'
import { sampleTargetById } from '@/lib/samples'
import { browserEnv } from '@/lib/studio/browser-env'
import { rigFromIds, rigIdsFromStudio } from '@/lib/studio/borrowed-rig'
import { renderSample, sampleFilename } from '@/lib/studio/sample-markdown'
import { READER_SUPPLIED } from '@/lib/studio/destination'
import { SAMPLE_RECORD, sampleDestination, sampleFileName } from '@/lib/studio/sample-text'
import { CATALOGUE } from '@/lib/studio/session'
import { SampleGapBlock, SampleVoice } from './sample-voice'

/**
 * §3.8/#520. **The rig half of a sound page: the boxes the reader owns, and which of them makes
 * this sound.**
 *
 * The one client boundary on the route. The technique above it is a property of the target and is
 * prerendered; only *where it is made* depends on what somebody ticked, and only that is here.
 *
 * ---------------------------------------------------------------------------
 * It reads the studio and never writes it
 * ---------------------------------------------------------------------------
 *
 * `RiffRig`'s rule, unchanged, and enforced against this route's own files by
 * `test/sample-storage.test.ts`. The rig is borrowed so the first thing a reader sees is their own
 * boxes rather than an empty list, and borrowed in the strictest sense: `loadStudio` is the only
 * storage call in this component's whole import graph, there is no `createStudioSync`, no
 * `syncStudio`, no `saveStudio`, and nothing writes the studio key. Ticking a box here changes
 * this page and nothing else (#448).
 *
 * **The read happens in an effect, never in render** (#12), which is what keeps the server's
 * markup and the client's first markup the same bytes.
 *
 * **Every storage failure is the same answer: no boxes**, and the `no-rig` gap says the one thing
 * a reader can act on.
 *
 * ---------------------------------------------------------------------------
 * The Markdown is built here, and that is the one place this differs from a kit page
 * ---------------------------------------------------------------------------
 *
 * `/devices/<id>/kit` renders its document on the server and hands `ExportActions` two strings,
 * so the whole engine stays out of the browser bundle. That is not available here: the document
 * says which of *the reader's* boxes makes the sound, and the rig is client state. So the string
 * is built in the browser, by the island that already holds `resolveSample` and the registry for
 * the picker. Nothing extra crosses the boundary — the renderer is the only addition, and it is
 * the smallest of the three.
 *
 * ---------------------------------------------------------------------------
 * No Studio controls
 * ---------------------------------------------------------------------------
 *
 * No direction, no mood, no seed, no tempo, no key, no inspirations, no placements, no permalink,
 * no grid and no harmony. Every one of those belongs to a *song*, and this is one sound.
 */
export function SampleRig({ targetId }: { targetId: string }) {
  const target = sampleTargetById(targetId)
  const [selected, setSelected] = useState<readonly DeviceId[]>([])

  useEffect(() => {
    // Read once, on mount, and never again — there is nothing here that writes, so there is
    // nothing to keep in step. `rigIdsFromStudio` answers `[]` for every failure and reconciles an
    // `ok` document against the catalogue this build ships (§7.2's registry order).
    setSelected(rigIdsFromStudio(loadStudio(browserEnv().storage, CATALOGUE)))
  }, [])

  const devices = useMemo(() => rigFromIds(selected), [selected])
  const resolution = useMemo(
    () => (target === undefined ? undefined : resolveSample(target, devices)),
    [target, devices],
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

  if (target === undefined || resolution === undefined) return null

  return (
    <div className="columns sample-rig">
      <RigPicker selected={selected} onToggle={onToggle} />

      <section className="panel riff-panel sample-where-panel">
        <header>
          <h2>Where to make it</h2>
        </header>
        {resolution.outcome === 'made' ? (
          <>
            <SampleVoice target={target} voice={resolution.voice} />

            {/*
              §3.7/§3.8. The destination and the file name, and **only where the rig makes the
              sound**. A gap has already given the whole of what to do about it — tick a box, buy
              one, bring a recording, dial it by ear — and *Record it and name it `VOCAL CHOP`*
              under any of those is an instruction for a file that does not exist yet. On
              `loads-audio` in particular the gap says to bring a recording or make one, and how to
              make one is #521's rather than this page's.
            */}
            <h3 className="sample-sub">Recording it</h3>
            <p className="sample-destination">{sampleDestination(READER_SUPPLIED)}</p>
            <p className="sample-record">
              {SAMPLE_RECORD}
              <span className="mono">{sampleFileName(target)}</span>.
            </p>

            {/*
              §3.8. The download and the print go with the recording block, for the same reason.
              A gap document says *pick*, *add*, *bring* or *set it by ear* and nothing else; it is
              an answer about the rig rather than a patch anybody builds from, and offering it as a
              file to keep would be this page dressing a shortfall up as a build recipe. The
              gapped golden still pins those bytes as a renderer test — what goes is the action,
              not the document.
            */}
            <ExportActions
              markdown={renderSample(resolution)}
              filename={sampleFilename(resolution)}
            />
          </>
        ) : (
          <SampleGapBlock resolution={resolution} />
        )}
      </section>
    </div>
  )
}
