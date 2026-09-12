import { describe, expect, it } from 'vitest'
import { RiffSchema, resolveHook, trackSlug, type Riff } from '@/lib/core'
import { at, on, variant } from '@/lib/core'
import { DEVICES } from '@/lib/devices/registry.generated'
import {
  RIFFS,
  bladeRunnerBluesLead,
  blueMondayBass,
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
    track: 'fixture',
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

  it('refuses a title that does not name the record (§5A.5)', () => {
    expect(refusal(riff({ name: 'The nameless riff' }))).toContain('must name')
  })

  it('refuses an id that does not open with the record’s slug (§5A.5)', () => {
    expect(refusal(riff({ id: 'some-other-riff' }))).toContain('must open with')
  })

  it('slugifies a multi-word title the way an address bar needs it', () => {
    expect(trackSlug('Show Me Love')).toBe('show-me-love')
    expect(trackSlug('Blue Monday')).toBe('blue-monday')
    // Punctuation collapses rather than surviving, and no leading or trailing separator is left.
    expect(trackSlug("Ain't  Nobody!")).toBe('ain-t-nobody')
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
  it('has three to five entries', () => {
    expect(RIFFS.length).toBeGreaterThanOrEqual(3)
    expect(RIFFS.length).toBeLessThanOrEqual(5)
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
   * §5A.5. **Every entry names the record it is found by, in both the things a reader sees** — the
   * title on the page and the slug in the address bar.
   *
   * Asserted here as well as in the schema, and the two are not the same check. The schema refuses
   * an entry whose `track` disagrees with its own id and title; this refuses a *library* where an
   * entry declared a reference nobody would recognise as a record — an empty one, a bare role
   * name, or a `track` that is really just the riff's own id typed twice.
   */
  it('every entry’s title and slug carry its track reference', () => {
    for (const entry of RIFFS) {
      expect(entry.track.trim(), entry.id).toBe(entry.track)
      expect(entry.track.length, entry.id).toBeGreaterThan(2)
      // The reference is a record, not the part. `Riff.request.role` is what the part is.
      expect(entry.track.toLowerCase(), entry.id).not.toBe(entry.request.role)
      // Both surfaces, which is the whole rule.
      expect(entry.name, `${entry.id} title`).toContain(entry.track)
      expect(entry.id.startsWith(trackSlug(entry.track)), `${entry.id} slug`).toBe(true)
      // And the slug is a real prefix rather than the whole id: `blue-monday` alone would not say
      // which part of the record the page is about.
      expect(entry.id.length, `${entry.id} names no part`).toBeGreaterThan(
        trackSlug(entry.track).length,
      )
    }
  })

  it('no two entries name the same record', () => {
    const tracks = RIFFS.map((r) => r.track)
    expect(new Set(tracks).size).toBe(tracks.length)
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
   * So the intent is asserted instead of the proxy: the library still has to spread across roles,
   * and **one** repeat is a comparison where three would be a rut.
   */
  it('spans roles, allowing at most one deliberate pair on the same role', () => {
    const roles = RIFFS.map((r) => r.request.role)
    const distinct = new Set(roles)
    expect(distinct.size).toBeGreaterThanOrEqual(4)
    expect(roles.length - distinct.size).toBeLessThanOrEqual(1)
  })

  /**
   * Invariant 3, enforced rather than reviewed. A riff that named a box would be the template
   * layer's one forbidden move made by a new content type, and it is the sort of thing that
   * arrives in prose rather than in a field — so the prose is what is scanned.
   */
  it('names no device, anywhere a reader can see', () => {
    const names = DEVICES.flatMap((d) => [d.id, d.name])
    for (const entry of RIFFS) {
      const ink = [entry.name, ...entry.technique].join('\n')
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
