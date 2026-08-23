import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  DeviceSchema,
  NEUTRAL_MOOD,
  RecipeSchema,
  expand,
  renderGuide,
  resolve,
  resolvePatch,
  resolveRecipe,
  type AuthoredParam,
} from '../lib/core/index'
import { device, type CascadiaJack } from '../lib/devices/intellijel-cascadia/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * #49. The Cascadia is the first device in the library whose recipes carry a `patch` list, so
 * this file is not only "does the fourth manifest parse". It is the evidence for the claim the
 * device was scheduled to test: that **`PatchEntry` survives real data**, from authoring through
 * Zod, the resolver and the guide.
 *
 * Every assertion below is about something that had never run against anything but a fixture.
 */

const MANUAL = 'Intellijel Cascadia Manual v1.1, '

function params(): { recipe: string; param: AuthoredParam }[] {
  return device.recipes.flatMap((r) =>
    (r.params as AuthoredParam[]).map((param) => ({ recipe: r.id, param })),
  )
}

function voice() {
  const v = device.voices[0]
  if (v === undefined || v.kind !== 'fixed') throw new Error('the Cascadia should be one fixed voice')
  return v
}

/** One box, the golden template: twelve requests against one monophonic voice. */
function alone() {
  return resolve({
    devices: [device],
    template: TEMPLATES[0] as (typeof TEMPLATES)[number],
    mood: NEUTRAL_MOOD,
    seed: 7,
  })
}

describe('Cascadia manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('spans 348 mm, cited to the specifications page, cheeks and all (§10)', () => {
    // p.110, verbatim: "Width: 348mm (including wood end cheeks)". The figure covers the whole
    // unit rather than the metal panel, which is the caveat the manifest records and the reason
    // the drawn panel adds no cheeks of its own — it would put the drawing wider than 348.
    expect(device.physical.panelSpanMm).toBe(348)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}p.110` })
  })

  it('draws a panel whose aspect matches the two published figures', () => {
    // §10 asks for this check by name, and this device is exactly the case it was written for:
    // a width that means something other than it appears to. p.8's drawing measures 1290 x 911
    // px at 200 dpi — 1.416 — against 348/246 = 1.415. If someone later "corrects" the span to
    // a panel-face measurement, this fails, which is the point.
    const rise = device.panel?.panelRiseMm
    expect(rise).toBe(246)
    expect(device.physical.panelSpanMm / (rise as number)).toBeCloseTo(1.415, 2)
  })

  it('carries no named jack position on the panel, because the vocabulary has none (#49)', () => {
    // The finding the rack question turns on. `PanelFeature` offers screen, knob, button, grid,
    // voices, label and group — there is no jack — so an authored layout cannot say where a
    // socket is, and an intra-panel cable has no coordinates to be drawn between. Cascadia's
    // hundred-plus patch points are drawn as decorative `grid` blocks and bind nothing.
    const kinds = new Set((device.panel?.features ?? []).map((f) => f.kind))
    expect([...kinds].sort()).toEqual(['button', 'grid', 'group', 'knob', 'voices'])
    // Not merely "this device drew none": there is no kind that could carry one.
    expect([...kinds]).not.toContain('jack')
    const grids = (device.panel?.features ?? []).filter((f) => f.kind === 'grid')
    expect(grids.length).toBeGreaterThan(10)
  })

  // -------------------------------------------------------------------------
  // §12.4 — one voice, and the gaps that follow from it
  // -------------------------------------------------------------------------

  it('is one monophonic voice, and says so twice on purpose (§12.4)', () => {
    expect(device.voices).toHaveLength(1)
    expect(voice().polyphony).toBe(1)
    // `comfortableVoices` would default to the assignable count, which is also 1. It is written
    // out because it is a claim a reader should be able to see, and because the day this box
    // gains a second assignable the two numbers stop agreeing.
    expect(device.comfortableVoices).toBe(1)
    expect(expand(device)).toHaveLength(1)
  })

  it('leaves the chord parts as polyphony gaps rather than pretending (§12.4)', () => {
    const result = alone()
    const bad = result.assignments.filter((a) => a.role === 'pad' || a.role === 'stab')
    expect(bad).toEqual([])

    // And the gap names the *reason*, which is why both roles are declared on the voice and
    // both have recipes: a Cascadia stab is a real sound, it is just a one-note one. Declaring
    // nothing would have produced "nothing in your rig plays this part", which is less true.
    for (const role of ['pad', 'stab']) {
      const gap = result.gaps.find((g) => g.role === role)
      expect(gap?.reason, role).toBe('no-capable-voice')
      if (gap?.reason !== 'no-capable-voice') throw new Error(`${role}: wrong gap kind`)
      expect(gap.because, role).toBe('polyphony')
    }
    expect(voice().roles).toContain('pad')
    expect(voice().roles).toContain('stab')
    expect(device.recipes.some((r) => r.role === 'pad')).toBe(true)
    expect(device.recipes.some((r) => r.role === 'stab')).toBe(true)
  })

  it('claims no per-step editing, because there is no sequencer', () => {
    expect(device.features?.perStep).toBeUndefined()
    for (const recipe of device.recipes) expect(recipe.articulation, recipe.id).toBeUndefined()
    // Every recipe says where the notes come from instead.
    for (const recipe of device.recipes) {
      expect(recipe.routing, recipe.id).toContain('no sequencer of its own')
    }
  })

  // -------------------------------------------------------------------------
  // §3.3 — the patch list, which is what this device exists to exercise
  // -------------------------------------------------------------------------

  it('gives every recipe a patch list, because that is what a semi-modular recipe is (§3.3)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.patch?.length ?? 0, recipe.id).toBeGreaterThan(0)
    }
    // The count that made #49 worth doing: the registry used to hold zero of these.
    const total = device.recipes.reduce((n, r) => n + (r.patch?.length ?? 0), 0)
    expect(total).toBeGreaterThan(20)
  })

  it('qualifies every jack id by section, because the names are not unique', () => {
    // `IN` is silkscreened in five sections, `TRIG` in two, and `PITCH`, `SYNC`, `LEVEL`, `RATE`
    // and `FM 1` all repeat. A bare `IN` would be unresolvable standing at the box. The schema
    // no longer takes this on trust — it refuses an endpoint that is not a declared id — so what
    // is left to check here is the shape of the ids themselves.
    for (const j of device.jacks ?? []) {
      const [section, name] = j.id.split(' · ')
      expect((section ?? '').length, j.id).toBeGreaterThan(1)
      expect((name ?? '').length, j.id).toBeGreaterThan(0)
    }
    // A cable that starts and ends in one section is almost always a typo on this box.
    for (const recipe of device.recipes) {
      for (const entry of recipe.patch ?? []) {
        expect(entry.from.split(' · ')[0], recipe.id).not.toBe(entry.to.split(' · ')[0])
      }
    }
  })

  it('keeps the declared jack ids as literals, so a mistyped endpoint cannot compile', () => {
    // **A regression guard with a history.** The first version of this manifest wrote
    // `jack(id: string): JackSpec` and `const JACKS: JackSpec[]`, either of which widens every
    // id to `string`. `CascadiaJack` was therefore `string`, `cable()` accepted arbitrary text,
    // and the file's own comment claimed a compile-time check that did not exist. Nothing failed:
    // that is exactly why this assertion is at type level rather than left to a reader.
    expectTypeOf<'VCO A · FM 1'>().toExtend<CascadiaJack>()
    expectTypeOf<'VCF · IN'>().toExtend<CascadiaJack>()
    expectTypeOf<'OUTPUT CONTROL · MAIN'>().toExtend<CascadiaJack>()

    // The half that actually catches the widening. If `CascadiaJack` ever becomes `string` these
    // stop holding, because every string extends `string`.
    expectTypeOf<'VCF · INN'>().not.toExtend<CascadiaJack>()
    expectTypeOf<string>().not.toExtend<CascadiaJack>()
    expectTypeOf<CascadiaJack>().not.toEqualTypeOf<string>()

    // The separator is part of the id, not decoration a reader may vary.
    expectTypeOf<'VCF IN'>().not.toExtend<CascadiaJack>()
    expectTypeOf<'IN'>().not.toExtend<CascadiaJack>()

    // A second tripwire, in plain TypeScript, because the `expectTypeOf` failures above are
    // arity errors that say nothing about what broke. `Narrow` collapses to `never` the moment
    // `CascadiaJack` admits every string, and the assignment below then fails with a message a
    // reader can act on: Type '"VCF · IN"' is not assignable to type 'never'.
    type Narrow<T extends string> = string extends T ? never : T
    const narrow: Narrow<CascadiaJack> = 'VCF · IN'
    expect(narrow).toBe('VCF · IN')

    // `Device.jacks` is `JackSpec[]`, so the literals live only in this manifest's own binding —
    // the union cannot be recovered from the manifest once it is typed as a `Device`. Hence the
    // exported alias: it is the only handle a test has on the narrow type.
    const ids = new Set((device.jacks ?? []).map((j) => j.id))
    for (const id of ['VCO A · FM 1', 'VCF · IN', 'OUTPUT CONTROL · MAIN'] as CascadiaJack[]) {
      expect(ids.has(id), id).toBe(true)
    }
  })

  it('declares its jacks once, cited once, and references them from every cable (§3.3)', () => {
    // The repair this device drove. A jack existing is a fact about the box, documented on one
    // page; it is not something each of twenty-seven cables should restate.
    const jacks = device.jacks ?? []
    expect(jacks.length).toBeGreaterThan(50)
    for (const j of jacks) {
      expect(j.id, j.id).toContain(' · ')
      expect(j.verified, j.id).not.toBe(false)
      expect((j.verified as { source: string }).source, j.id).toMatch(
        /^Intellijel Cascadia Manual v1\.1, p\.\d+$/,
      )
    }
    // Cited once each: no page list anywhere, and no id declared twice.
    expect(new Set(jacks.map((j) => j.id)).size).toBe(jacks.length)

    // Every endpoint resolves to a declared jack of the right direction. The schema enforces
    // this at build time; asserting it here says the *data* satisfies it rather than that the
    // check exists.
    const direction = new Map(jacks.map((j) => [j.id, j.direction]))
    for (const recipe of device.recipes) {
      for (const entry of recipe.patch ?? []) {
        expect(direction.get(entry.from), `${recipe.id}: ${entry.from}`).toBe('out')
        expect(direction.get(entry.to), `${recipe.id}: ${entry.to}`).toBe('in')
      }
    }
  })

  it("claims only the connection on a cable, and says 'taste' where it is taste (§3.3)", () => {
    // A patch entry's `verified` now answers exactly one question — is this connection the right
    // choice — and for patching by ear the honest answer is `false`. That is the answer the shape
    // could not give while the citation was doing duty for the endpoints as well.
    const entries = device.recipes.flatMap((r) => r.patch ?? [])
    const cited = entries.filter((e) => e.verified !== false && e.verified !== undefined)
    const taste = entries.filter((e) => e.verified === false)
    expect(cited.length + taste.length).toBe(entries.length)

    // Most of this box is patched by ear, and says so.
    expect(taste.length).toBeGreaterThan(entries.length / 2)

    // But not all of it: the MAKE A SOUND walkthrough (pp.11-16) instructs specific cables by
    // letter, and those carry the page that instructs them. A field that always answered the
    // same way would not be earning its place.
    expect(cited.length).toBeGreaterThan(0)
    for (const entry of cited) {
      const where = entry.verified
      if (where === false || where === undefined) throw new Error('unreachable')
      expect(where.source).toMatch(/^Intellijel Cascadia Manual v1\.1, p\.1[1-6]$/)
    }

    // The recipe carries no default behind either. With the jacks citing themselves and every
    // knob position being taste, there is nothing left worth defaulting to — and a citation
    // reappearing here would make every uncited parameter point start claiming the manual.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
    for (const { recipe, param } of params()) {
      expect(param.verified, `${recipe}: ${param.name}`).toBe(false)
    }
  })

  it('says of every cable whether it replaces a normal or fills an empty input (§3.3)', () => {
    // Not every input on this box is normalled — `VCO A · FM 1`, `VCF · FM 3`, `VCF · Q`,
    // `WAVE FOLDER · FOLD` and `LFO X / Y / Z · RATE CV` have none — so a note saying "breaks the
    // X normal" and a note saying "FM 1 has no normal" are two different, both necessary, facts.
    for (const recipe of device.recipes) {
      for (const entry of recipe.patch ?? []) {
        const note = entry.note
        expect(note, `${recipe.id}: ${entry.from} -> ${entry.to}`).toBeDefined()
        expect(note as string, `${recipe.id}: ${entry.to}`).toMatch(/normal|manual’s cable/)
      }
    }
  })

  it('renders the patch as cables in the guide, cited and annotated (§8)', () => {
    const result = alone()
    const withPatch = result.assignments.filter((a) => a.patch.length > 0)
    expect(withPatch.length).toBeGreaterThan(0)

    const guide = renderGuide(result)
    expect(guide).toContain('**Patch**')
    for (const assignment of withPatch) {
      for (const entry of assignment.patch) {
        expect(guide).toContain(`\`${entry.from}\` → \`${entry.to}\``)
        expect(guide).toContain(entry.note as string)
      }
    }
  })

  // -------------------------------------------------------------------------
  // §3.1 / §3.2 — the two claims, kept apart on a box that prints almost no numbers
  // -------------------------------------------------------------------------

  it('marks every slider-travel range unverified, and never hangs mood on one', () => {
    // `% travel` is our description of a fader with no printed scale, not a scale the box shows.
    // The range is uncited, so §3.1's legality gate forbids mood from moving it — and a `mood`
    // entry there would be advertising an axis that provably does nothing, which is the
    // "mood-inert" debt the audit tracks. Neither claim is left to inherit: an omitted
    // `range.verified` would pick up the recipe's *patch* citation.
    for (const { recipe, param } of params()) {
      if (param.kind !== 'numeric' || param.unit !== '% travel') continue
      expect(param.range.verified, `${recipe}: ${param.name}`).toBe(false)
      expect(param.range.min, param.name).toBe(0)
      expect(param.range.max, param.name).toBe(100)
      expect(param.mood, `${recipe}: ${param.name}`).toBeUndefined()
    }
  })

  it('puts every mood offset on a range the manual actually prints', () => {
    for (const { recipe, param } of params()) {
      if (param.kind !== 'numeric' || param.mood === undefined) continue
      const where = param.range.verified
      expect(where, `${recipe}: ${param.name}`).not.toBe(false)
      expect((where as { source: string }).source, param.name).toContain(MANUAL)
    }
  })

  it('cites every option set and declines the axis it has nothing to offer', () => {
    for (const { recipe, param } of params()) {
      if (param.kind !== 'enum') continue
      expect(param.options.verified, `${recipe}: ${param.name}`).not.toBe(false)
      expect((param.options.verified as { source: string }).source, param.name).toContain(MANUAL)
    }
    // §6: a device declines an axis by having no parameter that declares it. Nothing on this box
    // has a swing to offer, so nothing claims one.
    const axes = new Set(
      params().flatMap(({ param }) =>
        param.kind === 'numeric' ? (param.mood ?? []).map((m) => m.axis) : [],
      ),
    )
    expect(axes.has('swing')).toBe(false)
    expect(axes.size).toBeGreaterThan(2)
  })

  it('mixes no third spelling into a unit the library already spells two ways (#29)', () => {
    // The manual writes "semitones" and "duty cycle" in full. Both were given up for `st` and
    // `%`, because a third spelling of something already spelled `St` and `st` makes the drift
    // the units test tracks worse rather than better. `% travel` is kept because it is a
    // different claim, not a different spelling.
    const units = new Set(
      params().flatMap(({ param }) =>
        param.kind === 'numeric' && param.unit !== undefined ? [param.unit] : [],
      ),
    )
    expect([...units].sort()).toEqual(['%', '% travel', 'V', 'ms', 'st', '°'])
  })

  // -------------------------------------------------------------------------
  // §3 — the recipes as a set
  // -------------------------------------------------------------------------

  it('parses every recipe on its own, and names them all for this device', () => {
    for (const recipe of device.recipes) {
      const parsed = RecipeSchema.safeParse(recipe)
      expect(parsed.success ? [] : parsed.error.issues, recipe.id).toEqual([])
      expect(recipe.id.startsWith('cascadia-'), recipe.id).toBe(true)
      expect(recipe.voice).toBe('voice')
    }
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
  })

  it('authors a recipe for every role it declares, and each resolves exactly (§3.5)', () => {
    // A role on the voice with nothing authored behind it is the `no-recipe` gap that this
    // device closed for `metallic` elsewhere in the library. It should not open one of its own.
    const assignable = expand(device)[0]
    if (assignable === undefined) throw new Error('no assignable')
    for (const role of voice().roles) {
      const mine = device.recipes.filter((r) => r.role === role)
      expect(mine.length, role).toBeGreaterThan(0)
      for (const recipe of mine) {
        const resolved = resolveRecipe(device, assignable, role, recipe.character, 1)
        expect(resolved.outcome, `${role}/${recipe.character}`).toBe('exact')
      }
    }
    // And nothing is authored for a role the voice does not declare.
    const declared = new Set<string>(voice().roles)
    for (const recipe of device.recipes) expect(declared.has(recipe.role), recipe.id).toBe(true)
  })

  it('sends and receives clock, and says over what (§7.4)', () => {
    // p.78: the MIDI OUT jack and the USB MIDI port both transmit Cascadia's internal Tap Clock,
    // "enabled, by default, in the factory settings". p.20: incoming MIDI clock takes over
    // automatically. The MIDI CLK jack is an analog clock *output* at a selectable division.
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock'])
  })
})
