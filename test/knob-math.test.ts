import { describe, expect, it } from 'vitest'
import {
  clampMood,
  COARSE_UNITS_PER_PX,
  dragValue,
  FINE_UNITS_PER_PX,
  MOOD_MAX,
  MOOD_MIN,
} from '../components/knob-math'

/**
 * Build step 8 (#10). §10 requires the mood knobs to be draggable *and* typed, with Shift for
 * fine adjustment. The typed path and the plain drag are both visible on screen; the Shift path
 * is not reproducible with automated pointer input, which is exactly why the arithmetic lives
 * in a module a test can call directly.
 */
describe('mood knob drag', () => {
  it('raises the value when dragged up and lowers it when dragged down', () => {
    expect(dragValue(50, 100, false)).toBe(90)
    expect(dragValue(50, -100, false)).toBe(10)
  })

  it('moves five times slower with Shift held', () => {
    const coarse = dragValue(50, 100, false) - 50
    const fine = dragValue(50, 100, true) - 50
    expect(fine).toBe(8)
    expect(coarse).toBe(5 * fine)
    expect(COARSE_UNITS_PER_PX).toBe(5 * FINE_UNITS_PER_PX)
  })

  it('still reaches every integer under Shift - fine means slower, not coarser', () => {
    const reached = new Set<number>()
    for (let px = 0; px <= 130; px++) reached.add(dragValue(40, px, true))
    for (let value = 40; value <= 50; value++) expect(reached.has(value)).toBe(true)
  })

  it('clamps at both ends rather than wrapping or overshooting', () => {
    expect(dragValue(90, 1000, false)).toBe(MOOD_MAX)
    expect(dragValue(10, -1000, false)).toBe(MOOD_MIN)
    expect(clampMood(-1)).toBe(MOOD_MIN)
    expect(clampMood(101)).toBe(MOOD_MAX)
  })

  it('is anchored, not accumulated: a drag that returns to where it began restores the value', () => {
    const anchor = 37
    expect(dragValue(anchor, 63, false)).not.toBe(anchor)
    expect(dragValue(anchor, 0, false)).toBe(anchor)
    expect(dragValue(anchor, 0, true)).toBe(anchor)
  })

  it('produces integers, which is all MoodState carries', () => {
    for (const px of [1, 3, 7, 13, 97]) {
      expect(Number.isInteger(dragValue(50, px, true))).toBe(true)
      expect(Number.isInteger(dragValue(50, px, false))).toBe(true)
    }
  })
})
