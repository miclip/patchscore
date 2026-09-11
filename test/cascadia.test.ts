import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  DeviceSchema,
  evidenceFor,
  jackFact,
  NEUTRAL_MOOD,
  RecipeSchema,
  recipeRouting,
  expand,
  renderGuide,
  resolve,
  resolvePatch,
  resolveRecipe,
  type AuthoredParam,
} from '../lib/core/index'
import { device, type CascadiaJack } from '../lib/devices/intellijel-cascadia/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { kitRecipes } from '../lib/studio/device-page'
import { TEMPLATES, generativeDrift, industrialTechno } from '../lib/templates/index'

/**
 * #49. The Cascadia is the first device in the library whose recipes carry a `patch` list, so
 * this file is not only "does the fourth manifest parse". It is the evidence for the claim the
 * device was scheduled to test: that **`PatchEntry` survives real data**, from authoring through
 * Zod, the resolver and the guide.
 *
 * Every assertion below is about something that had never run against anything but a fixture.
 */

const MANUAL = 'Intellijel Cascadia Manual v1.4, '

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

/**
 * One box, Industrial Techno: twelve requests against one monophonic voice. Named rather than
 * taken as `TEMPLATES[0]`, because what this file needs is a template that asks for a `pad` and
 * a `stab` — the registry is ordered by id (§7.2) and its first entry is whichever genre sorts
 * first, which is not a promise about what any genre requests.
 */
function alone() {
  return resolve({
    devices: [device],
    template: industrialTechno,
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
    // p.122, verbatim: "Width: 348mm (including wood end cheeks)". The figure covers the whole
    // unit rather than the metal panel, which is the caveat the manifest records and the reason
    // the drawn panel adds no cheeks of its own — it would put the drawing wider than 348.
    expect(device.physical.panelSpanMm).toBe(348)
    expect(device.physical.verified).toEqual({ kind: 'manual', source: `${MANUAL}p.122` })
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
      const gap = result.shortfalls.find((g) => g.role === role)
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
    // Every recipe says where the notes come from instead — and says it in the half of the
    // routing line that is about the box (§3.7/#496), which is what the kit page hoists into its
    // header rather than reprinting under all eight sounds. The claim is over the composed line,
    // because that is what a guide prints and what a reader of one sees.
    for (const recipe of device.recipes) {
      expect(recipeRouting(recipe), recipe.id).toContain('no sequencer of its own')
      expect(recipe.routingPreamble, recipe.id).toContain('no sequencer of its own')
      expect(recipe.routing, recipe.id).not.toContain('no sequencer of its own')
    }
    // One preamble, not twenty-one that happen to agree: the hoist is only honest if every
    // recipe carries the same authored string.
    expect(new Set(device.recipes.map((r) => r.routingPreamble)).size).toBe(1)
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
      // §2.6/#22. The page moved to `capabilityEvidence` at `jacks[<id>]`, where the audit and
      // both renderers can reach it. The claim is unchanged and still required.
      const evidence = evidenceFor(device, jackFact(j.id))
      expect(evidence, j.id).not.toBe(false)
      // One `p.N` for a jack the manual describes in one place, and an ascending `pp.` list for
      // the three whose behaviour v1.4 documents across several — see #481 and the MIDI / CV
      // block in `index.ts`. Both shapes are checked here rather than one being waved through.
      expect((evidence as { source: string }).source, j.id).toMatch(
        /^Intellijel Cascadia Manual v1\.4, (p\.\d+|pp\.\d+(?:, \d+)+)$/,
      )
    }
    // One evidence entry per jack, and no id declared twice. A jack answering to several pages
    // says so in one citation; it never gets a second entry.
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
      expect(where.source).toMatch(/^Intellijel Cascadia Manual v1\.4, p\.1[1-6]$/)
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

  it('keeps MANUAL GATE armed on every kit-eligible recipe, and says so on the jack (p.54)', () => {
    // #478's kit section claims this box makes these sounds *from scratch*, and with nothing
    // sequencing a Cascadia the control that plays one is the front panel MANUAL GATE button.
    // p.54 gives that button two conditions: it gates Envelope A and Envelope B by default only
    // while nothing is patched into either of their GATE inputs, and a cable inserted into
    // `PUSH GATE · GATE OUT` stops it gating them at all.
    //
    // **What this holds is one claim: on every kit recipe, both envelopes are still under
    // MANUAL GATE.** It does not claim that a recipe patching one of those three sockets would
    // be silent — with Envelope B's gate driven from elsewhere the button still reaches
    // Envelope A, and what a recipe does with either envelope varies. The claim is that the
    // button `routing` offers a reader still reaches both, and that no patch here takes it away.
    //
    // No recipe reaches for them today. This is the line that says so out loud, because the
    // hazard is invisible in the patch list: `GATE OUT` is an output, so nothing about patching
    // it looks like it takes anything away.
    const gateOut = (device.jacks ?? []).find((j) => j.id === 'PUSH GATE · GATE OUT')
    expect(gateOut?.note ?? '').toMatch(/MANUAL GATE/)
    expect((evidenceFor(device, jackFact('PUSH GATE · GATE OUT')) as { source: string }).source)
      .toBe(`${MANUAL}p.54`)

    const disarms = ['PUSH GATE · GATE OUT', 'ENVELOPE A · GATE', 'ENVELOPE B · GATE/SYNC']
    const kit = kitRecipes(device)
    expect(kit.length).toBeGreaterThan(0)
    for (const recipe of kit) {
      for (const entry of recipe.patch ?? []) {
        const where = `${recipe.id}: ${entry.from} -> ${entry.to}`
        expect(disarms, where).not.toContain(entry.from)
        expect(disarms, where).not.toContain(entry.to)
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
    //
    // `step` arrives with #481's ESG sequence length. It is the library's existing spelling for a
    // count of sequencer steps — reviewed at #29 off the TR-8S's p.27, singular — even though
    // this manual writes "from 1 to 16 steps". The box's plural is in the note; the unit is the
    // library's, because one quantity gets one spelling.
    const units = new Set(
      params().flatMap(({ param }) =>
        param.kind === 'numeric' && param.unit !== undefined ? [param.unit] : [],
      ),
    )
    expect([...units].sort()).toEqual(['%', '% travel', 'V', 'ms', 'st', 'step', '°'])
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

  // -------------------------------------------------------------------------
  // §3.1/#481 — the Entropic Sequence Generator, and the switch it hangs on
  // -------------------------------------------------------------------------

  /**
   * p.93: the ESG "replaces the Free/Sync tilting LFO". So `MODE = LFO` alone does not say what
   * Envelope B is doing, and the three sliders under it mean different quantities depending on an
   * instrument-wide setting made at boot. Every LFO-mode recipe has to name that setting or its
   * values are uninterpretable — CLAUDE.md's rule about a cited range read off the wrong scale.
   *
   * Written as a sweep over the recipes rather than against the two that exist today, so the third
   * LFO recipe somebody adds fails here rather than shipping ambiguous.
   */
  it('names the LFO shape on every Envelope B LFO recipe, because the mode decides the units', () => {
    const lfoRecipes = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some(
        (p) => p.kind === 'enum' && p.name === 'ENVELOPE B · MODE' && p.value === 'LFO',
      ),
    )
    expect(lfoRecipes.length).toBeGreaterThan(1)

    for (const recipe of lfoRecipes) {
      const shape = (recipe.params as AuthoredParam[]).find(
        (p) => p.name === 'ENVELOPE B · LFO SHAPE',
      )
      expect(shape, recipe.id).toBeDefined()
      if (shape === undefined || shape.kind !== 'enum') throw new Error('unreachable')

      // The option set is the legality claim (§3.2) and is p.93's, in the manual's own words.
      expect(shape.options.values, recipe.id).toEqual(['Tilting LFO', 'Entropic Sequence Generator'])
      expect((shape.options.verified as { source: string }).source, recipe.id).toBe(`${MANUAL}p.93`)

      // One setting for the instrument, not for the part: it is not reached from the patch at all.
      expect(shape.scope, recipe.id).toBe('song')
      // And the recipe says how it is reached, or a reader hunts the panel for a switch that is
      // not on it.
      expect(shape.note, recipe.id).toMatch(/boot|powering on|Config app/)
    }

    // Both shapes are actually authored somewhere. A switch only one side of which is ever
    // selected is a fact nobody can act on.
    const chosen = new Set(
      lfoRecipes.flatMap((r) =>
        (r.params as AuthoredParam[])
          .filter((p) => p.name === 'ENVELOPE B · LFO SHAPE' && p.kind === 'enum')
          .map((p) => (p as { value: string }).value),
      ),
    )
    expect([...chosen].sort()).toEqual(['Entropic Sequence Generator', 'Tilting LFO'])
  })

  /**
   * The two quantities p.93 puts numbers on, and the one it does not.
   *
   * p.90 prints a real scale for this slider — 0.05 Hz to about 800 Hz, and a 2-to-8
   * multiply/divide series when synced — but all of it is the *tilting* LFO's. Citing it on an ESG
   * rate would be a correct citation off the wrong printed scale, which is the failure the
   * manifest's own header calls out. So the rate stays travel and only the two cited ones carry a
   * page.
   */
  it('cites the ESG’s length and probability to p.93, and leaves its rate as travel', () => {
    const esg = device.recipes.find((r) => r.id === 'cascadia-sweep-soft')
    if (esg === undefined) throw new Error('the ESG recipe should exist')
    const by = (name: string) =>
      (esg.params as AuthoredParam[]).find((p) => p.name === name)

    const shape = by('ENVELOPE B · LFO SHAPE')
    expect(shape?.kind === 'enum' ? shape.value : undefined).toBe('Entropic Sequence Generator')

    // Clock-synced, and the clock is patched rather than assumed: p.93 says the GATE/SYNC input
    // sets the base rate in SYNC mode, and the jack's own normal is the external gate (p.92).
    const type = by('ENVELOPE B · TYPE')
    expect(type?.kind === 'enum' ? type.value : undefined).toBe('SYNC')
    expect(esg.patch?.map((c) => `${c.from} -> ${c.to}`)).toContain(
      'MIDI / CV · MIDI CLK -> ENVELOPE B · GATE/SYNC',
    )
    // And the sequence has somewhere to go, or it is a modulator patched into nothing.
    expect(esg.patch?.some((c) => c.from === 'ENVELOPE B · ENV B')).toBe(true)

    const fall = by('ENVELOPE B · FALL')
    if (fall?.kind !== 'numeric') throw new Error('sequence length should be numeric')
    expect(fall.value).toBe(11)
    expect(fall.unit).toBe('step')
    expect(fall.range).toEqual({ min: 1, max: 16, verified: { kind: 'manual', source: `${MANUAL}p.93` } })

    const shapeSlider = by('ENVELOPE B · SHAPE')
    if (shapeSlider?.kind !== 'numeric') throw new Error('regeneration should be numeric')
    expect(shapeSlider.unit).toBe('%')
    expect(shapeSlider.range).toEqual({
      min: 0,
      max: 100,
      verified: { kind: 'manual', source: `${MANUAL}p.93` },
    })
    expect(shapeSlider.value).toBeGreaterThanOrEqual(0)
    expect(shapeSlider.value).toBeLessThanOrEqual(100)

    // The rate carries no page, because p.93 prints no number for it.
    const rise = by('ENVELOPE B · RISE')
    if (rise?.kind !== 'numeric') throw new Error('the rate should be numeric')
    expect(rise.unit).toBe('% travel')
    expect(rise.range.verified).toBe(false)
  })

  /**
   * #481. **The ESG recipe is reached by the resolver, on a rig somebody could actually own.**
   *
   * Authored-and-exact is not the same as selected, and on this box the difference has teeth: the
   * `pad` role is authored and never wins, because every pad request in the library asks for three
   * or four notes and this is one monophonic voice. `sweep` is the role where a mono box competes,
   * and `generative-drift` asks for `sweep`/`soft` over its two middle sections.
   *
   * Two devices, so the rig is legal several times over against `MAX_RIG_DEVICES`. The MPC covers
   * every higher-priority request and authors no sweep, which is the condition that leaves this one
   * to the Cascadia — stated here so a future reader knows what the fixture is holding rather than
   * having to re-derive it from an id.
   *
   * Asserted as an outcome, never as a cost (CLAUDE.md): the claim is "the ESG lands on the sweep",
   * not a `Score` number that a re-ordering of the lower keys would move.
   */
  it('is selected for generative-drift’s sweep on a two-box rig (#481)', () => {
    const mpc = DEVICES.find((d) => d.id === 'akai-mpc-live-iii')
    if (mpc === undefined) throw new Error('the MPC Live III should be in the registry')

    for (const seed of [0, 1, 2, 3]) {
      const result = resolve({
        devices: [device, mpc],
        template: generativeDrift,
        mood: NEUTRAL_MOOD,
        seed,
      })
      const mine = result.assignments.filter((a) => a.deviceId === 'intellijel-cascadia')
      expect(mine.map((a) => a.recipe?.id), `seed ${seed}`).toEqual(['cascadia-sweep-soft'])
    }

    // And it renders, hoisted: the boot setting is one setting for the instrument, so the guide
    // states it above the parts rather than inside the one part this box carries.
    const guide = renderGuide(
      resolve({ devices: [device, mpc], template: generativeDrift, mood: NEUTRAL_MOOD, seed: 0 }),
    )
    expect(guide).toContain('Scramble the entropic sequence across the join, then lock what lands')
    expect(guide).toContain('**ENVELOPE B · LFO SHAPE** `Entropic Sequence Generator`')
    expect(guide).toContain('**ENVELOPE B · FALL** `11` step (1…16 step)')
    expect(guide).toContain('hold MIDI LFO while powering on')
    // The citation sentence names the edition and reaches the ESG's page (§8/#394).
    expect(guide).toContain('Intellijel Cascadia Manual v1.4, pp.22-93')
  })

  // -------------------------------------------------------------------------
  // §2.6/#481 — MPE, Dual Mono and the full CC range, recorded as capability
  // -------------------------------------------------------------------------

  /**
   * Three of v1.4's four new features are facts about how the box is played and controlled rather
   * than ways to make a part sound, so they land on the jacks that carry them and on nothing else.
   *
   * Each of the three jacks keeps the page that says it *exists* — pp.17, 18 and 21 — because that
   * is the page a reader hunting the socket needs, and a citation that moved to the most recently
   * read page would have dropped it silently.
   */
  it('records MPE, Dual Mono and the full CC range on the jacks that carry them (#481)', () => {
    const jacks = new Map((device.jacks ?? []).map((j) => [j.id, j]))
    const evidence = (id: string) =>
      (evidenceFor(device, jackFact(id)) as { source: string }).source

    // MPE X-axis. p.101 names the axis and the 48-semitone bend range; p.17 says the jack exists.
    expect(jacks.get('MIDI / CV · MIDI PITCH')?.signal).toEqual(['pitch-cv'])
    expect(evidence('MIDI / CV · MIDI PITCH')).toBe(`${MANUAL}pp.17, 101`)
    expect(jacks.get('MIDI / CV · MIDI PITCH')?.note).toMatch(/X-axis/)

    // MPE Y-axis is CC 74; Dual Mono puts voice 2's *pitch* here, which is why `pitch-cv` is
    // declared alongside `cv`; pp.109 gives the selectable range.
    expect(jacks.get('MIDI / CV · MIDI CC')?.signal).toEqual(['cv', 'pitch-cv'])
    expect(evidence('MIDI / CV · MIDI CC')).toBe(`${MANUAL}pp.18, 100, 102, 109`)
    expect(jacks.get('MIDI / CV · MIDI CC')?.note).toMatch(/CC 74/)
    expect(jacks.get('MIDI / CV · MIDI CC')?.note).toMatch(/Dual Mono/)
    expect(jacks.get('MIDI / CV · MIDI CC')?.note).toMatch(/0-127/)

    // MPE Z-axis is pressure; Dual Mono puts voice 2's *gate* here, hence `gate`.
    expect(jacks.get('MIDI / CV · MIDI MOD')?.signal).toEqual(['cv', 'gate'])
    expect(evidence('MIDI / CV · MIDI MOD')).toBe(`${MANUAL}pp.21, 100, 102, 110`)
    expect(jacks.get('MIDI / CV · MIDI MOD')?.note).toMatch(/Pressure/)
    expect(jacks.get('MIDI / CV · MIDI MOD')?.note).toMatch(/Dual Mono/)
    expect(jacks.get('MIDI / CV · MIDI MOD')?.note).toMatch(/0-127/)

    // Every other jack keeps a single page. The multi-page form is for a socket whose behaviour
    // the manual genuinely splits across chapters, not a licence to append pages anywhere.
    const multi = (device.jacks ?? []).filter((j) => evidence(j.id).includes('pp.'))
    expect(multi.map((j) => j.id).sort()).toEqual([
      'MIDI / CV · MIDI CC',
      'MIDI / CV · MIDI MOD',
      'MIDI / CV · MIDI PITCH',
    ])
  })

  /**
   * **A tripwire, and it is meant to be tripped.**
   *
   * `MIDI CC` carries `pitch-cv` and `MIDI MOD` carries `gate` on p.100's authority, and both are
   * true *only while the box is in Dual Mono* — a song-wide MIDI mode set at boot or in the Config
   * app. The signal list is unconditional, so nothing in the type system stops a recipe patching
   * `MIDI CC` into a pitch input on a box that is not in that mode, which would print a cable the
   * reader's instrument does not have.
   *
   * The manifest declares one voice and one default topology deliberately (see the MIDI / CV block
   * in `index.ts`), so today no recipe reaches for either. **If this test fails, the recipe that
   * failed it owes the reader the mode**, the way every Envelope B LFO recipe owes them the LFO
   * shape. Deleting the assertion is not the fix.
   */
  it('patches neither Dual Mono jack until a recipe can say the box is in that mode (#481)', () => {
    const conditional = new Set(['MIDI / CV · MIDI CC', 'MIDI / CV · MIDI MOD'])
    for (const recipe of device.recipes) {
      for (const entry of recipe.patch ?? []) {
        expect(conditional.has(entry.from), `${recipe.id}: ${entry.from}`).toBe(false)
      }
    }
  })

  // -------------------------------------------------------------------------
  // §3.2/#479 — ALT is not a sound, so the recipe names which one
  // -------------------------------------------------------------------------

  /**
   * p.42's `ALT` position defers: it plays *"the currently loaded ALTernative digital noise
   * source"*, of which there are four, loaded by a button combination that is not on the panel.
   * A recipe stopping at `ALT` has picked one of twelve sounds and written down none of them.
   *
   * Swept over the recipes rather than asserted against the one that has it today, so the next
   * `ALT` recipe fails here instead of shipping underdetermined.
   */
  it('names which ALT noise is loaded wherever a recipe selects ALT (#479)', () => {
    const altRecipes = device.recipes.filter((r) =>
      (r.params as AuthoredParam[]).some(
        (p) => p.kind === 'enum' && p.name === 'MIXER · NOISE TYPE' && p.value === 'ALT',
      ),
    )
    expect(altRecipes.length).toBeGreaterThan(0)

    for (const recipe of altRecipes) {
      const source = (recipe.params as AuthoredParam[]).find(
        (p) => p.name === 'MIXER · ALT NOISE SOURCE',
      )
      expect(source, recipe.id).toBeDefined()
      if (source === undefined || source.kind !== 'enum') throw new Error('unreachable')

      // The option set is p.42's four, in the manual's own words and its own order.
      expect(source.options.values, recipe.id).toEqual(['Cymbal', 'Crunch', 'Crackle', 'Velvet'])
      expect((source.options.verified as { source: string }).source, recipe.id).toBe(`${MANUAL}p.42`)

      // The loading action is on the parameter, because that is the part a reader cannot work out
      // from the panel — see the rendered-with-hints-off test below for why it lives here.
      expect(source.note, recipe.id).toMatch(/MANUAL GATE/)
      expect(source.note, recipe.id).toMatch(/MIDI CC/)
      // And it is not a hint. #479 found `noise-alt` sitting in the hint table attached to
      // nothing; a hint is a jog (invariant 7) and this is the value.
      expect(source.hint, recipe.id).toBeUndefined()
      expect(Object.keys(device.hints ?? {})).not.toContain('noise-alt')
    }

    // No sub-variant is authored, and the reason is on p.42: the three per source are unnamed,
    // unnumbered and undisplayed, so there would be nothing a reader could confirm they reached.
    for (const recipe of altRecipes) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      expect(names.filter((n) => /VARIATION|VARIANT/i.test(n)), recipe.id).toEqual([])
    }
  })

  /**
   * #479's second question. On this box the noise colour is a switch position, so a recipe setting
   * a level with no type inherits whatever is loaded — which, if the switch is on `ALT`, is any of
   * twelve sounds. `cascadia-sweep-dark` did exactly that; it now names `PINK`.
   */
  it('never sets a noise level without saying which noise (#479)', () => {
    for (const recipe of device.recipes) {
      const params = recipe.params as AuthoredParam[]
      if (!params.some((p) => p.name === 'MIXER · NOISE')) continue
      const type = params.find((p) => p.name === 'MIXER · NOISE TYPE')
      expect(type, recipe.id).toBeDefined()
      if (type === undefined || type.kind !== 'enum') throw new Error('unreachable')
      expect((type.options.verified as { source: string }).source, recipe.id).toBe(`${MANUAL}p.42`)
    }
  })

  /**
   * **The reason the loading action is a `note` and not a `hint`, demonstrated rather than argued.**
   *
   * §8.1 gives hints a toggle, so anything living there is invisible to a reader who has turned
   * them off — and *which of four sources is loaded, and how to load it* is the value on this
   * parameter, not a jog about it (invariant 7). Rendered both ways on a rig that actually
   * resolves the recipe, the line and its action are identical.
   */
  it('keeps the ALT loading action visible with hints switched off (§8.1/#479)', () => {
    const crave = DEVICES.find((d) => d.id === 'behringer-crave')
    const tr8s = DEVICES.find((d) => d.id === 'roland-tr-8s')
    if (crave === undefined || tr8s === undefined) throw new Error('rig devices should exist')

    const result = resolve({
      devices: [device, crave, tr8s],
      template: industrialTechno,
      mood: NEUTRAL_MOOD,
      seed: 0,
    })
    expect(result.assignments.map((a) => a.recipe?.id)).toContain('cascadia-noise-dirty')

    for (const hints of [true, false]) {
      const guide = renderGuide(result, { hints })
      expect(guide, `hints: ${hints}`).toContain('**MIXER · ALT NOISE SOURCE** `Crunch`')
      expect(guide, `hints: ${hints}`).toContain('hold MANUAL GATE and press MIDI CC to load it')
    }
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


// ---------------------------------------------------------------------------
// §3/#506 — whether the amplitude stage holds a note
// ---------------------------------------------------------------------------

/**
 * §3/#506. **This manifest has been read for sustain**, and the record is pinned so the next
 * declaration is a deliberate one with a page behind it.
 *
 * Three pages, rendered and read. p.53: *"If nothing is patched into the LEVEL MOD IN jack, then the
 * output of ENV A [4.F] is used as the modulation source"*; p.32: *"if the GATE IN is high, the
 * envelope moves through its stages until it hits the sustain stage, and remains there until the
 * gate goes low"*; p.28: the S slider is 0 V to 5 V. The routing assumption is that both normals
 * stand, and the test below checks that no held recipe patches into either jack. A `decays` would
 * also need the VCA's bias at zero (p.52), which neither acid authors, so both are left.
 */
describe('sustain claims (§3/#506)', () => {
  const heldRoles = (() => {
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

  it('holds on the subs, the texture and the pad, Envelope A normalled to VCA A', () => {
    const ids = ['cascadia-sub-dark', 'cascadia-sub-clean', 'cascadia-texture-soft', 'cascadia-pad-dark']
    for (const id of ids) {
      const r = device.recipes.find((recipe) => recipe.id === id)
      expect(r, id).toBeDefined()
      expect(r?.sustain, id).toEqual({
        kind: 'sustains',
        control: { kind: 'parameters', params: ['ENVELOPE A · SUSTAIN'] },
        evidence: { kind: 'manual', source: 'Intellijel Cascadia Manual v1.4, pp.28, 32, 53' },
      })
      for (const name of ['ENVELOPE A · SUSTAIN']) {
        expect(r?.params.some((p) => p.name === name), `${id} ${name}`).toBe(true)
      }
    }
  })

  it('declares on exactly those, leaves exactly these held-role recipes unestablished, and every unheld one silent', () => {
    expect(device.recipes.filter((r) => r.sustain !== undefined).map((r) => r.id).sort()).toEqual(['cascadia-sub-dark', 'cascadia-sub-clean', 'cascadia-texture-soft', 'cascadia-pad-dark'].sort())
    const unclaimed = device.recipes
      .filter((r) => heldRoles.has(r.role) && r.sustain === undefined)
      .map((r) => r.id)
    // Both acids sit at `SUSTAIN 0 V` and author no VCA bias, so the page cannot say which way
    // their note ends on the recipe as written; read, and left.
    expect(unclaimed).toEqual(['cascadia-acid-dirty', 'cascadia-acid-bright'])
    for (const r of device.recipes) {
      if (!heldRoles.has(r.role)) expect(r.sustain, r.id).toBeUndefined()
    }
  })

  it('rests on the normals: no held recipe patches into VCA A LEVEL MOD IN or ENVELOPE A GATE IN', () => {
    for (const r of device.recipes) {
      if (r.sustain === undefined) continue
      for (const entry of r.patch ?? []) {
        expect(entry.to, `${r.id}: ${entry.from} -> ${entry.to}`).not.toMatch(/^VCA A · LEVEL MOD IN$/)
        expect(entry.to, `${r.id}: ${entry.from} -> ${entry.to}`).not.toMatch(/^ENVELOPE A · GATE/)
      }
    }
  })

  it('pairs each claim with a sustain level above zero, and neither acid authors the VCA bias', () => {
    const level = (id: string, name: string) => {
      const p = device.recipes.find((r) => r.id === id)?.params.find((p) => p.name === name)
      return p?.kind === 'numeric' ? p.value : undefined
    }
    for (const id of ['cascadia-sub-dark', 'cascadia-sub-clean', 'cascadia-texture-soft', 'cascadia-pad-dark']) {
      expect(level(id, 'ENVELOPE A · SUSTAIN'), id).toBeGreaterThan(0)
    }
    for (const id of ['cascadia-acid-dirty', 'cascadia-acid-bright']) {
      expect(level(id, 'ENVELOPE A · SUSTAIN'), id).toBe(0)
      expect(level(id, 'VCA A · LEVEL'), id).toBeUndefined()
    }
  })
})
