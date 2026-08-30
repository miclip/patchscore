import { describe, expect, it } from 'vitest'
import { DeviceSchema, expand, type AuthoredParam } from '../lib/core/index'
import {
  ARTICULABLE_PER_STEP,
  MACHINE_PAGES,
  device,
} from '../lib/devices/elektron-analog-rytm-mkii/index'
import { ANALOG_RYTM_MKII_PANEL_SPAN_MM } from '../lib/devices/elektron-analog-rytm-mkii/panel'

/**
 * The Analog Rytm MKII is the third Elektron box in the library and the first one whose *voice*
 * count and *track* count disagree. Most of what the two Digi manifests established about how
 * Elektron documents a parameter is inherited rather than retested here.
 *
 * This file is about the four claims that are this box's own, each of which would be silently
 * wrong rather than loudly wrong if it drifted:
 *
 *  1. the MACHINE is carried on every recipe, and only ever a machine that track can load;
 *  2. twelve tracks over eight voice circuits, modelled as twelve and crowded at eight;
 *  3. no numeric range is authored that the manual does not print;
 *  4. the panel's aspect check, which is what picks 385 x 225 out of a three-number spec line.
 */
describe('Analog Rytm MKII manifest', () => {
  it('is schema-valid', () => {
    expect(() => DeviceSchema.parse(device)).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // 1. The MACHINE, which is what makes every SRC value legible (pp.96-108)
  // -------------------------------------------------------------------------

  function machineOf(params: AuthoredParam[]): AuthoredParam & { kind: 'enum' } {
    const found = params.find((p) => p.name === 'MACHINE')
    expect(found, 'every recipe carries its MACHINE').toBeDefined()
    expect(found?.kind).toBe('enum')
    return found as AuthoredParam & { kind: 'enum' }
  }

  it('opens every recipe with the MACHINE, because the SRC page is thirty-four control surfaces', () => {
    // p.77: "each page contains the same parameters on all drum tracks. The exception is the SRC
    // page, where parameters will vary depending on the active MACHINE." So an SRC value without
    // the machine beside it is a number whose scale is unknown — which is the trap `CLAUDE.md`
    // records for the TR-8S and the minilogue xd, arriving here on thirty-four surfaces at once.
    for (const recipe of device.recipes) {
      expect(recipe.params[0]?.name, recipe.id).toBe('MACHINE')
    }
  })

  it('never puts a machine on a track the manual keeps it off', () => {
    // The sharpest case is p.101's "can **only** be used on the RS and CP tracks", which is the
    // one sentence in Appendix D that restricts rather than permits. If the four-track lists were
    // ever flattened into one, `CP CLASSIC` would become loadable on BD and this would catch it.
    for (const recipe of device.recipes) {
      const machine = machineOf(recipe.params)
      expect(machine.options.values, `${recipe.id} on ${recipe.voice}`).toContain(machine.value)
      // The option set is a legality claim and carries a page; the selection is taste (§3.2).
      expect(machine.options.verified, recipe.id).not.toBe(false)
      expect(machine.verified ?? false, recipe.id).toBe(false)
    }

    const bd = machineOf(device.recipes.find((r) => r.voice === 'bd')!.params)
    const cp = machineOf(device.recipes.find((r) => r.voice === 'cp')!.params)
    expect(bd.options.values).not.toContain('CP CLASSIC')
    expect(cp.options.values).toContain('CP CLASSIC')
    // And the toms, which p.105 gives one machine each in two separate singular sentences.
    const lt = machineOf(device.recipes.find((r) => r.voice === 'lt')!.params)
    expect(lt.options.values).toEqual(['DISABLE', 'UT NOISE', 'UT IMPULSE', 'XT CLASSIC'])
  })

  // -------------------------------------------------------------------------
  // 1b. The MACHINE citation covers the whole option list, not just the sentence
  // -------------------------------------------------------------------------

  /** `'..., pp.96-101, p.105'` -> `[96, 97, 98, 99, 100, 101, 105]`. */
  function pagesNamedBy(source: string): number[] {
    const out: number[] = []
    for (const part of source.split(',').map((t) => t.trim())) {
      const range = /^pp\.(\d+)-(\d+)$/.exec(part)
      if (range !== null) {
        for (let n = Number(range[1]); n <= Number(range[2]); n++) out.push(n)
        continue
      }
      const one = /^p\.(\d+)$/.exec(part)
      if (one !== null) out.push(Number(one[1]))
    }
    return out
  }

  it('composes each MACHINE citation from every family that contributes to the list', () => {
    // A track's option set is assembled out of two to four of Appendix D's families, so the
    // governing sentence alone does not support it. The BD list is twenty machines printed across
    // pp.96-101 and 103-104; citing p.97 would send a reader checking `SD ACOUSTIC` to a page it
    // is not on. These are the unions, written out so a family gained or lost is loud.
    expect(MACHINE_PAGES).toEqual({
      // p.96 ALL, pp.97-99 bass drums, p.97 + pp.99-101 snares, pp.103-104 synths.
      bd: [96, 97, 98, 99, 100, 101, 103, 104],
      sd: [96, 97, 98, 99, 100, 101, 103, 104],
      // ...plus pp.101-102, the rimshots and the hand clap that only these two tracks take.
      rs: [96, 97, 98, 99, 100, 101, 102, 103, 104],
      cp: [96, 97, 98, 99, 100, 101, 102, 103, 104],
      bt: [96, 105],
      lt: [96, 105],
      mt: [96, 105],
      ht: [96, 105],
      ch: [96, 106, 107],
      oh: [96, 106, 107],
      cy: [96, 108, 109],
      cb: [96, 108, 109],
    })
  })

  it('names every one of those pages in the citation a reader actually sees', () => {
    // The set is the claim; the string is what reaches the device page, and a formatter that
    // collapsed a run wrongly would silently drop pages out of the middle of it.
    const seen = new Map<string, string>()
    for (const recipe of device.recipes) {
      const verified = machineOf(recipe.params).options.verified
      expect(verified, recipe.id).not.toBe(false)
      seen.set(recipe.voice, (verified as { source: string }).source)
    }
    expect(seen.size).toBeGreaterThan(0)
    for (const [track, source] of seen) {
      const expected = MACHINE_PAGES[track as keyof typeof MACHINE_PAGES]
      expect(pagesNamedBy(source), `${track}: ${source}`).toEqual([...expected])
    }
  })

  it('reaches the page each machine name is printed on, not only its permission sentence', () => {
    // Three machines printed away from the sentence that permits them. Each was loadable on the
    // track below before the page sets were composed, and each was cited to a page it is not on.
    const cases: [string, string, number][] = [
      ['bd', 'SD ACOUSTIC', 101], // permitted by p.97's sentence, printed on p.101
      ['rs', 'SY RAW', 104], //      permitted by p.103's sentence, printed on p.104
      ['cb', 'CB METALLIC', 109], // permitted by p.108's sentence, printed on p.109
    ]
    for (const [track, value, page] of cases) {
      const recipe = device.recipes.find((r) => r.voice === track)
      expect(recipe, track).toBeDefined()
      const machine = machineOf(recipe!.params)
      expect(machine.options.values, `${track} can load ${value}`).toContain(value)
      const source = (machine.options.verified as { source: string }).source
      expect(pagesNamedBy(source), `${track} cites p.${page} for ${value}`).toContain(page)
    }
  })

  // -------------------------------------------------------------------------
  // 1c. Titles promise only what the recipe authors (§3.1, "actual values only")
  // -------------------------------------------------------------------------

  it('never promises in a title a control the recipe does not carry', () => {
    // A title is prose a reader sees above the settings, so a title naming a knob that is not in
    // the settings sends them looking for a value the guide does not print. These words all name
    // SRC parameters this manual gives no range for — SNP, SWT/SWD, NOD/NOL, DET, COL, C1-C3, BAL,
    // OVR, RES, FRQ — so none of them can ever be authored here and none may be described.
    const forbidden = [
      'snap', 'sweep', 'swept', 'noise decay', 'detune', 'detuned', 'colour', 'color',
      'component', 'balanced', 'overdrive', 'overdriven', 'resonance', 'cutoff', 'tick',
    ]
    for (const recipe of device.recipes) {
      const title = recipe.title.toLowerCase()
      for (const word of forbidden) {
        expect(title, `${recipe.id}: "${recipe.title}"`).not.toContain(word)
      }
    }
  })

  it('states settings as values, never as a direction or a comparison', () => {
    // "Actual values only" reaches the prose above the settings, not just the settings. "hold
    // short", "held long", "panned left", "pulled off the grid", "nudged ahead", "held open" all
    // describe a control the recipe *does* carry, and describe it in a way a reader cannot check
    // and cannot dial. Either the value goes in the title or the phrase comes out.
    //
    // This list is comparatives and directions, not verbs: "through the bandpass" names an
    // authored enum value and stays, and "on the low tom" is a track name rather than a setting.
    //
    // Matched on word boundaries rather than as substrings, because `downbeat` is a PatternSlot
    // and `down` is a direction — the first version of this test rejected every title carrying a
    // slot name, which is the one thing a title most needs to say.
    const relative = [
      'short', 'long', 'longer', 'shorter', 'quiet', 'quieter', 'loud', 'louder',
      'open', 'opened', 'closed', 'wide', 'wider', 'narrow', 'deep', 'deeper',
      'harder', 'softer', 'brighter', 'darker', 'flat', 'ringing',
      'panned', 'pulled', 'nudged', 'dragged', 'thinned', 'chopped', 'up', 'down',
    ]
    const phrases = ['let ring', 'left alone', 'behind the grid', 'ahead of', 'a hair', 'half the']
    for (const recipe of device.recipes) {
      const title = recipe.title.toLowerCase()
      for (const word of relative) {
        const found = new RegExp(`\\b${word}\\b`).test(title)
        expect(found, `${recipe.id}: "${recipe.title}" says "${word}"`).toBe(false)
      }
      for (const phrase of phrases) {
        expect(title, `${recipe.id}: "${recipe.title}"`).not.toContain(phrase)
      }
    }
  })

  it('keeps mood-bearing values out of titles, because the resolver moves them', () => {
    // The reason the phrases above are *omitted* rather than replaced with numbers. HLD, PAN, TUN
    // and FMA declare mood offsets, and `moodContribution` moves them before they are rendered:
    // `rytm-kick-hard` prints HLD 12 at neutral density and HLD 1 at density 100. A title
    // asserting "HLD 12" would be false in the second guide and would contradict the settings
    // list a few lines under it. Articulation is safe by contrast — mood applies to
    // `AuthoredNumericParam` only, and `bindArticulation` passes `set` through untouched — which
    // is why velocity, probability and micro-timing figures are the ones the titles do state.
    for (const recipe of device.recipes) {
      const moving = recipe.params.filter((p) => p.kind === 'numeric' && (p.mood?.length ?? 0) > 0)
      for (const param of moving) {
        expect(recipe.title, `${recipe.id} names the mood-moved ${param.name}`).not.toContain(
          `${param.name} `,
        )
        // ...and does not state its value loose in the prose either.
        const digits = recipe.title.match(/-?\d+/g) ?? []
        expect(digits, `${recipe.id} states ${param.name}'s value`).not.toContain(
          String(param.value),
        )
      }
    }
  })

  it('backs every number in a title with an authored value', () => {
    // "velocity 122", "probability 55", "trigs 1/4" are checkable claims; "the tail cut short" was
    // not, which is why none of them survives. `1/32` and `2-pole` are read as authored values
    // too, because that is exactly what they are.
    for (const recipe of device.recipes) {
      const authored = new Set<string>()
      for (const param of recipe.params) {
        authored.add(String(param.value).toLowerCase())
        if (param.kind === 'numeric') {
          authored.add(String(param.range.min))
          authored.add(String(param.range.max))
        }
      }
      for (const entry of recipe.articulation ?? []) {
        for (const value of Object.values(entry.set)) authored.add(String(value).toLowerCase())
      }
      const numbers = recipe.title.match(/\d+(?:\/\d+)?/g) ?? []
      for (const found of numbers) {
        const ok =
          authored.has(found) ||
          authored.has(`-${found}`) ||
          [...authored].some((v) => v.includes(found))
        expect(ok, `${recipe.id}: "${found}" in "${recipe.title}" is not an authored value`).toBe(
          true,
        )
      }
    }
  })

  // -------------------------------------------------------------------------
  // 2. Twelve tracks, eight voice circuits (p.13, p.21, p.66)
  // -------------------------------------------------------------------------

  it('models twelve tracks and carries the eight voice circuits as crowding, not as capacity', () => {
    expect(device.voices).toHaveLength(12)
    expect(device.voices.map((v) => v.id)).toEqual([
      'bd', 'sd', 'rs', 'cp', 'bt', 'lt', 'mt', 'ht', 'ch', 'oh', 'cy', 'cb',
    ])
    for (const voice of device.voices) expect(voice.polyphony, voice.id).toBe(1)
    // Twelve assignables, because eight would mean this box could never be asked for a closed hat
    // *and* an open hat — a gap reported where there is none. The manifest sets out both readings.
    expect(expand(device)).toHaveLength(12)
    // p.21's eight, arriving where a soft limit belongs rather than as a claimed capacity.
    expect(device.comfortableVoices).toBe(8)
    // ...and not cited, because "eight voice circuits" is not "eight parts is crowded" (§12.4).
    expect(Object.keys(device.capabilityEvidence ?? {})).not.toContain('comfortableVoices')
  })

  it('gives the coupled pairs one TRACK OUT jack each, which is why eight outs serve twelve tracks', () => {
    // p.76 counts "8 x 1/4" impedance balanced individual track output jacks" and p.12's artwork
    // labels them BD, SD, RS/CP, BT, LT, MT/HT, CH/OH, CY/CB — one per *circuit*, not per track.
    const trackOuts = device.jacks?.filter((j) => j.id.startsWith('TRACK OUT')) ?? []
    expect(trackOuts).toHaveLength(8)
    expect(device.io.individualOuts).toBe(8)
    expect(trackOuts.filter((j) => j.id.includes('/'))).toHaveLength(4)
  })

  it('keeps articulation inside the subset a slot-wide scalar can carry', () => {
    // Seven of the fourteen documented per-step lanes are declared and unreachable — parameter
    // locks, sound locks, conditions, fill, trig mute, swing and parameter slide. See the module
    // JSDoc for why each one is outside §4.3.
    const declared = new Set(device.features?.perStep ?? [])
    for (const key of ARTICULABLE_PER_STEP) expect(declared, key).toContain(key)
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(ARTICULABLE_PER_STEP as readonly string[], `${recipe.id}/${key}`).toContain(key)
        }
      }
    }
  })

  // -------------------------------------------------------------------------
  // 3. No invented ranges (§3.1)
  // -------------------------------------------------------------------------

  it('authors no numeric whose range this manual does not print', () => {
    // Appendix D prints exactly two numeric ranges across thirty-four machines — SD FM's FMA and
    // SY RAW's LEV — and Appendix A six more. Twenty-two other machines also have a `LEV`, and
    // reading SY RAW's onto them is the invention this asserts against. Every range here is cited,
    // so a numeric added without a page fails rather than looking like the rest.
    const numerics = device.recipes.flatMap((r) => r.params.filter((p) => p.kind === 'numeric'))
    expect(numerics.length).toBeGreaterThan(0)
    for (const param of numerics) {
      expect(param.range.verified, `${param.name} range`).not.toBe(false)
      expect(param.range.verified, `${param.name} range`).toBeDefined()
    }
    // FMA is the one Appendix D range, and it is the only knob on this box that can carry `grit`:
    // `OVR` would do it for every recipe and p.79 gives it no scale.
    const fma = numerics.find((p) => p.name === 'FMA')
    expect(fma?.range).toMatchObject({ min: 0, max: 127 })
    expect(fma?.mood).toEqual([{ axis: 'grit', amount: 24 }])
  })

  // -------------------------------------------------------------------------
  // 4. The panel's aspect check (§2.3, §10)
  // -------------------------------------------------------------------------

  it('picks 385 x 225 out of the spec line by aspect, and would reject the height', () => {
    // p.76: "W385 × D225 × H82 mm ... including knobs, jacks, and feet". The panel drawing on p.10
    // measures 1074 x 625 px, and only one of the three readings is close.
    const drawn = 1074 / 625
    expect(ANALOG_RYTM_MKII_PANEL_SPAN_MM).toBe(device.physical.panelSpanMm)
    const rise = device.panel?.panelRiseMm
    expect(rise).toBe(225)
    expect(Math.abs(ANALOG_RYTM_MKII_PANEL_SPAN_MM / rise! / drawn - 1)).toBeLessThan(0.01)
    // The reading a careless eye takes, kept here so the check is a comparison rather than a claim.
    expect(Math.abs(ANALOG_RYTM_MKII_PANEL_SPAN_MM / 82 / drawn - 1)).toBeGreaterThan(1)
  })

  it('puts the voice field on the twelve pads rather than the sixteen [TRIG] keys', () => {
    // Both carry the track names. Sixteen cells over twelve tracks would leave four meaning
    // nothing, and the four are steps 13-16 — the rest of the bar, not spare capacity.
    const fields = device.panel?.features.filter((f) => f.kind === 'voices') ?? []
    expect(fields).toHaveLength(1)
    const field = fields[0] as { w: number; h: number }
    // Three rows of four, so it is taller than the Digitone II's single row of sixteen.
    expect(field.h / field.w).toBeGreaterThan(0.5)
  })
})
