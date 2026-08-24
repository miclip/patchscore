import type {
  Device,
  DeviceId,
  ResolveResult,
  ResolvedAssignment,
  ResolvedMember,
  ResolvedPatchEntry,
} from '@/lib/core'
import { citationSentence } from '@/lib/core'
import { dominantRangeCite } from '@/lib/core'
import { citeLines, citeText, count, hintText, num } from './format'
import { Instruction, ParamLine, ProvenanceMark } from './instruction'

/**
 * §12.4, and an instruction rather than a note: the two realisations are two different things to
 * do at the box, and doing the wrong one produces the wrong number of sounds. A chord you load
 * is not a chord you play. Anything device-specific about the trade — which slot it spends,
 * which it does not — is the recipe's `routing` line, because this view knows nothing about any
 * box.
 *
 * Hand-written to match the Markdown renderer word for word. The two share no code path, so the
 * only thing keeping them in step is that someone wrote the same sentence twice on purpose.
 */
function realisationInstruction(a: ResolvedAssignment, member: ResolvedMember): string {
  if (a.notes <= 1) return ''
  const notes = count(a.notes, 'note')
  const n = num(a.notes)
  // §12.4 stacking. This box plays a *share* of the chord, so the instruction is about which
  // share and about the two things a reader standing here would otherwise get wrong: that the
  // timing is the same as on the other boxes, and that the pitch is not.
  if (a.members.length > 1) {
    const rest = a.members.length - 1
    const others = rest === 1 ? 'the other voice' : `the other ${count(rest, 'voice')}`
    return (
      `Polyphony — ${notes} across ${count(a.members.length, 'voice')}, and this one plays ` +
      `${num(member.notes)} of them. Same steps as ${others} — see Step programming — and the ` +
      'note this voice takes is in Hook.'
    )
  }
  if (member.recipe.realisation === 'sampled-chord') {
    return (
      `Polyphony — ${notes}, already inside the sample. Load the chord sample(s) onto this one ` +
      `voice rather than spreading the notes across ${n}. One sample covers its chord shape at ` +
      `any root; a different shape needs its own — see Hook.`
    )
  }
  return (
    `Polyphony — ${notes} sounding at once on this one voice. It needs a genuinely polyphonic ` +
    `voice, not ${n} separate ones.`
  )
}

function Patch({ entries }: { entries: readonly ResolvedPatchEntry[] }) {
  return (
    <ul className="patch">
      {entries.map((entry) => (
        <li key={`${entry.from}->${entry.to}`}>
          <Instruction
            cites={citeLines(entry.provenance, undefined)}
            {...(entry.note === undefined ? {} : { note: entry.note })}
          >
            <span className="mono">{entry.from}</span>
            <span className="arrow" aria-hidden="true">
              →
            </span>
            <span className="mono">{entry.to}</span>
            <ProvenanceMark provenance={entry.provenance} />
          </Instruction>
        </li>
      ))}
    </ul>
  )
}

/**
 * A recipe whose parameters all come off one manual page printed that page under every line.
 * The shared citation is stated once under the heading; a parameter citing a different page —
 * or one whose range is unverified, which is a different claim entirely — keeps its own.
 */
function Params({ member, owner }: { member: ResolvedMember; owner: Device | undefined }) {
  const hoisted = dominantRangeCite(member.params)
  return (
    <>
      {hoisted === undefined ? null : (
        <p className="quiet">Ranges cite {citeText(hoisted)}.</p>
      )}
      <div className="params">
        {member.params.map((param) => {
          const hint = param.hint === undefined ? undefined : hintText(owner, param.hint)
          return (
            <ParamLine
              key={param.name}
              param={param}
              {...(hint === undefined ? {} : { hint })}
              {...(hoisted === undefined ? {} : { hoisted })}
            />
          )
        })}
      </div>
    </>
  )
}

/**
 * §8 phase 6. Parameter values, device by device in rig order, each carrying its provenance.
 *
 * A device carrying nothing has nothing to dial and is covered by rig integration above.
 */
export function PhaseSound({
  result,
  deviceById,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
}) {
  if (result.assignments.length === 0) {
    return <p className="quiet">No parts assigned.</p>
  }

  // §12.4 stacking: grouped by **member**, not by assignment. A stacked part has one recipe per
  // voice and each belongs under the box that voice is on — grouping by the part's first device
  // would print Crave settings under the Sub 37.
  const carrying = result.devices
    .map((device) => ({
      device,
      mine: result.assignments.flatMap((a) =>
        a.members.filter((m) => m.deviceId === device.id).map((member) => ({ a, member })),
      ),
    }))
    .filter((entry) => entry.mine.length > 0)

  return (
    <>
      {carrying.map(({ device, mine }) => (
        <section className="device" key={device.id}>
          <h4>{device.name}</h4>
          {/* The markdown renderer's own sentence, so the two cannot say different things. */}
          {citationSentence(device) === undefined ? null : (
            <p className="quiet">{citationSentence(device)}</p>
          )}

          {mine.map(({ a, member }) => {
            const owner: Device | undefined = deviceById.get(member.deviceId)
            return (
              <div className="recipe" key={`${a.requestId}/${member.assignable.voiceId}`}>
                <h5>
                  <span>{member.assignable.label}</span>
                  <span className="role mono">{a.role}</span>
                  <span className="recipe-title">{member.recipe.title}</span>
                </h5>

                {realisationInstruction(a, member) === '' ? null : (
                  <p className="quiet">{realisationInstruction(a, member)}</p>
                )}

                {member.recipe.routing === undefined ? null : (
                  <p className="quiet">Routing — {member.recipe.routing}</p>
                )}

                {member.params.length === 0 ? (
                  <p className="quiet">No settings authored for this recipe.</p>
                ) : (
                  <Params member={member} owner={owner} />
                )}

                {member.patch.length === 0 ? null : (
                  <>
                    <h6>Patch</h6>
                    <Patch entries={member.patch} />
                  </>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </>
  )
}
