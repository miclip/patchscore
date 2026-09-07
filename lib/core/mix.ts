import type { SectionName } from './ids'
import type { ResolveResult, ResolvedAssignment } from './pipeline'
import type { Role } from './vocabulary'

/**
 * §8/#264. **Tuning parts against each other**, which is mix work rather than a parameter.
 *
 * #263 split in two. The half about a *box* — warm up the analog gear, touch up the ones with a
 * tuning routine — landed in #269 and lives in `pipeline.ts` beside `warmUpNotices`, because it
 * is a fact about hardware. This is the other half, and it is a different thing in every way
 * that matters: getting the kick's fundamental to sit with the bass rather than fight it is a
 * judgement about how two parts sound *against each other*, made while listening.
 *
 * **The first draft of #264 was arithmetic and it was wrong.** Read `song.key`, find a `TUNE`,
 * print "tune the kick to the root". That reading disqualified 60 of the 77 tune parameters in
 * the library, because you cannot compute a semitone offset from `TUNE = -96` or from `30 %
 * travel`, and inventing the mapping is what invariant 5 forbids. The sound-engineering reading
 * disqualifies none of them: *listen to the kick's tail against the sub* is real, actionable
 * guidance on a box printing `-96`, and the boxes with no absolute unit are exactly the ones
 * whose reader needs it most, since their own panel will not answer the question either.
 *
 * So **nothing here reads a parameter** — not its name, not its value, not its unit. There is no
 * `TUNE` in this file and there must not be one. What it derives is which two parts the reader
 * has to listen to together and what the direction already decided about their pitch; the
 * knob they reach for is theirs to find, and every guide already prints its settings a phase
 * earlier.
 *
 * Like `arrangement.ts`, `fx.ts` and `sidechain.ts` this module derives and renders nothing.
 * Both renderers read it, so "this rig has a low end to balance" is decided once and the two
 * guides cannot come to disagree about it (#33). The ink is each renderer's own.
 */

/**
 * One side of the pair: the box the reader is standing at to hear it.
 *
 * **One field, and the shortness is deliberate** (#264). This carried the request id, the device
 * id, the part's pitch, its hook and its `followsKey` for one revision, none of which any renderer
 * said — a model surface built for a sentence nobody had written yet. Model fields are cheap to
 * add back when a renderer needs one; a field kept *in case* is a claim two renderers can start
 * reading differently with nothing asserting what it means.
 *
 * The **role** is not among them either. Which part is the kick and which is the sub is what the
 * two field names on `LowEndPairing` say, so carrying the words as data would let a renderer
 * print `sub` out of `kick`. Both renderers write the two words themselves.
 */
export type LowEndPart = {
  /** The box carrying it. Named in the instruction because the reader has to walk to it. */
  deviceName: string
}

/**
 * §8/#264. The kick and the sub of this guide, and the one section to judge them in. Facts only:
 * no sentence, and no verdict about whether they clash — nobody here has heard them.
 */
export type LowEndPairing = {
  kick: LowEndPart
  sub: LowEndPart
  /**
   * **Both parts out of one box**, so the instruction names it once — *the Tracker Mini's kick
   * and sub* rather than the same box twice. Decided here rather than by each renderer comparing
   * the two names for itself, which is the #33 rule: a fact one of them derives alone is a fact
   * the two can come to disagree about.
   */
  sameDevice: boolean
  /**
   * The key everything else resolved against, or `undefined` for a direction authoring none
   * (§7 step 10). **Carried, and deliberately not a gate.** Under the arithmetic reading a
   * missing key ended the sentence; under this one it removes one clause, because the
   * instruction is to listen to two parts against each other and neither needs a key to have a
   * pitch.
   */
  key: string | undefined
  /**
   * §4.2/§6.3. **The section to loop while doing this** — the busiest one both parts occupy.
   *
   * A judgement about how two parts sit together is made while listening, so the guide has to
   * name a place to listen. The busiest shared section is that place: it is where the low end is
   * most crowded and where a clash is audible, and judging it in an intro that plays half the
   * arrangement is judging the easy case.
   *
   * Highest `energy` in `template.structure` wins, ties going to the earlier section in authored
   * order — a comparison of numbers the direction wrote and an index, so it is the same on every
   * platform (§7.2, invariant 6). Never a *band*: §6.3's bands are what the reader programs, and
   * this is a section they loop.
   */
  listenIn: SectionName
}

/**
 * §4.4. The **dominant** request of a role: lowest `priority` number wins (1 is most important),
 * and equal priorities fall to `requestId` in UTF-16 code unit order (§7.2).
 *
 * A template may request one role twice, so "the kick" needs deciding rather than assuming. The
 * priority key is the direction's own statement of which part matters more; the id tie-break
 * decides nothing musical and exists only so the answer is the same on every platform.
 */
function dominant(
  assignments: readonly ResolvedAssignment[],
  role: Role,
): ResolvedAssignment | undefined {
  let best: ResolvedAssignment | undefined
  for (const assignment of assignments) {
    if (assignment.role !== role) continue
    if (best === undefined) {
      best = assignment
      continue
    }
    if (assignment.priority < best.priority) best = assignment
    else if (assignment.priority === best.priority && assignment.requestId < best.requestId) {
      best = assignment
    }
  }
  return best
}

/** The busiest section both parts occupy, or `undefined` where they never sound together. */
function listenIn(
  result: ResolveResult,
  kick: ResolvedAssignment,
  sub: ResolvedAssignment,
): SectionName | undefined {
  const inKick = new Set(kick.sections)
  const inSub = new Set(sub.sections)
  let best: { name: SectionName; energy: number } | undefined
  for (const section of result.template.structure) {
    if (!inKick.has(section.name) || !inSub.has(section.name)) continue
    // Strictly greater, so a tie keeps the section authored first (§7.2).
    if (best === undefined || section.energy > best.energy) {
      best = { name: section.name, energy: section.energy }
    }
  }
  return best?.name
}

function part(assignment: ResolvedAssignment): LowEndPart {
  return { deviceName: assignment.deviceName }
}

/**
 * §8/#264. The kick and the sub, **only when the guide resolved both and they meet somewhere**.
 *
 * `undefined` where either is missing, and that covers more cases than it looks: a direction that
 * asks for no sub, a rig with nothing that can carry one, a part that became a §7.3 shortfall.
 * All three mean the same thing to the reader — there is no second part in the low end to balance
 * this one against — and inventing one to have something to say is invariant 5.
 *
 * `undefined` too where the two never share a section. A transient sub that plays only the Drop
 * and a kick that stops before it do not meet, and an instruction to loop a section and listen to
 * both describes a moment the arrangement does not contain. That is the same rule one step on:
 * the guide is silent rather than approximate.
 *
 * Pure and deterministic: a function of the resolved result, reading no clock, no random source
 * and no locale-dependent comparison (§7.2, invariant 6).
 */
export function lowEndPairing(result: ResolveResult): LowEndPairing | undefined {
  const kick = dominant(result.assignments, 'kick')
  const sub = dominant(result.assignments, 'sub')
  if (kick === undefined || sub === undefined) return undefined
  const section = listenIn(result, kick, sub)
  if (section === undefined) return undefined
  return {
    kick: part(kick),
    sub: part(sub),
    sameDevice: kick.deviceId === sub.deviceId,
    key: result.song.key,
    listenIn: section,
  }
}
