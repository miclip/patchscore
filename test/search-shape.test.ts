import { beforeAll, describe, expect, it } from 'vitest'
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

/**
 * **A rig somebody owns**, for the fidelity check below.
 *
 * Eight boxes, chosen to exercise the shapes the probe could plausibly drift on rather than to be
 * large: fixed voices (TR-8S, RD-9), a pool (Tracker Mini), boxes that declare many roles and so
 * collide on the crowded ones (Deluge, Digitakt), and monosynths that compete for one part each
 * (Mother-32, minilogue xd, MicroFreak).
 *
 * It is not the whole catalogue, and that is the point. Resolving all 46 costs 8512ms across the
 * nine directions against 98ms here — 87 times the bill — and every assertion below passes
 * identically on both, because what they claim is that the probe does not perturb the traversal.
 * That is not a claim 46 devices make truer. `CLAUDE.md` settles the general case: nobody selects
 * the whole catalogue, there is no "select all" in the picker, and a whole-catalogue assertion in
 * `search-symmetry.test.ts` had already been removed once for blocking devices from landing.
 *
 * The crowded case is not lost. `beforeAll` still traverses all 46 uncapped, deliberately, and the
 * four tests hanging off it are the ones that are actually about a hard search — including the
 * probe's own `occupiedByDevice` derivability check, which is exactly the thing that wants pools
 * and stacks and crowding.
 */
const OWNED_RIG = DEVICES.filter((d) =>
  [
    'roland-tr-8s',
    'behringer-rd-9',
    'polyend-tracker-mini',
    'synthstrom-deluge',
    'elektron-digitakt',
    'moog-mother-32',
    'korg-minilogue-xd',
    'arturia-microfreak',
  ].includes(d.id),
)

describe('the search shape probe (§7.1/#159)', () => {
  /**
   * **One traversal, shared.** Four tests below asked for the *same* probe — the whole library on
   * `industrial-techno` seed 9, uncapped — and each paid for it separately: roughly twelve seconds
   * apiece, four unbroken synchronous blocks, for one deterministic result (invariant 6). That is
   * what a Vitest worker cannot answer the main thread through, and in August 2026 this file was
   * one of the places CI went red with `[vitest-worker]: Timeout calling "onTaskUpdate"` **while
   * every assertion passed**.
   *
   * Computed once here, with a yield in front of it so the block is bounded. The throw this file
   * cares about is captured rather than left to escape, so the test that exists to prove the
   * probe's internal check runs still reports it rather than failing the whole suite from setup.
   */
  let full: ReturnType<typeof measureSearchShape>
  let probeError: unknown

  beforeAll(async () => {
    await new Promise((r) => setImmediate(r))
    try {
      full = measureSearchShape({
        devices: [...DEVICES],
        template: industrialTechno,
        mood: moodState({}),
        seed: 9,
        nodeCap: LIFTED,
      })
    } catch (error) {
      probeError = error
    }
    // The hook timeout is its own budget and does **not** inherit `testTimeout`: vitest defaults it
    // to 10s, and this traversal is twelve. Stated here rather than raised globally, so every other
    // setup in the suite still fails fast.
    //
    // 300s rather than 120s, and it is **an allowance for a stalled worker, not a claim about the
    // traversal** (#293). After the rig change below this hook is the only thing in the file that
    // holds the event loop long enough to miss an `onTaskUpdate`, and birpc's default is 60s, so
    // the number has to clear two of those on top of twelve seconds of real work. The old 120s was
    // six times headroom and #265 walked straight through it.
  }, 300_000)
  /**
   * **One test per direction, on a rig somebody owns.** This was a single loop over all nine
   * directions across the whole catalogue, on one 120s allowance, until it fired on a macOS runner
   * (#293). Three numbers rewrote what the failure was.
   *
   * **It was never nine directions, it was one.** Split out, eight of them take 1–20ms against the
   * full library and `industrial-techno` takes 8.8 seconds: four hundred times the next slowest,
   * and 99.8% of the file. A budget covering all nine was a budget for one of them with eight
   * rounding errors attached.
   *
   * **And that one was paying for a rig nobody owns.** The nine directions cost 8512ms across all
   * 46 devices and 98ms across eight — 87 times the bill — and every assertion here passes
   * identically on both, because what they claim is that the probe does not perturb the traversal.
   * 46 devices do not make that truer. See `OWNED_RIG`.
   *
   * **It did not fail for being slow.** Across fifteen job-observations it ran between 10.7s and
   * 23.5s on CI; the failure was over 120s — five times the worst honest run, eleven times the
   * median. Nothing gets five times slower because a runner is busy. The same job logged 49
   * unhandled `[vitest-worker]: Timeout calling "onTaskUpdate"`, birpc's default is 60s, and two of
   * those in series is 120s to the second. The clock was running on a worker that was waiting —
   * #265, landing inside a test's timer instead of at teardown.
   *
   * So the cure is not a bigger number here. These now run in tens of milliseconds and inherit the
   * global `testTimeout`; nothing in them holds the event loop long enough to miss an RPC. The
   * stall allowance moved to `beforeAll`, which is the only block left that does.
   *
   * The split earns its keep separately from any of that. Nine tests are nine points where vitest
   * flushes to the main thread, and a worker holding the loop too long is this file's recorded
   * problem rather than a hypothetical one. A failure names the direction instead of "the loop".
   * And the day one direction starts costing what `industrial-techno` used to, the timings say so
   * without anybody instrumenting it.
   */
  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    'observes the traversal without changing it: %s',
    async (_id, template) => {
      /**
       * Yield before the block, for the reason `search-symmetry.test.ts` records at length: a
       * Vitest worker cannot answer the main thread while it holds the event loop, and a run that
       * blocks too long fails with `[vitest-worker]: Timeout calling "onTaskUpdate"` **while
       * reporting every test passed**. This runs the direction twice over the full library — once
       * plain and once probed — which is the most expensive thing in the suite per iteration.
       */
      await new Promise((resolve) => setImmediate(resolve))
      const input = { devices: [...OWNED_RIG], template, mood: moodState({}), seed: 3 }
      const plain = assign(input)
      const shape = measureSearchShape(input)

      // The probe sits at the statement that increments `nodes`, so these are the same count by
      // construction. A mismatch means it has drifted from the traversal it is measuring.
      expect(shape.visited, template.id).toBe(shape.search.nodes)
      // And the traversal is the shipped one: same nodes, same verdict, same method.
      expect(shape.search.nodes, template.id).toBe(plain.search.nodes)
      expect(shape.search.capped, template.id).toBe(plain.search.capped)
      expect(shape.search.method, template.id).toBe(plain.search.method)
    },
  )

  it('accounts for every node exactly once', () => {
    const shape = full
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
    // The probe throws if `occupiedByDevice` ever disagrees with the live occupancy. It ran once
    // in `beforeAll` over this same rig; that it came back at all is the assertion.
    expect(probeError).toBeUndefined()
    expect(full.visited).toBeGreaterThan(0)
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
    const shape = full
    expect(shape.bounded / shape.visited).toBeGreaterThan(0.7)
    // Single digits against six figures of nodes. The exact count is in the bench output.
    expect(shape.leaves).toBeLessThan(100)
    expect(shape.leaves).toBeGreaterThan(0)
  })
})
