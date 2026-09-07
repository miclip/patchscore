import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  groupedParams,
  hoistedParams,
  inertBlocks,
  inertFindings,
  inertNotice,
  moodState,
  recipeInertFindings,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Device, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §8/#388. **A module nothing in the recipe appears to be listening to, on the page.**
 *
 * `test/audit-inert.test.ts` covers the check itself — what raises a candidate and what does not.
 * This covers what a reader sees: which boxes carry the line, which deliberately do not, and that
 * the two renderers say the same words about the same boxes (#33).
 *
 * **The strict half matters more than the marked half.** `inertNotice` matches a candidate to a
 * box only on an exact block *and* an exact parameter count, because the renderer draws subsets
 * in two ordinary cases — #107 lifts a control out of a part, and `groupedParams` cuts on adjacent
 * runs. So most of the assertions below are about boxes that stay live.
 */

const MUSE: Device = (() => {
  const d = DEVICES.find((x) => x.id === 'moog-muse')
  if (d === undefined) throw new Error('moog-muse is not in the registry')
  return d
})()

function html(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1, layout: 'phase' }))
}

function occurrences(haystack: string, needle: string): number {
  let n = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    n += 1
    at = haystack.indexOf(needle, at + needle.length)
  }
  return n
}

/**
 * Every box the renderers actually draw for the Muse, across the directions and moods that reach
 * its recipes at all. Mood is swept because it is what moves `character`, and `character` is what
 * picks the recipe: a neutral sweep reaches six of eighteen.
 */
type Box = { recipeId: string; module: string; params: number; marked: boolean }

function musesBoxes(): Box[] {
  const out: Box[] = []
  const M = [0, 50, 100]
  for (const template of TEMPLATES) {
    for (const seed of [1, 2, 3]) {
      for (const darkness of M) {
        for (const grit of M) {
          for (const density of M) {
            const r = resolve({
              devices: [MUSE],
              template,
              seed,
              mood: moodState({ darkness, grit, density }),
            })
            const mine = r.assignments.filter((a) => a.deviceId === 'moog-muse')
            const hoist = hoistedParams(mine.map((a) => a.params))
            for (const a of mine) {
              const own = a.params.filter((p) => !hoist.names.has(p.name))
              const blocks = inertBlocks(MUSE, a.recipe.id)
              for (const group of groupedParams(own)) {
                if (group.module === undefined) continue
                out.push({
                  recipeId: a.recipe.id,
                  module: group.module,
                  params: group.params.length,
                  marked: inertNotice(blocks, group) !== undefined,
                })
              }
            }
          }
        }
      }
    }
  }
  return out
}

const BOXES = musesBoxes()

describe('every one of the twelve candidates is marked on the box it was raised on (#388)', () => {
  it('has twelve to mark, so the assertions below are not vacuous', () => {
    expect(inertFindings(DEVICES)).toHaveLength(12)
    expect(inertFindings(DEVICES).every((f) => f.deviceId === 'moog-muse')).toBe(true)
  })

  /*
   * The decision, over all twelve. Not every recipe resolves — `muse-bass-mid-hard` is reachable
   * through no direction the library ships, so the render sweep below covers eleven — and a
   * candidate that only the audit can see is still a candidate the renderer must be right about
   * the day a direction reaches it. So this asks the shared decision the same question the
   * renderers ask it, on the group each renderer would build.
   */
  it('answers with the exact sentence for each, given the box the renderers build', () => {
    for (const finding of inertFindings(DEVICES)) {
      const recipe = MUSE.recipes.find((r) => r.id === finding.recipeId)
      expect(recipe, finding.recipeId).toBeDefined()
      if (recipe === undefined) continue
      const params = recipe.params.filter((p) => p.module === finding.block)
      const notice = inertNotice(inertBlocks(MUSE, finding.recipeId), {
        module: finding.block,
        params,
      })
      expect(notice, `${finding.recipeId} ${finding.block}`).toBe(
        `Appears inert — ${finding.detail}.`,
      )
    }
  })

  it('marks every candidate whose recipe a direction actually reaches, and only those', () => {
    const rendered = new Set(BOXES.map((b) => b.recipeId))
    const reachable = inertFindings(DEVICES).filter((f) => rendered.has(f.recipeId))
    // Eleven of the twelve. If a direction later reaches `muse-bass-mid-hard`, this rises with it
    // rather than needing an edit — the expectation is derived, not pinned.
    expect(reachable.length).toBeGreaterThan(0)
    const marked = new Set(BOXES.filter((b) => b.marked).map((b) => `${b.recipeId} ${b.module}`))
    expect([...marked].sort()).toEqual(
      [...new Set(reachable.map((f) => `${f.recipeId} ${f.block}`))].sort(),
    )
  })
})

describe('a box stays live rather than over-claiming (#388)', () => {
  it('marks no box the check did not raise, anywhere in the sweep', () => {
    for (const box of BOXES) {
      if (!box.marked) continue
      const recipe = MUSE.recipes.find((r) => r.id === box.recipeId)
      expect(recipe).toBeDefined()
      if (recipe === undefined) continue
      const finding = recipeInertFindings(MUSE, recipe).find((f) => f.block === box.module)
      expect(finding, `${box.recipeId} ${box.module}`).toBeDefined()
      // Both halves exact. A box holding a different number of controls is not the group judged.
      expect(finding?.params).toBe(box.params)
    }
  })

  it('leaves a MOD OSC that is routed and kept out of the mix completely alone', () => {
    // The four recipes `MIXER · MOD OSC 0` is *correct* on: the oscillator modulates and is
    // deliberately not in the audio path. Marking these is the failure the conjunction exists to
    // avoid, and it is the one a reader would learn to skip the box over.
    const routed = ['muse-pad-soft', 'muse-pad-dark', 'muse-pad-bright', 'muse-texture-soft']
    const drawn = BOXES.filter((b) => routed.includes(b.recipeId) && b.module === 'MOD OSC')
    expect(drawn.length).toBeGreaterThan(0)
    expect(drawn.every((b) => !b.marked)).toBe(true)
  })

  it('leaves the recipe #384 already repaired alone, on every box it has', () => {
    // Nothing to look up: the check raises nothing for it, so no group can match.
    expect(inertBlocks(MUSE, 'muse-stab-hard').size).toBe(0)
    const stab = MUSE.recipes.find((r) => r.id === 'muse-stab-hard')
    expect(stab).toBeDefined()
    if (stab !== undefined) expect(recipeInertFindings(MUSE, stab)).toEqual([])
    expect(BOXES.filter((b) => b.recipeId === 'muse-stab-hard').every((b) => !b.marked)).toBe(true)
  })

  it('leaves the MIXER box alone, though it holds the level the check read', () => {
    // `MIXER · MOD OSC` is evidence for the MOD OSC candidate and is authored `inModule('MIXER')`.
    // The two coordinate systems disagree here on purpose, and the exact-block match is what stops
    // the guide marking the fader a reader walks to.
    expect(BOXES.filter((b) => b.module === 'MIXER').every((b) => !b.marked)).toBe(true)
  })

  it('never marks a device-level box, which has no single recipe behind it', () => {
    // #107's hoisted block is shared by every part on the device. `Params` passes it no
    // candidates, and `inertBlocks` answers an absent recipe with an empty map either way.
    expect(inertBlocks(MUSE, undefined).size).toBe(0)
    expect(inertBlocks(undefined, 'muse-sub-clean').size).toBe(0)
    expect(inertBlocks(MUSE, 'muse-no-such-recipe').size).toBe(0)
    const muse = resolve({
      devices: [MUSE],
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const md = renderGuide(muse)
    const songWide = md.slice(md.indexOf('**Song-wide**'), md.indexOf('#### '))
    expect(songWide).toContain('One setting for the whole song')
    expect(songWide).not.toContain('Appears inert')
  })

  it('marks nothing on any other device in the library', () => {
    // Six other devices author a module (#385); none of them raises a candidate.
    const rig = resolve({
      devices: DEVICES,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const md = renderGuide(rig)
    expect(md).toContain('- **● ')
    expect(md).not.toContain('Appears inert')
  })
})

describe('both renderers say the same thing about the same boxes (§8/#33)', () => {
  const muse = resolve({
    devices: [MUSE],
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })
  const md = renderGuide(muse)
  const markup = html(muse)

  it('draws the marks at all, in both', () => {
    expect(occurrences(md, 'Appears inert')).toBeGreaterThan(0)
    expect(occurrences(markup, 'Appears inert')).toBe(occurrences(md, 'Appears inert'))
    expect(occurrences(markup, 'module-box inert')).toBe(occurrences(md, 'Appears inert'))
  })

  it('prints the qualification and the evidence, word for word, in both', () => {
    for (const doc of [md, markup]) {
      expect(doc).toContain('Appears inert — 4 routes off, 2 depths 0, level 0.')
      expect(doc).toContain('Appears inert — no authored destination found.')
    }
    // A verdict rather than a candidate is the thing invariant 5 forbids.
    for (const doc of [md, markup]) {
      expect(doc).not.toContain('Is inert')
      expect(doc).not.toContain('This module is inert')
    }
  })

  it('hangs it off the module label in Markdown and keeps every nested bullet', () => {
    expect(md).toContain('- **● MOD OSC** — Appears inert — 4 routes off, 2 depths 0, level 0.')
    // Nine controls, all of them, under the box the line qualifies. Nothing folded away.
    const at = md.indexOf('- **● MOD OSC** — Appears inert')
    const block = md.slice(at, md.indexOf('\n- **', at + 1))
    expect(block.split('\n').filter((l) => l.startsWith('  - **'))).toHaveLength(9)
  })

  it('keeps every control expanded and visible in the markup too', () => {
    const at = markup.indexOf('module-box inert')
    const box = markup.slice(at, markup.indexOf('module-box', at + 20))
    // All nine controls drawn, in the box, with their values on the page.
    expect(occurrences(box, 'class="param-name"')).toBe(9)
    expect(box).toContain('PITCH \u25b8 OSC 1')
    expect(box).toContain('FILTER \u25b8 2')
    // No disclosure control and nothing hidden: a reader who disagrees has to be able to dial all
    // nine without hunting for one. (`aria-hidden` on the lamp is the one legitimate `hidden`
    // here, so this asks about the attribute that actually removes content.)
    expect(box).not.toContain('<details')
    expect(box).not.toContain('<summary')
    expect(box.replace(/aria-hidden="true"/g, '')).not.toContain('hidden')
  })

  it('reads the line out, because it qualifies everything under it', () => {
    // The lamp is `aria-hidden` — it says the same thing on every box. This does not.
    expect(markup).toContain('<p class="module-note">Appears inert')
    expect(markup).not.toContain('module-note" aria-hidden')
  })

  it('adds no second lamp state, in either renderer', () => {
    // #385's lamp is still lit-or-nothing. The claim #388 makes is a sentence with its evidence
    // attached, which a lamp could not carry — see `MODULE_LED` and `.module-led`.
    expect(md).not.toContain('○')
    expect(markup).not.toContain('○')
    expect(markup).not.toContain('module-led-off')
    expect(occurrences(md, '●')).toBe(occurrences(markup, 'module-led'))
  })
})

describe('the muted treatment stays legible and stays quiet (§10/#21)', () => {
  const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8')

  it('draws the state on the box, not on the lamp', () => {
    expect(css).toContain('.module-box.inert')
    expect(css).not.toContain('--lamp-dark')
    expect(css).not.toContain('.module-led-off')
  })

  it('uses no solid accent fill, which §10 reserves for live signal', () => {
    const rule = css.slice(css.indexOf('.module-box.inert {'), css.indexOf('.module-note {'))
    expect(rule).not.toContain('--accent')
    expect(rule).not.toContain('--lamp')
  })

  it('dims no further than the token the guide already uses for prose it expects read', () => {
    // `--ink-dim` is `.quiet`'s colour. Nothing in the marked box goes below it, and neither the
    // label nor the note invents a dimmer value of its own (#21: poor light, at the machine).
    const rule = css.slice(css.indexOf('.module-box.inert {'), css.indexOf('§8.1 the reserved'))
    expect(rule).toContain('var(--ink)')
    expect(rule).toContain('var(--ink-dim)')
    expect(rule).not.toMatch(/opacity:/)
    expect(rule).not.toMatch(/color:\s*#/)
  })

  it('leaves every control in the box, rather than collapsing them', () => {
    const rule = css.slice(css.indexOf('.module-box.inert {'), css.indexOf('§8.1 the reserved'))
    expect(rule).not.toContain('display: none')
    expect(rule).not.toContain('max-height')
  })
})
