import type {
  HookChoice,
  ResolveResult,
  ResolvedAssignment,
  ResolvedHook,
  ResolvedMember,
  ResolvedNote,
} from '@/lib/core'
import { Fragment } from 'react'
import { chordVoicings, enharmonicAlternative } from '@/lib/core'
import { barOf, chordsOf, count, degreeName, gridFits, lenText, num } from './format'
import { SoundRef } from './instruction'
import { memberWhere, partWhere } from './phase-voices'

/**
 * §12.4 stacking, §8 phase 4. Which voice of a stack plays which note of one chord.
 *
 * **Lowest note to the first voice, then upwards**, each voice taking as many notes as it can
 * sound. Deterministic and stable: `members` is fixed by the resolver and the notes are sorted
 * by pitch, so the same box plays the same line of the chord in every chord of the progression
 * and in every re-render. A reader who has patched their Crave for the bottom note does not
 * find it moved four bars later.
 *
 * Notes past what the voices can sound are reported, never dropped (invariant 5). Written out
 * by hand to match the Markdown renderer, which is the rule for everything in this tree.
 */
function shareChord(
  members: readonly ResolvedMember[],
  notes: readonly ResolvedNote[],
): { shares: { member: ResolvedMember; notes: ResolvedNote[] }[]; unplaced: ResolvedNote[] } {
  const ascending = [...notes].sort((a, b) => a.midi - b.midi)
  const shares: { member: ResolvedMember; notes: ResolvedNote[] }[] = []
  let next = 0
  for (const member of members) {
    const take = ascending.slice(next, next + member.notes)
    next += take.length
    shares.push({ member, notes: take })
  }
  return { shares, unplaced: ascending.slice(next) }
}

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

/**
 * How far to move the sample for one trigger. Printed on every row, `as recorded` included, so
 * the column is always there to scan — a reader checking whether a chord moves should not have
 * to notice an *absent* value.
 */
function transposeText(semitones: number): string {
  if (semitones === 0) return 'as recorded'
  return `${semitones > 0 ? '+' : '-'}${num(Math.abs(semitones))} st`
}

/** The pitches of one chord, spelled with the enharmonic in brackets only where it differs. */
function ChordNotes({ notes }: { notes: readonly ResolvedNote[] }) {
  return (
    <span className="chord">
      {notes.map((note, i) => {
        const enharmonic = enharmonicAlternative(note)
        return (
          <Fragment key={note.midi}>
            {i === 0 ? null : ' '}
            <span className="mono note-name">{note.note}</span>
            {enharmonic === undefined ? null : <span className="mono quiet"> ({enharmonic})</span>}
          </Fragment>
        )
      })}
    </span>
  )
}

/**
 * §12.4. The hook, for a part whose recipe puts the chord inside a sample.
 *
 * Two lists rather than one, because there are two different things to do and they happen at
 * different times: the chords are *content to obtain* before you start, and the steps are
 * *triggers* to place once you have them. Rendering them as one list of notes — which is what
 * this replaces — asked the reader to play a chord on a voice that sounds one note.
 *
 * A sample transposes as a block, and that is a real capability rather than a limitation: one
 * recording covers its shape at every root, so a trigger carries the interval to move it by. A
 * second sample is needed only where the *shape* changes — a different quality, or a different
 * inversion — which no transposition can produce.
 *
 * The sentences are written out here by hand to match the Markdown renderer word for word; the
 * grouping behind them is `chordVoicings`, computed once in `lib/core` so the page and the
 * screen cannot disagree about which chords are the same chord.
 */
function SampledHook({ hook, framed }: { hook: ResolvedHook; framed: boolean }) {
  const voicings = chordVoicings(hook)
  const triggers = voicings
    .flatMap((voicing) => voicing.at.map((occurrence) => ({ voicing, occurrence })))
    // Step order, not voicing order: this list is entered left to right at the machine, and a
    // reader following it should never have to jump backwards.
    .sort((a, b) => a.occurrence.step - b.occurrence.step)

  return (
    <>
      <p className="callout">
        Sampled chord — you trigger a sample, you do not play these notes.{' '}
        {voicings.length === 1
          ? 'One chord shape throughout, so one sample, transposed where the chord moves.'
          : `${count(voicings.length, 'chord shape')}, so ${count(voicings.length, 'sample')}. ` +
            'A sample transposes as a block, keeping its shape, so one recording covers that ' +
            'shape at every root. A separate sample is needed only where the shape changes — ' +
            'a different quality, or a different inversion.'}
      </p>

      <h5>Samples to obtain or render — {count(voicings.length, 'chord shape')}</h5>
      <ul className="notes">
        {voicings.map((voicing) => (
          <li key={voicing.label}>
            <span className="pos">
              <span className="quiet">sample </span>
              <span className="mono">{voicing.label}</span>
            </span>
            <span className="token-sep"> · </span>
            <ChordNotes notes={voicing.notes} />
            <span className="token-sep"> · </span>
            <span className="degrees">
              {voicing.notes.map((note, i) => (
                <Fragment key={note.midi}>
                  {i === 0 ? null : ' '}
                  <span className="degree">{degreeName(note.degree)}</span>
                </Fragment>
              ))}
            </span>
            <span className="token-sep"> · </span>
            <span className="pos">
              <span className="quiet">MIDI </span>
              <span className="mono">{voicing.notes.map((n) => num(n.midi)).join(' ')}</span>
            </span>
            <span className="token-sep"> · </span>
            <span className="pos">
              <span className="quiet">shape </span>
              <span className="mono">{voicing.shape.map(num).join('-')}</span>
            </span>
          </li>
        ))}
      </ul>

      <h5>Trigger — one step event per chord, and the sample sounds all of it</h5>
      <ul className="notes">
        {triggers.map(({ voicing, occurrence }) => (
          <li key={occurrence.step}>
            {framed ? (
              <>
                <span className="pos">
                  <span className="quiet">bar </span>
                  <span className="mono">{num(barOf(occurrence.step))}</span>
                </span>
                <span className="token-sep"> · </span>
              </>
            ) : null}
            <span className="pos">
              <span className="quiet">step </span>
              <span className="mono">{num(occurrence.step)}</span>
            </span>
            <span className="token-sep"> · </span>
            <span className="pos">
              <span className="quiet">len </span>
              <span className="mono">{lenText(occurrence.notes)}</span>
            </span>
            <span className="token-sep"> · </span>
            <span className="pos">
              <span className="quiet">sample </span>
              <span className="mono">{voicing.label}</span>
            </span>
            <span className="token-sep"> · </span>
            <span className="pos">
              {occurrence.semitones === 0 ? (
                <span className="quiet">as recorded</span>
              ) : (
                <span className="mono">{transposeText(occurrence.semitones)}</span>
              )}
            </span>
            <span className="token-sep"> · </span>
            <ChordNotes notes={occurrence.notes} />
          </li>
        ))}
      </ul>
    </>
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
            <span className="quiet">{partWhere(carriedBy)}</span>
          </>
        )}
      </h4>

      {carriedBy === undefined ? (
        <p className="quiet">Nothing in your rig plays this part.</p>
      ) : (
        /* One title per voice: a stack's boxes run different recipes, and naming one of them
           would send the reader looking for a single entry Sound design does not have. */
        <SoundRef
          title={carriedBy.members.map((m) => m.recipe.title).join(' · ')}
          perBox={carriedBy.members.length > 1}
        />
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
            §12.4: a part carried by a `sampled-chord` recipe is not played note by note, and the
            ordinary rendering below would tell its reader to enter three notes on a voice that
            sounds one — and imply the progression follows, which it does not.
          */}
          {carriedBy?.recipe.realisation === 'sampled-chord' && carriedBy.members.length === 1 ? (
            <SampledHook hook={choice.chosen.hook} framed={framed} />
          ) : (
          <>
          {/* §12.4 stacking: the chord is real and is played note by note, but not on one
              voice, and a reader handed the list below without this sentence would enter the
              whole chord on the first box. */}
          {carriedBy !== undefined && carriedBy.members.length > 1 ? (
            <p className="quiet">
              {count(carriedBy.members.length, 'voice')} carry this part, one line of the chord
              each. Lowest note to the first voice and upwards from there, the same way in every
              chord — so a voice keeps its line for the whole progression.
            </p>
          ) : null}
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
                {carriedBy === undefined || carriedBy.members.length === 1 ? null : (
                  <ul className="stack-members">
                    {(() => {
                      const { shares, unplaced } = shareChord(carriedBy.members, chord.notes)
                      return (
                        <>
                          {shares.map((share) => (
                            <li key={share.member.assignable.deviceId + '/' + share.member.assignable.voiceId}>
                              <span className="where">{memberWhere(share.member)}</span>
                              <span className="token-sep">—</span>
                              {share.notes.length === 0 ? (
                                <span className="quiet">
                                  rest — this chord has fewer notes than there are voices
                                </span>
                              ) : (
                                <>
                                  <ChordNotes notes={share.notes} />
                                  <span className="token-sep"> · </span>
                                  <span className="pos">
                                    <span className="quiet">MIDI </span>
                                    <span className="mono">
                                      {share.notes.map((n) => num(n.midi)).join(' ')}
                                    </span>
                                  </span>
                                </>
                              )}
                            </li>
                          ))}
                          {/* Invariant 5: a note nothing can play is stated, never quietly lost. */}
                          {unplaced.length === 0 ? null : (
                            <li>
                              <strong>not placed</strong>
                              <span className="token-sep">—</span>
                              <ChordNotes notes={unplaced} />
                              <span className="quiet">
                                : this chord has {count(chord.notes.length, 'note')} and the part
                                was assigned {count(carriedBy.notes, 'note')} of voice
                              </span>
                            </li>
                          )}
                        </>
                      )
                    })()}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          </>
          )}
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
