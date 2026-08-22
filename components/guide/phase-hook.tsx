import type { HookChoice, ResolveResult, ResolvedAssignment } from '@/lib/core'
import { enharmonicAlternative } from '@/lib/core'
import { num } from './format'

/**
 * #32, stated once near the notes rather than repeated per note: three representations of one
 * pitch need explaining exactly once, and a guide that explains it eleven times is a guide
 * nobody finishes reading.
 */
function NoteConvention() {
  return (
    <p className="quiet convention">
      Each note is one line: <strong>step, length, degree, note, MIDI</strong>. The note is spelled
      for the key, so F minor gets <span className="mono">Eb</span>; a name in brackets is the same
      pitch as a sharps-only box shows it, and appears only where it differs. Octaves are
      scientific pitch notation — middle C is C4 — which not every maker agrees with. The MIDI
      number is the one form nothing disagrees about: check that if the screen says something else.
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
  return (
    <section className="hook">
      <h4>
        <span className="role mono">{choice.forRole}</span>
        <span className="mono quiet">{choice.chosenId}</span>
        {choice.candidates.length > 1 ? (
          <span className="quiet">
            {num(choice.candidates.length)} authored for this role; the seed picked this one
          </span>
        ) : null}
      </h4>

      <p className="quiet">
        {carriedBy === undefined
          ? 'No part in this rig carries this role — the hook is here as musical intent only.'
          : `${carriedBy.deviceName} · ${carriedBy.assignable.label}`}
      </p>

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
          <ul className="notes">
            {choice.chosen.hook.notes.map((note, i) => {
              const enharmonic = enharmonicAlternative(note)
              return (
                <li key={`${note.step}-${note.midi}-${i}`}>
                  <span className="quiet">step</span>
                  <span className="mono">{num(note.step)}</span>
                  <span className="quiet">len</span>
                  <span className="mono">{num(note.len)}</span>
                  <span className="quiet">degree</span>
                  <span className="mono">{num(note.degree)}</span>
                  <span className="mono note-name">{note.note}</span>
                  {enharmonic === undefined ? null : (
                    <span className="mono quiet">({enharmonic})</span>
                  )}
                  <span className="quiet">MIDI</span>
                  <span className="mono">{num(note.midi)}</span>
                </li>
              )
            })}
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
        This template authors no hooks. Nothing is written here, and nothing was invented.
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
