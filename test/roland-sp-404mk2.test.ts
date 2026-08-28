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
import {
  ARTICULABLE_PER_STEP,
  STEP_SWITCHES,
  device,
} from '../lib/devices/roland-sp-404mk2/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The SP-404MK2 is the library's second `sampler` and its second box with a **shared effect
 * slot**, and most of this file is about a third thing: *conditional controls*.
 *
 * `CLAUDE.md`'s standing rule is that a cited range can still be the wrong range where a manual
 * prints more than one scale for a control, and that the switch has to travel with the value so
 * the pairing cannot come apart. This manual states five such conditions outright, in its own
 * footnotes, and they fall into two groups that the shape has to answer differently:
 *
 *  - **On a parameter**, the switch is another parameter in the same recipe. `PITCH`'s range
 *    depends on `VINYL MODE` and `SPEED` cannot be set at all unless `BPM SYNC` is off (both
 *    p.80); AUTO MARK picks *one* of three conditions rather than setting all of them (p.74).
 *  - **On a step**, the switch is another key in the same `set`. `SUBSTEP` needs `MODE: TRIG`,
 *    `HOLD STEP` needs `MODE: HOLD STEP`, and a per-step `PITCH` needs `PITCH MODE: CHROMATIC`
 *    (pp.98-99).
 *
 * A recipe-level parameter could not carry the second group: `MODE` is set while steps are being
 * entered, so one recipe may enter one slot under TRIG and another under HOLD STEP, and a single
 * parameter would make the second slot's value a lie. That is why `STEP_SWITCHES` is a claim
 * about `set` keys rather than about `params`, and why this file checks it there.
 */

const MANUAL = 'SP-404MK2 Reference Manual v4.00'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('SP-404MK2 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('roland-sp-404mk2')
    expect(device.maker).toBe('Roland')
    expect(device.kind).toBe('sampler')
  })

  it('carries recipes on distinct (role, character) keys, with unique ids', () => {
    const keys = device.recipes.map((r) => `${r.role}/${r.character}`)
    expect(new Set(keys).size).toBe(keys.length)
    const ids = device.recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
      expect(recipe.voice).toBe('pad')
    }
  })

  // -------------------------------------------------------------------------
  // Conditional controls on a parameter
  // -------------------------------------------------------------------------

  describe('a value on a two-scale control carries the switch that chooses the scale', () => {
    it('pairs every PITCH with a VINYL MODE, because p.80 prints two ranges for it', () => {
      // p.80: `-12.00–+12.00 (when VINYL MODE is "No")` / `-12.00–+7.00 (when VINYL MODE is
      // "Yes")`. The authored range is the first, so the switch is not optional context — it is
      // what makes the cited bound the bound in force.
      const withPitch = device.recipes.filter((r) => named(r, 'PITCH') !== undefined)
      expect(withPitch.length).toBeGreaterThan(0)
      for (const recipe of withPitch) {
        const vinyl = named(recipe, 'VINYL MODE')
        expect(vinyl, recipe.id).toBeDefined()
        expect(vinyl?.value, recipe.id).toBe('No')
        const pitch = named(recipe, 'PITCH')
        expect(pitch?.kind === 'numeric' ? pitch.range : undefined, recipe.id).toMatchObject({
          min: -12,
          max: 12,
        })
      }
    })

    it('pairs every SPEED with a BPM SYNC, because p.80 says it is unsettable otherwise', () => {
      // p.80's footnote on SPEED: "* This can only be set when BPM SYNC is off." A recipe naming
      // a playback speed without saying so prints a value the reader cannot enter.
      const withSpeed = device.recipes.filter((r) => named(r, 'SPEED') !== undefined)
      expect(withSpeed.length).toBeGreaterThan(0)
      for (const recipe of withSpeed) {
        expect(named(recipe, 'BPM SYNC')?.value, recipe.id).toBe('OFF')
      }
    })

    it('picks one AUTO MARK condition and sets only that one (p.74)', () => {
      // Step 5 selects *a* parameter and step 6 edits *its* value, so the three are alternatives.
      // Authoring TRANSIENT and TIME DIVISION together described a screen holding two conditions.
      const chops = device.recipes.filter(
        (r) => named(r, 'AUTO MARK · PARAMETER') !== undefined,
      )
      expect(chops.length).toBeGreaterThan(0)
      for (const recipe of chops) {
        const chosen = named(recipe, 'AUTO MARK · PARAMETER')
        expect(chosen?.kind, recipe.id).toBe('enum')
        expect(chosen?.kind === 'enum' ? chosen.options.values : [], recipe.id).toEqual([
          'TIME DIVISION',
          'LEVEL',
          'TRANSIENT',
        ])
        // Exactly one condition's value is authored, and it is the one selected.
        const conditions = ['TIME DIVISION', 'LEVEL', 'TRANSIENT'].filter(
          (c) => named(recipe, `AUTO MARK · ${c}`) !== undefined,
        )
        expect(conditions, recipe.id).toEqual([chosen?.value])
      }
    })
  })

  // -------------------------------------------------------------------------
  // Conditional controls on a step
  // -------------------------------------------------------------------------

  describe('a step value that exists only under a switch carries it in the same set', () => {
    const entries = device.recipes.flatMap((r) =>
      (r.articulation ?? []).map((a) => ({ id: r.id, slot: a.slot, set: a.set })),
    )

    it('has articulation to check', () => {
      expect(entries.length).toBeGreaterThan(8)
    })

    it('names the three conditions the manual footnotes, and no others', () => {
      // pp.98-99. SUBSTEP and HOLD STEP each carry "* This is enabled when MODE is ...", and
      // PITCH MODE's two values decide whether a per-step pitch exists at all. VELOCITY and
      // START are footnoted by nothing and are on the screen in either mode.
      expect(Object.keys(STEP_SWITCHES).sort()).toEqual(['hold-step', 'pitch', 'substep'])
      expect(STEP_SWITCHES['substep']).toEqual(['mode', 'TRIG'])
      expect(STEP_SWITCHES['hold-step']).toEqual(['mode', 'HOLD STEP'])
      expect(STEP_SWITCHES['pitch']).toEqual(['pitch-mode', 'CHROMATIC'])
    })

    it('sets the switch beside every conditional value, in that entry', () => {
      for (const { id, slot, set } of entries) {
        for (const [key, [switchKey, switchValue]] of Object.entries(STEP_SWITCHES)) {
          if (!(key in set)) continue
          expect(set[switchKey], `${id} ${slot} ${key}`).toBe(switchValue)
        }
      }
    })

    it('never sets a switch with nothing for it to gate', () => {
      // The mirror of the rule above: a bare `MODE` in a set is a mode change the reader is asked
      // to make for no reason, which is the same defect pointing the other way.
      const gatedBy = (switchKey: string) =>
        Object.entries(STEP_SWITCHES)
          .filter(([, [k]]) => k === switchKey)
          .map(([key]) => key)
      for (const { id, slot, set } of entries) {
        for (const switchKey of ['mode', 'pitch-mode']) {
          if (!(switchKey in set)) continue
          const gated = gatedBy(switchKey).filter((k) => k in set)
          expect(gated.length, `${id} ${slot} ${switchKey}`).toBeGreaterThan(0)
        }
      }
    })

    it('holds a step only where GATE MODE is ON, and lets the loop be either', () => {
      // p.98's MODE table: under HOLD STEP the sample's GATE parameter "is automatically set to
      // 'ON'", and ON is the state where a sample sounds only while it is held (p.30). So a held
      // step needs that state, and a recipe on any other one describes a pad the sequencer takes
      // straight back out of it.
      //
      // `LOOP` is deliberately unconstrained here: it is a separate button (p.32), and the
      // recipes that hold a step disagree about it on purpose.
      const holders = device.recipes.filter((r) =>
        (r.articulation ?? []).some((a) => 'hold-step' in a.set),
      )
      expect(holders.length).toBeGreaterThan(1)
      for (const recipe of holders) {
        expect(named(recipe, 'GATE MODE')?.value, recipe.id).toBe('ON')
      }
      expect(new Set(holders.map((r) => named(r, 'LOOP')?.value))).toEqual(new Set(['OFF', 'ON']))
    })
  })

  // -------------------------------------------------------------------------
  // GATE and LOOP are two controls, not one three-valued mode
  // -------------------------------------------------------------------------

  describe('the playback controls are the two buttons the panel has', () => {
    // p.26's "About sample playback mode" table lists Gate / One-shot playback / Loop against
    // three page references, and reads like a closed set of exclusive states. It is a reference
    // index: pp.30-32 show [GATE] with three states (dark, lit, blinking slowly — p.30, p.31) and
    // [LOOP] with its own two (p.32). Authoring the table as an enum lost every combination of
    // the two, including the gated loop the `pad` recipe is built on.

    it('gives every recipe both controls', () => {
      for (const recipe of device.recipes) {
        expect(named(recipe, 'GATE MODE'), recipe.id).toBeDefined()
        expect(named(recipe, 'LOOP'), recipe.id).toBeDefined()
      }
      expect(device.recipes.some((r) => named(r, 'PLAYBACK MODE') !== undefined)).toBe(false)
    })

    it('cites GATE MODE to both pages its three states are printed on', () => {
      // p.30 prints the lit/dark pair; the slow blink is only on p.31. A citation naming one of
      // them would point at a list that page does not contain.
      const gate = named(device.recipes[0] as Recipe, 'GATE MODE')
      expect(gate?.kind === 'enum' ? gate.options : undefined).toEqual({
        values: ['OFF', 'ON', 'ONE-SHOT'],
        verified: { kind: 'manual', source: `${MANUAL}, p.30, p.31` },
      })
    })

    it('turns the loop off wherever one-shot is on, because p.31 says the box does', () => {
      // "The loop function turns off (and the [LOOP] button goes dark) when one-shot playback is
      // on." Authored rather than assumed: a reader looking at a dark [LOOP] button should find
      // that state in the guide.
      for (const recipe of device.recipes) {
        if (named(recipe, 'GATE MODE')?.value !== 'ONE-SHOT') continue
        expect(named(recipe, 'LOOP')?.value, recipe.id).toBe('OFF')
      }
    })

    it('names a loop direction exactly where there is a loop to direct (p.32)', () => {
      for (const recipe of device.recipes) {
        const looping = named(recipe, 'LOOP')?.value === 'ON'
        const directed = named(recipe, 'LOOP DIRECTION') !== undefined
        expect(directed, recipe.id).toBe(looping)
      }
    })

    it('reaches the gated loop, which is the combination one enum could not say', () => {
      // GATE lit and LOOP lit at once: the sample sounds while the step is held (p.30) and
      // repeats to fill it (p.32). Nothing in the manual forbids the pair — only one-shot
      // interacts with LOOP, and only in one direction.
      const gatedLoops = device.recipes.filter(
        (r) => named(r, 'GATE MODE')?.value === 'ON' && named(r, 'LOOP')?.value === 'ON',
      )
      expect(gatedLoops.map((r) => r.id)).toEqual(['sp-pad-soft'])
      // And it is the recipe that needs it: a held chord longer than its own sample.
      expect(gatedLoops[0]?.realisation).toBe('sampled-chord')
      expect((gatedLoops[0]?.articulation ?? []).some((a) => 'hold-step' in a.set)).toBe(true)
    })

    it('keeps a hint per gesture, because the three GATE states are not one press', () => {
      // Two of the three are a press of [GATE]; one-shot is [VALUE] held while it is pressed.
      const byValue = new Map<string, string | undefined>()
      for (const recipe of device.recipes) {
        const gate = named(recipe, 'GATE MODE')
        if (gate !== undefined) byValue.set(gate.value as string, gate.hint)
      }
      expect(byValue.get('ONE-SHOT')).toBe('one-shot')
      expect(byValue.get('ON')).toBe('gate')
      expect(byValue.get('OFF')).toBe('gate')
      for (const hint of byValue.values()) {
        expect(Object.keys(device.hints ?? {})).toContain(hint)
      }
    })
  })

  // -------------------------------------------------------------------------
  // The articulable boundary (§4.3)
  // -------------------------------------------------------------------------

  describe('the articulation boundary', () => {
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )

    it('uses only the scalar subset that stays true for every hit in a slot', () => {
      // `bindArticulation` applies one `set` to *every* step carrying the slot, so a key may only
      // appear if it is a scalar, identical across those hits, and carries no state between them.
      for (const key of used) expect(ARTICULABLE_PER_STEP, key).toContain(key)
      expect([...used].sort()).toEqual([...ARTICULABLE_PER_STEP].sort())
    })

    it('declares the one capability it cannot reach, and reaches none of it', () => {
      // The honest half. `features.perStep` describes the box, so knob motion recording is named
      // (p.99, [ROLL] held with a [CTRL] knob) — and it is a curve over time, which a scalar
      // cannot be. Writing one number for it would say the knob was parked.
      const declared = device.features?.perStep ?? []
      expect(declared).toHaveLength(8)
      expect(declared.filter((k) => !used.has(k))).toEqual(['knob-motion'])
    })

    it('addresses steps only by PatternSlot, never by index', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          expect(typeof entry.slot).toBe('string')
          expect(Number.isNaN(Number(entry.slot))).toBe(true)
        }
      }
    })

    it('cites every page the declared set is documented on', () => {
      // The set spans three pages and the evidence has to name all of them: VELOCITY, PITCH,
      // PITCH MODE, SUBSTEP and HOLD STEP on p.98; START, MODE and knob motion on p.99; the
      // SUBSTEP division table on p.101.
      expect(device.capabilityEvidence?.['features.perStep']).toEqual({
        kind: 'manual',
        source: `${MANUAL}, p.98, p.99, p.101`,
      })
    })
  })

  // -------------------------------------------------------------------------
  // The rest of the manifest
  // -------------------------------------------------------------------------

  it('is one pool of sixteen pads carrying every role, at one voice each', () => {
    expect(device.voices).toHaveLength(1)
    const pool = device.voices[0]
    expect(pool).toMatchObject({ kind: 'pool', id: 'pad', count: 16, polyphony: 1 })
    expect(pool?.kind === 'pool' ? [...pool.roles].sort() : []).toEqual([...ROLES].sort())
    expect(expand(device)).toHaveLength(16)
  })

  it('reaches a chord only through a sample that already contains one (§12.4)', () => {
    for (const recipe of device.recipes) {
      const chordish = recipe.role === 'stab' || recipe.role === 'pad'
      expect(realisationOf(recipe), recipe.id).toBe(
        chordish ? 'sampled-chord' : 'polyphonic-voice',
      )
    }
  })

  it('keeps clock directional, because the manual names one wire out and two in', () => {
    // p.197. `MIDI Sync` synchronises to clocks "input via the MIDI IN connector or the USB
    // port"; `MIDI Sync Out` transmits "to the device connected to this unit's MIDI OUT
    // connector" and no page says clock leaves over USB.
    expect(device.clock.sendTransport).toEqual(['midi-din'])
    expect(device.clock.receiveTransport).toEqual(['midi-din', 'usb'])
    expect([...device.clock.transport].sort()).toEqual(['midi-din', 'usb'])
    expect(device.clock.preferredSource).toBeUndefined()
  })

  it('spans 178 x 276 mm in playing orientation, cited to the specifications page', () => {
    // p.266: `178 (W) x 276 (D) x 71 (H) mm`. Portrait, so the span is the smaller of the first
    // two and the 71 mm it stands off the desk is not either of them.
    expect(device.physical.panelSpanMm).toBe(178)
    expect(device.panel?.panelRiseMm).toBe(276)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.266` })
  })

  it('reads its panel off the one figure that shows the whole unit', () => {
    const layout = device.panel
    expect(layout?.verified).toEqual({
      kind: 'manual',
      source: `${MANUAL}, p.6 (Panel descriptions)`,
    })
    // Every feature inside the measured box, and exactly one voice field — pads [1]-[16], not the
    // fifth column of buttons beside them.
    const fields = (layout?.features ?? []).filter((f) => f.kind === 'voices')
    expect(fields).toHaveLength(1)
    for (const f of layout?.features ?? []) {
      const w = 'w' in f ? f.w : 'd' in f ? f.d : 0
      const h = 'h' in f ? f.h : 'd' in f ? f.d : 0
      expect(f.x, `${f.kind} x`).toBeGreaterThanOrEqual(0)
      expect(f.y, `${f.kind} y`).toBeGreaterThanOrEqual(0)
      expect(f.x + w, `${f.kind} right`).toBeLessThanOrEqual(178)
      expect(f.y + h, `${f.kind} bottom`).toBeLessThanOrEqual(276)
    }
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    // The library's regime: legality is the manual's claim, authority is taste. Roland prints its
    // ranges bare — `0–127`, `20–16000 (Hz)` — so every numeric here has one and none is guessed.
    const { counts } = auditDevice(device)
    expect(counts.numerics).toBeGreaterThan(100)
    expect(counts.manualRanges).toBe(counts.numerics)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    // No point is cited, enums included: which value suits a dark tom is taste, and the manual
    // has no opinion about it.
    expect(counts.manualPoints).toBe(0)
    expect(counts.observedPoints).toBe(0)
    expect(counts.uncheckedCapabilities).toBe(0)
  })

  it('resolves every authored recipe exactly, from every ordinal in the pool', () => {
    // Recipe lookup keys on `poolId ?? voiceId` (§2.2), so one pool recipe has to serve all
    // sixteen ordinals rather than the first.
    for (const assignable of expand(device)) {
      for (const recipe of device.recipes) {
        const notes = realisationOf(recipe) === 'sampled-chord' ? 3 : 1
        const where = `${recipe.id} on ${assignable.voiceId}`
        const resolution = resolveRecipe(
          device,
          assignable,
          recipe.role,
          recipe.character,
          notes,
        )
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(where)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  it('is in the registry exactly once', () => {
    expect(DEVICES.filter((d) => d.id === 'roland-sp-404mk2')).toHaveLength(1)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThanOrEqual(8)
    }
  })
})
