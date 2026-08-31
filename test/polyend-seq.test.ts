import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  clockSourceSetupFact,
  expand,
  jackFact,
  renderGuide,
  resolve,
  selectClockSource,
} from '../lib/core/index'
import { device } from '../lib/devices/polyend-seq/index'
import { device as hapax } from '../lib/devices/squarp-hapax/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { rackModel } from '../components/rack/model'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Seq is the library's **fourth** voiceless sequencer, and the fourth reading of `kind:
 * 'sequencer'` that changed nothing in the engine. What it adds to the three files beside it is
 * in four places, and every one is about a document rather than about code:
 *
 *  - **a manual that narrates the absence** the kind depends on. The Metropolix rests on a
 *    definition, the Hapax on two connectivity figures, the T-1 on one sentence; this one has all
 *    of that *and* p.10's account of the CV outputs being designed in and taken back out to become
 *    a separate module. The box does not merely fail to make a sound — it was made not to.
 *  - **a clock output that is a property of a track rather than of a port.** `Out1` and `Out1+Clk`
 *    are one setting apart on the same row and both look right, which is the sharpest form of the
 *    case #104 added `sourceSetup` for.
 *  - **a panel figure whose aspect check has two numbers to choose between, in the specification
 *    line's own words**: p.14 calls 145 mm the width and 600 mm the length.
 *  - **a claimant that actually moved a rig's clock.** Seven boxes have claimed `preferredSource`
 *    without disturbing the ordering; this one takes the whole library off the Hapax on the bottom
 *    key alone. That is asserted here and from the other end in `test/squarp-hapax.test.ts`.
 */

const MANUAL = 'Polyend Seq Manual 2.2.6'
const SPAN = 600
const RISE = 145

const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

describe('Seq manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('polyend-seq')
    expect(device.name).toBe('Seq')
    expect(device.maker).toBe('Polyend')
    expect(device.kind).toBe('sequencer')
    expect(device.manual).toEqual({ title: 'Polyend Seq Manual', edition: 'Version 2.2.6' })
  })

  it('belongs in the sequencer roster on three readings that agree (§2.3)', () => {
    // The kind is not a guess about a box that happens to have a grid on it. Three independent
    // readings say the same thing, and this test is the one place they are held together.
    //
    //  1. **Its tracks emit control data.** p.5's `Channel out` sets a track to a MIDI channel and
    //     `MIDI Out` sets it to a port — `Out1`, `Out2` or `USB` — so a track is a stream going
    //     out a socket to whatever is patched there.
    //  2. **Its CV outputs were removed.** p.10: the eight CV channels of gate, pitch, velocity
    //     and modulation were designed onto the back panel and taken back out of the housing to
    //     become Poly, a separate Eurorack module.
    //  3. **It generates no audio.** p.3 enumerates the back panel and p.2 photographs it; every
    //     socket carries MIDI, a switch closure or power.
    expect(device.kind).toBe('sequencer')
    expect(device.io.main).toBe('none')
    expect((device.jacks ?? []).some((j) => j.signal.includes('audio'))).toBe(false)
    expect((device.jacks ?? []).some((j) => j.signal.includes('pitch-cv'))).toBe(false)
    // `groovebox` would imply self-contained sound generation and `sampler` a sound to load;
    // both would make this manifest state something false.
    expect(DEVICES.filter((d) => d.kind === 'sequencer').map((d) => d.id)).toEqual([
      'intellijel-metropolix',
      'polyend-seq',
      'squarp-hapax',
      'torso-t1',
    ])
  })

  // -------------------------------------------------------------------------
  // §2.4 — eight tracks under a 256-key grid, and zero assignables
  // -------------------------------------------------------------------------

  it('contributes zero assignables, however many tracks the grid has', () => {
    // Eight tracks of thirty-two steps (p.3). Modelling them as voices would put eight
    // assignables into every search on this rig and let the resolver put a kick "on the Seq" —
    // a box with no sound engine at all.
    expect(device.voices).toEqual([])
    expect(device.recipes).toEqual([])
    expect(expand(device)).toHaveLength(0)

    // The claim that matters is about the *rig*: adding this box must not move a single part.
    const without = DEVICES.filter((d) => d.id !== device.id)
    const a = resolve({ devices: without, template, mood: NEUTRAL_MOOD, seed: 1 })
    const b = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
    const placements = (r: typeof a) =>
      r.assignments
        .map((x) => `${x.requestId}:${x.deviceId}:${x.assignables.map((v) => v.voiceId).join('+')}`)
        .sort()
    expect(placements(b)).toEqual(placements(a))

    // Swept against a small rig rather than the whole library, for the reason set out at length
    // in `test/intellijel-metropolix.test.ts`: with forty-five other boxes on the bench the
    // resolver is never tempted, so a full-library sweep proves this box was not *needed* rather
    // than that it was not *usable*. Cut to three and the pressure is on.
    const pressured = DEVICES.filter((d) =>
      [device.id, 'roland-tr-1000', 'synthstrom-deluge'].includes(d.id),
    )
    for (const t of TEMPLATES) {
      for (const seed of [1, 7, 18]) {
        const r = resolve({ devices: pressured, template: t, mood: NEUTRAL_MOOD, seed })
        expect(
          r.assignments.some((x) => x.deviceId === device.id),
          `${t.id}/${seed}`,
        ).toBe(false)
      }
    }
  })

  it('has no parameter to be wrong about, and every capability fact answered', () => {
    const audit = auditDevice(device)
    expect(audit.counts.params).toBe(0)
    // The only findings are the six negatives, which the audit lists because a reasoned non-claim
    // is worth reading — not because anything is unresolved. Nothing is `unchecked`,
    // `undocumented` or `unread`: 19 capability facts, 13 cited and 6 cited against.
    expect([...new Set(audit.findings.map((f) => f.kind))]).toEqual(['cited-against-capability'])
    expect(audit.findings).toHaveLength(6)
  })

  it('declares no content, and says why rather than leaving the question open', () => {
    // Absence of `content` is the fourth state and means nobody established the answer, which
    // `contentNotice` turns into a sentence the reader sees. Here somebody did establish it, so
    // the reason lives at the `content` path — the one of the three states that carries a page.
    expect(device.content).toBeUndefined()
    expect(device.capabilityEvidence?.['content']).toMatchObject({ kind: 'cited-against' })
    expect(device.recipes.some((r) => r.sourceAudio !== undefined)).toBe(false)
  })

  it('declares no hints, because hints exist to be referenced by recipes', () => {
    expect(device.hints).toBeUndefined()
  })

  it('addresses no steps and authors no patterns (§4.3)', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
    expect(source).not.toContain('"articulation"')
  })

  it('omits noteDuration for an architectural reason, and claims no evidence for the omission', () => {
    // p.8 answers *yes* — a per-step `Length` and a track `Gate mode` from 5% to 100% — so a
    // `cited-against` entry here would be false and an `unknown` one a lie. The field is absent
    // because it is only ever read for a part a device carries and this box carries none, which
    // is a decision the module JSDoc records rather than a reading that ran out. All three
    // neighbouring sequencers omit it the same way.
    expect(device.noteDuration).toBeUndefined()
    expect(device.capabilityEvidence?.['noteDuration']).toBeUndefined()
    expect(hapax.noteDuration).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // §2.3/§2.6 — no audio path, and the negatives carry pages
  // -------------------------------------------------------------------------

  it('declares no audio path and no content, and cites the pages that answer no', () => {
    expect(device.io).toEqual({ main: 'none', individualOuts: 0, audioIn: false, usbAudio: false })

    // #120's `cited-against`: p.3 does not fail to say whether this box makes a sound, it
    // enumerates the whole back panel and no socket on it is audio. A negative with a page is a
    // finding rather than a gap, which is why these are not `unknown`.
    const negatives = [
      'io.main',
      'io.individualOuts',
      'io.audioIn',
      'io.usbAudio',
      'voices',
      'content',
    ]
    for (const path of negatives) {
      const evidence = device.capabilityEvidence?.[path]
      expect(evidence, path).toMatchObject({ kind: 'cited-against' })
      if (evidence !== undefined && evidence !== false && evidence.kind === 'cited-against') {
        expect(evidence.reason.length, path).toBeGreaterThan(20)
        expect(evidence.cite.source, path).toContain(MANUAL)
      }
    }
  })

  it('says "no audio I/O" in the guide rather than naming a bus', () => {
    const doc = renderGuide(resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 }))
    const block = doc.slice(doc.indexOf('- **Seq**'))
    expect(block.startsWith('- **Seq** — sequencer')).toBe(true)
    expect(block.split('\n').slice(0, 4).join('\n')).not.toContain('main out')
  })

  it('draws no audio jack and no voice field on the rack', () => {
    const result = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
    const panel = rackModel(result).panels.find((p) => p.deviceId === device.id)
    expect(panel).toBeDefined()
    expect(panel?.jacks.filter((j) => j.kind === 'main-out')).toEqual([])
    expect(panel?.jacks.filter((j) => j.kind === 'individual-out')).toEqual([])
    expect(panel?.banks.flatMap((b) => b.cells)).toEqual([])
    expect(device.panel?.features.filter((f) => f.kind === 'voices')).toEqual([])
  })

  // -------------------------------------------------------------------------
  // §7.4 — the clock claim, and the setting that is per track
  // -------------------------------------------------------------------------

  describe('clock (§7.4)', () => {
    it('sends and receives on the two transports the back panel has', () => {
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['midi-din', 'usb'])
      // Symmetric, so neither direction list is declared — both would restate `transport`.
      expect(device.clock.sendTransport).toBeUndefined()
      expect(device.clock.receiveTransport).toBeUndefined()
      // No analog clock, and that is the CV side of the box which became Poly (p.10).
      expect(device.clock.transport).not.toContain('analog-clock')
    })

    it('claims the preference against a page that names the job rather than the capability', () => {
      // p.10: "Remember that the Seq can be the heart of a sophisticated hardware rig, but will
      // also do great with a favorite DAW." §7.4 asks a manifest for a topology judgement and
      // warns that a `canSendClock` page must not stand in for one.
      expect(device.clock.preferredSource).toBe(true)
      expect(device.capabilityEvidence?.['clock.preferredSource']).toEqual({
        kind: 'manual',
        source: `${MANUAL}, p.10`,
      })
      // And it is not the same page as the send capability's, which would be the failure §7.4
      // names: p.5 is the MIDI Out row, and that proves only that the box can.
      expect(device.capabilityEvidence?.['clock.canSendClock']).toEqual({
        kind: 'manual',
        source: `${MANUAL}, p.5`,
      })
    })

    it('takes the whole library off the Hapax, on the bottom key alone', () => {
      // **This is the first claimant that moved a rig's clock**, and it is worth reading twice
      // rather than absorbing. #198 ranks claimants by voicelessness, then transport, then id.
      // This box and the Hapax are level on both real keys — both voiceless, both `midi-din` —
      // so it falls to `compareCodeUnits`, where `polyend-` sorts before `squarp-`. That is a
      // rig's clock chosen alphabetically: exactly what #198 was written to stop happening
      // between a Hapax and a Tracker Mini, reappearing one key lower between two boxes #198 has
      // no basis to separate.
      const source = selectClockSource(DEVICES, new Map())
      expect(source?.deviceId).toBe(device.id)
      expect(source?.transport).toBe('midi-din')
      expect(source?.claims).toBe(8)
      expect(source?.occupiedAssignables).toBe(0)

      // The two keys above the tie-break are genuinely level, which is what makes the sentence
      // above true rather than a guess at why.
      expect(device.voices).toEqual(hapax.voices)
      expect(hapax.clock.transport).toContain('midi-din')
      expect(device.id < hapax.id).toBe(true)

      // Remove this box and the Hapax leads again — the claim is the tie-break's, not a demotion.
      const without = DEVICES.filter((d) => d.id !== device.id)
      expect(selectClockSource(without, new Map())?.deviceId).toBe(hapax.id)
    })

    it('names a path for both transports, because clock output is a track setting', () => {
      // §7.4/#104's case in its sharpest form. On this box clock output is not a port setting at
      // all: p.5's per-track `MIDI Out` row offers `Out1, Out2, USB, Out1+Clk, Out2+Clk, USB+Clk`,
      // so `Out1` and `Out1+Clk` are one setting apart and both look right. A reader told "Seq
      // over midi-din, sync everything else to it" and left to find that row gets a cable full of
      // notes and no tempo, with nothing on the panel to explain it.
      const setups = device.clock.sourceSetup ?? []
      expect(setups.map((s) => s.transport)).toEqual(['midi-din', 'usb'])
      expect(setups.map((s) => s.value)).toEqual(['Out1+Clk', 'USB+Clk'])
      for (const setup of setups) {
        // The path is a gesture rather than a menu tree, because p.1 says outright that this box
        // has no menus and p.5 says the Tempo knob is used *with the track buttons*.
        expect(setup.path, setup.transport).toContain('track button')
        expect(setup.note, setup.transport).toBeDefined()
        expect(
          device.capabilityEvidence?.[clockSourceSetupFact(setup.transport)],
          setup.transport,
        ).toMatchObject({ kind: 'manual' })
      }
    })

    it('carries the setup through to the guide, on the box that is now the source', () => {
      const doc = renderGuide(resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 }))
      expect(doc).toContain('**Clock source** — Seq over `midi-din`')
      expect(doc).toContain('On the Seq, set `Tempo knob + track button > MIDI Out` to `Out1+Clk`')
    })
  })

  // -------------------------------------------------------------------------
  // §3.3 — the back panel, whole
  // -------------------------------------------------------------------------

  describe('jacks (§3.3)', () => {
    it('declares the six signal sockets p.3 lists and p.2 photographs', () => {
      expect(device.jacks?.map((j) => j.id)).toEqual([
        'Footswitch',
        'MIDI Out 1',
        'MIDI Out 2',
        'MIDI Thru',
        'MIDI In',
        'USB',
      ])
      // Every one carries its page, which the schema requires and which is the whole of §2.6's
      // move away from page numbers in comments. Both pages, because the list and the photograph
      // are two readings of the same strip.
      for (const jack of device.jacks ?? []) {
        const evidence = device.capabilityEvidence?.[jackFact(jack.id)]
        expect(evidence, jack.id).toEqual({ kind: 'manual', source: `${MANUAL}, p.2, p.3` })
      }
    })

    it('declares nothing that is not a signal socket', () => {
      // p.3's list also names the hidden firmware button, the 5 V inlet and the power switch.
      // None of them is a hole a cable in this guide ever goes into.
      const ids = (device.jacks ?? []).map((j) => j.id).join(' ')
      expect(ids).not.toContain('5VDC')
      expect(ids).not.toContain('power')
      expect(ids).not.toContain('firmware')
      expect(device.jacks).toHaveLength(6)
    })

    it('is the library’s first pedal socket, and declares it because a page names it', () => {
      // The mirror image of the Hapax, which assigns commands to a pedal its figures never label
      // and therefore declares no socket at all (invariant 5). Here the name is on the panel in
      // the p.2 photograph and in the p.3 list, so there is nothing to invent.
      const pedal = (device.jacks ?? []).find((j) => j.id === 'Footswitch')
      expect(pedal).toMatchObject({ direction: 'in', signal: ['trigger'] })
      // A contact closing rather than a level held: p.3 gives it a single press and a double one.
      expect(pedal?.note).toContain('double press')
      expect(JSON.stringify(hapax.jacks).toLowerCase()).not.toContain('pedal')
    })

    it('names one socket per transport per direction, and says what the others are', () => {
      // The schema allows exactly one, because the rack draws one.
      const carriers = (device.jacks ?? []).filter((j) => j.clock !== undefined)
      expect(
        carriers.map((j) => `${j.direction}:${(j.clock ?? []).join(',')}:${j.id}`).sort(),
      ).toEqual(['in:midi-din:MIDI In', 'out:midi-din:MIDI Out 1', 'out:usb:USB'])
      for (const jack of carriers) {
        expect(jack.signal, jack.id).toContain('clock')
        expect(jack.note, jack.id).toBeDefined()
      }
      // `MIDI Out 2` is a real socket rather than a menu option, so the alternative is named on
      // the jack that holds the transport.
      expect(carriers.find((j) => j.id === 'MIDI Out 1')?.note).toContain('MIDI Out 2')
    })

    it('declares the one USB socket as an output, and says it runs both ways', () => {
      // The T-1's shape for the T-1's reason: the Hapax has two USB ports and can give one to
      // each direction, this box has one. `direction` takes one value and the one it is authored
      // for is the one `preferredSource` names.
      const usb = (device.jacks ?? []).find((j) => j.id === 'USB')
      expect(usb).toMatchObject({ direction: 'out', clock: ['usb'] })
      expect(usb?.note).toContain('bidirectional')
    })

    it('says the MIDI Thru is a hardware thru, because the name alone would mislead', () => {
      // p.9: "There is no MIDI soft thru implemented." So the socket forwards what arrives at
      // MIDI In and carries none of what the Seq sequences — the opposite of what a reader
      // reaching for a third output would assume, which is exactly what `note` is for.
      const thru = (device.jacks ?? []).find((j) => j.id === 'MIDI Thru')
      expect(thru).toMatchObject({ direction: 'out', signal: ['midi'] })
      expect(thru?.clock).toBeUndefined()
      expect(thru?.note).toContain('no MIDI soft thru')
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, and the aspect check that settles the specification line
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    it('reads the span off the drawing rather than off the specification’s axis words', () => {
      // p.14 calls 145 mm the *width* and 600 mm the *length*, which is `panelSpanMm`'s
      // documented trap from the other side. Authored off the word this box would sort near the
      // top of the span order in `registry-codegen.test.ts`, where a 145 mm box belongs and reads
      // as perfectly plausible.
      expect(device.physical.panelSpanMm).toBe(SPAN)
      expect(device.panel?.panelRiseMm).toBe(RISE)
      const verified = device.physical.verified
      if (verified === false) throw new Error('expected a citation')
      expect(verified.kind).toBe('manual')
      expect(verified.source).toContain('p.14')
      // The panel's own citation is the figure the coordinates were read off, not the spec line.
      expect(device.panel?.verified).toMatchObject({
        kind: 'manual',
        source: expect.stringContaining('p.3'),
      })
    })

    it('agrees with the drawn aspect, which is why the two figures are trustworthy', () => {
      // The frame was pinned at the border stroke centres, 2892.0 x 698.0 px = 4.1433, and
      // 600 / 145 = 4.1379. 0.13% apart, which picks 600 x 145 out of the specification line and
      // rejects the 43 mm height a careless reading would have taken for the rise.
      const drawn = 2892.0 / 698.0
      const stated = SPAN / RISE
      expect(Math.abs(drawn - stated) / stated).toBeLessThan(0.002)
      expect(stated).toBeCloseTo(4.138, 3)
    })

    it('draws the four counts p.3 prints, none of which built the mapping', () => {
      const features = device.panel?.features ?? []
      // 8 function keys and 8 numbered track keys, drawn individually because the panel names
      // each of them; 6 clickable encoders; one 4-line TFT; one block of 32 x 8 step keys.
      expect(features.filter((f) => f.kind === 'button')).toHaveLength(16)
      expect(features.filter((f) => f.kind === 'knob')).toHaveLength(6)
      expect(features.filter((f) => f.kind === 'screen')).toHaveLength(1)
      expect(features.filter((f) => f.kind === 'grid')).toHaveLength(1)
      expect(features).toHaveLength(25)

      const labels = features
        .filter((f) => f.kind === 'button')
        .map((f) => (f.kind === 'button' ? f.label : undefined))
      expect(labels).toEqual([
        'Pattern',
        'Duplicate',
        'Quantize',
        'Random',
        'On/Off',
        'Clear',
        'Stop',
        'Play',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
      ])
      expect(
        features.filter((f) => f.kind === 'knob').map((f) => (f.kind === 'knob' ? f.label : '')),
      ).toEqual(['Tempo', 'Note', 'Velocity', 'Move', 'Length', 'Roll'])
    })

    it('lands the step block on 32 x 8 near-square keys, which is the frame checking itself', () => {
      // The mapping was pinned from the panel border and the specification line, and neither
      // input said anything about keys. Carried through it the block comes out 32 columns and 8
      // rows of a cell 13.1 x 14.4 mm — a frame wrong in either span would have produced keys of
      // the wrong shape.
      const grid = (device.panel?.features ?? []).find((f) => f.kind === 'grid')
      if (grid === undefined || grid.kind !== 'grid') throw new Error('no step grid')
      expect(grid.cols).toBe(32)
      expect(grid.rows).toBe(8)
      expect(grid.shape).toBe('pad')
      const cellW = grid.w / grid.cols
      const cellH = grid.h / grid.rows
      expect(cellW).toBeCloseTo(13.1, 1)
      expect(cellH).toBeCloseTo(14.4, 1)
      expect(Math.abs(cellW - cellH)).toBeLessThan(1.5)
    })

    it('draws every key at one size and every knob at one diameter', () => {
      // Two columns 136 mm apart, measured independently, coming out identical — the same kind of
      // self-check as the cell shape above.
      const buttons = (device.panel?.features ?? []).filter((f) => f.kind === 'button')
      const sizes = new Set(buttons.map((f) => (f.kind === 'button' ? `${f.w}x${f.h}` : '')))
      expect(sizes.size).toBe(1)
      const knobs = (device.panel?.features ?? []).filter((f) => f.kind === 'knob')
      expect(new Set(knobs.map((f) => (f.kind === 'knob' ? f.d : 0))).size).toBe(1)
    })

    it('ships no vendor artwork, and the logo it measured is the reason that needs saying', () => {
      // §10: reference, never asset. The drawing puts the Polyend logo — a `P` in a filled disc —
      // right of the screen at 128.6 x 19.5 mm. It was measured, identified and left out rather
      // than redrawn. The T-1's panel carries its logo as a `label` because that logo is a word.
      const text = JSON.stringify(device.panel?.features)
      expect(text).not.toContain('Polyend')
      expect(text).not.toContain('logo')
    })

    it('keeps every drawn feature inside the panel', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(SPAN)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(RISE)
      }
    })
  })

  // -------------------------------------------------------------------------
  // §2.3 — the per-step lanes, declared and unreachable
  // -------------------------------------------------------------------------

  it('names the twelve step parameters the manual names, and can reach none of them', () => {
    // The six knob sections each print a `Step parameters:` heading (pp.6-8); these are their
    // entries in the order those headings run.
    expect(device.features?.perStep).toEqual([
      'note',
      'chord',
      'transpose',
      'link to',
      'velocity',
      'modulation',
      'move',
      'nudge',
      'length',
      'roll',
      'velo curve',
      'note curve',
    ])
    expect(device.capabilityEvidence?.['features.perStep']).toEqual({
      kind: 'manual',
      source: `${MANUAL}, p.6, p.7, p.8`,
    })
    // The same honest gap the other three sequencers record: `perStep` exists to be named by a
    // recipe's `articulation`, and a box with no recipes can never name one. It is here because
    // the alternative is a manifest that silently knows less than the manual.
    expect(device.recipes).toHaveLength(0)
  })
})
