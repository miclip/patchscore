import { describe, expect, it } from 'vitest'
import { DeviceSchema } from '../lib/core/index'
import { auditDevice, effectiveVerified, isCited, totalCounts } from '../scripts/audit-verified'
import { device, enumParam, numericParam, recipe } from './fixtures'

/**
 * §3.2 requires three counts kept apart. The point of these tests is that one debt cannot be
 * read off another: a param can be a provisional point with a verified range, an unverified
 * range with a cited point, and mood-inert is a strict subset of the second.
 */

const CITE = { source: 'fixture manual p.7' }

/** Guards the fixtures themselves: an audit over data that would not build proves nothing. */
function validDevice(over: Parameters<typeof device>[0]) {
  const d = device(over)
  expect(DeviceSchema.safeParse(d).success).toBe(true)
  return d
}

describe('inheritance (§3.1)', () => {
  it('lets an explicit false on the param override an inherited citation', () => {
    expect(effectiveVerified(false, CITE)).toBe(false)
    expect(isCited(effectiveVerified(false, CITE))).toBe(false)
  })

  it('inherits the recipe citation only when the param omits its own', () => {
    expect(effectiveVerified(undefined, CITE)).toEqual(CITE)
    expect(effectiveVerified(CITE, false)).toEqual(CITE)
    expect(isCited(effectiveVerified(undefined, undefined))).toBe(false)
  })

  it('does not treat false as a citation', () => {
    // params.ts: `false` = authored, nothing checked against. Provenance.authored needs a
    // source to render, so an uncited point is provisional however deliberate it was.
    expect(isCited(false)).toBe(false)
    expect(isCited(undefined)).toBe(false)
    expect(isCited(CITE)).toBe(true)
  })
})

describe('the three counts are separate debts (§3.2, §9)', () => {
  it('counts a provisional point whose range is verified', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: CITE,
          params: [numericParam({ verified: false })],
        }),
      ],
    })
    const a = auditDevice(d)
    expect(a.counts).toEqual({
      params: 1,
      provisionalPoints: 1,
      unverifiedRanges: 0,
      moodInert: 0,
    })
  })

  it('counts an unverified range whose point is cited', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: false,
          params: [numericParam({ verified: CITE, range: { min: 0, max: 100 } })],
        }),
      ],
    })
    const a = auditDevice(d)
    expect(a.counts).toEqual({
      params: 1,
      provisionalPoints: 0,
      unverifiedRanges: 1,
      moodInert: 0,
    })
  })

  it('counts mood-inert only when a declared mood sits in an unverified range', () => {
    const inert = validDevice({
      recipes: [
        recipe({
          verified: CITE,
          params: [
            numericParam({
              range: { min: 0, max: 100, verified: false },
              mood: [{ axis: 'darkness', amount: 12 }],
            }),
          ],
        }),
      ],
    })
    expect(auditDevice(inert).counts).toEqual({
      params: 1,
      provisionalPoints: 0,
      unverifiedRanges: 1,
      moodInert: 1,
    })

    const live = validDevice({
      recipes: [
        recipe({
          verified: CITE,
          params: [numericParam({ mood: [{ axis: 'darkness', amount: 12 }] })],
        }),
      ],
    })
    expect(auditDevice(live).counts.moodInert).toBe(0)
    expect(auditDevice(live).counts.unverifiedRanges).toBe(0)
  })

  it('never counts a range against an enum or text param', () => {
    const d = validDevice({
      recipes: [recipe({ verified: undefined, params: [enumParam()] })],
    })
    const a = auditDevice(d)
    expect(a.counts).toEqual({
      params: 1,
      provisionalPoints: 1,
      unverifiedRanges: 0,
      moodInert: 0,
    })
  })

  it('keeps a fully cited param out of all three counts', () => {
    const d = validDevice({ recipes: [recipe({ verified: CITE, params: [numericParam()] })] })
    expect(auditDevice(d).counts).toEqual({
      params: 1,
      provisionalPoints: 0,
      unverifiedRanges: 0,
      moodInert: 0,
    })
  })

  it('reports one finding per debt, so a param can appear in more than one', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: false,
          params: [
            numericParam({
              range: { min: 0, max: 100 },
              mood: [{ axis: 'grit', amount: 8 }],
            }),
          ],
        }),
      ],
    })
    const a = auditDevice(d)
    expect(a.counts).toEqual({
      params: 1,
      provisionalPoints: 1,
      unverifiedRanges: 1,
      moodInert: 1,
    })
    expect(a.findings.map((f) => f.kind)).toEqual([
      'provisional-point',
      'unverified-range',
      'mood-inert',
    ])
    expect(new Set(a.findings.map((f) => f.paramName))).toEqual(new Set(['TUNE']))
  })
})

describe('totals', () => {
  it('adds each count independently across devices', () => {
    const provisional = validDevice({
      id: 'aa',
      recipes: [recipe({ verified: false, params: [numericParam({ range: { min: 0, max: 1 }, value: 1 })] })],
    })
    const clean = validDevice({
      id: 'bb',
      recipes: [recipe({ verified: CITE, params: [numericParam(), enumParam({ verified: CITE })] })],
    })

    expect(totalCounts([auditDevice(provisional), auditDevice(clean)])).toEqual({
      params: 3,
      provisionalPoints: 1,
      unverifiedRanges: 1,
      moodInert: 0,
    })
  })
})
