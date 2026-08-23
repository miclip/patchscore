import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  resolveRecipe,
  type AuthoredParam,
} from '../lib/core/index'
import { device } from '../lib/devices/synthstrom-deluge/index'
import { auditDevice } from '../scripts/audit-verified'

const GUIDEBOOK = 'Deluge Official Guidebook OS 4.1 (OLED), p.'
const COMMUNITY = 'Deluge community firmware release_1_2_1, '

function pool() {
  const voice = device.voices[0]
  if (voice === undefined || voice.kind !== 'pool') throw new Error('the Deluge should be one pool')
  return voice
}

function params(): { recipe: string; param: AuthoredParam }[] {
  return device.recipes.flatMap((r) =>
    (r.params as AuthoredParam[]).map((param) => ({ recipe: r.id, param })),
  )
}

describe('Deluge manifest', () => {
  it('parses as a Device', () => {
    const parsed = DeviceSchema.safeParse(device)
    expect(parsed.success ? [] : parsed.error.issues).toEqual([])
  })

  it('spans 305 mm across the panel, cited to the published specifications (§10)', () => {
    // 305 x 208 x 46 mm. Orientation checked against the diagrams, not assumed: the p.3 plan view
    // is landscape at ~1.48 aspect against 305/208 = 1.47, and the p.6 rear-panel drawing runs the
    // jack-bearing long edge horizontally. The guidebook states no dimensions anywhere, so the
    // source names Synthstrom's specifications instead of a page. Not `false`: somebody checked.
    expect(device.physical.panelSpanMm).toBe(305)
    expect(device.physical.verified).toEqual({
      kind: 'manual',
      source: 'Synthstrom Deluge product specifications, synthstrom.com/product/deluge',
    })
  })

  // -------------------------------------------------------------------------
  // §2.1 — `count` is a planning horizon, not a track count
  // -------------------------------------------------------------------------

  it('sizes its pool as a resolver planning horizon, not a hardware limit (§2.1)', () => {
    // The guidebook is explicit that the box has no track limit to model: "Deluge does not
    // enforce firm limits on how many tracks or voices may sound at once" (p.288), "Can create
    // unlimited clips" (p.301). `count` therefore answers a different question — how many
    // assignables the resolver may *consider* — and the number is chosen for headroom over the
    // largest plausible template, not read off the hardware.
    expect(device.voices).toHaveLength(1)
    expect(pool().id).toBe('track')
    expect(pool().count).toBe(24)

    // Headroom over the *stated planning horizon* is the justification, so that is what is
    // asserted. Templates ask for roughly 5-15 role requests (the golden template asks for 11),
    // and 24 clears the top of that band with room to spare. This is not a claim that 24 exceeds
    // the role vocabulary — it does not, and it does not need to: a template may request the same
    // role more than once, and requests are what `count` has to cover, not distinct roles.
    const PLANNING_HORIZON = 15
    expect(pool().count).toBeGreaterThan(PLANNING_HORIZON)

    // Finite on purpose. `expand()` materialises every member and §7.1 ranges over all of them,
    // so headroom nobody can reach is pure cost — which is why this is not `Number.MAX_SAFE_INTEGER`
    // and why the type has no `unbounded` sentinel.
    expect(Number.isFinite(pool().count)).toBe(true)
    expect(expand(device)).toHaveLength(24)
  })

  it('is legal for every role, because synth clips and kit rows cover them all', () => {
    expect(new Set(pool().roles).size).toBe(ROLES.length)
    for (const role of ROLES) expect(pool().roles).toContain(role)
  })

  it('plans 8 notes per assignable, the firmware default (§12.4)', () => {
    // `polyphony` is notes within one role, never roles. 8 is `Max Voices`' own default for a new
    // synth on this firmware — a conservative planning bound, not a hardware ceiling, since a
    // sound can be configured higher and legacy sounds default to 16.
    expect(pool().polyphony).toBe(8)
  })

  it('treats crowding as a separate, provisional judgement (#14)', () => {
    // Not derived from `count`, not derived from CPU, and deliberately well below both: the
    // guidebook's practical figures are "around 64" synth voices and "up to 110" sample voices
    // (p.288). This is a taste call about where the box stops being pleasant, and crowding is a
    // cost in the objective rather than a feasibility limit — so being wrong re-ranks guides, it
    // does not break them.
    expect(device.comfortableVoices).toBe(12)
    expect(device.comfortableVoices as number).toBeLessThan(pool().count)
  })

  // -------------------------------------------------------------------------
  // Pool-keyed lookup (§2.2)
  // -------------------------------------------------------------------------

  it('resolves every recipe from every ordinal in the pool (§2.2)', () => {
    const assignables = expand(device)
    expect(assignables.every((a) => a.poolId === 'track')).toBe(true)

    for (const recipe of device.recipes) {
      expect(recipe.voice, recipe.id).toBe('track')
      for (const member of assignables) {
        const resolution = resolveRecipe(device, member, recipe.role, recipe.character)
        const where = `${recipe.id} on ${member.voiceId}`
        expect(resolution.outcome, where).toBe('exact')
        if (resolution.outcome === 'unvoiced') throw new Error(`${where}: unvoiced`)
        expect(resolution.recipe.id, where).toBe(recipe.id)
      }
    }
  })

  // -------------------------------------------------------------------------
  // Firmware and source discipline
  // -------------------------------------------------------------------------

  it('names the firmware tag in every community citation', () => {
    // The community docs are a moving target in a way a PDF is not, so a citation that does not
    // name the tag is not checkable. Every one of them must carry it.
    const communityCites = params()
      .flatMap(({ param }) => {
        const cites = [param.verified]
        if (param.kind === 'numeric') cites.push(param.range.verified)
        if (param.kind === 'enum') cites.push(param.options.verified)
        return cites.filter((v) => v !== undefined && v !== false)
      })
      .filter((v) => (v as { source: string }).source.startsWith('Deluge community'))

    expect(communityCites.length).toBeGreaterThan(0)
    for (const cite of communityCites) {
      expect((cite as { source: string }).source).toContain('release_1_2_1')
    }
  })

  it('cites only the two documented sources, and never the unit', () => {
    // No `observed` citation may appear: nobody has taken a reading off this hardware, and
    // `observed` is a claim that somebody did (§3.1). Where a community parameter has no
    // documented bound the recipe authors no numeric for it instead.
    for (const { recipe, param } of params()) {
      const cites = [param.verified]
      if (param.kind === 'numeric') cites.push(param.range.verified)
      if (param.kind === 'enum') cites.push(param.options.verified)
      for (const cite of cites) {
        if (cite === undefined || cite === false) continue
        expect(cite.kind, `${recipe} / ${param.name}`).toBe('manual')
        expect(
          cite.source.startsWith(GUIDEBOOK) || cite.source.startsWith(COMMUNITY),
          `${recipe} / ${param.name}: ${cite.source}`,
        ).toBe(true)
      }
    }
  })

  it('states its community-feature assumption where a recipe depends on one', () => {
    // A recipe resting on an experimental, toggle-gated feature has to say so, or the guide sends
    // the user looking for a control their box may not be showing.
    const dx7 = device.recipes.find((r) =>
      (r.params as AuthoredParam[]).some((p) => p.kind === 'enum' && p.value === 'DX7'),
    )
    expect(dx7, 'no DX7 recipe').toBeDefined()
    expect(dx7?.routing).toContain('DX7 ENGINE')
    expect(dx7?.routing).toContain('experimental')
  })

  // -------------------------------------------------------------------------
  // Content and citation discipline (§3.2)
  // -------------------------------------------------------------------------

  it('carries 15-20 recipes on distinct (role, character, voice) triples (§3)', () => {
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    expect(device.recipes.length).toBeLessThanOrEqual(20)

    const triples = device.recipes.map((r) => `${r.role}\u0000${r.character}\u0000${r.voice}`)
    expect(new Set(triples).size).toBe(triples.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  it('cites every range and option set, and no point (§3.2)', () => {
    for (const recipe of device.recipes) {
      expect(recipe.verified, recipe.id).toBe(false)
      for (const param of recipe.params as AuthoredParam[]) {
        const where = `${recipe.id} / ${param.name}`
        expect(param.verified, where).toBe(false)
        if (param.kind === 'numeric') {
          expect(param.range.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.step, where).toBeUndefined()
        }
        if (param.kind === 'enum') {
          expect(param.options.verified, where).toMatchObject({ kind: 'manual' })
          expect(param.options.values, where).toContain(param.value)
          expect(param.options.values.length, where).toBeGreaterThan(1)
        }
      }
    }

    const counts = auditDevice(device).counts
    expect(counts.manualPoints).toBe(0)
    expect(counts.provisionalPoints).toBe(counts.params)
    expect(counts.unverifiedRanges).toBe(0)
    expect(counts.moodInert).toBe(0)
    expect(counts.manualRanges).toBe(counts.numerics)
  })

  it('keeps every numeric inside a range a source actually prints', () => {
    // Three shapes, and only three: the 0-50 display scale, the arpeggiator's 1-8 octave range
    // (p.84), and swing's 1-99 (p.39). Anything else would be a bound nobody printed, which is
    // the failure this pins.
    //
    // PAN is deliberately absent. p.86 prints "32L - 0 - 32R" — a left/right label scale, not a
    // signed number line — so encoding left as -32 would be a transcription of the range rather
    // than the range.
    const SHAPES = [
      { min: 0, max: 50 },
      { min: 1, max: 8 },
      { min: 1, max: 99 },
    ]
    for (const { recipe, param } of params()) {
      if (param.kind !== 'numeric') continue
      const where = `${recipe} / ${param.name}`
      const shape = { min: param.range.min, max: param.range.max }
      expect(SHAPES, `${where}: ${shape.min}-${shape.max}`).toContainEqual(shape)
      expect(param.value, where).toBeGreaterThanOrEqual(param.range.min)
      expect(param.value, where).toBeLessThanOrEqual(param.range.max)
    }
  })

  it('takes stock parameter ranges from the guidebook and nothing else', () => {
    // **The source split, enforced.** A community menu doc describing a stock parameter is prose
    // about a moving target; the guidebook is the box's own documentation. So a community
    // citation may only appear on a parameter community firmware actually added.
    const COMMUNITY_ADDED = ['ARP PRESET', 'ARP RHYTHM', 'ARP RATCHET PROBABILITY', 'FILTER ROUTE', 'OSC 1 TYPE']
    for (const { recipe, param } of params()) {
      const legality =
        param.kind === 'numeric'
          ? param.range.verified
          : param.kind === 'enum'
            ? param.options.verified
            : undefined
      if (legality === undefined || legality === false) continue
      if (!legality.source.startsWith(COMMUNITY)) continue
      expect(COMMUNITY_ADDED, `${recipe} / ${param.name} cites community docs`).toContain(param.name)
    }

    // And the envelope and wavetable position are absent entirely: the guidebook prints no range
    // for either, and the community menus that do are not a source for a stock parameter.
    for (const { recipe, param } of params()) {
      for (const banned of ['ENV ', 'ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE', 'WAVE INDEX']) {
        expect(param.name.includes(banned), `${recipe} sets ${param.name}`).toBe(false)
      }
    }
  })

  it('authors nothing that cannot be acted on', () => {
    // An LFO shape with no rate, no sync interval and no patched destination is a decoration, not
    // an instruction — and the rate has no printed range, so it cannot be authored. Nothing sets
    // an LFO at all.
    for (const { recipe, param } of params()) {
      expect(param.name.startsWith('LFO'), `${recipe} sets ${param.name}`).toBe(false)
      // PAN's printed scale is 32L-0-32R; there is no cited signed range to author it in.
      if (param.kind === 'numeric') expect(param.name, recipe).not.toBe('PAN')
    }

    for (const recipe of device.recipes) {
      const names = (recipe.params as AuthoredParam[]).map((p) => p.name)
      // Mod FX rate or feedback without a type is a setting on an effect nobody switched on.
      if (names.some((n) => n.startsWith('MOD FX RATE') || n.startsWith('MOD FX FEEDBACK'))) {
        expect(names, recipe.id).toContain('MOD FX TYPE')
      }
      // A delay rate with no delay amount is a delay nobody can hear.
      if (names.includes('DELAY RATE')) {
        expect(names, recipe.id).toContain('DELAY AMOUNT')
        const amount = (recipe.params as AuthoredParam[]).find((p) => p.name === 'DELAY AMOUNT')
        if (amount?.kind !== 'numeric') throw new Error(`${recipe.id}: DELAY AMOUNT not numeric`)
        expect(amount.value, recipe.id).toBeGreaterThan(0)
      }
      // Feedback is a flanger/phaser parameter; chorus has none (p.229).
      if (names.includes('MOD FX FEEDBACK')) {
        const type = (recipe.params as AuthoredParam[]).find((p) => p.name === 'MOD FX TYPE')
        if (type?.kind !== 'enum') throw new Error(`${recipe.id}: MOD FX TYPE not an enum`)
        expect(['FLANGER', 'PHASER'], recipe.id).toContain(type.value)
      }
    }
  })

  it('models the arpeggiator this firmware actually has', () => {
    // Community `release_1_2_1` replaced the stock Mode pad with an `Arp preset` shortcut, so the
    // stock OFF/UP/DOWN/BOTH/RANDOM list on p.253 no longer describes this box.
    const arp = device.recipes.find((r) =>
      (r.params as AuthoredParam[]).some((p) => p.name === 'ARP PRESET'),
    )
    expect(arp, 'no arpeggiator recipe').toBeDefined()
    const preset = (arp?.params as AuthoredParam[]).find((p) => p.name === 'ARP PRESET')
    if (preset?.kind !== 'enum') throw new Error('ARP PRESET should be an enum')
    expect(preset.options.values).toEqual(['Off', 'Up', 'Down', 'Both', 'Random', 'Custom'])
    expect(preset.options.verified).toMatchObject({ kind: 'manual' })
    // No recipe may carry the superseded stock control.
    for (const { param } of params()) expect(param.name).not.toBe('ARP MODE')
  })

  it('cites both sources for an option set that spans both (§3.2)', () => {
    // The DX7 array is the guidebook's eleven stock oscillator types plus the one entry community
    // firmware adds. A citation naming only `dx_synth.md` would substantiate one option out of
    // twelve, so the legality claim has to name the guidebook page *and* the tagged doc.
    const dx7 = device.recipes
      .flatMap((r) => r.params as AuthoredParam[])
      .find((p) => p.kind === 'enum' && p.value === 'DX7')
    expect(dx7, 'no DX7 option set').toBeDefined()
    if (dx7?.kind !== 'enum') throw new Error('DX7 param should be an enum')

    const source = (dx7.options.verified as { source: string }).source
    expect(source).toContain('p.81')
    expect(source).toContain('release_1_2_1')
    expect(source).toContain('dx_synth.md')

    // Both halves of the array are actually present, or the two-source citation is overkill
    // dressed as rigour.
    expect(dx7.options.values).toContain('DX7')
    expect(dx7.options.values).toContain('Analog Saw')
    expect(dx7.options.values.length).toBe(13)
  })

  it('records the firmware in runtime metadata, not only in a comment', () => {
    // A guide rendered from this device is wrong for a stock Deluge. That has to survive into
    // something the renderer can read.
    expect(device.manual?.edition).toContain('release_1_2_1')
    expect(device.manual?.edition).toContain('OS 4.1')
  })

  it('offers the community views this rig has as reachable jogs', () => {
    // Performance View and the chord keyboards change how a part is played in. Neither is used by
    // a recipe, so without a hint they would exist only in a comment nobody renders.
    const hints = device.hints ?? {}
    expect(Object.keys(hints)).toContain('performance-view')
    expect(Object.keys(hints)).toContain('chord-keyboard')
    for (const hint of Object.values(hints)) {
      expect(hint.split(' ').length, hint).toBeLessThanOrEqual(8)
    }
  })

  // -------------------------------------------------------------------------
  // Concurrency: nothing authored that several recipes could not share
  // -------------------------------------------------------------------------

  it('authors no song-global or CPU-hostile parameter (invariant 5)', () => {
    // Each of these would make two concurrent assignments unrealisable, or would blow the CPU
    // budget the box actually has:
    //  - reverb WIDTH/DAMPENING/SIZE/PAN are "common across sounds, instruments and song" (p.225),
    //    so two recipes cannot ask for different ones. Only REVERB AMOUNT is per-sound.
    //  - Grain FX is "resource-intensive... only one instance per song" (community_features.md).
    //  - CUTOFF, RESONANCE and LFO RATE have no printed range in any source, so authoring them
    //    would mean inventing bounds.
    const FORBIDDEN = [
      'REVERB WIDTH', 'REVERB DAMPENING', 'REVERB SIZE', 'REVERB PAN',
      'GRAIN', 'CUTOFF', 'RESONANCE', 'LFO 1 RATE', 'LFO 2 RATE',
    ]
    for (const { recipe, param } of params()) {
      for (const banned of FORBIDDEN) {
        expect(param.name.includes(banned), `${recipe} sets ${param.name}`).toBe(false)
      }
    }

    // REVERB AMOUNT is per-sound and *is* used, or the exclusion above is testing nothing.
    expect(params().some(({ param }) => param.name === 'REVERB AMOUNT')).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Features
  // -------------------------------------------------------------------------

  it('models the per-step, LFO, sidechain and I/O facts the sources state', () => {
    const perStep = device.features?.perStep ?? []
    expect(perStep).toEqual(['velocity', 'probability', 'iteration', 'automation'])

    // Two LFOs, both syncable — the second only because of community firmware. Stock 4.1 says
    // "LFO1 has an additional SYNC parameter... LFO2 is retriggerable" (p.126).
    expect(device.features?.lfo?.count).toBe(2)
    expect(device.features?.lfo?.syncable).toBe(true)

    // A single global ducking bus fed by sounds inside the song, not by the audio input (p.128).
    expect(device.features?.sidechain).toEqual({ internal: true, fromExternalAudio: false })

    // Stereo L/MONO + R (p.6, p.8); CV and gate outs are control voltage, not audio; USB-B is
    // MIDI, power and host, and the guidebook documents no USB audio mode at all.
    expect(device.io).toEqual({
      main: 'stereo',
      individualOuts: 0,
      audioIn: true,
      usbAudio: false,
    })

    // MIDI DIN in/out, USB MIDI, and a trigger clock in plus PPQN clock out on gate 4 (p.6, p.268).
    expect(device.clock.canSendClock).toBe(true)
    expect(device.clock.canReceiveClock).toBe(true)
    expect(device.clock.transport).toEqual(['midi-din', 'usb', 'analog-clock'])
  })

  it('addresses steps only by PatternSlot, and uses every per-step feature it declares', () => {
    const source = JSON.stringify(device)
    expect(source).not.toContain('"step"')
    expect(source).not.toContain('"hits"')

    const perStep = device.features?.perStep ?? []
    const used = new Set(
      device.recipes.flatMap((r) => (r.articulation ?? []).flatMap((a) => Object.keys(a.set))),
    )
    expect([...used].filter((k) => !perStep.includes(k))).toEqual([])
    expect(perStep.filter((k) => !used.has(k))).toEqual([])
  })

  it('keeps articulation values inside what the guidebook prints', () => {
    for (const recipe of device.recipes) {
      for (const entry of recipe.articulation ?? []) {
        for (const [key, value] of Object.entries(entry.set)) {
          const where = `${recipe.id} / ${key}`
          // Velocity 0-127 (p.299); probability 5-100% (p.64); iteration prints as "1 of 2"
          // through "8 of 8" (p.65) and is never a bare number.
          if (key === 'velocity') {
            expect(value, where).toBeGreaterThanOrEqual(0)
            expect(value, where).toBeLessThanOrEqual(127)
          }
          if (key === 'probability') {
            expect(value, where).toBeGreaterThanOrEqual(5)
            expect(value, where).toBeLessThanOrEqual(100)
          }
          if (key === 'iteration') expect(String(value), where).toMatch(/^\d of \d$/)
        }
      }
    }
  })

  it('gives every recipe something to set', () => {
    for (const recipe of device.recipes) {
      const numerics = (recipe.params as AuthoredParam[]).filter((p) => p.kind === 'numeric')
      expect(numerics.length, recipe.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('offers the swing axis on song swing, over the range the guidebook prints (§6.1)', () => {
    // This test asserted the opposite until #62 was re-read against the manual. The claim was
    // that swing could not be a parameter offset because it is a timing transform — but a swing
    // control *is* a parameter whose value means timing, and the guidebook prints its bounds
    // and its neutral: "A swing % value between 1-99", `50 = Off` (p.39).
    const axes = new Set(
      device.recipes.flatMap((r) =>
        (r.params as AuthoredParam[]).flatMap((p) =>
          p.kind === 'numeric' ? (p.mood ?? []).map((m) => m.axis) : [],
        ),
      ),
    )
    expect([...axes].sort()).toEqual(['darkness', 'density', 'grit', 'space', 'swing'])
  })

  it('sits at the neutral the guidebook prints, and says so without badging it as authority', () => {
    // p.39 prints `50 = Off`. That is where the neutral is, not a claim that this recipe should
    // sit there — §3.2's two gates. The cited range and the note carry the fact; the point stays
    // provisional, exactly as `EQ BASS AMOUNT` carries "25 is neutral" beside a cited p.219.
    for (const recipe of device.recipes) {
      const swing = (recipe.params as AuthoredParam[]).find((p) => p.name === 'SWING')
      if (swing?.kind !== 'numeric') throw new Error(`${recipe.id}: SWING is not numeric`)
      expect(swing.value, recipe.id).toBe(50)
      expect(swing.note, recipe.id).toContain('50 is off')
      expect(swing.verified, recipe.id).toBe(false)
      expect(swing.range.verified, recipe.id).toMatchObject({ kind: 'manual' })
    }
  })

  it('carries song swing on every recipe, because it is one setting for the song', () => {
    for (const recipe of device.recipes) {
      const swing = (recipe.params as AuthoredParam[]).find((p) => p.name === 'SWING')
      expect(swing, recipe.id).toBeDefined()
      if (swing?.kind !== 'numeric') throw new Error(`${recipe.id}: SWING is not numeric`)
      expect(swing.value, recipe.id).toBe(50)
      expect({ min: swing.range.min, max: swing.range.max }).toEqual({ min: 1, max: 99 })
      // §6.1's rule, the one `send` follows for `space`: an amount larger than the distance to
      // the bound spends the end of the knob's travel against a clamp.
      expect(swing.mood).toEqual([{ axis: 'swing', amount: 49 }])
      // The note is what stops a reader setting it once per part. It is one setting.
      expect(swing.note, recipe.id).toContain('song-wide')
    }
  })
})
