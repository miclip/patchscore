import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  CHAR,
  CHARACTERS,
  CharacterSchema,
  MOOD_AXES,
  MoodAxisSchema,
  PATTERN_SLOTS,
  PatternSlotSchema,
  ROLES,
  RoleSchema,
  TRANSITIONAL_ROLES,
} from '../lib/core/index'

describe('closed vocabularies (invariant 3)', () => {
  it('holds exactly the roles DESIGN.md §1 lists', () => {
    // 23 roles x 6 characters = 138 recipe slots per device (§3.5). If this count moves,
    // that arithmetic and the recipe surface move with it.
    expect(ROLES).toHaveLength(23)
    expect(new Set(ROLES).size).toBe(ROLES.length)
    expect(ROLES).toContain('sub')
    expect(ROLES).toContain('bass-mid')
  })

  it('keeps sub and bass-mid as two separate roles (§12.1)', () => {
    expect(RoleSchema.safeParse('sub').success).toBe(true)
    expect(RoleSchema.safeParse('bass-mid').success).toBe(true)
    // Not one role plus a register modifier.
    expect(RoleSchema.safeParse('bass').success).toBe(false)
  })

  it('rejects anything outside each closed union', () => {
    expect(RoleSchema.safeParse('kick').success).toBe(true)
    expect(RoleSchema.safeParse('Kick').success).toBe(false)
    expect(RoleSchema.safeParse('cowbell').success).toBe(false)
    expect(RoleSchema.safeParse('').success).toBe(false)

    expect(CharacterSchema.safeParse('dirty').success).toBe(true)
    expect(CharacterSchema.safeParse('warm').success).toBe(false)

    expect(MoodAxisSchema.safeParse('swing').success).toBe(true)
    expect(MoodAxisSchema.safeParse('warmth').success).toBe(false)

    expect(PatternSlotSchema.safeParse('last-hit').success).toBe(true)
    expect(PatternSlotSchema.safeParse('step-13').success).toBe(false)
  })

  it('names the five mood axes and eight pattern slots', () => {
    expect([...MOOD_AXES]).toEqual(['darkness', 'density', 'grit', 'swing', 'space'])
    expect(PATTERN_SLOTS).toHaveLength(8)
    expect(new Set(PATTERN_SLOTS).size).toBe(PATTERN_SLOTS.length)
  })

  it('marks the three section-scoped roles (§4.2)', () => {
    expect([...TRANSITIONAL_ROLES]).toEqual(['riser', 'impact', 'sweep'])
    for (const role of TRANSITIONAL_ROLES) expect(ROLES).toContain(role)
  })
})

describe('CHAR (§3.4)', () => {
  it('gives every character a vector and no extras', () => {
    expect(Object.keys(CHAR).sort()).toEqual([...CHARACTERS].sort())
  })

  it('is a frozen literal, not a tunable table', () => {
    // §3.4's geometry is a fact about the vocabulary. A mutable export would let one caller
    // silently change what "orthogonal" means for every other reader of CHAR.
    expectTypeOf<(typeof CHAR)['hard']>().toEqualTypeOf<{
      readonly force: 1
      readonly tone: 0
      readonly grit: 0
    }>()
  })

  it('places the three opposed pairs on their own axis', () => {
    expect(CHAR.hard).toEqual({ force: 1, tone: 0, grit: 0 })
    expect(CHAR.soft).toEqual({ force: -1, tone: 0, grit: 0 })
    expect(CHAR.bright.tone).toBe(1)
    expect(CHAR.dark.tone).toBe(-1)
    expect(CHAR.clean.grit).toBe(-1)
    expect(CHAR.dirty.grit).toBe(1)
  })

  it('puts each opposed pair at opposite ends of one axis and zero on the others', () => {
    // This is the geometry §3.5's `d < 2` filter and §6.2's nearestCharacter both read: an
    // opposite is 2 away, an orthogonal substitution is sqrt(2). The distance function that
    // reads it belongs to the resolver (build step 3).
    const pairs: [string, string, keyof (typeof CHAR)['hard']][] = [
      ['hard', 'soft', 'force'],
      ['bright', 'dark', 'tone'],
      ['dirty', 'clean', 'grit'],
    ]
    for (const [a, b, axis] of pairs) {
      const va = CHAR[a as 'hard']
      const vb = CHAR[b as 'soft']
      expect(va[axis]).toBe(1)
      expect(vb[axis]).toBe(-1)
      for (const other of ['force', 'tone', 'grit'] as const) {
        if (other === axis) continue
        expect(va[other]).toBe(0)
        expect(vb[other]).toBe(0)
      }
    }
  })
})
