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
  NARROW_PER_ROW,
  PANEL_GAP_MM,
  PANEL_HEIGHT_MM,
  RAIL_MM,
  cablePath,
  perRowForWidth,
  rackModel,
  sagFor,
  samplePath,
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

  it('bottom-aligns panels of different heights on one rail, per row', () => {
    const model = rackModel(real, { perRow: DEVICES.length })
    const rails = new Set(model.panels.map((p) => p.topMm + p.riseMm))
    expect(rails.size).toBe(1)
    // Not vacuous: every one of these boxes is a genuinely different depth.
    expect(new Set(model.panels.map((p) => p.riseMm)).size).toBe(DEVICES.length)
    for (const panel of model.panels) expect(panel.topMm).toBeGreaterThanOrEqual(0)

    // Wrapped, the rule is per row: every panel on a row shares that row's rail line. That is
    // what lets a same-row cable stay a horizontal hang rather than a diagonal.
    const wrapped = rackModel(real, { perRow: 2 })
    expect(wrapped.rows).toHaveLength(Math.ceil(DEVICES.length / 2))
    for (const row of wrapped.rows) {
      expect(new Set(row.panels.map((p) => p.topMm + p.riseMm)).size).toBe(1)
    }
  })

  it('accumulates x by span plus one gap within a row, and totals without a trailing gap', () => {
    const model = rackModel(real, { perRow: DEVICES.length })
    let expected = 0
    for (const panel of model.panels) {
      expect(panel.xMm).toBe(expected)
      expected += panel.spanMm + PANEL_GAP_MM
    }
    // One row and no inter-row cable, so no gutter is reserved and the figure is the band.
    expect(model.leftGutterMm).toBe(0)
    expect(model.rightGutterMm).toBe(0)
    expect(model.totalMm).toBe(expected - PANEL_GAP_MM)
    const spans = model.panels.reduce((sum, p) => sum + p.spanMm, 0)
    expect(model.totalMm).toBe(spans + PANEL_GAP_MM * (model.panels.length - 1))
    expect(model.frontPanelMm).toBe(spans)
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
      // §2.4. A device with no voices contributes no assignables, so it authors no voice field:
      // the region would be filled with nothing on every guide ever rendered, claiming a readout
      // the box cannot produce. The LiveTrak L-8 is the first box in the library like this, and
      // the rule is "at most one", not "one" — the schema has always said so.
      if (device.voices.length === 0) {
        expect(fields).toHaveLength(0)
        continue
      }
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
      if (device.voices.length === 0) continue // §2.4: no assignables, no region to fill.
      const field = device.panel?.features.find((f) => f.kind === 'voices')
      if (field?.kind !== 'voices') throw new Error('no voice field')
      const cells = model.panels.find((p) => p.deviceId === device.id)?.banks.flatMap((b) => b.cells) ?? []
      const covered = cells.reduce((sum, c) => sum + c.w * c.h, 0)
      // A fixed cell size would leave the TR-1000's instrument row at a fraction of this.
      //
      // **0.55 rather than the 0.6 this held until the MC-101 landed, and the 0.05 is a debt
      // rather than a re-measurement.** `banksFor` picks *one* column count and *one* cell size
      // for every bank on a panel, so a device whose banks are wildly unequal spends most of the
      // small bank's row on nothing: the MC-101 is 8 drum pads and 3 tone tracks, and at 4
      // columns its second bank fills three cells of four. It reaches 0.573 against the 0.635
      // the Tracker Mini's balanced 8-and-8 manages on a comparable region. No region on that
      // panel does better — a two-bank 8-and-3 field only clears 0.6 at roughly 138 x 50 mm,
      // which on a 174 mm panel would mean drawing the voice field over the transport and the
      // pad-mode buttons, claiming pads where there are none.
      //
      // The fix is in the packer, not in the manifest: choosing columns per bank rather than per
      // panel would let the tone bank take three columns and fill its row. Until someone does
      // that, this is where the cost is recorded, because the alternative was to author fewer
      // pads than the kit has or more tone tracks than the box has left — bending device data to
      // suit a drawing, when §2.3 makes the drawing the optional half.
      expect(covered / (field.w * field.h)).toBeGreaterThan(0.55)
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

    // Every kind in the vocabulary is exercised by the authored boxes, so a renderer arm
    // that stopped working would show up here rather than only in Chrome.
    expect(count('rack-screen')).toBe(5) // all but the Cascadia, which has no display
    expect(count('rack-group')).toBeGreaterThan(3)
    // The TR-1000's eleven instrument faders, the Cascadia's thirty-four — that box is set with
    // sliders almost exclusively, which is why its panel is mostly this one shape — the MC-101's
    // four track levels, and the L-8's ten: eight channels, EFX RTN and MASTER.
    expect(count('rack-fader')).toBe(59)
    expect(count('rack-key')).toBe(16) // and the TR-1000's sixteen step keys
    expect(count('rack-knob')).toBeGreaterThan(50)
    expect(count('rack-pad')).toBeGreaterThan(50)

    // A voice field is never drawn by the feature renderer: the model owns those cells.
    const fields = DEVICES.flatMap((d) => d.panel?.features.filter((f) => f.kind === 'voices') ?? [])
    expect(fields).toHaveLength(5)
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

// ---------------------------------------------------------------------------
// Rows (#63)
// ---------------------------------------------------------------------------

/** A rig of `n` boxes where only the first can send clock, so the source's row is known. */
function wideRig(n: number, sourceAt = 0): ResolveResult {
  const devices = Array.from({ length: n }, (_, i) =>
    box(`b${i}`, {
      // Spans differ so the rows are genuinely ragged rather than accidentally equal.
      physical: { panelSpanMm: 120 + (i % 4) * 90, verified: { kind: 'manual', source: 'fx p.1' } },
      clock: {
        canSendClock: i === sourceAt,
        canReceiveClock: true,
        transport: ['midi-din'],
      },
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe(`r${i}`, 'kick', 'hard', 'bd')],
    }),
  )
  return rig(devices)
}

/** The panel proper — the face the cables must keep off. The rail below it is theirs. */
function face(panel: { xMm: number; topMm: number; spanMm: number; riseMm: number }) {
  return { x: panel.xMm, y: panel.topMm, w: panel.spanMm, h: panel.riseMm }
}

describe('rack rows (#63)', () => {
  it('caps a row by breakpoint: three on a phone, four on a tablet, five on a desktop', () => {
    // The number the human gave, honoured as a count rather than as a minimum width — so it is
    // checkable by counting instead of by measuring.
    expect(perRowForWidth(320)).toBe(3)
    expect(perRowForWidth(390)).toBe(3)
    expect(perRowForWidth(767)).toBe(3)
    expect(perRowForWidth(768)).toBe(4)
    expect(perRowForWidth(1023)).toBe(4)
    expect(perRowForWidth(1024)).toBe(5)
    expect(perRowForWidth(1920)).toBe(5)
    // The server has no viewport and renders the narrow one, so nothing wider than a phone is
    // ever guessed on a phone.
    expect(NARROW_PER_ROW).toBe(perRowForWidth(390))
  })

  it('never puts more than the cap on a row, at every cap', () => {
    for (const perRow of [3, 4, 5]) {
      for (const n of [1, 2, 3, 4, 7, 11]) {
        const model = rackModel(wideRig(n), { perRow })
        expect(model.perRow).toBe(perRow)
        expect(model.rows).toHaveLength(Math.ceil(n / perRow))
        for (const row of model.rows) expect(row.panels.length).toBeLessThanOrEqual(perRow)
        // Every panel is on exactly one row, and the rows partition them.
        expect(model.rows.flatMap((r) => r.panels.map((p) => p.deviceId))).toEqual(
          model.panels.map((p) => p.deviceId),
        )
      }
    }
  })

  it('fills rows in registry order, so a reroll cannot rearrange the rack', () => {
    const model = rackModel(wideRig(7), { perRow: 3 })
    expect(model.panels.map((p) => p.deviceId)).toEqual(
      ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
    )
    expect(model.panels.map((p) => p.row)).toEqual([0, 0, 0, 1, 1, 1, 2])
    // Rows never run backwards: panel i is on the same row as panel i-1 or the next one down.
    let previous = 0
    for (const panel of model.panels) {
      expect(panel.row === previous || panel.row === previous + 1).toBe(true)
      previous = panel.row
    }
  })

  it('keeps one millimetre the same length on every row', () => {
    // The claim §10 makes, and the one wrapping could most easily break. There is a single
    // viewBox in millimetres, so the test is that a panel's drawn span is its cited span
    // wherever it lands — a box does not get bigger for being on the last row.
    const cited = new Map(DEVICES.map((d) => [d.id, d.physical.panelSpanMm]))
    for (const perRow of [1, 2, 3, 4, 5]) {
      const model = rackModel(real, { perRow })
      for (const panel of model.panels) expect(panel.spanMm).toBe(cited.get(panel.deviceId))
    }

    // And said as a ratio between two boxes that a narrow cap puts on different rows: the
    // Tracker Mini still reads narrow beside the TR-1000 when it is a row below it.
    const wrapped = rackModel(real, { perRow: 1 })
    const rows = new Map(wrapped.panels.map((p) => [p.deviceId, p.row]))
    const widest = wrapped.panels.reduce((a, b) => (a.spanMm >= b.spanMm ? a : b))
    const narrowest = wrapped.panels.reduce((a, b) => (a.spanMm <= b.spanMm ? a : b))
    expect(rows.get(widest.deviceId)).not.toBe(rows.get(narrowest.deviceId))
    expect(widest.spanMm / narrowest.spanMm).toBeCloseTo(
      (cited.get(widest.deviceId) ?? 0) / (cited.get(narrowest.deviceId) ?? 1),
      10,
    )
  })

  it('leaves rows ragged rather than stretching a short one to fit', () => {
    const model = rackModel(wideRig(7), { perRow: 3 })
    for (const row of model.rows) {
      // A row is exactly its panels plus the gaps between them. No justification, no padding.
      const spans = row.panels.reduce((sum, p) => sum + p.spanMm, 0)
      expect(row.widthMm).toBe(spans + PANEL_GAP_MM * (row.panels.length - 1))
      // And every row starts at the same left edge, which is what makes the raggedness read.
      expect(row.panels[0]?.xMm).toBe(model.leftGutterMm)
    }
    // Not vacuous: the last row holds one box and is much shorter than the widest.
    const widths = model.rows.map((r) => r.widthMm)
    const last = widths[widths.length - 1] ?? 0
    expect(last).toBeLessThan(Math.max(...widths))
    // The figure is the widest row plus whatever gutters the cables needed, never the sum.
    expect(model.totalMm).toBe(model.leftGutterMm + Math.max(...widths) + model.rightGutterMm)
    expect(model.totalMm).toBeLessThan(model.frontPanelMm)
  })

  it('stacks each row block over its own cable corridor, and reports the height honestly', () => {
    const model = rackModel(wideRig(7), { perRow: 3 })
    for (const row of model.rows) {
      expect(row.blockMm).toBe(
        Math.max(...row.panels.map((p) => p.riseMm + RAIL_MM)),
      )
      expect(row.corridorMm).toBe(row.topMm + row.blockMm)
      // Panels sit inside their row's block, with none escaping into the corridor.
      for (const panel of row.panels) {
        expect(panel.topMm).toBeGreaterThanOrEqual(row.topMm)
        expect(panel.topMm + panel.riseMm + RAIL_MM).toBeCloseTo(row.topMm + row.blockMm, 6)
      }
    }
    // Rows do not overlap, and each is clear of the one above by a whole corridor.
    for (let i = 1; i < model.rows.length; i++) {
      const above = model.rows[i - 1]
      const here = model.rows[i]
      if (above === undefined || here === undefined) throw new Error('missing row')
      expect(here.topMm).toBeGreaterThan(above.corridorMm)
    }
    const lastRow = model.rows[model.rows.length - 1]
    expect(model.heightMm).toBeGreaterThan(lastRow?.corridorMm ?? 0)
  })

  it('keeps the same-row hang exactly as it was', () => {
    const model = rackModel(wideRig(5), { perRow: 3 })
    const sameRow = model.cables.filter((c) => c.routing === 'same-row')
    expect(sameRow.length).toBeGreaterThan(0)
    for (const cable of sameRow) {
      // Byte for byte the curve this drawing has always drawn: one cubic, sagging.
      expect(cable.d).toBe(cablePath(cable.from, cable.to))
      expect(cable.path.segs).toHaveLength(1)
      expect(cable.path.segs[0]?.kind).toBe('cubic')
    }
  })

  it('lays a one-row rig out exactly as it did before rows existed', () => {
    // The regression guard that matters: wrapping must cost nothing when nothing wraps. No
    // gutter is reserved, so not one millimetre of the old geometry moved.
    const model = rackModel(real, { perRow: DEVICES.length })
    expect(model.rows).toHaveLength(1)
    expect(model.leftGutterMm).toBe(0)
    expect(model.rightGutterMm).toBe(0)
    expect(model.panels[0]?.xMm).toBe(0)
    expect(model.cables.every((c) => c.routing === 'same-row')).toBe(true)
    for (const cable of model.cables) expect(cable.d).toBe(cablePath(cable.from, cable.to))
  })

  it('routes an inter-row cable round the side, never across a panel', () => {
    // The real work of #63. A cable from a box on row 1 to a box on row 2 leaves its jack
    // downward into the corridor, crosses to a reserved gutter, drops down the side of the
    // frame and comes back along the corridor *under* its target. Nothing it touches is a face.
    for (const [n, perRow] of [[7, 3], [11, 4], [9, 5], [6, 2]] as const) {
      const model = rackModel(wideRig(n), { perRow })
      const inter = model.cables.filter((c) => c.routing === 'inter-row')
      expect(inter.length).toBeGreaterThan(0)

      for (const cable of model.cables) {
        for (const point of samplePath(cable.path)) {
          for (const panel of model.panels) {
            const rect = face(panel)
            const on =
              point.x >= rect.x &&
              point.x <= rect.x + rect.w &&
              point.y >= rect.y &&
              point.y <= rect.y + rect.h
            expect(
              on,
              `${cable.fromName}→${cable.toName} crosses ${panel.name} at ${point.x},${point.y}`,
            ).toBe(false)
          }
        }
      }
    }
  })

  it('reserves the gutter it uses, and actually goes round the outside', () => {
    const model = rackModel(wideRig(7), { perRow: 3 })
    const bandLeft = model.leftGutterMm
    const bandRight = model.totalMm - model.rightGutterMm
    expect(model.leftGutterMm + model.rightGutterMm).toBeGreaterThan(0)
    // Every panel is inside the band; the gutters belong to the cables alone.
    for (const panel of model.panels) {
      expect(panel.xMm).toBeGreaterThanOrEqual(bandLeft)
      expect(panel.xMm + panel.spanMm).toBeLessThanOrEqual(bandRight + 0.001)
    }
    for (const cable of model.cables.filter((c) => c.routing === 'inter-row')) {
      const points = samplePath(cable.path)
      // Not merely avoiding the panels: it leaves the band entirely, which is what a loom does.
      expect(points.some((p) => p.x < bandLeft || p.x > bandRight)).toBe(true)
      // And it stays inside the figure, so nothing is clipped by the viewBox.
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(-0.001)
        expect(point.x).toBeLessThanOrEqual(model.totalMm + 0.001)
        expect(point.y).toBeGreaterThanOrEqual(-0.001)
        expect(point.y).toBeLessThanOrEqual(model.heightMm + 0.001)
      }
    }
  })

  it('routes upward as readily as downward when the source is on a lower row', () => {
    const model = rackModel(wideRig(7, 6), { perRow: 3 })
    const source = model.panels.find((p) => p.clockRole === 'source')
    expect(source?.row).toBe(2)
    const inter = model.cables.filter((c) => c.routing === 'inter-row')
    expect(inter.length).toBe(6)
    for (const cable of inter) {
      expect(cable.to.y).toBeLessThan(cable.from.y)
      for (const point of samplePath(cable.path)) {
        for (const panel of model.panels) {
          const rect = face(panel)
          expect(
            point.x >= rect.x &&
              point.x <= rect.x + rect.w &&
              point.y >= rect.y &&
              point.y <= rect.y + rect.h,
          ).toBe(false)
        }
      }
    }
  })

  it('gives every routed cable its own lane rather than drawing them on top of each other', () => {
    const model = rackModel(wideRig(9), { perRow: 3 })
    const inter = model.cables.filter((c) => c.routing === 'inter-row')
    expect(inter.length).toBeGreaterThan(2)
    // Two cables sharing a corridor must not share its depth, or the drawing shows one cable
    // where the rig has several.
    const paths = new Set(inter.map((c) => c.d))
    expect(paths.size).toBe(inter.length)
  })

  it('quotes the front panel a person owns, not the width of the figure', () => {
    const model = rackModel(real, { perRow: 3 })
    expect(model.frontPanelMm).toBe(
      DEVICES.reduce((sum, d) => sum + d.physical.panelSpanMm, 0),
    )
    // The line #63 asked not to lose, still on the page and still counting boxes.
    const html = markup(real)
    expect(html).toContain(`Overview, fitted to the page. ${model.frontPanelMm} mm of front panel`)
    expect(html).toContain(`across ${DEVICES.length} boxes`)
    expect(html).toContain('on 2 rows')
    // And the two notes that survive whatever the layout becomes.
    expect(html).toContain('Audio paths are not drawn')
    expect(html).toContain('to scale against each other in both dimensions')
  })

  it('draws a case rail behind each row, and none at all when nothing wrapped', () => {
    // A short row against a full-width rail is what "a real rack where the last row is rarely
    // full" looks like. One row needs no such rail: the panels' own patch rails are the frame.
    const wrapped = markup(real)
    expect((wrapped.match(/class="rack-row-rail"/g) ?? []).length).toBe(
      rackModel(real, { perRow: NARROW_PER_ROW }).rows.length,
    )
    const one = renderToStaticMarkup(
      createElement(Rack, { result: rig([box('solo', {
        voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
        recipes: [makeRecipe('r-kick', 'kick', 'hard', 'bd')],
      })]) }),
    )
    expect(one).not.toContain('rack-row-rail')
  })

  it('routes the same way twice, on any machine', () => {
    // Invariant 6's reasoning applied to layout: lanes and gutter sides are decided by integer
    // and IEEE-754 arithmetic on numbers already fixed, never by insertion order into a shared
    // map or by anything ambient. Two models of one rig are the same drawing.
    const a = rackModel(wideRig(9), { perRow: 4 })
    const b = rackModel(wideRig(9), { perRow: 4 })
    expect(a.cables.map((c) => c.d)).toEqual(b.cables.map((c) => c.d))
    expect(a.panels.map((p) => [p.xMm, p.topMm, p.row])).toEqual(
      b.panels.map((p) => [p.xMm, p.topMm, p.row]),
    )
    for (const cable of a.cables) expect(cable.d).not.toMatch(/,\d{3}/)
  })

  it('renders the narrow layout on the server, wrapped and in one coordinate system', () => {
    const model = rackModel(real, { perRow: NARROW_PER_ROW })
    expect(model.rows.length).toBeGreaterThan(1)
    const html = markup(real)
    expect(html).toContain(`viewBox="0 0 ${model.totalMm} ${model.heightMm}"`)
    // One viewBox for the whole figure is what makes the shared scale structural rather than
    // arithmetic: there is no second scale for a renderer to get wrong.
    expect((html.match(/<svg/g) ?? []).length).toBe(1)
    expect(html).toContain('The rack is on 2 rows of at most 3 boxes')
  })
})
