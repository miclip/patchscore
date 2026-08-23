'use client'

import { useId, useMemo, useState } from 'react'
import type { TemplateId } from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'
import { templateView } from '@/lib/studio/picker'

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
  const searchId = `${useId()}-search`
  const shown = useMemo(() => templateView(TEMPLATES, selected, query), [selected, query])

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

      <fieldset className="picker-list">
        {shown.rows.map(({ item: template, selected: isSelected, retained }) => (
          <label className="pick" key={template.id} data-retained={retained ? 'yes' : 'no'}>
            <input
              type="radio"
              name="template"
              checked={isSelected}
              onChange={() => onSelect(template.id)}
            />
            <span className="name">{template.name}</span>
            <span className="sub mono">
              {template.bpm.default} BPM · {template.structure.length} sections ·{' '}
              {template.roles.length} parts · {template.patterns.length} patterns
              {retained ? ' · still chosen' : ''}
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
