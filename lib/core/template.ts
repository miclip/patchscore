import { z } from 'zod'
import type { HookId, PatternId, RequestId, SectionName, TemplateId } from './ids'
import {
  CharacterSchema,
  DENSITY_DETENTS,
  MOOD_AXES,
  MoodStateSchema,
  PatternSlotSchema,
  RoleSchema,
  type Character,
  type MoodState,
  type PatternSlot,
  type Role,
} from './vocabulary'

/**
 * §4. Genre definitions. Device-agnostic: templates emit role requests, structure, patterns
 * and harmony, and nothing else. A template never references a device id (invariant 3).
 */

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export type Section = { name: SectionName; bars: number; energy: number }

export const SectionSchema = z.strictObject({
  name: z.string().min(1),
  bars: z.int().min(1),
  energy: z.number().min(0).max(1),
})

// ---------------------------------------------------------------------------
// §4 Role requests
// ---------------------------------------------------------------------------

/**
 * §4.2. Continuous requests occupy every section; transient requests occupy only their listed
 * ones. `riser`, `impact` and `sweep` are the transitional roles this exists for.
 */
export const SUSTAINS = ['continuous', 'transient'] as const
export type Sustain = (typeof SUSTAINS)[number]
export const SustainSchema = z.enum(SUSTAINS)

/**
 * Every request carries a stable `id`. Occupancy (§4.2) and the rendered guide both key on it,
 * because a template may legitimately request the same role twice - so `role` is not identity.
 */
export type RoleRequest = {
  id: RequestId
  role: Role
  /** §4.4. Ascending: 1 is most important. */
  priority: number
  character: Character
  sustain: Sustain
  /** Required for `transient`, forbidden for `continuous` (§4.2). */
  sections?: SectionName[]
  /** §4.4. Removed from the miss objective entirely: filled if it fits, dropped if not. */
  optional?: boolean
  /**
   * §4.4/#81. **The direction saying it is still itself without this part.** Absent means the
   * song needs it; present means the song is finished without it, and the reason says why in
   * the words a producer would use.
   *
   * Reporting only. It changes what the guide *says* about an absence (§7.3's `not-needed`
   * shortfall) and never what the resolver *does* — no `Score` key, no candidate filtering.
   * That is the whole point of keeping it apart from `optional`: `optional` tells the search
   * not to spend a voice on this, and this tells the reader not to go looking for a box. A
   * direction may want both ("if there is room, take it") or only this one ("try hard, but a
   * rig without it is not short of anything").
   *
   * The reason is required because a bare flag is an author shrugging in a field that reads
   * like a musical judgement — the same discipline §2.6 applies to a capability fact.
   */
  inessential?: { reason: string }
  /**
   * §12.4. A *minimum note count*, matched against the assignable's `polyphony`. A number, not
   * a device name, so it does not breach invariant 3.
   */
  polyphony?: number
  /**
   * §12.6. Requests sharing a role and carrying `distinct: true` may not be assigned to the
   * same `deviceId`. Surplus requests become ordinary gaps rather than silently collapsing.
   */
  distinct?: boolean
  /**
   * §4.3/§8. **This part's variants say *where the hook's note is struck again*, not a rhythm of
   * their own.** Absent — the usual case — means the two would be competing instructions, and
   * #100's rule stands: where a hook resolved it is the pattern, and phase 5 points at it.
   *
   * The flag exists because #100 was right about the contradiction and wrong about the cost. A
   * hook and a variant on one part *are* two instructions and the guide must not print both as
   * grids; but on a part whose hook is a held note, the variant was never a competing rhythm —
   * it is the map of where the note is lifted and re-struck, which is the only rhythmic decision
   * such a part contains. Silencing it left the density knob changing nothing a listener could
   * hear on those parts, and left the reader a band number in the arrangement phase with nothing
   * behind it.
   *
   * **Authored, never derived, and that is the whole design.** The obvious derivation — compare
   * the hook's note lengths to the variant's strike gaps — was tried and abandoned: it flips
   * *within one role of one direction* between two hooks the seed chooses freely (Ambient Dub's
   * `bass-mid`, where hook 1 reads as a map and hook 2 as a grid), so which semantics the guide
   * used would have depended on a reroll. It also called Major-Key Electro's `arp` a held note
   * being re-struck, when that template says in as many words that its arp hook is "one note per
   * step, so it lines up with the arp's own variants hit for hit". Whether a part is a held note
   * being re-articulated is a musical fact about the direction, so the direction states it.
   *
   * On the *request* rather than on each `Pattern`, for two reasons. All four bands of a role
   * answer the question identically — a role whose band 0 was a map and whose band 3 was a grid
   * would be incoherent, and per-variant authoring invites exactly that — and this sits beside
   * `character` and `sustain`, where the part's musical intent already lives. Where a direction
   * requests one role twice, each request answers for itself.
   *
   * Meaningless without both a hook and variants for the role, so `TemplateSchema` requires
   * both: a flag that changes nothing is an author writing something that does nothing, which
   * is the same discipline `sustain`/`sections` and `optional`/`inessential` are held to.
   */
  reArticulatesHook?: true
}

export const RoleRequestSchema = z
  .strictObject({
    id: z.string().min(1),
    role: RoleSchema,
    priority: z.int().min(1),
    character: CharacterSchema,
    sustain: SustainSchema,
    sections: z.array(z.string().min(1)).min(1).optional(),
    optional: z.boolean().optional(),
    inessential: z
      .strictObject({
        reason: z
          .string()
          .min(1, 'a request the direction can do without needs a reason saying why (§4.4)'),
      })
      .optional(),
    polyphony: z.int().min(1).optional(),
    distinct: z.boolean().optional(),
    // `true` only. `false` would be a second way to write the default, and two spellings of
    // "no" is how a field comes to mean three things.
    reArticulatesHook: z.literal(true).optional(),
  })
  .superRefine((r, ctx) => {
    if (r.sustain === 'transient' && r.sections === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'a transient request must list the sections it occupies (§4.2)',
        path: ['sections'],
      })
    }
    // The other half of the same rule. A continuous request occupies every section by
    // definition, so `sections` on one is silently ignored — an author would be writing
    // something that does nothing, and the resolver would have to guess which reading wins.
    if (r.sustain === 'continuous' && r.sections !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'a continuous request occupies every section and must not list any (§4.2)',
        path: ['sections'],
      })
    }
    // §4.4/#81. `optional` already says the song survives without this part — that is what
    // "dropped without complaint" means — so an `optional` request with no `inessential` is a
    // template asserting both halves of a contradiction, and the guide would report its absence
    // as a hole in a rig on the template's own authority that it is not one. One direction of
    // implication only: a request may be inessential and still worth the search's effort.
    if (r.optional === true && r.inessential === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'an optional request is one the direction can do without: say so, with a reason (§4.4)',
        path: ['inessential'],
      })
    }
  })

// ---------------------------------------------------------------------------
// §4.3 Step patterns
// ---------------------------------------------------------------------------

/**
 * §4.3/§6.3. Four bands, fixed. The section's `energy` picks one and density leans it by one;
 * neither mutates hits.
 */
export const DENSITY_BANDS = [0, 1, 2, 3] as const
export type DensityBand = (typeof DENSITY_BANDS)[number]
export const DensityBandSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

/**
 * §4.3's grid: patterns are 16, 32 or 64 steps over 1, 2 or 4 bars, so a step is a sixteenth.
 *
 * Here rather than in a renderer because it is a fact about the *pattern grid*, and #105 gave it
 * a second reader outside rendering: how many bars a part's pattern is, and therefore how a
 * section that is not a whole number of them gets built.
 */
export const STEPS_PER_BAR = 16

export const PATTERN_LENGTHS = [16, 32, 64] as const
export type PatternLength = (typeof PATTERN_LENGTHS)[number]
export const PatternLengthSchema = z.union([z.literal(16), z.literal(32), z.literal(64)])

/** Steps are 1-based, so a 16-step pattern has hits in 1..16. */
export type PatternHit = { step: number; slot: PatternSlot; velocity?: number }

export const PatternHitSchema = z.strictObject({
  step: z.int().min(1),
  slot: PatternSlotSchema,
  /** MIDI velocity. 0 is a rest, not a hit, so a hit that carries one starts at 1. */
  velocity: z.int().min(1).max(127).optional(),
})

/**
 * §4.3/§12.5. Flat: one variant per request per section, no bar offset and no within-section
 * variant sequence. Fills are out of v1.
 */
export type Pattern = {
  id: PatternId
  /** Matched against the request's role. */
  forRole: Role
  band: DensityBand
  /** Omitted means eligible in every section. */
  sections?: SectionName[]
  length: PatternLength
  hits: PatternHit[]
}

export const PatternSchema = z
  .strictObject({
    id: z.string().min(1),
    forRole: RoleSchema,
    band: DensityBandSchema,
    sections: z.array(z.string().min(1)).min(1).optional(),
    length: PatternLengthSchema,
    hits: z.array(PatternHitSchema),
  })
  .superRefine((p, ctx) => {
    p.hits.forEach((hit, i) => {
      if (hit.step > p.length) {
        ctx.addIssue({
          code: 'custom',
          message: `step ${hit.step} is outside a ${p.length}-step pattern`,
          path: ['hits', i, 'step'],
        })
      }
    })
  })

// ---------------------------------------------------------------------------
// §4.1 Harmony and hooks
// ---------------------------------------------------------------------------

/**
 * A roman-numeral degree ('i', 'VI', 'VII'), resolved against the chosen key at §11 step 5.5.
 * Left open: DESIGN.md gives examples but never fixes the vocabulary, and a closed union
 * guessed here would reject legal authoring (sevenths, inversions, sharp-side borrowings).
 * Template-internal either way - it never crosses to a device (invariant 3).
 */
export type ChordDegree = string
export const ChordDegreeSchema = z.string().min(1)

export type ProgressionStep = { degree: ChordDegree; bars: number }

export const ProgressionStepSchema = z.strictObject({
  degree: ChordDegreeSchema,
  bars: z.int().min(1),
})

export type Harmony = { cycleBars: number; progression: ProgressionStep[] }

export const HarmonySchema = z.strictObject({
  cycleBars: z.int().min(1),
  progression: z.array(ProgressionStepSchema),
})

/**
 * A scale degree within the key, plus an octave offset. Steps are 1-based, and so is `degree`:
 * 1 is the tonic and 5 is the fifth. The upper bound is left open because a hook may reach an
 * extension (a ninth is degree 9) rather than being confined to one octave of the scale.
 *
 * ## `len` is **how long the note sounds**, in sixteenth steps, counted from its own `step`
 *
 * Written down here because it was not, and #142 found three separate defects that had
 * accumulated on the one field the guide prints most prominently: `step`, `degree` and `octave`
 * each had a sentence and `len` had `z.int().min(1)`.
 *
 * It is **sustain**, and the two things it is not are the ones that would each imply a different
 * rendering:
 *
 *  - **Not distance-to-the-next-note.** A note may stop well before the next one starts — that
 *    is a rest, and it is authored by making `len` short rather than by moving the next step.
 *    Drone Study's three notes happen to abut exactly (1+128 = 129, 129+64 = 193), which is what
 *    a held line looks like and not a rule the field encodes.
 *  - **Not a gate percentage or a device's own length value.** It is musical time, true of the
 *    hook whatever plays it (§4.1), and it names no device — invariant 3 holds. **How a box
 *    takes it is `Device.noteDuration`'s job** (§2.6/#142): a tracker has no length field and
 *    gets note-offs, a drum voice has no length at all and gets neither, and a box with a `LEN`
 *    field gets told which field. A template states the music; the device states the gesture.
 *
 * Overlap is legal and meaningful: two notes at one step are a chord, and a note whose `len`
 * runs past the next note's `step` is a line that overlaps itself. Whether the carrying voice can
 * *play* that is §7.1's question and not this field's — §4.1 keeps range and polyphony policy out
 * of this layer, exactly as it keeps MIDI clamping out of `ResolvedNote.midi`.
 */
export type HookNote = { step: number; degree: number; octave: number; len: number }

export const HookNoteSchema = z.strictObject({
  step: z.int().min(1),
  degree: z.int().min(1),
  octave: z.int(),
  /** Sixteenth steps of sustain, from this note's own `step`. See above — it is not a gap. */
  len: z.int().min(1),
})

/**
 * §4.1. Authored, never generated. If no hook is authored for the assigned role, the guide
 * omits the hook section rather than inventing one (invariant 5 applied to melody).
 *
 * `baseOctave` is the origin `HookNote.octave` is an offset *from*, in scientific pitch
 * notation with middle C at C4 (§4.1). It is required, because an offset with no origin is not
 * a note: `degree 5, octave 0` is something to work out, `C3` is something to play, and only
 * the second belongs in a guide read standing at the machine (§8).
 *
 * It lives on the hook rather than being one global constant because a bass hook and a lead
 * hook in the same genre sit two or three octaves apart, and one constant would be wrong for
 * one of them. The person authoring the hook is the one who knows which it is. It is a purely
 * musical fact, so it names no device and does not touch invariant 3.
 */
export type Hook = {
  id: HookId
  forRole: Role
  bars: number
  /** Scientific pitch notation, middle C = C4. See §4.1. */
  baseOctave: number
  notes: HookNote[]
}

export const HookSchema = z.strictObject({
  id: z.string().min(1),
  forRole: RoleSchema,
  bars: z.int().min(1),
  // A whole number and nothing more. Scientific pitch notation is not bounded by MIDI, and
  // §4.1 puts range policy outside this layer entirely - so the origin is unbounded for the
  // same reason `HookNote.octave` is, and resolution never clamps or transposes either one.
  baseOctave: z.int(),
  notes: z.array(HookNoteSchema),
})

// ---------------------------------------------------------------------------
// The template
// ---------------------------------------------------------------------------

export type BpmSpec = { min: number; max: number; default: number }

export const BpmSpecSchema = z
  .strictObject({
    min: z.number().finite().positive(),
    max: z.number().finite().positive(),
    default: z.number().finite().positive(),
  })
  .refine((b) => b.min <= b.max, { message: 'bpm.min must not exceed bpm.max', path: ['min'] })
  .refine((b) => b.default >= b.min && b.default <= b.max, {
    message: 'bpm.default must sit inside [min, max]',
    path: ['default'],
  })

/** e.g. 'F minor', 'A# major'. Parsed into a tonic and a mode at §11 step 5.5. */
export const MusicalKeySchema = z.string().min(1)

export type Template = {
  id: TemplateId
  name: string
  bpm: BpmSpec
  keys: string[]
  /**
   * #310. **The mood this direction opens at**, seeding the studio the way `bpm` already seeds
   * the tempo: the direction proposes and the reader disposes. Absent means every knob centred,
   * which is what every direction did before this field existed.
   *
   * `Partial`, so a direction states only the axes it has an opinion about. An axis it does not
   * name is centred (`moodState`), not inherited from anywhere — there is no second layer here.
   *
   * **Not a device fact and not a per-request one.** Swing is a property of the piece; a
   * direction that wanted one part late and another straight would be asking for §4.3's grid,
   * which is where that already lives. And invariant 3 still holds both ways: this names an axis
   * from the shared vocabulary, never a device and never a parameter.
   *
   * **The reader's own mood, when they have one, replaces this whole state rather than merging
   * with it** — see `ScoreInputsV1.mood`. A merge would need a per-axis record of who set what,
   * which is a second provenance flag for a knob the reader can always see the position of.
   */
  mood?: Partial<MoodState> | undefined
  structure: Section[]
  harmony: Harmony
  hooks: Hook[]
  roles: RoleRequest[]
  patterns: Pattern[]
}

export const TemplateSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    bpm: BpmSpecSchema,
    /**
     * #310. Every axis optional, and the object as a whole optional — but not *empty*. `{}` and
     * absent are the same state (every knob centred), and one state with two spellings is how
     * two authors come to disagree about which one means "no opinion". Strict, like every schema
     * here: a misspelled axis is a direction that silently opens neutral on the axis it meant.
     */
    mood: MoodStateSchema.partial()
      .refine((m) => MOOD_AXES.some((axis) => m[axis] !== undefined), {
        message: 'mood must state at least one axis, or be absent (#310)',
      })
      /**
       * §6.3/#317. **Density may only be a detent**, unlike the four continuous axes.
       *
       * `densityShift` reads density as three zones and `DENSITY_DETENTS` is, in its own words,
       * "the three values the UI is allowed to produce". The control renders whichever zone a
       * value falls in and writes that zone's centre back — so a direction opening at `density:
       * 60` shows the middle zone and, the moment the reader touches it, becomes 50 with no way
       * back to 60. A value the control can display and never return to is a trap rather than a
       * default, and the difference is invisible until somebody turns the knob.
       *
       * The other four axes are genuinely continuous and take any value in range.
       */
      .refine((m) => m.density === undefined || DENSITY_DETENTS.includes(m.density as 12), {
        message: `density must be one of ${DENSITY_DETENTS.join(', ')} — the values the control can produce (§6.3, #317)`,
      })
      .optional(),
    // Both are load-bearing rather than decorative: Occupancy keys on section names (§4.2)
    // and harmony resolution needs a key to resolve degrees against (§4.1). A template with
    // neither parses but cannot produce a guide, and validation exists to fail the build.
    keys: z.array(MusicalKeySchema).min(1),
    structure: z.array(SectionSchema).min(1),
    harmony: HarmonySchema,
    hooks: z.array(HookSchema),
    roles: z.array(RoleRequestSchema),
    patterns: z.array(PatternSchema),
  })
  .superRefine((t, ctx) => {
    const sectionNames = t.structure.map((s) => s.name)
    if (new Set(sectionNames).size !== sectionNames.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'section names must be unique - Occupancy keys on them (§4.2)',
        path: ['structure'],
      })
    }
    const known = new Set(sectionNames)

    const requestIds = t.roles.map((r) => r.id)
    if (new Set(requestIds).size !== requestIds.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'request ids must be unique - Occupancy stores them (§4.2)',
        path: ['roles'],
      })
    }

    const hookIds = t.hooks.map((h) => h.id)
    if (new Set(hookIds).size !== hookIds.length) {
      ctx.addIssue({ code: 'custom', message: 'hook ids must be unique', path: ['hooks'] })
    }

    const patternIds = t.patterns.map((p) => p.id)
    if (new Set(patternIds).size !== patternIds.length) {
      ctx.addIssue({ code: 'custom', message: 'pattern ids must be unique', path: ['patterns'] })
    }


    t.roles.forEach((request, i) => {
      request.sections?.forEach((section, j) => {
        if (!known.has(section)) {
          ctx.addIssue({
            code: 'custom',
            message: `request names section '${section}', which is not in structure`,
            path: ['roles', i, 'sections', j],
          })
        }
      })
    })

    t.patterns.forEach((pattern, i) => {
      pattern.sections?.forEach((section, j) => {
        if (!known.has(section)) {
          ctx.addIssue({
            code: 'custom',
            message: `pattern names section '${section}', which is not in structure`,
            path: ['patterns', i, 'sections', j],
          })
        }
      })
    })
    // §4.3/§8. `reArticulatesHook` says where the hook's held note is struck again, so it needs
    // both halves to be true of anything: a hook for the role to hold the note, and variants for
    // the role to place the strikes. Missing either, the flag changes nothing the guide prints,
    // and a field that silently does nothing is worse than an absent one — the author believes
    // the part re-articulates and no page says so.
    const hookedRoles = new Set(t.hooks.map((h) => h.forRole))
    const patternedRoles = new Set(t.patterns.map((p) => p.forRole))
    t.roles.forEach((request, i) => {
      if (request.reArticulatesHook !== true) return
      if (!hookedRoles.has(request.role)) {
        ctx.addIssue({
          code: 'custom',
          message:
            `request '${request.id}' re-articulates a hook, but no hook is authored for ` +
            `'${request.role}' (§4.3)`,
          path: ['roles', i, 'reArticulatesHook'],
        })
      }
      if (!patternedRoles.has(request.role)) {
        ctx.addIssue({
          code: 'custom',
          message:
            `request '${request.id}' re-articulates a hook, but no variant is authored for ` +
            `'${request.role}' to place the strikes (§4.3)`,
          path: ['roles', i, 'reArticulatesHook'],
        })
      }
    })
    // Deliberately not checked: several variants may be eligible for the same
    // (role, band, section). §4.1 says the seed picks among multiple authored hooks, and §6.3
    // never says a band holds exactly one variant, so rejecting that would forbid legal data.
    //
    // Also deliberately not checked: whether the hook's notes are *long enough* to span the
    // variant's strikes. That derivation is what `reArticulatesHook` exists instead of — it is
    // unstable across a seeded hook choice, so enforcing it would reject authoring the direction
    // means and accept authoring it does not.
  })
