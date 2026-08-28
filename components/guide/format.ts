import type { Device } from '@/lib/core'
import type { DeviceId } from '@/lib/core'
import type { Cite, Provenance, ResolvedParam, ResolvedRange } from '@/lib/core'
import { STEPS_PER_BAR, clockFollowing, clockWires, sameCite } from '@/lib/core'
import type { Gap, ResolvedHook, ResolvedNote } from '@/lib/core'
import type { FxSource, SidechainReading } from '@/lib/core'
import { noDuckers, pumpIsBoxByBox } from '@/lib/core'

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
/**
 * `a`, `a and b`, `a, b, and c`. The serial comma is deliberate: `pitch, gate and clock` reads as
 * two items on a phone at a rack, and this list is read at a rack.
 *
 * A second copy of the one in `lib/core/render.ts`, which is this directory's standing rule rather
 * than an oversight — `lib/core` cannot import from `components`, and `count` has lived in both for
 * the same reason. The shapes are trivial and the wording is the point.
 */
export function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

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
  // #40/#128: and what to do about it, which depends on whether there are voices enough to
  // hand-stack across. Written out by hand to match the Markdown renderer word for word — §8
  // keeps the sentences twice on purpose; see `polyphonyShortfall` there for the reasoning.
  const asked = `needs ${count(notes, 'note')} at once`
  const voices = roleVoices.length
  if (voices < notes) {
    const plays =
      voices === 1 ? 'only one voice here plays it at all' : `only ${num(voices)} voices here play it at all`
    return `${asked}; ${short}, and ${plays} — nothing here to spread it across`
  }
  const across = voices === notes ? `all ${num(voices)}` : `${num(notes)} of the ${num(voices)}`
  return (
    `${asked}; ${short} — stack it by hand across ${across} voices here that play it, one note ` +
    `each; they are separate voices rather than one pool, so set them alike or the chord will ` +
    `not blend`
  )
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

/**
 * §7.4/#121. **Four states, not two.** This view collapsed them to `sends clock` /
 * `receives clock only`, which is wrong about two boxes in the library and wrong about the wire
 * as well: a mixer whose manual never mentions MIDI was told it receives clock, over transports
 * the page then named. Restated from `lib/core/render.ts` the way `ioText` and `mixerText` are —
 * the branch is the same four facts, the sentence is written twice.
 *
 * **Transports are suppressed where the box has no clock at all.** Naming a wire implies a clock
 * travels on it, and for a box that neither sends nor receives, none does.
 */
export type ClockParts = {
  claim: string
  /** Both directions, on one list. Present unless the box has no clock, or the two differ. */
  transport?: string
  /** The two directions, when they are not the same wires. See `clockWires`. */
  send?: string
  receive?: string
}

export function clockParts(device: Device): ClockParts {
  const { canSendClock, canReceiveClock } = device.clock
  const claim = canSendClock
    ? canReceiveClock
      ? 'sends clock'
      : 'sends clock, cannot receive'
    : canReceiveClock
      ? 'receives clock only'
      : 'no clock in or out'
  // Split rather than joined, so §10 survives: the claim is prose and the transports are
  // identifiers, and one face for both is exactly what §10 forbids. The direction labels a split
  // box needs are prose too, so they are the component's to write and never baked in here.
  const wires = clockWires(device)
  if (wires.kind === 'none') return { claim }
  if (wires.kind === 'both') return { claim, transport: wires.transport.join('/') }
  return { claim, send: wires.send.join('/'), receive: wires.receive.join('/') }
}

/**
 * The same four states as one string, for the tests and for anything without two slots.
 *
 * **Both wire shapes, not just the shared one.** This read `parts.transport` alone, so a box
 * whose two directions differ — the only field that can be absent while wires exist — came back
 * as a bare claim with the transports silently dropped. Nothing caught it: this export has no
 * callers today, and the sweep in `device-catalogue.test.ts` was pinning the other two
 * restatements against the guide while this one drifted beside them.
 */
export function clockText(device: Device): string {
  const parts = clockParts(device)
  if (parts.transport !== undefined) return `${parts.claim} · ${parts.transport}`
  if (parts.send !== undefined) return `${parts.claim} · out: ${parts.send} · in: ${parts.receive}`
  return parts.claim
}

/**
 * §7.4/#121/#144. **"Sync everything else to it"**, and the two rigs where that is not a sentence.
 *
 * #121 added the exception clause: a box that does not receive clock — or receives it, but not
 * over the wire this rig resolved — runs free whatever the source is doing, and the page said so
 * nowhere. It printed the bare instruction and left a reader to discover the exception at the
 * machine, holding a rig where two boxes are drifting.
 *
 * #144 is the layer under that: the instruction addresses *everything else*, and this printed it
 * without asking whether "everything else" had members. At a one-box rig it has none, so the page
 * told somebody holding a single Deluge to cable up a rack they do not own. At a rig where every
 * other box is exempted, "sync everything else to it, except A and B" over a rig of exactly A and
 * B says *sync nothing* in the grammar of an instruction — the harder of the two to catch,
 * because every word of it is individually true.
 *
 * The split itself is `clockFollowing`'s, decided once for both renderers; the words are this
 * file's, which is the standing rule here. Restated from `lib/core/render.ts` exactly as `ioText`
 * and `mixerText` are, and `test/guide-view.test.ts` holds the two to the same facts.
 */
export function syncText(
  devices: readonly Device[],
  sourceId: DeviceId,
  transport: string,
): string {
  const following = clockFollowing(devices, sourceId, transport)
  if (following.alone) return 'Nothing else is here to sync to it.'
  const { deaf, unwired } = following
  const clauses: string[] = []
  // §7.4/#79, in this renderer's own words; `lib/core/render.ts` states the reasoning. A box a
  // computer drives is still deaf — no clock reaches it — but "runs free" is false in the one
  // workflow it exists for, so the sentence states the condition instead of choosing for a reader.
  const driven = deaf.filter((d) => d.dawTransport !== undefined)
  const free = deaf.filter((d) => d.dawTransport === undefined)
  if (free.length > 0) {
    clauses.push(
      `${andList(free.map((d) => d.name))}, which cannot receive clock and ` +
        `${free.length === 1 ? 'runs' : 'run'} free`,
    )
  }
  if (driven.length > 0) {
    clauses.push(
      `${andList(driven.map((d) => d.name))}, which cannot receive clock — a DAW drives ` +
        `${driven.length === 1 ? 'its' : 'their'} transport over ` +
        `${andList([...new Set(driven.map((d) => d.dawTransport?.protocol ?? ''))])}, and ` +
        `without one ${driven.length === 1 ? 'it runs' : 'they run'} free`,
    )
  }
  if (unwired.length > 0) {
    clauses.push(
      `${andList(unwired.map((d) => d.name))}, which ${unwired.length === 1 ? 'has' : 'have'} ` +
        `no \`${transport}\` input and ${unwired.length === 1 ? 'runs' : 'run'} free`,
    )
  }
  // Each clause carries its own "runs free" rather than one shared tail. With both kinds present
  // a shared tail would have to reach back across two different reasons, and a reader skimming at
  // the machine would have to hold the whole sentence to know which boxes it covers. That holds
  // in the nothing-can-follow sentence too, which is why it names the boxes rather than stopping
  // at "nothing else here can follow it".
  if (following.followers.length === 0) {
    return `Nothing else here can follow it: ${clauses.join(', and ')}.`
  }
  if (clauses.length === 0) return 'Sync everything else to it.'
  return `Sync everything else to it, except ${clauses.join(', and ')}.`
}

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

/** `a`, `a and b`, `a, b and c`. Plain strings — the role lists are a component, not a string. */
export function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}

/**
 * §8 phase 7's sidechain sentences. Restated from `lib/core/render.ts` exactly as `fxText` and
 * `mixerText` are: `lib/core/sidechain.ts` decides which boxes duck to what, and each renderer
 * writes the sentences from that grouping. `test/guide-view.test.ts` holds the two to the same
 * facts.
 *
 * Prose rather than a list, because the old list was the problem: one line per box reading
 * `internal` said the same word for a box you can patch a trigger into and a box you cannot,
 * and never said where the cable goes. Ordered by what the reader can act on — the cable first,
 * the boxes needing no cable second, an undocumented trigger last.
 */
export function sidechainSentences(reading: SidechainReading): string[] {
  if (noDuckers(reading)) return ['No box in this rig has a sidechain.']
  const out: string[] = []
  const external = reading.fromOtherBoxes
  const first = external[0]
  if (reading.alone && first !== undefined) {
    // One box: there is no other box to patch in, so the instruction would name a cable the
    // reader cannot make (#144's shape, one section up).
    out.push(
      first.alsoSelf
        ? `The ${first.name} ducks from its own parts, or from audio at its input — and it is ` +
            'the only box here to feed that input.'
        : `The ${first.name} ducks from audio at its input, and nothing else is here to feed it.`,
    )
  } else if (external.length > 0) {
    out.push(
      `The ${andList(external.map((d) => d.name))} can duck to another box: patch the box you ` +
        `want ${external.length === 1 ? 'it' : 'each'} to follow into its audio in.`,
    )
    const both = external.filter((d) => d.alsoSelf)
    if (both.length > 0) {
      out.push(
        `The ${andList(both.map((d) => d.name))} can also duck from ` +
          `${both.length === 1 ? 'its' : 'their'} own parts.`,
      )
    }
  }
  const self = reading.selfOnly
  const alone = self[0]
  if (self.length > 0 && alone !== undefined) {
    const one = self.length === 1
    const only = external.length === 0 ? '' : ' only'
    out.push(
      reading.alone && one
        ? `The ${alone.name} ducks from its own parts, and it is the only box here.`
        : `The ${andList(self.map((d) => d.name))} ${one ? 'ducks' : 'duck'} from ` +
            `${one ? 'its' : 'their'} own parts${only}.`,
    )
  }
  if (pumpIsBoxByBox(reading)) {
    out.push('Nothing here ducks to another box, so a rig-wide pump is built box by box.')
  }
  const unstated = reading.unstated
  if (unstated.length > 0) {
    const one = unstated.length === 1
    out.push(
      `The ${andList(unstated.map((d) => d.name))} ${one ? 'declares' : 'declare'} a sidechain ` +
        `and ${one ? 'documents' : 'document'} no trigger for it.`,
    )
  }
  return out
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
    } else if (evidence.kind === 'recipe') {
      clauses.push(`${andList(evidence.params)} in its recipes`)
    } else {
      // Nameless by construction (`FxEvidence`): the effects are on the box, the controls are
      // not in this document, and naming one here is the #106 regression wearing a hedge.
      clauses.push('effects, though no part in this guide reaches them')
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

// ---------------------------------------------------------------------------
// §12.4's count, recomputed for display
// ---------------------------------------------------------------------------

/**
 * An assignable occupied in any section counts once, never once per section — and every voice of
 * a stacked part counts (§12.4/#40), so a triad across three tracks is three voices.
 */
export function occupiedCounts(
  assignments: { deviceId: DeviceId; assignables: readonly { voiceId: string }[] }[],
) {
  const byDevice = new Map<DeviceId, Set<string>>()
  for (const a of assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<string>()
    for (const assignable of a.assignables) set.add(assignable.voiceId)
    byDevice.set(a.deviceId, set)
  }
  return new Map([...byDevice].map(([id, set]) => [id, set.size]))
}

// ---------------------------------------------------------------------------
// §12.4/#40 Where a part lives, when that is more than one voice
// ---------------------------------------------------------------------------

/**
 * "Tracks 3, 4 and 5" rather than "Track 3 (+2)": the reader is going to walk to the box and
 * touch all three, and a count is not a thing you can touch. No `Intl.ListFormat` — two joins
 * and nothing to drift (§7.2).
 */
export function voicesLabel(assignment: { assignables: readonly { label: string }[] }): string {
  const labels = assignment.assignables.map((a) => a.label)
  if (labels.length === 1) return labels[0] as string
  const last = labels[labels.length - 1] as string
  return `${labels.slice(0, -1).join(', ')} and ${last}`
}

/** §12.4/#40. Whether this part is a chord spread across several voices, one note each. */
export function isStacked(assignment: { assignables: readonly unknown[] }): boolean {
  return assignment.assignables.length > 1
}

/** Notes low to high, and a total order: see the Markdown renderer's `lowToHigh`. */
export function lowToHigh(notes: readonly ResolvedNote[]): ResolvedNote[] {
  return [...notes].sort((a, b) => a.midi - b.midi || a.degree - b.degree || a.len - b.len)
}

/** Which note of the chord this voice of the stack takes. */
export function stackPosition(index: number, width: number): string {
  if (index === 0) return 'lowest note'
  if (index === width - 1) return 'highest note'
  return `note ${num(index + 1)} from the bottom`
}

// ---------------------------------------------------------------------------
// Phase 4 — hooks read as chords
// ---------------------------------------------------------------------------

/**
 * Hook steps are absolute across the whole hook and nothing in `Hook` restates the resolution,
 * so the bar is inferred from §4.3's grid — and checked, not assumed: a hook whose steps run
 * past `bars * 16` was authored against a different grid, and gets no bar framing rather than a
 * wrong one.
 *
 * `STEPS_PER_BAR` is imported rather than restated. The rule at the top of this file is about
 * not reading the *Markdown renderer's* output; the grid is a fact about the pattern data one
 * layer below both of us, and a second copy of it here could only ever be a chance to disagree
 * with the resolver about what a bar is.
 */
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

/**
 * #142. **A note's duration, in the unit that reads at a glance and the one you can enter.**
 *
 * Steps first, because that is the number a step field takes and the unit the position on the
 * same line is already counted in; bars in brackets, because past about a bar a step count stops
 * meaning anything at a rack with your hands busy (§8). The gloss decomposes and never divides —
 * 24 steps is `1 bar 8 steps`, never `1.5 bars` and never `0.375 bars`. Under a bar there is no
 * gloss: the number already reads, and a bracket restating it is noise on every drum row.
 *
 * Hand-written to match `durationText` in `lib/core/render.ts`, like everything else here.
 */
export function durationText(len: number): string {
  if (len < STEPS_PER_BAR) return count(len, 'step')
  const bars = Math.floor(len / STEPS_PER_BAR)
  const rest = len % STEPS_PER_BAR
  const gloss = rest === 0 ? count(bars, 'bar') : `${count(bars, 'bar')} ${count(rest, 'step')}`
  return `${count(len, 'step')} (${gloss})`
}

/** One duration when the chord agrees, otherwise each. Note order, so it never reshuffles. */
export function durationsText(notes: readonly ResolvedNote[]): string {
  return [...new Set(notes.map((n) => n.len))].map(durationText).join(' / ')
}
