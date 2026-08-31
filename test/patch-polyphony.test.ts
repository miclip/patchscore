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
    // over the library rather than argued, and pinned so that a third device declaring it is a
    // decision somebody made rather than a diff nobody read.
    //
    // The Muse is the second, and it declares the field for a narrower reason than the minilogue
    // does. That box has three rungs — POLY, DUO and UNISON — and two of them spend voices. This
    // one has a single cited rung: `MONO`, which p.105 says *"will restrict the timbre to
    // operating in a monophonic mode. Only one voice will be used at a time and polyphonic
    // playing will be disabled."* Its `UNISON` deliberately does **not** cap anything — it
    // *"will stack any currently unused voices on top of the active ones"*, which is dynamic
    // thickness rather than a mono mode, and modelling it as `patchPolyphony: 1` would be the
    // manifest inventing a limit the manual does not state.
    //
    // **The MicroFreak is the third, and it is the first to declare the field for a reason that
    // is not a voice-mode rung at all.** Its four-note paraphony lives in `VoiceSpec.polyphony`,
    // as the Matriarch's does; what `patchPolyphony: 1` records here is the three separate
    // printed facts that collapse a *patch* to one note — the `Paraphonic` button being unlit
    // (p.10), Unison spending all four voices on one note (p.102), and the `Chords` oscillator
    // model, of which p.42 says "Paraphony deactivates in this mode". Thirteen of its
    // twenty-two recipes hit one of the three, and its own test asserts the pairing both ways.
    const declaring = DEVICES.filter((d) => d.recipes.some((r) => r.patchPolyphony !== undefined))
    expect(declaring.map((d) => d.id)).toEqual([
      'arturia-microfreak',
      // **The NEUTRON is the fifth, and the first where the field is on most of the recipes
      // rather than a few.** Its `polyphony: 2` is true only with PARAPHONIC in — p.14: "a
      // Neutron in Paraphonic mode will handle 2 notes" — so the sixteen recipes that leave the
      // switch out declare `patchPolyphony: 1` and the three that engage it do not. Same shape as
      // the MicroFreak's paraphony, at a smaller number and with the switch on the panel rather
      // than three separate facts spread over three chapters.
      'behringer-neutron',
      'korg-minilogue-xd',
      'moog-muse',
      // The Circuit Tracks is the fourth, and its reason is the plainest in the list: p.35 states
      // six-note polyphony and then qualifies it — "if the Patch you've selected is suitably
      // polyphonic" — and four of its nine synth recipes put the patch in a Mono polyphony mode
      // (Programmer's Reference p.3). Its own test asserts the pairing both ways.
      'novation-circuit-tracks',
      // **The Play+ is the sixth, and it declares the field exactly once.** Its synth pool carries
      // `polyphony: 8` because p.13 calls those tracks "8 Polyphonic MIDI / Synth tracks" and p.91
      // budgets eight voices across the three slots. One engine contradicts that at the patch:
      // p.90 introduces ACD as a recreation of "iconic single-oscillator monophonic analog synths",
      // so `pp-acid-dirty` spends one note and says so, while the two other synth recipes leave the
      // field off and take the pool's eight.
      'polyend-play-plus',
    ])
  })

  it('is the box own polyphony where no recipe caps', () => {
    const tr = DEVICES.find((d) => d.id === 'roland-tr-8s')!
    for (const recipe of tr.recipes) expect(patchVoiceCeiling(recipe, 3)).toBe(3)
  })
})
