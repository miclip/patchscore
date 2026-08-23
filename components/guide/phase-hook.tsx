import type { HookChoice, ResolveResult, ResolvedAssignment } from '@/lib/core'
import { Fragment } from 'react'
import { enharmonicAlternative } from '@/lib/core'
import { barOf, chordsOf, degreeName, gridFits, lenText, num } from './format'
import { SoundRef } from './instruction'

/**
 * #32, stated once near the notes rather than repeated per note: three representations of one
 * pitch need explaining exactly once, and a guide that explains it eleven times is a guide
 * nobody finishes reading.
 */
function NoteConvention() {
  return (
    <p className="quiet convention">
      Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.
      Notes sharing a step are one chord and share a line. Names are spelled for the key, so F
      minor gets <span className="mono">Eb</span>; a name in brackets is the same pitch as a
      sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,
      which not every maker agrees with — the MIDI number is the form nothing disagrees about.
      Where a role has more than one hook authored, rerolling the seed picks a different one.
    </p>
  )
}

function HookBlock({
  choice,
  carriedBy,
}: {
  choice: HookChoice
  carriedBy: ResolvedAssignment | undefined
}) {
  // A hook authored against a different grid gets no bar framing rather than a wrong one.
  const framed = choice.chosen.outcome === 'resolved' && gridFits(choice.chosen.hook)

  return (
    <section className="hook">
      {/*
        The heading says what the part is and where it lives. Not the hook's id — a
        template-internal identifier that means nothing to somebody standing at a box — and not
        which of several the seed picked, which is our machinery rather than their information.
        The reroll fact worth having is stated once, up in the intro.
      */}
      <h4>
        <span className="role mono">{choice.forRole}</span>
        {carriedBy === undefined ? null : (
          <>
            <span className="token-sep">—</span>
            <span className="quiet">
              {carriedBy.deviceName} · {carriedBy.assignable.label}
            </span>
          </>
        )}
      </h4>

      {carriedBy === undefined ? (
        <p className="quiet">Nothing in your rig plays this part.</p>
      ) : (
        <SoundRef title={carriedBy.recipe.title} />
      )}

      {choice.chosen.outcome === 'unresolved' ? (
        // Reported, never guessed at (§4.1).
        <p className="callout">
          Not resolved: {choice.chosen.reason} — {choice.chosen.detail}
        </p>
      ) : (
        <>
          <p className="quiet">
            <span className="mono">{num(choice.chosen.hook.bars)}</span> bars in{' '}
            <span className="mono">{choice.chosen.hook.key}</span>.
          </p>
          {/*
            One row per chord, not per note. Labels stay inline rather than moving to a header
            row: measured at 390px, a six-column layout needs about 490px and would have to
            scroll sideways, and a hook that scrolls is worse than a hook that wraps.
          */}
          <ul className="notes">
            {chordsOf(choice.chosen.hook).map((chord) => (
              <li key={chord.step}>
                {/*
                  Cells joined by a real separator, the same ` · ` the Markdown uses. The row
                  then reads identically on screen, to a screen reader, and pasted into a notes
                  app — which is where a guide ends up on the way to the studio.
                */}
                {[
                  framed ? (
                    <span className="pos" key="bar">
                      <span className="quiet">bar </span>
                      <span className="mono">{num(barOf(chord.step))}</span>
                    </span>
                  ) : null,
                  <span className="pos" key="step">
                    <span className="quiet">step </span>
                    <span className="mono">{num(chord.step)}</span>
                  </span>,
                  <span className="pos" key="len">
                    <span className="quiet">len </span>
                    <span className="mono">{lenText(chord.notes)}</span>
                  </span>,
                  <span className="chord" key="chord">
                    {chord.notes.map((note, i) => {
                      const enharmonic = enharmonicAlternative(note)
                      return (
                        <Fragment key={note.midi}>
                          {i === 0 ? null : ' '}
                          <span className="mono note-name">{note.note}</span>
                          {enharmonic === undefined ? null : (
                            <span className="mono quiet"> ({enharmonic})</span>
                          )}
                        </Fragment>
                      )
                    })}
                  </span>,
                  <span className="degrees" key="degrees">
                    {chord.notes.map((note, i) => (
                      <Fragment key={note.midi}>
                        {i === 0 ? null : ' '}
                        <span className="degree">{degreeName(note.degree)}</span>
                      </Fragment>
                    ))}
                  </span>,
                  <span className="pos" key="midi">
                    <span className="quiet">MIDI </span>
                    <span className="mono">{chord.notes.map((n) => num(n.midi)).join(' ')}</span>
                  </span>,
                ]
                  .filter((cell) => cell !== null)
                  .map((cell, i) => (
                    <Fragment key={i}>
                      {i === 0 ? null : <span className="token-sep"> · </span>}
                      {cell}
                    </Fragment>
                  ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** §8 phase 4. Written before sound design, because that is the order a session happens in. */
export function PhaseHook({ result }: { result: ResolveResult }) {
  if (result.song.hooks.length === 0) {
    // §4.1 / invariant 5: omit rather than invent — and say that is what happened.
    return (
      <p className="quiet">
        This template has no hooks.
      </p>
    )
  }

  const byRole = new Map(result.assignments.map((a) => [a.role, a]))
  return (
    <>
      <NoteConvention />
      {result.song.hooks.map((choice) => (
        <HookBlock key={choice.forRole} choice={choice} carriedBy={byRole.get(choice.forRole)} />
      ))}
    </>
  )
}
