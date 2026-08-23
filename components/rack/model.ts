import type {
  Device,
  DeviceId,
  DeviceKind,
  PanelLayout,
  ResolveResult,
  Verified,
} from '@/lib/core'
import { expand } from '@/lib/core'
import { occupiedCounts } from '../guide/format'

/**
 * §10's rack, as geometry and graph — no React, no measurement, no DOM. The component draws
 * whatever this returns, so the interesting claims ("panel widths are proportional", "the clock
 * cable reaches exactly the boxes that can receive it", "every jack drawn is a jack the manifest
 * declares") are testable without rendering anything.
 *
 * Everything is in **millimetres**, and the SVG's `viewBox` is in the same units. That is the
 * whole trick behind "realistic relative width": the proportion is carried by the coordinate
 * system rather than by arithmetic that could round differently somewhere else.
 *
 * **Panels are authored data, drawn by one renderer.** A device folder carries a `PanelLayout`
 * (§2.3) — a simplified original drawing read off the manual's hardware-overview figure — and
 * this file turns it into geometry. Invariant 2 survives because there is no device-id switch
 * anywhere: the renderer switches on `PanelFeature['kind']`, a closed vocabulary that does not
 * grow when a device is added, and a manifest with **no** layout still gets a panel from the
 * jacks and voices it declares. So a fourth box works on day one and looks like itself the day
 * someone draws it.
 *
 * Two things stay true of every panel, authored or not. The jacks are the ones the manifest
 * declares, and the voice cells are the assignables the resolver could have used — so the parts
 * of the drawing that make a *claim* are still generated from data. The finish is where the
 * skeuomorphism lives: anodized gradient, bevel, mounting screws, silkscreen.
 */

// ---------------------------------------------------------------------------
// The frame
// ---------------------------------------------------------------------------

/** Air between neighbouring panels, in mm. Rack ears, near enough. */
export const PANEL_GAP_MM = 16

/**
 * **Panel height is a frame constant, not device data, and it is not to scale.**
 *
 * `panelSpanMm` is the only physical dimension the library authors (§2.3): depth and height were
 * deliberately left out because a front-panel view has no depth and nothing stacks rows yet. So
 * every panel is drawn the same height, exactly as a eurorack frame does it — width varies, the
 * rail spacing does not.
 *
 * The consequence has to be said out loud rather than left for someone to infer: a panel's
 * *aspect ratio* here is not the device's real aspect ratio. Only the widths, and the ratios
 * between them, are true. The legend says so on the page.
 */
export const PANEL_HEIGHT_MM = 170

/**
 * Room under the frame for the cables to hang in.
 *
 * This is the layout decision the drawing turns on, so it is worth saying why. The first cut put
 * the clock jacks on a top rail, which is where they sit on most of these boxes — and every
 * cable then draped across the face of every panel between its two ends, over exactly the voice
 * cells the panel exists to show. Jacks on a **bottom** rail, cables hanging below the rack, and
 * nothing occludes anything. It is also what a rack looks like from the front: the loom hangs.
 *
 * Height costs nothing here, because the diagram is fitted to width — adding room below does not
 * shrink the panels, it only makes the figure taller.
 */
const CABLE_ROOM_MM = 62

/**
 * The patch rail: a strip under every panel carrying its jacks.
 *
 * A convention, and one worth naming rather than letting a reader assume otherwise. On all three
 * of these boxes the sockets are on the back or the edges, so there is no honest place for them
 * on a front-panel view — and an authored layout owns every millimetre of the panel proper, so
 * there is no room either. A separate strip, visibly not part of the panel, says "this is the
 * patch bay" without pretending the jacks are where the drawing puts them.
 */
export const RAIL_MM = 26

/** How far in from a panel's side edge its clock jack sits. */
const JACK_SIDE_MM = 13

/** First audio jack clears the clock-in socket; the rest march right at this pitch. */
const OUT_START_MM = JACK_SIDE_MM + 22
const OUT_PITCH_MM = 11

/** Voice-field layout, all mm. */
const CELL_GAP_MM = 3
const CELL_ASPECT = 0.78
const MIN_CELL_W_MM = 3.5
const MIN_CELL_H_MM = 3
const BANK_LABEL_MM = 5

/** The generated fallback panel: a name plate, then the voice field fills what is left. */
const MARGIN_MM = 8
const PLATE_MM = 46

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

/**
 * Why a box is or is not on the end of a clock cable. `isolated` is a real state and gets said
 * plainly (invariant 5): a rig where one box cannot take the resolved transport is a fact about
 * the rig, not a hole to paper over by drawing a cable that would not work.
 */
export type ClockRole = 'source' | 'receiver' | 'isolated'

export type Point = { x: number; y: number }

/** A socket on the panel. `label` is silkscreen; nothing here is drawn without one. */
export type PanelJack = {
  id: string
  label: string
  kind: 'clock-out' | 'clock-in' | 'main-out' | 'individual-out'
  /** Panel-local, mm. */
  at: Point
}

/**
 * One assignable, as a cell. `voiceId` is the resolver's own identity for it (pool ordinal
 * already folded in), so `occupied` is a fact about this guide rather than a guess.
 */
export type PanelCell = {
  voiceId: string
  label: string
  occupied: boolean
  /** Panel-local, mm. */
  x: number
  y: number
  w: number
  h: number
}

/** A fixed voice set, or one pool. Banked because a two-pool box reads wrong as one flat grid. */
export type PanelBank = {
  id: string
  label: string
  /** Panel-local baseline for the bank's silkscreen label. */
  labelY: number
  cells: readonly PanelCell[]
}

export type RackPanel = {
  deviceId: DeviceId
  name: string
  maker: string
  kind: DeviceKind
  /** Front-panel horizontal span in playing orientation (§10). */
  spanMm: number
  /**
   * Vertical span of the panel proper, excluding the rail. From the authored layout when there
   * is one — so an authored panel is true in *both* dimensions — and a frame constant otherwise.
   */
  riseMm: number
  /** Left edge, in layout mm. */
  xMm: number
  /** Top edge, in layout mm. Panels are bottom-aligned, the way boxes sit on a desk. */
  topMm: number
  /** The authored drawing, or `undefined` for a manifest that has not been drawn yet. */
  layout?: PanelLayout
  /** Where the drawing came from. Absent on a generated panel, which claims nothing. */
  layoutVerified?: Verified
  /** True when this panel is the fallback: name plate, voice field, jacks, nothing else. */
  generated: boolean
  /** Provenance of `spanMm`, carried through so a provisional panel can be marked as one. */
  spanVerified: Verified
  clockRole: ClockRole
  /** Set only for `isolated`, and phrased for a reader. */
  isolatedReason?: string
  /** §12.4 assignables occupied in at least one section. */
  parts: number
  jacks: readonly PanelJack[]
  banks: readonly PanelBank[]
  /**
   * Cells the field could not hold. Stated, never silently dropped — a box whose voices do not
   * all fit on the drawing should say so rather than look like it has fewer.
   */
  hiddenCells: number
  /** Individual-out jacks the rail could not hold, same reasoning. */
  hiddenJacks: number
  /**
   * §3.3 patch entries resolved for this device's parts — patch points *within* one box, which
   * is why they are not inter-panel cables. Carried, not drawn: they are the raw material for
   * on-panel internal cable rendering later, and until that exists the honest thing is to keep
   * the data and draw nothing. Nothing here invents an entry a recipe did not author.
   */
  internalPatch: readonly { from: string; to: string; note?: string }[]
  /** Clock-out socket in layout coordinates. Cables and the drawing read the same number. */
  outAt: Point
  /** Clock-in socket in layout coordinates. */
  inAt: Point
}

// ---------------------------------------------------------------------------
// Cables
// ---------------------------------------------------------------------------

/**
 * Clock only. There is no audio cable type and that is deliberate — see `AUDIO_OMISSION`.
 */
export type ClockCable = {
  fromDeviceId: DeviceId
  toDeviceId: DeviceId
  fromName: string
  toName: string
  transport: string
  from: Point
  to: Point
  /** Cubic bézier, sagging downward under its own weight. */
  d: string
}

/**
 * Said beside the legend, not buried in a comment, because a rack drawing that shows only clock
 * looks incomplete and the reader deserves to know it is incomplete *on purpose*.
 *
 * The resolver assigns a part to an *assignable* — a voice on a box (§2.2). It never names a
 * destination device or a mixer channel, because the authored rig has no such endpoint to name:
 * `io` says a box has ten individual outs, and nothing says what any of them is plugged into.
 * Drawing audio cables would mean inventing those endpoints, which is precisely invariant 5's
 * "never invent an assignment to fill a hole" wearing a different hat.
 */
export const AUDIO_OMISSION =
  'Clock only. Audio paths are not drawn: the resolver assigns parts to voices, not to a ' +
  'destination box or mixer channel, so there is no authored endpoint to cable to — and ' +
  'inventing one would be a plausible fiction. The output jacks are drawn; what they run to ' +
  'is yours. The guide’s rig phase lists each box’s outputs in words.'

/** Said on the page, because a drawing should state what it is and is not claiming. */
export const SCALE_CAVEAT =
  'Panels are to scale against each other in both dimensions, from each manifest’s cited ' +
  'front-panel span and rise. The controls are a simplified original drawing read off each ' +
  'manual’s hardware overview: the clusters sit where they sit on the box, the detail does not. ' +
  'No vendor artwork is used, and a box nobody has drawn yet gets a plain panel rather than a ' +
  'guessed one.'

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * A cable hangs, and a longer run hangs lower — that is the whole of the physics here, and it is
 * what makes two cables from the same jack legible as two cables rather than one thick one. The
 * gradient is gentle and the cap is well inside `CABLE_ROOM_MM`, so nothing ever escapes the
 * figure.
 *
 * The earlier version was proportional with a tight cap, and every cable in a real three-box rig
 * hit the cap and drew the identical curve. Worth keeping in mind: a cap low enough to be hit by
 * the ordinary case is not a cap, it is a constant.
 *
 * Control points share the endpoints' x, which puts the lowest point of the curve midway between
 * the jacks and keeps the exit from each jack vertical, the way a real cable leaves a socket.
 */
const SAG_BASE_MM = 9
const SAG_PER_MM = 0.07
const SAG_MAX_MM = 70

export function sagFor(from: Point, to: Point): number {
  const distance = Math.abs(to.x - from.x)
  return Math.min(SAG_BASE_MM + distance * SAG_PER_MM, SAG_MAX_MM)
}

export function cablePath(from: Point, to: Point): string {
  const sag = sagFor(from, to)
  const c1 = { x: from.x, y: from.y + sag }
  const c2 = { x: to.x, y: to.y + sag }
  return `M ${round(from.x)} ${round(from.y)} C ${round(c1.x)} ${round(c1.y)}, ${round(c2.x)} ${round(c2.y)}, ${round(to.x)} ${round(to.y)}`
}

/**
 * Fixed decimals, never `toLocaleString`: path data goes into markup that a snapshot or a diff
 * compares byte for byte, and ICU formatting varies by platform (invariant 6's rule, applied
 * outside the resolver because the reason is the same). Two places is finer than an SVG renderer
 * can show at these scales.
 */
function round(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

// ---------------------------------------------------------------------------
// Panel contents, from the manifest and nothing else
// ---------------------------------------------------------------------------

function jacksFor(device: Device, span: number, rise: number): { jacks: PanelJack[]; hidden: number } {
  const jacks: PanelJack[] = []
  const y = rise + RAIL_MM / 2

  // Out on the right, in on the left, so a cable crosses the gap between panels rather than the
  // face of one.
  if (device.clock.canSendClock) {
    jacks.push({
      id: 'clock-out',
      label: 'CLK OUT',
      kind: 'clock-out',
      at: { x: span - JACK_SIDE_MM, y },
    })
  }
  if (device.clock.canReceiveClock) {
    jacks.push({ id: 'clock-in', label: 'CLK IN', kind: 'clock-in', at: { x: JACK_SIDE_MM, y } })
  }

  // Main first, then the individual outs the manifest declares — ten of them on a TR-1000 is a
  // real and visible property of that box, and drawing them costs no device-specific code.
  const mains = device.io.main === 'stereo' ? ['L', 'R'] : ['OUT']
  const individuals = Array.from({ length: device.io.individualOuts }, (_, i) => `${i + 1}`)
  const wanted = [...mains, ...individuals]
  const room = Math.max(0, Math.floor((span - OUT_START_MM - JACK_SIDE_MM - 9) / OUT_PITCH_MM) + 1)
  const shown = wanted.slice(0, room)

  shown.forEach((label, i) => {
    jacks.push({
      id: i < mains.length ? `main-${label}` : `out-${label}`,
      label,
      kind: i < mains.length ? 'main-out' : 'individual-out',
      at: { x: OUT_START_MM + OUT_PITCH_MM * i, y },
    })
  })

  return { jacks, hidden: wanted.length - shown.length }
}

type Rect = { x: number; y: number; w: number; h: number }

/**
 * Cells come from `expand`, not from `voices`, so the drawing and the resolver are looking at the
 * same list: one cell per assignable, pool ordinals folded in exactly as assignment sees them.
 *
 * The column count is **chosen to fill the region**, not fixed. That matters because the region
 * is authored: the TR-1000's instrument row is 314 x 22 mm and wants one row of ten, the Deluge's
 * pad area is 248 x 124 and wants four rows of six, the Tracker Mini's screen is 106 x 62 and
 * wants two banks of two rows of four. One constant cell size cannot serve all three, and a
 * region that is mostly empty reads as a panel with fewer voices than the box has.
 */
function banksFor(
  device: Device,
  occupiedVoiceIds: ReadonlySet<string>,
  rect: Rect,
): { banks: PanelBank[]; hidden: number } {
  const poolLabel = new Map<string, string>()
  for (const voice of device.voices) {
    if (voice.kind === 'pool') poolLabel.set(voice.id, voice.label)
  }

  const grouped = new Map<string, { label: string; items: { voiceId: string; label: string }[] }>()
  for (const assignable of expand(device)) {
    const key = assignable.poolId ?? '(fixed)'
    const bucket = grouped.get(key) ?? {
      label: assignable.poolId === undefined ? 'VOICES' : (poolLabel.get(assignable.poolId) ?? key),
      items: [],
    }
    bucket.items.push({
      voiceId: assignable.voiceId,
      // A pool cell is numbered: 'Track 7' repeated eight times is a wall of the word 'Track'.
      label: assignable.ordinal === undefined ? assignable.label : `${assignable.ordinal}`,
    })
    grouped.set(key, bucket)
  }

  const buckets = [...grouped]
  if (buckets.length === 0) return { banks: [], hidden: 0 }

  // Bank labels only earn their space when there is more than one bank to tell apart.
  const labelMm = buckets.length > 1 ? BANK_LABEL_MM : 0
  const most = Math.max(...buckets.map(([, b]) => b.items.length))

  let best: { cols: number; cellW: number; cellH: number } | undefined
  for (let cols = 1; cols <= most; cols++) {
    const cellW = (rect.w - CELL_GAP_MM * (cols - 1)) / cols
    if (cellW < MIN_CELL_W_MM) break
    const rows = buckets.reduce((sum, [, b]) => sum + Math.ceil(b.items.length / cols), 0)
    const spare =
      rect.h - labelMm * buckets.length - CELL_GAP_MM * (rows - buckets.length) - CELL_GAP_MM * (buckets.length - 1)
    const cellH = Math.min(cellW * CELL_ASPECT, spare / rows)
    if (cellH < MIN_CELL_H_MM) continue
    // Maximise cell area rather than taking the first fit: the first fit is a tall thin column.
    if (best === undefined || cellW * cellH > best.cellW * best.cellH) best = { cols, cellW, cellH }
  }

  if (best === undefined) {
    return { banks: [], hidden: buckets.reduce((n, [, b]) => n + b.items.length, 0) }
  }

  const banks: PanelBank[] = []
  let y = rect.y
  for (const [id, bucket] of buckets) {
    const labelY = y
    y += labelMm
    const cells: PanelCell[] = bucket.items.map((item, i) => ({
      voiceId: item.voiceId,
      label: item.label,
      occupied: occupiedVoiceIds.has(item.voiceId),
      x: rect.x + (i % best.cols) * (best.cellW + CELL_GAP_MM),
      y: y + Math.floor(i / best.cols) * (best.cellH + CELL_GAP_MM),
      w: best.cellW,
      h: best.cellH,
    }))
    const rows = Math.ceil(bucket.items.length / best.cols)
    y += rows * best.cellH + CELL_GAP_MM * rows
    banks.push({ id, label: bucket.label, labelY, cells })
  }

  return { banks, hidden: 0 }
}

/** The region the resolver writes into: the authored `voices` feature, or the fallback field. */
function voiceRect(span: number, rise: number, layout: PanelLayout | undefined): Rect {
  const authored = layout?.features.find((f) => f.kind === 'voices')
  if (authored !== undefined) {
    return { x: authored.x, y: authored.y, w: authored.w, h: authored.h }
  }
  return { x: MARGIN_MM, y: PLATE_MM, w: span - 2 * MARGIN_MM, h: rise - PLATE_MM - MARGIN_MM }
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

export type RackModel = {
  panels: readonly RackPanel[]
  cables: readonly ClockCable[]
  /** Full layout width in mm, panels plus the gaps between them. */
  totalMm: number
  /** Tallest panel block plus the room the cables hang in — the figure's height, not a panel's. */
  heightMm: number
  /** `undefined` when nothing in the rig can send clock (§7.4). */
  clockSource: ResolveResult['clockSource']
  /** Boxes the clock cannot reach, in panel order. Rendered as a stated fact, not hidden. */
  isolated: readonly RackPanel[]
}

/**
 * A box is on the end of a clock cable when it can receive one *and* speaks the transport the
 * resolver actually chose (§7.4 picks one transport, not a set). A box that receives clock but
 * only over USB, in a rig clocked over MIDI DIN, is genuinely not connected — saying so is the
 * point.
 */
function isolationReason(device: Device, transport: string): string | undefined {
  if (!device.clock.canReceiveClock) return 'cannot receive clock'
  if (!device.clock.transport.includes(transport)) {
    return `no ${transport} — this box has ${device.clock.transport.join(', ')}`
  }
  return undefined
}

export function rackModel(result: ResolveResult): RackModel {
  const parts = occupiedCounts(result.assignments)

  const occupiedByDevice = new Map<DeviceId, Set<string>>()
  const patchByDevice = new Map<DeviceId, { from: string; to: string; note?: string }[]>()
  for (const assignment of result.assignments) {
    const set = occupiedByDevice.get(assignment.deviceId) ?? new Set<string>()
    set.add(assignment.assignable.voiceId)
    occupiedByDevice.set(assignment.deviceId, set)

    if (assignment.patch.length === 0) continue
    const list = patchByDevice.get(assignment.deviceId) ?? []
    list.push(...assignment.patch)
    patchByDevice.set(assignment.deviceId, list)
  }

  const source = result.clockSource

  // Bottom-aligned, so every panel's rail — and therefore every clock socket — is on one line,
  // the way boxes of different depths sit on one desk.
  const blockOf = (device: Device) => (device.panel?.panelRiseMm ?? PANEL_HEIGHT_MM) + RAIL_MM
  const tallest =
    result.devices.length === 0 ? 0 : Math.max(...result.devices.map((d) => blockOf(d)))

  // Registry order, which is the resolver's own device order (§7.2) — so the rack does not
  // reorder itself when a reroll changes which box carries the most parts.
  let x = 0
  const panels: RackPanel[] = result.devices.map((device) => {
    const span = device.physical.panelSpanMm
    const layout = device.panel
    const rise = layout?.panelRiseMm ?? PANEL_HEIGHT_MM
    const top = tallest - blockOf(device)

    const { jacks, hidden: hiddenJacks } = jacksFor(device, span, rise)
    const { banks, hidden: hiddenCells } = banksFor(
      device,
      occupiedByDevice.get(device.id) ?? new Set<string>(),
      voiceRect(span, rise, layout),
    )

    const railY = top + rise + RAIL_MM / 2
    const panel: RackPanel = {
      deviceId: device.id,
      name: device.name,
      maker: device.maker,
      kind: device.kind,
      spanMm: span,
      riseMm: rise,
      xMm: x,
      topMm: top,
      generated: layout === undefined,
      spanVerified: device.physical.verified,
      clockRole: 'isolated',
      parts: parts.get(device.id) ?? 0,
      jacks,
      banks,
      hiddenCells,
      hiddenJacks,
      internalPatch: patchByDevice.get(device.id) ?? [],
      outAt: { x: x + span - JACK_SIDE_MM, y: railY },
      inAt: { x: x + JACK_SIDE_MM, y: railY },
    }
    if (layout !== undefined) {
      panel.layout = layout
      panel.layoutVerified = layout.verified
    }
    x += span + PANEL_GAP_MM

    if (source === undefined) {
      panel.isolatedReason = 'no clock source in this rig'
      return panel
    }
    if (device.id === source.deviceId) {
      panel.clockRole = 'source'
      return panel
    }
    const reason = isolationReason(device, source.transport)
    if (reason === undefined) panel.clockRole = 'receiver'
    else panel.isolatedReason = reason
    return panel
  })

  const totalMm = panels.length === 0 ? 0 : x - PANEL_GAP_MM

  const sourcePanel = panels.find((p) => p.clockRole === 'source')
  const cables: ClockCable[] =
    source === undefined || sourcePanel === undefined
      ? []
      : panels
          .filter((p) => p.clockRole === 'receiver')
          .map((target) => {
            // Always CLK OUT to CLK IN, whichever side of the source the target sits on. The
            // tidier-looking rule — leave by whichever edge faces the target — puts the cable in
            // the source's *input* socket for every box to its left, which is a drawing of a
            // patch that does not work. A cable that loops back over its own panel is what that
            // rig actually looks like on a desk.
            const from = sourcePanel.outAt
            const to = target.inAt
            return {
              fromDeviceId: sourcePanel.deviceId,
              toDeviceId: target.deviceId,
              fromName: sourcePanel.name,
              toName: target.name,
              transport: source.transport,
              from,
              to,
              d: cablePath(from, to),
            }
          })

  return {
    panels,
    cables,
    totalMm,
    heightMm: tallest + CABLE_ROOM_MM,
    clockSource: source,
    isolated: panels.filter((p) => p.clockRole === 'isolated'),
  }
}
