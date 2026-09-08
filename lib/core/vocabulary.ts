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
 * is therefore struck in a direction that wants it struck. Silence on `texture` can be a real hole
 * and stays reported as one, per band, exactly as it always was. A role earns a place here only
 * when *no* direction could reasonably pattern it; anything looser turns invariant 5's honesty
 * into a way of hiding gaps.
 *
 * **`riser` moved, and it did not move here** (#473). An unpatterned `riser` now gets one
 * instruction saying it is a single trig rather than a band-specific hole report per section — but
 * that is `isSingleTrigPart`'s decision, and it says something different from this list. This one
 * claims the role is *held*, which is why it suppresses the note line and the grid together; that
 * one claims the part is *one event aimed at a change*, which still has a note to place. No role
 * may be both, and `test/vocabulary.test.ts` pins it, because a role in both would be told it
 * sustains and that it is a single trig.
 *
 * **`sweep` joined that other predicate and still does not belong here** (#488). It was held back
 * from it while the sentence promised a climb — Ambient Dub scopes one request to `Swell` and to
 * `Recede`, and the second falls away from the crest. Reading the direction of travel off the
 * structure's energy fixed the wording, which is what it always was; the role is transitional
 * rather than held either way, so its membership was never the question.
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

/**
 * §4.1/#339. **The two drums a direction may ask to follow the song's key.**
 *
 * A closed claim about the existing `ROLES` list, in `NON_PATTERN_BEARING_ROLES`'s shape and here
 * for its reasons: nothing new crosses the template/device boundary, no name is added that a
 * template or a device could not already utter, and invariant 3 is untouched.
 *
 * **Two, and the shortness is the point again.** A fundamental worth tuning is what qualifies a
 * role, and the rest of the kit does not have one a listener can place:
 *
 *  - `snare`, `clap` — broadband by construction. Moving one thins it or does nothing.
 *  - `closed-hat`, `open-hat`, `ride` — metal, inharmonic, no fundamental to move.
 *  - `rim` — a click. What pitch it has is body resonance under a transient, and tuning that to
 *    the key moves the wood rather than a note anybody hears as one.
 *  - `ghost-perc` — the texture between the hits, mixed under everything. Its job is that it is
 *    not heard as a pitch, and giving it one is working against the part.
 *  - `noise`, `metallic` — the two `body` roles beside `tom`, and both are named for having no
 *    stable pitch. A `metallic` recipe is authored *inharmonic on purpose*.
 *
 * Everything else in `ROLES` is either tonal — `sub`, `bass-mid`, `pad`, `lead`, `stab`, `arp`,
 * `acid`, `vox-chop`, `texture` — where the notes come from a hook or a `pitch` and a
 * displacement on top would transpose them twice, or transitional, where §4.2 gives a part a few
 * bars and no harmonic role at all.
 *
 * **Enforced in `RoleRequestSchema`, not left to review.** The boundary is #339's settled answer
 * and this is a list that only drifts by accident: a direction reaching for `followsKey` on a
 * `snare` because a kick nearby has one is exactly the mistake nobody would defend in writing.
 */
export const KEY_FOLLOWING_ROLES: readonly Role[] = ['kick', 'tom']

/**
 * Whether a direction may ask this role to be tuned to the key. See `KEY_FOLLOWING_ROLES`.
 *
 * A predicate for the reason `bearsPattern` is one: callers ask about a single role, and the
 * question reads better than the membership test it is written on.
 */
export function mayFollowKey(role: Role): boolean {
  return KEY_FOLLOWING_ROLES.includes(role)
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
 * §6. The five continuous 0-100 knobs, applied *after* recipe resolution. Every axis is
 * always present: a device declines an axis by having no param that declares it (§3.1), not
 * by the axis being absent from the state, and a partial `MoodState` would make "the knob is
 * centred" and "the knob was not sent" indistinguishable to `§6.1`'s arithmetic.
 *
 * **Here rather than in `resolver.ts`, where it used to live, because `template.ts` needs it**
 * (#310): a direction may now state the mood it opens at, and a template importing the resolver
 * would invert the layering — the resolver imports `Template`, and a value import back the other
 * way is a module cycle waiting for its first non-type edge. This file is the leaf both sides
 * already depend on, and `MoodState` is `Record<MoodAxis, number>`, which is vocabulary.
 */
export type MoodState = Record<MoodAxis, number>

/**
 * §12.2. The three values the UI is allowed to produce for density: the centre of each zone
 * `densityShift` defines. Zone centres rather than edges, so a value round-tripped through a
 * permalink lands back on the same detent even if an edge is ever read off by one somewhere.
 *
 * Here rather than in the component for the reason the edges are: a second copy is a UI that can
 * silently disagree with the guide it produced — and now also a *default* that can silently
 * disagree with the UI.
 *
 * **Beside the vocabulary rather than beside `densityShift` (#317).** `TemplateSchema` needs it to
 * refuse a direction opening at a density the control cannot return to, and `template.ts` cannot
 * import from `resolver.ts` — the dependency runs the other way. `resolver.ts` re-exports it, so
 * every existing importer is unchanged.
 */
export const DENSITY_DETENTS = [12, 50, 87] as const

export const MoodStateSchema = z.strictObject(
  Object.fromEntries(MOOD_AXES.map((axis) => [axis, z.number().min(0).max(100)])) as {
    [K in MoodAxis]: z.ZodNumber
  },
)

/** Every knob centred. `§6.1`'s offset is zero here, so a neutral mood changes nothing. */
export const NEUTRAL_MOOD: MoodState = Object.freeze(
  Object.fromEntries(MOOD_AXES.map((axis) => [axis, 50])) as MoodState,
)

/**
 * Convenience for tests and callers: a neutral mood with named axes overridden. Also the one
 * place a direction's `Template.mood` becomes a full state (#310) — an axis the direction does
 * not mention is centred, which is what "the direction has no opinion about it" means.
 */
export function moodState(over: Partial<MoodState> = {}): MoodState {
  return { ...NEUTRAL_MOOD, ...over }
}

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
