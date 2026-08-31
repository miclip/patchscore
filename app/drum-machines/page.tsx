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
  /** Where the sound came from, and why that is why it sounds like this. */
  origin: string
  suits: string
  unsure: string
  wide?: true
}

/**
 * Authored, in our words. Sound first, because that is what a reader came for; then what it
 * suits; then the line to follow if none of it has helped yet.
 *
 * **Origin earns its place by explaining the sound, and only that.** The rule here was once no
 * dates and no history at all, on the argument that a reader wanting a kick is not served by a
 * year. That was too strong: *why* the 808's kick rings on is that Roland synthesised it rather
 * than recording it, and *why* the 909's hats sound unlike its kick is that one is a circuit and
 * the other a recording. A reader who knows that can predict the box.
 *
 * So each entry says where it came from, in one line, after the sound and what it suits. What
 * stays out is everything that does not change what you hear — model numbers, chip names,
 * production runs, who used it on which record.
 */
const MACHINES: Machine[] = [
  {
    id: 'tr-808',
    name: 'TR-808',
    sub: 'The long kick',
    sounds:
      'The kick is a low tone that rings on after the hit, with almost no click at the front. It is closer to a bass note than to a drum. The clap has a smeared tail on it, like a room. Hats are thin and ticky, and the cowbell is unmistakable.',
    origin:
      'Roland built it in 1980 out of analogue circuits rather than recordings, so every sound is synthesised. That is why the kick is a tuned tone that rings on instead of a recorded thump: it is closer to a bass note because it is one.',
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
    origin:
      'Roland’s 1983 follow-up, and a hybrid — the kick, snare and toms are analogue circuits, the hats and cymbals are short digital recordings. The split is audible: the low end is synthetic and punchy, the metal is grainy and fixed.',
    suits: 'House, techno and trance. It holds up loud and on a big system.',
    unsure:
      'If your kick keeps disappearing under everything else, swap it for this one and it will come back.',
  },
  {
    id: 'tr-707',
    name: 'TR-707',
    sub: 'The flat one',
    sounds:
      'Short, dry and even. Recorded drums played back briefly, with no ring on them. Nothing sticks out and nothing hangs around.',
    origin:
      'A 1985 machine built entirely from short digital recordings of a kit, with no synthesis and almost no processing. It sounds flat because nothing was done to it, which is exactly what makes it useful under a busy arrangement.',
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
    origin:
      'The drum half of a pair sold with the TB-303 bassline in 1982, and built small and cheap to match it. Everything is analogue and thin because it was never meant to fill a room on its own.',
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
    origin:
      'A 1978 preset machine from before you could program your own patterns — you chose a rhythm and it played it. The sounds are soft and papery because they were made to sit politely under an organ or a guitar, not to lead a track.',
    suits: 'Ballads, gentle pop and ambient. Drums that hold the song up without taking the front.',
    unsure: 'Reach for it when a 909 feels too loud for what you are writing.',
  },
  {
    id: 'linndrum',
    name: 'LinnDrum',
    sub: 'A real kit, cut short',
    sounds:
      'Recordings of a real kit, cut off before they finish. The snare cracks and then stops dead, taking the room with it, which is why eighties records snap the way they do. Toms have real pitch and drop away just as abruptly. Nothing rings on into the next beat.',
    origin:
      'One of the first machines to play digital recordings of a real kit, in 1982, and expensive enough that hearing one meant hearing a record. It sounds like a kit because it is one, cut short by the memory of the day.',
    suits: 'Eighties pop, R&B and soul. Anything wanting a drummer while staying on the grid.',
    unsure: 'Use it when the song wants a player rather than a machine.',
  },
  {
    id: 'dx7',
    name: 'DX7',
    sub: 'Not a drum machine',
    sounds:
      'An FM synthesizer, so it has no kit and no patterns. One wave shapes another, which gives you bells, glassy electric pianos, hard plucked basses and metallic clanks. It is one way to make a struck bell or a clanging metal hit. A recording of a real bell is another, and a guide only means this one where it says FM.',
    origin:
      'A 1983 Yamaha keyboard using FM synthesis, and not a drum machine at all. FM is good at metal and glass, so its bells and struck tones ended up doing percussion work nobody designed them for.',
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
          one-shot. In case you need more help, this page explains those sounds one machine at a
          time.
        </p>
        <p>
          These are families of sound, and the names outlived the boxes. Producers have said
          &ldquo;an 808 kick&rdquo; for forty years about sounds that never came near a real 808.
          You do not need the hardware to use any of this, only an idea of what you are
          listening for.
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
              <dt>Where it came from</dt>
              <dd>{machine.origin}</dd>
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
          names. We cannot tell you whether it does, because Patchscore is never told what is in
          your library. Once you open the folder, listen for this: an 808-style kick is the low one
          that rings on with no click at the front, and a 909-style kick is the short one that
          clicks and drops.
        </p>
        <p>
          If your rig can synthesise a drum sound, that is usually the easier route for a
          beginner. Searching a card for &ldquo;a dry kick with a defined
          attack&rdquo; has no finish line. You audition, you reject, you audition again, and
          nothing tells you when to stop. Dialling a kick is finished when the numbers are dialled.
          The guide gives you the values and this page tells you what they are aiming at.
        </p>
      </section>

      <Footer permalink={undefined} devices={[]} />
    </main>
  )
}
