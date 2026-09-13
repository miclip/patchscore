import { describe, expect, it } from 'vitest'
import {
  ForbiddenDegreeSchema,
  RiffConstraintsSchema,
  RiffSchema,
  STEPS_PER_BAR,
  chordAtStep,
  resolveHook,
  riffConstraintViolations,
  referenceSlug,
  type HookNote,
  type Riff,
} from '@/lib/core'
import { at, on, variant } from '@/lib/core'
import { ruleLines } from '@/lib/studio/riff-text'
import { DEVICES } from '@/lib/devices/registry.generated'
import {
  RIFFS,
  aegeanOrganPhrygianFigure,
  bellbounceSparseBellPattern,
  bladeRunnerBluesLead,
  blueMondayBass,
  detroitFunkAeolianMachineLoop,
  hamamatsuTinesBalladFigure,
  moog55StringsSuspensionWriting,
  moogProSoloGlideLead,
  museRunnerFloatingArrivalLead,
  polyphonicPowerBrassStabCycle,
  riffById,
  seventiesElectroPnoRhodesTurnaround,
  softOrchestraSlowChanges,
  threeOscBassLoveRootOctaveFigure,
  thrillerSynthRiff,
  voxHumanaRigidColdPopLine,
} from '@/lib/riffs'

/**
 * §5A. The schema, and the library the schema exists to hold honest.
 *
 * Two halves, deliberately in one file: every rule below is a rule *about authored content*, and
 * a suite that checked the schema against fixtures and never against the four real entries would
 * pass on a library where all four broke the same rule.
 */

/** A riff that parses. Tests clone this and break one thing at a time (`test/fixtures.ts`' shape). */
function riff(over: Partial<Riff> = {}): Riff {
  return {
    id: 'fixture-riff',
    name: 'The fixture riff',
    reference: { kind: 'record', name: 'fixture' },
    technique: ['Play it.'],
    bpm: { min: 100, max: 140, default: 120 },
    key: 'A minor',
    request: {
      id: 'fixture-riff',
      role: 'bass-mid',
      priority: 1,
      character: 'hard',
      sustain: 'continuous',
      reArticulatesHook: true,
    },
    hook: {
      id: 'fixture-riff-hook',
      forRole: 'bass-mid',
      bars: 1,
      baseOctave: 2,
      notes: [{ step: 1, degree: 1, octave: 0, len: 16 }],
    },
    pattern: variant('fixture-riff-grid', 'bass-mid', 0, 16, at('accent', 110, 1), on('offbeat', 3)),
    ...over,
  }
}

/** The first message on a failed parse, which is what an author actually reads. */
function refusal(candidate: unknown): string {
  const parsed = RiffSchema.safeParse(candidate)
  expect(parsed.success, 'expected this riff to be refused').toBe(false)
  return parsed.success ? '' : (parsed.error.issues[0]?.message ?? '')
}

describe('RiffSchema (§5A)', () => {
  it('accepts the fixture', () => {
    expect(RiffSchema.safeParse(riff()).success).toBe(true)
  })

  it('is strict: an unknown field is a typo, not an extension', () => {
    expect(RiffSchema.safeParse({ ...riff(), sections: ['Drop'] }).success).toBe(false)
  })

  /**
   * §5A.5. **A reference is a record or a factory patch, and the checks are the same for both.**
   * The title has to carry the name and the id has to open with its slug whichever kind it is;
   * the kind changes nothing about where the reference is findable, only what it names.
   */
  it('parses a record reference (§5A.5)', () => {
    const parsed = RiffSchema.safeParse(riff({ reference: { kind: 'record', name: 'fixture' } }))
    expect(parsed.success).toBe(true)
  })

  it('parses a patch reference (§5A.5)', () => {
    const parsed = RiffSchema.safeParse(
      riff({
        id: 'fixture-patch-riff',
        name: 'The fixture patch riff',
        reference: { kind: 'patch', name: 'fixture patch' },
      }),
    )
    expect(parsed.success).toBe(true)
  })

  it('refuses a reference of a third kind: the idiom is not a reference (§5A.5)', () => {
    const idiom = { kind: 'idiom', name: 'fixture' } as unknown as Riff['reference']
    expect(RiffSchema.safeParse(riff({ reference: idiom })).success).toBe(false)
  })

  it('refuses an empty reference name (§5A.5)', () => {
    expect(RiffSchema.safeParse(riff({ reference: { kind: 'record', name: '' } })).success).toBe(
      false,
    )
  })

  it('refuses a title that does not name the reference (§5A.5)', () => {
    expect(refusal(riff({ name: 'The nameless riff' }))).toContain('must name')
    expect(
      refusal(
        riff({
          id: 'fixture-patch-riff',
          name: 'The nameless riff',
          reference: { kind: 'patch', name: 'fixture patch' },
        }),
      ),
    ).toContain('must name')
  })

  it('refuses an id that does not open with the reference’s slug (§5A.5)', () => {
    expect(refusal(riff({ id: 'some-other-riff' }))).toContain('must open with')
    expect(
      refusal(
        riff({
          id: 'some-other-riff',
          name: 'The fixture patch riff',
          reference: { kind: 'patch', name: 'fixture patch' },
        }),
      ),
    ).toContain('must open with')
  })

  it('slugifies a multi-word reference the way an address bar needs it', () => {
    expect(referenceSlug('Show Me Love')).toBe('show-me-love')
    expect(referenceSlug('Blue Monday')).toBe('blue-monday')
    expect(referenceSlug('Muse Runner')).toBe('muse-runner')
    // Punctuation collapses rather than surviving, and no leading or trailing separator is left.
    expect(referenceSlug("Ain't  Nobody!")).toBe('ain-t-nobody')
  })

  it('refuses a key the engine cannot read, because the hook has no second one', () => {
    expect(refusal(riff({ key: 'H minor' }))).toContain('not a key this engine reads')
  })

  it('refuses a transient request: a riff has no sections to occupy', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, sustain: 'transient', sections: ['Drop'] } })).toContain(
      'no sections',
    )
  })

  it('refuses a priority above 1, which would imply a part it does not have', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, priority: 2 } })).toContain('one part')
  })

  it('refuses `optional`/`inessential`: a riff is the part', () => {
    const r = riff()
    expect(
      refusal({
        ...r,
        request: { ...r.request, optional: true, inessential: { reason: 'nice to have' } },
      }),
    ).toContain('cannot also be one the piece does without')
  })

  it('refuses `distinct`: there is no second request to differ from', () => {
    const r = riff()
    expect(refusal({ ...r, request: { ...r.request, distinct: true } })).toContain('nothing for it')
  })

  it('refuses a `pitch` beside the hook — two authorities over one note (§4.1/#100)', () => {
    const r = riff()
    expect(
      refusal({ ...r, request: { ...r.request, pitch: { degree: 1, baseOctave: 2 } } }),
    ).toContain('cannot name another')
  })

  it('refuses `followsKey`, which would transpose an in-key hook twice', () => {
    const r = riff()
    // On a role that may legally follow the key, so the refusal is this schema's and not
    // `RoleRequestSchema`'s role check firing first.
    const kick = {
      ...r,
      request: { ...r.request, role: 'kick' as const, followsKey: true as const },
      hook: { ...r.hook, forRole: 'kick' as const },
      pattern: { ...r.pattern, forRole: 'kick' as const },
    }
    expect(refusal(kick)).toContain('transpose it twice')
  })

  it('requires `reArticulatesHook`: the grid places strikes inside the hook (§4.3)', () => {
    const r = riff()
    const { reArticulatesHook: _dropped, ...bare } = r.request
    expect(refusal({ ...r, request: bare })).toContain('re-articulates the hook')
  })

  it('refuses a role that is held rather than struck (invariant 5)', () => {
    const r = riff()
    const pad = {
      ...r,
      request: { ...r.request, role: 'pad' as const },
      hook: { ...r.hook, forRole: 'pad' as const },
      pattern: { ...r.pattern, forRole: 'pad' as const },
    }
    expect(refusal(pad)).toContain('no grid to riff on')
  })

  it('refuses a hook or a grid authored for another role', () => {
    const r = riff()
    expect(refusal({ ...r, hook: { ...r.hook, forRole: 'lead' } })).toContain('the hook is for')
    expect(refusal({ ...r, pattern: { ...r.pattern, forRole: 'lead' } })).toContain('the grid is for')
  })

  it('refuses a band above 0: there is no density here to select with (§6.3)', () => {
    const r = riff()
    expect(refusal({ ...r, pattern: { ...r.pattern, band: 2 } })).toContain('its band is 0')
  })

  it('refuses a variant scoped to sections, and an empty grid or hook', () => {
    const r = riff()
    expect(refusal({ ...r, pattern: { ...r.pattern, sections: ['Drop'] } })).toContain('no sections')
    expect(refusal({ ...r, pattern: { ...r.pattern, hits: [] } })).toContain('held note')
    expect(refusal({ ...r, hook: { ...r.hook, notes: [] } })).toContain('drum pattern')
  })

  it('refuses a riff with no technique prose', () => {
    expect(refusal(riff({ technique: [] }))).toContain('say what it is')
  })
})

describe('the riff library (§5A)', () => {
  /**
   * An exact pin, where this used to be a range. Six entries was the library's own headcount and
   * the range was a proxy for *not many*; #569 landed eleven at once, and a range wide enough to
   * hold seventeen would hold anything. The number is content: five records and the twelve
   * factory-patch definitions, and an entry added or dropped moves it and has to say so here.
   */
  it('has exactly seventeen entries: five records and twelve factory patches (#566, #569)', () => {
    expect(RIFFS.length).toBe(17)
    expect(RIFFS.filter((r) => r.reference.kind === 'record')).toHaveLength(5)
    expect(RIFFS.filter((r) => r.reference.kind === 'patch')).toHaveLength(12)
  })

  it('every entry parses', () => {
    for (const entry of RIFFS) {
      const parsed = RiffSchema.safeParse(entry)
      expect(parsed.success, `${entry.id}: ${parsed.success ? '' : parsed.error.message}`).toBe(true)
    }
  })

  it('ids are unique and the registry is in UTF-16 code unit order (§7.2)', () => {
    const ids = RIFFS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })

  it('`riffById` answers, and answers `undefined` for a stale link', () => {
    expect(riffById('blue-monday-bass')).toBe(blueMondayBass)
    expect(riffById('no-such-riff')).toBeUndefined()
  })

  it('carries the two entries the product is named for, titled as it titles them', () => {
    expect(blueMondayBass.id).toBe('blue-monday-bass')
    expect(blueMondayBass.name).toBe('The Blue Monday bass')
    expect(thrillerSynthRiff.id).toBe('thriller-synth-riff')
    expect(thrillerSynthRiff.name).toBe('The Thriller synth riff')
  })

  /**
   * §5A.5. **Every entry names what it is found by, in both the things a reader sees** — the
   * title on the page and the slug in the address bar.
   *
   * Asserted here as well as in the schema, and the two are not the same check. The schema refuses
   * an entry whose `reference` disagrees with its own id and title; this refuses a *library* where
   * an entry declared a reference nobody would recognise as a record or a patch — an empty one, a
   * bare role name, or a name that is really just the riff's own id typed twice.
   */
  it('every entry’s title and slug carry its reference', () => {
    for (const entry of RIFFS) {
      const { name } = entry.reference
      expect(name.trim(), entry.id).toBe(name)
      expect(name.length, entry.id).toBeGreaterThan(2)
      // The reference is a record or a patch, not the part. `Riff.request.role` is what the part
      // is.
      expect(name.toLowerCase(), entry.id).not.toBe(entry.request.role)
      // Both surfaces, which is the whole rule.
      expect(entry.name, `${entry.id} title`).toContain(name)
      expect(entry.id.startsWith(referenceSlug(name)), `${entry.id} slug`).toBe(true)
      // And the slug is a real prefix rather than the whole id: `blue-monday` alone would not say
      // which part of the record the page is about.
      expect(entry.id.length, `${entry.id} names no part`).toBeGreaterThan(
        referenceSlug(name).length,
      )
    }
  })

  it('no two entries share a reference', () => {
    const names = RIFFS.map((r) => `${r.reference.kind}:${r.reference.name}`)
    expect(new Set(names).size).toBe(names.length)
  })

  /**
   * **This asked for one role per entry, and it now allows a single deliberate pair.** The
   * original rule was a proxy for variety written when there were four entries and 23 roles: a
   * library of four bass lines would be four of the same page, and "no role twice" was the
   * cheapest thing that would catch it.
   *
   * `blade-runner-blues-lead` is a second `lead` and is not that. Thriller's lead is a figure
   * whose identity is *where it lands* — four pitches, all rhythm. This one is a figure whose
   * identity is *what is under it* — three notes in four bars, over a progression, with two of
   * them raised because the chord is borrowed. They are opposite lessons on one role, and a rule
   * that forbade the second would be the proxy outliving what it stood for.
   *
   * So the intent was asserted instead of the proxy, as *at most one repeat*. That outlived what
   * it stood for a second time when `muse-runner-floating-arrival-lead` arrived (#566): a third
   * `lead`, and again a different lesson, one late entry per chord over a cycle where the two tension
   * notes are the whole figure. The rule was never about a count of repeats. It was that a reader
   * opening the index should find parts of several kinds, and that no one role should be what
   * the library mostly is.
   *
   * So that is what is asserted: at least four distinct roles, and no role held by a strict
   * majority of the entries. Three leads in six is half and is allowed; a fourth would tip it.
   */
  it('spans at least four roles, and no role is a strict majority of the library', () => {
    const roles = RIFFS.map((r) => r.request.role)
    const distinct = new Set(roles)
    expect(distinct.size).toBeGreaterThanOrEqual(4)
    for (const role of distinct) {
      const count = roles.filter((r) => r === role).length
      expect(count * 2, `${role} is ${String(count)} of ${String(roles.length)}`).toBeLessThanOrEqual(
        roles.length,
      )
    }
  })

  /**
   * Invariant 3, enforced rather than reviewed. A riff that named a box would be the template
   * layer's one forbidden move made by a new content type, and it is the sort of thing that
   * arrives in prose rather than in a field — so the prose is what is scanned.
   *
   * **The reference is the one string exempt, and only where it sits in the title** (§5A.5,
   * #566). A factory patch is named by the manufacturer, and *Muse Runner* carries the box's own
   * name inside it. The reference names the preset and not the box, and the title is where §5A.5
   * requires it verbatim, so scanning it there would refuse the entry the relaxation exists for.
   * Everything else stays scanned: the rest of the title, and every paragraph of technique, so a
   * box named in prose is still caught.
   */
  it('names no device, anywhere a reader can see', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      const title = entry.name.replace(entry.reference.name, '')
      const ink = [title, ...entry.technique].join('\n')
      for (const name of names) {
        expect(ink.includes(name), `${entry.id} names ${name}`).toBe(false)
      }
    }
  })

  /**
   * The other half of that exemption, and the reason it is safe to make.
   *
   * The scan above skips `reference.name` where it sits in the title, so a reference that *is* a
   * device name would carry one onto the page through the one string nothing reads. `Muse Runner`
   * is a preset the manufacturer named and passes; a bare `Muse` is the box, and an entry titled
   * *The Muse lead* would put it in front of a reader with the scan looking the other way.
   *
   * Containment is what the exemption is for, so this asks for equality rather than substring:
   * the reference may carry a box's name inside a longer preset name, and may not be one.
   */
  it('no reference is a device by itself (invariant 3)', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      for (const name of names) {
        expect(entry.reference.name, `${entry.id} is named for a box`).not.toBe(name)
      }
    }
  })

  /**
   * The rule the Blue Monday entry exists to demonstrate: **the reference is how a reader finds
   * the technique, and the notes are ours.**
   *
   * A test cannot prove a figure is original, and this does not claim to. What it pins is the two
   * things that would make a transcription *possible* to slip in unnoticed — a figure long enough
   * to be one, and prose that presents itself as one — so a future edit that turned an entry into
   * a copy has to argue with a test rather than pass quietly.
   */
  it('carries a figure of its own rather than a transcription', () => {
    for (const entry of RIFFS) {
      // A riff is a figure, not a part: four bars is already the longest §4.3 can express.
      expect(entry.hook.bars, entry.id).toBeLessThanOrEqual(4)
      const ink = entry.technique.join('\n').toLowerCase()
      for (const word of ['transcri', 'note-for-note', 'exactly as played', 'as recorded']) {
        expect(ink.includes(word), `${entry.id} claims to reproduce a recording`).toBe(false)
      }
    }
  })

  it('the technique is prose, not a jog: hints are under ~8 words, these are not', () => {
    for (const entry of RIFFS) {
      for (const paragraph of entry.technique) {
        expect(paragraph.split(' ').length, `${entry.id}`).toBeGreaterThan(8)
      }
    }
  })
})

/**
 * §5A/§4.1. **The one entry with chords of its own**, and the two things that make it that are
 * the same thing: a melody that follows a progression prints altered degrees, and an altered
 * degree is unreadable without the chord it belongs to.
 */
describe('the Blade Runner Blues lead (§5A/§4.1)', () => {
  it('teaches the two borrowed chords out of a six-chord cycle', () => {
    const harmony = bladeRunnerBluesLead.harmony
    if (harmony === undefined) throw new Error('the entry carries no harmony')
    expect(harmony.cycleBars).toBe(12)
    expect(harmony.progression.map((p) => p.degree)).toEqual(['i', 'VI', 'iv', 'I', 'IV', 'v'])
    // Four bars of figure inside a twelve-bar cycle, which is the point of carrying both: the
    // grid caps at 64 steps, so a riff cannot span this progression and does not pretend to.
    expect(bladeRunnerBluesLead.hook.bars).toBe(4)
    expect(harmony.progression.every((p) => p.bars === 2)).toBe(true)
  })

  it('raises both thirds, and only those', () => {
    const notes = bladeRunnerBluesLead.hook.notes
    expect(notes.map((n) => n.alter)).toEqual([1, 1, undefined])
    // Degrees 3 and 6 of F# minor are A and D; raised they are the major thirds of the `I` and
    // the `IV` those two bars sit on. The third note is unaltered and is the tonic.
    expect(notes.map((n) => n.degree)).toEqual([3, 6, 1])
  })

  it('spells them as chord tones, which is what says they are not passing notes', () => {
    const resolved = resolveHook(bladeRunnerBluesLead.hook, bladeRunnerBluesLead.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    // `A#` is the third of F# major and `D#` the third of B. A reader shown `Bb` and `Eb` would
    // be being taught chromaticism instead — the reason `alter` displaces a degree (§4.1).
    expect(resolved.hook.notes.map((n) => n.note)).toEqual(['A#4', 'D#5', 'F#5'])
  })

  it('strikes every note once and nothing else, so the grid does not re-articulate a hold', () => {
    // `RIFF_GRID_LEAD` promises every step strikes the note in force at that point, so a hit the
    // hook has no onset for would re-strike a note this technique holds through.
    const onsets = bladeRunnerBluesLead.hook.notes.map((n) => n.step)
    expect(bladeRunnerBluesLead.pattern.hits.map((h) => h.step)).toEqual(onsets)
  })
})

/**
 * §5A/#552. **The figure checked against the chords it is actually over**, which is the class of
 * defect that shipped: a four-bar figure printed under a twelve-bar table with nothing saying
 * where it starts, so the raised third read as sitting over the minor chord.
 *
 * These are alignment tests rather than content tests. They would each have failed the first
 * published version, and they fail again the moment `figureStartsAtBar`, the note steps or the
 * progression move apart.
 */
describe('the Blade Runner Blues lead lines up with its chords (#552)', () => {
  const riff = bladeRunnerBluesLead
  const { harmony } = riff
  if (harmony === undefined) throw new Error('the entry carries no harmony')
  const cycle = harmony
  const STEPS_PER_BAR = 16

  /** The degree sounding at a figure step, resolved through the offset. */
  function chordAt(step: number): string {
    const cycleBar = (riff.figureStartsAtBar ?? 1) + Math.floor((step - 1) / STEPS_PER_BAR)
    let bar = 1
    for (const chord of cycle.progression) {
      if (cycleBar >= bar && cycleBar < bar + chord.bars) return chord.degree
      bar += chord.bars
    }
    throw new Error(`step ${String(step)} falls outside the cycle`)
  }

  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
  const notes = resolved.hook.notes

  it('puts every note over the chord it was written for', () => {
    // The two raised notes are the major thirds of the two borrowed chords. Over anything else
    // they are the wrong note, and over the `i` a raised third is the collision this figure is
    // about avoiding.
    expect(notes.map((n) => [n.note, chordAt(n.step)])).toEqual([
      ['A#4', 'I'],
      ['D#5', 'IV'],
      ['F#5', 'IV'],
    ])
  })

  it('never sounds the key’s own third under the I, or its sixth under the IV', () => {
    // Checked across each note's whole span rather than at its onset: a note that holds into the
    // next chord is sounding over it, and the natural third against the raised one is the same
    // collision arriving a beat later.
    const FORBIDDEN: Record<string, string> = { I: 'A', IV: 'D' }
    for (const note of notes) {
      const pitchClass = note.note.replace(/[0-9-]/g, '')
      for (let step = note.step; step < note.step + note.len; step += 1) {
        if (step > riff.hook.bars * STEPS_PER_BAR) break
        expect(
          FORBIDDEN[chordAt(step)],
          `${note.note} sounding at step ${String(step)} over ${chordAt(step)}`,
        ).not.toBe(pitchClass)
      }
    }
  })

  it('enters every chord late, and never on the bar the chord starts', () => {
    // The technique's second paragraph, as an assertion. A note that is not the first of its
    // chord is a continuation and is exempt — it is not an entry.
    const seen = new Set<string>()
    for (const note of riff.hook.notes) {
      const degree = chordAt(note.step)
      if (seen.has(degree)) continue
      seen.add(degree)
      const offsetInBar = (note.step - 1) % STEPS_PER_BAR
      const barsIntoChord = Math.floor((note.step - 1) / STEPS_PER_BAR) % 2
      expect(
        barsIntoChord * STEPS_PER_BAR + offsetInBar,
        `${degree} is entered at step ${String(note.step)}`,
      ).toBeGreaterThanOrEqual(4)
    }
  })

  it('reconciles the bar arithmetic, so the table and the figure cannot drift apart', () => {
    const summed = cycle.progression.reduce((n, chord) => n + chord.bars, 0)
    expect(summed).toBe(cycle.cycleBars)
    const start = riff.figureStartsAtBar ?? 1
    expect(start + riff.hook.bars - 1).toBeLessThanOrEqual(cycle.cycleBars)
  })

  it('says two entries in prose and emits two entries plus one continuation', () => {
    // The published version said "both notes" over a list of three. The prose now distinguishes
    // an entry from a continuation, so the count it claims is a count this can check.
    const entries = new Set(riff.hook.notes.map((n) => chordAt(n.step)))
    expect(entries.size).toBe(2)
    expect(riff.hook.notes).toHaveLength(3)
    expect(riff.technique.some((p) => p.includes('The third note is not an entry'))).toBe(true)
  })
})

/**
 * §5A.5/#566. **The one entry named after a factory patch**, and the proof the relaxation carries
 * a real riff rather than a type change. Its shape is Blade Runner's, one late entry per chord entering
 * late and held past the change, over a cycle a riff's grid cannot span whole.
 */
describe('the Muse Runner floating-arrival lead (§5A.5/#566)', () => {
  const riff = museRunnerFloatingArrivalLead
  const { harmony } = riff
  if (harmony === undefined) throw new Error('the entry carries no harmony')
  const cycle = harmony
  const STEPS_PER_BAR = 16

  /** The degree sounding at a figure step, resolved through the offset. */
  function chordAt(step: number): string {
    const cycleBar = (riff.figureStartsAtBar ?? 1) + Math.floor((step - 1) / STEPS_PER_BAR)
    let bar = 1
    for (const chord of cycle.progression) {
      if (cycleBar >= bar && cycleBar < bar + chord.bars) return chord.degree
      bar += chord.bars
    }
    throw new Error(`step ${String(step)} falls outside the cycle`)
  }

  const resolved = resolveHook(riff.hook, riff.key)
  if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
  const notes = resolved.hook.notes

  it('is named after a patch, in the title and in the slug', () => {
    expect(riff.reference).toEqual({ kind: 'patch', name: 'Muse Runner' })
    expect(riff.name).toBe('The Muse Runner floating-arrival lead')
    expect(riff.id).toBe('muse-runner-floating-arrival-lead')
    expect(RiffSchema.safeParse(riff).success).toBe(true)
  })

  it('keeps the whole eight-bar cycle and teaches the middle pair', () => {
    expect(cycle.cycleBars).toBe(8)
    expect(cycle.progression.map((p) => p.degree)).toEqual(['i', 'VI', 'III', 'iv'])
    expect(cycle.progression.every((p) => p.bars === 2)).toBe(true)
    expect(riff.figureStartsAtBar).toBe(3)
    expect(riff.hook.bars).toBe(4)
  })

  it('resolves to E5, B4 and C5 in D minor', () => {
    // The raised sixth of D minor is `B`, the raised eleventh of the `III`. A hook that spelled it
    // `Cb` would be teaching a passing note (§4.1).
    expect(notes.map((n) => n.note)).toEqual(['E5', 'B4', 'C5'])
    expect(riff.hook.notes.map((n) => n.alter)).toEqual([undefined, 1, undefined])
  })

  it('keeps the pitch range the original definition asked for, which no field carries', () => {
    // The definition wrote `range: [58, 78]`: MIDI, Bb3 to F#5, and not a tempo. There is no
    // field for a pitch bound (§4.1 puts range policy outside the hook), so the figure keeps it
    // by construction and this is where that is checked.
    expect(notes.map((n) => n.midi)).toEqual([76, 71, 72])
    for (const note of notes) {
      expect(note.midi, note.note).toBeGreaterThanOrEqual(58)
      expect(note.midi, note.note).toBeLessThanOrEqual(78)
    }
    expect(riff.bpm).toEqual({ min: 58, max: 74, default: 66 })
  })

  it('puts the E over the VI and the B and C over the III', () => {
    expect(notes.map((n) => [n.note, chordAt(n.step)])).toEqual([
      ['E5', 'VI'],
      ['B4', 'III'],
      ['C5', 'III'],
    ])
  })

  it('enters each chord two beats late, and the rise off the B is a continuation', () => {
    expect(riff.constraints?.onsetOffset?.minSteps).toBe(8)
    expect(riff.hook.notes.map((n) => n.step)).toEqual([9, 41, 53])
    // Two chords, two entries, and a third note that is the same chord continued.
    const entries = new Set(riff.hook.notes.map((n) => chordAt(n.step)))
    expect(entries.size).toBe(2)
    expect(riff.technique.some((p) => p.includes('The third note continues the chord'))).toBe(true)
  })

  it('sustains the E into the III and the final C into the iv', () => {
    const [e, , c] = notes
    if (e === undefined || c === undefined) throw new Error('three notes expected')
    // `III` begins at figure step 33; the E is still sounding there.
    expect(e.step + e.len).toBeGreaterThan(33)
    // The figure ends at step 64 and bar 7 of the cycle is the `iv`; the C is still sounding.
    expect(c.step + c.len).toBeGreaterThan(64)
  })

  it('strikes every note once and nothing else, so the grid does not re-articulate a hold', () => {
    const onsets = riff.hook.notes.map((n) => n.step)
    expect(riff.pattern.hits.map((h) => h.step)).toEqual(onsets)
  })

  it('forbids Eb over the VI and Bb over the III, as data', () => {
    expect(riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])).toEqual([
      ['VI', 2, -1],
      ['III', 6, undefined],
    ])
    expect(riffConstraintViolations(riff)).toEqual([])
  })

  it('catches an Eb played over the VI, and refuses to parse it', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) =>
          n.step === 9 ? { step: 9, degree: 2, octave: 1, len: 26, alter: -1 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('Eb5 sounds over VI')
    expect(found[0]).toContain('natural fourth')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches a Bb played over the III, and refuses to parse it', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) =>
          n.step === 41 ? { step: 41, degree: 6, octave: 0, len: 12 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('Bb4 sounds over III')
    expect(found[0]).toContain('raised one it exists for')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches an entry on the change, which the offset forbids', () => {
    const broken: Riff = {
      ...riff,
      hook: {
        ...riff.hook,
        notes: riff.hook.notes.map((n) => (n.step === 41 ? { ...n, step: 33 } : n)),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('III is entered at step 33, 0 steps in')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })
})

/**
 * §5A/#554. **The rules, as data and as a gate.**
 *
 * #552 caught a figure whose prose forbade a collision while its notes had stopped keeping it, and
 * fixed it with checks written by hand for that one entry. These are the same checks driven off
 * the entry's own declared rules, so the next riff gets them for nothing and a broken one does not
 * parse.
 *
 * The two negative cases are the two defects that were actually reported, reconstructed.
 */
describe('riff constraints are checked, not described (#554)', () => {
  it('finds nothing wrong with any shipped entry', () => {
    for (const entry of RIFFS) {
      expect(riffConstraintViolations(entry), entry.id).toEqual([])
    }
  })

  it('catches the natural third over the borrowed chord, which is the reported collision', () => {
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      hook: {
        ...bladeRunnerBluesLead.hook,
        notes: bladeRunnerBluesLead.hook.notes.map((n) =>
          n.step === 9 ? { step: 9, degree: 3, octave: 0, len: 26 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('A4 sounds over I')
    // The author's own reason is carried into the failure, so it is actionable without opening
    // the manifest to find out what the rule was for.
    expect(found[0]).toContain('the turn collapsing')
    // And it is a build failure rather than a report.
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('catches an entry on the bar head, which is the timing the first version shipped', () => {
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      hook: {
        ...bladeRunnerBluesLead.hook,
        notes: bladeRunnerBluesLead.hook.notes.map((n) =>
          n.step === 37 ? { ...n, step: 33 } : n,
        ),
      },
    }
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('IV is entered at step 33, 0 steps in')
    expect(RiffSchema.safeParse(broken).success).toBe(false)
  })

  it('checks a held note across its whole span, not only where it starts', () => {
    // The collision arriving a beat late: legal at its onset, forbidden by the time it is still
    // sounding over the next chord. A rule checked at onset alone would pass this.
    const broken: Riff = {
      ...bladeRunnerBluesLead,
      constraints: {
        forbiddenDegrees: [
          { chord: 'IV', degree: 3, alter: 1, reason: 'invented for this test' },
        ],
      },
    }
    // `A#4` enters at step 9 over the `I` and is still sounding at step 33, where `IV` begins.
    const found = riffConstraintViolations(broken)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('A#4 sounds over IV')
  })

  it('refuses constraints that constrain nothing', () => {
    const empty = RiffConstraintsSchema.safeParse({})
    expect(empty.success).toBe(false)
    const noReason = ForbiddenDegreeSchema.safeParse({ chord: 'I', degree: 3, reason: '' })
    expect(noReason.success).toBe(false)
  })

  it('says the rules on the page, because a rule a reader cannot see is one they will break', () => {
    const lines = ruleLines(bladeRunnerBluesLead)
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      'Over I, never the 3rd — the natural third against the raised one is the turn collapsing.',
    )
    expect(lines[2]).toContain('Enter each chord at least 4 steps after it lands')
  })
})

/**
 * §5A.5/#569. **The eleven entries that followed Muse Runner**, translated from one set of
 * definitions, and the two things a table can hold about every one of them.
 *
 * The first is the rules. Each entry declares its constraints as data (#554), and the table
 * below says, per entry, which rules it declares, that the shipped notes keep them, and that
 * one note in the wrong place is caught and refused. The negative case is built by *adding* a
 * note that sounds the forbidden degree over its chord, so the entry's own notes are untouched
 * and the one violation reported is the one the table expected. The onset case moves the
 * entry's first note onto the chord's first step.
 *
 * The second is what the translation had to decide, listed per entry below the table: which
 * shapes the schema has no field for and the figure keeps by construction.
 */
type ConstraintCase = {
  riff: Riff
  /** `[chord, degree, alter]` for every `forbiddenDegrees` rule, in authored order. */
  rules: readonly (readonly [string, number, number | undefined])[]
  /** `onsetOffset.minSteps`, where the entry states one. */
  onset?: number
  /**
   * One added note per rule, in the same order, and the opening of the sentence it produces.
   * `over` moves the figure where a rule's chord is not under it as shipped.
   */
  breaks: readonly { note: HookNote; says: string; over?: Partial<Riff> }[]
  /** The first entry's step and the sentence moving it onto the chord's first step produces. */
  early?: { step: number; says: string }
}

const MUSE_ELEVEN: readonly ConstraintCase[] = [
  {
    riff: voxHumanaRigidColdPopLine,
    rules: [['V', 7, undefined]],
    breaks: [{ note: { step: 49, degree: 7, octave: -1, len: 8 }, says: 'G4 sounds over V' }],
  },
  {
    riff: hamamatsuTinesBalladFigure,
    rules: [['I', 4, undefined]],
    onset: 4,
    breaks: [{ note: { step: 5, degree: 4, octave: 1, len: 4 }, says: 'Ab5 sounds over I' }],
    early: { step: 5, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: seventiesElectroPnoRhodesTurnaround,
    rules: [['I', 4, undefined]],
    onset: 4,
    breaks: [{ note: { step: 5, degree: 4, octave: 1, len: 4 }, says: 'Bb5 sounds over I' }],
    early: { step: 5, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: moog55StringsSuspensionWriting,
    rules: [
      ['Isus2', 3, undefined],
      ['IVsus2', 6, undefined],
    ],
    onset: 8,
    breaks: [
      { note: { step: 9, degree: 3, octave: 1, len: 4 }, says: 'E5 sounds over Isus2' },
      { note: { step: 41, degree: 6, octave: 1, len: 4 }, says: 'A5 sounds over IVsus2' },
    ],
    early: { step: 9, says: 'Isus2 is entered at step 1, 0 steps in' },
  },
  {
    riff: detroitFunkAeolianMachineLoop,
    rules: [['i', 6, 1]],
    onset: 2,
    breaks: [
      { note: { step: 3, degree: 6, octave: 0, len: 4, alter: 1 }, says: 'A4 sounds over i' },
    ],
    early: { step: 3, says: 'i is entered at step 1, 0 steps in' },
  },
  {
    riff: aegeanOrganPhrygianFigure,
    rules: [
      ['i', 2, 1],
      ['II', 2, 1],
      ['vii', 2, 1],
    ],
    onset: 4,
    breaks: [
      { note: { step: 9, degree: 2, octave: 1, len: 4, alter: 1 }, says: 'E5 sounds over i' },
      // The `II` is bars 3-4 and the figure ships over bars 5-8, so the figure is moved to bar
      // 3 for this one: the rule holds wherever the figure sits.
      {
        note: { step: 9, degree: 2, octave: 1, len: 4, alter: 1 },
        says: 'E5 sounds over II',
        over: { figureStartsAtBar: 3 },
      },
      { note: { step: 41, degree: 2, octave: 1, len: 4, alter: 1 }, says: 'E5 sounds over vii' },
    ],
    early: { step: 9, says: 'i is entered at step 1, 0 steps in' },
  },
  {
    riff: threeOscBassLoveRootOctaveFigure,
    rules: [['VI', 5, undefined]],
    breaks: [{ note: { step: 17, degree: 5, octave: -1, len: 4 }, says: 'E1 sounds over VI' }],
  },
  {
    riff: bellbounceSparseBellPattern,
    rules: [['I', 4, undefined]],
    onset: 8,
    breaks: [{ note: { step: 9, degree: 4, octave: 0, len: 4 }, says: 'D6 sounds over I' }],
    early: { step: 9, says: 'I is entered at step 1, 0 steps in' },
  },
  {
    riff: softOrchestraSlowChanges,
    rules: [['V7sus4', 7, undefined]],
    breaks: [
      { note: { step: 41, degree: 7, octave: -1, len: 4 }, says: 'F4 sounds over V7sus4' },
    ],
  },
  {
    riff: polyphonicPowerBrassStabCycle,
    rules: [['IV7', 3, 1]],
    breaks: [
      { note: { step: 19, degree: 3, octave: 1, len: 4, alter: 1 }, says: 'A5 sounds over IV7' },
    ],
  },
]

/** The entry with one more note in its hook, and otherwise the same. */
function withNote(riff: Riff, note: HookNote, over: Partial<Riff> = {}): Riff {
  return { ...riff, ...over, hook: { ...riff.hook, notes: [...riff.hook.notes, note] } }
}

describe('the eleven factory-patch entries keep their rules as data (#569, #554)', () => {
  it('covers every patch entry but Muse Runner, which has its own suite', () => {
    const covered = new Set(MUSE_ELEVEN.map((c) => c.riff.id))
    covered.add(moogProSoloGlideLead.id)
    covered.add(museRunnerFloatingArrivalLead.id)
    const patches = RIFFS.filter((r) => r.reference.kind === 'patch').map((r) => r.id)
    expect([...covered].sort()).toEqual([...patches].sort())
  })

  it('the glide lead states no rule, so it carries no constraints at all', () => {
    // A `constraints` that constrains nothing is refused by the schema; absence is the honest
    // shape for an entry whose definition forbade no pitch and asked for no offset.
    expect(moogProSoloGlideLead.constraints).toBeUndefined()
  })

  for (const c of MUSE_ELEVEN) {
    describe(c.riff.id, () => {
      it('declares exactly the rules the table lists, and the page prints each one', () => {
        const declared = c.riff.constraints?.forbiddenDegrees?.map((f) => [f.chord, f.degree, f.alter])
        expect(declared).toEqual(c.rules.map((r) => [...r]))
        expect(c.riff.constraints?.onsetOffset?.minSteps).toBe(c.onset)
        expect(ruleLines(c.riff)).toHaveLength(c.rules.length + (c.onset === undefined ? 0 : 1))
      })

      it('keeps every rule as shipped, and parses', () => {
        expect(riffConstraintViolations(c.riff)).toEqual([])
        const parsed = RiffSchema.safeParse(c.riff)
        expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true)
      })

      it('every rule names a chord that is in the progression', () => {
        const chords = new Set(c.riff.harmony?.progression.map((p) => p.degree))
        for (const [chord] of c.rules) expect(chords.has(chord), chord).toBe(true)
      })

      for (const [i, b] of c.breaks.entries()) {
        it(`catches the forbidden ${c.rules[i]?.[0] ?? ''} note, and refuses to parse it`, () => {
          const broken = withNote(c.riff, b.note, b.over)
          const found = riffConstraintViolations(broken)
          expect(found).toHaveLength(1)
          expect(found[0]).toContain(b.says)
          // The author's reason is carried into the message (#554).
          expect(found[0]).toContain(c.riff.constraints?.forbiddenDegrees?.[i]?.reason ?? 'x')
          expect(RiffSchema.safeParse(broken).success).toBe(false)
        })
      }

      if (c.early !== undefined) {
        const early = c.early
        it('catches an entry on the chord change, which the offset forbids', () => {
          const broken: Riff = {
            ...c.riff,
            hook: {
              ...c.riff.hook,
              notes: c.riff.hook.notes.map((n) => (n.step === early.step ? { ...n, step: 1 } : n)),
            },
          }
          const found = riffConstraintViolations(broken)
          expect(found).toHaveLength(1)
          expect(found[0]).toContain(early.says)
          expect(RiffSchema.safeParse(broken).success).toBe(false)
        })
      }
    })
  }
})

/**
 * §5A.5/#569. **What the definitions asked for that no field carries**, kept by construction
 * and checked here: a register ceiling, a note count per bar, a never-on-a-beat grid, a line
 * with no overlaps, a sustain across a change. Each is the entry's technique in one assertion,
 * and each would let the prose drift from the notes if it were not written down.
 */
describe('the eleven keep what the schema cannot state (#569)', () => {
  /** The note in force at each step of the hook, or nothing. */
  function sounding(riff: Riff, step: number): HookNote[] {
    return riff.hook.notes.filter((n) => step >= n.step && step < n.step + n.len)
  }

  it('every entry asks for exactly as many simultaneous notes as its widest voicing', () => {
    for (const entry of RIFFS) {
      const atStep = new Map<number, number>()
      for (const n of entry.hook.notes) atStep.set(n.step, (atStep.get(n.step) ?? 0) + 1)
      const widest = Math.max(...atStep.values())
      expect(entry.request.polyphony ?? 1, entry.id).toBe(widest)
    }
  })

  it('every grid hit strikes a note that is in force at that step (RIFF_GRID_LEAD)', () => {
    for (const entry of RIFFS) {
      for (const hit of entry.pattern.hits) {
        expect(sounding(entry, hit.step).length, `${entry.id} step ${String(hit.step)}`).toBeGreaterThan(0)
      }
    }
  })

  it('the held lines strike each note once, at its onset, and nothing else', () => {
    for (const entry of [
      voxHumanaRigidColdPopLine,
      hamamatsuTinesBalladFigure,
      seventiesElectroPnoRhodesTurnaround,
      moog55StringsSuspensionWriting,
      aegeanOrganPhrygianFigure,
      moogProSoloGlideLead,
      softOrchestraSlowChanges,
    ]) {
      const onsets = [...new Set(entry.hook.notes.map((n) => n.step))]
      expect(entry.pattern.hits.map((h) => h.step), entry.id).toEqual(onsets)
    }
  })

  it('the cold-pop line lands every note on a beat and none across a bar line', () => {
    for (const n of voxHumanaRigidColdPopLine.hook.notes) {
      expect((n.step - 1) % 4, `step ${String(n.step)}`).toBe(0)
      const startsIn = Math.floor((n.step - 1) / STEPS_PER_BAR)
      const endsIn = Math.floor((n.step + n.len - 2) / STEPS_PER_BAR)
      expect(endsIn, `step ${String(n.step)} crosses a bar line`).toBe(startsIn)
    }
  })

  it('the ballad figure ends on a suspension held across the bar line', () => {
    const last = hamamatsuTinesBalladFigure.hook.notes.at(-1)
    if (last === undefined) throw new Error('no notes')
    expect(chordAtStep(hamamatsuTinesBalladFigure, last.step)).toBe('Vsus4')
    expect(last.step + last.len).toBeGreaterThan(64)
    // And the resolution is prose, because it lands on the next pass's first step: see the entry.
    expect(hamamatsuTinesBalladFigure.technique.some((p) => p.includes('after the bar line'))).toBe(true)
  })

  it('the turnaround lands the flat ninth late and resolves it down', () => {
    const resolved = resolveHook(seventiesElectroPnoRhodesTurnaround.hook, 'F major')
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    const overDominant = resolved.hook.notes.filter(
      (n) => chordAtStep(seventiesElectroPnoRhodesTurnaround, n.step) === 'VI7',
    )
    expect(overDominant.map((n) => [n.note, n.step])).toEqual([
      ['Eb5', 57],
      ['D5', 61],
    ])
  })

  it('the suspension writing resolves each suspension in the second bar of its chord', () => {
    const riff = moog55StringsSuspensionWriting
    // The resolved chords are bars 2 and 4, and the resolutions are the notes over them.
    const resolutions = riff.hook.notes.filter((n) => ['I', 'IV'].includes(chordAtStep(riff, n.step) ?? ''))
    expect(resolutions.map((n) => n.step)).toEqual([25, 57])
    // Both are steps: a second above the suspension they resolve.
    const [d, e, g, a] = riff.hook.notes.map((n) => n.degree)
    expect([e, a]).toEqual([(d ?? 0) + 1, (g ?? 0) + 1])
  })

  it('the machine loop never strikes on a beat, and enters every bar on the "and" of one', () => {
    const riff = detroitFunkAeolianMachineLoop
    for (const hit of riff.pattern.hits) {
      expect((hit.step - 1) % 4, `step ${String(hit.step)} is on a beat`).not.toBe(0)
    }
    expect([...new Set(riff.hook.notes.map((n) => n.step))]).toEqual([3, 19, 35, 51])
    // Three notes at every entry, and the ninth of the key's tonic on top of the first.
    for (const step of [3, 19, 35, 51]) expect(sounding(riff, step)).toHaveLength(3)
  })

  it('the Phrygian figure is in a mode the engine reads, and never sounds E', () => {
    const riff = aegeanOrganPhrygianFigure
    expect(riff.key).toBe('D phrygian')
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    expect(resolved.hook.notes.map((n) => n.note)).toEqual(['D5', 'Eb5', 'D5', 'Eb5', 'D5'])
    expect(riff.figureStartsAtBar).toBe(5)
    expect(riff.harmony?.progression.map((p) => p.degree)).toEqual(['i', 'II', 'i', 'vii'])
  })

  it('the glide lead never sounds two notes at once', () => {
    const notes = [...moogProSoloGlideLead.hook.notes].sort((a, b) => a.step - b.step)
    for (let i = 1; i < notes.length; i += 1) {
      const prev = notes[i - 1]
      const next = notes[i]
      if (prev === undefined || next === undefined) throw new Error('unreachable')
      expect(prev.step + prev.len, `step ${String(prev.step)} overlaps ${String(next.step)}`).toBeLessThanOrEqual(next.step)
    }
    // The passing flat five is the short one.
    const passing = moogProSoloGlideLead.hook.notes.find((n) => n.alter === -1)
    expect(passing?.len).toBe(2)
  })

  it('the bass figure stays below C3 and pumps every eighth', () => {
    const riff = threeOscBassLoveRootOctaveFigure
    const resolved = resolveHook(riff.hook, riff.key)
    if (resolved.outcome !== 'resolved') throw new Error(resolved.detail)
    for (const n of resolved.hook.notes) expect(n.midi, n.note).toBeLessThanOrEqual(48)
    expect(Math.max(...resolved.hook.notes.map((n) => n.midi))).toBe(45)
    expect(riff.pattern.hits.map((h) => h.step)).toEqual(
      Array.from({ length: 32 }, (_, i) => 2 * i + 1),
    )
    // Roots and octaves for three bars: every note in bars 1-3 is a root or its octave, except
    // the fifth in bar 3, and the walk-up is bar 4.
    const walk = riff.hook.notes.filter((n) => n.step > 48)
    expect(walk.map((n) => n.degree)).toEqual([7, 1, 2])
  })

  it('the bell pattern strikes at most twice a bar', () => {
    const riff = bellbounceSparseBellPattern
    for (let bar = 0; bar < riff.hook.bars; bar += 1) {
      const inBar = riff.pattern.hits.filter(
        (h) => h.step > bar * STEPS_PER_BAR && h.step <= (bar + 1) * STEPS_PER_BAR,
      )
      expect(inBar.length, `bar ${String(bar + 1)}`).toBeLessThanOrEqual(2)
      expect(inBar.length, `bar ${String(bar + 1)}`).toBeGreaterThan(0)
    }
    expect(riff.request.role).toBe('arp')
  })

  it('the slow changes sustain every note past the chord change under it', () => {
    const riff = softOrchestraSlowChanges
    expect(riff.figureStartsAtBar).toBe(5)
    const [d, c, g, fSharp] = riff.hook.notes
    if (d === undefined || c === undefined || g === undefined || fSharp === undefined) {
      throw new Error('four notes expected')
    }
    // The D opens the figure, tied from the chord before.
    expect(d.step).toBe(1)
    // The C is still sounding when the suspended dominant arrives at step 33.
    expect(c.step + c.len).toBeGreaterThan(33)
    // The F# is the raised seventh and runs past the figure.
    expect(fSharp.alter).toBe(1)
    expect(fSharp.step + fSharp.len).toBeGreaterThan(64)
    expect(chordAtStep(riff, g.step)).toBe('V7sus4')
  })

  it('the brass cycle stabs off the beat for three bars and lands the fourth on the downbeat', () => {
    const riff = polyphonicPowerBrassStabCycle
    const early = riff.pattern.hits.filter((h) => h.step <= 48)
    for (const hit of early) expect((hit.step - 1) % 4, `step ${String(hit.step)}`).not.toBe(0)
    expect(riff.pattern.hits.filter((h) => h.step > 48).map((h) => h.step)).toEqual([49])
    // Two notes per stab for three bars, one held note in the fourth.
    for (const step of [3, 19, 35]) expect(sounding(riff, step)).toHaveLength(2)
    expect(sounding(riff, 49)).toHaveLength(1)
    expect(sounding(riff, 64)).toHaveLength(1)
  })

  it('the two top-voice lines are leads, because a pad has no grid to riff on', () => {
    for (const entry of [moog55StringsSuspensionWriting, softOrchestraSlowChanges]) {
      expect(entry.request.role).toBe('lead')
      expect(entry.request.character).toBe('soft')
    }
  })
})
