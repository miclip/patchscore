import type { TemplateId } from '../core/ids'
import type { Template } from '../core/template'
import { acidLineage } from './acid-lineage'
import { ambientDub } from './ambient-dub'
import { droneStudy } from './drone-study'
import { generativeDrift } from './generative-drift'
import { hipHop } from './hip-hop'
import { industrialTechno } from './industrial-techno'
import { lydianHouse } from './lydian-house'
import { majorKeyElectro } from './major-key-electro'
import { relay } from './relay'
import { weave } from './weave'

/**
 * The template registry. Hand-written and static, unlike `lib/devices/registry.generated.ts`.
 *
 * That asymmetry is deliberate. Invariant 2's promise is about *devices*: adding one must be a
 * single folder with no hand-edited file outside it, because the device library is the part
 * expected to grow by contribution and to grow long. Templates are a handful of authored genres
 * maintained here, and generating this file would buy a drop-in guarantee nobody has asked for
 * at the price of a second codegen step, a second staleness test, and a second thing to explain.
 * If the day comes that templates arrive from outside the repo, the codegen is a small change
 * and this comment is the record of why it was not made first.
 *
 * Ordered by id in UTF-16 code unit order, matching the device registry's convention (§7.2) —
 * insertion order would make the list depend on the order of the imports above.
 */
export const TEMPLATES: readonly Template[] = [
  acidLineage,
  ambientDub,
  droneStudy,
  generativeDrift,
  hipHop,
  industrialTechno,
  lydianHouse,
  majorKeyElectro,
  relay,
  weave,
]

export {
  acidLineage,
  ambientDub,
  droneStudy,
  generativeDrift,
  hipHop,
  industrialTechno,
  lydianHouse,
  majorKeyElectro,
  relay,
  weave,
}

const BY_ID: ReadonlyMap<TemplateId, Template> = new Map(TEMPLATES.map((t) => [t.id, t]))

/** `undefined` for an unknown id — a caller with a stale permalink is not an exception. */
export function templateById(id: TemplateId): Template | undefined {
  return BY_ID.get(id)
}
