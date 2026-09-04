import { describe, expect, it } from 'vitest'
import { device } from '../lib/devices/moog-muse/index'
import {
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type {
  AuthoredEnumParam,
  AuthoredNumericParam,
  AuthoredParam,
  Recipe,
  ResolvedAssignment,
  ResolvedParam,
  Role,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno } from '../lib/templates/index'

/**
 * #325, then #324, then #349, then #346. One control's scale, argued four times, and each round
 * left something in this file.
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
 * a value on the screen as the control is turned. Thirty-nine of the 41 were re-authored on the
 * scale the reader can see, cited `observed`; the two `DELAY · TIME` knobs stayed on the CC scale
 * because under `CLOCK SYNC` they show divisions, which needed a reading nobody had taken.
 *
 * **#346 took it, and the last two controls are not numbers.** A division is a name, not a point
 * on a scale, so they are `enum` params over the nine contiguous divisions the reading covers —
 * which is why the assertions below moved off `range` and onto `options`, and why nothing on this
 * device cites Appendix A any more. The tests that used to pin those two on the CC scale were
 * pinning the defect; two of them passed vacuously the moment the params changed kind, which is
 * the failure this file is otherwise built to avoid.
 *
 * **And the scale is not one scale.** The three bipolar controls were the last read, and none is
 * a percentage: both `FILTER · ENVELOPE AMOUNT` knobs are signed `-100…100`, and `VCA · PAN` is a
 * side and a distance, `100L` through `0` to `100R`, authored as a magnitude from centre. So the
 * split is 34 percent, 2 signed, 1 sided, 2 Hz, and 2 that are no kind of number at all.
 *
 * **The two envelope amounts were read separately**, at the same session at the box, and share a
 * helper because they share a scale rather than because either was carried across from the other.
 * They sit on one module and the sibling argument would have made the second free, which is
 * exactly why it matters that it was not used: `FILTER 2 · CUTOFF` is the one inference this
 * folder makes, and this file asserts it is still the only one.
 *
 * **Pan is authored only at centre**, which is where every recipe puts it and the only point the
 * reading settles. A side has no representation here yet and the tests say so, so a recipe that
 * wants a hard-left pad has to settle that first rather than find an unexercised branch.
 *
 * **One thing follows and this file pins it.** The resting position of a bipolar control is now a
 * *cited point* — the reading says which number noon is — so the Muse has non-provisional points
 * where it had none, and `verified` on a point is no longer uniform across the file.
 *
 * What this file pins is the shape of that outcome: which controls are on which scale, that the
 * counts are what the reading found, which points the reading settles, and that nothing here
 * asserts a CC *value* any more.
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

/**
 * #349 and #346. The observation this manifest rests on, and the first `observed` cite in the
 * library. Two readings at one box on one firmware, which is one piece of evidence and one cite.
 */
const OBSERVED = { kind: 'observed', source: 'Muse, firmware 1.4.0' }

/**
 * #346, stated here rather than imported. The nine divisions the reading covers, in the duration
 * order `COMBO` sweeps them — a second statement of what somebody saw, so that editing the
 * manifest's list is a failing test rather than a test that agrees with itself.
 */
const DIVISIONS = ['1/16', '1/8 T', '1/16 D', '1/8', '1/4 T', '1/8 D', '1/4', '1/2 T', '1/4 D']

function isNumeric(param: AuthoredParam): param is AuthoredNumericParam {
  return param.kind === 'numeric'
}

function isEnum(param: AuthoredParam): param is AuthoredEnumParam {
  return param.kind === 'enum'
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
/** #346. The two controls that take a division, across all 18 recipes. */
const divisionParams = device.recipes
  .flatMap((recipe) => recipe.params)
  .filter(isEnum)
  .filter((param) => param.name.startsWith('DELAY · TIME'))
const faderParams = percentParams.filter((param) => param.name in FADERS)
/** The other 26. Not *the rotary controls*: several are the MIXER and WAVE MIX sliders. */
const knobParams = percentParams.filter((param) => !(param.name in FADERS))
/** Both signed controls: `-100…100`, `0` at noon, no unit at all. */
const signedParams = observedParams.filter((param) => param.name.endsWith('ENVELOPE AMOUNT'))
/** The sided one: a magnitude from centre, and centre is the only point any recipe uses. */
const panParams = observedParams.filter((param) => param.name === 'VCA · PAN')
/**
 * Every point the reading settles, across all 18 recipes. A bipolar control at rest is where the
 * observation lands and nothing else here is — see the file note.
 */
const citedPoints = numerics.filter((param) => param.verified !== false)

const distinct = (params: readonly { name: string }[]) =>
  [...new Set(params.map((param) => param.name))].sort()

describe('the Muse is authored on the scales its screen shows (#349)', () => {
  it('splits the 41 CC-numbered controls 34 / 2 / 1 / 2 / 2, which is what the reading found', () => {
    // Counted by distinct control rather than by instance. 34 percent, the two signed envelope
    // amounts, the sided pan, the two cutoffs in Hz, and the two DELAY TIME knobs that #346 took
    // off the number line entirely.
    expect(distinct(percentParams)).toHaveLength(34)
    expect(distinct(signedParams)).toEqual([
      'FILTER 1 · ENVELOPE AMOUNT',
      'FILTER 2 · ENVELOPE AMOUNT',
    ])
    expect(distinct(panParams)).toEqual(['VCA · PAN'])
    expect(distinct(hzCutoffs)).toEqual(['FILTER 1 · CUTOFF', 'FILTER 2 · CUTOFF'])
    expect(distinct(divisionParams)).toEqual(['DELAY · TIME - L', 'DELAY · TIME - R'])
    // And they are disjoint and exhaustive over the 41. `midiCc` reaches 39 of them: the two
    // division knobs still answer to CC 93 and 94, and an `AuthoredEnumParam` has no field to
    // declare it in, so their half of the count comes from the option set instead.
    const withCc = numerics.filter((param) => param.midiCc !== undefined)
    expect(distinct(withCc)).toHaveLength(34 + 2 + 1 + 2)
    expect(distinct(withCc).length + distinct(divisionParams).length).toBe(41)
  })

  it('cites the observation, with the firmware in the source string', () => {
    for (const param of [...percentParams, ...hzCutoffs, ...signedParams, ...panParams]) {
      expect(param.range.verified, param.name).toEqual(OBSERVED)
    }
    // §3.1's split, and it now cuts both ways on one device. The range is always a claim somebody
    // checked. The point is taste everywhere except at a bipolar control's rest position, which
    // is the one place the same reading also says what the number is.
    for (const param of [...percentParams, ...hzCutoffs]) {
      expect(param.verified, param.name).toBe(false)
    }
  })

  /**
   * The controls the bipolar reading moved, and the reason pan is a separate test: it is not the
   * same shape. A sign and a side are different answers to *which way*, and `NumericRange` can
   * express the first and not the second.
   */
  it('puts both signed controls on -100…100 with no unit, and noon at 0', () => {
    // Two controls across 18 recipes.
    expect(signedParams.length).toBe(36)
    const ccs: Readonly<Record<string, number>> = {
      'FILTER 1 · ENVELOPE AMOUNT': 69,
      'FILTER 2 · ENVELOPE AMOUNT': 75,
    }
    for (const param of signedParams) {
      expect(param.range.min, param.name).toBe(-100)
      expect(param.range.max, param.name).toBe(100)
      // No unit: the screen shows a bare signed number, and a `%` here would be the relabelling
      // #349 refused. Not `''` — absent, so the renderer prints nothing rather than a space.
      expect(param.unit, param.name).toBeUndefined()
      expect(param.value, param.name).toBeGreaterThanOrEqual(-100)
      expect(param.value, param.name).toBeLessThanOrEqual(100)
      // The note and the number finally agree. On `0-100 %` the note said noon and the value said
      // `50`, which is the contradiction this range exists to end.
      expect(param.note, param.name).toBe('Bipolar, no modulation at noon')
      // The Appendix A rows never moved, and the two controls keep their own.
      expect(param.midiCc, param.name).toBe(ccs[param.name])
    }
    // Rescaled from travel by `2x-100`, so every point stayed on the five-grid and none went
    // negative — the recipes were all at or above noon already.
    expect(signedParams.every((param) => param.value >= 0)).toBe(true)
    expect(new Set(signedParams.map((param) => param.value)).size).toBeGreaterThan(4)
    // Both controls actually move across the recipes, so neither side of the pair is a column of
    // one repeated number that a wrong rescaling would hide in.
    for (const name of Object.keys(ccs)) {
      const values = signedParams.filter((param) => param.name === name).map((p) => p.value)
      expect(new Set(values).size, name).toBeGreaterThan(3)
    }
  })

  it('authors PAN as a magnitude, because the screen shows a side rather than a sign', () => {
    expect(panParams.length).toBe(18)
    for (const param of panParams) {
      // `0…100`, not `-100…100`. No screen on this box shows `-40`; it shows `40L`, and the two
      // conventions for what a negative pan means disagree, so a signed range would be inventing
      // one of them. The shape the instrument does show is stated in the note.
      expect(param.range.min, param.name).toBe(0)
      expect(param.range.max, param.name).toBe(100)
      expect(param.note).toBe('Bipolar, centred at noon — the screen reads 100L through 0 to 100R')
      expect(param.midiCc).toBe(10)
      // Every recipe centres it, and centre carries no side — `0L` is not a thing the box prints.
      expect(param.value, param.name).toBe(0)
      expect(param.unit, param.name).toBeUndefined()
    }
  })

  /**
   * **The range is exercised at one point, and the helper offers no other.** An earlier pass gave
   * `panParam` an optional `'L' | 'R'` that became the parameter's `unit`. Nothing called it, `L`
   * is not a unit and is in no vocabulary this library shares, and the rendered bounds would have
   * come out side-specific — `40 L (0…100 L)`, a range the instrument does not have. It was
   * deleted rather than tested, because a tested branch nothing uses is still a decision taken in
   * advance of the recipe that needs it.
   *
   * This test is what makes that a commitment instead of a current fact: a future off-centre pan
   * has to settle how a side is represented, and it will arrive here first.
   */
  it('offers no way to author a pan off centre, so the question stays open', () => {
    expect(new Set(panParams.map((param) => param.value))).toEqual(new Set([0]))
    // No `L`/`R` reached a unit anywhere on this device, which is the shape the deleted branch
    // would have produced.
    expect(numerics.filter((param) => param.unit === 'L' || param.unit === 'R')).toEqual([])
    // And the whole unit vocabulary of this device is three real units and the absence of one.
    // `L` would have been a fourth entry that is not a unit at all, which is the objection.
    expect([...new Set(numerics.map((param) => param.unit))].sort()).toEqual([
      '%',
      'Hz',
      'st',
      undefined,
    ])
  })

  /**
   * **Both envelope amounts were read; neither was carried across from the other.** They are the
   * same control on the same module, which is exactly the argument that would have made the
   * second one free — and the whole value of naming `FILTER 2 · CUTOFF` as *the* inference in
   * this folder is that it stays the only one. The test states that as a property of the file
   * rather than as a claim in a comment: the two amounts must agree in every respect that comes
   * from the reading, and a recipe at rest must print the same number on both lines.
   */
  it('gives the two envelope amounts one scale, because each was read at the box', () => {
    const byName = (name: string) => numerics.filter((param) => param.name === name)
    const one = byName('FILTER 1 · ENVELOPE AMOUNT')
    const two = byName('FILTER 2 · ENVELOPE AMOUNT')
    expect(one).toHaveLength(18)
    expect(two).toHaveLength(18)
    // Everything the reading decides is identical across the pair; only the CC and the point
    // differ, and the point is taste.
    const shape = (param: AuthoredNumericParam) =>
      `${param.range.min}…${param.range.max} ${param.unit ?? '(none)'} ${param.note ?? ''}`
    expect([...new Set([...one, ...two].map(shape))]).toEqual([
      '-100…100 (none) Bipolar, no modulation at noon',
    ])
    // The recipe that wants no filter envelope at all now prints one number twice, which is what
    // two readings of the same scale should produce.
    const atRest = device.recipes
      .find((recipe) => recipe.id === 'muse-sub-clean')
      ?.params.filter(isNumeric)
      .filter((param) => param.name.endsWith('ENVELOPE AMOUNT'))
      .map((param) => `${param.name}=${param.value}${param.unit ?? ''}`)
    expect(atRest).toEqual([
      'FILTER 1 · ENVELOPE AMOUNT=0',
      'FILTER 2 · ENVELOPE AMOUNT=0',
    ])
  })

  /**
   * §3.1. **The reading settles a point as well as a range, in one place.** `verified` on a point
   * asks whether anybody checked the number, and for the rest position of a bipolar control
   * somebody did — the note says the knob is at noon and the observation says which number that
   * is. It says nothing about where a lead's envelope amount should sit, so every other point on
   * this device is still taste.
   */
  it('cites the resting position of a bipolar control and nothing else', () => {
    // Stated as the rule rather than as a total, because the total is a fact about how many
    // recipes happen to want no envelope and would change with the next recipe added.
    const atNoon = [...signedParams, ...panParams].filter((param) => param.value === 0)
    expect(citedPoints).toHaveLength(atNoon.length)
    for (const param of citedPoints) {
      expect(param.verified, param.name).toEqual(OBSERVED)
      expect(param.value, param.name).toBe(0)
    }
    expect(distinct(citedPoints)).toEqual([
      'FILTER 1 · ENVELOPE AMOUNT',
      'FILTER 2 · ENVELOPE AMOUNT',
      'VCA · PAN',
    ])
    // All 18 pans are centred, so the pan half of that is not a sample.
    expect(citedPoints.filter((param) => param.name === 'VCA · PAN')).toHaveLength(18)
    // Not vacuous in the other direction: a non-zero amount on the same control is still taste.
    const offNoon = signedParams.filter((param) => param.value !== 0)
    expect(offNoon.length).toBeGreaterThan(0)
    for (const param of offNoon) expect(param.verified).toBe(false)
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
    // p.42: PAN is bipolar and centred at noon, and the screen puts noon at `0`. Every recipe
    // centres it, so this is a stated position rather than taste — and the reading is what makes
    // it a *cited* one, which is the assertion the previous version of this test could not make.
    expect(panParams.length).toBeGreaterThan(0)
    for (const param of panParams) expect(param.value).toBe(0)
    // The same reading on the other two bipolar controls, where it changes the sound rather than
    // the image: a recipe that wants no filter envelope sets both ENVELOPE AMOUNTs to noon, and
    // noon is `0` on the signed scale each of their screens shows.
    for (const id of ['muse-sub-dark', 'muse-sub-clean', 'muse-bass-mid-dark']) {
      const amounts = device.recipes
        .find((recipe) => recipe.id === id)
        ?.params.filter(isNumeric)
        .filter((param) => param.name.endsWith('ENVELOPE AMOUNT'))
      expect(amounts, id).toHaveLength(2)
      expect(amounts?.map((param) => param.value), id).toEqual([0, 0])
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
  it('puts every observed point on a five-step grid, so a reader can land on it', () => {
    // Not only the percent ones: the rescaling took both signed controls off percent and
    // `2x-100` maps the grid onto itself, so the rule that made the old values dialable makes
    // the new ones dialable too. A rescaling that had landed on `17` would be caught here.
    const dialable = [...percentParams, ...signedParams, ...panParams]
    const offGrid = dialable.filter((param) => param.value % 5 !== 0)
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

  /**
   * #346, and the assertion this file used to make backwards. The recipe engages `CLOCK SYNC`
   * three lines above these two, and then stated their value on the scale that switch replaces —
   * `48 (0…127)` beside a screen reading `1/8`. The test that pinned it read as a decision not to
   * relabel a number, which it was; what it could not say is that the number was answering a
   * question nobody at the machine is asking.
   *
   * **The nine values are the reading's, and the endpoints are deliberately not among them.**
   * See `DELAY_DIVISIONS` in the manifest: the run is contiguous, so a reader stepping between any
   * two of these passes only through divisions somebody has seen.
   */
  it('authors both DELAY TIME knobs as divisions, cited to the reading that found them', () => {
    // Two controls across 18 recipes, and nothing else on this device takes a division.
    expect(divisionParams).toHaveLength(36)
    expect(distinct(divisionParams)).toEqual(['DELAY · TIME - L', 'DELAY · TIME - R'])
    for (const param of divisionParams) {
      // The option set is the claim somebody checked, in the duration order `COMBO` sweeps.
      expect(param.options.values, param.name).toEqual(DIVISIONS)
      expect(param.options.verified, param.name).toEqual(OBSERVED)
      // §3.2's other half: which division a delay under every part on this box wants is taste,
      // and the reading says nothing about it.
      expect(param.verified, param.name).toBe(false)
      // One processor for the whole patch, so the setting hoists above the parts.
      expect(param.scope, param.name).toBe('song')
    }
    // Neither end of the knob is offered. Both were read — `1/64 T` fully counter-clockwise and
    // `1 D` fully clockwise — and what lies between them and this run was not, so an option set
    // holding them would look complete while hiding two unread gaps.
    expect(DIVISIONS).not.toContain('1/64 T')
    expect(DIVISIONS).not.toContain('1 D')
    // And nothing on this device cites Appendix A any more: no range is stated on the CC scale,
    // which is what leaving those two on it was.
    expect(numerics.filter((param) => rangeSource(param).includes('Appendix A'))).toEqual([])
  })

  /**
   * The pair as a stereo setting rather than two independent choices, and the one place this file
   * checks prose: an enum has no `midiCc` field, so the sentence `resolveParam` composes for every
   * other control on this box is hand-written for these two. It is safe for the reason #324's
   * field exists — it names a controller and asserts no value — and this pins that it stays so.
   */
  it('states one stereo pair for the whole guide, with the controller still named', () => {
    const valuesOf = (name: string) =>
      new Set(divisionParams.filter((param) => param.name === name).map((param) => param.value))
    // Identical in all 18, or `hoistedParams` drops them back into the per-part lists and the
    // conflict `sharedDelay` exists to prevent comes back through the pool.
    expect(valuesOf('DELAY · TIME - L')).toEqual(new Set(['1/8']))
    expect(valuesOf('DELAY · TIME - R')).toEqual(new Set(['1/8 D']))
    for (const param of divisionParams) {
      expect(DIVISIONS, param.name).toContain(param.value)
      const cc = param.name.endsWith('- L') ? 93 : 94
      expect(param.note, param.name).toBe(
        param.name.endsWith('- L')
          ? 'Straight, against the dotted right · MIDI CC 93'
          : 'Dotted, so its repeat falls between the left one’s · MIDI CC 94',
      )
      expect(param.note, param.name).toContain(`MIDI CC ${String(cc)}`)
      // The half #324 removed and nothing may bring back: a value in the sentence.
      expect(param.note, param.name).not.toContain('=')
      expect(param.note, param.name).not.toContain('Send MIDI CC')
    }
  })
})

describe('Muse envelope faders carry no false negative claim (#325)', () => {
  it('covers all eight faders and the other 26 controls, so neither side is vacuous', () => {
    expect(distinct(faderParams)).toEqual(Object.keys(FADERS).sort())
    expect(distinct(knobParams)).toHaveLength(26)
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

  it('authors a CC number on the other 26 too, and no MIDI prose anywhere (#324)', () => {
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

  function allMuseParams(mood: Parameters<typeof resolve>[0]['mood']): ResolvedParam[] {
    const result = resolve({
      devices: DEVICES.filter((d) => RIG.includes(d.id)),
      template: industrialTechno,
      mood,
      seed: 3,
    })
    return result.assignments
      .filter((a) => a.deviceId === 'moog-muse')
      .flatMap((a) => a.params)
  }

  function museParams(mood: Parameters<typeof resolve>[0]['mood']): ResolvedParam[] {
    return allMuseParams(mood).filter((param) => param.midiCc !== undefined)
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
    const bipolar = neutral.filter((p) => p.name.endsWith('ENVELOPE AMOUNT'))
    expect(bipolar.length).toBeGreaterThan(0)
    for (const param of bipolar) {
      // The authored prose keeps its place; the instruction is appended behind it, naming the
      // control's own Appendix A row — 69 on FILTER 1, 75 on FILTER 2.
      expect(param.note, param.name).toBe(`Bipolar, no modulation at noon · MIDI CC ${param.midiCc}`)
      // No unit reaches the reader, because the screen shows a bare signed number.
      expect(param.unit).toBeUndefined()
      expect(param.range?.min).toBe(-100)
      expect(param.range?.max).toBe(100)
      // This control declares no mood, so nothing is ever `derived` here. What it *is* now
      // depends on the point: `authored` at noon, where the reading settles it, and
      // `provisional` anywhere else. Both carry no `from`, which is the unmoved shape.
      const expected = param.value === 0
        ? { state: 'authored', cite: OBSERVED }
        : { state: 'provisional' }
      expect(param.provenance, `${param.name}=${param.value}`).toEqual(expected)
    }
  })

  /**
   * #346, from the reader's end. The two lines the CLOCK SYNC above them makes divisions arrive as
   * divisions — no bounds, because an enum's legality gate is its option set and the resolver does
   * not carry it, and no `midiCc`, because the field is numeric-only and the sentence is authored.
   */
  it('hands the reader a division on both DELAY TIME lines, not a number', () => {
    const times = allMuseParams(moodState()).filter((p) => p.name.startsWith('DELAY · TIME'))
    expect(times.length).toBeGreaterThan(0)
    for (const param of times) {
      expect(typeof param.value, param.name).toBe('string')
      expect(DIVISIONS, param.name).toContain(param.value as string)
      expect(param.range, param.name).toBeUndefined()
      expect(param.unit, param.name).toBeUndefined()
      // Taste, so provisional — and nothing moved it, because an enum takes no mood.
      expect(param.provenance, param.name).toEqual({ state: 'provisional' })
      expect(param.midiCc, param.name).toBeUndefined()
      expect(param.note ?? '', param.name).toMatch(/ · MIDI CC 9[34]$/)
      // One processor for the whole patch, which is what lets the renderer hoist these.
      expect(param.scope, param.name).toBe('song')
    }
    expect(new Set(times.map((p) => `${p.name} ${String(p.value)}`))).toEqual(
      new Set(['DELAY · TIME - L 1/8', 'DELAY · TIME - R 1/8 D']),
    )
  })

  /**
   * The pan line as the reader gets it: a cited point, a magnitude range, and the shape of the
   * screen stated in the prose because the range cannot state it.
   */
  it('renders PAN centred, cited, and with the L/R shape in its own note', () => {
    const pans = museParams(moodState()).filter((p) => p.name === 'VCA · PAN')
    expect(pans.length).toBeGreaterThan(0)
    for (const param of pans) {
      expect(param.value).toBe(0)
      expect(param.unit).toBeUndefined()
      expect(param.range?.min).toBe(0)
      expect(param.range?.max).toBe(100)
      expect(param.provenance).toEqual({ state: 'authored', cite: OBSERVED })
      expect(param.note).toBe(
        'Bipolar, centred at noon — the screen reads 100L through 0 to 100R · MIDI CC 10',
      )
    }
  })
})

/**
 * §2.1/#334. **This box authors no trigger note, and it has no blanks to fix either.**
 *
 * Every grid part it takes is a `sub` and every one of those carries the direction's own pitch, so
 * the sweep's blank count here is zero. This block is the record of *why the field is declined*
 * on a box the sweep barely touches — written before somebody adds a recipe and asks.
 *
 * `TriggerNote` is a loaded sample's original pitch and there is no sample here:
 * `capabilityEvidence.content` already carries p.116's `SOUND ENGINE  Analog` with a module list
 * that has no sample player in it, and pp.117-118 with no audio input to record one through.
 *
 * p.27 says what a note does instead, on the control that would carry one: `FREQUENCY` *"detunes
 * each oscillator from the pitch associated with a keyboard note"*, and at noon *"if a C is
 * pressed, a C will sound based on the OCTAVE setting"*. A pressed C sounds a C — musical pitch,
 * which §4.1 leaves to the direction.
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
    expect(authoring.map((d) => d.id)).not.toContain('moog-muse')
  })

  it('expands to two timbres, neither of which carries a note', () => {
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(2)
    expect(members.every((m) => m.poolId === 'timbre')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The reason, read off the manifest rather than restated.** `content` is `cited-against` on
   * pp.12 and 116-118 — the pages that answer that there is no audio here for a recipe to load —
   * and no recipe carries `sourceAudio`. A sampler arriving on this box is the one change that
   * would make the question worth asking again, and it would fail here.
   */
  it('loads no audio at all, so no part has an original pitch to name', () => {
    const content = device.capabilityEvidence?.['content']
    expect(content === undefined || content === false ? undefined : content.kind).toBe(
      'cited-against',
    )
    const loading = device.recipes.filter(
      (r) => (r as Recipe & { sourceAudio?: unknown }).sourceAudio !== undefined,
    )
    expect(loading.map((r) => r.id)).toEqual([])
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with
   * at least one section whose variant resolved (§6.3).
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
   * **The measurement, and this box's answer is unlike every other in the sweep: no blanks at
   * all.** Two assignables take few parts, and the ones they take are tonal, so the direction has
   * already written a pitch for every grid this box draws.
   *
   * That makes the assertion stronger than the usual one rather than weaker: it says the field is
   * declined *and* that nothing is missing because of it.
   */
  it('leaves no grid part blank, because every one of them is pitched', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(24)
    expect(grid.filter((g) => g.kind === 'none')).toEqual([])
    expect([...new Set(grid.map((g) => g.kind))]).toEqual(['pitch'])
    expect([...new Set(grid.map((g) => g.role))]).toEqual(['sub'])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // #100 gives a hooked part's notes to its hook, and on this box that is the whole of the
    // remainder — nothing is sustained and nothing fails to resolve a variant.
    const { grid, hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(90)
    expect(sustained).toEqual([])
    expect(noPattern).toEqual([])

    // The four arms are exhaustive, so the sweep cannot silently drop a part it could not
    // classify — which is what would make the zero above an artefact rather than a measurement.
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
})
