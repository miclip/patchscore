'use client'

import Link from 'next/link'
import type { Device } from '@/lib/core'
import { expand } from '@/lib/core'
import { DEVICE_CATALOGUE, deviceHref, deviceLabel } from '@/lib/studio/catalogue'
import { Browse } from './browse'

/**
 * #84. `/devices`, which is `Browse` over the device catalogue and a card.
 *
 * A client component with no props, and that is the point: the page above it is a server
 * component that exports `metadata`, and a render function cannot cross that boundary — it is
 * not serialisable. So the boundary sits here, above the card function rather than below it, and
 * the server passes nothing at all.
 *
 * Every count on a card is derived from the manifest. `expand` folds pool ordinals in, so the
 * number here is the number the resolver assigns into rather than the count of voice groups.
 */
export function DeviceIndex() {
  return <Browse source={DEVICE_CATALOGUE} card={card} />
}

function card(device: Device) {
  const assignables = expand(device).length
  const roles = new Set(device.recipes.map((recipe) => recipe.role)).size

  return (
    <Link className="catalogue-link" href={deviceHref(device)}>
      <span className="catalogue-name">{deviceLabel(device)}</span>
      <span className="catalogue-sub mono">
        {device.kind.replace(/-/g, ' ')}
        {assignables > 0 ? ` · ${assignables} assignable${assignables === 1 ? '' : 's'}` : ''}
        {device.recipes.length > 0
          ? ` · ${device.recipes.length} recipes across ${roles} roles`
          : ' · no recipes yet'}
      </span>
    </Link>
  )
}
