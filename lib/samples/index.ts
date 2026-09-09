import type { SampleTargetId } from '../core/ids'
import type { SampleTarget } from '../core/sample'
import type { Role } from '../core/vocabulary'
import { KIT_SAMPLES } from './kit'
import { LOW_SAMPLES } from './low'
import { TEXTURE_SAMPLES } from './texture'
import { TONAL_SAMPLES } from './tonal'

/**
 * §3.8/#520. The sample target registry. Hand-written and static, for the reason the template,
 * inspiration and riff registries are: invariant 2's drop-in promise is about *devices*, and a
 * sample target is an authored sound maintained here.
 *
 * ## All twenty-three roles, and the grouping is the presentation problem
 *
 * The human's ruling, and it is not a list anybody gets to curate: **every role a recipe ever asks
 * a reader to supply audio for is here**, which is all of `ROLES`. A shorter list means somebody
 * authors the omissions and then defends them, and the omissions are exactly the sounds nobody
 * thought of — which is the class this section exists for.
 *
 * A flat list of twenty-three roles reads as a technical list, and that is a presentation problem
 * rather than a reason to cut roles. `SAMPLE_GROUPS` below is the answer to it.
 *
 * ## Four groups, and the first of them is §3.6's own
 *
 * `ROLES` is filed by **register** (§1) because that is how a *direction* reaches for a part.
 * `KIT_ROLES` is filed for the **hand** (§3.6) because that is how somebody with a recorder lays a
 * kit down. Neither is how somebody filling a folder of one-shots reads a list, and inventing a
 * third whole-catalogue ordering would be a third thing to keep in step with the other two.
 *
 * So the kit group is `KIT_ROLES`: a reader who has just built a kit at `/devices/<id>/kit` must
 * not find the same twelve sounds in a different order here. It is **written out here and pinned
 * by a test** rather than imported, and that is a layering call rather than a preference —
 * `KIT_ROLES` lives in `lib/studio/device-page.ts`, which reaches the whole device registry and
 * every template, and a folder of authored content importing a view module is a dependency
 * running the wrong way. `test/sample-session.test.ts` asserts the two lists are equal, so the
 * day one of them moves, the other fails loudly.
 *
 * The remaining eleven roles are grouped by what a reader is going to a folder to find — the low
 * end a kit plays under, the tonal sounds played at a pitch, and the beds and transitions measured
 * in bars. Every one of those distinctions is already made somewhere in `DESIGN.md`; none of them
 * is a new claim about a role.
 *
 * The same test pins that the four groups **partition** `ROLES` — no role in two groups, no role
 * in none — so the ruling cannot be quietly walked back by an author who adds a role and forgets
 * a group.
 *
 * ## Targets are not one per role
 *
 * Every role has at least one and a role may have more, because the thing that separates two
 * targets on one role is the **technique**: `bass-note` and `wobble-bass` are both `bass-mid`, and
 * what makes the second one a wobble is four paragraphs about a filter rather than a fifth shared
 * vocabulary (invariant 3).
 */

/** §3.8. One heading on the page, and the roles filed under it. */
export type SampleGroup = {
  id: string
  /** The heading. Prose, and the only thing here a reader sees. */
  title: string
  /** In the order they are offered. Every role appears in exactly one group. */
  roles: readonly Role[]
}

export const SAMPLE_GROUPS: readonly SampleGroup[] = [
  {
    id: 'kit',
    title: 'The kit',
    // §3.6's `KIT_ROLES`, verbatim, and pinned equal to it by test. See the header for why it is
    // copied rather than imported.
    roles: ['kick', 'snare', 'clap', 'rim', 'tom',
            'closed-hat', 'open-hat', 'ride', 'metallic',
            'ghost-perc', 'noise', 'impact'],
  },
  { id: 'low', title: 'The low end', roles: ['sub', 'bass-mid'] },
  { id: 'tonal', title: 'Tonal sounds', roles: ['pad', 'lead', 'stab', 'arp', 'acid', 'vox-chop'] },
  { id: 'texture', title: 'Textures and transitions', roles: ['texture', 'riser', 'sweep'] },
]

/**
 * Every target, in group order and then in the authored order within each group's file.
 *
 * Built by walking `SAMPLE_GROUPS` rather than concatenating the four files, so the order a reader
 * sees and the order the groups declare cannot come apart — and so a target whose role belongs to
 * no group would silently vanish here rather than appear at the end, which is what the partition
 * test above is for.
 */
const AUTHORED: readonly SampleTarget[] = [
  ...KIT_SAMPLES,
  ...LOW_SAMPLES,
  ...TONAL_SAMPLES,
  ...TEXTURE_SAMPLES,
]

/** The targets filed under one group, in the order the page offers them. */
export function targetsInGroup(group: SampleGroup): readonly SampleTarget[] {
  return group.roles.flatMap((role) => AUTHORED.filter((target) => target.role === role))
}

export const SAMPLE_TARGETS: readonly SampleTarget[] = SAMPLE_GROUPS.flatMap(targetsInGroup)

export { KIT_SAMPLES, LOW_SAMPLES, TONAL_SAMPLES, TEXTURE_SAMPLES }

const BY_ID: ReadonlyMap<SampleTargetId, SampleTarget> = new Map(
  SAMPLE_TARGETS.map((target) => [target.id, target]),
)

/** `undefined` for an unknown id — a caller with a stale link is not an exception. */
export function sampleTargetById(id: SampleTargetId): SampleTarget | undefined {
  return BY_ID.get(id)
}
