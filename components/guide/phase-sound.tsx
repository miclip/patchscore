import type {
  Device,
  DeviceId,
  ResolveResult,
  ResolvedAssignment,
  ResolvedPatchEntry,
} from '@/lib/core'
import { dominantRangeCite } from '@/lib/core'
import { citeLines, citeText, hintText } from './format'
import { Instruction, ParamLine, ProvenanceMark } from './instruction'

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
          {device.manual === undefined ? null : (
            <p className="quiet">
              Values below cite {device.manual.title}
              {device.manual.edition === undefined ? '' : `, ${device.manual.edition}`}.
            </p>
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
