import { describe, expect, it } from 'vitest'
import { DEFAULT_NODE_CAP, MAX_RIG_DEVICES, assign, moodState } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §7.1/#159/#78. The exact traversal every shipped direction walks, seed by seed.
 *
 * #159's closing measurement put the search at bounded-on-arrival for 86.4% of its nodes on
 * `industrial-techno` and 86.7% on `weave`, so the bound is where the cost lives — and #78 said
 * the answer was a sharper bound rather than a bigger cap. **Both have now happened, and the
 * rule for this table changed with them.**
 *
 * The original rule was that any one-node change here is a failure, because the work being
 * guarded was meant to make the *same* bound cheaper to evaluate. That still holds for that kind
 * of work. But a change that makes the bound *tighter* is a different thing: it returns a larger
 * admissible value, prunes strictly more, and reaches an identical answer from fewer nodes. That
 * is not a regression to explain, it is the point. So there are now three reasons a row moves,
 * and they want different responses:
 *
 *  - **The library moved** — a device, a direction, a recipe. Re-record; the problem changed.
 *  - **The bound got tighter.** Re-record, but only alongside evidence that the *answer* did not
 *    move: `test/search-matching-floor.test.ts` diffs whole results against the previous floor
 *    and is the thing that makes a re-record here safe rather than convenient.
 *  - **Anything else.** A failure. A bound that returns a different value at the same node
 *    without being provably tighter is a different bound, whether it prunes more or less.
 *
 * The figures below were re-recorded when `liveFloor` gained the one-step matching repair (#78),
 * and again when the Subharmonicon landed (#135) — the first of the three reasons above, the
 * library moving. Every row rose: `industrial-techno` 8,309 → 9,507 at its peak, `weave`
 * 4,803 → 5,461, `ambient-dub` 759 → 806, and the two flat directions by one node each. That is
 * a twentieth device serving fourteen roles with nineteen recipes, which is the growth curve
 * `DEFAULT_NODE_CAP` describes rather than a bound that changed.
 *
 * **#173 re-recorded two rows, in two passes, and each time only the rows the change could
 * reach.** The Deluge's kick went from one recipe to three: a synthesised `hard`, a synthesised
 * `dark`, and the sampled one moved to `dirty`.
 *
 *   - `ambient-dub` 806 → 913 at its peak, when `(kick, dirty)` appeared and `(kick, hard)` became
 *     a different recipe. It requests `kick`/`soft`, so every candidate it sees is a §3.5
 *     approximation and its costs moved.
 *   - `lydian-house` 295 → 361, flat across all 24 seeds, when `(kick, dark)` was added. It is the
 *     one direction that requests `kick`/`dark`, and it went from approximating to matching
 *     exactly — a different cost, and therefore a different walk.
 *
 * That each pass moved exactly the directions whose kick request it touched is the shape of §7.1
 * rather than luck: `resolveRecipe` returns one resolution per `(assignable, role, character)`, so
 * a recipe on a new key does not widen the branching factor at all. It changes what a request
 * costs, and a row moves only where the new cost prunes differently. `industrial-techno` is
 * node-for-node identical through both passes — it asks for `kick`/`hard`, which stayed one recipe
 * throughout, however much that recipe's contents changed — so the whole matrix's worst case is
 * unchanged at 9,507.
 *
 * **The TR-6S re-recorded every one of the seven rows**, which no previous device has done, and
 * five of them moved *down*. That is the useful thing this matrix says and the per-direction
 * shape the aggregate band in `test/search-symmetry.test.ts` cannot: `ambient-dub` fell 824 →
 * about 130, `lydian-house` 361 → about 140, `major-key-electro` 2,032 → about 200, while
 * `industrial-techno` rose 7,512 → about 12,900 and `weave` rose 5,171 → 16,896, taking the
 * matrix's worst case with it to **19,066 on `weave` seed 2**.
 *
 * Both directions are the same mechanism. A device that can serve a request cheaply gives §7.1 a
 * tighter bound earlier and prunes more of the tree, so the five directions this box has an easy
 * answer for got cheaper; the two it has *several* plausible answers for got dearer, because six
 * voices carrying fifteen roles is branching that no bound removes. `drone-study` and `relay` at
 * 15 → 16 and 31 → 32 are the floor: one more device to consider at the root and nothing else.
 *
 * **The MPC Live III re-recorded all seven rows too**, and this time every one of them moved *up*:
 * `ambient-dub` 132 -> 143 at its worst seed, `lydian-house` 148 -> 182, `major-key-electro`
 * 648 -> 1,097, `industrial-techno` 14,878 -> 18,446, `weave` 19,066 -> 21,368, and the two
 * floors 16 -> 17 and 32 -> 34. The matrix's worst case stays on `weave` and moves to **21,368**.
 *
 * All up, and by very different amounts, is the signature of a device with a broad answer to
 * everything: the two floors rise by one and by two — one more device at the root, and this is
 * the first manifest to declare *two* pools, so `relay` sees two more root candidates rather than
 * one — while the directions with real tonal demands pay for genuinely new options. Nothing here
 * got cheaper because nothing this box offers is the *only* good answer to a request; contrast
 * the TR-6S, which made five directions cheaper by being the obvious home for a kick.
 *
 * **The MPC XL re-recorded all seven rows again**, and it is the cleanest test of what this
 * matrix measures that the library has had. The XL derives its recipes from the Live III by
 * reference: same three pools, same nineteen recipes, same values. The two boxes are the same
 * search problem twice over, and six of the seven rows rose:
 *
 *     drone-study         17 ->    18      one more device at the root
 *     relay               34 ->    36      two more, the same way the Live III added two
 *     ambient-dub        258 ->   279      seed 20, its worst
 *     lydian-house       187 ->   203      seed 23
 *     industrial-techno 19080 -> 20779     worst seed moves 11 -> 16
 *     weave            21368 -> 26688      worst seed moves 10 -> 16
 *
 * `major-key-electro` is the seventh and it went the other way, 1,097 -> 975 at its peak, with
 * its old worst seed collapsing 1,097 -> 233. A duplicate device is not only more branching: it
 * is also a second cheap answer available earlier, which is the TR-6S's effect arriving on one
 * direction rather than five. The matrix's worst case stays on `weave` and moves to **26,688**,
 * which is 13.3% of `DEFAULT_NODE_CAP`.
 *
 * The pre-repair row for `industrial-techno` peaked at 165,785 nodes on seed 9 against 8,309
 * after the repair; that number is pinned in `test/search-matching-floor.test.ts` against the
 * deliberately unrepaired floor, so the before and the after are both still measured. It moved
 * to 221,573 with the same device, which is the unrepaired floor growing exactly as this matrix
 * did and is why that file re-records alongside this one.
 *
 * **`ambient-dub` was re-recorded a second time**, at 25,798 → 759, when the repair's buckets
 * stopped being about `sustain` and became about sections: a bucket is now any set of requests
 * on one voice whose sections pairwise overlap, so the direction's one transient request in nine
 * joins the continuous ones instead of standing outside every bucket. Nothing else in the matrix
 * moved — `industrial-techno`'s two transients occupy disjoint sections and `relay`'s are all it
 * has, so neither gains a bucket — and the whole matrix's worst case falls 25,798 → 8,309. The
 * same commit's `test/search-matching-floor.test.ts` diffs whole results against the unrepaired
 * floor over 18,400 pairs, which is the evidence this re-record needs.
 *
 * `nodeCap: 20_000_000` is the cap lifted clear of the measurement. Nothing in this matrix caps
 * at `DEFAULT_NODE_CAP` today, so the figures are the same either way, and lifting it says that
 * the numbers are the search's true cost rather than something the cap shaped. A capped run
 * reports the cap and not what the walk would have been, which is the one number a degraded
 * search cannot give you.
 *
 * **The OP-XY re-recorded all seven rows** — the first of the three reasons above, the library
 * moving — and one of them went *down*, which is worth the sentence.
 *
 *   - `weave` 26,688 -> 29,870 at its peak and `industrial-techno` 20,779 -> 24,923, the two
 *     expensive directions paying for a twenty-fourth box that serves every tonal role.
 *   - `drone-study` 18 -> 19 and `relay` 36 -> 38, one and two nodes: both are flat across all
 *     24 seeds, so this is one more candidate considered and rejected at the same place.
 *   - **`ambient-dub` 279 -> 119 at its peak, and flat-ish where it used to spike.** A new device
 *     making a direction *cheaper* is the bound working as designed rather than an anomaly: this
 *     is the one direction that asks for `pad`/`soft`, and it had been approximating that request
 *     off every candidate in the library (§3.5). The OP-XY authors it exactly — axis, p.93 — so
 *     the request now has a matching resolution, `liveFloor` returns a tighter admissible value
 *     on the first branch, and the whole subtree behind the old approximations is pruned. The
 *     seed-to-seed variance collapses with it, from 107-279 to 116/119.
 *
 * The whole sweep was 168 exhaustive searches at the time of that repair, and is 192 now that
 * `generative-drift` has landed. It used to take about fifteen seconds, nearly all of it in
 * `industrial-techno`; the repair took it under two.
 *
 * ## The Muse, and a cost that lands on one direction rather than across the board
 *
 * The twenty-eighth box serves seven tonal roles from a pool of two timbres. **Six of the seven
 * directions get dearer and one gets cheaper**, but the six are not comparable to each other —
 * five of them move by a node or two and the sixth doubles:
 *
 *   - **`industrial-techno` 22,926-28,046 -> 48,301-55,825**, roughly double, and it takes the
 *     worst case off `weave` for the first time. This is the direction that asks for the most
 *     tonal roles at once, so a device answering seven of them adds candidates at every one of
 *     those requests. It is the entire cost of this device, and the other six rows are what make
 *     that visible.
 *   - **`weave` 32,652-35,678 -> 32,670-35,696**, eighteen nodes at every seed, on the direction
 *     that was the worst case until now. Same registry, same device: what a box costs is the roles
 *     a *direction* asks for, not the size of the box, which is the claim §7.1 makes and this pair
 *     of rows measures.
 *   - `ambient-dub` 123/126 -> 130 flat, `drone-study` 20 -> 21, `relay` 40 -> 42. One or two
 *     nodes: a candidate considered and rejected at the same place.
 *   - **`lydian-house` 180-235 -> 112-241** is the one row that moves both ways, and it is worth
 *     not flattening into either verdict. Its peak rises by six nodes and its floor falls by
 *     sixty-eight, so most seeds get cheaper while the worst gets marginally dearer.
 *   - **`major-key-electro` 170-704 -> 116-446** is the only row cheaper at the peak, and by a
 *     third. The `ambient-dub`/OP-XY note above explains the mechanism and it applies again: a
 *     request that was being approximated off distant candidates now has one that matches, so
 *     `liveFloor` tightens on the first branch and prunes the subtree behind the approximations.
 *
 * A device that pays for itself on the one direction that asks for what it offers, and costs one
 * or two nodes everywhere else, is the bound behaving as designed. The number to watch is
 * `industrial-techno`, and `search-symmetry.test.ts` is where it is watched.
 *
 * ## The SP-404MK2, and what a pool that carries every role costs
 *
 * The twenty-ninth box declares one pool of sixteen pads over the whole 23-role vocabulary and
 * authors nineteen recipes across seventeen of them. **Every row moves up, and the two expensive
 * directions take almost all of it:**
 *
 *   - **`industrial-techno` 48,301-55,825 -> 55,355-67,088**, about a fifth dearer, and the worst
 *     seed moves from 5 to 10. Same reason as the Muse's row above and a different mechanism: not
 *     a device answering seven tonal roles from two timbres, but one answering seventeen roles
 *     from sixteen interchangeable slots, so every request in the direction gains sixteen
 *     candidates that differ only by ordinal.
 *   - **`weave` 32,670-35,696 -> 37,499-39,319**, about a seventh. The second-most tonal
 *     direction, paying a smaller share of the same bill.
 *   - `ambient-dub` 130 -> 137, `drone-study` 21 -> 22, `relay` 42 -> 43, `lydian-house`
 *     112-241 -> 119-257: a handful of nodes, flat across every seed, which is one more candidate
 *     considered and rejected at the same place.
 *   - **`major-key-electro` 116-446 -> 122-614** is the one row whose *shape* changes rather than
 *     its level: its peak moves off seed 23 onto seed 2 and rises by a third while its floor
 *     barely moves. A pool that answers every role reorders which seed is unlucky, which is what
 *     a tie-break permuting among equal costs (§7.2) is expected to do.
 *
 * Nothing caps, and `industrial-techno` at 67,088 is 33.5% of `DEFAULT_NODE_CAP`.
 *
 * ## The EP-133, and the measurement that says pool size is free
 *
 * The thirtieth box declares **forty-eight** pads over the whole 23-role vocabulary — three times
 * the SP-404MK2's pool — and authors twenty-one recipes across nineteen roles. On the paragraph
 * above's reasoning that should be the expensive one, and it is not:
 *
 *   - **`industrial-techno` 55,355-67,088 -> 62,885-71,675**, 6.8% at the peak against the
 *     SP-404MK2's fifth, from a pool three times the size. The floor rises more than the peak
 *     does, which is the row flattening rather than spiking.
 *   - **`weave` 37,499-39,319 -> 42,650-44,586**, about a seventh, and flat across twenty of the
 *     twenty-four seeds.
 *   - `ambient-dub` 137 -> 144, `drone-study` 22 -> 23, `relay` 43 -> 45, `lydian-house`
 *     119-257 -> 126-273: a handful of nodes, flat across every seed.
 *   - **`major-key-electro` 122-614 -> 128-447** is the one row cheaper at the peak, by a
 *     quarter, and its shape moves again — the expensive seeds are now 6 and 1 rather than 2.
 *     Same mechanism as the OP-XY's note far above: a request that was being approximated now has
 *     a match, so `liveFloor` tightens early and prunes the subtree behind the approximations.
 *
 * **The useful finding is the one that was measured rather than inferred.** The same sweep run
 * with this device's pool at 12, at 48, and at 48 with `comfortableVoices` lifted to 48 gives the
 * *identical* worst case in all three. Ordinal-identical pool members are collapsed before they
 * ever branch, so a pool costs what its **recipe sheet** costs and not what its slot count does.
 * The SP-404MK2 paragraph above reads its own fifth as sixteen ordinal-identical candidates per
 * request; on this evidence that reading is wrong, and what it was actually paying for was
 * nineteen recipes reaching seventeen roles. Size the next device against its recipes.
 *
 * Nothing caps, and `industrial-techno` at 71,675 is 35.8% of `DEFAULT_NODE_CAP`.
 *
 * ## The EP-40, which is the same shape of box again and settles the paragraph above
 *
 * The thirty-first box is the K.O. II's chassis and workflow: another forty-eight-pad pool over
 * the whole 23-role vocabulary, and nineteen recipes over eighteen roles, thirteen of them the
 * sibling's part derived by guarded reference. If the previous paragraph's finding is right — that a pool costs what its *recipe sheet* costs — then a second
 * one of these should cost about what the first did, and it does, but the interesting part is
 * *where* it lands rather than how much:
 *
 *   - **`industrial-techno` 62,885-71,675 -> 70,887-74,415.** The peak moves 3.8% and the floor
 *     moves 12.7%, which is the row **flattening**, not spiking: twenty-three of the twenty-four
 *     seeds now sit within 300 nodes of each other and the twenty-fourth is the only outlier.
 *     Before this device, six seeds sat above 66,000 and thirteen sat at the floor. A second box
 *     answering the same requests removes the cheap seeds rather than adding expensive ones —
 *     there is no longer a seed on which the search gets an easy incumbent early.
 *   - **`weave` 42,650-44,586 -> 45,682-47,202**, about a fourteenth, and flat on twenty-three of
 *     the twenty-four seeds for the same reason.
 *   - `ambient-dub` 144 -> 150, `drone-study` 23 -> 24, `relay` 45 -> 47, `lydian-house`
 *     126-273 -> 133-289, `major-key-electro` 128-447 -> 133-463: a handful of nodes each, and
 *     the two-hundred-node directions keep their shape rather than moving their expensive seeds.
 *
 * So the SP-404MK2 paragraph's correction holds a second time. Nineteen recipes over eighteen
 * roles cost about what twenty-one over nineteen did, on a pool of the same size, and neither
 * figure is what the slot count would predict.
 *
 * **And the sheet was measured at two sizes, which sharpens that.** This device was first
 * authored with twenty-five recipes reaching all twenty-three roles and then trimmed to nineteen
 * over eighteen. `industrial-techno` did not move by a single node — 70,887-74,415 on both — and
 * neither did `lydian-house`. `weave` fell 48,123-49,739 -> 45,682-47,202, about 5%, and
 * `ambient-dub` 153 -> 150. So a direction pays for the recipes that answer *the roles it asks
 * for*, and six recipes on roles it never requests are free to it and not free to the others.
 * Sizing a sheet against the worst direction alone would have found no reason to trim.
 *
 * Nothing caps, and `industrial-techno` at 74,415 is 49.6% of `DEFAULT_NODE_CAP`.
 *
 * ## The MC-707, where the cost is the *pair* rather than the box
 *
 * The thirty-second box is the MC-101's engine in an eight-track chassis, and all twenty of its
 * recipes are the sibling's retargeted onto its own manual. On the reading the three paragraphs
 * above establish — a pool costs what its recipe sheet costs — twenty recipes over twenty-three
 * roles should cost about what the last two boxes cost. It costs far more, and the reason is not
 * in this device at all:
 *
 *   - **`industrial-techno` 70,887-74,415 -> 118,223-132,559.** Up 66.7% at the floor and 78% at
 *     the peak, the largest move any single device has made in this table.
 *   - **`weave` 45,682-47,202 -> 76,327-78,754**, up 67%, the same proportion.
 *   - `ambient-dub` 150 -> 156-158, `drone-study` 24 flat, `relay` 47 -> 49, `lydian-house`
 *     133-289 -> 140-305, `major-key-electro` 133-463 -> 140-675. The small directions keep their
 *     shape; only `major-key-electro`'s worst seed moves much, 463 -> 675.
 *
 * **The pair is the cost, and it was measured rather than inferred.** The same sweep with the
 * MC-101 removed and this box present gives `industrial-techno` **74,415 on seed 14 — the
 * baseline's exact count on the baseline's exact seed**. Either box alone costs what the other
 * alone costs; together they cost 78% more than either. Two boxes carrying the same twenty
 * recipes give every request they can serve two candidates of *exactly equal* cost, and equal
 * costs are what the seed permutes among (§7.2).
 *
 * So the recipe-sheet rule above is right and incomplete. What it does not price is a second box
 * whose sheet *duplicates* the first's. Sizing the next near-clone against its own recipe count
 * will under-predict it by a factor approaching two, and #78 should read this row as the pair's
 * bill rather than this device's.
 *
 * Nothing caps, and `industrial-techno` at 132,559 is 66.3% of `DEFAULT_NODE_CAP`.
 *
 * ---
 *
 * **The MicroFreak moves one direction and leaves the other alone**, which no device in this table
 * has done before. It is the first row the near-clone note above does not fit, so read it as a
 * correction to that note rather than another instance of it.
 *
 *   - **`industrial-techno` 118,223-132,559 -> 197,191-223,348**, up 66.8% at the floor and 68.5%
 *     at the peak, on the same scale as the MC-707's row and the largest here.
 *   - **`weave` 76,327-78,754 -> 76,349-78,776. Twenty-two nodes, 0.03%.** Flat.
 *   - `ambient-dub` 156-158 -> 157-163, `drone-study` 24 -> 25, `relay` 49 -> 51, `lydian-house`
 *     140-305 -> 143-307, `major-key-electro` 140-675 -> 143-777.
 *
 * **Attributed by measurement rather than by arithmetic on the totals.** The same sweep with this
 * box removed and everything else present gives `industrial-techno` 132,559 and `weave` 78,754,
 * both the previous row exactly. The whole of the first move and the whole of the second are this
 * device, so the two directions really do disagree.
 *
 * The MC-707 row did not predict that. Its thesis was that a second box duplicating the first's
 * recipe sheet doubles the candidates for *every* request either can serve, and a sheet belongs to
 * the box rather than to the direction reading it, so both large directions moved by the same 67%.
 * This box moves one by 68% and the other by nothing, so the cost is not in the sheet's size.
 * **Where it is instead has not been established, and this row should not be read as if it had.**
 * The plain candidate is that the roles `industrial-techno` asks for are where this box's recipes
 * land while `weave` asks for others. That is a hypothesis, and confirming it means pricing the
 * contended roles rather than counting the recipes.
 *
 * For whoever sizes the next device: **the recipe count will not tell you which directions pay.**
 * The MC-707 row warned that counting a near-clone's own sheet under-predicts by nearly two. This
 * one adds that the bill can land entirely on one direction, so a total taken across the table can
 * hide a single row approaching the cap.
 *
 * Nothing caps. `industrial-techno` at 223,348 was 111.7% of the old 200,000 `DEFAULT_NODE_CAP`,
 * making this the device that pushed the constant past itself, and is 44.7% of the 500,000 that
 * replaced it. `lib/core/search.ts` records why that re-derivation is against measured latency
 * rather than to fit this row.
 *
 * ---
 *
 * **The Circuit Tracks moves both large directions by the same half**, which puts it back in the
 * MC-707's shape rather than the MicroFreak's — and the two rows together are why neither shape
 * should be read as the rule.
 *
 *   - **`industrial-techno` 197,191-223,348 -> 282,896-333,077**, up 43.5% at the floor and 49.1%
 *     at the peak.
 *   - **`weave` 76,349-78,776 -> 113,021-116,453**, up 48.0% and 47.8%. The row the MicroFreak
 *     left flat to twenty-two nodes moves in step with the other this time.
 *   - `ambient-dub` 157-163 -> 163-169, `drone-study` 25 -> 26, `relay` 51 -> 53.
 *   - **Two directions get cheaper at the peak**: `lydian-house` 143-307 -> 150-250 and
 *     `major-key-electro` 143-777 -> 153-472. Floors rise, peaks fall. That is the
 *     non-monotonicity `DEFAULT_NODE_CAP`'s docstring records — a new box can hand the search a
 *     cheaper early solution on the seed that used to be worst — and it is the reason a total
 *     taken across this table would have reported a smaller move than any single row did.
 *
 * Attributed by measurement: the same sweep with this box removed and everything else present
 * gives `industrial-techno` 223,348 and `weave` 78,776, both the previous row exactly.
 *
 * **The contested-role hypothesis was tested here and does not explain this row.** The paragraph
 * above leaves it open, and the skill built on it tells the next author to ask which of their
 * roles are already crowded. This box serves ten tonal roles from a pool of two timbres, `pad`
 * among them, so it was the obvious candidate. The same sweep with `pad` dropped from the synth
 * pool **and** its recipe removed gives `industrial-techno` **329,531** — 1.1% of a 109,729-node
 * rise — and `weave` **116,453**, unmoved to the node. So the cost is spread across the tonal
 * roles rather than sitting in one of them.
 *
 * For whoever sizes the next device: the MC-707 row says a duplicated sheet under-predicts by
 * two, the MicroFreak row says one crowded role can carry a whole device's bill, and this row
 * says a box can cost as much as either with neither mechanism present. **None of the three is a
 * formula.** Measure the sweep before and after, direction by direction, and put both numbers in
 * the commit.
 *
 * Nothing caps. `industrial-techno` at 333,077 is 66.6% of the 500,000 `DEFAULT_NODE_CAP`.
 *
 * ---
 *
 * **The RD-8 is the first device to make the two large directions cheaper**, and it is a
 * near-clone of the box directly above it in the registry, which is what makes the row worth
 * reading rather than filing as noise. (The RD-9 landed between the row above and this one and
 * left no paragraph of its own; the figures it moved are the ones being compared against here.)
 *
 *   - **`industrial-techno` 815,668-834,964 -> 673,906-718,179**, down 17.4% at the floor and
 *     14.0% at the peak. The worst seed moves 10 -> 16.
 *   - **`weave` 210,469-226,109 -> 138,768-160,264**, down 34.1% and 29.1%. Both large
 *     directions move together, which is the MC-707's shape — with the sign reversed.
 *   - **`major-key-electro` 157-587 -> 163-169**, and the peak falls by 71% because the row's one
 *     spike is gone: 587 on seed 13, which no other seed came within four hundred nodes of.
 *   - `ambient-dub` 168-174 -> 173-178 and `lydian-house` 154-258 -> 158-266 each rise by four to
 *     eight nodes. `drone-study` at 26 and `relay` at 53 are unmoved.
 *
 * Attributed by measurement, as every row above is: the same sweep with this box removed and
 * everything else present gives `industrial-techno` 834,964 and `weave` 226,109, both the
 * previous row exactly.
 *
 * **A product clone is not a cost clone, and this row is the difference.** The MC-707's thesis
 * was that a sibling doubles the candidates for every request either box can serve, because its
 * twenty recipes were the first box's retargeted — same roles, same characters, so every request
 * saw two candidates of *exactly equal* cost, and equal costs are what the seed permutes among
 * (§7.2). The RD-8 and the RD-9 are the same chassis and the same sequencer with almost no voices
 * in common: 808 congas, claves, maracas and a cow bell against 909 toms, a crash and a ride. Its
 * nineteen recipes are authored against a different voice set, so the (role, character) pairs are
 * not the sibling's and the equal-cost pairing the MC-707 row describes largely does not form.
 *
 * **Why the count went down rather than merely up-less has not been established, and this row
 * should not be read as if it had.** The plain candidate is the non-monotonicity
 * `DEFAULT_NODE_CAP`'s docstring already records and the Circuit Tracks row already saw on two
 * small directions — a new box hands the search a cheaper early solution on the seed that used to
 * be worst, and the bound then prunes what that seed used to walk. Confirming it means
 * instrumenting the incumbent rather than counting recipes, which nothing here does.
 *
 * For whoever sizes the next device: the three rows above say a duplicated sheet under-predicts,
 * a crowded role can carry a whole bill, and a box can cost as much as either with neither
 * mechanism present. **This one adds that the sign is not predictable either.** Measure.
 *
 * Nothing caps. `industrial-techno` at 718,179 is 35.9% of the 2,000,000 `DEFAULT_NODE_CAP`.
 *
 * ---
 *
 * **The NEUTRON puts the two large directions back up, and adds a spike to a small one.** One
 * semi-modular voice, nineteen recipes over fourteen roles.
 *
 *   - **`industrial-techno` 673,906-718,179 -> 728,390-843,270**, up 8.1% at the floor and 17.4%
 *     at the peak. The worst seed moves 16 -> 0.
 *   - **`weave` 138,768-160,264 -> 148,014-195,662**, up 6.7% and 22.1%. Both large directions
 *     move together and in the same direction, which is the MC-707's and the RD-8's shape again.
 *   - **`major-key-electro` 163-169 -> 168-312**, and the peak nearly doubles because the row
 *     grows a spike where the RD-8 removed one: 312 on seeds 17 and 21, against a row that no
 *     other seed takes above 173. The RD-8 row above describes the mirror of this on seed 13, and
 *     neither is explained. **A spike in a two-hundred-node row is worth noticing and not worth
 *     chasing** — it is four parts in ten thousand of the sweep's worst case.
 *   - `ambient-dub` 173-178 -> 178-183 and `lydian-house` 158-266 -> 160-269 each rise by two to
 *     five nodes. `drone-study` 26 -> 27 and `relay` 53 -> 55.
 *
 * Attributed by measurement, as every row above is: the same sweep without this box gives
 * `industrial-techno` 718,179 and `weave` 160,264, both the previous row exactly.
 *
 * **The mechanism here is the MicroFreak's rather than the MC-707's, and it is the third row to
 * say so.** Nothing about this box is a clone of anything: it is the only Behringer semi-modular
 * beside the CRAVE and its recipes are authored against a different panel entirely. What it does
 * do is put nineteen new candidates onto roles the library already crowds — `kick`, `sub` and
 * `pad` among the fourteen, which the MicroFreak and Circuit Tracks rows both found to be where
 * the bill sits. A new candidate on a crowded role is expensive; a new *folder* is not.
 *
 * Nothing caps. `industrial-techno` at 843,270 is 42.2% of the 2,000,000 `DEFAULT_NODE_CAP`, and
 * the headroom is 2.37x — the first figure since the constant moved to spend over 40% of it.
 *
 * ---
 *
 * **The MODEL D raises every floor in the table and lowers both large peaks.** It is the first
 * device to move a row in both directions at once, and it does it on the two rows that matter.
 * One monophonic voice, sixteen recipes over thirteen roles.
 *
 *   - **`industrial-techno` 728,390-843,270 -> 784,996-832,343.** The floor rises 7.8% and the
 *     peak *falls* 1.3%, and the worst seed moves 0 -> 9. The row is flatter than it was: 843,270
 *     stood 15.8% above its own floor, and 832,343 stands 6.0% above the new one.
 *   - **`weave` 148,014-195,662 -> 156,944-179,584**, the same shape and more of it — floor up
 *     6.0%, peak down 8.2%, worst seed 0 -> 9 again. Both large directions move together, which
 *     is the MC-707's and the RD-8's and the NEUTRON's shape; that they move *apart* at the two
 *     ends of the row is new.
 *   - `ambient-dub` 178-183 -> 182-187, `lydian-house` 160-269 -> 162-272 and `major-key-electro`
 *     168-312 -> 171-319 each rise by two to seven nodes. `drone-study` 27 -> 28 and `relay`
 *     55 -> 57 are the floor: one more device at the root and nothing else.
 *   - `major-key-electro`'s spike **moves seeds** rather than growing: it was 312 on seeds 17 and
 *     21 and is 317-319 on 12, 15 and 23. The RD-8 row removed a spike, the NEUTRON row grew one,
 *     and this one relocates it. Still four parts in ten thousand of the sweep's worst case, and
 *     still not worth chasing.
 *
 * Attributed by measurement, as every row above is, and this attribution is the strongest the
 * table has had: the same sweep without this box reproduces **all seven rows to the node**,
 * including both large ones.
 *
 * **The mechanism is the one `DEFAULT_NODE_CAP`'s docstring calls non-monotonicity, seen here
 * with the floor and the peak separated.** Sixteen new candidates on roles the library crowds is
 * what lifts every floor — the NEUTRON's mechanism, one device later. What lowers the two peaks
 * is that the seeds which *were* worst are seeds where this box now gives §7.1 a cheap early
 * solution, so the bound prunes what those seeds used to walk; seed 9, which was ordinary before,
 * is left as the most expensive. **Why this box and not the fifteen before it has not been
 * established**, and the row should not be read as if it had: confirming it means instrumenting
 * the incumbent on seed 0 rather than counting recipes, which nothing here does.
 *
 * For whoever sizes the next device, this row adds to the three above that **a peak can fall
 * while every floor rises**, so a single worst-case number is not a summary of what a device
 * costs. Sweep the table.
 *
 * Nothing caps. `industrial-techno` at 832,343 is 41.6% of the 2,000,000 `DEFAULT_NODE_CAP`, and
 * the headroom is 2.40x — the first device since the constant moved to give headroom *back*.
 *
 * ---
 *
 * **The Digitone II lifts every row, and two of its nineteen recipes carry two thirds of the bill.**
 * One pool of sixteen tracks at polyphony 4, nineteen recipes over nineteen roles — one apiece.
 *
 *   - **`industrial-techno` 784,996-832,343 -> 858,218-942,024.** Floor up 9.3%, peak up 13.2%,
 *     and the worst seed moves 9 -> 3. The MODEL D's row separated floor and peak; this one moves
 *     them together, which is the ordinary shape.
 *   - **`weave` 156,944-179,584 -> 168,836-203,556**, floor up 7.6% and peak up 13.3%, worst seed
 *     9 -> 3 as well. The two large directions move as one, to within a tenth of a percent at the
 *     peak.
 *   - `ambient-dub` 182-187 -> 188-193, `lydian-house` 162-272 -> 169-284, `drone-study` 28 -> 29
 *     and `relay` 57 -> 59: six nodes, twelve nodes, one node, two nodes. One more device at the
 *     root and nothing else.
 *   - **`major-key-electro` 171-319 -> 177-829 is the row worth stopping at.** The floor moves six
 *     nodes and the peak goes up **2.6x**, and it relocates while it does: the spike was 317-319 on
 *     seeds 12, 15 and 23, and is 829 on seeds 11 and 15 with 12 and 23 back down at 181 and 178.
 *     A spike that moves *and* multiplies is new — the MODEL D's row relocated one without growing
 *     it, and the SP-404MK2's grew one without moving it. It is still nine parts in ten thousand of
 *     the sweep's worst case, and still not worth chasing.
 *
 * **The attribution is two recipes out of nineteen, and it repeats the Circuit Tracks' finding
 * exactly.** Dropping only `kick` and `sub` from this manifest takes `industrial-techno` to
 * 871,853 — so those two carry **64%** of the 109,681 nodes the device adds, and the other
 * seventeen recipes carry the rest. Dropping `pad`, `stab`, `lead` and `arp` together takes it to
 * 929,764: four recipes on four tonal roles cost 11%. `weave` says the same thing at its own
 * scale.
 *
 * The library crowds `kick` and `sub` harder than anything else, and a new candidate on a crowded
 * role is what a device costs. Size the next one by asking which of its roles are already busy,
 * not by counting its recipes — this box authored nineteen and paid for two.
 *
 * **The Analog Rytm MKII took the two expensive directions down by half and by 85%**:
 * `industrial-techno` 942,024 -> 506,335 and `weave` 203,556 -> 30,005, while the five small
 * directions rose by a handful of nodes each. Adding a fortieth device made the sweep cheaper.
 *
 * Rows have fallen here before — the Tracker Mini's trim took `weave` down about 5% — but that was
 * a sheet getting *smaller*. This is a device arriving, which has always cost something until now.
 *
 * That is the growth curve behaving as `DEFAULT_NODE_CAP`'s docstring says it does rather than a
 * surprise: the cost is in the *bound*, and the bound is fed by how well the library matches what
 * a direction asks for. This box answers `industrial-techno`'s drum requests on exact
 * `(role, character)` keys — kick/hard, snare/hard, closed-hat/clean, clap/bright, rim/clean and
 * three toms among them — so `liveFloor` returns a larger admissible value earlier and prunes
 * strictly more. A recipe that matches is worth more to the search than a recipe that
 * approximates, and this is twenty-one recipes on a box whose roles are the ones these two
 * directions spend their branching on.
 *
 * `weave` falling by 85% is the same effect at its most visible, and it is the direction the
 * MicroFreak barely moved — which is the other half of the standing warning that a figure
 * averaged across this table hides what one direction does.
 *
 * **The Octatrack MKII re-recorded all seven rows and moved two of them hard, in opposite
 * directions.** It is the second sampler with a fungible pool and the first with only eight
 * members, and the row-by-row shape is what this matrix is for — the total moved 2.3% and hid
 * both of the interesting numbers:
 *
 *     drone-study           30 ->     31     one more device at the root
 *     relay                 59 ->     61     two more, both root candidates
 *     ambient-dub          267 ->    277     seed 3, its worst
 *     lydian-house         292 ->    304     flat across the seeds that carry it
 *     major-key-electro    190 ->  1,095     seed 4 alone; every other seed stays near 196
 *     industrial-techno 506,335 -> 518,084   worst seed moves 6 -> 2
 *     weave             30,005 ->  16,173    worst seed moves 6 -> 2, and seed 6 falls to 4,442
 *
 * `weave` nearly halving and `major-key-electro` going up 5.8x are the same mechanism read from
 * both ends, and the Analog Rytm MKII's entry above explains it: a recipe that *matches* gives
 * `liveFloor` a larger admissible value earlier and prunes strictly more, where a recipe that
 * merely *approximates* is one more branch. This box brings eighteen recipes over eighteen roles
 * with no two on the same role, so it is an exact answer to a great deal and the only good answer
 * to almost nothing.
 *
 * `major-key-electro` seed 4 is the sharpest single-seed move in this file's history and it is
 * one seed: the row's other twenty-three sit between 192 and 197, about seven nodes above where
 * they were, which is the handful every small direction here paid. A figure averaged across that
 * row would read 233 and say nothing about either half of it.
 *
 * **The Play+ moved one direction more than twice as far as the headline one, which is this
 * table's whole argument for existing.** The total rose 9.7% and `industrial-techno` 9.6%, and a
 * figure averaged across the row would have reported exactly that and hidden the row that
 * doubled:
 *
 *     drone-study           33 ->     34     one more device at the root
 *     relay                 64 ->     65     one more root candidate
 *     major-key-electro    209 ->    216     flat across every seed
 *     lydian-house         326 ->    335     flat across the seeds that carry it
 *     ambient-dub          297 ->    308     seed 3, its worst
 *     industrial-techno 631,238 -> 691,974   worst seed moves 3 -> 12
 *     weave             17,494 -> 37,593     worst seed moves 3 -> 12, and 2.15x
 *
 * `weave` is the direction the MicroFreak moved by twenty-two nodes and the Analog Rytm MKII cut
 * by 85%, and it is the one this box costs the most. The mechanism is the one the two entries
 * above describe, running the other way: this manifest brings twenty recipes over twenty roles
 * with **no two on the same role**, so it is never a second opinion and rarely an exact answer —
 * one recipe per role means the character asked for is usually a near miss, `liveFloor` gets a
 * smaller admissible value, and each of those recipes is one more branch that survives the prune.
 * The Octatrack MKII's entry predicted exactly this shape from exactly this property, and got the
 * sign right for `major-key-electro` and wrong for `weave`, which is worth keeping.
 *
 * Both worst seeds moving from 3 to 12 together is the same event seen twice: seed 12 is where
 * this box's near misses survive deepest in both directions.
 *
 * Nothing caps. `industrial-techno` at 691,974 is 34.6% of the 2,000,000 `DEFAULT_NODE_CAP`, and
 * the headroom is 2.89x — still above the 2x the constant was derived at, from 3.17x.
 *
 * **The Tracker then moved two directions in opposite directions, which no total could have
 * shown.** The headline barely stirred and two rows went five-fold and thirty-percent-down:
 *
 *     drone-study            34 ->     35     one more device at the root
 *     relay                  65 ->     66     one more root candidate
 *     ambient-dub           308 ->    319     seed 3, its worst, again
 *     lydian-house          335 ->    344     flat across the seeds that carry it
 *     industrial-techno 691,974 -> 728,123    +5.2%, worst seed moves 12 -> 18
 *     major-key-electro     216 ->  1,224     **5.7x**, worst seed moves 4 -> 3
 *     weave              37,593 -> 26,189     **down 30%**, worst seed moves 12 -> 10
 *
 * The two outliers are one mechanism seen from both ends, and it is the *opposite* of the Play+'s.
 * That box brought twenty recipes over twenty roles with no two on the same role, so it was never
 * a second opinion and rarely an exact answer. This one brings nineteen over eighteen roles with
 * one role doubled, and — because it is a sampler with a single fungible pool — it is an *exact*
 * answer far more often. On `weave` that is worth 30%: a recipe that matches gives `liveFloor` a
 * larger admissible value and the prune bites earlier, so the branch dies instead of surviving.
 * On `major-key-electro` the same availability costs five-fold, because that direction was
 * previously flat at ~215 across every seed — nothing was ever close enough to be worth
 * exploring, and now something is. A row that has never varied starting to vary is a bigger event
 * than a row that grew 5%, and it is invisible in a total.
 *
 * Still nothing caps. `industrial-techno` at 728,123 is 36.4% of the 2,000,000
 * `DEFAULT_NODE_CAP`, and the headroom is 2.75x — above the 2x the constant was derived at, from
 * 2.89x.
 *
 * ## Generative Drift, a row added rather than a row moved
 *
 * The eighth direction is the first entry here that is not a device landing, so nothing above it
 * moved: a direction is a new problem, not a new answer to the seven existing ones, and the other
 * rows reproduce to the node. Its own row runs 215-743 over the twenty-four seeds, which puts it
 * between `lydian-house` and `major-key-electro` and nowhere near the cap.
 *
 * It asks for eight parts, which is `weave`'s count, and costs three orders of magnitude less than
 * `weave` does. The difference is what the parts are: `weave` is seven percussion roles competing
 * for the same drum voices on nearly every box, so the branching is in the ties. This one spreads
 * its eight over `pad`, `sub`, `arp`, `closed-hat`, `metallic`, `ghost-perc`, `texture` and
 * `sweep` — eight different roles, most of them answered exactly by whichever boxes answer them at
 * all — so `liveFloor` is tight from the first branch and there is little for the seed to permute.
 * Part count is not what this table measures; contention is.
 *
 * ## Acid Lineage, the second row added rather than moved
 *
 * The ninth direction, and like the eighth it moves nothing above it — the other eight rows
 * reproduce to the node. Its own row runs 146-236 over the twenty-four seeds, which makes it the
 * third cheapest direction here, above `drone-study` at 35 and `relay` at 66 and well below
 * `lydian-house`.
 *
 * It asks for five parts, the smallest count in the table after `drone-study`'s one, and the row
 * is nearly flat: twenty-two of the twenty-four seeds sit within two nodes of 147, and two of them
 * (0 and 8) explore to 236. The flatness is the same mechanism `generative-drift` shows and not
 * the part count — four of the five requests are `kick`, `closed-hat`, `clap` and `sub`, the
 * best-served roles in the library, so an exact answer is available at almost every branch and
 * `liveFloor` prunes immediately; the fifth is `acid`, which twenty boxes answer and every other
 * box answers not at all, so there is very little for the seed to permute among equals. Part count
 * is not what this table measures; contention is.
 *
 * ## Hip-Hop, the third row added rather than moved
 *
 * The tenth direction, and like the eighth and ninth it moves nothing above it — the other nine
 * rows reproduce to the node. Its own row runs 224-3,622 over the twenty-four seeds, which makes
 * it the fourth most expensive here: above `lydian-house`'s 1,330 peak, below `weave`'s 26,203, and
 * three orders of magnitude below `industrial-techno`.
 *
 * It asks for eight parts, the same count as `generative-drift`, and costs about five times as
 * much — which is the table's own point restated. Four of the eight are `kick`, `snare`,
 * `closed-hat` and `ghost-perc`, and on any groovebox or drum machine those four are competing for
 * the same handful of voices, so the branching is in the ties exactly as it is on `weave`. What
 * keeps it two orders below `weave` is that the other four requests barely contend at all:
 * `vox-chop` at `clean` is answered exactly by four boxes and by a distance-2 substitution on nine
 * more, and `sub`, `stab` and `texture` land on tonal voices the percussion roles never wanted.
 * Part count is not what this table measures; contention is.
 *
 * The 16x spread between the cheapest seed and the dearest is the seed permuting among equal
 * costs on those four percussion roles, and it is the same shape `weave`'s row has at a larger
 * scale: most seeds sit near 1,100-1,400 and a few explore.
 *
 * ## Breakbeat, the fourth row added rather than moved
 *
 * The eleventh direction, and like the eighth, ninth and tenth it moves nothing above it — the
 * other ten rows reproduce to the node. Its own row runs 230-65,397 over the twenty-four seeds,
 * which makes it the second most expensive here: an order of magnitude above `weave`'s 26,203 peak
 * and an order below `industrial-techno`.
 *
 * **The row is bimodal rather than spread, and the cause is measured rather than reasoned about.**
 * Twenty of the twenty-four seeds sit between 230 and 2,524; the other four (1, 4, 19 and 23) land
 * near 65,000. Six of its eight requests are percussion — `snare`, `kick`, `closed-hat`, `rim` and
 * **two** `ghost-perc` — so on a groovebox or a drum machine they compete for one pool of voices
 * and the branching is in the ties, which is `weave`'s mechanism again.
 *
 * The second `ghost-perc` request is the whole of it, and dropping it says so: with
 * `r-ghost-perc-dark` removed the row collapses to 205-207 over all twenty-four seeds, flat. Two
 * requests for one role are two branches at every tie that role is in, and the four seeds that
 * explore are the ones whose tie-break order does not settle the pair early. **The pair is content,
 * not accident** — the direction's own header argues for it — so the cost is bought deliberately
 * and recorded here rather than discovered later.
 *
 * Nothing about that reaches a rig anybody owns. `npm run measure:search` reports the worst *legal*
 * rig unchanged at 46,609 nodes on `weave` — this direction did not become the worst ten-device
 * rig, and it did not move the catalogue benchmark either, which stays 728,123 on
 * `industrial-techno` (#301: read the first figure, the second is a benchmark).
 *
 * **The row did not move when five of its eight requests became `transient`**, and the zero is
 * informative rather than lucky. §4.2 frees a voice only across sections a request does not
 * occupy, and all five of this direction's transient requests occupy `Whole` and `Back Harder`, so
 * no two of them are ever disjoint and the occupancy constraint the search walks is the one it
 * walked when they were all continuous. Every number here is identical either way. It would stop
 * being identical the moment two of those section lists stopped overlapping.
 *
 * **`acid-lineage` alone re-recorded when the Tracker Mini authored `acid + dirty`** (§2.3/#25),
 * every seed by two nodes: 236 -> 238 at its worst, 146 -> 148 at its cheapest. The first of the
 * three reasons above, the library moving, and it moved in the narrowest possible way. Two nodes
 * is two more root candidates — the recipe is written on both pools, because a recipe names one
 * voice — and nothing deeper, since `resolveRecipe` still returns one resolution per
 * `(assignable, role, character)` and this key had none before. No other row moved: this is the
 * one direction in the library that requests `acid`.
 *
 * The synth-slot resource that landed with it costs nothing here, and that is worth stating
 * because it is a *feasibility* constraint inside the walk. It can only refuse candidates, never
 * add them, and this direction asks for one part per synth patch — so nothing is ever refused and
 * the walk is what the extra candidates alone make it.
 *
 * **The TR-1000's two `bass-mid` recipes re-recorded exactly the five directions that request
 * `bass-mid`**, and left the other six untouched: `ambient-dub` 234 -> 235 at its worst seed,
 * `lydian-house` and `major-key-electro` by one and by seven, `relay` 66 -> 67 flat across all
 * twenty-four, and `industrial-techno` 729,675 -> 729,808. The first of the three reasons above,
 * in its narrowest form — one more root candidate on a request that had none from this box, and
 * nothing deeper, because `resolveRecipe` still returns one resolution per `(assignable, role,
 * character)` and the LT had no `bass-mid` resolution before.
 *
 * `industrial-techno` moving by 133 where the others move by one is the direction asking for
 * `bass-mid` at `dirty` on a rig where the box now answers it exactly rather than being absent
 * from the request — a different cost at every tie the LT is in, not a wider tree. Nothing here
 * reaches a rig anybody owns: `npm run measure:search` reports the worst legal rig unchanged at
 * 46,609 nodes on `weave`, which asks for no `bass-mid` at all.
 */
describe('the bound, direction by direction (§7.1/#159)', () => {
  const LIFTED = 20_000_000
  const SEEDS = Array.from({ length: 24 }, (_, i) => i)

  /** Nodes visited per seed, index 0..23, on the unchanged search. */
  const RECORDED: Record<string, readonly number[]> = {
    'acid-lineage': [
      238, 149, 150, 149, 150, 149, 150, 149, 238, 148, 149, 149, 149, 148, 150, 148, 149, 149, 148,
      149, 149, 149, 149, 150
    ],
    'ambient-dub': [
      235, 336, 239, 334, 340, 237, 239, 330, 244, 241, 241, 328, 241, 244, 240, 235, 335, 243, 424,
      335, 243, 244, 235, 239
    ],
    'breakbeat': [
      688, 65397, 1398, 535, 64966, 230, 233, 538, 233, 538, 233, 537, 1475, 616, 338, 793, 2524,
      233, 233, 64968, 538, 233, 793, 64967
    ],
    'drone-study': [
      35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35
    ],
    'generative-drift': [
      426, 217, 643, 219, 751, 217, 643, 217, 570, 296, 723, 217, 563, 299, 270, 296, 217, 270,
      296, 563, 219, 563, 296, 570
    ],
    'hip-hop': [
      1350, 225, 2810, 261, 1383, 229, 3623, 229, 1081, 1990, 1114, 2497, 3126, 1958, 1352, 2529,
      228, 1352, 229, 1081, 228, 1385, 225, 1081
    ],
    'industrial-techno': [
      624777, 632348, 627168, 630708, 634467, 624785, 631187, 626425, 630401, 623123, 677274,
      626425, 628659, 623122, 632348, 626339, 623123, 688864, 729808, 630981, 623123, 630258,
      624785, 627168
    ],
    'lydian-house': [
      230, 1222, 1105, 1121, 1122, 395, 1106, 394, 1122, 1331, 229, 394, 1106, 702, 308, 1331,
      1331, 308, 1318, 230, 702, 230, 1214, 231
    ],
    'major-key-electro': [
      408, 224, 222, 1233, 224, 224, 223, 224, 406, 221, 224, 224, 218, 221, 224, 221, 224, 223,
      224, 220, 224, 221, 224, 223
    ],
    'relay': [
      67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67
    ],
    'weave': [
      236, 328, 1294, 567, 273, 328, 1294, 274, 342, 1185, 22728, 274, 344, 1185, 241, 270, 328,
      9540, 23187, 538, 496, 457, 241, 241
    ],
  }
  // Code unit, not locale: §"Two rules that are easy to break silently".
  const byId = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

  /**
   * A direction authored after this table was recorded would otherwise be pinned by nothing, and
   * the sweep below would pass while covering less than it claims to.
   */
  it('covers every shipped direction and no others', () => {
    expect(Object.keys(RECORDED).sort(byId)).toEqual(TEMPLATES.map((t) => t.id).sort(byId))
  })

  /**
   * **One test per direction, because a test that outlives the RPC deadline takes the run down.**
   *
   * This was a single test sweeping all seven. It ran 131.7s on a CI runner, and birpc's deadline
   * for a worker's `onTaskUpdate` reply is 60s (`DEFAULT_TIMEOUT = 6e4`), so the run died with
   * `[vitest-worker]: Timeout calling "onTaskUpdate"` and every assertion passing. The yields
   * below already bound each *block* to one search; what was too long was the test itself.
   *
   * Split changes no coverage — same directions, same seeds, same rows — and it names the
   * direction that moved in the test title rather than only in the failure message.
   */
  /**
   * Seeds in chunks of eight, so no single test outlives the deadline even on the direction that
   * costs the most. `industrial-techno` is roughly six times any other direction here, and a
   * whole-direction test still ran 54.5s locally against a CI runner half again slower.
   */
  const CHUNK = 8
  const SLICES = TEMPLATES.flatMap((t) =>
    Array.from({ length: Math.ceil(SEEDS.length / CHUNK) }, (_, i) => {
      const seeds = SEEDS.slice(i * CHUNK, (i + 1) * CHUNK)
      return [`${t.id} seeds ${seeds[0]}-${seeds[seeds.length - 1]}`, t, seeds, i * CHUNK] as const
    }),
  )

  it.each(SLICES)(
    'walks the recorded nodes on %s, uncapped',
    async (_label, template, seeds, offset) => {
      const row = RECORDED[template.id] as readonly number[]

      const walked: number[] = []
      for (const seed of seeds) {
        // Yield so the worker can answer the main thread; see the note in
        // `search-symmetry.test.ts`'s cap sweep. A block this long fails CI with an RPC timeout
        // while every assertion passes, which is the least debuggable red there is.
        await new Promise((r) => setImmediate(r))
        const result = assign({
          devices: [...DEVICES],
          template,
          mood: moodState({}),
          seed,
          nodeCap: LIFTED,
        })
        const where = `${template.id} seed ${seed}`
        expect(result.search.capped, where).toBe(false)
        expect(result.search.method, where).toBe('exhaustive')
        walked.push(result.search.nodes)
      }

      // The message is this slice of the row in source form, so a library change is re-recorded by
      // pasting the slices back over the entry above rather than by re-deriving 24 numbers by hand.
      const recut = `      ${walked.join(', ')},`
      const expected = row.slice(offset, offset + walked.length)
      expect(walked, `${template.id} seeds ${offset}+ moved — this slice is now\n${recut}`).toEqual([
        ...expected,
      ])
    },
    300_000,
  )

  /**
   * §7.1/#159/#229. **The worst direction, and a band around it — read off the table above rather
   * than swept for.**
   *
   * This assertion used to live in `test/search-symmetry.test.ts`, where it ran its own 168
   * exhaustive searches over the whole registry to find one number. That was the same 168 searches
   * the sweep above already walks, so the gate paid ~21M nodes twice for a figure the first run
   * contains — and in August 2026 the duplication put three sweeps over their CI timeouts at once
   * while every assertion passed, which is the least debuggable red there is. The history of what
   * each device did to this number stays in that file; only the arithmetic moved here.
   *
   * **Deriving it is sound because the sweep above is what makes it sound.** `RECORDED` is not a
   * remembered constant: the test above walks every direction and seed uncapped and fails on a
   * single node's difference, so by the time this runs the table has been proven equal to the live
   * search on this tree. Asserting over it is asserting over the search.
   *
   * The band, not the ceiling, is the point — `capped === false` passes at 1,999,999, which is how
   * a cost problem stays invisible until it is catastrophic. Five percent either side fires while
   * there is still somewhere to go.
   *
   *  - **Over the ceiling** — something got more expensive. Re-measure with
   *    `npm run measure:search`, and read the near-clone paragraphs in `search-symmetry.test.ts`
   *    before reaching for `DEFAULT_NODE_CAP`.
   *  - **Under the floor** — something got cheaper. Good news and a stale comment: move the band
   *    down and keep the alarm's sensitivity.
   */
  /**
   * 566,355 since the Digitone, up from 506,335 — the "over the ceiling" case above, fired and
   * answered by re-measuring rather than by widening the margin. `npm run measure:search` reads
   * 566,355 on `industrial-techno` seed 4, against 518,084 on seed 2 before it: a 9.3% rise for
   * a device that adds four assignables carrying twenty-two roles, and headroom of 3.53x against
   * the cap where it was 3.86x. Nothing capped, so the band is tracking a real move rather than
   * covering for a cost problem.
   */
  /**
   * **631,238 on `industrial-techno` seed 3 with the Digitakt**, against 566,355 on seed 4 before
   * it: an 11.5% rise, and headroom of 3.17x against the cap where it was 3.53x. The comparison
   * with the entry above is the useful half — the Digitone added four assignables carrying
   * twenty-two roles for 9.3%, and this box adds eight carrying the same twenty-two for 11.5%, so
   * twice the pool cost a quarter more rather than twice as much. What the two have in common is
   * that the roles were already crowded; what differs is that this one arrives beside a sibling
   * already answering most of the same requests. Nothing capped.
   */
  /**
   * **691,974 on `industrial-techno` seed 12 with the Play+**, against 631,238 on seed 3 before
   * it: a 9.6% rise, and headroom of 2.89x against the cap where it was 3.17x. This is the third
   * groovebox in a row to fire the "over the ceiling" case and be answered by re-measuring, and
   * the three together make the pool-size reading above look thin. The Digitone added four
   * assignables for 9.3%, the Digitakt eight for 11.5%, and this box adds **sixteen** across two
   * pools for 9.6% — less than the eight-assignable Digitakt cost. Pool size is plainly not what
   * is being paid for.
   *
   * What this one pays for instead is legible in `weave`, which rose 2.15x while the headline
   * direction rose a tenth: twenty recipes over twenty roles with no two on the same role are
   * twenty near misses rather than a few exact answers, and near misses are what survive the
   * prune. The row-by-row table above is where that shows; the 9.6% here hides it entirely, which
   * is the standing warning about averaging this table restated by the device that most rewards
   * reading it. Nothing capped.
   */
  /**
   * **728,123 on `industrial-techno` seed 18 with the Tracker**, against 691,974 on seed 12
   * before it: a 5.2% rise, and headroom of 2.75x against the cap where it was 2.89x. The
   * smallest rise of the four grooveboxes in a row, from the one with the *fewest* assignables:
   * the Digitone added four for 9.3%, the Digitakt eight for 11.5%, the Play+ sixteen for 9.6%,
   * and this box adds eight for 5.2%.
   *
   * What makes it cheap is what the table above reads off `weave`, which *fell* 30%. A sampler
   * with one fungible pool and nineteen recipes over eighteen roles is an exact answer far more
   * often than a near miss, and an exact answer gives `liveFloor` a larger admissible value, so
   * the prune bites earlier and the branch dies rather than surviving. That is the Play+'s
   * mechanism running backwards, on the direction the Play+ doubled.
   *
   * It is not free anywhere, though, and `major-key-electro` is where it is paid: 216 to 1,224,
   * a row that had never varied across twenty-four seeds beginning to vary. Nothing capped.
   */
  /**
   * #301. **The catalogue figure is tracked here and gated nowhere, and that is the change.**
   *
   * This held the whole-catalogue worst case in a five percent band. The band was a drift alarm
   * and it worked as one — it also blocked work three separate times: a device landing (#248), a
   * test (#293), and a percussion change whose real cost was three milliseconds (#300). A figure
   * measured over all 46 devices reads like a limit the product is approaching, and it is not one.
   * Nobody can select 46 devices: `MAX_RIG_DEVICES` is 10 and `withDevice` refuses the eleventh.
   *
   * So the catalogue is asserted only against the cap it must not reach, and the *gate* is a rig
   * somebody can build. `RECORDED` above keeps its exact per-direction table, which is a different
   * claim and still worth a node of precision: that is `lowerBound` not drifting, a property of
   * the search rather than of a rig.
   */
  it('keeps the catalogue inside the cap, and a rig somebody owns nowhere near it', () => {
    let worst = { nodes: -1, where: '' }
    for (const [id, row] of Object.entries(RECORDED)) {
      row.forEach((nodes, seed) => {
        if (nodes > worst.nodes) worst = { nodes, where: `${id} seed ${seed}` }
      })
    }

    // #228: a capped search returns a worse allocation without saying so, so this is a
    // correctness bound and not a latency one. No band — see above.
    expect(worst.nodes, `catalogue worst is ${worst.nodes} on ${worst.where}`).toBeLessThan(
      DEFAULT_NODE_CAP,
    )

    /**
     * The number that decides anything. A full legal rig taken at a stride across the registry,
     * so it spans kinds rather than clustering on one maker, swept over every direction.
     *
     * Against a tenth of the cap, which is loose on purpose: a tight band here would recreate
     * exactly the problem this test stopped having. It watches for an order of magnitude.
     */
    const stride = Math.floor(DEVICES.length / MAX_RIG_DEVICES)
    const rig = DEVICES.filter((_, i) => i % stride === 0).slice(0, MAX_RIG_DEVICES)
    expect(rig).toHaveLength(MAX_RIG_DEVICES)

    let legalWorst = { nodes: -1, where: '' }
    for (const template of TEMPLATES) {
      for (let seed = 0; seed < 8; seed++) {
        const result = assign({ devices: rig, template, mood: moodState({}), seed })
        expect(result.search.capped, `${template.id} seed ${seed}`).toBe(false)
        if (result.search.nodes > legalWorst.nodes)
          legalWorst = { nodes: result.search.nodes, where: `${template.id} seed ${seed}` }
      }
    }
    expect(
      legalWorst.nodes,
      `a ${MAX_RIG_DEVICES}-device rig cost ${legalWorst.nodes} on ${legalWorst.where}`,
    ).toBeLessThan(DEFAULT_NODE_CAP / 10)
  })
})
