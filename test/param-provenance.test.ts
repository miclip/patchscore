import { describe, expect, it } from 'vitest'
import { ROLES } from '../lib/core/index'
import type { Cite } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { capabilityGaps, devicePage, paramProvenance } from '../lib/studio/device-page'
import type { ParamOccurrence } from '../lib/studio/device-page'
import { auditDevice } from '../lib/studio/provenance'
import { device, numericParam, recipe } from './fixtures'
import { renderToStaticMarkup } from 'react-dom/server'
import DevicePageRoute from '../app/devices/[id]/page'

/**
 * §3.2/#410. **Which page one parameter was read off**, on the surface built for the reader at a
 * desk rather than at the machine.
 *
 * The counts have always been on the device page and the documents have always been named; what
 * no surface could do was point. `DECAY`, `TUNE` and `MORPH` on one box contributed to the same
 * totals and to the same document list, so somebody with `DECAY 38 (0…255)` in front of them had
 * to open the device folder and read TypeScript to find p.7.
 *
 * These tests are about the view model only. Nothing here renders, and nothing in a guide moves —
 * #394's block sentence is the guide's whole answer and #410 says so explicitly.
 */

const TR6S = DEVICES.find((d) => d.id === 'roland-tr-6s') as (typeof DEVICES)[number]
const TR1000 = DEVICES.find((d) => d.id === 'roland-tr-1000') as (typeof DEVICES)[number]
const MINILOGUE = DEVICES.find((d) => d.id === 'korg-minilogue-xd') as (typeof DEVICES)[number]

/** Every occurrence of one name, wherever the grouping put it. */
function occurrencesFrom(
  target: Parameters<typeof paramProvenance>[0],
  name: string,
): readonly ParamOccurrence[] {
  return paramProvenance(target)
    .flatMap((group) => group.params)
    .filter((entry) => entry.name === name)
    .flatMap((entry) => entry.occurrences)
}

const occurrencesOf = (deviceId: string, name: string): readonly ParamOccurrence[] =>
  occurrencesFrom(DEVICES.find((d) => d.id === deviceId) as (typeof DEVICES)[number], name)

const sourceOf = (cite: Cite | undefined): string | undefined => cite?.source

describe('a parameter says which page its bounds were read off (#410)', () => {
  /**
   * The issue's own done-when, on the device it names. A reader holding `DECAY 38 (0…255)` gets
   * the range *and* the page, and gets it under the name they arrived with.
   */
  it('answers the TR-6S DECAY question the guide cannot', () => {
    const decay = occurrencesOf('roland-tr-6s', 'DECAY')
    expect(decay.length).toBeGreaterThan(0)
    for (const occurrence of decay) {
      expect(occurrence.range).toEqual({
        min: 0,
        max: 255,
        cite: { kind: 'manual', source: 'TR-6S Parameter Guide eng02, p.7' },
      })
    }
  })

  /**
   * The point is a separate claim from the range and stays separate here (§3.1). Every TR-6S
   * `DECAY` is a number somebody chose inside bounds somebody read, and the model must be able
   * to say both at once — a cited range does not verify the point inside it.
   */
  it('keeps the point provisional where only the range is cited', () => {
    for (const occurrence of occurrencesOf('roland-tr-6s', 'DECAY')) {
      expect(occurrence.point).toBeUndefined()
      expect(occurrence.range?.cite).toBeDefined()
    }
  })

  /** §3.2. An enum's legality gate is its option set, and it is cited on its own terms. */
  it('carries an enum option set and its citation', () => {
    const [first] = occurrencesOf('roland-tr-6s', 'INST FX TYPE')
    expect(first?.kind).toBe('enum')
    expect(first?.options?.values).toContain('TRANSIENT')
    expect(sourceOf(first?.options?.cite)).toBe('TR-6S Parameter Guide eng02, p.8')
    expect(first?.range).toBeUndefined()
  })

  /**
   * §3.1. A param with no citation of its own takes the recipe's, exactly as the resolver and the
   * audit do. No device in the library authors a recipe-level citation today, so this is the one
   * claim here that real data cannot make — a fixture makes it instead, rather than the rule
   * going unchecked because nobody has used it yet.
   */
  it('inherits the recipe default where a param cites nothing', () => {
    const inheriting = device({
      recipes: [
        recipe({
          verified: { kind: 'manual', source: 'fixture manual p.42' },
          params: [numericParam({ verified: undefined, range: { min: 0, max: 100 } })],
        }),
      ],
    })
    const [tune] = occurrencesFrom(inheriting, 'TUNE')
    expect(sourceOf(tune?.point)).toBe('fixture manual p.42')
    expect(sourceOf(tune?.range?.cite)).toBe('fixture manual p.42')
  })
})

describe('one occurrence per recipe (#410)', () => {
  /**
   * The TR-1000 reads `DECAY` off five pages of one manual, because five instrument types print
   * their own parameter table. De-duplicating by name would pick one of the five and discard the
   * other four silently, which is the failure this issue exists to end rather than a tidier
   * version of it.
   */
  it('keeps every citation a repeated name carries', () => {
    const sources = new Set(
      occurrencesOf('roland-tr-1000', 'DECAY').map((o) => sourceOf(o.range?.cite)),
    )
    expect(sources.size).toBeGreaterThan(1)
    expect(sources).toContain('TR-1000 Reference Manual (eng02) v1.13+, p.59')
    expect(sources).toContain('TR-1000 Reference Manual (eng02) v1.13+, p.63')
  })

  /** Recipe title, role and character: what tells two lines of the same name apart. */
  it('identifies each occurrence by the recipe it was authored on', () => {
    const decay = occurrencesOf('roland-tr-1000', 'DECAY')
    const byRecipe = new Map(TR1000.recipes.map((r) => [r.id, r]))
    expect(new Set(decay.map((o) => o.recipeId)).size).toBe(decay.length)
    for (const occurrence of decay) {
      const source = byRecipe.get(occurrence.recipeId)
      expect(occurrence.title).toBe(source?.title)
      expect(occurrence.role).toBe(source?.role)
      expect(occurrence.character).toBe(source?.character)
    }
  })

  /**
   * Nothing counted and then hidden, which is the accounting rule `capabilityGaps` is already
   * held to. Every authored parameter on every box reaches exactly one group.
   */
  it('accounts for every authored parameter on every device', () => {
    for (const target of DEVICES) {
      const occurrences = paramProvenance(target)
        .flatMap((group) => group.params)
        .flatMap((entry) => entry.occurrences)
      /*
       * §3.2/#511. **A routing's ends are counted and are shown**, which is the whole of the rule
       * this test enforces rather than an exception to it.
       *
       * The audit counts a claim, and a modulation makes more of them than a knob: the depth, the
       * source, the destination, and a polarity switch where the box has one. Each is somebody's
       * separate reading off a separate page, and `RoutingRow` draws each as its own row under
       * the name. Counting only the occurrence would let three cited claims on the Mother-32 be
       * totalled by `audit` and hidden by this page — the accounting hole in the other direction.
       */
      const shown = occurrences.length + occurrences.reduce((n, o) => n + (o.routing?.length ?? 0), 0)
      expect(shown, target.id).toBe(auditDevice(target).counts.params)
    }
  })
})

describe('grouped by module, and by role where there is none (#410)', () => {
  /**
   * The TR-6S names no panel modules at all, and two thirds of the library is like it. A single
   * undifferentiated heap of 211 parameters is a flat list with a bigger font, so those fall back
   * to the role the recipe was authored for — never to a bucket called `Other`, which names
   * nothing and reports a real fact as a gap.
   */
  it('groups an unmoduled box by role', () => {
    const groups = paramProvenance(TR6S)
    expect(groups.length).toBeGreaterThan(0)
    expect(groups.every((g) => g.kind === 'role')).toBe(true)
    const roles = groups.flatMap((g) => (g.kind === 'role' ? [g.role] : []))
    expect(roles).toEqual(ROLES.filter((r) => roles.includes(r)))
    expect(new Set(roles).size).toBe(roles.length)
  })

  /**
   * The minilogue xd is the mixed case and the reason the fallback is per parameter rather than
   * per device: seven modules, and one `SWING` that belongs to no panel block. The module keeps
   * its module and `SWING` lands under the roles that author it.
   */
  it('groups a moduled box by module, and its unmoduled params by role', () => {
    const groups = paramProvenance(MINILOGUE)
    const modules = groups.flatMap((g) => (g.kind === 'module' ? [g.module] : []))
    expect(modules).toContain('FILTER')
    expect(modules).toContain('VOICE MODE')
    const portamento = groups.find(
      (g) => g.kind === 'module' && g.module === 'MASTER',
    )
    expect(portamento?.params.map((p) => p.name)).toContain('PORTAMENTO')

    const roleGroups = groups.flatMap((g) => (g.kind === 'role' ? [g] : []))
    expect(roleGroups.length).toBeGreaterThan(0)
    for (const group of roleGroups) {
      expect(group.params.map((p) => p.name)).toEqual(['SWING'])
    }
  })

  /**
   * §7.2/invariant 6. Code unit order for names and modules — never `localeCompare`, whose ICU
   * collation varies by platform and would reorder this page on CI with no error anywhere.
   * Module groups precede role groups: *where on the panel* and *what for* are answers to
   * different questions, and a reader working down a panel should not meet `kick` between
   * `FILTER` and `MIXER`.
   */
  it('orders deterministically, modules before roles', () => {
    for (const target of DEVICES) {
      const groups = paramProvenance(target)
      const kinds = groups.map((g) => g.kind)
      // Every module group before every role group, whichever of the two the box has.
      expect(kinds, target.id).toEqual([
        ...kinds.filter((k) => k === 'module'),
        ...kinds.filter((k) => k === 'role'),
      ])
      const modules = groups.flatMap((g) => (g.kind === 'module' ? [g.module] : []))
      expect(modules, target.id).toEqual([...modules].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
      for (const group of groups) {
        const names = group.params.map((p) => p.name)
        expect(names, target.id).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
        for (const entry of group.params) {
          const ids = entry.occurrences.map((o) => o.recipeId)
          expect(ids, `${target.id} ${entry.name}`).toEqual(
            [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
          )
        }
      }
    }
  })

  /** A box with no recipes has nothing to group, and says so with no groups rather than one empty one. */
  it('is empty for a box with no recipes', () => {
    for (const target of DEVICES.filter((d) => d.recipes.length === 0)) {
      expect(devicePage(target).paramProvenance, target.id).toEqual([])
    }
  })
})

describe('a capability fact discloses what the manifest recorded (#410)', () => {
  const gapsFor = (id: string) => {
    const target = DEVICES.find((d) => d.id === id) as (typeof DEVICES)[number]
    return capabilityGaps(target, auditDevice(target).findings)
  }
  const factAt = (id: string, path: string) =>
    gapsFor(id)
      .flatMap((g) => g.facts)
      .find((f) => f.path === path)

  /**
   * §2.6. `reason` is required by the schema on three states and reached no rendered surface: a
   * field an author writes for the schema rather than for a reader. #410 names it and the page
   * behind a `cited-against` as the same gap this issue closes.
   */
  it('carries the reason and the page behind a cited-against fact', () => {
    const fact = factAt('behringer-neutron', 'clock.preferredSource')
    expect(fact?.reason).toContain('the manual answers the question')
    expect(fact?.cite).toEqual({ kind: 'manual', source: 'Neutron User Manual, p.13' })
  })

  /** Every state that the schema requires a reason of arrives carrying one. */
  it('carries a reason on every undocumented and unread fact', () => {
    for (const target of DEVICES) {
      for (const gap of capabilityGaps(target, auditDevice(target).findings)) {
        if (gap.kind !== 'undocumented' && gap.kind !== 'unread') continue
        for (const fact of gap.facts) {
          expect(fact.reason, `${target.id} ${fact.path}`).toBeTruthy()
        }
      }
    }
  })

  /**
   * §2.6/#236. `partly` keeps its two halves apart — one has a page behind it and one does not —
   * because folding either into a `reason` restores the prose workaround the state replaced.
   */
  it('keeps a partly-cited fact’s two halves apart', () => {
    const fact = factAt('behringer-model-d', 'features.lfo')
    expect(fact?.cite).toEqual({ kind: 'manual', source: 'MODEL D User Manual, p.34' })
    expect(fact?.proven).toBeTruthy()
    expect(fact?.open).toBeTruthy()
    expect(fact?.reason).toBeUndefined()
  })

  /**
   * `false` is a manifest saying nobody checked. It has nothing else to say and nothing is
   * invented for it — no reason, no page, and on the page no expander, because one opening onto
   * an empty box tells a reader they have missed something.
   *
   * A fixture, because no manifest in the library records `false` at any path today. The state is
   * legal, the schema accepts it and the audit counts it, so the branch is reachable by the next
   * device that writes one; a sweep over `DEVICES` would pass here by finding nothing.
   */
  it('says nothing beyond the path for an unchecked fact', () => {
    const unchecked = device({ capabilityEvidence: { 'io.usbAudio': false } })
    const gaps = capabilityGaps(unchecked, auditDevice(unchecked).findings)
    const gap = gaps.find((g) => g.kind === 'unchecked')
    expect(gap?.facts).toEqual([{ path: 'io.usbAudio' }])
  })
})

// ---------------------------------------------------------------------------
// On the page
// ---------------------------------------------------------------------------

/**
 * §8/#410. The claims have to be *in the markup*, not merely in the view model: this page is a
 * server component with no client boundary (#84), so what is prerendered is what a reader with no
 * JavaScript, a crawler, and a printout all get. A `<details>` that is closed is still rendered.
 */
async function markupFor(id: string): Promise<string> {
  return renderToStaticMarkup(await DevicePageRoute({ params: Promise.resolve({ id }) }))
}

function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

describe('the parameter sources panel (#410)', () => {
  it('puts the TR-6S DECAY page in the markup, under the name a reader arrives with', async () => {
    const markup = await markupFor('roland-tr-6s')
    expect(markup).toContain('Parameter sources')
    // The name is ink, and monospace: it is an identifier printed on the box (§10).
    expect(markup).toContain('<span class="mono">DECAY</span>')
    // The whole point of the issue: the page behind `DECAY 38 (0…255)`, reachable without
    // opening the repository. Typed, so `manual` and `observed` cannot read as one claim.
    expect(markup).toContain('manual — TR-6S Parameter Guide eng02, p.7')
    expect(markup).toContain('0…255')
  })

  /** The point is a claim of its own, and its absence has its own word (§3.2). */
  it('says provisional of the point and names the document for the bounds', async () => {
    const markup = await markupFor('roland-tr-6s')
    expect(markup).toContain('>provisional<')
    expect(markup).toContain('Value cited to')
    expect(markup).toContain('Bounds or options cited to')
  })

  /** §3.2. An enum's option set is cited independently, and the list it was read off renders. */
  it('renders an enum option set with its own citation', async () => {
    const markup = await markupFor('roland-tr-6s')
    expect(markup).toContain('manual — TR-6S Parameter Guide eng02, p.8')
    expect(markup).toContain('THRU · HPF · LPF')
  })

  /**
   * The repeated-name case, on the box that has it worst. All five pages render, and each row
   * carries the recipe that authored it — a page number with no recipe beside it is a citation a
   * reader cannot match to the line they are holding.
   */
  it('renders every citation and every recipe identity for a repeated name', async () => {
    const markup = await markupFor('roland-tr-1000')
    const decay = occurrencesOf('roland-tr-1000', 'DECAY')
    const sources = new Set(decay.map((o) => o.range?.cite?.source))
    expect(sources.size).toBeGreaterThan(1)
    for (const source of sources) {
      expect(markup, source).toContain(escaped(`manual — ${source as string}`))
    }
    for (const occurrence of decay) {
      expect(markup, occurrence.recipeId).toContain(escaped(occurrence.title))
      expect(markup, occurrence.recipeId).toContain(
        `${occurrence.role} · ${occurrence.character}`,
      )
    }
  })

  /**
   * #21. Wide content scrolls inside its own container and the page body never does. This is the
   * structural half of that rule — the half a static render can prove: every occurrence table is
   * inside a scroller, and none of them is loose in the panel.
   */
  it('puts every occurrence table inside its own horizontal scroller', async () => {
    for (const id of ['roland-tr-6s', 'moog-muse', 'synthstrom-deluge']) {
      const markup = await markupFor(id)
      const panel = markup.slice(markup.indexOf('param-sources'))
      const tables = (panel.match(/<table>/g) ?? []).length
      const scrollers = (panel.match(/<div class="table-scroll"><table>/g) ?? []).length
      expect(tables, id).toBeGreaterThan(0)
      expect(scrollers, id).toBe(tables)
    }
  })

  /** A box with nothing authored says nothing here rather than printing an empty panel. */
  it('prints no panel for a box with no recipes', async () => {
    const markup = await markupFor('empress-zoia-euroburo')
    expect(markup).not.toContain('Parameter sources')
  })
})

describe('capability reasons on the page (#410)', () => {
  it('renders the reason and the page behind a cited-against fact', async () => {
    const markup = await markupFor('behringer-neutron')
    expect(markup).toContain('<summary class="mono">clock.preferredSource</summary>')
    expect(markup).toContain(escaped('the manual answers the question'))
    expect(markup).toContain('manual — Neutron User Manual, p.13')
  })

  /** §2.6/#236. Both halves of a partly-cited fact, labelled, with the page under them. */
  it('renders both halves of a partly-cited fact', async () => {
    const markup = await markupFor('behringer-model-d')
    expect(markup).toContain('The page establishes')
    expect(markup).toContain('It leaves open')
    expect(markup).toContain('manual — MODEL D User Manual, p.34')
  })

  /**
   * Every disclosure a reader can open is one with something behind it. No manifest in the
   * library records an `unchecked` fact today, so the bare-path branch is unreachable from real
   * data — what the page can be held to is that nothing it renders as an expander is empty.
   */
  it('opens no empty disclosure', async () => {
    for (const target of DEVICES) {
      const markup = await markupFor(target.id)
      expect(markup, target.id).not.toContain('<div class="disclosure-body"></div>')
    }
  })
})
