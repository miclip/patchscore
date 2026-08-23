import { describe, expectTypeOf, it } from 'vitest'
import type { Score } from '../lib/core/index'

/**
 * §7.1's vector is a type in build step 1. Its comparison and the bounded search that uses it
 * are the resolver's, so there is nothing to execute here - only the shape to pin down.
 */
describe('Score (§7.1)', () => {
  it('is a variadic miss prefix followed by exactly six fixed keys', () => {
    // No priority levels: the six tail keys alone are a valid vector.
    expectTypeOf<[number, number, number, number, number, number]>().toExtend<Score>()
    // Two priority levels.
    expectTypeOf<
      [number, number, number, number, number, number, number, number]
    >().toExtend<Score>()
    // Anything shorter than the tail cannot be a Score.
    expectTypeOf<[number, number]>().not.toExtend<Score>()
    expectTypeOf<[]>().not.toExtend<Score>()
  })

  it('is integers throughout, so comparison is exact (invariant 6)', () => {
    expectTypeOf<Score>().toExtend<number[]>()
    expectTypeOf<[string, number, number, number, number, number]>().not.toExtend<Score>()
  })
})
