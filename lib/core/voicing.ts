import type { Assignable, Device, Recipe } from './device'
import { compareCost, type Cost } from './search'
import { assignableKey, compareCodeUnits, expand } from './resolver'
import type { Character } from './vocabulary'

/**
 * §7.1. **The ranking a one-part surface uses, factored out of the two surfaces that use it.**
 *
 * §7.1's search allocates *several* parts to a rig at once, so its ordering is a `Score` over a
 * whole assignment: how many parts went unfilled, how crowded each box ended up, how many boxes
 * were left idle. A surface that resolves **one** part against a rig has none of that — there is
 * nothing to leave unfilled but this, no other part to crowd a box with, and `idleDevices` is the
 * rig minus whichever box wins, whichever that is. What survives is a total order over candidates,
 * and it is the order below.
 *
 * **It is `Score`'s, not `Cost`'s alone, and the difference is load-bearing.** `resolveRiff` was
 * first written on `compareCost` and got the one shape where the two disagree wrong: it took a
 * three-voice stack on a box comfortable with one voice where the search takes the one-voice chord
 * sample beside it. `crowd` has to rank *above* both chord keys, because that is where `Score`
 * puts it and where a stack's real price is charged.
 *
 * **Here rather than in `riff.ts`, because a second surface now asks the same question** (#520).
 * `resolveSample` resolves one sound against a rig and ranks its candidates for the same reason a
 * riff does — a reader handed a worse voice for the same sound, with nothing on the page saying
 * so, is the failure both are avoiding. Two copies of a comparator whose key order is an argument
 * settled in `DESIGN.md` §7.1 is two things to correct when that argument moves.
 *
 * Nothing here knows what the part *is*. A riff's candidate carries notes and a grid and a sample
 * target's carries neither; what they share is the four keys plus `crowd`, and that is exactly the
 * shape of this type.
 */
export type VoiceCandidate = Cost & {
  device: Device
  /**
   * The voices this candidate would occupy, in canonical order — one for an ordinary candidate,
   * `notes` of them for a chord spread across a pool (§12.4/#40). **Never empty**, and the
   * comparator below reads `[0]` as the tie-break key on that guarantee.
   */
  assignables: readonly Assignable[]
  recipe: Recipe
  /** The character actually authored, which is not always the one asked for (§3.5). */
  character: Character
  /**
   * §7.1's `crowdOverflow`, for this candidate alone. **Not part of `Cost`, and it could not be**:
   * in the search a crowd figure is a sum over every device of an assignment in progress, so it is
   * a property of where everything else landed rather than of one candidate. With one part and no
   * other occupancy the sum collapses to this one device, which is what makes it askable here.
   */
  crowd: number
}

/**
 * §7.1/§2.3. **What this candidate costs a box that is comfortable with fewer voices.**
 *
 * `comfortableVoices ?? expand(device).length` is `buildCtx`'s own rule, restated rather than
 * imported because the search holds it in a `Ctx` map built for a whole rig and a template.
 *
 * A stacked triad counts three, which #40 named as the thing not to soften: three tracks really
 * are spent, and a part that costs as much as three parts is a true statement about a monophonic
 * box. That is where a stack's real price is charged, and charging it is the whole reason this key
 * has to rank above the two chord keys.
 */
export function crowdOf(device: Device, taken: number): number {
  return Math.max(0, taken - (device.comfortableVoices ?? expand(device).length))
}

/**
 * §7.1/§7.2. **The winning candidate, or `undefined` where there are none.**
 *
 * The order is total and carries no seed, and both halves of that are deliberate. A seed permutes
 * only among *exactly equal* costs (§7.2), and nothing here is exactly equal: after `crowd` and
 * `compareCost` the first voice's key separates two voices, and the recipe's id separates two
 * recipes on one voice. Same rig, same bytes, on any platform (invariant 6).
 *
 * Code unit comparison, never `localeCompare` — §7.2's rule, and the one a tie-break is most
 * likely to break silently.
 */
export function bestVoiceCandidate<C extends VoiceCandidate>(
  candidates: readonly C[],
): C | undefined {
  return [...candidates].sort(
    (a, b) =>
      /*
       * §7.1's own key order, in full for a one-part assignment.
       *
       * `crowdOverflow` first, because `Score` puts it above both chord keys and `stackedChords`'
       * own note says that is where a stack's real cost is charged. Then `compareCost`, which is
       * `search.ts`' — sampled chord, then stacked, then character distance, then role fit.
       *
       * The keys of `Score` that are not here cannot separate two candidates for one request: the
       * miss counts and `optionalMisses` are zero for anything that fills it, and `idleDevices` is
       * the rig minus the one box the winner lands on, whichever candidate wins.
       */
      a.crowd - b.crowd ||
      compareCost(a, b) ||
      compareCodeUnits(
        assignableKey(a.assignables[0] as Assignable),
        assignableKey(b.assignables[0] as Assignable),
      ) ||
      compareCodeUnits(a.recipe.id, b.recipe.id),
  )[0]
}
