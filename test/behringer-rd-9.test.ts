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
import { device } from '../lib/devices/behringer-rd-9/index'
import { device as tr1000 } from '../lib/devices/roland-tr-1000/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The RD-9 is the second Behringer box in the library and the first one documented by a real
 * user manual rather than a multilingual quick-start. That changes what is worth testing.
 *
 * The Crave's file is about *scarcity* — thirteen printed ranges, and the discipline is what was
 * left out. This manual has the opposite shape: it is generous with sequencer numbers and silent
 * on every voice pot, so the discipline here is that the two halves stay apart. A cited range on
 * `SWING` and a `% travel` on `DECAY` are both honest; a cited range on `DECAY` would not be.
 *
 * The other half is the trap this box actually walked into. `SWING` is printed three times with
 * two different ranges — `50 – 75 %` in the Global table (p.23) and `25% - 75%` in the Pattern
 * table (p.28) — and which one is in force is decided by a preference on p.22. That is the
 * authoring guide's "a cited range can still be the wrong range" in its purest form, and the
 * pairing test below is what stops it coming apart.
 */

const MANUAL = 'RD-9 User Manual V 1.0, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('RD-9 manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('behringer-rd-9')
    expect(device.kind).toBe('drum-machine')
    expect(device.maker).toBe('Behringer')
  })

  // -------------------------------------------------------------------------
  // §3.1/§3.2 — the two halves of the document
  // -------------------------------------------------------------------------

  it('cites every range it can and invents none of the ones it cannot', () => {
    // The four control ranges the Specifications table prints (p.33), plus the sequencer
    // parameters (pp.19-28). Everything else on the panel is a `% travel` position.
    const cited = new Map<string, { min: number; max: number; page: number }>([
      ['CUTOFF', { min: 10, max: 15000, page: 33 }],
      ['RESONANCE', { min: 0, max: 10, page: 33 }],
      ['WAVE DESIGNER ATTACK', { min: -15, max: 15, page: 33 }],
      ['WAVE DESIGNER SUSTAIN', { min: -24, max: 24, page: 33 }],
      ['SWING', { min: 25, max: 75, page: 28 }],
      ['PROB', { min: 0, max: 100, page: 28 }],
    ])
    // The twelve voice pots. p.8, p.10 and p.11 describe every one of them in words — "turn CCW
    // for shorter, CW for longer" — and no page in 38 gives any of them a scale.
    const unscaled = [
      'TUNE', 'TUNING', 'DECAY', 'TONE', 'SNAPPY', 'LEVEL',
      'ATTACK', 'PITCH', 'PITCH DEPTH', 'CH DECAY', 'OH DECAY', 'CRASH TUNE', 'RIDE TUNE',
    ]
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
    // Nothing is authored as a point, so every point renders provisional (invariant 4/5).
    expect(auditDevice(device).counts.moodInert).toBe(0)
  })

  it('pairs SWING with the preference that decides which printed range applies', () => {
    // p.23's Global table says `50 – 75 %`; p.28's Pattern table says `25% - 75%`. They are not
    // two readings of one range — p.22's Swing Preference selects between the stored copies. So
    // the range cited beside the value has to be the one the preference in force actually
    // prints, and the only way that survives is for both to be in the same recipe.
    for (const recipe of device.recipes) {
      const swing = paramNamed(recipe, 'SWING')
      const preference = paramNamed(recipe, 'SWING PREFERENCE')
      expect(swing?.kind, recipe.id).toBe('numeric')
      expect(preference?.kind, recipe.id).toBe('enum')
      if (swing?.kind !== 'numeric' || preference?.kind !== 'enum') continue
      expect(preference.value, recipe.id).toBe('Pattern')
      expect(preference.options.values, recipe.id).toEqual(['Song', 'Global', 'Pattern'])
      expect(preference.options.verified, recipe.id).toMatchObject({ source: `${MANUAL}22` })
      // The Pattern table's range, not the Global table's.
      expect(swing.range.min, recipe.id).toBe(25)
      expect(swing.range.verified, recipe.id).toMatchObject({ source: `${MANUAL}28` })
    }
    // The same shape for the other two, for the same reason.
    for (const recipe of device.recipes) {
      expect(paramNamed(recipe, 'PROB PREFERENCE')?.kind, recipe.id).toBe('enum')
      expect(paramNamed(recipe, 'STEP SIZE PREFERENCE')?.kind, recipe.id).toBe('enum')
    }
  })

  it('carries ENHANCED MODE wherever it sets a control that switch gates', () => {
    // p.10: "PITCH DEPTH and PITCH are only active with enhanced mode on", and the hi-hat TUNE
    // "controls the frequency of the hats with ENHANCED MODE on". A knob position for a knob
    // that is switched out is not a setting, it is a reader wondering why nothing happened.
    const gated = ['PITCH', 'PITCH DEPTH']
    let checked = 0
    for (const recipe of device.recipes) {
      const touchesGated =
        gated.some((n) => paramNamed(recipe, n) !== undefined) ||
        ((recipe.voice === 'ch' || recipe.voice === 'oh') && paramNamed(recipe, 'TUNE') !== undefined)
      if (!touchesGated) continue
      const mode = paramNamed(recipe, 'ENHANCED MODE')
      expect(mode?.kind, recipe.id).toBe('enum')
      if (mode?.kind !== 'enum') continue
      expect(mode.value, recipe.id).toBe('On')
      // p.17's prose, not p.21's table — that table's Values column is shifted by a row and
      // gives Enhanced Mode `0 – Hold, 1 – Loop, 2 – Stop`, which belongs to Song Chain Mode.
      expect(mode.options.verified, recipe.id).toMatchObject({ source: `${MANUAL}17` })
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('never cites the MAP table, which is the RD-8’s voice list', () => {
    // p.17's eleven rows include a Cowbell and a Cymbal — 808 voices — and no Crash or Ride, on
    // a box whose own Specifications table and voice-select buttons say otherwise. It is the
    // sibling's table left in place, so nothing here may rest on it.
    const source = JSON.stringify(device)
    expect(source.toLowerCase()).not.toContain('cowbell')
    expect(source.toLowerCase()).not.toContain('conga')
    expect(source.toLowerCase()).not.toContain('claves')
    expect(source.toLowerCase()).not.toContain('maracas')
    // And no MIDI note number anywhere, which is the only thing that table is for.
    expect(source).not.toContain('MIDI Note')
    // The voices are the Specifications table's and the panel's.
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'lt', 'mt', 'ht', 'rim', 'clap', 'ch', 'oh', 'crash', 'ride',
    ])
    expect(evidenceFor(device, 'voices')).toMatchObject({ source: `${MANUAL}33` })
  })

  // -------------------------------------------------------------------------
  // §2.6 — capabilities
  // -------------------------------------------------------------------------

  it('cites every declared jack, and declares no socket for the USB port', () => {
    for (const jack of device.jacks ?? []) {
      expect(evidenceFor(device, jackFact(jack.id)), jack.id).toBeDefined()
    }
    const ids = (device.jacks ?? []).map((j) => j.id)
    // Ten individual outs for eleven voices: the two hats share one jack (p.9 item 75).
    expect(ids.filter((id) => id.startsWith('OUT · ') && id !== 'OUT · MONO')).toHaveLength(10)
    expect(ids).toContain('OUT · HI HAT')
    expect(device.io.individualOuts).toBe(10)
    expect(device.io.main).toBe('mono')
    // USB is both directions at once, so it carries a sourceSetup and no socket (the TR-6S's
    // reading, and this box's p.16/p.19 say the same thing).
    expect(ids.some((id) => id.includes('USB'))).toBe(false)
    expect(device.clock.sourceSetup?.map((s) => s.transport)).toEqual([
      'midi-din', 'usb', 'analog-clock',
    ])
  })

  it('sends and receives clock, and claims no preference between the two', () => {
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock'])
    // p.6 has it leading a rig and p.29 has a DAW leading it. That is not a job stated.
    expect(device.clock.preferredSource).toBeUndefined()
    expect(evidenceFor(device, 'clock.preferredSource')).toMatchObject({ kind: 'unknown' })
  })

  it('answers the content question rather than leaving it silent', () => {
    // There is nothing to load: p.33 names all eleven sounds as fixed circuits and p.34's
    // storage rows are songs, patterns and steps. `cited-against` is the state for a document
    // that answers no, and it carries the page.
    expect(device.content).toBeUndefined()
    expect(evidenceFor(device, 'content')).toMatchObject({
      kind: 'cited-against',
      cite: { kind: 'manual', source: `${MANUAL}33` },
    })
    expect(device.recipes.every((r) => r.sourceAudio === undefined)).toBe(true)
  })

  it('draws its panel from the Quick Start Guide, which has the figure the manual lacks', () => {
    // **This test asserted the opposite until somebody found the right document.** §3's control
    // layout in the User Manual is eleven separate crops at eleven scales (pp.6-8) with no page
    // showing them together, and §15's hook-up diagram on p.30 spans the instrument but is a rear
    // elevation, so it locates sockets rather than knobs. Composing the crops would have been
    // estimated coordinates in everything but name, and this box sat in `UNDRAWN` on that reading.
    //
    // The Quick Start Guide prints a complete top view with the chassis outline on its p.8. One
    // figure, one scale, both axes — so the panel is measured rather than composed.
    expect(device.panel).toBeDefined()
    expect(device.panel?.verified).toMatchObject({ kind: 'manual' })
    expect(device.panel?.verified === false ? '' : device.panel?.verified.source).toContain(
      'Quick Start Guide',
    )

    // The span is measured off p.34's `78 x 477 x 264 mm (3.1 x 18.8 x 10.4")` — the inch
    // conversion confirms 477 mm is the W.
    expect(device.physical.panelSpanMm).toBe(477)
    expect(device.physical.verified).toMatchObject({ source: `${MANUAL}34` })

    /**
     * **The rise, and the check that says the drawing was read right.**
     *
     * 1387 px of drawn chassis against 2634 px of drawn width, anchored to the cited 477 mm, is
     * 251.2 mm — leaving 12.8 mm of the specification's 264 mm depth behind the top view, which is
     * the rear jack barrels and the sloped back edge.
     *
     * The RD-8 is the independent check: a different box, a different drawing, a different
     * document, and it leaves 13.6 mm of its own 265 mm depth outside its own top view. Two
     * siblings agreeing within a millimetre on a figure neither was fitted to is what makes this
     * a measurement rather than a plausible number.
     */
    expect(device.panel?.panelRiseMm).toBe(251.2)
    const outsideTheTopView = 264 - (device.panel?.panelRiseMm ?? 0)
    expect(outsideTheTopView).toBeGreaterThan(0)
    expect(outsideTheTopView).toBeLessThan(20)
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
        // Every gesture carries the page that documents it, not the recipe's inherited nothing.
        expect(entry.verified, recipe.id).toMatchObject({ kind: 'manual' })
        entries++
      }
    }
    expect(entries).toBeGreaterThan(0)
    // No absolute step indices, and no patterns: those are the template's (§4.3).
    const source = JSON.stringify(device)
    expect(source).not.toContain('"steps"')
    expect(source).not.toContain('"hits"')
  })

  it('terminates the citation chain on every recipe', () => {
    // No page says "these are the settings for a kick", so the inheritance §3.1 provides has to
    // stop somewhere explicit rather than quietly meaning something later.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
  })

  // -------------------------------------------------------------------------
  // §6 — mood
  // -------------------------------------------------------------------------

  it('moves the parameters whose ranges are cited, and only those', () => {
    const template = TEMPLATES[0]
    if (template === undefined) throw new Error('no templates')
    const swung = resolve({
      devices: [device, tr1000],
      template,
      mood: moodState({ swing: 100 }),
      seed: 1,
    })
    const straight = resolve({
      devices: [device, tr1000],
      template,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const swingOf = (r: ReturnType<typeof resolve>): number | undefined => {
      for (const a of r.assignments) {
        if (a.deviceId !== device.id) continue
        const p = a.params.find((q) => q.name === 'SWING')
        if (p !== undefined && typeof p.value === 'number') return p.value
      }
      return undefined
    }
    const before = swingOf(straight)
    const after = swingOf(swung)
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
    expect(doc).toContain('RD-9')
    // #107's block: the pattern's own settings, above the parts rather than under each one.
    expect(doc).toContain('Pattern-wide')
  })
})
