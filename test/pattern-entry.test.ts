import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  PATTERN_ENTRY_FACT,
  patternDriver,
  patternEntryNotice,
  renderGuide,
} from '../lib/core/index'
import { moodState, resolve } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { device, recipe } from './fixtures'

/**
 * §8/#65. **A box that cannot hold a pattern must not be handed a grid.**
 *
 * Phase 5 is called *Step programming* and draws a grid for every part. That is the right
 * instruction for a TR-1000 and wrong for a Minitaur, which has no sequencer at all — every note
 * it plays arrives from somewhere else. The reader was being told to program steps on an
 * instrument with nowhere to put them.
 *
 * What is asserted here is the claim rather than the wording, for the reason #46 recorded: a
 * fixture pinned to a sentence fails an author who rephrases it and passes one who quietly drops
 * the meaning. The exact bytes are the goldens' job.
 */

const CITE = { kind: 'manual', source: 'X Manual, p.1' } as const

function withEntry(over: Record<string, unknown> = {}) {
  return device({
    recipes: [recipe()],
    ...over,
  } as never)
}

describe('patternEntry is a cited claim, in both directions (§8/#65)', () => {
  it('refuses a declaration with no citation behind it', () => {
    const parsed = DeviceSchema.safeParse(
      withEntry({ patternEntry: { kind: 'external', reason: 'no sequencer' } }),
    )
    expect(parsed.success).toBe(false)
  })

  it('refuses a citation with no declaration behind it', () => {
    // The other direction, and the same rule `content` and `noteDuration` carry: a reading that
    // supports no claim is `cited-against`, not a citation left dangling.
    const parsed = DeviceSchema.safeParse(
      withEntry({ capabilityEvidence: { [PATTERN_ENTRY_FACT]: CITE } }),
    )
    expect(parsed.success).toBe(false)
  })

  it('accepts a declaration with its citation', () => {
    const parsed = DeviceSchema.safeParse(
      withEntry({
        patternEntry: { kind: 'external', reason: 'no sequencer' },
        capabilityEvidence: { [PATTERN_ENTRY_FACT]: CITE },
      }),
    )
    expect(parsed.success, JSON.stringify(parsed.error?.issues?.[0])).toBe(true)
  })
})

describe('the notice answers only for a box that declares it', () => {
  it('says nothing for the ordinary case', () => {
    // Unlike `noteDurationNotice`, which always answers. A box that sequences itself has no
    // question here, and a sentence about it on every part of every guide would be noise.
    const selfSequencing = DEVICES.find((d) => d.id === 'roland-tr-1000')
    expect(patternEntryNotice(selfSequencing)).toBeUndefined()
    expect(patternEntryNotice(undefined)).toBeUndefined()
  })

  it('names the two boxes in the library that cannot hold a pattern', () => {
    // Asserted as a set rather than a count, so adding a third device that genuinely cannot
    // sequence itself fails this and has to be looked at rather than silently absorbed.
    const external = DEVICES.filter((d) => patternEntryNotice(d) !== undefined).map((d) => d.id)
    expect([...external].sort()).toEqual(['intellijel-cascadia', 'moog-minitaur'])
  })
})

describe('phase 5 stops telling a sequencer-less box to step-program (§8/#65)', () => {
  /**
   * The fixture searches **seeds as well as directions**, and that breadth is the point rather
   * than thoroughness for its own sake.
   *
   * It was pinned to seed 3, and the day the Muse landed there was no direction at that seed that
   * put a part on the Minitaur — so the guard below fired and the two real assertions went with
   * it. Nothing about #65 had changed: the Minitaur still takes twelve parts across the templates
   * at other seeds, and its `patternEntry` notice still renders exactly as before. What moved was
   * which box won a mono bass request on one seed, which is the resolver's business and not this
   * file's.
   *
   * `device-content.test.ts` reached the same conclusion for the same reason and is worth reading
   * beside this: *"Searched across the real templates rather than pinned to one, because which
   * recipe a template assigns is the resolver's business and pinning it would make this test fail
   * on an unrelated objective change instead of on the thing it is about."* A fixture that has to
   * be re-pinned every time a device lands is not guarding the claim, it is recording a seed.
   *
   * The guard on the subject stays, and stays load-bearing: if the Minitaur ever stops being
   * assigned *anywhere*, this still fails rather than passing vacuously.
   */
  const withMinitaur = TEMPLATES.flatMap((template) =>
    // Both parities, deliberately: this box is assigned on even seeds and not odd ones today,
    // and a sweep that happened to pick 1/3/5/7 would have looked exactly like "never assigned".
    [0, 1, 2, 3].map((seed) => resolve({ devices: [...DEVICES], template, mood: moodState({}), seed })),
  ).find((r) => r.assignments.some((a) => a.deviceId === 'moog-minitaur'))

  it('has a direction that puts a part on the Minitaur at all', () => {
    // Guard on the subject: if the resolver stops assigning it, every assertion below would pass
    // vacuously for ever.
    expect(withMinitaur).toBeDefined()
  })

  it('qualifies the grid rather than removing it', () => {
    const md = renderGuide(withMinitaur!)
    expect(md).toContain('Not programmed here')
    // The figure is real and the reader still has to enter it somewhere, so the grid stays. This
    // is the opposite of §4.2's held pad, where there is no grid to draw at all.
    const after = md.slice(md.indexOf('Not programmed here'))
    expect(after).toMatch(/\d+ steps, band \d/)
  })

  it('carries the device own reason rather than a generic sentence', () => {
    const md = renderGuide(withMinitaur!)
    const notice = patternEntryNotice(DEVICES.find((d) => d.id === 'moog-minitaur'))
    expect(notice).toBeDefined()
    expect(md).toContain(notice!.reason)
  })
})

/**
 * §8/#65, the half that was left. `patternEntry` shipped the claim that a box cannot hold a
 * pattern; this names *which* box drives it, and says plainly when nothing can.
 *
 * The four states are asserted as claims rather than sentences, per #46: a fixture pinned to
 * wording fails an author who rephrases and passes one who drops the meaning.
 */
describe('phase 5 names the box that drives a sequencer-less part (#65)', () => {
  const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))
  const run = (devices: readonly (typeof DEVICES)[number][]) =>
    resolve({ devices, template: TEMPLATES.find((t) => t.id === 'industrial-techno')!, mood: moodState({}), seed: 3 })

  it('names the driving box and its own sockets, not the target’s', () => {
    // The trap this had first: `target.pitchJack` is the socket on the box being *played*, so a
    // reader was told to enter the figure on the Hapax through the Minitaur's own input names.
    const result = run(rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s'))
    const driver = patternDriver(result.interDevicePatch, 'moog-minitaur')
    expect(driver.state).toBe('driven')
    if (driver.state !== 'driven') throw new Error('expected driven')
    expect(driver.deviceName).toBe('Hapax')
    // A Hapax output, not a Minitaur input.
    expect(driver.pitchJack).toMatch(/^Cv out \d$/)
    expect(driver.gateJack).toMatch(/^gate out \d$/)

    const doc = renderGuide(result)
    expect(doc).toContain(driver.pitchJack)
    expect(doc).not.toContain('whatever is driving it')
  })

  it('says nothing can drive it, rather than pointing at a diagram that shows nothing', () => {
    // A purchase, not a patching mistake, and the guide must not read like one.
    const result = run(rig('moog-minitaur', 'roland-tr-8s'))
    expect(patternDriver(result.interDevicePatch, 'moog-minitaur').state).toBe('nothing-drives')
    expect(renderGuide(result)).toContain('Nothing in this rig can drive it')
  })

  it('falls back to the pointer when the pass reached no verdict', () => {
    // Invariant 5: no target, no claim. A box the pass never considered gets the pre-#65 wording
    // rather than an invented driver.
    expect(patternDriver(undefined, 'moog-minitaur').state).toBe('unrouted')
  })
})
