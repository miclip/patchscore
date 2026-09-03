import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  FORMAT_VERSION,
  RESOLVER_VERSION,
  assign,
  decodeGuideInputs,
  encodeGuideInputs,
  moodState,
  renderGuide,
  resolve,
  type AssignInput,
  type Device,
  type GuideInputsV1,
  type Placement,
  type Template,
} from '../lib/core/index'
import { box, keys, makeRecipe, placement as landedOn, request, withRoles } from './rigs'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { CATALOGUE, DEFAULT_INPUTS, songOverrides } from '../lib/studio/session'
import { resolveEntry } from '../lib/studio/entry'
import { PhaseVoices } from '../components/guide/phase-voices'

/**
 * §7.5/#340. **The reader can move a part onto another box in the rig.**
 *
 * §7.1 decides which box plays which part, and before this the reader had no recourse but a
 * reroll. A placement is an *input* rather than an edit of a resolved guide — the same ruling
 * §7.4/#200 made for the clock source, and for the same reason: invariant 6 says the same inputs
 * reproduce the same bytes, so anything that changes the guide has to be something a link can
 * carry.
 *
 * Each describe block below asserts one claim the feature would be wrong without. An accepted
 * placement is honoured — the part is on that box, and the rest of the allocation gives way —
 * and it is a feasibility constraint rather than a `Score` key, which is #25's ruling. An
 * impossible one is refused and reported, never obeyed and never half-obeyed. And a permalink's
 * field order must not settle which part keeps a box, so conflicts are decided by the request's
 * priority and then by its id in code unit order.
 */

// ---------------------------------------------------------------------------
// Rigs. Small and hand-built, because every claim here is about *which* box a part landed on,
// and a fixture rig is the only one where that has an answer a reader of the test can check.
// ---------------------------------------------------------------------------

/** Two boxes that play the same two roles equally well, so only the tie-break separates them. */
function twin(id: string, name: string): Device {
  return box(id, {
    name,
    voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick', 'snare'], polyphony: 1 }],
    recipes: [
      makeRecipe(`${id}-kick`, 'kick', 'hard', 'v'),
      makeRecipe(`${id}-snare`, 'snare', 'hard', 'v'),
    ],
  })
}

const alpha = twin('alpha', 'Alpha')
const beta = twin('beta', 'Beta')

/** One voice, both roles: two parts placed here cannot both hold. */
const solo = box('solo', {
  name: 'Solo',
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick', 'snare'], polyphony: 1 }],
  recipes: [
    makeRecipe('solo-kick', 'kick', 'hard', 'v'),
    makeRecipe('solo-snare', 'snare', 'hard', 'v'),
  ],
})

/** Somewhere for a refused part to land, so "the ranking stands" has somewhere to stand. */
const spare = box('spare', {
  name: 'Spare',
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['snare'], polyphony: 1 }],
  recipes: [makeRecipe('spare-snare', 'snare', 'hard', 'v')],
})

/**
 * Two boxes that play toms, and the first has two voices — so a second tom part placed on it has
 * somewhere illegal to sit. `Tom B` authors `dirty` where the request asks for `hard`, which puts
 * its candidate below `Tom A`'s on `recipeDistance`: without that, the objective would decline
 * the illegal voice for reasons that have nothing to do with §12.6 and the test would pass on an
 * accident.
 */
const tomA = box('tom-a', {
  name: 'Tom A',
  voices: [
    { kind: 'fixed', id: 'v1', label: 'V1', roles: ['tom'], polyphony: 1 },
    { kind: 'fixed', id: 'v2', label: 'V2', roles: ['tom'], polyphony: 1 },
  ],
  recipes: [
    makeRecipe('a-tom-hard-1', 'tom', 'hard', 'v1'),
    makeRecipe('a-tom-hard-2', 'tom', 'hard', 'v2'),
  ],
})

const tomB = box('tom-b', {
  name: 'Tom B',
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['tom'], polyphony: 1 }],
  recipes: [makeRecipe('b-tom-dirty', 'tom', 'dirty', 'v')],
})

function search(devices: Device[], template: Template, placements?: Placement[]) {
  const input: AssignInput = { devices, template, mood: moodState(), seed: 1 }
  return assign(placements === undefined ? input : { ...input, placements })
}

const kickOnly = withRoles([request({ id: 'r-kick', role: 'kick' })])

// ---------------------------------------------------------------------------

describe('an accepted placement moves the part, and costs nothing (§7.5/#340, #25)', () => {
  it('puts the part on the box the reader named', () => {
    const before = search([alpha, beta], kickOnly)
    expect(landedOn(before, 'r-kick')).toBe('alpha/v')

    const after = search([alpha, beta], kickOnly, [{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(landedOn(after, 'r-kick')).toBe('beta/v')
    expect(after.placements.accepted).toEqual([{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(after.placements.refused).toEqual([])
  })

  it('does not enter the objective', () => {
    // #25's ruling, and the reason a placement must not be a `Score` key: it excludes allocations
    // rather than ranking them. The two boxes are identical, so an honoured placement that had a
    // cost would show up here as a worse vector for the same guide.
    const before = search([alpha, beta], kickOnly)
    const after = search([alpha, beta], kickOnly, [{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(after.score).toEqual(before.score)
  })

  it('fills the part, and only on the box it names', () => {
    // Both halves matter. The candidates elsewhere are gone, so it cannot land anywhere else;
    // the miss branch is gone too, so it cannot be left out instead — which would be the search
    // deciding the reader was wrong rather than honouring what they asked for.
    const result = search([alpha, beta], kickOnly, [{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(result.assignments.map((a) => [a.requestId, a.deviceId])).toEqual([['r-kick', 'beta']])
    expect(result.shortfalls).toEqual([])
  })

  it('displaces a part the direction ranks higher, and says what gave way', () => {
    // The one voice that can play either part, and the reader put the *lower* priority part on
    // it. An accepted placement is honoured, so the snare takes the voice and the kick — which
    // §4.4 ranks above it, and which the search would otherwise have filled — becomes a §7.3 gap
    // that names what is carrying its voice. That is the trade #340 asks to be visible.
    const both = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-snare', role: 'snare', priority: 2 }),
    ])
    expect(landedOn(search([solo], both), 'r-kick')).toBe('solo/v')

    const result = search([solo], both, [{ requestId: 'r-snare', deviceId: 'solo' }])
    expect(result.placements.refused).toEqual([])
    expect(landedOn(result, 'r-snare')).toBe('solo/v')
    expect(landedOn(result, 'r-kick')).toBeUndefined()
    const gap = result.shortfalls.find((s) => s.requestId === 'r-kick')
    expect(gap?.reason).toBe('no-room')
    expect(gap && 'detail' in gap ? gap.detail : '').toBe('the Solo V is carrying snare')

    // And the allocation it produced scores *worse* than the one it was not allowed to reach,
    // which is what a constraint outside `Score` looks like from the objective's side: the
    // better allocation was excluded, not outranked.
    expect(keys(result.score).misses[0]).toBe(1)
    expect(keys(search([solo], both).score).misses[0]).toBe(0)
  })

  it('is honoured even where the placed part is optional and the displaced one is not', () => {
    // §4.4's `optional` says the direction is content to lose this part. It does not say the
    // reader is, and a placement is the reader speaking — so an optional placed part still keeps
    // the voice it was put on, and a required part goes without.
    const uneven = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({
        id: 'r-snare',
        role: 'snare',
        priority: 4,
        optional: true,
        inessential: { reason: 'the fixture is still the fixture without it' },
      }),
    ])
    const result = search([solo], uneven, [{ requestId: 'r-snare', deviceId: 'solo' }])
    expect(landedOn(result, 'r-snare')).toBe('solo/v')
    expect(landedOn(result, 'r-kick')).toBeUndefined()
    expect(result.shortfalls.map((s) => s.requestId)).toEqual(['r-kick'])
  })

  it('is honoured by the greedy fallback too, where the cap sends the search (§7.1)', () => {
    // Greedy fills in request order and cannot back out of a voice, so the kick would take the
    // one voice and the placement would be printed as accepted over a guide that ignored it.
    // The placements are settled before greedy starts, for exactly that reason.
    const both = withRoles([
      request({ id: 'r-kick', role: 'kick', priority: 1 }),
      request({ id: 'r-snare', role: 'snare', priority: 2 }),
    ])
    const result = assign({
      devices: [solo],
      template: both,
      mood: moodState(),
      seed: 1,
      nodeCap: 1,
      placements: [{ requestId: 'r-snare', deviceId: 'solo' }],
    })
    expect(result.search.method).toBe('greedy')
    expect(result.search.capped).toBe(true)
    expect(landedOn(result, 'r-snare')).toBe('solo/v')
    expect(result.placements.accepted).toEqual([{ requestId: 'r-snare', deviceId: 'solo' }])
  })

  it('keeps §12.6 in the greedy fallback, where a placed request is decided out of order', () => {
    // The placed request is the *later* one, and greedy settles it before its pass — so a rule
    // that only looked at requests below the one being filled would let the earlier tom take the
    // free second voice on the box the placed tom is already on. Both toms would then be on one
    // device, which is the thing `distinct` exists to forbid.
    const toms = withRoles([
      request({ id: 'r-tom-1', role: 'tom', priority: 3, character: 'hard', distinct: true }),
      request({ id: 'r-tom-2', role: 'tom', priority: 3, character: 'hard', distinct: true }),
    ])
    const placed: Placement[] = [{ requestId: 'r-tom-2', deviceId: 'tom-a' }]
    const capped = assign({
      devices: [tomA, tomB],
      template: toms,
      mood: moodState(),
      seed: 1,
      nodeCap: 1,
      placements: placed,
    })
    expect(capped.search.method).toBe('greedy')
    expect(landedOn(capped, 'r-tom-2')).toBe('tom-a/v1')
    expect(landedOn(capped, 'r-tom-1')).toBe('tom-b/v')

    // The same answer the uncapped search gives, which is the point: the fallback is degraded in
    // how hard it looks, never in which allocations are legal.
    const exhaustive = search([tomA, tomB], toms, placed)
    expect(exhaustive.search.method).toBe('exhaustive')
    expect(landedOn(exhaustive, 'r-tom-1')).toBe(landedOn(capped, 'r-tom-1'))
    expect(landedOn(exhaustive, 'r-tom-2')).toBe(landedOn(capped, 'r-tom-2'))
  })

  it('reaches the search through `SongOverrides`, so a link can carry it', () => {
    // The field is on the overrides rather than on a view hook for §7.4/#200's reason: it changes
    // which box the guide names, so it is an input.
    const base = { devices: [alpha, beta], template: kickOnly, mood: moodState(), seed: 1 }
    expect(resolve(base).assignments.find((a) => a.requestId === 'r-kick')?.deviceId).toBe('alpha')

    const moved = resolve({
      ...base,
      overrides: { placements: [{ requestId: 'r-kick', deviceId: 'beta' }] },
    })
    expect(moved.placements.accepted).toEqual([{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(moved.assignments.find((a) => a.requestId === 'r-kick')?.deviceId).toBe('beta')
    // The placement's *effect* reaches the page, which is the half a reader holds today: the
    // guide names the box the part landed on. The report itself renders nowhere yet (§7.5).
    expect(renderGuide(moved)).toContain('Beta')
  })
})

describe('an impossible placement is refused and reported, never obeyed (§7.5/#340, §7.4/#200)', () => {
  it('ignores a request the direction does not have', () => {
    const stale = search([alpha, beta], kickOnly, [{ requestId: 'r-ghost', deviceId: 'beta' }])
    expect(stale.placements.accepted).toEqual([])
    expect(stale.placements.refused[0]?.because).toBe('unknown-request')
    // The ranking stands, whole: this is the stale-link case, and a link that names a part the
    // direction lost must resolve to the guide it would have without it.
    expect(landedOn(stale, 'r-kick')).toBe('alpha/v')
  })

  it('ignores a box that is not in the rig', () => {
    const stale = search([alpha], kickOnly, [{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(stale.placements.refused[0]?.because).toBe('device-not-in-rig')
    expect(stale.placements.refused[0]?.detail).toContain("'beta' is not one of the boxes")
    expect(landedOn(stale, 'r-kick')).toBe('alpha/v')
  })

  it('says which answer a box that cannot serve the part is giving (§7.3)', () => {
    // No voice for the role. The only one of the three where buying a box is the answer.
    const noRole = search([alpha, spare], kickOnly, [{ requestId: 'r-kick', deviceId: 'spare' }])
    expect(noRole.placements.refused[0]?.because).toBe('cannot-serve')
    expect(noRole.placements.refused[0]?.detail).toBe('your Spare has no voice that plays kick')

    // The voice plays the role and cannot sound the notes (§12.4). A different sentence, because
    // a reader told the first one goes shopping for the wrong thing.
    const chord = withRoles([request({ id: 'r-kick', role: 'kick', polyphony: 3 })])
    const tooFew = search([alpha, beta], chord, [{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(tooFew.placements.refused[0]?.detail).toBe(
      'no voice on your Beta can sound 3 notes of kick at once',
    )

    // The voice could carry it and nobody has written the recipe. Ours, and it must not read as
    // a limit of the reader's box (§3.5, #31).
    const mute = box('mute', {
      name: 'Mute',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
      recipes: [],
    })
    const unwritten = search([alpha, mute], kickOnly, [{ requestId: 'r-kick', deviceId: 'mute' }])
    expect(unwritten.placements.refused[0]?.because).toBe('cannot-serve')
    expect(unwritten.placements.refused[0]?.detail).toBe(
      'your Mute cannot make a hard kick',
    )
    expect(landedOn(unwritten, 'r-kick')).toBe('alpha/v')
  })

  it('refuses a box with a free voice and nowhere to load the patch (§2.3/#25)', () => {
    // The one refusal that is about the box standing *empty*: a voice is free and the budget
    // still cannot take the patch. Calling that a conflict would name a rival that is not there.
    const starved = box('starved', {
      name: 'Starved',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
      resources: [{ id: 'slot', limit: 1, label: 'sample slots' }],
      recipes: [
        makeRecipe('starved-kick', 'kick', 'hard', 'v', {
          consumes: [{ resource: 'slot', amount: 2 }],
        }),
      ],
    })
    const result = search([alpha, starved], kickOnly, [
      { requestId: 'r-kick', deviceId: 'starved' },
    ])
    expect(result.placements.accepted).toEqual([])
    expect(result.placements.refused[0]?.because).toBe('cannot-serve')
    expect(result.placements.refused[0]?.detail).toBe(
      'your Starved cannot load a patch for this part',
    )
    expect(landedOn(result, 'r-kick')).toBe('alpha/v')
  })

  it('reports a refusal as its own thing and not as a shortfall (§7.3)', () => {
    // A refused placement is not a hole in the rig: the part is made, it is simply not where it
    // was asked for. Squeezed into §7.3's three kinds it would tell a reader their track is
    // missing something they can hear.
    const result = search([alpha, beta], kickOnly, [{ requestId: 'r-kick', deviceId: 'nope' }])
    expect(result.placements.refused).toHaveLength(1)
    expect(result.shortfalls).toEqual([])
    expect(landedOn(result, 'r-kick')).toBe('alpha/v')
  })
})

describe('conflicts are settled by the direction, never by the link (§7.5/#340)', () => {
  const both = withRoles([
    request({ id: 'r-kick', role: 'kick', priority: 1 }),
    request({ id: 'r-snare', role: 'snare', priority: 2 }),
  ])

  /** Both placed on the one-voice box, in each of the two orders a link could carry them. */
  const asked: Placement[] = [
    { requestId: 'r-kick', deviceId: 'solo' },
    { requestId: 'r-snare', deviceId: 'solo' },
  ]

  it('gives the box to the more important part and refuses the other', () => {
    const result = search([solo, spare], both, asked)
    expect(result.placements.accepted).toEqual([{ requestId: 'r-kick', deviceId: 'solo' }])
    expect(result.placements.refused).toEqual([
      {
        requestId: 'r-snare',
        deviceId: 'solo',
        because: 'conflicted',
        detail: 'your Solo cannot carry this as well as the kick you placed there',
      },
    ])
    // And the refused part is filled by the ranking rather than dropped: a placement the rig
    // cannot honour costs the reader nothing.
    expect(landedOn(result, 'r-kick')).toBe('solo/v')
    expect(landedOn(result, 'r-snare')).toBe('spare/v')
  })

  it('answers the same whichever order the link wrote them in', () => {
    const forwards = search([solo, spare], both, asked)
    const backwards = search([solo, spare], both, [...asked].reverse())
    expect(backwards.placements).toEqual(forwards.placements)
    expect(landedOn(backwards, 'r-kick')).toBe(landedOn(forwards, 'r-kick'))
    expect(landedOn(backwards, 'r-snare')).toBe(landedOn(forwards, 'r-snare'))
  })

  it('breaks a tie in priority on the request id, by code unit', () => {
    // Two parts of equal priority contending for one voice. The objective cannot separate them —
    // the seed permutes among exactly equal costs (§7.2) — so the rule has to come from
    // somewhere stable, and the request id is the only thing left that a link cannot reorder.
    const level = withRoles([
      request({ id: 'r-a', role: 'snare', priority: 2 }),
      request({ id: 'r-b', role: 'snare', priority: 2 }),
    ])
    const tied: Placement[] = [
      { requestId: 'r-b', deviceId: 'solo' },
      { requestId: 'r-a', deviceId: 'solo' },
    ]
    for (const order of [tied, [...tied].reverse()]) {
      const result = search([solo, spare], level, order)
      expect(result.placements.accepted).toEqual([{ requestId: 'r-a', deviceId: 'solo' }])
      expect(result.placements.refused.map((r) => r.requestId)).toEqual(['r-b'])
      expect(landedOn(result, 'r-a')).toBe('solo/v')
      expect(landedOn(result, 'r-b')).toBe('spare/v')
    }
  })

  it('treats one part placed on two boxes as one statement and a conflict', () => {
    const twice: Placement[] = [
      { requestId: 'r-kick', deviceId: 'beta' },
      { requestId: 'r-kick', deviceId: 'alpha' },
    ]
    for (const order of [twice, [...twice].reverse()]) {
      const result = search([alpha, beta], kickOnly, order)
      // `alpha` wins on code unit, which is a rule about the ids and not about the array.
      expect(result.placements.accepted).toEqual([{ requestId: 'r-kick', deviceId: 'alpha' }])
      expect(result.placements.refused[0]).toEqual({
        requestId: 'r-kick',
        deviceId: 'beta',
        because: 'conflicted',
        detail: 'this part is already placed on your Alpha',
      })
    }
  })

  it('says the same thing twice as once', () => {
    const said: Placement[] = [
      { requestId: 'r-kick', deviceId: 'beta' },
      { requestId: 'r-kick', deviceId: 'beta' },
    ]
    const result = search([alpha, beta], kickOnly, said)
    expect(result.placements.accepted).toEqual([{ requestId: 'r-kick', deviceId: 'beta' }])
    expect(result.placements.refused).toEqual([])
  })

  it('keeps a placement that a §12.6 `distinct` rule puts in the way of a later one', () => {
    // Two toms that must sit on different boxes, both placed on the one box that plays toms.
    // The rule is the template's, and it decides the second placement rather than the first.
    const golden = {
      devices: GOLDEN_DEVICES,
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    }
    const result = resolve({
      ...golden,
      overrides: {
        placements: [
          { requestId: 'r-tom-2', deviceId: 'a-drum' },
          { requestId: 'r-tom-1', deviceId: 'a-drum' },
        ],
      },
    })
    expect(result.placements.accepted).toEqual([{ requestId: 'r-tom-1', deviceId: 'a-drum' }])
    expect(result.placements.refused[0]?.requestId).toBe('r-tom-2')
    expect(result.placements.refused[0]?.because).toBe('conflicted')
    expect(result.assignments.find((a) => a.requestId === 'r-tom-1')?.deviceId).toBe('a-drum')
  })
})

describe('a guide that places nothing resolves exactly as it did (invariant 6)', () => {
  const base = {
    devices: GOLDEN_DEVICES,
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  }

  it('leaves `RESOLVER_VERSION` where it was', () => {
    // §7's rule is that the stamp tracks the engine: a bump says a link's *own* inputs now
    // resolve to different bytes. #340 widens the input set instead, exactly as #161 did — a link
    // carrying no placement could not have been written by a build that had no field to write it
    // in. `FORMAT_VERSION` is the stamp that moves when the encoding lands.
    expect(RESOLVER_VERSION).toBe(6)
  })

  it('renders byte for byte the same with no placements, and none asked for', () => {
    const untouched = renderGuide(resolve(base))
    expect(renderGuide(resolve({ ...base, overrides: {} }))).toBe(untouched)
    expect(renderGuide(resolve({ ...base, overrides: { placements: [] } }))).toBe(untouched)
  })

  it('adds the refusal block and nothing else, for a link whose placements all failed', () => {
    // The ranking stands when every placement is refused, so every *other* byte of the guide
    // stands with it. Before #340 phase 2 this asserted the whole document was identical, which
    // was the same claim in a world where the report rendered nowhere. Cutting the block back out
    // is what is left of it, and it is the stronger half: the refusals are additive, and a
    // refused placement cannot quietly move a part.
    const untouched = renderGuide(resolve(base))
    const stale = resolve({
      ...base,
      overrides: {
        placements: [
          { requestId: 'r-ghost', deviceId: 'a-drum' },
          { requestId: 'r-kick', deviceId: 'a-machine-you-sold' },
          { requestId: 'r-kick', deviceId: 'A-cascade' },
        ],
      },
    })
    expect(stale.placements.accepted).toEqual([])
    expect(stale.placements.refused.map((r) => r.because)).toEqual([
      'cannot-serve',
      'device-not-in-rig',
      'unknown-request',
    ])

    const md = renderGuide(stale)
    expect(md).not.toBe(untouched)
    const from = md.indexOf('### Placements not applied')
    const to = md.indexOf('### Gaps')
    expect(from).toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    expect(md.slice(0, from) + md.slice(to)).toBe(untouched)
  })

  it('reports empty rather than absent, for a guide that placed nothing', () => {
    expect(resolve(base).placements).toEqual({ accepted: [], refused: [] })
  })
})

describe('a link carries placements all the way to the guide (§7.5/#340, §8.2)', () => {
  it('hands them to the resolver, or the field would round-trip and change nothing', () => {
    // `songOverrides` is the one place both renderers turn link inputs into resolver overrides
    // (#33), so a placement that stopped here would survive every codec test and still do nothing.
    expect(songOverrides(DEFAULT_INPUTS).placements).toBeUndefined()
    const placed = {
      ...DEFAULT_INPUTS,
      placements: [{ requestId: 'r-kick', deviceId: DEFAULT_INPUTS.devices[0] as string }],
    }
    expect(songOverrides(placed).placements).toEqual(placed.placements)
  })

  it('honours what it can and reports the stale, end to end from the query string', () => {
    const rig = ['roland-tr-8s', 'polyend-tracker-mini']
    const inputs: GuideInputsV1 = {
      version: FORMAT_VERSION,
      devices: rig,
      templateId: 'industrial-techno',
      inspirations: [],
      seed: 9,
      placements: [
        // Honoured: §7.1 puts the kick on the Tracker Mini here.
        { requestId: 'r-kick', deviceId: 'roland-tr-8s' },
        // A part this direction does not have, from a link written against another one.
        { requestId: 'r-ghost', deviceId: 'roland-tr-8s' },
        // A box this build ships that this link's rig does not select — the box was sold, or
        // the link was hand-edited. Decodable, refused, reported (§7.4/#200's precedent).
        { requestId: 'r-sub', deviceId: 'moog-minitaur' },
      ],
    }

    const decoded = decodeGuideInputs(encodeGuideInputs(inputs, CATALOGUE), CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return

    const result = resolveEntry(decoded.inputs)
    expect(result).toBeDefined()
    if (result === undefined) return

    expect(result.placements.accepted).toEqual([
      { requestId: 'r-kick', deviceId: 'roland-tr-8s' },
    ])
    expect(result.assignments.find((a) => a.requestId === 'r-kick')?.deviceId).toBe('roland-tr-8s')
    expect(result.placements.refused.map((one) => [one.requestId, one.because])).toEqual([
      ['r-sub', 'device-not-in-rig'],
      ['r-ghost', 'unknown-request'],
    ])
    // A refusal is reported as a refusal and never as a hole in the rig (§7.3).
    expect(result.shortfalls.map((one) => one.requestId)).not.toContain('r-ghost')
    // What the sub lost, it lost to the *accepted* placement rather than to its own refusal: the
    // kick took the TR-8S voice it was using. That much a reader can see today, because a
    // shortfall is rendered where the placement report is not (§7.5, phase 1).
    expect(result.shortfalls.map((one) => one.requestId)).toContain('r-sub')
  })
})

/**
 * §7.5/#340 phase 2, and §8's two renderers. **The report is shown, not merely computed.**
 *
 * A refused placement that renders nowhere is a reader wondering why the part they moved is on
 * the wrong box, and that is the one question the resolver already has an answer for. Both
 * guides carry the four refusals under one neutral heading, above the gaps rather than among
 * them: the part is in the list right above it, so filing it under `Gaps` would tell somebody
 * their track is missing a part they can hear.
 *
 * The two vocabularies are written out twice, as every sentence in this tree is (#33). What they
 * share is `PLACEMENT_REFUSALS` — both tables are keyed by the union, so a fifth kind is a
 * compile error in both rather than a line that quietly says nothing in one of them.
 */
describe('a refused placement is rendered in both guides (§7.5/#340, §8)', () => {
  const golden = {
    devices: GOLDEN_DEVICES,
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  }
  const deviceById = new Map(GOLDEN_DEVICES.map((d) => [d.id, d]))

  const view = (result: ReturnType<typeof resolve>) =>
    renderToStaticMarkup(createElement(PhaseVoices, { result, deviceById }))

  /** Markup back to prose, so an assertion reads as the sentence the reader sees. */
  const plain = (html: string) =>
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')

  /** One guide carrying all four refusals, and an accepted placement to cause the conflict. */
  const everything = resolve({
    ...golden,
    overrides: {
      placements: [
        // Honoured, and the reason the next line cannot be: the Golden Drum has one tom voice.
        { requestId: 'r-tom-1', deviceId: 'a-drum' },
        { requestId: 'r-tom-2', deviceId: 'a-drum' },
        // The Cascade plays bass-mid and lead, and no drum.
        { requestId: 'r-kick', deviceId: 'A-cascade' },
        // A box this rig does not have.
        { requestId: 'r-sub', deviceId: 'a-machine-you-sold' },
        // A part this direction does not have.
        { requestId: 'r-ghost', deviceId: 'a-drum' },
      ],
    },
  })

  it('produces one of each refusal, which is what the rest of this block reads', () => {
    expect(everything.placements.accepted).toEqual([{ requestId: 'r-tom-1', deviceId: 'a-drum' }])
    expect([...everything.placements.refused].map((one) => one.because).sort()).toEqual([
      'cannot-serve',
      'conflicted',
      'device-not-in-rig',
      'unknown-request',
    ])
  })

  it('says all four in the Markdown guide, each with the resolver’s own sentence', () => {
    const md = renderGuide(everything)
    expect(md).toContain('### Placements not applied')
    // The part and the box it was asked for, on every line, whether or not the sentence names them.
    for (const one of everything.placements.refused) {
      expect(md).toContain(`- \`${one.requestId}\` → \`${one.deviceId}\` — ${one.detail},`)
    }
    // And the four sentences, whole.
    expect(md).toContain(
      "this direction has no part called 'r-ghost', so nothing was moved; the link is older " +
        'than this direction, or was typed by hand',
    )
    expect(md).toContain(
      "'a-machine-you-sold' is not one of the boxes in this rig, so nothing was moved; tick " +
        'that box in the picker and ask for it again',
    )
    expect(md).toContain(
      'your Golden Cascade has no voice that plays kick, so this part is where the ranking put ' +
        'it instead',
    )
    expect(md).toContain(
      'your Golden Drum cannot carry this as well as the tom you placed there, so this one gave ' +
        'way and is where the ranking put it instead',
    )
  })

  it('says all four in the web guide, in its own words and the same facts', () => {
    const html = view(everything)
    expect(html).toContain('Placements not applied')
    const text = plain(html)
    for (const one of everything.placements.refused) {
      expect(text).toContain(one.requestId)
      expect(text).toContain(one.deviceId)
      // Verbatim: the sentence the resolver wrote about this rig, not a paraphrase of it.
      expect(text).toContain(one.detail)
    }
    expect(text).toContain(
      "this direction has no part called 'r-ghost', so nothing moved; this link is older than " +
        'the direction, or was typed by hand',
    )
    expect(text).toContain(
      "'a-machine-you-sold' is not one of the boxes in this rig, so nothing moved; tick that " +
        'box in the picker and ask for it again',
    )
    expect(text).toContain(
      'your Golden Cascade has no voice that plays kick — this part is where the ranking put it ' +
        'instead',
    )
    expect(text).toContain(
      'your Golden Drum cannot carry this as well as the tom you placed there — this one gave ' +
        'way, and is where the ranking put it',
    )
  })

  it('keeps a refusal out of the gaps, where it would read as a hole in the rig (§7.3)', () => {
    const md = renderGuide(everything)
    expect(md.indexOf('### Placements not applied')).toBeLessThan(md.indexOf('### Gaps'))
    const html = view(everything)
    expect(html.indexOf('Placements not applied')).toBeLessThan(html.indexOf('Gaps'))
    // `r-ghost` is not a part of this direction at all, so nothing may report it as missing.
    expect(everything.shortfalls.map((one) => one.requestId)).not.toContain('r-ghost')
  })

  it('draws nothing at all when no placement was asked for, in either renderer', () => {
    const untouched = resolve(golden)
    expect(untouched.placements.refused).toEqual([])
    expect(renderGuide(untouched)).not.toContain('Placements not applied')
    // The Markdown claim is pinned harder than this by the golden files, which are committed
    // bytes and are unchanged by #340 phase 2.
    const html = view(untouched)
    expect(html).not.toContain('Placements not applied')
    expect(html).toBe(view(resolve({ ...golden, overrides: { placements: [] } })))
  })

  /**
   * §7.5's `cannot-serve` is one refusal standing for four different answers (#329/#334), and
   * the renderers must not flatten them: "buy a box", "stack it by hand", "we owe you a recipe"
   * and "the box is full" send a reader four different places. Each is asserted verbatim,
   * because a renderer that re-derived which one applied would be a second opinion on a question
   * the resolver has already answered.
   */
  describe('the four cannot-serve answers reach both guides whole', () => {
    const withPlacement = (devices: Device[], template: Template, one: Placement) =>
      resolve({
        devices,
        template,
        mood: moodState(),
        seed: 1,
        overrides: { placements: [one] },
      })

    const mute = box('mute', {
      name: 'Mute',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
      recipes: [],
    })
    const starved = box('starved', {
      name: 'Starved',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
      resources: [{ id: 'slot', limit: 1, label: 'sample slots' }],
      recipes: [
        makeRecipe('starved-kick', 'kick', 'hard', 'v', {
          consumes: [{ resource: 'slot', amount: 2 }],
        }),
      ],
    })
    const chord = withRoles([request({ id: 'r-kick', role: 'kick', polyphony: 3 })])

    const cases: ReadonlyArray<readonly [string, ReturnType<typeof resolve>, string]> = [
      [
        'no voice for the role — the one case where buying a box is the answer',
        withPlacement([alpha, spare], kickOnly, { requestId: 'r-kick', deviceId: 'spare' }),
        'your Spare has no voice that plays kick',
      ],
      [
        'the voice plays it and cannot sound the chord (§12.4)',
        withPlacement([alpha, beta], chord, { requestId: 'r-kick', deviceId: 'beta' }),
        'no voice on your Beta can sound 3 notes of kick at once',
      ],
      [
        'ours to fix, and it must not read as a limit of the reader’s box (§3.5)',
        withPlacement([alpha, mute], kickOnly, { requestId: 'r-kick', deviceId: 'mute' }),
        'your Mute cannot make a hard kick',
      ],
      [
        'a free voice and nowhere to load the patch (§2.3/#25)',
        withPlacement([alpha, starved], kickOnly, { requestId: 'r-kick', deviceId: 'starved' }),
        'your Starved cannot load a patch for this part',
      ],
    ]

    for (const [what, result, detail] of cases) {
      it(`says ${what}`, () => {
        expect(result.placements.refused[0]?.because).toBe('cannot-serve')
        expect(result.placements.refused[0]?.detail).toBe(detail)
        expect(renderGuide(result)).toContain(
          `${detail}, so this part is where the ranking put it instead`,
        )
        const html = renderToStaticMarkup(
          createElement(PhaseVoices, {
            result,
            deviceById: new Map(result.devices.map((d) => [d.id, d])),
          }),
        )
        expect(plain(html)).toContain(`${detail} — this part is where the ranking put it instead`)
      })
    }
  })
})
