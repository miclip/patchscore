import type { InspirationId } from '../core/ids'
import type { Inspiration } from '../core/inspiration'
import { dancehall } from './dancehall'
import { reggae } from './reggae'
import { shuffle } from './shuffle'

/**
 * The inspiration registry (§5). Hand-written and static, for the same reason the template
 * registry is: invariant 2's drop-in promise is about *devices*, and inspirations are a handful
 * of authored influences maintained here.
 *
 * Ordered by id in UTF-16 code unit order (§7.2), matching both other registries — and here the
 * order is load-bearing rather than tidy, because composition walks the selected inspirations in
 * canonical id order. Insertion order would make that depend on the order of the imports above.
 *
 * Three, not two, and the third is the point: `reggae` and `dancehall` both claim the kick and
 * therefore refuse to combine, so a library of only those two could never demonstrate that
 * inspirations *do* compose. `shuffle` touches neither the kick nor the bass and composes with
 * either of them.
 */
export const INSPIRATIONS: readonly Inspiration[] = [dancehall, reggae, shuffle]

export { dancehall, reggae, shuffle }

const BY_ID: ReadonlyMap<InspirationId, Inspiration> = new Map(INSPIRATIONS.map((i) => [i.id, i]))

/** `undefined` for an unknown id — a caller with a stale permalink is not an exception. */
export function inspirationById(id: InspirationId): Inspiration | undefined {
  return BY_ID.get(id)
}
