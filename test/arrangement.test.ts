import { describe, expect, it } from 'vitest'
import { bandTrajectory, resolve, type ResolveResult, type SectionName, type Template } from '../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

/**
 * §6.3's band trajectory, tested as *derivation* rather than as prose.
 *
 * The Markdown guide and the web guide format this differently and always will, so the facts
 * are derived once here and asserted once here. A test pinned to either renderer's wording
 * would have to be written twice and would fail on a comma.
 *
 * The golden scenario is the fixture on purpose: it authors band 2 and almost nothing else, so
 * every section falls back and the honesty of the fallback reporting is exercised by default
 * rather than by a case somebody remembered to write.
 */

const run = (template: Template): ResolveResult =>
  resolve({ devices: GOLDEN_DEVICES, template, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })

/** The scenario's three sections are energy 0.2 / 0.5 / 0.9 — bands 0, 2 and 3 (§6.3). */
const golden = () => bandTrajectory(run(GOLDEN_TEMPLATE))

function withStructure(structure: Template['structure'], over: Partial<Template> = {}): Template {
  return { ...GOLDEN_TEMPLATE, structure, ...over }
}

describe('bandTrajectory groups sections (§6.3)', () => {
  it('gives one group per distinct (band asked for, what plays), in structure order', () => {
    const { groups } = golden()
    expect(groups.map((g) => [g.band, g.sections])).toEqual([
      [0, ['Intro']],
      [2, ['Build']],
      [3, ['Drop']],
    ])
  })

  it('merges sections that ask the same band and program identically, part for part', () => {
    const { groups } = bandTrajectory(
      run(
        withStructure([
          { name: 'Intro', bars: 16, energy: 0.5 },
          { name: 'Build', bars: 16, energy: 0.5 },
          { name: 'Drop', bars: 32, energy: 0.9 },
        ]),
      ),
    )
    expect(groups.map((g) => g.sections)).toEqual([['Intro', 'Build'], ['Drop']])
  })

  it('never merges two sections that ask for different bands, however alike they play', () => {
    // The scenario's Intro (band 0) and Build (band 2) both end up on the same band-2 kick.
    // One line labelled with either band would be wrong about the other.
    const { groups } = golden()
    expect(groups.map((g) => g.band)).toEqual([0, 2, 3])
    expect(groups.every((g) => g.sections.length === 1)).toBe(true)
  })

  it('keeps two same-band groups apart, and names the role they differ on', () => {
    // A section-scoped variant. `p-build-kick` sorts before `p-kick-b2`, so it is the one
    // selected where it is eligible (§6.3), and Intro and Build stop programming alike.
    const t = withStructure(
      [
        { name: 'Intro', bars: 16, energy: 0.5 },
        { name: 'Build', bars: 16, energy: 0.5 },
      ],
      {
        patterns: [
          ...GOLDEN_TEMPLATE.patterns,
          {
            id: 'p-build-kick',
            forRole: 'kick',
            band: 2,
            sections: ['Build'],
            length: 16,
            hits: [{ step: 1, slot: 'downbeat' }],
          },
        ],
      },
    )
    const { groups } = bandTrajectory(run(t))
    expect(groups.map((g) => [g.band, g.sections])).toEqual([
      [2, ['Intro']],
      [2, ['Build']],
    ])
    expect(groups[0]?.differsOn).toEqual([])
    expect(groups[1]?.differsOn).toEqual(['kick'])
  })
})

describe('bandTrajectory reports fallback honestly (§6.3, invariant 5)', () => {
  it('never lets the band asked for stand as the band that plays', () => {
    const [intro, build, drop] = golden().groups
    // Intro asked band 0 and got band 2 for most parts, band 1 for the hat.
    expect(intro?.fallbacks).toEqual([
      { usedBand: 2, roles: ['kick', 'sub', 'pad'], all: false },
      { usedBand: 1, roles: ['closed-hat'], all: false },
    ])
    // Build asked band 2 and got it, except the hat, which has none authored there.
    expect(build?.fallbacks).toEqual([{ usedBand: 1, roles: ['closed-hat'], all: false }])
    expect(drop?.fallbacks[0]).toMatchObject({ usedBand: 2, all: false })
  })

  it('flags a section where every part fell back the same way, so it reads as one clause', () => {
    const t = withStructure([{ name: 'Drop', bars: 32, energy: 0.9 }], {
      roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
      patterns: GOLDEN_TEMPLATE.patterns.filter((p) => p.forRole === 'kick'),
    })
    expect(bandTrajectory(run(t)).groups[0]?.fallbacks).toEqual([
      { usedBand: 2, roles: ['kick'], all: true },
    ])
  })

  it('reports no fallback at all when every part got the band it asked for', () => {
    const t = withStructure([{ name: 'Build', bars: 16, energy: 0.5 }], {
      roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
      patterns: GOLDEN_TEMPLATE.patterns.filter((p) => p.id === 'p-kick-b2'),
    })
    const [only] = bandTrajectory(run(t)).groups
    expect(only).toMatchObject({ band: 2, fallbacks: [], silent: [], differsOn: [] })
  })
})

describe('bandTrajectory separates the two kinds of silence (invariant 5)', () => {
  it('hoists a part with no pattern anywhere out of the per-section groups', () => {
    // Said once as a fact about the part, not three times as a fact about three sections.
    const t = golden()
    expect(t.unpatterned).toEqual(['bass-mid', 'tom'])
    expect(t.groups.every((g) => g.silent.length === 0)).toBe(true)
  })

  it('leaves a part silent in only some sections on the group it is silent in', () => {
    const t = withStructure(
      [
        { name: 'Intro', bars: 16, energy: 0.5 },
        { name: 'Drop', bars: 32, energy: 0.5 },
      ],
      {
        roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
        patterns: GOLDEN_TEMPLATE.patterns
          .filter((p) => p.forRole === 'kick')
          .map((p) => ({ ...p, sections: ['Drop' as SectionName] })),
      },
    )
    const { groups, unpatterned } = bandTrajectory(run(t))
    expect(unpatterned).toEqual([])
    expect(groups.map((g) => [g.sections, g.silent])).toEqual([
      [['Intro'], ['kick']],
      [['Drop'], []],
    ])
  })

  it('says nothing at all when there is nothing assigned', () => {
    const empty = bandTrajectory(
      resolve({ devices: [], template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
    )
    // One group covering every section, with no band to report — not an invented band 0.
    expect(empty.groups).toHaveLength(1)
    expect(empty.groups[0]).toMatchObject({ band: undefined, fallbacks: [], silent: [] })
    expect(empty.unpatterned).toEqual([])
  })
})

describe('bandTrajectory sizes each group, so the band label means something (#152)', () => {
  it('counts the parts and the strikes of what plays', () => {
    // The scenario's five parts are four roles — it asks for `pad` twice.
    const [intro, build, drop] = golden().groups
    expect(intro?.programs).toEqual({ parts: 5, strikes: 8 })
    expect(build?.programs).toEqual({ parts: 5, strikes: 8 })
    expect(drop?.programs).toEqual({ parts: 5, strikes: 9 })
  })

  it('reports no cycle length, which phase 1 and phase 5 already count differently', () => {
    // It briefly reported the group's longest cycle in bars. That is a third meaning of "how
    // long" in one guide — phase 1 counts a section's bars, phase 5 a pattern's length — and
    // #142 is the record of what two of them already cost a reader. Pinned so it stays gone.
    for (const g of golden().groups) {
      expect(Object.keys(g.programs).sort()).toEqual(['parts', 'strikes'])
    }
  })

  it('is what separates two groups the band label alone renders alike', () => {
    // Build asks band 2 and Drop asks band 3, and before #152 that was the entire visible
    // difference between the two lines. The hat is the part that moves — `p-hat-b1`'s one hit
    // in Build against `p-hat-b2-drop`'s two — and the strike count is where a reader sees it.
    const [, build, drop] = golden().groups
    expect(drop?.programs.strikes).toBeGreaterThan(build?.programs.strikes ?? 0)
  })

  it('counts the band that played, never the band that was asked for', () => {
    // Intro asks band 0 and the scenario authors nothing there, so every part falls back. A
    // summary counting the label's band would report an empty section; what a reader has to
    // punch in is whatever came back.
    const [intro] = golden().groups
    expect(intro?.band).toBe(0)
    expect(intro?.fallbacks.length).toBeGreaterThan(0)
    expect(intro?.programs.strikes).toBe(8)
  })

  it('leaves a part silent here out of the count, where `silent` already reports it', () => {
    const t = withStructure(
      [
        { name: 'Intro', bars: 16, energy: 0.5 },
        { name: 'Drop', bars: 32, energy: 0.5 },
      ],
      {
        roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
        patterns: GOLDEN_TEMPLATE.patterns
          .filter((p) => p.forRole === 'kick')
          .map((p) => ({ ...p, sections: ['Drop' as SectionName] })),
      },
    )
    const [intro, drop] = bandTrajectory(run(t)).groups
    // The kick is silent in Intro and plays in Drop. One part, counted once, in one group.
    expect(intro?.silent).toEqual(['kick'])
    expect(intro?.programs).toEqual({ parts: 0, strikes: 0 })
    expect(drop?.programs).toMatchObject({ parts: 1 })
  })

  it('reports zeros for a group with nothing playing, rather than an invented size', () => {
    const empty = bandTrajectory(
      resolve({ devices: [], template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
    )
    expect(empty.groups[0]?.programs).toEqual({ parts: 0, strikes: 0 })
  })

  it('keeps every count an integer, so nothing here can drift across platforms', () => {
    // Both are plain counts (invariant 6). Nothing here divides, and nothing should start to.
    for (const g of golden().groups) {
      for (const n of [g.programs.parts, g.programs.strikes]) {
        expect(Number.isInteger(n)).toBe(true)
      }
    }
  })
})

describe('bandTrajectory carries no per-part fact the band does not make true', () => {
  it('derives which sections a part occupies nowhere — that is phase 2 (§8)', () => {
    // It briefly carried "parts that come and go", which was `a.sections` copied verbatim out
    // of Voice assignment. Duplicating a fact is how this section grew into a second copy of
    // the guide the first time, so the field is gone rather than merely unrendered.
    const t = withStructure(GOLDEN_TEMPLATE.structure, {
      roles: [
        ...GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
        {
          id: 'r-imp',
          role: 'impact',
          priority: 2,
          character: 'hard',
          sustain: 'transient',
          sections: ['Drop'],
        },
      ],
    })
    // `sustained` (#46) is allowed here for the same reason `unpatterned` is: it is decided by
    // looking at every section a part occupies, so it is a fact the band trajectory makes true
    // rather than one copied off an assignment. A key that could be read off a single part
    // still does not belong.
    expect(Object.keys(bandTrajectory(run(t))).sort()).toEqual([
      'groups',
      'sustained',
      'unpatterned',
    ])
  })

  it('is a pure function of the result — the same facts on every call', () => {
    expect(golden()).toEqual(golden())
  })
})

describe('roles are named once, however many times a template requests them', () => {
  it('does not repeat a role that two requests share', () => {
    // The scenario asks for `pad` twice. "`pad` and `pad` play band 2" is noise, not detail.
    const [intro] = golden().groups
    const roles = intro?.fallbacks.flatMap((f) => f.roles) ?? []
    expect(roles).toEqual([...new Set(roles)])
    expect(roles).toContain('pad')
  })
})
