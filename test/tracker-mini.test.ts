import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  assign,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  reachableSlots,
  realisationOf,
  renderGuide,
  resolve,
  resolveParams,
  resolveRecipe,
  type AuthoredParam,
  type Character,
  type Recipe,
  type Role,
  type Template,
} from '../lib/core/index'
import {
  DUPLICATED_SYNTH_RECIPES,
  SYNTH_SLOTS,
  device,
} from '../lib/devices/polyend-tracker-mini/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
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

/**
 * §2.3/#25. A bare two-section template carrying the given requests, all required and all at one
 * priority, for the synth-slot cases below. Hand-built rather than borrowed from `TEMPLATES`:
 * those are musical statements that will change, and a test about how many patches load must not
 * fail because a direction gained a part.
 */
function synthTemplate(
  roles: { id: string; role: Role; character: Character; polyphony?: number }[],
): Template {
  return {
    id: 'tm-slot-probe',
    name: 'Slot probe',
    bpm: { min: 120, max: 140, default: 130 },
    keys: ['A minor'],
    structure: [
      { name: 'Intro', bars: 16, energy: 0.3 },
      { name: 'Drop', bars: 32, energy: 0.9 },
    ],
    harmony: { cycleBars: 8, progression: [{ degree: 'i', bars: 8 }] },
    hooks: [],
    patterns: [],
    roles: roles.map((r) => ({ ...r, priority: 1, sustain: 'continuous' as const })),
  }
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

    // 4 recipes authored once and carried twice: exactly what an engine allowing a recipe to
    // name several pools would save today. If this number grows, the schema change gets
    // cheaper — which is the whole reason it is asserted rather than described. It went 3 to 4
    // when the synth-slot authoring cap became a declared resource (§2.3/#25) and `acid + dirty`
    // could finally be written.
    expect(DUPLICATED_SYNTH_RECIPES).toBe(4)

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
      const sustain = by('ENVELOPE \u00b7 SUSTAIN')
      if (sustain?.kind !== 'numeric') throw new Error(`${recipe.id}: ENVELOPE \u00b7 SUSTAIN is numeric`)
      expect(sustain.range).toEqual({ min: 0, max: 100, verified: { kind: 'manual', source: `${CITE_PREFIX}126` } })
      const release = by('ENVELOPE \u00b7 RELEASE')
      if (release?.kind !== 'numeric') throw new Error(`${recipe.id}: ENVELOPE \u00b7 RELEASE is numeric`)
      expect(release.range).toEqual({ min: 0, max: 10, verified: { kind: 'manual', source: `${CITE_PREFIX}126` } })
    }
  })

  /**
   * §4.3. **A fade-in longer than the gap between strikes is *stated*, not capped.**
   *
   * `tm-texture-soft` fades in over 1.8 Sec and the directions that request `texture` re-strike
   * it as often as their busiest band says to, which at the top of the range is faster than the
   * fade-in completes. Every strike after the first therefore begins while the last one is still
   * rising: the part swells rather than articulating, and the busiest band sounds much like the
   * sparsest one.
   *
   * Three things could answer that and only one of them is right here. **Capping the band** would
   * put a device's envelope in charge of a direction's rhythm, which is invariant 3 backwards.
   * **A cross-layer authoring check** — device attack against template inter-strike gap, in
   * `reachability.ts`'s spirit — would be a real check of a fact nobody can act on: the attack is
   * what makes this recipe a bed, the step map is what makes the part a part, and neither is the
   * defect. So the answer is the guide's: **the recipe says what the interaction is**, and the
   * reader standing at the box, holding both halves, decides.
   *
   * Asserted several ways, because the sentence is worthless if any one of them lapses: it
   * carries its own value so prose and knob cannot drift apart, it **poses no unresolved
   * comparison** (#155), it says which outcome is deliberate and what to do for the other, it
   * names no direction (invariant 3), and it actually reaches a reader — a note the renderer
   * drops settles nothing.
   *
   * **#155 changed what the note is for, not how much it may say.** The defect was never the
   * word count or the digits: it was the *shape*. "Re-strikes closer together than 1.8 Sec smear
   * … shorten it if the part strikes faster" hands a reader a conditional and no way to evaluate
   * it, over a tempo and a strike map printed two headings away. Phase 5 evaluates it now.
   *
   * So what is owed here is the half phase 5 cannot state: **which of the two outcomes the value
   * is chosen for**, and where to go for the other one. A long attack is the recipe, not a
   * hazard — the bed is the point — so the note says the value is deliberate first and gives the
   * reader who wants distinct hits an action second. The value stays quoted because the sentence
   * turns on *which* value is deliberate, and that is the one number this folder can state
   * without seeing the part: its own. `test/timing.test.ts` holds the arithmetic and its scope;
   * this holds the division of labour between them.
   */
  it('states what a fast re-strike does to its slow fade-in, and names no direction (§4.3)', () => {
    const recipe = device.recipes.find((r) => r.id === 'tm-texture-soft') as Recipe
    const attack = (recipe.params as AuthoredParam[]).find((p) => p.name === 'ENVELOPE \u00b7 ATTACK')
    if (attack?.kind !== 'numeric') throw new Error('tm-texture-soft: ENVELOPE \u00b7 ATTACK is numeric')

    // Slow enough for the interaction to be real. A fade-in of a few hundredths would make the
    // sentence below true of nothing, and the test would then be pinning prose to a non-event.
    expect(attack.value).toBeGreaterThan(1)
    const note = attack.note
    expect(note, 'the slow fade-in says nothing about being re-struck').toBeDefined()

    // The number in the sentence is the number being dialled: moving one moves the other, or
    // this fails. A note quoting a value the param no longer holds is worse than no note.
    expect(note).toContain(`${attack.value} Sec`)

    // #155. **No unresolved comparison.** This is the defect itself, pinned by its shape rather
    // than by a word count: a conditional the reader has to evaluate from numbers printed
    // somewhere else is the thing phase 5 exists to have already done.
    expect(note, 'the note poses a comparison phase 5 now resolves').not.toMatch(
      /closer together than|if the part strikes|faster than/i,
    )

    // Both halves of what is left. Which outcome the value is for, and the action for the other
    // one — a note that says only "deliberate" tells a reader who wants distinct hits nothing.
    expect(note, 'the note does not say the value is a choice').toMatch(/deliberate/i)
    expect(note, 'the note gives no action for the other outcome').toMatch(/set it to/i)
    // And it sends them to the phase that did the arithmetic, rather than restating it here.
    expect(note).toContain('Step programming')

    // Generic, and that is the load-bearing half. The gap between strikes is a property of the
    // direction (§4.3), which this folder may not name and cannot see, so the sentence has to
    // hold for any part at all — including one nobody has authored yet.
    for (const template of TEMPLATES) {
      for (const needle of [template.id, template.name]) {
        expect(note?.toLowerCase(), needle).not.toContain(needle.toLowerCase())
      }
    }

    // And it reaches the page. Searched across the real directions rather than pinned to one,
    // because which recipe a direction takes is the resolver's business (§7) and pinning it
    // would make this fail on an unrelated objective change instead of on the thing it is about.
    const guides = TEMPLATES.flatMap((template) =>
      [1, 7].map((seed) => resolve({ devices: [device], template, mood: moodState(), seed })),
    ).filter((result) => result.assignments.some((a) => a.recipe.id === 'tm-texture-soft'))
    expect(guides.length, 'no direction places tm-texture-soft on this box alone').toBeGreaterThan(
      0,
    )
    for (const result of guides) expect(renderGuide(result)).toContain(note)
  })

  /**
   * #154. **Two envelopes on this box, and the name has to say which one.**
   *
   * The Tracker Mini prints Attack/Decay/Sustain/Release twice, on pages that are not the same
   * control:
   *
   *  - **p.126**, chapter 6's Envelope page — *"sample based parameters that affect the shape of
   *    the instrument sound over time"*. Its four controls are printed plainly as `Attack`,
   *    `Decay`, `Sustain`, `Release`; p.125 heads the page `Envelope` and shows it as the
   *    instrument automation `Type`. Attack/Decay/Release `0-10 Seconds`, Sustain `0-100%`.
   *  - **p.156 (FAT)** and **p.159 (VAP)**, the synth engines' own parameter tables, whose
   *    `Function` column carries `Amplifier Env` beside a second envelope on the same page —
   *    `Filter Env` on p.156, `Envelope 1` and `Envelope 2` on p.159. **Every one of them is
   *    printed at `0.00-10 Sec` / `0.00-100%`**, so on a synth instrument the range distinguishes
   *    nothing and only the `Function` can.
   *
   * `ENV ATTACK` used to sit on the p.126 side. It is not what any control on this box is called,
   * and against p.159 it reads equally as three of them — which is what a reader standing at the
   * machine actually hit. The fix is the one `CLAUDE.md` already records for the TR-8S's tone
   * category and the minilogue xd's switch position: **carry the discriminator in the data**, so
   * the pairing cannot come apart. Here it is the name itself, in the library's `SECTION · STAGE`
   * form — `ENVELOPE · ATTACK` is p.126's page and control, `AMP ENV ATTACK` is the engine
   * tables' `Amplifier Env → Attack`. Every word of both is printed on the page it cites.
   *
   * **A bare stage name is not enough and is rejected below.** It is p.126's control verbatim, but
   * it locates nothing: on a box whose engine tables carry three more `Attack` rows, an unqualified
   * `ATTACK` is the same failure #154 reported wearing a shorter name. Every other multi-envelope
   * device in the library qualifies — `AMP EG · ATTACK`, `FILTER EG · ATTACK`, `ENVELOPE A ·
   * ATTACK` — and this box is not the exception.
   *
   * Pinned by cited page rather than by voice, because `onBothPools` puts every synth recipe on
   * `track-sample` as well (tracks 1-8 host synths); the split is which page the value was read
   * off, and that is the thing that must not drift.
   */
  it('names its two envelopes apart, each on the page it was read off (#154)', () => {
    const ENV_STAGES: string[] = ['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE']
    /**
     * p.125-126: the sample instrument's one envelope, named as those pages name it. `\u00b7` is
     * U+00B7, the separator the library already uses for `AMP EG \u00b7 ATTACK` and its kin —
     * written escaped here because this test is about exact bytes in a name.
     */
    const SAMPLE_PREFIX = 'ENVELOPE \u00b7 '
    /**
     * **p.126 carries more than one envelope, and #345 is where that started to matter.**
     *
     * The envelope on that page is the Instrument Automation one and it exists *per destination*
     * — p.121: *"Each destination has the option of an LFO, envelope or no automation"*, over the
     * six rows p.121 lists. Every recipe here until now authored only the default one, so a bare
     * `ENVELOPE \u00b7 ATTACK` located it well enough. `tm-sweep-soft` authors a second, on the
     * Cutoff row, and two envelopes on one page with the same four stage names is #154's hazard
     * again one destination along.
     *
     * So a destination-scoped envelope must say which row it is on, and the prefix is the
     * destination's own name from p.121. A bare stage name still means the default envelope, and
     * anything else still fails — the rule got narrower here, not wider.
     */
    const AUTOMATION_DESTINATIONS = [
      'VOLUME',
      'PANNING',
      'CUTOFF',
      'WAVETABLE POSITION',
      'GRANULAR POSITION',
      'FINETUNE',
    ]
    /**
     * The engine tables' amplifier row, which sits beside another envelope on its own page — and
     * **the section is named differently by different engines, so the prefix is keyed by page.**
     * FAT (p.156) and VAP (p.159) head that column `Amplifier Env`; ACD (p.154) heads it
     * `Amplifier`, with `Modulation` as its second envelope on p.155. Both are `0.00-10 Sec` /
     * `0.00-100%`, so the range still distinguishes nothing and the section name is still the
     * only thing that locates the control.
     *
     * A single prefix across all three would have put a word on ACD's parameters that is not
     * printed on the page they cite, which is #154 reported again one engine along.
     */
    const ENGINE_PREFIXES: Record<string, string> = {
      '154': 'AMPLIFIER ',
      '156': 'AMP ENV ',
      '159': 'AMP ENV ',
    }
    const ENGINE_PAGES = Object.keys(ENGINE_PREFIXES)

    const envelopeParams = device.recipes.flatMap((recipe) =>
      (recipe.params as AuthoredParam[])
        .filter((p) => ENV_STAGES.some((stage) => p.name.endsWith(stage)))
        .map((p) => ({ recipe: recipe.id, param: p })),
    )
    expect(envelopeParams.length).toBeGreaterThan(0)

    const sample: string[] = []
    const engine: string[] = []

    for (const { recipe, param } of envelopeParams) {
      // The name that exists on neither page. This is the regression #154 reported.
      expect(param.name, `${recipe}: no control on this box is called '${param.name}'`).not.toMatch(
        /^ENV /,
      )
      // Printed, but unlocated — see the note above. Three engine rows answer to it as well.
      expect(
        ENV_STAGES,
        `${recipe}: '${param.name}' names a stage without saying which envelope`,
      ).not.toContain(param.name)

      if (param.kind !== 'numeric') throw new Error(`${recipe}: ${param.name} is numeric`)
      const cite = param.range.verified
      if (cite === false || cite === undefined)
        throw new Error(`${recipe}: ${param.name} cites no page`)
      const page = cite.source.slice(CITE_PREFIX.length)

      const prefix = Object.values(ENGINE_PREFIXES).find((p) => param.name.startsWith(p))
      if (prefix !== undefined) {
        // An amplifier row in an engine's table. p.126 has no such row — and the engine has to
        // be the one whose page prints that section name, or the discriminator discriminates
        // nothing.
        expect(ENGINE_PAGES, `${recipe}: ${param.name}`).toContain(page)
        expect(ENGINE_PREFIXES[page], `${recipe}: ${param.name} is not p.${page}'s word`).toBe(
          prefix,
        )
        expect(ENV_STAGES, `${recipe}: ${param.name}`).toContain(param.name.slice(prefix.length))
        engine.push(`${recipe}/${param.name}`)
      } else {
        // p.126's envelope. An engine page here would mean a value read off the wrong one of two
        // printed scales — the hazard `CLAUDE.md` names, on its third device.
        const destination = AUTOMATION_DESTINATIONS.find((d) =>
          param.name.startsWith(`${d} ${SAMPLE_PREFIX}`),
        )
        const body = destination === undefined ? param.name : param.name.slice(destination.length + 1)
        expect(body, `${recipe}: ${param.name}`).toMatch(
          new RegExp(`^${SAMPLE_PREFIX}(${ENV_STAGES.join('|')})$`),
        )
        expect(page, `${recipe}: ${param.name} is p.126's control, not an engine's`).toBe('126')
        // A destination-scoped envelope must have said so on the automation row too, or the
        // prefix is a word this recipe made up rather than a control it selected.
        if (destination !== undefined) {
          const authored = device.recipes.find((r) => r.id === recipe)
          const type = (authored?.params as AuthoredParam[]).find(
            (x) => x.name === `${destination} AUTOMATION TYPE`,
          )
          expect(type, `${recipe}: ${param.name} names no ${destination} automation row`).toBeDefined()
          expect(type?.kind === 'enum' ? type.value : undefined, recipe).toBe('Envelope')
        }
        sample.push(`${recipe}/${param.name}`)
      }
    }

    // Both halves are populated, or the loop above proves nothing about telling them apart.
    expect(sample.length).toBeGreaterThan(0)
    expect(engine.length).toBeGreaterThan(0)
    // And both kinds of p.126 envelope are present, or the destination branch above is dead code.
    expect(sample.some((n) => n.includes('CUTOFF ENVELOPE'))).toBe(true)
    expect(sample.some((n) => /\/ENVELOPE/.test(n))).toBe(true)

    // p.126's ranges, verbatim: three times `0-10 Seconds` and a `0-100%`.
    for (const { recipe, param } of envelopeParams) {
      if (param.kind !== 'numeric' || !param.name.startsWith(SAMPLE_PREFIX)) continue
      const stage = param.name.slice(SAMPLE_PREFIX.length)
      const expected = stage === 'SUSTAIN' ? { min: 0, max: 100 } : { min: 0, max: 10 }
      expect(param.range, `${recipe}: ${param.name}`).toEqual({
        ...expected,
        verified: { kind: 'manual', source: `${CITE_PREFIX}126` },
      })
      expect(param.unit, `${recipe}: ${param.name}`).toBe(stage === 'SUSTAIN' ? '%' : 'Sec')
    }
  })

  /**
   * #154, the other half. **No recipe may hold both envelopes at once.**
   *
   * A recipe mixing `ENVELOPE · ATTACK` (p.126) with `AMP ENV ATTACK` (p.156/p.159) would print
   * two rows a reader has to disambiguate by a page number they cannot see — and would mean the
   * device folder had stopped tracking which instrument type the recipe is for. Sample recipes
   * take the p.126 envelope; synth recipes take their engine's `Amplifier Env`.
   */
  it("never mixes p.126's envelope with an engine's Amplifier Env in one recipe (#154)", () => {
    for (const recipe of device.recipes) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      const sample = names.filter((n) => n.startsWith('ENVELOPE \u00b7 '))
      const engine = names.filter((n) => n.startsWith('AMP ENV '))
      expect(
        sample.length === 0 || engine.length === 0,
        `${recipe.id}: carries both ${sample.join(', ')} and ${engine.join(', ')}`,
      ).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Content and citation discipline (§3.1, §3.2)
  // -------------------------------------------------------------------------

  it('carries every recipe on a distinct key, and none that no direction can reach (§3, §3.5)', () => {
    // **This used to be a count, and a count was the wrong shape.** It read 15-23 and had been
    // raised twice — 20 to 21 for `tm-stab-hard-note` (#40), 21 to 23 for `tm-acid-dirty` on
    // both pools (§2.3/#25) — before #345 wanted it at 30. A number that moves whenever authoring
    // lands is not guarding anything; it is re-recording the last commit and calling it a bound.
    //
    // What it was standing in for is sprawl: recipes nobody can reach, authored because a role
    // existed rather than because a direction asks. That is checkable directly and does not move
    // when honest authoring lands, so it is what this asserts now. Note the two halves are
    // independent — the key test catches a duplicate, and the reach test catches a stray.
    //
    // The bound that was a fact about the box left earlier and is not missed: the three-synth-slot
    // authoring cap became a declared resource, which `spends one slot per patch however many
    // tracks it is stacked across` below tests on the resolver rather than on the manifest.
    const reachable = device.recipes.filter((recipe) => {
      const { requested, slots: _slots } = reachableSlots(recipe, TEMPLATES)
      return requested
    })
    expect(
      device.recipes.filter((r) => !reachable.includes(r)).map((r) => r.id),
      'authored for a (role, character) no direction in the library can select',
    ).toEqual([])
    // Non-vacuous: the box really does carry recipes, and `reachableSlots` really does return
    // false for something — the roster is not simply answering true to everything.
    expect(device.recipes.length).toBeGreaterThan(20)

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

  /**
   * §2.3/#25. **Every synth recipe declares the slot it loads into, and the twins declare that
   * they are one patch.**
   *
   * This replaces the authoring cap the manifest used to carry — "at most three distinct synth
   * recipes", checked here, because a device-global shared resource was a thing the engine could
   * not express. It can now, so the claim being tested moves from what is *authored* to what the
   * resolver *does*, which is what the cap was standing in for all along.
   */
  it('declares the three synth slots and spends one per loaded patch', () => {
    expect(SYNTH_SLOTS).toBe(3)
    expect(device.resources).toEqual([{ id: 'synth-slot', limit: 3, label: 'synth slots' }])

    // Every recipe that names a synth MODEL consumes a slot, and nothing else does: a sample
    // instrument and a MIDI part cost none (p.32's diagram counts the 48 instrument slots apart).
    for (const recipe of device.recipes) {
      const synth = (recipe.params as AuthoredParam[]).some((p) => p.name === 'MODEL')
      expect((recipe.consumes ?? []).length > 0, recipe.id).toBe(synth)
    }

    // The twins share an identity, or the pair would spend two slots for the one patch the box
    // actually loads (§2.3's `sharedAs`). The key is the authored base id both are expanded from.
    for (const recipe of device.recipes) {
      for (const use of recipe.consumes ?? []) {
        expect(use.resource).toBe('synth-slot')
        expect(use.sharedAs, recipe.id).toBe(recipe.id.replace(/-(sample|synth)$/, ''))
      }
    }

    // MODEL still offers all five engines. The options are what the box has; narrowing them to
    // what happens to be authored would hide the rest of the device.
    for (const recipe of device.recipes) {
      const model = (recipe.params as AuthoredParam[]).find((p) => p.name === 'MODEL')
      if (model === undefined) continue
      if (model.kind !== 'enum') throw new Error(`${recipe.id}: MODEL should be an enum`)
      expect(model.options.values).toEqual(['ACD', 'FAT', 'VAP', 'WTFM', 'PERC'])
    }

    // `acid` is authored now, on ACD (p.154), and it is the fourth patch — the thing the cap
    // made unwritable. `WTFM` is the engine still waiting for a recipe somebody wants.
    expect(new Set<string>(pool('track-sample').roles)).toContain('acid')
    expect(device.recipes.filter((r) => r.role === 'acid')).toHaveLength(2)

    // WTFM is the engine still waiting for a recipe somebody wants to write — documented,
    // offered in every MODEL list, and selected by none. An ordinary authoring gap now that the
    // slot cap is not the reason for it.
    const chosen = new Set(
      device.recipes.flatMap((r) =>
        (r.params as AuthoredParam[])
          .filter((p) => p.name === 'MODEL' && p.kind === 'enum')
          .map((p) => (p as { value: string }).value),
      ),
    )
    expect([...chosen].sort()).toEqual(['ACD', 'FAT', 'VAP'])
  })

  /**
   * §2.3/#25. **A stacked patch spends one slot, not one per track**, proved by arithmetic that
   * only works one way rather than by reading a field back.
   *
   * `polyphony.test.ts` used to carry this and stopped being able to. Its proof was a three-track
   * pad and a three-track stab coexisting — six tracks, two slots, impossible on three slots if a
   * stack cost one each. #345 crowded the sample pool, the stab fell back to its `sampled-chord`
   * twin, and what remained was a pad with three assignables, which distinguishes nothing: one
   * patch on three tracks and one patch on one track both sit inside a three-slot budget.
   *
   * Ambient Dub is where the difference is decisive. Two patches load across **five** tracks, and
   * five is more than the three slots the box has — so the slots cannot be counting tracks. On
   * one-slot-per-track the four-track pad would have spent the budget and over-run it by one
   * before the bass was reached at all.
   */
  /**
   * §4.3/#345. **An arpeggiated step has both its FX slots spent, so it can carry no
   * articulation**, and this is asserted because the recipe was authored with two before review
   * caught it.
   *
   * p.190: the arpeggiator *"needs a note value and works in conjunction with the MIDI chord
   * which must also be assigned to the other FX slot"*. A step has two slots; the arp takes FX1
   * and the MIDI Chord takes FX2. Every lane in `features.perStep` on this box is a step effect
   * needing a slot of its own — `volume`, `gate-length`, `chance` and the rest are chapter 7
   * entries — so there is nothing left for one to sit in.
   *
   * The rule is stated over the manifest rather than over one recipe id, so a second arpeggiated
   * recipe cannot arrive with the same mistake.
   */
  it('articulates nothing on a recipe whose routing spends both step FX slots', () => {
    const arpeggiated = device.recipes.filter((r) => (r.routing ?? '').includes('(Arp)'))
    expect(arpeggiated.map((r) => r.id)).toEqual(['tm-arp-clean'])

    for (const recipe of arpeggiated) {
      expect(recipe.articulation, `${recipe.id} articulates a step FX it has no slot for`)
        .toBeUndefined()
      // And the routing says why, so a reader meets the constraint rather than inferring it.
      expect(recipe.routing ?? '').toContain('both slots')
    }

    // Non-vacuous on the other side: every lane this box declares really is a step effect, which
    // is what makes "both slots spent" mean "no articulation" rather than "no FX-based one".
    expect(device.features?.perStep ?? []).toContain('gate-length')
    expect(device.features?.perStep ?? []).toContain('chance')
    // And ordinary recipes do articulate, or the assertion above passes on an empty manifest.
    expect(device.recipes.filter((r) => (r.articulation ?? []).length > 0).length)
      .toBeGreaterThan(5)
  })

  it('spends one slot per patch however many tracks it is stacked across', () => {
    const result = assign({
      devices: [device],
      template: TEMPLATES.find((t) => t.id === 'ambient-dub') as Template,
      mood: moodState(),
      seed: 1,
    })

    const spending = result.assignments.filter((a) => (a.recipe.consumes ?? []).length > 0)
    const patches = new Set(spending.flatMap((a) => (a.recipe.consumes ?? []).map((c) => c.sharedAs)))
    const tracks = spending.reduce((n, a) => n + a.assignables.length, 0)

    // The stack is real, and it is one patch: four tracks under a single `sharedAs`.
    const pad = result.assignments.find((a) => a.role === 'pad')
    expect(pad?.assignables.length).toBe(4)
    expect(new Set((pad?.recipe.consumes ?? []).map((c) => c.sharedAs)).size).toBe(1)
    // Four *different* tracks, so the count is a stack rather than one track named four times.
    expect(new Set(pad?.assignables.map((v) => v.voiceId)).size).toBe(4)

    // And the arithmetic that makes it a proof rather than a description.
    expect(patches.size).toBe(2)
    expect(tracks).toBe(5)
    expect(tracks).toBeGreaterThan(SYNTH_SLOTS)

    // Nothing was refused for the resource, which is the other half: the budget was not merely
    // unspent, it was enough.
    expect(result.shortfalls.filter((g) => g.reason === 'no-room')).toEqual([])
  })

  it('loads three of four synth patches and says which slot ran out, on free tracks', () => {
    // The four authored patches, one request each. Three fit; the fourth is a `no-room` gap
    // naming the slots, on a box with thirteen tracks still empty — which is the whole point of
    // the resource being a thing apart from `comfortableVoices`.
    const result = assign({
      devices: [device],
      template: synthTemplate([
        { id: 'r-bass', role: 'bass-mid', character: 'dark' },
        { id: 'r-lead', role: 'lead', character: 'bright' },
        { id: 'r-pad', role: 'pad', character: 'soft' },
        { id: 'r-acid', role: 'acid', character: 'dirty' },
      ]),
      mood: moodState(),
      seed: 1,
    })

    expect(result.assignments).toHaveLength(3)
    expect(result.shortfalls).toHaveLength(1)
    const gap = result.shortfalls[0]
    expect(gap).toMatchObject({ reason: 'no-room', because: 'resource' })
    expect(gap?.reason === 'no-room' ? gap.detail : '').toContain('3 synth slots')

    // Three tracks of sixteen are carrying anything at all. The rig is nowhere near full; the
    // slots are what ran out, and the sentence says so rather than blaming crowding.
    expect(result.occupancy.size).toBe(3)
    expect(expand(device)).toHaveLength(16)

    // Three loaded patches, counted the way the box counts them.
    expect(new Set(result.assignments.map((a) => a.recipe.consumes?.[0]?.sharedAs)).size).toBe(3)
  })

  it('spends one slot on a patch playing from both pools at once', () => {
    // Nine leads cannot fit in one pool of eight, so the ninth takes the other pool — and the
    // other pool's record of the same patch. Both twins are in use, and the box has loaded one
    // thing: two more patches fit alongside, which they could not if the pair cost two slots.
    const leads = Array.from({ length: 9 }, (_, i) => ({
      id: `r-lead-${String(i + 1)}`,
      role: 'lead' as const,
      character: 'bright' as const,
    }))
    const result = assign({
      devices: [device],
      template: synthTemplate([
        ...leads,
        { id: 'r-bass', role: 'bass-mid', character: 'dark' },
        { id: 'r-pad', role: 'pad', character: 'soft' },
      ]),
      mood: moodState(),
      seed: 1,
    })

    expect(result.shortfalls).toEqual([])
    expect(result.assignments).toHaveLength(11)

    // Four recipe *records* in use across three loaded patches: the lead's twins are one of them.
    const records = new Set(result.assignments.map((a) => a.recipe.id))
    expect(records).toContain('tm-lead-bright-sample')
    expect(records).toContain('tm-lead-bright-synth')
    expect(records.size).toBe(4)
    expect(new Set(result.assignments.map((a) => a.recipe.consumes?.[0]?.sharedAs)).size).toBe(3)
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
      resolveParams(kick, moodState({ density })).find((p) => p.name === 'ENVELOPE \u00b7 DECAY')?.value

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

/**
 * §2.1. **Which note plays a loaded sample as it is**, on the one box in the library whose sample
 * tracks answer that for themselves.
 */
describe('trigger notes (§2.1)', () => {
  const sampleNote = pool('track-sample').triggerNote

  it('gives the sample pool the note that plays a sample as recorded, and the synth pool none', () => {
    // p.90: "The default note value is C5 which plays a sample at its original pitch value."
    expect(sampleNote?.note).toBe('C5')
    // p.128's "Note value affects pitch" is why this is addressing rather than taste: any other
    // note is the same sample transposed.
    expect(pool('track-synth').triggerNote).toBeUndefined()
  })

  it('numbers that note by this box\'s own octave mapping, not by scientific pitch notation', () => {
    // The box ships with `Middle C = C-5` (p.298, and p.288 adjusts *from* C-5 to match Ableton
    // Live), so the C5 its screen prints is middle C. SPN would have said 72, and 72 is a note
    // this box never sends for a whole sample.
    expect(sampleNote?.midi).toBe(60)
  })

  it('cites the octave mapping and not only the page the note name appears on', () => {
    // The hazard `CLAUDE.md` records for ranges, wearing note names: p.90 prints `C5` and no
    // number at all, so a citation naming p.90 alone would not support the `midi` beside it.
    const source = sampleNote?.verified.source as string
    expect(source).toContain(`${CITE_PREFIX}90`)
    expect(source).toContain('p.298')
    expect(source).toContain('Middle C')
  })

  /**
   * §4.1's third category, left unmodelled on purpose.
   *
   * p.90's next sentence reads "The first slice of a beat slice sample will be triggered using
   * note C2" — and that `C2` is a *slice address*, not a pitch and not an original-pitch marker.
   * The field holds one kind of value; putting a slice base in it would give two kinds one name,
   * which reads as correct until the first sliced instrument somebody uses for something pitched.
   *
   * So `tm-vox-chop-dirty` carries nothing of its own, and the assertion is on the whole folder
   * rather than on that recipe: the moment any recipe here claims a trigger note, somebody has
   * either designed the missing vocabulary or reintroduced the confusion this avoids.
   */
  it('authors no recipe-level note, so a slice base cannot wear a trigger note\'s name', () => {
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  /**
   * §4.1's third category, held closed.
   *
   * The pool's `C5` says *play the sample as recorded*, which is true of an ordinary sample
   * instrument and false of a sliced one — under Beat Slice the note names a piece of audio, and
   * `C5` selects whichever piece sits thirty-six semitones up. Nothing here can distinguish the
   * two, so the guarantee this rests on is that no shipped guide asks: the one direction reaching
   * `tm-vox-chop-dirty` hooks that role, and #100 gives a hooked part's notes to its hook.
   *
   * **If this fails, nobody has broken it by accident.** It means a direction now asks for a
   * sliced patch without a hook, and the answer is to design the missing vocabulary rather than
   * to widen this test — the trigger note printed there would be wrong.
   */
  it('never prints its sliced patch a note, across every direction and seed', () => {
    for (const template of TEMPLATES) {
      for (let seed = 0; seed < 16; seed++) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          if (a.recipe.id !== 'tm-vox-chop-dirty') continue
          expect(noteInstruction(a).kind, `${template.id} seed ${String(seed)}`).toBe('none')
        }
      }
    }
  })

  it('reaches a resolved assignment, from the voice and unchanged', () => {
    const result = resolve({
      devices: [device],
      template: synthTemplate([
        { id: 'r-kick', role: 'kick', character: 'hard' },
        { id: 'r-lead', role: 'lead', character: 'bright' },
      ]),
      mood: moodState(),
      seed: 1,
    })

    // Whatever recipe won, a part on a sample track carries the track's note and a part on a
    // synth track carries none — pinning which recipe wins would make this fail on an unrelated
    // objective change instead of on the thing it is about.
    expect(result.assignments.length).toBeGreaterThan(0)
    for (const a of result.assignments) {
      const expected = a.assignables[0]?.poolId === 'track-sample' ? 'C5' : undefined
      expect(a.triggerNote?.note, a.recipe.id).toBe(expected)
      expect(a.triggerNote?.midi, a.recipe.id).toBe(expected === undefined ? undefined : 60)
    }
  })
})

/**
 * §2.1. **The measurement this change is for**, taken rather than asserted from memory.
 *
 * Every direction against this box alone, seeds 1-6 — 11 directions, 66 resolutions. A part on
 * `track-sample` that draws a grid is one the guide used to tell which steps to hit and never
 * what to put on them; the question this pins is whether all of them now get a note and none of
 * them gets a blank.
 *
 * **A grid exists when some section selected a variant**, which is the renderer's own condition
 * and not a paraphrase of it. A part whose every section came back `none` prints "no pattern
 * authored" and no steps, so counting it among the grid parts inflates the population with parts
 * that have nothing to program — twelve of them, `ambient-dub/texture` and `hip-hop/texture` at
 * six seeds apiece. They still carry the note, because it is a fact about the track either way;
 * they are just not what this measures.
 *
 * **The counts are a measurement, not a target.** They move when a direction gains or loses a
 * part, and a diff here is a prompt to re-read the numbers rather than a failure. What must not
 * move is the *relationship*: `blank` stays 0, and every instruction is the pool's own `C5`.
 */
describe('every sample-track grid part gets its note (§2.1)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  /** Parts on `track-sample`, split by what phase 5 actually draws for them. */
  function sweep() {
    const grid: { where: string; role: Role; kind: string; note?: string; midi?: number }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          if (a.assignables[0]?.poolId !== 'track-sample') continue
          const where = `${template.id}/${a.role}`
          if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else if (!a.patterns.some((p) => p.selection.outcome !== 'none')) noPattern.push(where)
          else {
            const note = noteInstruction(a)
            grid.push({
              where: `${where}/seed ${String(seed)}`,
              role: a.role,
              kind: note.kind,
              ...(note.kind === 'none' ? {} : { note: note.note, midi: note.midi }),
            })
          }
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  it('leaves no grid part on a sample track without a note, and pins how many there are', () => {
    const { grid } = sweep()

    // The population, as measured on this library. 216 until #345 authored the seven roles the
    // sample pool declared and no recipe served.
    expect(grid.length).toBe(276)

    // The claim. Zero blanks, and the blank arm named so a regression cannot hide as a count.
    expect(grid.filter((g) => g.kind === 'none')).toEqual([])

    // **Two arms now, where there was one, and #345's `sub` is why.** §4.1 gives a direction's
    // own pitch precedence over a device trigger note, so a pitched role that draws a grid
    // renders the direction's note. Until this box had a `sub` recipe on the sample pool, every
    // pitched role it carried was hooked (#100) and so never reached the grid at all — which is
    // what made one arm look like the whole story.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['pitch', 'trigger'])

    // The trigger arm is still the pool's own C5 and nothing else.
    const triggers = grid.filter((g) => g.kind === 'trigger')
    expect([...new Set(triggers.map((g) => `${g.note as string}/${String(g.midi)}`))]).toEqual([
      'C5/60',
    ])

    // And the pitch arm is `sub` alone, in the octave the directions ask a sub for.
    const pitched = grid.filter((g) => g.kind === 'pitch')
    expect(pitched).toHaveLength(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
    expect(Math.max(...pitched.map((g) => g.midi as number))).toBeLessThan(36)
  })

  it('reaches the percussion the direction library actually asks this box for', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's, and what this change is for is the drum tracks.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['kick', 48],
      ['closed-hat', 42],
      ['ghost-perc', 42],
      ['sub', 24],
      ['clap', 18],
      ['metallic', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['arp', 6],
      ['impact', 6],
      ['noise', 6],
      ['ride', 6],
      ['tom', 6],
    ])
  })

  it('accounts for every sample-track part that draws no grid, by which reason', () => {
    // None of these is a hole in this change, and each says which rule answered it: #100 gives a
    // hooked part's notes to its hook, and §6.3 leaves a part with no variant anywhere nothing to
    // program. Asserted rather than assumed — "hook or sustained" was the guess, and this box
    // produces no sustained sample-track part at all across the sweep.
    const { hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(80)
    expect(sustained).toEqual([])
    // 12 until #345. The three new entries are `riser` and `sweep`, which no direction authors a
    // step variant for — both say so in their own `PATTERNS` note, and it is why neither recipe
    // articulates anything.
    expect(noPattern.length).toBe(30)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'generative-drift/sweep',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])
  })

  /**
   * What makes the sweep above the whole story. Trigger notes are authored on two pools across
   * the whole library, so every other box renders exactly what it rendered before — not because a
   * test checked each of them, but because there is nothing on them to render.
   *
   * **The list is deliberately whole-library and lives here rather than in one device's file.**
   * It was written when the Mini was the only box carrying one; the Tracker joined it, and the
   * roster moving is the event this is for. A third entry means somebody has decided a new box's
   * note is a fact about hardware rather than the reader's choice, which is a claim that wants a
   * citation read rather than a test widened.
   */
  it('names every device in the library that authors one, so no other guide moves', () => {
    const authoring = DEVICES.filter((d) => d.voices.some((v) => v.triggerNote !== undefined))
    expect(authoring.map((d) => d.id)).toEqual(['polyend-tracker', 'polyend-tracker-mini'])

    const voices = authoring.flatMap((d) =>
      d.voices.filter((v) => v.triggerNote !== undefined).map((v) => v.id),
    )
    expect(voices).toEqual(['track', 'track-sample'])
  })
})
