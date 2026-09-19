import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  expand,
  renderGuide,
  resolve,
  selectClockSource,
} from '../lib/core/index'
import { device } from '../lib/devices/empress-zoia-euroburo/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The ZOIA Euroburo is the library's first `fx-processor`, its first **Eurorack module**, and its
 * second zero-assignable device. The L-8 proved §2.4's path; what this file pins is the part
 * that is new — a panel whose horizontal span is an HP count rather than a millimetre figure,
 * and a manifest whose empty fields are empty on purpose.
 */

const MANUAL = 'ZOIA Euroburo User Manual Rrev2 (firmware 2.30)'

const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

const withZoia = resolve({ devices: [tr1000, device], template, mood: NEUTRAL_MOOD, seed: 1 })
const without = resolve({ devices: [tr1000], template, mood: NEUTRAL_MOOD, seed: 1 })

function placements(result: typeof withZoia): string[] {
  return result.assignments.map(
    // #40: every voice, joined — a part spread across a pool must not read as one voice.
    (a) => `${a.requestId}=${a.assignables.map((v) => `${v.deviceId}/${v.voiceId}`).join('+')}`,
  )
}

describe('the manifest', () => {
  it('parses, and declares itself an fx-processor', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(device.kind).toBe('fx-processor')
    expect(device.id).toBe('empress-zoia-euroburo')
    expect(device.maker).toBe('Empress Effects')
  })

  it('carries no voices, no recipes and no crowding number', () => {
    expect(device.voices).toHaveLength(0)
    expect(device.recipes).toHaveLength(0)
    expect(device.comfortableVoices).toBeUndefined()
  })

  it('declares the sidechain the module index documents, and no LFO, and no hints or jacks', () => {
    // #664. The hardware manual never enumerates the module library, so for a year an LFO or a
    // sidechain here would have been authored from memory. The module index the Euroburo manual
    // names on pp.2, 20 and 43 documents both, and the sidechain fits `SidechainSpec` exactly:
    // two booleans, two modules carrying them. `lfo` does not fit, because `LfoSpec` wants a
    // count and a patchable box has none — that half is `partly` in the evidence rather than a
    // number invented here. `hints` and `jacks` exist to be referenced by recipes, and there
    // are none.
    expect(device.features).toEqual({ sidechain: { internal: true, fromExternalAudio: true } })
    expect(device.features?.lfo).toBeUndefined()
    expect(device.hints).toBeUndefined()
    expect(device.jacks).toBeUndefined()
  })

  it('cites every claim it makes to the Euroburo manual', () => {
    for (const verified of [device.physical.verified, device.panel?.verified]) {
      expect(verified).toBeDefined()
      expect(verified).not.toBe(false)
      if (verified === undefined || verified === false) continue
      expect(verified.kind).toBe('manual')
      expect(verified.source.startsWith(MANUAL)).toBe(true)
    }
    const audit = auditDevice(device)
    expect(audit.counts.params).toBe(0)
    // One finding left, and #664 closed the other three by finding the document.
    //
    // What remains is #80's recorded non-claim: this manual documents no clock transmission at
    // all, so it says nothing about leading a rig either \u2014 and `canSendClock: false` makes
    // `preferredSource` unclaimable regardless (\u00a77.4).
    //
    // The three that went were #120's `unread`, and this box is why that state exists: the
    // module index was out of reach rather than silent. It is in `manuals/` now, as a CSV export
    // of the live sheet the Euroburo manual names on pp.2, 20 and 43, and the findings moved
    // with it. The `partly` on `features.lfo` is not a debt either: the index gives the topology
    // and the box has no fixed count to give.
    expect(audit.findings.map((f) => ('fact' in f ? `${f.kind} ${f.fact}` : f.kind))).toEqual([
      'undocumented-capability clock.preferredSource',
      'partly-capability features.lfo',
    ])
    expect(audit.counts.unreadCapabilities).toBe(0)
    expect(audit.counts.uncheckedCapabilities).toBe(0)
  })
})

describe('zero assignables (§2.4)', () => {
  it('expands to nothing, which is not an error', () => {
    expect(expand(device)).toHaveLength(0)
  })

  it('leaves every assignment in a real rig exactly where it was', () => {
    expect(placements(withZoia)).toEqual(placements(without))
    expect(withZoia.shortfalls.map((g) => `${g.role}/${g.character}`)).toEqual(
      without.shortfalls.map((g) => `${g.role}/${g.character}`),
    )
  })

  it('draws no voice field, so the rack has no empty region to fill', () => {
    expect(device.panel?.features.filter((f) => f.kind === 'voices')).toHaveLength(0)
  })
})

describe('the guide still names it (§2.4, §8)', () => {
  const guide = renderGuide(withZoia)

  it('gives it a rig-integration block with an honest channel plan', () => {
    expect(guide).toContain('**ZOIA Euroburo** — fx-processor')
    expect(guide).toContain('no parts assigned; nothing to patch')
    // No USB anywhere on this box — the word does not occur in the manual, and patches move on
    // a microSD card. So the audio line names two things, not three.
    expect(guide).toContain('stereo main out · audio in')
    expect(device.io.usbAudio).toBe(false)
    expect(device.io.individualOuts).toBe(0)
  })

  it('lists it as something that processes audio', () => {
    expect(guide).toContain('ZOIA Euroburo — is an effects unit')
  })

  it('is listed as a ducker now that the module index documents the sidechain (#664)', () => {
    // It was absent from this block for as long as the sidechain was `unread`, which is the
    // whole point of that state: the box could always do it and no document in `manuals/` said
    // so. The index says so, so the guide says so.
    expect(guide).toContain('**Sidechain**')
    const block = guide.slice(guide.indexOf('**Sidechain**'), guide.indexOf('**Master FX**'))
    expect(block).toContain('ZOIA Euroburo')
  })
})

describe('clock', () => {
  it('receives but does not send, and the send half records the document', () => {
    // The manual documents three MIDI behaviours — program change, CC #60 bypass, CC on starred
    // parameters (p.26) — and no clock transmission. Whether a patch can emit one is a question
    // about the module library, which this manual never lists.
    expect(device.clock.canSendClock).toBe(false)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['analog-clock', 'midi-din'])
  })

  it('is never chosen as the clock source', () => {
    expect(selectClockSource([device], new Map())).toBeUndefined()
    expect(selectClockSource([tr1000, device], new Map())?.deviceId).toBe(tr1000.id)
  })

  it('renders a rig line that is true of it, unlike a box that receives nothing', () => {
    // Worth pinning here because the L-8 cannot say this: `phaseRig` has no third branch, so a
    // box with both clock booleans false renders as "receives clock only" and is wrong. This
    // device really does receive clock only, so the same sentence is correct.
    expect(renderGuide(withZoia)).toContain('receives clock only · analog-clock/midi-din')
  })
})

describe('the panel — the library’s first Eurorack module (§10)', () => {
  it('spans 34 HP, converted rather than invented', () => {
    // The specifications give "Size: 34hp Eurorack Format Module" (p.29) and no millimetre
    // figure at all. One HP is 1/5 inch.
    expect(device.physical.panelSpanMm).toBeCloseTo(34 * 5.08, 1)
    expect(device.physical.panelSpanMm).toBe(172.7)
  })

  it('takes its rise from the drawing, because the manual never states one', () => {
    const rise = device.panel?.panelRiseMm ?? 0
    expect(rise).toBe(128.7)
    // §2.3's check, twice over. The cover figure's ink measures 1771 x 1320 px at 600 dpi...
    const drawn = 1771 / 1320
    const authored = device.physical.panelSpanMm / rise
    expect(Math.abs(authored - drawn)).toBeLessThan(0.005)
    // ...and the result lands within a quarter-millimetre of the 128.5 mm that Eurorack 3U has
    // been since Doepfer set it — which is the cross-check, not the source.
    expect(Math.abs(rise - 128.5)).toBeLessThan(0.5)
  })

  it('is landscape, unlike the desktop boxes it will sit beside', () => {
    // A module is played bolted upright into a case, so the HP width is the horizontal span and
    // the 28 mm the specifications call *depth* is behind the rails and invisible here.
    expect(device.physical.panelSpanMm).toBeGreaterThan(device.panel?.panelRiseMm ?? 0)
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

  it('draws the 8 x 5 grid that is one page of a patch', () => {
    const grids = (device.panel?.features ?? []).filter((f) => f.kind === 'grid')
    const main = grids.find((f) => f.kind === 'grid' && f.cols === 8 && f.rows === 5)
    expect(main).toBeDefined()
    // Forty buttons: every module and every parameter a patch page holds (p.1, p.19).
    if (main?.kind === 'grid') expect(main.cols * main.rows).toBe(40)
    // Plus the four CV inputs and four CV outputs on one row (p.6).
    expect(grids.some((f) => f.kind === 'grid' && f.cols === 8 && f.rows === 1)).toBe(true)
    // The jacks are the renderer's, so none are authored here.
    expect(device.jacks).toBeUndefined()
  })
})
