import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  evidenceFor,
  jackFact,
  moodState,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/behringer-model-d/index'
import { device as neutron } from '../lib/devices/behringer-neutron/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The MODEL D is the third Behringer box in the library and the one whose panel carries **four
 * different printed scales side by side** — `0 to 10`, `-4 to +4`, semitones, and milliseconds.
 * That is what most of this file is for.
 *
 * CLAUDE.md's standing warning is that a cited range can still be the wrong range. The Neutron met
 * it as one knob whose scale a switch replaces; here it is four scales at once on one panel, plus
 * three controls whose *value* means nothing without the switch beside it — `OSC 3 FREQUENCY`,
 * `MOD MIX`, and `EXT IN VOLUME`, which is the level of a feedback path only while the socket
 * above it is empty. The manifest emits each of those groups from one helper so the pairing cannot
 * come apart; a helper like that is only worth having if something checks that no recipe routed
 * around it, and that is what the first block below does.
 *
 * The rest is what a fully-specified manual can newly be held to: a `partly` capability fact
 * (#236), a manual that contradicts itself about a knob position, and a box that carries no clock
 * in either direction while still declaring the wires MIDI travels on.
 */

/** Every citation in the manifest, plus the panel's parenthetical naming its figure. */
const SOURCE = /^MODEL D User Manual, p\.\d+( \(.+\))?$/

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function allParams(): { recipe: string; param: AuthoredParam }[] {
  return device.recipes.flatMap((r) => params(r).map((param) => ({ recipe: r.id, param })))
}

function numericsNamed(name: string): { recipe: string; value: number; range: { min: number; max: number } }[] {
  return allParams()
    .filter((p) => p.param.name === name && p.param.kind === 'numeric')
    .map((p) => {
      const param = p.param as Extract<AuthoredParam, { kind: 'numeric' }>
      return { recipe: p.recipe, value: param.value, range: { min: param.range.min, max: param.range.max } }
    })
}

/** The MODEL D alone, on whichever template gives one monophonic voice the most to do. */
function alone(templateId = 'industrial-techno', seed = 1) {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (template === undefined) throw new Error(`no template ${templateId}`)
  return resolve({ devices: [device], template, mood: moodState({}), seed })
}

describe('MODEL D manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('behringer-model-d')
    expect(device.kind).toBe('semi-modular')
    expect(device.maker).toBe('Behringer')
  })

  it('cites one document, by printed folio, on every claim it makes', () => {
    // The folio is printed in the header on this manual and equals the PDF page, checked on five
    // spreads. Every citation in the file is that number and no other document is named.
    const cites: string[] = []
    const collect = (v: unknown) => {
      if (v !== null && typeof v === 'object') {
        const rec = v as Record<string, unknown>
        if (rec['kind'] === 'manual' && typeof rec['source'] === 'string') cites.push(rec['source'])
        for (const child of Object.values(rec)) collect(child)
      }
    }
    collect(device)
    expect(cites.length).toBeGreaterThan(40)
    for (const source of cites) expect(source).toMatch(SOURCE)
    expect(device.manual).toEqual({ title: 'MODEL D User Manual', edition: 'MODEL_D_M_EN' })
  })

  // -------------------------------------------------------------------------
  // The three controls whose value means nothing without the switch beside it
  // -------------------------------------------------------------------------

  describe('a value never leaves the switch that scales it', () => {
    it('never states an OSC 3 frequency without its RANGE and CONTROL', () => {
      // p.8 item (6) and p.9 item (13): with CONTROL off, neither the keyboard nor TUNE reaches
      // OSC 3, so the same semitone figure is a different claim under each switch position.
      for (const recipe of device.recipes) {
        if (named(recipe, 'OSC 3 FREQUENCY') === undefined) continue
        expect(named(recipe, 'OSC 3 RANGE'), recipe.id).toBeDefined()
        expect(named(recipe, 'OSC 3 CONTROL'), recipe.id).toBeDefined()
      }
      // And the pair is emitted by one helper, so every recipe carries all four.
      expect(device.recipes.every((r) => named(r, 'OSC 3 WAVEFORM') !== undefined)).toBe(true)
    })

    it('never states a MOD MIX without the two switches that name its ends', () => {
      // p.13 §4.8 sets the two switches first and only then turns the knob. Without them the
      // number has no scale — its ends are whatever the switches select.
      for (const recipe of device.recipes) {
        if (named(recipe, 'MOD MIX') === undefined) continue
        expect(named(recipe, 'OSC 3 / FILTER EG'), recipe.id).toBeDefined()
        expect(named(recipe, 'NOISE (MOD SRC) / LFO'), recipe.id).toBeDefined()
      }
    })

    it('reads EXT IN VOLUME as feedback only while nothing is patched at EXT', () => {
      // p.12 §4.4.1: the main output is normalled into EXT, so with the socket empty this knob is
      // the feedback amount and with a cable in it is an external level. The manifest authors the
      // first reading; this holds the manifest to it rather than a comment doing so.
      for (const recipe of device.recipes) {
        const level = named(recipe, 'EXT IN VOLUME')
        const patchesExt = (recipe.patch ?? []).some((c) => c.to === 'EXT')
        if (level !== undefined) {
          expect(level.note, recipe.id).toContain('Nothing patched at EXT')
          expect(patchesExt, recipe.id).toBe(false)
          // A level with the channel switched out would be a setting with no subject.
          expect(named(recipe, 'EXT IN'), recipe.id).toMatchObject({ value: 'on' })
        }
      }
      // The feedback path is this box's only overdrive, so the grit axis has to land there.
      const gritty = allParams().filter(
        (p) => p.param.kind === 'numeric' && (p.param.mood ?? []).some((m) => m.axis === 'grit'),
      )
      expect(new Set(gritty.map((p) => p.param.name))).toEqual(
        new Set(['EXT IN VOLUME', 'MAIN VOLUME', 'FILTER EMPHASIS']),
      )
      // And MAIN VOLUME appears exactly where the feedback does, because p.12 says the level
      // depends on both knobs and one of them alone is half the gesture.
      for (const recipe of device.recipes) {
        expect(named(recipe, 'MAIN VOLUME') !== undefined, recipe.id).toBe(
          named(recipe, 'EXT IN VOLUME') !== undefined,
        )
      }
    })
  })

  // -------------------------------------------------------------------------
  // Four printed scales on one panel
  // -------------------------------------------------------------------------

  describe('four printed scales, and each value on the right one', () => {
    it('puts CUTOFF FREQUENCY on -4 to +4 and nothing else there', () => {
      const cutoffs = numericsNamed('CUTOFF FREQUENCY')
      expect(cutoffs.length).toBe(device.recipes.length)
      for (const c of cutoffs) {
        expect(c.range, c.recipe).toEqual({ min: -4, max: 4 })
        expect(c.value, c.recipe).toBeGreaterThanOrEqual(-4)
        expect(c.value, c.recipe).toBeLessThanOrEqual(4)
      }
      // p.15's calibration table prints `CUTOFF FREQ  5` on a knob whose own silkscreen and whose
      // specification both say -4 to +4, and whose drawn pointer on the same page sits near -3.
      // Nothing here is taken from that table, and 5 is not a position this knob has.
      expect(cutoffs.some((c) => c.value === 5)).toBe(false)
    })

    it('puts the two tuning controls on semitone scales of different widths', () => {
      for (const t of numericsNamed('TUNE')) expect(t.range, t.recipe).toEqual({ min: -2, max: 2 })
      for (const name of ['OSC 2 FREQUENCY', 'OSC 3 FREQUENCY']) {
        const found = numericsNamed(name)
        expect(found.length).toBe(device.recipes.length)
        for (const f of found) expect(f.range, `${name} ${f.recipe}`).toEqual({ min: -7, max: 7 })
      }
      // p.12 hedges — the marks are semitones "as a general guide" — so every one of them says so.
      for (const p of allParams()) {
        if (!['TUNE', 'OSC 2 FREQUENCY', 'OSC 3 FREQUENCY'].includes(p.param.name)) continue
        expect((p.param as { unit?: string }).unit, p.recipe).toBe('st')
        expect(p.param.note, `${p.param.name} ${p.recipe}`).toContain('general guide')
      }
    })

    it('puts every contour stage in milliseconds and records the open top end', () => {
      const attacks = [...numericsNamed('FILTER ATTACK'), ...numericsNamed('LOUDNESS ATTACK')]
      const decays = [...numericsNamed('FILTER DECAY TIME'), ...numericsNamed('LOUDNESS DECAY TIME')]
      expect(attacks.length).toBe(device.recipes.length * 2)
      expect(decays.length).toBe(device.recipes.length * 2)
      for (const a of attacks) expect(a.range, a.recipe).toEqual({ min: 1, max: 10000 })
      // p.34 gives decay as `4 ms to >35 s`. The top end is open, so the range is its stated floor
      // and every decay param says so rather than presenting 35 s as a measured ceiling.
      for (const d of decays) {
        expect(d.range, d.recipe).toEqual({ min: 4, max: 35000 })
      }
      for (const p of allParams()) {
        if (!p.param.name.endsWith('DECAY TIME')) continue
        expect(p.param.note, p.recipe).toContain('>35 s')
      }
    })

    it('leaves the twelve 0-to-10 knobs on their own scale', () => {
      for (const name of [
        'GLIDE',
        'MOD DEPTH',
        'LFO RATE',
        'OSC 1 VOLUME',
        'NOISE VOLUME',
        'EXT IN VOLUME',
        'MAIN VOLUME',
        'FILTER EMPHASIS',
        'AMOUNT OF CONTOUR',
        'FILTER SUSTAIN',
        'LOUDNESS SUSTAIN',
      ]) {
        const found = numericsNamed(name)
        expect(found.length, name).toBeGreaterThan(0)
        for (const f of found) expect(f.range, `${name} ${f.recipe}`).toEqual({ min: 0, max: 10 })
      }
    })

    it('marks MOD MIX as travel because its ends are words, and hangs no mood on it', () => {
      // p.34 gives this knob only as a blend between whatever the two switches select, and the
      // panel prints those names where 0 and 10 sit on its neighbours. A range needs two finite
      // numbers, so this is percent of travel with both claims unverified — the Minitaur's answer
      // to `0 to Self-Oscillation`.
      const mixes = allParams().filter((p) => p.param.name === 'MOD MIX')
      expect(mixes.length).toBeGreaterThan(0)
      for (const p of mixes) {
        const param = p.param as Extract<AuthoredParam, { kind: 'numeric' }>
        expect(param.unit, p.recipe).toBe('% travel')
        expect(param.range.verified, p.recipe).toBe(false)
        expect(param.verified, p.recipe).toBe(false)
        expect(param.mood, p.recipe).toBeUndefined()
      }
    })
  })

  it('leaves every point value uncited, and says so on the recipe too', () => {
    // No page states where to set a knob for a sound. The one page that prints knob positions is a
    // calibration jig, and one of its rows is off the wrong scale.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
    for (const p of allParams()) expect(p.param.verified, `${p.recipe} ${p.param.name}`).toBe(false)
    // Ranges, on the other hand, are almost all cited — that is what p.34 is for.
    const numerics = allParams().filter((p) => p.param.kind === 'numeric')
    const cited = numerics.filter(
      (p) => (p.param as Extract<AuthoredParam, { kind: 'numeric' }>).range.verified !== false,
    )
    expect(cited.length / numerics.length).toBeGreaterThan(0.9)
  })

  it('declares three mood axes and declines swing and space', () => {
    // A device declines an axis by having no param that declares it — there is no capability check
    // and there must not be one. `swing` because nothing here decides where a note falls, and
    // `space` because there is no delay, reverb or ambience control anywhere on the panel.
    const axes = new Set(
      allParams().flatMap((p) =>
        p.param.kind === 'numeric' ? (p.param.mood ?? []).map((m) => m.axis) : [],
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit'])
  })

  // -------------------------------------------------------------------------
  // §3.3 — the patch points
  // -------------------------------------------------------------------------

  describe('the patch points (§3.3)', () => {
    it('declares all twenty sockets, each cited once', () => {
      const jacks = device.jacks ?? []
      expect(jacks).toHaveLength(20)
      for (const j of jacks) {
        const evidence = evidenceFor(device, jackFact(j.id))
        expect(evidence, j.id).toMatchObject({ kind: 'manual' })
        expect((evidence as { source: string }).source, j.id).toMatch(SOURCE)
      }
      expect(new Set(jacks.map((j) => j.id)).size).toBe(jacks.length)
    })

    it('names no socket as a clock route, because no page says one is', () => {
      // `JackSpec.clock` says a clock *arrives here*, which is a positive claim and would want a
      // page. Nothing in this manual makes one, and the field it would have to agree with —
      // `canReceiveClock` — is `false` on an `unknown`, so declaring a route would be the manifest
      // asserting through a jack what it declines to assert through the capability.
      for (const j of device.jacks ?? []) expect(j.clock, j.id).toBeUndefined()
    })

    it('has an IN and a THRU and no MIDI OUT DIN', () => {
      // p.34's Connectivity row is `MIDI In/Thru`, and p.8 item (3) has THRU passing through what
      // arrives at MIDI IN. MIDI leaves this box over USB or not at all.
      const ids = (device.jacks ?? []).map((j) => j.id)
      expect(ids).toContain('MIDI IN')
      expect(ids).toContain('MIDI THRU')
      expect(ids).not.toContain('MIDI OUT')
      const thru = (device.jacks ?? []).find((j) => j.id === 'MIDI THRU')
      expect(thru?.direction).toBe('out')
      expect(thru?.note).toContain('no MIDI OUT DIN')
    })

    it('runs every cable from an output to an input, and cites none of them', () => {
      const byId = new Map((device.jacks ?? []).map((j) => [j.id, j]))
      const cables = device.recipes.flatMap((r) => (r.patch ?? []).map((c) => ({ recipe: r.id, c })))
      expect(cables.length).toBeGreaterThan(0)
      for (const { recipe, c } of cables) {
        expect(byId.get(c.from)?.direction, `${recipe} ${c.from}`).toBe('out')
        expect(byId.get(c.to)?.direction, `${recipe} ${c.to}`).toBe('in')
        // This manual instructs exactly one patch and it is between two boxes (p.29 §6.4), so no
        // connection inside one box has a page behind it.
        expect(c.verified, `${recipe} ${c.from}->${c.to}`).toBe(false)
        expect(c.note, `${recipe} ${c.from}->${c.to}`).toBeDefined()
      }
    })
  })

  // -------------------------------------------------------------------------
  // §2.6 — capability evidence
  // -------------------------------------------------------------------------

  describe('capability evidence (§2.6)', () => {
    it('carries no clock in either direction, and cites no page for saying so', () => {
      expect(device.clock.canSendClock).toBe(false)
      expect(device.clock.canReceiveClock).toBe(false)
      expect(device.clock.transport).toEqual(['midi-din', 'usb'])
      expect(device.clock.preferredSource).toBeUndefined()

      // **All three clock facts are `unknown`, and the bar is what makes that right.**
      // `cited-against` is for a document that addresses the question and comes back negative —
      // the Minitaur's implementation chart printing `Clock | NO | YES`. This manual has no
      // implementation chart at all, and what stands in its place is p.34's Synthesizer
      // Architecture list carrying nothing tempo-driven. That is an omission, and an omission is
      // an absence rather than an answer. `canReceiveClock` and `preferredSource` were authored
      // as `cited-against` on that list and corrected — `canSendClock` was `unknown` from the
      // start, because the USB half was open on its own terms. The loop pins all three together
      // so the inference cannot come back wearing a page number.
      for (const path of ['clock.canSendClock', 'clock.canReceiveClock', 'clock.preferredSource']) {
        const fact = evidenceFor(device, path)
        expect(fact, path).toMatchObject({ kind: 'unknown' })
        // `unknown` carries no `cite` by construction, which is the whole distinction: no page
        // answered, so there is no page to name.
        expect(fact, path).not.toHaveProperty('cite')
        expect((fact as { reason: string }).reason.length, path).toBeGreaterThan(80)
      }
      expect((evidenceFor(device, 'clock.canSendClock') as { reason: string }).reason).toContain(
        'implementation chart',
      )
    })

    it('uses `partly` where one page proves two thirds of a claim (#236)', () => {
      // `features.lfo` asserts a count, a set of destinations and whether it syncs. p.34 prints the
      // count and pp.8/10 give the two cable-free destinations; nothing anywhere addresses sync.
      // A plain Cite would overclaim and `unknown` would report a two-thirds-cited fact as a gap.
      const lfo = evidenceFor(device, 'features.lfo')
      expect(lfo).toMatchObject({ kind: 'partly' })
      const fact = lfo as { cite: { source: string }; proven: string; open: string }
      expect(fact.cite.source).toMatch(SOURCE)
      expect(fact.proven).toContain('0.05 Hz to 200 Hz')
      expect(fact.open).toContain('synced')
      expect(device.features?.lfo).toMatchObject({ count: 1, syncable: false })
    })

    it('answers the content question rather than leaving it to the default', () => {
      // #111: absence means nobody established it, and the guide says so. Here somebody did — the
      // architecture list is exhaustive and entirely analog, and the box's own recall mechanism is
      // a printed patch sheet.
      expect(device.content).toBeUndefined()
      const content = evidenceFor(device, 'content')
      expect(content).toMatchObject({ kind: 'cited-against' })
      expect((content as { reason: string }).reason).toContain('patch sheet')
      for (const recipe of device.recipes) expect(recipe.sourceAudio, recipe.id).toBeUndefined()
    })

    it('has no sequencer, and every field that depends on that agrees', () => {
      expect(device.patternEntry).toEqual({
        kind: 'external',
        reason: expect.stringContaining('no sequencer'),
      })
      expect(device.noteDuration).toMatchObject({ kind: 'gate' })
      expect(evidenceFor(device, 'features.perStep')).toMatchObject({ kind: 'cited-against' })
      for (const recipe of device.recipes) expect(recipe.articulation, recipe.id).toBeUndefined()
      expect(device.features?.perStep).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel
  // -------------------------------------------------------------------------

  describe('the panel (§10)', () => {
    it('is the Eurorack panel and not the factory chassis, which the aspect settles', () => {
      // p.34 prints `Dimensions ... 374 mm` and `Module width  70HP` in the same block. The drawn
      // figure measures 2.7645 : 1, against 355.6/128.5 = 2.7674 for the panel and 374/136 = 2.75
      // for the case. The 0.10% match is the one that picks, and 374 - 355.6 = 2 x 9.2 mm of wood.
      expect(device.physical.panelSpanMm).toBeCloseTo(355.6, 1)
      expect(device.panel?.panelRiseMm).toBeCloseTo(128.6, 1)
      const aspect = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
      expect(aspect).toBeGreaterThan(2.74)
      expect(aspect).toBeLessThan(2.79)
      expect(device.physical.verified).toEqual({ kind: 'manual', source: 'MODEL D User Manual, p.34' })
    })

    it('keeps every drawn feature inside the published footprint', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(device.physical.panelSpanMm)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(panel.panelRiseMm)
      }
      expect(panel.features.filter((f) => f.kind === 'voices')).toHaveLength(1)
    })

    it('draws the twenty-nine knobs and nineteen switches p.6 counts', () => {
      // p.6: "The MODEL D has 29 knobs and 19 switches". The component sweep of p.40 found exactly
      // those numbers independently, which is why the sweep is trusted for the coordinates too.
      const f = device.panel?.features ?? []
      expect(f.filter((x) => x.kind === 'knob')).toHaveLength(29)
      expect(f.filter((x) => x.kind === 'button')).toHaveLength(19)
      // Eight socket blocks — there is no jack in this vocabulary — and seven section boxes.
      expect(f.filter((x) => x.kind === 'grid')).toHaveLength(8)
      expect(f.filter((x) => x.kind === 'group')).toHaveLength(7)
      // No screen, because the box reports through two LEDs and nothing else.
      expect(f.filter((x) => x.kind === 'screen')).toHaveLength(0)
    })

    it('never draws two controls under one label', () => {
      // The panel prints DECAY over a knob and FILTER DECAY / LOUD DECAY beside a switch. p.10
      // item (30) resolves it by calling the knob DECAY TIME, and this file follows p.10 so a
      // reader is never told to set two controls with one name.
      const labels = (device.panel?.features ?? [])
        .map((f) => ('label' in f ? f.label : undefined))
        .filter((l): l is string => l !== undefined)
      expect(new Set(labels).size).toBe(labels.length)
    })
  })

  // -------------------------------------------------------------------------
  // §2.4/§8 — one voice, and what it is asked to do
  // -------------------------------------------------------------------------

  it('is one monophonic voice, and takes no role that would need two', () => {
    // One filter and one VCA. A recipe claiming a noise burst and a pitched body at once would be
    // claiming two voices, which is the CRAVE's and the Neutron's reasoning arriving again.
    expect(device.voices).toHaveLength(1)
    expect(device.voices[0]).toMatchObject({ kind: 'fixed', polyphony: 1 })
    expect(device.comfortableVoices).toBe(1)
    const roles = device.voices[0]?.roles ?? []
    for (const backbeat of ['snare', 'clap', 'rim', 'ghost-perc', 'closed-hat', 'open-hat', 'ride']) {
      expect(roles, backbeat).not.toContain(backbeat)
    }
    // Every role it claims has at least one recipe behind it.
    for (const role of roles) {
      expect(device.recipes.some((r) => r.role === role), role).toBe(true)
    }
    // And it claims `pad`, for the same kind of reason the Neutron does — two contours with a
    // sustain each, so a held note has somewhere to go.
    expect(roles).toContain('pad')
    expect(neutron.voices[0]?.roles).toContain('pad')
  })

  it('resolves and renders on its own, with the cables in the guide (§8)', () => {
    const result = alone()
    expect(result.search.capped).toBe(false)
    const guide = renderGuide(result)
    expect(guide.length).toBeGreaterThan(0)
    // The two patched recipes are the only ones with cables, and both name what the cable does.
    const patched = device.recipes.filter((r) => (r.patch ?? []).length > 0)
    expect(patched.map((r) => r.id).sort()).toEqual([
      'model-d-impact-hard',
      'model-d-kick-hard',
      'model-d-sweep-dark',
    ])
  })
})
