import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  realisationOf,
  receiveTransports,
  renderGuide,
  resolve,
  resolveRecipe,
  sendTransports,
  type AuthoredParam,
  type CapabilityEvidence,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/elektron-digitone-ii/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
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
      // The first Digitakt reads `sampler` off its own manual rather than the sibling's: p.59
      // opens "Digitakt is a very competent and accessible sampler", and eight fungible tracks
      // each holding whatever is loaded is the same what-a-track-holds argument at half scale.
      ['elektron-digitakt', 'sampler'],
      ['elektron-digitakt-ii', 'sampler'],
      // Its own predecessor reads the same way on the same argument, and it reaches it over a
      // page that appears to say otherwise: OS 1.41's manual calls the Digitone a synthesizer
      // twice, once in silkscreen on the panel figure. That is the maker naming the sound engine,
      // not classifying the box — four sequenced tracks, 128 patterns, song mode and four MIDI
      // tracks are the same data structure this box has with twelve fewer tracks.
      ['elektron-digitone', 'groovebox'],
      ['elektron-digitone-ii', 'groovebox'],
      ['elektron-octatrack-mkii', 'sampler'],
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

/**
 * §2.1/#334. **This box authors no trigger note, for the plainest reason in the class:
 * `TriggerNote` is a sampler's fact and there is no sampler here.**
 *
 * The field holds *the note that plays this part's sound as it is* — a loaded sample's original
 * pitch. Every machine on this box is a synthesis engine, and a synth has no "as recorded" pitch
 * to be at; its note is the pitch you want, which §4.1 leaves to the direction.
 *
 *  - p.42: *"NOTE TRIGS trigger preset notes or MIDI notes"*, against *"LOCK TRIGS trigger
 *    parameter locks (but do not trigger notes)"*. The note is the content of the trig.
 *  - p.44's NOTE EDIT shows **several notes on one step** — `E 5`, `G 5`, `C 5`, each with its
 *    own time, length and velocity — and *"Press and turn DATA ENTRY knob A to select any note in
 *    the Chromatic scale."* A single `TriggerNote` cannot be a chord.
 *  - p.57: *"Trig Note sets the pitch of the note when trigged"*, and MIDI tracks *"have a
 *    different set of parameters on the TRIG, SYN, FLTR, and AMP pages"*.
 *
 * The octave convention is recorded and not used: p.24, *"E2-C7 (C5, MIDI note 60, being middle
 * C)"* with *"Note numbers 0-15 correspond to notes C0 through to D#1"*.
 */
describe('trigger notes: read for, and declined (§2.1/#334)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  /** Every machine this box can load, all of them synthesis engines (APPENDIX A.2). */
  const SYNTH_MACHINES = ['FM TONE', 'FM DRUM', 'WAVETONE', 'SWARMER']

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
    expect(authoring.map((d) => d.id)).not.toContain('elektron-digitone-ii')
  })

  it('expands to sixteen members on one pool, none of which carries a note', () => {
    // One pool is part of the reason: there is no second pool to hold an exception in, which is
    // the Digitakt II's structural point reached from the opposite direction.
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(16)
    expect(members.every((m) => m.poolId === 'track')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The reason, read off the recipes rather than restated.** Every recipe loads a synthesis
   * engine; none loads a sampler machine, because this box has none. A sample machine appearing
   * here would be the one change that makes the question worth asking again.
   */
  it('loads only synthesis engines, so no part has an original pitch to name', () => {
    const machines = new Set<string>()
    for (const recipe of device.recipes) {
      const loaded = machine(recipe)
      expect(loaded, recipe.id).toBeDefined()
      expect(SYNTH_MACHINES, recipe.id).toContain(loaded)
      machines.add(loaded as string)
    }
    // All four are actually in use, so this is a statement about the box rather than about which
    // recipes happen to exist.
    expect([...machines].sort()).toEqual(['FM DRUM', 'FM TONE', 'SWARMER', 'WAVETONE'])
    expect(device.recipes.every((r) => r.voice === 'track')).toBe(true)
  })

  /**
   * p.44's chord, from the model's side. A step here can hold several notes; `TriggerNote` holds
   * one. `polyphony` is the field that says so, and it is asserted because a drop to 1 would make
   * the chord argument silently untrue.
   */
  it('carries a polyphonic pool, which one trigger note could not describe', () => {
    const pool = device.voices[0]
    expect(pool?.kind).toBe('pool')
    if (pool?.kind !== 'pool') throw new Error('expected a pool')
    expect(pool.polyphony).toBeGreaterThan(1)
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
   * 216 is #334's figure for this device and it is expected to stay put, because nothing here is
   * a gap to close. The number moves when a direction gains or loses a part, and a diff is a
   * prompt to re-read the head note rather than a failure. What must not move is the relationship
   * — no part ever gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 216 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(240)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(216)

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
      ['ghost-perc', 42],
      ['kick', 42],
      ['clap', 18],
      ['open-hat', 18],
      ['snare', 18],
      ['metallic', 12],
      ['arp', 6],
      ['impact', 6],
      ['tom', 6],
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
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'generative-drift/sweep',
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
   * The resolved field itself, across every part rather than only the ones that draw a grid.
   * `noteInstruction` folds the trigger arm in with the pitch arm, so this is the one assertion
   * that a hooked or sustained part did not quietly acquire one either.
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
   * p.24 states it and confirms it from the floor: *"E2-C7 (C5, MIDI note 60, being middle C)"*
   * and *"Note numbers 0-15 correspond to notes C0 through to D#1"*. p.38 agrees from a third
   * place — keytracking is *"centered around middle C (C5)"* — and p.57's TRIG screen prints the
   * pair as `C 5 (60)`.
   *
   * This asserts the arithmetic, not a value in the manifest, and that is the point: a pitch on
   * this box belongs to the direction and is resolved against the song's key, which is a
   * different field from the one being declined here.
   */
  it('records the octave convention without authoring a note from it', () => {
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    // C5 = 60 means octave numbering starts at zero, so MIDI n is octave floor(n / 12).
    const midiOf = (name: string, octave: number) => octave * 12 + NAMES.indexOf(name)

    expect(midiOf('C', 5)).toBe(60) //   p.24, p.38, and p.57's `C 5 (60)`
    expect(midiOf('C', 0)).toBe(0) //    p.24's "Note numbers 0-15 ... C0 through to D#1"
    expect(midiOf('D#', 1)).toBe(15) //  the other end of that same sentence
    expect(midiOf('E', 2)).toBe(28) //   p.24's chromatic span, 16-84 = E2-C7
    expect(midiOf('C', 7)).toBe(84)

    // Nothing above is authored anywhere, which is the state this test exists to keep.
    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
