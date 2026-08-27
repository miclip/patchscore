import { describe, expect, it } from 'vitest'
import { assign, moodState } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §7.1/#159. The exact traversal every shipped direction walks, seed by seed, recorded on the
 * unchanged search as the baseline for work on `lowerBound`.
 *
 * #159's closing measurement put the search at bounded-on-arrival for 86.4% of its nodes on
 * `industrial-techno` and 86.7% on `weave`, so the bound is where the cost lives. The work this
 * guards is meant to make evaluating the bound cheaper **at identical bound values**: the same
 * `Score` at the same node, reached by less work. A bound that returns a different value is a
 * different bound, whether it prunes more or less, so **any one-node change here is a failure**
 * and not a number to re-record. Re-record only when the library itself changes — a device, a
 * direction, a recipe — because those move the problem rather than the algorithm.
 *
 * `nodeCap: 20_000_000` is the cap lifted clear of the measurement. Nothing in this matrix caps
 * at `DEFAULT_NODE_CAP` today, so the figures are the same either way, and lifting it says that
 * the numbers are the search's true cost rather than something the cap shaped. A capped run
 * reports the cap and not what the walk would have been, which is the one number a degraded
 * search cannot give you.
 *
 * The whole sweep is 168 exhaustive searches, about fifteen seconds, most of it in
 * `industrial-techno`. That is the price of catching a bound change on the direction it matters
 * on rather than only on a cheap one.
 */
describe('the bound, direction by direction (§7.1/#159)', () => {
  const LIFTED = 20_000_000
  const SEEDS = Array.from({ length: 24 }, (_, i) => i)

  /** Nodes visited per seed, index 0..23, on the unchanged search. */
  const RECORDED: Record<string, readonly number[]> = {
    'ambient-dub': [
      25716, 25729, 25798, 25729, 25716, 25791, 25739, 25729, 25716, 25729, 25716, 25790,
      25753, 25729, 25716, 25790, 25729, 25716, 25729, 25716, 25729, 25716, 25730, 25716,
    ],
    'drone-study': [
      14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14,
      14, 14,
    ],
    'industrial-techno': [
      148793, 149068, 148788, 149090, 148788, 155174, 148788, 149053, 150043, 165785, 148793,
      149090, 150641, 149084, 150642, 150626, 149053, 148788, 149068, 150042, 164166, 148789,
      150629, 148789,
    ],
    'lydian-house': [
      324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324, 324,
      324, 324, 324, 324, 324, 324,
    ],
    'major-key-electro': [
      1928, 1897, 1921, 1899, 1901, 1897, 1901, 1901, 2139, 1896, 1928, 1899, 2278, 2613, 2091,
      2272, 1878, 1921, 1878, 2137, 1896, 1901, 2106, 1878,
    ],
    relay: [
      29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,
      29, 29,
    ],
    weave: [
      6744, 6770, 6744, 6771, 6744, 6788, 6744, 6770, 6983, 6770, 6744, 6771, 6983, 6769, 6744,
      6925, 6770, 6744, 6770, 6981, 6770, 6744, 6923, 6744,
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
