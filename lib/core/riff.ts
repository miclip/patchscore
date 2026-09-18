import { z } from 'zod'
import type { Assignable, Device, FactoryPatch, Recipe, TriggerNote } from './device'
import { hasArpeggiator, realisationOf } from './device'
import { comparePoolMembers, quantiseDistance } from './search'
import {
  chordNotesText,
  parseKey,
  pitchClassOf,
  resolveHook,
  spellChord,
  spellDegree,
  type HookResolution,
} from './harmony'
import type { RiffId } from './ids'
import type { ResolvedParam } from './params'
import {
  bindArticulation,
  canCarryNotes,
  canStackNotes,
  devicePoolCapacity,
  expand,
  resolveParams,
  resolvePatch,
  resolveRecipe,
  resolveSoundSetup,
  resolveSourceAudio,
  stackRecipes,
  triggerNoteFor,
  type BoundArticulation,
  type ResolvedPatchEntry,
  type ResolvedSoundSetup,
  type ResolvedSourceAudio,
} from './resolver'
import {
  BpmSpecSchema,
  HarmonySchema,
  STEPS_PER_BAR,
  HookSchema,
  MusicalKeySchema,
  PatternSchema,
  RoleRequestSchema,
  type BpmSpec,
  type Harmony,
  type Hook,
  type Pattern,
  type RoleRequest,
} from './template'
import { bestVoiceCandidate, crowdOf, type VoiceCandidate } from './voicing'
import { NEUTRAL_MOOD, bearsPattern, type Character } from './vocabulary'

/**
 * §5A. **Riffs: one figure, taught at the machine.**
 *
 * The third authored kind, and the third thing this product renders. A `Template` is a song, an
 * `Inspiration` is a patch on somebody else's song, and a `Riff` is neither: it is a single part —
 * its notes, the rhythm they are struck on, and the words for what makes it that part — resolved
 * against whatever rig the reader owns.
 *
 * ---------------------------------------------------------------------------
 * Why it is not a `Template`
 * ---------------------------------------------------------------------------
 *
 * A template is a *song*: sections with bars and an energy, a harmonic cycle, several requests
 * competing for a rig under §7.1's lexicographic objective, four density bands per part, and a
 * mood it opens at. A riff has one part and no song around it. Built as a `Template` every one of
 * those fields would have to be authored as a fiction: a `structure` of one invented section
 * name, a `harmony` whose progression nobody plays, an `energy` number selecting among bands
 * there is only one of, and a search with nothing to allocate. Worse, each fiction would be
 * *rendered* — §8's guide prints an arrangement, a clock topology and a phase order, all of them
 * true of a song and none of them true of a figure.
 *
 * ---------------------------------------------------------------------------
 * Why it is not an `Inspiration`
 * ---------------------------------------------------------------------------
 *
 * An inspiration is meaningless alone. It says *for the kick at band 2, play this instead*, keyed
 * on `(role, band)`, and replacement, refusal and composition (§5.2–§5.5) all exist because there
 * is a direction underneath it to patch. A riff has nothing underneath it.
 *
 * The sharper difference is the hook. `InspirationPatch` carries no hooks and must not: a hook's
 * degrees resolve against a *key*, and §5.1 forbids an inspiration from knowing anything a
 * template owns. **A riff carries its own key**, which is exactly the fact an inspiration is not
 * allowed to hold — so the two are not the same shape wearing different names.
 *
 * ---------------------------------------------------------------------------
 * What it is made of, and nothing else
 * ---------------------------------------------------------------------------
 *
 * Every field below is an existing primitive: `RoleRequest`, `Hook`, `Pattern`, `BpmSpec`, and a
 * key string §4.1 already parses. Nothing new crosses the template/device boundary and no fifth
 * shared vocabulary is added — invariant 3 is untouched. **A riff names no device**, for the
 * reason a template does not: which box plays it is the rig's answer, given here by `resolveRiff`
 * and not by the author.
 *
 * ---------------------------------------------------------------------------
 * The hook and the grid, and why they do not contradict each other
 * ---------------------------------------------------------------------------
 *
 * #100's rule is that a resolved hook *is* the part's pattern, so a part carrying both is two
 * authorities over one rhythm. §4.3 already settled the one case where that is not true —
 * `reArticulatesHook`, where the hook holds a note and the variant says where it is struck again
 * — and that is what a riff on a struck part is. `RiffSchema` therefore **requires** the flag
 * beside the grid rather than offering it: a figure whose hook competed with its own grid is not
 * a riff anybody could play, and this is checkable here where `TemplateSchema` could only check
 * that both halves exist.
 *
 * **A riff on a held part carries no grid at all** (§5A.2, #608). `pad` is held rather than
 * struck (`NON_PATTERN_BEARING_ROLES`), and a guide already prints no step grid for it; a riff on
 * it is the hook alone, played as the hook says, with no `pattern` and no `reArticulatesHook` to
 * join it to one. The role decides which shape an entry has, and the schema refuses the other:
 * a grid on a pad would be a pattern that says nothing, and a struck part without one would be
 * a figure with no rhythm.
 *
 * **A struck part whose figure is through-composed says so, with `reArticulatesHook: false` and
 * no grid** (§5A.2, #623). A repeating grid marks only what recurs on the same step of every
 * pass, and a figure can be long enough, and end differently enough, that nothing does: the
 * four-loop Muse Runner line has a silent chord in its last loop, so no step is an onset on
 * every pass and the honest grid is empty. An empty grid is refused, and the role is still
 * struck, so neither of the two shapes above fits. The third shape is the hook as the whole
 * rhythm. `false` is legal here and nowhere else in the product, because here it is not a second
 * spelling of the default: on a struck role the absent flag is *refused*, so `true` beside a
 * grid and `false` without one are two different authored answers to a question every struck
 * riff has to answer. `RiffRequestSchema` is `RoleRequestSchema` with that one field widened.
 */

// ---------------------------------------------------------------------------
// The riff
// ---------------------------------------------------------------------------

/**
 * §5A.2/#623. **§4's `RoleRequest`, with `reArticulatesHook` allowed to be `false`.**
 *
 * A template's request takes `true` only, and the reason is right (`RoleRequest`): there the
 * absent flag is the default, and `false` would be a second spelling of it. A riff on a struck
 * role has no default. The absent flag is refused, so the field is a question the author has to
 * answer, and it has two answers: `true`, and a grid says where the hook is struck again; or
 * `false`, and no grid, because the figure is through-composed and a repeating grid would have
 * nothing to mark that recurs on every pass. A held role still carries neither answer, since it
 * was never asked.
 *
 * Every other field is `RoleRequest`'s, and every refinement `RoleRequestSchema` makes is kept:
 * the shape is spread with the one field widened, and the base schema is run over the request
 * with the flag removed, so its rules reach a riff's request without being written twice. (Zod
 * refuses `.extend` on a refined object and `.safeExtend` refuses to widen, which is why it is
 * done by hand.)
 */
export type RiffRequest = Omit<RoleRequest, 'reArticulatesHook'> & { reArticulatesHook?: boolean }

export const RiffRequestSchema = z
  .strictObject({ ...RoleRequestSchema.shape, reArticulatesHook: z.boolean().optional() })
  .superRefine((request, ctx) => {
    const { reArticulatesHook: _flag, ...base } = request
    const checked = RoleRequestSchema.safeParse(base)
    if (checked.success) return
    // Re-raised as custom issues carrying the base message and path: the base schema's rules
    // are all `custom` already, and the path is relative to the request either way.
    for (const issue of checked.error.issues) {
      ctx.addIssue({ code: 'custom', message: issue.message, path: [...issue.path] })
    }
  })

/**
 * §5A.5. What a riff is named for. See `Riff.reference`.
 */
export type RiffReference = {
  /** `record`: a recording. `patch`: a factory patch a box ships, by the name on its panel. */
  kind: 'record' | 'patch'
  /** The name as somebody would say it: `'Blue Monday'`, `'Muse Runner'`. */
  name: string
}

export const RiffReferenceSchema = z.strictObject({
  kind: z.enum(['record', 'patch']),
  name: z.string().min(1),
})

/**
 * §5A.5/#585. **A factory patch this figure's sound aligns with**, named by the riff. See
 * `Riff.patchAffinities`.
 *
 * The same `(name, bank)` a recipe's `FactoryPatch` carries and nothing else: no evidence,
 * because the riff does not claim the patch exists — the recipe that names it does, with a
 * unit and a firmware in its `evidence` — and no device, because a riff names none (invariant 3).
 * `reason` is the author's sonic judgement, the one thing nothing in the model could state and
 * the reason the field exists.
 */
export type PatchAffinity = {
  /** As it reads on the box's own screen — `FactoryPatch.name`, matched exactly. */
  name: string
  /**
   * `FactoryPatch.bank`, matched exactly, **and absent means absent**: an affinity with no bank
   * meets a patch with no bank and nothing else. A wildcard here would let one entry reach a
   * patch in a bank the author never looked at.
   */
  bank?: string
  /** Why the sounds align, as somebody would say it. Not rendered; scanned for device names. */
  reason: string
}

export const PatchAffinitySchema = z.strictObject({
  name: z.string().min(1),
  bank: z.string().min(1).optional(),
  reason: z.string().min(1, 'an affinity with no reason is a favourite nobody can weigh'),
})

/**
 * §5A.5/#585. Whether a riff's authored affinities name this patch, by exact `(name, bank)`.
 * `undefined` where the recipe carries no patch, where the riff authors no affinity, or where
 * none matches — and that one `undefined` is what both renderers read, so a riff that reaches a
 * patched recipe by role and character alone prints nothing about the patch.
 */
export function affinePatch(
  riff: Pick<Riff, 'patchAffinities'>,
  patch: FactoryPatch | undefined,
): FactoryPatch | undefined {
  if (patch === undefined) return undefined
  const affine = (riff.patchAffinities ?? []).some(
    (a) => a.name === patch.name && a.bank === patch.bank,
  )
  return affine ? patch : undefined
}

/** `name` alone, or `name` NUL `bank`: the key two affinities may not share. */
function affinityKey(a: PatchAffinity): string {
  return a.bank === undefined ? a.name : `${a.name}\u0000${a.bank}`
}

export type Riff = {
  /** Opens with `reference.name`, slugified — `RiffSchema` enforces it. See `reference`. */
  id: RiffId
  /** 'The Blue Monday bass'. Contains `reference.name` verbatim — `RiffSchema` enforces it. */
  name: string
  /**
   * §5A.5. **What this technique is named for**, as somebody would say it out loud: a recording,
   * or a factory patch a box ships.
   *
   * Every riff has one. It names how a reader looks the technique up. A technique is found by the
   * record it is famous from or the patch it is heard on before anyone has a name for what the
   * part is doing, and a library where some entries carried a reference and some did not would be
   * asking a reader to know which kind they were looking at before they could search for it.
   *
   * **Two kinds and not three.** `record` is a release somebody has heard; `patch` is a preset
   * named on the box's own panel. A third kind for the idiom would be the rule dissolving: every
   * riff has an idiom, and a field that any string satisfies constrains nothing.
   *
   * **A field rather than a convention, because both the slug and the title have to carry it and
   * a convention is a thing two authors can disagree about by Tuesday.** `RiffSchema` requires
   * `name` to contain `reference.name` verbatim and `id` to open with its slug, so an entry named
   * for one reference and filed under another cannot parse.
   *
   * **It is a reference, never a claim about the notes and never a device.** The hook below is
   * this library's own — see `lib/riffs` and §5A.5. A `patch` reference names a preset, not the
   * box that ships it: a riff names no device (invariant 3), and `Recipe.factoryPatch` is the
   * separate fact that a *recipe's* parameters reach a sound a box also ships.
   */
  reference: RiffReference
  /**
   * §5A.5/#585. **The factory patches this figure's sound aligns with**, where somebody knows
   * that it does. Optional, and absent on most entries.
   *
   * A riff reaches a recipe by role and character, and a recipe may name a factory patch that
   * already reaches its sound (`Recipe.factoryPatch`, #553). That pair is the resolver's
   * vocabulary for *which voice plays this*, and it was being read as *this is the same sound*:
   * every `lead / bright` figure on the same box was told to load the same patch, and the
   * Thriller riff is not a wide-vibrato CS-80 lead. The alignment is a fact somebody knows and
   * nothing in the model can state, so it is authored here and inferred nowhere. **Absent, a riff
   * page prints no patch**, however the recipe it lands on is labelled; a guide is untouched,
   * because there the reader asked for a bright lead and a patch reaching one is the shortcut
   * they wanted.
   *
   * **A list, so that one field does not quietly pick a favourite.** A figure may align with
   * patches on several boxes, and each entry is matched on its own.
   *
   * **A narrow and deliberate exception to invariant 3, and this is its whole extent.** A patch
   * belongs to exactly one box, so an entry here implies one without naming it. It carries no
   * device id and no device name — `test/riff.test.ts` scans every `reason` and refuses a `name`
   * that is a device outright — and the resolver never reads it to choose a voice: which box
   * plays the figure is still the rig's answer. What it reads it for is one line on the page,
   * after the voice is chosen.
   */
  patchAffinities?: readonly PatchAffinity[]
  /**
   * **What the technique is, in the words somebody would use teaching it.** One string per
   * paragraph, prose, and the only free text a riff carries.
   *
   * It is the whole reason a riff exists as a rendered thing rather than as a hook in a
   * direction: the notes and the grid say *what to play*, and this says *what makes it that
   * part* — where the accents sit, what the figure is answering, what to listen for when it is
   * right. Neither the resolver nor the schema reads it.
   *
   * **It never names a device** (invariant 3) and it never carries a transcription. Whether an
   * entry is named after a recording or a factory patch, that is the reference and the notes
   * below are this library's own — see `lib/riffs`.
   */
  technique: string[]
  /**
   * The tempo range the figure lives in, and the one it is written at. A `BpmSpec` because a
   * technique works over a span rather than at a point, and because §4's spec already carries
   * the `min <= default <= max` rule this would otherwise restate.
   *
   * Advisory exactly as a direction's is (§5.6): nothing downstream reads it, patterns do not
   * adapt to tempo, and a riff played slower is that riff played slower.
   */
  bpm: BpmSpec
  /**
   * **One key, not a list.** A direction offers keys because a song is transposed whole and the
   * seed picks among them (§4.1); a riff is one figure and there is no seed here to pick with.
   * The hook's degrees resolve against this and nothing else.
   */
  key: string
  /**
   * **The one part.** `continuous`, priority 1, no sections — a riff has no structure for a
   * transient request to name. A `RiffRequest` rather than a `RoleRequest` for one field: see
   * `reArticulatesHook` there.
   */
  request: RiffRequest
  /** The notes. Original, always — never a transcription of the recording or patch an entry references. */
  /**
   * §5A/§4.1. **The chords the figure is played over**, where the figure only makes sense against
   * them. Optional, and absent on every riff that is one part in one key.
   *
   * A riff is a technique rather than an arrangement, so most entries need nothing here: `key` and
   * the notes are the whole of the harmony a reader has to know. It earns its place when the
   * melody **follows** a progression — a line whose thirds and sixths change with the chord under
   * them prints altered degrees (`HookNote.alter`) that say nothing on their own. `raised 3rd`
   * beside `A#4` is a fact; *why* it is raised is the chord, and without the chords a reader is
   * handed an accidental and no reason for it.
   *
   * The same `Harmony` a template carries, deliberately: degrees are roman numerals against the
   * key and name no device (invariant 3), and reusing it means the riff page can print the table
   * a direction already prints rather than inventing a second way to say the same thing.
   */
  harmony?: Harmony
  /**
   * §5A/§4.1/#552. **Which bar of the cycle the figure starts on**, 1-based, where `harmony` is
   * longer than the figure.
   *
   * Without it a page carries a chord table and a shorter grid and says nothing about how they
   * line up, so a reader lines the figure up with bar 1 — which is the wrong chord whenever the
   * figure was written for a later one. That shipped: a four-bar figure written over the `I` and
   * the `IV` of a twelve-bar cycle, printed against a table starting at `i`, put a raised third
   * over a minor chord.
   *
   * **The alignment is a fact about the music, so it is data and it is checked.** `RiffSchema`
   * requires `harmony` alongside it and requires the figure to start where a chord does — a
   * figure beginning halfway through a chord is expressible and is a different thing, and nothing
   * has needed it. It does not require the figure to fit inside one cycle (#623): a figure longer
   * than the cycle is played with the cycle repeating under it, and `chordOccurrenceAt` wraps.
   */
  figureStartsAtBar?: number
  /**
   * §5A/#554. **Rules the figure keeps, checked rather than described.** See `RiffConstraints`.
   * Absent on an entry with nothing mechanical to say, which is most of them.
   */
  constraints?: RiffConstraints
  /**
   * §5A.2/§12.4/#645. **The hook's chords are held for the box's arpeggiator, which sounds them
   * one note at a time — so the part costs one voice, however wide the hold.**
   *
   * This is the difference between how many notes a box *plays* and how many it *sounds* at
   * once, and an arpeggiator is exactly where the two come apart. Four notes held under one are
   * four keys down and one voice sounding, so a two-note synth whose mono recipes declare
   * `patchPolyphony: 1` plays a four-note hold on any of them. Without this field the hook's
   * simultaneous notes mean simultaneous, `resolveRiff` asks for four voices, and the figure is
   * refused on the one box it was written for.
   *
   * **It is a claim about the box, not about the figure, and it may only be made where the box
   * agrees.** A riff names no device (invariant 3), so the join is made at resolution: a
   * candidate has to declare `features.arpeggiator`, cited, or it is not a candidate, and the
   * gap says so (`no-arpeggiator`). Otherwise any figure could exempt itself from polyphony by
   * asserting an arpeggiator, and `patchPolyphony` would be advisory.
   *
   * **Three things follow, and the schema holds each.** The request asks for one voice, so
   * `polyphony` is absent or 1 — the hold's width is the hook's and is stated nowhere twice.
   * There is no grid and no `reArticulatesHook`, on any role: the arpeggiator is the rhythm, and
   * a grid beside it would be the two authorities #100 forbids. And the hook holds more than one
   * note at some step, since a hold of one note has nothing for an arpeggiator to run through.
   *
   * **It is not the `arp` role.** That role is a struck part a sequencer plays, and a riff on it
   * carries a grid like any struck part. This is a hand holding a chord while the box strikes,
   * which can be a `pad` or an `arp` or anything else the recipe answers to.
   */
  arpeggiatedHold?: true
  hook: Hook
  /**
   * Where the hook's notes are struck. See the header: `reArticulatesHook` is what joins them.
   *
   * **Present exactly where the request says the grid re-articulates the hook.** Absent on a
   * held role (`bearsPattern` is false), where the hook is the whole figure, and absent on a
   * struck role whose request says `reArticulatesHook: false`, where the figure is
   * through-composed and the hook is the whole rhythm (§5A.2, #623). Optional in the type
   * because the role and the flag decide together; the schema holds each shape to itself, so a
   * `Riff` that parsed has a grid if and only if `request.reArticulatesHook === true`.
   */
  pattern?: Pattern
}

/**
 * §5A.5. `'Show Me Love'` → `'show-me-love'`. The form a riff's `id` has to open with.
 *
 * ASCII by construction: a reference outside it would produce a slug nobody could type into an
 * address bar, and the schema refusing the entry is the right answer rather than a transliteration
 * this file would have to invent. `toLowerCase` is locale-independent by specification, unlike its
 * `toLocale` sibling, which is the one §7.2 bans.
 */
export function referenceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * §5A/#554. **The rules a figure has to keep, as data rather than as prose.**
 *
 * A riff's `technique` says what makes the part that part, and nothing reads it. That is right for
 * *"the gaps belong to the drums"* and wrong for *"never play the natural third over this chord"*
 * — the second is mechanically checkable, and a rule nobody checks is a rule the next edit breaks.
 * One did: #552 found a figure whose prose forbade a collision while its notes had stopped keeping
 * it, and the checks that caught it were written by hand for that one entry.
 *
 * **Degrees, not pitch classes.** *"Never A over F#"* is right in one key and silent in every
 * other; `{ chord: 'I', degree: 3 }` is the same rule wherever the riff is played, and it is the
 * vocabulary the hook is already written in. `alter` distinguishes the two thirds — forbidding the
 * natural one is the point, and the raised one is what such a figure is usually for.
 *
 * **Checked across a note's whole span, not at its onset.** A note held into the next chord is
 * sounding over it, which is how the same collision arrives a beat late.
 *
 * **Checked against the chords as well as the line** (§5A.8, #605). A rule forbids a pitch, and
 * a chord built from that pitch breaks it as surely as a note does. The entry that motivated this
 * forbade E natural in D phrygian and carried a C major, `C · E · G`, for two of its eight bars.
 * The line never played an E, so every check passed, and the page printed the chord a few inches
 * from the rule.
 *
 * **How far a rule reaches is decided by `alter`.** A forbidden degree with an `alter` names a
 * pitch the key does not have (E in D phrygian, A natural in C minor). That is a fact about the
 * key, so it is forbidden across the whole piece: every chord of the cycle and every note over
 * any of them. `chord` still names the chord the rule is about, for the reason a reader sees, and
 * narrows nothing. An unaltered degree is the key's own note, and the rule is an avoid-note over
 * the chord it names and nowhere else. Blade Runner forbids the natural third over the borrowed
 * `I` while its `i` is built on that third, and that is the whole point of the entry. A global
 * check of an unaltered rule would fail every diatonic progression in the library, so the reach
 * is the distinction.
 */
export type ForbiddenDegree = {
  /**
   * The chord it applies during, as the degree string the progression uses. The one chord the
   * rule reaches where `alter` is absent; the chord the rule is about, and no limit on what is
   * checked, where it is present (#605).
   */
  chord: string
  /** 1-based scale degree, as `HookNote.degree`. */
  degree: number
  /** Which spelling of that degree is forbidden. Absent means the unaltered one. */
  alter?: number
  /** Why, in the words somebody would say it. Rendered — a rule with no reason cannot be weighed. */
  reason: string
}

export type RiffConstraints = {
  forbiddenDegrees?: ForbiddenDegree[]
  /**
   * How long after a chord arrives its first note may enter, in sixteenth steps. A figure that
   * floats free of the harmonic grid is keeping a rule, and this is the rule.
   *
   * Applies to an **entry** — the first note over a chord — and not to a continuation, which is
   * not entering anything.
   */
  onsetOffset?: { minSteps: number; reason: string }
}

export const ForbiddenDegreeSchema = z.strictObject({
  chord: z.string().min(1),
  degree: z.int().min(1),
  alter: z.int().min(-2).max(2).optional(),
  reason: z.string().min(1, 'a rule with no reason is a rule nobody can weigh'),
})

export const RiffConstraintsSchema = z
  .strictObject({
    forbiddenDegrees: z.array(ForbiddenDegreeSchema).min(1).optional(),
    onsetOffset: z
      .strictObject({
        minSteps: z.int().min(1),
        reason: z.string().min(1, 'a rule with no reason is a rule nobody can weigh'),
      })
      .optional(),
  })
  .refine((c) => c.forbiddenDegrees !== undefined || c.onsetOffset !== undefined, {
    message: 'constraints that constrain nothing are an author writing something that does nothing',
  })

/**
 * §5A/#554/#623. **The chord occurrence sounding at a figure step**: its degree, and the figure
 * step that occurrence began on. `undefined` where the riff carries no harmony, or where the
 * progression does not cover the bar (a progression summing to less than `cycleBars`).
 *
 * **The cycle repeats under a figure longer than it.** A hook has no ceiling (§5A.2, #603) and
 * a 48-bar line over a 12-bar cycle is four times round it, so the bar is taken modulo
 * `cycleBars` rather than read off the first cycle alone. Before #623 this stopped at the end of
 * the first cycle and answered `undefined` for every later step, which made every check built
 * on it silently pass on anything past bar twelve.
 *
 * The start step is what tells one occurrence of a chord from the next: a `VI` in bar 3 and the
 * `VI` the cycle returns to in bar 15 are one chord symbol and two entries, and a rule about how
 * a chord is entered has to see both. Where `figureStartsAtBar` places the figure on a chord
 * boundary (the schema requires it) every occurrence begins at or after step 1.
 */
export function chordOccurrenceAt(
  riff: Riff,
  step: number,
): { degree: string; startStep: number } | undefined {
  const { harmony } = riff
  if (harmony === undefined) return undefined
  const hookBar = Math.floor((step - 1) / STEPS_PER_BAR)
  const cycleBar = ((riff.figureStartsAtBar ?? 1) - 1 + hookBar) % harmony.cycleBars
  let bar = 0
  for (const chord of harmony.progression) {
    if (cycleBar >= bar && cycleBar < bar + chord.bars) {
      const barsIntoChord = cycleBar - bar
      return { degree: chord.degree, startStep: (hookBar - barsIntoChord) * STEPS_PER_BAR + 1 }
    }
    bar += chord.bars
  }
  return undefined
}

/**
 * §5A/#554. Which chord of the cycle is sounding at a figure step, or `undefined` where the riff
 * carries no harmony to answer with. Exported because both the schema and the surfaces need it and
 * neither should re-derive the arithmetic. `chordOccurrenceAt` is the same answer with the
 * occurrence kept; this is the degree alone, which is what a note row prints.
 */
export function chordAtStep(riff: Riff, step: number): string | undefined {
  return chordOccurrenceAt(riff, step)?.degree
}

/**
 * §5A/#554. Every rule this riff breaks, as sentences naming the note and the chord. Empty for a
 * riff that keeps them, and for one that states none.
 *
 * Pure and exported so the schema can fail the build on it *and* a test can print it. The schema
 * is the gate — a manifest that breaks its own stated rule should not parse — and the sentences
 * are what makes the failure actionable rather than a boolean.
 */
export function riffConstraintViolations(riff: Riff): string[] {
  const rules = riff.constraints
  if (rules === undefined) return []
  const out: string[] = []
  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') return out
  const lastStep = riff.hook.bars * STEPS_PER_BAR

  for (const rule of rules.forbiddenDegrees ?? []) {
    // #605. See `ForbiddenDegree`: a pitch the key does not have is forbidden over every chord,
    // and the key's own note over the one chord the rule names.
    const wholePiece = (rule.alter ?? 0) !== 0
    const reaches = (chord: string | undefined): chord is string =>
      chord !== undefined && (wholePiece || chord === rule.chord)

    for (const note of resolved.hook.notes) {
      if (note.degree !== rule.degree) continue
      if ((note.alter ?? 0) !== (rule.alter ?? 0)) continue
      for (let step = note.step; step < note.step + note.len && step <= lastStep; step += 1) {
        const chord = chordAtStep(riff, step)
        if (!reaches(chord)) continue
        out.push(
          `${note.note} sounds over ${chord} at step ${String(step)}, which this riff ` +
            `forbids: ${rule.reason}`,
        )
        break
      }
    }

    // #605. The chords themselves. Compared as pitch classes, since a chord tone carries no
    // degree; each distinct chord once, in cycle order, so a `i` that returns is named once.
    const forbidden = spellDegree(rule.degree, rule.alter, riff.key)
    if (forbidden.outcome !== 'resolved') continue
    const checked = new Set<string>()
    for (const { degree } of riff.harmony?.progression ?? []) {
      if (checked.has(degree) || !reaches(degree)) continue
      checked.add(degree)
      const spelt = spellChord(degree, riff.key)
      if (spelt.outcome !== 'resolved') continue
      const tone = spelt.chord.notes.find((n) => pitchClassOf(n) === forbidden.semitone)
      if (tone === undefined) continue
      // `Fb` in the chord and `E` in the rule are one pitch, and the sentence says so only
      // where the two spellings differ.
      const named = tone === forbidden.pitchClass ? tone : `${tone}, the ${forbidden.pitchClass}`
      out.push(
        `${degree} is ${chordNotesText(spelt.chord.notes)}, which has the ${named} this riff ` +
          `forbids: ${rule.reason}`,
      )
    }
  }

  const offset = rules.onsetOffset
  if (offset !== undefined) {
    // #623. Each *occurrence* of a chord is entered once, keyed on the step it began, and not
    // each chord symbol: a cycle a figure goes round four times has four `VI`s, and the fourth
    // is entered as late or as early as it is, whatever the first did. Keyed by symbol, the
    // check saw one entry per chord across the whole hook and nothing after the first cycle.
    const entered = new Set<number>()
    const sorted = [...riff.hook.notes].sort((a, b) => a.step - b.step)
    for (const note of sorted) {
      const occurrence = chordOccurrenceAt(riff, note.step)
      if (occurrence === undefined || entered.has(occurrence.startStep)) continue
      entered.add(occurrence.startStep)
      // Where in its own chord the entry falls, which needs the chord's start rather than the
      // bar's: a chord two bars long is entered late at step 20 and on the nose at step 17.
      const into = note.step - occurrence.startStep
      if (into >= offset.minSteps) continue
      out.push(
        `${occurrence.degree} is entered at step ${String(note.step)}, ${String(into)} steps in, ` +
          `where this riff asks for ${String(offset.minSteps)}: ${offset.reason}`,
      )
    }
  }
  return out
}

/**
 * §12.4/#645. **The most notes a hook holds at any one step** — what *sounds* rather than what
 * *starts*, since a voice is spent for as long as a note is in force. This is the count an
 * ordinary riff's `polyphony` has to equal (`test/riff.test.ts`) and the count an arpeggiated
 * hold's has to be free of, and it is exported so neither side re-derives it.
 */
export function widestHold(hook: Pick<Hook, 'bars' | 'notes'>): number {
  let widest = 0
  const last = hook.bars * STEPS_PER_BAR
  for (let step = 1; step <= last; step += 1) {
    let sounding = 0
    for (const n of hook.notes) {
      if (step >= n.step && step < n.step + n.len) sounding += 1
    }
    widest = Math.max(widest, sounding)
  }
  return widest
}

export const RiffSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    reference: RiffReferenceSchema,
    patchAffinities: z.array(PatchAffinitySchema).min(1).optional(),
    technique: z.array(z.string().min(1)).min(1, 'a riff is a technique: say what it is'),
    bpm: BpmSpecSchema,
    key: MusicalKeySchema,
    request: RiffRequestSchema,
    harmony: HarmonySchema.optional(),
    figureStartsAtBar: z.int().min(1).optional(),
    constraints: RiffConstraintsSchema.optional(),
    arpeggiatedHold: z.literal(true).optional(),
    hook: HookSchema,
    pattern: PatternSchema.optional(),
  })
  .superRefine((riff, ctx) => {
    const { request, hook, pattern } = riff
    // §5A.5. The reference has to be findable in both the things a reader sees — the title on the
    // page and the slug in the address bar — so both are checked against the one field that says
    // what it is. `toLowerCase` and a character class, never `toLocaleLowerCase`: a Turkish
    // locale folds `I` to a dotless `ı` and the slug would differ by machine (§7.2).
    if (!riff.name.includes(riff.reference.name)) {
      ctx.addIssue({
        code: 'custom',
        message: `the title must name '${riff.reference.name}', the ${riff.reference.kind} this technique is found by (§5A.5)`,
        path: ['name'],
      })
    }
    const slug = referenceSlug(riff.reference.name)
    if (!riff.id.startsWith(slug)) {
      ctx.addIssue({
        code: 'custom',
        message: `the id must open with '${slug}', so the address carries the ${riff.reference.kind} too (§5A.5)`,
        path: ['id'],
      })
    }
    // §5A.5/#585. Two entries with one key would be one alignment with two reasons, and a page
    // that could only act on one of them.
    const keys = (riff.patchAffinities ?? []).map(affinityKey)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'two patch affinities name the same patch (§5A.5/#585)',
        path: ['patchAffinities'],
      })
    }
    // §4.1. The hook resolves against this key and there is no second one to fall back to, so a
    // key nothing can parse is a riff with no notes — refused here rather than reported later.
    // A *direction's* key arrives from a permalink and a reader, which is why §5.6 reports one
    // instead; this is authored content and the build is the right place to fail.
    if (parseKey(riff.key) === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `'${riff.key}' is not a key this engine reads (§4.1)`,
        path: ['key'],
      })
    }
    // A riff has no structure, so `transient` has no section to name. `RoleRequestSchema` already
    // refuses a continuous request that lists sections; this is the other half.
    if (request.sustain !== 'continuous') {
      ctx.addIssue({
        code: 'custom',
        message: 'a riff has no sections for a transient request to occupy (§4.2)',
        path: ['request', 'sustain'],
      })
    }
    // Not a decision — the only honest value when there is nothing to rank against. A riff that
    // wrote 3 here would be implying two parts it does not have.
    if (request.priority !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'a riff is one part: its priority is 1 (§4.4)',
        path: ['request', 'priority'],
      })
    }
    // §4.4. `optional` tells the search not to spend a voice on this and `inessential` tells the
    // reader not to go looking for a box. Both are sentences about a *song* that survives the
    // absence; a riff that the rig cannot play is not a riff with a part missing, it is the gap
    // `resolveRiff` reports.
    if (request.optional !== undefined || request.inessential !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'a riff is the part: it cannot also be one the piece does without (§4.4)',
        path: ['request'],
      })
    }
    // §12.6. `distinct` is a claim about a *second* request sharing this role. There is none.
    if (request.distinct !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'a riff has one request, so there is nothing for it to be distinct from (§12.6)',
        path: ['request', 'distinct'],
      })
    }
    // §4.1/#100 and #334, both arriving at the same place: the hook already names every note.
    // `pitch` would name one more and `followsKey` would displace the ones there are. Checkable
    // here, where `TemplateSchema` cannot check the first of them, because a riff holds its
    // request and its hook in one object.
    if (request.pitch !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'the hook names this riff’s notes: the request cannot name another (§4.1)',
        path: ['request', 'pitch'],
      })
    }
    if (request.followsKey !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'the hook is already in the key: following it would transpose it twice (§4.1)',
        path: ['request', 'followsKey'],
      })
    }
    /*
     * §5A/#552/#623. The offset is meaningless without a cycle to be an offset into, and has to
     * land on a chord boundary. Each is checked separately so the message names the one that is
     * wrong. It no longer has to leave room for the figure inside one cycle: the cycle repeats
     * under a figure longer than it (`chordOccurrenceAt`), so a 48-bar figure from bar 1 of a
     * 12-bar cycle is four times round it and not a figure that runs off the end.
     */
    if (riff.figureStartsAtBar !== undefined) {
      const { harmony } = riff
      if (harmony === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'figureStartsAtBar is a bar of `harmony`, so there has to be one (§5A/#552)',
          path: ['figureStartsAtBar'],
        })
      } else {
        const starts = new Set<number>()
        let bar = 1
        for (const step of harmony.progression) {
          starts.add(bar)
          bar += step.bars
        }
        if (!starts.has(riff.figureStartsAtBar)) {
          ctx.addIssue({
            code: 'custom',
            message:
              `the figure starts at bar ${String(riff.figureStartsAtBar)}, which is not where a ` +
              `chord starts — chords begin at ${[...starts].join(', ')} (§5A/#552)`,
            path: ['figureStartsAtBar'],
          })
        }
      }
    }
    /*
     * §5A/#554. **A riff that breaks its own stated rule does not parse.** The rules are the
     * author's, so this is not the schema having an opinion about music — it is the schema
     * holding an entry to what it says about itself, which is the one thing prose could not do.
     *
     * Each violation is its own issue so a manifest with three names three, and the reason the
     * author wrote is carried into the message: a failure that says which rule and why is one
     * somebody can act on without opening this file.
     */
    for (const violation of riffConstraintViolations(riff as Riff)) {
      ctx.addIssue({ code: 'custom', message: violation, path: ['constraints'] })
    }
    if (hook.forRole !== request.role) {
      ctx.addIssue({
        code: 'custom',
        message: `the hook is for \`${hook.forRole}\`, and the part is \`${request.role}\``,
        path: ['hook', 'forRole'],
      })
    }
    /*
     * §5A.2/§12.4/#645. **An arpeggiated hold is the fourth shape, and it is held on every
     * role.** See `Riff.arpeggiatedHold`: the arpeggiator is the rhythm, so there is no grid and
     * no flag in either spelling; the box sounds one note at a time, so the request asks for
     * one voice and the hold's width lives in the hook alone; and the hook holds more than one
     * note somewhere, or there is nothing to arpeggiate.
     */
    const arpeggiated = riff.arpeggiatedHold === true
    if (arpeggiated) {
      if (pattern !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'an arpeggiated hold has no grid: the arpeggiator is the rhythm, and a grid beside ' +
            'it would be two authorities over one rhythm (#100, §5A.2)',
          path: ['pattern'],
        })
      }
      if (request.reArticulatesHook !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            'an arpeggiated hold has no grid to re-articulate the hook: the arpeggiator strikes ' +
            'the notes (§5A.2)',
          path: ['request', 'reArticulatesHook'],
        })
      }
      if ((request.polyphony ?? 1) !== 1) {
        ctx.addIssue({
          code: 'custom',
          message:
            `an arpeggiated hold sounds one note at a time and asks for one voice, not ` +
            `${String(request.polyphony)}: the width of the hold is the hook's (§12.4)`,
          path: ['request', 'polyphony'],
        })
      }
      if (widestHold(hook) < 2) {
        ctx.addIssue({
          code: 'custom',
          message:
            'an arpeggiated hold holds more than one note at some step; with one there is ' +
            'nothing for the arpeggiator to run through (§5A.2)',
          path: ['hook', 'notes'],
        })
      }
    }
    /*
     * §4.2/§5A.2/#608/#623. **The role and the flag decide whether there is a grid.** A held
     * role (`NON_PATTERN_BEARING_ROLES`) is a note held rather than a rhythm struck, so a riff on
     * one is its hook and nothing else: no `pattern`, and no `reArticulatesHook` in either
     * spelling, since there is no grid question for the flag to answer. A struck role has to
     * answer it, and the flag is required rather than offered — see the header. `true` means a
     * grid says where the hook is struck again, and the grid is required beside it. `false`
     * means the figure is through-composed, the hook is the whole rhythm, and a grid beside it
     * would be the two authorities #100 forbids. Each shape refuses the others', so an entry
     * cannot half-change role and cannot carry a grid it has disowned.
     */
    if (arpeggiated) {
      // Held on every role, and checked above; the struck-role question is never asked.
    } else if (!bearsPattern(request.role)) {
      if (pattern !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `\`${request.role}\` is held rather than struck: it has no grid to riff on (§4.2)`,
          path: ['pattern'],
        })
      }
      if (request.reArticulatesHook !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message:
            `\`${request.role}\` is held rather than struck: there is no grid to re-articulate ` +
            'the hook (§4.2)',
          path: ['request', 'reArticulatesHook'],
        })
      }
    } else if (request.reArticulatesHook === undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          `\`${request.role}\` is struck, so the riff says whether a grid re-articulates the hook: ` +
          '`true` beside a grid, or `false` with none where the figure is through-composed (§5A.2)',
        path: ['request', 'reArticulatesHook'],
      })
    } else if (request.reArticulatesHook) {
      if (pattern === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `\`${request.role}\` is struck: a riff on it says where, in a grid (§4.3)`,
          path: ['pattern'],
        })
      }
    } else if (pattern !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message:
          'the request says the figure is through-composed and the grid says where it is struck: ' +
          'two authorities over one rhythm (#100). Drop the grid, or say `reArticulatesHook: true`',
        path: ['pattern'],
      })
    }
    if (pattern !== undefined) {
      if (pattern.forRole !== request.role) {
        ctx.addIssue({
          code: 'custom',
          message: `the grid is for \`${pattern.forRole}\`, and the part is \`${request.role}\``,
          path: ['pattern', 'forRole'],
        })
      }
      // §4.3. Bands exist so density can select among variants (§6.3). A riff has one variant
      // and no density knob, so every band but the base one would be a choice nothing can make.
      if (pattern.band !== 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'a riff has one variant and no density to select with: its band is 0 (§6.3)',
          path: ['pattern', 'band'],
        })
      }
      if (pattern.sections !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'a riff has no sections for a variant to be eligible in (§4.2)',
          path: ['pattern', 'sections'],
        })
      }
      if (pattern.hits.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'a riff whose grid strikes nothing is a held note, not a riff (§4.3)',
          path: ['pattern', 'hits'],
        })
      }
      // §5A.2/#603. The grid is capped at 64 steps and the hook is not; a longer hook is played
      // with the grid repeating beneath it, so the hook has to be a whole number of passes. A
      // twelve-bar line over a four-bar grid is three passes; a ten-bar line over the same grid
      // would have the grid cut off mid-pass at the end of the figure, and nothing on the page
      // could say where.
      if ((hook.bars * STEPS_PER_BAR) % pattern.length !== 0) {
        ctx.addIssue({
          code: 'custom',
          message:
            `a ${String(hook.bars)}-bar hook is ${String(hook.bars * STEPS_PER_BAR)} steps, which ` +
            `is not a whole number of passes of a ${String(pattern.length)}-step grid (§5A.2)`,
          path: ['hook', 'bars'],
        })
      }
    }
    if (hook.notes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'a riff with no notes is a drum pattern, not a riff (§4.1)',
        path: ['hook', 'notes'],
      })
    }
  })

// ---------------------------------------------------------------------------
// Resolution against a rig
// ---------------------------------------------------------------------------

/**
 * §7.3. **Why a rig cannot play this riff**, in `Gap`'s own two reachable shapes.
 *
 * Deliberately not `search.ts`'s `Gap`. That type carries a `requestId`, a `priority`, an
 * `optional` flag and a `no-room` arm, and every one of them is about a part *competing with
 * other parts for a rig* — the thing a riff has none of. `no-room` in particular is unreachable
 * here by construction: with one request and no occupancy, nothing can take the voice first.
 * Borrowing the type would have meant filling four fields with values that mean nothing and
 * leaving a third arm that can never be produced.
 *
 * The two arms that *are* reachable keep §7.3's names and its distinction, because it is the same
 * distinction and the reader acts differently on each: `no-capable-voice` is fixed by buying a
 * box, `no-recipe` by somebody writing one — "your box can do this, dial it by ear".
 */
export type RiffGap =
  | {
      reason: 'no-capable-voice'
      /**
       * `no-such-role` — nothing plays it at all. `polyphony` — it plays, but not this wide.
       * `no-arpeggiator` — it plays, but the figure holds its chord under an arpeggiator
       * (`Riff.arpeggiatedHold`) and no box here declares one (§12.4/#645).
       */
      because: 'no-such-role' | 'polyphony' | 'no-arpeggiator'
      /** Simultaneous notes the part asked for. 1 unless the request said otherwise. */
      notes: number
      /**
       * Voices that claim the role and could not carry the part. Empty for `no-such-role`; for
       * `no-arpeggiator`, the voices whose box has no arpeggiator to hold the chord under.
       */
      roleVoices: readonly Assignable[]
    }
  | {
      reason: 'no-recipe'
      /** Every voice that could have carried this part. Never empty — that is what makes it this
       * gap rather than the one above. */
      capable: readonly Assignable[]
    }

/** §7.1. The voice a riff landed on, and everything a reader needs to build it there. */
export type RiffVoicing = {
  device: Device
  /**
   * §12.4/#40. **The voices carrying the part, in `comparePoolMembers` order.** One for the
   * ordinary case; `polyphony` of them for a chord spread one note per voice across a pool.
   *
   * A list rather than a single assignable, and that is the whole of #503's second fix. It was
   * one, and a rig whose only way to play a three-note figure was to spread it across three
   * mono tracks was told `no-recipe` — *your box could carry it, set it up by ear* — which is
   * wrong twice over: the rig plays it, and the recipe exists.
   *
   * The order is load-bearing and is the search's own: §8 hands the lowest note to the lowest
   * voice, and a page that listed them any other way would be telling a reader to cross the
   * voicing over.
   */
  assignables: readonly Assignable[]
  /**
   * §12.4/#40. `assignables.length` — 1 for an ordinary part, more for a stacked chord. Named
   * rather than left to be counted because it is what `resolveParams` is handed (§7 step 9), and
   * a `valueFrom: 'stackWidth'` parameter resolved against the wrong one is a wrong number on
   * the page with nothing saying so.
   */
  stackWidth: number
  recipe: Recipe
  /**
   * The character actually authored. **Not always the one the riff asked for** — §3.5 allows a
   * substitution within `MAX_SUBSTITUTION_DISTANCE_SQ`, and a renderer that hid it would be
   * telling a reader they are playing a dirty acid line on a bright patch.
   */
  character: Character
  /** True where `character` is not the one requested. */
  substituted: boolean
  params: readonly ResolvedParam[]
  patch: readonly ResolvedPatchEntry[]
  sourceAudio: ResolvedSourceAudio | undefined
  /**
   * §3/#516. How to reach the sound, where the box makes it itself. Beside `sourceAudio` because
   * the two are different instructions, and a riff can land on either — `acid-tracks-line` on an
   * EP–40 alone is the supertone, and before the split that page said *"one of the ten supertone
   * sounds"* through a field meaning *go and find a file*.
   */
  soundSetup: ResolvedSoundSetup | undefined
  /**
   * §3/#553, §5A.5/#585. The recipe's authored claim, evidence and all, **where the riff authors
   * an affinity with it** — `affinePatch` — and `undefined` otherwise, so that both renderers
   * print nothing for a patch the figure reached by role and character alone.
   */
  factoryPatch: FactoryPatch | undefined
  articulation: readonly BoundArticulation[]
  /** §2.1. The note that plays this voice as it is, on a box addressed by note. */
  triggerNote: TriggerNote | undefined
}

/**
 * §5A. A riff against one rig. Exactly one of the two outcomes, because "played on nothing" and
 * "played here" are not two readings of one state.
 *
 * `notes` is present on both arms on purpose: a rig that cannot play the figure has not stopped
 * the figure from having notes, and a reader deciding what to buy is better served seeing them.
 */
export type RiffResolution = {
  riff: Riff
  /**
   * The rig this was resolved against, carried exactly as `ResolveResult.devices` is and for the
   * same reason: a gap names the boxes that could not serve the part, and a renderer handed only
   * `Assignable`s would have nothing but a device *id* to print at somebody standing at a rack.
   */
  devices: readonly Device[]
  /** The hook against the riff's own key. `unresolved` is a content bug, never a rig gap. */
  notes: HookResolution
} & ({ outcome: 'played'; voice: RiffVoicing } | { outcome: 'gap'; gap: RiffGap })

/**
 * §5A/§7.1. **One part, one rig, and no search.**
 *
 * §7.1's search exists to allocate *several* parts to a rig without two of them taking the same
 * voice. A riff has one part, so there is nothing to allocate and nothing to back-track over:
 * the answer is the best candidate, and the candidates are the voices that claim the role and
 * can carry the notes. `measure:search` is untouched by this file, and must stay untouched — a
 * riff never enters the tree it bounds.
 *
 * **The ranking is §7.1's own**, because a riff that ranked its candidates differently would hand
 * a reader a worse voice for the same figure with nothing on the page saying so. It is `Score`'s
 * order rather than `Cost`'s alone, and it lives in `voicing.ts` — `VoiceCandidate` and
 * `bestVoiceCandidate` — because `resolveSample` now asks the identical question of a rig (#520)
 * and a comparator whose key order is an argument settled in §7.1 must not be settled twice.
 *
 * **The first cut used `compareCost` alone and was wrong** on the one shape where the two keys
 * disagree: it took a three-voice stack on a box comfortable with one voice, where the search
 * takes the one-voice chord sample beside it. `test/riff-session.test.ts` pins that case against
 * a one-request `assign`.
 *
 * **Stacks are materialised here too** (§12.4/#40, #503). A pool of mono members with a
 * `polyphonic-voice` recipe plays a chord one note per voice, and that route has to be built or
 * the rig gets told `no-recipe` for a figure it can play.
 *
 * **No seed, and there is nothing for one to do** (§7.2). A seed permutes only among *exactly
 * equal* costs, and the ordering is total: `compareCost`, then the first voice's key, then the
 * recipe's id, both by code unit. Same rig, same bytes, on any platform (invariant 6).
 *
 * **No mood, so no character resolution and no offsets.** §6.2's character move and §6.1's
 * arithmetic are both mood operations, and a riff has no knobs — `NEUTRAL_MOOD` is the state
 * where §6.1's offset is zero, which is what "the reader has not turned anything" means. The
 * character the riff asked for is therefore the character the recipe is scored against.
 */
export function resolveRiff(riff: Riff, devices: readonly Device[]): RiffResolution {
  const { request } = riff
  const role = request.role
  const want = request.character
  const wantedNotes = request.polyphony ?? 1
  const notes = resolveHook(riff.hook, riff.key)

  const roleVoices: Assignable[] = []
  const capable: Assignable[] = []
  const candidates: VoiceCandidate[] = []
  /**
   * §12.4/#40. Pool members grouped by the pool they belong to, in `comparePoolMembers` order,
   * exactly as `buildCtx` groups them for stack planning. Insertion order is device order then
   * the order `expand` emits pools in, so iterating this is as deterministic as iterating the
   * assignables themselves (§7.2).
   */
  const pools = new Map<string, { device: Device; members: Assignable[] }>()

  /**
   * §12.4/#645. **An arpeggiated hold is played only by a box that declares the arpeggiator.**
   * The riff's claim is that the box sounds the held chord one note at a time, and that is a
   * fact about the box (`features.arpeggiator`, cited) rather than about the figure; a box that
   * has not said it is not a candidate, however many voices it has. Its voices are still
   * counted as playing the role, so the gap can say the part is playable here and the
   * arpeggiator is what is missing.
   */
  const arpeggiated = riff.arpeggiatedHold === true
  let withoutArpeggiator = 0

  for (const device of devices) {
    const eligible = !arpeggiated || hasArpeggiator(device)
    for (const assignable of expand(device)) {
      if (assignable.poolId !== undefined && eligible) {
        // NUL, so `a` + `b-c` and `a-b` + `c` cannot collide — `poolGroupKey`'s own reason.
        const key = `${assignable.deviceId}\u0000${assignable.poolId}`
        const group = pools.get(key)
        if (group === undefined) pools.set(key, { device, members: [assignable] })
        else group.members.push(assignable)
      }
      if (!assignable.roles.includes(role)) continue
      roleVoices.push(assignable)
      if (!eligible) {
        withoutArpeggiator += 1
        continue
      }
      // §12.4. The same two questions the search asks, in the same order: the voice sounds the
      // notes itself (or a recipe gets there another way), or a pool spreads them.
      const carries = canCarryNotes(device, assignable, role, wantedNotes)
      const stacks = canStackNotes(device, assignable, role, wantedNotes)
      if (!carries && !stacks) continue
      capable.push(assignable)
      // Only the *carrying* route is scored here. A voice that qualifies solely by stacking is
      // asked for a recipe it can run one note at a time, below — asking `resolveRecipe` for the
      // whole chord on a mono track answers `unvoiced`, which is what sent #503's first cut into
      // a `no-recipe` gap on a rig that plays the figure perfectly well.
      if (!carries) continue
      const resolution = resolveRecipe(device, assignable, role, want, wantedNotes)
      // §3.5. `unvoiced` is not a candidate: it neither plays the part nor occupies the voice,
      // and it comes back below as the `no-recipe` gap.
      if (resolution.outcome === 'unvoiced') continue
      candidates.push({
        device,
        assignables: [assignable],
        recipe: resolution.recipe,
        character: resolution.character,
        crowd: crowdOf(device, 1),
        sampledChord:
          wantedNotes > 1 && realisationOf(resolution.recipe) === 'sampled-chord' ? 1 : 0,
        stacked: 0,
        distance: quantiseDistance(resolution.distanceSq),
        roleFit: assignable.roles.indexOf(role),
      })
    }
  }

  for (const { device, members } of pools.values()) {
    members.sort(comparePoolMembers)
    /**
     * §12.4/#40. One plan per pool that could spread this part, asked of a representative member
     * because every one of the answers is a per-pool fact (§2.2) — `buildCtx` does the same.
     *
     * **The members are simply the first `wantedNotes` of them**, where the search calls
     * `chooseStackMembers` against live occupancy. With one part there is no occupancy: every
     * member is free, so "already-busy last, then lowest ordinal" collapses to "lowest ordinal",
     * which is what `comparePoolMembers` order already is. That is the one place this deliberately
     * does less than the search, and it does less because there is less to do.
     */
    const representative = members[0]
    if (representative === undefined) continue
    if (!representative.roles.includes(role)) continue
    if (!canStackNotes(device, representative, role, wantedNotes)) continue
    if (members.length < wantedNotes) continue
    const best = stackRecipes(device, representative, role, want)[0]
    // No usable recipe at this character is a `no-recipe` gap, exactly as for a single.
    if (best === undefined) continue
    candidates.push({
      device,
      assignables: members.slice(0, wantedNotes),
      recipe: best.recipe,
      character: best.recipe.character,
      // The voices a stack spends, priced against what the box is comfortable with. This is the
      // key that lets a one-voice chord sample beat a three-voice stack on a crowded box.
      crowd: crowdOf(device, wantedNotes),
      // A stack is voices, never a sample: `stackRecipes` has already excluded the other route.
      sampledChord: 0,
      stacked: 1,
      distance: quantiseDistance(best.distanceSq),
      roleFit: representative.roles.indexOf(role),
    })
  }

  if (capable.length === 0) {
    // Named in the order a reader acts on them: nothing plays the part; something does but
    // nothing here has the arpeggiator the hold needs; something does but not this wide.
    const because =
      roleVoices.length === 0
        ? 'no-such-role'
        : withoutArpeggiator === roleVoices.length
          ? 'no-arpeggiator'
          : 'polyphony'
    return {
      riff,
      devices,
      notes,
      outcome: 'gap',
      gap: { reason: 'no-capable-voice', because, notes: wantedNotes, roleVoices },
    }
  }

  const winner = bestVoiceCandidate(candidates)

  if (winner === undefined) {
    return {
      riff,
      devices,
      notes,
      outcome: 'gap',
      gap: { reason: 'no-recipe', capable },
    }
  }

  const stackWidth = winner.assignables.length
  return {
    riff,
    devices,
    notes,
    outcome: 'played',
    voice: {
      device: winner.device,
      assignables: winner.assignables,
      stackWidth,
      recipe: winner.recipe,
      character: winner.character,
      substituted: winner.character !== want,
      // §7 step 9. One part on one box, so the share is the whole pool. Passed rather than
      // omitted because `resolveParam` throws on a `valueFrom` it cannot answer, and a riff must
      // not fall over on a device that authors one.
      params: resolveParams(winner.recipe, NEUTRAL_MOOD, {
        stackWidth,
        devicePartShare: devicePoolCapacity(winner.device),
      }),
      patch: resolvePatch(winner.recipe),
      sourceAudio: resolveSourceAudio(winner.recipe),
      soundSetup: resolveSoundSetup(winner.recipe),
      factoryPatch: affinePatch(riff, winner.recipe.factoryPatch),
      // §5A.2/#608. Articulation addresses the grid's slots, and a held riff has no grid: nothing
      // to bind to, so nothing is bound, rather than a slot list read off a pattern that is not
      // there.
      articulation: riff.pattern === undefined ? [] : bindArticulation(winner.recipe, riff.pattern),
      // §2.2/#86. Read off the first voice, which every member of a pool shares — a stack is one
      // pool on one device, so there is one answer rather than one per voice.
      triggerNote: triggerNoteFor(winner.recipe, winner.assignables[0]),
    },
  }
}
