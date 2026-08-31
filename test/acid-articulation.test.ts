import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  moodState,
  reachableSlots,
  renderGuide,
  resolve,
  type Recipe,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, acidLineage } from '../lib/templates/index'

/**
 * §4.3/#108/#283. **What a direction landing does to five device folders that never changed** —
 * three of them gaining a gesture, and two of them losing one.
 *
 * Before Acid Lineage, the `acid` role had 28 recipes across 20 boxes and no direction requesting
 * it, so every slot on every one of them was unreachable — `unrequestedRecipes` named them as a
 * template-library gap and `deadArticulationSlots` correctly said nothing. A recipe in that state
 * cannot carry a gesture: authored, green in the manifest, and unable to reach a page.
 *
 * The direction arrived and emits `downbeat`, `offbeat`, `accent` and `ghost` across its four
 * `acid` bands, which turned three long-standing authoring gaps into ordinary ones. Each is bound
 * with the helper its own file already documents, and none of them is a new capability claim:
 *
 *  - **`dn2-acid-dirty`** already articulated `offbeat` and now leans on `accent` — VEL, p.57's
 *    per-trig lane, through the same `art(..., 'trig-params')` helper eleven siblings use.
 *  - **`opxy-acid-dirty`** had no articulation at all, and gains `accent` and `ghost` through the
 *    `velocity` helper, whose values must be among the ten p.31 prints.
 *  - **`m32-acid-dirty`** gains `accent`, on a box whose sequencer has the lane (p.24) and whose
 *    ASSIGN cable makes that lane a cutoff modulator — so here an accent really is the recipe.
 *
 * **And two boxes that must refuse, which is the other half of the same rule.** #283 is explicit
 * that a device which cannot accent a step should have the guide *say so* rather than approximate
 * it, because on a 303-lineage line the accent is not a detail of the part — it is the technique.
 * Both of these had a stand-in and both have lost it on this role alone:
 *
 *  - **`subh-acid-dirty`** briefly carried `ACCENT_OCTAVE`, and it was wrong. The Subharmonicon
 *    has no velocity lane and no accent lane at all — p.26 makes a step "a variable tuning knob
 *    and an LED" — so the constant answers an accent with a pitch. On a `lead` or a `stab` that is
 *    a way of leaning on a step; on an acid line the octave button is a separate control used for
 *    something else, so it puts a different note on the page in answer to a request for emphasis.
 *  - **`mat-acid-bright`** answered `accent` with `ratchet: 3`. p.46 names three lanes — Rests,
 *    Ties and Ratchets — and no accent among them, and a ratchet repeats a step rather than
 *    emphasising it. On `bass-mid` that stands in well enough and still does; on a part whose
 *    accent pattern *is* the composition, three repeats change the rhythm instead.
 *
 * Both keep the substitution on their other roles. The asymmetry is the point rather than an
 * oversight: #283 is a rule about the `acid` idiom, not about these two boxes.
 *
 * **The join is what is asserted, not the manifest.** Each entry is one line and cannot fail
 * interestingly on its own. What can fail is everything between it and a reader: the direction has
 * to emit the slot, the recipe has to win the request on a one-box rig, and §8 has to print the
 * instruction under **On this box**. Break any of those and the authoring is invisible on the
 * page, which is the failure #108 exists to name.
 *
 * A refusal needs the same treatment and needs it more, because an absent `articulation` is
 * invisible in a manifest and indistinguishable from one nobody has got to yet. Only a rendered
 * guide can show that no accent instruction reaches the page while the pattern still asks for one.
 *
 * One file rather than five, because it is one claim five times and the setup is the same sentence
 * in each. `moog-subharmonicon.test.ts`, `moog-matriarch.test.ts` and
 * `elektron-digitone-ii.test.ts` keep their own sweeps over every recipe on their box; this is the
 * narrow cross-device one those cannot hold.
 */

function recipeOf(deviceId: string, recipeId: string): Recipe {
  const device = DEVICES.find((d) => d.id === deviceId)
  if (device === undefined) throw new Error(`${deviceId} missing from the registry`)
  const recipe = device.recipes.find((r) => r.id === recipeId)
  if (recipe === undefined) throw new Error(`${recipeId} missing from ${deviceId}`)
  return recipe
}

/** Phase 5's `acid` block of an already-rendered guide, from its heading to the next part's. */
function acidBlockOf(guide: string): string[] {
  const doc = guide.split('\n')
  const phase = doc.indexOf('## 5. Step programming')
  expect(phase, 'the guide has no step programming phase').toBeGreaterThan(-1)
  const heading = doc.findIndex((l, i) => i > phase && l.startsWith('### `acid`'))
  expect(heading, 'nothing carries the acid line').toBeGreaterThan(-1)
  const next = doc.findIndex((l, i) => i > heading && (l.startsWith('### ') || l.startsWith('## ')))
  return doc.slice(heading, next === -1 ? undefined : next)
}

/** Phase 5's `acid` block on a one-box rig at the neutral mood. */
function acidBlock(deviceId: string): string[] {
  const only = DEVICES.filter((d) => d.id === deviceId)
  const doc = renderGuide(
    resolve({ devices: only, template: acidLineage, mood: NEUTRAL_MOOD, seed: 1 }),
  ).split('\n')
  const phase = doc.indexOf('## 5. Step programming')
  expect(phase, `${deviceId}: the guide has no step programming phase`).toBeGreaterThan(-1)
  const heading = doc.findIndex((l, i) => i > phase && l.startsWith('### `acid`'))
  expect(heading, `${deviceId}: nothing carries the acid line`).toBeGreaterThan(-1)
  const next = doc.findIndex(
    (l, i) => i > heading && (l.startsWith('### ') || l.startsWith('## ')),
  )
  return doc.slice(heading, next === -1 ? undefined : next)
}

/** The block for one section's band, so an instruction can be pinned to the band that earned it. */
function bandBlock(lines: string[], headline: string): string[] {
  const start = lines.indexOf(headline)
  expect(start, `no block headed ${headline}`).toBeGreaterThan(-1)
  const next = lines.findIndex(
    (l, i) => i > start && l.startsWith('**') && l.includes(' steps, band '),
  )
  return lines.slice(start, next === -1 ? undefined : next)
}

const BOUND = [
  ['elektron-digitone-ii', 'dn2-acid-dirty'],
  ['teenage-engineering-op-xy', 'opxy-acid-dirty'],
  ['moog-mother-32', 'm32-acid-dirty'],
] as const

/** The two that document no per-step accent, and say so instead of standing something in. */
const REFUSING = [
  ['moog-subharmonicon', 'subh-acid-dirty', '**Accent:** there is none on this box.'],
  ['moog-matriarch', 'mat-acid-bright', '**Accent:** there is none on this box.'],
] as const

describe('the acid slots three boxes could not reach before (§4.3/#108)', () => {
  it.each(BOUND)('%s articulates only slots a direction emits', (deviceId, recipeId) => {
    const recipe = recipeOf(deviceId, recipeId)
    const { slots, requested } = reachableSlots(recipe, TEMPLATES)
    expect(requested, `${recipeId} is reached by no request`).toBe(true)
    const authored = (recipe.articulation ?? []).map((a) => a.slot)
    expect(authored.length, `${recipeId} articulates nothing`).toBeGreaterThan(0)
    for (const slot of authored) expect(slots, `${recipeId} ${slot}`).toContain(slot)
  })

  it.each(BOUND)('%s prints its instruction under `On this box`', (deviceId) => {
    const block = acidBlock(deviceId)
    // The heading is `### \`acid\` — <box> · <voice>`, so the box's own name is what the
    // instruction block below has to be headed with.
    const box = block[0]?.split(' — ')[1]?.split(' · ')[0] as string
    expect(block).toContain(`**On this box** — ${box}`)
    expect(block.some((l) => l.startsWith('- `accent` → '))).toBe(true)
  })
})

describe('Digitone II — the accent beside the offbeat it is louder than (§4.3)', () => {
  it('keeps both entries, because one velocity is not an accent', () => {
    // Collapsing these into a single larger `offbeat` velocity would leave the part with one
    // level and nothing to be accented against. VEL is p.57's per-trig lane either way.
    const entries = recipeOf('elektron-digitone-ii', 'dn2-acid-dirty').articulation ?? []
    expect(entries.map((e) => e.slot)).toEqual(['offbeat', 'accent'])
    const offbeat = entries[0]?.set['velocity'] as number
    const accent = entries[1]?.set['velocity'] as number
    expect(accent).toBeGreaterThan(offbeat)
  })

  it('renders both, and the accent lands on the step the band leans on', () => {
    const block = acidBlock('elektron-digitone-ii')
    expect(block).toContain('**On this box** — Digitone II')
    // Band 0 has an accent and no offbeat, so only one of the two entries can speak there.
    const shut = bandBlock(block, '**Shut, Closing** — 32 steps, band 0')
    expect(shut).toContain('- `accent` → `velocity` 120 on step 17')
    expect(shut.some((l) => l.startsWith('- `offbeat` → '))).toBe(false)
    // Band 2 has both, and the offbeat instruction names all four of its steps.
    const wide = bandBlock(block, '**Wide, Easing** — 32 steps, band 2')
    expect(wide).toContain('- `offbeat` → `velocity` 108, `note-length` 1/16 on steps 7, 15, 23, 31')
    expect(wide).toContain('- `accent` → `velocity` 120 on step 25')
  })
})

describe('OP-XY — the first articulation on a melodic part here (§4.3)', () => {
  /**
   * The numeric half of p.31's ten printed step-component velocities — the tenth is `random`,
   * which is a key rather than a value. These are the only levels a step component can force.
   */
  const PRINTED = [0, 4, 8, 16, 32, 64, 100, 112, 127]

  it('uses values the manual prints, and cites the page that prints them', () => {
    const entries = recipeOf('teenage-engineering-op-xy', 'opxy-acid-dirty').articulation ?? []
    expect(entries.map((e) => e.slot)).toEqual(['accent', 'ghost'])
    for (const entry of entries) {
      expect(PRINTED, `${String(entry.slot)} velocity`).toContain(entry.set['velocity'] as number)
      expect(entry.verified, String(entry.slot)).toMatchObject({ kind: 'manual' })
    }
  })

  it('says the ghost only in the band that has ghosts, and the accent in every band', () => {
    // The sharp half. `ghost` is authored on the `acid` part at band 3 alone, so a renderer that
    // printed a part's articulation once rather than per band would put an instruction in front
    // of a reader for steps that do not exist in five of the six sections.
    const block = acidBlock('teenage-engineering-op-xy')
    const ghosts = block.filter((l) => l.startsWith('- `ghost` → '))
    expect(ghosts).toEqual(['- `ghost` → `velocity` 32 on steps 6, 14, 22 · manual'])
    expect(bandBlock(block, '**Bite** — 32 steps, band 3')).toContain(
      '- `ghost` → `velocity` 32 on steps 6, 14, 22 · manual',
    )
    expect(block.filter((l) => l.startsWith('- `accent` → '))).toHaveLength(4)
    expect(block).toContain('  - ↳ hint: Hold [shift], velocity key, then a sharp')
  })
})

describe('the two boxes that refuse the accent instead of standing one in (#283)', () => {
  it.each(REFUSING)('%s articulates no accent on the acid line', (deviceId, recipeId) => {
    // Not "articulates nothing": the Matriarch gained a `tie` on the offbeat with the 28-recipe
    // audit, which is its slide and is a lane p.46 declares. The claim is narrower and sharper —
    // nothing on this box answers the *accent* slot for this role.
    expect(recipeOf(deviceId, recipeId).articulation ?? []).not.toContainEqual(
      expect.objectContaining({ slot: 'accent' }),
    )
  })

  it.each(REFUSING)('%s prints no accent instruction for it', (deviceId) => {
    // The whole point, and it has to be read off a rendered guide: an absent accent entry is
    // invisible in the manifest and indistinguishable from one nobody has written yet. What the
    // reader must not see is an accent instruction, in any band, for a step the box cannot accent.
    const block = acidBlock(deviceId)
    expect(block.some((l) => l.startsWith('- `accent` → '))).toBe(false)
    // The pattern still asks for the accent — the direction is unchanged and the step is still
    // printed in the grid. It is the device half that is silent, which is the honest shape.
    expect(block.some((l) => l.startsWith('- `accent` — '))).toBe(true)
  })

  it.each(REFUSING)('%s says why in prose the guide actually prints', (deviceId, _r, sentence) => {
    // Invariant 5 applied to articulation: a gap is shown rather than filled, and shown where the
    // reader is standing. `routing` is the recipe's own rendered line, so the limitation arrives
    // beside the settings rather than in a source comment nobody at a machine can see.
    const only = DEVICES.filter((d) => d.id === deviceId)
    const doc = renderGuide(
      resolve({ devices: only, template: acidLineage, mood: NEUTRAL_MOOD, seed: 1 }),
    )
    expect(doc).toContain(sentence)
  })

  it('keeps the substitution on the roles #283 does not govern', () => {
    // The asymmetry, pinned so it reads as a decision rather than a half-finished edit. The
    // Matriarch still answers an accent with a ratchet on `bass-mid`, and the Subharmonicon still
    // answers one with an octave on its pitch-driven melodic recipes.
    const matriarch = DEVICES.find((d) => d.id === 'moog-matriarch')
    const ratcheted = (matriarch?.recipes ?? []).filter((r) =>
      (r.articulation ?? []).some((a) => a.slot === 'accent' && 'ratchet' in a.set),
    )
    expect(ratcheted.map((r) => r.role)).not.toContain('acid')
    expect(ratcheted.length).toBeGreaterThan(0)

    const subh = DEVICES.find((d) => d.id === 'moog-subharmonicon')
    const octaved = (subh?.recipes ?? []).filter((r) =>
      (r.articulation ?? []).some((a) => a.slot === 'accent' && a.set['pitch'] === '+1 octave'),
    )
    expect(octaved.map((r) => r.role)).not.toContain('acid')
    expect(octaved.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// The whole audit: 28 recipes, two gestures each (§4.3/#283)
// ---------------------------------------------------------------------------

/**
 * #283's standard, applied to every `acid` recipe in the library rather than to the handful that
 * happened to get attention: *"a device that cannot accent or slide a step is not serving an acid
 * line the same way, and the guide should say so rather than approximate it."*
 *
 * Two gestures make this idiom — the **accent** and the **slide** — and a guide has exactly two
 * honest ways to deal with each:
 *
 *  - **bound** — an `articulation` entry on a lane the device's own `features.perStep` declares,
 *    so the guide prints "set this step to that" under **On this box**.
 *  - **stated** — a sentence in the recipe's `routing`, which renders, saying what the reader
 *    should do instead and why the box cannot be told to do it. Three shapes recur: the gesture is
 *    *performed* (no sequencer on the box at all, so it arrives with the notes); it is *global*
 *    (a panel knob or a voice setting that acts on every note rather than a step); or it has *no
 *    authorable scale* (the lane is real, the manual prints no values for it, and a number here
 *    would be invented).
 *
 * A third possibility is the one this table exists to prevent: silence. A recipe that neither
 * binds nor states leaves the reader to assume the gesture is unavailable, or worse to assume it
 * is handled. The fourth — approximating it with a lane that does something else — is what the
 * Subharmonicon's octave and the Matriarch's ratchet were, and both are now `stated`.
 *
 * Pinned as an exact table rather than a sweep with a rule, because every row is a reading of one
 * manual and the disposition is the conclusion. A recipe changing from `stated` to `bound` is a
 * new capability claim someone should have to look at; changing the other way is a gesture the
 * library quietly stopped offering.
 */
type Account = 'bound' | 'stated'

/** Lane names that carry a slide. Every one is declared in some device's `features.perStep`. */
const SLIDE_LANES = ['portamento', 'portamento-time', 'glide', 'tie', 'gate'] as const

const AUDIT: readonly (readonly [device: string, recipe: string, accent: Account, slide: Account])[] =
  [
    // Semi-modulars and synths with no sequencer at all: both gestures are played.
    ['behringer-crave', 'crave-acid-dirty', 'stated', 'stated'],
    ['behringer-crave', 'crave-acid-bright', 'stated', 'stated'],
    ['behringer-model-d', 'model-d-acid-bright', 'stated', 'stated'],
    ['behringer-neutron', 'neutron-acid-bright', 'stated', 'stated'],
    ['behringer-neutron', 'neutron-acid-dirty', 'stated', 'stated'],
    ['intellijel-cascadia', 'cascadia-acid-dirty', 'stated', 'stated'],
    ['intellijel-cascadia', 'cascadia-acid-bright', 'stated', 'stated'],
    ['moog-minitaur', 'minitaur-acid-dirty', 'stated', 'stated'],
    ['moog-minitaur', 'minitaur-acid-bright', 'stated', 'stated'],
    ['moog-minitaur', 'minitaur-acid-hard', 'stated', 'stated'],
    ['moog-subsequent-37', 'sub37-acid-dirty', 'stated', 'stated'],
    ['moog-subsequent-37', 'sub37-acid-bright', 'stated', 'stated'],
    ['moog-subsequent-37', 'sub37-acid-hard', 'stated', 'stated'],

    // Moog sequencers, where the lanes differ box to box and so do the answers.
    ['moog-grandmother', 'gm-acid-bright', 'bound', 'bound'],
    ['moog-matriarch', 'mat-acid-bright', 'stated', 'bound'],
    ['moog-mother-32', 'm32-acid-dirty', 'bound', 'bound'],
    ['moog-mother-32', 'm32-acid-bright', 'bound', 'bound'],
    ['moog-subharmonicon', 'subh-acid-dirty', 'stated', 'stated'],

    // Grooveboxes: the accent is nearly always a lane, the slide nearly never.
    ['elektron-digitone', 'dn-acid-dirty', 'bound', 'bound'],
    ['elektron-digitone-ii', 'dn2-acid-dirty', 'bound', 'stated'],
    ['novation-circuit-tracks', 'ct-acid-dirty', 'bound', 'bound'],
    ['polyend-play-plus', 'pp-acid-dirty', 'bound', 'stated'],
    ['roland-mc-101', 'mc101-acid-dirty', 'bound', 'stated'],
    ['roland-mc-707', 'mc707-acid-dirty', 'bound', 'stated'],
    ['synthstrom-deluge', 'deluge-acid-dirty', 'bound', 'stated'],
    ['teenage-engineering-op-xy', 'opxy-acid-dirty', 'bound', 'stated'],

    // Samplers whose per-step editing is real and whose manuals print no scale for it.
    ['te-ep-133', 'ep133-acid-dirty', 'stated', 'stated'],
    ['te-ep-40', 'ep40-acid-dirty', 'stated', 'stated'],
  ]

function accentEntries(recipe: Recipe) {
  return (recipe.articulation ?? []).filter((a) => a.slot === 'accent')
}

function slideEntries(recipe: Recipe) {
  return (recipe.articulation ?? []).filter((a) =>
    Object.keys(a.set).some((k) => (SLIDE_LANES as readonly string[]).includes(k)),
  )
}

/**
 * The moods that reach a recipe other than the one a neutral `dirty` request lands on. Character
 * selection moves along tone and grit (§6.2), so sweeping those two reaches every `dirty` and
 * `bright` recipe in the library. Fixed list, fixed seed: this is a deterministic search for the
 * one mood that selects a given recipe, not a random probe.
 */
const MOODS = [
  {},
  { grit: 0 },
  { grit: 100 },
  { darkness: 0 },
  { darkness: 100 },
  { grit: 0, darkness: 100 },
  { grit: 0, darkness: 0 },
  { grit: 100, darkness: 0 },
]

/** The guide that renders `recipeId` on a one-box rig, or `undefined` if no mood reaches it. */
function guideFor(deviceId: string, recipeId: string): string | undefined {
  const only = DEVICES.filter((d) => d.id === deviceId)
  for (const mood of MOODS) {
    const result = resolve({ devices: only, template: acidLineage, mood: moodState(mood), seed: 1 })
    const carried = result.assignments.find((a) => a.requestId === 'r-acid')
    if (carried?.recipe.id === recipeId) return renderGuide(result)
  }
  return undefined
}

describe('every acid recipe accounts for the accent and the slide (#283)', () => {
  it('covers exactly the acid recipes the library has', () => {
    // A twenty-ninth recipe fails here rather than slipping in unaudited, and a deleted one fails
    // too — the table is the audit, so it has to be complete in both directions.
    const shipped = DEVICES.flatMap((d) =>
      d.recipes.filter((r) => r.role === 'acid').map((r) => r.id),
    )
    expect([...AUDIT.map((row) => row[1])].sort()).toEqual([...shipped].sort())
    expect(shipped).toHaveLength(28)
  })

  it.each(AUDIT)('%s / %s accounts for both gestures in the manifest', (deviceId, recipeId, accent, slide) => {
    const recipe = recipeOf(deviceId, recipeId)
    const routing = recipe.routing ?? ''

    if (accent === 'bound') {
      expect(accentEntries(recipe), `${recipeId} claims a bound accent`).not.toHaveLength(0)
    } else {
      // Stated, and *only* stated: a label beside a lane doing something else is the approximation
      // the audit exists to catch, so the absence is asserted with the sentence.
      expect(accentEntries(recipe), `${recipeId} states its accent and articulates one`).toHaveLength(0)
      expect(routing, `${recipeId} routing has no **Accent:** sentence`).toContain('**Accent:**')
    }

    if (slide === 'bound') {
      expect(slideEntries(recipe), `${recipeId} claims a bound slide`).not.toHaveLength(0)
    } else {
      expect(slideEntries(recipe), `${recipeId} states its slide and articulates one`).toHaveLength(0)
      expect(routing, `${recipeId} routing has no **Slide:** sentence`).toContain('**Slide:**')
    }
  })

  it.each(AUDIT)('%s / %s says it on the page, where a reader is', (deviceId, recipeId, accent, slide) => {
    // The manifest half above cannot fail interestingly; this is the half that can. A `routing`
    // sentence is only an account if the guide prints it, and a bound lane is only an account if
    // the instruction reaches phase 5.
    const doc = guideFor(deviceId, recipeId)
    if (doc === undefined) {
      // Two recipes cannot be rendered from this direction, and the reason is structural rather
      // than a hole: they are `hard`, Acid Lineage requests `dirty`, and `hard`/`soft` is the force
      // axis — which no mood axis moves (§6.2 moves tone and grit only). Nothing selects them until
      // a direction asks for a hard acid line, and none does.
      expect(['minitaur-acid-hard', 'sub37-acid-hard']).toContain(recipeId)
      return
    }
    const block = acidBlockOf(doc)
    if (accent === 'bound') {
      expect(block.some((l) => l.startsWith('- `accent` → ')), `${recipeId} accent`).toBe(true)
    } else {
      expect(doc, `${recipeId} accent`).toContain('**Accent:**')
    }
    if (slide === 'bound') {
      const printed = block.some((l) =>
        SLIDE_LANES.some((lane) => l.startsWith('- `') && l.includes(`\`${lane}\``)),
      )
      expect(printed, `${recipeId} slide`).toBe(true)
    } else {
      expect(doc, `${recipeId} slide`).toContain('**Slide:**')
    }
  })

  it('renders 26 of the 28, and names the two it cannot', () => {
    const rendered = AUDIT.filter(([d, r]) => guideFor(d, r) !== undefined).map(([, r]) => r)
    expect(rendered).toHaveLength(26)
    const missing = AUDIT.map(([, r]) => r).filter((r) => !rendered.includes(r))
    expect(missing).toEqual(['minitaur-acid-hard', 'sub37-acid-hard'])
  })
})
