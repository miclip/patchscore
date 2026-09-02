import { describe, expect, it } from 'vitest'
import { device } from '../lib/devices/moog-muse/index'
import { moodState, resolve } from '../lib/core/index'
import type { AuthoredNumericParam, AuthoredParam, ResolvedParam } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'

/**
 * #325, then #324. The Muse's CC helper printed one sentence on every unnumbered control:
 *
 * > The knob carries no scale and no page maps its position to a CC value, so there is no printed
 * > setting for it by hand
 *
 * Two things were wrong with it, and they were fixed in that order.
 *
 * **#325: on eight of the 41 controls the claim is false.** PDF p.38 draws both ENVELOPE banks
 * with their four faders crossed by five horizontal lines, and printed p.19 maps a line to a
 * value — *"all set to around 25% (or the second line from the bottom)"*. Those eight go through
 * `fader`; the rest go through `cc`.
 *
 * **#324: on the other 33 it is true, and 76 resolved parameters carried it on one rig.** It is one fact
 * about one manual, so it moved to the device's `controlPositions` declaration and is rendered
 * once above this box's settings — see `test/control-positions.test.ts`, which also holds the
 * exception that keeps the notice off these eight.
 *
 * What is left here is the split itself. Both helpers now build the same note, so nothing in the
 * rendered guide distinguishes them; the group is what `controlPositions.mapped` is naming when it
 * says *the FILTER and VCA ENVELOPE faders*, and this file is what stops a control drifting across
 * that line unnoticed.
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

function isCcParam(param: AuthoredParam): param is AuthoredNumericParam {
  if (param.kind !== 'numeric') return false
  const verified = param.range.verified
  return verified !== undefined && verified !== false && verified.source.includes('Appendix A')
}

/** Every instance across all 18 recipes, not one sample: a recipe could always be the odd one. */
const ccParams = device.recipes.flatMap((recipe) => recipe.params).filter(isCcParam)
const faderParams = ccParams.filter((param) => param.name in FADERS)
/** The other 33. Not *the rotary controls*: seven of them are the MIXER and WAVE MIX sliders. */
const otherParams = ccParams.filter((param) => !(param.name in FADERS))

const distinct = (params: readonly AuthoredNumericParam[]) =>
  [...new Set(params.map((param) => param.name))].sort()

describe('Muse envelope faders carry no false negative claim (#325)', () => {
  it('covers all eight faders and the other 33 controls, so neither side is vacuous', () => {
    expect(distinct(faderParams)).toEqual(Object.keys(FADERS).sort())
    expect(distinct(otherParams)).toHaveLength(33)
  })

  it('authors the fader’s CC number and no prose at all', () => {
    for (const param of faderParams) {
      expect(param.note).toBeUndefined()
      // #324. The number is authored; `resolveParam` writes the sentence, after mood. Naming the
      // CC is what makes the value reproducible and identifies the Appendix A row cited beside it.
      expect(param.midiCc).toBe(FADERS[param.name])
    }
  })

  it('names the eight in the exception the device declares, so the notice cannot reach them', () => {
    // The tie between this group and the device-level notice is prose, because what a reader is
    // told the claim does not cover is prose. What is checked here is that it is still saying
    // something about these faders — a `mapped` that stopped naming them would silently put all
    // eight back under a claim p.19 disproves — and that the page it cites is p.19's.
    expect(device.controlPositions?.mapped?.controls).toContain('ENVELOPE faders')
    expect(device.controlPositions?.mapped?.cite.source).toContain('pp.19, 38')
    expect(distinct(faderParams).every((name) => name.includes('ENV'))).toBe(true)
  })

  it('keeps every fader on the Appendix A CC scale, not on p.19 percent', () => {
    // p.19 licenses one pairing — 25% is the second line from the bottom — and no page converts an
    // arbitrary CC value into a fader line. So the range stays the CC value space it was authored
    // on, and nothing here prints a percentage or a line number beside it.
    for (const param of faderParams) {
      expect(param.range.min).toBe(0)
      expect(param.range.max).toBe(127)
      const verified = param.range.verified
      expect(verified !== undefined && verified !== false && verified.source).toContain(
        'Appendix A (MIDI CC), p.122',
      )
      expect(param.unit).toBeUndefined()
      expect(param.note ?? '').not.toMatch(/%|line from the bottom/)
    }
  })

  it('authors a CC number on the other 33 too, and no MIDI prose anywhere (#324)', () => {
    for (const param of otherParams) {
      expect(param.note ?? '').not.toContain(NO_PRINTED_POSITION)
      // No device folder writes this sentence any more. A note here, where there is one, is
      // something about the control that the instruction cannot say.
      expect(param.note ?? '').not.toContain('Send MIDI CC')
      expect(param.midiCc).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps the two mood-carrying faders moving, so the split changed only the prose', () => {
    const moods = faderParams
      .filter((param) => param.mood !== undefined)
      .map((param) => `${param.name}:${param.mood?.map((m) => `${m.axis}${m.amount}`).join()}`)
    expect([...new Set(moods)].sort()).toEqual([
      'VCA ENV · DECAY:density-18',
      'VCA ENV · RELEASE:space22',
    ])
  })
})

/**
 * §3.1/#324, through the real device rather than a fixture. `test/resolver.test.ts` pins the
 * composition rule; this pins that the Muse actually goes through it, on the two axes it declares
 * — `darkness` on both filter cutoffs, which are knobs, and `density`/`space` on two of the eight
 * envelope faders. Those four controls are where the stale sentence was visible to a reader.
 */
describe('the Muse’s CC instruction follows the mood knobs (#324)', () => {
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
    return params.filter((param) => !param.note?.endsWith(`Send MIDI CC ${param.midiCc} = ${param.value}`))
  }

  it('names the current value on every CC parameter, at every mood setting', () => {
    for (const mood of [
      moodState(),
      moodState({ density: 0 }),
      moodState({ darkness: 100 }),
      moodState({ space: 100 }),
    ]) {
      const params = museParams(mood)
      expect(params.length).toBeGreaterThan(0)
      expect(stale(params)).toEqual([])
    }
  })

  it('follows a knob that darkness moved — FILTER 2 CUTOFF, the one a reader watches', () => {
    const dark = museParams(moodState({ darkness: 100 })).filter(
      (p) => p.name === 'FILTER 2 · CUTOFF',
    )
    expect(dark.length).toBeGreaterThan(0)
    for (const param of dark) {
      // `provisional` rather than `derived`, because the Muse authors these points as taste
      // (§3.2) — moving an unverified point inherits no authority it never had. What matters
      // here is `from`: the value moved, it is struck through on the line above, and it must
      // not be what the reader is told to send.
      expect(param.provenance.state).toBe('provisional')
      const from = param.provenance.state === 'provisional' ? param.provenance.from : undefined
      expect(from).toBeDefined()
      expect(from).not.toBe(param.value)
      expect(param.note).toBe(`Send MIDI CC 72 = ${param.value}`)
      expect(param.note).not.toContain(`= ${from}`)
    }
  })

  it('follows a fader that density moved — VCA ENV DECAY, one of the eight', () => {
    const dense = museParams(moodState({ density: 0 })).filter((p) => p.name === 'VCA ENV · DECAY')
    expect(dense.length).toBeGreaterThan(0)
    for (const param of dense) {
      const from = param.provenance.state === 'provisional' ? param.provenance.from : undefined
      expect(from).toBeDefined()
      expect(from).not.toBe(param.value)
      expect(param.note).toBe(`Send MIDI CC 87 = ${param.value}`)
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
      expect(param.note).toBe(`Bipolar, no modulation at noon · Send MIDI CC 69 = ${param.value}`)
    }
  })
})
