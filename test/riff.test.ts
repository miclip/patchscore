import { describe, expect, it } from 'vitest'
import {
  ForbiddenDegreeSchema,
  RiffConstraintsSchema,
  RiffSchema,
  resolveHook,
  riffConstraintViolations,
  referenceSlug,
  type Riff,
} from '@/lib/core'
import { at, on, variant } from '@/lib/core'
import { ruleLines } from '@/lib/studio/riff-text'
import { DEVICES } from '@/lib/devices/registry.generated'
import {
  RIFFS,
  bladeRunnerBluesLead,
  blueMondayBass,
  museRunnerFloatingArrivalLead,
  riffById,
  thrillerSynthRiff,
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
  it('has three to six entries', () => {
    expect(RIFFS.length).toBeGreaterThanOrEqual(3)
    expect(RIFFS.length).toBeLessThanOrEqual(6)
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
