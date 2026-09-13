'use client'

import type { ReactNode } from 'react'
import { useId, useState } from 'react'
import type { HookResolution, Riff, RiffResolution } from '@/lib/core'
import { chordNotesText, num, resolveHook, transposableKeys } from '@/lib/core'
import { KeySelect } from '@/components/harmony/key-select'
import {
  RIFF_CHORDS_SUPPLIED,
  chordRows,
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
 * §5A/#570. **The figure, read in a key the reader chooses.**
 *
 * `Riff.key` is one key by design (§5A): a direction offers several because a song is transposed
 * whole and the seed picks, and a riff is one figure with no seed to pick with. This does not
 * change that. The authored key is where the page opens and what the Markdown is in; the control
 * re-spells what is already on the page, and the key it holds is **view state and nothing else**
 * (§5A.6) — written to no store, no URL and no studio. `riff-storage.test.ts` walks this file
 * with the rest of the route to keep it so.
 *
 * Everything the key moves is a pure function of it: `resolveHook(riff.hook, key)` is the notes
 * and `chordRows(riff, key)` is the table, both the same calls the prerender made at `riff.key`.
 * Nothing else is re-resolved. The recipe is a sound and not a pitch; the grid is authored; the
 * rules are written as degrees so they hold in any key; and the rig is `RiffRig`'s, which does
 * not read this. Those arrive as `rules` and `grid`, rendered on the server and passed through.
 *
 * The control sits above both panels it governs, and above *The notes* alone on the riffs that
 * have no chords, which is most of them.
 */
export function RiffInKey({
  riff,
  resolution,
  rules,
  grid,
}: {
  riff: Riff
  resolution: RiffResolution
  rules: ReactNode
  grid: ReactNode
}) {
  const [key, setKey] = useState(riff.key)
  const id = useId()
  return (
    <RiffFigureView
      riff={riff}
      resolution={resolution}
      shownKey={key}
      id={id}
      onChange={setKey}
      rules={rules}
      grid={grid}
    />
  )
}

/**
 * The hook-free half, for one shown key — the seam `ProgressionView` has, for the same reason:
 * called as a function in a test, its select's handler invoked, and rendered again at the key it
 * asked for.
 *
 * At the authored key the notes are the prerender's own `resolution.notes`, untouched, so what
 * the server sent and what the first client render shows are the same object and the same ink.
 */
export function RiffFigureView({
  riff,
  resolution,
  shownKey,
  id,
  onChange,
  rules,
  grid,
}: {
  riff: Riff
  resolution: RiffResolution
  shownKey: string
  id: string
  onChange: (key: string) => void
  rules: ReactNode
  grid: ReactNode
}) {
  const notes: HookResolution =
    shownKey === riff.key ? resolution.notes : resolveHook(riff.hook, shownKey)
  return (
    <div className="columns">
      <div className="span-2 riff-key">
        <KeySelect
          id={id}
          keys={transposableKeys(riff.key)}
          selected={shownKey}
          onChange={onChange}
        />
      </div>

      <Chords riff={riff} shownKey={shownKey} />

      {rules}

      <section className="panel riff-panel">
        <header>
          <h2>The notes</h2>
        </header>
        <Notes resolution={{ ...resolution, notes }} />
      </section>

      {grid}
    </div>
  )
}

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
 * **Its own table since #552, where it used to borrow `ProgressionTable`.** A direction's chord
 * table is degree, notes and bars, because a direction's harmony is the whole song; a riff's
 * needs a fourth column saying which chords the figure is actually over, and a shared component
 * that grew a riff-only column would be one page's requirement living in the other's code. The
 * notes column (#570) is shared underneath all the same — `chordRows` is `progressionRows` with
 * the figure's position added — so the two tables cannot spell one degree two ways.
 * `.table-scroll` comes with it by hand, because §8's phone rule is the reason it was worth
 * borrowing in the first place.
 *
 * Absent on a riff with no `harmony`, which is most of them — and absent rather than empty, so a
 * page for a one-key figure does not carry a heading over nothing.
 */
function Chords({ riff, shownKey }: { riff: Riff; shownKey: string }) {
  const summary = riffChordSummary(riff, shownKey)
  if (riff.harmony === undefined || summary === undefined) return null
  return (
    <section className="panel riff-panel">
      <header>
        <h2>The chords</h2>
      </header>
      <p className="riff-grid-lead">{summary}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Degree</th>
              <th scope="col">Notes</th>
              <th scope="col" className="numeric">
                Bars
              </th>
              <th scope="col">Under the figure</th>
            </tr>
          </thead>
          <tbody>
            {chordRows(riff, shownKey).map((row) => (
              <tr key={`${row.degree}-${String(row.from)}`}>
                <td className="mono">{row.degree}</td>
                <td className="mono">{chordNotesText(row.notes)}</td>
                <td className="mono numeric">
                  {num(row.from)}–{num(row.from + row.bars - 1)}
                </td>
                <td className="mono">{row.underFigure ? '●' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="riff-grid-lead">{RIFF_CHORDS_SUPPLIED}</p>
    </section>
  )
}
