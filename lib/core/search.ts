import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import type { Character, MoodState, Role } from './vocabulary'
import { realisationOf, sharedAs } from './device'
import type { Assignable, Device, Recipe, ResourceSpec } from './device'
import type { RoleRequest, Template } from './template'
import {
  assignableKey,
  canCarryNotes,
  canStackNotes,
  compareCodeUnits,
  expand,
  poolWidth,
  resolveCharacter,
  resolveRecipe,
  sectionsFor,
  stackRecipes,
} from './resolver'
// §7.2's one seeded stream, shared with §4.1's hook and key choice. See `seed.ts`.
import { hash32, seededShuffle } from './seed'

/**
 * §7.1. Assignment is a bounded search over a lexicographic objective.
 *
 * Greedy highest-priority-first piles everything onto whichever device scores well per-role in
 * isolation — the TR-1000 wins kick, snare, hat *and* sub while the Deluge sits idle. The
 * problem is tiny (<= ~20 requests, <= ~8 devices), so it is searched rather than guessed.
 *
 * **`unvoiced` neither fills nor occupies.** A request whose only reachable assignables have no
 * usable recipe (§3.5) is *not* a candidate: it counts as a miss and reserves no voice. An
 * unvoiced request produces no part — no step programming, no sound design, nothing to render —
 * so letting it hold a voice is strictly harmful. Consider an LT serving `sub`, `bass-mid` and
 * `tom` where `sub` is unvoiced and `bass-mid` has a real recipe: if unvoiced filled, `sub`
 * would take the LT and `bass-mid` would become the miss, which is plainly the worse guide.
 *
 * The distinction §3.5 cares about is a *reporting* distinction, and it is recovered in the
 * gap's `reason` (§7.3) rather than in the objective — a `no-recipe` gap names the assignables
 * that could have carried the part, which is the useful half of treating unvoiced as filled
 * with none of the cost.
 */

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type Assignment = {
  requestId: RequestId
  role: Role
  /** The character asked for, after §6.2 resolved the template pinning against mood. */
  character: Character
  /**
   * §4.2/§12.4/#40. **The voices carrying this part, and there may be more than one.** One for
   * every part that fits on a single voice; `polyphony` of them, all from one pool on one device,
   * for a chord stacked one note per voice.
   *
   * Plural rather than one-plus-an-optional-rest, and that is the point of the shape: a renderer
   * that reads `assignables[0]` and stops has written a bug a reviewer can see, where one reading
   * `assignable` and ignoring a `stackedWith` beside it would have printed one track of three and
   * looked complete. Never empty, and in the canonical order the reader should enter them in —
   * lowest note to the lowest voice.
   */
  assignables: readonly Assignable[]
  /** Every member of `assignables` is on this device: a stack never spans two boxes (§12.4). */
  deviceId: DeviceId
  recipe: Recipe
  /** Never 'unvoiced' — an unvoiced request is a gap, not an assignment. */
  outcome: 'exact' | 'substituted'
  /** The character actually authored, which for 'substituted' is not the one asked for. */
  recipeCharacter: Character
  /** The sections this request occupies on each of `assignables` (§4.2). */
  sections: SectionName[]
}

/**
 * §7.3. Three reasons, because the reasons exist to tell the user what to *do* and there are
 * exactly three actions: buy something, wait for us to author something, or change the
 * arrangement. A fourth top-level reason would split the third action into cases that all
 * resolve the same way, which is why the sub-cause of `no-room` is a field and not a sibling.
 */
export const GAP_REASONS = ['no-capable-voice', 'no-recipe', 'no-room'] as const
export type GapReason = (typeof GAP_REASONS)[number]

/**
 * Why the objective ranked some other allocation higher. `no-room` rather than
 * `rig-too-small` deliberately: crowding is often fixed by raising `comfortableVoices` rather
 * than by buying anything, and the name must not prejudge which.
 *
 * `resource` (§2.3/#25) is the one cause here that is **not** the objective ranking something
 * else higher: the box has a free voice and cannot load another patch into it. It sits under
 * `no-room` all the same, because the reader's question is the same one and so are their three
 * actions — the room that ran out is behind the voices rather than among them.
 */
export const NO_ROOM_CAUSES = ['contended', 'crowding', 'distinct', 'resource'] as const
export type NoRoomCause = (typeof NO_ROOM_CAUSES)[number]

/**
 * §7.3, §12.4. `no-capable-voice` used to mean one thing — "nothing in your rig covers this" —
 * and once a recipe could reach a note count its voice cannot (§12.4), that stopped being true
 * of half the cases. A rig full of monophonic tracks *does* play pads; it cannot play three
 * notes at once. Told the old sentence, a reader goes shopping for a pad machine when what they
 * need is one chord sample, or a template that asks for one note.
 *
 *  - `no-such-role` — no assignable in the rig declares the role at all. The original meaning,
 *    and the only one where buying a box is the answer.
 *  - `polyphony` — voices declare the role, and none can reach the requested note count by any
 *    realisation they have authored (§12.4).
 */
export const NO_CAPABLE_VOICE_CAUSES = ['no-such-role', 'polyphony'] as const
export type NoCapableVoiceCause = (typeof NO_CAPABLE_VOICE_CAUSES)[number]

type GapBase = {
  requestId: RequestId
  role: Role
  character: Character
  priority: number
  optional: boolean
  /**
   * The assignables that **could have carried this part**, and only ever that. For 'no-recipe',
   * every one of them — "your TR-1000 BD can do it, dial it by ear". For 'no-room', the ones
   * that could have and did not get it. Empty for both causes of 'no-capable-voice', including
   * `polyphony`, where the voices declare the role and still could not carry it — those are on
   * `roleVoices` instead, precisely so this field does not have to mean two things.
   */
  capable: readonly Assignable[]
}

/**
 * `because` and `detail` live on the variants that have them rather than being optional
 * everywhere, so it is a type error to build a gap without saying what gave way — the same
 * discipline as `ResolvedParam.provenance` being non-optional (§3.1). `no-recipe` carries
 * neither, and that is not an omission: there is exactly one way to have no recipe.
 */
export type Gap =
  | (GapBase & {
      reason: 'no-capable-voice'
      because: NoCapableVoiceCause
      /** §12.4. Simultaneous notes asked for. 1 unless the request said otherwise. */
      notes: number
      /**
       * For `polyphony`: the assignables that declare the role and cannot reach `notes`. Empty
       * for `no-such-role`, where by definition there are none.
       *
       * Deliberately *not* folded into `capable`, which means one thing everywhere — "could
       * have carried this part" — and these could not. The renderer needs them to say how far
       * short the rig falls without guessing.
       */
      roleVoices: readonly Assignable[]
    })
  | (GapBase & { reason: 'no-recipe' })
  | (GapBase & { reason: 'no-room'; because: NoRoomCause; detail: string })

/**
 * §7.3/#81. **What an absence means, above why the search produced it.**
 *
 * `reason` answers "why did this part not get made", which is a fact about the allocation.
 * `kind` answers the question a reader actually has — *is my track missing something, and whose
 * job is the fix* — and the two are not the same axis. One word carried all three answers and
 * one list rendered them, so a groovebox that had just been handed eight parts of a finished
 * techno track was told it had four holes: one of them our unwritten recipe and three of them
 * garnish the direction never needed.
 *
 *  - `rig-limit` — the rig cannot make this part, by role, by note count, or because something
 *    else won the voice. Permanent and honest, and the only kind a reader can act on by
 *    changing hardware or arrangement.
 *  - `unauthored` — a voice here could carry it and nobody has written the recipe. **Ours**, and
 *    it must never read as a limit of the reader's box (§3.5, #31).
 *  - `not-needed` — the direction declared it is still itself without this part (§4.4). Not a
 *    hole: the track is finished.
 *
 * `not-needed` wins over the other two where both apply, and that ordering is the fix rather
 * than a shortcut. A direction saying the song is complete without a pad has answered the
 * reader's question — nothing is missing — whatever the search then found about voices. Nothing
 * is lost by it: the `Gap` fields survive underneath, so a `not-needed` shortfall still records
 * `no-recipe` for anyone counting the authoring backlog.
 */
export const SHORTFALL_KINDS = ['rig-limit', 'unauthored', 'not-needed'] as const
export type ShortfallKind = (typeof SHORTFALL_KINDS)[number]

/**
 * A gap plus what it means. `rationale` is on the one kind whose account is **authored** rather
 * than computed: the other two carry mandatory `because`/`detail`/`roleVoices` already, and
 * "the song does not need this" is a musical claim only a person can make. Required on the
 * variant rather than optional everywhere, so a template cannot dismiss a part with a shrug —
 * the same discipline as §2.6's evidence states and `ResolvedParam.provenance`.
 */
export type Shortfall =
  | (Gap & { kind: 'rig-limit' })
  | (Gap & { kind: 'unauthored' })
  | (Gap & { kind: 'not-needed'; rationale: string })

/**
 * The three kinds, narrowed. Shared by both renderers — unlike the sentences they print, which
 * §8 keeps written out twice on purpose, a filter has no wording to drift.
 */
export function shortfallsOfKind<K extends ShortfallKind>(
  shortfalls: readonly Shortfall[],
  kind: K,
): Extract<Shortfall, { kind: K }>[] {
  return shortfalls.filter((s): s is Extract<Shortfall, { kind: K }> => s.kind === kind)
}

/**
 * §7.3. Pure in `(gap, request)`: the kind is a reading of the search's finding against the
 * direction's own declaration, and nothing about the rig enters that reads the other way round
 * (invariant 3).
 */
export function shortfallOf(gap: Gap, request: RoleRequest): Shortfall {
  if (request.inessential !== undefined) {
    return { ...gap, kind: 'not-needed', rationale: request.inessential.reason }
  }
  if (gap.reason === 'no-recipe') return { ...gap, kind: 'unauthored' }
  return { ...gap, kind: 'rig-limit' }
}

/**
 * §7.5/#340. **Where the reader put a part**, overriding §7.1's ranking for that one request.
 *
 * Keyed by `requestId` and never by role: a direction may request one role twice, which is the
 * same reason `Occupancy` is keyed by request (§4.2). A placement keyed by role could not say
 * which of the two pads it meant.
 *
 * It names a **device and not a voice**. Which ordinal of a pool a part lands on is a
 * device-model detail a reader has no reason to reason about, and the objective already places
 * within a box sensibly.
 */
export type Placement = {
  requestId: RequestId
  deviceId: DeviceId
}

/**
 * §7.5/#340. Why a placement was not applied. Every one of these leaves the ranking standing —
 * a refused placement is dropped, never obeyed and never half-obeyed, exactly as a clock source
 * the box cannot send is (§7.4/#200).
 *
 *  - `unknown-request` — the direction has no such request. A stale link, or one hand-written.
 *  - `device-not-in-rig` — the box is not among the effective devices. The other stale case.
 *  - `cannot-serve` — the box is here and cannot make this part: no voice for the role, no way
 *    to sound the notes, no recipe near enough the character (§3.5), or nowhere to load the patch
 *    even standing empty (§2.3/#25). The `detail` says which, because "why is my box not on the
 *    list" is a useful thing to be able to tell a reader about their own rig (#329/#334) rather
 *    than a shrug. Nothing renders it yet — see §7.5 on where phase 1 stops.
 *  - `conflicted` — it could not hold at the same time as the placements that outrank it. See
 *    `resolvePlacements` for what outranks what, and why it cannot be array order.
 */
export const PLACEMENT_REFUSALS = [
  'unknown-request',
  'device-not-in-rig',
  'cannot-serve',
  'conflicted',
] as const
export type PlacementRefusal = (typeof PLACEMENT_REFUSALS)[number]

/** The placement as asked for, plus what became of it. */
export type RefusedPlacement = Placement & {
  because: PlacementRefusal
  /** A sentence about *this* rig, in §7.3's register — see `Gap.detail`. */
  detail: string
}

/**
 * §7.5/#340. **What the reader asked for and what the resolver did with it.**
 *
 * A result of its own rather than a `Shortfall`, and that is the point of the type: a shortfall
 * says a part was not made, and a refused placement usually means the opposite — the part is
 * there, it is simply not where it was asked for. Folding one into the other would tell a reader
 * their track has a hole in it because they picked the wrong box for a part they can hear.
 *
 * Both lists are in the canonical order `resolvePlacements` sorts into, never the caller's.
 */
export type PlacementReport = {
  /**
   * The placements the search was run under, and **honoured**: each of these requests is filled,
   * on the device named here. The search cannot decide otherwise — the candidates elsewhere are
   * gone before it starts, and a placed request has no miss branch to fall through.
   *
   * That is what makes it a placement rather than a preference, and it is paid for by the rest
   * of the allocation: a part the reader did not place may lose its voice, or go unfilled, even
   * where §4.4 ranks it higher. The guide reports that as an ordinary §7.3 shortfall, which is
   * the trade being visible rather than the placement being ignored.
   */
  accepted: readonly Placement[]
  refused: readonly RefusedPlacement[]
}

/** §7.1: "If the cap is hit, fall back to the greedy result **and log it** — no silent truncation." */
export type SearchReport = {
  /** Nodes visited before the search finished or hit the cap. */
  nodes: number
  nodeCap: number
  capped: boolean
  method: 'exhaustive' | 'greedy'
}

export type AssignmentResult = {
  assignments: Assignment[]
  occupancy: Occupancy
  score: Score
  /**
   * §7.3. Every request that produced no part, each tagged with what its absence means. There
   * is deliberately no `gaps` field beside this one: a list of unfilled requests under that
   * name is what let three meanings render as one, and a reader of this type now has to say
   * which of them it is talking about.
   */
  shortfalls: Shortfall[]
  /**
   * §7.5/#340. What became of the reader's placements. Empty lists for the guide that asked for
   * none, which is every guide before #340.
   */
  placements: PlacementReport
  search: SearchReport
}

/**
 * §7.1. The cap is a **latency guard, not a correctness bound**: hitting it does not make an
 * answer wrong, it swaps the exhaustive answer for the greedy one and says so in `SearchReport`.
 * So the number is not "how big can the problem get" but "how long are we willing to wait before
 * degrading", for a search that runs once when somebody presses generate.
 *
 * **50,000 was chosen when the library had three devices, and it stopped being generous.** Raised
 * to 150,000 on the measurement below, which is a **stopgap and was filed as one — see #78**, the
 * issue arguing that raising the cap treats the symptom and buys time until the next device. It
 * was right three times. What it said would actually fix this is a tighter *bound* — the suffix
 * floor admits branches a sharper admissible estimate would prune — and that is bound work, not
 * a constant. **That is what finally happened; the last section below is the measurement.** The
 * history between here and there is left standing rather than tidied away, because every raise
 * in it was made against the same argument and the record of being wrong three times is the
 * useful part.
 *
 * The measurement, on the tree that raised it:
 *
 *  - 361 nodes/ms on the machine it was timed on.
 *  - Worst case across six seeds of `industrial-techno` on the full rig: **86,722 nodes**, about
 *    240 ms here and low single-digit seconds on a phone.
 *  - 150,000 covers that with ~73% headroom, at roughly 415 ms here in the pathological case.
 *    A wider sweep (40 seeds x 3 templates) tops out at 88,596, so ~41% headroom against the
 *    worst seen anywhere rather than against the case that forced the raise.
 *
 * **The growth curve is recipes x roles, not folder count**, and that is the number for whoever
 * picks up #78 to size against. The full *twelve*-device rig measured 33,142 nodes worst case on
 * this template, uncapped. Adding one device — 19 recipes over 6 tonal roles — took seed 18 to
 * 86,722. A device that can serve many roles adds branching at every level of the search, so
 * sizing the bound against how many boxes are in `lib/devices/` would size it against the wrong
 * variable.
 *
 * **Re-measured at #40, and the headroom is down to 18%.** A sweep of 24 seeds x every template
 * on the full rig tops out at **110,288** nodes before stacking and **127,125** after it, both on
 * `industrial-techno` seed 18 — so multi-assignable stacking costs about 15%, and the library
 * having grown since the figures above costs a great deal more. The cap is deliberately *not*
 * raised again here: #78 is the issue arguing that raising it treats the symptom, it has been
 * right twice, and a third raise on the back of a feature commit is exactly how a stopgap becomes
 * the design. What the number means practically is that the next device of any size may push a
 * worst-case seed into the greedy fallback — which `SearchReport` reports rather than hides, and
 * which is the signal #78 should be picked up on.
 *
 * ## That signal fired, and #78 was picked up rather than the cap raised again
 *
 * The Moog DFAM did it: one voice and fifteen role-slots, *smaller* than the TR-1000's twenty-six,
 * and it took `industrial-techno`'s worst seed from 108,608 nodes to **195,951**. Every seed of
 * that template capped — 24 of the 168 rigs in a sweep of seven templates by twenty-four seeds —
 * and greedy was strictly worse on all 24, losing `recipeDistance` 0 against 1,414: the exhaustive
 * answer gives every one of the twelve parts an exact character and the fallback does not.
 *
 * The cap did **not** move, and trimming the device was measured and rejected: with a single role
 * it still took the same seed to 148,372, so the smallest voice-bearing device the schema allows
 * had consumed the remaining headroom. The bound was the problem, exactly as the paragraph above
 * said it would be. `liveFloor` replaced the static suffix floor and the same sweep now tops out
 * at **66,155 nodes with nothing capped** — a 66% cut on the worst case, and the whole sweep runs
 * in about four and a half seconds.
 *
 * ## Re-measured for #78 at eighteen devices, and the headroom is 11.6%
 *
 * Seven shipped directions x seeds 0..23, 168 rigs, **nothing capped**. The worst case is
 * `industrial-techno` seed 9 at **132,615** nodes, and it is the whole of the worst case — the
 * second-worst direction is `ambient-dub` at 17,877, a factor of seven below it.
 * `test/search-symmetry.test.ts` asserts the 132,615 inside a five-percent band, so the next move
 * in it is loud while there is still somewhere to go, rather than silent until the cap.
 *
 * **The one thing measured about what closes the remaining 17,385 nodes is polyphony.** The probe
 * in `scripts/bench-search.ts` adds a nineteenth device — one fixed voice, eleven tonal roles, no
 * wider than the Moog semi-modulars already shipped — and varies nothing but `polyphony`:
 *
 *     polyphony 1    caps, 24 of 168 rigs — every seed of industrial-techno
 *     polyphony 2    caps, 24 of 168
 *     polyphony 3+   42,421 worst case — a 68% *cut* below the 132,615 baseline
 *
 * So `polyphony: 3` and above **correlates with** a large drop rather than a rise, on this probe,
 * reproducibly: `npm run bench:search` prints the table.
 *
 * **Why it goes in that direction is an unproven hypothesis, and is recorded here as one.** The
 * plausible reading is that a voice able to host several requests completes a strong solution
 * early, giving `liveFloor` a tighter incumbent to prune against, while a voice that can host one
 * adds a branch at every level and improves no incumbent. That is inferred from node counts. It
 * has not been instrumented, no bound was traced to confirm it, and invariant 5 does not stop
 * applying because the subject is our own engine rather than a rendered guide. Whoever picks up
 * the bound work should treat it as the first thing to confirm or refute, not as a premise.
 *
 * ## Where the nodes actually go, measured — and it is not redundant work
 *
 * #159 proposed two ways to make this search cheaper and both are now closed by measurement.
 * Decomposition first (`npm run bench:decomposition`, #163): the nineteen-device rig is one
 * branching component at every point of the mood grid, so splitting the requests never fires on
 * the rig that costs the time. Memoising on canonical state second, and that one is worth
 * reading carefully, because the promising number was misleading.
 *
 * `npm run bench:search-shape` divides the nodes. On `industrial-techno` seed 9, the worst case
 * as it stood *before* the matching repair below:
 *
 *     visited   165,785
 *     bounded   143,270   86.4%   abandoned by `lowerBound` on arrival, never expanded
 *     expanded   22,515
 *     leaves          7   complete assignments reached, in the whole run
 *
 * The same probe measures **65.9%** of those nodes arriving at a canonical state already seen,
 * which reads like an argument for a cache. It is not. Those are repeated arrivals at *pruned*
 * states, not at solved sub-problems — a cache of completions has almost nothing to answer them
 * with when the run produces seven completions. Built and measured directly, a state memo saved
 * **0.4%** of nodes at **2.2x** the wall clock, and disagreed with the traversal wherever the cap
 * fired on one side and not the other, which is an invariant 6 failure and blocks it regardless
 * of speed. The prototype is at `origin/spike/search-memo-measured`; it is deliberately not in
 * the tree, because unreachable code that is known to disagree with the search is a hazard in the
 * file people read to understand the search.
 *
 * Every direction sits between 82% and 90% bounded, so this is the shape of the search rather
 * than one direction's accident.
 *
 * **So the cost is `lowerBound`, evaluated at nodes that never expand**, and anything meant to
 * make this cheaper should be measured against that. A sharper bound prunes the same nodes
 * earlier; a cheaper one pays less per node for the same pruning; either attacks the 86%. Caching
 * and splitting attack the 14%, which is why neither paid.
 *
 * What does not follow from the table above, and must not be read into it: that a device is
 * expensive for being wide, or that the cost tracks voice count. Neither was measured here.
 * Sizing the next device means running the probe against its actual shape, and the answer if it
 * does not fit is a tighter bound rather than a third raise of the constant below.
 *
 * ## The third raise, made anyway, and what was measured before making it
 *
 * The paragraph above says the answer is a tighter bound rather than a third raise. **This is
 * the third raise**, 150,000 to 200,000, and it is recorded as the deliberate exception it is
 * rather than slipped in — the argument against it has been right twice and is not retracted.
 *
 * What made it defensible here is a number the previous two raises did not have. A capped search
 * reports the cap, not its true cost, so "it capped" says nothing about how far past the line the
 * work goes. Re-run with the cap lifted to 20,000,000, the nineteenth device's worst case is:
 *
 *     industrial-techno, seed 9, nineteen devices    165,785 nodes    463 ms
 *     the same sweep at eighteen devices             132,615 nodes    361 ms
 *
 * **A 10% overshoot of the old constant, not a blow-up.** The DFAM went to 195,951 against a
 * 150,000 cap and every seed of the template capped; this is one template, nine of twenty-four
 * seeds, and 102 ms. 200,000 clears the measured worst case by 21%.
 *
 * The cost is latency and it is small here — but it is **not** small on the device §8 and §10
 * say this is read on. Resolution runs client-side and 463 ms on this laptop is plausibly two
 * seconds or more on a mid-range phone. Nobody has measured that, and it is the cheapest useful
 * measurement left.
 *
 * This buys time and nothing else. #159 records why the cost stopped tracking difficulty — node
 * count is non-monotonic, and forcing `industrial-techno`'s two polyphonic requests to one note
 * each *raises* the eighteen-device worst case to 147,280 — and #160 asks whether the search
 * should be a solver rather than a hand-rolled bound. Neither is closed by this constant moving.
 *
 * ## The tighter bound arrived, and every figure above it is now historical
 *
 * `liveFloor` gained the one-step matching repair described in its own docstring: two remaining
 * requests are routinely costed against the same voice, and §4.2 will not let both have it, so
 * the floor charges the cheaper escape for all but one of them. On `industrial-techno` seed 9,
 * the case that forced the third raise:
 *
 *     visited     8,309   was 165,785      20.0x fewer
 *     bounded     7,348   88.4%            was 143,270 at 86.4%
 *     expanded      961                    was 22,515
 *     leaves          7                    unchanged, and it was always seven
 *     wall clock   19.6 ms                 was 384.1 ms, interleaved on one machine
 *
 * The worst case across the whole 168-search sweep went from 165,785 to 25,798, and it moved off
 * `industrial-techno` to `ambient-dub` seed 2 — read at the time as the direction the repair
 * could do nothing for, its contested voices always being free to break.
 *
 * **That reading was wrong, and correcting it took the sweep to 8,309.** The buckets were gated
 * on `sustain === 'continuous'` rather than on §4.2's actual rule, and one of `ambient-dub`'s
 * nine requests is transient — so it stood outside every bucket and the repair fired nowhere on
 * that direction. The gate is now whether the members' sections pairwise overlap, which is what
 * §4.2 has always said, and `ambient-dub` seed 2 fell 25,798 → 759. `industrial-techno` seed 9 is
 * the worst case again, at the 8,309 above, so the cap clears the measured worst case by **24x**
 * rather than 21%.
 *
 * **It is deliberately not lowered.** The argument that a cap is a latency guard has not changed,
 * the headroom costs nothing while nothing reaches it, and moving a constant that is not binding
 * would only have to be moved back. What has changed is which signal to watch: a capped run is
 * now a long way from ordinary, and `test/search-symmetry.test.ts`'s five-percent band around
 * 8,309 fires long before the cap does.
 *
 * Two things above are superseded rather than merely dated, and are marked here rather than
 * deleted. The 86.4%-bounded table is pre-repair — the shape survived, at 88.4%, so "the cost is
 * `lowerBound` at nodes that never expand" still holds and is still where work should aim. And
 * the polyphony probe's 132,615 baseline belongs to the floor before both #78's live version and
 * this repair; the hypothesis it raised is untouched by any of this and is still unconfirmed.
 *
 * Neither #159's non-monotonicity nor #160's solver question is closed by this either. What is
 * closed is #78's own claim, which was that the bound rather than the constant was the problem.
 */
/**
 * §7.1/#78/#248. **A backstop against pathology, and no longer a proxy for anything else.**
 *
 * The cap is counted in nodes because invariant 6 requires the same inputs to stop in the same
 * place on every machine; a wall-clock cap would not. What it is *for* has been re-derived twice
 * and this note is the third and, with luck, last statement of it.
 *
 * **What a person actually does, measured at 35 devices:**
 *
 *      3 devices        43 nodes     1 ms
 *      5 devices     5,870 nodes    17 ms
 *      8 devices     1,867 nodes     6 ms
 *     12 devices     6,628 nodes    19 ms
 *     all 35       834,964 nodes   ~2.6 s
 *
 * Three orders of magnitude between a rig somebody owns and the whole catalogue, and the
 * catalogue is a benchmark rather than a rig. So the cap protects nobody from the first four rows
 * — it exists for a shape of problem none of them is.
 *
 * **2,000,000, and the reason is not headroom for the catalogue.** At 500,000 the catalogue swept
 * past the cap when the thirty-fifth device landed, which degraded that resolve to greedy and
 * broke a dozen fixtures that use "every device" as a convenient rich rig. Raising it keeps those
 * honest. It changes nothing for a real rig, which is 300x away either way.
 *
 * **What stops this being the "another zero" #248 warns against** is that the thing which used to
 * gate on this constant no longer does. `search-symmetry.test.ts` asserted the whole-catalogue
 * sweep stayed under the cap, which made every new device a coin toss against a benchmark — it
 * fired on the RD-9 for being the thirty-fifth box rather than for being expensive. That gate now
 * asserts the promise where the promise is made: a rig of three to twelve boxes stays under a
 * tenth of the cap. A change that made a *real* rig expensive still fails; a device that merely
 * makes the catalogue bigger no longer does.
 *
 * The catalogue figure is tracked instead, by `npm run measure:search`, which prints it with its
 * headroom and warns under 2x. And #247 means a capped search now says so in the guide, so the
 * silent-wrongness that made #228 urgent is reported rather than hidden.
 *
 * **If a rig somebody could plausibly own ever approaches this, do not raise it again.** That is
 * #248's trigger, and the answer there is a dominance rule that makes near-clone branching cheap —
 * near-clone pairs are what the search actually pays for, and no constant fixes that.
 */
export const DEFAULT_NODE_CAP = 2_000_000

// ---------------------------------------------------------------------------
// §7.1 The objective
// ---------------------------------------------------------------------------

/**
 * Smaller is better; compare element by element, first difference decides. Both vectors come
 * from the same template and therefore have the same length — the miss prefix is sized by the
 * template's highest priority, not by the outcome, so the shape does not move between two
 * candidate solutions.
 */
export function compareScore(a: Score, b: Score): number {
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const left = a[i] ?? 0
    const right = b[i] ?? 0
    if (left !== right) return left < right ? -1 : 1
  }
  return 0
}

/**
 * §7.1: `recipeDistance` is the only non-integer input and is quantised before it enters the
 * vector, so the comparison stays exact and cannot drift across platforms (invariant 6).
 *
 * The squared distances that reach here are 0, 1, 2 or 3 — every character component is in
 * {-1, 0, 1} and §3.5 refuses anything at 4 — so the root is taken on a handful of small
 * integers and the x1000 rounding leaves an enormous margin.
 */
export function quantiseDistance(distanceSq: number): number {
  return Math.round(Math.sqrt(distanceSq) * 1000)
}

// ---------------------------------------------------------------------------
// Precomputation
// ---------------------------------------------------------------------------

/**
 * §7.1. The four keys a candidate contributes that are properties of the *candidate* rather than
 * of where the rest of the assignment landed, in `Score` order. Shared by `Candidate` and
 * `StackPlan` so the suffix bound can take a lexicographic minimum over both without either
 * having to be materialised into the other.
 */
type Cost = {
  /**
   * §12.4. 1 when a request needing more than one note is being filled from a chord sample
   * rather than a real polyphonic voice. A one-note request is never charged: the recipe's
   * realisation makes no difference to it, and `scoreRecipes` does not rank on it there either.
   */
  sampledChord: number
  /**
   * §12.4/#40. 1 when the notes are spread across several voices of one pool rather than sounded
   * by one voice. Ranked below `sampledChord` — see `Score.stackedChords` for why that way round.
   */
  stacked: number
  distance: number
  /** §7.1: the role's index within `voice.roles`. An authoring hint, ranked accordingly. */
  roleFit: number
}

type Candidate = Cost & {
  /**
   * The voices this candidate occupies, in canonical order. One for an ordinary candidate,
   * `notes` for a stack (§12.4/#40) — and never empty.
   */
  assignables: readonly Assignable[]
  keys: readonly AssignableKey[]
  /** Shared by every member: a stack is one pool on one device. */
  deviceId: DeviceId
  recipe: Recipe
  outcome: 'exact' | 'substituted'
  recipeCharacter: Character
}

/**
 * §12.4/#40. A stack, before it knows *which* members it gets.
 *
 * Everything the objective charges a stack for is a property of the `(device, pool, role,
 * character)` it belongs to and not of the ordinals it ends up on — recipes key on `poolId`
 * (§2.2), and so therefore do `distance`, `outcome` and `roleFit`. So the plan is precomputed
 * once per request per pool exactly like a single candidate, and only the member list is chosen
 * at the node, where occupancy is known. See `materialiseStacks`.
 */
type StackPlan = Cost & {
  deviceId: DeviceId
  poolId: string
  /** Every member of the pool, in `comparePoolMembers` order. */
  members: readonly Assignable[]
  /** Simultaneous notes the request asked for, which is how many members a stack takes. */
  width: number
  recipe: Recipe
  outcome: 'exact' | 'substituted'
  recipeCharacter: Character
}

type Ctx = {
  template: Template
  devices: readonly Device[]
  deviceById: Map<DeviceId, Device>
  /** Every selected device, in the order the caller passed them. */
  deviceIds: DeviceId[]
  comfortable: Map<DeviceId, number>
  /**
   * §2.3/#25. The resources each device declares, by id. **Absent for every device that declares
   * none**, which is nearly all of them — so the ordinary rig produces an empty map and every
   * resource check below short-circuits on the recipe's own `consumes` before it is ever read.
   */
  resources: Map<DeviceId, Map<string, ResourceSpec>>
  requests: RoleRequest[]
  wanted: Character[]
  sections: SectionName[][]
  /**
   * Every assignable that declares the role, and nothing else asked of it. Kept apart from
   * `capable` so §7.3 can tell "your rig does not play pads" from "your rig plays pads one note
   * at a time" — two different sentences, and only the first is fixed by buying a box.
   */
  roleOnly: Assignable[][]
  /**
   * What the *rig* can carry, before character or occupancy: the role fits and the assignable
   * can reach the request's note count (§12.4), either on its own polyphony or through a
   * `sampled-chord` recipe this device authors for that voice.
   */
  capable: Assignable[][]
  /** Capable, and with a usable recipe. The candidate pool before occupancy and `distinct`. */
  voiceable: Candidate[][]
  /**
   * §12.4/#40. Stack plans per request — one per `(device, pool)` that can spread this request's
   * notes across its members. Empty for every one-note request, and for every pool whose own
   * polyphony already covers the count (`canStackNotes` refuses that as strictly dominated).
   *
   * Kept apart from `voiceable` rather than folded into it because a plan is not yet a candidate:
   * which members it gets depends on occupancy, so it is materialised per node.
   */
  stacks: StackPlan[][]
  /** Devices a request could legally occupy, ignoring occupancy — for the idle lower bound. */
  suffixReach: Set<DeviceId>[]
  /**
   * §4.2/§7.1. **Which pairs of requests could collide.** `overlap[a * n + b]` is 1 when
   * requests `a` and `b` occupy at least one section in common and 0 when their sections are
   * disjoint, with `n = requests.length`. Symmetric, and the diagonal is 1 exactly when the
   * request occupies any section at all.
   *
   * §4.2 says conflict is same section, same assignable, so two requests may share one voice
   * precisely where this is 0 — which is the premise `liveFloor`'s matching repair rests on.
   * Materialised once per `assign` because it is a function of the template alone; asking it at
   * a node would mean intersecting two section lists per pair per node.
   *
   * `sectionsFor` hands a continuous request every section in the structure, so a continuous
   * request overlaps everything that occupies anything, itself included; a transient one
   * overlaps only where its list actually meets another's. The degenerate case needs no rule of
   * its own: a request that occupies nothing intersects nothing, so its whole row is 0 — its
   * diagonal included — and the pairwise rule already keeps it out of every bucket.
   */
  overlap: Uint8Array
  /**
   * Per request, the assignable each `ladder` entry occupies, as an index into the rig's
   * assignables. Parallel to `ladder`, so the repair can ask "same voice?" with an integer
   * compare rather than by re-deriving an `AssignableKey` at every node. `-1` for a stack, which
   * takes several and is never bucketed.
   */
  ladderSlot: Int32Array[]
  /**
   * The cheapest the *remaining* requests can possibly be on the additive keys. `suffixFloor[i]`
   * covers requests i..n-1, and `suffixFloor[n]` is all zeroes so the leaf bound stays exact.
   *
   * Kept as the static fallback and as the thing `liveFloor` is measured against. See
   * `ladder` below for why it stopped being the bound the search actually uses.
   */
  suffixFloor: SuffixFloor[]
  /**
   * §7.1/#78. Each request's candidates, **pre-sorted into the order `cheapestCandidate` picks
   * from**, so the live floor can take the first one still free instead of re-minimising.
   *
   * The sort is total and deterministic — the four cost keys, then `deviceId`, then `voiceId` by
   * code unit (§7.2) — because a ladder whose order depended on input order would make the bound,
   * and therefore the node count, depend on it too.
   */
  ladder: readonly Candidate[][]
  /**
   * The lexicographic cheapest stack plan per request, or `undefined`. Stacks stay static in the
   * floor: which members a plan gets is decided per node, so testing one for freeness here would
   * mean materialising it, and treating it as always available is the *optimistic* direction —
   * which is the safe one for a lower bound.
   */
  stackFloor: readonly (Cost | undefined)[]
  /**
   * `liveFloor`'s working arrays, allocated once per `assign` rather than once per node.
   *
   * The one mutable thing on `Ctx`, and it is spelled as scratch rather than hidden among the
   * precomputed tables so nobody reads a value out of it expecting it to mean something. It is
   * written and read within a single `liveFloor` call and carries nothing between them; the
   * search is one recursion on one thread and `liveFloor` does not call itself, so there is no
   * second writer. Entries below `from` are stale by construction and never read.
   */
  scratch: FloorScratch
  /**
   * §7.5/#340. The device each request was **placed** on by the reader, or `undefined` where the
   * reader said nothing — which is every request of every guide that placed none.
   *
   * Parallel to `requests`, and it carries the accepted placements only. It does two jobs the
   * candidate filter cannot do on its own: it tells `search` which requests may not take the miss
   * branch, and it tells `greedy` which ones to settle before it starts, since neither of those
   * is a statement about candidates.
   */
  placedOn: readonly (DeviceId | undefined)[]
  /**
   * §7.1/#78. Whether `liveFloor` applies the matching repair. **Always true in `assign`**, and
   * false only through `measureAssignWithoutMatchingRepair`, which exists so a test can run the
   * pre-repair floor and diff the two whole results.
   *
   * Not an option on `AssignInput`: a caller has no business choosing a weaker bound, and the
   * two paths must not be able to disagree about which one shipped. It gates the repair block
   * wholesale rather than threading a condition through the arithmetic, so the `false` path is
   * the floor as it stood before the repair existed and not a second implementation of it.
   */
  repair: boolean
  missSlots: number
  seed: number
  nodeCap: number
}

/**
 * §7.1's relaxed suffix bound: what the requests not yet decided must cost *at least*, on the
 * keys that only ever grow. Precomputed once per `assign`, because none of it depends on the
 * partial assignment.
 *
 * The relaxation drops occupancy, crowding and `distinct` — every remaining request is costed
 * against its full static candidate list as though the rest of the tree did not exist. That can
 * only *widen* each request's option set, so the per-request minimum can only fall, and a floor
 * built from it stays below anything the search can actually reach.
 */
/** See `Ctx.scratch`. Indexed by absolute request index throughout. */
type FloorScratch = {
  /** The cheapest free option, or `null` for a request with none — a forced miss. */
  cost: (Cost | null)[]
  /**
   * The assignable that option occupies when it is a single voice, as an index into the rig.
   * `-1` for a stack, which takes several, and for a request with no option at all.
   */
  slot: Int32Array
  /** Its position in the ladder, so the alternative can resume from just past it. */
  at: Int32Array
  /** The cheapest option that does *not* occupy `slot`, or `null` for a miss. */
  alt: (Cost | null)[]
  /** Where that alternative's miss falls in `Score` order. See `compareGiveUp`. */
  rank: Int32Array
  /** The bucket being repaired, as request indices in ascending order. See `liveFloor`. */
  members: Int32Array
  /**
   * Which requests a bucket has already claimed in this pass, so no request is charged its
   * escape twice. Cleared over `from..n` when the repair block runs, and meaningless outside it.
   */
  bucketed: Uint8Array
}

type SuffixFloor = {
  misses: readonly number[]
  optionalMisses: number
  sampledChords: number
  stackedChords: number
  recipeDistance: number
  roleFitPenalty: number
}

/**
 * The cheapest single option for one request, **chosen lexicographically rather than key by
 * key**, and the distinction is the whole reason this bound is worth anything.
 *
 * Independent per-key minima — lowest `sampledChord` anywhere, lowest `distance` anywhere,
 * lowest `roleFit` anywhere — would also be admissible, because componentwise `<=` implies
 * lexicographic `<=`. It would also be *weaker*: it lets three different candidates each donate
 * their best key to a hybrid no candidate offers. The lexicographic minimum is a real option,
 * sits componentwise above that hybrid, and is still a valid floor, because lexicographic order
 * on non-negative integer vectors is compatible with addition — if `a <=lex b` and `c <=lex d`
 * then `a + c <=lex b + d`. So summing per-request lexicographic minima bounds the sum of
 * whatever the completion actually picks.
 *
 * A request with candidates never prefers the miss branch here: missing costs a whole point on
 * `misses` (or `optionalMisses`), and both of those outrank every key a candidate can charge.
 * So the choice is only ever "the best candidate, or a forced miss when there are none".
 */
function cheapestCandidate(candidates: readonly Cost[]): Cost | undefined {
  let best: Cost | undefined
  for (const candidate of candidates) {
    if (best === undefined) {
      best = candidate
      continue
    }
    if (candidate.sampledChord !== best.sampledChord) {
      if (candidate.sampledChord < best.sampledChord) best = candidate
      continue
    }
    if (candidate.stacked !== best.stacked) {
      if (candidate.stacked < best.stacked) best = candidate
      continue
    }
    if (candidate.distance !== best.distance) {
      if (candidate.distance < best.distance) best = candidate
      continue
    }
    if (candidate.roleFit < best.roleFit) best = candidate
  }
  return best
}

/**
 * §7.1/#78. **The floor, recomputed against the occupancy the search has actually built.**
 *
 * `buildSuffixFloor` costs every remaining request against its *static* candidate list, with
 * occupancy dropped. That is admissible and it was, by the time the library reached sixteen
 * devices, very nearly vacuous on the key that decides these searches. `roleFitPenalty` is the
 * role's index within `voice.roles`, and with sixteen boxes almost every role sits at index 0 on
 * *some* box — so the static floor let all twelve remaining requests take a zero simultaneously
 * and contributed nothing. The optimum for `industrial-techno` is 17. A bound of 0 against an
 * optimum of 17 prunes nothing, which is why the node count grew the way it did.
 *
 * **What makes the live version admissible is that occupancy only ever grows.** `apply` adds to
 * it and `undo` removes exactly what it added, so within one descent nothing a request cannot
 * reach now becomes reachable deeper. Every completion of this partial state must therefore fill
 * each remaining request from a candidate that is free *now*, and the cheapest of those is a
 * floor on what that request will pay. Restricting a minimisation's domain can only raise the
 * minimum, so this floor is `>=lex` the static one term by term — and lexicographic order on
 * non-negative integer vectors is compatible with addition, so it is `>=lex` summed. It is a
 * strictly better bound and never a wrong one.
 *
 * **A request with nothing free is charged an outright miss**, and that is the other half of the
 * gain. The static floor could only charge a forced miss when a request had no candidates at
 * all; this one charges whenever they have all been taken, on `misses`, the key that outranks
 * everything below it.
 *
 * Two deliberate optimisms, both the safe direction for a lower bound: `distinct` (§12.6) is not
 * consulted, and stack plans are costed as though their members were free. Ignoring a constraint
 * can only widen a request's options and lower its minimum.
 *
 * ## The one-step matching repair
 *
 * Taking each request's cheapest option independently is a relaxation, and the thing it relaxes
 * is that the remaining requests are competing for the *same voices*. Two of them can both be
 * costed against the Deluge's first synth track, and on `industrial-techno` two of them usually
 * are: 58.5% of the calls on that direction have at least one such collision that is not free
 * to break. So the floor is repaired one step, at exactly the collisions §4.2 forbids.
 *
 * **The exclusion, and it is one rule.** §4.2: two requests may share an assignable exactly when
 * their sections are **disjoint**, because conflict is same section, same voice. So a bucket is a
 * set `B` of remaining requests whose cheapest option is the same single assignable `A`, subject
 * to one condition: every *pair* in `B` occupies some section in common — a clique in
 * `ctx.overlap`. Then **at most one member of `B` occupies `A` in any completion**, because two
 * that both did would hold `A` in the section they share, which is the collision §4.2 refuses.
 * That holds for a stack that happens to include `A` too: occupying is occupying.
 *
 * Pairwise overlap is the whole requirement and nothing joint is needed, because the conclusion
 * is itself pairwise: "no two of them", not "they are together anything".
 *
 * Continuous requests are the case that motivated this and they are a clique for free —
 * `sectionsFor` hands each of them the whole structure, so any two of them overlap totally. **A
 * transient request joins on exactly the same terms rather than being excluded.** Two transients
 * in disjoint sections are not a clique and are never bucketed together, which is §4.2 letting
 * them share one voice quite legally; bucketing them would charge one of them for an eviction
 * that was never going to happen, and a floor above the optimum prunes the optimum. A transient
 * and a continuous request *are* a clique, and so are two transients that overlap anywhere. A
 * request whose sections miss the structure entirely occupies nothing, and it needs no rule of
 * its own: its whole `overlap` row is 0, so it joins nobody's clique and the one it seeds never
 * reaches a second member. `parseTemplate` refuses that shape in any case (§4.2), and `assign`
 * does not parse its input.
 *
 * The cliques are grown greedily in request order: the first unbucketed request on a voice seeds
 * one, and a later one joins if it overlaps everyone already in. That is a maximal clique and
 * not a maximum one, and the members it leaves out simply keep their unrepaired cheapest — so
 * the greed moves how *strong* the bound is and never whether it is valid, since every clique
 * gives the exclusion above. Request order is canonical (§4.4/§7.2), so the cover is
 * deterministic and so, therefore, is the node count.
 *
 * **What it was worth.** The exclusion was `sustain === 'continuous'` before it was §4.2's own
 * rule, and one direction was paying the whole difference: `ambient-dub` has one transient
 * request in nine, that one request stood outside every bucket, and the repair therefore fired
 * nowhere on it. Seed 2 went **25,798 nodes to 759**, and the worst case across all 168 shipped
 * searches went 25,798 to 8,309 — back onto `industrial-techno`, where it had been. No other
 * direction moved a node: `industrial-techno`'s two transients occupy disjoint sections and
 * `relay`'s two are the only requests it has, so neither gains a bucket it did not have.
 *
 * Nothing here is a claim about what `A` is carrying *now*. The exclusion is between the bucket's
 * own members in the finished assignment, and current occupancy has already had its say — a
 * candidate that is not free now is not in the ladder walk that produced these costs at all.
 *
 * **The repair.** For a bucket `B` on `A`, let `c_i` be member `i`'s cheapest option (on `A`)
 * and `alt_i` its cheapest option that does not occupy `A`. Whichever member ends up with `A`,
 * every other member pays at least its own `alt`, so
 *
 *     sum over B of cost(completion) >=lex min over i of ( c_i + sum over m != i of alt_m )
 *
 * and that minimum replaces the `sum of c_i` the unrepaired floor charged.
 *
 * **Why it is still a bound.** Take a completion. At most one member of `B` holds `A` in it —
 * that is the exclusion, and it is where the clique is spent. Call it `i`, or pick any member
 * when none does. Member `i` pays at least `c_i`, the minimum over all its options. Every other
 * member `m` does not hold `A`, so it pays at least the minimum over its options that do not
 * occupy `A`, which is `alt_m`. Sum, and the completion is `>=lex` that member's term; it is
 * therefore `>=lex` the minimum over `i` of those terms, which is what the repair charges.
 *
 * **Why it is never weaker than what it replaces.** `alt_m >=lex c_m` for every `m`, because
 * `alt_m` minimises over `c_m`'s options minus the ones that occupy `A` and restricting a
 * minimisation's domain can only raise it. So `c_i + sum(m != i) alt_m >=lex sum(m) c_m` term by
 * term, for every `i` and so for the minimising one. The repair can only raise the floor, which
 * is what makes it prune rather than merely be admissible.
 *
 * Both steps sum vectors and compare them lexicographically, and both are entitled to: the
 * components are non-negative integers, and lexicographic order on those is compatible with
 * addition — if `a <=lex b` and `c <=lex d` then `a + c <=lex b + d`. That is the same fact
 * `cheapestCandidate` leans on to sum per-request minima, applied to per-bucket minima instead.
 *
 * Picking the minimising `i` needs no search. The `k` sums differ only by `c_i - alt_i`, so the
 * lexicographic minimum is the member with the lexicographically smallest `c_i - alt_i` — the
 * one that loses most by giving `A` up. `compareGiveUp` is that comparison.
 *
 * **Where `alt` is deliberately understated.** It is the cheapest of: the next free ladder entry
 * (the ladder is cost-sorted and `A` appears in it exactly once, so the next *free* entry after
 * `A` is the cheapest free entry that is not `A`), the request's stack plan, and the miss. The
 * stack is thrown in without asking whether its pool contains `A`. That can only make `alt`
 * cheaper than the true cheapest-avoiding-`A`, which lowers the repair — the safe direction, and
 * it keeps the stack the same conflict-free abstraction it already is everywhere else here.
 *
 * **The miss is a real option and is costed as one**, on `misses[priority]` or on
 * `optionalMisses`. Both outrank everything a landed option can charge, so a member whose only
 * escape from `A` is a miss is exactly the member `compareGiveUp` hands `A` to.
 *
 * **It is deliberately optimistic about resources** (§2.3/#25), and says nothing about them at
 * all. The ladder is static, so the suffix it costs may use more distinct patches than the box
 * can load at once — a completion this bound prices is not always one the search can reach. That
 * is the same relaxation it already makes for occupancy, crowding and `distinct`, and it errs the
 * same way: dropping a constraint can only widen a request's option set, so the per-request
 * minimum can only fall and the floor stays below anything reachable. Tightening it would mean
 * asking, per node, which recipes are still loadable — and a floor that reads live budget state
 * is exactly the sort of thing that stops being admissible without anybody noticing.
 *
 * **One step, not a matching.** Nothing here iterates: the repaired costs are not re-bucketed,
 * and a bucket is broken against the *original* cheapest rather than against what its neighbours
 * were just moved onto. A full assignment relaxation would be a stronger bound and a solver
 * (#159 says as much); this is the first step of one, taken because it is O(remaining) per node
 * and the search is bound-dominated.
 */
function liveFloor(ctx: Ctx, state: State, from: number): SuffixFloor {
  const misses = new Array<number>(ctx.missSlots).fill(0)
  let optionalMisses = 0
  let sampledChords = 0
  let stackedChords = 0
  let recipeDistance = 0
  let roleFitPenalty = 0
  const n = ctx.requests.length
  const scratch = ctx.scratch
  // Whether any two requests that could be bucketed together picked the same voice. Almost every
  // node either has one collision or none, so this saves the second pass entirely on the nodes
  // that have none. It applies the same overlap test the clique does, so the two move together:
  // dropping it from either place alone leaves the other doing the whole job, and the rule
  // stops being enforced only when both go.
  let collided = false

  for (let j = from; j < n; j++) {
    const request = ctx.requests[j] as RoleRequest
    // The ladder is in `cheapestCandidate` order, so the first free entry *is* the cheapest free
    // one. Usually that is the first entry and the walk stops immediately.
    const ladder = ctx.ladder[j] ?? []
    let best: Cost | undefined
    let at = -1
    for (let i = 0; i < ladder.length; i++) {
      const candidate = ladder[i] as Candidate
      if (isFree(ctx, state, j, candidate)) {
        best = candidate
        at = i
        break
      }
    }
    const stack = ctx.stackFloor[j]
    if (stack !== undefined && (best === undefined || compareCost(stack, best) < 0)) {
      best = stack
      // A stack is the conflict-free option: it is not bucketed, so it claims no voice here.
      at = -1
    }
    scratch.at[j] = at
    const slot = at < 0 ? -1 : ((ctx.ladderSlot[j] as Int32Array)[at] as number)
    scratch.slot[j] = slot
    scratch.cost[j] = best ?? null
    if (slot >= 0 && !collided) {
      for (let b = from; b < j; b++) {
        if (scratch.slot[b] === slot && ctx.overlap[b * n + j] === 1) {
          collided = true
          break
        }
      }
    }

    if (best === undefined) {
      if (request.optional === true) optionalMisses += 1
      else misses[request.priority - 1] = (misses[request.priority - 1] ?? 0) + 1
      continue
    }
    sampledChords += best.sampledChord
    stackedChords += best.stacked
    recipeDistance += best.distance
    roleFitPenalty += best.roleFit
  }

  if (collided && ctx.repair) {
    const members = scratch.members
    // A request belongs to one bucket at most, or it would be charged its escape twice. Cleared
    // here rather than carried, because entries below `from` are stale by construction.
    scratch.bucketed.fill(0, from, n)
    for (let a = from; a < n; a++) {
      const slot = scratch.slot[a]
      if (slot === undefined || slot < 0 || scratch.bucketed[a] === 1) continue

      // Grow the clique: the seed, then every later request on this voice that overlaps
      // everyone already in. Maximal rather than maximum — see the header on why that is a
      // choice about strength and not about validity.
      let size = 0
      members[size++] = a
      scratch.bucketed[a] = 1
      for (let b = a + 1; b < n; b++) {
        if (scratch.slot[b] !== slot || scratch.bucketed[b] === 1) continue
        let joins = true
        for (let m = 0; m < size; m++) {
          if (ctx.overlap[(members[m] as number) * n + b] === 0) {
            joins = false
            break
          }
        }
        if (!joins) continue
        members[size++] = b
        scratch.bucketed[b] = 1
      }
      // One request on a voice is not a contest, and there is nothing to repair.
      if (size < 2) continue

      // Pass one: each member's escape from `A`, and which member keeps it.
      let keeps = -1
      for (let m = 0; m < size; m++) {
        const b = members[m] as number
        const alt = alternativeTo(ctx, state, b)
        const request = ctx.requests[b] as RoleRequest
        scratch.alt[b] = alt
        // Ranked in `Score` order: a required miss at priority p sits at p, an optional miss
        // below every required one, and a landed alternative below both — it charges no miss.
        scratch.rank[b] =
          alt !== null
            ? ctx.missSlots + 1
            : request.optional === true
              ? ctx.missSlots
              : request.priority - 1
        if (keeps < 0 || compareGiveUp(scratch, b, keeps) < 0) keeps = b
      }
      if (keeps < 0) continue

      // Pass two: everyone else pays their escape instead of the voice they cannot have. The
      // floor already charged `c`, so what is added is the difference — which may be negative on
      // an individual key and cannot be on the total, since the total is a sum of real costs.
      for (let m = 0; m < size; m++) {
        const b = members[m] as number
        if (b === keeps) continue
        const cost = scratch.cost[b]
        if (cost === null || cost === undefined) continue
        const alt = scratch.alt[b] ?? null
        if (alt === null) {
          const request = ctx.requests[b] as RoleRequest
          if (request.optional === true) optionalMisses += 1
          else misses[request.priority - 1] = (misses[request.priority - 1] ?? 0) + 1
        } else {
          sampledChords += alt.sampledChord
          stackedChords += alt.stacked
          recipeDistance += alt.distance
          roleFitPenalty += alt.roleFit
        }
        sampledChords -= cost.sampledChord
        stackedChords -= cost.stacked
        recipeDistance -= cost.distance
        roleFitPenalty -= cost.roleFit
      }
    }
  }

  return { misses, optionalMisses, sampledChords, stackedChords, recipeDistance, roleFitPenalty }
}

/**
 * Request `j`'s cheapest option that does not occupy the voice its cheapest option took.
 *
 * The ladder is cost-sorted and holds each assignable exactly once, and `scratch.at[j]` is the
 * *first* free entry — so every entry before it is occupied and cannot be an option, the entry
 * at it is the voice being given up, and the first free entry after it is the cheapest remaining
 * one. No re-minimisation and no second sort.
 *
 * `null` means the request has no escape but the miss, which `liveFloor` costs as one.
 */
function alternativeTo(ctx: Ctx, state: State, j: number): Cost | null {
  const ladder = ctx.ladder[j] ?? []
  let alt: Cost | undefined
  for (let i = (ctx.scratch.at[j] as number) + 1; i < ladder.length; i++) {
    const candidate = ladder[i] as Candidate
    if (isFree(ctx, state, j, candidate)) {
      alt = candidate
      break
    }
  }
  const stack = ctx.stackFloor[j]
  if (stack !== undefined && (alt === undefined || compareCost(stack, alt) < 0)) alt = stack
  return alt ?? null
}

/**
 * `c_a - alt_a` against `c_b - alt_b`, lexicographically in `Score` key order — which member of
 * a bucket loses most by giving the shared voice up, and therefore keeps it.
 *
 * The differences are compared rather than the sums they belong to because the sums differ only
 * by this term: `c_i + sum(m != i) alt_m` is `sum(m) alt_m + (c_i - alt_i)`, and the first half
 * is common to every member. Components may be negative here, which is why this is its own
 * comparison and not `compareCost`.
 *
 * The miss keys come first, and at most one of them is non-zero for any one member — a miss
 * charges one point in one slot — so `rank` stands in for that whole prefix: the member whose
 * escape charges a miss *earlier* in the vector has the lexicographically smaller difference.
 */
function compareGiveUp(scratch: FloorScratch, a: number, b: number): number {
  const rankA = scratch.rank[a] as number
  const rankB = scratch.rank[b] as number
  if (rankA !== rankB) return rankA - rankB
  const costA = scratch.cost[a] as Cost
  const costB = scratch.cost[b] as Cost
  const altA = scratch.alt[a] ?? null
  const altB = scratch.alt[b] ?? null
  const sampled = costA.sampledChord - (altA?.sampledChord ?? 0)
  const sampledOther = costB.sampledChord - (altB?.sampledChord ?? 0)
  if (sampled !== sampledOther) return sampled - sampledOther
  const stacked = costA.stacked - (altA?.stacked ?? 0)
  const stackedOther = costB.stacked - (altB?.stacked ?? 0)
  if (stacked !== stackedOther) return stacked - stackedOther
  const distance = costA.distance - (altA?.distance ?? 0)
  const distanceOther = costB.distance - (altB?.distance ?? 0)
  if (distance !== distanceOther) return distance - distanceOther
  const fit = costA.roleFit - (altA?.roleFit ?? 0)
  const fitOther = costB.roleFit - (altB?.roleFit ?? 0)
  return fit - fitOther
}

/**
 * `cheapestCandidate`'s comparison, as a comparator. One definition, so the ladder's sort order
 * and the stack-versus-single choice in `liveFloor` cannot drift apart from the minimisation
 * `buildSuffixFloor` still does.
 */
function compareCost(a: Cost, b: Cost): number {
  if (a.sampledChord !== b.sampledChord) return a.sampledChord - b.sampledChord
  if (a.stacked !== b.stacked) return a.stacked - b.stacked
  if (a.distance !== b.distance) return a.distance - b.distance
  return a.roleFit - b.roleFit
}

function buildSuffixFloor(
  requests: readonly RoleRequest[],
  voiceable: readonly Candidate[][],
  stacks: readonly StackPlan[][],
  missSlots: number,
): SuffixFloor[] {
  const floors: SuffixFloor[] = new Array(requests.length + 1)
  floors[requests.length] = {
    misses: new Array<number>(missSlots).fill(0),
    optionalMisses: 0,
    sampledChords: 0,
    stackedChords: 0,
    recipeDistance: 0,
    roleFitPenalty: 0,
  }
  for (let i = requests.length - 1; i >= 0; i--) {
    const ahead = floors[i + 1] as SuffixFloor
    const request = requests[i] as RoleRequest
    const misses = [...ahead.misses]
    let optionalMisses = ahead.optionalMisses
    let sampledChords = ahead.sampledChords
    let stackedChords = ahead.stackedChords
    let recipeDistance = ahead.recipeDistance
    let roleFitPenalty = ahead.roleFitPenalty

    // Stack plans enter the floor alongside the singles, costed as though every member were
    // free. That is the same relaxation the rest of this bound makes — occupancy dropped, so a
    // request's option set can only widen and its minimum can only fall.
    const best = cheapestCandidate([...(voiceable[i] ?? []), ...(stacks[i] ?? [])])
    if (best === undefined) {
      // No candidate before occupancy is no candidate after it: `orderedCandidates` only ever
      // filters this list down. The miss is forced, so the bound may charge for it outright —
      // and it charges on `misses`, the key that outranks everything below.
      if (request.optional === true) optionalMisses += 1
      else misses[request.priority - 1] = (misses[request.priority - 1] ?? 0) + 1
    } else {
      sampledChords += best.sampledChord
      stackedChords += best.stacked
      recipeDistance += best.distance
      roleFitPenalty += best.roleFit
    }
    floors[i] = {
      misses,
      optionalMisses,
      sampledChords,
      stackedChords,
      recipeDistance,
      roleFitPenalty,
    }
  }
  return floors
}

function buildCtx(
  input: AssignInput,
  repair = true,
  /**
   * §7.5/#340. The **accepted** placements only, by request. `resolvePlacements` decides which
   * those are against a ctx built without any of them, so this is never asked to enforce a
   * placement the rig cannot honour.
   */
  placed?: ReadonlyMap<RequestId, DeviceId>,
): Ctx {
  const { template, devices, mood, seed } = input

  const deviceById = new Map<DeviceId, Device>()
  const assignableOwner = new Map<AssignableKey, Device>()
  const assignables: Assignable[] = []
  const comfortable = new Map<DeviceId, number>()
  const resources = new Map<DeviceId, Map<string, ResourceSpec>>()
  const deviceIds: DeviceId[] = []
  // §12.4/#40. Pool members, grouped by the pool they belong to, for stack planning below.
  // Insertion order is device order then the order `expand` emits pools in, so iterating this is
  // as deterministic as iterating `assignables` (§7.2) — and the members inside each group are
  // sorted into canonical order once, here, rather than at every node.
  const poolMembers = new Map<string, Assignable[]>()
  for (const device of devices) {
    deviceById.set(device.id, device)
    const expanded = expand(device)
    // §2.3: `comfortableVoices` omitted means the device is comfortable with all of them.
    comfortable.set(device.id, device.comfortableVoices ?? expanded.length)
    // §2.3/#25. Only devices that declare a budget get an entry; the rest are absent, not empty.
    if (device.resources !== undefined && device.resources.length > 0) {
      resources.set(device.id, new Map(device.resources.map((r) => [r.id, r])))
    }
    deviceIds.push(device.id)
    for (const assignable of expanded) {
      assignables.push(assignable)
      assignableOwner.set(assignableKey(assignable), device)
      const poolId = assignable.poolId
      if (poolId === undefined) continue
      const group = poolGroupKey(assignable, poolId)
      const members = poolMembers.get(group)
      if (members === undefined) poolMembers.set(group, [assignable])
      else members.push(assignable)
    }
  }
  for (const members of poolMembers.values()) members.sort(comparePoolMembers)

  // §4.4: ascending priority, most important first. Ties by request id in UTF-16 order (§7.2),
  // so the traversal does not depend on authoring order within one priority level.
  const requests = [...template.roles].sort(
    (a, b) => a.priority - b.priority || compareCodeUnits(a.id, b.id),
  )

  const wanted: Character[] = []
  const sections: SectionName[][] = []
  const roleOnly: Assignable[][] = []
  const capable: Assignable[][] = []
  const voiceable: Candidate[][] = []
  const stacks: StackPlan[][] = []
  const reach: Set<DeviceId>[] = []

  for (const request of requests) {
    const character = resolveCharacter(request.character, mood)
    wanted.push(character)
    sections.push(sectionsFor(request, template))

    // §12.4: capability is recipe-aware from here on. The request's `polyphony` is still a
    // note count and the assignable's is still simultaneous notes — neither moved — but a
    // `sampled-chord` recipe reaches the count with one voice, so whether a mono voice can
    // carry a triad is a question only the device's recipe list can answer.
    const notes = request.polyphony ?? 1
    const plays = assignables.filter((a) => a.roles.includes(request.role))
    roleOnly.push(plays)
    // §12.4/#40: capability now has a second route as well as a second question. A pool member
    // that cannot sound a triad alone is capable if `notes` of its siblings can share it out —
    // so a rig of monophonic tracks is no longer told it cannot play a pad, and the gap it does
    // produce is about the recipe rather than about the box.
    const fits = plays.filter((a) => {
      const owner = assignableOwner.get(assignableKey(a))
      if (owner === undefined) return false
      return (
        canCarryNotes(owner, a, request.role, notes) ||
        canStackNotes(owner, a, request.role, notes)
      )
    })
    capable.push(fits)

    const candidates: Candidate[] = []
    for (const assignable of fits) {
      const key = assignableKey(assignable)
      const owner = assignableOwner.get(key)
      if (owner === undefined) continue
      const resolution = resolveRecipe(owner, assignable, request.role, character, notes)
      // The human ruling: unvoiced is not a candidate. It neither fills nor occupies, and is
      // recovered as a `no-recipe` gap reason instead. A voice that is capable only through a
      // chord sample lands here too when no *usable* recipe survives the character filter.
      if (resolution.outcome === 'unvoiced') continue
      candidates.push({
        assignables: [assignable],
        keys: [key],
        deviceId: assignable.deviceId,
        recipe: resolution.recipe,
        outcome: resolution.outcome,
        recipeCharacter: resolution.character,
        distance: quantiseDistance(resolution.distanceSq),
        sampledChord: notes > 1 && realisationOf(resolution.recipe) === 'sampled-chord' ? 1 : 0,
        stacked: 0,
        roleFit: assignable.roles.indexOf(request.role),
      })
    }
    /**
     * §7.5/#340. **A placement is a feasibility constraint, not a cost.** Every candidate on
     * another box is removed here, before anything is derived from the list, so the ladder, the
     * suffix floor and the bound are all built against the reduced set — the placement prunes the tree
     * rather than complicating it, which is #25's ruling and its machinery. Nothing about it
     * reaches `Score`.
     *
     * `roleOnly` and `capable` are deliberately left whole. They describe the *rig*, and §7.3
     * reads them to say what could have carried the part; narrowing them would make a placed
     * part report `no-recipe` — "nobody has written it" — for a recipe that exists on the box
     * next to it. A placement is only ever accepted when the named device has a candidate for
     * the request, so this filter never empties a list that had something in it.
     *
     * This is half of what honouring a placement takes. It says the part may not go to another
     * box; `search` supplies the other half by refusing the miss branch, which says it may not be
     * left out instead.
     */
    const placedOn = placed?.get(request.id)
    const kept =
      placedOn === undefined ? candidates : candidates.filter((c) => c.deviceId === placedOn)
    voiceable.push(kept)

    // §12.4/#40. One plan per pool that could spread this request. `canStackNotes` holds the
    // gate — a pool, wide enough, with a `polyphonic-voice` recipe, and not already polyphonic
    // enough to do it on one voice — and it is asked of a representative member because every
    // one of the answers is a per-pool fact (§2.2).
    const plans: StackPlan[] = []
    if (notes > 1) {
      for (const members of poolMembers.values()) {
        const representative = members[0]
        if (representative === undefined) continue
        const owner = deviceById.get(representative.deviceId)
        if (owner === undefined) continue
        if (!representative.roles.includes(request.role)) continue
        if (!canStackNotes(owner, representative, request.role, notes)) continue
        const best = stackRecipes(owner, representative, request.role, character)[0]
        // No usable recipe at this character is a `no-recipe` gap, exactly as for a single.
        if (best === undefined) continue
        plans.push({
          deviceId: representative.deviceId,
          poolId: representative.poolId as string,
          members,
          width: notes,
          recipe: best.recipe,
          outcome: best.distanceSq === 0 ? 'exact' : 'substituted',
          recipeCharacter: best.recipe.character,
          distance: quantiseDistance(best.distanceSq),
          sampledChord: 0,
          stacked: 1,
          roleFit: representative.roles.indexOf(request.role),
        })
      }
    }
    const keptPlans =
      placedOn === undefined ? plans : plans.filter((p) => p.deviceId === placedOn)
    stacks.push(keptPlans)

    reach.push(
      new Set([...kept.map((c) => c.deviceId), ...keptPlans.map((p) => p.deviceId)]),
    )
  }

  // Suffix unions: which devices any *remaining* request could still reach. `suffixReach[i]`
  // covers requests i..n-1, and `suffixReach[n]` is empty.
  const suffixReach: Set<DeviceId>[] = new Array(requests.length + 1)
  suffixReach[requests.length] = new Set()
  for (let i = requests.length - 1; i >= 0; i--) {
    const union = new Set(suffixReach[i + 1])
    for (const id of reach[i] ?? []) union.add(id)
    suffixReach[i] = union
  }

  // The miss prefix is sized by the template, not by the outcome, so every candidate solution
  // produces a vector of the same shape and `compareScore` never compares ragged tuples.
  const missSlots = requests.reduce((max, r) => Math.max(max, r.priority), 0)

  const suffixFloor = buildSuffixFloor(requests, voiceable, stacks, missSlots)

  // #78. The ladder is sorted once here, not per node: the candidate lists are static, so the
  // order they are searched in is too. `deviceId` then `voiceId` after the four cost keys makes
  // it total, so the bound cannot depend on the order `voiceable` happened to be built in.
  const ladder: readonly Candidate[][] = voiceable.map((list) =>
    [...list].sort(
      (a, b) =>
        compareCost(a, b) ||
        compareCodeUnits(a.deviceId, b.deviceId) ||
        compareCodeUnits(
          (a.assignables[0] as Assignable).voiceId,
          (b.assignables[0] as Assignable).voiceId,
        ),
    ),
  )

  // §7.1's matching repair. The voice each ladder entry occupies, as an integer, so a node can
  // ask "same voice?" without touching a string. `assignables` is the rig in canonical order
  // (§7.2), so the number a voice gets is a function of the rig alone.
  const slotOf = new Map<AssignableKey, number>()
  assignables.forEach((a, i) => slotOf.set(assignableKey(a), i))
  const ladderSlot = ladder.map((list) => {
    const slots = new Int32Array(list.length)
    for (let i = 0; i < list.length; i++) {
      slots[i] = slotOf.get((list[i] as Candidate).keys[0] as AssignableKey) ?? -1
    }
    return slots
  })
  // §4.2's pairwise question, answered once: do these two requests occupy any section in
  // common, and could they therefore never share one voice. `liveFloor` says why the repair
  // rests on it. Symmetric, and the diagonal answers "does this request occupy anything at all".
  const overlap = new Uint8Array(requests.length * requests.length)
  for (let a = 0; a < requests.length; a++) {
    const mine = new Set(sections[a] ?? [])
    for (let b = a; b < requests.length; b++) {
      let shares = false
      for (const section of sections[b] ?? []) {
        if (mine.has(section)) {
          shares = true
          break
        }
      }
      overlap[a * requests.length + b] = shares ? 1 : 0
      overlap[b * requests.length + a] = shares ? 1 : 0
    }
  }

  return {
    template,
    devices,
    deviceById,
    deviceIds,
    comfortable,
    resources,
    requests,
    wanted,
    sections,
    roleOnly,
    capable,
    voiceable,
    stacks,
    suffixReach,
    suffixFloor,
    overlap,
    ladderSlot,
    ladder,
    placedOn: requests.map((request) => placed?.get(request.id)),
    stackFloor: stacks.map((list) => cheapestCandidate(list)),
    scratch: {
      cost: new Array<Cost | null>(requests.length).fill(null),
      slot: new Int32Array(requests.length).fill(-1),
      at: new Int32Array(requests.length).fill(-1),
      alt: new Array<Cost | null>(requests.length).fill(null),
      rank: new Int32Array(requests.length).fill(0),
      members: new Int32Array(requests.length).fill(-1),
      bucketed: new Uint8Array(requests.length),
    },
    repair,
    missSlots,
    seed,
    nodeCap: input.nodeCap ?? DEFAULT_NODE_CAP,
  }
}

// ---------------------------------------------------------------------------
// Search state
// ---------------------------------------------------------------------------

type State = {
  misses: number[]
  optionalMisses: number
  recipeDistance: number
  sampledChords: number
  stackedChords: number
  roleFitPenalty: number
  /** Occupied assignables per device — one entry per assignable occupied in >= 1 section. */
  occupiedByDevice: Map<DeviceId, Set<AssignableKey>>
  occupancy: Occupancy
  chosen: (Candidate | null)[]
  /**
   * `crowdOverflowFrom(ctx, state)` and `idleDevicesFrom(ctx, state)`, carried rather than
   * recomputed. Both were whole-rig scans run at every node by `scoreOf` and `lowerBound`, and
   * the search is bound-dominated (#159: 86.4% of nodes bounded on arrival), so the scan ran
   * mostly to prove a node was not worth expanding.
   *
   * They are a cache and not a second source of truth. `occupiedByDevice` still decides, these
   * follow it in `apply`/`undo`, and `measureSearchShape` recomputes both at every node of a
   * real search and throws if they have drifted. Nothing else may write them.
   */
  crowd: number
  idle: number
  /**
   * §2.3/#25. **What is currently loaded, and how many requests are holding each of them.**
   *
   * Keyed by `(device, resource, sharingKey)` — the sharing key rather than the recipe id,
   * because several recipe records can be one loaded patch (`ResourceUse.sharedAs`), and by
   * resource as well because one recipe may spend two of them under different identities.
   *
   * The count is of *requests*, and it is the whole of "one loaded thing, not one assignment":
   * the second request to take a patch finds it already loaded and spends nothing, and the
   * budget comes back only when the last holder lets go. See `charge`.
   *
   * Empty for every rig whose devices declare no resources, which is every rig today — nothing is
   * written here for a recipe that consumes nothing.
   */
  resourceHolders: Map<string, number>
  /**
   * §2.3/#25. What is spent of each `(device, resource)` right now. Derived from
   * `resourceHolders` and the recipes' declarations, carried rather than recomputed for the same
   * reason `crowd` is.
   */
  resourceUsed: Map<string, number>
}

function emptyState(ctx: Ctx): State {
  const state: State = {
    misses: new Array(ctx.missSlots).fill(0),
    optionalMisses: 0,
    recipeDistance: 0,
    sampledChords: 0,
    stackedChords: 0,
    roleFitPenalty: 0,
    occupiedByDevice: new Map(ctx.devices.map((d) => [d.id, new Set<AssignableKey>()])),
    occupancy: new Map(),
    chosen: new Array(ctx.requests.length).fill(null),
    crowd: 0,
    idle: 0,
    resourceHolders: new Map(),
    resourceUsed: new Map(),
  }
  // Seeded from the scans rather than from what an empty rig obviously scores, so the cache and
  // its definition cannot disagree at the root even if either definition changes.
  state.crowd = crowdOverflowFrom(ctx, state)
  state.idle = idleDevicesFrom(ctx, state)
  return state
}

/** The definition of `state.crowd`. Called to seed it and to check it, never inside the walk. */
function crowdOverflowFrom(ctx: Ctx, state: State): number {
  let total = 0
  for (const id of ctx.deviceIds) {
    const occupied = state.occupiedByDevice.get(id)?.size ?? 0
    total += Math.max(0, occupied - (ctx.comfortable.get(id) ?? 0))
  }
  return total
}

/**
 * §7.1, literally: "devices with zero occupied assignables". *Every* selected device counts,
 * a voiceless mixer-recorder included — it contributes no assignables (§2.4) and so is always
 * idle, which is a constant across every candidate solution and therefore never changes which
 * assignment wins.
 *
 * §12.4: an assignable occupied in *any* section counts once — the physical voice is committed
 * for the whole build even if its part only plays in Build.
 */
function idleDevicesFrom(ctx: Ctx, state: State): number {
  let idle = 0
  for (const id of ctx.deviceIds) {
    if ((state.occupiedByDevice.get(id)?.size ?? 0) === 0) idle++
  }
  return idle
}

/**
 * One device's occupied count moved from `before` to `after`, so move the two scalars with it.
 *
 * Only a transition between globally unoccupied and occupied can change `idle`, and only the
 * part of the count above `comfortableVoices` can change `crowd` — both are read off the two
 * sizes rather than rediscovered, which is what makes this O(1) instead of a rig scan. A
 * candidate's keys all sit on one device (`candidate.deviceId`), so one call covers a whole
 * `apply` or `undo`.
 */
function recount(ctx: Ctx, state: State, deviceId: DeviceId, before: number, after: number): void {
  if (after === before) return
  const comfortable = ctx.comfortable.get(deviceId) ?? 0
  state.crowd += Math.max(0, after - comfortable) - Math.max(0, before - comfortable)
  if (before === 0) state.idle--
  else if (after === 0) state.idle++
}

function scoreOf(ctx: Ctx, state: State): Score {
  return [
    ...state.misses,
    state.crowd,
    state.optionalMisses,
    state.sampledChords,
    state.stackedChords,
    state.recipeDistance,
    state.roleFitPenalty,
    state.idle,
  ] as unknown as Score
}

/**
 * §7.1's branch-and-bound bound, **per key, and one key is not monotone.**
 *
 * Misses, crowding, recipe distance and role fit only grow as the assignment extends, so the
 * partial value bounds them — and the partial value alone is a *weak* bound, because it charges
 * nothing at all for the requests still to come. `ctx.suffixFloor` (see `buildSuffixFloor`) adds
 * what those must cost at minimum. `crowdOverflow` is left at its partial value: it is the one
 * additive key whose per-request cost depends on where the *other* requests land, so there is no
 * per-request minimum to sum.
 *
 * Mixing the two is safe even though `crowdOverflow` sits *between* the miss keys and the rest.
 * A lower bound only needs `B <=lex S` for every completion `S`. On the additive keys taken in
 * their own order that holds by the addition argument in `buildSuffixFloor`; `crowdOverflow` and
 * `idleDevices` are each independently `<=` their final value, so wherever the comparison stops
 * it stops in the bound's favour or moves on.
 *
 * `idleDevices` *shrinks*, so the current idle count is not a lower bound and using it prunes
 * the optimum.
 *
 * Reachability alone gives an admissible bound — the devices no remaining request could legally
 * reach are idle now and can never stop being idle — but a weak one, because it lets *every*
 * reachable idle device wake up at once. **A request activates at most one device.** Each of the
 * remaining requests takes one candidate or takes the miss branch, so at most
 * `min(reachableIdle, remainingRequests)` of the currently-idle devices can still be woken, and
 * the rest are as permanently idle as the unreachable ones.
 *
 * The counting is exact whichever way it is written: `currentIdle - min(reachableIdle, remaining)`
 * is `unreachableIdle + max(0, reachableIdle - remaining)`, since the two idle classes partition
 * the idle devices. The second form is used below because it stays in non-negative integers —
 * no float summation, hence no cross-platform drift (invariant 6).
 *
 * Admissible while ignoring both occupancy and `distinct`, and deliberately so: those can only
 * *stop* a request from waking a device, never let one request wake two. Ignoring them can make
 * the bound loose; it cannot make it exceed the true final idle count.
 *
 * At the leaf `remaining` is 0 and `reachable` is empty, so this returns the current idle count
 * exactly — the bound stays tight where it decides the incumbent.
 */
function lowerBound(ctx: Ctx, state: State, next: number): Score {
  // #78. The live floor, not `ctx.suffixFloor[next]`. It is `>=lex` the static one term by term
  // — see `liveFloor` — so nothing that used to prune stops pruning, and a great deal that used
  // to survive no longer does.
  const floor = liveFloor(ctx, state, next)
  const reachable = ctx.suffixReach[next] ?? new Set<DeviceId>()
  // The same two counts as before, off a smaller loop. The idle devices partition into reachable
  // and unreachable, `state.idle` is the total, so only one class has to be counted — and it is
  // the one that can be walked directly, since `reachable` is a subset of the rig. Membership is
  // tested through `occupiedByDevice` rather than assumed, so a device id that is somehow not in
  // the rig contributes to neither class, exactly as the whole-rig loop it replaces.
  //
  // A voiceless device is in no request's reachable set, so it lands in `unreachableIdle` and is
  // counted here exactly as `idleDevicesFrom` counts it — the bound stays exact at the leaf.
  let reachableIdle = 0
  for (const id of reachable) {
    const occupied = state.occupiedByDevice.get(id)
    if (occupied !== undefined && occupied.size === 0) reachableIdle++
  }
  const unreachableIdle = state.idle - reachableIdle
  const remaining = ctx.requests.length - next
  const floorIdle = unreachableIdle + Math.max(0, reachableIdle - remaining)
  return [
    ...state.misses.map((m, p) => m + (floor.misses[p] ?? 0)),
    state.crowd,
    state.optionalMisses + floor.optionalMisses,
    state.sampledChords + floor.sampledChords,
    state.stackedChords + floor.stackedChords,
    state.recipeDistance + floor.recipeDistance,
    state.roleFitPenalty + floor.roleFitPenalty,
    floorIdle,
  ] as unknown as Score
}

/**
 * `${deviceId}\u0000${resourceId}` — what is spent of one budget. A resource id is unique only
 * within its device, so the pair is the key.
 *
 * The separator is a NUL rather than a `/` because `DeviceId` and the ids beside it are bare
 * `string` and `AssignInput` takes device objects a caller may build at runtime (#4) — the same
 * reason `canonicalState` length-prefixes its pieces instead of joining them.
 */
function resourceKey(deviceId: DeviceId, resourceId: string): string {
  return `${deviceId}\u0000${resourceId}`
}

/**
 * §2.3/#25. `${deviceId}\u0000${resourceId}\u0000${sharingKey}` — one *loaded thing*, which is
 * the unit the budget is actually spent by.
 *
 * The sharing key defaults to the recipe's id (`sharedAs`), so an ordinary recipe is its own
 * identity and nothing about the ordinary case had to be written down. Where several recipe
 * records are one patch — the Tracker Mini's cross-pool twins, which exist twice only because a
 * recipe can name one voice — they declare the same key and hold one entry between them.
 */
function holderKey(deviceId: DeviceId, resourceId: string, key: string): string {
  return `${deviceId}\u0000${resourceId}\u0000${key}`
}

/**
 * §2.3/#25. Move what this candidate loads in or out of the loaded set, and the budget with it.
 *
 * `delta` is +1 from `apply` and -1 from `undo`. The count is of requests holding each loaded
 * thing, so the budget moves **only on the 0→1 and 1→0 transitions** — this is where "the same
 * patch on three tracks is one slot" is actually implemented, and where a shared patch is
 * released only once the last part using it has gone.
 *
 * Per consumption rather than per recipe, because identity is per consumption: two recipe records
 * that are one patch hold one entry (`sharedAs`), and one recipe spending two resources may share
 * each of them with a different set of siblings.
 *
 * A stack (§12.4/#40) is one candidate on one recipe however many voices it takes, so it charges
 * once. That is right rather than a simplification: the box loads the patch once and plays it
 * from several tracks, which is exactly the case this whole field exists to model.
 */
function charge(state: State, candidate: Candidate, delta: 1 | -1): void {
  const consumes = candidate.recipe.consumes
  if (consumes === undefined || consumes.length === 0) return
  for (const use of consumes) {
    const holder = holderKey(
      candidate.deviceId,
      use.resource,
      sharedAs(candidate.recipe, use),
    )
    const before = state.resourceHolders.get(holder) ?? 0
    const after = before + delta
    if (after <= 0) state.resourceHolders.delete(holder)
    else state.resourceHolders.set(holder, after)
    // Loaded before and still loaded after: this patch never left the box.
    if (before > 0 && after > 0) continue
    const held = resourceKey(candidate.deviceId, use.resource)
    const next = (state.resourceUsed.get(held) ?? 0) + delta * (use.amount ?? 1)
    if (next <= 0) state.resourceUsed.delete(held)
    else state.resourceUsed.set(held, next)
  }
}

/**
 * §2.3/#25. **Whether this candidate's recipe can be loaded on top of what is already loaded.**
 *
 * A feasibility test and not a cost: an over-budget candidate is not a worse assignment to be
 * ranked below the others, it is one the box cannot hold, so it never enters the candidate list
 * at all (§7.1) and `Score` never hears about it.
 *
 * Pruning here is sound *and* complete, and both halves rest on one fact: charges only grow as
 * the search descends. If a prefix is over a limit then so is every completion containing it, so
 * refusing the candidate throws away nothing feasible; and every feasible full assignment has
 * every prefix feasible, so nothing feasible is unreachable. Which order the requests are
 * decided in cannot matter either — feasibility is a property of the *set* of loaded things,
 * and a set has no order.
 *
 * A recipe naming a resource its device does not declare is refused rather than waved through.
 * `DeviceSchema` makes that unreachable for a validated manifest, and `AssignInput` takes device
 * objects a caller may build at runtime (#4), so the unvalidated case has to land somewhere —
 * and the honest direction is the gap, not a guide the box cannot hold (invariant 5).
 */
function fitsResources(ctx: Ctx, state: State, candidate: Candidate): boolean {
  const consumes = candidate.recipe.consumes
  if (consumes === undefined || consumes.length === 0) return true
  const declared = ctx.resources.get(candidate.deviceId)
  for (const use of consumes) {
    // Already loaded costs nothing to use again, and it is asked per consumption because that is
    // where identity lives: a cross-pool twin of a patch already in a slot loads nothing.
    const holder = holderKey(candidate.deviceId, use.resource, sharedAs(candidate.recipe, use))
    if ((state.resourceHolders.get(holder) ?? 0) > 0) continue
    const limit = declared?.get(use.resource)?.limit
    if (limit === undefined) return false
    const used = state.resourceUsed.get(resourceKey(candidate.deviceId, use.resource)) ?? 0
    if (used + (use.amount ?? 1) > limit) return false
  }
  return true
}

/**
 * §7.3/#25. The first resource this candidate cannot fit under, for the gap sentence. `undefined`
 * when it fits — the caller has already asked `fitsResources` and is here to name the reason.
 */
function exhaustedResource(
  ctx: Ctx,
  state: State,
  candidate: Candidate,
): { spec: ResourceSpec; used: number } | undefined {
  const declared = ctx.resources.get(candidate.deviceId)
  for (const use of candidate.recipe.consumes ?? []) {
    const holder = holderKey(candidate.deviceId, use.resource, sharedAs(candidate.recipe, use))
    if ((state.resourceHolders.get(holder) ?? 0) > 0) continue
    const spec = declared?.get(use.resource)
    if (spec === undefined) continue
    const used = state.resourceUsed.get(resourceKey(candidate.deviceId, use.resource)) ?? 0
    if (used + (use.amount ?? 1) > spec.limit) return { spec, used }
  }
  return undefined
}

/**
 * §4.2/#40. Every key the candidate occupies gets the same request id in every section the
 * request needs — which is where the one-request-to-many-assignables mapping actually happens,
 * and it needed no new shape to express (see `occupancy.ts`).
 *
 * `occupiedByDevice` gains one entry per member, so a stacked triad costs three against
 * `comfortableVoices`. That is deliberate and #40 named it as the thing not to soften: three
 * tracks really are spent, and a pad that costs as much as three parts is a true statement about
 * a monophonic box.
 */
function apply(ctx: Ctx, state: State, index: number, candidate: Candidate): void {
  const request = ctx.requests[index] as RoleRequest
  const sections = ctx.sections[index] ?? []
  const occupied = state.occupiedByDevice.get(candidate.deviceId)
  const before = occupied?.size ?? 0
  for (const key of candidate.keys) {
    let bySection = state.occupancy.get(key)
    if (bySection === undefined) {
      bySection = new Map()
      state.occupancy.set(key, bySection)
    }
    for (const section of sections) bySection.set(section, request.id)
    occupied?.add(key)
  }
  recount(ctx, state, candidate.deviceId, before, occupied?.size ?? 0)
  state.recipeDistance += candidate.distance
  state.sampledChords += candidate.sampledChord
  state.stackedChords += candidate.stacked
  state.roleFitPenalty += candidate.roleFit
  charge(state, candidate, 1)
  state.chosen[index] = candidate
}

function undo(ctx: Ctx, state: State, index: number, candidate: Candidate): void {
  const sections = ctx.sections[index] ?? []
  const occupied = state.occupiedByDevice.get(candidate.deviceId)
  const before = occupied?.size ?? 0
  for (const key of candidate.keys) {
    const bySection = state.occupancy.get(key)
    if (bySection === undefined) continue
    for (const section of sections) bySection.delete(section)
    if (bySection.size === 0) {
      state.occupancy.delete(key)
      // Only now does the assignable stop being occupied, and only then can the device's
      // occupied count fall. §12.4 counts assignables, not sections.
      occupied?.delete(key)
    }
  }
  recount(ctx, state, candidate.deviceId, before, occupied?.size ?? 0)
  state.recipeDistance -= candidate.distance
  state.sampledChords -= candidate.sampledChord
  state.stackedChords -= candidate.stacked
  state.roleFitPenalty -= candidate.roleFit
  charge(state, candidate, -1)
  state.chosen[index] = null
}

function applyMiss(ctx: Ctx, state: State, index: number): void {
  const request = ctx.requests[index] as RoleRequest
  // §4.4: `optional: true` removes a request from the miss objective entirely — filled if it
  // fits, dropped without complaint if not.
  if (request.optional === true) state.optionalMisses++
  else state.misses[request.priority - 1] = (state.misses[request.priority - 1] ?? 0) + 1
}

function undoMiss(ctx: Ctx, state: State, index: number): void {
  const request = ctx.requests[index] as RoleRequest
  if (request.optional === true) state.optionalMisses--
  else state.misses[request.priority - 1] = (state.misses[request.priority - 1] ?? 0) - 1
}

/**
 * §12.6. Requests sharing a role and carrying `distinct: true` may not land on the same
 * `deviceId`. A local authoring statement, made by the person who knows whether two toms are
 * meant to be two boxes — deliberately *not* a `Score` key, because inserting one silently
 * reorders every key beneath it.
 *
 * **Every other request is scanned, not only the ones below `index`.** This was two functions
 * until #340: the search looked backwards, because a later request could not have a device yet,
 * and classification looked everywhere, because it runs against a finished allocation where the
 * rule is symmetric. §7.5's placements ended the premise of the first — `greedy` settles the
 * placed requests before its pass, so a request *above* `index` can already hold a device, and
 * the backward scan let an earlier tom land on the box a later placed tom was already on. The
 * two readings only ever differed where one of them was wrong.
 *
 * It changes no search result. Inside the DFS every entry above `index` is `null` by
 * construction — `undo` clears one on the way out — so the extra half of the scan finds nothing
 * there, which `test/search-bound.test.ts` holds to by walking recorded node counts.
 */
function distinctBlocked(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  const request = ctx.requests[index] as RoleRequest
  if (request.distinct !== true) return false
  for (let i = 0; i < ctx.requests.length; i++) {
    if (i === index) continue
    const other = ctx.requests[i] as RoleRequest
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    if (other.distinct !== true || other.role !== request.role) continue
    if (taken.deviceId === candidate.deviceId) return true
  }
  return false
}

/** §4.2. Free in every section this request needs, on **every** voice the candidate takes. */
function isFree(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  for (const key of candidate.keys) {
    if (!keyIsFree(ctx, state, index, key)) return false
  }
  return true
}

function keyIsFree(ctx: Ctx, state: State, index: number, key: AssignableKey): boolean {
  const bySection = state.occupancy.get(key)
  if (bySection === undefined) return true
  // §4.2: conflict is same section, same assignable. Two transient requests in disjoint
  // sections share a voice quite legally, which is the whole reason occupancy is per-section.
  for (const section of ctx.sections[index] ?? []) {
    if (bySection.has(section)) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// §7.1 Symmetry breaking over pool ordinals
// ---------------------------------------------------------------------------

/**
 * Whether this assignable is carrying *anything* in the partial assignment, in any section.
 *
 * Distinct from `isFree`, which asks the narrower question "is it free in the sections *this*
 * request needs". A voice that is busy in Intro and free in Drop is `isFree` for a Drop-only
 * request and is emphatically not never-occupied: it already carries a part, and which part
 * that is makes it different from its idle siblings.
 */
function isOccupiedAnywhere(state: State, key: AssignableKey): boolean {
  const bySection = state.occupancy.get(key)
  return bySection !== undefined && bySection.size > 0
}

/**
 * Ordering within one pool: the ordinal numerically, then `voiceId` by code unit as the
 * tie-break. Numerically, because code units alone would rank `track-10` below `track-2` and
 * "lowest ordinal" would stop meaning what it says at count >= 10 — the Deluge has 24 tracks.
 * No `localeCompare` anywhere (invariant 6).
 */
function comparePoolMembers(a: Assignable, b: Assignable): number {
  const ordinalA = a.ordinal ?? 0
  const ordinalB = b.ordinal ?? 0
  if (ordinalA !== ordinalB) return ordinalA < ordinalB ? -1 : 1
  return compareCodeUnits(a.voiceId, b.voiceId)
}

/**
 * A NUL separator, so the two halves cannot run together however an id is spelled:
 * `a` + `b-c` and `a-b` + `c` are different groups and must produce different keys.
 */
function poolGroupKey(assignable: Assignable, poolId: string): string {
  return `${assignable.deviceId}\u0000${poolId}`
}

/**
 * §7.1. Pool members are interchangeable, and searching them as if they were not is what
 * drove realistic rigs with full-size pool devices into the node cap: with 8 idle Tracker
 * tracks, the
 * eight branches that put the kick on track-1..track-8 are the same assignment eight times
 * over, differing only in a name, and each of them re-explores the same subtree below.
 *
 * So: among the *never-occupied* members of one `(deviceId, poolId)`, keep only the lowest.
 * Every already-occupied member survives untouched.
 *
 * **Why this cannot change the optimum.** Take any solution extending the current partial
 * state that gives this request a never-occupied member `m`, and let `m*` be the lowest such
 * member. Swapping the two names throughout the remaining suffix produces another legal
 * solution — legal because both are idle in the current state, so neither swap can collide
 * with anything already assigned — and an identically scored one, because nothing the
 * objective or the constraints look at can tell the two apart:
 *
 *  - recipes key on `poolId ?? voiceId` (§2.2), so `distance` and `outcome` are per-pool;
 *  - `roles` is copied from the one authored pool voice, so `roleFit` is per-pool;
 *  - `polyphony` likewise, so legality for this and every later request is per-pool;
 *  - `crowdOverflow` and `idleDevices` count assignables and devices, never which ordinal;
 *  - `distinct` (§12.6) compares `deviceId`, so it cannot separate two members of one device.
 *
 * The swap is an involution, so it stays correct when the suffix uses both members. What the
 * prune does change is *which* concrete member the winner names — always the lowest free
 * ordinal now, never a seed-permuted one. That is a canonicalisation, not a loss: §7.2's seed
 * is meant to permute among meaningfully equal choices, and "Track 5 rather than Track 2" is
 * a difference in a label and nothing else.
 */
function breakPoolSymmetry(state: State, candidates: Candidate[]): Candidate[] {
  let hasPool = false
  for (const candidate of candidates) {
    if (soleAssignable(candidate).poolId !== undefined) {
      hasPool = true
      break
    }
  }
  if (!hasPool) return candidates

  const representative = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const assignable = soleAssignable(candidate)
    const poolId = assignable.poolId
    if (poolId === undefined) continue
    if (isOccupiedAnywhere(state, candidate.keys[0] as AssignableKey)) continue
    const group = poolGroupKey(assignable, poolId)
    const current = representative.get(group)
    if (
      current === undefined ||
      comparePoolMembers(assignable, soleAssignable(current)) < 0
    ) {
      representative.set(group, candidate)
    }
  }

  return candidates.filter((candidate) => {
    const assignable = soleAssignable(candidate)
    const poolId = assignable.poolId
    if (poolId === undefined) return true
    if (isOccupiedAnywhere(state, candidate.keys[0] as AssignableKey)) return true
    return representative.get(poolGroupKey(assignable, poolId)) === candidate
  })
}

/**
 * The one voice a single-voice candidate takes. Stacks are canonical by construction (see
 * `chooseStackMembers`) and never reach `breakPoolSymmetry`, so this is total where it is called.
 */
function soleAssignable(candidate: Candidate): Assignable {
  return candidate.assignables[0] as Assignable
}

// ---------------------------------------------------------------------------
// §12.4/#40 Stacks
// ---------------------------------------------------------------------------

/**
 * Which members of the pool this stack takes, or `undefined` when too few are free.
 *
 * **One member set per plan per node, not every combination**, and that is a bound decision of
 * the same kind as `DEFAULT_NODE_CAP` rather than an oversight. Enumerating the subsets would be
 * `C(8, 3) = 56` branches per pool per request on a Tracker Mini, re-explored at every level
 * below — the exact blow-up `breakPoolSymmetry` exists to prevent — for a choice that is, in
 * almost every case, provably not a choice at all.
 *
 * Two orderings, and they are picked for different reasons:
 *
 *  - **Already-occupied members first.** A member busy in some *other* section costs no new
 *    occupied assignable, where a never-occupied one costs one — so reuse can only help
 *    `crowdOverflow`, which outranks `stackedChords`, and it leaves a fully-free member for a
 *    later request rather than consuming it. Weakly dominant, so preferring it cannot lose the
 *    optimum on this request.
 *  - **Then lowest ordinal.** Among never-occupied members this is exactly
 *    `breakPoolSymmetry`'s argument, unchanged: pool members are interchangeable in everything
 *    the objective and the constraints can see, so taking the lowest `n` is a canonicalisation
 *    and not a loss.
 *
 * **Where it is a restriction rather than a canonicalisation**, stated rather than glossed: two
 * members already occupied in *different* sections are distinguishable, and choosing between
 * them by ordinal could in principle cost a later transient request its voice. That needs a
 * request of more than one note that is also `transient`, which no template authors today —
 * a continuous request occupies every section, so every member occupied anywhere is already
 * excluded by `keyIsFree` and the whole question is empty. It is written down here because the
 * day a template does author one, this is the comment that says what to re-derive.
 */
function chooseStackMembers(
  ctx: Ctx,
  state: State,
  index: number,
  plan: StackPlan,
): Assignable[] | undefined {
  const eligible = plan.members.filter((m) => keyIsFree(ctx, state, index, assignableKey(m)))
  if (eligible.length < plan.width) return undefined
  const taken = [...eligible]
    .sort((a, b) => {
      const busyA = isOccupiedAnywhere(state, assignableKey(a)) ? 0 : 1
      const busyB = isOccupiedAnywhere(state, assignableKey(b)) ? 0 : 1
      return busyA - busyB || comparePoolMembers(a, b)
    })
    .slice(0, plan.width)
  // Re-sorted into reading order whatever order they were picked in, because the guide hands the
  // lowest note to the lowest voice (§8 phase 4) and that instruction has to be stable.
  return taken.sort(comparePoolMembers)
}

function materialiseStacks(ctx: Ctx, state: State, index: number): Candidate[] {
  const out: Candidate[] = []
  for (const plan of ctx.stacks[index] ?? []) {
    const members = chooseStackMembers(ctx, state, index, plan)
    if (members === undefined) continue
    out.push({
      assignables: members,
      keys: members.map(assignableKey),
      deviceId: plan.deviceId,
      recipe: plan.recipe,
      outcome: plan.outcome,
      recipeCharacter: plan.recipeCharacter,
      distance: plan.distance,
      sampledChord: plan.sampledChord,
      stacked: plan.stacked,
      roleFit: plan.roleFit,
    })
  }
  return out
}

/**
 * §7.2: "Candidates sort by `(score, deviceId, voiceId)`, with `score` compared
 * lexicographically — fully deterministic. The seed only permutes among exactly equal scores."
 *
 * The score used here is the partial vector that *would* result from taking the candidate.
 * Misses are identical across candidates at one node, so this ranks them by exactly the keys
 * that differ: crowding first, then recipe quality, then role fit, then idleness.
 */
function orderedCandidates(ctx: Ctx, state: State, index: number): Candidate[] {
  const free = (ctx.voiceable[index] ?? []).filter(
    (c) =>
      isFree(ctx, state, index, c) &&
      !distinctBlocked(ctx, state, index, c) &&
      // §2.3/#25. A recipe the box has no slot left to load is not a candidate — feasibility,
      // not cost, so it is filtered here rather than ranked below its siblings.
      fitsResources(ctx, state, c),
  )
  // Symmetry breaking runs on the legal set, not on the whole pool: a member excluded here by
  // occupancy or by `distinct` is not a candidate to be represented by anything.
  //
  // Stacks are appended after it rather than passed through it: they are already canonical in
  // their pool (`chooseStackMembers`), and a stack is not a pool member that could stand in for
  // one. `isFree` holds for them by construction; `distinct` (§12.6) still has to be asked,
  // because a stack names a device like anything else.
  const legal = [
    ...breakPoolSymmetry(state, free),
    ...materialiseStacks(ctx, state, index).filter(
      (c) => !distinctBlocked(ctx, state, index, c) && fitsResources(ctx, state, c),
    ),
  ]
  if (legal.length < 2) return legal

  const scored = legal.map((candidate) => {
    apply(ctx, state, index, candidate)
    const score = scoreOf(ctx, state)
    undo(ctx, state, index, candidate)
    return { candidate, score }
  })

  // §7.2's `(score, deviceId, voiceId)`, with the width of the candidate as a final tie-break so
  // the order is total even in principle: a single and a stack starting on the same voice always
  // differ on `stackedChords` and so never reach it, but a sort that depends on input order for
  // its answer is not a sort this file is allowed to have.
  scored.sort(
    (a, b) =>
      compareScore(a.score, b.score) ||
      compareCodeUnits(a.candidate.deviceId, b.candidate.deviceId) ||
      compareCodeUnits(
        (a.candidate.assignables[0] as Assignable).voiceId,
        (b.candidate.assignables[0] as Assignable).voiceId,
      ) ||
      a.candidate.assignables.length - b.candidate.assignables.length,
  )

  // Permute within exactly-equal-score runs only. Everything else keeps the deterministic
  // (deviceId, voiceId) order it was just given.
  const request = ctx.requests[index] as RoleRequest
  const nodeSeed = (hash32(request.id) ^ (ctx.seed >>> 0)) >>> 0
  const out: Candidate[] = []
  let runStart = 0
  for (let i = 1; i <= scored.length; i++) {
    const endOfRun =
      i === scored.length ||
      compareScore((scored[i] as { score: Score }).score, (scored[runStart] as { score: Score }).score) !== 0
    if (!endOfRun) continue
    const run = scored.slice(runStart, i).map((s) => s.candidate)
    out.push(...(run.length > 1 ? seededShuffle(run, nodeSeed + runStart) : run))
    runStart = i
  }
  return out
}

// ---------------------------------------------------------------------------
// The search
// ---------------------------------------------------------------------------

type Solution = { score: Score; chosen: (Candidate | null)[] }

function snapshot(ctx: Ctx, state: State): Solution {
  return { score: scoreOf(ctx, state), chosen: [...state.chosen] }
}

/**
 * §7.1/#159. An optional observer on the DFS, and the **only** thing the shipped traversal does
 * differently when one is attached: two calls at points it already passes through.
 *
 * It exists because #159 asked two questions about this search that could not be answered from
 * the outside — how often a state is reached twice, and where the nodes actually go — and the
 * answers pointed somewhere neither of that issue's proposals did. `SearchReport` carries what a
 * *guide* needs; this carries what a person changing the search needs, and only when asked.
 *
 * Never reachable from `assign`. `measureSearchShape` is the one way in and is named so nobody
 * arrives at it by accident.
 */
type SearchProbe = {
  /** Every node, at the point `nodes` is incremented, before the bound is consulted. */
  onNode: (index: number, state: State) => void
  /** The node was abandoned by `lowerBound` without expanding. */
  onBounded: () => void
  /** A complete assignment was reached. */
  onLeaf: () => void
}

function search(
  ctx: Ctx,
  probe?: SearchProbe,
): { best: Solution | undefined; nodes: number; capped: boolean } {
  const state = emptyState(ctx)
  let best: Solution | undefined
  let nodes = 0
  let capped = false

  function dfs(index: number): void {
    if (capped) return
    // Checked before the increment, so `nodes` reports what was actually visited and never
    // overshoots the cap it is being compared against.
    if (nodes >= ctx.nodeCap) {
      capped = true
      return
    }
    nodes++
    probe?.onNode(index, state)

    if (best !== undefined && compareScore(lowerBound(ctx, state, index), best.score) >= 0) {
      probe?.onBounded()
      return
    }

    if (index === ctx.requests.length) {
      probe?.onLeaf()
      const score = scoreOf(ctx, state)
      if (best === undefined || compareScore(score, best.score) < 0) best = snapshot(ctx, state)
      return
    }

    for (const candidate of orderedCandidates(ctx, state, index)) {
      apply(ctx, state, index, candidate)
      dfs(index + 1)
      undo(ctx, state, index, candidate)
      if (capped) return
    }

    // §7.5/#340. A placed request has no miss branch. The reader said this part goes on that
    // box, and an allocation that leaves it out has not honoured the placement — it has quietly
    // decided the reader was wrong. `resolvePlacements` accepted it only after proving the
    // placed set can be honoured together, so refusing the branch cannot empty the search.
    if (ctx.placedOn[index] !== undefined) return

    // The miss branch is explored last: filling is usually better, so taking it first would
    // delay a good incumbent and weaken every bound below. It is explored at all because
    // leaving a low-priority part out can genuinely beat crowding a box to fit it.
    applyMiss(ctx, state, index)
    dfs(index + 1)
    undoMiss(ctx, state, index)
  }

  dfs(0)
  return { best, nodes, capped }
}

// ---------------------------------------------------------------------------
// §7.1/#159 Measuring the shape of a search
// ---------------------------------------------------------------------------

/**
 * A canonical spelling of everything the *remaining* search can depend on at one node.
 *
 * Two nodes with the same string are the same sub-problem: the suffix explores identically from
 * both, so one is work the other already did. That is the question #159 item 2 asked, and this
 * is what answers it — it is a measuring instrument, not a cache key, and nothing consults it to
 * decide anything.
 *
 * Three parts, and each is exactly what a rule downstream actually reads:
 *
 *  - **`index`**, because the same occupancy at two depths faces different requests.
 *  - **Occupancy per assignable per section, without the request ids stored in it.** `keyIsFree`
 *    asks which sections of an assignable are taken and never by whom, so carrying the holder
 *    would split states the search cannot tell apart.
 *  - **The prior same-role `distinct` device choices** (§12.6), carried by hand because a device
 *    can be busy from a request that rule does not touch, and as a *set* because
 *    `distinctBlocked` asks membership and never a count or an order.
 *  - **What is loaded against a device budget** (§2.3/#25) — the `(device, resource, sharing
 *    key)` triples, as a *set* and not as counts, for the same reason: `fitsResources` asks
 *    whether a thing is already loaded and derives every budget total from the same membership,
 *    so two nodes holding one patch once and twice face an identical remaining search. Keyed on
 *    the sharing key rather than the recipe id, or two nodes loading one patch through its two
 *    cross-pool records would spell differently while facing the same search. Empty for every rig
 *    whose devices declare no resources, which leaves this spelling byte-identical to the pre-#25
 *    one on every rig in the library.
 *
 * `occupiedByDevice` is deliberately absent: every `AssignableKey` is `${deviceId}/${voiceId}`,
 * so the per-device counts `crowdOverflow` reads are a function of the occupancy already here.
 * `derivedOccupiedCounts` rebuilds them and the probe checks that against the live map at every
 * node, so the redundancy is verified rather than asserted.
 *
 * Pieces are length-prefixed as `<length>:<text>` rather than joined by a separator. Picking a
 * character no id could contain is not available: `DeviceId`, `RequestId` and `SectionName` are
 * bare `string`, and `AssignInput` takes device objects a caller may build at runtime (#4). A
 * spelling that is unambiguous only while the data stays polite would silently merge two states.
 */
function piece(text: string): string {
  return `${String(text.length)}:${text}`
}

function canonicalState(ctx: Ctx, state: State, index: number): string {
  const parts: string[] = [piece(String(index))]

  const keys = [...state.occupancy.keys()].sort(compareCodeUnits)
  for (const key of keys) {
    const sections = state.occupancy.get(key)
    if (sections === undefined || sections.size === 0) continue
    const names = [...sections.keys()].sort(compareCodeUnits)
    parts.push(piece(key), piece(String(names.length)))
    for (const name of names) parts.push(piece(name))
  }

  // §12.6. Only the requests the rule relates, and only the device each landed on.
  parts.push(piece('|distinct'))
  const distinct = new Set<string>()
  for (let i = 0; i < index; i++) {
    const request = ctx.requests[i] as RoleRequest
    if (request.distinct !== true) continue
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    distinct.add(`${request.role}/${taken.deviceId}`)
  }
  for (const entry of [...distinct].sort(compareCodeUnits)) parts.push(piece(entry))

  // §2.3/#25. The loaded set, which is not derivable from occupancy: two nodes can occupy the
  // same voices in the same sections and differ on which patches are loaded behind them.
  parts.push(piece('|resources'))
  const loaded: string[] = []
  for (const [key, holders] of state.resourceHolders) if (holders > 0) loaded.push(key)
  for (const entry of loaded.sort(compareCodeUnits)) parts.push(piece(entry))

  return parts.join('')
}

/** The per-device occupied counts, rebuilt from occupancy alone. See `canonicalState`. */
function derivedOccupiedCounts(ctx: Ctx, state: State): Map<DeviceId, number> {
  const counts = new Map<DeviceId, number>(ctx.deviceIds.map((id) => [id, 0]))
  for (const [key, sections] of state.occupancy) {
    if (sections.size === 0) continue
    const deviceId = key.slice(0, key.indexOf('/'))
    counts.set(deviceId, (counts.get(deviceId) ?? 0) + 1)
  }
  return counts
}

/** §7.1/#159. Where a search's nodes go, and how much of it is work already done. */
export type SearchShape = {
  /** Nodes visited. Equal to `search.nodes` by construction — the probe sits at the increment. */
  visited: number
  /** Nodes `lowerBound` abandoned without expanding. */
  bounded: number
  /** Nodes that went on to expand children. */
  expanded: number
  /** Complete assignments reached. */
  leaves: number
  /** Distinct canonical states among the nodes visited. */
  unique: number
  /** Arrivals at a state already seen — what a memo on this key could have answered. */
  repeats: number
  /** Nodes at which `occupiedByDevice` was confirmed derivable from occupancy. */
  checks: number
  /** The ordinary report for the same run, so a probe run is comparable to a shipped one. */
  search: SearchReport
}

/**
 * §7.1's search, run once with the probe attached, on exactly the `AssignInput` a guide uses.
 *
 * `nodeCap` is honoured, so measuring a worst case means lifting it deliberately rather than
 * getting a silent report of the cap. Nothing in the pipeline calls this; `assign` does not know
 * it exists.
 *
 * **What it found, and why the search is the shape it is.** On `industrial-techno` seed 9 over
 * the nineteen-device rig — §7.1's worst case — 86.4% of nodes are abandoned by `lowerBound` on
 * arrival, and a complete assignment is reached **seven times** in 165,785 nodes. Of the 22,508
 * nodes that do expand, 62 ever find a completion beneath them.
 *
 * That reinterprets the 65.9% state-repeat rate this same probe measures. The repeats are real,
 * but they are repeated arrivals at *pruned* states rather than at solved sub-problems, so a
 * cache of completions has almost nothing to answer them with — which is what the prototype at
 * `origin/spike/search-memo-measured` measured directly, saving 0.4% of nodes at 2.2x the wall
 * clock. The cost of this search is `lowerBound`, evaluated at nodes that never expand. Anything
 * meant to make it cheaper should be measured against that rather than against redundant work.
 *
 * §7.5/#340's placements are not applied here. What this measures is what a rig and a direction
 * cost the search, and a placement only ever removes candidates from that — so the figure with
 * none applied is the one to read, and the only one `measure:search` reports.
 */
export function measureSearchShape(input: AssignInput): SearchShape {
  const ctx = buildCtx(input)
  const seen = new Set<string>()
  let visited = 0
  let bounded = 0
  let leaves = 0
  let repeats = 0
  let checks = 0

  const outcome = search(ctx, {
    onNode: (index, state) => {
      visited++
      const key = canonicalState(ctx, state, index)
      if (seen.has(key)) repeats++
      else seen.add(key)

      // The claim `canonicalState` rests on, checked rather than asserted.
      const derived = derivedOccupiedCounts(ctx, state)
      for (const id of ctx.deviceIds) {
        if ((derived.get(id) ?? 0) !== (state.occupiedByDevice.get(id)?.size ?? 0)) {
          throw new Error(`occupiedByDevice is not derivable from occupancy at ${id}`)
        }
      }
      // And the same claim for the two scalars `apply`/`undo` carry: they are a cache of these
      // scans, so the scans decide whether the cache is still telling the truth. Checked here
      // and not in a fixture because the failure to catch is an incremental update that is right
      // everywhere a hand-written rig goes and wrong at one node of a real search.
      if (state.crowd !== crowdOverflowFrom(ctx, state)) {
        throw new Error(`state.crowd drifted from the occupancy at index ${String(index)}`)
      }
      if (state.idle !== idleDevicesFrom(ctx, state)) {
        throw new Error(`state.idle drifted from the occupancy at index ${String(index)}`)
      }
      checks++
    },
    onBounded: () => {
      bounded++
    },
    onLeaf: () => {
      leaves++
    },
  })

  return {
    visited,
    bounded,
    expanded: visited - bounded,
    leaves,
    unique: seen.size,
    repeats,
    checks,
    search: {
      nodes: outcome.nodes,
      nodeCap: ctx.nodeCap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
  }
}

/**
 * §7.1's fallback: one pass, best candidate at each step, no backtracking. Deterministic on
 * the same ordering — and on the same seed — as the exhaustive search.
 *
 * §7.5/#340 adds a pass in front of it. The placed requests are settled first, by the same
 * backtracking check that accepted them, because greedy cannot back out of a voice: filling in
 * request order would let an unplaced part take a placed part's only voice, and the fallback
 * would print a guide that ignores a placement the resolver said it had accepted. Everything
 * after that is the one pass it always was, over the requests the first pass left alone.
 *
 * It cannot fail here. `resolvePlacements` ran the same function over the same placements on a
 * ctx whose only difference is the candidates on *other* devices, which `placeAll` skips anyway —
 * so the two explore the same space and the acceptance is the proof that this one succeeds.
 */
function greedy(ctx: Ctx): Solution {
  const state = emptyState(ctx)
  const placed = placedPins(ctx)
  if (placed.length > 0) placeAll(ctx, state, placed, 0)
  for (let index = 0; index < ctx.requests.length; index++) {
    if (state.chosen[index] !== null) continue
    const candidate = orderedCandidates(ctx, state, index)[0]
    if (candidate === undefined) applyMiss(ctx, state, index)
    else apply(ctx, state, index, candidate)
  }
  return snapshot(ctx, state)
}

// ---------------------------------------------------------------------------
// §7.3 Gaps
// ---------------------------------------------------------------------------

/**
 * Which assignable, in the winning allocation, the guide should point at when it explains a
 * `no-room` gap. Deterministic: the voiceable candidates are already in (deviceId, voiceId)
 * order, so this is the first one, never an arbitrary one.
 */
function firstWhere(
  candidates: readonly Candidate[],
  predicate: (c: Candidate) => boolean,
): Candidate | undefined {
  for (const candidate of candidates) if (predicate(candidate)) return candidate
  return undefined
}

/**
 * §7.3. Classified against the **winning allocation**, not against candidate existence: the
 * question a gap answers is "why did this part not get made", and that is a fact about the
 * assignment that won, not about what was theoretically reachable at the start.
 *
 * The sub-causes of `no-room` are checked in an order derived from the objective rather than
 * chosen by taste:
 *
 *  - A candidate that is **free and distinct-legal** in the finished allocation could have
 *    been taken without displacing anyone, so the only key that can have argued against it is
 *    `crowdOverflow` — the one key ranking above `optionalMisses`. That is crowding.
 *  - Otherwise, if a candidate is free but the `distinct` rule (§12.6) forbids it, that rule
 *    is what is binding.
 *  - Otherwise every candidate is carrying something else, which is contention.
 *
 * `resource` (§2.3/#25) sits between the first two: a candidate free and distinct-legal that the
 * box still cannot load a patch for is not crowded, and calling it crowding would print a false
 * number about a box well inside its comfortable voices.
 */
function classify(ctx: Ctx, state: State, index: number): Gap {
  const request = ctx.requests[index] as RoleRequest
  const roleOnly = ctx.roleOnly[index] ?? []
  const capable = ctx.capable[index] ?? []
  const voiceable = ctx.voiceable[index] ?? []
  const base = {
    requestId: request.id,
    role: request.role,
    character: ctx.wanted[index] as Character,
    priority: request.priority,
    optional: request.optional === true,
  }

  // Nothing can carry it. §12.4 split this in two, because the two have different fixes: no
  // voice plays the role (buy a box), or voices play it and cannot reach the note count (author
  // a `sampled-chord` recipe, or ask for fewer notes). Reported apart rather than merged, since
  // a reader told the wrong one goes shopping for the wrong thing.
  if (capable.length === 0) {
    return {
      ...base,
      reason: 'no-capable-voice',
      because: roleOnly.length === 0 ? 'no-such-role' : 'polyphony',
      notes: request.polyphony ?? 1,
      capable: [],
      roleVoices: roleOnly,
    }
  }
  // "Your TR-1000 BD can do it — dial it by ear." The fix is authoring, not buying.
  if (voiceable.length === 0) {
    return { ...base, reason: 'no-recipe', capable }
  }

  // Every voice every candidate would have taken, stacks flattened: "could have carried this
  // part" is a claim about voices, and a stack's three are three of them.
  const named = voiceable.flatMap((c) => [...c.assignables])
  const free = firstWhere(voiceable, (c) => isFree(ctx, state, index, c))

  const freeAndLegal = firstWhere(
    voiceable,
    (c) =>
      isFree(ctx, state, index, c) &&
      !distinctBlocked(ctx, state, index, c) &&
      fitsResources(ctx, state, c),
  )
  if (freeAndLegal !== undefined) {
    const deviceId = freeAndLegal.deviceId
    const occupied = state.occupiedByDevice.get(deviceId)?.size ?? 0
    return {
      ...base,
      reason: 'no-room',
      capable: named,
      because: 'crowding',
      detail: `your ${ctx.deviceById.get(deviceId)?.name ?? deviceId} is already at ${occupied} of ${ctx.comfortable.get(deviceId) ?? occupied} comfortable voices`,
    }
  }

  /**
   * §2.3/#25. A voice was free and legal and the box still could not take the part, because the
   * patch had nowhere to load. Checked ahead of `distinct` and after `crowding`, in the order the
   * three become binding: if any candidate is free, distinct-legal *and* loadable, crowding is
   * what argued against it; if one is free and distinct-legal and only the budget refused it,
   * that budget is the binding thing and saying "crowding" here would be a false sentence about a
   * box sitting well inside its comfortable voices.
   */
  const starved = firstWhere(
    voiceable,
    (c) => isFree(ctx, state, index, c) && !distinctBlocked(ctx, state, index, c),
  )
  if (starved !== undefined) {
    const short = exhaustedResource(ctx, state, starved)
    const deviceName = ctx.deviceById.get(starved.deviceId)?.name ?? starved.deviceId
    return {
      ...base,
      reason: 'no-room',
      capable: named,
      because: 'resource',
      detail:
        short === undefined
          ? `your ${deviceName} cannot load another patch for this part`
          : `your ${deviceName} has ${short.spec.limit} ${short.spec.label} and ${short.used} are already loaded`,
    }
  }

  if (free !== undefined) {
    const devices = new Set(named.map((a) => a.deviceId)).size
    return {
      ...base,
      reason: 'no-room',
      capable: named,
      because: 'distinct',
      detail: `this ${request.role} must sit on a different device from the other ${request.role}, and only ${devices} in your rig can carry it`,
    }
  }

  // Every candidate is occupied. Name the first one and what it is carrying.
  const blocker = voiceable[0] as Candidate
  const held = firstOccupant(ctx, state, index, blocker)
  const holder = ctx.requests.find((r) => r.id === held?.request)
  const deviceName = ctx.deviceById.get(blocker.deviceId)?.name ?? blocker.deviceId
  const label = held?.assignable.label ?? (blocker.assignables[0] as Assignable).label
  return {
    ...base,
    reason: 'no-room',
    capable: named,
    because: 'contended',
    detail: `the ${deviceName} ${label} is carrying ${holder?.role ?? held?.request ?? 'another part'}`,
  }
}

/**
 * The first voice of this candidate that is already taken, and by which request — scanning the
 * candidate's voices in order, then the sections we needed. For a stack, naming the member that
 * is actually blocked beats naming the first one and hoping it is the same voice.
 */
function firstOccupant(
  ctx: Ctx,
  state: State,
  index: number,
  candidate: Candidate,
): { assignable: Assignable; request: RequestId } | undefined {
  for (let i = 0; i < candidate.keys.length; i++) {
    const bySection = state.occupancy.get(candidate.keys[i] as AssignableKey)
    if (bySection === undefined) continue
    for (const section of ctx.sections[index] ?? []) {
      const holder = bySection.get(section)
      if (holder !== undefined) {
        return { assignable: candidate.assignables[i] as Assignable, request: holder }
      }
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// §7.5/#340 Placements
// ---------------------------------------------------------------------------

/** A placement that named a real request, resolved to that request's index in `ctx.requests`. */
type Pin = { index: number; deviceId: DeviceId }

/**
 * §7.5/#340. **Puts every placement on the box it names, all at once, or answers that there is no
 * way to.** Exhaustive: it tries every legal candidate at every placement and only answers `false`
 * once it has run out, so a `false` is a proof and not a budget running down. A refusal is a claim
 * about the reader's rig, and a search that stopped early cannot support one.
 *
 * On success the placements are left applied to `state`, which is what `greedy` wants;
 * `resolvePlacements` hands it a state it then throws away. On failure it unwinds completely.
 *
 * `orderedCandidates` is the one candidate path, rather than a second copy of "free, distinct,
 * loadable" written for this — occupancy (§4.2), `distinct` (§12.6) and the resource budget
 * (§2.3/#25) are exactly the constraints that decide whether two placements can hold together,
 * and a check that re-derived them could disagree with the search that runs afterwards.
 *
 * Crowding is deliberately *not* a constraint here: it is a `Score` key, and a reader may crowd a
 * box on purpose. Feasibility asks what is possible, not what is comfortable.
 *
 * **What it costs.** Depth is the number of placements, which cannot exceed the direction's
 * requests; branching is one device's legal candidates for one request, with free pool members
 * already collapsed to a representative by `breakPoolSymmetry`. Unplaced requests are not
 * modelled at all. A rig somebody owns settles this in tens of steps. If a pathological set of
 * placements on one many-voiced box ever made it slow, the repair is to memoise the states it
 * proved infeasible, which keeps the answer exact — not to stop early, which cannot.
 */
function placeAll(ctx: Ctx, state: State, pins: readonly Pin[], at: number): boolean {
  if (at === pins.length) return true
  const pin = pins[at] as Pin
  for (const candidate of orderedCandidates(ctx, state, pin.index)) {
    if (candidate.deviceId !== pin.deviceId) continue
    apply(ctx, state, pin.index, candidate)
    if (placeAll(ctx, state, pins, at + 1)) return true
    undo(ctx, state, pin.index, candidate)
  }
  return false
}

/**
 * §7.5/#340. The accepted placements as `placeAll` takes them, in request order — which is
 * precedence order (§4.4, then §7.2's code units), because `ctx.requests` is sorted that way.
 */
function placedPins(ctx: Ctx): Pin[] {
  const pins: Pin[] = []
  ctx.placedOn.forEach((deviceId, index) => {
    if (deviceId !== undefined) pins.push({ index, deviceId })
  })
  return pins
}

/**
 * §7.5/#340/§7.3. Why this box cannot make this part, or `undefined` when it can. The three
 * causes are §7.3's own, asked of one device instead of of the whole rig, and they are told apart
 * because the reader's next move differs: buy something, ask for fewer notes, or wait for us to
 * author the recipe (§3.5, #31).
 */
function whyCannotServe(ctx: Ctx, index: number, deviceId: DeviceId): string | undefined {
  if ((ctx.voiceable[index] ?? []).some((c) => c.deviceId === deviceId)) return undefined
  if ((ctx.stacks[index] ?? []).some((plan) => plan.deviceId === deviceId)) return undefined

  const request = ctx.requests[index] as RoleRequest
  const name = ctx.deviceById.get(deviceId)?.name ?? deviceId
  const here = (list: readonly Assignable[]) => list.some((a) => a.deviceId === deviceId)
  if (!here(ctx.roleOnly[index] ?? [])) return `your ${name} has no voice that plays ${request.role}`
  if (!here(ctx.capable[index] ?? [])) {
    const notes = request.polyphony ?? 1
    return `no voice on your ${name} can sound ${String(notes)} notes of ${request.role} at once`
  }
  return `nobody has written a ${ctx.wanted[index] as Character} ${request.role} for your ${name} yet`
}

/**
 * §7.5/#340. **Which placements the search runs under, and what to tell the reader about the
 * rest.** Decided against a `ctx` built with no placement applied, so every answer here is about
 * the rig and the direction rather than about an already-constrained search.
 *
 * **Order is imposed before anything is decided.** A permalink's field order must not settle a
 * musical outcome — two links carrying the same set of placements have to produce the same guide
 * (invariant 6) — so the list is sorted by the request's own priority (§4.4, ascending, most
 * important first), then by request id in UTF-16 code unit order (§7.2), then by device id.
 * Nothing below reads the caller's array again.
 *
 * That order is also the conflict rule. Each placement in turn is accepted if it can be honoured
 * alongside the ones already accepted, so **the more important part keeps the box** and a part
 * that cannot fit beside it is refused and falls back to the ranking. A refusal does not stop the
 * walk: the placements after it are still considered, and one that fits is still accepted. So the
 * accepted set is the precedence-ordered greedy subset, not a prefix of the order.
 *
 * It is not the *largest* set that could have been honoured, and that is the intended trade.
 * Refusing one important placement can sometimes make room for two unimportant ones, and taking
 * that deal would mean a part the reader cares about moves because two they care less about
 * outvoted it. Precedence decides, and the count follows from it.
 *
 * The same request named twice is one statement rather than two: an exact repeat collapses, and a
 * second device for a request already placed conflicts with the first and is refused, rather than
 * silently overriding it.
 */
function resolvePlacements(
  ctx: Ctx,
  asked: readonly Placement[],
): { report: PlacementReport; accepted: Map<RequestId, DeviceId> } {
  const indexOf = new Map<RequestId, number>()
  ctx.requests.forEach((request, index) => indexOf.set(request.id, index))
  const priorityOf = (requestId: RequestId): number => {
    const index = indexOf.get(requestId)
    // An unknown request has no priority to sort by. It is refused whatever it sorts next to;
    // this only settles where its refusal appears in the report.
    if (index === undefined) return Number.MAX_SAFE_INTEGER
    return (ctx.requests[index] as RoleRequest).priority
  }

  const seen = new Set<string>()
  const ordered = [...asked]
    .filter((placement) => {
      const key = `${placement.requestId}\u0000${placement.deviceId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort(
      (a, b) =>
        priorityOf(a.requestId) - priorityOf(b.requestId) ||
        compareCodeUnits(a.requestId, b.requestId) ||
        compareCodeUnits(a.deviceId, b.deviceId),
    )

  const accepted: Placement[] = []
  const pins: Pin[] = []
  const refused: RefusedPlacement[] = []
  const deviceName = (deviceId: DeviceId): string => ctx.deviceById.get(deviceId)?.name ?? deviceId

  for (const placement of ordered) {
    const index = indexOf.get(placement.requestId)
    if (index === undefined) {
      refused.push({
        ...placement,
        because: 'unknown-request',
        detail: `this direction has no part called '${placement.requestId}'`,
      })
      continue
    }
    if (!ctx.deviceById.has(placement.deviceId)) {
      refused.push({
        ...placement,
        because: 'device-not-in-rig',
        detail: `'${placement.deviceId}' is not one of the boxes in this rig`,
      })
      continue
    }
    const already = pins.find((pin) => pin.index === index)
    if (already !== undefined) {
      refused.push({
        ...placement,
        because: 'conflicted',
        detail: `this part is already placed on your ${deviceName(already.deviceId)}`,
      })
      continue
    }
    const cannot = whyCannotServe(ctx, index, placement.deviceId)
    if (cannot !== undefined) {
      refused.push({ ...placement, because: 'cannot-serve', detail: cannot })
      continue
    }

    const pin: Pin = { index, deviceId: placement.deviceId }
    // A throwaway state: `placeAll` leaves its answer applied, and what is wanted here is the
    // answer rather than the allocation. The final search builds its own.
    if (placeAll(ctx, emptyState(ctx), [...pins, pin], 0)) {
      pins.push(pin)
      accepted.push(placement)
      continue
    }
    /**
     * The box could have made this part; what it cannot do is make it *here*. Two different
     * sentences, told apart by whether anything the reader placed is in the way:
     *
     *  - Something is. Name it, because the trade is the thing to tell the reader (#340) — and
     *    it is a conflict between two placements, which is what `conflicted` means.
     *  - Nothing is, and the box still refuses it standing empty. §2.3/#25's budget is the only
     *    thing that does that: a voice is free, and the patch has nowhere to load. Reported as
     *    `cannot-serve`, since calling it a conflict would name a rival that does not exist.
     */
    const holders = pins
      .filter((other) => other.deviceId === placement.deviceId)
      .map((other) => (ctx.requests[other.index] as RoleRequest).role)
    if (holders.length === 0) {
      refused.push({
        ...placement,
        because: 'cannot-serve',
        detail: `your ${deviceName(placement.deviceId)} cannot load a patch for this part`,
      })
      continue
    }
    refused.push({
      ...placement,
      because: 'conflicted',
      detail: `your ${deviceName(placement.deviceId)} cannot carry this as well as the ${holders.join(', ')} you placed there`,
    })
  }

  return {
    report: { accepted, refused },
    accepted: new Map(accepted.map((one) => [one.requestId, one.deviceId])),
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export type AssignInput = {
  /**
   * Objects, never ids (#4): the caller resolves them, so a device that exists only at
   * runtime — a user overlay, a row from a database — resolves without a redeploy.
   */
  devices: readonly Device[]
  template: Template
  mood: MoodState
  seed: number
  /**
   * §7.5/#340. The reader's placements, in whatever order they were written down. Order carries
   * no meaning here and must not: `resolvePlacements` sorts before it decides anything, so two
   * links expressing the same set resolve to the same bytes (invariant 6).
   */
  placements?: readonly Placement[]
  nodeCap?: number
}

/** §7 step 6. Search assignments against the lexicographic objective, producing `Occupancy`. */
export function assign(input: AssignInput): AssignmentResult {
  return assignWith(input, true)
}

/**
 * §7.5/#340. One build of the ctx for a guide with no placements, and two for one that has them:
 * the first with nothing applied, which is what `resolvePlacements` has to judge them against,
 * and the second under the ones it accepted.
 *
 * The zero-placement path is the *same* single call it always was, and that is a requirement
 * rather than an optimisation — `RESOLVER_VERSION` did not move at #340, so a link carrying no
 * placement has to reach the search having touched none of this.
 */
function assignWith(input: AssignInput, repair: boolean): AssignmentResult {
  const asked = input.placements ?? []
  const base = buildCtx(input, repair)
  if (asked.length === 0) return assignFrom(base, { accepted: [], refused: [] })
  const { report, accepted } = resolvePlacements(base, asked)
  const ctx = accepted.size === 0 ? base : buildCtx(input, repair, accepted)
  return assignFrom(ctx, report)
}

/**
 * §7.1/#78. `assign` with `liveFloor`'s matching repair switched off — **the floor exactly as it
 * stood before the repair, and a test-only door**, named like `measureSearchShape` so nobody
 * arrives at it by accident and reachable from `assign` never.
 *
 * A tighter admissible bound must not change the answer, only how fast it is reached. That is a
 * claim about two whole `AssignmentResult`s and not about `Score` — a bound that quietly moved
 * which voice carried a part, or which section it occupied, or how a shortfall was classified,
 * would tie on score and still have changed every guide the resolver prints. `search.nodes` is
 * the one field the two are *meant* to differ on. See `test/search-matching-floor.test.ts`.
 */
export function measureAssignWithoutMatchingRepair(input: AssignInput): AssignmentResult {
  return assignWith(input, false)
}

function assignFrom(ctx: Ctx, placements: PlacementReport): AssignmentResult {
  const outcome = search(ctx)

  // §7.1: on the cap, the greedy result stands and the fallback is reported. Reporting it in
  // the result rather than writing to a console keeps the resolver pure and the claim testable.
  const solution = outcome.capped ? greedy(ctx) : outcome.best ?? greedy(ctx)

  // Replay the winner to rebuild occupancy: the search unwinds its own state on the way out,
  // and a snapshot of every live Map at every improvement would cost more than one replay.
  const state = emptyState(ctx)
  const assignments: Assignment[] = []
  const unfilled: number[] = []
  for (let index = 0; index < ctx.requests.length; index++) {
    const request = ctx.requests[index] as RoleRequest
    const candidate = solution.chosen[index]
    if (candidate === null || candidate === undefined) {
      applyMiss(ctx, state, index)
      unfilled.push(index)
      continue
    }
    apply(ctx, state, index, candidate)
    assignments.push({
      requestId: request.id,
      role: request.role,
      character: ctx.wanted[index] as Character,
      assignables: candidate.assignables,
      deviceId: candidate.deviceId,
      recipe: candidate.recipe,
      outcome: candidate.outcome,
      recipeCharacter: candidate.recipeCharacter,
      sections: [...(ctx.sections[index] ?? [])],
    })
  }

  // Second pass: gaps are classified against the *finished* allocation, so "the LT is
  // carrying sub" can name a request that was decided after this one.
  const shortfalls = unfilled.map((index) =>
    shortfallOf(classify(ctx, state, index), ctx.requests[index] as RoleRequest),
  )

  return {
    assignments,
    occupancy: state.occupancy,
    score: scoreOf(ctx, state),
    shortfalls,
    placements,
    search: {
      nodes: outcome.nodes,
      nodeCap: ctx.nodeCap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
  }
}
