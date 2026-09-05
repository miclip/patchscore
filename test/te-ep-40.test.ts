import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  bearsPattern,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  realisationOf,
  renderGuide,
  resolve,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { device } from '../lib/devices/te-ep-40/index'
import { device as ko2 } from '../lib/devices/te-ep-133/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The EP–40 riddim is the library's **third box authored from a web-guide mirror** and its third
 * teenage engineering box, so most of what this file checks is what `test/te-ep-133.test.ts`
 * checks: every citation carries the date the pages were taken, because a live URL cited without
 * one means nothing; and the guide prints no range for any sound parameter, so there are no
 * numerics at all and no point is cited anywhere.
 *
 * Four things are this box's own, and they are why this file is not that one with the ids changed.
 *
 * **`loop` is a fourth play mode, and a loop pad cannot be sequenced.** Guide 8.2.1 adds it and
 * guide 9.3 explains the consequence: a loop runs in the background and reaches a pattern only
 * through the loop startup sequence. A part the sequencer cannot record cannot bear a step
 * pattern, so `loop` is legal on exactly the roles `bearsPattern()` says get no steps — which is
 * `pad` and nothing else. That is a constraint no field can express, so it is held here.
 *
 * **The supertone is a synth engine whose values the guide never prints.** Ten sounds, two preset
 * parameters each, nine possible parameters named as a set, and not one page saying which sound
 * carries which or what any of them reads. So the supertone recipes set no supertone value, and
 * this file holds them to that.
 *
 * **`features.lfo` is `unknown` where the sibling's is `cited-against`.** The K.O. II's guide never
 * uses the word; this one lists *"lfo speed"* among the supertone parameters. Read, and the
 * document answers half the question — which is exactly the state `unknown` is for, and the
 * opposite of the sibling's answer to the same field.
 *
 * **The panel was measured off a different drawing and lands on the same grid.** The two boxes
 * share a chassis. That makes a copied file and an independent measurement look alike, so the
 * numbers here are checked against *this* figure's own dimensions.
 */

const GUIDE = 'EP–40 riddim guide'
const MIRRORED = 'mirrored 2026-08-28'
const FETCHED = 'fetched 2026-08-28'

/** The panel face as measured in `panel.ts`, in the drawing's own units. */
const DRAWN_SPAN = 289.0
const DRAWN_RISE = 394.0

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function enumValue(recipe: Recipe, name: string): string {
  const p = named(recipe, name)
  return p?.kind === 'enum' ? p.value : ''
}

describe('EP–40 riddim manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('te-ep-40')
    expect(device.maker).toBe('teenage engineering')
    expect(device.kind).toBe('sampler')
  })

  it('carries recipes on distinct (role, character) keys, with unique ids', () => {
    const keys = device.recipes.map((r) => `${r.role}/${r.character}`)
    expect(new Set(keys).size).toBe(keys.length)
    const ids = device.recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
      expect(recipe.voice).toBe('pad')
    }
  })

  // -------------------------------------------------------------------------
  // A mirror has no page number, so the date is the citation
  // -------------------------------------------------------------------------

  describe('every citation names a guide section and the date the mirror was taken', () => {
    /** Every `Cite` anywhere in the manifest — params, ranges, option sets, prep, evidence. */
    function citations(): { where: string; source: string; kind: string }[] {
      const out: { where: string; source: string; kind: string }[] = []
      const push = (where: string, v: unknown) => {
        if (v && typeof v === 'object' && 'kind' in v && 'source' in v) {
          out.push({ where, kind: String(v.kind), source: String(v.source) })
        }
      }
      for (const recipe of device.recipes) {
        push(`${recipe.id}.verified`, recipe.verified)
        push(`${recipe.id}.sourceAudio.prep`, recipe.sourceAudio?.prep?.verified)
        for (const p of params(recipe)) {
          push(`${recipe.id}.${p.name}`, p.verified)
          if (p.kind === 'enum') push(`${recipe.id}.${p.name}.options`, p.options.verified)
          if (p.kind === 'numeric') push(`${recipe.id}.${p.name}.range`, p.range.verified)
        }
        for (const a of recipe.articulation ?? []) push(`${recipe.id}.articulation`, a.verified)
      }
      for (const [path, ev] of Object.entries(device.capabilityEvidence ?? {})) {
        if (ev && typeof ev === 'object' && 'cite' in ev) push(path, ev.cite)
        else push(path, ev)
      }
      push('physical.verified', device.physical.verified)
      push('panel.verified', device.panel?.verified)
      return out
    }

    it('finds citations of both kinds to check', () => {
      const all = citations()
      expect(all.length).toBeGreaterThan(20)
      expect(all.filter((c) => c.kind === 'manual').length).toBeGreaterThan(20)
      // Three `maker` citations rather than the sibling's two: the dimensions, the front view, and
      // one recipe's `prep`, because the guide's own list of sound bands stops at 599 and the
      // product page prints a sixth.
      expect(all.filter((c) => c.kind === 'maker').map((c) => c.where).sort()).toEqual([
        'ep40-impact-hard.sourceAudio.prep',
        'panel.verified',
        'physical.verified',
      ])
      // `observed` would be somebody with the unit in front of them, and nobody here has one.
      expect(all.filter((c) => c.kind === 'observed')).toEqual([])
    })

    it('stamps the mirror date on every manual citation', () => {
      for (const c of citations()) {
        if (c.kind !== 'manual') continue
        expect(c.source, c.where).toContain(GUIDE)
        expect(c.source, c.where).toContain(MIRRORED)
        // A guide path, not a page number: this document has none.
        expect(c.source, c.where).toMatch(/\/ep-40\//)
      }
    })

    it('dates the maker citations too, because a live page can change under one', () => {
      for (const c of citations()) {
        if (c.kind !== 'maker') continue
        expect(c.source, c.where).toContain(FETCHED)
        expect(c.source, c.where).toContain('teenage.engineering/')
      }
    })

    it('takes the panel span from the maker rather than the guide, which prints no size', () => {
      // #191's third kind. The nineteen pages carry no width, depth or weight anywhere — the
      // specifications page is purely electrical — so `manual` would be a citation to nothing and
      // `false` would say nobody checked when teenage engineering publishes the figure.
      expect(device.physical.verified).toMatchObject({ kind: 'maker' })
      expect(device.physical.verified).toMatchObject({ source: expect.stringContaining('176') })
    })

    it('is portrait, and this drawing’s own aspect is what says so', () => {
      // The published line is `240 x 176 x 16 mm` and its order does not say which is which. This
      // box's front view measures 289.00 x 394.00 — 0.73350 — and 176/240 is 0.73333, while
      // 240/176 would be out by 86%.
      expect(device.physical.panelSpanMm).toBe(176)
      expect(device.panel?.panelRiseMm).toBe(240)
      const aspect = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
      expect(aspect).toBeCloseTo(DRAWN_SPAN / DRAWN_RISE, 3)
    })
  })

  // -------------------------------------------------------------------------
  // No printed range means no numeric, and that has to stay true
  // -------------------------------------------------------------------------

  it('authors no numeric at all, because the guide bounds nothing (§3.1)', () => {
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        expect(p.kind, `${recipe.id}.${p.name}`).toBe('enum')
      }
    }
  })

  it('declines every mood axis by having no parameter that names one', () => {
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        expect('mood' in p ? p.mood : undefined, `${recipe.id}.${p.name}`).toBeUndefined()
      }
    }
  })

  it('cites every option set and no point (§3.2)', () => {
    const { counts } = auditDevice(device)
    expect(counts.numerics).toBe(0)
    expect(counts.manualPoints).toBe(0)
    expect(counts.observedPoints).toBe(0)
    expect(counts.uncheckedCapabilities).toBe(0)
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        if (p.kind !== 'enum') continue
        expect(p.options.verified, `${recipe.id}.${p.name}`).toMatchObject({ kind: 'manual' })
        expect(p.verified, `${recipe.id}.${p.name}`).toBe(false)
      }
    }
  })

  // -------------------------------------------------------------------------
  // Four play modes, and the fourth changes what the sequencer can hold
  // -------------------------------------------------------------------------

  describe('PLAY MODE, the parameter every recipe carries', () => {
    it('is on every recipe, from the page that enumerates the four modes', () => {
      for (const recipe of device.recipes) {
        const mode = named(recipe, 'PLAY MODE')
        expect(mode, recipe.id).toBeDefined()
        expect(mode?.kind === 'enum' ? mode.options.values : [], recipe.id).toEqual([
          'oneshot',
          'key',
          'legato',
          'loop',
        ])
      }
    })

    it('never plays a chord from a monophonic mode', () => {
      // Guide 8.2.1 is explicit in both directions: oneshot and legato are monophonic, key is
      // "polyphonic, and allows you to play multiples of the same sample at once".
      for (const recipe of device.recipes) {
        const value = enumValue(recipe, 'PLAY MODE')
        if (realisationOf(recipe) !== 'polyphonic-voice') continue
        if (value === 'key') continue
        expect(recipe.patchPolyphony ?? 1, `${recipe.id} is ${value}`).toBe(1)
      }
    })

    it('uses loop only where the role is handed no step pattern', () => {
      // Guide 9.3: a loop pad "cannot be recorded to the sequencer" and reaches a pattern only
      // through the loop startup sequence. `bearsPattern()` says which roles get steps, and a
      // loop-mode recipe on one of those would be a guide printing steps for a pad that refuses
      // them. Today that means `pad` and nothing else.
      const loops = device.recipes.filter((r) => enumValue(r, 'PLAY MODE') === 'loop')
      expect(loops.length).toBeGreaterThan(0)
      for (const recipe of loops) {
        expect(bearsPattern(recipe.role), recipe.id).toBe(false)
        // The reader has to be told how the loop reaches the pattern, or the part never sounds.
        expect(recipe.routing ?? '', recipe.id).toContain('LSS')
      }
    })

    it('reaches a chord on a mono mode only as a sampled chord', () => {
      const stab = device.recipes.find((r) => r.id === 'ep40-stab-hard')
      expect(realisationOf(stab as Recipe)).toBe('sampled-chord')
      // Guide 12.12 is the procedure that puts the chord inside the sample.
      expect(stab?.sourceAudio?.prep?.verified).toMatchObject({
        source: expect.stringContaining('12.12'),
      })
    })
  })

  // -------------------------------------------------------------------------
  // Thirteen parts are the sibling's, and the derivation is the thing to hold
  // -------------------------------------------------------------------------

  describe('the borrowed recipes are derived from the sibling and retargeted onto this guide', () => {
    /** The thirteen the manifest takes from `te-ep-133`, by the suffix both ids share. */
    const BORROWED = [
      'kick-hard', 'snare-hard', 'clap-bright', 'ghost-perc-soft', 'closed-hat-bright',
      'open-hat-dark', 'noise-dirty', 'sub-dark', 'bass-mid-dirty', 'pad-soft', 'texture-soft',
      'stab-hard', 'riser-bright',
      // #345. Five roles the pool declared and no recipe served, four of them already written on
      // the sibling and the fifth authored there first so this one could borrow it too.
      'rim-clean', 'tom-dark', 'metallic-bright', 'arp-clean', 'ride-bright',
    ]

    it('serves every role the pool declares, and takes eighteen of them from the sibling', () => {
      // **This asserted nineteen parts and five deliberate gaps until #345.** The manifest's own
      // note argued that filling them would be padding, and that objection was about *authoring*
      // — four of the five were already written next door, so each is one line through
      // `borrowed()` and none of them is new prose. The fifth, `ride`, was authored on the
      // sibling first for the same reason: so this box borrows it rather than diverging.
      //
      // The count is not asserted any more. It has moved twice and would move again; what it
      // stood in for is that this file derives rather than rewrites, and that is the ratio below.
      expect(
        device.recipes.filter((r) => BORROWED.includes(r.id.slice('ep40-'.length))),
      ).toHaveLength(18)
      const authored = new Set(device.recipes.map((r) => r.role))
      const pool = device.voices[0]!
      if (pool.kind !== 'pool') throw new Error('the first voice should be the pad pool')
      expect(pool.roles.filter((r) => !authored.has(r)).sort()).toEqual([])
      // Most of this sheet is the sibling's, which is what makes the import worth its guards.
      expect(BORROWED.length).toBeGreaterThan(device.recipes.length / 2)
    })

    it('keeps the sibling’s prose, which is what makes it a derivation rather than a rewrite', () => {
      // If these drift apart, the import has stopped buying anything and the file should say so
      // by inlining them. `routing` is the longest prose a recipe carries, so it is the tell.
      for (const suffix of BORROWED) {
        const here = device.recipes.find((r) => r.id === `ep40-${suffix}`)
        const there = ko2.recipes.find((r) => r.id === `ep133-${suffix}`)
        expect(there, suffix).toBeDefined()
        expect(here?.routing, suffix).toBe(there?.routing)
        expect(here?.sourceAudio?.need, suffix).toBe(there?.sourceAudio?.need)
        expect(here?.role, suffix).toBe(there?.role)
        expect(here?.character, suffix).toBe(there?.character)
      }
    })

    it('rebuilds every claim, because the two boxes have two guides', () => {
      // The citation sweep above already refuses a source that is not an `/ep-40/` path, on every
      // recipe. What this adds is that the borrowed ones genuinely *moved*: two of the six
      // sections do not line up, so a prefix swap would have left them naming the wrong page.
      const stab = device.recipes.find((r) => r.id === 'ep40-stab-hard')
      const stabThere = ko2.recipes.find((r) => r.id === 'ep133-stab-hard')
      expect(stabThere?.sourceAudio?.prep?.verified).toMatchObject({
        source: expect.stringContaining('12.10'),
      })
      expect(stab?.sourceAudio?.prep?.verified).toMatchObject({
        source: expect.stringContaining('12.12'),
      })
      // And the legality claim is this box's, not the sibling's: four play modes against three.
      for (const suffix of BORROWED) {
        const here = device.recipes.find((r) => r.id === `ep40-${suffix}`)
        const mode = here?.params.find((p) => p.name === 'PLAY MODE')
        expect(mode?.kind === 'enum' ? mode.options.values : [], suffix).toHaveLength(4)
      }
      const modeThere = ko2.recipes[0]?.params.find((p) => p.name === 'PLAY MODE')
      expect(modeThere?.kind === 'enum' ? modeThere.options.values : []).toHaveLength(3)
    })

    it('names the sibling’s box nowhere a reader can see it', () => {
      // Borrowed prose carries no citation to check, so a sentence saying K.O. II would survive
      // every other assertion in this file. The manifest throws on one at import; this is the
      // same claim from the outside, over every rendered string rather than the borrowed ones.
      const rendered = device.recipes.flatMap((r) => [
        r.title,
        r.routing ?? '',
        r.sourceAudio?.need ?? '',
        r.sourceAudio?.prep?.text ?? '',
        ...r.params.map((p) => `${p.name} ${p.note ?? ''}`),
      ])
      for (const text of rendered) expect(text).not.toMatch(/ep-133|K\.\s?O\.\s?II/i)
    })
  })

  // -------------------------------------------------------------------------
  // The supertone: a synth engine with no printed value anywhere in it
  // -------------------------------------------------------------------------

  describe('the supertone recipes set navigation and no value', () => {
    const supertones = () => device.recipes.filter((r) => r.sourceAudio?.hint === 'supertone')

    it('exist, and reach the engine through the page that names the gesture', () => {
      expect(supertones().length).toBeGreaterThanOrEqual(2)
      for (const recipe of supertones()) {
        expect(recipe.sourceAudio?.prep?.verified, recipe.id).toMatchObject({
          source: expect.stringContaining('8.1.1'),
        })
      }
    })

    it('carry no parameter but the play mode, because no supertone value is printed', () => {
      // Guide 8.2.3 lists nine parameters the two preset knobs *can* be and never says which two
      // a given supertone carries, nor what any of them reads. A `FILTER CUTOFF 64` here would
      // invent the number and the parameter it belongs to in one stroke.
      for (const recipe of supertones()) {
        expect(params(recipe).map((p) => p.name), recipe.id).toEqual(['PLAY MODE'])
        // The knobs still reach the reader, as advice rather than as a setting with provenance.
        expect(recipe.routing ?? '', recipe.id).toMatch(/\[X\] and \[Y\]/)
      }
    })
  })

  // -------------------------------------------------------------------------
  // Clock: one setting, two directions, and it ships off
  // -------------------------------------------------------------------------

  describe('MIDI clock is exclusive, and the manifest cannot say so in a field', () => {
    it('declares both directions over all three transports', () => {
      expect([...device.clock.transport].sort()).toEqual(['midi-din', 'sync', 'usb'])
      expect(device.clock.sendTransport).toBeUndefined()
      expect(device.clock.receiveTransport).toBeUndefined()
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
    })

    it('carries the exclusivity and the off-by-default on the notes a reader reaches', () => {
      const midi = (device.clock.sourceSetup ?? []).filter((s) => s.transport !== 'sync')
      expect(midi).toHaveLength(2)
      for (const setup of midi) {
        expect(setup.path, setup.transport).toContain('mid > clk')
        expect(setup.value, setup.transport).toBe('out')
      }
      const prose = [
        ...midi.map((s) => s.note ?? ''),
        ...(device.jacks ?? []).filter((j) => j.id.startsWith('midi')).map((j) => j.note ?? ''),
      ].join(' ')
      expect(prose).toMatch(/send-only|gives up following/)
      expect(prose).toMatch(/ships off|it ships off/)
    })

    it('gives the analog sync jacks their own setup, because they are the symmetric wire', () => {
      const sync = (device.clock.sourceSetup ?? []).find((s) => s.transport === 'sync')
      expect(sync?.path).toContain('syn > out')
      expect(sync?.note).toContain('DIN')
    })

    it('makes no claim about leading a rig', () => {
      expect(device.clock.preferredSource).toBeUndefined()
      expect(device.capabilityEvidence?.['clock.preferredSource']).toMatchObject({
        kind: 'unknown',
      })
    })
  })

  // -------------------------------------------------------------------------
  // The pool
  // -------------------------------------------------------------------------

  it('is one pool of forty-eight pads carrying every role', () => {
    // Guide 6: four groups, twelve samples each. One pool because guide 7.1's layout advice is
    // explicitly optional, pictograms on the group pads notwithstanding.
    expect(device.voices).toHaveLength(1)
    const pool = device.voices[0]
    expect(pool).toMatchObject({ kind: 'pool', id: 'pad', count: 48, polyphony: 12 })
    expect(pool?.kind === 'pool' ? [...pool.roles].sort() : []).toEqual([...ROLES].sort())
    expect(expand(device)).toHaveLength(48)
    expect(device.comfortableVoices).toBe(16)
  })

  it('resolves every authored recipe exactly, from every ordinal in the pool', () => {
    for (const assignable of expand(device)) {
      for (const recipe of device.recipes) {
        const notes = realisationOf(recipe) === 'sampled-chord' ? 3 : 1
        const where = `${recipe.id} on ${assignable.voiceId}`
        const resolution = resolveRecipe(device, assignable, recipe.role, recipe.character, notes)
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(where)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  // -------------------------------------------------------------------------
  // What the guide will not supply, said out loud
  // -------------------------------------------------------------------------

  it('declares no per-step lane, and records the reading that stopped short of one', () => {
    expect(device.features?.perStep).toBeUndefined()
    expect(device.capabilityEvidence?.['features.perStep']).toMatchObject({ kind: 'unknown' })
    expect(device.noteDuration).toEqual({ kind: 'per-note-value', control: 'note duration' })
    for (const recipe of device.recipes) {
      expect(recipe.articulation, recipe.id).toBeUndefined()
    }
  })

  it('leaves the LFO unknown rather than declared or ruled out', () => {
    // The sibling's guide never uses the word, so its `features.lfo` is `cited-against`. This one
    // lists "lfo speed" among the supertone preset parameters, so an LFO exists — and then gives
    // none of `count`, `syncable` or `destinations`, which is every field the type wants. Read,
    // and the document answers half: that is `unknown` with the reason saying which half.
    expect(device.features?.lfo).toBeUndefined()
    const ev = device.capabilityEvidence?.['features.lfo']
    expect(ev).toMatchObject({ kind: 'unknown' })
    if (!ev || !('reason' in ev)) throw new Error('features.lfo')
    expect(ev.reason).toContain('lfo speed')
    expect(ev.reason.length).toBeGreaterThan(40)
  })

  it('names no effect in any parameter, because the FX selector is one slot for the box', () => {
    // Guide 11: one selector, seven choices, a per-group send level. The store page settles the
    // count against the page's own opening sentence, which names six and omits the phaser.
    const effects = ['delay', 'reverb', 'distortion', 'chorus', 'compressor', 'phaser']
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        const text = `${p.name} ${p.kind === 'enum' ? p.options.values.join(' ') : ''}`.toLowerCase()
        for (const fx of effects) expect(text, `${recipe.id}.${p.name}`).not.toContain(fx)
      }
    }
  })

  it('ships a library it cannot enumerate, and says which hundred to scroll into', () => {
    expect(device.content).toMatchObject({ kind: 'shipped-library' })
    const content = device.content
    if (content?.kind !== 'shipped-library') throw new Error('expected a shipped library')
    expect(content.location).toContain('1-99')
    expect(content.reason).toContain('EP Sample Tool')

    // **And it claims only what its one citation covers.** `capabilityEvidence.content` is a
    // single `Cite` naming guide 8.1, so the field may not carry the product page's sixth band
    // (`600-699 FX`) nor guide 7.1's nine populated projects, however true either is. Both were
    // in this field once and both were wrong there: a claim under a citation that does not
    // support it is the defect the whole `verified` discipline exists to catch, and it is
    // invisible unless something looks.
    expect(device.capabilityEvidence?.['content']).toMatchObject({
      kind: 'manual',
      source: expect.stringContaining('/ep-40/modes 8.1'),
    })
    for (const text of [content.library, content.location, content.reason]) {
      expect(text).not.toContain('600-699')
      expect(text).not.toMatch(/nine projects|9 projects/)
    }
    // It reaches a reader where its source travels with it instead.
    const impact = device.recipes.find((r) => r.id === 'ep40-impact-hard')
    expect(impact?.sourceAudio?.prep?.text).toContain('600-699')
    expect(impact?.sourceAudio?.prep?.verified).toMatchObject({
      kind: 'maker',
      source: expect.stringContaining('600-699 FX'),
    })
    for (const recipe of device.recipes) {
      expect(recipe.sourceAudio?.need, recipe.id).toBeTruthy()
    }
  })

  it('answers the two questions the guide closes rather than leaving them open', () => {
    // #120's `cited-against`: read it, and it answers no. Each carries the page that says so.
    // There are two here where the sibling has three — `features.lfo` moved to `unknown`, which
    // the test above holds in place.
    for (const path of ['io.individualOuts', 'features.sidechain.fromExternalAudio']) {
      const ev = device.capabilityEvidence?.[path]
      expect(ev, path).toMatchObject({ kind: 'cited-against' })
      // Narrowed on the kind rather than on `'cite' in ev`, which stopped separating the states
      // when §2.6/#236 added `partly` — it carries a cite too.
      if (!ev || ev.kind !== 'cited-against') throw new Error(path)
      expect(ev.reason.length, path).toBeGreaterThan(40)
    }
  })

  describe('the panel, measured off a figure the text mirror does not contain', () => {
    it('cites the maker figure it was measured from, not a manual page', () => {
      expect(device.panel?.verified).toMatchObject({ kind: 'maker' })
      const source = device.panel?.verified === false ? '' : (device.panel?.verified.source ?? '')
      expect(source).toContain('assets.teenage.engineering')
      expect(source).toContain('fetched 2026-08-28')
      // This box's own asset, not the sibling's. The two chassis are the same and the drawings
      // are not, so naming the wrong file would otherwise pass every geometric check below.
      expect(source).toContain('69033ff84b343523886b5edb')
    })

    it('recovers the designer’s 8 mm module, which is what says the scaling worked', () => {
      // A measurement that lands a designer's round numbers within half a millimetre is a
      // measurement that worked; an estimate does not do that.
      const buttons = (device.panel?.features ?? []).filter((f) => f.kind === 'button')
      expect(buttons.length).toBeGreaterThan(12)
      for (const b of buttons) {
        for (const v of [b.x, b.y]) {
          const off = Math.abs(v - 8 * Math.round(v / 8))
          expect(off, `${b.label ?? ''} ${v}`).toBeLessThanOrEqual(0.5)
        }
      }
    })

    it('puts every feature inside the measured box', () => {
      const span = device.physical.panelSpanMm
      const rise = device.panel?.panelRiseMm ?? 0
      for (const f of device.panel?.features ?? []) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, `${f.kind} x`).toBeGreaterThanOrEqual(0)
        expect(f.y, `${f.kind} y`).toBeGreaterThanOrEqual(0)
        expect(f.x + w, `${f.kind} right`).toBeLessThanOrEqual(span)
        expect(f.y + h, `${f.kind} bottom`).toBeLessThanOrEqual(rise)
      }
    })

    it('gives the voice field both columns, because both are the voice selection', () => {
      const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
      expect(fields).toHaveLength(1)
      const field = fields[0]
      if (field?.kind !== 'voices') throw new Error('no voice field')
      expect(field.w).toBeCloseTo(field.h, 5)
      expect(expand(device)).toHaveLength(48)
    })

    it('counts the slots in the grille rather than estimating them', () => {
      // Eleven horizontal bars on a 3.99 mm pitch, counted off the drawing — where the sibling's
      // block is a 14 x 12 field of holes. The guide never mentions this block in nineteen pages,
      // so the label describes what is drawn and not what is behind it.
      const grille = (device.panel?.features ?? []).find(
        (f) => f.kind === 'grid' && f.label === 'grille',
      )
      expect(grille).toMatchObject({ cols: 1, rows: 11 })
    })

    it('labels the group pads with what is drawn on them, not with letters', () => {
      // This panel prints pictograms where the K.O. II prints `A`-`D`, in the same order as the
      // guide's own recommended layout. The labels say what is drawn; the guide's letters reach
      // the reader through `routing` and the voice field.
      const labels = (device.panel?.features ?? [])
        .filter((f) => f.kind === 'button' && f.x > 31 && f.x < 32.5 && f.y > 130)
        .map((f) => (f.kind === 'button' ? f.label : ''))
      expect(labels).toEqual(['drum', 'bass', 'keys', 'disc'])
    })
  })

  it('is in the registry exactly once', () => {
    expect(DEVICES.filter((d) => d.id === 'te-ep-40')).toHaveLength(1)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThanOrEqual(8)
    }
  })
})

/**
 * §2.1/#334. **This box authors no trigger note, and `memberLabels` is why.**
 *
 * Guide §14.2's MIDI note map is forty-eight rows, one per pad — `36 c2` through `83 b5`, four
 * groups of twelve in pad order `.`, `0`, `enter`, `1`-`9` — so ordinal *n* is note *35 + n*.
 * This field reaches every member of a pool alike, so one value would be true of one pad in
 * forty-eight, and would claim the members are interchangeable when the whole point of this
 * pool's labels is that they are not.
 *
 * §9.2 programs a step by pressing the pad it is for: *"hold (RECORD) and press a pad to record
 * the chosen pad to that step."* §9.4's KEYS mode transposes **one selected sample** across twelve
 * pads and is off unless the reader turns it on. §12.11 step 6 is the only working description of
 * a root note — adjusted *"to the root note of your sample"*, with no default printed — and
 * §8.2.6, which should define the control, is the copy-paste defect this file already records.
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
    expect(authoring.map((d) => d.id)).not.toContain('te-ep-40')
  })

  it('expands to forty-eight members on one pool, none of which carries a note', () => {
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(48)
    expect(members.every((m) => m.poolId === 'pad')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **The note map, asserted as arithmetic against the labels the manifest already carries.**
   * Guide §14.2 opens at `36 c2` and closes at `83 b5`: forty-eight consecutive semitones for
   * forty-eight pads, ordinal *n* at note *35 + n*. One pool-wide value cannot be forty-eight
   * different notes, and this is the assertion that says so in numbers rather than in prose.
   */
  it('gives every pad its own note, which one pool-wide field cannot be', () => {
    const pool = device.voices[0]
    if (pool?.kind !== 'pool') throw new Error('expected a pool')

    const FIRST = 36 // guide 14.2, `36 c2`, group `a`'s `.` pad
    const LAST = 83 //  and `83 b5`, group `d`'s `9`
    expect(LAST - FIRST + 1).toBe(pool.count)
    expect(pool.memberLabels?.length).toBe(pool.count)

    // Ordinal n is note 35 + n, which is the arithmetic `memberLabels` is built on: the first
    // label is group A's `.` and the last is group D's `9`.
    expect(pool.memberLabels?.[0]).toBe('A · .')
    expect(pool.memberLabels?.[pool.count - 1]).toBe('D · 9')
    expect(FIRST - 1).toBe(35)
  })

  /**
   * The near miss, pinned so it is not mistaken for a citation. §9.4's KEYS mode plays *"a
   * selected sample across a 12 note keyboard"* — one pad transposed, a mode the reader turns on,
   * not a common note that plays forty-eight samples as recorded. Nothing in the manifest authors
   * it, and this asserts that no recipe reaches for a note-shaped parameter instead.
   */
  it('authors no note-shaped parameter on any recipe, KEYS mode included', () => {
    for (const recipe of device.recipes) {
      expect(named(recipe, 'ROOT'), recipe.id).toBeUndefined()
      expect(named(recipe, 'ROOT NOTE'), recipe.id).toBeUndefined()
      expect(named(recipe, 'NOTE'), recipe.id).toBeUndefined()
      expect(named(recipe, 'KEYS'), recipe.id).toBeUndefined()
    }
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
   * **The measurement, taken rather than remembered.** Every direction against this box alone,
   * seeds 1-6. The number moves when a direction gains or loses a part, and a diff is a prompt to
   * re-read the head note rather than a failure. What must not move is the relationship — no part
   * ever gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 204 grid parts blank, and pins how many there are', () => {
    const { grid } = sweep()

    // 228 until #345 borrowed the pool's last five unserved roles.
    expect(grid.length).toBe(276)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(252)

    // Named rather than left to the count: the `trigger` arm is empty and the only notes this box
    // prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 are `sub` parts.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
  })

  it('leaves the blanks on the roles a loaded sample answers', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 48],
      ['ghost-perc', 42],
      ['kick', 42],
      ['clap', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['metallic', 12],
      ['arp', 6],
      ['impact', 6],
      ['noise', 6],
      ['ride', 6],
      ['tom', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program.
    const { grid, hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(132)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(30)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/sweep',
      'ambient-dub/texture',
      'generative-drift/sweep',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])

    // The four arms are exhaustive, so the sweep cannot silently drop a part it could not
    // classify — which is what would make the 204 above an undercount rather than a measurement.
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

  /**
   * §2.1/#352. **The octave convention, recorded and deliberately not used.**
   *
   * Guide §14.2 opens at `36 c2`, so this guide prints `c4` for MIDI 60 — the SP-404MK2's
   * convention and the Octatrack's, an octave below the Digitakt and Digitone manuals' `C5`.
   * Asserted as arithmetic, not as a value in the manifest, which is the point.
   */
  it('records the octave convention without authoring a note from it', () => {
    const NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
    // `36 c2` means MIDI 0 is c-1, so MIDI n is octave floor(n / 12) - 1.
    const midiOf = (name: string, octave: number) => (octave + 1) * 12 + NAMES.indexOf(name)

    expect(midiOf('c', 2)).toBe(36) //  guide 14.2, the first row
    expect(midiOf('b', 5)).toBe(83) //  and the last
    expect(midiOf('c', 4)).toBe(60) //  so this guide's name for 60 is `c4`
    // The Elektron samplers put 60 an octave up, at C5, which is the whole reason to record it.
    expect(midiOf('c', 5)).toBe(72)

    expect(device.voices.some((v) => v.triggerNote !== undefined)).toBe(false)
  })
})
