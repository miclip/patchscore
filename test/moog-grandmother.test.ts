import { describe, expect, it } from 'vitest'
import { moodState, receiveTransports, resolve, sendTransports } from '../lib/core/index'
import { device } from '../lib/devices/moog-grandmother/index'
import { device as mother32 } from '../lib/devices/moog-mother-32/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * The Grandmother, and the four claims in its manifest that a schema cannot check.
 *
 * Each of the four is a place where the manual says something conditional and the device data has
 * to keep two values together or lose the condition. Those are the failures that look like a read
 * manual, which is the whole point of §2.6's provenance and of CLAUDE.md's note about a cited
 * range that is the wrong range.
 *
 * The panel is not covered here — `test/rack.test.ts` counts every drawn shape across the library
 * and `test/registry-codegen.test.ts` asserts the span ordering, which is where the 584.2 mm
 * decision is checked against its neighbours.
 */
describe('Grandmother clock (§2.3/§7.4)', () => {
  /**
   * **The counter-example to the Mother-32**, and worth a test precisely because the two boxes
   * are otherwise so close. `ClockSpec` became directional because the Mother-32 receives over
   * MIDI and sends only analog pulses; this box does both over all three of its wires, so the
   * two direction fields are *omitted*, and an omission is exactly the sort of claim that decays
   * silently. p.35's CLOCK OUT "allows Grandmother to transmit clock sync to other instruments"
   * and closes "Grandmother can also send Clock information via MIDI"; p.36 sends and receives
   * MIDI over USB as well as the DINs.
   */
  it('sends and receives on all three wires, where the Mother-32 splits', () => {
    expect(sendTransports(device)).toEqual(['midi-din', 'usb', 'analog-clock'])
    expect(receiveTransports(device)).toEqual(['midi-din', 'usb', 'analog-clock'])
    // Not a vacuous pairing: the box it is being contrasted with really does differ.
    expect(sendTransports(mother32)).not.toEqual(receiveTransports(mother32))
  })

  /**
   * §7.4/#104. MIDI clock leaves only if a global setting says so, and p.37 is the one entry on
   * that page with **no printed default** — so a reader told to sync the rig over MIDI and not
   * told where the switch is gets silence. Both MIDI transports carry the setup because there is
   * one setting for both ports (p.36).
   */
  it('carries the MIDI clock switch on both MIDI transports, and none on the analog jack', () => {
    const setups = device.clock.sourceSetup ?? []
    expect(setups.map((s) => s.transport)).toEqual(['midi-din', 'usb'])
    for (const setup of setups) {
      expect(setup.path).toContain('MIDI CLOCK OUTPUT')
      expect(setup.value).toContain('SEND MIDI CLOCK')
    }
    // The analog CLOCK OUT needs nothing switched on, so it declares nothing (§7.4: "A box that
    // needs no setting declares none"). Its factory PPQN is on the jack's own note instead.
    expect(setups.some((s) => s.transport === 'analog-clock')).toBe(false)
    const clockOut = device.jacks?.find((j) => j.id === 'ARP/SEQ CV · CLOCK OUT')
    expect(clockOut?.note).toContain('2 PPQN')
  })
})

describe('Grandmother voice control (§3.3)', () => {
  /**
   * **One output bundle and no input bundle, and both halves are the hardware.**
   *
   * `ARP/SEQ · KB OUT` (1 V/oct, p.29) pairs with `ARP/SEQ · GATE OUT` in the same module, which
   * is p.7's own description of the box: "a powerful keyboard front end for expanding a
   * Mother-32, DFAM, or any Eurorack modular system". The Mother-32 takes external pitch and gate
   * as a pair, so this rig of two is the case the pass exists for.
   */
  it('drives a Mother-32 from its keyboard, over the pair p.7 says it is for', () => {
    const rig = [device, mother32]
    const patch = resolve({
      devices: rig,
      template: industrialTechno,
      mood: moodState(),
      seed: 1,
    }).interDevicePatch
    expect(patch.outcome).toBe('routed')
    expect(patch.source?.deviceId).toBe('moog-grandmother')
    const routed = patch.targets.filter((t) => t.outcome === 'routed')
    expect(routed.map((t) => t.deviceId)).toEqual(['moog-mother-32'])
    expect(routed[0]?.cables.map((c) => `${c.fromJack} -> ${c.toJack}`)).toEqual([
      'ARP/SEQ · KB OUT -> IN · VCO 1V/OCT',
      'ARP/SEQ · GATE OUT -> IN · GATE',
    ])
  })

  /**
   * The other half, and the reason the Mother-32's `IN ·` / `OUT ·` qualifier scheme is
   * deliberately not copied. Its pitch inputs are one per oscillator, each summing with the
   * keyboard (pp.12-13), so a two-cable bundle into this box would move *one* oscillator and
   * leave the other on the keyboard's note — wrong on the hardware. Under module qualifiers no
   * input bundle forms, which is the honest answer; under `IN ·` / `OUT ·` one would have been
   * manufactured out of a naming convention.
   *
   * Asserted over the whole registry rather than one rig, because the claim is about the manifest
   * and not about a particular pairing: this box is never a target of anybody's cable.
   */
  it('is never the target of a voice-control cable, because it has no pair to be played into', () => {
    const patch = resolve({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    }).interDevicePatch
    expect(patch.targets.map((t) => t.deviceId)).not.toContain('moog-grandmother')
    // Not vacuous: the pass did find targets in this rig, and one of them is the sibling box
    // whose manifest *did* have to solve the qualifier problem.
    expect(patch.targets.length).toBeGreaterThan(0)
  })
})

describe('Grandmother recipes: the two conditions the manual attaches to a value', () => {
  const params = (recipeId: string) => {
    const recipe = device.recipes.find((r) => r.id === recipeId)
    if (recipe === undefined) throw new Error(`no recipe ${recipeId}`)
    return recipe.params
  }
  const named = (recipeId: string, name: string) =>
    params(recipeId).find((p) => p.name === name)

  /**
   * **CLAUDE.md's rule, on the worst case in the library so far.** p.12 gives OSCILLATOR 2
   * FREQUENCY a range of ±7 semitones and then withdraws it twice: with SYNC lit "the range of
   * the FREQUENCY knob is also greatly increased" and no figure is printed for the increase, and
   * a NOTE says the range "can be specified in the Global Settings" — a setting the Global
   * Settings chapter (pp.37-38) does not contain.
   *
   * So a semitone figure beside a lit SYNC button is a number read off a scale that is not in
   * force. `osc2()` emits the two together and switches the parameter's kind on the switch; this
   * is the check that no future recipe separates them by hand.
   */
  it('never prints FREQUENCY in semitones beside a lit SYNC', () => {
    let sawSync = false
    for (const recipe of device.recipes) {
      const sync = recipe.params.find((p) => p.name === 'SYNC')
      const freq = recipe.params.find((p) => p.name === 'OSCILLATOR 2 FREQUENCY')
      // Every recipe that sets one sets the other. That is the pairing, and it is the thing that
      // would decay first.
      expect(sync === undefined, recipe.id).toBe(freq === undefined)
      if (sync === undefined || freq === undefined) continue
      if (sync.kind !== 'enum' || freq.kind !== 'numeric') throw new Error('kinds moved')
      if (sync.value === 'ON') {
        sawSync = true
        expect(freq.unit, recipe.id).toBe('% travel')
        expect(freq.range.verified, recipe.id).toBe(false)
      } else {
        expect(freq.unit, recipe.id).toBe('st')
        expect(freq.range, recipe.id).toMatchObject({ min: -7, max: 7 })
        expect(freq.range.verified, recipe.id).not.toBe(false)
      }
    }
    // The `ON` branch is reached by real content, so this test cannot pass by never taking it.
    expect(sawSync).toBe(true)
  })

  /**
   * p.23: "The PITCH AMT, CUTOFF AMT, and PULSE WIDTH AMT knobs are used to specify the maximum
   * amount of modulation … **In order to actually apply the modulation and hear the effect, the
   * MOD wheel must be set to a greater than minimum position.**"
   *
   * A recipe that sets an AMT knob and stops has printed a value that does nothing, which is
   * #101's complaint. `MOD` is emitted by the same helper for that reason.
   */
  it('never sets a modulation amount without saying where MOD has to be', () => {
    const amounts = ['PITCH AMT', 'CUTOFF AMT', 'PULSE WIDTH AMT']
    let sawAmount = false
    for (const recipe of device.recipes) {
      const usesAmount = recipe.params.some((p) => amounts.includes(p.name))
      if (!usesAmount) continue
      sawAmount = true
      const wheel = recipe.params.find((p) => p.name === 'MOD')
      expect(wheel, recipe.id).toBeDefined()
      if (wheel?.kind !== 'numeric') throw new Error('MOD is not numeric')
      // And it has to be off the minimum, or the sentence on p.23 is being quoted and ignored.
      expect(wheel.value, recipe.id).toBeGreaterThan(0)
    }
    expect(sawAmount).toBe(true)
  })

  /**
   * p.30, and the manual could not be more direct: "**In order to for Grandmother to reflect this
   * dynamic change, you will need to connect a patch cable from the KB VEL OUT jack (ARP / SEQ
   * module) to the CUTOFF IN jack on the Filter module.**" An accent on this box is inaudible
   * until that cable exists, so a recipe that authors one and omits the cable is telling a reader
   * to program something they will not hear.
   */
  it('carries the accent cable on every recipe that authors an accent', () => {
    let sawAccent = false
    for (const recipe of device.recipes) {
      const accents = (recipe.articulation ?? []).some((a) => a.set['accent'] === true)
      if (!accents) continue
      sawAccent = true
      const cables = (recipe.patch ?? []).map((p) => `${p.from} -> ${p.to}`)
      expect(cables, recipe.id).toContain('ARP/SEQ · KB VEL OUT -> FILTER · CUTOFF IN')
    }
    expect(sawAccent).toBe(true)
  })

  /**
   * The three lanes p.27 names and no others. The Mother-32 has gate length, glide and ratchet
   * per step; this box has none of them, and GLIDE is one knob for the instrument. A fourth lane
   * appearing here would be a lane nobody read a page for.
   */
  it('declares the three per-step lanes the manual names, and no fourth', () => {
    expect(device.features?.perStep).toEqual(['rest', 'tie', 'accent'])
    expect(named('gm-pad-soft', 'GLIDE')).toBeDefined()
  })

  /**
   * The one control on this panel mood may move, and the range it may move inside. p.16: the
   * ladder filter attenuates "from 10Hz to 20kHz". The panel's own decade marks start at 20 Hz,
   * which is recorded in `index.ts`; every authored value sits far inside both, so the
   * disagreement never reaches a rendered number — and this is the test that says so.
   */
  it('keeps every authored CUTOFF well inside both printed floors', () => {
    let seen = 0
    for (const recipe of device.recipes) {
      const cutoff = recipe.params.find((p) => p.name === 'CUTOFF')
      if (cutoff?.kind !== 'numeric') continue
      seen++
      expect(cutoff.range, recipe.id).toMatchObject({ min: 10, max: 20000 })
      // Above the panel's leftmost silkscreened decade, not merely above the prose's 10 Hz.
      expect(cutoff.value, recipe.id).toBeGreaterThan(20)
      expect(cutoff.mood?.map((m) => m.axis), recipe.id).toEqual(['darkness'])
    }
    expect(seen).toBe(device.recipes.length)
  })
})

describe('Grandmother patch points (§3.3)', () => {
  /**
   * p.54: "PATCH POINTS: 41 x 3.5mm front and rear panels / 21 Inputs / 16 Outputs / 4
   * Parallel-wired Mults." The declared list is the whole forty-one plus the two 1/4" audio jacks
   * and the three MIDI DINs — a partial list would read as a claim that the rest do not exist.
   *
   * The mult count is what makes this worth asserting rather than eyeballing: p.54 refuses to
   * classify the four and p.7 buckets them as outputs, so 21 + 16 + 4 and 21 + 20 are the same
   * forty-one counted two ways, and the manifest follows p.7.
   */
  it('declares all forty-one 3.5 mm points, in the direction split p.7 gives', () => {
    const jacks = device.jacks ?? []
    const quarterInchOrDin = [
      'AUDIO · MAIN OUT / HEADPHONE OUT',
      'AUDIO · INSTRUMENT IN',
      'MIDI IN',
      'MIDI OUT',
      'MIDI THRU',
    ]
    const patchPoints = jacks.filter((j) => !quarterInchOrDin.includes(j.id))
    expect(patchPoints).toHaveLength(41)
    expect(patchPoints.filter((j) => j.direction === 'in')).toHaveLength(21)
    // 16 outputs plus the four mults, which p.7 counts as outputs and the schema has no third
    // direction for. `index.ts` carries the reasoning and the cost.
    expect(patchPoints.filter((j) => j.direction === 'out')).toHaveLength(20)
    expect(patchPoints.filter((j) => j.id.startsWith('UTILITIES · MULT'))).toHaveLength(4)
  })

  /**
   * Every cable a recipe authors has to land on a declared jack in the right direction. The
   * generic `jack()` helper makes `cable()`'s endpoints a literal union so a typo is a compile
   * error, but direction is not in the type — and a cable drawn out of an input is the sort of
   * thing that reads perfectly well in prose.
   */
  it('runs every authored cable from a declared output to a declared input', () => {
    const byId = new Map((device.jacks ?? []).map((j) => [j.id, j]))
    let cables = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.patch ?? []) {
        cables++
        expect(byId.get(entry.from)?.direction, `${recipe.id}: ${entry.from}`).toBe('out')
        expect(byId.get(entry.to)?.direction, `${recipe.id}: ${entry.to}`).toBe('in')
      }
    }
    expect(cables).toBeGreaterThan(0)
  })
})


// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * pp.19 and 21, rendered and read. SUSTAIN: *"the control signal will remain at the level set by the
 * SUSTAIN slider for as long as a key is held"*; VCA MODE `DRONE`: *"Grandmother will continue to
 * output sound at the current volume level whether a key is held or not"*. Four hold under `ENV`
 * on the slider — the acid at 6, low and not silent — and the texture holds under `DRONE`, naming
 * only the switch; nothing patches into VCA AMT IN.
 */
describe('sustain claims (§3/#506)', () => {
  const heldRoles = (() => {
    const longest = new Map<string, number>()
    for (const t of TEMPLATES) {
      for (const hook of t.hooks) {
        for (const note of hook.notes) {
          if (note.len > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, note.len)
        }
      }
    }
    return new Set([...longest].filter(([, len]) => len >= 16).map(([role]) => role))
  })()

  it('holds on the sub, the acid and both pads, envelope on the VCA with its sustain up', () => {
    const ids = ['gm-sub-dark', 'gm-acid-bright', 'gm-pad-soft', 'gm-pad-dark']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['SUSTAIN', 'VCA MODE'] },
        evidence: { kind: 'manual', source: 'Moog Grandmother User’s Manual (Version 2), pp.19, 21' },
      })
      for (const name of ['SUSTAIN', 'VCA MODE']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('holds on the texture with the VCA in DRONE, and names only the switch', () => {
    const ids = ['gm-texture-soft']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['VCA MODE'] },
        evidence: { kind: 'manual', source: 'Moog Grandmother User’s Manual (Version 2), p.21' },
      })
      for (const name of ['VCA MODE']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['gm-sub-dark', 'gm-acid-bright', 'gm-pad-soft', 'gm-pad-dark', 'gm-texture-soft'].sort())
    const unclaimed = device.recipes
      .filter((r) => heldRoles.has(r.role) && r.sustain === undefined)
      .map((r) => r.id)
    expect(unclaimed).toEqual([])
    for (const r of device.recipes) {
      if (!heldRoles.has(r.role)) expect(r.sustain, r.id).toBeUndefined()
    }
  })

  it('pairs each claim with the switch position and level it rests on', () => {
    const param = (id: string, name: string) => device.recipes.find((r) => r.id === id)?.params.find((p) => p.name === name)
    for (const id of ['gm-sub-dark', 'gm-acid-bright', 'gm-pad-soft', 'gm-pad-dark']) {
      expect(param(id, 'VCA MODE'), id).toMatchObject({ value: 'ENV' })
      expect(param(id, 'SUSTAIN'), id).toMatchObject({ kind: 'numeric' })
      const s = param(id, 'SUSTAIN')
      if (s?.kind === 'numeric') expect(s.value, id).toBeGreaterThan(0)
    }
    expect(param('gm-texture-soft', 'VCA MODE')).toMatchObject({ value: 'DRONE' })
    for (const entry of device.recipes.find((r) => r.id === 'gm-texture-soft')?.patch ?? []) {
      expect(entry.to).not.toMatch(/VCA AMT IN/)
    }
  })
})
