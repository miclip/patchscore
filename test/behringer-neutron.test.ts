import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  DeviceSchema,
  evidenceFor,
  jackFact,
  renderGuide,
  resolve,
  moodState,
  type AuthoredParam,
  type Recipe,
} from '../lib/core/index'
import { device, type NeutronJack } from '../lib/devices/behringer-neutron/index'
import { device as crave } from '../lib/devices/behringer-crave/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The NEUTRON is the second Behringer semi-modular in the library and the first device here whose
 * manual carries **two controls with two printed scales each**. Those two facts set what this file
 * is for.
 *
 * CLAUDE.md's standing warning is that a cited range can still be the wrong range, and that the
 * fix is to make the recipe carry the switch so the pairing cannot come apart. The TR-8S and the
 * minilogue xd are the two devices that hit it before; this is the third, twice over — `TUNE`,
 * whose scale the `RANGE` button changes, and `LFO RATE`, which stops being a frequency at all
 * once MIDI clock sync is on. Most of this file is those two claims, because a helper that emits
 * the pair is only worth having if something checks that nothing routed around it.
 *
 * The rest is what a second box through the CRAVE's shapes can newly test: a `travel()` control
 * beside a cited one on the same panel, a patchbay whose manual actually instructs cables, and a
 * paraphonic voice whose polyphony is true in only one switch position.
 */

/**
 * Every citation in the manifest, plus the panel's, which carries a parenthetical naming the
 * figure the coordinates were read off — the CRAVE's does the same.
 */
const SOURCE = /^Neutron User Manual, p\.\d+( \(.+\))?$/

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function named(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function allParams(): { recipe: string; param: AuthoredParam }[] {
  return device.recipes.flatMap((r) => params(r).map((param) => ({ recipe: r.id, param })))
}

/** The Neutron alone, on whichever template gives it the most to do. */
function alone(templateId = 'industrial-techno', seed = 1) {
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (template === undefined) throw new Error(`no template ${templateId}`)
  return resolve({ devices: [device], template, mood: moodState({}), seed })
}

describe('NEUTRON manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
    expect(device.id).toBe('behringer-neutron')
    expect(device.kind).toBe('semi-modular')
    expect(device.maker).toBe('Behringer')
  })

  it('cites one document, by printed folio, on every claim it makes', () => {
    // The folio is printed in the *header* on this manual and equals the PDF page on all
    // thirty-two numbered pages, so there is no offset to get wrong — unusual enough to assert.
    const cites = [
      device.physical.verified,
      device.panel?.verified,
      ...Object.values(device.capabilityEvidence ?? {}),
      ...allParams().flatMap(({ param }) =>
        param.kind === 'numeric'
          ? [param.range.verified]
          : param.kind === 'enum'
            ? [param.options.verified]
            : [],
      ),
      ...device.recipes.flatMap((r) => (r.patch ?? []).map((e) => e.verified)),
    ]
    let checked = 0
    for (const c of cites) {
      if (c === undefined || c === false) continue
      if (typeof c === 'object' && 'kind' in c && c.kind === 'manual') {
        expect(c.source).toMatch(SOURCE)
        const page = Number(c.source.replace(/^.*p\./, '').replace(/\D.*$/, ''))
        // Every page cited is one somebody opened: controls (7-9), overview (10-14), patchbay
        // tips (21), preset patches (24), specifications (25-26).
        expect(page, c.source).toBeGreaterThanOrEqual(7)
        expect(page, c.source).toBeLessThanOrEqual(26)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(100)
  })

  // -------------------------------------------------------------------------
  // The two dual-scale controls — CLAUDE.md's cited-wrong-range rule
  // -------------------------------------------------------------------------

  describe('a cited range that is still the wrong range', () => {
    it('never states a TUNE without the RANGE its scale comes from', () => {
      // p.25: `Tune (OSC 1&2): +1/-1 octave (8', 16' or 32') or +10/-10 (full range)`. A semitone
      // figure means nothing until you know which. `tune()` emits the pair; this checks that no
      // recipe found another way in.
      let pairs = 0
      for (const recipe of device.recipes) {
        for (const osc of [1, 2] as const) {
          const t = named(recipe, `OSC ${osc} TUNE`)
          const r = named(recipe, `OSC ${osc} RANGE`)
          expect(t, `${recipe.id}: OSC ${osc} TUNE`).toBeDefined()
          expect(r, `${recipe.id}: OSC ${osc} RANGE`).toBeDefined()
          if (t?.kind !== 'numeric' || r?.kind !== 'enum') throw new Error('unreachable')

          // And the range declared is the one that switch selects, not the other one.
          const full = r.value === 'full range'
          expect(t.range.min, `${recipe.id}: OSC ${osc}`).toBe(full ? -120 : -12)
          expect(t.range.max, `${recipe.id}: OSC ${osc}`).toBe(full ? 120 : 12)
          pairs += 1
        }
      }
      expect(pairs).toBe(device.recipes.length * 2)
    })

    it('uses the full-range scale somewhere, or the pairing is untested', () => {
      // A rule that only ever fires one way is not a rule. One recipe reaches past ±12 semitones
      // and therefore has to be in the mode that allows it.
      const wide = device.recipes.filter((r) =>
        params(r).some((p) => p.kind === 'enum' && p.name.endsWith('RANGE') && p.value === 'full range'),
      )
      expect(wide.length).toBeGreaterThan(0)
      for (const recipe of wide) {
        const t = named(recipe, 'OSC 1 TUNE')
        if (t?.kind !== 'numeric') throw new Error('unreachable')
        expect(Math.abs(t.value), recipe.id).toBeGreaterThan(12)
      }
    })

    it('drops the LFO RATE number entirely once the clock owns the knob', () => {
      // p.13 §5.7: with MIDI clock sync on, "The LFO rate position determines the clock
      // multiplier-divider" — so the 0-10 scale p.25 prints is not in force, and a number quoted
      // against it would be quoted against the wrong scale. The synced recipes state a division
      // from p.13's list of twenty-one instead.
      let synced = 0
      let free = 0
      for (const recipe of device.recipes) {
        const sync = named(recipe, 'LFO MIDI CLOCK SYNC')
        if (sync === undefined) {
          // A recipe with no LFO at all must not state a rate or a division either.
          expect(named(recipe, 'LFO RATE'), recipe.id).toBeUndefined()
          expect(named(recipe, 'LFO DIVISION'), recipe.id).toBeUndefined()
          continue
        }
        if (sync.kind !== 'enum') throw new Error('unreachable')
        if (sync.value === 'on') {
          expect(named(recipe, 'LFO RATE'), `${recipe.id} is synced`).toBeUndefined()
          expect(named(recipe, 'LFO DIVISION'), `${recipe.id} is synced`).toBeDefined()
          synced += 1
        } else {
          expect(named(recipe, 'LFO RATE'), `${recipe.id} is free`).toBeDefined()
          expect(named(recipe, 'LFO DIVISION'), `${recipe.id} is free`).toBeUndefined()
          free += 1
        }
      }
      // Both branches exist, or one of them is untested.
      expect(synced).toBeGreaterThan(0)
      expect(free).toBeGreaterThan(0)
    })

    it('takes every LFO division from the twenty-one p.13 prints', () => {
      const divisions = allParams()
        .map(({ param }) => param)
        .filter((p) => p.kind === 'enum' && p.name === 'LFO DIVISION')
      expect(divisions.length).toBeGreaterThan(0)
      for (const d of divisions) {
        if (d.kind !== 'enum') throw new Error('unreachable')
        expect(d.options.values).toHaveLength(21)
        expect(d.options.values[0]).toBe('4/1')
        expect(d.options.values[20]).toBe('1/64')
        expect(d.options.verified).toEqual({ kind: 'manual', source: 'Neutron User Manual, p.13' })
      }
    })
  })

  // -------------------------------------------------------------------------
  // §3.2 — the two claims, on a panel that prints most of its ranges and not all
  // -------------------------------------------------------------------------

  it('marks every % travel range unverified, and never hangs mood on one', () => {
    // Four controls on this box have a word at one end of their printed range — the two
    // attenuators and the overdrive LEVEL are `to -∞`, and OSC MIX is given no figures at all.
    // `% travel` is our description of a knob, not a scale the box shows, so the range is uncited
    // and §3.1's legality gate then forbids mood from moving it.
    const travels = allParams().filter(
      ({ param }) => param.kind === 'numeric' && param.unit === '% travel',
    )
    expect(travels.length).toBeGreaterThan(0)
    for (const { recipe, param } of travels) {
      if (param.kind !== 'numeric') throw new Error('unreachable')
      expect(param.range.verified, `${recipe}: ${param.name}`).toBe(false)
      expect(param.verified, `${recipe}: ${param.name}`).toBe(false)
      expect(param.mood, `${recipe}: ${param.name}`).toBeUndefined()
      // And it says why on the value itself, so a reader is not left wondering.
      expect(param.note, `${recipe}: ${param.name}`).toBeDefined()
    }

    // The point of the split: cited ranges sit on the same recipes, so this is a per-control
    // reading rather than a manifest that gave up.
    const cited = allParams().filter(
      ({ param }) => param.kind === 'numeric' && param.range.verified !== false,
    )
    expect(cited.length).toBeGreaterThan(travels.length * 5)
  })

  it('leaves every point value uncited, and says so on the recipe too', () => {
    // The specifications state what each control accepts and nothing about where to set it, so
    // the authority claim is `false` everywhere and the chain terminates at the recipe rather
    // than quietly inheriting one day.
    for (const recipe of device.recipes) expect(recipe.verified, recipe.id).toBe(false)
    for (const { recipe, param } of allParams()) {
      expect(param.verified, `${recipe}: ${param.name}`).toBe(false)
    }
  })

  it('declares four of the five mood axes and declines swing', () => {
    // A device declines an axis by having no param that declares it (§6) — and this one has no
    // sequencer at all, so nothing on it decides where a note falls.
    const axes = new Set(
      allParams().flatMap(({ param }) =>
        param.kind === 'numeric' ? (param.mood ?? []).map((m) => m.axis) : [],
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space'])
    expect(device.features?.perStep).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // §3.3 — the patchbay
  // -------------------------------------------------------------------------

  describe('the patchbay (§3.3)', () => {
    it('declares all fifty-six patch points plus MIDI and the rear, cited once each', () => {
      const jacks = device.jacks ?? []
      const patchbay = jacks.filter((j) => j.id.startsWith('IN · ') || j.id.startsWith('OUT · '))
      // pp.8-9: items 45-76 are the input block, 77-100 the output block.
      expect(patchbay.filter((j) => j.direction === 'in')).toHaveLength(32)
      expect(patchbay.filter((j) => j.direction === 'out')).toHaveLength(24)
      expect(patchbay).toHaveLength(56)
      // Plus MIDI IN on the top panel and four rear connectors (p.9 §3.2.2).
      expect(jacks).toHaveLength(61)

      // §2.6/#22. The citation is not on the jack: it is at `jacks[<id>]` in the device's one
      // capability-evidence map, and `DeviceSchema` refuses a declared jack with no entry.
      for (const j of jacks) {
        expect(evidenceFor(device, jackFact(j.id)), j.id).toMatchObject({
          kind: 'manual',
          source: expect.stringMatching(SOURCE),
        })
      }
    })

    it('needs the IN / OUT prefix, because OSC 1 and OSC 2 are printed on both sides', () => {
      const ids = (device.jacks ?? []).map((j) => j.id)
      expect(new Set(ids).size).toBe(ids.length)

      const patchbay = ids.filter((id) => id.startsWith('IN · ') || id.startsWith('OUT · '))
      const bare = patchbay.map((id) => id.replace(/^(IN|OUT) · /, ''))
      // Without the prefix the ids collide, which is the whole reason the convention exists.
      expect(new Set(bare).size).toBeLessThan(bare.length)
      for (const both of ['OSC 1', 'OSC 2']) {
        expect(ids).toContain(`IN · ${both}`)
        expect(ids).toContain(`OUT · ${both}`)
      }
    })

    it('runs every cable OUT to IN, which the prefix makes legible rather than merely checked', () => {
      for (const recipe of device.recipes) {
        for (const entry of recipe.patch ?? []) {
          expect(entry.from.startsWith('OUT · '), `${recipe.id}: ${entry.from}`).toBe(true)
          expect(entry.to.startsWith('IN · '), `${recipe.id}: ${entry.to}`).toBe(true)
        }
      }
    })

    it('claims only the connection on a cable, and cites the pages that instruct one', () => {
      const entries = device.recipes.flatMap((r) => r.patch ?? [])
      const cited = entries.filter((e) => e.verified !== false && e.verified !== undefined)
      const taste = entries.filter((e) => e.verified === false)
      expect(cited.length + taste.length).toBe(entries.length)
      expect(taste.length).toBeGreaterThan(0)

      // Unusually for a Behringer document this manual does instruct specific connections: the
      // ten Tips and Tricks on p.21 and the patched Preset Patches on p.24. Those carry a page;
      // nothing else does.
      expect(cited.length).toBeGreaterThan(0)
      for (const entry of cited) {
        const where = entry.verified
        if (where === false || where === undefined) throw new Error('unreachable')
        expect(where.source).toMatch(/^Neutron User Manual, p\.(21|24)$/)
      }
    })

    it('says of every cable whether it replaces a normal or fills an empty input', () => {
      // p.21 prints the normalised routings as a table, and most inputs on this box are in it.
      // A note saying "replaces the LFO normalled to FREQ MOD" and one saying "ATT 1 IN has no
      // normal" are two different, both necessary, facts — a reader who cannot tell which cannot
      // predict what the cable will do.
      for (const recipe of device.recipes) {
        for (const entry of recipe.patch ?? []) {
          const note = entry.note
          expect(note, `${recipe.id}: ${entry.from} -> ${entry.to}`).toBeDefined()
          expect(note as string, `${recipe.id}: ${entry.to}`).toMatch(/normal|supplies|manual’s tip/)
        }
      }
    })

    it('keeps the declared jack ids as literals, so a mistyped endpoint cannot compile', () => {
      expectTypeOf<'OUT · ENV2'>().toExtend<NeutronJack>()
      expectTypeOf<'IN · OSC1+2'>().toExtend<NeutronJack>()
      expectTypeOf<'REAR · PHONES'>().toExtend<NeutronJack>()
      // The half that catches the widening: if `NeutronJack` ever becomes `string`, this fails.
      expectTypeOf<string>().not.toExtend<NeutronJack>()
    })
  })

  // -------------------------------------------------------------------------
  // §12.4 — a polyphony that is true in one switch position
  // -------------------------------------------------------------------------

  describe('paraphonic (§12.4)', () => {
    it('declares two notes on one assignable, not two voices', () => {
      // p.14 §5.15: "a Neutron in Paraphonic mode will handle 2 notes." Two pitches through one
      // filter and one VCA is one assignable — the Matriarch's reasoning, at a smaller number.
      expect(device.voices).toHaveLength(1)
      expect(device.voices[0]?.polyphony).toBe(2)
      expect(device.comfortableVoices).toBe(1)
      expect(evidenceFor(device, 'voices')).toMatchObject({ source: 'Neutron User Manual, p.14' })
    })

    it('carries PARAPHONIC on every recipe, and lowers the demand where it is off', () => {
      // The device-level field cannot say "2 notes, but only with the switch in", so the recipe
      // has to. `patchPolyphony` is what stops the resolver handing a two-note part to a patch
      // that is in mono.
      for (const recipe of device.recipes) {
        const p = named(recipe, 'PARAPHONIC')
        expect(p, recipe.id).toBeDefined()
        if (p?.kind !== 'enum') throw new Error('unreachable')
        if (p.value === 'off') {
          expect(recipe.patchPolyphony, recipe.id).toBe(1)
        } else {
          expect(recipe.patchPolyphony, recipe.id).toBeUndefined()
        }
      }
      // Both branches are used, or the rule is decoration.
      const para = device.recipes.filter((r) => r.patchPolyphony === undefined)
      expect(para.length).toBeGreaterThan(0)
      expect(para.length).toBeLessThan(device.recipes.length)
    })
  })

  // -------------------------------------------------------------------------
  // §2.6 — capability provenance
  // -------------------------------------------------------------------------

  describe('capability evidence (§2.6)', () => {
    it('follows a clock and does not claim to set one', () => {
      expect(device.clock.canReceiveClock).toBe(true)
      expect(device.clock.canSendClock).toBe(false)
      expect(device.clock.transport).toEqual(['midi-din', 'usb'])
      expect(device.clock.preferredSource).toBeUndefined()

      // And the socket the clock arrives at is named, so the rack draws the cable into a hole the
      // manual prints rather than one it invented.
      const midi = (device.jacks ?? []).find((j) => j.id === 'MIDI IN')
      expect(midi?.clock).toEqual(['midi-din'])
    })

    it('distinguishes what the document answers from what it leaves open', () => {
      // The three states are not interchangeable, and this manifest uses two of them one field
      // apart. `canSendClock` is `unknown` because p.9 item 106 answers for the DIN and item 107
      // leaves USB open; `preferredSource` is `cited-against` because §5.12 has the box following
      // a DAW's clock in as many words.
      const send = evidenceFor(device, 'clock.canSendClock')
      expect(send).toMatchObject({ kind: 'unknown' })
      expect((send as { reason: string }).reason).toContain('item 107')

      const preferred = evidenceFor(device, 'clock.preferredSource')
      expect(preferred).toMatchObject({ kind: 'cited-against' })
      expect((preferred as { cite: { source: string } }).cite.source).toMatch(SOURCE)
    })

    it('answers the content question rather than leaving it to the default', () => {
      // #111: absence means nobody established it, and the guide says so. Here somebody did —
      // p.25's architecture list is exhaustive and entirely analog, so the answer is a documented
      // no rather than a silence. No recipe carries `sourceAudio` and none could.
      expect(device.content).toBeUndefined()
      expect(evidenceFor(device, 'content')).toMatchObject({ kind: 'cited-against' })
      for (const recipe of device.recipes) expect(recipe.sourceAudio, recipe.id).toBeUndefined()
    })

    it('has no sequencer, and every field that depends on that agrees', () => {
      expect(device.patternEntry).toEqual({
        kind: 'external',
        reason: expect.stringContaining('no sequencer'),
      })
      expect(evidenceFor(device, 'patternEntry')).toMatchObject({ source: 'Neutron User Manual, p.10' })
      expect(device.noteDuration).toMatchObject({ kind: 'gate' })
      for (const recipe of device.recipes) expect(recipe.articulation, recipe.id).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // §10 — the panel
  // -------------------------------------------------------------------------

  describe('the panel (§10)', () => {
    it('is the Eurorack panel and not the factory chassis, which the aspect settles', () => {
      // p.26 prints both `Dimensions ... 424 mm` and `Eurorack HP  80 HP`. The drawn figure
      // measures 3.1606 : 1, against 406.4/128.5 = 3.1626 for the panel and 424/136 = 3.1176 for
      // the case. The 0.06% match is the one that picks.
      expect(device.physical.panelSpanMm).toBeCloseTo(406.4, 1)
      expect(device.panel?.panelRiseMm).toBeCloseTo(128.6, 1)
      const aspect = device.physical.panelSpanMm / (device.panel?.panelRiseMm ?? 1)
      expect(aspect).toBeGreaterThan(3.1)
      expect(aspect).toBeLessThan(3.2)
      expect(device.physical.verified).toEqual({ kind: 'manual', source: 'Neutron User Manual, p.26' })
    })

    it('keeps every drawn feature inside the published footprint', () => {
      const panel = device.panel
      if (panel === undefined) throw new Error('no panel')
      for (const f of panel.features) {
        const w = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.w
        const h = f.kind === 'knob' ? f.d : f.kind === 'label' ? 0 : f.h
        expect(f.x, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.y, JSON.stringify(f)).toBeGreaterThanOrEqual(0)
        expect(f.x + w, JSON.stringify(f)).toBeLessThanOrEqual(device.physical.panelSpanMm)
        expect(f.y + h, JSON.stringify(f)).toBeLessThanOrEqual(panel.panelRiseMm)
      }
      expect(panel.features.filter((f) => f.kind === 'voices')).toHaveLength(1)
    })

    it('draws thirty-six knobs, seven buttons and the two socket blocks', () => {
      const f = device.panel?.features ?? []
      expect(f.filter((x) => x.kind === 'knob')).toHaveLength(36)
      expect(f.filter((x) => x.kind === 'button')).toHaveLength(7)
      // Two patchbay blocks plus the MIDI IN DIN; there is no jack in this vocabulary.
      expect(f.filter((x) => x.kind === 'grid')).toHaveLength(3)
      // And no screen, because the box reports through LEDs and nothing else.
      expect(f.filter((x) => x.kind === 'screen')).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // §2.4 — what one voice is modelled as doing
  // -------------------------------------------------------------------------

  it('takes the pad the CRAVE cannot, and for a reason on the page', () => {
    // p.25 gives this box two ADSR envelopes where the CRAVE's specification says ADS. A pad's
    // tail is a knob here and is nothing at all there, so the role lists differ on the fact
    // rather than on taste.
    const roles = device.voices[0]?.roles ?? []
    expect(roles).toContain('pad')
    expect(crave.voices[0]?.roles).not.toContain('pad')
    for (const release of ['ENV 1 R', 'ENV 2 R']) {
      expect(device.recipes.every((r) => named(r, release) !== undefined), release).toBe(true)
    }

    // The percussion roles that want a noise burst and a pitched body at once stay out: one
    // filter, one VCA, one pair of envelopes.
    for (const two of ['snare', 'clap', 'rim', 'closed-hat', 'open-hat', 'ride']) {
      expect(roles, two).not.toContain(two)
    }
  })

  it('renders the patch as cables in the guide, cited and annotated (§8)', () => {
    const result = alone()
    const withPatch = result.assignments.filter((a) => a.patch.length > 0)
    expect(withPatch.length).toBeGreaterThan(0)

    const guide = renderGuide(result)
    for (const assignment of withPatch) {
      for (const entry of assignment.patch) {
        expect(guide).toContain(`\`${entry.from}\` → \`${entry.to}\``)
        expect(guide).toContain(entry.note as string)
      }
    }
  })
})
