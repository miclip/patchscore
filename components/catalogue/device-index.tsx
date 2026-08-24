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

/**
 * "No recipes yet" is a promise, and it is only true of a box that has somewhere to put one. A
 * mixer, a sequencer and an fx unit have no assignables at all (§2.4), so recipes are not late —
 * there is nowhere for them to go, and saying "yet" tells a reader to come back for something
 * that is never coming.
 */
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
          : assignables > 0
            ? ' · no recipes yet'
            : ' · nothing to assign'}
      </span>
    </Link>
  )
}
