import { z } from 'zod'

/**
 * The closed, controlled vocabularies that cross the template/device boundary.
 * Invariant 3: `Role`, `Character`, `MoodAxis` and `PatternSlot` are the *whole* shared
 * vocabulary. Templates never name a device; devices never name a genre.
 *
 * Every union here is defined once as a const tuple, with the type and the Zod schema both
 * derived from it — there is no second list to keep in step.
 */

/** §1. 23 roles. Every addition multiplies the recipe surface (roles x characters x devices). */
export const ROLES = [
  // low
  'kick', 'sub', 'bass-mid',
  // backbeat
  'snare', 'clap', 'rim', 'ghost-perc',
  // metal
  'closed-hat', 'open-hat', 'ride', 'metallic',
  // body
  'tom', 'noise', 'texture',
  // tonal
  'pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop',
  // transitional — §4.2, section-scoped rather than permanent parts
  'riser', 'impact', 'sweep',
] as const

export type Role = (typeof ROLES)[number]
export const RoleSchema = z.enum(ROLES)

/** §4.2. The three roles that exist for a few bars rather than owning a voice for a track. */
export const TRANSITIONAL_ROLES: readonly Role[] = ['riser', 'impact', 'sweep']

/**
 * §4.2/invariant 5. Roles that are a note **held** rather than a rhythm **struck**, so an empty
 * step grid is not something a direction has failed to author for them.
 *
 * **This is a property of `Role`, and it belongs here for that reason.** It is not a fifth shared
 * vocabulary — nothing new crosses the template/device boundary, and invariant 3 is untouched:
 * this adds no name a template or a device may utter that it could not utter already. It is a
 * closed claim about the existing `ROLES` list, exactly as `TRANSITIONAL_ROLES` is, sitting
 * beside it because it is the same kind of claim about the same list.
 *
 * It is deliberately **not** per-template metadata. A pad sustains on any box and in any genre;
 * that is what makes it a pad. Authored per direction it would be a flag seven templates could
 * disagree about, and the first one that forgot it would print `pad` under a heading saying its
 * pattern is missing. Authored per device it would be a box naming what a genre wants, which is
 * the thing invariant 3 exists to forbid.
 *
 * **Only `pad`, and the shortness of the list is the point.** `texture` is the case that proves
 * it: Ambient Dub holds one and authors no variant, Drone Study patterns one, and the same role
 * is therefore struck in a direction that wants it struck. Silence on `texture`, `sweep` and
 * `riser` can be a real hole and stays reported. A role earns a place here only when *no*
 * direction could reasonably pattern it; anything looser turns invariant 5's honesty into a way
 * of hiding gaps.
 */
export const NON_PATTERN_BEARING_ROLES: readonly Role[] = ['pad']

/**
 * Whether a step grid is a thing this role can be *missing*. See `NON_PATTERN_BEARING_ROLES`.
 *
 * A predicate rather than a bare list at every call site: the callers ask a question about one
 * role, and `!LIST.includes(role)` written out four times is four chances to drop the `!`.
 */
export function bearsPattern(role: Role): boolean {
  return !NON_PATTERN_BEARING_ROLES.includes(role)
}

/** §3.4. Six characters, three opposed pairs. */
export const CHARACTERS = ['hard', 'soft', 'bright', 'dark', 'clean', 'dirty'] as const

export type Character = (typeof CHARACTERS)[number]
export const CharacterSchema = z.enum(CHARACTERS)

/** §3.4. A point in character space. The three axes are the three opposed pairs. */
export type CharVector = { force: number; tone: number; grit: number }

/**
 * §3.4. Character as a vector, which gives recipe fallback (§3.5) and mood-driven character
 * selection (§6.2) a distance function for free.
 *
 * Frozen: `as const` makes the vectors readonly literals, and `satisfies` still proves every
 * character has one. The geometry is a fixed fact about the vocabulary, not a tunable table -
 * a mutable export would let one caller silently change what "orthogonal" means for everyone.
 */
export const CHAR = {
  hard:   { force:  1, tone:  0, grit:  0 },
  soft:   { force: -1, tone:  0, grit:  0 },
  bright: { force:  0, tone:  1, grit:  0 },
  dark:   { force:  0, tone: -1, grit:  0 },
  clean:  { force:  0, tone:  0, grit: -1 },
  dirty:  { force:  0, tone:  0, grit:  1 },
} as const satisfies Record<Character, CharVector>

/** §6. The five mood axes. A device declines an axis by having no param that declares it. */
export const MOOD_AXES = ['darkness', 'density', 'grit', 'swing', 'space'] as const

export type MoodAxis = (typeof MOOD_AXES)[number]
export const MoodAxisSchema = z.enum(MOOD_AXES)

/**
 * §4.3. How a device's `articulation` addresses steps without knowing which pattern variant
 * it was handed. Never absolute step indices.
 */
export const PATTERN_SLOTS = [
  'downbeat', 'backbeat', 'offbeat', 'accent',
  'first-hit', 'last-hit', 'fill', 'ghost',
] as const

export type PatternSlot = (typeof PATTERN_SLOTS)[number]
export const PatternSlotSchema = z.enum(PATTERN_SLOTS)
