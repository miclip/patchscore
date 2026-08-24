import type { Metadata } from 'next'
import { Studio } from '@/components/studio'
import { guideMeta, guideUrl, studioEntry } from '@/lib/studio/entry'
import type { SearchParams } from '@/lib/studio/entry'
import { SITE_NAME } from '@/lib/studio/site'

/**
 * Build step 8 (#10) — the input surface: device picker, genre picker, seed, mood.
 *
 * A server component wrapping one client island. The inputs are client state from the second
 * frame on, and `resolve` is pure and fast enough to run on every change (single-digit ms for a
 * three-device rig), so there is nothing to fetch — but there **is** server work, and #99 is
 * what it costs to skip it.
 *
 * This used to take no `searchParams` and render `<Studio />` bare, which meant the server
 * painted `DEFAULT_INPUTS` whatever the URL said and the link only got a say after hydration.
 * Every shared link flashed the wrong guide, every one of them previewed identically, and
 * anything without JavaScript — a crawler, an archive, `curl` — was handed the default with
 * nothing on the page to admit it. `studioEntry` decodes the query here instead, and the same
 * decoded inputs are handed to `<Studio>` as its first frame, so the server's markup and the
 * client's first pass are still the same bytes (`test/studio-render.test.ts`).
 *
 * `searchParams` opts this route into dynamic rendering, which is correct: the page is a
 * function of the URL now, so a prerendered copy would be a cached answer to a question nobody
 * asked. The catalogue pages (#84) are the static half of the site and stay that way.
 */

type PageProps = { searchParams: Promise<SearchParams> }

/**
 * What a shared link previews as. Same decode as the page below, by construction — a second one
 * here is how a card comes to describe a guide the page does not render.
 *
 * `canonical: '/'` is restated rather than inherited (#44). It is inherited today, but this is
 * the one route where per-view metadata and one canonical URL sit side by side, and the pairing
 * is the decision worth being able to read in one place — and to test in one place.
 *
 * **`og:url` deliberately differs from the canonical**, which is not a contradiction: they are
 * addressed to different readers about different units. The canonical tells an index there is one
 * page here. `og:url` identifies the *share*, and one `og:url` for every guide would collapse
 * them into a single share object — throwing away the per-guide card this whole function exists
 * to produce. `lib/studio/entry.ts` carries the argument in full.
 */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const entry = studioEntry(await searchParams)
  const { title, description } = guideMeta(entry.inputs)

  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: guideUrl(entry),
      title,
      description,
    },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ searchParams }: PageProps) {
  const entry = studioEntry(await searchParams)
  return <Studio initialInputs={entry.inputs} />
}
