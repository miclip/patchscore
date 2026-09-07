import { describe, expect, it } from 'vitest'
import {
  DeviceSchema,
  expand,
  type AuthoredParam,
  type Recipe,
  type RoleRequest,
} from '../lib/core/index'
import { device } from '../lib/devices/arturia-microfreak/index'
import { TEMPLATES } from '../lib/templates/index'

/**
 * The MicroFreak is the library's second box whose polyphony is a **switch position** rather than
 * a standing fact — the Matriarch was the first — and the first where three separate printed facts
 * each collapse it to one note independently of each other.
 *
 * `Assignable.polyphony` is 4 and stays 4: p.10 says the box is *"a paraphonic four-voice
 * synthesizer"* whose voices *"all share the same analog filter"*, and that is a fact about the
 * instrument. What a *patch* spends is a fact about the patch, and on this box it is decided by:
 *
 *  1. the `Paraphonic` button, which p.10 has to be lit for the voices to trigger at all;
 *  2. Unison, which p.102 spends all four on one note;
 *  3. the `Chords` oscillator model, of which p.42 says *"Paraphony deactivates in this mode"*.
 *
 * Each of those is a `patchPolyphony: 1`, and a recipe could satisfy any one of them while its
 * parameters said otherwise with nothing to catch it — every cited range still right, the guide
 * still reading as correct, and a reader handed a three-note chord next to `Paraphonic  Off`. So
 * the pairing is asserted from the parameters rather than trusted, in both directions, and against
 * what the shipped templates actually ask for rather than against a hard-coded list.
 */

const MANUAL_PREFIX = 'MicroFreak User Manual 4.0.3 p.'

function params(recipe: Recipe): AuthoredParam[] {
  return recipe.params as AuthoredParam[]
}

function paramNamed(recipe: Recipe, name: string): AuthoredParam | undefined {
  return params(recipe).find((p) => p.name === name)
}

function every(): AuthoredParam[] {
  return device.recipes.flatMap(params)
}

/** The `Paraphonic` button's position, read off the recipe rather than off `patchPolyphony`. */
function paraphonicOn(recipe: Recipe): boolean {
  const p = paramNamed(recipe, 'Paraphonic')
  if (p?.kind !== 'enum') throw new Error(`${recipe.id}: no Paraphonic param`)
  return p.value === 'On'
}

function oscModel(recipe: Recipe): string {
  const p = paramNamed(recipe, 'Osc Type')
  if (p?.kind !== 'enum') throw new Error(`${recipe.id}: no Osc Type param`)
  return p.value
}

/** Every note count a shipped template ever asks one of this box's roles for. */
function requestedNotes(): Map<string, number> {
  const most = new Map<string, number>()
  for (const template of TEMPLATES) {
    for (const request of template.roles as RoleRequest[]) {
      const notes = request.polyphony ?? 1
      most.set(request.role, Math.max(most.get(request.role) ?? 0, notes))
    }
  }
  return most
}

describe('MicroFreak manifest', () => {
  it('is a valid device', () => {
    expect(() => DeviceSchema.parse(device)).not.toThrow()
  })

  it('expands to exactly one assignable of four notes', () => {
    const assignables = expand(device)
    expect(assignables).toHaveLength(1)
    expect(assignables[0]?.polyphony).toBe(4)
  })

  it('cites every parameter range against this manual, or against nothing at all', () => {
    for (const p of every()) {
      const claim = p.kind === 'numeric' ? p.range.verified : p.kind === 'enum' ? p.options.verified : undefined
      if (claim === undefined || claim === false) continue
      expect(claim.kind === 'manual' ? claim.source : '', p.name).toContain(MANUAL_PREFIX)
    }
  })

  it('covers every role it declares', () => {
    const declared = new Set(device.voices.flatMap((v) => v.roles))
    const authored = new Set(device.recipes.map((r) => r.role))
    expect([...declared].filter((r) => !authored.has(r))).toEqual([])
  })
})

/**
 * §12.4/#85. The three ways this box drops to one note, and the one way it does not.
 */
describe('MicroFreak paraphony', () => {
  it('gives every recipe a Paraphonic setting, because the button is not a standing state', () => {
    for (const recipe of device.recipes) {
      expect(paramNamed(recipe, 'Paraphonic'), recipe.id).toBeDefined()
    }
  })

  it('declares patchPolyphony 1 exactly when the Paraphonic button is off', () => {
    for (const recipe of device.recipes) {
      if (paraphonicOn(recipe)) {
        // Four voices are available, so the patch spends nothing the box does not have and the
        // field stays absent — which is what `patchVoiceCeiling` reads as "no cap" (§12.4).
        expect(recipe.patchPolyphony, `${recipe.id} is paraphonic`).toBeUndefined()
      } else {
        expect(recipe.patchPolyphony, `${recipe.id} is not paraphonic`).toBe(1)
      }
    }
  })

  it('turns paraphony off wherever the Chords model is selected (p.42)', () => {
    // p.42: "Paraphony deactivates in this mode; the last key pressed is the root note, and only
    // one chord can be playing." A Chords recipe claiming four notes would be a lie the manual
    // prints the refutation of.
    for (const recipe of device.recipes) {
      if (oscModel(recipe) !== 'Chords') continue
      expect(paraphonicOn(recipe), `${recipe.id} selects Chords`).toBe(false)
      expect(recipe.patchPolyphony, recipe.id).toBe(1)
    }
  })

  it('turns paraphony off wherever Unison is on (p.102)', () => {
    for (const recipe of device.recipes) {
      const unison = paramNamed(recipe, 'Unison')
      if (unison?.kind !== 'enum' || unison.value !== 'On') continue
      expect(paraphonicOn(recipe), `${recipe.id} is in Unison`).toBe(false)
      expect(recipe.patchPolyphony, recipe.id).toBe(1)
    }
  })

  /**
   * The claim the device-level field cannot make. `polyphony: 4` is true only while the button is
   * lit, so a role a template asks for with three notes needs a recipe that has it lit — otherwise
   * the guide prints a chord beside `Paraphonic  Off`.
   *
   * Read off the templates rather than hard-coded, so a future direction asking for a three-note
   * lead fails here instead of shipping.
   */
  it('has a paraphonic recipe for every role a template requests with more than one note', () => {
    const wanted = requestedNotes()
    const declared = new Set(device.voices.flatMap((v) => v.roles))
    for (const [role, notes] of wanted) {
      if (notes <= 1 || !declared.has(role as never)) continue
      const able = device.recipes.filter((r) => r.role === role && paraphonicOn(r))
      expect(able.length, `${role} is requested with ${notes} notes`).toBeGreaterThan(0)
    }
  })
})

/**
 * CLAUDE.md's cited-wrong-range rule, which this box is the strongest case of in the library: the
 * same three knobs mean eighteen different things, so a `Wave` value without an `Osc Type` beside
 * it is a number read off an unknown scale.
 */
describe('MicroFreak oscillator', () => {
  it('never sets Wave, Timbre or Shape without naming the model they belong to', () => {
    for (const recipe of device.recipes) {
      const knobs = params(recipe).filter((p) => ['Wave', 'Timbre', 'Shape'].includes(p.name))
      if (knobs.length === 0) continue
      expect(paramNamed(recipe, 'Osc Type'), recipe.id).toBeDefined()
      // All three travel together or none does — a model whose Timbre was set and whose Shape was
      // not would leave the reader to guess whether the remaining knob mattered.
      expect(knobs.map((k) => k.name).sort(), recipe.id).toEqual(['Shape', 'Timbre', 'Wave'])
    }
  })

  it('offers all eighteen models and authors none of the two whose knob mapping is unresolved', () => {
    const options = params(device.recipes[0] as Recipe).find((p) => p.name === 'Osc Type')
    if (options?.kind !== 'enum') throw new Error('no Osc Type options')
    expect(options.options.values).toHaveLength(18)
    // p.40 and p.46 print their display names in an order that puts "Shape" on the Timbre knob,
    // and V.Analog additionally puts "Wave" on the Shape knob. Neither page states the mapping
    // outright, so choosing one would be inventing an assignment (invariant 5).
    expect(options.options.values).toContain('V.Analog')
    expect(options.options.values).toContain('SawX')
    const used = new Set(device.recipes.map(oscModel))
    expect([...used].filter((m) => ['V.Analog', 'SawX'].includes(m))).toEqual([])
  })

  it('keeps both filter knobs on percent of travel, mood-inert, because no page bounds them', () => {
    for (const p of every()) {
      if (p.name !== 'Cutoff' && p.name !== 'Resonance') continue
      if (p.kind !== 'numeric') throw new Error(`${p.name} is not numeric`)
      expect(p.unit).toBe('% travel')
      expect(p.range.verified, p.name).toBe(false)
      expect(p.mood, p.name).toBeUndefined()
    }
  })

  /**
   * The Speech recipes are the one place a *point* carries a citation: p.43 prints two exact
   * three-knob settings and names the word each produces, so the value is the manual's rather than
   * this author's. Everywhere else a point is taste and stays uncited (§3.1).
   */
  it('cites the point only where the manual printed the setting itself', () => {
    const cited = every().filter((p) => p.verified !== undefined && p.verified !== false)
    expect(cited.length).toBeGreaterThan(0)
    for (const p of cited) {
      expect(['Wave', 'Timbre', 'Shape'], `${p.name} carries a point citation`).toContain(p.name)
    }
  })
})

/**
 * #465. **Where the LFO goes.** Sixteen recipes printed an `LFO` block and named no destination,
 * which is #384's report — a reader sets three controls and hears nothing change.
 *
 * The Muse could be audited into shape because its copied blocks carried `AMPLITUDE 0`, an
 * attenuator visibly shut. **This box has no such tell.** Its LFO is `Shape`, `Sync` and `Rate`,
 * all three defensible standing alone, and the depth is not on the block at all — it is the Matrix
 * amount, the row that was missing. So there was nothing to detect, and each of the sixteen was
 * decided from what its own title says the patch is for: nine routed, seven dropped.
 *
 * `recipeInertFindings` cannot help here either. It groups a block by the ` · ` prefix in a
 * parameter name (§3.1/#388) and nothing on this box uses that separator, so the MicroFreak is
 * invisible to the library-wide check rather than clean in it. **These tests are the guard**, and
 * they are written as sixteen separate cases plus the invariant, so a future recipe cannot
 * reintroduce the shape by being added rather than by being edited.
 */

/** `id → destination and amount`, exactly as the manifest is expected to author them. */
const LFO_ROUTED: ReadonlyArray<readonly [string, string, number]> = [
  ['mf-pad-soft', 'Wave', 12],
  ['mf-lead-bright', 'Pitch', 5],
  ['mf-lead-hard', 'Timbre', 14],
  ['mf-lead-soft', 'Pitch', 5],
  ['mf-bass-mid-dirty', 'Timbre', 12],
  ['mf-bass-mid-dark', 'Timbre', 14],
  ['mf-arp-dark', 'Timbre', 24],
  ['mf-texture-dark', 'Wave', 18],
  ['mf-noise-hard', 'Cutoff', 24],
]

/** The seven the block was removed from, and the reason each is not a cycle. */
const LFO_DROPPED: ReadonlyArray<readonly [string, string]> = [
  ['mf-stab-hard', 'a 320 ms stab is a shape, not a cycle'],
  ['mf-stab-bright', 'a 420 ms stab is a shape, not a cycle'],
  ['mf-stab-clean', 'p.42 puts the chord type and its inversion on the modulated knobs'],
  ['mf-sub-dark', 'one fundamental, and everything above it removed'],
  ['mf-sub-clean', 'the patch is its two shaping knobs held near zero'],
  ['mf-vox-chop-clean', "p.43's own settings for the word Filter, cited on the point"],
  ['mf-vox-chop-dirty', 'pressure owns the formant motion on purpose'],
]

/** The four destinations p.30 states outright: "Pitch, Wave, Timbre, and Cutoff". */
const HARDWIRED_DESTINATIONS = ['Pitch', 'Wave', 'Timbre', 'Cutoff']

function recipe(id: string): Recipe {
  const found = device.recipes.find((r) => r.id === id)
  if (found === undefined) throw new Error(`no recipe ${id}`)
  return found
}

/** The three controls `lfoFree`/`lfoSynced` emit, which is what "prints an LFO block" means. */
function lfoBlock(r: Recipe): AuthoredParam[] {
  return params(r).filter((p) => p.name.startsWith('LFO '))
}

function lfoRoutes(r: Recipe): AuthoredParam[] {
  return params(r).filter((p) => p.name.startsWith('Matrix  LFO > '))
}

describe('MicroFreak LFO routing (#465)', () => {
  it('accounts for every recipe: nine routed, seven dropped, six already routed', () => {
    // Guards the two tables below against drifting out of the manifest. 22 recipes, and the six
    // not named in either table are the ones that already carried a route before #465.
    const named = new Set([...LFO_ROUTED.map(([id]) => id), ...LFO_DROPPED.map(([id]) => id)])
    expect(named.size).toBe(16)
    for (const id of named) expect(() => recipe(id), id).not.toThrow()
    const untouched = device.recipes.filter((r) => !named.has(r.id))
    expect(untouched).toHaveLength(6)
    // Every one of those six is routed already, which is why #465 did not have to decide them.
    for (const r of untouched) expect(lfoRoutes(r), r.id).toHaveLength(1)
  })

  /**
   * The invariant, and the one that has to survive a recipe nobody has written yet: a printed LFO
   * block is a promise the guide's reader will hear something.
   *
   * The amount is checked rather than the row's presence, because p.29's LED table reads *"LED OFF
   * = no routing is made OR the amount is set at 0"* and p.30 states it outright — *"Setting any
   * modulation routing to a zero value will disable the LED and the Matrix will show it as not
   * connected."* A zero row is the same defect wearing a citation.
   */
  it('routes every LFO block it prints, to a nonzero amount', () => {
    for (const r of device.recipes) {
      if (lfoBlock(r).length === 0) continue
      const routes = lfoRoutes(r)
      expect(routes.length, `${r.id} prints an LFO block`).toBeGreaterThan(0)
      for (const route of routes) {
        if (route.kind !== 'numeric') throw new Error(`${r.id}: ${route.name} is not numeric`)
        expect(route.value, `${r.id}: ${route.name}`).not.toBe(0)
      }
    }
  })

  it('never routes an LFO it does not print', () => {
    for (const r of device.recipes) {
      if (lfoRoutes(r).length === 0) continue
      // Three controls: Shape, Sync, Rate. Fewer would be a route to a block with no settings.
      expect(lfoBlock(r).map((p) => p.name).sort(), r.id).toEqual(['LFO Rate', 'LFO Shape', 'LFO Sync'])
    }
  })

  for (const [id, destination, amount] of LFO_ROUTED) {
    it(`routes ${id} to ${destination} at ${amount}`, () => {
      const r = recipe(id)
      expect(lfoBlock(r), `${id} still prints its LFO`).toHaveLength(3)
      const routes = lfoRoutes(r)
      expect(routes.map((p) => p.name), id).toEqual([`Matrix  LFO > ${destination}`])
      const route = routes[0]
      if (route?.kind !== 'numeric') throw new Error(`${id}: no numeric route`)
      expect(route.value).toBe(amount)
      expect(route.unit).toBe('%')
      // p.28 gives the amount its range outright: "any amount from -100% to +100%".
      expect(route.range).toEqual({ min: -100, max: 100, verified: expect.anything() })
      expect(route.range.verified).toEqual({
        kind: 'manual',
        source: 'MicroFreak User Manual 4.0.3 p.28',
      })
      // p.30: "The first four destinations are Pitch, Wave, Timbre, and Cutoff." Assign 1-3 are
      // whatever a reader assigns them to, so a recipe may not name one without saying which knob.
      expect(HARDWIRED_DESTINATIONS, `${id} routes to ${destination}`).toContain(destination)
    })
  }

  for (const [id, why] of LFO_DROPPED) {
    it(`drops the LFO from ${id}: ${why}`, () => {
      const r = recipe(id)
      expect(lfoBlock(r).map((p) => p.name), id).toEqual([])
      expect(lfoRoutes(r).map((p) => p.name), id).toEqual([])
    })
  }

  /**
   * #465 removed three parameters from seven recipes and added one to nine. It was allowed to
   * touch nothing else, and a Matrix row from another source is exactly what a careless edit takes
   * with it — `mf-vox-chop-dirty`'s `PRESSURE` row is the whole reason its LFO went.
   */
  it('leaves every Matrix row from another source alone', () => {
    const others = new Map<string, number>()
    for (const r of device.recipes) {
      for (const p of params(r)) {
        if (!p.name.startsWith('Matrix  ') || p.name.startsWith('Matrix  LFO > ')) continue
        if (p.kind !== 'numeric') throw new Error(`${r.id}: ${p.name} is not numeric`)
        others.set(`${r.id} ${p.name}`, p.value)
      }
    }
    expect(Object.fromEntries([...others].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))).toEqual({
      'mf-bass-mid-dirty Matrix  ENV > Cutoff': 44,
      'mf-lead-bright Matrix  PRESSURE > Timbre': 42,
      'mf-lead-hard Matrix  ENV > Timbre': -38,
      'mf-pad-soft Matrix  CycEnv > Cutoff': 28,
      'mf-texture-dark Matrix  CycEnv > Timbre': 48,
      'mf-vox-chop-dirty Matrix  PRESSURE > Timbre': 56,
    })
  })

  /**
   * p.30: *"the Matrix also serves as a mixer. You could for example control the pitch of the
   * oscillator with the Key/Arp source and with the LFO. The two modulations are added together."*
   * So a second row is the manual's own worked example, and `mf-lead-hard` stacking the LFO onto a
   * destination the envelope already has is the case that quotation exists to license.
   */
  it('keeps every recipe well inside the 35 patch points, and stacks where p.30 says it may', () => {
    for (const r of device.recipes) {
      const rows = params(r).filter((p) => p.name.startsWith('Matrix  '))
      expect(rows.length, r.id).toBeLessThanOrEqual(35)
      expect(rows.length, r.id).toBeLessThanOrEqual(3)
    }
    const hard = params(recipe('mf-lead-hard'))
      .filter((p) => p.name.startsWith('Matrix  ') && p.name.endsWith(' > Timbre'))
      .map((p) => p.name)
    expect(hard).toEqual(['Matrix  LFO > Timbre', 'Matrix  ENV > Timbre'])
  })
})
