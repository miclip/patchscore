import type { DeviceId, RecipeId, RequestId } from './ids'
import type { ResolveResult, ResolvedAssignment } from './pipeline'
import type { Role } from './vocabulary'

/**
 * §8/#487. **The rig already contains the sound the guide is telling the reader to go and find.**
 *
 * A recipe that declares `sourceAudio` is sending its reader off to source audio the voice does
 * not generate (§3/#101). That instruction is right on its own terms and can be wrong about the
 * room it is read in: in 47% of the two-box rigs in the library, the *other* box authors a recipe
 * for the very same role that needs nothing loaded — most often the kick, which is the one
 * somebody feels. The reader is told to go and find a kick while a box on the same desk has an
 * authored kick patch with cited values on it.
 *
 * Both halves already exist and neither knows about the other: `sourceAudio` is a fact about a
 * recipe, and what else the rig holds is a fact about the guide. **The join is the whole of this
 * module**, and it is a join over `Role` — no new vocabulary (invariant 3), no device naming a
 * genre, no template naming a box.
 *
 * Like `arrangement.ts`, `fx.ts`, `sidechain.ts` and `mix.ts` this derives and renders nothing.
 * Both renderers read it, so *this rig can make that part* is decided once and the two guides
 * cannot come to disagree about it (#33). The ink is each renderer's own, and where the sentence
 * goes is not settled here.
 *
 * **Nothing here is read off a page** (invariant 4). It is derived from the rig the reader
 * assembled and the direction they chose, which is the register the clock source, the sidechain
 * reading and #264's tuning block already occupy — all of them free to name boxes, all of them
 * silent where they do not apply, none of them carrying a citation.
 *
 * Pure and deterministic: a function of the resolved result, reading no clock, no random source
 * and no locale-dependent comparison (§7.2, invariant 6).
 */

/** The part the guide is sending the reader shopping for, and the box it landed on. */
export type InRigDestination = {
  /**
   * Which part, and not merely which role. A direction may request one role twice (§4.4), so a
   * renderer that wants to point at the row this is about needs the request rather than the role
   * it happens to carry.
   */
  requestId: RequestId
  deviceId: DeviceId
  deviceName: string
}

/**
 * The box that can make it instead, and the patch to make it with.
 *
 * The recipe is carried because #478 turned those patches into something a reader can open: the
 * device page prints them, so the sentence can point at a named patch rather than at a box and a
 * hope. `deviceId` is what a renderer builds the link out of — `deviceHref` lives in
 * `lib/studio`, above this layer, and core does not reach up into it.
 */
export type InRigMaker = {
  deviceId: DeviceId
  deviceName: string
  recipeId: RecipeId
  /** The patch's own title, so the prose names what it is rather than repeating the role. */
  recipeTitle: string
}

/**
 * §8/#487. One pairing for the whole rig: a part to sample, and the box beside it that can play
 * that part from scratch.
 */
export type InRigSource = {
  /** The role both sides answer. Shared by construction — the pairing is a join on it. */
  role: Role
  destination: InRigDestination
  maker: InRigMaker
}

/** With the keys the choice is made on, which are not the renderer's business. */
type Candidate = { pick: InRigSource; priority: number }

/** §7.2. Code units, never ICU collation — the tie-break has to be the same on every platform. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The one role that jumps the queue. Named here rather than inlined so the choice is a thing the
 * tests can point at, and so nothing reads it as a list that wants extending — a second entry
 * would be a ranking of roles, which is a musical claim nobody has made.
 */
const PREFERRED_ROLE: Role = 'kick'

/**
 * §7.2/#487. **Which pairing gets said, when the rig offers several.**
 *
 * A rig can offer many — the measurement counts 8,077 parts across the library's two-box rigs —
 * and naming them all would be a list nobody standing at a rack reads. So one is chosen, and the
 * rule is stated rather than left to whichever the loops reached first.
 *
 * **`kick` first**, and it is a musical judgement rather than a count. It is the part a reader
 * hears the substitution in most plainly, it is the part every direction in the library asks for,
 * and a sampled kick is the case the issue was reported from. It also happens to be the second
 * most frequent pairing in the library, which is corroboration and not the argument.
 *
 * After that the **direction's own statement of what matters** — `priority`, 1 being most
 * important — which is the same key `lowEndPairing` reaches for and for the same reason: it is
 * the only ranking of parts anybody authored. Everything below it decides nothing musical and
 * exists so the answer is byte-identical everywhere (invariant 6): role, then the box the part
 * landed on, then the box that could make it, then the patch.
 *
 * The request id is the last key and is not in #487's stated order. It is a strict refinement:
 * every comparison the order above settles is settled the same way, and it only closes the case
 * the others leave open — one role requested twice, both parts on one box at equal priority,
 * which `lowEndPairing`'s `dominant` shows is a shape the library's directions really have.
 * Without it the answer would fall back to assignment order, which is deterministic today and
 * is not a rule anybody wrote down.
 */
function precedes(a: Candidate, b: Candidate): boolean {
  const kick = (c: Candidate) => (c.pick.role === PREFERRED_ROLE ? 0 : 1)
  if (kick(a) !== kick(b)) return kick(a) < kick(b)
  if (a.priority !== b.priority) return a.priority < b.priority
  const keys: [string, string][] = [
    [a.pick.role, b.pick.role],
    [a.pick.destination.deviceId, b.pick.destination.deviceId],
    [a.pick.maker.deviceId, b.pick.maker.deviceId],
    [a.pick.maker.recipeId, b.pick.maker.recipeId],
    [a.pick.destination.requestId, b.pick.destination.requestId],
  ]
  for (const [left, right] of keys) {
    const order = byCodeUnit(left, right)
    if (order !== 0) return order < 0
  }
  return false
}

/**
 * §8/#487. The pairing this rig offers, or `undefined` — which is the answer for 53% of the
 * library's two-box rigs and every one-box rig.
 *
 * **Exact pairs only.** The maker's recipe has to be for the same role, and it has to need
 * nothing loaded: a box whose own kick recipe also declares `sourceAudio` is a second reader
 * sent shopping, not an answer. Nothing here approximates — no nearby role, no "close enough"
 * character, no box that might manage it. A sentence telling somebody their rig can make a part
 * it cannot is worse than saying nothing (invariant 5).
 *
 * **Never the same box.** A part is not sourced in-rig by the machine it is already on: the
 * claim is that the reader can walk to a second box, build the sound and sample it back, and on
 * one box there is no walk and no second voice to build it with. That also makes a one-box rig
 * silent by construction; the length check above states it anyway, because a rig-wide sentence
 * read at a rack the reader can see the whole of is #144's failure and worth refusing twice.
 *
 * Whether the maker's voice is *free* in this guide is deliberately not asked. The reader is
 * being told to build a sound and sample it in — a thing they do before the arrangement exists,
 * on a box whose parts they can load again afterwards — so an occupied voice is no obstacle to
 * it. Asking would silence the case the issue is about, which is a rig busy enough that the
 * sampler got the kick in the first place.
 */
export function inRigSource(result: ResolveResult): InRigSource | undefined {
  if (result.devices.length < 2) return undefined
  let best: Candidate | undefined
  for (const assignment of result.assignments) {
    if (assignment.recipe.sourceAudio === undefined) continue
    for (const device of result.devices) {
      if (device.id === assignment.deviceId) continue
      for (const recipe of device.recipes) {
        if (recipe.role !== assignment.role) continue
        if (recipe.sourceAudio !== undefined) continue
        const candidate: Candidate = {
          priority: assignment.priority,
          pick: {
            role: assignment.role,
            destination: destination(assignment),
            maker: {
              deviceId: device.id,
              deviceName: device.name,
              recipeId: recipe.id,
              recipeTitle: recipe.title,
            },
          },
        }
        if (best === undefined || precedes(candidate, best)) best = candidate
      }
    }
  }
  return best?.pick
}

function destination(assignment: ResolvedAssignment): InRigDestination {
  return {
    requestId: assignment.requestId,
    deviceId: assignment.deviceId,
    deviceName: assignment.deviceName,
  }
}
