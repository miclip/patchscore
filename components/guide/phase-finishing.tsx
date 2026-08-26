import { Fragment } from 'react'
import type { BandGroup, FxSource, ResolveResult, Role } from '@/lib/core'
import { bandTrajectory, fxSources, sidechainReading } from '@/lib/core'
import { fxText, num, sidechainSentences } from './format'
import { TokenList } from './instruction'

/** `kick`, `kick and sub`, `kick, sub and clap` — the Markdown sibling joins the same way. */
function RoleList({ roles }: { roles: readonly Role[] }) {
  return (
    <>
      {roles.map((role, i) => (
        <Fragment key={role}>
          {i === 0 ? null : (
            <span className="token-sep">{i === roles.length - 1 ? ' and ' : ', '}</span>
          )}
          <span className="role mono">{role}</span>
        </Fragment>
      ))}
    </>
  )
}

/**
 * #152's summary, the Markdown sibling of `programsText`. First of the notes for the same
 * reason: it describes the group, and everything after it qualifies the group.
 *
 * The counts are `mono` because they are values a reader compares between lines — §8 wants
 * numbers legible at arm's length, and two strike counts in proportional type do not line up.
 */
function GroupPrograms({ programs }: { programs: BandGroup['programs'] }) {
  if (programs.parts === 0) return null
  return (
    <span className="quiet">
      {' · '}
      <span className="mono">{num(programs.parts)}</span>{' '}
      {programs.parts === 1 ? 'part' : 'parts'},{' '}
      <span className="mono">{num(programs.strikes)}</span>{' '}
      {programs.strikes === 1 ? 'strike' : 'strikes'}
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

/** §8 phase 7. Sidechain, master FX, arrangement variations — what happens once it plays. */
export function PhaseFinishing({ result }: { result: ResolveResult }) {
  const sidechain = sidechainSentences(sidechainReading(result.devices))
  const fx = fxSources(result.devices, result.assignments)
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  const only = fx[0] as FxSource | undefined
  const trajectory = bandTrajectory(result)

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
          so nothing here varies for them.
        </p>
      )}

    </>
  )
}
