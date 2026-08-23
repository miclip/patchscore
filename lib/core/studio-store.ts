import { z } from 'zod'
import type { DeviceId } from './ids'
import { MoodStateSchema } from './resolver'
import {
  FORMAT_VERSION,
  PERMALINK_ID,
  SEED_MAX,
  SEED_MIN,
  checkGuideInputs,
} from './permalink'
import type { Catalogue, GuideInputsV1, ScoreInputsV1 } from './permalink'

/**
 * §8.2's other half: what the browser remembers between visits. Pure — no `window`, no `React`,
 * no side effect this file performs on its own. A caller hands in a way to reach storage.
 *
 * ## The model is #16's, not a flattened version of it
 *
 * A **rig** there is `rig(user_id, name)` plus `rig_device(rig_id, device_id, settings)` — a
 * first-class mutable object with a name, holding devices *and their per-unit overlay*, because
 * membership and settings "are the same fact: this rig contains this device, configured this
 * way". A **score** is `(rig_snapshot, template_id, inspiration_ids, mood, seed, guide)`.
 *
 * So template, inspirations, mood and seed are **not rig state**, and this document keeps them
 * apart rather than storing one flat blob that would have to be torn in half later. The v1 store
 * holds exactly one rig, implicit and unnamed-by-the-user, because v1 ships accountless (#16:
 * "signing in should upgrade a local rig, not replace it"). It is shaped so that upgrade is a
 * copy rather than a reinterpretation: it already has a stable id, a name, and a per-device row.
 *
 * `RigMemberV1` therefore carries `settings` **now**, empty, rather than a bare `deviceId` that
 * would have to grow one. This is the whole point of storing a member as a row: when #16's
 * overlay lands, v2 adds *optional* fields to `RigSettingsV1` and every `{}` already written to
 * disk stays structurally valid. There is no v1 -> v2 transformation to write, and no window in
 * which a half-migrated document means something different to two builds.
 *
 * ## Nothing here throws
 *
 * `localStorage` fails in more ways than it is given credit for: absent under SSR, a `SecurityError`
 * merely on *access* when a browser is set to block site data, `QuotaExceededError` on write,
 * and whatever a user or another script left in the key. Every one of those is an ordinary
 * outcome here, reported as `unavailable` or `invalid`, because a studio that refuses to load is
 * a worse bug than a studio that starts empty.
 */

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * Bump when the stored shape changes — adding #16's per-device `settings`, or a second rig.
 * Independent of `FORMAT_VERSION` (the permalink's shape) and of `RESOLVER_VERSION` (the
 * engine): three things that change for three unrelated reasons.
 */
export const STUDIO_DOC_VERSION = 1

/**
 * The key is version-free on purpose. Putting `v1` in it would make a v2 silently ignore a v1
 * document instead of noticing it, and "stale data" is exactly the thing this layer is supposed
 * to be able to report.
 */
export const STUDIO_STORAGE_KEY = 'patchscore:studio'

/**
 * #16's per-device overlay, empty in v1 — composed onto the shipped definition at read time,
 * never forked into it.
 *
 * `Record<string, never>` rather than `{}`: the bare empty object type accepts any non-null
 * value in TypeScript, so `settings: { colour: 'red' }` would typecheck and fail only at the
 * schema. This rejects it where it is written.
 *
 * Both of #16's kinds land here as **optional** fields later — the ones that change resolution
 * (disabled voices, a `comfortableVoices` override, individual outs actually patched, firmware)
 * and the ones that only change the rendered guide (routing notes, per-unit notes, hint
 * verbosity). Optional is what keeps an already-stored `{}` valid.
 */
export type RigSettingsV1 = Record<string, never>

/** #16's `rig_device` row: membership and overlay, because they are the same fact. */
export type RigMemberV1 = {
  deviceId: DeviceId
  settings: RigSettingsV1
}

/**
 * #16's `rig` row. The id is stable and the name is the user's, so promoting this to a server
 * row is a copy: nothing here is derived from the browser it happens to be sitting in.
 */
export type StoredRigV1 = {
  id: string
  name: string
  devices: readonly RigMemberV1[]
}

/** The whole persisted studio: one rig, and the score inputs currently on screen. */
export type StudioDocV1 = {
  version: typeof STUDIO_DOC_VERSION
  rig: StoredRigV1
  /** Not rig state (#16). Template, inspirations, mood, seed — what a *score* is made of. */
  inputs: ScoreInputsV1
}

/**
 * v1 has one rig and the user never named it, so its id is a constant rather than a generated
 * one. That is also the only way to keep this file free of `crypto.randomUUID`: an id drawn at
 * write time would make two saves of the same rig two different rigs.
 */
export const IMPLICIT_RIG_ID = 'local'
export const IMPLICIT_RIG_NAME = 'My rig'

// ---------------------------------------------------------------------------
// Assembling and taking apart
// ---------------------------------------------------------------------------

/** A rig from a plain device list — what the picker produces before rigs are first-class. */
export function implicitRig(devices: readonly DeviceId[]): StoredRigV1 {
  return {
    id: IMPLICIT_RIG_ID,
    name: IMPLICIT_RIG_NAME,
    // A fresh `{}` per row, never one shared object: two members must not be able to acquire
    // each other's settings the first time anything writes to one.
    devices: devices.map((deviceId) => ({ deviceId, settings: {} })),
  }
}

/**
 * A rig's membership brought in line with a device list, **keeping everything else**: its id,
 * its name, and each surviving device's `settings`.
 *
 * This is what "preserve the loaded rig" has to mean once the picker can change. Writing the
 * loaded rig back unchanged would save stale membership; rebuilding it from the device list
 * would silently discard every per-device setting the user had. Neither is a save.
 *
 * A device removed from the rig loses its row, and with it its settings — #16's model, where
 * membership and settings *are the same row*. Unticking a box is removing it from the rig, not
 * parking it.
 */
export function reconcileRig(rig: StoredRigV1, devices: readonly DeviceId[]): StoredRigV1 {
  const existing = new Map(rig.devices.map((member) => [member.deviceId, member]))
  return {
    id: rig.id,
    name: rig.name,
    devices: devices.map((deviceId) => existing.get(deviceId) ?? { deviceId, settings: {} }),
  }
}

/**
 * The document for a set of guide inputs. The rig half and the score half, separated.
 *
 * Passing the loaded rig reconciles it rather than overwriting it, so a caller cannot preserve
 * a rig's identity and lose its settings by forgetting a step — there is no step to forget.
 */
export function studioDoc(inputs: GuideInputsV1, rig?: StoredRigV1): StudioDocV1 {
  return {
    version: STUDIO_DOC_VERSION,
    rig: rig === undefined ? implicitRig(inputs.devices) : reconcileRig(rig, inputs.devices),
    inputs: {
      templateId: inputs.templateId,
      inspirations: [...inputs.inspirations],
      mood: { ...inputs.mood },
      seed: inputs.seed,
    },
  }
}

/**
 * The reverse: permalink inputs reconstructed from the two stored parts. The device list is
 * flattened out of the rig's rows here and nowhere else, so there is one place that knows a
 * permalink carries ids where a rig carries members.
 */
export function guideInputsFrom(doc: StudioDocV1): GuideInputsV1 {
  return {
    version: FORMAT_VERSION,
    devices: doc.rig.devices.map((member) => member.deviceId),
    templateId: doc.inputs.templateId,
    inspirations: [...doc.inputs.inspirations],
    mood: { ...doc.inputs.mood },
    seed: doc.inputs.seed,
  }
}

// ---------------------------------------------------------------------------
// Storage access
// ---------------------------------------------------------------------------

/** The two methods this file uses. Narrow so a test can supply four lines instead of a mock DOM. */
export type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * A **thunk**, not a `Storage`, and that is load-bearing rather than fussy. Reading
 * `window.localStorage` can itself throw a `SecurityError` when site data is blocked, so a
 * caller writing `loadStudio(window.localStorage, …)` would throw at its own call site, outside
 * any `try` this file could put around it. Handing over the *act of getting it* is what makes
 * "never throws" true instead of aspirational.
 */
export type StorageSource = () => StorageLike | null | undefined

export type StudioLoad =
  | { status: 'ok'; doc: StudioDocV1 }
  /** Nothing stored yet. A first visit, and not a problem to report to anyone. */
  | { status: 'empty' }
  /**
   * Something is stored and it is not a studio: corrupt JSON, a shape we do not recognise, a
   * version we do not read, or ids this build does not ship. The caller falls back to defaults.
   */
  | { status: 'invalid'; detail: string; stored: number | undefined }
  /** Storage could not be reached at all — SSR, blocked site data, a browser with none. */
  | { status: 'unavailable'; detail: string }

export type StudioSave =
  | { status: 'ok' }
  | { status: 'invalid'; detail: string }
  | { status: 'unavailable'; detail: string }

// ---------------------------------------------------------------------------
// Validation of unknown JSON
// ---------------------------------------------------------------------------

/**
 * Strict objects throughout: an unexpected key means the document was written by something that
 * is not this build, and quietly keeping the parts we recognise is how a user ends up with half
 * of someone else's studio.
 *
 * Ids are checked against `PERMALINK_ID` here as well as in `checkGuideInputs`, because a stored
 * id that cannot survive a permalink is a stored id that will break the moment it is shared.
 */
export const RigSettingsSchema = z.strictObject({})

const RigMemberSchema = z.strictObject({
  deviceId: z.string().regex(PERMALINK_ID),
  // Required, not optional. A row without it was written before this shape existed, and
  // accepting it would reintroduce exactly the two-shapes-on-disk problem it removes.
  settings: RigSettingsSchema,
})

const StoredRigSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  devices: z.array(RigMemberSchema),
})

const ScoreInputsSchema = z.strictObject({
  templateId: z.string().regex(PERMALINK_ID),
  inspirations: z.array(z.string().regex(PERMALINK_ID)),
  mood: MoodStateSchema,
  seed: z.number().int().min(SEED_MIN).max(SEED_MAX),
})

const StudioDocSchema = z.strictObject({
  version: z.literal(STUDIO_DOC_VERSION),
  rig: StoredRigSchema,
  inputs: ScoreInputsSchema,
})

/** First issue only, path included, stored values never echoed back. */
function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue === undefined) return 'does not match the stored studio shape'
  const path = issue.path.join('.')
  return path === '' ? issue.message : `${path}: ${issue.message}`
}

/**
 * The stored version, from JSON that has not been validated yet — so a stale document can be
 * *named* rather than lumped in with corruption. Returns `undefined` when there is no plausible
 * version to report.
 */
function storedVersion(value: unknown): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const version = (value as { version?: unknown }).version
  return typeof version === 'number' ? version : undefined
}

/**
 * Shape, then meaning. The second half runs through `checkGuideInputs` — the same gate the
 * permalink uses — so a document and a link can never disagree about which rigs are legal.
 */
export function checkStudioDoc(
  doc: StudioDocV1,
  catalogue: Catalogue,
): { detail: string } | undefined {
  const parsed = StudioDocSchema.safeParse(doc)
  if (!parsed.success) return { detail: firstIssue(parsed.error) }

  const problem = checkGuideInputs(guideInputsFrom(doc), catalogue)
  return problem === undefined ? undefined : { detail: problem.detail }
}

// ---------------------------------------------------------------------------
// Load and save
// ---------------------------------------------------------------------------

/**
 * Read the studio, or say why there isn't one. **Never throws.**
 *
 * An unknown device id is `invalid` rather than something to repair by dropping the device.
 * #16 freezes shipped ids precisely so this cannot happen in normal use, which makes an unknown
 * id evidence of a hand-edited or foreign document — and silently starting a rig one box lighter
 * than the one the user built is the failure mode invariant 5 exists to forbid.
 */
export function loadStudio(source: StorageSource, catalogue: Catalogue): StudioLoad {
  let raw: string | null
  try {
    const storage = source()
    if (storage === null || storage === undefined) {
      return { status: 'unavailable', detail: 'no storage in this environment' }
    }
    raw = storage.getItem(STUDIO_STORAGE_KEY)
  } catch (error) {
    return { status: 'unavailable', detail: `storage could not be read: ${reason(error)}` }
  }

  if (raw === null) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'invalid', detail: 'stored studio is not valid JSON', stored: undefined }
  }

  const version = storedVersion(parsed)
  if (version !== undefined && version !== STUDIO_DOC_VERSION) {
    return {
      status: 'invalid',
      detail: `stored studio is v${version}; this build reads v${STUDIO_DOC_VERSION}`,
      stored: version,
    }
  }

  const shape = StudioDocSchema.safeParse(parsed)
  if (!shape.success) {
    return { status: 'invalid', detail: firstIssue(shape.error), stored: version }
  }

  const doc = shape.data as StudioDocV1
  const problem = checkGuideInputs(guideInputsFrom(doc), catalogue)
  if (problem !== undefined) {
    return { status: 'invalid', detail: problem.detail, stored: version }
  }

  return { status: 'ok', doc }
}

/**
 * Write the studio, or say why it could not be written. **Never throws.**
 *
 * Validated before writing rather than only on the way back in: a document this build would
 * refuse to load is a document it must refuse to store, or the next visit silently loses a
 * studio that looked saved.
 */
export function saveStudio(
  source: StorageSource,
  doc: StudioDocV1,
  catalogue: Catalogue,
): StudioSave {
  const problem = checkStudioDoc(doc, catalogue)
  if (problem !== undefined) return { status: 'invalid', detail: problem.detail }

  try {
    const storage = source()
    if (storage === null || storage === undefined) {
      return { status: 'unavailable', detail: 'no storage in this environment' }
    }
    storage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(doc))
  } catch (error) {
    // Quota, private-mode write refusal, a blocked origin. All the same to the caller: the
    // studio is on screen and working, it just will not be there tomorrow.
    return { status: 'unavailable', detail: `storage could not be written: ${reason(error)}` }
  }

  return { status: 'ok' }
}

/** `useUnknownInCatchVariables` is on, so a caught value is genuinely unknown until proven. */
function reason(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}
