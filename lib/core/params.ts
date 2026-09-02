import { z } from 'zod'
import { MoodAxisSchema, type MoodAxis } from './vocabulary'

/**
 * §3.1. Parameters are a discriminated union, and authored params are not rendered params.
 *
 * Two separate claims live here and must not be collapsed:
 *  - `verified` on a *point value* decides `authored` vs `provisional` (the authority gate)
 *  - `verified` on a *range* decides whether mood may move the point at all (the legality gate)
 */

/**
 * §3.1. How a value was checked. No kind is second-class, and `observed` is not a softer
 * `provisional`: `provisional` means nobody checked, `observed` means somebody did, on hardware.
 * They are kept apart because they are **checkable by different people** — a manual page can be
 * re-read by anyone holding the document, a unit reading can only be re-taken on that unit.
 *
 * `maker` is the third, added by #191: a figure the manufacturer publishes **outside the manual**
 * — a product page, a spec sheet, a store listing. It is checkable by anyone with the link, and
 * it is not a manual page, which is the whole distinction. Two devices needed it and neither was
 * the case #191 was filed about: the OP-XY's guide prints no dimension anywhere, so its span is
 * teenage engineering's own published `288 x 102`; the Hapax's two Squarp pages disagree, and the
 * inch conversion printed beside one of them settles it. Both are published figures, and calling
 * them `provisional` said nobody had checked when somebody had.
 *
 * It is deliberately **not** a licence to cite a forum post or a retailer. The source is the
 * manufacturer's own publication, and the string says which page, so a reader can go and look.
 */
export const CITE_KINDS = ['manual', 'observed', 'maker'] as const

export type CiteKind = (typeof CITE_KINDS)[number]

/**
 * A citation, discriminated on how it was obtained. Two shapes rather than one field so the
 * kinds can diverge later (an observation wants firmware; a manual page does not) without
 * another migration across every recipe.
 */
export type Cite =
  /** 'TR-1000 Reference Manual p.42' */
  | { kind: 'manual'; source: string }
  /** 'TR-1000 unit, firmware 1.11' */
  | { kind: 'observed'; source: string }
  /** 'teenage engineering OP-XY product page, teenage.engineering/products/op-xy' */
  | { kind: 'maker'; source: string }

/** `false` = authored, nothing checked against. */
export type Verified = Cite | false

export const CiteSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('manual'),
    source: z.string().min(1, 'a citation needs a source'),
  }),
  z.strictObject({
    kind: z.literal('observed'),
    source: z.string().min(1, 'a citation needs a source'),
  }),
  z.strictObject({
    kind: z.literal('maker'),
    source: z.string().min(1, 'a citation needs a source'),
  }),
])

export const VerifiedSchema = z.union([CiteSchema, z.literal(false)])

/**
 * Bounds are their own claim. A range can be verified while the point inside it is not, and a
 * point can be read off the manual for a parameter whose limits the manual never states.
 */
export type NumericRange = { min: number; max: number; verified?: Verified }

export const NumericRangeSchema = z
  .strictObject({
    min: z.number().finite(),
    max: z.number().finite(),
    verified: VerifiedSchema.optional(),
  })
  .refine((r) => r.min < r.max, {
    message: 'range.min must be strictly less than range.max',
    path: ['min'],
  })

/**
 * §3.2. An enum's option set is its own claim, exactly as a numeric range is — and for exactly
 * the same reason.
 *
 *     numeric:  range   decides legality (cited)  |  value decides authority (taste)
 *     enum:     options decides legality (cited)  |  value decides authority (taste)
 *
 * "`909 Bass Drum` appears in the GEN list under BD_E" is an *options* claim, checkable by
 * anyone holding the document. "This recipe reaches for it for a hard kick" is a *value* claim,
 * and it is taste in precisely the way `TUNE 44` is taste. `options` was a bare `string[]` with
 * nowhere to hang a citation, so the citation went to the only slot available — the param —
 * where it made the second claim while intending only the first. This is the same defect the
 * design review caught for numerics in step 1, when `range` was a bare tuple; it was repaired
 * there and missed here.
 */
export type EnumOptions = { values: string[]; verified?: Verified }

export const EnumOptionsSchema = z.strictObject({
  values: z.array(z.string().min(1)).min(1),
  verified: VerifiedSchema.optional(),
})

/** §6.1. `amount` is authored in device units: "at full darkness this moves 12". */
export type MoodOffset = { axis: MoodAxis; amount: number }

export const MoodOffsetSchema = z.strictObject({
  axis: MoodAxisSchema,
  amount: z.number().finite(),
})

/**
 * §3.1/#107. **What one setting of this parameter covers**, when the answer is not "this part".
 *
 * A recipe is authored per voice, so every parameter in it reads as a per-voice setting. Most
 * are. Some are not: the Tracker Mini's `SWING` and the TR-1000's Pattern Shuffle are one
 * setting for the whole pattern, and the guide was printing them once per track — nine lines in
 * the landing rig, each with a note explaining that the other eight were the same number. A
 * reader dialling them in order sets one control nine times and reasonably wonders which of the
 * nine the box actually kept.
 *
 * Absent means per-part, which is the ordinary case and stays unannotated. Present means the
 * renderer may state it **once per device**, above the parts.
 *
 * **Why two values rather than one flag.** `song` is not `pattern`, and the two are not
 * interchangeable to a reader deciding what a setting outlives. The Tracker Mini's `SWING` and
 * the TR-1000's Pattern Shuffle are authored *pattern*-wide; the Deluge's `SWING` is authored
 * `song-wide, not per clip`. Both hoist identically — the mechanism needs one bit — but the
 * *word* printed beside the hoisted line is the device's own claim, and collapsing them would
 * print one box's claim over another's.
 *
 * Each value comes from the scope its device already committed to in that parameter's `note`,
 * which is where the manual reading was recorded when it was made. This module adds no reading
 * of its own and cites no page: it is the vocabulary those notes are expressed in, nothing more.
 *
 * The MC-101's `SHUFFLE` is deliberately absent from this list rather than given a third value.
 * Its authored note is `One setting for the whole clip, not per step` — a scope claim against
 * *steps*, not against parts — and that manifest gives the box three separate tone tracks, so two
 * parts on it can genuinely carry two settings. Not hoistable, on the manifest's own terms.
 *
 * This is not a fifth shared vocabulary (invariant 3). Nothing in a template names it and
 * nothing joins on it; it travels device → renderer exactly as `unit` and `note` do.
 */
export const PARAM_SCOPES = ['pattern', 'song'] as const

export type ParamScope = (typeof PARAM_SCOPES)[number]

export const ParamScopeSchema = z.enum(PARAM_SCOPES)

// ---------------------------------------------------------------------------
// Authored — what a device folder contains, and the only shape an author writes.
// ---------------------------------------------------------------------------

export type AuthoredNumericParam = {
  kind: 'numeric'
  name: string
  value: number
  range: NumericRange
  step?: number
  unit?: string
  /**
   * §3.1/#324. **The MIDI CC this control answers to**, where a reader can set it exactly over
   * MIDI. The *number* is authored; the instruction a reader follows is composed by the resolver,
   * after mood, so it can never name a value the guide is not printing beside it.
   *
   * That composition is the whole reason this is a field rather than prose. The Muse's helper
   * interpolated the **authored** value into a note — `Send MIDI CC 87 = 54` — which mood then
   * moved to `36`, leaving a guide that printed `54 → 36` on the line and told the reader to send
   * `54` underneath it. A typed number cannot go stale, because nothing has written the sentence
   * down yet.
   *
   * Not a fifth shared vocabulary (invariant 3): nothing in a template names a CC and nothing
   * joins on one. It travels device → resolver → renderer exactly as `unit` and `note` do.
   */
  midiCc?: number
  mood?: MoodOffset[]
  /** The *point value*. Omitted → inherit the recipe's `verified`. */
  verified?: Verified
  hint?: string
  note?: string
  /** Omitted → per-part, the ordinary case. */
  scope?: ParamScope
}

export type AuthoredEnumParam = {
  kind: 'enum'
  name: string
  value: string
  /** The legality gate. Cited independently of the point, exactly as `range` is. */
  options: EnumOptions
  /** The *selected option*. Omitted → inherit the recipe's `verified`. */
  verified?: Verified
  hint?: string
  note?: string
  scope?: ParamScope
}

export type AuthoredTextParam = {
  kind: 'text'
  name: string
  value: string
  verified?: Verified
  hint?: string
  note?: string
  scope?: ParamScope
}

export type AuthoredParam = AuthoredNumericParam | AuthoredEnumParam | AuthoredTextParam

const paramCommon = {
  name: z.string().min(1),
  verified: VerifiedSchema.optional(),
  hint: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  scope: ParamScopeSchema.optional(),
}

/** `0-127`, the whole of the MIDI CC space. A number outside it addresses nothing (§3.1/#324). */
export const MidiCcSchema = z
  .int()
  .min(0, 'MIDI CC numbers start at 0')
  .max(127, 'MIDI CC numbers stop at 127')

/**
 * A point outside its own declared range is an authoring typo, not a provenance question:
 * it fails the build (§3.1).
 */
export const AuthoredNumericParamSchema = z
  .strictObject({
    kind: z.literal('numeric'),
    value: z.number().finite(),
    range: NumericRangeSchema,
    step: z.number().finite().positive().optional(),
    unit: z.string().min(1).optional(),
    midiCc: MidiCcSchema.optional(),
    mood: z.array(MoodOffsetSchema).min(1).optional(),
    ...paramCommon,
  })
  .refine((p) => p.value >= p.range.min && p.value <= p.range.max, {
    message: 'value must sit inside its own declared range',
    path: ['value'],
  })

export const AuthoredEnumParamSchema = z
  .strictObject({
    kind: z.literal('enum'),
    value: z.string().min(1),
    options: EnumOptionsSchema,
    ...paramCommon,
  })
  .refine((p) => p.options.values.includes(p.value), {
    message: 'value must be one of options.values',
    path: ['value'],
  })

export const AuthoredTextParamSchema = z.strictObject({
  kind: z.literal('text'),
  value: z.string().min(1),
  ...paramCommon,
})

export const AuthoredParamSchema = z.discriminatedUnion('kind', [
  AuthoredNumericParamSchema,
  AuthoredEnumParamSchema,
  AuthoredTextParamSchema,
])

// ---------------------------------------------------------------------------
// Resolved — what §7 step 9 emits and §8 renders. Nothing in a device folder can
// construct one of these, and nothing downstream of the resolver sees an AuthoredParam.
// ---------------------------------------------------------------------------

/**
 * §3.2. Three-state, and always rendered. `provisional` dominates `derived`.
 *
 * A cited state carries the whole `Cite`, not a bare source string, so the resolver cannot stamp
 * a source without saying how it was checked — the same compiler-enforced discipline as
 * `provenance` itself being non-optional. §8 renders a manual citation and an observation
 * differently, and cannot do that from a string.
 */
export type Provenance =
  | { state: 'authored'; cite: Cite }
  | {
      state: 'derived'
      cite: Cite
      rangeCite: Cite
      /** 52 → 45, and which knobs did it. */
      from: number
      axes: MoodAxis[]
    }
  | { state: 'provisional'; from?: number; axes?: MoodAxis[] }

export const ProvenanceSchema = z.discriminatedUnion('state', [
  z.strictObject({ state: z.literal('authored'), cite: CiteSchema }),
  z.strictObject({
    state: z.literal('derived'),
    cite: CiteSchema,
    rangeCite: CiteSchema,
    from: z.number().finite(),
    axes: z.array(MoodAxisSchema).min(1),
  }),
  z.strictObject({
    state: z.literal('provisional'),
    from: z.number().finite().optional(),
    axes: z.array(MoodAxisSchema).optional(),
  }),
])

/**
 * §8/#29. The bounds, carried through to the renderer with the range's own claim already
 * resolved against the recipe's (§3.1) — `verified` here is never `undefined`, because
 * inheritance is settled once, in the resolver, and never re-read downstream.
 *
 * The guide prints the range beside the value (`DECAY 38 (0–100)`) because the range is what
 * disambiguates at the machine: 35% of authored numerics carry no unit and the unit spellings
 * drift between devices, so a bare `38` gives a reader standing at the box nothing to check the
 * screen against, while `0–100` against a display reading milliseconds is an obvious mismatch.
 *
 * `step` is deliberately not carried: it is arithmetic the resolver has already performed, and
 * a reader turning a knob does not need to be told the knob's granularity.
 */
export type ResolvedRange = { min: number; max: number; verified: Verified }

export const ResolvedRangeSchema = z.strictObject({
  min: z.number().finite(),
  max: z.number().finite(),
  verified: VerifiedSchema,
})

/**
 * `provenance` is required, not optional — this is the invariant-4 repair. It is a type error
 * to render a value whose provenance nobody decided.
 *
 * `range` is present exactly when `value` is a number: only numerics have one, and an enum's
 * legality gate is its `options` rather than a range (§3.2). It is optional on the type rather
 * than split into two resolved shapes, because every consumer downstream treats params as one
 * ordered list and a discriminated union would buy exhaustiveness nobody needs at the cost of a
 * narrowing at every rendering site.
 */
export type ResolvedParam = {
  name: string
  value: number | string
  unit?: string
  /** Numerics only, with the range's inherited citation already resolved. */
  range?: ResolvedRange
  provenance: Provenance
  hint?: string
  /**
   * §3.1/#324. The authored CC number, carried so a consumer can ask *is this control reachable
   * over MIDI* without reading the sentence the resolver wrote into `note`. The instruction
   * itself is already in `note`, composed against `value` above rather than against the authored
   * point, so the two can never disagree.
   */
  midiCc?: number
  note?: string
  /** #107. Carried through unchanged: what one setting of this covers is authored, not derived. */
  scope?: ParamScope
}

export const ResolvedParamSchema = z.strictObject({
  name: z.string().min(1),
  value: z.union([z.number().finite(), z.string()]),
  unit: z.string().min(1).optional(),
  range: ResolvedRangeSchema.optional(),
  provenance: ProvenanceSchema,
  hint: z.string().min(1).optional(),
  midiCc: MidiCcSchema.optional(),
  note: z.string().min(1).optional(),
  scope: ParamScopeSchema.optional(),
})

// ---------------------------------------------------------------------------
// §3.2 — which citation a whole recipe shares
// ---------------------------------------------------------------------------

/** Two citations are the same claim only if the kind matches as well as the source. */
export function sameCite(a: Cite, b: Cite | undefined): boolean {
  return b !== undefined && a.kind === b.kind && a.source === b.source
}

/**
 * The range citation a set of parameters repeats, if there is exactly one.
 *
 * A recipe whose parameters all come off one manual page prints that page under every line —
 * five consecutive params, five identical citations. A renderer that knows this can state it
 * once and annotate the exceptions, which is the same principle the provenance mark and the
 * note convention already follow.
 *
 * It lives here, beside `Cite` and `ResolvedParam`, rather than in a renderer: it is a fact
 * about a set of parameters, it returns a `Cite` rather than a formatted string, and §8's two
 * renderers are **siblings**. A shared decision housed inside one of them would make the other
 * a dependent of it, and the next shared decision would land in whichever file happened to
 * need it first.
 *
 * Four rules, and each of them exists to keep a hoisted line *true*:
 *
 *  - Only **range** citations are considered. A value citation is a claim about one number and
 *    does not generalise to the parameter beside it.
 *  - Only a **verified** range has a citation at all; an unverified one is the legality gate's
 *    separate claim (§3.2) and is never a candidate.
 *  - The citation must actually **repeat**. One occurrence is not a pattern.
 *  - A **tie** yields nothing. Two citations appearing twice each have no dominant one, and
 *    picking either would silently demote the other from a fact to an exception.
 *
 * No ordering is involved, deliberately: the answer is a unique maximum or nothing at all, so
 * there is no tie to break and therefore no comparator to get wrong across platforms (§7.2).
 */
export function dominantRangeCite(params: readonly ResolvedParam[]): Cite | undefined {
  const counts = new Map<string, { cite: Cite; n: number }>()
  for (const param of params) {
    const { range } = param
    if (range === undefined || range.verified === false) continue
    const cite = range.verified
    const key = `${cite.kind}\u0000${cite.source}`
    const seen = counts.get(key)
    if (seen === undefined) counts.set(key, { cite, n: 1 })
    else seen.n += 1
  }

  let best: Cite | undefined
  let bestCount = 0
  let tied = false
  for (const { cite, n } of counts.values()) {
    if (n > bestCount) {
      best = cite
      bestCount = n
      tied = false
    } else if (n === bestCount) {
      tied = true
    }
  }

  // One occurrence is not a repetition, and a tie has no dominant citation.
  return bestCount < 2 || tied ? undefined : best
}

// ---------------------------------------------------------------------------
// §8/#107 — the settings that belong to the device, not to a part
// ---------------------------------------------------------------------------

/** Code unit order (§7.2). No `localeCompare` — ICU collation is not the same on two machines. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function sameCiteOrFalse(a: Verified, b: Verified): boolean {
  if (a === false || b === false) return a === b
  return a.kind === b.kind && a.source === b.source
}

function sameProvenance(a: Provenance, b: Provenance): boolean {
  if (a.state !== b.state) return false
  if (a.state === 'authored' && b.state === 'authored') return sameCiteOrFalse(a.cite, b.cite)
  if (a.state === 'derived' && b.state === 'derived') {
    return (
      sameCiteOrFalse(a.cite, b.cite) &&
      sameCiteOrFalse(a.rangeCite, b.rangeCite) &&
      a.from === b.from &&
      a.axes.length === b.axes.length &&
      a.axes.every((axis, i) => axis === b.axes[i])
    )
  }
  if (a.state === 'provisional' && b.state === 'provisional') {
    const ax = a.axes ?? []
    const bx = b.axes ?? []
    return a.from === b.from && ax.length === bx.length && ax.every((axis, i) => axis === bx[i])
  }
  return false
}

/**
 * **Everything the guide prints about a parameter, compared field by field.**
 *
 * Written out rather than `JSON.stringify`d for the reason `test/golden/generate.ts` gives about
 * its own serialiser: an implicit comparison passes for the wrong reason the moment a field is
 * added, and here that failure mode is a *hoist* — two lines the reader is told are one setting
 * while they differ in something nobody remembered to compare. A missed field is a caught type
 * error only if the fields are named, so they are named.
 */
function sameRenderedParam(a: ResolvedParam, b: ResolvedParam): boolean {
  if (a.name !== b.name || a.value !== b.value) return false
  if (a.unit !== b.unit || a.hint !== b.hint || a.note !== b.note || a.scope !== b.scope) {
    return false
  }
  // #324. Named like every other field here, for the reason the doc comment above gives: two
  // controls on different CCs are two settings however alike their lines read.
  if (a.midiCc !== b.midiCc) return false
  if ((a.range === undefined) !== (b.range === undefined)) return false
  if (a.range !== undefined && b.range !== undefined) {
    if (a.range.min !== b.range.min || a.range.max !== b.range.max) return false
    if (!sameCiteOrFalse(a.range.verified, b.range.verified)) return false
  }
  return sameProvenance(a.provenance, b.provenance)
}

/** One scope's worth of hoisted parameters, in UTF-16 code unit order by name (§7.2). */
export type ScopedParams = { scope: ParamScope; params: ResolvedParam[] }

export type HoistedParams = {
  /** In `PARAM_SCOPES` order. A scope with nothing to say has no entry. */
  groups: ScopedParams[]
  /**
   * The names the per-part lists must now drop. A name absent from this set stays where it is
   * even if it declares a scope — see the disagreement rule below.
   */
  names: ReadonlySet<string>
}

/**
 * #107. The parameters one device sets once, lifted out of the parts that repeat them.
 *
 * Takes the parameter lists of every part **one device** carries, and answers which of them are
 * device-level facts. Both renderers read this, so "these nine lines are one setting" is decided
 * once and the sentence introducing them is written twice (§8) — the same division `fx.ts` and
 * `arrangement.ts` follow.
 *
 * **A scope declaration is not on its own enough to hoist.** Every occurrence has to render
 * identically first. Two recipes may author the same pattern-global parameter at different
 * values, or inherit different recipe-level citations for it, and a hoist there would print one
 * of them under a heading claiming it covers the other — inventing an agreement the data does
 * not contain, which invariant 5 forbids more clearly than it forbids a repetition. When they
 * disagree the parameter is simply left in every part, exactly as before, and the reader sees
 * the two values and can tell that something is wrong. That is a worse-looking guide and a
 * truer one. `test/params.test.ts` holds the case.
 *
 * Sorted by name in code unit order rather than authored order, because there is no single
 * authored order to preserve: the same parameter arrives from several recipes, and "whichever
 * part resolved first" would reorder a device-level block when an unrelated request changed.
 */
export function hoistedParams(
  parts: readonly (readonly ResolvedParam[])[],
): HoistedParams {
  // Every occurrence of every scoped name, in encounter order — which only decides *which*
  // occurrence is compared against, and they must all be equal for it to matter at all.
  const seen = new Map<string, ResolvedParam[]>()
  for (const params of parts) {
    for (const param of params) {
      if (param.scope === undefined) continue
      const found = seen.get(param.name)
      if (found === undefined) seen.set(param.name, [param])
      else found.push(param)
    }
  }

  const names = new Set<string>()
  const agreed: ResolvedParam[] = []
  for (const [name, occurrences] of seen) {
    const first = occurrences[0] as ResolvedParam
    if (!occurrences.every((p) => sameRenderedParam(first, p))) continue
    names.add(name)
    agreed.push(first)
  }

  const groups: ScopedParams[] = []
  for (const scope of PARAM_SCOPES) {
    const params = agreed.filter((p) => p.scope === scope).sort((a, b) => byCodeUnit(a.name, b.name))
    if (params.length > 0) groups.push({ scope, params })
  }
  return { groups, names }
}

/**
 * A param's own citation, or the recipe's if it has none (§3.1). Lives here rather than in the
 * audit that first needed it, because the guide, the catalogue and the audit all have to agree
 * about which citation is in force, and three readings of one rule is three rules.
 */
export function effectiveVerified(
  own: Verified | undefined,
  inherited: Verified | undefined,
): Verified | undefined {
  return own ?? inherited
}

/**
 * The document a citation names, without the locator that points inside it:
 * `"X Manual, p.30"` -> `"X Manual"`, `"X firmware release_1_2_1, menus/envelope/attack.md"` ->
 * `"X firmware release_1_2_1"`.
 *
 * **Two locator shapes, because the library cites two kinds of source.** A paginated manual is
 * located by page, `", p.30"`. A tagged documentation corpus is located by repository path,
 * `", menus/envelope/attack.md"` — and the tag that makes such a citation checkable is part of the
 * *corpus* name, not of the path. Both answer "where inside the document", and neither is a
 * different document, so both are stripped.
 *
 * **The path shape was missed and it showed (#173).** Only this function groups; the guide's
 * summary sentence and the catalogue's are built from what it returns. So five files under one
 * tagged corpus read as five documents, and the Deluge's summary became "Values below cite
 * <guidebook>, <corpus>, menus/envelope/attack.md, <corpus>, menus/envelope/decay.md, …" — a
 * comma-separated list whose items contain commas, repeating the corpus name five times, and
 * reordering itself whenever a citation count shifted. §8 is a page read at the machine; that is
 * not a page anyone can skim.
 *
 * **Grouping here costs no provenance.** A parameter's own `↳ cite:` line renders `Cite.source`
 * whole and is untouched, so the exact file is still printed beside the value that rests on it.
 * This function answers a strictly coarser question — which documents am I going to need open —
 * and that question has one right answer per corpus.
 *
 * The path pattern is deliberately narrow: a trailing `", "` then one comma-free, space-free path
 * ending in `.md`. A document *title* ending in ".md" would contain spaces and is left alone, and
 * the page rule runs afterwards so a citation spanning both kinds of source still groups under the
 * paginated one it names first.
 */
export function citedDocument(source: string): string {
  const withoutPath = source.replace(/, [^\s,]+\.md$/, '')
  const at = withoutPath.lastIndexOf(', p.')
  return at === -1 ? withoutPath : withoutPath.slice(0, at)
}
