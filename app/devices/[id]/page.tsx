import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { citeText, ioText } from '@/components/guide/format'
import { PanelFigure } from '@/components/rack/panel-figure'
import type { Device } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel } from '@/lib/studio/catalogue'
import { clockText, devicePage } from '@/lib/studio/device-page'

/**
 * #84. One device, everything the library holds about it.
 *
 * Prerendered, one file per manifest: `generateStaticParams` enumerates the registry, so adding a
 * device adds a page and invariant 2 survives — no UI edit, no route to register. `dynamicParams`
 * is off, so an id that is not in the registry is a 404 rather than a page rendered from nothing.
 *
 * A server component throughout, with no client boundary on it at all: nothing here has state, so
 * everything below is in the prerendered HTML where a crawler and a reader with no JavaScript can
 * see it. That also settles the function-prop question — there is no boundary for one to cross.
 *
 * Every number is derived in `lib/studio/device-page.ts`, and the provenance counts are the audit's
 * own (`npm run audit`), so the page and the command line cannot disagree.
 */

export const dynamicParams = false

export function generateStaticParams(): { id: string }[] {
  return DEVICES.map((device) => ({ id: device.id }))
}

function find(id: string): Device | undefined {
  return DEVICES.find((device) => device.id === id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const device = find(id)
  if (device === undefined) return {}
  const page = devicePage(device)
  // Per route, and its own: this page is authored content at its own address, unlike a
  // permalinked guide, which is a generated view of the studio and stays canonical to '/' (#44).
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.href },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const device = find(id)
  if (device === undefined) notFound()

  const page = devicePage(device)
  const label = deviceLabel(device)
  const kind = device.kind.replace(/-/g, ' ')

  return (
    <main className="shell device-page">
      <header className="masthead">
        <h1>{label}</h1>
        <p>{kind}</p>
        <p className="masthead-actions">
          <Link href="/devices">All devices</Link> <Link href="/">Open the studio</Link>
        </p>
      </header>

      <section className="panel span-2">
        <header>
          <h2>Panel</h2>
          <p className="note">Our drawing, from cited dimensions.</p>
        </header>
        <PanelFigure device={device} idPrefix={device.id} />
      </section>

      <div className="columns">
        <section className="panel">
          <header>
            <h2>The box</h2>
          </header>
          <dl className="fact-list">
            <dt>Kind</dt>
            <dd>{kind}</dd>
            <dt>Clock</dt>
            <dd className="mono">{clockText(device)}</dd>
            <dt>Audio</dt>
            <dd className="mono">{ioText(device)}</dd>
            <dt>Voices</dt>
            <dd className="mono">
              {page.assignables === 0
                ? 'none — this box carries no parts'
                : `${page.assignables} assignable${page.assignables === 1 ? '' : 's'}`}
            </dd>
            {device.clock.preferredSource === true ? (
              <>
                <dt>In a rig</dt>
                <dd>Asks to be the clock source, and everything else syncs to it.</dd>
              </>
            ) : null}
            {device.manual === undefined ? null : (
              <>
                <dt>Cited to</dt>
                {/* Named, never hosted: the manuals stay out of the repo and off the site. */}
                <dd>
                  {device.manual.title}
                  {device.manual.edition === undefined ? '' : `, ${device.manual.edition}`}
                </dd>
              </>
            )}
          </dl>

          {page.voices.length === 0 ? null : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Voice</th>
                    <th className="numeric">Count</th>
                    <th className="numeric">Notes</th>
                    <th>Roles it declares</th>
                  </tr>
                </thead>
                <tbody>
                  {page.voices.map((voice) => (
                    <tr key={voice.id}>
                      <td>{voice.label}</td>
                      <td className="numeric mono">{voice.count}</td>
                      <td className="numeric mono">{voice.polyphony}</td>
                      <td className="mono">{voice.roles.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <header>
            <h2>Provenance</h2>
            <p className="note">The same counts the audit prints.</p>
          </header>
          {/*
            Three debts, kept apart (§3.2). A point is the value somebody chose to dial; it counts
            as cited only where a document prints that value, which is rare and expected. A range
            is the control's own limits, and mood may only move a value inside a cited one. Adding
            them up would hide the second inside the first.
          */}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Claim</th>
                  <th className="numeric">Total</th>
                  <th className="numeric">Manual</th>
                  <th className="numeric">Observed</th>
                  <th className="numeric">Uncited</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Points</td>
                  <td className="numeric mono">{page.provenance.params}</td>
                  <td className="numeric mono">{page.provenance.manualPoints}</td>
                  <td className="numeric mono">{page.provenance.observedPoints}</td>
                  <td className="numeric mono">{page.provenance.provisionalPoints}</td>
                </tr>
                <tr>
                  <td>Ranges</td>
                  <td className="numeric mono">{page.provenance.numerics}</td>
                  <td className="numeric mono">{page.provenance.manualRanges}</td>
                  <td className="numeric mono">{page.provenance.observedRanges}</td>
                  <td className="numeric mono">{page.provenance.unverifiedRanges}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            A point is the setting to dial and is a judgement unless a document prints that value.
            A range is the control&rsquo;s own limits, and mood may move a value only inside a
            cited range, so {page.provenance.moodInert} parameter
            {page.provenance.moodInert === 1 ? '' : 's'} here declare an axis that cannot move.
          </p>
          <p className="note">
            Panel span: {' '}
            {device.physical.verified === false
              ? 'not checked against a document.'
              : citeText(device.physical.verified)}
          </p>
        </section>
      </div>

      <section className="panel span-2">
        <header>
          <h2>What it can play</h2>
          <p className="note">
            {page.roles.length === 0
              ? 'No patch recipes authored yet.'
              : `${device.recipes.length} recipes across ${page.roles.length} roles.`}
          </p>
        </header>
        {page.roles.length === 0 ? (
          <p className="empty">
            Nothing is authored for this box yet, so it takes no parts in a guide. It still joins a
            rig: the clock and audio facts above are what the guide uses it for.
          </p>
        ) : (
          <ul className="role-list">
            {page.roles.map((cover) => (
              <li key={cover.role}>
                <span className="role mono">{cover.role}</span>
                <span className="characters mono">{cover.characters.join(' · ')}</span>
                <span className="sub">
                  {cover.recipes} recipe{cover.recipes === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {page.directions.length === 0 ? null : (
        <section className="panel span-2">
          <header>
            <h2>On its own</h2>
            <p className="note">Resolved against each direction with nothing else in the rig.</p>
          </header>
          {/*
            A real resolve, not a role-name match: character distance, polyphony and distinctness
            all decide this, and a list of role names can see none of them. Required and optional
            are counted apart — an optional request is filled if it fits and dropped if it does
            not (§4.4), so one fraction would understate a box that covers what a direction needs.
          */}
          <ul className="coverage-list">
            {page.directions.map((fit) => (
              <li key={fit.templateId}>
                <Link href={fit.href}>{fit.name}</Link>
                <span className="sub mono">
                  {fit.requiredCovered} of {fit.required} required parts
                  {fit.covered > fit.requiredCovered
                    ? `, ${fit.covered} of ${fit.requests} including optional`
                    : ''}
                </span>
                {fit.roles.length === 0 ? null : (
                  <span className="sub mono">{fit.roles.join(' · ')}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="note">
            A rig is more than one box. These are what {label} covers alone, which is the floor
            rather than what it will do beside something else.
          </p>
        </section>
      )}

      <Footer permalink={undefined} devices={[label]} />
    </main>
  )
}
