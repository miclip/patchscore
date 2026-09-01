import { describe, expect, it } from 'vitest'
import { PATTERN_SLOTS, type Role } from '../lib/core/index'
import { TEMPLATES, breakbeat } from '../lib/templates/index'

/**
 * §4.3/#307. **The claims the direction's own header makes about its rhythm, pinned.**
 *
 * Every direction before this one is built the same way underneath: a kick on the downbeat and a
 * backbeat answering it. Breakbeat inverts that, and the inversion is the whole reason it exists —
 * the tempo band it fills is the visible half, but 165–175 with a four-on-the-floor kick would be
 * a fast techno record rather than a break.
 *
 * That claim lived in the file header and in a commit message, verified by a script somebody ran
 * once. This holds it. The distinction matters here more than it usually would, because the
 * failure mode is silent and musical rather than structural: a later edit that put the kick back
 * on beats 5, 9 and 13 would pass `templates.test.ts`, pass the schema, resolve cleanly, render a
 * guide, and quietly stop being this genre.
 *
 * **Read off the patterns rather than the resolve.** These are properties of the direction, not of
 * any rig — invariant 3 — so nothing here selects a device or a seed, and the assertions survive
 * a re-recording of every node count in the suite.
 */

/** The eight beat positions in a 32-step, two-bar pattern: quarter notes, 1-indexed. */
const BEATS = [1, 5, 9, 13, 17, 21, 25, 29]

function stepsFor(role: Role): number[] {
  const steps = new Set<number>()
  for (const pattern of breakbeat.patterns) {
    if (pattern.forRole !== role) continue
    for (const hit of pattern.hits) steps.add(hit.step)
  }
  return [...steps].sort((a, b) => a - b)
}

describe('the snare carries the rhythm, not the kick (#307)', () => {
  it('gives the backbeat to the snare and to nothing else', () => {
    const emitters = new Map<string, Set<Role>>()
    for (const pattern of breakbeat.patterns) {
      for (const hit of pattern.hits) {
        const seen = emitters.get(hit.slot) ?? new Set<Role>()
        seen.add(pattern.forRole)
        emitters.set(hit.slot, seen)
      }
    }
    expect([...(emitters.get('backbeat') ?? [])]).toEqual(['snare'])
  })

  /**
   * The inversion itself, and the assertion this file is really for.
   *
   * A break's kick is not absent — it is *displaced*. It states the first beat and then plays
   * around the snare rather than under it, which is why the count of beat positions it takes is
   * the number to hold rather than the count of hits.
   */
  it('puts the kick on the first beat and nowhere else on the grid', () => {
    const onBeats = stepsFor('kick').filter((step) => BEATS.includes(step))
    expect(onBeats).toEqual([1])
  })

  it('displaces the rest of the kick off the quarter notes', () => {
    const kick = stepsFor('kick')
    expect(kick.length).toBeGreaterThan(1)
    // Every other strike is off the beat. A second on-beat hit would be the four-on-the-floor
    // creeping back in, which is what the test above forbids and this one measures the size of.
    expect(kick.filter((step) => !BEATS.includes(step)).length).toBe(kick.length - 1)
  })

  it('gives the snare more of the grid than the kick, which is the point', () => {
    expect(stepsFor('snare').length).toBeGreaterThan(stepsFor('kick').length)
  })
})

describe('what the direction asks for (#307)', () => {
  it('sits above every other direction, in the band nothing reached', () => {
    const others = TEMPLATES.filter((t) => t.id !== 'breakbeat')
    const ceiling = Math.max(...others.map((t) => t.bpm.max))
    expect(breakbeat.bpm.min).toBeGreaterThan(ceiling)
  })

  /**
   * #300 gave `ghost-perc` a second character and nothing had asked for both at once. A break is
   * where that pays: the quiet hits between the loud ones are half of the groove, and they are
   * not all the same kind of quiet.
   */
  it('is the first direction to want two characters of one role', () => {
    const ghosts = breakbeat.roles.filter((r) => r.role === 'ghost-perc')
    expect(new Set(ghosts.map((r) => r.character)).size).toBe(ghosts.length)
    expect(ghosts.length).toBeGreaterThan(1)
  })

  /**
   * §4.2. The arrangement is built from what has dropped out, so the parts that drop are
   * `transient` and carry the sections they play — the mechanism hip-hop used first, and the
   * reason no `lib/core` change was needed for either.
   */
  it('expresses the drop-out with sections rather than with a new field', () => {
    const transient = breakbeat.roles.filter((r) => r.sustain === 'transient')
    expect(transient.length).toBeGreaterThan(0)
    for (const request of transient) {
      expect(request.sections, request.id).toBeDefined()
      expect((request.sections ?? []).length, request.id).toBeGreaterThan(0)
      expect((request.sections ?? []).length, request.id).toBeLessThan(
        breakbeat.structure.length,
      )
    }
  })

  /**
   * The half-time question #307 said to settle before starting, settled as no gap: a part moving
   * every two bars against drums moving every one is a 32-step pattern, which seven directions
   * already used. There is one tempo in this music and the bass plays long notes.
   */
  it('says half-time with pattern length, not with a second tempo', () => {
    const lengths = new Set(breakbeat.patterns.map((p) => p.length))
    expect([...lengths].some((l) => l > 16)).toBe(true)
  })

  it('emits only slots the vocabulary declares', () => {
    for (const pattern of breakbeat.patterns) {
      for (const hit of pattern.hits) expect(PATTERN_SLOTS, pattern.id).toContain(hit.slot)
    }
  })
})
