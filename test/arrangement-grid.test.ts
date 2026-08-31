import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { arrangement, renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { ArrangementGrid } from '../components/guide/song-tables'

/**
 * §4.2/#297. The arrangement as a grid: parts as rows, sections as columns drawn to their bars.
 *
 * The fact was always in the guide and always unreadable — phase 2 prints each part's sections as
 * the tail of a dense bullet, so comparing twelve parts means diffing twelve comma lists, and
 * comparison is the whole job of an arrangement.
 *
 * Two renderers, one derivation. `arrangement()` in `lib/core` decides *what plays where*; the
 * Markdown block and the web table are written twice on purpose (#33), and this file asserts the
 * shared fact once and each vocabulary separately.
 */

const golden = (): ResolveResult =>
  resolve({
    devices: GOLDEN_DEVICES,
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  })

/**
 * A rig that reaches the transient parts, which the golden scenario does not.
 *
 * The golden rig fills every request with a part that runs throughout, so it exercises the
 * `uniform` case and nothing else. `impact` and `riser` are the reason the grid exists — a
 * `transient` request carries its own `sections` (§4.2), and those are the rows a reader is
 * actually looking for — so the varied case needs a rig big enough to be given them.
 */
const varied = (): ResolveResult =>
  resolve({
    devices: DEVICES.filter((d) =>
      ['roland-tr-8s', 'synthstrom-deluge', 'moog-mother-32', 'elektron-digitakt'].includes(d.id),
    ),
    template: industrialTechno,
    mood: GOLDEN_MOOD,
    seed: 3,
  })

describe('the derivation (§4.2)', () => {
  it('has a column per section, in the template’s order and with its bars', () => {
    const result = golden()
    const plan = arrangement(result)
    expect(plan.columns.map((c) => c.name)).toEqual(result.template.structure.map((s) => s.name))
    expect(plan.columns.map((c) => c.bars)).toEqual(result.template.structure.map((s) => s.bars))
    expect(plan.totalBars).toBe(
      result.template.structure.reduce((sum, s) => sum + s.bars, 0),
    )
  })

  it('has a row per assignment, and `plays` agrees with the occupancy it came from', () => {
    const result = golden()
    const plan = arrangement(result)
    expect(plan.rows.map((r) => r.requestId)).toEqual(result.assignments.map((a) => a.requestId))
    for (const [i, row] of plan.rows.entries()) {
      const source = result.assignments[i]
      expect(source).toBeDefined()
      const expected = plan.columns.map((c) => (source as { sections: string[] }).sections.includes(c.name))
      expect(row.plays, row.role).toEqual(expected)
    }
  })

  it('calls a row `throughout` exactly when it plays every section', () => {
    const plan = arrangement(golden())
    for (const row of plan.rows) {
      expect(row.throughout, row.role).toBe(row.plays.every((p) => p))
    }
    expect(plan.uniform).toBe(plan.rows.length > 0 && plan.rows.every((r) => r.throughout))
  })

  /**
   * The whole point of drawing it. If nothing ever varied, the grid would be a picture of one
   * fact and the old table would have been enough — so the library is asserted to contain the
   * variation, not merely the machinery for it.
   */
  it('finds parts that do not play throughout, which is why this is drawn at all', () => {
    const plan = arrangement(varied())
    const partial = plan.rows.filter((r) => !r.throughout)
    expect(partial.length).toBeGreaterThan(0)
    for (const row of partial) {
      expect(row.plays.some((p) => p), `${row.role} plays nowhere`).toBe(true)
    }
  })
})

describe('the Markdown vocabulary', () => {
  const grid = (result: ResolveResult = golden()): string => {
    const md = renderGuide(result)
    const start = md.indexOf('**Arrangement**')
    expect(start).toBeGreaterThan(-1)
    return md.slice(start, md.indexOf('```', md.indexOf('```', start) + 3) + 3)
  }

  it('draws sections to scale, so a 32-bar section is wider than a 16-bar one', () => {
    const plan = arrangement(golden())
    const rows = grid().split('\n')
    const longest = plan.columns.reduce((a, b) => (b.bars > a.bars ? b : a))
    const shortest = plan.columns.reduce((a, b) => (b.bars < a.bars ? b : a))
    expect(longest.bars).toBeGreaterThan(shortest.bars)
    // Read off the header line: the run of characters under each name.
    const header = rows.find((l) => l.includes(longest.name))
    expect(header).toBeDefined()
    const first = plan.rows[0]
    expect(first).toBeDefined()
    const played = rows.find((l) => l.startsWith((first as { role: string }).role))
    expect(played).toBeDefined()
    // The widest section owns the longest unbroken run of block characters in a full row.
    const runs = ((played as string).match(/█+/g) ?? []).map((r) => r.length)
    expect(Math.max(...runs)).toBeGreaterThan(Math.min(...runs))
  })

  it('never truncates a section name to protect the picture', () => {
    const text = grid()
    for (const column of arrangement(golden()).columns) {
      expect(text, `${column.name} was cut to fit`).toContain(column.name)
    }
  })

  it('marks a part absent from a section, not merely present everywhere', () => {
    const plan = arrangement(varied())
    const partial = plan.rows.find((r) => !r.throughout)
    expect(partial).toBeDefined()
    const line = grid(varied())
      .split('\n')
      .find((l) => l.startsWith((partial as { role: string }).role))
    expect(line).toBeDefined()
    expect(line as string).toContain('·')
    expect(line as string).toContain('█')
  })

  it('is byte-identical on a re-render, like every other line of the guide (invariant 6)', () => {
    expect(grid()).toBe(grid())
  })
})

describe('the web vocabulary', () => {
  const markup = (result: ResolveResult = golden()): string =>
    renderToStaticMarkup(createElement(ArrangementGrid, { plan: arrangement(result) }))

  it('sizes columns by bars, so the widths are the arrangement', () => {
    const plan = arrangement(golden())
    const widths = [...markup().matchAll(/<col style="width:([^"]+)"/g)].map((m) => m[1] as string)
    expect(widths).toHaveLength(plan.columns.length)
    const share = (bars: number): string => `${String((bars / plan.totalBars) * 100)}%`
    expect(widths).toEqual(plan.columns.map((c) => share(c.bars)))
  })

  it('gives a screen reader one sentence per part rather than a cell per section', () => {
    const plan = arrangement(varied())
    const html = markup(varied())
    // Cells carry no content and are hidden; the row header carries the whole answer.
    expect(html).toContain('aria-hidden="true"')
    const throughout = plan.rows.find((r) => r.throughout)
    expect(throughout).toBeDefined()
    expect(html).toContain('plays throughout')
    const partial = plan.rows.find((r) => !r.throughout)
    expect(partial).toBeDefined()
    const named = plan.columns
      .filter((_, i) => (partial as { plays: boolean[] }).plays[i])
      .map((c) => c.name)
      .join(', ')
    expect(html).toContain(`plays in ${named}`)
  })

  it('draws a played cell differently from a silent one', () => {
    const html = markup(varied())
    expect(html).toContain('arrangement-on')
    expect(html).toContain('arrangement-off')
  })

  /**
   * #21. The grid fits the width instead of scrolling, unlike every other wide table here, for the
   * reason `CLAUDE.md` gives about the rack diagram: relative width is the point, and an Outro
   * past the right edge is the arrangement with its ending missing.
   */
  it('is laid out to fit rather than to overflow', () => {
    expect(markup()).toContain('class="arrangement"')
    expect(markup()).toContain('<colgroup>')
  })
})
