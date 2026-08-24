import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  expand,
  renderGuide,
  resolve,
  selectClockSource,
} from '../lib/core/index'
import { device } from '../lib/devices/zoom-livetrak-l-8/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The LiveTrak L-8 is the first device in this library that is **not an instrument**, so this
 * file is not "does the sixth manifest parse". §2.4 has said since the first draft that *"a
 * device with no voices simply contributes no assignables and still appears in rig integration"*,
 * and until now nothing but a synthetic fixture had ever tested it.
 *
 * Every assertion below is about something a real zero-assignable manifest is the first to reach.
 */

const MANUAL = 'Zoom LiveTrak L-8 Operation Manual E_02, p.'

const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

const withL8 = resolve({ devices: [tr1000, device], template, mood: NEUTRAL_MOOD, seed: 1 })
const without = resolve({ devices: [tr1000], template, mood: NEUTRAL_MOOD, seed: 1 })

/** Where each request landed, as `deviceId/voiceId`, so two rigs can be compared directly. */
function placements(result: typeof withL8): string[] {
  return result.assignments.map(
    (a) => `${a.requestId}=${a.assignable.deviceId}/${a.assignable.voiceId}`,
  )
}

describe('the manifest', () => {
  it('parses, and declares itself a mixer-recorder', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(device.kind).toBe('mixer-recorder')
    expect(device.id).toBe('zoom-livetrak-l-8')
  })

  it('carries no voices, no recipes and no crowding number', () => {
    expect(device.voices).toHaveLength(0)
    expect(device.recipes).toHaveLength(0)
    // §12.4. `comfortableVoices` defaults to the assignable count, which is zero. Authoring a
    // literal 0 is not the same thing and is not even legal — the schema floors it at 1.
    expect(device.comfortableVoices).toBeUndefined()
  })

  it('cites every claim it makes to the L-8 manual', () => {
    for (const verified of [device.physical.verified, device.panel?.verified]) {
      expect(verified).toBeDefined()
      expect(verified).not.toBe(false)
      if (verified === undefined || verified === false) continue
      expect(verified.kind).toBe('manual')
      expect(verified.source.startsWith(MANUAL)).toBe(true)
    }
    // A device with no recipes has no parameter provenance to audit, and that is a finding of
    // zero rather than an unrun audit: the auditor still walks it and still comes back clean.
    const audit = auditDevice(device)
    expect(audit.findings).toHaveLength(0)
    expect(audit.counts.params).toBe(0)
  })
})

describe('zero assignables (§2.4)', () => {
  it('expands to nothing, which is not an error', () => {
    expect(expand(device)).toHaveLength(0)
  })

  it('leaves every assignment in a real rig exactly where it was', () => {
    // The point of the §7.1 idle-device constant, on real data: this box is always idle, so it
    // shifts the last key of the `Score` vector by a fixed amount on *every* candidate and can
    // therefore never change which assignment wins.
    expect(placements(withL8)).toEqual(placements(without))
    expect(withL8.gaps.map((g) => `${g.role}/${g.character}`)).toEqual(
      without.gaps.map((g) => `${g.role}/${g.character}`),
    )
  })

  it('is never named as a gap, because it is in no request’s reachable set', () => {
    for (const gap of withL8.gaps) expect(JSON.stringify(gap)).not.toContain(device.id)
  })

  it('draws no voice field, so the rack has no empty region to fill', () => {
    const fields = device.panel?.features.filter((f) => f.kind === 'voices') ?? []
    expect(fields).toHaveLength(0)
  })
})

describe('the guide still names it (§2.4, §8)', () => {
  const guide = renderGuide(withL8)

  it('gives it a rig-integration block with an honest channel plan', () => {
    expect(guide).toContain('**Zoom LiveTrak L-8** — mixer-recorder')
    expect(guide).toContain('no parts assigned; nothing to patch')
    // `individualOuts: 0` — MONITOR OUT A-C are cue buses, not per-part direct outs (p.11).
    expect(guide).toContain('stereo main out · USB audio · audio in')
  })

  it('lists it as something that processes audio', () => {
    expect(guide).toContain('Zoom LiveTrak L-8 — is a mixer and recorder')
  })
})

describe('no clock, anywhere on the box', () => {
  it('declares neither direction', () => {
    // The string "MIDI" does not occur once in the Operation Manual: no DIN in the connector
    // band (pp.5-7, p.10), a POWER switch and an SD slot on the back (p.19), a Micro USB port on
    // the bottom (p.20). The internal tempo (40.0-250.0 bpm, p.17) goes nowhere.
    expect(device.clock.canSendClock).toBe(false)
    expect(device.clock.canReceiveClock).toBe(false)
    // Not an empty list, because `ClockSpec` will not take one — see the manifest's note. The
    // booleans above are what every consumer that decides behaviour actually reads.
    expect(device.clock.transport).toEqual(['usb'])
  })

  it('is never chosen as the clock source, and does not stand in for one', () => {
    expect(selectClockSource([device], new Map())?.deviceId).toBeUndefined()
    expect(selectClockSource([tr1000, device], new Map())?.deviceId).toBe(tr1000.id)
    // A rig of nothing but this box has no clock at all, which §7.4 states rather than papers
    // over. The renderer's rig phase has no third branch for a box that receives none either —
    // it reads `sends clock` / `receives clock only` — so this box currently renders as
    // "receives clock only", which is wrong. Recorded, not reached for: the fix is in
    // `lib/core/render.ts` and `components/guide/phase-rig.tsx`, not in a device folder.
    const alone = resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(alone.clockSource).toBeUndefined()
    expect(renderGuide(alone)).toContain('nothing in this rig can send clock')
  })
})

describe('the panel (§10)', () => {
  it('is 268 mm across and 282 mm down, and the two are not interchangeable', () => {
    expect(device.physical.panelSpanMm).toBe(268)
    expect(device.panel?.panelRiseMm).toBe(282)
    // The trap, in the direction it springs for a flat desktop box: 282 is the figure the
    // specifications call *depth*, and a rack that took it for the width would draw this box
    // wider than it is and shorter than it is. It reads slightly taller than wide, because it is.
    expect(device.physical.panelSpanMm).toBeLessThan(device.panel?.panelRiseMm ?? 0)
  })

  it('matches the aspect of the drawing it was measured on', () => {
    // §2.3's check. The cover figure's ink measures 1390 x 1461 px at 300 dpi.
    const drawn = 1390 / 1461
    const authored = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
    expect(Math.abs(authored - drawn)).toBeLessThan(0.005)
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

  it('draws the ten faders the box has, and no jacks of its own', () => {
    const faders = (device.panel?.features ?? []).filter(
      (f) => f.kind === 'grid' && f.shape === 'fader',
    )
    const lanes = faders.reduce((sum, f) => sum + (f.kind === 'grid' ? f.cols * f.rows : 0), 0)
    // Eight channels, EFX RTN and MASTER (p.7, p.9, p.11).
    expect(lanes).toBe(10)
    // §2.3 reserves the jacks for the renderer, which draws the ones `clock` and `io` declare.
    // Authoring them here as well would be a second, competing claim about the same sockets.
    expect(device.jacks).toBeUndefined()
  })
})
