import type {
  BoundArticulation,
  Device,
  DeviceId,
  Pattern,
  PatternHit,
  ResolveResult,
  ResolvedAssignment,
  SectionName,
} from '@/lib/core'
import { citeLines, hintText, num } from './format'
import { Instruction, ProvenanceMark, SoundRef } from './instruction'

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
 * Sections that program identically, merged into one block.
 *
 * A continuous part in a six-section template repeated its grid, its slot list and its
 * articulation six times — the same sixteen steps, six times, under six headings. At the machine
 * that is not thoroughness, it is a page you scroll past, and the repetition hides the sections
 * that genuinely differ. Merged by identity of the *instruction*, not by pattern id: two
 * sections agreeing on a variant but disagreeing on the band it fell back from are not the same
 * instruction. First-appearance order is kept, so §8's reading order is unchanged.
 */
function mergeBlocks(a: ResolvedAssignment): Block[] {
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

function BlockBody({
  a,
  block,
  device,
}: {
  a: ResolvedAssignment
  block: Block
  device: Device | undefined
}) {
  const { selection } = block.entry
  if (selection.outcome === 'none') {
    return (
      <p className="quiet">
        No pattern is authored for <span className="mono">{a.role}</span> at any band (asked for
        band <span className="mono">{num(selection.band)}</span>). Nothing is programmed here.
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
            <span className="mono">
              {hits
                .map((h) =>
                  h.velocity === undefined ? num(h.step) : `${num(h.step)} (vel ${num(h.velocity)})`,
                )
                .join(', ')}
            </span>
          </li>
        ))}
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

/** §8 phase 5. The selected template variant per part, with this device's articulation bound. */
export function PhaseSteps({
  result,
  deviceById,
}: {
  result: ResolveResult
  deviceById: Map<DeviceId, Device>
}) {
  if (result.assignments.length === 0) {
    return <p className="quiet">No part was assigned, so there is nothing to program.</p>
  }

  return (
    <>
      {result.assignments.map((a) => (
        <section className="part" key={a.requestId}>
          <h4>
            <span className="role mono">{a.role}</span>
            <span className="token-sep">—</span>
            <span className="quiet">
              {a.deviceName} · {a.assignable.label}
            </span>
          </h4>
          {/* Same reason as the hook phase: this one says what to play, not what it sounds
              like, so a reader stopping here would think the sound was missing. */}
          <SoundRef title={a.recipe.title} />
          {mergeBlocks(a).map((block) => (
            <div className="block" key={block.sections.join(',')}>
              <h5>{block.sections.join(', ')}</h5>
              <BlockBody a={a} block={block} device={deviceById.get(a.deviceId)} />
            </div>
          ))}
        </section>
      ))}
    </>
  )
}
