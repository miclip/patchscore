import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { PresetFigureBody } from '@/components/catalogue/preset-figure'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceLabel, presetFigureHref, presetsHref } from '@/lib/studio/catalogue'
import type { PresetEntry, PresetFigure, PresetSession } from '@/lib/studio/preset-session'
import { presetSession } from '@/lib/studio/preset-session'
import {
  presetFigureBack,
  presetFigureDescription,
  presetFigureTitle,
} from '@/lib/studio/preset-text'
import { riffLength, riffTempo } from '@/lib/studio/riff-text'

/**
 * §3.7/#598. **One preset figure, at its own address under the box that ships the patch.**
 *
 * `/devices/moog-muse/presets/muse-runner`: the figure written for *Muse Runner*, with the
 * Muse's own settings for it, and no rig picker anywhere on it. A riff page asks what the reader
 * owns because a riff does not know what box it will land on; a preset figure does, and the box
 * is the address. So the page is what a riff page would be with the one box ticked and the
 * picker gone, and every sentence the picker's absence makes redundant is gone with it (the
 * empty-rig offer, §7.3's gaps, §3.5's substitution).
 *
 * **Prerendered only where a figure is**, on the presets index's pattern (§3.7/#478, #593).
 * `generateStaticParams` walks every session and every entry with a figure, and
 * `dynamicParams` is off, so a patch nobody wrote a figure for and a box that declares no
 * patches are both 404s rather than a page with a title and nothing under it. A device folder
 * that declares its patches, and a riff whose `reference` names one, get this page with no UI
 * edit (invariant 2).
 *
 * **A server component but for two islands**, both the riff page's kind: `RiffInKey`, for the
 * key the reader wants the figure spelt in (#570), which holds that key as view state and
 * nothing more; and `PresetVoice`, which exists so the settings block builds at all and holds
 * no state (see `components/catalogue/preset-voice.tsx`). Nothing here reads the studio and
 * nothing writes it.
 *
 * **No song and no controls for one.** No direction, no mood, no seed, no arrangement.
 */

export const dynamicParams = false

/** The boxes that declare their patches and what each is for, and no others. */
function sessions(): PresetSession[] {
  return DEVICES.flatMap((device) => {
    const session = presetSession(device)
    return session === undefined ? [] : [session]
  })
}

type Found = { session: PresetSession; entry: PresetEntry; figure: PresetFigure }

/** Every entry with a figure, across every session: the pages this route has. */
function figures(): Found[] {
  return sessions().flatMap((session) =>
    session.entries.flatMap((entry) =>
      entry.figure === undefined ? [] : [{ session, entry, figure: entry.figure }],
    ),
  )
}

export function generateStaticParams(): { id: string; patch: string }[] {
  return figures().map(({ session, entry }) => ({ id: session.device.id, patch: entry.slug }))
}

function find(id: string, patch: string): Found | undefined {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) return undefined
  const session = presetSession(device)
  if (session === undefined) return undefined
  const entry = session.entries.find((e) => e.slug === patch)
  if (entry === undefined || entry.figure === undefined) return undefined
  return { session, entry, figure: entry.figure }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; patch: string }>
}): Promise<Metadata> {
  const { id, patch } = await params
  const found = find(id, patch)
  if (found === undefined) return {}
  const { session, entry, figure } = found
  // Its own canonical: authored content at its own address, like the index above it (#44).
  return {
    title: `${presetFigureTitle(session.device, figure)} — Patchscore`,
    description: presetFigureDescription(session.device, figure),
    alternates: { canonical: presetFigureHref(session.device, entry.patch) },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; patch: string }>
}) {
  const { id, patch } = await params
  const found = find(id, patch)
  if (found === undefined) notFound()

  const { session, entry, figure } = found
  const { riff } = figure
  const label = deviceLabel(session.device)

  return (
    <main className="shell catalogue-page riff-page preset-figure-page">
      <header className="masthead riff-head">
        <h1>{riff.name}</h1>
        <p className="mono riff-lead">
          {riff.request.role} · {riff.request.character} · {riffTempo(riff)} · {riff.key} ·{' '}
          {riffLength(riff)}
        </p>
        {/*
          The patch as the box prints it and what it is for, in the folder's words — the index
          card's two lines, so a reader arriving from the index sees the row they clicked. The
          use is the one sentence on the page about the patch rather than the figure.
        */}
        <p className="preset-figure-patch">
          <span className="preset-name">{entry.patch.name}</span>
          {entry.patch.bank === undefined ? null : (
            <span className="preset-bank mono">{entry.patch.bank}</span>
          )}
          <span className="preset-use">{entry.use}</span>
        </p>
        <p className="note preset-back">
          <Link href={presetsHref(session.device)}>{presetFigureBack(session.device)}</Link>
        </p>
      </header>

      <PresetFigureBody entry={entry} figure={figure} />

      <Footer permalink={undefined} devices={[label]} />
    </main>
  )
}
