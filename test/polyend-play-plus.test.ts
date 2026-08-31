import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  resolve,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/polyend-play-plus/index'
import { device as trackerMini } from '../lib/devices/polyend-tracker-mini/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The Play+ is the second Polyend groovebox and it is not the first one again, so this file guards
 * the four places where the sibling's shape would have produced something that reads correct and
 * is not.
 *
 *  1. **Every knob has three printed scales**, chosen by a mode the manual never puts in the same
 *     table as the values (p.60, p.66, p.93). A cutoff of 44 means three different things, so the
 *     load-bearing claim in this manifest is that the mode always travels with the value.
 *  2. **The two pools are disjoint**, where the Tracker Mini's overlap. That is what buys this
 *     manifest out of the sibling's `onBothPools` duplication, so it is asserted as an absence:
 *     no recipe here has a twin.
 *  3. **PERC is a drum machine in one synth slot** (p.90), which is why three slots buy eight
 *     recipes rather than three. The rule that makes that legal — one recipe per PERC *part
 *     group* — is invisible in the data and would be easy to break, so it is pinned.
 *  4. **Two points carry manual authority**, from one sentence on p.116, and every other point in
 *     the file is taste. A third `manual` point appearing is either a real find or a mistake, and
 *     either way somebody should have to look at it.
 */

const MANUAL = 'Polyend Play+ Manual Rev 2, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

/** The PERC part each recipe drives, taken from its own parameter names (pp.111-113). */
function percGroup(recipe: Recipe): string | undefined {
  const model = params(recipe).find((p) => p.name.endsWith('· MODEL'))
  return model?.name.replace(' · MODEL', '')
}

const synthRecipes = device.recipes.filter((r) => r.voice === 'track-synth')
const sampleRecipes = device.recipes.filter((r) => r.voice === 'track-sample')

describe('Play+ manifest', () => {
  it('parses as a Device, and its id is its folder', () => {
    expect(() => DeviceSchema.parse(device)).not.toThrow()
    expect(device.id).toBe('polyend-play-plus')
    expect(device.manual).toEqual({ title: 'Polyend Play+ Manual', edition: 'Rev 2' })
  })

  // -------------------------------------------------------------------------
  // 1. The mode travels with the value
  // -------------------------------------------------------------------------

  describe('three printed scales per knob (CLAUDE.md: a cited range can still be the wrong range)', () => {
    it('leads every recipe with the mode that decides which scale is in force', () => {
      for (const recipe of device.recipes) {
        const first = params(recipe)[0]
        expect(first?.name, recipe.id).toBe('TRACK MODE')
        expect(first?.kind, recipe.id).toBe('enum')
      }
    })

    it('names the mode the pool actually is, in both directions', () => {
      for (const recipe of sampleRecipes) {
        expect(named(recipe, 'TRACK MODE'), recipe.id).toMatchObject({ value: 'Audio sample' })
        // The synth-only switch must not appear on a sample track: there is no synth there to
        // select, and a model name beside a DJ-filter cutoff is the pairing this test exists for.
        expect(named(recipe, 'SYNTH MODEL'), recipe.id).toBeUndefined()
      }
      for (const recipe of synthRecipes) {
        expect(named(recipe, 'TRACK MODE'), recipe.id).toMatchObject({ value: 'MIDI / Synth' })
        expect(named(recipe, 'SYNTH MODEL')?.kind, recipe.id).toBe('enum')
      }
    })

    it('never lets a DJ-filter CUTOFF travel without the side it is measured on', () => {
      // p.66 is one knob and two filters: "Range is 100-0 anticlockwise - low pass filtering.
      // Turning clockwise 0-100 high pass filtering." p.188 prints them as two 1-100 scales. A
      // cutoff without the side is a number on whichever of the two the reader guesses.
      for (const recipe of device.recipes) {
        const cutoff = named(recipe, 'FILTER CUTOFF')
        if (cutoff === undefined) continue
        const side = named(recipe, 'FILTER')
        expect(side, recipe.id).toBeDefined()
        expect(side?.kind, recipe.id).toBe('enum')
        expect(['Low-Pass', 'High Pass'], recipe.id).toContain(
          (side as { value: string }).value,
        )
      }
    })

    it('keeps the engine cutoffs on the engines’ own scale, not the DJ filter’s', () => {
      // The synth engines print `20Hz - 20kHz` (pp.97, 107); the audio track's filter is 1-100.
      // They share the word "cutoff" and nothing else, so a recipe that mixed them would be
      // legal, cited, and wrong.
      for (const recipe of synthRecipes) {
        const cutoff = named(recipe, 'FILTER · CUTOFF')
        if (cutoff === undefined) continue
        expect(cutoff.kind).toBe('numeric')
        expect((cutoff as { range: { min: number; max: number } }).range).toMatchObject({
          min: 20,
          max: 20000,
        })
      }
    })
  })

  // -------------------------------------------------------------------------
  // 2. Two disjoint pools, and therefore no twins
  // -------------------------------------------------------------------------

  describe('two pools that do not overlap (p.42)', () => {
    it('splits sixteen tracks into eight and eight', () => {
      expect(device.voices).toHaveLength(2)
      for (const voice of device.voices) {
        expect(voice.kind).toBe('pool')
        expect(voice.kind === 'pool' && voice.count).toBe(8)
      }
    })

    it('sounds one note per audio track and up to eight per synth track', () => {
      const sample = device.voices.find((v) => v.id === 'track-sample')
      const synth = device.voices.find((v) => v.id === 'track-synth')
      // p.141: "One track will allow one note, Two tracks for 2 notes and so forth."
      expect(sample?.polyphony).toBe(1)
      // p.13 "8 Polyphonic MIDI / Synth tracks"; p.91 budgets eight voices across three slots.
      expect(synth?.polyphony).toBe(8)
    })

    it('keeps `vox-chop` off the synth pool and nothing else', () => {
      const sample = device.voices.find((v) => v.id === 'track-sample')!
      const synth = device.voices.find((v) => v.id === 'track-synth')!
      expect(sample.roles.filter((r) => !synth.roles.includes(r))).toEqual(['vox-chop'])
    })

    it('duplicates no recipe across the pools, which is what the disjoint split buys', () => {
      // The Tracker Mini has to author every synth recipe twice because its pool B is a subset of
      // pool A. Here an audio track cannot host a synth and a MIDI / Synth track cannot play a
      // sample (p.42, p.201), so a twin would describe a state the box cannot hold.
      const seen = new Map<string, string>()
      for (const recipe of device.recipes) {
        const key = `${recipe.role}/${recipe.character}`
        expect(seen.has(key), `${recipe.id} twins ${seen.get(key)}`).toBe(false)
        seen.set(key, recipe.id)
      }
    })

    it('is a different shape from its sibling rather than a copy of it', () => {
      // If this ever stops being true, the two manifests have drifted into one and the reason for
      // authoring the second one has gone with it.
      expect(trackerMini.voices.map((v) => v.id)).toEqual(['track-sample', 'track-synth'])
      expect(device.voices[0]!.roles.length).toBe(trackerMini.voices[0]!.roles.length)
      // Same pool ids and role counts, and yet no shared recipe id.
      const mine = new Set(device.recipes.map((r) => r.id))
      for (const r of trackerMini.recipes) expect(mine.has(r.id)).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // 3. Three synth slots, and what PERC does with one of them
  // -------------------------------------------------------------------------

  describe('the three-slot budget (p.94)', () => {
    it('spends the three slots on PERC, ACD and WTFM and nothing else', () => {
      const models = new Set(
        synthRecipes.map((r) => (named(r, 'SYNTH MODEL') as { value: string }).value),
      )
      expect([...models].sort()).toEqual(['ACD', 'PERC', 'WTFM'])
      // Three distinct models is three slots. A fourth would describe a project this box cannot
      // hold, which is the sibling's rule restated for a box that gets more out of it.
      expect(models.size).toBeLessThanOrEqual(3)
    })

    it('authors at most one recipe per PERC part group, because one patch holds them all', () => {
      // pp.111-113 give Kick, Toms, Snare, Hi Hat, Cymbal and Percussion disjoint parameter groups
      // inside one patch, so six recipes coexist. Two on the *same* group would not: `closed-hat`
      // and `open-hat` would both want Hi Hat's Model and filters, and `clap` and `ghost-perc`
      // would each want a different `PERCUSSION · MODEL` on the same note B4.
      const perc = synthRecipes.filter(
        (r) => (named(r, 'SYNTH MODEL') as { value: string }).value === 'PERC',
      )
      const groups = perc.map(percGroup)
      expect(groups.every((g) => g !== undefined)).toBe(true)
      expect(new Set(groups).size, groups.join(', ')).toBe(groups.length)
    })

    it('puts the hat pair on opposite pools, which is that rule biting', () => {
      const closed = device.recipes.find((r) => r.role === 'closed-hat')
      const open = device.recipes.find((r) => r.role === 'open-hat')
      expect(closed?.voice).toBe('track-synth')
      expect(open?.voice).toBe('track-sample')
    })

    it('names the trigger note for every PERC recipe, because no parameter carries it', () => {
      const perc = synthRecipes.filter(
        (r) => (named(r, 'SYNTH MODEL') as { value: string }).value === 'PERC',
      )
      expect(perc.length).toBeGreaterThan(1)
      for (const recipe of perc) {
        expect(recipe.routing, recipe.id).toMatch(/answers to/)
      }
    })

    it('declares a patch polyphony only for the engine the manual calls monophonic', () => {
      // p.90 introduces ACD as a recreation of "iconic single-oscillator monophonic analog synths".
      // The pool's eight is right for the other two.
      for (const recipe of device.recipes) {
        const model = named(recipe, 'SYNTH MODEL') as { value: string } | undefined
        if (model?.value === 'ACD') expect(recipe.patchPolyphony, recipe.id).toBe(1)
        else expect(recipe.patchPolyphony, recipe.id).toBeUndefined()
      }
    })
  })

  // -------------------------------------------------------------------------
  // 4. Provenance
  // -------------------------------------------------------------------------

  describe('citation regime (§3.2)', () => {
    it('cites a range for every numeric and an option list for every enum', () => {
      for (const recipe of device.recipes) {
        for (const param of params(recipe)) {
          const where = `${recipe.id} / ${param.name}`
          if (param.kind === 'numeric') expect(param.range.verified, where).toBeTruthy()
          if (param.kind === 'enum') expect(param.options.verified, where).toBeTruthy()
        }
      }
    })

    it('cites every range and option list to a page of this manual and nothing else', () => {
      for (const recipe of device.recipes) {
        for (const param of params(recipe)) {
          const cite =
            param.kind === 'numeric'
              ? param.range.verified
              : param.kind === 'enum'
                ? param.options.verified
                : undefined
          if (cite === undefined || cite === false) continue
          expect(cite.kind, `${recipe.id} / ${param.name}`).toBe('manual')
          expect(cite.source, `${recipe.id} / ${param.name}`).toContain(MANUAL)
        }
      }
    })

    it('claims manual authority for exactly the two points p.116 states, and no others', () => {
      // "A value of 12 is a good starting point and is the best match of TR-808" is the manual
      // stating a *point*, which is rare. Everything else here is taste and stays `false`.
      const authored: string[] = []
      for (const recipe of device.recipes) {
        for (const param of params(recipe)) {
          if (param.verified !== undefined && param.verified !== false) {
            authored.push(`${recipe.id} / ${param.name}`)
            expect(param.verified.source).toBe(`${MANUAL}116`)
            expect((param as { value: number }).value).toBe(12)
          }
        }
      }
      expect(authored.sort()).toEqual([
        'pp-closed-hat-clean / HI HAT · TIMBRE',
        'pp-ride-bright / CYMBAL · TIMBRE',
      ])
    })

    it('leaves every recipe itself unverified, because no page picks a sound for a part', () => {
      for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
    })
  })

  describe('capability evidence (§2.6/#22)', () => {
    it('carries a citation for every jack and every clock setup it declares', () => {
      for (const jack of device.jacks ?? []) {
        expect(device.capabilityEvidence?.[`jacks[${jack.id}]`], jack.id).toBeDefined()
      }
      for (const setup of device.clock.sourceSetup ?? []) {
        const key = `clock.sourceSetup[${setup.transport}]`
        expect(device.capabilityEvidence?.[key], key).toBeDefined()
      }
    })

    it('gives every reasoned non-claim a reason, which is the whole point of them (#120)', () => {
      const entries = Object.entries(device.capabilityEvidence ?? {}).flatMap(([path, e]) =>
        typeof e === 'object' && e !== null && 'kind' in e
          ? [[path, e as { kind: string; reason?: string; proven?: string; open?: string }] as const]
          : [],
      )
      const reasoned = entries.filter(([, e]) =>
        ['unknown', 'unread', 'cited-against'].includes(e.kind),
      )
      expect(reasoned.length).toBeGreaterThan(0)
      for (const [path, entry] of reasoned) {
        expect(entry.reason, path).toBeTruthy()
        expect((entry.reason ?? '').length, path).toBeGreaterThan(30)
      }

      // `partly` carries two halves instead of one reason, and a `partly` whose `open` is vague
      // is the same author-giving-up shape a bare state is (#117/#120).
      const partly = entries.filter(([, e]) => e.kind === 'partly')
      expect(partly.length).toBeGreaterThan(0)
      for (const [path, entry] of partly) {
        expect(entry.proven, path).toBeTruthy()
        expect(entry.open, path).toBeTruthy()
        expect((entry.open ?? '').length, path).toBeGreaterThan(30)
        // Both halves name a page, or they are not saying which reading ran out where.
        expect(entry.proven ?? '', path).toMatch(/p\.\d+/)
        expect(entry.open ?? '', path).toMatch(/p\.\d+/)
      }
    })

    it('answers the audio input with a page rather than a shrug', () => {
      // p.15 dimensions the rear edge and names every socket on it. An absence somebody read is
      // `cited-against`; an absence nobody checked would be `false`, and they are not the same.
      expect(device.io.audioIn).toBe(false)
      expect(device.capabilityEvidence?.['io.audioIn']).toMatchObject({
        kind: 'cited-against',
        cite: { kind: 'manual', source: `${MANUAL}15` },
      })
    })

    it('claims the internal sidechain the limiter really has, and not the external one', () => {
      // p.197: "any track can be used as a sound source for sidechaining the limiter", with eight
      // `Sidechain Track N` presets on p.189. External keying needs an input this box has not got.
      expect(device.features?.sidechain).toEqual({ internal: true, fromExternalAudio: false })
      expect(device.capabilityEvidence?.['features.sidechain.internal']).toMatchObject({
        kind: 'manual',
      })
    })

    it('declares a shipped library rather than an enumerable one, and says why', () => {
      expect(device.content?.kind).toBe('shipped-library')
      expect(device.capabilityEvidence?.['content']).toMatchObject({ kind: 'manual' })
      // `enumerable` would let a recipe reference a pack entry. Nothing lists one, so every
      // sample recipe describes what it needs in prose instead.
      for (const recipe of sampleRecipes) expect(recipe.sourceAudio?.need, recipe.id).toBeTruthy()
      for (const recipe of synthRecipes) expect(recipe.sourceAudio, recipe.id).toBeUndefined()
    })

    it('claims the clock preference on the page that names the box’s job, not its wiring', () => {
      // p.207 heads a worked configuration "Play+ as the primary lead". p.205 is the menu that
      // carries the clock out, which is capability rather than role, and is cited separately.
      expect(device.clock.preferredSource).toBe(true)
      expect(device.capabilityEvidence?.['clock.preferredSource']).toMatchObject({
        source: `${MANUAL}207`,
      })
      expect(device.capabilityEvidence?.['clock.canSendClock']).toMatchObject({
        source: `${MANUAL}205`,
      })
    })

    it('declares no note duration, because the two pools answer differently (#142)', () => {
      // Audio steps carry no length (p.68, p.69); MIDI / Synth steps carry `Note Length` in steps
      // (p.65, p.211). The field is device-level, so either declaration is false for one pool —
      // and `DeviceSchema` refuses a declaration whose evidence is not a plain `Cite`, so a
      // half-true one cannot be softened with `partly` and kept.
      expect(device.noteDuration).toBeUndefined()
      const evidence = device.capabilityEvidence?.['noteDuration']
      expect(evidence).toMatchObject({ kind: 'partly' })
      expect((evidence as { proven: string }).proven).toContain('p.68')
      expect((evidence as { open: string }).open).toContain('p.65')
    })

    it('says what the pool model cannot hold about the synth voices', () => {
      // `VoiceSpec.polyphony` is per pool member, so `polyphony: 8` on eight synth tracks would
      // read as 64 simultaneous notes. p.91 budgets eight across all three slots.
      const evidence = device.capabilityEvidence?.['voices']
      expect(evidence).toMatchObject({ kind: 'partly' })
      expect((evidence as { open: string }).open).toContain('p.91')
    })
  })

  // -------------------------------------------------------------------------
  // Panel
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    it('spans 282 x 207 mm, confirmed against the figure’s own vector geometry', () => {
      expect(device.physical.panelSpanMm).toBe(282)
      expect(device.panel?.panelRiseMm).toBe(207)

      // p.15 carries no raster image; the panel is Form XObject `I1`, `/BBox [0 0 1702 1254]`,
      // identity `/Matrix`, placed at `0.169356 0 0 0.169356 174.917 330.582 cm`. Its border runs
      // x 18.846..1684.180 and y 16.763..1239.560, so the drawn box is these units.
      const DRAWN_W = 1684.18 - 18.846
      const DRAWN_H = 1239.56 - 16.763
      const PLACEMENT = 0.169356

      // The aspect agrees with the printed pair to 0.03%, where a 200 dpi render could only get
      // within 0.13%.
      const cited = 282 / 207
      expect(Math.abs(cited - DRAWN_W / DRAWN_H) / cited).toBeLessThan(0.0005)

      // The stronger claim, and the one an aspect check cannot make: at the placement scale the
      // border is 282.03 x 207.09 pt, so the figure is drawn at one point per millimetre. That
      // pins both dimensions individually rather than only their ratio, and is what rules out the
      // 35 mm depth dimensioned directly above the plan view.
      expect(DRAWN_W * PLACEMENT).toBeCloseTo(282, 0)
      expect(DRAWN_H * PLACEMENT).toBeCloseTo(207, 0)

      expect(device.physical.verified).toMatchObject({ kind: 'manual' })
      expect(device.panel?.verified).toMatchObject({ kind: 'manual' })
    })

    it('takes its control sizes from the drawing, which makes them round numbers', () => {
      // Path centrelines rather than rasterised ink, so these are the geometry the figure states:
      // 160 pads at 9.99 mm, 15 knobs at 12.00 mm, 11 buttons at 16.03 mm, and one 14.00 mm
      // encoder. A render measures every one of them about half a stroke wider.
      const feats = device.panel!.features
      const knobs = feats.filter((f) => f.kind === 'knob')
      const params = knobs.filter((f) => f.kind === 'knob' && f.d === 12)
      expect(params).toHaveLength(15)
      expect(knobs.filter((f) => f.kind === 'knob' && f.d === 14)).toHaveLength(1)

      // Five columns on one pitch and three rows on another; the vector makes both exact.
      const xs = [...new Set(params.map((f) => (f.kind === 'knob' ? f.x : 0)))].sort((a, b) => a - b)
      const ys = [...new Set(params.map((f) => (f.kind === 'knob' ? f.y : 0)))].sort((a, b) => a - b)
      expect(xs).toHaveLength(5)
      expect(ys).toHaveLength(3)
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeCloseTo(26.29, 1)
      for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeCloseTo(24.38, 1)
    })

    it('draws the pad field flush, because the figure has no gap at the 16/17 boundary', () => {
      // Every one of the twenty columns sits on a 13.04 mm pitch, the step-to-function boundary
      // included. The split is drawn by the labels under the last four columns, not by a gap, so
      // inventing one would be drawing a different machine.
      const grids = device.panel!.features.filter((f) => f.kind === 'grid')
      expect(grids).toHaveLength(2)
      const [steps, fns] = grids as Extract<(typeof grids)[number], { kind: 'grid' }>[]

      // Flush: the space between the two blocks is one pad gap (3.04 mm), not a section break.
      // A pad is 9.99 mm on a 13.04 mm pitch, so 3.05 mm is what sits between any two columns.
      const between = fns!.x - (steps!.x + steps!.w)
      expect(between).toBeGreaterThan(2.5)
      expect(between).toBeLessThan(3.6)

      // Same band, so the twenty columns read as one field.
      expect(steps!.y).toBeCloseTo(fns!.y, 5)
      expect(steps!.h).toBeCloseTo(fns!.h, 5)
      expect(steps!.cols + fns!.cols).toBe(20)
      expect(steps!.rows).toBe(8)
      expect(fns!.rows).toBe(8)
    })

    it('keeps every feature inside the panel', () => {
      const span = device.physical.panelSpanMm
      const rise = device.panel!.panelRiseMm
      for (const f of device.panel!.features) {
        const w = 'w' in f ? f.w : 'd' in f ? f.d : 0
        const h = 'h' in f ? f.h : 'd' in f ? f.d : 0
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(span)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(rise)
      }
    })

    it('draws the fifteen knobs, the six function buttons and the 8 x 20 pad field', () => {
      const kinds = device.panel!.features
      expect(kinds.filter((f) => f.kind === 'knob')).toHaveLength(16) // 15 parameter + (Screen)
      expect(kinds.filter((f) => f.kind === 'button')).toHaveLength(11) // 5 screen + 6 function
      const grids = kinds.filter((f) => f.kind === 'grid')
      expect(grids.map((g) => (g.kind === 'grid' ? g.cols * g.rows : 0))).toEqual([128, 32])
    })

    it('accents in the scale each pool actually uses, which is the knob trap again', () => {
      // p.89: on an audio track Volume is "with respect to its current level. 0dB refers to
      // original level", ceiling +12 dB (p.65). On a MIDI / Synth track the same knob is velocity
      // "over a 0-127 range and default at 100" (p.65). An `ArticulationEntry` set carries a bare
      // number, so nothing but this test keeps a velocity off a dB track — where 96 would read as
      // +96 dB against a +12 ceiling.
      for (const recipe of sampleRecipes) {
        for (const entry of recipe.articulation ?? []) {
          const v = entry.set['volume']
          if (typeof v !== 'number') continue
          expect(v, `${recipe.id} / ${entry.slot}`).toBeLessThanOrEqual(12)
        }
      }
      for (const recipe of synthRecipes) {
        for (const entry of recipe.articulation ?? []) {
          const v = entry.set['volume']
          if (typeof v !== 'number') continue
          expect(v, `${recipe.id} / ${entry.slot}`).toBeGreaterThanOrEqual(0)
          expect(v, `${recipe.id} / ${entry.slot}`).toBeLessThanOrEqual(127)
          // A velocity that would also be a legal dB value proves nothing either way, so the
          // synth side is pinned above the dB ceiling as well as inside the velocity range.
          expect(v, `${recipe.id} / ${entry.slot}`).toBeGreaterThan(12)
        }
      }
    })

    it('sets only per-step features it declares, in both pools', () => {
      const declared = new Set(device.features?.perStep ?? [])
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const key of Object.keys(entry.set)) {
            expect(declared.has(key), `${recipe.id} / ${key}`).toBe(true)
          }
        }
      }
    })
  })

  describe('panel placement', () => {
    it('puts the voice field on the track-function columns, not on the step grid', () => {
      // `rack.test.ts` requires voice cells to stay near pad size; the step grid makes them 3.7x.
      const field = device.panel!.features.find((f) => f.kind === 'voices')!
      expect(field.kind === 'voices' && field.x).toBeGreaterThan(220)
    })
  })

  // -------------------------------------------------------------------------
  // It works
  // -------------------------------------------------------------------------

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, hint] of Object.entries(device.hints ?? {})) {
      expect(hint.split(/\s+/).length, `${key}: ${hint}`).toBeLessThan(8)
    }
  })

  it('resolves on its own against every direction, uncapped and with no gaps', () => {
    for (const template of TEMPLATES) {
      const result = resolve({
        devices: [device],
        template,
        mood: NEUTRAL_MOOD,
        seed: 1,
      })
      expect(result.search.capped, template.id).toBe(false)
      expect(result.assignments.length, template.id).toBeGreaterThan(0)
    }
  })

  it('reaches both pools when a direction asks for enough parts', () => {
    const result = resolve({
      devices: [device],
      template: TEMPLATES.find((t) => t.id === 'industrial-techno')!,
      mood: NEUTRAL_MOOD,
      seed: 1,
    })
    const byId = new Map(device.recipes.map((r) => [r.id, r.voice]))
    const pools = new Set(result.assignments.map((a) => byId.get(a.recipe?.id ?? '')))
    expect(pools.has('track-sample')).toBe(true)
    expect(pools.has('track-synth')).toBe(true)
  })
})
