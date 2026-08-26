import { describe, expect, it } from 'vitest'
import { DEVICES } from '../lib/devices/registry.generated'
import { patchbay } from '../lib/studio/patchbay'
import type { DeviceId } from '../lib/core'

const pick = (...ids: string[]) =>
  ids.map((id) => {
    const d = DEVICES.find((x) => x.id === id)
    if (d === undefined) throw new Error(`no such device: ${id}`)
    return d
  })

/**
 * #138. The picker's patchbay, tested as derivation — the drawing is the component's and is
 * asserted by looking at it, not here.
 */
describe('patchbay derives a star from the clock source (#138)', () => {
  it('excludes the source from its own links', () => {
    const bay = patchbay(pick('polyend-tracker-mini', 'roland-tr-1000'))
    expect(bay.source).toBeDefined()
    expect(bay.links.map((l) => l.deviceId)).not.toContain(bay.source?.deviceId as DeviceId)
    expect(bay.links).toHaveLength(1)
  })

  it('carries §7.4 basis rather than deciding a source of its own', () => {
    // The point is that this is `selectClockSource`'s answer, not a second ranking. A tie-break
    // must arrive labelled as one so the drawing can avoid dressing it as advice (#121).
    const bay = patchbay(pick('polyend-tracker-mini', 'roland-tr-1000'))
    expect(['claimed', 'contested', 'tie-break']).toContain(bay.source?.basis)
  })
})

describe('the three kinds each come from a declared capability', () => {
  it('calls a box that takes clock and is no audio endpoint a clock run', () => {
    const bay = patchbay(pick('polyend-tracker-mini', 'korg-minilogue-xd'))
    expect(bay.links.find((l) => l.deviceId === 'korg-minilogue-xd')?.kind).toBe('clock')
  })

  it('calls a mixer that cannot take clock an audio run', () => {
    // `canReceiveClock: false` on the Model 2400 is why the wire is the other kind, and #79 is
    // the record of that flag being right.
    const bay = patchbay(pick('polyend-tracker-mini', 'tascam-model-2400'))
    expect(bay.links.find((l) => l.deviceId === 'tascam-model-2400')?.kind).toBe('audio')
  })

  it('calls a box that takes both `either`, and does not rank them', () => {
    const bay = patchbay(pick('polyend-tracker-mini', 'empress-zoia-euroburo'))
    expect(bay.links.find((l) => l.deviceId === 'empress-zoia-euroburo')?.kind).toBe('either')
  })

  it('reads `kind`, not `io.audioIn`, so a monosynth is not cabled as a destination', () => {
    // Thirteen manifests set `audioIn: true` for an external-audio input. Reading that flag as
    // "audio lands here" would draw an audio cable into a Mother-32 and call it routing.
    const m32 = DEVICES.find((d) => d.id === 'moog-mother-32')
    expect(m32?.io.audioIn).toBe(true)
    const bay = patchbay(pick('polyend-tracker-mini', 'moog-mother-32'))
    expect(bay.links.find((l) => l.deviceId === 'moog-mother-32')?.kind).toBe('clock')
  })
})

describe('nothing is drawn where nothing is known (invariant 5)', () => {
  it('leaves a box that takes no clock and is no endpoint uncabled, and says so', () => {
    // Every shipped device answers yes to one of the two, so this asserts the branch on a
    // manifest shaped to reach it rather than pretending the library has one.
    const [tracker] = pick('polyend-tracker-mini')
    const inert = {
      ...(tracker as (typeof DEVICES)[number]),
      id: 'zz-inert' as DeviceId,
      kind: 'synth' as const,
      clock: { canSendClock: false, canReceiveClock: false, transport: [] },
    }
    const bay = patchbay([tracker as (typeof DEVICES)[number], inert])
    expect(bay.links).toHaveLength(0)
    expect(bay.free.map((f) => f.deviceId)).toEqual(['zz-inert'])
  })

  it('draws no star with no centre when nothing can send clock', () => {
    const bay = patchbay(pick('zoom-livetrak-l-8'))
    expect(bay.source).toBeUndefined()
    expect(bay.links).toEqual([])
    expect(bay.free.map((f) => f.deviceId)).toEqual(['zoom-livetrak-l-8'])
  })
})

describe('identity colour is stable, and is not patch order (invariant 6)', () => {
  it('gives one device the same hue whatever else is in the rig', () => {
    const alone = patchbay(pick('polyend-tracker-mini', 'roland-tr-8s'))
    const crowded = patchbay(pick('polyend-tracker-mini', 'synthstrom-deluge', 'roland-tr-8s'))
    const hue = (b: ReturnType<typeof patchbay>) =>
      b.links.find((l) => l.deviceId === 'roland-tr-8s')?.hue
    expect(hue(alone)).toBe(hue(crowded))
  })

  it('does not move when the same rig is assembled in another order', () => {
    const a = patchbay(pick('polyend-tracker-mini', 'roland-tr-8s', 'korg-minilogue-xd'))
    const b = patchbay(pick('polyend-tracker-mini', 'korg-minilogue-xd', 'roland-tr-8s'))
    const hues = (bay: ReturnType<typeof patchbay>) =>
      [...bay.links].sort((x, y) => (x.deviceId < y.deviceId ? -1 : 1)).map((l) => l.hue)
    expect(hues(a)).toEqual(hues(b))
  })

  it('keeps every hue an integer in range', () => {
    const bay = patchbay(DEVICES)
    expect(bay.links.length).toBeGreaterThan(10)
    for (const l of bay.links) {
      expect(Number.isInteger(l.hue)).toBe(true)
      expect(l.hue).toBeGreaterThanOrEqual(0)
      expect(l.hue).toBeLessThan(360)
    }
  })
})
