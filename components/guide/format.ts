import type { Device } from '@/lib/core'
import type { DeviceId } from '@/lib/core'
import type { Cite, Provenance, ResolvedParam, ResolvedRange } from '@/lib/core'
import { sameCite } from '@/lib/core'
import type { Gap, ResolvedHook, ResolvedNote } from '@/lib/core'
import type { FxSource } from '@/lib/core'

/**
 * #33. The web guide's formatting, kept free of JSX so it can be tested directly.
 *
 * This is the *sibling* of `lib/core/render.ts`, not a stage after it: both read
 * `ResolveResult`, and neither reads the other's output. Where a content decision is shared
 * with the Markdown renderer — the three-over-three threshold on capable voices, the channel
 * plan derived from two declared numbers, `52 → 45` appearing exactly when mood moved a value —
 * the decision is restated here rather than imported, because everything in `render.ts` returns
 * Markdown-flavoured strings and a shared helper returning backticks would be a worse coupling
 * than a stated one. `test/guide-view.test.ts` asserts the two agree about the facts.
 *
 * No locale-dependent formatting (§7.2): no `toLocaleString`, no `Intl`, ever.
 */

/** `String`, never `toLocaleString` (§7.2). Named so an edit reaching for separators reads this. */
export function num(value: number): string {
  return String(value)
}

/**
 * '1 part', '3 parts'. English only, and hard-coded: this view is not internationalised.
 *
 * `plural` is for the words an -s does not pluralise. Every noun this page counts took the -s
 * until the rack started counting boxes, and '4 boxs' shipped for a while because the default
 * looked total and was not. Pass the plural when the word needs one.
 */
export function count(n: number, singular: string, plural?: string): string {
  if (n === 1) return `${num(n)} ${singular}`
  return `${num(n)} ${plural ?? `${singular}s`}`
}

/** 'manual — TR-1000 Reference Manual p.61'. `cite.kind` is rendered, never dropped (§3.2). */
export function citeText(cite: Cite): string {
  return `${cite.kind} — ${cite.source}`
}

/**
 * `0…100`, `-100…100`. An ellipsis rather than an en dash: most authored ranges in the library
 * are bipolar, and `-100–100` is unreadable in exactly the case the range exists to clarify.
 */
export function rangeText(range: ResolvedRange, unit: string | undefined): string {
  const suffix = unit === undefined ? '' : ` ${unit}`
  return `${num(range.min)}…${num(range.max)}${suffix}`
}

/**
 * §3.2's rendered value, split rather than concatenated so the two halves can be styled
 * differently: `from` is where mood started, `now` is what to dial. `from` is present exactly
 * when mood moved the value — which for a provisional point is still true and still shown.
 */
export type ValueParts = { from?: string; now: string }

export function valueParts(param: ResolvedParam): ValueParts {
  const now = typeof param.value === 'number' ? num(param.value) : param.value
  const { provenance } = param
  if (provenance.state === 'authored') return { now }
  return provenance.from === undefined ? { now } : { from: num(provenance.from), now }
}

/**
 * The citation lines for one provenance — identical to the Markdown sibling's, deliberately.
 *
 * Labelled halves, because they are two independent claims (§3.1): the point decides authority,
 * the range decides legality. An unlabelled pair reads as one claim stated twice.
 *
 * These are the evidence behind the mark, so they are not thinned out to save ink. "Where a
 * number came off the manual it is marked" has to be *true*, and what makes it checkable is the
 * citation sitting under it. A provisional point has no citation to give and gets none — that
 * absence is the honest rendering, not a hole to fill.
 */
export function citeLines(
  provenance: Provenance,
  range: ResolvedRange | undefined,
  hoisted?: Cite,
): string[] {
  const parts: string[] = []
  if (provenance.state !== 'provisional') parts.push(`value ${citeText(provenance.cite)}`)
  if (range !== undefined) {
    if (range.verified === false) {
      parts.push('range unverified — mood leaves this value alone')
    } else if (!sameCite(range.verified, hoisted)) {
      // The exception keeps its line. Hoisting removes repetition, never the outlier.
      parts.push(`range ${citeText(range.verified)}`)
    }
  }
  return parts
}


/**
 * A device's `hints` table is keyed lookup for articulation and free text for parameters. One
 * rule serves both: look the string up, fall back to the string itself. The fallback is not a
 * guess — an unmatched hint is already the literal jog its author wrote.
 */
export function hintText(device: Device | undefined, hint: string): string {
  return device?.hints?.[hint] ?? hint
}

// ---------------------------------------------------------------------------
// Phase 2 — advice
// ---------------------------------------------------------------------------

/**
 * The assignables that could have carried a part, grouped by device and summarised past three.
 *
 * A pool device contributes every one of its tracks, so an ungrouped list for a Deluge and a
 * Tracker Mini runs to forty-odd names — not a list anybody reads, and it buries the fact that
 * matters: *which boxes*. The threshold is where an enumeration stops being scannable.
 */
export function capableText(capable: Gap['capable'], deviceById: Map<DeviceId, Device>): string {
  const byDevice = new Map<DeviceId, string[]>()
  for (const a of capable) {
    const labels = byDevice.get(a.deviceId) ?? []
    labels.push(a.label)
    byDevice.set(a.deviceId, labels)
  }
  return [...byDevice]
    .map(([id, labels]) => {
      const name = deviceById.get(id)?.name ?? id
      if (labels.length > 3) return `${name} (${count(labels.length, 'voice')})`
      return `${name} ${labels.join('/')}`
    })
    .join(', ')
}

/**
 * §7.3, §12.4. The `polyphony` half of `no-capable-voice`, said in a way a reader can act on.
 *
 * The shortfall is stated rather than the fix, and it is measured off the rig rather than
 * assumed: "every voice here is monophonic" is the Tracker Mini case and is common, but a rig
 * whose pad voices top out at four notes is a different sentence and saying the monophonic one
 * would be false. The general form names the real ceiling.
 *
 * Written out by hand rather than imported from the Markdown renderer: the two share no code
 * path, so a sentence appears in both only because someone put it in both, in the same words.
 */
function polyphonyShortfall(notes: number, roleVoices: Gap['capable']): string {
  const ceiling = roleVoices.reduce((most, a) => Math.max(most, a.polyphony), 0)
  const short =
    ceiling <= 1
      ? 'every voice here is monophonic'
      : `the most any voice here can sound is ${count(ceiling, 'note')}`
  return `needs ${count(notes, 'note')} at once and ${short}`
}

/**
 * §7.3 as advice rather than as failure. A `no-recipe` gap naming the voice that could carry it
 * *is* advice; the same gap rendered as an error is discouraging and wrong (#33). Nothing here
 * invents an assignment to close the hole (invariant 5) — it says what would close it.
 */
export function adviceText(gap: Gap, deviceById: Map<DeviceId, Device>): string {
  if (gap.reason === 'no-room') return `no room (${gap.because}) — ${gap.detail}`
  if (gap.reason === 'no-capable-voice') {
    if (gap.because === 'no-such-role') return 'nothing in your rig plays this part'
    // §12.4: the rig *does* play this part, one note at a time. Told the sentence above, a
    // reader would go and buy a box they already own the equivalent of.
    return polyphonyShortfall(gap.notes, gap.roleVoices)
  }
  return `${capableText(gap.capable, deviceById)} could carry it — dial it by ear`
}

// ---------------------------------------------------------------------------
// Phase 3 — rig integration
// ---------------------------------------------------------------------------

export function ioText(device: Device): string {
  const parts = [`${device.io.main} main out`]
  if (device.io.individualOuts > 0) parts.push(count(device.io.individualOuts, 'individual out'))
  if (device.io.usbAudio) parts.push('USB audio')
  if (device.io.audioIn) parts.push('audio in')
  return parts.join(' · ')
}

/** `a`, `a and b`, `a, b and c`. Plain strings — the role lists are a component, not a string. */
export function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}

/**
 * The predicate of "this box processes audio", built only from what `lib/core/fx.ts` found the
 * device declaring. Restated from `lib/core/render.ts` exactly as `ioText` and `mixerText` are:
 * the *fact* that a box has effects is derived once, in `fx.ts`; the sentence is written twice.
 *
 * Panel labels are printed verbatim and in panel order — `MASTER FX` is what is silkscreened on
 * the box, and the point of naming it is that you can find it while standing there.
 */
export function fxText(source: FxSource, device: Device | undefined): string {
  const clauses: string[] = []
  let opening: string | undefined
  for (const evidence of source.evidence) {
    if (evidence.kind === 'unit') {
      const noun = evidence.deviceKind === 'fx-processor' ? 'an effects unit' : 'a mixer and recorder'
      opening = `is ${noun}${device === undefined ? '' : ` (${ioText(device)})`}`
    } else if (evidence.kind === 'panel') {
      clauses.push(`${andList(evidence.labels)} on the panel`)
    } else {
      clauses.push(`${andList(evidence.params)} in its recipes`)
    }
  }
  const carries = clauses.length === 0 ? undefined : `carries ${clauses.join(', and ')}`
  return [opening, carries].filter((part) => part !== undefined).join(', and ')
}

/**
 * The channel plan for one box, derived from the two declared numbers and nothing else. No
 * channel strip is invented for a device that cannot separate its parts.
 */
export function mixerText(device: Device, parts: number): string {
  if (parts === 0) return 'no parts assigned; nothing to patch'
  const separable = Math.min(parts, device.io.individualOuts)
  const outs = count(device.io.individualOuts, 'individual out')
  if (separable === parts) return `${count(parts, 'part')}, ${outs}: one channel each`
  if (separable === 0) {
    return `${count(parts, 'part')}, no individual outs: one ${device.io.main} channel for all`
  }
  return (
    `${count(parts, 'part')}, ${outs}: ${num(separable)} on their own channels, ` +
    `the rest summed to the ${device.io.main} out`
  )
}

// ---------------------------------------------------------------------------
// §12.4's count, recomputed for display
// ---------------------------------------------------------------------------

/** An assignable occupied in any section counts once, never once per section. */
export function occupiedCounts(assignments: { deviceId: DeviceId; assignable: { voiceId: string } }[]) {
  const byDevice = new Map<DeviceId, Set<string>>()
  for (const a of assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<string>()
    set.add(a.assignable.voiceId)
    byDevice.set(a.deviceId, set)
  }
  return new Map([...byDevice].map(([id, set]) => [id, set.size]))
}

// ---------------------------------------------------------------------------
// Phase 4 — hooks read as chords
// ---------------------------------------------------------------------------

/**
 * The grid: patterns are 16, 32 or 64 steps over 1, 2 or 4 bars, so a step is a sixteenth.
 * Hook steps are absolute across the whole hook and nothing in `Hook` restates the resolution,
 * so it is inferred here — and checked, not assumed: a hook whose steps run past `bars * 16`
 * was authored against a different grid, and gets no bar framing rather than a wrong one.
 */
export const STEPS_PER_BAR = 16

export function barOf(step: number): number {
  return Math.floor((step - 1) / STEPS_PER_BAR) + 1
}

export function gridFits(hook: ResolvedHook): boolean {
  return hook.notes.every((n) => n.step >= 1 && n.step <= hook.bars * STEPS_PER_BAR)
}

/**
 * `degree 1` is jargon dressed as data. A musician reads `root` and `3rd` instantly, and those
 * carry the harmonic function — the one thing the note name does not tell you.
 *
 * Ordinals, not `b7`: these are scale degrees within the key, so whether the 7th is flat is a
 * property of the mode, and this layer does not know the mode. `b7` would be right in A minor
 * and wrong in A major.
 */
export function degreeName(degree: number): string {
  if (degree === 1) return 'root'
  const tens = degree % 100
  if (tens >= 11 && tens <= 13) return `${num(degree)}th`
  const ones = degree % 10
  const suffix = ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'
  return `${num(degree)}${suffix}`
}

export type Chord = { step: number; notes: ResolvedNote[] }

/**
 * Notes sharing a step are one chord, and one row per note hides that: a stab playing four
 * triads was twelve rows that looked like twelve unrelated events, and on a phone it filled
 * the screen. Grouped, it is four rows and obviously an A minor triad three times.
 *
 * Grouped by step alone. Two notes at one step with different lengths are still one chord —
 * the lengths are listed rather than used to split it, because splitting would put half a
 * triad on each of two rows, which is the failure this exists to fix.
 */
export function chordsOf(hook: ResolvedHook): Chord[] {
  const byStep = new Map<number, ResolvedNote[]>()
  for (const note of hook.notes) {
    const existing = byStep.get(note.step)
    if (existing === undefined) byStep.set(note.step, [note])
    else existing.push(note)
  }
  return [...byStep].map(([step, notes]) => ({ step, notes }))
}

/** One `len` when the chord agrees, otherwise each. */
export function lenText(notes: readonly ResolvedNote[]): string {
  return [...new Set(notes.map((n) => n.len))].map(num).join('/')
}
