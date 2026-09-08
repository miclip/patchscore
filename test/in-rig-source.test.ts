import { describe, expect, it } from 'vitest'
import {
  inRigSource,
  moodState,
  resolve,
  type Device,
  type Recipe,
  type ResolveResult,
  type RoleRequest,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { device, recipe } from './fixtures'

/**
 * §8/#487. The in-rig source pairing, tested as *derivation* rather than as prose. No renderer
 * reads it yet; when one does, the sentence it builds is asserted in `test/guide-view.test.ts`
 * with the other sibling-parity claims (#33).
 *
 * The fixture is the rig the issue was reported from and not the golden scenario, which authors
 * no `sourceAudio` at all. A sampler with a pool of tracks, a mono synth beside it, and a
 * direction asking for more parts than the synth's one voice can hold — so the kick lands on the
 * sampler, which sends the reader shopping, while the synth has an authored kick that needs
 * nothing loaded. That contention is the point: a rig where the synth were free would simply have
 * put the kick there and had nothing to say.
 */

const SAMPLER = 'A-sampler'
const SYNTH = 'B-synth'

/** The sampler's recipes all load audio; the synth's all make it. */
const sampled = (over: Partial<Recipe>): Recipe =>
  recipe({
    voice: 'track',
    sourceAudio: { need: 'a one-shot' },
    params: [],
    articulation: undefined,
    ...over,
  })

const made = (over: Partial<Recipe>): Recipe =>
  recipe({ voice: 'voice', params: [], articulation: undefined, ...over })

const sampler = (recipes: Recipe[]): Device =>
  device({
    id: SAMPLER,
    name: 'Fixture Sampler',
    kind: 'groovebox',
    voices: [
      {
        kind: 'pool',
        id: 'track',
        label: 'Track',
        count: 4,
        roles: ['kick', 'snare', 'closed-hat', 'sub'],
        polyphony: 1,
      },
    ],
    comfortableVoices: 4,
    recipes,
  })

const synth = (recipes: Recipe[]): Device =>
  device({
    id: SYNTH,
    name: 'Fixture Synth',
    kind: 'semi-modular',
    voices: [
      {
        kind: 'fixed',
        id: 'voice',
        label: 'Voice',
        // Every role it authors a recipe for, so no recipe here names a voice that cannot carry
        // it — one voice, so the contention that puts the kick on the sampler is unchanged.
        roles: ['bass-mid', 'kick', 'snare', 'closed-hat'],
        polyphony: 1,
      },
    ],
    comfortableVoices: 1,
    recipes,
  })

const SAMPLED_KICK = sampled({
  id: 'sampler-kick',
  role: 'kick',
  character: 'hard',
  title: 'Sampled kick',
})
const SAMPLED_SNARE = sampled({
  id: 'sampler-snare',
  role: 'snare',
  character: 'hard',
  title: 'Sampled snare',
})
const SAMPLED_HAT = sampled({
  id: 'sampler-hat',
  role: 'closed-hat',
  character: 'hard',
  title: 'Sampled hat',
})
const MADE_BASS = made({
  id: 'synth-bassmid',
  role: 'bass-mid',
  character: 'hard',
  title: 'Rubber bass',
})
const MADE_KICK = made({
  id: 'synth-kick',
  role: 'kick',
  character: 'hard',
  title: 'Patched analog kick',
})

const SAMPLER_RECIPES = [SAMPLED_KICK, SAMPLED_SNARE]
const SYNTH_RECIPES = [MADE_BASS, MADE_KICK]

const BASS_REQUEST: RoleRequest = {
  id: 'r-bassmid',
  role: 'bass-mid',
  priority: 1,
  character: 'hard',
  sustain: 'continuous',
}

const ROLES: RoleRequest[] = [
  BASS_REQUEST,
  { id: 'r-kick', role: 'kick', priority: 2, character: 'hard', sustain: 'continuous' },
  { id: 'r-snare', role: 'snare', priority: 3, character: 'hard', sustain: 'continuous' },
]

const TEMPLATE: Template = {
  id: 'fixture-direction',
  name: 'Fixture Direction',
  bpm: { min: 120, max: 140, default: 130 },
  keys: ['A minor'],
  structure: [{ name: 'Main', bars: 16, energy: 0.6 }],
  harmony: { cycleBars: 4, progression: [{ degree: 'i', bars: 4 }] },
  hooks: [],
  roles: ROLES,
  patterns: [],
}

const MOOD = moodState({})

const run = (devices: Device[], template: Template = TEMPLATE): ResolveResult =>
  resolve({ devices, template, mood: MOOD, seed: 3 })

const rig = (over: { sampler?: Recipe[]; synth?: Recipe[]; template?: Template } = {}) =>
  inRigSource(
    run([sampler(over.sampler ?? SAMPLER_RECIPES), synth(over.synth ?? SYNTH_RECIPES)], over.template),
  )

describe('inRigSource joins a sampled part to the box that can make it (§8/#487)', () => {
  it('holds the fixture to the shape the join needs, so a later edit cannot make it vacuous', () => {
    // The synth's one voice is taken by the bass, so the kick has nowhere to go but the sampler.
    const result = run([sampler(SAMPLER_RECIPES), synth(SYNTH_RECIPES)])
    const kick = result.assignments.find((a) => a.role === 'kick')
    expect(kick?.deviceId).toBe(SAMPLER)
    expect(kick?.recipe.sourceAudio).toBeDefined()
    expect(result.assignments.find((a) => a.role === 'bass-mid')?.deviceId).toBe(SYNTH)
  })

  it('names the part, the box it landed on, and the patch on the box that can make it', () => {
    expect(rig()).toEqual({
      role: 'kick',
      destination: { requestId: 'r-kick', deviceId: SAMPLER, deviceName: 'Fixture Sampler' },
      maker: {
        deviceId: SYNTH,
        deviceName: 'Fixture Synth',
        recipeId: 'synth-kick',
        recipeTitle: 'Patched analog kick',
      },
    })
  })

  it('reads the resolved recipe, not the role — a part that loads nothing is not a gap', () => {
    // Same rig, same assignment, with the shopping list taken off the sampler's kick.
    const { sourceAudio: _dropped, ...makesItsOwn } = SAMPLED_KICK
    expect(rig({ sampler: [makesItsOwn, SAMPLED_SNARE] })).toBeUndefined()
  })
})

describe('inRigSource pairs exactly or says nothing (invariant 5)', () => {
  it('says nothing where the other box authors no recipe for that role', () => {
    expect(rig({ synth: [MADE_BASS] })).toBeUndefined()
  })

  it('says nothing where the other box would send the reader shopping too', () => {
    const alsoSampled: Recipe = { ...MADE_KICK, sourceAudio: { need: 'a kick one-shot' } }
    expect(rig({ synth: [MADE_BASS, alsoSampled] })).toBeUndefined()
  })

  it('never answers with the box the part is already on', () => {
    // The sampler authors a kick that makes its own sound, and it is still not the answer: the
    // claim is that a *second* box can build it.
    const ownKick = made({ id: 'sampler-own-kick', role: 'kick', character: 'hard', voice: 'track' })
    expect(rig({ sampler: [...SAMPLER_RECIPES, ownKick], synth: [MADE_BASS] })).toBeUndefined()
  })

  it('says nothing at a one-box rig', () => {
    // The sampler alone carries the kick and the snare; nothing is beside it to make either.
    expect(inRigSource(run([sampler(SAMPLER_RECIPES)]))).toBeUndefined()
  })

  it('says nothing where no part was sent shopping at all', () => {
    const dry = SAMPLER_RECIPES.map(({ sourceAudio: _drop, ...rest }) => rest)
    expect(rig({ sampler: dry })).toBeUndefined()
  })
})

describe('inRigSource returns one pairing, chosen by a stated rule (§7.2/#487)', () => {
  /** A rig offering two pairings at once: the kick on priority 2, the snare on priority 3. */
  const bothRoles = {
    synth: [...SYNTH_RECIPES, made({ id: 'synth-snare', role: 'snare', character: 'hard' })],
  }

  it('prefers the kick over a pairing the direction ranked more important', () => {
    // The snare is asked for at priority 1 here and the kick at 3, so a rule that read priority
    // first would answer 'snare'.
    const roles = ROLES.map((r) =>
      r.role === 'snare' ? { ...r, priority: 1 } : r.role === 'kick' ? { ...r, priority: 3 } : r,
    )
    const template = { ...TEMPLATE, roles }
    expect(rig({ ...bothRoles, template })?.role).toBe('kick')
    // And the snare pairing really was on offer: take the synth's kick away and it is the answer.
    const noKick = bothRoles.synth.filter((r) => r.role !== 'kick')
    expect(rig({ synth: noKick, template })?.role).toBe('snare')
  })

  it('falls to the direction’s own priority where no kick is paired', () => {
    // No kick pairing: the synth authors none. Snare at 1, closed-hat at 2.
    const recipes = [
      MADE_BASS,
      made({ id: 'synth-snare', role: 'snare', character: 'hard' }),
      made({ id: 'synth-hat', role: 'closed-hat', character: 'hard' }),
    ]
    const roles: RoleRequest[] = [
      BASS_REQUEST,
      { id: 'r-snare', role: 'snare', priority: 1, character: 'hard', sustain: 'continuous' },
      { id: 'r-hat', role: 'closed-hat', priority: 2, character: 'hard', sustain: 'continuous' },
    ]
    const picked = rig({
      sampler: [SAMPLED_SNARE, SAMPLED_HAT],
      synth: recipes,
      template: { ...TEMPLATE, roles },
    })
    expect(picked?.role).toBe('snare')
    // The hat pairing was on offer beside it: swap the two priorities and it wins.
    const swapped = roles.map((r) =>
      r.role === 'snare' ? { ...r, priority: 2 } : r.role === 'closed-hat' ? { ...r, priority: 1 } : r,
    )
    expect(
      rig({
        sampler: [SAMPLED_SNARE, SAMPLED_HAT],
        synth: recipes,
        template: { ...TEMPLATE, roles: swapped },
      })?.role,
    ).toBe('closed-hat')
  })

  it('breaks a tie on the maker recipe id by code unit, never by collation', () => {
    // Two synth kicks, ids differing only by a dotted vs dotless i: by code unit `ice` < `ıce`
    // (U+0069 < U+0131) and English ICU agrees, but Turkish ICU orders `ıce` first. The same
    // trap the golden scenario sets for the search, set here for this tie-break.
    const picked = rig({
      synth: [
        MADE_BASS,
        made({ id: 'synth-kick-ıce', role: 'kick', character: 'hard', title: 'Dotless' }),
        made({ id: 'synth-kick-ice', role: 'kick', character: 'hard', title: 'Dotted' }),
      ],
    })
    expect(picked?.maker.recipeId).toBe('synth-kick-ice')
    // Both were candidates: without the dotted one the dotless is the answer, not silence.
    expect(
      rig({
        synth: [
          MADE_BASS,
          made({ id: 'synth-kick-ıce', role: 'kick', character: 'hard', title: 'Dotless' }),
        ],
      })?.maker.recipeId,
    ).toBe('synth-kick-ıce')
  })

  it('takes the earlier maker box by code unit where two of them can make the part', () => {
    // A third box, `C-synth`, authoring the same kick — and a second bass part so its one voice
    // is as busy as the first synth's. Both are makers; the id decides, and the rig is assembled
    // the other way round so a rule that took the first one found would answer `C`.
    const second = device({
      id: 'C-synth',
      name: 'Second Fixture Synth',
      kind: 'semi-modular',
      voices: [
        { kind: 'fixed', id: 'voice', label: 'Voice', roles: ['bass-mid', 'kick'], polyphony: 1 },
      ],
      comfortableVoices: 1,
      recipes: [
        made({ id: 'second-bassmid', role: 'bass-mid', character: 'hard', title: 'Second bass' }),
        made({ id: 'second-kick', role: 'kick', character: 'hard', title: 'Second kick' }),
      ],
    })
    const roles: RoleRequest[] = [
      ...ROLES,
      { id: 'r-bassmid-2', role: 'bass-mid', priority: 1, character: 'hard', sustain: 'continuous' },
    ]
    const template = { ...TEMPLATE, roles }
    const rigged = (devices: Device[]) => inRigSource(run(devices, template))
    const picked = rigged([second, sampler(SAMPLER_RECIPES), synth(SYNTH_RECIPES)])
    expect(picked?.maker.deviceId).toBe(SYNTH)
    // `C-synth` was a maker in its own right, not a box that failed the test for another reason.
    expect(rigged([second, sampler(SAMPLER_RECIPES), synth([MADE_BASS])])?.maker).toEqual({
      deviceId: 'C-synth',
      deviceName: 'Second Fixture Synth',
      recipeId: 'second-kick',
      recipeTitle: 'Second kick',
    })
  })

  it('is the same answer whichever order the rig was assembled in', () => {
    const forwards = run([sampler(SAMPLER_RECIPES), synth(SYNTH_RECIPES)])
    const backwards = run([synth(SYNTH_RECIPES), sampler(SAMPLER_RECIPES)])
    expect(inRigSource(backwards)).toEqual(inRigSource(forwards))
    expect(inRigSource(forwards)).toBeDefined()
  })
})

/**
 * §8/#487. The same join, run against the library rather than a fixture.
 *
 * #487's measurement is every two-box rig in the library, every direction, seed 3: 486 of the
 * 1,035 pairs offer at least one part the other box could make, and `kick` is the role it happens
 * to most. This module reproduces both figures exactly, which is the evidence that what it joins
 * is what was measured — but the numbers are pinned nowhere, here or elsewhere. They move with
 * every device added, and a gate on them would fail the next manifest for being new.
 *
 * What is asserted instead is that **every pick the library produces is a real pair**, checked
 * against the rig it came out of rather than against the loop that built it, and that the kick
 * preference actually holds across all of them.
 */
describe('inRigSource holds against the whole library (§8/#487)', () => {
  const mood = moodState({})

  it('produces a well-formed pair for every two-box rig it speaks about', () => {
    let spoke = 0
    let silent = 0
    let nonKick = 0
    for (const [index, first] of DEVICES.entries()) {
      for (const second of DEVICES.slice(index + 1)) {
        for (const template of TEMPLATES) {
          const result = resolve({ devices: [first, second], template, mood, seed: 3 })
          const pick = inRigSource(result)
          if (pick === undefined) {
            silent++
            continue
          }
          spoke++
          const destination = result.assignments.find(
            (a) => a.requestId === pick.destination.requestId,
          )
          // The destination is a part this guide really placed, on the box named, and it really
          // is being sent shopping.
          expect(destination?.deviceId).toBe(pick.destination.deviceId)
          expect(destination?.role).toBe(pick.role)
          expect(destination?.recipe.sourceAudio).toBeDefined()
          // The maker is another box in this rig, and its recipe needs nothing loaded.
          expect(pick.maker.deviceId).not.toBe(pick.destination.deviceId)
          const maker = result.devices.find((d) => d.id === pick.maker.deviceId)
          const patch = maker?.recipes.find((r) => r.id === pick.maker.recipeId)
          expect(patch?.role).toBe(pick.role)
          expect(patch?.sourceAudio).toBeUndefined()
          expect(patch?.title).toBe(pick.maker.recipeTitle)
          // Where it named something other than a kick, there was no kick pair to name.
          if (pick.role !== 'kick') {
            nonKick++
            const kicks = result.assignments.filter(
              (a) => a.role === 'kick' && a.recipe.sourceAudio !== undefined,
            )
            for (const kick of kicks) {
              const other = result.devices.filter((d) => d.id !== kick.deviceId)
              const made = other.some((d) =>
                d.recipes.some((r) => r.role === 'kick' && r.sourceAudio === undefined),
              )
              expect(made).toBe(false)
            }
          }
        }
      }
    }
    // The sweep is doing work in both directions: it is neither silent everywhere nor a
    // rubber stamp, and the kick preference is exercised rather than assumed.
    expect(spoke).toBeGreaterThan(0)
    expect(silent).toBeGreaterThan(0)
    expect(nonKick).toBeGreaterThan(0)
  })
})
