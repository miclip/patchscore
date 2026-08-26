import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  canFollow,
  clockSourceSetup,
  clockWires,
  receiveTransports,
  renderGuide,
  resolve,
  sendTransports,
} from '../lib/core/index'
import { device } from '../lib/devices/moog-mother-32/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { rackModel } from '../components/rack/model'
import { Guide } from '../components/guide/guide'
import { clockParts, clockText as guideClockText } from '../components/guide/format'
import { clockText as pageClockText } from '../lib/studio/device-page'

/**
 * The Mother-32's clock, which is the reason `ClockSpec` became directional (§2.3/§7.4).
 *
 * This box **receives** clock two ways and **sends** it one way, and the two sets do not
 * intersect: MIDI clock arrives at the front-panel `MIDI IN` (p.54) and an analog clock at
 * `IN · TEMPO` (p.55), while the only tempo that leaves does so as pulses at `OUT · ASSIGN`
 * (p.52). There is no MIDI output on the instrument at all — p.70's MIDI block is one line,
 * `INPUT: Din Jack`.
 *
 * With one transport list for both directions that asymmetry was inexpressible, and §7.4 ranked
 * the box at `midi-din` off the undirected list. A one-box rig printed **"Clock source —
 * Mother-32 over `midi-din`. Sync everything else to it."** — a wire the instrument does not
 * have, on the phase whose whole job is "what do I plug where", and the one claim in the guide a
 * reader cannot check against the panel because there is no socket there to check.
 *
 * This file is deliberately narrow: it covers the clock and nothing else. The rest of a
 * per-device file for this manifest — the recipes, the patchbay, the panel — is still to write.
 */
describe('Mother-32 clock (§2.3/§7.4)', () => {
  it('sends on one wire and receives on two, and says so in the manifest', () => {
    expect(sendTransports(device)).toEqual(['analog-clock'])
    expect(receiveTransports(device)).toEqual(['midi-din', 'analog-clock'])
    // `transport` stays the union — every wire this box carries clock on, either way — so the
    // device page and the jack cross-checks still see the whole box.
    expect(device.clock.transport).toEqual(['midi-din', 'analog-clock'])
  })

  it('leads a one-box rig over the wire the tempo actually leaves on', () => {
    const only = DEVICES.filter((d) => d.id === device.id)
    const result = resolve({
      devices: only,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    expect(result.clockSource).toMatchObject({
      deviceId: 'moog-mother-32',
      transport: 'analog-clock',
    })
    expect(renderGuide(result)).toContain('**Clock source** — Mother-32 over `analog-clock`')
    // The sentence that was wrong, pinned as absent by the exact words it used.
    expect(renderGuide(result)).not.toContain('Mother-32 over `midi-din`')
  })

  it('renders the setup that was authored and unreachable', () => {
    // #104's `sourceSetup` is per transport, and the only entry this box has is `analog-clock`.
    // While §7.4 resolved `midi-din`, `clockSourceSetup` matched nothing and the guide named a
    // clock source with no instruction for turning it on — the exact failure #104 exists to
    // prevent, reintroduced by the transport being wrong rather than by the setup being missing.
    expect(clockSourceSetup(device, 'midi-din')).toBeUndefined()
    expect(clockSourceSetup(device, 'analog-clock')).toMatchObject({
      path: 'SETUP > PAGE 1: ASSIGNABLE OUTPUT JACK',
    })
    const only = DEVICES.filter((d) => d.id === device.id)
    const doc = renderGuide(
      resolve({ devices: only, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 }),
    )
    expect(doc).toContain('SETUP > PAGE 1: ASSIGNABLE OUTPUT JACK')
  })

  it('still follows a MIDI clock, which is the half that would have been lost', () => {
    // The repair that was rejected before directions existed: declaring only `analog-clock` would
    // have fixed the source line by making this box unable to follow a MIDI rig, which it does
    // out of the box (Follow MIDI Clock is on in the factory defaults, p.61).
    expect(canFollow(device, 'midi-din')).toBe(true)
    expect(canFollow(device, 'analog-clock')).toBe(true)
    expect(canFollow(device, 'usb')).toBe(false)
  })

  it('is not exempted from a MIDI-clocked rig it can genuinely follow', () => {
    const pair = DEVICES.filter((d) => d.id === device.id || d.id === 'korg-minilogue-xd')
    const result = resolve({
      devices: pair,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    expect(result.clockSource?.transport).toBe('midi-din')
    const doc = renderGuide(result)
    expect(doc).toContain('Sync everything else to it.')
    expect(doc).not.toContain('Mother-32, which')
  })

  it('reads as one wire out and two in on the inventory line', () => {
    // The line that carried the falsehood. One list read "sends clock · midi-din/analog-clock",
    // which is true of the box and false of either direction taken alone.
    expect(clockWires(device)).toEqual({
      kind: 'split',
      send: ['analog-clock'],
      receive: ['midi-din', 'analog-clock'],
    })
    const only = DEVICES.filter((d) => d.id === device.id)
    const result = resolve({ devices: only, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 })
    expect(renderGuide(result)).toContain(
      'clock: sends clock · out: analog-clock · in: midi-din/analog-clock',
    )
    // §8's two renderers share no code path, and `clockParts` hands the React side the two lists
    // without the labels — those are prose and the component writes its own. So the split line is
    // exactly the shape that drifts, and `device-catalogue.test.ts` pins the Markdown against the
    // device page but nothing pinned the page in the guide.
    const page = renderToStaticMarkup(
      createElement(Guide, { result, showHints: true } as never),
    ).replace(/<[^>]+>/g, '')
    expect(page).toContain('sends clock · out: analog-clock · in: midi-din/analog-clock')
  })

  it('says the split the same way in all three restatements of the clock line', () => {
    // §8's rule is that the renderers write their own prose, and three of them write this one:
    // `lib/core/render.ts` inline, `lib/studio/device-page.ts` for the catalogue, and
    // `components/guide/format.ts` for the React guide. `clockWires` decides *which* wires they
    // name so that part cannot drift; the labels are each renderer's own.
    //
    // The third copy is why this test is here rather than only in the catalogue sweep. It had no
    // callers when clock became directional, kept reading the shared-wire field alone, and
    // returned a bare `sends clock` for this box — the transports dropped, on the one device in
    // the library that has a split to drop.
    const expected = 'sends clock · out: analog-clock · in: midi-din/analog-clock'
    expect(guideClockText(device)).toBe(expected)
    expect(pageClockText(device)).toBe(expected)
    // And the two-slot shape the React component actually renders from, which is where the
    // labels are prose and the wires are identifiers (§10).
    expect(clockParts(device)).toEqual({
      claim: 'sends clock',
      send: 'analog-clock',
      receive: 'midi-din/analog-clock',
    })
  })

  it('is drawn as reachable by the rack, over a wire it can take clock on', () => {
    // §10's `isolationReason` asks the narrow question and always did. The point here is that the
    // diagram and the sentence beside it now agree, rather than the rack having been wrong too.
    const pair = DEVICES.filter((d) => d.id === device.id || d.id === 'korg-minilogue-xd')
    const model = rackModel(
      resolve({ devices: pair, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 }),
    )
    expect(model.isolated.map((p) => p.deviceId)).not.toContain('moog-mother-32')
  })
})
