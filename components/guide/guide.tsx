'use client'

import { useMemo, useState } from 'react'
import type { Device, DeviceId, GuidePhase, ResolveResult } from '@/lib/core'
import type { ReactNode } from 'react'
import { GUIDE_PHASES } from '@/lib/core'
import { occupiedCounts } from './format'
import { PhaseFinishing } from './phase-finishing'
import { PhaseHook } from './phase-hook'
import { PhaseRig } from './phase-rig'
import { PhaseSong } from './phase-song'
import { PhaseSound } from './phase-sound'
import { PhaseSteps } from './phase-steps'
import { PhaseVoices } from './phase-voices'

/**
 * #33. `ResolveResult` rendered as a web page — the sibling of `lib/core/render.ts`, never a
 * conversion of its output. Markdown flattens the three things this view exists to keep: §8.1's
 * reserved hint column, §3.2's provenance rendered visually rather than as text, and #21's
 * tables that scroll inside themselves instead of stretching the page.
 *
 * **The view decides nothing** (§8's rule for its Markdown sibling, and the reason there can be
 * two of them). Every musical choice is already settled in `ResolveResult`. What this file
 * decides is ink: what is loud, what is quiet, and what is reserved-but-invisible.
 *
 * Seven phases, always, in §8's order — not "the phases that had content". A guide whose hook
 * section vanishes is indistinguishable from a genre with no hook, so an empty phase says what
 * is missing instead of disappearing (invariant 5). `GUIDE_PHASES` is imported rather than
 * restated: one list, read by the Markdown renderer, this view, and the tests.
 */
export function Guide({ result }: { result: ResolveResult }) {
  /** §8.1: on by default, off once you know your boxes. */
  const [hints, setHints] = useState(true)

  const deviceById = useMemo<Map<DeviceId, Device>>(
    () => new Map(result.devices.map((d) => [d.id, d])),
    [result],
  )
  const occupied = useMemo(() => occupiedCounts(result.assignments), [result])

  /*
   * Keyed by phase name rather than by position. An array aligned to `GUIDE_PHASES` by index
   * renders a blank section if the two ever drift; `Record<GuidePhase, ReactNode>` makes a
   * missing phase — or a renamed one — a type error instead.
   */
  const bodies: Record<GuidePhase, ReactNode> = {
    Song: <PhaseSong result={result} />,
    'Voice assignment': <PhaseVoices result={result} deviceById={deviceById} />,
    'Rig integration': <PhaseRig result={result} occupied={occupied} />,
    Hook: <PhaseHook result={result} />,
    'Step programming': <PhaseSteps result={result} deviceById={deviceById} />,
    'Sound design': <PhaseSound result={result} deviceById={deviceById} />,
    Finishing: <PhaseFinishing result={result} occupied={occupied} />,
  }

  return (
    <article className="guide" data-hints={hints ? 'on' : 'off'}>
      <header className="guide-head">
        <h2>{result.template.name}</h2>
        <label className="hints-toggle">
          <input
            type="checkbox"
            checked={hints}
            onChange={(event) => setHints(event.target.checked)}
          />
          Show hints
        </label>
      </header>

      {/*
        The one guide-level explanation of provenance. Stated once here so the marks on the page
        can be compact: a sentence saying "nobody has checked this" on nine lines in ten is 14%
        of the guide by character count and tells the reader nothing.
      */}
      <p className="legend">
        Most values here are marked <span className="prov prov-provisional">⚠</span> — a starting
        point nobody has verified, so trust your ears over this page. The exceptions are worth
        noticing: <span className="prov prov-authored">authored</span> means somebody checked that
        exact value against a manual or a unit, and{' '}
        <span className="prov prov-derived">derived</span> shows a move mood made, written{' '}
        <span className="mono">52 → 45</span>, with the knob that made it. Values carry their
        range — <span className="mono">38 (0…100)</span> — so you can tell at a glance whether the
        screen in front of you is the one the line is about.
      </p>

      {GUIDE_PHASES.map((phase, i) => (
        <section className="phase" key={phase} aria-labelledby={`phase-${i + 1}`}>
          <h3 id={`phase-${i + 1}`}>
            <span className="phase-number mono">{i + 1}</span>
            {phase}
          </h3>
          {bodies[phase]}
        </section>
      ))}
    </article>
  )
}
