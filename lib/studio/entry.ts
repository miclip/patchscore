import type { Catalogue, Device, GuideInputsV1, ResolveResult } from '@/lib/core'
import { decodeGuideInputs, encodeGuideInputs, resolve } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceLabel, plural } from './catalogue'
import { CATALOGUE, DEFAULT_INPUTS, composeTemplate } from './session'
import { SITE_DESCRIPTION, SITE_NAME } from './site'

/**
 * #99. The one place the query string becomes a guide, on the server.
 *
 * `app/page.tsx` and its `generateMetadata` are two entry points into the same request, and
 * before this they disagreed: the page rendered `DEFAULT_INPUTS` whatever the URL said, and the
 * metadata was a constant in `app/layout.tsx`. So a shared link painted the wrong guide for the
 * whole hydration window, previewed identically to every other link, and gave a crawler — or
 * `curl`, or an LLM fetcher — the default with no signal that it had not honoured the URL.
 *
 * Both now call `studioEntry`, so there is exactly one decode and the card and the page cannot
 * describe different guides. It runs twice per request (Next calls `generateMetadata` and the
 * component separately); that is fine and deliberate rather than overlooked — decode and
 * `resolve` are pure and single-digit milliseconds, and a request-scoped cache to save that
 * would be a seam bought for nothing.
 *
 * **The canonical stays `/` (#44); `og:url` does not.** They answer different questions to
 * different readers. `rel=canonical` is addressed to an index, and #44's argument holds: a guide
 * is a generated view of one app and there is no reason to want thousands of them in a search
 * result. `og:url` is addressed to a card renderer, where the unit is the *share* — and giving
 * every guide the same `og:url` collapses them into one share object, which throws away the
 * per-guide title and description this file exists to produce. So `og:url` carries the
 * canonicalised permalink for a request that had a readable one, and `/` for one that did not.
 *
 * Nothing here reads storage. Storage is the visitor's own property, it does not exist on the
 * server, and a link is read-only against it for the whole session anyway
 * (`bootstrapStudio`'s `persist`). The server therefore honours the link or falls back to
 * `DEFAULT_INPUTS`, and the client's bootstrap effect adds the third possibility — the saved
 * studio — after hydration, which is the only place it can come from.
 */

// ---------------------------------------------------------------------------
// Next's search params, back into a query string
// ---------------------------------------------------------------------------

/** What Next hands a server component. A repeated key arrives as an array. */
export type SearchParams = Record<string, string | string[] | undefined>

/**
 * `searchParams` -> the query string `decodeGuideInputs` reads, without the leading `?`.
 *
 * Next has already percent-decoded both halves of every pair, so both are re-encoded here.
 * For a well-formed link that is a no-op — `PERMALINK_ID` admits nothing that needs escaping —
 * and for a hostile one it is what stops a value containing `&` or `=` from splitting into
 * fields the decoder would then read as real. A value is a value; only this function decides
 * where the boundaries are.
 *
 * **A repeated key stays repeated.** `?seed=1&seed=2` arrives as an array and is written back
 * as two pairs, so the decoder still calls it malformed rather than picking one (§8.2: a link
 * that means two things is not a link). Collapsing it here would be guessing on the server and
 * failing on the client, which is worse than either.
 */
export function queryFromSearchParams(searchParams: SearchParams): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    for (const one of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(one)}`)
    }
  }
  return parts.join('&')
}

// ---------------------------------------------------------------------------
// The entry
// ---------------------------------------------------------------------------

export type StudioEntry = {
  /** What to render and what to describe. The link's inputs, or the fallback. */
  inputs: GuideInputsV1
  /**
   * Whether `inputs` came from the URL. `false` covers both "no query" and "a query this build
   * could not read" — the server has nothing useful to say about the difference, and the client
   * bootstrap raises the notice for the second one where there is somebody to read it.
   */
  fromLink: boolean
}

/**
 * The URL's guide, or the default one. Never throws; a bad link is data (§8.2).
 *
 * Deliberately *not* `bootstrapStudio`. That one owns notices, storage and `persist`, all three
 * of which need a browser; this owns the half of the question that has an answer on the server.
 * They agree on the part that matters — both decode the same query with the same catalogue — so
 * a valid link produces the same inputs on both sides and hydration has nothing to reconcile.
 */
export function studioEntry(
  searchParams: SearchParams,
  catalogue: Catalogue = CATALOGUE,
  fallback: GuideInputsV1 = DEFAULT_INPUTS,
): StudioEntry {
  const query = queryFromSearchParams(searchParams)
  if (query === '') return { inputs: fallback, fromLink: false }

  const decoded = decodeGuideInputs(query, catalogue)
  if (!decoded.ok) return { inputs: fallback, fromLink: false }
  return { inputs: decoded.inputs, fromLink: true }
}

/**
 * The address of the document this request produced, for `og:url`.
 *
 * **Canonicalised, not echoed.** `encodeGuideInputs` writes devices and inspirations in registry
 * order, the fields in one order and mood in full, so two spellings of one guide — a hand-edited
 * link, a shuffled query, a link from an older engine — share a single `og:url` and therefore a
 * single share object. Echoing the request's own query back would give one guide as many share
 * objects as there are ways to write it.
 *
 * `/` for a request with no readable link. The bare root really is at `/`, and a link that failed
 * to decode has no permalink to name — fabricating the default one there would tell a card
 * renderer that a broken URL is an address for the guide it happens to have fallen back to.
 *
 * Relative, so `metadataBase` resolves it against the apex (`app/layout.tsx`). `fromLink` is only
 * true for inputs that came out of `decodeGuideInputs`, so the encode below cannot throw.
 */
export function guideUrl(entry: StudioEntry, catalogue: Catalogue = CATALOGUE): string {
  if (!entry.fromLink) return '/'
  return `/?${encodeGuideInputs(entry.inputs, catalogue)}`
}

// ---------------------------------------------------------------------------
// What a shared link previews as
// ---------------------------------------------------------------------------

export type GuideMeta = { title: string; description: string }

/**
 * One or two boxes by name, and a count past that.
 *
 * A card truncates around sixty characters, so naming a five-device rig in full spends the whole
 * title on hardware and loses the direction — which is the part somebody deciding whether to
 * open the link is reading. Two is where the honest version still fits.
 */
export function rigLabel(devices: readonly Device[]): string {
  if (devices.length === 0) return 'an empty rig'
  if (devices.length === 1) return deviceLabel(devices[0] as Device)
  if (devices.length === 2) {
    return `${deviceLabel(devices[0] as Device)} and ${deviceLabel(devices[1] as Device)}`
  }
  return `a ${String(devices.length)}-device rig`
}

/**
 * The guide this link opens, in a sentence and a title.
 *
 * Every number is read off the resolved guide rather than off the template, because they are not
 * the same claim: the direction asks for nine parts and the rig on the link carries six of them,
 * and the six is what the reader is about to see. Invariant 5 in the place people look first.
 *
 * Falls back to the site's own title and description when there is no guide to describe — an
 * unknown direction, or two influences that refuse each other (§5.3). Describing a guide that
 * will not render is the one thing a preview must not do.
 */
export function guideMeta(inputs: GuideInputsV1, result?: ResolveResult | undefined): GuideMeta {
  const resolved = result ?? resolveEntry(inputs)
  if (resolved === undefined) return { title: SITE_NAME, description: SITE_DESCRIPTION }

  const { template, song } = resolved
  const rig = rigLabel(resolved.devices)
  const key = song.key === undefined ? '' : ` in ${song.key}`

  return {
    title: `${template.name} on ${rig} — ${SITE_NAME}`,
    description:
      `${template.name} on ${rig}: ${String(song.bpm)} BPM${key}, ` +
      `${plural(template.structure.length, 'section')}, ` +
      `${String(resolved.assignments.length)} of ${plural(template.roles.length, 'part')} ` +
      `covered — a phased guide with real parameter values.`,
  }
}

/**
 * The same composition the Studio does (§7 step 1), on the server. `undefined` where the Studio
 * would draw no guide either, so the metadata and the page agree about that too.
 */
export function resolveEntry(inputs: GuideInputsV1): ResolveResult | undefined {
  const application = composeTemplate(inputs)
  if (application?.outcome !== 'applied') return undefined
  const selected = new Set(inputs.devices)
  // Registry order (§7.2), like everywhere else the rig is turned into devices.
  const devices = DEVICES.filter((d) => selected.has(d.id))
  return resolve({ devices, template: application.template, mood: inputs.mood, seed: inputs.seed })
}
