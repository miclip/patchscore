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
import { CONFIRMED, MOVED, PAGES, device } from '../lib/devices/akai-mpc-one-g2/index'
import { device as liveIII } from '../lib/devices/akai-mpc-live-iii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * Invariant 2/#196. **The borrow, and the two things that can go wrong with it.**
 *
 * This manifest does not author its recipes. It takes the MPC Live III's and moves every citation
 * onto its own document, which is a *different* document — `MPC Standalone OS User Guide v3.9`,
 * not the v3.7 guide that covers the Live III and the XL. Two failures follow from that and only
 * one of them was guarded before #345:
 *
 *  - **A page nobody matched.** `pageInV39` throws, and has since the folder landed.
 *  - **A page that *is* matched, read for a control v3.9 prints differently or not at all.** The
 *    citation retargets cleanly and the reader is given a number from the wrong document. Twelve
 *    of the twenty-five borrowed pages recompose between the two printings; v3.7 p.396 is an
 *    `AIR Reverb` section that shares v3.9 p.390 with an `AIR Non-Lin Reverb` whose `Pre-Delay`,
 *    `Mix` and `Time` sit right beside it under different values. `CONFIRMED` is that second
 *    guard.
 *
 * Both tests below run in both directions on purpose. Coverage alone would pass a table that had
 * been widened ahead of the reading it stands for.
 */
describe('the borrow is guarded on content as well as on page number (invariant 2/#196)', () => {
  /** Every `(v3.7 page, parameter name)` the sibling's recipes actually cite. */
  function citedPairs(): { page: number; name: string }[] {
    const out = new Map<string, { page: number; name: string }>()
    for (const recipe of liveIII.recipes) {
      for (const param of recipe.params) {
        const verified =
          param.kind === 'numeric'
            ? param.range.verified
            : param.kind === 'enum'
              ? param.options.verified
              : undefined
        if (verified === undefined || verified === false || verified.kind !== 'manual') continue
        const page = Number(/, p\.(\d+)$/.exec(verified.source)?.[1])
        // A span (`pp.428-521`) goes through `SPANS` rather than through a page, so it is not
        // this table's business and must not be counted against it.
        if (Number.isNaN(page)) continue
        out.set(`${String(page)}:${param.name}`, { page, name: param.name })
      }
    }
    return [...out.values()]
  }

  it('confirms every control the sibling reads off a borrowed page', () => {
    const unconfirmed = citedPairs()
      .filter(({ page, name }) => !(CONFIRMED[page] ?? []).includes(name))
      .map(({ page, name }) => `p.${String(page)} ${name}`)
      .sort()
    // This can only fail if the manifest imported successfully and then disagreed with itself:
    // `pageForParam` throws on the same condition. Asserted anyway, because a change that makes
    // the throw unreachable should fail here rather than pass silently.
    expect(unconfirmed).toEqual([])
  })

  it('confirms nothing the sibling does not read, so the table cannot be widened ahead of a reading', () => {
    const cited = new Set(citedPairs().map(({ page, name }) => `${String(page)}:${name}`))
    const dead: string[] = []
    for (const [page, names] of Object.entries(CONFIRMED)) {
      for (const name of names) if (!cited.has(`${page}:${name}`)) dead.push(`p.${page} ${name}`)
    }
    expect(dead.sort()).toEqual([])
  })

  /**
   * **A page number in prose is not tied to its own parameter's page**, so the obvious check is
   * the wrong one. `insertFx`'s note says *"p.87: each pad, keygroup, track, submix or output
   * takes four"* on a control cited to p.392 — a true sentence about a different page, and
   * `retargetNote` moves it correctly to p.88. What every prose page *must* be is a page this
   * mapping produces.
   *
   * **One number cannot be caught this way and it is cheaper to name it than to pretend.** The
   * two documents' page spaces overlap at exactly one point in this table: v3.7 p.211 is a drum
   * pad's Global tab, and v3.9 p.211 is where v3.7 p.227's articulations landed. A note stuck at
   * `p.211` would pass here. Everything else in both spaces is caught, and the `CONFIRMED` table
   * above is the guard that does not depend on numbers at all.
   */
  it('leaves every page number in prose inside this document', () => {
    const v37 = 'MPC Live III / MPC XL User Guide v3.7'
    const ours = new Set([...Object.values(PAGES), ...Object.values(MOVED)])
    for (const recipe of device.recipes) {
      // The whole recipe, not only the params. `routing` is the field that made this necessary:
      // it is prose a reader sees, it names pages, and `retargetRecipe` did not touch it until
      // #345 put a `**Slide:**` sentence in one.
      const text = JSON.stringify(recipe)
      expect(text, recipe.id).not.toContain(v37)
      for (const [, digits] of text.matchAll(/p\.(\d+)/g)) {
        expect(
          ours.has(Number(digits)),
          `${recipe.id} names p.${digits}, which is no page this mapping produces`,
        ).toBe(true)
      }
    }
  })

  it('cites this box\'s own document on every value it prints', () => {
    for (const recipe of device.recipes) {
      for (const param of recipe.params) {
        const verified =
          param.kind === 'numeric'
            ? param.range.verified
            : param.kind === 'enum'
              ? param.options.verified
              : undefined
        if (verified === undefined || verified === false) continue
        expect(verified.source, `${recipe.id} / ${param.name}`).toMatch(
          /^MPC Standalone OS User Guide v3\.9, /,
        )
      }
      const prep = recipe.sourceAudio?.prep
      if (prep !== undefined && prep.verified !== false) {
        expect(prep.verified.source, recipe.id).toMatch(/^MPC Standalone OS User Guide v3\.9, /)
      }
    }
  })

  it('takes every one of the sibling\'s recipes, dropping none and inventing none', () => {
    expect(device.recipes.map((r) => r.id)).toEqual(liveIII.recipes.map((r) => r.id))
    // #345's four included, which is the whole reason all three MPCs closed in one change.
    expect(device.recipes.map((r) => r.id)).toEqual(
      expect.arrayContaining(['mpc-acid-hard', 'mpc-sweep-soft', 'mpc-tom-bright', 'mpc-tom-dark']),
    )
  })
})

/**
 * §2.1/#334. **This box authors no trigger note, and the reading is this document's rather than
 * the sibling's.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. The
 * One G2 has 258, and `MPC Standalone OS User Guide v3.9` answers them in two halves:
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
