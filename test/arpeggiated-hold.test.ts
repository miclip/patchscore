import { describe, expect, it } from 'vitest'
import {
  ARPEGGIATOR_FACT,
  DeviceSchema,
  RiffSchema,
  hasArpeggiator,
  resolveRiff,
  widestHold,
  type Device,
  type Riff,
} from '../lib/core/index'
import { at, on, variant } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { presetSession } from '../lib/studio/preset-session'
import { riffGap } from '../lib/studio/riff-text'
import { FIXTURE_CITE, device, heldRiff, recipe } from './fixtures'

/**
 * §2.6/§5A.2/§12.4/#645. **A held chord under an arpeggiator costs one voice, and only a box
 * that says it has an arpeggiator gets to sound one.**
 *
 * Two halves and a join. The device half is a capability fact like any other, cited or refused.
 * The riff half is a declaration that the hook's chords are held for the arpeggiator to play one
 * note at a time. The join is the whole point: a riff making that claim is making it about the
 * box, so it may only be played by a box that declares the fact, and a figure claiming it on a
 * box with none is a gap rather than an exemption. Without the join any figure could exempt
 * itself from polyphony by asserting an arpeggiator, and `patchPolyphony` would be advisory.
 */

const CITE = { kind: 'manual', source: 'X Manual, p.40' } as const

/** A one-voice synth with a soft pad recipe capped at one note — the Subsequent 37's shape. */
function monoSynth(over: Partial<Device> = {}): Device {
  return device({
    id: 'fixture-mono',
    name: 'Fixture Mono',
    kind: 'synth',
    voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['pad', 'arp'], polyphony: 1 }],
    features: undefined,
    recipes: [
      recipe({
        id: 'fx-pad-soft',
        role: 'pad',
        character: 'soft',
        voice: 'voice',
        title: 'Soft pad',
        articulation: undefined,
        patchPolyphony: 1,
      }),
    ],
    ...over,
  })
}

/** The same synth, saying it has an arpeggiator and citing the page. */
function arpSynth(over: Partial<Device> = {}): Device {
  return monoSynth({
    features: { arpeggiator: true },
    capabilityEvidence: { [ARPEGGIATOR_FACT]: CITE },
    ...over,
  })
}

/** Four notes held for two bars: a chord, and a hold of more than one note at every step. */
const FOUR_HELD: Riff['hook'] = {
  id: 'fixture-arp-hold-hook',
  forRole: 'pad',
  bars: 2,
  baseOctave: 3,
  notes: [
    { step: 1, degree: 1, octave: 0, len: 32 },
    { step: 1, degree: 3, octave: 0, len: 32 },
    { step: 1, degree: 5, octave: 0, len: 32 },
    { step: 1, degree: 1, octave: 1, len: 32 },
  ],
}

/** The fourth shape: a held riff, four notes down, `arpeggiatedHold`, and no `polyphony`. */
function arpHold(over: Partial<Riff> = {}): Riff {
  return heldRiff({ arpeggiatedHold: true, hook: FOUR_HELD, ...over })
}

/** The same four notes without the declaration: a chord the box has to sound at once. */
function plainHold(over: Partial<Riff> = {}): Riff {
  return heldRiff({ hook: FOUR_HELD, request: { ...heldRiff().request, polyphony: 4 }, ...over })
}

function refusal(candidate: unknown): string {
  const parsed = RiffSchema.safeParse(candidate)
  expect(parsed.success, 'expected this riff to be refused').toBe(false)
  return parsed.success ? '' : (parsed.error.issues[0]?.message ?? '')
}

describe('features.arpeggiator is a cited claim, in both directions (§2.6/#645)', () => {
  it('refuses a declaration with no citation behind it', () => {
    const parsed = DeviceSchema.safeParse(monoSynth({ features: { arpeggiator: true } }))
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain('no citation')
  })

  it('refuses a citation with no declaration behind it', () => {
    const parsed = DeviceSchema.safeParse(
      monoSynth({ capabilityEvidence: { [ARPEGGIATOR_FACT]: CITE } }),
    )
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain('cited-against')
  })

  it('accepts a declaration with its citation, and a reasoned absence with none', () => {
    const declared = DeviceSchema.safeParse(arpSynth())
    expect(declared.success, JSON.stringify(declared.error?.issues[0])).toBe(true)
    // The other reading somebody may come back with: the manual was read and has no arpeggiator.
    const against = DeviceSchema.safeParse(
      monoSynth({
        capabilityEvidence: {
          [ARPEGGIATOR_FACT]: { kind: 'cited-against', reason: 'p.25 lists none', cite: CITE },
        },
      }),
    )
    expect(against.success, JSON.stringify(against.error?.issues[0])).toBe(true)
  })

  it('is declared `true` or not at all', () => {
    const parsed = DeviceSchema.safeParse(
      monoSynth({
        features: { arpeggiator: false } as never,
        capabilityEvidence: { [ARPEGGIATOR_FACT]: CITE },
      }),
    )
    expect(parsed.success).toBe(false)
    expect(hasArpeggiator(monoSynth())).toBe(false)
    expect(hasArpeggiator(arpSynth())).toBe(true)
  })
})

describe('an arpeggiated hold is the fourth shape (§5A.2/#645)', () => {
  it('parses: held, four notes down, one voice asked for', () => {
    const parsed = RiffSchema.safeParse(arpHold())
    expect(parsed.success, JSON.stringify(parsed.error?.issues[0])).toBe(true)
    expect(widestHold(FOUR_HELD)).toBe(4)
  })

  it('is held on a struck role too: no grid, no flag, and the struck-role question is not asked', () => {
    const struck = arpHold({
      request: { ...heldRiff().request, role: 'arp', character: 'bright' },
      hook: { ...FOUR_HELD, forRole: 'arp' },
    })
    const parsed = RiffSchema.safeParse(struck)
    expect(parsed.success, JSON.stringify(parsed.error?.issues[0])).toBe(true)
  })

  it('refuses a grid: the arpeggiator is the rhythm', () => {
    const gridded = arpHold({
      request: { ...heldRiff().request, role: 'arp', character: 'bright' },
      hook: { ...FOUR_HELD, forRole: 'arp' },
      pattern: variant('fixture-arp-grid', 'arp', 0, 16, at('accent', 110, 1), on('offbeat', 3)),
    })
    expect(refusal(gridded)).toContain('arpeggiator is the rhythm')
  })

  it('refuses `reArticulatesHook` in either spelling', () => {
    for (const flag of [true, false]) {
      const flagged = arpHold({
        request: { ...heldRiff().request, role: 'arp', character: 'bright', reArticulatesHook: flag },
        hook: { ...FOUR_HELD, forRole: 'arp' },
      })
      expect(refusal(flagged), String(flag)).toContain('no grid to re-articulate')
    }
  })

  it('refuses a `polyphony` above one: the hold sounds one note at a time', () => {
    const wide = arpHold({ request: { ...heldRiff().request, polyphony: 4 } })
    expect(refusal(wide)).toContain('asks for one voice, not 4')
    // Stated as 1 it is the default said out loud, and is accepted.
    const one = arpHold({ request: { ...heldRiff().request, polyphony: 1 } })
    expect(RiffSchema.safeParse(one).success).toBe(true)
  })

  it('refuses a hold of one note: there is nothing to arpeggiate', () => {
    const single = arpHold({ hook: heldRiff().hook })
    expect(widestHold(heldRiff().hook)).toBe(1)
    expect(refusal(single)).toContain('nothing for the arpeggiator to run through')
  })
})

describe('a held chord under an arpeggiator costs one voice, on a box that declares one (§12.4/#645)', () => {
  it('is refused on a box with no arpeggiator, as a gap that names the arpeggiator', () => {
    const result = resolveRiff(arpHold(), [monoSynth()])
    expect(result.outcome).toBe('gap')
    if (result.outcome !== 'gap') return
    expect(result.gap.reason).toBe('no-capable-voice')
    if (result.gap.reason !== 'no-capable-voice') return
    expect(result.gap.because).toBe('no-arpeggiator')
    expect(result.gap.roleVoices.map((a) => a.label)).toEqual(['Voice'])
  })

  it('is refused on a wide box with no arpeggiator too: the claim is the arpeggiator, not the width', () => {
    // Four voices could hold the chord as a chord. That is a different figure, and the riff did
    // not write it: it holds four for an arpeggiator to play one at a time.
    const wide = monoSynth({
      voices: [{ kind: 'fixed', id: 'voice', label: 'Voice', roles: ['pad'], polyphony: 4 }],
      recipes: [recipe({ id: 'fx-pad-soft', role: 'pad', character: 'soft', voice: 'voice', articulation: undefined })],
    })
    const result = resolveRiff(arpHold(), [wide])
    expect(result.outcome === 'gap' && result.gap.reason === 'no-capable-voice' && result.gap.because).toBe(
      'no-arpeggiator',
    )
  })

  it('plays on the box that declares it, on the one-note patch, spending one voice', () => {
    const result = resolveRiff(arpHold(), [arpSynth()])
    expect(result.outcome, JSON.stringify(result.outcome === 'gap' ? result.gap : '')).toBe('played')
    if (result.outcome !== 'played') return
    expect(result.voice.recipe.id).toBe('fx-pad-soft')
    expect(result.voice.recipe.patchPolyphony).toBe(1)
    expect(result.voice.stackWidth).toBe(1)
    expect(result.voice.assignables).toHaveLength(1)
  })

  it('is the declaration that changes the answer: the same four notes held as a chord are refused', () => {
    const result = resolveRiff(plainHold(), [arpSynth()])
    expect(result.outcome).toBe('gap')
    if (result.outcome !== 'gap' || result.gap.reason !== 'no-capable-voice') return
    expect(result.gap.because).toBe('polyphony')
    expect(result.gap.notes).toBe(4)
  })

  it('reports no-such-role ahead of no-arpeggiator: nothing to hold the chord on comes first', () => {
    const drums = device()
    expect(drums.voices.some((v) => v.roles.includes('pad'))).toBe(false)
    const result = resolveRiff(arpHold(), [drums])
    expect(result.outcome === 'gap' && result.gap.reason === 'no-capable-voice' && result.gap.because).toBe(
      'no-such-role',
    )
  })

  it('says on the page that the arpeggiator is what is missing, as a box to add', () => {
    const rig = [monoSynth()]
    const result = resolveRiff(arpHold(), rig)
    if (result.outcome !== 'gap') throw new Error('expected a gap')
    const sentence = riffGap(arpHold(), result.gap, rig)
    expect(sentence).toContain('one note at a time')
    expect(sentence).toContain('Fixture Mono Voice could play pad')
    expect(sentence).toContain('Add a box with one.')
  })
})

/**
 * §12.4/#645. The box the issue was written on. `polyphony: 2`, every mono recipe at
 * `patchPolyphony: 1`, and an arpeggiator filed under `ARPEGGIATOR (PRESET EDIT 1.1)`: four notes
 * held on it are refused as a chord and played as an arpeggiated hold, on the same recipe.
 */
describe('the Subsequent 37 holds four notes under its arpeggiator and no other way', () => {
  const sub37 = DEVICES.find((d) => d.id === 'moog-subsequent-37') as Device
  const request = { ...heldRiff().request, role: 'arp' as const, character: 'bright' as const }
  const hook = { ...FOUR_HELD, forRole: 'arp' as const }

  it('declares the arpeggiator, cited to the preset-edit page', () => {
    expect(hasArpeggiator(sub37)).toBe(true)
    expect(sub37.capabilityEvidence?.[ARPEGGIATOR_FACT]).toEqual({
      kind: 'manual',
      source: "Subsequent 37 User's Manual, p.40",
    })
  })

  it('plays a four-note arpeggiated hold on a one-note arp recipe', () => {
    const result = resolveRiff(arpHold({ request, hook }), [sub37])
    expect(result.outcome, JSON.stringify(result.outcome === 'gap' ? result.gap : '')).toBe('played')
    if (result.outcome !== 'played') return
    expect(result.voice.device.id).toBe('moog-subsequent-37')
    expect(result.voice.recipe.patchPolyphony).toBe(1)
    expect(result.voice.stackWidth).toBe(1)
  })

  it('refuses the same four notes as a chord', () => {
    const result = resolveRiff(plainHold({ request: { ...request, polyphony: 4 }, hook }), [sub37])
    expect(result.outcome === 'gap' && result.gap.reason === 'no-capable-voice' && result.gap.because).toBe(
      'polyphony',
    )
  })

  it('is refused at authoring time on a box that ships the patch and declares no arpeggiator', () => {
    // The preset session is where a figure meets the box that ships its patch, and a figure the
    // box cannot play throws there rather than rendering a gap at somebody standing at it. Here
    // the box is the Subsequent 37 with its declaration stripped, and a figure named for a
    // patch it ships, holding four notes under an arpeggiator it no longer says it has.
    const { [ARPEGGIATOR_FACT]: _cite, ...evidence } = sub37.capabilityEvidence ?? {}
    const { features: _features, ...rest } = sub37
    const stripped: Device = {
      ...rest,
      capabilityEvidence: evidence,
      patchUses: [...(sub37.patchUses ?? []), { name: 'Harp C Chord', use: 'A chord, held' }],
    }
    const figure = arpHold({
      id: 'harp-c-chord-fixture',
      name: 'The Harp C Chord fixture',
      reference: { kind: 'patch', name: 'Harp C Chord' },
      request,
      hook,
    })
    expect(() => presetSession(stripped, [figure])).toThrow(/no-capable-voice/)
    // And lands, on the box as shipped.
    const session = presetSession(
      { ...sub37, patchUses: stripped.patchUses },
      [figure],
    )
    const entry = session?.entries.find((e) => e.patch.name === 'Harp C Chord')
    expect(entry?.figure?.resolution.outcome).toBe('played')
    expect(entry?.figure?.voice.stackWidth).toBe(1)
  })
})
