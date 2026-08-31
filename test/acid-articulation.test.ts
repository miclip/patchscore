import { describe, expect, it } from 'vitest'
import { NEUTRAL_MOOD, reachableSlots, renderGuide, resolve, type Recipe } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { TEMPLATES, acidLineage } from '../lib/templates/index'

/**
 * §4.3/#108. **What a direction landing does to three device folders that never changed.**
 *
 * Before Acid Lineage, the `acid` role had 28 recipes across 20 boxes and no direction requesting
 * it, so every slot on every one of them was unreachable — `unrequestedRecipes` named them as a
 * template-library gap and `deadArticulationSlots` correctly said nothing. A recipe in that state
 * cannot carry a gesture: authored, green in the manifest, and unable to reach a page.
 *
 * The direction arrived and emits `downbeat`, `offbeat`, `accent` and `ghost` across its four
 * `acid` bands, which turned three long-standing authoring gaps into ordinary ones. Each is bound
 * here with the helper its own file already documents, and none of them is a new capability claim:
 *
 *  - **`dn2-acid-dirty`** already articulated `offbeat` and now leans on `accent` — VEL, p.57's
 *    per-trig lane, through the same `art(..., 'trig-params')` helper eleven siblings use.
 *  - **`opxy-acid-dirty`** had no articulation at all, and gains `accent` and `ghost` through the
 *    `velocity` helper, whose values must be among the ten p.31 prints.
 *  - **`subh-acid-dirty`** gains `ACCENT_OCTAVE`, the constant that file defines for exactly this
 *    and that its header excluded this recipe from *for #108's reason rather than a musical one*.
 *
 * **The join is what is asserted, not the manifest.** Each entry is one line and cannot fail
 * interestingly on its own. What can fail is everything between it and a reader: the direction has
 * to emit the slot, the recipe has to win the request on a one-box rig, and §8 has to print the
 * instruction under **On this box**. Break any of those and the authoring is invisible on the
 * page, which is the failure #108 exists to name.
 *
 * One file rather than three, because it is one claim three times and the setup is the same
 * sentence in each. `moog-subharmonicon.test.ts` and `elektron-digitone-ii.test.ts` keep their own
 * sweeps over every recipe on their box; this is the narrow cross-device one those cannot hold.
 */

function recipeOf(deviceId: string, recipeId: string): Recipe {
  const device = DEVICES.find((d) => d.id === deviceId)
  if (device === undefined) throw new Error(`${deviceId} missing from the registry`)
  const recipe = device.recipes.find((r) => r.id === recipeId)
  if (recipe === undefined) throw new Error(`${recipeId} missing from ${deviceId}`)
  return recipe
}

/** Phase 5's `acid` block on a one-box rig, from its heading to the next part's. */
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
  ['moog-subharmonicon', 'subh-acid-dirty'],
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

describe('Subharmonicon — an accent that is a pitch, because nothing here is louder (§4.3)', () => {
  it('is a pitch gesture on a recipe whose sequencer drives pitch', () => {
    // The musical precondition its own file states: `ACCENT_OCTAVE` goes only where `SEQ 1
    // ASSIGN` is actually lit on an oscillator, or the instruction has no subject.
    const recipe = recipeOf('moog-subharmonicon', 'subh-acid-dirty')
    expect(recipe.articulation).toEqual([
      { slot: 'accent', set: { pitch: '+1 octave' }, hint: 'accent-octave' },
    ])
    const valueOf = (name: string) => {
      const param = recipe.params.find((p) => p.name === name)
      return param?.kind === 'enum' ? param.value : undefined
    }
    expect(valueOf('SEQ 1 ASSIGN · OSC 1')).toBe('LIT')
    // And the range that makes it playable: SEQ OCT at ±1 is what gives every step the octave.
    expect(valueOf('SEQ OCT')).toBe('±1')
  })

  it('renders as a step to move rather than a level to raise', () => {
    const block = acidBlock('moog-subharmonicon')
    expect(block).toContain('**On this box** — Subharmonicon')
    expect(block).toContain('- `accent` → `pitch` +1 octave on step 17')
    expect(block).toContain('  - ↳ hint: No velocity here; move the step instead')
    // No velocity anywhere in the part, which is the claim the hint is making.
    expect(block.some((l) => l.includes('`velocity`'))).toBe(false)
  })
})
