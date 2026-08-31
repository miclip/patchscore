import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  resolve,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitakt/index'
import { device as digitaktII } from '../lib/devices/elektron-digitakt-ii/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Digitakt is the near-clone that inverts its successor, and this file guards the four places
 * where copying the sibling would have produced something that reads correct and is not.
 *
 *  1. **The manual prints scales**, so the manifest is numeric-dominated where the successor's is
 *     enum-dominated. That makes range provenance the load-bearing claim here rather than an
 *     afterthought, and it is asserted exhaustively.
 *  2. **One knob has two printed scales.** p.44's RESO/GAIN is resonance beside a filter `TYPE`
 *     and EQ gain beside an EQ one, on two different ranges. `CLAUDE.md`'s standing rule is that
 *     the recipe carries the switch; the test is that it always does, in both directions.
 *  3. **`PLAY` is printed once per machine, on four pages**, with the same four values each time —
 *     so a citation can be wrong while looking right. Every `PLAY` is checked against the page for
 *     the machine its own recipe selects.
 *  4. **The pool is eight and the MIDI tracks are not in it**, where the successor's sixteen are
 *     one pool. A pool of sixteen here would claim eight voices this box does not have.
 *
 * It also pins the boundary `ARTICULABLE_PER_STEP` draws, because that constant is the manifest's
 * own statement of what §4.3 can carry on this box and a test that restated it would prove
 * nothing.
 */

const MANUAL = 'Digitakt User Manual OS 1.51, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

/** The value of an enum param, or undefined if the recipe does not carry it. */
function choice(recipe: Recipe, name: string): string | undefined {
  const p = named(recipe, name)
  return p !== undefined && p.kind === 'enum' ? p.value : undefined
}

const EQ_TYPES = new Set(['EQ 1', 'EQ 2', 'EQ 3', 'EQ 4', 'EQ 5'])
const FILTER_TYPES = new Set(['2-pole Lowpass', '2-pole Highpass'])

describe('Digitakt manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('elektron-digitakt')
    expect(device.maker).toBe('Elektron')
    expect(device.kind).toBe('sampler')
  })

  // -------------------------------------------------------------------------
  // §2.2 — eight audio tracks, and the eight MIDI tracks that are not among them
  // -------------------------------------------------------------------------

  it('models eight audio tracks as one pool, and leaves the MIDI tracks out of it', () => {
    // p.17: "The Digitakt has eight audio tracks (TRK 1-8)" and, separately, "The Digitakt has
    // eight dedicated MIDI tracks (TRK 9-16)". p.16's data structure diagram draws them side by
    // side. They are hardware-separate, so the pool is eight — not the successor's sixteen, whose
    // tracks are audio *or* MIDI and therefore one pool.
    expect(device.voices).toHaveLength(1)
    const pool = device.voices[0]
    expect(pool?.kind).toBe('pool')
    expect(pool?.kind === 'pool' ? pool.count : 0).toBe(8)
    // Sixteen would be the sibling's answer, and here it would promise eight voices that do not
    // exist. Asserted as a refusal so a later "harmonise with the Digitakt II" edit fails loudly.
    expect(pool?.kind === 'pool' ? pool.count : 0).not.toBe(16)
    expect(digitaktII.voices[0]?.kind === 'pool' ? digitaktII.voices[0].count : 0).toBe(16)
  })

  it('sounds one note per track, which needs two pages rather than either alone', () => {
    // "Each audio track contains one sample" (p.17) permits a polyphonic sampler on its own; p.15
    // gives the architecture as "eight audio voices", and eight across eight is one each.
    expect(device.voices[0]?.polyphony).toBe(1)
    // A pool track is whatever is loaded into it, so it carries the whole role vocabulary.
    expect([...(device.voices[0]?.roles ?? [])].sort()).toEqual([...ROLES].sort())
  })

  it('is comfortable below its own track count, on a reason that is not the sibling’s', () => {
    // The successor holds back four of sixteen because a MIDI track costs an audio track there.
    // That is not true here, so the number cannot be reached the same way — see the manifest.
    expect(device.comfortableVoices).toBe(7)
    expect(device.comfortableVoices).toBeLessThan(8)
  })

  // -------------------------------------------------------------------------
  // §3.1 — this manual prints scales, so provenance is asserted exhaustively
  // -------------------------------------------------------------------------

  it('cites a range for every numeric and an option list for every enum', () => {
    const counts = auditDevice(device).counts
    // The whole point of the box: the manual states its scales, so nothing here is an uncited
    // range. Points stay provisional, because which value inside a cited range a recipe reaches
    // for is taste (§3.2).
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.moodInert).toBe(0)
    // And it is a real quantity rather than a handful, which is what separates this manifest from
    // the sibling's three printed ranges.
    expect(counts.numerics).toBeGreaterThan(100)
  })

  it('cites every range to a page of this manual and nothing else', () => {
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        const claim = param.kind === 'numeric' ? param.range.verified : param.kind === 'enum' ? param.options.verified : undefined
        if (claim === undefined) continue
        expect(claim, `${recipe.id} ${param.name}`).not.toBe(false)
        if (claim !== false) {
          expect(claim.kind, `${recipe.id} ${param.name}`).toBe('manual')
          expect(claim.source, `${recipe.id} ${param.name}`).toContain('Digitakt User Manual OS 1.51')
        }
      }
    }
  })

  // -------------------------------------------------------------------------
  // The two-scale knob: p.44's RESO/GAIN
  // -------------------------------------------------------------------------

  it('never lets RESO or GAIN travel without the TYPE that decides which one it is', () => {
    // p.44 prints both scales in one entry: resonance 0.00-127.00, EQ gain -64.00-63.00. Which is
    // in force is decided by TYPE on the same page. A value read off the wrong one is invented
    // however carefully the citation beside it is written (CLAUDE.md), so the pairing is the test.
    for (const recipe of device.recipes) {
      const reso = named(recipe, 'RESO')
      const gain = named(recipe, 'GAIN')
      if (reso === undefined && gain === undefined) continue
      const type = choice(recipe, 'TYPE')
      expect(type, `${recipe.id} touches the RESO/GAIN knob with no TYPE`).toBeDefined()
      if (reso !== undefined) {
        expect(FILTER_TYPES.has(type ?? ''), `${recipe.id} sets RESO under TYPE ${String(type)}`).toBe(true)
      }
      if (gain !== undefined) {
        expect(EQ_TYPES.has(type ?? ''), `${recipe.id} sets GAIN under TYPE ${String(type)}`).toBe(true)
      }
      // And never both at once: it is one knob.
      expect(reso === undefined || gain === undefined, recipe.id).toBe(true)
    }
  })

  it('gives the two halves of that knob the two ranges the page prints', () => {
    const reso = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === 'RESO')
    const gain = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === 'GAIN')
    expect(reso.length).toBeGreaterThan(0)
    expect(gain.length).toBeGreaterThan(0)
    for (const p of reso) if (p.kind === 'numeric') expect(p.range).toMatchObject({ min: 0, max: 127 })
    for (const p of gain) if (p.kind === 'numeric') expect(p.range).toMatchObject({ min: -64, max: 63 })
    // Both cite p.44, because both are printed in the same entry.
    for (const p of [...reso, ...gain]) {
      if (p.kind === 'numeric') expect(p.range.verified).toEqual({ kind: 'manual', source: `${MANUAL}44` })
    }
  })

  // -------------------------------------------------------------------------
  // PLAY: the same four values on four pages
  // -------------------------------------------------------------------------

  it('cites each PLAY to its own machine’s page, not to a sibling machine’s', () => {
    // A.2.2 p.82 (Oneshot), A.3.2 p.84 (Werp), A.4.1 p.85 (Repitch), A.5.2 p.86 (Slice). The four
    // values are identical on all four pages, so a wrong page agrees with the value and hides.
    const page: Record<string, number> = { ONESHOT: 82, WERP: 84, REPITCH: 85, SLICE: 86 }
    let checked = 0
    for (const recipe of device.recipes) {
      const play = named(recipe, 'PLAY')
      if (play === undefined || play.kind !== 'enum') continue
      const machine = choice(recipe, 'MACHINE')
      expect(machine, `${recipe.id} sets PLAY with no MACHINE`).toBeDefined()
      const want = page[machine ?? '']
      expect(want, `${recipe.id} selects an unknown machine`).toBeDefined()
      expect(play.options.verified, `${recipe.id} PLAY`).toEqual({
        kind: 'manual',
        source: `${MANUAL}${String(want)}`,
      })
      checked++
    }
    // Every recipe selects a machine and a play mode, so this covers the whole file.
    expect(checked).toBe(device.recipes.length)
  })

  it('cites the MACHINE list to the span that prints it, not to one heading', () => {
    // The four names are section headings on four different pages — A.2 p.82, A.3 p.83, A.4 p.85,
    // A.5 p.86 — so no single page carries the list. p.82's A.1 gives only the menu that opens it.
    for (const recipe of device.recipes) {
      const m = named(recipe, 'MACHINE')
      expect(m, recipe.id).toBeDefined()
      if (m === undefined || m.kind !== 'enum') throw new Error(`${recipe.id} MACHINE`)
      expect(m.options.verified, recipe.id).toEqual({
        kind: 'manual',
        source: 'Digitakt User Manual OS 1.51, pp.82-87',
      })
      expect(m.options.values).toEqual(['ONESHOT', 'WERP', 'REPITCH', 'SLICE'])
      // Never a bare page: p.82 alone would be the Oneshot heading standing in for the list.
      const claim = m.options.verified
      expect(claim !== undefined && claim !== false ? claim.source : '').not.toBe(`${MANUAL}82`)
    }
  })

  it('spells MULT so the family cannot come apart from the factor', () => {
    // p.47 describes two families — the current tempo, or a fixed 120 BPM — and p.49's table gives
    // twelve factors under a caption scoping it to "MULT (set to a BPM value)". Authoring the bare
    // factor would be a number off a scale that may not be in force, the RESO/GAIN trap again.
    // p.47's own screen graphic draws the field as `BPM` over `16`, so the family is part of the
    // token and a value here carries its own switch.
    const mults = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === 'MULT')
    expect(mults.length).toBeGreaterThan(0)
    for (const p of mults) {
      if (p.kind !== 'enum') throw new Error('MULT is an enum')
      expect(p.value, 'the family is part of the token').toMatch(/^BPM /)
      for (const option of p.options.values) expect(option).toMatch(/^BPM /)
      expect(p.options.values).toHaveLength(12)
      // Both pages, because the claim needs both halves: p.47 for the prefix, p.49 for the factors.
      expect(p.options.verified).toEqual({
        kind: 'manual',
        source: 'Digitakt User Manual OS 1.51, p.47, p.49',
      })
    }
  })

  it('reaches three of the four machines, across at least two PLAY pages', () => {
    const used = new Set(device.recipes.map((r) => choice(r, 'MACHINE')))
    expect([...used].sort()).toEqual(['ONESHOT', 'SLICE', 'WERP'])
    // Repitch is in the option set and reached by nothing, which the manifest explains rather than
    // leaving as an omission: it and Werp do the same job and differ in what they spend.
    expect(used.has('REPITCH')).toBe(false)
  })

  it('never asks the Repitch machine for a TUNE it does not have', () => {
    // p.85 lists Repitch's parameters and TUNE is not among them. The sub, bass and tom recipes
    // transpose, so they are on ONESHOT.
    for (const recipe of device.recipes) {
      if (named(recipe, 'TUNE') === undefined) continue
      expect(choice(recipe, 'MACHINE'), `${recipe.id} tunes`).not.toBe('REPITCH')
    }
  })

  // -------------------------------------------------------------------------
  // The LFO: a modulator with no destination modulates nothing
  // -------------------------------------------------------------------------

  it('gives every LFO a destination, a speed and a multiplier', () => {
    let lfos = 0
    for (const recipe of device.recipes) {
      if (named(recipe, 'LFO MODE') === undefined) continue
      lfos++
      for (const required of ['DEST', 'WAVE', 'SPD', 'MULT', 'DEP']) {
        expect(named(recipe, required), `${recipe.id} sets an LFO with no ${required}`).toBeDefined()
      }
    }
    expect(lfos).toBeGreaterThan(0)
  })

  it('authors a start phase for exactly the three modes that restart the cycle', () => {
    // p.48: PHAS "sets the point within the wave cycle where the LFO will start when it is
    // trigged", so it means something only where a trig starts the cycle. Reading the five modes
    // on that page rather than treating FRE as the only exception:
    //
    //   TRG  "makes the LFO restart when a note is trigged"                          -> starts
    //   ONE  "starts when a note is trigged, then runs to the end ... and then stops" -> starts
    //   HLF  "starts when a note is trigged, then runs to the middle ... then stops"  -> starts
    //   FRE  "run continuously, never restarting or stopping even if notes are trigged"
    //   HLD  "run free in the background, but when a note is trigged the LFO output level is
    //        latched and held still" — a trig samples it; it does not restart the cycle
    //
    // So HLD belongs with FRE, and an earlier version of this test had it with the other three.
    // Nothing here uses HLD today, which is exactly why the rule had to be read off the page
    // instead of inferred from the recipes that happen to exist.
    const RESTARTS = new Set(['TRG', 'ONE', 'HLF'])
    let seen = 0
    for (const recipe of device.recipes) {
      const mode = choice(recipe, 'LFO MODE')
      if (mode === undefined) continue
      seen++
      const hasPhase = named(recipe, 'PHAS') !== undefined
      expect(hasPhase, `${recipe.id} LFO MODE ${mode}`).toBe(RESTARTS.has(mode))
    }
    expect(seen).toBeGreaterThan(0)
    // And the modes named here are the ones the manifest offers, so a renamed mode fails loudly
    // rather than quietly falling into the FRE branch.
    const offered = new Set(
      device.recipes.flatMap((r) => {
        const p = named(r, 'LFO MODE')
        return p !== undefined && p.kind === 'enum' ? p.options.values : []
      }),
    )
    for (const m of RESTARTS) expect(offered.has(m), m).toBe(true)
    expect([...offered].sort()).toEqual(['FRE', 'HLD', 'HLF', 'ONE', 'TRG'])
  })

  it('picks LFO destinations the audio-track column actually offers', () => {
    // APPENDIX C p.92, and only the AUDIO TRACKS column: the MIDI TRACKS column belongs to the
    // eight MIDI tracks, which are not assignables here. The seven "(Only available for LFO2)"
    // entries are excluded because every recipe writes LFO page 1.
    for (const recipe of device.recipes) {
      const p = named(recipe, 'DEST')
      if (p === undefined || p.kind !== 'enum') continue
      expect(p.options.values, recipe.id).toContain(p.value)
      for (const option of p.options.values) {
        expect(option, `${recipe.id} DEST`).not.toContain('Only available for LFO2')
        expect(option, `${recipe.id} DEST`).not.toMatch(/^CC: /)
      }
    }
  })

  // -------------------------------------------------------------------------
  // §4.3 — the articulation boundary, as the manifest draws it
  // -------------------------------------------------------------------------

  it('articulates only inside the subset it declares articulable', () => {
    const allowed = new Set<string>(ARTICULABLE_PER_STEP)
    const declared = new Set(device.features?.perStep ?? [])
    // The articulable set is a subset of what the box does, never equal to it.
    for (const key of allowed) expect(declared.has(key), key).toBe(true)
    expect(allowed.size).toBeLessThan(declared.size)
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(allowed.has(key), `${recipe.id} articulates ${key}`).toBe(true)
        }
      }
    }
  })

  it('declares the four stateful or unknowable per-step features and reaches none of them', () => {
    // condition and fill depend on evaluation order or on global runtime state (pp.38-39); a
    // sample lock and a sound lock would each need the name of something nobody can know
    // (p.37, p.83). Declared because the box does them; unreachable because §4.3 cannot carry
    // them honestly. Invariant 5: the gap is shown, not approximated.
    const declared = new Set(device.features?.perStep ?? [])
    const allowed = new Set<string>(ARTICULABLE_PER_STEP)
    const unreachable = [...declared].filter((k) => !allowed.has(k)).sort()
    expect(unreachable).toEqual(['condition', 'fill', 'sample-lock', 'sound-lock'])
  })

  // -------------------------------------------------------------------------
  // §2.6 — capability evidence
  // -------------------------------------------------------------------------

  it('carries a jack citation for every jack it declares', () => {
    // DeviceSchema enforces this, so the assertion is that the jacks exist to be cited: the rear
    // panel is nine connectors (p.14) less the power inlet, the switch and the bidirectional USB.
    const ids = (device.jacks ?? []).map((j) => j.id)
    expect(ids).toHaveLength(8)
    for (const id of ids) expect(device.capabilityEvidence?.[`jacks[${id}]`], id).toBeDefined()
    // Exactly one socket carries clock out per transport, or the rack draws a choice.
    const clockOut = (device.jacks ?? []).filter((j) => j.direction === 'out' && (j.clock ?? []).length > 0)
    expect(clockOut.map((j) => j.id)).toEqual(['MIDI OUT/SYNC A'])
  })

  it('sends DIN sync it cannot receive, and says so with the two lists', () => {
    // p.81: "MIDI In/Out/Thru with DIN Sync out". p.14 names two outbound SYNC ports and no
    // inbound one.
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'din-sync'])
    expect(device.clock.receiveTransport).toEqual(['midi-din', 'usb'])
    expect(device.clock.preferredSource).toBeUndefined()
    expect(device.capabilityEvidence?.['clock.preferredSource']).toMatchObject({ kind: 'unknown' })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, measured off the figure's vector geometry
  // -------------------------------------------------------------------------

  it('spans 215 x 176 mm in playing orientation, cited to the specifications page', () => {
    // p.81: `Dimensions: W 215 × D 176 × H 63 mm`. For a desktop box lying flat the rise is the
    // manufacturer's depth; 63 mm is how far off the desk it stands.
    expect(device.physical.panelSpanMm).toBe(215)
    expect(device.panel?.panelRiseMm).toBe(176)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}81` })
    expect(device.panel?.panelRiseMm).not.toBe(63)
    // The drawn figure's aspect against the specification's, to the precision the vector pass
    // actually achieved: 362.921875 / 297.089843 = 1.221590 against 215 / 176 = 1.221591.
    const span = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
    expect(Math.abs(span - 362.921875 / 297.089843)).toBeLessThan(1e-5)
  })

  it('keeps every feature inside the panel', () => {
    for (const f of device.panel?.features ?? []) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(215)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(176)
    }
  })

  it('puts the voice field on the eight audio [TRIG] keys, not on all sixteen', () => {
    // p.17 splits the rows: TRK 1-8 are the audio tracks, TRK 9-16 are dedicated MIDI tracks, and
    // the silkscreen splits them too. A field over both rows — which is right on the successor,
    // where the sixteen are one pool — would put a readout on eight keys that sound nothing.
    const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
    expect(fields).toHaveLength(1)
    const field = fields[0]
    if (field?.kind !== 'voices') throw new Error('no voice field')
    // One row of eight keys 17.5 mm square, so the field is one key deep and eight cells wide.
    expect(field.h).toBeCloseTo(17.5, 5)
    expect(field.w / field.h).toBeGreaterThan(8)
    // And it does not reach the second row, whose keys are centred at y 158.
    expect(field.y + field.h).toBeLessThan(149.25)
    // The MIDI row is drawn beside it as a plain grid of eight.
    const midi = (device.panel?.features ?? []).find((f) => f.kind === 'grid' && f.label === 'MIDI TRACK')
    expect(midi?.kind === 'grid' ? midi.cols : 0).toBe(8)
  })

  it('draws every key as a rounded rectangle, because every key is one', () => {
    // The figure's path data settles this: a knob is four bezier arcs and no straights, a key is
    // four arcs and four straights. The four menu keys read as circles at a glance and are not.
    const round = (device.panel?.features ?? []).filter((f) => f.kind === 'button' && f.round === true)
    expect(round).toHaveLength(0)
    const knobs = (device.panel?.features ?? []).filter((f) => f.kind === 'knob')
    // Ten circles: MASTER VOLUME, LEVEL/DATA and DATA ENTRY A-H, all 13.0 mm.
    expect(knobs).toHaveLength(10)
    for (const k of knobs) if (k.kind === 'knob') expect(k.d).toBe(13.0)
  })

  it('draws exactly the census the figure supports, kind by kind', () => {
    // A census rather than a spot check: a feature quietly added or dropped moves a number here,
    // and the numbers are what the figure's own vector paths contain.
    const by = new Map<string, number>()
    for (const f of device.panel?.features ?? []) by.set(f.kind, (by.get(f.kind) ?? 0) + 1)
    expect(Object.fromEntries([...by].sort())).toEqual({
      // MASTER VOLUME, LEVEL/DATA, and DATA ENTRY A-H — the ten `C=4 L=0` circles.
      knob: 10,
      // Five [PARAMETER], four menu, FUNC/TRK/PTN/BANK, three transport, YES/NO, four arrows, PAGE.
      button: 23,
      // Ten rear-panel names, two Sync lines, and the headphone socket the figure draws as a symbol.
      label: 13,
      // The five stroked cluster outlines, and no sixth around the connector names.
      group: 5,
      screen: 1,
      voices: 1,
      grid: 1,
    })
    // Nonzero and exact on the one kind a silent regression would empty: every key must survive.
    expect(by.get('button')).toBeGreaterThan(0)
  })

  it('places the measured features where the figure\u2019s paths put them', () => {
    const at = (kind: string, label: string) =>
      (device.panel?.features ?? []).find((f) => f.kind === kind && 'label' in f && f.label === label)
    // Knobs are quoted by centre in the source and stored as a bounding box, so a helper that
    // stopped converting would show up here rather than as a panel that merely looks odd.
    const vol = at('knob', 'MASTER VOLUME')
    expect(vol?.kind === 'knob' ? [vol.x, vol.y, vol.d] : []).toEqual([17.5 - 6.5, 32.5 - 6.5, 13.0])
    const dataH = at('knob', 'H')
    expect(dataH?.kind === 'knob' ? [dataH.x, dataH.y, dataH.d] : []).toEqual([197.51 - 6.5, 57.5 - 6.5, 13.0])
    // Wide keys are 17.5 x 11.15 and small keys 11.15 square, both round numbers off the vector pass.
    const page = at('button', 'PAGE')
    expect(page?.kind === 'button' ? [page.w, page.h] : []).toEqual([17.5, 11.15])
    const trig = at('button', 'TRIG')
    expect(trig?.kind === 'button' ? [trig.w, trig.h] : []).toEqual([11.15, 11.15])
    // The screen is the display content's own bounding box, and its aspect is the check that says
    // so: 57.25 / 28.63 = 2.00 against the 128 x 64 pixel OLED p.81 specifies.
    const screen = (device.panel?.features ?? []).find((f) => f.kind === 'screen')
    if (screen?.kind !== 'screen') throw new Error('no screen')
    expect(Math.abs(screen.w / screen.h - 2)).toBeLessThan(0.01)
  })

  it('takes the [TRIG] rows from the row the figure draws, not from the key pitch', () => {
    // The keys are 17.5 mm square with centres 48.04 .. 194.96, so the row runs 39.29 to 203.71 —
    // and the stroked outline around both rows is x 39.29 w 164.44, agreeing to two decimals.
    // A box derived from the 20.9886 mm centre pitch instead would be x 37.55 w 167.91: wider than
    // anything the figure draws, on an argument about a renderer convention that does not exist.
    const field = (device.panel?.features ?? []).find((f) => f.kind === 'voices')
    const midi = (device.panel?.features ?? []).find((f) => f.kind === 'grid')
    if (field?.kind !== 'voices' || midi?.kind !== 'grid') throw new Error('no rows')
    for (const row of [field, midi]) {
      expect(row.x).toBeCloseTo(48.04 - 17.5 / 2, 2)
      expect(row.x + row.w).toBeCloseTo(194.96 + 17.5 / 2, 1)
      expect(row.h).toBe(17.5)
      expect(row.x).not.toBeCloseTo(37.55, 1)
    }
    // Row centres 22.5 mm apart, and the two boxes do not overlap.
    expect(midi.y - field.y).toBeCloseTo(22.5, 5)
    expect(field.y + field.h).toBeLessThanOrEqual(midi.y)
  })

  it('draws no indicator as though it were a control', () => {
    // The <PATTERN PAGE> LEDs and the keyboard LED are 3.11 mm circles in the figure. There is no
    // PanelFeature kind for an indicator, and a grid of pads there would put five controls on the
    // panel that nobody can press — so they are left out rather than approximated. The smallest
    // thing drawn here is an 11.15 mm key, which is comfortably clear of an LED.
    for (const f of device.panel?.features ?? []) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 99 : f.w
      expect(w, JSON.stringify(f)).toBeGreaterThan(5)
    }
  })

  // -------------------------------------------------------------------------
  // §8 — what the guide says
  // -------------------------------------------------------------------------

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThan(9)
    }
  })

  it('resolves onto a real direction and carries its values through', () => {
    const result = resolve({
      devices: [device],
      template: TEMPLATES[0] as never,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    expect(result.assignments.length).toBeGreaterThan(0)
    // Nothing this box plays is invented: every rendered value is authored or derived from a
    // cited range, never fabricated (invariant 4).
    for (const a of result.assignments) {
      for (const p of a.params) {
        expect(['authored', 'derived', 'provisional']).toContain(p.provenance.state)
      }
    }
  })
})
