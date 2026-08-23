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
 * Room under **each row** for the cables to hang in — the cable corridor.
 *
 * This is the layout decision the drawing turns on, so it is worth saying why. The first cut put
 * the clock jacks on a top rail, which is where they sit on most of these boxes — and every
 * cable then draped across the face of every panel between its two ends, over exactly the voice
 * cells the panel exists to show. Jacks on a **bottom** rail, cables hanging below the rack, and
 * nothing occludes anything. It is also what a rack looks like from the front: the loom hangs.
 *
 * Height costs nothing here, because the diagram is fitted to width — adding room below does not
 * shrink the panels, it only makes the figure taller.
 *
 * With rows (#63) every row gets one, including the last: an inter-row cable approaches its
 * target's CLK IN from *underneath*, so the bottom row needs a corridor as much as the others.
 */
const CABLE_ROOM_MM = 62

// ---------------------------------------------------------------------------
// Rows (#63)
// ---------------------------------------------------------------------------

/**
 * How many panels a row may hold, by viewport width.
 *
 * **A hard cap, not a minimum panel width.** The number the human gave is "about three devices
 * wide maximum on a phone", and a cap honours that number directly and is checkable by counting.
 * A minimum-width rule would instead fit four narrow boxes across and three wide ones, so two
 * rigs of the same size would wrap differently — adaptive, and inconsistent in exactly the way
 * a rack is not.
 *
 * The consequence has to be said out loud: capping the *count* means a row of three narrow boxes
 * is physically shorter than a row of three wide ones. Rows are therefore **ragged**, and a short
 * row is never stretched to justify it — stretching would break the one thing §10 promises, which
 * is that a millimetre is the same length everywhere in the figure.
 */
export const ROW_CAPS = [
  { minPx: 1024, perRow: 5 },
  { minPx: 768, perRow: 4 },
  { minPx: 0, perRow: 3 },
] as const

/**
 * The narrow cap, and the one the server renders with.
 *
 * There is no viewport on the server, so the first paint has to guess. It guesses *narrow*: three
 * across is legible at every width, where five across is legible at exactly one of them. A desktop
 * reader sees the row count widen on hydration; a phone reader — the one #63 is about — sees the
 * right layout from the first frame, and so does anyone with JavaScript off.
 */
export const NARROW_PER_ROW = 3

/** The cap for a viewport width in CSS pixels. */
export function perRowForWidth(px: number): number {
  for (const tier of ROW_CAPS) {
    if (px >= tier.minPx) return tier.perRow
  }
  return NARROW_PER_ROW
}

/**
 * Cable gutters: reserved vertical corridors down the left and right of the panel band, where an
 * inter-row cable makes its descent. Width is `MARGIN + LANE * cables`, and **zero when no cable
 * uses that side** — so a rig that fits on one row is laid out exactly as it was before rows
 * existed, to the millimetre.
 */
const GUTTER_MARGIN_MM = 10
const GUTTER_LANE_MM = 9

/**
 * The band inside a corridor where inter-row cables run horizontally, measured down from the
 * rail. It starts below the deepest ordinary sag rather than at the top of the corridor, so a
 * routed cable reads as a separate run from the ones hanging off the same rail instead of
 * threading between them.
 */
const LANE_TOP_MM = 34
const LANE_BOTTOM_MM = CABLE_ROOM_MM - 6

/** Corner radius on a routed run. A cable bends, it does not mitre. */
const CORNER_MM = 7

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

/**
 * §10. How wide a cell may be relative to its height before it stops reading as the pad, button
 * or fader it stands for and starts reading as a strip of nothing.
 *
 * Exported because `test/rack.test.ts` asserts the same number against every drawn panel, and two
 * copies of a contract are two contracts. `CELL_ASPECT` bounds the *other* end: a cell is never
 * taller than `1 / CELL_ASPECT` — about 1.28 — so only the wide end needs a ceiling.
 */
export const MAX_CELL_ASPECT = 3

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
  /** Which row this panel wrapped onto, counting from zero. Registry order fills rows in turn. */
  row: number
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
 * A cable, as geometry rather than as a string.
 *
 * The `d` attribute is the *output*; keeping the segments is what lets a test walk the path and
 * assert where it does and does not go. A claim like "no cable crosses a panel" is only worth
 * making if something can check it, and nothing can check a string.
 */
export type PathSeg =
  | { kind: 'line'; to: Point }
  | { kind: 'quad'; c: Point; to: Point }
  | { kind: 'cubic'; c1: Point; c2: Point; to: Point }

export type CableGeometry = { start: Point; segs: readonly PathSeg[] }

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
  /**
   * `same-row` is the hanging bézier this drawing has always used. `inter-row` is a routed run
   * through the reserved gutters — a cable that has to get past a row of panels, and does it the
   * way a loom does, round the side rather than across the faces.
   */
  routing: 'same-row' | 'inter-row'
  /** The segments, in order, from `from` to `to`. */
  path: CableGeometry
  /** Those segments as SVG path data. */
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

/** The hanging cable: one cubic, sagging under its own weight between two jacks on one rail. */
export function sagCurve(from: Point, to: Point): CableGeometry {
  const sag = sagFor(from, to)
  return {
    start: from,
    segs: [
      { kind: 'cubic', c1: { x: from.x, y: from.y + sag }, c2: { x: to.x, y: to.y + sag }, to },
    ],
  }
}

/**
 * A routed run: the polyline through `points`, with its corners rounded.
 *
 * The corner is a quadratic whose control point *is* the mitre, so the curve stays inside the
 * corner it replaces. That is what makes the containment argument work: round a route whose
 * straight segments clear the panels and the rounded version clears them too, because rounding
 * only ever cuts material away from the outside of a bend.
 */
export function routedPath(points: readonly Point[], radius = CORNER_MM): CableGeometry {
  // Consecutive duplicates would divide by zero below, and they happen honestly: a cable whose
  // jack sits exactly over its lane has no horizontal run to make.
  const via: Point[] = []
  for (const p of points) {
    const last = via[via.length - 1]
    if (last === undefined || last.x !== p.x || last.y !== p.y) via.push(p)
  }
  const first = via[0]
  const last = via[via.length - 1]
  if (first === undefined || last === undefined) return { start: { x: 0, y: 0 }, segs: [] }
  if (via.length < 3) return { start: first, segs: [{ kind: 'line', to: last }] }

  const segs: PathSeg[] = []
  for (let i = 1; i < via.length - 1; i++) {
    const before = via[i - 1]
    const corner = via[i]
    const after = via[i + 1]
    if (before === undefined || corner === undefined || after === undefined) continue
    const inLen = Math.hypot(corner.x - before.x, corner.y - before.y)
    const outLen = Math.hypot(after.x - corner.x, after.y - corner.y)
    const r = Math.min(radius, inLen / 2, outLen / 2)
    const enter = {
      x: corner.x - ((corner.x - before.x) / inLen) * r,
      y: corner.y - ((corner.y - before.y) / inLen) * r,
    }
    const leave = {
      x: corner.x + ((after.x - corner.x) / outLen) * r,
      y: corner.y + ((after.y - corner.y) / outLen) * r,
    }
    segs.push({ kind: 'line', to: enter }, { kind: 'quad', c: corner, to: leave })
  }
  segs.push({ kind: 'line', to: last })
  return { start: first, segs }
}

/** SVG path data for a geometry. The only place path syntax is written. */
export function pathD(path: CableGeometry): string {
  const parts = [`M ${round(path.start.x)} ${round(path.start.y)}`]
  for (const seg of path.segs) {
    if (seg.kind === 'line') {
      parts.push(`L ${round(seg.to.x)} ${round(seg.to.y)}`)
    } else if (seg.kind === 'quad') {
      parts.push(`Q ${round(seg.c.x)} ${round(seg.c.y)}, ${round(seg.to.x)} ${round(seg.to.y)}`)
    } else {
      parts.push(
        `C ${round(seg.c1.x)} ${round(seg.c1.y)}, ${round(seg.c2.x)} ${round(seg.c2.y)}, ${round(seg.to.x)} ${round(seg.to.y)}`,
      )
    }
  }
  return parts.join(' ')
}

export function cablePath(from: Point, to: Point): string {
  return pathD(sagCurve(from, to))
}

/**
 * Walk a path. `per` is samples per segment, endpoints included.
 *
 * This exists for the tests, and says so: "the cable does not cross a panel" is the claim the
 * routing is for, and the honest way to check it is to walk the drawn geometry rather than to
 * re-derive it from the same numbers that produced it.
 */
export function samplePath(path: CableGeometry, per = 48): readonly Point[] {
  const points: Point[] = [path.start]
  let at = path.start
  for (const seg of path.segs) {
    for (let i = 1; i <= per; i++) {
      const t = i / per
      if (seg.kind === 'line') {
        points.push({ x: at.x + (seg.to.x - at.x) * t, y: at.y + (seg.to.y - at.y) * t })
      } else if (seg.kind === 'quad') {
        const u = 1 - t
        points.push({
          x: u * u * at.x + 2 * u * t * seg.c.x + t * t * seg.to.x,
          y: u * u * at.y + 2 * u * t * seg.c.y + t * t * seg.to.y,
        })
      } else {
        const u = 1 - t
        points.push({
          x: u ** 3 * at.x + 3 * u * u * t * seg.c1.x + 3 * u * t * t * seg.c2.x + t ** 3 * seg.to.x,
          y: u ** 3 * at.y + 3 * u * u * t * seg.c1.y + 3 * u * t * t * seg.c2.y + t ** 3 * seg.to.y,
        })
      }
    }
    at = seg.to
  }
  return points
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

  type Fit = { cols: number; cellW: number; cellH: number }
  /**
   * Two incumbents, not one. `shapely` is the best layout whose cells stay under
   * `MAX_CELL_ASPECT`; `any` is the best layout that merely fits at all.
   *
   * Area alone picks the wrong one on a *shallow* region, and by a margin far too thin to be
   * carrying the decision. A device authoring an instrument-button row of 237.7 x 18 mm for
   * eleven buttons — a 13:1 strip — gets 18.9 x 14.7 mm cells at eleven columns and 37.1 x 7.5
   * at six. Those are 278.1 mm2 and 278.4 mm2: the old rule chose two rows of slabs over one row
   * of buttons on a **0.3 mm2** difference, three parts in a thousand. Area cannot tell a
   * 1.28:1 cell from a 4.95:1 one at all, so it was never going to be the rule that did.
   *
   * The shape is a property of shallow rows, not of one device. A 314 x 22 mm row is the same
   * shape and escaped only because ten voices happened to fit its width; the eleventh voice
   * would have tipped it the same way.
   */
  let shapely: Fit | undefined
  let any: Fit | undefined
  for (let cols = 1; cols <= most; cols++) {
    const cellW = (rect.w - CELL_GAP_MM * (cols - 1)) / cols
    if (cellW < MIN_CELL_W_MM) break
    const rows = buckets.reduce((sum, [, b]) => sum + Math.ceil(b.items.length / cols), 0)
    const spare =
      rect.h - labelMm * buckets.length - CELL_GAP_MM * (rows - buckets.length) - CELL_GAP_MM * (buckets.length - 1)
    const cellH = Math.min(cellW * CELL_ASPECT, spare / rows)
    if (cellH < MIN_CELL_H_MM) continue
    const fit = { cols, cellW, cellH }
    // Maximise cell area rather than taking the first fit: the first fit is a tall thin column.
    if (any === undefined || cellW * cellH > any.cellW * any.cellH) any = fit
    if (cellW / cellH > MAX_CELL_ASPECT) continue
    if (shapely === undefined || cellW * cellH > shapely.cellW * shapely.cellH) shapely = fit
  }

  /**
   * **The ceiling is a preference, never a veto**, and the order of these two lines is the whole
   * of that rule. A region so shallow that *no* column count comes in under the ceiling still
   * gets the best layout that fits, squat cells and all — drawing the voices badly is a cost,
   * failing to draw them is a bug, and the second is what a strict ceiling would have shipped on
   * the first device nobody has authored yet. The empty return below stays reserved for its
   * original meaning: nothing fits this region at all, so §10's "not drawn" sentence is honest.
   */
  const best = shapely ?? any
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

/** One row of the rack, and the block of the figure it owns. */
export type RackRow = {
  index: number
  /** The panels on it, in registry order. */
  panels: readonly RackPanel[]
  /** Top of the row's panel block, layout mm. */
  topMm: number
  /** Height of the block: the tallest panel on the row, plus its rail. */
  blockMm: number
  /** Panels plus the gaps between them. Ragged by design — a short row is never stretched. */
  widthMm: number
  /** Top of the cable corridor under this row. */
  corridorMm: number
}

export type RackModel = {
  panels: readonly RackPanel[]
  /** The same panels, grouped. `rows.length` is 1 for a rig that fits the cap. */
  rows: readonly RackRow[]
  cables: readonly ClockCable[]
  /** The per-row cap this layout was built with, so a caller can say what it is showing. */
  perRow: number
  /** Figure width in mm: the widest row, plus whatever cable gutters were reserved. */
  totalMm: number
  /**
   * Millimetres of actual front panel — the sum of the cited spans. Unlike `totalMm` this does
   * not move when the layout wraps, which is what makes it the number the caption should quote.
   */
  frontPanelMm: number
  /** Every row block plus its corridor — the figure's height, not a panel's. */
  heightMm: number
  /** Width of the reserved left cable gutter, mm. Zero when no cable needs it. */
  leftGutterMm: number
  /** Width of the reserved right cable gutter, mm. Zero when no cable needs it. */
  rightGutterMm: number
  /** `undefined` when nothing in the rig can send clock (§7.4). */
  clockSource: ResolveResult['clockSource']
  /** Boxes the clock cannot reach, in panel order. Rendered as a stated fact, not hidden. */
  isolated: readonly RackPanel[]
}

export type RackLayoutOptions = {
  /** Hard cap on panels per row. Defaults to the narrow cap — see `NARROW_PER_ROW`. */
  perRow?: number
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

export function rackModel(result: ResolveResult, options: RackLayoutOptions = {}): RackModel {
  const perRow = Math.max(1, Math.floor(options.perRow ?? NARROW_PER_ROW))
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

  // Bottom-aligned within a row, so every panel's rail on that row — and therefore every clock
  // socket on it — is on one line, the way boxes of different depths sit on one desk.
  const blockOf = (device: Device) => (device.panel?.panelRiseMm ?? PANEL_HEIGHT_MM) + RAIL_MM

  /**
   * Registry order, which is the resolver's own device order (§7.2), chunked at the cap — so the
   * rack does not reorder itself when a reroll changes which box carries the most parts, and does
   * not reorder itself when it wraps either. Grouping by clock role would shorten the cables and
   * cost the one property that makes the picture stable between rerolls.
   */
  const chunks: Device[][] = []
  result.devices.forEach((device, index) => {
    if (index % perRow === 0) chunks.push([])
    chunks[chunks.length - 1]?.push(device)
  })

  /**
   * Pass one: rows and each panel's x *within the panel band*, before the gutters exist.
   *
   * Gutter width depends on how many cables use each side, which depends on where the panels are
   * — but only on their offsets relative to one another, and a common left shift does not change
   * those. So the two can be computed in order rather than solved together.
   */
  type Placed = { device: Device; row: number; localX: number; topMm: number }
  const placed: Placed[] = []
  const rowTops: number[] = []
  const rowBlocks: number[] = []
  const rowWidths: number[] = []
  let y = 0
  chunks.forEach((chunk, row) => {
    const block = Math.max(...chunk.map(blockOf))
    let localX = 0
    for (const device of chunk) {
      placed.push({ device, row, localX, topMm: y + block - blockOf(device) })
      localX += device.physical.panelSpanMm + PANEL_GAP_MM
    }
    rowTops.push(y)
    rowBlocks.push(block)
    rowWidths.push(localX - PANEL_GAP_MM)
    y += block + CABLE_ROOM_MM
  })
  const bandMm = rowWidths.length === 0 ? 0 : Math.max(...rowWidths)
  const heightMm = y

  const clockOf = (device: Device): { role: ClockRole; reason?: string } => {
    if (source === undefined) return { role: 'isolated', reason: 'no clock source in this rig' }
    if (device.id === source.deviceId) return { role: 'source' }
    const reason = isolationReason(device, source.transport)
    return reason === undefined ? { role: 'receiver' } : { role: 'isolated', reason }
  }

  // Jack positions relative to the band, which is all the side choice below needs.
  const localOut = (p: Placed) => p.localX + p.device.physical.panelSpanMm - JACK_SIDE_MM
  const localIn = (p: Placed) => p.localX + JACK_SIDE_MM

  /**
   * Pass two: which cables have to leave their row, and down which side.
   *
   * The side is whichever gutter makes the two horizontal runs shorter, ties to the left. It is
   * arithmetic on numbers that are already fixed, so it is decided the same way on every machine
   * (invariant 6's reasoning, applied to layout).
   */
  const sourceIndex = placed.findIndex((p) => clockOf(p.device).role === 'source')
  type Run = { fromIndex: number; toIndex: number; side?: 'left' | 'right' }
  const runs: Run[] = []
  const from = placed[sourceIndex]
  if (from !== undefined) {
    placed.forEach((target, toIndex) => {
      if (clockOf(target.device).role !== 'receiver') return
      if (target.row === from.row) {
        runs.push({ fromIndex: sourceIndex, toIndex })
        return
      }
      const toLeft = localOut(from) + localIn(target)
      const toRight = bandMm - localOut(from) + (bandMm - localIn(target))
      runs.push({ fromIndex: sourceIndex, toIndex, side: toLeft <= toRight ? 'left' : 'right' })
    })
  }

  const routed = runs.filter((r) => r.side !== undefined)
  const gutterMm = (lanes: number) => (lanes === 0 ? 0 : GUTTER_MARGIN_MM + lanes * GUTTER_LANE_MM)
  const leftLanes = routed.filter((r) => r.side === 'left').length
  const rightLanes = routed.filter((r) => r.side === 'right').length
  const leftGutterMm = gutterMm(leftLanes)
  const rightGutterMm = gutterMm(rightLanes)
  const totalMm = leftGutterMm + bandMm + rightGutterMm

  // Pass three: the panels, now that the band's left edge is known.
  const panels: RackPanel[] = placed.map((p) => {
    const device = p.device
    const span = device.physical.panelSpanMm
    const layout = device.panel
    const rise = layout?.panelRiseMm ?? PANEL_HEIGHT_MM
    const xMm = leftGutterMm + p.localX

    const { jacks, hidden: hiddenJacks } = jacksFor(device, span, rise)
    const { banks, hidden: hiddenCells } = banksFor(
      device,
      occupiedByDevice.get(device.id) ?? new Set<string>(),
      voiceRect(span, rise, layout),
    )

    const railY = p.topMm + rise + RAIL_MM / 2
    const clock = clockOf(device)
    const panel: RackPanel = {
      deviceId: device.id,
      name: device.name,
      maker: device.maker,
      kind: device.kind,
      spanMm: span,
      riseMm: rise,
      xMm,
      topMm: p.topMm,
      row: p.row,
      generated: layout === undefined,
      spanVerified: device.physical.verified,
      clockRole: clock.role,
      parts: parts.get(device.id) ?? 0,
      jacks,
      banks,
      hiddenCells,
      hiddenJacks,
      internalPatch: patchByDevice.get(device.id) ?? [],
      outAt: { x: xMm + span - JACK_SIDE_MM, y: railY },
      inAt: { x: xMm + JACK_SIDE_MM, y: railY },
    }
    if (layout !== undefined) {
      panel.layout = layout
      panel.layoutVerified = layout.verified
    }
    if (clock.reason !== undefined) panel.isolatedReason = clock.reason
    return panel
  })

  const rows: RackRow[] = chunks.map((_, index) => ({
    index,
    panels: panels.filter((p) => p.row === index),
    topMm: rowTops[index] ?? 0,
    blockMm: rowBlocks[index] ?? 0,
    widthMm: rowWidths[index] ?? 0,
    corridorMm: (rowTops[index] ?? 0) + (rowBlocks[index] ?? 0),
  }))

  /**
   * Lanes, so two routed cables sharing a corridor or a gutter do not draw as one.
   *
   * Both are spread across the reserved band rather than stepped at a fixed pitch, because a
   * fixed pitch stops separating cables at exactly the rig size that most needs it: the band is
   * divided into `n + 1` and each cable takes a division. Deterministic, and it never overflows
   * the reservation however many boxes #57 queues up.
   */
  const corridorUse = new Map<number, number>()
  const sideUse = new Map<string, number>()
  for (const run of routed) {
    const source_ = placed[run.fromIndex]
    const target = placed[run.toIndex]
    if (source_ === undefined || target === undefined) continue
    corridorUse.set(source_.row, (corridorUse.get(source_.row) ?? 0) + 1)
    corridorUse.set(target.row, (corridorUse.get(target.row) ?? 0) + 1)
    sideUse.set(run.side ?? 'left', (sideUse.get(run.side ?? 'left') ?? 0) + 1)
  }
  const corridorTaken = new Map<number, number>()
  const sideTaken = new Map<string, number>()

  const laneY = (row: number): number => {
    const taken = corridorTaken.get(row) ?? 0
    corridorTaken.set(row, taken + 1)
    const of = corridorUse.get(row) ?? 1
    const top = (rowTops[row] ?? 0) + (rowBlocks[row] ?? 0)
    return top + LANE_TOP_MM + ((taken + 1) * (LANE_BOTTOM_MM - LANE_TOP_MM)) / (of + 1)
  }
  const channelX = (side: 'left' | 'right'): number => {
    const taken = sideTaken.get(side) ?? 0
    sideTaken.set(side, taken + 1)
    const of = sideUse.get(side) ?? 1
    if (side === 'left') return ((taken + 1) * leftGutterMm) / (of + 1)
    return leftGutterMm + bandMm + ((taken + 1) * rightGutterMm) / (of + 1)
  }

  const cables: ClockCable[] = runs.flatMap((run) => {
    const sourcePanel = panels[run.fromIndex]
    const target = panels[run.toIndex]
    if (sourcePanel === undefined || target === undefined) return []

    // Always CLK OUT to CLK IN, whichever side of the source the target sits on. The tidier-
    // looking rule — leave by whichever edge faces the target — puts the cable in the source's
    // *input* socket for every box to its left, which is a drawing of a patch that does not work.
    // A cable that loops back over its own panel is what that rig actually looks like on a desk.
    const at = sourcePanel.outAt
    const to = target.inAt

    /**
     * Same row: the hanging bézier, unchanged. Different rows: down into this row's corridor,
     * out to a gutter, down (or up) the side of the frame, along the corridor *under* the target
     * row, and up into its CLK IN.
     *
     * Under, always. A cable arriving from above would have to cross the target's own face to
     * reach a jack on its bottom rail — which is the thing the bottom rail exists to prevent.
     */
    const path =
      run.side === undefined
        ? sagCurve(at, to)
        : (() => {
            const leave = laneY(sourcePanel.row)
            const channel = channelX(run.side)
            const arrive = laneY(target.row)
            return routedPath([
              at,
              { x: at.x, y: leave },
              { x: channel, y: leave },
              { x: channel, y: arrive },
              { x: to.x, y: arrive },
              to,
            ])
          })()

    return [
      {
        fromDeviceId: sourcePanel.deviceId,
        toDeviceId: target.deviceId,
        fromName: sourcePanel.name,
        toName: target.name,
        // `source` is defined whenever a run exists: a run needs a panel whose role is `source`,
        // and `clockOf` only returns that role when the resolver named one.
        transport: source?.transport ?? '',
        from: at,
        to,
        routing: run.side === undefined ? ('same-row' as const) : ('inter-row' as const),
        path,
        d: pathD(path),
      },
    ]
  })

  return {
    panels,
    rows,
    cables,
    perRow,
    totalMm,
    frontPanelMm: panels.reduce((sum, p) => sum + p.spanMm, 0),
    heightMm,
    leftGutterMm,
    rightGutterMm,
    clockSource: source,
    isolated: panels.filter((p) => p.clockRole === 'isolated'),
  }
}
