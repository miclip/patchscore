import { z } from 'zod'
import { MoodAxisSchema, type MoodAxis } from './vocabulary'

/**
 * §3.1. Parameters are a discriminated union, and authored params are not rendered params.
 *
 * Two separate claims live here and must not be collapsed:
 *  - `verified` on a *point value* decides `authored` vs `provisional` (the authority gate)
 *  - `verified` on a *range* decides whether mood may move the point at all (the legality gate)
 */

/**
 * §3.1. How a value was checked. Neither kind is second-class, and `observed` is not a softer
 * `provisional`: `provisional` means nobody checked, `observed` means somebody did, on hardware.
 * They are kept apart because they are checkable by different people — a manual page can be
 * re-read by anyone holding the document, a unit reading can only be re-taken on that unit.
 */
export const CITE_KINDS = ['manual', 'observed'] as const

export type CiteKind = (typeof CITE_KINDS)[number]

/**
 * A citation, discriminated on how it was obtained. Two shapes rather than one field so the
 * kinds can diverge later (an observation wants firmware; a manual page does not) without
 * another migration across every recipe.
 */
export type Cite =
  /** 'TR-1000 Reference Manual p.42' */
  | { kind: 'manual'; source: string }
  /** 'TR-1000 unit, firmware 1.11' */
  | { kind: 'observed'; source: string }

/** `false` = authored, nothing checked against. */
export type Verified = Cite | false

export const CiteSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('manual'),
    source: z.string().min(1, 'a citation needs a source'),
  }),
  z.strictObject({
    kind: z.literal('observed'),
    source: z.string().min(1, 'a citation needs a source'),
  }),
])

export const VerifiedSchema = z.union([CiteSchema, z.literal(false)])

/**
 * Bounds are their own claim. A range can be verified while the point inside it is not, and a
 * point can be read off the manual for a parameter whose limits the manual never states.
 */
export type NumericRange = { min: number; max: number; verified?: Verified }

export const NumericRangeSchema = z
  .strictObject({
    min: z.number().finite(),
    max: z.number().finite(),
    verified: VerifiedSchema.optional(),
  })
  .refine((r) => r.min < r.max, {
    message: 'range.min must be strictly less than range.max',
    path: ['min'],
  })

/**
 * §3.2. An enum's option set is its own claim, exactly as a numeric range is — and for exactly
 * the same reason.
 *
 *     numeric:  range   decides legality (cited)  |  value decides authority (taste)
 *     enum:     options decides legality (cited)  |  value decides authority (taste)
 *
 * "`909 Bass Drum` appears in the GEN list under BD_E" is an *options* claim, checkable by
 * anyone holding the document. "This recipe reaches for it for a hard kick" is a *value* claim,
 * and it is taste in precisely the way `TUNE 44` is taste. `options` was a bare `string[]` with
 * nowhere to hang a citation, so the citation went to the only slot available — the param —
 * where it made the second claim while intending only the first. This is the same defect the
 * design review caught for numerics in step 1, when `range` was a bare tuple; it was repaired
 * there and missed here.
 */
export type EnumOptions = { values: string[]; verified?: Verified }

export const EnumOptionsSchema = z.strictObject({
  values: z.array(z.string().min(1)).min(1),
  verified: VerifiedSchema.optional(),
})

/** §6.1. `amount` is authored in device units: "at full darkness this moves 12". */
export type MoodOffset = { axis: MoodAxis; amount: number }

export const MoodOffsetSchema = z.strictObject({
  axis: MoodAxisSchema,
  amount: z.number().finite(),
})

// ---------------------------------------------------------------------------
// Authored — what a device folder contains, and the only shape an author writes.
// ---------------------------------------------------------------------------

export type AuthoredNumericParam = {
  kind: 'numeric'
  name: string
  value: number
  range: NumericRange
  step?: number
  unit?: string
  mood?: MoodOffset[]
  /** The *point value*. Omitted → inherit the recipe's `verified`. */
  verified?: Verified
  hint?: string
  note?: string
}

export type AuthoredEnumParam = {
  kind: 'enum'
  name: string
  value: string
  /** The legality gate. Cited independently of the point, exactly as `range` is. */
  options: EnumOptions
  /** The *selected option*. Omitted → inherit the recipe's `verified`. */
  verified?: Verified
  hint?: string
  note?: string
}

export type AuthoredTextParam = {
  kind: 'text'
  name: string
  value: string
  verified?: Verified
  hint?: string
  note?: string
}

export type AuthoredParam = AuthoredNumericParam | AuthoredEnumParam | AuthoredTextParam

const paramCommon = {
  name: z.string().min(1),
  verified: VerifiedSchema.optional(),
  hint: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
}

/**
 * A point outside its own declared range is an authoring typo, not a provenance question:
 * it fails the build (§3.1).
 */
export const AuthoredNumericParamSchema = z
  .strictObject({
    kind: z.literal('numeric'),
    value: z.number().finite(),
    range: NumericRangeSchema,
    step: z.number().finite().positive().optional(),
    unit: z.string().min(1).optional(),
    mood: z.array(MoodOffsetSchema).min(1).optional(),
    ...paramCommon,
  })
  .refine((p) => p.value >= p.range.min && p.value <= p.range.max, {
    message: 'value must sit inside its own declared range',
    path: ['value'],
  })

export const AuthoredEnumParamSchema = z
  .strictObject({
    kind: z.literal('enum'),
    value: z.string().min(1),
    options: EnumOptionsSchema,
    ...paramCommon,
  })
  .refine((p) => p.options.values.includes(p.value), {
    message: 'value must be one of options.values',
    path: ['value'],
  })

export const AuthoredTextParamSchema = z.strictObject({
  kind: z.literal('text'),
  value: z.string().min(1),
  ...paramCommon,
})

export const AuthoredParamSchema = z.discriminatedUnion('kind', [
  AuthoredNumericParamSchema,
  AuthoredEnumParamSchema,
  AuthoredTextParamSchema,
])

// ---------------------------------------------------------------------------
// Resolved — what §7 step 9 emits and §8 renders. Nothing in a device folder can
// construct one of these, and nothing downstream of the resolver sees an AuthoredParam.
// ---------------------------------------------------------------------------

/**
 * §3.2. Three-state, and always rendered. `provisional` dominates `derived`.
 *
 * A cited state carries the whole `Cite`, not a bare source string, so the resolver cannot stamp
 * a source without saying how it was checked — the same compiler-enforced discipline as
 * `provenance` itself being non-optional. §8 renders a manual citation and an observation
 * differently, and cannot do that from a string.
 */
export type Provenance =
  | { state: 'authored'; cite: Cite }
  | {
      state: 'derived'
      cite: Cite
      rangeCite: Cite
      /** 52 → 45, and which knobs did it. */
      from: number
      axes: MoodAxis[]
    }
  | { state: 'provisional'; from?: number; axes?: MoodAxis[] }

export const ProvenanceSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('authored'), cite: CiteSchema }),
  z.strictObject({
    state: z.literal('derived'),
    cite: CiteSchema,
    rangeCite: CiteSchema,
    from: z.number().finite(),
    axes: z.array(MoodAxisSchema).min(1),
  }),
  z.strictObject({
    state: z.literal('provisional'),
    from: z.number().finite().optional(),
    axes: z.array(MoodAxisSchema).optional(),
  }),
])

/**
 * §8/#29. The bounds, carried through to the renderer with the range's own claim already
 * resolved against the recipe's (§3.1) — `verified` here is never `undefined`, because
 * inheritance is settled once, in the resolver, and never re-read downstream.
 *
 * The guide prints the range beside the value (`DECAY 38 (0–100)`) because the range is what
 * disambiguates at the machine: 35% of authored numerics carry no unit and the unit spellings
 * drift between devices, so a bare `38` gives a reader standing at the box nothing to check the
 * screen against, while `0–100` against a display reading milliseconds is an obvious mismatch.
 *
 * `step` is deliberately not carried: it is arithmetic the resolver has already performed, and
 * a reader turning a knob does not need to be told the knob's granularity.
 */
export type ResolvedRange = { min: number; max: number; verified: Verified }

export const ResolvedRangeSchema = z.strictObject({
  min: z.number().finite(),
  max: z.number().finite(),
  verified: VerifiedSchema,
})

/**
 * `provenance` is required, not optional — this is the invariant-4 repair. It is a type error
 * to render a value whose provenance nobody decided.
 *
 * `range` is present exactly when `value` is a number: only numerics have one, and an enum's
 * legality gate is its `options` rather than a range (§3.2). It is optional on the type rather
 * than split into two resolved shapes, because every consumer downstream treats params as one
 * ordered list and a discriminated union would buy exhaustiveness nobody needs at the cost of a
 * narrowing at every rendering site.
 */
export type ResolvedParam = {
  name: string
  value: number | string
  unit?: string
  /** Numerics only, with the range's inherited citation already resolved. */
  range?: ResolvedRange
  provenance: Provenance
  hint?: string
  note?: string
}

export const ResolvedParamSchema = z.strictObject({
  name: z.string().min(1),
  value: z.union([z.number().finite(), z.string()]),
  unit: z.string().min(1).optional(),
  range: ResolvedRangeSchema.optional(),
  provenance: ProvenanceSchema,
  hint: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
})
