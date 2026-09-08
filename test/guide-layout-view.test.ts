import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { moodState, renderGuide, resolve, sequencerGroups, unplayedHooks } from '../lib/core/index'
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

describe('the in-rig source callout prints once under either layout (§8/#487)', () => {
  /**
   * The web half of `guide-layout.test.ts`'s claim, and it is a claim about placement rather than
   * about words: `PhaseRig` draws the callout, both layouts render `PhaseRig` exactly once, and
   * the per-box `RigBoxes` — which the sequencer layout draws under every group — must not. That
   * split is #455's, and this is the sentence that would have exposed it had it come first.
   */
  const result = resolve({
    devices: rig('behringer-crave', 'roland-sp-404mk2'),
    template: industrial,
    mood: moodState({}),
    seed: 3,
  })

  for (const layout of ['phase', 'sequencer'] as const) {
    it(`says it once in the ${layout} layout, with the patch linked`, () => {
      const html = renderToStaticMarkup(createElement(Guide, { result, seed: 3, layout }))
      expect(html.split('Make it here first').length - 1).toBe(1)
      expect(html).toContain('href="/devices/behringer-crave"')
    })
  }
})

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

/**
 * §8/#240/#455. **A rig-wide fact is stated once, and the count is the assertion.**
 *
 * Reported from a phone, on a one-box rig: *"when there's only one box we repeat these sections,
 * we should hide one"*. The `Rig integration` phase and the box's own `Patching` heading were
 * printing the same three callouts a screen apart — clock source, why that box holds the job,
 * and the menu that routes its clock out.
 *
 * The cause was a call site rather than a layout: `Patching` reached for `PhaseRig` and narrowed
 * its per-box list with `detail`, which does nothing about everything above that list. So the
 * rig-wide half printed once per phase **plus once per box** — measured N+1 at one, two and
 * three boxes, worst on the biggest rig rather than the smallest.
 *
 * **Counted against the Markdown sibling rather than against a fixed number**, which is the #33
 * discipline this file already follows: the two renderers share no ink, so the claim that
 * survives a rewrite of either is that they say a thing the same number of times. A snapshot of
 * markup would fail on every restyle and would have caught none of this.
 */
describe('a rig-wide fact is stated once, however many boxes there are (§8/#455)', () => {
  const RIG_WIDE = ['Why this box', 'Clock source'] as const
  const strip = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ')
  const times = (text: string, needle: string) => text.split(needle).length - 1

  for (const ids of [
    ['polyend-tracker-mini'],
    ['polyend-tracker-mini', 'roland-tr-1000'],
    ['polyend-tracker-mini', 'roland-tr-1000', 'moog-dfam'],
  ]) {
    it(`states each rig-wide fact once across ${ids.length} box${ids.length === 1 ? '' : 'es'}`, () => {
      const result = resolve({
        devices: rig(...ids),
        template: industrial,
        mood: moodState({}),
        seed: 3,
      })
      const web = strip(view(result))
      const markdown = renderGuide(result, { layout: 'sequencer' })
      for (const fact of RIG_WIDE) {
        // Once, and the same once the Markdown guide says it. The sibling is the reference
        // because it has been right about this all along — `rigLinesFor` returns
        // `deviceRigBlocks` and nothing else.
        expect(times(markdown, fact), `${fact} in the Markdown guide`).toBe(1)
        expect(times(web, fact), `${fact} in the web guide, ${ids.length} box(es)`).toBe(1)
      }
    })
  }

  it('still draws a per-box block for every box, which is the half that is meant to repeat', () => {
    const result = resolve({
      devices: rig('polyend-tracker-mini', 'roland-tr-1000'),
      template: industrial,
      mood: moodState({}),
      seed: 3,
    })
    const web = strip(view(result))
    // The fix must not have removed the list along with the duplication: each box still states
    // its own clock, sockets, audio and mixer where its parts are worked.
    for (const name of ['Tracker Mini', 'TR-1000']) expect(web).toContain(name)
    expect(times(web, 'mixer')).toBeGreaterThanOrEqual(2)
  })
})
