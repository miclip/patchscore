import {
  DENSITY_DETENTS,
  FORMAT_VERSION,
  INSPIRATION_CAP,
  applyInspirations,
  NEUTRAL_MOOD,
  decodeGuideInputs,
  encodeGuideInputs,
  guideInputsFrom,
  loadStudio,
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
 * markup identical: the first frame is a pure function of `DEFAULT_INPUTS`, and the URL and the
 * store only get a say afterwards. `test/studio-render.test.ts` renders this component in Node,
 * where `window` does not exist at all — so a stray read during render is a thrown error rather
 * than a hydration mismatch nobody notices.
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
 * A constant, not a draw and not a read. The server and the client must render the same first
 * frame, so this may not depend on the URL, on storage, or on the clock — and "the app picks a
 * different guide every time you reload" is a worse default than one shared starting point with
 * a Reroll button next to it.
 */
export const DEFAULT_INPUTS: GuideInputsV1 = {
  version: FORMAT_VERSION,
  devices: CATALOGUE.devices,
  templateId: LANDING_TEMPLATE,
  inspirations: [],
  // §6.3: density's neutral is the middle detent — no lean, sections as authored.
  mood: { ...NEUTRAL_MOOD, density: DENSITY_DETENTS[1] },
  seed: 1,
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
 * Things the user is told, and none of them stop the guide rendering. §8.2 and invariant 5 both
 * land in the same place here: a link that drifted still resolves, and it says so.
 */
export type NoticeKind =
  | 'drift'
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
      if (decoded.drift) {
        notices.push({
          kind: 'drift',
          message:
            `This link was made with generator v${decoded.resolver.encoded}; ` +
            `this is v${decoded.resolver.current}. The guide has been worked out again with the ` +
            `current one, so it may differ from the guide that was shared.`,
        })
      }
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
      return { inputs: decoded.inputs, rig: undefined, source: 'link', persist: false, notices }
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

  return { inputs: fallback, rig: undefined, source: 'default', persist: true, notices }
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

  const saved = saveStudio(env.storage, studioDoc(inputs, rig), catalogue)
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
  if (on) selected.add(deviceId)
  else selected.delete(deviceId)
  return { ...inputs, devices: catalogue.devices.filter((id) => selected.has(id)) }
}

export function withTemplate(inputs: GuideInputsV1, templateId: TemplateId): GuideInputsV1 {
  return { ...inputs, templateId }
}

export function withAxis(inputs: GuideInputsV1, axis: MoodAxis, value: number): GuideInputsV1 {
  return { ...inputs, mood: { ...inputs.mood, [axis]: value } }
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
