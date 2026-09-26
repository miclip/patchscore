import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  FACTORY_PATCHES_FACT,
  KEYBOARD_REACH_FACT,
  KEYBOARD_SHIFT_FACT,
  RiffSchema,
  resolveRiff,
} from '@/lib/core'
import type { Device, KeyboardReach, PatchUse, Riff, ShippedPatch } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RIFFS } from '@/lib/riffs'
import { presetCompanion, presetSession } from '@/lib/studio/preset-session'
import { device as fixtureDevice, heldRiff, recipe } from './fixtures'

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
 *  - the Muse's session carries **the thirteen in the folder's order**, joins **all thirteen**
 *    to the riff whose reference names them, **resolves all thirteen on the Muse** as `played`,
 *    carries **nothing about a recipe** (#598), and no box beyond the three that declare
 *    both halves — the Muse, the minilogue xd (#618) and the Subsequent 37 (#624) — has one;
 *  - a figure the box **cannot play throws** rather than becoming a gap on a page (#598), and
 *    two patches slugging to one address throw too;
 *  - a figure the box's **keyboard cannot reach throws** where the box declares its reach
 *    (§4.1/#659), by span and by placement, and a box that declares none is checked against
 *    nothing.
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

  /**
   * §2.6/#629. An address on the shipped patch is a hint and not an identity: the use still
   * joins by `(name, bank)`, the riff still joins by name, the slug is still the name's, and the
   * two patches that collided above still collide with two different addresses on them.
   */
  it('an address on a patch changes no join and no slug (#629)', () => {
    const at: ShippedPatch = { ...BELL, slot: '7.1' }
    const device = declared([ORGAN, at], [BELL_USE, ORGAN_USE])
    const session = presetSession(device, [])
    expect(session?.entries.map((e) => e.slug)).toEqual(['bellbounce', 'aegean-organ'])
    expect(session?.entries[0]?.patch).toBe(device.factoryPatches?.[1])
    // The riff join is by name and reaches the slotted patch: on this fixture that lands on
    // the cannot-play throw, which names the patch, and is the same outcome as without a slot.
    const bell = RIFFS.find((r) => r.reference.name === 'Bellbounce') as Riff
    expect(() => presetSession(device, [bell])).toThrow(
      "'bellbounce-sparse-bell-pattern' is written for factory patch 'Bellbounce'",
    )
    const twice: ShippedPatch[] = [
      { name: 'Vox Humana', slot: '1.1' },
      { name: 'Vox  Humana', slot: '1.2' },
    ]
    const uses: PatchUse[] = twice.map((p) => ({ name: p.name, use: 'A formant' }))
    expect(() => presetSession(declared(twice, uses), [])).toThrow('share the address')
  })
})

const muse = DEVICES.find((d) => d.id === 'moog-muse') as Device

/**
 * §4.1/#659. **A preset figure is played by hand at the box that ships the patch, so the box's
 * keyboard is the limit, and a figure it cannot reach is the library's error.**
 *
 * The fixture is a 37-key board from MIDI 36 with two octaves each way on the buttons and
 * twelve semitones on a transpose, the Subsequent 37's shape, carrying one `sub` recipe and one
 * patch with a figure named for it. The riff's notes are the only thing that varies. The
 * resolved MIDI is asserted beside each case so the test pins the span it means and not the
 * one the hook arithmetic happened to give.
 */
describe('a figure the keyboard cannot reach throws (§4.1/#659)', () => {
  const REACH: KeyboardReach = {
    keys: 37,
    lowestMidi: 36,
    shift: { octaves: { down: 2, up: 2 }, semitones: { down: 12, up: 12 } },
  }
  const WIDE: ShippedPatch = { name: 'Wide' }
  const WIDE_USE: PatchUse = { name: 'Wide', use: 'A figure with a reach to check' }
  const CITE = { kind: 'manual', source: 'A Manual, p.14' } as const

  function keyboard(reach: KeyboardReach | undefined): Device {
    return fixtureDevice({
      recipes: [recipe({ id: 'fx-sub-soft', role: 'sub', character: 'soft', voice: 'lt' })],
      ...(reach === undefined ? {} : { keyboardReach: reach }),
      factoryPatches: [WIDE],
      patchUses: [WIDE_USE],
      capabilityEvidence: {
        ...baseline,
        [FACTORY_PATCHES_FACT]: OBSERVED,
        ...(reach === undefined
          ? {}
          : { [KEYBOARD_REACH_FACT]: CITE, [KEYBOARD_SHIFT_FACT]: CITE }),
      },
    } as never)
  }

  /** Two notes at the given degree and octave offsets, in C major from octave 4. */
  function figure(
    low: { degree: number; octave: number },
    high: { degree: number; octave: number },
  ): Riff {
    return heldRiff({
      id: 'wide-figure',
      name: 'The wide figure',
      reference: { kind: 'patch', name: 'Wide' },
      request: {
        id: 'wide-figure',
        role: 'sub',
        priority: 1,
        character: 'soft',
        sustain: 'continuous',
      },
      hook: {
        id: 'wide-figure-hook',
        forRole: 'sub',
        bars: 2,
        baseOctave: 4,
        notes: [
          { step: 1, ...low, len: 16 },
          { step: 17, ...high, len: 16 },
        ],
      },
    })
  }

  function span(device: Device, riff: Riff): [number, number] {
    const notes = resolveRiff(riff, [device]).notes
    if (notes.outcome !== 'resolved') throw new Error('unresolved fixture hook')
    const midi = notes.hook.notes.map((n) => n.midi)
    return [Math.min(...midi), Math.max(...midi)]
  }

  it('the fixture board is accepted by the schema, so what follows is the session and not the schema', () => {
    expect(issues(DeviceSchema.safeParse(keyboard(REACH)))).toBe('[]')
  })

  it('throws for a figure wider than the board, which no setting can hold', () => {
    // C2 to C6: 48 semitones on a board of 36.
    const riff = figure({ degree: 1, octave: -2 }, { degree: 1, octave: 2 })
    expect(span(keyboard(REACH), riff)).toEqual([36, 84])
    expect(() => presetSession(keyboard(REACH), [riff])).toThrow(
      /fixture-drum: 'wide-figure' is written for factory patch 'Wide' and the keyboard cannot reach it: it spans 48 semitones on a board of 37 keys/,
    )
  })

  it('throws for a figure inside the span that sits where no setting reaches', () => {
    // C7 to C8: eleven keys, and the board's top is 72 + 24 + 12 = 108.
    const riff = figure({ degree: 1, octave: 3 }, { degree: 1, octave: 4 })
    expect(span(keyboard(REACH), riff)).toEqual([96, 108])
    const high = figure({ degree: 5, octave: 3 }, { degree: 1, octave: 5 })
    expect(span(keyboard(REACH), high)).toEqual([103, 120])
    expect(() => presetSession(keyboard(REACH), [riff])).not.toThrow()
    expect(() => presetSession(keyboard(REACH), [high])).toThrow(
      /sits at MIDI 103-120, and no octave or transpose setting puts both ends on the keys \(the board reaches 0-108\)/,
    )
  })

  /**
   * The span #659 was filed on. F2 to E5 is 35 semitones and fits no octave setting alone,
   * since every one of those opens on a C; the transpose opens the window on any note, and at
   * 40-76 or 41-77 both ends are on the keys.
   */
  it('accepts the 41-76 span once the transpose is in the reach, and refuses it without', () => {
    const riff = figure({ degree: 4, octave: -2 }, { degree: 3, octave: 1 })
    expect(span(keyboard(REACH), riff)).toEqual([41, 76])
    const session = presetSession(keyboard(REACH), [riff])
    expect(session?.entries[0]?.figure?.resolution.outcome).toBe('played')
    const buttonsOnly: KeyboardReach = {
      ...REACH,
      shift: { ...REACH.shift, semitones: { down: 0, up: 0 } },
    }
    expect(() => presetSession(keyboard(buttonsOnly), [riff])).toThrow(
      /sits at MIDI 41-76, and no octave or transpose setting puts both ends on the keys/,
    )
  })

  /**
   * §5A.9. **The box plays the host, and only the host is checked against its keys.** The
   * companion is played on another box, so C2 to C6 — a span no setting of this board holds —
   * is not refused as a companion, and is refused as soon as it is the host's hook.
   */
  describe('a companion is not held to the box’s keyboard (§5A.9)', () => {
    // `figure`'s own shape made schema-legal: `sub` is struck, so each part answers the grid
    // question (`false`, through-composed), and the title names the patch.
    const legal = (r: Riff): Riff => ({
      ...r,
      name: 'The Wide figure',
      request: { ...r.request, reArticulatesHook: false },
    })
    const reachable = legal(figure({ degree: 1, octave: 0 }, { degree: 5, octave: 0 }))
    const unreachable = legal(figure({ degree: 1, octave: -2 }, { degree: 1, octave: 2 }))
    const withCompanion: Riff = {
      ...reachable,
      companion: {
        request: { ...unreachable.request, id: 'wide-figure-companion' },
        technique: ['Under it, on another box.'],
        hook: { ...unreachable.hook, id: 'wide-figure-companion-hook' },
      },
    }

    /** The same two hooks, the other way round. */
    const swapped: Riff = {
      ...unreachable,
      companion: {
        request: { ...reachable.request, id: 'wide-figure-companion' },
        technique: ['Under it, on another box.'],
        hook: { ...reachable.hook, id: 'wide-figure-companion-hook' },
      },
    }

    it('both pairs parse, so the session and not the schema is what is under test', () => {
      for (const pair of [withCompanion, swapped]) {
        const parsed = RiffSchema.safeParse(pair)
        expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true)
      }
    })

    it('does not throw for an unreachable companion, and resolves the box for the host alone', () => {
      const board = keyboard(REACH)
      const session = presetSession(board, [withCompanion])
      const figured = session?.entries[0]?.figure
      expect(figured?.resolution.outcome).toBe('played')
      expect(figured?.riff).toBe(withCompanion)
      expect(figured === undefined ? 'no figure' : 'companion' in figured.resolution).toBe(false)
      // The companion goes to the reader's other boxes, with the page's box taken out: here
      // there are none, and that is a gap rather than a throw.
      if (figured === undefined) return
      expect(() => presetCompanion(figured, [board], board)).not.toThrow()
      expect(presetCompanion(figured, [board], board)?.outcome).toBe('gap')
    })

    it('still throws when the same unreachable hook is the host’s', () => {
      expect(() => presetSession(keyboard(REACH), [swapped])).toThrow(
        /'wide-figure' is written for factory patch 'Wide' and the keyboard cannot reach it: it spans 48 semitones/,
      )
    })
  })

  it('checks nothing on a box that declares no reach, which is where the Muse stands', () => {
    const riff = figure({ degree: 1, octave: -2 }, { degree: 1, octave: 2 })
    expect(keyboard(undefined).keyboardReach).toBeUndefined()
    expect(() => presetSession(keyboard(undefined), [riff])).not.toThrow()
    expect(muse.keyboardReach).toBeUndefined()
    expect(muse.capabilityEvidence?.[KEYBOARD_REACH_FACT]).toMatchObject({ kind: 'partly' })
  })
})


describe('the Muse session: thirteen entries, thirteen figures, no recipes (#593, #598, #654)', () => {
  const session = presetSession(muse)

  it('carries the thirteen, one per shipped patch, in the order the folder authored them', () => {
    expect(session).toBeDefined()
    const names = session?.entries.map((e) => e.patch.name) ?? []
    expect(names).toHaveLength(13)
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

  it('links all thirteen to the riff whose reference names the patch', () => {
    for (const entry of session?.entries ?? []) {
      expect(entry.figure, entry.patch.name).toBeDefined()
      expect(entry.figure?.riff.reference, entry.patch.name).toEqual({
        kind: 'patch',
        name: entry.patch.name,
      })
    }
    const linked = new Set((session?.entries ?? []).map((e) => e.figure?.riff.id))
    expect(linked.size).toBe(13)
  })

  /**
   * §3.7/#598. Every figure lands on the Muse, and `resolution` is `resolveRiff` against the
   * Muse alone: the same voice, recipe and settings a riff page would show with only that box
   * ticked, so nothing here is a second resolver.
   */
  it('resolves all thirteen on the Muse, as a riff page would with the Muse alone ticked', () => {
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

  it('addresses each of the thirteen by the slug of the name the box prints', () => {
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
      'mirror-interior',
    ])
    expect(new Set(slugs).size).toBe(13)
    // The figure's id opens with the same slug (§5A.5), so address and figure agree.
    for (const entry of session?.entries ?? []) {
      expect(entry.figure?.riff.id.startsWith(`${entry.slug}-`), entry.patch.name).toBe(true)
    }
  })

  it('no fourth box has a session', () => {
    const declaring = DEVICES.filter((d) => presetSession(d) !== undefined).map((d) => d.id)
    expect(declaring.sort()).toEqual(['korg-minilogue-xd', 'moog-muse', 'moog-subsequent-37'])
    for (const d of DEVICES) {
      if (declaring.includes(d.id)) continue
      expect(d.patchUses, d.id).toBeUndefined()
      expect(presetSession(d), d.id).toBeUndefined()
    }
  })
})
