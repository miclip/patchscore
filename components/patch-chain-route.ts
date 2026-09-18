/**
 * #138/#640. The page chain's geometry — no React, no measurement, no DOM.
 *
 * `PatchChain` measures the layout and writes path data onto elements inside a frame callback;
 * everything about *where a run goes* once the sockets and panels are known lives here, so the
 * claims that matter ("a cross-column run travels the gutter rather than being pulled toward it",
 * "the single-column bulge is byte-identical to what it was") are testable without a browser.
 */

export type Point = { x: number; y: number }

/** A column's horizontal extent, in the overlay's coordinates. */
export type Band = { left: number; right: number }

/** A panel's box, in the overlay's coordinates. */
export type Rect = Band & { top: number; bottom: number }

/** How far left of a column's edge the run sits when both ends are in that column. */
export const LANE_INSET = 8

/**
 * The radius of a rounded bend, before it is clamped to the segments either side of it.
 *
 * The casing is 5px wide, the gutter and the row gap are each 16px, and the drop from `out` to
 * the gap below its panel is a little over 30px, so 12 turns inside all of them with room. Every
 * corner takes at most half of each segment it joins, so two bends on one short run share it
 * rather than crossing.
 */
export const BEND = 12

/**
 * The vertical strip a run travels down, chosen from the layout rather than assumed.
 *
 * A fixed page margin was the first attempt and it is right for exactly one layout. Above 900px
 * `.columns` becomes two, and on a phone held sideways that is the layout you get: `out` sits in
 * the left column and the Direction in the right, so routing via the far-left margin swept both
 * runs across the whole page and through the panels between. The screenshot of it is the reason
 * this function exists.
 *
 * The rule is the same one a person stringing a rack would use — go down the nearest empty
 * channel:
 *
 *  - **Ends in different columns** — the gutter *between* them, which is empty by construction.
 *  - **Ends in the same column** — just outside that column's left edge, which is the page
 *    margin for the left column and the same gutter for the right.
 *
 * In a single column both ends share the one band and it reduces to the page margin, which is
 * what the fixed constant used to do. Measured from the panels themselves, so a change to the
 * breakpoint or the gap needs no change here.
 */
export function laneBetween(a: Point, b: Point, bands: readonly Band[]): number {
  const bandA = bands.find((n) => a.x >= n.left && a.x <= n.right)
  const bandB = bands.find((n) => b.x >= n.left && b.x <= n.right)
  if (bandA !== undefined && bandB !== undefined && bandA !== bandB) {
    const [first, second] = bandA.left < bandB.left ? [bandA, bandB] : [bandB, bandA]
    return (first.right + second.left) / 2
  }
  const band = bandA ?? bandB
  return Math.max(4, (band?.left ?? LANE_INSET) - LANE_INSET)
}

/**
 * The y a cross-column run crosses at: the middle of the row gap under the panel `a` sits in.
 *
 * Measured, not assumed. The gap is the grid's, and the grid stretches every panel in a row to
 * the same bottom, so the strip between the source panel's bottom and the top of the next row
 * down is empty across the whole page — the horizontal leg of the route can travel it without
 * meeting a card. Found from the panels themselves: the nearest panel top at or below the source
 * panel's bottom is the next row.
 *
 * With nothing below — the socket's panel is the last row — it settles half a gutter under the
 * panel, which is where the gap's middle would be. A socket in no panel at all is not a layout
 * this page has; the run then leaves at its own height, which is the horizontal exit the
 * same-column route already makes.
 */
export function crossingBelow(a: Point, panels: readonly Rect[]): number {
  const own = panels.find(
    (p) => a.x >= p.left && a.x <= p.right && a.y >= p.top && a.y <= p.bottom,
  )
  if (own === undefined) return a.y
  let next: number | undefined
  for (const p of panels) {
    if (p === own || p.top < own.bottom - 0.5) continue
    if (next === undefined || p.top < next) next = p.top
  }
  return next === undefined ? own.bottom + LANE_INSET : (own.bottom + next) / 2
}

/**
 * Path data for one run, from socket `a` to socket `b`.
 *
 * Controls level with their own endpoints, so the run leaves each socket *horizontally*, travels
 * the channel and enters the next one horizontally. Offsetting them along the span instead
 * pulled the curve diagonally and its shoulder clipped the panel headings.
 *
 * **Except when the channel is on the far side of the socket.** `out` carries its own label
 * immediately to its right and the legend directly above, so both a horizontal exit and an
 * upward one crossed text; and across two columns the channel is the gutter, which one cubic
 * cannot *reach and then travel* — it can only be pulled toward it, and at 1400px that pull was a
 * long diagonal through a device row, the clock sentence and the `out` label (#640). So that
 * route is a loom's, in straight legs with rounded bends: down out of the socket to the row gap
 * under its panel, along the gap to the gutter, along the gutter to the far socket's height, and
 * in. Every leg is in a strip the layout keeps empty, which is the property the cubic could not
 * offer.
 *
 * The same-column cubic is untouched: it was right, and the single-column page is the one this is
 * read on at the machine (#21).
 */
export function chainPath(a: Point, b: Point, lane: number, crossing: number): string {
  if (lane <= a.x) {
    return `M ${r(a.x)} ${r(a.y)} C ${r(lane)} ${r(a.y)}, ${r(lane)} ${r(b.y)}, ${r(b.x)} ${r(b.y)}`
  }
  return rounded([a, { x: a.x, y: crossing }, { x: lane, y: crossing }, { x: lane, y: b.y }, b])
}

/**
 * An axis-aligned polyline with every corner filleted.
 *
 * Each bend is a quadratic with the corner as its control point, which turns a right angle into
 * a quarter-round without the arc command's sweep bookkeeping. A corner's radius is `BEND`
 * clamped to half of each leg it joins, so a short leg gives up its bends before it gives up its
 * length. A leg that measures zero — the far socket level with the crossing, say — is dropped
 * before any corner is cut on it, and the two legs it joined then run straight through the
 * point where it was rather than bending there.
 */
function rounded(points: readonly Point[]): string {
  const pts: Point[] = []
  for (const p of points) {
    const prev = pts.at(-1)
    if (prev === undefined || r(p.x) !== r(prev.x) || r(p.y) !== r(prev.y)) pts.push(p)
  }
  const [first, ...rest] = pts
  if (first === undefined) return ''
  let d = `M ${r(first.x)} ${r(first.y)}`
  let prev = first
  for (const [i, cur] of rest.entries()) {
    const next = rest[i + 1]
    if (next === undefined) {
      d += ` L ${r(cur.x)} ${r(cur.y)}`
      break
    }
    // No turn here: the legs either side run the same way, so the line goes straight through.
    if ((cur.x - prev.x) * (next.y - cur.y) === (cur.y - prev.y) * (next.x - cur.x)) continue
    const into = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const out = Math.hypot(next.x - cur.x, next.y - cur.y)
    const radius = Math.min(BEND, into / 2, out / 2)
    const enter = {
      x: cur.x + ((prev.x - cur.x) / into) * radius,
      y: cur.y + ((prev.y - cur.y) / into) * radius,
    }
    const leave = {
      x: cur.x + ((next.x - cur.x) / out) * radius,
      y: cur.y + ((next.y - cur.y) / out) * radius,
    }
    d += ` L ${r(enter.x)} ${r(enter.y)} Q ${r(cur.x)} ${r(cur.y)} ${r(leave.x)} ${r(leave.y)}`
    prev = cur
  }
  return d
}

/** Two decimals is under a tenth of a device pixel here, and keeps the path data short. */
export function r(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}
