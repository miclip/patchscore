import { describe, expect, it } from 'vitest'
import {
  AuthoredParamSchema,
  CITE_KINDS,
  CiteSchema,
  NumericRangeSchema,
  PARAM_SCOPES,
  ProvenanceSchema,
  ResolvedParamSchema,
  VerifiedSchema,
  hoistedParams,
  type AuthoredParam,
  type ResolvedParam,
} from '../lib/core/index'
import { enumParam, numericParam, textParam } from './fixtures'

describe('Verified (§3.1)', () => {
  it('is a citation or an explicit false, and nothing else', () => {
    expect(VerifiedSchema.safeParse({ kind: 'manual', source: 'TR-1000 manual p.42' }).success).toBe(
      true,
    )
    expect(VerifiedSchema.safeParse(false).success).toBe(true)
    // `true` would claim verification without naming a source - the whole point is the source.
    expect(VerifiedSchema.safeParse(true).success).toBe(false)
    expect(VerifiedSchema.safeParse({ kind: 'manual', source: '' }).success).toBe(false)
    expect(VerifiedSchema.safeParse({}).success).toBe(false)
    expect(VerifiedSchema.safeParse(undefined).success).toBe(false)
  })
})

describe('Cite kind (§3.1)', () => {
  it('carries how the value was checked, and admits exactly three kinds', () => {
    expect(CiteSchema.safeParse({ kind: 'manual', source: 'p.42' }).success).toBe(true)
    expect(CiteSchema.safeParse({ kind: 'observed', source: 'unit, firmware 1.11' }).success).toBe(
      true,
    )
    // #191. A figure the manufacturer publishes outside the manual — a product page or a spec
    // sheet. Checkable by anyone with the link, which is the distinction the kinds encode; it is
    // not a licence to cite a forum or a retailer.
    expect(
      CiteSchema.safeParse({ kind: 'maker', source: 'teenage.engineering/products/op-xy' }).success,
    ).toBe(true)
    expect(CiteSchema.safeParse({ kind: 'ear', source: 'sounds right' }).success).toBe(false)
    // Pinned, so a fourth kind is a decision rather than a drift — the same guard #189 put on
    // invariant 3's exemptions.
    expect(CITE_KINDS).toEqual(['manual', 'observed', 'maker'])
  })

  it('will not take a source without saying how it was checked', () => {
    // The whole point of #19: an unlabelled citation is exactly what we are removing, so the
    // old free-text shape has to stop parsing rather than default to 'manual'.
    expect(CiteSchema.safeParse({ source: 'TR-1000 manual p.42' }).success).toBe(false)
    expect(VerifiedSchema.safeParse({ source: 'TR-1000 manual p.42' }).success).toBe(false)
  })

  it('does not let a kind smuggle extra fields past the schema', () => {
    expect(
      CiteSchema.safeParse({ kind: 'observed', source: 'my unit', firmware: '1.11' }).success,
    ).toBe(false)
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
      NumericRangeSchema.safeParse({
        min: 0,
        max: 100,
        verified: { kind: 'manual', source: 'p.42' },
      }).success,
    ).toBe(true)
    // An observed range is a first-class legality claim: mood may move a point inside it.
    expect(
      NumericRangeSchema.safeParse({
        min: 0,
        max: 100,
        verified: { kind: 'observed', source: 'TR-1000 unit, firmware 1.11' },
      }).success,
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
    expect(AuthoredParamSchema.safeParse(enumParam({ options: { values: [] } })).success).toBe(false)
    // The option set is a shape with its own citation slot, never a bare array (§3.2).
    expect(AuthoredParamSchema.safeParse(enumParam({ options: ['analog'] })).success).toBe(false)
  })

  it('lets an enum cite its option set while its selected value stays provisional (§3.2)', () => {
    // The legality/authority split, on an enum. Both claims are independent: an option set read
    // off the manual does not make the pick a manual-backed decision.
    const cited = enumParam({
      options: { values: ['analog', 'digital'], verified: { kind: 'manual', source: 'p.1' } },
      verified: false,
    })
    const parsed = AuthoredParamSchema.safeParse(cited)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
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

  it('lets any of the three kinds name the panel module it sits on', () => {
    // Shared across the union rather than numeric-only: a mode switch and a written instruction
    // sit on a panel block exactly as a knob does.
    expect(AuthoredParamSchema.safeParse(numericParam({ module: 'OSC 1' })).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(enumParam({ module: 'OSC 1' })).success).toBe(true)
    expect(AuthoredParamSchema.safeParse(textParam({ module: 'PATCHBAY' })).success).toBe(true)
  })

  it('refuses an empty module, the way it refuses an empty hint or note', () => {
    // Omission already means "nobody has said which block this is on". An empty string is an
    // author saying nothing while the field claims they said something, and it would reach a
    // renderer as a module heading with no name in it.
    expect(AuthoredParamSchema.safeParse(numericParam({ module: '' })).success).toBe(false)
    expect(AuthoredParamSchema.safeParse(enumParam({ module: '' })).success).toBe(false)
    expect(AuthoredParamSchema.safeParse(textParam({ module: '' })).success).toBe(false)
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

const MANUAL = { kind: 'manual', source: 'p.42' } as const
const OBSERVED = { kind: 'observed', source: 'TR-1000 unit, firmware 1.11' } as const

describe('Provenance (§3.2)', () => {
  it('accepts the three states and nothing else', () => {
    expect(ProvenanceSchema.safeParse({ state: 'authored', cite: MANUAL }).success).toBe(true)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        cite: MANUAL,
        rangeCite: { kind: 'manual', source: 'p.40' },
        from: 52,
        axes: ['darkness'],
      }).success,
    ).toBe(true)
    expect(ProvenanceSchema.safeParse({ state: 'provisional' }).success).toBe(true)
    expect(ProvenanceSchema.safeParse({ state: 'verified', cite: MANUAL }).success).toBe(false)
  })

  it('carries the cite kind through to the rendered value (§3.1)', () => {
    // §8 renders a manual citation and an observation differently. It can only do that if the
    // resolver stamped which one it was, so a bare source string must not parse.
    expect(ProvenanceSchema.safeParse({ state: 'authored', cite: OBSERVED }).success).toBe(true)
    expect(ProvenanceSchema.safeParse({ state: 'authored', source: 'p.42' }).success).toBe(false)
    expect(ProvenanceSchema.safeParse({ state: 'authored', cite: { source: 'p.42' } }).success).toBe(
      false,
    )

    const parsed = ProvenanceSchema.parse({ state: 'authored', cite: OBSERVED })
    expect(parsed).toEqual({ state: 'authored', cite: OBSERVED })
  })

  it('lets a derived value mix the two kinds', () => {
    // The point and the range are independent claims (§3.2), so nothing requires them to have
    // been checked the same way: a documented range with a point taken off the unit, or the
    // reverse. Both are citations, and the renderer needs to be able to say which is which.
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        cite: MANUAL,
        rangeCite: OBSERVED,
        from: 52,
        axes: ['darkness'],
      }).success,
    ).toBe(true)
  })

  it('makes derived carry both citations and the move that produced it', () => {
    // `derived` means mood moved a verified point inside a verified range: two citations, and
    // the `from` value the guide renders as `52 -> 45`.
    expect(
      ProvenanceSchema.safeParse({ state: 'derived', cite: MANUAL, from: 52, axes: ['darkness'] })
        .success,
    ).toBe(false)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        cite: MANUAL,
        rangeCite: { kind: 'manual', source: 'p.40' },
        axes: ['darkness'],
      }).success,
    ).toBe(false)
    expect(
      ProvenanceSchema.safeParse({
        state: 'derived',
        cite: MANUAL,
        rangeCite: { kind: 'manual', source: 'p.40' },
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

  it('does not let provisional claim a citation of either kind', () => {
    // A provisional value has no citation by definition; a stray cite here would let the
    // renderer show authority the point never had. `observed` is not a softer provisional -
    // it is a citation, so it cannot ride along on this state either.
    expect(ProvenanceSchema.safeParse({ state: 'provisional', cite: MANUAL }).success).toBe(false)
    expect(ProvenanceSchema.safeParse({ state: 'provisional', cite: OBSERVED }).success).toBe(false)
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

  it('carries the panel module through, and still refuses an empty one', () => {
    const withModule: ResolvedParam = {
      name: 'CUTOFF',
      value: 45,
      range: { min: 0, max: 100, verified: MANUAL },
      provenance: { state: 'authored', cite: MANUAL },
      module: 'FILTER',
    }
    expect(ResolvedParamSchema.safeParse(withModule).success).toBe(true)
    // The same non-empty rule as the authored side: the resolver copies the string, so a blank
    // one could only have come from an author, and the schema says so at both ends.
    expect(ResolvedParamSchema.safeParse({ ...withModule, module: '' }).success).toBe(false)
    // Absent is the ordinary case and stays legal — a device whose panel is one undivided
    // surface has nothing to put here, and that is not a gap.
    const { module: _module, ...withoutModule } = withModule
    expect(ResolvedParamSchema.safeParse(withoutModule).success).toBe(true)
  })

  it('accepts a rendered numeric or string value with provenance', () => {
    const derived: ResolvedParam = {
      name: 'TUNE',
      value: 45,
      provenance: {
        state: 'derived',
        cite: MANUAL,
        rangeCite: { kind: 'manual', source: 'p.40' },
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

describe('hoistedParams — the settings that belong to the device (§8/#107)', () => {
  const CITE = { kind: 'manual', source: 'Fixture p.7' } as const

  function swing(over: Partial<ResolvedParam> = {}): ResolvedParam {
    return {
      name: 'SWING',
      value: 50,
      unit: '%',
      range: { min: 25, max: 75, verified: CITE },
      provenance: { state: 'provisional' },
      note: '50% is no swing',
      hint: 'pick-fx',
      scope: 'pattern',
      ...over,
    }
  }

  const cutoff: ResolvedParam = {
    name: 'CUTOFF',
    value: 74,
    range: { min: 0, max: 100, verified: CITE },
    provenance: { state: 'provisional' },
  }

  it('lifts a scoped parameter every part agrees on, and names it for the parts to drop', () => {
    const out = hoistedParams([
      [cutoff, swing()],
      [swing(), cutoff],
      [swing()],
    ])
    expect(out.groups).toHaveLength(1)
    expect(out.groups[0]?.scope).toBe('pattern')
    expect(out.groups[0]?.params.map((p) => p.name)).toEqual(['SWING'])
    expect([...out.names]).toEqual(['SWING'])
  })

  it('carries the whole line, not just the name — hoisting must not cost evidence', () => {
    const only = hoistedParams([[swing()]]).groups[0]?.params[0]
    expect(only?.value).toBe(50)
    expect(only?.unit).toBe('%')
    expect(only?.range?.verified).toEqual(CITE)
    expect(only?.note).toBe('50% is no swing')
    expect(only?.hint).toBe('pick-fx')
    expect(only?.provenance).toEqual({ state: 'provisional' })
  })

  it('leaves an unscoped parameter exactly where it is, however often it repeats', () => {
    // The ordinary case, and the reason the field is opt-in: `CUTOFF` under three parts is three
    // settings that happen to share a number, and merging them would be a claim about the box.
    const out = hoistedParams([[cutoff], [cutoff], [cutoff]])
    expect(out.groups).toEqual([])
    expect(out.names.size).toBe(0)
  })

  it('refuses to hoist when the parts disagree, and says so by leaving them alone', () => {
    // Two recipes authoring the same pattern-global control at different values. One line under a
    // heading claiming it covers both would invent an agreement the data does not contain
    // (invariant 5) — worse than the repetition it would tidy away. The reader sees both and can
    // tell something is wrong, which is the honest failure.
    const out = hoistedParams([[swing()], [swing({ value: 62 })]])
    expect(out.groups).toEqual([])
    expect(out.names.size).toBe(0)
  })

  it('refuses on a difference in evidence alone, not only in the value', () => {
    // Same number, different citation: two recipes inheriting different recipe-level `verified`.
    // The number a reader dials is identical and the claim behind it is not, so the lines are not
    // one line.
    const other = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const
    const out = hoistedParams([
      [swing({ provenance: { state: 'authored', cite: CITE } })],
      [swing({ provenance: { state: 'authored', cite: other } })],
    ])
    expect(out.names.size).toBe(0)
  })

  it('keeps the scopes apart and orders them as PARAM_SCOPES does', () => {
    // No shipped device declares both, but the block is one loop over the vocabulary and the
    // order it prints in should not depend on which part resolved first.
    const song = swing({ name: 'GROOVE', scope: 'song' })
    const out = hoistedParams([[song], [swing()]])
    expect(out.groups.map((g) => g.scope)).toEqual([...PARAM_SCOPES])
    expect(out.groups.map((g) => g.params.map((p) => p.name))).toEqual([['SWING'], ['GROOVE']])
  })

  it('sorts within a scope by code unit, not by which part got there first', () => {
    const a = swing({ name: 'ALPHA' })
    const z = swing({ name: 'ZULU' })
    expect(hoistedParams([[z], [a]]).groups[0]?.params.map((p) => p.name)).toEqual([
      'ALPHA',
      'ZULU',
    ])
  })
})
