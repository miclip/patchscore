import { describe, expect, it } from 'vitest'
import type { AuthoredParam, Recipe, SustainClaim, SustainControl } from '../lib/core/index'
import { RecipeSchema, SUSTAIN_KINDS, SustainClaimSchema } from '../lib/core/index'
import { ZERO_COUNTS, auditDevice, totalCounts } from '../scripts/audit-verified'
import { libraryCounts } from '../lib/studio/provenance'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { device, enumParam, numericParam, recipe } from './fixtures'

/**
 * §3/#506. **A recipe says whether its voice holds a note, instead of nothing saying so.**
 *
 * A Deluge wavetable pad was told *held for 64 steps* and the reader at the machine said it could
 * not be. Nothing in the model disagreed with the guide, because nothing in the model could: a
 * template asks for a hold, the resolver hands it to whichever voice serves the role, and there
 * was no fact anywhere about whether that voice sustains. This is the fact.
 *
 * It is one claim on a recipe about the amplitude stage — an envelope on the VCA, a gate-held
 * level, a VCA left open — shaped as a playback axis is (#518) but
 * typed as its own: a state, the settings that reach it, and a page or a unit that establishes
 * it. A file running out is not what it says — that is `playback.boundary`'s — so the eventual
 * rule over a hold reads both. This file covers the shape, its checks, and its counting, and pins
 * the two recipes that declare it first. What the guide does with it is `test/sustain-notice.test.ts`.
 */

const MANUAL = { kind: 'manual', source: 'fixture manual p.9' } as const
const OBSERVED = { kind: 'observed', source: 'fixture unit, firmware 1.11' } as const
const INHERENT = { kind: 'inherent' } as const

const SUSTAIN = numericParam({ name: 'SUSTAIN', value: 70 })
const AMP_MODE = enumParam({ name: 'AMP MODE', value: 'ADSR', options: { values: ['AD', 'ADSR'] } })
const BY_SUSTAIN: SustainControl = { kind: 'parameters', params: ['SUSTAIN'] }

const sustains: SustainClaim = { kind: 'sustains', control: BY_SUSTAIN, evidence: MANUAL }

/** A voice that makes its own sound: no `sourceAudio`, no `soundSetup`. */
function synth(sustain: unknown, params: AuthoredParam[] = [SUSTAIN, AMP_MODE]) {
  return recipe({
    role: 'pad',
    character: 'soft',
    voice: 'lt',
    params,
    ...(sustain === undefined ? {} : { sustain: sustain as SustainClaim }),
  })
}

/** A voice fed from a file, so the claim sits beside `sourceAudio` rather than inside it. */
function sampler(sustain: unknown, params: AuthoredParam[] = [SUSTAIN, AMP_MODE]) {
  return recipe({
    role: 'texture',
    character: 'soft',
    voice: 'lt',
    params,
    sourceAudio: {
      need: 'A sustained tonal source with no transient at the front',
      playback: {
        boundary: { kind: 'loops', control: INHERENT, evidence: MANUAL },
      },
    },
    ...(sustain === undefined ? {} : { sustain: sustain as SustainClaim }),
  })
}

/** A voice selecting one of the box's own sounds. */
function builtIn(sustain: unknown, params: AuthoredParam[] = [SUSTAIN, AMP_MODE]) {
  return recipe({
    role: 'pad',
    character: 'soft',
    voice: 'lt',
    params,
    soundSetup: { sound: 'the pad tone', prep: { text: 'Hold SOUND and turn the dial', verified: MANUAL } },
    ...(sustain === undefined ? {} : { sustain: sustain as SustainClaim }),
  })
}

const shapes = { synth, sampler, builtIn }

describe('a recipe classifies whether its voice holds a note (#506)', () => {
  it('takes both states, on a voice of every kind', () => {
    for (const [name, make] of Object.entries(shapes)) {
      for (const kind of SUSTAIN_KINDS) {
        const parsed = RecipeSchema.safeParse(make({ kind, control: BY_SUSTAIN, evidence: MANUAL }))
        expect(parsed.success, `${name} ${kind}`).toBe(true)
      }
    }
  })

  it('is optional: a recipe saying nothing about it is a recipe saying nothing', () => {
    for (const make of Object.values(shapes)) {
      expect(RecipeSchema.safeParse(make(undefined)).success).toBe(true)
    }
  })

  it('refuses a state that is not one of the two', () => {
    for (const kind of ['holds', 'loops', 'gated', '', undefined]) {
      const parsed = RecipeSchema.safeParse(synth({ kind, control: BY_SUSTAIN, evidence: MANUAL }))
      expect(parsed.success, String(kind)).toBe(false)
    }
  })

  it('is one claim, not a playback axis: a state of the other family is refused in both directions', () => {
    // `sustains` is not a fourth axis of `playback`, and `loops` is not a sustain state. The two
    // are independent claims and neither vocabulary admits the other's words.
    expect(SustainClaimSchema.safeParse({ kind: 'loops', control: INHERENT, evidence: MANUAL }).success).toBe(false)
    const wrongHome = sampler(undefined)
    const inPlayback = {
      ...wrongHome,
      sourceAudio: {
        ...wrongHome.sourceAudio,
        playback: { sustain: { kind: 'sustains', control: INHERENT, evidence: MANUAL } },
      },
    }
    expect(RecipeSchema.safeParse(inPlayback).success).toBe(false)
  })

  describe('control', () => {
    it('names parameters the recipe sets, and refuses every one it does not — at its own index', () => {
      for (const [name, make] of Object.entries(shapes)) {
        const parsed = RecipeSchema.safeParse(
          make({ kind: 'sustains', control: { kind: 'parameters', params: ['SUSTAIN', 'HOLD', 'AMP MODE', 'GATE'] }, evidence: MANUAL }),
        )
        expect(parsed.success, name).toBe(false)
        if (parsed.success) continue
        const paths = parsed.error.issues.map((issue) => issue.path.join('.'))
        expect(paths, name).toEqual(['sustain.control.params.1', 'sustain.control.params.3'])
        expect(parsed.error.issues[0]?.message).toContain("sustain names parameter 'HOLD'")
        expect(parsed.error.issues[0]?.message).toContain('#506')
        expect(parsed.error.issues[0]?.message).not.toContain('playback')
      }
    })

    it('checks against this recipe and not another: the same name is refused where the recipe lacks it', () => {
      // A source-less recipe authoring no SUSTAIN at all; the claim names it anyway.
      const parsed = RecipeSchema.safeParse(synth(sustains, [AMP_MODE]))
      expect(parsed.success).toBe(false)
    })

    it('takes a conjunction, every name checked', () => {
      const both = { kind: 'parameters', params: ['SUSTAIN', 'AMP MODE'] } as const
      expect(RecipeSchema.safeParse(synth({ kind: 'sustains', control: both, evidence: MANUAL })).success).toBe(true)
      expect(RecipeSchema.safeParse(sampler({ kind: 'sustains', control: both, evidence: MANUAL })).success).toBe(true)
    })

    it('takes `inherent` with no parameter, and refuses a parameter list with none', () => {
      expect(RecipeSchema.safeParse(synth({ kind: 'decays', control: INHERENT, evidence: MANUAL })).success).toBe(true)
      expect(
        RecipeSchema.safeParse(synth({ kind: 'decays', control: { kind: 'parameters', params: [] }, evidence: MANUAL })).success,
      ).toBe(false)
      expect(
        RecipeSchema.safeParse(synth({ kind: 'decays', control: { kind: 'inherent', params: ['SUSTAIN'] }, evidence: MANUAL })).success,
      ).toBe(false)
    })

    it('does not check a playback claim\'s names against a sustain claim\'s, or the reverse', () => {
      // `sourceAudio.playback` and `sustain` are checked by the same rule and reported at their own
      // paths: a bad name on one does not surface under the other.
      const parsed = RecipeSchema.safeParse(
        sampler({ kind: 'sustains', control: { kind: 'parameters', params: ['NOWHERE'] }, evidence: MANUAL }),
      )
      expect(parsed.success).toBe(false)
      if (parsed.success) return
      expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toEqual(['sustain.control.params.0'])
    })
  })

  describe('evidence', () => {
    it('is required, and is a page or a unit', () => {
      for (const evidence of [MANUAL, OBSERVED]) {
        expect(RecipeSchema.safeParse(synth({ kind: 'sustains', control: INHERENT, evidence })).success).toBe(true)
      }
      for (const evidence of [
        undefined,
        false,
        { kind: 'maker', source: 'a product page' },
        { kind: 'manual', source: '' },
        { kind: 'manual' },
      ]) {
        const parsed = RecipeSchema.safeParse(synth({ kind: 'sustains', control: INHERENT, evidence }))
        expect(parsed.success, JSON.stringify(evidence)).toBe(false)
      }
    })

    it('is its own and not inherited from the recipe\'s `verified`', () => {
      // A recipe-level `verified` is a default for params, patch and articulation (§3.1). It does
      // not reach here: a claim about what the voice does carries its own page or carries nothing.
      const parsed = RecipeSchema.safeParse({
        ...synth({ kind: 'sustains', control: INHERENT }),
        verified: MANUAL,
      })
      expect(parsed.success).toBe(false)
    })
  })

  it('is independent of the source\'s boundary: a looping file may still carry a `decays`', () => {
    // #518 wrote down that `boundary: 'loops'` is a fact about the file and not a promise the
    // part sounds for the whole hold; a file that stops is `boundary: 'stops-at-end'` and never a
    // `decays`. The two coexist, in either combination, and a rule over a hold reads both.
    for (const kind of SUSTAIN_KINDS) {
      expect(RecipeSchema.safeParse(sampler({ kind, control: INHERENT, evidence: MANUAL })).success, kind).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// The audit
// ---------------------------------------------------------------------------

describe('the audit counts a sustain claim as one capability fact (§9)', () => {
  const claimed = (sustain: SustainClaim | undefined, id: string): Recipe => ({
    ...synth(sustain),
    id,
  })

  it('one per declared claim, by the kind of evidence, and none for silence', () => {
    const d = device({
      recipes: [
        claimed(sustains, 'fx-a'),
        claimed({ kind: 'decays', control: INHERENT, evidence: OBSERVED }, 'fx-b'),
        claimed(undefined, 'fx-c'),
      ],
    })
    const { counts } = auditDevice(d)
    const before = Object.keys(d.capabilityEvidence ?? {}).length
    expect(counts.capabilityFacts - before).toBe(2)
    expect(counts.manualCapabilities).toBeGreaterThanOrEqual(1)
    expect(counts.observedCapabilities).toBeGreaterThanOrEqual(1)
  })

  it('moves the caps column and not the points: no reader dials a claim', () => {
    const silent = device({ recipes: [claimed(undefined, 'fx-a')] })
    const spoken = device({ recipes: [claimed(sustains, 'fx-a')] })
    const a = auditDevice(silent).counts
    const b = auditDevice(spoken).counts
    expect(b.params).toBe(a.params)
    expect(b.numerics).toBe(a.numerics)
    expect(b.capabilityFacts).toBe(a.capabilityFacts + 1)
    expect(b.manualCapabilities).toBe(a.manualCapabilities + 1)
  })

  it('keeps the capability identity', () => {
    const d = device({
      recipes: [claimed(sustains, 'fx-a'), claimed({ kind: 'decays', control: INHERENT, evidence: OBSERVED }, 'fx-b')],
    })
    const c = totalCounts([auditDevice(d)])
    expect(c.capabilityFacts).toBe(
      c.manualCapabilities +
        c.observedCapabilities +
        c.citedAgainstCapabilities +
        c.uncheckedCapabilities +
        c.undocumentedCapabilities +
        c.unreadCapabilities +
        c.partlyCapabilities,
    )
    expect(ZERO_COUNTS.capabilityFacts).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// The shipped library
// ---------------------------------------------------------------------------

describe('the shipped library (#506)', () => {
  /** The roles some shipped hook holds for a bar or more — the recipes a claim is owed on. */
  const HELD_ROLES = (() => {
    const longest = new Map<string, number>()
    for (const t of TEMPLATES) {
      for (const hook of t.hooks) {
        for (const note of hook.notes) {
          if (note.len > (longest.get(hook.forRole) ?? 0)) longest.set(hook.forRole, note.len)
        }
      }
    }
    return new Set([...longest].filter(([, len]) => len >= 16).map(([role]) => role))
  })()

  const claims = new Map<string, { deviceId: string; recipe: Recipe }[]>()
  for (const d of DEVICES) {
    for (const r of d.recipes) {
      if (r.sustain === undefined) continue
      const list = claims.get(r.id) ?? []
      list.push({ deviceId: d.id, recipe: r })
      claims.set(r.id, list)
    }
  }

  it('names parameters the recipe sets, on every claim that names any', () => {
    const broken: string[] = []
    for (const d of DEVICES) {
      for (const r of d.recipes) {
        const control = r.sustain?.control
        if (control?.kind !== 'parameters') continue
        for (const name of control.params) {
          if (!r.params.some((p) => p.name === name)) broken.push(`${d.id} ${r.id}: ${name}`)
        }
      }
    }
    expect(broken).toEqual([])
  })

  /**
   * The first two, pinned by name. Both hold on an ADSR whose sustain level the recipe sets, and
   * both name the setting that puts the envelope on the loudness where the box has one.
   *
   *  - `mf-pad-soft`: MicroFreak p.56 — *"It will remain in the Sustain stage for as long as your
   *    finger touches the keyboard"*; `Sustain 78` is the level and `Amp Mod On` is what routes
   *    the envelope to the VCA at all (p.56, *"the envelope will control both the volume and the
   *    filter cutoff"*). Rendered and read.
   *  - `mpc-pad-soft`: MPC v3.7 p.517 — Amp `Sustain` is the *"Level that a sustained note is
   *    held at"*; `Amp Sustain 78`. Rendered and read, and v3.9 p.436 prints the same sentence.
   */
  it('declares the MicroFreak soft pad, off its own Sustain and Amp Mod', () => {
    const mf = claims.get('mf-pad-soft')
    expect(mf?.map((c) => c.deviceId)).toEqual(['arturia-microfreak'])
    expect(mf?.[0]?.recipe.sustain).toEqual({
      kind: 'sustains',
      control: { kind: 'parameters', params: ['Sustain', 'Amp Mod'] },
      evidence: { kind: 'manual', source: 'MicroFreak User Manual 4.0.3 p.56' },
    })
    // The claim rests on both settings being what the recipe authors.
    const params = mf?.[0]?.recipe.params ?? []
    expect(params.find((p) => p.name === 'Sustain')).toMatchObject({ kind: 'numeric', value: 78 })
    expect(params.find((p) => p.name === 'Amp Mod')).toMatchObject({ kind: 'enum', value: 'On' })
  })

  it('declares the MPC soft pad on all three MPCs, each on its own document', () => {
    const mpc = claims.get('mpc-pad-soft') ?? []
    expect(mpc.map((c) => c.deviceId).sort()).toEqual(['akai-mpc-live-iii', 'akai-mpc-one-g2', 'akai-mpc-xl'])
    for (const { deviceId, recipe: r } of mpc) {
      expect(r.sustain?.kind, deviceId).toBe('sustains')
      expect(r.sustain?.control, deviceId).toEqual({ kind: 'parameters', params: ['Amp Sustain'] })
      expect(r.params.find((p) => p.name === 'Amp Sustain'), deviceId).toMatchObject({ kind: 'numeric', value: 78 })
    }
    const source = (id: string) => mpc.find((c) => c.deviceId === id)?.recipe.sustain?.evidence.source
    // The XL takes the recipe by reference; the One G2 rewrites the page onto its own manual, as
    // it does every other p.517 value (`PAGES[517]` is 436, and that page was opened).
    expect(source('akai-mpc-live-iii')).toBe('MPC Live III / MPC XL User Guide v3.7, p.517')
    expect(source('akai-mpc-xl')).toBe(source('akai-mpc-live-iii'))
    expect(source('akai-mpc-one-g2')).toBe('MPC Standalone OS User Guide v3.9, p.436')
  })

  /**
   * **The manifests read for sustain, and what each established.** Every device here has had
   * amplitude-stage page rendered and read, and its held-role recipes classified or deliberately
   * left; each device's own test file pins the page and the parameters. A device absent from this
   * table has not been read, and its silence means exactly that (§3/#506). The next declaration
   * is a deliberate one with a page behind it, not a field somebody spread from a template.
   */
  const MPC_UNREAD = ['mpc-sub-dark', 'mpc-acid-hard', 'mpc-texture-soft']
  const READ: Record<string, { sustains?: string[]; decays?: string[]; unestablished?: string[] }> = {
    // The pad's page is TubeSynth's envelope tab (v3.7 p.517). The other three held-role recipes
    // are a Bassline plugin and a drum-pad sample, whose pages have not been opened for this.
    'akai-mpc-live-iii': { sustains: ['mpc-pad-soft'], unestablished: MPC_UNREAD },
    'akai-mpc-one-g2': { sustains: ['mpc-pad-soft'], unestablished: MPC_UNREAD },
    'akai-mpc-xl': { sustains: ['mpc-pad-soft'], unestablished: MPC_UNREAD },
    'arturia-microfreak': {
      sustains: [
        'mf-pad-soft', 'mf-pad-dark', 'mf-pad-bright', 'mf-sub-dark', 'mf-sub-clean',
        'mf-texture-dark', 'mf-texture-soft',
      ],
    },
    'behringer-model-d': {
      sustains: [
        'model-d-sub-dark', 'model-d-sub-clean', 'model-d-acid-bright', 'model-d-pad-soft',
        'model-d-texture-soft',
      ],
    },
    'behringer-neutron': {
      sustains: [
        'neutron-sub-dark', 'neutron-sub-clean', 'neutron-acid-bright', 'neutron-acid-dirty',
        'neutron-pad-soft', 'neutron-pad-dark', 'neutron-texture-soft',
      ],
    },
    'behringer-rd-8': { decays: ['rd8-sub-dark'] },
    'behringer-rd-9': { decays: ['rd9-sub-dark'] },
    'elektron-digitakt': {
      decays: ['dt-sub-dark', 'dt-acid-hard', 'dt-pad-soft'],
      // `HOLD 96` and no `AMP DEC`: the decay could be anything up to `INF`.
      unestablished: ['dt-texture-soft'],
    },
    'elektron-digitone': { sustains: ['dn-sub-dark', 'dn-pad-soft', 'dn-acid-dirty', 'dn-texture-soft'] },
    // The amplifier EG's level decides, p.15: three subs above zero, four recipes at zero.
    'moog-minitaur': {
      sustains: ['minitaur-sub-dark', 'minitaur-sub-clean', 'minitaur-sub-soft'],
      decays: ['minitaur-sub-hard', 'minitaur-acid-dirty', 'minitaur-acid-bright', 'minitaur-acid-hard'],
    },
    // p.16: `SUSTAIN ON` under `EG` holds, `OFF` decays, `VCA MODE ON` holds with no envelope.
    'moog-mother-32': {
      sustains: ['m32-sub-dark', 'm32-sub-clean', 'm32-pad-soft', 'm32-texture-soft'],
      decays: ['m32-acid-dirty', 'm32-acid-bright'],
    },
    'moog-muse': {
      sustains: [
        'muse-pad-soft', 'muse-pad-dark', 'muse-pad-bright', 'muse-sub-dark', 'muse-sub-clean',
        'muse-texture-soft', 'muse-texture-dirty',
      ],
    },
    // p.25: the VCA holds under a gate and decays under a trigger, and which one a note arrives
    // as is how the part is played rather than a setting on the recipe. Read, and left.
    'moog-subharmonicon': {
      unestablished: [
        'subh-sub-dark', 'subh-pad-soft', 'subh-pad-dark', 'subh-pad-bright', 'subh-acid-dirty',
        'subh-texture-soft',
      ],
    },
    'moog-subsequent-37': {
      sustains: [
        'sub37-sub-dark', 'sub37-sub-dirty', 'sub37-acid-dirty', 'sub37-acid-bright',
        'sub37-acid-hard', 'sub37-texture-soft', 'sub37-pad-dark',
      ],
    },
    // Envelope A normalled to VCA A (p.53), gated from EXT IN (p.32). The acids sit at 0 V and
    // author no VCA bias (p.52), so which way their note ends is not on the recipe; read, left.
    'intellijel-cascadia': {
      sustains: ['cascadia-sub-dark', 'cascadia-sub-clean', 'cascadia-texture-soft', 'cascadia-pad-dark'],
      unestablished: ['cascadia-acid-dirty', 'cascadia-acid-bright'],
    },
    'korg-minilogue-xd': {
      sustains: [
        'mxd-pad-soft', 'mxd-pad-dark', 'mxd-pad-bright', 'mxd-pad-clean', 'mxd-pad-dirty',
        'mxd-pad-hard', 'mxd-sub-dark', 'mxd-sub-clean', 'mxd-texture-soft', 'mxd-texture-dirty',
      ],
    },
    // An attack and a decay and no third stage, on a box with triggers and no gate (pp.20-21).
    'moog-dfam': { decays: ['dfam-sub-dark', 'dfam-texture-soft'] },
    // Four under `VCA MODE ENV` on the slider, the texture under `DRONE` on the switch alone.
    'moog-grandmother': {
      sustains: ['gm-sub-dark', 'gm-acid-bright', 'gm-texture-soft', 'gm-pad-soft', 'gm-pad-dark'],
    },
    'moog-matriarch': {
      sustains: ['mat-sub-dark', 'mat-acid-bright', 'mat-texture-soft', 'mat-pad-soft', 'mat-pad-dark'],
    },
    // `env 1 sustain` on the reference's p.4 and Macro 3's *Amp Envelope* label on the guide's
    // p.63, with env 1 = amplitude the folder's inference: an inference is not a page. Read, left.
    'novation-circuit-tracks': {
      unestablished: ['ct-sub-dark', 'ct-acid-dirty', 'ct-pad-soft', 'ct-texture-dark'],
    },
    // The Volume row's envelope (pp.115, 120); the Granular texture puts none there.
    'polyend-tracker': {
      sustains: ['tr-sub-dark', 'tr-pad-soft'],
      decays: ['tr-acid-hard'],
      unestablished: ['tr-texture-soft'],
    },
    // A sample instrument's Envelope page (p.126) and a synth's Amplifier section (p.154); the
    // VAP pads author neither a sustain nor a decay.
    'polyend-tracker-mini': {
      sustains: ['tm-pad-soft-chord', 'tm-texture-soft', 'tm-sub-dark'],
      decays: ['tm-acid-dirty-sample', 'tm-acid-dirty-synth'],
      unestablished: ['tm-pad-soft-sample', 'tm-pad-soft-synth'],
    },
    // p.20's control list: `VCA MODE` *"select envelope, and the VCA is modulated by the envelope.
    // In the ON position, the VCA output is the last key played, and is independent of envelope"*,
    // and `SUSTAIN ON/OFF` *"in the OFF position, the level will start to decay after the attack
    // time is over. In the ON position, the sustain level will be held for as long as the key is
    // held"*. The Mother-32's reading (p.16) on a box built to the same plan, and the two agreeing
    // on different wording is part of why this one is declarable.
    'behringer-crave': {
      sustains: ['crave-sub-dark', 'crave-texture-soft'],
      decays: ['crave-acid-dirty', 'crave-acid-bright'],
    },
    // p.79: the AMP page has no sustain stage at all, and a fixed `HLD` (1-127) runs *"regardless
    // of how long the pad is pressed"* — so neither recipe follows a hook's hold. What stops that
    // being a `decays` is that the same page prints `HLD`'s range and **not** the amp `DEC`'s, and
    // neither recipe authors `DEC`: a decay that never reaches silence is not the other claim
    // either, it is a third thing this vocabulary does not carry. Read, and left.
    'elektron-analog-rytm-mkii': {
      unestablished: ['rytm-sub-dark', 'rytm-texture-soft'],
    },
    // **The three Elektrons whose recipes set the envelope's shape and leave its levels.** All
    // twelve are read and left, and the reason is one reason, which is why they sit together:
    // each recipe authors the machine and the envelope *mode* and stops there, so the parameter
    // that would decide sustain is the reader's. It is the Digitakt's own bar (`dt-texture-soft`
    // above), applied to the boxes that turned out to be entirely on the far side of it.
    //
    // Digitakt II p.56 and Digitone II p.61 carry identical wording. `SUS` is *"only available
    // if MODE is set to ADSR"*, so the `ADSR` recipes could sustain — but none of them authors
    // `SUS`, and the level could be zero. The `AHD` recipes author a fixed `HOLD`, which *"ignores
    // Note Off events such as Trig Length"* and so does not follow a hook's hold at all; but the
    // tip that the sound sustains *"if DEC is set to less than 127"* is what makes `DEC` load-
    // bearing, and none of them authors `DEC` either.
    'elektron-digitakt-ii': {
      unestablished: ['dt2-sub-dark', 'dt2-texture-soft', 'dt2-acid-hard', 'dt2-pad-soft'],
    },
    'elektron-digitone-ii': {
      unestablished: ['dn2-sub-dark', 'dn2-pad-soft', 'dn2-acid-dirty', 'dn2-texture-soft'],
    },
    // p.59: `AMP` (`ANLG`/`RTRG`/`R+T`/`TTRG`) sets where the attack *starts* — *"from the current
    // envelope level"* or *"from zero"* — and says nothing about whether the note holds. That is
    // the one amp parameter these four author; `HOLD` and `REL`, which would decide it, are left.
    // A claim read off `AMP` would be a citation off the wrong parameter.
    'elektron-octatrack-mkii': {
      unestablished: ['ot-sub-dark', 'ot-texture-soft', 'ot-pad-soft', 'ot-acid-hard'],
    },
    // The box #506 was reported on. p.83's synthesizer table gives every `ENVELOPE 1` stage as
    // *"Default to volume amplitude"*, so `ENV 1 SUSTAIN` above zero holds the note — which is a
    // page, where the Circuit Tracks above has only an inference. The DX7 texture is left: that
    // engine's shortcut opens `ENV 1` so the patch's own operator envelopes can be heard, and the
    // `.syx` this recipe does not author is what decides.
    'synthstrom-deluge': {
      sustains: ['deluge-sub-dark', 'deluge-pad-soft', 'deluge-acid-dirty'],
      unestablished: ['deluge-texture-soft'],
    },
  }

  it('declares exactly what the read record says, per device, and nothing on a device not read', () => {
    for (const d of DEVICES) {
      const record = READ[d.id]
      const sustains = d.recipes.filter((r) => r.sustain?.kind === 'sustains').map((r) => r.id)
      const decays = d.recipes.filter((r) => r.sustain?.kind === 'decays').map((r) => r.id)
      expect(sustains, `${d.id} sustains`).toEqual(record?.sustains ?? [])
      expect(decays, `${d.id} decays`).toEqual(record?.decays ?? [])
      for (const id of record?.unestablished ?? []) {
        const r = d.recipes.find((recipe) => recipe.id === id)
        expect(r, `${d.id} ${id}`).toBeDefined()
        expect(r?.sustain, `${d.id} ${id}`).toBeUndefined()
      }
      // On a read device the record is exhaustive: every held-role recipe is declared or named
      // as left, so a recipe added to a held role has to be read or listed.
      if (record !== undefined) {
        const left = d.recipes
          .filter((r) => HELD_ROLES.has(r.role) && r.sustain === undefined)
          .map((r) => r.id)
        expect(left, `${d.id} unestablished`).toEqual(record.unestablished ?? [])
      }
    }
    // The table names no device the library lacks.
    for (const id of Object.keys(READ)) expect(DEVICES.some((d) => d.id === id), id).toBe(true)
  })

  /**
   * #506's exposure figure, kept honest: of every recipe on a role some shipped hook holds for a
   * bar or more, how many carry a claim, how many were read and left, and how many nobody has
   * opened a page for. The first two are the modelled set; the third is the debt.
   */
  it('has modelled more than half of the held-role recipes, and names the rest as unread', () => {
    let held = 0
    let claimed = 0
    let left = 0
    for (const d of DEVICES) {
      for (const r of d.recipes) {
        if (!HELD_ROLES.has(r.role)) continue
        held++
        if (r.sustain !== undefined) claimed++
        else if (READ[d.id] !== undefined) left++
      }
    }
    expect(held).toBe(174)
    expect(claimed).toBe(99)
    expect(left).toBe(40)
    expect(claimed + left).toBeGreaterThan(held / 2)
  })

  it('counts ninety-eight distinct claims in the library, on twenty-nine manifests read', () => {
    // Per distinct recipe: the XL takes the Live III's by reference and is not counted twice;
    // the One G2 rewrites its citation and is. The figure is the `caps` delta the audit reports.
    const ordered = [...DEVICES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const seen = new Set<string>()
    let distinct = 0
    for (const d of ordered) {
      for (const r of d.recipes) {
        const key = JSON.stringify(r)
        if (seen.has(key)) continue
        seen.add(key)
        if (r.sustain !== undefined) distinct++
      }
    }
    expect(distinct).toBe(98)
    expect(Object.keys(READ)).toHaveLength(29)
  })

  /**
   * §9. The `caps` total is the manifests' facts plus the recipes' declared claims — playback
   * axes and sustain claims — and nothing else. De-duplicated as `libraryCounts` does it: a
   * recipe two manifests share by reference is one recipe (#193).
   */
  it('is counted in the library total, once per distinct recipe', () => {
    const ordered = [...DEVICES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    const seen = new Set<string>()
    let recipeClaims = 0
    let evidence = 0
    for (const d of ordered) {
      evidence += Object.keys(d.capabilityEvidence ?? {}).length
      for (const r of d.recipes) {
        const key = JSON.stringify(r)
        if (seen.has(key)) continue
        seen.add(key)
        const playback = r.sourceAudio?.playback
        if (playback !== undefined) {
          recipeClaims += [playback.boundary, playback.timing, playback.release].filter((c) => c !== undefined).length
        }
        if (r.sustain !== undefined) recipeClaims++
      }
    }
    expect(libraryCounts(DEVICES).capabilityFacts).toBe(evidence + recipeClaims)
  })
})
