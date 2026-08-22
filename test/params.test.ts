import { describe, expect, it } from 'vitest'
import {
  AuthoredParamSchema,
  NumericRangeSchema,
  ProvenanceSchema,
  ResolvedParamSchema,
  VerifiedSchema,
  type AuthoredParam,
  type ResolvedParam,
} from '../lib/core/index'
import { enumParam, numericParam, textParam } from './fixtures'

describe('Verified (§3.1)', () => {
  it('is a citation or an explicit false, and nothing else', () => {
    expect(VerifiedSchema.safeParse({ source: 'TR-1000 manual p.42' }).success).toBe(true)
    expect(VerifiedSchema.safeParse(false).success).toBe(true)
    // `true` would claim verification without naming a source - the whole point is the source.
    expect(VerifiedSchema.safeParse(true).success).toBe(false)
    expect(VerifiedSchema.safeParse({ source: '' }).success).toBe(false)
    expect(VerifiedSchema.safeParse({}).success).toBe(false)
    expect(VerifiedSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('NumericRange (§3.1)', () => {
  it('requires min strictly below max', () => {
    expect(NumericRangeSchema.safeParse({ min: 0, max: 100 }).success).toBe(true)
    expect(NumericRangeSchema.safeParse({ min: 100, max: 0 }).success).toBe(false)
    expect(NumericRangeSchema.safeParse({ min: 50, max: 50 }).success).toBe(false)
  })

  it('carries its own verification claim, independent of the point', () => {
    // The range is the legality gate; the point is the authority gate (§3.2).
    expect(NumericRangeSchema.safeParse({ min: 0, max: 100, verified: false }).success).toBe(true)
    expect(
      NumericRangeSchema.safeParse({ min: 0, max: 100, verified: { source: 'p.42' } }).success,
    ).toBe(true)
  })
})

describe('AuthoredParam union (§3.1)', () => {
  it('accepts all three branches', () => {
    expect(AuthoredParamSchema.safeParse(numericParam()).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(enumParam()).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(textParam()).success).toBe(true)
  })

  it('rejects a kind outside the union', () => {
    expect(AuthoredParamSchema.safeParse({ kind: 'boolean', name: 'X', value: true }).success).toBe(
      false,
    )
    expect(AuthoredParamSchema.safeParse({ name: 'X', value: 1 }).success).toBe(false)
  })

  it('does not let a numeric point sit outside its own range', () => {
    // An authoring typo, not a provenance question: it fails the build (§3.1).
    expect(AuthoredParamSchema.safeParse(numericParam({ value: 120 })).success).toBe(false)
    expect(AuthoredParamSchema.safeParse(numericParam({ value: -1 })).success).toBe(false)
    expect(AuthoredParamSchema.safeParse(numericParam({ value: 0 })).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(numericParam({ value: 100 })).success).toBe(true)
  })

  it('requires an enum value to be one of its options', () => {
    expect(AuthoredParamSchema.safeParse(enumParam({ value: 'hybrid' })).success).toBe(false)
    expect(AuthoredParamSchema.safeParse(enumParam({ options: [] })).success).toBe(false)
  })

  it('only lets numeric params declare mood, and only on known axes', () => {
    expect(
      AuthoredParamSchema.safeParse(numericParam({ mood: [{ axis: 'darkness', amount: -12 }] }))
        .success,
    ).toBe(true)
    expect(
      AuthoredParamSchema.safeParse(numericParam({ mood: [{ axis: 'warmth', amount: -12 }] }))
        .success,
    ).toBe(false)
    // A text param cannot be offset - strings cannot be moved inside bounds.
    expect(AuthoredParamSchema.safeParse(textParam({ mood: [{ axis: 'grit', amount: 4 }] })).success)
      .toBe(false)
  })

  it('rejects a step of zero or below', () => {
    expect(AuthoredParamSchema.safeParse(numericParam({ step: 5 })).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(numericParam({ step: 0 })).success).toBe(false)
  })

  it('narrows to the numeric branch on the discriminant', () => {
    const param: AuthoredParam = numericParam()
    if (param.kind === 'numeric') {
      expect(param.range.max).toBe(100)
    } else {
      throw new Error('fixture should be numeric')
    }
  })
})

describe('Provenance (§3.2)', () => {
  it('accepts the three states and nothing else', () => {
    expect(ProvenanceSchema.safeParse({ state: 'authored', source: 'p.42' }).success).toBe(true)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        source: 'p.42',
        rangeSource: 'p.40',
        from: 52,
        axes: ['darkness'],
      }).success,
    ).toBe(true)
    expect(ProvenanceSchema.safeParse({ state: 'provisional' }).success).toBe(true)
    expect(ProvenanceSchema.safeParse({ state: 'verified', source: 'p.42' }).success).toBe(false)
  })

  it('makes derived carry both citations and the move that produced it', () => {
    // `derived` means mood moved a verified point inside a verified range: two sources, and
    // the `from` value the guide renders as `52 -> 45`.
    expect(
      ProvenanceSchema.safeParse({ state: 'derived', source: 'p.42', from: 52, axes: ['darkness'] })
        .success,
    ).toBe(false)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        source: 'p.42',
        rangeSource: 'p.40',
        axes: ['darkness'],
      }).success,
    ).toBe(false)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        source: 'p.42',
        rangeSource: 'p.40',
        from: 52,
        axes: [],
      }).success,
    ).toBe(false)
  })

  it('lets provisional still record a move (§3.2: provisional dominates derived)', () => {
    // Moving an unverified point inside a verified range is legal and still rendered
    // `52 -> 45`, but it inherits no authority the starting point never had.
    expect(
      ProvenanceSchema.safeParse({ state: 'provisional', from: 52, axes: ['darkness'] }).success,
    ).toBe(true)
  })

  it('does not let provisional claim a source', () => {
    // A provisional value has no citation by definition; a stray `source` here would let the
    // renderer show authority the point never had.
    expect(ProvenanceSchema.safeParse({ state: 'provisional', source: 'p.42' }).success).toBe(false)
  })
})

describe('ResolvedParam (§3.1, invariant 4)', () => {
  it('will not parse a value whose provenance nobody decided', () => {
    expect(ResolvedParamSchema.safeParse({ name: 'TUNE', value: 45 }).success).toBe(false)
    expect(
      ResolvedParamSchema.safeParse({ name: 'TUNE', value: 45, provenance: undefined }).success,
    ).toBe(false)
  })

  it('accepts a rendered numeric or string value with provenance', () => {
    const derived: ResolvedParam = {
      name: 'TUNE',
      value: 45,
      provenance: {
        state: 'derived',
        source: 'p.42',
        rangeSource: 'p.40',
        from: 52,
        axes: ['darkness'],
      },
    }
    expect(ResolvedParamSchema.safeParse(derived).success).toBe(true)
    expect(
      ResolvedParamSchema.safeParse({
        name: 'MODE',
        value: 'analog',
        provenance: { state: 'provisional' },
      }).success,
    ).toBe(true)
  })
})
