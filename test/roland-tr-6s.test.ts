import { describe, expect, it } from 'vitest'
import { DeviceSchema, ROLES, expand, type AuthoredParam, type Recipe } from '../lib/core/index'
import { device } from '../lib/devices/roland-tr-6s/index'
import { device as tr8s } from '../lib/devices/roland-tr-8s/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The TR-6S is the third Roland drum machine in the library and the first one that is a **cut
 * down** version of a box already in it. That is what this file is for: the schema re-parses the
 * manifest in codegen, and the interesting failures here are all the ones where the TR-8S's
 * answer is close enough to look right and is wrong.
 *
 * Three of them, and each has a test below.
 *
 *  - **Six instruments, not eleven.** No RS, no MT/HT, no CC, no RC.
 *  - **The Parameter Guide is a lightly-edited copy of the TR-8S's and still says so** — it names
 *    a TRIGGER OUT this box does not have and calls the buttons `[BD]–[RC]`. A manifest that
 *    trusted the page would put a trigger output on a box whose only output is a stereo pair.
 *  - **No documented per-step velocity.** Both siblings declare `velocity` off a page that prints
 *    the gesture; no page here does, so this box does not claim it.
 */

const PARAMETER = 'TR-6S Parameter Guide eng02, p.'
const OWNERS = "TR-6S Owner's Manual eng02, p."

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

/** The category and engine a recipe requires in the slot, as free text. Every recipe has one. */
function toneOf(recipe: Recipe): string {
  const tone = paramNamed(recipe, 'TONE')
  if (tone === undefined || tone.kind !== 'text') throw new Error(`${recipe.id}: no TONE`)
  return tone.value
}

/** Every legality citation a recipe carries: a numeric's range, an enum's option set. */
function legality(recipe: Recipe): string[] {
  return params(recipe)
    .flatMap((p) =>
      p.kind === 'numeric' ? [p.range.verified] : p.kind === 'enum' ? [p.options.verified] : [],
    )
    .filter((v): v is { kind: 'manual' | 'observed'; source: string } => v !== undefined && v !== false)
    .map((v) => v.source)
}

describe('TR-6S manifest', () => {
  it('parses', () => {
    expect(() => DeviceSchema.parse(device)).not.toThrow()
  })

  it('is six instruments, and they are the six the panel prints', () => {
    expect(device.voices.map((v) => v.id)).toEqual(['bd', 'sd', 'lt', 'hc', 'ch', 'oh'])
    // The five the TR-8S has and this box does not. Named rather than counted, because a count
    // passes if somebody adds a rim shot and deletes a hihat.
    const absent = ['mt', 'ht', 'rs', 'cc', 'rc']
    for (const id of absent) expect(device.voices.map((v) => v.id)).not.toContain(id)
    for (const id of absent) expect(tr8s.voices.map((v) => v.id)).toContain(id)
    expect(device.voices.every((v) => v.polyphony === 1)).toBe(true)
  })

  it('claims no trigger transport, whatever the Parameter Guide says', () => {
    // p.12's `Inst Note` explanation ends "...and TRIGGER OUT", inherited verbatim from the
    // TR-8S's document. The rear panel (Owner's p.6) has no such jack, so the claim does not
    // travel — and the sibling, which does have one, still makes it.
    expect(device.clock.transport).toEqual(['midi-din', 'usb'])
    expect(device.clock.transport).not.toContain('trigger')
    expect(tr8s.clock.transport).toContain('trigger')
    expect(device.jacks?.map((j) => j.id).sort()).toEqual([
      'MIDI · IN',
      'MIDI · OUT',
      'OUT · L/MONO',
      'OUT · R',
      'PHONES',
    ])
  })

  it('has one stereo pair and no individual outs, where the TR-8S has six', () => {
    expect(device.io).toEqual({ main: 'stereo', individualOuts: 0, audioIn: false, usbAudio: true })
    expect(tr8s.io.individualOuts).toBe(6)
    // The side chain exists and its input does not: `KIT: EXT IN` is fed by `USB EXT IN`.
    expect(device.features?.sidechain).toEqual({ internal: true, fromExternalAudio: false })
  })

  it('does not claim a per-step velocity, and both siblings do', () => {
    // Owner's p.38 titles the section "...and Dynamics" and p.20 names the "MOTION/VELOCITY
    // input screen", but no page prints a procedure or a range for a per-step velocity value.
    expect(device.features?.perStep).not.toContain('velocity')
    expect(tr8s.features?.perStep).toContain('velocity')
    // It is the only per-step lane withheld: everything else the manual gives a gesture for is
    // declared, including the two the siblings split between them.
    expect(device.features?.perStep).toEqual([
      'accent',
      'substep',
      'flam',
      'weak',
      'alt-inst',
      'probability',
    ])
    // And nothing sets one, which the schema would catch but only if a lane were ever added.
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        expect(Object.keys(entry.set), recipe.id).not.toContain('velocity')
      }
    }
  })

  it('states the tone every recipe needs, and reaches past the common block only when it has', () => {
    // p.7's gated blocks. A recipe setting one of these is asserting what is loaded in the slot.
    const gated: Record<string, string> = {
      ATTACK: 'BD category, ACB',
      SNAPPY: 'SD category, ACB',
      COLOR: 'TOM category, ACB',
      MORPH: 'FM tone',
      'FM COARSE': 'FM tone',
      'COARSE TUNE': 'Sample',
      'HOLD MODE': 'Loop',
    }
    for (const recipe of device.recipes) {
      expect(toneOf(recipe), `${recipe.id} has no TONE`).not.toBe('')
      for (const [name, required] of Object.entries(gated)) {
        if (paramNamed(recipe, name) === undefined) continue
        // ATTACK is in two blocks — BD-category ACB and sample tones — so either satisfies it.
        const tone = toneOf(recipe)
        const ok = tone.includes(required) || (name === 'ATTACK' && tone.includes('Sample'))
        expect(ok, `${recipe.id} sets ${name} on tone "${tone}"`).toBe(true)
      }
    }
  })

  it('cites the Parameter Guide for every range but the two it does not carry', () => {
    const sources = new Set(device.recipes.flatMap(legality))
    for (const source of sources) {
      expect(source.startsWith(PARAMETER) || source.startsWith(OWNERS), source).toBe(true)
    }
    // SHUFFLE is the one recipe-level exception, and it is deliberate: the Parameter Guide
    // records only *which* shuffle setting is live (p.11), never the range of either.
    const owners = [...sources].filter((s) => s.startsWith(OWNERS))
    expect(owners).toEqual([`${OWNERS}17`])
    // The other is the panel span, which is device-level for the same reason — the Parameter
    // Guide has no specifications section at all.
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${OWNERS}40 (Main Specifications)` })
    expect(device.physical.panelSpanMm).toBe(224)
  })

  it('leaves every point provisional and every range cited', () => {
    const { counts } = auditDevice(device)
    expect(counts.manualPoints + counts.observedPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
    // §2.6: one capability fact is a reasoned non-claim and the rest have pages. Nothing is
    // `unread` — both documents were opened — and nothing is left unchecked.
    expect(counts.unreadCapabilities).toBe(0)
    expect(counts.uncheckedCapabilities).toBe(0)
    expect(counts.undocumentedCapabilities).toBe(1)
    expect(device.capabilityEvidence?.['clock.preferredSource']).toMatchObject({ kind: 'unknown' })
  })

  it('draws a panel whose features all fall inside the published footprint', () => {
    const panel = device.panel
    expect(panel).toBeDefined()
    if (panel === undefined) return
    expect(panel.panelRiseMm).toBe(132)
    for (const f of panel.features) {
      const w = 'w' in f ? f.w : 'd' in f ? f.d : 0
      const h = 'h' in f ? f.h : 'd' in f ? f.d : 0
      expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
      expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(device.physical.panelSpanMm)
      expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(panel.panelRiseMm)
    }
    // The six faders and the six instrument select buttons are the same row of the panel read
    // twice, so they share a span — that is what made the obscured button recoverable.
    const fader = panel.features.find((f) => f.kind === 'grid' && f.shape === 'fader')
    const voices = panel.features.find((f) => f.kind === 'voices')
    expect(fader).toMatchObject({ cols: 6 })
    expect(voices && 'w' in voices ? voices.w : 0).toBeCloseTo(fader && 'w' in fader ? fader.w : -1, 1)
  })

  it('authors every role its voices advertise, or leaves it honestly unvoiced', () => {
    const advertised = new Set(device.voices.flatMap((v) => v.roles))
    for (const role of advertised) expect(ROLES).toContain(role)
    // Fifteen roles across six voices, which is the density the search pays for — see the note
    // in test/search-symmetry.test.ts.
    expect(advertised.size).toBe(15)
    // Every recipe's role is one its own voice advertises. The schema does not check this.
    for (const recipe of device.recipes) {
      const voice = device.voices.find((v) => v.kind === 'fixed' && v.id === recipe.voice)
      expect(voice?.roles, `${recipe.id}`).toContain(recipe.role)
    }
    // And every assignable expands, which is what the resolver actually sees.
    expect(expand(device)).toHaveLength(6)
  })

  it('ships a library it cannot enumerate, and no recipe names a tone', () => {
    expect(device.content?.kind).toBe('shipped-library')
    // The TR-1000 authors a cited enum off its GEN/INST List. Neither TR-6S document ships or
    // names such a list, so a recipe says a category and an engine and stops.
    for (const recipe of device.recipes) {
      const tone = paramNamed(recipe, 'TONE')
      expect(tone?.verified, recipe.id).toBe(false)
    }
    // A recipe that needs the reader's own audio says so, and the box is declared as shipping
    // a library, which is what makes that pairing legal (§2.6).
    expect(device.recipes.filter((r) => r.sourceAudio !== undefined).length).toBeGreaterThan(0)
  })
})
