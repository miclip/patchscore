import { describe, expect, it } from 'vitest'
import { patchVoiceCeiling } from '../lib/core/device'
import { expand, resolveRecipe } from '../lib/core/resolver'
import { DEVICES } from '../lib/devices/registry.generated'
import type { Recipe } from '../lib/core/index'

/**
 * §12.4/#85. **A recipe could lower a request's demand but not a voice's supply.**
 *
 * `realisation` is demand-side: `sampled-chord` says a patch needs fewer voices than the request
 * implies. There was no counterpart for a patch that *spends* the voices the box has, and two
 * minilogue xd controls do exactly that — UNISON stacks all four onto one note, and a non-zero
 * VOICE MODE DEPTH under POLY halves four into two.
 *
 * The failure was silent by construction: every cited range still right, `requiredVoicePolyphony`
 * still satisfied, and a guide reading as correct while describing a patch that cannot play the
 * part.
 */

const xd = DEVICES.find((d) => d.id === 'korg-minilogue-xd')!
const voice = expand(xd)[0]!
const outcome = (role: string, notes: number) =>
  resolveRecipe(xd, voice, role as never, 'dark' as never, notes)

describe('a patch cannot be handed more notes than it sounds (#85)', () => {
  it('has a four-voice assignable, so the box is not what refuses', () => {
    // The point of the fix. `Assignable.polyphony` is a fact about the box and stays 4; what a
    // patch spends is a fact about the patch. If this ever reads 1 the tests below prove nothing.
    expect(voice.polyphony).toBe(4)
  })

  it('refuses a UNISON patch a second note', () => {
    // Before #85 this chose `mxd-sub-dark`: 2 <= 4, every value cited, nothing to catch it.
    expect(outcome('sub', 1).outcome).toBe('exact')
    expect(outcome('sub', 2).outcome).toBe('unvoiced')
  })

  it('lets a DUO patch take two notes and refuses a third', () => {
    // A non-zero depth is two voices per key out of four, so the cap is 2 rather than 1 — the
    // distinction a single "is it mono" flag could not have made.
    expect(outcome('lead', 2).outcome).toBe('exact')
    expect(outcome('lead', 3).outcome).toBe('unvoiced')
  })

  it('takes the lower of the two limits, never one or the other', () => {
    const capped = { patchPolyphony: 2 } as Recipe
    const uncapped = {} as Recipe
    // The box is the limit when the patch does not cap below it.
    expect(patchVoiceCeiling(uncapped, 4)).toBe(4)
    expect(patchVoiceCeiling(capped, 4)).toBe(2)
    // And the box still wins when it is the smaller: a two-voice box running a patch that could
    // sound four sounds two.
    expect(patchVoiceCeiling(capped, 1)).toBe(1)
  })
})

describe('the cap changes nothing for a box that declares none', () => {
  it('leaves every other device untouched', () => {
    // #85 is a new optional field, so absence has to be the pre-#85 behaviour exactly. Asserted
    // over the library rather than argued: only the minilogue declares it.
    const declaring = DEVICES.filter((d) => d.recipes.some((r) => r.patchPolyphony !== undefined))
    expect(declaring.map((d) => d.id)).toEqual(['korg-minilogue-xd'])
  })

  it('is the box own polyphony where no recipe caps', () => {
    const tr = DEVICES.find((d) => d.id === 'roland-tr-8s')!
    for (const recipe of tr.recipes) expect(patchVoiceCeiling(recipe, 3)).toBe(3)
  })
})
