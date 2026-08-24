import type { Metadata } from 'next'
import { DeviceIndex } from '@/components/catalogue/device-index'
import { Footer } from '@/components/footer'
import { DEVICES } from '@/lib/devices/registry.generated'

/**
 * #84. The device half of the catalogue.
 *
 * A server component: it exports `metadata`, which a client component cannot, and it hands
 * `DeviceIndex` nothing — the search state and the card renderer both live on the other side of
 * that boundary. Nothing here is a function prop, because a function cannot be serialised across
 * it and Next would refuse the build if one were.
 *
 * `canonical` is per route. The root's `canonical: '/'` (#44) is about permalinked guides, which
 * are generated views of one app; a catalogue page is authored content at its own address, and
 * pointing it at the root would tell a crawler these seventeen pages are all the same page.
 */
export const metadata: Metadata = {
  title: 'Devices — Patchscore',
  description:
    'Every device Patchscore has authored: panels, voices, clock and audio facts, patch recipes by role and character, and what each box can carry on its own.',
  alternates: { canonical: '/devices' },
}

export default function Page() {
  return (
    <main className="shell">
      <header className="masthead">
        <h1>Devices</h1>
        <p>
          {DEVICES.length} boxes, what each one is asked to do, and where every number came from.
        </p>
      </header>

      <div className="catalogue-body">
        <DeviceIndex />
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
