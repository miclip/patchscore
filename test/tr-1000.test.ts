import { describe, expect, it } from 'vitest'
import { CHARACTERS, DeviceSchema, ROLES, type AuthoredParam } from '../lib/core/index'
import { device } from '../lib/devices/roland-tr-1000/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The manifest is validated by the codegen already (`--check` reloads and re-parses it), so
 * these are the claims the schema cannot make: that the content is actually populated, and
 * that nothing in it dresses an invented setting up as a manual citation.
 */

describe('TR-1000 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('spans 486 mm across the panel, cited to the specifications table (§10)', () => {
    // 486 (W) x 311 (D) x 125 (H) mm, read off the *rendered* table — pdftotext scrambles its
    // columns, so the W/D/H order is only trustworthy from the page itself. Roland's stated width
    // is the horizontal span here, confirmed against the landscape panel diagram (p.9) rather
    // than assumed from the convention, which the Tracker Mini shows does not always hold.
    expect(device.physical.panelSpanMm).toBe(486)
    expect(device.physical.verified).toEqual({
      kind: 'manual',
      source: 'TR-1000 Reference Manual eng02, p.74 (Main specifications)',
    })
  })

  it('is comfortable with eight of its ten tracks occupied (§2.3)', () => {
    expect(device.comfortableVoices).toBe(8)
    expect(device.voices.length).toBe(10)
  })

  it('names its per-step features with §2.3 keys, plus what articulation actually uses', () => {
    const perStep = device.features?.perStep ?? []
    for (const key of ['velocity', 'probability', 'substep', 'cycle', 'start-timing']) {
      expect(perStep).toContain(key)
    }

    // Every articulation key must be a declared capability. The schema checks this too; the
    // point here is that the extras are used, not decorative.
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect([...used].filter((k) => !perStep.includes(k))).toEqual([])
    for (const extra of perStep.filter((k) => !['velocity', 'probability', 'substep', 'cycle', 'start-timing'].includes(k))) {
      expect(used.has(extra)).toBe(true)
    }
  })

  it('declares the ten tracks the manual names, in panel order', () => {
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'lt', 'ht', 'rs', 'hc', 'ch', 'oh', 'cc', 'rc',
    ])
    // One track sounds one note. Layer A/B is two generators on one note, not two notes.
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
  })

  // §3's key is (role, character, voice); this device happens to satisfy the stricter
  // per-device form, which is a fact about its content, not the rule.
  it('carries 15-20 recipes, no two of them sharing a (role, character)', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)

    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  it('reaches every track with at least one recipe', () => {
    const addressed = new Set(device.recipes.map((r) => r.voice))
    expect([...device.voices.map((v) => v.id)].filter((id) => !addressed.has(id))).toEqual([])
  })

  it('addresses steps only by PatternSlot, never by index or hit list', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"step"')
    expect(source).not.toContain('"hits"')

    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        // Slot membership is a schema check; this asserts the *values* stay categorical too.
        expect(Object.keys(entry.set).length).toBeGreaterThan(0)
      }
    }
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    // The two gates come apart here exactly as §3.2 says they should. The Reference Manual
    // states the *bounds* for each generator's parameters, so every range is cited and mood is
    // free to move inside it. It states nothing about which value suits a hard kick, so every
    // point stays provisional. Written out at every site rather than inherited: one later
    // citation on a recipe must not promote 65 values nobody checked.
    for (const recipe of device.recipes) {
      expect(recipe.verified).toBe(false)
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        expect(param.verified, `${recipe.id} / ${param.name}`).toBe(false)
        expect(param.range.verified, `${recipe.id} / ${param.name}`).toMatchObject({
          kind: 'manual',
          source: expect.stringContaining('TR-1000 Reference Manual (eng02) v1.13+, p.'),
        })
      }
    }

    const counts = auditDevice(device).counts
    // Every point on this device is now provisional, GEN included: nothing here is a value a
    // human checked, and the audit says so.
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.manualPoints).toBe(0)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
  })

  it("sets only parameters the cited page exposes, in the manual's own units", () => {
    // The whole point of dropping '% travel': a unit and a bound that came off the panel by
    // eye are not a citation. Every numeric now carries the Value column's own bounds, which
    // on this device are only ever percent (uni- or bipolar) or semitones.
    const SHAPES = [
      { unit: '%', min: 0, max: 100 },
      { unit: '%', min: -100, max: 100 },
      { unit: 'St', min: -12, max: 12 },
      { unit: 'St', min: -24, max: 24 },
    ]
    for (const recipe of device.recipes) {
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        const where = `${recipe.id} / ${param.name}`
        expect(param.unit, where).not.toBe('% travel')
        expect(
          SHAPES.some(
            (s) => s.unit === param.unit && s.min === param.range.min && s.max === param.range.max,
          ),
          `${where}: ${param.range.min}-${param.range.max} ${param.unit ?? '(no unit)'}`,
        ).toBe(true)
        // No `step`: the tables print a decimal but never state a resolution (invariant 5).
        expect(param.step, where).toBeUndefined()
      }
    }
  })

  it("cites the page that actually carries that generator's table", () => {
    // A citation to the wrong page is worse than none - it looks checkable and is not. The
    // Parameter list runs ANALOG on p.59, ACB on p.60-62 and FM on p.63, so a recipe's range
    // pages have to be the ones its generator lives on.
    //
    // The two sends are the exception and are checked separately below: they are not generator
    // parameters at all, they are the track's own MIXER block, which is its own table (p.71).
    const PAGES: Record<string, number[]> = {
      'tr1000-kick-hard': [59],
      'tr1000-kick-dark': [59],
      'tr1000-kick-dirty': [60],
      'tr1000-sub-dark': [61],
      'tr1000-snare-hard': [60],
      'tr1000-snare-bright': [62],
      'tr1000-snare-dirty': [63],
      'tr1000-tom-dark': [60],
      'tr1000-tom-bright': [60],
      'tr1000-rim-clean': [60],
      'tr1000-ghost-perc-soft': [62],
      'tr1000-clap-bright': [62],
      'tr1000-clap-soft': [59],
      'tr1000-closed-hat-clean': [62],
      'tr1000-closed-hat-dirty': [62],
      'tr1000-open-hat-bright': [62],
      'tr1000-open-hat-dark': [62],
      'tr1000-impact-hard': [62],
      'tr1000-ride-clean': [62],
    }
    expect(Object.keys(PAGES)).toHaveLength(19)
    for (const recipe of device.recipes) {
      const allowed = PAGES[recipe.id]
      expect(allowed, recipe.id).toBeDefined()
      for (const param of recipe.params as AuthoredParam[]) {
        if (param.kind !== 'numeric') continue
        if (param.name === 'RVB SEND' || param.name === 'DLY SEND') continue
        const v = param.range.verified
        if (v === undefined || v === false) throw new Error(`${recipe.id} range uncited`)
        const page = Number(v.source.split('p.')[1])
        expect(allowed, `${recipe.id} / ${param.name}`).toContain(page)
      }
    }
  })

  it('gives every recipe something to set', () => {
    // Several generators are listed as "Global parameters only" - no dedicated table. Picking
    // one of those would leave a recipe with a name and no sound design, so none is used.
    for (const recipe of device.recipes) {
      const numerics = (recipe.params as AuthoredParam[]).filter((p) => p.kind === 'numeric')
      expect(numerics.length, recipe.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('names a real generator on every GEN, cited to the list (§3.1)', () => {
    // A generator name is checkable in a way a knob position is not: it either appears in the
    // Preset GEN/INST List or it does not. So GEN is the one thing here that may be cited -
    // and every one of them must be, or the exception has started leaking.
    const gens = device.recipes.map((r) => {
      const p = (r.params as AuthoredParam[]).find((x) => x.name === 'GEN')
      expect(p, `${r.id} has no GEN`).toBeDefined()
      return { id: r.id, param: p as AuthoredParam }
    })
    expect(gens).toHaveLength(19)

    for (const { id, param } of gens) {
      expect(param.kind, id).toBe('enum')
      if (param.kind !== 'enum') throw new Error('GEN should be an enum')
      // The citation belongs to the *option set*: "909 Bass Drum appears in the list under
      // BD_E" is checkable, while "reach for it for a hard kick" is taste. The two claims are
      // asserted apart, because collapsing them is exactly the overclaim this test used to pin.
      expect(param.options.verified, id).toEqual({
        kind: 'manual',
        source: 'TR-1000 Preset GEN/INST List (eng02) v1.20, GEN list p.1',
      })
      expect(param.verified, id).toBe(false)
      // The value has to be one of the offered generators, and the offer has to be a real
      // choice - a one-element option list is a value pretending to be a decision.
      expect(param.options.values, id).toContain(param.value)
      expect(param.options.values.length, id).toBeGreaterThan(2)
      // The old enum held a folder ('ACB'), which never named a sound. None may come back.
      expect(['Analog', 'ACB', 'FM', 'PCM', 'Sample'], id).not.toContain(param.value)
    }

    // Every recipe reaches for a different generator; 19 recipes sharing three names would
    // mean the option sets are decoration.
    expect(new Set(gens.map((g) => (g.param as { value: string }).value)).size).toBe(19)
  })

  it('offers a closed-hat recipe no open hats, and the reverse (§3.1)', () => {
    // The list splits HIHAT_E by name rather than by a column, so the role-specific option set
    // is the only thing keeping an open hat out of a closed-hat recipe.
    for (const recipe of device.recipes) {
      const p = (recipe.params as AuthoredParam[]).find((x) => x.name === 'GEN')
      if (p === undefined || p.kind !== 'enum') continue
      if (recipe.role === 'closed-hat') {
        expect(p.options.values.some((o) => o.includes('Open')), recipe.id).toBe(false)
      }
      if (recipe.role === 'open-hat') {
        expect(p.options.values.every((o) => o.includes('Open')), recipe.id).toBe(true)
      }
    }
  })

  it('keeps every GEN option verbatim from one page of the list', () => {
    // The citation names GEN list p.1 and nothing else. If an option ever comes from another
    // page, the citation stops covering it - so the shape of every name is pinned here.
    const seen = new Set<string>()
    for (const recipe of device.recipes) {
      const p = (recipe.params as AuthoredParam[]).find((x) => x.name === 'GEN')
      if (p === undefined || p.kind !== 'enum') continue
      for (const o of p.options.values) seen.add(o)
    }
    // Names on p.1 are '<machine> <voice>': 808/909/8X/9X/707/606/CR78, or an FM model.
    for (const name of seen) {
      expect(name, name).toMatch(/^(808|909|8X|9X|707|606|CR78|FM|VA) /)
    }
    expect(seen.size).toBeGreaterThan(30)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const hint of Object.values(device.hints ?? {})) {
      expect(hint.split(/\s+/).length).toBeLessThanOrEqual(8)
    }
  })

  // -------------------------------------------------------------------------
  // The two per-instrument sends (#59)
  // -------------------------------------------------------------------------

  /** The `RVB SEND`/`DLY SEND` pair on one recipe, in the order the manifest authors them. */
  function sends(id: string): AuthoredParam[] {
    const recipe = device.recipes.find((r) => r.id === id)
    expect(recipe, id).toBeDefined()
    return (recipe?.params as AuthoredParam[]).filter(
      (p) => p.name === 'RVB SEND' || p.name === 'DLY SEND',
    )
  }

  it('gives every recipe both sends, because zero is an instruction and not an omission', () => {
    // The sends are kit state, edited in place (p.34) and saved deliberately (p.50), so a
    // recipe that says nothing about them is a recipe that inherits the last kit's settings.
    for (const recipe of device.recipes) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      expect(names, recipe.id).toContain('RVB SEND')
      expect(names, recipe.id).toContain('DLY SEND')
    }
  })

  it('cites the MIXER table on p.71, not the EXT IN table on p.54', () => {
    // p.54 prints `RVB SEND` and `DLY SEND` with word-for-word the same explanations, and it is
    // a different parameter: that block is KIT > EXT IN, the sends for audio arriving at the
    // EXTERNAL IN jacks. The per-instrument sends are the track's own MIXER block on p.71. Two
    // tables printing one name is exactly what a citation is for, so this is pinned by page.
    for (const recipe of device.recipes) {
      for (const param of sends(recipe.id)) {
        if (param.kind !== 'numeric') throw new Error(`${recipe.id} / ${param.name} not numeric`)
        const cite = param.range.verified
        if (cite === undefined || cite === false) throw new Error(`${recipe.id} send uncited`)
        expect(cite.source, `${recipe.id} / ${param.name}`).toContain('p.71')
        // p.71's Value column prints `0%-100%`. The point inside it is taste (§3.2).
        expect(param.range.min, recipe.id).toBe(0)
        expect(param.range.max, recipe.id).toBe(100)
        expect(param.unit, recipe.id).toBe('%')
        expect(param.verified, recipe.id).toBe(false)
      }
    }
  })

  it('holds both sends flat and mood-inert on every recipe leaving by an individual out', () => {
    // p.71: with INDV OUT = INDIV "the track sound is output only from the INDV/TRIG OUT, and
    // not from the MIX OUT", and the audio diagram (p.33) taps that jack at the MIXER stage,
    // ahead of the reverb and the delay. A send on such a track feeds a bus the track is not
    // using. `space` is therefore not declared at all rather than declared and set to zero:
    // §6.1's model is that a parameter declines an axis by not naming it.
    const routed = device.recipes.filter((r) => r.routing !== undefined)
    expect(routed.map((r) => r.id)).toEqual([
      'tr1000-kick-hard',
      'tr1000-sub-dark',
      'tr1000-snare-hard',
    ])
    for (const recipe of routed) {
      // The send does not make the routing line redundant: one says where the track leaves the
      // box, the other says what it feeds on the way. Both are still printed.
      expect(recipe.routing, recipe.id).toMatch(/INDIVIDUAL OUT/)
      for (const param of sends(recipe.id)) {
        if (param.kind !== 'numeric') throw new Error(`${recipe.id} send not numeric`)
        expect(param.value, `${recipe.id} / ${param.name}`).toBe(0)
        expect(param.mood, `${recipe.id} / ${param.name}`).toBeUndefined()
      }
    }
  })

  it('keeps the low end out of the reverb at every mood setting', () => {
    // A kick or a sub in a reverb is mud whatever `space` says, so the whole BD voice is flat
    // and inert — including the two kick recipes that leave by the MIX OUT like everything else.
    for (const recipe of device.recipes.filter((r) => r.voice === 'bd')) {
      for (const param of sends(recipe.id)) {
        if (param.kind !== 'numeric') throw new Error(`${recipe.id} send not numeric`)
        expect(param.value, `${recipe.id} / ${param.name}`).toBe(0)
        expect(param.mood, `${recipe.id} / ${param.name}`).toBeUndefined()
      }
    }
  })

  it('moves the sends on space and on nothing else, and never out of the printed range', () => {
    let moved = 0
    for (const recipe of device.recipes) {
      for (const param of sends(recipe.id)) {
        if (param.kind !== 'numeric') throw new Error(`${recipe.id} send not numeric`)
        for (const entry of param.mood ?? []) {
          expect(entry.axis, `${recipe.id} / ${param.name}`).toBe('space')
          moved += 1
          // Both ends of the axis, against the bounds p.71 prints.
          expect(param.value + entry.amount, `${recipe.id} / ${param.name} at full space`)
            .toBeLessThanOrEqual(100)
          expect(param.value - entry.amount, `${recipe.id} / ${param.name} at no space`)
            .toBeGreaterThanOrEqual(0)
        }
      }
    }
    // Most of the box moves on space: this is the axis the sends exist for.
    expect(moved).toBeGreaterThan(20)
  })

  it('jogs both sends with the shortcut the manual prints for them', () => {
    // p.73's shortcut list: `[BD]-[RC] + REVERB [LEVEL]` and `[BD]-[RC] + DELAY [LEVEL]`. The
    // knob is silkscreened but the gesture is not — on its own that knob sets the kit's reverb
    // level, and the per-instrument send only appears while a track button is held (p.34).
    expect(device.hints?.['reverb-send']).toBe('Hold [BD]-[RC], turn REVERB [LEVEL]')
    expect(device.hints?.['delay-send']).toBe('Hold [BD]-[RC], turn DELAY [LEVEL]')
    for (const recipe of device.recipes) {
      for (const param of sends(recipe.id)) {
        const hint = param.kind === 'numeric' ? param.hint : undefined
        expect(hint, `${recipe.id} / ${param.name}`).toBe(
          param.name === 'RVB SEND' ? 'reverb-send' : 'delay-send',
        )
      }
    }
  })
})
