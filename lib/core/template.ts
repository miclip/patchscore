import { z } from 'zod'
import type { HookId, PatternId, RequestId, SectionName, TemplateId } from './ids'
import {
  CharacterSchema,
  PatternSlotSchema,
  RoleSchema,
  type Character,
  type PatternSlot,
  type Role,
} from './vocabulary'

/**
 * §4. Genre definitions. Device-agnostic: templates emit role requests, structure, patterns
 * and harmony, and nothing else. A template never references a device id (invariant 3).
 */

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export type Section = { name: SectionName; bars: number; energy: number }

export const SectionSchema = z.strictObject({
  name: z.string().min(1),
  bars: z.int().min(1),
  energy: z.number().min(0).max(1),
})

// ---------------------------------------------------------------------------
// §4 Role requests
// ---------------------------------------------------------------------------

/**
 * §4.2. Continuous requests occupy every section; transient requests occupy only their listed
 * ones. `riser`, `impact` and `sweep` are the transitional roles this exists for.
 */
export const SUSTAINS = ['continuous', 'transient'] as const
export type Sustain = (typeof SUSTAINS)[number]
export const SustainSchema = z.enum(SUSTAINS)

/**
 * Every request carries a stable `id`. Occupancy (§4.2) and the rendered guide both key on it,
 * because a template may legitimately request the same role twice - so `role` is not identity.
 */
export type RoleRequest = {
  id: RequestId
  role: Role
  /** §4.4. Ascending: 1 is most important. */
  priority: number
  character: Character
  sustain: Sustain
  /** Required for `transient`, forbidden for `continuous` (§4.2). */
  sections?: SectionName[]
  /** §4.4. Removed from the miss objective entirely: filled if it fits, dropped if not. */
  optional?: boolean
  /**
   * §12.4. A *minimum note count*, matched against the assignable's `polyphony`. A number, not
   * a device name, so it does not breach invariant 3.
   */
  polyphony?: number
  /**
   * §12.6. Requests sharing a role and carrying `distinct: true` may not be assigned to the
   * same `deviceId`. Surplus requests become ordinary gaps rather than silently collapsing.
   */
  distinct?: boolean
}

export const RoleRequestSchema = z
  .strictObject({
    id: z.string().min(1),
    role: RoleSchema,
    priority: z.int().min(1),
    character: CharacterSchema,
    sustain: SustainSchema,
    sections: z.array(z.string().min(1)).min(1).optional(),
    optional: z.boolean().optional(),
    polyphony: z.int().min(1).optional(),
    distinct: z.boolean().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.sustain === 'transient' && r.sections === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'a transient request must list the sections it occupies (§4.2)',
        path: ['sections'],
      })
    }
  })

// ---------------------------------------------------------------------------
// §4.3 Step patterns
// ---------------------------------------------------------------------------

/** §4.3/§6.3. Four density bands, fixed. Density selects a variant; it never mutates hits. */
export const DENSITY_BANDS = [0, 1, 2, 3] as const
export type DensityBand = (typeof DENSITY_BANDS)[number]
export const DensityBandSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

export const PATTERN_LENGTHS = [16, 32, 64] as const
export type PatternLength = (typeof PATTERN_LENGTHS)[number]
export const PatternLengthSchema = z.union([z.literal(16), z.literal(32), z.literal(64)])

/** Steps are 1-based, so a 16-step pattern has hits in 1..16. */
export type PatternHit = { step: number; slot: PatternSlot; velocity?: number }

export const PatternHitSchema = z.strictObject({
  step: z.int().min(1),
  slot: PatternSlotSchema,
  velocity: z.int().optional(),
})

/**
 * §4.3/§12.5. Flat: one variant per request per section, no bar offset and no within-section
 * variant sequence. Fills are out of v1.
 */
export type Pattern = {
  id: PatternId
  /** Matched against the request's role. */
  forRole: Role
  band: DensityBand
  /** Omitted means eligible in every section. */
  sections?: SectionName[]
  length: PatternLength
  hits: PatternHit[]
}

export const PatternSchema = z
  .strictObject({
    id: z.string().min(1),
    forRole: RoleSchema,
    band: DensityBandSchema,
    sections: z.array(z.string().min(1)).min(1).optional(),
    length: PatternLengthSchema,
    hits: z.array(PatternHitSchema),
  })
  .superRefine((p, ctx) => {
    p.hits.forEach((hit, i) => {
      if (hit.step > p.length) {
        ctx.addIssue({
          code: 'custom',
          message: `step ${hit.step} is outside a ${p.length}-step pattern`,
          path: ['hits', i, 'step'],
        })
      }
    })
  })

// ---------------------------------------------------------------------------
// §4.1 Harmony and hooks
// ---------------------------------------------------------------------------

/**
 * A roman-numeral degree ('i', 'VI', 'VII'), resolved against the chosen key at §11 step 5.5.
 * Left open: DESIGN.md gives examples but never fixes the vocabulary, and a closed union
 * guessed here would reject legal authoring (sevenths, inversions, sharp-side borrowings).
 * Template-internal either way - it never crosses to a device (invariant 3).
 */
export type ChordDegree = string
export const ChordDegreeSchema = z.string().min(1)

export type ProgressionStep = { degree: ChordDegree; bars: number }

export const ProgressionStepSchema = z.strictObject({
  degree: ChordDegreeSchema,
  bars: z.int().min(1),
})

export type Harmony = { cycleBars: number; progression: ProgressionStep[] }

export const HarmonySchema = z.strictObject({
  cycleBars: z.int().min(1),
  progression: z.array(ProgressionStepSchema),
})

/** A scale degree within the key, plus an octave offset. Steps are 1-based. */
export type HookNote = { step: number; degree: number; octave: number; len: number }

export const HookNoteSchema = z.strictObject({
  step: z.int().min(1),
  degree: z.int(),
  octave: z.int(),
  len: z.int().min(1),
})

/**
 * §4.1. Authored, never generated. If no hook is authored for the assigned role, the guide
 * omits the hook section rather than inventing one (invariant 5 applied to melody).
 */
export type Hook = { id: HookId; forRole: Role; bars: number; notes: HookNote[] }

export const HookSchema = z.strictObject({
  id: z.string().min(1),
  forRole: RoleSchema,
  bars: z.int().min(1),
  notes: z.array(HookNoteSchema),
})

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export type BpmSpec = { min: number; max: number; default: number }

export const BpmSpecSchema = z
  .strictObject({
    min: z.number().finite().positive(),
    max: z.number().finite().positive(),
    default: z.number().finite().positive(),
  })
  .refine((b) => b.min <= b.max, { message: 'bpm.min must not exceed bpm.max', path: ['min'] })
  .refine((b) => b.default >= b.min && b.default <= b.max, {
    message: 'bpm.default must sit inside [min, max]',
    path: ['default'],
  })

/** e.g. 'F minor', 'A# major'. Parsed into a tonic and a mode at §11 step 5.5. */
export const MusicalKeySchema = z.string().min(1)

export type Template = {
  id: TemplateId
  name: string
  bpm: BpmSpec
  keys: string[]
  structure: Section[]
  harmony: Harmony
  hooks: Hook[]
  roles: RoleRequest[]
  patterns: Pattern[]
}

export const TemplateSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    bpm: BpmSpecSchema,
    keys: z.array(MusicalKeySchema),
    structure: z.array(SectionSchema),
    harmony: HarmonySchema,
    hooks: z.array(HookSchema),
    roles: z.array(RoleRequestSchema),
    patterns: z.array(PatternSchema),
  })
  .superRefine((t, ctx) => {
    const sectionNames = t.structure.map((s) => s.name)
    if (new Set(sectionNames).size !== sectionNames.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'section names must be unique - Occupancy keys on them (§4.2)',
        path: ['structure'],
      })
    }
    const known = new Set(sectionNames)

    const requestIds = t.roles.map((r) => r.id)
    if (new Set(requestIds).size !== requestIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'request ids must be unique - Occupancy stores them (§4.2)',
        path: ['roles'],
      })
    }

    const hookIds = t.hooks.map((h) => h.id)
    if (new Set(hookIds).size !== hookIds.length) {
      ctx.addIssue({ code: 'custom', message: 'hook ids must be unique', path: ['hooks'] })
    }

    const patternIds = t.patterns.map((p) => p.id)
    if (new Set(patternIds).size !== patternIds.length) {
      ctx.addIssue({ code: 'custom', message: 'pattern ids must be unique', path: ['patterns'] })
    }


    t.roles.forEach((request, i) => {
      request.sections?.forEach((section, j) => {
        if (!known.has(section)) {
          ctx.addIssue({
            code: 'custom',
            message: `request names section '${section}', which is not in structure`,
            path: ['roles', i, 'sections', j],
          })
        }
      })
    })

    t.patterns.forEach((pattern, i) => {
      pattern.sections?.forEach((section, j) => {
        if (!known.has(section)) {
          ctx.addIssue({
            code: 'custom',
            message: `pattern names section '${section}', which is not in structure`,
            path: ['patterns', i, 'sections', j],
          })
        }
      })
    })
    // Deliberately not checked: several variants may be eligible for the same
    // (role, band, section). §4.1 says the seed picks among multiple authored hooks, and §6.3
    // never says a band holds exactly one variant, so rejecting that would forbid legal data.
  })
