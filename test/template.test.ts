import { describe, expect, it } from 'vitest'
import {
  HarmonySchema,
  HookNoteSchema,
  HookSchema,
  PatternHitSchema,
  PatternSchema,
  RoleRequestSchema,
  TemplateSchema,
  type Pattern,
  type RoleRequest,
} from '../lib/core/index'
import { template } from './fixtures'

function request(over: Partial<RoleRequest> = {}): RoleRequest {
  return {
    id: 'r-kick',
    role: 'kick',
    priority: 1,
    character: 'hard',
    sustain: 'continuous',
    ...over,
  }
}

function pattern(over: Partial<Pattern> = {}): Pattern {
  return {
    id: 'p-kick-b2',
    forRole: 'kick',
    band: 2,
    length: 16,
    hits: [
      { step: 1, slot: 'downbeat' },
      { step: 9, slot: 'downbeat' },
    ],
    ...over,
  }
}

describe('RoleRequest (§4)', () => {
  it('requires a stable id, because role is not identity', () => {
    // A template may legitimately request the same role twice - two toms, two stabs.
    expect(RoleRequestSchema.safeParse(request()).success).toBe(true)
    const { id: _id, ...withoutId } = request()
    expect(RoleRequestSchema.safeParse(withoutId).success).toBe(false)
    expect(RoleRequestSchema.safeParse(request({ id: '' })).success).toBe(false)
  })

  it('takes priority as a whole number from 1 up, ascending (§4.4)', () => {
    expect(RoleRequestSchema.safeParse(request({ priority: 1 })).success).toBe(true)
    expect(RoleRequestSchema.safeParse(request({ priority: 4 })).success).toBe(true)
    expect(RoleRequestSchema.safeParse(request({ priority: 0 })).success).toBe(false)
    expect(RoleRequestSchema.safeParse(request({ priority: -1 })).success).toBe(false)
    expect(RoleRequestSchema.safeParse(request({ priority: 1.5 })).success).toBe(false)
  })

  it('treats polyphony as a minimum note count (§12.4)', () => {
    expect(RoleRequestSchema.safeParse(request({ role: 'pad', polyphony: 3 })).success).toBe(true)
    expect(RoleRequestSchema.safeParse(request({ polyphony: 0 })).success).toBe(false)
    expect(RoleRequestSchema.safeParse(request({ polyphony: 2.5 })).success).toBe(false)
    // A number, not a device name - so it does not breach invariant 3.
    expect(RoleRequestSchema.safeParse(request({ polyphony: 'deluge' as never })).success).toBe(false)
  })

  it('carries optional and distinct as plain booleans, defaulting to absent (§4.4, §12.6)', () => {
    expect(RoleRequestSchema.safeParse(request({ optional: true })).success).toBe(true)
    expect(RoleRequestSchema.safeParse(request({ distinct: true })).success).toBe(true)
    expect(RoleRequestSchema.safeParse(request({ distinct: 'yes' as never })).success).toBe(false)
    const parsed = RoleRequestSchema.parse(request())
    expect(parsed.optional).toBeUndefined()
    expect(parsed.distinct).toBeUndefined()
  })

  it('makes a transient request name its sections and a continuous one not (§4.2)', () => {
    expect(
      RoleRequestSchema.safeParse(request({ role: 'riser', sustain: 'transient', sections: ['Build'] }))
        .success,
    ).toBe(true)
    // A transient request with no sections would occupy nothing at all.
    expect(RoleRequestSchema.safeParse(request({ role: 'riser', sustain: 'transient' })).success).toBe(
      false,
    )
    // A continuous request occupies every section by definition, so `sections` on one would
    // be silently ignored. Rejected rather than tolerated: see the review note in §4.2.
    expect(RoleRequestSchema.safeParse(request({ sections: ['Drop'] })).success).toBe(false)
  })

  it('rejects a sustain outside the union', () => {
    expect(RoleRequestSchema.safeParse(request({ sustain: 'sometimes' as never })).success).toBe(false)
  })
})

describe('Pattern (§4.3, §12.5)', () => {
  it('accepts an authored variant', () => {
    expect(PatternSchema.safeParse(pattern()).success).toBe(true)
  })

  it('admits exactly four density bands', () => {
    for (const band of [0, 1, 2, 3]) {
      expect(PatternSchema.safeParse(pattern({ band: band as 0 })).success).toBe(true)
    }
    expect(PatternSchema.safeParse(pattern({ band: 4 as never })).success).toBe(false)
    expect(PatternSchema.safeParse(pattern({ band: -1 as never })).success).toBe(false)
  })

  it('admits exactly three lengths', () => {
    expect(PatternSchema.safeParse(pattern({ length: 32 })).success).toBe(true)
    expect(PatternSchema.safeParse(pattern({ length: 64 })).success).toBe(true)
    expect(PatternSchema.safeParse(pattern({ length: 24 as never })).success).toBe(false)
  })

  it('keeps every hit inside the pattern, 1-based', () => {
    expect(PatternSchema.safeParse(pattern({ hits: [{ step: 16, slot: 'last-hit' }] })).success).toBe(
      true,
    )
    expect(PatternSchema.safeParse(pattern({ hits: [{ step: 17, slot: 'last-hit' }] })).success).toBe(
      false,
    )
    expect(PatternSchema.safeParse(pattern({ hits: [{ step: 0, slot: 'downbeat' }] })).success).toBe(
      false,
    )
    expect(
      PatternSchema.safeParse(pattern({ length: 32, hits: [{ step: 17, slot: 'offbeat' }] })).success,
    ).toBe(true)
  })

  it('lets one step carry two slots, and lets a variant be empty', () => {
    // Neither is ruled out by DESIGN.md: a step can be both the downbeat and an accent, and
    // a sparse band may legitimately author nothing.
    expect(
      PatternSchema.safeParse(
        pattern({
          hits: [
            { step: 1, slot: 'downbeat' },
            { step: 1, slot: 'accent' },
          ],
        }),
      ).success,
    ).toBe(true)
    expect(PatternSchema.safeParse(pattern({ hits: [] })).success).toBe(true)
  })

  it('addresses slots from the closed vocabulary and velocity as a whole number', () => {
    expect(PatternSchema.safeParse(pattern({ hits: [{ step: 1, slot: 'kick' as never }] })).success).toBe(
      false,
    )
    expect(
      PatternSchema.safeParse(pattern({ hits: [{ step: 1, slot: 'accent', velocity: 127 }] })).success,
    ).toBe(true)
    expect(
      PatternSchema.safeParse(pattern({ hits: [{ step: 1, slot: 'accent', velocity: 110.5 }] }))
        .success,
    ).toBe(false)
  })

  it('stays flat: no bar offset and no variant sequence (§12.5)', () => {
    // Fills are out of v1. An authored `offset` must fail rather than be silently dropped.
    expect(PatternSchema.safeParse({ ...pattern(), offset: 4 }).success).toBe(false)
    expect(PatternSchema.safeParse({ ...pattern(), variants: [] }).success).toBe(false)
  })
})

describe('Harmony and hooks (§4.1)', () => {
  it('authors a progression in bars against a cycle length', () => {
    expect(
      HarmonySchema.safeParse({
        cycleBars: 8,
        progression: [
          { degree: 'i', bars: 4 },
          { degree: 'VI', bars: 2 },
          { degree: 'VII', bars: 2 },
        ],
      }).success,
    ).toBe(true)
    // DESIGN.md never says the progression must fill the cycle, so a short one is legal data
    // and it is §11 step 5.5's business what to do with it.
    expect(
      HarmonySchema.safeParse({ cycleBars: 8, progression: [{ degree: 'i', bars: 4 }] }).success,
    ).toBe(true)
    expect(HarmonySchema.safeParse({ cycleBars: 0, progression: [] }).success).toBe(false)
  })

  it('takes a degree as an open non-empty string', () => {
    // DESIGN.md shows 'i', 'VI', 'VII' but never fixes the vocabulary, so sevenths and
    // borrowings stay authorable; only an empty or non-string degree is refused.
    for (const degree of ['i', 'VI', 'bVII', 'V7', '#iv']) {
      expect(HarmonySchema.safeParse({ cycleBars: 2, progression: [{ degree, bars: 2 }] }).success).toBe(
        true,
      )
    }
    expect(HarmonySchema.safeParse({ cycleBars: 2, progression: [{ degree: '', bars: 2 }] }).success).toBe(
      false,
    )
    expect(HarmonySchema.safeParse({ cycleBars: 2, progression: [{ degree: 5 as never, bars: 2 }] }).success).toBe(
      false,
    )
  })

  it('authors hooks as scale degrees against the key, never concrete notes', () => {
    const hook = { id: 'h1', forRole: 'lead', bars: 2, notes: [{ step: 1, degree: 5, octave: 0, len: 2 }] }
    expect(HookSchema.safeParse(hook).success).toBe(true)
    // A pitch name is not authorable here - degrees resolve against the chosen key (§4.1).
    expect(HookSchema.safeParse({ ...hook, notes: [{ step: 1, degree: 'C4', octave: 0, len: 2 }] }).success).toBe(
      false,
    )
    // DESIGN.md bounds neither the degree nor the octave, so a ninth stays authorable.
    expect(HookSchema.safeParse({ ...hook, notes: [{ step: 1, degree: 9, octave: -1, len: 2 }] }).success).toBe(
      true,
    )
    expect(HookSchema.safeParse({ ...hook, notes: [{ step: 1, degree: 5, octave: 0, len: 0 }] }).success).toBe(
      false,
    )
    expect(HookSchema.safeParse({ ...hook, forRole: 'melody' }).success).toBe(false)
  })
})

describe('Template (§4)', () => {
  it('accepts the authored shape', () => {
    expect(TemplateSchema.safeParse(template()).success).toBe(true)
  })

  it('never names a device (invariant 3)', () => {
    expect(TemplateSchema.safeParse({ ...template(), devices: ['roland-tr-1000'] }).success).toBe(false)
  })

  it('keeps bpm.default inside [min, max]', () => {
    expect(TemplateSchema.safeParse(template({ bpm: { min: 130, max: 142, default: 150 } })).success).toBe(
      false,
    )
    expect(TemplateSchema.safeParse(template({ bpm: { min: 142, max: 130, default: 134 } })).success).toBe(
      false,
    )
  })

  it('takes keys as open non-empty strings', () => {
    // DESIGN.md fixes no key format; modes beyond major/minor stay authorable for §11 step 5.5.
    expect(TemplateSchema.safeParse(template({ keys: ['A# major', 'Bb minor'] })).success).toBe(true)
    expect(TemplateSchema.safeParse(template({ keys: ['F dorian'] })).success).toBe(true)
    expect(TemplateSchema.safeParse(template({ keys: [''] })).success).toBe(false)
  })

  it('requires unique section names, request ids, hook ids and pattern ids', () => {
    const t = template()
    expect(
      TemplateSchema.safeParse(
        template({ structure: [...t.structure, { name: 'Drop', bars: 8, energy: 0.5 }] }),
      ).success,
    ).toBe(false)
    expect(TemplateSchema.safeParse(template({ roles: [...t.roles, t.roles[0]!] })).success).toBe(false)
    expect(TemplateSchema.safeParse(template({ hooks: [...t.hooks, t.hooks[0]!] })).success).toBe(false)
    expect(TemplateSchema.safeParse(template({ patterns: [...t.patterns, t.patterns[0]!] })).success).toBe(
      false,
    )
  })

  it('rejects a request or pattern naming a section the structure does not have', () => {
    expect(
      TemplateSchema.safeParse(
        template({
          roles: [{ id: 'r-riser', role: 'riser', priority: 4, character: 'bright', sustain: 'transient', sections: ['Breakdown'] }],
        }),
      ).success,
    ).toBe(false)
    expect(
      TemplateSchema.safeParse(template({ patterns: [pattern({ sections: ['Breakdown'] })] })).success,
    ).toBe(false)
    expect(
      TemplateSchema.safeParse(template({ patterns: [pattern({ sections: ['Drop'] })] })).success,
    ).toBe(true)
  })

  it('lets two requests share a role, distinguished by id and by distinct (§12.6)', () => {
    const twoToms = template({
      roles: [
        { id: 'r-tom-1', role: 'tom', priority: 3, character: 'dark', sustain: 'continuous', distinct: true },
        { id: 'r-tom-2', role: 'tom', priority: 3, character: 'dark', sustain: 'continuous', distinct: true },
      ],
    })
    expect(TemplateSchema.safeParse(twoToms).success).toBe(true)
  })

  it('accepts a template with no patterns and no hooks', () => {
    // §4.1 and §6.3: the guide omits what nobody authored rather than inventing it.
    expect(TemplateSchema.safeParse(template({ patterns: [], hooks: [] })).success).toBe(true)
  })
})

// --- Review findings: validation the schemas promised but did not enforce ---

describe('review: rules the comments claimed and the schema did not check', () => {
  it('rejects sections on a continuous request', () => {
    const r = RoleRequestSchema.safeParse({
      id: 'r1',
      role: 'kick',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
      sections: ['Build'],
    })
    expect(r.success).toBe(false)
  })

  it('still accepts a continuous request without sections', () => {
    const r = RoleRequestSchema.safeParse({
      id: 'r1',
      role: 'kick',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a template with no sections', () => {
    const t = TemplateSchema.safeParse({
      ...template(),
      structure: [],
    })
    expect(t.success).toBe(false)
  })

  it('rejects a template with no keys', () => {
    const t = TemplateSchema.safeParse({
      ...template(),
      keys: [],
    })
    expect(t.success).toBe(false)
  })

  it('bounds pattern-hit velocity to 1..127', () => {
    const base = { step: 1, slot: 'accent' as const }
    expect(PatternHitSchema.safeParse({ ...base, velocity: -5 }).success).toBe(false)
    expect(PatternHitSchema.safeParse({ ...base, velocity: 0 }).success).toBe(false)
    expect(PatternHitSchema.safeParse({ ...base, velocity: 9999 }).success).toBe(false)
    expect(PatternHitSchema.safeParse({ ...base, velocity: 110 }).success).toBe(true)
  })

  it('treats hook degrees as 1-based', () => {
    expect(HookNoteSchema.safeParse({ step: 1, degree: 0, octave: 0, len: 1 }).success).toBe(false)
    expect(HookNoteSchema.safeParse({ step: 1, degree: 1, octave: 0, len: 1 }).success).toBe(true)
    // Extensions stay legal: a ninth is degree 9.
    expect(HookNoteSchema.safeParse({ step: 1, degree: 9, octave: 0, len: 1 }).success).toBe(true)
  })
})
