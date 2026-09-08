import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type {
  ResolveResult,
  ResolvedAssignment,
  Role,
  SectionName,
  Template,
} from '../lib/core/index'
import {
  NEUTRAL_MOOD,
  isSingleTrigRiser,
  isSustainedPart,
  renderGuide,
  resolve,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { ambientDub, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * §8 phase 5/#473. **A `riser` the direction never patterned gets one instruction, not one
 * absence per section.**
 *
 * `riser` in Industrial Techno printed `no pattern authored for \`riser\` at any band (asked for
 * band 1)` — the same absence under every heading the part occupies, each carrying a band number
 * that decides nothing, because there is nothing authored at any band for it to have missed. It
 * is a one-shot: the reader places a trig, and the placement is the instruction.
 *
 * **The boundary is where most of this file's weight sits**, because the first draft of the rule
 * read the emptiness alone and was wrong. Four shapes share that emptiness and only one of them
 * is a single trig:
 *
 *  - a **`riser`** with nothing authored — the new sentence;
 *  - a **`texture`** with nothing authored — a bed, and it keeps its band-specific hole report;
 *  - a **`sweep`** with nothing authored — transitional, but Ambient Dub scopes one to `Swell` and
 *    one to `Recede`, so *arrives at the change* reads as a climb for the half that falls away.
 *    It keeps the hole report until it has wording of its own;
 *  - a **`pad`** — held, and it keeps §4.2's *Held, not struck*;
 *  - a **hooked** part — every one of them authors no variants, so #100 has to be read first.
 *
 * A fifth shape is not empty at all and must not be swept in: a part patterned in *some* of its
 * sections, whose silent sections are still §6.3's business.
 *
 * **What is asserted here is the rule and its boundaries, not the sentence.** The exact bytes are
 * `test/golden/*.golden.md`'s job (#46: a fixture pinned to wording fails an author who rephrases
 * it and passes one who drops the meaning). Both renderers are in this one file for #33's reason:
 * they share the *predicate* and write the ink twice, so the drift to guard against is one of them
 * keeping the old block.
 */

const PHASE_5 = '## 5. Step programming'
const TRIG = 'One trig, not a figure'

/** Phase 5's body, so an assertion cannot pass on phase 7's trajectory saying something similar. */
function stepProgramming(result: ResolveResult): string {
  const doc = renderGuide(result)
  const start = doc.indexOf(PHASE_5)
  expect(start, 'phase 5 heading').toBeGreaterThan(-1)
  const rest = doc.slice(start + PHASE_5.length)
  const end = rest.indexOf('\n## ')
  return end === -1 ? rest : rest.slice(0, end)
}

function html(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1, layout: 'phase' }))
}

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** One part's stretch of phase 5, so a claim about `sweep` cannot pass on the `texture` above it. */
function partBlock(md: string, role: Role): string {
  const start = md.indexOf(`### \`${role}\``)
  expect(start, `${role} should have a phase 5 heading`).toBeGreaterThan(-1)
  const rest = md.slice(start + 1)
  const end = rest.indexOf('### `')
  return end === -1 ? rest : rest.slice(0, end)
}

function part(result: ResolveResult, role: Role): ResolvedAssignment {
  const a = result.assignments.find((x) => x.role === role)
  expect(a, `${role} should be assigned in this fixture`).toBeDefined()
  return a as ResolvedAssignment
}

const run = (template: Template): ResolveResult =>
  resolve({ devices: GOLDEN_DEVICES, template, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })

/**
 * **Ambient Dub against the full library, which is the one fixture that holds the boundary in a
 * single guide**: it authors no variant for `riser`, `sweep` or `texture` and hooks none of them,
 * so three identical silences sit under nearby headings and only one of them may take the new
 * sentence. A hand-built rig could produce any of them alone; only a real direction produces all
 * three at once, and it is the pairing that was got wrong — twice.
 *
 * Seed 3 and `NEUTRAL_MOOD` follow `guide-view.test.ts`'s `twoHoles`, which is the same rig for
 * the same reason.
 */
const dub = resolve({ devices: DEVICES, template: ambientDub, mood: NEUTRAL_MOOD, seed: 3 })

/**
 * Industrial Techno, whose `riser` is `transient` across `Build` and `Breakdown` — two pattern
 * entries, and so two band-specific blocks before #473. It is the fixture that shows the collapse
 * this change is for; Ambient Dub's riser plays one section, where one block and one sentence are
 * indistinguishable.
 */
const techno = resolve({ devices: DEVICES, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 })

/**
 * The golden template with its `pad` variant removed, which is what every direction in the library
 * that holds a pad actually looks like. `GOLDEN_TEMPLATE` patterns its pad on purpose — §4.2's
 * other half, that a direction which *does* pattern a pad is printed rather than overruled — so it
 * is the one shape that cannot show the held path.
 */
const heldPad = run({
  ...GOLDEN_TEMPLATE,
  patterns: GOLDEN_TEMPLATE.patterns.filter((p) => p.forRole !== 'pad'),
})

describe('isSingleTrigRiser is a `riser` *and* empty, not either alone (#473)', () => {
  it('holds for a riser the direction never patterned', () => {
    const riser = part(dub, 'riser')
    expect(riser.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigRiser(riser)).toBe(true)
  })

  it('does not hold for a `sweep` with exactly the same emptiness', () => {
    // The second narrowing. `sweep` is transitional and empty here, so a predicate keyed on
    // §4.2's list would take it — and Ambient Dub scopes one to `Swell` and one to `Recede`, so
    // the sentence would tell a reader to build into a change the part is falling away from.
    const sweep = part(dub, 'sweep')
    expect(sweep.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigRiser(sweep)).toBe(false)
    expect(isSustainedPart(sweep)).toBe(false)
  })

  it('does not hold for a `texture` with exactly the same emptiness', () => {
    // The correction #473 needed. Hip-Hop's crackle and Ambient Dub's bed run underneath
    // everything; neither is an event that arrives somewhere, so the emptiness alone is not the
    // fact. 228 of the 522 parts in that emptiness across the catalogue are this role.
    const texture = part(dub, 'texture')
    expect(texture.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigRiser(texture)).toBe(false)
    expect(isSustainedPart(texture)).toBe(false)
  })

  it('does not hold for a `pad`, which keeps the held path (§4.2)', () => {
    const pad = part(heldPad, 'pad')
    expect(isSustainedPart(pad)).toBe(true)
    expect(isSingleTrigRiser(pad)).toBe(false)
  })

  it('does not hold for a part the direction did pattern', () => {
    // The other half of the conjunction: the role alone decides nothing either. Asserted over
    // every part in the fixture that has a variant anywhere, which would include a patterned
    // `riser` the day a direction authors one.
    const patterned = dub.assignments.filter((a) =>
      a.patterns.some((p) => p.selection.outcome !== 'none'),
    )
    expect(patterned.length).toBeGreaterThan(0)
    for (const a of patterned) expect(isSingleTrigRiser(a), a.role).toBe(false)
  })
})

describe('phase 5 states a single-trig part once, in both renderers (§8/#473)', () => {
  const md = stepProgramming(dub)
  const web = text(html(dub))

  it('drops the band-specific absence blocks for those parts', () => {
    // The subject: the fixture has to contain a part on this path or the suite proves nothing.
    expect(dub.assignments.some(isSingleTrigRiser)).toBe(true)
    for (const a of dub.assignments.filter(isSingleTrigRiser)) {
      expect(partBlock(md, a.role), a.role).not.toContain('no pattern authored')
      expect(partBlock(md, a.role), a.role).toContain(TRIG)
    }
    expect(web).toContain(TRIG)
  })

  it('says it once per part rather than once per section', () => {
    const count = (doc: string) => doc.split(TRIG).length - 1
    const expected = dub.assignments.filter(isSingleTrigRiser).length
    expect(expected).toBeGreaterThan(0)
    expect(count(md)).toBe(expected)
    expect(count(web)).toBe(expected)
  })

  /**
   * The collapse itself, which Ambient Dub cannot show: its `riser` plays one section, so one
   * block and one sentence look the same. Industrial Techno's runs across `Build` and `Breakdown`
   * — two entries, two blocks before #473 — and prints the sentence once.
   */
  it('collapses a multi-section riser to one sentence', () => {
    const riser = part(techno, 'riser')
    expect(riser.patterns.length).toBeGreaterThan(1)
    expect(isSingleTrigRiser(riser)).toBe(true)
    const doc = stepProgramming(techno)
    expect(doc.split(TRIG).length - 1).toBe(1)
    expect(text(html(techno)).split(TRIG).length - 1).toBe(1)
  })

  it('still states the absence, so the hole is not hidden (invariant 5)', () => {
    // The instruction opens on what the direction did *not* author. A sentence that only told the
    // reader to place a trig would read as content, and there is none.
    expect(md).toContain('the direction authors no grid for this part')
    expect(web).toContain('the direction authors no grid for this part')
  })

  /**
   * **The gesture arrives at the change; the trig does not.** The sentence read *where you put the
   * trig is where it arrives* first, which is false of every riser in the library — the trig is
   * the onset and a four-bar rise lands four bars later, so a reader following it would place the
   * trig on the downbeat they were building towards and hear the swell start there.
   *
   * Pinned as the *claim* rather than the wording, which is the one place in this file that is
   * worth doing: an author may rephrase the sentence, and the thing that must not come back is
   * the identification of the trig's position with the gesture's landing. How far ahead of the
   * change the trig goes is the recipe's to say, and `test/elektron-digitakt.test.ts` holds that
   * half.
   */
  it('names the change as what the gesture arrives at, not the trig position', () => {
    for (const doc of [md, web]) {
      expect(doc).toContain('arrives at the change')
      expect(doc).not.toContain('where you put the trig is where it arrives')
    }
  })
})

/**
 * The boundary both narrowings drew, asserted on the guide rather than only on the predicate:
 * three parts in one direction with identical emptiness, and only the `riser` takes the sentence.
 * `texture` is a bed; `sweep` is transitional but may be receding, and waits on wording of its
 * own rather than on a predicate change.
 */
describe('every other unpatterned part keeps the band-specific hole report (#473)', () => {
  const md = stepProgramming(dub)
  const web = text(html(dub))

  for (const role of ['texture', 'sweep'] as const) {
    it(`reports the ${role} per band, and hands it no trig sentence`, () => {
      const a = part(dub, role)
      expect(a.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
      expect(isSingleTrigRiser(a)).toBe(false)
      expect(partBlock(md, role)).toContain(`no pattern authored for \`${role}\` at any band`)
      expect(partBlock(md, role)).not.toContain(TRIG)
    })
  }

  it('reads differently from the `riser` beside them, which is the whole point', () => {
    expect(partBlock(md, 'riser')).toContain(TRIG)
    expect(partBlock(md, 'riser')).not.toContain('no pattern authored')
    expect(web).toContain('No pattern authored for')
  })
})

describe('a held `pad` keeps §4.2 sentence, not this one', () => {
  it('says Held, not struck in both renderers, and takes no second sentence', () => {
    expect(heldPad.assignments.some(isSustainedPart)).toBe(true)
    const md = stepProgramming(heldPad)
    const web = text(html(heldPad))
    expect(md).toContain('Held, not struck')
    expect(web).toContain('Held, not struck')
    expect(partBlock(md, 'pad')).not.toContain(TRIG)
  })
})

/**
 * The shape a wrong predicate would swallow silently: a direction that patterns a part in some of
 * its sections and not others has said something about the ones it skipped, and §6.3's per-section
 * report is what says it.
 */
describe('a part patterned in some sections keeps its per-section report (§6.3/#473)', () => {
  const drop: SectionName = 'Drop' as SectionName
  const mixed: Template = {
    ...GOLDEN_TEMPLATE,
    // The kick's only variant, scoped to the Drop. Intro and Build then have nothing authored at
    // any band, and the Drop still programs a grid.
    patterns: GOLDEN_TEMPLATE.patterns.map((p) =>
      p.forRole === 'kick' ? { ...p, sections: [drop] } : p,
    ),
  }
  const result = run(mixed)
  const kick = part(result, 'kick')

  it('leaves the predicate false, so no per-part instruction replaces the grid', () => {
    // The fixture has to be genuinely mixed or the two assertions below prove nothing.
    expect(kick.patterns.some((p) => p.selection.outcome === 'none')).toBe(true)
    expect(kick.patterns.some((p) => p.selection.outcome !== 'none')).toBe(true)
    expect(isSingleTrigRiser(kick)).toBe(false)
  })

  it('still reports the silent sections against the band that asked, in both renderers', () => {
    const md = stepProgramming(result)
    const web = text(html(result))
    expect(md).toContain('no pattern authored for `kick`')
    expect(web).toContain('No pattern authored for')
    // And the grid the Drop does have is untouched.
    expect(md).toMatch(/\d+ steps, band \d/)
  })
})

describe('a hooked part is untouched by this (#100)', () => {
  /**
   * Ambient Dub with its `pad` hook re-pointed at the `riser` it leaves unpatterned. The golden
   * rig cannot serve this: no fixture device declares a transitional role, so a hooked `riser`
   * has to come from the real library.
   *
   * That is the exact collision: a hooked part authors no variants by construction, so a hooked
   * `riser` satisfies `isSingleTrigRiser` and would take the trig sentence if `deferred` were not
   * read first.
   */
  const hooked: Template = {
    ...ambientDub,
    hooks: ambientDub.hooks.map((h) =>
      h.forRole === 'pad' ? { ...h, forRole: 'riser' as const } : h,
    ),
  }
  const result = resolve({ devices: DEVICES, template: hooked, mood: NEUTRAL_MOOD, seed: 3 })

  it('is the collision it claims to be — the part satisfies the new predicate', () => {
    const riser = result.assignments.find((a) => a.role === 'riser')
    // Guard on the subject: without an assigned, hooked riser the assertion below is vacuous.
    expect(riser, 'the fixture rig should carry the hooked riser').toBeDefined()
    expect((riser as ResolvedAssignment).hookAuthority).toBeDefined()
    expect(isSingleTrigRiser(riser as ResolvedAssignment)).toBe(true)
  })

  it('keeps the pointer at phase 4 rather than taking the new sentence', () => {
    const md = stepProgramming(result)
    const web = text(html(result))
    expect(md).toContain('The hook is the pattern')
    expect(web).toContain('The hook is the pattern')
    expect(partBlock(md, 'riser')).not.toContain(TRIG)
  })
})
