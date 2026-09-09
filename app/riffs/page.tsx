import type { Metadata } from 'next'
import { RiffIndex } from '@/components/catalogue/riff-index'
import { Footer } from '@/components/footer'
import { RIFFS } from '@/lib/riffs'

/**
 * §5A. The riff half of the catalogue, and the same shape as `/devices` and `/directions`: a
 * server component that exports the metadata and hands its client island nothing at all.
 */
export const metadata: Metadata = {
  title: 'Riffs — Patchscore',
  /*
   * §5A.5. Three things to do, not three things the page holds. And the figure is one written
   * here to practise against, so nothing implies the record's own notes ship.
   */
  description:
    'Choose a track, build its sound on the boxes you own, and practise the technique against a figure written here.',
  alternates: { canonical: '/riffs' },
}

export default function Page() {
  return (
    <main className="shell catalogue-page">
      <header className="masthead">
        <h1>Riffs</h1>
        <p>
          {RIFFS.length} techniques. Choose one, build its sound on the boxes you own, and play
          the figure written here.
        </p>
      </header>

      <div className="catalogue-body">
        <RiffIndex />
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
