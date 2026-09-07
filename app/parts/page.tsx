import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import type { Character, Role } from '@/lib/core'
import { ROLES } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { PARTS } from '@/lib/studio/parts'

/**
 * The parts a guide asks for, in words a reader who has never opened this app would use.
 *
 * A guide says `stab → Deluge · Track 3` and assumes you know what a stab is. Half of the
 * vocabulary is not self-explanatory — `ghost-perc`, `metallic`, `bass-mid`, `riser`, `vox-chop`
 * — and three of those are our words rather than anyone's. This is the page that answers it.
 *
 * The sibling of `/drum-machines`, and the other half of the same gap: that page says what an 808
 * kick *sounds* like, this one says what a `riser` *does*. Both are informational and neither
 * argues with the reader.
 *
 * **The descriptions are ours and the list is not.** `PARTS` is keyed by `Role`, so the compiler
 * refuses a page that has drifted from the vocabulary, and `test/parts-page.test.ts` refuses one
 * that is merely stale. A role added to `lib/core/vocabulary.ts` without a description here fails
 * the build rather than rendering a gap — which is the whole reason this derives the list instead
 * of hand-writing it the way `/drum-machines` does. That page is about sounds we do not model;
 * this one is about a vocabulary we do.
 *
 * `PARTS` itself lives in `lib/studio/parts.ts`: #457's definition modal shows the same `is`
 * sentences, and two copies of 23 descriptions is one of them going stale.
 *
 * The characters are read from the library rather than authored, because they answer a question
 * the words cannot: `impact` comes in one character and `pad` in six, and a part with one
 * character is a part that means one thing.
 */
export const metadata: Metadata = {
  title: 'Parts — Patchscore',
  description:
    'What a pad, a stab, a riser, a sub and the rest of the parts in a guide are, and what each ' +
    'one is doing in a track.',
  alternates: { canonical: '/parts' },
}

/** Which characters the library can currently give you for a part. Read, never authored. */
function charactersFor(role: Role): Character[] {
  const found = new Set<Character>()
  for (const device of DEVICES) {
    for (const recipe of device.recipes) if (recipe.role === role) found.add(recipe.character)
  }
  // Code unit, not locale: CLAUDE.md's rule on comparison.
  return [...found].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export default function Page() {
  return (
    <main className="shell catalogue-page reference-page">
      <header className="masthead">
        <h1>Parts</h1>
        <p>
          What a guide is asking for when it names a part, and what each one is doing in a track.
        </p>
      </header>

      <section className="panel">
        <header>
          <h2>What this page is for</h2>
        </header>
        <p>
          A guide hands you a list of parts and a box to play each one on. It says{' '}
          <span className="mono">stab</span> and <span className="mono">ghost-perc</span> and{' '}
          <span className="mono">bass-mid</span> without stopping to say what those are, because it
          is written to be read at a machine with your hands busy.
        </p>
        <p>
          This is where they are explained. Each one says what it is, then what it is doing — the
          second being the half a definition normally leaves out, and the half that tells you
          whether the part is working.
        </p>
        <p>
          For what the drum sounds themselves are and where they came from, the{' '}
          <a href="/drum-machines">drum machines</a> page is the companion to this one.
        </p>
      </section>

      <div className="columns">
        {ROLES.map((role) => {
          const part = PARTS[role]
          const characters = charactersFor(role)
          return (
            <section key={role} className="panel">
              <header>
                <h2 className="mono">{role}</h2>
                <p className="note">{part.sub}</p>
              </header>
              <dl className="fact-list machine-facts">
                <dt>What it is</dt>
                <dd>{part.is}</dd>
                <dt>What it does</dt>
                <dd>{part.use}</dd>
                {characters.length > 0 ? (
                  <>
                    <dt>Asked for as</dt>
                    <dd className="mono">{characters.join(' · ')}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          )
        })}
      </div>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
