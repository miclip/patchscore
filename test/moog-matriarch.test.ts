import { describe, expect, it } from 'vitest'
import { moodState, receiveTransports, resolve, sendTransports } from '../lib/core/index'
import { device } from '../lib/devices/moog-matriarch/index'
import { device as grandmother } from '../lib/devices/moog-grandmother/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, ambientDub, industrialTechno } from '../lib/templates/index'

/**
 * The Matriarch, and the claims a schema cannot check.
 *
 * The load-bearing one is the paraphony: `polyphony: 4` is true in one of three switch positions,
 * and the device field cannot say so. Everything else in this file is the same discipline one
 * control at a time — a value whose printed range depends on a switch, a clock output whose
 * factory setting withholds clock, a per-step lane the box does not have.
 */
describe('Matriarch paraphony (§12.4/#40)', () => {
  /**
   * **The headline behaviour, and the reason `polyphony: 4` is worth the trouble.** p.50's four
   * oscillators can be played from four keys, so a four-note pad is *filled* rather than reported
   * as a gap — the first time in this library that happens. The comparison is the point: the
   * Grandmother is the same maker, the same year and the same case, and it can only report the
   * shortfall.
   */
  it('fills a four-note pad, where the monophonic sibling reports a polyphony gap', () => {
    const drums = DEVICES.filter((d) => d.id === 'roland-tr-1000')
    const withMat = resolve({
      devices: [...drums, device],
      template: ambientDub,
      mood: moodState(),
      seed: 3,
    })
    const pad = withMat.assignments.find((a) => a.role === 'pad')
    expect(pad?.deviceId).toBe('moog-matriarch')
    expect(pad?.notes).toBe(4)
    expect(withMat.shortfalls.find((s) => s.role === 'pad')).toBeUndefined()

    // The same request on the sibling box is a `polyphony` shortfall, not a `no-room` one: it is a
    // capability gap rather than a supply one, and §7.3 makes those different sentences.
    const withGm = resolve({
      devices: [...drums, grandmother],
      template: ambientDub,
      mood: moodState(),
      seed: 3,
    })
    const gap = withGm.shortfalls.find((s) => s.role === 'pad')
    expect(gap?.reason).toBe('no-capable-voice')
    // `because` narrows the cause to the interesting half — the voices declare `pad` and still
    // cannot reach four notes — and only exists on that variant of the union.
    if (gap?.reason !== 'no-capable-voice') throw new Error('not the polyphony gap')
    expect(gap.because).toBe('polyphony')
  })

  /**
   * **The rule the device field cannot express.** `polyphony: 4` holds only at VOICE MODE 4;
   * mode 1 is monophonic and mode 2 gives two notes (p.51). So a recipe for a role that any
   * shipped template ever requests with more than one note must sit in a mode that delivers them.
   *
   * Driven off `TEMPLATES` rather than a hard-coded role list, because the failure this guards
   * against is a *future* template: a three-note `lead` request would otherwise land on
   * `mat-lead-bright` and print a chord beside `VOICE MODE 1`.
   */
  it('puts every polyphonically-requested role in a voice mode that can sound it', () => {
    const maxNotes = new Map<string, number>()
    for (const template of TEMPLATES) {
      for (const request of template.roles) {
        const n = request.polyphony ?? 1
        maxNotes.set(request.role, Math.max(maxNotes.get(request.role) ?? 1, n))
      }
    }
    let checked = 0
    for (const recipe of device.recipes) {
      const needed = maxNotes.get(recipe.role) ?? 1
      if (needed <= 1) continue
      checked++
      const mode = recipe.params.find((p) => p.name === 'VOICE MODE')
      if (mode?.kind !== 'enum') throw new Error(`${recipe.id} sets no VOICE MODE`)
      expect(Number(mode.value), `${recipe.id} serves ${needed} notes`).toBeGreaterThanOrEqual(needed)
    }
    // Not vacuous: `pad` and `stab` are requested with 3 and 4 notes today.
    expect(checked).toBeGreaterThan(0)
  })

  /**
   * In mode 4 each key plays one oscillator (p.51), so each oscillator is a different note of the
   * chord and its FREQUENCY knob — a detune against Oscillator 1 (p.14) — has to sit at zero or a
   * chord note is out of tune. Nothing in the schema knows that.
   */
  it('zeroes every detune in the four-note mode, because each oscillator is a chord note', () => {
    let seen = 0
    for (const recipe of device.recipes) {
      const mode = recipe.params.find((p) => p.name === 'VOICE MODE')
      if (mode?.kind !== 'enum' || mode.value !== '4') continue
      seen++
      for (const p of recipe.params) {
        if (!p.name.includes('FREQUENCY')) continue
        if (p.kind !== 'numeric') throw new Error('FREQUENCY is not numeric')
        expect(p.value, `${recipe.id} · ${p.name}`).toBe(0)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  /**
   * Mode 2 is deliberately unauthored: it pairs oscillators 1+2 against 3+4 (p.51) and nothing in
   * the document says whether Oscillator 3's FREQUENCY then detunes it from Oscillator 1 — which
   * would put the second note sharp — or from its own key. Guessing would be inventing an
   * assignment (invariant 5), so the absence is the claim and this is what holds it.
   */
  it('authors no mode-2 recipe, because the manual does not say what FREQUENCY does there', () => {
    for (const recipe of device.recipes) {
      const mode = recipe.params.find((p) => p.name === 'VOICE MODE')
      if (mode?.kind !== 'enum') throw new Error(`${recipe.id} sets no VOICE MODE`)
      expect(mode.value, recipe.id).not.toBe('2')
    }
    // The switch position still exists on the box, and the option set still says so.
    const anyMode = device.recipes[0]?.params.find((p) => p.name === 'VOICE MODE')
    if (anyMode?.kind !== 'enum') throw new Error('no VOICE MODE')
    expect(anyMode.options.values).toEqual(['1', '2', '4'])
  })
})

describe('Matriarch: values whose printed range depends on a switch', () => {
  /**
   * CLAUDE.md's rule, on the Grandmother's trap three times over. p.14 gives Oscillators 2, 3 and
   * 4 a ±7 semitone detune and then withdraws it while the oscillator is sync'd — and sync needs
   * **two** switches, the module's `SYNC ENABLE` and the oscillator's own (p.15: "the main red
   * SYNC button must be On (lit) for the individual Oscillator Sync functions to work").
   *
   * So a semitone figure is only in force when that pair is not both on. `osc()` emits the switch
   * and the value together and flips the parameter's kind; this is the check that no future recipe
   * separates them.
   */
  it('never prints a detune in semitones on an oscillator that is actually sync’d', () => {
    let sawLiveSync = false
    for (const recipe of device.recipes) {
      const main = recipe.params.find((p) => p.name === 'SYNC ENABLE')
      const mainOn = main?.kind === 'enum' && main.value === 'ON'
      for (const n of [2, 3, 4]) {
        const sync = recipe.params.find((p) => p.name === `OSCILLATOR ${n} SYNC`)
        const freq = recipe.params.find((p) => p.name === `OSCILLATOR ${n} FREQUENCY`)
        // The pairing itself: one never appears without the other.
        expect(sync === undefined, `${recipe.id} osc ${n}`).toBe(freq === undefined)
        if (sync === undefined || freq === undefined) continue
        if (sync.kind !== 'enum' || freq.kind !== 'numeric') throw new Error('kinds moved')
        if (mainOn && sync.value === 'ON') {
          sawLiveSync = true
          expect(freq.unit, `${recipe.id} osc ${n}`).toBe('% travel')
          expect(freq.range.verified, `${recipe.id} osc ${n}`).toBe(false)
        } else {
          expect(freq.unit, `${recipe.id} osc ${n}`).toBe('st')
          expect(freq.range, `${recipe.id} osc ${n}`).toMatchObject({ min: -7, max: 7 })
          expect(freq.range.verified, `${recipe.id} osc ${n}`).not.toBe(false)
        }
      }
    }
    // The sync'd branch is reached by real content, so this cannot pass by never taking it.
    expect(sawLiveSync).toBe(true)
  })

  /**
   * p.36's AMT knobs set a maximum depth that the MOD slider scales, so a recipe that sets one and
   * leaves the slider unstated prints a value that does nothing — #101's complaint, and the same
   * sentence the Grandmother's p.23 makes about the same three controls.
   */
  it('never sets a modulation amount without saying where MOD has to be', () => {
    const amounts = ['PITCH AMT', 'CUTOFF AMT', 'PULSE WIDTH AMT']
    let seen = 0
    for (const recipe of device.recipes) {
      if (!recipe.params.some((p) => amounts.includes(p.name))) continue
      seen++
      const wheel = recipe.params.find((p) => p.name === 'MOD')
      expect(wheel, recipe.id).toBeDefined()
      if (wheel?.kind !== 'numeric') throw new Error('MOD is not numeric')
      expect(wheel.value, recipe.id).toBeGreaterThan(0)
    }
    expect(seen).toBeGreaterThan(0)
  })

  /**
   * The one control mood may move, and the range it moves inside. p.21's silkscreen is the *only*
   * printed scale for it — the prose gives no figure anywhere, which is the opposite provenance to
   * the Grandmother, whose prose and silkscreen disagree.
   */
  it('keeps every authored CUTOFF inside the one printed scale', () => {
    let seen = 0
    for (const recipe of device.recipes) {
      const cutoff = recipe.params.find((p) => p.name === 'CUTOFF')
      if (cutoff?.kind !== 'numeric') continue
      seen++
      expect(cutoff.range, recipe.id).toMatchObject({ min: 20, max: 20000 })
      expect(cutoff.value, recipe.id).toBeGreaterThan(20)
      expect(cutoff.value, recipe.id).toBeLessThan(20000)
      expect(cutoff.mood?.map((m) => m.axis), recipe.id).toEqual(['darkness'])
    }
    expect(seen).toBe(device.recipes.length)
  })
})

describe('Matriarch clock (§2.3/§7.4)', () => {
  it('sends and receives on all three wires, like the Grandmother', () => {
    expect(sendTransports(device)).toEqual(['midi-din', 'usb', 'analog-clock'])
    expect(receiveTransports(device)).toEqual(['midi-din', 'usb', 'analog-clock'])
  })

  /**
   * §7.4/#104, and the mirror image of the Grandmother. There, MIDI clock needed a switch and the
   * analog jack needed nothing; here MIDI defaults to sending (Global Setting 1.6, p.64) and **the
   * analog jack defaults to withholding** — 2.2's factory value is ONLY WHEN PLAYING (p.65), so a
   * reader who patches CLOCK OUT and does not press PLAY gets silence.
   */
  it('carries the analog setup and none for MIDI, because that is which one withholds clock', () => {
    const setups = device.clock.sourceSetup ?? []
    expect(setups.map((s) => s.transport)).toEqual(['analog-clock'])
    expect(setups[0]?.path).toContain('Clock Output')
    expect(setups[0]?.value).toContain('ALWAYS')
    expect(setups[0]?.note).toContain('ONLY WHEN PLAYING')
    // The Grandmother needs the opposite pair, and that contrast is the reason both are asserted.
    expect((grandmother.clock.sourceSetup ?? []).map((s) => s.transport)).toEqual([
      'midi-din',
      'usb',
    ])
  })
})

describe('Matriarch voice control (§3.3)', () => {
  /**
   * **Two output bundles**, which only the Metropolix also offers and it does it with two tracks:
   * `ARP/SEQ · CV OUT` + `GATE OUT` is the sequenced line, `KEYBOARD · KB CV OUT` + `KB GATE OUT`
   * is what you play. That is p.9's "powerful keyboard front-end for expanding a DFAM, Mother-32,
   * Grandmother, or Eurorack modular system", and it is why this box can drive two others.
   */
  it('offers two pitch-and-gate pairs, and drives two boxes with them', () => {
    const rig = DEVICES.filter((d) =>
      ['moog-matriarch', 'moog-mother-32', 'behringer-crave'].includes(d.id),
    )
    const patch = resolve({
      devices: rig,
      template: industrialTechno,
      mood: moodState(),
      seed: 1,
    }).interDevicePatch
    expect(patch.source?.deviceId).toBe('moog-matriarch')
    expect(patch.source?.candidates).toBe(2)
    const routed = patch.targets.filter((t) => t.outcome === 'routed')
    expect(routed.length).toBe(2)
  })

  /**
   * The other half, and the same hardware fact as the Grandmother's only more so: the pitch inputs
   * are one per oscillator, each summed with the keyboard note (p.16), so a single pitch cable
   * moves one of four oscillators. There is nothing to play *into*, and the pass says nothing
   * rather than something false.
   */
  it('is never the target of a voice-control cable', () => {
    const patch = resolve({
      devices: [...DEVICES],
      template: industrialTechno,
      mood: moodState(),
      seed: 18,
    }).interDevicePatch
    expect(patch.targets.map((t) => t.deviceId)).not.toContain('moog-matriarch')
    expect(patch.targets.length).toBeGreaterThan(0)
  })
})

describe('Matriarch patch points (§3.3)', () => {
  /**
   * p.90: `90 x 3.5mm`, `49 Inputs, 33 Outputs`, `8 (4x2) Parallel-Wired Unbuffered Mults`. This
   * asserts the split rather than only the total, which is what makes it a check on ninety
   * *directions* rather than on ninety declarations — and it caught nothing, which is the point of
   * running it against the specifications instead of against my own reading of ten pages.
   */
  it('declares all ninety 3.5 mm points in p.90’s own direction split', () => {
    const jacks = device.jacks ?? []
    const notPatchPoints = [
      'AUDIO · MAIN OUT (L / MONO)',
      'AUDIO · MAIN OUT (R)',
      'AUDIO · INSTRUMENT IN',
      'AUDIO · HEADPHONES',
      'KEYBOARD · SUS PEDAL IN',
      'KEYBOARD · EXP PEDAL IN',
      'MIDI IN',
      'MIDI OUT',
      'MIDI THRU',
    ]
    const points = jacks.filter((j) => !notPatchPoints.includes(j.id))
    const mults = points.filter((j) => j.id.includes('· MULT '))
    expect(points).toHaveLength(90)
    expect(mults).toHaveLength(8)
    expect(points.filter((j) => j.direction === 'in')).toHaveLength(49)
    // 33 outputs plus the eight mults, which the schema has no third direction for.
    expect(points.filter((j) => j.direction === 'out')).toHaveLength(41)
  })

  /**
   * Only `ARP/SEQ CV · CLOCK IN` and `· CLOCK OUT` claim the analog clock. `STEREO DELAY CV ·
   * SYNC IN` genuinely takes a clock (p.56) but clocks the *delay*, so it claims no transport —
   * two jacks claiming one transport in one direction would leave the rack choosing.
   */
  it('lets exactly one jack claim each transport in each direction', () => {
    const seen = new Map<string, string[]>()
    for (const j of device.jacks ?? []) {
      for (const t of j.clock ?? []) {
        const key = `${t}/${j.direction}`
        seen.set(key, [...(seen.get(key) ?? []), j.id])
      }
    }
    for (const [key, ids] of seen) expect(ids, key).toHaveLength(1)
    const delaySync = (device.jacks ?? []).find((j) => j.id === 'STEREO DELAY CV · SYNC IN')
    expect(delaySync?.signal).toContain('clock')
    expect(delaySync?.clock).toBeUndefined()
  })

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

describe('Matriarch per-step (§4.3)', () => {
  /**
   * p.46 names three lanes and the panel gives each a coloured button. **There is no accent lane**,
   * where the Grandmother has one and no ratchet — so the §4.3 `accent` *slot* is still reached by
   * the patterns for several of these roles while the box has no accent *lane* to set on it, and
   * the recipes write a ratchet there instead. The slot and the lane are two vocabularies and this
   * is the first device where they come apart on a step the pattern actually reaches.
   */
  it('declares rest, tie and ratchet, and sets no accent anywhere', () => {
    expect(device.features?.perStep).toEqual(['rest', 'tie', 'ratchet'])
    expect(grandmother.features?.perStep).toContain('accent')
    let onAccentSlot = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(device.features?.perStep, `${recipe.id} sets ${key}`).toContain(key)
          expect(key, recipe.id).not.toBe('accent')
        }
        if (entry.slot === 'accent') onAccentSlot++
      }
    }
    // The substitution really happens rather than being described: some recipe puts a ratchet on
    // the accent slot.
    expect(onAccentSlot).toBeGreaterThan(0)
  })

  /** p.9's own feature list: "Dual, voltage-controlled analog LFOs". The second has no internal route. */
  it('counts two LFOs, neither of them clock-synced', () => {
    expect(device.features?.lfo?.count).toBe(2)
    expect(device.features?.lfo?.syncable).toBe(false)
  })
})
