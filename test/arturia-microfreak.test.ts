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
