import { describe, expect, it } from 'vitest'
import {
  DENSITY_DETENTS,
  TemplateSchema,
  bandFor,
  moodState,
  resolve,
  resolveHook,
  selectPattern,
  type Device,
  type SectionName,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, hardTechno, industrialTechno, templateById } from '../lib/templates/index'

/**
 * Hard Techno (§4), the twelfth direction. The musical claims its file makes, pinned: one chord,
 * a kick that is four-to-the-floor at every band, a lead hook above middle C, `hard` asked for
 * only where the library answers it, and a stated position on which four parts a four-voice box
 * gets. Registration, band coverage, pattern hygiene and invariant 3 are checked for every
 * direction by `templates.test.ts` and are not repeated here.
 */

function deviceById(id: string): Device {
  const found = DEVICES.find((d) => d.id === id)
  if (found === undefined) throw new Error(`${id} missing from the registry`)
  return found
}

/** One box, this direction, one seed: what each request became. */
function solo(deviceId: string, seed = 1) {
  const result = resolve({ devices: [deviceById(deviceId)], template: hardTechno, seed })
  const got = new Map(
    result.assignments.map((a) => [
      a.requestId,
      a.recipe.character === a.character ? 'exact' : `sub:${a.recipe.character}`,
    ]),
  )
  const missing = new Map(result.shortfalls.map((s) => [s.requestId, s]))
  return { result, got, missing }
}

// ---------------------------------------------------------------------------
// What it is
// ---------------------------------------------------------------------------

describe('hard-techno is registered and is its own direction (§4)', () => {
  it('is in the registry, parses, and sits at 145-160 BPM', () => {
    expect(templateById('hard-techno')).toBe(hardTechno)
    expect(TemplateSchema.safeParse(hardTechno).error?.issues ?? []).toEqual([])
    expect(hardTechno.bpm).toEqual({ min: 145, max: 160, default: 150 })
    // Faster than every other four-on-the-floor direction, and slower than the one direction
    // that is not: Breakbeat sits at 165-175 and has no four-to-the-floor kick to be compared on.
    const fourOnTheFloor = TEMPLATES.filter(
      (t) =>
        t.id !== 'hard-techno' && t.id !== 'breakbeat' && t.roles.some((r) => r.role === 'kick'),
    )
    for (const t of fourOnTheFloor) expect(t.bpm.max, t.id).toBeLessThan(hardTechno.bpm.min)
  })

  it('holds one chord: a four-bar cycle with the tonic and nothing else (§4.1)', () => {
    expect(hardTechno.harmony).toEqual({ cycleBars: 4, progression: [{ degree: 'i', bars: 4 }] })
    // Every section is a whole number of cycles, of two-bar tom figures and of four-bar impacts,
    // so the guide never has to print a remainder rule (#105).
    for (const section of hardTechno.structure) {
      expect(section.bars % 4, section.name).toBe(0)
    }
    expect(hardTechno.structure.reduce((n, s) => n + s.bars, 0)).toBe(120)
  })

  it('is not Industrial Techno at a higher tempo', () => {
    // The two directions share the four parts every techno has — a hard kick, a dark sub, a
    // bright riser, a hard crash — and nothing else they ask for by character: a snare where
    // Industrial has a clap, a bright hat where it has a dirty one, a dirty open hat, a ride and
    // toms where it has a clang, a dirty mono lead where it has a hard chord stab.
    const pairs = (t: typeof hardTechno) => new Set(t.roles.map((r) => `${r.role}/${r.character}`))
    const shared = [...pairs(hardTechno)].filter((p) => pairs(industrialTechno).has(p)).sort()
    expect(shared).toEqual(['impact/hard', 'kick/hard', 'riser/bright', 'sub/dark'])
    const own = [...pairs(hardTechno)].filter((p) => !pairs(industrialTechno).has(p)).sort()
    expect(own).toEqual([
      'closed-hat/bright',
      'lead/dirty',
      'open-hat/dirty',
      'ride/bright',
      'snare/hard',
      'tom/hard',
    ])
    // Industrial cycles three chords over eight bars; this cycles one over four.
    expect(industrialTechno.harmony.progression.length).toBe(3)
    expect(hardTechno.harmony.progression.length).toBe(1)
    // And the arrangement is a different shape at the neutral detent, not a relabelling.
    const vector = (t: typeof hardTechno) =>
      t.structure.map((s) => bandFor(t, s.name, moodState({ density: DENSITY_DETENTS[1] })))
    expect(vector(hardTechno)).toEqual([0, 2, 3, 1, 2, 3, 0])
    expect(vector(industrialTechno)).toEqual([0, 1, 3, 1, 3, 0])
  })
})

// ---------------------------------------------------------------------------
// The kick, the hook, the register
// ---------------------------------------------------------------------------

describe('the kick never stops and the hook sits above middle C', () => {
  it('puts a kick on every beat at every band, so band 0 is the whole kick and not half of it', () => {
    const kicks = hardTechno.patterns.filter((p) => p.forRole === 'kick')
    expect(kicks.map((p) => p.band).sort()).toEqual([0, 1, 2, 3])
    for (const kick of kicks) {
      expect(kick.length, kick.id).toBe(16)
      const onBeats = kick.hits.filter((h) => [1, 5, 9, 13].includes(h.step)).map((h) => h.slot)
      expect(onBeats, kick.id).toHaveLength(4)
      // A beat is a downbeat or the one accent; never a ghost.
      for (const slot of onBeats) expect(['downbeat', 'accent'], kick.id).toContain(slot)
    }
    // The contrast that makes this a claim: Industrial's band-0 kick is half-time.
    const itKick0 = industrialTechno.patterns.find((p) => p.forRole === 'kick' && p.band === 0)
    expect(itKick0?.hits.map((h) => h.step)).toEqual([1, 9])
  })

  it('authors two lead hooks on the chord tones of the one chord, and they are different pieces', () => {
    const leads = hardTechno.hooks.filter((h) => h.forRole === 'lead')
    expect(leads).toHaveLength(2)
    expect(hardTechno.hooks).toHaveLength(2)
    for (const hook of leads) {
      for (const note of hook.notes) {
        expect([1, 3, 5], `${hook.id} step ${String(note.step)}`).toContain(note.degree)
      }
    }
    // One rides the offbeats and one holds; a reroll is a different figure, not a transposition.
    const [hammer, siren] = leads
    if (hammer === undefined || siren === undefined) throw new Error('lead hook missing')
    expect(hammer.notes.map((n) => n.step)).toEqual([3, 7, 11, 15, 19, 23, 27, 29, 31])
    expect(siren.notes.map((n) => n.step)).toEqual([1, 9, 17, 25, 29])
    expect(Math.max(...hammer.notes.map((n) => n.len))).toBe(2)
    expect(Math.min(...siren.notes.map((n) => n.len))).toBe(3)
  })

  /**
   * #37's lesson applied before it has to be learned again: the comment says the lead is above
   * middle C, so the numbers have to. Every note of both hooks, resolved against every key the
   * direction offers, lands between C4 and G5 — above any `bass-mid` octave in the library and
   * three octaves clear of the sub, which the direction pins to C1.
   */
  it('resolves every lead note between C4 and G5 in every key it offers (#37)', () => {
    const midi: number[] = []
    for (const key of hardTechno.keys) {
      for (const hook of hardTechno.hooks) {
        const resolved = resolveHook(hook, key)
        expect(resolved.outcome, `${hook.id} in ${key}`).toBe('resolved')
        if (resolved.outcome !== 'resolved') continue
        for (const note of resolved.hook.notes) midi.push(note.midi)
      }
    }
    expect(midi.length).toBeGreaterThan(0)
    expect(Math.min(...midi)).toBeGreaterThanOrEqual(60)
    expect(Math.max(...midi)).toBeLessThanOrEqual(79)
    for (const hook of hardTechno.hooks) expect(hook.baseOctave, hook.id).toBe(4)
    // And the sub is where every sub in the library is.
    const sub = hardTechno.roles.find((r) => r.role === 'sub')
    expect(sub?.pitch).toEqual({ degree: 1, baseOctave: 1 })
  })

  it('gives the lead a hook and no grid, and the riser neither, on purpose (§4.3/#100, #473)', () => {
    const patterned = new Set(hardTechno.patterns.map((p) => p.forRole))
    const unpatterned = hardTechno.roles.filter((r) => !patterned.has(r.role)).map((r) => r.role)
    expect(unpatterned).toEqual(['lead', 'riser'])
    // Not flagged: both hooks are figures with their own rhythm, so there is no held note whose
    // re-articulation a variant could map (§4.3).
    for (const request of hardTechno.roles) expect(request.reArticulatesHook).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Characters, and where `hard` is earned
// ---------------------------------------------------------------------------

describe('asks for `hard` only where the library answers it (#538)', () => {
  it('names hard on the kick, the snare, the tom and the crash, and nowhere else', () => {
    const hard = hardTechno.roles.filter((r) => r.character === 'hard').map((r) => r.role).sort()
    expect(hard).toEqual(['impact', 'kick', 'snare', 'tom'])
    // Three of the four are the best-served `hard` roles in the library; the tom is the one
    // asked for knowing the cost, and #538's ledger in `reachability.test.ts` records it leaving.
    const boxesWith = (role: string, character: string) =>
      DEVICES.filter((d) => d.recipes.some((r) => r.role === role && r.character === character))
        .length
    expect(boxesWith('kick', 'hard')).toBeGreaterThanOrEqual(30)
    expect(boxesWith('snare', 'hard')).toBeGreaterThanOrEqual(20)
    expect(boxesWith('impact', 'hard')).toBeGreaterThanOrEqual(30)
    expect(boxesWith('tom', 'hard')).toBe(8)
  })

  it('is the only direction asking for a hard tom or a dirty lead', () => {
    const asks = (role: string, character: string) =>
      TEMPLATES.filter((t) =>
        t.roles.some((r) => r.role === role && r.character === character),
      ).map((t) => t.id)
    expect(asks('tom', 'hard')).toEqual(['hard-techno'])
    expect(asks('lead', 'dirty')).toEqual(['hard-techno'])
  })

  it('tunes the tom and not the kick (#339)', () => {
    expect(hardTechno.roles.find((r) => r.role === 'tom')?.followsKey).toBe(true)
    expect(hardTechno.roles.find((r) => r.role === 'kick')?.followsKey).toBeUndefined()
  })

  it('declares the ride, the crash and the riser inessential, and nothing optional (§4.4/#81)', () => {
    const inessential = hardTechno.roles
      .filter((r) => r.inessential !== undefined)
      .map((r) => r.role)
    expect(inessential.sort()).toEqual(['impact', 'ride', 'riser'])
    expect(hardTechno.roles.some((r) => r.optional === true)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The density knob moves phase 5
// ---------------------------------------------------------------------------

describe('the density knob changes what the reader programs (§6.3)', () => {
  it('asks a different arrangement at each detent', () => {
    const vector = (density: number) =>
      hardTechno.structure.map((s) => bandFor(hardTechno, s.name, moodState({ density })))
    expect(vector(DENSITY_DETENTS[0])).toEqual([0, 1, 2, 0, 1, 2, 0])
    expect(vector(DENSITY_DETENTS[1])).toEqual([0, 2, 3, 1, 2, 3, 0])
    expect(vector(DENSITY_DETENTS[2])).toEqual([1, 3, 3, 2, 3, 3, 1])
  })

  it('selects a different variant for every patterned part in the Build, sparse against busy', () => {
    const patterned = hardTechno.roles.filter((r) =>
      hardTechno.patterns.some((p) => p.forRole === r.role),
    )
    expect(patterned.length).toBe(8)
    for (const request of patterned) {
      const section: SectionName = request.role === 'impact' ? 'Drop' : 'Build'
      const at = (density: number) =>
        selectPattern(hardTechno, request, section, moodState({ density }))
      const sparse = at(DENSITY_DETENTS[0])
      const busy = at(DENSITY_DETENTS[2])
      expect(sparse.outcome, request.id).toBe('exact')
      expect(busy.outcome, request.id).toBe('exact')
      if (sparse.outcome === 'none' || busy.outcome === 'none') continue
      expect(sparse.pattern.id, request.id).not.toBe(busy.pattern.id)
      expect(busy.pattern.hits.length, request.id).toBeGreaterThan(sparse.pattern.hits.length)
    }
  })
})

// ---------------------------------------------------------------------------
// Fit: what one box achieves (#81), and the two refusals #539 predicted
// ---------------------------------------------------------------------------

describe('one box alone (§4.4/#81, #539)', () => {
  it('finishes whole on the grooveboxes and the samplers', () => {
    for (const id of [
      'roland-mc-101',
      'roland-mc-707',
      'synthstrom-deluge',
      'polyend-tracker-mini',
      'roland-sp-404mk2',
      'elektron-digitone-ii',
    ]) {
      const { result } = solo(id)
      expect(result.shortfalls.map((s) => s.requestId), id).toEqual([])
      expect(result.assignments, id).toHaveLength(10)
    }
  })

  /**
   * The allocation this direction's priorities exist to produce. #539 found a four-track box
   * dropping a direction's stated lead for an exact drum at equal priority; here the lead is the
   * priority-2 tonal part and the snare is priority 3, so four voices are the kick, the rumble,
   * the hats and the hook.
   */
  it('gives a four-track box the kick, the sub, the hats and the lead', () => {
    const { got, missing } = solo('elektron-digitone')
    expect([...got.keys()].sort()).toEqual(['r-closed-hat', 'r-kick', 'r-lead', 'r-sub'])
    expect(got.get('r-lead')).toBe('sub:bright')
    for (const id of ['r-snare', 'r-tom', 'r-open-hat']) {
      expect(missing.get(id)?.reason, id).toBe('no-room')
      expect(missing.get(id)?.kind, id).toBe('rig-limit')
    }
    for (const id of ['r-ride', 'r-impact', 'r-riser']) {
      expect(missing.get(id)?.kind, id).toBe('not-needed')
    }
  })

  it('refuses the Circuit Tracks a tom and the Octatrack a lead, because each authors only the opposite', () => {
    // §3.5 excludes the opposite character outright. The Circuit Tracks' only tom is `soft` and
    // the Octatrack's only lead is `clean`; both are `no-recipe`, which the guide files under
    // `Waiting on us` — a hard tom on that box is ours to author, not the reader's to buy.
    const tracks = solo('novation-circuit-tracks')
    expect(tracks.missing.get('r-tom')?.reason).toBe('no-recipe')
    expect(tracks.missing.get('r-tom')?.kind).toBe('unauthored')
    const characters = (deviceId: string, role: string) =>
      deviceById(deviceId)
        .recipes.filter((r) => r.role === role)
        .map((r) => r.character)
    expect(characters('novation-circuit-tracks', 'tom')).toEqual(['soft'])
    expect([...tracks.got.keys()].sort()).toEqual([
      'r-closed-hat',
      'r-kick',
      'r-lead',
      'r-open-hat',
      'r-snare',
      'r-sub',
    ])

    const octatrack = solo('elektron-octatrack-mkii')
    expect(octatrack.missing.get('r-lead')?.reason).toBe('no-recipe')
    expect(characters('elektron-octatrack-mkii', 'lead')).toEqual(['clean'])
    expect(octatrack.result.assignments).toHaveLength(9)
  })

  it('has exactly those two unauthored gaps across every box in the library, at four seeds', () => {
    const unauthored = new Set<string>()
    for (const device of DEVICES) {
      for (const seed of [1, 2, 3, 4]) {
        const { shortfalls } = resolve({ devices: [device], template: hardTechno, seed })
        for (const s of shortfalls) {
          if (s.reason === 'no-recipe') unauthored.add(`${device.id}/${s.requestId}`)
        }
      }
    }
    expect([...unauthored].sort()).toEqual([
      'elektron-octatrack-mkii/r-lead',
      'novation-circuit-tracks/r-tom',
    ])
  })

  it('leaves the drum machines without a lead, and says so as a limit rather than a backlog', () => {
    const drumMachines = [
      'roland-tr-8s',
      'roland-tr-1000',
      'behringer-rd-8',
      'elektron-analog-rytm-mkii',
    ]
    for (const id of drumMachines) {
      const { missing } = solo(id)
      expect(missing.get('r-lead')?.reason, id).toBe('no-capable-voice')
      expect(missing.get('r-lead')?.kind, id).toBe('rig-limit')
    }
  })
})
