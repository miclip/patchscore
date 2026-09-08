import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecipeSchema, recipeRouting } from '../lib/core/index'
import type { Device, Recipe } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import KitRoute from '../app/devices/[id]/kit/page'
import DevicePageRoute from '../app/devices/[id]/page'
import { kitSession, sharedRoutingPreamble } from '../lib/studio/kit-session'
import { renderKitSession } from '../lib/studio/kit-markdown'
import { kitRouting } from '../lib/studio/kit-text'

/**
 * §3.7/#496. **A fact about the box is printed once, and the split that makes that possible costs
 * §8 nothing.**
 *
 * The bug was six of nine kit pages opening every sound with the same paragraph — 194 identical
 * characters, eight times, on the Cascadia — and the reason no test caught it is worth keeping in
 * front of whoever reads this file: **every test asserted the sentence was *present*, and a
 * sentence printed eight times passes that.**
 *
 * So what is pinned here is structural rather than a similarity measure. For each of the six boxes
 * that authored the split, on each of the three renderers: the session carries the authored
 * preamble, the renderer prints it **exactly once**, and every slot prints **exactly its authored
 * tail** and nothing else. A regression puts the paragraph back on every sound, and each of those
 * three claims fails when it does.
 *
 * There is deliberately no bound on how alike two tails may be. What two authors happen to open a
 * sentence with is prose, and a character count over it would be an authoring policy nobody
 * decided — it would fail a device whose sounds honestly begin the same way (the Matriarch's seven
 * kit sounds all really are `VOICE MODE 1`) and pass a device that had quietly reintroduced the
 * bug in different words.
 *
 * The other half is that this is a rendering change: `recipeRouting` composes the authored halves
 * back into the string a device folder used to write whole, so §8 receives exactly what it
 * received before. The guide goldens beside this file are the proof of that, and they did not move.
 */

/** The six folders that authored the split, in registry order. */
const MIGRATED = [
  'intellijel-cascadia',
  'moog-dfam',
  'moog-grandmother',
  'moog-matriarch',
  'moog-mother-32',
  'moog-subharmonicon',
] as const

/** Three boxes with a kit that write each routing line whole — the unhoisted path (#496). */
const UNHOISTED = ['behringer-model-d', 'behringer-neutron', 'polyend-play-plus'] as const

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no device ${id}`)
  return device
}

function sessionOf(id: string) {
  const session = kitSession(byId(id))
  if (session === undefined) throw new Error(`${id} offers no kit`)
  return session
}

/** The preamble a migrated box's session carries, or a failure naming the box. */
function preambleOf(id: string): string {
  const preamble = sessionOf(id).routingPreamble
  if (preamble === undefined) throw new Error(`${id}: no shared preamble on the session`)
  return preamble
}

/** Every `Routing — ` line the Markdown prints, in document order, label stripped. */
function markdownRouting(id: string): string[] {
  return renderKitSession(sessionOf(id))
    .split('\n')
    .filter((line) => line.startsWith('Routing — '))
    .map((line) => line.slice('Routing — '.length))
}

async function kitMarkup(id: string): Promise<string> {
  return renderToStaticMarkup(await KitRoute({ params: Promise.resolve({ id }) }))
}

async function devicePageMarkup(id: string): Promise<string> {
  return renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id }) }))
}

/** Markup as a reader reads it: tags become spaces, entities come back, space collapses. */
function plain(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const occurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

/**
 * A minimal recipe to hang the two fields off. Everything but `routing` is the least the schema
 * accepts, because what is under test is the pair and not the rest of §3.
 */
function recipe(over: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r',
    role: 'kick',
    character: 'hard',
    voice: 'bd',
    title: 'A kick',
    params: [],
    ...over,
  } as Recipe
}

// ---------------------------------------------------------------------------
// The composition, which is what makes the split invisible to §8
// ---------------------------------------------------------------------------

describe('recipeRouting composes the halves a device folder authors', () => {
  it('joins with a full stop by default, and with a comma on request', () => {
    expect(
      recipeRouting(recipe({ routingPreamble: 'Clock it at ADV / CLOCK', routing: 'No cable' })),
    ).toBe('Clock it at ADV / CLOCK. No cable')
    expect(
      recipeRouting(
        recipe({
          routingPreamble: 'Played from its own keyboard',
          routingJoin: 'clause',
          routing: 'VOICE MODE 1. No cable',
        }),
      ),
    ).toBe('Played from its own keyboard, VOICE MODE 1. No cable')
  })

  it('hands back an unsplit routing line unchanged, and undefined for no line at all', () => {
    expect(recipeRouting(recipe({ routing: 'Keep out of the analog FX path' }))).toBe(
      'Keep out of the analog FX path',
    )
    expect(recipeRouting(recipe())).toBeUndefined()
  })

  it('refuses the shapes that would render as something nobody authored', () => {
    // A preamble with no sound-specific half: the kit page would hoist the whole line into its
    // header and the sound itself would say nothing.
    expect(RecipeSchema.safeParse(recipe({ routingPreamble: 'Clock it at ADV' })).success).toBe(
      false,
    )
    // A join with nothing to join to.
    expect(
      RecipeSchema.safeParse(recipe({ routing: 'No cable', routingJoin: 'clause' })).success,
    ).toBe(false)
    // Trailing punctuation: `recipeRouting` supplies the join and `kitRouting` the header's stop,
    // so an authored one produces `…ADV / CLOCK.. No cable` and a stray mark in the header.
    for (const bad of ['Clock it at ADV.', 'Clock it at ADV,']) {
      expect(
        RecipeSchema.safeParse(recipe({ routingPreamble: bad, routing: 'No cable' })).success,
        bad,
      ).toBe(false)
    }
    // The split itself, accepted.
    expect(
      RecipeSchema.safeParse(
        recipe({ routingPreamble: 'Clock it at ADV', routingJoin: 'clause', routing: 'No cable' }),
      ).success,
    ).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// The model: what a page may hoist, and what it may not
// ---------------------------------------------------------------------------

describe('a preamble is hoisted only where every sound carries the same one', () => {
  it('answers with the shared string, or undefined where one sound differs', () => {
    const shared = [
      recipe({ id: 'a', routingPreamble: 'Clocked', routing: 'one' }),
      recipe({ id: 'b', routingPreamble: 'Clocked', routing: 'two' }),
    ]
    expect(sharedRoutingPreamble(shared)).toBe('Clocked')
    // One sound out of two without it, and the header would be making a claim untrue of the
    // sound a reader is looking at.
    expect(sharedRoutingPreamble([...shared, recipe({ id: 'c', routing: 'three' })])).toBeUndefined()
    expect(
      sharedRoutingPreamble([
        ...shared,
        recipe({ id: 'd', routingPreamble: 'Played', routing: 'four' }),
      ]),
    ).toBeUndefined()
    expect(sharedRoutingPreamble([])).toBeUndefined()
  })

  it('names exactly the six boxes that authored the split', () => {
    // #496's own table. Six folders route every recipe through one constant; the rest write each
    // line whole, which is why the fix had to be a split rather than something a renderer does.
    const hoisting = DEVICES.filter((device) => kitSession(device)?.routingPreamble !== undefined)
      .map((device) => device.id)
      .sort()
    expect(hoisting).toEqual([...MIGRATED].sort())
  })
})

// ---------------------------------------------------------------------------
// The regression itself, on every migrated box and every renderer
// ---------------------------------------------------------------------------

describe('every migrated box says its shared fact once and prints only tails', () => {
  it('carries the authored preamble on the session, and it is every slot’s own', () => {
    for (const id of MIGRATED) {
      const session = sessionOf(id)
      const preamble = preambleOf(id)
      // Authored, not derived: the session's string is the object identity every recipe holds.
      for (const slot of session.slots) {
        expect(slot.recipe.routingPreamble, `${id}/${slot.recipe.id}`).toBe(preamble)
        expect(slot.recipe.routing, `${id}/${slot.recipe.id}`).toBeDefined()
        // The tail is the tail. A folder that left the shared sentence in both halves would
        // print it twice in a guide and once too often here.
        expect(slot.recipe.routing, `${id}/${slot.recipe.id}`).not.toContain(preamble)
      }
      expect(session.slots.length, id).toBeGreaterThan(3)
    }
  })

  it('prints it exactly once in the Markdown, above tails that repeat none of it', () => {
    for (const id of MIGRATED) {
      const session = sessionOf(id)
      const preamble = preambleOf(id)
      const markdown = renderKitSession(session)
      expect(occurrences(markdown, preamble), id).toBe(1)

      const lines = markdownRouting(id)
      // The header sentence first, then one line per sound, each exactly its authored tail.
      expect(lines[0], id).toBe(kitRouting(preamble))
      expect(lines.slice(1), id).toEqual(session.slots.map((slot) => slot.recipe.routing))
    }
  })

  it('prints it exactly once on the standalone page, in one header paragraph', async () => {
    for (const id of MIGRATED) {
      const session = sessionOf(id)
      const preamble = preambleOf(id)
      const markup = await kitMarkup(id)
      // One header paragraph, and the fact inside it once on the whole page.
      expect(occurrences(markup, 'class="kit-routing"'), id).toBe(1)
      const text = plain(markup)
      expect(occurrences(text, preamble), id).toBe(1)
      expect(text, id).toContain(`Routing — ${kitRouting(preamble)}`)
      // Every sound's own half, in model order, and nothing else under it.
      let at = 0
      for (const slot of session.slots) {
        const wanted = `Routing — ${plain(slot.recipe.routing ?? '')}`
        const found = text.indexOf(wanted, at)
        expect(found, `${id}/${slot.recipe.id}`).toBeGreaterThanOrEqual(at)
        at = found + wanted.length
      }
    }
  })

  it('prints it exactly once in the device page’s folded panel', async () => {
    // The panel folds each sound away, so the repetition is not on screen the way it is on the
    // page — but it is in the markup a crawler and a reader with no JavaScript receive, and on
    // screen the moment somebody opens two sounds to compare them.
    for (const id of MIGRATED) {
      const preamble = preambleOf(id)
      const markup = await devicePageMarkup(id)
      expect(occurrences(markup, 'class="kit-routing"'), id).toBe(1)
      expect(occurrences(plain(markup), preamble), id).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// The unhoisted path, which is the other half of honest
// ---------------------------------------------------------------------------

describe('a box that shares no preamble is left exactly as it was', () => {
  it('reports no shared preamble at all', () => {
    for (const id of UNHOISTED) {
      expect(sessionOf(id).routingPreamble, id).toBeUndefined()
      expect(kitRouting(sessionOf(id).routingPreamble), id).toBeUndefined()
    }
  })

  it('drops nothing from the Markdown: every slot prints its whole routing line', () => {
    for (const id of UNHOISTED) {
      const session = sessionOf(id)
      const lines = markdownRouting(id)
      const expected = session.slots.flatMap((slot) => {
        const routing = recipeRouting(slot.recipe)
        return routing === undefined ? [] : [routing]
      })
      expect(lines, id).toEqual(expected)
    }
  })

  it('renders no header sentence where there is nothing to hoist', async () => {
    for (const id of UNHOISTED) {
      expect(await kitMarkup(id), id).not.toContain('kit-routing')
      expect(await devicePageMarkup(id), id).not.toContain('kit-routing')
    }
  })
})
