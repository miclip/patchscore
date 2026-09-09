import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/footer'
import { ROLES } from '@/lib/core'
import { SAMPLE_GROUPS, SAMPLE_TARGETS, targetsInGroup } from '@/lib/samples'
import { sampleHref } from '@/lib/studio/catalogue'
import { sampleCardLine, sampleLead } from '@/lib/studio/sample-text'

/**
 * §3.8/#520. **Every sound this library can tell you how to make, grouped.**
 *
 * A server component with no client boundary at all, and deliberately not the `Browse` shell the
 * other three catalogues use. Those are long lists a reader searches; this is twenty-four sounds a
 * reader **scans**, and the four groups are the answer to the presentation problem all 23 roles
 * would otherwise be: `SAMPLE_GROUPS` files the kit twelve in §3.6's order, then the low end, the
 * tonal sounds, and the beds and transitions. See `lib/samples/index.ts`.
 *
 * No rig here. Which of a reader's boxes makes a sound is a question with one answer per sound,
 * and it is asked on the sound's own page.
 */
export const metadata: Metadata = {
  title: 'Samples — Patchscore',
  description:
    'Make the sounds a guide asks for on the boxes you already own, and record them yourself.',
  alternates: { canonical: '/samples' },
}

export default function Page() {
  return (
    <main className="shell catalogue-page">
      <header className="masthead">
        <h1>Samples</h1>
        {/*
          §3.8/#520. **Both numbers, because they answer different questions.** Twenty-four is how
          many entries are below; twenty-three is the whole of `ROLES`, which is the claim — every
          part a recipe ever asks a reader to supply audio for is offered, rather than a list
          somebody curated. The two differ because a role may carry more than one target where the
          technique is what separates them, which is what `wobble-bass` beside `bass-note` is.
        */}
        <p>
          {SAMPLE_TARGETS.length} sounds across {ROLES.length} roles. Pick one, build it on the
          boxes you own, and record it. The file is yours.
        </p>
      </header>

      <div className="catalogue-body sample-groups">
        {SAMPLE_GROUPS.map((group) => (
          <section className="sample-group" key={group.id}>
            <h2>{group.title}</h2>
            <div className="catalogue-list">
              {targetsInGroup(group).map((target) => (
                <Link className="catalogue-link" href={sampleHref(target)} key={target.id}>
                  <span className="catalogue-name">{target.name}</span>
                  <span className="catalogue-sub mono">{sampleLead(target)}</span>
                  <span className="catalogue-sub">{sampleCardLine(target)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
