'use client'

import { useId, useMemo, useState } from 'react'
import type { DeviceId } from '@/lib/core'
import { expand } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { ANY_KIND, deviceView, kindsPresent } from '@/lib/studio/picker'
import type { DeviceFilter } from '@/lib/studio/picker'

/**
 * "The hardware you own." Multi-select, because a rig is a set — and because the empty set is
 * a legitimate thing to look at: it resolves to nothing but gaps, which is honest (invariant 5)
 * rather than an error state.
 *
 * The list is `DEVICES` in registry order (folder name, UTF-16 code unit). Not re-sorted here:
 * a picker that orders devices differently from the registry gives two answers to "which is
 * first", and one of them is wrong the moment a device is added. Searching does not re-rank it
 * either, for the same reason.
 *
 * **Search and filter are local state and stay local (#53).** They are a question about the
 * catalogue, not a change to the rig: nothing here can reach `GuideInputsV1`, so typing cannot
 * touch the permalink, cannot write to storage, and cannot dismiss the starter-example note.
 * The only thing this component tells anyone else about is `onToggle`. That is not a convention
 * to remember — the props are the whole surface, and there is no query in them.
 *
 * The kind filter is derived from the registry rather than from `DEVICE_KINDS`, so it offers the
 * kinds this build actually ships. An option that can only ever return nothing is not a filter.
 */
export type DevicePickerProps = {
  selected: readonly DeviceId[]
  onToggle: (id: DeviceId, on: boolean) => void
}

export function DevicePicker({ selected, onToggle }: DevicePickerProps) {
  const [filter, setFilter] = useState<DeviceFilter>({ query: '', kind: ANY_KIND })
  const ids = useId()
  const searchId = `${ids}-search`
  const kindId = `${ids}-kind`

  const kinds = useMemo(() => kindsPresent(DEVICES), [])
  const shown = useMemo(() => deviceView(DEVICES, selected, filter), [selected, filter])

  return (
    <section className="panel">
      <header>
        <h2>Devices</h2>
        <p className="note" role="status">
          {shown.filtering
            ? `${shown.matched} of ${shown.total} match`
            : `${selected.length} of ${shown.total} selected`}
        </p>
      </header>

      {/*
        One row, and it stays one row at 390px: the search box flexes with `min-width: 0` and
        the select takes its own width. #53's constraint is that this must not push the guide
        down the page — the picker is the first thing on it.
      */}
      <div className="picker-controls">
        <label className="sr-only" htmlFor={searchId}>
          Search devices by name, maker or kind
        </label>
        <input
          id={searchId}
          type="search"
          className="picker-search"
          placeholder="Search name, maker, kind"
          value={filter.query}
          onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
        />
        <label className="sr-only" htmlFor={kindId}>
          Filter devices by kind
        </label>
        <select
          id={kindId}
          className="picker-kind"
          value={filter.kind}
          onChange={(event) =>
            setFilter((current) => ({ ...current, kind: event.target.value as DeviceFilter['kind'] }))
          }
        >
          <option value={ANY_KIND}>All kinds</option>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind.replace(/-/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/*
        Said plainly rather than left as an empty box, and said only when it is true. A filter
        that hides a selected box explains itself once here, so the marks on the rows below do
        not have to carry the whole explanation.
      */}
      {shown.matched === 0 ? (
        <p className="empty">
          Nothing here matches that.
          {shown.retained > 0
            ? ` The ${shown.retained === 1 ? 'box' : `${shown.retained} boxes`} you have selected ${shown.retained === 1 ? 'is' : 'are'} still listed.`
            : ''}
        </p>
      ) : shown.retained > 0 ? (
        <p className="note picker-kept">
          {shown.retained === 1 ? 'One selected box is' : `${shown.retained} selected boxes are`}{' '}
          outside this filter and stay listed.
        </p>
      ) : null}

      <fieldset className="picker-list">
        {shown.rows.map(({ item: device, selected: isSelected, retained }) => {
          const assignables = expand(device).length
          return (
            <label className="pick" key={device.id} data-retained={retained ? 'yes' : 'no'}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) => onToggle(device.id, event.target.checked)}
              />
              <span className="name">
                {device.maker} {device.name}
              </span>
              <span className="sub mono">
                {device.kind} · {assignables} assignable{assignables === 1 ? '' : 's'} ·{' '}
                {device.recipes.length} recipes
                {device.clock.canSendClock ? ' · can send clock' : ''}
                {retained ? ' · still selected' : ''}
              </span>
            </label>
          )
        })}
      </fieldset>
    </section>
  )
}
