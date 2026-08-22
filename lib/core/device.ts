import { z } from 'zod'
import type { DeviceId, PoolId, RecipeId, VoiceId } from './ids'
import {
  CharacterSchema,
  PatternSlotSchema,
  RoleSchema,
  type Character,
  type PatternSlot,
  type Role,
} from './vocabulary'
import {
  AuthoredParamSchema,
  VerifiedSchema,
  type AuthoredParam,
  type Verified,
} from './params'

/**
 * §2. One self-contained module per device. Devices know their own capabilities and their own
 * recipes; they know nothing about genres, templates, or other devices.
 */

// ---------------------------------------------------------------------------
// §2.1 Two authored shapes
// ---------------------------------------------------------------------------

/**
 * Some devices have fixed, named voices (TR-1000: BD, SD, LT...). Others have fungible
 * capacity (Tracker Mini: 16 tracks, as *two* pools — 1-8 take samples, synths or MIDI, 9-16
 * take synths or MIDI only). Modelling only the first does not survive contact with the second,
 * and a device declaring more than one pool needs nothing further: a pool is a voice like any
 * other.
 *
 * `polyphony` means *notes*, never roles (§12.4): how many simultaneous notes one assignable
 * can sound while serving one role.
 */
export type VoiceSpec =
  | { kind: 'fixed'; id: VoiceId; label: string; roles: Role[]; polyphony: number }
  | { kind: 'pool'; id: PoolId; label: string; count: number; roles: Role[]; polyphony: number }

const voiceCommon = {
  id: z.string().min(1),
  label: z.string().min(1),
  roles: z.array(RoleSchema).min(1),
  polyphony: z.int().min(1),
}

export const VoiceSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('fixed'), ...voiceCommon }),
  z.strictObject({ kind: z.literal('pool'), count: z.int().min(1), ...voiceCommon }),
])

// ---------------------------------------------------------------------------
// §2.2 One resolved shape
// ---------------------------------------------------------------------------

/**
 * What the registry flattens both authored shapes into, before the resolver ever runs.
 *
 * `Assignable` is a pure function of device data (§4.2): it is identical for every guide ever
 * resolved, carries no per-guide state, and is therefore safe to expand once and cache.
 * Occupancy lives in `Occupancy`, not here.
 */
export type Assignable = {
  deviceId: DeviceId
  /** 'bd' or 'track-3' - pool ordinal already folded in. */
  voiceId: VoiceId
  /** undefined or 'track'. Recipe lookup keys on `poolId ?? voiceId`. */
  poolId?: PoolId
  /** 'BD' or 'Track 3' */
  label: string
  /** 1..count, for pool members. */
  ordinal?: number
  roles: Role[]
  polyphony: number
}

// ---------------------------------------------------------------------------
// §3 Recipes
// ---------------------------------------------------------------------------

/** §3.3. A patchable device's recipe is a patch list plus knob positions. */
export type PatchEntry = { from: string; to: string; note?: string }

export const PatchEntrySchema = z.strictObject({
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string().min(1).optional(),
})

/**
 * §3/§4.3. What this device does to the steps it is handed, addressed by slot rather than by
 * absolute index. Every key in `set` must appear in the device's `features.perStep`; that is
 * checked at device level, where `perStep` is in scope.
 */
export type ArticulationEntry = {
  slot: PatternSlot
  set: Record<string, number | string | boolean>
  /** A key into the device's `hints` table. */
  hint?: string
}

export const ArticulationEntrySchema = z.strictObject({
  slot: PatternSlotSchema,
  set: z.record(z.string().min(1), z.union([z.number().finite(), z.string(), z.boolean()])),
  hint: z.string().min(1).optional(),
})

/**
 * `verified` here is a *default citation* only. It is inherited by any param, patch entry or
 * articulation entry that does not carry its own (§3.1). It is not itself a provenance state.
 */
export type Recipe = {
  id: RecipeId
  role: Role
  character: Character
  /** Matches `poolId ?? voiceId` (§2.2). */
  voice: string
  title: string
  params: AuthoredParam[]
  patch?: PatchEntry[]
  articulation?: ArticulationEntry[]
  routing?: string
  verified?: Verified
}

export const RecipeSchema = z
  .strictObject({
    id: z.string().min(1),
    role: RoleSchema,
    character: CharacterSchema,
    voice: z.string().min(1),
    title: z.string().min(1),
    params: z.array(AuthoredParamSchema),
    patch: z.array(PatchEntrySchema).min(1).optional(),
    articulation: z.array(ArticulationEntrySchema).min(1).optional(),
    routing: z.string().min(1).optional(),
    verified: VerifiedSchema.optional(),
  })

// ---------------------------------------------------------------------------
// §2.3 Device manifest
// ---------------------------------------------------------------------------

export const DEVICE_KINDS = [
  'drum-machine',
  'groovebox',
  'sampler',
  'synth',
  'semi-modular',
  'mixer-recorder',
  'fx-processor',
] as const

export type DeviceKind = (typeof DEVICE_KINDS)[number]
export const DeviceKindSchema = z.enum(DEVICE_KINDS)

/**
 * How a device passes clock and transport ('midi-din', 'usb', an analog clock jack). Left
 * open: DESIGN.md gives an example list but never freezes the vocabulary, and a closed union
 * guessed here would reject a legal manifest for a box with a transport nobody anticipated.
 */
export type ClockTransport = string
export const ClockTransportSchema = z.string().min(1)

export type ClockSpec = { canSendClock: boolean; canReceiveClock: boolean; transport: ClockTransport[] }

export const ClockSpecSchema = z.strictObject({
  canSendClock: z.boolean(),
  canReceiveClock: z.boolean(),
  transport: z.array(ClockTransportSchema).min(1),
})

export type IoSpec = {
  main: 'mono' | 'stereo'
  individualOuts: number
  audioIn: boolean
  usbAudio: boolean
}

export const IoSpecSchema = z.strictObject({
  main: z.enum(['mono', 'stereo']),
  individualOuts: z.int().min(0),
  audioIn: z.boolean(),
  usbAudio: z.boolean(),
})

export type SidechainSpec = { internal: boolean; fromExternalAudio: boolean }
export type LfoSpec = { count: number; syncable: boolean; destinations: string[] }

/**
 * `perStep` is an open list of this device's own per-step feature names, not a shared closed
 * vocabulary: it is only ever compared against this device's own articulation keys.
 */
export type DeviceFeatures = {
  perStep?: string[]
  sidechain?: SidechainSpec
  lfo?: LfoSpec
}

export const DeviceFeaturesSchema = z.strictObject({
  perStep: z.array(z.string().min(1)).optional(),
  sidechain: z.strictObject({ internal: z.boolean(), fromExternalAudio: z.boolean() }).optional(),
  lfo: z
    .strictObject({
      count: z.int().min(0),
      syncable: z.boolean(),
      destinations: z.array(z.string().min(1)),
    })
    .optional(),
})

export type ManualRef = { title: string; edition?: string }

export const ManualRefSchema = z.strictObject({
  title: z.string().min(1),
  edition: z.string().min(1).optional(),
})

/**
 * §2.4: a device with no voices (a mixer-recorder, an fx-processor) contributes no assignables
 * and still appears in rig integration. `voices` and `recipes` may therefore both be empty.
 */
export type Device = {
  id: DeviceId
  name: string
  maker: string
  kind: DeviceKind
  clock: ClockSpec
  io: IoSpec
  voices: VoiceSpec[]
  /**
   * How many *occupied assignables* this device is comfortable carrying (§12.4).
   * Omitted means it defaults to the assignable count.
   */
  comfortableVoices?: number
  features?: DeviceFeatures
  /** A flat lookup keyed by action, referenced by recipes. A few words to jog you. */
  hints?: Record<string, string>
  manual?: ManualRef
  recipes: Recipe[]
}

export const DeviceSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    maker: z.string().min(1),
    kind: DeviceKindSchema,
    clock: ClockSpecSchema,
    io: IoSpecSchema,
    voices: z.array(VoiceSpecSchema),
    comfortableVoices: z.int().min(1).optional(),
    features: DeviceFeaturesSchema.optional(),
    hints: z.record(z.string().min(1), z.string().min(1)).optional(),
    manual: ManualRefSchema.optional(),
    recipes: z.array(RecipeSchema),
  })
  .superRefine((device, ctx) => {
    const voiceIds = device.voices.map((v) => v.id)
    if (new Set(voiceIds).size !== voiceIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'voice ids must be unique within a device',
        path: ['voices'],
      })
    }

    const recipeIds = device.recipes.map((r) => r.id)
    if (new Set(recipeIds).size !== recipeIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'recipe ids must be unique within a device',
        path: ['recipes'],
      })
    }

    // §3's authoring rule: one recipe per (role, character, voice). Uniqueness must match the
    // lookup key (`poolId ?? voiceId`, §2.2), and the older device-wide key did not: it rejected
    // two toms of one flavour on a drum machine, and every tonal recipe a two-pool device needs
    // on both of its pools.
    const slots = device.recipes.map((r) => `${r.role}\u0000${r.character}\u0000${r.voice}`)
    if (new Set(slots).size !== slots.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'at most one recipe per (role, character, voice) in a device (§3)',
        path: ['recipes'],
      })
    }

    const perStep = new Set(device.features?.perStep ?? [])
    const hintKeys = new Set(Object.keys(device.hints ?? {}))

    device.recipes.forEach((recipe, i) => {
      // A recipe must address a voice this device actually has (§2.2: `poolId ?? voiceId`).
      if (!voiceIds.includes(recipe.voice)) {
        ctx.addIssue({
          code: 'custom',
          message: `recipe addresses voice '${recipe.voice}', which this device does not declare`,
          path: ['recipes', i, 'voice'],
        })
      }

      recipe.articulation?.forEach((entry, j) => {
        // §3: an articulation the box physically cannot do fails the build, not a request.
        for (const key of Object.keys(entry.set)) {
          if (!perStep.has(key)) {
            ctx.addIssue({
              code: 'custom',
              message: `articulation sets '${key}', which is not in features.perStep`,
              path: ['recipes', i, 'articulation', j, 'set', key],
            })
          }
        }
        if (entry.hint !== undefined && !hintKeys.has(entry.hint)) {
          ctx.addIssue({
            code: 'custom',
            message: `articulation references hint '${entry.hint}', which this device does not author`,
            path: ['recipes', i, 'articulation', j, 'hint'],
          })
        }
      })
    })
  })
