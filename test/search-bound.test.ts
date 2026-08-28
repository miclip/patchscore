import { describe, expect, it } from 'vitest'
import { assign, moodState } from '../lib/core/index'
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
 * The whole sweep is 168 exhaustive searches. It used to take about fifteen seconds, nearly all
 * of it in `industrial-techno`; the repair took it under two.
 */
describe('the bound, direction by direction (§7.1/#159)', () => {
  const LIFTED = 20_000_000
  const SEEDS = Array.from({ length: 24 }, (_, i) => i)

  /** Nodes visited per seed, index 0..23, on the unchanged search. */
  const RECORDED: Record<string, readonly number[]> = {
    'ambient-dub': [
      155, 112, 109, 112, 109, 160, 107, 209, 109, 112, 109, 209, 109, 110, 206, 200, 158, 109, 110,
      107, 279, 177, 160, 177
    ],
    'drone-study': [
      18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18
    ],
    'industrial-techno': [
      19628, 18026, 18525, 18813, 17462, 17978, 17462, 18026, 17462, 18026, 17459, 18026, 20425,
      19969, 17462, 17994, 20779, 17572, 17994, 19720, 17994, 17462, 18026, 17572
    ],
    'lydian-house': [
      157, 157, 158, 157, 157, 157, 158, 157, 179, 180, 158, 156, 158, 180, 158, 180, 179, 180, 157,
      180, 157, 180, 157, 203
    ],
    'major-key-electro': [
      728, 156, 507, 415, 238, 151, 238, 209, 238, 156, 975, 156, 230, 153, 238, 152, 617, 209, 152,
      233, 148, 209, 156, 156
    ],
    relay: [
      36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36, 36
    ],
    weave: [
      26614, 24090, 25216, 24090, 24090, 24090, 24090, 24090, 24090, 24090, 24090, 24090, 24090,
      24090, 24090, 24090, 26688, 24090, 24090, 24090, 24090, 24090, 24090, 24090
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

  it('walks the recorded nodes on every direction and seed, uncapped', () => {
    for (const template of TEMPLATES) {
      const row = RECORDED[template.id] as readonly number[]

      const walked = SEEDS.map((seed) => {
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
        return result.search.nodes
      })

      // The message is the row in source form, so a library change is re-recorded by pasting it
      // back over the entry above rather than by re-deriving 24 numbers by hand.
      const recut = `      ${walked.join(', ')},`
      expect(walked, `${template.id} moved — the row is now\n${recut}`).toEqual([...row])
    }
  }, 180_000)
})
