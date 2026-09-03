import { describe, expect, it } from 'vitest'
import { moodState, resolve, type Device } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §7.3/§3.5. **One rig that should never be told "nobody wrote the recipe".**
 *
 * `unauthored` is the one shortfall kind that is our debt rather than the reader's: `rig-limit`
 * says the boxes cannot, `not-needed` says the direction is finished without it, and both are
 * honest answers to give somebody standing at their rack. `unauthored` says their rig can carry
 * the part and the library has not written it — which is a backlog item wearing the costume of a
 * limitation (§7.3, and the "Waiting on us" block the guide prints it under).
 *
 * The four boxes below are the shape a real small studio takes rather than an arbitrary pick: a
 * drum machine, a sampler that covers the sampled roles, and two synths between them covering
 * the tonal ones. If any direction in the library leaves an `unauthored` hole on *this* rig, the
 * hole is in the content and not in anybody's purchase.
 *
 * **Seeds 1-8 rather than one seed**, because the tie-break permutes only among equal costs
 * (§7.1) and a hole that appears at one seed and not another is exactly the kind that survives a
 * single-seed test. Eight is enough to move every tie this rig has and cheap enough to sit in the
 * ordinary run.
 *
 * Two recipes closed the last two holes here — the TR-1000's `metallic` and the Deluge's
 * `vox-chop` pair — and this file exists so that a later change cannot re-open one silently. It
 * asserts an outcome, never a `Score`: the objective may re-order its lower keys freely.
 */
describe('the four-box rig leaves nothing unauthored (§7.3)', () => {
  const RIG_IDS = [
    'roland-tr-1000',
    'synthstrom-deluge',
    'moog-muse',
    'moog-subsequent-37',
  ] as const

  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]

  function box(id: string): Device {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`${id} missing from the registry`)
    return device
  }

  const RIG = RIG_IDS.map(box)

  /** Every `(direction, seed)` pair that reports a part nobody has authored a recipe for. */
  function unauthoredHoles(devices: readonly Device[]): string[] {
    const holes: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices, template, mood: moodState({}), seed })
        for (const shortfall of result.shortfalls) {
          if (shortfall.kind !== 'unauthored') continue
          holes.push(`${template.id} seed ${seed}: ${shortfall.requestId} (${shortfall.reason})`)
        }
      }
    }
    return holes
  }

  it('carries every direction with no part left waiting on us', () => {
    expect(unauthoredHoles(RIG)).toEqual([])
  })

  /**
   * The half that keeps the assertion above from being vacuous. `unauthored` is a derived kind —
   * `no-recipe` on a request the direction actually needs — so a rename or a mis-derivation would
   * make the test above pass by finding nothing anywhere. A drum machine on its own still has
   * holes of exactly this kind, and saying so here means the empty list is a fact about the rig
   * rather than about the query.
   *
   * **The control was the TR-1000 until its LT took `bass-mid`**, which closed its last hole of
   * this kind: across every direction and all eight seeds that box now reports none, which is
   * the outcome this file exists to reach rather than a reason to keep pointing at it. The TR-8S
   * is the same shape one box back — a drum machine that cannot carry the tonal roles and has
   * `bass-mid` among the parts nobody has written for it.
   */
  it('still reports them for a rig that has them, so the empty list means something', () => {
    expect(unauthoredHoles([box('roland-tr-8s')]).length).toBeGreaterThan(0)
    // The retired control, asserted rather than deleted: it is a claim about the library that
    // would otherwise regress silently the next time a recipe moved.
    expect(unauthoredHoles([box('roland-tr-1000')])).toEqual([])
  })
})
