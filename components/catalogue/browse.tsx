'use client'

import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ANY_KIND } from '@/lib/studio/picker'
import type { DeviceFilter } from '@/lib/studio/picker'
import { NO_CATALOGUE_FILTER, countLine, kindLabel } from '@/lib/studio/catalogue'
import type { CatalogueSource } from '@/lib/studio/catalogue'

/**
 * #84. The search and filter shell both catalogue indexes are drawn with.
 *
 * `/devices` and `/directions` are the same page over different data: a control row, a count, and
 * a list of cards in source order. Writing it twice is the one real waste available in this
 * issue, so the differences between the two are declared in `lib/studio/catalogue.ts` and there
 * is no branch on which catalogue this is anywhere below. What each page keeps for itself is the
 * card, passed in, because a device card and a direction card share no fields.
 *
 * The filter is local state and stays local, for the reason `lib/studio/picker.ts` gives: it is
 * a question about the catalogue and not a change to anything. There is no rig here to protect,
 * so this draws no kept group either. Every row is a match.
 *
 * The first render lists the whole catalogue, which is what a crawler and a reader with no
 * JavaScript get. Typing only ever removes rows from that.
 */
export type BrowseProps<T> = {
  source: CatalogueSource<T>
  /** How one entry is drawn. The shell supplies the card frame and the key. */
  card: (item: T) => ReactNode
}

export function Browse<T>({ source, card }: BrowseProps<T>) {
  const [filter, setFilter] = useState<DeviceFilter>(NO_CATALOGUE_FILTER)
  const ids = useId()
  const searchId = `${ids}-search`
  const kindId = `${ids}-kind`

  const view = useMemo(() => source.search(filter), [source, filter])

  return (
    <section className="catalogue" data-catalogue={source.id}>
      {/*
        #53's control row, reused as it stands: one line at 390px, the input flexing down to
        nothing and the select taking its own width. A phone is the primary reading context
        (#21), and a row that wraps costs a line of height above the list on every one of them.
      */}
      <div className="picker-controls">
        <label className="sr-only" htmlFor={searchId}>
          {source.searchLabel}
        </label>
        <input
          id={searchId}
          type="search"
          className="picker-search"
          placeholder={source.placeholder}
          value={filter.query}
          onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
        />
        {source.kinds.length > 0 ? (
          <>
            <label className="sr-only" htmlFor={kindId}>
              Filter {source.noun.many} by kind
            </label>
            <select
              id={kindId}
              className="picker-kind"
              value={filter.kind}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  kind: event.target.value as DeviceFilter['kind'],
                }))
              }
            >
              <option value={ANY_KIND}>All kinds</option>
              {source.kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kindLabel(kind)}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <p className="catalogue-count" role="status">
        {countLine(view, source.noun)}
      </p>

      {view.matched === 0 ? (
        <p className="empty">{source.empty}</p>
      ) : (
        <ul className="catalogue-list">
          {view.rows.map((row) => (
            <li className="catalogue-item" key={source.keyOf(row.item)}>
              {card(row.item)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
