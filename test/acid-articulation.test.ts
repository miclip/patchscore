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
// The whole audit: 31 recipes, two gestures each (§4.3/#283)
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

/**
 * The three fixed moods every row is rendered at, and the reason there are exactly three.
 *
 * `r-acid` is authored `hard`, which §3.4's geometry makes the gateway to all three authored
 * families: neutral resolves to `hard` itself, full grit ties `hard` with `dirty` and loses the
 * tie by code unit order, and the bright-side darkness setting does the same for `bright`. So one
 * knob position per family reaches every recipe in the library, and each row below names the one
 * that reaches it. Pinned rather than searched: a row whose mood stops selecting its recipe is a
 * change in what a reader gets at that setting, which is the thing this table is for.
 */
const MOOD_AT = {
  neutral: {},
  grit: { grit: 100 },
  bright: { darkness: 0 },
} as const

type MoodName = keyof typeof MOOD_AT

/**
 * Lane names that carry a slide. Every one is declared in some device's `features.perStep`.
 *
 * `slide-trig` joined at #345 with the Octatrack MKII, and it is the first entry here that is a
 * *trig type* rather than a parameter: p.74's SLIDE places a step whose values travel to the next
 * trig's, so the slide is a property of the step and not of the voice. Without it in this list a
 * `bound` claim on that box would have found no entry and failed — which is what it did, and is
 * why the list is a list rather than a guess at the word.
 */
const SLIDE_LANES = ['portamento', 'portamento-time', 'glide', 'tie', 'gate', 'slide-trig'] as const

const AUDIT: readonly (readonly [
  device: string,
  recipe: string,
  accent: Account,
  slide: Account,
  mood: MoodName,
])[] =
  [
    // Semi-modulars and synths with no sequencer at all: both gestures are played.
    ['behringer-crave', 'crave-acid-dirty', 'stated', 'stated', 'grit'],
    ['behringer-crave', 'crave-acid-bright', 'stated', 'stated', 'neutral'],
    ['behringer-model-d', 'model-d-acid-bright', 'stated', 'stated', 'neutral'],
    ['behringer-neutron', 'neutron-acid-bright', 'stated', 'stated', 'neutral'],
    ['behringer-neutron', 'neutron-acid-dirty', 'stated', 'stated', 'grit'],
    ['intellijel-cascadia', 'cascadia-acid-dirty', 'stated', 'stated', 'grit'],
    ['intellijel-cascadia', 'cascadia-acid-bright', 'stated', 'stated', 'neutral'],
    ['moog-minitaur', 'minitaur-acid-dirty', 'stated', 'stated', 'grit'],
    ['moog-minitaur', 'minitaur-acid-bright', 'stated', 'stated', 'bright'],
    ['moog-minitaur', 'minitaur-acid-hard', 'stated', 'stated', 'neutral'],
    ['moog-subsequent-37', 'sub37-acid-dirty', 'stated', 'stated', 'grit'],
    ['moog-subsequent-37', 'sub37-acid-bright', 'stated', 'stated', 'bright'],
    ['moog-subsequent-37', 'sub37-acid-hard', 'stated', 'stated', 'neutral'],

    // Moog sequencers, where the lanes differ box to box and so do the answers.
    ['moog-grandmother', 'gm-acid-bright', 'bound', 'bound', 'neutral'],
    ['moog-matriarch', 'mat-acid-bright', 'stated', 'bound', 'neutral'],
    ['moog-mother-32', 'm32-acid-dirty', 'bound', 'bound', 'grit'],
    ['moog-mother-32', 'm32-acid-bright', 'bound', 'bound', 'neutral'],
    ['moog-subharmonicon', 'subh-acid-dirty', 'stated', 'stated', 'neutral'],

    // Grooveboxes: the accent is nearly always a lane, the slide nearly never.
    ['elektron-digitone', 'dn-acid-dirty', 'bound', 'bound', 'neutral'],
    ['elektron-digitone-ii', 'dn2-acid-dirty', 'bound', 'stated', 'neutral'],
    ['novation-circuit-tracks', 'ct-acid-dirty', 'bound', 'bound', 'neutral'],
    ['polyend-play-plus', 'pp-acid-dirty', 'bound', 'stated', 'neutral'],
    ['roland-mc-101', 'mc101-acid-dirty', 'bound', 'stated', 'neutral'],
    ['roland-mc-707', 'mc707-acid-dirty', 'bound', 'stated', 'neutral'],
    ['synthstrom-deluge', 'deluge-acid-dirty', 'bound', 'stated', 'neutral'],
    ['teenage-engineering-op-xy', 'opxy-acid-dirty', 'bound', 'stated', 'neutral'],

    // **The SP-404MK2, which has portamento and cannot spend it.** p.38's CHROMATIC play methods
    // include LEGATO — "When you play legato (by pressing a pad while holding down another pad),
    // portamento is applied" — so the glide is printed. But CHROMATIC turns all sixteen pads into
    // one sample's keyboard, so a line that glides is the only part in the bank. Stated, with the
    // trade in the routing; the accent is bound, because TR-REC carries velocity per step.
    ['roland-sp-404mk2', 'sp-acid-hard', 'bound', 'stated', 'neutral'],

    // **The Polyend Tracker, where both gestures are step effects and both bind.** `glide` is one
    // (ch.7) and `volume` is another, so the slide sits on the steps that slide and the accent on
    // the steps that bite — no track-level switch and no approximation on either.
    ['polyend-tracker', 'tr-acid-hard', 'bound', 'bound', 'neutral'],

    // Samplers whose per-step editing is real and whose manuals print no scale for it.
    ['te-ep-133', 'ep133-acid-dirty', 'stated', 'stated', 'neutral'],
    ['te-ep-40', 'ep40-acid-dirty', 'stated', 'stated', 'neutral'],

    // And the sampler that binds both, which is the row worth reading twice: the slide is not a
    // dedicated lane here but a track parameter, and p.53 makes every track parameter lockable to
    // a step. So `PORT` is marked on the accented trigs the way a 303 marks them, and the glide
    // the lock switches on is shaped in a settings menu rather than on the step.
    ['elektron-digitakt-ii', 'dt2-acid-hard', 'bound', 'bound', 'neutral'],

    // **And the Octatrack, which is the pair's opposite on both columns at once.** The slide is
    // `bound` and is not a parameter at all: p.74's SLIDE is a *trig type*, and "a slide trig
    // offers the possibility to make the parameter values of a trig to gradually slide to the
    // parameter values of the subsequent trig". The accent is `stated` because an audio track
    // here has no velocity — no `VEL` on any audio-track parameter page, and level per hit only
    // as a `VOL` lock whose range p.58 does not print. So this is the one row in the table where
    // a *sampler* states its accent, and the reason is the sequencer rather than the sound.
    ['elektron-octatrack-mkii', 'ot-acid-hard', 'stated', 'bound', 'neutral'],

    // And its predecessor, which is the same box a generation earlier and cannot do the same
    // thing. There is no `PORT` on the Digitakt's TRIG page and no portamento anywhere in its
    // manual, so the slide is `stated` where the successor's is `bound` — the one pair in this
    // table where two near-identical manifests land on opposite dispositions for the same gesture,
    // and the reason is a parameter the older box does not have rather than a reading that differs.
    ['elektron-digitakt', 'dt-acid-hard', 'bound', 'stated', 'neutral'],

    // One patch, written twice: a recipe names one voice and the Tracker Mini hosts synths on
    // both its pools, so the manifest carries a twin per pool (§2.2). Both are audited, because
    // the table is a table of records — and both render the same guide, because the box loads
    // one patch (§2.3/#25) and `guideFor` knows it.
    ['polyend-tracker-mini', 'tm-acid-dirty-sample', 'bound', 'bound', 'grit'],
    ['polyend-tracker-mini', 'tm-acid-dirty-synth', 'bound', 'bound', 'grit'],

    /*
     * **One recipe, three boxes, and three rows — the opposite case to the Tracker Mini's pair.**
     * Those two are one patch written twice on one device; these are one record read by three
     * devices (invariant 2/#196). `akai-mpc-xl` takes the Live III's recipe array by reference and
     * `akai-mpc-one-g2` maps it through `retargetRecipe`, so the audit has to render three guides
     * to check three accounts, and `patchOf` keys on the device as well as the recipe.
     *
     * The One G2's row is the one that can fail alone, and its `**Slide:**` sentence is why:
     * `routing` is prose the reader is shown, it names a page, and until #345 nothing retargeted
     * it. On that box this sentence has to arrive citing v3.9 p.186 rather than the sibling's
     * v3.7 p.205 — and the guide is where that is visible, which is what this table renders.
     *
     * `bound, stated`, and the split is the box's own. The accent is a lane the manual documents
     * per step; a slide is not — `PER_STEP` on this device is velocity, note length, probability
     * and automation — so the slide is Bassline's `Glide Time` with `Env Retrigger` `Off`, said in
     * prose beside the settings that make it. The Digitone II's row two families up is the same
     * shape for the same reason: a legato setting plus notes long enough to run into the next.
     */
    ['akai-mpc-live-iii', 'mpc-acid-hard', 'bound', 'stated', 'neutral'],
    ['akai-mpc-xl', 'mpc-acid-hard', 'bound', 'stated', 'neutral'],
    ['akai-mpc-one-g2', 'mpc-acid-hard', 'bound', 'stated', 'neutral'],
  ]

/**
 * §2.3/#25. **What this recipe *loads*, which is not always the recipe record.**
 *
 * A recipe that spends a device-global resource declares what it is (`sharedAs`), and two records
 * declaring the same thing are one patch — the Tracker Mini's cross-pool twins, which exist twice
 * only because a recipe names one voice. The resolver carries one of the pair and the guide is
 * identical either way, so a row naming either twin is satisfied by the guide that renders.
 *
 * Falls back to the recipe id, which is what identity means for every other row in this table.
 */
function patchOf(deviceId: string, recipe: Recipe): string {
  return `${deviceId}\u0000${recipe.consumes?.[0]?.sharedAs ?? recipe.id}`
}

function accentEntries(recipe: Recipe) {
  return (recipe.articulation ?? []).filter((a) => a.slot === 'accent')
}

function slideEntries(recipe: Recipe) {
  return (recipe.articulation ?? []).filter((a) =>
    Object.keys(a.set).some((k) => (SLIDE_LANES as readonly string[]).includes(k)),
  )
}

/**
 * The guide this recipe renders in: its own box alone, at the one mood its row names, seed 1.
 *
 * Throws rather than returning `undefined` if that mood selects something else. A row is a claim
 * that a reader at this knob position gets this recipe, and a soft failure here would let the
 * table drift into describing recipes nobody can reach.
 */
function guideFor(deviceId: string, recipeId: string, mood: MoodName): string {
  const only = DEVICES.filter((d) => d.id === deviceId)
  const result = resolve({
    devices: only,
    template: acidLineage,
    mood: moodState(MOOD_AT[mood]),
    seed: 1,
  })
  const carried = result.assignments.find((a) => a.requestId === 'r-acid')
  const wanted = patchOf(deviceId, recipeOf(deviceId, recipeId))
  if (carried === undefined || patchOf(deviceId, recipeOf(deviceId, carried.recipe.id)) !== wanted) {
    throw new Error(
      `${deviceId} at the '${mood}' mood carries ${carried?.recipe.id ?? 'nothing'}, not ${recipeId}`,
    )
  }
  return renderGuide(result)
}

describe('every acid recipe accounts for the accent and the slide (#283)', () => {
  it('covers exactly the acid recipes the library has', () => {
    // A thirty-second recipe fails here rather than slipping in unaudited, and a deleted one
    // fails too — the table is the audit, so it has to be complete in both directions.
    const shipped = DEVICES.flatMap((d) =>
      d.recipes.filter((r) => r.role === 'acid').map((r) => r.id),
    )
    expect([...AUDIT.map((row) => row[1])].sort()).toEqual([...shipped].sort())
    expect(shipped).toHaveLength(38)
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

  it.each(AUDIT)('%s / %s says it on the page, where a reader is', (deviceId, recipeId, accent, slide, mood) => {
    // The manifest half above cannot fail interestingly; this is the half that can. A `routing`
    // sentence is only an account if the guide prints it, and a bound lane is only an account if
    // the instruction reaches phase 5. Every row renders — there is no exempt case, which is what
    // authoring the request as `hard` bought.
    const doc = guideFor(deviceId, recipeId, mood)
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

  it('renders all 38, from three knob positions', () => {
    // The whole library reachable from one direction, which it was not while `r-acid` asked for
    // `dirty`: force is the one character axis no mood knob moves, so the two `hard` recipes could
    // not be selected at any setting and the audit had two rows it could only check on paper.
    for (const [deviceId, recipeId, , , mood] of AUDIT) {
      expect(guideFor(deviceId, recipeId, mood).length).toBeGreaterThan(0)
    }
    // And the three positions each carry their share, so no family is reachable only in principle.
    const byMood = new Map<MoodName, number>()
    for (const [, , , , mood] of AUDIT) byMood.set(mood, (byMood.get(mood) ?? 0) + 1)
    expect([...byMood.keys()].sort()).toEqual(['bright', 'grit', 'neutral'])
  })
})
