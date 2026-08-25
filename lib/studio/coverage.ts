import type { Device, Role, Template } from '@/lib/core'
import { NEUTRAL_MOOD, resolve } from '@/lib/core'

/**
 * #84. What one box carries of one direction, with nothing else in the rig.
 *
 * Both halves of the catalogue ask this question and they must get the same answer: a device
 * page listing directions and a direction page listing devices are two views of one table, and
 * two implementations of it would eventually disagree in public.
 *
 * It is a real resolve rather than a role-name match. The resolver applies §3.4 character
 * distance, §12.4 polyphony and §12.6 distinctness, and a list of role names can see none of
 * those: a rig of monophonic tracks declares `pad` and still cannot play one.
 *
 * The counts are two, kept apart. A direction declares which of its requests it can be itself
 * without (§4.4), so one fraction over every request understates a box that covers everything
 * the direction actually needs — which was #81's complaint about this table: a groovebox that
 * makes a finished techno track read as 8/12.
 */
export type Coverage = {
  deviceId: string
  templateId: string
  /** Every request the template makes. */
  requests: number
  /** Requests this box was assigned. */
  covered: number
  /**
   * Requests the direction cannot be itself without — everything without an `inessential`
   * declaration (§4.4). Not the same set as "not `optional`", and the name says which: `optional`
   * is the objective's word for a request the search need not spend a voice on, and #81 is what
   * happens when one word answers both questions.
   */
  essential: number
  essentialCovered: number
  /** The roles it carried, in template request order. */
  roles: readonly Role[]
}

/**
 * Neutral mood and a fixed seed: coverage is a property of the box and the direction rather than
 * of a roll. The seed permutes only among exactly equal costs (invariant 6), so this is the same
 * answer on every machine and in every build.
 */
export const COVERAGE_SEED = 1

export function coverage(device: Device, template: Template): Coverage {
  const result = resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed: COVERAGE_SEED })
  const essential = template.roles.filter((request) => request.inessential === undefined)
  const filled = new Set(result.assignments.map((a) => a.requestId))
  return {
    deviceId: device.id,
    templateId: template.id,
    requests: template.roles.length,
    covered: result.assignments.length,
    essential: essential.length,
    essentialCovered: essential.filter((request) => filled.has(request.id)).length,
    roles: template.roles.filter((request) => filled.has(request.id)).map((r) => r.role),
  }
}
