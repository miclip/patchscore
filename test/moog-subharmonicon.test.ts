import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  groupedParams,
  paramLabel,
  receiveTransports,
  renderGuide,
  resolve,
  sendTransports,
  type JackSpec,
} from '../lib/core/index'
import { reachableSlots } from '../lib/core/reachability'
import { device } from '../lib/devices/moog-subharmonicon/index'
import { SUBHARMONICON_PANEL } from '../lib/devices/moog-subharmonicon/panel'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * The Subharmonicon (#135), and the four things about it that are worth pinning.
 *
 * It is the last of the five Moog semi-modulars and the one the backlog held longest, on the
 * expectation that six oscillators would push the search past its cap. They do not. What the
 * authoring found instead is a box whose manual prints more ranges than any other in the library
 * and whose factory patch sheets are drawn well enough to cite — and a per-step vocabulary with
 * exactly one lane in it.
 */
describe('Subharmonicon manifest (#135)', () => {
  it('is one voice at six notes, not a pool of six', () => {
    expect(device.voices).toHaveLength(1)
    const [voice] = device.voices
    expect(voice?.kind).toBe('fixed')
    expect(voice?.polyphony).toBe(6)
    // §2.2's rule, and the reason a pool would be wrong: six pool members are six independently
    // assignable parts, and these six share one mixer, one filter, one amplifier and one pair of
    // envelopes (p.21, p.23). One assignable is therefore all that can ever be occupied.
    expect(device.comfortableVoices).toBe(1)
  })

  it('offers no role it has no source for', () => {
    const [voice] = device.voices
    // p.58's SOURCES row is a complete enumeration — "VCO 1, SUB 1, SUB 2 / VCO 2, SUB 1, SUB 2"
    // — and there is no noise generator anywhere on the instrument. The DFAM's snares come out
    // of its white noise through a high-pass filter, and this box has neither.
    expect(voice?.roles).not.toContain('snare')
    expect(voice?.roles).not.toContain('noise')
    // `kick` and `tom` are offered on the strength of the BATERIA patch sheet (p.47), whose own
    // NOTES read "Kick drum tuning is controlled via filter CUTOFF".
    expect(voice?.roles).toContain('kick')
    expect(voice?.roles).toContain('tom')
    // And the chord roles, which are what `polyphony: 6` is for.
    expect(voice?.roles).toContain('pad')
    expect(voice?.roles).toContain('stab')
  })

  it('sends on one wire and receives on two, like its sibling and for the opposite reason', () => {
    expect(sendTransports(device)).toEqual(['analog-clock'])
    expect(receiveTransports(device)).toEqual(['midi-din', 'analog-clock'])
    expect(device.clock.transport).toEqual(['midi-din', 'analog-clock'])
    // There is no MIDI output anywhere on the instrument (p.31's output column, p.8's rear
    // panel), so a rig clocked over MIDI DIN can drive this box and can never be driven by it.
    const midiOut = (device.jacks ?? []).filter(
      (j: JackSpec) => j.direction === 'out' && j.signal.includes('midi'),
    )
    expect(midiOut).toEqual([])
  })

  it('declares all thirty-two patch points, cited one apiece', () => {
    const jacks = device.jacks ?? []
    // p.31: "Subharmonicon contains a total of 32 patch points. Of these, 17 are inputs…
    // The remaining 15 are outputs". p.58's PATCHBAY row says the same in three lines, and the
    // panel drawing on p.50 draws fifteen reversed-lettering labels in the same places.
    expect(jacks).toHaveLength(32)
    expect(jacks.filter((j: JackSpec) => j.direction === 'in')).toHaveLength(17)
    expect(jacks.filter((j: JackSpec) => j.direction === 'out')).toHaveLength(15)
    for (const jack of jacks) {
      expect(device.capabilityEvidence?.[`jacks[${jack.id}]`], jack.id).toBeDefined()
    }
    // Five labels appear twice on this panel and are told apart only by reversed lettering, so
    // the `IN ·` / `OUT ·` qualifier is load-bearing rather than decorative.
    const bare = jacks.map((j: JackSpec) => j.id.replace(/^(IN|OUT) · /, ''))
    expect(new Set(bare).size).toBe(27)
  })

  it('is never a voice-control source, and is a target on the transport gate', () => {
    const jacks = device.jacks ?? []
    const sole = (dir: JackSpec['direction'], kind: string) =>
      jacks
        .filter((j: JackSpec) => j.direction === dir && j.signal.length === 1 && j.signal[0] === kind)
        .map((j: JackSpec) => j.id)
    // No sole gate output anywhere, so §3.3's pass can never make this box a source. That is the
    // box: `OUT · TRIGGER` is a trigger (p.37) and the three clock outputs are clocks.
    expect(sole('out', 'gate')).toEqual([])
    expect(sole('out', 'pitch-cv')).toEqual(['OUT · SEQ 1', 'OUT · SEQ 2'])
    // A target bundle *does* form, and this is the DFAM's finding a second time: the section's
    // only sole gate input is the transport one, because `IN · TRIGGER` is a trigger (p.35) and
    // `IN · RESET` carries two kinds. Pinned so it stays a recorded finding rather than a
    // surprise, and so a repair to `bundles()` shows up here as a change rather than silently.
    expect(sole('in', 'pitch-cv')).toEqual(['IN · VCO 1', 'IN · VCO 2'])
    expect(sole('in', 'gate')).toEqual(['IN · PLAY'])

    const withSequencer = DEVICES.filter((d) =>
      [device.id, 'intellijel-metropolix'].includes(d.id),
    )
    const result = resolve({
      devices: withSequencer,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const target = result.interDevicePatch.targets.find((t) => t.deviceId === device.id)
    expect(target?.pitchJack).toBe('IN · VCO 1')
    expect(target?.gateJack).toBe('IN · PLAY')
  })

  it('puts the clock transport on one socket per direction, and leaves the others as signal', () => {
    const jacks = device.jacks ?? []
    const carrying = (dir: JackSpec['direction']) =>
      jacks.filter((j: JackSpec) => j.direction === dir && j.clock?.includes('analog-clock'))
    // Three outputs carry a clock *signal* — `OUT · CLOCK` and the two `SEQ n CLK` — and only
    // the first carries the transport, because §3.3 refuses two jacks claiming one transport in
    // one direction and the rack would otherwise have to choose which hole to draw. p.38 patches
    // exactly this one to clock a DFAM; the other two are a TIP on the same page.
    expect(carrying('out').map((j: JackSpec) => j.id)).toEqual(['OUT · CLOCK'])
    expect(carrying('in').map((j: JackSpec) => j.id)).toEqual(['IN · CLOCK'])
    const clockSignal = jacks.filter(
      (j: JackSpec) => j.direction === 'out' && j.signal.includes('clock'),
    )
    expect(clockSignal.map((j: JackSpec) => j.id)).toEqual([
      'OUT · SEQ 1 CLK',
      'OUT · SEQ 2 CLK',
      'OUT · CLOCK',
    ])
  })

  it('has one per-step lane and reaches it, because an accent here is a pitch', () => {
    // p.26 enumerates a step as "a variable tuning knob and an LED", so there is no velocity
    // lane, no accent button and no ghost lane on this instrument. An accent is the step taken
    // up an octave, which is the range SEQ OCT at ±1 gives it (p.28).
    expect(device.features?.perStep).toEqual(['pitch'])
    const used = device.recipes.flatMap((r) =>
      (r.articulation ?? []).flatMap((a) => Object.keys(a.set)),
    )
    expect(new Set(used)).toEqual(new Set(['pitch']))
    // And every one of them is on a slot some direction actually emits (#108).
    for (const recipe of device.recipes) {
      const authored = (recipe.articulation ?? []).map((a) => a.slot)
      if (authored.length === 0) continue
      const { slots } = reachableSlots(recipe, TEMPLATES)
      for (const slot of authored) expect(slots, recipe.id).toContain(slot)
    }
  })

  it('cites the knobs a patch sheet draws, and only the ones with a linear scale', () => {
    // Printed pp.45-49 draw every pointer, so a position on a *travel* control is documented.
    // A position on a tapered one is not: `CUTOFF` at a fifth of its sweep is not 4 kHz, and
    // converting it would be a figure nobody printed.
    const sheeted = device.recipes.filter((r) =>
      r.params.some((p) => p.verified !== false && p.verified !== undefined),
    )
    expect(sheeted.map((r) => r.id)).toEqual(['subh-kick-hard', 'subh-pad-soft'])
    for (const recipe of sheeted) {
      for (const param of recipe.params) {
        if (param.verified === false || param.verified === undefined) continue
        expect(param.kind, `${recipe.id} ${param.name}`).toBe('numeric')
        if (param.kind !== 'numeric') continue
        expect(param.unit, `${recipe.id} ${param.name}`).toBe('% travel')
        // The point is cited and the range still is not: nobody has stated that this knob's
        // travel is what it looks like, so mood stays out of it (§3.2).
        expect(param.range.verified, `${recipe.id} ${param.name}`).toBe(false)
      }
    }
  })

  it('carries the whole panel on every recipe, because nothing here recalls a setting', () => {
    // p.45: "Your Subharmonicon has a 100% analog signal path". There is no memory, so a
    // parameter list that silently means "leave that one alone" produces a different sound for
    // every reader (§8). Forty-two controls, the same forty-two on all nineteen recipes — the
    // eight STEP knobs, TEMPO and the five transport buttons are the fourteen left out, each
    // because it belongs to a direction, to the song, or to the performance.
    const shapes = new Set(device.recipes.map((r) => r.params.map((p) => p.name).join('|')))
    expect(shapes.size).toBe(1)
    expect(device.recipes[0]?.params).toHaveLength(42)
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)
  })

  it('leaves the search uncapped on the direction that decides the worst case', () => {
    const result = resolve({
      devices: DEVICES,
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 21,
    })
    expect(result.search.capped).toBe(false)
    expect(result.search.method).toBe('exhaustive')
  })
})

/**
 * §3.1/#385. **Four sections on a panel that draws no boxes.**
 *
 * The last device in the #385 series and the only one whose `panel.ts` carries no `group` feature
 * at all — p.50 encloses nothing. What it prints instead are headed structures: a centred word
 * with rules running out to the edges of the controls it covers. Four of them sit behind the
 * parameters a recipe states, and three more are printed and hold none.
 *
 * So the mapping below cannot be checked against a rectangle. It is a reading of p.50, pinned by
 * name, and an edit that moves a control has to come here and say so.
 */
describe('every control is boxed by the panel structure it sits under (#385)', () => {
  /** The reading. Left is the authored name; right is the silkscreen over it. */
  const SECTIONS: Record<string, string> = {
    'VCO 1 FREQ': 'OSCILLATORS',
    'VCO 1 WAVE': 'OSCILLATORS',
    'SUB 1 FREQ (VCO 1)': 'OSCILLATORS',
    'SUB 2 FREQ (VCO 1)': 'OSCILLATORS',
    'VCO 2 FREQ': 'OSCILLATORS',
    'VCO 2 WAVE': 'OSCILLATORS',
    'SUB 1 FREQ (VCO 2)': 'OSCILLATORS',
    'SUB 2 FREQ (VCO 2)': 'OSCILLATORS',
    'VCO 1 LEVEL': 'OSCILLATORS',
    'SUB 1 LEVEL (VCO 1)': 'OSCILLATORS',
    'SUB 2 LEVEL (VCO 1)': 'OSCILLATORS',
    'VCO 2 LEVEL': 'OSCILLATORS',
    'SUB 1 LEVEL (VCO 2)': 'OSCILLATORS',
    'SUB 2 LEVEL (VCO 2)': 'OSCILLATORS',
    'QUANTIZE': 'OSCILLATORS',
    'SEQ OCT': 'OSCILLATORS',

    'SEQ 1 ASSIGN · OSC 1': 'SEQ 1 ASSIGN',
    'SEQ 1 ASSIGN · SUB 1': 'SEQ 1 ASSIGN',
    'SEQ 1 ASSIGN · SUB 2': 'SEQ 1 ASSIGN',
    'SEQ 2 ASSIGN · OSC 2': 'SEQ 2 ASSIGN',
    'SEQ 2 ASSIGN · SUB 1': 'SEQ 2 ASSIGN',
    'SEQ 2 ASSIGN · SUB 2': 'SEQ 2 ASSIGN',

    'RHYTHM 1': 'POLYRHYTHM',
    'RHYTHM 1 · SEQ 1': 'POLYRHYTHM',
    'RHYTHM 1 · SEQ 2': 'POLYRHYTHM',
    'RHYTHM 2': 'POLYRHYTHM',
    'RHYTHM 2 · SEQ 1': 'POLYRHYTHM',
    'RHYTHM 2 · SEQ 2': 'POLYRHYTHM',
    'RHYTHM 3': 'POLYRHYTHM',
    'RHYTHM 3 · SEQ 1': 'POLYRHYTHM',
    'RHYTHM 3 · SEQ 2': 'POLYRHYTHM',
    'RHYTHM 4': 'POLYRHYTHM',
    'RHYTHM 4 · SEQ 1': 'POLYRHYTHM',
    'RHYTHM 4 · SEQ 2': 'POLYRHYTHM',
  }

  /** The right-hand third: two columns of knobs, each labelled, with nothing over the group. */
  const LOOSE = [
    'CUTOFF',
    'RESONANCE',
    'VCF ATTACK',
    'VCF DECAY',
    'VCF EG AMT',
    'VCA ATTACK',
    'VCA DECAY',
    'VOLUME',
  ]

  const byName = new Map<string, Set<string>>()
  for (const recipe of device.recipes) {
    for (const param of recipe.params) {
      const module = (param as { module?: string }).module ?? '(none)'
      const found = byName.get(param.name)
      if (found === undefined) byName.set(param.name, new Set([module]))
      else found.add(module)
    }
  }

  it('partitions all forty-two names, with nothing left over on either side', () => {
    const unaccounted = [...byName.keys()].filter(
      (name) => SECTIONS[name] === undefined && !LOOSE.includes(name),
    )
    expect(unaccounted).toEqual([])
    expect(Object.keys(SECTIONS)).toHaveLength(34)
    expect(LOOSE).toHaveLength(8)
    expect(byName.size).toBe(42)
    expect(byName.size).toBe(Object.keys(SECTIONS).length + LOOSE.length)
  })

  it('states all forty-two on every one of the nineteen recipes', () => {
    // `voice()` emits the full panel every time, so the partition is the same on every recipe and
    // a per-recipe count is a real check rather than a restatement of the map above.
    for (const recipe of device.recipes) {
      expect(recipe.params, recipe.id).toHaveLength(42)
      const modules = recipe.params.map((p) => (p as { module?: string }).module ?? '(none)')
      expect(modules.filter((m) => m === '(none)'), recipe.id).toHaveLength(8)
      expect(modules.filter((m) => m === 'OSCILLATORS'), recipe.id).toHaveLength(16)
      expect(modules.filter((m) => m === 'POLYRHYTHM'), recipe.id).toHaveLength(12)
      expect(modules.filter((m) => m === 'SEQ 1 ASSIGN'), recipe.id).toHaveLength(3)
      expect(modules.filter((m) => m === 'SEQ 2 ASSIGN'), recipe.id).toHaveLength(3)
    }
  })

  it('gives every boxed name one module and only one', () => {
    for (const [name, mods] of byName) {
      if (LOOSE.includes(name)) continue
      expect([...mods], name).toEqual([SECTIONS[name]])
    }
  })

  it('leaves the right-hand third loose, because that surface is undivided', () => {
    // p.50 prints eight control labels over there and no section word — no filter heading, no
    // amplifier heading. §3.1: one undivided surface has nothing to put in `module`, and
    // inventing `FILTER` would be a silkscreen Moog did not print.
    const loose = [...byName].filter(([, mods]) => mods.has('(none)')).map(([n]) => n).sort()
    expect(loose).toEqual([...LOOSE].sort())
    for (const name of LOOSE) expect([...(byName.get(name) ?? [])], name).toEqual(['(none)'])
  })

  it('names four modules, two of which the panel does not draw as features', () => {
    const modules = new Set(Object.values(SECTIONS))
    expect([...modules].sort()).toEqual(['OSCILLATORS', 'POLYRHYTHM', 'SEQ 1 ASSIGN', 'SEQ 2 ASSIGN'])
    // This panel draws no rectangles at all — the whole reason the mapping is a reading rather
    // than a containment test.
    expect(SUBHARMONICON_PANEL.features.filter((f) => f.kind === 'group')).toHaveLength(0)
    const labels = SUBHARMONICON_PANEL.features.flatMap((f) => (f.kind === 'label' ? [f.text] : []))
    expect(labels).toContain('OSCILLATORS')
    expect(labels).toContain('POLYRHYTHM')
    // The two assign brackets are read off p.50 and are not among `panel.ts`'s labels; that is
    // recorded here so the discrepancy is deliberate rather than discovered later.
    expect(labels).not.toContain('SEQ 1 ASSIGN')
    expect(labels).not.toContain('SEQ 2 ASSIGN')
  })

  it('leaves SEQUENCER 1, SEQUENCER 2 and TEMPO printed and empty', () => {
    // Their controls are deliberately not recipe parameters: the eight STEP knobs are pitch and
    // pitch is the direction's (§4.3), TEMPO is the song's (#167), and RESET/EG/NEXT/PLAY/TRIGGER
    // are performance. A section that renders empty is the consequence, not a gap.
    const labels = SUBHARMONICON_PANEL.features.flatMap((f) => (f.kind === 'label' ? [f.text] : []))
    const boxed = new Set(Object.values(SECTIONS))
    for (const empty of ['SEQUENCER 1', 'SEQUENCER 2', 'TEMPO']) {
      expect(labels, empty).toContain(empty)
      expect(boxed.has(empty), empty).toBe(false)
    }
    for (const name of ['STEP 1', 'STEP 2', 'STEP 3', 'STEP 4', 'TEMPO', 'PLAY', 'TRIGGER']) {
      expect(byName.has(name), name).toBe(false)
    }
  })

  it('keeps every parameter name exactly as it was authored', () => {
    expect([...byName.keys()].sort()).toEqual([...Object.keys(SECTIONS), ...LOOSE].sort())
  })

  it('trims the two assignment groups and nothing else', () => {
    // `paramLabel` trims an exact `${module} · ` prefix. Inside the two brackets that removes ink
    // repeating the label above; inside POLYRHYTHM it must not fire, or `RHYTHM 1 · SEQ 1` and
    // `RHYTHM 2 · SEQ 1` would both read `SEQ 1` in one box.
    const label = (name: string, module: string) =>
      paramLabel({
        name,
        value: 1,
        provenance: { state: 'authored', cite: { kind: 'manual', source: 'x' } },
        module,
      })
    expect(label('SEQ 1 ASSIGN · OSC 1', 'SEQ 1 ASSIGN')).toBe('OSC 1')
    expect(label('SEQ 1 ASSIGN · SUB 1', 'SEQ 1 ASSIGN')).toBe('SUB 1')
    expect(label('SEQ 1 ASSIGN · SUB 2', 'SEQ 1 ASSIGN')).toBe('SUB 2')
    expect(label('SEQ 2 ASSIGN · OSC 2', 'SEQ 2 ASSIGN')).toBe('OSC 2')
    expect(label('SEQ 2 ASSIGN · SUB 1', 'SEQ 2 ASSIGN')).toBe('SUB 1')
    expect(label('SEQ 2 ASSIGN · SUB 2', 'SEQ 2 ASSIGN')).toBe('SUB 2')
    // Everything else is the identity, including the twelve polyrhythm rows.
    for (const [name, module] of Object.entries(SECTIONS)) {
      if (module === 'SEQ 1 ASSIGN' || module === 'SEQ 2 ASSIGN') continue
      expect(label(name, module), name).toBe(name)
    }
    expect(label('RHYTHM 1 · SEQ 1', 'POLYRHYTHM')).toBe('RHYTHM 1 · SEQ 1')
    expect(label('RHYTHM 2 · SEQ 1', 'POLYRHYTHM')).toBe('RHYTHM 2 · SEQ 1')
  })
})

/**
 * §8/#385. **The boxes a reader actually gets**, and here that is one sequence, identical on all
 * nineteen recipes, with `OSCILLATORS` drawn twice.
 *
 * `voice()` runs oscillators, mixer, filter and amplifier, then `QUANTIZE` and `SEQ OCT` — which
 * are back at the foot of the `OSCILLATORS` structure. `groupedParams` cuts on adjacent runs, so
 * the section opens, closes around the eight loose right-hand knobs, and opens again for those
 * two buttons. Authored order is kept; merging the boxes would put two shared switches before the
 * mixer they do not belong to.
 */
describe('a real Subharmonicon guide renders the same six runs every time (#385)', () => {
  const result = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-subharmonicon'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

  it('resolves a part on it at all, so the assertions below are not vacuous', () => {
    expect(result.assignments.length).toBeGreaterThan(0)
    expect(result.assignments.every((a) => a.deviceId === 'moog-subharmonicon')).toBe(true)
  })

  it('cuts every part into the same six runs, loose knobs between the two OSCILLATORS boxes', () => {
    for (const assignment of result.assignments) {
      const groups = groupedParams(assignment.params)
      expect(groups.map((g) => g.module), assignment.role).toEqual([
        'OSCILLATORS',
        undefined,
        'OSCILLATORS',
        'SEQ 1 ASSIGN',
        'SEQ 2 ASSIGN',
        'POLYRHYTHM',
      ])
      expect(groups.map((g) => g.params.length), assignment.role).toEqual([14, 8, 2, 3, 3, 12])
      // Runs, not buckets: concatenating them reproduces the order the guide renders.
      expect(groups.flatMap((g) => [...g.params]), assignment.role).toEqual([...assignment.params])
    }
  })

  it('draws the boxes in the guide, one lamp each, with the right-hand knobs bare', () => {
    const md = renderGuide(result)
    for (const module of ['OSCILLATORS', 'SEQ 1 ASSIGN', 'SEQ 2 ASSIGN', 'POLYRHYTHM']) {
      expect(md, module).toContain(`- **● ${module}**`)
    }
    for (const loose of ['CUTOFF', 'RESONANCE', 'VCF EG AMT', 'VOLUME']) {
      expect(md, loose).toContain(`- **${loose}**`)
      expect(md, loose).not.toContain(`● ${loose}`)
    }
    // The three printed silkscreens that hold nothing are never drawn as boxes.
    for (const empty of ['SEQUENCER 1', 'SEQUENCER 2', 'TEMPO']) {
      expect(md, empty).not.toContain(`● ${empty}`)
    }
  })

  it('prints the assignment rows trimmed and the polyrhythm rows whole', () => {
    const bullets = renderGuide(result)
      .split('\n')
      .filter((line) => /^\s*- \*\*(?!●)/.test(line))
    expect(bullets.length).toBeGreaterThan(30)
    for (const module of ['SEQ 1 ASSIGN', 'SEQ 2 ASSIGN']) {
      expect(bullets.filter((l) => l.includes(`**${module} · `)), module).toEqual([])
    }
    expect(bullets.some((l) => l.includes('**RHYTHM 1 · SEQ 1**'))).toBe(true)
    expect(bullets.some((l) => l.includes('**RHYTHM 4 · SEQ 2**'))).toBe(true)
  })
})
