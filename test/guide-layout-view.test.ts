import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { moodState, resolve, sequencerGroups, unplayedHooks } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §8/#230/#33. **The web guide's half of the sequencer layout**, checked the way
 * `guide-view.test.ts` checks the rest of it: same parts, same values, same holes as its sibling —
 * never by comparing markup to Markdown.
 *
 * The server render is the one that matters here. `Guide` starts at `DEFAULT_GUIDE_LAYOUT` on
 * every first render and only adopts a stored preference in an effect, because reading
 * `localStorage` during render would give the server one layout and the client another and break
 * hydration. So what `renderToStaticMarkup` produces is the *default* layout, always — and that is
 * itself the thing worth asserting, rather than an obstacle to working around.
 */

const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const rig = (...ids: string[]) => DEVICES.filter((d) => ids.includes(d.id))

const view = (result: ReturnType<typeof resolve>) =>
  renderToStaticMarkup(createElement(Guide, { result, seed: 3 }))

describe('the server render is the default layout, so hydration matches (#12)', () => {
  it('renders the sequencer sections, which is what the default now is', () => {
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const html = view(result)
    // Grouped sub-headings, which only the sequencer layout draws — and which the client must
    // therefore also produce on its first render for hydration to match.
    expect(html).toContain('group-phase')
    expect(html).toContain('Step programming')
    expect(html).toContain('Sound design')
    // A box used as a section heading, which the phase layout never does.
    expect(html).toContain('TR-1000')
  })

  it('still renders §8’s phases when a caller pins that layout', () => {
    // The override the fixtures and any layout-specific caller rely on.
    const result = resolve({
      devices: rig('synthstrom-deluge', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const html = renderToStaticMarkup(
      createElement(Guide, { result, seed: 3, layout: 'phase' as const }),
    )
    expect(html).not.toContain('group-phase')
  })

  it('offers the choice, and names both options rather than negating one', () => {
    const result = resolve({
      devices: rig('roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const html = view(result)
    expect(html).toContain('layout-toggle')
    expect(html).toContain('by phase')
    expect(html).toContain('by sequencer')
  })
})

/**
 * The grouping is shared with the Markdown renderer (`lib/core`), so what this file has to
 * establish is that the view will draw *every* group and leave nothing without a home. Asserted
 * against the grouping rather than against a rendered string, since the markup is restyled
 * constantly and the claim is about coverage.
 */
describe('every group the core produces has somewhere to be drawn (§8/#230)', () => {
  const rigs: [string, ReturnType<typeof rig>][] = [
    ['two self-sequencing boxes', rig('synthstrom-deluge', 'roland-tr-1000')],
    ['a box nothing can drive', rig('moog-minitaur', 'roland-tr-8s')],
    ['a box driven by another', rig('moog-minitaur', 'squarp-hapax', 'roland-tr-8s')],
    ['the whole library', [...DEVICES]],
  ]

  for (const [name, devices] of rigs) {
    it(`names every part exactly once across the groups — ${name}`, () => {
      const result = resolve({ devices, template: industrial, mood: moodState({}), seed: 3 })
      const groups = sequencerGroups(result)
      const seen = groups.flatMap((g) => g.assignments.map((a) => a.requestId))
      expect(new Set(seen).size, `${name}: duplicated part`).toBe(seen.length)
      expect(seen.length, `${name}: dropped part`).toBe(result.assignments.length)
    })
  }

  it('leaves no hook without a section, on any template', () => {
    for (const template of TEMPLATES) {
      const result = resolve({ devices: [...DEVICES], template, mood: moodState({}), seed: 4 })
      const inGroups = new Set(
        sequencerGroups(result).flatMap((g) => g.assignments.map((a) => a.role)),
      )
      for (const hook of result.song.hooks) {
        const covered = inGroups.has(hook.forRole) || unplayedHooks(result).includes(hook)
        expect(covered, `${template.id}: ${hook.forRole} belongs to no section`).toBe(true)
      }
    }
  })
})

describe('the view still renders every part, whatever the rig (invariant 5)', () => {
  it('draws a guide for a rig where nothing can be driven', () => {
    // The orphan case must not throw and must not silently render an empty document.
    const result = resolve({
      devices: rig('moog-minitaur', 'roland-tr-8s'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const html = view(result)
    expect(html.length).toBeGreaterThan(1000)
    for (const a of result.assignments) expect(html).toContain(a.recipe.title)
  })

  it('draws a guide for an empty rig without throwing', () => {
    const result = resolve({ devices: [], template: industrial, mood: moodState({}), seed: 1 })
    expect(sequencerGroups(result)).toEqual([])
    expect(() => view(result)).not.toThrow()
  })
})
