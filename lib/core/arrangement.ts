import type { SectionName } from './ids'
import type { ResolveResult, ResolvedAssignment } from './pipeline'
import type { DensityBand } from './template'
import type { Role } from './vocabulary'

/**
 * §6.3's band trajectory: the arrangement of a resolved guide, derived once.
 *
 * §8 phase 7 used to print the device list (phase 3 already has it), a bars-and-energy table
 * (phase 1 already has it) and every part's name under every section heading (phase 2 already
 * has it) — three lists that said nothing phase 5 did not say better. What *is* only there is
 * which sections program **identically, part for part**: at the machine that is the difference
 * between programming six patterns and programming three and copying them.
 *
 * This module derives that and nothing else. It renders nothing, and it is deliberately not
 * part of either renderer: the Markdown guide and the web guide are siblings that share no
 * *rendering* code, which is a rule about ink, not about arithmetic. Two copies of this
 * grouping would be two copies of a musical claim — "these sections are the same page" — and
 * the copy that drifted would be wrong about the box in front of somebody. Facts are shared;
 * only the formatting is written twice.
 */

/** One line of the trajectory: sections that ask the same band *and* program the same way. */
export type BandGroup = {
  /** The band these sections ask for (§6.3). `undefined` when no part occupies them at all. */
  band: DensityBand | undefined
  sections: SectionName[]
  /**
   * Parts that did not play the band asked for, grouped by the band they did play. A renderer
   * must not say the group's band *plays*: it is what was asked for, and these are what came
   * back. `all` is every part in the section falling back the same way — one clause, not a
   * roll-call.
   */
  fallbacks: { roles: Role[]; usedBand: DensityBand; all: boolean }[]
  /** Parts with nothing authored *here*, which do have a pattern in some other section. */
  silent: Role[]
  /** Roles this group programs differently from the first group asking the same band. */
  differsOn: Role[]
}

export type BandTrajectory = {
  /** In `structure` order, first appearance first. */
  groups: BandGroup[]
  /**
   * Parts with no pattern in any section they occupy: the band never applies to them.
   *
   * The only per-part fact this module carries. Which sections a part *occupies* is phase 2's
   * subject and was briefly repeated here as "parts that come and go" — an exact duplicate,
   * and duplicating a fact is how the section grew into a second copy of the guide the first
   * time. Nothing lands here unless the band trajectory is what makes it true.
   */
  unpatterned: Role[]
}

/** First occurrence wins. A template may request one role twice; `pad and pad` is noise. */
function unique(roles: readonly Role[]): Role[] {
  return [...new Set(roles)]
}

/** What one part plays in one section, compressed to a comparable string. */
function playedSig(entry: ResolvedAssignment['patterns'][number]): string {
  const s = entry.selection
  return s.outcome === 'none' ? 'none' : `${s.pattern.id}:${String(s.usedBand)}`
}

/**
 * Sections are grouped by what actually plays in them, not merely by the band they ask for.
 * Two sections asking band 2 where a role has a section-scoped variant do not program alike,
 * and a line claiming they do would send someone to copy the wrong pattern.
 *
 * Pure and order-stable: every iteration below walks `structure` order or assignment order,
 * and no comparison is locale-dependent (§7.2), so this is safe under invariant 6.
 */
export function bandTrajectory(result: ResolveResult): BandTrajectory {
  const perSection = result.template.structure.map((section) => ({
    name: section.name,
    parts: result.assignments.flatMap((a) => {
      const entry = a.patterns.find((p) => p.section === section.name)
      return entry === undefined ? [] : [{ requestId: a.requestId, role: a.role, entry }]
    }),
  }))

  // A part is only outside the shape if it is silent in *every* section it occupies. One
  // silent section is a fact about that group; silence everywhere is a fact about the part.
  const unpatterned = unique(
    result.assignments
      .filter(
        (a) => a.patterns.length > 0 && a.patterns.every((p) => p.selection.outcome === 'none'),
      )
      .map((a) => a.role),
  )
  const alwaysSilent = new Set(unpatterned)

  const groups: BandGroup[] = []
  const sigs: Map<string, string>[] = []
  const byKey = new Map<string, number>()
  const firstAtBand = new Map<string, number>()

  for (const section of perSection) {
    const sig = new Map(section.parts.map((p) => [p.requestId, playedSig(p.entry)]))
    const first = section.parts[0]
    const band = first === undefined ? undefined : first.entry.selection.band
    // The band asked for is part of the key, not only what played. Two sections can land on
    // the same variant from different bands — one exactly, one by falling back — and one line
    // labelled with the first section's band would be wrong about the second.
    const key = [band, ...[...sig].map(([id, v]) => `${id}=${v}`)].join('|')
    const existing = byKey.get(key)
    if (existing !== undefined) {
      ;(groups[existing] as BandGroup).sections.push(section.name)
      continue
    }

    const fallbacks = new Map<DensityBand, Role[]>()
    const silent: Role[] = []
    for (const part of section.parts) {
      const s = part.entry.selection
      if (s.outcome === 'none') {
        if (!alwaysSilent.has(part.role)) silent.push(part.role)
      } else if (s.outcome === 'fallback') {
        fallbacks.set(s.usedBand, [...(fallbacks.get(s.usedBand) ?? []), part.role])
      }
    }

    // Two groups can ask the same band and still differ — a section-scoped variant, or a part
    // that only plays in one of them. Saying which roles differ is what stops two lines reading
    // as the same line printed twice.
    const differsOn: Role[] = []
    const bandKey = band === undefined ? 'none' : String(band)
    const twin = firstAtBand.get(bandKey)
    if (twin === undefined) firstAtBand.set(bandKey, groups.length)
    else {
      const other = sigs[twin] as Map<string, string>
      const roleOf = new Map(result.assignments.map((a) => [a.requestId, a.role]))
      for (const id of new Set([...sig.keys(), ...other.keys()])) {
        if (sig.get(id) !== other.get(id)) differsOn.push(roleOf.get(id) as Role)
      }
    }

    byKey.set(key, groups.length)
    sigs.push(sig)
    groups.push({
      band,
      sections: [section.name],
      fallbacks: [...fallbacks].map(([usedBand, roles]) => ({
        usedBand,
        roles: unique(roles),
        all: roles.length === section.parts.length,
      })),
      silent: unique(silent),
      differsOn: unique(differsOn),
    })
  }

  return { groups, unpatterned }
}
