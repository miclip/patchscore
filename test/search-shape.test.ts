import { describe, expect, it } from 'vitest'
import { assign, measureSearchShape, moodState } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * §7.1/#159. The probe that measures the search's shape, held to two things: that it observes the
 * traversal without changing it, and that the claim its state key rests on is true.
 *
 * The numbers themselves live in `npm run bench:search-shape` and in `DEFAULT_NODE_CAP`'s
 * docstring. They are not asserted here, because two other files assert them already and ask
 * different questions of the same measurement. `test/search-symmetry.test.ts` holds the peak in
 * a five percent band, which is the alarm on the cap. `test/search-bound.test.ts` pins every
 * direction at every seed exactly, which is the guard on `lowerBound` still returning the value
 * it used to return, where one node of drift is the whole finding.
 *
 * So the peak is now asserted in two places, loosely and exactly, and a device or a direction
 * re-records both. That is the cost of the exact table and it was taken deliberately: a band
 * wide enough to survive an honest re-measurement is far too wide to see a bound change.
 * This probe's own `visited` is asserted against the traversal it shadows, not against any
 * recorded figure.
 */

const LIFTED = 20_000_000

describe('the search shape probe (§7.1/#159)', () => {
  it('observes the traversal without changing it', () => {
    for (const template of TEMPLATES) {
      const input = { devices: [...DEVICES], template, mood: moodState({}), seed: 3 }
      const plain = assign(input)
      const shape = measureSearchShape(input)

      // The probe sits at the statement that increments `nodes`, so these are the same count by
      // construction. A mismatch means it has drifted from the traversal it is measuring.
      expect(shape.visited, template.id).toBe(shape.search.nodes)
      // And the traversal is the shipped one: same nodes, same verdict, same method.
      expect(shape.search.nodes, template.id).toBe(plain.search.nodes)
      expect(shape.search.capped, template.id).toBe(plain.search.capped)
      expect(shape.search.method, template.id).toBe(plain.search.method)
    }
  })

  it('accounts for every node exactly once', () => {
    const shape = measureSearchShape({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState({}),
      seed: 9,
      nodeCap: LIFTED,
    })
    expect(shape.bounded + shape.expanded).toBe(shape.visited)
    expect(shape.unique + shape.repeats).toBe(shape.visited)
    // Every node was checked, which is what makes the derivation claim below worth anything.
    expect(shape.checks).toBe(shape.visited)
  })

  /**
   * `canonicalState` leaves `occupiedByDevice` out of the key on the grounds that it is a
   * function of the occupancy already in there — every `AssignableKey` is `${deviceId}/${voiceId}`.
   * The probe rebuilds it at every node and throws if it ever disagrees with the live map, so
   * this test's job is to prove that check runs rather than to repeat it: a rig that exercises
   * pools, stacks and crowding without throwing is the assertion.
   */
  it('confirms the per-device counts are derivable from occupancy, at every node', () => {
    expect(() =>
      measureSearchShape({
        devices: [...DEVICES],
        template: industrialTechno,
        mood: moodState({}),
        seed: 9,
        nodeCap: LIFTED,
      }),
    ).not.toThrow()
  })

  it('honours the cap, so a worst case has to be asked for deliberately', () => {
    const capped = measureSearchShape({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState({}),
      seed: 9,
      nodeCap: 5_000,
    })
    expect(capped.visited).toBe(5_000)
    expect(capped.search.capped).toBe(true)

    const full = measureSearchShape({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState({}),
      seed: 9,
      nodeCap: LIFTED,
    })
    expect(full.search.capped).toBe(false)
    expect(full.visited).toBeGreaterThan(capped.visited)
  })

  /**
   * The finding, as a shape rather than as a number: this search spends most of itself being
   * turned away by the bound, and reaches a complete assignment a handful of times. That is why
   * #159's two proposals — decomposition and a completion memo — were both measured and closed,
   * and why the next attempt should be aimed at `lowerBound`.
   *
   * Bounded loosely, at a fraction rather than a count, so it survives a re-measurement that
   * moves the worst case without weakening into something that cannot fail.
   */
  it('is bound-dominated, which is the reason a completion memo cannot pay', () => {
    const shape = measureSearchShape({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState({}),
      seed: 9,
      nodeCap: LIFTED,
    })
    expect(shape.bounded / shape.visited).toBeGreaterThan(0.7)
    // Single digits against six figures of nodes. The exact count is in the bench output.
    expect(shape.leaves).toBeLessThan(100)
    expect(shape.leaves).toBeGreaterThan(0)
  })
})
