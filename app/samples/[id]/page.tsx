import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { SampleRig } from '@/components/sample/sample-rig'
import type { SampleTarget } from '@/lib/core'
import { SAMPLE_TARGETS, sampleTargetById } from '@/lib/samples'
import { samplePage } from '@/lib/studio/sample-page'
import {
  REFERENCE_LINK,
  REFERENCE_OFFER,
  referenceHref,
  sampleLead,
  sampleReference,
} from '@/lib/studio/sample-text'

/**
 * §3.8/#520. **One sound, at its own address.**
 *
 * Prerendered per target, canonical to itself, and `dynamicParams` off so `/samples/nothing` is a
 * 404 rather than an empty page — the same three rules a device page, a direction page and a riff
 * page have, for the same reasons.
 *
 * **Mostly a server component.** What to record is a property of the target and depends on no
 * rig, so it is in the prerendered HTML where a crawler, a reader with no JavaScript and a sheet
 * of paper all receive it. `SampleRig` is the one client boundary and it is drawn around the only
 * part that depends on what somebody owns — which is also the part that says *how* the sound is
 * made, because that answer is the resolved recipe's.
 *
 * **It renders from the model, never from the Markdown.** `renderSample` is this page's sibling in
 * §8's sense, not its source: parsing one renderer's output to produce another's is how the two
 * come to disagree about something neither of them decided. What they share is
 * `lib/studio/sample-text.ts`, which holds every sentence they both say, and
 * `test/sample-page.test.ts` asserts the facts of one against the other (#495).
 *
 * **No song and no figure.** No direction, no mood, no seed, no arrangement, no clock, no
 * sections, no density, no notes, no step grid and no harmony. A one-shot has none of them.
 *
 * **The reference download is server-rendered, above the rig** (§3.9/#519). It depends on the
 * target and on nothing the reader owns, so it belongs in the prerendered half with the technique
 * rather than inside `SampleRig` — which also keeps the synthesis out of the client bundle
 * entirely. `sampleReference` reads `lib/audio/catalogue`, fourteen objects and a lookup; the bytes
 * are made in Node by the `reference.wav` route beside this file. Ten of the twenty-four targets
 * print no section at all.
 */

export const dynamicParams = false

export function generateStaticParams(): { id: string }[] {
  return SAMPLE_TARGETS.map((target) => ({ id: target.id }))
}

function find(id: string): SampleTarget | undefined {
  return sampleTargetById(id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const target = find(id)
  if (target === undefined) return {}
  const page = samplePage(target)
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.href },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const target = find(id)
  if (target === undefined) notFound()
  const reference = sampleReference(target)

  return (
    <main className="shell catalogue-page sample-page">
      <header className="masthead sample-head">
        <h1>{target.name}</h1>
        <p className="mono sample-lead">{sampleLead(target)}</p>
      </header>

      <section className="panel riff-panel sample-technique">
        <header>
          <h2>What to record</h2>
        </header>
        {target.technique.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </section>

      {reference !== undefined && (
        <section className="panel riff-panel sample-reference">
          <header>
            <h2>A reference file</h2>
          </header>
          <p>{REFERENCE_OFFER}</p>
          <p className="sample-reference-file">
            <a href={referenceHref(target)} download={reference.file}>
              {REFERENCE_LINK}
            </a>
            {' — '}
            <span className="mono">{reference.file}</span>
          </p>
        </section>
      )}

      <SampleRig targetId={target.id} />

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
