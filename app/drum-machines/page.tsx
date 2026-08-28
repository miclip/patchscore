import type { Metadata } from 'next'
import { Footer } from '@/components/footer'

/**
 * #174. What the drum-machine names in a guide sound like, for a reader who has heard the records
 * and never read a manual.
 *
 * A static server component in the shape of `/directions`: exported metadata with its own
 * canonical, a masthead, an authored body and the shared `Footer`. Nothing here is derived from
 * the registry, because nothing here is about a device we model. It is about the sounds a
 * `sourceAudio.need` line reaches for, which is why it is a page of its own rather than a section
 * on a device page.
 *
 * The DX7 entry is the one that has to be careful about the other direction. A `need` line asking
 * for a struck metal one-shot is asking for a *sound*, and FM is one way to get there beside a
 * recording of a real bell. So the entry offers itself as a method rather than announcing itself
 * as the answer, and points at FM only where a guide says FM.
 *
 * **Two things this page must never do.**
 *
 * It must not say what is on the reader's card. Patchscore has not established what is in anyone's
 * library, and the Deluge and the Tracker Mini declare a shipped library precisely because that
 * question is open, so the sentence available to us is conditional: *if* your library holds an
 * 808-style kick, here is what it sounds like. That sentence is worth reading whether or not they
 * have one, and it makes no claim we cannot support.
 *
 * It must not dress our ears up as a citation. `roland-tr-1000` cites GEN list p.1 for the fact
 * that Roland ships generators under these names, and that page prints a name, a category and a
 * folder. It does not describe a sound. So the citation below is scoped to the names, and every
 * character description is Patchscore's own, said in Patchscore's voice and marked as such.
 */
export const metadata: Metadata = {
  title: 'Drum machines — Patchscore',
  description:
    'What an 808, a 909, a 707, a 606, a CR-78 and a LinnDrum sound like, what each one suits, and which to reach for when you are not sure. Plus the DX7, which is not a drum machine.',
  alternates: { canonical: '/drum-machines' },
}

type Machine = {
  id: string
  name: string
  sub: string
  sounds: string
  suits: string
  unsure: string
  wide?: true
}

/**
 * Authored, in our words. Sound first, because that is what a reader came for; then what it
 * suits; then the line to follow if none of it has helped yet.
 *
 * No date, no chip, no manufacturer history. A reader standing at a machine wanting a kick is
 * not served by a year, and every extra clause is one more thing between them and the sound.
 */
const MACHINES: Machine[] = [
  {
    id: 'tr-808',
    name: 'TR-808',
    sub: 'The long kick',
    sounds:
      'The kick is a low tone that rings on after the hit, with almost no click at the front. It is closer to a bass note than to a drum. The clap has a smeared tail on it, like a room. Hats are thin and ticky, and the cowbell is unmistakable.',
    suits:
      'Hip-hop, trap, electro, and anything where the kick carries the low end on its own. Give the kick a long decay and tune it, and it plays a bass line for you.',
    unsure:
      'Start here for a modern beat. A long kick and a clap is a track most of the way to finished.',
  },
  {
    id: 'tr-909',
    name: 'TR-909',
    sub: 'The one that punches',
    sounds:
      'The kick has a click at the front and drops in pitch fast, so you hear the hit before you hear the tone. Shorter and harder than an 808. The snare is mostly noise, and the hats and cymbals are bright and splashy.',
    suits: 'House, techno and trance. It holds up loud, and it holds up on a big system.',
    unsure:
      'If your kick keeps disappearing under everything else, swap it for this one and it will come back.',
  },
  {
    id: 'tr-707',
    name: 'TR-707',
    sub: 'The flat one',
    sounds:
      'Short, dry and even. Recorded drums played back briefly, with no ring and no tail. Nothing sticks out and nothing hangs around.',
    suits:
      'Parts that should stay out of the way. Electro, synth-pop, freestyle, and anything where a big kick would crowd the bass.',
    unsure:
      'Put it under something rather than in front of it. A 707 kick layered beneath an 808 gives you the attack without losing the low tone.',
  },
  {
    id: 'tr-606',
    name: 'TR-606',
    sub: 'Small and ticky',
    sounds:
      'Thin and light throughout. The kick is small, the snare is papery, and the hats and cymbal are the reason anyone reaches for it. It sounds cheap on purpose.',
    suits: 'Fast patterns, acid, and scrappy electronic music. It sits well under a squelchy bass.',
    unsure:
      'Take the hats and leave the rest. A 606 hat over an 808 kick is a common and easy pairing.',
  },
  {
    id: 'cr-78',
    name: 'CR-78',
    sub: 'Soft and papery',
    sounds:
      'Quiet, woody and light. The hats sound brushed, the snare is a soft tap, and nothing hits hard. It was built to play preset patterns behind a song.',
    suits: 'Ballads, gentle pop and ambient. Drums that hold the song up without taking the front.',
    unsure: 'Reach for it when a 909 feels too loud for what you are writing.',
  },
  {
    id: 'linndrum',
    name: 'LinnDrum',
    sub: 'A real kit, cut short',
    sounds:
      'Recordings of a real kit, cut off before they finish. The snare cracks and then stops dead, taking the room with it, which is why eighties records snap the way they do. Toms have real pitch and drop away just as abruptly. Nothing rings on into the next beat.',
    suits: 'Eighties pop, R&B and soul. Anything wanting a drummer while staying on the grid.',
    unsure: 'Use it when the song wants a player rather than a machine.',
  },
  {
    id: 'dx7',
    name: 'DX7',
    sub: 'Not a drum machine',
    sounds:
      'An FM synthesizer, so it has no kit and no patterns. One wave shapes another, which gives you bells, glassy electric pianos, hard plucked basses and metallic clanks. It is one way to make a struck bell or a clanging metal hit. A recording of a real bell is another, and a guide only means this one where it says FM.',
    suits:
      'Bells, mallets, electric piano and the bass sound that sits somewhere between a pluck and a thump. Also every percussive noise that has no acoustic original.',
    unsure:
      'If you came here for a kick or a snare, this is not the entry you want. If your guide named FM, or your box offers it and you would rather dial a bell than hunt for one, it is.',
    wide: true,
  },
]

export default function Page() {
  return (
    <main className="shell catalogue-page reference-page">
      <header className="masthead">
        <h1>Drum machines</h1>
        <p>
          What the names in a guide sound like, and which one to reach for when you are not sure.
        </p>
      </header>

      <section className="panel">
        <header>
          <h2>What this page is for</h2>
        </header>
        <p>
          A guide will sometimes ask you for a dry kick with a defined attack, or a struck metal
          one-shot. That is accurate and it assumes you already know what those words do. This page
          says the same things in plainer language, one machine at a time.
        </p>
        <p>
          These are families of sound, and the names outlived the boxes. Producers have said
          &ldquo;an 808 kick&rdquo; for forty years about sounds that never came near a real 808.
          You do not need the hardware to use any of this. You need to know what you are listening
          for.
        </p>
        <p className="reference-note">
          Every description here is ours. We wrote it from listening, and you should treat it as
          taste rather than specification.
        </p>
      </section>

      <div className="columns">
        {MACHINES.map((machine) => (
          <section
            key={machine.id}
            className={machine.wide === true ? 'panel span-2' : 'panel'}
          >
            <header>
              <h2>{machine.name}</h2>
              <p className="note">{machine.sub}</p>
            </header>
            <dl className="fact-list machine-facts">
              <dt>Sounds like</dt>
              <dd>{machine.sounds}</dd>
              <dt>Good for</dt>
              <dd>{machine.suits}</dd>
              <dt>If unsure</dt>
              <dd>{machine.unsure}</dd>
            </dl>
          </section>
        ))}
      </div>

      <section className="panel">
        <header>
          <h2>Finding one, or making one</h2>
        </header>
        <p>
          If your sampler came with a sample library, some of it may already answer to these
          names. We cannot tell you that it does. Patchscore has not established what is in your
          library, so it never tells you which sounds you own. What it can tell you is what to
          listen for once you open the folder. An 808-style kick is the low one that rings
          on with no click at the front. A 909-style kick is the short one that clicks and drops.
        </p>
        <p>
          If your rig can synthesise a drum sound, that route is often the easier one, and for a
          beginner it usually is. Searching a card for &ldquo;a dry kick with a defined
          attack&rdquo; has no finish line. You audition, you reject, you audition again, and
          nothing tells you when to stop. Dialling a kick is finished when the numbers are dialled.
          The guide gives you the values and this page tells you what they are aiming at.
        </p>
      </section>

      <section className="panel">
        <header>
          <h2>Where the names come from</h2>
        </header>
        <p>
          Roland&rsquo;s own TR-1000 ships sound generators called{' '}
          <span className="mono">808 Bass Drum</span>, <span className="mono">909 Snare Drum</span>,{' '}
          <span className="mono">707 Tom</span>, <span className="mono">606 Closed HiHat</span> and{' '}
          <span className="mono">CR78 Cymbal</span>, among others in the same families.
        </p>
        <p className="reference-cite mono">
          manual — TR-1000 Preset GEN/INST List (eng02) v1.20, GEN list p.1
        </p>
        <p>
          That page prints a name, a category and a folder for each generator. It is our source for
          the fact that Roland uses these names for these sounds, and for nothing else on this
          page. It describes no sound, so the character of each family above rests on our ears.
          The LinnDrum and the DX7 do not appear on it at all, and nothing said about them here is
          cited to anything.
        </p>
      </section>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
