import type { RequestId, SectionName } from './ids'

/**
 * §4.2. Occupancy is resolver *output* and lives here, not on `Assignable`.
 *
 * Hanging per-guide state on `Assignable` would make `expand()` impure and unshareable - two
 * guides open in two tabs would fight over the same objects. And the value stored is a
 * *request* id, not a role id, because a template may request the same role twice.
 *
 * **The mapping is many assignables to one request, and #40 is what made that true.** Each
 * `(assignable, section)` still holds exactly one request — that half never moved, and it is
 * what makes conflict decidable — but one request id may now appear under *several* assignable
 * keys, because a chord can be stacked across several monophonic voices of one pool, one note
 * each (§12.4). Nothing in the type changed to allow it: `Map<AssignableKey, Map<...>>` already
 * expressed it, and only the invariant read off it was narrower than the shape. What did have to
 * change is every consumer that assumed the inverse mapping was a function — an `Assignment`
 * names `assignables`, plural, for exactly this reason, and `comfortableVoices` counts three of
 * them for a stacked triad rather than one.
 */

/** `${deviceId}/${voiceId}`, pool ordinal already folded into `voiceId`. */
export type AssignableKey = string

export type Occupancy = Map<AssignableKey, Map<SectionName, RequestId>>
