'use client'

import Link from 'next/link'
import { useId, useMemo, useState } from 'react'
import type { Device, DeviceId } from '@/lib/core'
import { MAX_RIG_DEVICES, expand } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel } from '@/lib/studio/catalogue'
import { ANY_KIND, NO_RIG_FILTER, kindsPresent, rigView } from '@/lib/studio/picker'
import type { RigFilter } from '@/lib/studio/picker'

/**
 * §5A/#503. **The boxes you own, for a page that holds one figure.**
 *
 * A picker of its own rather than the studio's, because the studio's carries four things this
 * surface has no concept of and each of them showed up as a claim about a page that makes none:
 *
 *  - a fieldset headed **Inspiration filters**, on a page with no inspirations;
 *  - **Fills a gap**, which needs the unfilled roles of a resolve against a *direction*, and is
 *    therefore permanently inert here, greyed with a tooltip about a direction being covered;
 *  - **Several parts**, which asks whether a box carries several parts of one song;
 *  - the **patchbay** — a clock source, an audio-or-clock run per box, a `patch-legend` sentence
 *    and an `out` row leaving for the guide. There is no guide to leave for, and no clock
 *    topology on a page with one part.
 *
 * The last of those was not only ink. `.pick` reserves a 46px left gutter for the cable lane, so
 * every row here was indented for cables that were never going to be drawn.
 *
 * **What is shared is what is neutral**, and it is shared rather than copied: `rigView` runs the
 * same `queryTerms`, `matches`, `deviceFields` and registry order the studio's list does, minus
 * the two predicates that need a song; `kindsPresent` derives the kinds this build ships;
 * `deviceLabel` and `deviceHref` name and address a box; `expand` counts its voices;
 * `MAX_RIG_DEVICES` is #301's ceiling. The control row reuses the studio's own classes, because a
 * search box and a kind select are the same thing on both pages.
 *
 * **What is kept from the studio's behaviour**, because it is right on any picker: search and
 * kind filtering, a link to each device's page, real checkboxes with 44px targets, the ten-device
 * cap, selected boxes grouped above the rest, and `retained` marking one a filter would hide.
 *
 * **Search and filter are local state and stay local.** Selection is too — see `RiffRig`, which
 * reads the reader's stored rig once and never writes one.
 */
export type RiffPickerProps = {
  selected: readonly DeviceId[]
  onToggle: (id: DeviceId, on: boolean) => void
}

export function RiffPicker({ selected, onToggle }: RiffPickerProps) {
  const [filter, setFilter] = useState<RigFilter>(NO_RIG_FILTER)
  const ids = useId()
  const searchId = `${ids}-search`
  const kindId = `${ids}-kind`

  const kinds = useMemo(() => kindsPresent(DEVICES), [])
  const shown = useMemo(() => rigView(DEVICES, selected, filter), [selected, filter])
  const chosen = useMemo(() => shown.rows.filter((row) => row.selected), [shown])
  const rest = useMemo(() => shown.rows.filter((row) => !row.selected), [shown])

  /**
   * #301. A rig has a ceiling. Nothing says so until it is reached: a cap announced in advance is
   * a rule the reader has to hold while they work, and nobody picking three boxes needs to know
   * there is a tenth.
   */
  const atCap = selected.length >= MAX_RIG_DEVICES

  return (
    /*
     * §5A/#503. **`panel`, and deliberately not `riff-panel`.**
     *
     * The print block hides `.panel:not(.guide-panel):not(.kit-panel):not(.riff-panel)…`, so
     * `riff-panel` is the *exemption* — it says this block is content on paper. It is right on the
     * figure and on the voice, and wrong here: a printed sheet of forty-six tick boxes is
     * forty-six dead controls. The class list is what decides it, so the class list is where the
     * decision is made rather than in a second rule further down the stylesheet.
     */
    <section className="panel riff-picker">
      <header>
        <h2>Your boxes</h2>
        <p className="note" role="status">
          {shown.filtering
            ? `${shown.matched} of ${shown.total} match`
            : `${selected.length} of ${shown.total} selected`}
        </p>
      </header>

      {/*
        One row, and it stays one row at 390px: the search box flexes with `min-width: 0` and the
        select takes its own width. The studio's classes, because this is the same control doing
        the same job.
      */}
      <div className="picker-controls">
        <label className="sr-only" htmlFor={searchId}>
          Search devices by name, maker, kind or the parts they can play
        </label>
        <input
          id={searchId}
          type="search"
          className="picker-search"
          placeholder="Search name, maker, kind, part"
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
            setFilter((current) => ({ ...current, kind: event.target.value as RigFilter['kind'] }))
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

      {shown.matched === 0 ? <p className="empty">Nothing here matches that.</p> : null}

      {/*
        Two groups rather than one list. A box you own stays visible and stays tickable when a
        filter would hide it; interleaving the two meant that with everything selected the list
        never shrank, and the search read as broken at the moment somebody reached for it.
      */}
      {chosen.length > 0 ? (
        <p className="note riff-picker-kept">
          {chosen.length} selected. Untick to drop.
          {atCap ? ' That is a full rig; untick one to add another.' : ''}
        </p>
      ) : null}

      {/*
        A `fieldset` needs a `legend`, or the group announces as an unnamed one and a screen
        reader gives a reader forty-six checkboxes with no idea what they are choosing between.
        Visually hidden rather than drawn, because the panel's own `h2` already says it on screen
        and a second heading inside the box would be one more line the list does not have.
      */}
      <fieldset className="riff-picker-list">
        <legend className="sr-only">Devices in your rig</legend>
        {[...chosen, ...rest].map((row) => (
          <Pick key={row.item.id} row={row} onToggle={onToggle} idPrefix={ids} atCap={atCap} />
        ))}
      </fieldset>

      {rest.length === 0 && chosen.length > 0 && shown.matched > 0 ? (
        <p className="empty">Everything matching that is already picked.</p>
      ) : null}
    </section>
  )
}

/**
 * One row: **two sibling targets, never one inside the other** (#112).
 *
 * A container holding a `<label>` that wraps only the control and its name, and a separate link
 * beside it. They are grid siblings in different columns, so neither can steal a tap from the
 * other; a details link that eats the checkbox's target does not fail as *I cannot read about my
 * device*, it fails as *I cannot select it*.
 *
 * The `sub` line is a description rather than part of the label, so the checkbox announces as the
 * device's name instead of the name plus four facts on every arrow key. The link's own name is
 * real text rather than an `aria-label`, so the visible word is contained in the accessible name
 * (WCAG 2.5.3) and forty-six rows do not all announce as *Details*.
 *
 * **A plain checkbox, painted as a checkbox.** The studio draws its as a socket a cable lands in,
 * which is the right mark there and a promise here: nothing on this page patches anything.
 */
function Pick({
  row,
  onToggle,
  idPrefix,
  atCap,
}: {
  row: { item: Device; selected: boolean; retained: boolean }
  onToggle: (id: DeviceId, on: boolean) => void
  idPrefix: string
  atCap: boolean
}) {
  const device = row.item
  const assignables = expand(device).length
  const label = deviceLabel(device)
  const subId = `${idPrefix}-${device.id}-sub`

  return (
    <div
      className={`riff-pick${!row.selected && atCap ? ' riff-pick-off' : ''}`}
      data-retained={row.retained ? 'yes' : 'no'}
    >
      <label className="riff-pick-choose">
        <input
          type="checkbox"
          checked={row.selected}
          // #301. A full rig refuses the next tick rather than silently ignoring it. Unticking is
          // never disabled.
          disabled={!row.selected && atCap}
          aria-describedby={subId}
          onChange={(event) => onToggle(device.id, event.target.checked)}
        />
        <span className="riff-pick-name">{label}</span>
      </label>
      <Link className="riff-pick-details" href={deviceHref(device)}>
        Details<span className="sr-only"> for {label}</span>
      </Link>
      <span className="riff-pick-sub mono" id={subId}>
        {device.kind} · {assignables} assignable{assignables === 1 ? '' : 's'} ·{' '}
        {device.recipes.length} recipes
      </span>
    </div>
  )
}
