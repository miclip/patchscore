import type { CSSProperties } from 'react'
import type { PanelFeature } from '@/lib/core'
import { list } from '../guide/format'
import type { ClockCable, PanelJack, RackModel, RackPanel, VoiceCable } from './model'
import { RAIL_MM } from './model'

/**
 * The rack, as SVG. Pure: it draws the model and decides nothing.
 *
 * The `viewBox` is in millimetres, so "realistic relative width" is carried by the coordinate
 * system — the browser does the scaling and there is no place for a rounding difference to
 * creep in. Hairlines carry `vector-effect="non-scaling-stroke"` so the drawing survives being
 * shrunk to a 390px overview and blown up again in the full-size layer without turning to mush.
 *
 * `idPrefix` exists because the same diagram is rendered twice on the page (overview and
 * full-size) and SVG gradient ids are document-global. It is passed in rather than generated so
 * the markup is deterministic, which is what makes it testable.
 *
 * `Feature` below is the only switch in the rack, and it switches on `PanelFeature['kind']` —
 * never on a device id. That is what keeps invariant 2 true while the panels are still authored
 * per box: a new manifest adds data, not a branch.
 */

const SCREW_R = 1.7
const JACK_R = 4.2
const JACK_HOLE_R = 1.9

function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g className="rack-screw">
      <circle cx={x} cy={y} r={SCREW_R} />
      <line x1={x - 1} y1={y} x2={x + 1} y2={y} vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function Jack({ jack, live }: { jack: PanelJack; live: boolean }) {
  const { x, y } = jack.at
  // Clock jacks sit on the bottom rail, so their silkscreen goes above them; the audio rail is
  // mid-panel and labels below. Either way the label never lands on the socket.
  // Rail sockets label above, mid-panel audio labels below. Either way the label never lands on
  // the socket — and the voice pair is on the rail, so it labels the way the clock pair does.
  const above = jack.kind !== 'main-out' && jack.kind !== 'individual-out'
  return (
    <g className="rack-jack" data-kind={jack.kind} data-live={live ? 'yes' : 'no'}>
      <circle className="rack-jack-ring" cx={x} cy={y} r={JACK_R} vectorEffect="non-scaling-stroke" />
      <circle className="rack-jack-hole" cx={x} cy={y} r={JACK_HOLE_R} />
      {/* #103. No silkscreen, no text node: an unlabelled socket is a socket the manifest has
          not named, and printing an empty label would leave a blank where a name looks due. */}
      {jack.label === undefined ? null : (
        <text
          className="rack-jack-label"
          x={x}
          y={above ? y - JACK_R - 2.6 : y + JACK_R + 4.4}
          textAnchor="middle"
        >
          {jack.label}
        </text>
      )}
    </g>
  )
}


/**
 * One authored feature. Shapes only — a knob is a circle with a pointer, not a control; nothing
 * here reads or writes anything. The device folder said where it goes and what it is called.
 */
function Feature({ f }: { f: PanelFeature }) {
  switch (f.kind) {
    case 'screen':
      return (
        <g className="rack-screen">
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={1.2} vectorEffect="non-scaling-stroke" />
        </g>
      )

    case 'knob': {
      const r = f.d / 2
      const cx = f.x + r
      const cy = f.y + r
      return (
        <g className="rack-knob">
          <circle cx={cx} cy={cy} r={r} vectorEffect="non-scaling-stroke" />
          {/* A pointer line, the one mark that makes a circle read as a knob. */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r * 0.72}
            vectorEffect="non-scaling-stroke"
          />
          {f.label === undefined ? null : (
            <text className="rack-feature-label" x={cx} y={f.y + f.d + 3.6} textAnchor="middle">
              {f.label}
            </text>
          )}
        </g>
      )
    }

    case 'button':
      return (
        <g className="rack-button">
          <rect
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            rx={f.round === true ? Math.min(f.w, f.h) / 2 : 1}
            vectorEffect="non-scaling-stroke"
          />
          {f.label === undefined ? null : (
            <text
              className="rack-feature-label"
              x={f.x + f.w / 2}
              y={f.y + f.h + 3.6}
              textAnchor="middle"
            >
              {f.label}
            </text>
          )}
        </g>
      )

    case 'grid': {
      const cw = (f.w - GRID_GAP * (f.cols - 1)) / f.cols
      const ch = (f.h - GRID_GAP * (f.rows - 1)) / f.rows
      const cells = []
      for (let row = 0; row < f.rows; row++) {
        for (let col = 0; col < f.cols; col++) {
          const x = f.x + col * (cw + GRID_GAP)
          const y = f.y + row * (ch + GRID_GAP)
          const key = `${row}-${col}`
          if (f.shape === 'knob') {
            const r = Math.min(cw, ch) / 2
            cells.push(
              <g key={key} className="rack-knob">
                <circle cx={x + cw / 2} cy={y + ch / 2} r={r} vectorEffect="non-scaling-stroke" />
                <line
                  x1={x + cw / 2}
                  y1={y + ch / 2}
                  x2={x + cw / 2}
                  y2={y + ch / 2 - r * 0.72}
                  vectorEffect="non-scaling-stroke"
                />
              </g>,
            )
            continue
          }
          if (f.shape === 'fader') {
            cells.push(
              <g key={key} className="rack-fader">
                <line
                  x1={x + cw / 2}
                  y1={y + 1}
                  x2={x + cw / 2}
                  y2={y + ch - 1}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x + cw * 0.2}
                  y={y + ch * 0.34}
                  width={cw * 0.6}
                  height={ch * 0.14}
                  rx={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              </g>,
            )
            continue
          }
          cells.push(
            <rect
              key={key}
              className={f.shape === 'key' ? 'rack-key' : 'rack-pad'}
              x={x}
              y={y}
              width={cw}
              height={ch}
              rx={0.8}
              vectorEffect="non-scaling-stroke"
            />,
          )
        }
      }
      return (
        <g>
          {cells}
          {f.label === undefined ? null : (
            <text className="rack-feature-label" x={f.x} y={f.y - 1.6}>
              {f.label}
            </text>
          )}
        </g>
      )
    }

    case 'label':
      return (
        <text
          className="rack-feature-label"
          x={f.x}
          y={f.y}
          textAnchor={f.align === undefined ? 'start' : f.align}
        >
          {f.text}
        </text>
      )

    case 'group':
      return (
        <g className="rack-group">
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={1.5} vectorEffect="non-scaling-stroke" />
          {f.label === undefined ? null : (
            <text className="rack-feature-label" x={f.x + 2} y={f.y - 1.6}>
              {f.label}
            </text>
          )}
        </g>
      )

    // The resolver's own region — drawn by `Panel` from the model's cells, not from here.
    case 'voices':
      return null
  }
}

const GRID_GAP = 1.2

export function Panel({ panel }: { panel: RackPanel }) {
  const { spanMm, riseMm } = panel
  // Scaled to the panel, not a fixed size: 9 mm of silkscreen on a 130 mm panel is a banner, and
  // 4.5 mm on a 486 mm one is unreadable. The clamp keeps a narrow panel's name legible without
  // it colliding with whatever the manifest drew underneath.
  const nameMm = Math.min(Math.max(spanMm * 0.03, 4.5), 9)
  return (
    <g
      className="rack-panel"
      data-device={panel.deviceId}
      data-clock={panel.clockRole}
      data-generated={panel.generated ? 'yes' : 'no'}
      transform={`translate(${panel.xMm} ${panel.topMm})`}
    >
      {/* The patch rail, drawn first and behind, so it reads as the strip the panel sits on. */}
      <rect className="rack-rail" x={0} y={riseMm} width={spanMm} height={RAIL_MM} rx={1.5} />

      <rect className="rack-face" x={0} y={0} width={spanMm} height={riseMm} rx={2} />
      {/* One hairline inside the edge: a bevel, not a border. */}
      <rect
        className="rack-bevel"
        x={1.5}
        y={1.5}
        width={Math.max(0, spanMm - 3)}
        height={Math.max(0, riseMm - 3)}
        rx={1.5}
        vectorEffect="non-scaling-stroke"
      />

      <Screw x={5} y={5} />
      <Screw x={spanMm - 5} y={5} />
      <Screw x={5} y={riseMm - 5} />
      <Screw x={spanMm - 5} y={riseMm - 5} />

      {/*
        Silkscreen identity. An authored panel puts its own logo where the box does, so the name
        goes top-left out of the way; a generated panel has nothing else on it, so it gets a
        centred plate. A narrow authored panel skips the name entirely rather than overprinting
        the drawing — the legend under the figure names every box anyway.
      */}
      {panel.generated ? (
        <>
          <text className="rack-maker" x={spanMm / 2} y={19} textAnchor="middle">
            {panel.maker.toUpperCase()}
          </text>
          <text className="rack-name" x={spanMm / 2} y={31} textAnchor="middle">
            {panel.name}
          </text>
          <line
            className="rack-rule"
            x1={8}
            y1={37}
            x2={spanMm - 8}
            y2={37}
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <text
          className="rack-name rack-name-corner"
          x={8}
          y={nameMm + 2}
          style={{ fontSize: `${nameMm}px` }}
        >
          {panel.name}
        </text>
      )}

      {panel.layout?.features.map((feature, i) => (
        <Feature key={i} f={feature} />
      ))}

      {panel.jacks.map((jack) => (
        <Jack
          key={jack.id}
          jack={jack}
          /*
           * §3.3. A voice socket carries its own answer, because the model knows whether a cable
           * landed there and the drawing does not: a target the pass could not feed has its pitch
           * and gate holes drawn dead, which is the picture of the gap. Clock sockets keep the
           * derivation from `clockRole` they have had since #103 — same question, one level up.
           */
          live={
            jack.live ??
            ((jack.kind === 'clock-out' && panel.clockRole === 'source') ||
              (jack.kind === 'clock-in' && panel.clockRole === 'receiver'))
          }
        />
      ))}

      {panel.hiddenJacks > 0 ? (
        <text className="rack-more" x={spanMm - 8} y={riseMm + RAIL_MM - 3} textAnchor="end">
          +{panel.hiddenJacks} more outs
        </text>
      ) : null}

      {panel.banks.map((bank) => (
        <g key={bank.id} className="rack-bank">
          {panel.banks.length > 1 ? (
            <text className="rack-bank-label" x={bank.cells[0]?.x ?? 0} y={bank.labelY + 3.4}>
              {bank.label.toUpperCase()}
            </text>
          ) : null}
          {bank.cells.map((cell) => (
            <g
              key={cell.voiceId}
              className="rack-cell"
              data-occupied={cell.occupied ? 'yes' : 'no'}
            >
              <rect
                x={cell.x}
                y={cell.y}
                width={cell.w}
                height={cell.h}
                rx={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                className="rack-cell-label"
                x={cell.x + cell.w / 2}
                y={cell.y + cell.h / 2 + cell.h * 0.16}
                textAnchor="middle"
                style={{ fontSize: `${Math.min(cell.h * 0.5, cell.w * 0.42)}px` }}
              >
                {cell.label}
              </text>
            </g>
          ))}
        </g>
      ))}

      {panel.hiddenCells > 0 ? (
        <text className="rack-more" x={spanMm - 8} y={riseMm - 8} textAnchor="end">
          +{panel.hiddenCells} voices not drawn
        </text>
      ) : null}
    </g>
  )
}

/**
 * Two strokes per cable: a dark casing under a bright core. That is what keeps a cable readable
 * against the frame, and it means the drawing needs no drop shadow or filter — both of which
 * cost more than they are worth at overview scale.
 *
 * The stroke deliberately does *not* use `non-scaling-stroke`, unlike every hairline on the
 * panels: a cable is a physical object in the same millimetres as everything else, so it should
 * get thicker as you zoom in. `pathLength="1"` normalises the geometry for the draw-on
 * animation, so one dash pattern works at any scale instead of one tuned for a guessed length.
 */
function Cable({ cable }: { cable: ClockCable }) {
  return (
    <g className="rack-cable">
      <path className="rack-cable-casing" d={cable.d} pathLength={1} />
      <path className="rack-cable-core" d={cable.d} pathLength={1} />
      <circle className="rack-cable-end" cx={cable.from.x} cy={cable.from.y} r={2.2} />
      <circle className="rack-cable-end" cx={cable.to.x} cy={cable.to.y} r={2.2} />
    </g>
  )
}

/**
 * §3.3. A voice-control cable, drawn with the same two strokes and the same draw-on as the clock
 * cable, and a different class so CSS can tell them apart. Kept a separate component rather than a
 * prop on `Cable`, so the markup a test reads says which kind of cable it found — `rack-cable`
 * matched the clock run exactly before this existed, and it still does.
 *
 * `data-signal` carries `pitch-cv` or `gate`: two cables run to the same box, and which is which
 * is the only thing a reader at the rack needs from the drawing.
 */
function VoiceRun({ cable }: { cable: VoiceCable }) {
  return (
    <g className="rack-voice-cable" data-signal={cable.signal}>
      <path className="rack-voice-cable-casing" d={cable.d} pathLength={1} />
      <path className="rack-voice-cable-core" d={cable.d} pathLength={1} />
      <circle className="rack-voice-cable-end" cx={cable.from.x} cy={cable.from.y} r={2.2} />
      <circle className="rack-voice-cable-end" cx={cable.to.x} cy={cable.to.y} r={2.2} />
    </g>
  )
}

function summary(model: RackModel): string {
  if (model.panels.length === 0) return 'An empty rack.'
  const names = model.panels.map((p) => `${p.name} (${p.spanMm} by ${p.riseMm} mm)`).join(', ')
  const rows =
    model.rows.length === 1
      ? ''
      : ` The rack is on ${model.rows.length} rows of at most ${model.perRow} boxes; ` +
        `the panels are one scale throughout, so a row with fewer boxes is simply shorter.`
  const clock =
    model.clockSource === undefined
      ? 'Nothing in this rig can send clock, so no clock cables are drawn.'
      : `${model.clockSource.deviceName} is the clock source over ${model.clockSource.transport}; ` +
        `${model.cables.length} clock ${model.cables.length === 1 ? 'cable runs' : 'cables run'} from it.`
  const isolated =
    model.isolated.length === 0
      ? ''
      : ` Not on the clock: ${model.isolated.map((p) => p.name).join(', ')}.`
  /**
   * §3.3. The screen-reader sentence for the voice runs, and the one place the drawing has to say
   * out loud what the three outcomes mean. A sighted reader sees a dead socket; this is that same
   * fact in words, and it is the accessible path rather than a summary of it.
   */
  const voice =
    model.voicePatch.outcome === 'no-target'
      ? ''
      : model.voiceCables.length === 0
        ? ` No voice-control cables are drawn: ${list(
            model.voicePatch.targets.map((t) => t.deviceName),
          )} ${model.voicePatch.targets.length === 1 ? 'takes' : 'take'} a note and a gate, and ` +
          'nothing in this rig sends one. Their pitch and gate sockets are drawn empty.'
        : ` ${model.voicePatch.source?.deviceName ?? 'A box here'} sends pitch and gate: ` +
          list(
            model.voiceCables.map(
              (c) => `${c.fromJack} to ${c.toName} ${c.toJack}`,
            ),
          ) +
          '.' +
          (model.voicePatch.targets.some((t) => t.outcome === 'source-exhausted')
            ? ` It has no pair left for ${list(
                model.voicePatch.targets
                  .filter((t) => t.outcome === 'source-exhausted')
                  .map((t) => t.deviceName),
              )}, whose pitch and gate sockets are drawn empty.`
            : '')
  return `A rack of ${names}, drawn to relative width.${rows} ${clock}${isolated}${voice}`
}

export function RackDiagram({
  model,
  idPrefix,
  bpm,
}: {
  model: RackModel
  idPrefix: string
  /**
   * §7.4/#200. The song's tempo, so the clock source's glow beats at it. Optional: a diagram
   * rendered without one keeps the static ring and no pulse, which is also what a reader under
   * `prefers-reduced-motion` sees.
   */
  bpm?: number | undefined
}) {
  const titleId = `${idPrefix}-rack-title`
  const descId = `${idPrefix}-rack-desc`
  // One beat in milliseconds. Guarded rather than trusted: a zero or negative BPM would make an
  // infinite animation with a zero-length period, which browsers handle by never painting a frame.
  const beatMs = bpm !== undefined && bpm > 0 ? Math.round(60_000 / bpm) : undefined

  return (
    <svg
      className="rack-svg"
      viewBox={`0 0 ${model.totalMm} ${model.heightMm}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      style={beatMs === undefined ? undefined : ({ '--rack-beat': `${beatMs}ms` } as CSSProperties)}
    >
      <title id={titleId}>Rack diagram</title>
      <desc id={descId}>{summary(model)}</desc>
      <defs>
        <linearGradient id={`${idPrefix}-anodized`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2e34" />
          <stop offset="45%" stopColor="#1c1f23" />
          <stop offset="100%" stopColor="#121417" />
        </linearGradient>
      </defs>
      <style>{`.rack-face { fill: url(#${idPrefix}-anodized); }`}</style>

      {/*
        The case rail each row's panels are bolted to, drawn first and behind them, spanning the
        band rather than the row. It is what makes a short row read as a row in a rack with space
        left in it, instead of a group of panels floating under the one above — which is the whole
        argument for wrapping (#63): a real rack has rows, and its last row is rarely full.
      */}
      {model.rows.length > 1
        ? model.rows.map((row) => (
            <rect
              key={row.index}
              className="rack-row-rail"
              x={model.leftGutterMm}
              y={row.corridorMm - RAIL_MM}
              width={Math.max(0, model.totalMm - model.leftGutterMm - model.rightGutterMm)}
              height={RAIL_MM}
              rx={1.5}
            />
          ))
        : null}

      {model.panels.map((panel) => (
        <Panel key={panel.deviceId} panel={panel} />
      ))}
      {model.cables.map((cable) => (
        <Cable key={`${cable.fromDeviceId}->${cable.toDeviceId}`} cable={cable} />
      ))}
      {/*
        §3.3. After the clock runs, so a pitch cable reads as lying over the sync cable rather than
        under it — the sync cable is the one you patch once and forget, and the note cables are the
        ones a reader is tracing.
      */}
      {model.voiceCables.map((cable) => (
        <VoiceRun key={`${cable.fromJack}->${cable.toDeviceId}:${cable.toJack}`} cable={cable} />
      ))}
    </svg>
  )
}
