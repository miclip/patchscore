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
  isSingleTrigPart,
  isSustainedPart,
  renderGuide,
  resolve,
  singleTrigPlacements,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { ambientDub, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * §8 phase 5/#473/#488. **A `riser` or `sweep` the direction never patterned gets one instruction,
 * not one absence per section — and the instruction follows the arrangement.**
 *
 * `riser` in Industrial Techno printed `no pattern authored for \`riser\` at any band (asked for
 * band 1)` — the same absence under every heading the part occupies, each carrying a band number
 * that decides nothing, because there is nothing authored at any band for it to have missed. It
 * is a one-shot: the reader places a trig, and the placement is the instruction.
 *
 * **#473 could not say that for `sweep`, and #488 is why it can now.** Its sentence was *place its
 * single trig so the gesture arrives at the change* — a climb, and Ambient Dub scopes one `sweep`
 * request across `Swell` and `Recede`, the second of which spends 36 bars walking away from the
 * crest. The fix was never the predicate: the direction of travel is `structure[i].energy` against
 * its successor's, so `singleTrigPlacements` reads it and the clause follows the arrangement
 * rather than the role. `riser` reads the same delta, which is what makes its clause true by
 * construction rather than by every riser in the library happening to rise.
 *
 * **The boundary is where most of this file's weight sits**, because the first draft of the rule
 * read the emptiness alone and was wrong. Five shapes share that emptiness and only two are
 * single trigs:
 *
 *  - a **`riser`** with nothing authored — the sentence, in the direction the section travels;
 *  - a **`sweep`** with nothing authored — the same, and Ambient Dub's is the one part in the
 *    library that takes two different sentences at once;
 *  - a **`texture`** with nothing authored — a bed, and it keeps its band-specific hole report;
 *  - a **`pad`** — held, and it keeps §4.2's *Held, not struck*;
 *  - a **hooked** part — every one of them authors no variants, so #100 has to be read first.
 *
 * A sixth shape is not empty at all and must not be swept in: a part patterned in *some* of its
 * sections, whose silent sections are still §6.3's business.
 *
 * **What is asserted here is the rule and its boundaries, not the sentence.** The exact bytes are
 * `test/golden/*.golden.md`'s job (#46: a fixture pinned to wording fails an author who rephrases
 * it and passes one who drops the meaning). The one exception is the *claim* each clause makes —
 * that a rising gesture arrives at the change and a falling one does not — which is the thing an
 * author rephrasing must not lose, and it is asserted as a claim rather than as bytes. Both
 * renderers are in this one file for #33's reason: they share the *fact* and write the ink twice,
 * so the drift to guard against is one of them keeping the old block, or telling a reader to build
 * into a change the other tells them to fall out of.
 */

const PHASE_5 = '## 5. Step programming'
const TRIG = 'One trig, not a figure'
const RISES = 'Place its single trig so the gesture arrives at the change.'
const FALLS = 'Place its single trig near the section’s opening to send the energy downward.'
const LEVEL =
  'Place its single trig wherever the gesture should be heard; the section it leads into sits ' +
  'at the same energy.'
const ENDS =
  'Place its single trig wherever the gesture should be heard; nothing follows this section ' +
  'for it to lead into.'

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

/**
 * The web sibling of `partBlock`, and it exists for the reason that one does: #488 puts two
 * different placement sentences on one page, and an assertion over the whole document would pass
 * with both of them printed under the wrong part.
 *
 * Narrowed to phase 5 before it is split, because the role name is a `VocabularyTerm` and phase 1's
 * arrangement table says `sweep plays in Swell, Recede` with the same button in it — a search over
 * the whole document finds that one first and then passes on a phase 5 that printed nothing.
 */
function webPartBlock(result: ResolveResult, role: Role): string {
  const doc = html(result)
  const start = doc.indexOf('aria-labelledby="phase-5"')
  expect(start, 'phase 5 section in the view').toBeGreaterThan(-1)
  const rest = doc.slice(start)
  const end = rest.indexOf('<section class="phase"')
  const phase = end === -1 ? rest : rest.slice(0, end)
  const block = phase
    .split('<section class="part">')
    .find((p) => text(p.slice(0, p.indexOf('</h4>'))).startsWith(role))
  expect(block, `${role} should have a phase 5 section in the view`).toBeDefined()
  return text(block as string)
}

function part(result: ResolveResult, role: Role): ResolvedAssignment {
  const a = result.assignments.find((x) => x.role === role)
  expect(a, `${role} should be assigned in this fixture`).toBeDefined()
  return a as ResolvedAssignment
}

const run = (template: Template): ResolveResult =>
  resolve({ devices: GOLDEN_DEVICES, template, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })

/** Ambient Dub against the full library, which every fixture below is a variation on. */
const fromDub = (template: Template): ResolveResult =>
  resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 3 })

/** One request re-scoped to different sections, which is how the travel fixtures are built. */
function scope(role: Role, sections: SectionName[]): Template {
  return {
    ...ambientDub,
    roles: ambientDub.roles.map((r) => (r.role === role ? { ...r, sections } : r)),
  }
}

/**
 * **Ambient Dub against the full library, which is the one fixture that holds the boundary in a
 * single guide**: it authors no variant for `riser`, `sweep` or `texture` and hooks none of them,
 * so three identical silences sit under nearby headings and only two of them may take the new
 * sentence — in different directions. A hand-built rig could produce any of them alone; only a
 * real direction produces all three at once, and it is the pairing that was got wrong — twice.
 *
 * Its `sweep` is also the whole of #488's subject: one request across `Swell` (0.35, rising into
 * Bloom's 0.62) and `Recede` (0.40, falling into Ebb's 0.12).
 *
 * Seed 3 and `NEUTRAL_MOOD` follow `guide-view.test.ts`'s `twoHoles`, which is the same rig for
 * the same reason.
 */
const dub = fromDub(ambientDub)

/**
 * Industrial Techno, whose `riser` is `transient` across `Build` and `Breakdown` — two pattern
 * entries, and so two band-specific blocks before #473. It is the fixture that shows the collapse
 * this change is for; Ambient Dub's riser plays one section, where one block and one sentence are
 * indistinguishable. Both of its sections rise, so it is still one group and one sentence.
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

/**
 * Ambient Dub with `Bloom` pulled down to `Swell`'s energy and `Ebb` raised to `Recede`'s, so both
 * of the sweep's sections sit flat against the section they lead into. Nothing in the library is
 * shaped this way; the case has to be constructed, and it is worth constructing because it is one
 * of the two the arrangement cannot answer.
 */
const flat = fromDub({
  ...ambientDub,
  structure: ambientDub.structure.map((s) =>
    s.name === 'Bloom' ? { ...s, energy: 0.35 } : s.name === 'Ebb' ? { ...s, energy: 0.4 } : s,
  ),
})

/**
 * Ambient Dub with the `sweep` request re-scoped to `Ebb`, the last section in the structure. The
 * other case the arrangement cannot answer, and a different one: there is no successor at all,
 * rather than a successor at the same height.
 */
const last = fromDub(scope('sweep', ['Ebb' as SectionName]))

describe('isSingleTrigPart is a `riser` or `sweep` *and* empty, not either alone (#473/#488)', () => {
  it('holds for a riser the direction never patterned', () => {
    const riser = part(dub, 'riser')
    expect(riser.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigPart(riser)).toBe(true)
  })

  it('holds for a `sweep` with exactly the same emptiness (#488)', () => {
    // #473 held this out while the sentence promised a climb. The predicate was never what was
    // wrong: a sweep with nothing authored is one event exactly as a riser is, and which way it
    // travels is the arrangement's to say.
    const sweep = part(dub, 'sweep')
    expect(sweep.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigPart(sweep)).toBe(true)
    expect(isSustainedPart(sweep)).toBe(false)
  })

  it('does not hold for a `texture` with exactly the same emptiness', () => {
    // The correction #473 needed. Hip-Hop's crackle and Ambient Dub's bed run underneath
    // everything; neither is an event that arrives somewhere, so the emptiness alone is not the
    // fact. 228 of the 522 parts in that emptiness across the catalogue are this role.
    const texture = part(dub, 'texture')
    expect(texture.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigPart(texture)).toBe(false)
    expect(isSustainedPart(texture)).toBe(false)
  })

  it('does not hold for a `pad`, which keeps the held path (§4.2)', () => {
    const pad = part(heldPad, 'pad')
    expect(isSustainedPart(pad)).toBe(true)
    expect(isSingleTrigPart(pad)).toBe(false)
  })

  it('does not hold for a part the direction did pattern', () => {
    // The other half of the conjunction: the role alone decides nothing either. Asserted over
    // every part in the fixture that has a variant anywhere, which would include a patterned
    // `sweep` the day a direction authors one.
    const patterned = dub.assignments.filter((a) =>
      a.patterns.some((p) => p.selection.outcome !== 'none'),
    )
    expect(patterned.length).toBeGreaterThan(0)
    for (const a of patterned) expect(isSingleTrigPart(a), a.role).toBe(false)
  })

  it('answers the same question as `singleTrigPlacements`, which is why there is one predicate', () => {
    // The two are one fact with two shapes, and the day they disagree is the day a part takes the
    // grid suppression with no sentence under it, or a sentence with the grid still drawn.
    for (const a of dub.assignments) {
      expect(singleTrigPlacements(dub, a).length > 0, a.role).toBe(isSingleTrigPart(a))
    }
  })
})

/**
 * #488's subject. The direction of travel comes off the structure's energy and nothing else — a
 * renderer that keyed on the section name would be a template internal leaking across the layer
 * boundary, and would say nothing at all about the next direction that spells the shape
 * differently.
 */
describe('singleTrigPlacements reads energy against its successor (#488)', () => {
  it('splits Ambient Dub`s one `sweep` request into a rise and a fall', () => {
    // The measurement in the issue: Swell 0.35 into Bloom 0.62, Recede 0.40 into Ebb 0.12.
    expect(singleTrigPlacements(dub, part(dub, 'sweep'))).toEqual([
      { travel: 'rises', sections: ['Swell'] },
      { travel: 'falls', sections: ['Recede'] },
    ])
  })

  it('keeps a riser in a rising section on the clause #473 gave it', () => {
    expect(singleTrigPlacements(dub, part(dub, 'riser'))).toEqual([
      { travel: 'rises', sections: ['Bloom'] },
    ])
  })

  it('groups sections that travel the same way, rather than listing each', () => {
    // Industrial Techno's riser occupies two sections and both rise, so it is one sentence — the
    // collapse #473 is for, unchanged by reading the delta.
    expect(singleTrigPlacements(techno, part(techno, 'riser'))).toEqual([
      { travel: 'rises', sections: ['Build', 'Breakdown'] },
    ])
  })

  /**
   * **The half of #488 that is about `riser` rather than `sweep`.** Both riser requests in the
   * library sit in rising sections today, so nothing in any shipped guide changes — but the clause
   * is now true because the arrangement says so, and a direction that scoped a riser to a falling
   * section would not silently inherit a sentence about a climb.
   */
  it('gives a riser in a falling section the falling clause, by construction', () => {
    const result = fromDub(scope('riser', ['Recede' as SectionName]))
    expect(singleTrigPlacements(result, part(result, 'riser'))).toEqual([
      { travel: 'falls', sections: ['Recede'] },
    ])
  })

  it('says `level` where the energy either side is equal, rather than inventing travel', () => {
    // Bloom pulled down to Swell's energy and Ebb up to Recede's, so both of the sweep's sections
    // sit flat against their successor. Nothing in the arrangement says which way it goes, and
    // invariant 5 is as much about not inventing a direction as about not inventing a value.
    expect(singleTrigPlacements(flat, part(flat, 'sweep'))).toEqual([
      { travel: 'level', sections: ['Swell', 'Recede'] },
    ])
  })

  /**
   * **`ends` is its own case and not `level`**, which is the one thing about this model worth
   * asserting on the fact rather than only on the ink: both leave the direction unstated, and
   * collapsing them would print *the section it leads into sits at the same energy* under a
   * section that leads into nothing. A reader at the end of a track would be told about a section
   * nobody wrote.
   */
  it('says `ends` for the last section, which has no successor to travel into', () => {
    expect(ambientDub.structure[ambientDub.structure.length - 1]?.name).toBe('Ebb')
    expect(singleTrigPlacements(last, part(last, 'sweep'))).toEqual([
      { travel: 'ends', sections: ['Ebb'] },
    ])
  })

  it('keeps the two neutral cases apart, which is the whole reason there are two', () => {
    // Equal energy and end-of-structure are one *absence of direction* and two different facts.
    // The fixtures differ in exactly one thing — whether a successor exists — so a model that
    // folded them together would fail here and nowhere else.
    const [flatGroup] = singleTrigPlacements(flat, part(flat, 'sweep'))
    const [lastGroup] = singleTrigPlacements(last, part(last, 'sweep'))
    expect(flatGroup?.travel).toBe('level')
    expect(lastGroup?.travel).toBe('ends')
    expect(flatGroup?.travel).not.toBe(lastGroup?.travel)
  })

  it('is empty for every part that is not one, so no caller has to ask twice', () => {
    for (const role of ['texture', 'pad', 'kick'] as const) {
      const a = dub.assignments.find((x) => x.role === role)
      if (a === undefined) continue
      expect(singleTrigPlacements(dub, a), role).toEqual([])
    }
  })
})

describe('phase 5 states a single-trig part once, in both renderers (§8/#473)', () => {
  const md = stepProgramming(dub)
  const web = text(html(dub))

  it('drops the band-specific absence blocks for those parts', () => {
    // The subject: the fixture has to contain a part on this path or the suite proves nothing.
    expect(dub.assignments.some(isSingleTrigPart)).toBe(true)
    for (const a of dub.assignments.filter(isSingleTrigPart)) {
      expect(partBlock(md, a.role), a.role).not.toContain('no pattern authored')
      expect(partBlock(md, a.role), a.role).toContain(TRIG)
      expect(webPartBlock(dub, a.role), a.role).not.toContain('No pattern authored')
      expect(webPartBlock(dub, a.role), a.role).toContain(TRIG)
    }
  })

  it('says it once per part rather than once per section', () => {
    // Including the part that takes two placement sentences: the absence is stated once and the
    // list under it is what varies, so a reader is not told twice that nothing was authored.
    const count = (doc: string) => doc.split(TRIG).length - 1
    const expected = dub.assignments.filter(isSingleTrigPart).length
    expect(expected).toBeGreaterThan(1)
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
    expect(isSingleTrigPart(riser)).toBe(true)
    const doc = stepProgramming(techno)
    expect(doc.split(TRIG).length - 1).toBe(1)
    expect(doc).toContain(`${TRIG}** — the direction authors no grid for this part. ${RISES}`)
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
 * #488's done-when, on the page rather than on the fact: *a reader with a sweep in `Recede` is
 * told where to put its trig without being told it arrives anywhere*. Both renderers, because the
 * ink is written twice and the failure to guard against is one of them keeping #473's climb.
 */
describe('a falling section gets a falling sentence, in both renderers (#488)', () => {
  const md = partBlock(stepProgramming(dub), 'sweep')
  const web = webPartBlock(dub, 'sweep')

  it('names both of the sweep`s sections, so the reader knows which sentence is theirs', () => {
    for (const doc of [md, web]) {
      expect(doc).toContain('Swell')
      expect(doc).toContain('Recede')
    }
  })

  it('prints the rising clause and the falling one, and not one of them twice', () => {
    for (const doc of [md, web]) {
      expect(doc).toContain(RISES)
      expect(doc).toContain(FALLS)
      expect(doc.split(RISES).length - 1).toBe(1)
      expect(doc.split(FALLS).length - 1).toBe(1)
    }
  })

  it('puts each clause with its own section, not merely both on the page', () => {
    // The assertion above passes on a page that printed the two sentences in the wrong order under
    // the wrong headings, which is the exact failure #488 exists to prevent.
    for (const doc of [md, web]) {
      const swell = doc.indexOf('Swell')
      const recede = doc.indexOf('Recede')
      expect(swell).toBeGreaterThan(-1)
      expect(recede).toBeGreaterThan(swell)
      expect(doc.indexOf(RISES)).toBeGreaterThan(swell)
      expect(doc.indexOf(RISES)).toBeLessThan(recede)
      expect(doc.indexOf(FALLS)).toBeGreaterThan(recede)
    }
  })

  it('tells the falling reader where the trig goes without pointing at a peak', () => {
    // The claim, not the bytes. What must not come back is a receding part being told to build
    // into something: the section is 36 bars of decline and there is nothing at the end of it.
    const falling = md.slice(md.indexOf('Recede'))
    expect(falling).toContain('near the section’s opening')
    expect(falling).not.toContain('arrives at the change')
  })

  /**
   * **The trig is the onset in both directions, and the falling clause has to say so too.** Its
   * first wording — *falls away across the decline* — claimed the one gesture spans the section,
   * which on `Recede` is 36 bars and longer than any envelope in the library. The rising clause
   * has been careful about this since #473; the falling one was not, for one revision.
   */
  it('does not claim the one gesture spans the section it is placed in', () => {
    for (const doc of [md, web]) {
      expect(doc).not.toContain('across the decline')
      expect(doc).not.toContain('falls away across')
    }
  })
})

/**
 * The boundary both of #473's narrowings drew, asserted on the guide rather than only on the
 * predicate: three parts in one direction with identical emptiness, and the `texture` between them
 * still reports per band. It is a bed, not an event, and #488 widened the sentence's *direction*
 * rather than its membership.
 */
describe('an unpatterned `texture` keeps the band-specific hole report (#473)', () => {
  const md = stepProgramming(dub)

  it('reports the texture per band, and hands it no trig sentence', () => {
    const a = part(dub, 'texture')
    expect(a.patterns.every((p) => p.selection.outcome === 'none')).toBe(true)
    expect(isSingleTrigPart(a)).toBe(false)
    expect(partBlock(md, 'texture')).toContain('no pattern authored for `texture` at any band')
    expect(partBlock(md, 'texture')).not.toContain(TRIG)
    expect(webPartBlock(dub, 'texture')).toContain('No pattern authored for')
    expect(webPartBlock(dub, 'texture')).not.toContain(TRIG)
  })

  it('reads differently from the two parts beside it, which is the whole point', () => {
    for (const role of ['riser', 'sweep'] as const) {
      expect(partBlock(md, role), role).toContain(TRIG)
      expect(partBlock(md, role), role).not.toContain('no pattern authored')
    }
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
    expect(isSingleTrigPart(kick)).toBe(false)
    expect(singleTrigPlacements(result, kick)).toEqual([])
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
   * `riser` satisfies `isSingleTrigPart` and would take the trig sentence if `deferred` were not
   * read first.
   */
  const hooked: Template = {
    ...ambientDub,
    hooks: ambientDub.hooks.map((h) =>
      h.forRole === 'pad' ? { ...h, forRole: 'riser' as const } : h,
    ),
  }
  const result = fromDub(hooked)

  it('is the collision it claims to be — the part satisfies the new predicate', () => {
    const riser = result.assignments.find((a) => a.role === 'riser')
    // Guard on the subject: without an assigned, hooked riser the assertion below is vacuous.
    expect(riser, 'the fixture rig should carry the hooked riser').toBeDefined()
    expect((riser as ResolvedAssignment).hookAuthority).toBeDefined()
    expect(isSingleTrigPart(riser as ResolvedAssignment)).toBe(true)
  })

  it('keeps the pointer at phase 4 rather than taking the new sentence', () => {
    const md = stepProgramming(result)
    const web = text(html(result))
    expect(md).toContain('The hook is the pattern')
    expect(web).toContain('The hook is the pattern')
    expect(partBlock(md, 'riser')).not.toContain(TRIG)
  })
})

/**
 * §8/#21. The one shape in the library that prints a list rather than a sentence, checked for the
 * thing a list can lose: the section names are markup, so a screen reader, a copy-paste and this
 * test all see the same separators the eye does.
 */
describe('the two-direction list is markup, not layout (#21)', () => {
  it('carries a different neutral clause for each of the two neutral cases, in both renderers', () => {
    // The ink half of the model split. Each fixture takes its own clause and refuses the other's,
    // in both renderers, because the failure to guard against is one of them telling a reader at
    // the end of a track what the next section is doing.
    for (const doc of [partBlock(stepProgramming(flat), 'sweep'), webPartBlock(flat, 'sweep')]) {
      expect(doc).toContain(LEVEL)
      expect(doc).not.toContain(ENDS)
    }
    for (const doc of [partBlock(stepProgramming(last), 'sweep'), webPartBlock(last, 'sweep')]) {
      expect(doc).toContain(ENDS)
      expect(doc).not.toContain(LEVEL)
    }
  })

  it('prints one group as a sentence and two as a list', () => {
    const one = partBlock(stepProgramming(dub), 'riser')
    expect(one).toContain(`${TRIG}** — the direction authors no grid for this part. ${RISES}`)
    // A single group names no section: the instruction is the same wherever the part plays, so
    // there is nothing to tell apart and a list of one would be a heading repeated.
    expect(one).not.toContain('- **Bloom**')
    const two = partBlock(stepProgramming(dub), 'sweep')
    expect(two).toContain(`- **Swell** — ${RISES}`)
    expect(two).toContain(`- **Recede** — ${FALLS}`)
  })
})
