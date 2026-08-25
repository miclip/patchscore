import { describe, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'
import {
  ArticulationEntrySchema,
  AuthoredParamSchema,
  CiteSchema,
  DeviceSchema,
  HarmonySchema,
  HookSchema,
  JackSignalKindSchema,
  JackSpecSchema,
  NumericRangeSchema,
  PanelFeatureSchema,
  PanelLayoutSchema,
  PatchEntrySchema,
  PatternSchema,
  PhysicalSpecSchema,
  ProvenanceSchema,
  RecipeSchema,
  ResolvedParamSchema,
  RoleRequestSchema,
  TemplateSchema,
  VerifiedSchema,
  VoiceSpecSchema,
  type ArticulationEntry,
  type AuthoredParam,
  type Cite,
  type Device,
  type Harmony,
  type Hook,
  type JackSignalKind,
  type JackSpec,
  type NumericRange,
  type PanelFeature,
  type PanelLayout,
  type PatchEntry,
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

    // The two entry shapes are bound explicitly rather than only through `Recipe`. Both gained
    // `verified` in #49 and both had gone years without it while §3 claimed otherwise; a nested
    // binding would have compiled just as happily with the field missing from one side.
    expectTypeOf<PatchEntry>().toExtend<z.infer<typeof PatchEntrySchema>>()
    expectTypeOf<z.infer<typeof PatchEntrySchema>>().toExtend<PatchEntry>()

    expectTypeOf<ArticulationEntry>().toExtend<z.infer<typeof ArticulationEntrySchema>>()
    expectTypeOf<z.infer<typeof ArticulationEntrySchema>>().toExtend<ArticulationEntry>()

    // §3.3. `JackSignalKind` spells its members twice — once as a union the code reads, once as a
    // `z.enum` the boundary runs — and a member added to one and not the other is the exact drift
    // this file exists to catch. No count here on purpose: the binding holds however many members
    // there are, and a number in a comment beside it is one more thing to forget to update. `JackSpec` is bound beside it for the reason `PatchEntry`
    // is: it gained a required field, and a nested binding through `Device` would compile just as
    // happily with that field missing from one side.
    expectTypeOf<JackSignalKind>().toExtend<z.infer<typeof JackSignalKindSchema>>()
    expectTypeOf<z.infer<typeof JackSignalKindSchema>>().toExtend<JackSignalKind>()

    expectTypeOf<JackSpec>().toExtend<z.infer<typeof JackSpecSchema>>()
    expectTypeOf<z.infer<typeof JackSpecSchema>>().toExtend<JackSpec>()

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
