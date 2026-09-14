import { describe, expect, it } from 'vitest'
import {
  ForbiddenDegreeSchema,
  NON_PATTERN_BEARING_ROLES,
  RiffConstraintsSchema,
  bearsPattern,
  RiffSchema,
  STEPS_PER_BAR,
  affinePatch,
  chordAtStep,
  pitchClassOf,
  resolveHook,
  resolveRiff,
  riffConstraintViolations,
  referenceSlug,
  spellChord,
  spellDegree,
  type FactoryPatch,
  type HookNote,
  type Riff,
} from '@/lib/core'
import { at, on, variant } from '@/lib/core'
import { ruleLines } from '@/lib/studio/riff-text'
import { gridOf } from './fixtures'
import { DEVICES } from '@/lib/devices/registry.generated'
import {
  RIFFS,
  aegeanOrganPhrygianFigure,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  detroitFunkAeolianMachineLoop,
  hamamatsuTinesBalladFigure,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  polyphonicPowerBrassStabCycle,
  riffById,
  seventiesElectroPnoRhodesTurnaround,
  showMeLoveOrganStab,
  softOrchestraSlowChanges,
  threeOscBassLoveRootOctaveFigure,
  thrillerSynthRiff,
  voxHumanaRigidColdPopLine,
} from '@/lib/riffs'

/**
 * §5A. The schema, and the library the schema exists to hold honest.
 *
 * Two halves, deliberately in one file: every rule below is a rule *about authored content*, and
 * a suite that checked the schema against fixtures and never against the four real entries would
 * pass on a library where all four broke the same rule.
 */

/** A riff that parses. Tests clone this and break one thing at a time (`test/fixtures.ts`' shape). */
function riff(over: Partial<Riff> = {}): Riff {
  return {
    id: 'fixture-riff',
    name: 'The fixture riff',
    reference: { kind: 'record', name: 'fixture' },
    technique: ['Play it.'],
    bpm: { min: 100, max: 140, default: 120 },
    key: 'A minor',
    request: {
      id: 'fixture-riff',
      role: 'bass-mid',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
      reArticulatesHook: true,
    },
    hook: {
      id: 'fixture-riff-hook',
      forRole: 'bass-mid',
      bars: 1,
      baseOctave: 2,
      notes: [{ step: 1, degree: 1, octave: 0, len: 16 }],
    },
    pattern: variant('fixture-riff-grid', 'bass-mid', 0, 16, at('accent', 110, 1), on('offbeat', 3)),
    ...over,
  }
}

/**
 * §5A.2/#608. A riff on a held role: the fixture above with `pad` for its part, no grid and no
 * `reArticulatesHook`, which is the whole of the other shape.
 */
function heldRiff(over: Partial<Riff> = {}): Riff {
  const base = riff()
  const { reArticulatesHook: _dropped, ...request } = base.request
  const { pattern: _grid, ...rest } = base
  return {
    ...rest,
    request: { ...request, role: 'pad', character: 'soft' },
    hook: { ...base.hook, forRole: 'pad' },
    ...over,
  }
}

/** The first message on a failed parse, which is what an author actually reads. */
function refusal(candidate: unknown): string {
  const parsed = RiffSchema.safeParse(candidate)
  expect(parsed.success, 'expected this riff to be refused').toBe(false)
  return parsed.success ? '' : (parsed.error.issues[0]?.message ?? '')
}

/** Every message on a failed parse, for a candidate that breaks more than one rule. */
function refusals(candidate: unknown): string[] {
  const parsed = RiffSchema.safeParse(candidate)
  expect(parsed.success, 'expected this riff to be refused').toBe(false)
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message)
}

describe('RiffSchema (§5A)', () => {
  it('accepts the fixture', () => {
    expect(RiffSchema.safeParse(riff()).success).toBe(true)
  })

  it('is strict: an unknown field is a typo, not an extension', () => {
    expect(RiffSchema.safeParse({ ...riff(), sections: ['Drop'] }).success).toBe(false)
  })

  /**
   * §5A.5. **A reference is a record or a factory patch, and the checks are the same for both.**
   * The title has to carry the name and the id has to open with its slug whichever kind it is;
   * the kind changes nothing about where the reference is findable, only what it names.
   */
  it('parses a record reference (§5A.5)', () => {
    const parsed = RiffSchema.safeParse(riff({ reference: { kind: 'record', name: 'fixture' } }))
    expect(parsed.success).toBe(true)
  })

  it('parses a patch reference (§5A.5)', () => {
    const parsed = RiffSchema.safeParse(
      riff({
        id: 'fixture-patch-riff',
        name: 'The fixture patch riff',
        reference: { kind: 'patch', name: 'fixture patch' },
      }),
    )
    expect(parsed.success).toBe(true)
  })

  it('refuses a reference of a third kind: the idiom is not a reference (§5A.5)', () => {
    const idiom = { kind: 'idiom', name: 'fixture' } as unknown as Riff['reference']
    expect(RiffSchema.safeParse(riff({ reference: idiom })).success).toBe(false)
  })

  it('refuses an empty reference name (§5A.5)', () => {
    expect(RiffSchema.safeParse(riff({ reference: { kind: 'record', name: '' } })).success).toBe(
      false,
    )
  })

  it('refuses a title that does not name the reference (§5A.5)', () => {
    expect(refusal(riff({ name: 'The nameless riff' }))).toContain('must name')
    expect(
      refusal(
        riff({
          id: 'fixture-patch-riff',
          name: 'The nameless riff',
          reference: { kind: 'patch', name: 'fixture patch' },
        }),
      ),
    ).toContain('must name')
  })

  it('refuses an id that does not open with the reference’s slug (§5A.5)', () => {
    expect(refusal(riff({ id: 'some-other-riff' }))).toContain('must open with')
    expect(
      refusal(
        riff({
          id: 'some-other-riff',
          name: 'The fixture patch riff',
          reference: { kind: 'patch', name: 'fixture patch' },
        }),
      ),
    ).toContain('must open with')
  })

  it('slugifies a multi-word reference the way an address bar needs it', () => {
    expect(referenceSlug('Show Me Love')).toBe('show-me-love')
    expect(referenceSlug('Blue Monday')).toBe('blue-monday')
    expect(referenceSlug('Muse Runner')).toBe('muse-runner')
    // Punctuation collapses rather than surviving, and no leading or trailing separator is left.
    expect(referenceSlug("Ain't  Nobody!")).toBe('ain-t-nobody')
  })

  it('refuses a key the engine cannot read, because the hook has no second one', () => {
    expect(refusal(riff({ key: 'H minor' }))).toContain('not a key this engine reads')
  })

  it('refuses a transient request: a riff has no sections to occupy', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, sustain: 'transient', sections: ['Drop'] } })).toContain(
      'no sections',
    )
  })

  it('refuses a priority above 1, which would imply a part it does not have', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, priority: 2 } })).toContain('one part')
  })

  it('refuses `optional`/`inessential`: a riff is the part', () => {
    const r = riff()
    expect(
      refusal({
        ...r,
        request: { ...r.request, optional: true, inessential: { reason: 'nice to have' } },
      }),
    ).toContain('cannot also be one the piece does without')
  })

  it('refuses `distinct`: there is no second request to differ from', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, distinct: true } })).toContain('nothing for it')
  })

  it('refuses a `pitch` beside the hook — two authorities over one note (§4.1/#100)', () => {
    const r = riff()
    expect(
      refusal({ ...r, request: { ...r.request, pitch: { degree: 1, baseOctave: 2 } } }),
    ).toContain('cannot name another')
  })

  it('refuses `followsKey`, which would transpose an in-key hook twice', () => {
    const r = riff()
    // On a role that may legally follow the key, so the refusal is this schema's and not
    // `RoleRequestSchema`'s role check firing first.
    const kick = {
      ...r,
      request: { ...r.request, role: 'kick' as const, followsKey: true as const },
      hook: { ...r.hook, forRole: 'kick' as const },
      pattern: { ...r.pattern, forRole: 'kick' as const },
    }
    expect(refusal(kick)).toContain('transpose it twice')
  })

  it('requires `reArticulatesHook`: the grid places strikes inside the hook (§4.3)', () => {
    const r = riff()
    const { reArticulatesHook: _dropped, ...bare } = r.request
    expect(refusal({ ...r, request: bare })).toContain('re-articulates the hook')
  })

  /**
   * §4.2/§5A.2/#608. **The role decides the shape.** A struck role carries a grid and the flag
   * that joins it to the hook; a held role carries neither. Every combination of the two fields
   * against the two kinds of role is here, so the schema is held to refusing exactly the three
   * wrong ones on each side.
   */
  describe('a grid and `reArticulatesHook` go together, and only on a struck role (#608)', () => {
    const struck = riff()
    const { reArticulatesHook: _flag, ...unflagged } = struck.request
    const { pattern: grid, ...ungridded } = struck
    const held = heldRiff()

    it('accepts a struck role with both, which is every riff before #608', () => {
      expect(RiffSchema.safeParse(struck).success).toBe(true)
      expect(NON_PATTERN_BEARING_ROLES).not.toContain(struck.request.role)
    })

    it('refuses a struck role with no grid: the part is struck, so the riff says where', () => {
      expect(refusal(ungridded)).toContain('is struck: a riff on it says where, in a grid')
    })

    it('refuses a struck role with a grid and no flag', () => {
      expect(refusal({ ...struck, request: unflagged })).toContain('re-articulates the hook')
    })

    it('refuses a struck role with neither, and names both', () => {
      const messages = refusals({ ...ungridded, request: unflagged })
      expect(messages.some((m) => m.includes('re-articulates the hook'))).toBe(true)
      expect(messages.some((m) => m.includes('says where, in a grid'))).toBe(true)
    })

    it('accepts a held role with neither: the hook is the whole figure', () => {
      expect(NON_PATTERN_BEARING_ROLES).toContain(held.request.role)
      expect(held.pattern).toBeUndefined()
      expect(held.request.reArticulatesHook).toBeUndefined()
      const parsed = RiffSchema.safeParse(held)
      expect(parsed.success, JSON.stringify(parsed.success ? '' : parsed.error.issues)).toBe(true)
    })

    it('refuses a held role with a grid: there is nothing to strike', () => {
      const padGrid = { ...(grid as NonNullable<typeof grid>), forRole: 'pad' as const }
      expect(refusal({ ...held, pattern: padGrid })).toContain('no grid to riff on')
    })

    it('refuses a held role with the flag: there is no grid to re-articulate the hook', () => {
      expect(
        refusal({ ...held, request: { ...held.request, reArticulatesHook: true as const } }),
      ).toContain('no grid to re-articulate the hook')
    })

    it('refuses a held role with both, and names both', () => {
      const padGrid = { ...(grid as NonNullable<typeof grid>), forRole: 'pad' as const }
      const messages = refusals({
        ...held,
        pattern: padGrid,
        request: { ...held.request, reArticulatesHook: true as const },
      })
      expect(messages.some((m) => m.includes('no grid to riff on'))).toBe(true)
      expect(messages.some((m) => m.includes('no grid to re-articulate the hook'))).toBe(true)
    })

    it('holds a held riff to every rule that is not about the grid', () => {
      expect(refusal(heldRiff({ key: 'H major' }))).toContain('not a key this engine reads')
      expect(refusal({ ...held, hook: { ...held.hook, notes: [] } })).toContain('drum pattern')
      expect(refusal({ ...held, hook: { ...held.hook, forRole: 'lead' } })).toContain('the hook is for')
    })
  })

  it('refuses a hook or a grid authored for another role', () => {
    const r = riff()
    expect(refusal({ ...r, hook: { ...r.hook, forRole: 'lead' } })).toContain('the hook is for')
    expect(refusal({ ...r, pattern: { ...r.pattern, forRole: 'lead' } })).toContain('the grid is for')
  })

  it('refuses a band above 0: there is no density here to select with (§6.3)', () => {
    const r = riff()
    expect(refusal({ ...r, pattern: { ...r.pattern, band: 2 } })).toContain('its band is 0')
  })

  it('refuses a variant scoped to sections, and an empty grid or hook', () => {
    const r = riff()
    expect(refusal({ ...r, pattern: { ...r.pattern, sections: ['Drop'] } })).toContain('no sections')
    expect(refusal({ ...r, pattern: { ...r.pattern, hits: [] } })).toContain('held note')
    expect(refusal({ ...r, hook: { ...r.hook, notes: [] } })).toContain('drum pattern')
  })

  it('refuses a riff with no technique prose', () => {
    expect(refusal(riff({ technique: [] }))).toContain('say what it is')
  })

  /**
   * §5A.2/#603. A hook longer than its grid is played with the grid repeating beneath it, so the
   * hook is a whole number of passes: a three-bar hook over a two-bar grid would have the grid
   * cut off halfway through its second pass, and nothing on the page could say where.
   */
  it('refuses a hook that is not a whole number of grid passes (§5A.2)', () => {
    const r = riff()
    const grid = variant('fixture-riff-grid', 'bass-mid', 0, 32, at('accent', 110, 1))
    const hookOf = (bars: number) => ({
      ...r.hook,
      bars,
      notes: [{ step: 1, degree: 1, octave: 0, len: bars * 16 }],
    })
    // Three bars over two: 48 steps is one and a half passes of a 32-step grid.
    expect(refusal({ ...r, pattern: grid, hook: hookOf(3) })).toContain(
      'a 3-bar hook is 48 steps, which is not a whole number of passes of a 32-step grid',
    )
    // Two, four and six bars over two are one, two and three passes, and parse.
    for (const bars of [2, 4, 6]) {
      expect(RiffSchema.safeParse({ ...r, pattern: grid, hook: hookOf(bars) }).success, String(bars)).toBe(true)
    }
    // And a hook shorter than its grid is refused too: half a pass is not a pass.
    expect(refusal({ ...r, pattern: grid, hook: hookOf(1) })).toContain('not a whole number of passes')
  })

  /**
   * §5A.5/#585. **A patch affinity is `(name, bank?, reason)` and nothing else.** No evidence,
   * because the recipe naming the patch is what proves it exists; no device, because a riff
   * names none.
   */
  it('parses a patch affinity, with and without a bank (§5A.5/#585)', () => {
    const one = riff({ patchAffinities: [{ name: 'Fixture Lead', reason: 'it is the sound' }] })
    expect(RiffSchema.safeParse(one).success).toBe(true)
    const banked = riff({
      patchAffinities: [{ name: 'Fixture Lead', bank: 'Leads', reason: 'it is the sound' }],
    })
    expect(RiffSchema.safeParse(banked).success).toBe(true)
  })

  it('refuses an affinity with no reason, an empty list, and a device on the entry', () => {
    expect(
      refusal(riff({ patchAffinities: [{ name: 'Fixture Lead', reason: '' }] })),
    ).toContain('reason')
    expect(RiffSchema.safeParse(riff({ patchAffinities: [] })).success).toBe(false)
    expect(
      RiffSchema.safeParse(
        riff({
          patchAffinities: [
            { name: 'Fixture Lead', reason: 'it is the sound', device: 'moog-muse' },
          ] as unknown as Riff['patchAffinities'],
        }),
      ).success,
    ).toBe(false)
  })

  it('refuses two affinities naming one patch, and tells the two banks apart', () => {
    expect(
      refusal(
        riff({
          patchAffinities: [
            { name: 'Fixture Lead', reason: 'one' },
            { name: 'Fixture Lead', reason: 'two' },
          ],
        }),
      ),
    ).toContain('same patch')
    expect(
      RiffSchema.safeParse(
        riff({
          patchAffinities: [
            { name: 'Fixture Lead', reason: 'one' },
            { name: 'Fixture Lead', bank: 'Leads', reason: 'two' },
          ],
        }),
      ).success,
    ).toBe(true)
  })
})

/**
 * §5A.5/#585. **The match is exact on both halves of the key**, and an absent bank is a value
 * rather than a wildcard. The matcher is pure and takes the recipe's patch by hand, so every
 * shape is pinned without a rig.
 */
describe('affinePatch (§5A.5/#585)', () => {
  const evidence = { kind: 'observed' as const, source: 'fixture unit, firmware 0' }
  const flat: FactoryPatch = { name: 'Fixture Lead', evidence }
  const banked: FactoryPatch = { name: 'Fixture Lead', bank: 'Leads', evidence }

  it('answers the recipe’s patch where an affinity names it exactly', () => {
    const r = riff({ patchAffinities: [{ name: 'Fixture Lead', reason: 'it is the sound' }] })
    expect(affinePatch(r, flat)).toBe(flat)
  })

  it('answers `undefined` with no affinity authored, and with no patch on the recipe', () => {
    expect(affinePatch(riff(), flat)).toBeUndefined()
    const r = riff({ patchAffinities: [{ name: 'Fixture Lead', reason: 'it is the sound' }] })
    expect(affinePatch(r, undefined)).toBeUndefined()
  })

  it('answers `undefined` on a different name, however close', () => {
    const r = riff({ patchAffinities: [{ name: 'fixture lead', reason: 'it is the sound' }] })
    expect(affinePatch(r, flat)).toBeUndefined()
  })

  it('treats an absent bank as absent, not as any bank', () => {
    const noBank = riff({ patchAffinities: [{ name: 'Fixture Lead', reason: 'it is the sound' }] })
    expect(affinePatch(noBank, banked)).toBeUndefined()
    const withBank = riff({
      patchAffinities: [{ name: 'Fixture Lead', bank: 'Leads', reason: 'it is the sound' }],
    })
    expect(affinePatch(withBank, flat)).toBeUndefined()
    expect(affinePatch(withBank, banked)).toBe(banked)
  })

  it('matches any entry of the list, not only the first', () => {
    const r = riff({
      patchAffinities: [
        { name: 'Other', reason: 'one' },
        { name: 'Fixture Lead', bank: 'Leads', reason: 'two' },
      ],
    })
    expect(affinePatch(r, banked)).toBe(banked)
  })
})

describe('the riff library (§5A)', () => {
  /**
   * An exact pin, where this used to be a range. Six entries was the library's own headcount and
   * the range was a proxy for *not many*; #569 landed eleven at once, and a range wide enough to
   * hold seventeen would hold anything. The number is content: five records and the twelve
   * factory-patch definitions, and an entry added or dropped moves it and has to say so here.
   */
  it('has exactly seventeen entries: five records and twelve factory patches (#566, #569)', () => {
    expect(RIFFS.length).toBe(17)
    expect(RIFFS.filter((r) => r.reference.kind === 'record')).toHaveLength(5)
    expect(RIFFS.filter((r) => r.reference.kind === 'patch')).toHaveLength(12)
  })

  it('every entry parses', () => {
    for (const entry of RIFFS) {
      const parsed = RiffSchema.safeParse(entry)
      expect(parsed.success, `${entry.id}: ${parsed.success ? '' : parsed.error.message}`).toBe(true)
    }
  })

  it('ids are unique and the registry is in UTF-16 code unit order (§7.2)', () => {
    const ids = RIFFS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })

  it('`riffById` answers, and answers `undefined` for a stale link', () => {
    expect(riffById('blue-monday-bass')).toBe(blueMondayBass)
    expect(riffById('no-such-riff')).toBeUndefined()
  })

  it('carries the two entries the product is named for, titled as it titles them', () => {
    expect(blueMondayBass.id).toBe('blue-monday-bass')
    expect(blueMondayBass.name).toBe('The Blue Monday bass')
    expect(thrillerSynthRiff.id).toBe('thriller-synth-riff')
    expect(thrillerSynthRiff.name).toBe('The Thriller synth riff')
  })

  /**
   * §5A.5. **Every entry names what it is found by, in both the things a reader sees** — the
   * title on the page and the slug in the address bar.
   *
   * Asserted here as well as in the schema, and the two are not the same check. The schema refuses
   * an entry whose `reference` disagrees with its own id and title; this refuses a *library* where
   * an entry declared a reference nobody would recognise as a record or a patch — an empty one, a
   * bare role name, or a name that is really just the riff's own id typed twice.
   */
  it('every entry’s title and slug carry its reference', () => {
    for (const entry of RIFFS) {
      const { name } = entry.reference
      expect(name.trim(), entry.id).toBe(name)
      expect(name.length, entry.id).toBeGreaterThan(2)
      // The reference is a record or a patch, not the part. `Riff.request.role` is what the part
      // is.
      expect(name.toLowerCase(), entry.id).not.toBe(entry.request.role)
      // Both surfaces, which is the whole rule.
      expect(entry.name, `${entry.id} title`).toContain(name)
      expect(entry.id.startsWith(referenceSlug(name)), `${entry.id} slug`).toBe(true)
      // And the slug is a real prefix rather than the whole id: `blue-monday` alone would not say
      // which part of the record the page is about.
      expect(entry.id.length, `${entry.id} names no part`).toBeGreaterThan(
        referenceSlug(name).length,
      )
    }
  })

  it('no two entries share a reference', () => {
    const names = RIFFS.map((r) => `${r.reference.kind}:${r.reference.name}`)
    expect(new Set(names).size).toBe(names.length)
  })

  /**
   * **This asked for one role per entry, and it now allows a single deliberate pair.** The
   * original rule was a proxy for variety written when there were four entries and 23 roles: a
   * library of four bass lines would be four of the same page, and "no role twice" was the
   * cheapest thing that would catch it.
   *
   * `blade-runner-blues-lead` is a second `lead` and is not that. Thriller's lead is a figure
   * whose identity is *where it lands* — four pitches, all rhythm. This one is a figure whose
   * identity is *what is under it* — one note per chord over a six-chord cycle, with two of
   * them raised because the chord is borrowed. They are opposite lessons on one role, and a rule
   * that forbade the second would be the proxy outliving what it stood for.
   *
   * So the intent was asserted instead of the proxy, as *at most one repeat*. That outlived what
   * it stood for a second time when `muse-runner-floating-arrival-lead` arrived (#566): a third
   * `lead`, and again a different lesson: the same six chords with the line moving inside each,
   * where Blade Runner is only the arrivals (#603). The rule was never about a count of repeats. It was that a reader
   * opening the index should find parts of several kinds, and that no one role should be what
   * the library mostly is.
   *
   * So that is what is asserted: at least four distinct roles, and no role held by a strict
   * majority of the entries. Three leads in six is half and is allowed; a fourth would tip it.
   */
  it('spans at least four roles, and no role is a strict majority of the library', () => {
    const roles = RIFFS.map((r) => r.request.role)
    const distinct = new Set(roles)
    expect(distinct.size).toBeGreaterThanOrEqual(4)
    for (const role of distinct) {
      const count = roles.filter((r) => r === role).length
      expect(count * 2, `${role} is ${String(count)} of ${String(roles.length)}`).toBeLessThanOrEqual(
        roles.length,
      )
    }
  })

  it('is six roles over seventeen entries, two of them pads since #608', () => {
    // The two pad definitions landed as leads while `RiffSchema` refused a held role, which put
    // eight of seventeen on `lead`. Moving them back is two fewer leads and one more distinct
    // role, pinned so the spread above is known and not merely satisfied.
    const counts = new Map<string, number>()
    for (const r of RIFFS) counts.set(r.request.role, (counts.get(r.request.role) ?? 0) + 1)
    expect(Object.fromEntries([...counts].sort())).toEqual({
      acid: 1,
      arp: 1,
      'bass-mid': 2,
      lead: 6,
      pad: 2,
      stab: 5,
    })
    expect(RIFFS).toHaveLength(17)
    // And the two pads are the two held riffs: no grid, no flag, on both.
    const pads = RIFFS.filter((r) => r.request.role === 'pad').map((r) => r.id)
    expect(pads.sort()).toEqual(['moog-55-strings-suspension-writing', 'soft-orchestra-slow-changes'])
    for (const r of RIFFS) {
      expect(r.pattern === undefined, r.id).toBe(!bearsPattern(r.request.role))
      expect(r.request.reArticulatesHook === undefined, r.id).toBe(!bearsPattern(r.request.role))
    }
  })

  /**
   * Invariant 3, enforced rather than reviewed. A riff that named a box would be the template
   * layer's one forbidden move made by a new content type, and it is the sort of thing that
   * arrives in prose rather than in a field — so the prose is what is scanned.
   *
   * **The reference is the one string exempt, and only where it sits in the title** (§5A.5,
   * #566). A factory patch is named by the manufacturer, and *Muse Runner* carries the box's own
   * name inside it. The reference names the preset and not the box, and the title is where §5A.5
   * requires it verbatim, so scanning it there would refuse the entry the relaxation exists for.
   * Everything else stays scanned: the rest of the title, and every paragraph of technique, so a
   * box named in prose is still caught.
   *
   * **Every affinity's `reason` is scanned too** (#585). An affinity implies a box, which is the
   * exception §5A.5 makes, and a reason that went on to name it would be the exception widening
   * in the one string nothing renders. So it gets no exemption at all: not even the patch's own
   * name, which is why a reason says *this patch* rather than repeating it.
   */
  it('names no device, anywhere a reader can see', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      const title = entry.name.replace(entry.reference.name, '')
      const reasons = (entry.patchAffinities ?? []).map((a) => a.reason)
      const ink = [title, ...entry.technique, ...reasons].join('\n')
      for (const name of names) {
        expect(ink.includes(name), `${entry.id} names ${name}`).toBe(false)
      }
    }
  })

  /**
   * The other half of that exemption, and the reason it is safe to make.
   *
   * The scan above skips `reference.name` where it sits in the title, so a reference that *is* a
   * device name would carry one onto the page through the one string nothing reads. `Muse Runner`
   * is a preset the manufacturer named and passes; a bare `Muse` is the box, and an entry titled
   * *The Muse lead* would put it in front of a reader with the scan looking the other way.
   *
   * Containment is what the exemption is for, so this asks for equality rather than substring:
   * the reference may carry a box's name inside a longer preset name, and may not be one.
   */
  it('no reference is a device by itself (invariant 3)', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      for (const name of names) {
        expect(entry.reference.name, `${entry.id} is named for a box`).not.toBe(name)
      }
    }
  })

  /**
   * §5A.5/#585. The same equality rule over an affinity's `name`. An affinity is allowed to
   * imply a box; one whose name *is* a box would be a device id in a riff field with a patch's
   * label on it.
   */
  it('no affinity is a device by itself (invariant 3)', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      for (const affinity of entry.patchAffinities ?? []) {
        for (const name of names) {
          expect(affinity.name, `${entry.id} has an affinity for a box`).not.toBe(name)
        }
      }
    }
  })

  /**
   * §5A.5/#585. **Every authored affinity identifies exactly one factory patch in the library.**
   * The riff carries no evidence for the patch; the recipe naming it does. An affinity no recipe
   * answers is a claim resting on nothing, and one two boxes answer is a key that stopped being
   * one. Counted over every recipe of every device, by the exact `(name, bank)` the matcher uses.
   */
  it('every affinity names exactly one factory patch the library authors', () => {
    for (const entry of RIFFS) {
      for (const affinity of entry.patchAffinities ?? []) {
        const boxes = new Set<string>()
        let recipes = 0
        for (const device of DEVICES) {
          for (const recipe of device.recipes) {
            const patch = recipe.factoryPatch
            if (patch === undefined) continue
            if (affinity.name !== patch.name || affinity.bank !== patch.bank) continue
            boxes.add(device.id)
            recipes += 1
          }
        }
        const key = `${affinity.name}${affinity.bank === undefined ? '' : ` in ${affinity.bank}`}`
        expect(recipes, `${entry.id}: no recipe names ${key}`).toBeGreaterThanOrEqual(1)
        expect([...boxes], `${entry.id}: ${key} is on more than one box`).toHaveLength(1)
      }
    }
  })

  /**
   * §5A.5/#585. **Exactly two entries author an affinity, and this is the complete set.** A
   * patch-named reference is how a reader finds the technique and is not a judgement that the
   * figure is that sound, so an entry named after a patch earns nothing here by that alone; a
   * third id is a new judgement and has to be added to this list on purpose.
   */
  it('exactly two riffs author a patch affinity (#585)', () => {
    const authored = RIFFS.filter((r) => r.patchAffinities !== undefined).map((r) => r.id)
    expect(authored).toEqual(['blade-runner-blues-lead', 'muse-runner-floating-arrival-lead'])
  })

  /**
   * §5A.5/#585. **The library's own answer, both ways, on the box that ships every patch.**
   * Blade Runner Blues is a CS-80 line and *Muse Runner* is a CS-80 lead, so the page says to
   * load it; Thriller reaches the same `lead / bright` recipe and is not that sound, so it says
   * nothing. Show Me Love reaches a `stab / bright` recipe that names a patch too, and says
   * nothing for the same reason.
   */
  it('a riff keeps a factory patch only where it authors the affinity (#585)', () => {
    const muse = DEVICES.filter((d) => d.id === 'moog-muse')
    const patchOn = (riff: Riff): string | undefined => {
      const resolution = resolveRiff(riff, muse)
      if (resolution.outcome !== 'played') throw new Error(`${riff.id}: ${resolution.gap.reason}`)
      return resolution.voice.factoryPatch?.name
    }
    expect(patchOn(bladeRunnerBluesLead)).toBe('Muse Runner')
    expect(patchOn(museRunnerFloatingArrivalLead)).toBe('Muse Runner')
    // Each of these lands on a recipe that names a patch, and the page must not say so.
    for (const entry of [thrillerSynthRiff, aegeanOrganPhrygianFigure, showMeLoveOrganStab]) {
      const resolution = resolveRiff(entry, muse)
      if (resolution.outcome !== 'played') throw new Error(entry.id)
      expect(resolution.voice.recipe.factoryPatch, `${entry.id} lands on a patched recipe`).toBeDefined()
      expect(resolution.voice.factoryPatch, entry.id).toBeUndefined()
    }
  })

  /**
   * The rule the Blue Monday entry exists to demonstrate: **the reference is how a reader finds
   * the technique, and the notes are ours.**
   *
   * A test cannot prove a figure is original, and this does not claim to. What it pins is the
   * one thing that would let a transcription slip in unnoticed, prose that presents itself as
   * one, so a future edit that turned an entry into a copy has to argue with a test rather than
   * pass quietly.
   */
  it('carries a figure of its own rather than a transcription', () => {
    // This used to cap every hook at four bars on the claim that §4.3 could express no more,
    // which was false (#603): a hook runs as long as it needs to and only the grid is capped
    // (§5A.2). Length is not evidence of transcription either way, so what is pinned is the
    // prose: an entry that presents itself as a copy has to argue with this test.
    for (const entry of RIFFS) {
      const ink = entry.technique.join('\n').toLowerCase()
      for (const word of ['transcri', 'note-for-note', 'exactly as played', 'as recorded']) {
        expect(ink.includes(word), `${entry.id} claims to reproduce a recording`).toBe(false)
      }
    }
  })

  it('the technique is prose, not a jog: hints are under ~8 words, these are not', () => {
    for (const entry of RIFFS) {
      for (const paragraph of entry.technique) {
        expect(paragraph.split(' ').length, `${entry.id}`).toBeGreaterThan(8)
      }
    }
  })
})

/**
 * §5A/#603. **Two entries on one progression**, and the arithmetic they share.
 *
 * `i VI iv I IV v` in F# minor, two bars a chord, is the cycle both `blade-runner-blues-lead`
 * and `muse-runner-floating-arrival-lead` carry whole. The chord windows are the same on both,
 * so they are computed once here rather than restated in each suite.
 */
const SIX_CHORDS = ['i', 'VI', 'iv', 'I', 'IV', 'v'] as const
const SIX_CHORD_STEPS = 12 * STEPS_PER_BAR

/** The cycle step a chord begins on: `i` 1, `VI` 33, and so on. */
function chordStart(chord: string): number {
  return SIX_CHORDS.indexOf(chord as (typeof SIX_CHORDS)[number]) * 2 * STEPS_PER_BAR + 1
}

/** The first note over each chord of the cycle, in cycle order. */
function entries(riff: Riff): HookNote[] {
  const seen = new Set<string>()
  const out: HookNote[] = []
  for (const note of riff.hook.notes) {
    const chord = chordAtStep(riff, note.step)
    if (chord === undefined || seen.has(chord)) continue
    seen.add(chord)
    out.push(note)
  }
  return out
}

/**
 * §5A.2. Every step the grid strikes across the hook, with the grid repeated beneath a longer
 * line. The riff page prints the grid once and the reader plays it round; this is that reading
 * as arithmetic, so a test can hold a twelve-bar hook to a four-bar grid.
 */
function gridStrikes(riff: Riff): number[] {
  const grid = gridOf(riff)
  const passes = (riff.hook.bars * STEPS_PER_BAR) / grid.length
  const out: number[] = []
  for (let pass = 0; pass < passes; pass += 1) {
    for (const hit of grid.hits) out.push(hit.step + pass * grid.length)
  }
  return out
}

/**
 * §5A/§4.1/#603. **The six-note skeleton**: one arrival per chord over the whole cycle, with the
 * two over the borrowed pair raised. The first published version carried three notes over two
 * chords, cut to that on the claim that a riff's grid capped the figure at four bars. The grid
 * is capped; the hook is not, and the grid repeats beneath it (§5A.2).
 */
describe('the Blade Runner Blues lead (§5A/§4.1/#603)', () => {
  const riff = bladeRunnerBluesLead
  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
  const notes = resolved.hook.notes

  it('carries the whole six-chord cycle from bar 1, one note per chord', () => {
    const harmony = riff.harmony
    if (harmony === undefined) throw new Error('the entry carries no harmony')
    expect(harmony.cycleBars).toBe(12)
    expect(harmony.progression.map((p) => p.degree)).toEqual([...SIX_CHORDS])
    expect(harmony.progression.every((p) => p.bars === 2)).toBe(true)
    expect(riff.figureStartsAtBar).toBe(1)
    expect(riff.hook.bars).toBe(12)
    expect(riff.hook.notes).toHaveLength(6)
    expect(riff.hook.notes.map((n) => chordAtStep(riff, n.step))).toEqual([...SIX_CHORDS])
  })

  it('raises the third over the I and the sixth over the IV, and nothing else', () => {
    expect(riff.hook.notes.map((n) => n.alter)).toEqual([
      undefined,
      undefined,
      undefined,
      1,
      1,
      undefined,
    ])
    // The fifth, the tonic, the sixth, the raised third, the raised sixth, the second: each is a
    // tone of the chord under it, and the two raised ones are the major thirds of the borrowed
    // pair.
    expect(riff.hook.notes.map((n) => n.degree)).toEqual([5, 1, 6, 3, 6, 2])
  })

  it('spells the six as chord tones, which is what says the raised pair are not passing notes', () => {
    // `A#` is the third of F# major and `D#` the third of B. A reader shown `Bb` and `Eb` would
    // be being taught chromaticism instead, which is the reason `alter` displaces a degree (§4.1).
    expect(notes.map((n) => n.note)).toEqual(['C#5', 'F#5', 'D5', 'A#4', 'D#5', 'G#4'])
    expect(notes.map((n) => n.midi)).toEqual([73, 78, 74, 70, 75, 68])
  })

  it('enters a beat into the first chord of each pair and two beats into the second', () => {
    expect(riff.hook.notes.map((n) => n.step)).toEqual([5, 41, 69, 105, 133, 169])
    expect(riff.hook.notes.map((n) => n.step - chordStart(chordAtStep(riff, n.step) ?? '')))
      .toEqual([4, 8, 4, 8, 4, 8])
    expect(riff.constraints?.onsetOffset?.minSteps).toBe(4)
  })

  it('strikes each arrival once across three passes of the grid, and nothing else', () => {
    // A four-bar grid under a twelve-bar line: steps 5 and 41 on each pass are the six onsets
    // and no held note is struck through.
    expect(gridOf(riff).length).toBe(64)
    expect(gridOf(riff).hits.map((h) => h.step)).toEqual([5, 41])
    expect(gridStrikes(riff)).toEqual(riff.hook.notes.map((n) => n.step))
  })

  it('hangs every note over the change, except the D that clears before the I', () => {
    const ends = notes.map((n) => n.step + n.len - 1)
    // Two steps past each chord's last step, so the chords blur into each other.
    expect(ends).toEqual([34, 66, 96, 130, 162, 194])
    // The `iv` ends at step 96 and the `D5` with it: the raised third arrives over nothing.
    expect(ends[2]).toBe(chordStart('I') - 1)
    // The `G#4` runs past the cycle into the next pass.
    expect(ends[5]).toBeGreaterThan(SIX_CHORD_STEPS)
    expect(riff.technique.some((p) => p.includes('arrives on air'))).toBe(true)
  })

  it('says one note per chord in prose, and forbids the natural third and sixth as data', () => {
    expect(riff.technique.some((p) => p.includes('one note each'))).toBe(true)
    expect(riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])).toEqual([
      ['I', 3, undefined],
      ['IV', 6, undefined],
    ])
    expect(riffConstraintViolations(riff)).toEqual([])
  })
})

/**
 * §5A/#552. **The figure checked against the chords it is actually over**, which is the class of
 * defect that shipped: a four-bar figure printed under a twelve-bar table with nothing saying
 * where it starts, so the raised third read as sitting over the minor chord.
 *
 * These are alignment tests rather than content tests. They would each have failed the first
 * published version, and they fail again the moment the note steps or the progression move
 * apart. Now that the figure is the whole cycle from bar 1 the offset is the trivial one, and the
 * tests hold anyway, because the arithmetic is the same whether the offset is 1 or 7.
 */
describe('the Blade Runner Blues lead lines up with its chords (#552)', () => {
  const riff = bladeRunnerBluesLead
  const { harmony } = riff
  if (harmony === undefined) throw new Error('the entry carries no harmony')
  const cycle = harmony

  /** The degree sounding at a figure step, resolved through the offset. */
  function chordAt(step: number): string {
    const cycleBar = (riff.figureStartsAtBar ?? 1) + Math.floor((step - 1) / STEPS_PER_BAR)
    let bar = 1
    for (const chord of cycle.progression) {
      if (cycleBar >= bar && cycleBar < bar + chord.bars) return chord.degree
      bar += chord.bars
    }
    throw new Error(`step ${String(step)} falls outside the cycle`)
  }

  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
  const notes = resolved.hook.notes

  it('puts every note over the chord it was written for', () => {
    // The two raised notes are the major thirds of the two borrowed chords. Over anything else
    // they are the wrong note, and over the `i` a raised third is the collision this figure is
    // about avoiding.
    expect(notes.map((n) => [n.note, chordAt(n.step)])).toEqual([
      ['C#5', 'i'],
      ['F#5', 'VI'],
      ['D5', 'iv'],
      ['A#4', 'I'],
      ['D#5', 'IV'],
      ['G#4', 'v'],
    ])
  })

  it('never sounds the key’s own third under the I, or its sixth under the IV', () => {
    // Checked across each note's whole span rather than at its onset: a note that holds into the
    // next chord is sounding over it, and the natural third against the raised one is the same
    // collision arriving a beat later.
    const FORBIDDEN: Record<string, string> = { I: 'A', IV: 'D' }
    for (const note of notes) {
      const pitchClass = note.note.replace(/[0-9-]/g, '')
      for (let step = note.step; step < note.step + note.len; step += 1) {
        if (step > riff.hook.bars * STEPS_PER_BAR) break
        expect(
          FORBIDDEN[chordAt(step)],
          `${note.note} sounding at step ${String(step)} over ${chordAt(step)}`,
        ).not.toBe(pitchClass)
      }
    }
  })

  it('enters every chord late, and never on the bar the chord starts', () => {
    // The technique's second paragraph, as an assertion. A note that is not the first of its
    // chord is a continuation and is exempt: it is not an entry.
    const seen = new Set<string>()
    for (const note of riff.hook.notes) {
      const degree = chordAt(note.step)
      if (seen.has(degree)) continue
      seen.add(degree)
      const offsetInBar = (note.step - 1) % STEPS_PER_BAR
      const barsIntoChord = Math.floor((note.step - 1) / STEPS_PER_BAR) % 2
      expect(
        barsIntoChord * STEPS_PER_BAR + offsetInBar,
        `${degree} is entered at step ${String(note.step)}`,
      ).toBeGreaterThanOrEqual(4)
    }
  })

  it('reconciles the bar arithmetic, so the table and the figure cannot drift apart', () => {
    const summed = cycle.progression.reduce((n, chord) => n + chord.bars, 0)
    expect(summed).toBe(cycle.cycleBars)
    const start = riff.figureStartsAtBar ?? 1
    expect(start + riff.hook.bars - 1).toBeLessThanOrEqual(cycle.cycleBars)
  })

  it('emits six entries and no continuation, one per chord', () => {
    // The first version said "both notes" over a list of three. Now every note is an entry and
    // the prose says so; a seventh note would be a continuation the technique does not describe.
    expect(entries(riff)).toHaveLength(6)
    expect(entries(riff)).toEqual(riff.hook.notes)
  })
})

/**
 * §5A.5/#566/#603. **The one entry named after a factory patch**, carrying the operator's own
 * line: thirteen notes over the six-chord cycle, one late entry per chord and a contour inside
 * each. The first version was three notes over four bars of a different cycle, and the reason
 * given was the false one #603 removed.
 */
describe('the Muse Runner floating-arrival lead (§5A.5/#566/#603)', () => {
  const riff = museRunnerFloatingArrivalLead
  const { harmony } = riff
  if (harmony === undefined) throw new Error('the entry carries no harmony')
  const cycle = harmony

  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
  const notes = resolved.hook.notes

  it('is named after a patch, in the title and in the slug', () => {
    expect(riff.reference).toEqual({ kind: 'patch', name: 'Muse Runner' })
    expect(riff.name).toBe('The Muse Runner floating-arrival lead')
    expect(riff.id).toBe('muse-runner-floating-arrival-lead')
    expect(RiffSchema.safeParse(riff).success).toBe(true)
  })

  it('carries the whole twelve-bar cycle from bar 1, in F# minor', () => {
    expect(riff.key).toBe('F# minor')
    expect(cycle.cycleBars).toBe(12)
    expect(cycle.progression.map((p) => p.degree)).toEqual([...SIX_CHORDS])
    expect(cycle.progression.every((p) => p.bars === 2)).toBe(true)
    expect(riff.figureStartsAtBar).toBe(1)
    expect(riff.hook.bars).toBe(12)
  })

  it('resolves to the thirteen notes the operator wrote', () => {
    // The table in #603, pitch for pitch. The corrected count is thirteen: the `Bm` row is
    // *hold, neighbour C#5 back to D5*, three notes, and the issue's sentence said twelve.
    expect(notes.map((n) => n.note)).toEqual([
      'C#5', 'A4',
      'F#5', 'E5', 'D5',
      'D5', 'C#5', 'D5',
      'A#4',
      'D#5', 'F#5',
      'G#4', 'E4',
    ])
    expect(notes.map((n) => n.midi)).toEqual([
      73, 69, 78, 76, 74, 74, 73, 74, 70, 75, 78, 68, 64,
    ])
    expect(riff.hook.notes.map((n) => n.alter)).toEqual([
      undefined, undefined,
      undefined, undefined, undefined,
      undefined, undefined, undefined,
      1,
      1, undefined,
      undefined, undefined,
    ])
  })

  it('puts every note over the chord it was written for', () => {
    expect(notes.map((n) => [n.note, chordAtStep(riff, n.step)])).toEqual([
      ['C#5', 'i'], ['A4', 'i'],
      ['F#5', 'VI'], ['E5', 'VI'], ['D5', 'VI'],
      ['D5', 'iv'], ['C#5', 'iv'], ['D5', 'iv'],
      ['A#4', 'I'],
      ['D#5', 'IV'], ['F#5', 'IV'],
      ['G#4', 'v'], ['E4', 'v'],
    ])
  })

  it('resolves the E below the G#, which needs the octave down', () => {
    // Degree 7 at octave 0 is `E5`, above the tonic; the operator's line resolves *down* a
    // major third from `G#4`, so the note carries `octave: -1`.
    const last = riff.hook.notes.at(-1)
    expect(last).toEqual({ step: 185, degree: 7, octave: -1, len: 10 })
    const [g, e] = notes.slice(-2)
    if (g === undefined || e === undefined) throw new Error('two notes expected')
    expect(e.midi).toBeLessThan(g.midi)
    expect(g.midi - e.midi).toBe(4)
  })

  it('offers the unresolved G# as the other ending, in prose and not as a fourteenth note', () => {
    // *"or leave it on G# unresolved"* is an alternative reading of the last note. A hook holds
    // one figure, so the alternative is technique (#603).
    expect(riff.hook.notes).toHaveLength(13)
    expect(riff.technique.some((p) => p.includes('on the G# unresolved'))).toBe(true)
  })

  it('carries the definition’s own tempo window (#569)', () => {
    expect(riff.bpm).toEqual({ min: 58, max: 78, default: 66 })
  })

  it('enters every chord two beats late, and the grid strikes those six and nothing else', () => {
    expect(riff.constraints?.onsetOffset?.minSteps).toBe(8)
    const arrivals = entries(riff).map((n) => n.step)
    expect(arrivals).toEqual([9, 41, 73, 105, 137, 169])
    for (const step of arrivals) expect(step - chordStart(chordAtStep(riff, step) ?? '')).toBe(8)
    // A four-bar grid under a twelve-bar line, three passes: steps 9 and 41 of each are the
    // six arrivals. The seven moves inside a chord have no strike, because they are slurred
    // (§5A.2).
    expect(gridOf(riff).length).toBe(64)
    expect(gridOf(riff).hits.map((h) => h.step)).toEqual([9, 41])
    expect(gridStrikes(riff)).toEqual(arrivals)
    expect(riff.technique.some((p) => p.includes('slurred, not struck'))).toBe(true)
  })

  it('hangs each chord’s last note over the change, except into the I', () => {
    const lastOf = (chord: string): number => {
      const over = notes.filter((n) => chordAtStep(riff, n.step) === chord)
      const last = over.at(-1)
      if (last === undefined) throw new Error(chord)
      return last.step + last.len - 1
    }
    expect(SIX_CHORDS.map(lastOf)).toEqual([34, 66, 96, 130, 162, 194])
    // The `D5` closing the `iv` stops on the chord's last step: the raised third arrives on air.
    expect(lastOf('iv')).toBe(chordStart('I') - 1)
    expect(riff.technique.some((p) => p.includes('arrives on air'))).toBe(true)
  })

  it('is one voice: no note overlaps the next', () => {
    expect(riff.request.polyphony).toBeUndefined()
    for (let i = 1; i < riff.hook.notes.length; i += 1) {
      const prev = riff.hook.notes[i - 1]
      const next = riff.hook.notes[i]
      if (prev === undefined || next === undefined) throw new Error('unreachable')
      expect(next.step, `note ${String(i)} at step ${String(next.step)}`).toBeGreaterThan(
        prev.step + prev.len - 1,
      )
    }
  })

  it('forbids the natural third over the I and the natural sixth over the IV, as data', () => {
    expect(riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])).toEqual([
      ['I', 3, undefined],
      ['IV', 6, undefined],
    ])
    expect(riffConstraintViolations(riff)).toEqual([])
  })

  it('catches a natural A played over the I, and refuses to parse it', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) =>
          n.step === 105 ? { step: 105, degree: 3, octave: 0, len: 26 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('A4 sounds over I')
    expect(found[0]).toContain('the turn collapsing')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches a natural D played over the IV, and refuses to parse it', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) =>
          n.step === 137 ? { step: 137, degree: 6, octave: 0, len: 12 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('D5 sounds over IV')
    expect(found[0]).toContain('cancels the chord')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches an entry on the change, which the offset forbids', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) => (n.step === 41 ? { ...n, step: 33 } : n)),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('VI is entered at step 33, 0 steps in')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })
})

/**
 * §5A/#603. **Two entries on one progression have to be two figures**, or one of them should
 * not exist. This is the argument, as assertions: the Blade Runner line is exactly the six
 * arrivals of the Muse Runner line, and nothing else it does is shared.
 */
describe('the two F# minor entries are distinguishable by more than their titles (#603)', () => {
  const blade = bladeRunnerBluesLead
  const muse = museRunnerFloatingArrivalLead
  const spelt = (riff: Riff): string[] => {
    const r = resolveHook(riff.hook, riff.key)
    if (r.outcome !== 'resolved') throw new Error(r.detail)
    return r.hook.notes.map((n) => n.note)
  }

  it('share the key and the cycle, whole and from bar 1', () => {
    expect(blade.key).toBe(muse.key)
    expect(blade.harmony).toEqual(muse.harmony)
    expect(blade.figureStartsAtBar).toBe(1)
    expect(muse.figureStartsAtBar).toBe(1)
    expect(blade.hook.bars).toBe(12)
    expect(muse.hook.bars).toBe(12)
  })

  it('Blade Runner is the six arrivals of the Muse Runner line, pitch for pitch', () => {
    const museArrivals = entries(muse).map((n) => spelt(muse)[muse.hook.notes.indexOf(n)])
    expect(spelt(blade)).toEqual(museArrivals)
    expect(blade.hook.notes).toHaveLength(6)
    expect(muse.hook.notes).toHaveLength(13)
  })

  it('enter on different beats: Blade alternates one and two, Muse is always two', () => {
    const into = (riff: Riff): number[] =>
      entries(riff).map((n) => n.step - chordStart(chordAtStep(riff, n.step) ?? ''))
    expect(into(blade)).toEqual([4, 8, 4, 8, 4, 8])
    expect(into(muse)).toEqual([8, 8, 8, 8, 8, 8])
    expect(gridOf(blade).hits.map((h) => h.step)).toEqual([5, 41])
    expect(gridOf(muse).hits.map((h) => h.step)).toEqual([9, 41])
  })

  it('share no paragraph of technique', () => {
    const shared = blade.technique.filter((p) => muse.technique.includes(p))
    expect(shared).toEqual([])
  })

  it('say what the other one is for, in the docstring rather than on the page', () => {
    // The page is for a reader at the machine; which entry to go to next is the index's job.
    for (const riff of [blade, muse]) {
      for (const p of riff.technique) {
        expect(p, riff.id).not.toContain('Muse Runner')
        expect(p, riff.id).not.toContain('Blade Runner')
      }
    }
  })
})

/**
 * §5A/#554. **The rules, as data and as a gate.**
 *
 * #552 caught a figure whose prose forbade a collision while its notes had stopped keeping it, and
 * fixed it with checks written by hand for that one entry. These are the same checks driven off
 * the entry's own declared rules, so the next riff gets them for nothing and a broken one does not
 * parse.
 *
 * The two negative cases are the two defects that were actually reported, reconstructed.
 */
describe('riff constraints are checked, not described (#554)', () => {
  it('finds nothing wrong with any shipped entry', () => {
    for (const entry of RIFFS) {
      expect(riffConstraintViolations(entry), entry.id).toEqual([])
    }
  })

  it('catches the natural third over the borrowed chord, which is the reported collision', () => {
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      hook: {
        ...bladeRunnerBluesLead.hook,
        notes: bladeRunnerBluesLead.hook.notes.map((n) =>
          n.step === 105 ? { step: 105, degree: 3, octave: 0, len: 26 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('A4 sounds over I')
    // The author's own reason is carried into the failure, so it is actionable without opening
    // the manifest to find out what the rule was for.
    expect(found[0]).toContain('the turn collapsing')
    // And it is a build failure rather than a report.
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches an entry on the bar head, which is the timing the first version shipped', () => {
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      hook: {
        ...bladeRunnerBluesLead.hook,
        notes: bladeRunnerBluesLead.hook.notes.map((n) =>
          n.step === 133 ? { ...n, step: 129 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('IV is entered at step 129, 0 steps in')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('checks a held note across its whole span, not only where it starts', () => {
    // The collision arriving a beat late: legal at its onset, forbidden by the time it is still
    // sounding over the next chord. A rule checked at onset alone would pass this. The planted
    // rule is unaltered so that it reaches one chord (#605): the key's own fifth, over the `VI`.
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      constraints: {
        forbiddenDegrees: [{ chord: 'VI', degree: 5, reason: 'planted for this test' }],
      },
    }
    // `C#5` enters at step 5 over the `i` and is still sounding at step 33, where `VI` begins.
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('C#5 sounds over VI at step 33')
  })

  /**
   * #605. **The chords are checked too, and a raised or lowered degree reaches the whole piece.**
   *
   * The case that motivated it: the Phrygian figure forbade E natural over two chords and
   * carried a C major, `C · E · G`, as its fourth. The line never played an E, so the check
   * over the notes passed, and the page printed the chord beside the rule forbidding its third.
   */
  describe('a chord built on a forbidden pitch is a violation (#605)', () => {
    it('spells a degree of a key as a pitch class, and reads one back', () => {
      const e = spellDegree(2, 1, 'D phrygian')
      expect(e).toEqual({ outcome: 'resolved', pitchClass: 'E', semitone: 4 })
      const a = spellDegree(6, 1, 'C minor')
      expect(a).toEqual({ outcome: 'resolved', pitchClass: 'A', semitone: 9 })
      expect(spellDegree(3, undefined, 'F# minor')).toMatchObject({ pitchClass: 'A', semitone: 9 })
      expect(spellDegree(1, undefined, 'H minor').outcome).toBe('unresolved')
      // `E` and `Fb` are one pitch and two strings, which is why the comparison is numeric.
      expect(pitchClassOf('Fb')).toBe(4)
      expect(pitchClassOf('E')).toBe(4)
      expect(pitchClassOf('B#')).toBe(0)
      expect(pitchClassOf('Cb')).toBe(11)
      expect(pitchClassOf('Ebb')).toBe(2)
      expect(pitchClassOf('H')).toBeUndefined()
      expect(pitchClassOf('E4')).toBeUndefined()
    })

    it('catches the C major the Phrygian figure shipped with, on every rule that forbids its third', () => {
      // The entry as it was: `VII`, C major, with the raised second forbidden over `i` and `II`.
      const broken: Riff = {
        ...aegeanOrganPhrygianFigure,
        harmony: {
          cycleBars: 8,
          progression: [
            { degree: 'i', bars: 2 },
            { degree: 'II', bars: 2 },
            { degree: 'i', bars: 2 },
            { degree: 'VII', bars: 2 },
          ],
        },
      }
      const found = riffConstraintViolations(broken)
      // One sentence per rule the chord breaks, carrying its author's reason. The rule names the
      // `i` and reaches the `VII`, because a raised degree is a fact about the key.
      expect(found).toEqual([
        'VII is C · E · G, which has the E this riff forbids: the raised second destroys the flat second the mode rests on',
      ])
      // And it is a build failure rather than a report.
      expect(RiffSchema.safeParse(broken).success).toBe(false)
    })

    it('reaches a note over any chord too, once the pitch is one the key does not have', () => {
      // The C major restored and its E played over it: the line and the chord both break the rule.
      const broken: Riff = {
        ...aegeanOrganPhrygianFigure,
        harmony: {
          cycleBars: 8,
          progression: [
            { degree: 'i', bars: 2 },
            { degree: 'II', bars: 2 },
            { degree: 'i', bars: 2 },
            { degree: 'VII', bars: 2 },
          ],
        },
        hook: {
          ...aegeanOrganPhrygianFigure.hook,
          notes: aegeanOrganPhrygianFigure.hook.notes.map((n) =>
            n.step === 97 ? { ...n, alter: 1 } : n,
          ),
        },
      }
      const found = riffConstraintViolations(broken)
      expect(found).toHaveLength(2)
      expect(found.filter((f) => f.startsWith('E5 sounds over VII at step 97'))).toHaveLength(1)
      expect(found.filter((f) => f.startsWith('VII is C · E · G'))).toHaveLength(1)
    })

    it('names a chord once however often the cycle returns to it', () => {
      // The `i` is bars 1-2 and 5-6. A rule it breaks produces one sentence, since the chord is
      // one chord: forbidding the key's own third over it.
      const broken: Riff = {
        ...aegeanOrganPhrygianFigure,
        constraints: {
          forbiddenDegrees: [{ chord: 'i', degree: 3, reason: 'planted for this test' }],
        },
      }
      // The line opens on that F, which is its own sentence; the chord's is the one under test.
      const found = riffConstraintViolations(broken)
      expect(found.filter((f) => f.startsWith('i is'))).toEqual([
        'i is D · F · A, which has the F this riff forbids: planted for this test',
      ])
      expect(found.filter((f) => f.startsWith('F5 sounds over i at step 1'))).toHaveLength(1)
    })

    it('compares pitch classes, so a chord spelt one way meets a rule spelt another', () => {
      // `Fb` is degree 3 lowered in D phrygian, and C major's third is spelt `E`. The rule
      // reaches it because the two are one pitch.
      const broken: Riff = {
        ...aegeanOrganPhrygianFigure,
        constraints: {
          forbiddenDegrees: [{ chord: 'i', degree: 3, alter: -1, reason: 'planted for this test' }],
        },
        harmony: {
          cycleBars: 8,
          progression: [
            { degree: 'i', bars: 2 },
            { degree: 'II', bars: 2 },
            { degree: 'i', bars: 2 },
            { degree: 'VII', bars: 2 },
          ],
        },
      }
      const found = riffConstraintViolations(broken)
      expect(found).toEqual([
        'VII is C · E · G, which has the E, the Fb this riff forbids: planted for this test',
      ])
    })

    it('holds an unaltered rule to the one chord it names, and checks that chord', () => {
      // Blade Runner forbids the natural third over the borrowed `I`, and its `i` is built on
      // that third. The rule reaches the `I` alone, so the entry is clean, and a `I` re-spelt as
      // the minor `i` would be the chord the rule is about carrying the note it forbids.
      expect(riffConstraintViolations(bladeRunnerBluesLead)).toEqual([])
      const broken: Riff = {
        ...bladeRunnerBluesLead,
        constraints: {
          forbiddenDegrees: [{ chord: 'i', degree: 3, reason: 'planted for this test' }],
        },
      }
      const found = riffConstraintViolations(broken)
      expect(found).toEqual([
        'i is F# · A · C#, which has the A this riff forbids: planted for this test',
      ])
    })

    it('finds every shipped entry clean, which is the sixteen diatonic ones staying legal', () => {
      // The check that would have caught #605 must not fail the entries that were fine: a
      // global check of an unaltered rule would flag every `i` under Blade Runner's third.
      expect(RIFFS).toHaveLength(17)
      for (const entry of RIFFS) {
        expect(riffConstraintViolations(entry), entry.id).toEqual([])
      }
    })
  })

  it('refuses constraints that constrain nothing', () => {
    const empty = RiffConstraintsSchema.safeParse({})
    expect(empty.success).toBe(false)
    const noReason = ForbiddenDegreeSchema.safeParse({ chord: 'I', degree: 3, reason: '' })
    expect(noReason.success).toBe(false)
  })

  it('says the rules on the page, because a rule a reader cannot see is one they will break', () => {
    const lines = ruleLines(bladeRunnerBluesLead)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      'Over I, never the 3rd — the natural third against the raised one is the turn collapsing.',
    )
    expect(lines[2]).toContain('Enter each chord at least 4 steps after it lands')
  })

  it('says a raised or lowered degree is banned on every chord, and names the chord the reason is about (#605)', () => {
    const lines = ruleLines(aegeanOrganPhrygianFigure)
    // One rule and no offset (#604): the entries are on the beat, which the hook says.
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe(
      'Never the raised 2nd, on any chord — over i, the raised second destroys the flat second the mode rests on.',
    )
    // The reach the line states is the reach the check has: the same rule, global, catches a
    // chord the rule does not name.
    expect(riffConstraintViolations({
      ...aegeanOrganPhrygianFigure,
      harmony: {
        cycleBars: 8,
        progression: [
          { degree: 'i', bars: 2 },
          { degree: 'II', bars: 2 },
          { degree: 'i', bars: 2 },
          { degree: 'VII', bars: 2 },
        ],
      },
    })).toHaveLength(1)
  })
})

/**
 * §5A.5/#569. **The eleven entries that followed Muse Runner**, translated from one set of
 * definitions, and the two things a table can hold about every one of them.
 *
 * The first is the rules. Each entry declares its constraints as data (#554), and the table
 * below says, per entry, which rules it declares, that the shipped notes keep them, and that
 * one note in the wrong place is caught and refused. The negative case is built by *adding* a
 * note that sounds the forbidden degree over its chord, so the entry's own notes are untouched
 * and the one violation reported is the one the table expected. The onset case moves the
 * entry's first note onto the chord's first step.
 *
 * The second is what the translation had to decide, listed per entry below the table: which
 * shapes the schema has no field for and the figure keeps by construction.
 */
type ConstraintCase = {
  riff: Riff
  /** `[chord, degree, alter]` for every `forbiddenDegrees` rule, in authored order. */
  rules: readonly (readonly [string, number, number | undefined])[]
  /** `onsetOffset.minSteps`, where the entry states one. */
  onset?: number
  /**
   * One added note per rule, in the same order, and the opening of the sentence it produces.
   * `over` moves the figure where a rule's chord is not under it as shipped.
   */
  breaks: readonly { note: HookNote; says: string; over?: Partial<Riff>; count?: number }[]
  /** The first entry's step and the sentence moving it onto the chord's first step produces. */
  early?: { step: number; says: string }
}

const MUSE_ELEVEN: readonly ConstraintCase[] = [
  {
    riff: voxHumanaRigidColdPopLine,
    rules: [['V', 7, undefined]],
    breaks: [{ note: { step: 49, degree: 7, octave: -1, len: 8 }, says: 'G4 sounds over V' }],
  },
  {
    riff: hamamatsuTinesBalladFigure,
    rules: [['I', 4, undefined]],
    onset: 4,
    breaks: [{ note: { step: 5, degree: 4, octave: 1, len: 4 }, says: 'Ab5 sounds over I' }],
    early: { step: 5, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: seventiesElectroPnoRhodesTurnaround,
    rules: [['I', 4, undefined]],
    onset: 4,
    breaks: [{ note: { step: 5, degree: 4, octave: 1, len: 4 }, says: 'Bb5 sounds over I' }],
    early: { step: 5, says: 'I is entered at step 1, 0 steps in' },
  },
  // No forbidden degree: the definition's rule is *not until the suspension resolves*, which a
  // `ForbiddenDegree` cannot say without refusing the resolution. The entry's own suite below
  // checks the timing instead.
  {
    riff: moog55StringsSuspensionWriting,
    rules: [],
    onset: 8,
    breaks: [],
    early: { step: 9, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: detroitFunkAeolianMachineLoop,
    rules: [['i', 6, 1]],
    onset: 2,
    breaks: [
      { note: { step: 3, degree: 6, octave: 0, len: 4, alter: 1 }, says: 'A4 sounds over i' },
    ],
    early: { step: 3, says: 'i is entered at step 1, 0 steps in' },
  },
  {
    riff: aegeanOrganPhrygianFigure,
    rules: [['i', 2, 1]],
    // No offset: the operator's line enters on the beat (#604). The one rule forbids a pitch
    // the key does not have, so it reaches the whole piece (#605): a planted E over the `II`,
    // which the rule does not name, is caught as surely as one over the `i`.
    breaks: [
      { note: { step: 9, degree: 2, octave: 1, len: 4, alter: 1 }, says: 'E5 sounds over i' },
    ],
  },
  {
    riff: threeOscBassLoveRootOctaveFigure,
    rules: [['VI', 5, undefined]],
    breaks: [{ note: { step: 17, degree: 5, octave: -1, len: 4 }, says: 'E1 sounds over VI' }],
  },
  {
    riff: bellbounceSparseBellPattern,
    rules: [['I', 4, undefined]],
    onset: 8,
    breaks: [{ note: { step: 9, degree: 4, octave: 0, len: 4 }, says: 'D6 sounds over I' }],
    early: { step: 9, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: softOrchestraSlowChanges,
    rules: [['V', 7, undefined]],
    breaks: [{ note: { step: 113, degree: 7, octave: -1, len: 4 }, says: 'F4 sounds over V' }],
  },
  {
    riff: polyphonicPowerBrassStabCycle,
    rules: [['IV', 3, 1]],
    breaks: [
      { note: { step: 19, degree: 3, octave: 1, len: 4, alter: 1 }, says: 'A5 sounds over IV' },
    ],
  },
]

/** The entry with one more note in its hook, and otherwise the same. */
function withNote(riff: Riff, note: HookNote, over: Partial<Riff> = {}): Riff {
  const base = { ...riff, ...over }
  return { ...base, hook: { ...base.hook, notes: [...base.hook.notes, note] } }
}

describe('the eleven factory-patch entries keep their rules as data (#569, #554)', () => {
  it('covers every patch entry but Muse Runner, which has its own suite', () => {
    const covered = new Set(MUSE_ELEVEN.map((c) => c.riff.id))
    covered.add(moogProSoloGlideLead.id)
    covered.add(museRunnerFloatingArrivalLead.id)
    const patches = RIFFS.filter((r) => r.reference.kind === 'patch').map((r) => r.id)
    expect([...covered].sort()).toEqual([...patches].sort())
  })

  it('the glide lead states no rule, so it carries no constraints at all', () => {
    // A `constraints` that constrains nothing is refused by the schema; absence is the honest
    // shape for an entry whose definition forbade no pitch and asked for no offset.
    expect(moogProSoloGlideLead.constraints).toBeUndefined()
  })

  for (const c of MUSE_ELEVEN) {
    describe(c.riff.id, () => {
      it('declares exactly the rules the table lists, and the page prints each one', () => {
        const declared = c.riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])
        expect(declared ?? []).toEqual(c.rules.map((r) => [...r]))
        expect(c.riff.constraints?.onsetOffset?.minSteps).toBe(c.onset)
        expect(ruleLines(c.riff)).toHaveLength(c.rules.length + (c.onset === undefined ? 0 : 1))
      })

      it('keeps every rule as shipped, and parses', () => {
        expect(riffConstraintViolations(c.riff)).toEqual([])
        const parsed = RiffSchema.safeParse(c.riff)
        expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true)
      })

      it('every rule names a chord that is in the progression', () => {
        const chords = new Set(c.riff.harmony?.progression.map((p) => p.degree))
        for (const [chord] of c.rules) expect(chords.has(chord), chord).toBe(true)
      })

      for (const [i, b] of c.breaks.entries()) {
        it(`catches the forbidden ${c.rules[i]?.[0] ?? ''} note, and refuses to parse it`, () => {
          const broken = withNote(c.riff, b.note, b.over)
          const found = riffConstraintViolations(broken)
          // One sentence, unless the note breaks more than one rule (#605).
          expect(found).toHaveLength(b.count ?? 1)
          // The author's reason is carried into the message (#554).
          const reason = c.riff.constraints?.forbiddenDegrees?.[i]?.reason ?? 'x'
          expect(found.some((f) => f.includes(b.says) && f.includes(reason)), found.join('\n')).toBe(true)
          expect(RiffSchema.safeParse(broken).success).toBe(false)
        })
      }

      if (c.early !== undefined) {
        const early = c.early
        it('catches an entry on the chord change, which the offset forbids', () => {
          const broken: Riff = {
            ...c.riff,
            hook: {
              ...c.riff.hook,
              notes: c.riff.hook.notes.map((n) => (n.step === early.step ? { ...n, step: 1 } : n)),
            },
          }
          const found = riffConstraintViolations(broken)
          expect(found).toHaveLength(1)
          expect(found[0]).toContain(early.says)
          expect(RiffSchema.safeParse(broken).success).toBe(false)
        })
      }
    })
  }
})

/**
 * §5A.5/#569. **What the definitions asked for that no field carries**, kept by construction
 * and checked here: a register ceiling, a note count per bar, a never-on-a-beat grid, a line
 * with no overlaps, a sustain across a change. Each is the entry's technique in one assertion,
 * and each would let the prose drift from the notes if it were not written down.
 */
describe('the eleven keep what the schema cannot state (#569)', () => {
  /** The note in force at each step of the hook, or nothing. */
  function sounding(riff: Riff, step: number): HookNote[] {
    return riff.hook.notes.filter((n) => step >= n.step && step < n.step + n.len)
  }

  it('every entry asks for exactly as many simultaneous notes as its widest voicing', () => {
    for (const entry of RIFFS) {
      const atStep = new Map<number, number>()
      for (const n of entry.hook.notes) atStep.set(n.step, (atStep.get(n.step) ?? 0) + 1)
      const widest = Math.max(...atStep.values())
      expect(entry.request.polyphony ?? 1, entry.id).toBe(widest)
    }
  })

  it('every grid hit strikes a note that is in force at that step (RIFF_GRID_LEAD)', () => {
    // On every pass of the grid: a hook longer than its grid is played with the grid repeating
    // beneath it (§5A.2), so a hit is checked at every step it lands on across the hook, and the
    // hook has to be a whole number of passes for that reading to close.
    for (const entry of RIFFS) {
      // A held riff has no grid to check (§5A.2/#608); the schema holds it to that shape.
      if (entry.pattern === undefined) {
        expect(bearsPattern(entry.request.role), entry.id).toBe(false)
        continue
      }
      const hookSteps = entry.hook.bars * STEPS_PER_BAR
      expect(hookSteps % gridOf(entry).length, entry.id).toBe(0)
      for (const hit of gridOf(entry).hits) {
        for (let step = hit.step; step <= hookSteps; step += gridOf(entry).length) {
          expect(sounding(entry, step).length, `${entry.id} step ${String(step)}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('the held lines strike each note once, at its onset, and nothing else', () => {
    for (const entry of [
      voxHumanaRigidColdPopLine,
      hamamatsuTinesBalladFigure,
      seventiesElectroPnoRhodesTurnaround,
      moogProSoloGlideLead,
    ]) {
      const onsets = [...new Set(entry.hook.notes.map((n) => n.step))]
      expect(gridOf(entry).hits.map((h) => h.step), entry.id).toEqual(onsets)
    }
    // The Phrygian figure is not in that list: its grid repeats under an eight-bar hook and
    // strikes what recurs on both passes, with the other moves slurred (§5A.2). The two pads
    // are not either: a held riff has no grid at all (#608), and their own tests below hold
    // the onsets and the lengths instead.
  })

  it('the cold-pop line lands every note on a beat and none across a bar line', () => {
    for (const n of voxHumanaRigidColdPopLine.hook.notes) {
      expect((n.step - 1) % 4, `step ${String(n.step)}`).toBe(0)
      const startsIn = Math.floor((n.step - 1) / STEPS_PER_BAR)
      const endsIn = Math.floor((n.step + n.len - 2) / STEPS_PER_BAR)
      expect(endsIn, `step ${String(n.step)} crosses a bar line`).toBe(startsIn)
    }
  })

  it('the ballad figure ends on a suspension held across the bar line', () => {
    const last = hamamatsuTinesBalladFigure.hook.notes.at(-1)
    if (last === undefined) throw new Error('no notes')
    expect(chordAtStep(hamamatsuTinesBalladFigure, last.step)).toBe('V')
    expect(last.step + last.len).toBeGreaterThan(64)
    // And the resolution is prose, because it lands on the next pass's first step: see the entry.
    expect(hamamatsuTinesBalladFigure.technique.some((p) => p.includes('after the bar line'))).toBe(true)
  })

  it('the turnaround lands the flat ninth late and resolves it down', () => {
    const resolved = resolveHook(seventiesElectroPnoRhodesTurnaround.hook, 'F major')
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const overDominant = resolved.hook.notes.filter(
      (n) => chordAtStep(seventiesElectroPnoRhodesTurnaround, n.step) === 'VI',
    )
    expect(overDominant.map((n) => [n.note, n.step])).toEqual([
      ['Eb5', 57],
      ['D5', 61],
    ])
  })

  it('the suspension writing withholds each third for a bar and resolves in the second', () => {
    // The rule *not until the suspension resolves* is prose, because a `ForbiddenDegree` over
    // the chord would refuse the resolution itself. This is that rule, checked by timing: the
    // third of each chord (E over the `I`, A over the `IV`) first sounds in the chord's second
    // bar, and the suspension before it is a step below.
    const riff = moog55StringsSuspensionWriting
    expect(riff.constraints?.forbiddenDegrees).toBeUndefined()
    expect(riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual([
      ['I', 2],
      ['IV', 2],
      ['vi', 2],
      ['V', 2],
    ])
    const [d, e, g, a] = riff.hook.notes
    if (d === undefined || e === undefined || g === undefined || a === undefined) {
      throw new Error('six notes expected')
    }
    expect([e.degree, a.degree]).toEqual([3, 6])
    expect([e.degree, a.degree]).toEqual([d.degree + 1, g.degree + 1])
    for (const third of [e, a]) {
      const barIntoChord = Math.floor((third.step - 1) / STEPS_PER_BAR) % 2
      expect(barIntoChord, `step ${String(third.step)}`).toBe(1)
    }
    // And nothing sounds either third before its resolution.
    for (const n of riff.hook.notes) {
      if (n.step < e.step) expect(n.degree, `step ${String(n.step)}`).not.toBe(3)
      if (n.step >= e.step && n.step < a.step) expect(n.degree, `step ${String(n.step)}`).not.toBe(6)
    }
  })

  /**
   * §5A.2/#604/#608. **The suspension writing is the whole eight-bar cycle**, restored from the
   * four bars it was first published as, and since #608 a `pad` with no grid, as the definition
   * filed it. The pitches and lengths are exactly what #604 restored.
   */
  describe('the suspension writing covers its eight-bar cycle, as a pad with no grid (#604, #608)', () => {
    const riff = moog55StringsSuspensionWriting
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const notes = resolved.hook.notes
    const CHORDS = ['I', 'IV', 'vi', 'V'] as const
    /** The cycle step a chord begins on, two bars each: `I` 1, `IV` 33, `vi` 65, `V` 97. */
    const startOf = (chord: string): number =>
      CHORDS.indexOf(chord as (typeof CHORDS)[number]) * 2 * STEPS_PER_BAR + 1

    it('carries all eight bars from bar 1, in six notes', () => {
      expect(riff.figureStartsAtBar).toBe(1)
      expect(riff.harmony?.cycleBars).toBe(8)
      expect(riff.hook.bars).toBe(8)
      expect(riff.hook.notes).toHaveLength(6)
    })

    it('resolves to the definition’s pitches, each over the chord it was written for', () => {
      // `D5 E5` over the Csus2, `G5 A5` over the Fsus2, `B4` held over the Am7, `C5` held over
      // the G6sus4: the B and C are the second half that used to be prose.
      expect(notes.map((n) => [n.note, chordAtStep(riff, n.step)])).toEqual([
        ['D5', 'I'],
        ['E5', 'I'],
        ['G5', 'IV'],
        ['A5', 'IV'],
        ['B4', 'vi'],
        ['C5', 'V'],
      ])
      expect(notes.map((n) => n.midi)).toEqual([74, 76, 79, 81, 71, 72])
      // The B is a seventh below the A, the definition's own register, and a step below the C.
      const [a, b, c] = notes.slice(3)
      if (a === undefined || b === undefined || c === undefined) throw new Error('three notes expected')
      expect(a.midi - b.midi).toBe(10)
      expect(c.midi - b.midi).toBe(1)
    })

    it('enters every chord two beats late, the held notes included', () => {
      expect(riff.constraints?.onsetOffset?.minSteps).toBe(8)
      const arrivals = entries(riff).map((n) => n.step)
      expect(arrivals).toEqual([9, 41, 73, 105])
      for (const step of arrivals) expect(step - startOf(chordAtStep(riff, step) ?? '')).toBe(8)
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('is a pad with no grid and no flag, and keeps every pitch and length #604 restored', () => {
      expect(riff.request.role).toBe('pad')
      expect(riff.request.character).toBe('soft')
      expect(riff.hook.forRole).toBe('pad')
      expect(riff.pattern).toBeUndefined()
      expect(riff.request.reArticulatesHook).toBeUndefined()
      expect(RiffSchema.safeParse(riff).success).toBe(true)
      // The six notes, step for step and length for length, as #604 left them.
      expect(riff.hook.notes.map((n) => [n.step, n.degree, n.octave, n.len])).toEqual([
        [9, 2, 1, 16],
        [25, 3, 1, 16],
        [41, 5, 1, 16],
        [57, 6, 1, 16],
        [73, 7, 0, 32],
        [105, 1, 1, 24],
      ])
      // The resolutions are moves inside a hold and the technique still says so.
      expect(riff.technique.some((p) => p.includes('slurred, not struck'))).toBe(true)
    })

    it('sounds each note until the next, and the last to the end of the cycle', () => {
      // Derived, not authored: the definition fixes no lengths and the part is a pad over two-bar
      // chords, so a note sounds until the next one does. The technique says nothing about it,
      // and must not (#604).
      expect(riff.technique.join(' ')).not.toMatch(/until the next entry|holds .* past the change/)
      for (let i = 1; i < riff.hook.notes.length; i += 1) {
        const prev = riff.hook.notes[i - 1]
        const next = riff.hook.notes[i]
        if (prev === undefined || next === undefined) throw new Error('unreachable')
        expect(prev.step + prev.len, `note ${String(i)}`).toBe(next.step)
      }
      const last = riff.hook.notes.at(-1)
      if (last === undefined) throw new Error('no notes')
      expect(last.step + last.len - 1).toBe(8 * STEPS_PER_BAR)
      // One voice, so `polyphony` is absent and the resolved line never overlaps itself.
      expect(riff.request.polyphony).toBeUndefined()
      // Which puts each chord's last note over the change and the next chord's entry after it.
      const lastEnd = (chord: string): number => {
        const over = riff.hook.notes.filter((n) => chordAtStep(riff, n.step) === chord)
        const last = over.at(-1)
        if (last === undefined) throw new Error(chord)
        return last.step + last.len - 1
      }
      expect(CHORDS.map(lastEnd)).toEqual([40, 72, 104, 128])
    })
  })

  it('the machine loop never strikes on a beat, and enters every bar on the "and" of one', () => {
    const riff = detroitFunkAeolianMachineLoop
    for (const hit of gridOf(riff).hits) {
      expect((hit.step - 1) % 4, `step ${String(hit.step)} is on a beat`).not.toBe(0)
    }
    expect([...new Set(riff.hook.notes.map((n) => n.step))]).toEqual([3, 19, 35, 51])
    // Three notes at every entry, and the ninth of the key's tonic on top of the first.
    for (const step of [3, 19, 35, 51]) expect(sounding(riff, step)).toHaveLength(3)
  })

  it('the Phrygian figure is in a mode the engine reads, and never sounds E', () => {
    const riff = aegeanOrganPhrygianFigure
    expect(riff.key).toBe('D phrygian')
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    expect(resolved.hook.notes.map((n) => n.note)).toEqual([
      'F5', 'Eb5', 'G5', 'D5', 'Eb5', 'D5', 'Eb5', 'D5',
    ])
    expect(resolved.hook.notes.some((n) => n.note.startsWith('E5'))).toBe(false)
    // #605. The fourth chord is C minor: the operator's correction of a C major whose third was
    // the E the entry forbids. No note of the line is altered, and no chord carries an E.
    expect(riff.harmony?.progression.map((p) => p.degree)).toEqual(['i', 'II', 'i', 'vii'])
    expect(riff.hook.notes.every((n) => n.alter === undefined)).toBe(true)
    for (const chord of riff.harmony?.progression ?? []) {
      const spelt = spellChord(chord.degree, riff.key)
      if (spelt.outcome !== 'resolved') throw new Error(chord.degree)
      expect(spelt.chord.notes, chord.degree).not.toContain('E')
    }
    expect(riffConstraintViolations(riff)).toEqual([])
  })

  /**
   * §5A.2/#604. **The Phrygian figure is the operator's whole eight-bar line**, entering on the
   * beat, restored from the four late-entering bars it was first published as.
   */
  describe('the Phrygian figure covers its eight-bar cycle over a four-bar grid (#604)', () => {
    const riff = aegeanOrganPhrygianFigure
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const notes = resolved.hook.notes
    const CHORDS = ['i', 'II', 'i', 'vii'] as const
    const startOf = (index: number): number => index * 2 * STEPS_PER_BAR + 1

    it('carries all eight bars from bar 1, in eight notes', () => {
      expect(riff.figureStartsAtBar).toBe(1)
      expect(riff.harmony?.cycleBars).toBe(8)
      expect(riff.hook.bars).toBe(8)
      expect(riff.hook.notes).toHaveLength(8)
    })

    it('resolves to the operator’s pitches, each over the chord it was written for', () => {
      expect(notes.map((n) => [n.note, chordAtStep(riff, n.step)])).toEqual([
        ['F5', 'i'],
        ['Eb5', 'i'],
        ['G5', 'II'],
        ['D5', 'i'],
        ['Eb5', 'i'],
        ['D5', 'i'],
        ['Eb5', 'vii'],
        ['D5', 'vii'],
      ])
      expect(notes.map((n) => n.midi)).toEqual([77, 75, 79, 74, 75, 74, 75, 74])
    })

    it('enters every chord on the beat, and states no offset', () => {
      expect(riff.constraints?.onsetOffset).toBeUndefined()
      // The `i` comes round twice, so the arrivals are read off the chord windows: the first
      // note at or after each chord's first step is on that step.
      const arrivals = CHORDS.map((_, i) => riff.hook.notes.find((n) => n.step >= startOf(i))?.step)
      expect(arrivals).toEqual(CHORDS.map((_, i) => startOf(i)))
      expect(riff.hook.notes.map((n) => n.step)).toEqual([1, 17, 33, 65, 73, 81, 97, 121])
    })

    it('cuts the F short before the fall, holds the G for both bars, and runs the rest to the next note', () => {
      const [f, eb, g] = riff.hook.notes
      if (f === undefined || eb === undefined || g === undefined) throw new Error('three notes expected')
      // Released a beat before the Eb: the one length the operator fixes.
      expect(f.len).toBe(12)
      expect(f.step + f.len).toBeLessThan(eb.step)
      expect(g.len).toBe(2 * STEPS_PER_BAR)
      // Every other note sounds until the next, and the last to the end of the cycle.
      for (let i = 2; i < riff.hook.notes.length; i += 1) {
        const prev = riff.hook.notes[i - 1]
        const next = riff.hook.notes[i]
        if (prev === undefined || next === undefined) throw new Error('unreachable')
        expect(prev.step + prev.len, `note ${String(i)}`).toBe(next.step)
      }
      const last = riff.hook.notes.at(-1)
      if (last === undefined) throw new Error('no notes')
      expect(last.step + last.len - 1).toBe(8 * STEPS_PER_BAR)
      expect(riff.technique.some((p) => p.includes('Cut the F short'))).toBe(true)
    })

    it('strikes the four entries across two passes of the grid, and slurs every other move', () => {
      expect(gridOf(riff).length).toBe(64)
      expect(gridOf(riff).hits.map((h) => h.step)).toEqual([1, 33])
      expect(gridStrikes(riff)).toEqual([1, 33, 65, 97])
      expect(gridStrikes(riff)).toEqual(CHORDS.map((_, i) => startOf(i)))
      // The release before the Eb is in the hook, as the F's length: nothing sounds at 13-16.
      for (const step of [13, 14, 15, 16]) {
        expect(riff.hook.notes.some((n) => step >= n.step && step < n.step + n.len)).toBe(false)
      }
      expect(riff.technique.some((p) => p.includes('played off the held note'))).toBe(true)
    })

    it('says the left hand in prose, since harmony carries chord identity and not a voicing', () => {
      expect(riff.technique.some((p) => p.includes('root and fifth only'))).toBe(true)
      expect(riff.technique.some((p) => p.includes('on the beat'))).toBe(true)
      expect(riff.technique.some((p) => p.includes('never play E natural'))).toBe(true)
      expect(riff.technique.join(' ')).not.toMatch(/Bars 5 to 8|Enter late/)
    })
  })

  it('the glide lead never sounds two notes at once', () => {
    const notes = [...moogProSoloGlideLead.hook.notes].sort((a, b) => a.step - b.step)
    for (let i = 1; i < notes.length; i += 1) {
      const prev = notes[i - 1]
      const next = notes[i]
      if (prev === undefined || next === undefined) throw new Error('unreachable')
      expect(prev.step + prev.len, `step ${String(prev.step)} overlaps ${String(next.step)}`).toBeLessThanOrEqual(next.step)
    }
    // The passing flat five is the short one.
    const passing = moogProSoloGlideLead.hook.notes.find((n) => n.alter === -1)
    expect(passing?.len).toBe(2)
  })

  it('the bass figure stays below C3 and pumps every eighth', () => {
    const riff = threeOscBassLoveRootOctaveFigure
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    for (const n of resolved.hook.notes) expect(n.midi, n.note).toBeLessThanOrEqual(48)
    expect(Math.max(...resolved.hook.notes.map((n) => n.midi))).toBe(45)
    expect(gridOf(riff).hits.map((h) => h.step)).toEqual(
      Array.from({ length: 32 }, (_, i) => 2 * i + 1),
    )
    // Roots and octaves for three bars: every note in bars 1-3 is a root or its octave, except
    // the fifth in bar 3, and the walk-up is bar 4.
    const walk = riff.hook.notes.filter((n) => n.step > 48)
    expect(walk.map((n) => n.degree)).toEqual([7, 1, 2])
  })

  it('the bell pattern strikes at most twice a bar, across both passes of its grid', () => {
    const riff = bellbounceSparseBellPattern
    const strikes = gridStrikes(riff)
    for (let bar = 0; bar < riff.hook.bars; bar += 1) {
      const inBar = strikes.filter(
        (step) => step > bar * STEPS_PER_BAR && step <= (bar + 1) * STEPS_PER_BAR,
      )
      expect(inBar.length, `bar ${String(bar + 1)}`).toBeLessThanOrEqual(2)
    }
    expect(riff.request.role).toBe('arp')
  })

  /**
   * §5A.2/#604. **The bell pattern is the whole eight-bar cycle**, restored from the four bars
   * it was first published as, which struck each note twice a bar. The definition places one
   * entry a chord on beat three; the grid stays four bars and repeats, marking those entries.
   */
  describe('the bell pattern covers its eight-bar cycle over a four-bar grid (#604)', () => {
    const riff = bellbounceSparseBellPattern
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const notes = resolved.hook.notes
    const CHORDS = ['I', 'vi', 'IV', 'V'] as const
    /** The cycle step a chord begins on, two bars each: `I` 1, `vi` 33, `IV` 65, `V` 97. */
    const startOf = (chord: string): number =>
      CHORDS.indexOf(chord as (typeof CHORDS)[number]) * 2 * STEPS_PER_BAR + 1

    it('carries all eight bars from bar 1, in five notes', () => {
      expect(riff.figureStartsAtBar).toBe(1)
      expect(riff.harmony?.cycleBars).toBe(8)
      expect(riff.hook.bars).toBe(8)
      expect(riff.hook.notes).toHaveLength(5)
    })

    it('resolves to the definition’s pitches, each over the chord it was written for', () => {
      // `B5` over the Amaj7, `C#6` over the F#m7, `C#6` stepping down to `B5` over the Dmaj7,
      // `A5` over the E6sus4.
      expect(notes.map((n) => [n.note, chordAtStep(riff, n.step)])).toEqual([
        ['B5', 'I'],
        ['C#6', 'vi'],
        ['C#6', 'IV'],
        ['B5', 'IV'],
        ['A5', 'V'],
      ])
      expect(notes.map((n) => n.midi)).toEqual([83, 85, 85, 83, 81])
    })

    it('enters every chord on beat three, and steps down on beat three of the IV’s second bar', () => {
      expect(riff.constraints?.onsetOffset?.minSteps).toBe(8)
      const arrivals = entries(riff).map((n) => n.step)
      expect(arrivals).toEqual([9, 41, 73, 105])
      for (const step of arrivals) expect(step - startOf(chordAtStep(riff, step) ?? '')).toBe(8)
      // The B over the `IV` is a continuation, a bar after the C#, on the same beat.
      expect(riff.hook.notes.map((n) => n.step)).toEqual([9, 41, 73, 89, 105])
      expect(89 - startOf('IV')).toBe(STEPS_PER_BAR + 8)
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('keeps every note one beat long, so the delay is what sustains it', () => {
      // The definition fixes no lengths; on this patch a strike is short and the delay is long.
      expect(riff.hook.notes.every((n) => n.len === 4)).toBe(true)
    })

    it('strikes the four entries across two passes of the grid, and not the step down', () => {
      expect(gridOf(riff).length).toBe(64)
      expect(gridOf(riff).hits.map((h) => h.step)).toEqual([9, 41])
      expect(gridStrikes(riff)).toEqual([9, 41, 73, 105])
      expect(gridStrikes(riff)).toEqual(entries(riff).map((n) => n.step))
      // The B at 89 is step 25 of the second pass, and nothing sounds at 25 on the first, so
      // the grid cannot mark it (§5A.2): it is in the hook alone.
      expect(riff.hook.notes.some((n) => 25 >= n.step && 25 < n.step + n.len)).toBe(false)
    })

    it('says nothing of two strikes a bar or of repeated notes', () => {
      const ink = riff.technique.join(' ')
      expect(ink).not.toMatch(/twice a bar|two strikes|struck twice|"and" of four/)
      expect(ink).toContain('Two notes a bar at most')
    })
  })

  /**
   * §5A.2/#604/#608. **The slow changes are the whole eight-bar cycle, and the tie is one note.**
   * The figure that forced #608: its lesson is a D held while the harmony moves under it, and no
   * four-bar grid could mark the later entries without striking that D again. As a `pad` with
   * no grid the D is one 88-step note, and the checks below are what *tied* means as data.
   */
  describe('the slow changes hold one D across the changes, as a pad with no grid (#608)', () => {
    const riff = softOrchestraSlowChanges
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const notes = resolved.hook.notes

    it('is a pad with no grid and no flag, from bar 1 of the cycle', () => {
      expect(riff.request.role).toBe('pad')
      expect(riff.request.character).toBe('soft')
      expect(riff.hook.forRole).toBe('pad')
      expect(riff.pattern).toBeUndefined()
      expect(riff.request.reArticulatesHook).toBeUndefined()
      expect(riff.figureStartsAtBar).toBe(1)
      expect(riff.harmony?.cycleBars).toBe(8)
      expect(riff.hook.bars).toBe(8)
      expect(RiffSchema.safeParse(riff).success).toBe(true)
      expect(riffConstraintViolations(riff)).toEqual([])
    })

    it('ties the D through the second chord and into the third: no onset at 33 or 65', () => {
      const onsets = riff.hook.notes.map((n) => n.step)
      expect(onsets).toEqual([1, 89, 105, 121])
      for (const change of [33, 65]) {
        expect(onsets, `an attack at step ${String(change)}`).not.toContain(change)
        expect(sounding(riff, change).map((n) => n.degree), `step ${String(change)}`).toEqual([5])
      }
      // One D, not three sharing a pitch.
      expect(riff.hook.notes.filter((n) => n.degree === 5)).toHaveLength(1)
    })

    it('puts every note over the chord it was written for', () => {
      expect(notes.map((n) => [n.note, chordAtStep(riff, n.step)])).toEqual([
        ['D5', 'i'],
        ['C5', 'iv'],
        ['G4', 'V'],
        ['F#4', 'V'],
      ])
      // And the D is still the note in force when the `VI` and the `iv` arrive.
      for (const step of [33, 65]) expect(sounding(riff, step).map((n) => n.degree)).toEqual([5])
    })

    it('sounds each note until the next, and the last to the end of the cycle', () => {
      expect(riff.hook.notes.map((n) => n.len)).toEqual([88, 16, 16, 8])
      for (let i = 1; i < riff.hook.notes.length; i += 1) {
        const prev = riff.hook.notes[i - 1]
        const next = riff.hook.notes[i]
        if (prev === undefined || next === undefined) throw new Error('unreachable')
        expect(prev.step + prev.len, `note ${String(i)}`).toBe(next.step)
      }
      const last = riff.hook.notes.at(-1)
      if (last === undefined) throw new Error('no notes')
      expect(last.step + last.len - 1).toBe(8 * STEPS_PER_BAR)
      // Derived, not authored, so the technique does not state a sustain rule (#604).
      expect(riff.technique.join(' ')).not.toMatch(
        /until the next|past the chord change|across the bar line|released/,
      )
    })

    it('moves late: the C on beat three of the iv’s second bar, the F# on beat three of the last', () => {
      const [, c, g, fSharp] = riff.hook.notes
      if (c === undefined || g === undefined || fSharp === undefined) throw new Error('four notes')
      expect(c.step).toBe(65 + STEPS_PER_BAR + 8)
      expect(g.step).toBe(97 + 8)
      expect(fSharp.step).toBe(97 + STEPS_PER_BAR + 8)
      expect(fSharp.alter).toBe(1)
    })
  })

  it('the brass cycle stabs off the beat for three bars and lands the fourth on the downbeat', () => {
    const riff = polyphonicPowerBrassStabCycle
    const early = gridOf(riff).hits.filter((h) => h.step <= 48)
    for (const hit of early) expect((hit.step - 1) % 4, `step ${String(hit.step)}`).not.toBe(0)
    expect(gridOf(riff).hits.filter((h) => h.step > 48).map((h) => h.step)).toEqual([49])
    // Two notes per stab for three bars, one held note in the fourth.
    for (const step of [3, 19, 35]) expect(sounding(riff, step)).toHaveLength(2)
    expect(sounding(riff, 49)).toHaveLength(1)
    expect(sounding(riff, 64)).toHaveLength(1)
  })

  it('the two pad definitions are pads at soft, with no grid, as they were filed (#608)', () => {
    // Both landed as `lead` while `RiffSchema` refused a held role. That was the workaround for a
    // rule, not a reading of the music, and the rule is gone.
    for (const entry of [moog55StringsSuspensionWriting, softOrchestraSlowChanges]) {
      expect(entry.request.role, entry.id).toBe('pad')
      expect(entry.request.character, entry.id).toBe('soft')
      expect(entry.pattern, entry.id).toBeUndefined()
      expect(entry.request.reArticulatesHook, entry.id).toBeUndefined()
    }
  })
})

/**
 * §5A.5/#569. **The translated notes are the operator's notes.** The definitions arrived as
 * absolute pitches (`E5`, `G#4`, `Bb4`) over absolute chords; the entries carry degrees over
 * numerals. Nothing above proves the round trip, so this table does: for every entry, the key,
 * the tempo it is written at, the root-only progression with its bar counts, and the complete
 * pitch sequence the hook resolves to, typed from the definitions and not from the code.
 *
 * Simultaneous notes are joined with `+`, bottom to top, so a voicing reads as one entry. Where
 * the definition's top note sits on a voicing this library added under it, the row says so;
 * where an eight-bar cycle is longer than the grid and the figure is four bars of it, the row
 * says which four and the pitches are those four bars' alone.
 */
type FidelityRow = {
  riff: Riff
  key: string
  bpm: number
  progression: readonly (readonly [string, number])[]
  /** Step order; `+` joins notes at one step, bottom to top. */
  pitches: readonly string[]
}

const FIDELITY: readonly FidelityRow[] = [
  {
    riff: voxHumanaRigidColdPopLine,
    key: 'A minor',
    bpm: 116,
    progression: [['i', 1], ['VI', 1], ['iv', 1], ['V', 1]],
    pitches: ['E5', 'E5', 'D5', 'D5', 'G#4', 'A4', 'G#4'],
  },
  {
    riff: hamamatsuTinesBalladFigure,
    key: 'Eb major',
    bpm: 72,
    progression: [['I', 1], ['vi', 1], ['ii', 1], ['V', 1]],
    // The definition's last gesture is Eb5 resolving to D5 after the bar line; the D lands on
    // the next pass and is prose, so the hook ends on the Eb.
    pitches: ['F5', 'Eb5', 'D5', 'C5', 'D5', 'Eb5'],
  },
  {
    riff: seventiesElectroPnoRhodesTurnaround,
    key: 'F major',
    bpm: 88,
    progression: [['I', 1], ['ii', 1], ['iii', 1], ['VI', 1]],
    pitches: ['G5', 'G5', 'F5', 'Eb5', 'E5', 'Eb5', 'D5'],
  },
  {
    riff: moog55StringsSuspensionWriting,
    key: 'C major',
    bpm: 60,
    progression: [['I', 2], ['IV', 2], ['vi', 2], ['V', 2]],
    // The whole eight bars: the two suspensions resolving, then the held B4 and C5 of the
    // definition's second half, which were prose until #604 (§5A.2).
    pitches: ['D5', 'E5', 'G5', 'A5', 'B4', 'C5'],
  },
  {
    riff: detroitFunkAeolianMachineLoop,
    key: 'C minor',
    bpm: 128,
    progression: [['i', 1], ['VI', 1], ['III', 1], ['iv', 1]],
    // The definition gave one note per chord: D5, C5, F5, Eb5. Each is the top of a three-note
    // voicing this library wrote under it.
    pitches: ['G4+Bb4+D5', 'G4+Bb4+C5', 'Bb4+D5+F5', 'G4+Bb4+Eb5'],
  },
  {
    riff: aegeanOrganPhrygianFigure,
    key: 'D phrygian',
    bpm: 76,
    progression: [['i', 2], ['II', 2], ['i', 2], ['vii', 2]],
    // The operator's whole eight bars (#604): the fall over the first `i`, the held G over the
    // `II`, the neighbour figure over the second `i`, and Eb falling to D over the C minor (#605).
    pitches: ['F5', 'Eb5', 'G5', 'D5', 'Eb5', 'D5', 'Eb5', 'D5'],
  },
  {
    riff: moogProSoloGlideLead,
    key: 'E minor',
    bpm: 104,
    progression: [['i', 1], ['VI', 1], ['VII', 1], ['i', 1]],
    pitches: ['E4', 'G4', 'A4', 'Bb4', 'B4', 'D5', 'C5', 'B4'],
  },
  {
    riff: threeOscBassLoveRootOctaveFigure,
    key: 'A minor',
    bpm: 112,
    progression: [['i', 1], ['VI', 1], ['III', 1], ['VII', 1]],
    pitches: ['A1', 'A2', 'F1', 'F2', 'C2', 'G2', 'G1', 'A1', 'B1'],
  },
  {
    riff: bellbounceSparseBellPattern,
    key: 'A major',
    bpm: 96,
    progression: [['I', 2], ['vi', 2], ['IV', 2], ['V', 2]],
    // The whole eight bars, one note a chord on beat three and the step down over the `IV`:
    // the second half was prose until #604 (§5A.2).
    pitches: ['B5', 'C#6', 'C#6', 'B5', 'A5'],
  },
  {
    riff: softOrchestraSlowChanges,
    key: 'G minor',
    bpm: 64,
    progression: [['i', 2], ['VI', 2], ['iv', 2], ['V', 2]],
    // The whole eight bars. The definition writes the D5 three times, once a chord, and ties
    // it: one note held across the `i`, the `VI` and into the `iv`, then the two moves.
    pitches: ['D5', 'C5', 'G4', 'F#4'],
  },
  {
    riff: polyphonicPowerBrassStabCycle,
    key: 'F minor',
    bpm: 108,
    progression: [['i', 1], ['IV', 1], ['VII', 1], ['v', 1]],
    // The definition's pairs, bottom to top: it wrote the third as `G5, D5`, the same two notes.
    pitches: ['Ab4+C5', 'D5+Ab5', 'D5+G5', 'Eb5'],
  },
]

describe('the eleven resolve to the pitches the definitions asked for (#569)', () => {
  it('covers every entry but the six that were here before', () => {
    const covered = FIDELITY.map((r) => r.riff.id).sort()
    const eleven = RIFFS.filter(
      (r) => r.reference.kind === 'patch' && r.id !== museRunnerFloatingArrivalLead.id,
    )
      .map((r) => r.id)
      .sort()
    expect(covered).toEqual(eleven)
  })

  for (const row of FIDELITY) {
    it(`${row.riff.id}: ${row.key} at ${String(row.bpm)}, ${row.pitches.join(' ')}`, () => {
      expect(row.riff.key).toBe(row.key)
      expect(row.riff.bpm.default).toBe(row.bpm)
      expect(row.riff.harmony?.progression.map((p) => [p.degree, p.bars])).toEqual(
        row.progression.map((p) => [...p]),
      )
      const resolved = resolveHook(row.riff.hook, row.riff.key)
      if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
      // Group by step in authored order, which is bottom to top for every voicing here.
      const byStep = new Map<number, string[]>()
      for (const n of resolved.hook.notes) {
        const at = byStep.get(n.step)
        if (at === undefined) byStep.set(n.step, [n.note])
        else at.push(n.note)
      }
      const sequence = [...byStep.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, notes]) => notes.join('+'))
      expect(sequence).toEqual([...row.pitches])
      // Bottom to top is a claim about pitch, so it is checked as one.
      for (const notes of byStep.values()) {
        const midi = notes.map((name) => resolved.hook.notes.find((n) => n.note === name)?.midi ?? 0)
        expect([...midi].sort((a, b) => a - b)).toEqual(midi)
      }
    })
  }
})
