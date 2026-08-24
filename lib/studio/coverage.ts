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
 * The counts are two, kept apart. A template's optional requests are filled if they fit and
 * dropped if they do not (§4.4), so one fraction over every request understates a box that
 * covers everything a direction actually needs.
 */
export type Coverage = {
  deviceId: string
  templateId: string
  /** Every request the template makes. */
  requests: number
  /** Requests this box was assigned. */
  covered: number
  /** Requests that are not optional. */
  required: number
  requiredCovered: number
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
  const required = template.roles.filter((request) => request.optional !== true)
  const filled = new Set(result.assignments.map((a) => a.requestId))
  return {
    deviceId: device.id,
    templateId: template.id,
    requests: template.roles.length,
    covered: result.assignments.length,
    required: required.length,
    requiredCovered: required.filter((request) => filled.has(request.id)).length,
    roles: template.roles.filter((request) => filled.has(request.id)).map((r) => r.role),
  }
}
