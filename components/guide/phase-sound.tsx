import type {
  Device,
  DeviceId,
  ResolveResult,
  ResolvedAssignment,
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
function realisationInstruction(a: ResolvedAssignment): string {
  if (a.notes <= 1) return ''
  const notes = count(a.notes, 'note')
  const n = num(a.notes)
  if (a.recipe.realisation === 'sampled-chord') {
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
function Params({ assignment, owner }: { assignment: ResolvedAssignment; owner: Device | undefined }) {
  const hoisted = dominantRangeCite(assignment.params)
  return (
    <>
      {hoisted === undefined ? null : (
        <p className="quiet">Ranges cite {citeText(hoisted)}.</p>
      )}
      <div className="params">
        {assignment.params.map((param) => {
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

  const carrying = result.devices
    .map((device) => ({
      device,
      mine: result.assignments.filter((a) => a.deviceId === device.id),
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

          {mine.map((a) => {
            const owner: Device | undefined = deviceById.get(a.deviceId)
            return (
              <div className="recipe" key={a.requestId}>
                <h5>
                  <span>{a.assignable.label}</span>
                  <span className="role mono">{a.role}</span>
                  <span className="recipe-title">{a.recipe.title}</span>
                </h5>

                {realisationInstruction(a) === '' ? null : (
                  <p className="quiet">{realisationInstruction(a)}</p>
                )}

                {a.recipe.routing === undefined ? null : (
                  <p className="quiet">Routing — {a.recipe.routing}</p>
                )}

                {a.params.length === 0 ? (
                  <p className="quiet">No settings authored for this recipe.</p>
                ) : (
                  <Params assignment={a} owner={owner} />
                )}

                {a.patch.length === 0 ? null : (
                  <>
                    <h6>Patch</h6>
                    <Patch entries={a.patch} />
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
