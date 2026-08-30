import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  expand,
  realisationOf,
  receiveTransports,
  resolveRecipe,
  sendTransports,
  type AuthoredParam,
  type CapabilityEvidence,
  type Recipe,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitone-ii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The Digitone II is the Digitakt II's chassis with four synthesis engines in it, so most of what
 * that manifest established about Elektron documentation is inherited rather than retested here.
 * This file is about the three places the two boxes part company, each of which is a claim about
 * **what a manifest may say when the box outruns the model or the manual outruns itself**:
 *
 *  1. sixteen voices shared across sixteen tracks, where `polyphony` is per-assignable;
 *  2. `ALGO` as the switch every FM value hangs off — and FM DRUM, where the switch cannot be
 *     authored at all and the values go with it;
 *  3. micro timing printed on two scales, so a lane the box has stays unreachable.
 */

const MANUAL = 'Digitone II User Manual OS 1.10'

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

function machine(recipe: Recipe): string | undefined {
  const p = named(recipe, 'SYN MACHINE')
  return p?.kind === 'enum' ? p.value : undefined
}

describe('Digitone II manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('elektron-digitone-ii')
    expect(device.maker).toBe('Elektron')
    expect(device.manual).toEqual({ title: 'Digitone II User Manual', edition: 'OS 1.10' })
  })

  it('is a groovebox beside its sampler sibling, on what the box is rather than what a track holds', () => {
    // The manual gives the box no category noun at all — "synthesizer" appears in it only about
    // other people's gear (§15.3) — so this is a judgement. Sixteen sequenced tracks, a kit per
    // pattern, 128 patterns to a project (p.16), song mode (p.53) and PERFORM KIT mode (p.55) are
    // what it turns on; the sibling's what-a-track-holds split, which would read `synth`, is
    // recorded in the manifest as the argument that was not taken.
    expect(device.kind).toBe('groovebox')
    const elektron = DEVICES.filter((d) => d.maker === 'Elektron').map((d) => [d.id, d.kind])
    expect(elektron).toEqual([
      ['elektron-analog-rytm-mkii', 'drum-machine'],
      ['elektron-digitakt-ii', 'sampler'],
      ['elektron-digitone-ii', 'groovebox'],
    ])
  })

  // -------------------------------------------------------------------------
  // 1. §2.2 — sixteen voices over sixteen tracks, and the number that is authored
  // -------------------------------------------------------------------------

  it('models sixteen mutually exclusive tracks as one pool', () => {
    // p.16: "16 tracks that can be either an audio track or a MIDI track." Same argument as the
    // Digitakt II's — sixteen audio plus sixteen MIDI would claim thirty-two simultaneous things.
    expect(device.voices).toHaveLength(1)
    expect(device.voices[0]?.kind).toBe('pool')
    expect(device.voices[0]?.kind === 'pool' ? device.voices[0].count : 0).toBe(16)
    expect(expand(device)).toHaveLength(16)
  })

  it('declares four notes a track and records the four as authored, not cited', () => {
    // The box really does sound chords — p.47's "16 voice polyphony", p.37's PLAY MODE POLY — so
    // 1 would be wrong. But the sixteen are one budget every track draws on, which `polyphony`
    // cannot say, and sixteen members at 16 would promise 256 simultaneous notes.
    expect(device.voices[0]?.polyphony).toBe(4)
    expect(expand(device).every((a) => a.polyphony === 4)).toBe(true)

    // **The point of this test is that the shortfall is declared where the audit can see it**,
    // rather than living in a comment. `partly` is the state for a fact with a page behind part
    // of it, and a bare citation here would claim a page for the 4.
    const voices = evidence('voices')
    expect(voices.kind).toBe('partly')
    if (voices.kind !== 'partly') throw new Error('voices evidence is not partly')
    expect(voices.cite.source).toContain(MANUAL)
    expect(voices.open).toContain('one budget')
    expect(voices.open).toContain('256')
  })

  it('sounds its chords itself rather than through a rendered sample', () => {
    // The sharpest difference from the sibling. A Digitakt II track is one voice, so a chord is
    // only reachable as `sampled-chord`; here the voice plays the notes, so `realisation` stays
    // at its default and no recipe claims otherwise.
    expect(device.recipes.every((r) => realisationOf(r) === 'polyphonic-voice')).toBe(true)

    const assignable = expand(device)[0]
    if (assignable === undefined) throw new Error('no assignable')
    const chordal = device.recipes.filter((r) => ['pad', 'stab'].includes(r.role))
    expect(chordal.length).toBeGreaterThan(0)
    for (const recipe of chordal) {
      const resolution = resolveRecipe(device, assignable, recipe.role, recipe.character, 3)
      expect(resolution.outcome, recipe.id).toBe('exact')
    }
  })

  it('carries PLAY MODE POLY on every recipe that needs the chord to sound', () => {
    // The same discipline `ALGO` gets, on a different switch: the identical preset left in MONO
    // sounds one note of the three, so the mode cannot come apart from the recipe that needs it.
    for (const recipe of device.recipes.filter((r) => ['pad', 'stab'].includes(r.role))) {
      const mode = named(recipe, 'PLAY MODE')
      expect(mode?.kind, recipe.id).toBe('enum')
      if (mode?.kind !== 'enum') continue
      expect(mode.value, recipe.id).toMatch(/^POLY/)
    }
  })

  it('is comfortable with ten of its sixteen, for two reasons the Digitakt II has only one of', () => {
    // A track spent as a MIDI track is one of the sixteen gone (p.16) — the sibling's argument —
    // and on top of it a polyphonic part spends several of the sixteen *voices* (p.47).
    expect(device.comfortableVoices).toBe(10)
    expect(device.comfortableVoices).toBeLessThan(12)
  })

  // -------------------------------------------------------------------------
  // 2. The algorithm switch, and where it cannot be authored
  // -------------------------------------------------------------------------

  describe('algorithm-dependent values (CLAUDE.md, the cited-wrong-scale rule)', () => {
    const fmTone = () => device.recipes.filter((r) => machine(r) === 'FM TONE')
    const fmDrum = () => device.recipes.filter((r) => machine(r) === 'FM DRUM')

    it('exercises both FM machines, so neither arm of this is vacuous', () => {
      expect(fmTone().length).toBeGreaterThan(3)
      expect(fmDrum().length).toBeGreaterThan(3)
    })

    it('gives every FM TONE recipe its ALGO, cited to the page that counts them', () => {
      // p.90 makes three separate values mean different things under different algorithms: MIX
      // crosses "two carrier outputs (X and Y) that come from two different operators depending
      // on what algorithm you chose"; FDBK reaches "the operator that has feedback"; LEV sets the
      // modulation from an operator whose routing ALGO picks. So ALGO travels with them.
      for (const recipe of fmTone()) {
        const a = named(recipe, 'ALGO')
        expect(a?.kind, recipe.id).toBe('enum')
        if (a?.kind !== 'enum') continue
        expect(a.options.values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
        expect(a.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.107` })
        // The *selection* is taste, exactly as GEN is on the TR-1000.
        expect(a.verified, recipe.id).toBe(false)
      }
    })

    it('never carries an algorithm-dependent value without the ALGO beside it', () => {
      const dependent = ['MIX', 'FDBK', 'LEV', 'LEV (A)', 'LEV (B)', 'RATIO A', 'RATIO B', 'RATIO C']
      for (const recipe of device.recipes) {
        const carries = params(recipe).filter((p) => dependent.includes(p.name))
        if (carries.length === 0) continue
        expect(named(recipe, 'ALGO'), `${recipe.id} carries ${carries.map((p) => p.name).join(', ')}`)
          .toBeDefined()
      }
    })

    it('authors no algorithm at all on FM DRUM, and drops what depends on one', () => {
      // **The rule applied by subtraction.** p.94's ALGO "selects the structure of how the three
      // operators are connected to each other", no page states how many there are, and the screen
      // draws a block diagram rather than a number — so there is no token to author. With the
      // switch unauthorable, FDBK, RATIO, MOD and DEC go with it rather than being printed
      // unpinned.
      const forbidden = ['ALGO', 'FDBK', 'RATIO', 'MOD', 'DEC', 'END']
      for (const recipe of fmDrum()) {
        for (const param of params(recipe)) {
          expect(forbidden, `${recipe.id} carries ${param.name}`).not.toContain(param.name)
        }
      }
    })

    it('leaves RATIO B unused although its range is one of the few printed', () => {
      // p.90 prints "(0.25–16.0)", and the parameter still displays as a *pair* — the p.89
      // screenshot shows 4.00 over 1.00 — because B2 climbs to 16 before B1 advances a step. One
      // authored number would not say which operator it is.
      expect(device.recipes.every((r) => named(r, 'RATIO B') === undefined)).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // 3. §4.3 — the articulation boundary, and the lane two printed scales close
  // -------------------------------------------------------------------------

  describe('the articulation boundary', () => {
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )

    it('uses only the scalar subset that stays true for every hit in a slot', () => {
      expect([...used].sort()).toEqual(
        [...used].filter((k) => (ARTICULABLE_PER_STEP as readonly string[]).includes(k)).sort(),
      )
      expect(used.size).toBeGreaterThan(2)
    })

    it('declares micro timing and never articulates it, because the manual prints two scales', () => {
      // The pop-up reached with [TRIG] + [LEFT]/[RIGHT] reads `+1/384` (p.48); the NOTE EDIT
      // menu's TIME is "-23–23", where 12 is halfway to the next trig (p.44). A `set` carries a
      // bare scalar with nowhere to name which, so `-2` would mean two different displacements.
      expect(device.features?.perStep).toContain('micro-timing')
      expect(ARTICULABLE_PER_STEP).not.toContain('micro-timing')
      expect(used.has('micro-timing')).toBe(false)
    })

    it('pairs a retrig with its rate, because one without the other is not an instruction', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          if (!('retrig' in entry.set)) continue
          expect(Object.keys(entry.set), `${recipe.id} ${entry.slot}`).toContain('retrig-rate')
        }
      }
    })

    it('keeps the stateful and unknowable lanes declared but unreachable', () => {
      // `condition` is stateful (p.51), `fill` depends on global runtime state (p.52), and a
      // `preset-lock` value would be a preset name no page prints (p.29, p.50).
      for (const lane of ['condition', 'fill', 'preset-lock']) {
        expect(device.features?.perStep).toContain(lane)
        expect(used.has(lane)).toBe(false)
      }
    })
  })

  // -------------------------------------------------------------------------
  // Provenance: every legality claim cited, every point left as taste
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
          }
        }
      }
    })

    it('claims no point value, because this manual prints values for none of them', () => {
      for (const recipe of device.recipes) {
        expect(recipe.verified, recipe.id).toBe(false)
        for (const param of params(recipe)) {
          expect(param.verified ?? false, `${recipe.id} ${param.name}`).toBe(false)
        }
      }
    })

    it('spells no unit the library has not reviewed, which costs BR its bits', () => {
      // `Bits` is in the reviewed vocabulary as the Tracker Mini's and the MPCs' *box-printed*
      // spelling. This manual prints "bits" only in prose, which is the standing the TR-8S's
      // "semitone" has, so the reading goes in `note` rather than adding a second spelling.
      const br = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === 'BR')
      expect(br.length).toBeGreaterThan(0)
      for (const param of br) {
        expect(param.kind).toBe('numeric')
        if (param.kind !== 'numeric') continue
        expect(param.unit).toBeUndefined()
        expect(param.note).toContain('bit depth')
      }
    })

    it('answers four of the five mood axes and declines the fifth by having no param for it', () => {
      const axes = new Set(
        device.recipes.flatMap((r) =>
          params(r).flatMap((p) => (p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [])),
        ),
      )
      expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'swing'])
      // `space` has no cited range to move: the DEL, REV and CHR send levels on p.62 are given no
      // scale, and mood may not move a value whose range nobody has verified.
      expect(axes.has('space')).toBe(false)
    })

    it('hoists the one setting that belongs to the pattern rather than the part', () => {
      const swing = device.recipes.flatMap((r) => params(r)).filter((p) => p.name === 'SWING')
      expect(swing.length).toBeGreaterThan(1)
      for (const param of swing) expect(param.scope).toBe('pattern')
    })

    it('loads no audio, and says so with a page rather than a shrug', () => {
      // The Muse's reading on a different engine: the pages answer, and the answer is no. Which
      // is why not one recipe carries `sourceAudio`, where all eighteen of the sibling's do.
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
      expect(counts.capabilityFacts).toBeGreaterThan(15)
      // Every point provisional and every range cited, which is this manual's shape twice over.
      expect(counts.provisionalPoints).toBe(counts.params)
      expect(counts.unverifiedRanges).toBe(0)
      expect(counts.moodInert).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // §7.4 — clock, and the transport that only goes one way
  // -------------------------------------------------------------------------

  describe('clock (§7.4)', () => {
    it('sends DIN sync on a wire it cannot receive it on', () => {
      // p.14 names the outbound ports MIDI OUT/SYNC A and MIDI THRU/SYNC B, each configurable to
      // "send DIN sync to legacy instruments"; MIDI IN is only "MIDI data input". There is no
      // SYNC C, and no page describes a DIN sync input.
      expect(sendTransports(device)).toEqual(['midi-din', 'usb', 'din-sync'])
      expect(receiveTransports(device)).toEqual(['midi-din', 'usb'])
    })

    it('tells a reader how to make each transport carry it', () => {
      const setups = device.clock.sourceSetup ?? []
      expect(setups.map((s) => s.transport)).toEqual(['midi-din', 'usb', 'din-sync'])
      for (const setup of setups) {
        // Every declared setup carries its own evidence entry — DeviceSchema enforces it, and
        // this says out loud which page each one came off.
        expect(device.capabilityEvidence?.[`clock.sourceSetup[${setup.transport}]`]).toBeDefined()
      }
      // The one instruction a reader could not discover without being told: DIN sync takes the
      // port over. "No MIDI data is transferred over the port when this option is selected" (p.75).
      const din = setups.find((s) => s.transport === 'din-sync')
      expect(din?.value).toBe('DIN 24')
      expect(din?.note).toContain('No MIDI data')
    })

    it('records USB as inferred rather than cited, because no page names it', () => {
      // CLOCK SEND and CLOCK RECEIVE are unqualified (p.74) and the port is chosen by OUTPUT TO /
      // INPUT FROM over "MIDI data" generally (p.75). That is two pages read together, not one
      // page stating it, and `partly` is the state that can say so.
      const transport = evidence('clock.transport')
      expect(transport.kind).toBe('partly')
      if (transport.kind !== 'partly') throw new Error('clock.transport evidence is not partly')
      expect(transport.open).toContain('USB')
    })

    it('claims no topology judgement, and says why', () => {
      expect(device.clock.preferredSource).toBeUndefined()
      expect(evidence('clock.preferredSource').kind).toBe('unknown')
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel
  // -------------------------------------------------------------------------

  describe('the panel (§10)', () => {
    it('matches the drawn aspect to the specification, which is what picks 176 over 63', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      expect(device.physical.panelSpanMm).toBe(215)
      expect(panel.panelRiseMm).toBe(176)
      // Measured: the panel's outer border is 976 x 799 px at 200 dpi. 976/799 = 1.22153 against
      // the specification's 215/176 = 1.22159; the depth reading, 215/63, is 3.41 and 179% out.
      expect(device.physical.panelSpanMm / panel.panelRiseMm).toBeCloseTo(976 / 799, 3)
    })

    it('shares its rise with the Digitakt II, because it is the same steel case', () => {
      const sibling = DEVICES.find((d) => d.id === 'elektron-digitakt-ii')
      expect(sibling?.physical.panelSpanMm).toBe(device.physical.panelSpanMm)
      expect(sibling?.panel?.panelRiseMm).toBe(device.panel?.panelRiseMm)
    })

    it('puts the voice field on the sixteen TRIG keys, which are the track selectors', () => {
      const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
      expect(fields).toHaveLength(1)
      expect(fields[0]?.kind === 'voices' ? fields[0].label : undefined).toBe('TRACK')
    })

    it('draws nothing the maker drew, the logo included', () => {
      // §10: panel artwork is reference, never asset. The p.12 figure prints the Elektron mark in
      // its top right corner and this layout has no feature there.
      const labels = (device.panel?.features ?? []).flatMap((f) =>
        'label' in f && f.label !== undefined ? [f.label] : [],
      )
      for (const label of labels) expect(label.toLowerCase()).not.toContain('elektron')
    })
  })
})
