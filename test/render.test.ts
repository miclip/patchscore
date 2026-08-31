import { describe, expect, it } from 'vitest'
import {
  GUIDE_PHASES,
  clockSourceSetupFact,
  evidenceFor,
  NEUTRAL_MOOD,
  SUBORDINATE,
  dominantRangeCite,
  moodState,
  citationSentence,
  rangeDocuments,
  receiveTransports,
  renderGuide,
  resolve,
  type AuthoredParam,
  type Cite,
  type Hook,
  type ResolveResult,
  type ResolvedParam,
  type SectionName,
  type Device,
  type Template,
} from '../lib/core/index'
import { ioText, mixerText } from '../components/guide/format'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES } from '../lib/templates/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { box, makeRecipe, request, withRoles } from './rigs'

/**
 * §8. What the renderer must never do: drop a phase, print a value without its provenance,
 * invent something to fill a hole, or put a hint anywhere a reader cannot suppress it.
 *
 * The assertions are deliberately structural — "every value line in phase 6 carries one of the
 * three states", not "line 402 reads `TUNE 52 → 45`". A guide is prose and its wording will
 * move; the obligations in §8 will not, and a test pinned to wording would be rewritten every
 * time someone improves a sentence, which is how a test stops being read.
 */

const golden = (): ResolveResult =>
  resolve({
    devices: GOLDEN_DEVICES,
    template: GOLDEN_TEMPLATE,
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  })

/** The same scenario with two sections at one energy, so §6.3 puts them in one band. */
const sameBandGuide = (): ResolveResult =>
  resolve({
    devices: GOLDEN_DEVICES,
    template: {
      ...GOLDEN_TEMPLATE,
      structure: [
        { name: 'Intro', bars: 16, energy: 0.5 },
        { name: 'Build', bars: 16, energy: 0.5 },
        { name: 'Drop', bars: 32, energy: 0.9 },
      ],
    },
    mood: GOLDEN_MOOD,
    seed: GOLDEN_SEED,
  })

function lines(doc: string): string[] {
  return doc.split('\n')
}

/** The body of one 1-based phase, exclusive of its own heading and the next one. */
/** §8 phase 7's arrangement block: from its heading to the end of the phase. */
function variations(doc: string): string[] {
  const body = phaseBody(doc, 7)
  const start = body.indexOf('**Arrangement variations**')
  expect(start, 'arrangement heading').toBeGreaterThan(-1)
  return body.slice(start + 1).filter((l) => l !== '')
}

function phaseBody(doc: string, phase: number): string[] {
  const all = lines(doc)
  const start = all.findIndex((l) => l.startsWith(`## ${phase}. `))
  expect(start, `phase ${phase} heading`).toBeGreaterThan(-1)
  const rest = all.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return end === -1 ? rest : rest.slice(0, end)
}

/**
 * The mark is the **positive** claim: `manual` or `observed` where the point was cited, and the
 * knob named where mood moved it. An unmarked value is a starting point, which is what a patch
 * sheet has always been and needs no annotation.
 *
 * Invariant 4 is untouched by that — it is a type guarantee (`ResolvedParam.provenance` is
 * non-optional), not a claim about ink — so these tests check something stricter than the old
 * "exactly one marker per line": every line is checked against *its own* provenance, so a mark
 * that drifts from the value it describes fails here rather than looking plausible.
 */
function soundDesignParams(result: ReturnType<typeof resolve>) {
  return result.devices.flatMap((device) =>
    result.assignments.filter((a) => a.deviceId === device.id).flatMap((a) => a.params),
  )
}

// ---------------------------------------------------------------------------
// The seven phases
// ---------------------------------------------------------------------------

describe('phases (§8)', () => {
  it('emits exactly the seven phases, in §8 order', () => {
    const headings = lines(renderGuide(golden())).filter((l) => l.startsWith('## '))
    expect(headings).toEqual(GUIDE_PHASES.map((title, i) => `## ${i + 1}. ${title}`))
  })

  it('emits all seven for a rig that could carry nothing, rather than dropping the empty ones', () => {
    const empty = resolve({
      devices: [],
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    const doc = renderGuide(empty)
    const headings = lines(doc).filter((l) => l.startsWith('## '))
    expect(headings).toHaveLength(GUIDE_PHASES.length)
    // Invariant 5: the phases that have nothing say so — flatly, in as few words as the
    // fact takes. An empty phase is the least interesting thing on the page.
    expect(doc.split('No parts assigned.').length - 1).toBeGreaterThanOrEqual(3)
    expect(doc).toContain('nothing in this rig can send clock')
  })

  it('is deterministic — the same result renders the same bytes', () => {
    expect(renderGuide(golden())).toBe(renderGuide(golden()))
  })
})

// ---------------------------------------------------------------------------
// Invariant 4 — every rendered value carries its provenance
// ---------------------------------------------------------------------------

describe('provenance (invariant 4, §3.2)', () => {
  it('marks each parameter line with what is true of that parameter, and nothing else', () => {
    const result = golden()
    const valueLines = phaseBody(renderGuide(result), 6).filter((l) => l.startsWith('- **'))
    const params = soundDesignParams(result)

    expect(valueLines).toHaveLength(params.length)
    params.forEach((param, i) => {
      const line = valueLines[i] as string
      const { provenance } = param
      expect(line, line).toContain(`**${param.name}**`)

      if (provenance.state === 'authored') {
        expect(line, line).toContain(` · ${provenance.cite.kind}`)
        expect(line, line).not.toContain('moved by')
      } else if (provenance.state === 'derived') {
        expect(line, line).toContain(
          ` · ${provenance.cite.kind} · moved by ${provenance.axes.join(', ')}`,
        )
      } else if (provenance.axes !== undefined && provenance.axes.length > 0) {
        // A move on an uncited point is still shown, and still borrows no authority from it.
        expect(line, line).toContain(` · moved by ${provenance.axes.join(', ')}`)
        expect(line, line).not.toContain(' · manual')
        expect(line, line).not.toContain(' · observed')
      } else {
        // A starting point. No mark, and no trailing separator left behind by one.
        expect(line, line).not.toContain(' · ')
      }
    })
  })

  it('has no warning glyph anywhere — an unmarked value is the norm, not a defect', () => {
    expect(renderGuide(golden())).not.toContain('⚠')
  })

  it('marks cited patch and articulation lines and leaves the rest bare', () => {
    const doc = renderGuide(golden())
    // Slot lines list steps, not values, and carry no provenance; every other backticked
    // bullet in these two phases is a rendered value.
    const bullets = [...phaseBody(doc, 5), ...phaseBody(doc, 6)]
      .filter((l) => l.startsWith('- `'))
      .filter((l) => !/^- `[a-z-]+` — \d/.test(l))

    expect(bullets.length).toBeGreaterThan(0)
    for (const line of bullets) {
      // `lastIndexOf`, not `indexOf`: the provenance separator and the separator inside a
      // section-qualified jack id (§3.3) are the same three characters, so a patch bullet reads
      // `` - `VCO · SUB` → `VCF · IN` · manual `` and the first ` · ` on the line is inside a
      // socket name. Unambiguous to a reader, because the ids are backticked; not to a splitter
      // scanning forwards. The mark is always last, so scan from the end.
      const at = line.lastIndexOf(' · ')
      if (at === -1) continue
      // Mood never touches patch or articulation, so `derived` cannot arise there (§3.2): the
      // only mark either can carry is the citation kind.
      expect(line.slice(at + 3), line).toMatch(/^(manual|observed)$/)
    }
    expect(bullets.some((l) => / · (manual|observed)$/.test(l))).toBe(true)
  })

  it('renders a derived value as the move that produced it, and names the knob', () => {
    const doc = renderGuide(golden())
    // The golden kick: TUNE 52, darkness 80, mood offset -12 per §6.1.
    const tune = phaseBody(doc, 6).find((l) => l.startsWith('- **TUNE**'))
    expect(tune).toBeDefined()
    expect(tune).toContain('52 → 45')
    expect(tune).toContain('manual · moved by darkness')
  })

  it('leaves an unverified point unmarked, and gives it no citation to borrow authority from', () => {
    const doc = renderGuide(golden())
    const body = phaseBody(doc, 6)
    const mode = body.findIndex((l) => l.startsWith('- **MODE**'))
    expect(mode).toBeGreaterThan(-1)
    // Unmarked is the norm and says nothing about the value beyond what it is: a starting point.
    expect(body[mode]).not.toContain(' · ')
    expect(body[mode]).not.toContain('nobody has checked')
    // Still no value citation, which is the claim that would be false.
    expect(body[mode + 1] ?? '').not.toContain(`${SUBORDINATE.cite} value`)
  })

  it('cites the point and the range as two separate claims (§3.1)', () => {
    const body = phaseBody(renderGuide(golden()), 6)
    const resonance = body.findIndex((l) => l.startsWith('- **RESONANCE**'))
    expect(resonance).toBeGreaterThan(-1)

    // Point observed on the unit, and said out loud under the value it is about: a value
    // citation is a claim about one number and never hoists.
    expect(body[resonance + 1]).toBe(
      `  - ${SUBORDINATE.cite} value observed — golden unit, firmware 1.11`,
    )

    // Range read off the page, and still said out loud — once, at the head of the recipe that
    // repeats it, rather than under every line of it.
    const heading = body.slice(0, resonance).findLastIndex((l) => l.startsWith('#### '))
    expect(heading).toBeGreaterThan(-1)
    const recipe = body.slice(heading, resonance)
    expect(recipe.join('\n')).toContain('*Ranges cite manual — Golden Manual p.12.*')
  })

  it('says an unverified range is why mood did nothing, rather than leaving it unexplained', () => {
    const body = phaseBody(renderGuide(golden()), 6)
    const attack = body.findIndex((l) => l.startsWith('- **ATTACK**'))
    expect(attack).toBeGreaterThan(-1)
    expect(body.slice(attack, attack + 3).join('\n')).toContain('range unverified')
  })
})

// ---------------------------------------------------------------------------
// #29 — the unit and the range travel with the value
// ---------------------------------------------------------------------------

describe('numeric values carry unit and range (#29)', () => {
  it('renders the range beside every numeric, and the unit on both when there is one', () => {
    const body = phaseBody(renderGuide(golden()), 6)
    expect(body.find((l) => l.startsWith('- **CUTOFF**'))).toContain('Hz (0…127 Hz)')
    expect(body.find((l) => l.startsWith('- **TUNE**'))).toContain('(0…100)')
  })

  it('gives an enum no range, because its legality gate is `options` and not bounds (§3.2)', () => {
    const mode = phaseBody(renderGuide(golden()), 6).find((l) => l.startsWith('- **MODE**'))
    expect(mode).toBeDefined()
    expect(mode).not.toContain('…')
  })

  it('reads correctly for a bipolar range, which an en dash would not', () => {
    const result = golden()
    const bipolar = result.assignments
      .flatMap((a) => a.params)
      .find((p) => p.range !== undefined && p.range.min < 0)
    // The golden rig authors none, so this asserts the formatting rule directly instead.
    expect(bipolar).toBeUndefined()
    const doc = renderGuide({
      ...result,
      assignments: [
        {
          ...(result.assignments[0] as (typeof result.assignments)[number]),
          params: [
            {
              name: 'PITCH',
              value: -3,
              unit: 'St',
              range: { min: -24, max: 24, verified: { kind: 'manual', source: 'p.1' } },
              provenance: { state: 'authored', cite: { kind: 'manual', source: 'p.1' } },
            },
          ],
        },
        ...result.assignments.slice(1),
      ],
    })
    expect(phaseBody(doc, 6).find((l) => l.startsWith('- **PITCH**'))).toContain(
      '`-3` St (-24…24 St)',
    )
  })
})

// ---------------------------------------------------------------------------
// #32 — spelling, enharmonic, MIDI
// ---------------------------------------------------------------------------

/** F minor, degree 7 from `baseOctave` 2: Eb3, which a sharps-only box calls D#3. */
const FLAT_HOOK: Hook = {
  id: 'flat-hook',
  forRole: 'lead',
  bars: 1,
  baseOctave: 2,
  notes: [
    { step: 1, degree: 7, octave: 0, len: 1 },
    { step: 5, degree: 1, octave: 0, len: 1 },
  ],
}

const FLAT_TEMPLATE: Template = {
  ...GOLDEN_TEMPLATE,
  keys: ['F minor'],
  hooks: [FLAT_HOOK],
}

describe('template-internal ids stay internal (§8)', () => {
  it('names no pattern or hook id, and does not explain which one the seed took', () => {
    const result = golden()
    const doc = renderGuide(result)
    const ids = [
      ...result.template.patterns.map((p) => p.id),
      ...result.template.hooks.map((h) => h.id),
    ]
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(doc, id).not.toContain(id)
    expect(doc).not.toContain('the seed picked this one')
    // The fact worth keeping is stated once instead, in the phase intro.
    expect(doc.split('rerolling the seed picks a different one')).toHaveLength(2)
  })
})

describe('hook notes (#32, §4.1)', () => {
  const doc = renderGuide(
    resolve({
      devices: GOLDEN_DEVICES,
      template: FLAT_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    }),
  )
  const body = phaseBody(doc, 4)

  it('explains the grid and the chord rule once, near the notes, rather than per note', () => {
    const doc4 = body.join('\n')
    expect(doc4.split('Notes sharing a step are one chord')).toHaveLength(2)
    // The frame a reader needs to know what `step 33` means without doing arithmetic.
    expect(doc4).toContain('16 to a bar')
  })

  it('puts a chord on one line, framed by bar, with the degree named rather than numbered', () => {
    const eFlat = body.find((l) => l.includes('`Eb3`')) as string
    expect(eFlat).toBe('- bar 1 · step 1 · sounds for 1 step · `Eb3` (`D#3`) · 7th · MIDI 51')
  })

  it('groups notes that share a step into one chord instead of listing them separately', () => {
    // Three notes at one step is a triad, and one row per note hides that.
    const triad: Hook = {
      id: 'triad-hook',
      forRole: 'lead',
      bars: 1,
      baseOctave: 3,
      notes: [
        { step: 1, degree: 1, octave: 0, len: 2 },
        { step: 1, degree: 3, octave: 0, len: 2 },
        { step: 1, degree: 5, octave: 0, len: 2 },
      ],
    }
    const chordDoc = renderGuide(
      resolve({
        devices: GOLDEN_DEVICES,
        template: { ...GOLDEN_TEMPLATE, keys: ['A minor'], hooks: [triad] },
        mood: GOLDEN_MOOD,
        seed: GOLDEN_SEED,
      }),
    )
    const rows = phaseBody(chordDoc, 4).filter((l) => l.startsWith('- bar '))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain('`A3` `C4` `E4`')
    expect(rows[0]).toContain('root 3rd 5th')
    expect(rows[0]).toContain('MIDI 57 60 64')
  })

  it('keeps the key-correct spelling and offers the sharps-only reading beside it', () => {
    const eFlat = body.find((l) => l.includes('`Eb3`'))
    expect(eFlat, body.join('\n')).toBeDefined()
    expect(eFlat).toContain('`D#3`')
    expect(eFlat).toContain('51')
  })

  it('omits the enharmonic where it does not differ, rather than printing `F2 (F2)`', () => {
    const f = body.find((l) => l.includes('`F2`'))
    expect(f).toBeDefined()
    expect(f).not.toMatch(/\(`/)
  })

  it('says a hook belongs to no assigned part instead of implying one plays it', () => {
    // Nothing in the golden rig serves `lead`.
    expect(body.join('\n')).toContain('Nothing in your rig plays this part')
  })

  it('omits the hook rather than inventing one when the template authors none', () => {
    const doc2 = renderGuide(
      resolve({
        devices: GOLDEN_DEVICES,
        template: { ...GOLDEN_TEMPLATE, hooks: [] },
        mood: GOLDEN_MOOD,
        seed: GOLDEN_SEED,
      }),
    )
    expect(phaseBody(doc2, 4).join('\n')).toContain('This template has no hooks.')
  })
})

// ---------------------------------------------------------------------------
// §8.1 — hints are suppressible without touching anything else
// ---------------------------------------------------------------------------

describe('hints (§8.1, invariant 7)', () => {
  const doc = renderGuide(golden())

  it('puts every hint on its own tagged line, never inline after a value', () => {
    const hints = lines(doc).filter((l) => l.includes(SUBORDINATE.hint))
    expect(hints.length).toBeGreaterThan(0)
    for (const line of hints) {
      expect(line.trimStart().startsWith(`- ${SUBORDINATE.hint}`), line).toBe(true)
    }
  })

  it('suppressing hints removes the hint lines and changes nothing else', () => {
    const kept = lines(doc).filter((l) => !l.includes(SUBORDINATE.hint))
    expect(renderGuide(golden(), { hints: false })).toBe(kept.join('\n'))
  })

  it('resolves an articulation hint through the device table it keys into', () => {
    // `apply-cycle` is a key in the Golden Drum's `hints`; the jog is what a reader needs.
    expect(doc).toContain(`${SUBORDINATE.hint} Hold STEP, MENU, C5 knob`)
    expect(doc).not.toContain(`${SUBORDINATE.hint} apply-cycle`)
  })

  it('keeps hints under ~8 words, because a hint is a jog and not documentation', () => {
    for (const line of lines(doc).filter((l) => l.includes(SUBORDINATE.hint))) {
      const words = line.slice(line.indexOf(SUBORDINATE.hint) + SUBORDINATE.hint.length).trim()
      expect(words.split(' ').length, line).toBeLessThanOrEqual(10)
    }
  })
})

// ---------------------------------------------------------------------------
// Read at the machine, on a phone
// ---------------------------------------------------------------------------

describe('at-the-machine layout (§8, §10)', () => {
  const result = golden()
  const doc = renderGuide(result)

  it('merges sections that program identically into one block', () => {
    // Two sections at the same energy ask for the same band (§6.3), so one continuous part
    // programs both the same way: one block naming both, not the same sixteen steps twice.
    // Drop is louder and asks for band 3, so it stays its own block.
    const flat = renderGuide(
      resolve({
        devices: GOLDEN_DEVICES,
        template: {
          ...GOLDEN_TEMPLATE,
          structure: [
            { name: 'Intro', bars: 16, energy: 0.5 },
            { name: 'Build', bars: 16, energy: 0.5 },
            { name: 'Drop', bars: 32, energy: 0.9 },
          ],
        },
        mood: GOLDEN_MOOD,
        seed: GOLDEN_SEED,
      }),
    )
    const body = phaseBody(flat, 5)
    const kick = body.indexOf('### `kick` — Golden Drum · BD')
    expect(kick).toBeGreaterThan(-1)
    const next = body.findIndex((l, i) => i > kick && l.startsWith('### '))
    const block = body.slice(kick, next)
    expect(block.filter((l) => l.startsWith('**'))).toEqual([
      // No pattern id in the headline: template-internal, and meaningless at a machine.
      '**hard kick** — settings in Sound design',
      '**Intro, Build** — 16 steps, band 2',
      '**On this box** — Golden Drum',
      '**Drop** — 16 steps, band 2 — nothing authored at band 3',
      '**On this box** — Golden Drum',
    ])
  })

  it('does not merge sections that agree on the variant but not on the band it fell back from', () => {
    // The golden hat has a band-1 variant everywhere and a band-2 variant in Drop only. Intro
    // and Build both land on `p-hat-b1` — but they asked for different bands, because their
    // energies differ (§6.3), and merging them would hide what the arrangement did.
    const body = phaseBody(doc, 5)
    const hat = body.indexOf('### `closed-hat` — Golden Drum · CH')
    const next = body.findIndex((l, i) => i > hat && l.startsWith('### '))
    const headlines = body
      .slice(hat, next)
      .filter((l) => l.startsWith('**') && l.includes(' steps, band '))
    expect(headlines).toEqual([
      '**Intro** — 16 steps, band 1 — nothing authored at band 0',
      '**Build** — 16 steps, band 1 — nothing authored at band 2',
      '**Drop** — 16 steps, band 2 — nothing authored at band 3',
    ])
  })

  it('hoists a velocity shared by every hit in a slot, rather than repeating it', () => {
    // A band-3 ghost slot is eight sixteenths at one velocity. Per-hit that is a 105-character
    // line that wraps three times on the phone §10 says this is read on, and the repetition
    // buries the step numbers, which are the thing being scanned for.
    const body = phaseBody(doc, 5)
    for (const line of body.filter((l) => l.startsWith('- `'))) {
      expect(line.length, line).toBeLessThan(80)
    }
    const t: Template = {
      ...GOLDEN_TEMPLATE,
      structure: [{ name: 'Drop', bars: 32, energy: 0.5 }],
      roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
      patterns: [
        {
          id: 'p-kick-b2',
          forRole: 'kick',
          band: 2,
          length: 16,
          hits: [
            { step: 2, slot: 'ghost', velocity: 42 },
            { step: 4, slot: 'ghost', velocity: 42 },
            { step: 6, slot: 'ghost', velocity: 42 },
            { step: 1, slot: 'accent', velocity: 110 },
            { step: 9, slot: 'accent', velocity: 96 },
            { step: 13, slot: 'downbeat' },
          ],
        },
      ],
    }
    const steps = phaseBody(
      renderGuide(
        resolve({ devices: GOLDEN_DEVICES, template: t, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
      ),
      5,
    )
    expect(steps).toContain('- `ghost` — 2, 4, 6 (all vel 42)')
    // Velocities that differ stay per hit: the shared figure is the only thing worth hoisting.
    expect(steps).toContain('- `accent` — 1 (vel 110), 9 (vel 96)')
    expect(steps).toContain('- `downbeat` — 13')
  })

  it('renders the trajectory as one line per group, labelled by the band asked for', () => {
    // §6.3's grouping is derived in `lib/core/arrangement.ts` and tested there; what this
    // pins is the shape of the line a reader holds.
    const arrangement = variations(renderGuide(sameBandGuide()))
    expect(arrangement.some((l) => l.startsWith('- **band 2** — Intro, Build'))).toBe(true)
    expect(arrangement.some((l) => l.startsWith('- **band 3** — Drop'))).toBe(true)
  })

  it('says nothing phase 1, 2 or 3 already said', () => {
    // The section it replaced printed the device list, a bars-and-energy table and every role
    // under every section heading — three lists that existed elsewhere in the same document.
    const arrangement = variations(doc).join('\n')
    for (const device of result.devices) expect(arrangement, device.name).not.toContain(device.name)
    expect(arrangement).not.toContain('energy')
    expect(arrangement).not.toContain('bars')
    // Which sections a part occupies is phase 2's, including for a part that comes and goes:
    // it was briefly repeated here, and it was `a.sections` printed a second time.
    expect(arrangement).not.toContain('come and go')
    for (const a of result.assignments) {
      expect(arrangement, a.role).not.toContain(a.sections.join(', '))
    }
  })

  it('never words a fallback as though the band asked for were playing (§6.3)', () => {
    // The golden scenario authors band 2 only, so its Intro asks band 0 and gets band 2. A line
    // reading "band 0 — Intro" with nothing after it would be a lie about what is on the box.
    const arrangement = variations(doc).join('\n')
    expect(arrangement).toMatch(/\*\*band 0\*\* — Intro · [^\n]*plays? band 2/)
    expect(arrangement).toMatch(/\*\*band 3\*\* — Drop · [^\n]*plays? band 2/)
    // ...and it does not reprint the grid, the slots or the articulation: that is phase 5.
    expect(arrangement).not.toContain('`downbeat`')
    expect(arrangement).not.toContain('```')
  })

  it('words a section where every part fell back as one clause, not a roll-call', () => {
    const t: Template = {
      ...GOLDEN_TEMPLATE,
      structure: [{ name: 'Drop', bars: 32, energy: 0.9 }],
      roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
      patterns: GOLDEN_TEMPLATE.patterns.filter((p) => p.forRole === 'kick'),
    }
    const arrangement = variations(
      renderGuide(
        resolve({ devices: GOLDEN_DEVICES, template: t, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
      ),
    ).join('\n')
    // The clause, not its position: #152's size summary is the first note, so the fallback
    // clause no longer abuts the label. What this test is about is that one clause stands in
    // for a roll-call of every part, and that is unchanged.
    expect(arrangement).toContain('- **band 3** — Drop · ')
    expect(arrangement).toContain('· every part plays band 2')
    expect(arrangement).not.toContain('`kick` plays band 2')
  })

  it('words the two kinds of silence differently, and hoists only the permanent one', () => {
    const arrangement = variations(doc).join('\n')
    expect(arrangement).toContain('`bass-mid` and `tom` have no pattern authored at any band')
    expect(arrangement).not.toContain('`bass-mid` has nothing authored here')

    // Authored, but only in the Drop: silence in the Intro is a fact about that group.
    const t: Template = {
      ...GOLDEN_TEMPLATE,
      structure: [
        { name: 'Intro', bars: 16, energy: 0.5 },
        { name: 'Drop', bars: 32, energy: 0.5 },
      ],
      roles: GOLDEN_TEMPLATE.roles.filter((r) => r.id === 'r-kick'),
      patterns: GOLDEN_TEMPLATE.patterns
        .filter((p) => p.forRole === 'kick')
        .map((p) => ({ ...p, sections: ['Drop' as SectionName] })),
    }
    const scoped = variations(
      renderGuide(
        resolve({ devices: GOLDEN_DEVICES, template: t, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
      ),
    ).join('\n')
    expect(scoped).toContain('`kick` has nothing authored here')
    expect(scoped).not.toContain('no pattern authored at any band')
  })

  it('merging loses no section — every section a part occupies is still named', () => {
    const body = phaseBody(doc, 5).join('\n')
    for (const a of result.assignments) {
      for (const section of a.sections) {
        expect(body, `${a.role} ${section}`).toContain(section)
      }
    }
  })

  it('uses no table past the song phase, so nothing needs sideways scrolling', () => {
    // Phase 1's tables are two and three narrow columns and fit a phone; the five-column
    // tables that did not are gone, replaced by blocks that wrap.
    for (let phase = 2; phase <= GUIDE_PHASES.length; phase++) {
      const rows = phaseBody(doc, phase).filter((l) => l.startsWith('|'))
      expect(rows, `phase ${phase}`).toEqual([])
    }
  })

  it('states every assignment fact per part, in §8 order, without a table', () => {
    const body = phaseBody(doc, 2)
    const kick = body.findIndex((l) => l.startsWith('- **`kick`**'))
    expect(kick).toBeGreaterThan(-1)
    expect(body[kick]).toBe('- **`kick`** → Golden Drum · BD — *hard kick*')
    expect(body[kick + 1]).toBe('  - p1 · exact `hard` · every section')
  })

  it('names the sections a transient part occupies rather than saying "every"', () => {
    const body = phaseBody(doc, 2).join('\n')
    // The golden snare is a gap, so use the rig that carries one: `sub` is continuous here and
    // every assigned part is too, which is what makes the transient wording worth pinning.
    expect(body).toContain('every section')
    const transient = renderGuide(
      resolve({
        devices: GOLDEN_DEVICES,
        template: {
          ...GOLDEN_TEMPLATE,
          roles: GOLDEN_TEMPLATE.roles.map((r) =>
            r.id === 'r-kick' ? { ...r, sustain: 'transient' as const, sections: ['Drop'] } : r,
          ),
        },
        mood: GOLDEN_MOOD,
        seed: GOLDEN_SEED,
      }),
    )
    expect(phaseBody(transient, 2).join('\n')).toContain('· Drop')
  })
})

// ---------------------------------------------------------------------------
// Invariant 5 — gaps are shown, never filled
// ---------------------------------------------------------------------------

describe('gaps (invariant 5, §7.3)', () => {
  const result = golden()
  const doc = renderGuide(result)

  it('lists every unfilled request, and never as an assignment', () => {
    const body = phaseBody(doc, 2).join('\n')
    expect(result.shortfalls.length).toBeGreaterThan(0)
    for (const gap of result.shortfalls) expect(body).toContain(`\`${gap.role}\``)
  })

  /**
   * #81. The fixture reaches all three, which is why it is the one asserted here: a rig limit
   * (`tom`, contended), an unwritten recipe (`snare`) and two parts the direction declared it is
   * finished without (`acid`, `texture`).
   *
   * Asserted as three sections rather than three sentences, because the defect was never a
   * missing word — it was one heading over three unrelated situations, so a reader of a line
   * could not tell whose problem it was. The heading is what carries that, and each line says
   * only the specific thing.
   */
  it('separates the three things an absence can mean, under three headings (§7.3)', () => {
    const body = phaseBody(doc, 2).join('\n')
    const section = (heading: string) =>
      body.split(`### ${heading}`)[1]?.split('\n### ')[0] ?? ''

    expect(section('Gaps')).toContain('This rig cannot make these parts')
    expect(section('Gaps')).toContain('`tom`')
    // The backlog section says whose job it is, and never that the box fell short.
    expect(section('Waiting on us')).toContain('our backlog, not a limit of your boxes')
    expect(section('Waiting on us')).toContain('`snare`')
    expect(section('Waiting on us')).not.toContain('cannot')
    // Not a hole: the direction's own sentence, not a diagnosis of the rig.
    expect(section('Not needed for this direction')).toContain('Golden Techno is finished without')
    expect(section('Not needed for this direction')).toContain('texture here is a bonus')

    // And no line appears under two headings, which is the collapse this replaced.
    for (const role of ['tom', 'snare', 'texture']) {
      const headings = ['Gaps', 'Waiting on us', 'Not needed for this direction'].filter((h) =>
        section(h).includes(`\`${role}\``),
      )
      expect(headings, `${role} is in ${headings.length} sections`).toHaveLength(1)
    }
  })

  it('distinguishes "buy a box" from "author a recipe"', () => {
    const body = phaseBody(doc, 2).join('\n')
    // The `no-such-role` sentence needs a rig-limit gap of its own, and this fixture's is
    // `acid` — which the direction excuses, so the sentence is asserted where it is said.
    expect(body).toContain('the Golden Drum LT is carrying tom')
    expect(body).toContain('could carry it, dial it by ear')
    // "capable but unauthored" is gone from the line: the heading above it says that once.
    expect(body).not.toContain('capable but unauthored')
  })

  it('reports a band fallback rather than letting the density knob look broken (§6.3)', () => {
    expect(phaseBody(doc, 5).join('\n')).toContain('nothing authored at band 2')
  })
})

// ---------------------------------------------------------------------------
// Rig integration
// ---------------------------------------------------------------------------

describe('rig integration (§7.4)', () => {
  it('names the clock source, its transport and what it carries', () => {
    const body = phaseBody(renderGuide(golden()), 3).join('\n')
    expect(body).toContain('Clock source')
    expect(body).toContain('Golden Tracker')
    expect(body).toContain('midi-din')
  })

  it('says so when nothing in the rig can send clock, rather than nominating one that cannot', () => {
    const receiversOnly = GOLDEN_DEVICES.map((d) => ({
      ...d,
      clock: { ...d.clock, canSendClock: false },
    }))
    const doc = renderGuide(
      resolve({
        devices: receiversOnly,
        template: GOLDEN_TEMPLATE,
        mood: GOLDEN_MOOD,
        seed: GOLDEN_SEED,
      }),
    )
    expect(phaseBody(doc, 3).join('\n')).toContain('nothing in this rig can send clock')
  })

  // A mixer or a recorder may do neither, and the line was a two-way branch: every box that
  // could not send was told it "receives clock only". Wrong about the box, and wrong about the
  // wire too, since it then named a transport no clock travels on.
  it('distinguishes all four clock capabilities, not just send versus not-send', () => {
    const cases: [boolean, boolean, string][] = [
      [true, true, 'clock: sends clock · midi-din/usb'],
      [true, false, 'clock: sends clock, cannot receive · midi-din/usb'],
      [false, true, 'clock: receives clock only · midi-din/usb'],
      [false, false, 'clock: no clock in or out'],
    ]
    for (const [canSendClock, canReceiveClock, expected] of cases) {
      const devices = GOLDEN_DEVICES.map((d) =>
        d.name === 'Golden Drum' ? { ...d, clock: { ...d.clock, canSendClock, canReceiveClock } } : d,
      )
      const doc = renderGuide(
        resolve({ devices, template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
      )
      const body = phaseBody(doc, 3)
      const start = body.findIndex((l) => l.startsWith('- **Golden Drum**'))
      expect(body[start + 1]).toBe(`  - ${expected}`)
    }
  })

  // "Sync everything else to it" is an instruction, and a box that cannot receive cannot obey.
  //
  // The exempted box is **Golden Cascade, which cannot send clock either**, and that is the whole
  // point of choosing it. This case used to mutate Golden Drum, which can send — so the fixture
  // was one §7.4 ranking change away from electing the very box it wanted exempted, and a
  // revision that briefly ranked `!canReceiveClock` did exactly that. A box that cannot be the
  // source cannot spring that trap, whatever §7.4 does next.
  it('exempts boxes that cannot receive clock from the sync instruction, by name', () => {
    const devices = GOLDEN_DEVICES.map((d) =>
      d.name === 'Golden Cascade' ? { ...d, clock: { ...d.clock, canReceiveClock: false } } : d,
    )
    const result = resolve({ devices, template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })
    // Pin that first, or the assertions below are checking a sentence about the wrong box.
    expect(result.clockSource?.deviceName).not.toBe('Golden Cascade')
    const body = phaseBody(renderGuide(result), 3).join('\n')
    expect(body).toContain('except Golden Cascade')
    expect(body).toContain('cannot receive clock')
  })

  /**
   * The same clause, against the **shipped registry** rather than the golden fixtures.
   *
   * §7.4's fixtures churned three times in one session — load removed, a source-only key added
   * and removed, a `kind` key added and removed — and one of them was found to be a single
   * ranking change away from electing the very box it wanted exempted. This case is deliberately
   * not written in terms of who wins: it asserts the winner is someone else *first*, so it
   * cannot quietly become vacuous the next time the ranking moves.
   */
  it('names every deaf box in the real registry, whoever ends up leading', () => {
    const template = TEMPLATES[0]
    if (template === undefined) throw new Error('no templates')
    const result = resolve({ devices: DEVICES, template, mood: NEUTRAL_MOOD, seed: 1 })
    const deaf = DEVICES.filter((d) => !d.clock.canReceiveClock)
    expect(deaf.length).toBeGreaterThan(0)

    const body = phaseBody(renderGuide(result), 3).join('\n')
    for (const device of deaf) {
      // A box that is itself the source is not a follower and must not be exempted from
      // following. Pin which case we are in rather than assuming.
      if (result.clockSource?.deviceId === device.id) continue
      expect(body, device.id).toContain(`except`)
      expect(body, device.id).toContain(device.name)
    }
    expect(body).toContain('cannot receive clock')

    // And absent when nothing in the rig is deaf, or the loop above is checking a sentence the
    // renderer prints unconditionally.
    //
    // **Every box that can follow *over the resolved transport*, not merely every box that can
    // receive** (§7.4). Filtering on the capability alone left the Metropolix in — it is not deaf,
    // it has `usb` and `analog-clock` and no MIDI DIN at all, every MIDI socket it can reach being
    // an accessory — so this rig kept an exemption clause and the assertion below was reading a
    // sentence that was still qualified. Filtered by receive transport, and the source's transport
    // pinned rather than assumed, so the rig genuinely is one where everything follows.
    const hearing = DEVICES.filter((d) => receiveTransports(d).includes('midi-din'))
    expect(hearing.some((d) => d.clock.canSendClock)).toBe(true)
    const clean = resolve({ devices: hearing, template, mood: NEUTRAL_MOOD, seed: 1 })
    expect(clean.clockSource?.transport).toBe('midi-din')
    const cleanBody = phaseBody(renderGuide(clean), 3).join('\n')
    expect(cleanBody).not.toContain('cannot receive clock')
    expect(cleanBody).not.toContain('runs free')
    expect(cleanBody).toContain('Sync everything else to it.')
  })

  /**
   * §7.4. **The second reason a box cannot obey "sync to it": the wire, not the capability.**
   *
   * The golden fixture is exactly this case and always was — `A-cascade` receives clock over
   * `usb` and nothing else, while the rig resolves `midi-din` — and the guide said "Sync
   * everything else to it." flat, because the clause was written against `canReceiveClock` and
   * the Cascade answers that `true`. The rack's `isolationReason` had asked the narrower question
   * since it was written, so the diagram drew the box as unreachable while the sentence above it
   * said to sync it. One of the two was wrong about the fixture for as long as both existed.
   *
   * This is not a Mother-32 problem. It is what made the Mother-32's asymmetry worth a schema
   * change rather than a comment: the shipped registry has a box with no MIDI DIN at all (the
   * Metropolix, whose every MIDI socket is an accessory), and the full rig was telling a reader
   * to sync it over MIDI DIN.
   */
  it('exempts a box that receives clock but not over the transport this rig resolved', () => {
    const body = phaseBody(renderGuide(golden()), 3).join('\n')
    expect(body).toContain('Golden Cascade')
    expect(body).toContain('has no `midi-din` input and runs free')
    // Not the deaf clause: this box receives clock perfectly well, over a wire this rig is not
    // using. Saying "cannot receive clock" about it would be a different claim, and false.
    expect(body).not.toContain('cannot receive clock')
  })

  it('derives mixer channels from declared outs alone', () => {
    const body = phaseBody(renderGuide(golden()), 3).join('\n')
    // 3 parts on a box with no individual outs: one stereo channel, not three invented ones.
    expect(body).toContain('mixer: 3 parts, no individual outs')
  })

  /**
   * §2.3 gained `io.main: 'none'` for a box with no audio path at all — a Eurorack sequencer has
   * pitch, gate, modulation and clock outputs and nothing to plug into a mixer. Both renderers
   * had to stop printing a main out that does not exist; invariant 5 forbids inventing an
   * assignment to fill a hole, and a fictional output is the same fault in different clothes.
   */
  describe('a device with no audio output at all (§2.3)', () => {
    /** Golden Drum with its audio path removed and nothing put in its place. */
    function silent(over: Partial<Device['io']> = {}): Device[] {
      return GOLDEN_DEVICES.map((d) =>
        d.name === 'Golden Drum'
          ? { ...d, io: { main: 'none' as const, individualOuts: 0, audioIn: false, usbAudio: false, ...over } }
          : d,
      )
    }

    /** The `n`th sub-line of Golden Drum's block, with its bullet stripped. */
    function subLine(devices: Device[], n: number): string {
      const body = phaseBody(
        renderGuide(resolve({ devices, template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED })),
        3,
      )
      const start = body.findIndex((l) => l.startsWith('- **Golden Drum**'))
      return (body[start + n] ?? '').trim().replace(/^- /, '')
    }

    const audioLine = (devices: Device[]) => subLine(devices, 2)
    const mixerLine = (devices: Device[]) => subLine(devices, 3)

    it('says so plainly rather than naming a bus that is not there', () => {
      expect(audioLine(silent())).toBe('audio: no audio I/O')
    })

    it('still lists the audio it does have, when it has some', () => {
      // `none` says there is no *main* bus, not that there is no audio anywhere. A box can have
      // individual outs, an input or USB audio and still have nothing to call a main out.
      expect(audioLine(silent({ individualOuts: 2 }))).toBe('audio: 2 individual outs')
      expect(audioLine(silent({ audioIn: true, usbAudio: true }))).toBe('audio: USB audio · audio in')
    })

    it('never names a main bus in the channel plan either', () => {
      // **The latent trap, tested rather than reasoned about.** `mixerText` interpolates
      // `io.main` into prose, so `none` would print "one none channel for all". No device in the
      // library can reach it today — a box with no audio path also has no assignables, so the
      // `parts === 0` early return fires first — but that is a guarantee in a different
      // function, which is not a guarantee at all.
      const mixer = mixerLine(silent())
      expect(mixer).not.toContain('none channel')
      expect(mixer).not.toContain('none out')
      // Golden Drum carries parts, so this is the sentence a real box would get.
      expect(mixer).toBe('mixer: 3 parts, no audio output: nothing to patch')
    })

    it('says where the parts that do not fit go, when some of them do', () => {
      // The other reachable branch: separable outs exist but do not cover every part, and there
      // is no main bus for the remainder to be summed to.
      expect(mixerLine(silent({ individualOuts: 2 }))).toBe(
        'mixer: 3 parts, 2 individual outs: 2 on their own channels, the rest have no output',
      )
    })

    it('renders the shared sentence rather than rebuilding one', () => {
      // **They are one function now** (#82). This used to pin that two byte-identical copies
      // agreed, which was the right guard while the duplication existed and the wrong fix for it:
      // it held the symptom still while every change had to be made twice. `ioText` and
      // `mixerText` live in `lib/core/guide.ts` and both renderers import them.
      //
      // What is left to check is narrower and still worth checking: that this renderer's rig
      // block reaches the guide through those functions rather than assembling the same words
      // again. It is imported here from `components/guide/format.ts`, which re-exports them, so
      // the assertion also covers that path staying wired to the same definition.
      for (const io of [
        { main: 'none' as const, individualOuts: 0, audioIn: false, usbAudio: false },
        { main: 'none' as const, individualOuts: 2, audioIn: true, usbAudio: false },
        { main: 'none' as const, individualOuts: 0, audioIn: false, usbAudio: true },
        { main: 'mono' as const, individualOuts: 0, audioIn: false, usbAudio: false },
        { main: 'stereo' as const, individualOuts: 4, audioIn: true, usbAudio: true },
      ]) {
        const devices = GOLDEN_DEVICES.map((d) => (d.name === 'Golden Drum' ? { ...d, io } : d))
        const device = devices.find((d) => d.name === 'Golden Drum') as Device
        const where = JSON.stringify(io)
        expect(audioLine(devices), where).toBe(`audio: ${ioText(device)}`)
        // Golden Drum carries three parts in this scenario, so that is the count both sides see.
        expect(mixerLine(devices), where).toBe(`mixer: ${mixerText(device, 3)}`)
      }
    })
  })

  it('keeps each box\'s clock, audio and channel plan together in one block', () => {
    const body = phaseBody(renderGuide(golden()), 3)
    const start = body.findIndex((l) => l.startsWith('- **Golden Drum**'))
    expect(start).toBeGreaterThan(-1)
    expect(body.slice(start, start + 4).join('\n')).toBe(
      [
        '- **Golden Drum** — drum-machine · 3 parts',
        '  - clock: sends clock · midi-din/usb',
        '  - audio: stereo main out · 8 individual outs · USB audio',
        '  - mixer: 3 parts, 8 individual outs: one channel each',
      ].join('\n'),
    )
  })
})

// ---------------------------------------------------------------------------
// Song
// ---------------------------------------------------------------------------

describe('song (§8 phase 1)', () => {
  it('states the key the seed chose and the alternatives a reroll could reach', () => {
    const body = phaseBody(renderGuide(golden()), 1).join('\n')
    expect(body).toContain('**Key** F minor')
    expect(body).toContain('a reroll may pick A minor')
  })

  it('renders the harmonic cycle and a bar-count energy map', () => {
    const body = phaseBody(renderGuide(golden()), 1).join('\n')
    expect(body).toContain('| VII | 2 |')
    expect(body).toContain('64 bars total')
    // #297. The bars-and-energy table became a grid, because the fact worth reading is which
    // parts play where and a three-column table could not hold it. Sections and bars are still
    // here; they are a header now rather than a row.
    expect(body).toMatch(/Drop\s/)
    expect(body).toMatch(/32b/)
  })

  it('never formats a number through a locale (§7.2)', () => {
    const doc = renderGuide(
      resolve({
        devices: GOLDEN_DEVICES,
        template: { ...GOLDEN_TEMPLATE, bpm: { min: 1000, max: 2000, default: 1234 } },
        mood: moodState(),
        seed: GOLDEN_SEED,
      }),
    )
    expect(doc).toContain('**BPM** 1234')
    expect(doc).not.toContain('1,234')
  })
})

// ---------------------------------------------------------------------------
// Voice — the guide tells you what to do, not what we decided
// ---------------------------------------------------------------------------

describe('copy says what is true, not what we declined to do', () => {
  const docs = [
    renderGuide(golden()),
    renderGuide(
      resolve({ devices: [], template: GOLDEN_TEMPLATE, mood: GOLDEN_MOOD, seed: GOLDEN_SEED }),
    ),
  ]

  it('never narrates its own restraint', () => {
    // Not inventing things is the job, not news. A reader cares what is there and what is not.
    for (const doc of docs) {
      expect(doc).not.toContain('was invented')
      expect(doc).not.toContain('nothing was invented')
    }
  })

  it('never cites our own design document at a reader who does not have it', () => {
    for (const doc of docs) expect(doc).not.toContain('§')
  })

  it('does not use our word for our data structures', () => {
    for (const doc of docs) {
      expect(doc).not.toContain('not modelled')
      expect(doc).not.toContain('authors none')
    }
  })
})

// ---------------------------------------------------------------------------
// Range citations hoist when a recipe repeats one
// ---------------------------------------------------------------------------

/** A resolved numeric param with the given range citation, or an unverified range. */
function ranged(name: string, verified: Cite | false): ResolvedParam {
  return {
    name,
    value: 10,
    range: { min: 0, max: 100, verified },
    provenance: { state: 'provisional' },
  }
}

const P59: Cite = { kind: 'manual', source: 'Fixture Manual p.59' }
const P60: Cite = { kind: 'manual', source: 'Fixture Manual p.60' }
const OBSERVED59: Cite = { kind: 'observed', source: 'Fixture Manual p.59' }

describe('dominantRangeCite (§3.2, state it once)', () => {
  const cases: { name: string; params: ResolvedParam[]; expected: Cite | undefined }[] = [
    {
      name: 'uniform — every range cites one page',
      params: [ranged('A', P59), ranged('B', P59), ranged('C', P59)],
      expected: P59,
    },
    {
      name: 'exceptional — one param cites a different page',
      params: [ranged('A', P59), ranged('B', P59), ranged('C', P60)],
      expected: P59,
    },
    {
      name: 'ambiguous — two citations twice each, so neither dominates',
      params: [ranged('A', P59), ranged('B', P59), ranged('C', P60), ranged('D', P60)],
      expected: undefined,
    },
    {
      name: 'no repetition — one occurrence is not a pattern',
      params: [ranged('A', P59), ranged('B', P60)],
      expected: undefined,
    },
    {
      name: 'unverified ranges carry no citation to hoist',
      params: [ranged('A', false), ranged('B', false), ranged('C', false)],
      expected: undefined,
    },
    {
      name: 'an unverified range does not dilute a repeated one',
      params: [ranged('A', P59), ranged('B', P59), ranged('C', false)],
      expected: P59,
    },
    {
      name: 'cite.kind is part of identity — a manual and an observation are not one citation',
      params: [ranged('A', P59), ranged('B', OBSERVED59)],
      expected: undefined,
    },
    {
      name: 'nothing to hoist from a recipe with no ranges at all',
      params: [{ name: 'MODE', value: 'On', provenance: { state: 'provisional' } }],
      expected: undefined,
    },
  ]

  for (const { name, params, expected } of cases) {
    it(name, () => {
      expect(dominantRangeCite(params)).toEqual(expected)
    })
  }
})

describe('hoisted range citations in Sound design (§8)', () => {
  /** One device, one recipe, whose params carry the citations under test. */
  function guideFor(params: AuthoredParam[]): string {
    const device = box('A-hoist', {
      voices: [{ kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 }],
      recipes: [
        { id: 'r', role: 'kick', character: 'hard', voice: 'bd', title: 'hoist fixture', params },
      ],
    })
    return renderGuide(
      resolve({
        devices: [device],
        template: withRoles([request({ id: 'r-kick', role: 'kick' })]),
        mood: moodState(),
        seed: 1,
      }),
    )
  }

  function numeric(name: string, verified: Cite | false): AuthoredParam {
    return { kind: 'numeric', name, value: 10, range: { min: 0, max: 100, verified } }
  }

  it('states a uniform citation once and drops every per-parameter copy', () => {
    const body = phaseBody(guideFor([numeric('A', P59), numeric('B', P59), numeric('C', P59)]), 6)
    expect(body.filter((l) => l.includes('*Ranges cite manual — Fixture Manual p.59.*'))).toHaveLength(1)
    expect(body.filter((l) => l.includes('↳ cite: range'))).toHaveLength(0)
  })

  it('keeps the exception on its own line, which is the point of hoisting', () => {
    const body = phaseBody(guideFor([numeric('A', P59), numeric('B', P59), numeric('C', P60)]), 6)
    expect(body.filter((l) => l.includes('*Ranges cite manual — Fixture Manual p.59.*'))).toHaveLength(1)
    const kept = body.filter((l) => l.includes('↳ cite: range'))
    expect(kept).toHaveLength(1)
    expect(kept[0]).toContain('p.60')
  })

  it('hoists nothing when two citations tie, and leaves every line in place', () => {
    const body = phaseBody(
      guideFor([numeric('A', P59), numeric('B', P59), numeric('C', P60), numeric('D', P60)]),
      6,
    )
    expect(body.filter((l) => l.includes('Ranges cite'))).toHaveLength(0)
    expect(body.filter((l) => l.includes('↳ cite: range'))).toHaveLength(4)
  })

  it('never hoists a value citation — that is a claim about one number', () => {
    const body = phaseBody(
      guideFor([
        { kind: 'numeric', name: 'A', value: 10, range: { min: 0, max: 100, verified: P59 }, verified: P59 },
        { kind: 'numeric', name: 'B', value: 20, range: { min: 0, max: 100, verified: P59 }, verified: P59 },
      ]),
      6,
    )
    // The shared range hoists; both value citations stay exactly where they are.
    expect(body.filter((l) => l.includes('Ranges cite'))).toHaveLength(1)
    expect(body.filter((l) => l.includes('↳ cite: value'))).toHaveLength(2)
  })

  it('leaves an unverified range alone — it is a different claim, not a repetition', () => {
    const body = phaseBody(
      guideFor([numeric('A', P59), numeric('B', P59), numeric('C', false)]),
      6,
    )
    expect(body.filter((l) => l.includes('Ranges cite'))).toHaveLength(1)
    expect(body.filter((l) => l.includes('range unverified'))).toHaveLength(1)
  })
})

/**
 * #107. `SWING` under four tracks and `SHUFFLE` under five voices was nine instructions to set
 * one control. `test/guide-view.test.ts` holds the landing rig those nine came from; these are
 * the rules, against a fixture, including the two a real device does not exercise: a recipe that
 * has nothing left after the hoist, and two devices that must not pool their settings.
 */
describe('pattern-global settings, hoisted to the device (§8/#107)', () => {
  function scoped(name: string, over: Partial<AuthoredParam> = {}): AuthoredParam {
    return {
      kind: 'numeric',
      name,
      value: 50,
      range: { min: 0, max: 100, verified: P59 },
      scope: 'pattern',
      ...over,
    } as AuthoredParam
  }

  /** Two voices of one device, so a scoped parameter has something to repeat under. */
  function twoParts(params: AuthoredParam[], id = 'A-scope'): Device {
    return box(id, {
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
      ],
      recipes: [
        { id: `${id}-k`, role: 'kick', character: 'hard', voice: 'bd', title: 'kick', params },
        { id: `${id}-s`, role: 'snare', character: 'hard', voice: 'sd', title: 'snare', params },
      ],
    })
  }

  function guideFor(...devices: Device[]): string[] {
    return phaseBody(
      renderGuide(
        resolve({
          devices,
          template: withRoles([
            request({ id: 'r-kick', role: 'kick' }),
            request({ id: 'r-snare', role: 'snare' }),
          ]),
          mood: moodState(),
          seed: 1,
        }),
      ),
      6,
    )
  }

  it('states it once above the parts, with its heading and its reason', () => {
    const body = guideFor(twoParts([scoped('SWING'), scoped('CUTOFF', { scope: undefined })]))
    expect(body.filter((l) => l.includes('**SWING**'))).toHaveLength(1)
    expect(body.filter((l) => l.includes('**Pattern-wide**'))).toHaveLength(1)
    expect(body.some((l) => l.includes('One setting for the whole pattern'))).toBe(true)
    // The unscoped parameter is untouched: two parts, two settings.
    expect(body.filter((l) => l.includes('**CUTOFF**'))).toHaveLength(2)
  })

  it('says what to do with a part whose every setting is device-level', () => {
    // "No settings authored for this recipe" would be false — they are authored, and they are
    // above. Nothing at all would leave a part heading with no body under it.
    const body = guideFor(twoParts([scoped('SWING')]))
    expect(body.filter((l) => l.includes('**SWING**'))).toHaveLength(1)
    expect(
      body.filter((l) => l.includes('Nothing to set for this part alone; every setting it has is above.')),
    ).toHaveLength(2)
    expect(body.filter((l) => l.includes('No settings authored for this recipe.'))).toHaveLength(0)
  })

  it('keeps two devices apart — a pattern is per box, not per rig', () => {
    // Both boxes author `SWING`, identically. Pooling them into one line would say the rig has
    // one swing control, and it has two.
    const body = guideFor(twoParts([scoped('SWING')], 'A-one'), twoParts([scoped('SWING')], 'B-two'))
    expect(body.filter((l) => l.includes('**SWING**'))).toHaveLength(2)
    expect(body.filter((l) => l.includes('**Pattern-wide**'))).toHaveLength(2)
  })

  it('leaves the parts alone when they disagree, rather than picking one', () => {
    // One recipe at 50, the other at 62. Hoisting either would claim it covers both.
    const device = box('A-clash', {
      voices: [
        { kind: 'fixed', id: 'bd', label: 'BD', roles: ['kick'], polyphony: 1 },
        { kind: 'fixed', id: 'sd', label: 'SD', roles: ['snare'], polyphony: 1 },
      ],
      recipes: [
        {
          id: 'clash-k', role: 'kick', character: 'hard', voice: 'bd', title: 'kick',
          params: [scoped('SWING')],
        },
        {
          id: 'clash-s', role: 'snare', character: 'hard', voice: 'sd', title: 'snare',
          params: [scoped('SWING', { value: 62 })],
        },
      ],
    })
    const body = guideFor(device)
    expect(body.filter((l) => l.includes('**Pattern-wide**'))).toHaveLength(0)
    expect(body.filter((l) => l.includes('**SWING**'))).toHaveLength(2)
  })

  it('prints the hoisted line evidence in full, with no shared-citation sentence over it', () => {
    // A device-level block has no "Ranges cite ..." heading to hoist under, so the line keeps its
    // own citation. The per-part list computes its own sentence from what is left in it.
    const body = guideFor(twoParts([scoped('SWING'), scoped('CUTOFF', { scope: undefined })]))
    const at = body.findIndex((l) => l.includes('**SWING**'))
    expect(body[at + 1]).toContain('↳ cite: range manual — Fixture Manual p.59')
  })
})

// ---------------------------------------------------------------------------
// Phase 7 — Master FX (#59)
// ---------------------------------------------------------------------------

/**
 * The block used to read `kind` and nothing else, so a rig containing a TR-1000 — a box with a
 * reverb, a delay, a master effect and an analog FX path silkscreened across the top of it —
 * was told "No effects unit or mixer in this rig". That is a false negative, not a gap shown
 * honestly (invariant 5), and these assertions are about the two ways it can come back: a box
 * that processes audio going unnamed, and a box that does not being named anyway.
 *
 * The rig is a fixture rather than the real library on purpose. What the real boxes say is
 * pinned byte for byte by `guide-golden.test.ts`; what is worth testing here is the *rule*,
 * including the two evidence kinds no shipped device has yet — a dedicated effects unit and a
 * mixer — which a golden file cannot cover because nobody has authored one.
 */
describe('Master FX names what processes audio (§8 phase 7)', () => {
  /** The Master FX block: its heading to the arrangement heading, blank lines dropped. */
  function masterFx(doc: string): string[] {
    const body = phaseBody(doc, 7)
    const start = body.indexOf('**Master FX**')
    expect(start, 'master FX heading').toBeGreaterThan(-1)
    const rest = body.slice(start + 1)
    const end = rest.indexOf('**Arrangement variations**')
    return (end === -1 ? rest : rest.slice(0, end)).filter((l) => l !== '')
  }

  /** The golden rig — which carries no effect at all — plus whatever is under test. */
  function fxBlock(...extra: Device[]): string[] {
    return masterFx(
      renderGuide(
        resolve({
          devices: [...GOLDEN_DEVICES, ...extra],
          template: GOLDEN_TEMPLATE,
          mood: GOLDEN_MOOD,
          seed: GOLDEN_SEED,
        }),
      ),
    )
  }

  const panel = (...labels: string[]): Device['panel'] => ({
    panelRiseMm: 100,
    verified: { kind: 'manual', source: 'Fixture p.1' },
    features: labels.map((text, i) => ({ kind: 'label' as const, x: i * 10, y: 10, text })),
  })

  const noise = box('B-noise', {
    name: 'Noisy Box',
    // Sound design, every one of them, and on three different boxes in the real library.
    panel: panel('DRIVE', 'FILTER', 'FDBK'),
    voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['lead'], polyphony: 1 }],
    recipes: [
      makeRecipe('noise-lead', 'lead', 'hard', 'v', {
        params: [
          { kind: 'numeric', name: 'OVERDRIVE', value: 40, range: { min: 0, max: 100, verified: false } },
          { kind: 'numeric', name: 'BIT DEPTH', value: 8, range: { min: 1, max: 16, verified: false } },
        ],
      }),
    ],
  })

  it('says so plainly when nothing in the rig processes audio', () => {
    expect(fxBlock()).toEqual([
      'Nothing in this rig processes audio. The master chain is yours at the desk.',
    ])
  })

  it('reads an effect off the panel the box declares, in the words silkscreened on it', () => {
    const fx = box('C-drum', {
      name: 'Effect Drum',
      panel: panel('ACCENT', 'REVERB', 'MASTER FX', 'ANALOG FX'),
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick'], polyphony: 1 }],
      recipes: [makeRecipe('fx-kick', 'kick', 'hard', 'v')],
    })
    // Panel order, not sorted: it is the order you read them standing at the box. `ACCENT`
    // shares the effect strip with them on a real panel and is not an effect.
    expect(fxBlock(fx)).toEqual([
      'The Effect Drum carries REVERB, MASTER FX and ANALOG FX on the panel; ' +
        'nothing else in this rig processes audio.',
    ])
  })

  it('reads an effect off a parameter a part in this guide sets', () => {
    // `acid` on purpose, not `lead`: the golden template requests `r-acid` and nothing in the
    // golden rig can play it, so this box gets the part and its parameters resolve. A box
    // offering a role the template never asks for would sit idle, and since #106 an idle box
    // contributes no parameter evidence — the assertion would then be about the wrong thing.
    const send = box('C-send', {
      name: 'Send Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['acid'], polyphony: 1 }],
      recipes: [
        makeRecipe('send-acid', 'acid', 'dirty', 'v', {
          params: [
            { kind: 'numeric', name: 'REVERB SEND', value: 8, range: { min: 0, max: 100, verified: false } },
            { kind: 'numeric', name: 'DELAY SEND', value: 12, range: { min: 0, max: 100, verified: false } },
          ],
        }),
      ],
    })
    // Code unit order here, unlike the panel: a parameter list has no reading order to preserve.
    expect(fxBlock(send)).toEqual([
      'The Send Box carries DELAY SEND and REVERB SEND in its recipes; ' +
        'nothing else in this rig processes audio.',
    ])
  })

  it('names an idle box without naming a control on it (#106)', () => {
    // The same box, offering a role the golden template never requests. Every parameter on it is
    // real and none of them resolved into this guide, so the section has no control to give.
    //
    // Two failures are pinned in one test, because the fix for either one is the other. Before
    // #106 this printed the same sentence as the test above — `DELAY SEND` and `REVERB SEND`,
    // named as though a page below set them, which is the box's capabilities wearing a per-guide
    // sentence. The narrowing that fixed that then dropped the box out of the section entirely,
    // and a rig whose only effects are on this box read as "Nothing in this rig processes audio"
    // — true of the guide, false of the rack the reader is standing at.
    const idle = box('C-idle', {
      name: 'Idle Box',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['lead'], polyphony: 1 }],
      recipes: [
        makeRecipe('idle-lead', 'lead', 'hard', 'v', {
          params: [
            { kind: 'numeric', name: 'REVERB SEND', value: 8, range: { min: 0, max: 100, verified: false } },
            { kind: 'numeric', name: 'DELAY SEND', value: 12, range: { min: 0, max: 100, verified: false } },
          ],
        }),
      ],
    })
    const block = fxBlock(idle)
    expect(block.join('\n')).not.toContain('SEND')
    expect(block).toEqual([
      'The Idle Box carries effects, though no part in this guide reaches them; ' +
        'nothing else in this rig processes audio.',
    ])
  })

  it('says the same of a box this guide gave a part that touches no effect', () => {
    // Not the idle case: this box is in the guide, with a part on the page. The part it got sets
    // no effect, and the recipe that would have is not the one that resolved. "No part in this
    // guide reaches them" is a claim about the effects rather than about the box being idle,
    // which is why the predicate is "none of its effect parameters resolved" and not "it has no
    // assignment".
    const quiet = box('C-quiet', {
      name: 'Quiet Box',
      // `acid`, for the reason the send box above uses it: the golden rig cannot play it, so
      // this box gets the part and its `dirty` recipe is the one that resolves.
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['acid'], polyphony: 1 }],
      recipes: [
        makeRecipe('quiet-acid', 'acid', 'dirty', 'v'),
        makeRecipe('quiet-acid-soft', 'acid', 'soft', 'v', {
          params: [
            { kind: 'numeric', name: 'REVERB SEND', value: 8, range: { min: 0, max: 100, verified: false } },
          ],
        }),
      ],
    })
    const result = resolve({
      devices: [...GOLDEN_DEVICES, quiet],
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    // The premise, asserted rather than assumed: the box is in the guide, and no effect
    // parameter of its reached the page. Without this the sentence below could be the idle one.
    const mine = result.assignments.filter((a) => a.deviceId === 'C-quiet')
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.flatMap((a) => a.params.map((p) => p.name))).not.toContain('REVERB SEND')
    expect(masterFx(renderGuide(result))).toEqual([
      'The Quiet Box carries effects, though no part in this guide reaches them; ' +
        'nothing else in this rig processes audio.',
    ])
  })

  it('does not add the idle clause to a box the panel already speaks for', () => {
    // The clause exists to stop a box disappearing, not to qualify one already named. This box
    // is silkscreened `CHORUS` and its unresolved `REVERB SEND` adds nothing to that — a second,
    // weaker clause under a panel label would say "it has effects" twice, the second time in
    // words that sound like a retraction.
    const panelled = box('C-panel', {
      name: 'Panel Box',
      panel: panel('CHORUS'),
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['lead'], polyphony: 1 }],
      recipes: [
        makeRecipe('panel-lead', 'lead', 'hard', 'v', {
          params: [
            { kind: 'numeric', name: 'REVERB SEND', value: 8, range: { min: 0, max: 100, verified: false } },
          ],
        }),
      ],
    })
    expect(fxBlock(panelled)).toEqual([
      'The Panel Box carries CHORUS on the panel; nothing else in this rig processes audio.',
    ])
  })

  it('names a dedicated unit as the unit it is, with the I/O it declares', () => {
    const unit = box('C-fx', {
      name: 'Rack FX',
      kind: 'fx-processor',
      io: { main: 'stereo', individualOuts: 0, audioIn: true, usbAudio: false },
    })
    expect(fxBlock(unit)).toEqual([
      'The Rack FX is an effects unit (stereo main out · audio in); ' +
        'nothing else in this rig processes audio.',
    ])
  })

  it('does not read per-voice sound design as an effect', () => {
    // `DRIVE`, `FILTER`, `OVERDRIVE` and `BIT DEPTH` shape one voice. Listing them under Master
    // FX would tell a reader their drive knob is their effects chain.
    expect(fxBlock(noise)).toEqual([
      'Nothing in this rig processes audio. The master chain is yours at the desk.',
    ])
  })

  it('drops the "nothing else" claim as soon as something else does process audio', () => {
    const one = box('C-one', {
      name: 'One',
      kind: 'fx-processor',
      io: { main: 'mono', individualOuts: 0, audioIn: true, usbAudio: false },
    })
    const two = box('D-two', {
      name: 'Two',
      panel: panel('CHORUS'),
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['lead'], polyphony: 1 }],
      recipes: [makeRecipe('two-lead', 'lead', 'hard', 'v')],
    })
    const block = fxBlock(one, two, noise)
    expect(block).toEqual([
      'What processes audio in this rig:',
      '- One — is an effects unit (mono main out · audio in)',
      '- Two — carries CHORUS on the panel',
    ])
    // The box with only sound design on it is still absent, and no line claims a rig-wide fact.
    expect(block.join('\n')).not.toContain('Noisy Box')
    expect(block.join('\n')).not.toContain('nothing else')
  })

  it('states both kinds of evidence for one box, rather than picking a winner', () => {
    const both = box('C-both', {
      name: 'Desk',
      kind: 'mixer-recorder',
      io: { main: 'stereo', individualOuts: 4, audioIn: true, usbAudio: true },
      panel: panel('MASTER FX'),
      // `acid` for the reason the send box above uses it: the parameter route only speaks for a
      // box this guide gave a part to (#106).
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['acid'], polyphony: 1 }],
      recipes: [
        makeRecipe('both-acid', 'acid', 'dirty', 'v', {
          params: [
            { kind: 'numeric', name: 'DELAY AMOUNT', value: 8, range: { min: 0, max: 50, verified: false } },
          ],
        }),
      ],
    })
    expect(fxBlock(both)).toEqual([
      'The Desk is a mixer and recorder (stereo main out · 4 individual outs · USB audio · ' +
        'audio in), and carries MASTER FX on the panel, and DELAY AMOUNT in its recipes; ' +
        'nothing else in this rig processes audio.',
    ])
  })
})

describe('the guide cites the document the values came from (#89)', () => {
  /**
   * It used to print `Device.manual.title`, a separate assertion nothing keeps in agreement with
   * the citations. A TR-1000 guide said "Values below cite TR-1000 Owner's Manual" while every
   * range cited the Reference Manual — a different book, and the only one that prints a range at
   * all, which is why it was tracked down in #18. The guide was sending a reader to look
   * something up where it cannot be found, about the one thing this app claims to be careful
   * with.
   */
  it('names the document the ranges cite, not the one the manifest declares', () => {
    const tr1000 = DEVICES.find((d) => d.id === 'roland-tr-1000') as Device
    const sentence = citationSentence(tr1000)
    expect(sentence).toContain('Reference Manual')
    expect(sentence).not.toContain('Owner')
  })

  it('names every document when a device cites more than one', () => {
    const mc101 = DEVICES.find((d) => d.id === 'roland-mc-101') as Device
    const sentence = citationSentence(mc101) ?? ''
    for (const document of rangeDocuments(mc101)) expect(sentence).toContain(document)
    expect(rangeDocuments(mc101).length).toBeGreaterThan(1)
  })

  /**
   * #173. The summary sentence and the per-parameter citation answer different questions, and
   * grouping the first must not coarsen the second.
   *
   * "Which documents will I need open" has one right answer per corpus. "Where does *this* value
   * come from" has one right answer per file. The Deluge is the device that has both, so it is
   * the one that proves they stayed separate.
   */
  it('groups a tagged corpus in the summary while each value keeps its own file', () => {
    const deluge = DEVICES.find((d) => d.id === 'synthstrom-deluge') as Device
    const corpus = 'Deluge community firmware release_1_2_1'
    const sentence = citationSentence(deluge) ?? ''

    expect(sentence).toContain('Deluge Official Guidebook OS 4.1 (OLED)')
    expect(sentence).toContain(corpus)
    // Named once, not once per file. This is the whole defect: the sentence used to repeat the
    // corpus five times and reorder itself whenever a citation count shifted.
    expect(sentence.split(corpus).length - 1).toBe(1)
    expect(sentence).not.toContain('.md')

    // And the file is still on the value. Four envelope stages, four different files, each cited
    // to the one that prints its range.
    const sources = deluge.recipes.flatMap((recipe) =>
      (recipe.params as { name: string; kind: string; range?: { verified?: unknown } }[])
        // The four stages. `ENV 2 → PITCH DEPTH` is a patch cable and cites two sources.
        .filter(
          (param) =>
            /^ENV [12] (ATTACK|DECAY|SUSTAIN|RELEASE)$/.test(param.name) &&
            param.kind === 'numeric',
        )
        .map((param) => (param.range?.verified as { source: string } | undefined)?.source ?? ''),
    )
    expect(sources.length).toBeGreaterThan(0)
    for (const source of sources) expect(source.startsWith(`${corpus}, menus/envelope/`)).toBe(true)
    expect(new Set(sources).size).toBe(4)
  })

  /** No device's summary may point at a file: that is the per-value line's job, not this one's. */
  it('never puts a repository path in a citation summary', () => {
    for (const device of DEVICES) {
      expect(citationSentence(device) ?? '', device.id).not.toContain('.md')
    }
  })

  it('says nothing for a device whose ranges cite nothing', () => {
    for (const device of DEVICES) {
      if (rangeDocuments(device).length > 0) continue
      expect(citationSentence(device), device.id).toBeUndefined()
    }
  })

  /**
   * Every device, so a manifest that declares one book and cites another is caught when it is
   * authored rather than when somebody reads the guide.
   */
  it('never names a document no range cites', () => {
    for (const device of DEVICES) {
      const sentence = citationSentence(device)
      if (sentence === undefined) continue
      for (const document of rangeDocuments(device)) expect(sentence).toContain(document)
      // Strike out every cited document and only the scaffolding may remain. A declared title
      // leaking back in would survive this; a wording change would not break it.
      let bare = sentence
      for (const document of rangeDocuments(device)) bare = bare.split(document).join('')
      expect(bare.replace(/Values below cite|and|[.,\s]/g, ''), device.id).toBe('')
    }
  })
})

// ---------------------------------------------------------------------------
// §3/#101 — source audio in Sound design
// ---------------------------------------------------------------------------

/**
 * A sampler rig, small enough that the whole part is readable in one assertion. `PLAY MODE` is a
 * plain param beside the source; the source is not a param, which is the point of the field.
 */
function samplerRig(source: Record<string, unknown>): ResolveResult {
  const sampler = box('sampler', {
    kind: 'sampler',
    voices: [{ kind: 'fixed', id: 'trk', label: 'Track 1', roles: ['texture'], polyphony: 1 }],
    hints: { 'load-it': 'Hold BROWSE, turn the dial' },
    features: { perStep: ['velocity'] },
    recipes: [
      makeRecipe('s-texture-soft', 'texture', 'soft', 'trk', {
        title: 'Granular bed',
        sourceAudio: source as never,
        articulation: undefined,
      }),
    ],
  })
  return resolve({
    devices: [sampler],
    template: withRoles([request({ id: 'r-tex', role: 'texture', character: 'soft' })]),
    mood: moodState(),
    seed: 1,
  })
}

const NEED = 'A sustained tonal source, two seconds or longer'

describe('source audio (§3/#101)', () => {
  it('states what to load, above the routing and above every parameter', () => {
    const doc = renderGuide(samplerRig({ need: NEED }))
    const sound = doc.slice(doc.indexOf('## 6.'))
    const at = sound.indexOf(`Source — ${NEED}`)
    expect(at).toBeGreaterThan(-1)
    // Before the first value line of the part: you cannot set a cutoff on a track holding nothing.
    expect(at).toBeLessThan(sound.indexOf('- **TUNE**'))
  })

  /**
   * The need carries no mark, and that is the model's decision rather than the renderer's
   * (`resolveSourceAudio`). A provisional badge means "nobody checked"; there is no page anywhere
   * that says which recording suits a soft texture, so there is nothing for a mark to be about,
   * and printing one would read as an unchecked guess about a choice that is the reader's.
   */
  it('marks the need with nothing, because there is no claim to mark', () => {
    const doc = renderGuide(samplerRig({ need: NEED }))
    const line = doc.split('\n').find((l) => l.startsWith('Source — ')) as string
    expect(line).toBe(`Source — ${NEED}`)
    expect(line).not.toContain('·')
  })

  it('marks the procedure, because that one is the manual’s', () => {
    const cite: Cite = { kind: 'manual', source: 'Sampler Manual, p.104' }
    const doc = renderGuide(
      samplerRig({ need: NEED, prep: { text: 'Render the tracks to audio', verified: cite } }),
    )
    const lines = doc.split('\n')
    const at = lines.findIndex((l) => l.includes('Render the tracks to audio'))
    expect(lines[at]).toContain('· manual')
    expect(lines[at + 1]).toContain(SUBORDINATE.cite)
    expect(lines[at + 1]).toContain('Sampler Manual, p.104')
  })

  it('says nobody checked a procedure somebody worked out by ear', () => {
    const doc = renderGuide(
      samplerRig({ need: NEED, prep: { text: 'Bounce it yourself', verified: false } }),
    )
    const line = doc.split('\n').find((l) => l.includes('Bounce it yourself')) as string
    // §3.2's rule, unchanged: a provisional point has no citation to give and gets none.
    expect(line).toBe('- Bounce it yourself')
  })

  it('puts the hint where a reader can suppress it (§8.1)', () => {
    const source = { need: NEED, hint: 'load-it' }
    const on = renderGuide(samplerRig(source), { hints: true })
    const off = renderGuide(samplerRig(source), { hints: false })
    expect(on).toContain(`${SUBORDINATE.hint} Hold BROWSE, turn the dial`)
    expect(off).not.toContain('Hold BROWSE')
  })

  it('says nothing at all for a recipe that declares none', () => {
    const doc = renderGuide(samplerRig(undefined as never))
    expect(doc).not.toContain('Source —')
  })

  /**
   * Invariant 5, at the point it would be easiest to break. We do not know the reader's library,
   * so no recipe in the whole library may name a file — and this is the field that would tempt
   * somebody to, because it is finally the right place to put one.
   */
  it('never names a file, anywhere in the library', () => {
    for (const device of DEVICES) {
      for (const recipe of device.recipes) {
        const source = recipe.sourceAudio
        if (source === undefined) continue
        expect(source.need, recipe.id).not.toMatch(/\.(wav|aif{1,2}|mp3|flac|pti|ogg)\b/i)
        expect(source.prep?.text ?? '', recipe.id).not.toMatch(/\.(wav|aif{1,2}|mp3|flac|pti)\b/i)
      }
    }
  })

  /**
   * The library-wide authoring rule the engine cannot enforce. There is no per-recipe flag saying
   * "this voice plays a file" — the manifest models pools and voices, not sound sources — so
   * whether a recipe needs a source is a judgement its own device folder makes, and every device
   * test that has one asserts it. What can be checked here is the other direction: a recipe that
   * declares a source declares a usable one.
   */
  it('never declares an empty or one-word source', () => {
    for (const device of DEVICES) {
      for (const recipe of device.recipes) {
        const source = recipe.sourceAudio
        if (source === undefined) continue
        expect(source.need.trim().split(/\s+/).length, recipe.id).toBeGreaterThan(3)
      }
    }
  })
})

/**
 * §7.4/#104. **The clock source's own enabling setting.**
 *
 * The rig phase named a clock source and said "sync everything else to it", which is an
 * instruction nothing in the rig can obey while the source is silent — and on the Tracker Mini
 * clock output is a menu (p.54: Off, USB, MIDI Out jack, USB + MIDI Out jack), so it *is* silent
 * until somebody sets it. Every phase after this one assumes the transport is running, so one
 * unstated setting stalls the whole guide.
 *
 * The rig is Tracker Mini + TR-1000. Both declare `midi-din`, and since #80 the Tracker Mini is
 * the one that claims `preferredSource` — so it is the source over MIDI on §7.4's semantic key,
 * where this once fell to device id ascending (`polyend-` before `roland-`). That is asserted
 * rather than assumed: if the source ever moves, this test should say so instead of quietly
 * checking nothing.
 */
/** Occurrences of a literal, without a regex to escape. */
function occurrences(haystack: string, needle: string): number {
  let n = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    n++
    at = haystack.indexOf(needle, at + needle.length)
  }
  return n
}

describe('the clock source is told how to emit (§7.4/#104)', () => {
  const midiRig = (): ResolveResult =>
    resolve({
      devices: DEVICES.filter(
        (d) => d.id === 'polyend-tracker-mini' || d.id === 'roland-tr-1000',
      ),
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })

  it('gives the menu path, the value and the page', () => {
    const result = midiRig()
    expect(result.clockSource?.deviceId).toBe('polyend-tracker-mini')
    expect(result.clockSource?.transport).toBe('midi-din')

    const body = phaseBody(renderGuide(result), 3).join('\n')
    // The box's own words, because §8 is read at the machine and this is what is on the screen.
    expect(body).toContain('`Config > MIDI > Clock Out`')
    expect(body).toContain('`MIDI Out jack`')
    expect(body).toContain('- On the Tracker Mini, set')
    // Invariant 4: a rendered value carries its provenance, and this one is cited.
    expect(body).toMatch(/Clock Out`[^\n]*`MIDI Out jack`[^\n]* · manual/)
    // And the citation names the document and the page, in §8.1's own subordinate form. `·
    // manual` says how it was checked and never says where: a reader holding a different book,
    // or the same book at another revision, cannot act on a bare `manual`.
    expect(body).toContain(
      '  - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.54',
    )
    expect(body).toContain('  - ↳ note: Off, USB, MIDI Out jack')
  })

  it('gives the USB value on a USB rig, not the MIDI one', () => {
    // Same box, same menu, different option — which is why `sourceSetup` is keyed by transport.
    // Printing `MIDI Out jack` at a reader on a USB cable would be worse than printing nothing.
    const device = DEVICES.find((d) => d.id === 'polyend-tracker-mini') as Device
    const setups = device.clock.sourceSetup ?? []
    expect(setups.map((s) => s.transport).sort()).toEqual(['midi-din', 'usb'])
    const usb = setups.find((s) => s.transport === 'usb')
    expect(usb?.path).toBe('Config > MIDI > Clock Out')
    expect(usb?.value).toBe('USB')
    // §2.6/#22. The page for a menu path lives at `clock.sourceSetup[<transport>]` now, and
    // `DeviceSchema` refuses a declared setup that has no entry.
    for (const setup of setups) {
      expect(
        evidenceFor(device, clockSourceSetupFact(setup.transport)),
        setup.transport,
      ).toEqual({ kind: 'manual', source: 'Polyend Tracker Mini Manual 2.2.1b, p.54' })
    }
  })

  /**
   * §8/#103. The Tracker Mini's MIDI jacks are 3.5mm TRS and take the supplied **Type B**
   * adapter for a 5-pin cable (p.13's callout, restated at p.284). Type B is the uncommon one,
   * and a reader reaching for a Type A gets silence with nothing on screen to explain it — on
   * the phase whose whole job is "what do I plug where".
   *
   * The manifest carried it on the jacks from #103; nothing rendered it until now.
   */
  it('surfaces the clock jack notes for the transport the rig resolved (#103)', () => {
    const body = phaseBody(renderGuide(midiRig()), 3).join('\n')
    expect(body).toContain('Type B adapter')
    expect(body).toContain('p.13, p.284')
    // Both jacks carry the note and both match `midi-din`, so it is one line naming both — not
    // two lines that read as two different warnings about two different problems.
    expect(occurrences(body, 'Type B adapter')).toBe(1)
    expect(body).toContain('MIDI Out, MIDI In:')
    // Invariant 4: rendered, so cited — and the page named, not just the kind.
    expect(body).toMatch(/Type B[^\n]* · manual/)
    expect(body).toContain(
      '    - ↳ cite: value manual — Polyend Tracker Mini Manual 2.2.1b, p.13',
    )
    // p.284 stays in the note text rather than being folded into the citation: `verified` is
    // the page documenting *this jack* (§3.3), and the adapter's page documents the adapter.
    expect(body).not.toContain('p.13, p.284 (')
  })

  it('says nothing about a MIDI adapter on a rig that resolved onto USB (#103)', () => {
    // The same box, the same manifest, a transport that touches neither MIDI jack. A guide that
    // warned about a 5-pin adapter here would be describing a cable nobody is holding.
    //
    // **The Tracker Mini's own claim is stripped here, and that is the only edit.** #80 authored
    // `preferredSource` on this box, and the Metropolix is the library's one clock sender without
    // `midi-din` — so with both claims standing, every registry rig containing the two resolves
    // onto MIDI and the USB case became unreachable from real devices. What is under test is the
    // *jack note*, not the preference, so the preference is the thing removed.
    const usbRig = resolve({
      devices: DEVICES.filter(
        (d) => d.id === 'polyend-tracker-mini' || d.id === 'intellijel-metropolix',
      ).map((d) =>
        d.id === 'polyend-tracker-mini'
          ? { ...d, clock: { ...d.clock, preferredSource: undefined } }
          : d,
      ),
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(usbRig.clockSource?.deviceId).toBe('intellijel-metropolix')
    expect(usbRig.clockSource?.transport).toBe('usb')
    const body = phaseBody(renderGuide(usbRig), 3).join('\n')
    expect(body).toContain('Tracker Mini')
    expect(body).not.toContain('Type B')
  })

  it('says nothing at all for a source that declares no setup', () => {
    // The renderer names no box and knows no menu. A TR-1000-only rig makes the TR-1000 the
    // source, and its manual prints no clock-output routing, so the honest output is silence —
    // not an invented menu path (invariant 5).
    const result = resolve({
      devices: DEVICES.filter((d) => d.id === 'roland-tr-1000'),
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(result.clockSource?.deviceId).toBe('roland-tr-1000')
    const body = phaseBody(renderGuide(result), 3).join('\n')
    expect(body).toContain('**Clock source**')
    expect(body).not.toContain('Clock Out')
    expect(body).not.toContain(', set `')
  })
})
