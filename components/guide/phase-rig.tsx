import type { DeviceId, ResolveResult } from '@/lib/core'
import { count, ioText, mixerText } from './format'

/**
 * §8 phase 3. One block per box rather than a table plus a second list keyed by name: two
 * renderings of the same devices make the reader join them by eye, on the phase whose whole job
 * is "what do I plug where".
 *
 * Terminology is fixed: **clock source** and *sync to it*, never master/slave.
 */
export function PhaseRig({
  result,
  occupied,
}: {
  result: ResolveResult
  occupied: Map<DeviceId, number>
}) {
  const source = result.clockSource

  return (
    <>
      {source === undefined ? (
        // §7.4: a real rig, and a fact to state rather than paper over.
        <p className="callout">
          <strong>Clock</strong> — nothing in this rig can send clock. Every box here has to
          receive one, so the clock has to come from something outside it.
        </p>
      ) : (
        <p className="callout">
          <strong>Clock source</strong> — {source.deviceName} over{' '}
          <span className="mono">{source.transport}</span>, carrying{' '}
          {count(source.occupiedAssignables, 'part')}. Sync everything else to it.
        </p>
      )}

      <ul className="boxes">
        {result.devices.map((device) => {
          const parts = occupied.get(device.id) ?? 0
          return (
            <li key={device.id}>
              <div className="box-head">
                <strong>{device.name}</strong>
                <span className="quiet">
                  {device.kind} · {count(parts, 'part')}
                </span>
              </div>
              <dl className="box-facts">
                <div>
                  <dt>clock</dt>
                  <dd>
                    {device.clock.canSendClock ? 'sends clock' : 'receives clock only'} ·{' '}
                    <span className="mono">{device.clock.transport.join('/')}</span>
                  </dd>
                </div>
                <div>
                  <dt>audio</dt>
                  <dd>{ioText(device)}</dd>
                </div>
                <div>
                  <dt>mixer</dt>
                  <dd>{mixerText(device, parts)}</dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>
    </>
  )
}
