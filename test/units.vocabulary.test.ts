import { describe, expect, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * §3.1. **One spelling per unit, except where the box prints its own.**
 *
 * A unit string is ours: nothing in a manual dictates whether we write `st` or `St`, and a reader
 * comparing a Neutron's `-12st` with a Tracker Mini's `-12St` learns nothing from the difference.
 * Four devices had drifted to `St` while sixteen used `st`, and the Tracker Mini used **both** in
 * one manifest.
 *
 * **The exception is a unit the manual actually prints**, which stops being our abbreviation and
 * becomes a fact about the box. Three survive that test and each is checked against its document:
 *
 *  - **`St` on the TR-1000.** Roland's reference manual prints the range as `-12St–0–12St` in its
 *    own parameter table, so this is the box's spelling and the guide matches what a reader sees
 *    on the screen in front of them. The TR-8S and TR-6S manuals write "semitone" in prose and
 *    print no unit at all, so theirs was ours and is now `st` — two Roland boxes spelling it
 *    differently because two Roland manuals do.
 *  - **`Sec` on the Tracker Mini.** Printed 49 times in that manual.
 *  - **`Bits` on the Tracker Mini and the MPCs.** Printed as `Bits`.
 *
 * The list is exhaustive on purpose. A device authored tomorrow that invents a fourth spelling of
 * semitones fails here rather than passing quietly, which is the whole point: the drift this fixes
 * happened one manifest at a time with nothing watching.
 */

/** Every unit any recipe may use, and nothing else. */
const VOCABULARY = new Set([
  // Ours, and the only spelling of each.
  'st',
  'c',
  'ms',
  'Hz',
  'dB',
  'V',
  '%',
  '% travel',
  '% travel from centre',
  '°',
  // The box's own, checked against its manual. See the note above.
  'St',
  'Sec',
  'Bits',
])

describe('unit spellings are one vocabulary (§3.1)', () => {
  const used = new Map<string, Set<string>>()
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      for (const param of Object.values(recipe.params ?? {})) {
        if (param.kind !== 'numeric' || param.unit === undefined) continue
        const devices = used.get(param.unit) ?? new Set<string>()
        devices.add(device.id)
        used.set(param.unit, devices)
      }
    }
  }

  it('uses no unit outside the vocabulary', () => {
    const strays = [...used.keys()].filter((u) => !VOCABULARY.has(u)).sort()
    expect(strays, `add it to VOCABULARY with the page that prints it, or spell it the library's way`).toEqual([])
  })

  it('spells semitones one way, except on the box whose manual prints the other', () => {
    // The regression this file exists for. `St` is allowed to exist and allowed to be rare; what
    // it may not be is a second spelling nobody decided on.
    expect([...(used.get('St') ?? [])].sort()).toEqual(['roland-tr-1000'])
    // And `st` is the ordinary case, on many boxes rather than a handful.
    expect((used.get('st') ?? new Set()).size).toBeGreaterThan(10)
  })

  it('never lets one manifest carry both spellings', () => {
    // The Tracker Mini did, which is how this was noticed.
    for (const device of DEVICES) {
      const spellings = new Set<string>()
      for (const recipe of device.recipes) {
        for (const param of Object.values(recipe.params ?? {})) {
          if (param.kind !== 'numeric' || param.unit === undefined) continue
          if (param.unit.toLowerCase() === 'st') spellings.add(param.unit)
        }
      }
      expect(spellings.size, `${device.id} spells semitones ${[...spellings].join(' and ')}`).toBeLessThan(2)
    }
  })

  it('keeps the box-printed units on the boxes that print them', () => {
    // Both Polyend manuals print envelope times as `0.00-10 Sec` in their engine tables, so both
    // boxes carry the spelling for the same reason (Tracker Mini 2.2.1b p.126, Play+ Rev 2 p.97).
    expect([...(used.get('Sec') ?? [])].sort()).toEqual(['polyend-play-plus', 'polyend-tracker-mini'])
    for (const id of used.get('Bits') ?? []) {
      expect([
        'akai-mpc-live-iii',
        'akai-mpc-one-g2',
        'akai-mpc-xl',
        'polyend-play-plus',
        'polyend-tracker-mini',
      ]).toContain(id)
    }
  })
})
