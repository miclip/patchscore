import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  moodState,
  realisationOf,
  resolveParams,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import {
  DUPLICATED_SYNTH_RECIPES,
  SYNTH_SLOTS,
  device,
} from '../lib/devices/polyend-tracker-mini/index'
import { auditDevice } from '../scripts/audit-verified'

const CITE_PREFIX = 'Polyend Tracker Mini Manual 2.2.1b, p.'

function pool(id: string) {
  const voice = device.voices.find((v) => v.id === id)
  if (voice === undefined || voice.kind !== 'pool') throw new Error(`no pool '${id}'`)
  return voice
}

function recipesOn(voice: string): Recipe[] {
  return device.recipes.filter((r) => r.voice === voice)
}

/** Everything a twin must carry identically. `id`, `voice` and `routing` are what may differ. */
function twinShape(r: Recipe) {
  const { id: _id, voice: _voice, routing: _routing, ...rest } = r
  return rest
}

describe('Tracker Mini manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('spans 130 mm across the panel, not the 170 mm Polyend calls its width (§10)', () => {
    // The p.13 drawing dimensions the panel directly: 130 mm horizontal, 170 mm down the long
    // edge, 20 mm thick. Polyend's specifications call 170 mm the width, but that is the panel's
    // *vertical* span in playing orientation — the Tracker Mini is portrait. Authoring 170 would
    // draw it lying on its side and shrink every other panel against it.
    expect(device.physical.panelSpanMm).toBe(130)
    expect(device.physical.panelSpanMm).not.toBe(170)
    expect(device.physical.verified).toEqual({
      kind: 'manual',
      source: 'Polyend Tracker Mini Manual 2.2.1b, p.13 (Hardware Overview)',
    })
  })

  // -------------------------------------------------------------------------
  // The two pools — the reason this device is in the build (§2.1)
  // -------------------------------------------------------------------------

  it('declares 16 tracks as two pools of 8, not 8 tracks (p.22)', () => {
    expect(device.voices).toHaveLength(2)
    expect(device.voices.map((v) => v.kind)).toEqual(['pool', 'pool'])
    expect(device.voices.map((v) => v.id)).toEqual(['track-sample', 'track-synth'])
    expect(pool('track-sample').count).toBe(8)
    expect(pool('track-synth').count).toBe(8)

    // One track sounds one voice (p.104). The synth slots' 8-voice budget is a different
    // quantity and must not leak in here (§12.4: polyphony counts notes, never roles).
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
  })

  it('expands to 16 assignables in two pool namespaces (§2.2)', () => {
    const assignables = expand(device)
    expect(assignables).toHaveLength(16)

    expect(assignables.filter((a) => a.poolId === 'track-sample').map((a) => a.voiceId)).toEqual([
      'track-sample-1', 'track-sample-2', 'track-sample-3', 'track-sample-4',
      'track-sample-5', 'track-sample-6', 'track-sample-7', 'track-sample-8',
    ])
    expect(assignables.filter((a) => a.poolId === 'track-synth').map((a) => a.voiceId)).toEqual([
      'track-synth-1', 'track-synth-2', 'track-synth-3', 'track-synth-4',
      'track-synth-5', 'track-synth-6', 'track-synth-7', 'track-synth-8',
    ])
    // Every one carries an ordinal and its pool id, so occupancy and recipe lookup stay apart.
    expect(assignables.every((a) => a.ordinal !== undefined && a.poolId !== undefined)).toBe(true)
  })

  it('gives the two pools different roles, the synth pool a strict subset (p.22)', () => {
    const samples = new Set<string>(pool('track-sample').roles)
    const synths = new Set<string>(pool('track-synth').roles)

    // Tracks 1-8 take sample instruments, synths or MIDI: anything at all.
    expect(samples.size).toBe(ROLES.length)
    // Tracks 9-16 take synths and MIDI only. Strictly fewer, and strictly contained.
    expect(synths.size).toBeLessThan(samples.size)
    expect([...synths].filter((r) => !samples.has(r))).toEqual([])

    // Exactly one role needs recorded audio and so cannot exist on tracks 9-16. Everything
    // else, the whole drum kit included, is reachable from the five synth engines (PERC is a
    // drum machine in a synth slot, p.146). A role is what this box sounds *itself*: a MIDI
    // track addresses another device, which carries its own assignables.
    expect([...samples].filter((r) => !synths.has(r))).toEqual(['vox-chop'])
  })

  // -------------------------------------------------------------------------
  // Pool-keyed recipe lookup (§2.2)
  // -------------------------------------------------------------------------

  it('addresses every recipe to a pool id, never to an expanded track', () => {
    const poolIds = new Set(device.voices.map((v) => v.id))
    for (const recipe of device.recipes) {
      expect(poolIds, recipe.id).toContain(recipe.voice)
    }
    // Both pools are actually reached; a pool with no recipe would be a silent hole.
    expect(recipesOn('track-sample').length).toBeGreaterThan(0)
    expect(recipesOn('track-synth').length).toBeGreaterThan(0)
  })

  it('resolves one authored recipe from every ordinal in its pool (§2.2)', () => {
    // The point of keying on `poolId ?? voiceId`: one recipe serves all eight tracks. If this
    // broke, pools would just relocate the duplication instead of removing it.
    //
    // Asked for by realisation as well as by (role, character), because §3's key now carries it
    // (§12.4) and `pad + soft` on `track-sample` is authored twice — once as a VAP patch, once
    // as a chord sample. Asking without saying which one you mean has a right answer (§7.1
    // prefers the real voice) but it is not the question this test is about.
    const assignables = expand(device)
    for (const recipe of device.recipes) {
      const members = assignables.filter((a) => a.poolId === recipe.voice)
      expect(members, recipe.id).toHaveLength(8)
      const notes = realisationOf(recipe) === 'sampled-chord' ? 3 : 1
      for (const member of members) {
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character, notes)
        const where = `${recipe.id} on ${member.voiceId}`
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  it('keeps every sample-based recipe on the sample pool', () => {
    // A sample-based recipe is one that sets PLAY MODE — the parameter that only exists for a
    // sample instrument (p.127). Identified by what the recipe actually authors, not by whether
    // the resolver happens to substitute something else on the other pool.
    const sampleBased = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some((p) => p.name === 'PLAY MODE'),
    )
    expect(sampleBased.length).toBeGreaterThan(0)
    for (const recipe of sampleBased) {
      expect(recipe.voice, `${recipe.id} sets PLAY MODE`).toBe('track-sample')
    }

    // And the converse: nothing on tracks 9-16 sets it, because those tracks cannot load a
    // sample instrument at all (p.22).
    for (const recipe of recipesOn('track-synth')) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      expect(names, recipe.id).not.toContain('PLAY MODE')
      expect(names, recipe.id).toContain('MODEL')
    }
  })

  // -------------------------------------------------------------------------
  // The cross-pool duplication — step 4's cost, pinned
  // -------------------------------------------------------------------------

  it('duplicates every synth recipe across both pools, and counts the cost', () => {
    const twinned = recipesOn('track-synth')
    expect(twinned).toHaveLength(DUPLICATED_SYNTH_RECIPES)

    // 3 recipes authored once and carried twice: exactly what an engine allowing a recipe to
    // name several pools would save today. If this number grows, the schema change gets
    // cheaper — which is the whole reason it is asserted rather than described.
    expect(DUPLICATED_SYNTH_RECIPES).toBe(3)

    for (const synthRecipe of twinned) {
      // Matched on realisation too, because `pad + soft` on the sample pool is now authored
      // twice (§3, §12.4) and the chord-sample one is not a twin of anything — it is the sample
      // pool's own recipe, which is exactly why it does not appear on `track-synth`.
      const twin = recipesOn('track-sample').find(
        (r) =>
          r.role === synthRecipe.role &&
          r.character === synthRecipe.character &&
          realisationOf(r) === realisationOf(synthRecipe),
      )
      expect(twin, `${synthRecipe.id} has no track-sample twin`).toBeDefined()
      // Identical but for id, voice and routing — the twins cannot drift apart.
      expect(twinShape(twin as Recipe)).toEqual(twinShape(synthRecipe))
      expect((twin as Recipe).id).not.toBe(synthRecipe.id)
      expect((twin as Recipe).routing).not.toBe(synthRecipe.routing)
    }
  })

  it('keeps sample-only step FX off the synth pool', () => {
    // `reverse-sample` (p.196), like Position and Slice, exists only for a sample instrument.
    // Nothing in the schema knows that, so it is asserted here.
    const SAMPLE_ONLY_FX = ['reverse-sample']
    for (const recipe of recipesOn('track-synth')) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(SAMPLE_ONLY_FX, `${recipe.id} sets ${key}`).not.toContain(key)
        }
      }
    }
    // And it is genuinely used somewhere, or the assertion above is testing nothing.
    const usedOnSamples = new Set(
      recipesOn('track-sample').flatMap((r) =>
        (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
      ),
    )
    for (const key of SAMPLE_ONLY_FX) expect(usedOnSamples).toContain(key)
  })

  /**
   * §3/#101. **Every sample-playing recipe says what audio to load.**
   *
   * The engine cannot check this: nothing in the manifest says whether a voice plays a file or
   * generates its own sound, and `voice: 'track-sample'` is not the answer — three of the synth
   * twins sit on that pool too, because tracks 1-8 host synths as readily as tracks 9-16. What
   * separates them is `PLAY MODE`, which is a sample-instrument parameter (p.127) and appears on
   * no synth recipe. So the rule keys on that, and it is an authoring rule enforced here for the
   * same reason the three-synth-slot cap is.
   *
   * Before #101, thirteen of these fifteen said nothing at all, and `tm-texture-soft` resolved a
   * granular play mode, a filter, a grain length and a reverb send without ever naming what was
   * being granulated.
   */
  it('says what audio to load on every sample-playing recipe (§3/#101)', () => {
    const sampleRecipes = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some((p) => p.name === 'PLAY MODE'),
    )
    expect(sampleRecipes.length).toBeGreaterThan(10)
    for (const recipe of sampleRecipes) {
      expect(recipe.sourceAudio, recipe.id).toBeDefined()
      // A phrase a reader can search their own folders with, not a category we invented.
      expect((recipe.sourceAudio?.need ?? '').split(/\s+/).length, recipe.id).toBeGreaterThan(5)
    }
    // The other side of the rule: a synth patch has nothing to load and must not pretend to.
    for (const recipe of device.recipes) {
      if (!(recipe.params as AuthoredParam[]).some((p) => p.name === 'MODEL')) continue
      expect(recipe.sourceAudio, recipe.id).toBeUndefined()
    }
  })

  /**
   * The one place on this box where a source has a *documented* preparation, and the reason
   * `sourceAudio` splits its two claims. The procedure is p.104's, printed in full; which
   * recording to feed it is the reader's and is cited nowhere, because no page states it.
   */
  it('cites the render procedure and never the choice of sample (§3/#101)', () => {
    for (const id of ['tm-pad-soft-chord', 'tm-stab-hard-chord']) {
      const recipe = device.recipes.find((r) => r.id === id) as Recipe
      const source = recipe.sourceAudio
      expect(source?.prep?.text, id).toContain('p.104')
      expect(source?.prep?.verified, id).toEqual({
        kind: 'manual',
        source: 'Polyend Tracker Mini Manual 2.2.1b, p.104',
      })
      // Nowhere for a citation to attach to the need, by construction — the shape has no slot
      // for one, which is the repair. Before this, the page sat on a text param's point.
      expect(Object.keys(source ?? {}).sort()).toEqual(['need', 'prep'])
    }
    // And `INSTRUMENT` — the text param whose *point* carried p.104 — is gone for good. Text
    // params exist again on this box (#102), but for the opposite reason: they are the settings
    // the manual prints no scale for, so they claim nothing. Asserted by name, because "no text
    // param anywhere" was never the rule that mattered — "no citation on a text point" is, and
    // it is asserted below.
    for (const recipe of device.recipes) {
      for (const param of recipe.params as AuthoredParam[]) {
        expect(param.name, recipe.id).not.toBe('INSTRUMENT')
      }
    }
  })

  /**
   * §6.11/#102. **A Granular recipe sets all four of the mode's core parameters, and makes the
   * position move.**
   *
   * p.142: *"The granular play mode ... consists of four core parameters"* — Position, Length,
   * Shape, Loop — and of those, *"The position parameter is what brings out the its sonic
   * character"*. p.142 again, and p.143 in full: *"Modulating grain position is at the heart of
   * the Tracker Mini's implementation of granular synthesis where an LFO or envelope can be
   * used."*
   *
   * `tm-texture-soft` set `LENGTH` and nothing else granular, which resolved a template called
   * Drone Study down to one voice running static grains. Length alone is the one of the four the
   * page calls least interesting.
   *
   * Written as a rule over every Granular recipe rather than as a check on this one, because the
   * next granular recipe somebody authors has exactly the same hole available to it. Nothing in
   * the engine can catch this: `PLAY MODE` is an ordinary enum and the resolver has no idea that
   * one of its options changes which other parameters mean anything.
   */
  it("sets all four granular core parameters and modulates the position (§6.11/#102)", () => {
    const granular = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some((p) => p.name === 'PLAY MODE' && p.value === 'Granular'),
    )
    expect(granular.length).toBeGreaterThan(0)

    for (const recipe of granular) {
      const params = recipe.params as AuthoredParam[]
      const by = (name: string) => params.find((p) => p.name === name)

      // The four of p.142, all present.
      for (const name of ['POSITION', 'LENGTH', 'SHAPE', 'LOOP']) {
        expect(by(name), `${recipe.id} / ${name}`).toBeDefined()
      }

      // Two of them are option sets the page prints in its own Range column, and they are the
      // whole set — narrowing to what is authored would hide the mode.
      const shape = by('SHAPE')
      if (shape?.kind !== 'enum') throw new Error(`${recipe.id}: SHAPE should be an enum`)
      expect(shape.options.values).toEqual(['Square', 'Triangle', 'Gauss'])
      expect(shape.options.verified).toEqual({ kind: 'manual', source: `${CITE_PREFIX}142` })

      const loop = by('LOOP')
      if (loop?.kind !== 'enum') throw new Error(`${recipe.id}: LOOP should be an enum`)
      expect(loop.options.values).toEqual(['Forward', 'Reverse', 'Pingpong'])
      expect(loop.options.verified).toEqual({ kind: 'manual', source: `${CITE_PREFIX}142` })

      // Position is the one parameter here with no scale to cite. p.142's Range column reads
      // "Variable" — it is the loaded sample's own length — so it is a text param and
      // provisional, never a numeric over bounds nobody printed (invariant 5).
      const position = by('POSITION')
      expect(position?.kind, recipe.id).toBe('text')
      expect(position?.verified, recipe.id).toBe(false)

      // And it moves. Type, shape, speed and amount: four settings, because "add an LFO" is not
      // something a reader can do at the machine without all four.
      const type = by('POSITION AUTOMATION TYPE')
      if (type?.kind !== 'enum') throw new Error(`${recipe.id}: AUTOMATION TYPE should be an enum`)
      expect(type.value).toBe('LFO')
      // Off is one of the three, and it is the state this recipe was in before #102.
      expect(type.options.values).toEqual(['Off', 'Envelope', 'LFO'])
      expect(type.options.verified).toEqual({ kind: 'manual', source: `${CITE_PREFIX}121` })
      const lfoShape = by('POSITION LFO SHAPE')
      if (lfoShape?.kind !== 'enum') throw new Error(`${recipe.id}: LFO SHAPE should be an enum`)
      expect(lfoShape.options.values).toEqual(['Rev Saw', 'Saw', 'Triangle', 'Square', 'Random'])
      expect(lfoShape.options.verified).toEqual({ kind: 'manual', source: `${CITE_PREFIX}121` })

      // p.123's speed table in full, read down its six columns. The complete list, footnote and
      // all: the 128-to-32 entries are unavailable only when the destination is volume, and this
      // destination is Granular Position.
      const speed = by('POSITION LFO SPEED')
      if (speed?.kind !== 'enum') throw new Error(`${recipe.id}: LFO SPEED should be an enum`)
      expect(speed.options.values).toHaveLength(29)
      expect(speed.options.values[0]).toBe('128')
      expect(speed.options.values.at(-1)).toBe('1/64')
      expect(speed.options.verified).toEqual({ kind: 'manual', source: `${CITE_PREFIX}123` })

      // The amount is the second parameter on this box with no printed scale. p.126's "0-100%"
      // is the *envelope's* Amount, stated in the envelope's own subsection, and the same field
      // means something else with Type set to LFO — so it is uncited here rather than borrowed
      // off a scale that is not in force.
      const amount = by('POSITION LFO AMOUNT')
      expect(amount?.kind, recipe.id).toBe('text')
      expect(amount?.verified, recipe.id).toBe(false)

      // The grain's Shape and the LFO's Shape are two different controls on two different pages
      // and must not collide on one name — the guide prints these as a flat list.
      expect(new Set(params.map((p) => p.name)).size).toBe(params.length)

      // A part that gets retriggered needs a level to hold at and a tail to leave on, not just
      // a fade-in. Both cited to p.126, which prints "Range 0-100%" and "Range 0-10 Seconds".
      const sustain = by('ENV SUSTAIN')
      if (sustain?.kind !== 'numeric') throw new Error(`${recipe.id}: ENV SUSTAIN is numeric`)
      expect(sustain.range).toEqual({ min: 0, max: 100, verified: { kind: 'manual', source: `${CITE_PREFIX}126` } })
      const release = by('ENV RELEASE')
      if (release?.kind !== 'numeric') throw new Error(`${recipe.id}: ENV RELEASE is numeric`)
      expect(release.range).toEqual({ min: 0, max: 10, verified: { kind: 'manual', source: `${CITE_PREFIX}126` } })
    }
  })

  // -------------------------------------------------------------------------
  // Content and citation discipline (§3.1, §3.2)
  // -------------------------------------------------------------------------

  it('carries 15-21 recipes on distinct (role, character, voice, realisation) keys (§3)', () => {
    // The upper bound moved from 20 to 21 with `tm-stab-hard-note` (#40). It is a guideline about
    // authoring effort — "roughly 15-20 recipes covers a device well" — not a fact about the box,
    // and the one it makes room for is the second half of a pair the ranking needs both halves of:
    // a stab that is *played* across three tracks beside the one that is *loaded* as a chord.
    // The bound that is a fact about the box is the synth-slot one below, and that has not moved.
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(21)

    const keys = device.recipes.map(
      (r) => `${r.role}\u0000${r.character}\u0000${r.voice}\u0000${realisationOf(r)}`,
    )
    expect(new Set(keys).size).toBe(keys.length)

    // And the pair that made realisation part of the key: one soft pad on the sample pool,
    // authored twice because it is two jobs — play the chord, or load it (§12.4).
    const softPads = device.recipes.filter(
      (r) => r.role === 'pad' && r.character === 'soft' && r.voice === 'track-sample',
    )
    expect(softPads.map((r) => realisationOf(r)).sort()).toEqual([
      'polyphonic-voice',
      'sampled-chord',
    ])

    // Two recipes sharing (role, character) on *different* pools is the whole point, and is
    // exactly what the old per-device key rejected.
    const pairs = device.recipes.map((r) => `${r.role}\u0000${r.character}`)
    expect(new Set(pairs).size).toBeLessThan(pairs.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        const where = `${recipe.id} / ${param.name}`
        // A documented bound for CUTOFF is not a citation for "CUTOFF sits at 46 for a dark
        // kick". Written at every site rather than inherited, so a later citation on the
        // recipe cannot promote values nobody checked.
        expect(param.verified, where).toBe(false)
        expect(param.range.verified, where).toMatchObject({
          kind: 'manual',
          source: expect.stringContaining(CITE_PREFIX),
        })
        // A step is a *granularity*, not a claim, so it needs no citation — but it must not
        // appear on a parameter whose grid nobody has a reason to believe. Seconds are the
        // one case here: the manual prints their bounds to two decimals (p.126).
        if (param.unit === 'Sec') expect(param.step, where).toBe(0.01)
        else expect(param.step, where).toBeUndefined()
      }

      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'enum') continue
        const where = `${recipe.id} / ${param.name}`
        // The two gates, on an enum. The option set is legality and is cited; the selection is
        // authority and is taste. Asserting them apart is what stops the citation drifting back
        // onto the param, where it would claim the choice was checked.
        expect(param.options.verified, where).toMatchObject({
          kind: 'manual',
          source: expect.stringContaining(CITE_PREFIX),
        })
        expect(param.verified, where).toBe(false)
        expect(param.options.values, where).toContain(param.value)
        expect(param.options.values.length, where).toBeGreaterThan(1)
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)

    // No *setting* is cited on its point, enums included: `verified` there is a claim about the
    // selected value, and every selection here is taste. The option sets carry their own
    // citations, asserted below.
    const settings = device.recipes.flatMap((r) =>
      (r.params as AuthoredParam[]).filter((p) => p.kind !== 'text'),
    )
    expect(settings.every((p) => p.verified === false)).toBe(true)

    // A text param is the one shape where a citation *could* legitimately land on the point: it
    // has no legality gate of its own — no range, no option set — so a documented procedure
    // would have nowhere else to go. None here does. Both exist because the manual prints no
    // scale for them (#102), which is the opposite of a documented procedure, so every point on
    // this box is provisional and `manualPoints` is zero. The identity
    // `params = manualPoints + observedPoints + provisionalPoints` makes that one assertion.
    const texts = device.recipes.flatMap((r) =>
      (r.params as AuthoredParam[]).filter((p) => p.kind === 'text'),
    )
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.every((p) => p.verified === false)).toBe(true)
    expect(counts.manualPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
  })

  it('cites a page that exists in the manual, and never page 0', () => {
    const legality = device.recipes.flatMap((r) =>
      (r.params as AuthoredParam[]).flatMap((p) =>
        p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : [],
      ),
    )
    const pages = legality
      .filter((v) => v !== undefined && v !== false)
      .map((v) => Number((v as { source: string }).source.split('p.')[1]))
    expect(pages.length).toBeGreaterThan(0)
    for (const page of pages) {
      expect(Number.isInteger(page)).toBe(true)
      // The manual runs to p.343; the parameter chapters start at p.113.
      expect(page).toBeGreaterThanOrEqual(13)
      expect(page).toBeLessThanOrEqual(343)
    }
  })

  it('never authors Volume, whose printed lower bound is -inf dB (p.116)', () => {
    // The range is real and the manual states it; it just is not a finite number, and inventing
    // a floor to make it fit would be an invented claim (invariant 5).
    for (const recipe of device.recipes) {
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        expect(Number.isFinite(param.range.min), `${recipe.id} / ${param.name}`).toBe(true)
        expect(Number.isFinite(param.range.max), `${recipe.id} / ${param.name}`).toBe(true)
        expect(param.name, recipe.id).not.toBe('VOLUME')
      }
    }
  })

  it('authors at most three distinct synth recipes, one per project synth slot', () => {
    // **The project has three synth slots (p.32, p.146), shared across all sixteen tracks.**
    // The limit is on distinct recipes, not on tracks: the same patch on several tracks still
    // occupies one slot, so three recipes spread over sixteen tracks is realisable, while a
    // fourth distinct synth recipe describes a state the box cannot hold — every guide the
    // resolver can produce from it would be unbuildable.
    //
    // The engine has no concept of a device-global shared resource, so this is enforced at
    // authoring time, where it is cheap and checkable, rather than at resolve time.
    const distinct = new Set(
      device.recipes
        .filter((r) => (r.params as AuthoredParam[]).some((p) => p.name === 'MODEL'))
        .map((r) => `${r.role} ${r.character}`),
    )
    expect(SYNTH_SLOTS).toBe(3)
    expect(distinct.size).toBeLessThanOrEqual(SYNTH_SLOTS)

    // MODEL still offers all five engines. The options are what the box has; narrowing them to
    // what happens to be authored would hide the rest of the device.
    for (const recipe of device.recipes) {
      const model = (recipe.params as AuthoredParam[]).find((p) => p.name === 'MODEL')
      if (model === undefined) continue
      if (model.kind !== 'enum') throw new Error(`${recipe.id}: MODEL should be an enum`)
      expect(model.options.values).toEqual(['ACD', 'FAT', 'VAP', 'WTFM', 'PERC'])
    }

    // `acid` is legal on both pools and authored on neither, because the third slot went
    // elsewhere — a gap shown, not filled (§5).
    expect(new Set<string>(pool('track-sample').roles)).toContain('acid')
    expect(device.recipes.some((r) => r.role === 'acid')).toBe(false)
  })

  it('addresses steps only by PatternSlot, and uses every per-step feature it declares', () => {
    // Narrowed to the articulation, which is the only place an absolute index could appear:
    // `AuthoredNumericParam.step` is a knob's *granularity* and has nothing to do with a
    // sequencer step, so scanning the whole manifest for the word caught the wrong thing.
    const articulation = JSON.stringify(device.recipes.map((r) => r.articulation ?? []))
    expect(articulation).not.toContain('"step"')
    expect(articulation).not.toContain('"hits"')
    expect(JSON.stringify(device)).not.toContain('"hits"')

    const perStep = device.features?.perStep ?? []
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect([...used].filter((k) => !perStep.includes(k))).toEqual([])
    expect(perStep.filter((k) => !used.has(k))).toEqual([])
  })

  it('gives every recipe something to set', () => {
    for (const recipe of device.recipes) {
      const numerics = (recipe.params as AuthoredParam[]).filter((p) => p.kind === 'numeric')
      expect(numerics.length, recipe.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('offers the swing axis on the pattern Swing FX, over its printed range (§6.1)', () => {
    // This test asserted the opposite until #62 was re-read against the manual. "Swing on this
    // box is a step FX and a pattern property, not an instrument parameter" was the reasoning,
    // and the hole in it is that a pattern property with a printed range is *exactly* what §6.1
    // moves: p.185 gives bounds and neutral both — "50% is no swing. Range is 25% to 75%".
    const axes = new Set(
      device.recipes.flatMap((r) =>
        (r.params as AuthoredParam[]).flatMap((p) =>
          p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [],
        ),
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })

  it('sits at the neutral the manual prints, and says so without badging it as authority', () => {
    // p.185 prints where the neutral *is* ("50% is no swing"). It does not say that a soft pad
    // should sit there. §3.2 splits those: the range is legality and carries the citation, the
    // point is authority and is taste. So the fact reaches the reader through the cited range
    // and the note — the same way `EQ BASS AMOUNT`'s "25 is neutral" does on the Deluge — and
    // the point stays provisional, which is this file's stated citation regime for every point.
    for (const recipe of device.recipes) {
      const swing = (recipe.params as AuthoredParam[]).find((p) => p.name === 'SWING')
      if (swing?.kind !== 'numeric') throw new Error(`${recipe.id}: SWING is not numeric`)
      expect(swing.value, recipe.id).toBe(50)
      expect(swing.note, recipe.id).toContain('50% is no swing')
      expect(swing.verified, recipe.id).toBe(false)
      expect(swing.range.verified, recipe.id).toMatchObject({ kind: 'manual' })
    }
  })

  it('carries pattern swing on every recipe, because it is one setting for the pattern', () => {
    for (const recipe of device.recipes) {
      const swing = (recipe.params as AuthoredParam[]).find((p) => p.name === 'SWING')
      expect(swing, recipe.id).toBeDefined()
      if (swing?.kind !== 'numeric') throw new Error(`${recipe.id}: SWING is not numeric`)
      expect(swing.value, recipe.id).toBe(50)
      expect({ min: swing.range.min, max: swing.range.max }).toEqual({ min: 25, max: 75 })
      // Amount == the distance to each bound, so the whole knob moves it and none of the travel
      // is spent against a clamp (§6.1).
      expect(swing.mood).toEqual([{ axis: 'swing', amount: 25 }])
      expect(swing.note, recipe.id).toContain('whole pattern')
    }
  })
})

// ---------------------------------------------------------------------------
// Seconds are authored and moved in hundredths
// ---------------------------------------------------------------------------

describe('time parameters (§6.1)', () => {
  function numerics(): AuthoredParam[] {
    return device.recipes
      .flatMap((r) => r.params as AuthoredParam[])
      .filter((p) => p.kind === 'numeric')
  }

  it('declares a hundredth step on every parameter measured in seconds', () => {
    const seconds = numerics().filter((p) => p.kind === 'numeric' && p.unit === 'Sec')
    expect(seconds.length).toBeGreaterThan(0)
    for (const p of seconds) {
      // The manual prints these bounds to two decimals (p.126), so a hundredth is the grid the
      // box works on. Without it §6.1 rounds to the default step of 1 — whole seconds.
      expect(p.kind === 'numeric' && p.step, p.name).toBe(0.01)
    }
  })

  it('moves a decay by hundredths rather than rounding it to a whole second', () => {
    const kick = device.recipes.find((r) => r.id === 'tm-kick-hard') as Recipe
    const at = (density: number) =>
      resolveParams(kick, moodState({ density })).find((p) => p.name === 'ENV DECAY')?.value

    // Authored 0.28, moved -0.09 at full density. A step of 1 would give 0 at every setting.
    expect(at(0)).toBe(0.37)
    expect(at(50)).toBe(0.28)
    expect(at(100)).toBe(0.19)
  })

  it('leaves no authored value unreachable on its own declared grid', () => {
    // A step the authored point does not sit on means the value cannot be dialled in as
    // written, which is an authoring error rather than a resolver one.
    for (const p of numerics()) {
      if (p.kind !== 'numeric' || p.step === undefined) continue
      const steps = p.value / p.step
      expect(Math.abs(steps - Math.round(steps)), `${p.name} ${p.value} on step ${p.step}`)
        .toBeLessThan(1e-9)
    }
  })
})
