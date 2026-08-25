/**
 * §7.1. The assignment objective is a comparison vector compared lexicographically, not a
 * weighted sum. There is no exchange rate between "the kick is missing" and "the Deluge is
 * idle", so any scalar weights would be unfalsifiable numbers tuned by feel.
 *
 * Read the vector as an order of concerns, because that is what it is: never miss a required
 * part; then do not over-subscribe a box; then fill the optional parts; then voice a chord for
 * real rather than from a sample; then voice it on one voice rather than across several; then
 * prefer exact recipes over substituted ones; then prefer voices whose author listed the role
 * first; then avoid leaving a box switched on and unused.
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
  /**
   * §12.4. Requests needing more than one note that were filled by a `sampled-chord` recipe
   * rather than a real polyphonic voice. A chord sample is a fill, not a gap — it is the right
   * notes, and it transposes, so it follows a progression perfectly well. What it cannot do is
   * change *shape*: no re-voicing, no inversion, no altering one note of the chord and no
   * quality it was not recorded with. That is still a limit on what the part can *do*, and it
   * outranks character, which only approximates how it sounds.
   */
  sampledChords: number,
  /**
   * §12.4/#40. Requests needing more than one note that were filled by **stacking** several
   * monophonic voices of one pool, one note each, rather than by a voice that sounds the whole
   * chord itself. Ranked *below* `sampledChords`, so a stack is the preferred compromise of the
   * two, and *below* `crowdOverflow`, which is where the stack's real cost is charged.
   *
   * The order between the two compromises is a musical claim and this is the argument for it: a
   * stack plays the voicing the hook authored, follows a progression through any change of
   * quality, and can be inverted or re-voiced, none of which a chord sample can do. What it
   * spends is voices, and `crowdOverflow` already prices those two keys above — so charging the
   * stack again here would be pricing one cost twice, and preferring the sample would be paying
   * for shape it cannot deliver.
   *
   * A one-note request is never charged: there is no chord to spread, and no stack is built.
   */
  stackedChords: number,
  /** Sum of §3.4 distances, x1000 and rounded to an integer. */
  recipeDistance: number,
  /** Sum of the role's index within `voice.roles`. */
  roleFitPenalty: number,
  /** Devices with zero occupied assignables. */
  idleDevices: number,
]
