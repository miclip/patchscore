import type { Device } from './device'
import type { DeviceId, SectionName } from './ids'
import type { Cite, Provenance, ResolvedParam, ResolvedRange } from './params'
import type { Pattern, PatternHit } from './template'
import type { BoundArticulation, ResolvedPatchEntry } from './resolver'
import type { Gap } from './search'
import { compareCodeUnits } from './resolver'
import { enharmonicAlternative, type HookChoice, type ResolvedHook, type ResolvedNote } from './harmony'
import type { ResolveResult, ResolvedAssignment } from './pipeline'

/**
 * §8. The resolved guide as Markdown.
 *
 * **The renderer decides nothing.** Every musical choice — the key, which hook, which pattern
 * variant, which recipe, what mood did to a value — is already settled in `ResolveResult`, and
 * everything here is a pure function of it. That is not tidiness: §8.2 encodes *inputs* in the
 * permalink and re-resolves, so a decision taken during rendering would be a decision no
 * permalink carries, and two readers of one link could disagree about what key the track is in.
 *
 * Four rules the whole file obeys:
 *
 *  - **Seven phases, always, in §8's order.** Not "the phases that had content" — a guide whose
 *    hook section vanishes is indistinguishable from a genre with no hook, so an empty phase
 *    says what is missing instead of disappearing (invariant 5). `GUIDE_PHASES` is the order and
 *    the test asserts against it.
 *  - **Every rendered value carries its provenance** (invariant 4). `ResolvedParam.provenance`
 *    is non-optional, so there is no unmarked case to fall through to, and the three states are
 *    rendered *visibly differently* rather than by a marker only a machine could tell apart.
 *  - **Hints are tagged subordinate lines** (§8.1). One tag, one line each, never inline after
 *    the value — see `SUBORDINATE`.
 *  - **No locale-dependent formatting** (§7.2): no `toLocaleString`, no `Intl`. Numbers go
 *    through `String`, which is specified exactly and is the same on every platform.
 */

// ---------------------------------------------------------------------------
// The shape of the document
// ---------------------------------------------------------------------------

/**
 * §8's phase order, which "reflects how a real session unfolds at the machine. Do not reorder."
 * Exported because it is the contract: a UI building a table of contents and a test asserting
 * the order must read the same list, not two copies of it.
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

/**
 * §8.1. Hints, citations and authored notes are *subordinate* to the instruction they hang
 * under: each is its own nested list item, opened by a fixed tag.
 *
 * A line rather than an inline suffix, because §8.1's requirement is that toggling hints must
 * not reflow the page — and an inline hint reflows the instruction the moment the line wraps.
 * A whole line is what a UI can hide into a reserved column (or a reserved second grid row on a
 * phone) by changing `visibility` alone. That is also why the tag is a *literal constant* here
 * and not a formatting flourish: it is the seam a later UI keys on.
 *
 * Three kinds and not one, because they are suppressible independently. `Show hints` is a
 * documented toggle for jogs you have outgrown; a citation is the guide's evidence and is not
 * something a reader turns off to go faster.
 */
export const SUBORDINATE = {
  hint: '↳ hint:',
  cite: '↳ cite:',
  note: '↳ note:',
} as const

export type RenderOptions = {
  /**
   * §8.1's **Show hints**, on by default. `false` omits every `↳ hint:` line and changes
   * nothing else — the export equivalent of the CSS toggle, and the property is worth having
   * testable here rather than only in a stylesheet.
   */
  hints?: boolean
}

// ---------------------------------------------------------------------------
// Values, provenance and citations
// ---------------------------------------------------------------------------

/**
 * `String`, never `toLocaleString` (§7.2). Spelled out as a named function so that a later edit
 * reaching for thousands separators has to come through here and read this comment.
 */
function num(value: number): string {
  return String(value)
}

/** '1 part', '3 parts'. English only, and hard-coded: this file is not internationalised. */
function count(n: number, singular: string): string {
  return `${num(n)} ${singular}${n === 1 ? '' : 's'}`
}

/** 'manual — TR-1000 Reference Manual p.61'. `cite.kind` is rendered, never dropped (§3.2). */
function citeText(cite: Cite): string {
  return `${cite.kind} — ${cite.source}`
}

/**
 * `0…100`, `-100…100`.
 *
 * The separator is an ellipsis rather than #29's illustrative en dash because the majority of
 * authored ranges in the library are bipolar, and `-100–100` is unreadable in exactly the
 * situation the range exists to clarify. One form for every range beats a form that changes
 * with the sign of the lower bound.
 */
function rangeText(range: ResolvedRange, unit: string | undefined): string {
  const suffix = unit === undefined ? '' : ` ${unit}`
  return `${num(range.min)}…${num(range.max)}${suffix}`
}

/**
 * §3.2's rendered column: `52`, `52 → 45`, or `52` plus a badge — the arrow appears exactly
 * when mood moved the value, which for a `provisional` point is still true and still shown.
 */
function valueText(param: ResolvedParam): string {
  const now = typeof param.value === 'number' ? num(param.value) : param.value
  const { provenance } = param
  // `authored` never moved, by construction. The other two states carry `from` exactly when
  // mood changed the result — including `provisional`, which §3.2 still renders `52 → 45`.
  if (provenance.state === 'authored') return now
  return provenance.from === undefined ? now : `${num(provenance.from)} → ${now}`
}

/**
 * The mark on a value, and it marks the **positive** claim.
 *
 * An unmarked value is a starting point. That is what a patch sheet has always been, it is what
 * this guide is, and it needs no annotation. What is worth a reader's attention is the opposite
 * fact — *this number came off the manual* — because that is the one that changes what they do
 * with it.
 *
 * The earlier scheme marked the common case instead: a `⚠` on nine values in ten, plus a legend
 * opening "nobody has verified this, trust your ears over this page". That told a reader the
 * tool did not know what it was talking about before they had seen a single value, and the mark
 * carried no information precisely because it was everywhere.
 *
 * So: `cite.kind` is the mark — `manual` or `observed`, which is the distinction §3.2 calls
 * orthogonal and worth keeping — and a mood move names its knob whether or not the point
 * underneath was cited. A provisional point that nothing moved renders bare.
 *
 * **Nothing about provenance itself is weakened by this.** `ResolvedParam.provenance` is still
 * non-optional (invariant 4 is a type guarantee, not a rendering convention), and the audit
 * script still counts provisional points, unverified ranges and mood-inert params separately.
 * What changed is which of the three states is the one the page bothers to name.
 */
function provenanceText(provenance: Provenance): string {
  const moved = (axes: readonly string[]) => `moved by ${axes.join(', ')}`
  if (provenance.state === 'authored') return provenance.cite.kind
  if (provenance.state === 'derived') {
    return `${provenance.cite.kind} · ${moved(provenance.axes)}`
  }
  // §3.2: a provisional point still shows the move, and still inherits no authority from it.
  return provenance.axes !== undefined && provenance.axes.length > 0 ? moved(provenance.axes) : ''
}

/** ` · manual`, or nothing at all. An unmarked value must not trail a separator. */
function mark(provenance: Provenance): string {
  const text = provenanceText(provenance)
  return text === '' ? '' : ` · ${text}`
}

/**
 * §3.2's range citation, hoisted when a recipe repeats it.
 *
 * A recipe whose parameters all come off one manual page printed that page under every line —
 * five consecutive params, five identical citations. Same principle as the provenance mark and
 * the note convention: state it once, annotate the exceptions.
 *
 * Rules, and each of them exists to keep the hoisted line *true*:
 *
 *  - Only **range** citations hoist. A value citation is a claim about one number and does not
 *    generalise to the parameter beside it.
 *  - Only a **verified** range has a citation at all; an unverified one is a different claim
 *    (§3.2's legality gate) and always keeps its own line.
 *  - The citation must actually repeat. One occurrence is not a pattern, and hoisting it would
 *    move a line without removing one.
 *  - A tie hoists **nothing**. Two citations appearing twice each have no dominant one, and
 *    picking either would silently demote the other from a fact to an exception.
 *
 * Exceptions are never suppressed: a parameter citing a different page keeps its own line, and
 * that is the whole point of hoisting — the page under it becomes the thing worth reading.
 */
export function dominantRangeCite(params: readonly ResolvedParam[]): Cite | undefined {
  const counts = new Map<string, { cite: Cite; n: number }>()
  for (const param of params) {
    const { range } = param
    if (range === undefined || range.verified === false) continue
    const cite = range.verified
    const key = `${cite.kind}\u0000${cite.source}`
    const seen = counts.get(key)
    if (seen === undefined) counts.set(key, { cite, n: 1 })
    else seen.n += 1
  }

  const ranked = [...counts.values()].sort(
    (a, b) => b.n - a.n || compareCodeUnits(`${a.cite.kind}${a.cite.source}`, `${b.cite.kind}${b.cite.source}`),
  )
  const top = ranked[0]
  if (top === undefined || top.n < 2) return undefined
  const runnerUp = ranked[1]
  if (runnerUp !== undefined && runnerUp.n === top.n) return undefined
  return top.cite
}

function sameCite(a: Cite, b: Cite | undefined): boolean {
  return b !== undefined && a.kind === b.kind && a.source === b.source
}

/**
 * The citation lines for one provenance, which is where `cite.kind` and the *range's separate
 * claim* (§3.1) become visible. A `provisional` point has no citation to give and gets none —
 * that absence is the honest rendering, not a hole to fill.
 */
function citeLines(
  provenance: Provenance,
  range: ResolvedRange | undefined,
  hoisted?: Cite,
): string[] {
  const parts: string[] = []
  // Labelled halves, because they are two independent claims (§3.1) and an unlabelled pair of
  // citations reads as one claim stated twice.
  if (provenance.state !== 'provisional') parts.push(`value ${citeText(provenance.cite)}`)
  if (range !== undefined) {
    if (range.verified === false) {
      parts.push('range unverified — mood leaves this value alone')
    } else if (!sameCite(range.verified, hoisted)) {
      // The exception. Hoisting only ever removes the repetition, never the outlier.
      parts.push(`range ${citeText(range.verified)}`)
    }
  }
  return parts
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

type Line = string

function subordinate(out: Line[], indent: string, kind: keyof typeof SUBORDINATE, text: string) {
  out.push(`${indent}- ${SUBORDINATE[kind]} ${text}`)
}

/**
 * A device's `hints` table is keyed lookup for articulation (`ArticulationEntry.hint` is
 * validated against it) and free text for parameters (real device folders author whole jogs
 * there). One rule serves both: look the string up, and fall back to the string itself.
 *
 * The fallback is not a guess — an unmatched hint is already the literal jog its author wrote,
 * and a matched one could only have been written as a key, since the schema rejects an
 * articulation hint that is not one.
 */
function hintText(device: Device | undefined, hint: string): string {
  return device?.hints?.[hint] ?? hint
}

// ---------------------------------------------------------------------------
// Phase 1 — Song
// ---------------------------------------------------------------------------

/** A ten-cell meter. Integer cells from a fraction, so no float ever reaches the page. */
function energyBar(energy: number): string {
  const filled = Math.round(energy * 10)
  return `${'█'.repeat(filled)}${'·'.repeat(10 - filled)}`
}

function phaseSong(result: ResolveResult): Line[] {
  const { template, song } = result
  const out: Line[] = []

  out.push(
    `- **BPM** ${num(song.bpm)} (template range ${num(template.bpm.min)}…${num(template.bpm.max)})`,
  )
  if (song.key === undefined) {
    out.push('- **Key** — this template has none, so the hooks below have no notes')
  } else {
    const others = song.keys.filter((k) => k !== song.key)
    const alternatives = others.length === 0 ? '' : ` (a reroll may pick ${others.join(', ')})`
    out.push(`- **Key** ${song.key}${alternatives}`)
  }
  out.push(`- **Harmonic cycle** ${num(template.harmony.cycleBars)} bars`)
  out.push('')

  out.push('| Degree | Bars |')
  out.push('| --- | ---: |')
  for (const step of template.harmony.progression) {
    out.push(`| ${step.degree} | ${num(step.bars)} |`)
  }
  out.push('')

  const totalBars = template.structure.reduce((sum, s) => sum + s.bars, 0)
  out.push(`**Arrangement** — ${num(totalBars)} bars total`)
  out.push('')
  out.push('| Section | Bars | Energy |')
  out.push('| --- | ---: | --- |')
  for (const section of template.structure) {
    const meter = `\`${energyBar(section.energy)}\` ${num(section.energy)}`
    out.push(`| ${section.name} | ${num(section.bars)} | ${meter} |`)
  }
  return out
}

// ---------------------------------------------------------------------------
// Phase 2 — Voice assignment
// ---------------------------------------------------------------------------

/** §3.5. Why this recipe, in the one case where the answer is not "it matched". */
function recipeWhy(assignment: ResolvedAssignment): string {
  if (assignment.recipe.outcome === 'exact') return `exact \`${assignment.character}\``
  const { character } = assignment.recipe
  return `substituted — asked \`${assignment.character}\`, authored \`${character}\``
}

/**
 * The assignables that could have carried a part, grouped by device and summarised past three.
 *
 * A pool device contributes every one of its tracks here, so the ungrouped list for a rig with
 * a Deluge and a Tracker Mini runs to forty-odd names — which is not a list anybody reads, and
 * it buries the fact that matters: *which boxes*. The threshold is where an enumeration stops
 * being scannable, not a claim about the hardware.
 */
function capableText(
  capable: Gap['capable'],
  deviceById: Map<DeviceId, Device>,
): string {
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

/** §7.3. Said in words, because a reason code is not an answer to "why is there no kick". */
function gapText(gap: Gap, deviceById: Map<DeviceId, Device>): string {
  if (gap.reason === 'no-room') return `no room (${gap.because}) — ${gap.detail}`
  if (gap.reason === 'no-capable-voice') {
    return 'no voice in this rig declares the role — this one needs another box'
  }
  // §3.5's `unvoiced`, which is fixed by authoring a recipe rather than by buying a box — so
  // the assignables that *could* have carried it are the useful half of the answer.
  const capable = capableText(gap.capable, deviceById)
  return `capable but unauthored — ${capable} could carry it, dial it by ear`
}

function phaseVoiceAssignment(result: ResolveResult, deviceById: Map<DeviceId, Device>): Line[] {
  const out: Line[] = []

  if (result.assignments.length === 0) {
    out.push('No parts assigned. Every one is listed below.')
  } else {
    // Per part, not a five-column table. This is read on a phone at arm's length beside a box:
    // a table that needs horizontal scrolling hides the column you were reading, while a bullet
    // that is too long simply wraps. Same five facts, in the same order, reflowable.
    for (const a of result.assignments) {
      const sections =
        a.sections.length === result.template.structure.length
          ? 'every section'
          : a.sections.join(', ')
      const where = `${a.deviceName} · ${a.assignable.label}`
      out.push(`- **\`${a.role}\`** → ${where} — *${a.recipe.title}*`)
      out.push(
        `  - p${num(a.priority)}${a.optional ? ', optional' : ''} · ${recipeWhy(a)} · ${sections}`,
      )
    }
  }

  out.push('')
  out.push('### Gaps')
  out.push('')
  if (result.gaps.length === 0) {
    out.push('None.')
    return out
  }
  // Invariant 5: shown, never filled by inventing an assignment.
  out.push('These parts are not in the guide below.')
  out.push('')
  for (const gap of result.gaps) {
    const optional = gap.optional ? ' *(optional)*' : ''
    out.push(
      `- \`${gap.role}\` \`${gap.character}\` (p${num(gap.priority)})${optional} — ` +
        `${gapText(gap, deviceById)}`,
    )
  }
  return out
}

// ---------------------------------------------------------------------------
// Phase 3 — Rig integration
// ---------------------------------------------------------------------------

function ioText(device: Device): string {
  const parts = [`${device.io.main} main out`]
  if (device.io.individualOuts > 0) parts.push(count(device.io.individualOuts, 'individual out'))
  if (device.io.usbAudio) parts.push('USB audio')
  if (device.io.audioIn) parts.push('audio in')
  return parts.join(' · ')
}

/**
 * The channel plan for one box, derived from the two declared numbers and nothing else. No
 * channel strip is invented for a device that cannot separate its parts.
 */
function mixerText(device: Device, parts: number): string {
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

function phaseRig(result: ResolveResult, occupied: Map<DeviceId, number>): Line[] {
  const out: Line[] = []
  const source = result.clockSource

  if (source === undefined) {
    // §7.4: a real rig, and a fact to state rather than paper over.
    out.push('**Clock** — nothing in this rig can send clock. Every box here has to receive one,')
    out.push('so the clock has to come from something outside it.')
  } else {
    out.push(
      `**Clock source** — ${source.deviceName} over \`${source.transport}\`, ` +
        `carrying ${count(source.occupiedAssignables, 'part')}. Sync everything else to it.`,
    )
  }
  out.push('')

  // One block per box rather than a table plus a second list keyed by name. Two renderings of
  // the same three devices made the reader join them by eye, on the phase whose whole job is
  // "what do I plug where" — so clock, audio and channel plan sit together, per box.
  for (const device of result.devices) {
    const parts = occupied.get(device.id) ?? 0
    const clock = [
      device.clock.canSendClock ? 'sends clock' : 'receives clock only',
      device.clock.transport.join('/'),
    ].join(' · ')

    out.push(`- **${device.name}** — ${device.kind} · ${count(parts, 'part')}`)
    out.push(`  - clock: ${clock}`)
    out.push(`  - audio: ${ioText(device)}`)
    out.push(`  - mixer: ${mixerText(device, parts)}`)
  }
  return out
}

// ---------------------------------------------------------------------------
// Phase 4 — Hook
// ---------------------------------------------------------------------------

/**
 * #32. Rendered once, near the notes, rather than repeated per note: three representations of
 * one pitch need explaining exactly once, and a guide that explains it eleven times is a guide
 * nobody finishes reading.
 */
/**
 * §4.3's grid: patterns are 16, 32 or 64 steps over 1, 2 or 4 bars, so a step is a sixteenth.
 * Hook steps are absolute across the whole hook and nothing in `Hook` restates the resolution,
 * so it is inferred here — and checked, not assumed: a hook whose steps run past `bars * 16`
 * was authored against a different grid, and gets no bar framing rather than a wrong one.
 */
const STEPS_PER_BAR = 16

function barOf(step: number): number {
  return Math.floor((step - 1) / STEPS_PER_BAR) + 1
}

function gridFits(hook: ResolvedHook): boolean {
  return hook.notes.every((n) => n.step >= 1 && n.step <= hook.bars * STEPS_PER_BAR)
}

/**
 * `degree 1` is jargon dressed as data. A musician reads `root` and `3rd` instantly, and those
 * carry the harmonic function — the one thing the note name does not tell you.
 *
 * Ordinals, not `b7`: the degrees here are scale degrees within the key, so whether the 7th is
 * flat is a property of the mode, and this layer does not know the mode. Calling it `b7`
 * would be right in A minor and wrong in A major.
 */
function degreeName(degree: number): string {
  if (degree === 1) return 'root'
  const tens = degree % 100
  if (tens >= 11 && tens <= 13) return `${num(degree)}th`
  const suffix = degree % 10 === 1 ? 'st' : degree % 10 === 2 ? 'nd' : degree % 10 === 3 ? 'rd' : 'th'
  return `${num(degree)}${suffix}`
}

/**
 * Notes sharing a step are one chord, and rendering them as separate rows hides that. A stab
 * playing four triads across four bars was twelve rows that looked like twelve unrelated
 * events; grouped, it is four rows and obviously an A minor triad three times.
 *
 * Grouped by step alone. Two notes at one step with different lengths are still one chord —
 * the lengths are listed rather than used to split it, because splitting would put half a
 * triad on each of two rows, which is the failure this exists to fix.
 */
type Chord = { step: number; notes: ResolvedNote[] }

function chordsOf(hook: ResolvedHook): Chord[] {
  const byStep = new Map<number, ResolvedNote[]>()
  for (const note of hook.notes) {
    const existing = byStep.get(note.step)
    if (existing === undefined) byStep.set(note.step, [note])
    else existing.push(note)
  }
  return [...byStep].map(([step, notes]) => ({ step, notes }))
}

/** One `len` when the chord agrees, otherwise each. */
function lenText(notes: readonly ResolvedNote[]): string {
  const lens = [...new Set(notes.map((n) => n.len))]
  return lens.map(num).join('/')
}

function spelling(note: ResolvedNote): string {
  const enharmonic = enharmonicAlternative(note)
  return enharmonic === undefined ? `\`${note.note}\`` : `\`${note.note}\` (\`${enharmonic}\`)`
}

const NOTE_CONVENTION = [
  'Steps are sixteenths, counted from the start of the hook: 16 to a bar, so step 33 is bar 3.',
  'Notes sharing a step are one chord and share a line.',
  '',
  'Names are spelled for the key, so F minor gets `Eb`; a name in brackets is the same pitch as',
  'a sharps-only box shows it, and appears only where it differs. Octaves put middle C at C4,',
  'which not every maker agrees with — the MIDI number is the form nothing disagrees about.',
  '',
  'Where a role has more than one hook authored, rerolling the seed picks a different one.',
]

function hookLines(choice: HookChoice, carriedBy: ResolvedAssignment | undefined): Line[] {
  const out: Line[] = []

  // The heading says what the part is and where it lives. Not the hook's id — that is a
  // template-internal identifier that means nothing to somebody standing at a box — and not
  // how many hooks were authored or which one the seed took, which is our machinery rather
  // than their information. The reroll fact worth having is stated once, up in the intro.
  const where =
    carriedBy === undefined
      ? 'unassigned'
      : `${carriedBy.deviceName} · ${carriedBy.assignable.label}`
  out.push(`### \`${choice.forRole}\` — ${where}`)
  out.push('')

  // §8 puts Hook before Sound design on purpose — write the line before designing the sound
  // that plays it — but a reader here has no way of knowing the sound is defined further down,
  // and reasonably concludes it is missing. The recipe title already describes the sound, so
  // naming it costs one line and duplicates no value. The values themselves stay in phase 6:
  // two places to change one number is how a guide goes stale.
  if (carriedBy === undefined) {
    out.push('*Nothing in your rig plays this part.*')
  } else {
    out.push(`**${carriedBy.recipe.title}** — settings in Sound design`)
  }
  out.push('')

  if (choice.chosen.outcome === 'unresolved') {
    // Reported, never guessed at (§4.1).
    out.push(`Not resolved: ${choice.chosen.reason} — ${choice.chosen.detail}`)
    return out
  }

  const hook = choice.chosen.hook
  const framed = gridFits(hook)
  out.push(`${num(hook.bars)} bars in ${hook.key}.`)
  out.push('')
  // One labelled line per chord, rather than a table: a labelled line survives wrapping on a
  // phone, where a table's header scrolls away from its body.
  for (const chord of chordsOf(hook)) {
    const where = framed ? `bar ${num(barOf(chord.step))} · step ${num(chord.step)}` : `step ${num(chord.step)}`
    out.push(
      `- ${where} · len ${lenText(chord.notes)} · ` +
        `${chord.notes.map(spelling).join(' ')} · ` +
        `${chord.notes.map((n) => degreeName(n.degree)).join(' ')} · ` +
        `MIDI ${chord.notes.map((n) => num(n.midi)).join(' ')}`,
    )
  }
  return out
}

function phaseHook(result: ResolveResult): Line[] {
  const out: Line[] = []
  if (result.song.hooks.length === 0) {
    // §4.1 / invariant 5: omit rather than invent — and say that is what happened.
    out.push('This template has no hooks.')
    return out
  }

  out.push(...NOTE_CONVENTION)
  const byRole = new Map(result.assignments.map((a) => [a.role, a]))
  for (const choice of result.song.hooks) {
    out.push('')
    out.push(...hookLines(choice, byRole.get(choice.forRole)))
  }
  return out
}

// ---------------------------------------------------------------------------
// Phase 5 — Step programming
// ---------------------------------------------------------------------------

const ROW = 16

/**
 * The pattern as a grid, in rows of sixteen steps grouped in fours, with the step number the
 * row starts at. A 64-step variant is four rows of the shape a box's screen shows, not one
 * line that wraps somewhere different on every reader's phone.
 */
function gridRows(pattern: Pattern): Line[] {
  const hit = new Set(pattern.hits.map((h) => h.step))
  const width = String(pattern.length).length
  const rows: Line[] = []
  for (let start = 1; start <= pattern.length; start += ROW) {
    const cells: string[] = []
    for (let step = start; step < start + ROW && step <= pattern.length; step++) {
      if ((step - start) % 4 === 0 && step !== start) cells.push(' ')
      cells.push(hit.has(step) ? 'x' : '·')
    }
    rows.push(`${String(start).padStart(width, ' ')} ${cells.join('')}`)
  }
  return rows
}

/** Hits by slot, in the order the slots first appear in the authored pattern. */
function slotLines(pattern: Pattern): Line[] {
  const bySlot = new Map<PatternHit['slot'], PatternHit[]>()
  for (const h of pattern.hits) {
    const existing = bySlot.get(h.slot)
    if (existing === undefined) bySlot.set(h.slot, [h])
    else existing.push(h)
  }
  return [...bySlot].map(([slot, hits]) => {
    const steps = hits
      .map((h) =>
        h.velocity === undefined ? num(h.step) : `${num(h.step)} (vel ${num(h.velocity)})`,
      )
      .join(', ')
    return `- \`${slot}\` — ${steps}`
  })
}

function articulationLines(
  entries: readonly BoundArticulation[],
  device: Device | undefined,
  options: Required<RenderOptions>,
): Line[] {
  const out: Line[] = []
  for (const entry of entries) {
    const sets = Object.entries(entry.set)
      .map(([key, value]) => `\`${key}\` ${typeof value === 'string' ? value : String(value)}`)
      .join(', ')
    out.push(
      `- \`${entry.slot}\` → ${sets} on step${entry.steps.length === 1 ? '' : 's'} ` +
        `${entry.steps.map(num).join(', ')}${mark(entry.provenance)}`,
    )
    for (const cite of citeLines(entry.provenance, undefined)) subordinate(out, '  ', 'cite', cite)
    if (options.hints && entry.hint !== undefined) {
      subordinate(out, '  ', 'hint', hintText(device, entry.hint))
    }
  }
  return out
}

/**
 * One section's programming, split into the sentence that names it and the lines under it, so
 * two sections can be compared for identity and merged.
 */
type StepBlock = { headline: string; body: Line[] }

function stepBlock(
  a: ResolvedAssignment,
  entry: ResolvedAssignment['patterns'][number],
  deviceById: Map<DeviceId, Device>,
  options: Required<RenderOptions>,
): StepBlock {
  const { selection } = entry
  if (selection.outcome === 'none') {
    return {
      headline:
        `no pattern authored for \`${a.role}\` at any band ` +
        `(asked for band ${num(selection.band)})`,
      body: [],
    }
  }

  // §6.3's fallback is reported, never silent: a knob that visibly does nothing is a bug
  // report waiting to happen.
  const band =
    selection.outcome === 'fallback'
      ? `band ${num(selection.usedBand)} — nothing authored at band ${num(selection.band)}`
      : `band ${num(selection.usedBand)}`
  const { pattern } = selection

  const body: Line[] = ['', '```', ...gridRows(pattern), '```', ...slotLines(pattern)]
  if (entry.articulation.length > 0) {
    body.push('')
    // Labelled, because a bare second list under the slot list reads as more of the same
    // list — and it is not: these are the device's settings, not the template's steps.
    body.push(`**On this box** — ${a.deviceName}`)
    body.push('')
    body.push(...articulationLines(entry.articulation, deviceById.get(a.deviceId), options))
  }
  // No pattern id: template-internal, and the two facts that carry meaning here are how long
  // the variant is and which band it came from.
  return { headline: `${num(pattern.length)} steps, ${band}`, body }
}

/**
 * Sections that program identically, merged into one block.
 *
 * A continuous part in a six-section template repeated its grid, its slot list and its
 * articulation six times — the same sixteen steps, six times, under six different headings. At
 * the machine that is not thoroughness, it is a page you scroll past, and the repetition hides
 * the sections that genuinely *do* differ (a band fallback in the quiet sections, say) among
 * the ones that do not.
 *
 * Merged by identity of the rendered block, not by pattern id, because two sections agreeing on
 * a variant but disagreeing on the band it fell back from are not the same instruction. Blocks
 * keep first-appearance order and each names its sections in structure order, so the reading
 * order §8 fixes is unchanged — nothing moves, identical things stop being repeated.
 */
function mergeBlocks(
  a: ResolvedAssignment,
  deviceById: Map<DeviceId, Device>,
  options: Required<RenderOptions>,
): { sections: SectionName[]; block: StepBlock }[] {
  const merged = new Map<string, { sections: SectionName[]; block: StepBlock }>()
  for (const entry of a.patterns) {
    const block = stepBlock(a, entry, deviceById, options)
    const key = `${block.headline}\n${block.body.join('\n')}`
    const existing = merged.get(key)
    if (existing === undefined) merged.set(key, { sections: [entry.section], block })
    else existing.sections.push(entry.section)
  }
  return [...merged.values()]
}

function phaseSteps(
  result: ResolveResult,
  deviceById: Map<DeviceId, Device>,
  options: Required<RenderOptions>,
): Line[] {
  const out: Line[] = []
  if (result.assignments.length === 0) {
    out.push('No parts assigned.')
    return out
  }

  for (const a of result.assignments) {
    out.push(`### \`${a.role}\` — ${a.deviceName} · ${a.assignable.label}`)
    out.push('')
    // Same reason as phase 4: this phase says what to play and not what it sounds like, so a
    // reader stopping here would think the sound was missing.
    out.push(`**${a.recipe.title}** — settings in Sound design`)
    for (const { sections, block } of mergeBlocks(a, deviceById, options)) {
      out.push('')
      out.push(`**${sections.join(', ')}** — ${block.headline}`)
      out.push(...block.body)
    }
    out.push('')
  }
  // Drop the trailing separator the loop leaves behind, never a line of content.
  if (out[out.length - 1] === '') out.pop()
  return out
}

// ---------------------------------------------------------------------------
// Phase 6 — Sound design
// ---------------------------------------------------------------------------

function paramLines(
  param: ResolvedParam,
  device: Device | undefined,
  options: Required<RenderOptions>,
  hoisted?: Cite,
): Line[] {
  const out: Line[] = []
  const unit = param.unit === undefined ? '' : ` ${param.unit}`
  const range = param.range === undefined ? '' : ` (${rangeText(param.range, param.unit)})`
  out.push(`- **${param.name}** \`${valueText(param)}\`${unit}${range}${mark(param.provenance)}`)
  for (const cite of citeLines(param.provenance, param.range, hoisted)) {
    subordinate(out, '  ', 'cite', cite)
  }
  if (param.note !== undefined) subordinate(out, '  ', 'note', param.note)
  if (options.hints && param.hint !== undefined) {
    subordinate(out, '  ', 'hint', hintText(device, param.hint))
  }
  return out
}

function patchLines(entries: readonly ResolvedPatchEntry[]): Line[] {
  const out: Line[] = []
  for (const entry of entries) {
    out.push(`- \`${entry.from}\` → \`${entry.to}\`${mark(entry.provenance)}`)
    for (const cite of citeLines(entry.provenance, undefined)) subordinate(out, '  ', 'cite', cite)
    if (entry.note !== undefined) subordinate(out, '  ', 'note', entry.note)
  }
  return out
}

function phaseSound(
  result: ResolveResult,
  deviceById: Map<DeviceId, Device>,
  options: Required<RenderOptions>,
): Line[] {
  const out: Line[] = []
  if (result.assignments.length === 0) {
    out.push('No parts assigned.')
    return out
  }

  // Device by device, in rig order (§8). A device carrying nothing has nothing to set and is
  // covered by rig integration above.
  for (const device of result.devices) {
    const mine = result.assignments.filter((a) => a.deviceId === device.id)
    if (mine.length === 0) continue
    out.push(`### ${device.name}`)
    if (device.manual !== undefined) {
      const edition = device.manual.edition === undefined ? '' : `, ${device.manual.edition}`
      out.push('')
      out.push(`*Values below cite ${device.manual.title}${edition}.*`)
    }
    for (const a of mine) {
      out.push('')
      out.push(`#### ${a.assignable.label} — \`${a.role}\`: ${a.recipe.title}`)
      out.push('')
      if (a.recipe.routing !== undefined) {
        out.push(`Routing — ${a.recipe.routing}`)
        out.push('')
      }
      if (a.params.length === 0) {
        out.push('No settings authored for this recipe.')
      } else {
        const hoisted = dominantRangeCite(a.params)
        if (hoisted !== undefined) {
          out.push(`*Ranges cite ${citeText(hoisted)}.*`)
          out.push('')
        }
        for (const param of a.params) out.push(...paramLines(param, device, options, hoisted))
      }
      if (a.patch.length > 0) {
        out.push('')
        out.push('**Patch**')
        out.push('')
        out.push(...patchLines(a.patch))
      }
    }
    out.push('')
  }
  // Drop the trailing separator the loop leaves behind, never a line of content.
  if (out[out.length - 1] === '') out.pop()
  return out
}

// ---------------------------------------------------------------------------
// Phase 7 — Finishing
// ---------------------------------------------------------------------------

function phaseFinishing(result: ResolveResult, occupied: Map<DeviceId, number>): Line[] {
  const out: Line[] = []

  out.push('**Sidechain**')
  out.push('')
  const duckers = result.devices.filter((d) => d.features?.sidechain !== undefined)
  if (duckers.length === 0) {
    out.push('No device in this rig has a sidechain.')
  } else {
    for (const device of duckers) {
      const spec = device.features?.sidechain
      if (spec === undefined) continue
      const kinds: string[] = []
      if (spec.internal) kinds.push('internal')
      if (spec.fromExternalAudio) kinds.push('from external audio')
      const sources = kinds.length === 0 ? 'declared, no source listed' : kinds.join(', ')
      out.push(`- ${device.name} — ${sources}`)
    }
  }
  out.push('')

  out.push('**Master FX**')
  out.push('')
  const fx = result.devices.filter((d) => d.kind === 'fx-processor' || d.kind === 'mixer-recorder')
  if (fx.length === 0) {
    // §2.3 models per-device capability, not a master chain. Saying so beats guessing one.
    out.push('No effects unit or mixer in this rig. The master chain is yours at the desk.')
  } else {
    for (const device of fx) out.push(`- ${device.name} (${device.kind}) — ${ioText(device)}`)
  }
  out.push('')

  out.push('**Arrangement variations**')
  out.push('')
  const carried = result.devices
    .filter((d) => (occupied.get(d.id) ?? 0) > 0)
    .map((d) => d.name)
    .join(', ')
  out.push(`Parts live on ${carried === '' ? 'nothing' : carried}. Section by section:`)
  out.push('')
  for (const section of result.template.structure) {
    const here = result.assignments.filter((a) => a.sections.includes(section.name))
    const roles = here.map((a) => `\`${a.role}\``).join(', ')
    out.push(
      `- **${section.name}** (${num(section.bars)} bars, energy ${num(section.energy)}) — ` +
        `${roles === '' ? 'nothing assigned' : roles}`,
    )
  }
  const transient = result.assignments.filter(
    (a) => a.sections.length < result.template.structure.length,
  )
  if (transient.length > 0) {
    out.push('')
    out.push('Parts that come and go:')
    for (const a of transient) {
      out.push(`- \`${a.role}\` — ${a.sections.join(', ')} only`)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/** §12.4's count, recomputed for display: an assignable occupied in any section counts once. */
function occupiedCounts(result: ResolveResult): Map<DeviceId, number> {
  const byDevice = new Map<DeviceId, Set<string>>()
  for (const a of result.assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<string>()
    set.add(a.assignable.voiceId)
    byDevice.set(a.deviceId, set)
  }
  return new Map([...byDevice].map(([id, set]) => [id, set.size]))
}

/**
 * The reading convention, stated once, in the voice of something that knows what it is talking
 * about. It says what the values *are* rather than apologising for them, which is also the only
 * thing that makes an unmarked value legible: the convention has to be stated somewhere, and
 * once at the top is cheaper than on every line.
 *
 * Deliberately says nothing about hints: a legend
 * describing a line the reader has switched off is a small lie, and keeping it out is what lets
 * `hints: false` be exactly "the same document, minus the hint lines" — a property worth having
 * because §8.1's toggle must not move anything else on the page.
 */
const LEGEND = [
  'Values are starting points — dial them to taste. Where a number came straight off the manual',
  'or off a unit it says which, and where a mood knob moved it you see the move (`52 → 45`) and',
  'the knob that did it. Every value carries its range — `38 (0…100)` — so you can tell at a',
  'glance whether the screen in front of you is the one the line is about.',
]

/**
 * §8. The whole guide, as Markdown.
 *
 * Pure and total: every `ResolveResult` renders, including one where the search filled nothing.
 * A guide of seven phases all saying what is missing is the correct output for an empty rig,
 * and is the reason no phase is conditional on having content (invariant 5).
 */
export function renderGuide(result: ResolveResult, options: RenderOptions = {}): string {
  const settings: Required<RenderOptions> = { hints: options.hints ?? true }
  const deviceById = new Map(result.devices.map((d) => [d.id, d]))
  const occupied = occupiedCounts(result)

  const bodies: Line[][] = [
    phaseSong(result),
    phaseVoiceAssignment(result, deviceById),
    phaseRig(result, occupied),
    phaseHook(result),
    phaseSteps(result, deviceById, settings),
    phaseSound(result, deviceById, settings),
    phaseFinishing(result, occupied),
  ]

  const out: Line[] = [`# ${result.template.name}`, '', ...LEGEND]
  bodies.forEach((body, i) => {
    out.push('', `## ${num(i + 1)}. ${GUIDE_PHASES[i] as string}`, '')
    out.push(...body)
  })
  return `${out.join('\n')}\n`
}
