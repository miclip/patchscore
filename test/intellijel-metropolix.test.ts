import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  expand,
  renderGuide,
  resolve,
  selectClockSource,
} from '../lib/core/index'
import { device } from '../lib/devices/intellijel-metropolix/index'
import { device as cascadia } from '../lib/devices/intellijel-cascadia/index'
import { device as model2400 } from '../lib/devices/tascam-model-2400/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { rackModel } from '../components/rack/model'
import { auditDevice } from '../scripts/audit-verified'

/**
 * Metropolix is the first device in the library that **produces control data and no sound**, and
 * almost everything below is a claim about something it does *not* have. Three engine changes
 * landed ahead of it — `kind: 'sequencer'`, `io.main: 'none'`, and `clock.preferredSource` — and
 * this file is where each of them meets a real manifest for the first time.
 *
 * The temptation this device exists to resist is specific: it has two tracks that look like
 * voices, and modelling them as two would put two assignables into every search on this rig and
 * let the resolver put a kick "on the Metropolix". A track is a stream of pitch and gate leaving
 * a jack; the sound belongs to whatever is patched to it, and so does the recipe.
 */

const MANUAL = 'Metropolix Manual v1.6, p.'
const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

describe('Metropolix manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('intellijel-metropolix')
    expect(device.maker).toBe('Intellijel')
  })

  it('is the library\'s first sequencer, and the kind has since been read the same way twice', () => {
    // §2.3 gained the kind for exactly this shape: `semi-modular` would imply a normalised audio
    // instrument with voices and recipes, `groovebox` self-contained sound generation. Both would
    // make this manifest state something false.
    //
    // **The Hapax is the second, and it arrived at the kind by the same reading**: everything it
    // emits is control data, its connectivity pages enumerate the back panel and name no audio
    // socket, and its sixteen tracks per project are the same temptation this file exists to
    // resist, wearing a bigger number. Asserted as a list rather than a count so a third has to
    // be looked at rather than absorbed.
    expect(device.kind).toBe('sequencer')
    expect(DEVICES.filter((d) => d.kind === 'sequencer').map((d) => d.id)).toEqual([
      'intellijel-metropolix',
      'squarp-hapax',
    ])
    // And the other Intellijel box in the library is the counter-example the kind exists against.
    expect(cascadia.kind).toBe('semi-modular')
  })

  // -------------------------------------------------------------------------
  // §2.4 — no voices, and the two tracks are why that needs saying
  // -------------------------------------------------------------------------

  it('contributes zero assignables, however many tracks the panel has', () => {
    expect(device.voices).toEqual([])
    expect(device.recipes).toEqual([])
    expect(expand(device)).toHaveLength(0)

    // The claim that matters is about the *rig*: adding this box to one must not change where a
    // single part lands, because it can carry none of them.
    const without = DEVICES.filter((d) => d.id !== device.id)
    const a = resolve({ devices: without, template, mood: NEUTRAL_MOOD, seed: 1 })
    const b = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
    const placements = (r: typeof a) =>
      r.assignments
        .map((x) => `${x.requestId}:${x.deviceId}:${x.assignables.map((v) => v.voiceId).join('+')}`)
        .sort()
    expect(placements(b)).toEqual(placements(a))
    expect(b.shortfalls.map((g) => g.requestId).sort()).toEqual(a.shortfalls.map((g) => g.requestId).sort())
    // Nothing is ever assigned to it, on any template or seed.
    for (const t of TEMPLATES) {
      for (const seed of [1, 7, 18]) {
        const r = resolve({ devices: DEVICES, template: t, mood: NEUTRAL_MOOD, seed })
        expect(r.assignments.some((x) => x.deviceId === device.id), `${t.id}/${seed}`).toBe(false)
      }
    }
  })

  it('carries nothing to audit, because there is nothing authored to be wrong about', () => {
    const audit = auditDevice(device)
    expect(audit.counts.params).toBe(0)
    expect(audit.findings).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // §2.3 — no audio path, anywhere
  // -------------------------------------------------------------------------

  it('declares no audio output at all', () => {
    // Every jack on this panel carries pitch, gate, clock or CV (pp.18-19). `mono` would have
    // made both renderers print a main out that does not exist.
    expect(device.io).toEqual({ main: 'none', individualOuts: 0, audioIn: false, usbAudio: false })
  })

  it('says "no audio I/O" in the guide rather than naming a bus', () => {
    const doc = renderGuide(resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 }))
    const line = doc.split('\n').find((l) => l.includes('Metropolix') && l.includes('sequencer'))
    expect(line).toBeDefined()
    expect(doc).toContain('audio: no audio I/O')
    // The sentences that name a bus must not appear against this box.
    const block = doc.slice(doc.indexOf('- **Metropolix**'))
    const ownLines = block.split('\n').slice(0, 4).join('\n')
    expect(ownLines).not.toContain('main out')
    expect(ownLines).not.toContain('none channel')
  })

  it('draws no audio jack on the rack', () => {
    // §10's `jacksFor` branched two ways on `io.main` until `none` existed, so this box would
    // have been given a fictional OUT socket. It gets none, and keeps both clock jacks.
    const result = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
    const panel = rackModel(result).panels.find((p) => p.deviceId === device.id)
    expect(panel).toBeDefined()
    expect(panel?.jacks.filter((j) => j.kind === 'main-out')).toEqual([])
    expect(panel?.jacks.filter((j) => j.kind === 'individual-out')).toEqual([])
    expect(panel?.jacks.some((j) => j.kind === 'clock-out')).toBe(true)
    expect(panel?.jacks.some((j) => j.kind === 'clock-in')).toBe(true)
    // And no voice cells, because there is no voice field to pack.
    expect(panel?.banks.flatMap((b) => b.cells)).toEqual([])
    expect(panel?.hiddenCells).toBe(0)
  })

  it('draws no voice field, which only a box with no voices may do', () => {
    // Every drawn panel has one except the two sequencers. This was the first that must not: a
    // lit rectangle that can never light would be a claim the resolver can never satisfy.
    expect(device.panel?.features.filter((f) => f.kind === 'voices')).toEqual([])
    const drawnWithVoices = DEVICES.filter(
      (d) => d.panel !== undefined && d.panel.features.some((f) => f.kind === 'voices'),
    )
    expect(drawnWithVoices.some((d) => d.id === device.id)).toBe(false)
    expect(drawnWithVoices.length).toBeGreaterThan(4)
  })

  // -------------------------------------------------------------------------
  // §2.3 — the panel, and the dimension the manual does not print
  // -------------------------------------------------------------------------

  it('spans 34 HP converted to millimetres, cited to the specifications page', () => {
    // p.204 prints `Width: 34 hp` and no millimetre figure. 34 x 5.08 = 172.72.
    expect(device.physical.panelSpanMm).toBeCloseTo(34 * 5.08, 1)
    expect(device.physical.panelSpanMm).toBe(172.7)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}204` })
  })

  it('takes its rise from the panel figure, never from the 25 mm depth', () => {
    // **The trap.** p.204's other number is `Maximum Depth: 25 mm`, which is how far the module
    // protrudes *behind* the rails — §2.3's orientation trap from a third direction. Taking it as
    // the rise would draw this module about seven times too short.
    expect(device.panel?.panelRiseMm).toBe(129)
    expect(device.panel?.panelRiseMm).not.toBe(25)
    expect(device.panel?.verified).toMatchObject({
      kind: 'manual',
      source: expect.stringContaining('p.17'),
    })
    // The measurement is corroborated by the 3U Eurorack standard without being sourced from it:
    // 128.5 mm by the standard, and the figure measures within a millimetre of that.
    expect(Math.abs((device.panel?.panelRiseMm ?? 0) - 128.5)).toBeLessThan(1)
  })

  it('keeps every drawn feature inside the panel', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(172.7)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(129)
    }
    // It has a real display, unlike the other two panels in the library without one.
    expect(panel.features.filter((f) => f.kind === 'screen')).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // §7.4 — the first authored clock preference in the library
  // -------------------------------------------------------------------------

  describe('clock (§7.4)', () => {
    it('claims the preference, and is one of the three boxes that do', () => {
      expect(device.clock.preferredSource).toBe(true)
      // This was the only claim in the library until #80 went through the nine boxes with no
      // decision recorded either way. Exactly one of them cleared §7.4's bar: the Tracker Mini,
      // whose manual calls it "a perfect fit for the centre piece of a setup" (p.283). The other
      // eight carry a reasoned non-claim in `capabilityEvidence`, which is why the list is short
      // rather than because nobody looked.
      expect(DEVICES.filter((d) => d.clock.preferredSource === true).map((d) => d.id)).toEqual([
        'intellijel-metropolix',
        'polyend-tracker-mini',
        'squarp-hapax',
      ])
      // The Model 2400 claimed it for two commits on the strength of a manual proving only that
      // a desk *can* generate clock. Capability is not preference; this claim is about what the
      // box is for.
      expect(model2400.clock.preferredSource).toBeUndefined()
    })

    it('is lifted over every box that merely can send clock, carrying nothing', () => {
      // Every remaining key is against it: `usb` loses to the `midi-din` every other clock-capable
      // box carries, `intellijel-metropolix` does not sort first, and it holds no parts at all.
      // Only the authored claim puts it ahead — which is the whole point of the field. Asserted
      // against the unpreferred boxes rather than against the full rig, because the full rig now
      // holds a *second* authored claim and that is a different question (below).
      const unpreferred = DEVICES.filter(
        (d) => d.clock.canSendClock && d.clock.preferredSource !== true,
      )
      expect(unpreferred.length).toBeGreaterThan(4)
      // **Every one of them carries `midi-din` except the DFAM, and that exception strengthens
      // this rather than weakening it.** That box has no MIDI connector at all: its only clock
      // transport is `analog-clock`, which `TRANSPORT_PREFERENCE` does not rank, so it sorts
      // *below* this module's `usb` rather than above it. The premise the case needs is that no
      // unpreferred box outranks the Metropolix on transport, and the DFAM is the one box that
      // could not do so even in principle.
      const midi = unpreferred.filter((d) => d.clock.transport.includes('midi-din'))
      expect(unpreferred.filter((d) => !midi.includes(d)).map((d) => d.id)).toEqual(['moog-dfam'])
      expect(midi.length).toBeGreaterThan(4)
      expect(unpreferred.some((d) => d.id < device.id)).toBe(true)

      const heavy = new Map(unpreferred.map((d, i) => [d.id, unpreferred.length - i]))
      const source = selectClockSource([...unpreferred, device], heavy)
      expect(source?.deviceId).toBe(device.id)
      expect(source?.occupiedAssignables).toBe(0)
      expect(source?.transport).toBe('usb')
    })

    it('loses the full rig to the other authored claim, on transport rather than on rank', () => {
      // **This box still loses on transport, and that has not changed** — it has only `usb`
      // where the other claimants have `midi-din`. What changed is who wins.
      //
      // #198 gave §7.4 the basis it did not have for ranking two authored claims: between two
      // boxes that both claim the field, the one with no voices is the likelier brain. That
      // promotes the Hapax over the Tracker Mini, and this box over the Tracker Mini too — but
      // the Hapax and this box are both voiceless, so between *them* the keys below decide, and
      // `midi-din` beats `usb`. The lesson is unchanged and the winner is not.
      const result = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 18 })
      expect(result.clockSource?.deviceId).toBe('squarp-hapax')
      expect(result.clockSource?.transport).toBe('midi-din')
      // Not because this box was demoted: strip every other claim and it leads again. Two have
      // to come off — the Hapax outranks it on transport, and the Tracker Mini would win the
      // fall-through if the Hapax were absent and this box's `usb` were the only alternative.
      const soleClaim = DEVICES.map((d) =>
        d.id === 'polyend-tracker-mini' || d.id === 'squarp-hapax'
          ? { ...d, clock: { ...d.clock, preferredSource: undefined } }
          : d,
      )
      expect(selectClockSource(soleClaim, new Map())?.deviceId).toBe(device.id)
    })

    it('says so in the guide, and still exempts the boxes that cannot follow', () => {
      const doc = renderGuide(resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 18 }))
      expect(doc).toContain('**Clock source** — Hapax over `midi-din`')
      // §7.4's exemption clause, which must survive the source moving. Asserted against the boxes
      // that are actually deaf rather than against a remembered list.
      for (const deaf of DEVICES.filter((d) => !d.clock.canReceiveClock)) {
        expect(doc, deaf.id).toContain(deaf.name)
      }
      expect(doc).toContain('cannot receive clock')
    })

    it('sends and receives on the two transports it has without an accessory', () => {
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['usb', 'analog-clock'])
    })

    it('omits midi-din, because every MIDI socket it can reach is an accessory', () => {
      // **p.179 gives three ways to get MIDI in or out, and all three are things you buy**: a USB
      // Micro Extender module, the Metropolix Solo Kit (TRS Type-A jacks), or the Metropolix
      // Backpack (a 10-pin connector to an Intellijel case's DIN sockets). `transport` describes
      // the box a person owns, not the box plus a shopping list.
      expect(device.clock.transport).not.toContain('midi-din')
      // The distinction is real rather than a technicality: it costs this device the transport
      // tie-break against every other clock-capable box in the library — including, since #80,
      // the one other box that claims the same preference, which is why the full rig no longer
      // resolves here.
      const others = DEVICES.filter((d) => d.id !== device.id && d.clock.canSendClock)
      // The DFAM is excluded by the same reasoning as the case above: `analog-clock` is its only
      // transport, it is unranked by `TRANSPORT_PREFERENCE`, and it therefore cannot outrank this
      // module's `usb` on the transport key whatever else is true of it.
      expect(
        others.filter((d) => !d.clock.transport.includes('midi-din')).map((d) => d.id),
      ).toEqual(['moog-dfam'])
      // Without the authored preference it would lose the rig on exactly that.
      const unclaimed = { ...device, clock: { ...device.clock, preferredSource: undefined } }
      const rig = DEVICES.map((d) => (d.id === device.id ? unclaimed : d))
      expect(selectClockSource(rig, new Map())?.deviceId).not.toBe(device.id)
    })
  })

  // -------------------------------------------------------------------------
  // §2.3 — the per-stage vocabulary, declared and currently unreachable
  // -------------------------------------------------------------------------

  it('names the eight per-stage lanes the manual names, in panel order', () => {
    // p.17 callout 8 silkscreens them left to right; p.32 names them in prose: "GATE override;
    // PITCH override; RATCHet count; PROBability of playback; ACCUMulated transposition, and a
    // dedicated CV lane. Each stage also has a SKIP feature, and a pitch SLIDE option."
    expect(device.features?.perStep).toEqual([
      'slide',
      'skip',
      'pitch',
      'gate',
      'ratch',
      'prob',
      'accum',
      'cv',
    ])
    // **A per-device open list (§2.3), and this one overlapped the rest of the library by nothing
    // at all until the DFAM arrived.** On the drum machines a per-step lane is `velocity`,
    // `accent`, `substep`, `flam`; here it is an override of the pitch and gate the sequencer
    // itself generates — no key in common, which was the clearest evidence the field was right to
    // be open rather than a fifth shared vocabulary.
    //
    // **`pitch` is now shared with exactly one other box, and the reason is real.** The DFAM is
    // the library's second analog step sequencer, and its eight steps have a PITCH knob each
    // (p.22 of that manual) — the same idea as this module's per-step pitch override, arrived at
    // independently and named the same thing. That is what an open list is *supposed* to do when
    // two boxes genuinely share a concept: it lets them agree without anyone having to promote
    // the word into shared vocabulary. `gate` is still this module's alone.
    const others = new Set(
      DEVICES.filter((d) => d.id !== device.id).flatMap((d) => d.features?.perStep ?? []),
    )
    expect(others.size).toBeGreaterThan(10)
    expect((device.features?.perStep ?? []).filter((k) => others.has(k))).toEqual(['pitch'])
    const dfam = DEVICES.find((d) => d.id === 'moog-dfam')
    expect(dfam?.features?.perStep).toContain('pitch')
    expect(dfam?.features?.perStep).not.toContain('gate')
  })

  it('cannot turn any of those lanes into an instruction, and the manifest says so', () => {
    // **The honest gap.** `perStep` exists so a recipe's `articulation` can name a lane the box
    // has. Every other manifest declaring one has recipes using it — the MC-101's own test calls
    // an unreached lane "a claim about the box that no guide ever shows". With no recipes, all
    // eight of these are exactly that: true about the hardware, and unable to reach a guide.
    expect(device.recipes).toHaveLength(0)
    const used = device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set)))
    expect(used).toEqual([])
    expect(device.features?.perStep?.length).toBe(8)
    // **Every device that declares lanes *and has recipes* reaches at least one of them**, which
    // is the rule this ever stated. It used to be written as "every device except this one",
    // and the Hapax made the exception list the wrong shape: it is the second voiceless
    // sequencer, it declares the eight per-note parameters p.47 names, and it can no more reach
    // them than this box can. The condition below says why rather than naming ids.
    for (const other of DEVICES.filter(
      (d) => (d.features?.perStep ?? []).length > 0 && d.recipes.length > 0,
    )) {
      const reached = other.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set)))
      expect(reached.length, other.id).toBeGreaterThan(0)
    }
  })

  it('declares no hints, because hints exist to be referenced by recipes', () => {
    // Unchanged reasoning, and the half of the old pair that is still true: there are no recipes,
    // so a hints table would be a list nothing can point at — the same call the LiveTrak L-8 and
    // the Euroburo record.
    expect(device.hints).toBeUndefined()
  })

  it('declares the two track sections and nothing else, now that routing points at jacks', () => {
    // `jacks` was absent on the same argument as `hints` until inter-device routing (§3.3) started
    // reading pitch and gate sockets with no recipe anywhere in sight. This box's entire job is to
    // be that source, so the reason expired rather than being overruled.
    //
    // Four jacks, not twelve: §3.3 declares sections whole, and these are `TRK 1` and `TRK 2`
    // whole. The other eight wait for something to point at them — see the module JSDoc for the
    // `CLK` naming decision that blocks two of them.
    expect(device.jacks?.map((j) => j.id)).toEqual([
      'TRK 1 · PITCH',
      'TRK 1 · GATE',
      'TRK 2 · PITCH',
      'TRK 2 · GATE',
    ])

    // Single-kind, which is what lets them be a primary voice-control bundle at all: a 1V/oct
    // output is `pitch-cv` and nothing else, a +5V gate is `gate` and nothing else (p.18).
    expect(device.jacks?.map((j) => j.signal)).toEqual([
      ['pitch-cv'],
      ['gate'],
      ['pitch-cv'],
      ['gate'],
    ])
    expect(device.jacks?.every((j) => j.direction === 'out')).toBe(true)

    // The id is the silkscreen (§3.3), and the panel prints `TRK 1` as a column header over a bare
    // `PITCH`. The manual's prose says `TRACK 1 PITCH OUT` — spelled out, with a suffix the panel
    // does not carry — and that string is deliberately not the id.
    expect(JSON.stringify(device.jacks)).not.toContain('TRACK 1')
    expect(JSON.stringify(device.jacks)).not.toContain('PITCH OUT')
  })

  it('addresses no steps and authors no patterns (§4.3)', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
    expect(source).not.toContain('"articulation"')
  })
})
