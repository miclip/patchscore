import type {
  Device,
  PatchEntry,
  ResolvedModulationEnd,
  ResolvedParam,
  Riff,
  RiffResolution,
  RiffVoicing,
} from '@/lib/core'
import {
  SUBORDINATE,
  groupedParams,
  modulationEndParts,
  num,
  paramLabel,
  recipeRouting,
  sourceLengthLine,
} from '@/lib/core'
import {
  RIFF_GRID_LEAD,
  degreeLabel,
  gridRows,
  heldLabel,
  midiLabel,
  chordRows,
  noteRows,
  riffChordSummary,
  riffCitation,
  riffGap,
  riffLength,
  riffNoteSummary,
  riffNotesUnresolved,
  riffStack,
  riffSubstitution,
  riffTempo,
  riffTitle,
  slotRows,
  spellingLabel,
  stepList,
  voiceHeading,
} from './riff-text'

/**
 * §5A. **A riff as Markdown**, for a reader who wants to play one figure on the rig they own.
 *
 * §8's renderer needs a rig, a direction, a mood and a seed; §3.7's needs a device. This one needs
 * a riff and a rig, and prints `resolveRiff`'s model and nothing else: the technique, the notes,
 * the grid, and the one voice the rig has for it — or, honestly, that it has none.
 *
 * **Every sentence on the page is `riff-text.ts`'** (#495). The React page at `/riffs/[id]` is
 * this document's sibling, and a sentence written twice is a sentence two people can edit half
 * of; `test/riff-page.test.ts` asserts the facts of one against the other. What is left here is
 * the ink: heading levels, backticks, bullets, the fence.
 *
 * **What is absent is absent because there is no song here.** No sections, no arrangement, no
 * clock topology, no harmonic cycle, no mood, no phase order and none of §8's sampler layouts.
 * Every one of those is a property of a piece the reader has not asked for, and a renderer that
 * reached for one would need a `Template` to get it — which is the whole of why a riff is not one
 * (see `lib/core/riff.ts`).
 *
 * **It reads like a guide on purpose.** §10's monospace values, #385's module boxes,
 * `SUBORDINATE`'s `↳ note:` and `↳ hint:` tags, `paramLabel`'s trimmed names and the
 * `` `from` → `to` `` cable shape are all the guide's, imported wherever the export exists,
 * because a reader arriving from a guide must not have to learn a second convention for the same
 * fact. The composition is this file's own, exactly as `kit-markdown.ts`' is.
 */

/**
 * §8/#385's lamp, restated rather than imported: `MODULE_LED` is `render.ts`'s own and
 * `kit-markdown.ts` keeps its own copy for the same reason — the glyph is the shared thing and
 * the mark is per renderer. `test/riff-golden.test.ts` pins this one against the committed bytes.
 */
const MODULE_LED = '●'

/**
 * A device's `hints` table is keyed lookup for articulation and free text for parameters; one
 * rule serves both, and an unmatched hint is already the jog its author wrote. Restated for the
 * reason `kit-markdown.ts` restates it: `render.ts` keeps its copy module-private, and a module
 * under `lib/` reaching up into `components/` would be the wrong direction for one lookup.
 */
function hintText(device: Device, hint: string): string {
  return device.hints?.[hint] ?? hint
}

/** `↳ note:` / `↳ hint:`, at the indent the value line above it sets. */
function subordinate(out: string[], indent: string, kind: keyof typeof SUBORDINATE, text: string) {
  out.push(`${indent}- ${SUBORDINATE[kind]} ${text}`)
}

// ---------------------------------------------------------------------------
// The header
// ---------------------------------------------------------------------------

/**
 * §5A. **What the figure is, before any of it is played**: the part, its character, the tempo it
 * lives at, the key it is written in, and how long it is. The facts are `riff-text.ts`'; the
 * backticks and the separators are this file's.
 */
function leadLine(riff: Riff): string {
  return (
    `\`${riff.request.role}\` · \`${riff.request.character}\` · ` +
    `${riffTempo(riff)} · ${riff.key} · ${riffLength(riff)}`
  )
}

// ---------------------------------------------------------------------------
// The notes
// ---------------------------------------------------------------------------

function noteLines(resolution: RiffResolution): string[] {
  const unresolved = riffNotesUnresolved(resolution)
  if (unresolved !== undefined) return ['## The notes', '', `*${unresolved}*`]
  if (resolution.notes.outcome !== 'resolved') return []
  const hook = resolution.notes.hook
  return [
    '## The notes',
    '',
    riffNoteSummary(hook),
    '',
    ...noteRows(hook).map(
      (row) =>
        `- step ${num(row.step)} · \`${spellingLabel(row)}\`` +
        ` · ${degreeLabel(row)} · ${midiLabel(row)} · ${heldLabel(row)}`,
    ),
  ]
}

// ---------------------------------------------------------------------------
// The chords
// ---------------------------------------------------------------------------

/** Empty for a riff with no `harmony`, which is most of them — see `chordRows`. */
function chordLines(riff: Riff): string[] {
  const summary = riffChordSummary(riff)
  if (summary === undefined) return []
  return [
    '## The chords',
    '',
    summary,
    '',
    '| Degree | Bars | Under the figure |',
    '| --- | ---: | :---: |',
    ...chordRows(riff).map(
      (row) =>
        `| ${row.degree} | ${num(row.from)}\u2013${num(row.from + row.bars - 1)} |` +
        ` ${row.underFigure ? '●' : ''} |`,
    ),
  ]
}

// ---------------------------------------------------------------------------
// The grid
// ---------------------------------------------------------------------------

function gridLines(riff: Riff): string[] {
  return [
    '## The grid',
    '',
    RIFF_GRID_LEAD,
    '',
    '```',
    ...gridRows(riff),
    '```',
    ...slotRows(riff).map((row) => `- \`${row.slot}\` · ${stepList(row.steps)}`),
  ]
}

// ---------------------------------------------------------------------------
// The voice
// ---------------------------------------------------------------------------

/**
 * §10/§3.2. The resolved value in monospace, with its unit, its bounds and its controller.
 *
 * The `from → to` arrow is `render.ts`' shape and is kept even though a riff carries no mood and
 * nothing can currently move a value: a renderer that dropped it would be encoding "there is no
 * mood here" in the ink, and the day a riff gains one the number would silently start lying.
 */
function valueText(param: ResolvedParam): string {
  const now = typeof param.value === 'number' ? num(param.value) : param.value
  const { provenance } = param
  if (provenance.state === 'authored') return now
  return provenance.from === undefined ? now : `${num(provenance.from)} → ${now}`
}

function paramLines(param: ResolvedParam, device: Device): string[] {
  const unit = param.unit === undefined ? '' : ` ${param.unit}`
  const range =
    param.range === undefined ? '' : ` (${num(param.range.min)}…${num(param.range.max)}${unit})`
  const cc = param.midiCc === undefined ? '' : ` · MIDI CC ${param.midiCc}`
  /*
   * §5A/#511. **A routing is drawn as an assignment here too**, in the same words §8 uses.
   *
   * This page and the guide are two surfaces over one library, and a reader arriving at a riff
   * from a guide must not have to learn a second convention for the same fact — the rule this
   * file's header already states about `Value`, `groupedParams` and `CableMark`. A modulation
   * left to fall through to the line below would render an assignment as a knob on exactly one
   * of the six surfaces, which is the failure #511 opened with.
   */
  if (param.modulation !== undefined) {
    const m = param.modulation
    const endText = (end: ResolvedModulationEnd): string => {
      const parts = modulationEndParts(end)
      return parts.control === undefined
        ? `\`${parts.value}\``
        : `**${parts.control}** \`${parts.value}\``
    }
    const polarity = m.polarity === undefined ? '' : ` · ${endText(m.polarity)}`
    const amount = m.amountControl ?? paramLabel(param)
    const out = [
      `- Modulation — ${endText(m.source)} → ${endText(m.destination)}` +
        `${polarity} · **${amount}** \`${valueText(param)}\`${unit}${range}${cc}`,
    ]
    subordinate(out, '  ', 'neutral', `\`${num(m.neutral)}\` is no modulation`)
    if (param.note !== undefined) subordinate(out, '  ', 'note', param.note)
    if (param.hint !== undefined) subordinate(out, '  ', 'hint', hintText(device, param.hint))
    return out
  }
  const out = [`- **${paramLabel(param)}** \`${valueText(param)}\`${unit}${range}${cc}`]
  if (param.note !== undefined) subordinate(out, '  ', 'note', param.note)
  if (param.hint !== undefined) subordinate(out, '  ', 'hint', hintText(device, param.hint))
  return out
}

/**
 * §8/#385's module box. `groupedParams` decides the cut, shared rather than restated, so this
 * page and the guide box the same controls together. A run that declares no module prints bare
 * bullets, so a box naming no panel blocks produces a plain list and no empty frames.
 */
function paramBlock(params: readonly ResolvedParam[], device: Device): string[] {
  const out: string[] = []
  for (const group of groupedParams(params)) {
    if (group.module === undefined) {
      for (const param of group.params) out.push(...paramLines(param, device))
      continue
    }
    out.push(`- **${MODULE_LED} ${group.module}**`)
    for (const param of group.params) {
      out.push(...paramLines(param, device).map((line) => `  ${line}`))
    }
  }
  return out
}

/** §3.3. The cables inside the box, in §8's arrow shape and monospace jack names. */
function patchLines(entries: readonly PatchEntry[]): string[] {
  const out: string[] = []
  for (const entry of entries) {
    out.push(`- \`${entry.from}\` → \`${entry.to}\``)
    if (entry.note !== undefined) subordinate(out, '  ', 'note', entry.note)
  }
  return out
}

/**
 * §4.3/§7 step 8. What the box says about the slots this grid actually contains.
 *
 * A slot the variant does not strike is dropped silently by `bindArticulation` and prints
 * nothing — which is the whole reason articulation addresses slots rather than step numbers.
 */
function articulationLines(voice: RiffVoicing): string[] {
  if (voice.articulation.length === 0) return []
  const out = ['', '**Articulation**', '']
  for (const bound of voice.articulation) {
    /**
     * `set` holds numbers, strings *and* booleans (`ArticulationEntry`), so the value is
     * stringified rather than coerced — `Number(value)` on a named mode prints `NaN`, silently
     * and only on the devices that author one. §8's own line does exactly this, and the key is
     * in monospace beside its value for the reason every other control name on the page is.
     */
    const sets = Object.entries(bound.set)
      .map(([key, value]) => `\`${key}\` ${typeof value === 'string' ? value : String(value)}`)
      .join(', ')
    out.push(
      `- \`${bound.slot}\` → ${sets} on step${bound.steps.length === 1 ? '' : 's'} ` +
        `${bound.steps.map(num).join(', ')}`,
    )
    if (bound.hint !== undefined) subordinate(out, '  ', 'hint', hintText(voice.device, bound.hint))
  }
  return out
}

function voiceLines(riff: Riff, voice: RiffVoicing): string[] {
  const { device, recipe } = voice
  const out = ['## Where it plays', '']
  /*
   * Two blocks rather than one line joined by a dash: the box and the voice are one fact and the
   * patch's name is another, and the page sets them as two spans for the same reason. The dash
   * that used to sit between them was punctuation standing in for a decision about which of the
   * two a reader is looking for.
   */
  out.push(`**${voiceHeading(voice)}**`)
  out.push('')
  out.push(recipe.title)
  const substituted = riffSubstitution(riff, voice)
  if (substituted !== undefined) {
    out.push('')
    out.push(substituted)
  }
  for (const sentence of riffStack(voice)) {
    out.push('')
    out.push(sentence)
  }
  if (voice.sourceAudio !== undefined) {
    out.push('')
    out.push(`Source — ${voice.sourceAudio.need}`)
    // §3/#518. The length in the one wording every surface uses, as a bullet beneath the need.
    // This page shows no `prep`, so the bullet is the only thing under the line here.
    if (voice.sourceAudio.minimumSeconds !== undefined) {
      out.push('')
      out.push(`- ${sourceLengthLine(voice.sourceAudio.minimumSeconds)}`)
    }
  }
  /*
   * §3/#516. The other half of §3's split, in §8's own shape: which of the box's sounds, then the
   * gesture that reaches it as a bullet beneath. Before the split these recipes said *go and find
   * this* — a `Source` line — above a part that loads nothing.
   *
   * The procedure prints here where `sourceAudio.prep` does not, and the asymmetry is real: this
   * page has always shown a source's `need` alone. It is the choice that is worth less without
   * its gesture — *one of the ten supertone sounds* is not something a reader can act on without
   * knowing that [SOUND] and [.] are what open the ten.
   */
  /*
   * §3/#553. The shortcut, above the settings it makes optional. A riff page shows one device at
   * a time, so this can name the patch outright where a guide has to keep it beside a block.
   */
  if (voice.factoryPatch !== undefined) {
    const { name, bank } = voice.factoryPatch
    out.push('')
    out.push(`Factory patch — **${name}**${bank === undefined ? '' : ` in ${bank}`}`)
    out.push('')
    out.push('- Load it and the settings below are already dialled. They build the same sound by hand.')
  }
  if (voice.soundSetup !== undefined) {
    out.push('')
    out.push(`Sound — ${voice.soundSetup.sound}`)
    out.push('')
    out.push(`- ${voice.soundSetup.prep.text}`)
    if (voice.soundSetup.hint !== undefined) {
      subordinate(out, '  ', 'hint', hintText(voice.device, voice.soundSetup.hint))
    }
  }
  /**
   * §2.1/#32/#334. **Which note plays the sound as it is**, on a voice that is addressed by note.
   *
   * It matters more here than almost anywhere, because the page above prints the figure in
   * scientific pitch notation with middle C at C4 (§4.1) and a great many boxes put middle C
   * somewhere else. `C5 · MIDI 60` is the reader's bridge between the two, and MIDI is the number
   * with no convention drift in it.
   *
   * Bare, and §8's wording exactly: `C5` is where the sample plays as recorded rather than the
   * only note it answers to, so a gloss would claim more than what was read off the box supports.
   * A voice that declares none prints nothing — a synth voice playing a written pitch has no
   * trigger note, and inventing one would be a claim about the box (invariant 5).
   */
  if (voice.triggerNote !== undefined) {
    out.push('')
    out.push(
      `**Trigger note** — \`${voice.triggerNote.note}\` · MIDI ${num(voice.triggerNote.midi)}`,
    )
  }
  const routing = recipeRouting(recipe)
  if (routing !== undefined) {
    out.push('')
    out.push(`Routing — ${routing}`)
  }
  if (recipe.patch !== undefined && recipe.patch.length > 0) {
    out.push('')
    out.push('**Patch**')
    out.push('')
    out.push(...patchLines(recipe.patch))
  }
  // A recipe with no settings prints no heading. An empty `Settings` block is a reader looking
  // for something that is not there.
  if (voice.params.length > 0) {
    out.push('')
    out.push('**Settings**')
    out.push('')
    out.push(...paramBlock(voice.params, device))
  }
  out.push(...articulationLines(voice))
  const cites = riffCitation(voice)
  if (cites !== undefined) {
    out.push('')
    out.push(`*${cites}*`)
  }
  return out
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * §5A. The whole document.
 *
 * Pure: the same resolution gives the same bytes on every call and on every platform. Every
 * number goes through `num` and every list through an authored or code-unit order, so there is no
 * `toLocaleString`, no `Intl` and no collation anywhere in it (§7.2).
 */
export function renderRiff(resolution: RiffResolution): string {
  const { riff } = resolution
  const out: string[] = [`# ${riffTitle(riff)}`, '']
  out.push(leadLine(riff))
  out.push('')
  out.push('## The technique')
  out.push('')
  riff.technique.forEach((paragraph, i) => {
    if (i > 0) out.push('')
    out.push(paragraph)
  })
  out.push('')
  const chords = chordLines(riff)
  if (chords.length > 0) {
    out.push(...chords)
    out.push('')
  }
  out.push(...noteLines(resolution))
  out.push('')
  out.push(...gridLines(riff))
  out.push('')
  if (resolution.outcome === 'played') {
    out.push(...voiceLines(riff, resolution.voice))
  } else {
    out.push('## Where it plays')
    out.push('')
    out.push(riffGap(riff, resolution.gap, resolution.devices))
  }
  return `${out.join('\n')}\n`
}
