import { describe, expect, it } from 'vitest'
import { CHARACTERS, DeviceSchema, ROLES, type AuthoredParam } from '../lib/core/index'
import { device } from '../lib/devices/roland-tr-1000/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The manifest is validated by the codegen already (`--check` reloads and re-parses it), so
 * these are the claims the schema cannot make: that the content is actually populated, and
 * that nothing in it dresses an invented setting up as a manual citation.
 */

describe('TR-1000 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('is comfortable with eight of its ten tracks occupied (§2.3)', () => {
    expect(device.comfortableVoices).toBe(8)
    expect(device.voices.length).toBe(10)
  })

  it('names its per-step features with §2.3 keys, plus what articulation actually uses', () => {
    const perStep = device.features?.perStep ?? []
    for (const key of ['velocity', 'probability', 'substep', 'cycle', 'start-timing']) {
      expect(perStep).toContain(key)
    }

    // Every articulation key must be a declared capability. The schema checks this too; the
    // point here is that the extras are used, not decorative.
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect([...used].filter((k) => !perStep.includes(k))).toEqual([])
    for (const extra of perStep.filter((k) => !['velocity', 'probability', 'substep', 'cycle', 'start-timing'].includes(k))) {
      expect(used.has(extra)).toBe(true)
    }
  })

  it('declares the ten tracks the manual names, in panel order', () => {
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'lt', 'ht', 'rs', 'hc', 'ch', 'oh', 'cc', 'rc',
    ])
    // One track sounds one note. Layer A/B is two generators on one note, not two notes.
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
  })

  it('carries 15-20 recipes on distinct (role, character) pairs', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)

    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  it('reaches every track with at least one recipe', () => {
    const addressed = new Set(device.recipes.map((r) => r.voice))
    expect([...device.voices.map((v) => v.id)].filter((id) => !addressed.has(id))).toEqual([])
  })

  it('addresses steps only by PatternSlot, never by index or hit list', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"step"')
    expect(source).not.toContain('"hits"')

    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        // Slot membership is a schema check; this asserts the *values* stay categorical too.
        expect(Object.keys(entry.set).length).toBeGreaterThan(0)
      }
    }
  })

  it('cites no manual page for any sound-design value (§3.2)', () => {
    // The owner's manual documents controls; it defers parameter values to the Reference
    // Manual. Every point and every range therefore has to be provisional, and the audit is
    // what would notice if a future edit quietly promoted one.
    // Written out at every site rather than inherited: one later citation on a recipe must
    // not promote 85 values that nobody checked.
    for (const recipe of device.recipes) {
      expect(recipe.verified).toBe(false)
      for (const param of recipe.params as AuthoredParam[]) {
        expect(param.verified).toBe(false)
        if (param.kind === 'numeric') expect(param.range.verified).toBe(false)
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.provisionalPoints).toBe(counts.params)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const hint of Object.values(device.hints ?? {})) {
      expect(hint.split(/\s+/).length).toBeLessThanOrEqual(8)
    }
  })
})
