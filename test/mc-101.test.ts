import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  realisationOf,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/roland-mc-101/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

const REFERENCE = 'MC-101 Reference Manual eng01, p.'
const UPDATE = 'MC-101 Update eng08, p.'

function pool(id: string) {
  const voice = device.voices.find((v) => v.id === id)
  if (voice === undefined || voice.kind !== 'pool') throw new Error(`no pool '${id}'`)
  return voice
}

function recipesOn(voice: string): Recipe[] {
  return device.recipes.filter((r) => r.voice === voice)
}

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

/** Every legality citation a recipe carries: a numeric's range, an enum's option set. */
function legality(recipe: Recipe): string[] {
  return params(recipe)
    .flatMap((p) =>
      p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : [],
    )
    .filter((v): v is { kind: 'manual' | 'observed'; source: string } => v !== undefined && v !== false)
    .map((v) => v.source)
}

describe('MC-101 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('spans 174 mm across the panel, cited to the manual that has a specifications table', () => {
    // The Reference Manual has none — it ends at the block diagram on p.89 — so the dimensions
    // are the Owner's Manual's to state, and this is one of only two values here cited to it.
    // Unlike the Tracker Mini the vendor's stated width really is the playing-orientation
    // horizontal span, because the MC-101 is a landscape box played lying flat.
    expect(device.physical.panelSpanMm).toBe(174)
    expect(device.physical.verified).toEqual({
      kind: 'manual',
      source: "MC-101 Owner's Manual eng02, p.19 (Main Specifications)",
    })
    // The depth, not the height: 58 mm is how far off the desk the box stands and is not a
    // panel dimension at all.
    expect(device.panel?.panelRiseMm).toBe(133)
  })

  it('keeps every drawn feature inside the published footprint, not inside the flat face', () => {
    // The p.4 figure is drawn at 1.74 while 174/133 is 1.31, because Roland's panel figures show
    // the flat face and crop the rounded shoulders (see `panel.ts`). The layout is measured on
    // the 174 x 100 flat-face scale and offset into the footprint, so nothing may spill.
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(174)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(133)
    }
    // The offset is real: nothing sits in the rear margin the flat-face reading leaves.
    expect(Math.min(...panel.features.map((f) => f.y))).toBeGreaterThanOrEqual(11)
  })

  // -------------------------------------------------------------------------
  // Section 2.1 — two pools, at the two granularities the box actually has
  // -------------------------------------------------------------------------

  it('declares a pad pool and a track pool, not four tracks', () => {
    expect(device.voices.map((v) => v.kind)).toEqual(['pool', 'pool'])
    expect(device.voices.map((v) => v.id)).toEqual(['drum-pad', 'tone-track'])
    expect(pool('drum-pad').count).toBe(8)
    expect(pool('tone-track').count).toBe(3)

    // A pad holds one instrument and sounds it one hit at a time (p.17). A TONE track is
    // polyphonic (`Mono/Poly`, p.45) and no manual states by how much, so 4 is a stated
    // judgement rather than a citation — see the manifest.
    expect(pool('drum-pad').polyphony).toBe(1)
    expect(pool('tone-track').polyphony).toBe(4)
  })

  it('sizes the pad pool above the busiest template, which is why 8 stands for 16', () => {
    // The kit really has sixteen pads. The pool declares eight because 2.1 bounds `count` by
    // what the resolver may *consider*: above the busiest template's demand the extra members
    // are unreachable and no guide exists that a larger count could produce and a smaller one
    // could not.
    //
    // Measured rather than asserted from memory, so a template that ever asks for a ninth
    // percussive part fails here — loudly, while it is being written — instead of quietly
    // losing a part on this device.
    const percussive = new Set<string>(pool('drum-pad').roles)
    const busiest = Math.max(
      ...TEMPLATES.map((t) => t.roles.filter((r) => percussive.has(r.role)).length),
    )
    expect(busiest).toBeGreaterThan(0)
    expect(pool('drum-pad').count).toBeGreaterThan(busiest)
    // And not wastefully above it: eight branches the search over eight idle pads already.
    expect(pool('drum-pad').count).toBeLessThanOrEqual(busiest + 2)
  })

  it('expands to 11 assignables in two pool namespaces', () => {
    const assignables = expand(device)
    expect(assignables).toHaveLength(11)
    expect(assignables.filter((a) => a.poolId === 'drum-pad').map((a) => a.voiceId)).toEqual([
      'drum-pad-1',
      'drum-pad-2',
      'drum-pad-3',
      'drum-pad-4',
      'drum-pad-5',
      'drum-pad-6',
      'drum-pad-7',
      'drum-pad-8',
    ])
    expect(assignables.filter((a) => a.poolId === 'tone-track').map((a) => a.voiceId)).toEqual([
      'tone-track-1',
      'tone-track-2',
      'tone-track-3',
    ])
    expect(assignables.every((a) => a.ordinal !== undefined && a.poolId !== undefined)).toBe(true)
  })

  it('splits the vocabulary between the two pools rather than overlapping them', () => {
    const pads = new Set<string>(pool('drum-pad').roles)
    const tracks = new Set<string>(pool('tone-track').roles)
    // Nothing is on both: a pad plays one sample at one pitch per hit, a track plays a part.
    expect([...pads].filter((r) => tracks.has(r))).toEqual([])
    // And between them they cover the whole vocabulary, which is what a sampler-plus-synth
    // groovebox is. A role missing from both would be a claim this box cannot make a sound.
    expect(pads.size + tracks.size).toBe(ROLES.length)
  })

  // -------------------------------------------------------------------------
  // Section 2.2 — pool-keyed recipe lookup
  // -------------------------------------------------------------------------

  it('addresses every recipe to a pool id, never to an expanded ordinal', () => {
    const poolIds = new Set(device.voices.map((v) => v.id))
    for (const recipe of device.recipes) expect(poolIds, recipe.id).toContain(recipe.voice)
    expect(recipesOn('drum-pad').length).toBeGreaterThan(0)
    expect(recipesOn('tone-track').length).toBeGreaterThan(0)
  })

  it('resolves one authored recipe from every ordinal in its pool', () => {
    const assignables = expand(device)
    for (const recipe of device.recipes) {
      const members = assignables.filter((a) => a.poolId === recipe.voice)
      expect(members.length, recipe.id).toBeGreaterThan(0)
      const notes = realisationOf(recipe) === 'sampled-chord' ? 3 : 1
      for (const member of members) {
        const where = `${recipe.id} on ${member.voiceId}`
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character, notes)
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  // -------------------------------------------------------------------------
  // Section 3 — the recipe library
  // -------------------------------------------------------------------------

  it('carries 15-20 recipes on distinct (role, character, voice, realisation) keys', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
    const keys = device.recipes.map((r) => `${r.role} ${r.character} ${r.voice} ${realisationOf(r)}`)
    expect(new Set(keys).size).toBe(keys.length)
    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
      expect(recipe.id.startsWith('mc101-'), recipe.id).toBe(true)
    }
    // All six characters are reached, so nothing asks for a flavour this box never shows.
    expect(new Set(device.recipes.map((r) => r.character)).size).toBe(CHARACTERS.length)
  })

  it('authors no recipe the resolver could never reach', () => {
    // Two shapes of decoration this device was tempted by and does not carry.
    //
    // The pad pool stops at 8 of the kit's 16 (asserted above). The other is a `sampled-chord`
    // twin of `mc101-stab-hard`: a chord baked into one WAV is real on a pitched-sampler track
    // (p.16), but §7.1 prefers a real polyphonic voice whenever both serve, and no authored hook
    // asks for more notes than this pool's polyphony. The twin would be unreachable by every
    // template in the library.
    const widest = Math.max(
      ...TEMPLATES.flatMap((t) =>
        (t.hooks ?? []).map((hook) => {
          const perStep = new Map<number, number>()
          for (const note of hook.notes) perStep.set(note.step, (perStep.get(note.step) ?? 0) + 1)
          return Math.max(...perStep.values())
        }),
      ),
    )
    expect(widest).toBeLessThanOrEqual(pool('tone-track').polyphony)
    expect(device.recipes.every((r) => realisationOf(r) === 'polyphonic-voice')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Section 3.2 — legality is cited, authority never is
  // -------------------------------------------------------------------------

  it('cites every range and option set, and no point', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
        // A documented bound for CUTOFF is not a citation for "CUTOFF sits at 20 for a stab".
        expect(param.verified, where).toBe(false)
        if (param.kind === 'numeric') {
          expect(param.range.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
          // No `step` is authored anywhere here: every one of this box's parameters is an
          // integer count on its own screen, so a granularity claim would be invented.
          expect(param.step, where).toBeUndefined()
        }
        if (param.kind === 'enum') {
          expect(param.options.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
    // Every point is taste, the one `text` param included — it instructs rather than picking
    // among legal values, and the instruction it gives is this recipe's idea, not a printed
    // procedure, so there is nothing to cite on it either.
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
  })

  it('cites only pages that exist in the document it names', () => {
    const sources = device.recipes.flatMap(legality)
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) {
      const page = Number(source.split('p.')[1]?.split(' ')[0])
      expect(Number.isInteger(page), source).toBe(true)
      if (source.startsWith(REFERENCE)) {
        // 89 content pages; the parameter and effect chapters run pp.45-88.
        expect(page, source).toBeGreaterThanOrEqual(4)
        expect(page, source).toBeLessThanOrEqual(89)
      } else if (source.startsWith(UPDATE)) {
        // 20 pages, and every citation into it names the firmware version it documents,
        // because a reader on the shipping firmware does not have that screen.
        expect(page, source).toBeGreaterThanOrEqual(1)
        expect(page, source).toBeLessThanOrEqual(20)
        expect(source, source).toMatch(/\(Ver\.\d+\.\d+\)$/)
      } else {
        throw new Error(`unknown document: ${source}`)
      }
    }
  })

  // -------------------------------------------------------------------------
  // What this box makes easy to get wrong
  // -------------------------------------------------------------------------

  it('never names an MFX type on a drum pad, because the kit MFX is shared', () => {
    // On a DRUM track MULTI FX belongs to the kit (p.34, p.46) — one effect for all sixteen
    // instruments. Two pad recipes each naming a type would describe a kit the box cannot
    // hold, and it would not fail anywhere until somebody stood at the machine.
    for (const recipe of recipesOn('drum-pad')) {
      expect(
        params(recipe).map((p) => p.name),
        recipe.id,
      ).not.toContain('MFX TYPE')
    }
    // What *is* per pad is whether that pad reaches the shared effect at all.
    const outAssigns = recipesOn('drum-pad').flatMap((r) =>
      params(r).filter((p) => p.name === 'OUT ASSIGN'),
    )
    expect(outAssigns.length).toBeGreaterThan(0)
    // And a tone track owns its own MFX, so naming one there is right.
    expect(recipesOn('tone-track').some((r) => params(r).some((p) => p.name === 'MFX TYPE'))).toBe(
      true,
    )
  })

  it('never mixes the part-offset layer with the Ver.1.80 partial layer in one recipe', () => {
    // p.45 is a set of *offsets* against a loaded tone; the Ver.1.80 partial editor is
    // absolute. A block listing `CUTOFF 20` beside `CUT 316` asks a reader to hold two meanings
    // of one word on one screen, and the offset only means anything against a preset the guide
    // does not name.
    for (const recipe of device.recipes) {
      const sources = legality(recipe)
      const partLayer = sources.some((s) => s === `${REFERENCE}45`)
      const partialLayer = sources.some((s) => s.startsWith(UPDATE))
      expect(partLayer && partialLayer, recipe.id).toBe(false)
    }
    // Both layers are actually used; this would pass vacuously if one had been dropped.
    expect(device.recipes.some((r) => legality(r).includes(`${REFERENCE}45`))).toBe(true)
    expect(device.recipes.some((r) => legality(r).some((s) => s.startsWith(UPDATE)))).toBe(true)
  })

  it('calls the drum probability lane `mute-probability`, because MTE is inverted', () => {
    // p.23: "MTE: Adjusts the probability that a mute note will sound. With a setting of 0, the
    // note sounds each time; higher values decrease the probability that the note will sound."
    // That is the inverse of the Deluge's `probability` and the Tracker Mini's `chance`, both
    // of which rise towards certainty. Named `probability` here, `80` would read as "usually
    // plays" and mean "usually does not".
    const perStep = device.features?.perStep ?? []
    expect(perStep).toContain('mute-probability')
    expect(perStep).not.toContain('probability')
    expect(perStep).not.toContain('chance')
  })

  it('keeps each step editor to the track type that has it', () => {
    // A TONE track's step editor is NOTE/VEL/STA/LEN (p.22); a DRUM track's is VEL/STA/MTE/SUB
    // (p.23). `features.perStep` is one device-level list and Zod only checks membership, so
    // nothing but this stops a drum recipe setting a note length.
    const toneOnly = new Set(['note-length'])
    const drumOnly = new Set(['mute-probability', 'sub-step'])
    for (const recipe of device.recipes) {
      const keys = (recipe.articulation ?? []).flatMap((a) => Object.keys(a.set))
      const forbidden = recipe.voice === 'drum-pad' ? toneOnly : drumOnly
      for (const key of keys) expect(forbidden.has(key), `${recipe.id} / ${key}`).toBe(false)
    }
  })

  it('uses every per-step lane it declares, and only declared ones', () => {
    const declared = new Set(device.features?.perStep ?? [])
    expect(declared.size).toBeGreaterThan(0)
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    for (const key of used) expect(declared, key).toContain(key)
    // A lane nobody reaches for is a claim about the box that no guide ever shows.
    expect([...declared].filter((k) => !used.has(k))).toEqual([])
  })

  it('addresses steps only by slot, and hints only through the device table', () => {
    const hintKeys = new Set(Object.keys(device.hints ?? {}))
    for (const recipe of device.recipes) {
      // Not "every recipe articulates something", which this used to assert. #108's reachability
      // check found `mc101-rim-clean` articulating `offbeat` on a role whose variants emit only
      // `backbeat`, `accent` and `ghost`, and removing a gesture no direction can fire leaves a
      // recipe with nothing per-step to say. That is the honest state, not a hole: what a device
      // may not do is *claim* a gesture, and an empty list claims none.
      // `min(1).optional()`: absent or non-empty, never an empty list claiming to be a list.
      expect(recipe.articulation?.length ?? 1, recipe.id).toBeGreaterThan(0)
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint !== undefined) {
          expect(hintKeys, `${recipe.id} / ${entry.hint}`).toContain(entry.hint)
        }
      }
    }
    // Invariant 7: a hint is a jog, not documentation.
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
  })

  it('carries the clip shuffle on every recipe, over its printed range', () => {
    // p.37: "Adjusts the strength of shuffle (bounce) for the playback timing. This can be set
    // individually for each clip." One setting per clip, so it appears under every part.
    for (const recipe of device.recipes) {
      const shuffle = params(recipe).find((p) => p.name === 'SHUFFLE')
      expect(shuffle, recipe.id).toBeDefined()
      if (shuffle?.kind !== 'numeric') throw new Error(`${recipe.id}: SHUFFLE is not numeric`)
      expect(shuffle.range.min, recipe.id).toBe(-50)
      expect(shuffle.range.max, recipe.id).toBe(50)
      expect(shuffle.mood, recipe.id).toEqual([{ axis: 'swing', amount: 50 }])
      // The manual prints no neutral, unlike the Tracker Mini's "50% is no swing". 0 at the
      // centre of a symmetric signed range is a reading, so it stays a provisional point and
      // the note claims nothing the page does not.
      expect(shuffle.verified, recipe.id).toBe(false)
    }
  })

  it('offers the mood axes as ordinary params, declining none by capability check', () => {
    // Section 6: a device declines an axis by having no param that declares it. Every axis here
    // is a real parameter with a cited range, so none of them is advertised and inert.
    const axes = new Set(
      device.recipes.flatMap((r) =>
        params(r).flatMap((p) => (p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [])),
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })
})
