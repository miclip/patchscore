import type { SectionName } from './ids'
import type { ResolveResult, ResolvedAssignment } from './pipeline'
import type { DensityBand } from './template'
import { STEPS_PER_BAR } from './template'
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
  /**
   * What this group actually asks the reader to program (#152).
   *
   * A bare `band 3` labels the group without saying anything a reader can act on: nothing in
   * the number says whether band 3 is the busy one or the empty one, and the answer is a
   * property of the template, which authors each band's variants freely. Two counts make two
   * groups comparable at a glance — *2 parts, 6 strikes* against *6 parts, 48 strikes* — which
   * is the whole of what the label was failing to do.
   *
   * Counted from the patterns that actually play, so a part that fell back to another band
   * contributes what it fell back to rather than what was asked for. Parts with nothing
   * authored here contribute nothing and are reported separately by `silent`.
   *
   * Deliberately an aggregate and not a roll-call. Per-role strike counts are phase 5's
   * subject and it prints the grids themselves; repeating them here is how this section grew
   * into a second copy of the guide the last time, which is what the module docstring is
   * about.
   */
  programs: BandProgramming
}

/**
 * The size of one group's programming job, in template-owned facts.
 *
 * Both are plain counts, so nothing here can drift across platforms (invariant 6).
 *
 * **A cycle length is deliberately not among them.** It was, and it collided: phase 1 counts a
 * section's bars and phase 5 counts a pattern's length, so a third number in bars — the longest
 * cycle in the group — put three different meanings of "how long" in one guide. #142 is the
 * record of what that costs a reader, and a group-level maximum is the least defensible of the
 * three anyway, since nobody programs the longest cycle: they program each part's own. Phase 5
 * has the per-part length, where it is actionable.
 */
export type BandProgramming = {
  /** Parts with a pattern that plays here. Excludes `silent` parts and `unpatterned` roles. */
  parts: number
  /** Total hits across those parts, one cycle each: how much there is to punch in. */
  strikes: number
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
    // #152. Accumulated over the same walk, from the pattern that plays rather than the one
    // asked for — a group whose every part fell back to band 2 programs band 2's strikes, and
    // a summary counting the band on the label would be describing patterns nobody plays.
    const programs: BandProgramming = { parts: 0, strikes: 0 }
    for (const part of section.parts) {
      const s = part.entry.selection
      if (s.outcome === 'none') {
        if (!alwaysSilent.has(part.role)) silent.push(part.role)
        continue
      }
      programs.parts += 1
      programs.strikes += s.pattern.hits.length
      if (s.outcome === 'fallback') {
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
      programs,
    })
  }

  return { groups, unpatterned }
}

// ---------------------------------------------------------------------------
// #105 — sections that are not a whole number of what the part plays
// ---------------------------------------------------------------------------

/**
 * How one section is built out of the thing the part actually repeats, when it does not divide.
 *
 * Drone Study, seed 1: a 16-bar hook and a 4-bar variant against sections of 9, 15, 21, 33, 18,
 * 24 and 12 bars. Nothing divides — and that is authored intent, not arithmetic drift: the
 * template's own note says the out-of-phase boundaries are "what stops 132 bars of one note
 * reading as a loop". The lengths must not be rounded (#105). What was missing is the other
 * half of that decision: on a box where you build a pattern and chain it in Song mode, a 9-bar
 * section made of a 4-bar pattern is not playable as written unless the guide says how the last
 * copy is cut.
 *
 * Derived here rather than in either renderer for the same reason the band trajectory is: it is
 * a musical claim about the box in front of somebody, and two copies of it could disagree.
 */
export type SectionChain = {
  section: SectionName
  bars: number
  /** Bars in one copy of what this part repeats — a step variant, or its hook (#100). */
  unitBars: number
  /** Whole copies that fit. **0 where the section is shorter than one copy** — Drone Study's
   * 9-bar Settle against a 16-bar hook is one copy cut short and no full one at all. */
  full: number
  /** Bars in the final, shortened copy. Always 1..`unitBars - 1` — an even fit is not listed. */
  remainder: number
}

/**
 * The sections **this part** cannot fill with whole copies, in structure order.
 *
 * Empty for a part whose every section divides evenly, which is the common case and prints
 * nothing: a guide that explains long division under a 16-bar section made of 4-bar patterns is
 * a guide that has stopped being read by the time it says something true.
 *
 * Per section rather than per part, because the unit can change between them — §6.3 picks the
 * band per section, and bands hold variants of different lengths, so one part can be 4 bars in
 * the Drop and 1 bar in the Intro. A part deferring to its hook (#100) repeats the hook instead,
 * so that is the unit for every section it occupies.
 */
export function chainPlan(result: ResolveResult, a: ResolvedAssignment): SectionChain[] {
  const chosen = result.song.hooks.find((h) => h.forRole === a.role)?.chosen
  const hookBars =
    a.hookAuthority === undefined || chosen === undefined || chosen.outcome !== 'resolved'
      ? undefined
      : chosen.hook.bars

  const barsOf = new Map(result.template.structure.map((s) => [s.name, s.bars]))
  const out: SectionChain[] = []
  for (const entry of a.patterns) {
    const unitBars =
      hookBars ??
      (entry.selection.outcome === 'none'
        ? undefined
        : entry.selection.pattern.length / STEPS_PER_BAR)
    const bars = barsOf.get(entry.section)
    // A unit of no bars divides nothing, and a fractional one would put a false claim about the
    // grid on the page. Both are unreachable through validated data; neither is guessed at.
    if (unitBars === undefined || bars === undefined) continue
    if (!Number.isInteger(unitBars) || unitBars < 1) continue
    const remainder = bars % unitBars
    if (remainder === 0) continue
    out.push({ section: entry.section, bars, unitBars, full: (bars - remainder) / unitBars, remainder })
  }
  return out
}
