import type { Metadata } from 'next'
import { DirectionIndex } from '@/components/catalogue/direction-index'
import { Footer } from '@/components/footer'
import { TEMPLATES } from '@/lib/templates'

/**
 * #84. The direction half of the catalogue, and the same shape as `/devices`: a server component
 * that exports the metadata and hands its client island nothing at all.
 */
export const metadata: Metadata = {
  title: 'Directions — Patchscore',
  description:
    'Every musical direction Patchscore has authored: tempo and keys, section structure, the harmonic cycle in degrees, and the parts each one asks a rig for.',
  alternates: { canonical: '/directions' },
}

export default function Page() {
  return (
    <main className="shell catalogue-page">
      <header className="masthead">
        <h1>Directions</h1>
        <p>
          {TEMPLATES.length} directions, what each one asks a rig for, and what your boxes cover
          of it.
        </p>
      </header>

      <div className="catalogue-body">
        <DirectionIndex />
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
