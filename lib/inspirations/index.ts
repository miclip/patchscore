import type { InspirationId } from '../core/ids'
import type { Inspiration } from '../core/inspiration'
import { dancehall } from './dancehall'
import { echo } from './echo'
import { ladder } from './ladder'
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
 * ## What the five are for, which is not five of the same thing
 *
 * `reggae` and `dancehall` both claim the kick and therefore refuse to combine, so a library of
 * only those two could never demonstrate that inspirations *do* compose. `shuffle` touches
 * neither the kick nor the bass and composes with either of them. Those three prove the rules.
 *
 * `echo` and `ladder` are here because the first three were all **drum-led**, and a direction
 * whose parts are sustained or melodic got nothing from any of them beyond an added part it did
 * not ask for. Between them they claim `texture`, `bass-mid` and `lead` — so a one-part
 * sustained direction and a two-part melodic one now have an influence that lands on their own
 * material rather than beside it.
 *
 * They are also the first two that **only replace**. Every earlier influence adds a part as well,
 * and an influence that adds nothing is worth having in the library on its own: it is the shape
 * that cannot quietly succeed by dropping a shaker onto a direction it otherwise missed.
 *
 * The cost is **three** more refusing pairs, stated so nobody has to discover them one at a
 * time: `echo`, `ladder` and `reggae` all claim `bass-mid`, so no two of those three combine.
 * Refusing pairs go from one to four, and the pairs that compose from two of three to six of ten.
 * That is §5 working — the bass is where all three make their strongest claim, and picking a
 * winner by id order is exactly the alphabetical musical decision the refusal exists to prevent.
 * Both new influences compose freely with `dancehall` and with `shuffle`.
 */
export const INSPIRATIONS: readonly Inspiration[] = [dancehall, echo, ladder, reggae, shuffle]

export { dancehall, echo, ladder, reggae, shuffle }

const BY_ID: ReadonlyMap<InspirationId, Inspiration> = new Map(INSPIRATIONS.map((i) => [i.id, i]))

/** `undefined` for an unknown id — a caller with a stale permalink is not an exception. */
export function inspirationById(id: InspirationId): Inspiration | undefined {
  return BY_ID.get(id)
}
