import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  realisationOf,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device } from '../lib/devices/te-ep-133/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { auditDevice } from '../scripts/audit-verified'

/**
 * The EP–133 K.O. II is the library's **second box authored from a web-guide mirror** (after the
 * T-1) and its second teenage engineering box, and those two facts set what this file checks.
 *
 * From the mirror: every citation has to carry the date the pages were taken, because a live URL
 * cited without one means nothing — the page can change under the citation. That is
 * `manuals/README.md`'s rule and it is checkable, so it is checked here rather than trusted.
 *
 * From teenage engineering: this guide prints **no range for any sound parameter**, exactly as the
 * OP-XY's does not. So the regime is inverted from the Roland boxes — there are no numerics at
 * all, every claim is an enum's option set, and no point is cited anywhere. A numeric appearing in
 * this manifest later would mean somebody found a printed scale or invented one, and the test
 * below is what makes the difference visible.
 *
 * The third thing checked is the one this box is unusual for: **MIDI clock is a single three-way
 * setting**, so sending and receiving over MIDI are mutually exclusive and the box ships with both
 * off. `ClockSpec` cannot say that, so it rides on notes — and a note is only load-bearing if
 * something holds it in place.
 *
 * A fourth runs through several of these: **`§` means `DESIGN.md` here as everywhere, and this
 * box's own guide sections are written `guide 8.2.1`.** The two numbering schemes collide — guide
 * 6 is the project structure where §6 is mood — and the section sign is also barred from anything
 * rendered, which is what `test/guide-view.test.ts` checks.
 */

const GUIDE = 'EP–133 K.O. II guide'
const MIRRORED = 'mirrored 2026-08-28'
const FETCHED = 'fetched 2026-08-28'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

describe('EP–133 K.O. II manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('te-ep-133')
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
      // **The two that this sweep used to miss.** They are the only `maker` citations in the file
      // and they are the ones that most need the check: a page number cannot go stale, and a live
      // URL can. `physical.verified` shipped undated because nothing here looked at it.
      push('physical.verified', device.physical.verified)
      push('panel.verified', device.panel?.verified)
      return out
    }

    it('finds citations of both kinds to check', () => {
      const all = citations()
      expect(all.length).toBeGreaterThan(20)
      // Both halves have to be non-empty or the two assertions below pass vacuously.
      expect(all.filter((c) => c.kind === 'manual').length).toBeGreaterThan(20)
      expect(all.filter((c) => c.kind === 'maker').map((c) => c.where).sort()).toEqual([
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
        expect(c.source, c.where).toMatch(/\/ep-133\//)
      }
    })

    it('dates the maker citations too, because a live page can change under one', () => {
      // The rule `manuals/README.md` states for the mirror is a rule about *live sources*, not
      // about mirrors: a URL cited without a date means nothing, and teenage engineering's product
      // page and its front-view asset are both live. Nothing in this manifest cites a source that
      // cannot be dated, and this is the half of that claim the manual sweep above cannot make.
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

    it('is portrait, and the drawn aspect is what says so', () => {
      // The published line is `240 mm x 176 mm x 16 mm` and its order does not say which is
      // which. The front view's outline measures 288.545 x 393.520 — 0.73324 — and 176/240 is
      // 0.73333, while 240/176 would be out by 86%. An earlier draft read the first figure as the
      // width and had this box a third wider than it is.
      expect(device.physical.panelSpanMm).toBe(176)
      expect(device.panel?.panelRiseMm).toBe(240)
      const aspect = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
      expect(aspect).toBeCloseTo(288.545 / 393.52, 3)
    })
  })

  // -------------------------------------------------------------------------
  // No printed range means no numeric, and that has to stay true
  // -------------------------------------------------------------------------

  it('authors no numeric at all, because the guide bounds nothing (§3.1)', () => {
    // The OP-XY's rule on a guide thinner still: one printed range there, none here. An earlier
    // draft of that device gave every knob a `0-100` marked unverified and produced 160 mood-inert
    // parameters — the invented claim §3.1 exists to refuse, wearing an honesty badge.
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        expect(p.kind, `${recipe.id}.${p.name}`).toBe('enum')
      }
    }
  })

  it('declines every mood axis by having no parameter that names one', () => {
    // §6/invariant: a device declines an axis by carrying no param that declares it, and there is
    // no capability check for this. With no numerics there is nothing for an offset to move.
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
  // The one control that decides whether a part can hold a chord
  // -------------------------------------------------------------------------

  describe('PLAY MODE, the parameter every recipe carries', () => {
    it('is on every recipe, from the page that enumerates the three modes', () => {
      for (const recipe of device.recipes) {
        const mode = named(recipe, 'PLAY MODE')
        expect(mode, recipe.id).toBeDefined()
        expect(mode?.kind === 'enum' ? mode.options.values : [], recipe.id).toEqual([
          'oneshot',
          'key',
          'legato',
        ])
      }
    })

    it('never plays a chord from a monophonic mode', () => {
      // §8.2.1 is explicit in both directions: oneshot and legato are monophonic, key is "polyphonic,
      // and allows you to play multiples of the same sample at once". A polyphonic-voice recipe on
      // a monophonic mode would be the manifest contradicting the page it cites.
      for (const recipe of device.recipes) {
        const mode = named(recipe, 'PLAY MODE')
        const value = mode?.kind === 'enum' ? mode.value : ''
        if (realisationOf(recipe) !== 'polyphonic-voice') continue
        if (value === 'key') continue
        // A monophonic mode is fine for a part that only ever sounds one note; what it must not do
        // is be handed more, which `patchPolyphony` is how a recipe says.
        expect(recipe.patchPolyphony ?? 1, `${recipe.id} is ${value}`).toBe(1)
      }
    })

    it('reaches a chord on a mono mode only as a sampled chord', () => {
      const stab = device.recipes.find((r) => r.id === 'ep133-stab-hard')
      expect(realisationOf(stab as Recipe)).toBe('sampled-chord')
      // Guide 12.10 is the procedure that puts the chord inside the sample, so it is what the
      // prep cites.
      expect(stab?.sourceAudio?.prep?.verified).toMatchObject({
        source: expect.stringContaining('12.10'),
      })
    })
  })

  // -------------------------------------------------------------------------
  // Clock: one setting, two directions, and it ships off
  // -------------------------------------------------------------------------

  describe('MIDI clock is exclusive, and the manifest cannot say so in a field', () => {
    it('declares both directions over all three transports', () => {
      // Neither `sendTransport` nor `receiveTransport` is narrowed: each transport does carry clock
      // both ways. What it cannot do is both at once over MIDI, which is not a direction.
      expect([...device.clock.transport].sort()).toEqual(['midi-din', 'sync', 'usb'])
      expect(device.clock.sendTransport).toBeUndefined()
      expect(device.clock.receiveTransport).toBeUndefined()
      expect(device.clock.canSendClock).toBe(true)
      expect(device.clock.canReceiveClock).toBe(true)
    })

    it('carries the exclusivity and the off-by-default on the notes a reader reaches', () => {
      // The constraint has nowhere else to live, so the notes are load-bearing rather than
      // decorative — this is what holds them in place.
      const midi = (device.clock.sourceSetup ?? []).filter((s) => s.transport !== 'sync')
      expect(midi).toHaveLength(2)
      for (const setup of midi) {
        expect(setup.path, setup.transport).toContain('mid > clk')
        expect(setup.value, setup.transport).toBe('out')
      }
      // One of the two says it forecloses receiving; one says it ships off. Between the setups and
      // the two MIDI jacks, a reader meets both facts.
      const prose = [
        ...midi.map((s) => s.note ?? ''),
        ...(device.jacks ?? [])
          .filter((j) => j.id.startsWith('midi'))
          .map((j) => j.note ?? ''),
      ].join(' ')
      expect(prose).toMatch(/send-only|gives up following/)
      expect(prose).toMatch(/ships off|it ships off/)
    })

    it('gives the analog sync jacks their own setup, because they are the symmetric wire', () => {
      const sync = (device.clock.sourceSetup ?? []).find((s) => s.transport === 'sync')
      expect(sync?.path).toContain('syn > out')
      // §1.2's pro-tip, and the reason a MIDI cable in this hole does nothing.
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
    // §6: four groups, twelve samples each. One pool because §7.1's A-drums/B-bass/C-melodies
    // layout is advice the guide itself calls optional — binding it would invent an assignment.
    expect(device.voices).toHaveLength(1)
    const pool = device.voices[0]
    expect(pool).toMatchObject({ kind: 'pool', id: 'pad', count: 48, polyphony: 12 })
    expect(pool?.kind === 'pool' ? [...pool.roles].sort() : []).toEqual([...ROLES].sort())
    expect(expand(device)).toHaveLength(48)
    // Sixteen mono voices is the whole box, so a seventeenth occupied pad cannot be heard beside
    // the other sixteen.
    expect(device.comfortableVoices).toBe(16)
  })

  it('resolves every authored recipe exactly, from every ordinal in the pool', () => {
    // Recipe lookup keys on `poolId ?? voiceId` (§2.2), so one pool recipe has to serve all
    // forty-eight ordinals rather than the first.
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
    // Guide 9.2 and 9.4 are real: velocity, note duration, nudge and a latched fader position are
    // all per-step, and declaring them would be true about the hardware. None has a printed
    // scale, and an `articulation` sets a *value* — so every lane here would be one no recipe
    // could reach, which `test/intellijel-metropolix.test.ts` holds the library against.
    //
    // So the field is absent and the reading lives at its evidence path, where the audit can see
    // it. The duration half does reach a reader, through `noteDuration`.
    expect(device.features?.perStep).toBeUndefined()
    expect(device.capabilityEvidence?.['features.perStep']).toMatchObject({ kind: 'unknown' })
    expect(device.noteDuration).toEqual({ kind: 'per-note-value', control: 'note duration' })
    for (const recipe of device.recipes) {
      expect(recipe.articulation, recipe.id).toBeUndefined()
    }
  })

  it('names no effect in any parameter, because the FX selector is one slot for the box', () => {
    // §11: one selector, six choices, a per-group send level. A recipe carrying `FX reverb` would
    // set a box-wide control from inside one part, and two such recipes would contradict each
    // other. The effects reach the reader through `routing` prose instead.
    const effects = ['delay', 'reverb', 'distortion', 'chorus', 'compressor']
    for (const recipe of device.recipes) {
      for (const p of params(recipe)) {
        const text = `${p.name} ${p.kind === 'enum' ? p.options.values.join(' ') : ''}`.toLowerCase()
        for (const fx of effects) expect(text, `${recipe.id}.${p.name}`).not.toContain(fx)
      }
    }
  })

  it('ships a library it cannot enumerate, and says which hundred to scroll into', () => {
    // §8.1 gets close to a list and stops at navigation: a band of a hundred, and no name inside
    // it. That is `shipped-library`, and `reason` is that limit said to a reader.
    expect(device.content).toMatchObject({ kind: 'shipped-library' })
    const content = device.content
    if (content?.kind !== 'shipped-library') throw new Error('expected a shipped library')
    expect(content.location).toContain('1-99')
    expect(content.reason).toContain('EP Sample Tool')
    // Every recipe still describes its own audio, which is what `shipped-library` obliges.
    for (const recipe of device.recipes) {
      expect(recipe.sourceAudio?.need, recipe.id).toBeTruthy()
    }
  })

  it('answers the three questions the guide closes rather than leaving them open', () => {
    // #120's `cited-against`: read it, and it answers no. Each carries the page that says so.
    for (const path of [
      'io.individualOuts',
      'features.lfo',
      'features.sidechain.fromExternalAudio',
    ]) {
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
      // §10 and #191. This box has no manual, so the drawing cannot come from one; teenage
      // engineering publish a vector front view and that is what `panel.ts` measures. `maker` is
      // the kind for a maker figure published outside a manual, and `test/rack.test.ts` accepts
      // it alongside `manual` for exactly this.
      expect(device.panel?.verified).toMatchObject({ kind: 'maker' })
      const source = device.panel?.verified === false ? '' : (device.panel?.verified.source ?? '')
      expect(source).toContain('assets.teenage.engineering')
      expect(source).toContain('fetched 2026-08-28')
    })

    it('recovers the designer’s 8 mm module, which is what says the scaling worked', () => {
      // A measurement that lands a designer's round numbers on a tenth of a millimetre is a
      // measurement that worked; an estimate does not do that. Every button column and row here
      // sits on a multiple of 8 mm, within the 0.1 mm the coordinates are rounded to.
      const buttons = (device.panel?.features ?? []).filter((f) => f.kind === 'button')
      expect(buttons.length).toBeGreaterThan(12)
      for (const b of buttons) {
        for (const v of [b.x, b.y]) {
          const off = Math.abs(v - 8 * Math.round(v / 8))
          // The four group pads and the pads sit half a millimetre inside their 8 mm cell, which
          // is the drawing's own inset rather than a measurement error.
          expect(Math.min(off, Math.abs(off - 0.5), Math.abs(off - 0.6)), `${b.label ?? ''} ${v}`)
            .toBeLessThan(0.2)
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
      // Twelve pads sound the samples and A-D choose which twelve of the forty-eight, so the
      // selection is the pair — which is what `PanelFeature` asks the field to sit on. Drawn over
      // the pads alone it packs 48 cells at 54%, under the rack's own floor, because the region
      // is a third narrower than the thing it has to hold.
      const fields = (device.panel?.features ?? []).filter((f) => f.kind === 'voices')
      expect(fields).toHaveLength(1)
      const field = fields[0]
      if (field?.kind !== 'voices') throw new Error('no voice field')
      expect(field.w).toBeCloseTo(field.h, 5)
      expect(expand(device)).toHaveLength(48)
    })

    it('counts the grille holes rather than estimating them', () => {
      // 14 x 12, from the 168 subpaths that draw them. The guide never mentions this block in
      // nineteen pages, so the label describes what is drawn and not what is behind it.
      const grille = (device.panel?.features ?? []).find(
        (f) => f.kind === 'grid' && f.label === 'grille',
      )
      expect(grille).toMatchObject({ cols: 14, rows: 12 })
    })
  })

  it('is in the registry exactly once', () => {
    expect(DEVICES.filter((d) => d.id === 'te-ep-133')).toHaveLength(1)
  })

  it('keeps hints to jogs rather than documentation (invariant 7)', () => {
    for (const [key, text] of Object.entries(device.hints ?? {})) {
      expect(text.split(/\s+/).length, key).toBeLessThanOrEqual(8)
    }
  })
})
