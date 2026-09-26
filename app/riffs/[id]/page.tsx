import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { RiffBody } from '@/components/riff/riff-figure'
import { RiffRig } from '@/components/riff/riff-rig'
import type { Riff } from '@/lib/core'
import { resolveRiff } from '@/lib/core'
import { RECORD_RIFFS } from '@/lib/riffs'
import { riffPage } from '@/lib/studio/riff-page'
import { riffLength, riffTempo } from '@/lib/studio/riff-text'

/**
 * §5A. **One riff, at its own address.**
 *
 * Prerendered per entry, canonical to itself, and `dynamicParams` off so `/riffs/nothing` is a
 * 404 rather than an empty page — the same three rules a device page and a direction page have,
 * for the same reasons.
 *
 * **Per record-named entry** (§5A.7/#598). A figure named for a factory patch is a page under
 * the box that ships the patch, at `presetFigureHref`, and has no page here: `RECORD_RIFFS` is
 * what this route enumerates and what `find` answers from, so `/riffs/<a patch-named id>` is a
 * 404 by the same `dynamicParams` rule, and nothing in this file knows the twelve exist.
 *
 * **Mostly a server component.** The technique, the notes and the grid are properties of the
 * entry, so they are in the prerendered HTML where a crawler, a reader with no JavaScript and a
 * sheet of paper all receive them. `RiffRig` is the client boundary drawn around the only part
 * that depends on what somebody owns; `RiffInKey` (#570) is the other, drawn around the two
 * panels a chosen key re-spells, and it holds that key as view state and nothing more.
 *
 * **It renders from the model, never from the Markdown.** `renderRiff` is this page's sibling in
 * §8's sense, not its source: parsing one renderer's output to produce another's is how the two
 * come to disagree about something neither of them decided. What they share is
 * `lib/studio/riff-text.ts`, which holds every sentence they both say, and `test/riff-page.test.ts`
 * asserts the facts of one against the other (#495).
 *
 * **No song, and no controls for one.** No direction, no mood, no seed, no arrangement, no clock,
 * no sections, no density — §5A's boundary, unchanged. A riff is one figure. The key control is
 * not a song control: it transposes the reading of the figure on this page and writes nothing,
 * where the studio's key is an input to a guide.
 */

export const dynamicParams = false

export function generateStaticParams(): { id: string }[] {
  return RECORD_RIFFS.map((riff) => ({ id: riff.id }))
}

function find(id: string): Riff | undefined {
  return RECORD_RIFFS.find((riff) => riff.id === id)
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

      {/*
        The two-track body. The technique holds the reading measure (#611) and the figure's
        material — the chords, the rules, the notes, the grid — sits beside it rather than two
        screens below, because the material is what a reader cross-refers to *while* reading the
        technique and this page is long enough to lose the paragraph you were checking against.
        One wrapper, no change to what is inside it, and below 1180px it is a plain div that
        changes nothing.

        The rig stays outside and full-width: it is a picker somebody uses after they have read
        the figure, not material they read alongside it.
      */}
      <RiffBody riff={riff} resolution={figure} />

      <RiffRig riffId={riff.id} />

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
