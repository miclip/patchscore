import { describe, expect, it } from 'vitest'
import { device } from '../lib/devices/moog-minitaur/index'
import { TEMPLATES } from '../lib/templates/index'
// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * Printed p.15, AMPLIFIER SUSTAIN, rendered and read: *"Sets the Amplifier EG level after the Decay
 * and before the Release portion. A note must be held longer than both the Attack and Decay time to
 * reach the Sustain level. The level is adjustable from 0 to 100%"*. The level alone decides: three
 * subs at 95-100 hold, the hard sub and the three acids at 0 decay. `DECAY/RELEASE MODE` is on
 * every recipe and deliberately not named — the addendum (PDF p.17) has it decide which *time* the
 * one knob edits, never the level the envelope settles at.
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

  it('holds where the amplifier sustain is above zero', () => {
    const ids = ['minitaur-sub-dark', 'minitaur-sub-clean', 'minitaur-sub-soft']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['AMPLIFIER SUSTAIN'] },
        evidence: { kind: 'manual', source: 'Moog Minitaur Manual, p.15' },
      })
      for (const name of ['AMPLIFIER SUSTAIN']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('decays where it is zero', () => {
    const ids = ['minitaur-sub-hard', 'minitaur-acid-dirty', 'minitaur-acid-bright', 'minitaur-acid-hard']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'decays',
        control: { kind: 'parameters', params: ['AMPLIFIER SUSTAIN'] },
        evidence: { kind: 'manual', source: 'Moog Minitaur Manual, p.15' },
      })
      for (const name of ['AMPLIFIER SUSTAIN']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['minitaur-sub-dark', 'minitaur-sub-clean', 'minitaur-sub-soft', 'minitaur-sub-hard', 'minitaur-acid-dirty', 'minitaur-acid-bright', 'minitaur-acid-hard'].sort())
    const unclaimed = device.recipes
      .filter((r) => heldRoles.has(r.role) && r.sustain === undefined)
      .map((r) => r.id)
    expect(unclaimed).toEqual([])
    for (const r of device.recipes) {
      if (!heldRoles.has(r.role)) expect(r.sustain, r.id).toBeUndefined()
    }
  })

  it('rests on the level: every `sustains` sets it above zero and every `decays` at zero', () => {
    for (const r of device.recipes) {
      if (r.sustain === undefined) continue
      const level = r.params.find((p) => p.name === 'AMPLIFIER SUSTAIN')
      expect(level?.kind, r.id).toBe('numeric')
      if (level?.kind !== 'numeric') continue
      if (r.sustain.kind === 'sustains') expect(level.value, r.id).toBeGreaterThan(0)
      else expect(level.value, r.id).toBe(0)
    }
  })
})
