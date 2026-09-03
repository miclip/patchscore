import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  renderGuide,
  resolve,
  type ResolveResult,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, droneStudy, industrialTechno } from '../lib/templates/index'
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
 *
 * **§4.3 is the second half, and it changes what "defers" means for two parts in the library.**
 * #100 read every hook and variant on one part as competing instructions. That is true where the
 * hook carries its own rhythm, and false where the hook is a held note and the variant is the map
 * of where it is struck again — and on those parts the deferral silenced the only rhythmic
 * decision the direction contains, along with everything the density knob does. A direction now
 * says which of the two its variants are (`RoleRequest.reArticulatesHook`), so this file tests
 * both outcomes: Drone Study's `texture` declares it and keeps its grid *under* a pointer;
 * Industrial Techno's `bass-mid` declares nothing and loses its grid exactly as before.
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
const RE_ARTICULATION = '**The hook is the notes; the steps below are where they are struck again**'

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

  it('keeps the grid under a pointer where the direction says the variants re-articulate', () => {
    const result = drone()
    const texture = result.assignments.find((a) => a.role === 'texture')
    expect(texture?.hookAuthority).toBe('drone-hook-upper')
    expect(texture?.reArticulatesHook).toBe(true)

    // A variant is selected, as it always was — what changed is that it now reaches the page.
    expect(texture?.patterns.some((p) => p.selection.outcome !== 'none')).toBe(true)

    const block = stepBlockFor(renderGuide(result), 'texture')
    // The two authorities in one sentence, and *not* the sentence that replaces a grid: printing
    // both would put the reader back in front of the choice #100 was filed about.
    expect(block.join('\n')).toContain(RE_ARTICULATION)
    expect(block.join('\n')).not.toContain(POINTER)
    // The grid, the band and the slot list — the whole of what #100 dropped here.
    expect(block.some((l) => l.startsWith('```'))).toBe(true)
    expect(block.some((l) => /\d+ steps, band/.test(l))).toBe(true)
    expect(block.some((l) => l.startsWith('- `downbeat`'))).toBe(true)

    // The chain plan still counts the *hook's* bars, which is why the sentence says so: 16-bar
    // hook over a 4-bar map, and a reader given both and no relation would dial the wrong one.
    expect(block.join('\n')).toContain('This map is 4 bars long and repeats inside the hook')
    expect(block.join('\n')).toContain('- **Tilt** · 21 bars — 1 copy of 16 bars')
  })

  it('moves what the part plays when density moves, which is what the flag is for (§6.3)', () => {
    // The regression this exists to catch is silence, not a wrong grid: with the flag ignored the
    // guide differs at the two ends of the knob only in a band label nothing stands behind.
    const at = (density: number) =>
      stepBlockFor(
        renderGuide(
          resolve({
            devices: tracker,
            template: droneStudy,
            mood: { ...NEUTRAL_MOOD, density },
            seed: 1,
          }),
        ),
        'texture',
      ).join('\n')

    const sparse = at(0)
    const busy = at(100)
    expect(sparse).not.toBe(busy)
    // Not merely different: the knob moves the arrangement by one band (§6.3), so the busiest
    // end reaches a variant the sparsest end never selects — and with it an `accent` the sparse
    // guide has no line for at all. Asserted on the band-3 material rather than on `offbeat`,
    // which bands 2 and 3 both carry and which is therefore true at both ends.
    expect(busy).toContain('- `offbeat` — 11, 27, 51')
    expect(busy).toContain('- `accent` — 49 (vel 104)')
    expect(busy).toContain('band 3')
    expect(busy).not.toContain('band 0')
    expect(sparse).not.toContain('band 3')
    expect(sparse).not.toContain('- `accent`')
    expect(sparse).toContain('band 0')
  })

  it('leaves a part with no authored hook exactly as it was', () => {
    const doc = renderGuide(techno())
    const kick = stepBlockFor(doc, 'kick')
    expect(kick.join('\n')).not.toContain(POINTER)
    expect(kick.some((l) => l.startsWith('```'))).toBe(true)
    expect(kick.some((l) => /\d+ steps, band/.test(l))).toBe(true)

    // ...and a hooked part in the same guide loses its grid. Industrial Techno declares no
    // `reArticulatesHook` on any request, and its bass hooks are figures with a rhythm of their
    // own — two grids on one part is the thing #100 removed, and §4.3 must not put it back for a
    // direction that never claimed its variants were a re-articulation map.
    const bass = stepBlockFor(doc, 'bass-mid')
    expect(bass.join('\n')).toContain(POINTER)
    expect(bass.join('\n')).not.toContain(RE_ARTICULATION)
    expect(bass.some((l) => l.startsWith('```'))).toBe(false)
    expect(techno().assignments.every((a) => a.reArticulatesHook === false)).toBe(true)
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

    // Blocks again, not none: the React renderer suppressed them for every deferred part, and
    // the two renderers disagreeing about that is precisely what this test is for.
    expect(mergeBlocks(texture!).length).toBeGreaterThan(0)
    expect(markup).toContain('step-grid')
    expect(markup).toContain('The hook is the notes; the steps below are where they are struck')
    expect(markup).not.toContain('The hook is the pattern')
    // Phase 4 is Hook. The pointer is a link on the page, because on a phone the heading above
    // this one is a scroll away (#21).
    expect(markup).toContain('href="#phase-4"')
  })

  it('still replaces the grid on the page for a part with no such claim (§8)', () => {
    // The React half of the negative above. Both renderers have to agree in both directions, and
    // only one of the two shapes was ever asserted on the page.
    const result = techno()
    const markup = renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
    const bass = result.assignments.find((a) => a.role === 'bass-mid')
    expect(bass?.hookAuthority).toBeDefined()
    expect(mergeBlocks(bass!)).toEqual([])
    expect(markup).toContain('The hook is the pattern')
  })
})

/**
 * §8/#65/#335. The "cannot be programmed here" notice qualifies a grid; it must reach every part
 * that prints one.
 *
 * It was the `else` arm of the chain that picks the sentence above the grid, which put it out of
 * reach of a re-articulating part — and those are exactly the parts that print a headline *and
 * then a grid*. So on a box with no sequencer the guide told a reader to program steps on a
 * machine that cannot hold them, which is the instruction #65 removed, through a path #65
 * predates.
 *
 * **Both renderers had it, in the same shape.** #33 keeps one decision in `lib/core` and two
 * hand-written vocabularies around it; here the decision was written twice and so was the bug.
 *
 * The condition is whether a grid is *suppressed*, not whether it came back empty: 504
 * assignments in the library reach this point with no variant resolved and carried the notice
 * before.
 */
describe('a box with no sequencer says so above every grid (#335)', () => {
  const minitaur = DEVICES.filter((d) => d.id.includes('minitaur'))

  it.each(['acid-lineage', 'weave'])(
    'reaches a re-articulating part on %s, which prints a headline and then a grid',
    (templateId) => {
      const template = TEMPLATES.find((t) => t.id === templateId) as Template
      const result = resolve({
        devices: minitaur,
        template,
        mood: NEUTRAL_MOOD,
        seed: 1,
      })
      const reArticulating = result.assignments.filter((a) => a.reArticulatesHook)
      expect(reArticulating.length).toBeGreaterThan(0)
      expect(renderGuide(result)).toContain('Not programmed here')
    },
  )

  /**
   * The complement, and the reason this is keyed on suppression rather than on "has a hook": a
   * part whose hook *is* the pattern prints no grid, so a notice qualifying one would qualify
   * nothing. Losing that distinction is the likely way this regresses.
   */
  it('stays away from a part whose hook replaces the grid', () => {
    const template = TEMPLATES.find((t) => t.id === 'drone-study') as Template
    const result = resolve({ devices: minitaur, template, mood: NEUTRAL_MOOD, seed: 1 })
    for (const a of result.assignments) {
      if (a.hookAuthority === undefined || a.reArticulatesHook) continue
      expect(mergeBlocks(a)).toEqual([])
    }
  })
})
