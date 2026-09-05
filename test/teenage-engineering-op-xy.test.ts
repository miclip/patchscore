import { describe, expect, it } from 'vitest'
import {
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { device } from '../lib/devices/teenage-engineering-op-xy/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §2.1/#334. **This box authors no trigger note, and the reason is structural rather than a page
 * nobody has read yet.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. The
 * OP-XY has 240, all on the one `track` pool, and four readings answer them:
 *
 *  - **The keyboard means whatever the track's engine makes it mean.** p.11 puts a drum sampler
 *    on track 1 and *"the musical keyboard will now have 24 different drum sounds. one on each
 *    key"*; p.14 puts a synth engine on track 7 and *"the musical keyboard will play the 24
 *    different notes."*
 *  - **Both kinds of track are the same pool.** p.42: *"instrument mode holds 8 instrument tracks.
 *    an instrument can either be a sampler or a built-in synth engine."* A pool's `triggerNote`
 *    addresses every member alike, so one value would be a drum key and a pitch at once.
 *  - **The drum map is made by recording, not printed.** p.79's key select is *"press a key to
 *    select it, it will light up and you can then record a sample to it"*, and p.25's step
 *    recording takes whatever was played: *"keep holding record and begin playing on the
 *    keyboard. the notes will fill the sequencer."*
 *  - **No octave convention is stated**, so no `midi` is derivable. p.11's key names carry no
 *    octave, p.14 gives the octave buttons to the reader, and p.85's only written note value is a
 *    filename convention — *"allowing you to write the note value there for example 'a3'."*
 *
 * `TriggerNote` requires a `note`, a `midi` and a `Cite`, and refuses `verified: false` precisely
 * so a plausible `F2` cannot be written from the above. These tests hold the blank in place, and
 * hold it as a *relationship* rather than only as a number: what must never move is that no part
 * on this box gets a trigger note, because the pool has none to give.
 */
describe('trigger notes: read for, and declined (§2.1/#334)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  it('authors none on the pool, and none on any recipe either', () => {
    // Both halves, because the field exists in two places and only one of them is the pool.
    expect(device.voices.filter((v) => v.triggerNote !== undefined)).toEqual([])
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  it('stays off the library roster of boxes that author one', () => {
    // `test/tracker-mini.test.ts` pins that roster exactly; this is the same fact asked from the
    // side of the box that declines, so a note added here fails in its own file as well as there.
    const authoring = DEVICES.filter((d) => d.voices.some((v) => v.triggerNote !== undefined))
    expect(authoring.map((d) => d.id)).not.toContain('teenage-engineering-op-xy')
  })

  it('expands to eight interchangeable members, none of which carries a note', () => {
    // The flattened form the resolver actually sees (§2.2). Asserted here as well as on the
    // `VoiceSpec` above, because a pool's note reaches every member and a member is where a
    // reader would meet it.
    const members = expand(device)
    expect(members.length).toBe(8)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The structural reason, asserted rather than left to the head note.**
   *
   * p.42 makes one pool of tracks that hold either a sampler or a synth engine, and the recipes
   * below use it in both directions: ten select one of the three §18 samplers, ten select one of
   * the nine §20 synth engines, and all twenty sit on `voice: 'track'`. A pool-wide trigger note
   * would have to address both halves of that list with one value.
   *
   * The two option sets are read off the `ENGINE` parameter rather than re-listed here, so this
   * fails if a recipe is ever moved to a second pool or loses its engine choice.
   */
  it('puts sampler tracks and synth-engine tracks on the same single pool', () => {
    expect(device.voices.length).toBe(1)
    const pool = device.voices[0]
    expect(pool?.kind).toBe('pool')
    if (pool?.kind !== 'pool') throw new Error('expected a pool')
    expect(pool.id).toBe('track')
    expect(pool.count).toBe(8)

    // Both a percussion role and a pitched role on the one pool, which is the same fact from the
    // role sheet's side: one note cannot serve a kick key and a lead's pitch.
    expect(pool.roles).toContain('kick')
    expect(pool.roles).toContain('lead')

    expect(device.recipes.every((r) => r.voice === 'track')).toBe(true)

    const SAMPLERS = ['one shot synth sampler', 'drum sampler', 'multisampler']
    const samplerRecipes: string[] = []
    const engineRecipes: string[] = []
    for (const recipe of device.recipes) {
      const engine = (recipe.params as AuthoredParam[]).find((p) => p.name === 'ENGINE')
      expect(engine?.kind, recipe.id).toBe('enum')
      if (engine?.kind !== 'enum') throw new Error('expected an enum ENGINE')
      if (SAMPLERS.includes(engine.value)) samplerRecipes.push(recipe.id)
      else engineRecipes.push(recipe.id)
      // Whichever set it came from, no option on it is a note — the choice is a sound source.
      expect(engine.options.values.some((v) => /^[a-g][#b]?-?\d$/i.test(v)), recipe.id).toBe(false)
    }
    // 10 and 10 until #345, which split its five roles across both halves rather than sending
    // them all to the sampler: `ride`, `impact` and `noise` are recordings, and `riser` and
    // `sweep` are gestures the engines make. Both sides are populated, which is the claim.
    expect(samplerRecipes.length).toBe(13)
    expect(engineRecipes.length).toBe(12)
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with at
   * least one section whose variant resolved (§6.3).
   *
   * One definition, used by the sweep and by the page test. `noteInstruction` answers `none` for a
   * hooked or sustained part as well as for a blank grid part, so a page test asking it whether a
   * grid exists would count parts that draw none and then pass against a guide with nothing in it.
   */
  function drawsGrid(a: ResolvedAssignment): boolean {
    return (
      a.hookAuthority === undefined &&
      !isSustainedPart(a) &&
      a.patterns.some((p) => p.selection.outcome !== 'none')
    )
  }

  /** Every part this box takes, split by what phase 5 actually draws for it. */
  function sweep() {
    const grid: { where: string; role: Role; kind: string }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          if (drawsGrid(a)) grid.push({ where, role: a.role, kind: noteInstruction(a).kind })
          else if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else noPattern.push(where)
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  /**
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6.
   *
   * 240 is #334's figure for this device and it is expected to stay put, because nothing here is
   * a gap to close. The number moves when a direction gains or loses a part, and a diff is a
   * prompt to re-read the head note rather than a failure. What must not move is the relationship
   * — no part ever gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 240 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    // 264 until #345 authored the pool's last five unserved roles.
    expect(grid.length).toBe(270)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(246)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that carry a note are `sub` parts, where the
    // pitch is the direction's musical decision (#340) and owes this box nothing.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
  })

  it('leaves the blanks on the roles a key press answers', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's, and the percussion roles are where a drum key would have been.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 48],
      ['kick', 48],
      ['ghost-perc', 36],
      ['clap', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['metallic', 12],
      ['arp', 6],
      ['impact', 6],
      ['ride', 6],
      ['tom', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program. Asserted rather than assumed — this box
    // produces no sustained part at all across the sweep.
    const { hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(126)
    expect(sustained).toEqual([])
    // 12 until #345: `sweep` and `riser` gain entries, and no direction authors a step variant
    // for either of them.
    expect(noPattern.length).toBe(30)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'generative-drift/sweep',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])
  })

  /**
   * The resolved field itself, across every part rather than only the ones that draw a grid.
   * `noteInstruction` folds the trigger arm in with the pitch arm, so this is the one assertion
   * that a hooked or sustained part did not quietly acquire one either.
   */
  it('resolves no trigger note on any assignment, in any direction', () => {
    let seen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          seen += 1
          expect(a.triggerNote, `${template.id}/${a.role} seed ${String(seed)}`).toBeUndefined()
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  /**
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver.
   *
   * The count of parts that actually draw a grid is asserted non-zero first, or an empty render
   * would pass this forever. The negative is the fragile kind: a plausible note here would read
   * as correct on the page and address nothing at the machine.
   */
  it('never prints a trigger note on a rendered page, across every direction and seed', () => {
    let drawn = 0
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        drawn += result.assignments.filter(drawsGrid).length
        expect(renderGuide(result), `${template.id} seed ${String(seed)}`).not.toContain(
          'Trigger note',
        )
      }
    }
    expect(drawn).toBeGreaterThan(0)
  })
})
