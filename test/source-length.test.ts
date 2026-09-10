import { describe, expect, it } from 'vitest'
import type { Device, Recipe, Role } from '../lib/core'
import { RecipeSchema } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §3/#506. **A recipe told to hold a note is fed from a file, so the file has to last that long.**
 *
 * Reported from the machine, on a Deluge running `lydian-house`: a pad printed *held for 64 steps
 * (4 bars)* on a voice that cannot hold at all. #506 has two halves and they cost very different
 * amounts. The half that needs a model change — **whether a voice can sustain** — is out of scope
 * here and stays out: there is no capability field for it, a sample in `LOOP` sustains where the
 * same box in `ONCE` does not, and a flag added to make this test pass would be the wrong shape
 * settled in a hurry.
 *
 * The half this file holds is computable from what already ships. `HookNote.len` is sustain in
 * sixteenth steps (§4.1/#142), every hook names the role it is for, and every recipe names its
 * role — so the longest hold asked of a role is a fact about `TEMPLATES` alone. Where that hold
 * is a bar or more and the recipe serving it plays a file, `sourceAudio.need` is the only place a
 * reader is told what to load, and a `need` that never mentions a length sends them looking for a
 * sound with no idea how much of one they need. That is #451 and #469's finding — *a riser is a
 * gesture with a length, and half the recipes that need a sample never say how long* — arriving
 * on held notes rather than on risers.
 *
 * ## The rule is about the fact, and since #516 the field says it
 *
 * A duration is owed because **the sound comes from a file** and the figure outlasts it. This
 * test used to carry an exclusion list of one, because `sourceAudio` was a *proxy* for that fact
 * rather than the fact: `ep40-acid-dirty` declared one and loaded nothing, since a supertone is
 * the EP–40's built-in synth engine, and demanding a duration there would have enforced a
 * sentence that could only be untrue. Nothing in the recipe's *parameters* distinguished it —
 * its whole param list is `PLAY MODE legato`, exactly what the file-fed recipes beside it set —
 * so there was no structural signal to key on and the list was the honest answer.
 *
 * **#516 built the signal.** `sourceAudio` now means a file asset the voice does not generate and
 * nothing else; selecting a sound the box already makes is `soundSetup`, a separate field. The
 * three EP–40 supertone recipes moved, `ep40-acid-dirty` among them, so the predicate below is
 * structural again and the list is gone. `ep40-lead-bright` and `ep40-sweep-bright` were in the
 * same position and outside this sweep only because no shipped hook holds `lead` or `sweep` for a
 * bar; if one ever does, they arrive already correct rather than as the false positives that
 * stalled this rule the first time.
 *
 * The count below is unchanged at 40, which is the point: the recipes that came off were never in
 * the sweep. What changed is that nobody has to remember to keep a list.
 *
 * **The threshold is one bar, and it is derived rather than listed.** Sixteen sixteenth steps is
 * the point at which a source has to be found rather than merely played, and deriving the roles
 * from the shipped hooks means a direction that later holds a `lead` for a bar pulls its recipes
 * in without anybody remembering to edit a list here. Today it yields four roles — `texture` at
 * 128 steps, `sub` at 80, `pad` at 64, `acid` at 22 — which is what #506 measured by hand.
 */

/** §4.1/#142. One bar of sixteenths: the hold at which the source becomes something to go and find. */
const HELD = 16

/**
 * A duration in this prose is a quantity paired with a unit of time or musical length. Both
 * halves are needed and neither is enough on its own: *no beat* is not a length, and *a short
 * saw tone* is a shape rather than a duration — the word a reader can act on is the one that
 * says how much. Spelled-out numbers count, because that is how the shipped `need` prose reads
 * (*two seconds or longer*, *about one bar long*, *Several seconds of a sustained sound*), and
 * the hyphen in *two- or four-bar* is a separator like a space.
 */
const QUANTITY =
  '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an|half|several|few)'
const UNIT = '(?:ms|milliseconds?|seconds?|minutes?|bars?|beats?|steps?)'
const DURATION = new RegExp(`\\b${QUANTITY}[\\s-]+${UNIT}\\b`, 'i')

/** The longest sustain any shipped hook asks of each role, in sixteenth steps. */
function longestHoldByRole(): Map<Role, number> {
  const longest = new Map<Role, number>()
  for (const template of TEMPLATES) {
    for (const hook of template.hooks) {
      for (const note of hook.notes) {
        if (note.len > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, note.len)
      }
    }
  }
  return longest
}

/** Roles some direction holds for a bar or more, so a recipe serving one needs a long enough source. */
function heldRoles(): Set<Role> {
  const held = new Set<Role>()
  for (const [role, len] of longestHoldByRole()) if (len >= HELD) held.add(role)
  return held
}

type FileFed = { device: Device; recipeId: string; role: Role; need: string }

/** Every recipe that plays a file on a role something holds. */
function fileFedOnHeldRoles(): FileFed[] {
  const roles = heldRoles()
  const out: FileFed[] = []
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      if (recipe.sourceAudio === undefined) continue
      if (!roles.has(recipe.role)) continue
      out.push({
        device,
        recipeId: recipe.id,
        role: recipe.role,
        need: recipe.sourceAudio.need,
      })
    }
  }
  return out
}

describe('a source fed to a held note says how long it has to be (#506)', () => {
  /**
   * What the targets in those recipes are worth, at the slowest tempo each direction allows —
   * seconds are what a reader can act on and steps are not, so the conversion is where the round
   * numbers come from and where they can be falsified.
   *
   *     sub      80 steps  weave, bpm.min 126        9.52 s   → ten seconds
   *     acid     22 steps  acid-lineage, bpm.min 122  2.70 s  → three seconds
   *
   * Both are worst cases over every direction holding that role, so a slower direction added
   * later moves the requirement and this arithmetic is how anybody would notice.
   */
  it('derives the held roles from the shipped hooks rather than from a list', () => {
    const longest = longestHoldByRole()
    const held = [...heldRoles()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(held).toEqual(['acid', 'pad', 'sub', 'texture'])
    // The measurements #506 reports, so a hook edit that changes them shows up here as a diff
    // rather than silently widening or narrowing what the sweep below covers.
    expect(longest.get('texture')).toBe(128)
    expect(longest.get('sub')).toBe(80)
    expect(longest.get('pad')).toBe(64)
    expect(longest.get('acid')).toBe(22)
  })

  it('reads a length out of prose, and refuses a shape wearing one', () => {
    // The two failures that would make the sweep lie. A false positive lets a silent recipe pass;
    // a false negative demands a sentence from a recipe that already has one.
    expect(DURATION.test('A sustained tonal source, two seconds or longer')).toBe(true)
    expect(DURATION.test('A sustained two- or four-bar loop whose own tempo you know')).toBe(true)
    expect(DURATION.test('Half a bar or longer, so the held step is covered')).toBe(true)
    expect(DURATION.test('Several seconds of a sustained, unchanging sound')).toBe(true)
    expect(DURATION.test('A field recording or room tone — anything with movement and no beat')).toBe(
      false,
    )
    expect(DURATION.test('A short saw or square bass tone of one known pitch')).toBe(false)
  })

  it('covers the recipes #506 measured, less the two that are not files', () => {
    // 40 rather than the issue's 42. #507 moved `deluge-pad-soft` off a file onto a built-in
    // oscillator, which is that recipe's fix and not this one's; `ep40-acid-dirty` was never a
    // file at all. Seventeen of the forty stated no duration before #517.
    expect(fileFedOnHeldRoles()).toHaveLength(40)
  })

  /**
   * §3/#516. **The exclusion list this file used to carry, as a property of the model instead.**
   *
   * The predicate above is `sourceAudio` alone with no list beside it, and that is only sound
   * while the field means one thing. It does, and not because nothing in today's library breaks
   * it: `RecipeSchema` **refuses** a recipe declaring both `sourceAudio` and `soundSetup`, since
   * the two make opposite claims about the voice. Every manifest goes through that schema at
   * import, so a recipe reaching for a built-in sound through the file field cannot be written.
   *
   * A library-wide sweep would have been the weaker claim — true of what is authored today and
   * silent about tomorrow, which is exactly the shape of the exclusion list this replaced. So the
   * schema is what is asserted, and the three that moved are named to pin what came off.
   */
  it('cannot have a recipe reaching for a built-in sound through the file field', () => {
    const supertones = DEVICES.flatMap((d) =>
      d.recipes.filter((r) => r.soundSetup !== undefined).map((r) => r.id),
    ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(supertones).toEqual(['ep40-acid-dirty', 'ep40-lead-bright', 'ep40-sweep-bright'])

    // The guarantee itself, on the schema every manifest is parsed by.
    const ep40 = DEVICES.find((d) => d.id === 'te-ep-40') as Device
    const supertone = ep40.recipes.find((r) => r.id === 'ep40-acid-dirty') as Recipe
    expect(RecipeSchema.safeParse(supertone).success).toBe(true)
    const both = RecipeSchema.safeParse({
      ...supertone,
      sourceAudio: { need: 'A short, dark kick sample with no tail' },
    })
    expect(both.success).toBe(false)
    expect(JSON.stringify(both.success ? [] : both.error.issues)).toContain('never both')
  })

  it('states a duration in every one of them', () => {
    const silent = fileFedOnHeldRoles()
      .filter((r) => !DURATION.test(r.need))
      .map((r) => `${r.device.id} ${r.recipeId} (${r.role}): ${r.need}`)
    expect(silent).toEqual([])
  })
})
