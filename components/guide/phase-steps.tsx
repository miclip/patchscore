import type {
  BoundArticulation,
  Device,
  DeviceId,
  Pattern,
  PatternHit,
  ResolveResult,
  ResolvedAssignment,
  SectionChain,
  SectionName,
} from '@/lib/core'
import {
  STEPS_PER_BAR,
  chainPlan,
  isSustainedPart,
  noteInstruction,
  patternDriver,
  patternEntryNotice,
  reStrikesHeldNote,
  tightestReStrike,
} from '@/lib/core'
import { citeLines, citeText, count, hintText, num, voicesLabel } from './format'
import {
  HookRef,
  Instruction,
  ProvenanceMark,
  ReArticulationRef,
  SoundRef,
  EnteredElsewhereRef,
  SustainedRef,
} from './instruction'

const ROW = 16

/**
 * The pattern as a grid, in rows of sixteen steps grouped in fours. A 64-step variant is four
 * rows of the shape a box's screen shows, not one line that wraps somewhere different on every
 * reader's phone.
 *
 * In its own `overflow-x: auto` container (#21): sixteen fixed-width cells do not fit 390px, and
 * a grid that reflows is a grid whose step numbers stop lining up with the box in front of you.
 */
function StepGrid({ pattern }: { pattern: Pattern }) {
  const hit = new Set(pattern.hits.map((h) => h.step))
  const rows: { start: number; steps: number[] }[] = []
  for (let start = 1; start <= pattern.length; start += ROW) {
    const steps: number[] = []
    for (let step = start; step < start + ROW && step <= pattern.length; step++) steps.push(step)
    rows.push({ start, steps })
  }

  return (
    <div className="table-scroll">
      <div className="step-grid mono" role="img" aria-label={`${num(pattern.hits.length)} hits over ${num(pattern.length)} steps`}>
        {rows.map((row) => (
          <div className="step-row" key={row.start}>
            <span className="step-index">{num(row.start)}</span>
            {row.steps.map((step) => (
              <span
                key={step}
                className={[
                  'step',
                  hit.has(step) ? 'on' : '',
                  (step - row.start) % 4 === 0 ? 'beat' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Hits by slot, in the order the slots first appear in the authored pattern. */
function slotGroups(pattern: Pattern): { slot: PatternHit['slot']; hits: PatternHit[] }[] {
  const bySlot = new Map<PatternHit['slot'], PatternHit[]>()
  for (const h of pattern.hits) {
    const existing = bySlot.get(h.slot)
    if (existing === undefined) bySlot.set(h.slot, [h])
    else existing.push(h)
  }
  return [...bySlot].map(([slot, hits]) => ({ slot, hits }))
}

function Articulation({
  entries,
  device,
}: {
  entries: readonly BoundArticulation[]
  device: Device | undefined
}) {
  return (
    <ul className="articulation">
      {entries.map((entry) => {
        const hint = entry.hint === undefined ? undefined : hintText(device, entry.hint)
        return (
          <li key={`${entry.slot}-${entry.steps.join('.')}`}>
            <Instruction
              cites={citeLines(entry.provenance, undefined)}
              {...(hint === undefined ? {} : { hint })}
            >
              <span className="mono slot">{entry.slot}</span>
              <span className="arrow" aria-hidden="true">
                →
              </span>
              {Object.entries(entry.set).map(([key, value]) => (
                <span className="set" key={key}>
                  <span className="mono param-name">{key}</span>
                  <span className="mono value-now">
                    {typeof value === 'string' ? value : String(value)}
                  </span>
                </span>
              ))}
              <span className="quiet">
                on step{entry.steps.length === 1 ? '' : 's'}{' '}
                <span className="mono">{entry.steps.map(num).join(', ')}</span>
              </span>
              <ProvenanceMark provenance={entry.provenance} />
            </Instruction>
          </li>
        )
      })}
    </ul>
  )
}

type Block = { sections: SectionName[]; entry: ResolvedAssignment['patterns'][number] }

/**
 * One slot's hits as steps, with a shared velocity hoisted to the end: `2, 4, 6, 8 (all vel 42)`
 * rather than eight copies of `(vel 42)`. The Markdown sibling words it the same way — a band-3
 * ghost slot is eight sixteenths, and per-hit it wraps three times on a phone (§10).
 */
function slotSteps(hits: readonly PatternHit[]): string {
  const first = hits[0] as PatternHit
  const uniform =
    hits.length > 1 &&
    first.velocity !== undefined &&
    hits.every((h) => h.velocity === first.velocity)
  if (uniform) {
    return `${hits.map((h) => num(h.step)).join(', ')} (all vel ${num(first.velocity as number)})`
  }
  return hits
    .map((h) => (h.velocity === undefined ? num(h.step) : `${num(h.step)} (vel ${num(h.velocity)})`))
    .join(', ')
}

/**
 * Sections that program identically, merged into one block.
 *
 * A continuous part in a six-section template repeated its grid, its slot list and its
 * articulation six times — the same sixteen steps, six times, under six headings. At the machine
 * that is not thoroughness, it is a page you scroll past, and the repetition hides the sections
 * that genuinely differ. Merged by identity of the *instruction*, not by pattern id: two
 * sections agreeing on a variant but disagreeing on the band it fell back from are not the same
 * instruction. First-appearance order is kept, so §8's reading order is unchanged.
 *
 * Exported for the view test: what the page renders as one heading is this grouping, not
 * `a.sections`, and a test that assumed the two were the same would silently stop checking
 * separators the moment a template spanned more than one band (§6.3).
 */
export function mergeBlocks(a: ResolvedAssignment): Block[] {
  // #100 and its second half (§4.3). A part whose hook is its rhythm has no blocks at all: a
  // variant was selected for it (the band it asks for is what the arrangement phase reads) but
  // none of it is played, so there is nothing here to merge and nothing to draw.
  //
  // Unless the direction says the variants re-articulate the hook, in which case the grid *is*
  // played — it is where the held note is struck again — and suppressing it is what left the
  // density knob changing nothing a listener could hear on those parts.
  if (a.hookAuthority !== undefined && !a.reArticulatesHook) return []
  // §4.2. And a part whose role is held rather than struck has none either: an empty grid is not
  // a hole in the direction, so the block that would have said "no pattern authored" is dropped
  // and `SustainedRef` says what the part is instead. Kept in step with the Markdown sibling's
  // `phaseSteps`, which suppresses on the same condition.
  if (isSustainedPart(a)) return []
  const merged = new Map<string, Block>()
  for (const entry of a.patterns) {
    const s = entry.selection
    const articulation = entry.articulation
      .map((x) => `${x.slot}|${x.steps.join('.')}|${JSON.stringify(x.set)}|${x.hint ?? ''}`)
      .join(';')
    const key =
      s.outcome === 'none'
        ? `none:${num(s.band)}`
        : `${s.pattern.id}:${num(s.band)}:${num(s.usedBand)}:${articulation}`
    const existing = merged.get(key)
    if (existing === undefined) merged.set(key, { sections: [entry.section], entry })
    else existing.sections.push(entry.section)
  }
  return [...merged.values()]
}

/**
 * #155. **The tightest re-strike this map contains, at this guide's tempo.**
 *
 * See `reStrikeLines` in `lib/core/render.ts` for why this is stated and never enforced: a
 * device's envelope must not cap a direction's strike rate (#143, invariant 3), so this names no
 * device and no parameter and leaves the reader holding both halves to decide which to move.
 *
 * Only where the map re-strikes a held note — `reStrikesHeldNote`, the same predicate the
 * Markdown sibling uses, so the two cannot come to different readings of a two-part condition.
 * See it for why an unresolved hook is excluded, and the Markdown sibling for why a drum map is.
 *
 * Renders nothing when the map has no re-strike to measure — one strike has no interval, so
 * there is no value being withheld (invariant 5).
 */
function ReStrike({
  pattern,
  bpm,
  reArticulates,
}: {
  pattern: Pattern
  bpm: number
  reArticulates: boolean
}) {
  if (!reArticulates) return null
  const tightest = tightestReStrike(pattern, bpm)
  if (tightest === undefined) return null
  return (
    <li>
      <span className="slot">tightest re-strike</span>
      <span className="token-sep">—</span>
      <span className="mono">{num(tightest.seconds)} Sec</span>
      <span className="quiet">
        · derived from {count(tightest.steps, 'step')} at {num(bpm)} BPM
      </span>
    </li>
  )
}

function BlockBody({
  a,
  block,
  device,
  bpm,
}: {
  a: ResolvedAssignment
  block: Block
  device: Device | undefined
  bpm: number
}) {
  const { selection } = block.entry
  if (selection.outcome === 'none') {
    return (
      <p className="quiet">
        No pattern authored for <span className="mono">{a.role}</span> at any band (asked for band{' '}
        <span className="mono">{num(selection.band)}</span>).
      </p>
    )
  }

  return (
    <>
      {/* No pattern id: template-internal. The two facts that carry meaning here are how
          long the variant is and which band it came from. */}
      <p className="block-head">
        <span className="steps-count mono">{num(selection.pattern.length)} steps</span>
        {/* §6.3's fallback is reported, never silent: a knob that visibly does nothing is a
            bug report waiting to happen. */}
        <span className={selection.outcome === 'fallback' ? 'band-fallback' : 'quiet'}>
          {selection.outcome === 'fallback'
            ? `band ${num(selection.usedBand)} — nothing authored at band ${num(selection.band)}`
            : `band ${num(selection.usedBand)}`}
        </span>
      </p>

      <StepGrid pattern={selection.pattern} />

      <ul className="slots">
        {slotGroups(selection.pattern).map(({ slot, hits }) => (
          <li key={slot}>
            <span className="mono slot">{slot}</span>
            <span className="token-sep">—</span>
            <span className="mono">{slotSteps(hits)}</span>
          </li>
        ))}
        {/* #155. The arithmetic the guide was leaving to the reader. Worded exactly as the
            Markdown sibling words it — two wordings of one claim are two chances to be wrong —
            and inside the same list, because it is another fact about this map. */}
        <ReStrike
          pattern={selection.pattern}
          bpm={bpm}
          reArticulates={reStrikesHeldNote(a)}
        />
      </ul>

      {block.entry.articulation.length === 0 ? null : (
        <>
          {/* Labelled, because a bare second list under the slot list reads as more of the
              same list — and it is not: these are the device's settings, not the steps. */}
          <h6>On this box — {a.deviceName}</h6>
          <Articulation entries={block.entry.articulation} device={device} />
        </>
      )}
    </>
  )
}

/**
 * #105. How one out-of-phase section is chained, in the order it is built.
 *
 * `full === 0` is its own sentence rather than "0 copies": a 9-bar section against a 16-bar hook
 * is one copy stopped early, and no arithmetic makes that a repeat count. Worded as the Markdown
 * sibling words it — the claim is about the box in front of somebody, and two wordings of it
 * would be two chances to be wrong.
 */
function chainText(chain: SectionChain): string {
  if (chain.full === 0) return `one copy cut to ${count(chain.remainder, 'bar')}`
  const copies =
    chain.full === 1
      ? `1 copy of ${count(chain.unitBars, 'bar')}`
      : `${num(chain.full)} copies of ${count(chain.unitBars, 'bar')}`
  return `${copies}, then one cut to ${count(chain.remainder, 'bar')}`
}

/**
 * #105's standing note, once at the top of the phase — the placement §8 gives phase 4's note
 * conventions, and for the same reason: a paragraph repeated under twelve parts is a paragraph
 * nobody reads under any of them.
 *
 * It says *deliberate* in as many words. Drone Study's sections are 9, 15, 21, 33, 18, 24 and 12
 * bars against a 16-bar cycle, and that is the template's arrangement — out-of-phase boundaries
 * are "what stops 132 bars of one note reading as a loop". Without this the numbers read as an
 * arithmetic bug, and the reader's fix — rounding to 8 or 16 — would delete the arrangement.
 */
function OutOfPhase() {
  return (
    <p className="out-of-phase">
      <strong>Not every section is a whole number of repeats, and that is deliberate.</strong> The
      template puts section boundaries out of phase with the pattern and the harmonic cycle on
      purpose, so the guide prints the lengths it was given and rounds nothing. In Song mode, chain
      full copies and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1.
    </p>
  )
}

/** The sections one part cannot fill with whole copies. Nothing when they all divide. */
function ChainPlan({ plan }: { plan: readonly SectionChain[] }) {
  if (plan.length === 0) return null
  return (
    <ul className="chain-plan">
      {plan.map((chain) => (
        <li key={chain.section}>
          <strong>{chain.section}</strong>
          {/* Separators are markup, never a CSS gap: a gap is invisible to a screen reader, to
              a copy-paste and to a test, which is how `kickclap` reached the page once. */}
          <span className="token-sep">·</span>
          <span className="mono">{count(chain.bars, 'bar')}</span>
          <span className="token-sep">—</span>
          <span className="quiet">{chainText(chain)}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Which of the two pointers a deferred part gets (§4.3). A re-articulating part whose every
 * section came back `none` has no map to describe, so it falls back to the plain pointer rather
 * than to a sentence about a grid that is not there (invariant 5).
 */
function HookPointer({ a }: { a: ResolvedAssignment }) {
  const first = a.patterns.find((p) => p.selection.outcome !== 'none')?.selection
  if (!a.reArticulatesHook || first === undefined || first.outcome === 'none') return <HookRef />
  return <ReArticulationRef bars={first.pattern.length / STEPS_PER_BAR} />
}

/**
 * §4.1/§2.1/#334. **Which note to place**, above the grid that says where.
 *
 * The decision is `noteInstruction`'s, not this renderer's — the Markdown sibling asks the same
 * function and gets the same answer, per #33. What is written twice is the ink, and the two arms
 * take different ink because they are different claims: a pitch is the direction's musical
 * decision and carries no citation, where a trigger note is a cited fact about the box and
 * always carries its provenance the way every other hardware value on this page does — always,
 * because §2.1 refuses to let an uncited one be authored.
 *
 * The citation is *visible* rather than only in the mark's title, for the reason phase 3's are: a
 * reader on a phone at the rack has no hover.
 */
function NoteLine({ a }: { a: ResolvedAssignment }) {
  const note = noteInstruction(a)
  if (note.kind === 'none') return null
  if (note.kind === 'pitch') {
    return (
      <p className="sound-ref">
        <strong>Note</strong> — <span className="mono">{note.note}</span>
        <span className="quiet"> · MIDI {num(note.midi)}</span>
      </p>
    )
  }
  return (
    <>
      <p className="sound-ref">
        <strong>Trigger note</strong> — <span className="mono">{note.note}</span>
        {/*
          Bare. `C5` is where the sample plays as recorded, not the only note the voice answers
          to — every other note plays it transposed — so a gloss would claim more than the
          citation supports.
        */}
        <span className="quiet"> · MIDI {num(note.midi)}</span>{' '}
        {/*
          One arm only: §2.1 admits no uncited trigger note, so there is always a kind to draw
          and always a page beneath it.
        */}
        <span className="prov prov-cited" title={note.verified.source}>
          {note.verified.kind}
        </span>
      </p>
      <p className="subordinate cite">{citeText(note.verified)}</p>
    </>
  )
}

/** §8 phase 5. The selected template variant per part, with this device's articulation bound. */
export function PhaseSteps({
  result,
  deviceById,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
}) {
  if (result.assignments.length === 0) {
    return <p className="quiet">No parts assigned.</p>
  }

  const plans = new Map(result.assignments.map((a) => [a.requestId, chainPlan(result, a)]))

  return (
    <>
      {[...plans.values()].some((plan) => plan.length > 0) ? <OutOfPhase /> : null}
      {result.assignments.map((a) => (
        <section className="part" key={a.requestId}>
          <h4>
            <span className="role mono">{a.role}</span>
            <span className="token-sep">—</span>
            <span className="quiet">
              {a.deviceName} · {voicesLabel(a)}
            </span>
          </h4>
          {/*
           * Same reason as the hook phase: this one says what to play, not what it sounds like,
           * so a reader stopping here would think the sound was missing.
           *
           * **Except where this phase is only a pointer at that one.** A part whose hook is its
           * rhythm gets `HookPointer` and no grid, and the hook phase printed this exact sentence
           * a few lines above. A reader being sent to Hook cannot conclude the sound is missing,
           * because Hook is where the title is — so the two sections read as one block printed
           * twice, which is how it looked on a phone.
           */}
          {a.hookAuthority === undefined ? <SoundRef title={a.recipe.title} /> : null}
          {a.hookAuthority !== undefined ? (
            <HookPointer a={a} />
          ) : isSustainedPart(a) ? (
            <SustainedRef />
          ) : null}
          <NoteLine a={a} />
          {/*
            §8/#65. Qualifies the grid below rather than replacing it — so it is keyed on whether
            a grid is suppressed, not on which sentence printed above it.

            It used to be the last arm of that ternary, which put it out of reach of a
            re-articulating part (§4.3): those take `HookPointer` and *still print a grid*, so on
            a box with no sequencer the guide told a reader to program steps on a machine that
            cannot hold them — the instruction #65 removed, through a path #65 predates. The
            Markdown sibling had the identical fault in the identical shape (#33: one decision,
            two vocabularies — including, it turns out, one bug twice).
          */}
          {(a.hookAuthority !== undefined && !a.reArticulatesHook) || isSustainedPart(a)
            ? null
            : (() => {
                const entry = patternEntryNotice(deviceById.get(a.deviceId))
                return entry === undefined ? null : (
                  <EnteredElsewhereRef
                    reason={entry.reason}
                    driver={patternDriver(result.interDevicePatch, a.deviceId)}
                  />
                )
              })()}
          {mergeBlocks(a).map((block) => (
            <div className="block" key={block.sections.join(',')}>
              <h5>{block.sections.join(', ')}</h5>
              <BlockBody
                a={a}
                block={block}
                device={deviceById.get(a.deviceId)}
                bpm={result.song.bpm}
              />
            </div>
          ))}
          {/* #105. After the programming, hooked or not: it is how what was just described gets
              chained over the arrangement, so it cannot come before the thing being chained. */}
          <ChainPlan plan={plans.get(a.requestId) ?? []} />
        </section>
      ))}
    </>
  )
}
