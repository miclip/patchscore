import type { Riff, RiffResolution } from '@/lib/core'
import { num } from '@/lib/core'
import {
  RIFF_GRID_LEAD,
  degreeLabel,
  gridRows,
  heldLabel,
  midiLabel,
  noteRows,
  riffNoteSummary,
  riffNotesUnresolved,
  slotRows,
  spellingLabel,
  stepList,
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
 * §4.3's grid, in the same `x` / `·` rows the Markdown draws — the rows come from `gridRows`, so
 * a page whose grid disagreed with its export is not reachable.
 *
 * A `<pre>` because the alignment *is* the reading: the gutter and the groups of four are how a
 * reader finds step 23 without counting from one. It scrolls inside its own container at any
 * width rather than taking the body sideways (#21), and the whole block is one `mono` face.
 */
function Grid({ riff }: { riff: Riff }) {
  return (
    <>
      <p className="riff-grid-lead">{RIFF_GRID_LEAD}</p>
      <div className="riff-grid-scroll">
        <pre className="riff-grid mono">{gridRows(riff).join('\n')}</pre>
      </div>
      <ul className="riff-slots">
        {slotRows(riff).map((row) => (
          <li key={row.slot} className="riff-slot">
            <span className="mono riff-slot-name">{row.slot}</span>
            {/* The export's own join, for `Sep`'s reasons: punctuation rather than spacing. */}
            <Sep />
            <span className="mono riff-slot-steps">{stepList(row.steps)}</span>
          </li>
        ))}
      </ul>
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
