import { describe, expect, it } from 'vitest'
import { groupDiagnostics, type InspirationDiagnostic } from '../lib/core/inspiration'
import type { DensityBand } from '../lib/core/template'
import type { InspirationId } from '../lib/core/ids'

const missing = (band: DensityBand, role = 'texture', id = 'echo'): InspirationDiagnostic => ({
  kind: 'no-such-target',
  inspirationId: id as InspirationId,
  role: role as InspirationDiagnostic extends { role: infer R } ? R : never,
  band,
  templateName: 'Ambient Dub',
  inspirationName: 'Echo',
  detail: `'Ambient Dub' authors no ${role} at band ${String(band)}, so Echo's replacement for it was not applied`,
})

describe('§5.4 findings are read, not enumerated (#138)', () => {
  it('says "at any band" when every band is missing, rather than four near-identical lines', () => {
    const grouped = groupDiagnostics([missing(0), missing(1), missing(2), missing(3)])
    expect(grouped).toHaveLength(1)
    expect(grouped[0]?.detail).toBe(
      "'Ambient Dub' authors no texture at any band, so Echo's replacement for it was not applied",
    )
  })

  it('names the bands when only some are missing, because that is a different fact', () => {
    expect(groupDiagnostics([missing(0), missing(2)])[0]?.detail).toContain('at bands 0 and 2')
    expect(groupDiagnostics([missing(1)])[0]?.detail).toContain('at band 1')
  })

  it('keeps one group per role and per inspiration', () => {
    const grouped = groupDiagnostics([
      missing(0, 'texture'),
      missing(1, 'texture'),
      missing(0, 'lead'),
    ])
    expect(grouped).toHaveLength(2)
    expect(grouped.map((g) => g.detail.includes('texture'))).toEqual([true, false])
  })

  it('leaves other kinds exactly as authored, one line each', () => {
    const other: InspirationDiagnostic[] = [
      { kind: 'role-already-patterned', inspirationId: 'dancehall' as InspirationId, role: 'rim', detail: 'A' },
      { kind: 'role-already-requested', inspirationId: 'dancehall' as InspirationId, role: 'rim', detail: 'B' },
      { kind: 'bpm-clamped', detail: 'C' },
    ]
    expect(groupDiagnostics(other).map((g) => g.detail)).toEqual(['A', 'B', 'C'])
  })

  it('does not reorder: a group keeps the position of its first member', () => {
    const grouped = groupDiagnostics([
      { kind: 'bpm-clamped', detail: 'first' },
      missing(0),
      { kind: 'bpm-clamped', detail: 'last' },
      missing(1),
    ])
    expect(grouped.map((g) => g.detail.slice(0, 5))).toEqual(['first', "'Ambi", 'last'])
  })

  it('sorts bands numerically, not by their string form', () => {
    // `[10, 2]` cannot occur with four bands, but the comparator should be numeric regardless.
    expect(groupDiagnostics([missing(3), missing(1), missing(2)])[0]?.detail).toContain(
      'at bands 1, 2 and 3',
    )
  })

  it('returns nothing for nothing', () => {
    expect(groupDiagnostics([])).toEqual([])
  })
})
