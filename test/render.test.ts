import { describe, expect, it } from 'vitest'
import {
  GUIDE_PHASES,
  SUBORDINATE,
  moodState,
  renderGuide,
  resolve,
  type Hook,
  type ResolveResult,
  type Template,
} from '../lib/core/index'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'

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

function lines(doc: string): string[] {
  return doc.split('\n')
}

/** The body of one 1-based phase, exclusive of its own heading and the next one. */
function phaseBody(doc: string, phase: number): string[] {
  const all = lines(doc)
  const start = all.findIndex((l) => l.startsWith(`## ${phase}. `))
  expect(start, `phase ${phase} heading`).toBeGreaterThan(-1)
  const rest = all.slice(start + 1)
  const end = rest.findIndex((l) => l.startsWith('## '))
  return end === -1 ? rest : rest.slice(0, end)
}

// `provisional` is the common state and renders as a bare mark rather than a sentence (#35):
// a warning on nine lines in ten tells the reader nothing and pushes the values apart. The
// invariant is still "exactly one state per line", so the marker set just gets shorter.
const PROVENANCE = ['authored', 'derived by', '⚠']

function provenanceMarkers(line: string): string[] {
  return PROVENANCE.filter((state) => line.includes(state))
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
    // Invariant 5: the phases that have nothing say so.
    expect(doc).toContain('nothing to program')
    expect(doc).toContain('nothing to dial in')
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
  it('marks every parameter line with exactly one of the three states', () => {
    const result = golden()
    const valueLines = phaseBody(renderGuide(result), 6).filter((l) => l.startsWith('- **'))

    const authored = result.assignments.reduce((n, a) => n + a.params.length, 0)
    expect(valueLines).toHaveLength(authored)
    for (const line of valueLines) expect(provenanceMarkers(line), line).toHaveLength(1)
  })

  it('marks every patch and articulation line too — mood never touches them, provenance does', () => {
    const doc = renderGuide(golden())
    const marked = [...phaseBody(doc, 5), ...phaseBody(doc, 6)].filter((l) =>
      l.startsWith('- `'),
    )
    // Slot lines in phase 5 list steps, not values, and carry no provenance; every other
    // backticked bullet is a rendered value.
    for (const line of marked) {
      const isSlotList = /^- `[a-z-]+` — \d/.test(line)
      if (isSlotList) continue
      expect(provenanceMarkers(line), line).toHaveLength(1)
    }
  })

  it('renders a derived value as the move that produced it, and names the knob', () => {
    const doc = renderGuide(golden())
    // The golden kick: TUNE 52, darkness 80, mood offset -12 per §6.1.
    const tune = phaseBody(doc, 6).find((l) => l.startsWith('- **TUNE**'))
    expect(tune).toBeDefined()
    expect(tune).toContain('52 → 45')
    expect(tune).toContain('derived by darkness')
  })

  it('marks a provisional value compactly and gives it no citation to borrow authority from', () => {
    const doc = renderGuide(golden())
    const body = phaseBody(doc, 6)
    const mode = body.findIndex((l) => l.startsWith('- **MODE**'))
    expect(mode).toBeGreaterThan(-1)
    expect(body[mode]).toContain('⚠')
    // Compact, not absent: the mark must be there, the sentence must not (#35).
    expect(body[mode]).not.toContain('nobody has checked')
    // The next line must not be a citation for a value nobody checked.
    expect(body[mode + 1] ?? '').not.toContain(`${SUBORDINATE.cite} value`)
  })

  it('cites the point and the range as two separate claims (§3.1)', () => {
    const body = phaseBody(renderGuide(golden()), 6)
    const resonance = body.findIndex((l) => l.startsWith('- **RESONANCE**'))
    expect(resonance).toBeGreaterThan(-1)
    // Point observed on the unit, range read off the page — and both said out loud.
    expect(body[resonance + 1]).toBe(
      `  - ${SUBORDINATE.cite} value observed — golden unit, firmware 1.11`,
    )
    expect(body[resonance + 2]).toBe(
      `  - ${SUBORDINATE.cite} range manual — Golden Manual p.12`,
    )
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

  it('explains the note line once, near the notes, rather than per note', () => {
    const occurrences = body.filter((l) => l.includes('**step, length, degree, note, MIDI**'))
    expect(occurrences).toHaveLength(1)
  })

  it('puts every field of a note on one line, so a note is one thing to read and enter', () => {
    const eFlat = body.find((l) => l.includes('`Eb3`')) as string
    expect(eFlat).toBe('- step 1 · len 1 · degree 7 · `Eb3` (`D#3`) · MIDI 51')
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
    expect(body.join('\n')).toContain('no part in this rig carries this role')
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
    expect(phaseBody(doc2, 4).join('\n')).toContain('authors no hooks')
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
    // The golden kick is continuous over three sections with one variant: one block naming
    // all three, not the same sixteen steps printed three times.
    const body = phaseBody(doc, 5)
    const kick = body.indexOf('### `kick` — Golden Drum · BD')
    expect(kick).toBeGreaterThan(-1)
    const next = body.findIndex((l, i) => i > kick && l.startsWith('### '))
    const block = body.slice(kick, next)
    expect(block.filter((l) => l.startsWith('**'))).toEqual([
      '**Intro, Build, Drop** — `p-kick-b2`, 16 steps, band 2',
      '**On this box** — Golden Drum',
    ])
    expect(block.filter((l) => l === '```')).toHaveLength(2)
  })

  it('does not merge sections that agree on the variant but not on the band it fell back from', () => {
    // The golden hat has a band-2 variant in Drop only, so Intro and Build fall back to band 1
    // (§6.3). Merging those with Drop would hide the one thing the density knob did.
    const body = phaseBody(doc, 5)
    const hat = body.indexOf('### `closed-hat` — Golden Drum · CH')
    const next = body.findIndex((l, i) => i > hat && l.startsWith('### '))
    const headlines = body.slice(hat, next).filter((l) => l.startsWith('**') && l.includes(' — `'))
    expect(headlines).toEqual([
      '**Intro, Build** — `p-hat-b1`, 16 steps, band 1 — nothing authored at band 2',
      '**Drop** — `p-hat-b2-drop`, 16 steps, band 2',
    ])
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

  it('lists every gap with a reason, and never as an assignment', () => {
    const body = phaseBody(doc, 2).join('\n')
    expect(result.gaps.length).toBeGreaterThan(0)
    for (const gap of result.gaps) expect(body).toContain(`\`${gap.role}\``)
    expect(body).toContain('Nothing was invented')
  })

  it('distinguishes "buy a box" from "author a recipe"', () => {
    const body = phaseBody(doc, 2).join('\n')
    expect(body).toContain('needs another box')
    expect(body).toContain('capable but unauthored')
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

  it('derives mixer channels from declared outs alone', () => {
    const body = phaseBody(renderGuide(golden()), 3).join('\n')
    // 3 parts on a box with no individual outs: one stereo channel, not three invented ones.
    expect(body).toContain('mixer: 3 parts, no individual outs')
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
    expect(body).toContain('| Drop | 32 |')
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
