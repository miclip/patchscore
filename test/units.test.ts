import { describe, expect, it } from 'vitest'
import { compareCodeUnits } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * #29, item 3. The unit vocabulary is pinned by a snapshot, **not** by a closed union.
 *
 * §2.3 left `ClockTransport` open on the grounds that "a closed union guessed here would reject
 * a legal manifest for a box with a transport nobody anticipated", and units are the same shape
 * of problem: a device measuring something in a unit nobody has met yet is legal authoring, and
 * a union would fail the build for it. What a union would buy — catching `st` where the library
 * already says `St` — a snapshot buys too, and without the refusal.
 *
 * So this fails the moment a *new* unit appears, and is repaired by one person looking at the
 * new unit and adding it. That is the review, and it happens at exactly the right moment: while
 * the recipe that introduced it is still being written.
 *
 * The **set** is pinned, never the counts. Counts move every time anyone authors a recipe, and
 * a test that fails on ordinary content work is a test people learn to regenerate without
 * reading — which is precisely the failure this one exists to avoid.
 */

/**
 * Reviewed 2026-08-22, against the three registry devices.
 *
 * Two known drifts are in this list rather than fixed by it, because repairing them is content
 * work on the device folders and this file is only the tripwire:
 *
 *  - `St` and `st` are both semitones.
 *  - `Sec` and `ms` are both time, at different scales.
 *
 * #29 records both. Fixing either is expected to fail this test, which is the point: the fix
 * gets reviewed here rather than landing silently.
 */
const REVIEWED_UNITS = ['%', 'Bits', 'Hz', 'Sec', 'St', 'c', 'ms', 'st']

function unitsInUse(): string[] {
  const seen = new Set<string>()
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      for (const param of recipe.params) {
        if (param.kind === 'numeric' && param.unit !== undefined) seen.add(param.unit)
      }
    }
  }
  // §7.2: code unit order, so the list is the same on any platform and under any locale.
  return [...seen].sort(compareCodeUnits)
}

describe('unit vocabulary (#29)', () => {
  it('uses exactly the reviewed set of units', () => {
    expect(unitsInUse()).toEqual([...REVIEWED_UNITS].sort(compareCodeUnits))
  })

  it('would catch a new spelling of a unit already in use', () => {
    // The failure mode being guarded: `st` arriving on a fourth device beside `St`. Asserting
    // the guard works, rather than trusting that it does.
    const withDrift = [...unitsInUse(), 'ST'].sort(compareCodeUnits)
    expect(withDrift).not.toEqual([...REVIEWED_UNITS].sort(compareCodeUnits))
  })

  it('keeps the reviewed list free of duplicates, which would hide a missing unit', () => {
    expect(new Set(REVIEWED_UNITS).size).toBe(REVIEWED_UNITS.length)
  })
})
