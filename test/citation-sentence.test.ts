import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  citationSentence,
  citedShare,
  citedSources,
  dominantRangeCite,
  hoistedParams,
  moodState,
  renderGuide,
  renderedParams,
  resolve,
  sameCite,
} from '../lib/core/index'
import type { Cite, GuideLayout, ResolveResult, ResolvedParam } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { droneStudy, industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §3.2/§8.1. **The one citation a guide prints, and the shape of it.**
 *
 * A guide used to mark every value with its provenance and hang a `↳ cite:` line under it, and
 * #112b99f took all of that out for a reason that still holds: §8 is read standing at a machine
 * with both hands busy, and a page number beside a number is a line you step over on the way to
 * the number. What went with it, and should not have, was the reader's answer to *which book is
 * this box's page in* — a question asked once per box, not once per value.
 *
 * So one sentence per device block comes back and nothing else does. These tests hold the two
 * halves that would otherwise rot in opposite directions:
 *
 *  - **the sentence is true**, which is mostly a claim about its verb. Nearly every box in this
 *    library cites its *ranges* and leaves its points to taste (§3.1), so the obvious wording —
 *    *values come from the manual* — is false of almost all of them, and false in the direction
 *    that flatters us;
 *  - **the sentence is alone**, which is the half a later change would undo by reflex. A mark, a
 *    `↳ cite:` line, a `· manual` label or a second sentence would each rebuild the surface
 *    #112b99f removed, one piece at a time.
 *
 * The renderer half runs both renderers and both layouts against the same result, for #33's
 * reason: `render.ts` and `components/guide/phase-sound.tsx` are siblings, the sentence is
 * exported from `lib/core` so there is exactly one of it, and this is what proves it stayed that
 * way.
 */

const MANUAL = 'Fixture Manual v2'

/**
 * Sentence-ending periods, which is not the same as periods: a citation sentence is full of
 * `p.34`, `pp.10-12` and `v1.4.0`, and counting raw dots would make the one-sentence rule pass or
 * fail on which manual a fixture happened to name.
 */
function fullStops(sentence: string): number {
  return (sentence.replace(/\d+(?:\.\d+)+/g, 'V').replace(/\bpp?\.\s*/g, '').match(/\./g) ?? [])
    .length
}

function cite(source: string, kind: Cite['kind'] = 'manual'): Cite {
  return { kind, source } as Cite
}

/** A value nobody checked: no point citation, no range at all. */
function taste(name: string): ResolvedParam {
  return { name, value: 52, provenance: { state: 'provisional' } }
}

/** A value whose *bounds* were read off something and whose number was not. §3.1's common case. */
function rangeCited(name: string, source: string, kind: Cite['kind'] = 'manual'): ResolvedParam {
  return {
    name,
    value: 52,
    range: { min: 0, max: 100, verified: cite(source, kind) },
    provenance: { state: 'provisional' },
  }
}

/** A value read off something, bounds and all. */
function pointCited(name: string, source: string, kind: Cite['kind'] = 'manual'): ResolvedParam {
  return {
    name,
    value: 52,
    range: { min: 0, max: 100, verified: cite(source, kind) },
    provenance: { state: 'authored', cite: cite(source, kind) },
  }
}

/**
 * An enum whose *option set* was read off something and whose choice was not. §3.2's other half
 * of the legality gate, and the one a `ResolvedParam` used to drop on the floor.
 */
function optionsCited(name: string, source: string, kind: Cite['kind'] = 'manual'): ResolvedParam {
  return {
    name,
    value: 'analog',
    optionsVerified: cite(source, kind),
    provenance: { state: 'provisional' },
  }
}

/** A control #107 hoists: one setting for the whole pattern, carried by every part that uses it. */
function hoisted(name: string, source: string): ResolvedParam {
  return { ...rangeCited(name, source), scope: 'pattern' }
}

describe('pages collapse to a span, never to a list (§3.2)', () => {
  it('prints one page as `p.N`', () => {
    expect(citationSentence([rangeCited('A', `${MANUAL}, p.34`)])).toContain(
      `the ${MANUAL}, p.34`,
    )
  })

  /**
   * The overstatement is deliberate and is the whole reason this is a span. p.29 is between the
   * ends and was never cited; a reader holding the book open at 27 through 52 is where the
   * sentence wants them, and `pp.27, 29, 52` is the accurate answer nobody reads at a rack.
   */
  it('collapses scattered pages of one document into the span between the ends', () => {
    const sentence = citationSentence([
      rangeCited('A', `${MANUAL}, p.52`),
      rangeCited('B', `${MANUAL}, p.27`),
      rangeCited('C', `${MANUAL}, p.29`),
    ])
    expect(sentence).toContain(`the ${MANUAL}, pp.27-52`)
    expect(sentence).not.toContain('pp.27, 29')
    expect(sentence).not.toContain('p.29')
  })

  it('reads a multi-page locator, so `pp.26, 117-118` widens the span rather than being skipped', () => {
    expect(citationSentence([rangeCited('A', `${MANUAL}, pp.26, 117-118`)])).toContain(
      `the ${MANUAL}, pp.26-118`,
    )
  })

  /**
   * The MicroFreak writes `MicroFreak User Manual 4.0.3 p.113` with no comma, which `citedDocument`
   * — matching `", p."` alone — reads as part of the title. Grouping on that gives one MicroFreak
   * document per page cited, and a sentence naming four of them.
   */
  it('groups a manual that omits the comma before its page', () => {
    const sentence = citationSentence([
      rangeCited('A', 'MicroFreak User Manual 4.0.3 p.113'),
      rangeCited('B', 'MicroFreak User Manual 4.0.3 p.53'),
    ])
    expect(sentence).toContain('the MicroFreak User Manual 4.0.3, pp.53-113')
    expect(sentence).not.toContain('p.113,')
  })

  /** A Roland citation sometimes names the section as well. The section locates part of a page. */
  it('drops the section parenthetical a page citation sometimes carries', () => {
    expect(
      citationSentence([rangeCited('A', 'TR-1000 Reference Manual eng02, p.74 (Main specifications)')]),
    ).toContain('the TR-1000 Reference Manual eng02, p.74')
  })

  /**
   * #173. A tagged documentation corpus is located by repository path rather than by page, so it
   * has no span — and gets none, rather than a locator invented to match the others.
   */
  it('gives a source with no pages no locator at all', () => {
    const sentence = citationSentence([
      rangeCited('A', 'Deluge firmware release_1_2_1, menus/envelope/attack.md'),
      rangeCited('B', 'Deluge firmware release_1_2_1, menus/envelope/decay.md'),
    ])
    expect(sentence).toContain('the Deluge firmware release_1_2_1;')
    expect(sentence).not.toContain('.md')
    expect(sentence).not.toContain('p.')
  })
})

describe('a locator never reaches the page as though it were a title (#173)', () => {
  /**
   * **The defect #173 caught, caught again the same way.** #173 was five files under one tagged
   * corpus reading as five documents, because the repository-path locator was not recognised. The
   * OP-XY writes `OP-XY full guide v1.1.15, §18 pp.77-83, one sampler per section`, which no
   * anchored page pattern matches — so the whole string was the document, and a guide printed a
   * section sign and a clause of prose where a book's name goes.
   *
   * This is the guard rather than a fixture, because the shapes are a property of the *library*:
   * a folder authored next month may write a sixth, and the fixtures below would all still pass.
   */
  it('produces no document name carrying a comma, a section sign or a page marker', () => {
    const offenders: string[] = []
    for (const device of DEVICES) {
      for (const recipe of device.recipes) {
        for (const param of recipe.params) {
          const claims = [
            param.kind === 'numeric' ? param.range.verified : undefined,
            param.kind === 'enum' ? param.options.verified : undefined,
            param.verified,
            recipe.verified,
          ]
          for (const claim of claims) {
            if (claim === undefined || claim === false || claim.kind === 'observed') continue
            const [source] = citedSources([
              { name: 'x', value: 1, provenance: { state: 'authored', cite: claim } },
            ])
            const name = source?.name ?? ''
            if (/[,§]|\bpp?\.\s*\d/.test(name)) offenders.push(`${device.id}: ${name}`)
          }
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })

  /**
   * The other half of the same claim, and the one that would make the rule above wrong rather
   * than merely unenforced: taking the head of a citation is only safe while no document *title*
   * contains a comma.
   */
  it('splits a citation at a comma the library never puts inside a title', () => {
    expect(citedSources([rangeCited('A', 'OP-XY full guide v1.1.15, §18 pp.77-83, one sampler per section')])).toEqual([
      { kind: 'manual', name: 'OP-XY full guide v1.1.15', pages: [77, 83], count: 1, legality: 1 },
    ])
    expect(citedSources([rangeCited('A', 'EP–133 K.O. II guide, /ep-133/modes 8.2.1, mirrored 2026-08-28')])).toEqual([
      { kind: 'manual', name: 'EP–133 K.O. II guide', pages: [], count: 1, legality: 1 },
    ])
    expect(citedSources([rangeCited('A', 'Moog Minitaur Firmware v2.1 Addendum, PDF p.17 (unnumbered)')])).toEqual([
      { kind: 'manual', name: 'Moog Minitaur Firmware v2.1 Addendum', pages: [17], count: 1, legality: 1 },
    ])
  })

  /**
   * An observation is exempt, and has to be: its identifying detail is *after* the comma, so the
   * head rule would leave `Muse` and throw away the firmware the sentence exists to report.
   */
  it('leaves an observation whole, because its firmware is past the comma', () => {
    expect(citationSentence([rangeCited('A', 'Muse, firmware 1.4.0', 'observed')])).toContain(
      'the instrument at firmware 1.4.0',
    )
  })
})

describe('the sentence names every source, and orders them by what they carry', () => {
  /**
   * The outlier is the thing a hoisted line is most likely to lose. Hoisting exists to remove
   * repetition, and a document cited twice under one cited forty times is not repetition — it is
   * the second book the reader has to have open.
   */
  it('keeps a document cited once beside the one cited forty times', () => {
    const params = [
      ...Array.from({ length: 40 }, (_, i) => rangeCited(`A${i}`, `Big Manual, p.${10 + i}`)),
      rangeCited('Z', 'Small Manual, p.3'),
    ]
    const sentence = citationSentence(params)
    expect(sentence).toContain('the Big Manual, pp.10-49')
    expect(sentence).toContain('the Small Manual, p.3')
    expect(sentence?.indexOf('Big Manual')).toBeLessThan(sentence?.indexOf('Small Manual') ?? -1)
  })

  /** A tie has no dominant document, so the order falls to code unit (§7.2) and stays fixed. */
  it('breaks a tie by code unit rather than by insertion order', () => {
    const zFirst = citationSentence([rangeCited('A', 'Z Manual, p.1'), rangeCited('B', 'A Manual, p.1')])
    const aFirst = citationSentence([rangeCited('A', 'A Manual, p.1'), rangeCited('B', 'Z Manual, p.1')])
    expect(zFirst).toBe(aFirst)
    expect(zFirst?.indexOf('A Manual')).toBeLessThan(zFirst?.indexOf('Z Manual') ?? -1)
  })

  /**
   * An observation is not a document and must not be worded as one. `Muse, firmware 1.4.0` is
   * built for the audit, where it identifies a reading; on the page the reader needs the thing
   * they cannot look up — that this came off the box, and off which version of it.
   */
  it('names an observation as the instrument, at the firmware it was read on', () => {
    expect(citationSentence([rangeCited('A', 'Muse, firmware 1.4.0', 'observed')])).toContain(
      'the instrument at firmware 1.4.0',
    )
    // The TR-1000's observation names a screen as well, and the firmware is still what a reader
    // would check theirs against.
    expect(
      citationSentence([rangeCited('A', 'TR-1000 unit, firmware 1.2.1, MOD TARGET screen', 'observed')]),
    ).toContain('the instrument at firmware 1.2.1')
  })

  /** Invariant 5. A version nobody recorded is not one to invent. */
  it('stops at `the instrument` when the observation names no firmware', () => {
    const sentence = citationSentence([rangeCited('A', 'the unit on the bench', 'observed')])
    expect(sentence).toContain('the instrument')
    expect(sentence).not.toContain('firmware')
  })

  it('says nothing at all about a box that cites nothing', () => {
    expect(citationSentence([taste('A'), taste('B')])).toBeUndefined()
    expect(citationSentence([])).toBeUndefined()
    expect(citedSources([taste('A')])).toEqual([])
  })
})

describe('the verb comes from the counts, because the obvious wording overclaims', () => {
  /**
   * The correction this ladder exists for. A box with 85 cited ranges under 4 cited points reads
   * as thoroughly documented, and *values come from the manual* would say the manual picked the
   * numbers. It gave the bounds; the number inside them is a starting point (§3.2).
   */
  it('draws on the documents rather than claiming their values, on a provisional majority', () => {
    const params = [
      ...Array.from({ length: 9 }, (_, i) => rangeCited(`R${i}`, `${MANUAL}, p.10`)),
      pointCited('P', `${MANUAL}, p.11`),
    ]
    const sentence = citationSentence(params)
    expect(sentence).toBe(`This block draws on the ${MANUAL}, pp.10-11; its values are starting points.`)
    expect(citedShare(params)).toEqual({ total: 10, points: 1, ranges: 10, options: 0 })
    // The claim it must not make. One cited point in ten does not put the manual behind the rest.
    expect(sentence).not.toContain('come from')
  })

  /**
   * **The wording this replaced was accurate and was our bookkeeping read aloud.** *Ranges and
   * option lists on this box come from …; the settings inside them are starting points* asks a
   * reader at a rack to hold §3.1's distinction between a bound and a value in their head before
   * the sentence parses. `range` and `options` are the words a *type* uses to keep two claims
   * apart. *Draws on* claims exactly what the citations support and needs none of that; the half
   * the reader actually needs is the second clause, and it is five words long.
   */
  it('names neither gate, because those are the type’s words and not a reader’s', () => {
    const both = citationSentence([
      rangeCited('A', `${MANUAL}, p.4`),
      optionsCited('MODE', `${MANUAL}, p.4`),
    ])
    expect(both).toBe(`This block draws on the ${MANUAL}, p.4; its values are starting points.`)
    // The same sentence whichever gate carries it, so no reader has to learn the difference.
    expect(citationSentence([optionsCited('MODE', `${MANUAL}, p.4`)])).toBe(both)
    expect(citationSentence([rangeCited('A', `${MANUAL}, p.4`)])).toBe(both)
    for (const word of ['Ranges', 'Option lists', 'option set', 'legality', 'provisional']) {
      expect(both).not.toContain(word)
    }
  })

  it('says values, plainly, only when every point is cited', () => {
    expect(citationSentence([pointCited('A', `${MANUAL}, p.10`), pointCited('B', `${MANUAL}, p.12`)])).toBe(
      `Values on this box come from the ${MANUAL}, pp.10-12.`,
    )
  })

  it('says most, and names the rest, when the cited points are a majority but not all', () => {
    expect(
      citationSentence([
        pointCited('A', `${MANUAL}, p.10`),
        pointCited('B', `${MANUAL}, p.10`),
        taste('C'),
      ]),
    ).toBe(`Most values on this box come from the ${MANUAL}, p.10; the others are starting points.`)
  })

  /**
   * **Half is not most.** A folder part-way through being authored sits here, and it is the one
   * ratio where the word is simply wrong rather than approximate — so the boundary is strict and
   * a fifty-fifty box falls back to what its bounds say.
   */
  it('refuses `most` at exactly half, which is a real state and not a hypothetical', () => {
    const half = citationSentence([pointCited('A', `${MANUAL}, p.10`), taste('B')])
    expect(half).not.toContain('Most values')
    expect(half).toBe(`This block draws on the ${MANUAL}, p.10; its values are starting points.`)
    // One over half is `most`, so the boundary is where it is claimed to be and not lower.
    expect(
      citationSentence([pointCited('A', `${MANUAL}, p.10`), pointCited('B', `${MANUAL}, p.10`), taste('C')]),
    ).toContain('Most values')
  })

  /**
   * A cited minority of points and no cited gate anywhere. *This block draws on …* would be a
   * claim about bounds nobody checked, and there is no majority to claim either, so the sentence
   * narrows to the values that were actually checked and says the rest are not.
   */
  it('speaks only for the checked values when no gate carries a citation', () => {
    const params: ResolvedParam[] = [
      { name: 'A', value: 52, provenance: { state: 'authored', cite: cite(`${MANUAL}, p.10`) } },
      taste('B'),
      taste('C'),
    ]
    expect(citationSentence(params)).toBe(
      `Checked values on this box draw on the ${MANUAL}, p.10; the others are starting points.`,
    )
    expect(citedShare(params)).toEqual({ total: 3, points: 1, ranges: 0, options: 0 })
  })

  /** One sentence, whatever the branch. A second would be the old surface growing back. */
  it('emits exactly one sentence in every branch', () => {
    const branches = [
      [pointCited('A', `${MANUAL}, p.1`)],
      [pointCited('A', `${MANUAL}, p.1`), pointCited('B', `${MANUAL}, p.2`), taste('C')],
      [rangeCited('A', `${MANUAL}, p.1`), taste('B'), taste('C')],
      [
        { name: 'A', value: 52, provenance: { state: 'authored', cite: cite(`${MANUAL}, p.1`) } },
        taste('B'),
        taste('C'),
      ],
    ] as ResolvedParam[][]
    for (const sentence of [...branches.map(citationSentence), MUSE_SENTENCE, TR_6S_SENTENCE]) {
      expect(sentence?.endsWith('.')).toBe(true)
      expect(fullStops(sentence ?? '')).toBe(1)
    }
  })
})

/** The settings one box's block actually renders, which is what the sentence summarises. */
function rendered(result: ResolveResult, deviceId: string): readonly ResolvedParam[] {
  const mine = result.assignments.filter((a) => a.deviceId === deviceId)
  const perPart = mine.map((a) => a.params)
  return renderedParams(hoistedParams(perPart), perPart)
}

describe('the sentence counts what is rendered, not what is assigned (§8/#107)', () => {
  /**
   * `assignments.flatMap(a => a.params)` is the set *before* #107 hoists. A control one setting of
   * which serves every part sits in every part's params and is rendered once, above them, so
   * counting it per part inflates the citation counts and the total they are a share of — and not
   * evenly, since what hoists is the MIDI and delay block rather than a spread of the panel.
   */
  it('counts a hoisted control once, not once per part', () => {
    const muse = resolve({
      devices: DEVICES.filter((d) => d.id === 'moog-muse'),
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    })
    const assigned = muse.assignments.flatMap((a) => a.params).length
    const shown = rendered(muse, 'moog-muse').length
    expect(assigned).toBeGreaterThan(shown)
    expect(citedShare(rendered(muse, 'moog-muse')).total).toBe(shown)
    // Every hoisted name appears exactly once in the rendered set, however many parts carry it.
    const names = rendered(muse, 'moog-muse').map((param) => param.name)
    expect(names.filter((name) => name === 'MULTI MODE')).toHaveLength(1)
  })

  it('reduces two parts sharing one pattern-wide control to one line', () => {
    const shared = hoisted('SWING', `${MANUAL}, p.9`)
    const perPart = [
      [shared, rangeCited('A', `${MANUAL}, p.10`)],
      [shared, rangeCited('B', `${MANUAL}, p.11`)],
    ]
    const shown = renderedParams(hoistedParams(perPart), perPart)
    expect(shown.map((param) => param.name)).toEqual(['SWING', 'A', 'B'])
    expect(citedShare(shown)).toEqual({ total: 3, points: 0, ranges: 3, options: 0 })
    // Counted twice, `SWING` would make p.9 the most-cited page on the box and widen nothing else.
    expect(citedSources(shown)[0]!.count).toBe(3)
  })
})

describe("an enum's option set is evidence, and reaches the sentence (§3.2)", () => {
  /**
   * §3.2's table pairs `range` with `options`: both say what the box permits, both are cited
   * independently of the value inside them. `ResolvedParam` carried only the numeric half, so a
   * box whose enums cite a chapter its numerics never touch said nothing about that chapter.
   */
  it('names a document only an option set cites', () => {
    const sentence = citationSentence([
      rangeCited('A', `${MANUAL}, p.10`),
      optionsCited('MODE', 'Firmware Addendum, p.4'),
    ])
    expect(sentence).toContain(`the ${MANUAL}, p.10`)
    expect(sentence).toContain('the Firmware Addendum, p.4')
  })

  it('counts it as a legality claim rather than as an authority one', () => {
    const params = [optionsCited('MODE', `${MANUAL}, p.4`), taste('B')]
    expect(citedShare(params)).toEqual({ total: 2, points: 0, ranges: 0, options: 1 })
  })

  /**
   * A cited option set is a cited gate, so it takes the legality branch on its own — the OP-XY's
   * whole block is enum-cited and would otherwise fall through to the point-only wording and
   * claim a check nobody made.
   */
  it('takes the legality branch on an option set alone', () => {
    expect(citationSentence([optionsCited('MODE', `${MANUAL}, p.4`), taste('B')])).toBe(
      `This block draws on the ${MANUAL}, p.4; its values are starting points.`,
    )
    expect(citationSentence([optionsCited('MODE', `${MANUAL}, p.4`), taste('B')])).not.toContain(
      'Checked values',
    )
  })

  /** An uncited option set is `false`, and `false` is not a source. */
  it('ignores an option set nobody checked', () => {
    const params: ResolvedParam[] = [
      { name: 'MODE', value: 'analog', optionsVerified: false, provenance: { state: 'provisional' } },
    ]
    expect(citedSources(params)).toEqual([])
    expect(citedShare(params).options).toBe(0)
  })
})

describe('dominantRangeCite reads both legality gates, and leads the sentence (§3.2)', () => {
  it('finds the citation a set of ranges repeats', () => {
    expect(
      dominantRangeCite([
        rangeCited('A', `${MANUAL}, p.10`),
        rangeCited('B', `${MANUAL}, p.10`),
        rangeCited('C', `${MANUAL}, p.11`),
      ]),
    ).toEqual(cite(`${MANUAL}, p.10`))
  })

  /**
   * The widening. It was written when a range was the only legality claim a `ResolvedParam`
   * carried, and a box whose enums all cite one page and whose numerics cite nothing had no
   * dominant citation at all — silently right about half a library and wrong about the other half.
   */
  it('finds one an option set repeats, which it could not see before', () => {
    expect(
      dominantRangeCite([
        optionsCited('MODE', `${MANUAL}, p.4`),
        optionsCited('SHAPE', `${MANUAL}, p.4`),
        taste('C'),
      ]),
    ).toEqual(cite(`${MANUAL}, p.4`))
  })

  it('yields nothing on a tie, and nothing where nothing repeats', () => {
    expect(
      dominantRangeCite([
        rangeCited('A', `${MANUAL}, p.10`),
        rangeCited('B', `${MANUAL}, p.10`),
        rangeCited('C', `${MANUAL}, p.11`),
        rangeCited('D', `${MANUAL}, p.11`),
      ]),
    ).toBeUndefined()
    expect(dominantRangeCite([rangeCited('A', `${MANUAL}, p.10`)])).toBeUndefined()
  })

  /** A value citation is a claim about one number and does not generalise to the line beside it. */
  it('never considers a point citation, however often it repeats', () => {
    const points: ResolvedParam[] = [
      { name: 'A', value: 1, provenance: { state: 'authored', cite: cite(`${MANUAL}, p.10`) } },
      { name: 'B', value: 2, provenance: { state: 'authored', cite: cite(`${MANUAL}, p.10`) } },
    ]
    expect(dominantRangeCite(points)).toBeUndefined()
  })

  /**
   * The page-grain rule firing. One exact citation repeated across the block — the Model D's
   * sixteen ranges on p.34 — puts its document first even where another carries more legality
   * claims spread over more pages.
   */
  it('leads with the document carrying the citation the bounds repeat', () => {
    const params = [
      rangeCited('A', 'Repeated Manual, p.34'),
      rangeCited('B', 'Repeated Manual, p.34'),
      rangeCited('C', 'Scattered Manual, p.1'),
      rangeCited('D', 'Scattered Manual, p.2'),
      rangeCited('E', 'Scattered Manual, p.3'),
    ]
    expect(dominantRangeCite(params)).toEqual(cite('Repeated Manual, p.34'))
    const sources = citedSources(params)
    expect(sources.map((source) => source.name)).toEqual(['Repeated Manual', 'Scattered Manual'])
    // It leads on the repeated claim alone: the other document carries more of everything else.
    expect(sources[0]!.legality).toBeLessThan(sources[1]!.legality)
  })

  /**
   * The document-grain rule, which is the one that fires on real boxes — a manual cited across
   * fifteen pages has no repeated claim for `dominantRangeCite` to find. `Point Manual` is cited
   * four times and every one of them is a point, so it is not where the bounds came from.
   */
  it('orders by legality claims rather than by how often a document is named at all', () => {
    const params: ResolvedParam[] = [
      rangeCited('A', 'Bounds Manual, p.10'),
      rangeCited('B', 'Bounds Manual, p.11'),
      ...(Array.from({ length: 4 }, (_, i) => ({
        name: `P${i}`,
        value: 1,
        provenance: { state: 'authored', cite: cite('Point Manual, p.2') },
      })) as ResolvedParam[]),
    ]
    // No repeated claim, so the page-grain rule stays silent and the document grain decides.
    expect(dominantRangeCite(params)).toBeUndefined()
    const sources = citedSources(params)
    expect(sources.map((source) => source.name)).toEqual(['Bounds Manual', 'Point Manual'])
    expect(sources[0]!.count).toBeLessThan(sources[1]!.count)
    expect(sources[0]!.legality).toBe(2)
    expect(sources[1]!.legality).toBe(0)
  })

  /** `sameCite` is the claim grain the dominance count keys on, and it is kind-sensitive. */
  it('treats a reading and a page with the same source string as two claims', () => {
    expect(sameCite(cite('X, p.1'), cite('X, p.1'))).toBe(true)
    expect(sameCite(cite('X, p.1'), cite('X, p.1', 'observed'))).toBe(false)
    expect(sameCite(cite('X, p.1'), undefined)).toBe(false)
    // Two of each, so neither dominates — which is only true because the kinds do not collapse.
    expect(
      dominantRangeCite([
        rangeCited('A', 'X, p.1'),
        rangeCited('B', 'X, p.1'),
        rangeCited('C', 'X, p.1', 'observed'),
        rangeCited('D', 'X, p.1', 'observed'),
      ]),
    ).toBeUndefined()
  })
})

/** Both boxes with an observation among their manual pages, which is the pairing #349 authored. */
const MUSE: ResolveResult = resolve({
  devices: DEVICES.filter((d) => d.id === 'moog-muse'),
  template: droneStudy,
  mood: moodState(),
  seed: 18,
})

const TR_6S: ResolveResult = resolve({
  devices: DEVICES.filter((d) => d.id === 'roland-tr-6s'),
  template: industrialTechno,
  mood: moodState(),
  seed: 18,
})

const MUSE_SENTENCE =
  "This block draws on the Muse User's Manual v1.4.0, pp.27-111 and the instrument at " +
  'firmware 1.4.0; its values are starting points.'

/** Two documents on one box, which one `Device.manual` title could not express however worded. */
const TR_6S_SENTENCE =
  'This block draws on the TR-6S Parameter Guide eng02, pp.7-10 and the ' +
  "TR-6S Owner's Manual eng02, p.17; its values are starting points."

/** The Muse's rendered block, which is what its sentence is about. */
function museRendered(): readonly ResolvedParam[] {
  return rendered(MUSE, 'moog-muse')
}

/**
 * Every opening the four branches can produce. Listed rather than derived, because a test that
 * asked the renderer which sentences it had emitted would agree with whatever it emitted — and
 * *exactly one per box* is the property most at risk from a fifth branch being added quietly.
 */
const SENTENCE_OPENERS =
  /^\*(Values on this box come from|Most values on this box come from|This block draws on|Checked values on this box draw on) /

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

const LAYOUTS: readonly GuideLayout[] = ['phase', 'sequencer']

describe('the Muse rests on a manual and on one person’s unit, and says both', () => {
  it('names the manual first and the instrument after it, whatever the counts say', () => {
    const params = museRendered()
    expect(citationSentence(params)).toBe(MUSE_SENTENCE)
    const sources = citedSources(params)
    // **The observation carries more of this box and still comes second.** 41 cited gates off the
    // unit against 34 off the manual, so ordering by count alone put *the instrument at firmware
    // 1.4.0* first — the arithmetic answer to a question nobody asked. The sentence answers *which
    // book do I open*, and an observation is not a book.
    expect(sources.map((source) => source.kind)).toEqual(['manual', 'observed'])
    expect(sources[0]!.count).toBeLessThan(sources[1]!.count)
    expect(sources[1]!.pages).toEqual([])
  })

  /**
   * **The span is wide because the block is.** p.27 is an oscillator range and p.111 is the MIDI
   * chapter, reached through `RECIEVE CC` — one of the settings #107 hoists to the top of the box,
   * which is rendered here and belongs in the answer. Nothing between them is invented: every page
   * in the list below was cited by something on this page.
   */
  it('spans every page the block actually reads, including the ones enums reach', () => {
    const manual = citedSources(museRendered()).find((source) => source.kind === 'manual')
    expect(manual?.pages).toEqual([27, 28, 30, 31, 34, 35, 36, 39, 44, 46, 47, 52, 53, 57, 105, 106, 110, 111])
    // Without the enum gate this stopped at p.52 — pp.53, 57 and 105-111 are cited by option sets
    // alone, and a `ResolvedParam` that dropped `options` could not see any of them.
    const withoutEnums = citedSources(
      museRendered().map(({ optionsVerified: _dropped, ...rest }) => rest),
    ).find((source) => source.kind === 'manual')
    expect(withoutEnums?.pages).toEqual([27, 52])
  })

  it('renders it once per box in both renderers and both layouts', () => {
    for (const layout of LAYOUTS) {
      const md = renderGuide(MUSE, { layout })
      expect(occurrences(md, MUSE_SENTENCE)).toBe(1)
      const html = renderToStaticMarkup(createElement(Guide, { result: MUSE, seed: 18, layout }))
      expect(occurrences(html, escapeForMarkup(MUSE_SENTENCE))).toBe(1)
    }
  })
})

describe('a box citing two documents names both (§3.2)', () => {
  it('does so in both renderers and both layouts', () => {
    for (const layout of LAYOUTS) {
      const md = renderGuide(TR_6S, { layout })
      expect(occurrences(md, TR_6S_SENTENCE)).toBe(1)
      const html = renderToStaticMarkup(createElement(Guide, { result: TR_6S, seed: 18, layout }))
      expect(occurrences(html, escapeForMarkup(TR_6S_SENTENCE))).toBe(1)
    }
  })
})

/**
 * The `'` in a device title reaches the markup as an entity, and asserting the raw sentence
 * against `renderToStaticMarkup` would pass for the wrong reason on a box whose manual has no
 * apostrophe. Only the entities React actually emits are replaced.
 */
function escapeForMarkup(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;')
}

describe('nothing else came back with it (§8.1)', () => {
  const RIG: ResolveResult = resolve({
    devices: DEVICES.filter((d) =>
      ['moog-muse', 'roland-tr-1000', 'polyend-tracker-mini'].includes(d.id),
    ),
    template: industrialTechno,
    mood: moodState(),
    seed: 18,
  })

  for (const layout of LAYOUTS) {
    it(`prints no per-value mark or cite line in the Markdown guide (${layout} layout)`, () => {
      const md = renderGuide(RIG, { layout })
      expect(md).not.toContain('↳ cite:')
      expect(md).not.toContain('· manual')
      expect(md).not.toContain('· observed')
      expect(md).not.toContain('· provisional')
      expect(md).not.toContain('· derived')
      // The two sentences the old scheme hoisted, both subsumed by the one above.
      expect(md).not.toContain('Values below cite')
      expect(md).not.toContain('Ranges cite')
      // And the type's vocabulary, which an earlier draft of the block sentence read aloud.
      expect(md).not.toContain('Ranges and option lists')
      expect(md).not.toContain('the settings inside them')
    })

    it(`prints no per-value mark or cite line in the web guide (${layout} layout)`, () => {
      const html = renderToStaticMarkup(createElement(Guide, { result: RIG, seed: 18, layout }))
      expect(html).not.toContain('subordinate cite')
      expect(html).not.toContain('prov-mark')
      expect(html).not.toContain('· manual')
      expect(html).not.toContain('Ranges cite')
    })

    it(`prints exactly one sentence per carrying box (${layout} layout)`, () => {
      const md = renderGuide(RIG, { layout })
      const carrying = new Set(RIG.assignments.map((a) => a.deviceId))
      const sentences = md.split('\n').filter((line) => SENTENCE_OPENERS.test(line))
      expect(sentences).toHaveLength(carrying.size)
    })
  }
})
