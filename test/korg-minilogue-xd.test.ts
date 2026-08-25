import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  NEUTRAL_MOOD,
  assignableKey,
  expand,
  realisationOf,
  requiredVoicePolyphony,
  resolve,
  type Assignable,
  type AuthoredParam,
  type Recipe,
  type RoleRequest,
} from '../lib/core/index'
import { device } from '../lib/devices/korg-minilogue-xd/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'
import { template } from './fixtures'

/**
 * The minilogue xd is the library's first `kind: 'synth'` and its first genuinely **polyphonic
 * voice**, and those two firsts are what this file is for.
 *
 * Everything before it either sounds one note per voice (every drum machine, both semi-modulars,
 * the Digitakt II, both Tracker Mini pools) or reaches a chord by loading one (the Tracker Mini's
 * `sampled-chord` pad). The Deluge's `polyphony: 8` is the only other real one, and it is a pool
 * of twenty-four tracks - so the shape that has never been tested is the one this box has: **a
 * single assignable that carries several notes and exactly one part.**
 *
 * Most of what follows is therefore about that one number. Four voices is capacity *inside* a
 * part (§12.4), and the two halves of that claim pull in opposite directions:
 *
 *  - a four-note part must fit **within** the one assignable, without the resolver needing a
 *    second one from anywhere;
 *  - two parts must **not** both fit, because the four voices share one set of knob positions
 *    and there is no second patch to put on them.
 *
 * A manifest that declared four voices of `polyphony: 1` would pass the first half and fail the
 * second silently - printing two different patches for one panel, which is the failure the
 * Assignable/Occupancy split exists to make impossible. Both halves are asserted below.
 */

const MANUAL = "minilogue xd Owner's Manual E 9"

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function every(): AuthoredParam[] {
  return device.recipes.flatMap(params)
}

/**
 * How many notes a recipe leaves itself, read off the voice mode it selects (p.17).
 *
 * This is the number the engine cannot see. `Assignable.polyphony` is 4 and stays 4, because
 * that is a fact about the box; what a recipe does with the four is a fact about the recipe, and
 * `Recipe` has nowhere to put it. So the tests derive it here and hold the manifest to it.
 */
function notesAvailable(recipe: Recipe): number {
  const mode = paramNamed(recipe, 'VOICE MODE TYPE')
  const depth = paramNamed(recipe, 'VOICE MODE DEPTH')
  if (mode?.kind !== 'enum') throw new Error(`${recipe.id}: no VOICE MODE TYPE`)
  if (depth?.kind !== 'numeric') throw new Error(`${recipe.id}: no VOICE MODE DEPTH`)
  // "The 4 voices will be stacked together into a single voice in unison, as a mono synth."
  if (mode.value === 'UNISON') return 1
  // "Turn the knob to the right to switch to DUO mode, which stacks two voices when playing a
  // key." Two of four per key is two notes; at 0 the mode is plain POLY and all four are free.
  if (mode.value === 'POLY') return depth.value === 0 ? 4 : 2
  throw new Error(`${recipe.id}: unexpected voice mode ${mode.value}`)
}

/** A request, with the fields every one of these tests would otherwise repeat. */
function ask(over: Partial<RoleRequest> & Pick<RoleRequest, 'id' | 'role'>): RoleRequest {
  return { priority: 1, character: 'dark', sustain: 'continuous', ...over }
}

function rig(roles: RoleRequest[]) {
  return resolve({
    devices: [device],
    template: template({ roles, patterns: [], hooks: [] }),
    mood: NEUTRAL_MOOD,
    seed: 1,
  })
}

describe('minilogue xd manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('korg-minilogue-xd')
    expect(device.name).toBe('minilogue xd')
    expect(device.maker).toBe('KORG')
  })

  it('is the library first `synth`, and no longer its only one', () => {
    // `synth` was in `DEVICE_KINDS` from the start with nothing behind it. This manifest did not
    // widen the picker's filter - it filled an option that could previously only return nothing.
    // The Subsequent 37 joined it later, which is the shape this assertion now holds: the kind
    // has more than one box behind it, and this is the first of them in folder order.
    expect(device.kind).toBe('synth')
    const synths = DEVICES.filter((d) => d.kind === 'synth').map((d) => d.id)
    expect(synths.length).toBeGreaterThan(1)
    expect(synths).toContain('korg-minilogue-xd')
    // And the two are genuinely different instruments rather than a duplicate: four voices
    // against two, stereo against mono.
    expect(synths).toContain('moog-subsequent-37')
  })

  it('sends and receives clock, over all three transports the manual names', () => {
    // p.58 for sending, p.46 for `Clock Source`, pp.7/46/55 for the volca-style sync pair.
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'sync'])
    // §7.4: a synth can drive a rig; driving one is not its job.
    expect(device.clock.preferredSource).toBeUndefined()
  })

  it('declares no patch points, because there is no patchbay to declare', () => {
    // §3.3 is for a box a recipe cables into itself. SYNC, CV IN, MIDI and the outputs are rig
    // connections, and §10's rack draws those from `clock` and `io`.
    expect(device.jacks).toBeUndefined()
    expect(device.recipes.every((r) => r.patch === undefined)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// §10 - the panel, and the dimension line with four numbers on it
// ---------------------------------------------------------------------------

describe('the panel (§10)', () => {
  it('spans 500 x 300 mm, both figures off the keyboard own Dimensions line', () => {
    expect(device.physical.panelSpanMm).toBe(500)
    expect(device.panel?.panelRiseMm).toBe(300)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.66` })
    // The drawing the coordinates were read off is a different page and a different claim.
    expect(device.panel?.verified).toEqual({
      kind: 'manual',
      source: `${MANUAL}, p.5 (Front panel controls)`,
    })
  })

  it('takes neither of the two wrong numbers on that line', () => {
    // p.66 prints two products on one row:
    //   minilogue xd:         500 x 300 x 85 mm
    //   minilogue xd module:  500 x 179 x 85 mm
    // 179 is the *module's* depth - a different box, the same width - and 85 is how far either
    // one stands off the desk. Both are plausible-looking rises and both would draw a panel that
    // is not this instrument. The drawn aspect settles it: p.5 measures 1.640 : 1, against
    // 500/300 = 1.667 and 500/179 = 2.79.
    const rise = device.panel?.panelRiseMm
    expect(rise).not.toBe(179)
    expect(rise).not.toBe(85)
    expect(device.physical.panelSpanMm / (rise ?? 1)).toBeCloseTo(1.667, 2)
  })

  it('keeps every drawn feature inside the published footprint', () => {
    const panel = device.panel
    if (panel === undefined) throw new Error('no panel')
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(500)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(300)
    }
  })

  it('draws one voice field, holding one cell, in the VOICE MODE section', () => {
    const fields = device.panel?.features.filter((f) => f.kind === 'voices') ?? []
    expect(fields).toHaveLength(1)
    const group = device.panel?.features.find((f) => f.kind === 'group' && f.label === 'VOICE MODE')
    if (group?.kind !== 'group' || fields[0]?.kind !== 'voices') throw new Error('no VOICE MODE group')
    // Inside the section whose job is allocating the voices - §10's "somewhere true".
    expect(fields[0].x).toBeGreaterThanOrEqual(group.x)
    expect(fields[0].y).toBeGreaterThanOrEqual(group.y)
    expect(fields[0].x + fields[0].w).toBeLessThanOrEqual(group.x + group.w)
    expect(fields[0].y + fields[0].h).toBeLessThanOrEqual(group.y + group.h)
  })

  it('draws 37 keys, as 22 white and 15 black in the clusters a keyboard has', () => {
    const keys = (device.panel?.features ?? []).filter((f) => f.kind === 'grid' && f.shape === 'key')
    const cells = keys.reduce((sum, f) => sum + (f.kind === 'grid' ? f.cols * f.rows : 0), 0)
    // p.66: "37 keys (slim keyboard, velocity sensitive)".
    expect(cells).toBe(37)
    // One white grid plus six black clusters: 2 then 3 per octave, three octaves.
    expect(keys).toHaveLength(7)
    const black = keys.filter((f) => f.kind === 'grid' && f.cols < 22)
    expect(black.map((f) => (f.kind === 'grid' ? f.cols : 0))).toEqual([2, 3, 2, 3, 2, 3])
  })
})

// ---------------------------------------------------------------------------
// §12.4 - the four voices, from both ends
// ---------------------------------------------------------------------------

describe('four voices are one assignable, not four (§12.4)', () => {
  it('expands to exactly one assignable, of polyphony 4', () => {
    // p.66: `Maximum polyphony  4 voices`. p.17: "four analog synthesizer voices ... combine and
    // allocate the voices in different ways" - one patch, allocated, never four patches.
    const assignables = expand(device)
    expect(assignables).toHaveLength(1)
    expect(assignables[0]?.polyphony).toBe(4)
    expect(assignables[0]?.voiceId).toBe('voice')
    expect(assignables[0]?.poolId).toBeUndefined()
    expect(device.voices).toHaveLength(1)
  })

  it('carries a four-note part inside that one assignable', () => {
    const result = rig([ask({ id: 'r-pad', role: 'pad', polyphony: 4 })])
    expect(result.shortfalls).toEqual([])
    expect(result.assignments).toHaveLength(1)
    const [pad] = result.assignments
    expect(pad?.notes).toBe(4)
    // The whole claim in one line: four notes, one voice, and no second voice involved.
    expect(pad?.assignable.polyphony).toBe(4)
    expect(expand(device)).toHaveLength(1)
  })

  it('asks the single voice for the whole note count, never for a chord it cannot load', () => {
    // Every recipe here is `polyphonic-voice` by omission, and that is not incidental: §12.4's
    // other realisation is a chord baked into a sample, and there is no sampler in this box.
    for (const recipe of device.recipes) {
      expect(realisationOf(recipe), recipe.id).toBe('polyphonic-voice')
      expect(requiredVoicePolyphony(recipe, 4), recipe.id).toBe(4)
      expect(requiredVoicePolyphony(recipe, 4)).toBeLessThanOrEqual(4)
    }
  })

  it('calls a five-note part a `polyphony` gap, naming the voice that fell short', () => {
    const result = rig([ask({ id: 'r-pad', role: 'pad', polyphony: 5 })])
    expect(result.assignments).toEqual([])
    const [gap] = result.shortfalls
    expect(gap?.reason).toBe('no-capable-voice')
    if (gap?.reason !== 'no-capable-voice') throw new Error('wrong gap')
    // Not `no-such-role`: the box plays pads, it plays four notes of one (§7.3).
    expect(gap.because).toBe('polyphony')
    expect(gap.notes).toBe(5)
    expect(gap.roleVoices.map((v) => v.voiceId)).toEqual(['voice'])
  })
})

describe('two parts cannot both have the voice', () => {
  it('gives the voice to one request and contends the rest', () => {
    // The half a four-voices-of-one manifest would fail silently. Three tonal requests, one
    // panel: exactly one part, and the other two say what is holding it.
    const result = rig([
      ask({ id: 'r-pad', role: 'pad', priority: 1, polyphony: 4 }),
      ask({ id: 'r-stab', role: 'stab', character: 'hard', priority: 2, polyphony: 3 }),
      ask({ id: 'r-lead', role: 'lead', character: 'bright', priority: 3 }),
    ])
    expect(result.assignments).toHaveLength(1)
    expect(result.assignments[0]?.requestId).toBe('r-pad')
    expect(result.shortfalls.map((g) => g.requestId)).toEqual(['r-stab', 'r-lead'])
    for (const gap of result.shortfalls) {
      expect(gap.reason).toBe('no-room')
      if (gap.reason !== 'no-room') throw new Error('wrong gap')
      // `contended`, not `crowding`: there is one voice and something else has it.
      expect(gap.because).toBe('contended')
      expect(gap.detail).toContain('minilogue xd Voice is carrying pad')
    }
  })

  it('never lets two parts occupy the voice in one section, on the real template either', () => {
    // The general form of the rule, over a template with real patterns in it: occupancy is per
    // (assignable, section), so the honest bound is per section rather than per guide. On a rig
    // of one four-note voice that reduces to "one part at a time".
    const result = resolve({
      devices: [device],
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 7,
    })
    const held = new Map<string, string>()
    for (const a of result.assignments) {
      for (const section of a.sections) {
        const key = `${assignableKey(a.assignable as Assignable)} ${section}`
        expect(held.get(key), `${key} taken twice`).toBeUndefined()
        held.set(key, a.requestId)
      }
    }
    // Not vacuous: the box did take a part, and only one at a time.
    expect(held.size).toBeGreaterThan(0)
    expect(new Set(held.values()).size).toBeLessThanOrEqual(result.assignments.length)
  })
})

// ---------------------------------------------------------------------------
// pp.17-18 - VOICE MODE is a parameter
// ---------------------------------------------------------------------------

describe('VOICE MODE is a cited recipe parameter, never a voice count (pp.17-18)', () => {
  it('offers all four modes on every recipe, cited to the page that lists them', () => {
    for (const recipe of device.recipes) {
      const mode = paramNamed(recipe, 'VOICE MODE TYPE')
      expect(mode, recipe.id).toBeDefined()
      if (mode?.kind !== 'enum') throw new Error(`${recipe.id}: VOICE MODE TYPE is not an enum`)
      expect(mode.options.values).toEqual(['POLY', 'UNISON', 'CHORD', 'ARP/LATCH'])
      // The option set is the citable claim; which one is selected is taste (§3.2).
      expect(mode.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}, p.17` })
      expect(mode.verified).toBe(false)
    }
  })

  it('selects only POLY and UNISON, and never CHORD or ARP', () => {
    const chosen = new Set(
      device.recipes.map((r) => {
        const mode = paramNamed(r, 'VOICE MODE TYPE')
        return mode?.kind === 'enum' ? mode.value : ''
      }),
    )
    expect([...chosen].sort()).toEqual(['POLY', 'UNISON'])
    // CHORD sounds a whole chord from one key, so a guide printing a triad to play would have
    // the box sound three chords - and it fits neither `Realisation`. ARP arpeggiates held keys
    // rather than a sequenced part. Both exist and are cited above; neither is chosen.
  })

  it('confines UNISON to the two roles that are one note in practice, and says so', () => {
    for (const recipe of device.recipes) {
      const mode = paramNamed(recipe, 'VOICE MODE TYPE')
      if (mode?.kind !== 'enum' || mode.value !== 'UNISON') continue
      expect(['sub', 'bass-mid'], recipe.id).toContain(recipe.role)
      // Nothing in `Recipe` can cap the notes a recipe accepts, so the limit is stated at the
      // machine rather than hidden: UNISON stacks all four voices onto one note (p.17).
      expect(mode.note, recipe.id).toContain('single note at a time')
      const depth = paramNamed(recipe, 'VOICE MODE DEPTH')
      if (depth?.kind !== 'numeric') throw new Error(`${recipe.id}: no UNISON depth`)
      // The knob's range changes with the mode: cents of detune here, 0...1023 under POLY.
      expect(depth.range.min).toBe(0)
      expect(depth.range.max).toBe(50)
      expect(depth.unit).toBe('c')
    }
  })

  it('gives POLY the other printed range, 0...1023 crossing into DUO', () => {
    const poly = device.recipes.filter((r) => {
      const mode = paramNamed(r, 'VOICE MODE TYPE')
      return mode?.kind === 'enum' && mode.value === 'POLY'
    })
    expect(poly.length).toBeGreaterThanOrEqual(10)
    for (const recipe of poly) {
      const depth = paramNamed(recipe, 'VOICE MODE DEPTH')
      if (depth?.kind !== 'numeric') throw new Error(`${recipe.id}: no POLY depth`)
      expect([depth.range.min, depth.range.max]).toEqual([0, 1023])
      expect(depth.note).toContain('DUO')
    }
  })

  it('leaves POLY depth at 0 on every role that can be asked for a chord', () => {
    // **The knob that quietly halves the polyphony.** p.17: turning DEPTH right switches to DUO,
    // "which stacks two voices when playing a key" — two voices per key out of four, so a
    // non-zero depth is a two-note patch. `Assignable.polyphony` still reads 4, and the resolver
    // will still hand it a triad, so the only thing standing between a `pad` recipe with depth
    // 120 and a guide that prints three notes for a patch that plays two is this assertion.
    for (const recipe of device.recipes) {
      if (!['pad', 'stab', 'texture'].includes(recipe.role)) continue
      const depth = paramNamed(recipe, 'VOICE MODE DEPTH')
      if (depth?.kind !== 'numeric') throw new Error(`${recipe.id}: no depth`)
      expect(depth.value, recipe.id).toBe(0)
      expect(notesAvailable(recipe), recipe.id).toBe(4)
    }
  })

  it('spends voices only where the role is one or two notes in practice', () => {
    // The other two rungs, and the roles each is confined to. Read off the manifest rather than
    // asserted per recipe id, so a new recipe joins the rule instead of slipping past it.
    const spent = new Map<string, number>()
    for (const recipe of device.recipes) {
      const notes = notesAvailable(recipe)
      spent.set(recipe.role, Math.min(spent.get(recipe.role) ?? 4, notes))
    }
    expect(Object.fromEntries(spent)).toEqual({
      pad: 4,
      stab: 4,
      texture: 4,
      lead: 2, // DUO — two voices stacked and detuned per key
      'bass-mid': 1, // UNISON
      sub: 1, // UNISON
    })
  })

  it('can actually play every request the shipped templates make of it', () => {
    // The rule tied to the thing it protects rather than to my own classification of the roles.
    // `ambient-dub` asks for a four-note pad and `industrial-techno` for three-note pad and stab;
    // if any recipe that could serve one of those spends voices, the guide would be a lie.
    const asks = TEMPLATES.flatMap((t) => t.roles)
      .filter((r) => (device.voices[0]?.roles ?? []).includes(r.role))
      .map((r) => ({ role: r.role, notes: r.polyphony ?? 1 }))
    expect(asks.length).toBeGreaterThan(0)
    expect(Math.max(...asks.map((a) => a.notes))).toBe(4)
    for (const askFor of asks) {
      for (const recipe of device.recipes.filter((r) => r.role === askFor.role)) {
        expect(notesAvailable(recipe), `${recipe.id} vs ${askFor.notes} notes`).toBeGreaterThanOrEqual(
          askFor.notes,
        )
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §3.2 - cited ranges, provisional points, and the values that are simply absent
// ---------------------------------------------------------------------------

describe('every range is cited and every point is not (§3.2)', () => {
  it('cites each range to this manual, individually, and never the point', () => {
    const all = every()
    // Around forty per recipe, which is what an analog synth with no presets costs: there is no
    // patch to recall, so every control the reader has to set is a line in the guide.
    expect(all.length / device.recipes.length).toBeGreaterThan(35)
    for (const param of all) {
      // The point is taste throughout: no page in this document says where to set a knob.
      expect(param.verified, param.name).toBe(false)
      const claim =
        param.kind === 'numeric'
          ? param.range.verified
          : param.kind === 'enum'
            ? param.options.verified
            : undefined
      expect(claim, param.name).toMatchObject({
        kind: 'manual',
        source: expect.stringContaining(MANUAL),
      })
    }
    // Every recipe terminates the §3.1 inheritance chain rather than leaving it open.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
  })

  it('cites the [0...1023] front-panel controls one by one, on their own pages', () => {
    // Fifteen controls share one printed scale across five pages, and a shared constant for the
    // *value* must not become a shared citation. `K` in the manifest is the bounds; the page
    // comes from the caller, every time.
    const wanted: Record<string, number> = {
      'VCO 1 · SHAPE': 18,
      'VCO 2 · SHAPE': 18,
      'CROSS MOD DEPTH': 19,
      'MIXER · VCO 1': 22,
      'MIXER · VCO 2': 22,
      'MIXER · MULTI': 22,
      CUTOFF: 23,
      RESONANCE: 23,
      'AMP EG · ATTACK': 24,
      'AMP EG · DECAY': 24,
      'AMP EG · SUSTAIN': 24,
      'AMP EG · RELEASE': 24,
      'EG · ATTACK': 24,
      'EG · DECAY': 24,
      'LFO · RATE': 25,
    }
    for (const [name, page] of Object.entries(wanted)) {
      const found = device.recipes.flatMap((r) => {
        const p = paramNamed(r, name)
        return p?.kind === 'numeric' ? [p] : []
      })
      expect(found.length, name).toBe(device.recipes.length)
      for (const param of found) {
        expect([param.range.min, param.range.max], name).toEqual([0, 1023])
        expect(param.range.verified, name).toEqual({
          kind: 'manual',
          source: `${MANUAL}, p.${page}`,
        })
      }
    }
  })

  it('omits the three values the manual gives no bounds for', () => {
    const names = new Set(every().map((p) => p.name))
    // p.26: "The setting range differs depending on the effect type you select."
    expect(names.has('EFFECTS · TIME')).toBe(false)
    // The output level knob, listed on p.5 and never scaled.
    expect(names.has('MASTER')).toBe(false)
    // p.22: `MOD DEPTH [0.00:15.00...]` - "(range changes depending on TYPE)".
    for (const recipe of device.recipes) {
      const engine = paramNamed(recipe, 'MULTI ENGINE · NOISE/VPM/USR')
      if (engine?.kind !== 'enum') throw new Error(`${recipe.id}: no MULTI ENGINE switch`)
      // USR is a file you load, so nothing about it is citable from this document either.
      expect(['NOISE', 'VPM'], recipe.id).toContain(engine.value)
      if (engine.value === 'VPM') {
        expect(paramNamed(recipe, 'MULTI ENGINE · SHAPE'), recipe.id).toBeUndefined()
      } else {
        expect(paramNamed(recipe, 'MULTI ENGINE · SHAPE'), recipe.id).toBeDefined()
      }
    }
  })

  it('never selects an LFO mode the RATE range does not describe (p.25)', () => {
    // p.25 prints the knob as `[0...1023 / 4, 2, 1, 0, 3/4...1/64]` — two scales behind one
    // control, and BPM swaps the left for the right. A numeric `260` under BPM is not a value
    // the box can be at; it is a reading off the scale the mode has switched away from, and the
    // cited `(0…1023)` printed beside it in the guide would make it look checked.
    for (const recipe of device.recipes) {
      const mode = paramNamed(recipe, 'LFO · MODE')
      const rate = paramNamed(recipe, 'LFO · RATE')
      if (mode?.kind !== 'enum') throw new Error(`${recipe.id}: no LFO MODE`)
      if (rate?.kind !== 'numeric') throw new Error(`${recipe.id}: no LFO RATE`)
      // Cited because the switch has it — the same standing as CHORD and ARP above.
      expect(mode.options.values).toEqual(['1-SHOT', 'NORMAL', 'BPM'])
      // Chosen by nothing: 1-SHOT and NORMAL are the two modes `[0...1023]` is true of.
      expect(mode.value, recipe.id).not.toBe('BPM')
      expect(['1-SHOT', 'NORMAL'], recipe.id).toContain(mode.value)
      expect([rate.range.min, rate.range.max], recipe.id).toEqual([0, 1023])
    }
    // Nor anywhere else on the device, in case a later recipe reaches for it by another route.
    expect(every().flatMap((p) => (p.kind === 'enum' ? [p.value] : []))).not.toContain('BPM')
  })

  it('pairs every mode-dependent range with the switch that selects it', () => {
    // The audit, as one assertion over the four knobs on this panel whose printed range another
    // control can replace. Each is either absent, or present with the bounds its own switch
    // position names — a value read off the wrong one of two scales is invented, however
    // carefully the range beside it is cited.
    const names = new Set(every().map((p) => p.name))
    // No bounds printed at all: absent everywhere.
    expect(names.has('EFFECTS · TIME')).toBe(false)
    for (const recipe of device.recipes) {
      const engine = paramNamed(recipe, 'MULTI ENGINE · NOISE/VPM/USR')
      const shape = paramNamed(recipe, 'MULTI ENGINE · SHAPE')
      const mode = paramNamed(recipe, 'VOICE MODE TYPE')
      const depth = paramNamed(recipe, 'VOICE MODE DEPTH')
      const lfoMode = paramNamed(recipe, 'LFO · MODE')
      if (engine?.kind !== 'enum' || mode?.kind !== 'enum' || lfoMode?.kind !== 'enum') {
        throw new Error(`${recipe.id}: missing a mode switch`)
      }
      if (depth?.kind !== 'numeric') throw new Error(`${recipe.id}: no depth`)
      // VPM's MOD DEPTH has no printed bounds; NOISE's four are all printed (p.20, p.22).
      expect(shape === undefined, recipe.id).toBe(engine.value === 'VPM')
      // VOICE MODE DEPTH: 0...1023 under POLY, 0...50 cents under UNISON (p.17).
      expect([depth.range.min, depth.range.max], recipe.id).toEqual(
        mode.value === 'UNISON' ? [0, 50] : [0, 1023],
      )
      expect(depth.unit, recipe.id).toBe(mode.value === 'UNISON' ? 'c' : undefined)
      // LFO RATE's numeric scale exists in two of the three modes, and only those are selected.
      expect(lfoMode.value, recipe.id).not.toBe('BPM')
    }
  })

  it('gives the noise SHAPE knob whichever of its four printed ranges applies (p.20)', () => {
    // The one control on this panel whose range *and* unit both change with a switch, and all
    // four are printed. Flattening them onto one invented scale is the thing being refused.
    const bounds: Record<string, [number, number]> = {
      High: [10, 21000],
      Low: [10, 21000],
      Peak: [110, 880],
      Decim: [240, 48000],
    }
    let seen = 0
    for (const recipe of device.recipes) {
      const shape = paramNamed(recipe, 'MULTI ENGINE · SHAPE')
      const type = paramNamed(recipe, 'MULTI ENGINE · TYPE')
      if (shape?.kind !== 'numeric' || type?.kind !== 'enum') continue
      const want = bounds[type.value]
      if (want === undefined) throw new Error(`${recipe.id}: unknown noise type ${type.value}`)
      expect([shape.range.min, shape.range.max], recipe.id).toEqual(want)
      expect(shape.unit).toBe('Hz')
      seen += 1
    }
    // All four are exercised, so a wrong row in the table cannot hide behind an unused one.
    const used = new Set(
      device.recipes.flatMap((r) => {
        const t = paramNamed(r, 'MULTI ENGINE · TYPE')
        return t?.kind === 'enum' && t.value in bounds ? [t.value] : []
      }),
    )
    expect([...used].sort()).toEqual(['Decim', 'High', 'Low', 'Peak'])
    expect(seen).toBeGreaterThan(10)
  })
})

// ---------------------------------------------------------------------------
// §3 - the shape of the library this device adds
// ---------------------------------------------------------------------------

describe('the recipe library', () => {
  it('authors 15 to 20 recipes over six roles, weighted to pad and stab', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
    const byRole = new Map<string, number>()
    for (const r of device.recipes) byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1)
    expect([...byRole.keys()].sort()).toEqual(['bass-mid', 'lead', 'pad', 'stab', 'sub', 'texture'])
    // The two roles the four voices exist for get the most cover, and `pad` gets all six
    // characters - this is the box the library did not have.
    expect(byRole.get('pad')).toBe(CHARACTERS.length)
    expect(byRole.get('stab')).toBeGreaterThanOrEqual(4)
    const padCharacters = device.recipes.filter((r) => r.role === 'pad').map((r) => r.character)
    expect(new Set(padCharacters).size).toBe(CHARACTERS.length)
  })

  it('declares exactly the roles one voice with one envelope pair can claim', () => {
    expect(device.voices[0]?.roles).toEqual(['pad', 'stab', 'lead', 'bass-mid', 'sub', 'texture'])
    // Every authored recipe addresses a declared role, and every declared role has a recipe:
    // a role offered with nothing behind it is a gap the resolver would find at run time.
    const withRecipes = new Set(device.recipes.map((r) => r.role))
    expect([...withRecipes].sort()).toEqual([...(device.voices[0]?.roles ?? [])].sort())
  })

  it('answers all five mood axes, which no other device in the library does', () => {
    // §6: a device declines an axis by having no param that names it - no capability check, and
    // nothing to declare when it does. This box happens to have a parameter for every one:
    // CUTOFF takes darkness, RESONANCE and CROSS MOD DEPTH take grit, AMP EG DECAY takes
    // density, AMP EG RELEASE and the effects depth take space, and Swing takes swing (p.41).
    const axes = new Set(
      every().flatMap((p) => (p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [])),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })
})
