import type { RequestId, SectionName } from './ids'

/**
 * §4.2. Occupancy is resolver *output* and lives here, not on `Assignable`.
 *
 * Hanging per-guide state on `Assignable` would make `expand()` impure and unshareable - two
 * guides open in two tabs would fight over the same objects. And the value stored is a
 * *request* id, not a role id, because a template may request the same role twice.
 */

/** `${deviceId}/${voiceId}`, pool ordinal already folded into `voiceId`. */
export type AssignableKey = string

export type Occupancy = Map<AssignableKey, Map<SectionName, RequestId>>
