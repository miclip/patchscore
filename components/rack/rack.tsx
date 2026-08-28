'use client'

import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { DeviceId, ResolveResult } from '@/lib/core'
import { citeText, count, list } from '../guide/format'
import { RackDiagram } from './diagram'
import { RackFullscreen } from './fullscreen'
import { AUDIO_OMISSION, NARROW_PER_ROW, ROW_CAPS, SCALE_CAVEAT, rackModel } from './model'

/**
 * The row cap, from the viewport (#63).
 *
 * It has to be JavaScript rather than CSS, and that is worth saying: the wrap changes the SVG's
 * *geometry* — how many panels are on a row, where the cables run, how tall the figure is — and
 * a stylesheet cannot reach any of that. A media query can only restyle what the model already
 * decided, so the model has to be told.
 *
 * `useSyncExternalStore` rather than an effect, because the server has no viewport: the third
 * argument is the server snapshot, so the first paint is the narrow layout everywhere and the
 * client re-renders once with the real one. No hydration mismatch, and nothing flashes on the
 * device the issue is about.
 */
// Built once and reused: `getSnapshot` runs on every render, and a fresh `MediaQueryList` per
// call would be both wasteful and a different object each time.
const QUERIES = new Map<number, MediaQueryList>()

function queryFor(minPx: number): MediaQueryList {
  const held = QUERIES.get(minPx)
  if (held !== undefined) return held
  const made = window.matchMedia(`(min-width: ${minPx}px)`)
  QUERIES.set(minPx, made)
  return made
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const list = ROW_CAPS.filter((tier) => tier.minPx > 0).map((tier) => queryFor(tier.minPx))
  for (const query of list) query.addEventListener('change', onChange)
  return () => {
    for (const query of list) query.removeEventListener('change', onChange)
  }
}

function perRowNow(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return NARROW_PER_ROW
  }
  // Widest tier first, so the first match is the right one.
  for (const tier of ROW_CAPS) {
    if (tier.minPx === 0) return tier.perRow
    if (queryFor(tier.minPx).matches) return tier.perRow
  }
  return NARROW_PER_ROW
}

function serverPerRow(): number {
  return NARROW_PER_ROW
}

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
/**
 * §7.4/#200. **Choosing which box runs the clock, as buttons rather than as clicks on a drawing.**
 *
 * The rack SVG is `role="img"` with a `<desc>` summary: everything inside it is one picture to a
 * screen reader, by design. Panel clicks are therefore a pointer convenience and cannot be the
 * only way to set this, or the feature is mouse-only. These buttons are the announced, keyboard
 * path, and the panels defer to them — the same arrangement `CLAUDE.md` states for knobs, where
 * "typed input is the accessible path and the precise one" and must never be a hidden fallback
 * behind a gesture.
 *
 * Only boxes that can send clock appear. `selectClockSource` refuses an ineligible id anyway, but
 * offering one and then ignoring it is a control that lies about what it does.
 */
function ClockChoice({
  result,
  onClockSource,
}: {
  result: ResolveResult
  onClockSource: (deviceId: DeviceId | undefined) => void
}) {
  const eligible = result.devices.filter((d) => d.clock.canSendClock)
  // Nothing to choose between: one candidate is not a choice, and none is the honest "no box here
  // can send clock" the guide already states in words.
  if (eligible.length < 2) return null
  const current = result.clockSource?.deviceId
  const chosen = result.clockSource?.chosen === true

  return (
    <div className="rack-clock-choice">
      <span className="rack-clock-choice-label" id="rack-clock-choice-label">
        Clock source
      </span>
      <div className="rack-clock-choice-options" role="group" aria-labelledby="rack-clock-choice-label">
        {eligible.map((device) => (
          <button
            key={device.id}
            type="button"
            className="rack-clock-option"
            aria-pressed={device.id === current}
            onClick={() => {
              onClockSource(device.id)
            }}
          >
            {device.name}
          </button>
        ))}
        {/*
          Only once a choice has been made. "Let the rig decide" beside an already-derived answer
          is a button that does nothing, and §7.4's ranking is what a reader gets by default.
        */}
        {chosen ? (
          <button
            type="button"
            className="rack-clock-option rack-clock-clear"
            onClick={() => {
              onClockSource(undefined)
            }}
          >
            Let the rig decide
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function Rack({
  result,
  onClockSource,
}: {
  result: ResolveResult | undefined
  /**
   * §7.4/#200. Put a box in charge of the clock, or `undefined` to hand the job back to §7.4.
   * Optional so the device pages, which render a rack without a session behind it, need not
   * supply one — and where it is absent nothing is offered rather than offered and inert.
   */
  onClockSource?: ((deviceId: DeviceId | undefined) => void) | undefined
}) {
  const [full, setFull] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  const perRow = useSyncExternalStore(subscribe, perRowNow, serverPerRow)
  const model = useMemo(
    () => (result === undefined ? undefined : rackModel(result, { perRow })),
    [result, perRow],
  )

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
        <p className="note">
          {model.voiceCables.length === 0 ? 'Clock routing' : 'Clock and voice-control routing'},
          drawn to relative panel width
        </p>
      </header>

      <figure className="rack-figure">
        {/*
          `rack-overview` is the scale ceiling (#113), and it is a second class rather than a
          rule on `.rack-frame` because `.rack-frame` is shared with the device pages' single
          panel, which sets no `--rack-mm` and has a ceiling of its own.
        */}
        <div
          className="rack-frame rack-overview"
          style={{ ['--rack-mm' as string]: model.totalMm }}
        >
          <RackDiagram
            model={model}
            idPrefix="rack-inline"
            bpm={result?.song.bpm}
            onChoosePanel={onClockSource}
          />
        </div>
        {onClockSource === undefined || result === undefined ? null : (
          <ClockChoice result={result} onClockSource={onClockSource} />
        )}
        <figcaption className="rack-caption">
          {/*
            The number quoted is `frontPanelMm` — the sum of the cited spans — rather than the
            figure's width. They were the same thing when every box sat on one row; once the rack
            wraps, the figure's width is only the widest row, and "mm of front panel" has to keep
            meaning the front panel a person owns.
          */}
          <span>
            Overview, fitted to the page. {model.frontPanelMm} mm of front panel across{' '}
            {count(model.panels.length, 'box', 'boxes')}
            {model.rows.length > 1 ? `, on ${count(model.rows.length, 'row')}` : ''}.
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

      {/*
        §3.3. The voice-control runs, in words, beside the drawing. Three outcomes and three
        sentences, because the two ways of having no cables mean opposite things: a rig of
        grooveboxes is missing nothing, and a synth nothing can drive is a gap a reader can act on.
        The dead sockets on the panels are the same fact drawn; this is it said.
      */}
      {model.voicePatch.outcome === 'no-target' ? null : model.voiceCables.length === 0 ? (
        <p className="callout">
          <strong>No voice-control cables</strong> —{' '}
          {list(model.voicePatch.targets.map((t) => t.deviceName))}{' '}
          {model.voicePatch.targets.length === 1 ? 'takes' : 'take'} a note and a gate, and nothing
          in this rig sends one. Their pitch and gate sockets are drawn empty rather than left off.
        </p>
      ) : (
        <p className="callout">
          <strong>Voice control</strong> — {model.voicePatch.source?.deviceName} sends pitch and
          gate.{' '}
          {model.voiceCables.map((cable) => (
            <span key={`${cable.fromJack}->${cable.toDeviceId}:${cable.toJack}`}>
              <span className="mono">{cable.fromJack}</span> to {cable.toName}{' '}
              <span className="mono">{cable.toJack}</span>
              {'. '}
            </span>
          ))}
          {model.voicePatch.targets.some((t) => t.outcome === 'source-exhausted')
            ? `No pair left for ${list(
                model.voicePatch.targets
                  .filter((t) => t.outcome === 'source-exhausted')
                  .map((t) => t.deviceName),
              )} — those sockets are drawn empty.`
            : null}
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
        they are patch points *inside* one box. The Cascadia (#49) is the first device to declare
        any, and the count is still the honest rendering — drawing a cable between two jacks needs
        jack *positions*, and `PanelLayout` has no jack feature to carry them. Saying so is the
        same honesty as a gap; inventing a cable stub would not be.
      */}
      {patched.length > 0 ? (
        <p className="rack-note">
          {patched
            .map((p) => `${p.name}: ${count(p.internalPatch.length, 'internal patch point')}`)
            .join(' · ')}{' '}
          — listed in the guide, not drawn: these are patch points inside the box.
        </p>
      ) : null}

      {full ? <RackFullscreen model={model} onClose={close} bpm={result?.song.bpm} /> : null}
    </section>
  )
}
