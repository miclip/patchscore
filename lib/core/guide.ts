import type { Device } from './device'
/**
 * §8. The shape of the guide document, independent of how it is rendered.
 *
 * §8 specifies seven phases in one order for one reason — "the sequence reflects how a real
 * session unfolds at the machine. Do not reorder." — and that is a fact about the guide, not
 * about Markdown or about React. It lived in `render.ts` while there was only one renderer;
 * once there were two, housing it there made the web view a dependent of the Markdown renderer
 * rather than its sibling (#33), which is the wrong relationship between them.
 *
 * So this module holds what both renderers must agree about and neither one owns. It imports
 * nothing, which is the test of whether something belongs here: a shared contract that needs a
 * layer beneath it is not a contract, it is logic that has not been placed yet.
 */

/**
 * The phase order, and the contract. A renderer building sections, a UI building a table of
 * contents, and a test asserting the order all read this list — never a second copy of it.
 */
export const GUIDE_PHASES = [
  'Song',
  'Voice assignment',
  'Rig integration',
  'Hook',
  'Step programming',
  'Sound design',
  'Finishing',
] as const

export type GuidePhase = (typeof GUIDE_PHASES)[number]

// ---------------------------------------------------------------------------
// Sentences both renderers say identically (#82)
// ---------------------------------------------------------------------------

/**
 * §8/#82. **The sentences the Markdown guide and the page were writing twice, byte for byte.**
 *
 * Most of §8's prose is deliberately written once per renderer: one decision in `lib/core`, two
 * hand-written vocabularies around it, so the page can say a thing the way a page says it. That
 * is the standing rule and it is not what these were. `ioText` and `mixerText` were **identical
 * in both files, comments included**, held together by a test asserting they agree — which pins
 * the symptom while leaving two copies to edit.
 *
 * It cost something concrete: when `io.main` gained `'none'`, six consumers needed changing
 * across three files where the instruction named two, and the misses were in the copy nobody was
 * looking at.
 *
 * This file is the right home by its own precedent — it exists because §8's phase order was moved
 * out of `render.ts` when a second renderer appeared, on the same argument.
 */

/**
 * `String`, never `toLocaleString` (§7.2). Spelled out as a named function so that a later edit
 * reaching for thousands separators has to come through here and read this comment.
 */
export function num(value: number): string {
  return String(value)
}

/**
 * '1 part', '3 parts'. English only, and hard-coded: this is not internationalised.
 *
 * `plural` is for the words an -s does not pluralise. The two renderers had different versions of
 * this — the page's took a `plural` after '4 boxs' shipped for a while, the Markdown's never did —
 * so the Markdown side carried the same latent bug for any noun the rack counts. The page's is a
 * superset, so adopting it everywhere is source-compatible and fixes that without a call moving.
 */
export function count(n: number, singular: string, plural?: string): string {
  if (n === 1) return `${num(n)} ${singular}`
  return `${num(n)} ${plural ?? `${singular}s`}`
}

/** §2.3. What audio a box has, as one line. */
export function ioText(device: Device): string {
  const parts: string[] = []
  // §2.3: `main: 'none'` is a box with no audio bus at all. It may still have the other three,
  // so this is a missing entry in the list rather than a special case around it.
  if (device.io.main !== 'none') parts.push(`${device.io.main} main out`)
  if (device.io.individualOuts > 0) parts.push(count(device.io.individualOuts, 'individual out'))
  if (device.io.usbAudio) parts.push('USB audio')
  if (device.io.audioIn) parts.push('audio in')
  // Empty only when `main` is `none` and nothing else is declared either, because every other
  // value of `main` pushes. So this sentence means what it says rather than approximating it.
  if (parts.length === 0) return 'no audio I/O'
  return parts.join(' · ')
}

/** §2.3/§7.3. How a box's parts reach a mixer, as one line. */
export function mixerText(device: Device, parts: number): string {
  if (parts === 0) return 'no parts assigned; nothing to patch'
  const separable = Math.min(parts, device.io.individualOuts)
  const outs = count(device.io.individualOuts, 'individual out')
  if (separable === parts) return `${count(parts, 'part')}, ${outs}: one channel each`

  // Past here some part has to go somewhere other than its own jack, and both remaining
  // sentences name the main bus. A box with `main: 'none'` has no bus to name, so it is handled
  // before `main` is read rather than after — and `main` is then bound to a local the compiler
  // has narrowed, so a future value of the union cannot reach a template string by accident.
  //
  // This is not reachable by any device in the library today: a box with no audio path also has
  // no assignables, so `parts === 0` returns above. It is written for the first box that has
  // both, because "unreachable via an early return in a different function" is not a guarantee.
  if (device.io.main === 'none') {
    if (separable === 0) return `${count(parts, 'part')}, no audio output: nothing to patch`
    return (
      `${count(parts, 'part')}, ${outs}: ${num(separable)} on their own channels, ` +
      `the rest have no output`
    )
  }
  const main: 'mono' | 'stereo' = device.io.main
  if (separable === 0) {
    return `${count(parts, 'part')}, no individual outs: one ${main} channel for all`
  }
  return (
    `${count(parts, 'part')}, ${outs}: ${num(separable)} on their own channels, ` +
    `the rest summed to the ${main} out`
  )
}
