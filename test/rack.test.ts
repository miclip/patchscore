import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { DeviceSchema, NEUTRAL_MOOD, expand, resolve } from '../lib/core/index'
import type { Device, ResolvedPatchEntry, ResolveResult } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { Rack } from '../components/rack/rack'
import {
  AUDIO_OMISSION,
  PANEL_GAP_MM,
  PANEL_HEIGHT_MM,
  cablePath,
  rackModel,
  sagFor,
} from '../components/rack/model'
import { box, request, withRoles } from './rigs'
import { makeRecipe } from './rigs'

/**
 * #11 / §10. The rack is the visualisation of the resolver's output, so the claims worth
 * testing are claims about the *graph and the geometry*, not about pixels: which boxes the clock
 * reaches, which voices are lit, that widths are proportional, and that nothing is drawn that the
 * data does not support.
 *
 * The model is deliberately React-free for exactly this reason — most of this file never renders
 * anything. The component tests below check the narrow band the model cannot: that the omission
 * is stated, that the full-size layer is absent until asked for, and that the markup is stable.
 */

const template = TEMPLATES[0] as (typeof TEMPLATES)[number]
const real = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })

function markup(result: ResolveResult | undefined): string {
  return renderToStaticMarkup(createElement(Rack, { result }))
}

/** React escapes `'` and `&` on the way out, so an authored citation has to be escaped to match. */
function escaped(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#x27;')
}

/** A tiny rig whose clock topology is decided by the fixture rather than by the real registry. */
function rig(devices: Device[]): ResolveResult {
  return resolve({
    devices,
    template: withRoles([request({ id: 'kick', role: 'kick' })]),
    mood: NEUTRAL_MOOD,
    seed: 1,
  })
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

describe('rack geometry (§10)', () => {
  it('lays panels out in registry order at their cited spans', () => {
    const model = rackModel(real)
    expect(model.panels.map((p) => p.deviceId)).toEqual(DEVICES.map((d) => d.id))
    expect(model.panels.map((p) => p.spanMm)).toEqual(DEVICES.map((d) => d.physical.panelSpanMm))
  })

  it('makes both dimensions proportional for a panel that has been drawn', () => {
    const model = rackModel(real)
    const mini = model.panels.find((p) => p.deviceId === 'polyend-tracker-mini')
    const tr = model.panels.find((p) => p.deviceId === 'roland-tr-1000')
    expect(mini?.spanMm).toBe(130)
    expect(tr?.spanMm).toBe(486)
    // The claim §10 actually makes: the ratio on screen is the ratio in millimetres.
    expect((tr?.spanMm ?? 0) / (mini?.spanMm ?? 1)).toBeCloseTo(486 / 130, 10)
    // And the thing the human asked for in so many words: in a row of landscape boxes the
    // Tracker Mini reads as portrait, because it is.
    expect((mini?.spanMm ?? 0) / (mini?.riseMm ?? 1)).toBeLessThan(1)
    expect((tr?.spanMm ?? 0) / (tr?.riseMm ?? 1)).toBeGreaterThan(1)
    // The figure is taller than the tallest panel: the difference is the rail and the cable room.
    const tallest = Math.max(...model.panels.map((p) => p.riseMm))
    expect(model.heightMm).toBeGreaterThan(tallest)
  })

  it('falls back to a frame-constant panel for a box nobody has drawn', () => {
    const undrawn = box('undrawn', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe('r-kick', 'kick', 'hard', 'bd')],
    })
    const panel = rackModel(rig([undrawn])).panels[0]
    expect(panel?.generated).toBe(true)
    expect(panel?.layout).toBeUndefined()
    expect(panel?.riseMm).toBe(PANEL_HEIGHT_MM)
    // Invariant 2's real test: it still has jacks and a voice readout, with no UI edit.
    expect(panel?.jacks.length).toBeGreaterThan(0)
    expect(panel?.banks.flatMap((b) => b.cells)).toHaveLength(1)
  })

  it('bottom-aligns panels of different heights on one rail', () => {
    const model = rackModel(real)
    const rails = new Set(model.panels.map((p) => p.topMm + p.riseMm))
    expect(rails.size).toBe(1)
    // Not vacuous: these four boxes are genuinely different depths.
    expect(new Set(model.panels.map((p) => p.riseMm)).size).toBe(4)
    for (const panel of model.panels) expect(panel.topMm).toBeGreaterThanOrEqual(0)
  })

  it('accumulates x by span plus one gap, and totals without a trailing gap', () => {
    const model = rackModel(real)
    let expected = 0
    for (const panel of model.panels) {
      expect(panel.xMm).toBe(expected)
      expected += panel.spanMm + PANEL_GAP_MM
    }
    expect(model.totalMm).toBe(expected - PANEL_GAP_MM)
    const spans = model.panels.reduce((sum, p) => sum + p.spanMm, 0)
    expect(model.totalMm).toBe(spans + PANEL_GAP_MM * (model.panels.length - 1))
  })

  it('puts the jacks the cables use on the panel that draws them', () => {
    const model = rackModel(real)
    for (const panel of model.panels) {
      const out = panel.jacks.find((j) => j.kind === 'clock-out')
      const inn = panel.jacks.find((j) => j.kind === 'clock-in')
      // Panel-local jack + panel origin is the layout point the cable is anchored to. Two
      // copies of this arithmetic is how a cable comes to end an inch from its socket.
      if (out !== undefined) expect(panel.xMm + out.at.x).toBe(panel.outAt.x)
      if (inn !== undefined) expect(panel.xMm + inn.at.x).toBe(panel.inAt.x)
    }
  })

  it('sags downward, grows with distance and is capped', () => {
    const y = 158
    const touching = sagFor({ x: 0, y }, { x: 0, y })
    const near = sagFor({ x: 0, y }, { x: 120, y })
    const far = sagFor({ x: 0, y }, { x: 950, y })
    const absurd = sagFor({ x: 0, y }, { x: 40000, y })
    // A floor, so two adjacent jacks still get a curve rather than a straight line.
    expect(touching).toBeGreaterThan(0)
    expect(near).toBeGreaterThan(touching)
    // The case that matters: the two longest cables in a real three-box rig must hang at
    // *different* depths, or they draw as one thick cable. A cap the ordinary case reaches is
    // not a cap, it is a constant.
    expect(far).toBeGreaterThan(near)
    expect(far - sagFor({ x: 0, y }, { x: 780, y })).toBeGreaterThan(5)
    // But it is still capped: even the control point stays inside the figure, so no cable can
    // be clipped by the viewBox however wide a rig gets.
    expect(absurd).toBeLessThan(rackModel(real).heightMm - y)
  })

  it('draws one cubic whose control points hang below both ends', () => {
    const from = { x: 10, y: 11 }
    const to = { x: 210, y: 11 }
    const d = cablePath(from, to)
    expect(d).toBe('M 10 11 C 10 34, 210 34, 210 11')
    const controls = [...d.matchAll(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?),/g)]
    for (const [, , y] of controls) expect(Number(y)).toBeGreaterThan(from.y)
  })

  it('formats path numbers without locale help', () => {
    // Invariant 6's reasoning, applied outside the resolver: markup is compared byte for byte.
    const d = cablePath({ x: 1234.567, y: 11 }, { x: 2000, y: 11 })
    expect(d).not.toMatch(/,\d{3}/)
    expect(d).toContain('1234.57')
  })
})

// ---------------------------------------------------------------------------
// The clock graph — the thing the cables actually are
// ---------------------------------------------------------------------------

describe('clock cables (§7.4)', () => {
  it('runs exactly one cable to each box that can sync, from the one source', () => {
    const model = rackModel(real)
    const sources = model.panels.filter((p) => p.clockRole === 'source')
    expect(sources).toHaveLength(1)
    expect(sources[0]?.deviceId).toBe(real.clockSource?.deviceId)

    const receivers = model.panels.filter((p) => p.clockRole === 'receiver')
    expect(model.cables).toHaveLength(receivers.length)
    expect(model.cables.map((c) => c.toDeviceId).sort()).toEqual(
      receivers.map((p) => p.deviceId).sort(),
    )
    for (const cable of model.cables) {
      expect(cable.fromDeviceId).toBe(sources[0]?.deviceId)
      expect(cable.transport).toBe(real.clockSource?.transport)
    }
  })

  it('never cables a box that cannot speak the chosen transport, and says why', () => {
    const usbOnly = box('usb-only', {
      clock: { canSendClock: false, canReceiveClock: true, transport: ['usb'] },
    })
    const din = box('din-sender', {
      clock: { canSendClock: true, canReceiveClock: true, transport: ['midi-din'] },
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe('r-kick', 'kick', 'hard', 'bd')],
    })
    const model = rackModel(rig([din, usbOnly]))

    expect(model.clockSource?.transport).toBe('midi-din')
    const stranded = model.panels.find((p) => p.deviceId === 'usb-only')
    expect(stranded?.clockRole).toBe('isolated')
    expect(stranded?.isolatedReason).toContain('midi-din')
    expect(model.cables).toHaveLength(0)
    expect(model.isolated.map((p) => p.deviceId)).toEqual(['usb-only'])
  })

  it('says a box cannot receive clock at all rather than inventing a link', () => {
    const deaf = box('send-only', {
      clock: { canSendClock: false, canReceiveClock: false, transport: ['midi-din'] },
    })
    const sender = box('sender', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe('r-kick', 'kick', 'hard', 'bd')],
    })
    const model = rackModel(rig([sender, deaf]))
    expect(model.panels.find((p) => p.deviceId === 'send-only')?.isolatedReason).toBe(
      'cannot receive clock',
    )
    expect(model.cables).toHaveLength(0)
  })

  it('draws no cables at all when nothing in the rig can send clock', () => {
    const a = box('a', { clock: { canSendClock: false, canReceiveClock: true, transport: ['usb'] } })
    const b = box('b', { clock: { canSendClock: false, canReceiveClock: true, transport: ['usb'] } })
    const model = rackModel(rig([a, b]))
    expect(model.clockSource).toBeUndefined()
    expect(model.cables).toHaveLength(0)
    expect(model.panels.every((p) => p.isolatedReason === 'no clock source in this rig')).toBe(true)
  })

  it('always runs CLK OUT to CLK IN, including to boxes left of the source', () => {
    const model = rackModel(real)
    const source = model.panels.find((p) => p.clockRole === 'source')
    if (source === undefined) throw new Error('the real rig has no clock source')
    for (const cable of model.cables) {
      const target = model.panels.find((p) => p.deviceId === cable.toDeviceId)
      if (target === undefined) throw new Error('missing panel')
      // Drawing a cable into the source's own input socket would be a picture of a patch that
      // does not work, however much tidier it looks.
      expect(cable.from).toEqual(source.outAt)
      expect(cable.to).toEqual(target.inAt)
    }
    // Not vacuous: this rig's source is the rightmost panel, so at least one cable loops back.
    expect(model.cables.some((c) => c.to.x < c.from.x)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Panels are generated from device data, and only from device data
// ---------------------------------------------------------------------------

describe('panel contents', () => {
  it('draws one cell per assignable the resolver could have used', () => {
    const model = rackModel(real)
    for (const device of DEVICES) {
      const panel = model.panels.find((p) => p.deviceId === device.id)
      const cells = panel?.banks.flatMap((b) => b.cells) ?? []
      const drawn = cells.length + (panel?.hiddenCells ?? 0)
      expect(drawn).toBe(expand(device).length)
      // Identity, not just count: a cell keyed on the wrong id lights the wrong voice, and the
      // count alone would not notice. Every one of these three boxes fits, so this is exact.
      expect(panel?.hiddenCells).toBe(0)
      expect(cells.map((c) => c.voiceId).sort()).toEqual(
        expand(device).map((a) => a.voiceId).sort(),
      )
    }
  })

  it('lights exactly the voices this guide occupies', () => {
    const model = rackModel(real)
    const occupied = new Map<string, Set<string>>()
    for (const a of real.assignments) {
      const set = occupied.get(a.deviceId) ?? new Set<string>()
      set.add(a.assignable.voiceId)
      occupied.set(a.deviceId, set)
    }
    for (const panel of model.panels) {
      const lit = panel.banks
        .flatMap((b) => b.cells)
        .filter((c) => c.occupied)
        .map((c) => c.voiceId)
        .sort()
      expect(lit).toEqual([...(occupied.get(panel.deviceId) ?? [])].sort())
    }
    // Not a vacuous assertion: the real rig does occupy voices.
    expect(model.panels.some((p) => p.banks.some((b) => b.cells.some((c) => c.occupied)))).toBe(true)
  })

  it('banks pools separately so a two-pool box does not read as one grid', () => {
    const model = rackModel(real)
    const mini = model.panels.find((p) => p.deviceId === 'polyend-tracker-mini')
    expect(mini?.banks.map((b) => b.id)).toEqual(['track-sample', 'track-synth'])
  })

  it('draws the jacks the manifest declares and no others', () => {
    const model = rackModel(real)
    for (const device of DEVICES) {
      const panel = model.panels.find((p) => p.deviceId === device.id)
      const jacks = panel?.jacks ?? []
      expect(jacks.some((j) => j.kind === 'clock-out')).toBe(device.clock.canSendClock)
      expect(jacks.some((j) => j.kind === 'clock-in')).toBe(device.clock.canReceiveClock)
      expect(jacks.filter((j) => j.kind === 'main-out')).toHaveLength(
        device.io.main === 'stereo' ? 2 : 1,
      )
      const individuals = jacks.filter((j) => j.kind === 'individual-out').length
      expect(individuals + (panel?.hiddenJacks ?? 0)).toBe(device.io.individualOuts)
    }
    // The TR-1000's ten individual outs are what make its panel read as itself; if they ever
    // stop being drawn the panel has quietly become generic.
    const tr = model.panels.find((p) => p.deviceId === 'roland-tr-1000')
    expect(tr?.jacks.filter((j) => j.kind === 'individual-out')).toHaveLength(10)
    expect(tr?.hiddenJacks).toBe(0)
  })

  it('reports overflow instead of silently drawing fewer voices', () => {
    const crowded = box('crowded', {
      physical: { panelSpanMm: 40, verified: false },
      voices: [{ kind: 'pool', id: 'v', label: 'V', count: 200, roles: ['kick'], polyphony: 1 }],
    })
    const panel = rackModel(rig([crowded])).panels[0]
    expect(panel?.hiddenCells).toBeGreaterThan(0)
    const shown = panel?.banks.flatMap((b) => b.cells).length ?? 0
    expect(shown + (panel?.hiddenCells ?? 0)).toBe(200)
  })

  it('carries a provisional span through rather than presenting it as cited', () => {
    const guessed = box('guessed', { physical: { panelSpanMm: 200, verified: false } })
    expect(rackModel(rig([guessed])).panels[0]?.spanVerified).toBe(false)
    for (const panel of rackModel(real).panels) expect(panel.spanVerified).not.toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Authored panel layouts (§10)
// ---------------------------------------------------------------------------

describe('panel layouts', () => {
  it('every authored box carries a drawing cited to its manual', () => {
    for (const device of DEVICES) {
      const layout = device.panel
      expect(layout, `${device.id} has no panel layout`).toBeDefined()
      if (layout === undefined) continue
      // Same rule as a parameter value: a drawing read off a manual says which manual.
      expect(layout.verified).not.toBe(false)
      if (layout.verified !== false) expect(layout.verified.kind).toBe('manual')
      expect(layout.features.length).toBeGreaterThan(4)
    }
  })

  it('states each panel’s rise, and the aspect matches the box', () => {
    const aspect = (id: string) => {
      const d = DEVICES.find((x) => x.id === id)
      return (d?.physical.panelSpanMm ?? 0) / (d?.panel?.panelRiseMm ?? 1)
    }
    // Portrait, and this is the case that cost an escalation: Polyend calls 170 mm the width.
    expect(aspect('polyend-tracker-mini')).toBeCloseTo(130 / 170, 6)
    expect(aspect('roland-tr-1000')).toBeCloseTo(486 / 311, 6)
    expect(aspect('synthstrom-deluge')).toBeCloseTo(305 / 208, 6)
  })

  it('keeps every feature inside the panel, and rejects one that is not', () => {
    const tr = DEVICES.find((d) => d.id === 'roland-tr-1000')
    if (tr?.panel === undefined) throw new Error('the TR-1000 has no panel')
    const span = tr.physical.panelSpanMm
    const rise = tr.panel.panelRiseMm
    for (const f of tr.panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x + w).toBeLessThanOrEqual(span)
      expect(f.y + h).toBeLessThanOrEqual(rise)
    }
    // The bound is enforced, not just respected — it needs `physical`, so it lives on the device.
    const escaped = {
      ...tr,
      panel: { ...tr.panel, features: [{ kind: 'screen', x: span - 5, y: 4, w: 40, h: 20 }] },
    }
    expect(DeviceSchema.safeParse(escaped).success).toBe(false)
  })

  it('allows exactly one voice field, and puts the cells inside it', () => {
    const model = rackModel(real)
    for (const device of DEVICES) {
      const fields = device.panel?.features.filter((f) => f.kind === 'voices') ?? []
      expect(fields).toHaveLength(1)
      const field = fields[0]
      if (field?.kind !== 'voices') throw new Error('no voice field')

      const panel = model.panels.find((p) => p.deviceId === device.id)
      const cells = panel?.banks.flatMap((b) => b.cells) ?? []
      expect(cells.length).toBeGreaterThan(0)
      for (const cell of cells) {
        expect(cell.x).toBeGreaterThanOrEqual(field.x - 0.001)
        expect(cell.y).toBeGreaterThanOrEqual(field.y - 0.001)
        expect(cell.x + cell.w).toBeLessThanOrEqual(field.x + field.w + 0.001)
        expect(cell.y + cell.h).toBeLessThanOrEqual(field.y + field.h + 0.001)
      }
    }
    const two = DEVICES.find((d) => d.id === 'roland-tr-1000')
    if (two?.panel === undefined) throw new Error('no panel')
    const doubled = {
      ...two,
      panel: { ...two.panel, features: [...two.panel.features, ...two.panel.features] },
    }
    expect(DeviceSchema.safeParse(doubled).success).toBe(false)
  })

  it('fills the authored region rather than leaving it mostly empty', () => {
    const model = rackModel(real)
    for (const device of DEVICES) {
      const field = device.panel?.features.find((f) => f.kind === 'voices')
      if (field?.kind !== 'voices') throw new Error('no voice field')
      const cells = model.panels.find((p) => p.deviceId === device.id)?.banks.flatMap((b) => b.cells) ?? []
      const covered = cells.reduce((sum, c) => sum + c.w * c.h, 0)
      // A fixed cell size would leave the TR-1000's instrument row at a fraction of this.
      expect(covered / (field.w * field.h)).toBeGreaterThan(0.6)
      // And coverage alone is not enough: taking the *first* column count that fits fills the
      // region with a tall thin column of slabs, which covers plenty of area and reads as
      // nothing. Cells have to still look like the pads and buttons they stand for.
      for (const cell of cells) {
        expect(cell.w / cell.h).toBeGreaterThan(0.6)
        expect(cell.w / cell.h).toBeLessThan(3)
      }
    }
  })

  it('keeps voice cells the size of the pads around them', () => {
    // Found in Chrome, not in a test: handing the Deluge's `voices` the whole 16 x 8 grid made
    // 24 cells about 40 mm across — bigger than a TR-1000 step key, where a real Deluge pad is
    // nearer 15 — and the panel stopped reading as a Deluge. A voice cell that dwarfs the
    // decorative controls beside it is the symptom.
    const model = rackModel(real)
    for (const panel of model.panels) {
      const grids = (panel.layout?.features ?? []).filter((f) => f.kind === 'grid')
      if (grids.length === 0) continue
      const widest = Math.max(...grids.map((g) => (g.kind === 'grid' ? g.w / g.cols : 0)))
      for (const cell of panel.banks.flatMap((b) => b.cells)) {
        expect(cell.w / widest).toBeLessThan(2)
      }
    }
  })

  it('names no device anywhere in the rack UI (invariant 2)', () => {
    // The whole point of authoring layouts as data: a fourth manifest adds a file under
    // `lib/devices/`, not a branch here. A device id appearing in this directory would mean the
    // renderer had started special-casing, which is the thing the invariant forbids.
    const sources = ['model.ts', 'diagram.tsx', 'rack.tsx', 'fullscreen.tsx'].map((f) =>
      readFileSync(new URL(`../components/rack/${f}`, import.meta.url), 'utf8'),
    )
    for (const source of sources) {
      for (const device of DEVICES) expect(source).not.toContain(device.id)
    }
  })
})

// ---------------------------------------------------------------------------
// Patch entries: carried, never fabricated
// ---------------------------------------------------------------------------

describe('patch entries (§3.3)', () => {
  it('carries the real ones the library now authors, on the panel that owns them', () => {
    // This assertion used to read "carries none, because no authored recipe declares any", and
    // it was true of three devices. #49 added the fourth, which is a semi-modular whose recipes
    // *are* patch lists (§3.3), so the honest version of the test is that the entries arrive and
    // land on the right box — the path is exercised by real data rather than only by the fixture
    // below it.
    const model = rackModel(real)
    const patched = model.panels.filter((p) => p.internalPatch.length > 0)
    expect(patched.length).toBeGreaterThan(0)
    for (const panel of patched) {
      // Every entry belongs to an assignment on that same panel. A patch point is inside one box.
      const mine = real.assignments.filter((a) => a.deviceId === panel.deviceId)
      expect(panel.internalPatch.length).toBe(mine.reduce((n, a) => n + a.patch.length, 0))
      for (const entry of panel.internalPatch) {
        expect(entry.from.length).toBeGreaterThan(0)
        expect(entry.to.length).toBeGreaterThan(0)
      }
    }
    // And still not drawn: no cable in the model begins and ends on one device. Intra-panel
    // routing is listed in the guide, not drawn, because a layout carries no jack positions.
    expect(model.cables.every((c) => c.fromDeviceId !== c.toDeviceId)).toBe(true)
  })

  it('carries what a recipe does declare, on the right panel', () => {
    const target = real.assignments[0]
    if (target === undefined) throw new Error('the real rig assigns nothing')
    const entry: ResolvedPatchEntry = {
      from: 'VCO OUT',
      to: 'FILTER IN',
      provenance: { state: 'authored', cite: { kind: 'manual', source: 'fixture p.1' } },
    }
    const withPatch: ResolveResult = {
      ...real,
      assignments: real.assignments.map((a) =>
        a === target
          ? { ...a, patch: [entry] }
          : a,
      ),
    }
    const model = rackModel(withPatch)
    const panel = model.panels.find((p) => p.deviceId === target.deviceId)
    expect(panel?.internalPatch).toEqual([entry])
    // Still not a cable: patch points are inside one box.
    expect(model.cables.every((c) => c.fromDeviceId !== c.toDeviceId)).toBe(true)
    expect(model.cables).toHaveLength(rackModel(real).cables.length)
  })
})

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

describe('rack view', () => {
  it('draws one panel group per selected device, tagged with its clock role', () => {
    const html = markup(real)
    for (const device of DEVICES) expect(html).toContain(`data-device="${device.id}"`)
    expect(html).toContain(`data-clock="source"`)
    expect((html.match(/class="rack-panel"/g) ?? []).length).toBe(DEVICES.length)
  })

  it('draws every cable the model produced and nothing else', () => {
    const model = rackModel(real)
    const html = markup(real)
    expect((html.match(/class="rack-cable"/g) ?? []).length).toBe(model.cables.length)
    for (const cable of model.cables) expect(html).toContain(cable.d)
  })

  it('states the audio omission on the page rather than in a comment', () => {
    expect(markup(real)).toContain('Audio paths are not drawn')
    expect(AUDIO_OMISSION).toContain('inventing one would be a plausible fiction')
  })

  it('says what the drawing claims and what it does not', () => {
    const html = markup(real)
    expect(html).toContain('to scale against each other in both dimensions')
    expect(html).toContain('the detail does not')
    expect(html).toContain('No vendor artwork is used')
  })

  it('describes the rig in text for a reader who cannot see the drawing', () => {
    const html = markup(real)
    expect(html).toContain('aria-labelledby="rack-inline-rack-title rack-inline-rack-desc"')
    expect(html).toContain(real.clockSource?.deviceName ?? 'no clock')
    expect(html).toContain('is the clock source over')
  })

  it('keeps the full-size layer out of the document until it is asked for', () => {
    const html = markup(real)
    expect(html).toContain('Open full size')
    expect(html).not.toContain('role="dialog"')
  })

  it('fits to width — the svg carries no pixel width that could overflow the page', () => {
    const model = rackModel(real)
    const html = markup(real)
    expect(html).toContain(`viewBox="0 0 ${model.totalMm} ${model.heightMm}"`)
    expect(html).not.toMatch(/<svg[^>]*\swidth="/)
  })

  it('says so plainly when there is nothing to draw', () => {
    expect(markup(undefined)).toContain('No template selected')
    const empty = resolve({ devices: [], template, mood: NEUTRAL_MOOD, seed: 1 })
    const html = markup(empty)
    expect(html).toContain('No devices selected')
    expect(html).not.toContain('<svg')
  })

  it('draws the shapes the manifests authored, one renderer for all of them', () => {
    const html = markup(real)
    const count = (cls: string) => (html.match(new RegExp(`class="${cls}"`, 'g')) ?? []).length

    // Every kind in the vocabulary is exercised by the three authored boxes, so a renderer arm
    // that stopped working would show up here rather than only in Chrome.
    expect(count('rack-screen')).toBe(3) // TR-1000, Tracker Mini, Deluge — the Cascadia has none
    expect(count('rack-group')).toBeGreaterThan(3)
    // The TR-1000's eleven instrument faders, plus the Cascadia's thirty-four: that box is set
    // with sliders almost exclusively, which is why its panel is mostly this one shape.
    expect(count('rack-fader')).toBe(45)
    expect(count('rack-key')).toBe(16) // and the TR-1000's sixteen step keys
    expect(count('rack-knob')).toBeGreaterThan(50)
    expect(count('rack-pad')).toBeGreaterThan(50)

    // A voice field is never drawn by the feature renderer: the model owns those cells.
    const fields = DEVICES.flatMap((d) => d.panel?.features.filter((f) => f.kind === 'voices') ?? [])
    expect(fields).toHaveLength(4)
  })

  it('draws a rail under every panel and hangs the cables off it', () => {
    const model = rackModel(real)
    const html = markup(real)
    expect((html.match(/class="rack-rail"/g) ?? []).length).toBe(model.panels.length)
    for (const panel of model.panels) {
      // The rail is below the panel proper, which is what keeps a cable off the drawing.
      expect(panel.outAt.y).toBeGreaterThan(panel.topMm + panel.riseMm)
    }
  })

  it('cites the drawing as well as the span, per panel', () => {
    const html = markup(real)
    for (const device of DEVICES) {
      const layout = device.panel
      if (layout === undefined || layout.verified === false) continue
      // The drawing is authored data read off a manual, so it carries provenance like a value.
      expect(html).toContain(escaped(layout.verified.source))
      expect(html).toContain(`${device.physical.panelSpanMm} × ${layout.panelRiseMm} mm`)
    }
  })

  it('says plainly when a panel has not been drawn rather than passing it off', () => {
    const undrawn = box('undrawn', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe('r-kick', 'kick', 'hard', 'bd')],
    })
    const html = renderToStaticMarkup(createElement(Rack, { result: rig([undrawn]) }))
    expect(html).toContain('panel not drawn yet')
    expect(markup(real)).not.toContain('panel not drawn yet')
  })

  it('renders the same bytes twice', () => {
    expect(markup(real)).toBe(markup(real))
  })
})
