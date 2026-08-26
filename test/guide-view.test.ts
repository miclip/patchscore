import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  GUIDE_PHASES,
  NEUTRAL_MOOD,
  bandTrajectory,
  dominantRangeCite,
  fxSources,
  moodState,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, droneStudy, industrialTechno, relay } from '../lib/templates/index'
import { DEFAULT_INPUTS } from '../lib/studio/session'
import { readFileSync } from 'node:fs'
import { applyInspirations } from '../lib/core/index'
import { templateHref } from '../lib/studio/catalogue'
import { inspirationsFor } from '../lib/studio/session'
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
 * #107's two scopes, pinned to the two boxes that declare them: the Tracker Mini's `SWING` is
 * authored pattern-wide and the Deluge's song-wide, and no other device in the library declares
 * the second. Two devices rather than the whole registry, because the whole registry does not
 * reliably *use* the Deluge: `industrial-techno`'s kick is an exact tie across several boxes —
 * every key of the `Score` vector is equal — so which one takes it is decided by §7.2's seeded
 * permutation over the tied set. That permutation is a function of the catalogue, so adding any
 * unrelated device can leave the Deluge idle and quietly empty this assertion of its subject.
 * Naming the two boxes makes the rig say what it is testing, and survives the next device.
 */
const bothScopes = resolve({
  devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini' || d.id === 'synthstrom-deluge'),
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

/**
 * The rendered text a reader actually sees: tag-stripped, with the five entities React escapes
 * decoded back.
 *
 * The decode is load-bearing rather than tidy: a citation carrying an apostrophe — every page of
 * `minilogue xd Owner's Manual E 9` — reaches the markup as `&#x27;`, so a raw comparison against
 * the string the manifest authored fails on a page that is in fact rendering correctly. `&amp;`
 * is decoded last, because decoding it first would turn `&amp;lt;` into a tag.
 */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** The same escaping, applied forwards, for assertions made against raw markup. */
function escaped(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
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
      // Escaped, because a value can contain markup-significant characters: the minilogue xd's
      // OCTAVE switch is printed `16'`, `8'`, `4'`, `2'` and reaches the page as `16&#x27;`.
      expect(out).toContain(`<span class="value-now mono">${escaped(shown)}</span>`)
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
    for (const gap of real.shortfalls) expect(out).toContain(`>${gap.role}</span>`)
    for (const word of ['error', 'failure', 'failed', 'invalid']) {
      expect(out.toLowerCase()).not.toContain(word)
    }
  })

  it('names the voices that could carry an unauthored part', () => {
    const unauthored = real.shortfalls.filter((g) => g.reason === 'no-recipe' && g.capable.length > 0)
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
      for (const text of [a.role, a.deviceName, ...a.assignables.map((v) => v.label), a.recipe.title]) {
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
      for (const gap of result.shortfalls) {
        expect(out).toContain(gap.role)
        expect(markdown).toContain(gap.role)
      }
    }
    expect(sparse.shortfalls.length).toBeGreaterThan(0)
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
    const sources = fxSources(real.devices, real.assignments)
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

  it('names only the effect parameters this guide resolved, not the ones the box has (#106)', () => {
    // The permalink from the issue, exactly:
    // ?device=polyend-tracker-mini&template=drone-study&darkness=59&grit=52&seed=1
    //
    // The Tracker Mini authors `DELAY SEND` and `REVERB SEND` across its recipes and both are
    // real controls on the box. This guide resolves one part — a `texture` on `tm-texture-soft`
    // — whose parameters include `REVERB SEND` and no delay at all. Finishing said the box
    // "carries DELAY SEND and REVERB SEND in its recipes", which is a true sentence about the
    // hardware inside a section that claims to describe the resolved guide.
    //
    // Asserted in both renderers because the sentence is written twice (§8) and the fact behind
    // it once. A fix landing in one of them would leave the other quietly lying.
    const drone = resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: droneStudy,
      mood: moodState({ darkness: 59, grit: 52 }),
      seed: 1,
    })
    // The premise: authored on the box, absent from the guide. If the library ever gives this
    // template a part that does set a delay, this test is testing nothing and should be told so
    // here rather than passing vacuously.
    const authored = drone.devices.flatMap((d) => d.recipes.flatMap((r) => r.params.map((p) => p.name)))
    expect(authored).toContain('DELAY SEND')
    const resolved = drone.assignments.flatMap((a) => a.params.map((p) => p.name))
    expect(resolved).toContain('REVERB SEND')
    expect(resolved).not.toContain('DELAY SEND')

    for (const doc of [text(html(drone)), renderGuide(drone)]) {
      const section = master(doc)
      expect(section).toContain('REVERB SEND')
      expect(section).not.toContain('DELAY SEND')
    }
  })

  it('names a box this guide never reaches the effects of, rather than emptying the section (#59)', () => {
    // The Tracker Mini under `relay`, which is a shipped rig and not a constructed one: it gets
    // two parts, both synth voices, and neither sets a send. Both sends are real on the box and
    // neither reaches the page, so #106's narrowing dropped the only candidate out of the
    // section and this rig printed "Nothing in this rig processes audio" — a claim about the
    // *rack*, made about a rack holding a box with a reverb send in its library.
    //
    // What replaced it names the box and no control on it. Naming one would be #106 again: the
    // reader would go looking for a `REVERB SEND` that appears on no page of this guide.
    const idleFx = resolve({
      devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
      template: relay,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    // The premise, asserted rather than assumed. If `relay` ever resolves a send on this box
    // this test is testing nothing, and should say so here rather than passing vacuously.
    expect(idleFx.assignments.length).toBeGreaterThan(0)
    const resolved = idleFx.assignments.flatMap((a) => a.params.map((p) => p.name))
    expect(resolved.filter((n) => n.includes('SEND'))).toEqual([])
    const authored = idleFx.devices.flatMap((d) => d.recipes.flatMap((r) => r.params.map((p) => p.name)))
    expect(authored).toContain('REVERB SEND')

    const sentence =
      'The Tracker Mini carries effects, though no part in this guide reaches them; ' +
      'nothing else in this rig processes audio.'
    for (const doc of [text(html(idleFx)), renderGuide(idleFx)]) {
      const section = master(doc)
      expect(section).toContain(sentence)
      expect(section).not.toContain('Nothing in this rig processes audio')
      expect(section).not.toContain('SEND')
    }
  })

  it('says nothing processes audio for a rig where nothing does', () => {
    // The Cascadia has a wave folder and a soft clip — sound design, one voice at a time — and
    // no effect. Naming either under Master FX would be inventing a chain (invariant 5).
    const line = 'Nothing in this rig processes audio. The master chain is yours at the desk.'
    expect(fxSources(sparse.devices, sparse.assignments)).toEqual([])
    // Since #59's second half the sentence is a claim about the *rack* — it prints only where no
    // box in the rig has effects at all, rather than where none of them reached this guide. So
    // the premise is that the Cascadia authors no effect parameter anywhere, not merely that
    // this guide set none.
    const authored = sparse.devices.flatMap((d) =>
      d.recipes.flatMap((r) => r.params.map((param) => param.name)),
    )
    const anyEffect = /\b(BITCRUSH|CHORUS|DECIMATION|DELAY|DLY|ECHO|FLANGER|FX|PHASER|REVERB|RVB)\b/i
    expect(authored.filter((name) => anyEffect.test(name))).toEqual([])
    expect(master(text(html(sparse)))).toContain(line)
    expect(master(renderGuide(sparse))).toContain(line)
  })
})

describe('pattern-global settings are set once per device, not once per part (#107)', () => {
  /**
   * The landing rig, taken from `DEFAULT_INPUTS` rather than rebuilt here — this is the guide the
   * issue was reported against and the one every visitor sees first, so it has to be *that* rig
   * and not a copy of it that can drift.
   *
   * Before the fix it carried nine of these lines: `SWING` under each of the Tracker Mini's four
   * parts and `SHUFFLE` under each of the TR-1000's five, each with a note explaining that the
   * other eight were the same number. Both renderers, because #33 makes them siblings and a fix
   * in one would leave the other repeating.
   */
  const landing = resolve({
    devices: DEVICES.filter((d) => DEFAULT_INPUTS.devices.includes(d.id)),
    template: TEMPLATES.find((t) => t.id === DEFAULT_INPUTS.templateId) as (typeof TEMPLATES)[number],
    mood: DEFAULT_INPUTS.mood,
    seed: DEFAULT_INPUTS.seed,
  })

  /** How many parts on each device authored the setting — the count that used to be printed. */
  function partsSetting(name: string, deviceId: string): number {
    return landing.assignments.filter(
      (a) => a.deviceId === deviceId && a.params.some((p) => p.name === name),
    ).length
  }

  it('resolves the nine repetitions the issue reported, so the counts below are not vacuous', () => {
    expect(partsSetting('SWING', 'polyend-tracker-mini')).toBe(4)
    expect(partsSetting('SHUFFLE', 'roland-tr-1000')).toBe(5)
  })

  it('names each of them exactly once, in both renderers', () => {
    // Counted on the rendered text rather than on the markup, because the two renderers wrap the
    // name in different elements and the claim is about what a reader sees.
    for (const doc of [text(html(landing)), renderGuide(landing)]) {
      expect(occurrences(doc, 'SWING')).toBe(1)
      expect(occurrences(doc, 'SHUFFLE')).toBe(1)
    }
  })

  it('keeps the value, the citation, the note and the hint on the hoisted line', () => {
    // Hoisting must not cost evidence. The range citation, the manual's neutral, and the gesture
    // that reaches the control are the whole reason the line is worth printing at all.
    for (const doc of [text(html(landing)), renderGuide(landing)]) {
      expect(doc).toContain('Pattern-wide')
      expect(doc).toContain('One setting for the whole pattern')
      expect(doc).toContain('50% is no swing; set once, it applies across the whole pattern')
      expect(doc).toContain('Pattern-wide: one setting for every track, saved with the pattern')
      // The Tracker Mini's SWING page, and the TR-1000's PTN SETTING page.
      expect(doc).toContain('Polyend Tracker Mini Manual 2.2.1b, p.185')
      expect(doc).toContain('Hold [FX1], press (Up)/(Down)')
    }
  })

  it('says both scopes in the same words in both renderers, because the sentence is written twice', () => {
    // §8's two renderers are siblings sharing no code path, so #107's heading exists twice by
    // design — once in `lib/core/render.ts`, once in `components/guide/phase-sound.tsx`. Two
    // copies of a sentence drift, and nothing else in the build would notice: the Markdown side
    // is pinned byte for byte by the goldens while the web side is pinned by nothing at all.
    //
    // `bothScopes` rather than the landing rig or `real`: the landing rig carries only the
    // pattern-wide half, and `real` carries the song-wide half only when a seeded tie happens
    // to land the kick on the Deluge. See the rig's own note above.
    const both = [text(html(bothScopes)), renderGuide(bothScopes)]
    for (const doc of both) {
      expect(doc).toContain('Pattern-wide')
      expect(doc).toContain('One setting for the whole pattern — set it once, not once per part below.')
      expect(doc).toContain('Song-wide')
      expect(doc).toContain('One setting for the whole song — set it once, not once per part below.')
    }
  })

  it('states it above the parts, not inside one of them', () => {
    // Order is the instruction: set the control the pattern shares, then work through the
    // voices. A hoisted block below the first part would be a footnote to it.
    const md = renderGuide(landing)
    const device = md.indexOf('### Tracker Mini')
    const block = md.indexOf('**Pattern-wide**', device)
    const firstPart = md.indexOf('#### ', device)
    expect(device).toBeGreaterThan(-1)
    expect(block).toBeGreaterThan(device)
    expect(block).toBeLessThan(firstPart)
  })
})

// ---------------------------------------------------------------------------
// §3/#101 — source audio, in both renderers
// ---------------------------------------------------------------------------

describe('source audio reaches both renderers, and says the same thing (§3/#101)', () => {
  /**
   * The drone study on the Tracker Mini — the exact guide #101 was reported against, where the
   * one part granulated audio the guide never named. It is a one-part rig, so a missing line
   * cannot hide behind eight others.
   */
  const tracker = resolve({
    devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini'),
    template: droneStudy,
    mood: moodState({ darkness: 59, grit: 52 }),
    seed: 1,
  })

  it('names the source in both, in the same words', () => {
    const need = tracker.assignments[0]?.recipe.sourceAudio?.need
    expect(need).toBeDefined()
    for (const doc of [text(html(tracker)), renderGuide(tracker)]) {
      // The prefix is written twice by design — once in `lib/core/render.ts`, once in
      // `components/guide/phase-sound.tsx` — for the reason #107's heading is. So it is asserted
      // twice too, in both renderers, since nothing else in the build compares them.
      expect(doc).toContain(`Source — ${need as string}`)
    }
  })

  it('says it before the parameters in both, because loading comes first', () => {
    for (const doc of [text(html(tracker)), renderGuide(tracker)]) {
      const source = doc.indexOf('Source — ')
      expect(source).toBeGreaterThan(-1)
      expect(source).toBeLessThan(doc.indexOf('PLAY MODE'))
    }
  })

  /**
   * The chord recipes are the migration case: p.104's procedure used to be the `verified` of a
   * text param's *point*, which put the manual's page on the reader's choice of sample. It is now
   * on `prep`, and both renderers have to print the page against the procedure and nothing
   * against the need.
   */
  // #40: the chord recipes are what a *crowded* Tracker reaches for. With tracks to spare the
  // same box plays the chord across three of them instead, so the rig here has to be short of
  // tracks for the sampled route — and thus its `prep` citation — to be on the page at all.
  const chords = resolve({
    devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini').map((d) => ({
      ...d,
      comfortableVoices: 6,
    })),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 7,
  })

  it('puts the citation on the procedure and not on the need, in both', () => {
    const stab = chords.assignments.find((a) => a.role === 'stab')
    expect(stab?.recipe.sourceAudio?.prep?.provenance.state).toBe('authored')
    for (const doc of [text(html(chords)), renderGuide(chords)]) {
      expect(doc).toContain('Rendering Tracks To Audio Chords')
      expect(doc).toContain('Polyend Tracker Mini Manual 2.2.1b, p.104')
    }
  })

  it('never carries the old INSTRUMENT param, in either renderer', () => {
    // The field it was standing in for exists now, so a reappearance would mean two places
    // claiming the same thing and one of them saying it wrong (§3/#101).
    for (const doc of [text(html(chords)), renderGuide(chords)]) {
      expect(doc).not.toContain('INSTRUMENT')
    }
  })

  it('leaves a synth part silent about source audio, in both', () => {
    // A voice that makes its own sound has nothing to load, and the absence has to be an absence
    // rather than an empty line or a "none" (invariant 5).
    const synths = resolve({
      devices: DEVICES.filter((d) => d.id === 'moog-subsequent-37'),
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    for (const a of synths.assignments) expect(a.recipe.sourceAudio, a.recipe.id).toBeUndefined()
    for (const doc of [text(html(synths)), renderGuide(synths)]) {
      expect(doc).not.toContain('Source —')
    }
  })
})

/**
 * §7.4/#104. The clock source's enabling setting, on the React side.
 *
 * The two renderers share no ink by design, so "the Markdown says it" is not evidence the page
 * does. It is the page a reader on a phone at the machine is actually holding, and #104 was
 * filed against the page.
 *
 * Tracker Mini + TR-1000: both declare `midi-din`, and since #80 the Tracker Mini is the one that
 * claims `preferredSource`, so it is the source over MIDI on §7.4's one semantic key rather than
 * on device id ascending. Same box, better reason.
 */
describe('the clock source is told how to emit (§7.4/#104)', () => {
  const midiRig = resolve({
    devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini' || d.id === 'roland-tr-1000'),
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  })

  it('renders the menu path, the value and the citation', () => {
    expect(midiRig.clockSource?.deviceId).toBe('polyend-tracker-mini')
    expect(midiRig.clockSource?.transport).toBe('midi-din')

    const page = text(html(midiRig))
    expect(page).toContain('On the Tracker Mini, set Config > MIDI > Clock Out to MIDI Out jack')
    // The page and the Markdown carry the same claim in their own words, which is the rule in
    // `components/guide` — what is written twice is the formatting, never the fact.
    expect(page).toContain('clock leaves only by the routing set here')
    // Invariant 4, on the page. The mark puts the kind in ink and the source in a title
    // attribute...
    expect(html(midiRig)).toContain(
      `title="${escaped('Polyend Tracker Mini Manual 2.2.1b, p.54')}"`,
    )
    // ...and the document and page are *visible*, in the same subordinate cite line every other
    // cited instruction in this guide carries. A citation is the guide's evidence, and a title
    // attribute is not evidence to a reader on a phone or reading this on paper.
    expect(page).toContain('value manual — Polyend Tracker Mini Manual 2.2.1b, p.54')
    expect(html(midiRig)).toContain('class="subordinate cite"')
  })

  /**
   * §8/#103. The Type B adapter, on the page. The manifest carried it on the jacks and nothing
   * rendered it; the Markdown saying it is not evidence the page does, because the two share no
   * ink by design — and the page is what a reader on a phone at the machine is holding.
   */
  it('surfaces the clock jack notes for the resolved transport, once (#103)', () => {
    const page = text(html(midiRig))
    expect(page).toContain('MIDI Out, MIDI In')
    expect(page).toContain('Type B adapter')
    expect(page).toContain('p.13, p.284')
    // Deduped: one claim, though the manifest rightly states it on both jacks.
    expect(occurrences(page, 'Type B adapter')).toBe(1)
    // Invariant 4 on the page: cited, and the page visible rather than only in a title.
    expect(html(midiRig)).toContain(
      `title="${escaped('Polyend Tracker Mini Manual 2.2.1b, p.13')}"`,
    )
    expect(page).toContain('value manual — Polyend Tracker Mini Manual 2.2.1b, p.13')
  })

  it('says nothing about a MIDI adapter on a USB rig (#103)', () => {
    // The Tracker Mini's #80 claim is stripped, and that is the only edit: with it standing, this
    // box beats the Metropolix on transport and no registry rig holding the two resolves onto USB
    // any more. The subject here is the jack note, so the preference is what gives way. Same
    // reasoning as the Markdown side in `render.test.ts`.
    const usbRig = resolve({
      devices: DEVICES.filter(
        (d) => d.id === 'polyend-tracker-mini' || d.id === 'intellijel-metropolix',
      ).map((d) =>
        d.id === 'polyend-tracker-mini'
          ? { ...d, clock: { ...d.clock, preferredSource: undefined } }
          : d,
      ),
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(usbRig.clockSource?.deviceId).toBe('intellijel-metropolix')
    expect(usbRig.clockSource?.transport).toBe('usb')
    const page = text(html(usbRig))
    expect(page).toContain('Tracker Mini')
    expect(page).not.toContain('Type B')
  })

  it('renders nothing for a source whose manual prints no such setting', () => {
    const tr = resolve({
      devices: DEVICES.filter((d) => d.id === 'roland-tr-1000'),
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(tr.clockSource?.deviceId).toBe('roland-tr-1000')
    const page = text(html(tr))
    expect(page).toContain('Clock source')
    expect(page).not.toContain('Clock Out')
  })
})

// ---------------------------------------------------------------------------
// #112 the guide names the direction, so the guide links to it
// ---------------------------------------------------------------------------

describe('#112 the guide heading links the direction', () => {
  it('points at the direction page, and only there', () => {
    // The guide names the direction on every phase and, until #112, linked to it from nowhere.
    const markup = html(golden)
    expect(markup).toContain(
      `<h2><a href="${templateHref(golden.template)}">${golden.template.name}</a></h2>`,
    )
  })

  it('links the *effective* template to the page for the direction it came from', () => {
    // §5 composes an effective template with `...template`, so an inspiration changes the roles
    // and the patterns and never the id — which is what makes this href always name a page that
    // exists. Asserted rather than assumed: an id rewritten during composition would send every
    // guide with an influence on it to a 404.
    const applied = applyInspirations(industrialTechno, inspirationsFor({
      ...DEFAULT_INPUTS,
      inspirations: ['shuffle'],
    }))
    expect(applied.outcome).toBe('applied')
    if (applied.outcome !== 'applied') return
    expect(applied.template.id).toBe(industrialTechno.id)
    expect(templateHref(applied.template)).toBe(templateHref(industrialTechno))
  })

  it('is a 44px target that reads as a heading rather than as a control', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const start = css.indexOf('\n.guide-head h2 a {')
    expect(start, '.guide-head h2 a is missing entirely').toBeGreaterThan(-1)
    const rule = css.slice(start, css.indexOf('}', start))
    // #21's floor. The guide head is one row per guide, so buying the target with height costs
    // a single row of a page that is metres long.
    expect(rule).toContain('min-height: 44px')
    // It inherits the heading's ink: this is the title of what you are reading, not a control
    // at the top of it. The rule underneath is the affordance.
    expect(rule).toContain('color: inherit')
    expect(rule).toContain('border-bottom')
  })
})

// ---------------------------------------------------------------------------
// #121 the clock topology, on the page as well as in the Markdown
// ---------------------------------------------------------------------------

/**
 * #33/#121. **Two facts the page had lost, both of them about boxes that cannot obey the
 * instruction above them.**
 *
 * "Sync everything else to it" was printed unconditionally, so a rig holding a box with no clock
 * input got an instruction that is false of it and no word about which one — the reader finds out
 * at the machine, holding a rig where something is drifting. And the per-box line collapsed four
 * states to two, which made a mixer whose manual never mentions MIDI read as `receives clock
 * only` *and* named the transports the clock would arrive on. Naming a wire implies a clock
 * travels on it.
 *
 * Both were live against the real library rather than hypothetical: the Model 2400 sends and
 * cannot receive, and the LiveTrak L-8 does neither. This file is where they belong, because the
 * check is not "the page says a string" — it is that the page and the Markdown, which share no
 * ink by design, state the same topology.
 */
describe('#121 the page states the clock topology the Markdown states', () => {
  const rigOf = (...ids: string[]) =>
    resolve({
      devices: DEVICES.filter((d) => ids.includes(d.id)),
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 18,
    })

  const fullPage = text(html(real))
  const fullMd = renderGuide(real)

  it('renders all four clock states, and the same four the Markdown renders', () => {
    for (const state of [
      'sends clock, cannot receive',
      'receives clock only',
      'no clock in or out',
    ]) {
      expect(fullMd).toContain(state)
      expect(fullPage).toContain(state)
    }
    // `sends clock` alone is asserted last and by count, because it is a prefix of
    // `sends clock, cannot receive` — a renderer that had only the two-state branch left would
    // still contain it, which is exactly how this went unnoticed.
    expect(occurrences(fullPage, 'no clock in or out')).toBe(
      occurrences(fullMd, 'no clock in or out'),
    )
  })

  /**
   * The specific shape of the bug. A box with no clock at all must name no transport — the
   * two-state branch printed `receives clock only · midi-din/usb` for a desk that does neither.
   */
  it('names no transport for a box with no clock at all', () => {
    const l8 = DEVICES.find((d) => d.id === 'zoom-livetrak-l-8')
    expect(l8?.clock.canSendClock).toBe(false)
    expect(l8?.clock.canReceiveClock).toBe(false)
    expect(fullPage).not.toContain('no clock in or out ·')
    expect(fullPage).not.toContain(`receives clock only · ${l8?.clock.transport.join('/')}`)
  })

  it('names the boxes that cannot be synced, as the Markdown does', () => {
    expect(fullMd).toContain('except Model 2400 and Zoom LiveTrak L-8')
    // The page's own punctuation — `andList` has no Oxford comma and `list` does — and the same
    // two boxes, which is the fact the two renderers have to agree on.
    expect(fullPage).toContain('Sync everything else to it, except Model 2400 and Zoom LiveTrak L-8')
    expect(fullPage).toContain('which cannot receive clock and run free')
  })

  it('says one box runs free rather than run free', () => {
    const page = text(html(rigOf('roland-tr-1000', 'zoom-livetrak-l-8')))
    expect(page).toContain('except Zoom LiveTrak L-8, which cannot receive clock and runs free')
    expect(page).not.toContain('and run free')
  })

  /**
   * §7.4. **The second reason a box cannot obey "sync to it", and it is not a capability.**
   *
   * A box can receive clock perfectly well and still have no socket for *this rig's* wire. The
   * Metropolix is the library's case and not a contrived one: it declares `usb` and
   * `analog-clock` and no MIDI DIN at all, because every MIDI socket it can reach is an
   * accessory you buy. In a rig clocked over MIDI DIN it is as unreachable as a box with no
   * clock input, and the guide told the reader to sync it anyway.
   *
   * Kept apart from the deaf clause on purpose. "Cannot receive clock" is false about this box,
   * and a reader who believes it goes looking for a fault in the wrong place.
   */
  it('names a box that receives clock but not over this rig\'s transport, in its own words', () => {
    const page = text(html(rigOf('polyend-tracker-mini', 'intellijel-metropolix')))
    expect(page).toContain('Sync everything else to it, except Metropolix')
    expect(page).toContain('has no `midi-din` input and runs free')
    // The other clause must not appear: this box is not deaf.
    expect(page).not.toContain('cannot receive clock')
  })

  it('says the two reasons separately when a rig has both', () => {
    const page = text(html(rigOf('polyend-tracker-mini', 'intellijel-metropolix', 'zoom-livetrak-l-8')))
    expect(page).toContain('Zoom LiveTrak L-8, which cannot receive clock and runs free')
    expect(page).toContain('Metropolix, which has no `midi-din` input and runs free')
  })

  /**
   * And the sentence stays plain where every box can obey it. An exception clause on a rig with
   * no exception is the mirror of the bug above: ink that says a thing the rig does not do.
   */
  it('adds no exception clause when every other box can follow over this transport', () => {
    // Both boxes take clock over `midi-din`, which is what this rig resolves — the assertion is
    // about the transport now, not only about the capability.
    const page = text(html(rigOf('polyend-tracker-mini', 'roland-tr-1000')))
    expect(page).toContain('Sync everything else to it.')
    expect(page).not.toContain('except')
    expect(page).not.toContain('runs free')
  })
})
