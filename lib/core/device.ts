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

/**
 * §3.3. A patch point on the panel, declared **once by the device** and referenced by name from
 * every recipe that uses it.
 *
 * ## Why this is device data and not part of the cable
 *
 * A cable carries three separate claims, and the project has now walked into this same shape
 * three times:
 *
 *     the `from` jack exists      documented — p.27
 *     the `to` jack exists        documented — p.68
 *     connecting them is right    taste
 *
 * That is exactly a numeric param (`range` cited, point taste, §3.1) and exactly the enum repair
 * from step 4 (`options` cited, selection taste, §3.2). Three unrelated device kinds pushing on
 * one assumption means the assumption is wrong, not the devices.
 *
 * The fix is *not* three `verified` fields on `PatchEntry`. That would copy one jack's citation
 * onto every cable that touches it — twenty-seven cables restating the same handful of pages —
 * and make each cable responsible for facts that belong to the box. **A jack exists or it does
 * not; that is device-level, and it is documented on one page.** So the device declares its
 * jacks, cited once each, and a `PatchEntry` names two of them.
 *
 * This is the pattern the codebase already had: an articulation's `set` keys must appear in the
 * device's `features.perStep`, checked by Zod at device level, because the capability belongs to
 * the device and the recipe only references it. Jacks are the same kind of thing.
 *
 * `id` is **section-qualified**, exactly as the panel prints it — `VCO A · FM 1`, not `FM 1`.
 * Panels reuse jack names freely: `IN` appears in five sections of a Cascadia, and `PITCH`,
 * `SYNC`, `LEVEL`, `TRIG` and `FM 1` all repeat. A bare name is unresolvable at the machine.
 *
 * **A position would hang here**, and that is the point of listing them: §10's rack draws
 * inter-device cables but cannot draw a cable between two jacks on one panel, because
 * `PanelFeature` has no jack and there are no coordinates to draw between. Nothing here carries
 * a position yet and this is deliberately not the change that adds one — but the list is the
 * foundation that change would extend, rather than something it would have to invent first.
 */
export type JackSpec = {
  /** Section-qualified, as the panel prints it: 'VCO A · FM 1'. */
  id: string
  /** A cable leaves an `out` and arrives at an `in`. Checked, per patch entry. */
  direction: 'in' | 'out'
  /** The page that documents this jack. Cited once, here, however many cables touch it. */
  verified: Verified
  /** Anything a name alone would mislead a reader about. */
  note?: string
}

export const JackSpecSchema = z.strictObject({
  id: z.string().min(1),
  direction: z.enum(['in', 'out']),
  verified: VerifiedSchema,
  note: z.string().min(1).optional(),
})

/**
 * §3.3. A patchable device's recipe is a patch list plus knob positions.
 *
 * `from` and `to` name jacks the device declares in `jacks` — Zod refuses a patch entry naming
 * one it does not, the same way it refuses an articulation key absent from `features.perStep`,
 * and refuses a cable that leaves an input or arrives at an output.
 *
 * **`verified` here claims exactly one thing: that *this connection* is the right choice.** Not
 * that the jacks exist — their own declarations say that, once each. So a cable somebody patched
 * because it sounded good is `false` and renders provisional, which is the honest answer and the
 * one the shape could not express before; a cable the manual itself instructs ("Patch the ENV B
 * output jack to the S&H section's TRIG input jack", p.14) carries that page.
 *
 * Inheritance is §3.1's, unchanged: omitted inherits the recipe's, a citation overrides it, an
 * explicit `false` overrides an inherited citation.
 */
export type PatchEntry = { from: string; to: string; note?: string; verified?: Verified }

export const PatchEntrySchema = z.strictObject({
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string().min(1).optional(),
  verified: VerifiedSchema.optional(),
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
  /**
   * §3.1's inheritance, per entry, exactly as on `PatchEntry` and `AuthoredParam`: omitted
   * inherits the recipe's, a citation overrides it, an explicit `false` overrides an inherited
   * citation.
   *
   * It is here for the same reason and in the same pass as the patch one. The two entry kinds
   * had the identical defect and only one of them was found by a device — but §3 names all
   * three shapes in one sentence, and a design sentence that is true of one of the three things
   * it names is worse than one that is true of none, because it reads as authoritative. The
   * concrete case is the same shape too: a per-step capability documented on the page that
   * describes that gesture, sitting in a recipe whose parameters came off a different page.
   */
  verified?: Verified
}

export const ArticulationEntrySchema = z.strictObject({
  slot: PatternSlotSchema,
  set: z.record(z.string().min(1), z.union([z.number().finite(), z.string(), z.boolean()])),
  hint: z.string().min(1).optional(),
  verified: VerifiedSchema.optional(),
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
 * articulation entry that does not carry its own (§3.1) — all three of those now genuinely
 * carry one, which they did not until #49. It is not itself a provenance state.
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

/**
 * §7.4. `preferredSource` is the one *topology judgement* a manifest is allowed to make: "this
 * box's job in a rig is to drive it". A dedicated sequencer or transport says `true`; everything
 * else omits the field.
 *
 * It is deliberately not derivable. `kind` cannot answer it — a groovebox and a dedicated
 * sequencer can both be `groovebox`, and the difference is what the box is *for*, which is
 * exactly the sort of thing §2.3 says the manifest states rather than the engine infers.
 *
 * Omitted, never `false`, when the device makes no claim: absent and "explicitly not preferred"
 * would rank identically and the second spelling only invites an author to write it out eleven
 * times. It is meaningless without `canSendClock`, and the schema refuses that combination
 * rather than silently ignoring it.
 */
export type ClockSpec = {
  canSendClock: boolean
  canReceiveClock: boolean
  transport: ClockTransport[]
  preferredSource?: boolean
}

export const ClockSpecSchema = z
  .strictObject({
    canSendClock: z.boolean(),
    canReceiveClock: z.boolean(),
    transport: z.array(ClockTransportSchema).min(1),
    preferredSource: z.boolean().optional(),
  })
  .refine((c) => !(c.preferredSource === true && !c.canSendClock), {
    message: 'clock.preferredSource requires canSendClock',
    path: ['preferredSource'],
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
 * §10. How much horizontal room the box takes up in a rack view, and where that was checked.
 *
 * **`panelSpanMm` is the front-panel horizontal span in normal playing orientation** — how wide
 * the box reads when it is sitting in front of you and you are playing it. That is the only
 * quantity a rack of side-by-side panels needs, and it is deliberately *not* called `width`,
 * because "width" is what a spec sheet calls the long axis regardless of which way up the box is
 * played, and the two disagree.
 *
 * They disagree in the seed set, today. The Tracker Mini is portrait: Polyend's specifications
 * call 170 mm its width, but that is the *vertical* span of the panel as played, and its
 * horizontal span is 130 mm. Rendering it at 170 would draw it lying on its side. So a
 * manufacturer's stated width is a *candidate* for this field and never automatically the answer:
 * confirm the orientation on a panel diagram before authoring, and prefer citing that diagram,
 * because it is the thing actually measured.
 *
 * Getting this wrong produces a rack that looks entirely plausible and is wrong, which is the
 * failure mode hardest to notice later. The contrast is worth having: in a row of landscape boxes
 * a portrait one should read as narrow and tall, because it is, and that is what §10's "realistic
 * relative width" was asking for.
 *
 * `verified` is the same `Verified` that carries a numeric range's provenance (§3.1), and it means
 * the same thing here: a `Cite` names the document and page anybody can turn to, and `false` says
 * nobody has checked. A panel span is citable device data exactly like a parameter range — the
 * manufacturers do publish the dimensions and do draw the panels — so `false` is for a box whose
 * figure genuinely is not published, and it renders provisional. It is never the place to park a
 * guess: a fabricated span would be the first plausible fiction in this codebase, and an
 * honestly-provisional panel beats it.
 *
 * Span only. Depth does not exist in a front-panel view and height only matters if the rack ever
 * stacks rows; a field nobody reads is a field nobody keeps accurate.
 */
export type PhysicalSpec = {
  /** Front-panel horizontal span in millimetres, in normal playing orientation. */
  panelSpanMm: number
  /** Manual and page — ideally the panel diagram — or `false` for a span nobody has checked. */
  verified: Verified
}

export const PhysicalSpecSchema = z.strictObject({
  panelSpanMm: z.number().finite().positive(),
  verified: VerifiedSchema,
})

/**
 * §10. A simplified, **original** drawing of the front panel, authored per device.
 *
 * Why this is data rather than a React component per box: invariant 2 says adding a device must
 * not require a UI edit, so the rack has exactly one renderer and it switches on `kind` below —
 * a closed, device-agnostic vocabulary of shapes — never on a device id. A manifest describes
 * where its controls sit; it does not draw them.
 *
 * **Reference, never asset** (§10). These coordinates are read off the manual's hardware-overview
 * drawing the way a parameter value is read off a specifications table: look at where the screen,
 * the knob clusters and the pads actually are, then lay out our own simplified version in our own
 * line weights. Nothing is extracted, embedded or traced, and no vendor artwork is shipped.
 *
 * Optional, deliberately. A device that authors no layout still gets a panel — the rack falls
 * back to a generated one built from the jacks and voices it declares — so a fourth manifest is
 * never blocked on someone having drawn it.
 */
export type PanelFeature =
  /** A display. Draw the voice field on top of one to show a box whose screen lists its tracks. */
  | { kind: 'screen'; x: number; y: number; w: number; h: number }
  /**
   * `d` is the diameter, because that is what you measure off a drawing. `x`/`y` are the
   * top-left of the bounding box, like every other feature — not the centre.
   */
  | { kind: 'knob'; x: number; y: number; d: number; label?: string }
  | { kind: 'button'; x: number; y: number; w: number; h: number; round?: boolean; label?: string }
  /**
   * A block of identical controls — a step-key row is `rows: 1`, a knob matrix is
   * `shape: 'knob'`. Decorative: no voice binding, so it never claims anything about this guide.
   */
  | {
      kind: 'grid'
      x: number
      y: number
      w: number
      h: number
      cols: number
      rows: number
      shape?: 'pad' | 'knob' | 'fader' | 'key'
      label?: string
    }
  /**
   * The one region the resolver writes into: it is filled with one cell per *assignable*, lit
   * where this guide occupies it. Put it where the box's own voice or track selection lives — the
   * TR-1000's instrument row, the Tracker Mini's screen — so the readout lands somewhere true.
   * At most one per panel.
   */
  | { kind: 'voices'; x: number; y: number; w: number; h: number; label?: string }
  /** Silkscreen. Section names and the like; not a substitute for a control's own `label`. */
  | { kind: 'label'; x: number; y: number; text: string; align?: 'start' | 'middle' | 'end' }
  /** A hairline cluster boundary, the way a panel groups a section. */
  | { kind: 'group'; x: number; y: number; w: number; h: number; label?: string }

const featureBox = { x: z.number().finite(), y: z.number().finite() }
const featureSize = { w: z.number().finite().positive(), h: z.number().finite().positive() }

export const PanelFeatureSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('screen'), ...featureBox, ...featureSize }),
  z.strictObject({
    kind: z.literal('knob'),
    ...featureBox,
    d: z.number().finite().positive(),
    label: z.string().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal('button'),
    ...featureBox,
    ...featureSize,
    round: z.boolean().optional(),
    label: z.string().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal('grid'),
    ...featureBox,
    ...featureSize,
    cols: z.int().min(1),
    rows: z.int().min(1),
    shape: z.enum(['pad', 'knob', 'fader', 'key']).optional(),
    label: z.string().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal('voices'),
    ...featureBox,
    ...featureSize,
    label: z.string().min(1).optional(),
  }),
  z.strictObject({
    kind: z.literal('label'),
    ...featureBox,
    text: z.string().min(1),
    align: z.enum(['start', 'middle', 'end']).optional(),
  }),
  z.strictObject({
    kind: z.literal('group'),
    ...featureBox,
    ...featureSize,
    label: z.string().min(1).optional(),
  }),
])

export type PanelLayout = {
  /**
   * Vertical span of the front panel in normal playing orientation, millimetres.
   *
   * **This is the trap `panelSpanMm` already sprang once, from the other side.** For a desktop
   * box lying flat, the surface you play is the top panel, so its vertical span is the figure the
   * manufacturer calls *depth* — a Deluge is 305 × 208 on the desk and its specifications say
   * "305 x 208 x 46". Read it off the drawing, not off the axis letters, and check that
   * `panelSpanMm / panelRiseMm` matches the drawn aspect before believing either.
   */
  panelRiseMm: number
  /** Manual and page for the drawing these coordinates were read off. */
  verified: Verified
  /** Panel-local millimetres, origin at the top-left corner. Drawn in order. */
  features: PanelFeature[]
}

export const PanelLayoutSchema = z.strictObject({
  panelRiseMm: z.number().finite().positive(),
  verified: VerifiedSchema,
  features: z.array(PanelFeatureSchema).min(1),
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
  /** §10. Panel width and its source. Required — the rack draws it. */
  physical: PhysicalSpec
  /** §10. A simplified original drawing of the panel. Optional; the rack generates one without. */
  panel?: PanelLayout
  /**
   * §3.3. The patch points this device declares, each cited once. Required only in the sense
   * that a recipe cannot name a jack that is not here — a box nobody patches declares none.
   */
  jacks?: JackSpec[]
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
    physical: PhysicalSpecSchema,
    panel: PanelLayoutSchema.optional(),
    jacks: z.array(JackSpecSchema).optional(),
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

    // §10. Panel geometry is checked here rather than in `PanelLayoutSchema` because the
    // horizontal bound lives on `physical`, which is only in scope at device level — the same
    // reason articulation keys are checked here and not on `Recipe`.
    if (device.panel !== undefined) {
      const span = device.physical.panelSpanMm
      const rise = device.panel.panelRiseMm
      const voiceFields = device.panel.features.filter((f) => f.kind === 'voices')
      if (voiceFields.length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'at most one voice field per panel (§10)',
          path: ['panel', 'features'],
        })
      }
      device.panel.features.forEach((feature, i) => {
        const w = feature.kind === 'knob' ? feature.d : feature.kind === 'label' ? 0 : feature.w
        const h = feature.kind === 'knob' ? feature.d : feature.kind === 'label' ? 0 : feature.h
        if (feature.x < 0 || feature.y < 0 || feature.x + w > span || feature.y + h > rise) {
          ctx.addIssue({
            code: 'custom',
            message: `panel feature falls outside the ${span} x ${rise} mm panel`,
            path: ['panel', 'features', i],
          })
        }
      })
    }

    // §3.3. Jack ids are unique within a device, for the same reason voice ids are: a patch
    // entry names one, and two declarations of one name make the citation and the direction
    // ambiguous rather than merely redundant.
    const jackDirection = new Map<string, 'in' | 'out'>()
    const duplicateJacks: string[] = []
    for (const jack of device.jacks ?? []) {
      if (jackDirection.has(jack.id)) duplicateJacks.push(jack.id)
      else jackDirection.set(jack.id, jack.direction)
    }
    if (duplicateJacks.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `jack ids must be unique within a device: ${duplicateJacks.join(', ')}`,
        path: ['jacks'],
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

      // §3.3: a cable names two jacks the device declares, and runs from an output to an
      // input. Both are the same class of check as an articulation key against `features.perStep`
      // below — the capability is the device's and the recipe only references it — and both fail
      // the build rather than a request (§9). Before this existed, a typo in a jack name rendered
      // happily and sent a reader hunting for a socket that is not on the box.
      recipe.patch?.forEach((entry, j) => {
        for (const [end, name] of [
          ['from', entry.from],
          ['to', entry.to],
        ] as const) {
          const direction = jackDirection.get(name)
          if (direction === undefined) {
            ctx.addIssue({
              code: 'custom',
              message: `patch entry names jack '${name}', which this device does not declare`,
              path: ['recipes', i, 'patch', j, end],
            })
            continue
          }
          const wanted = end === 'from' ? 'out' : 'in'
          if (direction !== wanted) {
            ctx.addIssue({
              code: 'custom',
              message: `a cable's '${end}' must be an ${wanted}put; '${name}' is an ${direction}put`,
              path: ['recipes', i, 'patch', j, end],
            })
          }
        }
      })

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
