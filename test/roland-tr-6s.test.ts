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

/**
 * #443. Three characters a direction asks for and nobody in the library authored, all three on
 * this box's two most-requested drum voices. The measurement that named them is a substitution
 * count, not a coverage count: a character nobody asks for is not a gap, and §3.5's fallback was
 * placing every one of these parts and saying so honestly. What it could not do is give a reader
 * who asked for a `clean` snare anything but a `bright` one.
 *
 * The interesting failure this file guards is the one the issue warns about in its own text: a
 * character "added" by copying the neighbouring recipe and changing the label. So the tests below
 * are mostly about *distinctness*, and they check it against the manual's controls rather than
 * against taste.
 */
describe('TR-6S #443 characters', () => {
  const byId = new Map(device.recipes.map((r) => [r.id, r]))

  function recipe(id: string): Recipe {
    const found = byId.get(id)
    if (found === undefined) throw new Error(`no recipe ${id}`)
    return found
  }

  function numberNamed(id: string, name: string): number {
    const p = paramNamed(recipe(id), name)
    if (p === undefined || p.kind !== 'numeric') throw new Error(`${id}: no numeric ${name}`)
    return p.value
  }

  function enumNamed(id: string, name: string): { value: string; options: readonly string[] } {
    const p = paramNamed(recipe(id), name)
    if (p === undefined || p.kind !== 'enum') throw new Error(`${id}: no enum ${name}`)
    return { value: p.value, options: p.options.values }
  }

  /** The mood axes a param declares, if it is a kind that can declare any (§6). */
  function moodAxes(p: AuthoredParam | undefined): string[] {
    if (p === undefined || p.kind === 'enum' || p.kind === 'text') return []
    return (p.mood ?? []).map((m) => m.axis)
  }

  it('authors the three pairs the substitution count named, and on the voices that play them', () => {
    expect(recipe('tr6s-snare-clean')).toMatchObject({ role: 'snare', character: 'clean', voice: 'sd' })
    expect(recipe('tr6s-open-hat-soft')).toMatchObject({ role: 'open-hat', character: 'soft', voice: 'oh' })
    expect(recipe('tr6s-open-hat-hard')).toMatchObject({ role: 'open-hat', character: 'hard', voice: 'oh' })
    // Four of the six characters on the snare, three on the open hat, and each one once. A second
    // recipe for a pair would make the resolver's choice between them a tie-break rather than a
    // reading of the manual.
    const pairs = device.recipes.map((r) => `${r.role} ${r.character}`)
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it('gives the open-hat pair the controls `bright` does not use, so neither is it renamed', () => {
    // §3.4 puts `bright` on `tone` and `hard`/`soft` on `force`, and p.8 splits the same way:
    // H BOOST is content in the top end, TRANSIENT's two bipolar controls are attack and release
    // and nothing else. If a later pass moves either of these onto H BOOST, this is the pair that
    // has quietly become one recipe under three names.
    expect(enumNamed('tr6s-open-hat-bright', 'INST FX TYPE').value).toBe('H BOOST')
    expect(enumNamed('tr6s-open-hat-hard', 'INST FX TYPE').value).toBe('TRANSIENT')
    expect(enumNamed('tr6s-open-hat-soft', 'INST FX TYPE').value).toBe('TRANSIENT')
    expect(paramNamed(recipe('tr6s-open-hat-hard'), 'H BOOST')).toBeUndefined()
    expect(paramNamed(recipe('tr6s-open-hat-soft'), 'H BOOST')).toBeUndefined()
  })

  it('reverses the attack between `hard` and `soft`, and softens the release on both', () => {
    // p.8, verbatim: Attack "Emphasizes or softens the attack", Release "Emphasizes or softens
    // the release", both -128-0-+127. `Attack` is the control that carries the pair and the one
    // whose sign reverses — asserting the sign rather than the value keeps this alive through any
    // later re-voicing.
    expect(numberNamed('tr6s-open-hat-hard', 'TRANSIENT ATTACK')).toBeGreaterThan(0)
    expect(numberNamed('tr6s-open-hat-soft', 'TRANSIENT ATTACK')).toBeLessThan(0)
    // `Release` is negative on both, and that is deliberate rather than an oversight: a hat hit
    // hard and cut off and a hat hit gently both stop sooner than one left ringing. A positive
    // release on the `soft` recipe would make it the long one, which is the `bright` recipe's job
    // and `tr6s-noise-soft`'s.
    expect(numberNamed('tr6s-open-hat-hard', 'TRANSIENT RELEASE')).toBeLessThan(0)
    expect(numberNamed('tr6s-open-hat-soft', 'TRANSIENT RELEASE')).toBeLessThan(0)
    // And both scale them, because p.8 says EnvDepth is what the signs are scaled by.
    expect(numberNamed('tr6s-open-hat-hard', 'TRANSIENT ENV DEPTH')).toBeGreaterThan(0)
    expect(numberNamed('tr6s-open-hat-soft', 'TRANSIENT ENV DEPTH')).toBeGreaterThan(0)
    // `soft` is the quieter part. LEVEL is the `force` axis in the plainest form the box has.
    expect(numberNamed('tr6s-open-hat-soft', 'LEVEL')).toBeLessThan(
      numberNamed('tr6s-open-hat-hard', 'LEVEL'),
    )
  })

  it('orders the four hat decays, so `soft` is short and `hard` is still an open hat', () => {
    // The ordering is the claim, not the numbers: a gently-struck cymbal takes less energy and
    // gives it back sooner, so `soft` is the shortest open hat on the box - below it would stop
    // being the role, and above `hard` it would be a quiet version of that rather than a soft one.
    const closed = numberNamed('tr6s-closed-hat-hard', 'DECAY')
    const soft = numberNamed('tr6s-open-hat-soft', 'DECAY')
    const hard = numberNamed('tr6s-open-hat-hard', 'DECAY')
    const bright = numberNamed('tr6s-open-hat-bright', 'DECAY')
    expect([closed, soft, hard, bright]).toEqual([...[closed, soft, hard, bright]].sort((x, y) => x - y))
    expect(new Set([closed, soft, hard, bright]).size).toBe(4)
    // Every closed-hat recipe, not just the one above: none of them may reach the soft open hat.
    for (const r of device.recipes.filter((x) => x.role === 'closed-hat')) {
      expect(numberNamed(r.id, 'DECAY'), r.id).toBeLessThan(soft)
    }
  })

  it('keeps a soft open hat out of the `noise` recipe, which is the long one', () => {
    // `tr6s-noise-soft` is the near miss on this voice: same character, same slot, and it is a
    // wash rather than a hat - detuned down, opened out, and with no choke wired.
    expect(numberNamed('tr6s-noise-soft', 'TUNE')).toBeLessThan(0)
    expect(numberNamed('tr6s-open-hat-soft', 'TUNE')).toBeGreaterThan(0)
    expect(numberNamed('tr6s-open-hat-soft', 'DECAY')).toBeLessThan(numberNamed('tr6s-noise-soft', 'DECAY'))
    // All three open-hat recipes wire the choke; the wash deliberately does not.
    for (const id of ['tr6s-open-hat-bright', 'tr6s-open-hat-hard', 'tr6s-open-hat-soft']) {
      expect(recipe(id).routing, id).toContain('MUTE, OH = CH')
    }
    expect(recipe('tr6s-noise-soft').routing).toBeUndefined()
  })

  it('makes `snare clean` the snare with no INST FX on it at all', () => {
    // p.8 defines the type: THRU is "No INST FX effect is applied." §3.4 puts `clean` at
    // `grit -1`, and on a box where every other character is a choice of effect, the bottom of
    // that axis is the absence of one.
    expect(enumNamed('tr6s-snare-clean', 'INST FX TYPE').value).toBe('THRU')
    const others = ['tr6s-snare-hard', 'tr6s-snare-bright', 'tr6s-snare-dirty']
    const used = others.map((id) => enumNamed(id, 'INST FX TYPE').value)
    expect(used).toEqual(['TRANSIENT', 'H BOOST', 'CRUSHER'])
    expect(used).not.toContain('THRU')
    // Written down rather than omitted: the reader is standing at the box with whatever the last
    // kit loaded, so a recipe that said nothing would leave that CRUSHER sitting on the part.
    expect(paramNamed(recipe('tr6s-snare-clean'), 'INST FX TYPE')).toBeDefined()
    // And nothing downstream of it. Any param here that is not in p.7's INST table is an effect
    // parameter, and an effect parameter under THRU is a setting with nothing listening to it.
    const common = new Set([
      'TONE', 'TUNE', 'DECAY', 'LEVEL', 'GAIN', 'PAN', 'REVERB SEND', 'DELAY SEND',
      'LFO', 'LFO DEPTH', 'SNAPPY', 'INST FX TYPE', 'SHUFFLE',
    ])
    for (const p of params(recipe('tr6s-snare-clean'))) expect(common, p.name).toContain(p.name)
  })

  it('leaves the grit knob somewhere to go on a recipe with no effect to push', () => {
    // §6: a device declines an axis by having no param that declares it. `clean` must not decline
    // grit - the reader turning it up is asking this snare to dirty up - and with THRU there is
    // no effect depth to ride, so it rides the wires. p.7: SNAPPY is "the volume of the snare
    // wires (resonating wires)", which is where a snare's noise actually comes from.
    const snappy = paramNamed(recipe('tr6s-snare-clean'), 'SNAPPY')
    expect(snappy?.kind).toBe('numeric')
    expect(moodAxes(snappy)).toContain('grit')
    // Every axis the box carries anywhere is still reachable on this recipe, THRU or not.
    const axes = new Set(params(recipe('tr6s-snare-clean')).flatMap(moodAxes))
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })

  it('uses the `weak` lane the manifest declares and nothing had reached for', () => {
    // `weak` is declared off Owner's p.20 and hinted as "Hold [SHIFT], press a pad", and before
    // #443 no recipe on this box set it - a lane the manifest claimed and the content never used.
    const lanes = device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set)))
    expect(lanes).toContain('weak')
    for (const lane of new Set(lanes)) expect(device.features?.perStep, lane).toContain(lane)
    // Every hint a recipe names is one the manifest actually publishes.
    const hints = device.recipes.flatMap((r) => [
      ...(r.articulation ?? []).flatMap((a) => (a.hint === undefined ? [] : [a.hint])),
      ...params(r).flatMap((p) => (p.hint === undefined ? [] : [p.hint])),
    ])
    for (const hint of new Set(hints)) expect(Object.keys(device.hints ?? {}), hint).toContain(hint)
  })
})
