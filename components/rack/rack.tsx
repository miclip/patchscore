'use client'

import { useMemo, useRef, useState } from 'react'
import type { ResolveResult } from '@/lib/core'
import { citeText, count } from '../guide/format'
import { RackDiagram } from './diagram'
import { RackFullscreen } from './fullscreen'
import { AUDIO_OMISSION, SCALE_CAVEAT, rackModel } from './model'

/**
 * §10's signature element, build step 9 (#11).
 *
 * Three things this view is careful about, all of them versions of invariant 5:
 *
 * 1. **The cables are clock, and only clock.** The resolver produces exactly one spatial fact
 *    about the rig — §7.4's clock source and the boxes that can sync to it. Audio has no
 *    destination in the authored library, so there is nothing to draw a cable *to*; the omission
 *    is stated beside the legend rather than papered over. See `AUDIO_OMISSION`.
 * 2. **A box that cannot take the clock is drawn as such**, with the reason, instead of being
 *    quietly wired up.
 * 3. **The drawing is true about width and says what it is not true about.** Height is a frame
 *    constant because no manifest authors one; `SCALE_CAVEAT` says so on the page.
 *
 * The panels themselves are generated from device data — see `model.ts`. There is no per-device
 * artwork here and there must not be: invariant 2 puts UI edits on the list of things adding a
 * device may not require.
 */
export function Rack({ result }: { result: ResolveResult | undefined }) {
  const [full, setFull] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  const model = useMemo(() => (result === undefined ? undefined : rackModel(result)), [result])

  function close() {
    setFull(false)
    openRef.current?.focus()
  }

  if (model === undefined || model.panels.length === 0) {
    return (
      <section className="panel span-2">
        <header>
          <h2>Rack</h2>
        </header>
        <p className="empty">
          {model === undefined
            ? 'No template selected, so there is no rig to draw.'
            : 'No devices selected. Pick a box and it appears here at its real relative width.'}
        </p>
      </section>
    )
  }

  const source = model.clockSource
  const provisional = model.panels.filter((p) => p.spanVerified === false)
  const patched = model.panels.filter((p) => p.internalPatch.length > 0)

  return (
    <section className="panel span-2 rack-section">
      <header>
        <h2>Rack</h2>
        <p className="note">Clock routing, drawn to relative panel width</p>
      </header>

      <figure className="rack-figure">
        <div className="rack-frame" style={{ ['--rack-mm' as string]: model.totalMm }}>
          <RackDiagram model={model} idPrefix="rack-inline" />
        </div>
        <figcaption className="rack-caption">
          <span>
            Overview, fitted to the page. {model.totalMm} mm of front panel across{' '}
            {count(model.panels.length, 'box')}.
          </span>
          <button ref={openRef} type="button" className="rack-open" onClick={() => setFull(true)}>
            Open full size
          </button>
        </figcaption>
      </figure>

      {source === undefined ? (
        // §7.4: a real rig, and a fact to state rather than paper over.
        <p className="callout">
          <strong>No clock cables</strong> — nothing in this rig can send clock. Every box here
          has to receive one, so the clock has to come from something outside it.
        </p>
      ) : (
        <p className="callout">
          <strong>Clock source</strong> — {source.deviceName} over{' '}
          <span className="mono">{source.transport}</span>, carrying{' '}
          {count(source.occupiedAssignables, 'part')}.{' '}
          {model.cables.length === 0
            ? 'Nothing else in this rig can sync to it.'
            : `${count(model.cables.length, 'cable')} drawn; sync each of those boxes to it.`}
        </p>
      )}

      <ul className="rack-legend">
        {model.panels.map((panel) => (
          <li key={panel.deviceId} data-clock={panel.clockRole}>
            <span className="rack-legend-name">{panel.name}</span>
            <span className="rack-legend-role">
              {panel.clockRole === 'source'
                ? 'clock source'
                : panel.clockRole === 'receiver'
                  ? `syncs over ${source?.transport ?? ''}`
                  : `not on the clock — ${panel.isolatedReason ?? 'unknown'}`}
            </span>
            <span className="rack-legend-span mono">
              {panel.spanMm} mm
              {panel.spanVerified === false ? ' (provisional)' : ''}
            </span>
            <span className="rack-legend-parts">{count(panel.parts, 'part')}</span>
          </li>
        ))}
      </ul>

      <p className="rack-note">{AUDIO_OMISSION}</p>
      <p className="rack-note">{SCALE_CAVEAT}</p>

      {/*
        Provenance for the drawing, not only for the numbers. A panel layout is authored data
        read off a manual (§2.3), so it cites its source the way a parameter value does — and a
        box that has *not* been drawn says so rather than letting a plain panel pass for a
        likeness of the real thing.
      */}
      <dl className="rack-sources">
        {model.panels.map((panel) => (
          <div key={panel.deviceId}>
            <dt>{panel.name}</dt>
            <dd>
              {panel.spanMm} × {panel.riseMm} mm,{' '}
              {panel.spanVerified === false
                ? 'span provisional — no published figure'
                : `from ${citeText(panel.spanVerified)}`}
              {' · '}
              {panel.layoutVerified === undefined
                ? 'panel not drawn yet — generated from its jacks and voices'
                : panel.layoutVerified === false
                  ? 'panel drawn, uncited'
                  : `drawn from ${citeText(panel.layoutVerified)}`}
            </dd>
          </div>
        ))}
      </dl>
      {provisional.length > 0 ? (
        <p className="rack-note">
          Provisional span: {provisional.map((p) => p.name).join(', ')} — no published figure, so
          that panel&rsquo;s width against the others is a guess and is marked as one.
        </p>
      ) : null}
      {/*
        §3.3 patch entries are carried by the model and rendered as a count, never as a cable:
        they are patch points *inside* one box, and no authored recipe declares any yet. The path
        exists so a semi-modular device gets on-panel routing without a new data shape; nothing
        is invented in the meantime.
      */}
      {patched.length > 0 ? (
        <p className="rack-note">
          {patched
            .map((p) => `${p.name}: ${count(p.internalPatch.length, 'internal patch point')}`)
            .join(' · ')}{' '}
          — listed in the guide, not drawn: these are patch points inside the box.
        </p>
      ) : null}

      {full ? <RackFullscreen model={model} onClose={close} /> : null}
    </section>
  )
}
