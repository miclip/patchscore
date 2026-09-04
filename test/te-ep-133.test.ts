import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
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
import { device } from '../lib/devices/te-ep-133/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
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

/**
 * §2.2/#86. **The pool prints the panel's names, not a count.**
 *
 * Forty-eight pads in four groups of twelve, each a numpad labelled `.`, `0`, `enter`, `1`-`9`.
 * The counted form a pool prints by default — `Pad 37` — names a control this box does not have,
 * and a reader looking for it finds four pads marked `1` and none marked `37`.
 */
describe('pool members carry the panel’s own labels (§2.2/#86)', () => {
  const assignables = expand(device)

  it('names the first and last pads the way the box does', () => {
    expect(assignables[0]?.label).toBe('A · .')
    expect(assignables[47]?.label).toBe('D · 9')
  })

  it('agrees with the note map this file worked out independently', () => {
    // The header derives ordinal *n* = note *35 + n* from guide 14.2, and concludes "`Pad 37` is
    // group `d`'s `.` pad". The labels are generated from the group and pad order rather than
    // from that sentence, so the two agreeing is a check rather than a restatement.
    expect(assignables[36]?.label).toBe('D · .')
  })

  it('changes the word and not the identity', () => {
    // Display only. `voiceId` and `ordinal` are what occupancy, recipe lookup and §7.1's symmetry
    // breaking key on, and a label that moved them would be a resolver change wearing a name.
    expect(assignables[36]?.voiceId).toBe('pad-37')
    expect(assignables[36]?.ordinal).toBe(37)
    expect(assignables[36]?.poolId).toBe('pad')
  })

  it('covers every member, because a partial list would name some and count others', () => {
    const pool = device.voices.find((v) => v.kind === 'pool' && v.id === 'pad')
    expect(pool?.kind).toBe('pool')
    if (pool?.kind !== 'pool') throw new Error('expected the pad pool')
    expect(pool.memberLabels).toHaveLength(pool.count)
    expect(new Set(pool.memberLabels).size, 'two pads sharing a name').toBe(pool.count)
  })

  it('never prints the counted form anywhere in a guide', () => {
    const result = resolve({
      devices: [device],
      template: TEMPLATES.find((t) => t.id === 'industrial-techno')!,
      mood: moodState({}),
      seed: 3,
    })
    expect(renderGuide(result)).not.toMatch(/Pad \d+/)
  })
})

/**
 * §2.1/#334. **This box authors no trigger note, and the absence is the claim rather than an
 * unfinished job.**
 *
 * #334 counts the parts whose grid says which steps to hit and never what to write on them. Two
 * Polyend boxes answered it with a note their manuals print; this one answers it the other way,
 * and the reading is in the manifest header. Two pages carry it:
 *
 *  - **Guide 9.2** records a step by *"hold (RECORD) and press a pad"*. Nothing is written on a
 *    step, so the grid is already complete.
 *  - **Guide 14.2** gives each of the forty-eight pads its own MIDI note, `36`/`c2` through
 *    `83`/`b5`. There is no note the pool shares, and a pool's `triggerNote` reaches every member
 *    alike.
 *
 * So what these tests hold in place is a **negative**, which is the fragile kind: nothing fails
 * when somebody adds a plausible note, and a `C3` here would read as correct on the page and
 * address one pad in forty-eight at the machine. The count below is what makes the change
 * visible.
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
    expect(authoring.map((d) => d.id)).not.toContain('te-ep-133')
  })

  it('has one note per pad rather than one note for the pool', () => {
    // Guide 14.2, the reason there is nothing to author: group `a` at 36-47, `b` at 48-59, `c` at
    // 60-71, `d` at 72-83, in pad order — so ordinal *n* is note *35 + n*, forty-eight distinct
    // notes over forty-eight pads. A single `triggerNote` would claim one of them for all of them.
    // `flatMap` rather than `map`: `ordinal` is optional on an `Assignable` because a fixed
    // voice has none, so the length assertion below is also the check that every pad has one.
    const notes = expand(device).flatMap((a) => (a.ordinal === undefined ? [] : [35 + a.ordinal]))
    expect(notes.length).toBe(48)
    expect(new Set(notes).size).toBe(48)
    expect(notes[0]).toBe(36)
    expect(notes[47]).toBe(83)
  })

  /**
   * A part phase 5 draws a grid for: not owned by a hook (#100), not sustained (§4.2), and with
   * at least one section whose variant resolved (§6.3).
   *
   * **One definition, used by the sweep and by the page test below.** `noteInstruction` returns
   * `none` for a hooked or sustained part as well as for a blank grid part, so a page test asking
   * it whether a grid exists would have counted parts that draw none — and would then have gone
   * on passing against a guide with nothing in it.
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
   * seeds 1-6.
   *
   * The number is #334's own for this device and it is expected to stay put: 252 grid parts print
   * no note, and that is the box being reported accurately rather than a gap. It moves when a
   * direction gains or loses a part, and a diff here is a prompt to re-read this file's header
   * rather than a failure. What must not move is the *relationship* — no part ever gets a
   * `trigger`, because the pool has no note to give one.
   */
  it('leaves every pad part blank, and pins how many there are', () => {
    const { grid } = sweep()

    expect(grid.length).toBe(276)
    expect(grid.filter((g) => g.kind === 'none').length).toBe(252)

    // The claim, named rather than left to the count: the `trigger` arm is empty and the only
    // notes this box ever prints are the direction's own.
    expect([...new Set(grid.map((g) => g.kind))].sort()).toEqual(['none', 'pitch'])
  })

  it('prints a note only where the direction asked for a pitch of its own', () => {
    // §4.1's precedence with one arm missing. The 24 that do carry a note are `sub` parts, where
    // the pitch is the direction's musical decision (#340) and owes this box nothing.
    const pitched = sweep().grid.filter((g) => g.kind === 'pitch')
    expect(pitched.length).toBe(24)
    expect([...new Set(pitched.map((g) => g.role))]).toEqual(['sub'])
  })

  it('leaves the blanks where a pad press is the whole instruction', () => {
    // Pinned by role rather than by total alone, which would survive one role's parts being
    // swapped for another's. Percussion dominates, and guide 9.2 is the answer for all of it:
    // the reader holds RECORD and presses the pad holding the sound.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['closed-hat', 48],
      ['kick', 48],
      ['ghost-perc', 42],
      ['clap', 18],
      ['open-hat', 18],
      ['rim', 18],
      ['snare', 18],
      ['metallic', 12],
      ['arp', 6],
      ['impact', 6],
      ['noise', 6],
      ['tom', 6],
      ['vox-chop', 6],
    ])
  })

  it('accounts for every part that draws no grid, by which reason', () => {
    // None of these is a hole: #100 gives a hooked part's notes to its hook, and §6.3 leaves a
    // part with no variant anywhere nothing to program. Asserted rather than assumed — this box
    // produces no sustained part at all across the sweep.
    const { hooked, sustained, noPattern } = sweep()
    expect(hooked.length).toBe(132)
    expect(sustained).toEqual([])
    expect(noPattern.length).toBe(18)
    expect([...new Set(noPattern)].sort()).toEqual([
      'ambient-dub/texture',
      'hip-hop/texture',
      'industrial-techno/riser',
    ])
  })

  /**
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver.
   *
   * A guide that never says `Trigger note` for this box is the whole acceptance criterion, and it
   * is worth nothing unless the guides being searched actually draw grids — so that is asserted
   * first, or an empty render would pass this test forever.
   */
  it('never prints a trigger note on a rendered page, across every direction and seed', () => {
    let drawn = 0
    for (const template of TEMPLATES) {
      for (const seed of [1, 7]) {
        const result = resolve({ devices: [device], template, mood: moodState(), seed })
        // `drawsGrid`, not `noteInstruction(a).kind === 'none'`: that answer is also what a hooked
        // or sustained part gives, so counting it would have called a guide with no grid in it a
        // guide with grids and left this test unable to fail.
        drawn += result.assignments.filter(drawsGrid).length
        expect(renderGuide(result), `${template.id} seed ${String(seed)}`).not.toContain(
          'Trigger note',
        )
      }
    }
    expect(drawn).toBeGreaterThan(0)
  })
})
