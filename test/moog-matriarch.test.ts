import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  groupedParams,
  moodState,
  paramLabel,
  receiveTransports,
  renderGuide,
  resolve,
  sendTransports,
} from '../lib/core/index'
import { device } from '../lib/devices/moog-matriarch/index'
import { MATRIARCH_PANEL } from '../lib/devices/moog-matriarch/panel'
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

/**
 * §3.1/#385. **Eleven boxes, and this panel draws every one of them in ink.**
 *
 * The fifth device in the library to author `module`, after the Muse (#413), the Subsequent 37
 * (#416), the NEUTRON (#425) and the minilogue xd (#426), and the one where the panel is least
 * ambiguous and most treacherous at the same time. `panel.ts` draws ten module enclosures
 * measured off p.9, plus `PARAPHONY` nested inside `OUTPUT` and `LEFT-HAND CONTROLLER` below the
 * panel band. Twelve boxes; eleven hold a control some recipe states.
 *
 * Two things here are not readable off a name, and both are asserted below rather than described:
 *
 *  - **`MOD` is not in `MODULATION`.** It is the wheel under the player's left hand, drawn in
 *    `LEFT-HAND CONTROLLER` beside `PITCH` and `GLIDE`, while `mod()` emits it in the same block
 *    as six controls that really are in the modulation enclosure. Stamping that helper wholesale
 *    is the natural move and is wrong.
 *  - **Two boxes are silkscreened `UTILITIES`.** The label does not say which one a control is
 *    in; the coordinate does.
 */
describe('every control is boxed by the panel enclosure it sits in (#385)', () => {
  /** The reading. Left is the authored name; right is the box the panel draws around it. */
  const SECTIONS: Record<string, string> = {
    'VOICE MODE': 'PARAPHONY',

    'MODE': 'ARP/SEQ',
    'DIRECTION': 'ARP/SEQ',
    'OCT / BANK': 'ARP/SEQ',

    'SYNC ENABLE': 'OSCILLATORS',
    'OSCILLATOR 1 OCTAVE': 'OSCILLATORS',
    'OSCILLATOR 1 WAVEFORM': 'OSCILLATORS',
    'OSCILLATOR 2 OCTAVE': 'OSCILLATORS',
    'OSCILLATOR 2 WAVEFORM': 'OSCILLATORS',
    'OSCILLATOR 2 SYNC': 'OSCILLATORS',
    'OSCILLATOR 2 FREQUENCY': 'OSCILLATORS',
    'OSCILLATOR 3 OCTAVE': 'OSCILLATORS',
    'OSCILLATOR 3 WAVEFORM': 'OSCILLATORS',
    'OSCILLATOR 3 SYNC': 'OSCILLATORS',
    'OSCILLATOR 3 FREQUENCY': 'OSCILLATORS',
    'OSCILLATOR 4 OCTAVE': 'OSCILLATORS',
    'OSCILLATOR 4 WAVEFORM': 'OSCILLATORS',
    'OSCILLATOR 4 SYNC': 'OSCILLATORS',
    'OSCILLATOR 4 FREQUENCY': 'OSCILLATORS',

    // The mixer's five level knobs, whose panel labels are the bare oscillator numbers — which
    // is why they are not `OSCILLATOR n LEVEL` and why the two blocks cannot be told apart by
    // prefix.
    'OSCILLATOR 1': 'MIXER',
    'OSCILLATOR 2': 'MIXER',
    'OSCILLATOR 3': 'MIXER',
    'OSCILLATOR 4': 'MIXER',
    'NOISE': 'MIXER',

    'CUTOFF': 'FILTERS',
    'FILTER MODE': 'FILTERS',
    'RESONANCE 1': 'FILTERS',
    'RESONANCE 2': 'FILTERS',
    'SPACING': 'FILTERS',
    'ENVELOPE AMT': 'FILTERS',
    'KB TRACKING': 'FILTERS',

    'FILTER ATTACK': 'ENVELOPE GENERATORS',
    'FILTER DECAY': 'ENVELOPE GENERATORS',
    'FILTER SUSTAIN': 'ENVELOPE GENERATORS',
    'FILTER RELEASE': 'ENVELOPE GENERATORS',
    'AMPLITUDE ATTACK': 'ENVELOPE GENERATORS',
    'AMPLITUDE DECAY': 'ENVELOPE GENERATORS',
    'AMPLITUDE SUSTAIN': 'ENVELOPE GENERATORS',
    'AMPLITUDE RELEASE': 'ENVELOPE GENERATORS',

    'VCA MODE': 'OUTPUT',
    'MAIN VOLUME': 'OUTPUT',

    'DELAY TIME': 'STEREO DELAY',
    'DELAY SPACING': 'STEREO DELAY',
    'DELAY FEEDBACK': 'STEREO DELAY',
    'DELAY MIX': 'STEREO DELAY',
    'PING PONG': 'STEREO DELAY',

    'MODULATION RATE': 'MODULATION',
    'MODULATION WAVEFORM': 'MODULATION',
    'PITCH MOD ASSIGN': 'MODULATION',
    'PITCH AMT': 'MODULATION',
    'CUTOFF AMT': 'MODULATION',
    'PULSE WIDTH AMT': 'MODULATION',

    // The two the modulation block and the glide block hand to the same enclosure.
    'MOD': 'LEFT-HAND CONTROLLER',
    'GLIDE': 'LEFT-HAND CONTROLLER',

    'LFO RATE': 'UTILITIES',
  }

  /** Every authored parameter of every recipe, once per distinct name. */
  const byName = new Map<string, Set<string>>()
  for (const recipe of device.recipes) {
    for (const param of recipe.params) {
      const module = (param as { module?: string }).module ?? '(none)'
      const found = byName.get(param.name)
      if (found === undefined) byName.set(param.name, new Set([module]))
      else found.add(module)
    }
  }

  /** Every `group` the panel draws, with its label and its rectangle. */
  const groups = MATRIARCH_PANEL.features.flatMap((f) =>
    f.kind === 'group' ? [{ label: f.label, x: f.x, y: f.y, w: f.w, h: f.h }] : [],
  )
  const knobAt = (label: string) => {
    const f = MATRIARCH_PANEL.features.find((x) => x.kind === 'knob' && x.label === label)
    if (f === undefined || f.kind !== 'knob') throw new Error(`no knob ${label}`)
    return { cx: f.x + f.d / 2, cy: f.y + f.d / 2 }
  }
  const inside = (
    box: { x: number; y: number; w: number; h: number },
    p: { cx: number; cy: number },
  ) => p.cx >= box.x && p.cx <= box.x + box.w && p.cy >= box.y && p.cy <= box.y + box.h

  it('boxes every parameter of every recipe, with nothing left over on either side', () => {
    // Whole-device rather than spot-checked: a block helper added later with no stamp around it
    // is exactly the miss this catches, and it would otherwise surface as one loose run in one
    // guide nobody happens to render.
    const unmapped = [...byName.keys()].filter((name) => SECTIONS[name] === undefined)
    expect(unmapped).toEqual([])
    expect(byName.size).toBe(Object.keys(SECTIONS).length)
  })

  it('leaves no parameter unmoduled at all, which is unusual and deliberate', () => {
    // Every other device authoring `module` has at least one control off the panel — the Muse's
    // menu settings, the Subsequent 37's and the minilogue xd's SWING. Every control this box
    // states is printed inside an enclosure, so there is no honest loose run to render.
    const loose = [...byName].filter(([, mods]) => mods.has('(none)')).map(([name]) => name)
    expect(loose).toEqual([])
  })

  it('gives every name one module and only one', () => {
    for (const [name, mods] of byName) expect([...mods], name).toEqual([SECTIONS[name]])
  })

  it('draws every module it names, and names eleven of the twelve boxes drawn', () => {
    const modules = new Set(Object.values(SECTIONS))
    expect(modules.size).toBe(11)
    const labels = groups.flatMap((g) => (g.label === undefined ? [] : [g.label]))
    for (const module of modules) expect(labels, module).toContain(module)
    // Twelve boxes, two of which share the `UTILITIES` label — so eleven distinct labels drawn,
    // and every one of them is a module except the empty half of that pair.
    expect(groups).toHaveLength(12)
    expect(new Set(labels).size).toBe(11)
  })

  // -------------------------------------------------------------------------
  // The bare `MOD` trap
  // -------------------------------------------------------------------------

  it('puts the bare MOD wheel in LEFT-HAND CONTROLLER and never in MODULATION', () => {
    // `mod()` emits seven controls and six of them are in the modulation enclosure. Stamping the
    // whole block would put a wheel you reach with your left hand inside a box of knobs you reach
    // with your right, and the rendered guide would look perfectly reasonable while saying it.
    expect([...(byName.get('MOD') ?? [])]).toEqual(['LEFT-HAND CONTROLLER'])
    const inModulation = [...byName]
      .filter(([, mods]) => mods.has('MODULATION'))
      .map(([name]) => name)
      .sort()
    expect(inModulation).toEqual([
      'CUTOFF AMT',
      'MODULATION RATE',
      'MODULATION WAVEFORM',
      'PITCH AMT',
      'PITCH MOD ASSIGN',
      'PULSE WIDTH AMT',
    ])
    expect(inModulation).not.toContain('MOD')
  })

  it('reads the MOD wheel off the drawing, not off the helper it is emitted by', () => {
    // The geometric half of the same claim, so a later edit cannot quietly move it back: the MOD
    // fader is inside the LEFT-HAND CONTROLLER rectangle and nowhere near the MODULATION one.
    const fader = MATRIARCH_PANEL.features.find((f) => f.kind === 'grid' && f.label === 'MOD')
    if (fader === undefined || fader.kind !== 'grid') throw new Error('no MOD fader')
    const centre = { cx: fader.x + fader.w / 2, cy: fader.y + fader.h / 2 }
    const lhc = groups.find((g) => g.label === 'LEFT-HAND CONTROLLER')
    const modulation = groups.find((g) => g.label === 'MODULATION')
    if (lhc === undefined || modulation === undefined) throw new Error('missing box')
    expect(inside(lhc, centre)).toBe(true)
    expect(inside(modulation, centre)).toBe(false)
    // GLIDE is in the same enclosure, which is what lets the two share one run.
    expect(inside(lhc, knobAt('GLIDE'))).toBe(true)
  })

  // -------------------------------------------------------------------------
  // The duplicate UTILITIES silkscreen
  // -------------------------------------------------------------------------

  it('finds two boxes silkscreened UTILITIES, so the label cannot say which', () => {
    const utilities = groups.filter((g) => g.label === 'UTILITIES')
    expect(utilities).toHaveLength(2)
    // Left-hand box first, right-hand second — asserted so the coordinates below cannot drift.
    expect(utilities.map((g) => Math.round(g.x))).toEqual([163, 507])
  })

  it('places LFO RATE in the right-hand UTILITIES by coordinate, the only thing that can', () => {
    const [left, right] = groups.filter((g) => g.label === 'UTILITIES')
    if (left === undefined || right === undefined) throw new Error('missing UTILITIES box')
    const lfoRate = knobAt('LFO RATE')
    expect(inside(right, lfoRate)).toBe(true)
    expect(inside(left, lfoRate)).toBe(false)
    expect([...(byName.get('LFO RATE') ?? [])]).toEqual(['UTILITIES'])
  })

  it('leaves the left-hand UTILITIES empty, because no recipe states a control in it', () => {
    // Four mults and the two attenuators. The mults are passive and the attenuator knobs only
    // matter to a cable, so nothing there is a setting — the box renders no parameters, exactly
    // as the minilogue xd's EDIT / SEQUENCER does (#426). A labelled box with nothing in it is
    // an honest outcome; giving it a member it does not have would not be.
    const [left] = groups.filter((g) => g.label === 'UTILITIES')
    if (left === undefined) throw new Error('missing UTILITIES box')
    const knobsInLeft = MATRIARCH_PANEL.features.flatMap((f) =>
      f.kind === 'knob' && f.label !== undefined && inside(left, { cx: f.x + f.d / 2, cy: f.y + f.d / 2 })
        ? [f.label]
        : [],
    )
    expect(knobsInLeft).toEqual(['ATTENUATOR 1', 'ATTENUATOR 2'])
    for (const knob of knobsInLeft) expect(byName.has(knob), knob).toBe(false)
    // And exactly one authored parameter carries the shared label, so the ambiguity a reader
    // meets is one box to find rather than two boxes with settings in both.
    const carrying = [...byName].filter(([, mods]) => mods.has('UTILITIES')).map(([n]) => n)
    expect(carrying).toEqual(['LFO RATE'])
  })

  // -------------------------------------------------------------------------
  // Names and labels
  // -------------------------------------------------------------------------

  it('keeps every parameter name exactly as it was authored', () => {
    // `name` is #107's hoist key, `sameRenderedParam`'s comparison and the string every test
    // above names, so nothing keyed on one moves.
    expect([...byName.keys()].sort()).toEqual([...Object.keys(SECTIONS)].sort())
  })

  it('trims no label, because no name in this file carries a ` · ` prefix', () => {
    const label = (name: string, module: string) =>
      paramLabel({
        name,
        value: 1,
        provenance: { state: 'authored', cite: { kind: 'manual', source: 'x' } },
        module,
      })
    for (const [name, module] of Object.entries(SECTIONS)) {
      expect(label(name, module), name).toBe(name)
    }
    // In particular the two pairs a trim would have collided: the mixer's `OSCILLATOR 1` keeps
    // its whole name inside MIXER, and `FILTER ATTACK` keeps its inside ENVELOPE GENERATORS.
    expect(label('OSCILLATOR 1', 'MIXER')).toBe('OSCILLATOR 1')
    expect(label('FILTER ATTACK', 'ENVELOPE GENERATORS')).toBe('FILTER ATTACK')
  })
})

/**
 * §8/#385. **The boxes a reader actually gets**, which is a claim about authored *order* and not
 * only about the stamps.
 *
 * `groupedParams` cuts on adjacent runs, so an enclosure interrupted and resumed comes out as two
 * boxes carrying one label — and on this device the near miss is real: `mod()` ends in
 * `LEFT-HAND CONTROLLER` and `glide()` is the same enclosure, so anything emitted between them
 * would split it. Every recipe emits them adjacent, and this is what holds that.
 */
describe('a real Matriarch guide renders one box per enclosure (#385)', () => {
  const result = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-matriarch'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

  it('resolves a part on it at all, so the assertions below are not vacuous', () => {
    expect(result.assignments.length).toBeGreaterThan(0)
    expect(result.assignments.every((a) => a.deviceId === 'moog-matriarch')).toBe(true)
  })

  it('renders every part as boxes only, with no loose run anywhere', () => {
    for (const assignment of result.assignments) {
      const groups = groupedParams(assignment.params)
      expect(groups.length, assignment.role).toBeGreaterThan(0)
      expect(groups.every((g) => g.module !== undefined), assignment.role).toBe(true)
    }
  })

  it('never draws one enclosure as two boxes', () => {
    for (const assignment of result.assignments) {
      const boxed = groupedParams(assignment.params).map((g) => g.module)
      expect(new Set(boxed).size, assignment.role).toBe(boxed.length)
    }
  })

  it('opens on PARAPHONY and closes on LEFT-HAND CONTROLLER, in the setup order authored', () => {
    for (const assignment of result.assignments) {
      const boxes = groupedParams(assignment.params).map((g) => g.module)
      expect(boxes[0], assignment.role).toBe('PARAPHONY')
      expect(boxes[boxes.length - 1], assignment.role).toBe('LEFT-HAND CONTROLLER')
      // The spine every recipe shares, whatever optional blocks sit around it.
      for (const module of ['OSCILLATORS', 'MIXER', 'FILTERS', 'ENVELOPE GENERATORS', 'OUTPUT']) {
        expect(boxes, `${assignment.role}/${module}`).toContain(module)
      }
      expect(boxes.indexOf('OSCILLATORS')).toBeLessThan(boxes.indexOf('MIXER'))
      expect(boxes.indexOf('MIXER')).toBeLessThan(boxes.indexOf('FILTERS'))
      expect(boxes.indexOf('FILTERS')).toBeLessThan(boxes.indexOf('ENVELOPE GENERATORS'))
      expect(boxes.indexOf('ENVELOPE GENERATORS')).toBeLessThan(boxes.indexOf('OUTPUT'))
    }
  })

  it('keeps the reading order: concatenating the runs is the parameter list', () => {
    for (const assignment of result.assignments) {
      const groups = groupedParams(assignment.params)
      expect(groups.flatMap((g) => [...g.params]), assignment.role).toEqual([...assignment.params])
    }
  })

  it('draws the boxes in the guide, one lamp each', () => {
    const md = renderGuide(result)
    for (const module of [
      'PARAPHONY',
      'OSCILLATORS',
      'MIXER',
      'FILTERS',
      'ENVELOPE GENERATORS',
      'OUTPUT',
      'LEFT-HAND CONTROLLER',
    ]) {
      expect(md, module).toContain(`- **● ${module}**`)
    }
  })
})


// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * pp.26 and 29, rendered and read. SUSTAIN: *"keeping the Amplitude and/or Filter at a steady level
 * for as long as a key is held"*; VCA MODE `AMP ENV`: *"the output level of both VCA 1 and VCA 2
 * will be controlled by the Amplifier Envelope Generator"*; `DRONE`: *"Matriarch will continue to
 * drone at this level, whether a key is held or not"*. Four hold under `AMP ENV` on the slider — the
 * acid at 10, low and not silent — and the texture holds under `DRONE`, naming only the switch;
 * nothing patches into either VCA CV IN.
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

  it('holds on the sub, the acid and both pads, amplitude envelope on the VCAs with its sustain up', () => {
    const ids = ['mat-sub-dark', 'mat-acid-bright', 'mat-pad-soft', 'mat-pad-dark']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['AMPLITUDE SUSTAIN', 'VCA MODE'] },
        evidence: { kind: 'manual', source: 'Moog Matriarch Manual (012023), pp.26, 29' },
      })
      for (const name of ['AMPLITUDE SUSTAIN', 'VCA MODE']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('holds on the texture with the VCAs in DRONE, and names only the switch', () => {
    const ids = ['mat-texture-soft']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['VCA MODE'] },
        evidence: { kind: 'manual', source: 'Moog Matriarch Manual (012023), p.29' },
      })
      for (const name of ['VCA MODE']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['mat-sub-dark', 'mat-acid-bright', 'mat-pad-soft', 'mat-pad-dark', 'mat-texture-soft'].sort())
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
    for (const id of ['mat-sub-dark', 'mat-acid-bright', 'mat-pad-soft', 'mat-pad-dark']) {
      expect(param(id, 'VCA MODE'), id).toMatchObject({ value: 'AMP ENV' })
      const s = param(id, 'AMPLITUDE SUSTAIN')
      expect(s?.kind, id).toBe('numeric')
      if (s?.kind === 'numeric') expect(s.value, id).toBeGreaterThan(0)
    }
    expect(param('mat-texture-soft', 'VCA MODE')).toMatchObject({ value: 'DRONE' })
    for (const entry of device.recipes.find((r) => r.id === 'mat-texture-soft')?.patch ?? []) {
      expect(entry.to).not.toMatch(/VCA \d CV IN/)
    }
  })
})
