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
  citedDocument,
  effectiveVerified,
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

/**
 * How a device passes clock and transport ('midi-din', 'usb', an analog clock jack). Left
 * open: DESIGN.md gives an example list but never freezes the vocabulary, and a closed union
 * guessed here would reject a legal manifest for a box with a transport nobody anticipated.
 *
 * Declared here rather than beside `ClockSpec` below, where the rest of §2.3's clock data lives,
 * because `JackSpec.clock` names one of these and a Zod schema is a value: the reference has to
 * be initialised before the object literal that reads it, not merely before the type-checker
 * sees it.
 */
export type ClockTransport = string
export const ClockTransportSchema = z.string().min(1)

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
  /**
   * §10/#103. **This is the socket clock uses on this box, over this transport.**
   *
   * Set it and the rack's clock cable is drawn into a jack the manual prints; leave it off and
   * the rack draws the socket with no silkscreen at all, which is the honest rendering of "this
   * box syncs, and nobody has read its rear panel yet".
   *
   * It is a property of the *jack*, not of the clock: `canSendClock` says a box can drive a rig,
   * and no boolean anywhere says what is written next to the hole. The rack derived `CLK OUT`
   * and `CLK IN` from those two booleans and drew them on all fourteen devices, including a
   * Tracker Mini whose panel reads `Line In / Line Out / MIDI In / MIDI Out` and a TR-1000 that
   * has a `CLK OUT` but no clock input jack of any name.
   *
   * **Keyed by transport because the socket moves with it.** A TR-1000 takes clock at `MIDI IN`
   * over `midi-din` and at `TRG IN` over `analog-clock`; naming one socket per box would put the
   * cable in the wrong hole for every rig that resolved the other transport, which is the same
   * defect in a new place. Every entry must be one of the device's own `clock.transport` values.
   *
   * **A list, because one hole can speak more than one protocol.** The TR-1000's `TRG IN` is the
   * endpoint for `analog-clock` and for `trigger` both — p.32's `Trig In` chooses which, on the
   * same socket — and ids are unique per device, so a single-valued field would have forced a
   * coin-flip between two true answers. The reverse is what must not happen, and is checked: two
   * *jacks* claiming the same transport in the same direction leaves the rack choosing.
   */
  clock?: ClockTransport[]
  /** The page that documents this jack. Cited once, here, however many cables touch it. */
  verified: Verified
  /** Anything a name alone would mislead a reader about. */
  note?: string
}

export const JackSpecSchema = z.strictObject({
  id: z.string().min(1),
  direction: z.enum(['in', 'out']),
  clock: z.array(ClockTransportSchema).min(1).optional(),
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
 * §3/#101. **What audio this recipe plays**, for a recipe whose voice does not make its own.
 *
 * A generator-based recipe answers this in a parameter: the TR-1000 has an internal generator
 * selector, so `GEN 9X Bass Drum` is an enum with an options list and a manual page behind it.
 * A sampler's equivalent is a file on an SD card. There is no controlled vocabulary to pick
 * from, nothing in the manifest that could hold one, and no page that says which recording
 * suits a dark kick — so the question has no parameter to live in, and every parameter that
 * *does* exist resolves. `tm-texture-soft` set a play mode, a filter, a grain length, a cutoff,
 * a reverb send and an attack, and never said what was being granulated.
 *
 * **This is not a fourth meaning of "gap" (#81), and that route was rejected on purpose.**
 * A sampler voice with no declared source could have been reported as a gap, which would have
 * needed no new field: §7.3's renderer already has the voice for it. But `gap` today collapses
 * three unrelated situations — the hardware cannot, the recipe was never authored, the role is
 * optional for the genre — into one word and one rendering, and #81 is the open work of pulling
 * those three apart. A fourth tenant makes that job harder and says the wrong thing besides: a
 * resolved recipe with resolved parameters on a voice that can carry the part is not an absence.
 * Nothing is missing from the rig or from the library. What is missing is a *sentence in the
 * recipe*, which is authoring metadata, and authoring metadata belongs on the recipe.
 *
 * **Two claims, kept apart, because they are checkable by different people.**
 *
 *     need   what to load        taste — never cited, because no page states it
 *     prep   how to obtain it    the manual's own procedure, or nobody's
 *
 * This is the same split `range`/`value` makes for a numeric and `options`/`value` makes for an
 * enum (§3.1, §3.2), arriving at the third shape that pushed on it. It also dissolves a real
 * tension: the Tracker Mini's chord recipes carried p.104's render-to-audio procedure as the
 * `verified` of a `text` param's *point*, because a text param has no legality gate and that was
 * the only slot available — which badged the reader's choice of sample with the manual's page.
 * Here the page goes on the procedure, where it is true, and the choice stays uncited.
 *
 * `verified` inside `prep` is **required**, not inherited: a procedure has a page or nobody
 * checked it, exactly as a `JackSpec` does. There is no third state to inherit toward.
 *
 * `need` is prose and stays prose. A closed vocabulary of source kinds would be a fifth shared
 * vocabulary (invariant 3) built out of the one thing we cannot enumerate — other people's
 * sample libraries — and it would be the wrong shape anyway: what a reader needs is a phrase
 * they can search their own folders with, not a category we invented. It names no device and no
 * genre, and travels device → renderer exactly as `routing` and `note` do.
 */
export type SourceAudio = {
  /**
   * What to load, in terms a reader can search their own library by. Never cited: no page
   * anywhere states which recording suits this part, which is the same reason no *point* value
   * on a sample recipe is ever cited.
   */
  need: string
  /** A documented way to obtain or prepare it, when the box's manual prints one. */
  prep?: { text: string; verified: Verified }
  /** A key into the device's `hints` table, checked at device level like an articulation's. */
  hint?: string
}

export const SourceAudioSchema = z.strictObject({
  need: z.string().min(1),
  prep: z
    .strictObject({ text: z.string().min(1), verified: VerifiedSchema })
    .optional(),
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
  /**
   * §3/#101. What audio this recipe plays, when the voice does not make its own. Before `params`
   * because that is the order it happens: a cutoff on a track with nothing loaded is a setting
   * with no subject.
   */
  sourceAudio?: SourceAudio
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
    sourceAudio: SourceAudioSchema.optional(),
    params: z.array(AuthoredParamSchema),
    patch: z.array(PatchEntrySchema).min(1).optional(),
    articulation: z.array(ArticulationEntrySchema).min(1).optional(),
    routing: z.string().min(1).optional(),
    verified: VerifiedSchema.optional(),
  })

// ---------------------------------------------------------------------------
// §2.3 Device manifest
// ---------------------------------------------------------------------------

/**
 * §2.3. What the box *is*, as a closed list.
 *
 * Closed on purpose: the kind drives the picker's filter, and a free-text kind would make that
 * filter a list of typos. It is **not** one of invariant 3's four shared vocabularies — a kind is
 * a fact about hardware, not a term templates and devices meet on — but the same discipline
 * applies for a different reason. Adding one widens a filter every user sees, so a kind earns its
 * place only when the alternatives would make a manifest *say something false*, never when they
 * would merely be a loose fit.
 *
 * `sequencer` is here because both alternatives failed that test for a Eurorack sequencer with no
 * sound engine at all. `semi-modular` implies a normalised audio instrument — the Cascadia's whole
 * point is that it makes a sound with nothing patched — and would imply voices, assignables and
 * recipes for a box that has none. `groovebox` implies self-contained sound generation, which is
 * the one thing such a box is defined by not doing. §2.4 already says a device with no voices is
 * modelled properly rather than special-cased; this is that rule reaching the kind list.
 *
 * The order here is not a display order. `kindsPresent` derives the picker's options from the
 * registry in first-mention order, so nothing reads this array's sequence.
 */
export const DEVICE_KINDS = [
  'drum-machine',
  'groovebox',
  'sampler',
  'sequencer',
  'synth',
  'semi-modular',
  'mixer-recorder',
  'fx-processor',
] as const

export type DeviceKind = (typeof DEVICE_KINDS)[number]
export const DeviceKindSchema = z.enum(DEVICE_KINDS)

/**
 * §7.4. `preferredSource` is the one *topology judgement* a manifest is allowed to make: "this
 * box's job in a rig is to drive it". A dedicated sequencer or transport says `true`; everything
 * else omits the field.
 *
 * It is deliberately not derivable, and `kind` in particular cannot answer it. The library's two
 * `mixer-recorder`s make the point on real data: the Model 2400 is the one box that claims this
 * field, and the LiveTrak L-8 cannot send clock at all. Same kind, opposite ends of the topology.
 * Whether a box's job is to drive a rig is a fact about how it is used, which is exactly the sort
 * of thing §2.3 says the manifest states rather than the engine infers.
 *
 * (This argument used to be made with "a groovebox and a dedicated sequencer can both be
 * `groovebox`", which stopped being true when §2.3 gained a `sequencer` kind. The claim survives
 * the loss of that example; it did not depend on it.)
 *
 * Omitted, never `false`, when the device makes no claim: absent and "explicitly not preferred"
 * would rank identically and the second spelling only invites an author to write it out eleven
 * times. It is meaningless without `canSendClock`, and the schema refuses that combination
 * rather than silently ignoring it.
 */
/**
 * §7.4/#104. **What to set on this box so that it actually emits clock over a transport.**
 *
 * `canSendClock` says a box *can* drive a rig. On plenty of boxes that is a capability behind a
 * switch, and the guide was naming a clock source without ever saying how to turn it on: the rig
 * phase said "Tracker Mini over `midi-din`. Sync everything else to it", and a reader who did
 * exactly that got silence, because clock output on that box is routed in a menu (Off / USB /
 * MIDI Out jack / USB + MIDI Out jack, p.54) and nothing in the guide mentioned the menu. Every
 * later phase depends on the transport running, so one unstated setting stalls the whole guide.
 *
 * **Per transport, because the setting is.** The same menu takes `USB` for a USB rig and
 * `MIDI Out jack` for a MIDI one, and printing the wrong one is worse than printing neither.
 *
 * `path` and `value` are the box's own words, and stay in the box's own words: `Config > MIDI >
 * Clock Out`, not "the clock output setting". §8 is read at the machine, and a reader is looking
 * for that string on a screen.
 *
 * `verified` is required, as on a `JackSpec`: a menu path has a page or nobody checked it. There
 * is no third state to inherit toward — this is device data and no recipe is above it.
 *
 * **Nothing here is derived and nothing is guessed.** A box that needs no setting declares none,
 * and a box whose manual does not print one declares none either; both render as they do today,
 * which is the honest gap rather than an invented menu path (invariant 5).
 */
export type ClockSourceSetup = {
  /** Which transport this enables. Must be one the device declares. */
  transport: ClockTransport
  /** The menu path, as the box prints it: 'Config > MIDI > Clock Out'. */
  path: string
  /** The option to select there, in the menu's own words: 'MIDI Out jack'. */
  value: string
  /** Anything a reader would otherwise have to discover at the machine. */
  note?: string
  /** The page that prints the menu. */
  verified: Verified
}

export const ClockSourceSetupSchema = z.strictObject({
  transport: ClockTransportSchema,
  path: z.string().min(1),
  value: z.string().min(1),
  note: z.string().min(1).optional(),
  verified: VerifiedSchema,
})

export type ClockSpec = {
  canSendClock: boolean
  canReceiveClock: boolean
  transport: ClockTransport[]
  preferredSource?: boolean
  /** §7.4/#104. How to make this box emit clock, per transport. */
  sourceSetup?: ClockSourceSetup[]
}

/**
 * §7.4/#104. The setup this box needs to drive a rig over `transport`, or nothing.
 *
 * One lookup shared by both renderers rather than two. The project's standing rule is that the
 * Markdown renderer and the React one **do not share code** — a sentence appears in both only
 * because someone wrote it in both, in the same words — and that rule is about *prose*. Which
 * entry matches is not prose: it is the same question with one right answer, and two copies of
 * it are two things to keep in step for no benefit. The wording around it stays written twice.
 */
export function clockSourceSetup(
  device: Device,
  transport: ClockTransport,
): ClockSourceSetup | undefined {
  return device.clock.sourceSetup?.find((s) => s.transport === transport)
}

/**
 * §8/#103. **What a reader has to know about the sockets this rig's clock actually uses.**
 *
 * A `JackSpec.note` is "anything a name alone would mislead a reader about", and the sockets
 * carrying clock are exactly where that bites: the Tracker Mini's MIDI jacks are 3.5mm TRS and
 * need the supplied **Type B** adapter for a 5-pin cable (p.13, p.284). Type B is the uncommon
 * one. A reader who reaches for a Type A gets silence, with nothing on screen to explain it, on
 * the phase whose whole job is "what do I plug where".
 *
 * **Filtered by the resolved transport**, so a USB rig is not told about a MIDI adapter it will
 * never touch, and **deduped**, because that note is true of the In and the Out both and the
 * manifest rightly states it on each — a guide that printed it twice would read as two different
 * warnings about two different problems.
 *
 * Deduped on the note *and its citation*: two jacks saying the same thing on different pages are
 * two claims, and merging them would put one page's name to the other's sentence.
 */
export type ClockJackNote = {
  /** The jacks this is about, in manifest order: 'MIDI Out', 'MIDI In'. */
  jacks: string[]
  note: string
  verified: Verified
}

export function clockJackNotes(device: Device, transport: ClockTransport): ClockJackNote[] {
  const byClaim = new Map<string, ClockJackNote>()
  for (const jack of device.jacks ?? []) {
    if (jack.note === undefined) continue
    if (!(jack.clock ?? []).includes(transport)) continue
    // Not `JSON.stringify(jack.verified)`: key order in an object literal is an authoring
    // accident, and two identical citations written in the other order must not read as two.
    const cite = jack.verified === false ? 'false' : `${jack.verified.kind}\u0000${jack.verified.source}`
    const key = `${jack.note}\u0000${cite}`
    const seen = byClaim.get(key)
    if (seen === undefined) {
      byClaim.set(key, { jacks: [jack.id], note: jack.note, verified: jack.verified })
    } else {
      seen.jacks.push(jack.id)
    }
  }
  return [...byClaim.values()]
}

export const ClockSpecSchema = z
  .strictObject({
    canSendClock: z.boolean(),
    canReceiveClock: z.boolean(),
    transport: z.array(ClockTransportSchema).min(1),
    preferredSource: z.boolean().optional(),
    sourceSetup: z.array(ClockSourceSetupSchema).min(1).optional(),
  })
  .refine((c) => !(c.preferredSource === true && !c.canSendClock), {
    message: 'clock.preferredSource requires canSendClock',
    path: ['preferredSource'],
  })
  // #104. The same three checks `JackSpec.clock` gets, for the same reason: a setup naming a
  // transport this box does not carry can never be reached, one on a box that cannot send clock
  // describes a state that does not exist, and two for one transport leaves the renderer picking
  // which menu path a reader should follow.
  .refine((c) => !(c.sourceSetup !== undefined && !c.canSendClock), {
    message: 'clock.sourceSetup requires canSendClock',
    path: ['sourceSetup'],
  })
  .refine((c) => (c.sourceSetup ?? []).every((s) => c.transport.includes(s.transport)), {
    message: 'every clock.sourceSetup transport must appear in clock.transport',
    path: ['sourceSetup'],
  })
  .refine(
    (c) => new Set((c.sourceSetup ?? []).map((s) => s.transport)).size === (c.sourceSetup ?? []).length,
    {
      message: 'clock.sourceSetup declares one setup per transport',
      path: ['sourceSetup'],
    },
  )

/**
 * §2.3. The audio the box has, as the manifest states it.
 *
 * **`main: 'none'` is a real answer**, and adding it dropped an assumption that had been true of
 * every device in the library: that everything has an audio output. A Eurorack sequencer has
 * pitch, gate, modulation and clock outputs and no audio path at all, so `mono` would make both
 * renderers print a "mono main out" that does not exist and make the rack draw a jack nobody can
 * plug into. Invariant 5 forbids inventing an assignment to fill a hole; a fictional output is
 * the same fault wearing different clothes.
 *
 * `none` says only that there is no *main* bus. A box may still declare `individualOuts`,
 * `audioIn` or `usbAudio` alongside it, and consumers have to handle that combination rather than
 * treating `none` as "no audio anywhere".
 */
export type IoSpec = {
  main: 'mono' | 'stereo' | 'none'
  individualOuts: number
  audioIn: boolean
  usbAudio: boolean
}

export const IoSpecSchema = z.strictObject({
  main: z.enum(['mono', 'stereo', 'none']),
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

    /**
     * §10/#103. A jack claiming to carry clock is checked against the clock spec three ways,
     * because all three failures draw a cable into a hole that is not there.
     *
     * The transport has to be one the box declares — `clock: 'analog-clock'` on a device whose
     * `transport` is `['midi-din']` is a socket no rig can ever resolve onto. The direction has
     * to match the capability: a clock-carrying `out` on a box that cannot send is the same
     * fiction `CLK OUT`-from-a-boolean was. And one socket per (transport, direction), because
     * the rack draws exactly one, and a device offering two would have the *renderer* choosing
     * which of the box's jacks the reader should patch — a decision that belongs in the manifest
     * beside its citation.
     */
    const transports = new Set(device.clock.transport)
    const clockSockets = new Set<string>()
    ;(device.jacks ?? []).forEach((jack, i) => {
      if (jack.clock === undefined) return
      const capable =
        jack.direction === 'out' ? device.clock.canSendClock : device.clock.canReceiveClock
      if (!capable) {
        ctx.addIssue({
          code: 'custom',
          message: `jack '${jack.id}' carries clock ${jack.direction} on a device that cannot ${jack.direction === 'out' ? 'send' : 'receive'} clock`,
          path: ['jacks', i, 'clock'],
        })
      }
      jack.clock.forEach((transport, j) => {
        if (!transports.has(transport)) {
          ctx.addIssue({
            code: 'custom',
            message: `jack '${jack.id}' carries clock over '${transport}', which this device does not declare in clock.transport`,
            path: ['jacks', i, 'clock', j],
          })
        }
        const key = `${transport}\u0000${jack.direction}`
        if (clockSockets.has(key)) {
          ctx.addIssue({
            code: 'custom',
            message: `two jacks carry clock ${jack.direction} over '${transport}'; the rack draws one`,
            path: ['jacks', i, 'clock', j],
          })
        }
        clockSockets.add(key)
      })
    })

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

      // §3/#101. A source-audio hint is a key into this device's own table, checked here for the
      // same reason an articulation's is: the table is device-level and the recipe references it.
      if (recipe.sourceAudio?.hint !== undefined && !hintKeys.has(recipe.sourceAudio.hint)) {
        ctx.addIssue({
          code: 'custom',
          message: `sourceAudio references hint '${recipe.sourceAudio.hint}', which this device does not author`,
          path: ['recipes', i, 'sourceAudio', 'hint'],
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

/**
 * The documents a device's ranges actually cite, most-cited first, ties by code unit (§7.2).
 *
 * Derived rather than declared, because `Device.manual` is a separate assertion that nothing
 * keeps in agreement with the citations and that has drifted: a TR-1000 declares its Owner's
 * Manual and every range cites the Reference Manual, which is a different book and the only one
 * that prints a range at all. An MC-101 and a Deluge each cite two documents, which one title
 * cannot express however it is worded.
 */
export function rangeDocuments(device: Device): readonly string[] {
  const counts = new Map<string, number>()
  for (const recipe of device.recipes) {
    for (const param of recipe.params as AuthoredParam[]) {
      if (param.kind !== 'numeric') continue
      const verified = effectiveVerified(param.range.verified, recipe.verified)
      if (verified === undefined || verified === false || verified.kind !== 'manual') continue
      const document = citedDocument(verified.source)
      counts.set(document, (counts.get(document) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([document]) => document)
}
