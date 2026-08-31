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
import { device } from '../lib/devices/squarp-hapax/index'
import { device as metropolix } from '../lib/devices/intellijel-metropolix/index'
import { device as trackerMini } from '../lib/devices/polyend-tracker-mini/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { rackModel } from '../components/rack/model'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Hapax is the library's **second** voiceless sequencer, which makes this file a different
 * kind of test from `intellijel-metropolix.test.ts`. That one is where three engine changes met a
 * real manifest for the first time. This one asks whether they generalise: nothing in the engine
 * moved for this device, and the assertions below are the evidence.
 *
 * Where it goes further than the Metropolix does, it is in three places and all three are about
 * documents rather than code — a `preferredSource` the manual states in its own words rather than
 * leaving to be inferred, a `sourceSetup` on every one of three transports, and a panel measured
 * off a figure drawn at an angle.
 */

const MANUAL = 'Hapax Manual (22 June 2026), p.'
const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

describe('Hapax manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('squarp-hapax')
    expect(device.maker).toBe('Squarp Instruments')
    expect(device.kind).toBe('sequencer')
  })

  // -------------------------------------------------------------------------
  // §2.4 — thirty-two tracks and zero assignables
  // -------------------------------------------------------------------------

  it('contributes zero assignables, however many tracks the two projects have', () => {
    // Two projects of sixteen tracks each (p.9). Modelling them as voices would put up to
    // thirty-two assignables into every search on this rig and let the resolver put a kick "on
    // the Hapax" — a box with no sound engine at all.
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

    /**
     * Swept against a **small rig rather than the whole library**, for the reason set out at
     * length in `test/intellijel-metropolix.test.ts`: with thirty-six other boxes on the bench the
     * resolver is never tempted, so the sweep proves this box was not *needed* rather than that it
     * was not *usable*. Cut to three boxes and the pressure is on. The A/B above still makes the
     * whole-library claim exactly. It was 21 full-library resolves under the default 30s timeout.
     */
    const pressured = DEVICES.filter((d) =>
      [device.id, 'roland-tr-1000', 'synthstrom-deluge'].includes(d.id),
    )
    for (const t of TEMPLATES) {
      for (const seed of [1, 7, 18]) {
        const r = resolve({ devices: pressured, template: t, mood: NEUTRAL_MOOD, seed })
        expect(r.assignments.some((x) => x.deviceId === device.id), `${t.id}/${seed}`).toBe(false)
      }
    }
  })

  it('has no parameter to be wrong about, and every capability fact answered', () => {
    const audit = auditDevice(device)
    expect(audit.counts.params).toBe(0)
    // The only findings are the six negatives, which the audit lists because a reasoned
    // non-claim is worth reading — not because anything is unresolved. Nothing is `unchecked`,
    // `undocumented` or `unread`: 32 capability facts, 26 cited and 6 cited against.
    expect([...new Set(audit.findings.map((f) => f.kind))]).toEqual(['cited-against-capability'])
    expect(audit.findings).toHaveLength(6)
  })

  it('declares no content, and says why rather than leaving the question open', () => {
    // Absence of `content` is the fourth state and means nobody established the answer, which
    // `contentNotice` turns into a sentence the reader sees. Here somebody did establish it, so
    // the reason lives at the `content` path — the same slot `unknown` and `unread` use, in the
    // one of the three states that carries a page.
    expect(device.content).toBeUndefined()
    const evidence = device.capabilityEvidence?.['content']
    expect(evidence).toMatchObject({ kind: 'cited-against' })
    // Nothing can render a content notice on this box in any case: it holds no part, so no
    // recipe of its own ever reaches the renderer with `sourceAudio` on it.
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

  // -------------------------------------------------------------------------
  // §2.3/§2.6 — no audio path, and the negatives carry pages
  // -------------------------------------------------------------------------

  it('declares no audio path and no content, and cites the pages that answer no', () => {
    expect(device.io).toEqual({ main: 'none', individualOuts: 0, audioIn: false, usbAudio: false })

    // #120's `cited-against`: §1.24 does not fail to say whether this box makes a sound, it
    // enumerates the whole back panel and no socket on it is audio. A negative with a page is a
    // finding rather than a gap, which is why these are not `unknown`.
    // `content` is here for a reason the schema states outright: a citation on that path with no
    // `content` declared is refused with "a reading that supports no claim is 'cited-against'".
    // The question §2.6/#111 asks is what audio this box plays, and the answer is none.
    const negatives = ['io.main', 'io.individualOuts', 'io.audioIn', 'io.usbAudio', 'voices', 'content']
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
    const block = doc.slice(doc.indexOf('- **Hapax**'))
    const ownLines = block.split('\n').slice(0, 4).join('\n')
    expect(block.startsWith('- **Hapax** — sequencer')).toBe(true)
    expect(ownLines).not.toContain('main out')
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
  // §7.4 — the clock claim, and the sentence behind it
  // -------------------------------------------------------------------------

  describe('clock (§7.4)', () => {
    it('sends and receives on all three transports', () => {
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock'])
      // Symmetric, so neither direction list is declared — both would restate `transport`.
      expect(device.clock.sendTransport).toBeUndefined()
      expect(device.clock.receiveTransport).toBeUndefined()
    })

    it('claims the preference against a page that names the job rather than the capability', () => {
      // p.130's CLOCK SOURCE table: "INTERNAL — Hapax will use its internal clock (to be the
      // synchronisation leader)." §7.4 asks a manifest for a topology judgement and warns that a
      // `canSendClock` page must not stand in for one. All three claims in the library rest on a
      // role sentence rather than a capability; this is the one whose sentence uses the word.
      expect(device.clock.preferredSource).toBe(true)
      expect(device.capabilityEvidence?.['clock.preferredSource']).toEqual({
        kind: 'manual',
        source: `${MANUAL}130`,
      })
      // And it is not the same page as the send capability's, which would be the failure §7.4
      // names: p.132 is Sync output, and that proves only that the box can.
      expect(device.capabilityEvidence?.['clock.canSendClock']).toEqual({
        kind: 'manual',
        source: `${MANUAL}132`,
      })
    })

    it('led the whole library until a voiceless claimant sorted before it', () => {
      // #198 gave §7.4 a basis for ranking claimants: between two of them, the one with no voices
      // is the likelier brain, because clock and sequencing are the only thing it can contribute.
      // That puts this box and the Metropolix above the Tracker Mini, and between the two
      // voiceless ones `midi-din` beats the Metropolix's `usb`. On those two keys this box is
      // still unbeaten.
      //
      // **The eighth claimant is the first one to take the library off it, and it did so on the
      // bottom key alone.** The Seq is voiceless and carries `midi-din`, so it is level with this
      // box on everything #198 ranks and the tie falls to `compareCodeUnits`, where `polyend-`
      // sorts before `squarp-`. That is a rig's clock chosen alphabetically — the exact thing
      // #198 was written to stop happening between a Hapax and a Tracker Mini, reappearing one
      // key lower between two boxes #198 cannot separate. Recorded here rather than smoothed
      // over: this assertion is the one that will notice if the bottom key is ever given a
      // reason instead of an ordering.
      const source = selectClockSource(DEVICES, new Map())
      expect(source?.deviceId).toBe('polyend-seq')
      // Take the Seq out and this box leads again, which is what says it lost on the tie-break
      // rather than on any of the keys above it.
      const withoutSeq = DEVICES.filter((d) => d.id !== 'polyend-seq')
      expect(selectClockSource(withoutSeq, new Map())?.deviceId).toBe(device.id)
      expect(source?.transport).toBe('midi-din')
      expect(source?.occupiedAssignables).toBe(0)
      // The Tracker Mini loses on the voiceless key rather than on transport — it has `midi-din`
      // too, so nothing below the claim would have separated them.
      expect(trackerMini.clock.transport).toContain('midi-din')
      expect(trackerMini.voices.length).toBeGreaterThan(0)
      // The Metropolix loses on transport, the tie-break §7.4 intends between two boxes that are
      // both authored as leaders and both carry no parts.
      expect(metropolix.voices).toEqual([])
      expect(metropolix.clock.transport).not.toContain('midi-din')
    })

    it('names a menu path for every transport, because every port ships silent', () => {
      // §7.4/#104's case, three times over: MIDI A-D, both USB ports and all four gate outputs
      // default to `––` and emit nothing until Sync output is set. A guide that named this box as
      // the clock source without the path would stall every phase after it.
      const setups = device.clock.sourceSetup ?? []
      expect(setups.map((s) => s.transport)).toEqual(['midi-din', 'usb', 'analog-clock'])
      for (const setup of setups) {
        // The box's own words, on a screen the reader is looking at.
        expect(setup.path, setup.transport).toContain('settings > sync output')
        expect(setup.note, setup.transport).toBeDefined()
        // §2.6 requires the page, and the schema refuses a setup without one.
        expect(device.capabilityEvidence?.[clockSourceSetupFact(setup.transport)]).toMatchObject({
          kind: 'manual',
        })
      }
      expect(setups.filter((s) => s.value === 'CLOCK+TRANSPORT')).toHaveLength(2)
    })
  })

  // -------------------------------------------------------------------------
  // §3.3 — the back panel, whole
  // -------------------------------------------------------------------------

  describe('jacks (§3.3)', () => {
    it('declares the whole back panel the two connectivity figures label', () => {
      expect(device.jacks?.map((j) => j.id)).toEqual([
        'midi in A',
        'midi in B (trs)',
        'Cv in 1',
        'Cv in 2',
        'usb device',
        'usb host',
        'midi out A',
        'midi out B',
        'midi out C',
        'midi out D (trs)',
        'Cv out 1',
        'Cv out 2',
        'Cv out 3',
        'Cv out 4',
        'gate out 1',
        'gate out 2',
        'gate out 3',
        'gate out 4',
      ])
      // Every one carries its page, which the schema requires and which is the whole of §2.6's
      // move away from page numbers in comments.
      for (const jack of device.jacks ?? []) {
        expect(device.capabilityEvidence?.[jackFact(jack.id)], jack.id).toMatchObject({
          kind: 'manual',
        })
      }
    })

    it('is a pitch-and-gate source four times over, which is what routing reads', () => {
      // Four CV/gate pairs (p.90's OUTPUT PORT row addresses them as CV 1-4 and GATE 1-4). Both
      // are single-kind, which is what lets them be a primary voice-control bundle at all.
      const cv = (device.jacks ?? []).filter((j) => j.signal.includes('pitch-cv'))
      const gate = (device.jacks ?? []).filter((j) => j.id.startsWith('gate out'))
      expect(cv).toHaveLength(4)
      expect(gate).toHaveLength(4)
      expect(cv.every((j) => j.direction === 'out' && j.signal.length === 1)).toBe(true)
    })

    it('names one socket per transport per direction, and says what the others are', () => {
      // The schema allows exactly one, because the rack draws one — and on this box the
      // alternative is always another real socket rather than a menu, so each one says so.
      const carriers = (device.jacks ?? []).filter((j) => j.clock !== undefined)
      expect(
        carriers.map((j) => `${j.direction}:${(j.clock ?? []).join(',')}:${j.id}`).sort(),
      ).toEqual([
        'in:analog-clock:Cv in 1',
        'in:midi-din:midi in A',
        'in:usb:usb device',
        'out:analog-clock:gate out 1',
        'out:midi-din:midi out A',
        'out:usb:usb host',
      ])
      for (const jack of carriers) {
        expect(jack.signal, jack.id).toContain('clock')
        expect(jack.note, jack.id).toBeDefined()
      }
    })

    it('leaves the footswitch socket undeclared, because no page names it', () => {
      // §11.5 (p.140) assigns commands to PEDAL (TIP) and PEDAL (RING), so the jack exists —
      // and neither connectivity figure labels it. §3.3 wants the silkscreen; there is none to
      // read, so nothing is invented (invariant 5).
      expect(JSON.stringify(device.jacks)).not.toContain('pedal')
      expect(JSON.stringify(device.jacks)).not.toContain('PEDAL')
    })

    it('declares no MIDI input C or D, whatever p.90 lists', () => {
      // The manual contradicts itself: p.90's INPUT PORT row offers MIDI A, B, C and D, and §1.24
      // says twice that there are four inputs — in A, in B, usb host, usb device — with the input
      // strip on p.27 drawing two MIDI sockets. The figures win; `index.ts` records the
      // disagreement rather than smoothing it over.
      const ins = (device.jacks ?? []).filter((j) => j.direction === 'in' && j.id.startsWith('midi'))
      expect(ins.map((j) => j.id)).toEqual(['midi in A', 'midi in B (trs)'])
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, measured off a figure drawn at an angle
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    it('cites its span to the maker, because no page in either document prints one', () => {
      // The OP-XY's case in a sharper form: there a store figure was corroborated by a measured
      // plan-view aspect to 1%, and here no drawing can corroborate anything, because a parallel
      // projection foreshortens the two axes by different amounts. So the number stands on the
      // inch conversion printed beside it.
      //
      // #191: that is a reading somebody did, not an absence. `false` claimed nobody had checked,
      // where the truth is that what they checked was not a manual. `maker` says which.
      expect(device.physical.panelSpanMm).toBe(358)
      expect(device.physical.verified).toMatchObject({ kind: 'maker' })
      // The source names the disagreement rather than hiding it, so the next reader meets the
      // 385 figure with the reason it was rejected already attached.
      const verified = device.physical.verified
      if (verified === false) throw new Error('expected a citation')
      expect(verified.source).toContain('385')
    })

    it('cites the Quickstart rather than the manual, which has no panel figure', () => {
      expect(device.panel?.verified).toMatchObject({
        kind: 'manual',
        source: expect.stringContaining('Quickstart'),
      })
      expect(device.panel?.panelRiseMm).toBe(206)
    })

    it('lands the matrix on a 16 x 8 grid of near-square pads, which is the frame checking itself', () => {
      // The mapping was pinned from the panel outline and the published footprint, and neither
      // input said anything about pads. Carried through it, the 128 matrix pads come out as 16
      // columns and 8 rows of a cell 16.4 x 15.5 mm — a frame wrong in either span would have
      // produced pads of the wrong shape.
      const matrix = (device.panel?.features ?? []).find(
        (f) => f.kind === 'grid' && f.cols === 16 && f.rows === 8,
      )
      expect(matrix).toBeDefined()
      if (matrix === undefined || matrix.kind !== 'grid') throw new Error('no matrix')
      const cellW = matrix.w / matrix.cols
      const cellH = matrix.h / matrix.rows
      expect(cellW).toBeCloseTo(16.4, 1)
      expect(cellH).toBeCloseTo(15.5, 1)
      expect(Math.abs(cellW - cellH)).toBeLessThan(1.5)
    })

    it('draws nine encoders and two identical screens', () => {
      const features = device.panel?.features ?? []
      expect(features.filter((f) => f.kind === 'knob')).toHaveLength(9)
      const screens = features.filter((f) => f.kind === 'screen')
      expect(screens).toHaveLength(2)
      // The same part twice, which is what the measurement found and what the box has.
      const [left, right] = screens
      if (left?.kind !== 'screen' || right?.kind !== 'screen') throw new Error('no screens')
      expect(left.w).toBeCloseTo(right.w, 5)
      expect(left.h).toBeCloseTo(right.h, 5)
    })

    it('keeps every drawn feature inside the panel', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(358)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(206)
      }
    })
  })

  // -------------------------------------------------------------------------
  // §2.3 — the per-note lanes, declared and unreachable
  // -------------------------------------------------------------------------

  it('names the eight per-note parameters the manual names, and can reach none of them', () => {
    // p.47: "Each note event includes its own set of 8 parameters : Note & Octave, Velocity,
    // Length, μTime, Chance, Roll, Math." Seven names over eight encoders, because pitch and
    // octave take one each.
    expect(device.features?.perStep).toEqual([
      'pitch',
      'octave',
      'velocity',
      'length',
      'utime',
      'chance',
      'roll',
      'math',
    ])
    expect(device.capabilityEvidence?.['features.perStep']).toEqual({
      kind: 'manual',
      source: `${MANUAL}47`,
    })
    // The same honest gap the Metropolix records: `perStep` exists to be named by a recipe's
    // `articulation`, and a box with no recipes can never name one. It is here because the
    // alternative is a manifest that silently knows less than the manual.
    expect(device.recipes).toHaveLength(0)
  })
})
