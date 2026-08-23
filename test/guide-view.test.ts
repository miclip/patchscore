import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  GUIDE_PHASES,
  NEUTRAL_MOOD,
  bandTrajectory,
  dominantRangeCite,
  fxSources,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { fxText } from '../components/guide/format'
import { mergeBlocks } from '../components/guide/phase-steps'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * #33. The web guide and the Markdown guide are **siblings** reading one `ResolveResult`, not
 * stages in a pipeline. Nothing checks that automatically — they share no code path by design —
 * so this file is the check: same phases, same parts, same values, same holes.
 *
 * "Share no code path" is a rule about **ink**, not about arithmetic: derived musical facts —
 * §6.3's band trajectory in `lib/core/arrangement.ts` — are computed once and read by both, and
 * two copies of a claim like "these sections are the same page" would give a drifting copy the
 * power to be wrong about the box in front of somebody. What is written twice is formatting.
 *
 * It is deliberately not a snapshot. `test/guide-golden.test.ts` pins the Markdown byte for
 * byte because a person reads those bytes; markup is restyled constantly and a snapshot of it
 * would fail on every CSS-driven change while catching none of the things that matter here.
 */

function html(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1 }))
}

const golden = resolve({
  devices: GOLDEN_DEVICES,
  template: GOLDEN_TEMPLATE,
  mood: GOLDEN_MOOD,
  seed: GOLDEN_SEED,
})

const real = resolve({
  devices: DEVICES,
  template: industrialTechno,
  mood: NEUTRAL_MOOD,
  seed: 1,
})

/**
 * One box, one voice, twelve requests: a rig that is mostly holes. The full library fills every
 * request the golden template makes, so a gap assertion needs a rig that does not.
 */
const sparse = resolve({
  devices: DEVICES.filter((d) => d.id === 'intellijel-cascadia'),
  template: industrialTechno,
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
    // A phase with nothing in it says so rather than disappearing — flatly, in as few words
    // as the fact takes.
    expect(out.split('No parts assigned.').length - 1).toBeGreaterThanOrEqual(3)
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

describe('gaps read as advice, but are named Gaps (#33)', () => {
  // The heading says what the section is; the *lines* carry the helpful tone. Naming the
  // section "Advice" told a reader nothing and softened the word, which is the opposite of
  // invariant 5. Markdown and the view now agree.
  it('names every gap under Gaps, and never as an error', () => {
    const out = html(real)
    expect(out).toContain('>Gaps<')
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
    // Checked on both rigs, because the full library now *fills every request* and a hole test
    // run only against it would pass vacuously for ever. `sparse` is one monophonic semi-modular
    // against a template that asks for twelve parts, so the holes are real and plentiful — and
    // two of them are polyphony shortfalls rather than capability ones, which is the case the
    // two renderers most easily disagree about.
    for (const result of [real, sparse]) {
      const out = html(result)
      const markdown = renderGuide(result)
      for (const gap of result.gaps) {
        expect(out).toContain(gap.role)
        expect(markdown).toContain(gap.role)
      }
    }
    expect(sparse.gaps.length).toBeGreaterThan(0)
  })
})

describe('inline token lists keep their separators', () => {
  it('separates the sections in each band group, and the roles in each note', () => {
    const out = text(html(real))
    const trajectory = bandTrajectory(real)

    // The bug this covers rendered `kickclapclosed-hatopen-hat`: adjacent spans in a container
    // with no gap. A separator that lives in CSS can be lost silently; this one is markup.
    const grouped = trajectory.groups.filter((g) => g.sections.length > 1)
    expect(grouped.length).toBeGreaterThan(0)
    for (const group of grouped) expect(out).toContain(group.sections.join(', '))

    // Roles in a note are joined the same way the Markdown sibling joins them.
    expect(trajectory.unpatterned.length).toBeGreaterThan(1)
    const last = trajectory.unpatterned[trajectory.unpatterned.length - 1] as string
    expect(out).toContain(`${trajectory.unpatterned.slice(0, -1).join(', ')} and ${last}`)
  })

  it('separates the sections a part occupies, and the axes a mood move names', () => {
    const out = text(html(real))
    // What the page prints under one heading is the *merged* group of sections that program
    // identically, not every section the part occupies: energy picks the band per section
    // (§6.3), so a continuous part routinely spans several headings.
    let multiSection = 0
    for (const a of real.assignments) {
      for (const block of mergeBlocks(a)) {
        if (block.sections.length > 1) {
          multiSection++
          expect(out).toContain(block.sections.join(', '))
        }
      }
      // Transient parts name their sections in Finishing as a list of their own.
      if (a.sections.length > 1 && a.sections.length < real.template.structure.length) {
        expect(out).toContain(a.sections.join(', '))
      }
    }
    expect(multiSection).toBeGreaterThan(0)
    const moved = real.assignments
      .flatMap((a) => a.params)
      .flatMap((p) => (p.provenance.state !== 'authored' ? (p.provenance.axes ?? []) : []))
      .filter((axes) => axes.length > 0)
    for (const axes of moved) expect(out).toContain(axes)
  })
})

describe('slot lines are worded the same in both renderers (§8)', () => {
  it('hoists a shared velocity in the view exactly as the Markdown does', () => {
    const view = text(html(real))
    const md = renderGuide(real)
    const shared = md.match(/- `[a-z-]+` — [^\n]*\(all vel \d+\)/g) ?? []
    expect(shared.length).toBeGreaterThan(0)
    for (const line of shared) {
      // Same words, minus the Markdown punctuation the view expresses as markup.
      expect(view).toContain(line.replace(/^- /, '').replace(/`/g, '').replace(' — ', '—'))
    }
  })
})

describe("Finishing's band trajectory says the same thing in both renderers (§6.3)", () => {
  // The two renderers share no code path, so this is the only thing holding their arrangement
  // sections together. Asserted as *facts* rather than as bytes: the markup carries a hint
  // column and the Markdown does not, so a byte comparison would fail on formatting alone.
  const arrangement = (doc: string) => doc.slice(doc.indexOf('**Arrangement variations**'))

  it('names the same band groups in the same order', () => {
    const view = text(html(real))
    const md = arrangement(renderGuide(real))
    const groups = bandTrajectory(real).groups
    expect(groups.length).toBeGreaterThan(1)
    let at = -1
    for (const group of groups) {
      const label = group.band === undefined ? 'no parts' : `band ${String(group.band)}`
      const sections = group.sections.join(', ')
      expect(md).toContain(`**${label}** — ${sections}`)
      expect(view).toContain(`${label} ${sections}`)
      // Order matters: the trajectory is read top to bottom as the track plays.
      const next = view.indexOf(`${label} ${sections}`)
      expect(next).toBeGreaterThan(at)
      at = next
    }
  })

  it('names the same parts outside the trajectory', () => {
    const view = text(html(real))
    const md = arrangement(renderGuide(real))
    const { unpatterned } = bandTrajectory(real)
    expect(unpatterned.length).toBeGreaterThan(0)
    for (const role of unpatterned) {
      expect(view).toContain(role)
      expect(md).toContain(`\`${role}\``)
    }
  })

  it('drops the same three duplicated lists from both', () => {
    // Phase 1 owns bars and energy, phase 2 owns which parts play where, phase 3 owns the
    // device list. The old section reprinted all three.
    const view = text(html(real))
    const md = arrangement(renderGuide(real))
    const tail = view.slice(view.indexOf('Arrangement variations'))
    for (const device of real.devices) {
      expect(md, device.name).not.toContain(device.name)
      expect(tail, device.name).not.toContain(device.name)
    }
    for (const word of ['energy', 'bars']) {
      expect(md, word).not.toContain(word)
      expect(tail, word).not.toContain(word)
    }
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

describe('copy says what is true, not what we declined to do', () => {
  it('narrates no restraint, cites no design section, and names no data structure', () => {
    const out = text(html(real))
    for (const phrase of ['was invented', '§', 'not modelled', 'authors none']) {
      expect(out, phrase).not.toContain(phrase)
    }
  })
})

describe('hooks read as chords', () => {
  it('puts every note sharing a step on one row, with its degree named', () => {
    const out = html(real)
    for (const choice of real.song.hooks) {
      if (choice.chosen.outcome !== 'resolved') continue
      const steps = new Set(choice.chosen.hook.notes.map((n) => n.step))
      // One row per distinct step, not per note: a triad is one chord, not three events.
      expect(steps.size).toBeLessThanOrEqual(choice.chosen.hook.notes.length)
    }
    expect(out).toContain('class="chord"')
    expect(out).toContain('>root<')
    expect(out).not.toContain('>degree<')
  })
})

describe('range citations hoist in the web view too', () => {
  it('states a repeated citation once per recipe and keeps only the exceptions inline', () => {
    const out = text(html(real))
    let hoistedRecipes = 0

    for (const a of real.assignments) {
      const hoisted = dominantRangeCite(a.params)
      if (hoisted === undefined) {
        // No unambiguous repetition: every citation stays where it was.
        for (const param of a.params) {
          if (param.range === undefined || param.range.verified === false) continue
          expect(out).toContain(`range ${param.range.verified.kind} — ${param.range.verified.source}`)
        }
        continue
      }

      hoistedRecipes += 1
      expect(out).toContain(`Ranges cite ${hoisted.kind} — ${hoisted.source}.`)

      // Every exception is still on the page; the shared one is not repeated under each line.
      const exceptions = a.params.filter(
        (p) =>
          p.range !== undefined &&
          p.range.verified !== false &&
          !(p.range.verified.kind === hoisted.kind && p.range.verified.source === hoisted.source),
      )
      for (const param of exceptions) {
        const cite = param.range?.verified
        if (cite === undefined || cite === false) continue
        expect(out).toContain(`range ${cite.kind} — ${cite.source}`)
      }
    }

    expect(hoistedRecipes).toBeGreaterThan(0)
  })

  it('hoists no value citation — that is a claim about one number', () => {
    const out = text(html(golden))
    const valueCites = golden.assignments.flatMap((a) =>
      a.params.flatMap((p) => (p.provenance.state === 'provisional' ? [] : [p.provenance.cite])),
    )
    expect(valueCites.length).toBeGreaterThan(0)
    for (const cite of valueCites) {
      expect(out).toContain(`value ${cite.kind} — ${cite.source}`)
    }
  })
})

describe("Finishing's Master FX says the same thing in both renderers (#59)", () => {
  // The same rule as the band trajectory above: the *fact* that a box processes audio is
  // derived once in `lib/core/fx.ts`, and the sentence is written twice. Asserted against the
  // real library because the point of #59 is a false negative the real library produced — the
  // TR-1000 was told it had no effects while carrying four of them on its own panel.
  const master = (doc: string) =>
    doc.slice(doc.indexOf('Master FX'), doc.indexOf('Arrangement variations'))

  const tr = resolve({
    devices: DEVICES.filter((d) => d.id === 'roland-tr-1000'),
    template: TEMPLATES[0] as (typeof TEMPLATES)[number],
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

  it('names the TR-1000 panel effects rather than claiming the rig has none', () => {
    const sentence =
      'The TR-1000 carries REVERB, DELAY, MASTER FX and ANALOG FX on the panel, ' +
      'and DLY SEND and RVB SEND in its recipes; nothing else in this rig processes audio.'
    expect(master(text(html(tr)))).toContain(sentence)
    expect(master(renderGuide(tr))).toContain(sentence)
    // The sentence this replaced, in both renderers.
    for (const doc of [text(html(tr)), renderGuide(tr)]) {
      expect(doc).not.toContain('No effects unit or mixer in this rig')
    }
  })

  it('names the same boxes, in the same order, when several process audio', () => {
    const sources = fxSources(real.devices)
    expect(sources.length).toBeGreaterThan(1)
    const view = master(text(html(real)))
    const md = master(renderGuide(real))
    let at = -1
    for (const source of sources) {
      const device = real.devices.find((d) => d.id === source.deviceId)
      const phrase = fxText(source, device)
      expect(md).toContain(`- ${source.name} — ${phrase}`)
      expect(view).toContain(`${source.name} ${phrase}`)
      const next = view.indexOf(`${source.name} ${phrase}`)
      expect(next).toBeGreaterThan(at)
      at = next
    }
    // Several sources means no box can claim to be the only one.
    expect(md).not.toContain('nothing else in this rig')
    expect(view).not.toContain('nothing else in this rig')
  })

  it('says nothing processes audio for a rig where nothing does', () => {
    // The Cascadia has a wave folder and a soft clip — sound design, one voice at a time — and
    // no effect. Naming either under Master FX would be inventing a chain (invariant 5).
    const line = 'Nothing in this rig processes audio. The master chain is yours at the desk.'
    expect(fxSources(sparse.devices)).toEqual([])
    expect(master(text(html(sparse)))).toContain(line)
    expect(master(renderGuide(sparse))).toContain(line)
  })
})
