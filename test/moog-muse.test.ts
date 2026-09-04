import { describe, expect, it } from 'vitest'
import { device } from '../lib/devices/moog-muse/index'
import { moodState, resolve } from '../lib/core/index'
import type { AuthoredNumericParam, AuthoredParam, ResolvedParam } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'

/**
 * #325, then #324, then #349. One control's scale, argued three times, and each round left
 * something in this file.
 *
 * **#325: on eight of the 41 controls a blanket claim was false.** PDF p.38 draws both ENVELOPE
 * banks with their four faders crossed by five horizontal lines, and printed p.19 maps a line to a
 * value — *"all set to around 25% (or the second line from the bottom)"*. Those eight go through
 * `fader`; the rest go through `cc`.
 *
 * **#324: the sentence that carried the claim moved off the parameter line** and onto the device's
 * `controlPositions`, where it is rendered once — see `test/control-positions.test.ts`.
 *
 * **#349: the scale under all of it was wrong.** The manifest was authored on Appendix A's
 * `0-127` because the manual prints no other number for these controls. The instrument prints one:
 * a value on the screen as the control is turned, in percent for 37 of the 41 and in Hz for the two
 * filter cutoffs. Those 39 are now authored on the scale the reader can see, cited `observed`; the
 * two `DELAY · TIME` knobs stay on the CC scale because under `CLOCK SYNC` they show divisions,
 * which is #346 rather than this.
 *
 * What this file pins is the shape of that outcome: which controls are on which scale, that the
 * counts are what the reading found, and that nothing here asserts a CC *value* any more.
 */

/** The claim that was false on a fader and now lives on the device. It must appear on neither. */
const NO_PRINTED_POSITION = 'no page maps its position to a CC value'

/** The eight faders and the CC each is addressed on — FILTER ENV 79-82, VCA ENV 86-89 (p.122). */
const FADERS: Readonly<Record<string, number>> = {
  'FILTER ENV · ATTACK': 79,
  'FILTER ENV · DECAY': 80,
  'FILTER ENV · SUSTAIN': 81,
  'FILTER ENV · RELEASE': 82,
  'VCA ENV · ATTACK': 86,
  'VCA ENV · DECAY': 87,
  'VCA ENV · SUSTAIN': 88,
  'VCA ENV · RELEASE': 89,
}

/** #349. The one observation this manifest rests on, and the first `observed` cite in the library. */
const OBSERVED = { kind: 'observed', source: 'Muse, firmware 1.4.0' }

function isNumeric(param: AuthoredParam): param is AuthoredNumericParam {
  return param.kind === 'numeric'
}

function rangeSource(param: AuthoredNumericParam): string {
  const verified = param.range.verified
  return verified === undefined || verified === false ? '' : verified.source
}

/** Every instance across all 18 recipes, not one sample: a recipe could always be the odd one. */
const numerics = device.recipes.flatMap((recipe) => recipe.params).filter(isNumeric)
/**
 * Selected on the **citation**, not on the unit. Four of p.29's `FM MIN/MAX AMT` settings are
 * printed `(0-100)` in the manual and carry `%` honestly, and they are not what #349 re-scaled —
 * matching on `unit` would sweep them in and make the count say something else.
 */
const observedParams = numerics.filter((param) => rangeSource(param) === OBSERVED.source)
const percentParams = observedParams.filter((param) => param.unit === '%')
const hzCutoffs = observedParams.filter((param) => param.unit === 'Hz')
const appendixA = numerics.filter((param) => rangeSource(param).includes('Appendix A'))
const faderParams = percentParams.filter((param) => param.name in FADERS)
/** The other 29. Not *the rotary controls*: several are the MIXER and WAVE MIX sliders. */
const knobParams = percentParams.filter((param) => !(param.name in FADERS))

const distinct = (params: readonly AuthoredNumericParam[]) =>
  [...new Set(params.map((param) => param.name))].sort()

describe('the Muse is authored on the scales its screen shows (#349)', () => {
  it('splits the 41 CC-numbered controls 37 / 2 / 2, which is what the reading found', () => {
    // The three families, counted by distinct control rather than by instance. 37 percent, the
    // two filter cutoffs in Hz, and the two DELAY TIME knobs left on the CC scale for #346.
    expect(distinct(percentParams)).toHaveLength(37)
    expect(distinct(hzCutoffs)).toEqual(['FILTER 1 · CUTOFF', 'FILTER 2 · CUTOFF'])
    expect(distinct(appendixA)).toEqual(['DELAY · TIME - L', 'DELAY · TIME - R'])
    // And they are disjoint and exhaustive over the controls that carry a CC number.
    const withCc = numerics.filter((param) => param.midiCc !== undefined)
    expect(distinct(withCc)).toHaveLength(37 + 2 + 2)
  })

  it('cites the observation, with the firmware in the source string', () => {
    for (const param of [...percentParams, ...hzCutoffs]) {
      expect(param.range.verified, param.name).toEqual(OBSERVED)
      // §3.1's split holds either way round: the range is a claim somebody checked, the point is
      // taste. Re-scaling changed which claim the range makes and nothing about the point.
      expect(param.verified, param.name).toBe(false)
    }
  })

  it('gives every percent control the same range and the unit the screen shows', () => {
    for (const param of percentParams) {
      expect(param.range.min, param.name).toBe(0)
      expect(param.range.max, param.name).toBe(100)
      expect(param.unit, param.name).toBe('%')
      // A point outside its own range would be an authoring slip the renderer would print.
      expect(param.value, param.name).toBeGreaterThanOrEqual(0)
      expect(param.value, param.name).toBeLessThanOrEqual(100)
    }
  })

  it('gives both cutoffs the full audio range in Hz, and a value inside it', () => {
    for (const param of hzCutoffs) {
      expect(param.range.min, param.name).toBe(20)
      expect(param.range.max, param.name).toBe(20000)
      expect(param.unit, param.name).toBe('Hz')
      expect(param.value, param.name).toBeGreaterThan(20)
      expect(param.value, param.name).toBeLessThan(20000)
    }
  })

  it('honours the positions the manual does anchor, in the manual’s own numbers', () => {
    // p.42: PAN is bipolar and centred at noon, which on a 0-100 readout is 50. Every recipe
    // centres it, so this is a stated position rather than taste — and the one place a percent
    // value here has a right answer.
    const pans = percentParams.filter((param) => param.name === 'VCA · PAN')
    expect(pans.length).toBeGreaterThan(0)
    for (const param of pans) expect(param.value).toBe(50)
    // The same reading on the other bipolar control, where it changes the sound rather than the
    // image: a recipe that wants no filter envelope sets ENVELOPE AMOUNT to noon. `0` there is
    // not *off*, it is fully inverted — which is what a unipolar assumption produces, and what
    // three of these recipes carried before #349's authoring pass.
    for (const id of ['muse-sub-dark', 'muse-sub-clean', 'muse-bass-mid-dark']) {
      const amounts = device.recipes
        .find((recipe) => recipe.id === id)
        ?.params.filter(isNumeric)
        .filter((param) => param.name.endsWith('ENVELOPE AMOUNT'))
      expect(amounts, id).toHaveLength(2)
      for (const param of amounts ?? []) expect(param.value, `${id} ${param.name}`).toBe(50)
    }
    // p.36: "setting RESONANCE fully clockwise allows you to use either filter as a sine wave
    // oscillator". `muse-sub-clean` is the recipe that does it, so its RESONANCE is the maximum
    // the screen shows rather than a number standing in for one.
    const selfOscillating = device.recipes
      .find((recipe) => recipe.id === 'muse-sub-clean')
      ?.params.filter(isNumeric)
      .find((param) => param.name === 'FILTER 1 · RESONANCE')
    expect(selfOscillating?.value).toBe(100)
  })

  /**
   * **A legibility rule, and only that.** §8's reader is at the machine with their hands on a knob
   * and their eyes on the screen: *set it to 75* survives that, and `74` is a number they chase
   * past and settle near. So every percent point is a multiple of five.
   *
   * **It is not evidence about where the values came from**, and an earlier version of this test
   * claimed it was — that a conversion could not land on the grid. A conversion rounded onto the
   * grid lands on it perfectly, so the claim was false and the test would have passed on exactly
   * the thing it said it caught. What rules conversion out is that each point was chosen from the
   * recipe's title and the control's note; that is a property of the authoring and no assertion
   * can stand in for it. The tests that come closest are the anchors above, where a musical reading
   * and an arithmetic one give different answers and the manual says which is right.
   */
  it('puts every percent point on a five-step grid, so a reader can land on it', () => {
    const offGrid = percentParams.filter((param) => param.value % 5 !== 0)
    expect(offGrid.map((param) => `${param.name}=${param.value}`)).toEqual([])
    // Not vacuous: the grid is used across its width rather than being three round numbers.
    expect(new Set(percentParams.map((param) => param.value)).size).toBeGreaterThan(12)
  })

  /**
   * §3/#101-shaped, and the clearest place the semantic pass is visible. `TRI/SAW` and `WAVE MIX`
   * are two different blends — triangle against sawtooth, then that pair against the pulse — and
   * a recipe's title names which end of each it wants. They do not move together, and nothing but
   * reading the note tells you so.
   */
  it('puts the oscillator blends where each recipe’s title says they are', () => {
    const blend = (id: string, name: string) =>
      device.recipes
        .find((r) => r.id === id)
        ?.params.filter(isNumeric)
        .find((p) => p.name === name)?.value

    // "Two triangles": the triangle end, and no pulse in the mix at all.
    expect(blend('muse-pad-soft', 'OSC 1 · TRI/SAW')).toBe(0)
    expect(blend('muse-pad-soft', 'OSC 1 · WAVE MIX')).toBe(0)
    // "Sawtooth pair": the other end of the same blend, and still no pulse.
    expect(blend('muse-pad-bright', 'OSC 1 · TRI/SAW')).toBe(100)
    expect(blend('muse-pad-bright', 'OSC 1 · WAVE MIX')).toBe(0)
    // "Mono square": the pulse, fully mixed in, at p.19's noon where a square is.
    expect(blend('muse-lead-hard', 'OSC 1 · WAVE MIX')).toBe(100)
    expect(blend('muse-lead-hard', 'OSC 1 · PULSE WIDTH')).toBe(50)
  })

  it('leaves the two DELAY TIME knobs on the CC scale, visibly rather than relabelled', () => {
    for (const param of appendixA) {
      expect(param.range.min).toBe(0)
      expect(param.range.max).toBe(127)
      expect(rangeSource(param)).toContain('Appendix A (MIDI CC), p.122')
      // No unit, because nobody has read what these show. A `%` here would be the relabelling
      // #349 refused: a number on the wrong scale wearing a right-looking one.
      expect(param.unit).toBeUndefined()
    }
  })
})

describe('Muse envelope faders carry no false negative claim (#325)', () => {
  it('covers all eight faders and the other 29 controls, so neither side is vacuous', () => {
    expect(distinct(faderParams)).toEqual(Object.keys(FADERS).sort())
    expect(distinct(knobParams)).toHaveLength(29)
  })

  it('authors the fader’s CC number and no prose at all', () => {
    for (const param of faderParams) {
      expect(param.note).toBeUndefined()
      // #324. The number is authored; `resolveParam` writes the sentence. Since #349 that
      // sentence names the controller and no value, but the field is what identifies the row.
      expect(param.midiCc).toBe(FADERS[param.name])
    }
  })

  it('is still the eight ENVELOPE faders and nothing else, with the notice gone (#349)', () => {
    // This used to check that the device-level notice named these eight as its exception. The
    // notice went at #349 — see `test/control-positions.test.ts` — so what is left to hold is the
    // group itself: `fader` and `cc` build the same parameter, and only this file says which
    // controls are in which. p.19's reading now lives in `fader`'s doc comment.
    expect(device.controlPositions).toBeUndefined()
    expect(distinct(faderParams).every((name) => name.includes('ENV'))).toBe(true)
    expect(distinct(faderParams)).toHaveLength(8)
  })

  it('puts the faders in p.19’s own unit, which is what #349 finally agreed with', () => {
    // The reason this group existed was that p.19 prints a percentage for these eight and the
    // manifest was authored on 0-127, so the two could not be stated together. Both are percent
    // now, and *nothing converts between them* — there is nothing left to convert.
    for (const param of faderParams) {
      expect(param.unit).toBe('%')
      expect(param.range.max).toBe(100)
      expect(param.note ?? '').not.toMatch(/line from the bottom/)
    }
  })

  it('authors a CC number on the other 29 too, and no MIDI prose anywhere (#324)', () => {
    for (const param of knobParams) {
      expect(param.note ?? '').not.toContain(NO_PRINTED_POSITION)
      // No device folder writes this sentence any more. A note here, where there is one, is
      // something about the control that the instruction cannot say.
      expect(param.note ?? '').not.toContain('Send MIDI CC')
      expect(param.midiCc).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps the two mood-carrying faders moving, re-derived as a share of the travel (#349)', () => {
    const moods = faderParams
      .filter((param) => param.mood !== undefined)
      .map((param) => `${param.name}:${param.mood?.map((m) => `${m.axis}${m.amount}`).join()}`)
    expect([...new Set(moods)].sort()).toEqual([
      'VCA ENV · DECAY:density-15',
      'VCA ENV · RELEASE:space20',
    ])
  })
})

/**
 * §6/#349. **An offset is a fixed distance in the parameter's own units, so re-scaling the units
 * re-scales every offset — and on the two Hz controls it changes the *shape* of one.**
 *
 * On percent a constant is already a musical statement, *a fifth of the travel*, and the five
 * percent offsets were re-derived as judgments in those terms. On a logarithmic Hz cutoff a
 * constant is not: `-30` Hz is most of the filter at 300 and inaudible at 6 k. What is fixed on a
 * logarithmic scale is an interval, so the amount is authored as a share of the point it moves —
 * `-Math.round(cutoff / 2)`, which is one octave down wherever the cutoff sits.
 */
describe('mood on the Muse after the re-scaling (§6/#349)', () => {
  const declared = numerics.flatMap((param) =>
    (param.mood ?? []).map((offset) => `${param.name}:${offset.axis}${offset.amount}`),
  )

  it('declares exactly the five percent offsets and the arpeggiator’s swing', () => {
    const percentDeclared = [...percentParams, ...numerics.filter((p) => p.name === 'ARP · SWING')]
      .flatMap((param) => (param.mood ?? []).map((o) => `${param.name}:${o.axis}${o.amount}`))
    expect([...new Set(percentDeclared)].sort()).toEqual([
      'ARP · SWING:swing18',
      'DELAY · MIX:space25',
      'FM AMOUNT:grit20',
      'MIXER · RING MOD:grit25',
      'VCA ENV · DECAY:density-15',
      'VCA ENV · RELEASE:space20',
    ])
  })

  it('moves both cutoffs one octave down at full darkness, at every cutoff', () => {
    expect(hzCutoffs.length).toBeGreaterThan(0)
    for (const param of hzCutoffs) {
      const darkness = (param.mood ?? []).filter((offset) => offset.axis === 'darkness')
      expect(darkness, param.name).toHaveLength(1)
      // The claim, checked as a ratio rather than as a number: adding the amount halves the
      // frequency, which is an octave at 130 Hz and an octave at 8 kHz. A constant that happened
      // to be right for one recipe would fail on the next.
      expect(param.value + (darkness[0]?.amount ?? 0), param.name).toBe(param.value / 2)
    }
    // Every cutoff on the device, not a sample, and they are not all the same number — which is
    // the whole point of authoring the amount from the point.
    const amounts = new Set(hzCutoffs.map((p) => (p.mood ?? [])[0]?.amount))
    expect(amounts.size).toBeGreaterThan(5)
  })

  it('keeps the darkened cutoff inside the range, so nothing clamps silently', () => {
    for (const param of hzCutoffs) {
      const moved = param.value + ((param.mood ?? [])[0]?.amount ?? 0)
      expect(moved, param.name).toBeGreaterThan(param.range.min)
      // The other direction: §6.1 flips the sign below centre, so full brightness adds the same
      // amount. That is a fifth up rather than an octave — an additive engine cannot be
      // symmetrical here — and it must still land inside the range.
      expect(param.value - ((param.mood ?? [])[0]?.amount ?? 0), param.name).toBeLessThan(
        param.range.max,
      )
    }
  })

  it('declares darkness on the cutoffs and nowhere else', () => {
    const carrying = new Set(
      numerics
        .filter((param) => (param.mood ?? []).some((offset) => offset.axis === 'darkness'))
        .map((param) => param.name),
    )
    expect([...carrying].sort()).toEqual(['FILTER 1 · CUTOFF', 'FILTER 2 · CUTOFF'])
  })

  it('leaves every percent offset inside the travel it is a share of', () => {
    for (const param of percentParams) {
      for (const offset of param.mood ?? []) {
        expect(Math.abs(offset.amount), param.name).toBeLessThanOrEqual(50)
      }
    }
  })
})

/**
 * §3.1/#324, narrowed at #349, through the real device rather than a fixture.
 * `test/resolver.test.ts` pins the composition rule; this pins that the Muse actually goes through
 * it — and that what comes out the far side names a controller and never a value.
 */
describe('the Muse’s MIDI instruction names the controller (#324/#349)', () => {
  const RIG = ['roland-tr-1000', 'synthstrom-deluge', 'moog-muse', 'moog-subsequent-37']

  function museParams(mood: Parameters<typeof resolve>[0]['mood']): ResolvedParam[] {
    const result = resolve({
      devices: DEVICES.filter((d) => RIG.includes(d.id)),
      template: industrialTechno,
      mood,
      seed: 3,
    })
    return result.assignments
      .filter((a) => a.deviceId === 'moog-muse')
      .flatMap((a) => a.params)
      .filter((param) => param.midiCc !== undefined)
  }

  /** What the instruction must say, for any parameter, at any mood. */
  function stale(params: readonly ResolvedParam[]): ResolvedParam[] {
    return params.filter((param) => !param.note?.endsWith(`MIDI CC ${param.midiCc}`))
  }

  it('names the controller on every CC parameter, at every mood setting', () => {
    for (const mood of [
      moodState(),
      moodState({ density: 0 }),
      moodState({ darkness: 100 }),
      moodState({ space: 100 }),
    ]) {
      const params = museParams(mood)
      expect(params.length).toBeGreaterThan(0)
      expect(stale(params)).toEqual([])
      // The half that went at #349: no instruction on this box promises what sending a number
      // would do, because no page says where a CC value lands on the scale beside it.
      expect(params.filter((param) => param.note?.includes('Send MIDI CC'))).toEqual([])
      expect(params.filter((param) => param.note?.includes('='))).toEqual([])
    }
  })

  it('drops both cutoffs an octave at full darkness, and says so in Hz', () => {
    // The proportional offset seen from the reader's end: the value on the line is half what the
    // recipe authored, struck through from it, and the instruction beside it did not move.
    const dark = museParams(moodState({ darkness: 100 })).filter((p) => p.name.endsWith('· CUTOFF'))
    expect(dark.length).toBeGreaterThan(0)
    for (const param of dark) {
      expect(param.provenance.state).toBe('provisional')
      const from = param.provenance.state === 'provisional' ? param.provenance.from : undefined
      expect(from, param.name).toBeDefined()
      expect(param.value, param.name).toBe((from as number) / 2)
      expect(param.unit).toBe('Hz')
      expect(param.note).toBe(`MIDI CC ${param.midiCc}`)
    }
  })

  it('follows a fader that density moved — VCA ENV DECAY, one of the eight', () => {
    const dense = museParams(moodState({ density: 0 })).filter((p) => p.name === 'VCA ENV · DECAY')
    expect(dense.length).toBeGreaterThan(0)
    for (const param of dense) {
      // `provisional` rather than `derived`, because the Muse authors these points as taste
      // (§3.2) — moving an unverified point inherits no authority it never had.
      expect(param.provenance.state).toBe('provisional')
      const from = param.provenance.state === 'provisional' ? param.provenance.from : undefined
      expect(from).toBeDefined()
      expect(from).not.toBe(param.value)
      // The value moved and the instruction did not, which is the whole of #349's change here.
      expect(param.note).toBe('MIDI CC 87')
    }
  })

  it('leaves an unmoved control naming its authored value, with its own note in front', () => {
    const neutral = museParams(moodState())
    const bipolar = neutral.filter((p) => p.name === 'FILTER 1 · ENVELOPE AMOUNT')
    expect(bipolar.length).toBeGreaterThan(0)
    for (const param of bipolar) {
      // Unmoved: `provisional` with no `from` at all, which is the state a centred knob leaves.
      expect(param.provenance).toEqual({ state: 'provisional' })
      // The authored prose keeps its place; the instruction is appended behind it.
      expect(param.note).toBe('Bipolar, no modulation at noon · MIDI CC 69')
      expect(param.unit).toBe('%')
    }
  })
})
