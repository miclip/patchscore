import { z } from 'zod'
import type { DeviceId } from './ids'
import { INSPIRATION_CAP } from './inspiration'
import { MoodStateSchema } from './resolver'
import {
  BPM_MAX,
  BPM_MIN,
  FORMAT_VERSION,
  KEY_MAX_LENGTH,
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
  /**
   * §7.4/#304. **Which box leads this rig, remembered with the rig rather than with the guide.**
   *
   * `clockSourceId` is a `GuideInputsV1` field, so it rides permalinks and changes per score.
   * That is right for a shared link and wrong for the studio: which box is the clock is a fact
   * about somebody's desk, not about the track they are making. The Hapax is the clock whatever
   * direction is selected, and before this the choice was lost on every reload.
   *
   * **On the rig and not global**, because it names a device: a preference stored beside the
   * jack style would point at a box the current rig does not contain. This is the same reasoning
   * `RigMemberV1` already embodies — membership and per-device state are one fact — one level up.
   *
   * Optional, so a document written before this field stays valid, and dropped by `reconcileRig`
   * the moment its device leaves the rig.
   */
  clockSourceId?: DeviceId
}

/** The whole persisted studio: the current rig, what came before it, and the score on screen. */
export type StudioDocV1 = {
  version: typeof STUDIO_DOC_VERSION
  rig: StoredRigV1
  /** Not rig state (#16). Template, inspirations, mood, seed — what a *score* is made of. */
  inputs: ScoreInputsV1
  /**
   * §8.2/#304. **Rigs the reader has had before this one, newest first.**
   *
   * Automatic rather than named, and that is the first cut on purpose. A named list needs a
   * naming UI and a decision from somebody who came here to make a track; a history needs
   * neither and answers the question that actually recurs — *what did I have plugged in last
   * week* — which is a question about the past rather than about organising the future. Names
   * are #16's job, on the day rigs become first-class and get a server row.
   *
   * Bounded at `RECENT_RIGS_MAX` and deduplicated by membership, so switching a direction twenty
   * times does not push a real rig off the end. `localStorage` is small and shared across the
   * origin; an unbounded list here is a quota failure that costs somebody their whole studio.
   *
   * **A remembered rig may exceed `MAX_RIG_DEVICES`.** The cap is a picker rule and not a format
   * rule (#301), so a rig stored before it existed is still a rig. Restoring one loads it whole
   * and refuses additions; truncating it to fit would be the app quietly editing what somebody
   * built.
   *
   * Optional, so a document written before this field stays valid.
   */
  recent?: readonly StoredRigV1[]
}

/**
 * How many previous rigs to keep. Small deliberately: this is a shortcut back to something
 * recognisable, not an archive, and the list is read by eye in a picker that already has a
 * catalogue in it.
 */
export const RECENT_RIGS_MAX = 5

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
  // #304. The clock source is a member like any other: unticking the box that led the rig drops
  // the choice with it, rather than leaving a rig whose clock names something it does not contain.
  const clockSourceId =
    rig.clockSourceId !== undefined && devices.includes(rig.clockSourceId)
      ? rig.clockSourceId
      : undefined
  return {
    id: rig.id,
    name: rig.name,
    devices: devices.map((deviceId) => existing.get(deviceId) ?? { deviceId, settings: {} }),
    ...(clockSourceId === undefined ? {} : { clockSourceId }),
  }
}

/**
 * §8.2/#304. The history after this rig becomes the current one.
 *
 * Deduplicated **by membership rather than by id**, because every rig carries `IMPLICIT_RIG_ID`
 * until #16 makes them first-class — an id comparison would collapse the whole list to one entry.
 * Two rigs holding the same boxes are the same rig here even if their clock source differs, since
 * what a reader recognises in this list is the set of boxes.
 *
 * Pure and order-stable. The incoming rig is *not* added: it is the current one, and a history
 * containing what you already have is a row that does nothing.
 */
export function rememberRig(
  previous: StoredRigV1 | undefined,
  recent: readonly StoredRigV1[] | undefined,
): readonly StoredRigV1[] {
  const before = recent ?? []
  if (previous === undefined || previous.devices.length === 0) return before.slice(0, RECENT_RIGS_MAX)
  const key = (rig: StoredRigV1): string => rig.devices.map((m) => m.deviceId).join('\u0000')
  const mine = key(previous)
  return [previous, ...before.filter((rig) => key(rig) !== mine)].slice(0, RECENT_RIGS_MAX)
}

/**
 * §8.2/#304. The history a document should carry once the rig holds `devices`.
 *
 * **A rig enters the history when it stops being the current one**, which is the only moment it
 * becomes worth a shortcut back to. Comparison is on membership: a direction change, a mood knob
 * or a reroll all rewrite the document and none of them is a new rig, so keying on anything
 * looser would fill five slots with one rig before the reader finished a track.
 *
 * Takes the *stored* document rather than the live one, because the question is what was there
 * before this edit — the caller holds the new devices and the store holds the old rig, and
 * nothing else needs to be threaded through the sync path to answer it.
 */
export function advanceHistory(
  stored: StudioDocV1 | undefined,
  devices: readonly DeviceId[],
): readonly StoredRigV1[] {
  if (stored === undefined) return []
  const was = stored.rig.devices.map((member) => member.deviceId)
  const same = was.length === devices.length && was.every((id, i) => id === devices[i])
  return same ? (stored.recent ?? []) : rememberRig(stored.rig, stored.recent)
}

/**
 * The document for a set of guide inputs. The rig half and the score half, separated.
 *
 * Passing the loaded rig reconciles it rather than overwriting it, so a caller cannot preserve
 * a rig's identity and lose its settings by forgetting a step — there is no step to forget.
 */
export function studioDoc(
  inputs: GuideInputsV1,
  rig?: StoredRigV1,
  recent?: readonly StoredRigV1[],
): StudioDocV1 {
  const base = rig === undefined ? implicitRig(inputs.devices) : reconcileRig(rig, inputs.devices)
  // #304. The input wins over the stored rig: the reader has just chosen, or opened a permalink
  // that names one, and either way what is on screen is the current answer. `reconcileRig` has
  // already dropped a stored id whose box has left, so an absent input leaves the rig's own.
  const clockSourceId = inputs.clockSourceId ?? base.clockSourceId
  return {
    version: STUDIO_DOC_VERSION,
    rig: {
      ...base,
      ...(clockSourceId === undefined || !inputs.devices.includes(clockSourceId)
        ? {}
        : { clockSourceId }),
    },
    ...(recent === undefined || recent.length === 0 ? {} : { recent: [...recent] }),
    inputs: {
      templateId: inputs.templateId,
      inspirations: [...inputs.inspirations],
      mood: { ...inputs.mood },
      seed: inputs.seed,
      // Written only when set (#161). `strictObject` would take an explicit `undefined`, but a
      // key present with no value is a second spelling of unset, and JSON drops it on the way to
      // disk anyway — so there would be one shape in memory and another on reload.
      ...(inputs.bpm === undefined ? {} : { bpm: inputs.bpm }),
      ...(inputs.key === undefined ? {} : { key: inputs.key }),
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
    ...(doc.inputs.bpm === undefined ? {} : { bpm: doc.inputs.bpm }),
    ...(doc.inputs.key === undefined ? {} : { key: doc.inputs.key }),
    // #304. Read off the rig rather than the score, which is where it is stored and why the
    // choice now survives a reload at all.
    ...(doc.rig.clockSourceId === undefined ? {} : { clockSourceId: doc.rig.clockSourceId }),
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
  // #304. Optional for the reason #161's two are: a document already on disk predates it.
  clockSourceId: z.string().regex(PERMALINK_ID).optional(),
})

const ScoreInputsSchema = z.strictObject({
  templateId: z.string().regex(PERMALINK_ID),
  // §5's cap, on disk as well as on the wire. `localStorage` is user-editable, so a document
  // claiming three inspirations is corruption to report rather than a selection to honour.
  inspirations: z.array(z.string().regex(PERMALINK_ID)).max(INSPIRATION_CAP),
  mood: MoodStateSchema,
  seed: z.number().int().min(SEED_MIN).max(SEED_MAX),
  /**
   * #161's two, **optional exactly as #16's later fields will be**: a document already on disk
   * predates them and stays valid, which is what optional buys and what a bumped
   * `STUDIO_DOC_VERSION` would have thrown away for nothing.
   *
   * The key is bounded and not parsed, on disk exactly as on the wire: one this build cannot
   * read is carried and reported by the resolver rather than costing the reader their whole
   * studio (§5.6). The bound is here as well as in `checkGuideInputs` for the reason the id
   * regex is — a stored value that could not survive a permalink is already broken.
   */
  bpm: z.number().int().min(BPM_MIN).max(BPM_MAX).optional(),
  key: z.string().max(KEY_MAX_LENGTH).optional(),
})

const StudioDocSchema = z.strictObject({
  version: z.literal(STUDIO_DOC_VERSION),
  rig: StoredRigSchema,
  inputs: ScoreInputsSchema,
  /**
   * #304. Bounded on disk as well as in `rememberRig`, for the reason `INSPIRATION_CAP` is
   * bounded here: `localStorage` is user-editable, so a document claiming fifty rigs is
   * corruption to report rather than a history to honour.
   */
  recent: z.array(StoredRigSchema).max(RECENT_RIGS_MAX).optional(),
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
  if (problem !== undefined) return { detail: problem.detail }

  /**
   * #304. Two claims the schema cannot make, both about ids rather than shapes.
   *
   * A clock source naming a box the rig does not contain is a rig whose leader is not in it —
   * `reconcileRig` cannot produce one, so a document carrying it was hand-edited or foreign, and
   * the file's standing rule is that such a document is reported rather than repaired.
   *
   * Remembered rigs are checked against the catalogue for the same reason the current one is: an
   * unknown id is evidence, and #16 freezes shipped ids so it cannot happen in normal use. They
   * are deliberately *not* checked against `MAX_RIG_DEVICES` — the cap is a picker rule, and a
   * rig stored before it existed is still a rig somebody had (#301).
   */
  if (doc.rig.clockSourceId !== undefined) {
    const members = doc.rig.devices.map((member) => member.deviceId)
    if (!members.includes(doc.rig.clockSourceId)) {
      return { detail: `clock source '${doc.rig.clockSourceId}' is not a device in this rig` }
    }
  }
  for (const rig of doc.recent ?? []) {
    for (const member of rig.devices) {
      if (!catalogue.devices.includes(member.deviceId)) {
        return { detail: `no device '${member.deviceId}' in this build` }
      }
    }
    if (rig.clockSourceId !== undefined && !rig.devices.some((m) => m.deviceId === rig.clockSourceId)) {
      return { detail: `clock source '${rig.clockSourceId}' is not a device in a remembered rig` }
    }
  }
  return undefined
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
  /**
   * #304. `checkStudioDoc` rather than `checkGuideInputs`, so the way in and the way out agree.
   *
   * `saveStudio` has always validated with `checkStudioDoc`; this validated with a subset of it,
   * and the gap was invisible while the two were the same thing. They stopped being the same
   * thing the moment a document grew claims that are not expressible as guide inputs — a clock
   * source naming a box outside its own rig, a remembered rig holding an unknown device — and a
   * document this build would refuse to write must not be one it will happily read.
   *
   * The schema runs twice as a result, once here for the `stored` version and once inside. That
   * is a parse of a small JSON document on one page load, against a class of bug that only
   * appears when the two checks drift.
   */
  const problem = checkStudioDoc(doc, catalogue)
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
