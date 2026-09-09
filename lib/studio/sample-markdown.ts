import type {
  Device,
  PatchEntry,
  ResolvedModulationEnd,
  ResolvedParam,
  SampleResolution,
  SampleVoicing,
} from '@/lib/core'
import {
  SUBORDINATE,
  contentNotice,
  groupedParams,
  modulationEndParts,
  num,
  paramLabel,
  recipeRouting,
  recipesFor,
} from '@/lib/core'
import { READER_SUPPLIED } from './destination'
import {
  SAMPLE_RECORD,
  sampleCitation,
  sampleContent,
  sampleDestination,
  sampleFileName,
  sampleGap,
  sampleLead,
  sampleSubstitution,
  sampleTitle,
  sampleVoiceHeading,
} from './sample-text'

/**
 * §3.8/#520. **One sound as Markdown**, for a reader making it on the rig they own.
 *
 * §8's renderer needs a rig, a direction, a mood and a seed; §3.7's needs a device; §5A's needs a
 * riff. This one needs a target and a rig, and prints `resolveSample`'s model and nothing else:
 * what the take has to contain, the box the sound lands on with its cables and its settings, and
 * what to name the file — or, where the rig cannot make it, the one thing to do about that.
 *
 * **Every sentence is `sample-text.ts`'** (#495). The React page at `/samples/[id]` is this
 * document's sibling, and a sentence written twice is a sentence two people can edit half of;
 * `test/sample-page.test.ts` asserts the facts of one against the other. What is left here is the
 * ink: heading levels, backticks, bullets.
 *
 * **What is absent is absent because there is no song and no figure here.** No sections, no
 * arrangement, no clock topology, no harmonic cycle, no mood, no notes and no step grid. A
 * one-shot has none of them, and a renderer that reached for one would need a `Template` or a
 * `Riff` to get it.
 *
 * **It reads like a guide on purpose.** §10's monospace values, #385's module boxes,
 * `SUBORDINATE`'s `↳ note:` and `↳ hint:` tags, `paramLabel`'s trimmed names and the
 * `` `from` → `to` `` cable shape are all the guide's, imported wherever the export exists,
 * because a reader arriving from a guide must not have to learn a second convention for the same
 * fact. The composition is this file's own, exactly as `riff-markdown.ts`' is.
 */

/**
 * §8/#385's lamp, restated rather than imported: `MODULE_LED` is `render.ts`'s own, and
 * `kit-markdown.ts` and `riff-markdown.ts` each keep their own copy for the same reason — the
 * glyph is the shared thing and the mark is per renderer.
 */
const MODULE_LED = '●'

/**
 * A device's `hints` table is keyed lookup for articulation and free text for parameters; one rule
 * serves both, and an unmatched hint is already the jog its author wrote. Restated for the reason
 * the other two Markdown renderers restate it: `render.ts` keeps its copy module-private, and a
 * module under `lib/` reaching up into `components/` would be the wrong direction for one lookup.
 */
function hintText(device: Device, hint: string): string {
  return device.hints?.[hint] ?? hint
}

/** `↳ note:` / `↳ hint:`, at the indent the value line above it sets. */
function subordinate(out: string[], indent: string, kind: keyof typeof SUBORDINATE, text: string) {
  out.push(`${indent}- ${SUBORDINATE[kind]} ${text}`)
}

// ---------------------------------------------------------------------------
// The settings
// ---------------------------------------------------------------------------

/**
 * §10/§3.2. The resolved value in monospace, with its unit, its bounds and its controller.
 *
 * The `from → to` arrow is `render.ts`' shape and is kept even though a sample target carries no
 * mood and nothing can currently move a value: a renderer that dropped it would be encoding "there
 * is no mood here" in the ink, and the day this surface gains one the number would silently start
 * lying. `riff-markdown.ts` makes the same call for the same reason.
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
  // #511. A routing is drawn as an assignment here too, in the same words §8 uses. A modulation
  // left to fall through to the line below would render an assignment as a knob on exactly one
  // surface, which is the failure #511 opened with.
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
 * document and the guide box the same controls together. A run that declares no module prints bare
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

// ---------------------------------------------------------------------------
// The box the sound lands on
// ---------------------------------------------------------------------------

function voiceLines(resolution: SampleResolution, voice: SampleVoicing): string[] {
  const { device, recipe } = voice
  const out = ['## Where to make it', '']
  out.push(`**${sampleVoiceHeading(voice)}**`)
  out.push('')
  out.push(recipe.title)
  const substituted = sampleSubstitution(resolution.target, voice)
  if (substituted !== undefined) {
    out.push('')
    out.push(substituted)
  }
  /*
   * §2.1/#32. Which note plays the sound as it is, on a voice addressed by note. Bare, and §8's
   * wording exactly: `C5` is where the sample plays as recorded rather than the only note it
   * answers to. A voice declaring none prints nothing, because inventing one would be a claim
   * about the box (invariant 5).
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
  // A recipe with no settings prints no heading. An empty `Settings` block is a reader looking for
  // something that is not there.
  if (voice.params.length > 0) {
    out.push('')
    out.push('**Settings**')
    out.push('')
    out.push(...paramBlock(voice.params, device))
  }
  const cites = sampleCitation(voice)
  if (cites !== undefined) {
    out.push('')
    out.push(`*${cites}*`)
  }
  return out
}

/**
 * §2.6/#111/#520. **What each box that plays this from a file actually ships**, printed under the
 * gap that says the rig cannot make the sound.
 *
 * One line per device rather than one for the rig: `content` is a fact about a box, and two boxes
 * in a rig can be in two different states. `contentNotice` is asked of the recipes that voice
 * authors for *this* role, which is the same narrowing the guide makes — a box with one unused
 * sample recipe says nothing on a page that did not reach it.
 */
function contentLines(resolution: SampleResolution): string[] {
  if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'loads-audio') return []
  const { role } = resolution.target
  const seen = new Set<string>()
  const out: string[] = []
  for (const assignable of resolution.gap.voices) {
    if (seen.has(assignable.deviceId)) continue
    seen.add(assignable.deviceId)
    const device = resolution.devices.find((d) => d.id === assignable.deviceId)
    if (device === undefined) continue
    const notice = contentNotice(device, recipesFor(device, assignable, role))
    if (notice === undefined) continue
    out.push('')
    out.push(`**Content** — ${device.name}: ${sampleContent(notice)}`)
  }
  return out
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

/**
 * §3.8. The whole document.
 *
 * Pure: the same resolution gives the same bytes on every call and on every platform. Every number
 * goes through `num` and every list through an authored or code-unit order, so there is no
 * `toLocaleString`, no `Intl` and no collation anywhere in it (§7.2).
 */
export function renderSample(resolution: SampleResolution): string {
  const { target } = resolution
  const out: string[] = [`# ${sampleTitle(target)}`, '']
  // One string, two inks: the page sets the same lead in a `.mono` span (#495).
  out.push(`\`${sampleLead(target)}\``)
  out.push('')
  out.push('## What to record')
  out.push('')
  target.technique.forEach((paragraph, i) => {
    if (i > 0) out.push('')
    out.push(paragraph)
  })
  out.push('')
  if (resolution.outcome !== 'made') {
    /*
     * §3.8. **A gap ends the document.** The page has just said the rig cannot make this sound, and
     * every one of the four answers is already the whole of what to do about it: tick a box, buy
     * one, bring a recording, or dial the patch by ear. *Record it and name it `VOCAL CHOP`* under
     * any of them is an instruction for a file that does not exist yet, and on `no-rig` it is an
     * instruction to somebody who has not told the page what they own.
     *
     * `loads-audio` is the case worth naming: the gap's own sentence says to bring a recording or
     * make one, and **how** to make one is #521's, not this page's. Continuing past it would be
     * this surface answering a question it has already handed on.
     */
    out.push('## Where to make it')
    out.push('')
    out.push(sampleGap(target, resolution.gap, resolution.devices))
    out.push(...contentLines(resolution))
    return `${out.join('\n')}\n`
  }
  out.push(...voiceLines(resolution, resolution.voice))
  out.push('')
  out.push('## Recording it')
  out.push('')
  out.push(sampleDestination(READER_SUPPLIED))
  out.push('')
  out.push(`${SAMPLE_RECORD}\`${sampleFileName(target)}\`.`)
  return `${out.join('\n')}\n`
}

/** `wobble-bass.md`. What the download is called. */
export function sampleFilename(resolution: SampleResolution): string {
  return `${resolution.target.id}.md`
}
