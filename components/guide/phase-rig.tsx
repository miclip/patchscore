import type { DeviceId, ResolveResult } from '@/lib/core'
import type { Provenance, Verified } from '@/lib/core'
import { clockJackNotes, clockSourceSetup } from '@/lib/core'
import { citeLines, count, ioText, mixerText } from './format'
import { ProvenanceMark } from './instruction'

/**
 * §3.1's two states, for device data that carries a `Verified` rather than a `ResolvedParam`.
 *
 * A menu path and a jack note are rendered values, so invariant 4 applies to them exactly as it
 * applies to a knob position — they are just not resolved through `resolveParam`, because no
 * recipe owns them and no mood can move them.
 */
function provenanceOf(verified: Verified): Provenance {
  return verified === false ? { state: 'provisional' } : { state: 'authored', cite: verified }
}

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

  /**
   * #104. The setting that makes "sync everything else to it" possible.
   *
   * A clock source whose output is routed in a menu emits nothing until the menu says so, and
   * the phase was telling a reader to sync to a box that was silent. The path, the value and the
   * page are the device's own (`ClockSpec.sourceSetup`); nothing here names a box or a menu, so
   * a device that declares no setup renders exactly as it did before.
   *
   * The lookup is shared with the Markdown renderer and the wording is not — which is the
   * standing rule in this directory. One right answer to "which entry", two hand-written
   * sentences around it.
   */
  const sourceDevice =
    source === undefined ? undefined : result.devices.find((d) => d.id === source.deviceId)
  const setup =
    sourceDevice === undefined || source === undefined
      ? undefined
      : clockSourceSetup(sourceDevice, source.transport)

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

      {setup === undefined || source === undefined ? null : (
        <div className="callout">
          <p>
            On the {source.deviceName}, set <span className="mono">{setup.path}</span> to{' '}
            <span className="mono">{setup.value}</span>{' '}
            <ProvenanceMark provenance={provenanceOf(setup.verified)} />
          </p>
          {/*
            §8.1's subordinate lines, the same two the sound-design phase uses. The citation is
            *visible*, not only in the mark's title attribute: a citation is the guide's evidence,
            and `manual` alone cannot tell a reader which book or which page — the fact that
            changes what they do with the value.
          */}
          {setup.note === undefined ? null : <p className="subordinate note">{setup.note}</p>}
          {citeLines(provenanceOf(setup.verified), undefined).map((cite) => (
            <p className="subordinate cite" key={cite}>
              {cite}
            </p>
          ))}
        </div>
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
                {/*
                  #103. What this box's manual says about the sockets *this* rig's clock runs
                  through — the Tracker Mini's Type B adapter is the case, and Type B is the
                  uncommon one. Filtered by transport and deduped in `clockJackNotes`, so a USB
                  rig hears nothing about a MIDI adapter and a note true of the In and the Out
                  both is printed once rather than reading as two separate warnings.
                */}
                {source === undefined
                  ? null
                  : clockJackNotes(device, source.transport).map((jackNote) => (
                      <div key={jackNote.jacks.join(',')}>
                        <dt className="mono">{jackNote.jacks.join(', ')}</dt>
                        <dd>
                          {jackNote.note} <ProvenanceMark provenance={provenanceOf(jackNote.verified)} />
                          {citeLines(provenanceOf(jackNote.verified), undefined).map((cite) => (
                            <p className="subordinate cite" key={cite}>
                              {cite}
                            </p>
                          ))}
                        </dd>
                      </div>
                    ))}
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
