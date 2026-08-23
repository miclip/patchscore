import type { DeviceId } from './ids'
import type { Device, DeviceKind } from './device'

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
 *   3. Recipe parameter names. A recipe that sets `REVERB SEND` is a recipe that will not sound
 *      as authored unless the box has a reverb.
 *
 * All three are name matches against `EFFECT_TOKENS`, and a name match is weaker evidence than
 * a declaration. It is what the current schema affords. Two consequences worth knowing:
 * detection is blind to a device with no panel drawing and no effect parameters (its FX would
 * go unmentioned), and a knob labelled `DELAY` that is really an envelope delay would be read
 * as an effect. The first under-claims and the second over-claims, and both do it quietly.
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
function isEffectName(text: string): boolean {
  const words = text.toUpperCase().split(/[^A-Z0-9]+/)
  return words.some((word) => EFFECT_TOKENS.includes(word))
}

/** Why we say this box processes audio. One device may have more than one. */
export type FxEvidence =
  /** The box is the processing: an `fx-processor` or a `mixer-recorder`. */
  | { kind: 'unit'; deviceKind: DeviceKind }
  /** Panel labels naming an effect, **in panel order** — the order you read them on the box. */
  | { kind: 'panel'; labels: string[] }
  /** Effect parameters this device's recipes set, by name, in UTF-16 code unit order. */
  | { kind: 'recipe'; params: string[] }

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
    if (text !== undefined && isEffectName(text)) labels.push(text)
  }
  return unique(labels)
}

function recipeParams(device: Device): string[] {
  const names: string[] = []
  for (const recipe of device.recipes) {
    for (const param of recipe.params) if (isEffectName(param.name)) names.push(param.name)
  }
  return unique(names).sort(byCodeUnit)
}

/**
 * A pure function of device data, in the rig's own order — the same order phase 3 lists the rig
 * in, so a reader meets the boxes twice in one sequence. A device with no evidence is absent
 * rather than present-and-empty: "nothing here processes audio" is one claim about the rig, not
 * one claim per box.
 */
export function fxSources(devices: readonly Device[]): FxSource[] {
  const sources: FxSource[] = []
  for (const device of devices) {
    const evidence: FxEvidence[] = []
    if (device.kind === 'fx-processor' || device.kind === 'mixer-recorder') {
      evidence.push({ kind: 'unit', deviceKind: device.kind })
    }
    const labels = panelLabels(device)
    if (labels.length > 0) evidence.push({ kind: 'panel', labels })
    const params = recipeParams(device)
    if (params.length > 0) evidence.push({ kind: 'recipe', params })
    if (evidence.length > 0) sources.push({ deviceId: device.id, name: device.name, evidence })
  }
  return sources
}
