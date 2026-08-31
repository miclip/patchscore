import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  canFollow,
  clockSourceSetup,
  clockWires,
  reachableSlots,
  receiveTransports,
  renderGuide,
  resolve,
  sendTransports,
} from '../lib/core/index'
import { device } from '../lib/devices/moog-mother-32/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, acidLineage, industrialTechno } from '../lib/templates/index'
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
 * This file was deliberately narrow, covering the clock and nothing else; the accent block at the
 * bottom is the first recipe-level claim to join it. The rest of a per-device file for this
 * manifest — the patchbay, the panel — is still to write.
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


// ---------------------------------------------------------------------------
// The accent lane, which is what `m32-acid-dirty` is for (§4.3/#108)
// ---------------------------------------------------------------------------

/**
 * The recipe's title is *"Resonant line with accented steps opening the filter"*, its `routing`
 * says only accented steps push the cutoff, its ASSIGN source is set to Accent and its one patch
 * cable sums that output into `IN · VCF CUTOFF`. All four of those describe a per-step gesture,
 * and none of them tells a reader **which steps to mark** — that is what an `articulation` entry
 * does, and this recipe was the only one on the box making the claim without carrying one.
 *
 * Asserted through a rendered guide rather than off the manifest, because the manifest half is
 * one line and cannot fail interestingly. What can fail is the join: the direction has to emit
 * `accent` on the `acid` role, the box has to declare the lane in `features.perStep`, the recipe
 * has to be the one chosen for the request, and §8 has to print the instruction under **On this
 * box**. Break any of those and the entry is authored, green in the manifest, and invisible on the
 * page — which is exactly the failure #108 exists to name.
 */
describe('Mother-32 accent articulation (§4.3)', () => {
  const acidRecipe = () => {
    const found = device.recipes.find((r) => r.id === 'm32-acid-dirty')
    if (found === undefined) throw new Error('m32-acid-dirty missing from the manifest')
    return found
  }

  /** Phase 5's `acid` block, from its heading to the next one. */
  function acidBlock(): string[] {
    const only = DEVICES.filter((d) => d.id === device.id)
    const doc = renderGuide(
      resolve({ devices: only, template: acidLineage, mood: NEUTRAL_MOOD, seed: 1 }),
    ).split('\n')
    const start = doc.indexOf('## 5. Step programming')
    expect(start, 'the guide has no step programming phase').toBeGreaterThan(-1)
    const heading = doc.findIndex((l, i) => i > start && l.startsWith('### `acid`'))
    expect(heading, 'nothing carries the acid line on a one-box rig').toBeGreaterThan(-1)
    const next = doc.findIndex((l, i) => i > heading && (l.startsWith('### ') || l.startsWith('## ')))
    return doc.slice(heading, next === -1 ? undefined : next)
  }

  it('carries both lanes: the accent it is named for and the glide beside it', () => {
    // The glide arrived with the 28-recipe acid audit: a slide is the other half of this idiom
    // and this box has the lane, per-step even though the rate is not (p.26). `m32-bass-mid-dirty`
    // pairs the identical two entries, so neither is a shape this recipe invented.
    expect(acidRecipe().articulation).toEqual([
      { slot: 'accent', set: { accent: true }, hint: 'accent-step' },
      { slot: 'offbeat', set: { glide: true }, hint: 'glide-step' },
    ])
    // Both lanes are the sequencer's own, from p.24's per-step list — not names this recipe coined.
    expect(device.features?.perStep).toEqual(
      expect.arrayContaining(['accent', 'glide']),
    )
  })

  it('is reached by a direction rather than authored into a hole (#108)', () => {
    // The trap that check exists for: a slot no direction emits is legal, silent and dead. All
    // four `acid` bands of the one direction that requests the role emit `accent`, so it is in
    // the reachable set — which is the whole set the direction emits for the role, not the set
    // this recipe happens to articulate.
    const { slots, requested } = reachableSlots(acidRecipe(), TEMPLATES)
    expect(requested).toBe(true)
    expect(slots).toContain('accent')
    for (const entry of acidRecipe().articulation ?? []) expect(slots).toContain(entry.slot)
  })

  it('prints the instruction under `On this box`, with the hint that says where to press', () => {
    const block = acidBlock()
    expect(block[0]).toBe('### `acid` — Mother-32 · Voice')
    expect(block).toContain('**On this box** — Mother-32')
    // The accent step differs per band, so the guide says a different step in each block rather
    // than one instruction for the part. Band 0 leans on 17 and band 1 on 25.
    expect(block).toContain('- `accent` → `accent` true on step 17')
    expect(block).toContain('- `accent` → `accent` true on step 25')
    expect(block).toContain('  - ↳ hint: RESET / ACCENT accents the step being edited')
  })

  it('says it once per band block rather than once for the part', () => {
    // Four bands, four accents, four instructions — the count is the assertion, because a
    // renderer that hoisted this to the part would still contain every string above.
    const block = acidBlock()
    expect(block.filter((l) => l === '**On this box** — Mother-32')).toHaveLength(4)
    expect(block.filter((l) => l.startsWith('- `accent` → `accent` true on step '))).toHaveLength(4)
  })
})
