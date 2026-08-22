/**
 * §7.1. The assignment objective is a comparison vector compared lexicographically, not a
 * weighted sum. There is no exchange rate between "the kick is missing" and "the Deluge is
 * idle", so any scalar weights would be unfalsifiable numbers tuned by feel.
 *
 * Read the vector as an order of concerns, because that is what it is: never miss a required
 * part; then do not over-subscribe a box; then fill the optional parts; then prefer exact
 * recipes over substituted ones; then prefer voices whose author listed the role first; then
 * avoid leaving a box switched on and unused.
 *
 * Smaller is better; compare element by element, first difference decides. The comparison
 * itself, and the bounded search that uses it, are the resolver's (build step 3).
 *
 * Every component is an integer, so comparison is exact - no float summation and therefore no
 * cross-platform drift (invariant 6). `recipeDistance` is the only non-integer input and is
 * quantised to `round(d * 1000)` before it enters the vector.
 */
export type Score = [
  /** Keys 0..k: unfilled *required* requests at priority 1..k. */
  ...missesByPriority: number[],
  /** Sum over devices of `max(0, occupiedAssignables - comfortableVoices)`. */
  crowdOverflow: number,
  /** Unfilled requests marked `optional`. */
  optionalMisses: number,
  /** Sum of §3.4 distances, x1000 and rounded to an integer. */
  recipeDistance: number,
  /** Sum of the role's index within `voice.roles`. */
  roleFitPenalty: number,
  /** Devices with zero occupied assignables. */
  idleDevices: number,
]
