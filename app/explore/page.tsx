import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import type { Device } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceLabel, presetsHref } from '@/lib/studio/catalogue'
import type { PresetSession } from '@/lib/studio/preset-session'
import { presetSession } from '@/lib/studio/preset-session'
import { presetLead } from '@/lib/studio/preset-text'

/**
 * §2.6/§3.7. **Explore, at its own address**, which is the half of this surface that was
 * missing.
 *
 * The per-box index and every figure under it were already written, already prerendered and
 * already in the sitemap. What none of them had was a way in: they sat under `/devices/<id>`,
 * reachable from a folded panel on a device page and from nothing else, and an owner of a box
 * with nineteen figures written for it had to find a path nobody had ever shown them. This page
 * is the entry, and the move out of the devices tree is what makes it a section rather than a
 * shortcut into somebody else's.
 *
 * **Derived, not listed.** `presetSession` is the same enumeration the routes below prerender
 * from and the sitemap walks, so a folder that declares its patches is listed here on the same
 * commit and one that does not is absent from all three (invariant 2). In registry order (§7.2),
 * so two readers see the same page.
 *
 * **No count of boxes, and no count of figures against a total.** The list is as long as it is.
 * A denominator here would be this library's backlog rendered as a score, which no surface may
 * show — and the per-box sentence already answers the count question the honest way (#593,
 * #617): a manual's own figure where there is one, and silence where the entries are somebody's
 * pick.
 *
 * A server component throughout, with no island and no export: a name, a sentence and a link
 * per box, which needs no browser and ships in the prerendered HTML.
 *
 * **It is a catalogue index and uses the catalogue index's card**, which `/devices`,
 * `/directions` and `/riffs` all already use: `catalogue-link` wrapping a `catalogue-name` and a
 * `catalogue-sub`, one link per row. Not its own markup with its own rules — a second card that
 * drew the same thing is two of them to keep in step, and the first draft of this page proved
 * why by rendering a bare `h2 > a` at browser-default size in browser-default purple, which is
 * what an unstyled heading link looks like on a page whose every sibling is styled.
 *
 * No picker and no search, unlike the three browsable catalogues: the list is short enough to
 * read, and a search box over it would be furniture.
 */

export const metadata: Metadata = {
  title: 'Explore — Patchscore',
  description:
    'The factory patches these boxes ship, what each one is for, and a figure written for it ' +
    'where one exists.',
  alternates: { canonical: '/explore' },
}

/** The boxes that declare their patches and what each is for, and no others. */
function sessions(): PresetSession[] {
  return DEVICES.flatMap((device) => {
    const session = presetSession(device)
    return session === undefined ? [] : [session]
  })
}

/**
 * One box: the name a reader is choosing between, and `presetLead` under it — the same sentence
 * the device page's panel and the box's own index say, from the one function all three call
 * (`preset-text.ts`).
 *
 * A `span` inside the link rather than a heading, which is what the other three indexes do: the
 * row is a link to a page, not a section of this one, and the page it opens carries the heading.
 */
function Box({ device, session }: { device: Device; session: PresetSession }) {
  return (
    <li className="catalogue-item">
      <Link className="catalogue-link" href={presetsHref(device)}>
        <span className="catalogue-name">{deviceLabel(device)}</span>
        <span className="catalogue-sub">{presetLead(session)}</span>
      </Link>
    </li>
  )
}

export default function Page() {
  return (
    <main className="shell catalogue-page">
      <header className="masthead">
        <h1>Explore</h1>
        <p>
          The factory patches a box ships, laid open: what each one is for, and a figure written
          for it where one exists.
        </p>
      </header>

      <div className="catalogue-body">
        <ul className="catalogue-list">
          {sessions().map((session) => (
            <Box key={session.device.id} device={session.device} session={session} />
          ))}
        </ul>
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
