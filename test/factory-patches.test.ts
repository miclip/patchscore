import { describe, expect, it } from 'vitest'
import { CAPABILITY_FACTS, DeviceSchema, FACTORY_PATCHES_FACT, shippedPatchKey } from '@/lib/core'
import type { Device, ShippedPatch } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/#592, #617. **A box declares the factory patches it ships, by name, off a page or off
 * the unit.**
 *
 * Twelve riffs are named after a Muse factory patch. Five had that patch recorded on a recipe
 * (`Recipe.factoryPatch`, #553) and seven did not, because #563 correctly declined to pair them
 * with a recipe whose settings do not reach them. The decline recorded nothing, since two facts
 * shared one field: that the box *ships* a patch called Aegean Organ, and that some recipe
 * *reaches* it. `Device.factoryPatches` is the slot for the first alone. **The model half only**:
 * where the fact reaches a reader is a device-page decision not designed yet, so nothing here
 * renders or resolves it. These tests hold:
 *
 *  - the declaration is a **positive claim whose evidence is a reading**, and two readings
 *    count (#617): a `manual` page proves the maker ships the name, an `observed` unit proves
 *    this unit has it. A list with no citation, a citation with no list, `false`, and a `maker`
 *    citation are all refused;
 *  - the list is **nonempty and its `(name, bank)` keys are unique**;
 *  - the Muse declares **exactly the twelve** the operator named; the minilogue xd declares its
 *    200 off pp.61-64 (#618, asserted in `test/korg-minilogue-xd.test.ts`); no other box
 *    declares any.
 */

const OBSERVED = { kind: 'observed', source: 'A unit, firmware 1.0' } as const
const MANUAL = { kind: 'manual', source: 'A Manual, p.61' } as const
const MAKER = { kind: 'maker', source: 'a maker page' } as const
const READ_AND_SILENT = {
  kind: 'unknown',
  reason: 'p.12 counts them and names none',
} as const

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const baseline = fixtureDevice({ recipes: [recipe()] }).capabilityEvidence ?? {}

function declared(patches: ShippedPatch[] | undefined, at: unknown): Device {
  return fixtureDevice({
    recipes: [recipe()],
    ...(patches === undefined ? {} : { factoryPatches: patches }),
    capabilityEvidence: {
      ...baseline,
      ...(at === undefined ? {} : { [FACTORY_PATCHES_FACT]: at }),
    },
  } as never)
}

function issues(parsed: ReturnType<typeof DeviceSchema.safeParse>): string {
  return JSON.stringify(parsed.success ? [] : parsed.error.issues)
}

describe('factoryPatches is a positive claim read off a page or off the unit (§2.6/#592, #617)', () => {
  it('is a capability fact on the closed list', () => {
    expect(CAPABILITY_FACTS).toContain(FACTORY_PATCHES_FACT)
  })

  it('accepts a list behind an observed citation, with and without banks', () => {
    expect(DeviceSchema.safeParse(declared([{ name: 'Aegean Organ' }], OBSERVED)).success).toBe(
      true,
    )
    expect(
      DeviceSchema.safeParse(declared([{ name: 'Aegean Organ', bank: 'KEYS' }], OBSERVED)).success,
    ).toBe(true)
  })

  it('refuses a list with no citation', () => {
    const parsed = DeviceSchema.safeParse(declared([{ name: 'Aegean Organ' }], undefined))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('refuses a list behind a reading that supports no claim', () => {
    const parsed = DeviceSchema.safeParse(declared([{ name: 'Aegean Organ' }], READ_AND_SILENT))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('with no citation')
  })

  it('accepts a list behind a manual citation: a page proves the maker ships the name (#617)', () => {
    expect(DeviceSchema.safeParse(declared([{ name: 'Replicant xd' }], MANUAL)).success).toBe(
      true,
    )
    expect(
      DeviceSchema.safeParse(declared([{ name: 'Replicant xd', bank: 'Pad' }], MANUAL)).success,
    ).toBe(true)
  })

  it('refuses a maker citation, and the refusal names what each accepted kind proves', () => {
    const parsed = DeviceSchema.safeParse(declared([{ name: 'Aegean Organ' }], MAKER))
    expect(parsed.success).toBe(false)
    const text = issues(parsed)
    expect(text).toContain("cited 'maker'")
    expect(text).toContain('a page proves the maker ships the name')
    expect(text).toContain('a unit proves this unit has it')
    // Neither kind is ranked above the other: the message says what each proves and no more.
    expect(text).not.toMatch(/only honest|stronger|weaker|better/)
  })

  it('refuses a citation with no list behind it', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, OBSERVED))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('no factoryPatches is declared')
  })

  it('refuses `false`, which says nothing the omission does not', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, false))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'false'")
  })

  it('accepts an unknown with a reason and no list, which is the finished reading', () => {
    expect(DeviceSchema.safeParse(declared(undefined, READ_AND_SILENT)).success).toBe(true)
  })

  it('refuses an empty list: a declaration is always a claim', () => {
    const parsed = DeviceSchema.safeParse(declared([], OBSERVED))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('at least one')
  })

  it('refuses a name declared twice, and tells two banks apart', () => {
    const twice = DeviceSchema.safeParse(
      declared([{ name: 'Aegean Organ' }, { name: 'Aegean Organ' }], OBSERVED),
    )
    expect(twice.success).toBe(false)
    expect(issues(twice)).toContain('declared twice')
    const banked = DeviceSchema.safeParse(
      declared(
        [
          { name: 'Aegean Organ', bank: 'KEYS' },
          { name: 'Aegean Organ', bank: 'CLASSIC' },
        ],
        OBSERVED,
      ),
    )
    expect(banked.success).toBe(true)
    // A bank is part of the key, and absent means absent.
    expect(shippedPatchKey({ name: 'A' })).not.toBe(shippedPatchKey({ name: 'A', bank: 'B' }))
    expect(shippedPatchKey({ name: 'A', bank: 'B' })).toBe(
      shippedPatchKey({ name: 'A', bank: 'B' }),
    )
  })
})

const muse = DEVICES.filter((d) => d.id === 'moog-muse')

describe('the Muse declares the twelve, the minilogue xd its 200, and nothing else declares any (#592, #618)', () => {
  const [device] = muse

  /**
   * The twelve the operator read off the unit, spelled out rather than derived from the riff
   * library: a riff carries no device identity (invariant 3), so a future patch-named riff may
   * belong to another box, and a test that summed the references would then demand the Muse
   * declare a patch it does not ship.
   */
  it('declares exactly the twelve names the operator supplied, observed at 1.4.0', () => {
    const names = (device?.factoryPatches ?? []).map((p) => p.name).sort()
    expect(names).toEqual(
      [
        "'70s Electro Pno",
        '3 Osc Bass Love',
        'Aegean Organ',
        'Bellbounce',
        'Detroit Funk',
        'Hamamatsu Tines',
        'Moog 55 Strings',
        'Moog Pro Solo',
        'Muse Runner',
        'Polyphonic Power',
        'Soft Orchestra',
        'Vox Humana',
      ].sort(),
    )
    expect(device?.capabilityEvidence?.[FACTORY_PATCHES_FACT]).toEqual({
      kind: 'observed',
      source: 'Moog Muse unit, firmware 1.4.0 factory bank',
    })
  })

  it('carries no bank and no description, since neither was read', () => {
    for (const patch of device?.factoryPatches ?? []) {
      expect(Object.keys(patch)).toEqual(['name'])
    }
  })

  it('every patch a Muse recipe reaches is one the Muse declares it ships', () => {
    const shipped = new Set((device?.factoryPatches ?? []).map(shippedPatchKey))
    let reached = 0
    for (const r of device?.recipes ?? []) {
      if (r.factoryPatch === undefined) continue
      reached += 1
      expect(shipped.has(shippedPatchKey(r.factoryPatch)), r.factoryPatch.name).toBe(true)
    }
    expect(reached).toBe(5)
  })

  it('no other box declares a list', () => {
    const declaring = DEVICES.filter((d) => d.factoryPatches !== undefined).map((d) => d.id)
    expect(declaring.sort()).toEqual(['korg-minilogue-xd', 'moog-muse', 'moog-subsequent-37'])
    for (const d of DEVICES) {
      if (declaring.includes(d.id)) continue
      expect(d.factoryPatches, d.id).toBeUndefined()
      expect(d.capabilityEvidence?.[FACTORY_PATCHES_FACT], d.id).toBeUndefined()
    }
  })
})
