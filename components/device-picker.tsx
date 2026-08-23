'use client'

import type { DeviceId } from '@/lib/core'
import { expand } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'

/**
 * "The hardware you own." Multi-select, because a rig is a set — and because the empty set is
 * a legitimate thing to look at: it resolves to nothing but gaps, which is honest (invariant 5)
 * rather than an error state.
 *
 * The list is `DEVICES` in registry order (folder name, UTF-16 code unit). Not re-sorted here:
 * a picker that orders devices differently from the registry gives two answers to "which is
 * first", and one of them is wrong the moment a device is added.
 */
export type DevicePickerProps = {
  selected: readonly DeviceId[]
  onToggle: (id: DeviceId, on: boolean) => void
}

export function DevicePicker({ selected, onToggle }: DevicePickerProps) {
  const chosen = new Set(selected)

  return (
    <section className="panel">
      <header>
        <h2>Devices</h2>
        <p className="note">
          {chosen.size} of {DEVICES.length} selected
        </p>
      </header>

      <fieldset className="picker-list">
        {DEVICES.map((device) => {
          const assignables = expand(device).length
          return (
            <label className="pick" key={device.id}>
              <input
                type="checkbox"
                checked={chosen.has(device.id)}
                onChange={(event) => onToggle(device.id, event.target.checked)}
              />
              <span className="name">
                {device.maker} {device.name}
              </span>
              <span className="sub mono">
                {device.kind} · {assignables} assignable{assignables === 1 ? '' : 's'} ·{' '}
                {device.recipes.length} recipes
                {device.clock.canSendClock ? ' · can send clock' : ''}
              </span>
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}
