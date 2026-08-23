import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DENSITY_BANDS,
  MOOD_AXES,
  PATTERN_SLOTS,
  ROLES,
  TemplateSchema,
  bandFor,
  moodState,
  resolve,
  sectionsFor,
  selectPattern,
  type DensityBand,
  type Device,
  type Pattern,
  type Role,
  type SectionName,
  type Template,
} from '../lib/core/index'
import { DEVICES, DEVICE_FOLDERS } from '../lib/devices/registry.generated'
import { TEMPLATES, industrialTechno, templateById } from '../lib/templates/index'
// The UI's three detents, imported rather than restated: a vector pinned against numbers the
// control does not actually emit would pass while the app did something else (§6.3).
import { DENSITY_DETENTS } from '../components/density-detents'

const TEMPLATE_DIR = join(import.meta.dirname, '..', 'lib', 'templates')

/** Roles that carry at least one authored variant. The rest are pattern-less on purpose. */
function patternedRoles(template: Template): Role[] {
  return [...new Set(template.patterns.map((p) => p.forRole))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  )
}

function bandsFor(template: Template, role: Role): Set<DensityBand> {
  return new Set(template.patterns.filter((p) => p.forRole === role).map((p) => p.band))
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

describe('template registry', () => {
  it('holds at least one template and every one parses (§4)', () => {
    expect(TEMPLATES.length).toBeGreaterThan(0)
    for (const template of TEMPLATES) {
      const parsed = TemplateSchema.safeParse(template)
      expect(parsed.error?.issues ?? [], `${template.id} failed TemplateSchema`).toEqual([])
      expect(parsed.success).toBe(true)
    }
  })

  it('has unique ids, in UTF-16 code unit order (§7.2)', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })

  it('looks a template up by id and returns undefined for a stale one', () => {
    expect(templateById('industrial-techno')).toBe(industrialTechno)
    expect(templateById('no-such-genre')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Invariant 3 — templates never name a device
// ---------------------------------------------------------------------------

/**
 * The shared vocabulary is exempt by definition: `sub` is a role and `dark` a character, and a
 * device is free to reuse either as a voice id without that making the template's use of it a
 * breach. Everything else a device folder authors is out of bounds.
 */
const SHARED_VOCABULARY = new Set(
  [...ROLES, ...CHARACTERS, ...MOOD_AXES, ...PATTERN_SLOTS].flatMap((word) =>
    word.split('-'),
  ),
)

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

function deviceVocabulary(devices: readonly Device[]): Set<string> {
  const words: string[] = [...DEVICE_FOLDERS]
  for (const device of devices) {
    words.push(device.id, device.name, device.maker, device.kind)
    if (device.manual !== undefined) {
      words.push(device.manual.title)
      if (device.manual.edition !== undefined) words.push(device.manual.edition)
    }
    if (device.hints !== undefined) words.push(...Object.keys(device.hints))
    for (const voice of device.voices) words.push(voice.id, voice.label)
    for (const recipe of device.recipes) {
      words.push(recipe.id)
      words.push(...recipe.params.map((p) => p.name))
    }
  }
  const out = new Set<string>()
  for (const word of words) {
    for (const token of tokens(word)) {
      // A bare number identifies nothing. Device param names and manual editions are full of
      // them ('PW 1', 'SHAPE 2', 'eng02', '2.2.1b'), and treating '1' as a device word would
      // forbid a template from numbering its own hooks.
      if (/^[0-9]+$/.test(token)) continue
      if (!SHARED_VOCABULARY.has(token)) out.add(token)
    }
  }
  return out
}

/** Every string reachable in the template, with the path that reached it. */
function strings(value: unknown, path = '$'): { path: string; text: string }[] {
  if (typeof value === 'string') return [{ path, text: value }]
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`))
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`))
  }
  return []
}

describe('invariant 3 — a template never names a device', () => {
  const forbidden = deviceVocabulary(DEVICES)

  it('uses no word that comes from a device folder', () => {
    const breaches: string[] = []
    for (const template of TEMPLATES) {
      for (const { path, text } of strings(template)) {
        for (const token of tokens(text)) {
          if (forbidden.has(token)) breaches.push(`${template.id} ${path}: '${text}' -> '${token}'`)
        }
      }
    }
    expect(breaches).toEqual([])
  })

  it('contains no device id or folder name as a substring', () => {
    // Distinctive multi-part strings, so a plain substring test is safe here and catches an id
    // smuggled inside a longer word that the token test would split apart.
    const needles = [...DEVICES.map((d) => d.id), ...DEVICE_FOLDERS]
    for (const template of TEMPLATES) {
      const haystack = JSON.stringify(template).toLowerCase()
      for (const needle of needles) {
        expect(haystack, `template ${template.id} mentions ${needle}`).not.toContain(
          needle.toLowerCase(),
        )
      }
    }
  })

  it('imports nothing from lib/devices', () => {
    const sources = readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith('.ts'))
    expect(sources.length).toBeGreaterThan(0)
    for (const file of sources) {
      const src = readFileSync(join(TEMPLATE_DIR, file), 'utf8')
      const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] as string)
      for (const spec of imports) {
        expect(spec, `${file} imports ${spec}`).not.toMatch(/devices/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// §4.3 / §6.3 — band coverage
// ---------------------------------------------------------------------------

describe('density bands (§4.3, §6.3)', () => {
  it('authors all four bands for every role that has any pattern at all', () => {
    for (const template of TEMPLATES) {
      for (const role of patternedRoles(template)) {
        const bands = [...bandsFor(template, role)].sort()
        expect(bands, `${template.id}: role '${role}' is missing a band`).toEqual([
          ...DENSITY_BANDS,
        ])
      }
    }
  })

  it('never falls back a band, at any density, in any section (§6.3)', () => {
    // Band fallback is a *reported* degradation. Correct behaviour for a template with holes;
    // a content bug in one that claims complete coverage. The band asked for now depends on
    // the section's energy as well as the knob, so this sweeps both.
    const densities = [0, 24, 25, 49, 50, 74, 75, 100]
    for (const template of TEMPLATES) {
      const patterned = new Set(patternedRoles(template))
      for (const request of template.roles) {
        for (const section of sectionsFor(request, template)) {
          for (const density of densities) {
            const selection = selectPattern(template, request, section, moodState({ density }))
            const where = `${template.id} ${request.id} @${section} d=${density}`
            if (patterned.has(request.role)) {
              expect(selection.outcome, where).toBe('exact')
              if (selection.outcome !== 'none') {
                expect(selection.usedBand, where).toBe(
                  bandFor(template, section, moodState({ density })),
                )
              }
            } else {
              // Invariant 5 applied to rhythm: nothing authored, nothing invented.
              expect(selection.outcome, where).toBe('none')
            }
          }
        }
      }
    }
  })

  it('moves industrial techno through three distinct arrangements, one per detent (§6.3)', () => {
    // The acceptance test for the whole knob: not "the band changed" but "the *arrangement*
    // changed", pinned as the section-order vector at each of the three detents the UI offers.
    // Read down a column and you see one section's life; read across and you see the knob.
    //
    //            Intro  Build  Drop  Breakdown  Peak  Outro
    //   energy    0.15   0.45   0.9     0.3      1     0.2
    const vector = (density: number) =>
      industrialTechno.structure.map((s) =>
        bandFor(industrialTechno, s.name, moodState({ density })),
      )

    expect(vector(DENSITY_DETENTS[0])).toEqual([0, 0, 2, 0, 2, 0]) // sparser
    expect(vector(DENSITY_DETENTS[1])).toEqual([0, 1, 3, 1, 3, 0]) // as authored
    expect(vector(DENSITY_DETENTS[2])).toEqual([1, 2, 3, 2, 3, 1]) // busier

    // Every detent is a different guide. A knob with two settings that resolve alike is a knob
    // someone will report as broken.
    const vectors = DENSITY_DETENTS.map((d) => vector(d).join(''))
    expect(new Set(vectors).size).toBe(DENSITY_DETENTS.length)
  })

  it('is locally inert at a clamped section without being globally inert (§6.3)', () => {
    // The clamp means a section already at an edge cannot move: Drop (0.9) and Peak (1) are
    // band 3 at both the neutral and the busy detent, and Intro (0.15) and Outro (0.2) are
    // band 0 at both the sparse and the neutral one. That is not the knob failing — the rest
    // of the arrangement still moves — but it is why "turn density up and the Drop gets
    // busier" is the wrong sentence to put in front of a user.
    const at = (name: string, density: number) =>
      bandFor(industrialTechno, name as SectionName, moodState({ density }))

    for (const section of ['Drop', 'Peak']) {
      expect(at(section, DENSITY_DETENTS[1]), section).toBe(at(section, DENSITY_DETENTS[2]))
    }
    for (const section of ['Intro', 'Outro']) {
      expect(at(section, DENSITY_DETENTS[0]), section).toBe(at(section, DENSITY_DETENTS[1]))
    }
    // ...and the sections that are not pinned move at every step, which is what keeps the two
    // detents distinct as whole arrangements.
    for (const section of ['Build', 'Breakdown']) {
      expect(at(section, DENSITY_DETENTS[0]), section).toBeLessThan(at(section, DENSITY_DETENTS[1]))
      expect(at(section, DENSITY_DETENTS[1]), section).toBeLessThan(at(section, DENSITY_DETENTS[2]))
    }
  })

  it('gets busier as the band rises, and never by editing hits (§4.3)', () => {
    for (const template of TEMPLATES) {
      for (const role of patternedRoles(template)) {
        const byBand = new Map<DensityBand, Pattern[]>()
        for (const p of template.patterns.filter((x) => x.forRole === role)) {
          byBand.set(p.band, [...(byBand.get(p.band) ?? []), p])
        }
        const counts = DENSITY_BANDS.map((b) =>
          Math.max(...(byBand.get(b) as Pattern[]).map((p) => p.hits.length / p.length)),
        )
        for (let i = 1; i < counts.length; i++) {
          expect(
            counts[i] as number,
            `${template.id}: '${role}' band ${i} is not busier than band ${i - 1}`,
          ).toBeGreaterThan(counts[i - 1] as number)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Slot convention
// ---------------------------------------------------------------------------

describe('pattern hygiene', () => {
  it('puts one hit on a step, in step order', () => {
    for (const template of TEMPLATES) {
      for (const pattern of template.patterns) {
        const steps = pattern.hits.map((h) => h.step)
        expect(new Set(steps).size, `${pattern.id} hits a step twice`).toBe(steps.length)
        expect(steps, `${pattern.id} is not in step order`).toEqual([...steps].sort((a, b) => a - b))
      }
    }
  })

  it('gives every ghost a quiet velocity and every accent a loud one', () => {
    // The convention the template header fixes. A ghost with no velocity is a full-strength
    // hit that a device will articulate as if it were quiet.
    for (const template of TEMPLATES) {
      for (const pattern of template.patterns) {
        for (const hit of pattern.hits) {
          if (hit.slot === 'ghost') {
            expect(hit.velocity, `${pattern.id} step ${hit.step}`).toBeDefined()
            expect(hit.velocity as number).toBeLessThanOrEqual(64)
          }
          if (hit.slot === 'accent') {
            expect(hit.velocity, `${pattern.id} step ${hit.step}`).toBeDefined()
            expect(hit.velocity as number).toBeGreaterThanOrEqual(100)
          }
        }
      }
    }
  })

  it('leans on at most one accent per variant', () => {
    for (const template of TEMPLATES) {
      for (const pattern of template.patterns) {
        const accents = pattern.hits.filter((h) => h.slot === 'accent')
        expect(accents.length, `${pattern.id} has ${accents.length} accents`).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Industrial Techno, resolved (issue #6's done-when)
// ---------------------------------------------------------------------------

function tr1000(): Device {
  const device = DEVICES.find((d) => d.id === 'roland-tr-1000')
  if (device === undefined) throw new Error('roland-tr-1000 missing from the registry')
  return device
}

describe('industrial-techno resolves (§7)', () => {
  it('requests twelve roles, ascending by priority (§4.4)', () => {
    expect(industrialTechno.roles).toHaveLength(12)
    const priorities = industrialTechno.roles.map((r) => r.priority)
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b))
  })

  /**
   * The acceptance report, asserted whole rather than sampled. A gap set compared entry by
   * entry lets a regression hide behind a count that happens to still add up; comparing the
   * map means a part that quietly changes *why* it is missing shows as a diff.
   *
   * These are outcomes and §7.3 reasons, never `Score` numbers - the objective is free to
   * re-order its lower keys without touching what these say (§7.1).
   */
  function report(devices: readonly Device[], seed = 7) {
    const result = resolve({ devices, template: industrialTechno, mood: moodState(), seed })
    return {
      method: result.search.method,
      capped: result.search.capped,
      filled: result.assignments.map((a) => a.requestId).sort(),
      gaps: Object.fromEntries(
        result.gaps
          .map((g) => [g.requestId, g.reason === 'no-room' ? `no-room/${g.because}` : g.reason])
          .sort(([a], [b]) => ((a as string) < (b as string) ? -1 : 1)),
      ),
    }
  }

  it('fills eleven of twelve on the full rig, and says exactly what is missing', () => {
    expect(report(DEVICES)).toEqual({
      method: 'exhaustive',
      capped: false,
      filled: [
        'r-bass-mid',
        'r-clap',
        'r-closed-hat',
        'r-impact',
        'r-kick',
        'r-noise',
        'r-open-hat',
        'r-pad',
        'r-riser',
        'r-stab',
        'r-sub',
      ],
      // The one hole in three devices' worth of content, and it is an authoring hole rather
      // than a rig one: three boxes declare `metallic` on a voice and none authors a recipe.
      gaps: { 'r-metallic': 'no-recipe' },
    })
  })

  it('fills five of twelve on the TR-1000 alone, with a reason for each of the seven', () => {
    expect(report([tr1000()])).toEqual({
      method: 'exhaustive',
      capped: false,
      filled: ['r-clap', 'r-closed-hat', 'r-impact', 'r-kick', 'r-open-hat'],
      gaps: {
        // One voice on this box declares both kick and sub, so the loser is contended out
        // rather than uncarriable. Which of the two loses is a seed-7 tie-break, not a law -
        // the test below pins the part that holds for every seed.
        'r-sub': 'no-room/contended',
        // The box has a voice for these and nobody has authored the recipe. Fixed by writing
        // content, which is a different job from buying a device (§3.5, §7.3).
        'r-bass-mid': 'no-recipe',
        'r-metallic': 'no-recipe',
        'r-noise': 'no-recipe',
        // Nothing in a drum machine declares a tonal role. Fixed by buying a device.
        'r-stab': 'no-capable-voice',
        'r-pad': 'no-capable-voice',
        'r-riser': 'no-capable-voice',
      },
    })
  })

  it('carries exactly one of kick and sub on that box, whatever the seed', () => {
    // The half of the previous test that is a fact about the rig rather than about seed 7.
    for (const seed of [0, 1, 7, 42, 9001]) {
      const { filled, gaps } = report([tr1000()], seed)
      const carried = ['r-kick', 'r-sub'].filter((id) => filled.includes(id))
      expect(carried, `seed ${seed}`).toHaveLength(1)
      const dropped = carried[0] === 'r-kick' ? 'r-sub' : 'r-kick'
      expect(gaps[dropped], `seed ${seed}`).toBe('no-room/contended')
    }
  })

  it('names something capable for every gap that is not a capability hole (§7.3)', () => {
    const result = resolve({
      devices: [tr1000()],
      template: industrialTechno,
      mood: moodState(),
      seed: 7,
    })
    for (const gap of result.gaps) {
      if (gap.reason === 'no-capable-voice') expect(gap.capable).toEqual([])
      else expect(gap.capable.length, `${gap.requestId} names nothing capable`).toBeGreaterThan(0)
    }
  })

  it('picks the same rhythms whatever the rig is (§7 step 5)', () => {
    // Pattern selection reads template + mood and nothing else, so two users with different
    // boxes and the same inputs get the same step programming.
    const mood = moodState({ density: 80 })
    const a = resolve({ devices: [tr1000()], template: industrialTechno, mood, seed: 7 })
    const b = resolve({ devices: DEVICES, template: industrialTechno, mood, seed: 99 })

    const flatten = (r: typeof a) =>
      [...r.patterns]
        .map(([requestId, bySection]) => [
          requestId,
          [...bySection].map(([section, sel]) => [
            section,
            sel.outcome,
            sel.outcome === 'none' ? null : sel.pattern.id,
          ]),
        ])
        .sort((x, y) => ((x[0] as string) < (y[0] as string) ? -1 : 1))

    expect(flatten(a)).toEqual(flatten(b))
  })
})
