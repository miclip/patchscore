import { describe, expect, it } from 'vitest'
import type { Device } from '@/lib/core'
import type { Cite, ContentNotice } from '@/lib/core'
import {
  SampleTargetSchema,
  contentNotice,
  expand,
  recipesFor,
  resolveSample,
} from '@/lib/core'
import { ROLES } from '@/lib/core/vocabulary'
import { DEVICES } from '@/lib/devices/registry.generated'
import { SAMPLE_GROUPS, SAMPLE_TARGETS, sampleTargetById, targetsInGroup } from '@/lib/samples'
import { sampleContent } from '@/lib/studio/sample-text'
import { KIT_ROLES } from '@/lib/studio/device-page'
import { box, makeRecipe } from './rigs'

/**
 * §3.8/#520. Resolving one sound against one rig, and the four honest answers.
 *
 * Fixtures assert *relative* outcomes — which box wins, which arm of the gap is reported — never a
 * cost number, for the reason `test/rigs.ts` gives about the objective: a number pins an
 * implementation and an outcome pins a decision.
 */

const rig = (...ids: string[]): readonly Device[] =>
  ids.map((id) => {
    const device = DEVICES.find((d) => d.id === id)
    if (device === undefined) throw new Error(`no device ${id}`)
    return device
  })

const target = (id: string) => {
  const found = sampleTargetById(id)
  if (found === undefined) throw new Error(`no sample target ${id}`)
  return found
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

describe('the sample catalogue (§3.8)', () => {
  it('parses every target', () => {
    for (const entry of SAMPLE_TARGETS) {
      const parsed = SampleTargetSchema.safeParse(entry)
      expect(parsed.success, `${entry.id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
    }
  })

  /**
   * The human's ruling, and the one this file exists to keep. A curated subset means somebody
   * authors and defends the omissions, and the omissions are the sounds nobody thought of.
   */
  it('covers all 23 roles, with no role left out', () => {
    const covered = new Set(SAMPLE_TARGETS.map((entry) => entry.role))
    expect(ROLES.filter((role) => !covered.has(role))).toEqual([])
  })

  it('the four groups partition ROLES — none twice, none missing', () => {
    const grouped = SAMPLE_GROUPS.flatMap((group) => group.roles)
    expect([...grouped].sort()).toEqual([...ROLES].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  /**
   * §3.6's order, copied rather than imported — `lib/samples` is authored content and
   * `device-page.ts` reaches the whole registry, so the dependency would run the wrong way. This
   * is what keeps the copy honest: a reader who has built a kit at `/devices/<id>/kit` must not
   * find the same twelve sounds in a different order here.
   */
  it('files the kit group in KIT_ROLES order', () => {
    expect(SAMPLE_GROUPS[0]?.roles).toEqual(KIT_ROLES)
  })

  it('is not one target per role: a wobble is `bass-mid` and a technique', () => {
    const wobble = target('wobble-bass')
    expect(wobble.role).toBe('bass-mid')
    expect(target('bass-note').role).toBe('bass-mid')
    // No fifth shared vocabulary (invariant 3): what makes it a wobble is the prose.
    expect(wobble.technique.length).toBeGreaterThan(1)
  })

  it('names no device anywhere in its prose (invariant 3)', () => {
    const names = DEVICES.flatMap((device) => [device.name, device.id])
    for (const entry of SAMPLE_TARGETS) {
      const prose = [entry.name, ...entry.technique].join(' ')
      for (const name of names) {
        expect(prose.includes(name), `${entry.id} names ${name}`).toBe(false)
      }
    }
  })

  it('orders the registry by group, and every target reaches one', () => {
    expect(SAMPLE_TARGETS.map((entry) => entry.id)).toEqual(
      SAMPLE_GROUPS.flatMap((group) => targetsInGroup(group).map((entry) => entry.id)),
    )
  })
})

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

describe('resolveSample against a real rig (§3.8)', () => {
  it('makes every sound in the catalogue somewhere in the whole library', () => {
    for (const entry of SAMPLE_TARGETS) {
      expect(resolveSample(entry, DEVICES).outcome, entry.id).toBe('made')
    }
  })

  /**
   * §3/#101, and the whole point of the section. A sampler playing back a file somebody else made
   * is not a box making a sound, so `sourceAudio` decides candidacy — swept over the library
   * rather than spot-checked, because one recipe slipping through is one reader told to load a
   * file when they asked how to make one.
   */
  it('never lands on a recipe that asks the reader to load audio, on any rig', () => {
    for (const device of DEVICES) {
      for (const entry of SAMPLE_TARGETS) {
        const resolution = resolveSample(entry, [device])
        if (resolution.outcome !== 'made') continue
        expect(resolution.voice.recipe.sourceAudio, `${device.id}/${entry.id}`).toBeUndefined()
      }
    }
  })

  it('carries the rig it was resolved against, so a gap can name boxes', () => {
    const devices = rig('behringer-rd-9')
    expect(resolveSample(target('kick'), devices).devices).toBe(devices)
  })

  it('every resolved value carries provenance (invariant 4)', () => {
    const resolution = resolveSample(target('kick'), DEVICES)
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.params.length).toBeGreaterThan(0)
    for (const param of resolution.voice.params) {
      expect(param.provenance.state).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Which box wins, and that it is the same one every time
// ---------------------------------------------------------------------------

/**
 * §7.1/§7.2. Two boxes that both make the sound, one of them a better fit, and the answer must not
 * depend on the order the reader ticked them in.
 *
 * `roomy` authors the exact character on a voice that claims the role first; `crowded` authors a
 * substitution and is comfortable with fewer voices than it has. The ranking is
 * `bestVoiceCandidate`'s — crowd, then character distance, then role fit.
 */
const roomy = box('fixture-roomy', {
  voices: [
    { kind: 'fixed', id: 'voice', label: 'Voice', roles: ['stab'], polyphony: 1 },
    { kind: 'fixed', id: 'spare', label: 'Spare', roles: ['stab'], polyphony: 1 },
  ],
  recipes: [makeRecipe('roomy-stab-bright', 'stab', 'bright', 'voice')],
})

const crowded = box('fixture-crowded', {
  comfortableVoices: 0,
  voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['stab'], polyphony: 1 }],
  recipes: [makeRecipe('crowded-stab-bright', 'stab', 'bright', 'voice')],
})

describe('choosing between boxes that both make the sound (§7.1)', () => {
  it('takes the box the ranking prefers, whichever order the rig arrives in', () => {
    const forwards = resolveSample(target('stab'), [roomy, crowded])
    const backwards = resolveSample(target('stab'), [crowded, roomy])
    expect(forwards.outcome).toBe('made')
    expect(backwards.outcome).toBe('made')
    if (forwards.outcome !== 'made' || backwards.outcome !== 'made') return
    // `crowded` is comfortable with no voices at all, so spending one costs it; `roomy` is not
    // charged. Crowd ranks above every other key.
    expect(forwards.voice.device.id).toBe('fixture-roomy')
    expect(backwards.voice.device.id).toBe('fixture-roomy')
  })

  it('is byte-identical across repeated resolutions of the same rig (invariant 6)', () => {
    const once = resolveSample(target('stab'), [crowded, roomy])
    const twice = resolveSample(target('stab'), [crowded, roomy])
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice))
  })

  it('separates two recipes on one voice by recipe id, never by insertion order', () => {
    const twoWays = box('fixture-two-ways', {
      voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['stab'], polyphony: 1 }],
      recipes: [
        makeRecipe('zzz-stab-bright', 'stab', 'bright', 'voice'),
        makeRecipe('aaa-stab-bright', 'stab', 'bright', 'voice'),
      ],
    })
    const resolution = resolveSample(target('stab'), [twoWays])
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.recipe.id).toBe('aaa-stab-bright')
  })
})

// ---------------------------------------------------------------------------
// Substitution is disclosed, never hidden
// ---------------------------------------------------------------------------

describe('substitution (§3.5)', () => {
  it('marks a sound resolved at a character it did not ask for', () => {
    const near = box('fixture-near', {
      voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['stab'], polyphony: 1 }],
      // The target asks for `bright`; `clean` is one axis away, inside §3.5's radius.
      recipes: [makeRecipe('near-stab-clean', 'stab', 'clean', 'voice')],
    })
    const resolution = resolveSample(target('stab'), [near])
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.character).toBe('clean')
    expect(resolution.voice.substituted).toBe(true)
  })

  it('does not mark an exact match', () => {
    const resolution = resolveSample(target('stab'), [roomy])
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.character).toBe('bright')
    expect(resolution.voice.substituted).toBe(false)
  })

  it('reports a gap rather than substituting across an opposed pair', () => {
    const opposite = box('fixture-opposite', {
      voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['acid'], polyphony: 1 }],
      // The `acid` target asks for `dirty`; `clean` is its opposite, so §3.5 excludes it.
      recipes: [makeRecipe('opposite-acid-clean', 'acid', 'clean', 'voice')],
    })
    const resolution = resolveSample(target('acid-line'), [opposite])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-recipe')
  })
})

// ---------------------------------------------------------------------------
// The four gaps
// ---------------------------------------------------------------------------

describe('the gaps, all four of them honest (invariant 5)', () => {
  it('`no-rig` for a reader who has ticked nothing', () => {
    const resolution = resolveSample(target('kick'), [])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-rig')
  })

  it('`no-capable-voice` where no voice in the rig claims the role', () => {
    // A mono synth with no drum voices. Nothing here claims `kick`.
    const resolution = resolveSample(target('kick'), rig('arturia-microfreak'))
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('no-capable-voice')
  })

  /**
   * The sampler case, and the one the section is *for*. Every one of a Digitakt's kick recipes
   * declares `sourceAudio`: the box plays a kick, it does not make one.
   */
  it('`loads-audio` where every recipe the box authors for the role wants a file', () => {
    const devices = rig('elektron-digitakt')
    const resolution = resolveSample(target('kick'), devices)
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'loads-audio') {
      throw new Error(`expected loads-audio, got ${JSON.stringify(resolution)}`)
    }
    expect(resolution.gap.voices.length).toBeGreaterThan(0)
    for (const voice of resolution.gap.voices) {
      expect(voice.roles).toContain('kick')
    }
  })

  it('asks the sampler question before character, not after', () => {
    /*
     * A voice authoring one `kick` recipe at the opposite character, with `sourceAudio` on it.
     * `scoreRecipes` would have excluded it on distance and left `no-recipe` — *dial it by ear* —
     * for somebody holding a box with nothing to dial. The answer is `loads-audio`.
     */
    const sampler = box('fixture-sampler', {
      voices: [{ kind: 'fixed', id: 'track', label: 'Track', roles: ['kick'], polyphony: 1 }],
      recipes: [
        makeRecipe('sampler-kick-soft', 'kick', 'soft', 'track', {
          sourceAudio: { need: 'a kick one-shot' },
        }),
      ],
    })
    const resolution = resolveSample(target('kick'), [sampler])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('loads-audio')
  })

  /**
   * The second `sourceAudio` question, which changes no answer in today's library — thirty-two
   * voice/role pairs author both kinds and `scoreRecipes` ranks the box's own sound first in every
   * one, because realisation decides at equal character distance. That is a fact about the library
   * rather than a guarantee: `sourceAudio` is not a ranking key, so this builds the box that would
   * break it.
   */
  it('skips a file-loading recipe that outranks the one the box makes itself', () => {
    const mixed = box('fixture-mixed', {
      voices: [{ kind: 'fixed', id: 'track', label: 'Track', roles: ['stab'], polyphony: 1 }],
      recipes: [
        // Exact character, and first by code unit — it would win on every key but this one.
        makeRecipe('aaa-stab-bright-file', 'stab', 'bright', 'track', {
          sourceAudio: { need: 'a stab one-shot' },
        }),
        makeRecipe('zzz-stab-bright-own', 'stab', 'bright', 'track'),
      ],
    })
    const resolution = resolveSample(target('stab'), [mixed])
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.recipe.id).toBe('zzz-stab-bright-own')
  })

  it('`no-recipe` where the box claims the role and nothing near this character is authored', () => {
    const resolution = resolveSample(target('bass-note'), rig('behringer-crave'))
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'no-recipe') {
      throw new Error(`expected no-recipe, got ${JSON.stringify(resolution)}`)
    }
    expect(resolution.gap.capable.length).toBeGreaterThan(0)
  })

  it('prefers a box that makes the sound over one that only plays it', () => {
    // The Digitakt loads audio for every role; the Microfreak synthesises several. A rig holding
    // both must land on the Microfreak, in either order.
    const forwards = resolveSample(target('pad'), rig('arturia-microfreak', 'elektron-digitakt'))
    const backwards = resolveSample(target('pad'), rig('elektron-digitakt', 'arturia-microfreak'))
    for (const resolution of [forwards, backwards]) {
      expect(resolution.outcome).toBe('made')
      if (resolution.outcome !== 'made') continue
      expect(resolution.voice.device.id).toBe('arturia-microfreak')
    }
  })
})

// ---------------------------------------------------------------------------
// `vox-chop`, marked and never hidden
// ---------------------------------------------------------------------------

describe('the vocal chop, which one box in the library can make (#520)', () => {
  it('exactly one device synthesises a voice', () => {
    const makers = DEVICES.filter((device) =>
      device.recipes.some((r) => r.role === 'vox-chop' && r.sourceAudio === undefined),
    )
    expect(makers.map((d) => d.id)).toEqual(['arturia-microfreak'])
  })

  it('resolves on the box that can, so the exception is a fact rather than a policy', () => {
    const resolution = resolveSample(target('vocal-chop'), rig('arturia-microfreak'))
    expect(resolution.outcome).toBe('made')
    if (resolution.outcome !== 'made') return
    expect(resolution.voice.recipe.sourceAudio).toBeUndefined()
  })

  it('is `loads-audio` on a sampler — bring one, or record one — and never dropped', () => {
    const resolution = resolveSample(target('vocal-chop'), rig('elektron-digitakt'))
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('loads-audio')
  })

  it('is in the catalogue on every rig, listed and marked rather than dropped', () => {
    // The catalogue does not depend on a rig, which is the point: the list is the same length on
    // every one and the difference is what each entry says.
    expect(SAMPLE_TARGETS.map((entry) => entry.id)).toContain('vocal-chop')
    for (const devices of [[], rig('elektron-digitakt'), rig('arturia-microfreak'), DEVICES]) {
      const resolution = resolveSample(target('vocal-chop'), devices)
      expect(resolution.outcome === 'made' || resolution.gap.reason !== undefined).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// A rig holding both kinds of box
// ---------------------------------------------------------------------------

/**
 * §3.8/#520. The case the first cut of `resolveSample` got wrong, pinned at the resolver rather
 * than only through a page.
 *
 * A sampler that plays the role from a file, beside a synth whose only recipes for it are the
 * opposite character. `loads-audio` is the claim that **nothing here makes this sound**, and it is
 * false the moment one voice could — so the answer is `no-recipe`, and `capable` names the box a
 * reader can dial rather than the sampler standing next to it.
 */
describe('a rig holding both a sampler and a synth (§3.8)', () => {
  const sampler = box('fixture-sampler-rig', {
    voices: [{ kind: 'fixed', id: 'track', label: 'Track', roles: ['stab'], polyphony: 1 }],
    recipes: [
      makeRecipe('sampler-stab-bright', 'stab', 'bright', 'track', {
        sourceAudio: { need: 'a stab one-shot' },
      }),
    ],
  })
  // The `stab` target asks for `bright`; `dark` is its opposite, so §3.5 excludes it.
  const synth = box('fixture-synth-rig', {
    voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['stab'], polyphony: 1 }],
    recipes: [makeRecipe('synth-stab-dark', 'stab', 'dark', 'voice')],
  })

  it('answers `no-recipe`, not `loads-audio`, whichever order the rig arrives in', () => {
    for (const rig of [
      [sampler, synth],
      [synth, sampler],
    ]) {
      const resolution = resolveSample(target('stab'), rig)
      expect(resolution.outcome).toBe('gap')
      if (resolution.outcome !== 'gap') continue
      expect(resolution.gap.reason).toBe('no-recipe')
    }
  })

  it('names the synth’s voice and never the sampler’s', () => {
    const resolution = resolveSample(target('stab'), [sampler, synth])
    if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'no-recipe') {
      throw new Error('expected no-recipe')
    }
    expect(resolution.gap.capable.map((a) => a.deviceId)).toEqual(['fixture-synth-rig'])
  })

  it('still answers `loads-audio` where the synth is taken away', () => {
    const resolution = resolveSample(target('stab'), [sampler])
    expect(resolution.outcome).toBe('gap')
    if (resolution.outcome !== 'gap') return
    expect(resolution.gap.reason).toBe('loads-audio')
  })

  it('is the same shape on a real rig — a Digitakt beside a Crave', () => {
    const resolution = resolveSample(target('bass-note'), rig('elektron-digitakt', 'behringer-crave'))
    if (resolution.outcome !== 'gap' || resolution.gap.reason !== 'no-recipe') {
      throw new Error(`expected no-recipe, got ${JSON.stringify(resolution.outcome)}`)
    }
    expect(new Set(resolution.gap.capable.map((a) => a.deviceId))).toEqual(
      new Set(['behringer-crave']),
    )
  })
})

// ---------------------------------------------------------------------------
// What a box that plays this from a file actually ships
// ---------------------------------------------------------------------------

/**
 * §2.6/#111/#520. `sampleContent` has seven branches and `contentNotice` decides which one a box is
 * in. Only one of the seven is reachable through the library today — the Digitakt's
 * `shipped-library` — so the rest are asserted against constructed notices, which is what keeps a
 * sentence nobody can currently see from rotting.
 *
 * Each says something a reader can act on and none of them says what this library has authored.
 */
describe('sampleContent, in every state a box can be in (§2.6)', () => {
  const cite: Cite = { kind: 'manual', source: 'Fixture p.1' }

  const STATES: readonly { notice: ContentNotice; expect: string }[] = [
    { notice: { state: 'enumerable', library: 'a factory bank', evidence: cite }, expect: 'Ships a factory bank' },
    {
      notice: {
        state: 'shipped-library',
        library: 'a factory bank',
        location: 'the FACTORY folder',
        reason: 'No page lists a filename',
        evidence: cite,
      },
      expect: 'look in the FACTORY folder',
    },
    { notice: { state: 'user-supplied', evidence: cite }, expect: 'Ships no factory content' },
    {
      notice: { state: 'unknown', evidence: { kind: 'cited-against', reason: 'r', cite } },
      expect: 'a document here answers against it',
    },
    {
      notice: { state: 'unknown', evidence: { kind: 'unread', reason: 'r' } },
      expect: 'the document that would say is not in',
    },
    {
      notice: { state: 'unknown', evidence: { kind: 'unknown', reason: 'r' } },
      expect: 'the manual was read and does not say',
    },
    { notice: { state: 'unknown', evidence: undefined }, expect: 'has not been checked here' },
  ]

  it('says something for every one of the seven', () => {
    const said = new Set<string>()
    for (const state of STATES) {
      const sentence = sampleContent(state.notice)
      expect(sentence, JSON.stringify(state.notice)).toContain(state.expect)
      expect(sentence.endsWith('.'), sentence).toBe(true)
      said.add(sentence)
    }
    // Seven distinct sentences: a state that read like another would be a finding hidden inside a
    // sentence about a different one.
    expect(said.size).toBe(STATES.length)
  })

  it('never says what this library has or has not authored', () => {
    for (const state of STATES) {
      const sentence = sampleContent(state.notice).toLowerCase()
      for (const backlog of ['authored', 'recipe', 'not yet', 'coming soon', 'we have']) {
        expect(sentence, backlog).not.toContain(backlog)
      }
    }
  })

  it('is reached from a real rig for the one state the library covers', () => {
    const digitakt = rig('elektron-digitakt')[0]
    if (digitakt === undefined) throw new Error('no digitakt')
    const voice = expand(digitakt).find((a) => a.roles.includes('vox-chop'))
    if (voice === undefined) throw new Error('no vox-chop voice')
    const notice = contentNotice(digitakt, recipesFor(digitakt, voice, 'vox-chop'))
    expect(notice?.state).toBe('shipped-library')
    if (notice === undefined) return
    expect(sampleContent(notice)).toContain('look in')
  })
})
