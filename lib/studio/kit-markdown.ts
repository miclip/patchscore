import type { AuthoredParam, Device, PatchEntry, Recipe } from '@/lib/core'
import { SUBORDINATE, groupedParams, num, paramLabel, recipeRouting } from '@/lib/core'
import type { KitSession, KitSlot } from './kit-session'
import {
  KIT_DESTINATION,
  KIT_RECORD,
  kitCitation,
  kitGap,
  kitLead,
  kitRouting,
  kitTitle,
} from './kit-text'

/**
 * §3.7/#478. **A kit session as Markdown**, for a reader standing at one box with a recorder.
 *
 * §8's renderer needs a rig, a direction, a mood and a seed. This one needs a device. What it
 * prints is `kitSession`'s model and nothing else: the box, one instruction about where the
 * sounds go, the ordered slots — each with its routing, its cables and its authored settings —
 * and the core kit sounds this box does not make.
 *
 * **What is absent is absent because there is no song here** (§3.6, §3.7). No phases, no
 * arrangement, no clock topology, no harmony, no hook, no step pattern, no mood, and none of
 * §8's sampler layouts. Not one of them is a property of a box; all of them are properties of a
 * song this reader has not asked for, and a renderer that reached for any would need a template
 * to get it.
 *
 * **It reads like a guide on purpose.** §10's monospace values, #385's module boxes,
 * `SUBORDINATE`'s `↳ note:` and `↳ hint:` tags, `paramLabel`'s trimmed names and the
 * `` `from` → `to` `` cable shape are all the guide's, imported rather than restated wherever
 * the export exists, because a reader arriving from a guide must not have to learn a second
 * convention for the same fact. The composition is this file's own.
 *
 * **Hints are always printed, and there is no `Show hints` here.** §8.1's argument for hiding a
 * jog is about a reader at the machine with a page they have outgrown; this reader is deciding
 * whether to build the patch at all, which is the same call §3.6 made for the web panel.
 */

/**
 * §8/#385's lamp, restated rather than imported: `MODULE_LED` is `render.ts`'s own and the web
 * panel draws its own `.module-led` too, so the glyph is already the shared thing and the mark
 * is per renderer. `test/kit-golden.test.ts` pins this one against the committed bytes.
 */
const MODULE_LED = '●'

/**
 * The words the web panel uses for the two scopes (#33), and the correction §3.6 argued for:
 * roughly one authored parameter in ten across these kits declares a scope, and unmarked, a
 * reader working down a list of sounds sets a song-wide value again for every one of them and
 * wonders why the last one won.
 */
const SCOPE_LABEL = { pattern: 'pattern-wide', song: 'song-wide' } as const

/**
 * A device's `hints` table is keyed lookup for articulation and free text for parameters; one
 * rule serves both, and an unmatched hint is already the jog its author wrote. Three lines,
 * restated for the same reason `andList` is: `render.ts` keeps its copy module-private and
 * `components/guide/format.ts` has the other, and a module under `lib/` reaching up into
 * `components/` would be the wrong direction for one lookup.
 */
function hintText(device: Device, hint: string): string {
  return device.hints?.[hint] ?? hint
}

/** `↳ note:` / `↳ hint:`, at the indent the value line above it sets. */
function subordinate(out: string[], indent: string, kind: keyof typeof SUBORDINATE, text: string) {
  out.push(`${indent}- ${SUBORDINATE[kind]} ${text}`)
}

/**
 * §10. The authored value in monospace, with its unit and — on a numeric — the bounds beside it.
 *
 * **The authored point, and there is no `from → to` half.** Nothing has moved it: mood applies
 * after recipe resolution and no mood is in play here, so the arrow shape §8 renders would have
 * nothing to put in it. The number is the one the device folder holds.
 *
 * An enum prints its value alone. §8 prints no option set beside one and this reads beside §8;
 * the set is on the device page, where a reader at a desk asks that question (#410).
 */
function valueText(param: AuthoredParam): string {
  const value = param.kind === 'numeric' ? num(param.value) : param.value
  const unit = param.kind === 'numeric' && param.unit !== undefined ? ` ${param.unit}` : ''
  if (param.kind !== 'numeric') return `\`${value}\``
  const suffix = param.unit === undefined ? '' : ` ${param.unit}`
  return `\`${value}\`${unit} (${num(param.range.min)}…${num(param.range.max)}${suffix})`
}

/** One authored parameter: the line, then whatever the author wrote under it. */
function paramLines(param: AuthoredParam, device: Device): string[] {
  // ` · pattern-wide`, the separator §8 already uses to hang `· MIDI CC 51` off a value: a
  // qualifier about the control rather than a clause about the sentence.
  const scope = param.scope === undefined ? '' : ` · ${SCOPE_LABEL[param.scope]}`
  const out = [`- **${paramLabel(param)}** ${valueText(param)}${scope}`]
  if (param.note !== undefined) subordinate(out, '  ', 'note', param.note)
  if (param.hint !== undefined) subordinate(out, '  ', 'hint', hintText(device, param.hint))
  return out
}

/**
 * §8/#385's module box, drawn for authored parameters. `groupedParams` decides the cut, shared
 * rather than restated, so this page and the guide that sent a reader here box the same controls
 * together. A run that declares no module prints bare bullets, so a box that names no panel
 * blocks produces a plain list and no empty frames.
 */
function paramBlock(recipe: Recipe, device: Device): string[] {
  const out: string[] = []
  for (const group of groupedParams(recipe.params)) {
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
 * One sound: what it is, how it is driven, what to plug in, what to set, and the hit to record.
 *
 * Routing, then cables, then settings — the order it happens at the machine, and the order the
 * web panel already puts them in. §8 prints its patch last because a reader there has the box
 * wired already and is working down a list of parts; a reader here is building one patch from
 * nothing, and the cables come before the knobs they change the meaning of.
 */
function slotLines(slot: KitSlot, at: number, device: Device, hoisted: boolean): string[] {
  const { recipe } = slot
  const out = [`## ${num(at)}. \`${slot.name}\` — ${recipe.title}`, '']
  out.push(`\`${recipe.role}\` · \`${recipe.character}\``)
  // §3.7/#496. The sound's own half where the header has already said the box's; the whole line,
  // composed, where it has not. Never both, and never neither.
  const routing = hoisted ? recipe.routing : recipeRouting(recipe)
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
  // A recipe with no authored settings prints no heading. An empty `Settings` block is a
  // reader looking for something that is not there, and a sentence saying so is a line about
  // this library rather than about the box in front of them.
  if (recipe.params.length > 0) {
    out.push('')
    out.push('**Settings**')
    out.push('')
    out.push(...paramBlock(recipe, device))
  }
  out.push('')
  /**
   * §3.7. **The last line of every slot: the action, and the name to record under.**
   *
   * One hit rather than a take: what the list is building is a kit, and the difference between
   * *one hit* and *record this sound* is the difference between something a sampler can trigger
   * and something a reader has to edit. The name is the model's, so the label on the pad and the
   * heading above it cannot come apart.
   */
  out.push(`${KIT_RECORD}\`${slot.name}\`.`)
  return out
}

/**
 * §3.7/invariant 5. **The core kit sounds this list does not cover**, last, and written as the
 * thing to do about them.
 *
 * It makes no claim about the box and none about this library: *nothing here makes a snare* is
 * a claim nobody checked, and a reader is never shown what has or has not been authored. What
 * they are given is the action, which is the only part of it they can use.
 */
function gapLines(session: KitSession): string[] {
  const gap = kitGap(session)
  return gap === undefined ? [] : ['## Not in this kit', '', gap]
}

/**
 * §3.7. The whole document.
 *
 * Pure: the same session gives the same bytes on every call and on every platform. Every number
 * on the page goes through `num` and every list through a code-unit or authored order, so there
 * is no `toLocaleString`, no `Intl` and no collation anywhere in it (§7.2).
 */
export function renderKitSession(session: KitSession): string {
  const { device, slots } = session
  const out: string[] = [`# ${kitTitle(device)}`, '']
  out.push(kitLead(session))
  out.push('')
  /**
   * §3.7. **The destination, once, at the top, as an instruction.**
   *
   * `reader-supplied` is the model's only destination and this sentence is the whole of its ink.
   * It names the reader's own gear because that is the one thing true on every rig: the page is
   * reached with no rig, so it knows of no box to send a sound to, and it asks nothing of this
   * device either, since whether a box can record is a fact no manifest states (§3.7).
   *
   * An instruction rather than a statement about what this page does not do. A reader standing
   * at the box needs to know what to do next; what the product declines to do for them is not
   * their business and not their problem.
   */
  out.push(KIT_DESTINATION)
  /**
   * §3.7/#496. **How the box is played, once, where every sound on the page is played that way.**
   *
   * The Cascadia's eight slots each opened with the same 194 characters — two thirds of this
   * document's routing prose, and about five lines each at 390px, before the half that says what
   * makes the sound different. It is one fact about the box, so it is printed the way the
   * destination above it is: once, in the header, ahead of the sounds it is true of.
   *
   * Nothing is dropped when the slots share nothing: `kitRouting` answers `undefined`, this prints
   * nothing, and every slot prints its whole routing line exactly as it did before (#496).
   */
  const routing = kitRouting(session.routingPreamble)
  if (routing !== undefined) {
    out.push('')
    out.push(`Routing — ${routing}`)
  }
  /**
   * §3.2/invariant 4. **One citation sentence for the box, built from the settings this session
   * renders and no others**, and no mark or page beside any value — the ink rule exactly as §8
   * states it.
   *
   * **Nothing is resolved to build it.** `authoredClaims` projects the three claims §3.2 counts
   * straight off the authored params, applying the recipe-level inheritance §3.1 states, and
   * `citationSentence` is §8's own — imported for the reason it is exported: this is one
   * sentence, not two that have to be kept in agreement. The machinery took `ResolvedParam`
   * until #478, which meant this surface had to run its params through the resolver carrying a
   * mood it does not have, purely to render a sentence. Claims are what both stages hold.
   *
   * No #107 hoisting, because there is none to do: each slot is a separate patch built one at a
   * time, and a control that appears in two of them is set twice by a reader who builds both.
   */
  const cites = kitCitation(session)
  if (cites !== undefined) {
    out.push('')
    out.push(`*${cites}*`)
  }
  slots.forEach((slot, i) => {
    out.push('')
    out.push(...slotLines(slot, i + 1, device, routing !== undefined))
  })
  const gaps = gapLines(session)
  if (gaps.length > 0) {
    out.push('')
    out.push(...gaps)
  }
  return `${out.join('\n')}\n`
}
