import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { KitActions } from '@/components/catalogue/kit-actions'
import { KitBody } from '@/components/catalogue/kit-parts'
import { num } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel, kitHref } from '@/lib/studio/catalogue'
import { kitFilename, kitMarkdown } from '@/lib/studio/export'
import type { KitSession, KitSlot } from '@/lib/studio/kit-session'
import { kitSession } from '@/lib/studio/kit-session'
import {
  KIT_DESTINATION,
  KIT_RECORD,
  kitCitation,
  kitDescription,
  kitGap,
  kitLead,
  kitTitle,
} from '@/lib/studio/kit-text'

/**
 * §3.7/#478. **The kit session, laid open, at its own address.**
 *
 * The device page's `Build a kit` panel folds every sound away, because a device page is read by
 * somebody deciding what a box is and twenty-two expanded sounds is a page nobody skims. This
 * page is for the reader who has decided: every sound open at once, in model order, on one
 * address they can send to a phone, print, or save as Markdown.
 *
 * **Prerendered only where there is a kit**, which is what makes this honest rather than a page
 * with a claim in its title and nothing under it. `generateStaticParams` enumerates the boxes
 * `kitSession` answers for — the 24 that clear §3.6's threshold — and `dynamicParams` is off, so
 * `/devices/elektron-digitakt/kit` is a 404 rather than an empty page and a device folder that
 * authors a fourth kit sound gets this page with no UI edit (invariant 2).
 *
 * **A server component but for the two export buttons.** Nothing here has state, so every value
 * is in the prerendered HTML where a crawler, a reader with no JavaScript and a sheet of paper
 * all receive it; `KitActions` is the one client boundary and it is drawn around the two controls
 * that need a browser.
 *
 * **It renders from the model, never from the Markdown.** `renderKitSession` is a sibling of this
 * file in §8's sense, not its source: parsing one renderer's output to produce another's is how
 * the two come to disagree about something neither of them decided. What they share is
 * `lib/studio/kit-text.ts`, which holds every sentence they both say.
 *
 * **No song, and no controls for one.** No mood, no seed, no direction, no arrangement, no clock
 * — §3.7's boundary, unchanged. A kit is a set of sounds.
 */

export const dynamicParams = false

/** The boxes that clear §3.6's threshold, and no others: a kit page exists where a kit does. */
function sessions(): KitSession[] {
  return DEVICES.flatMap((device) => {
    const session = kitSession(device)
    return session === undefined ? [] : [session]
  })
}

export function generateStaticParams(): { id: string }[] {
  return sessions().map((session) => ({ id: session.device.id }))
}

function find(id: string): KitSession | undefined {
  const device = DEVICES.find((d) => d.id === id)
  return device === undefined ? undefined : kitSession(device)
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
    title: `${kitTitle(session.device)} — Patchscore`,
    description: kitDescription(session),
    alternates: { canonical: kitHref(session.device) },
  }
}

/**
 * One sound, open. The heading carries the model's slot name because that is the label the
 * reader is about to write on a pad, and the record line under it repeats it for the same
 * reason: the two cannot come apart, since both are `slot.name`.
 */
function Slot({ slot, at, session }: { slot: KitSlot; at: number; session: KitSession }) {
  return (
    <li className="kit-slot">
      <h3 className="kit-slot-head">
        <span className="kit-ordinal mono">{num(at)}</span>
        <span className="kit-slot-name mono">{slot.name}</span>
        <span className="kit-title">{slot.recipe.title}</span>
      </h3>
      <p className="kit-meta mono">{`${slot.recipe.role} · ${slot.recipe.character}`}</p>
      <KitBody recipe={slot.recipe} device={session.device} />
      <p className="kit-record">
        {KIT_RECORD}
        <span className="mono">{slot.name}</span>.
      </p>
    </li>
  )
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = find(id)
  if (session === undefined) notFound()

  const label = deviceLabel(session.device)
  const cites = kitCitation(session)
  const gap = kitGap(session)

  return (
    <main className="shell catalogue-page kit-page">
      <header className="kit-page-head">
        <h1>{kitTitle(session.device)}</h1>
        <p className="kit-lead">{kitLead(session)}</p>
        <p className="kit-destination">{KIT_DESTINATION}</p>
        {/*
          §3.2/invariant 4. One sentence for the whole document, over the settings below and no
          others, and no mark or page on any value. The same sentence the Markdown prints, from
          the same function.
        */}
        {cites === undefined ? null : <p className="kit-cites">{cites}</p>}
        {/*
          The narrowest boundary this page can have: the Markdown and its name are rendered
          here, on the server, and two strings cross to the client. The session does not — see
          `KitActions`, and `test/kit-page.test.ts`, which walks the import graph to hold it.
        */}
        <KitActions markdown={kitMarkdown(session)} filename={kitFilename(session)} />
        <p className="note kit-back">
          <Link href={deviceHref(session.device)}>Everything else about the {label}</Link>
        </p>
      </header>

      <ol className="kit-slots">
        {session.slots.map((slot, i) => (
          <Slot key={slot.recipe.id} slot={slot} at={i + 1} session={session} />
        ))}
      </ol>

      {gap === undefined ? null : (
        <section className="panel kit-panel kit-gap">
          <header>
            <h2>Not in this kit</h2>
          </header>
          <p>{gap}</p>
        </section>
      )}

      <Footer permalink={undefined} devices={[label]} />
    </main>
  )
}
