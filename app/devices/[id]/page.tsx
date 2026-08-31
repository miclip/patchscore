import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { citeText, ioText } from '@/components/guide/format'
import { PanelFigure } from '@/components/rack/panel-figure'
import type { Device } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel } from '@/lib/studio/catalogue'
import { REPOSITORY_URL } from '@/lib/studio/feedback'
import type { CapabilityGap } from '@/lib/studio/device-page'
import {
  capabilitySentence,
  clockText,
  devicePage,
  makerLink,
  provenanceSentence,
} from '@/lib/studio/device-page'

/**
 * §2.6/#121. What each non-citation state is, in a reader's words rather than the audit's.
 *
 * The audit's vocabulary is built for a report — `unchecked-capability` beside a device id — and
 * these are label text on a page somebody reads once. The states themselves are #120's and are
 * unchanged; this names them.
 */
const GAP_LABEL: Record<CapabilityGap['kind'], string> = {
  'cited-against': 'Read, answers no',
  // §2.6/#236. Not a gap in the usual sense, and the label says so: a page answers most of this.
  partly: 'Read, answers part',
  undocumented: 'Read, does not say',
  unread: 'Document not read',
  unchecked: 'Not checked',
}

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
  const maker = makerLink(device)
  const label = deviceLabel(device)
  const kind = device.kind.replace(/-/g, ' ')

  return (
    <main className="shell catalogue-page device-page">
      <header className="masthead">
        <h1>{label}</h1>
        <p>{kind}</p>
      </header>

      <section className="panel span-2">
        <header>
          <h2>Panel</h2>
          {/*
            §10. Two different claims, and the page must not make the first one for a box whose
            panel nobody has drawn: the outline there comes from the sockets the manifest
            declares, not from a figure anybody measured.
          */}
          <p className="note">
            {device.panel === undefined
              ? 'Our outline, from the sockets this box declares.'
              : 'Our drawing, from cited dimensions.'}
          </p>
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
            {/* #291. The maker's page, or the gap said out loud. A reader who owns the box is
                the person best placed to close it, so the empty state asks them rather than
                printing nothing and letting the row look complete. */}
            <dt>Maker&rsquo;s page</dt>
            {maker.kind === 'missing' ? (
              <dd className="note">
                Not recorded.{' '}
                <a href={`${REPOSITORY_URL}/issues/new`} target="_blank" rel="noopener noreferrer">
                  Send us the link
                </a>{' '}
                if you know it.
              </dd>
            ) : (
              <dd>
                <a href={maker.href} target="_blank" rel="noopener noreferrer">
                  {maker.host}
                </a>
              </dd>
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
            The sentence first, and in full ink: this is the reason to trust the page or not, and
            a reader who stops after one line should have read the number that matters. The word
            is provisional and stays provisional — a point value nobody has checked against a
            document is a setting somebody chose, and every softer word for it makes that sound
            like a filing omission.
          */}
          <p className="provenance-lead">{provenanceSentence(device, page.provenance)}</p>
          <p className="note">
            A point is the setting to dial, and it counts as cited only where a document prints
            that value. A range is the control&rsquo;s own limits, and mood may move a value only
            inside a cited range, so {page.provenance.moodInert} parameter
            {page.provenance.moodInert === 1 ? '' : 's'} here declare an axis that cannot move.
          </p>
          {/*
            Two tables, because §3.2's third column is a different claim on each row: a point with
            no citation is provisional, a range with none is unverified, and one heading cannot be
            true of both. Manual and observed stay apart for the reason the audit keeps them
            apart — "how much of this rests on one person's ear" is only answerable if they do.
          */}
          {page.provenance.params === 0 ? null : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Points</th>
                    <th scope="col" className="numeric">
                      Total
                    </th>
                    <th scope="col" className="numeric">
                      Manual
                    </th>
                    <th scope="col" className="numeric">
                      Observed
                    </th>
                    <th scope="col" className="numeric">
                      Provisional
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Values</td>
                    <td className="numeric mono">{page.provenance.params}</td>
                    <td className="numeric mono">{page.provenance.manualPoints}</td>
                    <td className="numeric mono">{page.provenance.observedPoints}</td>
                    <td className="numeric mono">{page.provenance.provisionalPoints}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {page.provenance.numerics === 0 ? null : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Ranges</th>
                    <th scope="col" className="numeric">
                      Total
                    </th>
                    <th scope="col" className="numeric">
                      Manual
                    </th>
                    <th scope="col" className="numeric">
                      Observed
                    </th>
                    <th scope="col" className="numeric">
                      Unverified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Bounds</td>
                    <td className="numeric mono">{page.provenance.numerics}</td>
                    <td className="numeric mono">{page.provenance.manualRanges}</td>
                    <td className="numeric mono">{page.provenance.observedRanges}</td>
                    <td className="numeric mono">{page.provenance.unverifiedRanges}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {/*
            §2.6/#22. What this box says about its own capability facts — the clock, the audio,
            the voices, the per-step features. Prose rather than a fourth table, because the
            counts are small and the interesting half of the sentence is the state a table has no
            column for: a fact somebody looked for and the manual does not print.
          */}
          <p className="provenance-lead">{capabilitySentence(page.provenance)}</p>
          {/*
            §2.6/#121. **Which** facts, not only how many. The sentence above can count and cannot
            point, and a reader told three facts on this box are unstated has no way to learn
            whether one of them is the clock topology they are about to rely on.

            Field paths verbatim and monospace (§10): `clock.preferredSource` is the manifest's own
            name for the thing, and a friendlier rewrite would be this page inventing a second
            vocabulary for a field that already has one. Nothing prints when every fact is cited.
          */}
          {page.capabilityGaps.length === 0 ? null : (
            <dl className="fact-list capability-gaps">
              {page.capabilityGaps.map((gap) => (
                <Fragment key={gap.kind}>
                  <dt>{GAP_LABEL[gap.kind]}</dt>
                  <dd className="mono">{gap.facts.join(', ')}</dd>
                </Fragment>
              ))}
            </dl>
          )}
          <p className="note">
            Panel span: {' '}
            {device.physical.verified === false
              ? 'not checked against a document.'
              : citeText(device.physical.verified)}
          </p>
        </section>
      </div>

      {device.warmUp === undefined &&
      device.calibration === undefined &&
      device.quickTune === undefined ? null : (
        <section className="panel span-2">
          <header>
            <h2>Before it holds pitch</h2>
            <p className="note">
              What this box needs of you every session, and what it needs of a technician. Both
              come from its manual; neither changes with what you are making.
            </p>
          </header>

          {device.warmUp === undefined ? null : (
            <dl className="fact-list">
              <dt>Warm-up</dt>
              <dd>{device.warmUp.note}</dd>
              <dt>Source</dt>
              <dd>
                {device.warmUp.verified === false
                  ? 'not checked against a document.'
                  : citeText(device.warmUp.verified)}
              </dd>
            </dl>
          )}

          {device.quickTune === undefined ? null : (
            <>
              <p>
                <strong>Quick tune.</strong> {device.quickTune.note} —{' '}
                <span className="mono">{device.quickTune.path}</span>.
              </p>
              <p className="note">
                {device.quickTune.verified === false
                  ? 'not checked against a document.'
                  : citeText(device.quickTune.verified)}
              </p>
            </>
          )}

          {device.calibration === undefined ? null : (
            <>
              <p>
                <strong>Calibration.</strong> {device.calibration.summary}.
              </p>
              {/*
                The maker's caution, and the reason this page carries a pointer rather than the
                procedure: every routine in the library is service work done inside the
                instrument. Printing the steps would read as an invitation to follow them.
              */}
              {device.calibration.caution === undefined ? null : (
                <p className="empty">{device.calibration.caution}.</p>
              )}
              <p className="note">
                The procedure itself is in the manual, not here —{' '}
                {device.calibration.verified === false
                  ? 'not checked against a document.'
                  : citeText(device.calibration.verified)}
              </p>
            </>
          )}
        </section>
      )}

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
            all decide this, and a list of role names can see none of them. The essential parts
            are counted apart — a direction declares which requests it can be itself without
            (§4.4), so one fraction would understate a box that covers everything it needs.
          */}
          <ul className="coverage-list">
            {page.directions.map((fit) => (
              <li key={fit.templateId}>
                <Link href={fit.href}>{fit.name}</Link>
                <span className="sub mono">
                  {fit.essentialCovered} of {fit.essential} essential parts
                  {fit.covered > fit.essentialCovered
                    ? `, ${fit.covered} of ${fit.requests} including what the direction can do without`
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
