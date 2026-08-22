import { z } from 'zod'
import { MoodAxisSchema, type MoodAxis } from './vocabulary'

/**
 * §3.1. Parameters are a discriminated union, and authored params are not rendered params.
 *
 * Two separate claims live here and must not be collapsed:
 *  - `verified` on a *point value* decides `authored` vs `provisional` (the authority gate)
 *  - `verified` on a *range* decides whether mood may move the point at all (the legality gate)
 */

/** A citation, e.g. 'TR-1000 manual p.42'. */
export type Cite = { source: string }

/** `false` = authored, nothing checked against. */
export type Verified = Cite | false

export const CiteSchema = z.strictObject({
  source: z.string().min(1, 'a citation needs a source'),
})

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
  options: string[]
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
    options: z.array(z.string().min(1)).min(1),
    ...paramCommon,
  })
  .refine((p) => p.options.includes(p.value), {
    message: 'value must be one of options',
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

/** §3.2. Three-state, and always rendered. `provisional` dominates `derived`. */
export type Provenance =
  | { state: 'authored'; source: string }
  | {
      state: 'derived'
      source: string
      rangeSource: string
      /** 52 → 45, and which knobs did it. */
      from: number
      axes: MoodAxis[]
    }
  | { state: 'provisional'; from?: number; axes?: MoodAxis[] }

export const ProvenanceSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('authored'), source: z.string().min(1) }),
  z.strictObject({
    state: z.literal('derived'),
    source: z.string().min(1),
    rangeSource: z.string().min(1),
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
 * `provenance` is required, not optional — this is the invariant-4 repair. It is a type error
 * to render a value whose provenance nobody decided.
 */
export type ResolvedParam = {
  name: string
  value: number | string
  unit?: string
  provenance: Provenance
  hint?: string
  note?: string
}

export const ResolvedParamSchema = z.strictObject({
  name: z.string().min(1),
  value: z.union([z.number().finite(), z.string()]),
  unit: z.string().min(1).optional(),
  provenance: ProvenanceSchema,
  hint: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
})
