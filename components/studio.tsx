'use client'

import { useMemo, useState } from 'react'
import type { DeviceId, MoodAxis, MoodState, TemplateId } from '@/lib/core'
import { NEUTRAL_MOOD, resolve } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { TEMPLATES, templateById } from '@/lib/templates'
import { DENSITY_DETENTS } from './density-detents'
import { DevicePicker } from './device-picker'
import { GenrePicker } from './genre-picker'
import { MoodPanel } from './mood-panel'
import { Guide } from './guide/guide'
import { Rack } from './rack/rack'
import { SeedField } from './seed-field'

/**
 * Build step 8 (#10). The whole input surface, and the single place `resolve` is called.
 *
 * Everything here is state a permalink will have to carry (§8.2: devices, template,
 * inspirations, five mood ints, seed — inputs only, never resolved output), which is why it
 * lives in one component rather than being scattered through the panels. Inspirations (#9) and
 * the permalink itself (#12) plug into this object; nothing else has to move.
 *
 * `resolve` is pure and takes single-digit milliseconds for a three-device rig, so it runs
 * synchronously on every change rather than behind a "generate" button. There is nothing to
 * wait for and no request to make (invariant 1).
 */

/** §6.3: density's neutral 50 is the middle detent - no lean, sections as authored. */
const INITIAL_MOOD: MoodState = { ...NEUTRAL_MOOD, density: DENSITY_DETENTS[1] }

/**
 * A constant, not a random draw. The server and the client must render the same first frame,
 * and "the app picks a different guide every time you reload" is a worse default than one
 * shared starting point with a Reroll button next to it.
 */
const INITIAL_SEED = 1

export function Studio() {
  const [deviceIds, setDeviceIds] = useState<readonly DeviceId[]>(() => DEVICES.map((d) => d.id))
  const [templateId, setTemplateId] = useState<TemplateId>(() => {
    const first = TEMPLATES[0]
    return first === undefined ? '' : first.id
  })
  const [mood, setMood] = useState<MoodState>(INITIAL_MOOD)
  const [seed, setSeed] = useState(INITIAL_SEED)

  const template = templateById(templateId)
  const selectedIds = new Set(deviceIds)
  // Registry order, not click order: the rig is a set, and the resolver's tie-breaks are
  // documented against a stable device order (§7.2).
  const devices = useMemo(() => DEVICES.filter((d) => selectedIds.has(d.id)), [deviceIds])

  const result = useMemo(
    () => (template === undefined ? undefined : resolve({ devices, template, mood, seed })),
    [devices, template, mood, seed],
  )

  function toggleDevice(id: DeviceId, on: boolean) {
    setDeviceIds((current) =>
      on ? [...current, id] : current.filter((existing) => existing !== id),
    )
  }

  function setAxis(axis: MoodAxis, value: number) {
    setMood((current) => ({ ...current, [axis]: value }))
  }

  return (
    <main className="shell">
      <header className="masthead">
        <h1>Patchscore</h1>
        <p>Your hardware, a direction, one seed — a guide with real parameter values.</p>
      </header>

      <div className="columns">
        <DevicePicker selected={deviceIds} onToggle={toggleDevice} />
        <GenrePicker selected={templateId} onSelect={setTemplateId} />
        <SeedField seed={seed} onChange={setSeed} />

        <section className="panel">
          <header>
            <h2>Inspirations</h2>
            <p className="note">Not built yet</p>
          </header>
          <p className="empty">
            Reference patches that bend a template toward a specific record — build step 7 (#9).
          </p>
        </section>

        <MoodPanel mood={mood} onChange={setAxis} />

        {/*
          §10's signature element sits above the guide, not under it: the guide is seven phases
          long, and a rack drawing below all of that is a rack drawing nobody scrolls to.
        */}
        <Rack result={result} />

        {result === undefined ? (
          <section className="panel span-2">
            <header>
              <h2>Guide</h2>
            </header>
            <p className="empty">No template selected.</p>
          </section>
        ) : (
          <section className="panel span-2">
            <Guide result={result} />
          </section>
        )}
      </div>
    </main>
  )
}
