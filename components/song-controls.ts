import { BPM_MAX, BPM_MIN, parseKey } from '@/lib/core'

/**
 * The decisions behind #161's Song panel, kept out of the component so they can be tested
 * without a DOM — the same split `knob-math.ts` makes, and for the same reason: which of these
 * affordances is on screen is a rule, and a rule is worth a test where a screenshot is not.
 *
 * Nothing here decides anything musical. Every value that survives these functions still goes
 * through `withBpm`/`withKey` and then `checkGuideInputs`; this is the layer that decides what a
 * control may *offer*, not what the engine will accept.
 */

/** The select's escape hatch. Not a key any grammar in `parseKey` can produce. */
export const OTHER_KEY = '__other__'

/**
 * Whether a tempo slider can be shown honestly.
 *
 * Two ways it cannot. A **degenerate** range has nothing to move within: §5 clamps `min`, `max`
 * and `default` together at `MIN_EFFECTIVE_BPM`, so a deep enough composed shift can leave a
 * slider able to produce only the value it already has. No pair this build ships reaches that —
 * the deepest composable shift is Reggae and Shuffle on `drone-study`, which holds the bottom at
 * the floor and leaves 20–44 — and the case is guarded rather than assumed absent, because what
 * produces it is the clamp rather than any particular pair. (`drone-study` under Reggae *and
 * Dancehall* would go deeper still and is not a case: §5.3 refuses that pair, both claiming the
 * kick.) And a value **outside** the range cannot be pointed at: the slider would either sit at
 * an end that is not where the value is, or snap the value back inside on first touch — undoing
 * a choice §5.6 exists to allow. The typed field is the control in both cases.
 */
export function tempoDraggable(
  range: { min: number; max: number } | undefined,
  value: number | undefined,
): boolean {
  if (range === undefined || value === undefined) return false
  if (range.min >= range.max) return false
  return value >= range.min && value <= range.max
}

/**
 * What the key select lists, in order, before `Other…`.
 *
 * A key the direction does not offer is prepended rather than dropped. Dropping it would leave
 * the select pointing at a key the guide is not in, which is the one thing a control showing
 * state must never do — and the case is reachable from any link (§5.6).
 */
export function keyOptions(keys: readonly string[], shown: string | undefined): string[] {
  if (shown === undefined || keys.includes(shown)) return [...keys]
  return [shown, ...keys]
}

/**
 * Which of the two key controls the panel shows.
 *
 * `'typed'` in three cases, and the third is the one that is easy to get wrong:
 *
 *  - the reader asked for it (`Other…`)
 *  - the direction authors one key, which is not a menu but a control that cannot do anything —
 *    so it drops to the typed field, which is `Other…` always reachable rather than taken away
 *  - **the override is a key this build cannot read.** A permalink or a stored studio may carry
 *    one (§5.6) and the guide resolves in the direction's own key instead. Offering it as a
 *    selected `<option>` would show the reader a key the guide is not in, which is exactly the
 *    lie a control showing state must not tell — and it would hide the text they need to see to
 *    fix it. The typed field shows the string, marks it invalid, and names the key in force.
 */
export function keyControl(
  keys: readonly string[],
  typing: boolean,
  override: string | undefined,
): 'list' | 'typed' {
  if (typing) return 'typed'
  if (keys.length <= 1) return 'typed'
  if (override !== undefined && commitKey(override) === undefined) return 'typed'
  return 'list'
}

/**
 * A typed tempo, or `undefined` for "not a value yet".
 *
 * **Never clamped.** Out of the 1–999 typo guard is not committed at all: clamping answers a
 * keypress with a number nobody typed, and mid-typing `7` on the way to `70` would land on 7 and
 * stay there. The field's own `min`/`max` mark it meanwhile.
 */
export function commitTempo(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const parsed = Number(raw)
  if (!Number.isInteger(parsed)) return undefined
  if (parsed < BPM_MIN || parsed > BPM_MAX) return undefined
  return parsed
}

/**
 * A typed key, or `undefined` for "not a key yet".
 *
 * Parse-gated, which is the asymmetry §5.6 records: a permalink *carries* a key this build
 * cannot read, because refusing there would cost a reader their whole guide, but there is no
 * reason to let a control create one.
 */
export function commitKey(raw: string): string | undefined {
  return parseKey(raw) === undefined ? undefined : raw
}
