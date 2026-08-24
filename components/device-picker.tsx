'use client'

import { useId, useMemo, useState } from 'react'
import type { Device, DeviceId } from '@/lib/core'
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

  /**
   * Selected first, and above the scrolling catalogue rather than inside it.
   *
   * The list gained a height cap so it stopped pushing the guide down the page, and that put the
   * two devices this page ships checked at rows 7 and 9 of 13 — below the fold, on a list about
   * five rows tall. The page opened looking like an empty rig while two boxes were ticked out of
   * sight, which is worse than the scrolling it fixed.
   *
   * Grouping rather than sorting, because sorting on every tick moves the list under a hand that
   * is mid-burst: picking a rig is four or five ticks in a row, and the row you meant to hit next
   * has moved. A row crossing between two groups is one shift and reads as intentional, which is
   * what the retained group already did.
   *
   * `retained` still marks a selected device the current filter would hide — it changes how the
   * row looks, not where it lives, since your own rig should not move because you typed.
   */
  const chosen = useMemo(() => shown.rows.filter((row) => row.selected), [shown])
  const rest = useMemo(() => shown.rows.filter((row) => !row.selected), [shown])

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
        <p className="empty">Nothing here matches that.</p>
      ) : null}

      {/*
       * Two groups, not one list.
       *
       * A selected device must stay visible and stay tickable when a filter would hide it —
       * losing sight of your own rig by typing is the failure this rule exists to prevent, and
       * a summary line does not fix it because you cannot untick a sentence.
       *
       * But interleaving them meant that with every device selected the list never shrank, and
       * the search read as broken at exactly the moment someone reached for it. Separating the
       * groups gives both: the filter visibly filters, and nothing selected disappears.
       */}
      {chosen.length > 0 ? (
        <>
          <p className="note picker-kept">
            Your rig — {chosen.length} selected. Untick to drop.
          </p>
          <fieldset className="picker-list picker-chosen-list">
            {chosen.map((row) => pick(row, onToggle))}
          </fieldset>
        </>
      ) : null}

      <fieldset className="picker-list">{rest.map((row) => pick(row, onToggle))}</fieldset>

      {rest.length === 0 && chosen.length > 0 && shown.matched > 0 ? (
        <p className="empty">Everything matching that is already in your rig.</p>
      ) : null}
    </section>
  )
}

function pick(
  row: { item: Device; selected: boolean; retained: boolean },
  onToggle: (id: DeviceId, on: boolean) => void,
) {
  const device = row.item
  const assignables = expand(device).length
  return (
    <label className="pick" key={device.id} data-retained={row.retained ? 'yes' : 'no'}>
      <input
        type="checkbox"
        checked={row.selected}
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
}
