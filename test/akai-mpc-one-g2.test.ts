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
import { device } from '../lib/devices/akai-mpc-one-g2/index'
import { device as liveIII } from '../lib/devices/akai-mpc-live-iii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §2.1/#334. **This box authors no trigger note, and the reading is this document's rather than
 * the sibling's.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. The
 * One G2 has 246, and `MPC Standalone OS User Guide v3.9` answers them in two halves:
 *
 *  - **`pad`** — p.181 selects the pad *before* its steps (*"select the pad whose steps you want
 *    to enter or delete"*), p.186's List Edit shows a drum event as a pad number, and p.167's
 *    Grid View draws a drum track as pad rows. p.128 then makes the pad's own note the reader's:
 *    `Edit Pad Note Map` has three preset layouts and no page says which is loaded.
 *  - **`mono-track` / `poly-track`** — p.167 gives these a piano roll and p.186 shows their
 *    events as notes, so the note is a musical decision and arrives as `RequestPitch` where a
 *    direction has one. Where it has none, DrumSynth (pp.441-443) prints no note parameter, no
 *    key range and no default.
 *
 * **Why the file exists rather than leaning on `test/akai-mpc-live-iii.test.ts`.** That file
 * reads a different manual, and one of its citations has no counterpart here — v3.7's `Note
 * Sequencing` page is not in this document at all. More sharply: `voices` is `liveIII.voices` by
 * reference, and `retargetRecipe` rewrites citations inside *recipes* only, so a cited field
 * added to a shared voice would reach a One G2 reader carrying a v3.7 page number with
 * `pageInV39` never seeing it. The sharing is asserted below for that reason and says nothing
 * about what the siblings should carry.
 */
describe('trigger notes: read on v3.9, and declined (§2.1/#334)', () => {
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
   * The reason the reading had to happen here rather than being inherited.
   *
   * `voices` is the sibling's array, so anything added to a pool there lands on this manifest
   * too — and unlike a recipe it passes no rewriting on the way. `retargetRecipe` moves every
   * citation inside a recipe onto this document's pages and `pageInV39` throws on one it has not
   * mapped; neither looks at a voice, so a cited field on a shared pool would arrive here naming
   * a manual that does not describe this box.
   *
   * This asserts the sharing. It asserts nothing about what the Live III or the XL should carry.
   */
  it('takes its pools from the sibling by reference, so a cited field there would arrive uncrossed', () => {
    expect(device.voices).toBe(liveIII.voices)
    // The recipes are the other half of the contrast, and they are *not* shared: each is a
    // retargeted copy, which is what lets a citation be moved onto a v3.9 page at all.
    expect(device.recipes).not.toBe(liveIII.recipes)
    expect(device.recipes.length).toBe(liveIII.recipes.length)
  })

  it('stays off the library roster of boxes that author one', () => {
    const authoring = DEVICES.filter((d) => d.voices.some((v) => v.triggerNote !== undefined))
    expect(authoring.map((d) => d.id)).not.toContain('akai-mpc-one-g2')
  })

  /**
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6.
   *
   * 246 is #334's figure for this device and it is expected to stay put, because nothing here is
   * a gap to close: a pad part is addressed by pad, and a plugin part has no note this document
   * states. The number moves when a direction gains or loses a part, and a diff is a prompt to
   * re-read the head note rather than a failure. What must not move is the relationship — no part
   * ever gets a `trigger`, because no pool has a note to give one.
   */
  it('leaves 246 grid parts blank, and pins where they are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(270)
    const blank = grid.filter((g) => g.kind === 'none')
    expect(blank.length).toBe(246)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])

    // Split by pool, because the two halves of the reading are answered by different pages and a
    // total alone would let one of them collapse into the other.
    const byPool = new Map<string, number>()
    for (const g of blank) byPool.set(g.pool, (byPool.get(g.pool) ?? 0) + 1)
    expect([...byPool].sort()).toEqual([
      ['mono-track', 144],
      ['pad', 96],
      ['poly-track', 6],
    ])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that carry a note are `sub` parts on a plugin
    // track — p.167's piano roll, where the note is the direction's decision (#340).
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
    expect(hooked.length).toBe(132)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(18)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/texture',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])
  })

  /**
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver, and on
   * this box alone — the siblings are two other manifests with two other manuals.
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
   * p.334: *"Note: This is the MIDI note number the pad will send to the software when you press
   * it (0-127 or C-2 to G8)."* Zero is `C-2`, so 60 is `C3` on this box's numbering where
   * scientific pitch notation would say `C4`. p.519 agrees where it prints a sample layer's key
   * range as `C-2 - G8`.
   *
   * This asserts the *arithmetic*, not a value in the manifest, and that is the point: there is no
   * value, and this is what the next author needs before there can be one.
   */
  it('records the octave convention without authoring a note from it', () => {
    // 0 = C-2 means octave numbering starts two below zero, so MIDI n is octave floor(n / 12) - 2.
    const octave = (midi: number) => Math.floor(midi / 12) - 2
    expect(octave(0)).toBe(-2) //    C-2, the floor p.334 prints
    expect(octave(127)).toBe(8) //   G8, the ceiling p.334 prints
    expect(octave(60)).toBe(3) //    middle C is C3 here, not C4
    expect(octave(48)).toBe(2) //    and p.334's own screenshot reads `48 C2`

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
