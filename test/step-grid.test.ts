import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StepGrid } from '../components/pattern/step-grid'
import type { Pattern } from '../lib/core/index'
import {
  STEP_SILENT,
  STEP_SOUNDS,
  renderGuide,
  resolve,
  resolveRiff,
  stepGridRows,
} from '../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { RIFFS } from '../lib/riffs'
import { gridRows } from '../lib/studio/riff-text'
import { renderRiff } from '../lib/studio/riff-markdown'

/**
 * §4.3/§8/#512. **The guide and a riff page draw a step grid from one definition.**
 *
 * A riff links to the device page a guide links to, and a reader compares the two in one sitting,
 * so the marks have to agree. They did agree, in two copies of one function that were never
 * connected — which is a thing that holds until it doesn't. Here so a third surface inherits the
 * figure rather than choosing it.
 *
 * The arrangement row is a different figure with a different mark (§4.2), and it is not this
 * file's subject: `test/arrangement-grid.test.ts` owns it.
 */

const guide = renderGuide(
  resolve({
    devices: GOLDEN_DEVICES,
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  }),
)

/** A step-grid row is a right-aligned step number, a space, then cells in groups of four. */
const STEP_ROW = new RegExp(`^ *\\d+ [${STEP_SOUNDS}${STEP_SILENT}]`)

const stepRowsIn = (markdown: string): string[] =>
  markdown.split('\n').filter((line) => STEP_ROW.test(line))

describe('the drawing (§4.3)', () => {
  it('draws a hit and a rest in the shared marks, sixteen to a row in fours', () => {
    const pattern: Pattern = {
      id: 'fixture-grid',
      forRole: 'kick',
      band: 0,
      length: 32,
      hits: [{ step: 1, slot: 'accent' }],
    }
    expect(stepGridRows(pattern)).toEqual([
      ` 1 ${STEP_SOUNDS}${STEP_SILENT.repeat(3)} ${STEP_SILENT.repeat(4)} ` +
        `${STEP_SILENT.repeat(4)} ${STEP_SILENT.repeat(4)}`,
      `17 ${STEP_SILENT.repeat(4)} ${STEP_SILENT.repeat(4)} ` +
        `${STEP_SILENT.repeat(4)} ${STEP_SILENT.repeat(4)}`,
    ])
  })

  it('is what a riff calls, rather than a copy of it', () => {
    for (const riff of RIFFS) {
      expect(gridRows(riff), riff.id).toEqual(stepGridRows(riff.pattern))
    }
  })
})

describe('the guide and a riff draw the same figure (#512)', () => {
  it('prints step rows on both surfaces, in the same two marks and no others', () => {
    const guideRows = stepRowsIn(guide)
    const riffRows = RIFFS.flatMap((riff) => stepRowsIn(renderRiff(resolveRiff(riff, []))))
    // A guard against an empty match set passing: both surfaces really do print this figure.
    expect(guideRows.length).toBeGreaterThan(4)
    expect(riffRows.length).toBeGreaterThan(4)
    for (const row of [...guideRows, ...riffRows]) {
      const cells = row.slice(row.indexOf(' ', row.search(/\d/)) + 1)
      expect(cells.replace(new RegExp(`[${STEP_SOUNDS}${STEP_SILENT} ]`, 'g'), ''), row).toBe('')
    }
    // Not vacuous: each surface strikes a step somewhere, and the guide rests one.
    expect(guideRows.some((r) => r.includes(STEP_SOUNDS))).toBe(true)
    expect(riffRows.some((r) => r.includes(STEP_SOUNDS))).toBe(true)
    expect(guideRows.some((r) => r.includes(STEP_SILENT))).toBe(true)
  })
})

/**
 * §8/#528. **The React surfaces draw boxes, over the rows above.**
 *
 * A guide has drawn them since it was built and a riff page drew the Markdown's `<pre>`, because
 * `StepGrid` was not exported and this file's own comment said the drawing was the fact. It is
 * not: the marks above are the shared data, the boxes are what a page draws over them, and the
 * rows come along underneath so the figure still copies.
 */
const FIXTURE: Pattern = {
  id: 'fixture-boxes',
  forRole: 'kick',
  band: 0,
  length: 16,
  hits: [
    { step: 1, slot: 'accent' },
    { step: 5, slot: 'downbeat' },
    { step: 8, slot: 'ghost' },
  ],
}

describe('the boxes a React surface draws (#528)', () => {
  const markup = renderToStaticMarkup(createElement(StepGrid, { pattern: FIXTURE }))

  it('fills a cell for every struck step, and marks every fourth', () => {
    expect((markup.match(/class="step(?: on)?(?: beat)?"/g) ?? []).length).toBe(16)
    expect((markup.match(/class="step on(?: beat)?"/g) ?? []).length).toBe(3)
    expect((markup.match(/class="step(?: on)? beat"/g) ?? []).length).toBe(4)
  })

  it('carries the export’s own row as text, so a selection copies the figure', () => {
    // The whole of #528's second half: the boxes are a background colour, and a reader who
    // selected the guide's grid on a phone pasted the step numbers and not one mark of it.
    const rows = [
      ...markup.matchAll(
        /<span class="step-index">(\d+)<\/span><span class="step-text">([^<]*)<\/span>/g,
      ),
    ].map((row) => `${row[1] ?? ''}${row[2] ?? ''}`)
    // The alignment is `.step-index`'s job here, so the padding the export prints is not copied.
    expect(rows).toEqual(stepGridRows(FIXTURE).map((row) => row.trimStart()))
    expect(rows[0]).toContain(STEP_SOUNDS)
    expect(rows[0]).toContain(STEP_SILENT)
  })

  it('names the struck steps to a screen reader, rather than counting them', () => {
    // `4 hits over 16 steps` was a tally, on the one surface where which steps is the content.
    const label = /aria-label="([^"]*)"/.exec(markup)?.[1]
    expect(label).toBe('3 hits over 16 steps, struck on 1, 5, 8')
    expect(markup).toContain('role="img"')
  })
})

describe('one component, not one per surface (#528)', () => {
  it('is imported by both React surfaces rather than re-implemented on either', () => {
    const surfaces = [
      '../components/guide/phase-steps.tsx',
      '../components/riff/riff-figure.tsx',
    ]
    for (const file of surfaces) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')
      expect(source, file).toMatch(/pattern\/step-grid'/)
      expect(source, file).toMatch(/pattern\/slot-list'/)
      // Neither draws a cell of its own, and neither sets the Markdown's rows in a `<pre>`.
      expect(source, file).not.toContain('step-row')
      expect(source, file).not.toContain('step-index')
      expect(source, file).not.toContain('<pre className')
    }
  })
})
