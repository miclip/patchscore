import type {
  Assignable,
  Device,
  ResolvedHook,
  ResolvedNote,
  Riff,
  RiffGap,
  RiffResolution,
  RiffVoicing,
} from '@/lib/core'
import { STEPS_PER_BAR, citationSentence, count, num, resolvedClaims } from '@/lib/core'

/**
 * §5A/#495. **Everything a riff page says in words, and the shapes both renderings walk.**
 *
 * `kit-text.ts`' job, for the surface beside it: the Markdown export and the React page are
 * *siblings*, and a sentence that exists twice is a sentence two people can edit half of. So the
 * prose lives here once and each renderer supplies only its own emphasis — backticks on one side,
 * `.mono` on the other.
 *
 * The split is **words and structure here, ink there**. A function belongs in this file when two
 * renderers would otherwise have to agree about it: a whole sentence, a grouping decision (which
 * notes share a line), a derived row (the grid). It stays in the renderer when it is purely how
 * that medium marks something up.
 *
 * **Nothing here names a device from the riff.** A riff names no device (invariant 3); the only
 * box names on the page come from the reader's own rig, and they arrive as `Device` objects.
 */

// ---------------------------------------------------------------------------
// Titles and the header
// ---------------------------------------------------------------------------

/** The page's title and the document's `# ` heading — one string, so a tab and a print agree. */
export function riffTitle(riff: Riff): string {
  return riff.name
}

/**
 * The one sentence a search result and a card show.
 *
 * **Two things a reader can do, rather than a list of what the page contains.** *A written figure,
 * a step grid, and settings* is a table of contents: it describes the document to somebody who has
 * not opened it, and gives them no reason to. What they came for is to get the sound out of the
 * gear on their desk and then play the part.
 *
 * **It describes a technique, never a recording.** *The bass-mid figure from Blue Monday* reads as
 * a claim that the notes came off the record, which would be false: the figure is authored here
 * (§5A.5). So the track names the *sound* to build, and the figure is one **written here** to
 * practise the technique against.
 */
export function riffDescription(riff: Riff): string {
  return (
    `Build the ${riff.track} ${riff.request.role} sound on the boxes you own, then practise the ` +
    'technique against a figure written here.'
  )
}

/**
 * §5.6. The tempo the figure is written at, with the span it lives in.
 *
 * The span prints as well as the centre because §5.6's rule holds here unchanged: the range is
 * the author's taste, nothing downstream reads it, and a reader taking the figure somewhere else
 * is being told what was meant rather than what is allowed.
 */
export function riffTempo(riff: Riff): string {
  const { bpm } = riff
  const span = bpm.min === bpm.max ? '' : ` (${num(bpm.min)}–${num(bpm.max)})`
  return `${num(bpm.default)} BPM${span}`
}

/** How long the figure is, and how many steps that is on §4.3's grid. */
export function riffLength(riff: Riff): string {
  return `${count(riff.hook.bars, 'bar')} · ${count(riff.pattern.length, 'step')}`
}

/**
 * §5A.5. **There is no reference line, and its absence is the decision.**
 *
 * A subtitle reading *The technique from Blue Monday. The figure below is ours, not a
 * transcription* was here and is gone. Half of it repeated the title, and the other half was a
 * disclaimer: a sentence defending the page against a charge nobody had made, in the first place
 * a reader's eye lands. Copy that hedges what a page is teaches a reader to doubt it.
 *
 * The reference is in the **title** and in the **slug**, which is where somebody looks for it and
 * is what `RiffSchema` enforces. That is the whole of what the surface says about the record.
 */

// ---------------------------------------------------------------------------
// The notes
// ---------------------------------------------------------------------------

/**
 * §4.1. Notes sharing a step are a chord, so they share a row. Step order, and within a step the
 * order the hook authored — nothing is sorted by pitch, because a voicing is an authored decision
 * and re-ordering it would show a chord the author did not write.
 */
export type NoteRow = { step: number; notes: readonly ResolvedNote[] }

export function noteRows(hook: ResolvedHook): readonly NoteRow[] {
  const rows: { step: number; notes: ResolvedNote[] }[] = []
  for (const note of hook.notes) {
    const last = rows[rows.length - 1]
    if (last !== undefined && last.step === note.step) last.notes.push(note)
    else rows.push({ step: note.step, notes: [note] })
  }
  return rows.sort((a, b) => a.step - b.step)
}

/** `2 bars in F minor.` — what the figure is, before the rows under it. */
export function riffNoteSummary(hook: ResolvedHook): string {
  return `${count(hook.bars, 'bar')} in ${hook.key}.`
}

/**
 * §4.1/invariant 5. A hook that did not resolve is a **content** problem rather than a rig gap,
 * and it says which — a reader whose rig is fine should not go looking at their rig.
 */
export function riffNotesUnresolved(resolution: RiffResolution): string | undefined {
  const { notes } = resolution
  return notes.outcome === 'unresolved' ? `These notes do not resolve: ${notes.detail}` : undefined
}

/** `degree 1` / `degrees 1 3 5`, and the MIDI numbers beside them (#32). */
export function degreeLabel(row: NoteRow): string {
  return `${row.notes.length === 1 ? 'degree' : 'degrees'} ${row.notes.map((n) => num(n.degree)).join(' ')}`
}

export function midiLabel(row: NoteRow): string {
  return `MIDI ${row.notes.map((n) => num(n.midi)).join(' ')}`
}

/** The spellings, space-separated: `A4 C5 E5`. Monospace on both surfaces. */
export function spellingLabel(row: NoteRow): string {
  return row.notes.map((n) => n.note).join(' ')
}

/**
 * §4.1/#142. `len` is **sustain**, counted from the note's own step — so it reads as *in force
 * for*, the one wording that is neither a gap to the next note nor a gate value.
 *
 * The phrase does real work on a riff rather than restating the field: the grid strikes the note
 * repeatedly *inside* this span, and a reader who took `len` for "how long you hold it" would
 * hold it through the strikes and play a drone.
 */
export function heldLabel(row: NoteRow): string {
  return `in force ${count(row.notes[0]?.len ?? 0, 'step')}`
}

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

/** §4.3's grid: sixteen steps to a row, in groups of four. `render.ts`' own `ROW`. */
const ROW = STEPS_PER_BAR

/**
 * §4.3's grid: `x` for a struck step, `·` for a silent one, sixteen to a row in groups of four,
 * with the row's first step in a right-aligned gutter.
 *
 * Here rather than in either renderer because both draw it and the drawing *is* the fact — a page
 * whose grid disagreed with its export would be two different figures under one name.
 */
export function gridRows(riff: Riff): readonly string[] {
  const hit = new Set(riff.pattern.hits.map((h) => h.step))
  const width = String(riff.pattern.length).length
  const rows: string[] = []
  for (let start = 1; start <= riff.pattern.length; start += ROW) {
    const cells: string[] = []
    for (let step = start; step < start + ROW && step <= riff.pattern.length; step++) {
      if ((step - start) % 4 === 0 && step !== start) cells.push(' ')
      cells.push(hit.has(step) ? 'x' : '·')
    }
    rows.push(`${String(start).padStart(width, ' ')} ${cells.join('')}`)
  }
  return rows
}

/** One entry per `PatternSlot` present, in the order the variant first reaches each. */
export type SlotRow = { slot: string; steps: readonly number[] }

export function slotRows(riff: Riff): readonly SlotRow[] {
  const bySlot = new Map<string, number[]>()
  for (const hit of riff.pattern.hits) {
    const steps = bySlot.get(hit.slot)
    if (steps === undefined) bySlot.set(hit.slot, [hit.step])
    else steps.push(hit.step)
  }
  return [...bySlot].map(([slot, steps]) => ({ slot, steps }))
}

export function stepList(steps: readonly number[]): string {
  return steps.map(num).join(', ')
}

/**
 * §4.3/§8/#100. **What the grid is for on a part that also has notes**, said once.
 *
 * Printed rather than left to be inferred: a page showing both a set of notes and a set of steps
 * has already raised the question #100 exists to answer, and the answer is `reArticulatesHook`,
 * which every riff carries by construction.
 */
export const RIFF_GRID_LEAD =
  'Every step below strikes the note in force at that point. The grid is where the figure is ' +
  'played.'

// ---------------------------------------------------------------------------
// The voice
// ---------------------------------------------------------------------------

/**
 * §12.4/#40. The voices carrying the part: one label, or every label of a stack in the order the
 * notes are handed to them. `render.ts`' `voicesLabel` — two joins, no `Intl.ListFormat` and no
 * locale anywhere (§7.2).
 */
export function voicesLabel(assignables: readonly Assignable[]): string {
  const labels = assignables.map((a) => a.label)
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1] as string}`
}

/** `Subsequent 37 · Voice`, or a stack's whole list. The heading both renderings open with. */
export function voiceHeading(voice: RiffVoicing): string {
  return `${voice.device.name} · ${voicesLabel(voice.assignables)}`
}

/**
 * §3.5. **The character the box actually has, said out loud where it is not the one asked for.**
 *
 * A substitution is legal and silent substitution is not: a reader told they are playing a dirty
 * acid line, handed a bright patch and given no sentence about it would conclude the patch is
 * what dirty sounds like on their box.
 */
export function riffSubstitution(riff: Riff, voice: RiffVoicing): string | undefined {
  if (!voice.substituted) return undefined
  return (
    `This riff asks for a ${riff.request.character} ${riff.request.role} and the nearest this ` +
    `box authors is ${voice.character}.`
  )
}

/**
 * §12.4/#40/§8/#431. **A chord spread one note per voice**, in two sentences that are each a thing
 * a reader got wrong without them.
 *
 * The first is that there is no chord on any one voice and that all of them take the *same*
 * settings — one sound repeated, not three sounds — which is #431's finding arriving here for its
 * own reason: these surfaces name the voices one at a time, which is what makes them look
 * separate. The second is the voicing order, lowest note to lowest voice, which is what keeps the
 * chord's shape stable.
 *
 * Empty for the ordinary one-voice part. A sentence saying a part is *not* stacked, on every page,
 * is noise.
 */
export function riffStack(voice: RiffVoicing): readonly string[] {
  const width = voice.stackWidth
  if (width < 2) return []
  const first = voice.assignables[0]
  const last = voice.assignables[width - 1]
  if (first === undefined || last === undefined) return []
  return [
    `Stacked chord: ${count(width, 'voice')}, one note each. Every voice takes the same settings ` +
      `below, so build the sound once and copy it across all ${num(width)}.`,
    `Lowest note to the lowest voice: ${first.label} takes the bottom of every chord and ` +
      `${last.label} the top. Hold that order and the voicing keeps its shape.`,
  ]
}

/**
 * §3.2/invariant 4. One citation sentence for the block, over the settings this page renders and
 * no others — and no mark or page beside any value. `citationSentence` is §8's own, imported for
 * the reason it is exported: this is one sentence, not two that have to be kept in agreement.
 */
export function riffCitation(voice: RiffVoicing): string | undefined {
  return citationSentence(resolvedClaims(voice.params))
}

// ---------------------------------------------------------------------------
// The gap
// ---------------------------------------------------------------------------

/** How boxes and their voices are named in a gap sentence. `render.ts`' `capableText` shape. */
function voiceNames(assignables: readonly Assignable[], devices: readonly Device[]): string {
  const nameOf = new Map(devices.map((d) => [d.id, d.name]))
  const byDevice = new Map<string, string[]>()
  for (const a of assignables) {
    const labels = byDevice.get(a.deviceId)
    if (labels === undefined) byDevice.set(a.deviceId, [a.label])
    else labels.push(a.label)
  }
  const named = [...byDevice].map(([deviceId, labels]) => {
    const name = nameOf.get(deviceId) ?? deviceId
    return labels.length > 3
      ? `${name} (${count(labels.length, 'voice')})`
      : `${name} ${labels.join('/')}`
  })
  if (named.length <= 1) return named[0] ?? ''
  if (named.length === 2) return `${named[0]} and ${named[1]}`
  return `${named.slice(0, -1).join(', ')}, and ${named[named.length - 1]}`
}

/**
 * §5A/invariant 5. **No rig at all is not a gap in a rig**, so the empty case is an offer of help.
 *
 * Four words, and every one of the longer versions was worse. *No boxes are picked yet* tells a
 * reader what they have failed to do; *tick the ones you own and this will say where the part
 * goes* promises what the page will do next, which a reader finds out by doing it. What is left
 * is the thing they can act on.
 *
 * As soon as one box is ticked the sentence becomes whichever of §7.3's answers is true.
 */
export function riffNoRig(_riff: Riff): string {
  return 'Pick the boxes you own.'
}

/**
 * §7.3/invariant 5. **Why this rig cannot play the figure, said as something to act on.**
 *
 * Each of the three answers is a different action, which is why §7.3 keeps them apart: buy a box,
 * spread the chord across the voices you have, or set the patch up by ear. None of them is a
 * statement about what this library has or has not authored — that is our backlog, and a reader
 * standing at a rack has no use for it.
 */
export function riffGap(riff: Riff, gap: RiffGap, devices: readonly Device[]): string {
  if (devices.length === 0) return riffNoRig(riff)
  if (gap.reason === 'no-recipe') {
    return `${voiceNames(gap.capable, devices)} could carry it. Set this one up by ear.`
  }
  if (gap.because === 'no-such-role') {
    return `Add a box that plays ${riff.request.role}.`
  }
  const ceiling = gap.roleVoices.reduce((most, a) => Math.max(most, a.polyphony), 0)
  const sounds =
    ceiling <= 1
      ? 'Every voice here that plays it sounds one note'
      : `The most any voice here sounds is ${count(ceiling, 'note')}`
  const voices = gap.roleVoices.length
  const needs = `This figure needs ${count(gap.notes, 'note')} at once.`
  if (voices < gap.notes) {
    return (
      `${needs} ${sounds}, and there ${voices === 1 ? 'is one of them' : `are ${num(voices)} of them`}. ` +
      'Add a box with more voices, or one whose voices share a pool.'
    )
  }
  const across =
    voices === gap.notes ? `all ${num(voices)}` : `${num(gap.notes)} of the ${num(voices)}`
  return (
    `${needs} ${sounds}, so stack it by hand across ${across} voices here that play it, one ` +
    'note each, and set them alike so the chord blends.'
  )
}
