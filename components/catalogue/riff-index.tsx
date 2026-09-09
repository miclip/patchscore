'use client'

import Link from 'next/link'
import type { Riff } from '@/lib/core'
import { RIFF_CATALOGUE, riffHref } from '@/lib/studio/catalogue'
import { riffLength, riffTempo } from '@/lib/studio/riff-text'
import { Browse } from './browse'

/**
 * §5A. `/riffs`, which is the same `Browse` shell over the third catalogue.
 *
 * The client boundary sits here for the reason it sits in `direction-index.tsx`: `Browse` takes a
 * card function, and a function cannot be serialised from a server component to a client one. So
 * the page above exports the metadata and hands this nothing.
 *
 * The card says what the figure is and where the technique is found. No kind and no maker — a
 * `Riff` has neither, and the search above it is narrower for the same reason.
 */
export function RiffIndex() {
  return <Browse source={RIFF_CATALOGUE} card={card} />
}

function card(riff: Riff) {
  return (
    <Link className="catalogue-link" href={riffHref(riff)}>
      <span className="catalogue-name">{riff.name}</span>
      <span className="catalogue-sub mono">
        {riff.request.role} · {riff.request.character} · {riffTempo(riff)} · {riff.key} ·{' '}
        {riffLength(riff)}
      </span>
      {/*
        §5A.5. The record, said on the card as well as on the page. It is how a reader recognises
        the entry, and a list that showed only our own titles would be a list of things nobody has
        heard of.
      */}
      <span className="catalogue-sub">From {riff.track}</span>
    </Link>
  )
}
