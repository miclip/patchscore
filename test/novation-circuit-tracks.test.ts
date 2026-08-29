import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  moodState,
  realisationOf,
  resolve,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { patternDriver } from '../lib/core/pipeline'
import { sidechainReading } from '../lib/core/sidechain'
import { DEVICES } from '../lib/devices/registry.generated'
import { device } from '../lib/devices/novation-circuit-tracks/index'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

const GUIDE = 'Circuit Tracks User Guide v3, p.'
const PROGRAMMER = "Circuit Tracks Programmer's Reference Guide v3, p."

function pool(id: string) {
  const voice = device.voices.find((v) => v.id === id)
  if (voice === undefined || voice.kind !== 'pool') throw new Error(`no pool '${id}'`)
  return voice
}

function recipesOn(voice: string): Recipe[] {
  return device.recipes.filter((r) => r.voice === voice)
}

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

/** Every legality citation a recipe carries: a numeric's range, an enum's option set. */
function legality(recipe: Recipe): string[] {
  return params(recipe)
    .flatMap((p) =>
      p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : [],
    )
    .filter((v): v is { kind: 'manual'; source: string } => v !== undefined && v !== false && v.kind === 'manual')
    .map((v) => v.source)
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('Circuit Tracks manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  // -------------------------------------------------------------------------
  // §10 — the panel, and the one figure neither document states
  // -------------------------------------------------------------------------

  it('takes its span from the maker, because neither document has a specifications table', () => {
    // The User Guide runs introduction → Bootloader Mode → trademarks with no specifications
    // section, and the Programmer's Reference is 22pp of MIDI tables. `maker` is the kind #191
    // added for exactly this: a published figure that is not a manual page.
    expect(device.physical.panelSpanMm).toBe(240)
    expect(device.physical.verified).toMatchObject({ kind: 'maker' })
    // The depth, not the height: 45 mm is how far off the desk the box stands.
    expect(device.panel?.panelRiseMm).toBe(210)
  })

  it('keeps every drawn feature inside the 240 x 210 panel', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(240)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(210)
    }
  })

  it('draws the eight Macros at one diameter and the two master encoders larger', () => {
    // A radial profile finds the cap edge at r = 43-47 px across the eight Macros — render
    // noise on eight identical parts, so they are drawn at the mean. Master Volume (48) and
    // Master Filter (52) are separated by more than that spread, so they keep their own sizes.
    const knobs = (device.panel?.features ?? []).filter((f) => f.kind === 'knob')
    expect(knobs).toHaveLength(10)
    const macros = knobs.filter((k) => /^\d /.test(k.label ?? ''))
    expect(macros).toHaveLength(8)
    const macroDiameters = new Set(macros.map((k) => k.d))
    expect(macroDiameters.size).toBe(1)
    const macroD = [...macroDiameters][0] ?? 0

    const masterVolume = knobs.find((k) => k.label === 'Master Volume')
    const masterFilter = knobs.find((k) => k.label === 'Master Filter')
    expect(masterVolume?.d ?? 0).toBeGreaterThan(macroD)
    expect(masterFilter?.d ?? 0).toBeGreaterThan(masterVolume?.d ?? 0)
  })

  it('meets the fourth pad row exactly, so the split falls on a real row boundary', () => {
    // The field takes three of the four pad rows and the fourth is drawn as pads — a drawing
    // decision, not a claim that the box divides its pads three-and-one (see `panel.ts`). What
    // must be true of the box is that the seam sits on a row boundary and the two boxes share a
    // column lattice, or the fourth row's cells stop landing on the pads under them.
    const voices = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
    const grids = (device.panel?.features ?? []).filter((f) => f.kind === 'grid')
    expect(voices).toHaveLength(1)
    expect(grids).toHaveLength(1)
    const field = voices[0]
    const grid = grids[0]
    if (field === undefined || grid === undefined) throw new Error('no field or grid')
    expect(field.label).toBe('Tracks')
    expect(grid.cols).toBe(8)
    expect(grid.rows).toBe(1)
    expect(grid.x).toBe(field.x)
    expect(grid.w).toBe(field.w)
    // Contiguous, and the field is three of the grid's row pitches tall.
    expect(grid.y).toBeCloseTo(field.y + field.h, 2)
    expect(field.h / grid.h).toBeCloseTo(3, 1)

    // Nothing is drawn behind the field: a button under a voice cell would name a different part
    // from the cell over it, which is worse than the eight-buttons-six-cells count not matching.
    for (const b of (device.panel?.features ?? []).filter((f) => f.kind === 'button')) {
      const overlaps =
        b.x < field.x + field.w &&
        b.x + b.w > field.x &&
        b.y < field.y + field.h &&
        b.y + b.h > field.y
      expect(overlaps, b.label).toBe(false)
    }
  })

  // -------------------------------------------------------------------------
  // §2.1 — two pools, and six assignables against the box's eight tracks
  // -------------------------------------------------------------------------

  it('declares a synth pool and a drum pool at their hardware counts', () => {
    expect(device.voices.map((v) => v.kind)).toEqual(['pool', 'pool'])
    expect(device.voices.map((v) => v.id)).toEqual(['synth-track', 'drum-track'])
    // Not a headroom choice, unlike the MC-101's eight-of-sixteen pads: the box has exactly
    // two synth tracks and exactly four drum tracks, so there is nothing to trim.
    expect(pool('synth-track').count).toBe(2)
    expect(pool('drum-track').count).toBe(4)
    // p.35: "Circuit Tracks' synth engines are 'six-note polyphonic'" — the one polyphony figure
    // either document states. A drum track's is an authoring choice; no page says whether a step
    // retriggering a sounding sample cuts it or overlaps it.
    expect(pool('synth-track').polyphony).toBe(6)
    expect(pool('drum-track').polyphony).toBe(1)

    /**
     * So the `voices` evidence cannot be `manual` — one path covers the counts, the synth
     * polyphony and the drum polyphony, and only the first two are on a page. It cannot be
     * `unknown` either, which this device carried for two commits: that says the reading came
     * back with nothing when it came back with two thirds.
     *
     * `partly` (§2.6/#236) is the state that can say both halves, and this asserts that it does
     * — the page and what it proves, and separately what it leaves open. Either half missing
     * would be one of the two wrong states again.
     */
    const voicesEvidence = device.capabilityEvidence?.['voices']
    expect(voicesEvidence).toMatchObject({ kind: 'partly' })
    if (voicesEvidence === undefined || voicesEvidence === false || voicesEvidence.kind !== 'partly') {
      throw new Error('no partly-verified fact at voices')
    }
    // The two good pages survive the move, and the open half names what no page settles.
    expect(voicesEvidence.cite.source).toMatch(/p{1,2}\.35/)
    expect(voicesEvidence.proven).toMatch(/six-note polyphonic/)
    expect(voicesEvidence.open).toMatch(/drum track/)
    expect(voicesEvidence.proven).toMatch(/p\.64/)
  })

  it('expands to six assignables, two short of the box’s eight tracks', () => {
    const assignables = expand(device)
    expect(assignables).toHaveLength(6)
    expect(assignables.map((a) => a.voiceId)).toEqual([
      'synth-track-1',
      'synth-track-2',
      'drum-track-1',
      'drum-track-2',
      'drum-track-3',
      'drum-track-4',
    ])
    // The missing two are the MIDI tracks, and their absence is the point: they make no sound
    // (p.59), so they are not voices. See the manifest for the routing gap that comes with it.
    expect(assignables.every((a) => a.poolId !== undefined && a.ordinal !== undefined)).toBe(true)
  })

  // -------------------------------------------------------------------------
  // §2.2 — pool-keyed recipe lookup
  // -------------------------------------------------------------------------

  it('addresses every recipe to a pool id, never to an expanded ordinal', () => {
    const poolIds = new Set(device.voices.map((v) => v.id))
    for (const recipe of device.recipes) expect(poolIds, recipe.id).toContain(recipe.voice)
    expect(recipesOn('synth-track').length).toBeGreaterThan(0)
    expect(recipesOn('drum-track').length).toBeGreaterThan(0)
  })

  it('resolves one authored recipe from every ordinal in its pool', () => {
    const assignables = expand(device)
    for (const recipe of device.recipes) {
      const members = assignables.filter((a) => a.poolId === recipe.voice)
      expect(members.length, recipe.id).toBeGreaterThan(0)
      for (const member of members) {
        const where = `${recipe.id} on ${member.voiceId}`
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character, 1)
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  // -------------------------------------------------------------------------
  // §3 — the recipe library
  // -------------------------------------------------------------------------

  it('keeps the widest authored chord inside the synth track’s polyphony', () => {
    const widest = Math.max(
      ...TEMPLATES.flatMap((t) =>
        (t.hooks ?? []).map((hook) => {
          const perStep = new Map<number, number>()
          for (const note of hook.notes) perStep.set(note.step, (perStep.get(note.step) ?? 0) + 1)
          return Math.max(...perStep.values())
        }),
      ),
    )
    expect(widest).toBeLessThanOrEqual(pool('synth-track').polyphony)
  })

  // -------------------------------------------------------------------------
  // §3.2 — legality is cited, authority never is
  // -------------------------------------------------------------------------

  it('cites every range and option set, and no point', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of params(recipe)) {
        const where = `${recipe.id} / ${param.name}`
        expect(param.verified, where).toBe(false)
        if (param.kind === 'numeric') {
          expect(param.range.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
          expect(param.value, where).toBeLessThanOrEqual(param.range.max)
          expect(param.step, where).toBeUndefined()
        }
        if (param.kind === 'enum') {
          expect(param.options.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
  })

  it('takes every range from the Programmer’s Reference except the one it does not carry', () => {
    // This is the #18 trap in Novation's hand: the User Guide ranges almost nothing a recipe
    // needs, and authoring from it alone would leave every value on an uncited — and therefore
    // mood-inert — range. Swing is the single exception in the other direction: p.86 ranges it
    // `20 to 80` and the Programmer's Reference has no swing parameter at all.
    const guideRanged = new Set<string>()
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.kind !== 'numeric') continue
        const cite = param.range.verified
        if (cite !== undefined && cite !== false && cite.source.startsWith(GUIDE)) {
          guideRanged.add(param.name)
        }
      }
    }
    expect([...guideRanged]).toEqual(['SWING'])
  })

  // -------------------------------------------------------------------------
  // What this box makes easy to get wrong
  // -------------------------------------------------------------------------

  it('declares a mono patch as mono, so a six-voice track is never handed a chord it drops', () => {
    // p.35's polyphony sentence carries a conditional — "if the Patch you've selected is
    // suitably polyphonic" — and §12.4's `patchPolyphony` is what expresses it. A recipe in a
    // Mono polyphony mode on a six-voice track would otherwise be offered a triad and sound
    // one note of it, with nothing in the guide saying so.
    for (const recipe of recipesOn('synth-track')) {
      const mode = paramNamed(recipe, 'POLYPHONY MODE')
      if (mode === undefined || mode.kind !== 'enum') throw new Error(`${recipe.id}: no mode`)
      const mono = mode.value.startsWith('Mono')
      expect(recipe.patchPolyphony === 1, `${recipe.id} (${mode.value})`).toBe(mono)
    }
    // Both cases are actually present; this would pass vacuously if one had been dropped.
    expect(recipesOn('synth-track').some((r) => r.patchPolyphony === 1)).toBe(true)
    expect(recipesOn('synth-track').some((r) => r.patchPolyphony === undefined)).toBe(true)
  })

  it('names the centre on every signed parameter, because the box shows no number', () => {
    // The Programmer's Reference prints these as `0 – 127 (-64 – 63)` and a Macro has no
    // numeric readout at all (p.34), so a bare `PITCH 56` says nothing about which way it went.
    const signedNames = new Set(['PITCH', 'PAN', 'EQ', 'OSC 2 CENTS', 'OSC 2 SEMITONES', 'ENV 2 → FREQUENCY'])
    let seen = 0
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (!signedNames.has(param.name)) continue
        seen += 1
        expect(param.note, `${recipe.id} / ${param.name}`).toMatch(/64 is/)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('gives every drum recipe a source and no synth recipe one', () => {
    // A drum track plays a sample and the samples are factory content nobody has enumerated,
    // so a cutoff on a track with nothing loaded is a setting with no subject. A synth track
    // makes its own sound and has nothing to load.
    for (const recipe of recipesOn('drum-track')) {
      expect(recipe.sourceAudio?.need, recipe.id).toBeTruthy()
    }
    for (const recipe of recipesOn('synth-track')) {
      expect(recipe.sourceAudio, recipe.id).toBeUndefined()
    }
    // §2.6/#111: a recipe carrying `sourceAudio` needs a `content` entry that is not `false`.
    expect(device.content?.kind).toBe('shipped-library')
    expect(device.capabilityEvidence?.['content']).toMatchObject({ kind: 'manual' })
  })

  it('sends clock over a socket it has and never receives over one it does not', () => {
    // The rear panel has one Sync socket and it is an output (p.18). Declaring `analog-clock`
    // undirected would have the guide telling a reader to sync this box to a Eurorack clock
    // over a hole that does not exist — the Mother-32 defect `ClockSpec` was widened to prevent.
    expect(device.clock.sendTransport).toContain('analog-clock')
    expect(device.clock.receiveTransport).not.toContain('analog-clock')
    expect(device.clock.receiveTransport).toEqual(['midi-din', 'usb'])
    const sync = (device.jacks ?? []).find((j) => j.id === 'Sync')
    expect(sync?.direction).toBe('out')
    expect(sync?.clock).toEqual(['analog-clock'])
    // And only one socket claims midi-din clock, so the rack is never choosing between holes.
    const midiOut = (device.jacks ?? []).filter(
      (j) => j.direction === 'out' && (j.clock ?? []).includes('midi-din'),
    )
    expect(midiOut.map((j) => j.id)).toEqual(['MIDI Out'])
  })

  it('reports that nothing drives a CV synth beside it, which is the documented gap', () => {
    // The two MIDI tracks exist to play other boxes (p.59), and `patternDriver` cannot say so:
    // it resolves a driver by pairing a `pitch-cv` output with a `gate` output, and this box has
    // neither. So a rig of a Circuit Tracks and a Minitaur reports `nothing-drives` — wrong about
    // the rig, right about the model, and recorded in the manifest rather than special-cased.
    //
    // Pinned here so it fails loudly the day the engine learns to route MIDI: that is the day
    // the manifest's note stops being true and somebody has to come back and delete it.
    const circuit = DEVICES.find((d) => d.id === 'novation-circuit-tracks')
    const minitaur = DEVICES.find((d) => d.id === 'moog-minitaur')
    if (circuit === undefined || minitaur === undefined) throw new Error('missing device')
    const template = TEMPLATES.find((t) => t.id === 'weave')
    if (template === undefined) throw new Error('no weave')

    const result = resolve({
      devices: [circuit, minitaur],
      template,
      mood: moodState({}),
      seed: 3,
    })
    expect(patternDriver(result.interDevicePatch, 'moog-minitaur').state).toBe('nothing-drives')
    // And the reason, stated as data: no socket on this box carries a note or a gate voltage.
    const voltage = (device.jacks ?? []).filter(
      (j) => j.signal.includes('pitch-cv') || j.signal.includes('gate'),
    )
    expect(voltage).toEqual([])
  })

  it('records that the USB port carries no audio, rather than staying silent about it', () => {
    expect(device.io.usbAudio).toBe(false)
    expect(device.capabilityEvidence?.['io.usbAudio']).toMatchObject({ kind: 'cited-against' })
  })

  it('gives every reasoned non-claim a reason', () => {
    for (const [path, fact] of Object.entries(device.capabilityEvidence ?? {})) {
      if (fact === false) throw new Error(`${path}: bare false`)
      if (fact.kind === 'manual' || fact.kind === 'observed' || fact.kind === 'maker') continue
      // §2.6/#236. `partly` carries the same obligation in two halves rather than one sentence:
      // what the page proves, and what it leaves open. Both have to be said.
      if (fact.kind === 'partly') {
        expect(fact.proven.length, `${path} proven`).toBeGreaterThan(20)
        expect(fact.open.length, `${path} open`).toBeGreaterThan(20)
        continue
      }
      // #117/#120: a bare state is an author giving up in a field that reads like diligence.
      expect(fact.reason.length, path).toBeGreaterThan(40)
    }
  })

  it('hints at which Macro every unlabelled value sits under', () => {
    // The encoders are endless and show no number (p.34), so the hint is how a reader knows
    // which of eight a value belongs to. Every hint a recipe names must exist in the table.
    const keys = new Set(Object.keys(device.hints ?? {}))
    for (const recipe of device.recipes) {
      if (recipe.sourceAudio?.hint !== undefined) {
        expect(keys, recipe.id).toContain(recipe.sourceAudio.hint)
      }
      for (const param of params(recipe)) {
        if (param.hint !== undefined) expect(keys, `${recipe.id} / ${param.name}`).toContain(param.hint)
      }
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint !== undefined) expect(keys, recipe.id).toContain(entry.hint)
      }
    }
    // Invariant 7: a hint is a jog, not documentation.
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThanOrEqual(8)
    }
  })

  it('sets swing once for the Project, not once per part', () => {
    // There is no per-track and no per-pattern swing on this box: Tempo View's Macro 2 is the
    // only one (p.86), and tempo belongs to the Project (p.85). Without `scope` the guide
    // prints the same number under all six parts and a reader wonders which one stuck.
    for (const recipe of device.recipes) {
      const param = paramNamed(recipe, 'SWING')
      expect(param, recipe.id).toBeDefined()
      expect(param?.scope, recipe.id).toBe('song')
    }
  })

  it('addresses every articulation by pattern slot and by a lane the box has', () => {
    const lanes = new Set(device.features?.perStep ?? [])
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(lanes, `${recipe.id} / ${key}`).toContain(key)
        }
      }
    }
    // The four lanes a recipe reaches for are all counted-pad displays, so unlike the Macro
    // values they are things a reader can set exactly and see.
    expect(lanes.has('velocity') && lanes.has('gate') && lanes.has('probability')).toBe(true)
  })

  it('keeps every probability value to one of the eight the box offers', () => {
    // p.47: eight values, one per lit pad, from 12.5% to 100%. Anything between them is a
    // number a reader cannot enter.
    const legal = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        const value = entry.set['probability']
        if (value === undefined) continue
        expect(legal, `${recipe.id}: ${String(value)}`).toContain(value)
      }
    }
  })

  it('keeps every step value to one a reader can enter on the pads', () => {
    // p.42: Velocity View is a sixteen-pad fader, and the table gives what each count of lit pads
    // is worth — 8, 16, ... 120, and 127 at the top. Live recording reaches the full 0-127
    // (p.42), but an articulation is an instruction to set a step, and the gesture for that is
    // the pads. A value between two rungs is a number the reader cannot enter.
    const LADDER = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 127]
    let seen = 0
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        const value = entry.set['velocity']
        if (value === undefined) continue
        seen += 1
        expect(LADDER, `${recipe.id}: ${String(value)}`).toContain(value)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('leaves every articulation point provisional, because no page picks it', () => {
    // The pages behind these lanes establish that the lane exists and what it ranges over —
    // p.42's velocity table, p.45's gate, p.47's eight probabilities. None of them says this step
    // wants 120 rather than 112, which is taste exactly as `FILTER FREQUENCY 34` is. Citing the
    // lane's page on the entry would make the *point* authored, which is the one claim it cannot
    // support; a compound entry would also cite one page for two lanes documented on two pages.
    //
    // The lane's own legality is cited where it belongs, on `features.perStep`.
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        expect(entry.verified, `${recipe.id} / ${entry.slot}`).toBeUndefined()
      }
      expect(recipe.verified, recipe.id).toBe(false)
    }
    expect(device.capabilityEvidence?.['features.perStep']).toMatchObject({ kind: 'manual' })
  })

  it('declares no note duration, because the two pools answer differently', () => {
    // §2.6/#142 is device-level, and this box holds two answers: p.45 gives a synth track a
    // per-note Gate in steps, while p.66 has Gate View on a *drum* track showing micro steps and
    // p.63 puts a drum hit's length on the DECAY macro. Declaring the synth answer would print a
    // gate under a drum part that has none, so the field is omitted and the reading is recorded.
    expect(device.noteDuration).toBeUndefined()
    const evidence = device.capabilityEvidence?.['noteDuration']
    // `cited-against` rather than `unknown`: three pages answer, so the reading did not run out,
    // and what they answer is that no one device-level model fits. That is a refutation of the
    // field's premise, and it is the only non-claim state that carries a page for it.
    expect(evidence).toMatchObject({ kind: 'cited-against' })
    if (evidence === undefined || evidence === false || !('reason' in evidence)) {
      throw new Error('no reasoned non-claim at noteDuration')
    }
    expect(evidence.reason).toMatch(/p\.66/)
    // The citation spans all three, because one page alone does not make the point.
    if (!('cite' in evidence)) throw new Error('cited-against without a cite')
    expect(evidence.cite.source).toContain('pp.45, 63, 66')
    // And it must not read as "this box expresses no duration": the synth tracks do.
    expect(evidence.reason).toMatch(/not a claim that the box expresses no duration/)
  })

  it('takes its sidechain trigger from a drum track, never from the audio inputs', () => {
    // `lib/core/sidechain.ts`: the flag "records where the **trigger** comes from, never what is
    // being ducked". p.93 mentions the external inputs because they are ducked, and enumerates
    // the trigger as Drum 1-4. Read the other way it is the TR-1000's two-commit mistake, and the
    // guide it produces tells a reader to patch a cable into Inputs 1 that would do nothing.
    expect(device.features?.sidechain).toEqual({ internal: true, fromExternalAudio: false })
    expect(device.capabilityEvidence?.['features.sidechain.fromExternalAudio']).toMatchObject({
      kind: 'cited-against',
    })
    // The box does have the inputs; this is a claim about the trigger, not about the sockets.
    expect(device.io.audioIn).toBe(true)
    const reading = sidechainReading([device])
    expect(reading.fromOtherBoxes).toEqual([])
    expect(reading.selfOnly.map((d) => d.deviceId)).toEqual(['novation-circuit-tracks'])
  })

  it('keeps every micro-step delay to the one-to-five the box offers', () => {
    // p.48: "delaying individual notes on a step by between one and five 'ticks'". Zero is the
    // step itself and six would be the next step.
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        const value = entry.set['micro-step']
        if (value === undefined) continue
        expect(typeof value).toBe('number')
        expect(value as number, recipe.id).toBeGreaterThanOrEqual(1)
        expect(value as number, recipe.id).toBeLessThanOrEqual(5)
      }
    }
  })
})
