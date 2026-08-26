import { describe, expect, it } from 'vitest'
import { DeviceSchema } from '../lib/core/index'
import {
  ZERO_COUNTS,
  auditDevice,
  citeKind,
  effectiveVerified,
  formatAudit,
  isCited,
  totalCounts,
  type AuditCounts,
} from '../scripts/audit-verified'
import { device, enumParam, numericParam, recipe, textParam } from './fixtures'

/**
 * §3.2 requires three debts kept apart. The point of these tests is that one debt cannot be
 * read off another: a param can be a provisional point with a verified range, an unverified
 * range with a cited point, and mood-inert is a strict subset of the second.
 *
 * On top of that, §3.1's `Cite.kind` splits the *cited* half — a manual page anyone can re-read
 * versus a reading off one person's unit. Neither is a debt, and neither may be silently folded
 * into the other.
 */

const CITE = { kind: 'manual', source: 'fixture manual p.7' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const

/** Spelling out ten zeroes at every call site would bury the one number each test is about. */
/**
 * §2.6/#142. The shared `device()` fixture declares one cited capability fact — `noteDuration`,
 * which `DeviceSchema` requires of any device carrying recipes — so that pair is part of the
 * baseline here rather than something every param-counting test restates. Overridable, like
 * everything else: a test about capability counting passes its own.
 */
function counts(over: Partial<AuditCounts>): AuditCounts {
  return { ...ZERO_COUNTS, capabilityFacts: 1, manualCapabilities: 1, ...over }
}

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

  it('carries the kind through inheritance, not just the fact of a citation', () => {
    // An observed recipe citation must not be inherited as if it were a manual one.
    expect(citeKind(effectiveVerified(undefined, OBSERVED))).toBe('observed')
    expect(citeKind(effectiveVerified(CITE, OBSERVED))).toBe('manual')
  })

  it('does not treat false as a citation', () => {
    // params.ts: `false` = authored, nothing checked against. Provenance.authored needs a
    // citation to render, so an uncited point is provisional however deliberate it was.
    expect(isCited(false)).toBe(false)
    expect(isCited(undefined)).toBe(false)
    expect(isCited(CITE)).toBe(true)
    expect(isCited(OBSERVED)).toBe(true)
    expect(citeKind(false)).toBeUndefined()
    expect(citeKind(undefined)).toBeUndefined()
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
    expect(a.counts).toEqual(
      counts({ params: 1, provisionalPoints: 1, numerics: 1, manualRanges: 1 }),
    )
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
    expect(a.counts).toEqual(
      counts({ params: 1, manualPoints: 1, numerics: 1, unverifiedRanges: 1 }),
    )
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
    expect(auditDevice(inert).counts).toEqual(
      counts({
        params: 1,
        manualPoints: 1,
        numerics: 1,
        unverifiedRanges: 1,
        moodInert: 1,
      }),
    )

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
    expect(a.counts).toEqual(counts({ params: 1, provisionalPoints: 1 }))
  })

  it('keeps a fully cited param out of all three counts', () => {
    const d = validDevice({ recipes: [recipe({ verified: CITE, params: [numericParam()] })] })
    expect(auditDevice(d).counts).toEqual(
      counts({ params: 1, manualPoints: 1, numerics: 1, manualRanges: 1 }),
    )
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
    expect(a.counts).toEqual(
      counts({
        params: 1,
        provisionalPoints: 1,
        numerics: 1,
        unverifiedRanges: 1,
        moodInert: 1,
      }),
    )
    expect(a.findings.map((f) => f.kind)).toEqual([
      'provisional-point',
      'unverified-range',
      'mood-inert',
    ])
    expect(new Set(a.findings.map((f) => ('fact' in f ? f.fact : f.paramName)))).toEqual(
      new Set(['TUNE']),
    )
  })
})

describe('manual and observed are counted apart (§3.1)', () => {
  it('splits cited points by kind rather than lumping them together', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: false,
          params: [
            numericParam({ verified: CITE, range: { min: 0, max: 100, verified: CITE } }),
            numericParam({
              name: 'DECAY',
              verified: OBSERVED,
              range: { min: 0, max: 100, verified: OBSERVED },
            }),
          ],
        }),
      ],
    })
    expect(auditDevice(d).counts).toEqual(
      counts({
        params: 2,
        manualPoints: 1,
        observedPoints: 1,
        numerics: 2,
        manualRanges: 1,
        observedRanges: 1,
      }),
    )
  })

  it('does not treat an observation as a debt', () => {
    // `observed` means somebody checked, on hardware. It is not a softer `provisional`, so it
    // produces no finding at all.
    const d = validDevice({
      recipes: [
        recipe({
          verified: OBSERVED,
          params: [numericParam({ mood: [{ axis: 'darkness', amount: 12 }] })],
        }),
      ],
    })
    const a = auditDevice(d)
    expect(a.findings).toEqual([])
    expect(a.counts.provisionalPoints).toBe(0)
    expect(a.counts.unverifiedRanges).toBe(0)
    expect(a.counts.moodInert).toBe(0)
  })

  it('splits the two claims independently: an observed range under a manual point', () => {
    // The two gates are orthogonal in kind as well as in verdict — a point read off a page can
    // sit in bounds nobody documented, and the audit has to count each on its own column.
    const d = validDevice({
      recipes: [
        recipe({
          verified: CITE,
          params: [numericParam({ range: { min: 0, max: 100, verified: OBSERVED } })],
        }),
      ],
    })
    expect(auditDevice(d).counts).toEqual(
      counts({ params: 1, manualPoints: 1, numerics: 1, observedRanges: 1 }),
    )
  })

  it('keeps both halves total, so no case can go uncounted', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: false,
          params: [
            numericParam({ verified: CITE }),
            numericParam({ name: 'DECAY', verified: OBSERVED }),
            numericParam({ name: 'SNAP', range: { min: 0, max: 100, verified: OBSERVED } }),
            enumParam({ verified: CITE }),
            enumParam({ name: 'FILT' }),
          ],
        }),
      ],
    })
    const c = auditDevice(d).counts
    expect(c.manualPoints + c.observedPoints + c.provisionalPoints).toBe(c.params)
    expect(c.manualRanges + c.observedRanges + c.unverifiedRanges).toBe(c.numerics)
    expect(c.params).toBe(5)
    expect(c.numerics).toBe(3)
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
    const observed = validDevice({
      id: 'cc',
      recipes: [recipe({ verified: OBSERVED, params: [numericParam({ range: { min: 0, max: 1 }, value: 1 })] })],
    })

    expect(totalCounts([auditDevice(provisional), auditDevice(clean), auditDevice(observed)])).toEqual(
      counts({
        params: 4,
        manualPoints: 2,
        observedPoints: 1,
        provisionalPoints: 1,
        numerics: 3,
        manualRanges: 1,
        observedRanges: 1,
        unverifiedRanges: 1,
        // Three devices, each carrying the fixture's one cited `noteDuration` — the point of
        // this test is that the counts add, and the capability pair adds like the rest.
        capabilityFacts: 3,
        manualCapabilities: 3,
      }),
    )
  })

  it('reports zero of everything when there is nothing to audit', () => {
    expect(totalCounts([])).toEqual(ZERO_COUNTS)
  })
})

// ---------------------------------------------------------------------------
// #29 — unitless numerics: watched, never a finding
// ---------------------------------------------------------------------------

describe('unitless numerics (#29)', () => {
  it('counts numerics with no unit, as a subset of the numerics', () => {
    const d = validDevice({
      recipes: [
        recipe({
          verified: CITE,
          params: [
            numericParam({ name: 'DECAY', unit: undefined }),
            numericParam({ name: 'PITCH', unit: 'St' }),
            // Enums and text have no unit to be missing; they must not land in this count.
            enumParam(),
            textParam(),
          ],
        }),
      ],
    })
    expect(auditDevice(d).counts).toEqual(
      counts({
        params: 4,
        manualPoints: 4,
        numerics: 2,
        manualRanges: 2,
        unitlessNumerics: 1,
      }),
    )
  })

  it('produces no finding, because unitless is often correct rather than a debt', () => {
    const d = validDevice({
      recipes: [
        recipe({ verified: CITE, params: [numericParam({ name: 'AMOUNT', unit: undefined })] }),
      ],
    })
    const audit = auditDevice(d)
    expect(audit.counts.unitlessNumerics).toBe(1)
    // A 0-100 "amount" with no physical dimension has no unit to give, and inventing `%` for
    // it would be worse than leaving it bare. So there is nothing here to fix, and no finding.
    expect(audit.findings).toEqual([])
  })

  it('is orthogonal to every verification count', () => {
    // A unit says nothing about whether anyone checked the value, and the reverse.
    const cited = validDevice({
      id: 'aa',
      recipes: [recipe({ verified: CITE, params: [numericParam({ unit: undefined })] })],
    })
    const uncited = validDevice({
      id: 'bb',
      recipes: [
        recipe({
          verified: false,
          params: [numericParam({ unit: '%', range: { min: 0, max: 1 }, value: 1 })],
        }),
      ],
    })
    expect(auditDevice(cited).counts.unitlessNumerics).toBe(1)
    expect(auditDevice(uncited).counts.unitlessNumerics).toBe(0)
    expect(auditDevice(uncited).counts.provisionalPoints).toBe(1)
  })

  it('adds across devices like every other count', () => {
    const bare = [numericParam({ unit: undefined })]
    const a = validDevice({ id: 'aa', recipes: [recipe({ verified: CITE, params: bare })] })
    const b = validDevice({ id: 'bb', recipes: [recipe({ verified: CITE, params: bare })] })
    expect(totalCounts([auditDevice(a), auditDevice(b)]).unitlessNumerics).toBe(2)
  })
})

describe('the report names both kinds (§9)', () => {
  it('shows manual and observed on their own columns, points and ranges apart', () => {
    const d = validDevice({
      id: 'fixture-drum',
      recipes: [
        recipe({
          verified: OBSERVED,
          params: [numericParam({ range: { min: 0, max: 100, verified: false } })],
        }),
      ],
    })
    const out = formatAudit([auditDevice(d)], false)
    expect(out).toContain('fixture-drum')
    expect(out).toMatch(/points\s+1 total\s+0 manual\s+1 observed\s+0 provisional/)
    expect(out).toMatch(/ranges\s+1 total\s+0 manual\s+0 observed\s+1 unverified\s+0 mood-inert/)
    expect(out).toContain('TOTAL')
  })

  it('reports the unit count on its own line, worded as a number to watch (#29)', () => {
    const d = validDevice({
      id: 'fixture-drum',
      recipes: [
        recipe({
          verified: CITE,
          params: [
            numericParam({ name: 'DECAY', unit: undefined }),
            numericParam({ name: 'PITCH', unit: 'St' }),
          ],
        }),
      ],
    })
    const out = formatAudit([auditDevice(d)], false)
    expect(out).toContain('units      1 of 2 numerics carry no unit (watched, not a target)')
    // Never on the ranges line: a number sitting in the debt table reads as a debt.
    expect(out).toMatch(/ranges\s+2 total\s+2 manual\s+0 observed\s+0 unverified\s+0 mood-inert/)
  })

  it('lists the findings behind the numbers under --verbose', () => {
    const d = validDevice({
      recipes: [recipe({ verified: false, params: [numericParam({ range: { min: 0, max: 100 } })] })],
    })
    const audits = [auditDevice(d)]
    expect(formatAudit(audits, true)).toContain('provisional-point: fx-kick-hard / TUNE')
    expect(formatAudit(audits, false)).not.toContain('provisional-point:')
  })
})
