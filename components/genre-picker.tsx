'use client'

import Link from 'next/link'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { TemplateId } from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'
import { templateHref } from '@/lib/studio/catalogue'
import { centreOffset, templateView } from '@/lib/studio/picker'

/**
 * Single-select: one template per guide (§4). The list is small on purpose — the authored
 * content library is the product, and a genre arrives as an authored template, not a free-text
 * field an LLM would have to interpret (invariant 1).
 *
 * **The search here is narrower than the device search, on purpose (#53).** It matches the name
 * and the authored keys, and nothing else. A `Template` has no maker and no kind, and giving it
 * one to make the two search boxes symmetric would be the search box dictating the data model —
 * invariant 3 keeps templates device-agnostic. There is no kind filter for the same reason: a
 * control with nothing to derive itself from. `lib/studio/picker.ts` carries the full argument
 * for which fields earn a place and which do not.
 *
 * There is no `role="radio"` juggling here: these are real radios in a real fieldset, so the
 * keyboard behaviour is the browser's and stays right when the list is filtered under it.
 */
export type GenrePickerProps = {
  selected: TemplateId
  onSelect: (id: TemplateId) => void
}

export function GenrePicker({ selected, onSelect }: GenrePickerProps) {
  const [query, setQuery] = useState('')
  const ids = useId()
  const searchId = `${ids}-search`
  const shown = useMemo(() => templateView(TEMPLATES, selected, query), [selected, query])
  const list = useRef<HTMLFieldSetElement>(null)

  /**
   * Bring the chosen direction into the middle of the list on load (#387).
   *
   * **On mount only, and deliberately not on every change of `selected`.** Scrolling when the
   * reader picks a row would move the list under the hand that just clicked it, and the row they
   * chose is by definition already in view.
   *
   * `scrollTop` rather than `scrollIntoView`, which walks up the ancestors and would scroll the
   * page as well as the box — on load that moves the whole studio for a change inside one panel.
   * Instant, so there is no animation for `prefers-reduced-motion` to gate.
   */
  useEffect(() => {
    const box = list.current
    const row = box?.querySelector<HTMLElement>('[data-chosen="yes"]')
    if (!box || !row) return
    const top = centreOffset(box, row)
    if (top !== undefined) box.scrollTop = top
  }, [])

  return (
    <section className="panel">
      <header>
        <h2>Direction</h2>
        <p className="note" role="status">
          {shown.filtering
            ? `${shown.matched} of ${shown.total} match`
            : `${shown.total} template${shown.total === 1 ? '' : 's'} authored`}
        </p>
      </header>

      <div className="picker-controls">
        <label className="sr-only" htmlFor={searchId}>
          Search directions by name or key
        </label>
        <input
          id={searchId}
          type="search"
          className="picker-search"
          placeholder="Search name, key"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {shown.matched === 0 ? (
        <p className="empty">
          No direction matches that.
          {shown.retained > 0 ? ' The one you have chosen is still listed.' : ''}
        </p>
      ) : shown.retained > 0 ? (
        <p className="note picker-kept">
          The direction you have chosen is outside this search and stays listed.
        </p>
      ) : null}

      {/*
        Two sibling targets per row, exactly as the device picker has them and for the same
        reasons (#112) — a `<label>` around the radio and its name, and a separate link to the
        direction's own page. See `device-picker.tsx` for the full argument; the only difference
        here is that a radio group is one tab stop, so the links are what the keyboard walks
        through between the search box and the chosen radio.
      */}
      <fieldset className="picker-list" ref={list}>
        {shown.rows.map(({ item: template, selected: isSelected, retained }) => {
          const subId = `${ids}-${template.id}-sub`
          return (
            <div
              className="pick"
              key={template.id}
              data-retained={retained ? 'yes' : 'no'}
              data-chosen={isSelected ? 'yes' : 'no'}
            >
              <label className="pick-choose">
                <input
                  type="radio"
                  name="template"
                  className="pick-jack"
                  data-chain={isSelected ? 'direction' : undefined}
                  checked={isSelected}
                  aria-describedby={subId}
                  onChange={() => onSelect(template.id)}
                />
                <span className="name">{template.name}</span>
              </label>
              <Link className="pick-details" href={templateHref(template)}>
                Details<span className="sr-only"> for {template.name}</span>
              </Link>
              <span className="sub mono" id={subId}>
                {template.bpm.default} BPM · {template.structure.length} sections ·{' '}
                {template.roles.length} parts · {template.patterns.length} patterns
                {retained ? ' · still chosen' : ''}
              </span>
            </div>
          )
        })}
      </fieldset>
    </section>
  )
}
