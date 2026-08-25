import type { ClockSource, DeviceId, ResolveResult } from '@/lib/core'
import { clockJackNotes, clockSourceBasis, clockSourceSetup, evidenceFor } from '@/lib/core'
import { clockParts, count, ioText, mixerText, syncText } from './format'
import { EvidenceMark, evidenceLines } from './instruction'

/**
 * §7.4/#121. **Why this box** — the basis of the clock-source answer, in this renderer's own
 * words (the standing rule in this directory: one right answer, two hand-written vocabularies).
 *
 * Without it a deterministic fallback and a person's judgement reach a reader in identical words,
 * and the fallback is the one that then reads like advice. §8 says this page is what somebody is
 * holding at the rack, so it is the renderer that matters most for it.
 *
 * One line for the rig, never one per candidate (#35, #107). The boxes that were asked and
 * declined are the device pages' business.
 */
function basisText(source: ClockSource): string {
  switch (clockSourceBasis(source)) {
    case 'claimed':
      return 'its manual says leading a rig is its job'
    // Two honest claims, and §7.4 has no basis to rank them — so the guide says which keys did,
    // rather than implying a judgement nobody made.
    case 'contested':
      return `${count(source.claims, 'box', 'boxes')} here claim that job, so transport, then name, settled it`
    default:
      return 'nothing here claims that job, so transport, then name, settled it'
  }
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

  /**
   * §7.4/#121. What the chosen box's manifest recorded when it decided whether leading a rig is
   * its job — **its own entry only**, at `clock.preferredSource`. A manifest that recorded
   * nothing there gets no mark and no citation: nobody wrote down a reading, so the page claims
   * none, which is invariant 5 rather than a hole.
   */
  const preference =
    sourceDevice === undefined ? undefined : evidenceFor(sourceDevice, 'clock.preferredSource')

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
          {count(source.occupiedAssignables, 'part')}. {syncText(result.devices, source.deviceId)}
        </p>
      )}

      {source === undefined ? null : (
        <div className="callout">
          <p>
            Why this box — {basisText(source)}{' '}
            {preference === undefined ? null : <EvidenceMark evidence={preference} />}
          </p>
          {/*
            The citation is *visible*, not only in the mark's title attribute — a reader on a
            phone at the rack has no hover, and a printed guide has no attributes at all.
          */}
          {preference === undefined
            ? null
            : evidenceLines(preference, 'claim').map((cite) => (
                <p className="subordinate cite" key={cite}>
                  {cite}
                </p>
              ))}
        </div>
      )}

      {setup === undefined || source === undefined ? null : (
        <div className="callout">
          <p>
            On the {source.deviceName}, set <span className="mono">{setup.path}</span> to{' '}
            <span className="mono">{setup.value}</span>{' '}
            <EvidenceMark evidence={setup.evidence} />
          </p>
          {/*
            §8.1's subordinate lines, the same two the sound-design phase uses. The citation is
            *visible*, not only in the mark's title attribute: a citation is the guide's evidence,
            and `manual` alone cannot tell a reader which book or which page — the fact that
            changes what they do with the value.
          */}
          {setup.note === undefined ? null : <p className="subordinate note">{setup.note}</p>}
          {evidenceLines(setup.evidence).map((cite) => (
            <p className="subordinate cite" key={cite}>
              {cite}
            </p>
          ))}
        </div>
      )}

      <ul className="boxes">
        {result.devices.map((device) => {
          const parts = occupied.get(device.id) ?? 0
          const clock = clockParts(device)
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
                  {/*
                    #121. Four states, not two — this said `receives clock only` for a mixer whose
                    manual never mentions MIDI, and then named the transports it would arrive on.
                    The claim and the wire are decided together in `clockParts` for that reason,
                    and rendered apart so §10's rule about prose and identifiers survives: a box
                    with no clock at all names no wire.
                  */}
                  <dd>
                    {clock.claim}
                    {clock.transport === undefined ? null : (
                      <>
                        {' · '}
                        <span className="mono">{clock.transport}</span>
                      </>
                    )}
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
                          {jackNote.note} <EvidenceMark evidence={jackNote.evidence} />
                          {evidenceLines(jackNote.evidence).map((cite) => (
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
