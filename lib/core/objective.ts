/**
 * §7.1. The assignment objective is a comparison vector compared lexicographically, not a
 * weighted sum. There is no exchange rate between "the kick is missing" and "the Deluge is
 * idle", so any scalar weights would be unfalsifiable numbers tuned by feel.
 *
 * Read the vector as an order of concerns, because that is what it is: never miss a required
 * part; then do not over-subscribe a box; then fill the optional parts; then let one voice
 * carry the part rather than spreading it over several; then voice a chord for real rather
 * than from a sample; then prefer exact recipes over substituted ones; then prefer voices whose
 * author listed the role first; then avoid leaving a box switched on and unused.
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
   * §12.4. Voices spent *beyond the first* on requests that had to be spread across several
   * voices to reach their note count — 0 for every part one voice carries, 2 for a triad
   * stacked over three monosynths, 1 for the same triad over a duophonic box and a mono one.
   *
   * Extra voices rather than a count of stacked requests, so that where a wider voice and a
   * narrower one could both contribute, the combination spending fewer voices wins. A stack is
   * never smaller than two, so this is also >= 1 for every stacked part and the "a real
   * polyphonic voice always beats a stack" ranking holds however the sizes fall.
   *
   * The members' *character* errors are not here — they are summed into `recipeDistance` like
   * any other recipe, because a cross-device stack resolves one recipe per voice and three
   * substituted patches are three substitutions. This key is only about voices spent.
   *
   * **Above `sampledChords`, and that is the decision §12.4 left open.** Both are compromises
   * against a single real polyphonic voice, and neither DESIGN nor the objective could rank
   * them before there was a mechanism to rank. The fixture that settles it is the Tracker pad:
   * `tm-pad-soft-chord` carries a triad on one track and, as §12.4 says in as many words,
   * "costs none of the box's three synth slots, a real advantage". Stacking is what §12.4
   * describes as "the answer for a role with **no chord sample authored**" — the fallback, not
   * the first choice. A stack can be re-voiced where a sample cannot, which is a real argument
   * the other way; it loses to the fact that the stack spends rig capacity every later request
   * then has to do without, and `crowdOverflow` only notices that once a box is past
   * comfortable.
   */
  stackedVoices: number,
  /**
   * §12.4. Requests needing more than one note that were filled by a `sampled-chord` recipe
   * rather than a real polyphonic voice. A chord sample is a fill, not a gap — it is the right
   * notes, and it transposes, so it follows a progression perfectly well. What it cannot do is
   * change *shape*: no re-voicing, no inversion, no altering one note of the chord and no
   * quality it was not recorded with. That is still a limit on what the part can *do*, and it
   * outranks character, which only approximates how it sounds.
   */
  sampledChords: number,
  /** Sum of §3.4 distances, x1000 and rounded to an integer. */
  recipeDistance: number,
  /** Sum of the role's index within `voice.roles`. */
  roleFitPenalty: number,
  /** Devices with zero occupied assignables. */
  idleDevices: number,
]
