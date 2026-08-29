import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import { GuideLayoutPreference } from '@/components/guide-layout-preference'
import { JackStyleToggle } from '@/components/jack-style-toggle'

/**
 * #138. How the app draws itself, kept apart from what it generates.
 *
 * Nothing on this page is an input. A preference here cannot reach `GuideInputsV1`, cannot enter
 * a permalink and cannot change a byte of a guide — which is why it is a page of its own rather
 * than a panel in the studio, where every other control does exactly those things.
 *
 * `noindex`: it is a per-browser switch with no content, and the same page for everyone.
 */
export const metadata: Metadata = {
  title: 'Preferences — Patchscore',
  description: 'How Patchscore draws itself in this browser. Nothing here changes a guide.',
  alternates: { canonical: '/preferences' },
  robots: { index: false, follow: true },
}

export default function Page() {
  return (
    <main className="shell">
      <header className="masthead">
        <h1>Preferences</h1>
        <p>
          How Patchscore looks in this browser. These are stored on this device only — nothing
          here changes a guide, and nothing here travels in a permalink.
        </p>
      </header>

      <section className="panel">
        <header>
          <h2>Pickers</h2>
        </header>
        <JackStyleToggle />
      </section>

      <section className="panel">
        <header>
          <h2>Guides</h2>
        </header>
        <GuideLayoutPreference />
      </section>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
