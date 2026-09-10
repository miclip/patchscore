import { createHash } from 'node:crypto'
import { referenceWav } from '@/lib/audio'
import { SAMPLE_TARGETS, sampleTargetById } from '@/lib/samples'
import { sampleReference } from '@/lib/studio/sample-text'

/**
 * §3.9/#519. **The reference sample, synthesised in Node during `next build`.**
 *
 * `/samples/kick/reference.wav`. One segment past the page a reader is already on, so the address
 * of the sound and the address of its example differ by the thing that is being asked for.
 *
 * ---------------------------------------------------------------------------
 * Why a route rather than a file or a blob
 * ---------------------------------------------------------------------------
 *
 * The three options were a committed binary, a client-side generator behind a download button, and
 * this. #519's body rules out the first: the repo has no binary story, and fourteen files at
 * broadcast quality is not a thing to start one for.
 *
 * The second is the one worth arguing about, because it looks cheaper. It is not: the synthesis is
 * a filter bank, six oscillators, a noise source and a polynomial `sin`, and a button that produced
 * a `Blob` would carry all of it into the bundle of a page whose actual job is to describe a sound.
 * A reader who never clicks the link would download the generator instead of the file. Worse, a
 * generated `Blob` cannot be linked to, cached, curl'd, or opened on the tablet propped against the
 * rack — and #21 says that tablet is a primary context rather than a fallback.
 *
 * A URL is a URL. It is bookmarkable, it survives being sent to somebody, and it is the same bytes
 * every time (invariant 6).
 *
 * ---------------------------------------------------------------------------
 * When the bytes are made, and where they live
 * ---------------------------------------------------------------------------
 *
 * **At build, not at request.** `generateStaticParams` and `dynamicParams = false` below, and a
 * handler that reads no dynamic API, mean Next runs this fourteen times during `next build` and
 * stores fourteen static response bodies under `.next/server/app/samples/<id>/reference.wav.body`
 * with their headers beside them. A request is then served from that, and this function does not
 * run again.
 *
 * That is the right outcome and it is worth being exact about, because *generated on request* is
 * the easy thing to say and is not what happens. What holds either way is the part #519 cares
 * about: **the synthesis runs in Node and never in a browser, and no audio is committed.** `.next/`
 * is ignored, so the fourteen bodies exist only in build output — a checkout has no WAV in it, and
 * `npm run samples:wav`, which writes files a developer can listen to, is a separate command and
 * part of no build.
 *
 * ---------------------------------------------------------------------------
 * Caching: revalidate, because the URL is stable and the bytes are not
 * ---------------------------------------------------------------------------
 *
 * This first sent `max-age=31536000, immutable`, which was wrong, and the way it was wrong is worth
 * keeping. `immutable` tells a browser not to revalidate at all, so the `ETag` beside it can never
 * be consulted and can never invalidate anything. The URL is stable and **not** content-addressed:
 * `/samples/kick/reference.wav` is where the kick lives, whatever the kick sounds like this build.
 * A change to `reference.ts` therefore serves different bytes at the same address, and every reader
 * who had already fetched it would have kept the old file for a year.
 *
 * `max-age=0, must-revalidate` is the policy that matches: a browser asks every time rather than
 * serving a frozen copy, so **a changed build serves changed bytes at the same URL**. That is the
 * behaviour the whole arrangement depends on, since the bytes are a pure function of a file in the
 * repo and that file is expected to be edited.
 *
 * **What the `ETag` saves depends on what is serving, and `next start` saves nothing.** Measured
 * here rather than assumed: a conditional request carrying a matching `If-None-Match` is answered
 * `200` with the whole body, because Next does not implement conditional GET for a prerendered
 * route handler. So the tag is a correct content tag that a caching layer in front *can* use, and
 * on this server every revalidation is a full 176 KB. Claiming the 304 would be describing a
 * deployment rather than this code.
 *
 * ---------------------------------------------------------------------------
 * Two gates, not one
 * ---------------------------------------------------------------------------
 *
 * `dynamicParams = false` with `generateStaticParams` below is the framework's gate: an id not in
 * that list never reaches this handler. The handler checks again anyway, and the second check is
 * not redundant — it is the one a test can call directly, and it is the one that still holds if the
 * route is ever reached by a path the framework did not prerender. **Nine of the twenty-three roles
 * offer no download**, and for those the answer is 404 rather than silence or an empty file: there
 * is no reference vocal, and a zero-byte `vocal-chop.wav` would be a worse answer than none.
 */

export const dynamicParams = false

/**
 * The fourteen eligible targets, and only those.
 *
 * `SAMPLE_TARGETS` is twenty-four; the filter is `sampleReference`, which is the same predicate the
 * page and the Markdown use to decide whether to print the offer at all. One predicate, three
 * surfaces — so a route can never exist for a link that is not drawn, and a link can never be drawn
 * to a route that 404s.
 */
export function generateStaticParams(): { id: string }[] {
  return SAMPLE_TARGETS.filter((target) => sampleReference(target) !== undefined).map((target) => ({
    id: target.id,
  }))
}

/**
 * Revalidate every time. See the header: `immutable` on a stable, non-content-addressed URL is a
 * browser instructed never to ask, holding a file that can change.
 *
 * Not *let the `ETag` decide* — `next start` answers a matching `If-None-Match` with the whole body
 * and decides nothing. The tag is there for a caching layer in front that does.
 */
const CACHE = 'public, max-age=0, must-revalidate'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const target = sampleTargetById(id)
  if (target === undefined) return new Response(null, { status: 404 })

  const sample = sampleReference(target)
  if (sample === undefined) return new Response(null, { status: 404 })

  const bytes = referenceWav(target.role)
  // Unreachable: `sampleReference` answered, so the catalogue offers this role, and
  // `test/reference-samples.test.ts` pins that the catalogue and the recipes agree. Answered rather
  // than thrown, because a 404 is the right thing for a reader to meet if that ever stops being so.
  if (bytes === undefined) return new Response(null, { status: 404 })

  return new Response(bytes as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      // Named for the role, so a reader collecting the set gets `metallic.wav` rather than
      // `metallic-hit.wav` and the files on their disk match `npm run samples:wav`.
      'Content-Disposition': `attachment; filename="${sample.file}"`,
      'Content-Length': String(bytes.byteLength),
      ETag: `"${createHash('sha256').update(bytes).digest('hex').slice(0, 32)}"`,
      'Cache-Control': CACHE,
    },
  })
}
