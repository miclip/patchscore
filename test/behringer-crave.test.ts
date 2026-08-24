import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  expand,
  renderGuide,
  resolve,
  resolveRecipe,
  selectClockSource,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device, type CraveJack } from '../lib/devices/behringer-crave/index'
import { device as cascadia } from '../lib/devices/intellijel-cascadia/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The CRAVE is the second `semi-modular` in the library and the first device documented **only by
 * a Quick Start Guide**. Those two facts set what this file is for.
 *
 * The Cascadia established the patch-point shape — jacks declared once by the device, cables
 * referencing them, `verified` on a cable claiming only that the *connection* is a good idea. The
 * CRAVE is the second box through that shape, so most of this file is not "does the tenth manifest
 * parse" but the claims a second patchable device is the first to be able to test: that the id
 * convention resolves duplicate silkscreens on a panel whose patchbay prints no section names at
 * all, and that a manifest with **no instructed cable anywhere in its documentation** renders
 * every one of them provisional rather than reaching for a page that does not say it.
 *
 * The other half is scarcity. This guide prints thirteen control ranges and nothing else, so the
 * discipline being tested is what was *left out* — the controls with no scale are absent rather
 * than given an invented one.
 */

const GUIDE = 'CRAVE Quick Start Guide BE_0718-AAJ_WW, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('CRAVE manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('behringer-crave')
    expect(device.kind).toBe('semi-modular')
    expect(device.maker).toBe('Behringer')
  })

  // -------------------------------------------------------------------------
  // §2.3 — the panel, in playing orientation
  // -------------------------------------------------------------------------

  it('spans 320 x 164 mm in playing orientation, both figures off one Dimensions line', () => {
    // p.72 prints `Dimensions (H x W x D)  47 x 320 x 164 mm`. The trap §2.3 names: for a desktop
    // box lying flat the surface you play is the top, so the rise is the manufacturer's *depth*.
    // 47 mm is how far off the desk it stands and is not a panel dimension at all.
    expect(device.physical.panelSpanMm).toBe(320)
    expect(device.panel?.panelRiseMm).toBe(164)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${GUIDE}72` })
    // The panel citation is the *drawing* the coordinates were read off, which is a different
    // page and a different claim — the same split the MC-101 and TR-8S make.
    expect(device.panel?.verified).toEqual({
      kind: 'manual',
      source: `${GUIDE}18 (CRAVE Controls)`,
    })
    // Landscape, and by a wide margin: this is a shallow desktop box.
    expect(device.physical.panelSpanMm).toBeGreaterThan(device.panel?.panelRiseMm ?? 0)
  })

  it('keeps every drawn feature inside the published footprint', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(320)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(164)
    }
    const fields = panel.features.filter((f) => f.kind === 'voices')
    expect(fields).toHaveLength(1)
  })

  it('draws no screen, because the box has none', () => {
    // The CRAVE reports state through eight OCTAVE/LOCATION LEDs (p.20 item 29) and nothing else.
    // A `screen` feature would claim a readout it cannot produce — the same call the Cascadia
    // makes, and the reason both are the only two panels in the library without one.
    const screens = device.panel?.features.filter((f) => f.kind === 'screen') ?? []
    expect(screens).toHaveLength(0)
    expect(cascadia.panel?.features.some((f) => f.kind === 'screen')).toBe(false)
  })

  // -------------------------------------------------------------------------
  // §3.3 — the patchbay, and the id convention it forced
  // -------------------------------------------------------------------------

  describe('the patchbay (§3.3)', () => {
    it('declares all thirty-three patch points, cited once each', () => {
      expect(device.jacks).toHaveLength(33)
      const ins = (device.jacks ?? []).filter((j) => j.direction === 'in')
      const outs = (device.jacks ?? []).filter((j) => j.direction === 'out')
      // p.21: items 40-57 are the Input Section, 58-72 the Output Section.
      expect(ins).toHaveLength(18)
      expect(outs).toHaveLength(15)
      for (const j of device.jacks ?? []) {
        expect(j.verified, j.id).toMatchObject({ kind: 'manual', source: expect.stringContaining(GUIDE) })
      }
    })

    it('gives every jack a unique id, which the silkscreen does not', () => {
      // The reason the convention exists. `MULTIPLE` is printed three times — one input and two
      // outputs, all adjacent — and `VC MIX` twice. The two MULTIPLE outputs are the same name in
      // the same direction, so a direction prefix alone is not enough and they are numbered.
      const ids = (device.jacks ?? []).map((j) => j.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toContain('IN · MULTIPLE')
      expect(ids).toContain('OUT · MULTIPLE 1')
      expect(ids).toContain('OUT · MULTIPLE 2')
      expect(ids).toContain('IN · VC MIX')
      expect(ids).toContain('OUT · VC MIX')

      // And the bare silkscreen really is ambiguous, or the numbering above is decoration.
      const silkscreen = ids.map((id) => id.replace(/^(IN|OUT) · /, '').replace(/ [12]$/, ''))
      expect(new Set(silkscreen).size).toBeLessThan(silkscreen.length)
    })

    it('prefixes every id with the manual\'s own section, so direction is legible in the data', () => {
      for (const j of device.jacks ?? []) {
        const prefix = j.direction === 'in' ? 'IN · ' : 'OUT · '
        expect(j.id.startsWith(prefix), j.id).toBe(true)
        const name = j.id.slice(prefix.length)
        expect(name.length, j.id).toBeGreaterThan(0)
      }
      // Which makes the schema's direction rule visible rather than only enforced: every cable
      // must read out-to-in on its face.
      for (const recipe of device.recipes) {
        for (const entry of recipe.patch ?? []) {
          expect(entry.from.startsWith('OUT · '), `${recipe.id}: ${entry.from}`).toBe(true)
          expect(entry.to.startsWith('IN · '), `${recipe.id}: ${entry.to}`).toBe(true)
        }
      }
    })

    it('keeps the declared jack ids as literals, so a mistyped endpoint cannot compile', () => {
      // The Cascadia records what happens without this: `jack(id: string)` widens every id to
      // `string`, the union becomes `string`, `cable()` accepts arbitrary text, and the file's
      // own comment claims a compile-time check that does not exist. Nothing fails at runtime,
      // which is exactly why this is asserted at type level.
      expectTypeOf<'OUT · MULTIPLE 1'>().toExtend<CraveJack>()
      expectTypeOf<'IN · OSC FM'>().toExtend<CraveJack>()
      expectTypeOf<'OUT · VCA/LINE'>().toExtend<CraveJack>()
      // The half that catches the widening: if `CraveJack` ever becomes `string`, this fails.
      expectTypeOf<string>().not.toExtend<CraveJack>()
    })

    it('names no other device, and never leaves the box', () => {
      // §10: a patch entry is a cable *inside* one panel, and the rack draws inter-device cables
      // from clock alone. An endpoint carrying a device name would be a claim this shape cannot
      // make and the renderer would have nowhere to put.
      const makers = ['crave', 'behringer', 'cascadia', 'intellijel', 'roland', 'deluge', 'tascam']
      for (const j of device.jacks ?? []) {
        for (const maker of makers) expect(j.id.toLowerCase(), j.id).not.toContain(maker)
      }
      const declared = new Set((device.jacks ?? []).map((j) => j.id))
      for (const recipe of device.recipes) {
        for (const entry of recipe.patch ?? []) {
          expect(declared, `${recipe.id}: ${entry.from}`).toContain(entry.from)
          expect(declared, `${recipe.id}: ${entry.to}`).toContain(entry.to)
        }
      }
    })

    it('renders every cable provisional, because nothing in the guide instructs one', () => {
      // **The claim this device is the first to be able to make.** The Cascadia's MAKE A SOUND
      // walkthrough builds a patch cable by lettered cable, so four of its cables carry the page
      // that instructs them. The CRAVE's guide has no walkthrough at all: p.69's default patch
      // prints knob positions and *no cables*. So every cable here is taste, and `false` is the
      // only honest answer — which is the shape doing its job rather than a gap in the authoring.
      let cables = 0
      for (const recipe of device.recipes) {
        expect(recipe.patch?.length ?? 0, recipe.id).toBeGreaterThan(0)
        for (const entry of recipe.patch ?? []) {
          cables += 1
          expect(entry.verified, `${recipe.id}: ${entry.from} -> ${entry.to}`).toBe(false)
          expect((entry.note ?? '').length, `${recipe.id}: ${entry.from}`).toBeGreaterThan(0)
        }
      }
      expect(cables).toBeGreaterThan(15)
    })

    it('patches the whole VC MIX block whenever it uses any of it', () => {
      // p.20 item 23: the VC MIX control "requires patch cords to operate, as it is outside of
      // the internal sythesizer signal path". So a cable into MIX 1 alone instructs a reader to
      // do something with no audible effect — the crossfader needs its two sources, its control
      // voltage and somewhere for the result to go.
      const block = ['IN · MIX 1', 'IN · MIX 2', 'IN · VC MIX']
      for (const recipe of device.recipes) {
        const to = (recipe.patch ?? []).map((e) => e.to)
        const from = (recipe.patch ?? []).map((e) => e.from)
        if (!block.some((j) => to.includes(j))) continue
        for (const j of block) expect(to, recipe.id).toContain(j)
        expect(from, recipe.id).toContain('OUT · VC MIX')
      }
      // Anti-vacuity: some recipe actually uses it, or the loop above never runs.
      expect(
        device.recipes.some((r) => (r.patch ?? []).some((e) => e.to === 'IN · MIX 1')),
      ).toBe(true)
    })

    it('takes both MULTIPLE outputs when it feeds the mult', () => {
      // A passive 1-in/2-out mult (p.21 item 48). Patching the input and using one output is
      // legal but pointless — the point of the mult is the second copy.
      for (const recipe of device.recipes) {
        const to = (recipe.patch ?? []).map((e) => e.to)
        const from = (recipe.patch ?? []).map((e) => e.from)
        if (!to.includes('IN · MULTIPLE')) continue
        if (from.includes('OUT · MULTIPLE 1') || from.includes('OUT · MULTIPLE 2')) {
          expect(from, recipe.id).toContain('OUT · MULTIPLE 1')
          expect(from, recipe.id).toContain('OUT · MULTIPLE 2')
        }
      }
      expect(device.recipes.some((r) => (r.patch ?? []).some((e) => e.from === 'OUT · MULTIPLE 2'))).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // §2.2 — one voice
  // -------------------------------------------------------------------------

  it('declares one monophonic voice, as the specification states it', () => {
    // "Number of voices: Monophonic" (p.70) — stated, not inferred from the panel.
    expect(device.voices).toHaveLength(1)
    expect(device.voices[0]?.kind).toBe('fixed')
    expect(device.voices[0]?.polyphony).toBe(1)
    const assignables = expand(device)
    expect(assignables).toHaveLength(1)
    expect(assignables[0]?.ordinal).toBeUndefined()
    for (const role of device.voices[0]?.roles ?? []) expect(ROLES).toContain(role)
  })

  it('claims no pad, because the envelope has no release stage', () => {
    // p.70: "Envelopes: ADS, selectable for VCO, VCF, VCA". Three stages, not four. The Cascadia
    // claims `pad` on its one voice and this box does not, and the difference is a fact about the
    // hardware rather than a judgement about the part.
    expect(device.voices[0]?.roles).not.toContain('pad')
    expect(cascadia.voices[0]?.roles).toContain('pad')
    // No recipe sneaks one in either.
    expect(device.recipes.some((r) => r.role === 'pad')).toBe(false)
  })

  // -------------------------------------------------------------------------
  // §3 — recipes
  // -------------------------------------------------------------------------

  it('carries recipes on distinct (role, character) keys, with unique ids', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)
    const ids = device.recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const recipe of device.recipes) {
      expect(ROLES, recipe.id).toContain(recipe.role)
      expect(CHARACTERS, recipe.id).toContain(recipe.character)
      expect(recipe.id.startsWith('crave-'), recipe.id).toBe(true)
      expect(recipe.voice, recipe.id).toBe('voice')
    }
    expect(new Set(device.recipes.map((r) => r.character)).size).toBe(CHARACTERS.length)
  })

  it('resolves every authored recipe exactly, and reaches every role it claims', () => {
    const assignable = expand(device)[0]
    if (assignable === undefined) throw new Error('no assignable')
    for (const recipe of device.recipes) {
      const resolution = resolveRecipe(device, assignable, recipe.role, recipe.character, 1)
      expect(resolution.outcome, recipe.id).toBe('exact')
      if (resolution.outcome === 'unvoiced') throw new Error(`${recipe.id}: unvoiced`)
      expect(resolution.recipe.id, recipe.id).toBe(recipe.id)
    }
    // Every role the voice advertises has at least one recipe behind it — on a one-voice box an
    // advertised role with no recipe is a promise the resolver will take and then fail.
    const covered = new Set(device.recipes.map((r) => r.role))
    expect((device.voices[0]?.roles ?? []).filter((r) => !covered.has(r))).toEqual([])
  })

  it('sets the whole voice path on every recipe, because there is only one of it', () => {
    // A semi-modular recipe that set CUTOFF and left MIX alone would leave the reader with the
    // previous patch's mix. One voice means every knob in the path is part of every answer.
    for (const recipe of device.recipes) {
      for (const name of ['FREQUENCY', 'PULSE WIDTH', 'MIX', 'CUTOFF', 'RESONANCE', 'VOLUME']) {
        expect(params(recipe).map((p) => p.name), recipe.id).toContain(name)
      }
      expect(params(recipe).filter((p) => p.kind === 'numeric').length, recipe.id).toBeGreaterThanOrEqual(8)
    }
  })

  // -------------------------------------------------------------------------
  // §3.2 — provenance, and what scarcity did to it
  // -------------------------------------------------------------------------

  it('cites every range and option set, and no point (§3.2)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
        expect(param.verified, where).toBe(false)
        if (param.kind === 'numeric') {
          expect(param.range.verified, where).toMatchObject({
            kind: 'manual',
            source: expect.stringContaining(GUIDE),
          })
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
        }
        if (param.kind === 'enum') {
          expect(param.options.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
      }
    }
    const counts = auditDevice(device).counts
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
  })

  it('cites only the three pages that print a range, and only pages the guide has', () => {
    const sources: string[] = []
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind === 'numeric') sources.push(param.range.verified === false ? '' : (param.range.verified?.source ?? ''))
        if (param.kind === 'enum') sources.push(param.options.verified === false ? '' : (param.options.verified?.source ?? ''))
      }
    }
    expect(sources.length).toBeGreaterThan(100)
    const pages = new Set(sources.map((s) => Number(s.slice(GUIDE.length))))
    for (const page of pages) {
      expect(Number.isInteger(page), String(page)).toBe(true)
      // Printed folios, two to a PDF sheet across 40 sheets.
      expect(page).toBeGreaterThanOrEqual(4)
      expect(page).toBeLessThanOrEqual(78)
    }
    // 70 and 71 are the Specifications tables; 63 is the ASSIGN mode list. Nothing else in this
    // document states a range or an option set, so nothing else may appear here.
    expect([...pages].sort((a, b) => a - b)).toEqual([63, 70, 71])
  })

  it('keeps every numeric inside one of the four shapes the guide prints', () => {
    // pp.70-71 print four and no others. A fifth appearing here means a misread table or a range
    // invented to hang a value on.
    const SHAPES = [
      { min: 0, max: 10, why: 'the standard control travel' },
      { min: -5, max: 5, why: 'the two centre-detented controls, FREQUENCY and MIX' },
      { min: 5, max: 95, why: 'pulse width, the one control with a printed unit' },
    ]
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        const where = `${recipe.id} / ${param.name}: ${param.range.min}..${param.range.max}`
        expect(SHAPES.some((s) => s.min === param.range.min && s.max === param.range.max), where).toBe(true)
        // No `step` anywhere: the guide prints no resolution for any control (invariant 5).
        expect(param.step, where).toBeUndefined()
      }
    }
    for (const shape of SHAPES) {
      const used = device.recipes.some((r) =>
        params(r).some((p) => p.kind === 'numeric' && p.range.min === shape.min && p.range.max === shape.max),
      )
      expect(used, shape.why).toBe(true)
    }
  })

  it('omits the controls whose legality the guide never states', () => {
    // **The discipline this device is the test of.** These are real, prominent front-panel
    // controls with no printed scale anywhere in the document: TEMPO/GATE LENGTH (p.20 item 24),
    // the swing that shares it, and VC MIX — which p.71 gives as `lo/mix 1 to hi/mix 2`, a range
    // with named ends and no numbers in it. Authoring any of them means inventing a range, so
    // none of them is a rendered value. VC MIX is still a patch *destination*; that is the jack,
    // not the knob.
    const uncited = ['TEMPO', 'TEMPO/GATE LENGTH', 'GATE LENGTH', 'SWING', 'VC MIX', 'RATCHET']
    for (const recipe of device.recipes) {
      for (const name of uncited) expect(paramNamed(recipe, name), `${recipe.id} / ${name}`).toBeUndefined()
    }
    // And the jack for it is declared, so this is an omission of the *value*, not of the control.
    expect((device.jacks ?? []).map((j) => j.id)).toContain('IN · VC MIX')
  })

  it('qualifies the two names the panel prints twice', () => {
    // SHAPE is silkscreened in both the oscillator and the modulation sections, MOD SOURCE in
    // both the oscillator and the filter. Two rows of a rendered guide carrying one name and
    // meaning different things is the jack problem again, one layer up. The qualifier is the
    // specification table's own section heading (p.70), so both halves come off the page.
    const names = new Set(device.recipes.flatMap((r) => params(r).map((p) => p.name)))
    expect(names.has('SHAPE')).toBe(false)
    expect(names.has('MOD SOURCE')).toBe(false)
    expect(names.has('VCO SHAPE')).toBe(true)
    expect(names.has('LFO SHAPE')).toBe(true)
    expect(names.has('VCO MOD SOURCE')).toBe(true)
    expect(names.has('VCF MOD SOURCE')).toBe(true)
  })

  it('names the ASSIGN mode wherever it patches the ASSIGN output', () => {
    // p.21 describes item 69 in full as "assign output". p.63 lists the sixteen things it can
    // carry. A recipe that patches it without saying which is asking the reader to guess.
    for (const recipe of device.recipes) {
      const patchesAssign = (recipe.patch ?? []).some((e) => e.from === 'OUT · ASSIGN')
      if (!patchesAssign) continue
      const mode = paramNamed(recipe, 'ASSIGN MODE')
      expect(mode?.kind, recipe.id).toBe('enum')
      if (mode?.kind !== 'enum') continue
      expect(mode.options.values.length, recipe.id).toBe(16)
      expect(mode.options.verified, recipe.id).toMatchObject({ source: `${GUIDE}63` })
    }
    expect(device.recipes.some((r) => (r.patch ?? []).some((e) => e.from === 'OUT · ASSIGN'))).toBe(true)
  })

  // -------------------------------------------------------------------------
  // §7.4 / rig integration
  // -------------------------------------------------------------------------

  it('receives clock and does not claim to send it', () => {
    // Receive is explicit: p.20 item 24, the TEMPO control sets the clock division "if USB or
    // MIDI clock is used". Send is absent from the document — MIDI OUT/THRU only "passes through
    // MIDI data received at the MIDI INPUT" (p.21 item 39), and the patchbay has no clock output
    // among its fifteen.
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.canSendClock).toBe(false)
    expect(device.clock.transport).toEqual(['midi-din', 'usb'])
    // So it can never be a clock source, however alone it is, and never claims a preference.
    expect(device.clock.preferredSource).toBeUndefined()
    expect(selectClockSource([device], new Map())).toBeUndefined()
    expect(selectClockSource([device, tr1000], new Map())?.deviceId).toBe(tr1000.id)
  })

  it('renders in a rig, cables and all', () => {
    const template = TEMPLATES[0]
    if (template === undefined) throw new Error('no templates')
    const doc = renderGuide(resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed: 1 }))
    expect(doc).toContain('CRAVE')
    // A rig of one box that cannot send clock is a real rig, and §7.4 says so rather than
    // nominating something that cannot do it.
    expect(doc).toContain('nothing in this rig can send clock')
    // The cables reach the page, with the out-to-in reading intact.
    expect(doc).toContain('OUT · ')
    expect(doc).toContain('IN · ')
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
  })

  it('addresses no steps at all, because patterns are the template\'s (§4.3)', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
    expect(device.recipes.every((r) => r.articulation === undefined)).toBe(true)
    // And it declares no per-step vocabulary, because the guide enumerates none.
    expect(device.features).toBeUndefined()
  })
})
