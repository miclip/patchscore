'use client'

import Link from 'next/link'
import type { Template } from '@/lib/core'
import { DIRECTION_CATALOGUE, templateHref } from '@/lib/studio/catalogue'
import { Browse } from './browse'

/**
 * #84. `/directions`, which is the same `Browse` shell over the other catalogue.
 *
 * The client boundary sits here for the reason it sits in `device-index.tsx`: `Browse` takes a
 * card function, and a function cannot be serialised from a server component to a client one. So
 * the page above exports the metadata and hands this nothing.
 *
 * The card counts what the template authors. No kind and no maker, because a `Template` has
 * neither (invariant 3) — the search above it is narrower for the same reason.
 */
export function DirectionIndex() {
  return <Browse source={DIRECTION_CATALOGUE} card={card} />
}

function card(template: Template) {
  const bars = template.structure.reduce((sum, section) => sum + section.bars, 0)

  return (
    <Link className="catalogue-link" href={templateHref(template)}>
      <span className="catalogue-name">{template.name}</span>
      <span className="catalogue-sub mono">
        {template.bpm.min}–{template.bpm.max} BPM · {template.structure.length} sections ·{' '}
        {bars} bars · {template.roles.length} parts
      </span>
      <span className="catalogue-sub">{template.keys.join(' · ')}</span>
    </Link>
  )
}
