import { Fragment, useContext } from 'react'
import type { PatternDriver, TrigPlacement } from '@/lib/core'
import type { ReactNode } from 'react'
import type { ResolvedParam } from '@/lib/core'
import { modulationEndParts, paramLabel } from '@/lib/core'
import { ModulationMark } from '@/components/modulation-mark'
import { GuideNavContext } from './nav'
import { count, num, rangeText, valueParts } from './format'

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
 * Notes are *not* in that cell. An authored note is part of the instruction rather than a jog
 * you outgrow, so it is not something a reader turns off to go faster; it sits under the
 * instruction, in the main column, always visible and visually subordinate.
 *
 * There is no `cites` any more. The guide prints no citations at all — see `render.ts`'s note on
 * the convention, and the block below on what does and does not render one instead.
 */
export type InstructionProps = {
  children: ReactNode
  /** Already resolved through the device's `hints` table by the caller. */
  hint?: string
  note?: string
  /** #511. Where a routing's depth does nothing. Typed, so it is never a note somebody forgot. */
  neutral?: string
}

export function Instruction({ children, hint, note, neutral }: InstructionProps) {
  return (
    <div className="instruction">
      {/*
        The grid is this row, not the whole block, and the note sits *outside* it. The hint column
        is sized to its own instruction, so anything sharing that column widens it — a long note
        inside the grid would push the hint clear of the value it annotates. Spanning both columns
        is not enough: a spanning item still contributes to the tracks it spans. Only leaving the
        grid stops it counting.
      */}
      <div className="instruction-row">
        <div className="instruction-line">{children}</div>
        {/* Always rendered. The column exists whether or not there is anything in it. */}
        <p className="hint">{hint}</p>
      </div>
      {/*
        §8.1/#511. The neutral, above the note and never suppressed. It is not a jog and not
        prose: it is where the control does nothing, and a reader handed `13` against `-50…50`
        cannot act on the line without it. Outside the grid for the reason the note is.
      */}
      {neutral === undefined ? null : <p className="subordinate neutral">{neutral}</p>}
      {note === undefined ? null : <p className="subordinate note">{note}</p>}
    </div>
  )
}

/**
 * **Nothing here is marked.** `ProvenanceMark` and `EvidenceMark` used to end a line with the
 * word its evidence earned — `manual`, `unchecked`, `undocumented`, `moved by darkness` — with
 * the page in a `title`. Both are gone, along with the `cite` lines under them.
 *
 * §8's reader is standing at a machine in bad light with both hands busy. They cannot open the
 * book, and a `title` attribute has no hover on the phone #21 designs for and no existence at all
 * on the printed page. The mark was costing a line of every reader's attention to answer a
 * question only a reader at a desk asks.
 *
 * **Provenance is still carried, and nothing renders a per-value citation now.** It is
 * non-optional on every `ResolvedParam` (invariant 4 is a type guarantee) and `npm run audit`
 * counts it; `app/devices/[id]/page.tsx` reports a box's counts, the documents its ranges cite
 * and four citations of its own — panel span, warm-up, quick tune, calibration — but not the page
 * behind one value. Do not read "it moved to the device page" as licence to put a mark back here:
 * see `DESIGN.md` §3.2 for why the repair belongs on that page instead.
 *
 * What must not happen here is a fact staying on the page after the mark that made it honest has
 * gone: an unsettled capability fact has to carry its state in its own sentence, which is what
 * `contentText` and `controlPositionText` do.
 */

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
      {/*
        §3.1/#414. **The controller, on the value line and not on a line of its own.**

        `midiCc` had no rendering of its own: the resolver appended `MIDI CC 51` to `note`, so on a
        control with nothing else to say a controller number became the whole of a NOTE row — a
        subordinate line, styled for prose, carrying a number. It is addressing information, so it
        belongs beside the value the reader is dialling rather than under it. A suffix costs no
        row, and §8's reader is standing at a machine with no rows to spare.

        **Not `mono`, and that is the point of the class.** §10 gives values one face and prose
        another; this is neither a value to dial nor a scale to read, so it takes the prose face,
        muted. Restated rather than imported from `lib/core/render.ts` — this file's standing rule
        (#33) — and one string rather than JSX text around an expression, so the rendered markup
        is a single text node the Markdown sibling can be compared against character for character.
      */}
      {param.midiCc === undefined ? null : (
        <span className="value-cc">{`· MIDI CC ${String(param.midiCc)}`}</span>
      )}
    </span>
  )
}

/**
 * One parameter, as a whole instruction: name, value, range, note, hint.
 *
 * No `hoisted` argument any more. It existed only to stop a range citation repeating under every
 * line a shared sentence above already covered, and with no citation to repeat there is nothing
 * to hoist.
 */
/**
 * §8/#511. **One end of a routing: the control to set, and what to set it to.**
 *
 * The control's name is the operating instruction and is drawn in the same `.param-name` a
 * setting's is, because that is what it is — a reader standing at the machine looks for
 * `VCO MOD SOURCE` on the panel exactly as they look for `CUTOFF`. A `stated` end has no control
 * on the parameter list, so it is a value alone.
 *
 * `modulationEndParts` is the shared decision (#33): which half is which. The markup is this
 * renderer's own, and its Markdown sibling writes `**CONTROL** \`value\`` for the same two parts.
 */
function ModulationEnd({ end }: { end: NonNullable<ResolvedParam['modulation']>['source'] }) {
  const parts = modulationEndParts(end)
  return (
    <>
      {parts.control === undefined ? null : (
        <span className="param-name">{parts.control}</span>
      )}
      <span className="mono">{parts.value}</span>
    </>
  )
}

export function ParamLine({ param, hint }: { param: ResolvedParam; hint?: string }) {
  const m = param.modulation
  return (
    <Instruction
      {...(m === undefined ? {} : { neutral: `${num(m.neutral)} is no modulation` })}
      {...(param.note === undefined ? {} : { note: param.note })}
      {...(hint === undefined ? {} : { hint })}
    >
      {/*
        §8/#511. **A routing is drawn as an assignment**, and the decision comes off
        `param.modulation` rather than out of the name. An arrow in a name is punctuation: the
        Circuit Tracks' `ENV 2 → FREQUENCY` has one and is a knob on a path the box wires, and the
        Mother-32's real routing has none. `ModulationMark` is `CableMark`'s sibling — #501 marked
        the cable and this marks the assignment — and `Modulation — ` is the same word its
        Markdown sibling prints, so `innerText` and the printed page say one thing (#33).
      */}
      {m === undefined ? null : (
        <>
          <ModulationMark />
          <span className="param-kind">Modulation — </span>
          <ModulationEnd end={m.source} />
          <span className="arrow" aria-hidden="true">
            →
          </span>
          <ModulationEnd end={m.destination} />
          {m.polarity === undefined ? null : (
            <>
              <span className="param-sep" aria-hidden="true">
                {' · '}
              </span>
              <ModulationEnd end={m.polarity} />
            </>
          )}
          <span className="param-sep" aria-hidden="true">
            {' · '}
          </span>
        </>
      )}
      {/*
        #385. The label, not the stored name: inside a box already headed `MIXER`, a row reading
        `MIXER · OSC 1` repeats it. `paramLabel` is shared with the Markdown renderer so one
        control cannot read two ways (#33), and `param.name` stays the identity — the React key
        above it, #107's hoist key, and every fixture that names a control.

        #511: on a routing the depth's own control name takes this slot where the panel gives it
        one, so the destination is said once instead of appearing in the route and again in a name
        that spells it out.
      */}
      <span className="param-name">{m?.amountControl ?? paramLabel(param)}</span>
      <Value param={param} />
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
 * §8/#341. **A pointer out of this phase, aimed by whoever is drawing the page.**
 *
 * The anchor is still derived rather than written as `#phase-6` — §8 forbids reordering, but a
 * hard-coded anchor breaks silently — and `nav.ts` does that deriving now, because under the
 * sequencer layout the answer is not a phase anchor at all. Sound design is an `h5` beside the
 * steps there, in the same box's section, and `#phase-6` names a section that layout never
 * renders.
 *
 * An ordinary anchor, and that is the whole of it: every section is on the page, so the browser's
 * own handling does the landing and copy-link, middle-click and a keyboard activation all work
 * without a handler. It carried one while the sequencer layout had tabs, to open a panel and wait
 * a frame before scrolling — `scrollIntoView` on an element that is `display: none` does nothing
 * and reads as a dead link. Nothing is hidden now, so nothing has to be opened first.
 *
 * Two states, and the second is the one invariant 5 asks for: a target that is rendered gets a
 * link, and a target nothing renders gets none. A pointer to a section with nothing in it is the
 * false trail `SustainedRef` exists to avoid, not an improvement on one.
 */
function PhaseLink({ to, children }: { to: 'hook' | 'sound'; children: ReactNode }) {
  const nav = useContext(GuideNavContext)
  const id = nav[to]
  if (id === undefined) return <>{children}</>
  return <a href={`#${id}`}>{children}</a>
}

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
      <strong>{title}</strong> — settings in <PhaseLink to="sound">Sound design</PhaseLink>
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
      <strong>The hook is the pattern</strong> — see <PhaseLink to="hook">Hook</PhaseLink> for its
      steps and what each one carries. Nothing separate to program here.
    </p>
  )
}

/**
 * §4.1/#369. **Phase 4 for a part that reads a note as a slice number**, worded as
 * `HOOK_CANNOT_APPLY_SLICED` in `lib/core/render.ts` words it (#33).
 *
 * The other sibling of `HookRef`, and the mirror of it: that one hands a part's rhythm *to* the
 * hook, this one says the hook has nothing to hand. On a Beat Slice track the hook's degrees would
 * be entered as ordinals, so a correctly spelled `G4` selects whichever slice sits twenty-odd
 * semitones up the file — right value, wrong instruction. Unlike `HookRef` a grid still follows in
 * phase 5, because the rhythm is real and the reader can enter it.
 *
 * **It offers no slice numbers and must not** (invariant 5): which slice holds which syllable is
 * in the reader's own audio, and a list of ordinals would be content the guide has never heard.
 * Sound design is not a substitute either — it sets the sample *up* for slicing and chooses no
 * slice, because on a note-addressed part the choice is the note and the note is the reader's. The
 * last sentence hands that back rather than pointing at a setting they would not find.
 *
 * Only Sound design is a link. Step programming has no anchor in `GuideNav` and inventing one for
 * this sentence would mean a new nav key both layouts have to answer for — a `sound` pointer plus
 * a named phase is what the Markdown sibling carries, and the two must read alike.
 */
export function SlicedHookRef() {
  return (
    <p className="sound-ref hook-ref">
      <strong>This part cannot play the hook.</strong> On this recipe a note picks which slice plays
      rather than sounding a pitch, so there is no note here to write. Program its rhythm in Step
      programming, and set the sample up for slicing in{' '}
      <PhaseLink to="sound">Sound design</PhaseLink>. Which slice lands on each step is yours to
      choose at the machine.
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
 * §8 phase 5/#473/#488. The sibling of `SustainedRef` for a **`riser`** or **`sweep`** whose
 * direction authored no variant for it at any band (`isSingleTrigPart`), worded as
 * `SINGLE_TRIG_HEAD` and `TRIG_PLACEMENT` in `lib/core/render.ts` word it.
 *
 * It replaces the block-per-section that used to say `No pattern authored for riser at any band
 * (asked for band 1)` under two or three headings — one absence, restated, each time beside a band
 * number that decides nothing because nothing was authored at any band. The absence is still the
 * sentence's first clause, so invariant 5 is intact; what follows it is the instruction the guide
 * can actually give.
 *
 * **Which instruction is the arrangement's answer, not this renderer's** (#488). #473 kept `sweep`
 * on the hole report because *arrives at the change* is a climb and Ambient Dub's spends 36 bars
 * walking away from one; `singleTrigPlacements` reads each occupied section's energy against its
 * successor's, so the clause follows the direction of travel and the Markdown sibling gets the
 * same answer from the same function (#33). Four clauses, because a section that leads into a
 * quieter one, a louder one, one at the same energy, and no section at all are four different
 * things to be standing in front of. A `texture` with the same emptiness still keeps the
 * band-specific hole report.
 *
 * **Two groups print their section names and one does not.** With one, the instruction is the
 * same wherever the part plays and there is nothing to tell apart — but Ambient Dub's `sweep`
 * rises out of `Swell` and falls out of `Recede`, and a reader standing in one of them has to
 * know which sentence is theirs.
 *
 * Split from `SustainedRef` because the claims are different: that one says the **role is held**
 * and drops the note line with the grid, this one says the **part is one event** — so a note line
 * may still follow, and should, because a trig is placed on a note.
 */
const TRIG_PLACEMENT: Record<TrigPlacement['travel'], string> = {
  rises: 'Place its single trig so the gesture arrives at the change.',
  // Near the opening, and it is the gesture that goes down rather than the section: the trig is
  // the onset here exactly as it is above, and no recipe has an envelope that spans 36 bars of
  // `Recede`. See `TRIG_PLACEMENT` in `lib/core/render.ts`, which this must read alike.
  falls: 'Place its single trig near the section’s opening to send the energy downward.',
  // Two neutral clauses, not one. A section that leads into one at the same energy and a section
  // that leads nowhere are different facts, and printing either as the other invents a next
  // section or an energy nobody wrote.
  level:
    'Place its single trig wherever the gesture should be heard; the section it leads into sits ' +
    'at the same energy.',
  ends:
    'Place its single trig wherever the gesture should be heard; nothing follows this section ' +
    'for it to lead into.',
}

export function SingleTrigRef({ placements }: { placements: readonly TrigPlacement[] }) {
  const head = (
    <>
      <strong>One trig, not a figure</strong> — the direction authors no grid for this part.
    </>
  )
  const only = placements.length === 1 ? placements[0] : undefined
  if (only !== undefined) {
    return (
      <p className="sound-ref hook-ref">
        {head} {TRIG_PLACEMENT[only.travel]}
      </p>
    )
  }
  return (
    <>
      <p className="sound-ref hook-ref">{head}</p>
      {/* Separators and section names are markup, never a CSS gap: a gap is invisible to a
          screen reader, to a copy-paste and to a test. */}
      <ul className="trig-placements">
        {placements.map((p) => (
          <li key={p.sections.join(',')}>
            <strong>{p.sections.join(', ')}</strong>
            <span className="token-sep">—</span>
            <span>{TRIG_PLACEMENT[p.travel]}</span>
          </li>
        ))}
      </ul>
    </>
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
      <PhaseLink to="hook">Hook</PhaseLink> for what to play and how long each note is held. This map
      is{' '}
      {count(bars, 'bar')} long and repeats inside the hook; the chain lengths below are counted in
      the hook.
    </p>
  )
}
