import { describe, expect, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice, libraryCounts, totalCounts } from '../lib/studio/provenance'

/**
 * §9/#193. **A recipe shared by reference is one recipe, and the library total says so.**
 *
 * The MPC XL takes the Live III's recipes rather than copying them, which is the right call and
 * the tidiest thing in that commit. But `totalCounts` summed the per-device audits, so the
 * library reported 283 points and 169 ranges nobody had authored. Those totals are quoted in
 * every device commit as evidence that provenance did not regress, so an inflating measure
 * undermines the check it exists for.
 *
 * The numbers below move whenever the Live III gains a recipe, because the whole point is that
 * the XL gains it too — #345's four took them from 283/169 to 363/227. A diff here is the
 * reference working, not a regression.
 */
describe('the library total counts a shared recipe once (#193)', () => {
  it('drops exactly the entries the MPC XL derives, and nothing else', () => {
    const summed = totalCounts(DEVICES.map((d) => auditDevice(d)))
    const deduped = libraryCounts(DEVICES)
    expect(summed.params - deduped.params).toBe(363)
    expect(summed.numerics - deduped.numerics).toBe(227)
    // Nothing that is not a recipe moves.
    expect(deduped.capabilityFacts).toBe(summed.capabilityFacts)
    expect(deduped.unverifiedRanges).toBe(summed.unverifiedRanges)
  })

  it('keeps the One G2, whose citations are its own work', () => {
    // The distinction the whole fix turns on. The One G2 shares every recipe *id* with the Live
    // III and rewrites each citation onto the v3.9 page somebody opened and compared —
    // `mpc-kick-hard` cites p.441 there against p.431 here. De-duplicating by id, which is what
    // #193 proposed, would have erased that.
    const counted = new Set<string>()
    const order = ['akai-mpc-live-iii', 'akai-mpc-xl', 'akai-mpc-one-g2']
    const [live, xl, one] = order.map((id) =>
      auditDevice(DEVICES.find((d) => d.id === id)!, counted),
    )
    expect(live?.counts.params).toBeGreaterThan(0)
    expect(xl?.counts.params).toBe(0)
    expect(one?.counts.params).toBe(live?.counts.params)
  })

  it('leaves a per-device block whole', () => {
    // A reader of the XL's row wants what the XL offers, however it came to offer it. Only the
    // library total answers "how much content exists".
    const xl = auditDevice(DEVICES.find((d) => d.id === 'akai-mpc-xl')!)
    expect(xl.counts.params).toBeGreaterThan(0)
  })

  it('is keyed on content rather than object identity', () => {
    // Identity looks right and is load-path dependent: the generated registry shares the objects,
    // `loadDevices` parses each folder separately, and the audit runs on the second path — so an
    // identity check counted nothing and the totals never moved. A structural copy must still
    // de-duplicate.
    const live = DEVICES.find((d) => d.id === 'akai-mpc-live-iii')!
    const clone = { ...live, id: 'clone-of-live', recipes: live.recipes.map((r) => structuredClone(r)) }
    const counted = new Set<string>()
    auditDevice(live, counted)
    expect(auditDevice(clone as typeof live, counted).counts.params).toBe(0)
  })
})
