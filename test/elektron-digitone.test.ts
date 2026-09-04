import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  receiveTransports,
  renderGuide,
  resolve,
  sendTransports,
  type AuthoredParam,
  type CapabilityEvidence,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitone/index'
import { DIGITONE_PANEL_SPAN_MM } from '../lib/devices/elektron-digitone/panel'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Digitone is the Digitone II's predecessor in the same steel case, so this file does not
 * retest what `elektron-digitone-ii.test.ts` already pins about Elektron manifests. It guards the
 * places the two boxes and their two documents genuinely part company, because those are the
 * places a later reader is most likely to "correct" this manifest into agreement with its sibling
 * and be wrong:
 *
 *  1. **four synth tracks and four MIDI tracks, over eight shared voices** — where the successor
 *     has sixteen tracks that are audio *or* MIDI, so its cost lands somewhere else;
 *  2. **`polyphony: 2`**, which is eight divided by four rather than a reading of one voice;
 *  3. **`ALGO` beside every value that depends on it**, this manual's instance of the
 *     cited-wrong-scale rule;
 *  4. **a cited range on every numeric**, because OS 1.41's manual prints them where OS 1.10's
 *     does not — the single biggest difference between the two manifests;
 *  5. **no retrig**, which is a fact about the box rather than a lane left unreachable;
 *  6. **the articulation subset**, which gains two boolean lanes and loses two the sibling has;
 *  7. **panel bounds that were measured**, checked against two independent specification lines.
 */

const MANUAL = 'Digitone User Manual OS 1.41'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

/** `CapabilityEvidence` includes `false`, so narrow before reaching for a discriminant. */
function evidence(path: string): Exclude<CapabilityEvidence, false> {
  const entry = device.capabilityEvidence?.[path]
  if (entry === undefined || entry === false) {
    throw new Error(`no capability evidence at ${path}`)
  }
  return entry
}

describe('Digitone manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('elektron-digitone')
    expect(device.maker).toBe('Elektron')
    expect(device.manual).toEqual({ title: 'Digitone User Manual', edition: 'OS 1.41' })
  })

  it('is a groovebox, over a page that appears to say otherwise', () => {
    // p.11 §2 calls it "maybe the most unique synthesizer we have ever created" and the p.12 panel
    // figure silkscreens `Polyphonic Digital Synthesizer`. Both name the sound engine, which is
    // what separates this box from the Digitakt in the same case; `kind` names the box, and the
    // box is four sequenced tracks with a Sound each, 128 patterns, song mode, four MIDI tracks
    // and three send effects into a mixer. Its successor reads the same architecture the same way.
    expect(device.kind).toBe('groovebox')
    expect(DEVICES.find((d) => d.id === 'elektron-digitone-ii')?.kind).toBe(device.kind)
  })

  // -------------------------------------------------------------------------
  // 1 and 2. §2.2 — four tracks, eight shared voices, and the number that is authored
  // -------------------------------------------------------------------------

  describe('four tracks over eight shared voices (§2.2)', () => {
    it('models the four synth tracks as one fungible pool', () => {
      expect(device.voices).toHaveLength(1)
      const pool = device.voices[0]
      expect(pool?.kind).toBe('pool')
      if (pool?.kind !== 'pool') throw new Error('the one voice spec is not a pool')
      expect(pool.id).toBe('track')
      expect(pool.count).toBe(4)
      expect(expand(device)).toHaveLength(4)
    })

    it('leaves the four MIDI tracks out of the pool without charging for them', () => {
      // **This is the inversion of the Digitone II and it is the whole of point 2.** There,
      // sixteen tracks are audio *or* MIDI, so sequencing external gear spends an audio track and
      // that manifest writes the cost into `comfortableVoices: 10`. Here pp.16-17 give the box
      // four synth tracks *and* four MIDI tracks, both in every pattern, so a MIDI track costs no
      // synth voice — and the field is omitted, which leaves it at the assignable count.
      expect(device.comfortableVoices).toBeUndefined()
      const sibling = DEVICES.find((d) => d.id === 'elektron-digitone-ii')
      expect(sibling?.comfortableVoices).toBe(10)
      // The MIDI tracks make no sound, so they are absent from `voices` rather than discounted.
      const pool = device.voices[0]
      if (pool?.kind !== 'pool') throw new Error('the one voice spec is not a pool')
      expect(pool.count).toBe(4)
    })

    it('declares two notes a track, which is eight shared by four rather than a reading', () => {
      const pool = device.voices[0]
      if (pool?.kind !== 'pool') throw new Error('the one voice spec is not a pool')
      expect(pool.polyphony).toBe(2)
      // The arithmetic the number *is*: p.37's eight voice polyphony spread evenly over p.16's
      // four tracks. Declaring 8 apiece would promise 32 simultaneous notes the box cannot sound,
      // and declaring 1 would refuse the chord PLAY MODE POLY plainly plays.
      expect((pool.polyphony ?? 0) * pool.count).toBe(8)
    })

    it('records the two as authored downward rather than cited', () => {
      const voices = evidence('voices')
      expect(voices.kind).toBe('partly')
      if (voices.kind !== 'partly') throw new Error('voices evidence is not partly')
      expect(voices.cite.source).toContain(MANUAL)
      expect(voices.proven).toContain('eight voice polyphony')
      expect(voices.open).toContain('one budget')
    })

    it('carries PLAY MODE POLY on every recipe that needs the chord to sound', () => {
      // The switch the notes cannot come apart from: p.29's MONO "is monophonic", so the same
      // Sound left there sounds one note of the chord while the guide reads as correct.
      const chordal = device.recipes.filter((r) => r.role === 'pad' || r.role === 'stab')
      expect(chordal.length).toBeGreaterThan(0)
      for (const recipe of chordal) {
        const mode = named(recipe, 'PLAY MODE')
        expect(mode?.kind, recipe.id).toBe('enum')
        if (mode?.kind !== 'enum') continue
        expect(mode.value, recipe.id).toMatch(/^POLY/)
        // And it sounds the chord itself, so `realisation` stays at its default.
        expect(recipe.realisation, recipe.id).toBeUndefined()
      }
    })
  })

  // -------------------------------------------------------------------------
  // 3. §3 — ALGO, the switch every algorithm-dependent value hangs off
  // -------------------------------------------------------------------------

  describe('the ALGO pairing (CLAUDE.md, §3.2)', () => {
    it('gives every recipe its ALGO, cited to the page that counts them', () => {
      // One engine rather than the successor's five, so this is every recipe without exception.
      expect(device.recipes.length).toBeGreaterThan(0)
      for (const recipe of device.recipes) {
        const algo = named(recipe, 'ALGO')
        expect(algo?.kind, recipe.id).toBe('enum')
        if (algo?.kind !== 'enum') continue
        expect(algo.options.values, recipe.id).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
        // p.47: "Algorithm selects the set structure of how the four operators are connected to
        // each other. (1-8)". The selection itself is taste, exactly as GEN is on the TR-1000.
        expect(algo.options.verified, recipe.id).toMatchObject({ kind: 'manual' })
        expect(algo.verified ?? false, recipe.id).toBe(false)
      }
    })

    it('never carries an algorithm-dependent value without the ALGO beside it', () => {
      // The four the manual names outright: MIX and FDBK on p.48, LEV A and LEV B where whether
      // the operator modulates anything at all is the routing ALGO selects (p.48, p.90).
      const dependent = ['MIX', 'FDBK', 'LEV A', 'LEV B']
      let seen = 0
      for (const recipe of device.recipes) {
        for (const name of dependent) {
          // FDBK is spelled the same on the DELAY page and means something else there, so the
          // SYN1 one is identified by its 120 ceiling rather than by its name alone.
          const param = params(recipe).find(
            (p) =>
              p.name === name &&
              (name !== 'FDBK' || (p.kind === 'numeric' && p.range.max === 120)),
          )
          if (param === undefined) continue
          seen += 1
          expect(named(recipe, 'ALGO'), `${recipe.id} ${name}`).toBeDefined()
        }
      }
      expect(seen, 'the assertion would be vacuous with no dependent values').toBeGreaterThan(20)
    })

    it('describes no algorithm topology, because the manual numbers no diagram', () => {
      // A.3 on p.90 explains what an algorithm is and draws a two-operator example. It prints no
      // numbered picture of the eight, so nothing here may say what routing a number is.
      const prose = device.recipes.flatMap((r) => [r.title, ...params(r).map((p) => p.note ?? '')])
      for (const line of prose) {
        expect(line).not.toMatch(/algorithm \d/i)
        expect(line).not.toMatch(/\bstack(ed|s)? (two|three|four)\b/i)
      }
    })

    it('leaves RATIO B unused although its range is one of the many printed', () => {
      // pp.47 and 90 both say why: "As you turn the encoder, B2 increases until it reaches the
      // max (16). It then starts over from .25 and B1 increases to the next value." One authored
      // number would not say which of the two operators it is. The sibling reached the same
      // conclusion off its own copy of the sentence.
      const all = device.recipes.flatMap((r) => params(r).map((p) => p.name))
      expect(all).toContain('RATIO C')
      expect(all).toContain('RATIO A')
      expect(all).not.toContain('RATIO B')
    })
  })

  // -------------------------------------------------------------------------
  // 4. §3.1, §3.2 — this manual prints its ranges, and that is the whole difference
  // -------------------------------------------------------------------------

  describe('provenance (§3.1, §3.2)', () => {
    it('cites the option set of every enum and the range of every numeric', () => {
      for (const recipe of device.recipes) {
        for (const param of params(recipe)) {
          if (param.kind === 'enum') {
            expect(param.options.verified, `${recipe.id} ${param.name}`).toMatchObject({
              kind: 'manual',
            })
          }
          if (param.kind === 'numeric') {
            expect(param.range.verified, `${recipe.id} ${param.name}`).toMatchObject({
              kind: 'manual',
            })
            expect(
              (param.range.verified as { source: string }).source,
              `${recipe.id} ${param.name}`,
            ).toContain(MANUAL)
          }
        }
      }
    })

    it('is numeric-dominated where its successor is enum-dominated, because the manuals differ', () => {
      // **The single biggest difference between the two manifests, and it is a fact about the two
      // documents rather than a change of house style.** OS 1.10's manual leaves the range to the
      // screen; OS 1.41's prints one for very nearly every parameter it defines. Guarded as a
      // ratio rather than a count, so adding or dropping a recipe does not move it.
      const numerics = device.recipes.flatMap((r) => params(r)).filter((p) => p.kind === 'numeric')
      const all = device.recipes.flatMap((r) => params(r))
      expect(numerics.length / all.length).toBeGreaterThan(0.6)
      const sibling = DEVICES.find((d) => d.id === 'elektron-digitone-ii')
      const siblingParams = sibling?.recipes.flatMap((r) => r.params) ?? []
      const siblingNumerics = siblingParams.filter((p) => p.kind === 'numeric')
      expect(siblingNumerics.length / siblingParams.length).toBeLessThan(0.4)
    })

    it('claims no point value, because this manual prints values for none of them', () => {
      for (const recipe of device.recipes) {
        expect(recipe.verified, recipe.id).toBe(false)
        for (const param of params(recipe)) {
          expect(param.verified ?? false, `${recipe.id} ${param.name}`).toBe(false)
        }
      }
    })

    it('keeps FDBK at the 120 the page prints, not the 127 its neighbours run to', () => {
      // p.48 gives (0.00-120.00) where every other numeric on the page reaches 127. Printed once,
      // so taken as printed — this is the assertion that catches somebody "tidying" it.
      const fdbk = device.recipes
        .flatMap((r) => params(r))
        .filter((p) => p.name === 'FDBK' && p.kind === 'numeric' && p.range.max !== 198)
      expect(fdbk.length).toBeGreaterThan(0)
      for (const param of fdbk) {
        if (param.kind !== 'numeric') continue
        expect(param.range.max).toBe(120)
      }
    })

    it('takes only the units the library has reviewed, which here is one', () => {
      const units = new Set(
        device.recipes.flatMap((r) =>
          params(r).flatMap((p) => (p.kind === 'numeric' && p.unit !== undefined ? [p.unit] : [])),
        ),
      )
      expect([...units]).toEqual(['%'])
    })

    it('answers all five mood axes, which the printed ranges are what make possible', () => {
      const axes = new Set(
        device.recipes.flatMap((r) =>
          params(r).flatMap((p) => (p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [])),
        ),
      )
      // The successor declines `space` because its send levels carry no printed scale and mood may
      // not move an unverified range. p.53 gives all three sends `(OFF, 0.01-127.00)`, so the axis
      // has somewhere to land here.
      expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
    })

    it('hoists the settings that belong to the pattern rather than the part', () => {
      // p.60: the chorus, delay and reverb "are send effects and are on a pattern level", and p.27
      // lists swing among what a pattern contains. The per-track *send levels* stay per part.
      const pattern = new Set(
        device.recipes.flatMap((r) => params(r).filter((p) => p.scope === 'pattern').map((p) => p.name)),
      )
      // `DEC`, `FREQ` and `FDBK` each name two different parameters on two different pages, and
      // only the REVERB and DELAY ones are pattern-scoped — the AMP page's DEC and the FLTR
      // page's FREQ and the SYN1 page's FDBK are per part. That the same five names appear in
      // both lists is the point rather than a smell.
      expect([...pattern].sort()).toEqual(['DEC', 'FDBK', 'FREQ', 'MOVD', 'SWING', 'TIME'])
      for (const name of ['REV', 'DEL', 'CHR']) {
        const sends = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === name)
        for (const send of sends) expect(send.scope, name).toBeUndefined()
      }
    })

    it('declares LEN with a range and no unit, because no page maps the scale', () => {
      // §2.6/#142. p.46 prints `(0.125-128, INF)` and never says what 1 is in note values, where
      // the successor's manual does and its manifest carries the mapping. `NoteDuration` makes
      // `unit` optional for exactly this case; naming one here would be inventing the mapping.
      expect(device.noteDuration).toEqual({ kind: 'per-note-value', control: 'LEN' })
      const sibling = DEVICES.find((d) => d.id === 'elektron-digitone-ii')
      expect(sibling?.noteDuration?.kind).toBe('per-note-value')
      expect(
        sibling?.noteDuration?.kind === 'per-note-value' ? sibling.noteDuration.unit : undefined,
      ).toBeDefined()
    })

    it('loads no audio, and says so with a page rather than a shrug', () => {
      expect(device.content).toBeUndefined()
      const content = evidence('content')
      expect(content.kind).toBe('cited-against')
      if (content.kind !== 'cited-against') throw new Error('content evidence is not cited-against')
      expect(content.cite.source).toContain(MANUAL)
      expect(device.recipes.every((r) => r.sourceAudio === undefined)).toBe(true)
    })

    it('leaves no capability fact unchecked, and every gap carries a reason', () => {
      const counts = auditDevice(device).counts
      expect(counts.uncheckedCapabilities, 'an unchecked capability fact').toBe(0)
      expect(counts.unreadCapabilities, 'a capability fact blocked on a document').toBe(0)
      expect(counts.capabilityFacts).toBeGreaterThan(14)
      expect(counts.provisionalPoints).toBe(counts.params)
      expect(counts.unverifiedRanges).toBe(0)
      expect(counts.moodInert).toBe(0)
    })

    it('sends DIN sync on a wire it cannot receive it on', () => {
      expect(sendTransports(device)).toEqual(['midi-din', 'usb', 'din-sync'])
      expect(receiveTransports(device)).toEqual(['midi-din', 'usb'])
      // p.14 names MIDI IN only as "MIDI data input" — there is no SYNC C — and p.88's
      // specification line agrees in four words: "MIDI In/Out/Thru with DIN Sync out".
      expect(receiveTransports(device)).not.toContain('din-sync')
      expect(evidence('clock.transport').kind).toBe('partly')
    })

    it('claims no topology judgement, and says why with both worked examples', () => {
      expect(device.clock.preferredSource).toBeUndefined()
      const pref = evidence('clock.preferredSource')
      expect(pref.kind).toBe('unknown')
      if (pref.kind !== 'unknown') throw new Error('preferredSource evidence is not unknown')
      // §16.1 on p.82 has it clocking a legacy bass machine over DIN sync; §16.2 on the same page
      // has it receiving clock from a Digitakt. Two worked examples, opposite directions.
      expect(pref.reason).toContain('p.82')
    })
  })

  // -------------------------------------------------------------------------
  // 5 and 6. §2.3, §4.3 — the per-step lanes, two of which the successor has and this box has not
  // -------------------------------------------------------------------------

  describe('per-step capabilities (§2.3, §4.3)', () => {
    it('has no retrig at all, which is the box rather than an unreachable lane', () => {
      // **The assertion most at risk of being "fixed" into agreement with the sibling.** That
      // box's TRIG page carries RTRG and RATE and its manifest articulates both. This one's is
      // ROOT, VEL, LEN, PROB, FLT.T, LFO.T, PTIM, PORT (§11.2, pp.46-47) and nothing else, so the
      // lanes are *absent* rather than declared-and-unreachable.
      const perStep = device.features?.perStep ?? []
      expect(perStep).not.toContain('retrig')
      expect(perStep).not.toContain('retrig-rate')
      const sibling = DEVICES.find((d) => d.id === 'elektron-digitone-ii')
      expect(sibling?.features?.perStep).toContain('retrig')
      // And nothing articulates one either, which is what the schema would catch anyway.
      const keys = device.recipes.flatMap((r) =>
        (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
      )
      expect(keys.filter((k) => k.startsWith('retrig'))).toEqual([])
    })

    it('uses only the scalar and boolean subset that stays true for every hit in a slot', () => {
      const keys = new Set(
        device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
      )
      for (const key of keys) {
        expect(ARTICULABLE_PER_STEP as readonly string[], key).toContain(key)
      }
      // The subset is a subset of what the box does, never wider than it.
      for (const key of ARTICULABLE_PER_STEP) {
        expect(device.features?.perStep ?? [], key).toContain(key)
      }
    })

    it('gains two boolean lanes the successor has not, and uses at least one', () => {
      // p.47: FLT.T "controls if the filter envelope is trigged or not. (ON, OFF)" and LFO.T
      // "controls if the LFO is trigged or not. (ON, OFF)". Static per trig, so a slot-wide set
      // stays true of every hit sharing the slot.
      expect(ARTICULABLE_PER_STEP).toContain('filter-trig')
      expect(ARTICULABLE_PER_STEP).toContain('lfo-trig')
      const keys = device.recipes.flatMap((r) =>
        (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
      )
      expect(keys.some((k) => k === 'filter-trig' || k === 'lfo-trig')).toBe(true)
    })

    it('pairs a glide with its time, because one without the other is not an instruction', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          const has = (k: string) => Object.hasOwn(entry.set, k)
          expect(has('portamento'), `${recipe.id} ${entry.slot}`).toBe(has('portamento-time'))
        }
      }
    })

    it('declares micro timing and never articulates it, for a bounding reason not an ambiguous one', () => {
      // **The successor omits this lane because two printed scales disagree.** Here §10.6 prints
      // exactly one — the p.38 pop-up reads `+1/128` — and the reason is instead that no page
      // bounds the parameter at all: its whole specification is "Press [LEFT]/[RIGHT] keys to
      // adjust the time offset." A set carrying -4 would be a value nobody has shown is reachable.
      expect(device.features?.perStep ?? []).toContain('micro-timing')
      expect(ARTICULABLE_PER_STEP as readonly string[]).not.toContain('micro-timing')
    })

    it('keeps the stateful and unknowable lanes declared but unreachable', () => {
      const declared = device.features?.perStep ?? []
      for (const lane of ['condition', 'fill', 'sound-lock']) {
        expect(declared, lane).toContain(lane)
        expect(ARTICULABLE_PER_STEP as readonly string[], lane).not.toContain(lane)
      }
    })
  })

  // -------------------------------------------------------------------------
  // 7. §10 — the panel, and the two specification lines that check it
  // -------------------------------------------------------------------------

  describe('the panel (§10)', () => {
    it('matches the drawn aspect to the specification, which is what picks 176 over 63', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      expect(device.physical.panelSpanMm).toBe(215)
      expect(DIGITONE_PANEL_SPAN_MM).toBe(device.physical.panelSpanMm)
      expect(panel.panelRiseMm).toBe(176)
      // Measured: the panel's outer border is 1017 x 832 px at 200 dpi. 1017/832 = 1.22236
      // against the specification's 215/176 = 1.22159; the depth reading, 215/63, is 3.41.
      expect(device.physical.panelSpanMm / panel.panelRiseMm).toBeCloseTo(1017 / 832, 2)
      expect(device.physical.panelSpanMm / 63).toBeGreaterThan(3)
    })

    it('checks itself a second time against the screen, which the successor could not', () => {
      // p.88 specifies a "128 x 64 pixel OLED screen", an aspect of exactly 2.000. The drawn
      // display measures 291 x 145 px on the same render, an aspect of 2.007. A second dimension
      // agreeing with a second, unrelated specification line on the same two scale factors.
      const screen = (device.panel?.features ?? []).find((f) => f.kind === 'screen')
      expect(screen).toBeDefined()
      if (screen?.kind !== 'screen') throw new Error('no screen feature')
      expect(screen.w / screen.h).toBeCloseTo(128 / 64, 1)
      expect(screen.w / screen.h).toBeCloseTo(291 / 145, 2)
    })

    it('keeps every feature inside the measured panel box', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(device.physical.panelSpanMm)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(panel.panelRiseMm)
      }
    })

    it('is the third device in the one steel case Elektron shipped all three in', () => {
      // p.88's `Dimensions: W 215 × D 176 × H 63 mm` is character for character its successor's
      // p.87, and the Digitakt II's before that.
      for (const id of ['elektron-digitone-ii', 'elektron-digitakt-ii']) {
        const other = DEVICES.find((d) => d.id === id)
        expect(other?.physical.panelSpanMm, id).toBe(device.physical.panelSpanMm)
        expect(other?.panel?.panelRiseMm, id).toBe(device.panel?.panelRiseMm)
      }
    })

    it('puts the voice field on the four TRACK keys, not on the TRIG row', () => {
      // **Where this panel diverges from its successor's, and the divergence is p.13 item 11:**
      // "[TRACK] keys. Selects which track to be active." The successor has no such keys and puts
      // the field on its sixteen [TRIG] keys instead. Four cells, because the pool is four.
      const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
      expect(fields).toHaveLength(1)
      expect(fields[0]?.kind === 'voices' ? fields[0].label : undefined).toBe('TRACK')
      // The sixteen [TRIG] keys are drawn beside it as a plain 8 x 2 grid instead.
      const trigs = (device.panel?.features ?? []).filter(
        (f) => f.kind === 'grid' && f.cols === 8 && f.rows === 2,
      )
      expect(trigs).toHaveLength(1)
    })

    it('names the rear connectors without drawing sockets the figure does not', () => {
      // The p.12 figure prints eleven *labels* along the top edge and draws no sockets, where the
      // successor's draws the strip. Their measured centres are unevenly spaced — 54.5 px to
      // 104.5 px apart — so a uniform eleven-cell grid, which is the sibling's shape, would put
      // the worst socket 11.6 mm from where this drawing names it. A `group` marks the measured
      // extent and nothing is invented to fill it.
      const strip = (device.panel?.features ?? []).find(
        (f) => f.kind === 'group' && f.label === 'REAR CONNECTORS',
      )
      expect(strip).toBeDefined()
      const elevens = (device.panel?.features ?? []).filter(
        (f) => f.kind === 'grid' && f.cols === 11,
      )
      expect(elevens).toEqual([])
    })

    it('draws nothing the maker drew, the logo and both wordmarks included', () => {
      // §10: panel artwork is reference, never asset. The p.12 figure carries the Elektron mark,
      // the `Digitone` wordmark and the `Polyphonic Digital Synthesizer` line; none is a feature.
      const text = (device.panel?.features ?? []).flatMap((f) => {
        const bits: string[] = []
        if ('label' in f && f.label !== undefined) bits.push(f.label)
        if (f.kind === 'label') bits.push(f.text)
        return bits
      })
      for (const mark of ['Elektron', 'Digitone', 'Polyphonic']) {
        expect(text.join(' '), mark).not.toContain(mark)
      }
    })
  })

  // -------------------------------------------------------------------------
  // §3 — the recipe sheet itself
  // -------------------------------------------------------------------------

  describe('the recipes (§3)', () => {
    it('covers a spread of roles without padding toward the grid', () => {
      // Roughly 15-20 covers a device; there is no credit for filling 23 roles x 6 characters.
      expect(device.recipes.length).toBeLessThanOrEqual(22)
      const roles = new Set(device.recipes.map((r) => r.role))
      // One recipe per role: the count is coverage rather than repetition.
      expect(roles.size).toBe(device.recipes.length)
      const ids = device.recipes.map((r) => r.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(id.startsWith('dn-'), id).toBe(true)
    })

    it('declines the one role the architecture declines, and no others', () => {
      const pool = device.voices[0]
      if (pool?.kind !== 'pool') throw new Error('the one voice spec is not a pool')
      // p.15's voice is FM into overdrive into two filters into an amp and p.89 calls the engine
      // a four operator FM synth. Nothing in that chain plays recorded audio, and a vocal chop is
      // recorded audio. Every other role an FM engine can reach at inharmonic ratios stays in.
      expect(pool.roles).not.toContain('vox-chop')
      expect(pool.roles).toHaveLength(22)
      for (const recipe of device.recipes) {
        expect(pool.roles, recipe.id).toContain(recipe.role)
        expect(recipe.voice, recipe.id).toBe(pool.id)
      }
    })

    it('addresses articulation by slot, never by step index', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          expect(typeof entry.slot, recipe.id).toBe('string')
          expect(Number.isNaN(Number(entry.slot)), recipe.id).toBe(true)
        }
      }
    })
  })
})

/**
 * §2.1/#334. **This box authors no trigger note: `TriggerNote` is a sampler's fact and there is
 * no sampler here.** Read off OS 1.41 rather than inherited from the successor's manifest.
 *
 * The field holds *the note that plays this part's sound as it is* — a loaded sample's original
 * pitch. p.15 draws the audio voice as an FM engine through overdrive, two filters and an amp,
 * with nothing in it to record into, so no part here has an "as recorded" pitch to be at.
 *
 *  - p.33 §10.2.1: *"NOTE TRIGS trigger notes on synth tracks and MIDI tracks"*, against *"LOCK
 *    TRIGS trigger parameter locks (but does not trigger notes)"* — the note is the content of
 *    the trig. §10.2.3's TRACK NOTE screen prints `C 5`, `D#5` and `G 5` on one step, and a
 *    single `TriggerNote` cannot be a chord.
 *  - p.36 §10.4: `SCALE` *"sets the tracks scale"*, `ROOT` *"sets the root note for the chosen
 *    scale"*, `CHORD` *"adds a three-note chord based on the SCALE and ROOT settings"*. Musical
 *    content, which §4.1 leaves to the direction.
 *  - p.46 §11.2.1: `ROOT` is *"the default note value that the note trigs placed in GRID
 *    RECORDING mode have"*, over `(C0–G10)`, and the additional notes on a trig transpose with
 *    it. A default the reader changes, not a note the box answers to.
 *
 * The octave convention is recorded and not used: p.24 §8.4, *"MIDI note numbers 0–127
 * (corresponding to notes C0–G10, the first through to eleventh octaves in the MIDI range)"*,
 * with p.46's TRIG screen printing the pair as `C 5 (60)`.
 */
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
    expect(authoring.map((d) => d.id)).not.toContain('elektron-digitone')
  })

  it('expands to four synth tracks on one pool, none of which carries a note', () => {
    // One pool is part of the reason: there is no second pool to hold an exception in. The four
    // MIDI tracks are separate hardware that cost no synth track (pp.16-17) and are not modelled.
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(4)
    expect(members.every((m) => m.poolId === 'track')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The reason, read off the manifest rather than restated.** `content` is already
   * `cited-against` on p.15, p.27 and p.89 — the pages that answer that there is no audio here
   * for a recipe to load — and no recipe carries `sourceAudio`. A sampler arriving on this box
   * is the one change that would make the question worth asking again, and it would fail here.
   */
  it('loads no audio at all, so no part has an original pitch to name', () => {
    const content = evidence('content')
    expect(content.kind).toBe('cited-against')
    const loading = device.recipes.filter(
      (r) => (r as Recipe & { sourceAudio?: unknown }).sourceAudio !== undefined,
    )
    expect(loading.map((r) => r.id)).toEqual([])
    expect(device.recipes.every((r) => r.voice === 'track')).toBe(true)
  })

  /**
   * p.46's `ROOT` is the nearest thing this box has to the field, and the risk is that somebody
   * authors it into the recipes as a substitute. It is a default over the whole `C0–G10` range
   * that the additional notes on a trig transpose with, so a number here would be a musical
   * decision wearing a citation.
   */
  it('authors no ROOT on any recipe, which is where a substitute would appear', () => {
    for (const recipe of device.recipes) expect(named(recipe, 'ROOT'), recipe.id).toBeUndefined()
  })

  /**
   * p.33's chord, from the model's side. A step here holds several notes; `TriggerNote` holds
   * one. `polyphony` is the field that says the pool sounds more than one at a time — the 2 is
   * eight shared voices split four ways rather than a reading of one track's limit, so this
   * asserts the relationship and not the number.
   */
  it('carries a polyphonic pool, which one trigger note could not describe', () => {
    const pool = device.voices[0]
    expect(pool?.kind).toBe('pool')
    if (pool?.kind !== 'pool') throw new Error('expected a pool')
    expect(pool.polyphony).toBeGreaterThan(1)
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with
   * at least one section whose variant resolved (§6.3).
   *
   * One definition, used by the sweep and by the page test. `noteInstruction` answers `none` for
   * a hooked or sustained part as well as for a blank grid part, so a page test asking it whether
   * a grid exists would count parts that draw none and then pass against an empty guide.
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
   * seeds 1-6. Four tracks rather than the successor's sixteen, so the totals are its own.
   *
   * The number moves when a direction gains or loses a part, and a diff is a prompt to re-read
   * the head note rather than a failure. What must not move is the relationship — no part ever
   * gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 126 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(150)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(126)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing — and on this box that is the whole story rather
    // than half of it, because a pitch is the only kind of note it has. The 24 are `sub` parts.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
  })

  it('leaves the blanks on the roles the direction wrote no pitch for', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's. Four tracks is a tight rig, so the spread is drums and little else.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['kick', 42],
      ['closed-hat', 30],
      ['snare', 18],
      ['ghost-perc', 12],
      ['rim', 12],
      ['ride', 6],
      ['tom', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook. Both of the other
    // two arms are empty here, which is itself the successor's shape and not this box's — four
    // tracks take fewer parts, and every one they take resolves a variant somewhere.
    const { grid, hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(72)
    expect(sustained).toEqual([])
    expect(noPattern).toEqual([])

    // The four arms are exhaustive, so the sweep cannot silently drop a part it could not
    // classify — which is what would make the 126 above an undercount rather than a measurement.
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
   * The resolved field itself, across every part rather than only the ones that draw a grid.
   * `noteInstruction` folds the trigger arm in with the pitch arm, so this is the one assertion
   * that a hooked part did not quietly acquire one either.
   */
  it('resolves no trigger note on any assignment, in any direction', () => {
    let seen = 0
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        for (const a of result.assignments) {
          seen += 1
          expect(a.triggerNote, `${template.id}/${a.role} seed ${String(seed)}`).toBeUndefined()
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
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
   * §2.1/#352. **The octave convention, recorded because the library holds two an octave apart
   * and a rendered note name shows neither.**
   *
   * p.24 §8.4 states it: *"MIDI note numbers 0–127 (corresponding to notes C0–G10, the first
   * through to eleventh octaves in the MIDI range) triggers the Sound of the active track."*
   * p.46's TRIG PARAMETERS screen confirms it from the other end, printing `ROOT` as `C 5 (60)`.
   *
   * This asserts the arithmetic, not a value in the manifest, and that is the point: a pitch on
   * this box belongs to the direction and is resolved against the song's key, which is a
   * different field from the one being declined here.
   */
  it('records the octave convention without authoring a note from it', () => {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    // C0 = 0 means octave numbering starts at zero, so MIDI n is octave floor(n / 12).
    const midiOf = (name: string, octave: number) => octave * 12 + NAMES.indexOf(name)

    expect(midiOf('C', 0)).toBe(0) //   p.24's "0-127 ... C0-G10", the bottom of the span
    expect(midiOf('G', 10)).toBe(127) // and the top of it, which is the arithmetic's own check
    expect(midiOf('C', 5)).toBe(60) //  p.46's TRIG screen, `C 5 (60)`

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
