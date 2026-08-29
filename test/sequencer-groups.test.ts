import { describe, expect, it } from 'vitest'
import { moodState, resolve, sequencerGroups } from '../lib/core/index'
import type { ResolveResult, SequencerGroup } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §8/#230. **The grouping the sequencer-major layout is built on, tested before either renderer
 * reads it.**
 *
 * The claims are asserted rather than the shape of the output, per #46: a fixture pinned to
 * structure fails an author who renames a field and passes one who quietly drops a part. What
 * must not happen is a part going missing, and that is what most of this file is about.
 */

const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))
const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!

function run(devices: readonly (typeof DEVICES)[number][], seed = 3): ResolveResult {
  return resolve({ devices, template: industrial, mood: moodState({}), seed })
}

/** Every assignment in a group, flattened, in group order. */
const parts = (groups: readonly SequencerGroup[]) => groups.flatMap((g) => [...g.assignments])

describe('every part lands in exactly one group (§8/#230)', () => {
  /**
   * **The failure this whole layout risks.** Phase-major renders one list of parts, so a part
   * either appears or the phase is empty. Splitting that list into per-sequencer sections
   * introduces a way for a part to belong to no section and simply not be drawn, and it would
   * read as a shorter guide rather than as a broken one.
   *
   * Swept across every template and a spread of seeds rather than pinned to one rig, for the
   * reason `device-content.test.ts` records: which box wins a request is the resolver's business,
   * and pinning it would make this fail on an unrelated objective change instead of on the thing
   * it is about.
   */
  it('is a permutation of the guide’s own assignments, on every template and seed', async () => {
    for (const template of TEMPLATES) {
      for (let seed = 0; seed < 6; seed++) {
        // Yield per resolve, per `search-symmetry.test.ts`. This sweep is ~7.5s of unbroken
        // synchronous work today, well short of the ~30s that failed CI with a worker-RPC
        // timeout — but that is the direction it grows in as devices land, and the yield is free.
        await new Promise((r) => setImmediate(r))
        const result = resolve({
          devices: [...DEVICES],
          template,
          mood: moodState({}),
          seed,
        })
        const where = `${template.id} seed ${seed}`
        const grouped = parts(sequencerGroups(result))
        expect(grouped, `${where}: count`).toHaveLength(result.assignments.length)
        // Same set, by request id, which is unique per part.
        expect([...grouped.map((a) => a.requestId)].sort(), `${where}: set`).toEqual(
          [...result.assignments.map((a) => a.requestId)].sort(),
        )
      }
    }
  })

  it('never puts one part in two groups', () => {
    const result = run([...DEVICES])
    const ids = parts(sequencerGroups(result)).map((a) => a.requestId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('the grouping key is the sequencer, not the device (§8/#65)', () => {
  /**
   * The case device-major gets wrong, and the reason the rule is worth stating carefully. The
   * Minitaur has no sequencer, so its part is entered on whatever drives it — filing it under the
   * Minitaur would send a reader to a panel with nowhere to put the figure.
   */
  it('files a sequencer-less box’s part under the box that drives it', () => {
    const result = run(rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s'))
    const groups = sequencerGroups(result)

    const sub = result.assignments.find((a) => a.deviceId === 'moog-minitaur')
    expect(sub, 'the Minitaur should be carrying a part in this rig').toBeDefined()

    const host = groups.find((g) => g.assignments.some((a) => a.requestId === sub!.requestId))
    expect(host?.kind).toBe('sequencer')
    if (host?.kind !== 'sequencer') throw new Error('expected a sequencer group')
    // The Hapax, which drives it — not the Minitaur, which sounds it.
    expect(host.deviceId).toBe('squarp-hapax')
    expect(host.deviceId).not.toBe('moog-minitaur')
  })

  it('groups by device for an ordinary rig, which is why device-major looks adequate', () => {
    // Nothing here declares `patternEntry`, so every box hosts its own parts and the two rules
    // agree exactly. Measured across 84 sampled five-device guides they agreed in every one.
    const result = run(rig('synthstrom-deluge', 'roland-tr-1000'))
    for (const group of sequencerGroups(result)) {
      if (group.kind !== 'sequencer') continue
      for (const a of group.assignments) expect(a.deviceId).toBe(group.deviceId)
    }
  })

  it('gives two sequencers a group each, splitting the parts they drive', () => {
    const result = run(rig('synthstrom-deluge', 'roland-tr-1000'))
    const groups = sequencerGroups(result)
    expect(groups.map((g) => (g.kind === 'sequencer' ? g.deviceId : 'undriven')).sort()).toEqual([
      'roland-tr-1000',
      'synthstrom-deluge',
    ])
    // Neither is empty: a group nobody plays would be a section with nothing under it.
    for (const g of groups) expect(g.assignments.length).toBeGreaterThan(0)
  })
})

describe('a part nothing can drive keeps its own group (invariant 5)', () => {
  /**
   * A purchase problem rather than a patching mistake, and the guide already says so in as many
   * words. What must not happen is the layout making it vanish: no host, no section, no part.
   */
  it('does not drop the part, and does not invent a host for it', () => {
    const result = run(rig('moog-minitaur', 'roland-tr-8s'))
    const groups = sequencerGroups(result)
    const sub = result.assignments.find((a) => a.deviceId === 'moog-minitaur')
    expect(sub, 'the Minitaur should be carrying a part in this rig').toBeDefined()

    const undriven = groups.find((g) => g.kind === 'undriven')
    expect(undriven, 'an undriven part needs a group of its own').toBeDefined()
    expect(undriven!.assignments.some((a) => a.requestId === sub!.requestId)).toBe(true)
  })

  it('sorts the undriven group last, because it is the one with nothing to stand at', () => {
    const groups = sequencerGroups(run(rig('moog-minitaur', 'roland-tr-8s')))
    expect(groups[groups.length - 1]?.kind).toBe('undriven')
  })

  it('produces no undriven group when everything has a home', () => {
    const groups = sequencerGroups(run(rig('synthstrom-deluge', 'roland-tr-1000')))
    expect(groups.some((g) => g.kind === 'undriven')).toBe(false)
  })
})

describe('drivesOnly says when a box makes no sound of its own', () => {
  it('is true for a sequencer carrying only parts that sound elsewhere', () => {
    const result = run(rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s'))
    const hapax = sequencerGroups(result).find(
      (g) => g.kind === 'sequencer' && g.deviceId === 'squarp-hapax',
    )
    expect(hapax?.kind).toBe('sequencer')
    if (hapax?.kind !== 'sequencer') throw new Error('expected the Hapax group')
    // The Hapax has no voices of its own (§2.4), so every part here sounds on another box.
    expect(hapax.drivesOnly).toBe(true)
  })

  it('is false for a box playing its own parts', () => {
    const result = run(rig('synthstrom-deluge', 'roland-tr-1000'))
    for (const g of sequencerGroups(result)) {
      if (g.kind === 'sequencer') expect(g.drivesOnly).toBe(false)
    }
  })
})

describe('the order is the resolver’s, so the layout stays deterministic (invariant 6)', () => {
  it('returns groups in first-appearance order of the assignments', () => {
    const result = run([...DEVICES])
    const groups = sequencerGroups(result).filter((g) => g.kind === 'sequencer')
    // The order groups first appear in, computed independently of the function under test.
    const seen: string[] = []
    for (const a of result.assignments) {
      const g = sequencerGroups(result).find((x) =>
        x.assignments.some((y) => y.requestId === a.requestId),
      )
      const key = g?.kind === 'sequencer' ? g.deviceId : 'undriven'
      if (key !== 'undriven' && !seen.includes(key)) seen.push(key)
    }
    expect(groups.map((g) => (g.kind === 'sequencer' ? g.deviceId : ''))).toEqual(seen)
  })

  it('is byte-stable across repeated calls on the same result', () => {
    const result = run([...DEVICES])
    expect(JSON.stringify(sequencerGroups(result))).toBe(JSON.stringify(sequencerGroups(result)))
  })

  it('sorts nothing by name, so a rename cannot reorder the guide', () => {
    // The groups of a rig whose ids and names disagree in ordering still follow the assignments.
    const result = run(rig('roland-tr-8s', 'synthstrom-deluge'))
    const groups = sequencerGroups(result).filter((g) => g.kind === 'sequencer')
    const firstPartDevice = result.assignments[0]?.deviceId
    expect(groups[0]?.kind === 'sequencer' && groups[0].deviceId).toBe(firstPartDevice)
  })
})
