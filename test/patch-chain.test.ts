import { describe, expect, it } from 'vitest'
import {
  BEND,
  chainPath,
  crossingBelow,
  laneBetween,
} from '../components/patch-chain-route'
import type { Point, Rect } from '../components/patch-chain-route'

/**
 * #138/#640. The page chain's route, tested as geometry — the drawing is the component's and is
 * asserted by looking at it, not here.
 *
 * The two layouts below are the ones the issue reproduces at. Coordinates are the overlay's:
 * `.columns` is 768px wide at 800px and 1148px at 1400px, the gutter between the two columns is
 * 16px, and the row gap under the first row is the same 16px.
 */

/** Every coordinate pair in a path, in order, whatever command it belongs to. */
function coords(d: string): Point[] {
  const nums = d.match(/-?\d+(?:\.\d+)?/g) ?? []
  const out: Point[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ x: Number(nums[i]), y: Number(nums[i + 1]) })
  }
  return out
}

const near = (n: number, target: number, within: number) => Math.abs(n - target) <= within

describe('laneBetween picks the channel from the layout', () => {
  const left = { left: 0, right: 566 }
  const right = { left: 582, right: 1148 }
  const full = { left: 0, right: 1148 }
  // Narrowest first, as `measureLayout` sorts them.
  const bands = [left, right, full]

  it('crosses columns through the gutter between them', () => {
    expect(laneBetween({ x: 76, y: 0 }, { x: 655, y: 0 }, bands)).toBe(574)
    expect(laneBetween({ x: 655, y: 0 }, { x: 76, y: 0 }, bands)).toBe(574)
  })

  it('stays in one column just outside its left edge', () => {
    // The right column's channel is the same gutter, by construction.
    expect(laneBetween({ x: 655, y: 0 }, { x: 700, y: 0 }, bands)).toBe(574)
    // The left column's is the page margin, clamped so it never leaves the overlay.
    expect(laneBetween({ x: 76, y: 0 }, { x: 73, y: 0 }, bands)).toBe(4)
  })

  it('reduces to the page margin in a single column', () => {
    expect(laneBetween({ x: 76, y: 443.59 }, { x: 73, y: 668.7 }, [{ left: 0, right: 768 }])).toBe(4)
  })
})

describe('crossingBelow measures the row gap under the source panel', () => {
  const panels: Rect[] = [
    { left: 0, right: 566, top: 0, bottom: 571 },
    { left: 582, right: 1148, top: 0, bottom: 571 },
    { left: 0, right: 566, top: 587, bottom: 800 },
    { left: 582, right: 1148, top: 587, bottom: 800 },
    { left: 0, right: 1148, top: 816, bottom: 1400 },
  ]

  it('is the middle of the gap between the panel and the next row', () => {
    expect(crossingBelow({ x: 76, y: 548 }, panels)).toBe(579)
    // A socket in the right column of the same row finds the same gap.
    expect(crossingBelow({ x: 655, y: 236 }, panels)).toBe(579)
  })

  it('finds the next row down from a panel that is not in the first row', () => {
    expect(crossingBelow({ x: 100, y: 700 }, panels)).toBe(808)
  })

  it('settles half a gutter under the last row', () => {
    expect(crossingBelow({ x: 100, y: 1000 }, panels)).toBe(1408)
  })

  it('leaves a socket in no panel at its own height', () => {
    expect(crossingBelow({ x: 574, y: 300 }, panels)).toBe(300)
  })
})

describe('chainPath keeps the same-column cubic byte for byte', () => {
  it('draws the single-column bulge exactly as before', () => {
    // The 800px path the issue reports as correct.
    const d = chainPath({ x: 76, y: 443.59 }, { x: 73, y: 668.7 }, 4, 0)
    expect(d).toBe('M 76 443.59 C 4 443.59, 4 668.7, 73 668.7')
  })

  it('draws direction → inspiration down the right column the same way', () => {
    // Both in the right column at 1400px, so the lane is the gutter and lies left of the source.
    const a = { x: 655, y: 236.41 }
    const b = { x: 655, y: 900 }
    expect(chainPath(a, b, 574, 579)).toBe('M 655 236.41 C 574 236.41, 574 900, 655 900')
  })

  it('never reaches the crossing on that branch, whatever it is given', () => {
    const a = { x: 76, y: 443.59 }
    const b = { x: 73, y: 668.7 }
    expect(chainPath(a, b, 4, 12345)).toBe(chainPath(a, b, 4, 0))
  })
})

describe('chainPath routes a cross-column run through the row gap and the gutter (#640)', () => {
  // The 1400px case: `out` low in the left column, the Direction high in the right.
  const a = { x: 76, y: 548.59 }
  const b = { x: 655, y: 236.41 }
  const lane = 574
  const crossing = 579
  const d = chainPath(a, b, lane, crossing)
  const pts = coords(d)

  it('starts at the source and ends at the target', () => {
    expect(d.startsWith('M 76 548.59')).toBe(true)
    expect(d.endsWith('L 655 236.41')).toBe(true)
  })

  it('is straight legs with quadratic bends, not one cubic', () => {
    expect(d).not.toContain('C')
    expect(d.match(/Q/g)).toHaveLength(3)
  })

  it('leaves the socket straight down and only travels sideways in the row gap', () => {
    // Between the source column and the gutter, every point is at the crossing — no diagonal
    // sweep through the panel, which is the fault the issue reports.
    const between = pts.filter((p) => p.x >= a.x + BEND && p.x <= lane - BEND)
    expect(between.length).toBeGreaterThan(0)
    for (const p of between) expect(p.y).toBe(crossing)
    // The first leg is the drop: nothing within a bend of the socket's x has left it.
    const drop = pts.filter((p) => p.x < a.x + BEND)
    expect(drop.length).toBeGreaterThan(1)
    for (const p of drop) expect(p.x).toBe(a.x)
  })

  it('climbs the gutter itself rather than being pulled toward it', () => {
    const climb = pts.filter((p) => near(p.x, lane, BEND) && p.y > b.y && p.y < crossing)
    expect(climb.length).toBeGreaterThan(0)
    for (const p of climb) expect(p.x).toBe(lane)
  })

  it('enters the target horizontally at its own height', () => {
    const entry = pts.filter((p) => p.x >= lane + BEND)
    expect(entry.length).toBeGreaterThan(0)
    for (const p of entry) expect(p.y).toBe(b.y)
  })

  it('takes the crossing from the layout, not from a fixed offset', () => {
    // The old branch dropped `a.y + 46` and nothing else; the route has no such number in it.
    expect(d).not.toContain('594.59')
    expect(d).toContain(` ${String(crossing)} `)
    const other = chainPath(a, b, lane, 600)
    expect(other).not.toBe(d)
    expect(coords(other).some((p) => p.y === 600)).toBe(true)
  })

  it('keeps every bend inside the strip it turns in', () => {
    // A bend is BEND from its corner at most, so no point strays into a panel: all x are on the
    // source, the lane or the target, or within a bend of one; the same for y.
    for (const p of pts) {
      expect([a.x, lane, b.x].some((x) => near(p.x, x, BEND))).toBe(true)
      expect([a.y, crossing, b.y].some((y) => near(p.y, y, BEND))).toBe(true)
    }
  })

  it('runs down the gutter when the target is below the crossing', () => {
    const low = { x: 655, y: 900 }
    const down = chainPath(a, low, lane, crossing)
    expect(down.startsWith('M 76 548.59')).toBe(true)
    expect(down.endsWith('L 655 900')).toBe(true)
    const descent = coords(down).filter(
      (p) => near(p.x, lane, BEND) && p.y > crossing && p.y < low.y,
    )
    expect(descent.length).toBeGreaterThan(0)
    for (const p of descent) expect(p.x).toBe(lane)
  })
})

describe('the bends give way before the legs do', () => {
  it('shrinks a bend to half of a short leg', () => {
    // A socket 4px above the crossing: the first leg is 4 long, so its bend is 2, not BEND.
    const a = { x: 76, y: 575 }
    const d = chainPath(a, { x: 655, y: 236 }, 574, 579)
    expect(d.startsWith('M 76 575 L 76 577 Q 76 579 78 579')).toBe(true)
  })

  it('drops a zero-length leg rather than bending on it', () => {
    // The target level with the crossing: the gutter leg vanishes and one corner with it.
    const d = chainPath({ x: 76, y: 548 }, { x: 655, y: 579 }, 574, 579)
    expect(d).toBe('M 76 548 L 76 567 Q 76 579 88 579 L 655 579')
  })

  it('never writes NaN', () => {
    const d = chainPath({ x: 76, y: 579 }, { x: 574, y: 579 }, 574, 579)
    expect(d).not.toContain('NaN')
    expect(d).toBe('M 76 579 L 574 579')
  })
})
