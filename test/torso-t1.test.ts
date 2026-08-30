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
import { device } from '../lib/devices/torso-t1/index'
import { device as hapax } from '../lib/devices/squarp-hapax/index'
import { device as minitaur } from '../lib/devices/moog-minitaur/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { rackModel } from '../components/rack/model'

/**
 * The T-1 is the library's **third** voiceless sequencer, and the first authored from a
 * documentation mirror rather than a PDF. So this file asks two different questions.
 *
 * The first is the Hapax's: does the shape generalise a third time with nothing in the engine
 * moving? It does, and the assertions below are the evidence.
 *
 * The second is new. `manuals/torso-t1/` is text, taken on a date, with **images dropped** — its
 * own README says a value that exists only in a picture is not in the mirror. Three facts here
 * came off the live figures instead, and the tests that pin them say which, because the failure
 * mode of a mirrored source is silence rather than an error.
 *
 * And one thing this box does *not* do is asserted as carefully as the things it does: it is not
 * offered as a source of pitch and gate for another box's voice, because its CV outputs are
 * function-switched. The last block is that claim and the engine finding underneath it.
 */

const DOCS = 'Torso T-1 docs, '
const FETCHED = ', fetched 2026-08-28'
const template = TEMPLATES[0]
if (template === undefined) throw new Error('no templates')

describe('T-1 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('torso-t1')
    expect(device.maker).toBe('Torso Electronics')
    expect(device.kind).toBe('sequencer')
  })

  it('dates every citation, because a live URL without one means nothing', () => {
    // `manuals/README.md` states the form for a source with no edition and no page: the path,
    // and the day the mirror was taken. A page can change under a citation that omits it, which
    // is the failure this shape exists to prevent — and it is the whole difference between this
    // device's provenance and a PDF's.
    const sources: string[] = []
    for (const evidence of Object.values(device.capabilityEvidence ?? {})) {
      if (evidence === false) continue
      if (evidence.kind === 'cited-against') sources.push(evidence.cite.source)
      else if (evidence.kind === 'manual' || evidence.kind === 'observed' || evidence.kind === 'maker')
        sources.push(evidence.source)
    }
    const physical = device.physical.verified
    if (physical === false) throw new Error('expected a citation')
    sources.push(physical.source)
    const panel = device.panel?.verified
    if (panel === undefined || panel === false) throw new Error('expected a panel citation')
    sources.push(panel.source)

    expect(sources.length).toBeGreaterThan(30)
    for (const source of sources) {
      expect(source, source).toContain(DOCS)
      expect(source, source).toContain('fetched 2026-08-28')
      // A path into the mirrored site, not a page number — there are no pages here.
      expect(source, source).toMatch(/, \/t1\/[a-z0-9/-]*\/, fetched/)
    }
  })

  // -------------------------------------------------------------------------
  // §2.4 — sixteen tracks and zero assignables
  // -------------------------------------------------------------------------

  it('contributes zero assignables, however many tracks a pattern has', () => {
    // Sixteen polyphonic tracks per pattern. A track is a MIDI channel and destination or a
    // CV/gate assignment; the sound is made by whatever is on the other end of the cable, and
    // modelling them as voices would let the resolver put a kick "on the T-1".
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

  it('addresses no steps and authors no patterns (§4.3)', () => {
    // The twenty-two-page parameter reference is a reference for this box's own sequencer, and
    // §4.3 makes the shape of a pattern the template's business. Nothing here is a step.
    //
    // **The panel is excluded, and that is not a loophole.** This box's first encoder is
    // silkscreened `steps`, so a substring search over the whole manifest matches a *drawing* of
    // a control rather than authored pattern data. The Hapax could assert over everything because
    // nothing on its panel is called that; searching a label here would be checking the wrong
    // claim and would pass or fail on the silkscreen.
    const source = JSON.stringify({ ...device, panel: undefined })
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
    expect(source).not.toContain('"articulation"')
    expect(device.hints).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // §2.3/§2.6 — no audio path, and the negatives carry pages
  // -------------------------------------------------------------------------

  it('declares no audio path and no content, and cites the pages that answer no', () => {
    expect(device.io).toEqual({ main: 'none', individualOuts: 0, audioIn: false, usbAudio: false })

    // #120's `cited-against`: the documentation does not fail to say whether this box makes a
    // sound, it says twice that it does not and enumerates the back panel without an audio
    // socket. A negative with a page is a finding rather than a gap.
    const negatives = ['io.main', 'io.individualOuts', 'io.audioIn', 'io.usbAudio', 'voices', 'content']
    for (const path of negatives) {
      const evidence = device.capabilityEvidence?.[path]
      expect(evidence, path).toMatchObject({ kind: 'cited-against' })
      if (evidence !== undefined && evidence !== false && evidence.kind === 'cited-against') {
        expect(evidence.reason.length, path).toBeGreaterThan(20)
        expect(evidence.cite.source, path).toContain(DOCS)
      }
    }
    // `content` is the sixth for the reason `DeviceSchema` states: a citation on that path with
    // no `content` declared is refused unless the reading answers no. This one does.
    expect(device.content).toBeUndefined()
    expect(device.recipes.some((r) => r.sourceAudio !== undefined)).toBe(false)
  })

  it('says "no audio I/O" in the guide rather than naming a bus', () => {
    const doc = renderGuide(resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 }))
    const block = doc.slice(doc.indexOf('- **T-1**'))
    expect(block.startsWith('- **T-1** — sequencer')).toBe(true)
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
  // §7.4 — the clock claim, and the four transports under it
  // -------------------------------------------------------------------------

  describe('clock (§7.4)', () => {
    it('sends and receives on all four transports, Link included', () => {
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock', 'ableton-link'])
      // Symmetric, so neither direction list is declared — both would restate `transport`.
      expect(device.clock.sendTransport).toBeUndefined()
      expect(device.clock.receiveTransport).toBeUndefined()
    })

    it('carries Ableton Link in both directions where the two MPCs carry it in one', () => {
      // Not a house style and not an oversight: the MPC manuals print Link on the Receive list
      // and not the Send list, so those two split `sendTransport` from `receiveTransport`. This
      // documentation says the opposite in as many words — Link is peer-to-peer, "any participant
      // can adjust the tempo, and the change propagates to the rest" — and its worked example
      // sets tempo from the T-1 and has a DAW follow. Same field, different document.
      const mpcs = DEVICES.filter((d) => d.clock.transport.includes('ableton-link') && d.id !== device.id)
      expect(mpcs.length).toBeGreaterThan(0)
      for (const mpc of mpcs) expect(mpc.clock.sendTransport, mpc.id).not.toContain('ableton-link')
    })

    it('claims the preference against a page that names the job rather than the capability', () => {
      // §7.4 asks for a topology judgement and warns that a `canSendClock` page must not stand in
      // for one. The connections page answers in a labelled field: Power, Connections, and
      // `Role: Sequencer and clock hub for hybrid rigs`.
      expect(device.clock.preferredSource).toBe(true)
      const role = device.capabilityEvidence?.['clock.preferredSource']
      expect(role).toEqual({
        kind: 'manual',
        source: `${DOCS}/t1/what-is-the-t1/t1-overview/power-and-connections/${FETCHED}`,
      })
      // And it is not the same page as the send capability's, which proves only that the box can.
      expect(device.capabilityEvidence?.['clock.canSendClock']).toEqual({
        kind: 'manual',
        source: `${DOCS}/t1/appendix/t1-config/midi-io/${FETCHED}`,
      })
    })

    it('is the fourth claimant and changes nothing, losing to the Hapax on the bottom key', () => {
      // #198 ranks two claimants by voicelessness first, then transport, then id. This box and
      // the Hapax are level on both of the first two — both voiceless, both `midi-din` — so it
      // falls to `compareCodeUnits`, and `squarp-` sorts before `torso-`. Adding a fourth claim
      // must not silently move a rig's clock, and this is the assertion that it did not.
      const source = selectClockSource(DEVICES, new Map())
      expect(source?.deviceId).toBe(hapax.id)
      expect(source?.transport).toBe('midi-din')
      expect(source?.claims).toBe(4)
      // Take the Hapax out and this box leads, which is what says it lost on the tie-break rather
      // than on the claim.
      expect(selectClockSource(DEVICES.filter((d) => d.id !== hapax.id), new Map())?.deviceId).toBe(
        device.id,
      )
    })

    it('names a T1 Config path for every transport, because this box has no screen', () => {
      // §7.4/#104. Clock leaves by a message type that is enabled per port and per direction, and
      // the analog rate and the Link toggle are settings too. There is nowhere on the box to set
      // any of them — the specifications page gives it 18 encoders, 23 keypads and no screen — so
      // every path here is in the companion application, and a reader told "T-1 over MIDI" with
      // no path gets silence.
      const setups = device.clock.sourceSetup ?? []
      expect(setups.map((s) => s.transport)).toEqual([
        'midi-din',
        'usb',
        'analog-clock',
        'ableton-link',
      ])
      for (const setup of setups) {
        expect(setup.path, setup.transport).toContain('T1 Config > ')
        expect(setup.note, setup.transport).toBeDefined()
        // §2.6 requires the page, and the schema refuses a setup without one.
        expect(device.capabilityEvidence?.[clockSourceSetupFact(setup.transport)]).toMatchObject({
          kind: 'manual',
        })
      }
    })
  })

  // -------------------------------------------------------------------------
  // §3.3 — the back panel, and the names that are only in a picture
  // -------------------------------------------------------------------------

  describe('jacks (§3.3)', () => {
    it('declares the whole back panel under the silkscreen the mirror does not carry', () => {
      // The hardware-interface page's back-panel table numbers seven groups and names not one
      // socket. Every id below came off the figure on that page, which the text mirror drops —
      // the same trap `CLAUDE.md` records for a dimension callout inside a PDF drawing, in a
      // different file format. Read from the text alone this box would have had numbers for
      // names.
      expect(device.jacks?.map((j) => j.id)).toEqual([
        'midi · in',
        'midi · out',
        'midi · thru',
        'usb',
        'cv mod · in',
        'sync in · clk',
        'sync in · rst',
        'sync out · clk',
        'sync out · rst',
        'gate · a',
        'gate · b',
        'cv · a',
        'cv · b',
        'cv · c',
        'cv · d',
      ])
      // Fifteen sockets, which is what the specifications page counts independently of the
      // drawing: 4 CV out, 1 CV in, 2 gate out, clock and reset in and out, MIDI in/out/thru,
      // USB-C.
      expect(device.jacks).toHaveLength(15)
      for (const jack of device.jacks ?? []) {
        expect(device.capabilityEvidence?.[jackFact(jack.id)], jack.id).toMatchObject({
          kind: 'manual',
        })
      }
    })

    it('reads `cv mod` as a modulation input, which took two pages and a picture', () => {
      // The text calls this socket "CV Input" and never says what it does. The silkscreen calls
      // it `cv mod`, and the Range & Phrase page closes the loop by listing `CV input | [VB16]`
      // among the selectable Phrase shapes. Either name alone would have been guessed wrong —
      // `cv` reads like a pitch input, and a bare "CV Input" reads like anything at all.
      const cvMod = device.jacks?.find((j) => j.id === 'cv mod · in')
      expect(cvMod?.signal).toEqual(['cv'])
      expect(cvMod?.direction).toBe('in')
      expect(cvMod?.clock).toBeUndefined()
      expect(cvMod?.note).toContain('Phrase')
    })

    it('names one socket per transport per direction, and gives Link none', () => {
      const carriers = (device.jacks ?? []).filter((j) => j.clock !== undefined)
      expect(
        carriers.map((j) => `${j.direction}:${(j.clock ?? []).join(',')}:${j.id}`).sort(),
      ).toEqual([
        'in:analog-clock:sync in · clk',
        'in:midi-din:midi · in',
        'out:analog-clock:sync out · clk',
        'out:midi-din:midi · out',
        'out:usb:usb',
      ])
      for (const jack of carriers) {
        expect(jack.signal, jack.id).toContain('clock')
      }
      // Link travels over Wi-Fi, so there is no socket to name and none is invented. And `usb` is
      // one physical port in both directions: `direction` takes one value, so it is declared as
      // the output this box's Role sentence makes it, and the note carries the rest.
      expect(JSON.stringify(device.jacks)).not.toContain('wifi')
      expect(device.jacks?.filter((j) => j.id === 'usb')).toHaveLength(1)
    })

    it('declares the reset sockets as gate and trigger both, because they have two modes', () => {
      // `reset` fires on the rising edge; `run` stays high while the pattern plays. That is a
      // trigger and a gate, and `JackSignalKind` separates them on exactly that difference — so a
      // list here means "this hole really does carry two different things" rather than an author
      // who could not choose.
      for (const id of ['sync in · rst', 'sync out · rst']) {
        const jack = device.jacks?.find((j) => j.id === id)
        expect(jack?.signal, id).toEqual(['gate', 'trigger'])
        expect(jack?.note, id).toContain('run')
      }
    })
  })

  // -------------------------------------------------------------------------
  // §3.3 — the one thing this box is deliberately not offered as
  // -------------------------------------------------------------------------

  describe('voice control (§3.3)', () => {
    it('drives, because it cites the setting that makes a CV out a pitch out (#213)', () => {
      // T1 Config gives CV A-D a Function of Pitch, Velocity or Gate and no page states a
      // default, so `signal` stays all three — that is a true fact about the socket and does not
      // change. What changed is #213: the jack now also carries the `setup` that makes it a pitch
      // output, `T1 Config > CV/Gate > Output Function` set to `Pitch`, and `soleKind` honours a
      // socket whose manual says how to set it.
      //
      // The Cascadia's end-of-attack outputs — the case that rule exists for — stay refused, and
      // that is the point rather than a side effect: its manual *hedges* about what the socket is,
      // so there is no instruction to cite, where this one *instructs*. A guide telling a reader
      // to patch pitch from a socket set to Velocity is still wrong; this one tells them to set it
      // to Pitch first.
      for (const id of ['cv · a', 'cv · b', 'cv · c', 'cv · d']) {
        expect(device.jacks?.find((j) => j.id === id)?.signal, id).toEqual([
          'pitch-cv',
          'cv',
          'gate',
        ])
      }
      // The gate outputs are single-kind — the Function setting is offered on the CV outputs
      // only — so the gate half never needed a setting, and the pitch half now has one.
      expect(
        (device.jacks ?? []).filter((j) => j.signal.length === 1 && j.signal[0] === 'gate').map((j) => j.id),
      ).toEqual(['gate · a', 'gate · b'])
      for (const id of ['cv · a', 'cv · b', 'cv · c', 'cv · d']) {
        const jack = device.jacks?.find((j) => j.id === id)
        expect(jack?.setup?.[0], id).toMatchObject({ signal: 'pitch-cv', value: 'Pitch' })
      }

      const result = resolve({
        devices: [device, minitaur],
        template: TEMPLATES.find((t) => t.id === 'industrial-techno') ?? template,
        mood: NEUTRAL_MOOD,
        seed: 3,
      })
      expect(result.interDevicePatch?.source?.deviceId).toBe(device.id)
      const target = result.interDevicePatch?.targets.find((t) => t.deviceId === 'moog-minitaur')
      expect(target?.outcome).toBe('routed')
      // Its own letters, paired by #214's matcher: `cv · a` with `gate · a`, which is the routing
      // T1 Config's 2-voices preset uses and what the manifest note said all along.
      expect(target?.cables.map((c) => c.fromJack).sort()).toEqual(['cv · a', 'gate · a'])
    })

    it('pairs its lettered sockets once they are single-kind, since #214 (#213)', () => {
      // #201 pairs a multitrack CV sequencer's pitch and gate sockets by *trailing ordinal* — the
      // Hapax's `Cv out 1` with `gate out 1`. This box numbers nothing: the silkscreen reads
      // `cv a`-`cv d` and `gate a`-`gate b`, and T1 Config pairs `CV A` with `Gate A` in as many
      // words. So the shape #201 solved is here with letters where it had digits.
      //
      // **This was written before #214 and its first half has since been fixed**, which is what
      // the test said it wanted: it called itself "evidence for that claim rather than an
      // assertion that it should stay true". #214 taught the matcher to read a letter as well as
      // a digit, so single-kind lettered sockets now pair, and the renaming half is no longer a
      // contrast — both spellings work.
      //
      // What still blocks this box is the other half of #213: its CV outputs declare three kinds
      // because a per-socket Function setting chooses one, so `soleKind` excludes them and there
      // is nothing to pair. Asserted below against the real manifest, which is the fact that
      // matters — the fixtures only show the matcher is no longer the reason.
      const droneStudy = TEMPLATES.find((t) => t.id === 'drone-study') ?? template
      const solePitch = {
        ...device,
        jacks: (device.jacks ?? []).map((j) =>
          j.id.startsWith('cv · ') ? { ...j, signal: ['pitch-cv' as const] } : j,
        ),
      }
      const lettered = resolve({
        devices: [solePitch, minitaur],
        template: droneStudy,
        mood: NEUTRAL_MOOD,
        seed: 1,
      })
      // Lettered and single-kind: routes now. Before #214 this was `toBeUndefined()`.
      expect(lettered.interDevicePatch?.source?.deviceId).toBe(device.id)

      // And the real manifest still does not, because the Function reading stands — the second
      // gap in #213, which is a design question rather than a matcher bug.
      // The shipped manifest drives too now, since #213 gave it somewhere to cite the Function
      // setting. Both halves of that issue are closed and this box is no longer the evidence for
      // either — kept because it is still the case that found them.
      const asShipped = resolve({
        devices: [device, minitaur],
        template: TEMPLATES.find((t) => t.id === 'industrial-techno') ?? template,
        mood: NEUTRAL_MOOD,
        seed: 3,
      })
      expect(asShipped.interDevicePatch?.source?.deviceId).toBe(device.id)

      const RENAMED: Record<string, string> = {
        'cv · a': 'cv 1',
        'cv · b': 'cv 2',
        'cv · c': 'cv 3',
        'cv · d': 'cv 4',
        'gate · a': 'gate 1',
        'gate · b': 'gate 2',
      }
      const numbered = {
        ...solePitch,
        jacks: (solePitch.jacks ?? []).map((j) =>
          RENAMED[j.id] === undefined ? j : { ...j, id: RENAMED[j.id] as string },
        ),
      }
      const withOrdinals = resolve({
        devices: [numbered, minitaur],
        template: droneStudy,
        mood: NEUTRAL_MOOD,
        seed: 1,
      })
      // Numbered spelling routes too, and that is now the same fact rather than a contrast: the
      // matcher reads both, so the box's silkscreen no longer decides whether it can drive.
      expect(withOrdinals.interDevicePatch?.source?.deviceId).toBe(device.id)
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, measured off a figure the mirror does not hold
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    it('cites a span the drawing corroborates, unlike the other two mirror-era boxes', () => {
      // `304 mm x 114 mm x 39 mm (11.9" x 4.5" x 1.5")`, printed with its own inch conversion.
      // The box is played long-edge-on, so 304 is the span and 114 the rise — and the 39 mm is
      // the depth a careless reading of three numbers in a row would have taken for the rise.
      expect(device.physical.panelSpanMm).toBe(304)
      expect(device.panel?.panelRiseMm).toBe(114)
      expect(device.physical.verified).toMatchObject({ kind: 'manual' })
    })

    it('checks the drawn aspect against the published one, which is what rejects the depth', () => {
      // §2.3's check, and the reason these coordinates are a measurement. The panel border in the
      // front-panel figure measures 1673 x 627.5 px — 2.6661 — against the specification's
      // 304/114 = 2.6667. They agree to 0.02%; 304/39 would be 7.79.
      const drawn = 1673 / 627.5
      const span = device.physical.panelSpanMm
      const rise = device.panel?.panelRiseMm ?? 0
      expect(Math.abs(drawn - span / rise) / drawn).toBeLessThan(0.001)
    })

    it('draws 18 encoders and 23 keypads, which is the count the specifications print', () => {
      // Neither figure was used to build the mapping — they are components counted off the
      // drawing — and the specifications page says "18 rotary encoders with push and 23 RBG
      // backlit sillicone keypads". A misread drawing would have produced a different count.
      const features = device.panel?.features ?? []
      expect(features.filter((f) => f.kind === 'knob')).toHaveLength(18)
      const grid = features.find((f) => f.kind === 'grid')
      if (grid?.kind !== 'grid') throw new Error('no value-button grid')
      expect(grid.cols * grid.rows).toBe(16)
      expect(features.filter((f) => f.kind === 'button')).toHaveLength(7)
      expect(grid.cols * grid.rows + features.filter((f) => f.kind === 'button').length).toBe(23)
    })

    it('lands square keypads and a 12 mm encoder, which is the frame checking itself', () => {
      // Two spans divided independently along two axes. A frame wrong in either would have made
      // the pads oblong.
      const features = device.panel?.features ?? []
      const grid = features.find((f) => f.kind === 'grid')
      if (grid?.kind !== 'grid') throw new Error('no grid')
      const knobs = features.filter((f) => f.kind === 'knob')
      for (const k of knobs) if (k.kind === 'knob') expect(k.d).toBeCloseTo(12.0, 1)
      const pad = features.find((f) => f.kind === 'button')
      if (pad?.kind !== 'button') throw new Error('no keypad')
      expect(Math.abs(pad.w - pad.h)).toBeLessThan(0.05)
    })

    it('cites the page whose figure it was measured off, and says the mirror drops it', () => {
      expect(device.panel?.verified).toMatchObject({
        kind: 'manual',
        source: expect.stringContaining('/t1/what-is-the-t1/t1-overview/hardware-interface/'),
      })
      const panel = device.panel
      if (panel === undefined || panel.verified === false) throw new Error('no panel citation')
      expect(panel.verified.source).toContain('mirror')
    })

    it('keeps every drawn feature inside the panel', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(304)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(114)
      }
    })
  })

  // -------------------------------------------------------------------------
  // §2.3 — the per-step lanes and the two LFO shapes, declared and unreachable
  // -------------------------------------------------------------------------

  it('names the five per-step parameters the page enumerates, and can reach none of them', () => {
    // The page's mechanic is wider than its examples — "turn one or more parameter (KNOBS) to
    // lock changes to that step" is every track parameter on the panel — and its sixth bullet is
    // an open "Tonal or modulation controls". Naming five is what the document enumerates;
    // naming eighteen would be this author generalising a sentence.
    expect(device.features?.perStep).toEqual(['pitch', 'velocity', 'timing', 'sustain', 'repeats'])
    expect(device.capabilityEvidence?.['features.perStep']).toEqual({
      kind: 'manual',
      source: `${DOCS}/t1/core-concepts/per-step-editing/${FETCHED}`,
    })
    // The same honest gap the other two sequencers record: `perStep` exists to be named by a
    // recipe's `articulation`, and a box with no recipes can never name one.
    expect(device.recipes).toHaveLength(0)
  })

  it('counts the two LFO shapes the documentation calls LFOs, and not the random system', () => {
    // "The two options for LFO modulation on the T1 are Phrase, which adds pitch movement, and
    // Groove, which adds velocity movement." Both are bound to one destination each and neither
    // can be pointed elsewhere. Random modulation is the box's *other* system — a sixteen-step
    // pseudo-random sequence assignable to nearly any parameter — and folding the two together
    // would make `count` mean two things at once.
    expect(device.features?.lfo).toEqual({
      count: 2,
      syncable: true,
      destinations: ['pitch', 'velocity'],
    })
    expect(device.capabilityEvidence?.['features.lfo']).toMatchObject({ kind: 'manual' })
    // No sidechain: it needs an audio path, and there is none.
    expect(device.features?.sidechain).toBeUndefined()
  })

  it('omits noteDuration for want of a part rather than for want of a page', () => {
    // The Sustain page gives it a default of "50%, equal to one full division", which would be a
    // clean `per-note-value`. It is only ever read for a part a device carries, and this box
    // carries none — the same omission both neighbouring sequencers make.
    expect(device.noteDuration).toBeUndefined()
    expect(hapax.noteDuration).toBeUndefined()
    // And `patternEntry` is the opposite claim: only the negative case is declarable, and a box
    // that sequences itself needs no field.
    expect(device.patternEntry).toBeUndefined()
  })
})
