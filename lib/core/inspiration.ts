import { z } from 'zod'
import type { InspirationId } from './ids'
import { compareCodeUnits } from './resolver'
import {
  PatternSchema,
  RoleRequestSchema,
  TemplateSchema,
  type DensityBand,
  type Pattern,
  type RoleRequest,
  type Template,
} from './template'
import type { Role } from './vocabulary'

/**
 * §5. Inspirations: additive modifiers that patch a template, so "industrial techno with a
 * reggae influence" is one coherent thing rather than two genres stapled together.
 *
 * ---------------------------------------------------------------------------
 * The rule that shapes everything else
 * ---------------------------------------------------------------------------
 *
 * **An inspiration never names a template's internals.** No template id, no section name, no
 * request id, no pattern id belonging to anything but itself. This is invariant 3 one layer up:
 * a template must not name a device, and an inspiration must not name a template. The shared
 * vocabulary is `Role`, `Character`, `MoodAxis` and `PatternSlot`, and an inspiration speaks
 * that and nothing else.
 *
 * The consequence worth stating out loud, because it is the whole design: **replacement is keyed
 * on `(role, band)`**. A reggae inspiration says "for the kick role at band 2, play this
 * instead", which is template-agnostic, deterministic, and reads as musical intent. Keyed on a
 * `Pattern.id` it would say "replace `it-kick-b2`", which works on exactly one template and makes
 * every inspiration a per-template patch wearing a general name.
 *
 * A second consequence: an inspiration's added requests are always `continuous`, and its patterns
 * never carry `sections`. Both of those fields name sections, sections are authored per template,
 * and there is no template-agnostic way to say "the Drop" (§4.2). The schema enforces it.
 *
 * ---------------------------------------------------------------------------
 * Why replacement at all, when §5 calls these "additive modifiers"
 * ---------------------------------------------------------------------------
 *
 * Because purely additive is a lottery. If a reggae kick merely *joins* the pool of variants at
 * `(kick, 2)`, then which kick you hear depends on which id sorts first — and a reroll can
 * change whether the track sounds like reggae at all. §5's claim is that the combination is
 * coherent, and coherent means reliably audible. So an inspiration that claims `(kick, 2)`
 * *takes* it: the template's variants there are removed and the inspiration's installed.
 *
 * Addition stays for what addition is actually for — a role the template does not request, and
 * patterns for a role the template authors none for.
 *
 * ---------------------------------------------------------------------------
 * Conflicts are refused, never resolved
 * ---------------------------------------------------------------------------
 *
 * Two inspirations that both claim `(kick, 2)` genuinely collide. Picking a winner by id order
 * would make the result depend on an invisible alphabetical accident, which is the class of
 * thing §7.2's seeding discipline exists to keep out of this design. So the combination is
 * refused, by name: "reggae and dancehall both replace the kick at band 2; they cannot be
 * combined". That is the same posture as a gap (invariant 5) — say what cannot be done rather
 * than quietly doing something arbitrary.
 *
 * Non-conflicting inspirations compose in canonical id order, which is safe precisely because
 * nothing about the outcome depends on it.
 *
 * ---------------------------------------------------------------------------
 * Nothing is silent
 * ---------------------------------------------------------------------------
 *
 * A replacement aimed at a `(role, band)` the template does not author is *reported*, never
 * dropped: "this template has no band-3 kick, so the one-drop kick was not applied". A toggle
 * that visibly does nothing is the failure §6.3 warns about, and an inspiration that silently
 * does nothing is the same bug wearing a different hat.
 */

// ---------------------------------------------------------------------------
// The patch
// ---------------------------------------------------------------------------

/** §5. A BPM move, expressed as a shift so it composes and stays template-agnostic. */
export type BpmShift = { shift: number }

export const BpmShiftSchema = z.strictObject({ shift: z.number().finite() })

/**
 * The lowest BPM a shift may land a template on. Not a musical judgement about how slow a track
 * may be — it is the floor that keeps `BpmSpec` positive and therefore schema-valid when two
 * inspirations both pull the tempo down. Clamping is reported (`bpm-clamped`).
 */
export const MIN_EFFECTIVE_BPM = 20

export type InspirationPatch = {
  /** Shifts `min`, `max` and `default` alike, so the range keeps its shape. */
  bpm?: BpmShift
  /**
   * Whole role requests for parts the template does not have. `continuous` only: a transient
   * request must list sections (§4.2), and section names are template-internal.
   */
  addRoles?: RoleRequest[]
  /** Variants for a role the template authors none for. Never carry `sections`. */
  addPatterns?: Pattern[]
  /** Variants that *take* their `(role, band)` from the template. Never carry `sections`. */
  replacePatterns?: Pattern[]
  /** What a reader should know that no parameter can say. Rendered beside the guide. */
  notes?: string[]
}

export type Inspiration = {
  id: InspirationId
  name: string
  patch: InspirationPatch
}

/** `(role, band)` as one comparable key. The unit an inspiration claims and collides on. */
export type SlotKey = string

export function slotKey(role: Role, band: DensityBand): SlotKey {
  return `${role}|${String(band)}`
}

/**
 * Every id an inspiration authors is prefixed with its own id. Two things fall out of one rule:
 * an inspiration can never collide with a template's request or pattern ids without also
 * claiming to *be* that template, and a reader looking at a rendered guide can see which part
 * of it came from where.
 */
function ownsId(inspirationId: string, authored: string): boolean {
  return authored.startsWith(`${inspirationId}-`)
}

export const InspirationSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    patch: z.strictObject({
      bpm: BpmShiftSchema.optional(),
      addRoles: z.array(RoleRequestSchema).optional(),
      addPatterns: z.array(PatternSchema).optional(),
      replacePatterns: z.array(PatternSchema).optional(),
      notes: z.array(z.string().min(1)).optional(),
    }),
  })
  .superRefine((inspiration, ctx) => {
    const { id, patch } = inspiration
    const roles = patch.addRoles ?? []
    const added = patch.addPatterns ?? []
    const replaced = patch.replacePatterns ?? []

    roles.forEach((request, i) => {
      if (request.sustain !== 'continuous') {
        ctx.addIssue({
          code: 'custom',
          message:
            'an inspiration may only add continuous requests: a transient one names sections, ' +
            'and section names are template-internal (§4.2, §5)',
          path: ['patch', 'addRoles', i, 'sustain'],
        })
      }
      if (!ownsId(id, request.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `request id '${request.id}' must begin with '${id}-' (§5)`,
          path: ['patch', 'addRoles', i, 'id'],
        })
      }
    })

    const patterns: [Pattern, string, number][] = [
      ...added.map((p, i) => [p, 'addPatterns', i] as [Pattern, string, number]),
      ...replaced.map((p, i) => [p, 'replacePatterns', i] as [Pattern, string, number]),
    ]
    for (const [pattern, field, i] of patterns) {
      if (pattern.sections !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'an inspiration pattern may not name sections: they are authored per template (§5)',
          path: ['patch', field, i, 'sections'],
        })
      }
      if (!ownsId(id, pattern.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `pattern id '${pattern.id}' must begin with '${id}-' (§5)`,
          path: ['patch', field, i, 'id'],
        })
      }
    }

    const ids = [...roles.map((r) => r.id), ...added.map((p) => p.id), ...replaced.map((p) => p.id)]
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'ids authored by one inspiration must be unique',
        path: ['patch'],
      })
    }

    // An inspiration that both adds and replaces the same `(role, band)` is asking for two
    // different things in the same place. Nothing downstream could honour both, and the
    // conflict rule between *two* inspirations would be a strange place to discover it.
    const addedSlots = new Set(added.map((p) => slotKey(p.forRole, p.band)))
    for (const [i, pattern] of replaced.entries()) {
      if (addedSlots.has(slotKey(pattern.forRole, pattern.band))) {
        ctx.addIssue({
          code: 'custom',
          message: `'${pattern.forRole}' at band ${pattern.band} is both added and replaced`,
          path: ['patch', 'replacePatterns', i],
        })
      }
    }
  })

// ---------------------------------------------------------------------------
// What applying one says out loud
// ---------------------------------------------------------------------------

/**
 * Something an inspiration asked for that this template could not give it. Every one of these
 * is a *no-op that would otherwise be silent*, which is the only reason the type exists.
 */
export type InspirationDiagnostic =
  | {
      kind: 'no-such-target'
      inspirationId: InspirationId
      role: Role
      band: DensityBand
      detail: string
    }
  | { kind: 'role-already-patterned'; inspirationId: InspirationId; role: Role; detail: string }
  | { kind: 'role-already-requested'; inspirationId: InspirationId; role: Role; detail: string }
  | { kind: 'bpm-clamped'; detail: string }

/** One inspiration's prose, carried through with its name so a reader knows whose claim it is. */
export type InspirationNote = { inspirationId: InspirationId; name: string; text: string }

/**
 * Two inspirations claiming the same thing. `band` is absent when the claim is a whole added
 * role rather than one band of it.
 */
export type InspirationConflict = {
  role: Role
  band?: DensityBand
  /** Both ids, in canonical order. */
  between: [InspirationId, InspirationId]
  /** Both names, in the same order — this is the half a person reads. */
  names: [string, string]
}

export type InspirationApplication =
  | {
      outcome: 'applied'
      /** The effective template §7 resolves against. A fresh object; the base is untouched. */
      template: Template
      /** Ids actually applied, in canonical order. */
      applied: readonly InspirationId[]
      notes: readonly InspirationNote[]
      diagnostics: readonly InspirationDiagnostic[]
    }
  | {
      outcome: 'refused'
      reason: 'too-many' | 'duplicate' | 'conflict' | 'invalid-result'
      /** Populated for `conflict`, empty otherwise. */
      conflicts: readonly InspirationConflict[]
      /** One sentence, already fit to show a person. */
      detail: string
    }

/** §5: "Inspirations must compose; cap at two." */
export const INSPIRATION_CAP = 2

// ---------------------------------------------------------------------------
// Applying them
// ---------------------------------------------------------------------------

/** What one inspiration claims, which is what another one may collide with. */
function claims(inspiration: Inspiration): { roles: Set<Role>; slots: Set<SlotKey> } {
  const patch = inspiration.patch
  const slots = new Set<SlotKey>()
  for (const pattern of [...(patch.addPatterns ?? []), ...(patch.replacePatterns ?? [])]) {
    slots.add(slotKey(pattern.forRole, pattern.band))
  }
  return { roles: new Set((patch.addRoles ?? []).map((r) => r.role)), slots }
}

function conflictsBetween(a: Inspiration, b: Inspiration): InspirationConflict[] {
  const left = claims(a)
  const right = claims(b)
  const out: InspirationConflict[] = []

  for (const key of [...left.slots].sort(compareCodeUnits)) {
    if (!right.slots.has(key)) continue
    const [role, band] = key.split('|') as [Role, string]
    out.push({
      role,
      band: Number(band) as DensityBand,
      between: [a.id, b.id],
      names: [a.name, b.name],
    })
  }
  for (const role of [...left.roles].sort(compareCodeUnits)) {
    if (!right.roles.has(role)) continue
    // A role both of them add, where neither authored a pattern that already collided above.
    if (out.some((c) => c.role === role)) continue
    out.push({ role, between: [a.id, b.id], names: [a.name, b.name] })
  }
  return out
}

function conflictSentence(conflicts: readonly InspirationConflict[]): string {
  const first = conflicts[0] as InspirationConflict
  const where = conflicts
    .map((c) => (c.band === undefined ? `${c.role}` : `${c.role} at band ${String(c.band)}`))
    .join(', ')
  return (
    `${first.names[0]} and ${first.names[1]} both claim ${where}; ` +
    'they cannot be combined. Choose one of the two, or a different pair.'
  )
}

/**
 * §5 / §7 step 1, performed by the caller. Pure: same base template and same inspirations, the
 * same effective template, on any platform (invariant 6).
 *
 * The base template is never mutated — every array the result carries is a new one, and nothing
 * inside it is shared with an object a caller could later change. With no inspirations selected
 * the base is returned as-is, which is the one case where sharing is safe because nothing here
 * has written to it.
 *
 * **Every decision is taken against the base template, never against the partially-composed
 * one.** Inspirations patch the template; they do not patch each other. Evaluating them all
 * against the same base is what makes "compose in canonical id order" a statement about
 * bookkeeping rather than about outcomes.
 */
export function applyInspirations(
  template: Template,
  inspirations: readonly Inspiration[],
): InspirationApplication {
  if (inspirations.length === 0) {
    return { outcome: 'applied', template, applied: [], notes: [], diagnostics: [] }
  }

  if (inspirations.length > INSPIRATION_CAP) {
    return {
      outcome: 'refused',
      reason: 'too-many',
      conflicts: [],
      detail:
        `${String(inspirations.length)} inspirations were selected and the limit is ` +
        `${String(INSPIRATION_CAP)} (§5). Two influences make a track; three make a mess.`,
    }
  }

  const ids = inspirations.map((i) => i.id)
  if (new Set(ids).size !== ids.length) {
    return {
      outcome: 'refused',
      reason: 'duplicate',
      conflicts: [],
      detail: 'the same inspiration was selected twice',
    }
  }

  // Canonical order, so composition is a fixed sequence rather than the order a UI happened to
  // hand them over in. Nothing about the outcome depends on it — conflicts are refused below.
  const ordered = [...inspirations].sort((a, b) => compareCodeUnits(a.id, b.id))

  const conflicts: InspirationConflict[] = []
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      conflicts.push(
        ...conflictsBetween(ordered[i] as Inspiration, ordered[j] as Inspiration),
      )
    }
  }
  if (conflicts.length > 0) {
    return {
      outcome: 'refused',
      reason: 'conflict',
      conflicts,
      detail: conflictSentence(conflicts),
    }
  }

  const diagnostics: InspirationDiagnostic[] = []
  const notes: InspirationNote[] = []

  // What the *base* authors, which is what every decision below is taken against.
  const baseSlots = new Set(template.patterns.map((p) => slotKey(p.forRole, p.band)))
  const basePatternedRoles = new Set(template.patterns.map((p) => p.forRole))
  const baseRequestedRoles = new Set(template.roles.map((r) => r.role))

  const removed = new Set<SlotKey>()
  const addedPatterns: Pattern[] = []
  const addedRoles: RoleRequest[] = []
  let shift = 0

  for (const inspiration of ordered) {
    const patch = inspiration.patch
    if (patch.bpm !== undefined) shift += patch.bpm.shift

    for (const pattern of patch.replacePatterns ?? []) {
      const key = slotKey(pattern.forRole, pattern.band)
      if (!baseSlots.has(key)) {
        diagnostics.push({
          kind: 'no-such-target',
          inspirationId: inspiration.id,
          role: pattern.forRole,
          band: pattern.band,
          detail:
            `'${template.name}' authors no ${pattern.forRole} at band ${String(pattern.band)}, ` +
            `so ${inspiration.name}'s replacement for it was not applied`,
        })
        continue
      }
      removed.add(key)
      addedPatterns.push({ ...pattern, hits: pattern.hits.map((h) => ({ ...h })) })
    }

    // Grouped by role, because "the template already programs this part" is a fact about the
    // role and not about one band of it. Installing three of an inspiration's four bands beside
    // the template's own would produce exactly the mixed arrangement replacement exists to stop.
    const addByRole = new Map<Role, Pattern[]>()
    for (const pattern of patch.addPatterns ?? []) {
      addByRole.set(pattern.forRole, [...(addByRole.get(pattern.forRole) ?? []), pattern])
    }
    for (const [role, group] of addByRole) {
      if (basePatternedRoles.has(role)) {
        diagnostics.push({
          kind: 'role-already-patterned',
          inspirationId: inspiration.id,
          role,
          detail:
            `'${template.name}' already authors its own ${role}, so ${inspiration.name}'s was ` +
            'not added — an inspiration replaces a part it wants to own, it does not join it',
        })
        continue
      }
      for (const pattern of group) {
        addedPatterns.push({ ...pattern, hits: pattern.hits.map((h) => ({ ...h })) })
      }
    }

    for (const request of patch.addRoles ?? []) {
      if (baseRequestedRoles.has(request.role)) {
        diagnostics.push({
          kind: 'role-already-requested',
          inspirationId: inspiration.id,
          role: request.role,
          detail:
            `'${template.name}' already asks for a ${request.role}, so ${inspiration.name}'s ` +
            'was not added as a second one',
        })
        continue
      }
      addedRoles.push({ ...request })
    }

    for (const text of patch.notes ?? []) {
      notes.push({ inspirationId: inspiration.id, name: inspiration.name, text })
    }
  }

  const bpm = shiftBpm(template, shift, diagnostics)

  const effective: Template = {
    ...template,
    bpm,
    structure: template.structure.map((s) => ({ ...s })),
    harmony: {
      cycleBars: template.harmony.cycleBars,
      progression: template.harmony.progression.map((p) => ({ ...p })),
    },
    keys: [...template.keys],
    hooks: template.hooks.map((h) => ({ ...h, notes: h.notes.map((n) => ({ ...n })) })),
    roles: [...template.roles.map((r) => ({ ...r })), ...addedRoles],
    patterns: [
      ...template.patterns
        .filter((p) => !removed.has(slotKey(p.forRole, p.band)))
        .map((p) => ({ ...p, hits: p.hits.map((h) => ({ ...h })) })),
      ...addedPatterns,
    ],
  }

  // The effective template is what §7 resolves against, so it has to be a legal template — not
  // merely a plausible one. Reporting a refusal here rather than handing the resolver something
  // malformed keeps the failure at the layer that caused it.
  const parsed = TemplateSchema.safeParse(effective)
  if (!parsed.success) {
    return {
      outcome: 'refused',
      reason: 'invalid-result',
      conflicts: [],
      detail: `composing produced a template that is not valid: ${parsed.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    }
  }

  return {
    outcome: 'applied',
    template: effective,
    applied: ordered.map((i) => i.id),
    notes,
    diagnostics,
  }
}

/**
 * A shift moves `min`, `max` and `default` together, so the range keeps its width and its
 * default keeps its place inside it. The clamp is monotonic, so that ordering survives it too:
 * `min <= default <= max` before means the same after, whether or not the floor bites.
 */
function shiftBpm(
  template: Template,
  shift: number,
  diagnostics: InspirationDiagnostic[],
): Template['bpm'] {
  if (shift === 0) return { ...template.bpm }
  const move = (value: number) => Math.max(MIN_EFFECTIVE_BPM, value + shift)
  const bpm = {
    min: move(template.bpm.min),
    max: move(template.bpm.max),
    default: move(template.bpm.default),
  }
  if (bpm.min !== template.bpm.min + shift) {
    diagnostics.push({
      kind: 'bpm-clamped',
      detail:
        `a shift of ${String(shift)} would put '${template.name}' below ` +
        `${String(MIN_EFFECTIVE_BPM)} BPM, so the tempo was held at the floor`,
    })
  }
  return bpm
}
