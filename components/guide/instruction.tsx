import { Fragment } from 'react'
import type { ReactNode } from 'react'
import type { Cite, Provenance, ResolvedParam } from '@/lib/core'
import { GUIDE_PHASES } from '@/lib/core'
import { citeLines, num, rangeText, valueParts } from './format'

/**
 * §8.1's layout primitive, and the reason this view is not converted Markdown.
 *
 * "Toggling must not reflow the page — this is read at the machine, mid-task." So the hint
 * column is reserved *structurally*, whether or not a hint exists, and the toggle changes
 * `visibility` and nothing else. A reserved-but-empty cell has no Markdown expression, which is
 * exactly why #33 forbids rendering this view through Markdown.
 *
 * Below the narrow breakpoint the cell becomes a second grid row with a fixed height, so the
 * same promise holds on a phone — see `.instruction` in `app/globals.css`.
 *
 * Citations and notes are *not* in that cell. A citation is the guide's evidence and is not
 * something a reader turns off to go faster (§8.1's three kinds are suppressible independently);
 * it sits under the instruction, in the main column, always visible and visually subordinate.
 */
export type InstructionProps = {
  children: ReactNode
  /** Already resolved through the device's `hints` table by the caller. */
  hint?: string
  cites?: readonly string[]
  note?: string
}

export function Instruction({ children, hint, cites, note }: InstructionProps) {
  return (
    <div className="instruction">
      <div className="instruction-main">
        <div className="instruction-line">{children}</div>
        {note === undefined ? null : <p className="subordinate note">{note}</p>}
        {(cites ?? []).map((cite) => (
          <p className="subordinate cite" key={cite}>
            {cite}
          </p>
        ))}
      </div>
      {/* Always rendered. The column exists whether or not there is anything in it. */}
      <p className="hint">{hint}</p>
    </div>
  )
}

/**
 * The mark, and it marks the **positive** claim — the same rule as the Markdown sibling's
 * `provenanceText`, in ink instead of words.
 *
 * An unmarked value is a starting point. That is what this guide is, and a patch sheet has
 * always been starting points, so it needs no annotation and gets none: no glyph, no quieter
 * badge, nothing. What earns a mark is the notable fact — *this number came off the manual* —
 * because that is the one that changes what a reader does with it. `cite.kind` is therefore the
 * mark itself, since §3.2 keeps `manual` and `observed` as a real distinction.
 *
 * A mood move names its knob whether or not the point underneath was cited: the move is a fact
 * about the value, not a claim about its authority, and §3.2 still refuses to let a provisional
 * point inherit any from having been moved.
 *
 * Nothing about provenance is weakened here. `ResolvedParam.provenance` is non-optional
 * (invariant 4 is a type guarantee) and the audit script still counts provisional points; this
 * is which of the three states the page bothers to name, and nothing else.
 */
export function ProvenanceMark({ provenance }: { provenance: Provenance }) {
  const axes =
    provenance.state === 'derived'
      ? provenance.axes
      : provenance.state === 'provisional'
        ? (provenance.axes ?? [])
        : []

  return (
    <>
      {provenance.state === 'provisional' ? null : (
        <span className="prov prov-cited" title={provenance.cite.source}>
          {provenance.cite.kind}
        </span>
      )}
      {axes.length === 0 ? null : (
        <span className="prov prov-moved">moved by {axes.join(', ')}</span>
      )}
    </>
  )
}

/**
 * The value itself. Monospace, always (§10: values must be visually distinct from prose
 * throughout, and one face for both is forbidden).
 *
 * `52 → 45` renders as two spans rather than one string so the starting point can be struck
 * back visually while the number you actually dial stays the loudest thing on the line.
 */
export function Value({ param }: { param: ResolvedParam }) {
  const parts = valueParts(param)
  return (
    <span className="value">
      {parts.from === undefined ? null : (
        <>
          <span className="value-from mono">{parts.from}</span>
          <span className="value-arrow" aria-hidden="true">
            →
          </span>
        </>
      )}
      <span className="value-now mono">{parts.now}</span>
      {param.unit === undefined ? null : <span className="value-unit mono">{param.unit}</span>}
      {param.range === undefined ? null : (
        <span className="value-range mono">({rangeText(param.range, param.unit)})</span>
      )}
    </span>
  )
}

/**
 * One parameter, as a whole instruction: name, value, provenance, evidence, hint.
 *
 * `ResolvedParam.provenance` is non-optional, so there is no unmarked case for this to fall
 * through to (invariant 4) — every value on the page carries where it came from.
 */
export function ParamLine({
  param,
  hint,
  hoisted,
}: {
  param: ResolvedParam
  hint?: string
  /** The recipe's shared range citation, already printed under its heading. */
  hoisted?: Cite
}) {
  return (
    <Instruction
      cites={citeLines(param.provenance, param.range, hoisted)}
      {...(param.note === undefined ? {} : { note: param.note })}
      {...(hint === undefined ? {} : { hint })}
    >
      <span className="param-name">{param.name}</span>
      <Value param={param} />
      <ProvenanceMark provenance={param.provenance} />
    </Instruction>
  )
}

/** A plain instruction whose value is a number the reader types somewhere. */
export function Steps({ steps }: { steps: readonly number[] }) {
  return <span className="mono">{steps.map(num).join(', ')}</span>
}

/**
 * A run of short inline tokens, with the separator in the **markup**.
 *
 * The arrangement list rendered `kickclapclosed-hatopen-hat` because its tokens were adjacent
 * spans in a block container, relying on a flex gap that container did not have. A separator
 * that lives in CSS is a separator that can vanish when a rule elsewhere changes, and the
 * failure is silent and only visible on the page. This one cannot vanish.
 */
export function TokenList({
  items,
  className,
}: {
  items: readonly { key: string; text: string }[]
  className?: string
}) {
  return (
    <span className="token-list">
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i === 0 ? null : <span className="token-sep">, </span>}
          <span className={className}>{item.text}</span>
        </Fragment>
      ))}
    </span>
  )
}

/**
 * Derived from `GUIDE_PHASES` rather than written as `#phase-6`, so it cannot drift if the
 * list ever changes — §8 forbids reordering, but a hard-coded anchor would break silently and
 * a derived one breaks at the type level.
 */
const SOUND_DESIGN_ANCHOR = `#phase-${GUIDE_PHASES.indexOf('Sound design') + 1}`

/**
 * §8 puts Hook and Step programming before Sound design on purpose — write the line, then
 * design the sound that plays it. The cost is that a reader stopping at either phase has no
 * indication the sound exists at all, and reasonably concludes it is missing. The recipe title
 * already describes the sound, so naming it costs one line and duplicates no parameter value.
 *
 * The link matters more here than in the Markdown: on a phone, "see Sound design" when Sound
 * design is two thousand pixels further down is not much of a pointer.
 */
export function SoundRef({ title, perBox = false }: { title: string; perBox?: boolean }) {
  return (
    <p className="sound-ref">
      <strong>{title}</strong> — settings in <a href={SOUND_DESIGN_ANCHOR}>Sound design</a>
      {/* §12.4: a stacked part has one entry per voice down there, and a reader told
          "settings in Sound design" who finds three would not know which was theirs. */}
      {perBox ? ', one entry per box' : ''}
    </p>
  )
}
