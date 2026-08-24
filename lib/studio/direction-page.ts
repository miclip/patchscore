import type { Character, Device, Role, SectionName, Template } from '@/lib/core'
import { sectionsFor } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { deviceHref, deviceLabel, templateHref } from './catalogue'
import { coverage } from './coverage'

/**
 * #84. Everything a direction page states, computed from the template and the resolver.
 *
 * The mirror of `device-page.ts`, and deliberately not symmetric with it: a template has no
 * maker, no kind and no manual, and giving it one so the two pages matched would be the page
 * dictating the data model (invariant 3). What it has instead is structure, harmony and a list
 * of requests, which is what this reads.
 */

/** One role request, with the two things a reader has to derive: who it is for and when. */
export type RequestLine = {
  id: string
  role: Role
  character: Character
  /** §4.4. Ascending: 1 is most important. */
  priority: number
  optional: boolean
  /** §12.4. Simultaneous notes asked for. 1 unless the request says otherwise. */
  notes: number
  sustain: 'continuous' | 'transient'
  /** §4.2. Every section for a continuous request, the listed ones for a transient one. */
  sections: readonly SectionName[]
  /** §12.6. Requests sharing a role that may not land on the same box. */
  distinct: boolean
}

/**
 * One device against this direction, alone. Every device in the registry appears, zero included:
 * a mixer covering nothing is a fact about the mixer, and a list that quietly dropped it would
 * read as a list of boxes that work.
 */
export type RigFit = {
  deviceId: string
  label: string
  href: string
  covered: number
  requests: number
  required: number
  requiredCovered: number
  roles: readonly Role[]
}

export type DirectionPage = {
  template: Template
  href: string
  title: string
  description: string
  totalBars: number
  requests: readonly RequestLine[]
  /** Registry order (§7.2), the same order the picker and the rack use. */
  rig: readonly RigFit[]
}

export function requestLines(template: Template): readonly RequestLine[] {
  // Authored order. Priority is a number the resolver reads (§4.4), not a sort key for the page:
  // re-sorting by it would hide the fact that two requests share a priority.
  return template.roles.map((request) => ({
    id: request.id,
    role: request.role,
    character: request.character,
    priority: request.priority,
    optional: request.optional === true,
    notes: request.polyphony ?? 1,
    sustain: request.sustain,
    sections: sectionsFor(request, template),
    distinct: request.distinct === true,
  }))
}

export function rigFits(template: Template, devices: readonly Device[] = DEVICES): readonly RigFit[] {
  return devices.map((device) => {
    const cover = coverage(device, template)
    return {
      deviceId: device.id,
      label: deviceLabel(device),
      href: deviceHref(device),
      covered: cover.covered,
      requests: cover.requests,
      required: cover.required,
      requiredCovered: cover.requiredCovered,
      roles: cover.roles,
    }
  })
}

export function totalBars(template: Template): number {
  return template.structure.reduce((sum, section) => sum + section.bars, 0)
}

/** `Industrial Techno — Patchscore`. */
export function templateTitle(template: Template): string {
  return `${template.name} — Patchscore`
}

/**
 * The one sentence a search result shows. What the direction asks for, in the terms someone
 * searching for a genre would recognise: tempo, key, length and how many parts it wants.
 */
export function templateDescription(template: Template): string {
  const keys = template.keys.length === 1 ? template.keys[0] : `${template.keys.length} keys`
  return (
    `${template.name}: ${template.bpm.min}–${template.bpm.max} BPM in ${keys}, ` +
    `${template.structure.length} sections over ${totalBars(template)} bars, ` +
    `${template.roles.length} parts with characters and priorities.`
  )
}

export function directionPage(template: Template): DirectionPage {
  return {
    template,
    href: templateHref(template),
    title: templateTitle(template),
    description: templateDescription(template),
    totalBars: totalBars(template),
    requests: requestLines(template),
    rig: rigFits(template),
  }
}
