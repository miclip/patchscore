import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  expand,
  renderGuide,
  resolve,
  selectClockSource,
} from '../lib/core/index'
import { device } from '../lib/devices/tascam-model-2400/index'
import { device as l8 } from '../lib/devices/zoom-livetrak-l-8/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Model 2400 is the third zero-assignable device, so §2.4's path is well covered by now.
 * What this file pins is what only this box brings: it is the **first device that sends clock
 * and cannot receive it**, which puts §7.4's tie-break somewhere it has never been, and it is
 * the widest panel in the library by 200 mm.
 */

const MANUAL = 'Tascam Model 2400 Owner’s Manual'

const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

const with2400 = resolve({ devices: [tr1000, device], template, mood: NEUTRAL_MOOD, seed: 1 })
const without = resolve({ devices: [tr1000], template, mood: NEUTRAL_MOOD, seed: 1 })

function placements(result: typeof with2400): string[] {
  return result.assignments.map(
    (a) => `${a.requestId}=${a.assignable.deviceId}/${a.assignable.voiceId}`,
  )
}

describe('the manifest', () => {
  it('parses, and declares itself a mixer-recorder', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(device.kind).toBe('mixer-recorder')
    expect(device.id).toBe('tascam-model-2400')
  })

  it('carries no voices, no recipes, and no half-filled feature block', () => {
    expect(device.voices).toHaveLength(0)
    expect(device.recipes).toHaveLength(0)
    expect(device.comfortableVoices).toBeUndefined()
    // The box has an analogue channel compressor, three-band channel EQ, a digital master-bus
    // compressor and sixteen preset effects, all cited-able (pp.72-73) and none of them a
    // `DeviceFeatures` field. `perStep` needs steps, `lfo` needs an LFO, `sidechain` needs a
    // documented ducking source. Omitted rather than approximated.
    expect(device.features).toBeUndefined()
    expect(device.hints).toBeUndefined()
    expect(device.jacks).toBeUndefined()
  })

  it('cites every claim it makes to the Model 2400 manual', () => {
    for (const verified of [device.physical.verified, device.panel?.verified]) {
      expect(verified).toBeDefined()
      expect(verified).not.toBe(false)
      if (verified === undefined || verified === false) continue
      expect(verified.kind).toBe('manual')
      expect(verified.source.startsWith(MANUAL)).toBe(true)
    }
    const audit = auditDevice(device)
    expect(audit.findings).toHaveLength(0)
    expect(audit.counts.params).toBe(0)
  })
})

describe('zero assignables (§2.4)', () => {
  it('expands to nothing and moves no assignment', () => {
    expect(expand(device)).toHaveLength(0)
    expect(placements(with2400)).toEqual(placements(without))
    expect(with2400.gaps.map((g) => `${g.role}/${g.character}`)).toEqual(
      without.gaps.map((g) => `${g.role}/${g.character}`),
    )
  })

  it('draws no voice field', () => {
    expect(device.panel?.features.filter((f) => f.kind === 'voices')).toHaveLength(0)
  })

  it('still gets a rig-integration block and a place in the Master FX list', () => {
    const guide = renderGuide(with2400)
    expect(guide).toContain('**Model 2400** — mixer-recorder')
    expect(guide).toContain('no parts assigned; nothing to patch')
    expect(guide).toContain('Model 2400 — is a mixer and recorder')
  })
})

describe('the first box that sends clock and cannot receive it', () => {
  it('declares exactly that', () => {
    // Sends: "This unit can generate MIDI TIMECODE and MIDI CLOCK... output from the MIDI OUT
    // connector and simultaneously sent to a computer connected by USB" (p.45).
    // Does not receive: the block diagram labels MIDI IN as "USB conversion" against MIDI OUT's
    // "MTC, MIDI CLOCK, MIDI message out" (p.74).
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(false)
    expect(device.clock.transport).toEqual(['midi-din', 'usb'])
    // Nothing else in the library is send-only, which is why this file exists.
    const sendOnly = DEVICES.filter((d) => d.clock.canSendClock && !d.clock.canReceiveClock)
    expect(sendOnly.map((d) => d.id)).toEqual(['tascam-model-2400'])
  })

  it('claims no clock preference, and that is a decision (§7.4)', () => {
    // **This manifest claimed `preferredSource` for two commits and should not have.** The manual
    // proves the desk generates MTC and MIDI clock (p.45) and cannot receive it (p.5, p.74).
    // Both facts are already carried by the two booleans. Neither says this box should lead every
    // rig it is put in, which is what the field means — a person might run a studio to this
    // recorder, or put it behind a sequencer that drives everything. The manual has no opinion.
    expect(device.clock.preferredSource).toBeUndefined()
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(false)
    // Metropolix is the box that does claim it, and the contrast is the point: a sequencer with
    // no voice of its own exists to drive a rig, where a recording desk merely can.
    expect(DEVICES.filter((d) => d.clock.preferredSource === true).map((d) => d.id)).toEqual([
      'intellijel-metropolix',
    ])
  })

  it('loses the clock source to a box that ranks above it, carrying parts or not (§7.4)', () => {
    // Capability confers no rank. Both boxes send clock on midi-din and neither claims a
    // preference, so it falls to id — and `roland-tr-1000` sorts before `tascam-model-2400`.
    // The desk's load is zero and the TR-1000's is five, and neither figure is consulted.
    const source = selectClockSource([tr1000, device], new Map([[tr1000.id, 5]]))
    expect(source?.deviceId).toBe(tr1000.id)
    // Being source-only does not lift it either — that rule existed for one revision and is gone.
    expect(selectClockSource([tr1000, device], new Map())?.deviceId).toBe(tr1000.id)
  })

  it('goes back to being an exempted follower, named in the guide (§7.4)', () => {
    // **The consequence the operator asked be protected.** With something else leading, this box
    // cannot obey "sync everything else to it", so §7.4's exemption clause has to name it — and
    // that coverage must not depend on which box happens to win the ranking. So: assert the
    // winner is some other box first, then assert the clause.
    const rig = resolve({ devices: [tr1000, device], template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(rig.clockSource?.deviceId).not.toBe(device.id)
    const doc = renderGuide(rig)
    expect(doc).toContain('except Model 2400')
    expect(doc).toContain('cannot receive clock')

    // And the clause is absent when nothing in the rig is deaf, or the assertion above would
    // pass on a sentence the renderer prints unconditionally.
    const hearing = resolve({ devices: [tr1000], template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(renderGuide(hearing)).not.toContain('cannot receive clock')
    expect(renderGuide(hearing)).toContain('Sync everything else to it.')
  })

  it('wins it when nothing else can send, and says it is carrying nothing', () => {
    // Uncontested rather than preferred — the L-8 can neither send nor receive — so this stays
    // the case that proves an unopposed source is still named honestly.
    const source = selectClockSource([l8, device], new Map())
    expect(source?.deviceId).toBe(device.id)
    expect(source?.occupiedAssignables).toBe(0)
    const alone = resolve({ devices: [l8, device], template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(renderGuide(alone)).toContain('**Clock source** — Model 2400 over `midi-din`')
  })
})

describe('I/O', () => {
  it('counts the SUB OUTPUT jacks as the separations, and says so in the guide', () => {
    // Eight TRS jacks on four assignable sub buses, each with its own fader (p.13, p.71). AUX
    // 1-5 are sends and the INSERT jacks are break points, so neither is counted.
    expect(device.io.individualOuts).toBe(8)
    expect(device.io.main).toBe('stereo')
    expect(device.io.audioIn).toBe(true)
    expect(device.io.usbAudio).toBe(true)
    expect(renderGuide(with2400)).toContain('8 individual outs')
  })
})

describe('the panel (§10)', () => {
  it('is the widest thing in the rack, and cited to a dimensioned drawing', () => {
    expect(device.physical.panelSpanMm).toBe(680.5)
    const widest = [...DEVICES].sort(
      (a, b) => b.physical.panelSpanMm - a.physical.panelSpanMm,
    )[0]
    expect(widest?.id).toBe('tascam-model-2400')
  })

  it('matches both the specifications and the drawing on aspect', () => {
    const rise = device.panel?.panelRiseMm ?? 0
    expect(rise).toBe(568)
    // The specifications table: "680.5 x 132.5 x 568.0mm (W x H x D)" (p.72).
    expect(device.physical.panelSpanMm / rise).toBeCloseTo(680.5 / 568, 6)
    // §2.3's check against the thing actually measured: the plan view's chassis rectangle is
    // 1071.5 x 895 px at 200 dpi.
    expect(Math.abs(device.physical.panelSpanMm / rise - 1071.5 / 895)).toBeLessThan(0.005)
  })

  it('keeps every feature inside the panel', () => {
    const span = device.physical.panelSpanMm
    const rise = device.panel?.panelRiseMm ?? 0
    for (const f of device.panel?.features ?? []) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.x + w).toBeLessThanOrEqual(span)
      expect(f.y + h).toBeLessThanOrEqual(rise)
    }
  })

  it('lines the channel rows up on one column pitch', () => {
    // The whole point of drawing this panel as grids rather than as two hundred features: every
    // row of per-channel controls must sit on the same columns, or the drawing stops reading as
    // seventeen channel strips. The compressor row is twelve wide because the analogue
    // compressor is on the mono channels only — so it is the one that has to be checked, not
    // assumed.
    const grids = (device.panel?.features ?? []).filter((f) => f.kind === 'grid')
    const wide = grids.filter((f) => f.kind === 'grid' && f.cols === 17)
    expect(wide.length).toBeGreaterThanOrEqual(6)
    for (const f of wide) {
      if (f.kind !== 'grid') continue
      expect(f.x).toBe(33.9)
      expect(f.w).toBe(473.2)
    }
    const comp = grids.find((f) => f.kind === 'grid' && f.cols === 12)
    if (comp?.kind !== 'grid') throw new Error('no compressor row')
    expect(comp.x).toBe(33.9)
    expect(Math.abs(comp.w / comp.cols - 473.2 / 17)).toBeLessThan(0.05)
  })

  it('draws all twenty-two faders', () => {
    const faders = (device.panel?.features ?? []).filter(
      (f) => f.kind === 'grid' && f.shape === 'fader',
    )
    const lanes = faders.reduce((sum, f) => sum + (f.kind === 'grid' ? f.cols * f.rows : 0), 0)
    // Seventeen input channels, four SUB pairs and MAIN.
    expect(lanes).toBe(22)
  })
})
