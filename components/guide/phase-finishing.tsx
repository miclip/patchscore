import { Fragment } from 'react'
import type { BandGroup, FxSource, ResolveResult, Role } from '@/lib/core'
import { bandTrajectory, fxSources } from '@/lib/core'
import { fxText, num } from './format'
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

function GroupNotes({ group }: { group: BandGroup }) {
  return (
    <>
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
  const duckers = result.devices.filter((d) => d.features?.sidechain !== undefined)
  const fx = fxSources(result.devices)
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  const only = fx[0] as FxSource | undefined
  const trajectory = bandTrajectory(result)

  return (
    <>
      <h4>Sidechain</h4>
      {duckers.length === 0 ? (
        <p className="quiet">
          No device in this rig has a sidechain.
        </p>
      ) : (
        <ul className="boxes flat">
          {duckers.map((device) => {
            const spec = device.features?.sidechain
            const kinds: string[] = []
            if (spec?.internal === true) kinds.push('internal')
            if (spec?.fromExternalAudio === true) kinds.push('from external audio')
            return (
              <li key={device.id}>
                <strong>{device.name}</strong>{' '}
                <span className="quiet">
                  {kinds.length === 0 ? 'declared, no source listed' : kinds.join(', ')}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {/* "Master FX" and "master bus" stay: that is the master-copy sense, universal in music
          production and not half of a pair. */}
      <h4>Master FX</h4>
      {fx.length === 0 ? (
        <p className="quiet">
          Nothing in this rig processes audio. The master chain is yours at the desk.
        </p>
      ) : only !== undefined && fx.length === 1 ? (
        <p>
          The <strong>{only.name}</strong>{' '}
          <span className="quiet">{fxText(only, byId.get(only.deviceId))}</span>; nothing else in
          this rig processes audio.
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
