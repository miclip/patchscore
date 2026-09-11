import { describe, expect, it } from 'vitest'
import { device } from '../lib/devices/moog-dfam/index'
import { TEMPLATES } from '../lib/templates/index'
// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * pp.20-21, rendered and read: the VCA EG switch *"is used to determine the Attack Time of the VCA
 * EG"* and *"The Decay time of this EG is set using the VCA DECAY knob"*. Attack and decay, no third
 * stage, and trigger inputs with no gate — so both held-role recipes decay. `VCA EG` sets the attack
 * and is deliberately not named.
 */
describe('sustain claims (§3/#506)', () => {
  const heldRoles = (() => {
    const longest = new Map<string, number>()
    for (const t of TEMPLATES) {
      for (const hook of t.hooks) {
        for (const note of hook.notes) {
          if (note.len > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, note.len)
        }
      }
    }
    return new Set([...longest].filter(([, len]) => len >= 16).map(([role]) => role))
  })()

  it('decays on the sub and the texture, on the VCA decay', () => {
    const ids = ['dfam-sub-dark', 'dfam-texture-soft']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'decays',
        control: { kind: 'parameters', params: ['VCA DECAY'] },
        evidence: { kind: 'manual', source: 'Moog DFAM Owner’s Manual, pp.20-21' },
      })
      for (const name of ['VCA DECAY']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['dfam-sub-dark', 'dfam-texture-soft'].sort())
    const unclaimed = device.recipes
      .filter((r) => heldRoles.has(r.role) && r.sustain === undefined)
      .map((r) => r.id)
    expect(unclaimed).toEqual([])
    for (const r of device.recipes) {
      if (!heldRoles.has(r.role)) expect(r.sustain, r.id).toBeUndefined()
    }
  })
})
