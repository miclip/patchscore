import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  expand,
  isSustainedPart,
  noteInstruction,
  reachableSlots,
  realisationOf,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Recipe,
  type Role,
} from '../lib/core/index'
import { device } from '../lib/devices/polyend-tracker/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The Tracker is the third Polyend groovebox in the library and the plainest of the three: one
 * pool of eight tracks, one voice each, and a sampler behind all of them. That plainness is what
 * this file guards, because it makes two different mistakes easy.
 *
 *  1. **The play mode is a switch over eight scales**, and the manual never prints it in the same
 *     table as the values it governs. `Position` is a wavetable index under Wavetable and a time
 *     in seconds under Granular; `Start` and `End` are free under 1-Shot and constrained under
 *     the loop modes. So the load-bearing claim here is that the mode always travels with the
 *     value **and agrees with it** — a `NUMBER OF SLICES` under Granular would be a made-up
 *     pairing however carefully the range beside it was cited (CLAUDE.md).
 *  2. **There is no amp envelope on this box.** Attack, Decay, Sustain and Release live on the
 *     Instrument Automation page and shape whichever destination is selected, only while Type
 *     reads `Envelope` (p.115). An ADSR with neither beside it names an envelope a reader has no
 *     page to enter.
 *
 * Two smaller traps are pinned as absences. The five step-FX LFO rate tables in ch.7 are **not
 * one table** — the Volume LFO's (p.165) prints `2` where the other four print `3/4` at the same
 * value — so nothing here authors a step-FX rate at all, and the one instrument-page `SPEED` is
 * checked against p.117's own footnote instead. And `Volume` is not authored anywhere, because
 * p.110 prints its floor as `-inf dB`.
 */

const MANUAL = 'Polyend Tracker Manual 1.9.2a, p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function pointOf(recipe: Recipe, name: string): string | number | undefined {
  const p = named(recipe, name)
  if (p === undefined) return undefined
  return (p as { value: string | number }).value
}

function has(recipe: Recipe, ...names: string[]): boolean {
  return names.some((n) => named(recipe, n) !== undefined)
}

/** The play mode each of these parameters only exists under (pp.123, 125, 127, 131, 136). */
const MODE_ONLY: Record<string, string[]> = {
  START: ['1-Shot'],
  END: ['1-Shot'],
  'LOOP START': ['Forward loop', 'Backward loop', 'Pingpong loop'],
  'LOOP END': ['Forward loop', 'Backward loop', 'Pingpong loop'],
  'NUMBER OF SLICES': ['Slice', 'Beat Slice'],
  WINDOW: ['Wavetable'],
  LENGTH: ['Granular'],
  SHAPE: ['Granular'],
  LOOP: ['Granular'],
  POSITION: ['Wavetable', 'Granular'],
}

/** Printed step-FX ranges, ch.7, keyed by the `perStep` name this manifest uses. */
const STEP_FX_RANGE: Record<string, [number, number]> = {
  volume: [0, 100], //          p.146  0 - 100%
  'micro-tune': [-99, 99], //   p.148  -99 to +99 Cents
  glide: [0, 100], //           p.149  0 - 100%
  'gate-length': [0, 100], //   p.153  0 - 100%
  chance: [0, 100], //          p.154  0 - 100%
  roll: [0, 16], //             p.155  0 - 16 per Type
  'random-volume': [0, 100], // p.161  0 to +/-100
  slice: [0, 48], //            p.164  0 - 48
  overdrive: [0, 100], //       p.170  0-100%
  'high-pass': [0, 100], //     p.173  0-100%
  'reverb-send': [0, 100], //   p.175  0-100%
  'bit-depth': [4, 16], //      p.176  4-16 Bits
}

describe('Tracker manifest', () => {
  it('parses as a Device, and its id is its folder', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('polyend-tracker')
    expect(device.manual).toEqual({ title: 'Polyend Tracker Manual', edition: '1.9.2a' })
  })

  // -------------------------------------------------------------------------
  // 1. The switch travels with the value, and agrees with it
  // -------------------------------------------------------------------------

  describe('the play mode governs eight scales (CLAUDE.md: a cited range can still be the wrong range)', () => {
    it('carries PLAY MODE in every recipe that carries a playback position', () => {
      for (const recipe of device.recipes) {
        if (!has(recipe, ...Object.keys(MODE_ONLY))) continue
        expect(named(recipe, 'PLAY MODE'), recipe.id).toBeDefined()
      }
      // Not vacuous: every recipe on this box loads audio, so every one of them is in scope.
      expect(device.recipes.every((r) => named(r, 'PLAY MODE') !== undefined)).toBe(true)
    })

    it('never authors a parameter under a play mode it does not exist in', () => {
      for (const recipe of device.recipes) {
        const mode = pointOf(recipe, 'PLAY MODE')
        for (const [name, modes] of Object.entries(MODE_ONLY)) {
          if (named(recipe, name) === undefined) continue
          expect(modes, `${recipe.id} / ${name} under ${String(mode)}`).toContain(mode)
        }
      }
    })

    it('cites the play-mode list to the page that prints it, and offers all eight', () => {
      const mode = named(device.recipes[0]!, 'PLAY MODE')!
      expect(mode.kind).toBe('enum')
      if (mode.kind !== 'enum') return
      expect(mode.options.values).toEqual([
        '1-Shot',
        'Forward loop',
        'Backward loop',
        'Pingpong loop',
        'Slice',
        'Beat Slice',
        'Wavetable',
        'Granular',
      ])
      expect(mode.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}121` })
    })

    it('leaves Start / End / Position / Window unscaled, because the range cell says "Variable"', () => {
      // pp.123, 131, 136 print these as `Variable` — the scale is the loaded file's own length,
      // so any NumericRange here would be invented (invariant 5).
      for (const recipe of device.recipes) {
        for (const name of ['START', 'END', 'LOOP START', 'LOOP END', 'POSITION', 'WINDOW', 'AMOUNT']) {
          const p = named(recipe, name)
          if (p === undefined) continue
          expect(p.kind, `${recipe.id} / ${name}`).toBe('text')
        }
      }
    })
  })

  describe('the filter type governs the cutoff (p.111)', () => {
    it('carries FILTER TYPE wherever CUTOFF or RESONANCE is authored', () => {
      for (const recipe of device.recipes) {
        if (!has(recipe, 'CUTOFF', 'RESONANCE')) continue
        expect(named(recipe, 'FILTER TYPE'), recipe.id).toBeDefined()
      }
    })

    it('never leans the darkness knob on a filter that is switched off', () => {
      // `Disabled` is one of the four printed options and it makes both controls inert, so a
      // mood offset on a cutoff under it would move a number nothing hears.
      for (const recipe of device.recipes) {
        const cutoff = named(recipe, 'CUTOFF')
        if (cutoff === undefined || cutoff.kind !== 'numeric' || cutoff.mood === undefined) continue
        expect(pointOf(recipe, 'FILTER TYPE'), recipe.id).not.toBe('Disabled')
      }
    })
  })

  describe('there is no amp envelope, only an automation destination (p.115)', () => {
    it('carries the destination and the type with every ADSR value', () => {
      const withEnv = device.recipes.filter((r) => has(r, 'ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE'))
      expect(withEnv.length).toBeGreaterThan(10)
      for (const recipe of withEnv) {
        expect(named(recipe, 'AUTOMATION DESTINATION'), recipe.id).toBeDefined()
        expect(pointOf(recipe, 'AUTOMATION TYPE'), recipe.id).toBe('Envelope')
        expect(pointOf(recipe, 'AUTOMATION DESTINATION'), recipe.id).toBe('Volume')
      }
    })

    it('keeps the one LFO off the destination p.117 forbids its speed list on', () => {
      // "128 to 32 Step Speed options are not available with Volume as the destination." The
      // options here are the whole 29-entry list, which is only legal away from Volume.
      const withLfo = device.recipes.filter((r) => pointOf(r, 'AUTOMATION TYPE') === 'LFO')
      expect(withLfo).toHaveLength(1)
      for (const recipe of withLfo) {
        expect(pointOf(recipe, 'AUTOMATION DESTINATION'), recipe.id).not.toBe('Volume')
        const speed = named(recipe, 'SPEED')!
        expect(speed.kind).toBe('enum')
        if (speed.kind !== 'enum') return
        expect(speed.options.values).toHaveLength(29)
        expect(speed.options.values[0]).toBe('128')
        // p.117 prints `65` where every step-FX rate table in ch.7 prints `64`. Verbatim.
        expect(speed.options.values[2]).toBe('65')
        expect(speed.options.verified).toEqual({ kind: 'manual', source: `${MANUAL}117` })
      }
    })

    it('authors no step-FX LFO rate at all, because the five printed tables disagree', () => {
      // The Volume LFO's table (p.165) prints `2` at value 128 where the other four (pp.166-169)
      // print `3/4`, and it stops eight entries earlier. A rate copied between them lands on a
      // different division, so this manifest avoids the pairing rather than solving it.
      const stepLfoKeys = ['volume-lfo', 'panning-lfo', 'filter-lfo', 'position-lfo', 'finetune-lfo']
      expect(device.features?.perStep ?? []).toEqual(
        expect.not.arrayContaining(stepLfoKeys),
      )
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const key of Object.keys(entry.set)) {
            expect(stepLfoKeys, `${recipe.id} / ${key}`).not.toContain(key)
          }
        }
      }
    })

    it('never authors Volume, whose printed floor is not a finite number (p.110)', () => {
      // "Range is -inf dB to 24.00 dB". Inventing a floor to make it fit is the claim §3.1
      // exists to prevent — the same trap the Tracker Mini declined on the same parameter.
      for (const recipe of device.recipes) {
        expect(named(recipe, 'VOLUME'), recipe.id).toBeUndefined()
      }
    })
  })

  // -------------------------------------------------------------------------
  // 2. Citation regime (§3.2)
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

    it('claims manual authority for no point at all, because no page picks a sound for a part', () => {
      // The manual prints exactly one default in 308 pages ("Panning will reset to 0", p.112) and
      // its screenshots contradict each other across pages, so nothing here borrows one.
      const authored: string[] = []
      for (const recipe of device.recipes) {
        for (const param of params(recipe)) {
          if (param.verified !== undefined && param.verified !== false) {
            authored.push(`${recipe.id} / ${param.name}`)
          }
        }
        expect(recipe.verified, recipe.id).toBe(false)
      }
      expect(authored).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // 3. Pool and recipe shape
  // -------------------------------------------------------------------------

  describe('one pool of eight monophonic tracks (p.18, p.28, p.98)', () => {
    it('declares 8 tracks as a single pool, not two like its siblings', () => {
      expect(device.voices).toHaveLength(1)
      const pool = device.voices[0]!
      expect(pool.kind).toBe('pool')
      expect(pool.id).toBe('track')
      if (pool.kind !== 'pool') return
      expect(pool.count).toBe(8)
      // "Each track in Tracker can handle one voice which can play multiple notes, but not
      // simultaneously... A triad would need 3 tracks to play the chord." (p.98)
      expect(pool.polyphony).toBe(1)
      // No synth engine, so nothing splits the tracks: every role reaches every one of the eight.
      expect(pool.roles).toHaveLength(23)
    })

    it('expands to 8 assignables in one namespace (§2.2)', () => {
      const assignables = expand(device)
      expect(assignables).toHaveLength(8)
      expect(assignables.map((a) => a.voiceId)).toEqual([
        'track-1', 'track-2', 'track-3', 'track-4',
        'track-5', 'track-6', 'track-7', 'track-8',
      ])
      expect(assignables.every((a) => a.poolId === 'track')).toBe(true)
    })

    it('serves every role the pool declares, and carries no recipe nobody can select', () => {
      // **This used to assert five honest gaps and #345 closed them**, which is the change rather
      // than a count moving: `acid`, `arp`, `bass-mid`, `metallic` and `stab` were legal on the
      // box and written by nobody, and each is now one recipe.
      //
      // The count itself is deliberately not asserted any more. It read 21 and had moved before
      // (#300 took it from 19), so it was re-recording the last commit rather than guarding
      // anything. What it stood in for is sprawl, and that is checkable directly.
      const authored = new Set(device.recipes.map((r) => r.role))
      const pool = device.voices[0]!
      if (pool.kind !== 'pool') throw new Error('the first voice should be the track pool')
      expect(pool.roles.filter((r) => !authored.has(r)).sort()).toEqual([])

      const unreachable = device.recipes.filter((r) => !reachableSlots(r, TEMPLATES).requested)
      expect(
        unreachable.map((r) => r.id),
        'authored for a (role, character) no direction in the library can select',
      ).toEqual([])
    })

    it('routes every recipe to the one pool, so no ordinal needs its own sheet (§2.2)', () => {
      for (const recipe of device.recipes) expect(recipe.voice, recipe.id).toBe('track')
    })

    it('reaches a chord only by rendering one, because a track is monophonic', () => {
      // p.98 makes a triad cost three tracks, so the only way one assignable holds a chord is a
      // rendered sample. That is the single `sampled-chord` here, and it carries the procedure.
      // Two since #345: the `stab` is the other role every direction asks three or four notes of,
      // and a track holds one. Both carry the same render procedure, which is the claim here.
      const chords = device.recipes.filter((r) => realisationOf(r) === 'sampled-chord')
      expect(chords.map((r) => r.id).sort()).toEqual(['tr-pad-soft', 'tr-stab-hard'])
      for (const recipe of chords) {
        expect(recipe.sourceAudio?.prep?.verified, recipe.id).toEqual({
          kind: 'manual',
          source: `${MANUAL}187`,
        })
      }
    })
  })

  // -------------------------------------------------------------------------
  // 4. Source audio (§3/#101)
  // -------------------------------------------------------------------------

  describe('source audio, because nothing on this box makes its own sound', () => {
    it('says what to load in every recipe', () => {
      for (const recipe of device.recipes) {
        expect(recipe.sourceAudio?.need, recipe.id).toBeTruthy()
      }
    })

    it('declares the shipped library rather than leaving it unknown (§2.6/#111)', () => {
      // p.30's folder tree, inside a drawing: "Tracker comes with 9 factory packs installed onto
      // the SD Card", with the nine named. `shipped-library` and not `enumerable`, because the
      // packs are named and their contents are not — so a recipe cannot reference an entry.
      expect(device.content?.kind).toBe('shipped-library')
      expect(device.capabilityEvidence?.['content']).toEqual({ kind: 'manual', source: `${MANUAL}30` })
      // Which is what makes `sourceAudio` legal here at all: the schema refuses the pair on an
      // `enumerable` box.
      expect(device.recipes.some((r) => r.sourceAudio !== undefined)).toBe(true)
    })

    it('points every source-audio hint at a gesture the manifest actually declares', () => {
      const hints = device.hints ?? {}
      for (const recipe of device.recipes) {
        const key = recipe.sourceAudio?.hint
        if (key === undefined) continue
        expect(Object.keys(hints), `${recipe.id} / ${key}`).toContain(key)
      }
    })
  })

  // -------------------------------------------------------------------------
  // 5. Per-step FX (ch.7)
  // -------------------------------------------------------------------------

  describe('per-step FX', () => {
    it('sets only per-step features it declares', () => {
      const declared = new Set(device.features?.perStep ?? [])
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const key of Object.keys(entry.set)) {
            expect(declared.has(key), `${recipe.id} / ${key}`).toBe(true)
          }
        }
      }
    })

    it('declares no per-step name a recipe never reaches for', () => {
      // The Tracker Mini's lesson (#108): `perStep` is a validation table, not a capability
      // claim, so a name nothing uses validates nothing and only makes the box look fuller.
      const used = new Set<string>()
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const key of Object.keys(entry.set)) used.add(key)
        }
      }
      expect([...(device.features?.perStep ?? [])].sort()).toEqual([...used].sort())
    })

    it('keeps every articulation value inside the range ch.7 prints for that FX', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.articulation ?? []) {
          for (const [key, value] of Object.entries(entry.set)) {
            if (typeof value !== 'number') continue
            const bounds = STEP_FX_RANGE[key]
            expect(bounds, `${recipe.id} / ${key} has no printed range here`).toBeDefined()
            if (bounds === undefined) continue
            expect(value, `${recipe.id} / ${key}`).toBeGreaterThanOrEqual(bounds[0])
            expect(value, `${recipe.id} / ${key}`).toBeLessThanOrEqual(bounds[1])
          }
        }
      }
    })

    it('spells the reverse command the way p.162 prints it, not as a boolean', () => {
      const reversed = device.recipes
        .flatMap((r) => r.articulation ?? [])
        .filter((e) => 'reverse-sample' in e.set)
      expect(reversed).toHaveLength(1)
      expect(reversed[0]!.set['reverse-sample']).toBe('<<<')
    })
  })

  // -------------------------------------------------------------------------
  // 6. Capability evidence (§2.6/#22)
  // -------------------------------------------------------------------------

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

    it('cites every capability fact to a page of this manual', () => {
      const entries = Object.entries(device.capabilityEvidence ?? {})
      expect(entries.length).toBeGreaterThan(15)
      for (const [path, entry] of entries) {
        const cite =
          typeof entry === 'object' && entry !== null && 'kind' in entry && entry.kind === 'manual'
            ? entry
            : typeof entry === 'object' && entry !== null && 'cite' in entry
              ? (entry as { cite: { kind: string; source: string } }).cite
              : undefined
        if (cite === undefined) continue
        expect(cite.source, path).toContain(MANUAL)
      }
    })

    it('gives every reasoned non-claim a reason, which is the whole point of them (#120)', () => {
      const reasoned = Object.entries(device.capabilityEvidence ?? {}).flatMap(([path, e]) =>
        typeof e === 'object' && e !== null && 'kind' in e &&
        ['unknown', 'unread', 'cited-against'].includes(e.kind as string)
          ? [[path, e as { kind: string; reason?: string }] as const]
          : [],
      )
      expect(reasoned.map(([p]) => p).sort()).toEqual(['features.lfo', 'io.usbAudio'])
      for (const [path, entry] of reasoned) {
        expect(entry.reason, path).toBeTruthy()
        expect(entry.reason!.length, path).toBeGreaterThan(40)
      }
    })

    it('sends and receives clock, and names the menu that carries it out (p.251)', () => {
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.transport).toEqual(['midi-din', 'usb'])
      expect(device.clock.sourceSetup?.map((s) => s.path)).toEqual([
        'Config > MIDI > Clock Out',
        'Config > MIDI > Clock Out',
      ])
      // The menu's own spellings, because §8 is read at the machine.
      expect(device.clock.sourceSetup?.map((s) => s.value)).toEqual(['MIDI Out jack', 'USB'])
      // The preference is the drawn topology on p.253, not the menu on p.251 — leading and
      // following are both documented, and only the leading case is this field's claim.
      expect(device.clock.preferredSource).toBe(true)
      expect(device.capabilityEvidence?.['clock.preferredSource']).toEqual({
        kind: 'manual',
        source: `${MANUAL}253`,
      })
    })

    it('labels the clock sockets MIDI In / MIDI Out, because there is no CLK jack (p.13)', () => {
      expect(device.jacks?.map((j) => j.id).sort()).toEqual(['MIDI In', 'MIDI Out'])
      for (const jack of device.jacks ?? []) {
        expect(jack.clock, jack.id).toEqual(['midi-din'])
        // Type B is the uncommon one; a reader reaching for Type A gets silence with nothing on
        // screen to explain it (p.13, p.250).
        expect(jack.note, jack.id).toContain('Type B')
      }
    })

    it('keys the master limiter from external audio, which is printed rather than inferred', () => {
      // p.243, the Sidechain row: "Disable, Track 1-8, Line In L R". Both halves come off that
      // one row, which is why both cite the same page.
      expect(device.features?.sidechain).toEqual({ internal: true, fromExternalAudio: true })
      expect(device.capabilityEvidence?.['features.sidechain.internal']).toEqual({
        kind: 'manual',
        source: `${MANUAL}243`,
      })
      expect(device.capabilityEvidence?.['features.sidechain.fromExternalAudio']).toEqual({
        kind: 'manual',
        source: `${MANUAL}243`,
      })
    })

    it('ends a note with OFF, the one of three commands that is a note-off (p.99)', () => {
      // CUT stops the audio and FAD fades it: both are edits to the sound rather than the end of
      // a note, so printing either would choose an effect on the reader's behalf.
      expect(device.noteDuration).toEqual({ kind: 'until-next', noteOff: 'OFF' })
      expect(device.capabilityEvidence?.['noteDuration']).toEqual({
        kind: 'manual',
        source: `${MANUAL}99`,
      })
    })

    it('states no USB audio, against the page that enumerates the audio sources (p.187)', () => {
      expect(device.io.usbAudio).toBe(false)
      expect(device.io.audioIn).toBe(true)
      expect(device.io.main).toBe('stereo')
      expect(device.io.individualOuts).toBe(0)
      const usb = device.capabilityEvidence?.['io.usbAudio'] as { kind: string; reason: string }
      expect(usb.kind).toBe('cited-against')
      expect(usb.reason).toContain('p.187')
    })
  })

  // -------------------------------------------------------------------------
  // 7. Panel (§10) — measured, not estimated
  // -------------------------------------------------------------------------

  describe('panel (§10)', () => {
    // The panel is one drawing placed twice: Form XObject `I1` on p.13 (dimensioned) and `I4` on
    // p.14 (labelled), both `/BBox [0 0 1702 1254]` with an identity `/Matrix`. Neither page
    // carries a raster image. The border path runs x 18.8961..1684.230, y 16.703..1239.500.
    const DRAWN_W = 1684.23 - 18.8961
    const DRAWN_H = 1239.5 - 16.703
    /** p.13's placement: `0.169491 0 0 0.169491 174.802 330.666 cm`. */
    const PLACEMENT = 0.169491

    it('spans 282 x 207 mm, confirmed against the figure’s own vector geometry', () => {
      expect(device.physical.panelSpanMm).toBe(282)
      expect(device.panel?.panelRiseMm).toBe(207)

      // The aspect agrees with the dimensioned pair to 0.03%, where a 200 dpi render of the same
      // figure could only get within about 0.13%.
      const cited = 282 / 207
      expect(Math.abs(cited - DRAWN_W / DRAWN_H) / cited).toBeLessThan(0.0005)

      // The stronger claim, and the one an aspect check cannot make on its own: at p.13's
      // placement the border is 282.26 x 207.25 pt, so the figure is drawn at one point per
      // millimetre. That pins both dimensions individually rather than only their ratio, and is
      // what rules out the 33 mm depth dimensioned on the rear elevation directly above it.
      expect(DRAWN_W * PLACEMENT).toBeCloseTo(282, 0)
      expect(DRAWN_H * PLACEMENT).toBeCloseTo(207, 0)

      expect(device.physical.verified).toMatchObject({ kind: 'manual' })
      expect(device.panel?.verified).toMatchObject({ kind: 'manual' })
    })

    it('shares the Play+ chassis exactly, which is a check that passed rather than a value copied', () => {
      // Both manuals place the same 1665.334 x 1222.797 frame, so the two boxes agree on 282 x
      // 207 from two documents. A shared rise arrived at twice looks exactly like a value
      // silently defaulted, which is why it is asserted rather than left to look like luck.
      expect(device.physical.panelSpanMm).toBe(282)
      expect(device.panel?.panelRiseMm).toBe(207)
    })

    it('draws the census the figure states: 48 pads, 33 buttons, one screen, one wheel', () => {
      const feats = device.panel!.features
      expect(feats.filter((f) => f.kind === 'screen')).toHaveLength(1)
      expect(feats.filter((f) => f.kind === 'button')).toHaveLength(33)
      expect(feats.filter((f) => f.kind === 'knob')).toHaveLength(1)
      expect(feats.filter((f) => f.kind === 'voices')).toHaveLength(1)

      const grids = feats.filter((f) => f.kind === 'grid')
      expect(grids).toHaveLength(1)
      const grid = grids[0]!
      if (grid.kind !== 'grid') return
      // p.14 callout 3: "4 x 12 grid of silicon multifunctional [PADS]."
      expect(grid.cols).toBe(12)
      expect(grid.rows).toBe(4)
      expect(grid.shape).toBe('pad')

      // Path centrelines rather than rasterised ink: a pad is 9.99 mm on a 13.04 mm pitch, the
      // same pitch the Play+ carries because it is the same chassis.
      const pitch = (grid.w - 9.99) / 11
      expect(pitch).toBeCloseTo(13.04, 1)

      // The jog wheel, callout 4: one circle of 273.1 units.
      const knob = feats.find((f) => f.kind === 'knob')!
      if (knob.kind !== 'knob') return
      expect(knob.d).toBeCloseTo(46.25, 1)
      expect(knob.label).toBe('JOG')
    })

    it('puts the 5 x 5 command block on one 19.28 mm pitch, as the vector draws it', () => {
      const block = device
        .panel!.features.filter((f) => f.kind === 'button' && f.x > 170)
        .map((f) => (f.kind === 'button' ? f : undefined)!)
      expect(block).toHaveLength(25)
      const xs = [...new Set(block.map((f) => f.x))].sort((a, b) => a - b)
      const ys = [...new Set(block.map((f) => f.y))].sort((a, b) => a - b)
      expect(xs).toHaveLength(5)
      expect(ys).toHaveLength(5)
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeCloseTo(19.28, 1)
      // Every button is the same 16.03 mm square.
      for (const f of block) {
        expect(f.w).toBeCloseTo(16.03, 1)
        expect(f.h).toBeCloseTo(16.03, 1)
      }
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
  })

  describe('panel placement', () => {
    it('puts the voice field on the eight screen buttons, which p.18 makes the eight tracks', () => {
      // "All 8 tracks are presented by the screen buttons when holding the shift button" (p.18).
      // Eight buttons, eight tracks, one to one — so unlike the Play+, whose field covers a
      // selection block and claims no correspondence, these cells land on their own controls.
      const field = device.panel!.features.find((f) => f.kind === 'voices')!
      if (field.kind !== 'voices') return
      const row = device.panel!.features.filter(
        (f) => f.kind === 'button' && f.x < 170,
      )
      expect(row).toHaveLength(8)
      for (const b of row) {
        if (b.kind !== 'button') continue
        expect(b.x, 'button left of field').toBeGreaterThanOrEqual(field.x - 0.01)
        expect(b.x + b.w, 'button right of field').toBeLessThanOrEqual(field.x + field.w + 0.01)
        expect(b.y).toBeCloseTo(field.y, 1)
      }
      // Not the pad grid: it is 4 x 12 and corresponds to nothing, and eight cells over 153 mm
      // would be the oversized-voice-cell failure `rack.test.ts` records finding on the Deluge.
      const grid = device.panel!.features.find((f) => f.kind === 'grid')!
      expect(field.y).toBeLessThan(grid.y)
    })
  })

  // -------------------------------------------------------------------------
  // 8. It works
  // -------------------------------------------------------------------------

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, hint] of Object.entries(device.hints ?? {})) {
      expect(hint.split(/\s+/).length, `${key}: ${hint}`).toBeLessThan(8)
    }
  })

  it('points every parameter and articulation hint at a gesture it declares', () => {
    const hints = new Set(Object.keys(device.hints ?? {}))
    for (const recipe of device.recipes) {
      for (const param of params(recipe)) {
        if (param.hint === undefined) continue
        expect(hints.has(param.hint), `${recipe.id} / ${param.name}`).toBe(true)
      }
      for (const entry of recipe.articulation ?? []) {
        if (entry.hint === undefined) continue
        expect(hints.has(entry.hint), `${recipe.id} / ${entry.slot}`).toBe(true)
      }
    }
  })

  it('resolves on its own against every direction, uncapped and with something placed', () => {
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

  it('spends no more than its eight tracks, whatever a direction asks for', () => {
    for (const template of TEMPLATES) {
      const result = resolve({
        devices: [device],
        template,
        mood: NEUTRAL_MOOD,
        seed: 3,
      })
      const used = new Set(result.assignments.flatMap((a) => a.assignables.map((v) => v.voiceId)))
      expect(used.size, template.id).toBeLessThanOrEqual(8)
    }
  })
})

/**
 * §2.1. **Which note plays a loaded sample as it is**, on a box where every one of the eight
 * tracks is a sample track.
 *
 * The claim is assembled from three pages rather than lifted from one, because this manual never
 * prints the Mini's *"plays a sample at its original pitch"*. That makes the citation the thing
 * most likely to rot, so it is asserted page by page below.
 */
describe('trigger notes (§2.1)', () => {
  const pool = device.voices.find((v) => v.id === 'track')
  const note = pool?.triggerNote

  it('gives the one track pool the note the manual sets a percussion fill to', () => {
    // p.86, step 11 of the percussion walkthrough: "Set to C5, the root note for the sample",
    // and the pattern printed below it comes out C5 on all eight steps.
    expect(note?.note).toBe('C5')
    // On the pool and not on a recipe: every track here plays a sample, because there is no
    // synth engine on this box at all (p.98).
    expect(device.voices.map((v) => v.id)).toEqual(['track'])
  })

  it("numbers that note by this box's own octave mapping, not by scientific pitch notation", () => {
    // Config > MIDI > Middle C is a setting (p.251, options C-3/C-4/C-5/C-6). p.253 shows the
    // ordinary configuration reading C-5, and p.254 adjusts it "from C-5 to C-3 to match Ableton
    // Live" — Live being a host whose middle C is C3. So C5 here is middle C: 60, not SPN's 72.
    expect(note?.midi).toBe(60)
  })

  it('cites the octave mapping as well as the pages the note name comes from', () => {
    // CLAUDE.md's hazard about a cited range being the wrong range, wearing note names: p.86
    // prints `C5` and no number at all, so a citation naming p.86 alone would not support the
    // `midi` beside it.
    const source = note?.verified.source as string
    expect(source.startsWith(MANUAL)).toBe(true)
    for (const page of ['p.74', 'p.86', 'p.122', 'p.253', 'p.254']) {
      expect(source, page).toContain(page)
    }
    expect(source).toContain('Middle C')
    // p.77's "default note i.e. C0" is what the [Note] button writes into an empty step, and
    // p.49's Pads Root Note (default C3) is where the pad grid starts. Neither is this fact, and
    // a citation reaching for either would be pointing at the wrong page.
    expect(source).not.toContain('C0')
    expect(source).not.toContain('C3,')
  })

  it('authors no recipe-level note, so a slice address cannot wear a trigger note\'s name', () => {
    // §4.1's third category, unmodelled on purpose (see the device's TRIGGER_NOTE_CITE comment).
    // The moment a recipe here claims one, somebody has either designed the missing vocabulary or
    // reintroduced the confusion between "play it as recorded" and "play piece number four".
    const claiming = device.recipes.filter(
      (r) => (r as Recipe & { triggerNote?: unknown }).triggerNote !== undefined,
    )
    expect(claiming.map((r) => r.id)).toEqual([])
  })

  /**
   * §4.1's third category, held closed.
   *
   * Under Beat Slice this manual gives slice selection to the `S` step FX — p.164, *"plays a
   * selected slice on the triggered step"* — and prints an ordinary note beside it without
   * saying what that note does. That meaning is unstated, so no slice address is authored on
   * either slice recipe, and what keeps the silence from reaching a reader is a separate fact:
   * the one direction reaching `tr-vox-chop-dirty` hooks the role, and #100 gives a hooked part's
   * notes to its hook.
   *
   * **If this fails, nobody has broken it by accident.** A direction now asks for the beat-sliced
   * patch without a hook, and the answer is to settle what a step note does under Beat Slice —
   * from the box, since p.164 does not say — rather than to widen this test.
   */
  it('never prints its beat-sliced patch a note, across every direction and seed', () => {
    let seen = 0
    for (const template of TEMPLATES) {
      for (let seed = 0; seed < 16; seed++) {
        const result = resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed })
        for (const a of result.assignments) {
          if (a.recipe.id !== 'tr-vox-chop-dirty') continue
          seen += 1
          expect(noteInstruction(a).kind, `${template.id} seed ${String(seed)}`).toBe('none')
        }
      }
    }
    // The guard is only worth anything if the recipe is actually reached. It is, by
    // `major-key-electro`, which hooks `vox-chop`.
    expect(seen).toBeGreaterThan(0)
  })
})

/**
 * §2.1. **The measurement this change is for**, taken rather than asserted from memory.
 *
 * Every direction against this box alone, seeds 1-6. A part that draws a grid is one the guide
 * used to tell which steps to hit and never what to put on them; the question this pins is
 * whether all of them now get a note and none of them gets a blank.
 *
 * **The counts are a measurement, not a target.** They move when a direction gains or loses a
 * part, and a diff here is a prompt to re-read the numbers rather than a failure. What must not
 * move is the *relationship*: `blank` stays 0.
 */
describe('every track grid part gets its note (§2.1)', () => {
  const SEEDS = [1, 2, 3, 4, 5, 6]

  /** Every part this box takes, split by what phase 5 actually draws for it. */
  function sweep() {
    const grid: { where: string; role: Role; kind: string; note?: string; midi?: number }[] = []
    const hooked: string[] = []
    const sustained: string[] = []
    const noPattern: string[] = []
    for (const template of TEMPLATES) {
      for (const seed of SEEDS) {
        const result = resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed })
        for (const a of result.assignments) {
          const where = `${template.id}/${a.role}`
          if (a.hookAuthority !== undefined) hooked.push(where)
          else if (isSustainedPart(a)) sustained.push(where)
          else if (!a.patterns.some((p) => p.selection.outcome !== 'none')) noPattern.push(where)
          else {
            const n = noteInstruction(a)
            grid.push({
              where: `${where}/seed ${String(seed)}`,
              role: a.role,
              kind: n.kind,
              ...(n.kind === 'none' ? {} : { note: n.note, midi: n.midi }),
            })
          }
        }
      }
    }
    return { grid, hooked, sustained, noPattern }
  }

  it('leaves no grid part without a note, and pins how many there are', () => {
    const { grid } = sweep()

    // The population, as measured on this library. 258 until #345 authored the five roles the
    // pool declared and no recipe served — the count *fell*, because four of the five are pitched
    // and a pitched part is hooked (#100) rather than drawn as a grid.
    expect(grid.length).toBe(246)

    // The claim. Zero blanks, and the blank arm named so a regression cannot hide as a count.
    expect(grid.filter((g) => g.kind === 'none')).toEqual([])
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['pitch', 'trigger'])
  })

  it('prints the pool note wherever the direction has not asked for a pitch of its own', () => {
    // §4.1's precedence, on the one box that exercises both arms. A `sub` is the case that
    // settles it: the direction wants the tonic, the track answers to pitch (p.122), and saying
    // `C5` there would tell a reader to play a sub at the sample's recorded pitch.
    const grid = sweep().grid
    const pitched = grid.filter((g) => g.kind === 'pitch')
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
    expect(pitched.length).toBe(24)

    const triggered = grid.filter((g) => g.kind === 'trigger')
    expect(triggered.length).toBe(222)
    expect([...new Set(triggered.map((g) => `${g.note as string}/${String(g.midi)}`))]).toEqual([
      'C5/60',
    ])
  })

  /**
   * §8. **The acceptance criterion is reader-facing**, so it is checked on the page rather than
   * only on the resolver: a `ResolvedAssignment` carrying a note proves nothing to somebody
   * standing at the box.
   *
   * Searched across the real directions rather than pinned to one, because which recipe a
   * direction takes is the resolver's business (§7) and pinning it would make this fail on an
   * unrelated objective change instead of on the thing it is about. The assertion is on the
   * kick's *own* section of the markdown, not on the whole document, or a note printed under some
   * other part would satisfy it.
   */
  it('prints the note under a percussion part, bare, on the rendered page', () => {
    const guides = TEMPLATES.flatMap((template) =>
      [1, 7].map((seed) => resolve({ devices: [device], template, mood: NEUTRAL_MOOD, seed })),
    ).filter((result) =>
      result.assignments.some(
        (a) => a.role === 'kick' && a.hookAuthority === undefined && noteInstruction(a).kind !== 'none',
      ),
    )
    expect(guides.length, 'no direction places a kick on this box alone').toBeGreaterThan(0)

    for (const result of guides) {
      // The kick's own section: from its heading to the next one.
      const lines = renderGuide(result).split('\n')
      const start = lines.findIndex((l) => l.startsWith('### `kick` — Tracker'))
      expect(start, result.template.id).toBeGreaterThanOrEqual(0)
      const rest = lines.slice(start + 1)
      const end = rest.findIndex((l) => l.startsWith('### '))
      const section = (end === -1 ? rest : rest.slice(0, end)).join('\n')

      expect(section, result.template.id).toContain('**Trigger note** — `C5` · MIDI 60')
      // The pages behind it are in the manifest. Nothing hangs under the note here.
      expect(section, result.template.id).not.toContain('↳ cite:')
      expect(section, result.template.id).not.toContain(`${MANUAL}74`)
    }
  })

  it('reaches the percussion the direction library actually asks this box for', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's, and what this change is for is the drum tracks.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'trigger') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 42],
      ['kick', 42],
      ['ghost-perc', 30],
      ['clap', 18],
      ['rim', 18],
      ['snare', 18],
      ['metallic', 12],
      ['open-hat', 12],
      ['arp', 6],
      ['impact', 6],
      ['ride', 6],
      ['tom', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole in this change, and each says which rule answered it: #100 gives a
    // hooked part's notes to its hook, and §6.3 leaves a part with no variant anywhere nothing to
    // program. Asserted rather than assumed — this box produces no sustained part at all here.
    const { hooked, sustained, noPattern } = sweep()
    // 78 until #345: four of its five roles are pitched, so they hook rather than draw a grid.
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
  })
})
