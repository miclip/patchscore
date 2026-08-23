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
 * §12.4. How a recipe turns the notes a request asks for into sound.
 *
 * The request says *how many notes* the part needs; the recipe says *how this box makes them*,
 * and the two are not the same claim. A triad pad can be a real three-note voice or a chord
 * baked into one sample, and a sampler that plays the second is not thereby polyphonic —
 * `polyphony` on the assignable still means simultaneous notes (§2.2, §12.4) and is not bent
 * to accommodate it.
 *
 *  - `polyphonic-voice` — the voice sounds every note itself, so it needs polyphony of *at
 *    least* the note count. The default: a recipe that says nothing claims nothing special.
 *  - `sampled-chord` — the notes are already inside one sample (or one wavetable, one preset
 *    stab), so polyphony 1 suffices however many notes are heard.
 *
 * It is a property of the *recipe*, not of the device and not of the template: the same
 * assignable can hold a real polyphonic patch under one recipe and a chord sample under
 * another, and only the recipe knows which.
 */
export const REALISATIONS = ['polyphonic-voice', 'sampled-chord'] as const

export type Realisation = (typeof REALISATIONS)[number]
export const RealisationSchema = z.enum(REALISATIONS)

/** A recipe that says nothing sounds its notes itself. Silence is not a claim of cleverness. */
export function realisationOf(recipe: Recipe): Realisation {
  return recipe.realisation ?? 'polyphonic-voice'
}

/**
 * The **floor** on one assignable's polyphony for this recipe to deliver `notes` simultaneous
 * notes — callers compare with `<=`, so more polyphony than this is always fine and a three-note
 * part is served perfectly well by an eight-voice track. This is capacity *within* a single
 * voice, never a count of voices: a request is served by exactly one assignable (§12.4), and
 * nothing here spreads it over several.
 *
 * A sampled chord is one note as far as the voice is concerned, whatever is heard; anything else
 * needs the whole count.
 */
export function requiredVoicePolyphony(recipe: Recipe, notes: number): number {
  return realisationOf(recipe) === 'sampled-chord' ? 1 : notes
}

/**
 * §7.1 ranks a `polyphonic-voice` recipe ahead of a `sampled-chord` one when both can carry a
 * part of more than one note, and ranks it ahead of character fidelity. A chord sample does
 * transpose, so it follows a progression; what it cannot do is change shape — no re-voicing, no
 * inversion, no quality it was not recorded with (§4.1). That is still a limit on what the part
 * can *do*, where a substituted character only approximates how it sounds.
 */
export function realisationRank(recipe: Recipe): number {
  return realisationOf(recipe) === 'polyphonic-voice' ? 0 : 1
}

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
  /** §12.4. How the notes are made. Omitted means `polyphonic-voice`. */
  realisation?: Realisation
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
    realisation: RealisationSchema.optional(),
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

    // §3's authoring rule: one recipe per (role, character, voice, realisation). Uniqueness must
    // match the lookup key (`poolId ?? voiceId`, §2.2), and the original device-wide key did not:
    // it rejected two toms of one flavour on a drum machine, and every tonal recipe a two-pool
    // device needs on both of its pools.
    //
    // `realisation` joined the key (§12.4) because two recipes can describe the *same* sound on
    // the same voice and still be different jobs: a triad played on a polyphonic voice and the
    // same triad loaded as one sample are not variants of each other, and forbidding the pair
    // forced a device to pretend one of them did not exist. The pair is unambiguous where the
    // older key was not — at a given note count and voice polyphony either only one of them is
    // usable at all, or §7.1's realisation ranking decides between them on a stated principle
    // rather than on which id sorts first. Two recipes agreeing on all four keys remain a
    // genuine duplicate and are still refused.
    const slots = device.recipes.map(
      (r) => `${r.role}\u0000${r.character}\u0000${r.voice}\u0000${realisationOf(r)}`,
    )
    if (new Set(slots).size !== slots.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'at most one recipe per (role, character, voice, realisation) in a device (§3)',
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
