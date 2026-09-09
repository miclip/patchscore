import { describe, expect, it } from 'vitest'
import type { Device } from '@/lib/core'
import { assign, moodState, realisationOf, resolveRiff } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import { RIFFS, blueMondayBass, showMeLoveOrganStab, thrillerSynthRiff } from '@/lib/riffs'
import { box, makeRecipe, withRoles } from './rigs'

/**
 * §5A/§7.3. Resolving one riff against one rig, and the three honest answers.
 *
 * Fixtures assert *relative* outcomes — which box wins, which arm of the gap is reported — never
 * a cost number, for the reason `test/rigs.ts` gives about the objective: a number pins an
 * implementation and an outcome pins a decision.
 */

const rig = (...ids: string[]): readonly Device[] =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

describe('resolveRiff against a real rig (§5A)', () => {
  it('plays every library riff somewhere in the whole catalogue', () => {
    for (const riff of RIFFS) {
      const resolution = resolveRiff(riff, DEVICES)
      expect(resolution.outcome, riff.id).toBe('played')
    }
  })

  it('resolves the notes against the riff’s own key, not against a direction’s', () => {
    const resolution = resolveRiff(blueMondayBass, DEVICES)
    expect(resolution.notes.outcome).toBe('resolved')
    if (resolution.notes.outcome !== 'resolved') return
    expect(resolution.notes.hook.key).toBe('F minor')
    // Degree 1 of F minor at `baseOctave: 2`. Spelling and MIDI both, per #32.
    expect(resolution.notes.hook.notes[0]?.note).toBe('F2')
    expect(resolution.notes.hook.notes[0]?.midi).toBe(41)
  })

  it('carries the rig it was resolved against, so a gap can name boxes', () => {
    const devices = rig('behringer-rd-9')
    expect(resolveRiff(blueMondayBass, devices).devices).toBe(devices)
  })

  it('binds articulation to the riff’s own grid, dropping slots the grid does not strike', () => {
    const resolution = resolveRiff(thrillerSynthRiff, DEVICES)
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    const struck = new Set(thrillerSynthRiff.pattern.hits.map((h) => h.slot))
    for (const bound of resolution.voice.articulation) {
      expect(struck.has(bound.slot), bound.slot).toBe(true)
      expect(bound.steps.length).toBeGreaterThan(0)
    }
  })

  it('every resolved value carries provenance (invariant 4)', () => {
    const resolution = resolveRiff(blueMondayBass, DEVICES)
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.params.length).toBeGreaterThan(0)
    for (const param of resolution.voice.params) {
      expect(param.provenance.state).toBeDefined()
    }
  })
})

describe('resolveRiff reports a gap rather than inventing one (invariant 5, §7.3)', () => {
  it('`no-such-role` where nothing in the rig plays the part at all', () => {
    const resolution = resolveRiff(blueMondayBass, rig('behringer-rd-9'))
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-capable-voice')
    if (resolution.gap.reason !== 'no-capable-voice') return
    expect(resolution.gap.because).toBe('no-such-role')
    expect(resolution.gap.roleVoices).toEqual([])
  })

  it('`polyphony` where the rig plays the part but not this wide (§12.4)', () => {
    const resolution = resolveRiff(showMeLoveOrganStab, rig('behringer-crave', 'moog-mother-32'))
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-capable-voice')
    if (resolution.gap.reason !== 'no-capable-voice') return
    // The distinction that matters: the rig *does* play `stab`, one note at a time. Told
    // `no-such-role`, a reader would buy a box they already own the equivalent of.
    expect(resolution.gap.because).toBe('polyphony')
    expect(resolution.gap.notes).toBe(3)
    expect(resolution.gap.roleVoices.length).toBeGreaterThan(0)
  })

  it('the hook still resolves when the rig cannot play it — the notes are not the rig’s to have', () => {
    const resolution = resolveRiff(blueMondayBass, rig('behringer-rd-9'))
    expect(resolution.notes.outcome).toBe('resolved')
  })

  it('`no-recipe` where a capable voice exists and nothing is authored for it', () => {
    // Built rather than found: `no-recipe` needs a voice that claims the role and authors no
    // recipe for it, which is a shape the real library is (rightly) short of.
    const bare = box('bare', {
      name: 'Bare Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['bass-mid'], polyphony: 1 }],
      recipes: [makeRecipe('bare-kick-hard', 'kick', 'hard', 'v')],
    })
    const resolution = resolveRiff(blueMondayBass, [bare])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-recipe')
    if (resolution.gap.reason !== 'no-recipe') return
    // Never empty — that is what makes it this gap rather than `no-capable-voice`.
    expect(resolution.gap.capable.length).toBeGreaterThan(0)
  })

  it('an empty rig is a gap, not a throw', () => {
    const resolution = resolveRiff(blueMondayBass, [])
    expect(resolution.outcome).toBe('gap')
  })
})

/**
 * §12.4/#40/#503. **A chord spread one note per voice across a pool.**
 *
 * The regression for the defect this file's first cut shipped: `resolveRiff` accepted a voice on
 * `canStackNotes` and then asked `resolveRecipe` for the whole chord on it, which a mono track
 * cannot answer — so a rig that plays the figure perfectly well was told `no-recipe`, *your box
 * could carry it, set it up by ear*, about a recipe that already exists.
 */
describe('resolveRiff spreads a chord across a pool (§12.4/#40)', () => {
  /** Three interchangeable **monophonic** tracks with a `polyphonic-voice` stab recipe. */
  const poolBox = () =>
    box('pool-box', {
      name: 'Pool Box',
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 3, roles: ['stab'], polyphony: 1 },
      ],
      recipes: [makeRecipe('pool-stab-bright', 'stab', 'bright', 'track')],
    })

  it('plays the three-note riff rather than reporting a gap', () => {
    const resolution = resolveRiff(showMeLoveOrganStab, [poolBox()])
    expect(resolution.outcome).toBe('played')
  })

  it('takes one voice per note, in `comparePoolMembers` order', () => {
    const resolution = resolveRiff(showMeLoveOrganStab, [poolBox()])
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.stackWidth).toBe(3)
    expect(resolution.voice.assignables.map((a) => a.label)).toEqual([
      'Track 1',
      'Track 2',
      'Track 3',
    ])
    // Lowest note to the lowest voice (§8 phase 4): the order is the instruction, not a listing.
    expect(resolution.voice.assignables.map((a) => a.ordinal)).toEqual([1, 2, 3])
  })

  it('`stackWidth` is the voices taken, which is what `resolveParams` is handed (§7 step 9)', () => {
    const resolution = resolveRiff(showMeLoveOrganStab, [poolBox()])
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.stackWidth).toBe(resolution.voice.assignables.length)
  })

  it('a pool too narrow for the chord is still a `polyphony` gap, not a short stack', () => {
    const narrow = box('narrow-box', {
      name: 'Narrow Box',
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 2, roles: ['stab'], polyphony: 1 },
      ],
      recipes: [makeRecipe('narrow-stab-bright', 'stab', 'bright', 'track')],
    })
    const resolution = resolveRiff(showMeLoveOrganStab, [narrow])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-capable-voice')
    if (resolution.gap.reason !== 'no-capable-voice') return
    expect(resolution.gap.because).toBe('polyphony')
  })

  it('a one-voice part is never stacked: one assignable, `stackWidth` 1', () => {
    const resolution = resolveRiff(blueMondayBass, rig('polyend-tracker-mini'))
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.stackWidth).toBe(1)
    expect(resolution.voice.assignables.length).toBe(1)
  })

  /**
   * §7.1's key order, which puts `stacked` *below* `sampledChord` and above character distance:
   * one voice that genuinely sounds the chord beats spreading it across three, and it beats it
   * even when the single voice needs a character substitution to get there.
   */
  it('a voice that sounds the chord itself is preferred to a stack', () => {
    const poly = box('poly-box', {
      name: 'Poly Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['stab'], polyphony: 4 }],
      recipes: [makeRecipe('poly-stab-bright', 'stab', 'bright', 'v')],
    })
    const resolution = resolveRiff(showMeLoveOrganStab, [poolBox(), poly])
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.device.id).toBe('poly-box')
    expect(resolution.voice.stackWidth).toBe(1)
  })

  it('a real pool device in the library serves the chord by stacking', () => {
    const resolution = resolveRiff(showMeLoveOrganStab, rig('polyend-tracker-mini'))
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.stackWidth).toBe(3)
  })
})

/**
 * §7.1/#503. **`resolveRiff` ranks candidates the way `assign` does, and that means `Score`'s keys
 * rather than `Cost`'s alone.**
 *
 * `Cost` carries the four keys a candidate contributes *by itself*, which is why it can be shared.
 * `crowdOverflow` is not one of them in the search, because there it is a sum over every device of
 * an assignment in progress. With one part and no other occupancy that sum collapses to the box
 * the candidate lands on, so it becomes askable — and it has to be asked, because `Score` puts it
 * **above** both chord keys and `stackedChords`' own note says that is where a stack's voice cost
 * is charged.
 *
 * Ranking on `Cost` alone shipped and was wrong in exactly one shape, pinned below.
 */
describe('resolveRiff prices the voices a candidate spends (§7.1)', () => {
  /** Three mono tracks, and the box says it is comfortable with one. A stack spends all three. */
  const stackBox = () =>
    box('stack-box', {
      name: 'Stack Box',
      comfortableVoices: 1,
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 3, roles: ['stab'], polyphony: 1 },
      ],
      recipes: [makeRecipe('stack-stab-bright', 'stab', 'bright', 'track')],
    })

  /** One voice playing the whole chord from a sample. Spends one voice, and is comfortable. */
  const sampleBox = () =>
    box('sample-box', {
      name: 'Sample Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['stab'], polyphony: 1 }],
      recipes: [
        makeRecipe('sample-stab-bright', 'stab', 'bright', 'v', { realisation: 'sampled-chord' }),
      ],
    })

  /** The same request, put to the real search as a one-request direction. */
  function assigned(devices: readonly Device[]) {
    const template = withRoles([{ ...showMeLoveOrganStab.request }])
    const result = assign({ devices: [...devices], template, mood: moodState(), seed: 1 })
    return result.assignments[0]
  }

  it('takes the one-voice chord sample over a three-voice stack on a crowded box', () => {
    const rig = [sampleBox(), stackBox()]
    const resolution = resolveRiff(showMeLoveOrganStab, rig)
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    // The stack is the better *compromise* of the two and `Cost` says so, but it spends three
    // voices on a box comfortable with one, and crowding outranks both chord keys.
    expect(resolution.voice.device.id).toBe('sample-box')
    expect(realisationOf(resolution.voice.recipe)).toBe('sampled-chord')
    expect(resolution.voice.stackWidth).toBe(1)
  })

  it('agrees with `assign` on that rig, device and realisation', () => {
    const rig = [sampleBox(), stackBox()]
    const resolution = resolveRiff(showMeLoveOrganStab, rig)
    const search = assigned(rig)
    expect(search, 'the search found no assignment').toBeDefined()
    if (resolution.outcome !== 'played' || search === undefined) return
    expect(resolution.voice.device.id).toBe(search.deviceId)
    expect(realisationOf(resolution.voice.recipe)).toBe(realisationOf(search.recipe))
    expect(resolution.voice.stackWidth).toBe(search.assignables.length)
  })

  it('still takes the stack where the box has room for it', () => {
    // The same two boxes, and the only change is that the pool says it is comfortable with three.
    // With nothing to charge, `Score`'s next key decides and the real voices win the chord.
    const roomy = box('stack-box', {
      name: 'Stack Box',
      comfortableVoices: 3,
      voices: [
        { kind: 'pool', id: 'track', label: 'Track', count: 3, roles: ['stab'], polyphony: 1 },
      ],
      recipes: [makeRecipe('stack-stab-bright', 'stab', 'bright', 'track')],
    })
    const rig = [sampleBox(), roomy]
    const resolution = resolveRiff(showMeLoveOrganStab, rig)
    const search = assigned(rig)
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played' || search === undefined) return
    expect(resolution.voice.device.id).toBe('stack-box')
    expect(resolution.voice.stackWidth).toBe(3)
    expect(resolution.voice.device.id).toBe(search.deviceId)
  })

  it('agrees with `assign` across the whole library, on every entry', () => {
    // The general claim the two fixtures above are one case of. Every riff, against a rig broad
    // enough to offer real choices, resolved both ways.
    const rig = DEVICES.filter((d) =>
      ['polyend-tracker-mini', 'moog-subsequent-37', 'elektron-digitakt-ii', 'roland-tr-8s'].includes(
        d.id,
      ),
    )
    for (const riff of RIFFS) {
      const resolution = resolveRiff(riff, rig)
      const template = withRoles([{ ...riff.request }])
      const search = assign({ devices: rig, template, mood: moodState(), seed: 1 }).assignments[0]
      expect(resolution.outcome, riff.id).toBe('played')
      expect(search, riff.id).toBeDefined()
      if (resolution.outcome !== 'played' || search === undefined) continue
      expect(resolution.voice.device.id, riff.id).toBe(search.deviceId)
      expect(resolution.voice.recipe.id, riff.id).toBe(search.recipe.id)
      expect(resolution.voice.stackWidth, riff.id).toBe(search.assignables.length)
    }
  })
})

describe('resolveRiff is deterministic and needs no seed (§7.2, invariant 6)', () => {
  it('the same rig gives the same voice however the devices are ordered', () => {
    const forward = rig('behringer-crave', 'moog-mother-32', 'moog-subsequent-37')
    const reversed = [...forward].reverse()
    const a = resolveRiff(blueMondayBass, forward)
    const b = resolveRiff(blueMondayBass, reversed)
    expect(a.outcome).toBe('played')
    if (a.outcome !== 'played' || b.outcome !== 'played') return
    expect(b.voice.device.id).toBe(a.voice.device.id)
    expect(b.voice.recipe.id).toBe(a.voice.recipe.id)
    expect(b.voice.assignables.map((x) => x.voiceId)).toEqual(a.voice.assignables.map((x) => x.voiceId))
  })

  it('two boxes that tie on character are separated by id, not by rig order', () => {
    // Two identical boxes but for their ids. Nothing about the recipes can break the tie, so the
    // code-unit comparison is the only thing left — and it must not depend on which was ticked
    // first in the picker.
    const voices = [
      { kind: 'fixed' as const, id: 'v', label: 'Voice', roles: ['bass-mid' as const], polyphony: 1 },
    ]
    const recipes = [makeRecipe('r-bass-mid-hard', 'bass-mid', 'hard', 'v')]
    const alpha = box('alpha', { name: 'Alpha', voices, recipes })
    const zulu = box('zulu', { name: 'Zulu', voices, recipes })
    for (const order of [[alpha, zulu], [zulu, alpha]]) {
      const resolution = resolveRiff(blueMondayBass, order)
      expect(resolution.outcome).toBe('played')
      if (resolution.outcome !== 'played') return
      expect(resolution.voice.device.id).toBe('alpha')
    }
  })

  it('a substitution is reported rather than hidden (§3.5)', () => {
    // §3.4. `dirty` is one axis from the `hard` the riff asks for — squared distance 2, inside
    // `MAX_SUBSTITUTION_DISTANCE_SQ` — so it substitutes rather than reporting `no-recipe`, and
    // the voicing has to say which character it actually got. `soft` would *not* do: it is
    // `hard`'s opposite, distance 4, and §3.5 refuses that rather than substituting it.
    const dirty = box('dirty-box', {
      name: 'Dirty Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['bass-mid'], polyphony: 1 }],
      recipes: [makeRecipe('dirty-bass-mid-dirty', 'bass-mid', 'dirty', 'v')],
    })
    const resolution = resolveRiff(blueMondayBass, [dirty])
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.character).toBe('dirty')
    expect(resolution.voice.substituted).toBe(true)
  })

  it('an opposed character is refused rather than substituted (§3.5)', () => {
    const soft = box('soft-box', {
      name: 'Soft Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'Voice', roles: ['bass-mid'], polyphony: 1 }],
      recipes: [makeRecipe('soft-bass-mid-soft', 'bass-mid', 'soft', 'v')],
    })
    const resolution = resolveRiff(blueMondayBass, [soft])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-recipe')
  })

  it('an exact character is not reported as a substitution', () => {
    const resolution = resolveRiff(blueMondayBass, rig('moog-subsequent-37'))
    expect(resolution.outcome).toBe('played')
    if (resolution.outcome !== 'played') return
    expect(resolution.voice.character).toBe('hard')
    expect(resolution.voice.substituted).toBe(false)
  })
})
