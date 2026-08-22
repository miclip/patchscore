'use client'

import type { TemplateId } from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'

/**
 * Single-select: one template per guide (§4). The list is small on purpose — the authored
 * content library is the product, and a genre arrives as an authored template, not a free-text
 * field an LLM would have to interpret (invariant 1).
 */
export type GenrePickerProps = {
  selected: TemplateId
  onSelect: (id: TemplateId) => void
}

export function GenrePicker({ selected, onSelect }: GenrePickerProps) {
  return (
    <section className="panel">
      <header>
        <h2>Direction</h2>
        <p className="note">
          {TEMPLATES.length} template{TEMPLATES.length === 1 ? '' : 's'} authored
        </p>
      </header>

      <fieldset className="picker-list">
        {TEMPLATES.map((template) => (
          <label className="pick" key={template.id}>
            <input
              type="radio"
              name="template"
              checked={template.id === selected}
              onChange={() => onSelect(template.id)}
            />
            <span className="name">{template.name}</span>
            <span className="sub mono">
              {template.bpm.default} BPM · {template.structure.length} sections ·{' '}
              {template.roles.length} parts · {template.patterns.length} patterns
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  )
}
