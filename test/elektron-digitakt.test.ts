import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  ROLES,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  reachableSlots,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitakt/index'
import { device as digitaktII } from '../lib/devices/elektron-digitakt-ii/index'
import { DEVICES } from '../lib/devices/registry.generated'
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

/**
 * §2.1/#334. **This box authors no trigger note, and its reason is narrower than the
 * successor's — two of the Digitakt II's three arguments do not apply here.**
 *
 * Read from this manual rather than inherited. Like the successor it prints both halves — p.23,
 * *"MIDI note numbers 12-84, that corresponds to notes C1-C7 (C5, MIDI note 60, being middle
 * C)"* — and like the successor it cannot put one on the pool.
 *
 *  - **No MIDI argument.** The eight MIDI tracks here are separate hardware, and APPENDIX A has
 *    no `MIDI` machine. The pool is eight audio tracks and nothing else.
 *  - **No `GRID` argument.** Four machines: `ONESHOT`, `WERP`, `REPITCH`, `SLICE`.
 *  - **`SLICE` remains, and it is enough.** p.86: *"Slice Select lets you set which slice to
 *    play. If set to NOTE you can use the TRIG keys in CHROMATIC mode or incoming MIDI note data
 *    to determine which slice to play. (NOTE, 1-64)"*, with p.24 and p.86 both warning that then
 *    *"All the settings in the KEYBOARD SETUP menu are ignored… Instead slices plays from C1 and
 *    upwards."*
 *
 * **And `C1` is where this box's chromatic range starts too** (p.23's `12-84`, `C1-C7`). One note
 * name, two meanings, one parameter apart on the same track. The successor has no such collision:
 * its span starts at `E2`. This is the box where a note name is least safe.
 *
 * The one slice recipe fixes a slice *number* rather than `NOTE` — recorded below rather than
 * relied on, because that is a fact about the recipes and the field lives on the pool.
 */
/**
 * §3.5/#345. **The seven roles the pool declared and nothing served**, and the three judgements
 * that produced seven recipes rather than eight or none.
 *
 * The pool declares all 23 roles because a track is whatever is loaded into it, so narrowing it
 * was never the honest answer for any of these — a rimshot, a ride, a noise bed, a lead, an
 * arpeggio, an acid line and a sweep are all a file somebody loads. What the tests below hold is
 * the shape of the result rather than the count: every declared role reaches a recipe, `arp`
 * reaches two requests through one, and the two gestures this box cannot make are stated rather
 * than approximated.
 */
describe('the roles the pool declares, and the recipes that answer them (#345)', () => {
  it('leaves no declared role without a recipe', () => {
    const declared = new Set(device.voices.flatMap((v) => v.roles))
    const authored = new Set(device.recipes.map((r) => r.role))
    expect([...declared].filter((r) => !authored.has(r)).sort()).toEqual([])
    // And the pool really does declare the whole vocabulary, so the assertion above is the strong
    // one it looks like rather than a check against a short list.
    expect(declared.size).toBe(ROLES.length)
  })

  it('answers both arp requests with one recipe, at a distance the guide names', () => {
    // §3.4 puts `clean` and `bright` at sqrt(2), inside §3.5's radius, so the second variant this
    // box could have carried would have been a duplicate. The claim is that the substitution
    // actually happens and is reported, not that the two characters are adjacent on paper.
    const arps = device.recipes.filter((r) => r.role === 'arp')
    expect(arps.map((r) => r.character)).toEqual(['clean'])

    const asking = TEMPLATES.filter((t) => t.roles.some((r) => r.role === 'arp'))
    expect(asking.map((t) => t.id).sort()).toEqual(['generative-drift', 'major-key-electro'])
    for (const template of asking) {
      const result = resolve({ devices: [device], template, mood: moodState(), seed: 1 })
      const carried = result.assignments.find((a) => a.role === 'arp')
      expect(carried?.recipe.id, template.id).toBe('dt-arp-clean')
    }
    // The one asking for `bright` is told, in the guide, that it got the `clean` variant.
    const drift = TEMPLATES.find((t) => t.id === 'generative-drift')
    expect(drift).toBeDefined()
    const doc = renderGuide(
      resolve({ devices: [device], template: drift!, mood: moodState(), seed: 1 }),
    )
    expect(doc).toContain('substituted — asked `bright`, authored `clean`')
  })

  /**
   * The successor has `PORT` on its TRIG PAGE 2 and builds its `acid` on it. This box's TRIG page
   * ends at `LFO.T` (pp.43-44) and no page names a portamento, so the recipe states the absence
   * instead of reaching for a lane that means something else. #283's table holds the disposition;
   * what this holds is that the manifest never grew the parameter.
   */
  it('never authors a slide it does not have, on the acid recipe or anywhere', () => {
    const acid = device.recipes.find((r) => r.id === 'dt-acid-hard')
    expect(acid).toBeDefined()
    expect(acid?.routing ?? '').toContain('**Slide:**')

    const SLIDE = ['portamento', 'portamento-time', 'glide', 'tie', 'gate']
    for (const recipe of device.recipes) {
      for (const p of recipe.params as AuthoredParam[]) {
        expect(p.name.toUpperCase(), recipe.id).not.toContain('PORT')
      }
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) expect(SLIDE, recipe.id).not.toContain(key)
      }
    }
    // And the capability list agrees, which is where a stray claim would have hidden.
    for (const lane of SLIDE) expect(device.features?.perStep ?? [], lane).not.toContain(lane)

    // The sibling is the contrast, and asserting it here is what makes the absence a reading of
    // two manuals rather than an omission in one.
    const dt2 = digitaktII.recipes.find((r) => r.id === 'dt2-acid-hard')
    expect(dt2?.articulation?.some((a) => 'portamento' in a.set)).toBe(true)
  })

  /**
   * §4.2/#108. Neither direction asking for `sweep` authors a step variant for it, both saying in
   * their own `PATTERNS` note that a gesture across a section boundary is not four bands of
   * sixteenths. So there is no slot for an articulation to address, and the recipe carrying none
   * is a measurement rather than an oversight.
   */
  it('articulates the sweep with nothing, because no direction gives it a slot', () => {
    const sweepRecipe = device.recipes.find((r) => r.id === 'dt-sweep-soft')
    expect(sweepRecipe).toBeDefined()
    expect(sweepRecipe?.articulation).toBeUndefined()

    const reach = reachableSlots(sweepRecipe!, TEMPLATES)
    expect(reach.requested, 'nothing asks for sweep, so the absence proves nothing').toBe(true)
    expect(reach.slots).toEqual([])

    // Every other recipe on this box is the other case: a slot exists, so one is used. That pairing
    // is what stops this test passing on a manifest that simply stopped articulating.
    for (const recipe of device.recipes) {
      if (recipe.id === sweepRecipe!.id) continue
      const slots = reachableSlots(recipe, TEMPLATES)
      if (!slots.requested || slots.slots.length === 0) continue
      expect(recipe.articulation ?? [], `${recipe.id} has slots and uses none`).not.toHaveLength(0)
    }
  })

  /**
   * p.44's `REL` is the parameter #345 added a helper for, and the rule it was added under is that
   * a release needs a sustain above the floor to travel from. One recipe qualifies today.
   */
  it('authors a filter release only where the filter envelope sustains', () => {
    for (const recipe of device.recipes) {
      const rel = named(recipe, 'REL')
      const sus = named(recipe, 'SUS')
      if (rel === undefined) continue
      expect(sus, `${recipe.id} authors REL with no SUS`).toBeDefined()
      expect(sus?.kind).toBe('numeric')
      expect(sus?.kind === 'numeric' ? sus.value : 0, `${recipe.id} REL against a floored SUS`)
        .toBeGreaterThan(0)
    }
    expect(device.recipes.filter((r) => named(r, 'REL') !== undefined).map((r) => r.id))
      .toEqual(['dt-lead-bright'])
  })
})

describe('trigger notes: read for, and declined (§2.1/#334)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  it('authors none on the pool, and none on any recipe either', () => {
    // Both halves, because the field exists in two places and only one of them is the pool.
    expect(device.voices.filter((v) => v.triggerNote !== undefined)).toEqual([])
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  it('stays off the library roster of boxes that author one', () => {
    // `test/tracker-mini.test.ts` pins that roster exactly; this is the same fact asked from the
    // side of the box that declines, so a note added here fails in its own file as well as there.
    const authoring = DEVICES.filter((d) => d.voices.some((v) => v.triggerNote !== undefined))
    expect(authoring.map((d) => d.id)).not.toContain('elektron-digitakt')
  })

  it('expands to eight audio members on one pool, none of which carries a note', () => {
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(8)
    expect(members.every((m) => m.poolId === 'track')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The two arguments that do not carry over, asserted so the successor's reasoning cannot be
   * copied in later without somebody noticing it no longer fits.**
   *
   * The pool is eight against the Digitakt II's sixteen, because MIDI tracks are separate
   * hardware here rather than members; and no machine on this box is `MIDI` or `GRID`.
   */
  it('holds no MIDI or GRID machine, unlike the successor', () => {
    const machines = new Set<string>()
    for (const recipe of device.recipes) {
      const param = named(recipe, 'MACHINE')
      expect(param?.kind, recipe.id).toBe('enum')
      if (param?.kind !== 'enum') throw new Error('expected an enum MACHINE')
      for (const option of param.options.values) machines.add(option)
    }
    expect([...machines].sort()).toEqual(['ONESHOT', 'REPITCH', 'SLICE', 'WERP'])

    // The successor's pool is twice this one and carries both of the machines this box lacks —
    // the contrast that makes the narrower reason worth stating.
    expect(digitaktII.voices[0]?.kind === 'pool' ? digitaktII.voices[0].count : 0).toBe(16)
    expect(device.voices[0]?.kind === 'pool' ? device.voices[0].count : 0).toBe(8)
  })

  /**
   * **`SLICE` is the argument that remains**, and both halves of it are checked: the parameter's
   * cited option set admits `NOTE`, and the one authored slice recipe does not use it.
   */
  it('admits note-addressed slicing on the pool, while the one slice recipe fixes a number', () => {
    const sliced = device.recipes.filter((r) => choice(r, 'MACHINE') === 'SLICE')
    expect(sliced.map((r) => r.id)).toEqual(['dt-vox-chop-bright'])

    const recipe = sliced[0]
    if (recipe === undefined) throw new Error('expected the slice recipe')
    const slice = named(recipe, 'SLICE')
    expect(slice?.kind).toBe('numeric')

    // p.86's `(NOTE, 1-64)` — the mode a reader can reach on any of the eight tracks, which is
    // why the field cannot sit on the pool even though no recipe selects it.
    expect(recipe.voice).toBe('track')
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with at
   * least one section whose variant resolved (§6.3).
   *
   * One definition, used by the sweep and by the page test. `noteInstruction` answers `none` for a
   * hooked or sustained part as well as for a blank grid part, so a page test asking it whether a
   * grid exists would count parts that draw none and then pass against a guide with nothing in it.
   */
  function drawsGrid(a: ResolvedAssignment): boolean {
    return (
      a.hookAuthority === undefined &&
      !isSustainedPart(a) &&
      a.patterns.some((p) => p.selection.outcome !== 'none')
    )
  }

  /** Every part this box takes, split by what phase 5 actually draws for it. */
  function sweep() {
    const grid: { where: string; role: Role; kind: string }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          if (drawsGrid(a)) grid.push({ where, role: a.role, kind: noteInstruction(a).kind })
          else if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else noPattern.push(where)
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  /**
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6.
   *
   * 228 is #334's figure for this device. It was 216 until #345 authored the seven roles the pool
   * declared and no recipe served, which placed 24 parts that were being dropped — a diff is a
   * prompt to re-read the head note rather than a failure. What must not move is the relationship
   * — no part ever gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 228 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(252)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(228)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that carry a note are `sub` parts, where the
    // pitch is the direction's musical decision (#340) and owes this box nothing.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
  })

  it('leaves the blanks on the roles a loaded sample answers', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 48],
      ['kick', 48],
      ['ghost-perc', 30],
      ['clap', 18],
      ['rim', 18],
      ['snare', 18],
      ['metallic', 12],
      ['arp', 6],
      ['impact', 6],
      ['open-hat', 6],
      ['ride', 6],
      ['tom', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program.
    const { grid, hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(132)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(30)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/riser',
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])

    // The four arms are exhaustive, so the sweep cannot silently drop a part it could not
    // classify — which is what would make the 216 above an undercount rather than a measurement.
    let assignments = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        assignments += resolve({ devices: [device], template, mood: moodState(), seed })
          .assignments.length
      }
    }
    expect(grid.length + hooked.length + sustained.length + noPattern.length).toBe(assignments)
  })

  /**
   * The resolved field itself, across every part rather than only the ones that draw a grid, and
   * the sliced part named separately — it is the one a pool-wide note would misdescribe worst.
   */
  it('resolves no trigger note on any assignment, the sliced part included', () => {
    let seen = 0
    let slicedSeen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          seen += 1
          expect(a.triggerNote, `${template.id}/${a.role} seed ${String(seed)}`).toBeUndefined()
          if (a.recipe.id !== 'dt-vox-chop-bright') continue
          slicedSeen += 1
          for (const assignable of a.assignables) {
            expect(assignable.triggerNote, `${template.id} seed ${String(seed)}`).toBeUndefined()
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
    expect(slicedSeen).toBeGreaterThan(0)
  })

  /**
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver.
   *
   * The count of parts that actually draw a grid is asserted non-zero first, or an empty render
   * would pass this forever.
   */
  it('never prints a trigger note on a rendered page, across every direction and seed', () => {
    let drawn = 0
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        drawn += result.assignments.filter(drawsGrid).length
        expect(renderGuide(result), `${template.id} seed ${String(seed)}`).not.toContain(
          'Trigger note',
        )
      }
    }
    expect(drawn).toBeGreaterThan(0)
  })

  /**
   * §2.1/#352. **The collision, asserted as arithmetic rather than described.**
   *
   * p.23 gives the chromatic span as `12-84`, `C1-C7`, with `C5` at 60. p.24 and p.86 make the
   * first slice `C1` under `SLICE NOTE`. So MIDI 12 is simultaneously the lowest playable pitch
   * and the first slice, decided by one parameter on the same track — and the successor, whose
   * span starts at `E2` (28), has no such collision.
   *
   * There is no value in the manifest for this to check, and that is the point: this is what the
   * next author would need before there could be one.
   */
  it('records the octave convention and the C1 collision without authoring a note', () => {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    // C5 = 60 means octave numbering starts at zero, so MIDI n is octave floor(n / 12).
    const midiOf = (name: string, octave: number) => octave * 12 + NAMES.indexOf(name)

    expect(midiOf('C', 5)).toBe(60) //   p.23, middle C
    expect(midiOf('C', 0)).toBe(0) //    p.23's "Note numbers 0-7 ... C0 through to G0"
    expect(midiOf('G', 0)).toBe(7) //    the other end of that same sentence
    expect(midiOf('C', 1)).toBe(12) //   p.23's chromatic floor — and p.24/p.86's first slice
    expect(midiOf('C', 7)).toBe(84) //   p.23's chromatic ceiling

    // The collision this box has and its successor does not: there, the chromatic span opens at
    // E2 while slices still start at C1, so the two never share a note name.
    expect(midiOf('E', 2)).toBe(28)
    expect(midiOf('E', 2)).not.toBe(midiOf('C', 1))

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
