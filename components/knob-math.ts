/**
 * The arithmetic behind a mood knob's drag, kept out of the component so it can be tested
 * without a DOM. The interesting behaviour — Shift halving the rate by five, the clamp at both
 * ends, the rounding to the integer `MoodState` actually carries — is not something a
 * screenshot proves, and a pointer drag with a modifier held is not reproducible in CI.
 *
 * Nothing here is imported by the resolver, and nothing here decides anything musical.
 */

export const MOOD_MIN = 0
export const MOOD_MAX = 100

/** Units per pixel of vertical travel. ~250px sweeps the full range. */
export const COARSE_UNITS_PER_PX = 0.4
/** Shift: ~1250px for the full range, so a single unit is a deliberate ~12px move. */
export const FINE_UNITS_PER_PX = 0.08

export function clampMood(value: number): number {
  return value < MOOD_MIN ? MOOD_MIN : value > MOOD_MAX ? MOOD_MAX : value
}

/**
 * `travelPx` is positive upward, matching the screen: dragging up raises the value.
 *
 * Computed from the anchor rather than accumulated per event, so a drag that wanders and comes
 * back lands on the value it started from — an accumulate-and-round loop drifts instead.
 */
export function dragValue(anchorValue: number, travelPx: number, fine: boolean): number {
  const rate = fine ? FINE_UNITS_PER_PX : COARSE_UNITS_PER_PX
  return clampMood(Math.round(anchorValue + travelPx * rate))
}
