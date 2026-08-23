'use client'

import { useMemo, useState } from 'react'
import type { Device, DeviceId, GuidePhase, ResolveResult } from '@/lib/core'
import type { ReactNode } from 'react'
import { GUIDE_PHASES } from '@/lib/core'
import { browserEnv } from '@/lib/studio/browser-env'
import { downloadGuideMarkdown, printGuide } from '@/lib/studio/export'
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
 * two of them). Every musical choice is already settled in `ResolveResult`, and anything derived
 * from it that is a musical claim rather than a layout choice — §6.3's band trajectory, in
 * `lib/core/arrangement.ts` — is derived once and read by both. What this file decides is ink:
 * what is loud, what is quiet, and what is reserved-but-invisible.
 *
 * Seven phases, always, in §8's order — not "the phases that had content". A guide whose hook
 * section vanishes is indistinguishable from a genre with no hook, so an empty phase says what
 * is missing instead of disappearing (invariant 5). `GUIDE_PHASES` is imported rather than
 * restated: one list, read by the Markdown renderer, this view, and the tests.
 */
export function Guide({ result, seed }: { result: ResolveResult; seed: number }) {
  /** §8.1: on by default, off once you know your boxes. Print ignores it (see `@media print`). */
  const [hints, setHints] = useState(true)
  const [exported, setExported] = useState<{ ok: boolean; message: string } | undefined>(undefined)

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
    Finishing: <PhaseFinishing result={result} />,
  }

  /*
   * Both handlers build the environment inside the handler, never during render (#12). Nothing
   * in this component reads `window` while React is rendering it, which is what keeps the
   * server's markup and the client's first markup the same bytes.
   */
  function onDownload() {
    const outcome = downloadGuideMarkdown(browserEnv(), result, seed)
    setExported(
      outcome.ok
        ? { ok: true, message: `Saved ${outcome.name}` }
        : { ok: false, message: outcome.message },
    )
  }

  function onPrint() {
    const outcome = printGuide(browserEnv())
    // Success says nothing: the print dialog is its own feedback, and a toast underneath a modal
    // is a toast nobody sees. Only failure is worth a line.
    setExported(outcome.ok ? undefined : { ok: false, message: outcome.message })
  }

  return (
    <article className="guide" data-hints={hints ? 'on' : 'off'}>
      <header className="guide-head">
        <h2>{result.template.name}</h2>
        <div className="guide-actions">
          <label className="hints-toggle">
            <input
              type="checkbox"
              checked={hints}
              onChange={(event) => setHints(event.target.checked)}
            />
            Show hints
          </label>
          <button type="button" className="link-button" onClick={onDownload}>
            Download Markdown
          </button>
          <button type="button" className="link-button" onClick={onPrint}>
            Print / Save PDF
          </button>
        </div>
      </header>

      {exported === undefined ? null : (
        <p className={exported.ok ? 'export-ok' : 'export-failed'} role="status">
          {exported.message}
        </p>
      )}

      {/*
        The reading convention, stated once, and it is what makes an unmarked value legible:
        the convention has to live somewhere, and once at the top is cheaper than a badge on
        every line. Said in the voice of something that knows what it is talking about — no
        apology, no warning, and nothing telling the reader to distrust the page.
      */}
      <p className="legend">
        Values are starting points — dial them to taste. Where a number came straight off the
        manual or off a unit it says which (
        <span className="prov prov-cited">manual</span>), and where a mood knob moved it you see
        the move — <span className="mono">52 → 45</span> — and{' '}
        <span className="prov prov-moved">the knob that did it</span>. Every value carries its
        range, <span className="mono">38 (0…100)</span>, so you can tell at a glance whether the
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
