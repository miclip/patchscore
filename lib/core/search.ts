import type { AssignableKey, Occupancy } from './occupancy'
import type { DeviceId, RequestId, SectionName } from './ids'
import type { Score } from './objective'
import type { Character, Role } from './vocabulary'
import { realisationOf } from './device'
import type { Assignable, Device, Recipe } from './device'
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
  type MoodState,
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
 */
export const NO_ROOM_CAUSES = ['contended', 'crowding', 'distinct'] as const
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
  search: SearchReport
}

/**
 * §7.1. The cap is a **latency guard, not a correctness bound**: hitting it does not make an
 * answer wrong, it swaps the exhaustive answer for the greedy one and says so in `SearchReport`.
 * So the number is not "how big can the problem get" but "how long are we willing to wait before
 * degrading", for a search that runs once when somebody presses generate.
 *
 * **50,000 was chosen when the library had three devices, and it stopped being generous.** Raised
 * to 150,000 on the measurement below, which is a **stopgap and is filed as one — see #78**, the
 * issue arguing that raising the cap treats the symptom and buys time until the next device. It
 * has been right twice now. What would actually fix this is a tighter *bound* — the suffix floor
 * admits branches a sharper admissible estimate would prune — and that is bound work, not a
 * constant.
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
 */
export const DEFAULT_NODE_CAP = 200_000

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
  /**
   * Which device owns each assignable. `AssignableKey` happens to be spelled
   * `${deviceId}/${voiceId}` today (`assignableKey`), and reading the device back out of it by
   * splitting on the separator would make that spelling load-bearing in a second place: a voice
   * id containing a slash, or a change to the key format, would silently mis-attribute an
   * occupied voice rather than fail. `buildCtx` already knows the owner, so it says so.
   */
  ownerOf: Map<AssignableKey, DeviceId>
  comfortable: Map<DeviceId, number>
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
 */
function liveFloor(ctx: Ctx, state: State, from: number): SuffixFloor {
  const misses = new Array<number>(ctx.missSlots).fill(0)
  let optionalMisses = 0
  let sampledChords = 0
  let stackedChords = 0
  let recipeDistance = 0
  let roleFitPenalty = 0

  for (let j = from; j < ctx.requests.length; j++) {
    const request = ctx.requests[j] as RoleRequest
    // The ladder is in `cheapestCandidate` order, so the first free entry *is* the cheapest free
    // one. Usually that is the first entry and the walk stops immediately.
    let best: Cost | undefined
    for (const candidate of ctx.ladder[j] ?? []) {
      if (isFree(ctx, state, j, candidate)) {
        best = candidate
        break
      }
    }
    const stack = ctx.stackFloor[j]
    if (stack !== undefined && (best === undefined || compareCost(stack, best) < 0)) best = stack

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

  return { misses, optionalMisses, sampledChords, stackedChords, recipeDistance, roleFitPenalty }
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

function buildCtx(input: AssignInput): Ctx {
  const { template, devices, mood, seed } = input

  const deviceById = new Map<DeviceId, Device>()
  const assignableOwner = new Map<AssignableKey, Device>()
  const assignables: Assignable[] = []
  const comfortable = new Map<DeviceId, number>()
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
    voiceable.push(candidates)

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
    stacks.push(plans)

    reach.push(
      new Set([...candidates.map((c) => c.deviceId), ...plans.map((p) => p.deviceId)]),
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

  return {
    template,
    devices,
    deviceById,
    deviceIds,
    comfortable,
    ownerOf: new Map([...assignableOwner].map(([key, device]) => [key, device.id])),
    requests,
    wanted,
    sections,
    roleOnly,
    capable,
    voiceable,
    stacks,
    suffixReach,
    suffixFloor,
    // #78. The ladder is sorted once here, not per node: the candidate lists are static, so the
    // order they are searched in is too. `deviceId` then `voiceId` after the four cost keys makes
    // it total, so the bound cannot depend on the order `voiceable` happened to be built in.
    ladder: voiceable.map((list) =>
      [...list].sort(
        (a, b) =>
          compareCost(a, b) ||
          compareCodeUnits(a.deviceId, b.deviceId) ||
          compareCodeUnits(
            (a.assignables[0] as Assignable).voiceId,
            (b.assignables[0] as Assignable).voiceId,
          ),
      ),
    ),
    stackFloor: stacks.map((list) => cheapestCandidate(list)),
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
}

function emptyState(ctx: Ctx): State {
  return {
    misses: new Array(ctx.missSlots).fill(0),
    optionalMisses: 0,
    recipeDistance: 0,
    sampledChords: 0,
    stackedChords: 0,
    roleFitPenalty: 0,
    occupiedByDevice: new Map(ctx.devices.map((d) => [d.id, new Set<AssignableKey>()])),
    occupancy: new Map(),
    chosen: new Array(ctx.requests.length).fill(null),
  }
}

function crowdOverflow(ctx: Ctx, state: State): number {
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
function idleDevices(ctx: Ctx, state: State): number {
  let idle = 0
  for (const id of ctx.deviceIds) {
    if ((state.occupiedByDevice.get(id)?.size ?? 0) === 0) idle++
  }
  return idle
}

function scoreOf(ctx: Ctx, state: State): Score {
  return [
    ...state.misses,
    crowdOverflow(ctx, state),
    state.optionalMisses,
    state.sampledChords,
    state.stackedChords,
    state.recipeDistance,
    state.roleFitPenalty,
    idleDevices(ctx, state),
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
  let unreachableIdle = 0
  let reachableIdle = 0
  // A voiceless device is in no request's reachable set, so it lands in `unreachableIdle` and is
  // counted here exactly as `idleDevices` counts it — the bound stays exact at the leaf.
  for (const id of ctx.deviceIds) {
    if ((state.occupiedByDevice.get(id)?.size ?? 0) !== 0) continue
    if (reachable.has(id)) reachableIdle++
    else unreachableIdle++
  }
  const remaining = ctx.requests.length - next
  const floorIdle = unreachableIdle + Math.max(0, reachableIdle - remaining)
  return [
    ...state.misses.map((m, p) => m + (floor.misses[p] ?? 0)),
    crowdOverflow(ctx, state),
    state.optionalMisses + floor.optionalMisses,
    state.sampledChords + floor.sampledChords,
    state.stackedChords + floor.stackedChords,
    state.recipeDistance + floor.recipeDistance,
    state.roleFitPenalty + floor.roleFitPenalty,
    floorIdle,
  ] as unknown as Score
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
  for (const key of candidate.keys) {
    let bySection = state.occupancy.get(key)
    if (bySection === undefined) {
      bySection = new Map()
      state.occupancy.set(key, bySection)
    }
    for (const section of sections) bySection.set(section, request.id)
    state.occupiedByDevice.get(candidate.deviceId)?.add(key)
  }
  state.recipeDistance += candidate.distance
  state.sampledChords += candidate.sampledChord
  state.stackedChords += candidate.stacked
  state.roleFitPenalty += candidate.roleFit
  state.chosen[index] = candidate
}

function undo(ctx: Ctx, state: State, index: number, candidate: Candidate): void {
  const sections = ctx.sections[index] ?? []
  for (const key of candidate.keys) {
    const bySection = state.occupancy.get(key)
    if (bySection === undefined) continue
    for (const section of sections) bySection.delete(section)
    if (bySection.size === 0) {
      state.occupancy.delete(key)
      // Only now does the assignable stop being occupied, and only then can the device's
      // occupied count fall. §12.4 counts assignables, not sections.
      state.occupiedByDevice.get(candidate.deviceId)?.delete(key)
    }
  }
  state.recipeDistance -= candidate.distance
  state.sampledChords -= candidate.sampledChord
  state.stackedChords -= candidate.stacked
  state.roleFitPenalty -= candidate.roleFit
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
 */
function violatesDistinct(ctx: Ctx, state: State, index: number, candidate: Candidate): boolean {
  const request = ctx.requests[index] as RoleRequest
  if (request.distinct !== true) return false
  for (let i = 0; i < index; i++) {
    const other = ctx.requests[i] as RoleRequest
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    if (other.distinct !== true || other.role !== request.role) continue
    if (taken.deviceId === candidate.deviceId) return true
  }
  return false
}

/**
 * The same rule as `violatesDistinct`, but scanning *every* other request rather than only the
 * ones already decided. The search can only look backwards — later requests have no device
 * yet — while classification runs against a finished allocation, where the constraint is
 * symmetric and looking only backwards would miss the request that actually blocked this one.
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
    (c) => isFree(ctx, state, index, c) && !violatesDistinct(ctx, state, index, c),
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
      (c) => !violatesDistinct(ctx, state, index, c),
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

/** §7.1's greedy fallback still snapshots a finished state directly; the search does not. */
function snapshot(ctx: Ctx, state: State): Solution {
  return { score: scoreOf(ctx, state), chosen: [...state.chosen] }
}

/**
 * #159 item 2. What the requests from some index onwards did, **held apart from the prefix that
 * led there**, so that two nodes reaching the same canonical state can share one answer.
 *
 * The additive keys are the suffix's own contribution and nothing else. `crowd` and `idle` are
 * absolute values read off the finished leaf, because neither is additive: `crowdOverflow`
 * counts occupied assignables against `comfortableVoices` per device and `idleDevices` counts
 * devices at zero, and both read the *final* occupancy, whose prefix half the canonical state
 * has already fixed.
 *
 * That split is what makes the sharing sound. The full score of a completion under prefix `P`
 * is `P + delta` on the additive keys and `crowd`/`idle` unchanged, so comparing two completions
 * under one prefix adds the same integer to the same component of both vectors and cannot
 * reorder them. A completion that is best under one prefix is best under every prefix reaching
 * the same canonical state.
 */
type Completion = {
  misses: number[]
  optionalMisses: number
  sampledChords: number
  stackedChords: number
  recipeDistance: number
  roleFitPenalty: number
  crowd: number
  idle: number
  /** What requests `index..n-1` took, in order; `null` is the miss branch. */
  chosen: (Candidate | null)[]
}

/** The empty completion: nothing left to decide, so only the finished occupancy speaks. */
function leafCompletion(ctx: Ctx, state: State): Completion {
  return {
    misses: new Array<number>(ctx.missSlots).fill(0),
    optionalMisses: 0,
    sampledChords: 0,
    stackedChords: 0,
    recipeDistance: 0,
    roleFitPenalty: 0,
    crowd: crowdOverflow(ctx, state),
    idle: idleDevices(ctx, state),
    chosen: [],
  }
}

/**
 * One more decision on the front of a completion. The miss branch is `null`, and charges the
 * same keys `applyMiss` charges — §4.4's `optional` split included.
 */
function extend(
  ctx: Ctx,
  index: number,
  candidate: Candidate | null,
  child: Completion,
): Completion {
  const request = ctx.requests[index] as RoleRequest
  const misses = [...child.misses]
  let optionalMisses = child.optionalMisses
  if (candidate === null) {
    if (request.optional === true) optionalMisses++
    else misses[request.priority - 1] = (misses[request.priority - 1] ?? 0) + 1
  }
  return {
    misses,
    optionalMisses,
    sampledChords: child.sampledChords + (candidate === null ? 0 : candidate.sampledChord),
    stackedChords: child.stackedChords + (candidate === null ? 0 : candidate.stacked),
    recipeDistance: child.recipeDistance + (candidate === null ? 0 : candidate.distance),
    roleFitPenalty: child.roleFitPenalty + (candidate === null ? 0 : candidate.roleFit),
    crowd: child.crowd,
    idle: child.idle,
    chosen: [candidate, ...child.chosen],
  }
}

/**
 * The full score of `state`'s prefix finished by `completion`. At a leaf, where the completion
 * is empty, this is `scoreOf(ctx, state)` term for term — which is the check that the split on
 * `Completion` is a split and not a second scoring function.
 */
function recombine(state: State, completion: Completion): Score {
  return [
    ...state.misses.map((m, p) => m + (completion.misses[p] ?? 0)),
    completion.crowd,
    state.optionalMisses + completion.optionalMisses,
    state.sampledChords + completion.sampledChords,
    state.stackedChords + completion.stackedChords,
    state.recipeDistance + completion.recipeDistance,
    state.roleFitPenalty + completion.roleFitPenalty,
    completion.idle,
  ] as unknown as Score
}

/**
 * A subtree's answer, and the whole safety argument for the memo.
 *
 * `best` is the best completion over the branches the walk **actually looked at**, which is not
 * the same as the sub-problem's optimum: §7.1's incumbent bound skips branches, and a branch
 * skipped is a completion never costed. `exact` is the claim that the two coincide — that `best`
 * is the optimum, and specifically the *first* one in DFS order, which is what §7.2's
 * first-winner rule makes the guide show. Only an exact subtree may be cached.
 *
 * `guard` is what is known about the parts that were skipped: every prune inside this subtree
 * was taken against an incumbent, so nothing skipped scores below the incumbent it was measured
 * against, and `guard` is the lexicographic minimum over those — the weakest of the claims, and
 * therefore the one that has to be cleared. `undefined` means nothing was skipped at all.
 *
 * **Why "nothing was skipped" is the wrong rule on its own.** It is the obvious one, it is what
 * `'strict'` implements, and on this library it caches *nothing*: `industrial-techno` seed 9
 * reaches a complete assignment 46 times in 165,785 nodes, so almost every node is arrived at,
 * bounded and abandoned, and a prune sits under every internal node in the tree. A memo under
 * that rule is pure overhead. It is kept as a mode because measuring the inert rule is the only
 * way to show it is inert.
 *
 * **The rule that works** compares `best` against `guard`, and has to know DFS order to do it,
 * because a tie is not a draw. A skipped region holding a completion that *ties* `best` matters
 * only if it stands earlier in DFS order, since first-winner would then have shown that one
 * instead. So the guards are kept in two piles:
 *
 *  - `guardBefore`, from branches skipped before the branch that produced `best`. Those precede
 *    `best`'s leaf, so a tie there would displace it: they must be cleared **strictly**.
 *  - `guardAfter`, from branches skipped after it. Those follow `best`'s leaf and a tie loses to
 *    it, so `<=` clears them.
 *
 * The `after` pile is the one that pays. A node whose own leaf becomes the incumbent prunes
 * everything it tries afterwards against exactly that incumbent, so its `guard` equals its
 * `best` on the nose — refused by a strict comparison, cleared correctly by this one.
 *
 * The branch that produced `best` is a third case, and it is handled by recursion rather than
 * by a guard: its skipped parts are interleaved with its own leaves, so `best` is trusted only
 * when that child came back `exact` itself.
 *
 * All of this is prefix-invariant, which is what lets one entry serve a different prefix. The
 * comparisons are between absolute scores under the prefix in force at the time, and subtracting
 * a common prefix from two vectors cannot reorder them (see `Completion`).
 *
 * `truncated` is the node cap, and no guard rescues it. A capped walk stopped for a reason that
 * has nothing to do with the objective, so nothing is known about what it did not reach.
 */
type Outcome = {
  best: Completion | undefined
  exact: boolean
  guard: Score | undefined
  truncated: boolean
}

/** The cap. Unusable, and not rescuable. */
const TRUNCATED: Outcome = { best: undefined, exact: false, guard: undefined, truncated: true }

/** Lexicographic minimum, treating `undefined` as "no claim made yet". */
function tighter(a: Score | undefined, b: Score | undefined): Score | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return compareScore(a, b) <= 0 ? a : b
}

/** #159 item 2's counters, for the probe. Zero throughout when the memo is off. */
export type MemoStats = {
  /** Canonical states cached, one per subtree proved exact. */
  cached: number
  /** Nodes answered from the cache, each one a subtree not walked. */
  hits: number
  /** Subtrees that found a completion but could not be proved exact. */
  refused: number
  /** Nodes that arrived, failed the bound and were abandoned without expanding. */
  bounded: number
  /** Complete assignments reached. */
  leaves: number
}

/**
 * `off` is the shipped traversal. `strict` caches only a subtree that skipped nothing at all;
 * `guarded` also caches one whose best clears every guard, in the order-sensitive sense
 * `Outcome` sets out. See there for why the first is inert on this library and the second is
 * sound.
 *
 * **Neither prototype mode agrees with `off` in every case, and that is what keeps them out of
 * `assign`.** A memo makes the walk cheaper, so an input that blows `nodeCap` unmemoised can
 * finish inside it memoised, and a capped run falls back to greedy where an uncapped one does
 * not. The two then produce different guides. Since the mode is not part of `AssignInput`, that
 * is one set of inputs standing behind two guides, which invariant 6 forbids — not two
 * configurations legitimately differing. `test/search-memo.test.ts` pins it.
 */
export type MemoMode = 'off' | 'strict' | 'guarded'

type SearchOptions = {
  probe?: StateProbe
  memo?: MemoMode
}

function search(
  ctx: Ctx,
  options: SearchOptions = {},
): {
  best: Solution | undefined
  nodes: number
  capped: boolean
  memo: MemoStats
} {
  const state = emptyState(ctx)
  const probe = options.probe
  const mode: MemoMode = options.memo ?? 'off'
  // One map per search. Keyed on the canonical state including the request index, so two depths
  // can never collide, and thrown away with the `Ctx` it belongs to.
  const memo = mode === 'off' ? undefined : new Map<string, Completion>()
  const stats: MemoStats = { cached: 0, hits: 0, refused: 0, bounded: 0, leaves: 0 }
  let best: Solution | undefined
  let nodes = 0
  let capped = false

  /**
   * §7.1's incumbent, updated on **strict** improvement only, so the first leaf in DFS order to
   * reach the optimum wins and a later tie never displaces it.
   *
   * Offered from exactly two places, and the pair is what keeps that rule intact under the memo:
   * every leaf offers itself as it is reached, and a memo hit offers the completion it just
   * answered with. Walking a subtree leaves the incumbent at the better of what it held and that
   * subtree's first optimum; answering the same subtree from the cache does the one update that
   * sequence would have ended on, because each improvement inside it is overwritten by the next.
   * Internal nodes never offer — their own leaves already did.
   */
  function offer(completion: Completion, index: number): void {
    const score = recombine(state, completion)
    if (best !== undefined && compareScore(score, best.score) >= 0) return
    const chosen = [...state.chosen]
    for (let k = 0; k < completion.chosen.length; k++) {
      chosen[index + k] = completion.chosen[k] ?? null
    }
    best = { score, chosen }
  }

  function dfs(index: number): Outcome {
    if (capped) return TRUNCATED
    // Checked before the increment, so `nodes` reports what was actually visited and never
    // overshoots the cap it is being compared against.
    if (nodes >= ctx.nodeCap) {
      capped = true
      return TRUNCATED
    }
    nodes++

    // #159 item 2's measurement, and the only line the search carries for it. Recorded here
    // rather than before the bound check so `visited` is exactly `SearchReport.nodes`, and
    // because the memo is consulted at this same point.
    if (probe !== undefined) record(ctx, state, index, probe)

    // Before the bound, deliberately. A hit is an exact answer where the bound would only have
    // said "not better than the incumbent", so consulting the cache first replaces a prune with
    // something strictly stronger and can never lose a solution.
    const key = memo === undefined ? '' : canonicalState(ctx, state, index)
    if (memo !== undefined) {
      const cached = memo.get(key)
      if (cached !== undefined) {
        stats.hits++
        offer(cached, index)
        return { best: cached, exact: true, guard: undefined, truncated: false }
      }
    }

    if (best !== undefined && compareScore(lowerBound(ctx, state, index), best.score) >= 0) {
      stats.bounded++
      // The incumbent this was measured against travels up as the guard: nothing below here was
      // looked at, and this is the claim under which it was skipped.
      return { best: undefined, exact: false, guard: best.score, truncated: false }
    }

    if (index === ctx.requests.length) {
      stats.leaves++
      const completion = leafCompletion(ctx, state)
      offer(completion, index)
      return { best: completion, exact: true, guard: undefined, truncated: false }
    }

    let localBest: Completion | undefined
    let localFull: Score | undefined
    let bestChildExact = false
    // Guards from branches skipped before, and after, the branch that produced `localBest`.
    let guardBefore: Score | undefined
    let guardAfter: Score | undefined
    let truncated = false

    const consider = (candidate: Candidate | null, child: Outcome): void => {
      if (child.truncated) truncated = true
      if (child.best !== undefined) {
        const grown = extend(ctx, index, candidate, child.best)
        const full = recombine(state, grown)
        // Strictly better only, so among equal completions the first in DFS order is kept —
        // the same rule `offer` applies to the incumbent, and the reason a cached answer and a
        // walked one name the same assignment rather than merely the same score.
        if (localFull === undefined || compareScore(full, localFull) < 0) {
          // Everything skipped so far now stands *before* the new best.
          guardBefore = tighter(guardBefore, guardAfter)
          guardAfter = undefined
          localBest = grown
          localFull = full
          bestChildExact = child.exact
        }
      }
      // An exact child skipped nothing that matters; it discharged its own guard by recursion.
      if (!child.exact && child.guard !== undefined) {
        guardAfter = tighter(guardAfter, child.guard)
      }
    }

    for (const candidate of orderedCandidates(ctx, state, index)) {
      apply(ctx, state, index, candidate)
      const child = dfs(index + 1)
      undo(ctx, state, index, candidate)
      consider(candidate, child)
      if (capped) return TRUNCATED
    }

    // The miss branch is explored last: filling is usually better, so taking it first would
    // delay a good incumbent and weaken every bound below. It is explored at all because
    // leaving a low-priority part out can genuinely beat crowding a box to fit it.
    applyMiss(ctx, state, index)
    const missChild = dfs(index + 1)
    undoMiss(ctx, state, index)
    consider(null, missChild)
    if (capped) return TRUNCATED

    const skipped = tighter(guardBefore, guardAfter)
    let exact = false
    if (localBest !== undefined && localFull !== undefined && bestChildExact && !truncated) {
      exact =
        mode === 'strict'
          ? skipped === undefined
          : (guardBefore === undefined || compareScore(localFull, guardBefore) < 0) &&
            (guardAfter === undefined || compareScore(localFull, guardAfter) <= 0)
    }

    if (memo !== undefined && localBest !== undefined) {
      if (exact) {
        memo.set(key, localBest)
        stats.cached++
      } else {
        stats.refused++
      }
    }

    return { best: localBest, exact, guard: exact ? undefined : skipped, truncated }
  }

  dfs(0)
  return { best, nodes, capped, memo: stats }
}

/**
 * §7.1's fallback: one pass, best candidate at each step, no backtracking. Deterministic on
 * the same ordering — and on the same seed — as the exhaustive search.
 */
function greedy(ctx: Ctx): Solution {
  const state = emptyState(ctx)
  for (let index = 0; index < ctx.requests.length; index++) {
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
 * The three sub-causes of `no-room` are checked in an order derived from the objective rather
 * than chosen by taste:
 *
 *  - A candidate that is **free and distinct-legal** in the finished allocation could have
 *    been taken without displacing anyone, so the only key that can have argued against it is
 *    `crowdOverflow` — the one key ranking above `optionalMisses`. That is crowding.
 *  - Otherwise, if a candidate is free but the `distinct` rule (§12.6) forbids it, that rule
 *    is what is binding.
 *  - Otherwise every candidate is carrying something else, which is contention.
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
    (c) => isFree(ctx, state, index, c) && !distinctBlocked(ctx, state, index, c),
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
  nodeCap?: number
}

/** §7 step 6. Search assignments against the lexicographic objective, producing `Occupancy`. */
export function assign(input: AssignInput): AssignmentResult {
  // #159 item 2's memo is deliberately unreachable from here, and there is no input that turns
  // it on. It changes the guide wherever the cap fires on one side and not the other, which
  // would put two byte-different guides behind one set of inputs and break invariant 6. The
  // prototype is reachable only from `measureAssign` and `measureMemoSearch`, which exist to
  // measure it and are named so that no caller reaches one by accident.
  return resolveAssignment(buildCtx(input), 'off')
}

/** `assign`'s body, over a `Ctx` and a memo mode. See `assign` for why the mode is not an input. */
function resolveAssignment(ctx: Ctx, mode: MemoMode): AssignmentResult {
  const outcome = search(ctx, { memo: mode })

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
    search: {
      nodes: outcome.nodes,
      nodeCap: ctx.nodeCap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
  }
}

// ---------------------------------------------------------------------------
// #159 item 2. Repeated canonical states, measured
// ---------------------------------------------------------------------------

/**
 * #159's second item asks whether §7.1's DFS re-solves the same sub-problem, and if so how
 * often. Memoising is a separate move and is deliberately not made here: this measures, and
 * nothing else. Item 1 — decomposition — was measured by `scripts/bench-decomposition.ts` and
 * found not to hold; the two items are independent, and this one is not settled by that.
 *
 * **What makes two nodes the same sub-problem.** At a node the search is about to decide
 * requests `index..n-1`. What the rest of the tree can do, and what it costs, depends on:
 *
 *  - `index`, because it names which requests are left;
 *  - **occupancy, keyed by assignable and section** — every remaining feasibility question
 *    reads it and nothing else. `keyIsFree` asks which sections of an assignable are taken and
 *    never by whom, so the request ids stored in `Occupancy` are not part of the identity;
 *    `isOccupiedAnywhere` (symmetry breaking, stack member choice) reads the same map;
 *  - **prior same-role `distinct` device choices** (§12.6). `violatesDistinct` scans decided
 *    requests for one sharing the role and carrying the flag, and compares `deviceId`. That is
 *    not derivable from occupancy — a device can be busy from a request the rule does not
 *    touch — so it is carried explicitly, as a *set*, because the rule asks membership and
 *    never a count.
 *
 * `occupiedByDevice` is deliberately **not** in the key: it is a function of the occupancy that
 * is, because each occupied assignable belongs to exactly one device and `ctx.ownerOf` says
 * which. `derivedOccupiedCounts` rebuilds it from that lookup and `record` checks the rebuild
 * against the live map at every measured node, so that is a checked claim rather than a
 * comment. `crowdOverflow` and `idleDevices` read only that map, so
 * they are determined by the key too.
 *
 * The accumulated cost so far — `misses`, `recipeDistance`, `roleFitPenalty` and the rest — is
 * **not** in the key, and that is the point rather than an omission. Those keys are additive and
 * identical for every completion of a given prefix, and `crowdOverflow`/`idleDevices` are
 * functions of the final occupancy, whose prefix half the key already fixes. So the best
 * completion from a node depends on the key alone, which is what would make a memo sound.
 *
 * **What the numbers below do and do not say.** They describe the traversal as it runs today,
 * incumbent pruning included. A memo would change which nodes get visited at all, so the hit
 * rate here is not a predicted speed-up — it is the answer to "is there anything to memoise",
 * measured on the search we have.
 */
type StateProbe = {
  /** Canonical key -> times visited. The key carries `index`, so depths cannot collide. */
  seen: Map<string, number>
  byDepth: { depth: number; visited: number; unique: number; repeats: number }[]
  checks: number
}

/**
 * **Length-prefixed, not separated.** The obvious encoding picks a character no id could
 * contain and joins on it, and the premise is false here: `DeviceId`, `RequestId`, `Role` and
 * `SectionName` are all bare `string` at the type level, a device may be built at runtime by a
 * caller (`AssignInput` takes objects, never ids — #4), and nothing in the schema forbids
 * U+0001..U+0004 in a section name. A key that is only unambiguous while the data stays polite
 * is a wrong answer waiting for an unusual template, and it would fail *silently*: two different
 * states spelling one key means a memo hit that answers the wrong sub-problem.
 *
 * So every piece is written as `<length>:<text>`, which is prefix-free for any text at all, and
 * the pieces are concatenated with no separator. There is no reserved character.
 */
function piece(text: string): string {
  return `${text.length}:${text}`
}

/** Code unit order throughout (invariant 6): no `localeCompare`, on any of these. */
function canonicalState(ctx: Ctx, state: State, index: number): string {
  // **Every entry, including one whose section map is empty.** A request with `transient`
  // sustain and no matching section names occupies its voice in no section at all: `apply`
  // still creates the entry and still counts the assignable in `occupiedByDevice`, so the voice
  // is spent against `comfortableVoices` and stops its device being idle while `keyIsFree` lets
  // anything share it. Skipping empty entries here made two genuinely different states spell one
  // key, and the memo answered the wrong one — found by the fuzz in `test/search-memo.test.ts`,
  // which is why that test exists rather than a hand-built case.
  const keys: AssignableKey[] = [...state.occupancy.keys()]
  keys.sort(compareCodeUnits)

  const parts: string[] = [piece(String(index)), piece(String(keys.length))]
  for (const key of keys) {
    const bySection = state.occupancy.get(key) as Map<SectionName, RequestId>
    // The request ids stored against each section are deliberately not read: `keyIsFree` asks
    // which sections of an assignable are taken and never by whom, so two states differing only
    // in which request holds a voice are the same sub-problem.
    const sections = [...bySection.keys()].sort(compareCodeUnits)
    parts.push(piece(key), piece(String(sections.length)))
    for (const section of sections) parts.push(piece(section))
  }

  // §12.6, as a set of `(role, deviceId)` pairs: `violatesDistinct` asks whether a device is
  // already taken for this role and never how many times.
  const distinct: [string, string][] = []
  const seen = new Set<string>()
  for (let i = 0; i < index; i++) {
    const request = ctx.requests[i] as RoleRequest
    if (request.distinct !== true) continue
    const taken = state.chosen[i]
    if (taken === null || taken === undefined) continue
    const pair = piece(request.role) + piece(taken.deviceId)
    if (seen.has(pair)) continue
    seen.add(pair)
    distinct.push([request.role, taken.deviceId])
  }
  distinct.sort((a, b) => compareCodeUnits(a[0], b[0]) || compareCodeUnits(a[1], b[1]))
  parts.push(piece(String(distinct.length)))
  for (const [role, deviceId] of distinct) parts.push(piece(role), piece(deviceId))

  return parts.join('')
}

/**
 * Per-device occupied counts, rebuilt from occupancy and `ctx.ownerOf` — the claim the key rests
 * on. A device absent here has none occupied, which is exactly how `idleDevices` reads a missing
 * entry.
 */
function derivedOccupiedCounts(ctx: Ctx, state: State): Map<DeviceId, number> {
  const counts = new Map<DeviceId, number>()
  for (const key of state.occupancy.keys()) {
    // Present, not non-empty: `apply` adds to `occupiedByDevice` for every key it touches, and
    // a request occupying no section still spends the voice. See `canonicalState`.
    const deviceId = ctx.ownerOf.get(key)
    if (deviceId === undefined) {
      throw new Error(`occupancy holds ${key}, which no device in this rig owns`)
    }
    counts.set(deviceId, (counts.get(deviceId) ?? 0) + 1)
  }
  return counts
}

function record(ctx: Ctx, state: State, index: number, probe: StateProbe): void {
  const derived = derivedOccupiedCounts(ctx, state)
  for (const id of ctx.deviceIds) {
    const live = state.occupiedByDevice.get(id)?.size ?? 0
    if ((derived.get(id) ?? 0) !== live) {
      throw new Error(
        `occupiedByDevice is not derivable from occupancy: ${id} is ${live} live and` +
          ` ${derived.get(id) ?? 0} derived at depth ${index}. The canonical key would be` +
          ` measuring something narrower than the state the search actually reads.`,
      )
    }
  }
  probe.checks++

  const key = canonicalState(ctx, state, index)
  const before = probe.seen.get(key)
  probe.seen.set(key, (before ?? 0) + 1)
  const row = probe.byDepth[index]
  if (row === undefined) return
  row.visited++
  if (before === undefined) row.unique++
  else row.repeats++
}

/** One depth's tally. `visited === unique + repeats`, always. */
export type StateRepeatDepth = {
  /** The request index the node was about to decide; `requests.length` is a leaf. */
  depth: number
  visited: number
  unique: number
  repeats: number
}

export type StateRepeatReport = {
  /** Nodes the DFS visited, equal to `search.nodes` by construction. */
  visited: number
  /** Distinct canonical states among them. */
  unique: number
  /** Visits to a state already seen at that depth — what a memo would have answered. */
  repeats: number
  /** Nodes at which `occupiedByDevice` was confirmed derivable from occupancy. */
  checks: number
  byDepth: StateRepeatDepth[]
  /** The ordinary report for the same run, so a probe run is comparable to a shipped one. */
  search: SearchReport
}

/**
 * §7.1's search, run once with the state probe attached. Same `AssignInput` as `assign`, so a
 * measurement is taken on exactly the rig, direction, mood and seed a guide would use — and
 * `nodeCap` is honoured, so a caller measuring a worst case has to lift it deliberately.
 *
 * Not called by `assign`, and nothing in the pipeline reaches it. It runs the shipped DFS with
 * `memo: false`, which is the traversal as it stood before the memo landed — so the repeat
 * counts this returns stay the ones #159 item 2 was opened against, and do not quietly become
 * a report on how well the memo already worked.
 */
export function measureStateRepeats(input: AssignInput): StateRepeatReport {
  const ctx = buildCtx(input)
  const probe: StateProbe = {
    seen: new Map(),
    byDepth: Array.from({ length: ctx.requests.length + 1 }, (_, depth) => ({
      depth,
      visited: 0,
      unique: 0,
      repeats: 0,
    })),
    checks: 0,
  }
  // Memo off. This helper's numbers are the ones #159 item 2 was opened against, and they
  // describe the traversal *without* the memo; measuring repeats on the memoised search would
  // be measuring how well the memo already removed them.
  const outcome = search(ctx, { probe, memo: 'off' })

  let unique = 0
  let repeats = 0
  for (const row of probe.byDepth) {
    unique += row.unique
    repeats += row.repeats
  }

  return {
    visited: outcome.nodes,
    unique,
    repeats,
    checks: probe.checks,
    byDepth: probe.byDepth,
    search: {
      nodes: outcome.nodes,
      nodeCap: ctx.nodeCap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
  }
}

// ---------------------------------------------------------------------------
// #159 item 2. The memo, measured against the traversal it replaced
// ---------------------------------------------------------------------------

/** One traversal's cost and what its memo did. */
export type MemoRun = {
  search: SearchReport
  memo: MemoStats
  /**
   * Whether this run's winner matches the memo-off run's — the score, and separately the
   * *assignment*. The second is the stronger claim and the one §7.2's first-winner rule is
   * about: two allocations can tie on `Score`, and which of them the guide shows is decided by
   * DFS order, so a memo that returned the other one would be wrong while scoring identically.
   */
  sameScore: boolean
  sameChoices: boolean
}

/**
 * #159 item 2, measured three ways on one input: the traversal as it was, the strict rule that
 * caches only prune-free subtrees, and the guarded rule that also caches a subtree whose best
 * beats every incumbent its prunes were taken against.
 */
export type MemoComparison = {
  off: MemoRun
  strict: MemoRun
  guarded: MemoRun
}

/** `undefined` on either side is a disagreement unless both are. */
function sameChoiceList(
  a: (Candidate | null)[] | undefined,
  b: (Candidate | null)[] | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const left = a[i] ?? null
    const right = b[i] ?? null
    if (left === null || right === null) {
      if (left !== right) return false
      continue
    }
    // By content, not identity: a stack candidate is built fresh at every node it is
    // materialised at (`materialiseStacks`), so a cached one is a different object naming the
    // same voices.
    if (left.deviceId !== right.deviceId) return false
    if (left.recipe.id !== right.recipe.id) return false
    if (left.keys.length !== right.keys.length) return false
    for (let k = 0; k < left.keys.length; k++) {
      if (left.keys[k] !== right.keys[k]) return false
    }
  }
  return true
}

/**
 * #159 item 2's prototype, as a whole `AssignmentResult` rather than a raw search outcome, so a
 * measurement can compare the guide a memoised run would produce against the one that ships.
 *
 * **Not a variant of `assign`, and deliberately not spelled like one.** `AssignInput` carries no
 * memo field, so this is the only way to reach the prototype and a caller has to name a mode to
 * get here. That is invariant 6's requirement rather than tidiness: the memo does not always
 * agree with the traversal it replaces, so if it were reachable from an input then one set of
 * inputs would stand behind two different guides.
 *
 * @param mode `'off'` reproduces `assign` exactly; the other two are the prototype.
 */
export function measureAssign(input: AssignInput, mode: MemoMode): AssignmentResult {
  return resolveAssignment(buildCtx(input), mode)
}

/**
 * §7.1's search run once per mode on the same input. Every run is the shipped code path —
 * `assign` reaches the same `search` with the same options — so this compares two traversals
 * rather than the search against a re-implementation of it.
 *
 * Each run gets its own `Ctx`. `buildCtx` is a pure function of the input, but the search
 * mutates `State` and materialises stack candidates as it goes, and a fresh context removes the
 * question of whether an earlier run left anything behind.
 */
export function measureMemoSearch(input: AssignInput): MemoComparison {
  const cap = input.nodeCap ?? DEFAULT_NODE_CAP
  const run = (mode: 'off' | 'strict' | 'guarded'): {
    best: Solution | undefined
    nodes: number
    capped: boolean
    memo: MemoStats
  } => search(buildCtx({ ...input }), { memo: mode })

  const off = run('off')
  const asRun = (outcome: ReturnType<typeof run>): MemoRun => ({
    search: {
      nodes: outcome.nodes,
      nodeCap: cap,
      capped: outcome.capped,
      method: outcome.capped ? 'greedy' : 'exhaustive',
    },
    memo: outcome.memo,
    sameScore:
      outcome.best?.score === undefined || off.best?.score === undefined
        ? outcome.best?.score === off.best?.score
        : compareScore(outcome.best.score, off.best.score) === 0,
    sameChoices: sameChoiceList(off.best?.chosen, outcome.best?.chosen),
  })

  return { off: asRun(off), strict: asRun(run('strict')), guarded: asRun(run('guarded')) }
}
