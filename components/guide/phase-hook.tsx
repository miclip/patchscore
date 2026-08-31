import type {
  Device,
  HookChoice,
  NoteDurationNotice,
  ResolveResult,
  ResolvedAssignment,
  ResolvedHook,
  ResolvedNote,
} from '@/lib/core'
import { Fragment } from 'react'
import {
  STEPS_PER_BAR,
  chordVoicings,
  enharmonicAlternative,
  noteDurationNotice,
  noteOffSteps,
  printsNoteDuration,
} from '@/lib/core'
import {
  barOf,
  chordsOf,
  count,
  degreeName,
  durationText,
  durationsText,
  gridFits,
  isStacked,
  lowToHigh,
  num,
  stackPosition,
  voicesLabel,
} from './format'
import { EvidenceMark, SoundRef, evidenceLines } from './instruction'

/**
 * §2.6/#142. **How the box in front of the reader ends a note**, above the notes it governs.
 *
 * Hand-written to match `noteDurationText` in `lib/core/render.ts` word for word — the same
 * arrangement `scopeHeading` and `realisationInstruction` sit under. `noteDurationNotice` decides
 * which of the five states the box is in; the words are each renderer's own, and
 * `test/guide-view.test.ts` asserts both copies because two copies of a sentence is exactly the
 * thing that drifts.
 */
function noteDurationText(notice: NoteDurationNotice): string {
  switch (notice.state) {
    case 'per-note-value':
      return (
        `Note length is set per note here — ${notice.control}` +
        `${notice.unit === undefined ? '' : `, in ${notice.unit}`}.`
      )
    case 'tied-steps':
      return (
        'A step is one note long and nothing here sets a length: ' +
        `${notice.control} joins a note to the next step, and stacking those is how ` +
        'anything longer is entered.'
      )
    case 'until-next':
      return (
        'No note-length field on this box — a note runs until the next note on the same voice, ' +
        `and ${notice.noteOff} is how you stop one sooner. The rows below are what you enter, ` +
        'in the order you enter them.'
      )
    case 'gate':
      return `Length here is a gate rather than a value in the pattern: ${notice.source}.`
    case 'trigger':
      return `A step is a trigger, not a note with a length: ${notice.reason}.`
    case 'unknown':
      return (
        'How this box sets a note\u2019s length is not established here, so the durations below ' +
        'are the part rather than a field to fill in.'
      )
  }
}

function NoteDurationBlock({ notice }: { notice: NoteDurationNotice }) {
  return (
    <div className="callout">
      <p>
        {noteDurationText(notice)}{' '}
        {notice.evidence === undefined ? null : <EvidenceMark evidence={notice.evidence} />}
      </p>
      {/*
        Visible, not only in the mark's title: a reader on a phone at the rack has no hover, and a
        printed guide has no attributes at all. `claim`, not `value` — how a box ends a note is a
        fact about the box and nobody dials it.
      */}
      {notice.evidence === undefined
        ? null
        : evidenceLines(notice.evidence, 'claim').map((cite) => (
            <p className="subordinate cite" key={cite}>
              {cite}
            </p>
          ))}
    </div>
  )
}

/**
 * #142. A note-off row, entered exactly the way a note row is — see `noteOffRows` in the Markdown
 * renderer for why they are interleaved rather than listed apart.
 */
function NoteOffRow({ step, framed, label }: { step: number; framed: boolean; label: string }) {
  return (
    <li>
      {framed ? (
        <>
          <span className="pos">
            <span className="quiet">bar </span>
            <span className="mono">{num(barOf(step))}</span>
          </span>
          <span className="token-sep"> · </span>
        </>
      ) : null}
      <span className="pos">
        <span className="quiet">step </span>
        <span className="mono">{num(step)}</span>
      </span>
      <span className="token-sep"> · </span>
      <span className="mono note-off">{label}</span>
    </li>
  )
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
 * #142. Note rows and note-off rows in one list, in the order they are typed in — the React half
 * of `merged` in `lib/core/render.ts`, and stable for the same reason: two rows on one step must
 * always come out the same way round.
 */
function mergedRows(
  rows: readonly { step: number; node: React.ReactNode }[],
  offs: readonly { step: number; node: React.ReactNode }[],
): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let i = 0
  for (const off of offs) {
    while (i < rows.length && (rows[i] as { step: number }).step <= off.step) {
      out.push((rows[i] as { node: React.ReactNode }).node)
      i++
    }
    out.push(off.node)
  }
  for (; i < rows.length; i++) out.push((rows[i] as { node: React.ReactNode }).node)
  return out
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
function SampledHook({
  hook,
  framed,
  notice,
}: {
  hook: ResolvedHook
  framed: boolean
  notice: NoteDurationNotice
}) {
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
        {mergedRows(
          triggers.map(({ voicing, occurrence }) => ({
            step: occurrence.step,
            node: (
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
                {printsNoteDuration(notice) ? (
                  <>
                    <span className="token-sep"> · </span>
                    <span className="pos">
                      {/*
                        §8/#142. "held for" once a note spans a bar, in this renderer's own words
                        (#33). A reader took `sounds for 64 steps (4 bars)` in a list of steps as
                        sixty-four steps to enter; the verb is what separates a duration from a
                        count of hits.
                      */}
                      <span className="quiet">
                        {Math.min(...occurrence.notes.map((n) => n.len)) >= STEPS_PER_BAR
                          ? 'held for '
                          : 'sounds for '}
                      </span>
                      <span className="mono">{durationsText(occurrence.notes)}</span>
                    </span>
                  </>
                ) : null}
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
            ),
          })),
          // #142. A sample on an `until-next` box is stopped by the same gesture a note is, so
          // the note-offs belong in this list too.
          notice.state !== 'until-next'
            ? []
            : noteOffSteps(hook.notes, hook.bars * STEPS_PER_BAR).map((step) => ({
                step,
                node: (
                  <NoteOffRow key={`off-${step}`} step={step} framed={framed} label={notice.noteOff} />
                ),
              })),
        )}
      </ul>
    </>
  )
}

/**
 * §12.4/#40. The hook, for a part stacked across several monophonic voices, one note each.
 *
 * **Oriented by voice rather than by chord**, which is the whole design. A per-chord table is the
 * same data and unusable at the machine: on a tracker you fill one track top to bottom and then
 * move to the next, so a reader following a per-chord list would enter one note, jump two
 * columns, enter one note, jump back. One block per voice is the order the notes get typed in.
 *
 * The assignment rule is stated once and then relied on — lowest note to the lowest voice —
 * because it is musical rather than tidy: hold it and the voicing keeps its shape as the
 * progression moves; cross the voices and the chord changes character between bars.
 *
 * Hand-written to match `stackedHookLines` in `lib/core/render.ts` word for word. The two
 * renderers share no code path (§8), so the only thing keeping them in step is that.
 */
function StackedHook({
  hook,
  framed,
  carriedBy,
  notice,
}: {
  hook: ResolvedHook
  framed: boolean
  carriedBy: ResolvedAssignment
  notice: NoteDurationNotice
}) {
  const voices = carriedBy.assignables
  const width = voices.length
  const chords = chordsOf(hook).map((chord) => ({ step: chord.step, notes: lowToHigh(chord.notes) }))
  const surplus = chords.filter((chord) => chord.notes.length > width)

  return (
    <>
      <p className="callout">
        Stacked chord — {count(width, 'voice')}, one note each. There is no chord to play on any
        one of them.
      </p>
      <p className="quiet">
        Lowest note to the lowest voice:{' '}
        <strong>{(voices[0] as { label: string }).label}</strong> takes the bottom of every chord
        and <strong>{(voices[width - 1] as { label: string }).label}</strong> the top. Hold that
        order and the voicing keeps its shape as the progression moves; cross the voices over and
        the chord changes character between bars with nothing here saying so.
      </p>
      {/*
        Invariant 5. A chord with more notes than the part has voices is a template and a request
        disagreeing, and the honest thing is to say which notes have nowhere to go rather than to
        drop them off the end of a list.
      */}
      {surplus.length === 0 ? null : (
        <p className="callout">
          {count(surplus.length, 'chord')} in this hook {surplus.length === 1 ? 'has' : 'have'}{' '}
          more notes than this part has voices, so its top {count(1, 'note')} and above are not
          placed below. The part asks for {count(carriedBy.notes, 'note')}; the hook writes{' '}
          {num(Math.max(...surplus.map((c) => c.notes.length)))}.
        </p>
      )}
      {voices.map((voice, i) => {
        const mine = chords
          .map((chord) => ({ step: chord.step, note: chord.notes[i] }))
          .filter((entry): entry is { step: number; note: ResolvedNote } => entry.note !== undefined)
        return (
          <Fragment key={voice.voiceId}>
            <h5>
              {voice.label} — {stackPosition(i, width)}
            </h5>
            {mine.length === 0 ? (
              // A voice with nothing to play is said, not omitted: a missing block reads as a bug.
              <p className="quiet">Nothing — every chord in this hook has fewer notes than that.</p>
            ) : (
              <ul className="notes">
                {mergedRows(
                  mine.map(({ step, note }) => ({
                    step,
                    node: (
                      <li key={step}>
                        {framed ? (
                          <>
                            <span className="pos">
                              <span className="quiet">bar </span>
                              <span className="mono">{num(barOf(step))}</span>
                            </span>
                            <span className="token-sep"> · </span>
                          </>
                        ) : null}
                        <span className="pos">
                          <span className="quiet">step </span>
                          <span className="mono">{num(step)}</span>
                        </span>
                        {printsNoteDuration(notice) ? (
                          <>
                            <span className="token-sep"> · </span>
                            <span className="pos">
                              <span className="quiet">
                                {note.len >= STEPS_PER_BAR ? 'held for ' : 'sounds for '}
                              </span>
                              <span className="mono">{durationText(note.len)}</span>
                            </span>
                          </>
                        ) : null}
                        <span className="token-sep"> · </span>
                        <ChordNotes notes={[note]} />
                        <span className="token-sep"> · </span>
                        <span className="degrees">
                          <span className="degree">{degreeName(note.degree)}</span>
                        </span>
                        <span className="token-sep"> · </span>
                        <span className="pos">
                          <span className="quiet">MIDI </span>
                          <span className="mono">{num(note.midi)}</span>
                        </span>
                      </li>
                    ),
                  })),
                  // #142. Per voice, from this voice's own notes: on a stack it is the next note
                  // *on this track* that ends this one.
                  notice.state !== 'until-next'
                    ? []
                    : noteOffSteps(
                        mine.map(({ note }) => note),
                        hook.bars * STEPS_PER_BAR,
                      ).map((step) => ({
                        step,
                        node: (
                          <NoteOffRow
                            key={`off-${step}`}
                            step={step}
                            framed={framed}
                            label={notice.noteOff}
                          />
                        ),
                      })),
                )}
              </ul>
            )}
          </Fragment>
        )
      })}
    </>
  )
}

function HookBlock({
  choice,
  carriedBy,
  device,
}: {
  choice: HookChoice
  carriedBy: ResolvedAssignment | undefined
  device: Device | undefined
}) {
  // A hook authored against a different grid gets no bar framing rather than a wrong one.
  const framed = choice.chosen.outcome === 'resolved' && gridFits(choice.chosen.hook)
  // #142. The device fact every rendering below reads — the sampled one, the stacked one and the
  // plain list. Answering "how does this box end a note" three times is how the first two came to
  // disagree with each other about a box.
  const notice = noteDurationNotice(device)

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
              {carriedBy.deviceName} · {voicesLabel(carriedBy)}
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
            Not for a part nothing carries: every sentence `noteDurationText` has says *this
            box*, and there is no box — the line above has already said so. The durations still
            print, because they are the part rather than a claim about hardware.
          */}
          {carriedBy === undefined ? null : <NoteDurationBlock notice={notice} />}
          {/*
            §12.4: a part carried by a `sampled-chord` recipe is not played note by note, and the
            ordinary rendering below would tell its reader to enter three notes on a voice that
            sounds one — and imply the progression follows, which it does not.
          */}
          {carriedBy?.recipe.realisation === 'sampled-chord' ? (
            <SampledHook hook={choice.chosen.hook} framed={framed} notice={notice} />
          ) : /*
              §12.4/#40. The other way of not playing a chord on one voice: several voices, one
              note each. The list below would tell the reader to enter three notes on a voice that
              sounds one, and say nothing about which voice gets which — the half they cannot work
              out for themselves.
            */
          carriedBy !== undefined && isStacked(carriedBy) ? (
            <StackedHook
              hook={choice.chosen.hook}
              framed={framed}
              carriedBy={carriedBy}
              notice={notice}
            />
          ) : (
          <>
          {/*
            One row per chord, not per note. Labels stay inline rather than moving to a header
            row: measured at 390px, a six-column layout needs about 490px and would have to
            scroll sideways, and a hook that scrolls is worse than a hook that wraps.
          */}
          <ul className="notes">
            {mergedRows(
              chordsOf(choice.chosen.hook).map((chord) => ({
              step: chord.step,
              node: (
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
                  printsNoteDuration(notice) ? (
                    <span className="pos" key="duration">
                      <span className="quiet">
                        {Math.min(...chord.notes.map((n) => n.len)) >= STEPS_PER_BAR
                          ? 'held for '
                          : 'sounds for '}
                      </span>
                      <span className="mono">{durationsText(chord.notes)}</span>
                    </span>
                  ) : null,
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
              ),
              })),
              notice.state !== 'until-next'
                ? []
                : noteOffSteps(
                    choice.chosen.hook.notes,
                    choice.chosen.hook.bars * STEPS_PER_BAR,
                  ).map((step) => ({
                    step,
                    node: (
                      <NoteOffRow
                        key={`off-${step}`}
                        step={step}
                        framed={framed}
                        label={notice.noteOff}
                      />
                    ),
                  })),
            )}
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
  const deviceById = new Map(result.devices.map((d) => [d.id, d]))
  return (
    <>
      <NoteConvention />
      {result.song.hooks.map((choice) => {
        const carriedBy = byRole.get(choice.forRole)
        return (
          <HookBlock
            key={choice.forRole}
            choice={choice}
            carriedBy={carriedBy}
            device={carriedBy === undefined ? undefined : deviceById.get(carriedBy.deviceId)}
          />
        )
      })}
    </>
  )
}
