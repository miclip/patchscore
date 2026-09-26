'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Device, DeviceId, Riff, RiffPartResolution } from '@/lib/core'
import { loadStudio } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { browserEnv } from '@/lib/studio/browser-env'
import { rigFromIds, rigIdsWithout, toggledRig } from '@/lib/studio/borrowed-rig'
import { presetCompanion, presetSession } from '@/lib/studio/preset-session'
import { presetCompanionExcluded } from '@/lib/studio/preset-text'
import { companionGap, companionSubject, whereHeading } from '@/lib/studio/riff-text'
import { CATALOGUE } from '@/lib/studio/session'
import { RigPicker } from '@/components/rig/rig-picker'
import { RiffVoice } from '@/components/riff/riff-voice'

/**
 * §5A.9/§3.7. **Where a preset figure's companion plays, on the reader's other boxes.**
 *
 * The page's box plays the host, and its block above this one is fixed. The companion needs a
 * second box, which only the reader can name, so this is `RiffRig`'s shape on a preset page: a
 * picker and one outcome block, resolved by `presetCompanion`.
 *
 * **The page's box is not offered.** It is left out of the rows and out of the rig the page opens
 * on, and one line under the heading says why. A row for it could only be ticked to no effect,
 * and a box that appears selectable and silently does nothing is worse than one that is not there.
 *
 * **Borrowed and never written**, for `RiffRig`'s reason and with its rule: `loadStudio` in an
 * effect is the only storage call, and `test/riff-storage.test.ts` holds this file to it. No
 * Studio controls, and no keyboard-reach check: the companion is on another box, fingered or
 * sequenced, which the page cannot know (§5A.9).
 */
export function PresetCompanion({ deviceId, patch }: { deviceId: string; patch: string }) {
  const device = DEVICES.find((d) => d.id === deviceId)
  const figure = useMemo(() => {
    const session = device === undefined ? undefined : presetSession(device)
    return session?.entries.find((e) => e.slug === patch)?.figure
  }, [device, patch])
  const offered = useMemo(() => DEVICES.filter((d) => d.id !== deviceId), [deviceId])
  const [selected, setSelected] = useState<readonly DeviceId[]>([])

  useEffect(() => {
    // Once, on mount, and never written back. The page's own box is dropped on the way in.
    setSelected(rigIdsWithout(loadStudio(browserEnv().storage, CATALOGUE), deviceId))
  }, [deviceId])

  const rig = useMemo(() => rigFromIds(selected, offered), [selected, offered])
  const part = useMemo(
    () =>
      figure === undefined || device === undefined ? undefined : presetCompanion(figure, rig, device),
    [figure, rig, device],
  )

  if (device === undefined || figure === undefined || part === undefined) return null

  function onToggle(id: DeviceId, on: boolean) {
    setSelected((current) => toggledRig(current, id, on, deviceId))
  }

  return (
    <PresetCompanionView
      riff={figure.riff}
      device={device}
      offered={offered}
      rig={rig}
      part={part}
      selected={selected}
      onToggle={onToggle}
    />
  )
}

/**
 * The hook-free half: the picker over `offered` and where the companion plays on `rig`. Exported
 * so a test can hand it any rig, as `RiffRigView` is.
 */
export function PresetCompanionView({
  riff,
  device,
  offered,
  rig,
  part,
  selected,
  onToggle,
}: {
  riff: Riff
  device: Device
  offered: readonly Device[]
  rig: readonly Device[]
  part: RiffPartResolution
  selected: readonly DeviceId[]
  onToggle: (id: DeviceId, on: boolean) => void
}) {
  const { companion } = riff
  if (companion === undefined) return null

  return (
    <div className="columns riff-rig">
      <RigPicker
        selected={selected}
        onToggle={onToggle}
        devices={offered}
        note={presetCompanionExcluded(device, riff.request.role)}
      />

      <section className="panel riff-panel riff-where-panel">
        <header>
          <h2>{whereHeading(riff, companion)}</h2>
        </header>
        {part.outcome === 'played' ? (
          <RiffVoice part={companion} voice={part.voice} subject={companionSubject(companion)} />
        ) : (
          <p className="riff-gap">{companionGap(riff, part.gap, rig)}</p>
        )}
      </section>
    </div>
  )
}
