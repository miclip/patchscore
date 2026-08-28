import { describe, expect, it } from 'vitest'
import { clockSourceBasis, decodeGuideInputs, encodeGuideInputs, moodState, resolve, renderGuide } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { CATALOGUE, DEFAULT_INPUTS, songOverrides, withClockSource } from '../lib/studio/session'

/**
 * §7.4/#200. **The reader can put a box in charge of the clock.**
 *
 * §7.4 ranks a source and, before this, the reader had no way to disagree with it. The choice is
 * an *input* rather than a view setting, and that is the whole design: it changes which box the
 * guide names, which setup it prints and which boxes are told to run free, so invariant 6 makes
 * it something a permalink has to carry.
 */

const template = TEMPLATES.find((t) => t.id === 'industrial-techno')!
const base = { devices: DEVICES, template, mood: moodState(), seed: 9 }

describe('a chosen clock source outranks §7.4 (#200)', () => {
  it('is honoured, and says the reader chose it', () => {
    const derived = resolve(base)
    expect(derived.clockSource?.chosen).toBe(false)

    const chosen = resolve({ ...base, overrides: { clockSourceId: 'roland-tr-8s' } })
    expect(chosen.clockSource?.deviceId).toBe('roland-tr-8s')
    expect(chosen.clockSource?.chosen).toBe(true)
    expect(clockSourceBasis(chosen.clockSource!)).toBe('chosen')
  })

  it('reaches the guide, in words that do not read like a derived answer', () => {
    // #121's standing rule: a person's judgement and a deterministic fallback must never arrive
    // in the same sentence, because the fallback then reads as advice.
    const doc = renderGuide(resolve({ ...base, overrides: { clockSourceId: 'roland-tr-8s' } }))
    expect(doc).toContain('Why this box — you chose it')
    // Scoped to the clock line rather than the whole guide. `settled it` is also the honest
    // wording of §3.3's voice-control basis, which is a different sentence about a different
    // decision — asserting over the document made this test fail the moment #201 gave the Hapax
    // a pitch-and-gate bundle, for a reason that had nothing to do with the clock.
    const clockLine = doc.split('\n').find((l) => l.includes('**Clock source**')) ?? ''
    expect(clockLine).not.toContain('settled it')
  })

  it('refuses a box that cannot send clock, rather than obeying it', () => {
    // The Minitaur has no clock output. Picking one cannot make it a source, and printing a setup
    // for a socket it does not have would be the invented value invariant 5 exists to stop.
    const minitaur = DEVICES.find((d) => d.id === 'moog-minitaur')!
    expect(minitaur.clock.canSendClock).toBe(false)

    const result = resolve({ ...base, overrides: { clockSourceId: 'moog-minitaur' } })
    expect(result.clockSource?.deviceId).not.toBe('moog-minitaur')
    expect(result.clockSource?.chosen).toBe(false)
    // And it falls back to the ranked answer rather than to nothing.
    expect(result.clockSource?.deviceId).toBe(resolve(base).clockSource?.deviceId)
  })

  it('changes nothing at all when absent', () => {
    // #161's rule for `bpm` and `key`, applied to the third override: omitted is byte-identical.
    const without = renderGuide(resolve(base))
    const withEmpty = renderGuide(resolve({ ...base, overrides: { clockSourceId: undefined } }))
    expect(withEmpty).toBe(without)
  })
})

describe('the choice travels in the permalink', () => {
  const inputs = { ...DEFAULT_INPUTS, clockSourceId: 'roland-tr-1000' as const }

  it('round-trips', () => {
    const decoded = decodeGuideInputs(encodeGuideInputs(inputs, CATALOGUE), CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) throw new Error('expected ok')
    expect(decoded.inputs.clockSourceId).toBe('roland-tr-1000')
  })

  it('is absent from a link where nobody chose one', () => {
    // A link that carries the field where the reader never set it would claim a decision they
    // did not make, and the derived answer moves with the library where a pinned one does not.
    expect(encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)).not.toContain('clock=')
  })

  it('refuses an id this build does not ship', () => {
    const link = encodeGuideInputs(inputs, CATALOGUE).replace('clock=roland-tr-1000', 'clock=not-a-device')
    expect(decodeGuideInputs(link, CATALOGUE).ok).toBe(false)
  })
})

describe('withClockSource', () => {
  it('sets and clears, and clearing removes the field rather than nulling it', () => {
    const set = withClockSource(DEFAULT_INPUTS, 'roland-tr-1000')
    expect(set.clockSourceId).toBe('roland-tr-1000')
    expect(songOverrides(set).clockSourceId).toBe('roland-tr-1000')

    const cleared = withClockSource(set, undefined)
    expect('clockSourceId' in cleared).toBe(false)
  })

  it('keeps an id whose box has left the rig, and lets the resolver fall back', () => {
    // Deliberately unvalidated: a rig edit that removes the chosen box leaves the id pointing at
    // nothing, `selectClockSource` returns the ranked answer, and no cleanup pass is needed.
    const set = withClockSource(DEFAULT_INPUTS, 'roland-tr-8s')
    const withoutIt = DEVICES.filter((d) => d.id !== 'roland-tr-8s')
    const result = resolve({ ...base, devices: withoutIt, overrides: songOverrides(set) })
    expect(result.clockSource?.chosen).toBe(false)
    expect(result.clockSource).toBeDefined()
  })
})

/**
 * §3.3/#201. **Two numbered groups pair by ordinal, where one legend pairs by section.**
 *
 * The section rule was written against boxes that put pitch and gate under one panel legend. A
 * multitrack CV sequencer does not lay out that way, and until this the engine reported that a
 * Hapax could not play a Minitaur — the exact pair of boxes both products exist for.
 */
describe('pitch and gate pair by ordinal when no panel section pairs them (#201)', () => {
  const rig = DEVICES.filter((d) => ['moog-minitaur', 'squarp-hapax'].includes(d.id))

  it('routes a Hapax into a Minitaur', () => {
    const result = resolve({ devices: rig, template, mood: moodState(), seed: 3 })
    const patch = result.interDevicePatch
    expect(patch?.outcome).toBe('routed')
    expect(patch?.source?.deviceId).toBe('squarp-hapax')
    const target = patch?.targets.find((t) => t.deviceId === 'moog-minitaur')
    expect(target?.outcome).toBe('routed')
    // A pitch cable and a gate cable, which is what a voice needs to be played at all.
    expect(target?.cables).toHaveLength(2)
  })

  it('pairs the numbers rather than merely finding two sockets', () => {
    // The claim is `Cv out N` with `gate out N`, not "any CV with any gate". A pass that returned
    // a pair without matching the ordinals would satisfy the test above and still tell a reader
    // to patch CV 1 into gate 3.
    const result = resolve({ devices: rig, template, mood: moodState(), seed: 3 })
    const cables = result.interDevicePatch?.targets.find((t) => t.deviceId === 'moog-minitaur')?.cables ?? []
    const ordinal = (s: string) => /\s(\d+)$/.exec(s)?.[1]
    const used = cables.map((c) => ordinal(c.fromJack)).filter((n) => n !== undefined)
    expect(used.length).toBe(2)
    expect(new Set(used).size).toBe(1)
  })

  it('leaves a box that groups them by section alone', () => {
    // The ordinal rule is a fallback and must never override a panel that has answered the
    // question. The Minitaur groups PITCH CV and GATE under one CONTROLLER INPUTS legend, and its
    // manifest records that bundling as load-bearing.
    const minitaur = DEVICES.find((d) => d.id === 'moog-minitaur')!
    const controller = (minitaur.jacks ?? []).filter((j) => j.id.startsWith('CONTROLLER INPUTS · '))
    expect(controller.length).toBeGreaterThan(2)
    const result = resolve({ devices: rig, template, mood: moodState(), seed: 3 })
    const target = result.interDevicePatch?.targets.find((t) => t.deviceId === 'moog-minitaur')
    expect(target?.pitchJack).toBe('CONTROLLER INPUTS · PITCH CV')
    expect(target?.gateJack).toBe('CONTROLLER INPUTS · GATE')
  })
})
