import { Fragment } from 'react'
import { ModulationMark } from '@/components/modulation-mark'
import { Value } from '@/components/guide/instruction'
import { hintText } from '@/components/guide/format'
import type { Device, ResolvedModulationEnd, ResolvedParam } from '@/lib/core'
import { groupedParams, modulationEndParts, num, paramLabel } from '@/lib/core'

/**
 * §3.8/#520. **One React reading of a *resolved* recipe, drawn once and used by both surfaces
 * that have one.**
 *
 * A riff page and a sound page each resolve one thing against the reader's rig and then have to
 * draw what came back: the cables inside the box, the module boxes, the parameter lines, the
 * routings, the notes and the jogs. That was one implementation and a second one waiting to be
 * written; this is the first one, moved, so the second never exists.
 *
 * The risk it removes is the one `kit-parts.tsx` names: a second interpretation of a parameter
 * would let a reader who moved between two pages find the same control described two ways, and
 * neither would be wrong enough to notice.
 *
 * **`ResolvedParam`, not `AuthoredParam`, and that is why this is not `kit-parts.tsx`.** A kit
 * panel renders what a device folder holds — an authored point with its range or its option set
 * beside it, and a scope word where one is declared — because nothing has resolved and no rig is
 * in play. These two surfaces render what a resolver produced, which carries provenance, a
 * `from → to` shape for a value mood has moved, and a MIDI CC. The two are different readings of
 * different types, and collapsing them would mean one of the pages lying about which it had.
 *
 * **The cables are `patch-list.tsx`', not this file's**, and that split is required rather than
 * tidy: `Value` below reaches `components/guide/nav.ts`, which uses `createContext`, and a
 * React Server Component may not import one. `kit-parts.tsx` renders on the server and needs the
 * cables alone. See that file.
 *
 * **Ink stays each surface's own** (#33). The class prefix is a prop, so a riff page's markup is
 * byte-identical to what it was and a sound page carries its own names; what is shared is the
 * structure and the decisions inside it. §10's value treatment is `Value`, #385's module boxes are
 * `groupedParams`, `paramLabel` trims a module's own prefix, and a cable and a modulation are
 * `CableMark` and `ModulationMark` — all imported, so a reader arriving from a guide meets one
 * convention rather than three.
 *
 * **The guide's `Instruction` is deliberately not used**, for the reason `kit-parts.tsx` gives: it
 * reserves a hint column that §8.1's toggle controls, and neither of these pages has a toggle, so
 * a hint rendered into that column would be invisible. Notes and hints are both printed and both
 * visible — these readers are deciding whether to build the patch at all.
 */

/** #511. One end of a routing: the control to set, and what to set it to. See `ParamLine`'s. */
function ResolvedModulationEndParts({ end }: { end: ResolvedModulationEnd }) {
  const parts = modulationEndParts(end)
  return (
    <>
      {parts.control === undefined ? null : <span className="param-name">{parts.control}</span>}
      <span className="mono">{parts.value}</span>
    </>
  )
}

/**
 * One parameter: the name, the value, and whatever the author wrote under it.
 *
 * §3.2/invariant 4: **no provenance mark and no page beside the value.** The evidence is on every
 * `ResolvedParam` and none of it is rendered here — one sentence for the block is the whole of a
 * page's ink about where the numbers came from.
 */
function ResolvedParamLine({
  param,
  device,
  prefix,
}: {
  param: ResolvedParam
  device: Device
  prefix: string
}) {
  const hint = param.hint === undefined ? undefined : hintText(device, param.hint)
  const m = param.modulation
  return (
    <li className={`${prefix}-param`}>
      <span className={`${prefix}-param-line`}>
        {/*
          #511. A routing reads as an assignment on these pages too, in the same shape §8 draws and
          beside the same mark, so a reader arriving from a guide meets one convention rather than
          two.
        */}
        {m === undefined ? null : (
          <>
            <ModulationMark />
            <span className="param-kind">Modulation — </span>
            <ResolvedModulationEndParts end={m.source} />
            <span className="arrow" aria-hidden="true">
              {' → '}
            </span>
            <ResolvedModulationEndParts end={m.destination} />
            {m.polarity === undefined ? null : (
              <>
                <span className="param-sep" aria-hidden="true">
                  {' · '}
                </span>
                <ResolvedModulationEndParts end={m.polarity} />
              </>
            )}
            <span className="param-sep" aria-hidden="true">
              {' · '}
            </span>
          </>
        )}
        <span className="param-name">{m?.amountControl ?? paramLabel(param)}</span>
        <Value param={param} />
      </span>
      {m === undefined ? null : (
        <p className="subordinate neutral">{`${num(m.neutral)} is no modulation`}</p>
      )}
      {param.note === undefined ? null : <p className="subordinate note">{param.note}</p>}
      {hint === undefined ? null : <p className={`${prefix}-hint`}>{hint}</p>}
    </li>
  )
}

/**
 * #385's module box. `groupedParams` decides the cut, shared rather than restated, so these pages
 * and the guide box the same controls together. A group naming no module renders as bare lines, so
 * a box that names no panel blocks produces a plain list and no empty frames.
 */
export function ResolvedSettings({
  params,
  device,
  prefix,
}: {
  params: readonly ResolvedParam[]
  device: Device
  /** The surface's own class prefix — `riff` or `sample`. */
  prefix: string
}) {
  return (
    <>
      {groupedParams(params).map((group, i) => {
        const lines = (
          <ul className={`${prefix}-params`}>
            {group.params.map((param) => (
              <ResolvedParamLine
                key={param.name}
                param={param}
                device={device}
                prefix={prefix}
              />
            ))}
          </ul>
        )
        if (group.module === undefined) return <Fragment key={`${String(i)}-`}>{lines}</Fragment>
        return (
          <div className="module-box" key={`${String(i)}-${group.module}`}>
            <p className="module-label">
              <span className="module-led" aria-hidden="true" />
              <span>{group.module}</span>
            </p>
            {lines}
          </div>
        )
      })}
    </>
  )
}
