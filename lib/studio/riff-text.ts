import type {
  Assignable,
  Device,
  ProgressionRow,
  ResolvedHook,
  ResolvedNote,
  Riff,
  RiffGap,
  RiffResolution,
  RiffVoicing,
} from '@/lib/core'
import {
  chordAtStep,
  STEPS_PER_BAR,
  citationSentence,
  count,
  num,
  progressionRows,
  resolvedClaims,
  slotGroups,
  stepGridRows,
} from '@/lib/core'

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
 * **It describes a technique, never a recording or a patch.** *The bass-mid figure from Blue
 * Monday* reads as a claim that the notes came off the record, which would be false: the figure
 * is authored here (§5A.5). So the reference names the *sound* to build, and the figure is one
 * **written here** to practise the technique against. The sentence reads the same whether the
 * reference is a record or a factory patch, which is why it names neither kind.
 */
export function riffDescription(riff: Riff): string {
  return (
    `Build the ${riff.reference.name} ${riff.request.role} sound on the boxes you own, then practise the ` +
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

/**
 * How long the figure is, and how many steps that is on §4.3's grid.
 *
 * **Bars alone on a held riff** (§5A.2/#608). A step count is a fact about a grid, and a riff
 * on a held role has none; printing the hook's length in steps would name a grid the page then
 * fails to draw.
 */
export function riffLength(riff: Riff): string {
  const bars = count(riff.hook.bars, 'bar')
  return riff.pattern === undefined ? bars : `${bars} · ${count(riff.pattern.length, 'step')}`
}

/**
 * §5A/§4.1. **The chords the figure is played over**, as one sentence and a row per chord.
 *
 * Only where the entry carries a `harmony`. Most riffs are one part in one key and need nothing
 * here; this exists for a figure whose melody *follows* the chords, where the notes print altered
 * degrees that say nothing on their own — `raised 3rd` beside `A#4` is a fact, and the chord is
 * the reason for it.
 *
 * The rows are the degrees exactly as authored, which is the same thing a direction's harmony
 * table prints. Roman numerals resolve against `key` in the reader's head and name no device
 * (invariant 3); spelling them out as chord names would be a second harmony implementation living
 * on the riff surface, and #33's rule is that a surface renders, it does not decide.
 */
/**
 * A row of the chord table: the degree, the notes it spells in the key shown, how long it
 * lasts, the bar it starts on, and whether the figure is playing over it.
 *
 * `from` and `underFigure` exist because a table without them is a table a reader has to align by
 * guessing (#552). A four-bar figure printed against a twelve-bar cycle reads as starting at bar
 * one, and that is the wrong chord whenever it does not.
 *
 * `notes` comes from `progressionRows` (#570), the same rows a guide's table is built from, so
 * a riff and a direction cannot spell one degree two ways. `key` defaults to the riff's own: the
 * Markdown and the prerendered page are in it, and only the page's key control (§5A.6, view
 * state) ever passes another. The degrees, the bars and the marker do not move with it.
 */
export type ChordRow = ProgressionRow & { from: number; underFigure: boolean }

export function chordRows(riff: Riff, key: string = riff.key): readonly ChordRow[] {
  const { harmony } = riff
  if (harmony === undefined) return []
  const start = riff.figureStartsAtBar ?? 1
  const end = start + riff.hook.bars - 1
  const rows: ChordRow[] = []
  let from = 1
  for (const row of progressionRows(harmony, key)) {
    const last = from + row.bars - 1
    rows.push({ ...row, from, underFigure: from <= end && last >= start })
    from += row.bars
  }
  return rows
}

/**
 * `6 chords over 12 bars, in F# minor. The figure is bars 7-10.` — the line above the rows.
 *
 * The second sentence appears only where the figure is shorter than the cycle. Where the two are
 * the same length there is nothing to align and saying so would be noise.
 */
export function riffChordSummary(riff: Riff, key: string = riff.key): string | undefined {
  const { harmony } = riff
  if (harmony === undefined) return undefined
  const head =
    `${count(harmony.progression.length, 'chord')} over ` +
    `${count(harmony.cycleBars, 'bar')}, in ${key}.`
  if (riff.hook.bars >= harmony.cycleBars) return head
  const start = riff.figureStartsAtBar ?? 1
  const end = start + riff.hook.bars - 1
  const span = start === end ? `bar ${num(start)}` : `bars ${num(start)}\u2013${num(end)}`
  return `${head} The figure is ${span}.`
}

/**
 * §5A/§4.1. **Where the chords come from**, said once under the table.
 *
 * A `harmony` on a riff means the figure is played *over* chords that something else supplies:
 * the entry authors one part, the voice block sets up one sound, and the table above is what
 * that sound is heard against. A reader who has just been handed a chord table on a page about
 * a lead line will otherwise look for the chords in the settings, and they are not there.
 *
 * This is copy rather than a field on the entry. The riff shape already carries the distinction:
 * a figure that *is* the chords has no `harmony` and says so through its polyphony — the notes
 * sharing a step are the voicing (`noteRows`) — and a figure that follows chords carries a
 * `harmony` and no chord in its notes. A `harmonySource` beside `harmony` would be a second
 * place saying what the presence of the first already says, and the two could disagree.
 *
 * *If your rig allows* because a riff names no device (invariant 3), and whether the reader's
 * rig has a second voice free is a question this page does not resolve — the voice block claims
 * one part and one part only.
 */
export const RIFF_CHORDS_SUPPLIED =
  'The figure is played over these chords; supply them separately if your rig allows.'

/**
 * §5A/#554. **The rules, in the reader's words**, where the entry states any.
 *
 * Rendered rather than kept for the build alone: a rule a reader cannot see is a rule they will
 * break the first time they take the figure somewhere else, and the `reason` an author had to
 * write is exactly the sentence that stops them. The build checks the notes; this tells the
 * person holding the box why the notes are what they are.
 *
 * **The line says how far the rule reaches** (§5A.8/#605). An unaltered degree is an avoid-note
 * over the one chord the rule names, and the line opens on that chord. A raised or lowered one is
 * a pitch the key does not have and is forbidden on every chord, which the line says first; the
 * chord the rule names is where the reason is explained, and a reader who saw only *over `i`*
 * would take the ban as scoped to it, which is the mismatch the check no longer has.
 */
export function ruleLines(riff: Riff): readonly string[] {
  const rules = riff.constraints
  if (rules === undefined) return []
  const out: string[] = []
  for (const rule of rules.forbiddenDegrees ?? []) {
    const degree = ordinal(rule.degree)
    if (rule.alter === undefined || rule.alter === 0) {
      out.push(`Over ${rule.chord}, never the ${degree} — ${rule.reason}.`)
    } else {
      const spelling = rule.alter > 0 ? 'raised' : 'lowered'
      out.push(
        `Never the ${spelling} ${degree}, on any chord — over ${rule.chord}, ${rule.reason}.`,
      )
    }
  }
  if (rules.onsetOffset !== undefined) {
    out.push(
      `Enter each chord at least ${count(rules.onsetOffset.minSteps, 'step')} after it lands — ` +
        `${rules.onsetOffset.reason}.`,
    )
  }
  return out
}

/** `3rd`, `6th` — the degree as a musician says it, matching the guide's own `degreeName`. */
function ordinal(degree: number): string {
  const tens = degree % 100
  if (tens >= 11 && tens <= 13) return `${num(degree)}th`
  const ones = degree % 10
  return `${num(degree)}${ones === 1 ? 'st' : ones === 2 ? 'nd' : ones === 3 ? 'rd' : 'th'}`
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
export type NoteRow = {
  step: number
  notes: readonly ResolvedNote[]
  /**
   * #611. The chord this row lands in, where the riff carries harmony. Absent on an entry that
   * carries none, which is most of them.
   */
  chord?: string
}

/**
 * #611. **The chord is on the row, because otherwise the reader computes it.**
 *
 * The chord table gives bars and this list gives steps, and a bar is sixteen steps — so a reader
 * checking which chord a note falls under was dividing by sixteen in their head, for every note.
 * The operator did exactly that, on a figure that was correct, and could not tell whether it was:
 * *"wouldn't C#5 to A4 be over the i chord? yet we have it at step 9 and step 25"*. Both are, and
 * nothing on the page said so.
 *
 * `chordAtStep` already answers it and both renderers already share these rows, so the answer is
 * computed once here rather than twice in ink (#33).
 */
export function noteRows(hook: ResolvedHook, riff?: Riff): readonly NoteRow[] {
  const rows: { step: number; notes: ResolvedNote[]; chord?: string }[] = []
  for (const note of hook.notes) {
    const last = rows[rows.length - 1]
    if (last !== undefined && last.step === note.step) last.notes.push(note)
    else rows.push({ step: note.step, notes: [note] })
  }
  rows.sort((a, b) => a.step - b.step)
  if (riff !== undefined) for (const row of rows) row.chord = chordAtStep(riff, row.step)
  return rows
}

/** #611. `over VI` — the chord a note row lands in, or nothing where the riff carries no harmony. */
export function chordLabel(row: NoteRow): string | undefined {
  return row.chord === undefined ? undefined : `over ${row.chord}`
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
  const word = row.notes.length === 1 ? 'degree' : 'degrees'
  return `${word} ${row.notes.map(degreeText).join(' ')}`
}

/**
 * §4.1. `3`, or `#3` where the note is altered away from the mode's own third. The number alone
 * would be one label for two pitches on a line that follows modal mixture — a raised third and a
 * plain third are both `degree 3`, and the reader is looking at `A#4` and `A4`.
 */
function degreeText(note: ResolvedNote): string {
  const alter = note.alter ?? 0
  if (alter === 0) return num(note.degree)
  return `${alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter)}${num(note.degree)}`
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

/*
 * §5A.2/#608. **A held riff has no grid, and no grid section.** Every function below answers
 * with nothing where `riff.pattern` is absent — no rows, no slots, no repeat sentence — and both
 * renderers omit the section rather than heading an empty one. The lead sentence is a sentence
 * about a grid, so it goes with it.
 */

/**
 * §4.3's grid for this riff's pattern, drawn by `stepGridRows` in the marks every step grid in the
 * product uses — the guide's Markdown included.
 *
 * **The export's rows, and no longer the page's** (#528). The page draws boxes, as a guide's page
 * always has; what it shares with this is the hit data underneath, and it carries these very rows
 * visually hidden so the figure still copies as `x` and `·`. The drawing lives in `lib/core`
 * because more than one surface prints it, and this file used to hold a second copy of it,
 * identical to the guide's and connected to it by nothing (#512).
 */
export function gridRows(riff: Riff): readonly string[] {
  return riff.pattern === undefined ? [] : stepGridRows(riff.pattern)
}

/** One entry per `PatternSlot` present, in the order the variant first reaches each. */
export type SlotRow = { slot: string; steps: readonly number[] }

/**
 * The grouping is `lib/core`'s (#528), for `gridRows`' reason: which hits belong to which slot is
 * shared data, and every surface listing them held its own copy of this loop. What stays here is
 * the export's own row — a bare list of steps, joined by `stepList`.
 */
export function slotRows(riff: Riff): readonly SlotRow[] {
  if (riff.pattern === undefined) return []
  return slotGroups(riff.pattern).map(({ slot, hits }) => ({
    slot,
    steps: hits.map((hit) => hit.step),
  }))
}

export function stepList(steps: readonly number[]): string {
  return steps.map(num).join(', ')
}

/**
 * §4.3/§8/#100. **What the grid is for on a part that also has notes**, said once.
 *
 * Printed rather than left to be inferred: a page showing both a set of notes and a set of steps
 * has already raised the question #100 exists to answer, and the answer is `reArticulatesHook`,
 * which every riff with a grid carries by construction.
 */
export const RIFF_GRID_LEAD =
  'Every step below strikes the note in force at that point. The grid is where the figure is ' +
  'played.'

/**
 * §5A.2/#603. **How many times the grid goes round under the figure**, said where the figure is
 * longer than the grid, and nothing where they are the same length.
 *
 * `The grid is 4 bars and the figure is 12: play it round 3 times.` A twelve-bar line over a
 * 64-step grid is played with the grid repeating beneath it, and a page that printed the grid
 * once under `RIFF_GRID_LEAD` alone left that for the reader to work out. Both renderers print it
 * straight after the lead. Whole numbers only: every riff's hook is a whole number of passes
 * (§5A.2), and `test/riff.test.ts` holds it there, so nothing here rounds. `num` throughout, so
 * no locale is involved (§7.2).
 */
export function gridRepeatSentence(riff: Riff): string | undefined {
  if (riff.pattern === undefined) return undefined
  const gridBars = riff.pattern.length / STEPS_PER_BAR
  if (riff.hook.bars <= gridBars) return undefined
  const passes = riff.hook.bars / gridBars
  return (
    `The grid is ${count(gridBars, 'bar')} and the figure is ${num(riff.hook.bars)}: ` +
    `play it round ${count(passes, 'time')}.`
  )
}

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
