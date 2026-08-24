import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NEUTRAL_MOOD, renderGuide, resolve, type ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { droneStudy, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { mergeBlocks } from '../components/guide/phase-steps'

/**
 * #100. One authority per part.
 *
 * Drone Study's `texture` was three sustained notes in phase 4 — bar 1 len 128, bar 9 len 64,
 * bar 13 len 64 — and seven retriggers inside 64 steps in phase 5, against a recipe with a
 * 1.8 second attack at 72 BPM. Two instructions for one part, and nothing on the page saying
 * which to play. Where a hook resolved it *is* the pattern, and phase 5 points at it.
 *
 * The discriminator is the hook, not the role: `texture` is a `body` role and `bass-mid` a
 * `low` one, so a rule about tonal roles would have fixed neither reported case. Both templates
 * are exercised here for that reason — the single-part worst case, where the contradiction was
 * the whole guide, and the mixed case, where hooked and unhooked parts sit in one phase and
 * only the hooked ones may lose their grid.
 */

const tracker = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')

const drone = (): ResolveResult =>
  resolve({ devices: tracker, template: droneStudy, mood: NEUTRAL_MOOD, seed: 1 })

const techno = (): ResolveResult =>
  resolve({ devices: DEVICES, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 })

/** One part's block inside phase 5: its `###` heading to the next heading of any level. */
function stepBlockFor(doc: string, role: string): string[] {
  const all = doc.split('\n')
  const phase = all.findIndex((l) => l.startsWith('## 5. '))
  expect(phase, 'phase 5 heading').toBeGreaterThan(-1)
  const rest = all.slice(phase + 1)
  const start = rest.findIndex((l) => l.startsWith(`### \`${role}\``))
  expect(start, `${role} in phase 5`).toBeGreaterThan(-1)
  const after = rest.slice(start + 1)
  const end = after.findIndex((l) => l.startsWith('#'))
  return end === -1 ? after : after.slice(0, end)
}

const POINTER = '**The hook is the pattern**'

describe('a resolved hook is the part’s rhythm (#100)', () => {
  it('stamps the chosen hook on every part whose role has one, and nothing else', () => {
    const result = techno()
    const hooked = new Map(
      result.song.hooks
        .filter((h) => h.chosen.outcome === 'resolved')
        .map((h) => [h.forRole, h.chosenId]),
    )
    expect(hooked.size).toBeGreaterThan(0)

    for (const a of result.assignments) {
      expect(a.hookAuthority, a.role).toBe(hooked.get(a.role))
    }
    // The guard against a role-group rule sneaking back in: parts that keep their grid are
    // exactly the parts nobody authored a hook for.
    expect(result.assignments.filter((a) => a.hookAuthority === undefined).length).toBeGreaterThan(0)
  })

  it('drops the grid, the variant and the articulation from phase 5, and points at Hook', () => {
    const result = drone()
    const texture = result.assignments.find((a) => a.role === 'texture')
    expect(texture?.hookAuthority).toBe('drone-hook-upper')

    // A variant was still selected — the band it asks for is what the arrangement phase reads —
    // so this is a rendering claim about phase 5 and not an accident of nothing being there.
    expect(texture?.patterns.some((p) => p.selection.outcome !== 'none')).toBe(true)

    const block = stepBlockFor(renderGuide(result), 'texture')
    expect(block.join('\n')).toContain(POINTER)
    expect(block.some((l) => l.startsWith('```'))).toBe(false)
    expect(block.some((l) => /\d+ steps, band/.test(l))).toBe(false)
    expect(block.some((l) => l.startsWith('**On this box**'))).toBe(false)
  })

  it('leaves a part with no authored hook exactly as it was', () => {
    const doc = renderGuide(techno())
    const kick = stepBlockFor(doc, 'kick')
    expect(kick.join('\n')).not.toContain(POINTER)
    expect(kick.some((l) => l.startsWith('```'))).toBe(true)
    expect(kick.some((l) => /\d+ steps, band/.test(l))).toBe(true)

    // ...and a hooked part in the same guide loses its grid.
    const bass = stepBlockFor(doc, 'bass-mid')
    expect(bass.join('\n')).toContain(POINTER)
    expect(bass.some((l) => l.startsWith('```'))).toBe(false)
  })

  it('an unresolved hook keeps step programming, because it has no notes to defer to', () => {
    // §4.1's `unparsed-key`. Deferring to a hook that resolved to nothing would leave the part
    // with no rhythm stated anywhere, which is invariant 5 in the other direction.
    const result = resolve({
      devices: tracker,
      template: { ...droneStudy, keys: ['not a key'] },
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    expect(result.song.hooks[0]?.chosen.outcome).toBe('unresolved')
    expect(result.assignments[0]?.hookAuthority).toBeUndefined()
    expect(stepBlockFor(renderGuide(result), 'texture').some((l) => l.startsWith('```'))).toBe(true)
  })

  it('says it the same way on the page as in the Markdown (§8)', () => {
    const result = drone()
    const markup = renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
    const texture = result.assignments.find((a) => a.role === 'texture')

    expect(mergeBlocks(texture!)).toEqual([])
    expect(markup).not.toContain('step-grid')
    expect(markup).toContain('The hook is the pattern')
    // Phase 4 is Hook. The pointer is a link on the page, because on a phone the heading above
    // this one is a scroll away (#21).
    expect(markup).toContain('href="#phase-4"')
  })
})
