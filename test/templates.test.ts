import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHARACTERS,
  DENSITY_BANDS,
  DENSITY_DETENTS,
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

/**
 * Ordinary English that a device folder happens to print — on a control, or on the box itself.
 *
 * The set was `MUSICAL_ENGLISH` while both its members were words a *manual* prints beside a
 * knob. `one` is neither musical nor a parameter: it is a word in a product's name. The bar the
 * set enforces did not change and the name now says what it actually is — a word that identifies
 * no device however a template uses it.
 *
 * `key` is the MC-101's own name for a drum pad's tuning — `Key Offset`, Reference Manual p.47 —
 * and it is also what every musician calls the tonality a template is written in, which is what
 * `major-key-electro` is naming. That is not a template naming a device, and renaming the
 * parameter to dodge the check would put a word on the screen that the box does not print.
 *
 * `transient` is the same collision from the other direction. A template's `sustain` is either
 * `continuous` or `transient` — that is §4.4's own word for a part that plays in some sections
 * and not others, chosen long before this device landed — and the TR-8S prints `TRANSIENT` as an
 * INST FX type with a `TRANSIENT ATTACK` control under it (Reference Manual eng01). Three
 * templates say `sustain: 'transient'`. Neither side may move: renaming the template field would
 * rewrite §4.4's vocabulary to dodge a check, and renaming the parameter would put a word on the
 * screen that the box does not print.
 *
 * `one` is the collision arriving from a third direction: not a parameter name but a **product
 * name**, `Akai MPC One G2`. `deviceVocabulary` tokenises `device.name`, so the day that box
 * landed the word `one` became a device word and `weave`'s *"this is one more thing up there"*
 * became a breach — a template counting its own parts, naming nothing. No side may move here
 * either: the box is called what Akai calls it, and a direction may not be forbidden the
 * commonest number word in English.
 *
 * **Exempting `one` does not open a hole, and the test below is why.** A template that really
 * did name this box would have to write `akai-mpc-one-g2`, and *"contains no device id or folder
 * name as a substring"* asserts against exactly that, on ids and folder names rather than
 * tokens. The other two tokens of the name, `mpc` and `g2`, stay forbidden here. What is exempt
 * is the bare English word, which on its own identifies nothing.
 *
 * `hand` is the fourth, and it arrives from the parameter direction again. The RD-8's voice
 * block is the 808's, so one of its eleven voices is labelled `HAND CLAP` — the name the panel
 * silkscreens and the manual's control list prints (p.9) — and `deviceVocabulary` tokenises
 * `voice.label`. The day that box landed, `ambient-dub`'s *"the swell can happen by hand across a
 * part already sounding"* and `weave`'s *"the closed hat can open by hand where it needs to"*
 * became breaches: two directions describing a player doing something with their hands, naming
 * nothing. Neither side may move here either. Relabelling the voice `CLAP` would put a word on
 * the screen that is not the one on the box — and would collide with the RD-9's own `CLAP`, which
 * is a different circuit — and a direction may not be forbidden the ordinary English for playing
 * something yourself, which is what §8's at-the-machine writing is made of.
 *
 * This is the same false positive the single-letter rule below already records for `A minor`,
 * and it is repaired the same way: by naming the word, once, with the reason. Keep this set
 * tiny. A word earns a place here only when a device folder's own vocabulary collides with
 * ordinary English, never to let a template through that really is naming a box.
 *
 * **`bars` is the fifth, and neither side may move.** The Digitakt's Werp and Repitch machines
 * carry a parameter the panel prints as `BARS` — *"Bars sets the total duration of the sample
 * measured in bars and is relative to the set BPM"* (manual p.84) — and Industrial Techno says
 * *"a part already playing can lift the eight bars into a drop"*. The device is quoting its own
 * silkscreen and the direction is using the ordinary English word for a length of music, which is
 * the unit §8's at-the-machine writing counts in. Renaming the parameter would put a word on the
 * screen that is not the one on the box; forbidding the direction the word would leave it no way
 * to say how long a section is.
 */
const NON_IDENTIFYING_ENGLISH = new Set(['bars', 'hand', 'key', 'one', 'transient'])

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
      // A single letter identifies nothing either, and for the same reason. Cascadia's panel
      // names its sections `VCO A` / `VCO B`, `VCA A` / `VCA B`, `ENVELOPE A` / `ENVELOPE B`:
      // the letter is a disambiguator between two copies of one section, not a word. Treating
      // 'a' as a device word forbids a template from naming the key of A minor, which is what
      // it did the day this device landed.
      if (token.length === 1) continue
      if (NON_IDENTIFYING_ENGLISH.has(token)) continue
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

  /**
   * §invariant 3/#189. **The exemption list is pinned, so it can only grow deliberately.**
   *
   * #189 worried that this set widens with every device until the check passes anything. The
   * history says otherwise — five words across forty-three devices, one per genuine collision:
   * `key` with the MC-101, `transient` with the TR-8S, `one` with the MPC One G2, `hand` with
   * the RD-8, `bars` with the Digitakt — and each carries its reasoning above. It is not
   * drifting.
   *
   * What was missing is any reason it *could not*. A device session under time pressure meets a
   * collision, adds a word, and the suite stays green: nothing asks whether the word identifies a
   * box. Pinning the membership makes adding one a deliberate act — the test fails, and whoever
   * updates it reads the standard three paragraphs up before they do.
   *
   * Asserted as a set rather than a size, so swapping a word for another is caught too.
   *
   * **This is a second net, not the first one.** The assertion below is the real guard: a
   * template that names a device has to write an id or a folder name, and that is tested on
   * substrings which no token exemption can reach. Every word here is one that identifies nothing
   * on its own, which is why exempting it opens no hole.
   */
  it('exempts exactly five English words, and adding a sixth is a decision', () => {
    expect([...NON_IDENTIFYING_ENGLISH].sort()).toEqual(['bars', 'hand', 'key', 'one', 'transient'])
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
// §4.3 — which directions say their variants re-articulate a hook
// ---------------------------------------------------------------------------

/**
 * The review, recorded. Thirteen requests in the library have **both** a hook and variants, so
 * thirteen times over a direction has to answer what its variants are against its hook: the map
 * of where a held note is struck again, or a rhythm of their own. #100 answered "a rhythm" for all
 * thirteen and silenced the two that were maps.
 *
 * Every one of the thirteen was read, and the answer is the direction's own prose in each case:
 *
 *  - **`drone-study` `r-texture`** — flagged. "A re-articulation map: the places the player lifts
 *    and re-strikes a note that is otherwise continuous", against hooks of three notes held four
 *    and eight bars each.
 *  - **`weave` `r-sub`** — flagged. "Where the low note is struck again rather than held", and its
 *    hooks say "the rhythm of the part is in the variants, and the pitch of it is here".
 *  - **`major-key-electro` `r-lead`** — *not* flagged, and it is the closest call in the library:
 *    its variants are commented "the hook says which notes; this says how often the part speaks",
 *    which is nearly this flag's sentence. But `electro-hook-lead-1` places notes on steps 1, 11,
 *    17, 27, 33, 43, 49, 59 and `electro-lead-b2` strikes 1, 11, 17, 27 — the hook already
 *    *carries* that rhythm, its notes are 4 to 8 steps long, and none of them is held across the
 *    next strike. There is no held note to re-articulate, so the two really are one instruction
 *    written twice and #100 is right about it.
 *  - **`major-key-electro` `r-arp`** — not flagged, on the template's own words: the arp hook is
 *    "one note per step, so it lines up with the arp's own variants hit for hit".
 *  - **`ambient-dub` `r-bass-mid`** — not flagged. Its two hooks disagree about the reading, and a
 *    part whose semantics depended on which one the seed picked would be a guide that changes
 *    meaning on a reroll.
 *  - **`industrial-techno` `r-bass-mid` / `r-stab`, `lydian-house` `r-bass-mid` / `r-stab`,
 *    `relay` `r-bass-mid` / `r-lead`, `major-key-electro` `r-vox-chop`** — not flagged. Every hook
 *    here is a figure with its own rhythm and note lengths of one to eight steps that end before
 *    the next strike. Two grids on one part is exactly what #100 removed.
 *
 * Pinned as an exact set rather than a lower bound, in both directions. A flag appearing on a
 * fourteenth request is a musical claim nobody reviewed; a flag disappearing takes the density
 * knob off a part with it, silently, which is the failure this whole change exists to undo.
 */
const RE_ARTICULATING = ['drone-study/r-texture', 'weave/r-sub'] as const

describe('re-articulated hooks (§4.3)', () => {
  it('carries the flag on exactly the reviewed requests, and on no others', () => {
    const flagged = TEMPLATES.flatMap((t) =>
      t.roles.filter((r) => r.reArticulatesHook === true).map((r) => `${t.id}/${r.id}`),
    )
    expect(flagged.sort()).toEqual([...RE_ARTICULATING].sort())
  })

  it('is authored only where the direction has both halves to join (§4.3)', () => {
    // The schema enforces this, so it is asserted here against the real library rather than
    // against a fixture: a flag with no hook to hold the note, or no variant to place the
    // strikes, changes nothing the guide prints and would be an author writing a no-op.
    for (const template of TEMPLATES) {
      const hooked = new Set(template.hooks.map((h) => h.forRole))
      const patterned = new Set(template.patterns.map((p) => p.forRole))
      for (const request of template.roles) {
        if (request.reArticulatesHook !== true) continue
        const where = `${template.id}/${request.id}`
        expect(hooked, where).toContain(request.role)
        expect(patterned, where).toContain(request.role)
      }
    }
  })

  it('rejects a flag with nothing to join, so the no-op cannot be authored', () => {
    // Both halves of the schema rule, from the direction that actually has both: strip its hooks,
    // then its variants, and each removal alone must fail validation.
    const drone = templateById('drone-study') as Template
    expect(TemplateSchema.safeParse(drone).success).toBe(true)
    expect(TemplateSchema.safeParse({ ...drone, hooks: [] }).success).toBe(false)
    expect(TemplateSchema.safeParse({ ...drone, patterns: [] }).success).toBe(false)
  })

  it('leaves every other request untouched, so absent stays the default (§4.3)', () => {
    // `reArticulatesHook: false` is not representable — the schema takes `true` only — and this is
    // the guard that nobody starts writing it as a way of saying "no". Two spellings of the
    // default is how a two-valued field comes to mean three things.
    for (const template of TEMPLATES) {
      for (const request of template.roles) {
        const flagged = RE_ARTICULATING.includes(
          `${template.id}/${request.id}` as (typeof RE_ARTICULATING)[number],
        )
        expect(request.reArticulatesHook, `${template.id}/${request.id}`).toBe(
          flagged ? true : undefined,
        )
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
        result.shortfalls
          .map((g) => [g.requestId, g.reason === 'no-room' ? `no-room/${g.because}` : g.reason])
          .sort(([a], [b]) => ((a as string) < (b as string) ? -1 : 1)),
      ),
    }
  }

  it('fills all twelve on the full rig, with no gap left to explain', () => {
    expect(report(DEVICES)).toEqual({
      method: 'exhaustive',
      capped: false,
      filled: [
        'r-bass-mid',
        'r-clap',
        'r-closed-hat',
        'r-impact',
        'r-kick',
        'r-metallic',
        'r-noise',
        'r-open-hat',
        'r-pad',
        'r-riser',
        'r-stab',
        'r-sub',
      ],
      // `r-metallic` was the one hole in three devices' worth of content, and it was an
      // authoring hole rather than a rig one: three boxes declared `metallic` on a voice and
      // none authored a recipe. The fourth box closes it — a ring modulator normalled onto a
      // mixer channel is what that role has been asking for.
      gaps: {},
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
    for (const gap of result.shortfalls) {
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
