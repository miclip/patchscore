import { describe, expect, it } from 'vitest'
import { DeviceSchema, ROLES, expand, type AuthoredParam, type Recipe } from '../lib/core/index'
import { ARTICULABLE_PER_STEP, device } from '../lib/devices/akai-mpc-live-iii/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The MPC Live III is the largest box in the library and the first with **two pools**, and both
 * facts come from the same place: this manual prints its parameter ranges for the plugins and
 * effects (pp.392-521) and prints none at all for the sampler voice a drum pad actually is
 * (pp.209-274). So the manifest has two parameter regimes side by side, and the failures worth
 * catching here are the ones where a value from one regime could quietly wear the other's page.
 *
 * Four of them, and each has a test below.
 *
 *  - **Polyphony 8 has to hold for every member of the `track` pool**, and the pool spans
 *    instruments whose printed polyphony scales disagree — a keygroup's 2-32 (p.234), Electric's
 *    1-16 (p.436), the Organ's 2-7 (p.492). Quoting the largest would be a cited wrong range.
 *  - **A control with two printed scales carries the switch that chooses.** `Osc 1 Fine` and the
 *    LFO rates are the cases the recipes reach.
 *  - **A drum pad's numerics may only come off the handful of pages that print one for a pad.**
 *    Nothing may borrow a plugin's scale for a sample.
 *  - **The `pad` pool must not advertise a role a fixed-note pad cannot carry.**
 */

const MANUAL = 'MPC Live III / MPC XL User Guide v3.7'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function names(recipe: Recipe): string[] {
  return params(recipe).map((p) => p.name)
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

const padRecipes = device.recipes.filter((r) => r.voice === 'pad')
const trackRecipes = device.recipes.filter((r) => r.voice !== 'pad')
const pool = (id: string) => device.voices.find((v) => v.id === id)

describe('MPC Live III manifest', () => {
  it('parses', () => {
    expect(() => DeviceSchema.parse(device)).not.toThrow()
  })

  it('is three pools, and the pad pool withholds the six roles a fixed-note pad cannot carry', () => {
    expect(device.voices.map((v) => v.id)).toEqual(['pad', 'mono-track', 'poly-track'])
    for (const id of ['pad', 'mono-track', 'poly-track']) expect(pool(id)?.kind).toBe('pool')

    // A drum track triggers its pads by fixed note number and nothing in a pattern transposes
    // one, so a part that has to change pitch step to step is not reachable there (p.211 and
    // p.217 both put transposition on the track or the layer, never on the event).
    const withheld = ['sub', 'bass-mid', 'pad', 'lead', 'arp', 'acid']
    for (const role of withheld) expect(pool('pad')?.roles).not.toContain(role)

    // The plugin pools have no such limit and carry everything: a plugin track hosts whatever is
    // loaded, so nothing about the track narrows what it can be asked for. What narrows it is
    // polyphony, which is the field below and not this one.
    for (const id of ['mono-track', 'poly-track']) {
      expect([...(pool(id)?.roles ?? [])].sort(), id).toEqual([...ROLES].sort())
    }
    // Sixteen apiece: one planning horizon for the two plugin pools, matched to the hardware
    // pad count, which is also what lets §10's one-column-count packer fill the drawn region.
    expect(expand(device)).toHaveLength(48)
  })

  it('gives each plugin pool the polyphony its own instruments print, and no more', () => {
    /**
     * **This manual publishes no global voice count** — every architectural statement ends
     * "limited only by the total number of voices available" (p.211, p.233) and no page gives
     * that total. What it prints is a polyphony per instrument, and the three this manifest
     * loads disagree:
     *
     *     TubeSynth    Polyphony: Legato, Retrigger, 2, 3, 4                 p.519
     *     Bassline     no Polyphony parameter; "classic mono synths"         p.428
     *     DrumSynth    nothing at all                                        pp.431, 433
     *
     * So one plugin pool cannot state a true number, and the split is on exactly that fact.
     * DrumSynth's row is a gap rather than a zero: p.431's "individual plugins per track" counts
     * drum *types* in an instance, not simultaneous notes, and is not read as though it did.
     *
     * **An earlier draft had both on one pool at 8**, reasoning from a keygroup's `2-32`
     * (p.234), Electric's `1-16` (p.436) and the Organ's `2-7` (p.492) — three real printed
     * scales belonging to three instruments no recipe here loads. This test is the check that
     * catches that: every plugin pool's polyphony is bounded by what its *own* recipes' plugins
     * print, so a citation pointing at the wrong instrument fails.
     */
    expect(pool('mono-track')?.polyphony).toBe(1)
    expect(pool('poly-track')?.polyphony).toBe(4)
    // p.519's largest printed number. Anything above it is not on any page.
    expect(pool('poly-track')?.polyphony).toBeLessThanOrEqual(4)

    // **And because one component of `voices` is unstated, the whole field is a reasoned
    // non-claim rather than a citation** — `capabilityEvidence` has one entry per path and no
    // way to cite three pools apart, so a `manual` here would badge an authored number with a
    // page that does not carry it. The reason has to name what is missing, or the state reads
    // as diligence while saying nothing (§2.6/#120).
    const voices = device.capabilityEvidence?.['voices']
    expect(voices, 'voices evidence').toBeDefined()
    expect(voices !== false && voices?.kind).toBe('unknown')
    const reason = voices !== false && voices?.kind === 'unknown' ? voices.reason : ''
    expect(reason).toContain('DrumSynth')
    expect(reason.length).toBeGreaterThan(60)

    // Every recipe sits on the pool whose polyphony its plugin supports.
    const MONO_PLUGINS = ['DrumSynth', 'Bassline']
    for (const recipe of trackRecipes) {
      const plugin = params(recipe).find((p) => p.name === 'Plugin')
      expect(plugin?.kind, recipe.id).toBe('enum')
      const value = plugin?.kind === 'enum' ? plugin.value : ''
      const expected = MONO_PLUGINS.includes(value) ? 'mono-track' : 'poly-track'
      expect(recipe.voice, `${recipe.id} loads ${value}`).toBe(expected)
    }

    // A pad sounds its own sample at its own pitch, so a chord is not reachable on one — a
    // different limit from polyphony, and it is why this pool is 1 for its own reason.
    expect(pool('pad')?.polyphony).toBe(1)

    // **And no `sampled-chord` recipe is authored.** §12.4's substitution is for hardware that
    // cannot sound three notes anywhere; p.519 gives TubeSynth four, and §7.1 ranks
    // `polyphonic-voice` ahead of `sampled-chord`, so a pad twin would lose every comparison it
    // could be in against a recipe on the same device.
    expect(device.recipes.filter((r) => r.realisation === 'sampled-chord')).toHaveLength(0)
    const stab = device.recipes.filter((r) => r.role === 'stab')
    expect(stab.map((r) => r.voice)).toEqual(['poly-track'])
  })

  it('never prints a value from a scale without the control that selects it', () => {
    // CLAUDE.md's rule. This manual reflows a rate or a time between an absolute unit and a
    // musical division eighteen times over the appendix, and prints two tuning scales for one
    // oscillator field. Every pairing the recipes reach is checked here rather than trusted.
    const pairs: [string, string][] = [
      // p.515: Fine reads -12..+12 under octaves 32'-2' and -70..+70 under `Wide`.
      ['Osc 1 Fine', 'Osc 1 Octave'],
      // p.518: Rate reads 0.01-20.00 Hz with Sync off and 8/4 - 1/32 with it on.
      ['LFO 1 Rate', 'LFO 1 Sync'],
    ]
    for (const recipe of device.recipes) {
      for (const [dependent, selector] of pairs) {
        if (!names(recipe).includes(dependent)) continue
        expect(names(recipe), `${recipe.id}: ${dependent} without ${selector}`).toContain(selector)
      }
    }
    // And the authored range really is the one the selector names, not the wider sibling.
    const fine = device.recipes
      .flatMap(params)
      .filter((p) => p.name === 'Osc 1 Fine' && p.kind === 'numeric')
    expect(fine.length).toBeGreaterThan(0)
    for (const p of fine) {
      if (p.kind !== 'numeric') continue
      expect(p.range.min).toBe(-12)
      expect(p.range.max).toBe(12)
    }
  })

  it('gives a drum pad no range from a page that prints none for one', () => {
    /**
     * The whole of `Track Edit Mode` describes a pad's tuning, filter, envelopes and levels in
     * prose and prints a number for almost none of them. These are the only pages in that
     * chapter that do print one for a pad, plus the effects a pad's four insert slots can hold
     * (p.87) and the sequencer's own swing. A pad numeric citing anything else would be a
     * plugin's scale wearing a sampler's page.
     */
    const PAD_RANGE_PAGES = [
      'p.211', // Global Semi 36 semitones, Global Fine 99 cents
      'p.212', // Mute Group, one of 32
      'p.217', // layer Semi, 36 semitones
      'p.219', // Vel Start / Vel End, 0 to 127
      'p.227', // Articulation Speed / Dynamics / Stereo
      'p.392', // AIR Delay
      'p.396', // AIR Reverb
      'p.413', // AIR Distortion
      'p.414', // AIR Lo-Fi
      'p.75', // Timing Correct swing
    ]
    for (const recipe of padRecipes) {
      for (const p of params(recipe)) {
        if (p.kind !== 'numeric') continue
        const source = p.range.verified === undefined || p.range.verified === false
          ? undefined
          : p.range.verified.source
        expect(source, `${recipe.id} / ${p.name} has no cited range`).toBeDefined()
        expect(
          PAD_RANGE_PAGES.some((page) => source?.endsWith(page)),
          `${recipe.id} / ${p.name} cites ${source}, which prints no range for a pad`,
        ).toBe(true)
      }
    }
  })

  it('leaves every point provisional and cites every range and option set', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const p of params(recipe)) {
        // The point is taste on every parameter here; no page states which value to use.
        expect(p.verified, `${recipe.id} / ${p.name}`).toBe(false)
      }
      // And the legality half is cited on every one of them, to this manual.
      const cited = legality(recipe)
      const gates = params(recipe).filter((p) => p.kind !== 'text').length
      expect(cited).toHaveLength(gates)
      for (const source of cited) expect(source.startsWith(MANUAL)).toBe(true)
    }
  })

  it('articulates only the lanes the model can actually carry', () => {
    // `automation` is declared in `features.perStep` because p.194 documents it, and no recipe
    // reaches it: Step Automation is a curve over an arbitrary parameter, and an articulation
    // entry is one scalar applied to every hit in a slot.
    expect(device.features?.perStep).toContain('automation')
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const key of Object.keys(entry.set)) {
          expect(ARTICULABLE_PER_STEP as readonly string[], `${recipe.id}`).toContain(key)
        }
      }
    }
    const reached = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect(reached.has('automation')).toBe(false)
  })

  it('declares no USB jack, and one clock socket per transport and direction', () => {
    // A USB receptacle is bidirectional and `JackSpec.direction` is one value, so it is a
    // transport here and not a jack — the Grandmother's and the Tracker Mini's split.
    for (const jack of device.jacks ?? []) expect(jack.id).not.toMatch(/USB/)
    expect(device.clock.transport).toContain('usb')

    // Two MIDI DIN ports each way, and only the first of each pair carries clock: two jacks
    // claiming one transport in one direction would leave the rack choosing.
    const clocked = (device.jacks ?? []).filter((j) => j.clock !== undefined)
    expect(clocked.map((j) => j.id)).toEqual(['MIDI IN 1', 'MIDI OUT A'])
    for (const jack of clocked) expect(jack.signal).toContain('clock')
  })

  it('sends over fewer transports than it receives on, because p.63 prints two different lists', () => {
    // Receive offers MIDI Clock, MTC, Ableton Link and Off; Send offers MIDI Clock, MTC and Off.
    // Link is on one list and not the other, and the manifest says only what the page says.
    expect(device.clock.receiveTransport).toContain('ableton-link')
    expect(device.clock.sendTransport).not.toContain('ableton-link')
    // The undirected list stays the union of the two.
    expect([...device.clock.transport].sort()).toEqual(
      [...new Set([...(device.clock.sendTransport ?? []), ...(device.clock.receiveTransport ?? [])])].sort(),
    )
    // A box this size can plainly lead a rig; no page says that is its job, so it does not claim it.
    expect(device.clock.preferredSource).toBeUndefined()
  })

  it('draws a panel whose features all fall inside the published footprint', () => {
    const panel = device.panel
    expect(panel).toBeDefined()
    if (panel === undefined) return
    const span = device.physical.panelSpanMm
    // p.530 gives 436 x 256 x 67 mm, and the measured drawing is 1441 x 850 px. The aspect check
    // is what picks 256 out of that row rather than 67, so it is asserted rather than assumed.
    expect(span).toBe(436)
    expect(panel.panelRiseMm).toBe(256)
    expect(Math.abs(span / panel.panelRiseMm - 1441 / 850)).toBeLessThan(0.01)
    for (const f of panel.features) {
      const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
      const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.y).toBeGreaterThanOrEqual(0)
      expect(f.x + w).toBeLessThanOrEqual(span)
      expect(f.y + h).toBeLessThanOrEqual(panel.panelRiseMm)
    }
    // The voice field is the display, not the pads — see panel.ts for why.
    const voices = panel.features.filter((f) => f.kind === 'voices')
    expect(voices).toHaveLength(1)
    const screen = panel.features.find((f) => f.kind === 'screen')
    expect(screen).toBeDefined()
    if (screen === undefined || voices[0] === undefined) return
    const field = voices[0]
    expect(field.x).toBeGreaterThanOrEqual(screen.x)
    expect(field.y).toBeGreaterThanOrEqual(screen.y)
    expect(field.x + field.w).toBeLessThanOrEqual(screen.x + screen.w)
    expect(field.y + field.h).toBeLessThanOrEqual(screen.y + screen.h)
  })

  it('ships a library it cannot enumerate, and no recipe names an entry from it', () => {
    expect(device.content?.kind).toBe('shipped-library')
    // Every sample-based recipe describes the audio it needs in prose, because no document lists
    // a single expansion or file. That is the whole difference between this and `enumerable`.
    for (const recipe of padRecipes) {
      expect(recipe.sourceAudio, recipe.id).toBeDefined()
      expect(recipe.sourceAudio?.need.length ?? 0).toBeGreaterThan(10)
    }
    // Plugin tracks make their own sound, so none of them declares source audio at all.
    for (const recipe of trackRecipes) expect(recipe.sourceAudio, recipe.id).toBeUndefined()
  })

  it('authors both regimes rather than only the one with numbers in it', () => {
    // The point of the split: thirteen recipes where the manual tabulates values — eight on
    // monophonic instruments, five on the polyphonic one — and seven where it prints only
    // enumerations. A manifest that took only the first would have thrown away the pads, which
    // is what an MPC is.
    expect(trackRecipes).toHaveLength(13)
    expect(device.recipes.filter((r) => r.voice === 'mono-track')).toHaveLength(8)
    expect(device.recipes.filter((r) => r.voice === 'poly-track')).toHaveLength(5)
    expect(padRecipes).toHaveLength(7)
    expect(device.recipes).toHaveLength(20)
  })

  it('authors no recipe in a character no direction asks that role for, bar two named ones', () => {
    /**
     * §3 sets the target at roughly fifteen to twenty recipes and says outright there is no
     * expectation of filling the grid, so the four that were cut were chosen by a rule that can
     * be re-run rather than by taste: a recipe whose `(role, character)` no shipped direction
     * requests cannot be selected as authored.
     *
     * Two survive it deliberately, and naming them here is what stops the rule from being
     * quietly relaxed later. §3.5's fallback means an approximate character is still a usable
     * answer — a role nothing asks for is not, which is the asymmetry the cut turned on.
     */
    const KEPT_APPROXIMATIONS = ['mpc-snare-hard', 'mpc-vox-chop-bright']

    const asked = new Set<string>()
    for (const template of TEMPLATES) {
      for (const request of template.roles) asked.add(`${request.role}/${request.character}`)
    }

    const unasked = device.recipes
      .filter((r) => !asked.has(`${r.role}/${r.character}`))
      .map((r) => r.id)
      .sort()
    expect(unasked).toEqual([...KEPT_APPROXIMATIONS].sort())

    // The roles this box now leaves unvoiced are left unvoiced honestly (invariant 5), never
    // filled with a recipe nothing would pick.
    const covered = new Set(device.recipes.map((r) => r.role))
    expect(covered.size).toBeLessThan(ROLES.length)
    expect(covered.has('acid')).toBe(false)
  })
})
