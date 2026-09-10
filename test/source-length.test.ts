import { describe, expect, it } from 'vitest'
import type { Device, Recipe, Role, SourcePlayback } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'

/**
 * §3/#506/#518. **A recipe told to hold a note is fed from a file, so the file has to last that
 * long — and this file now checks the number rather than the sentence.**
 *
 * Reported from the machine, on a Deluge running `lydian-house`: a pad printed *held for 64 steps
 * (4 bars)* on a voice that cannot hold at all. #506 asked for a source that covers the hold;
 * #517 wrote a sentence into the seventeen recipes that said nothing; #518 found that a stated
 * duration is not a sufficient one and that no reading of the prose could tell the two apart.
 *
 * ## What this file used to be, and why it was not enough
 *
 * A regex over `sourceAudio.need`, asserting only that a duration was *stated*. It passed
 * `mpc-texture-soft`'s *two seconds or longer* against a `texture` held for 32 seconds, and it
 * passed `tr8s-pad-soft`'s *about one bar long* against a `pad` held for four bars — because both
 * say something. Four separate readings of that prose produced four wrong counts (#516, #517 and
 * #518 twice): the durations were spelled *"ten seconds or longer"*, *"a second or two"*,
 * *"Several seconds"* and *"a sustained two- or four-bar loop"*, and a parser that handled one
 * shape missed the others.
 *
 * **The prose route is gone.** `sourceAudio.minimumSeconds` is a number and
 * `sourceAudio.playback` says what makes the file last, so the rule below is arithmetic against
 * `TEMPLATES` with nothing to read.
 *
 * ## The rule
 *
 * For every recipe that plays a file on a role some shipped hook holds for a bar or more:
 *
 *  - `boundary: 'loops'` **passes**. The voice brings the file round again, so its length is a
 *    question of a clean loop point rather than of covering the hold.
 *  - `boundary: 'stops-at-end'` **requires** `minimumSeconds >= required`. The file is the hold.
 *  - an evidenced `timing: 'stretches'` with **no** `stops-at-end` beside it passes: the file is
 *    fitted to a musical length, so its own length is a starting point. Where a recipe declares
 *    both — `dt2-sub-dark` is the library's only one — the stop wins and the minimum is required,
 *    because Repitch fits the file to a `BARS` that recipe does not set.
 *  - anything else requires a sufficient `minimumSeconds`. That covers the three EP legato parts,
 *    whose mirrored guide does not establish what happens at the end of the file: an unestablished
 *    boundary is not a rescue, and the conservative answer is the number.
 *
 * **What this does not check is #506's other half.** A looping file is not a sustaining part —
 * every Elektron loop entry is *"constrained by the AMP page envelope parameters HLD and DEC"*,
 * and `rytm-texture-soft` fixes `HLD 110`. Whether the voice holds for the whole note is a
 * separate fact that nothing in the model states yet, and #506 stays open for it.
 */

/** §4.1/#142. One bar of sixteenths: the hold at which the source becomes something to go and find. */
const HELD = 16

/** Sixteenth steps per minute at a given tempo: four per beat. */
function secondsFor(steps: number, bpm: number): number {
  return (steps * 60) / (bpm * 4)
}

/**
 * The worst case each held role faces: the longest sustain any shipped hook asks of it, at the
 * slowest tempo any direction carrying such a hook allows.
 *
 * Both halves come from `TEMPLATES` and neither is listed here, so a direction added with a slower
 * floor or a longer hold moves the requirement and the assertions below say so.
 */
function requiredSeconds(): Map<Role, number> {
  const longest = new Map<Role, number>()
  for (const template of TEMPLATES) {
    for (const hook of template.hooks) {
      for (const note of hook.notes) {
        if (note.len < HELD) continue
        const seconds = secondsFor(note.len, template.bpm.min)
        if (seconds > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, seconds)
      }
    }
  }
  return longest
}

type FileFed = { device: Device; recipe: Recipe; role: Role; required: number }

/** Every recipe that plays a file on a role something holds for a bar or more. */
function fileFedOnHeldRoles(): FileFed[] {
  const required = requiredSeconds()
  const out: FileFed[] = []
  for (const device of DEVICES) {
    for (const recipe of device.recipes) {
      if (recipe.sourceAudio === undefined) continue
      const seconds = required.get(recipe.role)
      if (seconds === undefined) continue
      out.push({ device, recipe, role: recipe.role, required: seconds })
    }
  }
  return out
}

/**
 * §3/#518. Why this recipe's source may be shorter than the hold, or `undefined` if nothing
 * rescues it and the number has to.
 */
function rescue(playback: SourcePlayback | undefined): 'loops' | 'stretches' | undefined {
  if (playback === undefined) return undefined
  if (playback.boundary?.kind === 'loops') return 'loops'
  // A stop-at-end claim beats a stretch: `dt2-sub-dark` records both, and what a reader is left
  // holding is a file that plays once through at whatever length Repitch gave it.
  if (playback.boundary?.kind === 'stops-at-end') return undefined
  if (playback.timing?.kind === 'stretches') return 'stretches'
  return undefined
}

describe('a source fed to a held note is long enough for it (#506/#518)', () => {
  /**
   * The four requirements, computed rather than listed, and pinned so that a hook or a tempo floor
   * moving shows up here as a diff instead of silently relaxing every recipe below.
   *
   *     texture  128 steps  drone-study   60 bpm   32.00 s
   *     sub       80 steps  weave        126 bpm    9.52 s
   *     pad       64 steps  ambient-dub  108 bpm    8.89 s
   *     acid      22 steps  acid-lineage 122 bpm    2.70 s
   */
  it('derives the held roles and their worst case from the shipped directions', () => {
    const required = requiredSeconds()
    const roles = [...required.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(roles).toEqual(['acid', 'pad', 'sub', 'texture'])
    expect(required.get('texture')).toBeCloseTo(32.0, 2)
    expect(required.get('sub')).toBeCloseTo(9.52, 2)
    expect(required.get('pad')).toBeCloseTo(8.89, 2)
    expect(required.get('acid')).toBeCloseTo(2.7, 2)
  })

  it('covers the forty recipes #506 measured', () => {
    expect(fileFedOnHeldRoles()).toHaveLength(40)
  })

  /**
   * §3/#516. **The exclusion list this file used to carry, as a property of the model instead.**
   *
   * The predicate above is `sourceAudio` alone, and that is only sound while the field means one
   * thing. It does: `RecipeSchema` refuses a recipe declaring both `sourceAudio` and `soundSetup`,
   * so a recipe reaching for a built-in sound through the file field cannot be written.
   */
  it('cannot have a recipe reaching for a built-in sound through the file field', () => {
    const supertones = DEVICES.flatMap((d) =>
      d.recipes.filter((r) => r.soundSetup !== undefined).map((r) => r.id),
    ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(supertones).toEqual(['ep40-acid-dirty', 'ep40-lead-bright', 'ep40-sweep-bright'])
  })

  /**
   * **The rule, and the whole point of #518.** Nothing here reads a word of prose.
   */
  it('states a sufficient length wherever nothing makes the file last', () => {
    const short: string[] = []
    for (const { device, recipe, role, required } of fileFedOnHeldRoles()) {
      if (rescue(recipe.sourceAudio?.playback) !== undefined) continue
      const stated = recipe.sourceAudio?.minimumSeconds
      if (stated === undefined) {
        short.push(`${device.id} ${recipe.id} (${role}): states no length, needs ${required.toFixed(2)} s`)
      } else if (stated < required) {
        short.push(`${device.id} ${recipe.id} (${role}): states ${String(stated)} s, needs ${required.toFixed(2)} s`)
      }
    }
    expect(short).toEqual([])
  })

  /**
   * The other direction: a claim that a recipe is rescued has to be evidenced, because the whole
   * repair is that a rescue is a cited fact rather than a word somebody found in the prose.
   */
  it('backs every rescue with a citation to a page or a unit', () => {
    for (const { device, recipe } of fileFedOnHeldRoles()) {
      const playback = recipe.sourceAudio?.playback
      const why = rescue(playback)
      if (why === undefined) continue
      const claim = why === 'loops' ? playback?.boundary : playback?.timing
      expect(claim?.evidence.kind, `${device.id} ${recipe.id}`).toMatch(/^(manual|observed)$/)
      expect(claim?.evidence.source.length, `${device.id} ${recipe.id}`).toBeGreaterThan(0)
    }
  })

  /**
   * §3/#518. **Every one of the forty is answered**, one way or the other. This is the issue's
   * *done when*: a recipe either states a length that covers the worst-case hold, or is shown to
   * need less because something loops or stretches it, and the test tells those two apart without
   * reading prose.
   */
  it('answers every one of the forty', () => {
    const unanswered = fileFedOnHeldRoles()
      .filter(
        ({ recipe }) =>
          rescue(recipe.sourceAudio?.playback) === undefined &&
          recipe.sourceAudio?.minimumSeconds === undefined,
      )
      .map(({ device, recipe }) => `${device.id} ${recipe.id}`)
    expect(unanswered).toEqual([])
  })

  /**
   * §9/#518. **The thirteen minima, pinned by device and recipe.**
   *
   * Two things this catches that the rule above cannot. Lowering 32, 10, 9 or 3 to a number that
   * still passes for some *other* role would go unnoticed — the rule only compares each recipe
   * against its own role — and dropping a recipe out of the set entirely would leave the sweep
   * passing on a smaller library. #518's two named defects are in here by value: the Play+
   * texture's 32 and the TR-8S pad's 9, both of which were prose before.
   */
  it('pins every minimum the library states', () => {
    const stated = DEVICES.flatMap((d) =>
      d.recipes
        .filter((r) => r.sourceAudio?.minimumSeconds !== undefined)
        .map((r) => `${d.id} ${r.id} ${String(r.sourceAudio?.minimumSeconds)}`),
    ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(stated).toEqual([
      'elektron-digitakt dt-acid-hard 3',
      'elektron-digitakt dt-sub-dark 10',
      'elektron-digitakt-ii dt2-acid-hard 3',
      'elektron-digitakt-ii dt2-sub-dark 10',
      'polyend-play-plus pp-sub-dark 10',
      'polyend-play-plus pp-texture-soft 32',
      'polyend-tracker tr-acid-hard 3',
      'roland-sp-404mk2 sp-acid-hard 3',
      'roland-sp-404mk2 sp-sub-dark 10',
      'roland-tr-8s tr8s-pad-soft 9',
      'te-ep-133 ep133-acid-dirty 3',
      'te-ep-133 ep133-sub-dark 10',
      'te-ep-40 ep40-sub-dark 10',
    ])
  })

  /**
   * §9/#518. **All forty occurrences, by device and recipe and how each is answered.**
   *
   * The list is the report. A recipe silently dropped, re-roled or re-classified moves a line
   * here, and lowering any of the four figures moves one too, which is what #518 asks for: the
   * numbers cannot be relaxed without somebody looking at this list.
   */
  it('pins how every one of the forty is answered', () => {
    const answered = fileFedOnHeldRoles()
      .map(({ device, recipe }) => {
        const why = rescue(recipe.sourceAudio?.playback)
        const stated = recipe.sourceAudio?.minimumSeconds
        return `${device.id} ${recipe.id} ${why ?? `${String(stated)}s`}`
      })
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(answered).toEqual([
      'akai-mpc-live-iii mpc-texture-soft loops',
      'akai-mpc-one-g2 mpc-texture-soft loops',
      'akai-mpc-xl mpc-texture-soft loops',
      'elektron-analog-rytm-mkii rytm-texture-soft loops',
      'elektron-digitakt dt-acid-hard 3s',
      'elektron-digitakt dt-pad-soft loops',
      'elektron-digitakt dt-sub-dark 10s',
      'elektron-digitakt dt-texture-soft loops',
      'elektron-digitakt-ii dt2-acid-hard 3s',
      'elektron-digitakt-ii dt2-pad-soft loops',
      'elektron-digitakt-ii dt2-sub-dark 10s',
      'elektron-digitakt-ii dt2-texture-soft loops',
      'elektron-octatrack-mkii ot-acid-hard loops',
      'elektron-octatrack-mkii ot-pad-soft loops',
      'elektron-octatrack-mkii ot-sub-dark loops',
      'elektron-octatrack-mkii ot-texture-soft loops',
      'polyend-play-plus pp-sub-dark 10s',
      'polyend-play-plus pp-texture-soft 32s',
      'polyend-tracker tr-acid-hard 3s',
      'polyend-tracker tr-pad-soft loops',
      'polyend-tracker tr-sub-dark loops',
      'polyend-tracker tr-texture-soft loops',
      'polyend-tracker-mini tm-pad-soft-chord loops',
      'polyend-tracker-mini tm-sub-dark loops',
      'polyend-tracker-mini tm-texture-soft loops',
      'roland-sp-404mk2 sp-acid-hard 3s',
      'roland-sp-404mk2 sp-pad-soft loops',
      'roland-sp-404mk2 sp-sub-dark 10s',
      'roland-sp-404mk2 sp-texture-soft loops',
      'roland-tr-6s tr6s-texture-soft loops',
      'roland-tr-8s tr8s-pad-soft 9s',
      'roland-tr-8s tr8s-texture-soft loops',
      'te-ep-133 ep133-acid-dirty 3s',
      'te-ep-133 ep133-pad-soft stretches',
      'te-ep-133 ep133-sub-dark 10s',
      'te-ep-133 ep133-texture-soft stretches',
      'te-ep-40 ep40-pad-clean loops',
      'te-ep-40 ep40-pad-soft stretches',
      'te-ep-40 ep40-sub-dark 10s',
      'te-ep-40 ep40-texture-soft stretches',
    ])
  })
})
