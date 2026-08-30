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
    .assignments.flatMap((a) => a.assignables.map(assignableKey))
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
    const chosen = result.assignments.flatMap((a) => a.assignables.map(assignableKey))
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
        expect(once.assignments.flatMap((a) => a.assignables.map(assignableKey))).toEqual(
          twice.assignments.flatMap((a) => a.assignables.map(assignableKey)),
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
   * The case that decides whether the finding above is a product problem or a headroom problem,
   * and **the measurement deliverable of #78**. Every template the app can actually run still
   * searches exhaustively at the shipped cap, so no guide anybody generates today is a greedy
   * fallback — and the worst case is now asserted *with a margin* rather than merely bounded by
   * the cap, because a test that passes at 149,999 says nothing until the day it says everything.
   *
   * ## This test has fired once, and the warning it left was accurate
   *
   * It used to read: *"`industrial-techno` is the tight one at roughly 49.6k of 50k — under one
   * percent of room — so the next handful of recipes authored anywhere in the library tips it
   * over, and this is where that will be noticed."*
   *
   * It was one recipe, not a handful. Adding a single `sampled-chord` stab to the Tracker Mini
   * took the worst case over these seeds to 51,606 against the old 50,000 cap and dropped 8 of
   * those 24 cases to greedy — and the guide it degraded was worse in a way a reader would see:
   * the golden full rig's `pad` came out as a *substitution* (asked `dark`, got `soft`) under the
   * fallback, where the exhaustive answer is an exact `dark` match. `DEFAULT_NODE_CAP` was raised
   * to 150,000 rather than the content being dropped; the reasoning, the timing and the #78
   * stopgap framing are on the constant itself. **Raising it a third time is closed (#78).**
   *
   * ## Today's measurement: 18 devices, 7 directions, nothing capped, 11.6% left
   *
   * Worst case per direction, over seeds 0..23:
   *
   *     industrial-techno    132,615   seed 9     <-- the entire worst case
   *     ambient-dub           17,877   seed 0
   *     weave                  3,611   seed 12
   *     major-key-electro      2,308   seed 13
   *     lydian-house             310   seed 0
   *     relay                     28   seed 0
   *     drone-study               14   seed 0
   *
   * One direction is the whole problem and the gap to the second-worst is a factor of seven, so
   * "the worst case" in this file means `industrial-techno` and has for as long as the file has
   * existed. Registry prefixes never cap either, and the cost arrives in two steps rather than
   * accumulating: `roland-tr-8s` takes the prefix worst to 86,020 and `synthstrom-deluge` to
   * 132,615. The two mixers on the end of the registry add exactly nothing, having no voices.
   *
   * ## What eats the remaining 17,385 nodes: the one thing that was measured
   *
   * **Polyphony.** Measured by adding a synthetic nineteenth device to this registry — one fixed
   * voice, eleven tonal roles, seventeen recipes, no wider than the four Moog semi-modulars
   * already shipped — and varying nothing but its polyphony:
   *
   *     polyphony 1    caps, 24 of 168 rigs — every seed of industrial-techno
   *     polyphony 2    caps, 24 of 168
   *     polyphony 3+   42,421 worst case — a 68% *cut* below the 132,615 baseline
   *
   * So `polyphony: 3` and above **correlates with** a large drop rather than a rise, on this
   * probe, reproducibly — `npm run bench:search` prints the table.
   *
   * **Why it goes in that direction is an unproven hypothesis and is written down as one.** It
   * may be that a voice able to host several requests completes a strong solution early, giving
   * `liveFloor` a tighter incumbent to prune against, while a voice that can host one adds a
   * branch at every level and improves no incumbent — but that is read off node counts, no bound
   * was traced to confirm it, and invariant 5 does not stop applying because the subject is our
   * own engine. The `DEFAULT_NODE_CAP` comment says the same at more length.
   *
   * What the table does **not** license, and must not be read into it: that a device is expensive
   * for being wide, or that the cost tracks voice count. Neither was measured.
   *
   * On the question #135 deferred behind this issue: a Subharmonicon is six oscillators into one
   * filter and one VCA, which by this repo's own convention — the DFAM's "three sources are not
   * three voices", the Matriarch's paraphonic `polyphony: 4` — is one voice at `polyphony: 6`,
   * and the table above says that shape fits with room to spare.
   *
   * **That is now measured against the real manifest rather than the probe, and it holds.** The
   * Subharmonicon landed as one `polyphony: 6` voice over fourteen roles with nineteen recipes,
   * and the sweep moved 8,309 → 9,507, a rise of 14.4% for the twentieth device. Nothing capped,
   * the peak moved from `industrial-techno` seed 9 to `industrial-techno` seed 21, and the band
   * below moved with it. #135's own rule was to measure against what is actually authored,
   * because the Grandmother fit "on projection" using a DFAM-shaped clone and turned out
   * materially bigger; this time the projection and the measurement agree.
   */

  /**
   * The worst case measured on this tree, and a band around it.
   *
   * The band is the point of this test, not the cap. Asserting only `capped === false` passes at
   * 149,999, which is how this test came to fire on the strength of a single authored recipe: it
   * was true right up until it was catastrophic. Five percent either side fires while there is
   * still somewhere to go.
   *
   *  - **Over the ceiling** — something got more expensive. Re-measure, read the mono-voice
   *    paragraph above, and do not reach for `DEFAULT_NODE_CAP`; #159 and #160 are where the
   *    cost problem lives now.
   *  - **Under the floor** — something got cheaper. Good news, and a stale comment: re-measure,
   *    move the band down, and keep the alarm's sensitivity.
   *
   * **Moved twice for #78's matching repair**, and both are the "under the floor" case being
   * taken at its word.
   *
   * The first move: `liveFloor` learned that two remaining requests may be costed against one
   * voice and that §4.2 will not let both have it. `industrial-techno` seed 9 fell 165,785 →
   * 8,309, and the peak moved to `ambient-dub` seed 2 at 25,798 — read at the time as the one
   * direction the repair could do nothing for.
   *
   * **Moved a third time for the Subharmonicon**, and this one is the "over the ceiling" case
   * being read as what it is rather than as a regression: a device landed, the sweep grew 14.4%
   * to 9,507 on `industrial-techno` seed 21, nothing capped, and the band moved up to match. The
   * paragraph above is what says that is expected — the cost grows with recipes over tonal roles,
   * and this box adds nineteen recipes over fourteen roles.
   *
   * The second move says that reading was wrong. The repair was skipping `ambient-dub` because
   * its buckets were gated on `sustain === 'continuous'`, and one of the direction's nine
   * requests is transient; the gate is now §4.2's actual rule, that the members' sections
   * pairwise overlap, and `ambient-dub` seed 2 fell 25,798 → 759. So the peak is back on
   * `industrial-techno` seed 9 and the whole sweep dropped 3.1x more.
   *
   * Before all of it: 165,785, and `DEFAULT_NODE_CAP` was raised to 200,000 to clear it, which
   * the cap's own docstring records as a deliberate exception. The 165,785 is still pinned in
   * `test/search-matching-floor.test.ts` against the deliberately unrepaired floor, and the
   * per-direction rows in `test/search-bound.test.ts` watch every direction this band does not.
   *
   * **Moved a fourth time for the TR-6S**, the largest single-device move the band has taken:
   * 9,507 -> 19,066, a doubling, with the peak crossing from `industrial-techno` seed 21 to
   * `weave` seed 2. Nothing capped, and 19,066 is 13% of `DEFAULT_NODE_CAP`.
   *
   * The paragraph above predicts the shape of this and the size of it is worth a sentence
   * anyway, because the arithmetic is counter-intuitive: the TR-6S is the *smallest* drum
   * machine in the library, six voices against the TR-8S's eleven, and it costs more than the
   * Subharmonicon did. Six voices carrying fifteen roles between them means every voice is a
   * candidate for two to four requests and no request has an obvious home, which is precisely
   * the branching the search pays for. A box with more voices and the same roles spread thinly
   * across them is cheaper than a box with fewer voices each claiming several — so it is
   * `recipes x supported roles per voice` that this band tracks, and folder count says nothing.
   *
   * **Moved a fifth time for the MPC Live III**: 19,066 -> 21,368, a rise of 12.1%, with the peak
   * staying on `weave` and crossing from seed 2 to seed 10. Nothing capped, and 21,368 is 14% of
   * `DEFAULT_NODE_CAP`.
   *
   * A twelve-percent move from the largest box in the library is worth a sentence for the same
   * reason the TR-6S's doubling was, in the opposite direction. This device brings 20 recipes and
   * two pools of sixteen — more assignables than any other manifest — and costs an eighth of what
   * a six-voice drum machine did. Both facts are the same rule read twice: what the search pays
   * for is *ambiguity per request*, and a pool whose members are interchangeable is collapsed by
   * §7.1's symmetry breaking before the branching ever happens. Measured directly while this
   * device was being authored, a pool of 128 and a pool of 16 produce **identical** node counts.
   * So `count` is nearly free and it is the *roles per voice* that is not — which is why the two
   * pools here are split by what a fixed-note pad can actually carry rather than by convenience.
   *
   * **Moved a sixth time for the MPC XL**: 21,368 -> 26,688, a rise of 24.9%, with the peak
   * staying on `weave` and crossing from seed 10 to seed 16. Nothing capped, and 26,688 is 13.3%
   * of `DEFAULT_NODE_CAP`.
   *
   * This one measures the rule above rather than illustrating it, because the XL is the Live III
   * again: it takes that manifest's three pools and all nineteen of its recipes by reference, so
   * the two boxes present the same roles-per-voice to the search and differ only in identity and
   * hardware. A quarter more nodes for an exact duplicate is what symmetry breaking cannot reach,
   * since §7.1 collapses interchangeable members *within* a pool and two devices are never
   * interchangeable — they have different jacks, different individual-out counts and different
   * spans, all of which the objective can tell apart. The per-direction rows in
   * `test/search-bound.test.ts` show the same event with one direction going the other way.
   *
   * **Moved a seventh time for the OP-XY**: 26,688 -> 29,870, a rise of 11.9%, the peak staying
   * on `weave` and crossing from seed 16 to seed 3. Nothing capped, and 29,870 is 14.9% of
   * `DEFAULT_NODE_CAP`.
   *
   * A single pool of eight carrying all 23 roles and 18 recipes costs less than half what the
   * MPC XL's duplicate-of-a-duplicate did, which is the rule above holding a third time: what is
   * expensive is a *second box* the objective can tell apart, not a wide pool inside one. The
   * roles-per-voice here is the highest in the library — every track takes every engine, so
   * there is nothing to split the pool along — and it still lands under the Live III's arrival.
   *
   * **Moved an eighth time for the MPC One G2**: 29,870 -> 35,678, a rise of 19.4%, the peak
   * staying on `weave` and crossing from seed 3 to seed 9. Nothing capped, and 35,678 is 17.8%
   * of `DEFAULT_NODE_CAP`.
   *
   * The third MPC, and it costs almost as much as the second did (24.9%) for the same reason and
   * with the same lesson: it takes the Live III's three pools and all twenty of its recipes by
   * reference, retargeting only their citations, so it presents the search exactly the roles-per-
   * voice the other two do. The objective can still tell the three apart — this one has eleven
   * jacks where the Live III has nineteen, no individual outs where that box has four, and a 272
   * mm span against 436 — so symmetry breaking has nothing to collapse between them. **A device
   * that shares an engine is not a device the search gets for free**, and that is now measured
   * twice rather than argued once.
   */
  /**
   * The Muse, and the first time in a while that this number moved by more than a rounding.
   * 35,678 on `weave` seed 9 -> **55,825 on `industrial-techno` seed 5**, a 56% rise, and the
   * worst case changes direction as well as value.
   *
   * The cost is concentrated rather than spread, which is the useful part: `search-bound.test.ts`
   * records `weave` moving eighteen nodes across the same change, and `major-key-electro` getting
   * *cheaper*. What this box charges for is serving seven tonal roles from a pool of two timbres,
   * and `industrial-techno` is the direction that asks for the most of them at once — so the bill
   * arrives there and almost nowhere else. That is the growth curve §7.1 and the `DEFAULT_NODE_CAP`
   * docstring both describe: recipes multiplied by the roles a *direction* requests, not folder
   * count and not panel size.
   *
   * `DEFAULT_NODE_CAP` is **200,000**, so 55,825 is **27.9% of it and 72.1% headroom stands**.
   * (`.claude/skills/device-authoring/SKILL.md` still quotes the cap as 150,000 and a
   * ~12% headroom at eighteen devices; both figures pre-date #78's repair and the cap being
   * raised, and the constant in `lib/core/search.ts` is the one to read.)
   */
  /**
   * **The SP-404MK2 takes it to 67,088, on `industrial-techno` seed 10.** Up a fifth, and by a
   * different mechanism from the Muse's doubling above: this box declares one pool of sixteen
   * pads over the whole 23-role vocabulary and authors nineteen recipes across seventeen of them,
   * so the direction that asks for the most tonal roles at once gains sixteen ordinal-identical
   * candidates at every one of them. The cost lands where the paragraph above predicts it will,
   * and `search-bound.test.ts` records what the other six directions paid — between one node and
   * a seventh.
   *
   * The worst seed moves 5 -> 10 as well, which is the tie-break permuting among equal costs
   * (§7.2) rather than anything to read into.
   *
   * `DEFAULT_NODE_CAP` is 200,000, so 67,088 is 33.5% of it and 66.5% headroom stands.
   */
  /**
   * **The EP-133 takes it to 71,675, on `industrial-techno` seed 17.** Up 6.8%, and the
   * interesting part is how little it is: this box declares **forty-eight** pads over the whole
   * 23-role vocabulary — three times the SP-404MK2's pool above — and authors twenty-one recipes
   * across nineteen roles, and it costs a third of what the SP-404MK2's sixteen did.
   *
   * That is symmetry breaking doing exactly its job, and it was measured rather than assumed: the
   * same sweep run with this device's pool set to 12, 48 and 48-with-`comfortableVoices`-48 gives
   * **the identical node count in all three**. Pool *size* is free; what costs is the number of
   * distinct (role, character) recipes a direction can reach, which is the growth curve the two
   * paragraphs above describe. A future device should be sized against its recipe sheet, not
   * against how many slots it has.
   *
   * The worst seed moves 10 -> 17, which is the tie-break permuting among equal costs (§7.2).
   *
   * `DEFAULT_NODE_CAP` is 200,000, so 71,675 is **35.8% of it and 64.2% headroom stands**.
   */
  /**
   * **The MC-707 takes it to 132,559, on `industrial-techno` seed 4.** Up 78%, the largest jump
   * any single device has caused, and the mechanism is new: **it is not the device, it is the
   * pair.** Measured three ways on the same sweep —
   *
   * | registry | worst |
   * |---|---|
   * | MC-101 present, MC-707 absent (the baseline) | 74,415, `industrial-techno` seed 14 |
   * | MC-707 present, MC-101 removed | **74,415, the same seed and the same count** |
   * | both present | 132,559, seed 4 |
   *
   * Either box alone costs exactly what the other alone costs. Together they cost 78% more than
   * either, because this device's twenty recipes are the sibling's twenty retargeted — same
   * roles, same characters, same shape — so every request either can serve now has two candidates
   * of *exactly equal* cost, and equal costs are precisely what the seed permutes among (§7.2).
   * The two paragraphs above say pool size is free and what costs is distinct (role, character)
   * recipes; this adds the corollary they do not cover, which is that recipes distinct from each
   * other but *identical in cost across two devices* are the expensive kind. A near-clone sibling
   * is the worst case this search has, and #78 should read it that way rather than as one more
   * device's share.
   *
   * The worst seed moves 14 -> 4, the tie-break permuting among equal costs as before.
   *
   * `DEFAULT_NODE_CAP` is 200,000, so 132,559 is **66.3% of it and 33.7% headroom stands** —
   * the first time this figure has been over half the cap.
   */
  /**
   * **The Circuit Tracks takes it to 333,077, on `industrial-techno` seed 14.** Up 49%, the
   * second-largest jump any single device has caused and the largest since the MC-707's pair.
   *
   * Attributed by measurement, as the entries above are: the same sweep with this box removed and
   * everything else present gives 223,348 on seed 4, the previous row exactly.
   *
   * **The obvious explanation is measured and wrong**, which is the part worth carrying forward.
   * `search-bound.test.ts` records the MicroFreak's row as one contested role — `pad` — carrying
   * a whole device's cost, and the skill built on that row tells the next author to ask which of
   * their roles are already crowded. This box serves ten tonal roles from a pool of two, `pad`
   * among them, so it looked like the same story. It is not: the same sweep with `pad` dropped
   * from the synth pool **and** its recipe removed gives **329,531** on the same seed — 1.1% of
   * the rise — and leaves `weave` at 116,453, unmoved to the node.
   *
   * So the cost here is spread across the tonal roles rather than concentrated in one of them,
   * and both large directions move together (`weave` is up 48% alongside `industrial-techno`'s
   * 49%), which is the MC-707's pair-shaped row rather than the MicroFreak's single-role one.
   * **Two mechanisms have now produced comparable bills**, and a sizing pass that checks only for
   * a crowded role will miss this one.
   *
   * **This band no longer gates anything, and that is the change worth knowing.**
   *
   * It used to sit beside `expect(capped).toBe(false)`, which made the whole-catalogue sweep a
   * build gate. That gate fired on the RD-9 for being the thirty-fifth device rather than for
   * being expensive, and would have fired on every device after it — selecting all 35 boxes is a
   * benchmark nobody builds, and it grows by construction. The promise the cap makes is now
   * asserted where it is made, on rigs somebody could own, in the test below.
   *
   * What this band still does is make a jump **visible**. `npm run measure:search` prints the
   * figure with its headroom and warns under 2x, and since #247 a capped search says so in the
   * guide. If a rig a person could plausibly own ever approaches the cap, that is #248's trigger.
   *
   * (This paragraph read *"834,964 is 167% of `DEFAULT_NODE_CAP`, so the catalogue sweep does
   * cap"* until the figure below was re-recorded. That was written against the 500,000 constant
   * and outlived it by one commit — the same change that stopped this band gating anything raised
   * the cap to 2,000,000, which the sweep has never been near since.)
   *
   * ---
   *
   * **The RD-8 takes it *down*, to 718,179 on `industrial-techno` seed 16**, and it is the first
   * device to move this figure in that direction. Down 14.0%, with `weave` down 29.1% beside it;
   * `search-bound.test.ts` carries the row direction by direction and the attribution — the same
   * sweep without this box gives 834,964 on seed 10, the previous figure exactly.
   *
   * **The near-clone reading above does not apply to it, and that is the finding.** The MC-707
   * paragraph calls a near-clone sibling the worst case this search has, because that box's
   * twenty recipes were the MC-101's retargeted and every request either could serve gained a
   * second candidate of exactly equal cost. The RD-8 is the RD-9's chassis with the 808 voice set
   * — congas, claves, maracas and a cow bell against toms, a crash and a ride — so its nineteen
   * recipes carry different (role, character) pairs and the equal-cost pairing largely does not
   * form. A clone of the *product* is not a clone of the *cost*.
   *
   * 718,179 is 35.9% of `DEFAULT_NODE_CAP`, and 2.78x of headroom stands.
   *
   * ---
   *
   * **The NEUTRON takes it back up, to 843,270 on `industrial-techno` seed 0** — 17.4%, and the
   * seed moves with it, which is the ordinary shape of this figure rather than anything about
   * that box. It is a one-voice semi-modular with nineteen recipes over fourteen roles, so it is
   * the RD-8's opposite in the one way that matters to this number: where a near-clone's recipes
   * arrive as second candidates of exactly equal cost, these arrive as *new* candidates on roles
   * the library already crowds — `kick`, `sub` and `pad` among them, which
   * `search-bound.test.ts` has repeatedly found to be where the bill is.
   *
   * 843,270 is 42.2% of `DEFAULT_NODE_CAP`, and the headroom is **2.37x**. Nothing capped, and
   * `npm run measure:search` still prints above its 2x warning — but it is the first figure since
   * the constant moved to 2,000,000 to spend more than 40% of it, which is worth reading rather
   * than absorbing.
   *
   * ---
   *
   * **The MODEL D takes it back down, to 832,343 on `industrial-techno` seed 9** — the first
   * device in this record to *lower* the whole-catalogue worst case, and it does it while raising
   * every other figure in the table.
   *
   * Sixteen recipes over thirteen roles on one monophonic voice, so by the NEUTRON's reading this
   * is another box putting new candidates onto crowded roles, and every floor in
   * `search-bound.test.ts` rose accordingly. What the aggregate cannot show and that file can is
   * that the *peaks* of the two large directions fell — `industrial-techno` 843,270 -> 832,343
   * and `weave` 195,662 -> 179,584 — and that both moved their worst seed from 0 to 9. This box
   * gives §7.1 a cheap early solution on the seeds that used to be dearest, so the bound prunes
   * what those seeds used to walk. That is the non-monotonicity `DEFAULT_NODE_CAP` describes,
   * seen for the first time at the top of the table rather than on a small direction.
   *
   * **This is not a device being cheap and must not be read as one.** It is a device whose cost
   * lands somewhere other than where the previous maximum was, and the maximum is what this
   * paragraph reports. Sizing the next one off it would be the recipe-count error in a new
   * costume.
   *
   * 832,343 is 41.6% of `DEFAULT_NODE_CAP`, and the headroom is **2.40x**. Nothing capped.
   */

  /**
   * **The band moved to `test/search-bound.test.ts`, and the sweep that measured it is gone.**
   *
   * Everything above stays because it is the history of what the cap has cost, device by device,
   * and that record is the reason anybody can read a jump in a diff. What it no longer needs is
   * this file re-deriving the number: `search-bound.test.ts` walks the same 168 searches to pin
   * every direction and seed *exactly*, so a worst case computed here could only ever agree with
   * a table that is already checked, one direction at a time, against the live search.
   *
   * Two identical sweeps is what it was. 168 exhaustive searches over the whole registry is ~21M
   * nodes and roughly a third of the gate's cost, run twice for one number that the other run
   * already contains — and in August 2026 that duplication is what put three sweeps over their
   * timeouts on CI at once, with every assertion passing. The band is now derived from
   * `RECORDED` for free, and it is a strictly stronger test for it: a direction that moves
   * without moving the *worst* direction was invisible to the sweep and fails the table.
   */

  /**
   * §7.1. **The promise the cap actually makes, gated on the rigs it is made to.**
   *
   * The sweep above no longer asserts `capped === false`, and this is what replaced it. That
   * assertion had become a gate on device growth rather than on anything a reader experiences:
   * selecting the whole catalogue is a benchmark nobody builds, and it gets larger every time a
   * device lands — so it fired on the RD-9 for being the thirty-fifth box rather than for being
   * expensive, and would have fired again on the next three regardless of what they contained.
   *
   * What a person actually does is three to a dozen boxes, and there the search is nowhere near:
   *
   *     3 devices        43 nodes     1 ms
   *     5 devices     5,870 nodes    17 ms
   *     8 devices     1,867 nodes     6 ms
   *    12 devices     6,628 nodes    19 ms
   *    all 35       354,246 nodes   ~1.1 s   <- the only thing near the cap
   *
   * Three orders of magnitude. So this asserts the promise — a rig somebody could own is not
   * close to the ceiling — and it would still fail on a change that made a real rig expensive,
   * which is the regression worth catching.
   *
   * **The catalogue figure is tracked rather than gated**: `npm run measure:search` prints it with
   * its headroom and warns below 2x, and the band above still pins it within 5% so a jump is
   * visible in a diff. What it no longer does is stop a device landing.
   *
   * Two things had to be true before this was safe, and both are now: a capped search **says so**
   * in the guide since #247, so the silent-wrongness that made #228 urgent is reported rather than
   * hidden; and #235's script makes the trend a number somebody can watch. If a plausible rig ever
   * approaches the cap, that is #248's trigger and the dominance work is the answer — not another
   * zero on the constant.
   */
  it('keeps a rig somebody could own three orders of magnitude from the cap', async () => {
    const SIZES = [3, 5, 8, 12] as const
    /**
     * A rig of `size` boxes, varied by seed so the sweep is not one arbitrary set. Sorted by a
     * seeded key rather than shuffled, because §7.2 forbids `Math.random` anywhere the resolver
     * can see and a fixture that picks a different rig each run cannot be reasoned about.
     */
    const rigOf = (size: number, seed: number) =>
      [...DEVICES].sort((a, b) => (`${a.id}${seed}` < `${b.id}${seed}` ? -1 : 1)).slice(0, size)
    let worst = { nodes: -1, where: '' }

    for (const size of SIZES) {
      for (const template of TEMPLATES) {
        for (let seed = 0; seed < 10; seed++) {
          await new Promise((resolve) => setImmediate(resolve))
          const result = assign({ devices: rigOf(size, seed), template, mood: moodState(), seed })
          const where = `${size} devices, ${template.id} seed ${seed}`
          // The promise itself: never capped, never degraded to greedy, on a rig of this size.
          expect(result.search.capped, where).toBe(false)
          expect(result.search.method, where).toBe('exhaustive')
          if (result.search.nodes > worst.nodes) worst = { nodes: result.search.nodes, where }
        }
      }
    }

    // A tenth of the cap is a wide margin against a measured worst of ~6,600, and deliberately so:
    // this is a guard against a regression of a different order, not a second recorded band.
    expect(
      worst.nodes,
      `worst realistic rig is ${worst.nodes} nodes on ${worst.where}`,
    ).toBeLessThan(DEFAULT_NODE_CAP / 10)
  }, 120_000)

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
