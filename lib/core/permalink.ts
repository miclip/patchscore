import type { DeviceId, InspirationId, TemplateId } from './ids'
import type { MoodAxis } from './vocabulary'
import { MOOD_AXES } from './vocabulary'
import type { MoodState } from './resolver'
import { INSPIRATION_CAP } from './inspiration'
import { RESOLVER_VERSION } from './pipeline'

/**
 * §8.2. The permalink: the whole input state of a guide, as a string you can read.
 *
 * **Inputs only, never resolved output.** Devices, template, inspirations, five mood ints, seed,
 * and #161's two optional song overrides — and nothing the resolver produced. §8.2 considered and rejected encoding the output so old
 * links freeze: it is orders of magnitude past any sane URL budget, and it would freeze bugs into
 * shared links as firmly as it freezes intent.
 *
 * **And never a key into storage.** A URL that needs a lookup to resolve is not a permalink, it
 * is a database key with a redirect: it needs a backend v1 does not have, it dies when the
 * storage does, and it turns an anonymous bookmark into retained user data. If links ever get
 * long enough to want shortening, the answer is a shortener that stores *this* self-contained URL
 * and redirects to it — the long form still works forever and the short form is a convenience,
 * never a dependency. Stored state must never become the only representation of a guide.
 *
 * The object that genuinely wants storage is #16's **saved score**, and for an unrelated reason:
 * a score freezes the *resolved output*, so re-resolving it after an engine change is data loss,
 * where a permalink re-resolving is merely drift and is acceptable (§8.2). Different object,
 * different reason. Nothing in this file is a step toward it.
 *
 * This file is pure and device-agnostic, like everything else in `lib/core`. It never imports the
 * registry; the ids it is allowed to accept arrive as a `Catalogue` argument. That is not
 * ceremony — it is what lets "unknown device" be a *decode failure* rather than a silent shrug in
 * the UI, without `lib/core` learning the name of a single box.
 *
 * There is no React here and nothing reads `window`. A caller hands in `location.search`.
 *
 * ## Encoded for growth
 *
 * The field set *will* grow — inspirations, per-device overlays, hint state, whatever comes — so
 * nothing here may assume today's fields are the last ones.
 *
 * - **Self-describing, never positional.** Every value carries its own key: `template=`,
 *   `device=` once per device, each mood axis by its own name. A link written today still decodes
 *   after three fields are added, and a link written tomorrow does not break a decoder that
 *   predates them.
 * - **Unknown keys are dropped, never fatal.** That is the whole point of the choice. They are
 *   also *reported* — `DecodedGuideInputs.dropped` names them — because silently discarding part
 *   of someone's link is the same sin as silently inventing one (invariant 5).
 * - **Two stamps, not one.** See below.
 * - **Debuggable over short.** Whole words, not one-letter keys chosen to save bytes nobody is
 *   short of. Safe URL length is around 2000 characters and a full rig costs a couple of hundred.
 *   If a single field ever genuinely needs packing — a per-device overlay set, say — pack *that
 *   field* and leave the rest legible. Never base64 the whole link to make it look tidy.
 *
 * ## Two stamps, and why they cannot be one
 *
 * - `format=` (`FORMAT_VERSION`) says **what encoding this is**: which fields exist and how they
 *   are read. A format this build cannot read is a hard failure — there is nothing to re-resolve,
 *   because we do not know what we are looking at.
 * - `resolver=` (`RESOLVER_VERSION`, see `pipeline.ts`) says **which engine produced the guide**.
 *   A mismatch is a *successful* decode carrying a drift report: the inputs are perfectly
 *   readable, and §8.2's policy is to re-resolve them under the current engine **while saying
 *   so**. Never silently — the guide under that link is not the guide its author saw.
 *
 * Collapsing them would mean every resolver change made every existing link unparseable, which is
 * the exact opposite of that policy. They also move for unrelated reasons: adding a field changes
 * the format and not the engine; retuning a tie-break changes the engine and not the format.
 */

// ---------------------------------------------------------------------------
// The state
// ---------------------------------------------------------------------------

/**
 * Versions the **encoding**: which fields exist and how they are read. Bump when a field is added
 * whose absence an older decoder could not survive, or when an existing field changes meaning.
 * Adding a field that older decoders can safely ignore does *not* need a bump — that is what
 * forward compatibility buys.
 *
 * Never bumped for a resolver change. That is `RESOLVER_VERSION`.
 */
export const FORMAT_VERSION = 2

/**
 * Formats this build can turn into inputs. **v1 is readable, not merely tolerated**: it is v2
 * minus two optional fields, and v2 reads a v1 link as one with both of them unset — which is
 * exactly what "unset" means (follow the direction), so nothing is guessed and no v1 link dies
 * for a field it predates.
 *
 * A v1 link that carries `bpm` or `key` is a hand-edit of a format that had no such fields. Those
 * keys are dropped and *reported* under v1, which is what a v1 decoder did with them, rather than
 * honoured under rules the link does not claim to follow.
 *
 * Everything is re-encoded at `FORMAT_VERSION`. Canonicalisation has one output, and a v1 link
 * opened and re-shared is a link this build wrote.
 */
export const READABLE_FORMATS: ReadonlySet<number> = new Set([1, FORMAT_VERSION])

/**
 * The tempo override's domain, and the reason it has one: a mechanical guardrail against a typo,
 * not taste. #161 is explicit that the *direction's* range is advisory — going outside it is
 * legal and reported — so the only job left here is stopping a slipped keypress rendering a guide
 * at 900,000 BPM.
 *
 * Unrelated to `MIN_EFFECTIVE_BPM` (§5), which guards a *template spec* against composed
 * inspiration shifts. Different value, different job, and neither one bounds the other.
 */
export const BPM_MIN = 1
export const BPM_MAX = 999

/**
 * The key's only bound, and it is a corruption guard rather than a spelling rule.
 *
 * **A key this build cannot read is carried, not refused.** `parseKey` is the gate on the way
 * *in* — `withKey` and any control refuse what they cannot read, so nothing here writes one —
 * but a link or a stored studio is hand-editable and arrives from anywhere, and rejecting the
 * whole guide over one unreadable field would put a reader in front of nothing at all when the
 * honest answer is a guide with the direction's own key and a line saying why (`key-unreadable`,
 * §5.6). That is invariant 5: reported, never blocked.
 *
 * The length still has to stop somewhere, for the same reason `BPM_MAX` does. The longest key
 * the engine can read is well inside this.
 */
export const KEY_MAX_LENGTH = 32

/**
 * The seed's domain, shared with `components/seed-field.tsx`, which imports it: a permalink that
 * accepts a seed the field cannot show — or the reverse — is a disagreement with no error
 * anywhere.
 */
export const SEED_MIN = 0
export const SEED_MAX = 999_999_999

/**
 * Everything a guide is made of **except the rig**.
 *
 * This split is #16's, not a convenience. There, a rig is `rig(user_id, name)` plus
 * `rig_device(rig_id, device_id, settings)` — devices *and their per-unit overlay*, one mutable
 * object a person edits on a Tuesday. A score is `(rig_snapshot, template_id, inspiration_ids,
 * mood, seed, guide)`. Template, inspirations, mood and seed are therefore score inputs and
 * belong to no rig, which is why they sit in their own type: a saved rig must never be able to
 * acquire a seed, and this is the cheapest way to make that impossible rather than merely
 * discouraged.
 */
export type ScoreInputsV1 = {
  templateId: TemplateId
  /**
   * §5, capped at two. In v1 from the start rather than added later, because adding it later
   * would have stranded every link ever shared.
   */
  inspirations: readonly InspirationId[]
  mood: MoodState
  seed: number
  /**
   * #161. The user's own tempo, absolute and sticky, or `undefined` for "follow the direction".
   *
   * **Absolute rather than an offset from the effective default.** An offset's whole purpose is
   * to stay valid when the range moves under it, and once out-of-range is legal there is nothing
   * left for it to keep valid — an absolute is also the number the musician is thinking in.
   *
   * `undefined` is a real state and not a missing one: it means the authored default, moved by
   * inspirations exactly as it is today. That is why absence here is legal where a missing
   * `seed` is malformed.
   */
  bpm?: number | undefined
  /**
   * #161. The user's own key, or `undefined` for "let the seed pick from what the direction
   * offers".
   *
   * Any key `parseKey` accepts, including one the direction does not list: `template.keys` is a
   * curated list rather than a gate (§4), the hooks resolve against any parseable key, and a
   * direction taken into a mode it does not offer is reported rather than refused (invariant 5).
   *
   * A string `parseKey` *cannot* read is carried here too, and only here — the controls refuse
   * one. See `KEY_MAX_LENGTH` for why a hand-edited link keeps its guide.
   */
  key?: string | undefined
  /**
   * §7.4/#200. The box the reader put in charge of the clock, or `undefined` for "let §7.4 rank
   * one". Carried here because it changes the guide, so invariant 6 makes it an input rather
   * than a view setting: a shared link reproduces the guide its sender saw.
   *
   * A device id is checked against the catalogue like the rig's own ids — an unknown one is
   * corruption, not something to migrate around. Eligibility is *not* checked here: whether the
   * box can send clock is a fact about a build's manifests rather than about the link, and
   * `selectClockSource` already refuses an ineligible id by falling back to the ranking.
   */
  clockSourceId?: DeviceId | undefined
}

/**
 * The complete input state of one guide: score inputs plus the devices they were resolved
 * against. This is what a permalink carries and what `resolve` needs — **not** a rig, and
 * deliberately not named like one. A rig has a name, an id and per-device settings; a link has
 * a flattened list of device ids and nothing to configure them with.
 *
 * `devices` is in **registry order**, not click order. The rig is a set; the resolver's tie-breaks
 * are documented against a stable device order (§7.2), and encoding click order would give two
 * identical rigs two different links.
 */
export type GuideInputsV1 = ScoreInputsV1 & {
  version: typeof FORMAT_VERSION
  devices: readonly DeviceId[]
}

/**
 * What ids this build ships, in registry order. Passed in rather than imported so `lib/core`
 * stays free of `lib/devices` (invariant 2) and so tests can supply a fixture rig.
 *
 * #16: these ids are a **compatibility surface**. The moment a user has stored "voice `sd`
 * disabled", device, voice and pool ids are user data, and renaming one silently breaks their
 * setup. Frozen once shipped — which is also why an unknown id here is treated as corruption
 * rather than as something to migrate around.
 */
export type Catalogue = {
  /** Registry order. Also the canonical order device ids are written in. */
  devices: readonly DeviceId[]
  templates: readonly TemplateId[]
  /** Registry order (§5), which is also the canonical order inspiration ids are written in. */
  inspirations: readonly InspirationId[]
}

// ---------------------------------------------------------------------------
// The wire format
// ---------------------------------------------------------------------------

/**
 * ```
 * format=2&resolver=5&device=polyend-tracker-mini&device=roland-tr-1000&template=industrial-techno
 *   &darkness=50&density=50&grit=50&swing=50&space=50&bpm=140&key=A%20minor&seed=1
 * ```
 *
 * `bpm` and `key` are written only when the user set them (#161); a link without them is a link
 * that follows the direction, which is the majority of links and the entirety of v1's.
 *
 * The two leading numbers are `FORMAT_VERSION` and `RESOLVER_VERSION` as they stand today, not
 * constants of the format: the second moves whenever the engine's output can (#100), and a link
 * carrying an older one still opens — see `drift` below.
 *
 * Whole words. Someone reading that in an address bar can tell what it does, and can change one
 * number and see what happens — worth far more than the twenty bytes short keys would save.
 */
const FORMAT = 'format'
const RESOLVER = 'resolver'
const DEVICE = 'device'
const TEMPLATE = 'template'
const INSPIRATION = 'inspiration'
const BPM = 'bpm'
const KEY = 'key'
const SEED = 'seed'
const CLOCK = 'clock'

/**
 * Repeated once per element, so a list needs no separator character and no escaping — and the
 * hazard a packed list has (with a `.` separator, `50.5` reads as two perfectly valid integers)
 * cannot arise, because there is nothing to split.
 *
 * An empty list is written as *no parameters*, which is also how it reads back. Unlike a scalar,
 * there is no difference between "absent" and "empty" for a list, and inventing one would mean an
 * empty rig had to be spelled with a placeholder nobody could guess.
 */
const REPEATED: readonly string[] = [DEVICE, INSPIRATION]

/** Scalars. Exactly one of each, always — a second occurrence is malformed, not last-wins. */
const SCALARS: readonly string[] = [FORMAT, RESOLVER, TEMPLATE, BPM, KEY, SEED, CLOCK]

/**
 * The scalars a link may simply not have (#161). Every other known scalar is required, because
 * a guide with no seed is a link we cannot honour rather than one with a sensible default — but
 * these two have a meaning for absence that is not a default at all: *follow the direction*.
 * Spelling that with a placeholder would give one state two encodings.
 */
const OPTIONAL_SCALARS: readonly string[] = [BPM, KEY, CLOCK]

/**
 * Every key this build understands. Anything else is dropped and reported (`dropped`), which is
 * the forward-compatibility promise: a link from a future build still works, minus the parts this
 * build has no idea what to do with, and it says which parts those were.
 *
 * Mood axes occupy the top level of this namespace under their own names, so an axis name is a
 * reserved word in the format — a future field may not be called `space`.
 */
const KNOWN: ReadonlySet<string> = new Set<string>([
  ...SCALARS,
  ...REPEATED,
  ...(MOOD_AXES as readonly string[]),
])

/**
 * Ids may be letters, digits and interior hyphens. Narrow on purpose: it keeps a link
 * eyeballable, and it guarantees no id needs percent-encoding or can contain `&` or `=` and split
 * a field in half. `test/permalink.test.ts` asserts every registry id satisfies it, so a future id
 * with a `&` in it fails a test here rather than producing links that decode into something else.
 */
export const PERMALINK_ID = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/

/**
 * The order mood axes are *written* in. Since the format became self-describing this no longer
 * decides meaning — a reordered `MOOD_AXES` changes which bytes come out, not what an existing
 * link says — so it is a canonicalisation rule rather than a compatibility surface.
 *
 * It still has to be complete: an axis missing from here would be silently absent from every link
 * written. `MoodOrderIsComplete` is that guard — adding a sixth `MoodAxis` makes it `never` and
 * fails `tsc` in this file, which is where someone should be made to decide whether the new axis
 * needs `FORMAT_VERSION` bumped (it does if an old link's silence about it cannot be read as
 * neutral).
 */
export const MOOD_ORDER_V1 = ['darkness', 'density', 'grit', 'swing', 'space'] as const satisfies
  readonly MoodAxis[]

type MoodOrderIsComplete =
  Exclude<MoodAxis, (typeof MOOD_ORDER_V1)[number]> extends never ? true : never

const MOOD_ORDER_COVERS_EVERY_AXIS: MoodOrderIsComplete = true
void MOOD_ORDER_COVERS_EVERY_AXIS

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type PermalinkVersions = {
  /** What the link says. */
  encoded: number
  /** What this build is. */
  current: number
}

/**
 * Why a link or a stored document could not be turned into inputs. Four kinds because the UI
 * says four different things: "that link is broken", "that link is from a newer Patchscore",
 * "that link names a box we do not have", "that value is out of range".
 */
export type PermalinkFailure =
  | 'malformed'
  | 'unsupported-version'
  | 'unknown-id'
  | 'out-of-range'

export type DecodedGuideInputs =
  | {
      ok: true
      inputs: GuideInputsV1
      /** The engine that made the link versus the engine about to re-resolve it. */
      resolver: PermalinkVersions
      /**
       * §8.2's warning trigger. `true` means the guide this link produces now is not the guide
       * its author saw — the UI must say so, and must still render it (invariant 5: honest, not
       * hidden). Never resolve a drifted link silently.
       */
      drift: boolean
      /**
       * Keys this build did not understand, unique and in UTF-16 code unit order (§7.2). Empty
       * for a link written by this build.
       *
       * Reported rather than swallowed. Ignoring them is what makes the format survive growth;
       * *saying* they were ignored is what stops a user believing they opened a guide that was
       * never rendered. Re-encoding drops them — this build has no value to write back — so this
       * report is the only trace they existed.
       */
      dropped: readonly string[]
    }
  | {
      ok: false
      reason: PermalinkFailure
      /** One sentence, safe to show. Never contains the raw link. */
      detail: string
      /**
       * Present only for `unsupported-version`, where the useful thing to say is *which* format —
       * "made by a newer Patchscore" reads very differently from "broken link".
       */
      format: PermalinkVersions | undefined
    }

/**
 * Thrown by `encodeGuideInputs` only. Decoding never throws — a bad link is data, not an
 * exception — and neither does anything in `studio-store.ts`.
 */
export class GuideInputsError extends Error {
  readonly reason: PermalinkFailure

  constructor(reason: PermalinkFailure, detail: string) {
    super(detail)
    this.name = 'GuideInputsError'
    this.reason = reason
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Problem = { reason: PermalinkFailure; detail: string }

function isInt(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}

/** UTF-16 code unit order (§7.2). No `localeCompare`, here or anywhere. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * The single gate both directions go through, so an encoder can never emit a link its own
 * decoder would reject. Returns the first problem or `undefined`; order of checks is the order
 * of the fields, so the message names the earliest thing wrong.
 */
/**
 * §7.1/#301. **The most devices a rig may contain, and the reason this exists at all.**
 *
 * The search is exponential in the parts a direction asks for against the assignables a rig
 * offers, and `CLAUDE.md` has had the ruling since #248: *"If the many-device case ever matters,
 * the answer is a selection limit, not a search optimisation."* A cross-device dominance rule
 * changes which optimum comes back at equal score, needs a `RESOLVER_VERSION` bump, and fails
 * silently by handing over a worse allocation. A ceiling on the picker is arithmetic.
 *
 * **What kept forcing the question was a rig nobody owns.** `measure:search` sweeps all 46
 * devices and reports a worst case near the node cap, and that figure has three times been read
 * as a limit the product is approaching — it blocked a device from landing in #248, blocked a
 * test in #293, and nearly blocked a percussion recipe here. It is not a ceiling user rigs
 * approach from below. Measured on rigs people actually have, the same worst case is 173 nodes
 * at four devices, 5,171 at eight, 1,341 at twelve — three to thirteen milliseconds.
 *
 * So the number is not a performance tuning knob and must not be read as one. It is the point
 * past which the catalogue sweep stops being a benchmark and starts being a claim about the
 * product, and setting it makes that claim false by construction.
 *
 * **Ten, chosen as a product decision rather than derived from the search.** It is more boxes
 * than a guide can usefully talk you through at a machine — §8 is a person standing at a rack
 * with their hands busy, not an inventory — and it leaves the measured worst case in the low
 * thousands of nodes, which is milliseconds. Raising it would need a reason from somebody's
 * actual studio, and lowering it would start refusing rigs people have.
 *
 * **It is a picker rule and deliberately not a format rule.** `checkGuideInputs` does not enforce
 * it, and the reason is that patchscore.app is public and a permalink is meant to outlive the
 * build that made it. A link shared when no ceiling existed still names the rig it named; rejecting
 * it would break somebody's saved guide to enforce a limit that is about what is *useful to
 * assemble*, not about what the resolver can handle. Such a rig still resolves — the catalogue
 * sweep is well inside the node cap — it simply cannot be built again from the picker.
 *
 * There is no "select all" in the picker and there must not be one.
 */
export const MAX_RIG_DEVICES = 10

export function checkGuideInputs(
  inputs: GuideInputsV1,
  catalogue: Catalogue,
): Problem | undefined {
  if (inputs.version !== FORMAT_VERSION) {
    return {
      reason: 'unsupported-version',
      detail: `guide inputs format ${String(inputs.version)} is not ${FORMAT_VERSION}`,
    }
  }

  const seenDevice = new Set<DeviceId>()
  for (const id of inputs.devices) {
    if (!PERMALINK_ID.test(id)) {
      return { reason: 'malformed', detail: `device id '${id}' is not a permalink-safe id` }
    }
    if (seenDevice.has(id)) {
      return { reason: 'malformed', detail: `device '${id}' appears twice; a rig is a set` }
    }
    seenDevice.add(id)
    if (!catalogue.devices.includes(id)) {
      return { reason: 'unknown-id', detail: `no device '${id}' in this build` }
    }
  }

  if (!PERMALINK_ID.test(inputs.templateId)) {
    return { reason: 'malformed', detail: `template id is not a permalink-safe id` }
  }
  if (!catalogue.templates.includes(inputs.templateId)) {
    return { reason: 'unknown-id', detail: `no template '${inputs.templateId}' in this build` }
  }

  const seenInspiration = new Set<InspirationId>()
  for (const id of inputs.inspirations) {
    if (!PERMALINK_ID.test(id)) {
      return { reason: 'malformed', detail: `inspiration id '${id}' is not a permalink-safe id` }
    }
    if (seenInspiration.has(id)) {
      return { reason: 'malformed', detail: `inspiration '${id}' appears twice` }
    }
    seenInspiration.add(id)
    // We cannot apply what we do not have, and dropping it silently would render a guide under
    // a link that promised a different one.
    if (!catalogue.inspirations.includes(id)) {
      return { reason: 'unknown-id', detail: `no inspiration '${id}' in this build` }
    }
  }

  // §5's cap, enforced at the boundary rather than only in the UI. A link is hand-editable and
  // arrives from anywhere, so "the checkbox was disabled" is not a guarantee about its contents.
  // Two inspirations that *conflict* are legal here on purpose: composition refuses them by name
  // (§5.3), which is a thing the reader should see rather than a link that will not open.
  if (inputs.inspirations.length > INSPIRATION_CAP) {
    return {
      reason: 'out-of-range',
      detail:
        `at most ${String(INSPIRATION_CAP)} inspirations (§5), got ` +
        String(inputs.inspirations.length),
    }
  }

  for (const axis of MOOD_ORDER_V1) {
    const value = inputs.mood[axis]
    if (!isInt(value, 0, 100)) {
      return {
        reason: 'out-of-range',
        detail: `mood '${axis}' must be a whole number 0-100, got ${String(value)}`,
      }
    }
  }

  if (!isInt(inputs.seed, SEED_MIN, SEED_MAX)) {
    return {
      reason: 'out-of-range',
      detail: `seed must be a whole number ${SEED_MIN}-${SEED_MAX}, got ${String(inputs.seed)}`,
    }
  }

  // #161. Both overrides are optional; `undefined` is the unset state and always legal.
  if (inputs.bpm !== undefined && !isInt(inputs.bpm, BPM_MIN, BPM_MAX)) {
    return {
      reason: 'out-of-range',
      detail: `bpm must be a whole number ${BPM_MIN}-${BPM_MAX}, got ${String(inputs.bpm)}`,
    }
  }

  // Deliberately *not* `parseKey`. A key outside the direction's list and a key the engine
  // cannot read at all are both carried through to the resolver, which uses the first and
  // reports both (§5.6). Only the length is a boundary here — see `KEY_MAX_LENGTH`.
  if (inputs.key !== undefined && inputs.key.length > KEY_MAX_LENGTH) {
    return {
      reason: 'out-of-range',
      detail: `key must be at most ${KEY_MAX_LENGTH} characters, got ${String(inputs.key.length)}`,
    }
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------

/**
 * Inputs -> query string, without the leading `?`.
 *
 * **Canonical.** Two inputs that mean the same guide produce byte-identical strings: devices are
 * written in registry order whatever order they arrived in, the fields are always in the same
 * order, and mood is always written in full. That is what makes an encode-decode-encode fixed
 * point testable, and what stops one guide having two links.
 *
 * It writes **only understood state**. A link decoded with unknown fields re-encodes without
 * them — this build has no value to write back — which is why `dropped` is reported at decode
 * time rather than left for someone to spot in the address bar.
 *
 * Throws `GuideInputsError` on inputs this build could not decode back. Encoding is not user
 * input — the caller holds inputs it built, or inputs that already survived `decodeGuideInputs` —
 * so a failure here is a bug, and emitting a link that silently means something else is the worse
 * of the two ways to handle it.
 */
export function encodeGuideInputs(inputs: GuideInputsV1, catalogue: Catalogue): string {
  const problem = checkGuideInputs(inputs, catalogue)
  if (problem !== undefined) throw new GuideInputsError(problem.reason, problem.detail)

  const order = new Map(catalogue.devices.map((id, index) => [id, index]))
  const devices = [...inputs.devices].sort(
    (a, b) => (order.get(a) as number) - (order.get(b) as number),
  )

  // Inspirations get the same treatment for the same reason: the selection is a set, §5 composes
  // it in canonical id order whatever order it arrives in, and encoding click order would give
  // one guide two links.
  const inspirationOrder = new Map(catalogue.inspirations.map((id, index) => [id, index]))
  const inspirations = [...inputs.inspirations].sort(
    (a, b) => (inspirationOrder.get(a) as number) - (inspirationOrder.get(b) as number),
  )

  const parts: string[] = [
    `${FORMAT}=${FORMAT_VERSION}`,
    `${RESOLVER}=${RESOLVER_VERSION}`,
    ...devices.map((id) => `${DEVICE}=${id}`),
    `${TEMPLATE}=${inputs.templateId}`,
    ...inspirations.map((id) => `${INSPIRATION}=${id}`),
    ...MOOD_ORDER_V1.map((axis) => `${axis}=${inputs.mood[axis]}`),
    // #161. Written only when set: an unset override is *absent*, which is how it reads back.
    ...(inputs.bpm === undefined ? [] : [`${BPM}=${inputs.bpm}`]),
    ...(inputs.clockSourceId === undefined ? [] : [`${CLOCK}=${inputs.clockSourceId}`]),
    // The one value in the format that needs escaping. A key holds a space and may hold a `#`,
    // which is a fragment delimiter and would truncate the link at it — `PERMALINK_ID` exists
    // partly so ids never need this, and a key is not an id. `decodeURIComponent` on the way
    // back in is already there for both halves of every pair.
    ...(inputs.key === undefined ? [] : [`${KEY}=${encodeURIComponent(inputs.key)}`]),
    `${SEED}=${inputs.seed}`,
  ]

  return parts.join('&')
}

// ---------------------------------------------------------------------------
// Decode
// ---------------------------------------------------------------------------

function fail(reason: PermalinkFailure, detail: string): DecodedGuideInputs {
  return { ok: false, reason, detail, format: undefined }
}

/**
 * Strict integer: digits only, no sign, no leading zero, no exponent, no whitespace. Anything
 * `Number()` would cheerfully accept but this build would never emit — `+1`, `1e3`, ` 1`, `01`,
 * `0x10` — is malformed, so the format has exactly one spelling of every value.
 */
function parseInt10(text: string): number | undefined {
  if (!/^(?:0|[1-9][0-9]*)$/.test(text)) return undefined
  const value = Number(text)
  return Number.isSafeInteger(value) ? value : undefined
}

/**
 * Query string -> inputs, or a reason it is not any. **Never throws and never returns partial
 * inputs**: the caller's fallback is its own default rig, and this returning "here is most of it"
 * would put the user in front of a guide they did not ask for under a link that claims otherwise.
 *
 * Accepts an optional leading `?`, so `location.search` can be passed straight in.
 *
 * Three things are deliberately *not* symmetrical:
 *
 * - An **unknown key** is dropped and reported. The format is meant to grow.
 * - A **missing known scalar** is malformed. A guide with no seed, or no `grit`, is not a guide
 *   with a sensible default — it is a link we cannot honour, and quietly substituting neutral
 *   would render something its author never saw.
 * - A **repeated known scalar** is malformed rather than last-wins. Two seeds in one link is a
 *   link that means two things, and picking one of them is guessing.
 *
 * A readable link made by an older engine decodes **successfully** with `drift: true`. That is
 * §8.2's policy in one line: re-resolve supported input under the current engine, warn, never
 * silently.
 */
export function decodeGuideInputs(text: string, catalogue: Catalogue): DecodedGuideInputs {
  const query = text.startsWith('?') ? text.slice(1) : text
  if (query === '') return fail('malformed', 'empty permalink')

  const scalars = new Map<string, string>()
  const lists = new Map<string, string[]>(REPEATED.map((key) => [key, []]))
  const dropped = new Set<string>()

  for (const pair of query.split('&')) {
    const eq = pair.indexOf('=')
    if (eq <= 0) return fail('malformed', `'${pair}' is not a field=value pair`)
    const rawKey = pair.slice(0, eq)
    const raw = pair.slice(eq + 1)

    /**
     * **Both halves are decoded, not just the value.** `?%73eed=1` is a legal spelling of
     * `?seed=1` — nothing normalises percent-encoding between an address bar and this function,
     * and a chat client or a redirect may hand one over.
     *
     * Reading the key raw was a real disagreement rather than a nicety (#99). The server reaches
     * this through `queryFromSearchParams`, which re-encodes a key the framework has *already*
     * decoded, so `%73eed` arrives here spelled `seed` and the guide resolves; the client passes
     * `location.search` in untouched, so the same link arrived spelled `%73eed`, was dropped as
     * an unknown field, and then failed as a link with no seed. One URL, a guide on the server
     * and a broken link on the client, with no error on either side to say why.
     *
     * The format still has exactly one spelling it *writes* — `encodeGuideInputs` emits plain
     * keys, always — so this is leniency on the way in only, which is where a link that has been
     * through somebody else's software needs it.
     */
    let key: string
    let value: string
    try {
      key = decodeURIComponent(rawKey)
      value = decodeURIComponent(raw)
    } catch {
      return fail('malformed', `field '${rawKey}' is not valid percent-encoding`)
    }

    if (!KNOWN.has(key)) {
      // The forward-compatibility promise. Not an error — and not silent either.
      dropped.add(key)
      continue
    }

    if (REPEATED.includes(key)) {
      ;(lists.get(key) as string[]).push(value)
      continue
    }

    if (scalars.has(key)) return fail('malformed', `field '${key}' appears twice`)
    scalars.set(key, value)
  }

  const format = scalars.get(FORMAT)
  if (format === undefined) return fail('malformed', `missing field '${FORMAT}'`)
  const formatVersion = parseInt10(format)
  if (formatVersion === undefined) {
    return fail('malformed', `field '${FORMAT}' is not a whole number`)
  }
  if (!READABLE_FORMATS.has(formatVersion)) {
    return {
      ok: false,
      reason: 'unsupported-version',
      detail: `this link is format v${formatVersion}; this build reads v${FORMAT_VERSION}`,
      format: { encoded: formatVersion, current: FORMAT_VERSION },
    }
  }

  // #161. A field the *link's own format* does not have is not a field of that link, however
  // well this build understands the spelling. Under v1 the two overrides are unknown keys, so
  // they take the unknown-key path: dropped, and reported as dropped.
  if (formatVersion < FORMAT_VERSION) {
    for (const optional of OPTIONAL_SCALARS) {
      if (scalars.delete(optional)) dropped.add(optional)
    }
  }

  const resolver = scalars.get(RESOLVER)
  if (resolver === undefined) return fail('malformed', `missing field '${RESOLVER}'`)
  const encodedResolver = parseInt10(resolver)
  if (encodedResolver === undefined) {
    return fail('malformed', `field '${RESOLVER}' is not a whole number`)
  }

  const templateId = scalars.get(TEMPLATE)
  if (templateId === undefined) return fail('malformed', `missing field '${TEMPLATE}'`)

  const mood: Record<string, number> = {}
  for (const axis of MOOD_ORDER_V1) {
    const raw = scalars.get(axis)
    if (raw === undefined) return fail('malformed', `missing mood axis '${axis}'`)
    const value = parseInt10(raw)
    if (value === undefined) return fail('malformed', `mood '${axis}' is not a whole number`)
    mood[axis] = value
  }

  const seedText = scalars.get(SEED)
  if (seedText === undefined) return fail('malformed', `missing field '${SEED}'`)
  const seed = parseInt10(seedText)
  if (seed === undefined) return fail('malformed', `field '${SEED}' is not a whole number`)

  // #161. Absent is the unset state, so there is nothing to fail on. Present-but-unreadable is
  // still malformed: `bpm=fast` is a link that says something this build cannot honour, and
  // quietly reading it as "follow the direction" would render a tempo its author did not ask
  // for under a link that names one.
  const bpmText = scalars.get(BPM)
  let bpm: number | undefined
  if (bpmText !== undefined) {
    bpm = parseInt10(bpmText)
    if (bpm === undefined) return fail('malformed', `field '${BPM}' is not a whole number`)
  }

  // Already percent-decoded above, along with every other value.
  const key = scalars.get(KEY)

  // #200. Checked against the catalogue exactly as the rig's ids are: an id this build does not
  // ship is corruption rather than something to migrate around. Whether the box can *send* clock
  // is deliberately not checked — that is a fact about manifests, and `selectClockSource` answers
  // it by falling back to the ranking rather than by rejecting the link.
  const clockSourceId = scalars.get(CLOCK)
  if (clockSourceId !== undefined && !catalogue.devices.includes(clockSourceId)) {
    return fail('malformed', `field '${CLOCK}' names a device this build does not ship`)
  }

  const inputs: GuideInputsV1 = {
    version: FORMAT_VERSION,
    devices: lists.get(DEVICE) as string[],
    templateId,
    inspirations: lists.get(INSPIRATION) as string[],
    mood: mood as MoodState,
    seed,
    ...(bpm === undefined ? {} : { bpm }),
    ...(key === undefined ? {} : { key }),
    ...(clockSourceId === undefined ? {} : { clockSourceId }),
  }

  // Everything above was syntax. This is meaning: ids this build has, numbers in their domain.
  const problem = checkGuideInputs(inputs, catalogue)
  if (problem !== undefined) return fail(problem.reason, problem.detail)

  return {
    ok: true,
    inputs,
    resolver: { encoded: encodedResolver, current: RESOLVER_VERSION },
    drift: encodedResolver !== RESOLVER_VERSION,
    dropped: [...dropped].sort(byCodeUnit),
  }
}
