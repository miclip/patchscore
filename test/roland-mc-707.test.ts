import { describe, expect, it } from 'vitest'
import {
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  renderGuide,
  resolve,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { device } from '../lib/devices/roland-mc-707/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §2.1/#334. **This box authors no trigger note on either pool, and it needed two separate
 * reasons rather than one.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. The
 * MC-707 has 240, and it is the first box in this class with **two** pools, so the answer splits:
 *
 *  - **p.23 puts the same sixteen pads under two meanings.** `TONE track`: *"For a TONE track,
 *    you can play the pads as a keyboard."* `DRUM track`: *"In a drum kit, 16 instruments are
 *    assigned to the pads, one instrument to each pad."*
 *  - **On `tone-track` the pad is the note**, so the note is the reader's. p.28 step-records
 *    *"Press pads (keys) to enter notes"*, and p.23 moves the whole surface underneath that —
 *    `[OCT-] [OCT+]: Shift octaves`, with the NOTE MODE `PAD` tab's `OCTAVE -5-+5` and
 *    `TRANSPOSE -6-+6`.
 *  - **On `drum-pad` a step is not written by note at all.** p.30's TR-REC is pad first, steps
 *    second: *"Press a pad (key) to select the pad that you want to edit… Press the step buttons
 *    for the steps at which you want to input notes."*
 *  - **`Source Key` is a different fact and its own page says so.** p.76: `0-127`, *"Specifies
 *    the pitch in semitone steps relative to 60 (the original pitch of the instrument)."*
 *
 * The octave convention is read and recorded rather than used: p.68 states *"If this is 60, the
 * C4 key (middle C) is the reference key"*, so `0` is `C-1` here. p.24's `1 (C-1)-127 (G9)` label
 * cannot hold beside that and is treated as the printing defect it is — see the module note.
 */
describe('trigger notes: read for, and declined (§2.1/#334)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  it('authors none on either pool, and none on any recipe either', () => {
    // Both halves, because the field exists in two places and only one of them is a pool.
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
    expect(authoring.map((d) => d.id)).not.toContain('roland-mc-707')
  })

  /**
   * **Two pools, and the reason they are two is the reason neither can carry a note.** p.23 makes
   * one surface a keyboard and the other a kit; a pool's `triggerNote` reaches every member
   * alike, so the check is on the flattened form the resolver sees as well as on the `VoiceSpec`.
   */
  it('expands to fifteen members across two pools, none of which carries a note', () => {
    expect(device.voices.map((v) => v.id)).toEqual(['drum-pad', 'tone-track'])

    const members = expand(device)
    expect(members.length).toBe(15)
    expect(members.filter((m) => m.poolId === 'drum-pad').length).toBe(8)
    expect(members.filter((m) => m.poolId === 'tone-track').length).toBe(7)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * The recipes take both pools, which is what makes a single device-wide answer impossible even
   * before the two pools disagree: eleven percussion recipes on the kit, nine tonal ones on the
   * tracks, and no recipe anywhere claims a note of its own.
   */
  it('spreads its recipes across both pools', () => {
    const onPool = (id: string) => device.recipes.filter((r) => r.voice === id).map((r) => r.role)
    expect(onPool('drum-pad').length).toBe(11)
    expect(onPool('tone-track').length).toBe(9)
    expect(device.recipes.length).toBe(20)

    // The role sheets are disjoint in the way the two readings require: a kit role never lands on
    // a track and a pitched role never lands on the kit.
    const drum = device.voices.find((v) => v.id === 'drum-pad')?.roles ?? []
    const tone = device.voices.find((v) => v.id === 'tone-track')?.roles ?? []
    expect(drum).toContain('kick')
    expect(tone).toContain('lead')
    expect(drum.filter((r) => tone.includes(r))).toEqual([])
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
    const grid: { where: string; role: Role; kind: string; pool: string }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          const carrier = a.assignables[0]
          if (drawsGrid(a)) {
            grid.push({
              where,
              role: a.role,
              kind: noteInstruction(a).kind,
              pool: carrier?.poolId ?? carrier?.voiceId ?? 'none',
            })
          } else if (a.hookAuthority !== undefined) hooked.push(where)
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
   * — no part ever gets a `trigger`, because neither pool has a note to give one.
   */
  it('leaves 240 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(264)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(240)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  /**
   * **The split, which is this box's own contribution to #334 and which a total would hide.**
   *
   * The kit is blank end to end — 234 grid parts, 234 without a note — because p.30 writes a step
   * by selecting a pad, not by naming a pitch. The tone tracks are where every note on this box's
   * pages comes from and they are *mostly* filled, by the direction rather than by the device: 24
   * of their 30 carry a pitch and the six that do not are `arp` parts the direction left open.
   *
   * A device-wide `triggerNote` would therefore have had to be wrong twice over — once for the
   * kit, which needs no note, and once for the tracks, whose note is the reader's.
   */
  it('splits the blanks the way the two pools differ', () => {
    const byPool = new Map<string, { grid: number; blank: number }>()
    for (const g of sweep().grid) {
      const entry = byPool.get(g.pool) ?? { grid: 0, blank: 0 }
      entry.grid += 1
      if (g.kind === 'none') entry.blank += 1
      byPool.set(g.pool, entry)
    }
    expect([...byPool].sort()).toEqual([
      ['drum-pad', { grid: 234, blank: 234 }],
      ['tone-track', { grid: 30, blank: 6 }],
    ])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that carry a note are `sub` parts on the
    // tone tracks, where the pitch is the direction's musical decision (#340) and owes this box
    // nothing — and none of them is on the kit.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
    expect([...new Set(pitched.map((g) => g.pool))]).toEqual(['tone-track'])
  })

  it('leaves the blanks on the roles a pad press answers', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's, and the kit is what this box is mostly being asked for.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['kick', 48],
      ['closed-hat', 42],
      ['ghost-perc', 42],
      ['clap', 18],
      ['metallic', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['arp', 6],
      ['impact', 6],
      ['tom', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program. Asserted rather than assumed — this box
    // produces no sustained part at all across the sweep.
    const { hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(126)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(6)
    expect([...new Set(noPattern)].sort()).toEqual(['industrial-techno/riser'])
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

  /**
   * §2.1/#352. **The octave convention, recorded because the library holds two that differ by an
   * octave and a rendered page would not show which one a note came from.**
   *
   * p.68 states it in prose — *"If this is 60, the C4 key (middle C) is the reference key"* — and
   * two other pages agree: p.23's CHORD MODE EDIT screen prints `NOTE1 60 (C4)` and `NOTE3 67
   * (G4)`, and p.76's `Source Key` is *"relative to 60 (the original pitch of the instrument)"*.
   * So `0` is `C-1` here, an octave above the MPC guides' `0-127 or C-2 to G8`.
   *
   * p.24's `1 (C-1)-127 (G9)` is the odd one out, and the arithmetic is what shows which endpoint
   * slipped: `127 = G9` holds only under `0 = C-1`, and under `1 = C-1` middle C would be 61.
   *
   * This asserts the *arithmetic*, not a value in the manifest, and that is the point: there is
   * no value, and this is what the next author would need before there could be one.
   */
  it('records the octave convention without authoring a note from it', () => {
    // 0 = C-1 means octave numbering starts one below zero, so MIDI n is octave floor(n / 12) - 1.
    const octave = (midi: number) => Math.floor(midi / 12) - 1
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const name = (midi: number) => `${NAMES[midi % 12] ?? ''}${String(octave(midi))}`

    expect(name(0)).toBe('C-1') //    the floor this convention implies
    expect(name(60)).toBe('C4') //    p.68, and p.23's own screen
    expect(name(67)).toBe('G4') //    p.23's NOTE3
    expect(name(127)).toBe('G9') //   p.24's ceiling, which holds

    // p.24's low endpoint does not, and this is the assertion that says so rather than a comment
    // claiming it: if 1 were C-1 then middle C would be 61, which p.68 contradicts.
    expect(name(1)).not.toBe('C-1')
    expect(name(61)).not.toBe('C4')

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
