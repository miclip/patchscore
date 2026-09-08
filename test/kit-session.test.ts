import { describe, expect, it } from 'vitest'
import type { Device, Role } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { KIT_MINIMUM, KIT_ROLES, kitRecipes } from '../lib/studio/device-page'
import { CORE_KIT_ROLES, kitSession } from '../lib/studio/kit-session'

/**
 * §3.7/#478. **The kit session view model**, which is `kitRecipes` plus the two facts a reader
 * working down that list needs: what each sound is going to be called, and which core kit sounds
 * this box is not going to give them.
 *
 * There is no renderer, so this file is the whole of the evidence. What it pins is the shape a
 * renderer will be built against — the slot names, the order, the absent set and the one
 * destination — and the boundaries the model must not quietly cross: no recipe invented, no
 * recording capability asked of any device, nothing resolved.
 */

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

const CASCADIA = byId('intellijel-cascadia')

describe('core kit roles', () => {
  it('is the skins and the metal — KIT_ROLES without the three fills', () => {
    expect(CORE_KIT_ROLES).toEqual([
      'kick', 'snare', 'clap', 'rim', 'tom',
      'closed-hat', 'open-hat', 'ride', 'metallic',
    ])
    for (const fill of ['ghost-perc', 'noise', 'impact'] as const) {
      expect(KIT_ROLES).toContain(fill)
      expect(CORE_KIT_ROLES).not.toContain(fill)
    }
  })

  it('keeps kit order, so an absent list reads the way the kit is built', () => {
    // A subsequence of `KIT_ROLES`, not a re-ordering of it: one list minus another, which is
    // what stops the two drifting the day a role moves.
    expect(CORE_KIT_ROLES).toEqual(KIT_ROLES.filter((role) => CORE_KIT_ROLES.includes(role)))
  })
})

describe('kit session', () => {
  it('names the Cascadia’s eight sounds, in the order they are built', () => {
    const session = kitSession(CASCADIA)
    expect(session?.slots.map((slot) => slot.name)).toEqual([
      'KICK 1', 'KICK 2', 'TOM 1', 'METALLIC 1', 'METALLIC 2', 'NOISE 1', 'NOISE 2', 'IMPACT 1',
    ])
    // The kit order §3.6 settled, unchanged: the model adds names to that list and does not
    // re-sort it.
    expect(session?.slots.map((slot) => slot.recipe)).toEqual(kitRecipes(CASCADIA))
  })

  it('says which core kit sounds the Cascadia does not make', () => {
    // A mono synth: it has a kick, a tom, two metallics, two noises and an impact, and no
    // struck-skin or cymbal voice at all. `ghost-perc` is absent too and is deliberately not
    // reported — it is a fill, not a hole in a kit.
    expect(kitSession(CASCADIA)?.absent).toEqual([
      'snare', 'clap', 'rim', 'closed-hat', 'open-hat', 'ride',
    ])
  })

  it('sends every sound somewhere the reader owns, and names no box for it', () => {
    const session = kitSession(CASCADIA)
    expect(session?.destination).toEqual({ kind: 'reader-supplied' })
    // The whole destination, not a device id hidden beside the kind. This surface is reached
    // with no rig (§3.6), so it knows of no second box to name.
    expect(Object.keys(session?.destination ?? {})).toEqual(['kind'])
  })

  it('offers a session exactly where the page offers a kit', () => {
    for (const device of DEVICES) {
      const kit = kitRecipes(device)
      const session = kitSession(device)
      if (kit.length === 0) {
        // Below `KIT_MINIMUM` the product declines the claim, so there is nothing to have a
        // session about — not a session with an empty list and nine absences.
        expect(session, device.id).toBeUndefined()
      } else {
        expect(kit.length, device.id).toBeGreaterThanOrEqual(KIT_MINIMUM)
        expect(session?.slots.length, device.id).toBe(kit.length)
        expect(session?.device, device.id).toBe(device)
      }
    }
    expect(DEVICES.filter((d) => kitSession(d) !== undefined).length).toBe(24)
  })

  it('gives every slot a distinct name, numbered from one within its role', () => {
    for (const device of DEVICES) {
      const session = kitSession(device)
      if (session === undefined) continue
      const names = session.slots.map((slot) => slot.name)
      expect(new Set(names).size, device.id).toBe(names.length)
      const counts = new Map<Role, number>()
      for (const slot of session.slots) {
        const ordinal = (counts.get(slot.role) ?? 0) + 1
        counts.set(slot.role, ordinal)
        expect(slot.role, device.id).toBe(slot.recipe.role)
        // Spelled for a label — ASCII upper case, hyphens opened out, ordinal always present.
        expect(slot.name, `${device.id}: ${slot.recipe.id}`).toBe(
          `${slot.role.replace(/-/g, ' ').toUpperCase()} ${ordinal}`,
        )
      }
    }
  })

  it('reports an absence only against a core role the box really has no recipe for', () => {
    for (const device of DEVICES) {
      const session = kitSession(device)
      if (session === undefined) continue
      const present = new Set(session.slots.map((slot) => slot.role))
      for (const role of session.absent) {
        expect(CORE_KIT_ROLES, device.id).toContain(role)
        expect(present.has(role), `${device.id}: ${role}`).toBe(false)
      }
      // Kit order, and complete: every core role is either played or reported, never neither.
      expect(session.absent, device.id).toEqual(
        CORE_KIT_ROLES.filter((role) => !present.has(role)),
      )
    }
  })

  it('invents nothing: every slot holds a recipe the manifest already carries', () => {
    for (const device of DEVICES) {
      const session = kitSession(device)
      if (session === undefined) continue
      for (const slot of session.slots) {
        // Reference identity, not equality. A copy would be a second place a parameter value
        // lives, and the day one of them was edited the page and the guide would disagree.
        expect(device.recipes, `${device.id}: ${slot.recipe.id}`).toContain(slot.recipe)
      }
    }
  })

  it('is pure, so the same manifest gives the same session every time (invariant 6)', () => {
    for (const device of DEVICES) {
      expect(kitSession(device), device.id).toEqual(kitSession(device))
    }
  })
})
