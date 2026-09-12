import type { Riff, RiffResolution } from '@/lib/core'
import { num } from '@/lib/core'
import { SlotList } from '@/components/pattern/slot-list'
import { StepGrid } from '@/components/pattern/step-grid'
import { ProgressionTable } from '@/components/guide/song-tables'
import {
  RIFF_GRID_LEAD,
  degreeLabel,
  heldLabel,
  midiLabel,
  noteRows,
  riffChordSummary,
  riffNoteSummary,
  riffNotesUnresolved,
  spellingLabel,
} from '@/lib/studio/riff-text'

/**
 * §5A. **The figure itself — the notes and the grid — which no rig is involved in.**
 *
 * A server component with no client boundary, because nothing here depends on what the reader
 * owns: a hook resolves against the riff's own key (§4.1) and a grid is authored. So every note
 * and every step is in the prerendered HTML, where a crawler, a reader with no JavaScript and a
 * sheet of paper all receive it. Only *where it plays* needs a rig, and only that is a client
 * island.
 *
 * **Rendered from the model, never from the Markdown.** `renderRiff` is this file's sibling in
 * §8's sense, not its source: parsing one renderer's output to produce another's is how two
 * surfaces come to disagree about something neither of them decided. What they share is
 * `lib/studio/riff-text.ts`, which holds every sentence and every derived row they both use, and
 * `test/riff-page.test.ts` asserts the facts of one against the other (#495).
 */

/**
 * §10/#495. **The separator both renderings use**, so a note row reads the same on the page as it
 * does in the export — and, more to the point, the same *out loud*: without it a screen reader
 * runs five facts together as one phrase. The flex gap beside it is spacing; this is punctuation,
 * and the two do different jobs.
 *
 * `aria-hidden` would silence exactly the thing it is here for, so it is not marked. It is one
 * character and it is content.
 */
function Sep() {
  return <span className="riff-sep">·</span>
}

/**
 * §4.1/#32. One row per step, chords sharing one. Spelling, degrees and MIDI, because a box may
 * spell an octave differently and MIDI is the number with no convention drift in it.
 *
 * A labelled line rather than a table, which is `render.ts`' own decision and holds here for its
 * reason: a labelled line survives wrapping on a phone, where a table's header scrolls away from
 * its body (#21).
 */
function Notes({ resolution }: { resolution: RiffResolution }) {
  const unresolved = riffNotesUnresolved(resolution)
  if (unresolved !== undefined) return <p className="riff-unresolved">{unresolved}</p>
  if (resolution.notes.outcome !== 'resolved') return null
  const hook = resolution.notes.hook
  return (
    <>
      <p className="riff-note-summary">{riffNoteSummary(hook)}</p>
      <ul className="riff-notes">
        {noteRows(hook).map((row) => (
          <li key={row.step} className="riff-note">
            <span className="riff-step mono">step {num(row.step)}</span>
            <Sep />
            <span className="mono riff-spelling">{spellingLabel(row)}</span>
            <Sep />
            <span className="riff-note-fact mono">{degreeLabel(row)}</span>
            <Sep />
            <span className="riff-note-fact mono">{midiLabel(row)}</span>
            <Sep />
            <span className="riff-note-fact">{heldLabel(row)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * §5A/§4.1. **The chords, where the figure follows them.**
 *
 * `ProgressionTable` rather than a table written here: a direction's page already draws a
 * `Harmony` as Degree and Bars, and drawing it a second way would be two treatments of one fact
 * for a reader moving between the two pages in one sitting — the thing #528 fixed on the grid.
 * It also brings `.table-scroll` with it, which is §8's phone rule and which a hand-rolled table
 * here did not have.
 *
 * Absent on a riff with no `harmony`, which is most of them — and absent rather than empty, so a
 * page for a one-key figure does not carry a heading over nothing.
 */
function Chords({ riff }: { riff: Riff }) {
  const summary = riffChordSummary(riff)
  if (riff.harmony === undefined || summary === undefined) return null
  return (
    <section className="panel riff-panel">
      <header>
        <h2>The chords</h2>
      </header>
      <p className="riff-grid-lead">{summary}</p>
      <ProgressionTable harmony={riff.harmony} />
    </section>
  )
}

/**
 * §4.3's grid, and it is **the figure a guide draws, not a picture of the export** (#528).
 *
 * This was `gridRows` in a `<pre>`, which is the Markdown's ink on a surface that can draw boxes:
 * a reader moving between a guide and a riff page in one sitting saw two treatments of one
 * figure, and the text one gives nothing to count sixteen `x` against. `StepGrid` is shared, so
 * the boxes, the stronger border every fourth step, the copyable `x`/`·` rows underneath and the
 * label naming the struck steps all arrive here rather than being chosen again.
 *
 * The slot rows come with it, and with the two facts this page was dropping: the velocity on the
 * line, and #457's definition trigger on the slot word.
 */
function Grid({ riff }: { riff: Riff }) {
  return (
    <>
      <p className="riff-grid-lead">{RIFF_GRID_LEAD}</p>
      <StepGrid pattern={riff.pattern} />
      <SlotList pattern={riff.pattern} />
    </>
  )
}

/**
 * The figure: what it is, how it is played, and nothing about anybody's boxes.
 *
 * Two panels rather than one, because they answer different questions and a reader standing at a
 * machine wants to look at one of them at a time.
 */
export function RiffFigure({ riff, resolution }: { riff: Riff; resolution: RiffResolution }) {
  return (
    <div className="columns">
      <Chords riff={riff} />

      <section className="panel riff-panel">
        <header>
          <h2>The notes</h2>
        </header>
        <Notes resolution={resolution} />
      </section>

      <section className="panel riff-panel">
        <header>
          <h2>The grid</h2>
        </header>
        <Grid riff={riff} />
      </section>
    </div>
  )
}
