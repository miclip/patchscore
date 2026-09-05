import type { PatternDriver } from './pipeline'
import type {
  CapabilityEvidence,
  ContentNotice,
  ControlPositionNotice,
  Device,
  NoteDurationNotice,
} from './device'
import {
  clockJackNotes,
  clockSourceSetup,
  clockWires,
  contentNotice,
  controlPositionNotice,
  noteDurationNotice,
  patternEntryNotice,
  noteOffSteps,
  printsNoteDuration,
} from './device'
import type { DeviceId, SectionName } from './ids'
import type { Role } from './vocabulary'
import type { CitedSource, ParamScope, ResolvedParam, ResolvedRange } from './params'
import {
  citedShare,
  citedSources,
  groupedParams,
  hoistedParams,
  paramLabel,
  renderedParams,
} from './params'
import type { Pattern, PatternHit } from './template'
import { STEPS_PER_BAR } from './template'
import { reStrikesHeldNote, tightestReStrike } from './timing'
import type { BoundArticulation, ResolvedPatchEntry, ResolvedSourceAudio } from './resolver'
import {
  shortfallsOfKind,
  type Gap,
  type PlacementRefusal,
  type RefusedPlacement,
  type Shortfall,
} from './search'
import {
  chordVoicings,
  enharmonicAlternative,
  type HookChoice,
  type ResolvedHook,
  type ResolvedNote,
} from './harmony'
import {
  clockFollowing,
  clockSourceBasis,
  quickTuneNotices,
  warmUpNotices,
  songFindings,
  type ClockFollowing,
  type ClockSource,
  type InterDevicePatch,
  type ResolveResult,
  type ResolvedAssignment,
  type VoiceControlSource, type SequencerGroup, patternDriver, sequencerGroups, narrowToGroup, unplayedHooks, devicesInGroup, devicesOutsideGroups,} from './pipeline'
import { GUIDE_PHASES, count, ioText, mixerText, num, searchCapNotice} from './guide'
import type { GuideLayout } from './guide'
import {
  arrangement,
  bandTrajectory,
  chainPlan,
  isSustainedPart,
  noteInstruction,
  type BandGroup,
  type SectionChain,
} from './arrangement'
import { fxSources, type FxSource } from './fx'
import {
  noDuckers,
  pumpIsBoxByBox,
  sidechainReading,
  type Ducker,
  type SidechainReading,
} from './sidechain'

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
 *  - **The guide prints no citations and no provenance marks.** Invariant 4 is untouched by
 *    that: `ResolvedParam.provenance` is still non-optional, every value still carries its
 *    state, and the audit script still counts what is provisional. What changed is the
 *    audience. This page is read standing at a machine with both hands busy; a page number is
 *    something you follow at a desk. Be precise about where it went: a device page reports a
 *    box's provenance *counts* and the documents its ranges cite, and **no surface prints the
 *    page behind one value** any more — that lives in the device folder. See `DESIGN.md` §3.2,
 *    which records that as this decision's real cost rather than as a relocation.
 *  - **Hints are tagged subordinate lines** (§8.1). One tag, one line each, never inline after
 *    the value — see `SUBORDINATE`.
 *  - **No locale-dependent formatting** (§7.2): no `toLocaleString`, no `Intl`. Numbers go
 *    through `String`, which is specified exactly and is the same on every platform.
 */

// ---------------------------------------------------------------------------
// The shape of the document
// ---------------------------------------------------------------------------

/**
 * §8.1. Hints and authored notes are *subordinate* to the instruction they hang under: each is
 * its own nested list item, opened by a fixed tag.
 *
 * A line rather than an inline suffix, because §8.1's requirement is that toggling hints must
 * not reflow the page — and an inline hint reflows the instruction the moment the line wraps.
 * A whole line is what a UI can hide into a reserved column (or a reserved second grid row on a
 * phone) by changing `visibility` alone. That is also why the tag is a *literal constant* here
 * and not a formatting flourish: it is the seam a later UI keys on.
 *
 * Two kinds and not one, because they are suppressible independently. `Show hints` is a
 * documented toggle for jogs you have outgrown; an authored note is part of the instruction and
 * is not something a reader turns off to go faster.
 */
export const SUBORDINATE = {
  hint: '↳ hint:',
  note: '↳ note:',
} as const

/**
 * What the phase renderers actually need from `RenderOptions`: whether to print hint lines.
 * Named separately since #230 added `layout`, which is the composing function's business and
 * none of theirs — `Required<RenderOptions>` would hand all three phases a setting they must
 * ignore, and a setting a renderer must ignore is one somebody eventually reads by mistake.
 */
export type HintSetting = { hints: boolean }

export type RenderOptions = {
  /**
   * §8.1's **Show hints**, on by default. `false` omits every `↳ hint:` line and changes
   * nothing else — the export equivalent of the CSS toggle, and the property is worth having
   * testable here rather than only in a stylesheet.
   */
  hints?: boolean
  /**
   * §8/#230. `'phase'` is §8's order and stays the default, so nothing moves for a reader who
   * asks for nothing. `'sequencer'` groups the middle three phases by the box they are performed
   * at. Same content either way — see `GUIDE_LAYOUTS`.
   */
  layout?: GuideLayout
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------


/** Names in prose: "the L-8", "the L-8 and the 2400", "a, b, and c". */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
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
 * §3.2's rendered column: `52`, or `52 → 45` — the arrow appears exactly when mood moved the
 * value, which for a `provisional` point is still true and still shown. It is not a mark and does
 * not survive as one: it says what the number *was*, which is a fact about the dial rather than
 * about who checked it.
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
 * **Nothing is marked, and that is the whole of the convention.**
 *
 * The guide used to end a value with the word its provenance earned — ` · manual`, ` · observed`,
 * ` · moved by darkness` — and hang the page it came from underneath. Both are gone from this
 * document. §8 says the guide is read at the machine, and at the machine a citation is a line you
 * step over on the way to the number: you cannot go and open the book, and the mark tells you
 * nothing you can act on with your hands on a knob. The legend says once, at the top, what every
 * value on the page is — a starting point — and that is the only reading convention left to learn.
 *
 * **The evidence is still carried; it is no longer rendered anywhere per value.** Provenance is
 * on every `ResolvedParam` (invariant 4 is a type guarantee and is untouched) and the audit script
 * still counts provisional points and unverified ranges. A device page adds, for one box, those
 * counts, the documents its ranges cite by name, the field paths of anything unsettled, and four
 * citations of its own — panel span, warm-up, quick tune, calibration.
 *
 * **A reader who wants to know where `DECAY 38` came from has nowhere on the site to look.** That
 * is the honest statement and it is worse than "it moved to the device page"; the page behind one
 * value now lives only in `lib/devices/`. `DESIGN.md` §3.2 records it as an accepted cost and puts
 * the repair on the device page — not here.
 *
 * **What this file must never do is let the absence of a mark become a claim.** A fact that was
 * only honest because it wore ` · unchecked` has to say so in its own prose or not be printed —
 * see `unsettledText` and `controlPositionText`, which carry their state in the sentence.
 */

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
function phaseSong(result: ResolveResult): Line[] {
  const { template, song } = result
  const out: Line[] = []

  const findings = songFindings(song)
  const range = `template range ${num(template.bpm.min)}…${num(template.bpm.max)}`

  // #161. `bpmSource` rather than a comparison against the range: a user may set the tempo the
  // direction would have chosen anyway, and it is still theirs and still survives a reroll.
  out.push(
    `- **BPM** ${num(song.bpm)} (${song.bpmSource === 'user' ? `you set this; ${range}` : range})`,
  )
  for (const note of findings.bpm) subordinate(out, '  ', 'note', note)

  if (song.key === undefined) {
    out.push('- **Key** — this template has none, so the hooks below have no notes')
  } else if (song.keySource === 'user') {
    // Never "a reroll may pick": a reroll will not touch a key somebody chose, and telling them
    // otherwise sends them rerolling after a key they already have.
    const offered = song.keys.length === 0 ? '' : `; template offers ${song.keys.join(', ')}`
    out.push(`- **Key** ${song.key} (you set this${offered})`)
  } else {
    const others = song.keys.filter((k) => k !== song.key)
    const alternatives = others.length === 0 ? '' : ` (a reroll may pick ${others.join(', ')})`
    out.push(`- **Key** ${song.key}${alternatives}`)
  }
  for (const note of findings.key) subordinate(out, '  ', 'note', note)
  out.push(`- **Harmonic cycle** ${num(template.harmony.cycleBars)} bars`)
  out.push('')

  out.push('| Degree | Bars |')
  out.push('| --- | ---: |')
  for (const step of template.harmony.progression) {
    out.push(`| ${step.degree} | ${num(step.bars)} |`)
  }
  out.push('')

  out.push(...arrangementGrid(result))
  return out
}

/**
 * §4.2/#297. The arrangement drawn to scale, in the one place a monospace block is the right tool.
 *
 * This replaced a `| Section | Bars | Energy |` table, and the reason is the part the table could
 * not hold: **which parts play where**. That fact was already in the guide, at the tail of phase
 * 2's bullets — `p3, optional · sub on the Deluge · Build, Breakdown` — where comparing twelve
 * parts means diffing twelve comma lists. Comparison is the whole job of an arrangement.
 *
 * **A fenced block rather than a Markdown table, because sections are not equal length.** A
 * 32-bar Drop against a 16-bar Intro is the shape of the track, and a table renders every column
 * the same width, which draws the opposite of the fact. Column widths here are integer character
 * counts derived from bars, so the picture is to scale and nothing float-shaped reaches the page
 * (invariant 6).
 *
 * **A name is never truncated to fit.** The width is the larger of the scaled bar count and the
 * section's own name, so a `Breakdown` stays a `Breakdown` and the proportions bend around it.
 * Squeezing `Breakdown` into `Break` would be the renderer lying about a template's own word to
 * protect a picture, which is the wrong way round.
 *
 * Energy stays a number rather than becoming a meter. The web guide has room to draw one; here the
 * value is more precise and costs less width, and the meter the old table drew was ten cells
 * wide per row, in a block that has none to spare.
 */
function arrangementGrid(result: ResolveResult): Line[] {
  const out: Line[] = []
  const plan = arrangement(result)
  out.push(`**Arrangement** — ${num(plan.totalBars)} bars total`)
  out.push('')

  // Integer arithmetic throughout: `TARGET` character columns shared out by bars, floored, never
  // narrower than the section's own name. No `Math.round` on a ratio, so no platform can disagree.
  const TARGET = 60
  const widths = plan.columns.map((column) =>
    Math.max(
      column.name.length + 1,
      Math.max(4, Math.floor((column.bars * TARGET) / Math.max(1, plan.totalBars))),
    ),
  )
  const label = Math.max(10, ...plan.rows.map((r) => r.role.length)) + 2
  const pad = (text: string, width: number): string =>
    text.length >= width ? text : text + ' '.repeat(width - text.length)
  const line = (head: string, cells: readonly string[]): string =>
    (pad(head, label) + cells.map((c, i) => pad(c, widths[i] as number)).join('')).trimEnd()

  out.push('```')
  out.push(line('', plan.columns.map((c) => c.name)))
  out.push(line('', plan.columns.map((c) => `${num(c.bars)}b`)))
  out.push(line('energy', plan.columns.map((c) => num(c.energy))))
  if (plan.rows.length === 0) {
    out.push('')
    out.push('(no parts assigned)')
  } else {
    out.push('')
    for (const row of plan.rows) {
      out.push(
        line(
          row.role,
          row.plays.map((p, i) => (p ? '█' : '·').repeat((widths[i] as number) - 1)),
        ),
      )
    }
  }
  out.push('```')

  // Said in words as well as drawn, because a grid of full rows looks like a picture that failed
  // to load. It is instead the commonest true answer about this music, and worth claiming.
  if (plan.uniform) {
    out.push('')
    out.push('Every part plays throughout. The movement is in the patterns and the energy.')
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
/**
 * §12.4/#40. Where a part lives, when that may be more than one voice.
 *
 * "Tracks 3, 4 and 5" rather than "Track 3 (+2)": the reader is going to walk to the box and
 * touch all three, and a count is not a thing you can touch. `and` before the last, because this
 * is read aloud in the head at arm's length and a bare comma list reads as an abbreviation.
 */
function voicesLabel(assignment: ResolvedAssignment): string {
  const labels = assignment.assignables.map((a) => a.label)
  if (labels.length === 1) return labels[0] as string
  // §7.2: no `Intl.ListFormat`, no locale anywhere. Two joins and nothing to drift.
  const last = labels[labels.length - 1] as string
  return `${labels.slice(0, -1).join(', ')} and ${last}`
}

/** Device and voices, the pair every phase heading opens with. */
function whereText(assignment: ResolvedAssignment): string {
  return `${assignment.deviceName} · ${voicesLabel(assignment)}`
}

/** §12.4/#40. Whether this part is a chord spread across several voices, one note each. */
function isStacked(assignment: ResolvedAssignment): boolean {
  return assignment.assignables.length > 1
}

function realisationText(assignment: ResolvedAssignment): string {
  if (assignment.notes <= 1) return ''
  if (isStacked(assignment)) {
    return `${count(assignment.notes, 'note')} stacked one per voice`
  }
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
  if (isStacked(assignment)) {
    return (
      `Polyphony — ${notes}, one on each of ${n} voices. **Every voice takes these same ` +
      `settings**: it is one sound played ${n} times over, not ${n} sounds, and a difference ` +
      `between them is a difference you will hear inside the chord. Which voice takes which ` +
      `note is in Hook.`
    )
  }
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
 * The shortfall is measured off the rig rather than assumed: "every voice here is monophonic" is
 * common but a rig whose pad voices top out at four notes is a different sentence, and saying the
 * monophonic one would be false. The general form names the real ceiling.
 *
 * **And it names what to do (#40, #128).** The resolver stacks a chord across a *pool* on its
 * own, so a surviving `polyphony` gap is one of two situations with different advice, told apart
 * by counting the voices that declare the role:
 *
 *  - **Enough voices, not interchangeable.** Three monosynths, or three named voices on one box.
 *    The reader can play the chord across them exactly as the engine would across a pool. It is
 *    not automated because separately authored voices each sound different (see `canStackNotes`),
 *    which is a reason to leave the choice to the person who can hear them — and a reason the
 *    sentence has to warn that they need matching.
 *  - **Not enough voices.** Hand-stacking is not available either, and saying so is the whole of
 *    the honest answer. Counting them is the only way to tell the reader which case they are in
 *    without going and looking.
 */
function polyphonyShortfall(notes: number, roleVoices: Gap['capable']): string {
  const ceiling = roleVoices.reduce((most, a) => Math.max(most, a.polyphony), 0)
  const short =
    ceiling <= 1
      ? 'every voice here is monophonic'
      : `the most any voice here can sound is ${count(ceiling, 'note')}`
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
 * §7.3. Said in words, because a reason code is not an answer to "why is there no kick".
 *
 * The `not-needed` kind has no branch here and cannot reach this function: its account is the
 * template's authored sentence, printed under its own heading. The `unauthored` line no longer
 * carries "capable but unauthored" either — the heading above it says that once, for every line
 * under it, and repeating the state in each line is how #123 collapsed three states back into
 * one word.
 */
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
  return `${capableText(gap.capable, deviceById)} could carry it, dial it by ear`
}

/**
 * §7.5/#340. Why a placement was not applied, in the guide's own words.
 *
 * **Keyed by the union rather than switched on.** `PLACEMENT_REFUSALS` is the single semantic
 * decision — a fifth kind is a change to what the resolver can mean, and it has to fail to
 * compile here and again in the web guide's own copy of this table rather than fall through a
 * `default` into a sentence that says nothing.
 *
 * **`detail` is printed verbatim, and first.** It is the resolver's sentence about *this* rig:
 * which box, which role, how many notes, which part is already sitting there. Nothing here
 * re-derives any of it — `cannot-serve` alone has four different answers behind it (#329/#334),
 * and a renderer that decided which one applied would be a second opinion on a question §7.5 has
 * already answered. What is added is only what to do about it.
 */
const REFUSAL_PROSE: Record<PlacementRefusal, (detail: string) => string> = {
  'unknown-request': (detail) =>
    `${detail}, so nothing was moved; the link is older than this direction, or was typed by hand`,
  'device-not-in-rig': (detail) =>
    `${detail}, so nothing was moved; tick that box in the picker and ask for it again`,
  'cannot-serve': (detail) => `${detail}, so this part is where the ranking put it instead`,
  'conflicted': (detail) =>
    `${detail}, so this one gave way and is where the ranking put it instead`,
}

function refusalText(refused: RefusedPlacement): string {
  return REFUSAL_PROSE[refused.because](refused.detail)
}

function phaseVoiceAssignment(result: ResolveResult, deviceById: Map<DeviceId, Device>): Line[] {
  const out: Line[] = []

  /**
   * §7.1/#228. **Here, because this is the phase the cap affected.**
   *
   * A capped search returns a worse *allocation* — same parts, same shape, different boxes
   * carrying them — and this phase is where the guide says which box carries what. Putting the
   * notice at the top of the document instead would make it a disclaimer about the whole guide,
   * when every value in it is exactly as good as it always was; putting it in the gap headings
   * below would file it with things the rig cannot do, and this is not one of those.
   */
  const capped = searchCapNotice(result.search)
  if (capped !== undefined) {
    out.push(`**${capped.headline}**`)
    out.push('')
    for (const line of capped.detail) {
      out.push(line)
      out.push('')
    }
  }

  if (result.assignments.length === 0) {
    out.push('No parts assigned. Every part this direction asks for is accounted for below.')
  } else {
    // Per part, not a five-column table. This is read on a phone at arm's length beside a box:
    // a table that needs horizontal scrolling hides the column you were reading, while a bullet
    // that is too long simply wraps. Same five facts, in the same order, reflowable.
    for (const a of result.assignments) {
      const sections =
        a.sections.length === result.template.structure.length
          ? 'every section'
          : a.sections.join(', ')
      const where = whereText(a)
      const realisation = realisationText(a)
      out.push(`- **\`${a.role}\`** → ${where} — *${a.recipe.title}*`)
      out.push(
        `  - p${num(a.priority)}${a.optional ? ', optional' : ''} · ${recipeWhy(a)}` +
          `${realisation === '' ? '' : ` · ${realisation}`} · ${sections}`,
      )
    }
  }

  /**
   * §7.5/#340. **Here, and above the gaps.** A refused placement is not a hole in the rig — the
   * part is in the list right above this, on the box the ranking chose — so filing it under
   * `Gaps` would tell a reader their track is missing something they can hear. It sits with the
   * parts because that is where somebody who moved one goes looking for it.
   *
   * Omitted entirely when nothing was refused, which is every guide that placed nothing: the
   * heading exists only where there is something under it, exactly as `Waiting on us` does.
   * `refused` is already in `resolvePlacements`' canonical order, never the caller's.
   */
  if (result.placements.refused.length > 0) {
    out.push('')
    out.push('### Placements not applied')
    out.push('')
    out.push(
      'You asked for these parts on a particular box. Each line says why the guide could not ' +
        'do it — the part itself is where the ranking put it, unless a gap below says otherwise.',
    )
    out.push('')
    for (const one of result.placements.refused) {
      out.push(`- \`${one.requestId}\` → \`${one.deviceId}\` — ${refusalText(one)}`)
    }
  }

  out.push('')
  // §7.3/#81. Three headings, because the three kinds are three different things to do about
  // them — and a reader who has to work out which of the three a line is talking about has been
  // told the thing the old single list was hiding.
  out.push('### Gaps')
  out.push('')
  const limits = shortfallsOfKind(result.shortfalls, 'rig-limit')
  if (limits.length === 0) {
    out.push('None.')
  } else {
    // Invariant 5: shown, never filled by inventing an assignment.
    out.push('This rig cannot make these parts. They are not in the guide below.')
    out.push('')
    for (const gap of limits) out.push(shortfallLine(gap, gapText(gap, deviceById)))
  }

  // Both sections below are omitted when empty rather than printing "None." three times: an
  // absent heading says the same thing in less space, and only `Gaps` is worth reassuring
  // somebody about.
  const unauthored = shortfallsOfKind(result.shortfalls, 'unauthored')
  if (unauthored.length > 0) {
    out.push('')
    out.push('### Waiting on us')
    out.push('')
    out.push(
      'Your rig can make these. Nobody has written the recipe yet, so they are not in the ' +
        'guide below — that is our backlog, not a limit of your boxes.',
    )
    out.push('')
    for (const gap of unauthored) out.push(shortfallLine(gap, gapText(gap, deviceById)))
  }

  const notNeeded = shortfallsOfKind(result.shortfalls, 'not-needed')
  if (notNeeded.length > 0) {
    out.push('')
    out.push('### Not needed for this direction')
    out.push('')
    out.push(`${result.template.name} is finished without these.`)
    out.push('')
    for (const gap of notNeeded) out.push(shortfallLine(gap, gap.rationale))
  }
  return out
}

/**
 * One line per unfilled request, identical in all three sections: same five facts in the same
 * order, so the difference between the sections is the heading and the sentence and nothing
 * else. `optional` is not printed — every optional request is `inessential` by §4.4, so the tag
 * could only ever appear under a heading that has already said it.
 */
function shortfallLine(shortfall: Shortfall, sentence: string): string {
  return (
    `- \`${shortfall.role}\` \`${shortfall.character}\` ` +
    `(p${num(shortfall.priority)}) — ${sentence}`
  )
}

// ---------------------------------------------------------------------------
// Phase 3 — Rig integration
// ---------------------------------------------------------------------------



/**
 * §7.4/#121/#144. **"Sync everything else to it"**, and the two rigs where that is not a sentence.
 *
 * #121 added the exception clause: a box that cannot take a clock over *the transport this rig
 * resolved* runs free whatever the source is doing, and naming it here beats leaving a reader to
 * discover it at the machine, staring at a box with no socket for the cable in their hand.
 *
 * #144 is the layer under that. The instruction addresses *everything else*, and both renderers
 * printed it without ever asking whether "everything else" had members:
 *
 *  - **One box in the rig.** There is no rack to sync. The guide told somebody standing in front
 *    of a single Deluge to go and cable up boxes they do not own.
 *  - **Every other box exempted.** "Sync everything else to it, except A and B" over a rig of
 *    exactly A and B is an instruction to sync nothing, written in the grammar of an instruction
 *    to do something — and it is the harder of the two to catch, because every word in it is
 *    individually true.
 *
 * So the sentence is chosen by `followers`, never printed and then qualified. The exemptions are
 * still named in both of the last two cases: a reader wants to know *which* box runs free far
 * more than they want the clause to be short.
 *
 * Restated in `components/guide/format.ts` for the web guide, from the same `ClockFollowing`:
 * one right answer, two hand-written vocabularies, which is the standing rule for every sentence
 * in §8. `test/guide-view.test.ts` holds the two copies to the same facts.
 */
function syncText(following: ClockFollowing, transport: string): string {
  if (following.alone) return 'Nothing else is here to sync to it.'
  const clauses: string[] = []
  // §7.4/#79. A box a computer drives is split out of `deaf` before the clause is built. It is
  // still deaf — no clock reaches it and no cable is drawn — but "runs free" is false in the one
  // workflow it is built for, and the guide cannot see whether a reader is in that workflow. So
  // the sentence states the condition rather than picking a side.
  const driven = following.deaf.filter((d) => d.dawTransport !== undefined)
  const free = following.deaf.filter((d) => d.dawTransport === undefined)
  if (free.length > 0) {
    clauses.push(
      `${list(free.map((d) => d.name))}, which cannot receive clock and ` +
        `${free.length === 1 ? 'runs' : 'run'} free`,
    )
  }
  if (driven.length > 0) {
    clauses.push(
      `${list(driven.map((d) => d.name))}, which cannot receive clock — a DAW drives ` +
        `${driven.length === 1 ? 'its' : 'their'} transport over ` +
        `${list([...new Set(driven.map((d) => d.dawTransport?.protocol ?? ''))])}, and without one ` +
        `${driven.length === 1 ? 'it runs' : 'they run'} free`,
    )
  }
  if (following.unwired.length > 0) {
    clauses.push(
      `${list(following.unwired.map((d) => d.name))}, which ` +
        `${following.unwired.length === 1 ? 'has' : 'have'} no \`${transport}\` input and ` +
        `${following.unwired.length === 1 ? 'runs' : 'run'} free`,
    )
  }
  // Each clause carries its own "runs free" rather than one shared tail. With both kinds present
  // a shared tail would have to reach back across two different reasons, and a reader skimming at
  // the machine would have to hold the whole sentence to know which boxes it covers.
  if (following.followers.length === 0) return `Nothing else here can follow it: ${clauses.join(', and ')}.`
  if (clauses.length === 0) return 'Sync everything else to it.'
  return `Sync everything else to it, except ${clauses.join(', and ')}.`
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
 * boxes that were asked and declined are not this phase's subject, and a line per box is the
 * 14%-of-the-guide mistake #35 records.
 *
 * The line used to carry the chosen box's evidence — its state's mark and a `↳ cite:` beneath —
 * and it carries neither now. What survives is the basis itself, which is the half a reader at
 * the rack acts on. What the manifest recorded at `clock.preferredSource` stays in the manifest:
 * it is capability evidence, §8 renders none, and `clockBasisEvidence` went with the last thing
 * that asked for it.
 */
function clockBasisText(source: ClockSource): string {
  switch (clockSourceBasis(source)) {
    // #200. The reader put this box in charge, so there is nothing to justify — every other
    // branch here exists to answer "why this one" for somebody who did not decide it. Saying
    // "you chose it" also keeps the promise the others make: a derived answer and a person's
    // judgement never reach a reader in the same words, which is the rule stated below for
    // `interDeviceBasisText` and the reason `claimed` is worded as a fact about the box.
    case 'chosen':
      return 'Why this box — you chose it'
    // #144 leaves this one alone, and the reason is the whole rule: it asserts no comparison.
    // "Its manual says leading a rig is its job" is a fact about this box, true whether it was
    // ranked against ten others or against none. Only a sentence claiming that something was
    // *settled* needs candidates to have settled it against.
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
    // #144. "Transport, then name, settled it" names two tie-breaks, and at a rig with one box
    // that can send clock neither of them ran: the sort was over a list of one and nothing was
    // compared. `eligible` is the count of boxes that could have been ranked, which is the fact
    // this sentence rests on and the one it never had.
    default:
      return source.eligible === 1
        ? 'Why this box — it is the only box here that can send clock'
        : 'Why this box — nothing here claims that job, so transport, then name, settled it'
  }
}

/**
 * §3.3/#121. **Why this box sends the notes** — the same discipline as `clockBasisText` above, for
 * the same reason: a deterministic fallback and a person's judgement must not reach a reader in
 * identical words, because the fallback is the one that then reads like advice.
 *
 * `clock-source` is the key this pass has and §7.4 does not, and it is the one that means the most
 * to somebody standing at a rack: the box already driving the tempo is the box the cables are
 * already going to.
 */
function voiceBasisText(source: VoiceControlSource): string {
  switch (source.basis) {
    case 'clock-source':
      return 'Why this box sends them — it is already the clock source, so the cables run from where the tempo does'
    case 'claimed':
      return 'Why this box sends them — its manual says leading a rig is its job'
    case 'contested':
      return (
        `Why this box sends them — ${num(source.claims)} boxes here claim that job, ` +
        'so the names settled it'
      )
    // #144, the same rule one tier down, and the same branch of it: only this one asserts that a
    // ranking happened. `ranked` counts every note-and-gate pair offered anywhere in the rig and
    // `candidates` counts this box's, so they are equal exactly when no other box offered one —
    // and "the names settled it" is then a comparison with nothing on the other side. The two
    // branches above are untouched, because "it is already the clock source" and "its manual says
    // so" are facts about this box that hold however many others were asked.
    default:
      return source.ranked === source.candidates
        ? 'Why this box sends them — it is the only box here that sends a note and a gate together'
        : 'Why this box sends them — nothing here claims that job, so the names settled it'
  }
}

/**
 * §3.3. **What to patch so a box actually plays**, and what to do when nothing can.
 *
 * Both device names and both jack ids on every line, because the reader is at a rack looking for a
 * silkscreen and "patch pitch and gate" is not an instruction. The ids are section-qualified
 * exactly as the panel prints them, which is why they are in backticks rather than in prose.
 *
 * Three outcomes, three different things to say (§7.3). `no-target` says nothing at all — a rig of
 * grooveboxes is not missing a cable — and the other two are gaps a reader can act on, so they get
 * words rather than an absence.
 */
function voiceControl(patch: InterDevicePatch): Line[] {
  if (patch.outcome === 'no-target') return []
  const out: Line[] = []
  const source = patch.source

  const routed = patch.targets.filter((t) => t.outcome === 'routed')
  if (source !== undefined && routed.length > 0) {
    out.push(
      `**Voice control** — ${source.deviceName} sends the notes, ` +
        `${count(routed.length * 2, 'cable')} in all. Patch each pair before you play anything:`,
    )
    out.push('')
    for (const target of routed) {
      for (const cable of target.cables) {
        out.push(
          `- ${cable.signal === 'gate' ? 'gate' : 'pitch'}: ` +
            `${cable.fromDeviceName} \`${cable.fromJack}\` → ` +
            `${cable.toDeviceName} \`${cable.toJack}\``,
        )
      }
    }
    out.push('')
    out.push(`- ${voiceBasisText(source)}`)
  }

  // The gaps. Named per box, because which box is unplayable is the whole content of the sentence.
  const exhausted = patch.targets.filter((t) => t.outcome === 'source-exhausted')
  if (exhausted.length > 0 && source !== undefined) {
    out.push('')
    out.push(
      `**Not driven** — ${source.deviceName} offers ` +
        `${count(source.candidates, 'pitch-and-gate pair')} and this rig needs more. ` +
        `${list(exhausted.map((t) => t.deviceName))} ` +
        `${exhausted.length === 1 ? 'is' : 'are'} left unpatched:`,
    )
    out.push('')
    for (const target of exhausted) {
      out.push(
        `- ${target.deviceName} \`${target.pitchJack}\` and \`${target.gateJack}\` — ` +
          'nothing to plug in. Play it from its own keyboard or sequencer.',
      )
    }
  }

  const orphaned = patch.targets.filter((t) => t.outcome === 'no-compatible-source')
  if (orphaned.length > 0) {
    out.push('')
    out.push(
      '**No voice control** — nothing in this rig sends a note and a gate together. ' +
        `${list(orphaned.map((t) => t.deviceName))} ` +
        `${orphaned.length === 1 ? 'takes' : 'take'} one:`,
    )
    out.push('')
    for (const target of orphaned) {
      out.push(
        `- ${target.deviceName} \`${target.pitchJack}\` and \`${target.gateJack}\` — ` +
          'play it from its own keyboard or sequencer, or add a box that can drive it.',
      )
    }
  }
  return out
}

/**
 * §8/#240. `detail` is which boxes get a block of their own here.
 *
 * The phase layout passes every device, as this phase always did. The sequencer layout passes only
 * the boxes no section covers — a mixer, an fx-processor, anything carrying no parts (§2.4) — and
 * each remaining box's block is printed in the section where its parts are worked. The rig-wide
 * half above, the clock source and what it rests on, is the same either way: it is a fact about
 * the rig and belongs where the rig is described.
 */

/**
 * A sentence fragment from an authored `note`, which is written to stand alone on the device page
 * and follows a box name here. Only the first letter moves, and only when it is a plain capital —
 * "10 to 15 minutes" keeps its digit and "A few minutes" becomes "a few minutes".
 */
function lowerFirst(text: string): string {
  const head = text.slice(0, 1)
  return head >= 'A' && head <= 'Z' ? head.toLowerCase() + text.slice(1) : text
}

function phaseRig(
  result: ResolveResult,
  occupied: Map<DeviceId, number>,
  detail: readonly Device[] = result.devices,
): Line[] {
  const out: Line[] = []
  const source = result.clockSource

  /**
   * §10/#263. **Power these on first**, before any of the cabling below.
   *
   * First in the phase because it is the only instruction here that costs nothing to start and
   * everything to start late: ten minutes of warm-up runs while you patch, and a reader who meets
   * it at the end has already spent that time doing something else.
   *
   * One line for the rig rather than one per box (#35). The boxes without an entry say nothing —
   * most of the library is digital and needs none — and a rig with no analog instrument in it
   * gets no heading at all rather than an empty one.
   */
  /**
   * `result.devices`, **not `detail`**. Every other block in this phase is narrowed by `detail`,
   * because the sequencer layout hands each box's patching to the group its parts are worked in
   * and passes only what is left. Warm-up is not that kind of fact: it is about the rig in front
   * of the reader, and a Minitaur inside a sequencer group still has to be switched on early.
   *
   * Caught by `guide-layout.test.ts`'s permutation check, which is exactly what that test is for
   * — the phase layout listed the box and the sequencer layout silently did not.
   */
  const warming = warmUpNotices(result.devices)
  if (warming.length > 0) {
    // `count` pluralises by adding an `s` unless told otherwise, so "boxes" is passed rather than
    // discovered — the same note `clockBasisText` carries about "2 boxs".
    const one = warming.length === 1
    out.push(
      `**Power on first** — ${count(warming.length, 'box', 'boxes')} here ` +
        `${one ? 'needs' : 'need'} time before ${one ? 'it holds' : 'they hold'} pitch. ` +
        `Switch ${one ? 'it' : 'them'} on now and patch while ${one ? 'it settles' : 'they settle'}.`,
    )
    for (const { device, warmUp } of warming) {
      out.push(`- **${device.name}** — ${lowerFirst(warmUp.note)}`)
    }
    out.push('')
  }

  /**
   * §10/#263. **Then touch up the ones that can be.** Straight after warm-up, because that is when
   * it is done: a quick tune reads the current temperature, so running it cold is running it on
   * the wrong conditions.
   *
   * Rig-wide like the block above, and for the same reason — `result.devices`, not `detail`.
   */
  const tunable = quickTuneNotices(result.devices)
  if (tunable.length > 0) {
    for (const { device, quickTune } of tunable) {
      out.push(
        `**Once warm** — run ${device.name}'s quick tune: \`${quickTune.path}\`. ` +
          `${quickTune.note}.`,
      )
    }
    out.push('')
  }

  if (source === undefined) {
    // §7.4: a real rig, and a fact to state rather than paper over.
    out.push('**Clock** — nothing in this rig can send clock. Every box here has to receive one,')
    out.push('so the clock has to come from something outside it.')
  } else {
    // §7.4/#144. "Sync everything else to it" is an instruction with a subject, and the subject
    // has to exist. `clockFollowing` decides who is in it; this writes the sentence.
    out.push(
      `**Clock source** — ${source.deviceName} over \`${source.transport}\`, ` +
        `carrying ${count(source.occupiedAssignables, 'part')}. ` +
        `${syncText(clockFollowing(result.devices, source.deviceId, source.transport), source.transport)}`,
    )

    const sourceDevice = result.devices.find((d) => d.id === source.deviceId)

    /**
     * §7.4/#121. The basis, and — where the manifest recorded one — what it read when it decided.
     *
     * The basis alone now. `clockBasisText` states which of §7.4's rules picked this box, which
     * is the half a reader standing at the rack can act on; what the manifest recorded about
     * whether leading a rig is this box's job stays in the manifest, and §2.6 records that the
     * device page is where it should reach a reader.
     */
    out.push('')
    out.push(`- ${clockBasisText(source)}`)

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
      out.push(`- On the ${source.deviceName}, set \`${setup.path}\` to \`${setup.value}\``)
      // The note stays: it is the device's own words about the setting, and a reader acts on it.
      // Its evidence does not, and no page prints it — `clock.sourceSetup[<transport>]`'s citation
      // is in the manifest only (§3.2).
      if (setup.note !== undefined) subordinate(out, '  ', 'note', setup.note)
    }
  }
  out.push('')

  // §3.3. After the clock and before the per-box list, which is the order somebody patches a rack
  // in: sync first, then the cables that make a box play, then what each box's own outputs do.
  const voice = voiceControl(result.interDevicePatch)
  if (voice.length > 0) {
    out.push(...voice)
    out.push('')
  }

  out.push(...deviceRigBlocks(detail, occupied, source))
  return out
}

/**
 * §8/#240. One box's clock, sockets, audio and mixer channel — the half of phase 3 that is about a
 * device rather than about the rig.
 *
 * Lifted out of `phaseRig` so the sequencer layout can print it in the section where that box's
 * parts are worked, instead of four sections above them. Identical lines either way: this is the
 * same block moved, not a second rendering of it, which is what keeps the two layouts a
 * permutation of one another.
 */
function deviceRigBlocks(
  devices: readonly Device[],
  occupied: Map<DeviceId, number>,
  source: ClockSource | undefined,
): Line[] {
  const out: Line[] = []
  // One block per box rather than a table plus a second list keyed by name. Two renderings of
  // the same three devices made the reader join them by eye, on the phase whose whole job is
  // "what do I plug where" — so clock, audio and channel plan sit together, per box.
  for (const device of devices) {
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
    // #103. The wires, and — for a box whose two directions differ — which way each one goes.
    // The Mother-32 is why the labelled form exists: one list read "sends clock ·
    // midi-din/analog-clock" on a box with no MIDI output at all.
    const wires = clockWires(device)
    const clock =
      wires.kind === 'none'
        ? clockText
        : wires.kind === 'both'
          ? [clockText, wires.transport.join('/')].join(' · ')
          : [clockText, `out: ${wires.send.join('/')}`, `in: ${wires.receive.join('/')}`].join(' · ')

    out.push(`- **${device.name}** — ${device.kind} · ${count(parts, 'part')}`)
    out.push(`  - clock: ${clock}`)
    // #103. Whatever this box's manual says about the sockets *this* rig's clock runs through —
    // the Tracker Mini's Type B adapter is the case. Filtered by the resolved transport and
    // deduped by `clockJackNotes`, so a USB rig hears nothing about a MIDI adapter and a note
    // true of both the In and the Out is printed once.
    if (source !== undefined) {
      for (const jackNote of clockJackNotes(device, source.transport)) {
        out.push(`  - ${jackNote.jacks.join(', ')}: ${jackNote.note}`)
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

/**
 * #142. **A note's duration, in the unit that reads at a glance and the one you can enter.**
 *
 * Steps first, because that is the number that goes into a step field and the one the position on
 * the same line is counted in. Bars in brackets, because past about a bar the step count stops
 * meaning anything: `6 steps` is six sixteenths and reads instantly, `128 steps` is arithmetic
 * somebody is doing at a rack with their hands busy (§8), and the same line already converts the
 * *position* into bars while leaving the length raw.
 *
 * **The gloss decomposes; it never divides.** 24 steps is `1 bar 8 steps`, not `1.5 bars` and
 * never `0.375 bars` — which is what a length shorter than a bar would have become under any
 * format that reached for a fraction. Under a bar there is no gloss at all: the number already
 * reads, and a bracket saying so is noise on every line of every drum part.
 */
/**
 * §8/#142. **A note a bar or longer leads with bars and is called *held*.**
 *
 * Reported from a machine: a reader saw `sounds for 64 steps (4 bars)` in a list whose every other
 * line is a step to program, read it as sixty-four steps to enter, and went looking for the bug
 * when the Deluge showed one. There was no bug — the pad is one note held for four bars, and the
 * guide says so two lines above in the box's own words: *hold its start pad and press its end
 * pad*. The number was right and the shape of the sentence was wrong.
 *
 * So the long case reads `held for 64 steps (4 bars)`. **The verb changes and the order does
 * not.** `held` is what separates a duration from a count of hits, and it is enough on its own.
 *
 * Leading with bars was tried and backed out: `format.ts` argues steps first *"because that is the
 * number a step field takes and the unit the position on the same line is already counted in"*,
 * which is a better reason than the one for reordering. Under a bar nothing changes either —
 * `sounds for 3 steps` was never ambiguous, there being no bar gloss to misread it against.
 */
function durationPhrase(len: number): string {
  return `${len >= STEPS_PER_BAR ? 'held for' : 'sounds for'} ${durationText(len)}`
}

/**
 * Same, for a chord whose notes may differ in length — and it takes the **shortest**, not the
 * longest. `held for` has to be true of every note it introduces: a chord of 4 steps and 2 bars
 * reading "held for 4 steps / 2 bars" says the wrong thing about the first note. One verb cannot
 * describe two lengths, so the neutral one wins whenever they disagree across the bar line.
 */
function durationsPhrase(notes: readonly ResolvedNote[]): string {
  const shortest = Math.min(...notes.map((n) => n.len))
  return `${shortest >= STEPS_PER_BAR ? 'held for' : 'sounds for'} ${durationsText(notes)}`
}

function durationText(len: number): string {
  if (len < STEPS_PER_BAR) return count(len, 'step')
  const bars = Math.floor(len / STEPS_PER_BAR)
  const rest = len % STEPS_PER_BAR
  const gloss = rest === 0 ? count(bars, 'bar') : `${count(bars, 'bar')} ${count(rest, 'step')}`
  return `${count(len, 'step')} (${gloss})`
}

/**
 * One duration when the chord agrees, otherwise each — `lenText` with #142's unit and #142's
 * word. Insertion order, which is note order, so the same chord prints the same way every time.
 */
function durationsText(notes: readonly ResolvedNote[]): string {
  const lens = [...new Set(notes.map((n) => n.len))]
  return lens.map(durationText).join(' / ')
}

function spelling(note: ResolvedNote): string {
  const enharmonic = enharmonicAlternative(note)
  return enharmonic === undefined ? `\`${note.note}\`` : `\`${note.note}\` (\`${enharmonic}\`)`
}

/**
 * Exported since #230 so the cross-layout fixture can name these lines rather than matching their
 * prose. Under the sequencer layout the hook renderer runs once per box that carries a hook, so
 * this block repeats — deliberately, because §8 has the reader standing at one machine reading one
 * section, and the convention belongs beside the notes it governs rather than four sections up.
 * It is the one thing the two layouts do not render the same number of times, and the fixture
 * asserts that it is the *only* one.
 */
export const NOTE_CONVENTION = [
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
 * §2.6/#142. **How the box in front of the reader ends a note**, in one sentence above the notes
 * it governs.
 *
 * The words are here and the *decision* is `noteDurationNotice` in `lib/core/device.ts`, which is
 * the arrangement `contentNotice` and `hoistedParams` already sit in (#33): one right answer,
 * two hand-written vocabularies. `components/guide/phase-hook.tsx` restates these, and
 * `test/guide-view.test.ts` asserts both copies rather than trusting the duplication.
 *
 * Every state is a sentence a reader can act on, `unknown` included. That one says outright that
 * the durations below are the *part* and not a field to fill in, which is the sentence #142's
 * reporter had to work out for themselves from a line reading `len 128`.
 */
function noteDurationText(notice: NoteDurationNotice): string {
  switch (notice.state) {
    case 'per-note-value':
      return (
        `Note length is set per note here — \`${notice.control}\`` +
        `${notice.unit === undefined ? '' : `, in ${notice.unit}`}.`
      )
    case 'tied-steps':
      return (
        'A step is one note long and nothing here sets a length: ' +
        `\`${notice.control}\` joins a note to the next step, and stacking those is how ` +
        'anything longer is entered.'
      )
    case 'until-next':
      return (
        'No note-length field on this box — a note runs until the next note on the same voice, ' +
        `and \`${notice.noteOff}\` is how you stop one sooner. The rows below are what you enter, ` +
        'in the order you enter them.'
      )
    case 'gate':
      return `Length here is a gate rather than a value in the pattern: ${notice.source}.`
    case 'trigger':
      return `A step is a trigger, not a note with a length: ${notice.reason}.`
    case 'unknown':
      return (
        'How this box sets a note’s length is not established here, so the durations below ' +
        'are the part rather than a field to fill in.'
      )
  }
}

function noteDurationLines(notice: NoteDurationNotice): Line[] {
  // The sentence and nothing under it. Every state of `noteDurationText` says its own finding in
  // prose — `unknown` opens by saying it is not established — so dropping the mark and the page
  // costs the reader the page and not the state.
  return [noteDurationText(notice), '']
}

/**
 * #142. **The note-off rows, interleaved with the notes in the order they are typed in.**
 *
 * On an `until-next` box the rows below are the pattern: a reader fills one voice top to bottom,
 * and a note-off is entered exactly the way a note is. Listing them separately would be a second
 * list to cross-reference against the first while holding a box, which is the failure #40 already
 * fixed one level up for stacked voices.
 *
 * `undefined` for every other state, because there is nothing to place.
 */
function noteOffRows(
  notice: NoteDurationNotice,
  notes: readonly ResolvedNote[],
  hook: ResolvedHook,
  framed: boolean,
): { step: number; line: string }[] {
  if (notice.state !== 'until-next') return []
  return noteOffSteps(notes, hook.bars * STEPS_PER_BAR).map((step) => ({
    step,
    line: `- ${whereOf(step, framed)} · \`${notice.noteOff}\``,
  }))
}

/** The position half of a row, the one place it is spelled. */
function whereOf(step: number, framed: boolean): string {
  return framed ? `bar ${num(barOf(step))} · step ${num(step)}` : `step ${num(step)}`
}

/**
 * #142. Rows and note-off rows in one list, in step order — the order they are typed in.
 *
 * A stable merge rather than a sort of the concatenation: `Array.prototype.sort` is only
 * guaranteed stable within one call, and two rows landing on one step must always come out in the
 * same order or invariant 6 is a coin toss. Ties keep the note ahead of the note-off, which is
 * also the only order that could be played — though `noteOffSteps` already drops an off that
 * lands on a note's step, so a tie here is a hand-built fixture rather than a hook.
 */
function merged(
  rows: readonly { step: number; line: string }[],
  offs: readonly { step: number; line: string }[],
): string[] {
  const out: string[] = []
  let i = 0
  for (const off of offs) {
    while (i < rows.length && (rows[i] as { step: number }).step <= off.step) {
      out.push((rows[i] as { line: string }).line)
      i++
    }
    out.push(off.line)
  }
  for (; i < rows.length; i++) out.push((rows[i] as { line: string }).line)
  return out
}

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

function sampledHookLines(
  hook: ResolvedHook,
  framed: boolean,
  notice: NoteDurationNotice,
): Line[] {
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
  const rows = triggers.map(({ voicing, occurrence }) => ({
    step: occurrence.step,
    line:
      `- ${whereOf(occurrence.step, framed)}` +
      (printsNoteDuration(notice) ? ` · ${durationsPhrase(occurrence.notes)}` : '') +
      ` · sample ${voicing.label} · ${transposeText(occurrence.semitones)} · ` +
      occurrence.notes.map(spelling).join(' '),
  }))
  // #142. A sample on an `until-next` box is stopped by the same gesture a note is, so the
  // note-offs belong in this list too — a trigger list that ended a sample by omission would be
  // the score-not-instruction failure in the one phase that already knew better.
  for (const row of merged(rows, noteOffRows(notice, hook.notes, hook, framed))) out.push(row)
  return out
}

/**
 * §12.4/#40. The hook, for a part stacked across several monophonic voices.
 *
 * **Oriented by voice, not by chord**, and that is the whole design of it. A per-chord table
 * ("bar 1: Track 3 = F2, Track 4 = Ab2, Track 5 = C3") is the same data and is unusable at the
 * machine: on a tracker you fill one track top to bottom and then move to the next, so a reader
 * following a per-chord list would enter one note, jump two columns, enter one note, jump back.
 * One block per voice is the order the notes actually get typed in.
 *
 * The assignment rule is stated once and then relied on — lowest note to the lowest voice — for
 * the reason it matters musically rather than for tidiness: keep it and the voicing holds its
 * shape as the progression moves, break it and the inner voices cross and the chord changes
 * character between bars without anything in the guide saying so.
 */
function stackPosition(index: number, width: number): string {
  if (index === 0) return 'lowest note'
  if (index === width - 1) return 'highest note'
  return `note ${num(index + 1)} from the bottom`
}

/**
 * Notes low to high, and a total order rather than a nearly-total one: two notes of one chord can
 * share a pitch (a doubled root an authored octave apart resolves to two `midi` values, but a
 * unison does not), so `degree` and `len` finish the comparison. No `localeCompare` (invariant 6).
 */
function lowToHigh(notes: readonly ResolvedNote[]): ResolvedNote[] {
  return [...notes].sort(
    (a, b) => a.midi - b.midi || a.degree - b.degree || a.len - b.len,
  )
}

function stackedHookLines(
  hook: ResolvedHook,
  framed: boolean,
  carriedBy: ResolvedAssignment,
  notice: NoteDurationNotice,
): Line[] {
  const out: Line[] = []
  const voices = carriedBy.assignables
  const width = voices.length
  const chords = chordsOf(hook).map((chord) => ({ step: chord.step, notes: lowToHigh(chord.notes) }))

  out.push(
    `Stacked chord — ${count(width, 'voice')}, one note each. There is no chord to play on ` +
      'any one of them.',
  )
  out.push('')
  out.push(
    `Lowest note to the lowest voice: **${(voices[0] as { label: string }).label}** takes the ` +
      `bottom of every chord and **${(voices[width - 1] as { label: string }).label}** the top. ` +
      'Hold that order and the voicing keeps its shape as the progression moves; cross the ' +
      'voices over and the chord changes character between bars with nothing here saying so.',
  )
  out.push('')
  // Invariant 5. A hook with more notes in a chord than the part has voices is a template and a
  // request disagreeing, and the honest thing is to say which notes have nowhere to go rather
  // than to drop them off the end of the list.
  const surplus = chords.filter((chord) => chord.notes.length > width)
  if (surplus.length > 0) {
    out.push(
      `${count(surplus.length, 'chord')} in this hook ${surplus.length === 1 ? 'has' : 'have'} ` +
        `more notes than this part has voices, so its top ${count(1, 'note')} and above are not ` +
        `placed below. The part asks for ${count(carriedBy.notes, 'note')}; the hook writes ` +
        `${num(Math.max(...surplus.map((c) => c.notes.length)))}.`,
    )
    out.push('')
  }

  for (let i = 0; i < width; i++) {
    const voice = voices[i] as { label: string }
    out.push(`**${voice.label}** — ${stackPosition(i, width)}`)
    out.push('')
    const mine = chords
      .map((chord) => ({ step: chord.step, note: chord.notes[i] }))
      .filter((entry): entry is { step: number; note: ResolvedNote } => entry.note !== undefined)
    if (mine.length === 0) {
      // A voice with nothing to play is said, not omitted: a missing block reads as a mistake.
      out.push('Nothing — every chord in this hook has fewer notes than that.')
      out.push('')
      continue
    }
    const rows = mine.map(({ step, note }) => ({
      step,
      line:
        `- ${whereOf(step, framed)}` +
        (printsNoteDuration(notice) ? ` · ${durationPhrase(note.len)}` : '') +
        ` · ${spelling(note)} · ${degreeName(note.degree)} · MIDI ${num(note.midi)}`,
    }))
    // #142. Note-offs are computed **per voice**, from that voice's own notes: on a stack it is
    // the next note *on this track* that ends this one, and asking the whole hook would place an
    // off where a neighbouring voice happens to move.
    const offs = noteOffRows(
      notice,
      mine.map(({ note }) => note),
      hook,
      framed,
    )
    for (const row of merged(rows, offs)) out.push(row)
    out.push('')
  }
  // The trailing blank is the caller's job everywhere else in this file.
  if (out[out.length - 1] === '') out.pop()
  return out
}

function hookLines(
  choice: HookChoice,
  carriedBy: ResolvedAssignment | undefined,
  device: Device | undefined,
): Line[] {
  const out: Line[] = []

  // The heading says what the part is and where it lives. Not the hook's id — that is a
  // template-internal identifier that means nothing to somebody standing at a box — and not
  // how many hooks were authored or which one the seed took, which is our machinery rather
  // than their information. The reroll fact worth having is stated once, up in the intro.
  const where = carriedBy === undefined ? 'unassigned' : whereText(carriedBy)
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

  // #142. The device fact, above the notes it governs. Every rendering below reads it — the
  // sampled one, the stacked one and the plain list — because "how does this box end a note" is
  // the same question in all three, and answering it three times is how the first two came to
  // disagree with each other about a box.
  const notice = noteDurationNotice(device)
  // Not for a part nothing carries. Every sentence `noteDurationText` has says *this box*, and
  // there is no box — the line above has already said so. The durations still print, because they
  // are the part rather than a claim about hardware.
  if (carriedBy !== undefined) out.push(...noteDurationLines(notice))

  // §12.4. A part carried by a `sampled-chord` recipe is not played note by note, and the
  // ordinary rendering below would tell its reader to enter three notes on a voice that sounds
  // one. It also says nothing about what has to be recorded: a sample follows a progression by
  // transposition, which covers every root of its own shape and no other shape at all.
  if (carriedBy?.recipe.realisation === 'sampled-chord') {
    out.push(...sampledHookLines(hook, framed, notice))
    return out
  }

  // §12.4/#40. And the other way of not playing a chord on one voice: several voices, one note
  // each. The list below would tell the reader to enter three notes on a voice that sounds one,
  // and say nothing about which voice gets which — which is the half they cannot work out.
  if (carriedBy !== undefined && isStacked(carriedBy)) {
    out.push(...stackedHookLines(hook, framed, carriedBy, notice))
    return out
  }

  // One labelled line per chord, rather than a table: a labelled line survives wrapping on a
  // phone, where a table's header scrolls away from its body.
  const rows = chordsOf(hook).map((chord) => ({
    step: chord.step,
    line:
      `- ${whereOf(chord.step, framed)}` +
      (printsNoteDuration(notice) ? ` · ${durationsPhrase(chord.notes)}` : '') +
      ` · ${chord.notes.map(spelling).join(' ')} · ` +
      `${chord.notes.map((n) => degreeName(n.degree)).join(' ')} · ` +
      `MIDI ${chord.notes.map((n) => num(n.midi)).join(' ')}`,
  }))
  for (const row of merged(rows, noteOffRows(notice, hook.notes, hook, framed))) out.push(row)
  return out
}

function phaseHook(result: ResolveResult, deviceById: Map<DeviceId, Device>): Line[] {
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
    const carriedBy = byRole.get(choice.forRole)
    out.push(
      ...hookLines(
        choice,
        carriedBy,
        carriedBy === undefined ? undefined : deviceById.get(carriedBy.deviceId),
      ),
    )
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

/**
 * #155. **The tightest re-strike this map contains, at this guide's tempo.**
 *
 * `tm-texture-soft` carried a note saying that re-strikes closer together than its 1.8 Sec
 * fade-in smear into the note before, and left the reader to work out whether this part was one
 * of them — arithmetic over a tempo and a strike map that are both already printed on the page.
 * The guide does it here instead.
 *
 * **Only where the map re-strikes a held note** — a resolved hook *and* the direction's
 * `reArticulatesHook` (§4.3/#100), which is `reStrikesHeldNote`'s whole job. That is the scope
 * the fact actually has. On a part whose hook owns the note and whose steps say where it
 * is lifted and struck again, the interval between two strikes is the thing an envelope has to
 * fit inside, and a reader deciding an attack needs it. On a kick or a hat it is a restatement
 * of the grid directly above it in a slower unit — every drum map in every guide would carry a
 * line saying its sixteenths are a sixteenth apart, which is noise on a page §8 says is read
 * standing at a rack. The line goes where the question exists.
 *
 * **Stated, never enforced.** #143 settled that a device's envelope must not cap a direction's
 * strike rate: that puts the box in charge of the genre, which is invariant 3 backwards. So this
 * is a fact about the rhythm and names no device and no parameter — the reader holding both
 * halves is the one who decides which to move.
 *
 * The derivation is printed beside the answer rather than badged, because it *is* the provenance
 * and it is two numbers long. `Provenance` is not borrowed for it: that vocabulary means an
 * authored point moved by a mood axis, and this is neither.
 *
 * Nothing is printed when the map has no re-strike to measure. That is not a gap being hidden
 * (invariant 5) — a map with one strike has no interval, so there is no value being withheld.
 */
function reStrikeLines(pattern: Pattern, bpm: number, reArticulates: boolean): Line[] {
  if (!reArticulates) return []
  const tightest = tightestReStrike(pattern, bpm)
  if (tightest === undefined) return []
  return [
    `- tightest re-strike — \`${num(tightest.seconds)}\` Sec ` +
      `· derived from ${count(tightest.steps, 'step')} at ${num(bpm)} BPM`,
  ]
}

function articulationLines(
  entries: readonly BoundArticulation[],
  device: Device | undefined,
  options: HintSetting,
): Line[] {
  const out: Line[] = []
  for (const entry of entries) {
    const sets = Object.entries(entry.set)
      .map(([key, value]) => `\`${key}\` ${typeof value === 'string' ? value : String(value)}`)
      .join(', ')
    out.push(
      `- \`${entry.slot}\` → ${sets} on step${entry.steps.length === 1 ? '' : 's'} ` +
        `${entry.steps.map(num).join(', ')}`,
    )
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
  options: HintSetting,
  bpm: number,
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

  const body: Line[] = [
    '',
    '```',
    ...gridRows(pattern),
    '```',
    ...slotLines(pattern),
    ...reStrikeLines(pattern, bpm, reStrikesHeldNote(a)),
  ]
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
  options: HintSetting,
  bpm: number,
): { sections: SectionName[]; block: StepBlock }[] {
  const merged = new Map<string, { sections: SectionName[]; block: StepBlock }>()
  for (const entry of a.patterns) {
    const block = stepBlock(a, entry, deviceById, options, bpm)
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
// #142: "steps and note lengths" was true of a piano roll and false of a tracker, where phase 4
// prints no lengths because the box has no field for them. What phase 4 carries beside a step is
// now the device's own answer, so this points at the rows rather than naming their columns.
const HOOK_IS_THE_PATTERN =
  '**The hook is the pattern** — see Hook above for its steps and what each one carries. ' +
  'Nothing separate to program here.'

/**
 * §4.2/invariant 5. What phase 5 says for a part whose *role* does not bear a pattern
 * (`NON_PATTERN_BEARING_ROLES`) and whose direction authored none.
 *
 * The line it replaces was "no pattern authored for `pad` at any band", which reports a hole. On
 * a pad there is no hole: the part is a note held across the section, and a grid is not the thing
 * it is missing. Invariant 5 is about never hiding a gap, and this is its other half — a gap
 * invented is as untrue as a gap concealed, and it sends someone hunting through the direction
 * for a variant nobody ever meant to write.
 *
 * **It claims no hook, deliberately.** Where one resolved, `HOOK_IS_THE_PATTERN` above prints
 * instead and points at the heading. This is the fallback for the case where none did, and a
 * pointer to a Hook section that says "this template has no hooks" is the exact false trail this
 * whole change is removing.
 */
/**
 * §8/#65. What phase 5 says for a part on a box that cannot hold a pattern.
 *
 * **The grid still prints, and that is the point.** The rhythm is real and the reader needs it;
 * what was wrong was the silent assumption about *where they enter it*. Suppressing the grid here
 * would answer a wrong instruction by removing information, which is the opposite of what §4.2's
 * held-pad case does and the opposite of what this reader needs — they still have to program the
 * figure, just not on this box.
 *
 * The device's own words for why, so the sentence carries the manual's reason rather than a
 * generic one. Where the pattern goes instead depends on the rig, and phase 3 is where a reader
 * finds what is driving what, so this points rather than guesses.
 */
function patternEnteredElsewhere(reason: string, driver: PatternDriver): string {
  const head = `**Not programmed here** — ${reason}.`
  switch (driver.state) {
    // #65's second half. The sockets are named because a reader standing at a rack with four CV
    // outputs needs to know *which*, and the pass already decided it — repeating the decision in
    // prose is what the renderer must never do, so it prints what §3.3 chose.
    case 'driven':
      return (
        `${head} Enter this figure on the ${driver.deviceName}, which drives it through ` +
        `\`${driver.pitchJack}\` and \`${driver.gateJack}\`.`
      )
    // Not a patching mistake and the guide must not read like one. Nothing here can send a note
    // and a gate, so this part cannot be played at all until something can.
    case 'nothing-drives':
      return `${head} **Nothing in this rig can drive it** — no box here sends a note and a gate.`
    case 'source-exhausted':
      return (
        `${head} The ${driver.deviceName} drives this rig and has no pitch-and-gate pair left ` +
        'for this box, so it stays unpatched.'
      )
    // The pass reached no verdict, so point rather than guess (invariant 5).
    default:
      return `${head} Enter this figure on whatever is driving it; the rig diagram shows what that is.`
  }
}

const SUSTAINED_NOT_STRUCK =
  '**Held, not struck** — this part sustains rather than repeating a figure, so the direction ' +
  'authors no grid for it. Nothing to program here.'

/**
 * §4.3/§8. What phase 5 says for a part whose hook is held and whose variants say where it is
 * struck again (`RoleRequest.reArticulatesHook`).
 *
 * Two authorities on one part, said in one sentence, which is the whole reason this may print a
 * grid where `HOOK_IS_THE_PATTERN` may not: the hook owns *which note and how long*, the steps
 * below own *where it is lifted and struck again*. Neither restates the other, so there is
 * nothing for a reader to have to choose between — which was #100's actual complaint.
 *
 * It names the map's length in bars because the chain plan below is counted in the **hook's**
 * bars, not the variant's: on Drone Study that is a 16-bar cycle over a 4-bar map, and a reader
 * given "1 copy of 16 bars" with a 4-bar grid above it and nothing joining them would reasonably
 * dial the wrong one.
 */
function reArticulationHeadline(pattern: { length: number }): string {
  const bars = pattern.length / STEPS_PER_BAR
  return (
    '**The hook is the notes; the steps below are where they are struck again** — see Hook ' +
    `above for what to play and how long each note is held. This map is ${count(bars, 'bar')} ` +
    'long and repeats inside the hook; the chain lengths below are counted in the hook.'
  )
}

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
  options: HintSetting,
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
    out.push(`### \`${a.role}\` — ${whereText(a)}`)
    out.push('')
    /**
     * Same reason as phase 4: this phase says what to play and not what it sounds like, so a
     * reader stopping here would think the sound was missing.
     *
     * **Except where this phase is only a pointer at phase 4.** A part whose hook is its rhythm
     * gets no grid here — just a line saying so and where to look — and phase 4 printed this
     * exact sentence a few lines above. The reason for repeating it does not survive that: a
     * reader being sent to Hook cannot conclude the sound is missing, because Hook is where the
     * title is. Printing it in both made the two adjacent sections read as the same block twice,
     * which is what it looked like on a phone.
     */
    if (a.hookAuthority === undefined) {
      out.push(`**${a.recipe.title}** — settings in Sound design`)
    }
    // #100. Before the blocks, and instead of them: a variant was still selected for this part
    // (the band it asks for is what §8's arrangement phase reads), but the hook is what gets
    // played, so printing a grid here would restate the contradiction this replaced.
    // #100 and its second half. A deferred part prints a pointer and no grid; a deferred part
    // whose direction says the variants re-articulate the hook prints both, because there the
    // grid is not a competing rhythm but the map of where the held note is struck again (§4.3).
    const deferred = a.hookAuthority !== undefined
    // §4.2. The same suppression as a deferred part and for a neighbouring reason: there is no
    // grid, so there is nothing to draw. A pad reaches this branch only when its hook did not
    // resolve — where one did, `deferred` is already true and says where to look instead.
    const sustained = isSustainedPart(a)
    /**
     * The two sentences that *replace* a grid rather than qualifying one: a deferred part whose
     * hook is the pattern, and a sustained part with nothing to strike. Everything else is a part
     * a reader programs, whether or not any variant resolved.
     */
    const replacesGrid = (deferred && !a.reArticulatesHook) || sustained
    const blocks = replacesGrid ? [] : mergeBlocks(a, deviceById, options, result.song.bpm)
    if (deferred) {
      out.push('')
      // The sentence needs a length, so it needs a pattern; a re-articulating part whose every
      // section came back `none` has no map to describe and falls back to the pointer rather
      // than to a sentence about a grid that is not there (invariant 5).
      const first = a.patterns.find((p) => p.selection.outcome !== 'none')?.selection
      out.push(
        a.reArticulatesHook && first !== undefined && first.outcome !== 'none'
          ? reArticulationHeadline(first.pattern)
          : HOOK_IS_THE_PATTERN,
      )
    } else if (sustained) {
      out.push('')
      out.push(SUSTAINED_NOT_STRUCK)
    }

    /**
     * §8/#65. After the recipe pointer and before the blocks, in the same place the sentences
     * above sit: it qualifies the grid that follows rather than replacing it.
     *
     * **Keyed on `replacesGrid`, not on the branch above.** It used to be the `else` of that
     * chain, which put it out of reach of a re-articulating part (§4.3) — and those print a
     * headline *and then a grid*, so on a box with no sequencer the guide told a reader to
     * program steps on a machine that cannot hold them. That is the instruction #65 removed,
     * reappearing through a path #65 predates: `acid-lineage/acid` and `weave/sub` on a
     * Minitaur, with 616 such assignments across the library.
     *
     * Not keyed on `blocks` being non-empty either: 504 assignments reach here with no variant
     * resolved, and they carried the notice before. Whether a grid is *suppressed* is the
     * question; whether it came back empty is a different one.
     */
    /**
     * §4.1/§2.1/#334. **Which note to place**, above the grid that says where.
     *
     * Twenty of the library's devices are addressed by note, and before #334 the guide told a
     * reader which steps to hit and never what to put on them.
     *
     * Which note, and whether there is one at all, is `noteInstruction`'s decision and not this
     * renderer's — the web sibling asks the same function and gets the same answer, per #33. All
     * that is written twice is the ink.
     *
     * **Both arms print the same way**, because at the machine they are the same instruction:
     * put this note on the step. A pitch is the direction's musical decision and a trigger note is
     * a fact read off the box; that difference is real, it is in the model, and no rendered
     * surface shows it any more (§3.2).
     */
    const note = noteInstruction(a)
    if (note.kind === 'pitch') {
      out.push('')
      out.push(`**Note** — \`${note.note}\` · MIDI ${num(note.midi)}`)
    } else if (note.kind === 'trigger') {
      out.push('')
      // Bare, and that is the accurate form. `C5` is where the sample plays as recorded, not the
      // only note it answers to — every other note plays it transposed — so a gloss saying "the
      // note this voice answers to" claims more than what was read off the box supports.
      out.push(`**Trigger note** — \`${note.note}\` · MIDI ${num(note.midi)}`)
    }

    if (!replacesGrid) {
      const entry = patternEntryNotice(deviceById.get(a.deviceId))
      if (entry !== undefined) {
        out.push('')
        out.push(patternEnteredElsewhere(entry.reason, patternDriver(result.interDevicePatch, a.deviceId)))
      }
    }
    for (const { sections, block } of blocks) {
      out.push('')
      out.push(`**${sections.join(', ')}** — ${block.headline}`)
      out.push(...block.body)
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

function paramLines(param: ResolvedParam, device: Device | undefined, options: HintSetting): Line[] {
  const out: Line[] = []
  const unit = param.unit === undefined ? '' : ` ${param.unit}`
  const range = param.range === undefined ? '' : ` (${rangeText(param.range, param.unit)})`
  // Name, value, unit, range. No `hoisted` argument any more: it existed only to stop a range
  // citation repeating under every line a shared sentence already covered, and with no citation
  // to repeat there is nothing to hoist.
  // #385: the module's own prefix is trimmed when its box already carries it. `paramLabel` is
  // shared with the web view so one control cannot read two ways; the stored name is untouched.
  out.push(`- **${paramLabel(param)}** \`${valueText(param)}\`${unit}${range}`)
  if (param.note !== undefined) subordinate(out, '  ', 'note', param.note)
  if (options.hints && param.hint !== undefined) {
    subordinate(out, '  ', 'hint', hintText(device, param.hint))
  }
  return out
}

/**
 * §8/#385. **The lamp beside a module label**, in the one form Markdown has for one.
 *
 * Steady and solid, always — it says *this is a module*, not *this module is doing something*.
 * There is no second state and nothing infers one: a hollow ring would be a claim about whether
 * the box is at its init values, which nothing in the model knows and nothing here guesses
 * (invariant 5). Its web sibling is `.module-led` in `app/globals.css`, a flat dot with no glow
 * and no bevel, and `test/module-boxes.test.ts` pins the pair.
 *
 * **§10 says to resist LEDs outside the rack, and it is unchanged.** The lamp contradicts it and
 * ships to be looked at on a real guide, not because the rule was reconsidered — the note at the
 * top of `app/globals.css` carries the whole of that, and nothing in the design sanctions this.
 */
const MODULE_LED = '\u25cf'

/**
 * §8. **A parameter list drawn as the panel modules its controls sit on.**
 *
 * `groupedParams` decides the cut (§3.1) and both renderers read it, so the web guide and this
 * one box the same controls together; the ink below is this renderer's own, per #33.
 *
 * **A box is nesting, because Markdown has no other way to close one.** The first draft put the
 * module on a standalone `**bold**` line, the way `**Pattern-wide**` and `**Patch**` sit above
 * their blocks — and it was wrong in the one case the box exists to get right. Those headings run
 * to the end of their section; a module ends where the next control leaves it, and an unmoduled
 * line following a boxed run rendered flush under the module's own name, reading as a control on
 * a panel it is not on. Found by rendering it, not by reading it.
 *
 * So the module is a list item and its controls are its children: the box has a visible extent,
 * and a line that leaves it returns to the margin as the module's sibling. One tight list, no
 * blank lines inside it, so a boxed run and a bare one can sit next to each other.
 *
 * A run that declared no module prints exactly the bullets it always printed, at the same
 * indent — no header, no lamp, nothing around it — so a guide whose devices name no modules is
 * byte-for-byte the guide it was before modules existed. The goldens are the check on that.
 */
function paramBlockLines(
  params: readonly ResolvedParam[],
  device: Device | undefined,
  options: HintSetting,
): Line[] {
  const out: Line[] = []
  for (const group of groupedParams(params)) {
    if (group.module === undefined) {
      for (const param of group.params) out.push(...paramLines(param, device, options))
      continue
    }
    out.push(`- **${MODULE_LED} ${group.module}**`)
    for (const param of group.params) {
      // Two spaces, the same step `paramLines` already uses to hang a note under its value — so
      // a boxed note lands one level deeper than its own bullet rather than beside it.
      out.push(...paramLines(param, device, options).map((line) => `  ${line}`))
    }
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
 * The procedure is a bullet of its own beneath the need, which is `paramLines`' shape exactly.
 * It is not folded into the need line because they are two claims (§3) and two things to do —
 * what the part needs, and what the box asks you to do to get it there.
 */
function sourceLines(
  source: ResolvedSourceAudio,
  device: Device | undefined,
  options: HintSetting,
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
  out.push(`- ${source.prep.text}`)
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
 * and could not finish reading — which is all five real devices. Nothing beside the line says
 * which state it is any more, so the sentence is the only place it is said; a reading that ran
 * out, a document nobody can open and a document answering no do not lead to the same next
 * move, and each says so in its own words.
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
  // `unsettledText` still splits four ways, which is what keeps this honest with no mark on it:
  // every unsettled state opens *Not established* and names its own finding in the sentence.
  return ['', '**Content**', '', `- ${contentText(notice)}`]
}

/**
 * §3.1/#324. **How a reader sets a control the panel prints no scale for**, said once for the
 * device instead of once for each of its parameters — 76 of them, on the rig #324 reported.
 *
 * Restated in `components/guide/phase-sound.tsx` for the web guide, exactly as `contentText` is,
 * and **local rather than exported**: §8's two renderers are siblings that share no code path, so
 * the page reaching in here for a sentence would make it a dependent of the Markdown guide.
 * `controlPositionNotice` decides *whether* a box is in this state and hands over the panel's own
 * three phrases; each renderer writes the sentence around them.
 *
 * **The sentence reports the reading, and stops short of stating its result as a fact about the
 * document.** *The manual was read and no page mapping a mark to a value was found* is what an
 * `unknown` finding actually holds. *The manual maps no mark to a value* is a positive claim about
 * a whole document that nobody has established — and an earlier draft made exactly that claim while
 * opening with *Not established*, which is a contradiction inside one sentence. The state is in the
 * prose and nowhere else, which is what lets the line lose its `· undocumented` mark and stay true:
 * the mark was a word at the end of a line that a reader can miss anyway, and #21's reader is
 * holding a phone in bad light. What the panel *does* print is stated first, because it is the part
 * they can see in front of them.
 *
 * `mapped` is printed whenever the declaration carries it, and its whole job is to stop this
 * reading as a claim about every control on the box. On the Muse it is the eight ENVELOPE faders,
 * which do carry a printed scale — a notice that swept them in would be the false negative claim
 * #325 removed from the parameter lines, back again one level up. It stays in the sentence; the
 * page it was read off is printed nowhere and lives in the manifest (§3.2).
 */
function controlPositionText(notice: ControlPositionNotice): string {
  const exception =
    notice.mapped === undefined ? '' : ` The exception is ${notice.mapped.controls}.`
  return (
    `${notice.controls} carry ${notice.markings}. The manual was read and no page mapping a ` +
    `mark to a ${notice.exact} value was found, so ${notice.exact} gives the exact setting and ` +
    `by hand these are set by ear.${exception}`
  )
}

function controlPositionLines(notice: ControlPositionNotice): Line[] {
  return ['', '**Setting by hand**', '', `- ${controlPositionText(notice)}`]
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
    out.push(`- \`${entry.from}\` → \`${entry.to}\``)
    if (entry.note !== undefined) subordinate(out, '  ', 'note', entry.note)
  }
  return out
}

/**
 * The pages a block read inside one document, as a **span** rather than a list.
 *
 * `pp.27-53` covers the pages between the two ends whether or not anything cited the ones in the
 * middle, and that overstatement is deliberate: the sentence exists so a reader knows which book
 * to have open and roughly where, and a comma-separated list of nine page numbers is a thing
 * nobody reads standing at a rack. The Muse cites p.27, p.29 and p.52 across one block; `pp.27-52`
 * is the useful answer and `pp.27, 29, 52` is the accurate one nobody wants.
 *
 * A single page stays `p.27`, and a source with no pages at all — an observation, a tagged
 * documentation corpus (#173) — gets nothing rather than an invented locator.
 */
function pageSpan(pages: readonly number[]): string | undefined {
  const first = pages[0]
  const last = pages[pages.length - 1]
  if (first === undefined || last === undefined) return undefined
  return first === last ? `p.${num(first)}` : `pp.${num(first)}-${num(last)}`
}

/**
 * One cited source, named the way a reader would go and find it.
 *
 * An observation is not a document and must not be worded as one. `Muse, firmware 1.4.0` is a
 * source string built for the audit, where it identifies a reading; on the page it becomes *the
 * instrument at firmware 1.4.0*, which tells the reader the thing they cannot look up — that this
 * came off the box rather than out of a book, and off which version of it. Where the string
 * carries no firmware the phrase stops at *the instrument*, because inventing a version is exactly
 * the kind of precision invariant 5 forbids.
 */
function citedSourceText(source: CitedSource): string {
  if (source.kind === 'observed') {
    const firmware = /\bfirmware\s+([^\s,]+)/.exec(source.name)?.[1]
    return firmware === undefined ? 'the instrument' : `the instrument at firmware ${firmware}`
  }
  const span = pageSpan(source.pages)
  return span === undefined ? `the ${source.name}` : `the ${source.name}, ${span}`
}

/**
 * §3.2/§8.1. **One sentence per device block, and the only citation a guide prints.**
 *
 * What it replaced was a mark on every line with a `↳ cite:` under it, and the argument against
 * that stands: §8 is read standing at a machine with both hands busy, a page number beside a value
 * is a line you step over on the way to the number, and a `title` attribute has no hover on a
 * phone and no existence on paper. None of that is an argument against telling a reader *once*
 * which book this box's numbers came out of. A per-value citation costs a line of attention per
 * value and answers a question asked at a desk; one hoisted sentence costs a line per box and
 * answers the question a reader at the rack does ask, which is whether to trust the page and where
 * to go when a number looks wrong.
 *
 * So the sentence is held to what that buys, and everything that made the old scheme expensive
 * stays gone: no per-value mark, no `↳ cite:` line, no `· manual` or `· observed` label, no page
 * list, and never more than one sentence.
 *
 * **The verb is chosen from the counts, because the obvious wording is usually false.** Almost
 * every box in this library cites its legality gates and leaves its points to taste — the Muse
 * renders 75 settings with 1 cited point among them — so *"values come from the manual"* would
 * claim the manual picked the numbers. It gave the bounds. §3.1's two claims are separate and the
 * sentence has to be true about which one it is summarising:
 *
 *  - every point cited — *Values on this box come from …*
 *  - a strict majority cited — *Most values on this box come from …; the others are starting
 *    points.*
 *  - the legality gates carry it, which is nearly every box — *This block draws on …; its values
 *    are starting points.*
 *  - a cited minority of points and no cited gate — *Checked values on this box draw on …; the
 *    others are starting points.*
 *
 * **The third does not name the gate, and that is the point of its wording.** It said *"Ranges and
 * option lists on this box come from …; the settings inside them are starting points"*, which is
 * accurate and is our bookkeeping read aloud: `range` and `options` are the words §3.1 uses to
 * keep two claims apart in a type, and a reader at a rack has no use for either. *Draws on* claims
 * exactly as much as the citations support — these documents are what this block rests on —
 * without asking anybody to hold the distinction between a bound and a value in their head to
 * parse it. What the reader needs from the distinction is the second clause, and that says it in
 * five words.
 *
 * *"on this box"* rather than *"below"* because §8's two layouts put this in two places: the phase
 * layout prints it directly under the device heading with the settings beneath it, and #230's
 * track-major layout prints it under *shared settings*, with the parts further down and other
 * boxes in between. One wording has to be true in both, and *"this block"* is the same rule.
 *
 * **A box that cites nothing gets no sentence**, rather than a sentence saying so. That absence is
 * not a claim — the counts that would reveal a rot live on the device page and in `npm run audit`
 * (§3.2), which is where a project asks that question, not a reader at a rack.
 *
 * Exported because §8's two renderers are **siblings** and this is one sentence, not two that have
 * to be kept in agreement. `test/citation-sentence.test.ts` asserts the Markdown and React bytes
 * against each other for exactly that reason.
 */
export function citationSentence(params: readonly ResolvedParam[]): string | undefined {
  const sources = citedSources(params)
  if (sources.length === 0) return undefined
  const named = list(sources.map(citedSourceText))
  const { total, points, ranges, options } = citedShare(params)

  if (points === total) return `Values on this box come from ${named}.`
  // **Strictly more than half.** At exactly half, *most* is false — and a fifty-fifty box is not
  // a hypothetical shape, it is what a folder looks like part-way through being authored.
  if (points * 2 > total) {
    return `Most values on this box come from ${named}; the others are starting points.`
  }
  if (ranges > 0 || options > 0) {
    return `This block draws on ${named}; its values are starting points.`
  }
  return `Checked values on this box draw on ${named}; the others are starting points.`
}

/**
 * §8/#230/#107. **What a box's parts share, rather than what any one of them sets.**
 *
 * Lifted out of `phaseSound` when the sequencer layout became track-major. These lines belong to
 * the *device* — what its numbers rest on (§3.2), whether anything is loaded on it, how its
 * unmarked controls are set by hand, and the settings #107 hoists because one control serves every
 * part — and rendering them per part
 * repeats them once per track. One of them reads *"set it once, not once per part"*, which printed five times under a
 * six-track Deluge is the guide contradicting itself in its own words.
 *
 * So the track-major layout prints this once at the top of a box's section and the per-track
 * blocks below carry only what is theirs. The phase layout calls it in exactly the place it always
 * inlined it, so its bytes do not move.
 */
function soundShared(
  device: Device,
  mine: readonly ResolvedAssignment[],
  options: HintSetting,
): Line[] {
  const out: Line[] = []
  // §3.2. The one citation a guide prints, above everything else this box has to say, because
  // it is about all of it. Built from the settings actually rendered below — #107's hoisted
  // groups counted once, not once per part — so it names the documents this reader would need
  // and no others, and the share its verb comes from is a share of what is on the page.
  const cites = citationSentence(
    renderedParams(hoistedParams(mine.map((a) => a.params)), mine.map((a) => a.params)),
  )
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
  // §3.1/#324. Once for the box, above its settings: how to reach a value exactly on a panel
  // that prints no scale is a fact about the panel, and it used to print on every parameter
  // line the box had.
  const positions = controlPositionNotice(device)
  if (positions !== undefined) out.push(...controlPositionLines(positions))
  // #107. Above the parts, because that is the order it is done at the box: set the one
  // control the pattern shares, then work through the voices.
  const hoist = hoistedParams(mine.map((a) => a.params))
  for (const group of hoist.groups) {
    out.push('')
    out.push(`**${scopeHeading(group.scope)}**`)
    out.push('')
    out.push(scopeSentence(group.scope))
    out.push('')
    out.push(...paramBlockLines(group.params, device, options))
  }
  return out
}

/**
 * §8/#230. **One part's own settings**, split from what its box shares (`soundShared`).
 *
 * The track-major layout renders these per track and the shared block once above them; the phase
 * layout calls both in the order it always inlined them, so its bytes do not move. `hoist` is the
 * set #107 lifted to the device, filtered out here so a control that serves every part is not
 * printed again under each one.
 */
function soundForPart(
  a: ResolvedAssignment,
  device: Device,
  hoist: ReturnType<typeof hoistedParams>,
  options: HintSetting,
): Line[] {
  const out: Line[] = []
    out.push('')
    out.push(`#### ${voicesLabel(a)} — \`${a.role}\`: ${a.recipe.title}`)
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
      out.push(...paramBlockLines(own, device, options))
    }
    if (a.patch.length > 0) {
      out.push('')
      out.push('**Patch**')
      out.push('')
      out.push(...patchLines(a.patch))
    }
  return out
}

function phaseSound(
  result: ResolveResult,
  deviceById: Map<DeviceId, Device>,
  options: HintSetting,
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
    out.push(...soundShared(device, mine, options))
    const hoist = hoistedParams(mine.map((a) => a.params))
    for (const a of mine) {
      out.push(...soundForPart(a, device, hoist, options))
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
  for (const sentence of sidechainSentences(sidechainReading(result.devices))) {
    out.push(sentence)
    out.push('')
  }

  out.push('**Master FX**')
  out.push('')
  const fx = fxSources(result.devices, result.assignments)
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  if (fx.length === 0) {
    // §2.3 models per-device capability, not a master chain. Saying so beats guessing one.
    out.push('Nothing in this rig processes audio. The master chain is yours at the desk.')
  } else if (fx.length === 1) {
    const only = fx[0] as FxSource
    // #144, the same shape a third time. "Nothing else in this rig processes audio" is a claim
    // about the other boxes, and at a rig of one there are none for it to be about — it reads as
    // though the reader were being told something about a rack, when the whole rack is the box
    // they are holding. The fact worth stating there is the rig's size, so state that instead.
    out.push(
      result.devices.length === 1
        ? `The ${only.name} ${fxText(only, byId.get(only.deviceId))}; ` +
            'it is the only box here, so that is the whole master chain.'
        : `The ${only.name} ${fxText(only, byId.get(only.deviceId))}; ` +
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
        ' no pattern authored at any band, so nothing here varies for ' +
        // #46 left this list singular for the first time: `industrial-techno` reports `riser`
        // alone once a held `pad` is no longer named beside it, and "varies for them" about one
        // role reads as though a name had dropped out of the sentence.
        `${trajectory.unpatterned.length === 1 ? 'it' : 'them'}.`,
    )
  }
  // §4.2. Said separately from the sentence above, and after it, because it is a different
  // claim: that one reports a hole in the direction, this one reports what the part *is*. Run
  // together they read as one list of things that went wrong, which is how `pad` came to be
  // named beside `riser` as though a variant for it had been forgotten.
  if (trajectory.sustained.length > 0) {
    out.push('')
    out.push(
      `${roleList(trajectory.sustained)} ${trajectory.sustained.length === 1 ? 'is' : 'are'}` +
        ' held rather than struck, so there is no grid here to vary.',
    )
  }
  return out
}

/**
 * #152's summary: what the band on the label actually asks for.
 *
 * First of the notes because it describes the group, where every note after it qualifies the
 * group — a fallback, a silence, a difference from its twin. A reader scanning for the big
 * section wants the size before the caveats.
 */
function programsText(p: BandGroup['programs']): string {
  return `${count(p.parts, 'part')}, ${count(p.strikes, 'strike')}`
}

/** The per-group notes, in one order both renderers share. */
function groupNotes(group: BandGroup): string[] {
  const notes: string[] = []
  // A group with nothing playing has no size to report: `no parts` on the label already says
  // it, and "0 parts, 0 strikes over 0 bars" would be three ways of repeating that.
  if (group.programs.parts > 0) notes.push(programsText(group.programs))
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
 * §8 phase 7's sidechain sentences, built only from what `sidechain.ts` derived. Restated in
 * `components/guide/format.ts` for the web guide exactly as `fxText` and `mixerText` are: the
 * grouping is decided once, in `sidechain.ts`, and each renderer writes its own words from it.
 *
 * At most three sentences, and they are ordered by what the reader can act on: the cable first,
 * the boxes that need no cable second, and an undocumented trigger last. A box appears in
 * exactly one of them, so nothing here says the same thing twice (#35).
 */
function sidechainSentences(reading: SidechainReading): string[] {
  if (noDuckers(reading)) return ['No box in this rig has a sidechain.']
  const out: string[] = []
  const external = reading.fromOtherBoxes
  const first = external[0]
  if (reading.alone && first !== undefined) {
    // One box, and its trigger arrives on a cable from a box that is not here. Saying "patch
    // the box you want it to follow" at a rig of one is #144's shape: an instruction the rack
    // in front of the reader cannot carry out.
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
  if (self.length > 0) {
    const one = self.length === 1
    const only = external.length === 0 ? '' : ' only'
    out.push(
      reading.alone && one
        ? `The ${(self[0] as Ducker).name} ducks from its own parts, and it is the only box here.`
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

/**
 * §12.4's count, recomputed for display: an assignable occupied in any section counts once, and
 * every voice of a stacked part counts (#40) — three tracks for one pad really are three voices.
 */
function occupiedCounts(result: ResolveResult): Map<DeviceId, number> {
  const byDevice = new Map<DeviceId, Set<string>>()
  for (const a of result.assignments) {
    const set = byDevice.get(a.deviceId) ?? new Set<string>()
    for (const assignable of a.assignables) set.add(assignable.voiceId)
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
 * **Shorter than it was, because the page it describes is.** It used to teach the mark — what
 * `manual` meant at the end of a line, and that a moved value named the knob that moved it — and
 * none of that is printed any more. A legend explaining a mark the document does not carry is
 * worse than no legend: it sends a reader looking for something that is not there.
 *
 * Deliberately says nothing about hints: a legend
 * describing a line the reader has switched off is a small lie, and keeping it out is what lets
 * `hints: false` be exactly "the same document, minus the hint lines" — a property worth having
 * because §8.1's toggle must not move anything else on the page.
 */
const LEGEND = [
  'Values are starting points — dial them to taste. Where a mood knob moved one you see the move',
  '(`52 → 45`). Every value carries its range — `38 (0…100)` — so you can tell at a glance whether',
  'the screen in front of you is the one the line is about.',
]

/**
 * §8. The whole guide, as Markdown.
 *
 * Pure and total: every `ResolveResult` renders, including one where the search filled nothing.
 * A guide of seven phases all saying what is missing is the correct output for an empty rig,
 * and is the reason no phase is conditional on having content (invariant 5).
 */
/**
 * §8/#230. **The only sentences the sequencer layout adds**, named so the cross-layout fixture can
 * permit exactly these and fail anything else.
 *
 * Both introduce a section that exists only in this layout, and both exist because the heading
 * alone would not explain itself: one section has no device name on it, and the other is a list of
 * figures with no part under them. The phase layout needs neither, because there the same facts
 * arrive under a heading that already says what they are.
 *
 * Keeping them here rather than inline is what lets `guide-layout.test.ts` assert "nothing
 * invented except these", instead of the far weaker "extra lines are allowed".
 */
export const LAYOUT_PREAMBLE = {
  undriven: [
    'Each part below sounds on a box that cannot hold a pattern, and nothing here can play it.',
    'That is a gap in the rig rather than a patching mistake.',
  ],
  orphanHooks: ['This direction asks for these figures and the rig has no part carrying them.'],
  /**
   * **Invariant 5, and the case that nearly shipped when this layout became the default.**
   *
   * Phase-major always draws seven phases, so an empty rig still gets a Step programming section
   * saying "No parts assigned." Sequencer-major builds its middle from groups, and no parts means
   * no groups means those two phases *disappear* — which is precisely the failure §8 names, a
   * section that vanishes being indistinguishable from a direction that never had one.
   *
   * So a rig carrying nothing says so, in the place the sections would have been.
   */
  nothingAssigned: [
    'No part in this direction is on a box yet, so there is nothing here to program or to dial in.',
    'Phase 2 above lists what is missing and why.',
  ],
} as const

/**
 * §8/#230. One heading level down, so a phase body can sit inside a sequencer's section.
 *
 * The phase bodies already emit `###` and `####` of their own, written for a `##` phase heading
 * above them. Under the sequencer layout that heading is the *box*, and Hook / Step programming /
 * Sound design become `###` beneath it — which would collide with the bodies' own `###`.
 *
 * Rewriting the level here rather than parameterising every emitter is the smaller change by a
 * long way: the bodies stay written for one nesting and one caller adjusts them, instead of
 * threading a depth argument through three phases and everything they call. It touches only lines
 * that are already headings, so nothing else in the document can be caught by it.
 */
function demote(body: readonly Line[], levels = 1): Line[] {
  const pad = '#'.repeat(levels)
  return body.map((line) => (line.startsWith('#') ? `${pad}${line}` : line))
}

/**
 * §8/#230. **One track finished before the next is started**, which is how a session runs.
 *
 * The first version of this grouped by box and kept §8's three phases inside it, so a Deluge
 * section held every hook, then every pattern, then every sound — six tracks' worth of each. That
 * is phase-major with a smaller scope, and it left the reader doing the same jumping about, just
 * within one machine instead of across the rack.
 *
 * So the loop is the **part**: pick the track, write its figure, program it, dial it in, move on.
 * The box is still the outer grouping — you stand at one machine, and its patching is done once at
 * the top — but inside it nothing is collected by phase.
 *
 * §8's order survives where it always mattered: hook before sound design, per track, so a part is
 * not shaped by whatever preset happened to be loaded.
 */
function performedHere(
  result: ResolveResult,
  assignments: readonly ResolvedAssignment[],
  deviceById: Map<DeviceId, Device>,
  settings: HintSetting,
  rigLines: readonly Line[] = [],
  hostId?: DeviceId,
): Line[] {
  const out: Line[] = []

  /**
   * §8/#240. Patching first, and in this section rather than four above it. The reader is standing
   * at this box now; its clock, sockets, audio and mixer are what they need before a step goes in.
   * Once per box rather than once per track, because it is a fact about the machine.
   */
  if (rigLines.length > 0) out.push('### Patching', '', ...rigLines, '')

  /**
   * §8/#107. **What every track on this box shares, once, above them all.**
   *
   * `soundShared` is the device's citation sentence, whether anything is loaded on it, and the
   * settings #107 hoists because one control serves every part. Rendering that per track repeats
   * it once per track — and one of its own lines reads *"set it once, not once per part"*, which
   * under a six-track Deluge printed five times is the guide contradicting itself in its own
   * words. It is the first thing found when this layout became track-major.
   *
   * Per device rather than per section, because a driven part sounds on a box that is not the one
   * being stood at, and its shared settings are still its own.
   */
  const hoists = new Map<DeviceId, ReturnType<typeof hoistedParams>>()
  const inGroup = [...new Set(assignments.map((a) => a.deviceId))]
  for (const id of inGroup) {
    const device = deviceById.get(id)
    if (device === undefined) continue
    const mine = assignments.filter((a) => a.deviceId === id)
    hoists.set(id, hoistedParams(mine.map((a) => a.params)))
    const shared = soundShared(device, mine, settings)
    if (shared.length === 0) continue
    const title = inGroup.length === 1 ? 'Shared settings' : `${device.name} — shared settings`
    out.push(`### ${title}`, '', ...demote(shared, 1), '')
  }

  for (const a of assignments) {
    /**
     * The voice alone when the part sounds on the box we are standing at — `Track 2` under a
     * heading that already says Deluge. The full `Device · Voice` when it does not, which is the
     * driven case: standing at the Hapax, `Track 2` would name a track the Hapax does not have.
     */
    const where = hostId !== undefined && a.deviceId === hostId ? voicesLabel(a) : whereText(a)
    out.push(`### ${where} — \`${a.role}\``, '')

    const only = narrowToGroup(result, [a])
    // Omitted rather than answered where this part carries no figure: `phaseHook`'s empty case is
    // a sentence about the template, and under one part it would be a plain untruth.
    if (only.song.hooks.length > 0) {
      out.push('#### Hook', '', ...demote(phaseHook(only, deviceById), 2), '')
    }
    out.push('#### Step programming', '', ...demote(phaseSteps(only, deviceById, settings), 2), '')
    // `soundForPart`, not `phaseSound` — this part's own settings, without re-printing the box's
    // heading and shared block above it once for every track.
    const device = deviceById.get(a.deviceId)
    const hoist = hoists.get(a.deviceId)
    if (device !== undefined && hoist !== undefined) {
      out.push('#### Sound design', '', ...demote(soundForPart(a, device, hoist, settings), 2), '')
    }
  }
  return out
}

/** §8/#240. This section's boxes, rendered as the same blocks phase 3 would have printed. */
function rigLinesFor(
  result: ResolveResult,
  group: SequencerGroup,
  occupied: Map<DeviceId, number>,
): Line[] {
  const byId = new Map(result.devices.map((d) => [d.id, d]))
  const devices = devicesInGroup(group)
    .map((id) => byId.get(id))
    .filter((d): d is Device => d !== undefined)
  return deviceRigBlocks(devices, occupied, result.clockSource)
}

export function renderGuide(result: ResolveResult, options: RenderOptions = {}): string {
  const settings: HintSetting = { hints: options.hints ?? true }
  const layout: GuideLayout = options.layout ?? 'phase'
  const deviceById = new Map(result.devices.map((d) => [d.id, d]))
  const occupied = occupiedCounts(result)

  const out: Line[] = [`# ${result.template.name}`, '', ...LEGEND]
  const section = (n: number, title: string, body: readonly Line[]) => {
    out.push('', `## ${num(n)}. ${title}`, '')
    out.push(...body)
  }

  if (layout === 'phase') {
    const bodies: Line[][] = [
      phaseSong(result),
      phaseVoiceAssignment(result, deviceById),
      phaseRig(result, occupied),
      phaseHook(result, deviceById),
      phaseSteps(result, deviceById, settings),
      phaseSound(result, deviceById, settings),
      phaseFinishing(result),
    ]
    bodies.forEach((body, i) => section(i + 1, GUIDE_PHASES[i] as string, body))
    return `${out.join('\n')}\n`
  }

  section(1, GUIDE_PHASES[0] as string, phaseSong(result))
  section(2, GUIDE_PHASES[1] as string, phaseVoiceAssignment(result, deviceById))
  /**
   * §8/#240. Rig-wide facts, plus a block for every box no section below will cover — a mixer, an
   * fx-processor, anything carrying no parts (§2.4). Every other box's block moves to the section
   * where its parts are worked, and `devicesOutsideGroups` is what keeps the two halves from
   * either overlapping or leaving a box out.
   */
  section(3, GUIDE_PHASES[2] as string, phaseRig(result, occupied, devicesOutsideGroups(result)))

  let n = 4
  const groups = sequencerGroups(result)
  if (groups.length === 0) {
    // See `LAYOUT_PREAMBLE.nothingAssigned`. The phases this layout builds from groups cannot
    // draw themselves when there are none, and silence would read as a direction that asks for
    // no patterns and no sounds.
    section(n++, 'Step programming and Sound design', [...LAYOUT_PREAMBLE.nothingAssigned])
  }
  for (const group of groups) {
    if (group.kind === 'undriven') {
      /**
       * Invariant 5. These parts have no box to stand at, which the guide already says in as many
       * words — so they get a section of their own rather than being dropped, and the heading says
       * why there is no device name on it.
       */
      section(n++, 'Nothing in this rig can drive these', [
        ...LAYOUT_PREAMBLE.undriven,
        '',
        ...performedHere(
          result,
          group.assignments,
          deviceById,
          settings,
          rigLinesFor(result, group, occupied),
        ),
      ])
      continue
    }
    const title = group.drivesOnly
      ? `${group.deviceName} — drives these, sounds none of them`
      : group.deviceName
    section(
      n++,
      title,
      performedHere(
        result,
        group.assignments,
        deviceById,
        settings,
        rigLinesFor(result, group, occupied),
        group.deviceId,
      ),
    )
  }

  /**
   * Invariant 5, the other half of the hook narrowing above. A hook whose role no box carries
   * belongs to no section, so it gets one — once, rather than repeated under every box that does
   * not play it.
   */
  const orphanHooks = unplayedHooks(result)
  if (orphanHooks.length > 0) {
    const nobody: ResolveResult = {
      ...result,
      assignments: [],
      song: { ...result.song, hooks: orphanHooks },
    }
    section(n++, 'Hooks with nothing to play them', [
      ...LAYOUT_PREAMBLE.orphanHooks,
      '',
      ...demote(phaseHook(nobody, deviceById)),
    ])
  }

  section(n, GUIDE_PHASES[6] as string, phaseFinishing(result))
  return `${out.join('\n')}\n`
}
