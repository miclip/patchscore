import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DENSITY_DETENTS,
  MAX_SUBSTITUTION_DISTANCE_SQ,
  TemplateSchema,
  assignableKey,
  bandFor,
  characterDistanceSq,
  expand,
  moodState,
  parseKey,
  resolve,
  resolveHook,
  sectionsFor,
  selectPattern,
  type Assignable,
  type DensityBand,
  type Device,
  type Template,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, droneStudy, relay, templateById } from '../lib/templates/index'
import { directionPage, rigFits } from '../lib/studio/direction-page'
import DirectionPageRoute from '../app/directions/[id]/page'

/**
 * Drone Study and Relay: the two directions a **one-voice rig** can finish.
 *
 * The three directions before them ask for nine, twelve and nine parts, and every one of them
 * is a rack. That left a shape untested rather than merely uncovered: the whole content layer had
 * only ever been asked "can this rig cover all of it", never "is this a complete piece when the
 * answer is one voice". These two are the second question, and they take two different routes to
 * it.
 *
 * Two more directions have joined them since, and they answer a *different* one-box question:
 * a box with several voices playing several parts at the same time (#81). Those live in
 * `simultaneous-directions.test.ts`, and the distinction is the point of keeping the files
 * apart — "one box" and "one voice" turned out not to be the same claim.
 *
 *  - **Drone Study** asks for one `texture` and nothing else. Substance comes from the structure,
 *    the sixteen-bar cycle and the two authored hooks rather than from a request count.
 *  - **Relay** asks for two parts that are **never playing at the same time**. Both requests are
 *    `transient` and their section sets are disjoint, so §4.2's `(assignable, section)` occupancy
 *    lets one voice carry both — a two-part piece on a monophonic box, which is a real way people
 *    work and which no direction had exercised.
 *
 * The assertions below are outcomes and §7.3 reasons, never `Score` numbers: the objective is
 * free to re-order its lower keys without touching what any of this says (§7.1).
 */

const NEUTRAL = moodState()

/** The four boxes that author every character these two directions ask for, exactly or near. */
const ONE_BOX_RIGS = [
  'behringer-crave',
  'korg-minilogue-xd',
  'moog-subsequent-37',
  'polyend-tracker-mini',
] as const

function box(id: string): Device {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`${id} missing from the registry`)
  return device
}

/** The rig the library was before the Subsequent 37 landed. */
const LEGACY_RIG = DEVICES.filter((d) => d.id !== 'moog-subsequent-37')

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
    nodes: result.search.nodes,
  }
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
    expect(templateById('drone-study')).toBe(droneStudy)
    expect(templateById('relay')).toBe(relay)
  })

  it('parses against the schema', () => {
    for (const template of [droneStudy, relay]) {
      const parsed = TemplateSchema.safeParse(template)
      expect(parsed.error?.issues ?? [], `${template.id} failed TemplateSchema`).toEqual([])
    }
  })

  it('asks a different arrangement from every direction already here (§6.3)', () => {
    // Not "the templates differ" — the *arrangements* differ. Two genres that resolve to the
    // same band vector are one genre with two names as far as §6.3 is concerned.
    expect(bandVector(droneStudy, DENSITY_DETENTS[1])).toEqual([0, 1, 2, 3, 2, 1, 0])
    expect(bandVector(relay, DENSITY_DETENTS[1])).toEqual([0, 1, 2, 3, 1, 2, 3, 0])
    const vectors = TEMPLATES.map((t) => bandVector(t, DENSITY_DETENTS[1]).join(''))
    expect(new Set(vectors).size).toBe(TEMPLATES.length)
  })

  it('is the only palindrome in the registry, which is what a drone piece looks like', () => {
    const arc = bandVector(droneStudy, DENSITY_DETENTS[1])
    expect(arc).toEqual([...arc].reverse())
    const others = TEMPLATES.filter((t) => t.id !== droneStudy.id)
    for (const template of others) {
      const v = bandVector(template, DENSITY_DETENTS[1])
      expect(v, template.id).not.toEqual([...v].reverse())
    }
  })

  it('reaches two modes nothing else in the registry offers', () => {
    // A key set is a claim about which chords the reader can actually play (§4.1): the flat
    // second of `bII` needs phrygian and the flat seventh of `VII` over a major third needs
    // mixolydian, and offering a key without them would ask for a chord the key does not have.
    for (const [template, mode] of [
      [droneStudy, 'phrygian'],
      [relay, 'mixolydian'],
    ] as const) {
      expect(template.keys.length).toBeGreaterThan(1)
      for (const key of template.keys) expect(parseKey(key)?.mode, key).toBe(mode)
      for (const other of TEMPLATES) {
        if (other.id === template.id) continue
        for (const key of other.keys) expect(parseKey(key)?.mode, `${other.id} ${key}`).not.toBe(mode)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §4.3 — the content, per direction
// ---------------------------------------------------------------------------

describe('both directions program every part they ask for (§4.3)', () => {
  it('authors four bands for every requested role, and never falls back (§6.3)', () => {
    const densities = [0, 24, 25, 49, 50, 74, 75, 100]
    for (const template of [droneStudy, relay]) {
      const patterned = new Set(template.patterns.map((p) => p.forRole))
      for (const request of template.roles) {
        expect(patterned.has(request.role), `${template.id} ${request.id}`).toBe(true)
        for (const section of sectionsFor(request, template)) {
          for (const density of densities) {
            const selection = selectPattern(template, request, section, moodState({ density }))
            expect(selection.outcome, `${template.id} ${request.id} @${section} d=${density}`).toBe(
              'exact',
            )
          }
        }
      }
    }
  })

  it('spells every hook against every key each direction offers (§4.1)', () => {
    // A degree that cannot be spelt in one of the offered keys is a content bug that only shows
    // up on the reroll that picks that key — so all of them, here.
    for (const template of [droneStudy, relay]) {
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

  it('moves the drone hooks exactly where the cycle moves, and nowhere else', () => {
    // The claim the direction's whole framing rests on: with one voice and no accompaniment, the
    // progression is only real if the line's change points *are* the chord changes. A note that
    // moves mid-chord makes the printed cycle decoration, and one that fails to move at a
    // boundary makes it a fiction.
    let bar = 1
    const boundaries: number[] = []
    for (const step of droneStudy.harmony.progression) {
      boundaries.push((bar - 1) * 16 + 1)
      bar += step.bars
    }
    expect(boundaries).toEqual([1, 129, 193])
    for (const hook of droneStudy.hooks) {
      expect(hook.notes.map((n) => n.step), hook.id).toEqual(boundaries)
      // And the line covers the cycle with no gap: each note runs until the next chord starts.
      hook.notes.forEach((note, i) => {
        const next = boundaries[i + 1] ?? droneStudy.harmony.cycleBars * 16 + 1
        expect(note.step + note.len, `${hook.id} note ${i}`).toBe(next)
      })
    }
  })

  it('puts every drone hook note on a chord tone of the degree in force', () => {
    // The other half. Aligning the changes is not enough — a line that changes on the beat the
    // chord does but lands on a note the chord does not contain implies a different progression
    // from the one printed. Phrygian triads, stacked in thirds from each degree: `i` is 1/3/5,
    // `bII` is 2/4/6 and `vii` is 7/2/4.
    const DEGREE_OF: Record<string, number> = { i: 1, bII: 2, vii: 7 }
    const triad = (d: number) => [d, ((d + 1) % 7) + 1, ((d + 3) % 7) + 1]
    for (const hook of droneStudy.hooks) {
      hook.notes.forEach((note, i) => {
        const step = droneStudy.harmony.progression[i]
        if (step === undefined) throw new Error(`${hook.id} has more notes than chords`)
        const root = DEGREE_OF[step.degree]
        if (root === undefined) throw new Error(`unmapped degree '${step.degree}'`)
        expect(triad(root), `${hook.id} note ${i} over ${step.degree}`).toContain(note.degree)
      })
    }
    // Not vacuous: the two hooks pick *different* members of each triad, which is what makes a
    // reroll between them a different piece rather than a transposition.
    const [pedal, upper] = droneStudy.hooks
    if (pedal === undefined || upper === undefined) throw new Error('drone study lost a hook')
    expect(pedal.notes.map((n) => n.degree)).toEqual([1, 2, 7])
    expect(upper.notes.map((n) => n.degree)).toEqual([5, 4, 2])
  })

  it('spells the phrygian seventh-degree chord as the minor triad it is', () => {
    // Ambient Dub's dorian cycle spells the same numeral uppercase and is right to: stacking
    // thirds on the seventh degree of dorian gives a major triad and on phrygian gives a minor
    // one. The case follows the mode, not the numeral, and getting it wrong would print a chord
    // quality the key does not contain.
    const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10]
    const at = (d: number) => (PHRYGIAN[(d - 1) % 7] as number) + 12 * Math.floor((d - 1) / 7)
    const third = (d: number) => at(d + 2) - at(d)
    expect(droneStudy.harmony.progression.map((p) => p.degree)).toEqual(['i', 'bII', 'vii'])
    expect(third(1)).toBe(3) // i     minor
    expect(third(2)).toBe(4) // bII   major
    expect(third(7)).toBe(3) // vii   minor
  })

  it('keeps every hook monophonic, because a one-box rig is the point', () => {
    // A hook needing two notes at once would take back the thing both directions are for. The
    // check is on the notes rather than on a `polyphony` field: neither request declares one, so
    // the only way to demand a chord here would be to author overlapping hook notes.
    for (const template of [droneStudy, relay]) {
      for (const hook of template.hooks) {
        const sorted = [...hook.notes].sort((a, b) => a.step - b.step)
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1] as (typeof sorted)[number]
          const here = sorted[i] as (typeof sorted)[number]
          expect(prev.step + prev.len, `${hook.id} note ${i} overlaps the one before`).toBeLessThanOrEqual(
            here.step,
          )
        }
      }
      for (const request of template.roles) expect(request.polyphony, request.id).toBeUndefined()
    }
  })

  it('gives the drone a re-articulation map rather than a rhythm', () => {
    // Ambient Dub authors no texture variants and says why: four bands of invented 16ths would
    // be the guide lying about what the part does. Nothing here contradicts it — every variant
    // is four bars long and band 0 is a single strike in all four of them, which is a map of
    // where the note is struck again rather than a pulse.
    const variants = droneStudy.patterns.filter((p) => p.forRole === 'texture')
    expect(variants).toHaveLength(4)
    for (const variant of variants) expect(variant.length, variant.id).toBe(64)
    const byBand = new Map(variants.map((p) => [p.band, p.hits.length]))
    expect(byBand.get(0)).toBe(1)
    // Even at its busiest it is under two strikes a bar.
    expect(byBand.get(3) as number).toBeLessThan(8)
  })
})

// ---------------------------------------------------------------------------
// §4.2 — Relay's disjoint sections, which are the whole mechanism
// ---------------------------------------------------------------------------

describe('Relay hands one voice back and forth (§4.2)', () => {
  it('makes both requests transient and gives them disjoint sections', () => {
    const [bass, lead] = relay.roles
    if (bass === undefined || lead === undefined) throw new Error('relay lost a request')
    for (const request of relay.roles) {
      expect(request.sustain, request.id).toBe('transient')
      expect((request.sections ?? []).length, request.id).toBeGreaterThan(0)
      expect((request.sections ?? []).length, request.id).toBeLessThan(relay.structure.length)
    }
    const bassSections = new Set(sectionsFor(bass, relay))
    const leadSections = new Set(sectionsFor(lead, relay))
    for (const section of bassSections) expect(leadSections.has(section), section).toBe(false)
    // And between them they claim every section exactly once: no silent bar, and no bar with
    // two parts fighting for one box.
    expect(bassSections.size + leadSections.size).toBe(relay.structure.length)
    expect([...bassSections, ...leadSections].sort()).toEqual(
      relay.structure.map((s) => s.name).sort(),
    )
  })

  it('puts both parts on one assignable, on every single-voice box in the library', () => {
    // The claim the direction exists to make. `Occupancy` is keyed on `(assignable, section)`
    // (§4.2), so disjoint section sets do not contend — and on a box with exactly one voice the
    // result is a two-part piece with nothing left over.
    // `voices.length === 1` is the wrong test and the Deluge is why: it declares one `VoiceSpec`
    // and that spec is a *pool* of twenty-four, so it expands to twenty-four assignables and
    // spreads the two parts over two of them — correctly. The claim is about boxes with one
    // assignable, which is what `expand` answers (§2.2).
    const singleVoiced = DEVICES.filter((d) => expand(d).length === 1 && d.recipes.length > 0)
    let checked = 0
    for (const device of singleVoiced) {
      const result = resolve({ devices: [device], template: relay, mood: NEUTRAL, seed: 7 })
      if (result.assignments.length !== relay.roles.length) continue
      const used = new Set(
        result.assignments.flatMap((a) => a.assignables.map((v) => assignableKey(v as Assignable))),
      )
      expect(used.size, `${device.id} spread the two parts over ${used.size} voices`).toBe(1)
      checked += 1
    }
    // Not vacuous: at least the three single-voice synths in the library carry it this way.
    expect(checked).toBeGreaterThanOrEqual(3)
  })

  it('hands off five times, with two places a part keeps it for a second section', () => {
    // The doc comment is falsifiable here rather than trusted. Strict alternation was the obvious
    // shape and is not the authored one: the bass needs two sections to establish a figure and
    // the lead needs two to be a line, so the split clusters at both ends.
    const owner = (name: string) =>
      relay.roles.find((r) => (r.sections ?? []).includes(name))?.id ?? '??'
    const order = relay.structure.map((s) => owner(s.name))
    expect(order).toEqual([
      'r-bass-mid',
      'r-bass-mid',
      'r-lead',
      'r-bass-mid',
      'r-lead',
      'r-lead',
      'r-bass-mid',
      'r-lead',
    ])
    const handoffs = order.filter((who, i) => i > 0 && who !== order[i - 1]).length
    expect(handoffs).toBe(5)
    // Four sections each, and the piece ends on the lead.
    expect(order.filter((w) => w === 'r-bass-mid')).toHaveLength(4)
    expect(order[order.length - 1]).toBe('r-lead')
  })

  it('asks for two characters that are §3.4 opposites, and never substitutes between them', () => {
    // The claim the doc comment used to get backwards. `dark` and `bright` are the two ends of
    // the tone axis at squared distance 4, which §3.5 refuses — and that is irrelevant to
    // resolution, because they belong to two different roles and substitution only ever happens
    // within one. What carries a small rig is each character's own neighbourhood.
    expect(characterDistanceSq('dark', 'bright')).toBe(4)
    expect(characterDistanceSq('dark', 'bright')).toBeGreaterThanOrEqual(MAX_SUBSTITUTION_DISTANCE_SQ)
    // The substitution the CRAVE actually takes, and the only one this direction needs.
    expect(characterDistanceSq('dark', 'dirty')).toBe(2)
    expect(characterDistanceSq('dark', 'dirty')).toBeLessThan(MAX_SUBSTITUTION_DISTANCE_SQ)
    // Both authored characters reach four of the six, and are refused only by their own opposite.
    for (const [want, opposite] of [
      ['dark', 'bright'],
      ['bright', 'dark'],
    ] as const) {
      const reachable = CHARACTERS.filter(
        (c) => c !== want && characterDistanceSq(want, c) < MAX_SUBSTITUTION_DISTANCE_SQ,
      )
      expect(reachable, want).toHaveLength(4)
      expect(reachable, want).not.toContain(opposite)
    }
  })

  it('gives the two parts different slices of the arc', () => {
    // If both parts saw the same bands the handover would be decoration. The bass climbs to 3
    // twice and the lead never gets there at all.
    const bandsFor = (id: string) => {
      const request = relay.roles.find((r) => r.id === id)
      if (request === undefined) throw new Error(`no ${id}`)
      return sectionsFor(request, relay).map((s) => bandFor(relay, s, moodState()))
    }
    expect(bandsFor('r-bass-mid')).toEqual([0, 1, 3, 3])
    expect(bandsFor('r-lead')).toEqual([2, 1, 2, 0])
  })
})

// ---------------------------------------------------------------------------
// §7.3 — what each direction does on a rig
// ---------------------------------------------------------------------------

describe('both directions finish on one box', () => {
  it('fills the drone study on each of the four boxes that author the character', () => {
    for (const id of ONE_BOX_RIGS) {
      const { filled, gaps, capped } = report(droneStudy, [box(id)])
      expect({ id, filled, gaps, capped }).toEqual({
        id,
        filled: ['r-texture'],
        gaps: {},
        capped: false,
      })
    }
  })

  it('fills both Relay parts on each of the same four boxes', () => {
    for (const id of ONE_BOX_RIGS) {
      const { filled, gaps, capped } = report(relay, [box(id)])
      expect({ id, filled, gaps, capped }).toEqual({
        id,
        filled: ['r-bass-mid', 'r-lead'],
        gaps: {},
        capped: false,
      })
    }
  })

  it('takes a character substitution on the one box that does not author `dark`', () => {
    // §3.5's substitution, doing the job it exists for, on real data. The CRAVE authors a
    // `dirty` bass and no `dark` one; `dark` and `dirty` differ on one axis, so the swap is
    // allowed at distance 2 and the direction resolves rather than reporting `no-recipe`.
    const result = resolve({ devices: [box('behringer-crave')], template: relay, mood: NEUTRAL, seed: 7 })
    const bass = result.assignments.find((a) => a.requestId === 'r-bass-mid')
    expect(bass?.recipe?.character).toBe('dirty')
    expect(result.shortfalls).toEqual([])
    // And it is genuinely a substitution rather than a miss: three of the four author it exactly.
    const exact = ONE_BOX_RIGS.filter((id) =>
      box(id).recipes.some((r) => r.role === 'bass-mid' && r.character === 'dark'),
    )
    expect(exact).toHaveLength(3)
  })

  it('leaves no gap on the whole library, or on the library as it was before the last device', () => {
    // A gap caused by the rig is honest (invariant 5); a gap on the *whole* library is a content
    // bug in this layer, because there is no rig excuse left. The legacy rig is the same claim
    // one device ago, so neither direction can be quietly depending on the newest box.
    expect(LEGACY_RIG).toHaveLength(DEVICES.length - 1)
    for (const rig of [DEVICES, LEGACY_RIG]) {
      for (const template of [droneStudy, relay]) {
        for (const seed of [0, 1, 7, 42, 9001]) {
          const { gaps, filled, capped } = report(template, rig, seed)
          const where = `${template.id} seed ${seed} on ${rig.length} devices`
          expect(gaps, where).toEqual({})
          expect(filled, where).toHaveLength(template.roles.length)
          expect(capped, where).toBe(false)
        }
      }
    }
  })

  it('searches these exhaustively, nowhere near the node cap', () => {
    // Recorded rather than tuned: a one- and a two-request direction are the smallest searches
    // the resolver will ever be given, and if either ever capped it would mean something had
    // gone wrong upstream rather than that the cap needed raising.
    for (const rig of [DEVICES, LEGACY_RIG]) {
      for (const template of [droneStudy, relay]) {
        const { nodes, capped } = report(template, rig)
        expect(capped).toBe(false)
        expect(nodes, `${template.id} on ${rig.length} devices`).toBeLessThan(100)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §8 / #84 — the public page
// ---------------------------------------------------------------------------

describe('the /directions page for each', () => {
  it('describes itself in one sentence a search result can hold', () => {
    for (const template of [droneStudy, relay]) {
      const page = directionPage(template)
      expect(page.description).toContain(`${template.bpm.min}`)
      expect(page.description).toContain(`${template.bpm.max}`)
      expect(page.description.length).toBeLessThan(160)
      expect(page.title).toContain(template.name)
    }
  })

  it('lists every box, and names which of them carry the whole direction alone', () => {
    // The device-facing half of the small-rig claim. `rigFits` is what the catalogue prints, and
    // it lists every box including the ones that cover nothing — a drum machine carries neither
    // of these and saying so is the honest answer, not an omission.
    //
    // The assertion the previous name overclaimed: **not** every box carries these, and it never
    // could — a drum machine declares no `texture` and no `lead`. As of fourteen devices it is
    // eight boxes for the drone study and seven for Relay, but the count is not what is worth
    // pinning, because it moves every time the library grows. What is worth pinning is that the
    // four rigs the rest of this file resolves against are among the boxes the *catalogue* also
    // credits — otherwise those reports would be testing four boxes this page disagrees about —
    // and that the page still lists the ones covering nothing rather than quietly dropping them.
    for (const template of [droneStudy, relay]) {
      const fits = rigFits(template)
      expect(fits).toHaveLength(DEVICES.length)
      const complete = fits.filter((f) => f.essentialCovered === f.essential)
      const none = fits.filter((f) => f.essentialCovered === 0)
      expect(complete.length, `${template.id} complete`).toBeGreaterThanOrEqual(ONE_BOX_RIGS.length)
      expect(none.length, `${template.id} covers nothing`).toBeGreaterThan(0)
      expect(complete.length + none.length, `${template.id}`).toBeLessThanOrEqual(DEVICES.length)
      for (const id of ONE_BOX_RIGS) {
        expect(
          complete.map((f) => f.deviceId),
          `${template.id} does not credit ${id}`,
        ).toContain(id)
      }
    }
  })

  it('prerenders the structure, the degrees and every request', async () => {
    for (const template of [droneStudy, relay]) {
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
