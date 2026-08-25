import type { DeviceId } from './ids'
import type { Device } from './device'
import type { ResolvedAssignment } from './pipeline'

/**
 * §8 phase 7's other half: **what in this rig processes audio.**
 *
 * The section used to answer that by looking at `kind` alone — an `fx-processor` or a
 * `mixer-recorder` was FX, and everything else was nothing. Against the real library that
 * printed "No effects unit or mixer in this rig. The master chain is yours at the desk." for a
 * rig containing a TR-1000, whose panel carries a reverb, a delay, a master effect and an
 * analog FX path, and a Deluge whose recipes here set `REVERB AMOUNT` and `DELAY AMOUNT` on
 * eight parts. That is not a gap shown honestly (invariant 5); it is a false negative, and a
 * reader acting on it patches an outboard reverb they already own twice over.
 *
 * Like `arrangement.ts` this module derives and renders nothing. Both renderers read it, so the
 * claim "this box processes audio" is made once. The formatting is written twice; the fact is
 * not.
 *
 * **What this reads, and what it deliberately does not.** No device declares an FX section —
 * there is no `features.fx`, and this module does not add one. It reads three things a device
 * already says about itself:
 *
 *   1. `kind` — an `fx-processor` or a `mixer-recorder` *is* the processing.
 *   2. Panel labels (§10). A label silkscreened `MASTER FX` is the box telling you where its
 *      effects live, in the words you will read on the panel while standing at it.
 *   3. **Resolved** parameter names. A part that sets `REVERB SEND` is a part that will not
 *      sound as authored unless the box has a reverb.
 *
 * All three are name matches against `EFFECT_TOKENS`, and a name match is weaker evidence than
 * a declaration. It is what the current schema affords. Two consequences worth knowing:
 * detection is blind to a device with no panel drawing and no effect parameters (its FX would
 * go unmentioned), and a knob labelled `DELAY` that is really an envelope delay would be read
 * as an effect. The first under-claims and the second over-claims, and both do it quietly.
 *
 * **Why route 3 reads assignments and not `device.recipes` (#106).** It used to scan every
 * authored recipe on the box, which makes it a *capability* fact wearing a per-guide sentence.
 * A Tracker Mini drone study assigning one `texture` part was told the box "carries DELAY SEND
 * and REVERB SEND in its recipes" — `DELAY SEND` is real on the Tracker Mini and resolved into
 * nothing here, so the guide named a control the reader will not find on any page of it. Same
 * family as #59 and #58: a manifest fact leaking into prose that claims to describe *this*
 * guide. Routes 1 and 2 stay device-level on purpose — what the box *is*, and what is
 * silkscreened on it, are true of the hardware standing in front of you whether or not this
 * guide gave it a part.
 *
 * **The idle box, and what route 3 does when it finds nothing.** Narrowing route 3 to what
 * resolved left a false negative of its own: a device whose only FX evidence is its parameters,
 * given no part here, left the section entirely — and where it was the only candidate the
 * section printed "Nothing in this rig processes audio". That is a claim about the *rack*, and
 * it is false of a rack holding a Tracker Mini. Two different facts — "this guide gave that box
 * no part" and "nothing here can process audio at all" — had one sentence between them.
 *
 * They have two now. A box that authors an effect parameter somewhere in its library and has
 * none of them resolved into this guide stays in the section carrying `unused` evidence: named,
 * with the reason nothing is set on it, and with **no parameter named**. That last part is what
 * keeps #106 fixed — the capability decides which sentence prints, and never reaches the page as
 * a control the reader would go looking for and not find. "Nothing in this rig processes audio"
 * now means what it says: no box here has effects at all.
 */

/**
 * Matched as a **whole word** against an uppercased name, never as a substring: `FDBK` must not
 * match, and `DRIVE`, `FILTER`, `OVERDRIVE` and `BIT DEPTH` are absent on purpose. Those are
 * per-voice sound design on every box in the library — the TR-1000's `DRIVE` shapes one drum,
 * it does not process the mix — and a list this section prints has to survive being read as
 * "this is your effects chain".
 *
 * `EQ` is absent for the same reason from the other side: tone shaping, not an effect, and
 * including it would put `EQ BASS FREQUENCY` in a sentence about reverb.
 */
const EFFECT_TOKENS: readonly string[] = [
  'BITCRUSH',
  'CHORUS',
  'DECIMATION',
  'DELAY',
  // Roland abbreviates on the screen and in the parameter tables: the TR-1000's per-instrument
  // sends are `RVB SEND` and `DLY SEND`, never spelled out. An effect vocabulary that only
  // knows the long forms is a vocabulary that cannot read the box it is looking at.
  'DLY',
  'ECHO',
  'FLANGER',
  'FX',
  'PHASER',
  'REVERB',
  'RVB',
]

/**
 * `toUpperCase`, never `toLocaleUpperCase` (§7.2): the second one answers `I` differently under
 * a Turkish locale and would make detection platform-dependent.
 */
/**
 * Words that carry no claim of their own and may sit beside an effect name: `MASTER FX`,
 * `MULTI FX`, `ANALOG FX`, `FX DEPTH`. Every panel label in the library that names an effect is
 * one token plus at most one of these.
 */
const EFFECT_QUALIFIERS: readonly string[] = [
  '',
  'ANALOG',
  'DEPTH',
  'DIGITAL',
  'LEVEL',
  'MASTER',
  'MIX',
  'MULTI',
  'PRM',
  'RETURN',
  'SEND',
  'TIME',
]

/**
 * **A panel label**: every word must be an effect token or a qualifier, not merely one of them.
 *
 * `some` was the rule and it over-claimed exactly as the note above predicted it would. The
 * Subsequent 37 silkscreens `DELAY HOLD VEL AMT KB TRACK` over its envelope section — a delay
 * *stage before the attack*, not a delay effect — and one matching word put a monosynth under
 * "what processes audio in this rig". The first response was to drop the label from that device's
 * panel drawing, which fixes the symptom by making the drawing less true than the box.
 *
 * A label that names an effect is short and is about the effect. A six-word control-cluster
 * label that happens to contain `DELAY` is not, and no list of tokens can tell those apart by
 * looking at one word.
 *
 * This can now under-claim: a real effect label with an unlisted qualifier goes unnoticed. That
 * is the safer error and the note above already says so — an over-claim tells someone their
 * monosynth has a delay, and an under-claim leaves a line off a list.
 */
function isEffectLabel(text: string): boolean {
  const words = text.toUpperCase().split(/[^A-Z0-9]+/)
  if (!words.some((word) => EFFECT_TOKENS.includes(word))) return false
  return words.every((word) => EFFECT_TOKENS.includes(word) || EFFECT_QUALIFIERS.includes(word))
}

/**
 * **A recipe parameter name**: one token anywhere is enough, and the strict rule above would be
 * wrong here.
 *
 * The two evidence routes have different naming discipline and it is worth saying why they get
 * different rules. A panel label is a transcription of silkscreen, and silkscreen runs a whole
 * strip of unrelated words together — `DELAY  HOLD  VEL AMT  KB TRACK` is one row naming four
 * envelope stages. A parameter name is chosen by an author for one parameter: `DELAY AMOUNT` is
 * a delay control because somebody named that control. Requiring every word to be known would
 * reject it for `AMOUNT`, and the list of words a real effect parameter may contain — amount,
 * rate, feedback, time, width — is open in a way a panel qualifier list is not.
 */
function isEffectParam(text: string): boolean {
  const words = text.toUpperCase().split(/[^A-Z0-9]+/)
  return words.some((word) => EFFECT_TOKENS.includes(word))
}

/** Why we say this box processes audio. One device may have more than one. */
export type FxEvidence =
  /**
   * The box is the processing: an `fx-processor` or a `mixer-recorder`. Narrowed to those two
   * rather than `DeviceKind`, because both renderers read this with a two-way branch — anything
   * that is not `fx-processor` prints "a mixer and recorder". Widening `DeviceKind` must fail the
   * build here, not silently describe a sequencer as a mixer (§2.5).
   */
  | { kind: 'unit'; deviceKind: 'fx-processor' | 'mixer-recorder' }
  /** Panel labels naming an effect, **in panel order** — the order you read them on the box. */
  | { kind: 'panel'; labels: string[] }
  /**
   * Effect parameters this guide's parts set on this device, by name, in UTF-16 code unit
   * order. Resolved, not authored (#106) — a parameter the box can set but no part in this
   * guide does is not evidence about this guide.
   */
  | { kind: 'recipe'; params: string[] }
  /**
   * The box sets effect parameters somewhere in its library and this guide reaches none of them
   * — it was given no part, or given parts whose recipes touch no effect. The other half of the
   * sentence route 3 used to swallow whole.
   *
   * **Nameless on purpose.** The parameters are real on the hardware and absent from this
   * document, and printing them here is precisely the #106 false positive. What this variant
   * carries is that the box has effects; what it withholds is any control to go looking for.
   *
   * Emitted only when it is the whole story. A box already named by `unit` or `panel` is
   * already in the section, and a second, weaker clause under a `MASTER FX` silkscreen would
   * restate that claim in worse words. So `unused` never shares an evidence array — which is
   * what lets both renderers print it as a clause standing alone.
   */
  | { kind: 'unused' }

export type FxSource = {
  deviceId: DeviceId
  name: string
  /** Never empty, and always in the order above: what the box is, then panel, then recipes. */
  evidence: FxEvidence[]
}

/** Code unit order (§7.2). No `localeCompare` — ICU collation is not the same on two machines. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** First occurrence wins, so panel order survives the dedupe. */
function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function panelLabels(device: Device): string[] {
  const labels: string[] = []
  for (const feature of device.panel?.features ?? []) {
    const text =
      feature.kind === 'label' ? feature.text : 'label' in feature ? feature.label : undefined
    if (text !== undefined && isEffectLabel(text)) labels.push(text)
  }
  return unique(labels)
}

/**
 * Effect parameter names per device, from what actually resolved (#106).
 *
 * Built once for the whole rig rather than per device, so the cost is one pass over the
 * assignments however many boxes are in the rack. `ResolvedParam.name` is the authored name
 * unchanged — mood moves values, never names (§6.1) — so the same token matching applies to
 * both sides of the resolver.
 *
 * Sorted by code unit (§7.2), which is what makes the answer independent of assignment order:
 * two rigs that resolve the same effect parameters in a different order print the same list.
 */
function resolvedEffectParams(
  assignments: readonly ResolvedAssignment[],
): Map<DeviceId, string[]> {
  const byDevice = new Map<DeviceId, string[]>()
  for (const assignment of assignments) {
    for (const param of assignment.params) {
      if (!isEffectParam(param.name)) continue
      const names = byDevice.get(assignment.deviceId) ?? []
      names.push(param.name)
      byDevice.set(assignment.deviceId, names)
    }
  }
  return new Map([...byDevice].map(([id, names]) => [id, unique(names).sort(byCodeUnit)]))
}

/**
 * Does this box set an effect parameter anywhere in its authored library — the *capability*
 * question, asked once, and only to choose between two rack-level sentences.
 *
 * It reads `device.recipes`, which is the read #106 took out of the evidence path, so the
 * difference is worth being exact about. #106's fault was a capability fact printed as a
 * per-guide one: "carries DELAY SEND and REVERB SEND in its recipes" named two controls the
 * reader could not find anywhere in the document. Nothing this answer decides reaches the page
 * as a parameter name. It decides only whether "nothing in this rig processes audio" is true of
 * the rack — and of a rack holding a box with a reverb send in its library, it is not.
 */
function authorsEffectParam(device: Device): boolean {
  return device.recipes.some((recipe) => recipe.params.some((param) => isEffectParam(param.name)))
}

/**
 * In the rig's own order — the same order phase 3 lists the rig in, so a reader meets the boxes
 * twice in one sequence. A device with no evidence is absent rather than present-and-empty:
 * "nothing here processes audio" is one claim about the rig, not one claim per box.
 *
 * `assignments` is required rather than defaulted (#106). A default would let a caller keep the
 * capability-shaped answer by omitting an argument, which is precisely the mistake this call
 * signature exists to make impossible; both renderers hold a whole `ResolveResult` and have
 * nothing to lose by passing it. Pass `[]` deliberately to ask what a box declares about itself
 * with no guide in hand: routes 1 and 2 answer as they always do, and route 3 answers `unused`
 * for every box with an effect parameter in its library — which is the honest answer to "what
 * does this guide set", asked of no guide.
 */
export function fxSources(
  devices: readonly Device[],
  assignments: readonly ResolvedAssignment[],
): FxSource[] {
  const resolved = resolvedEffectParams(assignments)
  const sources: FxSource[] = []
  for (const device of devices) {
    const evidence: FxEvidence[] = []
    if (device.kind === 'fx-processor' || device.kind === 'mixer-recorder') {
      evidence.push({ kind: 'unit', deviceKind: device.kind })
    }
    const labels = panelLabels(device)
    if (labels.length > 0) evidence.push({ kind: 'panel', labels })
    const params = resolved.get(device.id) ?? []
    if (params.length > 0) evidence.push({ kind: 'recipe', params })
    if (evidence.length === 0 && authorsEffectParam(device)) evidence.push({ kind: 'unused' })
    if (evidence.length > 0) sources.push({ deviceId: device.id, name: device.name, evidence })
  }
  return sources
}
