import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { PatchName, PresetBody } from '@/components/catalogue/preset-section'
import type { Device } from '@/lib/core'
import { shippedPatchKey } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel, presetsHref } from '@/lib/studio/catalogue'
import type { PresetEntry, PresetSession } from '@/lib/studio/preset-session'
import { presetSession } from '@/lib/studio/preset-session'
import { presetDescription, presetLead, presetTitle } from '@/lib/studio/preset-text'

/**
 * §2.6/#593. **The preset session, laid open, at its own address.**
 *
 * The device page's `Explore your device` panel folds every patch away, because a device page is
 * read by somebody deciding what a box is. This page is for the reader who has decided to work
 * through the patches: every entry open, in the folder's order, on one address they can send to
 * a phone.
 *
 * **Prerendered only where there is a session**, on the kit page's pattern (§3.7/#478).
 * `generateStaticParams` enumerates the boxes `presetSession` answers for — one today — and
 * `dynamicParams` is off, so `/devices/elektron-digitakt/presets` is a 404 rather than a page
 * with a claim in its title and nothing under it, and a device folder that declares its patches
 * gets this page with no UI edit (invariant 2).
 *
 * **A server component throughout, and no export.** The kit page carries two export buttons
 * behind one client boundary because a kit is a build document somebody takes to the machine:
 * cables, values, a record action per sound. This is a linked catalogue — a name, a line, and a
 * link — and the figure it links to is the document. Markdown of a list of links is a worse
 * copy of the page, and Print is the browser's own menu. So nothing here needs a browser, and
 * every byte is in the prerendered HTML.
 *
 * **No song and no controls for one.** One entry per use and none for a declared patch without
 * one (#617); the lead is `presetLead`, the same sentence the panel says, and it is the one
 * place a count appears, where the list came off a manual page.
 */

export const dynamicParams = false

/** The boxes that declare their patches and what each is for, and no others. */
function sessions(): PresetSession[] {
  return DEVICES.flatMap((device) => {
    const session = presetSession(device)
    return session === undefined ? [] : [session]
  })
}

export function generateStaticParams(): { id: string }[] {
  return sessions().map((session) => ({ id: session.device.id }))
}

function find(id: string): PresetSession | undefined {
  const device = DEVICES.find((d) => d.id === id)
  return device === undefined ? undefined : presetSession(device)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const session = find(id)
  if (session === undefined) return {}
  // Its own canonical: authored content at its own address, like the device page under it (#44).
  return {
    title: `${presetTitle(session.device)} — Patchscore`,
    description: presetDescription(session),
    alternates: { canonical: presetsHref(session.device) },
  }
}

/**
 * One patch, open. The heading is the name as the box prints it, the line under it is what it
 * is for, and the body is the same `PresetBody` the panel folds away — one React reading of an
 * entry (§3.7's rule for the kit, kept here). The figure it links to is a page under this box
 * (#598), which is where the technique, the notes, the grid and this box's settings are.
 */
function Entry({ device, entry }: { device: Device; entry: PresetEntry }) {
  return (
    <li className="preset-card">
      <h3 className="preset-card-head">
        <PatchName entry={entry} />
      </h3>
      <p className="preset-use">{entry.use}</p>
      <PresetBody device={device} entry={entry} />
    </li>
  )
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = find(id)
  if (session === undefined) notFound()

  const label = deviceLabel(session.device)

  return (
    <main className="shell catalogue-page preset-page">
      <header className="preset-page-head">
        <h1>{presetTitle(session.device)}</h1>
        <p className="preset-lead">{presetLead(session)}</p>
        <p className="note preset-back">
          <Link href={deviceHref(session.device)}>Everything else about the {label}</Link>
        </p>
      </header>

      <ol className="preset-cards">
        {session.entries.map((entry) => (
          <Entry key={shippedPatchKey(entry.patch)} device={session.device} entry={entry} />
        ))}
      </ol>

      <Footer permalink={undefined} devices={[label]} />
    </main>
  )
}
