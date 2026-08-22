import {
  assignableKey,
  compareScore,
  expand,
  moodState,
  quantiseDistance,
  resolveCharacter,
  resolveRecipe,
  sectionsFor,
  type Assignable,
  type AssignmentResult,
  type Character,
  type Device,
  type Recipe,
  type Role,
  type RoleRequest,
  type Score,
  type Template,
} from '../lib/core/index'
import { template } from './fixtures'

/**
 * Rig builders, `Score` readers and the brute-force oracle, shared by every test that searches.
 *
 * Not a test file: it registers nothing. It exists so `test/search.test.ts` and
 * `test/search-symmetry.test.ts` measure against the *same* independent oracle - two copies of
 * an oracle free to drift apart would be worse than one.
 */

// ---------------------------------------------------------------------------
// Rig fixtures - hand-authored boxes with known properties (§7.1)
// ---------------------------------------------------------------------------

export function makeRecipe(id: string, role: Role, character: Character, voice: string): Recipe {
  return {
    id,
    role,
    character,
    voice,
    title: `${character} ${role}`,
    params: [
      {
        kind: 'numeric',
        name: 'TUNE',
        value: 52,
        range: { min: 0, max: 100, verified: { kind: 'manual', source: 'fixture p.1' } },
      },
    ],
    verified: { kind: 'manual', source: 'fixture p.1' },
  }
}

export function box(id: string, over: Partial<Device>): Device {
  return {
    id,
    name: id,
    maker: 'Fixture',
    kind: 'drum-machine',
    clock: { canMaster: true, canSlave: true, transport: ['midi-din'] },
    io: { main: 'stereo', individualOuts: 2, audioIn: false, usbAudio: false },
    voices: [],
    recipes: [],
    ...over,
  }
}

export function request(over: Partial<RoleRequest> & Pick<RoleRequest, 'id' | 'role'>): RoleRequest {
  return {
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    ...over,
  }
}

/** A template with the given requests and a three-section structure. */
export function withRoles(roles: RoleRequest[], over: Partial<Template> = {}): Template {
  return template({ roles, patterns: [], hooks: [], ...over })
}

// ---------------------------------------------------------------------------
// The pre-symmetry-breaking search, as a device rather than as a flag
// ---------------------------------------------------------------------------

/**
 * Rewrite every pool on a device into `count` **fixed** voices carrying the same names, roles
 * and polyphony, with the pool's recipes duplicated once per member.
 *
 * This is how the search behaves *without* §7.1's symmetry breaking, and it is a better oracle
 * than a flag on `AssignInput` would be. A flag can only toggle a branch inside the code under
 * test — if the branch is wrong, both sides are wrong together. This produces a genuinely
 * different device that the production search treats without any special-casing: `poolId` is
 * `undefined` on a fixed voice, so `breakPoolSymmetry` has nothing to collapse and every
 * ordinal is explored as its own candidate, exactly as it was before the fix.
 *
 * The rewrite is faithful because `expand()` already flattens a pool into `voiceId`s of the
 * form `track-3` with the ordinal folded in (§2.2), so naming the fixed voices the same way
 * reproduces the same `Assignable`s down to the label — everything except the `poolId` and
 * `ordinal` fields, which nothing but the symmetry breaking reads. Recipes have to be
 * duplicated because lookup keys on `poolId ?? voiceId`, which is the whole reason one authored
 * pool recipe serves every ordinal; a fixed voice has to be given its own copy.
 *
 * **Every emitted recipe is renamed `${index}/${id}`, where `index` numbers the emitted voices
 * from zero — the device's own fixed voices included, not only the pool clones.** Two things
 * have to hold at once and only this scheme gives both for *arbitrary* ids, which is what
 * `RecipeSchema` permits (`z.string().min(1)` — punctuation, slashes, anything):
 *
 *  - **Order within a voice is preserved.** `scoreRecipes` breaks ties on recipe id by code
 *    unit (§7.2), so a rewrite that reorders ids changes which substitution wins. A *suffix*
 *    does exactly that: append `-1` to `a` and to `a!` and you get `a-1` and `a!-1`, which
 *    compare the other way round because '!' (0x21) sorts below '-' (0x2D). No separator fixes
 *    it — the id alphabet is unbounded, so some character always sorts below whatever is
 *    chosen. A *constant* prefix cannot reorder anything: the strings agree through the prefix
 *    and fall through to the original ids, whatever those ids are.
 *  - **Ids stay unique across voices.** `${index}/` is prefix-free, because '/' is not a digit:
 *    `1/` and `11/` first differ at position 1. Prefixing the untouched fixed voices too is the
 *    load-bearing half — leave them alone and a device whose fixed voice authors a recipe
 *    literally named `1/a` collides with the clone that pool member 1 is about to be given.
 *    With everything prefixed that recipe becomes `0/1/a` and nothing can reach it.
 *
 * `desugarPools` is round-tripped against the pooled device in `test/search-symmetry.test.ts`
 * rather than assumed - an oracle nobody checks is just a second opinion.
 */
export function desugarPools(device: Device): Device {
  if (!device.voices.some((voice) => voice.kind === 'pool')) return device

  const voices: Device['voices'] = []
  const recipes: Recipe[] = []
  // Numbers the voices this function emits, in emission order. Deterministic, and independent
  // of every authored string, which is what makes the renaming safe for any ids at all.
  let index = 0

  /** Re-home one authored recipe onto one emitted voice, under that voice's index. */
  function emit(recipe: Recipe, voiceId: string, voiceIndex: number): void {
    recipes.push({ ...recipe, id: `${voiceIndex}/${recipe.id}`, voice: voiceId })
  }

  for (const voice of device.voices) {
    const authored = device.recipes.filter((r) => r.voice === voice.id)

    if (voice.kind !== 'pool') {
      const voiceIndex = index++
      voices.push(voice)
      // Renamed even though this voice is not changing, so that a pool clone can never land on
      // an id a fixed voice already holds. See the block comment above.
      for (const recipe of authored) emit(recipe, voice.id, voiceIndex)
      continue
    }

    for (let ordinal = 1; ordinal <= voice.count; ordinal++) {
      const voiceIndex = index++
      const voiceId = `${voice.id}-${ordinal}`
      voices.push({
        kind: 'fixed',
        id: voiceId,
        label: `${voice.label} ${ordinal}`,
        roles: [...voice.roles],
        polyphony: voice.polyphony,
      })
      for (const recipe of authored) emit(recipe, voiceId, voiceIndex)
    }
  }

  return { ...device, voices, recipes }
}

// ---------------------------------------------------------------------------
// Reading a Score without hard-coding the miss-prefix length
// ---------------------------------------------------------------------------

export function keys(score: Score) {
  const v = score as unknown as number[]
  const tail = v.length - 5
  return {
    misses: v.slice(0, tail),
    crowdOverflow: v[tail] as number,
    optionalMisses: v[tail + 1] as number,
    recipeDistance: v[tail + 2] as number,
    roleFitPenalty: v[tail + 3] as number,
    idleDevices: v[tail + 4] as number,
  }
}

export function placement(result: AssignmentResult, requestId: string): string | undefined {
  const found = result.assignments.find((a) => a.requestId === requestId)
  return found === undefined ? undefined : assignableKey(found.assignable)
}

// ---------------------------------------------------------------------------
// §7.1 Optimality - brute force as the oracle
// ---------------------------------------------------------------------------

/**
 * An independent, deliberately naive enumeration of every legal assignment, scored by a
 * second implementation of §7.1's vector. It shares no code path with the search beyond the
 * public helpers, so a mistake in the bound cannot hide in both.
 *
 * It has no notion of pool symmetry, so it is also the oracle for the pruning: it enumerates
 * all eight ways to put a part on an eight-track pool, and the pruned search must still agree
 * with it on `Score`.
 */
export function bruteForceBest(devices: Device[], t: Template, seedlessMood = moodState()): Score {
  const owners = devices.flatMap((d) => expand(d).map((a) => ({ a, d })))
  const requests = [...t.roles].sort(
    (x, y) => x.priority - y.priority || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  )
  const maxPriority = requests.reduce((m, r) => Math.max(m, r.priority), 0)

  type Cand = { a: Assignable; distance: number; fit: number }
  const cands: Cand[][] = []
  const sections: string[][] = []
  for (const r of requests) {
    const want = resolveCharacter(r.character, seedlessMood)
    sections.push(sectionsFor(r, t))
    const list: Cand[] = []
    for (const { a, d } of owners) {
      if (!a.roles.includes(r.role)) continue
      if (a.polyphony < (r.polyphony ?? 1)) continue
      const res = resolveRecipe(d, a, r.role, want)
      if (res.outcome === 'unvoiced') continue
      list.push({ a, distance: quantiseDistance(res.distanceSq), fit: a.roles.indexOf(r.role) })
    }
    cands.push(list)
  }

  const chosen: (Cand | null)[] = new Array(requests.length).fill(null)
  const occupied = new Map<string, Set<string>>()
  let best: Score | undefined

  function score(): Score {
    const misses = new Array(maxPriority).fill(0)
    let optionalMisses = 0
    let recipeDistance = 0
    let roleFitPenalty = 0
    const byDevice = new Map<string, Set<string>>()
    requests.forEach((r, i) => {
      const c = chosen[i]
      if (c === null || c === undefined) {
        if (r.optional === true) optionalMisses++
        else misses[r.priority - 1]++
        return
      }
      recipeDistance += c.distance
      roleFitPenalty += c.fit
      const set = byDevice.get(c.a.deviceId) ?? new Set<string>()
      set.add(assignableKey(c.a))
      byDevice.set(c.a.deviceId, set)
    })
    let crowdOverflow = 0
    let idleDevices = 0
    for (const d of devices) {
      const total = expand(d).length
      const n = byDevice.get(d.id)?.size ?? 0
      crowdOverflow += Math.max(0, n - (d.comfortableVoices ?? total))
      // Every selected device, a voiceless one included (§7.1).
      if (n === 0) idleDevices++
    }
    return [
      ...misses,
      crowdOverflow,
      optionalMisses,
      recipeDistance,
      roleFitPenalty,
      idleDevices,
    ] as unknown as Score
  }

  function rec(i: number): void {
    if (i === requests.length) {
      const s = score()
      if (best === undefined || compareScore(s, best) < 0) best = s
      return
    }
    const r = requests[i] as RoleRequest
    for (const c of cands[i] ?? []) {
      const key = assignableKey(c.a)
      const used = occupied.get(key) ?? new Set<string>()
      if ((sections[i] ?? []).some((s) => used.has(s))) continue
      if (
        r.distinct === true &&
        requests.some(
          (other, j) =>
            j < i &&
            other.distinct === true &&
            other.role === r.role &&
            chosen[j]?.a.deviceId === c.a.deviceId,
        )
      ) {
        continue
      }
      const added = (sections[i] ?? []).filter((s) => !used.has(s))
      for (const s of added) used.add(s)
      occupied.set(key, used)
      chosen[i] = c
      rec(i + 1)
      chosen[i] = null
      for (const s of added) used.delete(s)
      if (used.size === 0) occupied.delete(key)
    }
    chosen[i] = null
    rec(i + 1)
  }

  rec(0)
  return best as Score
}
