import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DeviceSchema,
  ROLES,
  expand,
  isSustainedPart,
  moodState,
  noteInstruction,
  reachableSlots,
  renderGuide,
  resolve,
  resolveRecipe,
  type AuthoredParam,
  type Recipe,
  type ResolvedAssignment,
  type Role,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { device } from '../lib/devices/synthstrom-deluge/index'
import { auditDevice } from '../scripts/audit-verified'

const GUIDEBOOK = 'Deluge Official Guidebook OS 4.1 (OLED), p.'
const COMMUNITY = 'Deluge community firmware release_1_2_1, '

function pool() {
  const voice = device.voices[0]
  if (voice === undefined || voice.kind !== 'pool') throw new Error('the Deluge should be one pool')
  return voice
}

/**
 * The roles that belong in a drum kit. Used twice: a kit row that loads nothing has to be one of
 * these (#172), and a sampled one of these has to name the lineage it is reaching for (#173).
 */
const PERCUSSIVE: Role[] = [
  'kick', 'snare', 'clap', 'rim', 'ghost-perc',
  'closed-hat', 'open-hat', 'ride', 'metallic', 'tom',
]

/** The two recipes #173 added or converted. Both are synth rows inside a kit. */
const SYNTH_KICKS = ['deluge-kick-hard', 'deluge-kick-dark']

function paramNamed(recipeId: string, name: string): AuthoredParam {
  const recipe = device.recipes.find((r) => r.id === recipeId)
  if (recipe === undefined) throw new Error(`no recipe ${recipeId}`)
  const param = (recipe.params as AuthoredParam[]).find((p) => p.name === name)
  if (param === undefined) throw new Error(`${recipeId} has no ${name}`)
  return param
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
  // #173 — a drum this box can be told how to make, rather than one to go and find
  // -------------------------------------------------------------------------

  it('offers a percussive part that needs no sample at all (#173)', () => {
    // The defect this closes was structural. With no envelope modelled, a recipe could not
    // describe a sound whose shape over time is the point — which is every drum — so every
    // percussive role here asked the reader to go and find a recording and every tonal role was
    // synthesised. That split was a fact about the manifest, not about the Deluge.
    const synthesisedDrums = device.recipes.filter(
      (r) => PERCUSSIVE.includes(r.role) && r.sourceAudio === undefined,
    )
    for (const id of SYNTH_KICKS) expect(synthesisedDrums.map((r) => r.id)).toContain(id)

    // And one of them is the *most requested* character rather than only a spare one. Three of
    // the five kick requests in the direction library ask for `hard`, industrial-techno among
    // them, which is where "go and find a sample" costs a reader the most.
    const kick = device.recipes.find((r) => r.id === 'deluge-kick-hard')
    expect(kick?.character).toBe('hard')
    expect(kick?.sourceAudio).toBeUndefined()
  })

  it('makes the synthesised kick a synth row inside a kit, and says how (#173)', () => {
    // p.87 documents the combination outright: "CREATING A NEW SYNTHESIZER ROW IN A KIT CLIP...
    // Press [AUDITION] + [SYNTH] to create a synth clip on the row selected". The drums belong in
    // one kit, so the kick does not become a separate synth clip just because it is synthesised.
    for (const id of SYNTH_KICKS) {
      const clip = paramNamed(id, 'CLIP TYPE')
      if (clip.kind !== 'enum') throw new Error(`${id}: CLIP TYPE is not an enum`)
      expect(clip.value, id).toBe('Kit')

      const osc = paramNamed(id, 'OSC 1 TYPE')
      if (osc.kind !== 'enum') throw new Error(`${id}: OSC 1 TYPE is not an enum`)
      expect(osc.value, id).toBe('Sine')
      // Without the jog, a reader who has made a kit has no way to know a row can be a synth.
      expect(osc.hint, id).toBe('kit-synth-row')
    }
    expect(device.hints?.['kit-synth-row']).toContain('[AUDITION]')
  })

  it('dials the whole kick rather than gesturing at it (#173)', () => {
    // The argument for a synthesised recipe is that it is *finishable*: real numbers on real
    // controls, and the reader is done when they have dialled them. A half-authored envelope
    // would leave the remaining stages at whatever the preset held, which is the same "go and
    // find it" the sample route was criticised for.
    for (const id of SYNTH_KICKS) checkComplete(id)
  })

  function checkComplete(id: string): void {
    const names = (device.recipes.find((r) => r.id === id)?.params ?? []).map(
      (p) => (p as AuthoredParam).name,
    )
    for (const stage of ['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE']) {
      expect(names, `${id} ENV 1 ${stage}`).toContain(`ENV 1 ${stage}`)
    }
    // ENV 2 carries no RELEASE, and that is deliberate rather than missed: ENV 1's amplitude is
    // already at silence, so a pitch still moving after note-off is inaudible. Authoring it would
    // be the decoration this manifest refuses for a lone LFO shape.
    for (const stage of ['ATTACK', 'DECAY', 'SUSTAIN']) {
      expect(names, `${id} ENV 2 ${stage}`).toContain(`ENV 2 ${stage}`)
    }
    expect(names, id).not.toContain('ENV 2 RELEASE')

    // The two sustains are not the same claim and must not carry the same value — see the test
    // below, which is where that got corrected.
    for (const name of ['ENV 1 SUSTAIN', 'ENV 2 SUSTAIN']) {
      const param = paramNamed(id, name)
      if (param.kind !== 'numeric') throw new Error(`${id} / ${name} is not numeric`)
      expect(param.note, `${id} / ${name}`).toBeDefined()
    }
  }

  it('reads each sustain on the scale that is actually in force for its destination (p.125)', () => {
    // **This is CLAUDE.md's cited-wrong-range failure, caught after it shipped into this file.**
    // `menus/envelope/sustain.md` says "0 causes the envelope to decay to 0", and both synthesised
    // kicks were authored at `ENV 2 SUSTAIN 0` with a note claiming that returned the pitch to the
    // note. The bound was right and the scale was wrong. §6.3 on p.125: "When either of the 2
    // envelopes modulate a parameter other than volume level, it does so with a 'bipolar'
    // behaviour... when the sustain is set to 25 (default for ENV2), that stage of the envelope
    // will match the current setting of the target parameter without modulation. Sustain settings
    // below 25 will then modulate the parameter lower than its current setting". So 0 on a pitch
    // destination is a kick that ends flat and stays there.
    //
    // The asymmetry below is the same sentence read twice: the bipolar rule is for "a parameter
    // other than volume level", and ENV 1's destination *is* volume level (p.122 has it as Hard
    // Connect to Overall Volume; p.125 opens "ENV1 controls volume amplitude by default").
    for (const id of SYNTH_KICKS) {
      const amp = paramNamed(id, 'ENV 1 SUSTAIN')
      const pitch = paramNamed(id, 'ENV 2 SUSTAIN')
      if (amp.kind !== 'numeric' || pitch.kind !== 'numeric') {
        throw new Error(`${id}: a sustain is not numeric`)
      }
      // Unipolar: the amplitude has to decay away, because that is what a drum does.
      expect(amp.value, `${id} ENV 1 SUSTAIN`).toBe(0)
      // Bipolar: 25 is the neutral, so the sustain stage sits at the note and the drop is what
      // the attack and decay do above it.
      expect(pitch.value, `${id} ENV 2 SUSTAIN`).toBe(25)
      expect(pitch.note, `${id} ENV 2 SUSTAIN`).toContain('p.125')
      // The range is unchanged and still the community file's. Only the reading of it moved.
      expect(pitch.range.verified, `${id} ENV 2 SUSTAIN`).toEqual({
        kind: 'manual',
        source: `${COMMUNITY}menus/envelope/sustain.md`,
      })
    }
  })

  it('serves the three-character kick set the directions actually ask for (#173)', () => {
    // The requests are `soft`, `hard`, `dark`, `hard`, `hard`. `hard` is three of the five and
    // industrial-techno is one of them, so `hard` is where a synthesised recipe has to land — a
    // synthesised kick parked on `dark` alone would leave techno hunting for a file, which was
    // the original complaint. `dark` is worth having on its own terms and is kept; `dirty` keeps
    // the sampled route, because removing it was never the point.
    const kicks = device.recipes.filter((r) => r.role === 'kick')
    expect(kicks.map((r) => r.character).sort()).toEqual(['dark', 'dirty', 'hard'])
    for (const id of SYNTH_KICKS) {
      expect(device.recipes.find((r) => r.id === id)?.sourceAudio, id).toBeUndefined()
    }
    expect(device.recipes.find((r) => r.id === 'deluge-kick-dirty')?.sourceAudio).toBeDefined()
  })

  it('keeps the two synthesised kicks apart on every axis that names them (#173)', () => {
    // Two recipes on one role that differ only in their id are two labels for one sound, which is
    // the mislabelling this set was arranged to avoid. `hard` is the industrial one: the operator's
    // point is that sine plus a fast drop plus saturation is not an approximation of a hard techno
    // kick but how one is made. `dark` is the clean one, and is clean by the absence of exactly
    // those two controls rather than by a smaller amount of them.
    const value = (id: string, name: string): number => {
      const param = paramNamed(id, name)
      if (param.kind !== 'numeric') throw new Error(`${id} / ${name} is not numeric`)
      return param.value
    }
    // The drop is smaller and slower on `dark`; the body is longer.
    expect(value('deluge-kick-dark', 'ENV 2 → PITCH DEPTH')).toBeLessThan(
      value('deluge-kick-hard', 'ENV 2 → PITCH DEPTH'),
    )
    expect(value('deluge-kick-dark', 'ENV 2 DECAY')).toBeGreaterThan(
      value('deluge-kick-hard', 'ENV 2 DECAY'),
    )
    expect(value('deluge-kick-dark', 'ENV 1 DECAY')).toBeGreaterThan(
      value('deluge-kick-hard', 'ENV 1 DECAY'),
    )

    // No saturation at all on `dark` — absent, not merely lower.
    const darkNames = (device.recipes.find((r) => r.id === 'deluge-kick-dark')?.params ?? []).map(
      (p) => (p as AuthoredParam).name,
    )
    expect(darkNames).not.toContain('DECIMATION')
    expect(darkNames).not.toContain('BITCRUSH')
    // And it carries the darkness axis, the way this box's other `dark` recipes do.
    const treble = paramNamed('deluge-kick-dark', 'EQ TREBLE AMOUNT')
    if (treble.kind !== 'numeric') throw new Error('EQ TREBLE AMOUNT is not numeric')
    expect(treble.mood?.map((m) => m.axis)).toEqual(['darkness'])

    // `hard` has the edge, and stays clear of `dirty` on both controls or the two characters are
    // one sound at two labels.
    for (const name of ['DECIMATION', 'BITCRUSH']) {
      expect(value('deluge-kick-hard', name), name).toBeGreaterThan(0)
      expect(value('deluge-kick-hard', name), name).toBeLessThan(value('deluge-kick-dirty', name))
    }
  })

  it('cites the pitch patch cable to the source that carries each half of it (#173)', () => {
    // Three claims, two sources. p.122's matrix ticks ENV 2 against `Pitch / Transpose: Overall`,
    // so the route exists; p.120 ends "Depth can be positive and negative values", so it is
    // signed; and only `automation_view.md` @ release_1_2_1 prints the bound — "the bottom pad in
    // the grid will set the value to -50 and the top pad in the grid will set the value to +50".
    // Citing either source alone would leave one of the three unsubstantiated.
    for (const id of SYNTH_KICKS) {
      const depth = paramNamed(id, 'ENV 2 → PITCH DEPTH')
      if (depth.kind !== 'numeric') throw new Error(`${id}: pitch depth is not numeric`)

      const source = (depth.range.verified as { source: string }).source
      expect(source, id).toContain('p.120')
      expect(source, id).toContain('p.122')
      expect(source, id).toContain('release_1_2_1')
      expect(source, id).toContain('automation_view.md')

      // Signed, and positive — ENV 2 lifts the attack above the note and its decay falls back to
      // the sustain, which p.125 puts at the note itself.
      expect({ min: depth.range.min, max: depth.range.max }, id).toEqual({ min: -50, max: 50 })
      expect(depth.value, id).toBeGreaterThan(0)
      expect(depth.hint, id).toBe('env2-pitch')
      // The destination is one row of a matrix with two pitch rows; the note has to say which.
      expect(depth.note, id).toContain('Pitch / Transpose: Overall')
    }
  })

  it('moves the sampled kick to a character its parameters earn (#173)', () => {
    // Two kicks cannot share `(kick, hard, track)` — §3's uniqueness key admits a second recipe
    // only on a different key, and the Tracker Mini pad pair is not a precedent, because that
    // pair splits on `Realisation`, which is a claim about note count. Two kicks are both one
    // note. `hard` and `dirty` are orthogonal in CHAR, so the move is real.
    //
    // **But the slot does not confer the character.** As authored the recipe was an EQ bass lift
    // and `DECIMATION 6` of 50 — the "edge" its old title claimed, and not a dirty kick. A wrong
    // character is worse than a missing one: it silently wins a search it should not, where §3.5
    // costs an absent character nothing worse than an approximation.
    const decimation = paramNamed('deluge-kick-dirty', 'DECIMATION')
    const bitcrush = paramNamed('deluge-kick-dirty', 'BITCRUSH')
    if (decimation.kind !== 'numeric' || bitcrush.kind !== 'numeric') {
      throw new Error('the dirty kick should carry two numerics')
    }
    // Measured against the company it now keeps rather than against a number pulled from the air:
    // the four other `dirty` recipes here sit at decimation 13-17 and bitcrush 7-21. The
    // `vox-chop` pair added the fourth at 16/10 and moved neither bound, which is the point of
    // asserting the company rather than a constant.
    const others = device.recipes.filter((r) => r.character === 'dirty' && r.role !== 'kick')
    expect(others.map((r) => r.id).sort()).toEqual([
      'deluge-acid-dirty', 'deluge-bass-mid-dirty', 'deluge-noise-dirty', 'deluge-vox-chop-dirty',
    ])
    expect(others.length).toBeGreaterThanOrEqual(3)
    const floor = Math.min(
      ...others.map((r) => {
        const d = (r.params as AuthoredParam[]).find((p) => p.name === 'DECIMATION')
        return d?.kind === 'numeric' ? d.value : Number.POSITIVE_INFINITY
      }),
    )
    expect(decimation.value).toBeGreaterThanOrEqual(floor)
    expect(bitcrush.value).toBeGreaterThan(0)
    // The title has to say what it now is, or the mislabelling has just moved into prose.
    const dirty = device.recipes.find((r) => r.id === 'deluge-kick-dirty')
    expect(dirty?.title.toLowerCase()).not.toContain('edge')
  })

  it('names the lineage a sampled drum is reaching for, and only where there is one (#173)', () => {
    // "Load `TR-808 Kick 01.wav`" claims something about a card nobody has seen — `content` is
    // `shipped-library` precisely because p.12 marks the factory folders as supplied and never
    // names a file. "An 808-style kick" claims something about the *sound*, is true whatever
    // library the reader has, and is the shorthand every producer already thinks in. The library
    // already speaks this vocabulary where content is enumerable (the TR-1000 and TR-8S name 808
    // and 909 outright); this is the same opinion, held where it cannot be a filename.
    const LINEAGE = /\b(808|909|707)-style\b/
    for (const recipe of device.recipes) {
      if (recipe.sourceAudio === undefined) continue
      if (!PERCUSSIVE.includes(recipe.role)) continue
      expect(recipe.sourceAudio.need, recipe.id).toMatch(LINEAGE)
      // Additive, not a replacement. The physical description is what makes it checkable against
      // a file the reader actually has.
      expect(recipe.sourceAudio.need.length, recipe.id).toBeGreaterThan(40)
    }

    // And it stops where the opinion stops. There is no drum-machine lineage for room tone or for
    // "something big", and naming one to match the others would be the invention the whole
    // reframe exists to avoid.
    for (const id of ['deluge-noise-dirty', 'deluge-impact-hard']) {
      const recipe = device.recipes.find((r) => r.id === id)
      expect(recipe?.sourceAudio?.need, id).not.toMatch(LINEAGE)
    }
  })

  // -------------------------------------------------------------------------
  // Content and citation discipline (§3.2)
  // -------------------------------------------------------------------------

  it('carries every recipe on distinct (role, character, voice) triples, and none unreachable (§3)', () => {
    /*
     * The ceiling moved by one at #173, when the kick became three recipes rather than one, and by
     * two again for the `vox-chop` pair, and by three at #345 for `tom`, `metallic` and `ride`.
     *
     * **It is not asserted any more.** Three moves is enough to say what it was: a proxy for
     * "nobody has dumped the parameter space into this file", re-recorded each time content
     * arrived. What it stood in for is checkable directly — a recipe no direction can select is
     * the thing that would actually be wrong — so that is what is checked, on the TR-1000's
     * argument at #345 and the TR-8S's after it. CLAUDE.md's "roughly 15-20 recipes covers a
     * device well" is about coverage, and several devices in the library now sit above it.
     */
    expect(device.recipes.length).toBeGreaterThanOrEqual(15)
    const unreachable = device.recipes.filter((r) => !reachableSlots(r, TEMPLATES).requested)
    expect(unreachable.map((r) => r.id), 'no direction can select these').toEqual([])

    const triples = device.recipes.map((r) => `${r.role}\u0000${r.character}\u0000${r.voice}`)
    expect(new Set(triples).size).toBe(triples.length)

    for (const recipe of device.recipes) {
      expect(ROLES).toContain(recipe.role)
      expect(CHARACTERS).toContain(recipe.character)
    }
  })

  // -------------------------------------------------------------------------
  // #172 — which clip to make, as a parameter rather than as a title
  // -------------------------------------------------------------------------

  it('tells the reader which kind of clip to create, in a cited parameter (#172)', () => {
    // `deluge-kick-hard` was titled "Kit-row kick" and printed nothing a reader could act on to
    // get to a kit. A title is prose: it is not what the renderer surfaces as an instruction, it
    // is not what `verified` attaches to, and it is not what the audit counts — so the claim has
    // to be a parameter or it is invisible to all three.
    for (const recipe of device.recipes) {
      const clip = (recipe.params as AuthoredParam[]).find((p) => p.name === 'CLIP TYPE')
      expect(clip, recipe.id).toBeDefined()
      if (clip?.kind !== 'enum') throw new Error(`${recipe.id}: CLIP TYPE is not an enum`)

      // The first thing the reader does at the box is the first thing the guide prints.
      expect((recipe.params as AuthoredParam[])[0]?.name, recipe.id).toBe('CLIP TYPE')

      // §2.4 Views (p.18) enumerates the whole set: "Single synth, kit, audio, MIDI or CV clips",
      // with a panel callout naming each view. All five are options; the legality claim is the
      // page's, the selection is ours.
      expect(clip.options.values, recipe.id).toEqual(['Synth', 'Kit', 'Audio', 'MIDI', 'CV'])
      expect(clip.options.verified, recipe.id).toEqual({
        kind: 'manual',
        source: `${GUIDEBOOK}18`,
      })
      expect(clip.verified, recipe.id).toBe(false)
      expect(clip.hint, recipe.id).toBe('clip-type')
    }

    // The gesture is reachable, not buried in a comment: [SHIFT] + [SYNTH] (p.87) and
    // [SHIFT] + [KIT] (p.112), both from clip view.
    expect(Object.keys(device.hints ?? {})).toContain('clip-type')
  })

  it('follows the sound source when it picks a clip type, and admits a synth row in a kit (#172, #173)', () => {
    // §5.2 (p.108) draws the line this started from: "If synth clips mainly support melodic
    // elements with the ability for sample use, kits would more often be used with samples as the
    // primary elements". That is still the rule for anything that loads audio.
    //
    // **It was too tight in one direction, and #173 is what found the edge.** The original form
    // asserted `Kit` if and only if the recipe loads a sample, which forbids the one combination
    // p.87 documents outright — "CREATING A NEW SYNTHESIZER ROW IN A KIT CLIP", a row of a kit
    // that is synthesised rather than sampled. That is exactly what a synthesised kick is, and it
    // has to sit in the kit with the rest of the drums. So the biconditional is now two claims:
    // sampling still implies a kit row, and a synth *clip* still implies nothing was loaded, but a
    // kit row is free to sound the internal engine.
    for (const recipe of device.recipes) {
      const params = recipe.params as AuthoredParam[]
      const clip = params.find((p) => p.name === 'CLIP TYPE')
      const osc = params.find((p) => p.name === 'OSC 1 TYPE')
      if (clip?.kind !== 'enum') throw new Error(`${recipe.id}: CLIP TYPE is not an enum`)

      // The two ways of saying "this recipe loads a file" must not come apart, whichever clip type
      // it lands on. This is the claim that stops a `sourceAudio` recipe quietly losing its
      // file-backed oscillator, or vice versa.
      //
      // **`Wavetable` loads a file too, and this rule said only `Sample` did.** That is how
      // `deluge-pad-soft` shipped telling a reader to set OSC 1 to Wavetable and nothing else: the
      // oscillator has no sound until a file is chosen (p.87, and p.95's CREATING A WAVETABLE
      // SYNTHESIZER walks the SD-card browser), and every `Sample` recipe here already carried a
      // `sourceAudio`. One oscillator type had the rule applied and the other did not.
      const loadsFile = recipe.sourceAudio !== undefined
      const fileBacked = osc?.kind === 'enum' && (osc.value === 'Sample' || osc.value === 'Wavetable')
      expect(fileBacked, recipe.id).toBe(loadsFile)

      // **Sampling still implies a kit row; loading a file no longer does.** §5.2 (p.108) is about
      // where *samples* belong — "kits would more often be used with samples as the primary
      // elements" — and a wavetable is not a sample. A wavetable pad is a melodic Synth clip that
      // happens to read a file off the card, which is the one combination this used to forbid.
      const sampled = osc?.kind === 'enum' && osc.value === 'Sample'
      if (sampled) expect(clip.value, `${recipe.id} loads a sample`).toBe('Kit')
      if (clip.value === 'Synth') expect(sampled, `${recipe.id} is a synth clip`).toBe(false)
      // A kit row that loads nothing is a synth row inside a kit. It is only worth the extra
      // explaining for a part that belongs in the drum kit, so it is confined to those roles.
      if (clip.value === 'Kit' && !loadsFile) {
        expect(PERCUSSIVE, `${recipe.id} is a synth row in a kit`).toContain(recipe.role)
      }
    }

    // Both sides of the widening are actually exercised, or the rule above is untested prose.
    const kitRows = device.recipes.filter((r) => {
      const clip = (r.params as AuthoredParam[]).find((p) => p.name === 'CLIP TYPE')
      return clip?.kind === 'enum' && clip.value === 'Kit'
    })
    expect(kitRows.some((r) => r.sourceAudio !== undefined)).toBe(true)
    expect(kitRows.some((r) => r.sourceAudio === undefined)).toBe(true)

    // Both halves are actually populated, or the rule above is vacuous.
    const values = device.recipes.map((r) => {
      const clip = (r.params as AuthoredParam[]).find((p) => p.name === 'CLIP TYPE')
      return clip?.kind === 'enum' ? clip.value : undefined
    })
    expect(values.filter((v) => v === 'Kit').length).toBeGreaterThan(0)
    expect(values.filter((v) => v === 'Synth').length).toBeGreaterThan(0)
    // Audio, MIDI and CV are offered and never selected: an audio clip has no oscillator, so
    // `OSC 1 TYPE` and `REPEAT MODE` do not exist on one, and MIDI and CV clips drive some other
    // box entirely.
    expect(values.filter((v) => v !== 'Kit' && v !== 'Synth')).toEqual([])
  })

  it('spells the oscillator-1 control one way (#172)', () => {
    // The guidebook gives this as the `TYPE` parameter of the `OSCILLATOR 1 / CARRIER 1 (FM)`
    // function (p.81) and gives oscillator 2 a `TYPE` of its own, so the printed name alone does
    // not say which oscillator. The manifest used to carry both `OSC TYPE` and `OSC 1 TYPE` for
    // the same control; the name that carries the ordinal is the one that survives.
    for (const { recipe, param } of params()) {
      expect(param.name, recipe).not.toBe('OSC TYPE')
    }
    const oscs = params().filter(({ param }) => param.name === 'OSC 1 TYPE')
    expect(oscs.length).toBe(device.recipes.length)
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
      // #173. A patch cable's depth, and the only signed range on this box. Unlike PAN, the source
      // prints the signed numbers themselves: automation_view.md @ release_1_2_1 says the bottom
      // pad sets -50 and the top pad sets +50, so this is the range as printed rather than a
      // transcription of a left/right label scale.
      { min: -50, max: 50 },
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
    // `OSC 1 TYPE` is *not* on this list, and used to be. It is a stock control — the guidebook's
    // own `OSCILLATOR 1` TYPE (p.81) — and its one community-touched use, the DX7 recipe, carries
    // a citation naming the guidebook page *and* the tagged doc, so it never reached this check in
    // the first place. Listing it asserted something false and tested nothing.
    const COMMUNITY_ADDED = ['ARP PRESET', 'ARP RHYTHM', 'ARP RATCHET PROBABILITY', 'FILTER ROUTE']

    // **A second list, and it means something different (#173).** These are *stock* controls whose
    // range only the community menu files print — the guidebook documents the envelope (§4.5's
    // "ENV 1 to shape amplitude", p.122's matrix) and never bounds it. Under the old rule they
    // were simply not authored, and the cost was that no recipe on this box could describe a drum.
    // The operator has ruled that `menus/envelope/*.md` establishes each 0-50 range.
    //
    // It is a closed list on purpose. The ruling is about four files, not a general licence to
    // reach for community prose whenever the guidebook is silent, and the way to keep it that way
    // is for a fifth name to have to be added here deliberately.
    const COMMUNITY_RANGED = ['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE'].flatMap((stage) => [
      `ENV 1 ${stage}`,
      `ENV 2 ${stage}`,
    ])
    const MAY_CITE_COMMUNITY = [...COMMUNITY_ADDED, ...COMMUNITY_RANGED]
    for (const { recipe, param } of params()) {
      const legality =
        param.kind === 'numeric'
          ? param.range.verified
          : param.kind === 'enum'
            ? param.options.verified
            : undefined
      if (legality === undefined || legality === false) continue
      if (!legality.source.startsWith(COMMUNITY)) continue
      expect(MAY_CITE_COMMUNITY, `${recipe} / ${param.name} cites community docs`).toContain(
        param.name,
      )
    }

    // The wavetable position is still absent: no source prints a range for it, and the envelope
    // ruling does not reach it. This list used to carry the four envelope stages alongside it and
    // that is the ban #173 lifted.
    for (const { recipe, param } of params()) {
      expect(param.name.includes('WAVE INDEX'), `${recipe} sets ${param.name}`).toBe(false)
    }

    // Each stage cites its own file, not one blanket envelope citation — the same discipline every
    // other range here follows, and the thing that makes the citation checkable.
    for (const { recipe, param } of params()) {
      // The four stages only. `ENV 2 → PITCH DEPTH` is a patch cable, not a stage, and it cites
      // the two sources that between them establish the route, its sign and its bound.
      if (!/^ENV [12] (ATTACK|DECAY|SUSTAIN|RELEASE)$/.test(param.name)) continue
      if (param.kind !== 'numeric') throw new Error(`${recipe}: ${param.name} is not numeric`)
      const stage = param.name.split(' ')[2]?.toLowerCase()
      expect(param.range.verified, `${recipe} / ${param.name}`).toEqual({
        kind: 'manual',
        source: `${COMMUNITY}menus/envelope/${stage}.md`,
      })
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

/**
 * §8/#142. **A held note is not a run of steps, and the wording used to imply it was.**
 *
 * Reported from a machine: a reader saw `sounds for 64 steps (4 bars)` in a list whose every other
 * line is a step to enter, read it as sixty-four steps to program, and went looking for a bug when
 * the Deluge showed one note. There was no bug — the guide already says, two lines above and in
 * the box's own words, *hold its start pad and press its end pad*. The number was right and the
 * sentence was shaped wrong.
 */
describe('a long note reads as held rather than as steps to enter', () => {
  const industrial = TEMPLATES.find((t) => t.id === 'industrial-techno')!
  const rig = DEVICES.filter((d) => ['synthstrom-deluge', 'roland-tr-1000'].includes(d.id))
  const md = renderGuide(
    resolve({ devices: rig, template: industrial, mood: moodState({}), seed: 3 }),
  )

  it('says held once a note spans a bar', () => {
    expect(md).toContain('held for 64 steps (4 bars)')
    // The old shape, which is the thing that was misread.
    expect(md).not.toContain('sounds for 64 steps')
  })

  it('leaves a note shorter than a bar exactly as it was', () => {
    // Nothing to misread here: no bar gloss to mistake the step count against.
    expect(md).toMatch(/sounds for \d+ steps?/)
    expect(md).not.toMatch(/held for \d+ steps? ·/)
  })

  it('still gives the technique beside it, in the box’s own words', () => {
    // The instruction that makes a held note enterable at all on this device.
    expect(md).toContain('hold its start pad and press its end pad')
  })
})

/**
 * §3/#101. The three conditions a Deluge wavetable has to meet, all of which fail *quietly* —
 * guidebook p.110. A reader whose file breaks one gets a pad that will not drift, or an oscillator
 * type that will not stay set, and no error either way.
 */
describe('the wavetable pad says what its file must be', () => {
  const pad = DEVICES.find((d) => d.id === 'synthstrom-deluge')!.recipes.find(
    (r) => r.id === 'deluge-pad-soft',
  )!

  it('requires mono, and says a stereo file becomes a sample instead', () => {
    expect(pad.sourceAudio?.need).toContain('MONO')
    expect(pad.sourceAudio?.need).toContain('loads as a sample')
  })

  it('requires more than 20 ms, because a shorter file has no wave navigation', () => {
    expect(pad.sourceAudio?.need).toContain('20 ms')
    expect(pad.sourceAudio?.need).toContain('single-cycle')
  })

  it('no longer promises a sweep it cannot deliver on every file', () => {
    // It promised "WAVE sweeps across the cycles" without saying it needed a multi-cycle table.
    expect(pad.sourceAudio?.need).toContain('multi-cycle')
  })
})

/**
 * §2.1/#334. **This box authors no trigger note, and it is the box #334 was filed about** —
 * *"the deluge isn't showing which note to place for steps"*.
 *
 * The answer is that neither of the two things a row can be wants a note from this field. p.20's
 * Clip View callout says both in one sentence: *"Synth: pitch is represented by the rows of the
 * grid... Kit: each row represents an individual sound, for example a drum / percussion sound
 * such as a kick on the bottom row"*, with a step placed *"at the desired column step for its
 * time position and row for synth pitch or kit sound by pressing a pad to toggle it on (lit) /
 * off (unlit)"*.
 *
 *  - A **Kit row is the address**. Which sound a step plays is which row it is on.
 *  - A **Synth row is pitch**, which §4.1 gives to the direction.
 *
 * p.287 is the near miss and disqualifies itself: *"Set kit row MIDI note — [AUDITION] + turn
 * (UPPER) - must be set as a MIDI row"*. A row set as a MIDI row sends to something else; it is
 * no longer sounding the kit sound the note would supposedly address.
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
    expect(authoring.map((d) => d.id)).not.toContain('synthstrom-deluge')
  })

  it('expands to twenty-four members on one pool, none of which carries a note', () => {
    // One pool holding both kinds of clip is half the argument: Synth rows and Kit rows do not
    // agree on what a note would mean, and this field reaches every member alike.
    expect(device.voices.length).toBe(1)
    const members = expand(device)
    expect(members.length).toBe(24)
    expect(members.every((m) => m.poolId === 'track')).toBe(true)
    expect(members.filter((m) => m.triggerNote !== undefined)).toEqual([])
  })

  /**
   * **Both kinds of clip are really in use here**, which is what makes the one-pool argument a
   * fact about this manifest rather than a hypothetical. `CLIP TYPE` is the parameter that says
   * which, and a pool-wide note would have to be true of both columns of this split.
   */
  it('carries Synth and Kit recipes on the same pool, which one note could not serve', () => {
    const kinds = new Map<string, number>()
    for (const recipe of device.recipes) {
      const clip = (recipe.params as AuthoredParam[]).find((p) => p.name === 'CLIP TYPE')
      expect(clip, recipe.id).toBeDefined()
      if (clip?.kind === 'enum') kinds.set(clip.value, (kinds.get(clip.value) ?? 0) + 1)
      expect(recipe.voice, recipe.id).toBe('track')
    }
    // Two kinds, both populated, all on the one pool.
    expect([...kinds.keys()].sort().length).toBeGreaterThan(1)
    for (const [kind, n] of kinds) expect(n, kind).toBeGreaterThan(0)
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
   * **The measurement, taken rather than remembered**, on the box the report came from. Every
   * direction against this box alone, seeds 1-6.
   *
   * The number moves when a direction gains or loses a part, and a diff is a prompt to re-read
   * the head note rather than a failure. What must not move is the relationship — no part ever
   * gets a `trigger`, because the pool has no note to give one.
   */
  it('leaves 252 grid parts blank, and pins how many there are', () => {
    // 228 until #345 authored `tom`, `metallic` and `ride` — twenty-four new parts, all of them
    // blank, because a synthesised kit row is addressed by row exactly as a sampled one is. The
    // number moves when a direction gains a part or this box gains a recipe; what must not move
    // is the relationship, which is that no part ever gets a `trigger`.
    const { grid } = sweep()

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

  it('leaves the blanks on the roles a Kit row answers, and on some a Synth row does', () => {
    // Pinned by role, not only by total: a count alone would survive one role's parts being
    // swapped for another's. `arp` and `vox-chop` among them is the point — the blanks are not
    // only drums, which is why #334 ruled out the synth-versus-drum axis.
    const counts = new Map<Role, number>()
    for (const g of sweep().grid) {
      if (g.kind !== 'none') continue
      counts.set(g.role, (counts.get(g.role) ?? 0) + 1)
    }
    expect(
      [...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
    ).toEqual([
      ['kick', 48],
      ['closed-hat', 42],
      ['ghost-perc', 42],
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
    expect(hooked.length).toBe(138)
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
    // classify — which is what would make the 228 above an undercount rather than a measurement.
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
   * §8. **The reader-facing half**, checked on the page rather than only on the resolver — and on
   * this box that is the exact complaint #334 was filed about, asked of the rendered guide.
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
})

/**
 * §345. **The three roles this pool declared and no recipe served, and the reason they are the
 * interesting three.**
 *
 * The manifest's head note records the shape the source split left behind: with no envelope stages
 * authored, *"no recipe here could describe a sound whose shape over time is the point — which is
 * every drum"*, so every percussive role reached for a sample. #173 opened the envelopes,
 * `deluge-kick-hard` became the first drum built out of the engine rather than loaded into it, and
 * `metallic`, `ride` and `tom` were what remained.
 *
 * All three are synthesised, and the tests below are about the narrowness they are shaped by
 * rather than about the sounds. This box's authored engine has **no filter cutoff, no resonance,
 * no LFO rate, no wavetable position, no second oscillator, no ring modulator and no FM pair** —
 * the first four because no source prints a range, the rest because this manifest models none. So
 * the two usual routes to an inharmonic spectrum are shut, and p.217's aliasing is the third.
 */
describe('the three roles served by synthesis rather than by a sample (§345)', () => {
  const byId = (id: string) => device.recipes.find((r) => r.id === id) as Recipe
  const NEW = ['deluge-tom-dark', 'deluge-metallic-bright', 'deluge-ride-bright']
  const names = (r: Recipe) => (r.params as { name: string }[]).map((param) => param.name)
  const valueOf = (r: Recipe, name: string) =>
    (r.params as { name: string; value?: unknown }[]).find((param) => param.name === name)?.value

  it('serves every role the pool declares, with nothing offered and left empty', () => {
    const served = new Set(device.recipes.map((r) => r.role as string))
    const pool = device.voices[0]
    expect((pool?.roles ?? []).filter((role) => !served.has(role)).sort()).toEqual([])
    // Against the declaration's own size, so a box serving everything because it declares little
    // would not pass this by accident.
    expect(pool?.roles.length).toBe(ROLES.length)
    expect(served.size).toBe(ROLES.length)
  })

  it('loads no sample for any of the three, which is the whole point of authoring them', () => {
    /*
     * The claim the advisor's steer is about, and the one a later edit is most likely to undo by
     * reaching for `sourceAudio` because it is quicker. `OSC 1 TYPE` `Sample` and a `sourceAudio`
     * block are the same fact twice on this box — the head note says all nine sample recipes set
     * both — so both are asserted absent.
     */
    for (const id of NEW) {
      const recipe = byId(id)
      expect(recipe, id).toBeDefined()
      expect(recipe.sourceAudio, `${id} asks the reader to find a recording`).toBeUndefined()
      expect(valueOf(recipe, 'OSC 1 TYPE'), `${id} oscillator`).not.toBe('Sample')
      // And each carries an amplitude envelope, which is what "synthesised" means here: a shape
      // over time the recipe states rather than one baked into a file.
      for (const stage of ['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE']) {
        expect(names(recipe), `${id} ENV 1 ${stage}`).toContain(`ENV 1 ${stage}`)
      }
    }

    /*
     * The invariant behind it, across the whole file — and it runs one way rather than both, which
     * the head note used to get wrong. **Every `Sample` oscillator carries source audio.** The
     * converse fails on exactly one recipe: `deluge-pad-soft` is a `Wavetable`, which #101
     * established also has no sound until a file is chosen. Pinned by name, so a second exception
     * is a failure rather than a shrug.
     */
    for (const recipe of device.recipes) {
      if (valueOf(recipe, 'OSC 1 TYPE') !== 'Sample') continue
      expect(recipe.sourceAudio, `${recipe.id} loads a sample and does not say which`).toBeDefined()
    }
    const declaringWithoutSample = device.recipes
      .filter((r) => r.sourceAudio !== undefined && valueOf(r, 'OSC 1 TYPE') !== 'Sample')
      .map((r) => r.id)
    expect(declaringWithoutSample).toEqual(['deluge-pad-soft'])
    expect(valueOf(byId('deluge-pad-soft'), 'OSC 1 TYPE')).toBe('Wavetable')
  })

  it('reaches for aliasing, because the two usual routes to an inharmonic spectrum are absent', () => {
    /*
     * p.217 states the mechanism rather than leaving it to be inferred: decimation reduces the
     * sample rate "crudely without filtering", so "heavily aliased frequencies are introduced".
     * Folded partials are not multiples of the fundamental, which is what makes the metallic
     * recipe a bell instead of a bright square.
     *
     * Asserted as an absence as well as a presence: if a second oscillator, a ring modulator or an
     * FM pair is ever authored on this box, this test should be revisited rather than silently
     * kept passing by a recipe that no longer needs the aliasing.
     */
    const everyName = new Set(device.recipes.flatMap(names))
    for (const absent of ['OSC 2 TYPE', 'RING MOD', 'FM AMOUNT', 'LPF FREQUENCY', 'LPF RESONANCE']) {
      expect(everyName, `${absent} is authored somewhere now`).not.toContain(absent)
    }

    const metallic = byId('deluge-metallic-bright')
    const ride = byId('deluge-ride-bright')
    const kick = byId('deluge-kick-hard')
    const amountOf = (r: Recipe, name: string) =>
      (r.params as { name: string; value?: number }[]).find((param) => param.name === name)
        ?.value as number

    // Both inharmonic recipes drive the control well past the kick, which uses the same one for
    // edge rather than for spectrum. That ordering is the claim.
    expect(amountOf(metallic, 'DECIMATION')).toBeGreaterThan(amountOf(kick, 'DECIMATION'))
    expect(amountOf(ride, 'DECIMATION')).toBeGreaterThan(amountOf(kick, 'DECIMATION'))
    // And the metallic drives it hardest, because the ride spends its budget on length instead.
    expect(amountOf(metallic, 'DECIMATION')).toBeGreaterThan(amountOf(ride, 'DECIMATION'))
    expect(amountOf(ride, 'ENV 1 DECAY')).toBeGreaterThan(amountOf(metallic, 'ENV 1 DECAY'))
    expect(amountOf(ride, 'ENV 1 RELEASE')).toBeGreaterThan(amountOf(metallic, 'ENV 1 RELEASE'))
  })

  it('uses no saturation, because p.217 says a kit row does not have it', () => {
    // "Saturation is not available at kit level", against decimation and bitcrush which are
    // "available at sound, kit and song level". All three of these are kit rows, so the whole
    // distortion vocabulary open to them is the two.
    for (const id of NEW) {
      expect(valueOf(byId(id), 'CLIP TYPE'), id).toBe('Kit')
      expect(names(byId(id)), id).not.toContain('SATURATION')
    }
    const everyName = new Set(device.recipes.flatMap(names))
    expect(everyName).not.toContain('SATURATION')
  })

  it('separates the tom from the kick by the two numbers that make it one', () => {
    /*
     * Both are a pitch envelope on a simple waveform, so what makes one a tom is where the pitch
     * starts and how long it takes to get down. Asserted as an ordering rather than as values, so
     * a later retune of either fails only if it makes them the same instrument.
     */
    const tom = byId('deluge-tom-dark')
    const kick = byId('deluge-kick-hard')
    const amountOf = (r: Recipe, name: string) =>
      (r.params as { name: string; value?: number }[]).find((param) => param.name === name)
        ?.value as number

    expect(amountOf(tom, 'ENV 2 → PITCH DEPTH')).toBeLessThan(
      amountOf(kick, 'ENV 2 → PITCH DEPTH'),
    )
    expect(amountOf(tom, 'ENV 2 DECAY')).toBeGreaterThan(amountOf(kick, 'ENV 2 DECAY'))
    expect(amountOf(tom, 'ENV 1 DECAY')).toBeGreaterThan(amountOf(kick, 'ENV 1 DECAY'))

    // p.125's reading, which both rely on and neither may drift from: 25 is the note itself.
    expect(amountOf(tom, 'ENV 2 SUSTAIN')).toBe(25)
    expect(amountOf(kick, 'ENV 2 SUSTAIN')).toBe(25)
  })

  it('prints all three on a rendered page, with the controls that make them', () => {
    // A parameter in a manifest is only an instruction if the guide prints it.
    for (const [templateId, expected] of [
      ['weave', 'DECIMATION'],
      ['ambient-dub', 'MOD FX TYPE'],
    ] as const) {
      const template = TEMPLATES.find((t) => t.id === templateId)
      expect(template, templateId).toBeDefined()
      const doc = renderGuide(
        resolve({
          devices: [device],
          template: template as (typeof TEMPLATES)[number],
          mood: moodState(),
          seed: 1,
        }),
      )
      expect(doc, `${templateId} prints ${expected}`).toContain(expected)
    }
  })
})
