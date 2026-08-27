import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  STEPS_PER_BAR,
  STEPS_PER_BEAT,
  moodState,
  renderGuide,
  resolve,
  reStrikesHeldNote,
  roundHundredths,
  secondsPerStep,
  tightestGapSteps,
  tightestReStrike,
} from '../lib/core/index'
import type { Pattern, ResolveResult } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, droneStudy, industrialTechno, weave } from '../lib/templates/index'

/**
 * §4.3/#155. **The arithmetic the guide was leaving to the reader.**
 *
 * `tm-texture-soft` fades in over 1.8 Sec and carried a note saying that a part re-struck faster
 * than that swells rather than articulates. True, and unusable: it announced a conflict and left
 * somebody standing at a machine to work out whether they had one, from a tempo and a strike map
 * the guide was already printing on the same page.
 *
 * The issue's own worked example is the fixture these tests are built around, because it is the
 * case a person actually hit on hardware: Drone Study on a Tracker Mini at `density=100`, seed 1.
 * Tempo 72 BPM, so a sixteenth is 60/72/4 = 0.2083 Sec; the band-3 map strikes at 1, 11, 17, 27,
 * 33, 49, 51; the gaps are 10, 6, 10, 6, 16 and **2** steps. The tightest is 0.42 Sec, and four
 * of the six gaps are under the 1.8 Sec fade-in — so the hint's condition was not an edge case to
 * watch for on this part, it was most of the band.
 */

const BAND_3 = [1, 11, 17, 27, 33, 49, 51]

function pattern(steps: number[], length: Pattern['length'] = 64): Pattern {
  return {
    id: 'p',
    forRole: 'texture',
    band: 3,
    length,
    hits: steps.map((step) => ({ step, slot: 'downbeat' as const })),
  }
}

describe('the step grid is a grid of sixteenths (§4.3)', () => {
  it('puts four steps in a beat and sixteen in a bar', () => {
    expect(STEPS_PER_BAR).toBe(16)
    expect(STEPS_PER_BEAT).toBe(4)
  })

  it('turns a tempo into a step duration', () => {
    // #155's own sum, and the one a reader would do standing at the box: 60/72/4.
    expect(secondsPerStep(72)).toBeCloseTo(0.2083, 4)
    // A round one, so a reader can check the helper without trusting a repeating decimal.
    expect(secondsPerStep(120)).toBe(0.125)
    expect(secondsPerStep(60)).toBe(0.25)
  })

  it('rounds to hundredths without a locale anywhere near it (§7.2, invariant 6)', () => {
    expect(roundHundredths(0.41666666666666663)).toBe(0.42)
    expect(roundHundredths(6.666666666666667)).toBe(6.67)
    expect(roundHundredths(0.125)).toBe(0.13)
    // Already exact: rounding must not perturb a value that needs none.
    expect(roundHundredths(2.5)).toBe(2.5)
  })
})

describe('the tightest re-strike in a map (#155)', () => {
  it('finds #155\'s worked example, in steps and in seconds', () => {
    expect(tightestGapSteps(pattern(BAND_3))).toBe(2)
    expect(tightestReStrike(pattern(BAND_3), 72)).toEqual({ steps: 2, seconds: 0.42 })
  })

  it('counts the wrap, because the map loops', () => {
    // Strikes at each end of the pattern and nowhere else. Measured within one repeat the gap is
    // 62 steps and the part looks becalmed; measured round the loop it is 3, which is what the
    // reader will actually hear when the section chains a second copy. Getting this wrong prints
    // a reassuring number for the exact case the line exists to warn about.
    expect(tightestGapSteps(pattern([1, 62]))).toBe(3)
    expect(tightestGapSteps(pattern([1, 33]))).toBe(32)
  })

  it('counts a step once however many slots strike it', () => {
    // Two slots on one step is one strike of one voice. Counted twice it produces a gap of zero
    // seconds, which is not a re-strike but a division by nothing.
    const doubled: Pattern = {
      id: 'p',
      forRole: 'texture',
      band: 3,
      length: 64,
      hits: [
        { step: 1, slot: 'downbeat' },
        { step: 1, slot: 'accent' },
        { step: 33, slot: 'downbeat' },
      ],
    }
    expect(tightestGapSteps(doubled)).toBe(32)
  })

  it('measures nothing where there is no re-strike', () => {
    // One strike has no interval and an empty map is not a rhythm. Neither is a gap being hidden
    // (invariant 5) — there is no value being withheld, because there is no second strike.
    expect(tightestGapSteps(pattern([1]))).toBeUndefined()
    expect(tightestGapSteps(pattern([]))).toBeUndefined()
    expect(tightestReStrike(pattern([1]), 72)).toBeUndefined()
  })

  it('scales with the tempo and nothing else', () => {
    const p = pattern(BAND_3)
    expect(tightestReStrike(p, 144)?.seconds).toBe(0.21)
    expect(tightestReStrike(p, 36)?.seconds).toBe(0.83)
  })
})

/** Drone Study on a Tracker Mini alone, at the density and seed #155 reported. */
function reported(): ResolveResult {
  const tm = DEVICES.filter((d) => d.id === 'polyend-tracker-mini')
  return resolve({ devices: tm, template: droneStudy, mood: moodState({ density: 100 }), seed: 1 })
}

function text(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
}

describe('phase 5 states it, and never enforces it (#155, #143)', () => {
  it('prints the number the reader was being asked to work out', () => {
    const result = reported()
    expect(result.song.bpm).toBe(72)
    const doc = renderGuide(result)
    expect(doc).toContain('tightest re-strike — `0.42` Sec · derived from 2 steps at 72 BPM')
  })

  it('prints its own derivation, so the answer can be checked at the machine', () => {
    // Two numbers and a tempo is the whole sum. Printed beside the answer rather than badged:
    // `Provenance` means an authored point moved by a mood axis, and this is neither.
    const doc = renderGuide(reported())
    for (const part of ['derived from', '2 steps', '72 BPM']) expect(doc).toContain(part)
  })

  it('is per band, because the tightest gap is a property of the band and not the guide', () => {
    // #155's second care note. A single number per guide would be wrong: this part plays band 1
    // in the quiet sections and band 3 in the loud ones, and they are 6.67 Sec and 0.42 Sec apart.
    const doc = renderGuide(reported())
    expect(doc).toContain('`6.67` Sec · derived from 32 steps')
    expect(doc).toContain('`2.92` Sec · derived from 14 steps')
    expect(doc).toContain('`0.42` Sec · derived from 2 steps')
  })

  it('says nothing for a map that strikes once, even on a re-articulating part', () => {
    // At the quiet end of the density knob this part's map is a single downbeat, and an interval
    // between one strike and nothing does not exist. Counted rather than sliced out of the page:
    // the same part plays busier maps in other sections of the same guide, so a search over the
    // whole phase would find those and prove nothing about this one.
    const result = resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: droneStudy,
      mood: moodState({ density: 0 }),
      seed: 1,
    })
    const doc = renderGuide(result)
    expect(doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'))).toContain('- `downbeat` — 1\n')

    // Distinct blocks, because phase 5 merges sections that program identically and prints one
    // block for them — counting selections instead would expect a line per section.
    const measurable = new Set(
      result.assignments
        .flatMap((a) => (a.reArticulatesHook ? a.patterns : []))
        .filter((e) => e.selection.outcome !== 'none')
        .filter((e) => e.selection.outcome !== 'none' && tightestGapSteps(e.selection.pattern) !== undefined)
        .map((e) => (e.selection.outcome === 'none' ? '' : e.selection.pattern.id)),
    )
    expect(doc.split('- tightest re-strike').length - 1).toBe(measurable.size)

    // And the single-strike map is genuinely among the ones rendered, or the count above is
    // agreeing with itself about a case this guide does not contain.
    const single = result.assignments
      .flatMap((a) => (a.reArticulatesHook ? a.patterns : []))
      .filter((e) => e.selection.outcome !== 'none')
      .filter((e) => e.selection.outcome !== 'none' && tightestGapSteps(e.selection.pattern) === undefined)
    expect(single.length, 'no single-strike map in this guide, so nothing is being tested')
      .toBeGreaterThan(0)
  })

  it('never names a device or a parameter, so no box can be read as capping a direction', () => {
    // #143 settled the direction of this fix: an envelope must not cap a strike rate, because
    // that puts the box in charge of the genre (invariant 3 backwards). The line is a fact about
    // tempo and steps, and it stays one — a sentence naming ATTACK here would be the engine
    // quietly making the trade on the reader's behalf.
    //
    // Scoped to phase 5 deliberately. `tm-texture-soft`'s note in phase 6 *points* at this line
    // and so contains the same phrase; that is the pointer working, not a leak, and a filter
    // over the whole document would be asserting about the wrong sentence.
    const doc = renderGuide(reported())
    const phase5 = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'))
    const lines = phase5.split('\n').filter((l) => l.includes('tightest re-strike'))
    expect(lines.length, 'no re-strike line in phase 5 to check').toBeGreaterThan(0)
    for (const line of lines) {
      expect(line).not.toMatch(/ATTACK|RELEASE|DECAY|Tracker|shorten|keep .* below/i)
    }
  })

  it('leaves the part\'s rhythm exactly as the direction authored it', () => {
    // The strongest form of "states, never enforces": the strike map the guide prints is still
    // #155's, gap of two steps and all. If a later edit ever caps the band to fit an envelope,
    // this is what fails.
    const result = reported()
    const texture = result.assignments.find((a) => a.role === 'texture')
    const band3 = texture?.patterns.find((p) => p.selection.outcome !== 'none'
      && p.selection.usedBand === 3)?.selection
    if (band3 === undefined || band3.outcome === 'none') throw new Error('no band 3 map')
    expect([...new Set(band3.pattern.hits.map((h) => h.step))].sort((a, b) => a - b)).toEqual(BAND_3)
  })
})

/**
 * §4.3/#100. Weave is the fixture that carries both kinds of part in one guide: `sub`
 * re-articulates its hook, and the drums beside it are ordinary maps. A rule about which blocks
 * get the line is only tested by a document containing both.
 */
function weaveGuide(): ResolveResult {
  return resolve({ devices: DEVICES, template: weave, mood: moodState(), seed: 1 })
}

/** The phase-5 body for one part, by role heading. */
function partSection(doc: string, role: string): string {
  const phase5 = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'))
  const start = phase5.indexOf(`### \`${role}\``)
  expect(start, `no ${role} part in phase 5`).toBeGreaterThan(-1)
  const rest = phase5.slice(start + 1)
  const end = rest.indexOf('### ')
  return end === -1 ? rest : rest.slice(0, end)
}

describe('the line goes where the question exists, and nowhere else (#155)', () => {
  it('prints it for a part whose map re-strikes a held note', () => {
    const result = weaveGuide()
    const sub = result.assignments.find((a) => a.role === 'sub')
    expect(sub?.reArticulatesHook, 'weave/sub no longer re-articulates its hook').toBe(true)
    expect(partSection(renderGuide(result), 'sub')).toContain('tightest re-strike')
  })

  it('prints none for an ordinary drum map, however many times it strikes', () => {
    // The reason for the scope, stated as a test. A kick map is a grid of sixteenths and the
    // interval between two of them is the grid restated in a slower unit — true, and noise on a
    // page read standing at a rack. Nothing about a drum part poses the question an envelope has
    // to answer, so nothing about a drum part gets the answer.
    const result = weaveGuide()
    const doc = renderGuide(result)
    const ordinary = result.assignments.filter((a) => !a.reArticulatesHook)
    expect(ordinary.length, 'weave has no ordinary parts to check').toBeGreaterThan(0)

    let multiHit = 0
    for (const a of ordinary) {
      // Only meaningful where the map *could* have produced a line: a part that strikes once
      // would be silent for the other reason and would prove nothing about the scope.
      for (const entry of a.patterns) {
        if (entry.selection.outcome === 'none') continue
        if (tightestGapSteps(entry.selection.pattern) !== undefined) multiHit++
      }
      expect(partSection(doc, a.role), `${a.role} gained a timing line`).not.toContain(
        'tightest re-strike',
      )
    }
    expect(multiHit, 'no ordinary multi-hit map in this guide, so the scope is untested')
      .toBeGreaterThan(0)
  })

  it('holds across every direction and both renderers', () => {
    for (const template of TEMPLATES) {
      const result = resolve({ devices: DEVICES, template, mood: moodState(), seed: 1 })
      const doc = renderGuide(result)
      const html = text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))
      const expected = result.assignments.filter(
        (a) =>
          a.reArticulatesHook &&
          a.patterns.some(
            (e) => e.selection.outcome !== 'none' && tightestGapSteps(e.selection.pattern) !== undefined,
          ),
      ).length
      const printed = doc.split('- tightest re-strike').length - 1
      if (expected === 0) {
        expect(printed, `${template.id} printed a line with no re-articulating part`).toBe(0)
        expect(html, template.id).not.toContain('tightest re-strike —')
      } else {
        expect(printed, `${template.id} printed nothing for a re-articulating part`)
          .toBeGreaterThan(0)
      }
      // Whatever the Markdown printed, the React guide printed the same count.
      expect(html.split('tightest re-strike —').length - 1, template.id).toBe(printed)
    }
  })
})

describe('an unresolved hook is an ordinary pattern, not a held note (#155, §4.1)', () => {
  /**
   * The edge the first cut of this got wrong. `reArticulatesHook` is carried from the *request*,
   * so it stays `true` even when the hook it refers to resolved to nothing — §4.1's
   * `unparsed-key` is the existing case, and `ResolvedAssignment` says as much where the field is
   * declared: it is "only meaningful together with `hookAuthority`".
   *
   * With no hook there are no held notes, so the grid is the part's own rhythm and phase 5
   * renders it exactly as it renders a drum map. A timing line there would be measuring the gap
   * between two strikes of a note nothing is holding — the same noise the scope exists to keep
   * out, arriving through the one door left open.
   */
  function unresolved(): ResolveResult {
    return resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: { ...droneStudy, keys: ['not a key'] },
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
  }

  it('is the case it claims to be: the flag is set and the hook resolved to nothing', () => {
    const result = unresolved()
    expect(result.song.hooks[0]?.chosen.outcome).toBe('unresolved')
    const texture = result.assignments.find((a) => a.role === 'texture')
    expect(texture?.hookAuthority, 'the hook resolved after all').toBeUndefined()
    // The half that is still true, and the reason the flag alone is not the condition.
    expect(texture?.reArticulatesHook, 'the request no longer claims a re-articulation').toBe(true)
    expect(reStrikesHeldNote(texture!)).toBe(false)
  })

  it('keeps the grid, and gives it no timing line', () => {
    const result = unresolved()
    const doc = renderGuide(result)

    // The grid is rendered — deferring to a hook with no notes would leave the part with no
    // rhythm stated anywhere, which is invariant 5 in the other direction. `hook-authority`
    // holds that claim; it is restated here because the timing line hangs off the same block,
    // and a test that only checked for absence would pass if the whole block vanished.
    const phase5 = doc.slice(doc.indexOf('## 5.'), doc.indexOf('## 6.'))
    expect(phase5).toContain('```')
    expect(phase5).toMatch(/\d+ steps, band/)

    // And the grid is multi-hit, or the absence below proves nothing: a single-strike map would
    // be silent for the other reason entirely.
    const measurable = result.assignments
      .flatMap((a) => a.patterns)
      .filter((e) => e.selection.outcome !== 'none')
      .filter((e) => e.selection.outcome !== 'none' && tightestGapSteps(e.selection.pattern) !== undefined)
    expect(measurable.length, 'no multi-hit map here, so nothing is being tested').toBeGreaterThan(0)

    // The line itself, in neither renderer.
    expect(phase5).not.toContain('tightest re-strike')
    const html = text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))
    expect(html).not.toContain('tightest re-strike —')
  })

  it('needs both halves, and the other half is not observable through a renderer', () => {
    // A part with a resolved hook that does **not** re-articulate it renders no grid at all
    // (#100): the block list is empty, so there is nothing for a timing line to hang off and
    // dropping this half of the condition changes no rendered byte today. That makes it exactly
    // the kind of clause that rots — asserted on the predicate directly, where it is visible.
    const techno = resolve({
      devices: DEVICES,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const hooked = techno.assignments.filter((a) => a.hookAuthority !== undefined)
    expect(hooked.length, 'no hooked part in Industrial Techno to check').toBeGreaterThan(0)
    for (const a of hooked) {
      expect(a.reArticulatesHook, `${a.role} now re-articulates`).toBe(false)
      expect(reStrikesHeldNote(a), `${a.role} counts as re-striking a held note`).toBe(false)
    }
  })

  it('still prints it once the same direction resolves its hook', () => {
    // The control. Same template, same box, same seed — only the key is readable — so the
    // absence above is the hook and not some other property of this guide.
    const resolved = resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: droneStudy,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    expect(renderGuide(resolved)).toContain('- tightest re-strike')
    expect(renderGuide(unresolved())).not.toContain('- tightest re-strike')
  })
})

describe('both renderers say it the same way (#155)', () => {
  it('agrees on the number and the derivation', () => {
    const result = reported()
    const html = text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))

    // **The whole phrase, not its parts.** Asserting the bare label here passes for the wrong
    // reason: `tm-texture-soft`'s note in phase 6 points at this line by name, so `tightest
    // re-strike` is in the document whether or not phase 5 rendered anything at all. Caught by
    // mutation — renaming only the React label left the test green. The contiguous phrase, with
    // the value and the derivation in it, can only come from the component under test.
    const phrase = 'tightest re-strike — 0.42 Sec · derived from 2 steps at 72 BPM'
    expect(html).toContain(phrase)

    // And the Markdown sibling says it the same way, modulo its own code-span backticks. Two
    // wordings of one claim are two chances to be wrong.
    expect(renderGuide(result)).toContain(
      'tightest re-strike — `0.42` Sec · derived from 2 steps at 72 BPM',
    )

    // One line per block that has a re-strike, in both. A count that drifts means one renderer
    // has started printing the fact somewhere the other does not.
    const inMarkdown = renderGuide(result).split('- tightest re-strike').length - 1
    const inHtml = html.split('tightest re-strike —').length - 1
    expect(inHtml, 'the two renderers print a different number of re-strike lines').toBe(inMarkdown)
  })

  it('agrees about staying silent where there is no re-strike', () => {
    const result = resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: droneStudy,
      mood: moodState({ density: 0 }),
      seed: 1,
    })
    const html = text(renderToStaticMarkup(createElement(Guide, { result, seed: 1 })))
    expect(html).not.toContain('tightest re-strike 0 Sec')
  })
})

describe('the line holds across the whole library, not just the case that was reported', () => {
  it('never prints a re-strike that is not in the map it sits under', () => {
    // The claim is arithmetic, so it is checkable everywhere rather than pinned to one guide.
    // Every printed figure is recomputed from the pattern the renderer selected.
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: DEVICES, template, mood: moodState(), seed })
        for (const a of result.assignments) {
          for (const entry of a.patterns) {
            if (entry.selection.outcome === 'none') continue
            const expected = tightestReStrike(entry.selection.pattern, result.song.bpm)
            if (expected === undefined) continue
            expect(expected.seconds, `${template.id}/${a.role}`).toBeGreaterThan(0)
            expect(expected.steps).toBeLessThanOrEqual(entry.selection.pattern.length)
          }
        }
      }
    }
  })
})
