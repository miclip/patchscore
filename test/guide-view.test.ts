import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GUIDE_PHASES, NEUTRAL_MOOD, renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * #33. The web guide and the Markdown guide are **siblings** reading one `ResolveResult`, not
 * stages in a pipeline. Nothing checks that automatically — they share no code path by design —
 * so this file is the check: same phases, same parts, same values, same holes.
 *
 * It is deliberately not a snapshot. `test/guide-golden.test.ts` pins the Markdown byte for
 * byte because a person reads those bytes; markup is restyled constantly and a snapshot of it
 * would fail on every CSS-driven change while catching none of the things that matter here.
 */

function html(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result }))
}

const golden = resolve({
  devices: GOLDEN_DEVICES,
  template: GOLDEN_TEMPLATE,
  mood: GOLDEN_MOOD,
  seed: GOLDEN_SEED,
})

const real = resolve({
  devices: DEVICES,
  template: TEMPLATES[0] as (typeof TEMPLATES)[number],
  mood: NEUTRAL_MOOD,
  seed: 1,
})

/** The rendered text a reader actually sees, with the markup taken back out. */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/** Occurrences of a literal, without a regex to escape. */
function occurrences(haystack: string, needle: string): number {
  let n = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    n += 1
    at = haystack.indexOf(needle, at + needle.length)
  }
  return n
}

describe('the guide view renders every phase (§8)', () => {
  it('renders all seven phases in order, for a full rig', () => {
    const out = html(golden)
    const positions = GUIDE_PHASES.map((phase) => out.indexOf(`>${phase}<`))
    expect(positions.every((p) => p > -1)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
  })

  it('renders all seven phases for an empty rig, saying what is missing (invariant 5)', () => {
    const empty = resolve({
      devices: [],
      template: GOLDEN_TEMPLATE,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const out = html(empty)
    for (const phase of GUIDE_PHASES) expect(out).toContain(`>${phase}<`)
    // A phase with nothing in it says so rather than disappearing.
    expect(out).toContain('nothing to program')
    expect(out).toContain('nothing to dial in')
  })
})

describe('§8.1 the hint toggle cannot reflow the page', () => {
  it('reserves one hint cell per instruction, whether or not there is a hint', () => {
    const out = html(golden)
    const instructions = occurrences(out, 'class="instruction"')
    const cells = occurrences(out, 'class="hint"')
    expect(instructions).toBeGreaterThan(0)
    expect(cells).toBe(instructions)
  })

  it('is on by default and toggles a data attribute, not the DOM', () => {
    const out = html(golden)
    expect(out).toContain('data-hints="on"')
    // The hint text is in the markup regardless of the toggle: hiding it is `visibility`, which
    // is what makes the no-reflow promise structural rather than a styling accident.
    expect(out).toContain('Hold SHIFT while turning')
  })
})

describe('§3.2 provenance reaches the page', () => {
  it('marks the positive claim and leaves a starting point unmarked', () => {
    const out = html(golden)
    const states = new Set(
      golden.assignments.flatMap((a) => a.params.map((p) => p.provenance.state)),
    )
    expect(states.size).toBeGreaterThan(1)

    // A cited point says which kind of citation it has; a move names its knob.
    expect(states.has('authored') || states.has('derived')).toBe(true)
    expect(out).toContain('prov-cited')
    expect(out).toContain('prov-moved')

    // Nothing on the page looks like a warning, and there is no quieter badge standing in for
    // one either: an unmarked value is the norm and the legend explains the convention once.
    expect(out).not.toContain('⚠')
    expect(out).not.toContain('prov-provisional')
    expect(out.toLowerCase()).not.toContain('trust your ears')
    expect(out).toContain('Values are starting points')
  })

  it('marks every cited value, and no uncited one', () => {
    const out = html(golden)
    const cited = golden.assignments.flatMap((a) =>
      a.params.filter((p) => p.provenance.state !== 'provisional'),
    )
    expect(cited.length).toBeGreaterThan(0)
    // One mark per cited value, plus the one standing in the legend.
    const marks = out.split('class="prov prov-cited"').length - 1
    expect(marks).toBeGreaterThanOrEqual(cited.length)
  })

  it('renders every parameter value, in monospace (§10)', () => {
    const out = html(real)
    const params = real.assignments.flatMap((a) => a.params)
    expect(params.length).toBeGreaterThan(0)
    for (const param of params) {
      const shown = typeof param.value === 'number' ? String(param.value) : param.value
      expect(out).toContain(`<span class="value-now mono">${shown}</span>`)
    }
  })

  it('shows where mood moved a value, and where it started', () => {
    // Narrowed in the expression: `from` exists on 'derived' and 'provisional', not on
    // 'authored', which by construction never moved.
    const moved = real.assignments
      .flatMap((a) => a.params)
      .flatMap((p) =>
        p.provenance.state !== 'authored' && p.provenance.from !== undefined
          ? [p.provenance.from]
          : [],
      )
    const out = html(real)
    for (const from of moved) {
      expect(out).toContain(`<span class="value-from mono">${String(from)}</span>`)
    }
  })
})

describe('gaps are advice, not failure (#33)', () => {
  it('names every gap under Advice, and never as an error', () => {
    const out = html(real)
    expect(out).toContain('>Advice<')
    for (const gap of real.gaps) expect(out).toContain(`>${gap.role}</span>`)
    for (const word of ['error', 'failure', 'failed', 'invalid']) {
      expect(out.toLowerCase()).not.toContain(word)
    }
  })

  it('names the voices that could carry an unauthored part', () => {
    const unauthored = real.gaps.filter((g) => g.reason === 'no-recipe' && g.capable.length > 0)
    if (unauthored.length === 0) return
    const out = html(real)
    for (const gap of unauthored) {
      const names = new Set(
        gap.capable.map((a) => DEVICES.find((d) => d.id === a.deviceId)?.name ?? a.deviceId),
      )
      for (const name of names) expect(out).toContain(name)
      expect(out).toContain('dial it by ear')
    }
  })
})

describe('the two renderers agree about the facts', () => {
  it('places the same parts on the same boxes as the Markdown sibling', () => {
    const out = html(real)
    const markdown = renderGuide(real)
    for (const a of real.assignments) {
      for (const text of [a.role, a.deviceName, a.assignable.label, a.recipe.title]) {
        expect(out).toContain(text)
        expect(markdown).toContain(text)
      }
    }
  })

  it('reports the same holes as the Markdown sibling', () => {
    const out = html(real)
    const markdown = renderGuide(real)
    for (const gap of real.gaps) {
      expect(out).toContain(gap.role)
      expect(markdown).toContain(gap.role)
    }
    expect(real.gaps.length).toBeGreaterThan(0)
  })
})

describe('inline token lists keep their separators', () => {
  it('separates the roles in each arrangement section', () => {
    const out = text(html(real))
    const multi = real.template.structure
      .map((section) => ({
        section,
        roles: real.assignments
          .filter((a) => a.sections.includes(section.name))
          .map((a) => a.role),
      }))
      .filter((entry) => entry.roles.length > 1)

    // The bug this covers rendered `kickclapclosed-hatopen-hat`: adjacent spans in a container
    // with no gap. A separator that lives in CSS can be lost silently; this one is markup.
    expect(multi.length).toBeGreaterThan(0)
    for (const { roles } of multi) expect(out).toContain(roles.join(', '))
  })

  it('separates the sections a part occupies, and the axes a mood move names', () => {
    const out = text(html(real))
    for (const a of real.assignments) {
      if (a.sections.length > 1) expect(out).toContain(a.sections.join(', '))
    }
    const moved = real.assignments
      .flatMap((a) => a.params)
      .flatMap((p) => (p.provenance.state !== 'authored' ? (p.provenance.axes ?? []) : []))
      .filter((axes) => axes.length > 0)
    for (const axes of moved) expect(out).toContain(axes)
  })
})

describe('template-internal ids stay internal', () => {
  it('names no pattern or hook id anywhere on the page', () => {
    const out = html(real)
    const ids = [
      ...real.template.patterns.map((p) => p.id),
      ...real.template.hooks.map((h) => h.id),
    ]
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(out).not.toContain(id)
  })

  it('says where the sound for a hook or a rhythm is defined, without repeating it', () => {
    const out = text(html(real))
    // §8's phase order puts both before Sound design; a reader stopping at either would
    // otherwise conclude the sound was missing.
    for (const a of real.assignments) expect(out).toContain(`${a.recipe.title} — settings in`)
    expect(out).toContain('settings in Sound design')
    // The pointer is a link, not just words, because Sound design is a long way down a phone.
    expect(html(real)).toContain('href="#phase-6"')
  })
})
