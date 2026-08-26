'use client'

import Link from 'next/link'
import { useId, useMemo, useRef, useState } from 'react'
import type { Device, DeviceId } from '@/lib/core'
import { expand } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel } from '@/lib/studio/catalogue'
import { ANY_KIND, deviceView, kindsPresent } from '@/lib/studio/picker'
import type { DeviceFilter } from '@/lib/studio/picker'
import { patchbay } from '@/lib/studio/patchbay'
import { PatchCables } from './patch-cables'

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

  /**
   * #138. Derived from the selected devices in registry order, so the cables follow the list
   * rather than a second ordering of their own.
   */
  const listRef = useRef<HTMLFieldSetElement | null>(null)
  const bay = useMemo(
    () => patchbay(chosen.map((row) => row.item)),
    [chosen],
  )

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
        <p className="note picker-kept">Your rig — {chosen.length} selected. Untick to drop.</p>
      ) : null}

      <fieldset className="picker-list" ref={listRef}>
        {[...chosen, ...rest].map((row) => pick(row, onToggle, ids, bay))}
        <PatchCables bay={bay} listRef={listRef} />
      </fieldset>

      {/*
        §8's accessible path, and the reason the drawing above may be `aria-hidden`: a sighted
        reader sees a dashed run into the desk, and this is that same fact in words. The rack
        does exactly this for its clock and voice cables, describing it as "the accessible path
        rather than a summary of it".
      */}
      {bay.source === undefined ? null : (
        <p className="note patch-legend">
          Clock source <strong>{bay.source.deviceName}</strong>
          {bay.source.basis === 'tie-break' ? ' — nothing claimed it, so this is a tie-break, not advice' : ''}
          {bay.links.length === 0 ? '.' : '. '}
          {patchSentence(bay)}
        </p>
      )}

      {rest.length === 0 && chosen.length > 0 && shown.matched > 0 ? (
        <p className="empty">Everything matching that is already in your rig.</p>
      ) : null}
    </section>
  )
}

/**
 * One row: **two sibling targets, never one inside the other** (#112).
 *
 * The row used to be a single `<label>` wrapping everything, which made the whole row the
 * checkbox's hit target and left nowhere to put a link — interactive content inside a `<label>`
 * is invalid, and a click on it would toggle the checkbox on the way past. So the row is now a
 * container holding a `<label>` that wraps only the control and its name, and a separate link
 * beside it. They are grid siblings in different columns, so neither can steal a tap from the
 * other; #21's warning applies exactly here, because a details link that eats the checkbox's
 * target does not fail as "I cannot read about my device", it fails as "I cannot select it".
 *
 * **The `sub` line moved out of the label and came back as a description.** Inside the label it
 * was part of the checkbox's accessible name, so the control announced as "Polyend Tracker Mini
 * groovebox · 8 assignables · 22 recipes · can send clock, checkbox". `aria-describedby` keeps
 * every one of those facts available and stops them being the control's *name*, which is the
 * thing a screen reader repeats on every arrow key.
 *
 * The link's own name is "Details for Polyend Tracker Mini" — real text, not an `aria-label`, so
 * the visible word is contained in the accessible name (WCAG 2.5.3) and thirteen rows do not all
 * announce as "Details".
 *
 * `deviceLabel` rather than `maker` + `name`: one of the thirteen manifests already carries its
 * maker in its name, and this row was the last place still printing `Zoom Zoom LiveTrak L-8`.
 */
function pick(
  row: { item: Device; selected: boolean; retained: boolean },
  onToggle: (id: DeviceId, on: boolean) => void,
  idPrefix: string,
  bay: ReturnType<typeof patchbay>,
) {
  const device = row.item
  const assignables = expand(device).length
  const label = deviceLabel(device)
  // Device ids are permalink-safe (`PERMALINK_ID`: letters, digits, interior hyphens), so this
  // is always a legal id and always unique within the list.
  const subId = `${idPrefix}-${device.id}-sub`

  /**
   * The socket a cable lands in. A ring when nothing is patched and filled when something is —
   * the entire vocabulary of the reference, and it stays legible small. Drawn only for selected
   * rows, because an unselected box is not in the rig and has nothing running to it.
   */
  const patched =
    bay.source?.deviceId === device.id
      ? 'source'
      : bay.links.find((l) => l.deviceId === device.id)?.kind

  return (
    <div className="pick" key={device.id} data-retained={row.retained ? 'yes' : 'no'}>
      {row.selected ? (
        <span className="pick-jack" data-jack={device.id} data-patched={patched ?? 'free'} aria-hidden="true" />
      ) : null}
      <label className="pick-choose">
        <input
          type="checkbox"
          checked={row.selected}
          aria-describedby={subId}
          onChange={(event) => onToggle(device.id, event.target.checked)}
        />
        <span className="name">{label}</span>
      </label>
      <Link className="pick-details" href={deviceHref(device)}>
        Details<span className="sr-only"> for {label}</span>
      </Link>
      <span className="sub mono" id={subId}>
        {device.kind} · {assignables} assignable{assignables === 1 ? '' : 's'} ·{' '}
        {device.recipes.length} recipes
        {device.clock.canSendClock ? ' · can send clock' : ''}
      </span>
    </div>
  )
}

/**
 * #138's drawing, said out loud.
 *
 * Grouped by kind rather than listed per box, because the claim a reader needs is "what runs
 * where", and eighteen sentences is not that. A box running free is named — `canReceiveClock:
 * false` with no audio to take is a real fact about a rig, and #144 and #79 are the record of
 * how much care it took to word it correctly elsewhere.
 */
function patchSentence(bay: ReturnType<typeof patchbay>): string {
  const of = (kind: string) => bay.links.filter((l) => l.kind === kind).map((l) => l.deviceName)
  const parts: string[] = []
  const clock = of('clock')
  const audio = of('audio')
  const either = of('either')
  if (clock.length > 0) parts.push(`${andList(clock)} take${clock.length === 1 ? 's' : ''} clock`)
  if (audio.length > 0) {
    parts.push(
      `${andList(audio)} cannot take clock, so the run to ${audio.length === 1 ? 'it' : 'them'} is audio`,
    )
  }
  if (either.length > 0) {
    parts.push(`${andList(either)} take${either.length === 1 ? 's' : ''} either — your call which you patch`)
  }
  if (bay.free.length > 0) {
    const names = andList(bay.free.map((f) => f.deviceName))
    parts.push(`${names} run${bay.free.length === 1 ? 's' : ''} free`)
  }
  return parts.length === 0 ? '' : `${parts.join('; ')}.`
}

/** `a`, `a and b`, `a, b and c`. */
function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}
