import { Fragment } from 'react'
import type { BandGroup, FxSource, ResolveResult, Role } from '@/lib/core'
import { bandTrajectory, fxSources, lowEndPairing, sidechainReading } from '@/lib/core'
import { count, fxText, num, sidechainSentences } from './format'
import { TokenList } from './instruction'
import { VocabularyTerm } from '../vocabulary-term'

/** `kick`, `kick and sub`, `kick, sub and clap` — the Markdown sibling joins the same way. */
function RoleList({ roles }: { roles: readonly Role[] }) {
  return (
    <>
      {roles.map((role, i) => (
        <Fragment key={role}>
          {i === 0 ? null : (
            <span className="token-sep">{i === roles.length - 1 ? ' and ' : ', '}</span>
          )}
          <span className="role mono">
            <VocabularyTerm word={role} />
          </span>
        </Fragment>
      ))}
    </>
  )
}

/**
 * #152's summary, the Markdown sibling of `programsText`. First of the notes for the same
 * reason: it describes the group, and everything after it qualifies the group.
 *
 * Each count is `mono`, word included, because these are values a reader compares down the
 * column — §8 wants numbers legible at arm's length, and `9 parts` above `10 parts` in
 * proportional type does not line up. `count` is `format.ts`'s, the same helper the Markdown
 * sibling uses from `render.ts`: the wording is the thing that must not drift, and pluralising
 * by hand in two places is how it would.
 */
function GroupPrograms({ programs }: { programs: BandGroup['programs'] }) {
  if (programs.parts === 0) return null
  return (
    <span className="quiet">
      {' · '}
      <span className="mono">{count(programs.parts, 'part')}</span>,{' '}
      <span className="mono">{count(programs.strikes, 'strike')}</span>
    </span>
  )
}

function GroupNotes({ group }: { group: BandGroup }) {
  return (
    <>
      <GroupPrograms programs={group.programs} />
      {group.fallbacks.map((f) => (
        <span className="quiet" key={`fallback-${num(f.usedBand)}`}>
          {' · '}
          {f.all ? (
            <>every part plays band {num(f.usedBand)}</>
          ) : (
            <>
              <RoleList roles={f.roles} /> {f.roles.length === 1 ? 'plays' : 'play'} band{' '}
              {num(f.usedBand)}
            </>
          )}
        </span>
      ))}
      {group.silent.length === 0 ? null : (
        <span className="quiet">
          {' · '}
          <RoleList roles={group.silent} /> {group.silent.length === 1 ? 'has' : 'have'} nothing
          authored here
        </span>
      )}
      {group.differsOn.length === 0 ? null : (
        <span className="quiet">
          {' · '}differs on <RoleList roles={group.differsOn} />
        </span>
      )}
    </>
  )
}

/** §8 phase 7. Sidechain, master FX, tuning, arrangement variations — what happens once it plays. */
export function PhaseFinishing({ result }: { result: ResolveResult }) {
  const sidechain = sidechainSentences(sidechainReading(result.devices))
  const fx = fxSources(result.devices, result.assignments)
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  const only = fx[0] as FxSource | undefined
  const trajectory = bandTrajectory(result)
  const lowEnd = lowEndPairing(result)
  /*
   * §8/#264. The Markdown sibling of this sentence is in `render.ts`, written by hand there as
   * it is here: the *facts* are `lib/core/mix.ts`'s and the ink is each renderer's own (#33).
   * `test/guide-view.test.ts` holds the two to the same words.
   *
   * Built as one string rather than as JSX text so the key clause cannot pick up or lose a space
   * against its sibling — which is the whole failure mode a hand-written pair has.
   */
  const listen =
    "Sweep the kick's tuning slowly; stop where its tail adds weight instead of beating " +
    'against the sub, then check the full progression' +
    `${lowEnd?.key === undefined ? '' : ` in ${lowEnd.key}`} before committing.`

  return (
    <>
      <h4>Sidechain</h4>
      {sidechain.map((sentence) => (
        <p key={sentence}>{sentence}</p>
      ))}

      {/* "Master FX" and "master bus" stay: that is the master-copy sense, universal in music
          production and not half of a pair. */}
      <h4>Master FX</h4>
      {fx.length === 0 ? (
        <p className="quiet">
          Nothing in this rig processes audio. The master chain is yours at the desk.
        </p>
      ) : only !== undefined && fx.length === 1 ? (
        // #144, the same shape as the sidechain block above. "Nothing else in this rig processes
        // audio" is a claim about the other boxes, and at a rig of one there are none for it to
        // be about — it reads as though the reader were being told something about a rack, when
        // the whole rack is the box in front of them. State the rig's size instead.
        <p>
          The <strong>{only.name}</strong>{' '}
          <span className="quiet">{fxText(only, byId.get(only.deviceId))}</span>
          {result.devices.length === 1
            ? '; it is the only box here, so that is the whole master chain.'
            : '; nothing else in this rig processes audio.'}
        </p>
      ) : (
        <>
          <p className="quiet">What processes audio in this rig:</p>
          <ul className="boxes flat">
            {fx.map((source) => (
              <li key={source.deviceId}>
                <strong>{source.name}</strong>{' '}
                <span className="quiet">{fxText(source, byId.get(source.deviceId))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* §8/#264. After the master chain and before the arrangement, because it is the last
          thing done to the sound itself and the first thing done by ear. The label names where
          this comes from — the arrangement above it — because nothing here is off a manual and it
          must not wear a citation's clothes. Deliberately not the `· derived` form: that is the
          per-value badge #394 removed, and `Provenance`'s vocabulary means an authored point moved
          by a mood axis, which this is not. */}
      {lowEnd === undefined ? null : (
        <>
          <h4>
            Tuning <span className="quiet">— derived from this arrangement</span>
          </h4>
          {/*
            `kick` and `sub` are written here rather than carried from the model, which knows them
            as the two field names it pairs. They are plain prose too, and deliberately not
            `RoleList`'s token treatment: this is a sentence — *the TR-8S kick*, not a list of
            parts — and a `VocabularyTerm` inside it would put a tappable word mid-paragraph whose
            hit target reaches 14px above and below the line (#21, `.vocab-term::after`), over the
            prose either side. The same word is a term everywhere the guide lists parts.

            One box carrying both parts names it once, for the reason the Master FX block above
            drops its "nothing else in this rig" clause at a rig of one (#144): the two-box
            sentence prints the same name twice and reads as a rack the reader cannot see.
          */}
          <p>
            Loop <strong>{lowEnd.listenIn}</strong> with the{' '}
            {lowEnd.sameDevice ? (
              <>
                <strong>{lowEnd.kick.deviceName}</strong>
                {"'s kick and sub"}
              </>
            ) : (
              <>
                <strong>{lowEnd.kick.deviceName}</strong> kick and{' '}
                <strong>{lowEnd.sub.deviceName}</strong> sub
              </>
            )}
            {`. ${listen}`}
          </p>
        </>
      )}

      <h4>Arrangement variations</h4>
      {trajectory.groups.length === 0 ? (
        <p className="quiet">Nothing is assigned, so there is no arrangement to vary.</p>
      ) : (
        <>
          <p className="quiet">
            Sections that program identically, part for part — build one and copy it:
          </p>
          <ul className="boxes flat">
            {trajectory.groups.map((group) => (
              <li key={group.sections.join(',')}>
                <strong>
                  {group.band === undefined ? 'no parts' : `band ${num(group.band)}`}
                </strong>{' '}
                <TokenList
                  className="section"
                  items={group.sections.map((s) => ({ key: s, text: s }))}
                />
                <GroupNotes group={group} />
              </li>
            ))}
          </ul>
        </>
      )}

      {trajectory.unpatterned.length === 0 ? null : (
        <p className="quiet">
          <RoleList roles={trajectory.unpatterned} />{' '}
          {trajectory.unpatterned.length === 1 ? 'has' : 'have'} no pattern authored at any band,
          so nothing here varies for {trajectory.unpatterned.length === 1 ? 'it' : 'them'}.
        </p>
      )}

      {/* §4.2. A separate sentence, after that one, because it is a different claim: that one
          reports a hole in the direction, this one reports what the part is. Run together they
          read as one list of things that went wrong. */}
      {trajectory.sustained.length === 0 ? null : (
        <p className="quiet">
          <RoleList roles={trajectory.sustained} />{' '}
          {trajectory.sustained.length === 1 ? 'is' : 'are'} held rather than struck, so there is
          no grid here to vary.
        </p>
      )}

    </>
  )
}
