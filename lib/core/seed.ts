/**
 * §7.2. The one seeded-choice stream in the codebase.
 *
 * Two rules govern everything here and both fail silently rather than loudly when broken:
 * **no `Math.random`**, and **no float anywhere in the stream**. A numeric seed drives every
 * decision the design lets the seed make, and "reroll" is a change of seed and nothing else.
 *
 * These primitives lived inside `search.ts` while assignment tie-breaking was the only seeded
 * decision. §4.1 gives the seed a second one — which hook, and which key — and a second copy
 * of xorshift32 is exactly the kind of thing that drifts silently and reproduces on one
 * caller's machine only. So the stream is defined once, here, and imported.
 *
 * Every function is a pure function of `(items, seed)`: no hidden state, no ambient generator,
 * so a caller can never accidentally make its result depend on how many draws ran before it.
 */

/** FNV-1a over UTF-16 code units. No locale, no platform-dependent hashing. */
export function hash32(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * xorshift32, entirely in uint32 arithmetic. No float anywhere in the stream and no
 * `Math.random` (§7.2): a numeric seed drives every tie-break, and "reroll" changes the seed.
 */
export function nextUint32(state: number): number {
  let x = state >>> 0
  x ^= x << 13
  x >>>= 0
  x ^= x >>> 17
  x ^= x << 5
  return x >>> 0
}

/**
 * A seed salted with a label, so two independent choices driven by the same seed do not move in
 * lockstep. Without it, `keys[seed % 3]` and `hooks[seed % 3]` would agree on every reroll for
 * every template whose lists happen to be the same length — a correlation nobody authored.
 */
export function saltSeed(seed: number, label: string): number {
  return (hash32(label) ^ (seed >>> 0)) >>> 0
}

/**
 * §7.2: "The seed only permutes among *exactly equal* scores." Everything else has already
 * been ordered deterministically before this runs, so this permutes within a tied group only.
 *
 * The stream is seeded from the request id rather than from traversal history, so a node's
 * permutation does not depend on which branch reached it — the same seed gives the same
 * ordering whether it is reached by the exhaustive search or by the greedy fallback.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  if (items.length < 2) return items
  // xorshift32 has a fixed point at zero, so a seed that mixes to zero is nudged off it.
  let state = (seed >>> 0) === 0 ? 0x9e3779b9 : seed >>> 0
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    state = nextUint32(state)
    const j = state % (i + 1)
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}

/**
 * §4.1's "the seed picks among multiple authored hooks", and the same for §4's key list.
 *
 * One draw rather than a shuffle-and-take-first: the caller wants an element, not an order, and
 * a shuffle would make the answer depend on the length of a list the author may extend later.
 * Adding a fourth key should change which key a given seed picks — that is unavoidable — but it
 * must not also reshuffle every other seed's answer for reasons unrelated to the addition.
 *
 * `undefined` for an empty list, because "no keys authored" is data to report (invariant 5),
 * not an exception. The caller decides what to say about it.
 */
export function seededPick<T>(items: readonly T[], seed: number): T | undefined {
  if (items.length === 0) return undefined
  const state = (seed >>> 0) === 0 ? 0x9e3779b9 : seed >>> 0
  return items[nextUint32(state) % items.length] as T
}
