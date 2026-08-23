import type { DeviceId, ResolveResult } from '@/lib/core'
import { ioText, num } from './format'
import { TokenList } from './instruction'

/** §8 phase 7. Sidechain, master FX, arrangement variations — what happens once it plays. */
export function PhaseFinishing({
  result,
  occupied,
}: {
  result: ResolveResult
  occupied: Map<DeviceId, number>
}) {
  const duckers = result.devices.filter((d) => d.features?.sidechain !== undefined)
  const fx = result.devices.filter(
    (d) => d.kind === 'fx-processor' || d.kind === 'mixer-recorder',
  )
  const carried = result.devices
    .filter((d) => (occupied.get(d.id) ?? 0) > 0)
    .map((d) => d.name)
    .join(', ')
  const transient = result.assignments.filter(
    (a) => a.sections.length < result.template.structure.length,
  )

  return (
    <>
      <h4>Sidechain</h4>
      {duckers.length === 0 ? (
        <p className="quiet">
          No device in this rig declares a sidechain. Nothing here was invented for one.
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
          Nothing in this rig is an fx-processor or a mixer-recorder, and per-device master chains
          are not modelled — so this is yours to decide at the desk.
        </p>
      ) : (
        <ul className="boxes flat">
          {fx.map((device) => (
            <li key={device.id}>
              <strong>{device.name}</strong> <span className="quiet">{device.kind}</span>{' '}
              <span className="quiet">{ioText(device)}</span>
            </li>
          ))}
        </ul>
      )}

      <h4>Arrangement variations</h4>
      <p className="quiet">
        Parts live on {carried === '' ? 'nothing' : carried}. Section by section:
      </p>
      <ul className="boxes flat">
        {result.template.structure.map((section) => {
          const here = result.assignments.filter((a) => a.sections.includes(section.name))
          return (
            <li key={section.name}>
              <strong>{section.name}</strong>{' '}
              <span className="quiet">
                {num(section.bars)} bars, energy {num(section.energy)}
              </span>{' '}
              {here.length === 0 ? (
                <span className="quiet">nothing assigned</span>
              ) : (
                <TokenList
                  className="role mono"
                  items={here.map((a) => ({ key: a.requestId, text: a.role }))}
                />
              )}
            </li>
          )
        })}
      </ul>

      {transient.length === 0 ? null : (
        <>
          <p className="quiet">
            Parts that come and go, which is where the arrangement actually moves:
          </p>
          <ul className="boxes flat">
            {transient.map((a) => (
              <li key={a.requestId}>
                <span className="role mono">{a.role}</span>{' '}
                <span className="quiet">{a.sections.join(', ')} only</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
