import { z } from 'zod'
import type { Assignable, Device, Recipe, TriggerNote } from './device'
import type { SampleTargetId } from './ids'
import type { ResolvedParam } from './params'
import { quantiseDistance } from './search'
import {
  devicePoolCapacity,
  expand,
  recipesFor,
  resolveParams,
  resolvePatch,
  scoreRecipes,
  triggerNoteFor,
  type ResolvedPatchEntry,
} from './resolver'
import { CharacterSchema, NEUTRAL_MOOD, RoleSchema, type Character, type Role } from './vocabulary'
import { bestVoiceCandidate, crowdOf, type VoiceCandidate } from './voicing'

/**
 * §3.8/#520. **Sample targets: a sound to make on a box you already own, instead of a file to go
 * and find.**
 *
 * The fourth authored kind, and the smallest of the four. A `Template` is a song, an
 * `Inspiration` is a patch on somebody else's song, a `Riff` is one figure with its notes — and a
 * `SampleTarget` is **one sound, with no notes and no rhythm at all**: a kick, a metallic hit, a
 * wobble, a vocal chop. What it resolves to is a patch on the reader's own rig and the words for
 * building it, so the recording that comes out the other end is theirs.
 *
 * ---------------------------------------------------------------------------
 * Why it is not a `Riff`
 * ---------------------------------------------------------------------------
 *
 * A riff is a *figure*: a hook whose degrees resolve against a key, a grid saying where those
 * notes are struck again, a tempo range the technique lives in, and `reArticulatesHook` joining
 * the two. Every one of those would be a fiction here. A one-shot has no key to be in, no second
 * note to be re-articulated against, and no tempo — a reader records one hit and edits the tails
 * off it. Built as a `Riff` the schema would be demanding a hook with notes nobody plays and a
 * grid whose strikes are all the same strike.
 *
 * The other direction is just as clear: `RiffSchema` refuses a role that does not bear a pattern,
 * and refuses a request that is not `continuous`. A sample target covers **`pad`**, which is held
 * rather than struck, and every one of the three transitional roles. Neither of those is a riff.
 *
 * ---------------------------------------------------------------------------
 * Why it is not a kit slot
 * ---------------------------------------------------------------------------
 *
 * §3.6's kit is a *selection*: `kitRecipes` filters one device's own recipes and orders them, and
 * nothing resolves, which is exactly what lets the panel sit on a page reached with no rig. This
 * is the other shape. It starts from **a sound the reader wants** rather than from a box's
 * manifest, and it therefore has to answer *which* of their boxes makes it — which is a search
 * question, not a filter question, and the resolver's job (#520, and the human's call on it).
 *
 * The kit page is per-device by design (#478) because its rig *is* the one device in the URL.
 * This has no such excuse: it opens on the reader's whole rig.
 *
 * ---------------------------------------------------------------------------
 * What it is made of, and nothing else
 * ---------------------------------------------------------------------------
 *
 * A `Role`, a `Character` and prose. Nothing new crosses the template/device boundary and no
 * fifth shared vocabulary is added — invariant 3 is untouched. **A target names no device**, for
 * the reason a template and a riff do not: which box makes the sound is the rig's answer, given
 * by `resolveSample` and not by the author.
 *
 * **A "wobble" is `bass-mid` plus the technique that makes it one**, and that is the shape every
 * target that is not simply a role has: the vocabulary says what part of the spectrum the sound
 * occupies and the prose says what to do to it. A `wobble` role would be a genre naming itself in
 * the shared vocabulary, which is the thing invariant 3 exists to forbid.
 *
 * **Chord progressions are not here and are not coming** (#520). A progression is a musical
 * structure rather than a sound, §12.7 has just recorded what configurable harmony costs, and a
 * folder of one-shots is not where somebody goes looking for one.
 */
export type SampleTarget = {
  /** Slug, and the address this sound is reached at. Lower-case ASCII and hyphens. */
  id: SampleTargetId
  /** `Kick`, `Wobble bass` — what the sound is called, in the words a reader would use. */
  name: string
  /**
   * §1. The part of a mix this sound occupies. The whole of what the resolver reads, together
   * with `character` — and the reason a target needs no device knowledge to be authored.
   */
  role: Role
  /**
   * §3.4/§3.5. The character the recipe is scored against. A substitution within
   * `MAX_SUBSTITUTION_DISTANCE_SQ` is allowed and is **disclosed** (`SampleVoicing.substituted`),
   * because a reader told to record a dirty stab and handed a clean patch has been told something
   * untrue about the file they are about to name.
   */
  character: Character
  /**
   * **What the take has to contain**, in the words somebody would use saying it out loud. One
   * string per paragraph, prose, and the only free text a target carries.
   *
   * It is the whole reason a target exists as an authored thing rather than as a `(role,
   * character)` pair the catalogue could have generated: the pair says *what part of the mix*, and
   * this says how long to record, what to keep of the tail, where to trim, what note or tempo to
   * write down, and which second take is worth the minute it costs.
   *
   * **It says what to record and never how to synthesise it**, and that boundary is the one thing
   * an author has to hold. *How* the sound is made is the resolved recipe's answer — cited values
   * off a manual, for the box the reader actually owns — and a target that said *sweep the cutoff*
   * or *detune the partials* would be a second, uncited instruction beside the first, on a patch
   * that may have neither control. Where the two disagree a reader has no way to tell which one to
   * follow, and the one with the citation is the one that should win.
   *
   * A defining gesture may still be stated where it survives any panel: `wobble-bass` says to
   * record *movement of whatever tone control the patch gives you*, which is what makes it a
   * wobble rather than a bass note, and which names no control at all.
   *
   * **It never names a device** (invariant 3), and it never names a file to go and find. The point
   * of the whole section is that the reader is making one.
   */
  technique: string[]
}

/** `Wobble bass` → `wobble-bass`. The form a target's `id` has to take. */
export function sampleSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SampleTargetSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    role: RoleSchema,
    character: CharacterSchema,
    technique: z
      .array(z.string().min(1))
      .min(1, 'a sample target is a sound somebody has to build: say how'),
  })
  .superRefine((target, ctx) => {
    // The slug is what a reader types into an address bar and what the catalogue keys on, so the
    // two halves of the identity are checked against each other rather than left to a convention
    // two authors can disagree about. `toLowerCase`, never `toLocaleLowerCase`: a Turkish locale
    // folds `I` to a dotless `ı` and the slug would differ by machine (§7.2).
    const slug = sampleSlug(target.name)
    if (target.id !== slug) {
      ctx.addIssue({
        code: 'custom',
        message: `the id must be '${slug}', the name slugified, so the address carries the sound`,
        path: ['id'],
      })
    }
  })

// ---------------------------------------------------------------------------
// Resolution against a rig
// ---------------------------------------------------------------------------

/**
 * §3.8/§7.3/invariant 5. **Why a rig cannot make this sound**, in the four shapes that are
 * reachable — and every one of them is listed on the page rather than dropped from it.
 *
 * Deliberately not `search.ts`'s `Gap` and not `riff.ts`'s. `Gap` carries a `requestId`, a
 * `priority` and an `optional` flag, all of which are about a part *competing with other parts
 * for a rig*; `RiffGap` carries a note count, and a one-shot has one note by construction, so its
 * `polyphony` arm cannot arise here. What is left is four states a reader acts on differently:
 *
 *  - `no-rig` — nothing has been ticked. Fixed by ticking a box, and it is not a fact about the
 *    library at all. It is an arm rather than an absent session, because a page that rendered
 *    nothing would be telling a reader the sound does not exist.
 *  - `no-capable-voice` — no voice in the rig claims the role. Fixed by buying a box.
 *  - `loads-audio` — **every** voice in the rig that claims the role authors only recipes that
 *    tell the reader to go and load audio (§3/#101). The rig plays this sound; nothing in it
 *    makes one. Fixed by bringing a recording — which for `vox-chop` is the honest answer on all
 *    but one box in the library, and the reason the sound stays listed and marked rather than
 *    being quietly dropped.
 *  - `no-recipe` — some voice in the rig **can** make its own sound in this role, and nothing near
 *    this character is authored for it. Fixed by somebody writing one: *your box can do this,
 *    dial it by ear*.
 *
 * **The last two are decided over the whole rig, not one voice at a time**, and that is the
 * correction #520's first cut needed. A rig holding a sampler and a synth, where the synth's only
 * recipes for the role are the opposite character, has a box the reader can dial by ear — so
 * `loads-audio` is reserved for the rig where *nothing* can, and `no-recipe` carries the voices
 * that could. The sampler question is still asked before character, because a substitution can
 * move a reader from `bright` to `clean` and cannot turn a sampler into a synthesiser.
 */
export type SampleGap =
  | { reason: 'no-rig' }
  | { reason: 'no-capable-voice' }
  | {
      reason: 'loads-audio'
      /**
       * Every voice in the rig that claims the role. All of them load audio — that is what makes
       * it this gap rather than `no-recipe`, and it is why the list is the whole of the rig's
       * answer rather than a subset of it.
       */
      voices: readonly Assignable[]
    }
  | {
      reason: 'no-recipe'
      /**
       * The voices that make their own sound in this role and have nothing authored near this
       * character. Never empty, and **not** every capable voice: a sampler beside them is not a
       * box anybody can dial by ear, so listing it here would send a reader to the wrong box.
       */
      capable: readonly Assignable[]
    }

/** §3.8. The voice a sound landed on, and everything a reader needs to build it there. */
export type SampleVoicing = {
  device: Device
  /**
   * One voice, and there is no second one to come. A riff's voicing carries a list because a
   * chord can be spread one note per voice across a pool (§12.4/#40); a one-shot is one note, so
   * `canStackNotes` answers `false` for it by its own first line and no stack can ever be built.
   */
  assignable: Assignable
  /**
   * **Never a recipe declaring `sourceAudio`** — the whole point of the section, enforced in
   * `resolveSample` and pinned library-wide by `test/sample-session.test.ts`. A sampler playing
   * back a file somebody else made is not a box making a sound, and a surface that let one
   * through would be answering *load this* to a reader who asked *how do I make this*.
   */
  recipe: Recipe
  /** The character actually authored. **Not always the one asked for** — see `substituted`. */
  character: Character
  /** True where `character` is not the one the target asked for (§3.5). */
  substituted: boolean
  params: readonly ResolvedParam[]
  patch: readonly ResolvedPatchEntry[]
  /** §2.1. The note that plays this voice as it is, on a box addressed by note. */
  triggerNote: TriggerNote | undefined
}

/**
 * §3.8. One sound against one rig. Exactly one of the two outcomes, because "nothing here makes
 * it" and "this box makes it" are not two readings of one state.
 */
export type SampleResolution = {
  target: SampleTarget
  /**
   * The rig this was resolved against, carried exactly as `RiffResolution.devices` is and for the
   * same reason: a gap names the boxes that could not make the sound, and a renderer handed only
   * `Assignable`s would have nothing but a device *id* to print at somebody standing at a rack.
   */
  devices: readonly Device[]
} & ({ outcome: 'made'; voice: SampleVoicing } | { outcome: 'gap'; gap: SampleGap })

/**
 * §3.8/§7.1. **One sound, one rig, and no search.**
 *
 * The same shape `resolveRiff` has and for the same reason: §7.1's search exists to allocate
 * *several* parts to a rig without two of them taking the same voice, and there is one sound
 * here. So there is nothing to allocate and nothing to back-track over — the answer is the best
 * candidate, ranked by `bestVoiceCandidate`, which is §7.1's own key order for a one-part
 * assignment. **`measure:search` is untouched by this file and must stay untouched**: a sample
 * target never enters the tree it bounds.
 *
 * Three things make it simpler than a riff, and each is a fact about a one-shot rather than a
 * corner cut:
 *
 *  - **One note.** No `polyphony`, so `canCarryNotes` is satisfied by every voice that claims the
 *    role (`polyphony >= 1` always), `canStackNotes` refuses on its first line, and the two chord
 *    keys of `Cost` are zero for every candidate. There is no chord to spread and no chord sample
 *    to prefer over a real voice.
 *  - **No hook and no grid.** Nothing to resolve against a key, and no pattern for articulation
 *    to bind to.
 *  - **No mood** (§6). `NEUTRAL_MOOD` is the state where §6.1's offset is zero, which is what
 *    "the reader has not turned anything" means. So the character the target asked for is the
 *    character the recipe is scored against, exactly as for a riff.
 *
 * **`sourceAudio` is the line between making a sound and finding one** (§3/#101), and it is the
 * one thing this adds to §3.5's selection. §3.6 already draws the same line for the kit panel;
 * here it decides candidacy rather than membership, which is what makes `loads-audio` a gap worth
 * its own arm.
 *
 * **#516 is what makes that reading honest, and it changed an answer here.** The field used to
 * mean *load a file* and *select a sound the box already has* at once, so the EP–40's three
 * supertone recipes — a ten-preset synth engine reached by holding [SOUND] — counted as loading
 * audio, and the box reported `loads-audio` for `acid`, `lead` and `sweep`: *nothing in your rig
 * makes this*, said of a rig containing a synth that does. Those recipes carry `soundSetup` now
 * (§3), they reach the arms below as ordinary candidates, and a reader is offered the supertone
 * instead of being told their box cannot. `soundSetup` is deliberately **not** consulted here:
 * needing a gesture to reach a sound is not the same as not making it.
 *
 * It is asked **twice, of two different things**:
 *
 *  1. *Does this voice only ever load audio?* — of every recipe it authors for the role, before
 *     character is consulted at all. This is the one that decides `loads-audio`, and asking it
 *     first is what decides it: a substitution can move a reader from `bright` to `clean`, and it
 *     cannot turn a sampler into a synthesiser, so asking after the character filter would answer
 *     `no-recipe` — *dial it by ear* — to somebody holding a box with no oscillator to dial.
 *  2. *Which of the scored recipes may win?* — of `scoreRecipes`' **result**, taking the first
 *     entry that makes its own sound. Filtered after the sort rather than inside it, which is
 *     `stackRecipes`' own argument: removing entries from a total order cannot reorder the ones
 *     that remain, so there is one sort and one ordering to reason about.
 *
 * **The second question changes no answer in today's library, and it is not thereby redundant.**
 * Thirty-two voice/role pairs authored both kinds — the Tracker Mini's `pad` is the shape, a VAP
 * patch beside a rendered chord sample — and in every one of them `scoreRecipes` already ranks the
 * box's own sound first, because at equal character distance realisation decides and
 * `polyphonic-voice` wins. That is a fact about the library rather than a guarantee: `sourceAudio`
 * is not a ranking key and never should be one, so nothing stops a folder authoring a
 * file-loading recipe that sorts first tomorrow. `test/sample-session.test.ts` builds that box.
 *
 * **No seed, and there is nothing for one to do** (§7.2). `bestVoiceCandidate`'s order is total —
 * character distance, then role fit, then the voice's key, then the recipe's id, the last two by
 * code unit. Same rig, same bytes, on any platform (invariant 6).
 */
export function resolveSample(
  target: SampleTarget,
  devices: readonly Device[],
): SampleResolution {
  const { role, character: want } = target
  if (devices.length === 0) {
    return { target, devices, outcome: 'gap', gap: { reason: 'no-rig' } }
  }

  /** Every voice claiming the role. One note, so claiming it is the whole of carrying it. */
  const capable: Assignable[] = []
  /** Of those, the ones whose every authored recipe for the role sends the reader to a file. */
  const loadsAudio: Assignable[] = []
  /** The rest: voices that make their own sound in this role, whatever character it is at. */
  const synthesises: Assignable[] = []
  const candidates: VoiceCandidate[] = []

  for (const device of devices) {
    for (const assignable of expand(device)) {
      if (!assignable.roles.includes(role)) continue
      capable.push(assignable)
      /*
       * §3/#101. Whether this voice plays the sound only from a file, asked of **every** recipe it
       * authors for the role and deliberately not of the ones near the wanted character. A
       * substitution can move a reader from `bright` to `clean`; it cannot turn a sampler into a
       * synthesiser, so a character filter in front of this question would answer `no-recipe` —
       * *dial it by ear* — to somebody holding a box that has no oscillator to dial.
       */
      const authored = recipesFor(device, assignable, role)
      if (authored.length > 0 && authored.every((r) => r.sourceAudio !== undefined)) {
        loadsAudio.push(assignable)
        continue
      }
      synthesises.push(assignable)
      // §3.5's scoring, unchanged: opposites excluded, nearest character first, recipe id by code
      // unit under that. The one-note call, so realisation does not rank above character (§12.4).
      // Filtered *after* the sort, which is `stackRecipes`' own argument: removing entries from a
      // total order cannot reorder the ones that remain, so there is one sort to reason about.
      const best = scoreRecipes(device, assignable, role, want, 1).find(
        (x) => x.recipe.sourceAudio === undefined,
      )
      if (best === undefined) continue
      candidates.push({
        device,
        assignables: [assignable],
        recipe: best.recipe,
        character: best.recipe.character,
        crowd: crowdOf(device, 1),
        // Both zero for every candidate: one note has no chord to sample and none to spread.
        sampledChord: 0,
        stacked: 0,
        distance: quantiseDistance(best.distanceSq),
        roleFit: assignable.roles.indexOf(role),
      })
    }
  }

  if (capable.length === 0) {
    return { target, devices, outcome: 'gap', gap: { reason: 'no-capable-voice' } }
  }

  const winner = bestVoiceCandidate(candidates)
  if (winner === undefined) {
    /*
     * Over the whole rig, and in this order. `loads-audio` is a claim that **nothing here makes
     * this sound**, so one voice that could — even one with nothing authored near the character —
     * is enough to make it false, and the reader is better served by the box they can dial than
     * by the sampler beside it.
     */
    return synthesises.length > 0
      ? { target, devices, outcome: 'gap', gap: { reason: 'no-recipe', capable: synthesises } }
      : { target, devices, outcome: 'gap', gap: { reason: 'loads-audio', voices: loadsAudio } }
  }

  // Never empty — `bestVoiceCandidate` ranks what this function pushed, and every entry above
  // carries exactly one assignable.
  const assignable = winner.assignables[0] as Assignable
  return {
    target,
    devices,
    outcome: 'made',
    voice: {
      device: winner.device,
      assignable,
      recipe: winner.recipe,
      character: winner.character,
      substituted: winner.character !== want,
      // §7 step 9. One sound on one box, so the share is the whole pool. Passed rather than
      // omitted because `resolveParam` throws on a `valueFrom` it cannot answer, and this must
      // not fall over on a device that authors one.
      params: resolveParams(winner.recipe, NEUTRAL_MOOD, {
        stackWidth: 1,
        devicePartShare: devicePoolCapacity(winner.device),
      }),
      patch: resolvePatch(winner.recipe),
      triggerNote: triggerNoteFor(winner.recipe, assignable),
    },
  }
}
