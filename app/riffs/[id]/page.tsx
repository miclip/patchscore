import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { RiffFigure } from '@/components/riff/riff-figure'
import { RiffRig } from '@/components/riff/riff-rig'
import type { Riff } from '@/lib/core'
import { resolveRiff } from '@/lib/core'
import { RIFFS, riffById } from '@/lib/riffs'
import { riffPage } from '@/lib/studio/riff-page'
import { riffLength, riffTempo } from '@/lib/studio/riff-text'

/**
 * §5A. **One riff, at its own address.**
 *
 * Prerendered per entry, canonical to itself, and `dynamicParams` off so `/riffs/nothing` is a
 * 404 rather than an empty page — the same three rules a device page and a direction page have,
 * for the same reasons.
 *
 * **Mostly a server component.** The technique, the notes and the grid are properties of the
 * entry, so they are in the prerendered HTML where a crawler, a reader with no JavaScript and a
 * sheet of paper all receive them. `RiffRig` is the one client boundary and it is drawn around
 * the only part that depends on what somebody owns.
 *
 * **It renders from the model, never from the Markdown.** `renderRiff` is this page's sibling in
 * §8's sense, not its source: parsing one renderer's output to produce another's is how the two
 * come to disagree about something neither of them decided. What they share is
 * `lib/studio/riff-text.ts`, which holds every sentence they both say, and `test/riff-page.test.ts`
 * asserts the facts of one against the other (#495).
 *
 * **No song, and no controls for one.** No direction, no mood, no seed, no arrangement, no clock,
 * no sections, no density — §5A's boundary, unchanged. A riff is one figure.
 */

export const dynamicParams = false

export function generateStaticParams(): { id: string }[] {
  return RIFFS.map((riff) => ({ id: riff.id }))
}

function find(id: string): Riff | undefined {
  return riffById(id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const riff = find(id)
  if (riff === undefined) return {}
  const page = riffPage(riff)
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.href },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const riff = find(id)
  if (riff === undefined) notFound()

  /**
   * §4.1. Resolved against **no rig**, which is all the figure needs: a hook resolves against the
   * riff's own key and a grid is authored, so the notes and the steps are the same on every
   * machine that ever loads this page. `RiffRig` resolves again with whatever the reader owns,
   * and that second answer is the only one a rig changes.
   */
  const figure = resolveRiff(riff, [])

  return (
    <main className="shell catalogue-page riff-page">
      <header className="masthead riff-head">
        <h1>{riff.name}</h1>
        <p className="mono riff-lead">
          {riff.request.role} · {riff.request.character} · {riffTempo(riff)} · {riff.key} ·{' '}
          {riffLength(riff)}
        </p>
        {/*
          §5A.5. **No subtitle, and its absence is the decision.** A line reading *The technique
          from Blue Monday. The figure below is ours, not a transcription* stood here: half of it
          repeated the title, and the other half was a disclaimer in the first place a reader's
          eye lands. The record is named in the title above and in the address bar, which is where
          somebody looks for it.
        */}
      </header>

      <section className="panel riff-panel riff-technique">
        <header>
          <h2>The technique</h2>
        </header>
        {riff.technique.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
      </section>

      <RiffFigure riff={riff} resolution={figure} />

      <RiffRig riffId={riff.id} />

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
