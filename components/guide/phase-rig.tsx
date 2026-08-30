import type {
  ClockSource,
  Device,
  DeviceId,
  InterDevicePatch,
  ResolveResult,
  VoiceControlSource,
} from '@/lib/core'
import {
  clockBasisEvidence,
  clockJackNotes,
  clockSourceBasis,
  clockSourceSetup,
} from '@/lib/core'
import { clockParts, count, ioText, list, mixerText, syncText } from './format'
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
    // #200. Nothing to justify — the reader decided it. The other three exist to answer "why
    // this one" for somebody who did not, and a derived answer must never wear the same words
    // as a person's judgement.
    case 'chosen':
      return 'you chose it'
    // #144 leaves this one alone: it asserts no comparison. "Its manual says leading a rig is its
    // job" is a fact about this box, true whether it was ranked against ten others or none.
    case 'claimed':
      return 'its manual says leading a rig is its job'
    // Two honest claims, and §7.4 has no basis to rank them — so the guide says which keys did,
    // rather than implying a judgement nobody made.
    case 'contested':
      return `${count(source.claims, 'box', 'boxes')} here claim that job, so transport, then name, settled it`
    // #144. Two tie-breaks named, and at a rig with one box that can send clock neither ran —
    // the sort was over a list of one. `eligible` is the count this sentence always rested on.
    default:
      return source.eligible === 1
        ? 'it is the only box here that can send clock'
        : 'nothing here claims that job, so transport, then name, settled it'
  }
}

/**
 * §3.3/#121. **Why this box sends the notes**, in this renderer's own words — the same standing
 * rule as `basisText` above: one right answer, two hand-written vocabularies. And the same reason
 * for existing at all, which is that a deterministic tie-break must not reach a reader looking
 * like somebody's judgement.
 */
function voiceBasisText(source: VoiceControlSource): string {
  switch (source.basis) {
    case 'clock-source':
      return 'it already sends the clock, so the cables run from where the tempo does'
    case 'claimed':
      return 'its manual says leading a rig is its job'
    case 'contested':
      return `${count(source.claims, 'box', 'boxes')} here claim that job, so the names settled it`
    // #144, one tier down and the same branch of the rule: `ranked` counts every note-and-gate
    // pair in the rig and `candidates` counts this box's, so they are equal exactly when no other
    // box offered one, and "the names settled it" is a comparison with nothing on the other side.
    default:
      return source.ranked === source.candidates
        ? 'it is the only box here that sends a note and a gate together'
        : 'nothing here claims that job, so the names settled it'
  }
}

/**
 * §3.3. **The cables that make a box play**, and the honest version when there are none.
 *
 * Both device names and both jack ids on every row, monospaced, because the reader is at a rack
 * hunting for a silkscreen and "patch pitch and gate" is not an instruction. Three outcomes get
 * three different blocks: `no-target` renders nothing, since a rig of grooveboxes is not missing a
 * cable, and the two gaps get words rather than an absence (§7.3, invariant 5).
 */
function VoiceControl({ patch }: { patch: InterDevicePatch }) {
  if (patch.outcome === 'no-target') return null
  const routed = patch.targets.filter((t) => t.outcome === 'routed')
  const exhausted = patch.targets.filter((t) => t.outcome === 'source-exhausted')
  const orphaned = patch.targets.filter((t) => t.outcome === 'no-compatible-source')
  const source = patch.source

  return (
    <>
      {source === undefined || routed.length === 0 ? null : (
        <div className="callout">
          <p>
            <strong>Voice control</strong> — {source.deviceName} sends the notes.{' '}
            {count(routed.length * 2, 'cable')}, and nothing plays until they are in.
          </p>
          <dl className="box-facts">
            {routed.flatMap((target) =>
              target.cables.map((cable) => (
                <div key={`${cable.fromJack}->${cable.toDeviceId}:${cable.toJack}`}>
                  <dt>{cable.signal === 'gate' ? 'gate' : 'pitch'}</dt>
                  <dd>
                    {cable.fromDeviceName} <span className="mono">{cable.fromJack}</span> →{' '}
                    {cable.toDeviceName} <span className="mono">{cable.toJack}</span>
                  </dd>
                </div>
              )),
            )}
          </dl>
          {/* Not "Why this box" — the clock block already asks that, about a different
              decision, and two lines opening the same way on one page is the readability
              problem #35 is about. */}
          <p>Why this box sends them — {voiceBasisText(source)}</p>
        </div>
      )}

      {exhausted.length === 0 || source === undefined ? null : (
        <div className="callout">
          <p>
            <strong>Not driven</strong> — {source.deviceName} offers{' '}
            {count(source.candidates, 'pitch-and-gate pair')} and this rig wants more.{' '}
            {list(exhausted.map((t) => t.deviceName))}{' '}
            {exhausted.length === 1 ? 'is' : 'are'} left unpatched.
          </p>
          {exhausted.map((target) => (
            <p className="subordinate note" key={target.deviceId}>
              {target.deviceName} <span className="mono">{target.pitchJack}</span> and{' '}
              <span className="mono">{target.gateJack}</span> — nothing to plug in. Play it from its
              own keyboard or sequencer.
            </p>
          ))}
        </div>
      )}

      {orphaned.length === 0 ? null : (
        <div className="callout">
          <p>
            <strong>No voice control</strong> — nothing in this rig sends a note and a gate
            together. {list(orphaned.map((t) => t.deviceName))}{' '}
            {orphaned.length === 1 ? 'takes' : 'take'} one.
          </p>
          {orphaned.map((target) => (
            <p className="subordinate note" key={target.deviceId}>
              {target.deviceName} <span className="mono">{target.pitchJack}</span> and{' '}
              <span className="mono">{target.gateJack}</span> — play it from its own keyboard or
              sequencer, or add a box that can drive it.
            </p>
          ))}
        </div>
      )}
    </>
  )
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
  detail,
}: {
  result: ResolveResult
  occupied: Map<DeviceId, number>
  /**
   * §8/#240. Which boxes get a block of their own here.
   *
   * Defaults to every device, which is what the phase layout wants and what this phase always
   * did. The sequencer layout passes only the boxes no section covers — a mixer, an fx-processor,
   * anything carrying no parts (§2.4) — because each remaining box's block is drawn in the
   * section where its parts are worked instead.
   *
   * The rig-wide half above is unaffected: the clock source and what it rests on are facts about
   * the rig, and belong where the rig is described whichever way the guide is read.
   */
  detail?: readonly Device[]
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
    // #200/#33. Nothing when the reader chose the box — see `clockBasisEvidence`.
    clockBasisEvidence(source, sourceDevice)

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
          {count(source.occupiedAssignables, 'part')}.{' '}
          {syncText(result.devices, source.deviceId, source.transport)}
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

      {/*
        §3.3. After the clock and before the per-box list, which is the order somebody patches a
        rack in: sync first, then the cables that make a box play, then what each box's own
        outputs do.
      */}
      <VoiceControl patch={result.interDevicePatch} />

      <ul className="boxes">
        {(detail ?? result.devices).map((device) => {
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
                    {/*
                      A box whose two directions run on different wires — the Mother-32 sends
                      only over `analog-clock` and takes clock over `midi-din` too. The labels
                      are prose and stay here; which wires they name is `clockWires`' answer.
                    */}
                    {clock.send === undefined ? null : (
                      <>
                        {' · out: '}
                        <span className="mono">{clock.send}</span>
                        {' · in: '}
                        <span className="mono">{clock.receive}</span>
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
