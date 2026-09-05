import { describe, expect, it } from 'vitest'
import {
  isSustainedPart,
  moodState,
  noteInstruction,
  renderGuide,
  resolve,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { device as liveIII } from '../lib/devices/akai-mpc-live-iii/index'
import { device } from '../lib/devices/akai-mpc-xl/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §2.1/#334. **This box authors no trigger note, and the reading was done for this box rather
 * than assumed from the manifest it shares objects with.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. The
 * XL has 258, and `MPC Live III / MPC XL User Guide v3.7` answers them in two halves. The pages
 * are the sibling's pages — one document covers both boxes — and p.195 is why that is a fact
 * about the manual rather than an inheritance: it heads `Hardware Step Sequencing` with *"MPC
 * Live III and MPC XL feature expanding step sequencing control using the hardware Step
 * Buttons"* and lists the modes pp.196 and 197 then describe.
 *
 *  - **`pad`** — p.196 selects the pad *before* its steps, and p.205's List Edit shows a drum
 *    event as a pad number. p.126 makes the pad's own note the reader's: `Edit Pad Note Map` has
 *    three preset layouts and no page says which is loaded.
 *  - **`mono-track` / `poly-track`** — p.197 enters a step by playing a MIDI note, so the note is
 *    a musical decision and arrives as `RequestPitch` where a direction has one. Where it has
 *    none, DrumSynth (pp.431-433) prints no note parameter, no key range and no default.
 *
 * **Why this file exists at all.** The XL takes `recipes` *and* `voices` from the Live III by
 * reference, so a `triggerNote` authored there would appear on this box with nothing in this
 * manifest mentioning it — and, the manual being shared, wearing a page number that is genuinely
 * this box's. There is no wrong-manual tell to catch it, which makes the sharing an
 * implementation constraint this file has to answer for rather than a verdict it can borrow.
 * `shared()` is no help: it throws when a fact stops being carried, never when one appears.
 */
describe('trigger notes: read on the shared manual, and declined (§2.1/#334)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

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
    const grid: { where: string; role: Role; kind: string; pool: string }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          if (drawsGrid(a)) {
            grid.push({
              where,
              role: a.role,
              kind: noteInstruction(a).kind,
              pool: a.assignables[0]?.poolId ?? '?',
            })
          } else if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else noPattern.push(where)
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  it('authors none on any of the three pools, and none on any recipe', () => {
    expect(device.voices.filter((v) => v.triggerNote !== undefined)).toEqual([])
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  /**
   * The constraint this file answers for, asserted rather than described.
   *
   * Both collections are the sibling's objects, not copies — which is the whole design of this
   * manifest (invariant 2/#196) and also the reason a note added there would arrive here
   * unannounced and unremarkable. Recorded here so the next person to touch either side can see
   * what the reference costs.
   *
   * This asserts the sharing. It says nothing about what the Live III should carry.
   */
  it('takes both pools and recipes from the sibling by reference', () => {
    expect(device.voices).toBe(liveIII.voices)
    expect(device.recipes).toBe(liveIII.recipes)
  })

  /**
   * Invariant 2/#196. **Why this side of the borrow needs no retargeting, stated rather than
   * assumed.** The One G2 rewrites every citation because it is documented by a different book.
   * This box is not: `MPC Live III / MPC XL User Guide v3.7` is one document covering both, and
   * the reference is sound only for as long as that stays true.
   *
   * So the check is the manual title, and it is the whole argument in one line. A Live III
   * citation naming any other document would reach an XL reader unretargeted and unremarked —
   * `shared()` guards facts that stop being carried, not facts that change underneath it.
   *
   * #345 is the first change to lean on this: four recipes authored on the sibling appear here
   * with no code written in this folder at all, which is what invariant 2 buys and what this test
   * keeps honest.
   */
  it('shares one document with the sibling, which is what lets the citations come across unchanged', () => {
    expect(device.manual?.title).toBe(liveIII.manual?.title)
    expect(device.manual?.title).toContain('MPC XL')
    for (const recipe of device.recipes) {
      for (const param of recipe.params) {
        const verified =
          param.kind === 'numeric'
            ? param.range.verified
            : param.kind === 'enum'
              ? param.options.verified
              : undefined
        if (verified === undefined || verified === false) continue
        expect(verified.source, `${recipe.id} / ${param.name}`).toContain(
          device.manual?.title ?? '(no manual)',
        )
      }
    }
    // #345's four, named so that losing them here is a failure rather than a smaller number.
    expect(device.recipes.map((r) => r.id)).toEqual(
      expect.arrayContaining(['mpc-acid-hard', 'mpc-sweep-soft', 'mpc-tom-bright', 'mpc-tom-dark']),
    )
  })

  it('stays off the library roster of boxes that author one', () => {
    const authoring = DEVICES.filter((d) => d.voices.some((v) => v.triggerNote !== undefined))
    expect(authoring.map((d) => d.id)).not.toContain('akai-mpc-xl')
  })

  /**
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6.
   *
   * 258 is #334's figure for this device and none of it is a gap to close: a pad part is
   * addressed by pad, and a plugin part has no note this manual states. The number moves when a
   * direction gains or loses a part **or when this box gains a recipe** — it was 246 until #345
   * authored `tom`, whose twelve parts had been going nowhere. A diff is a prompt to re-read the
   * head note rather than a failure. What must not move is the relationship: no part ever gets a
   * `trigger`, because no pool has a note to give one.
   */
  it('leaves 258 grid parts blank, and pins where they are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(282)
    const blank = grid.filter((g) => g.kind === 'none')
    expect(blank.length).toBe(258)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])

    // Split by pool, because the two halves of the reading are answered by different pages and a
    // total alone would let one of them collapse into the other.
    const byPool = new Map<string, number>()
    for (const g of blank) byPool.set(g.pool, (byPool.get(g.pool) ?? 0) + 1)
    expect([...byPool].sort()).toEqual([
      ['mono-track', 156],
      ['pad', 96],
      ['poly-track', 6],
    ])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that carry a note are `sub` parts on a plugin
    // track — p.197's played note, decided by the direction (#340) and owing this box nothing.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
    expect([...new Set(pitched.map((g) => g.pool))]).toEqual(['mono-track'])
  })

  it('leaves the blanks on the roles a pad press or an unstated note answers', () => {
    // Pinned by role as well as by pool: a count alone would survive one role's parts being
    // swapped for another's, and percussion is what this box is being asked for.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 42],
      ['ghost-perc', 42],
      ['kick', 42],
      ['clap', 18],
      ['metallic', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['tom', 12],
      ['arp', 6],
      ['impact', 6],
      ['noise', 6],
      ['ride', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program. Asserted rather than assumed — this box
    // produces no sustained part at all across the sweep.
    const { hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(138)
    expect(sustained).toEqual([])
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
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver, and on
   * this box alone — the siblings are other manifests and one of them reads another manual.
   *
   * The count of parts that actually draw a grid is asserted non-zero first, or an empty render
   * would pass this forever.
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

  /**
   * §2.1/#352. **The octave convention, recorded because a note authored without it is an octave
   * out and nothing on the page would say so.**
   *
   * p.359: *"Note: This is the MIDI note number the pad will send to the software when you press
   * it (0-127 or C-2 to G8)."* Zero is `C-2`, so 60 is `C3` on this box's numbering where
   * scientific pitch notation would say `C4`. p.441 agrees where it prints a sample layer's key
   * range as `C-2 - G8`.
   *
   * This asserts the *arithmetic*, not a value in the manifest, and that is the point: there is no
   * value, and this is what the next author needs before there can be one.
   */
  it('records the octave convention without authoring a note from it', () => {
    // 0 = C-2 means octave numbering starts two below zero, so MIDI n is octave floor(n / 12) - 2.
    const octave = (midi: number) => Math.floor(midi / 12) - 2
    expect(octave(0)).toBe(-2) //    C-2, the floor p.359 prints
    expect(octave(127)).toBe(8) //   G8, the ceiling p.359 prints
    expect(octave(60)).toBe(3) //    middle C is C3 here, not C4
    expect(octave(48)).toBe(2) //    and p.359's own screenshot reads `48 C2`

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
