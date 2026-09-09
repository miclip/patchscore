import { describe, expect, it } from 'vitest'
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
