import { Fragment } from 'react'
import type { PatternDriver } from '@/lib/core'
import type { ReactNode } from 'react'
import type { CapabilityEvidence, Cite, Provenance, ResolvedParam } from '@/lib/core'
import { GUIDE_PHASES } from '@/lib/core'
import { citeLines, citeText, count, num, rangeText, valueParts } from './format'

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
 * §2.6/#22. The mark for a **capability fact** — a socket, a menu path — which carries a
 * `CapabilityEvidence` rather than a resolved provenance and has a third state.
 *
 * **Every state is marked here, unlike `ProvenanceMark` above, and that is the same rule applied
 * rather than an exception to it.** A parameter goes unmarked when it is provisional because
 * nine values in ten are, so a mark on all of them carries nothing. A rig prints a handful of
 * capability facts and every one of them is cited today, which makes `unchecked` and
 * `undocumented` the notable states — the ones that change what a reader does. "Patch MIDI IN"
 * from a box whose rear panel nobody has read is worth a word.
 *
 * The two quiet states are not interchangeable and are not drawn alike. `unchecked` is work
 * nobody has done. `undocumented` is work somebody finished: they went to the manual and it is
 * silent, which is the more expensive thing to know and the reason it carries a reason.
 *
 * Written here rather than shared with the Markdown renderer, like every other rendering decision
 * under `components/guide/` — one right answer to *which evidence*, two hand-written vocabularies
 * around it.
 */
export function EvidenceMark({ evidence }: { evidence: CapabilityEvidence }) {
  if (evidence === false) return <span className="prov prov-unchecked">unchecked</span>
  if (evidence.kind === 'unknown') {
    return (
      <span className="prov prov-undocumented" title={evidence.reason}>
        undocumented
      </span>
    )
  }
  // §2.6/#120/#121. Their own ink, which #120 deliberately left to this issue. They are not two
  // spellings of `undocumented`: `unread` is work blocked on a *file* nobody here can unblock by
  // reading harder, and `cited-against` is the one non-claim with a page — the document answers,
  // and answers no. Drawing all three the same made the strongest of them look like the weakest.
  if (evidence.kind === 'unread') {
    return (
      <span className="prov prov-unread" title={evidence.reason}>
        unread
      </span>
    )
  }
  if (evidence.kind === 'cited-against') {
    return (
      <span className="prov prov-cited-against" title={`${evidence.cite.source} — ${evidence.reason}`}>
        cited against
      </span>
    )
  }
  /*
   * §2.6/#236. Its own mark rather than borrowing the cited one: a reader who sees `manual` will
   * take the whole fact as documented, which is the overclaim this state exists to avoid. The
   * title carries the page, what it proves and what it leaves open — the three things that make
   * this different from a citation.
   */
  if (evidence.kind === 'partly') {
    return (
      <span
        className="prov prov-partly"
        title={`${evidence.cite.source} — ${evidence.proven}; still open: ${evidence.open}`}
      >
        partly cited
      </span>
    )
  }
  return (
    <span className="prov prov-cited" title={evidence.source}>
      {evidence.kind}
    </span>
  )
}

/**
 * The subordinate lines one piece of capability evidence earns. A citation names its page; an
 * `undocumented` fact states what the manual does not say, because a bare "undocumented" is the
 * shrug §2.6 refuses; an unchecked fact has nothing to add that the mark did not already say.
 *
 * `label` is what the citation is a citation *of* (#121). "value" is a lie on some of them:
 * `clock.preferredSource` is a claim about the box's job and nobody dials it. Defaulted, so every
 * caller that was naming a value keeps the word it had.
 */
export function evidenceLines(evidence: CapabilityEvidence, label = 'value'): string[] {
  if (evidence === false) return []
  switch (evidence.kind) {
    case 'unknown':
      return [`undocumented — ${evidence.reason}`]
    case 'unread':
      return [`unread — ${evidence.reason}`]
    case 'cited-against':
      return [`cited-against ${citeText(evidence.cite)} — ${evidence.reason}`]
    // §2.6/#236. Page first — the part a reader can check — then what it leaves open, which is
    // what they would otherwise assume the page covered.
    case 'partly':
      return [
        `partly ${citeText(evidence.cite)} — ${evidence.proven}`,
        `still open — ${evidence.open}`,
      ]
    default:
      return [`${label} ${citeText(evidence)}`]
  }
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

/** Derived for the same reason `SOUND_DESIGN_ANCHOR` is. */
const HOOK_ANCHOR = `#phase-${GUIDE_PHASES.indexOf('Hook') + 1}`

/**
 * §8 puts Hook and Step programming before Sound design on purpose — write the line, then
 * design the sound that plays it. The cost is that a reader stopping at either phase has no
 * indication the sound exists at all, and reasonably concludes it is missing. The recipe title
 * already describes the sound, so naming it costs one line and duplicates no parameter value.
 *
 * The link matters more here than in the Markdown: on a phone, "see Sound design" when Sound
 * design is two thousand pixels further down is not much of a pointer.
 */
export function SoundRef({ title }: { title: string }) {
  return (
    <p className="sound-ref">
      <strong>{title}</strong> — settings in <a href={SOUND_DESIGN_ANCHOR}>Sound design</a>
    </p>
  )
}

/**
 * #100. Phase 5 for a part whose hook is its rhythm.
 *
 * One authority per part: where a hook resolved, it *is* the pattern, and a step grid beside it
 * was a second, contradictory instruction with nothing saying which to play. A pointer, not a
 * restatement — the same steps printed twice are the same bug one edit away.
 *
 * The link earns more here than in the Markdown for the reason `SoundRef`'s does: Hook is the
 * heading above this one on a laptop and a scroll away on the phone §10 says this is read on.
 * It names no hook id, because phase 4 names none either.
 */
export function HookRef() {
  return (
    // `sound-ref` for the styling, which is right for it — both are one-line pointers out of the
    // phase — and its own name beside it, because it points somewhere else entirely.
    <p className="sound-ref hook-ref">
      {/*
        #142: "steps and note lengths" was true of a piano roll and false of a tracker, where
        phase 4 prints no lengths because the box has no field for them.
      */}
      <strong>The hook is the pattern</strong> — see <a href={HOOK_ANCHOR}>Hook</a> for its steps
      and what each one carries. Nothing separate to program here.
    </p>
  )
}

/**
 * §4.2/invariant 5. The sibling of `HookRef` for a part whose *role* does not bear a pattern
 * (`NON_PATTERN_BEARING_ROLES`) and whose hook did not resolve, so there is nothing to point at.
 *
 * Worded as `SUSTAINED_NOT_STRUCK` in `lib/core/render.ts` words it, and carrying no link for the
 * same reason it carries no hook id: a pointer to a Hook section that has nothing for this part
 * is the false trail this replaced, not an improvement on it.
 */
export function SustainedRef() {
  return (
    <p className="sound-ref hook-ref">
      <strong>Held, not struck</strong> — this part sustains rather than repeating a figure, so the
      direction authors no grid for it. Nothing to program here.
    </p>
  )
}

/**
 * §8/#65. The sibling of `SustainedRef` for a part on a box that cannot hold a pattern, worded as
 * `patternEnteredElsewhere` in `lib/core/render.ts` words it.
 *
 * Unlike `SustainedRef` the grid still follows this, because the figure is real and the reader
 * still has to program it. What was wrong was never the grid, only the unstated assumption about
 * which box it goes on.
 */
export function EnteredElsewhereRef({
  reason,
  driver,
}: {
  reason: string
  /** §8/#65. The one verdict, decided in `patternDriver` so both renderers agree (#33). */
  driver: PatternDriver
}) {
  return (
    <p className="sound-ref hook-ref">
      <strong>Not programmed here</strong> — {reason}. {driverText(driver)}
    </p>
  )
}

/** This renderer's own words for `patternDriver`'s four states; see `lib/core/render.ts`. */
function driverText(driver: PatternDriver) {
  switch (driver.state) {
    case 'driven':
      return (
        <>
          Enter this figure on the {driver.deviceName}, which drives it through{' '}
          <code>{driver.pitchJack}</code> and <code>{driver.gateJack}</code>.
        </>
      )
    case 'nothing-drives':
      return (
        <>
          <strong>Nothing in this rig can drive it</strong> — no box here sends a note and a gate.
        </>
      )
    case 'source-exhausted':
      return (
        <>
          The {driver.deviceName} drives this rig and has no pitch-and-gate pair left for this box,
          so it stays unpatched.
        </>
      )
    default:
      return <>Enter this figure on whatever is driving it; the rig diagram shows what that is.</>
  }
}

/**
 * §4.3/§8. The sibling of `HookRef` for a part whose direction says its variants re-articulate the
 * hook (`RoleRequest.reArticulatesHook`): the hook owns which note and how long, the grid below
 * owns where it is lifted and struck again. Two authorities, one sentence, nothing restated — so
 * unlike `HookRef` this one is followed by the grid rather than replacing it.
 *
 * Worded as the Markdown sibling words it, including the bar length and the note about what the
 * chain plan counts: the claim is about the box in front of somebody, and two wordings of it
 * would be two chances to be wrong.
 */
export function ReArticulationRef({ bars }: { bars: number }) {
  return (
    <p className="sound-ref hook-ref">
      <strong>The hook is the notes; the steps below are where they are struck again</strong> — see{' '}
      <a href={HOOK_ANCHOR}>Hook</a> for what to play and how long each note is held. This map is{' '}
      {count(bars, 'bar')} long and repeats inside the hook; the chain lengths below are counted in
      the hook.
    </p>
  )
}
