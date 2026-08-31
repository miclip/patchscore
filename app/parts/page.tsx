import type { Metadata } from 'next'
import { Footer } from '@/components/footer'
import type { Character, Role } from '@/lib/core'
import { ROLES } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'

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

type Part = {
  /** The one-line gloss under the name. */
  sub: string
  /** What it is. */
  is: string
  /** What it is doing in a track, which is the half a definition leaves out. */
  use: string
}

/**
 * Authored, in our words: what it is, then what it is for. Written for somebody who has heard
 * this music and never had to name its pieces.
 *
 * No history and no gear. A reader who wants to know what an 808 kick sounds like is on the
 * drum-machines page; a reader here wants to know why the guide is asking them for a `sub` as
 * well as a `bass-mid`.
 */
const PARTS: Record<Role, Part> = {
  kick: {
    sub: 'The pulse',
    is: 'The low drum on the floor, and usually the loudest thing in the track.',
    use: 'It sets the tempo you feel rather than count. Almost everything else is placed against it.',
  },
  snare: {
    sub: 'The backbeat',
    is: 'The bright crack that answers the kick, normally on beats two and four.',
    use: 'It is what makes a rhythm walk. Move it and the whole feel of the bar changes.',
  },
  clap: {
    sub: 'The wider backbeat',
    is: 'A handclap, or a stack of them, sitting where a snare would.',
    use: 'Used instead of a snare for a softer, wider hit, or on top of one to make it broader.',
  },
  rim: {
    sub: 'The quiet click',
    is: 'A stick on the rim of a drum rather than its skin — dry, short, no body.',
    use: 'A backbeat that stays out of the way, and the usual answer when a snare is too much.',
  },
  tom: {
    sub: 'The tuned drums',
    is: 'Drums with a definite pitch, normally several at different tunings.',
    use: 'Fills and turnarounds — the thing that carries you from one section into the next.',
  },
  'closed-hat': {
    sub: 'The tick',
    is: 'A hi-hat struck shut, so it stops as soon as it starts.',
    use: 'It fills the gaps between kick and snare and is where most of a groove’s detail lives.',
  },
  'open-hat': {
    sub: 'The lift',
    is: 'A hi-hat left to ring rather than damped.',
    use: 'Usually offbeat, and what gives a straight pattern its swing and its push forward.',
  },
  ride: {
    sub: 'The steady cymbal',
    is: 'A cymbal played in a repeating pattern rather than crashed.',
    use: 'Keeps time up high, where a hat would be busier and a crash would be too much.',
  },
  'ghost-perc': {
    sub: 'The hits you feel',
    is: 'Quiet percussion between the loud hits, low enough that you notice it missing.',
    use: 'It makes a pattern breathe. Take it out and everything sounds programmed.',
  },
  metallic: {
    sub: 'Struck metal',
    is: 'Bells, cowbell, rims, anything with a ringing tone that is not really a note.',
    use: 'A repeating figure that adds movement without adding harmony, since it belongs to no key.',
  },
  impact: {
    sub: 'The marker',
    is: 'A single loud event — a crash, a hit, a slam.',
    use: 'It marks a boundary. One at the top of a section tells the ear that something changed.',
  },
  riser: {
    sub: 'The climb',
    is: 'A sound that rises over several bars, in pitch or brightness or both.',
    use: 'It exists to lead somewhere and stops mattering the moment it arrives.',
  },
  sweep: {
    sub: 'The slow move',
    is: 'A filter or a noise wash moving across a section, up or down.',
    use: 'Slower and less directed than a riser. It changes how a section feels rather than announcing the next one.',
  },
  sub: {
    sub: 'The weight',
    is: 'The lowest part, often a plain sine, felt more than heard.',
    use: 'It carries the low end on a big system and does almost nothing on a laptop speaker.',
  },
  'bass-mid': {
    sub: 'The bass you hear',
    is: 'The bass part with enough upper harmonics to survive a small speaker.',
    use: 'It carries the tune of the low end. Split from the sub so each can be placed on its own.',
  },
  acid: {
    sub: 'The 303 line',
    is: 'A monophonic bassline through a resonant filter, with slides and accents in the notes.',
    use: 'The line stays put and the filter is played by hand. The performance is the knob, not the notes.',
  },
  lead: {
    sub: 'The tune',
    is: 'A single line meant to be followed, usually the highest thing carrying a melody.',
    use: 'It is what somebody hums afterwards, and the part everything else makes room for.',
  },
  stab: {
    sub: 'The punctuation',
    is: 'A chord struck and immediately gone.',
    use: 'Rhythm made out of harmony. It marks time rather than sustaining it.',
  },
  arp: {
    sub: 'The chord, spread',
    is: 'A chord played one note at a time in a fixed order rather than struck at once.',
    use: 'It gives harmony a rhythm of its own, and fills space that a pad would only fill flatly.',
  },
  pad: {
    sub: 'The bed',
    is: 'Sustained chords underneath everything, with slow attack and long release.',
    use: 'Harmony you feel rather than follow. It sets the mood and hides the joins between sections.',
  },
  texture: {
    sub: 'The detail',
    is: 'Background material with no tune and no rhythm to speak of.',
    use: 'It fills the space between the parts you are listening to. You would notice it gone.',
  },
  noise: {
    sub: 'The wash',
    is: 'Unpitched sound — hiss, air, static — with no note in it at all.',
    use: 'A bed under the drums, or a rhythm in its own right when it is gated.',
  },
  'vox-chop': {
    sub: 'The cut-up voice',
    is: 'A vocal recording sliced up and played as an instrument rather than sung.',
    use: 'It brings a human sound in without bringing a lyric, and it is played from a keyboard or pads.',
  },
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
