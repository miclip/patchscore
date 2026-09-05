import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  DENSITY_DETENTS,
  MAX_SUBSTITUTION_DISTANCE_SQ,
  STEPS_PER_BAR,
  TemplateSchema,
  bandFor,
  characterDistanceSq,
  moodState,
  parseKey,
  resolve,
  resolveHook,
  sectionsFor,
  selectPattern,
  type DensityBand,
  type Device,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, lydianHouse, relay, templateById, weave } from '../lib/templates/index'
import { coverage } from '../lib/studio/coverage'
import { directionPage, rigFits } from '../lib/studio/direction-page'
import DirectionPageRoute from '../app/directions/[id]/page'

/**
 * Lydian House and Weave: the two directions a **box with several voices** can finish, with every
 * part playing at the same time as every other one.
 *
 * `small-rig-directions.test.ts` owns the other one-box pair, and the distinction between the two
 * files is the whole reason both exist. Drone Study and Relay answer *one voice*: one asks for a
 * single part, and the other asks for two that are never sounding together, so §4.2's
 * `(assignable, section)` occupancy hands both to the same voice. Neither does anything for the
 * rig #81 was actually filed about — a groovebox with a pool of voices, holding eight parts
 * simultaneously, and being told it had four holes. Taking turns is no help to a box whose limit
 * is how many parts it can hold rather than how many notes.
 *
 * So these two take the other route, and it is not a mechanism: **every request in both is
 * `continuous`**, which means every one of them occupies every section and nothing is ever handed
 * a voice somebody else has finished with. They fit a small rig by being the right *size*, and
 * the assertions below are mostly about that size being real rather than asserted.
 *
 *  - **Lydian House** asks for seven parts — three tonal, four drums — which is the shape of a
 *    box with a handful of pitched tracks over a pool of percussion.
 *  - **Weave** asks for eight, seven of them percussion, which is the shape of a box that is
 *    mostly a drum machine. Seven is the ceiling rather than a round number, and
 *    `mc-101.test.ts` is where that ceiling is enforced from the device side.
 *
 * Outcomes and §7.3 reasons throughout, never `Score` numbers: the objective may re-order its
 * lower keys without touching what any of this says (§7.1).
 */

const NEUTRAL = moodState()
const NEW = [lydianHouse, weave] as const

function box(id: string): Device {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`${id} missing from the registry`)
  return device
}

function bandVector(template: Template, density: number): DensityBand[] {
  return template.structure.map((s) => bandFor(template, s.name, moodState({ density })))
}

function report(template: Template, devices: readonly Device[], seed = 7) {
  const result = resolve({ devices, template, mood: NEUTRAL, seed })
  return {
    filled: result.assignments.map((a) => a.requestId).sort(),
    gaps: Object.fromEntries(
      result.shortfalls
        .map((g) => [g.requestId, g.reason === 'no-room' ? `no-room/${g.because}` : g.reason])
        .sort(([a], [b]) => ((a as string) < (b as string) ? -1 : 1)),
    ),
    capped: result.search.capped,
  }
}

/** The widest chord any one step of a hook asks for. */
function widestChord(template: Template): number {
  let widest = 0
  for (const hook of template.hooks) {
    const perStep = new Map<number, number>()
    for (const note of hook.notes) perStep.set(note.step, (perStep.get(note.step) ?? 0) + 1)
    for (const count of perStep.values()) widest = Math.max(widest, count)
  }
  return widest
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe('both directions are registered and parse (§4)', () => {
  it('slots into the registry by id, in UTF-16 code unit order (§7.2)', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual([
      'acid-lineage',
      'ambient-dub',
      'breakbeat',
      'drone-study',
      'generative-drift',
      'hip-hop',
      'industrial-techno',
      'lydian-house',
      'major-key-electro',
      'relay',
      'weave',
    ])
    expect(templateById('lydian-house')).toBe(lydianHouse)
    expect(templateById('weave')).toBe(weave)
  })

  it('parses against the schema', () => {
    for (const template of NEW) {
      const parsed = TemplateSchema.safeParse(template)
      expect(parsed.error?.issues ?? [], `${template.id} failed TemplateSchema`).toEqual([])
    }
  })

  it('asks a different arrangement from every direction already here (§6.3)', () => {
    expect(bandVector(lydianHouse, DENSITY_DETENTS[1])).toEqual([0, 1, 2, 1, 3, 2, 0])
    expect(bandVector(weave, DENSITY_DETENTS[1])).toEqual([0, 1, 3, 2, 3, 1, 2, 0])
    const vectors = TEMPLATES.map((t) => bandVector(t, DENSITY_DETENTS[1]).join(''))
    expect(new Set(vectors).size).toBe(TEMPLATES.length)
  })

  it('reaches lydian, which nothing else in the registry offers', () => {
    // A key set is a claim about which chords the reader can actually play (§4.1). `II7` is a
    // major chord on the second degree with the raised fourth as its third, and no other mode
    // this library offers contains it — so offering a key without it would ask for a chord the
    // key does not have.
    expect(lydianHouse.keys.length).toBeGreaterThan(1)
    for (const key of lydianHouse.keys) expect(parseKey(key)?.mode, key).toBe('lydian')
    for (const other of TEMPLATES) {
      if (other.id === lydianHouse.id) continue
      for (const key of other.keys) expect(parseKey(key)?.mode, `${other.id} ${key}`).not.toBe('lydian')
    }
    // And the chord that argument is about is actually in the cycle, rather than being a claim
    // the progression never cashes.
    expect(lydianHouse.harmony.progression.map((p) => p.degree)).toContain('II7')
  })
})

// ---------------------------------------------------------------------------
// §4.2 / §4.4 — the claim that this is not another Relay
// ---------------------------------------------------------------------------

describe('nothing here takes turns (§4.2)', () => {
  it('makes every request continuous, where Relay makes every request transient', () => {
    // The falsifiable version of "do not write another Relay". Relay's two requests are both
    // `transient` with disjoint section sets, which is exactly what lets one voice carry both.
    // Section-scoping anything in these two would let a smaller rig pass by taking turns, and
    // the fit numbers below would then be answering Relay's question instead of this one.
    for (const request of relay.roles) expect(request.sustain, request.id).toBe('transient')
    for (const template of NEW) {
      for (const request of template.roles) {
        expect(request.sustain, `${template.id} ${request.id}`).toBe('continuous')
        expect(request.sections, `${template.id} ${request.id}`).toBeUndefined()
        // The other half: a continuous request occupies every section, so every part really is
        // sounding at the same time as every other one.
        expect(sectionsFor(request, template).length, `${template.id} ${request.id}`).toBe(
          template.structure.length,
        )
      }
    }
  })

  it('declares what each direction can be itself without, with a reason (§4.4/#81)', () => {
    // The point of the strand. A direction that declares nothing inessential is claiming it needs
    // all of its parts, and for most genres that is false — which is how a capable rig ends up
    // being told it has holes.
    const declared = (t: Template) =>
      t.roles.filter((r) => r.inessential !== undefined).map((r) => r.id)
    expect(declared(lydianHouse)).toEqual(['r-stab', 'r-open-hat', 'r-ghost-perc'])
    expect(declared(weave)).toEqual(['r-rim', 'r-open-hat', 'r-metallic'])
    for (const template of NEW) {
      for (const request of template.roles) {
        // §4.4's one-way implication, enforced by the schema and pinned here as intent: a request
        // the search need not spend a voice on is necessarily one the song survives without.
        if (request.optional === true) expect(request.inessential, request.id).toBeDefined()
        if (request.inessential !== undefined) {
          expect(request.inessential.reason.length, request.id).toBeGreaterThan(0)
        }
      }
    }
    // Both directions keep a majority essential. A list that declared everything inessential
    // would pass the rule above and mean nothing.
    for (const template of NEW) {
      const essential = template.roles.filter((r) => r.inessential === undefined)
      expect(essential.length, template.id).toBe(5)
      expect(essential.length * 2, template.id).toBeGreaterThan(template.roles.length)
    }
  })

  it('spends the percussion pool up to its ceiling and not past it', () => {
    // Weave's size is content rather than taste: a pool of percussion voices on a small box is
    // the resource it spends, and an eighth percussive part would mean no such box could finish
    // it. The ceiling itself is enforced from the device side in `mc-101.test.ts`.
    const PERCUSSIVE = new Set(['closed-hat', 'ghost-perc', 'kick', 'metallic', 'open-hat', 'rim', 'tom'])
    const percussive = weave.roles.filter((r) => PERCUSSIVE.has(r.role))
    expect(percussive).toHaveLength(7)
    // And exactly one part that is not percussion, which is the only thing carrying the harmony.
    const rest = weave.roles.filter((r) => !PERCUSSIVE.has(r.role))
    expect(rest.map((r) => r.role)).toEqual(['sub'])
    // No backbeat anywhere, which every other direction in the registry has.
    const roles = new Set(weave.roles.map((r) => r.role))
    expect(roles.has('clap')).toBe(false)
    expect(roles.has('snare')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// §4.3 / §4.1 — the content
// ---------------------------------------------------------------------------

describe('both directions program every part a reader steps in (§4.3)', () => {
  it('authors four bands for every patterned role, and never falls back (§6.3)', () => {
    const densities = [0, 24, 25, 49, 50, 74, 75, 100]
    for (const template of NEW) {
      const patterned = new Set(template.patterns.map((p) => p.forRole))
      for (const request of template.roles) {
        const want = request.role === 'pad' ? 'none' : 'exact'
        expect(patterned.has(request.role), `${template.id} ${request.id}`).toBe(want === 'exact')
        for (const section of sectionsFor(request, template)) {
          for (const density of densities) {
            const selection = selectPattern(template, request, section, moodState({ density }))
            expect(selection.outcome, `${template.id} ${request.id} @${section} d=${density}`).toBe(
              want,
            )
          }
        }
      }
    }
  })

  it('leaves the pad unpatterned, and only the pad', () => {
    // Ambient Dub's reasoning for its `texture`, applied to a held chord: four bands of invented
    // 16ths would be the guide lying about what the part does. The hook *is* the pad's rhythm,
    // and where the voicing changes is a question the progression has already answered.
    expect(lydianHouse.patterns.some((p) => p.forRole === 'pad')).toBe(false)
    const patterned = new Set(lydianHouse.patterns.map((p) => p.forRole))
    const unpatterned = lydianHouse.roles.filter((r) => !patterned.has(r.role)).map((r) => r.role)
    expect(unpatterned).toEqual(['pad'])
    // Weave has no such part: in a piece that is mostly drums there is nothing sustained with no
    // rhythm to give, so a hole would have no honest reason behind it.
    const weavePatterned = new Set(weave.patterns.map((p) => p.forRole))
    for (const request of weave.roles) expect(weavePatterned.has(request.role), request.id).toBe(true)
  })

  it('emits a `fill` on the toms, which no direction had ever done (#108)', () => {
    // Four devices author a `fill` articulation on their *dark tom*, and until this direction
    // arrived not one of them was reachable. `fill` itself was not the missing part — Industrial
    // Techno's clap emits one — the missing part was a fill on a tom: the only other direction
    // asking for toms asks for a bright one, and §3.5 excludes an opposite character from
    // candidacy outright, so those four recipes were never candidates for anything.
    //
    // The slot lands on the four-bar grid because that is the only length with a closing beat
    // worth rolling into. `reachability.test.ts` is where the device side of this is checked.
    const fills = weave.patterns.filter((p) => p.hits.some((h) => h.slot === 'fill'))
    expect(fills.map((p) => p.id)).toEqual(['weave-tom-b2', 'weave-tom-b3'])
    for (const pattern of fills) {
      expect(pattern.length, pattern.id).toBe(64)
      // "A 16th run in the closing beat of the variant" — the convention in `core/authoring`,
      // which is the last four steps and nowhere else.
      for (const hit of pattern.hits.filter((h) => h.slot === 'fill')) {
        expect(hit.step, `${pattern.id} step ${hit.step}`).toBeGreaterThan(pattern.length - 4)
      }
    }
    // And here is why those four recipes were unreachable, which is the part worth pinning: the
    // only other direction asking for a tom asks for the **opposite** character. Major-Key
    // Electro emits tom fills of its own — the slot was never the problem — but `bright` and
    // `dark` are the two ends of the tone axis at squared distance 4, and §3.5 refuses that
    // outright, so its patterns could never reach a dark tom recipe however many fills it had.
    // Weave is the first request in the library those recipes are candidates for.
    const otherToms = TEMPLATES.filter((t) => t.id !== weave.id).flatMap((t) =>
      t.roles.filter((r) => r.role === 'tom').map((r) => `${t.id}:${r.character}`),
    )
    expect(otherToms).toEqual(['major-key-electro:bright'])
    expect(weave.roles.find((r) => r.role === 'tom')?.character).toBe('dark')
    expect(characterDistanceSq('dark', 'bright')).toBeGreaterThanOrEqual(MAX_SUBSTITUTION_DISTANCE_SQ)
  })

  it('spells every hook against every key each direction offers (§4.1)', () => {
    for (const template of NEW) {
      expect(template.hooks.length).toBeGreaterThanOrEqual(2)
      for (const key of template.keys) {
        for (const hook of template.hooks) {
          const resolved = resolveHook(hook, key)
          expect(
            resolved.outcome === 'resolved' ? 'resolved' : `${resolved.reason}: ${resolved.detail}`,
            `${template.id} ${hook.id} in ${key}`,
          ).toBe('resolved')
        }
      }
    }
  })

  it('asks for exactly as many notes at once as it declares (§12.4)', () => {
    // A hook wider than the request's `polyphony` would be asking a rig to play a chord the
    // direction never said it needed, and a hook narrower than it would make the request an
    // overstatement that costs a rig an assignment for nothing.
    const widthOf = (id: string) => {
      const hooks = lydianHouse.hooks.filter((h) => h.forRole === id)
      const perStep = new Map<string, number>()
      for (const hook of hooks) {
        for (const note of hook.notes) {
          const k = `${hook.id}:${note.step}`
          perStep.set(k, (perStep.get(k) ?? 0) + 1)
        }
      }
      return Math.max(...perStep.values())
    }
    expect(widthOf('pad')).toBe(4)
    expect(widthOf('stab')).toBe(3)
    expect(lydianHouse.roles.find((r) => r.id === 'r-pad')?.polyphony).toBe(4)
    expect(lydianHouse.roles.find((r) => r.id === 'r-stab')?.polyphony).toBe(3)
    // Weave declares no polyphony at all: seven percussion parts and a sub, none of which is a
    // chord. The check is on the notes rather than the field, because overlapping hook notes
    // would demand one anyway.
    for (const request of weave.roles) expect(request.polyphony, request.id).toBeUndefined()
    expect(widestChord(weave)).toBe(1)
  })

  it('moves the Weave hooks exactly where the cycle moves, and nowhere else', () => {
    // Drone Study's rule, and it applies here for the same reason: with one pitched part and
    // nothing playing under it, the printed progression is only real if the line's change points
    // *are* the chord changes. A note moving mid-chord would make the cycle decoration.
    let bar = 1
    const boundaries: number[] = []
    for (const step of weave.harmony.progression) {
      boundaries.push((bar - 1) * STEPS_PER_BAR + 1)
      bar += step.bars
    }
    expect(boundaries).toEqual([1, 81, 113])
    for (const hook of weave.hooks) {
      expect(hook.notes.map((n) => n.step), hook.id).toEqual(boundaries)
      hook.notes.forEach((note, i) => {
        const next = boundaries[i + 1] ?? weave.harmony.cycleBars * STEPS_PER_BAR + 1
        expect(note.step + note.len, `${hook.id} note ${i}`).toBe(next)
      })
    }
    // And the two pick different members of each triad, so a reroll is a different bass line
    // rather than a transposition. Aeolian triads stacked in thirds: `i` is 1/3/5, `VI` is
    // 6/1/3, `v` is 5/7/2.
    const [roots, upper] = weave.hooks
    if (roots === undefined || upper === undefined) throw new Error('weave lost a hook')
    expect(roots.notes.map((n) => n.degree)).toEqual([1, 6, 5])
    expect(upper.notes.map((n) => n.degree)).toEqual([5, 3, 7])
  })

  it('counts its phrases the opposite way round from each other', () => {
    // Two directions, two deliberate answers to the same arithmetic. A loop somebody drops in and
    // out of has to be countable from across the room, so every Lydian House section is a whole
    // number of eight-bar cycles. A kit whose longest part is four bars only lands somewhere new
    // if the sections refuse to divide by four, so none of Weave's does — and #105's chain plan
    // is what tells the reader how to build the remainder rather than pretending it divided.
    expect(lydianHouse.harmony.cycleBars).toBe(8)
    for (const section of lydianHouse.structure) expect(section.bars % 8, section.name).toBe(0)
    for (const section of weave.structure) expect(section.bars % 4, section.name).not.toBe(0)
  })
})

// ---------------------------------------------------------------------------
// §7.3 / #84 — what each direction does on a rig
// ---------------------------------------------------------------------------

describe('both directions finish on one box with several voices', () => {
  it('fills every part of both, on the groovebox #81 was filed about', () => {
    // The number the issue exists for. That report is this box being assigned eight parts of a
    // twelve-part direction and told it had four holes; here it is assigned all of both
    // directions, with nothing left to explain.
    for (const [template, requests] of [
      [lydianHouse, 8],
      [weave, 8],
    ] as const) {
      const { filled, gaps, capped } = report(template, [box('roland-mc-101')])
      expect({ id: template.id, filled: filled.length, gaps, capped }).toEqual({
        id: template.id,
        filled: requests,
        gaps: {},
        capped: false,
      })
      expect(filled).toHaveLength(template.roles.length)
    }
  })

  it('finishes Lydian House on four separate boxes, alone', () => {
    // Not one lucky box. Four of the fourteen carry all eight parts with nothing else in the rig,
    // and they are four different shapes of box rather than four of a kind.
    const ALONE = [
      'elektron-digitakt-ii',
      'polyend-tracker-mini',
      'roland-mc-101',
      'synthstrom-deluge',
    ] as const
    for (const id of ALONE) {
      const { filled, gaps, capped } = report(lydianHouse, [box(id)])
      expect({ id, gaps, capped, filled: filled.length }).toEqual({
        id,
        gaps: {},
        capped: false,
        filled: 8,
      })
    }
  })

  it('finishes what Weave needs on a drum machine plus one mono synth', () => {
    // The other shape of small rig the strand was aimed at, and the reason `essential` is counted
    // apart from `covered` (§4.4). These rigs miss the `optional` metallic and nothing else — so
    // the direction is finished, and #81's complaint is exactly that a table reporting 7/8 here
    // reads as a hole when the reader has made the whole piece.
    // **The third rig stopped missing it at #345**, which is why this is a table rather than one
    // expectation repeated three times. `metallic` was among the roles the Tracker Mini declared
    // and could not serve, so on that rig Weave finished at 7 of 8 with the optional part
    // contended out; it now finishes at 8. The two TR-8S rigs are unchanged. Both outcomes make
    // the same point and the loop below still asserts it for each: whatever is missed is
    // `inessential`, so the direction is finished either way.
    const EXPECTED = [
      { ids: ['roland-tr-8s', 'behringer-crave'], filled: 7, contended: true },
      { ids: ['roland-tr-8s', 'korg-minilogue-xd'], filled: 7, contended: true },
      { ids: ['polyend-tracker-mini', 'behringer-crave'], filled: 8, contended: false },
    ] as const
    for (const row of EXPECTED) {
      const ids = row.ids
      const { filled, gaps, capped } = report(weave, ids.map(box))
      expect({ ids: ids.join('+'), gaps, capped, filled: filled.length }).toEqual({
        ids: ids.join('+'),
        gaps: row.contended ? { 'r-metallic': 'no-room/contended' } : {},
        capped: false,
        filled: row.filled,
      })
      const missed = weave.roles.filter((r) => !filled.includes(r.id))
      for (const request of missed) expect(request.inessential, request.id).toBeDefined()
      // And #128's half of it, which is what makes the number readable rather than alarming: the
      // one absence is reported as a distinct *reader action* carrying the direction's own words,
      // not as a hole to go shopping for.
      const result = resolve({ devices: ids.map(box), template: weave, mood: NEUTRAL, seed: 7 })
      if (!row.contended) {
        expect(result.shortfalls).toEqual([])
        continue
      }
      expect(result.shortfalls.map((g) => g.kind)).toEqual(['not-needed'])
      const [only] = result.shortfalls
      if (only === undefined || only.kind !== 'not-needed') throw new Error('expected one not-needed')
      expect(only.rationale).toBe('the hats already shimmer; this is one more thing up there')
    }
  })

  it('counts essential coverage apart from total coverage, and the gap between them is the point', () => {
    // `coverage` is what the public catalogue prints (#84). One fraction over every request
    // understates a box that carries everything the direction actually needs, which was #81's
    // complaint about this table.
    const mc101 = box('roland-mc-101')
    expect(coverage(mc101, lydianHouse)).toMatchObject({ covered: 8, requests: 8, essential: 5, essentialCovered: 5 })
    expect(coverage(mc101, weave)).toMatchObject({ covered: 8, requests: 8, essential: 5, essentialCovered: 5 })
    // And the two halves genuinely differ somewhere, or the distinction is untested: a drum
    // machine alone carries every part of Weave it needs except the one pitched one.
    const tr8s = coverage(box('roland-tr-8s'), weave)
    expect(tr8s.covered).toBe(6)
    expect(tr8s.essentialCovered).toBe(4)
  })

  it('leaves no gap on the whole library, at any seed', () => {
    // A gap caused by a rig is honest (invariant 5); a gap on the *whole* library is a content
    // bug in this layer, because there is no rig excuse left.
    for (const template of NEW) {
      for (const seed of [0, 1, 7, 42, 9001]) {
        const { gaps, filled, capped } = report(template, DEVICES, seed)
        const where = `${template.id} seed ${seed}`
        expect(gaps, where).toEqual({})
        expect(filled, where).toHaveLength(template.roles.length)
        expect(capped, where).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §8 / #84 — the public page
// ---------------------------------------------------------------------------

describe('the /directions page for each', () => {
  it('describes itself in one sentence a search result can hold', () => {
    for (const template of NEW) {
      const page = directionPage(template)
      expect(page.description).toContain(`${template.bpm.min}`)
      expect(page.description).toContain(`${template.bpm.max}`)
      expect(page.description.length).toBeLessThan(160)
      expect(page.title).toContain(template.name)
    }
  })

  it('lists every box, and credits the ones that carry the whole direction alone', () => {
    for (const template of NEW) {
      const fits = rigFits(template)
      expect(fits).toHaveLength(DEVICES.length)
      const complete = fits.filter((f) => f.essentialCovered === f.essential)
      const none = fits.filter((f) => f.essentialCovered === 0)
      // The boxes covering nothing are listed rather than quietly dropped — a mixer carries
      // neither of these and saying so is the honest answer, not an omission.
      expect(none.length, `${template.id} covers nothing`).toBeGreaterThan(0)
      expect(complete.map((f) => f.deviceId), template.id).toContain('roland-mc-101')
    }
  })

  it('prerenders the structure, the degrees and every request', async () => {
    for (const template of NEW) {
      const element = await DirectionPageRoute({ params: Promise.resolve({ id: template.id }) })
      const markup = renderToStaticMarkup(createElement(() => element))
      for (const section of template.structure) expect(markup, template.id).toContain(section.name)
      for (const step of template.harmony.progression) {
        expect(markup, `${template.id} ${step.degree}`).toContain(step.degree)
      }
      for (const request of template.roles) expect(markup, request.id).toContain(request.role)
      expect(markup).toContain('meter-cell')
    }
  })
})
