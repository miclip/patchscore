import { describe, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  AuthoredParamSchema,
  CiteSchema,
  DeviceSchema,
  HarmonySchema,
  HookSchema,
  NumericRangeSchema,
  PanelFeatureSchema,
  PanelLayoutSchema,
  PatternSchema,
  PhysicalSpecSchema,
  ProvenanceSchema,
  RecipeSchema,
  ResolvedParamSchema,
  RoleRequestSchema,
  TemplateSchema,
  VerifiedSchema,
  VoiceSpecSchema,
  type AuthoredParam,
  type Cite,
  type Device,
  type Harmony,
  type Hook,
  type NumericRange,
  type PanelFeature,
  type PanelLayout,
  type Pattern,
  type PhysicalSpec,
  type Provenance,
  type Recipe,
  type ResolvedParam,
  type RoleRequest,
  type Template,
  type Verified,
  type VoiceSpec,
} from '../lib/core/index'

/**
 * The hand-written types are the contract people read; the schemas are what runs at the
 * boundary. These assertions are the only thing stopping the two drifting apart, so each pair
 * is checked in both directions - a field missing from either side fails to compile.
 */
describe('schemas and types stay in step', () => {
  it('binds every authored shape to its schema', () => {
    expectTypeOf<Cite>().toExtend<z.infer<typeof CiteSchema>>()
    expectTypeOf<z.infer<typeof CiteSchema>>().toExtend<Cite>()

    expectTypeOf<Verified>().toExtend<z.infer<typeof VerifiedSchema>>()
    expectTypeOf<z.infer<typeof VerifiedSchema>>().toExtend<Verified>()

    expectTypeOf<NumericRange>().toExtend<z.infer<typeof NumericRangeSchema>>()
    expectTypeOf<z.infer<typeof NumericRangeSchema>>().toExtend<NumericRange>()

    expectTypeOf<AuthoredParam>().toExtend<z.infer<typeof AuthoredParamSchema>>()
    expectTypeOf<z.infer<typeof AuthoredParamSchema>>().toExtend<AuthoredParam>()

    expectTypeOf<VoiceSpec>().toExtend<z.infer<typeof VoiceSpecSchema>>()
    expectTypeOf<z.infer<typeof VoiceSpecSchema>>().toExtend<VoiceSpec>()

    expectTypeOf<PhysicalSpec>().toExtend<z.infer<typeof PhysicalSpecSchema>>()
    expectTypeOf<z.infer<typeof PhysicalSpecSchema>>().toExtend<PhysicalSpec>()

    expectTypeOf<PanelFeature>().toExtend<z.infer<typeof PanelFeatureSchema>>()
    expectTypeOf<z.infer<typeof PanelFeatureSchema>>().toExtend<PanelFeature>()

    expectTypeOf<PanelLayout>().toExtend<z.infer<typeof PanelLayoutSchema>>()
    expectTypeOf<z.infer<typeof PanelLayoutSchema>>().toExtend<PanelLayout>()

    expectTypeOf<Recipe>().toExtend<z.infer<typeof RecipeSchema>>()
    expectTypeOf<z.infer<typeof RecipeSchema>>().toExtend<Recipe>()

    expectTypeOf<Device>().toExtend<z.infer<typeof DeviceSchema>>()
    expectTypeOf<z.infer<typeof DeviceSchema>>().toExtend<Device>()

    expectTypeOf<RoleRequest>().toExtend<z.infer<typeof RoleRequestSchema>>()
    expectTypeOf<z.infer<typeof RoleRequestSchema>>().toExtend<RoleRequest>()

    expectTypeOf<Pattern>().toExtend<z.infer<typeof PatternSchema>>()
    expectTypeOf<z.infer<typeof PatternSchema>>().toExtend<Pattern>()

    expectTypeOf<Harmony>().toExtend<z.infer<typeof HarmonySchema>>()
    expectTypeOf<z.infer<typeof HarmonySchema>>().toExtend<Harmony>()

    expectTypeOf<Hook>().toExtend<z.infer<typeof HookSchema>>()
    expectTypeOf<z.infer<typeof HookSchema>>().toExtend<Hook>()

    expectTypeOf<Template>().toExtend<z.infer<typeof TemplateSchema>>()
    expectTypeOf<z.infer<typeof TemplateSchema>>().toExtend<Template>()

  })

  it('binds the resolved shapes too, so persisted guides parse back (§8.2)', () => {
    expectTypeOf<Provenance>().toExtend<z.infer<typeof ProvenanceSchema>>()
    expectTypeOf<z.infer<typeof ProvenanceSchema>>().toExtend<Provenance>()

    expectTypeOf<ResolvedParam>().toExtend<z.infer<typeof ResolvedParamSchema>>()
    expectTypeOf<z.infer<typeof ResolvedParamSchema>>().toExtend<ResolvedParam>()
  })

  it('keeps provenance non-optional on a resolved param (invariant 4)', () => {
    // The compiler, not a convention, is what enforces "every rendered value carries
    // provenance". `Omit` + reassignment would compile if the field were optional.
    expectTypeOf<ResolvedParam>().toHaveProperty('provenance').not.toBeNullable()
    expectTypeOf<Omit<ResolvedParam, 'provenance'>>().not.toExtend<ResolvedParam>()
  })

  it('keeps authored and resolved params disjoint (§3.1)', () => {
    // Nothing in a device folder can construct a ResolvedParam, and nothing downstream of the
    // resolver sees an AuthoredParam.
    expectTypeOf<AuthoredParam>().not.toExtend<ResolvedParam>()
    expectTypeOf<ResolvedParam>().not.toExtend<AuthoredParam>()
  })
})
