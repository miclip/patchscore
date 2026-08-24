import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/footer'
import { num } from '@/components/guide/format'
import { ProgressionTable, SectionTable } from '@/components/guide/song-tables'
import type { Template } from '@/lib/core'
import { TEMPLATES } from '@/lib/templates'
import { directionPage } from '@/lib/studio/direction-page'

/**
 * #84. One direction, everything the template holds and what any rig covers of it.
 *
 * Prerendered per template, a server component with no client boundary, and canonical to its own
 * address — the same three rules as a device page, for the same reasons.
 *
 * The progression and the section map are the guide's own tables, imported rather than rewritten
 * (`components/guide/song-tables.tsx`). Both were already reading the template rather than a
 * resolved song, which is what made them shared rather than copied: a progression is authored in
 * degrees and only resolves against a key at guide time, and a section's bars do not move at all.
 */

export const dynamicParams = false

export function generateStaticParams(): { id: string }[] {
  return TEMPLATES.map((template) => ({ id: template.id }))
}

function find(id: string): Template | undefined {
  return TEMPLATES.find((template) => template.id === id)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const template = find(id)
  if (template === undefined) return {}
  const page = directionPage(template)
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.href },
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const template = find(id)
  if (template === undefined) notFound()

  const page = directionPage(template)
  const { bpm, harmony, keys } = template

  return (
    <main className="shell catalogue-page direction-page">
      <header className="masthead">
        <h1>{template.name}</h1>
        <p className="mono">
          {num(bpm.min)}–{num(bpm.max)} BPM · {num(page.totalBars)} bars · {keys.join(' · ')}
        </p>
        <p className="masthead-actions">
          <Link href="/directions">All directions</Link> <Link href="/devices">All devices</Link>{' '}
          <Link href="/">Open the studio</Link>
        </p>
      </header>

      <div className="columns">
        <section className="panel">
          <header>
            <h2>The song</h2>
          </header>
          <dl className="fact-list">
            <dt>Tempo</dt>
            <dd className="mono">
              {num(bpm.min)}–{num(bpm.max)} BPM, {num(bpm.default)} unless you move it
            </dd>
            <dt>Keys</dt>
            {/* Every candidate, because the guide picks one per seed and any of them may come up. */}
            <dd className="mono">{keys.join(' · ')}</dd>
            <dt>Harmonic cycle</dt>
            <dd className="mono">{num(harmony.cycleBars)} bars</dd>
            <dt>Length</dt>
            <dd className="mono">
              {num(page.totalBars)} bars across {num(template.structure.length)} sections
            </dd>
            <dt>Asks for</dt>
            <dd className="mono">
              {num(template.roles.length)} parts · {num(template.hooks.length)} hooks ·{' '}
              {num(template.patterns.length)} step patterns
            </dd>
          </dl>

          <h3>Progression</h3>
          {/* Degrees, not notes: the key is chosen per guide, so this is what the genre authors. */}
          <ProgressionTable harmony={harmony} />
        </section>

        <section className="panel">
          <header>
            <h2>Structure</h2>
            <p className="note">Energy picks each part&rsquo;s density band.</p>
          </header>
          <SectionTable structure={template.structure} />
        </section>
      </div>

      <section className="panel span-2">
        <header>
          <h2>The parts it asks for</h2>
          <p className="note">
            {num(template.roles.length)} requests, in the order the template authors them.
          </p>
        </header>
        {/*
          Priority is printed rather than sorted on: it is a number the resolver reads (§4.4), and
          re-ordering the page by it would hide two requests sharing one. Optional and note count
          are printed for every row, because a blank cell reads as unknown rather than as one.
        */}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col">Character</th>
                <th scope="col" className="numeric">
                  Priority
                </th>
                <th scope="col" className="numeric">
                  Notes
                </th>
                <th scope="col">Needed</th>
                <th scope="col">Sections</th>
              </tr>
            </thead>
            <tbody>
              {page.requests.map((request) => (
                <tr key={request.id}>
                  <td className="mono">{request.role}</td>
                  <td className="mono">{request.character}</td>
                  <td className="mono numeric">{num(request.priority)}</td>
                  <td className="mono numeric">{num(request.notes)}</td>
                  <td>
                    {request.optional ? 'optional' : 'required'}
                    {request.distinct ? ', own box' : ''}
                  </td>
                  <td>
                    {request.sustain === 'continuous'
                      ? 'every section'
                      : request.sections.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel span-2">
        <header>
          <h2>What covers it</h2>
          <p className="note">Each box resolved against this direction with nothing beside it.</p>
        </header>
        {/*
          Every device in the registry, zero included. A box that covers nothing of a direction is
          a fact about that box, and a list that dropped it would read as a list of boxes that
          work. Registry order (§7.2), the same order the picker and the rack use.
        */}
        <ul className="coverage-list">
          {page.rig.map((fit) => (
            <li key={fit.deviceId}>
              <Link href={fit.href}>{fit.label}</Link>
              <span className="sub mono">
                {fit.requiredCovered} of {fit.required} required parts
                {fit.covered > fit.requiredCovered
                  ? `, ${fit.covered} of ${fit.requests} including optional`
                  : ''}
              </span>
              <span className="sub mono">
                {fit.roles.length === 0 ? 'nothing on its own' : fit.roles.join(' · ')}
              </span>
            </li>
          ))}
        </ul>
        <p className="note">
          These are what each box carries alone. A rig is more than one box, and two of these
          together cover more than either does here.
        </p>
      </section>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
