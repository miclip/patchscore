'use client'

import { useId } from 'react'
import { INSPIRATION_CAP, groupDiagnostics } from '@/lib/core'
import type { Inspiration, InspirationApplication, InspirationId } from '@/lib/core'

/**
 * §5's influences. Multi-select, capped at two, and **never filtered by the chosen direction**.
 *
 * That last one is the whole point of how §5 is built. An inspiration is keyed on `(role, band)`
 * and names no template, so "which inspirations apply to this genre" is not a question the data
 * can answer — and a picker that guessed at it would be inventing a coupling the design spent its
 * effort removing. Every influence is offered against every direction; what a particular pairing
 * cannot do, it says afterwards (`no-such-target`), which is information the user can act on
 * rather than an option quietly missing from a list.
 *
 * The panel disappears entirely when the registry is empty, rather than standing there empty:
 * a control for a thing this build does not have is a promise it cannot keep.
 */
export type InspirationPickerProps = {
  /** The registry, injected so the empty-library case is a case and not a hypothetical. */
  inspirations: readonly Inspiration[]
  selected: readonly InspirationId[]
  onToggle: (id: InspirationId, on: boolean) => void
  /** What composing the current selection said. `undefined` when no direction is chosen. */
  application: InspirationApplication | undefined
}

/**
 * What one influence claims, in the vocabulary it claims it in. Derived from the patch rather
 * than authored twice: a summary that can disagree with the patch is a summary that eventually
 * will, and this is also the line that tells a user *why* two of them refuse to combine.
 */
function summarise(inspiration: Inspiration): string {
  const patch = inspiration.patch
  const parts: string[] = []
  const roles = (patterns: readonly { forRole: string }[] | undefined) => [
    ...new Set((patterns ?? []).map((p) => p.forRole)),
  ]

  const replaced = roles(patch.replacePatterns)
  if (replaced.length > 0) parts.push(`replaces ${replaced.join(', ')}`)

  const added = [...new Set((patch.addRoles ?? []).map((r) => r.role))]
  if (added.length > 0) parts.push(`adds ${added.join(', ')}`)

  if (patch.bpm !== undefined && patch.bpm.shift !== 0) {
    const shift = patch.bpm.shift
    parts.push(`${shift > 0 ? '+' : '−'}${String(Math.abs(shift))} BPM`)
  }
  return parts.join(' · ')
}

export function InspirationPicker({
  inspirations,
  selected,
  onToggle,
  application,
}: InspirationPickerProps) {
  // Before the early return: a hook may not be called conditionally.
  const ids = useId()

  // Nothing to offer, so nothing to draw — not even a heading.
  if (inspirations.length === 0) return null

  const chosen = new Set(selected)
  const atCap = chosen.size >= INSPIRATION_CAP
  const refused = application?.outcome === 'refused' ? application : undefined
  const applied = application?.outcome === 'applied' ? application : undefined
  /**
   * §5.4's findings, read rather than enumerated. `no-such-target` is recorded per band — four
   * near-identical lines for one missing role — which reads as a fault in the app and buries the
   * findings that are genuinely distinct. Grouped in `lib/core` beside the facts, so a second
   * renderer cannot disagree about what they add up to.
   */
  const grouped = applied === undefined ? [] : groupDiagnostics(applied.diagnostics)

  return (
    <section className="panel">
      <header>
        <h2>Inspirations</h2>
        <p className="note">
          {chosen.size} of {INSPIRATION_CAP} selected{atCap ? ' — at the cap' : ''}
        </p>
      </header>

      {/*
        The same row shape as the other two pickers (#112) — a container, a `<label>` holding the
        control and its name, and the summary as a description rather than as part of the
        control's accessible name.

        **No details link here, and the column it would sit in stays empty.** An influence has no
        page of its own: §5.1 keys them on `(role, band)` and they name no template, so there is
        nothing to author a page *about* that the direction pages do not already say better. The
        row shares the shape so that one stylesheet describes all three, not because a link is
        pending.
      */}
      <fieldset className="picker-list">
        {inspirations.map((inspiration) => {
          const on = chosen.has(inspiration.id)
          const subId = `${ids}-${inspiration.id}-sub`
          return (
            <div className={`pick${!on && atCap ? ' pick-off' : ''}`} key={inspiration.id}>
              <label className="pick-choose">
                <input
                  type="checkbox"
                  className="pick-jack"
                  data-chain={on ? 'inspiration' : undefined}
                  data-chain-key={inspiration.id}
                  checked={on}
                  aria-describedby={subId}
                  // At the cap the unchosen are disabled rather than silently ignored, so the
                  // control says what it will do before it is clicked. Unticking is never
                  // disabled: a user at the cap must always be able to get out of it.
                  disabled={!on && atCap}
                  onChange={(event) => onToggle(inspiration.id, event.target.checked)}
                />
                <span className="name">{inspiration.name}</span>
              </label>
              <span className="sub mono" id={subId}>
                {summarise(inspiration)}
              </span>
            </div>
          )
        })}
      </fieldset>

      {/*
        §5.3. A refusal is stated, and no guide is shown behind it — picking a winner between two
        influences that both claim the kick would make the alphabet the musician.
      */}
      {refused === undefined ? null : (
        <p className="inspiration-refused" role="status">
          {refused.detail}
        </p>
      )}

      {applied === undefined || applied.notes.length === 0 ? null : (
        <ul className="inspiration-notes">
          {applied.notes.map((note, i) => (
            <li key={`${note.inspirationId}-${String(i)}`}>
              {/* An explicit separator, not just the span's margin. Without one the two run
                  together the moment the text leaves the page — copied, read aloud, or pasted
                  into a bug report, which is how it was noticed: "DancehallThe kick states…". */}
              <span className="who">{note.name}</span>
              <span className="who-sep"> — </span>
              {note.text}
            </li>
          ))}
        </ul>
      )}

      {/*
        §5.4. What the influence asked for that this direction could not give it. A toggle that
        visibly does nothing is the failure §6.3 warns about; this is where that is prevented.
      */}
      {applied === undefined || grouped.length === 0 ? null : (
        <>
          <p className="note">Not applied here</p>
          <ul className="inspiration-diagnostics">
            {grouped.map((diagnostic) => (
              <li key={diagnostic.key}>{diagnostic.detail}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
