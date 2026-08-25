import type { CapabilityEvidence, ContentNotice, Device } from './device'
import { clockJackNotes, clockSourceSetup, contentNotice, evidenceFor, rangeDocuments } from './device'
import type { DeviceId, SectionName } from './ids'
import type { Role } from './vocabulary'
import type { Cite, ParamScope, Provenance, ResolvedParam, ResolvedRange } from './params'
import { dominantRangeCite, hoistedParams, sameCite } from './params'
import type { Pattern, PatternHit } from './template'
import { STEPS_PER_BAR } from './template'
import type { BoundArticulation, ResolvedPatchEntry, ResolvedSourceAudio } from './resolver'
import type { Gap } from './search'
import {
  chordVoicings,
  enharmonicAlternative,
  type HookChoice,
  type ResolvedHook,
  type ResolvedNote,
} from './harmony'
import { clockSourceBasis, type ClockSource, type ResolveResult, type ResolvedAssignment } from './pipeline'
import { GUIDE_PHASES } from './guide'
import { bandTrajectory, chainPlan, type BandGroup, type SectionChain } from './arrangement'
import { fxSources, type FxSource } from './fx'

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

/** Names in prose: "the L-8", "the L-8 and the 2400", "a, b, and c". */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
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
 * §2.6/#22. The same idea for a **capability fact** — a socket, a menu path — which carries a
 * `CapabilityEvidence` rather than a resolved provenance, and has a third state.
 *
 * **All three states are marked here, and that is the mark-the-exception rule applied rather than
 * overridden.** A parameter renders bare when it is provisional because nine values in ten are,
 * and a mark on all of them says nothing. Capability facts are the other way round: a rig prints
 * a handful, every one of them is cited today, so `unchecked` and `undocumented` *are* the
 * exceptions and a reader deserves to see them. "Patch MIDI IN" from a box whose rear panel
 * nobody has read is worth a word.
 *
 * `undocumented` is not a softer `unchecked`. It is the more expensive fact — somebody went to
 * the manual and it is silent — so it carries its reason on a line of its own, the way a citation
 * carries its page.
 */
function evidenceMark(evidence: CapabilityEvidence): string {
  if (evidence === false) return ' · unchecked'
  return evidence.kind === 'unknown' ? ' · undocumented' : ` · ${evidence.kind}`
}

/**
 * §2.6/#120/#121. Each state says its own word and its own sentence, and `cited-against` says its
 * page too, because having one is what makes it that state. A state that reached a reader wearing
 * another's word would be the failure #121 is about.
 *
 * `label` is what the *citation* is a citation of, and it exists because "value" is a lie on some
 * of them: `clock.preferredSource` is a claim about the box's job, not a value anybody dials.
 * Defaulted, so every existing caller keeps the word it had.
 */
function evidenceLines(evidence: CapabilityEvidence, label = 'value'): string[] {
  if (evidence === false) return []
  switch (evidence.kind) {
    case 'unknown':
      return [`undocumented — ${evidence.reason}`]
    case 'unread':
      return [`unread — ${evidence.reason}`]
    case 'cited-against':
      return [`cited-against ${citeText(evidence.cite)} — ${evidence.reason}`]
    default:
      return [`${label} ${citeText(evidence)}`]
  }
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

/**
 * §12.4. What the reader is actually being asked to play, when that is more than one note.
 *
 * Empty for a one-note part: the realisation makes no difference there, and a clause saying so
 * on every kick would bury the one case that matters. When it is not empty it is the difference
 * between a chord you *load* and a chord you *play*, which is not a nuance — the two are
 * different actions at the machine.
 */
function realisationText(assignment: ResolvedAssignment): string {
  if (assignment.notes <= 1) return ''
  if (assignment.recipe.realisation === 'sampled-chord') {
    return `${count(assignment.notes, 'note')} from one sampled chord`
  }
  return `${count(assignment.notes, 'note')} at once on one polyphonic voice`
}

/**
 * The same fact as `realisationText`, written as something to do rather than something to know.
 * Phase 2 is a list of what went where; phase 6 is the reader standing at the instrument, and
 * "load a chord sample" is a step they will otherwise not take.
 */
function realisationInstruction(assignment: ResolvedAssignment): string {
  if (assignment.notes <= 1) return ''
  const notes = count(assignment.notes, 'note')
  const n = num(assignment.notes)
  if (assignment.recipe.realisation === 'sampled-chord') {
    return (
      `Polyphony — ${notes}, already inside the sample. Load the chord sample(s) onto this one ` +
      `voice rather than spreading the notes across ${n}. One sample covers its chord shape at ` +
      `any root; a different shape needs its own — see Hook.`
    )
  }
  return (
    `Polyphony — ${notes} sounding at once on this one voice. It needs a genuinely polyphonic ` +
    `voice, not ${n} separate ones.`
  )
}

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

/**
 * §7.3, §12.4. The `polyphony` half of `no-capable-voice`, said in a way a reader can act on.
 *
 * The shortfall is stated rather than the fix, and it is measured off the rig rather than
 * assumed: "every voice here is monophonic" is the Tracker Mini case and is common, but a rig
 * whose pad voices top out at four notes is a different sentence and saying the monophonic one
 * would be false. The general form names the real ceiling.
 */
function polyphonyShortfall(notes: number, roleVoices: Gap['capable']): string {
  const ceiling = roleVoices.reduce((most, a) => Math.max(most, a.polyphony), 0)
  const short =
    ceiling <= 1
      ? 'every voice here is monophonic'
      : `the most any voice here can sound is ${count(ceiling, 'note')}`
  return `needs ${count(notes, 'note')} at once and ${short}`
}

/** §7.3. Said in words, because a reason code is not an answer to "why is there no kick". */
function gapText(gap: Gap, deviceById: Map<DeviceId, Device>): string {
  if (gap.reason === 'no-room') return `no room (${gap.because}) — ${gap.detail}`
  if (gap.reason === 'no-capable-voice') {
    if (gap.because === 'no-such-role') return 'nothing in your rig plays this part'
    // §12.4: the rig *does* play this part, one note at a time. Told the sentence above, a
    // reader would go and buy a box they already own the equivalent of.
    return polyphonyShortfall(gap.notes, gap.roleVoices)
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
      const realisation = realisationText(a)
      out.push(`- **\`${a.role}\`** → ${where} — *${a.recipe.title}*`)
      out.push(
        `  - p${num(a.priority)}${a.optional ? ', optional' : ''} · ${recipeWhy(a)}` +
          `${realisation === '' ? '' : ` · ${realisation}`} · ${sections}`,
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

/**
 * The channel plan for one box, derived from the two declared numbers and nothing else. No
 * channel strip is invented for a device that cannot separate its parts.
 */
function mixerText(device: Device, parts: number): string {
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

/**
 * §7.4/#121. **Why this box** — one line, once per guide, under the clock-source instruction.
 *
 * The rig phase named a box and a transport and never said what the answer rested on, so a
 * deterministic fallback and a person's judgement reached the reader in identical words. They are
 * not the same claim: `claimed` is somebody's manual saying leading a rig is this box's job, and
 * `tie-break` is nobody saying anything and the name deciding. Printing the second as the first
 * is invariant 5's failure — a confidence the guide does not have.
 *
 * **Hoisted, never per fact** (#35, #107). One line for the rig, not one per candidate: the eight
 * boxes that were asked and declined are the device pages' business, and repeating a citation
 * beside every box is the 14%-of-the-guide mistake #35 records. §8.1's eight-word rule is about
 * *hints*; this is the instruction line and its `↳ cite:`, which carry pages by design.
 */
function clockBasisText(source: ClockSource): string {
  switch (clockSourceBasis(source)) {
    case 'claimed':
      return 'Why this box — its manual says leading a rig is its job'
    // Two honest claims, and §7.4 has no basis to rank them. Saying so is the whole point: the
    // repair is for one manifest to stop claiming it, and a reader cannot ask for that repair
    // from a line that reads like advice.
    case 'contested':
      return (
        // `count` would say "2 boxs" — English, and this file is not internationalised. The
        // plural is unconditional: `contested` is two or more by definition.
        `Why this box — ${num(source.claims)} boxes here claim that job, ` +
        'so transport, then name, settled it'
      )
    default:
      return 'Why this box — nothing here claims that job, so transport, then name, settled it'
  }
}

function phaseRig(result: ResolveResult, occupied: Map<DeviceId, number>): Line[] {
  const out: Line[] = []
  const source = result.clockSource

  if (source === undefined) {
    // §7.4: a real rig, and a fact to state rather than paper over.
    out.push('**Clock** — nothing in this rig can send clock. Every box here has to receive one,')
    out.push('so the clock has to come from something outside it.')
  } else {
    // §7.4. "Sync everything else to it" is an instruction, and some boxes cannot obey it —
    // a device that does not receive clock runs free no matter what the source is doing.
    // Naming them here beats leaving the reader to discover it at the machine.
    const deaf = result.devices.filter(
      (d) => d.id !== source.deviceId && !d.clock.canReceiveClock,
    )
    const sync =
      deaf.length === 0
        ? 'Sync everything else to it.'
        : `Sync everything else to it, except ${list(deaf.map((d) => d.name))}, ` +
          `which cannot receive clock and ${deaf.length === 1 ? 'runs' : 'run'} free.`
    out.push(
      `**Clock source** — ${source.deviceName} over \`${source.transport}\`, ` +
        `carrying ${count(source.occupiedAssignables, 'part')}. ${sync}`,
    )

    const sourceDevice = result.devices.find((d) => d.id === source.deviceId)

    /**
     * §7.4/#121. The basis, and — where the manifest recorded one — what it read when it decided.
     *
     * The evidence shown is the **chosen box's own**, at `clock.preferredSource`, and only that
     * one. A manifest that recorded nothing there prints no mark and no citation, which is the
     * honest rendering rather than a hole: nobody wrote down a reading, so the guide claims none.
     * `claim`, not `value` — this citation is for what the box is *for*, and no reader dials it.
     */
    out.push('')
    const preference =
      sourceDevice === undefined ? undefined : evidenceFor(sourceDevice, 'clock.preferredSource')
    out.push(
      `- ${clockBasisText(source)}` +
        `${preference === undefined ? '' : evidenceMark(preference)}`,
    )
    if (preference !== undefined) {
      for (const cite of evidenceLines(preference, 'claim')) subordinate(out, '  ', 'cite', cite)
    }

    /**
     * #104. The setting that makes the instruction above possible.
     *
     * "Sync everything else to it" is not actionable while the source is not emitting, and on
     * boxes where clock output is routed in a menu it is not emitting until somebody says so.
     * The path, the value and the page are all the device's (`ClockSpec.sourceSetup`) — this
     * renderer names no box and knows no menu, so a device that declares none prints nothing
     * here and a device that declares one gets its own words.
     */
    const setup =
      sourceDevice === undefined ? undefined : clockSourceSetup(sourceDevice, source.transport)
    if (setup !== undefined) {
      out.push('')
      out.push(
        `- On the ${source.deviceName}, set \`${setup.path}\` to \`${setup.value}\`` +
          `${evidenceMark(setup.evidence)}`,
      )
      // §8.1's subordinate lines, the same three tags every other cited instruction in this
      // document uses. `· manual` says *how* it was checked and never says *where*: a reader
      // holding the wrong book, or the same book at a different revision, cannot act on a bare
      // `manual`. The page belongs on the page, not only in a title attribute the printed guide
      // does not have.
      if (setup.note !== undefined) subordinate(out, '  ', 'note', setup.note)
      for (const cite of evidenceLines(setup.evidence)) subordinate(out, '  ', 'cite', cite)
    }
  }
  out.push('')

  // One block per box rather than a table plus a second list keyed by name. Two renderings of
  // the same three devices made the reader join them by eye, on the phase whose whole job is
  // "what do I plug where" — so clock, audio and channel plan sit together, per box.
  for (const device of result.devices) {
    const parts = occupied.get(device.id) ?? 0
    // Four cases, not two. A box that does neither read "receives clock only" — wrong about
    // the box and, for a mixer whose manual never says MIDI, wrong about the wire as well.
    // Transports are suppressed in that case: naming a wire implies a clock travels on it.
    const clockText = device.clock.canSendClock
      ? device.clock.canReceiveClock
        ? 'sends clock'
        : 'sends clock, cannot receive'
      : device.clock.canReceiveClock
        ? 'receives clock only'
        : 'no clock in or out'
    const clock = device.clock.canSendClock || device.clock.canReceiveClock
      ? [clockText, device.clock.transport.join('/')].join(' · ')
      : clockText

    out.push(`- **${device.name}** — ${device.kind} · ${count(parts, 'part')}`)
    out.push(`  - clock: ${clock}`)
    // #103. Whatever this box's manual says about the sockets *this* rig's clock runs through —
    // the Tracker Mini's Type B adapter is the case. Filtered by the resolved transport and
    // deduped by `clockJackNotes`, so a USB rig hears nothing about a MIDI adapter and a note
    // true of both the In and the Out is printed once.
    if (source !== undefined) {
      for (const jackNote of clockJackNotes(device, source.transport)) {
        out.push(`  - ${jackNote.jacks.join(', ')}: ${jackNote.note}${evidenceMark(jackNote.evidence)}`)
        // The jack's own page. p.284 stays in the note text above rather than being folded in
        // here: `verified` is the page that documents *this jack* (§3.3), and the adapter's
        // second page documents the adapter — one citation, one claim.
        for (const cite of evidenceLines(jackNote.evidence)) subordinate(out, '    ', 'cite', cite)
      }
    }
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
 * Hook steps are absolute across the whole hook and nothing in `Hook` restates the resolution,
 * so the bar is inferred from §4.3's grid (`STEPS_PER_BAR`) — and checked, not assumed: a hook
 * whose steps run past `bars * 16` was authored against a different grid, and gets no bar
 * framing rather than a wrong one.
 */
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

/**
 * §12.4. The hook, for a part whose recipe puts the chord inside a sample.
 *
 * Two lists rather than one, because there are two different things to do and they happen at
 * different times: the chords are *content to obtain* before you start, and the steps are
 * *triggers* to place once you have them. Rendering them as one list of notes — which is what
 * this replaces — asked the reader to play a chord on a voice that sounds one note.
 *
 * A sample transposes as a block, and that is a real capability rather than a limitation: one
 * recording covers its shape at every root, so a trigger carries the interval to move it by. A
 * second sample is needed only where the *shape* changes — a different quality, or a different
 * inversion — which no transposition can produce.
 */
/**
 * How far to move the sample for one trigger. Printed on every row, `as recorded` included, so
 * the column is always there to scan — a reader checking whether a chord moves should not have
 * to notice an *absent* value.
 */
function transposeText(semitones: number): string {
  if (semitones === 0) return 'as recorded'
  return `${semitones > 0 ? '+' : '-'}${num(Math.abs(semitones))} st`
}

function sampledHookLines(hook: ResolvedHook, framed: boolean): Line[] {
  const out: Line[] = []
  const voicings = chordVoicings(hook)

  out.push('Sampled chord — you trigger a sample, you do not play these notes.')
  out.push('')
  out.push(
    voicings.length === 1
      ? 'One chord shape throughout, so one sample, transposed where the chord moves.'
      : `${count(voicings.length, 'chord shape')}, so ${count(voicings.length, 'sample')}. ` +
          'A sample transposes as a block, keeping its shape, so one recording covers that ' +
          'shape at every root. A separate sample is needed only where the shape changes — a ' +
          'different quality, or a different inversion.',
  )
  out.push('')

  out.push(`**Samples to obtain or render** — ${count(voicings.length, 'chord shape')}`)
  out.push('')
  for (const voicing of voicings) {
    out.push(
      `- sample ${voicing.label} · ` +
        `${voicing.notes.map(spelling).join(' ')} · ` +
        `${voicing.notes.map((n) => degreeName(n.degree)).join(' ')} · ` +
        `MIDI ${voicing.notes.map((n) => num(n.midi)).join(' ')} · ` +
        `shape ${voicing.shape.map(num).join('-')}`,
    )
  }
  out.push('')

  out.push('**Trigger** — one step event per chord, and the sample sounds all of it')
  out.push('')
  // Step order, not voicing order: this list is entered left to right at the machine, and a
  // reader following it should never have to jump backwards.
  const triggers = voicings
    .flatMap((voicing) => voicing.at.map((occurrence) => ({ voicing, occurrence })))
    .sort((a, b) => a.occurrence.step - b.occurrence.step)
  for (const { voicing, occurrence } of triggers) {
    const where = framed
      ? `bar ${num(barOf(occurrence.step))} · step ${num(occurrence.step)}`
      : `step ${num(occurrence.step)}`
    out.push(
      `- ${where} · len ${lenText(occurrence.notes)} · sample ${voicing.label} · ` +
        `${transposeText(occurrence.semitones)} · ${occurrence.notes.map(spelling).join(' ')}`,
    )
  }
  return out
}

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

  // §12.4. A part carried by a `sampled-chord` recipe is not played note by note, and the
  // ordinary rendering below would tell its reader to enter three notes on a voice that sounds
  // one. It also says nothing about what has to be recorded: a sample follows a progression by
  // transposition, which covers every root of its own shape and no other shape at all.
  if (carriedBy?.recipe.realisation === 'sampled-chord') {
    out.push(...sampledHookLines(hook, framed))
    return out
  }

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
  return [...bySlot].map(([slot, hits]) => `- \`${slot}\` — ${slotSteps(hits)}`)
}

/**
 * One slot's hits as steps. When every hit carries the *same* velocity the figure is hoisted
 * to the end — `2, 4, 6, 8 (all vel 42)` rather than eight copies of `(vel 42)`.
 *
 * Not cosmetic: a band-3 ghost slot is eight sixteenths, and per-hit it renders a 105-character
 * line that wraps three times on the phone §10 says this is read on. The repetition also buries
 * the thing the reader is actually scanning for, which is the step numbers.
 */
function slotSteps(hits: readonly PatternHit[]): string {
  const first = hits[0] as PatternHit
  const uniform =
    hits.length > 1 &&
    first.velocity !== undefined &&
    hits.every((h) => h.velocity === first.velocity)
  if (uniform) {
    return `${hits.map((h) => num(h.step)).join(', ')} (all vel ${num(first.velocity as number)})`
  }
  return hits
    .map((h) => (h.velocity === undefined ? num(h.step) : `${num(h.step)} (vel ${num(h.velocity)})`))
    .join(', ')
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
 * What the values under a device heading actually cite, as a sentence, or nothing when they cite
 * nothing.
 *
 * Derived from the citations rather than from `Device.manual`, which is a separate assertion
 * nothing keeps in agreement with them. A TR-1000 declares its Owner's Manual while every range
 * cites the Reference Manual — a different book, and the only one that prints a range at all — so
 * the guide was telling a reader to look something up where it cannot be found. Two devices cite
 * two documents each, which one declared title cannot express however it is worded.
 */
export function citationSentence(device: Device): string | undefined {
  const documents = rangeDocuments(device)
  if (documents.length === 0) return undefined
  return `Values below cite ${list([...documents])}.`
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

/**
 * #100. What phase 5 says for a part whose hook is its rhythm.
 *
 * A pointer rather than a restatement: repeating the hook's steps here would be the same
 * contradiction one edit away, and §8 already puts Hook immediately above this phase, so the
 * reader is being sent up one heading rather than across the document.
 *
 * It names no hook id — phase 4 does not either (that is our machinery, not the reader's), and
 * the part is identified by the heading this line sits under.
 */
const HOOK_IS_THE_PATTERN =
  '**The hook is the pattern** — see Hook above for its steps and note lengths. ' +
  'Nothing separate to program here.'

/**
 * #105. How one out-of-phase section is chained, in the order it is built.
 *
 * `full === 0` is its own sentence rather than "0 copies": a 9-bar section against a 16-bar
 * hook is one copy stopped early, and no amount of arithmetic makes that a repeat count.
 */
function chainText(chain: SectionChain): string {
  if (chain.full === 0) return `one copy cut to ${count(chain.remainder, 'bar')}`
  const copies =
    chain.full === 1
      ? `1 copy of ${count(chain.unitBars, 'bar')}`
      : `${num(chain.full)} copies of ${count(chain.unitBars, 'bar')}`
  return `${copies}, then one cut to ${count(chain.remainder, 'bar')}`
}

/**
 * #105's standing note, once at the top of the phase — the same placement §8 gives phase 4's
 * note conventions, and for the same reason: a paragraph repeated under twelve parts is a
 * paragraph nobody reads under any of them.
 *
 * It says *deliberate* in as many words. Drone Study's sections are 9, 15, 21, 33, 18, 24 and
 * 12 bars against a 16-bar cycle, and the template's own note explains why — out-of-phase
 * boundaries are "what stops 132 bars of one note reading as a loop". Without this the numbers
 * read as an arithmetic bug, and the reader's fix — rounding to 8 or 16 — would delete the
 * arrangement.
 */
const OUT_OF_PHASE = [
  '**Not every section is a whole number of repeats, and that is deliberate.** The template',
  'puts section boundaries out of phase with the pattern and the harmonic cycle on purpose, so',
  'the guide prints the lengths it was given and rounds nothing. In Song mode, chain full copies',
  'and cut the final one short: 9 bars of a 4-bar pattern is 4 + 4 + 1.',
]

/** The sections one part cannot fill with whole copies, or nothing when they all divide. */
function chainLines(result: ResolveResult, a: ResolvedAssignment): Line[] {
  const plan = chainPlan(result, a)
  if (plan.length === 0) return []
  return ['', ...plan.map((c) => `- **${c.section}** · ${count(c.bars, 'bar')} — ${chainText(c)}`)]
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

  if (result.assignments.some((a) => chainPlan(result, a).length > 0)) {
    out.push(...OUT_OF_PHASE)
    out.push('')
  }

  for (const a of result.assignments) {
    out.push(`### \`${a.role}\` — ${a.deviceName} · ${a.assignable.label}`)
    out.push('')
    // Same reason as phase 4: this phase says what to play and not what it sounds like, so a
    // reader stopping here would think the sound was missing.
    out.push(`**${a.recipe.title}** — settings in Sound design`)
    // #100. Before the blocks, and instead of them: a variant was still selected for this part
    // (the band it asks for is what §8's arrangement phase reads), but the hook is what gets
    // played, so printing a grid here would restate the contradiction this replaced.
    if (a.hookAuthority !== undefined) {
      out.push('')
      out.push(HOOK_IS_THE_PATTERN)
    } else {
      for (const { sections, block } of mergeBlocks(a, deviceById, options)) {
        out.push('')
        out.push(`**${sections.join(', ')}** — ${block.headline}`)
        out.push(...block.body)
      }
    }
    // #105. After the programming, hooked or not: it is how what was just described gets
    // chained over the arrangement, so it cannot come before the thing being chained.
    out.push(...chainLines(result, a))
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

/**
 * §3/#101. What to load, before any of the knobs below mean anything.
 *
 * First in the part, ahead of routing and ahead of every parameter, because that is the order it
 * happens at the machine: a filter cutoff on a sampler with nothing loaded is a setting with no
 * subject. The `Source —` prefix mirrors the `Routing —` line that follows it, since the two are
 * the same kind of line — an instruction about the part rather than a value to dial.
 *
 * **The need line carries no provenance mark and the procedure line does.** That asymmetry is
 * the model's (`resolveSourceAudio`), not the renderer's: the choice of recording is nobody's
 * documented claim, and the procedure for rendering one is the manual's. A mark on the first
 * would be an unchecked-guess badge on honest guidance.
 *
 * The procedure is a bullet with its citation beneath, which is `paramLines`' shape exactly —
 * a claim, its mark, and its evidence indented under it. It is not folded into the need line
 * because they are two claims (§3), and a citation attached to the pair would be a citation
 * attached to the half of it nobody checked.
 */
function sourceLines(
  source: ResolvedSourceAudio,
  device: Device | undefined,
  options: Required<RenderOptions>,
): Line[] {
  const out: Line[] = [`Source — ${source.need}`]
  if (source.prep === undefined) {
    // Nothing documented to do, so the jog attaches to the need itself.
    if (options.hints && source.hint !== undefined) {
      out.push('')
      subordinate(out, '', 'hint', hintText(device, source.hint))
    }
    return out
  }
  out.push('')
  out.push(`- ${source.prep.text}${mark(source.prep.provenance)}`)
  for (const cite of citeLines(source.prep.provenance, undefined)) {
    subordinate(out, '  ', 'cite', cite)
  }
  if (options.hints && source.hint !== undefined) {
    subordinate(out, '  ', 'hint', hintText(device, source.hint))
  }
  return out
}

/**
 * §2.6/#111. **What this box plays, said once above its parts**, in this renderer's own words —
 * the same arrangement #107's scope heading below sits in. `contentNotice` decides *which* of
 * the three states the box is in; the sentences are written here and again in
 * `components/guide/phase-sound.tsx`, and `test/device-content.test.ts` asserts all of them in
 * both, because two copies of a sentence is exactly the thing that drifts.
 *
 * **The unsettled state says four different things, because #120's states are four different
 * findings and one sentence over them would be false of most.** "Nobody here has checked" is true
 * of `false` and of a fixture that reached here uncited, and a lie about every box somebody read
 * and could not finish reading — which is all five real devices. `evidenceMark` and the cite line
 * below already say which state it is; this says what a reader should do about it, and a reading
 * that ran out, a document nobody can open and a document answering no do not lead to the same
 * next move.
 *
 * All of them do the work #111 was filed for, and they do it *here* rather than on the part:
 * `Source — <need>` is a true and useful line — it says what the part needs — and what was never
 * true is the thing a reader inferred from it in the silence above, that the box ships nothing
 * and the file is therefore theirs to find. Rewriting the part's line would have put the
 * qualification on every part instead of once on the box, and would have made a genuinely
 * user-supplied recipe read as a doubt about the recipe rather than about us.
 */
function contentText(notice: ContentNotice): string {
  switch (notice.state) {
    // **Promises entries a reader can look up, and the schema is what makes that safe to say.**
    // `DeviceSchema` refuses `enumerable` beside any `sourceAudio` recipe, so a box in this state
    // has parts that name entries from the printed list rather than describing audio in prose.
    //
    // No device reaches this branch today, and not because none is enumerable: the notice prints
    // only where an assigned part loads audio, and such a part is exactly what this state may not
    // have. The TR-1000's `GEN` list is named by each recipe's own cited enum instead. Kept
    // because the state is real in the model and a hand-built fixture must render honestly.
    case 'enumerable':
      return (
        `Ships ${notice.library}. The parts below name entries from it, so there is nothing ` +
        'here to go and find.'
      )
    // **Says what is on the box and where, and does not promise a list.** The four devices that
    // were declared `enumerable` for four commits are all here: a page establishes the content
    // and no page prints the filenames, so a reader is pointed at the place and the `Source`
    // line below still describes what the part needs. `reason` is the manifest saying why that
    // pairing is the manual's limit rather than an omission of ours.
    case 'shipped-library':
      return (
        `Ships ${notice.library} — look in ${notice.location}. ${notice.reason}, so the ` +
        'Source line below says what the part needs rather than naming a file.'
      )
    case 'user-supplied':
      return (
        'You supply it. This box ships no factory content for these parts, so each Source ' +
        'line below names what to load.'
      )
    default:
      return unsettledText(notice.evidence)
  }
}

/**
 * The four unsettled findings, each with its own instruction. Kept apart from `contentText`
 * because the web guide needs the identical split and the two are compared line for line.
 */
function unsettledText(evidence: CapabilityEvidence | undefined): string {
  if (evidence !== undefined && evidence !== false) {
    switch (evidence.kind) {
      case 'cited-against':
        // A document answering *no* to the claim the field would make. No real device is in this
        // state: the five that ship content and do not enumerate it declare `shipped-library`,
        // because a manual saying "fifty factory packs" answers yes and then stops. Worded for
        // what the state means rather than for that case, which is how the first pass got it
        // wrong — it was written to mean "ships content nobody has listed", which is a
        // declaration and not a non-claim at all.
        return (
          'Not established — a document here answers against it, and the reading is below. ' +
          'A Source line says what a part needs, not that you have to supply it.'
        )
      case 'unread':
        return (
          'Not established — the document that would say is not in `manuals/`. A Source line ' +
          'below says what a part needs, not that you have to supply it.'
        )
      case 'unknown':
        return (
          'Not established — the manual was read and does not say. A Source line below says ' +
          'what a part needs, not that you have to supply it.'
        )
    }
  }
  return (
    'Not established. Nobody here has checked whether this box ships usable content, so a ' +
    'Source line below says what a part needs — not that you have to supply it.'
  )
}

function contentLines(notice: ContentNotice): Line[] {
  const evidence = notice.evidence
  const out: Line[] = ['', '**Content**', '']
  out.push(`- ${contentText(notice)}${evidence === undefined ? '' : evidenceMark(evidence)}`)
  if (evidence !== undefined) {
    // `claim`, not `value`: what this box ships is a fact about the box, and no reader dials it.
    for (const cite of evidenceLines(evidence, 'claim')) subordinate(out, '  ', 'cite', cite)
  }
  return out
}

/**
 * #107's heading, in words. Restated in `components/guide/phase-sound.tsx` for the web guide,
 * exactly as `fxText` and `realisationInstruction` are — and **local, not exported**: §8's two
 * renderers are siblings that share no code path, so the web guide reaching in here for a
 * sentence would make it a dependent of the Markdown one. `hoistedParams` decides *which*
 * settings belong to the device; each renderer writes its own introduction to them.
 *
 * The cost of two copies is that they can drift, so `test/guide-view.test.ts` asserts both
 * scopes' words in both renderers rather than trusting the duplication.
 *
 * The scope's own word is printed rather than a generic "shared", because `pattern` and `song`
 * are different claims — each one the scope its own device committed to in that parameter's
 * `note` (§3.1) — and printing one box's claim over another's is not a tidier sentence, it is a
 * wrong one.
 */
function scopeHeading(scope: ParamScope): string {
  return scope === 'pattern' ? 'Pattern-wide' : 'Song-wide'
}

/**
 * Why the block is here at all, in one line the reader can act on. `SWING` under four tracks was
 * four instructions to set one control; this says outright that it is one.
 */
function scopeSentence(scope: ParamScope): string {
  return scope === 'pattern'
    ? 'One setting for the whole pattern — set it once, not once per part below.'
    : 'One setting for the whole song — set it once, not once per part below.'
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
    const cites = citationSentence(device)
    if (cites !== undefined) {
      out.push('')
      out.push(`*${cites}*`)
    }
    // §2.6/#111. Before the settings, for the reason a part's `Source` line comes before its
    // parameters: a cutoff on a box with nothing loaded is a setting with no subject, and
    // whether there *is* anything to load is the box's question, not the part's.
    const content = contentNotice(
      device,
      mine.map((a) => a.recipe),
    )
    if (content !== undefined) out.push(...contentLines(content))
    // #107. Above the parts, because that is the order it is done at the box: set the one
    // control the pattern shares, then work through the voices.
    const hoist = hoistedParams(mine.map((a) => a.params))
    for (const group of hoist.groups) {
      out.push('')
      out.push(`**${scopeHeading(group.scope)}**`)
      out.push('')
      out.push(scopeSentence(group.scope))
      out.push('')
      // No `hoisted` cite: a device-level block has no shared-citation sentence over it, so
      // every line prints its own evidence in full (§3.2).
      for (const param of group.params) out.push(...paramLines(param, device, options))
    }
    for (const a of mine) {
      out.push('')
      out.push(`#### ${a.assignable.label} — \`${a.role}\`: ${a.recipe.title}`)
      out.push('')
      // §12.4, and an instruction rather than a note: the two realisations are two different
      // things to do at the box, and doing the wrong one produces the wrong number of sounds.
      // A chord you load is not a chord you play. Anything device-specific about the trade —
      // which slot it spends, which it does not — is the recipe's `routing` line immediately
      // below, because this renderer knows nothing about any box.
      const realisation = realisationInstruction(a)
      if (realisation !== '') {
        out.push(realisation)
        out.push('')
      }
      if (a.recipe.sourceAudio !== undefined) {
        out.push(...sourceLines(a.recipe.sourceAudio, device, options))
        out.push('')
      }
      if (a.recipe.routing !== undefined) {
        out.push(`Routing — ${a.recipe.routing}`)
        out.push('')
      }
      const own = a.params.filter((p) => !hoist.names.has(p.name))
      if (a.params.length === 0) {
        out.push('No settings authored for this recipe.')
      } else if (own.length === 0) {
        // Every setting this recipe has is device-level. Saying "no settings authored" here
        // would be false — they are authored, they are above — and saying nothing would leave
        // a heading with no body under it.
        out.push('Nothing to set for this part alone; every setting it has is above.')
      } else {
        // Computed on what is actually printed. A hoisted parameter still in the tally could
        // tip a citation into looking dominant when the lines it dominated have left the list.
        const hoisted = dominantRangeCite(own)
        if (hoisted !== undefined) {
          out.push(`*Ranges cite ${citeText(hoisted)}.*`)
          out.push('')
        }
        for (const param of own) out.push(...paramLines(param, device, options, hoisted))
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

function phaseFinishing(result: ResolveResult): Line[] {
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
  const fx = fxSources(result.devices, result.assignments)
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  if (fx.length === 0) {
    // §2.3 models per-device capability, not a master chain. Saying so beats guessing one.
    out.push('Nothing in this rig processes audio. The master chain is yours at the desk.')
  } else if (fx.length === 1) {
    const only = fx[0] as FxSource
    out.push(
      `The ${only.name} ${fxText(only, byId.get(only.deviceId))}; ` +
        'nothing else in this rig processes audio.',
    )
  } else {
    out.push('What processes audio in this rig:')
    out.push('')
    for (const source of fx) {
      out.push(`- ${source.name} — ${fxText(source, byId.get(source.deviceId))}`)
    }
  }
  out.push('')

  out.push('**Arrangement variations**')
  out.push('')
  const trajectory = bandTrajectory(result)
  if (trajectory.groups.length === 0) {
    out.push('Nothing is assigned, so there is no arrangement to vary.')
    return out
  }
  out.push('Sections that program identically, part for part — build one and copy it:')
  out.push('')
  for (const group of trajectory.groups) {
    const notes = groupNotes(group).map((n) => ` · ${n}`).join('')
    out.push(
      `- **${group.band === undefined ? 'no parts' : `band ${num(group.band)}`}** — ` +
        `${group.sections.join(', ')}${notes}`,
    )
  }
  if (trajectory.unpatterned.length > 0) {
    out.push('')
    out.push(
      `${roleList(trajectory.unpatterned)} ${trajectory.unpatterned.length === 1 ? 'has' : 'have'}` +
        ' no pattern authored at any band, so nothing here varies for them.',
    )
  }
  return out
}

/** The per-group notes, in one order both renderers share. */
function groupNotes(group: BandGroup): string[] {
  const notes: string[] = []
  for (const f of group.fallbacks) {
    notes.push(
      f.all
        ? `every part plays band ${num(f.usedBand)}`
        : `${roleList(f.roles)} ${f.roles.length === 1 ? 'plays' : 'play'} band ${num(f.usedBand)}`,
    )
  }
  if (group.silent.length > 0) {
    notes.push(
      `${roleList(group.silent)} ${group.silent.length === 1 ? 'has' : 'have'} nothing authored here`,
    )
  }
  if (group.differsOn.length > 0) notes.push(`differs on ${roleList(group.differsOn)}`)
  return notes
}

/** `a`, `a and b`, `a, b and c`. The plain-string sibling of `roleList`, which backticks. */
function andList(items: readonly string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] as string}`
}

/**
 * The predicate of "this box processes audio", built only from what `fx.ts` found the device
 * declaring. Restated in `components/guide/format.ts` for the web guide exactly as `ioText` and
 * `mixerText` are: the *fact* that a box has effects is derived once, in `fx.ts`; the sentence
 * is written twice, because these two renderers share ink with nobody.
 *
 * Panel labels are printed verbatim and in panel order — `MASTER FX` is what is silkscreened on
 * the box, and the point of naming it is that you can find it while standing there.
 */
function fxText(source: FxSource, device: Device | undefined): string {
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

function roleList(roles: readonly Role[]): string {
  const names = roles.map((r) => `\`${r}\``)
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1] as string}`
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
    phaseFinishing(result),
  ]

  const out: Line[] = [`# ${result.template.name}`, '', ...LEGEND]
  bodies.forEach((body, i) => {
    out.push('', `## ${num(i + 1)}. ${GUIDE_PHASES[i] as string}`, '')
    out.push(...body)
  })
  return `${out.join('\n')}\n`
}
