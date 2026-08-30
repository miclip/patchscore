import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  evidenceFor,
  jackFact,
  moodState,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/behringer-rd-8/index'
import { device as rd9 } from '../lib/devices/behringer-rd-9/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The RD-8 is the third Behringer box and the first **near-clone** in the library: it is the
 * RD-9's chassis with the 808 voice set, and `lib/devices/behringer-rd-8/index.ts` imports its
 * sibling to say so (invariant 2).
 *
 * That makes the risk here different from the RD-9's. That file's danger was a cited range read
 * off the wrong printed scale. This one's is a page number borrowed from the wrong book — a
 * citation that looks impeccable and points into a manual for a different machine. So the tests
 * below check the seam as hard as they check the values: no RD-9 page may appear anywhere in this
 * manifest, and the chassis map that couples the two must answer every fact the RD-9 declares.
 *
 * The second risk is the one the authoring guide names for the TR-8S: two sounds behind one set
 * of controls. Five columns here carry a switch, and a `LEVEL` on the RIM SHOT column means
 * nothing until you know whether it is a rim shot or claves.
 */

const MANUAL = 'RHYTHM DESIGNER RD-8 User Manual, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('RD-8 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('behringer-rd-8')
    expect(device.kind).toBe('drum-machine')
    expect(device.maker).toBe('Behringer')
  })

  // -------------------------------------------------------------------------
  // Invariant 2 — the seam with the sibling
  // -------------------------------------------------------------------------

  it('cites its own manual and never the RD-9’s', () => {
    // The whole hazard of authoring a near-clone in one sitting. Every page in this manifest was
    // read in the RD-8's book; a citation naming the sibling's would be a claim about a machine
    // that is not this one, and it would look exactly as trustworthy as the true ones.
    const source = JSON.stringify(device)
    expect(source).not.toContain('RD-9')
    for (const cite of source.match(/RHYTHM DESIGNER RD-8 User Manual, p\.\d+/g) ?? []) {
      const page = Number(cite.slice(cite.lastIndexOf('.') + 1))
      // 30 pages, and nothing worth citing on the cover.
      expect(page, cite).toBeGreaterThan(1)
      expect(page, cite).toBeLessThanOrEqual(30)
    }
  })

  it('answers every capability fact the RD-9 declares', () => {
    // This is the exhaustiveness the manifest's own `CHASSIS` map asserts at import, restated
    // where a reader will see it fail. The jack family is excluded on purpose and for a reason
    // that is itself a fact about the two boxes: eleven individual outs here against ten there,
    // and unassigned trigger outputs against three named ones, so no jack is shared.
    const theirs = Object.keys(rd9.capabilityEvidence ?? {}).filter((p) => !p.startsWith('jacks['))
    const ours = new Set(Object.keys(device.capabilityEvidence ?? {}))
    for (const path of theirs) expect(ours, path).toContain(path)
  })

  // -------------------------------------------------------------------------
  // §3.1/§3.2 — the two halves of the document
  // -------------------------------------------------------------------------

  it('cites every range it can and invents none of the ones it cannot', () => {
    // The four control ranges the Specifications table prints (p.26), plus the sequencer
    // parameters (pp.16-21). Everything else on the panel is a `% travel` position.
    const cited = new Map<string, { min: number; max: number; page: number }>([
      ['CUTOFF', { min: 10, max: 15000, page: 26 }],
      ['RESONANCE', { min: 0, max: 10, page: 26 }],
      ['WAVE DESIGNER ATTACK', { min: -15, max: 15, page: 26 }],
      ['WAVE DESIGNER SUSTAIN', { min: -24, max: 24, page: 26 }],
      ['SWING', { min: 50, max: 75, page: 21 }],
      ['PROB', { min: 0, max: 100, page: 21 }],
    ])
    // The six voice pots. pp.7 and 9 describe every one of them in words and p.26's Sound
    // Controls block lists them by name; no page in 30 gives any of them a scale.
    const unscaled = ['LEVEL', 'TUNING', 'TONE', 'DECAY', 'SNAPPY', 'OFFSET']
    let sawCited = 0
    let sawTravel = 0
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        const expected = cited.get(param.name)
        if (expected !== undefined) {
          expect(param.range.min, `${recipe.id} / ${param.name}`).toBe(expected.min)
          expect(param.range.max, `${recipe.id} / ${param.name}`).toBe(expected.max)
          expect(param.range.verified, `${recipe.id} / ${param.name}`).toMatchObject({
            kind: 'manual',
            source: `${MANUAL}${expected.page}`,
          })
          sawCited++
          continue
        }
        expect(unscaled, `${recipe.id} / ${param.name} is neither cited nor a travel position`)
          .toContain(param.name)
        // Both claims unverified, and no mood: a travel figure is taste, and mood arithmetic
        // inside bounds nobody checked would be arithmetic dressed as authority.
        expect(param.range, `${recipe.id} / ${param.name}`).toEqual({ min: 0, max: 100, verified: false })
        expect(param.unit, `${recipe.id} / ${param.name}`).toBe('% travel')
        expect(param.verified, `${recipe.id} / ${param.name}`).toBe(false)
        expect(param.mood, `${recipe.id} / ${param.name}`).toBeUndefined()
        sawTravel++
      }
    }
    expect(sawCited).toBeGreaterThan(0)
    expect(sawTravel).toBeGreaterThan(0)
    expect(auditDevice(device).counts.moodInert).toBe(0)
  })

  it('prints one SWING range, and still pairs it with the preference that selects the copy', () => {
    // The RD-9 prints `50 – 75 %` in its Global table and `25% - 75%` in its Pattern table, and
    // that disagreement is what its pairing test exists for. **This book prints one range** —
    // p.6, p.17, p.19 and p.21 all say 50 to 75, and `25%` does not occur in the document. The
    // pairing is kept anyway because p.18's preference still decides *which stored copy* plays,
    // and a reader who edits the pattern swing while the box is reading the global one has
    // changed nothing.
    for (const recipe of device.recipes) {
      const swing = paramNamed(recipe, 'SWING')
      const preference = paramNamed(recipe, 'SWING PREFERENCE')
      expect(swing?.kind, recipe.id).toBe('numeric')
      expect(preference?.kind, recipe.id).toBe('enum')
      if (swing?.kind !== 'numeric' || preference?.kind !== 'enum') continue
      expect(preference.value, recipe.id).toBe('Pattern')
      expect(preference.options.values, recipe.id).toEqual(['Song', 'Global', 'Pattern'])
      expect(preference.options.verified, recipe.id).toMatchObject({ source: `${MANUAL}18` })
      expect(swing.range.min, recipe.id).toBe(50)
      expect(swing.range.verified, recipe.id).toMatchObject({ source: `${MANUAL}21` })
    }
    for (const recipe of device.recipes) {
      expect(paramNamed(recipe, 'PROB PREFERENCE')?.kind, recipe.id).toBe('enum')
      expect(paramNamed(recipe, 'STEP SIZE PREFERENCE')?.kind, recipe.id).toBe('enum')
    }
  })

  it('carries VOICE SWITCH on every recipe whose column holds two sounds', () => {
    // p.9: five columns switch between a tom and a conga, a rim shot and claves, a hand clap and
    // maracas. They share a level knob, a sequencer track and an output jack, so a recipe that
    // names neither sound has told the reader nothing about what will play — the TR-8S's `SNAPPY`
    // trap in a different costume.
    const pairs: Record<string, [string, string]> = {
      lt: ['LOW TOM', 'LOW CONGA'],
      mt: ['MID TOM', 'MID CONGA'],
      ht: ['HI TOM', 'HI CONGA'],
      rs: ['RIM SHOT', 'CLAVES'],
      cp: ['HAND CLAP', 'MARACAS'],
    }
    let switched = 0
    for (const recipe of device.recipes) {
      const expected = pairs[recipe.voice ?? '']
      const declared = paramNamed(recipe, 'VOICE SWITCH')
      if (expected === undefined) {
        // And nowhere else: the other six voices have no switch, so claiming one would be a
        // control this box does not have.
        expect(declared, recipe.id).toBeUndefined()
        continue
      }
      expect(declared?.kind, recipe.id).toBe('enum')
      if (declared?.kind !== 'enum') continue
      expect(declared.options.values, recipe.id).toEqual(expected)
      expect(declared.options.values, recipe.id).toContain(declared.value)
      expect(declared.options.verified, recipe.id).toMatchObject({ source: `${MANUAL}9` })
      switched++
    }
    expect(switched).toBe(Object.keys(pairs).length + 1) // five columns, and two clap recipes
  })

  it('has no Enhanced Mode, because this box does not', () => {
    // The RD-9 gates `PITCH`, `PITCH DEPTH` and its hi-hat `TUNE` behind a preference and every
    // recipe touching one carries `ENHANCED MODE = On`. None of that exists here: the word does
    // not appear in 30 pages in that sense, and the bass drum's four controls are LEVEL, TONE,
    // DECAY and a TUNING knob in the ACCENT column (p.9).
    const source = JSON.stringify(device)
    expect(source).not.toContain('ENHANCED MODE')
    expect(source).not.toContain('PITCH DEPTH')
    const bass = device.recipes.filter((r) => r.voice === 'bd')
    expect(bass.length).toBeGreaterThan(0)
    for (const recipe of bass) {
      expect(paramNamed(recipe, 'ATTACK'), recipe.id).toBeUndefined()
      expect(paramNamed(recipe, 'TUNING')?.kind, recipe.id).toBe('numeric')
    }
  })

  // -------------------------------------------------------------------------
  // §2.6 — capabilities
  // -------------------------------------------------------------------------

  it('cites every declared jack, and declares no socket for the USB port', () => {
    for (const jack of device.jacks ?? []) {
      expect(evidenceFor(device, jackFact(jack.id)), jack.id).toBeDefined()
    }
    const ids = (device.jacks ?? []).map((j) => j.id)
    // Eleven individual outs for eleven voices, one each — where the RD-9's two hats share one.
    expect(ids.filter((id) => id.startsWith('OUT · ') && id !== 'OUT · MONO')).toHaveLength(11)
    expect(ids).toContain('OUT · CH')
    expect(ids).toContain('OUT · OH')
    expect(device.io.individualOuts).toBe(11)
    expect(device.io.main).toBe('mono')
    // Three trigger outputs, and the manual assigns none of them a voice (p.8, items 79-81).
    expect(ids.filter((id) => id.startsWith('TRIGGER OUT'))).toHaveLength(3)
    // USB is both directions at once, so it carries a sourceSetup and no socket.
    expect(ids.some((id) => id.includes('USB'))).toBe(false)
    expect(device.clock.sourceSetup?.map((s) => s.transport)).toEqual([
      'midi-din', 'usb', 'analog-clock',
    ])
  })

  it('sends and receives clock, and claims no preference between the two', () => {
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock'])
    // p.5 has it leading a rig and, one column later, being driven by a DAW. That is not a job
    // stated — and unlike the RD-9 there is no DAW Control chapter to settle it.
    expect(device.clock.preferredSource).toBeUndefined()
    expect(evidenceFor(device, 'clock.preferredSource')).toMatchObject({ kind: 'unknown' })
  })

  it('answers the content question rather than leaving it silent', () => {
    // p.26 gives all sixteen sounds as `Analog` and the storage rows as songs, patterns and
    // steps. There is nothing to load, so `cited-against` carries the page that says so.
    expect(device.content).toBeUndefined()
    expect(evidenceFor(device, 'content')).toMatchObject({
      kind: 'cited-against',
      cite: { kind: 'manual', source: `${MANUAL}26` },
    })
    expect(device.recipes.every((r) => r.sourceAudio === undefined)).toBe(true)
  })

  it('declares eleven voices for sixteen sounds', () => {
    // p.26: `Number of sounds  16` against `Number of simultaneous voices  11 (12 including
    // global accent)`. The five switched columns are one slot each, named as the panel names
    // them first, and ACCENT is not an assignable at all — it is the global emphasis track.
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'lt', 'mt', 'ht', 'rs', 'cp', 'cb', 'cy', 'oh', 'ch',
    ])
    expect(device.voices.every((v) => v.kind === 'fixed' && v.polyphony === 1)).toBe(true)
    expect(evidenceFor(device, 'voices')).toMatchObject({ source: `${MANUAL}26` })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel
  // -------------------------------------------------------------------------

  it('keeps every measured feature inside the panel it declares', () => {
    // The RD-9 draws no panel because its manual has no complete figure. This one's §15 set-up
    // example (p.24) prints a full top view, and `panel.ts` records the two checks that made it
    // measurable: parallel side edges, and twelve LEVEL knob caps that come out square rather
    // than elliptical. What is checked here is the arithmetic that follows from those.
    const panel = device.panel
    expect(panel).toBeDefined()
    if (panel === undefined) return
    const span = device.physical.panelSpanMm
    expect(span).toBe(498)
    expect(device.physical.verified).toMatchObject({ source: `${MANUAL}26` })
    expect(panel.verified).toMatchObject({ kind: 'manual' })
    // The rise is measured off the drawing rather than cited: p.26's 265 mm depth is the whole
    // chassis and the top view does not show all of it. The drawn aspect is what this claims.
    expect(panel.panelRiseMm).toBeCloseTo(251.4, 1)
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      const where = f.kind === 'label' ? `label ${f.text}` : `${f.kind} at ${f.x},${f.y}`
      expect(f.x, where).toBeGreaterThanOrEqual(0)
      expect(f.y, where).toBeGreaterThanOrEqual(0)
      expect(f.x + w, where).toBeLessThanOrEqual(span)
      expect(f.y + h, where).toBeLessThanOrEqual(panel.panelRiseMm)
    }
    // One `voices` field, over the voice-name block where this box selects a voice (p.7).
    const voiceFields = panel.features.filter((f) => f.kind === 'voices')
    expect(voiceFields).toHaveLength(1)
    // The three knob rows of the voice block, plus MASTER, PHONES and the four FX knobs.
    expect(panel.features.filter((f) => f.kind === 'knob')).toHaveLength(21)
    // The LEVEL row and the sixteen step keys are the two blocks of identical controls.
    expect(panel.features.filter((f) => f.kind === 'grid').map((f) => f.kind === 'grid' && f.cols))
      .toEqual([12, 16])
  })

  // -------------------------------------------------------------------------
  // §3/§4.3 — recipes and steps
  // -------------------------------------------------------------------------

  it('addresses steps by slot and only with lanes it declares', () => {
    const declared = new Set(device.features?.perStep ?? [])
    expect(declared.size).toBeGreaterThan(0)
    let entries = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) expect(declared, `${recipe.id} / ${key}`).toContain(key)
        expect(entry.verified, recipe.id).toMatchObject({ kind: 'manual' })
        entries++
      }
    }
    expect(entries).toBeGreaterThan(0)
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
  })

  it('gives every recipe a voice this device declares and a role that voice takes', () => {
    const voices = new Map(device.voices.map((v) => [v.id, v]))
    const ids = new Set<string>()
    for (const recipe of device.recipes) {
      expect(ids.has(recipe.id), recipe.id).toBe(false)
      ids.add(recipe.id)
      expect(recipe.id.startsWith('rd8-'), recipe.id).toBe(true)
      const voice = voices.get(recipe.voice ?? '')
      expect(voice, recipe.id).toBeDefined()
      expect(voice?.roles, recipe.id).toContain(recipe.role)
    }
    // §3: roughly 15-20 recipes covers a device, and there is no credit for padding past it.
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
  })

  it('terminates the citation chain on every recipe', () => {
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
    // Every hint a param or an articulation reaches for has to exist.
    const declared = new Set(Object.keys(device.hints ?? {}))
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.hint !== undefined) expect(declared, `${recipe.id} / ${param.hint}`).toContain(param.hint)
      }
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint !== undefined) expect(declared, `${recipe.id} / ${entry.hint}`).toContain(entry.hint)
      }
    }
  })

  // -------------------------------------------------------------------------
  // §6 — mood
  // -------------------------------------------------------------------------

  it('moves the parameters whose ranges are cited, and only those', () => {
    const template = TEMPLATES[0]
    if (template === undefined) throw new Error('no templates')
    const swingOf = (r: ReturnType<typeof resolve>): number | undefined => {
      for (const a of r.assignments) {
        if (a.deviceId !== device.id) continue
        const p = a.params.find((q) => q.name === 'SWING')
        if (p !== undefined && typeof p.value === 'number') return p.value
      }
      return undefined
    }
    const before = swingOf(
      resolve({ devices: [device, tr1000], template, mood: NEUTRAL_MOOD, seed: 1 }),
    )
    const after = swingOf(
      resolve({ devices: [device, tr1000], template, mood: moodState({ swing: 100 }), seed: 1 }),
    )
    if (before !== undefined && after !== undefined) {
      expect(before).toBe(50)
      expect(after).toBeGreaterThan(before)
      expect(after).toBeLessThanOrEqual(75)
    }
  })

  it('renders in a rig', () => {
    const template = TEMPLATES[0]
    if (template === undefined) throw new Error('no templates')
    const doc = renderGuide(resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed: 1 }))
    expect(doc).toContain('RD-8')
    expect(doc).toContain('Pattern-wide')
  })
})
