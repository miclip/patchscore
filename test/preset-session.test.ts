import { describe, expect, it } from 'vitest'
import { DeviceSchema, FACTORY_PATCHES_FACT, resolveRiff } from '@/lib/core'
import type { Device, PatchUse, Riff, ShippedPatch } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RIFFS } from '@/lib/riffs'
import { presetSession } from '@/lib/studio/preset-session'
import { device as fixtureDevice, recipe } from './fixtures'

/**
 * §2.6/#593, §3.7/#598. **The preset session: a box's shipped patches, what each is for, where
 * the library reaches them, and the figure for each resolved on that box.** The model half;
 * `test/preset-page.test.ts` and `test/preset-figure-page.test.ts` hold the pages. These hold:
 *
 *  - `Device.patchUses` is **keyed to `factoryPatches` exactly**: a list without the fact to
 *    key against, a use naming a patch the box does not declare, and a use declared twice are
 *    all refused by the schema and by the session; a declared patch with no use is **accepted**
 *    (#617), and the session carries only the patches with a use, so no silent row reaches a
 *    page;
 *  - the session answers **`undefined` for a box without both declarations**, so a box with
 *    the fact alone shows nothing;
 *  - the Muse's session carries **the twelve in the folder's order**, joins **all twelve** to
 *    the riff whose reference names them, **resolves all twelve on the Muse** as `played`,
 *    carries **nothing about a recipe** (#598), and every other box has no session;
 *  - a figure the box **cannot play throws** rather than becoming a gap on a page (#598), and
 *    two patches slugging to one address throw too.
 */

const OBSERVED = { kind: 'observed', source: 'A unit, firmware 1.0' } as const
const MANUAL = { kind: 'manual', source: 'A Manual, pp.61-64' } as const

/** What the shared fixture already cites, so a test adding one fact does not drop the rest. */
const baseline = fixtureDevice({ recipes: [recipe()] }).capabilityEvidence ?? {}

function declared(
  patches: ShippedPatch[] | undefined,
  uses: PatchUse[] | undefined,
  evidence: typeof OBSERVED | typeof MANUAL = OBSERVED,
): Device {
  return fixtureDevice({
    recipes: [recipe()],
    ...(patches === undefined ? {} : { factoryPatches: patches }),
    ...(uses === undefined ? {} : { patchUses: uses }),
    capabilityEvidence: {
      ...baseline,
      ...(patches === undefined ? {} : { [FACTORY_PATCHES_FACT]: evidence }),
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

  it('accepts a subset: a declared patch with no use is not a disagreement (#617)', () => {
    const device = declared([ORGAN, BELL], [ORGAN_USE])
    expect(DeviceSchema.safeParse(device).success).toBe(true)
    // The page gets the described patches and no silent row for the rest.
    const session = presetSession(device, [])
    expect(session?.entries.map((e) => e.patch.name)).toEqual(['Aegean Organ'])
    expect(session?.device.factoryPatches).toHaveLength(2)
  })

  /**
   * #617. The case the subset rule exists for: a manual prints the whole list, so the fact is
   * complete at every name on the page, and the judgement covers the ones worth a line. The
   * session says how many the page named and where it read them, carries an entry per use,
   * and carries nothing at all under the undescribed name.
   */
  it('a manual-backed list with one use of two: the count is two, the entry is one', () => {
    const device = declared([ORGAN, BELL], [ORGAN_USE], MANUAL)
    expect(DeviceSchema.safeParse(device).success).toBe(true)
    const session = presetSession(device, [])
    expect(session?.named).toBe(2)
    expect(session?.reading).toBe('manual')
    expect(session?.entries).toHaveLength(1)
    expect(JSON.stringify(session?.entries)).not.toContain('Bellbounce')
  })

  it('an observed list says how many were read, and that it was read off a unit', () => {
    const session = presetSession(declared([ORGAN, BELL], [ORGAN_USE, BELL_USE]), [])
    expect(session?.named).toBe(2)
    expect(session?.reading).toBe('observed')
  })

  it('refuses an empty list and an empty use', () => {
    expect(DeviceSchema.safeParse(declared([ORGAN], [])).success).toBe(false)
    expect(
      DeviceSchema.safeParse(declared([ORGAN], [{ name: 'Aegean Organ', use: '' }])).success,
    ).toBe(false)
  })

  it('the session throws on the same two disagreements, for a device built past the schema', () => {
    expect(() => presetSession(declared([ORGAN], [ORGAN_USE, BELL_USE]), [])).toThrow(
      'does not declare',
    )
    expect(() => presetSession(declared([ORGAN], [ORGAN_USE, ORGAN_USE]), [])).toThrow(
      'declared twice',
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
    expect(session?.entries.every((e) => e.figure === undefined)).toBe(true)
    expect(session?.entries.map((e) => e.slug)).toEqual(['bellbounce', 'aegean-organ'])
  })

  /**
   * §3.7/#598. A riff page reports §7.3's gap because it cannot know the rig; this session knows
   * the box, so a figure that lands nowhere on it is the library's error and not the reader's.
   * The fixture is a drum machine and the Bellbounce figure is an `arp`, which is the
   * `no-capable-voice` arm; the message names the box, the riff and the patch so the author
   * knows which folder to open.
   */
  it('throws where the box cannot play the figure written for its own patch (#598)', () => {
    const bell = RIFFS.find((r) => r.reference.name === 'Bellbounce') as Riff
    expect(() => presetSession(declared([BELL], [BELL_USE]), [bell])).toThrow(
      /fixture-drum: 'bellbounce-sparse-bell-pattern' is written for factory patch 'Bellbounce' and the box cannot play it \(no-capable-voice\)/,
    )
  })

  it('throws where two patches would share one address', () => {
    const twice: ShippedPatch[] = [{ name: 'Vox Humana' }, { name: 'Vox  Humana' }]
    const uses: PatchUse[] = twice.map((p) => ({ name: p.name, use: 'A formant' }))
    expect(() => presetSession(declared(twice, uses), [])).toThrow(
      "factory patches 'Vox Humana' and 'Vox  Humana' share the address 'vox-humana'",
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

describe('the Muse session: twelve entries, twelve figures, no recipes (#593, #598)', () => {
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

  /**
   * #598, operator decision. The session carries no recipe join. `Recipe.factoryPatch` still
   * names five of these patches on the box, and that claim renders on a guide; no preset
   * surface prints it, so no entry carries it, and this pins the absence of the field rather
   * than an empty list nothing reads.
   */
  it('carries nothing about a recipe, though five recipes on the box name a patch', () => {
    const patched = muse.recipes.filter((r) => r.factoryPatch !== undefined)
    expect(patched).toHaveLength(5)
    for (const entry of session?.entries ?? []) {
      expect(Object.keys(entry).sort()).toEqual(['figure', 'patch', 'slug', 'use'])
      expect(Object.keys(entry.figure ?? {}).sort()).toEqual(['resolution', 'riff', 'voice'])
    }
  })

  it('links all twelve to the riff whose reference names the patch', () => {
    for (const entry of session?.entries ?? []) {
      expect(entry.figure, entry.patch.name).toBeDefined()
      expect(entry.figure?.riff.reference, entry.patch.name).toEqual({
        kind: 'patch',
        name: entry.patch.name,
      })
    }
    const linked = new Set((session?.entries ?? []).map((e) => e.figure?.riff.id))
    expect(linked.size).toBe(12)
  })

  /**
   * §3.7/#598. Every figure lands on the Muse, and `resolution` is `resolveRiff` against the
   * Muse alone: the same voice, recipe and settings a riff page would show with only that box
   * ticked, so nothing here is a second resolver.
   */
  it('resolves all twelve on the Muse, as a riff page would with the Muse alone ticked', () => {
    for (const entry of session?.entries ?? []) {
      const figure = entry.figure
      if (figure === undefined) throw new Error(entry.patch.name)
      expect(figure.resolution.outcome).toBe('played')
      expect(figure.voice).toBe(figure.resolution.voice)
      expect(figure.voice.device.id).toBe('moog-muse')
      expect(figure.resolution.devices.map((d) => d.id)).toEqual(['moog-muse'])
      const alone = resolveRiff(figure.riff, [muse])
      expect(alone.outcome === 'played' && alone.voice.recipe.id, entry.patch.name).toBe(
        figure.voice.recipe.id,
      )
      expect(figure.voice.params.length, entry.patch.name).toBeGreaterThan(0)
    }
  })

  it('addresses each of the twelve by the slug of the name the box prints', () => {
    const slugs = (session?.entries ?? []).map((e) => e.slug)
    expect(slugs).toEqual([
      '3-osc-bass-love',
      'moog-pro-solo',
      'muse-runner',
      'vox-humana',
      'aegean-organ',
      '70s-electro-pno',
      'hamamatsu-tines',
      'bellbounce',
      'detroit-funk',
      'polyphonic-power',
      'moog-55-strings',
      'soft-orchestra',
    ])
    expect(new Set(slugs).size).toBe(12)
    // The figure's id opens with the same slug (§5A.5), so address and figure agree.
    for (const entry of session?.entries ?? []) {
      expect(entry.figure?.riff.id.startsWith(`${entry.slug}-`), entry.patch.name).toBe(true)
    }
  })

  it('no other box has a session', () => {
    const declaring = DEVICES.filter((d) => presetSession(d) !== undefined).map((d) => d.id)
    expect(declaring.sort()).toEqual(['korg-minilogue-xd', 'moog-muse', 'moog-subsequent-37'])
    for (const d of DEVICES) {
      if (declaring.includes(d.id)) continue
      expect(d.patchUses, d.id).toBeUndefined()
      expect(presetSession(d), d.id).toBeUndefined()
    }
  })
})
