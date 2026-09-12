import { z } from 'zod'
import type { Assignable, Device, FactoryPatch, Recipe, TriggerNote } from './device'
import { realisationOf } from './device'
import { comparePoolMembers, quantiseDistance } from './search'
import { parseKey, resolveHook, type HookResolution } from './harmony'
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
 * — and that is what a riff is. `RiffSchema` therefore **requires** the flag rather than offering
 * it: a figure whose hook competed with its own grid is not a riff anybody could play, and this
 * is checkable here where `TemplateSchema` could only check that both halves exist.
 */

// ---------------------------------------------------------------------------
// The riff
// ---------------------------------------------------------------------------

export type Riff = {
  /** Opens with `track`, slugified — `RiffSchema` enforces it. See `track`. */
  id: RiffId
  /** 'The Blue Monday bass'. Contains `track` verbatim — `RiffSchema` enforces it. */
  name: string
  /**
   * §5A.5. **The recording this technique is named for**, as somebody would say it out loud.
   *
   * Every riff has one. A technique is found by the record it is famous from, and a library where
   * some entries carried a reference and some did not would be asking a reader to know which kind
   * they were looking at before they could search for it.
   *
   * **A field rather than a convention, because both the slug and the title have to carry it and
   * a convention is a thing two authors can disagree about by Tuesday.** `RiffSchema` requires
   * `name` to contain this verbatim and `id` to open with its slug, so an entry named for one
   * record and filed under another cannot parse.
   *
   * **It is a reference, never a claim about the notes.** The hook below is this library's own —
   * see `lib/riffs` and §5A.5. What a riff teaches is a way of playing a part; the figure carrying
   * that here is ours, and a reader who wants the record should go and listen to the record.
   */
  track: string
  /**
   * **What the technique is, in the words somebody would use teaching it.** One string per
   * paragraph, prose, and the only free text a riff carries.
   *
   * It is the whole reason a riff exists as a rendered thing rather than as a hook in a
   * direction: the notes and the grid say *what to play*, and this says *what makes it that
   * part* — where the accents sit, what the figure is answering, what to listen for when it is
   * right. Neither the resolver nor the schema reads it.
   *
   * **It never names a device** (invariant 3) and it never carries a transcription. Where an
   * entry is named after a recording, the recording is the reference and the notes below are
   * this library's own — see `lib/riffs`.
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
   * transient request to name.
   */
  request: RoleRequest
  /** The notes. Original, always — never a transcription of the recording an entry references. */
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
   * requires `harmony` alongside it, requires the figure to fit inside the cycle, and requires
   * the figure to start where a chord does — a figure beginning halfway through a chord is
   * expressible and is a different thing, and nothing has needed it.
   */
  figureStartsAtBar?: number
  hook: Hook
  /** Where the hook's notes are struck. See the header: `reArticulatesHook` is what joins them. */
  pattern: Pattern
}

/**
 * §5A.5. `'Show Me Love'` → `'show-me-love'`. The form a riff's `id` has to open with.
 *
 * ASCII by construction: a track name outside it would produce a slug nobody could type into an
 * address bar, and the schema refusing the entry is the right answer rather than a transliteration
 * this file would have to invent. `toLowerCase` is locale-independent by specification, unlike its
 * `toLocale` sibling, which is the one §7.2 bans.
 */
export function trackSlug(track: string): string {
  return track
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const RiffSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    track: z.string().min(1),
    technique: z.array(z.string().min(1)).min(1, 'a riff is a technique: say what it is'),
    bpm: BpmSpecSchema,
    key: MusicalKeySchema,
    request: RoleRequestSchema,
    harmony: HarmonySchema.optional(),
    figureStartsAtBar: z.int().min(1).optional(),
    hook: HookSchema,
    pattern: PatternSchema,
  })
  .superRefine((riff, ctx) => {
    const { request, hook, pattern } = riff
    // §5A.5. The reference has to be findable in both the things a reader sees — the title on the
    // page and the slug in the address bar — so both are checked against the one field that says
    // what it is. `toLowerCase` and a character class, never `toLocaleLowerCase`: a Turkish
    // locale folds `I` to a dotless `ı` and the slug would differ by machine (§7.2).
    if (!riff.name.includes(riff.track)) {
      ctx.addIssue({
        code: 'custom',
        message: `the title must name '${riff.track}', the record this technique is found by (§5A.5)`,
        path: ['name'],
      })
    }
    const slug = trackSlug(riff.track)
    if (!riff.id.startsWith(slug)) {
      ctx.addIssue({
        code: 'custom',
        message: `the id must open with '${slug}', so the address carries the record too (§5A.5)`,
        path: ['id'],
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
    // See the header. The flag is what says the grid places strikes *inside* the hook rather than
    // competing with it, and a riff carries both by construction, so it is required rather than
    // offered.
    if (request.reArticulatesHook !== true) {
      ctx.addIssue({
        code: 'custom',
        message:
          'a riff carries a hook and a grid: it must say the grid re-articulates the hook (§4.3)',
        path: ['request', 'reArticulatesHook'],
      })
    }
    /*
     * §5A/#552. The offset is meaningless without a cycle to be an offset into, has to land on a
     * chord boundary, and has to leave room for the figure. Each is checked separately so the
     * message names the one that is wrong.
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
        if (riff.figureStartsAtBar + hook.bars - 1 > harmony.cycleBars) {
          ctx.addIssue({
            code: 'custom',
            message:
              `a ${String(hook.bars)}-bar figure from bar ${String(riff.figureStartsAtBar)} runs ` +
              `past the ${String(harmony.cycleBars)}-bar cycle (§5A/#552)`,
            path: ['figureStartsAtBar'],
          })
        }
      }
    }
    // Invariant 5's list, read the other way: a role that is held rather than struck has no grid
    // to be missing, so a riff on one would be authoring a pattern that says nothing.
    if (!bearsPattern(request.role)) {
      ctx.addIssue({
        code: 'custom',
        message: `\`${request.role}\` is held rather than struck: it has no grid to riff on (§4.2)`,
        path: ['request', 'role'],
      })
    }
    if (hook.forRole !== request.role) {
      ctx.addIssue({
        code: 'custom',
        message: `the hook is for \`${hook.forRole}\`, and the part is \`${request.role}\``,
        path: ['hook', 'forRole'],
      })
    }
    if (pattern.forRole !== request.role) {
      ctx.addIssue({
        code: 'custom',
        message: `the grid is for \`${pattern.forRole}\`, and the part is \`${request.role}\``,
        path: ['pattern', 'forRole'],
      })
    }
    // §4.3. Bands exist so density can select among variants (§6.3). A riff has one variant and
    // no density knob, so every band but the base one would be a choice nothing can make.
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
      /** `no-such-role` — nothing plays it at all. `polyphony` — it plays, but not this wide. */
      because: 'no-such-role' | 'polyphony'
      /** Simultaneous notes the part asked for. 1 unless the request said otherwise. */
      notes: number
      /** Voices that claim the role and could not carry the notes. Empty for `no-such-role`. */
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
  /** §3/#553. The authored claim, evidence and all: a riff page shows one device at a time. */
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

  for (const device of devices) {
    for (const assignable of expand(device)) {
      if (assignable.poolId !== undefined) {
        // NUL, so `a` + `b-c` and `a-b` + `c` cannot collide — `poolGroupKey`'s own reason.
        const key = `${assignable.deviceId}\u0000${assignable.poolId}`
        const group = pools.get(key)
        if (group === undefined) pools.set(key, { device, members: [assignable] })
        else group.members.push(assignable)
      }
      if (!assignable.roles.includes(role)) continue
      roleVoices.push(assignable)
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
    return {
      riff,
      devices,
      notes,
      outcome: 'gap',
      gap: {
        reason: 'no-capable-voice',
        because: roleVoices.length === 0 ? 'no-such-role' : 'polyphony',
        notes: wantedNotes,
        roleVoices,
      },
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
      factoryPatch: winner.recipe.factoryPatch,
      articulation: bindArticulation(winner.recipe, riff.pattern),
      // §2.2/#86. Read off the first voice, which every member of a pool shares — a stack is one
      // pool on one device, so there is one answer rather than one per voice.
      triggerNote: triggerNoteFor(winner.recipe, winner.assignables[0]),
    },
  }
}
