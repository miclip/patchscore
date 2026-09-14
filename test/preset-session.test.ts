import { describe, expect, it } from 'vitest'
import { DeviceSchema, FACTORY_PATCHES_FACT, shippedPatchKey } from '@/lib/core'
import type { Device, PatchUse, Riff, ShippedPatch } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RIFFS } from '@/lib/riffs'
import { presetSession } from '@/lib/studio/preset-session'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/#593. **The preset session: a box's shipped patches, what each is for, and where the
 * library reaches them.** The model half only; no page renders it yet. These tests hold:
 *
 *  - `Device.patchUses` is **keyed to `factoryPatches` exactly**: a list without the fact to
 *    key against, a use naming a patch the box does not declare, a use declared twice, and a
 *    declared patch with no use are all refused by the schema and by the session;
 *  - the session answers **`undefined` for a box without both declarations**, so a box with
 *    the fact alone shows nothing;
 *  - the Muse's session carries **the twelve in the folder's order**, joins **five** of them to
 *    a recipe through `Recipe.factoryPatch`, joins **all twelve** to the riff whose reference
 *    names them, and every other box has no session.
 */

const OBSERVED = { kind: 'observed', source: 'A unit, firmware 1.0' } as const

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const baseline = fixtureDevice({ recipes: [recipe()] }).capabilityEvidence ?? {}

function declared(patches: ShippedPatch[] | undefined, uses: PatchUse[] | undefined): Device {
  return fixtureDevice({
    recipes: [recipe()],
    ...(patches === undefined ? {} : { factoryPatches: patches }),
    ...(uses === undefined ? {} : { patchUses: uses }),
    capabilityEvidence: {
      ...baseline,
      ...(patches === undefined ? {} : { [FACTORY_PATCHES_FACT]: OBSERVED }),
    },
  } as never)
}

function issues(parsed: ReturnType<typeof DeviceSchema.safeParse>): string {
  return JSON.stringify(parsed.success ? [] : parsed.error.issues)
}

const ORGAN: ShippedPatch = { name: 'Aegean Organ' }
const BELL: ShippedPatch = { name: 'Bellbounce' }
const ORGAN_USE: PatchUse = { name: 'Aegean Organ', use: 'Greek modal writing' }
const BELL_USE: PatchUse = { name: 'Bellbounce', use: 'Delay-driven bell pattern' }

describe('patchUses is keyed to factoryPatches exactly (§2.6/#593)', () => {
  it('accepts one use per shipped patch, with and without banks', () => {
    expect(DeviceSchema.safeParse(declared([ORGAN, BELL], [ORGAN_USE, BELL_USE])).success).toBe(
      true,
    )
    expect(
      DeviceSchema.safeParse(
        declared(
          [{ name: 'Aegean Organ', bank: 'KEYS' }],
          [{ name: 'Aegean Organ', bank: 'KEYS', use: 'Greek modal writing' }],
        ),
      ).success,
    ).toBe(true)
  })

  it('refuses a list with no factoryPatches to key against', () => {
    const parsed = DeviceSchema.safeParse(declared(undefined, [ORGAN_USE]))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain('no factoryPatches to key against')
  })

  it('refuses a use naming a patch the box does not declare', () => {
    const parsed = DeviceSchema.safeParse(declared([ORGAN], [ORGAN_USE, BELL_USE]))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'Bellbounce' names a patch factoryPatches does not declare")
    // A bank is part of the key: the same name in another bank is another patch.
    const banked = DeviceSchema.safeParse(
      declared(
        [{ name: 'Aegean Organ', bank: 'KEYS' }],
        [{ name: 'Aegean Organ', bank: 'CLASSIC', use: 'Greek modal writing' }],
      ),
    )
    expect(banked.success).toBe(false)
    expect(issues(banked)).toContain("'Aegean Organ' in CLASSIC names a patch")
  })

  it('refuses a use declared twice', () => {
    const parsed = DeviceSchema.safeParse(declared([ORGAN], [ORGAN_USE, ORGAN_USE]))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'Aegean Organ' is declared twice")
  })

  it('refuses a declared patch with no use: all of them or none', () => {
    const parsed = DeviceSchema.safeParse(declared([ORGAN, BELL], [ORGAN_USE]))
    expect(parsed.success).toBe(false)
    expect(issues(parsed)).toContain("'Bellbounce' has no patch use")
  })

  it('refuses an empty list and an empty use', () => {
    expect(DeviceSchema.safeParse(declared([ORGAN], [])).success).toBe(false)
    expect(
      DeviceSchema.safeParse(declared([ORGAN], [{ name: 'Aegean Organ', use: '' }])).success,
    ).toBe(false)
  })

  it('the session throws on the same three disagreements, for a device built past the schema', () => {
    expect(() => presetSession(declared([ORGAN], [ORGAN_USE, BELL_USE]), [])).toThrow(
      'does not declare',
    )
    expect(() => presetSession(declared([ORGAN], [ORGAN_USE, ORGAN_USE]), [])).toThrow(
      'declared twice',
    )
    expect(() => presetSession(declared([ORGAN, BELL], [ORGAN_USE]), [])).toThrow(
      'has no patch use',
    )
  })
})

describe('the session answers undefined without both declarations (§2.6/#593)', () => {
  it('is undefined for a box that declares neither', () => {
    expect(presetSession(declared(undefined, undefined), [])).toBeUndefined()
  })

  it('is undefined for a box with the fact and no judgement', () => {
    expect(presetSession(declared([ORGAN, BELL], undefined), [])).toBeUndefined()
  })

  it('walks the uses in authored order and carries the shipped patch object', () => {
    const device = declared([ORGAN, BELL], [BELL_USE, ORGAN_USE])
    const session = presetSession(device, [])
    expect(session?.entries.map((e) => e.patch.name)).toEqual(['Bellbounce', 'Aegean Organ'])
    expect(session?.entries.map((e) => e.use)).toEqual([BELL_USE.use, ORGAN_USE.use])
    expect(session?.entries[0]?.patch).toBe(device.factoryPatches?.[1])
    expect(session?.entries.every((e) => e.recipes.length === 0 && e.riff === undefined)).toBe(
      true,
    )
  })

  it('refuses two riffs naming one patch rather than picking one', () => {
    const one = RIFFS.find((r) => r.reference.name === 'Bellbounce') as Riff
    const two: Riff = { ...one, id: 'bellbounce-second-figure', name: 'The Bellbounce second' }
    expect(() => presetSession(declared([BELL], [BELL_USE]), [one, two])).toThrow(
      'reference of 2 riffs',
    )
  })
})

const muse = DEVICES.find((d) => d.id === 'moog-muse') as Device

describe('the Muse session: twelve entries, five recipes, twelve figures (#593)', () => {
  const session = presetSession(muse)

  it('carries the twelve, one per shipped patch, in the order the folder authored them', () => {
    expect(session).toBeDefined()
    const names = session?.entries.map((e) => e.patch.name) ?? []
    expect(names).toHaveLength(12)
    expect([...names].sort()).toEqual(
      (muse.factoryPatches ?? []).map((p) => p.name).sort(),
    )
    expect(names).toEqual(muse.patchUses?.map((u) => u.name))
  })

  it('every use is the operator’s line, unhedged and non-empty', () => {
    for (const entry of session?.entries ?? []) {
      expect(entry.use.trim().length, entry.patch.name).toBeGreaterThan(0)
      expect(entry.use, entry.patch.name).not.toMatch(/\b(probably|maybe|roughly|perhaps)\b/i)
    }
  })

  it('joins exactly the five patches a recipe reaches, and no other', () => {
    const reached = (session?.entries ?? [])
      .filter((e) => e.recipes.length > 0)
      .map((e) => [e.patch.name, e.recipes.map((r) => r.id)] as const)
    expect(reached.map(([name]) => name).sort()).toEqual(
      ['3 Osc Bass Love', 'Detroit Funk', 'Moog 55 Strings', 'Muse Runner', 'Polyphonic Power'].sort(),
    )
    // Each recipe on an entry names that entry's patch, and every patched recipe is on one.
    for (const entry of session?.entries ?? []) {
      for (const r of entry.recipes) {
        expect(r.factoryPatch && shippedPatchKey(r.factoryPatch), r.id).toBe(
          shippedPatchKey(entry.patch),
        )
      }
    }
    const onEntries = (session?.entries ?? []).flatMap((e) => e.recipes.map((r) => r.id)).sort()
    const patched = muse.recipes.filter((r) => r.factoryPatch !== undefined).map((r) => r.id).sort()
    expect(onEntries).toEqual(patched)
    expect(patched).toHaveLength(5)
  })

  it('links all twelve to the riff whose reference names the patch', () => {
    for (const entry of session?.entries ?? []) {
      expect(entry.riff, entry.patch.name).toBeDefined()
      expect(entry.riff?.reference, entry.patch.name).toEqual({
        kind: 'patch',
        name: entry.patch.name,
      })
    }
    const linked = new Set((session?.entries ?? []).map((e) => e.riff?.id))
    expect(linked.size).toBe(12)
  })

  it('no other box has a session', () => {
    for (const d of DEVICES) {
      if (d.id === 'moog-muse') continue
      expect(d.patchUses, d.id).toBeUndefined()
      expect(presetSession(d), d.id).toBeUndefined()
    }
  })
})
