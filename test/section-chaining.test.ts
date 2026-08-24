import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  chainPlan,
  renderGuide,
  resolve,
  type ResolveResult,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, droneStudy, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * #105. Drone Study, seed 1: sections of 9, 15, 21, 33, 18, 24 and 12 bars against a 16-bar
 * harmonic cycle, a 16-bar hook and 64-step (4-bar) variants. Nothing divides.
 *
 * The lengths are **not** the bug and must not be rounded — the template's own note says the
 * out-of-phase boundaries are "what stops 132 bars of one note reading as a loop". The bug was
 * that a reader at a Tracker was handed a 9-bar section, a 4-bar pattern and no instruction for
 * the remaining bar, on a box where you chain patterns in Song mode. So these tests pin two
 * things: the arithmetic is right, and the guide says out loud that the lengths are deliberate.
 */

const tracker = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')

const drone = (): ResolveResult =>
  resolve({ devices: tracker, template: droneStudy, mood: NEUTRAL_MOOD, seed: 1 })

/** The same template with its hooks removed, so the part keeps its 4-bar step variant (#100). */
const stepDrone = (): ResolveResult =>
  resolve({
    devices: tracker,
    template: { ...droneStudy, hooks: [] } as Template,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

const techno = (): ResolveResult =>
  resolve({ devices: DEVICES, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 })

function phaseBody(doc: string, phase: number): string {
  const all = doc.split('\n')
  const start = all.findIndex((l) => l.startsWith(`## ${phase}. `))
  expect(start, `phase ${phase} heading`).toBeGreaterThan(-1)
  const rest = all.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

const DELIBERATE = 'Not every section is a whole number of repeats, and that is deliberate.'
const RULE = '9 bars of a 4-bar pattern is 4 + 4 + 1'

describe('sections that are not whole repeats (#105)', () => {
  it('counts full copies and the shortened last one, against a step variant', () => {
    const result = stepDrone()
    const part = result.assignments[0]
    expect(part?.hookAuthority).toBeUndefined()

    // The report's own arithmetic: 9 bars of a 4-bar pattern is 4 + 4 + 1.
    expect(chainPlan(result, part!)).toEqual([
      { section: 'Settle', bars: 9, unitBars: 4, full: 2, remainder: 1 },
      { section: 'Gather', bars: 15, unitBars: 4, full: 3, remainder: 3 },
      { section: 'Tilt', bars: 21, unitBars: 4, full: 5, remainder: 1 },
      { section: 'Vast', bars: 33, unitBars: 4, full: 8, remainder: 1 },
      { section: 'Turn', bars: 18, unitBars: 4, full: 4, remainder: 2 },
    ])
    // Give (24) and Hush (12) are whole multiples of 4 and are simply absent: the guide explains
    // nothing about a section that divides.
  })

  it('measures against the hook where the hook is the pattern (#100)', () => {
    const result = drone()
    const part = result.assignments[0]
    expect(part?.hookAuthority).toBeDefined()

    // Sixteen bars, so a section shorter than one copy is one copy stopped early — never
    // "0 copies", which is a repeat count no box can be given.
    expect(chainPlan(result, part!)).toEqual([
      { section: 'Settle', bars: 9, unitBars: 16, full: 0, remainder: 9 },
      { section: 'Gather', bars: 15, unitBars: 16, full: 0, remainder: 15 },
      { section: 'Tilt', bars: 21, unitBars: 16, full: 1, remainder: 5 },
      { section: 'Vast', bars: 33, unitBars: 16, full: 2, remainder: 1 },
      { section: 'Turn', bars: 18, unitBars: 16, full: 1, remainder: 2 },
      { section: 'Give', bars: 24, unitBars: 16, full: 1, remainder: 8 },
      { section: 'Hush', bars: 12, unitBars: 16, full: 0, remainder: 12 },
    ])
  })

  it('adds up, for every part of every template in the library', () => {
    for (const template of Object.values(TEMPLATES)) {
      const result = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
      for (const a of result.assignments) {
        for (const chain of chainPlan(result, a)) {
          expect(chain.full * chain.unitBars + chain.remainder, chain.section).toBe(chain.bars)
          expect(chain.remainder, chain.section).toBeGreaterThan(0)
          expect(chain.remainder, chain.section).toBeLessThan(chain.unitBars)
        }
      }
    }
  })

  it('says the lengths are deliberate, and how to build the remainder', () => {
    const body = phaseBody(renderGuide(drone()), 5)
    expect(body).toContain(DELIBERATE)
    expect(body).toContain(RULE)
    expect(body).toContain('**Settle** · 9 bars — one copy cut to 9 bars')
    expect(body).toContain('**Vast** · 33 bars — 2 copies of 16 bars, then one cut to 1 bar')

    // The same part with a step variant instead: the report's worked example, in full.
    const stepped = phaseBody(renderGuide(stepDrone()), 5)
    expect(stepped).toContain('**Settle** · 9 bars — 2 copies of 4 bars, then one cut to 1 bar')
    expect(stepped).toContain('**Tilt** · 21 bars — 5 copies of 4 bars, then one cut to 1 bar')
  })

  it('stays quiet where every section divides', () => {
    const result = techno()
    expect(result.assignments.every((a) => chainPlan(result, a).length === 0)).toBe(true)

    const body = phaseBody(renderGuide(result), 5)
    expect(body).not.toContain(DELIBERATE)
    expect(body).not.toContain('copies of')
    expect(renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))).not.toContain(
      'chain-plan',
    )
  })

  it('says it the same way on the page as in the Markdown (§8)', () => {
    const markup = renderToStaticMarkup(createElement(Guide, { result: drone(), seed: 1 }))
    const bare = markup.replace(/<[^>]+>/g, '')
    expect(bare).toContain(DELIBERATE)
    expect(bare).toContain(RULE)
    // Section, bars and the chaining are three spans, not one string: the bar count stays
    // monospace and the row wraps rather than the page (#21).
    expect(markup).toContain('chain-plan')
    expect(bare).toContain('Settle')
    expect(bare).toContain('one copy cut to 9 bars')
    expect(bare).toContain('2 copies of 16 bars, then one cut to 1 bar')
  })
})
