import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DEFAULT_NODE_CAP,
  characterDistanceSq,
  DeviceSchema,
  assign,
  assignableKey,
  expand,
  moodState,
  resolveRecipe,
  type AssignInput,
  type Device,
  type RoleRequest,
  type Score,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { box, bruteForceBest, desugarPools, keys, makeRecipe, request, withRoles } from './rigs'

/**
 * §7.1's pool symmetry breaking, and the one thing that matters about it: **it must not change
 * the optimum.** A wrong assignment reads as entirely plausible in a finished guide — nobody
 * looking at "sub: Deluge Track 4" can tell that the search should have found something better
 * — so the claim is proved rather than argued, on every rig small enough to search both ways.
 *
 * Two oracles, because they fail differently:
 *
 *  - `bruteForceBest` (`test/rigs.ts`) is an independent enumeration with its own scoring
 *    code. It catches a mistake that lives in the search's shared machinery.
 *  - `desugarPools` (`test/rigs.ts`) rewrites each pool into `count` equivalent *fixed* voices,
 *    which the production search then explores exactly as it did before the fix — `poolId` is
 *    `undefined`, so there is no symmetry for it to break. It catches a mistake that lives in
 *    the prune specifically, which brute force could mask if the two were wrong alike.
 *
 * The second oracle is deliberately a different *device* rather than a flag on `AssignInput`.
 * A flag would be a production API whose only purpose is to re-enable the bug, and it could
 * only toggle a branch inside the code under test; a desugared device exercises the shipping
 * search with no special case in it at all. The cost is that the rewrite itself has to be
 * trusted, so it is round-tripped against the pooled device below rather than assumed.
 *
 * Every rig here is deliberately small: pools of 3 or 4, not 24. Desugaring a real rig is the
 * blow-up the prune exists to prevent, and a test that hits the node cap proves nothing.
 */

// ---------------------------------------------------------------------------
// Rigs. Small enough that the unpruned search finishes, pooled enough to matter.
// ---------------------------------------------------------------------------

/** One pool of four. The Tracker Mini shape, shrunk. */
const pool4 = box('a-pool', {
  kind: 'groovebox',
  voices: [
    {
      kind: 'pool',
      id: 'track',
      label: 'Track',
      count: 4,
      roles: ['kick', 'sub', 'pad', 'lead', 'texture'],
      polyphony: 4,
    },
  ],
  comfortableVoices: 4,
  recipes: [
    makeRecipe('a-kick-hard', 'kick', 'hard', 'track'),
    makeRecipe('a-sub-dark', 'sub', 'dark', 'track'),
    makeRecipe('a-pad-dark', 'pad', 'dark', 'track'),
    makeRecipe('a-lead-bright', 'lead', 'bright', 'track'),
    makeRecipe('a-texture-dark', 'texture', 'dark', 'track'),
  ],
})

/**
 * **Two** pools on one device, which is the Tracker Mini's real shape and the case a
 * representative chosen per *device* rather than per pool gets wrong.
 *
 * `pad` sits at role-fit 2 on `aux` and at role-fit 0 on `zap`, so the two pools are not
 * interchangeable with each other even though each is internally symmetric. The names matter:
 * `aux` sorts before `zap`, so a per-device representative would keep the pool that fits the
 * pad *worse* and the vector would get quietly heavier. Renaming these makes the test stop
 * testing anything, which is why they are named for the ordering and not for a sound.
 */
const twoPools = box('b-two-pools', {
  kind: 'groovebox',
  voices: [
    {
      kind: 'pool',
      id: 'aux',
      label: 'Aux',
      count: 3,
      roles: ['kick', 'sub', 'pad'],
      polyphony: 2,
    },
    {
      kind: 'pool',
      id: 'zap',
      label: 'Zap',
      count: 3,
      // `lead` is here and nowhere else, so a template can occupy `zap-1` on purpose. That
      // matters: while any pool still has its ordinal-1 member free, "lowest ordinal on the
      // device" and "lowest ordinal in each pool" name the same assignable and a per-device
      // representative looks correct. The two only diverge once every pool's first member is
      // taken, so the difference has to be *reachable* before a test can see it.
      roles: ['pad', 'sub', 'lead'],
      polyphony: 4,
    },
  ],
  comfortableVoices: 6,
  recipes: [
    makeRecipe('b-kick-hard', 'kick', 'hard', 'aux'),
    makeRecipe('b-sub-dark-aux', 'sub', 'dark', 'aux'),
    makeRecipe('b-pad-dark-aux', 'pad', 'dark', 'aux'),
    makeRecipe('b-pad-dark-zap', 'pad', 'dark', 'zap'),
    makeRecipe('b-sub-dark-zap', 'sub', 'dark', 'zap'),
    makeRecipe('b-lead-bright-zap', 'lead', 'bright', 'zap'),
  ],
})

/** Fixed voices alongside pools: the prune must leave these completely alone. */
const fixedBox = box('c-fixed', {
  voices: [
    { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
    { kind: 'fixed', id: 'lt', label: 'LT', roles: ['sub', 'bass-mid'], polyphony: 1 },
  ],
  comfortableVoices: 2,
  recipes: [
    makeRecipe('c-kick-hard', 'kick', 'hard', 'bd'),
    makeRecipe('c-sub-dark', 'sub', 'dark', 'lt'),
    makeRecipe('c-bassmid-dark', 'bass-mid', 'dark', 'lt'),
  ],
})

/**
 * A pool tight enough that crowding actually bites: three tracks, but only two are comfortable.
 * `crowdOverflow` outranks `optionalMisses`, so this rig makes the search choose between
 * filling a part and staying inside the box's comfort — a decision the prune must not disturb.
 */
const crowded = box('d-crowded', {
  kind: 'groovebox',
  voices: [
    {
      kind: 'pool',
      id: 'slot',
      label: 'Slot',
      count: 3,
      roles: ['kick', 'sub', 'pad'],
      polyphony: 2,
    },
  ],
  comfortableVoices: 2,
  recipes: [
    makeRecipe('d-kick-hard', 'kick', 'hard', 'slot'),
    makeRecipe('d-sub-dark', 'sub', 'dark', 'slot'),
    makeRecipe('d-pad-dark', 'pad', 'dark', 'slot'),
  ],
})

/**
 * Two pool devices, so `distinct` (§12.6) has somewhere to go: it forbids two same-role parts
 * from sharing a *device*, and with only one pool device in the rig it could only ever be
 * unsatisfiable, which tests nothing.
 */
const pool3 = box('e-pool', {
  kind: 'groovebox',
  voices: [
    { kind: 'pool', id: 'trk', label: 'Trk', count: 3, roles: ['sub', 'pad'], polyphony: 2 },
  ],
  comfortableVoices: 3,
  recipes: [
    makeRecipe('e-sub-dark', 'sub', 'dark', 'trk'),
    makeRecipe('e-pad-dark', 'pad', 'dark', 'trk'),
  ],
})

/**
 * A pool whose members differ in `roleFit`: `lead` sits at index 0 here and at index 3 on
 * `pool4`. Members of *one* pool still share it — that is the point — but the objective key
 * has to stay live across devices, or a test that "role fit is unaffected" would be vacuous.
 */
const leadFirst = box('f-lead', {
  kind: 'groovebox',
  voices: [
    { kind: 'pool', id: 'v', label: 'V', count: 3, roles: ['lead', 'pad'], polyphony: 2 },
  ],
  comfortableVoices: 3,
  recipes: [
    makeRecipe('f-lead-bright', 'lead', 'bright', 'v'),
    makeRecipe('f-pad-dark', 'pad', 'dark', 'v'),
  ],
})

const rigs: [string, Device[]][] = [
  ['one pool of four', [pool4]],
  ['two pools on one device', [twoPools]],
  ['pool + fixed', [pool4, fixedBox]],
  ['two pool devices', [pool4, pool3]],
  ['pools with different role fits', [pool4, leadFirst]],
  ['a crowded pool', [crowded]],
  ['crowded pool + fixed', [crowded, fixedBox]],
  ['everything', [crowded, fixedBox, pool3]],
]

// ---------------------------------------------------------------------------
// Templates. Each one leans on a different key of the vector or a different rule.
// ---------------------------------------------------------------------------

/** Sections come from `test/fixtures.ts`: Intro, Build, Drop. */
const templates: [string, Template][] = [
  [
    'two parts',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
    ]),
  ],
  [
    'more parts than one pool holds',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2 }),
      request({ id: 'r-lead', role: 'lead', character: 'bright', priority: 2 }),
      request({ id: 'r-tex', role: 'texture', character: 'dark', priority: 3 }),
    ]),
  ],
  [
    // §4.2: two transient parts in disjoint sections legally share one voice. An occupied pool
    // member is therefore a live candidate, and is exactly what the prune must not discard.
    'section-disjoint reuse',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({
        id: 'r-sub-early',
        role: 'sub',
        character: 'dark',
        priority: 2,
        sustain: 'transient',
        sections: ['Intro'],
      }),
      request({
        id: 'r-sub-late',
        role: 'sub',
        character: 'dark',
        priority: 2,
        sustain: 'transient',
        sections: ['Drop'],
      }),
      request({
        id: 'r-pad-late',
        role: 'pad',
        character: 'dark',
        priority: 3,
        sustain: 'transient',
        sections: ['Build', 'Drop'],
      }),
    ]),
  ],
  [
    // Overlapping *and* disjoint on the same role, so a member can be free for one request and
    // busy for another at the same node.
    'partially overlapping sections',
    withRoles([
      request({
        id: 'r-a',
        role: 'sub',
        character: 'dark',
        priority: 1,
        sustain: 'transient',
        sections: ['Intro', 'Build'],
      }),
      request({
        id: 'r-b',
        role: 'sub',
        character: 'dark',
        priority: 1,
        sustain: 'transient',
        sections: ['Build', 'Drop'],
      }),
      request({
        id: 'r-c',
        role: 'sub',
        character: 'dark',
        priority: 2,
        sustain: 'transient',
        sections: ['Intro'],
      }),
    ]),
  ],
  [
    // §12.6: two subs that must not share a device. Device-level, so no pool ordinal can
    // satisfy it that another cannot - which is the claim, stated as a test.
    'distinct subs',
    withRoles([
      request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1, distinct: true }),
      request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 1, distinct: true }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2 }),
    ]),
  ],
  [
    // Substitution: nothing authors a `bright` pad, so `recipeDistance` becomes the deciding
    // key and the prune has to preserve *which* recipe wins, not only how many parts fit.
    'characters nothing authors exactly',
    withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'bright', priority: 1 }),
      request({ id: 'r-lead', role: 'lead', character: 'dark', priority: 2 }),
      request({ id: 'r-sub', role: 'sub', character: 'hard', priority: 2 }),
    ]),
  ],
  [
    // Kick pins `aux-1`, lead pins `zap-1`, and only then is a pad asked for. That is the
    // arrangement in which "lowest per pool" and "lowest per device" disagree.
    'a part asked for after every pool has been opened',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-lead', role: 'lead', character: 'bright', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 2 }),
    ]),
  ],
  [
    'optional parts and a crowded box',
    withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 2 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 3, optional: true }),
      request({ id: 'r-tex', role: 'texture', character: 'dark', priority: 4, optional: true }),
    ]),
  ],
  [
    // Polyphony is a per-pool property, so a request that most members cannot carry must be a
    // request *no* member of that pool can carry. If it were per-member the prune would be
    // unsound, and this is what would show it.
    'a part needing more polyphony than some pools have',
    withRoles([
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1, polyphony: 4 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1, polyphony: 2 }),
      request({ id: 'r-kick', role: 'kick', priority: 2 }),
    ]),
  ],
]

const SEEDS = [0, 1, 2, 3, 5, 8, 13, 21]

/**
 * The unpruned search: the same shipping code and the same objective, given a rig whose pools
 * have been rewritten into individually-named fixed voices so there is no symmetry to break.
 */
function unpruned(devices: Device[], t: Template, seed: number): AssignInput {
  return { devices: devices.map(desugarPools), template: t, mood: moodState(), seed }
}

// ---------------------------------------------------------------------------
// The oracle itself, before it is trusted to judge anything
// ---------------------------------------------------------------------------

/**
 * `desugarPools` is the second oracle, so a bug in it would quietly weaken every comparison
 * below rather than fail anything. These check the rewrite against the pooled device directly:
 * same assignables, same recipe resolution, same comfort, and — the sharpest of them — the
 * result still parses as a legal device, which is what proves the duplicated recipes did not
 * collide on §3's one-per-(role, character, voice) rule.
 */
describe('desugarPools is faithful (test oracle)', () => {
  /**
   * A device carrying a pool *and* fixed voices, so the round-trip below also covers the fixed
   * voices whose recipes `desugarPools` re-homes without otherwise touching them.
   */
  const mixed = box('i-mixed', {
    kind: 'groovebox',
    voices: [
      { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
      { kind: 'pool', id: 'trk', label: 'Trk', count: 3, roles: ['sub', 'pad'], polyphony: 2 },
      { kind: 'fixed', id: 'ch', label: 'CH', roles: ['closed-hat'], polyphony: 1 },
    ],
    comfortableVoices: 4,
    recipes: [
      makeRecipe('i-kick-hard', 'kick', 'hard', 'bd'),
      makeRecipe('i-kick-dark', 'kick', 'dark', 'bd'),
      makeRecipe('i-hat-clean', 'closed-hat', 'clean', 'ch'),
      makeRecipe('i-sub-dark', 'sub', 'dark', 'trk'),
      makeRecipe('i-pad-dark', 'pad', 'dark', 'trk'),
    ],
  })

  const pooled = [pool4, twoPools, crowded, pool3, leadFirst, mixed]

  it('produces the same assignables, in the same order, minus poolId and ordinal', () => {
    for (const device of pooled) {
      const before = expand(device)
      const after = expand(desugarPools(device))
      expect(after.length, device.id).toBe(before.length)
      // Every fixture must actually contain a pool, or the round-trip below is vacuous for it.
      expect(before.some((a) => a.poolId !== undefined), device.id).toBe(true)
      before.forEach((a, i) => {
        const b = after[i]
        expect(b?.deviceId).toBe(a.deviceId)
        expect(b?.voiceId).toBe(a.voiceId)
        expect(b?.label).toBe(a.label)
        expect(b?.roles).toEqual(a.roles)
        expect(b?.polyphony).toBe(a.polyphony)
        // `poolId` and `ordinal` are the only fields allowed to differ, and only in one
        // direction: everything is a fixed voice afterwards, pool members included.
        expect(b?.poolId, `${device.id}/${a.voiceId}`).toBeUndefined()
        expect(b?.ordinal, `${device.id}/${a.voiceId}`).toBeUndefined()
      })
    }
  })

  it('resolves the same recipe for every member, role and character', () => {
    for (const device of pooled) {
      const desugared = desugarPools(device)
      const before = expand(device)
      const after = expand(desugared)
      before.forEach((a, i) => {
        const b = after[i]
        if (b === undefined) throw new Error('length mismatch')
        for (const role of a.roles) {
          for (const character of CHARACTERS) {
            const x = resolveRecipe(device, a, role, character)
            const y = resolveRecipe(desugared, b, role, character)
            expect(y.outcome, `${device.id}/${a.voiceId} ${role} ${character}`).toBe(x.outcome)
            expect(y.distanceSq).toBe(x.distanceSq)
            if (x.outcome !== 'unvoiced' && y.outcome !== 'unvoiced') {
              expect(y.character).toBe(x.character)
              // Same recipe under a re-homed id: one authored pool recipe became `count`
              // copies, each prefixed with its emitted voice's index.
              expect(y.recipe.title).toBe(x.recipe.title)
              expect(y.recipe.role).toBe(x.recipe.role)
            }
          }
        }
      })
    }
  })

  it('keeps comfortableVoices and the device id, so crowding and distinct are unchanged', () => {
    for (const device of pooled) {
      const desugared = desugarPools(device)
      expect(desugared.id).toBe(device.id)
      expect(desugared.comfortableVoices).toBe(device.comfortableVoices)
    }
  })

  it('still parses as a legal device', () => {
    // Recipe ids stay unique and no two land on the same (role, character, voice) - the rule
    // §2.2's `poolId ?? voiceId` lookup exists to make possible in the first place.
    for (const device of pooled) {
      const parsed = DeviceSchema.safeParse(desugarPools(device))
      expect(parsed.success, `${device.id}: ${JSON.stringify(parsed.error?.issues ?? [])}`).toBe(
        true,
      )
    }
  })

  it('leaves a device with no pools exactly as it was', () => {
    expect(desugarPools(fixedBox)).toBe(fixedBox)
  })

  /**
   * The collision the indexed prefix exists to prevent, built on purpose.
   *
   * `bd`'s recipe is authored with the literal id `1/a`. The pool emits members at indices 1
   * and 2, and its own recipe is `a` — so a rewrite that prefixed only the *clones* would give
   * member 1 the id `1/a` as well, and the device would carry two recipes under one id. §3's
   * uniqueness rule would reject it, which is the good case; the bad case is a scheme that
   * happens not to be checked and silently resolves the wrong recipe.
   *
   * Because the fixed voice is renamed too, `bd`'s recipe becomes `0/1/a` and nothing the pool
   * emits can reach it. The same holds for any id an author could write.
   */
  it('cannot collide a pool clone with a fixed voice\'s own recipe id', () => {
    const adversarial = box('j-collide', {
      kind: 'groovebox',
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'pool', id: 'trk', label: 'Trk', count: 2, roles: ['sub'], polyphony: 2 },
      ],
      comfortableVoices: 3,
      recipes: [
        // Named to land exactly where pool member 1's clone would, under a clones-only scheme.
        { ...makeRecipe('placeholder-kick', 'kick', 'hard', 'bd'), id: '1/a' },
        { ...makeRecipe('placeholder-sub', 'sub', 'dark', 'trk'), id: 'a' },
      ],
    })

    const desugared = desugarPools(adversarial)
    const ids = desugared.recipes.map((r) => r.id)
    expect(new Set(ids).size, `duplicate recipe id in ${JSON.stringify(ids)}`).toBe(ids.length)

    const parsed = DeviceSchema.safeParse(desugared)
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true)

    // The fixed voice's recipe still resolves, and still to the same recipe.
    const before = expand(adversarial)
    const after = expand(desugared)
    before.forEach((a, i) => {
      const b = after[i]
      if (b === undefined) throw new Error('length mismatch')
      for (const role of a.roles) {
        const x = resolveRecipe(adversarial, a, role, 'hard')
        const y = resolveRecipe(desugared, b, role, 'hard')
        expect(y.outcome, `${a.voiceId} ${role}`).toBe(x.outcome)
        expect(y.distanceSq).toBe(x.distanceSq)
      }
    })

    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
    ])
    expect(
      assign({ devices: [adversarial], template: t, mood: moodState(), seed: 1 }).score,
    ).toEqual(assign({ devices: [desugared], template: t, mood: moodState(), seed: 1 }).score)
  })

  /**
   * The other half of the guarantee: `${index}/` has to be *prefix-free*, or two different
   * voices can produce the same id from different authored ones.
   *
   * Built to collide under a digit separator, which is the tempting mistake. Pool `a` has two
   * members at indices 0 and 1 and authors `0z`; pool `b` follows at indices 2..10 and authors
   * `z`. With '0' as the separator, index 1 gives `1` + `0` + `0z` = `100z` and index 10 gives
   * `10` + `0` + `z` = `100z` — the same id from two different voices. '/' is not a digit, so
   * `1/` can never be a prefix of `10/`, and the two stay `1/0z` and `10/z`.
   */
  it('keeps ids unique once the emitted index reaches two digits', () => {
    const twoDigit = box('k-two-digit', {
      kind: 'groovebox',
      voices: [
        { kind: 'pool', id: 'a', label: 'A', count: 2, roles: ['sub'], polyphony: 2 },
        { kind: 'pool', id: 'b', label: 'B', count: 9, roles: ['pad'], polyphony: 2 },
      ],
      comfortableVoices: 11,
      recipes: [
        { ...makeRecipe('placeholder-a', 'sub', 'dark', 'a'), id: '0z' },
        { ...makeRecipe('placeholder-b', 'pad', 'dark', 'b'), id: 'z' },
      ],
    })

    const desugared = desugarPools(twoDigit)
    // Eleven emitted voices, so indices run 0..10 and the two-digit case is genuinely reached.
    expect(desugared.voices.length).toBe(11)
    const ids = desugared.recipes.map((r) => r.id)
    expect(new Set(ids).size, `duplicate recipe id in ${JSON.stringify(ids)}`).toBe(ids.length)

    const parsed = DeviceSchema.safeParse(desugared)
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true)

    const t = withRoles([
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1 }),
    ])
    expect(assign({ devices: [twoDigit], template: t, mood: moodState(), seed: 1 }).score).toEqual(
      assign({ devices: [desugared], template: t, mood: moodState(), seed: 1 }).score,
    )
  })

  /**
   * The rewrite has to survive recipe ids that are *not* tidy kebab-case slugs, because
   * `RecipeSchema` does not require them to be: `id` is `z.string().min(1)`.
   *
   * `bright` and `dark` are both at squared distance 2 from `hard`, so a `hard` request on this
   * pool is an exact tie and §7.2's code-unit tie-break on the recipe id decides it. `'a'` sorts
   * below `'a!'`, so the pooled device picks `bright`. An earlier version of `desugarPools`
   * *appended* the ordinal, producing `'a-1'` and `'a!-1'` — which compare the other way, since
   * '!' is 0x21 and '-' is 0x2D — and the oracle would have quietly resolved a different
   * substitution from the device it claims to be equivalent to.
   */
  it('preserves the tie-break between prefix-related recipe ids', () => {
    const tied = box('h-tied', {
      kind: 'groovebox',
      voices: [
        { kind: 'pool', id: 'trk', label: 'Trk', count: 3, roles: ['sub'], polyphony: 2 },
      ],
      comfortableVoices: 3,
      recipes: [
        // Deliberately adversarial ids: one is a strict prefix of the other, and the extra
        // character sorts below '-' and ':' alike, so no choice of suffix separator survives.
        { ...makeRecipe('x', 'sub', 'bright', 'trk'), id: 'a' },
        { ...makeRecipe('y', 'sub', 'dark', 'trk'), id: 'a!' },
      ],
    })
    const desugared = desugarPools(tied)

    // The tie is real: both characters are equidistant, so only the id ordering decides.
    expect(characterDistanceSq('bright', 'hard')).toBe(characterDistanceSq('dark', 'hard'))

    const before = expand(tied)
    const after = expand(desugared)
    expect(after.length).toBe(before.length)
    before.forEach((a, i) => {
      const b = after[i]
      if (b === undefined) throw new Error('length mismatch')
      const x = resolveRecipe(tied, a, 'sub', 'hard')
      const y = resolveRecipe(desugared, b, 'sub', 'hard')
      expect(x.outcome).toBe('substituted')
      // The pooled device resolves `bright`, because 'a' < 'a!'.
      expect(x.outcome === 'unvoiced' ? undefined : x.character).toBe('bright')
      expect(y.outcome).toBe(x.outcome)
      expect(y.outcome === 'unvoiced' ? undefined : y.character).toBe(
        x.outcome === 'unvoiced' ? undefined : x.character,
      )
      expect(y.distanceSq).toBe(x.distanceSq)
    })

    // And the whole search agrees, which is the property the oracle is actually used for.
    const t = withRoles([request({ id: 'r-sub', role: 'sub', priority: 1 })])
    expect(assign({ devices: [tied], template: t, mood: moodState(), seed: 1 }).score).toEqual(
      assign({ devices: [desugared], template: t, mood: moodState(), seed: 1 }).score,
    )
  })
})

// ---------------------------------------------------------------------------
// The obligation
// ---------------------------------------------------------------------------

describe('pool symmetry breaking does not change the optimum (§7.1)', () => {
  for (const [rigName, devices] of rigs) {
    for (const [tName, t] of templates) {
      it(`${rigName} / ${tName}: matches brute force and the unpruned search, on every seed`, () => {
        const oracle = bruteForceBest(devices, t)

        for (const seed of SEEDS) {
          const pruned = assign({ devices, template: t, mood: moodState(), seed })
          const explored = assign(unpruned(devices, t, seed))

          // Both must have actually finished. A capped run falls back to greedy, and greedy
          // agreeing with greedy would prove nothing at all.
          expect(pruned.search.capped, `pruned capped on seed ${seed}`).toBe(false)
          expect(explored.search.capped, `unpruned capped on seed ${seed}`).toBe(false)

          expect(pruned.score, `vs brute force, seed ${seed}`).toEqual(oracle)
          expect(explored.score, `unpruned vs brute force, seed ${seed}`).toEqual(oracle)
          // The count of parts placed is not implied by the score - two allocations can tie
          // on the vector - so it is asserted separately.
          expect(pruned.assignments.length).toBe(explored.assignments.length)
          expect(pruned.shortfalls.map((g) => g.requestId).sort()).toEqual(
            explored.shortfalls.map((g) => g.requestId).sort(),
          )
        }
      })
    }
  }
})

/**
 * The one cell of the matrix below where symmetry breaking now costs *more* nodes than it saves.
 *
 * It is an ordering effect, not a lost candidate: restricting each pool to its lowest free
 * ordinal narrows the branching factor but also changes which leaf the first descent reaches, and
 * since the relaxed suffix bound landed, the quality of the first incumbent matters more than the
 * branching factor does. The desugared run happens to hit its optimum immediately here and then
 * prunes everything else at depth one. 42 nodes against 26, and 20 against 19 — a different
 * route, not a blow-up.
 *
 * That this is *only* an ordering effect is proved elsewhere, not asserted here: the optimality
 * matrix above runs these exact rigs and templates against brute force on every seed and the two
 * agree. Named rather than tolerated, so that a future change which removes an inversion fails
 * this test and forces the entry to be deleted.
 *
 * Both cells are on the `everything` rig — three devices, two of them pooled — which is the only
 * row where the bound has enough candidates to reach its optimum on the first descent.
 */
const SYMMETRY_INVERSIONS = new Set([
  'everything / section-disjoint reuse',
  'everything / a part asked for after every pool has been opened',
])

describe('the pruning is doing something (§7.1)', () => {
  it('visits strictly fewer nodes than the unpruned search wherever a pool is involved', () => {
    let compared = 0
    for (const [rigName, devices] of rigs) {
      for (const [tName, t] of templates) {
        const pruned = assign({ devices, template: t, mood: moodState(), seed: 1 })
        const explored = assign(unpruned(devices, t, 1))
        const where = `${rigName} / ${tName}: ${pruned.search.nodes} vs ${explored.search.nodes}`
        if (SYMMETRY_INVERSIONS.has(`${rigName} / ${tName}`)) {
          expect(pruned.search.nodes, `no longer inverted, delete the entry: ${where}`).toBeGreaterThan(
            explored.search.nodes,
          )
          continue
        }
        expect(pruned.search.nodes, where).toBeLessThanOrEqual(explored.search.nodes)
        if (pruned.search.nodes < explored.search.nodes) compared++
      }
    }
    // Not "every case shrinks": a template whose parts are pinned to fixed voices has no
    // symmetry to break. But most of this matrix must shrink, or the prune is inert and the
    // whole suite above is measuring nothing.
    expect(compared).toBeGreaterThan(rigs.length)
  })

  /**
   * **This case used to read "turns a rig that could only be searched greedily into one that is
   * searched exhaustively", and the relaxed suffix bound took that claim away from it.**
   *
   * The fixture is unchanged and so is the arithmetic it was built on: eight parts over an
   * eight-track pool is 8! orderings of one assignment, and before the suffix bound the desugared
   * search hit the 50k cap on it. It now finishes in 45 nodes, because every part has a
   * perfect-distance candidate on every track — so the floor is exactly achievable, the first
   * descent is optimal, and everything else prunes at depth one. Scaling the fixture does not
   * bring the cap back: 24 tracks and 24 parts is 325 nodes.
   *
   * What is left is still worth asserting, and it is what the fixture was really for: symmetry
   * breaking cuts this tree by roughly two thirds on top of the bound. The rescue-from-greedy
   * claim is not restated, because on this rig it is no longer the symmetry prune doing it.
   */
  it('cuts a full-size pool down even where the suffix bound has already finished the job', () => {
    // Eight tracks and eight parts: 8! orderings of an assignment that is one assignment.
    const eight = box('big-pool', {
      kind: 'groovebox',
      voices: [
        {
          kind: 'pool',
          id: 'track',
          label: 'Track',
          count: 8,
          roles: ['kick', 'sub', 'pad', 'lead', 'texture'],
          polyphony: 4,
        },
      ],
      comfortableVoices: 8,
      recipes: [
        makeRecipe('big-kick-hard', 'kick', 'hard', 'track'),
        makeRecipe('big-sub-dark', 'sub', 'dark', 'track'),
        makeRecipe('big-pad-dark', 'pad', 'dark', 'track'),
        makeRecipe('big-lead-bright', 'lead', 'bright', 'track'),
        makeRecipe('big-texture-dark', 'texture', 'dark', 'track'),
      ],
    })
    const roles: RoleRequest[] = [
      request({ id: 'r-1', role: 'kick', priority: 1 }),
      request({ id: 'r-2', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-3', role: 'pad', character: 'dark', priority: 2 }),
      request({ id: 'r-4', role: 'lead', character: 'bright', priority: 2 }),
      request({ id: 'r-5', role: 'texture', character: 'dark', priority: 3 }),
      request({ id: 'r-6', role: 'pad', character: 'dark', priority: 3 }),
      request({ id: 'r-7', role: 'sub', character: 'dark', priority: 4 }),
      request({ id: 'r-8', role: 'texture', character: 'dark', priority: 4 }),
    ]
    const t = withRoles(roles)

    const explored = assign(unpruned([eight], t, 1))
    const pruned = assign({ devices: [eight], template: t, mood: moodState(), seed: 1 })
    expect(explored.search.capped).toBe(false)
    expect(pruned.search.capped).toBe(false)
    expect(pruned.search.nodes).toBeLessThan(explored.search.nodes / 2)
    // All eight parts fit on eight tracks, so nothing may be missed — and the two agree on that,
    // which is the part of the old assertion that never depended on the cap.
    expect(pruned.assignments.length).toBe(8)
    expect(explored.assignments.length).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// What the prune actually chooses
// ---------------------------------------------------------------------------

function placements(devices: Device[], t: Template, seed: number): string[] {
  return assign({ devices, template: t, mood: moodState(), seed })
    .assignments.map((a) => assignableKey(a.assignable))
    .sort()
}

describe('the representative it keeps (§7.1)', () => {
  it('is the lowest free ordinal, and packs from 1 upwards', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1 }),
    ])
    expect(placements([pool4], t, 1)).toEqual([
      'a-pool/track-1',
      'a-pool/track-2',
      'a-pool/track-3',
    ])
  })

  it('counts ordinals numerically, not by code unit', () => {
    // Twelve members. Code-unit order alone ranks 'v-10' below 'v-2', so a comparison that
    // forgot `ordinal` would hand out v-1, v-10, v-11 - and would still pass every optimality
    // test above, because those members are interchangeable. This is the only test that sees it.
    const twelve = box('g-twelve', {
      kind: 'groovebox',
      voices: [
        { kind: 'pool', id: 'v', label: 'V', count: 12, roles: ['sub'], polyphony: 2 },
      ],
      comfortableVoices: 12,
      recipes: [makeRecipe('g-sub-dark', 'sub', 'dark', 'v')],
    })
    const t = withRoles([
      request({ id: 'r-1', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-2', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-3', role: 'sub', character: 'dark', priority: 1 }),
    ])
    expect(placements([twelve], t, 1)).toEqual([
      'g-twelve/v-1',
      'g-twelve/v-2',
      'g-twelve/v-3',
    ])
  })

  it('is the same member on every seed: pool ordinals are no longer a tie the seed may break', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
    ])
    const seen = new Set(SEEDS.map((seed) => placements([pool4], t, seed).join(' ')))
    expect(seen.size).toBe(1)
  })

  it('keeps an occupied member as a candidate, so section-disjoint reuse still happens', () => {
    // Two transient subs in disjoint sections. Sharing track-1 leaves the pool emptier and the
    // device count lower; the prune must not have removed the occupied track from the running.
    const t = withRoles([
      request({
        id: 'r-early',
        role: 'sub',
        character: 'dark',
        priority: 1,
        sustain: 'transient',
        sections: ['Intro'],
      }),
      request({
        id: 'r-late',
        role: 'sub',
        character: 'dark',
        priority: 1,
        sustain: 'transient',
        sections: ['Drop'],
      }),
    ])
    const result = assign({ devices: [pool4, fixedBox], template: t, mood: moodState(), seed: 1 })
    const chosen = result.assignments.map((a) => assignableKey(a.assignable))
    expect(chosen.length).toBe(2)
    // Both on one voice: the occupied member won on `idleDevices` and it was still available.
    expect(new Set(chosen).size).toBe(1)
  })

  it('treats two pools on one device as two symmetry groups', () => {
    // `aux` and `zap` both serve pad, at role-fit 2 and 0 respectively. One representative
    // per *device* would offer only whichever pool sorted first - `aux` - and force the pad
    // onto it, a strictly worse vector that the optimality suite above also catches. Named
    // here as well, because "the pad landed on the wrong pool" is the concrete failure.
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-lead', role: 'lead', character: 'bright', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 2 }),
    ])
    const chosen = placements([twoPools], t, 1)
    // kick -> aux-1 (only `aux` serves it), lead -> zap-1 (only `zap` serves it). The pad then
    // has aux-2 at role-fit 2 and zap-2 at role-fit 0 available, and must take zap-2. A
    // per-device representative offers only aux-2 here, because 'aux-2' < 'zap-2'.
    expect(chosen).toEqual(['b-two-pools/aux-1', 'b-two-pools/zap-1', 'b-two-pools/zap-2'])
  })

  it('leaves fixed voices entirely alone', () => {
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-bassmid', role: 'bass-mid', character: 'dark', priority: 1 }),
    ])
    // BD and LT are not pool members; nothing about the prune may make LT unavailable to the
    // second request just because the first one considered it.
    const chosen = placements([fixedBox], t, 1)
    expect(chosen).toContain('c-fixed/bd')
    expect(chosen).toContain('c-fixed/lt')
  })
})

// ---------------------------------------------------------------------------
// Determinism (invariant 6)
// ---------------------------------------------------------------------------

describe('the prune is deterministic (invariant 6)', () => {
  it('gives the same score and the same voices on repeated runs', () => {
    for (const [, devices] of rigs) {
      for (const [, t] of templates) {
        const once = assign({ devices, template: t, mood: moodState(), seed: 3 })
        const twice = assign({ devices, template: t, mood: moodState(), seed: 3 })
        expect(JSON.stringify(once.score)).toBe(JSON.stringify(twice.score))
        expect(once.assignments.map((a) => assignableKey(a.assignable))).toEqual(
          twice.assignments.map((a) => assignableKey(a.assignable)),
        )
      }
    }
  })

  it('scores identically whatever the seed, since the seed cannot reach a pool ordinal', () => {
    for (const [rigName, devices] of rigs) {
      for (const [tName, t] of templates) {
        const scores = new Set(
          SEEDS.map((seed) =>
            JSON.stringify(assign({ devices, template: t, mood: moodState(), seed }).score),
          ),
        )
        expect(scores.size, `${rigName} / ${tName}`).toBe(1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The premise the prune rests on
// ---------------------------------------------------------------------------

describe('nothing distinguishes two members of one pool (§7.1)', () => {
  it('holds for roles, polyphony, recipe and role fit', () => {
    // Stated directly rather than inferred from an outcome: if a future device shape gives
    // pool members their own roles or their own recipes, symmetry breaking becomes unsound and
    // this is the test that says so first.
    for (const device of [pool4, twoPools, crowded, pool3, leadFirst]) {
      const members = new Map<string, { roles: string; polyphony: number }[]>()
      for (const voice of device.voices) {
        if (voice.kind !== 'pool') continue
        for (let ordinal = 1; ordinal <= voice.count; ordinal++) {
          const list = members.get(voice.id) ?? []
          list.push({ roles: voice.roles.join(','), polyphony: voice.polyphony })
          members.set(voice.id, list)
        }
      }
      for (const [poolId, list] of members) {
        const distinctShapes = new Set(list.map((m) => `${m.roles}|${m.polyphony}`))
        expect(distinctShapes.size, `${device.id}/${poolId}`).toBe(1)
      }
      // Recipes address `poolId`, never a member, so one recipe serves every ordinal (§2.2).
      for (const recipe of device.recipes) {
        expect(device.voices.some((v) => v.id === recipe.voice)).toBe(true)
      }
    }
  })

  it('holds for `distinct`, which is a claim about devices', () => {
    // Two distinct subs on a rig with one pool device: the second cannot be placed however
    // many free members the pool has, because the rule is about `deviceId`.
    const t = withRoles([
      request({ id: 'r-sub-1', role: 'sub', character: 'dark', priority: 1, distinct: true }),
      request({ id: 'r-sub-2', role: 'sub', character: 'dark', priority: 1, distinct: true }),
    ])
    const result = assign({ devices: [pool4], template: t, mood: moodState(), seed: 1 })
    expect(result.assignments.length).toBe(1)
    expect(result.shortfalls).toHaveLength(1)
    expect(result.shortfalls[0]).toMatchObject({ reason: 'no-room', because: 'distinct' })
  })

  it('holds for crowding, which counts occupied assignables and not which ones', () => {
    // Three parts on a pool comfortable with two: the third costs exactly one overflow no
    // matter which member carries it.
    const t = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-sub', role: 'sub', character: 'dark', priority: 1 }),
      request({ id: 'r-pad', role: 'pad', character: 'dark', priority: 1 }),
    ])
    const result = assign({ devices: [crowded], template: t, mood: moodState(), seed: 1 })
    expect(result.assignments.length).toBe(3)
    expect(keys(result.score).crowdOverflow).toBe(1)
    expect(result.score as unknown as Score).toEqual(bruteForceBest([crowded], t))
  })
})

// ---------------------------------------------------------------------------
// The rig this was actually for
// ---------------------------------------------------------------------------

/**
 * §7.1's node cap is a backstop against pathology, not a budget to spend. Before symmetry
 * breaking, realistic rigs with full-size pool devices hit it and fell back to greedy: a TR-1000
 * plus a Tracker Mini capped at ten parts, and any rig including the Deluge capped from six.
 * Smaller pools and shorter templates still finished, which is exactly why it stayed invisible —
 * the failure scaled with the two things a real guide grows. `SearchReport` reported it honestly
 * every time; nothing about it was silent. It was just wrong, and nothing failed when it was.
 *
 * The real registry rather than a fixture, deliberately: the Deluge's pool is 24 members and
 * the Tracker Mini's are 8 and 8, and no hand-authored rig would think to be that large.
 */
describe('the real registry searches exhaustively (§7.1)', () => {
  const ROLES = [
    'kick',
    'snare',
    'closed-hat',
    'sub',
    'bass-mid',
    'pad',
    'lead',
    'texture',
    'clap',
    'open-hat',
    'tom',
    'arp',
  ] as const

  function realistic(count: number): Template {
    return withRoles(
      ROLES.slice(0, count).map((role, i) =>
        request({
          id: `r-${i}-${role}`,
          role,
          priority: Math.min(4, 1 + Math.floor(i / 3)),
          character: 'dark',
        }),
      ),
    )
  }

  it('the whole registry, 10 roles, finishes without the cap', () => {
    const result = assign({
      devices: [...DEVICES],
      template: realistic(10),
      mood: moodState(),
      seed: 1,
    })
    expect(result.search.capped).toBe(false)
    expect(result.search.method).toBe('exhaustive')
    // Not a performance budget, a smoke alarm. `scripts/bench-search.ts` prints the current
    // figures; no exact number is asserted, because that would fail on every harmless change to
    // a manifest.
    expect(result.search.nodes).toBeLessThan(DEFAULT_NODE_CAP)
  })

  /**
   * **The alarm above fired when the MC-101 landed, this case recorded the finding, and the
   * relaxed suffix bound repaired it. Kept as the regression test for that repair.**
   *
   * The history is worth keeping because it is what the bound was built for. This case used to
   * read "12 roles, finishes without the cap"; a fifth voice-bearing device broke it, and 12
   * synthetic roles went from 12,286 nodes on four devices to 158,086 on five. Adding the TR-8S
   * as a ninth took it past 380,000. That was never the §7.1 symmetry bug returning — pool
   * members still collapse, and the count grew with the number of *devices*, not factorially with
   * pool size — so the answer was not a bigger cap but a bound that charges for the requests not
   * yet decided (`buildSuffixFloor` in `lib/core/search.ts`).
   *
   * The synthetic template here is harsher than anything shipped: twelve requests, every one of
   * them `dark`, so nearly every device offers a candidate for nearly every request. It now
   * finishes exhaustively inside the shipped cap with room to spare, which is the assertion.
   */
  it('the whole registry, 12 roles, is back inside the shipped cap', () => {
    const template = realistic(12)
    const result = assign({ devices: [...DEVICES], template, mood: moodState(), seed: 1 })
    expect(result.search.capped).toBe(false)
    expect(result.search.method).toBe('exhaustive')
    // A smoke alarm, not a budget, for the reason the case above gives — but a *tight* one, so
    // that losing the suffix bound is caught here rather than only as a slow test run.
    expect(result.search.nodes).toBeLessThan(DEFAULT_NODE_CAP / 2)
  })

  /**
   * The case that decides whether the finding above is a product problem or a headroom problem.
   *
   * Every template the app can actually run still searches exhaustively at the shipped cap, so no
   * guide anybody generates today is a greedy fallback.
   *
   * ## This test has fired once, and the warning it left was accurate
   *
   * It used to read: *"`industrial-techno` is the tight one at roughly 49.6k of 50k — under one
   * percent of room — so the next handful of recipes authored anywhere in the library tips it
   * over, and this is where that will be noticed."*
   *
   * It was one recipe, not a handful. Adding a single `sampled-chord` stab to the Tracker Mini
   * took the worst case over these seeds to 51,606 against the old 50,000 cap and dropped 8 of
   * these 24 cases to greedy — and the guide it degraded was worse in a way a reader would see:
   * the golden full rig's `pad` came out as a *substitution* (asked `dark`, got `soft`) under the
   * fallback, where the exhaustive answer is an exact `dark` match. `DEFAULT_NODE_CAP` was raised
   * to 150,000 rather than the content being dropped; the reasoning, the timing and the #78
   * stopgap framing are on the constant itself.
   *
   * **The number the next reader needs is not the cap, it is the curve.** The full *twelve*-device
   * rig measured 33,142 nodes worst case on this template, uncapped. One further device — 19
   * recipes over 6 tonal roles — took seed 18 to 86,722, a 2.6x jump from a 1/13th increase in
   * boxes. Growth tracks **recipes x supported roles**, because a device that can serve many
   * tonal roles adds branching at every level of the search; it does not track how many folders
   * are under `lib/devices/`. Size the fix against that.
   *
   * So the same warning, with today's numbers: 150,000 leaves ~73% headroom over the 86,722 that
   * forced the raise, and ~41% over the worst seen in a wider sweep (88,596, across 40 seeds x 3
   * templates). Real room, and still a constant standing in for a bound.
   * The next device that serves five or six tonal roles is the one to watch, and this is again
   * where it will be noticed.
   *
   * Nothing here asserts an exact node count, for the reason the smoke alarm above gives. What is
   * asserted is the property that matters: real inputs, real cap, exhaustive.
   */
  /**
   * The timeout is not a workaround. This runs `TEMPLATES.length * SEEDS.length` exhaustive
   * searches over the whole registry — forty of them today at fourteen devices and five
   * directions, about 1.4s on a developer machine and several times that on a CI runner sharing
   * a core with the other fifty-two test files. It first went red on `LANG=C.UTF-8` at the
   * default 5s, which reads like a locale failure and is not one.
   *
   * The cost grows on both axes this file already warns about: a device that serves more tonal
   * roles makes each search deeper, and every direction authored adds a whole column of them.
   * Whoever raises the number next should read that as the same signal the node cap gives.
   */
  it('leaves every shipped template inside the shipped cap', () => {
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = assign({ devices: [...DEVICES], template, mood: moodState(), seed })
        const where = `${template.id} seed ${seed}`
        expect(result.search.capped, where).toBe(false)
        expect(result.search.method, where).toBe('exhaustive')
      }
    }
  }, 30_000)

  it('is deterministic on the real registry, whatever the seed', () => {
    const t = realistic(10)
    const scores = new Set(
      SEEDS.map((seed) =>
        JSON.stringify(assign({ devices: [...DEVICES], template: t, mood: moodState(), seed }).score),
      ),
    )
    expect(scores.size).toBe(1)
  })
})
