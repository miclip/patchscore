import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  receiveTransports,
  resolve,
  sendTransports,
  type JackSpec,
} from '../lib/core/index'
import { reachableSlots } from '../lib/core/reachability'
import { device } from '../lib/devices/moog-subharmonicon/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * The Subharmonicon (#135), and the four things about it that are worth pinning.
 *
 * It is the last of the five Moog semi-modulars and the one the backlog held longest, on the
 * expectation that six oscillators would push the search past its cap. They do not. What the
 * authoring found instead is a box whose manual prints more ranges than any other in the library
 * and whose factory patch sheets are drawn well enough to cite — and a per-step vocabulary with
 * exactly one lane in it.
 */
describe('Subharmonicon manifest (#135)', () => {
  it('is one voice at six notes, not a pool of six', () => {
    expect(device.voices).toHaveLength(1)
    const [voice] = device.voices
    expect(voice?.kind).toBe('fixed')
    expect(voice?.polyphony).toBe(6)
    // §2.2's rule, and the reason a pool would be wrong: six pool members are six independently
    // assignable parts, and these six share one mixer, one filter, one amplifier and one pair of
    // envelopes (p.21, p.23). One assignable is therefore all that can ever be occupied.
    expect(device.comfortableVoices).toBe(1)
  })

  it('offers no role it has no source for', () => {
    const [voice] = device.voices
    // p.58's SOURCES row is a complete enumeration — "VCO 1, SUB 1, SUB 2 / VCO 2, SUB 1, SUB 2"
    // — and there is no noise generator anywhere on the instrument. The DFAM's snares come out
    // of its white noise through a high-pass filter, and this box has neither.
    expect(voice?.roles).not.toContain('snare')
    expect(voice?.roles).not.toContain('noise')
    // `kick` and `tom` are offered on the strength of the BATERIA patch sheet (p.47), whose own
    // NOTES read "Kick drum tuning is controlled via filter CUTOFF".
    expect(voice?.roles).toContain('kick')
    expect(voice?.roles).toContain('tom')
    // And the chord roles, which are what `polyphony: 6` is for.
    expect(voice?.roles).toContain('pad')
    expect(voice?.roles).toContain('stab')
  })

  it('sends on one wire and receives on two, like its sibling and for the opposite reason', () => {
    expect(sendTransports(device)).toEqual(['analog-clock'])
    expect(receiveTransports(device)).toEqual(['midi-din', 'analog-clock'])
    expect(device.clock.transport).toEqual(['midi-din', 'analog-clock'])
    // There is no MIDI output anywhere on the instrument (p.31's output column, p.8's rear
    // panel), so a rig clocked over MIDI DIN can drive this box and can never be driven by it.
    const midiOut = (device.jacks ?? []).filter(
      (j: JackSpec) => j.direction === 'out' && j.signal.includes('midi'),
    )
    expect(midiOut).toEqual([])
  })

  it('declares all thirty-two patch points, cited one apiece', () => {
    const jacks = device.jacks ?? []
    // p.31: "Subharmonicon contains a total of 32 patch points. Of these, 17 are inputs…
    // The remaining 15 are outputs". p.58's PATCHBAY row says the same in three lines, and the
    // panel drawing on p.50 draws fifteen reversed-lettering labels in the same places.
    expect(jacks).toHaveLength(32)
    expect(jacks.filter((j: JackSpec) => j.direction === 'in')).toHaveLength(17)
    expect(jacks.filter((j: JackSpec) => j.direction === 'out')).toHaveLength(15)
    for (const jack of jacks) {
      expect(device.capabilityEvidence?.[`jacks[${jack.id}]`], jack.id).toBeDefined()
    }
    // Five labels appear twice on this panel and are told apart only by reversed lettering, so
    // the `IN ·` / `OUT ·` qualifier is load-bearing rather than decorative.
    const bare = jacks.map((j: JackSpec) => j.id.replace(/^(IN|OUT) · /, ''))
    expect(new Set(bare).size).toBe(27)
  })

  it('is never a voice-control source, and is a target on the transport gate', () => {
    const jacks = device.jacks ?? []
    const sole = (dir: JackSpec['direction'], kind: string) =>
      jacks
        .filter((j: JackSpec) => j.direction === dir && j.signal.length === 1 && j.signal[0] === kind)
        .map((j: JackSpec) => j.id)
    // No sole gate output anywhere, so §3.3's pass can never make this box a source. That is the
    // box: `OUT · TRIGGER` is a trigger (p.37) and the three clock outputs are clocks.
    expect(sole('out', 'gate')).toEqual([])
    expect(sole('out', 'pitch-cv')).toEqual(['OUT · SEQ 1', 'OUT · SEQ 2'])
    // A target bundle *does* form, and this is the DFAM's finding a second time: the section's
    // only sole gate input is the transport one, because `IN · TRIGGER` is a trigger (p.35) and
    // `IN · RESET` carries two kinds. Pinned so it stays a recorded finding rather than a
    // surprise, and so a repair to `bundles()` shows up here as a change rather than silently.
    expect(sole('in', 'pitch-cv')).toEqual(['IN · VCO 1', 'IN · VCO 2'])
    expect(sole('in', 'gate')).toEqual(['IN · PLAY'])

    const withSequencer = DEVICES.filter((d) =>
      [device.id, 'intellijel-metropolix'].includes(d.id),
    )
    const result = resolve({
      devices: withSequencer,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const target = result.interDevicePatch.targets.find((t) => t.deviceId === device.id)
    expect(target?.pitchJack).toBe('IN · VCO 1')
    expect(target?.gateJack).toBe('IN · PLAY')
  })

  it('puts the clock transport on one socket per direction, and leaves the others as signal', () => {
    const jacks = device.jacks ?? []
    const carrying = (dir: JackSpec['direction']) =>
      jacks.filter((j: JackSpec) => j.direction === dir && j.clock?.includes('analog-clock'))
    // Three outputs carry a clock *signal* — `OUT · CLOCK` and the two `SEQ n CLK` — and only
    // the first carries the transport, because §3.3 refuses two jacks claiming one transport in
    // one direction and the rack would otherwise have to choose which hole to draw. p.38 patches
    // exactly this one to clock a DFAM; the other two are a TIP on the same page.
    expect(carrying('out').map((j: JackSpec) => j.id)).toEqual(['OUT · CLOCK'])
    expect(carrying('in').map((j: JackSpec) => j.id)).toEqual(['IN · CLOCK'])
    const clockSignal = jacks.filter(
      (j: JackSpec) => j.direction === 'out' && j.signal.includes('clock'),
    )
    expect(clockSignal.map((j: JackSpec) => j.id)).toEqual([
      'OUT · SEQ 1 CLK',
      'OUT · SEQ 2 CLK',
      'OUT · CLOCK',
    ])
  })

  it('has one per-step lane and reaches it, because an accent here is a pitch', () => {
    // p.26 enumerates a step as "a variable tuning knob and an LED", so there is no velocity
    // lane, no accent button and no ghost lane on this instrument. An accent is the step taken
    // up an octave, which is the range SEQ OCT at ±1 gives it (p.28).
    expect(device.features?.perStep).toEqual(['pitch'])
    const used = device.recipes.flatMap((r) =>
      (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
    )
    expect(new Set(used)).toEqual(new Set(['pitch']))
    // And every one of them is on a slot some direction actually emits (#108).
    for (const recipe of device.recipes) {
      const authored = (recipe.articulation ?? []).map((a) => a.slot)
      if (authored.length === 0) continue
      const { slots } = reachableSlots(recipe, TEMPLATES)
      for (const slot of authored) expect(slots, recipe.id).toContain(slot)
    }
  })

  it('cites the knobs a patch sheet draws, and only the ones with a linear scale', () => {
    // Printed pp.45-49 draw every pointer, so a position on a *travel* control is documented.
    // A position on a tapered one is not: `CUTOFF` at a fifth of its sweep is not 4 kHz, and
    // converting it would be a figure nobody printed.
    const sheeted = device.recipes.filter((r) =>
      r.params.some((p) => p.verified !== false && p.verified !== undefined),
    )
    expect(sheeted.map((r) => r.id)).toEqual(['subh-kick-hard', 'subh-pad-soft'])
    for (const recipe of sheeted) {
      for (const param of recipe.params) {
        if (param.verified === false || param.verified === undefined) continue
        expect(param.kind, `${recipe.id} ${param.name}`).toBe('numeric')
        if (param.kind !== 'numeric') continue
        expect(param.unit, `${recipe.id} ${param.name}`).toBe('% travel')
        // The point is cited and the range still is not: nobody has stated that this knob's
        // travel is what it looks like, so mood stays out of it (§3.2).
        expect(param.range.verified, `${recipe.id} ${param.name}`).toBe(false)
      }
    }
  })

  it('carries the whole panel on every recipe, because nothing here recalls a setting', () => {
    // p.45: "Your Subharmonicon has a 100% analog signal path". There is no memory, so a
    // parameter list that silently means "leave that one alone" produces a different sound for
    // every reader (§8). Forty-two controls, the same forty-two on all nineteen recipes — the
    // eight STEP knobs, TEMPO and the five transport buttons are the fourteen left out, each
    // because it belongs to a direction, to the song, or to the performance.
    const shapes = new Set(device.recipes.map((r) => r.params.map((p) => p.name).join('|')))
    expect(shapes.size).toBe(1)
    expect(device.recipes[0]?.params).toHaveLength(42)
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
  })

  it('leaves the search uncapped on the direction that decides the worst case', () => {
    const result = resolve({
      devices: DEVICES,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 21,
    })
    expect(result.search.capped).toBe(false)
    expect(result.search.method).toBe('exhaustive')
  })
})
