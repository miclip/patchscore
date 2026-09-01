import {
  BPM_MAX,
  BPM_MIN,
  DENSITY_DETENTS,
  FORMAT_VERSION,
  INSPIRATION_CAP,
  MAX_RIG_DEVICES,
  SEED_MAX,
  SEED_MIN,
  applyInspirations,
  decodeGuideInputs,
  encodeGuideInputs,
  guideInputsFrom,
  hash32,
  loadStudio,
  moodState,
  parseKey,
  advanceHistory,
  saveStudio,
  studioDoc,
} from '@/lib/core'
import type {
  Catalogue,
  DeviceId,
  Inspiration,
  InspirationApplication,
  InspirationId,
  GuideInputsV1,
  MoodAxis,
  MoodState,
  SongOverrides,
  StorageSource,
  StoredRigV1,
  TemplateId,
} from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { INSPIRATIONS } from '@/lib/inspirations'
import { TEMPLATES, templateById } from '@/lib/templates'

/**
 * Everything the Studio does that involves the browser, with the browser injected.
 *
 * The component keeps state and renders; this decides *what the state should be* on arrival and
 * what should be written when it changes. The split is not tidiness — it is what makes any of
 * this testable. Vitest runs in `node` (`vitest.config.ts`), deliberately: the resolver has no
 * DOM and adding jsdom to the suite to cover four lines of `window` access would be a large,
 * permanent dependency bought for a small, temporary convenience. Narrow injected interfaces
 * cover the same ground with four-line fakes.
 *
 * **Nothing here is called during render.** `location`, `localStorage` and `history` are read in
 * effects and event handlers only. That is what keeps the server's markup and the client's first
 * markup identical: the first frame is a pure function of the `initialInputs` prop, which the
 * server decoded from the query string (#99, `lib/studio/entry.ts`) and which both sides
 * therefore hold before either renders. Storage gets its say afterwards.
 * `test/studio-render.test.ts` renders this component in Node, where `window` does not exist at
 * all — so a stray read during render is a thrown error rather than a hydration mismatch nobody
 * notices.
 */

// ---------------------------------------------------------------------------
// The catalogue and the deterministic default
// ---------------------------------------------------------------------------

/** What this build ships. Built once — it is a pure function of the registry. */
export const CATALOGUE: Catalogue = {
  devices: DEVICES.map((d) => d.id),
  templates: TEMPLATES.map((t) => t.id),
  inspirations: INSPIRATIONS.map((i) => i.id),
}

/**
 * The direction a first-time visitor lands on, named rather than derived.
 *
 * It used to be `CATALOGUE.templates[0]`, which reads as a sensible default and is not one: the
 * registry is ordered by id (§7.2), so that expression means "whichever genre sorts first", and
 * the day a template called `ambient-dub` was authored the landing page silently changed genre.
 * A default that moves when an unrelated file is added is a default nobody chose.
 *
 * Industrial Techno because it is the template proven end to end (§11 step 6) and the one with
 * the most authored content behind it — the widest set of parts a rig can actually fill.
 */
const LANDING_TEMPLATE: TemplateId = 'industrial-techno'

/**
 * The rig a first-time visitor lands on (#61). **Two boxes, named, not the whole catalogue.**
 *
 * Every device used to be checked. That was defensible at three devices and is not now: it
 * presumes the visitor owns everything, and the first guide they read is therefore not about
 * their rig, which is the entire premise. `CATALOGUE.devices` also grows on its own, so the
 * landing rig quietly changed shape every time a manifest was authored.
 *
 * Two is the smallest rig that shows what the product *is*. One box has no clock source to
 * choose among, nothing for the rack to cable, and a voice phase that collapses to "everything
 * goes here" — the three things the guide exists to work out. A **groovebox plus a drum
 * machine** is the most legible pair: the drum machine takes percussion, the groovebox takes the
 * tonal roles, and the split is obvious at a glance. It fills most of the direction's parts and
 * still gaps several, which is the product demonstrating both halves of itself — a guide worth
 * reading, and invariant 5's honesty about what a rig cannot cover.
 *
 * The Tracker Mini and the TR-1000 are that pair among what is authored today. #61 asks for
 * *cheap* boxes, and the TR-1000 is not one — it is the flagship. There is no inexpensive drum
 * machine in the library yet; when an MC-101 or a TR-6S lands, this constant is the one line to
 * change, which is why it is a constant.
 *
 * Filtered through the catalogue so the order is registry order (§7.2) and an id that ever stops
 * existing drops out instead of shipping a landing rig that names a device this build does not
 * have. `test/studio-session.test.ts` asserts the pair survives that filter, so a typo is a
 * failing test rather than a silently smaller default.
 */
const LANDING_DEVICES: readonly DeviceId[] = ['polyend-tracker-mini', 'roland-tr-1000']

/**
 * The seed a rig and a direction get when nobody has chosen one (#127).
 *
 * **Derived from the inputs, not a constant and not a draw.** `seed: 1` meant every visitor who
 * had not touched the seed field saw the same guide for a given rig — and, worse, the *whole
 * library* shared one arbitrary starting point, so the variety the engine exists for was
 * invisible on first contact. A hash of the rig and the direction gives every pair its own
 * character while keeping every property a constant had:
 *
 * - **Deterministic** (invariant 6). Same devices and direction, same seed, on any machine and
 *   in any year: FNV-1a over UTF-16 code units, and integer arithmetic the whole way. Nothing
 *   here reads the clock, the URL, storage, or `Math.random`.
 * - **The same first frame on the server and the client.** It is a pure function of two fields
 *   of the inputs both sides already hold before either renders (#99).
 * - **Cacheable, with a stable preview card.** A per-request random seed was considered and
 *   turned down in #127: it would make `/` uncacheable and give a bare link a different OG card
 *   on every fetch, for variety the Reroll button already provides on demand.
 *
 * Three details are load-bearing, and each of them fails silently rather than loudly:
 *
 * - **Device order must not matter.** A rig is a set; ticking the Tracker Mini before the TR-1000
 *   is the same rig as the reverse, and would otherwise be a second identity with a second
 *   permalink. The list is *copied* before sorting — `sort` mutates, and `inputs.devices` is not
 *   ours — and ordered by UTF-16 code unit rather than `localeCompare`, which varies by platform
 *   and ambient locale.
 * - **Length prefixes, so the serialization is unambiguous.** Without them `['ab','c']` and
 *   `['a','bc']` hash the same, and a device id containing the separator would collide with a
 *   different rig. Labels for the same reason: the device list and the template id cannot run
 *   into each other.
 * - **The result stays inside the seed field's domain.** `SEED_MIN`/`SEED_MAX` are shared with
 *   `components/seed-field.tsx` and `lib/core/permalink.ts`; a derived default outside that range
 *   would be a disagreement with no error path — the field could not show it and the permalink
 *   validator would reject a link the app itself minted.
 *
 * The mood and the inspirations are deliberately *not* in the hash. Dragging a knob would
 * otherwise reroll the guide underneath the hand doing the dragging, which is the reroll
 * control's job and not a knob's.
 */
export function derivedSeed(devices: readonly DeviceId[], templateId: TemplateId): number {
  const ordered = [...devices].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const serialized = [
    `devices:${ordered.length}`,
    ...ordered.map((id) => `${id.length}:${id}`),
    `template:${templateId.length}:${templateId}`,
  ].join('|')
  return SEED_MIN + (hash32(serialized) % (SEED_MAX - SEED_MIN + 1))
}

/**
 * Not a draw and not a read: `seed` aside, every field here is a constant, and the seed is a pure
 * function of two of them (see `derivedSeed`). The server and the client must render the same
 * first frame, so nothing here may depend on the URL, on storage, or on the clock.
 */
export const DEFAULT_INPUTS: GuideInputsV1 = {
  version: FORMAT_VERSION,
  devices: CATALOGUE.devices.filter((id) => LANDING_DEVICES.includes(id)),
  templateId: LANDING_TEMPLATE,
  inspirations: [],
  /**
   * **No mood, which is not the same as a neutral one** (#310). Absent means "open at whatever
   * the direction states", so the landing page opens at the direction's own feel and follows it
   * when the visitor picks another one — where a mood written here would be a reader's choice
   * nobody made, sticky from the first frame, and would silence every direction's opening mood
   * for exactly the visitors who have not touched anything.
   *
   * It is byte-identical for a direction that states none: §6.3's density neutral is the middle
   * detent, `DENSITY_DETENTS[1]` is 50, and 50 is `NEUTRAL_MOOD`'s value for every axis — so
   * what used to be written here is what `moodState()` returns. Asserted in
   * `test/template-mood.test.ts` rather than left as arithmetic in a comment.
   */
  seed: derivedSeed(
    CATALOGUE.devices.filter((id) => LANDING_DEVICES.includes(id)),
    LANDING_TEMPLATE,
  ),
}

// ---------------------------------------------------------------------------
// The injected browser
// ---------------------------------------------------------------------------

export type LocationLike = { search: string; pathname: string; href: string }
export type HistoryLike = { replaceState(data: unknown, unused: string, url: string): void }
export type ClipboardLike = { writeText(text: string): Promise<void> }

/** One file, handed to the browser to save. Text only — nothing here builds a binary. */
export type DownloadFile = { name: string; text: string; type: string }

/**
 * Two capabilities rather than two DOM APIs. `lib/studio/export.ts` knows it wants "save this
 * text" and "open the print dialog"; only `browser-env.ts` knows those mean an anchor element
 * with a blob URL and `window.print()`. That is what lets both be tested in Node with a spy.
 */
export type DownloadLike = (file: DownloadFile) => void
export type PrintLike = () => void

/**
 * Every member is a thunk for the reason `StorageSource` is: reaching for `window.localStorage`
 * can throw on access alone when site data is blocked, and under SSR there is no `window` to
 * reach for. A thunk puts the access inside this file's `try`, where it can be reported instead
 * of thrown at a caller who has nothing useful to do with it.
 */
export type StudioEnv = {
  storage: StorageSource
  location: () => LocationLike | null | undefined
  history: () => HistoryLike | null | undefined
  clipboard: () => ClipboardLike | null | undefined
  download: () => DownloadLike | null | undefined
  print: () => PrintLike | null | undefined
}

// ---------------------------------------------------------------------------
// Notices
// ---------------------------------------------------------------------------

/**
 * Things the user is told, and none of them stop the guide rendering.
 *
 * A link made by an older resolver is deliberately NOT among them. `decodeGuideInputs` still
 * reports `drift` and §8.2's reasoning still holds — the inputs are intact and the guide is
 * re-worked with the current engine — but nothing has been shared yet, so there is no reader
 * for whom that sentence is the difference between trusting the page and not. The detection
 * stays; the notice is what a public build wants, not this one.
 */
export type NoticeKind =
  | 'link-dropped-fields'
  | 'link-unreadable'
  | 'link-newer'
  | 'stored-unreadable'
  | 'storage-unavailable'

export type StudioNotice = { kind: NoticeKind; message: string }

export type Bootstrap = {
  inputs: GuideInputsV1
  /**
   * The rig the inputs came out of, when they came from storage — carried so a later save keeps
   * its id, its name and its per-device settings. `undefined` after a link or a cold start,
   * where there is no rig to preserve and one is created on the first save.
   */
  rig: StoredRigV1 | undefined
  /**
   * §8.2/#304. Rigs the visitor had before this one, newest first — read once on entry.
   *
   * Empty after a link, and deliberately: a shared guide is somebody else's, and offering to
   * swap the reader's own past rigs into it would be the page acting on a studio this session
   * is not allowed to write to (see `persist` below). Their history is intact when they come
   * back to the bare root.
   */
  recent: readonly StoredRigV1[]
  source: 'link' | 'storage' | 'default'
  /**
   * Whether this session may write to local storage — **false for the whole session** when the
   * inputs came from a valid permalink.
   *
   * Opening a shared link is looking at somebody else's guide. It is not a decision to replace
   * your own rig, and the URL being canonicalised on arrival is a display detail, not consent.
   * Without this, clicking a link in a chat window silently overwrote the visitor's rig and
   * score inputs before they had touched anything.
   *
   * It stays false after they reroll or edit, because those are still edits *to the shared
   * guide*, not to their studio. Nothing is lost by that: the address bar keeps up with every
   * change, so reloading restores the link session exactly, and going to the bare root brings
   * their own studio back untouched.
   */
  persist: boolean
  notices: StudioNotice[]
}

// ---------------------------------------------------------------------------
// The starter example (#61)
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/**
 * What the studio should show, on arrival. **Link, then store, then defaults.**
 *
 * A link beats the store because a link is an explicit act by whoever sent it — someone opening
 * a shared guide wants that guide, not the one they were last working on. A *broken* link does
 * not beat the store: it says so and falls through, because "your studio is gone" is a worse
 * answer to a mistyped URL than "that link could not be read".
 *
 * Never throws, and never returns half a studio.
 */
export function bootstrapStudio(
  env: StudioEnv,
  catalogue: Catalogue = CATALOGUE,
  fallback: GuideInputsV1 = DEFAULT_INPUTS,
): Bootstrap {
  const notices: StudioNotice[] = []

  let search = ''
  try {
    search = env.location()?.search ?? ''
  } catch {
    // A location we cannot read is not worth a notice: there is simply no link to honour.
    search = ''
  }

  if (search !== '' && search !== '?') {
    const decoded = decodeGuideInputs(search, catalogue)
    if (decoded.ok) {
      if (decoded.dropped.length > 0) {
        // The other half of forward compatibility. The link worked, which is the point — but
        // part of it did not survive the trip, and the user is told rather than left to wonder
        // why the guide is not quite the one they were sent. The address bar will not show it
        // either: the first sync rewrites the URL with only the fields this build understands.
        const names = decoded.dropped.join(', ')
        notices.push({
          kind: 'link-dropped-fields',
          message:
            `This link was made by a newer version of Patchscore. It opened, but ` +
            `${decoded.dropped.length} setting${decoded.dropped.length === 1 ? '' : 's'} this ` +
            `version does not understand ${decoded.dropped.length === 1 ? 'was' : 'were'} ` +
            `ignored: ${names}.`,
        })
      }
      // A link carries device ids, not a rig — and nothing here creates one. This session is
      // read-only against storage from now on (`persist: false`); the visitor's own rig is left
      // exactly where it was, unread and unwritten.
      // #304: no history either. This session may not write storage, so offering to swap in a
      // rig from it would be the page acting on a studio it is not allowed to touch.
      return {
        inputs: decoded.inputs,
        rig: undefined,
        recent: [],
        source: 'link',
        persist: false,
        notices,
      }
    }

    notices.push(
      decoded.reason === 'unsupported-version'
        ? {
            kind: 'link-newer',
            message: `That link was made by a newer version of Patchscore (${decoded.detail}). Showing your own studio instead.`,
          }
        : {
            kind: 'link-unreadable',
            message: `That link could not be read — ${decoded.detail}. Showing your own studio instead.`,
          },
    )
  }

  // Everything below is the visitor's own studio — including the fall-through from a *broken*
  // link, which is a normal session that happened to be reached by a bad URL. Those persist.
  const stored = loadStudio(env.storage, catalogue)
  if (stored.status === 'ok') {
    return {
      inputs: guideInputsFrom(stored.doc),
      rig: stored.doc.rig,
      recent: stored.doc.recent ?? [],
      source: 'storage',
      persist: true,
      notices,
    }
  }

  if (stored.status === 'invalid') {
    notices.push({
      kind: 'stored-unreadable',
      message: `Your saved studio could not be read — ${stored.detail}. Starting from the default one.`,
    })
  } else if (stored.status === 'unavailable') {
    notices.push({ kind: 'storage-unavailable', message: STORAGE_UNAVAILABLE })
  }

  return { inputs: fallback, rig: undefined, recent: [], source: 'default', persist: true, notices }
}

const STORAGE_UNAVAILABLE =
  'This browser will not let Patchscore save anything, so your rig and settings will not be ' +
  'here next time. The link still works — copy it to keep this guide.'

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

export type SyncReport = {
  /** The canonical query, always — even when there was no `history` to write it to. */
  query: string
  /** The URL now in the address bar, when it could be read back. */
  href: string | undefined
  /** Whether a storage write was even attempted. `false` for a shared-link session. */
  persisted: boolean
  /** `undefined` when nothing was written because there was nothing to write to. */
  notice: StudioNotice | undefined
}

export type SyncOptions = {
  /**
   * `false` canonicalises the URL and writes nothing. Carried from `Bootstrap.persist`, which
   * is the only thing that decides it — see there for why a shared link is read-only.
   */
  persist?: boolean
  catalogue?: Catalogue
}

/**
 * Write the current inputs everywhere they belong: the address bar and the store.
 *
 * `history.replaceState`, never `pushState` and never a router navigation. Every knob turn would
 * otherwise be a back-button entry, and a re-render of the page under a live guide would throw
 * away the scroll position of someone reading step 12 at their machine. Replace is the whole
 * point: the URL keeps up, and nothing else moves.
 *
 * Never throws.
 */
export function syncStudio(
  env: StudioEnv,
  inputs: GuideInputsV1,
  rig: StoredRigV1 | undefined,
  options: SyncOptions = {},
): SyncReport {
  const catalogue = options.catalogue ?? CATALOGUE
  const persist = options.persist ?? true
  const query = encodeGuideInputs(inputs, catalogue)

  let href: string | undefined
  try {
    const history = env.history()
    const location = env.location()
    if (history !== null && history !== undefined && location !== null && location !== undefined) {
      history.replaceState(null, '', `${location.pathname}?${query}`)
      href = env.location()?.href
    }
  } catch {
    // An address bar we cannot write is cosmetic. The guide is on screen and Copy link can still
    // build a URL from the query; nothing here is worth interrupting the user for.
    href = undefined
  }

  // The URL is canonicalised either way — it is how the guide on screen is addressed, and a
  // stale address bar is its own bug. Storage is the part that is somebody's property.
  if (!persist) return { query, href, persisted: false, notice: undefined }

  /**
   * #304. The history is computed from what is on disk rather than carried through the sync
   * path, because the question — what rig was here before this edit — is answered by the store
   * and by the new device list, and nothing in between needs to know about it.
   *
   * A `loadStudio` that comes back anything other than `ok` yields no history and no error: a
   * document that cannot be read is already reported by the load path on entry, and losing a
   * shortcut list is not worth a second notice over the guide somebody is reading.
   */
  const stored = loadStudio(env.storage, catalogue)
  const recent = advanceHistory(stored.status === 'ok' ? stored.doc : undefined, inputs.devices)

  const saved = saveStudio(env.storage, studioDoc(inputs, rig, recent), catalogue)
  const notice: StudioNotice | undefined =
    saved.status === 'unavailable'
      ? { kind: 'storage-unavailable', message: STORAGE_UNAVAILABLE }
      : saved.status === 'invalid'
        ? {
            kind: 'stored-unreadable',
            message: `Your studio could not be saved — ${saved.detail}.`,
          }
        : undefined

  return { query, href, persisted: true, notice }
}

// ---------------------------------------------------------------------------
// Sync, on a trailing edge
// ---------------------------------------------------------------------------

/**
 * How long after the last change the sync runs. 300ms is under the threshold at which a person
 * notices the address bar lagging, and long enough that no plausible drag fires twice.
 */
export const SYNC_DEBOUNCE_MS = 300

/**
 * A queued `syncStudio`, on a **trailing edge**: while the inputs keep changing nothing is
 * written, and one write happens once they stop.
 *
 * ### Why this exists
 *
 * `syncStudio` writes two things per call — `history.replaceState` and a synchronous
 * `localStorage.setItem` — and the studio called it once per input change, straight out of an
 * effect keyed on the inputs. A knob drag changes the inputs on every pointer move, so a
 * two-second drag on a phone was a couple of hundred writes.
 *
 * **WebKit throws for that.** Safari and every iOS browser (Brave included — they are all
 * WebKit) rate-limit `replaceState` and raise a `SecurityError` at roughly 100 calls per 30
 * seconds. An uncaught one during a render kills the page: "This page could not load".
 *
 * Measured in the dev build before the fix, each input change produced **two** `replaceState`
 * calls rather than one: ours, and then one from Next's App Router reacting to the URL we had
 * just changed. So the budget was reached twice as fast as the call site suggests, and
 * debouncing our call is what removes both — Next's is downstream of it.
 *
 * ### Why trailing-edge, and not a throttle
 *
 * A throttle at 4/sec still reaches 120 calls in 30 seconds and would keep crashing during a
 * long drag. A trailing debounce fires **zero** times while a drag is moving and exactly once
 * after it stops, which is the property that actually bounds the rate.
 *
 * ### What is not debounced
 *
 * `resolve` — deliberately. The guide tracks the knob live, because that is the whole point of
 * the control; it is pure, single-digit milliseconds, and writes nothing. It is the URL and the
 * store that have no business updating mid-drag.
 *
 * ### What is guaranteed
 *
 * The queued payload is **replaced**, never accumulated: whatever was scheduled last is what
 * runs, so the address bar and the store end up at the final inputs rather than one change
 * stale. A single change — a typed number, the reroll button — is not swallowed; it is simply
 * written 300ms later.
 */
export type SyncScheduler = {
  /** Queue a sync, replacing any already queued. */
  schedule(inputs: GuideInputsV1, rig: StoredRigV1 | undefined, options?: SyncOptions): void
  /** Run a queued sync now, if there is one. Used on unmount, so nothing queued is lost. */
  flush(): void
  /** Drop a queued sync without running it. */
  cancel(): void
  /** Whether a sync is waiting. For tests and for a caller that wants to know. */
  pending(): boolean
}

type Queued = {
  inputs: GuideInputsV1
  rig: StoredRigV1 | undefined
  options: SyncOptions
}

/**
 * `setTimeout` off the global, not injected. The whole module is otherwise built around
 * injected capabilities, and this is the one place that is not worth it: `vi.useFakeTimers()`
 * already replaces the global pair, so the regression test can drive this exactly, and a
 * `TimerLike` parameter would be a seam nothing else in the codebase needs.
 */
export function createStudioSync(
  env: StudioEnv,
  onReport: (report: SyncReport) => void,
  delayMs: number = SYNC_DEBOUNCE_MS,
): SyncScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined
  let queued: Queued | undefined

  function run(): void {
    timer = undefined
    const next = queued
    queued = undefined
    if (next === undefined) return
    // `syncStudio` never throws; `onReport` is the caller's, so it is not wrapped here — a
    // caller that throws in its own callback should see that, not have it swallowed by a timer.
    onReport(syncStudio(env, next.inputs, next.rig, next.options))
  }

  return {
    schedule(inputs, rig, options = {}) {
      queued = { inputs, rig, options }
      // Restarting the timer is what makes this trailing rather than leading: a change during
      // the window pushes the write out, it does not add one.
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(run, delayMs)
    },
    flush() {
      if (timer !== undefined) clearTimeout(timer)
      run()
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      queued = undefined
    },
    pending() {
      return queued !== undefined
    },
  }
}

// ---------------------------------------------------------------------------
// Copy link
// ---------------------------------------------------------------------------

export type CopyResult = { ok: true; url: string } | { ok: false; message: string }

/**
 * Copy the URL that is *already in the address bar*, rather than building a second one here.
 * Two constructions of "the link to this guide" is two things that can disagree, and the one the
 * user can see is the one that has to be right.
 *
 * Honest about failure: the clipboard is unavailable outside a secure context and can reject for
 * reasons this code cannot fix. Saying "Copied" when nothing was copied costs someone the guide
 * they thought they had saved.
 */
export async function copyStudioLink(env: StudioEnv): Promise<CopyResult> {
  let url: string
  try {
    const href = env.location()?.href
    if (href === undefined || href === '') {
      return { ok: false, message: 'No link to copy yet.' }
    }
    url = href
  } catch {
    return { ok: false, message: 'No link to copy yet.' }
  }

  try {
    const clipboard = env.clipboard()
    if (clipboard === null || clipboard === undefined) {
      return { ok: false, message: 'This browser will not let the page copy. Copy from the address bar.' }
    }
    await clipboard.writeText(url)
  } catch {
    return { ok: false, message: 'Copying was blocked. Copy from the address bar instead.' }
  }

  return { ok: true, url }
}

// ---------------------------------------------------------------------------
// Pure updates
// ---------------------------------------------------------------------------

/**
 * One atomic input object means one place a change is made, and these are it. Written as pure
 * functions rather than inline in handlers so the thing that must be true of every one of them —
 * *it changes the canonical URL* — is testable without a DOM.
 */

/**
 * Registry order, not click order (§7.2): the rig is a set. Toggling recomputes from the
 * registry rather than appending, so ticking a box and unticking it leaves the inputs where
 * they started instead of quietly reordering them.
 */
export function withDevice(
  inputs: GuideInputsV1,
  deviceId: DeviceId,
  on: boolean,
  catalogue: Catalogue = CATALOGUE,
): GuideInputsV1 {
  const selected = new Set(inputs.devices)
  // #301. The ceiling, enforced on the way in rather than reported afterwards: a rig at
  // `MAX_RIG_DEVICES` refuses the next tick and returns the inputs unchanged, so there is no
  // state in which a guide is resolved for a rig the format would reject. Removing always works.
  if (on && !selected.has(deviceId) && selected.size >= MAX_RIG_DEVICES) return inputs
  if (on) selected.add(deviceId)
  else selected.delete(deviceId)
  return { ...inputs, devices: catalogue.devices.filter((id) => selected.has(id)) }
}

/**
 * §8.2/#304. Swap the rig wholesale for a remembered one.
 *
 * **Replaces rather than merges.** A remembered rig is a rig somebody had, not a set of
 * suggestions; folding it into the current one would produce a third rig nobody chose. Registry
 * order for the same reason `withDevice` recomputes it — the rig is a set, and click order would
 * give one guide two links.
 *
 * **The only path that may exceed `MAX_RIG_DEVICES`, and deliberately.** The cap is a picker rule
 * and not a format rule (#301): a rig stored before it existed, or opened from a link that
 * predates it, is still what somebody built. Truncating it to fit would be the app quietly
 * editing their studio; the picker simply refuses to add an eleventh afterwards.
 *
 * The clock source travels with it, filtered through the same membership check the store applies
 * — a rig cannot arrive here naming a leader it does not contain, but a hand-edited document
 * could, and this is the last place before it reaches a guide.
 */
export function withRig(
  inputs: GuideInputsV1,
  rig: StoredRigV1,
  catalogue: Catalogue = CATALOGUE,
): GuideInputsV1 {
  const wanted = new Set(rig.devices.map((member) => member.deviceId))
  const devices = catalogue.devices.filter((id) => wanted.has(id))
  const clockSourceId =
    rig.clockSourceId !== undefined && devices.includes(rig.clockSourceId)
      ? rig.clockSourceId
      : undefined
  const { clockSourceId: _dropped, ...rest } = inputs
  return { ...rest, devices, ...(clockSourceId === undefined ? {} : { clockSourceId }) }
}

export function withTemplate(inputs: GuideInputsV1, templateId: TemplateId): GuideInputsV1 {
  return { ...inputs, templateId }
}

/**
 * Move one knob — and, on the first move, **take the whole mood** (#310).
 *
 * `effective` is the state the reader is looking at: their own if they have one, and the
 * direction's otherwise. Writing all five axes from it is what makes a total override honest.
 * The alternative is a mood that is partly theirs and partly the direction's, and then a
 * direction change has to decide per axis whose value survives — which needs a provenance flag
 * per knob, for a control whose position is already on screen.
 *
 * So the first knob move is the moment the mood becomes the reader's, exactly as it is the
 * moment it starts travelling in their links. Every later move is an ordinary edit of a state
 * they already own, and passing the same `effective` in is a no-op on the other four axes.
 *
 * The caller supplies `effective` rather than this reading it off a template, because a mood is
 * a fact about the composed direction (§7 step 1) and this file's other helpers take the inputs
 * apart, never put them together. `effectiveMood` is the one function that answers it.
 */
export function withAxis(
  inputs: GuideInputsV1,
  axis: MoodAxis,
  value: number,
  effective: MoodState,
): GuideInputsV1 {
  return { ...inputs, mood: { ...effective, [axis]: value } }
}

/**
 * #310. **The mood on screen**: the reader's if they have set one, and otherwise the direction's
 * own, with every axis it does not state centred.
 *
 * A pure function of the inputs and nothing else, so the knob positions, the permalink and the
 * guide cannot disagree about what mood is in force. It composes the direction rather than
 * reading the base template, for the reason `resolve` applies the same fallback to the
 * *effective* template: §5 is allowed to grow a mood patch, and the two answers must not be able
 * to come apart when it does.
 *
 * Neutral when the direction cannot be composed at all — an unknown id, or two influences that
 * refuse each other. The guide is `undefined` there and the panel still has to draw five knobs;
 * drawing them at the mood of a direction that is not being resolved would be the one dishonest
 * answer.
 */
export function effectiveMood(inputs: GuideInputsV1): MoodState {
  if (inputs.mood !== undefined) return inputs.mood
  const application = composeTemplate(inputs)
  return moodState(application?.outcome === 'applied' ? application.template.mood : undefined)
}

/**
 * Registry order, not click order, for the same reason `withDevice` recomputes rather than
 * appending: the selection is a set, §5 composes it in canonical id order whatever order it
 * arrives in, and click order would give one guide two links.
 *
 * **Adding past the cap is a no-op, not a truncation.** Silently dropping whichever one sorted
 * last would answer a tick with a different tick; the UI disables the control at the cap and
 * this is the same answer for anything that gets past it (§5).
 *
 * Unticking is never refused, so a user sitting at the cap can always get out of it.
 */
export function withInspiration(
  inputs: GuideInputsV1,
  inspirationId: InspirationId,
  on: boolean,
  catalogue: Catalogue = CATALOGUE,
): GuideInputsV1 {
  const selected = new Set(inputs.inspirations)
  if (on) {
    if (selected.has(inspirationId)) return inputs
    if (selected.size >= INSPIRATION_CAP) return inputs
    selected.add(inspirationId)
  } else {
    if (!selected.has(inspirationId)) return inputs
    selected.delete(inspirationId)
  }
  return { ...inputs, inspirations: catalogue.inspirations.filter((id) => selected.has(id)) }
}

/**
 * The selected inspirations as objects, in registry order. Ids this build does not ship are
 * dropped rather than thrown on: validated inputs cannot contain one, and the component holds
 * inputs that may be mid-edit.
 */
export function inspirationsFor(inputs: GuideInputsV1): Inspiration[] {
  const selected = new Set(inputs.inspirations)
  return INSPIRATIONS.filter((i) => selected.has(i.id))
}

/**
 * §5 / §7 step 1: the effective template the resolver runs on, composed from the inputs.
 *
 * `undefined` when the template id names nothing this build ships — that is the "no direction"
 * case the UI already had, and it is not a refusal.
 */
export function composeTemplate(inputs: GuideInputsV1): InspirationApplication | undefined {
  const template = templateById(inputs.templateId)
  if (template === undefined) return undefined
  return applyInspirations(template, inspirationsFor(inputs))
}

/** Reroll is a change of seed and nothing else (§7.2). */
export function withSeed(inputs: GuideInputsV1, seed: number): GuideInputsV1 {
  return { ...inputs, seed }
}

// ---------------------------------------------------------------------------
// #161. The song the user asked for, on top of the one the direction offers
// ---------------------------------------------------------------------------

/**
 * Set the tempo, or hand it back to the direction with `undefined`.
 *
 * **Sticky, and every other helper here keeps it** — they spread `inputs`, so changing direction
 * or adding an influence leaves the number where the user put it rather than moving it under
 * them. If it now sits outside the effective range, `resolve` says so (`bpm-outside-range`);
 * that is the whole reason it is allowed to.
 *
 * A value outside `BPM_MIN`–`BPM_MAX`, or not a whole number, is a **no-op** rather than a clamp
 * or a throw, exactly as `withInspiration` no-ops past the cap: a control that cannot express it
 * is the first guard, and answering an impossible edit with a *different* edit would be the
 * studio deciding something the user did not. The range is a typo guard, not taste — the
 * direction's own range is advisory and going outside it is legal here.
 */
export function withBpm(inputs: GuideInputsV1, bpm: number | undefined): GuideInputsV1 {
  if (bpm === undefined) {
    const { bpm: _dropped, ...rest } = inputs
    return rest
  }
  if (!Number.isInteger(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) return inputs
  return { ...inputs, bpm }
}

/**
 * Set the key, or hand it back to the seed with `undefined`.
 *
 * Any key `parseKey` reads is accepted, including one the direction does not offer — that is
 * reported (`key-not-offered`) and resolved in, per #161. One it cannot read is a no-op, for the
 * same reason as `withBpm`: there is nothing honest to store.
 */
export function withKey(inputs: GuideInputsV1, key: string | undefined): GuideInputsV1 {
  if (key === undefined) {
    const { key: _dropped, ...rest } = inputs
    return rest
  }
  if (parseKey(key) === undefined) return inputs
  return { ...inputs, key }
}

/**
 * The two overrides as the resolver takes them. One function so every caller that resolves —
 * the client, the server entry, anything later — reads the same two fields off the inputs; two
 * call sites picking them apart by hand is how one of them comes to forget a field.
 */
export function songOverrides(inputs: GuideInputsV1): SongOverrides {
  return { bpm: inputs.bpm, key: inputs.key, clockSourceId: inputs.clockSourceId }
}

/**
 * §7.4/#200. Put a box in charge of the clock, or hand the job back to §7.4's ranking with
 * `undefined`.
 *
 * Unvalidated on purpose, unlike `withBpm`. A device that cannot send clock is refused by
 * `selectClockSource` rather than here, so a rig edit that removes the chosen box leaves an id
 * pointing at nothing and the guide quietly reverts to the ranked answer — which is the right
 * behaviour and needs no cleanup pass over the inputs.
 */
export function withClockSource(
  inputs: GuideInputsV1,
  clockSourceId: DeviceId | undefined,
): GuideInputsV1 {
  if (clockSourceId === undefined) {
    const { clockSourceId: _dropped, ...rest } = inputs
    return rest
  }
  return { ...inputs, clockSourceId }
}
