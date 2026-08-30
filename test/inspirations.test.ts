import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DENSITY_BANDS,
  INSPIRATION_CAP,
  InspirationSchema,
  MOOD_AXES,
  PATTERN_SLOTS,
  ROLES,
  TemplateSchema,
  applyInspirations,
  at,
  moodState,
  on,
  resolve,
  slotKey,
  variant,
  type DensityBand,
  type Inspiration,
  type Pattern,
  type Role,
  type Template,
} from '../lib/core/index'
import { DEVICES, DEVICE_FOLDERS } from '../lib/devices/registry.generated'
import {
  INSPIRATIONS,
  dancehall,
  echo,
  inspirationById,
  ladder,
  reggae,
  shuffle,
} from '../lib/inspirations/index'
import {
  TEMPLATES,
  ambientDub,
  droneStudy,
  industrialTechno,
  majorKeyElectro,
  relay,
} from '../lib/templates/index'

/**
 * §5. Inspirations, the patch language, and the composition function.
 *
 * The subject of this file is the *rules*, proved against the real library rather than fixtures
 * wherever a real combination exercises the rule. Every diagnostic kind below is produced by a
 * pair a user can actually select — Shuffle lands on a template with no closed-hat, Reggae lands
 * on one that already programs its own stab — because a diagnostic only reachable from a fixture
 * is a diagnostic nobody has evidence a user will ever see.
 */

const INSPIRATION_DIR = join(import.meta.dirname, '..', 'lib', 'inspirations')

/** §7.2: compare by code unit, never by locale — `localeCompare` would reorder these on CI. */
function byCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Both ids of a pair, for a failure message that says which pair failed. */
function name2(pair: Inspiration[]): string {
  return pair.map((i) => i.id).join(' + ')
}
const MOOD = moodState()

function applied(template: Template, inspirations: Inspiration[]) {
  const result = applyInspirations(template, inspirations)
  if (result.outcome !== 'applied') {
    throw new Error(`expected an application, got ${result.reason}: ${result.detail}`)
  }
  return result
}

/**
 * Every selection a person can actually make: nothing, any one influence, and every pair that
 * does not refuse each other.
 *
 * Derived rather than listed, and the derivation is itself pinned below. A hand-written list of
 * pairs was fine at three influences and is a staleness trap at five — the sweeps that use it
 * would keep passing while quietly covering fewer and fewer of the combinations a user can reach.
 * Conflict is a property of the *pair* (it is computed from what each one claims, before any
 * template is consulted), so probing it against one template answers for all of them.
 */
function legalSelections(): Inspiration[][] {
  const out: Inspiration[][] = [[]]
  for (const [i, a] of INSPIRATIONS.entries()) {
    out.push([a])
    for (const b of INSPIRATIONS.slice(i + 1)) {
      if (applyInspirations(industrialTechno, [a, b]).outcome === 'applied') out.push([a, b])
    }
  }
  return out
}

const LEGAL_SELECTIONS = legalSelections()

/** The pairs only, for the sweeps that have nothing to say about a single influence. */
const LEGAL_PAIRS = LEGAL_SELECTIONS.filter((s) => s.length === 2)

function refused(template: Template, inspirations: Inspiration[]) {
  const result = applyInspirations(template, inspirations)
  if (result.outcome !== 'refused') throw new Error('expected a refusal')
  return result
}

function patternsFor(template: Template, role: Role): Pattern[] {
  return template.patterns.filter((p) => p.forRole === role)
}

/** Every `(role, band)` an inspiration claims, by addition or by replacement. */
function claimedSlots(inspiration: Inspiration): Set<string> {
  const patch = inspiration.patch
  return new Set(
    [...(patch.addPatterns ?? []), ...(patch.replacePatterns ?? [])].map((p) =>
      slotKey(p.forRole, p.band),
    ),
  )
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

describe('the inspiration registry (§5)', () => {
  it('holds five, in id order, each parsing and reachable by id', () => {
    expect(INSPIRATIONS.map((i) => i.id)).toEqual([
      'dancehall',
      'echo',
      'ladder',
      'reggae',
      'shuffle',
    ])
    for (const inspiration of INSPIRATIONS) {
      const parsed = InspirationSchema.safeParse(inspiration)
      expect(parsed.error?.issues ?? [], `${inspiration.id} failed InspirationSchema`).toEqual([])
    }
    expect(inspirationById('reggae')).toBe(reggae)
    expect(inspirationById('no-such-influence')).toBeUndefined()
  })

  it('knows exactly which pairs compose and which refuse, and it is not all of one', () => {
    // The derivation `LEGAL_SELECTIONS` rests on, pinned so that adding a sixth influence has
    // to be looked at rather than merely absorbed. Three of the five claim `bass-mid` — it is
    // where an influence makes its strongest melodic claim — so those three refuse each other,
    // and Dancehall and Reggae still refuse over the kick. Everything else composes.
    const name = (pair: Inspiration[]) => pair.map((i) => i.id).join(' + ')
    expect(LEGAL_PAIRS.map(name)).toEqual([
      'dancehall + echo',
      'dancehall + ladder',
      'dancehall + shuffle',
      'echo + shuffle',
      'ladder + shuffle',
      'reggae + shuffle',
    ])
    const refusing: string[] = []
    for (const [i, a] of INSPIRATIONS.entries()) {
      for (const b of INSPIRATIONS.slice(i + 1)) {
        if (applyInspirations(industrialTechno, [a, b]).outcome === 'refused') {
          refusing.push(name([a, b]))
        }
      }
    }
    expect(refusing).toEqual([
      'dancehall + reggae',
      'echo + ladder',
      'echo + reggae',
      'ladder + reggae',
    ])
  })

  it('refuses the bass three by name, and picks no winner among them', () => {
    for (const pair of [
      [echo, ladder],
      [echo, reggae],
      [ladder, reggae],
    ]) {
      const result = refused(industrialTechno, pair)
      expect(result.reason, name2(pair)).toBe('conflict')
      expect(
        result.conflicts.map((c) => [c.role, c.band]),
        name2(pair),
      ).toEqual([
        ['bass-mid', 0],
        ['bass-mid', 1],
        ['bass-mid', 2],
        ['bass-mid', 3],
      ])
      expect(result.detail, name2(pair)).toContain('bass-mid at band 0')
      // Order changes nothing: a refusal, never a silent preference for whoever sorted first.
      expect(refused(industrialTechno, [...pair].reverse())).toEqual(result)
    }
  })

  it('ships a pair that composes as well as a pair that cannot', () => {
    // A library where everything claims the kick could only ever demonstrate the refusal.
    expect(applyInspirations(industrialTechno, [reggae, shuffle]).outcome).toBe('applied')
    expect(applyInspirations(industrialTechno, [reggae, dancehall]).outcome).toBe('refused')
  })

  it('authors all four bands of any role it touches', () => {
    // Not a schema rule — replacing only band 3 is legal and might even be what someone means.
    // It is a rule *this library* keeps, because a half-replaced role plays the inspiration in
    // the loud sections and the template in the quiet ones, which reads as a bug either way.
    for (const inspiration of INSPIRATIONS) {
      const byRole = new Map<Role, Set<DensityBand>>()
      for (const p of [
        ...(inspiration.patch.addPatterns ?? []),
        ...(inspiration.patch.replacePatterns ?? []),
      ]) {
        byRole.set(p.forRole, (byRole.get(p.forRole) ?? new Set()).add(p.band))
      }
      expect(byRole.size, `${inspiration.id} touches no role`).toBeGreaterThan(0)
      for (const [role, bands] of byRole) {
        expect([...bands].sort(), `${inspiration.id}: '${role}'`).toEqual([...DENSITY_BANDS])
      }
    }
  })

  it('keeps the pattern hygiene the templates keep (§4.3)', () => {
    // These variants land in a real guide beside the template's own, so the same conventions
    // apply: one hit per step, ghosts quiet, accents loud, at most one accent to lean on.
    for (const inspiration of INSPIRATIONS) {
      for (const pattern of [
        ...(inspiration.patch.addPatterns ?? []),
        ...(inspiration.patch.replacePatterns ?? []),
      ]) {
        const steps = pattern.hits.map((h) => h.step)
        expect(new Set(steps).size, `${pattern.id} hits a step twice`).toBe(steps.length)
        expect(steps, `${pattern.id} is not in step order`).toEqual([...steps].sort((a, b) => a - b))
        expect(
          pattern.hits.filter((h) => h.slot === 'accent').length,
          `${pattern.id} accents`,
        ).toBeLessThanOrEqual(1)
        for (const hit of pattern.hits) {
          if (hit.slot === 'ghost') expect(hit.velocity as number, pattern.id).toBeLessThanOrEqual(64)
          if (hit.slot === 'accent')
            expect(hit.velocity as number, pattern.id).toBeGreaterThanOrEqual(100)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// What the library actually reaches — direction by direction
// ---------------------------------------------------------------------------

/** Every `(role, band)` an inspiration replaces that this template authored something at. */
function landedReplacements(template: Template, inspiration: Inspiration): string[] {
  const result = applied(template, [inspiration])
  return (inspiration.patch.replacePatterns ?? [])
    .filter((p) => result.template.patterns.some((q) => q.id === p.id))
    .map((p) => slotKey(p.forRole, p.band))
    .sort(byCodeUnit)
}

/** Every band of one role, as `landedReplacements` spells it. */
function everyBandOf(role: Role): string[] {
  return [...DENSITY_BANDS].map((band) => slotKey(role, band)).sort(byCodeUnit)
}

describe('every direction has an influence that lands on its own material (§5.1)', () => {
  /**
   * The gap this half of the library was authored to close, kept as a test rather than as a
   * memory of one measurement.
   *
   * An influence that only *adds* a part is not nothing, but it is not an influence on the
   * direction either — it is a sidestick bolted to the side of something that was already
   * finished. Before Echo and Ladder, Drone Study was in exactly that position: its one role is
   * `texture`, no influence in the library claimed `texture`, and all three could do to it was
   * hang an unrequested percussion part off a piece that asks for a single sustained note.
   */
  it('replaces something the direction already programs, for every direction', () => {
    for (const template of TEMPLATES) {
      const reaching = INSPIRATIONS.filter((i) => landedReplacements(template, i).length > 0)
      expect(reaching.map((i) => i.id), template.id).not.toEqual([])
    }
  })

  it('gives the one-part sustained direction an influence on the part it has', () => {
    // Drone Study asks for `texture` and nothing else, so an influence that misses `texture`
    // misses the direction entirely. Echo takes all four bands of it.
    expect(landedReplacements(droneStudy, echo)).toEqual(everyBandOf('texture'))
    const others = INSPIRATIONS.filter((i) => i.id !== 'echo')
    for (const other of others) {
      expect(landedReplacements(droneStudy, other), other.id).toEqual([])
    }
  })

  it('gives the two-part melodic direction an influence on both of its parts', () => {
    // Relay's `lead` was the one patterned role in the registry that no influence claimed, and
    // its `bass-mid` had a single option. Ladder takes both, whole.
    expect(landedReplacements(relay, ladder)).toEqual([
      ...everyBandOf('bass-mid'),
      ...everyBandOf('lead'),
    ])
    // ...and nothing about it went unhonoured on the way: every claim Ladder makes, Relay has.
    expect(applied(relay, [ladder]).diagnostics).toEqual([])
    // Echo reaches the same direction by the other half of its claim, so `bass-mid` now has two.
    expect(landedReplacements(relay, echo)).toEqual(everyBandOf('bass-mid'))
    expect(landedReplacements(relay, reggae)).toEqual(everyBandOf('bass-mid'))
  })

  it('leaves the tempo and the part list alone, because a technique is neither', () => {
    // Reggae and Dancehall carry a BPM shift because the tempo is half of what those words
    // mean. Echo and Ladder are ways of playing, so a shift here would be an extra opinion
    // arriving unannounced — and neither adds a part, which is the other half of the same claim.
    for (const technique of [echo, ladder]) {
      expect(technique.patch.bpm, technique.id).toBeUndefined()
      expect(technique.patch.addRoles, technique.id).toBeUndefined()
      expect(technique.patch.addPatterns, technique.id).toBeUndefined()
      expect(applied(relay, [technique]).template.bpm, technique.id).toEqual(relay.bpm)
    }
  })
})

// ---------------------------------------------------------------------------
// §5's boundary — an inspiration names no template, and no device
// ---------------------------------------------------------------------------

/**
 * Invariant 3 one layer up. A template must not name a device; an inspiration must not name a
 * template. Both checks are here because an inspiration sits above both layers and may name
 * neither: the shared vocabulary is the whole of what it is allowed to say.
 */
const SHARED_VOCABULARY = new Set(
  [...ROLES, ...CHARACTERS, ...MOOD_AXES, ...PATTERN_SLOTS].flatMap((w) => w.split('-')),
)

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Every identifier an inspiration authors — the strings that must be machine-clean. */
function identifiers(inspiration: Inspiration): string[] {
  const patch = inspiration.patch
  return [
    inspiration.id,
    inspiration.name,
    ...(patch.addRoles ?? []).map((r) => r.id),
    ...[...(patch.addPatterns ?? []), ...(patch.replacePatterns ?? [])].map((p) => p.id),
  ]
}

function allStrings(inspiration: Inspiration): string[] {
  return [...identifiers(inspiration), ...(inspiration.patch.notes ?? [])]
}

describe('an inspiration names neither a template nor a device (§5, invariant 3)', () => {
  /**
   * Template-internal words, minus the shared vocabulary. Tokens shorter than three characters
   * are dropped: the `it-` prefix on Industrial Techno's pattern ids tokenises to `it`, and
   * forbidding the English word "it" in prose would be a rule about grammar rather than about
   * layering. The substring check below covers the ids those fragments came from, whole.
   */
  const templateWords = new Set<string>()
  const templateIds: string[] = []
  for (const template of TEMPLATES) {
    const strings = [
      template.id,
      template.name,
      ...template.keys,
      ...template.structure.map((s) => s.name),
      ...template.roles.map((r) => r.id),
      ...template.patterns.map((p) => p.id),
      ...template.hooks.map((h) => h.id),
    ]
    templateIds.push(
      template.id,
      template.name,
      ...template.structure.map((s) => s.name),
      ...template.patterns.map((p) => p.id),
      ...template.hooks.map((h) => h.id),
    )
    for (const text of strings) {
      for (const token of tokens(text)) {
        if (token.length < 3 || /^[0-9]+$/.test(token)) continue
        if (!SHARED_VOCABULARY.has(token)) templateWords.add(token)
      }
    }
  }

  it('uses no word that comes from a template', () => {
    const breaches: string[] = []
    for (const inspiration of INSPIRATIONS) {
      for (const text of allStrings(inspiration)) {
        for (const token of tokens(text)) {
          if (templateWords.has(token)) breaches.push(`${inspiration.id}: '${text}' -> '${token}'`)
        }
      }
    }
    expect(breaches).toEqual([])
  })

  it('contains no template id, name, section or pattern id as a substring', () => {
    for (const inspiration of INSPIRATIONS) {
      const haystack = JSON.stringify(inspiration).toLowerCase()
      for (const needle of templateIds) {
        expect(haystack, `${inspiration.id} mentions ${needle}`).not.toContain(needle.toLowerCase())
      }
    }
  })

  it('uses no device word in anything a machine reads, and no device name anywhere', () => {
    // Two checks rather than one, for a reason worth writing down: an inspiration carries
    // *prose*, and the device vocabulary contains `in` and `of` (they are device parameter
    // words). Token-checking prose against that set would forbid English. So identifiers get
    // the full token check, and prose gets the substring check for the names that identify an
    // actual box — which is what "never names a device" is really about.
    const deviceWords = new Set<string>()
    const deviceNames: string[] = [...DEVICE_FOLDERS]
    /**
     * Musical terms a box happens to silkscreen, which are not thereby device words.
     *
     * `shuffle` arrived here when the TR-1000 authored its pattern `SHUFFLE` parameter (#62).
     * It is a generic musical synonym for the shared `swing` concept — `swing` is a `MoodAxis`
     * and therefore already exempt through `SHARED_VOCABULARY`, and the word for the same idea
     * should not be forbidden merely because one manifest spells it the way its panel does.
     * The inspiration named `shuffle` is named after a *feel*, and it named no device before
     * that parameter existed or after it. Invariant 3 is about layering: what it forbids is an
     * inspiration reaching for something only one box has.
     *
     * `swing` needs no entry: it is a `MoodAxis`, so the shared vocabulary already exempts it.
     * Keep this list to words that are genuinely generic; a device-specific one belongs on the
     * device, and an inspiration reaching for it is the bug this test exists to catch.
     */
    const MUSICAL_TERMS = new Set(['shuffle'])
    for (const device of DEVICES) {
      deviceNames.push(device.id, device.name, device.maker)
      const words = [
        device.id,
        device.name,
        device.maker,
        device.kind,
        ...device.voices.map((v) => v.label),
        ...device.recipes.flatMap((r) => [r.id, ...r.params.map((p) => p.name)]),
      ]
      for (const word of words) {
        for (const token of tokens(word)) {
          if (token.length === 1 || /^[0-9]+$/.test(token)) continue
          if (!SHARED_VOCABULARY.has(token) && !MUSICAL_TERMS.has(token)) deviceWords.add(token)
        }
      }
    }

    for (const inspiration of INSPIRATIONS) {
      for (const text of identifiers(inspiration)) {
        for (const token of tokens(text)) {
          expect(deviceWords.has(token), `${inspiration.id}: '${text}' -> '${token}'`).toBe(false)
        }
      }
      const haystack = JSON.stringify(inspiration).toLowerCase()
      for (const needle of deviceNames) {
        expect(haystack, `${inspiration.id} mentions ${needle}`).not.toContain(needle.toLowerCase())
      }
    }
  })

  it('imports nothing from lib/templates or lib/devices', () => {
    const sources = readdirSync(INSPIRATION_DIR).filter((f) => f.endsWith('.ts'))
    expect(sources.length).toBeGreaterThan(0)
    for (const file of sources) {
      const src = readFileSync(join(INSPIRATION_DIR, file), 'utf8')
      for (const match of src.matchAll(/from\s+'([^']+)'/g)) {
        const spec = match[1] as string
        expect(spec, `${file} imports ${spec}`).not.toMatch(/devices|templates/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The schema rules that keep it template-agnostic
// ---------------------------------------------------------------------------

describe('the patch language refuses what would name a template (§5)', () => {
  const base: Inspiration = { id: 'fixture', name: 'Fixture', patch: {} }

  function rejects(patch: Inspiration['patch'], expected: RegExp) {
    const parsed = InspirationSchema.safeParse({ ...base, patch })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((i) => i.message).join(' | ')).toMatch(expected)
  }

  it('refuses a transient added request, because transience names sections', () => {
    rejects(
      {
        addRoles: [
          {
            id: 'fixture-r-riser',
            role: 'riser',
            priority: 3,
            character: 'bright',
            sustain: 'transient',
            sections: ['Drop'],
          },
        ],
      },
      /only add continuous requests/,
    )
  })

  it('refuses a pattern scoped to sections', () => {
    rejects(
      {
        replacePatterns: [
          { ...variant('fixture-kick-b0', 'kick', 0, 16, on('downbeat', 1)), sections: ['Drop'] },
        ],
      },
      /may not name sections/,
    )
  })

  it('refuses an id that is not its own, which is what stops it colliding with a template', () => {
    rejects(
      { replacePatterns: [variant('it-kick-b0', 'kick', 0, 16, on('downbeat', 1))] },
      /must begin with 'fixture-'/,
    )
    rejects(
      {
        addRoles: [
          { id: 'r-kick', role: 'kick', priority: 1, character: 'hard', sustain: 'continuous' },
        ],
      },
      /must begin with 'fixture-'/,
    )
  })

  it('refuses adding and replacing the same (role, band) in one breath', () => {
    rejects(
      {
        addPatterns: [variant('fixture-kick-b2', 'kick', 2, 16, on('downbeat', 1))],
        replacePatterns: [variant('fixture-kick-b2-alt', 'kick', 2, 16, on('downbeat', 9))],
      },
      /both added and replaced/,
    )
  })
})

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

describe('applying one inspiration (§5)', () => {
  it('takes the (role, band) it claims, rather than joining the pool there', () => {
    const result = applied(industrialTechno, [reggae])
    const kicks = patternsFor(result.template, 'kick')
    // Every band of the kick is reggae's, and none of the template's survives at any band.
    expect(kicks.map((p) => p.id).sort()).toEqual([
      'reggae-kick-b0',
      'reggae-kick-b1',
      'reggae-kick-b2',
      'reggae-kick-b3',
    ])
    expect(result.template.patterns.some((p) => p.id.startsWith('it-kick-'))).toBe(false)
    // ...and nothing it did not claim was touched.
    expect(patternsFor(result.template, 'closed-hat').map((p) => p.id)).toEqual(
      patternsFor(industrialTechno, 'closed-hat').map((p) => p.id),
    )
  })

  it('shifts the tempo range as a whole, keeping the default inside it', () => {
    const result = applied(industrialTechno, [reggae])
    expect(result.template.bpm).toEqual({ min: 90, max: 102, default: 94 })
    expect(industrialTechno.bpm).toEqual({ min: 130, max: 142, default: 134 })
  })

  it('adds a whole part where the template has none, and carries its prose', () => {
    // Ambient Dub asks for no `stab`, so reggae's skank arrives complete: request and variants.
    const result = applied(ambientDub, [reggae])
    expect(result.template.roles.map((r) => r.id)).toContain('reggae-r-skank')
    expect(patternsFor(result.template, 'stab')).toHaveLength(4)
    expect(result.notes.map((n) => n.inspirationId)).toEqual(['reggae', 'reggae', 'reggae'])
    expect(result.notes[0]?.name).toBe('Reggae')
    expect(result.diagnostics).toEqual([])
  })

  it('resolves against a real rig once applied (§7)', () => {
    // The point of the whole exercise: the effective template is a template, and the resolver
    // neither knows nor cares that it was patched.
    const result = applied(ambientDub, [reggae])
    const resolved = resolve({ devices: DEVICES, template: result.template, mood: MOOD, seed: 7 })
    expect(resolved.shortfalls).toEqual([])
    expect(resolved.assignments).toHaveLength(result.template.roles.length)
  })

  it('is a no-op with nothing selected', () => {
    const result = applied(industrialTechno, [])
    expect(result.template).toBe(industrialTechno)
    expect(result.applied).toEqual([])
    expect(result.notes).toEqual([])
    expect(result.diagnostics).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Nothing is silent
// ---------------------------------------------------------------------------

describe('a claim this template cannot honour is reported (§5, §6.3)', () => {
  it('names the missing (role, band) rather than dropping the replacement', () => {
    // Ambient Dub has a ride and a shaker and no closed-hat at all, so every band of the
    // shuffled hat lands on nothing. A toggle that visibly does nothing is the failure §6.3
    // warns about; this is that failure caught one layer up.
    const result = applied(ambientDub, [shuffle])
    const missing = result.diagnostics.filter((d) => d.kind === 'no-such-target')
    expect(missing.map((d) => (d.kind === 'no-such-target' ? [d.role, d.band] : []))).toEqual([
      ['closed-hat', 0],
      ['closed-hat', 1],
      ['closed-hat', 2],
      ['closed-hat', 3],
    ])
    expect(missing[0]?.detail).toContain('Ambient Dub')
    expect(missing[0]?.detail).toContain('Shuffle')
    // And nothing was invented to fill the hole (invariant 5).
    expect(patternsFor(result.template, 'closed-hat')).toEqual([])
  })

  it('says why an added part was not added to a template that already has one', () => {
    const result = applied(ambientDub, [shuffle])
    const kinds = result.diagnostics.map((d) => d.kind)
    expect(kinds).toContain('role-already-patterned')
    expect(kinds).toContain('role-already-requested')
    // The template's own shaker is untouched and there is no second one.
    expect(patternsFor(result.template, 'ghost-perc').every((p) => p.id.startsWith('dub-'))).toBe(
      true,
    )
    expect(result.template.roles.filter((r) => r.role === 'ghost-perc')).toHaveLength(1)
  })

  it('reports a tempo shift it had to hold at the floor', () => {
    const glacial: Inspiration = {
      id: 'fixture',
      name: 'Fixture',
      patch: { bpm: { shift: -400 } },
    }
    const result = applied(industrialTechno, [glacial])
    expect(result.diagnostics.map((d) => d.kind)).toEqual(['bpm-clamped'])
    expect(result.template.bpm.min).toBe(20)
    // Clamping is monotonic, so the spec is still a legal one — which is the whole reason to
    // clamp rather than let a shift produce a negative tempo.
    expect(TemplateSchema.safeParse(result.template).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Composition, the cap, and the refusal
// ---------------------------------------------------------------------------

describe('composing two (§5)', () => {
  it('applies both, and the order they arrive in changes nothing', () => {
    const one = applied(industrialTechno, [reggae, shuffle])
    const other = applied(industrialTechno, [shuffle, reggae])
    expect(other.template).toEqual(one.template)
    expect(other.notes).toEqual(one.notes)
    expect(other.diagnostics).toEqual(one.diagnostics)
    expect(one.applied).toEqual(['reggae', 'shuffle'])
    expect(other.applied).toEqual(['reggae', 'shuffle'])

    // Both influences are actually present, not merely one of them twice.
    expect(patternsFor(one.template, 'kick').every((p) => p.id.startsWith('reggae-'))).toBe(true)
    expect(patternsFor(one.template, 'closed-hat').every((p) => p.id.startsWith('shuffle-'))).toBe(
      true,
    )
    expect(new Set(one.notes.map((n) => n.inspirationId))).toEqual(new Set(['reggae', 'shuffle']))
  })

  it('refuses a third, by the cap §5 sets', () => {
    const result = refused(industrialTechno, [reggae, dancehall, shuffle])
    expect(result.reason).toBe('too-many')
    expect(result.detail).toContain(String(INSPIRATION_CAP))
    expect(result.conflicts).toEqual([])
  })

  it('refuses the same one twice', () => {
    expect(refused(industrialTechno, [reggae, reggae]).reason).toBe('duplicate')
  })

  it('refuses a collision by name, and picks no winner', () => {
    // The rule the whole design turns on. Both influences are a claim about the kick, and
    // choosing between them by id order would be a musical decision made by the alphabet.
    const result = refused(industrialTechno, [reggae, dancehall])
    expect(result.reason).toBe('conflict')
    expect(result.conflicts.map((c) => [c.role, c.band])).toEqual([
      ['kick', 0],
      ['kick', 1],
      ['kick', 2],
      ['kick', 3],
    ])
    for (const conflict of result.conflicts) {
      expect(conflict.between).toEqual(['dancehall', 'reggae'])
      expect(conflict.names).toEqual(['Dancehall', 'Reggae'])
    }
    // The sentence a person reads names both, and says what to do next.
    expect(result.detail).toContain('Dancehall')
    expect(result.detail).toContain('Reggae')
    expect(result.detail).toContain('kick at band 0')

    // Refusal, not a silent preference: the other order refuses identically.
    const flipped = refused(industrialTechno, [dancehall, reggae])
    expect(flipped).toEqual(result)
  })

  it('refuses two inspirations that would both add patterns for the same silent role', () => {
    // Not a replacement collision — neither template authors it — but the same lottery: two
    // sets of variants at one `(role, band)` and selection deciding by id order.
    const twin = (id: string): Inspiration => ({
      id,
      name: id,
      patch: {
        addPatterns: [
          variant(`${id}-texture-b0`, 'texture', 0, 16, on('downbeat', 1)),
          variant(`${id}-texture-b1`, 'texture', 1, 16, on('downbeat', 1, 9)),
          variant(`${id}-texture-b2`, 'texture', 2, 16, on('downbeat', 1, 5, 9)),
          variant(`${id}-texture-b3`, 'texture', 3, 16, on('downbeat', 1, 5, 9, 13)),
        ],
      },
    })
    const result = refused(ambientDub, [twin('alpha'), twin('bravo')])
    expect(result.reason).toBe('conflict')
    expect(result.conflicts).toHaveLength(4)
    expect(result.conflicts[0]?.role).toBe('texture')
  })

  it('refuses two inspirations that would both add the same part', () => {
    const adder = (id: string): Inspiration => ({
      id,
      name: id,
      patch: {
        addRoles: [
          {
            id: `${id}-r-texture`,
            role: 'texture',
            priority: 3,
            character: 'soft',
            sustain: 'continuous',
          },
        ],
      },
    })
    const result = refused(majorKeyElectro, [adder('alpha'), adder('bravo')])
    expect(result.reason).toBe('conflict')
    expect(result.conflicts).toEqual([
      { role: 'texture', between: ['alpha', 'bravo'], names: ['alpha', 'bravo'] },
    ])
  })
})

// ---------------------------------------------------------------------------
// Purity
// ---------------------------------------------------------------------------

describe('composition is pure (§7, invariant 6)', () => {
  it('leaves the base template byte-identical, whatever it did', () => {
    const before = JSON.stringify(industrialTechno)
    const result = applied(industrialTechno, [reggae, shuffle])
    expect(JSON.stringify(industrialTechno)).toBe(before)
    expect(result.template).not.toBe(industrialTechno)
  })

  it('shares no array or object with the template it patched', () => {
    // Deep-equal is not enough: a caller holding the effective template must not be able to
    // reach into the registry's copy through it.
    const result = applied(industrialTechno, [reggae])
    const before = JSON.stringify(industrialTechno)
    result.template.roles.push({
      id: 'x-intruder',
      role: 'noise',
      priority: 9,
      character: 'dirty',
      sustain: 'continuous',
    })
    result.template.patterns.push(variant('x-kick-b0', 'kick', 0, 16, at('accent', 120, 1)))
    ;(result.template.structure[0] as { bars: number }).bars = 999
    ;(result.template.hooks[0]?.notes[0] as { degree: number }).degree = 99
    expect(JSON.stringify(industrialTechno)).toBe(before)
  })

  it('gives the same answer twice, for every template and every legal pair', () => {
    for (const template of TEMPLATES) {
      for (const selection of LEGAL_SELECTIONS) {
        const a = applyInspirations(template, selection)
        const b = applyInspirations(template, selection)
        expect(b).toEqual(a)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// The effective template is a template
// ---------------------------------------------------------------------------

describe('every effective template is schema-valid (§4, §7)', () => {
  it('parses, for every template against every legal selection', () => {
    const selections: Inspiration[][] = LEGAL_SELECTIONS
    for (const template of TEMPLATES) {
      for (const selection of selections) {
        const result = applied(template, selection)
        const parsed = TemplateSchema.safeParse(result.template)
        const where = `${template.id} + [${selection.map((i) => i.id).join(', ')}]`
        expect(parsed.error?.issues ?? [], where).toEqual([])
        // Ids stay unique across the join, which is what the `<id>-` prefix rule buys.
        const patternIds = result.template.patterns.map((p) => p.id)
        expect(new Set(patternIds).size, where).toBe(patternIds.length)
        const requestIds = result.template.roles.map((r) => r.id)
        expect(new Set(requestIds).size, where).toBe(requestIds.length)
        // And exactly one variant set owns each claimed slot.
        for (const inspiration of selection) {
          for (const key of claimedSlots(inspiration)) {
            const [role, band] = key.split('|') as [Role, string]
            const here = result.template.patterns.filter(
              (p) => p.forRole === role && String(p.band) === band,
            )
            const owned = here.filter((p) => p.id.startsWith(`${inspiration.id}-`))
            expect(owned.length === 0 || owned.length === here.length, `${where} ${key}`).toBe(true)
          }
        }
      }
    }
  })

  /**
   * A full resolve against the whole library, once per (direction, selection) pair — 84 of them
   * at five influences, and it grows with both registries. Past the 5s default, so the timeout is
   * stated here rather than raised globally: this is the one sweep in the suite that is slow for
   * a good reason, and every other test should still fail loudly if it hangs.
   *
   * **This test is a canary for search growth, and the MC-707 is what made that visible.** It was
   * comfortably inside 30s until a near-clone of the MC-101 landed and roughly doubled the worst
   * case (74,415 -> 132,559 nodes). It then measured 10.6s on a fast laptop and **failed
   * intermittently on CI, where a runner is two to three times slower** — one ubuntu job of three
   * timing out per run, a different one each time, which is what a boundary looks like rather
   * than a bug.
   *
   * Raised to 120s, which was headroom rather than a fix. The cause is #228: the same growth that
   * makes this slow will, further along, silently cap a reader's search and hand them a worse
   * arrangement with nothing said. That third raise came due in August 2026 and was taken as the
   * signal it was meant to be — see the budget note below, and the deleted sweep it points at.
   */
  /**
   * **300s, and the number is not the fix — the fix was deleting a third of the gate.**
   *
   * This test's own note used to say that a third raise would be the signal to price the cost
   * somewhere real rather than add another zero, and in August 2026 it came due: this sweep,
   * `search-bound`'s and `search-symmetry`'s all blew their budgets in one CI run with every
   * assertion passing. The answer was that two of the three were the same 168 exhaustive searches
   * — see the note in `search-bound.test.ts` — so ~21M nodes came out of the gate for no loss of
   * coverage, and `search-symmetry` went from 92s to 1.5s.
   *
   * What is left here is work nothing else does: 84 full-library resolves, one per (direction,
   * legal selection), proving no selection strands a request. Measured at 68s on a fast laptop
   * with the duplication gone. A CI runner sharing a core is two to three times slower, which is
   * the whole span this budget has to cover, so 300s is headroom over the slowest observed rather
   * than a guess — and a *fourth* raise means the resolve itself got dearer, which is a cost
   * problem and not a scheduling one.
   */
  it('still resolves on the full library, for every template and every legal pair', async () => {
    for (const template of TEMPLATES) {
      for (const selection of LEGAL_SELECTIONS) {
        // Yield so the worker can answer the main thread; see the note in
        // `search-symmetry.test.ts`'s cap sweep. A block this long fails CI with an RPC timeout
        // while every assertion passes, which is the least debuggable red there is.
        await new Promise((r) => setImmediate(r))
        const result = applied(template, selection)
        const resolved = resolve({
          devices: DEVICES,
          template: result.template,
          mood: MOOD,
          seed: 7,
        })
        const where = `${template.id} + [${selection.map((i) => i.id).join(', ')}]`
        expect(resolved.shortfalls.map((g) => `${g.requestId}: ${g.reason}`), where).toEqual([])
      }
    }
  }, 300_000)
})
