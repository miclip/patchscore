import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ROLES } from '../lib/core/index'
import type { Role } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { deviceHref, deviceLabel, templateHref } from '../lib/studio/catalogue'
import { TEMPLATES } from '../lib/templates/index'
import {
  ANY_KIND,
  NO_DEVICE_FILTER,
  deviceFields,
  deviceView,
  kindsPresent,
  matches,
  queryTerms,
  templateFields,
  templateView,
} from '../lib/studio/picker'
import type { DeviceFilter } from '../lib/studio/picker'
import { DevicePicker } from '../components/device-picker'
import { GenrePicker } from '../components/genre-picker'

/**
 * #53. Searching the two picker lists.
 *
 * The claims worth testing are about *which fields exclude what* and about the one rule that
 * makes filtering safe — a selected entry is never hidden — so almost all of this runs against
 * the pure view in `lib/studio/picker.ts`. Vitest is in Node with no DOM by design, so the
 * component half checks what a static render can: that the controls are there, labelled, and
 * that rendering never touches the selection.
 */

const ids = (rows: readonly { item: { id: string } }[]) => rows.map((r) => r.item.id)

function devices(filter: Partial<DeviceFilter> = {}, selected: readonly string[] = []) {
  return deviceView(DEVICES, selected, { ...NO_DEVICE_FILTER, ...filter })
}

// ---------------------------------------------------------------------------
// Terms
// ---------------------------------------------------------------------------

describe('query terms', () => {
  it('splits on whitespace and ignores an empty query', () => {
    expect(queryTerms('')).toEqual([])
    expect(queryTerms('   ')).toEqual([])
    expect(queryTerms('Roland TR')).toEqual(['roland', 'tr'])
    expect(queryTerms('  drum   machine ')).toEqual(['drum', 'machine'])
  })

  it('requires every term, so typing more narrows rather than widens', () => {
    const fields = ['TR-1000', 'Roland', 'drum-machine']
    expect(matches(fields, queryTerms('roland tr'))).toBe(true)
    expect(matches(fields, queryTerms('roland polyend'))).toBe(false)
    // No terms is not a filter: an empty box shows the catalogue.
    expect(matches(fields, [])).toBe(true)
  })

  it('does not let one term straddle two fields', () => {
    // Fields are joined by a separator no term can contain — terms are split on whitespace, so
    // a term with whitespace in it does not exist. Without a separator the fields would fuse and
    // a search could match text that is nowhere on the card.
    const fields = ['TR-1000', 'Roland', 'drum-machine']
    expect(matches(fields, queryTerms('1000roland'))).toBe(false)
    expect(matches(fields, queryTerms('machinetr'))).toBe(false)
    // Two terms matching two fields each is exactly what should work.
    expect(matches(fields, queryTerms('1000 roland'))).toBe(true)

    // And the guarantee the above rests on, asserted rather than assumed: nothing `queryTerms`
    // produces contains whitespace of any kind, so no term can ever be or contain the join.
    for (const query of ['a b', 'a\nb', 'a\tb', '  spaced   out  ', 'drum-machine roland']) {
      for (const term of queryTerms(query)) expect(term).not.toMatch(/\s/)
    }
  })
})

// ---------------------------------------------------------------------------
// Devices: name, maker, kind
// ---------------------------------------------------------------------------

describe('device search matches name, maker and kind', () => {
  it('searches each of the three fields, case-insensitively', () => {
    const tr = DEVICES.find((d) => d.id === 'roland-tr-1000')
    if (tr === undefined) throw new Error('the TR-1000 is not in the registry')
    expect(deviceFields(tr)).toContain(tr.name)
    expect(deviceFields(tr)).toContain(tr.maker)
    expect(deviceFields(tr)).toContain(tr.kind)

    // Name.
    expect(ids(devices({ query: 'tr-1000' }).rows)).toEqual(['roland-tr-1000'])
    expect(ids(devices({ query: 'TR-1000' }).rows)).toEqual(['roland-tr-1000'])
    // Maker — six Rolands in the registry since the MC-707 landed, in registry order.
    expect(ids(devices({ query: 'roLAnd' }).rows)).toEqual([
      'roland-mc-101',
      'roland-mc-707',
      'roland-sp-404mk2',
      'roland-tr-1000',
      'roland-tr-6s',
      'roland-tr-8s',
    ])
    expect(ids(devices({ query: 'polyend' }).rows)).toEqual(['polyend-tracker-mini'])
    // Kind — the field #53 asked for by name, and the one that groups rather than identifies.
    expect(ids(devices({ query: 'groovebox' }).rows)).toEqual([
      'akai-mpc-live-iii',
      'akai-mpc-one-g2',
      'akai-mpc-xl',
      'novation-circuit-tracks',
      'polyend-tracker-mini',
      'roland-mc-101',
      'roland-mc-707',
      'synthstrom-deluge',
      'teenage-engineering-op-xy',
    ])
  })

  it('accepts a hyphenated kind written as two words', () => {
    // 'drum-machine' is hyphenated for the schema's benefit. Nobody types it that way.
    const drumMachines = ['roland-tr-1000', 'roland-tr-6s', 'roland-tr-8s']
    expect(ids(devices({ query: 'drum-machine' }).rows)).toEqual(drumMachines)
    expect(ids(devices({ query: 'drum machine' }).rows)).toEqual(drumMachines)
    expect(ids(devices({ query: 'semi modular' }).rows)).toEqual([
      'behringer-crave',
      'intellijel-cascadia',
      'moog-dfam',
      'moog-grandmother',
      'moog-matriarch',
      'moog-mother-32',
      'moog-subharmonicon',
    ])
  })

  it('tells the two Roland drum machines apart by name, not only by maker or kind', () => {
    // The reason the row above is worth having: `roland` and `drum machine` both return two, so
    // the name is the only field that identifies one box, and 'tr-8' must not drag in 'tr-1000'.
    expect(ids(devices({ query: 'tr-8s' }).rows)).toEqual(['roland-tr-8s'])
    expect(ids(devices({ query: 'TR-8S' }).rows)).toEqual(['roland-tr-8s'])
  })

  it('returns nothing rather than everything when nothing matches', () => {
    const none = devices({ query: 'zzzz-not-a-device' })
    expect(none.rows).toHaveLength(0)
    expect(none.matched).toBe(0)
    expect(none.retained).toBe(0)
    expect(none.filtering).toBe(true)
    expect(none.total).toBe(DEVICES.length)
  })

  it('shows the whole catalogue when nothing is being asked', () => {
    const all = devices()
    expect(ids(all.rows)).toEqual(DEVICES.map((d) => d.id))
    expect(all.matched).toBe(DEVICES.length)
    expect(all.filtering).toBe(false)
  })

  it('keeps registry order, never match order', () => {
    // §7.2: the registry is the one answer to "which device is first". A search that re-ranked
    // would give the page a second one.
    for (const query of ['', 'o', 'e', 'a', 'groovebox']) {
      const shown = ids(devices({ query }).rows)
      const registry = DEVICES.map((d) => d.id).filter((id) => shown.includes(id))
      expect(shown).toEqual(registry)
    }
  })
})

// ---------------------------------------------------------------------------
// The kind filter, derived from the registry
// ---------------------------------------------------------------------------

describe('the kind filter', () => {
  it('offers the kinds this build ships, in the order the registry first mentions them', () => {
    const kinds = kindsPresent(DEVICES)
    // The order is first *mention* in the registry, and the registry is sorted by folder name, so
    // a new device can reorder this list without any kind being added or removed. `semi-modular`
    // leads because `behringer-crave` sorts first; `sequencer` sits third because
    // `intellijel-metropolix` falls between the Euroburo and the Tracker Mini, and `synth`
    // fourth because `korg-minilogue-xd` falls between Metropolix and the Tracker Mini.
    // `groovebox` leads since the MPC Live III landed: `akai-mpc-live-iii` sorts first by folder
    // name, so it is the registry's first mention of any kind at all. `synth` moved to second
    // with the MicroFreak, whose `arturia-microfreak` sorts between the MPCs and the CRAVE —
    // which is this comment's own point about reordering without any kind changing.
    expect(kinds).toEqual([
      'groovebox',
      'synth',
      'semi-modular',
      'sampler',
      'fx-processor',
      'sequencer',
      'drum-machine',
      'mixer-recorder',
    ])
    // Derived, not enumerated: every kind offered has at least one device behind it, and every
    // device's kind is offered. An option that can only return nothing is not a filter.
    for (const kind of kinds) expect(DEVICES.some((d) => d.kind === kind)).toBe(true)
    for (const device of DEVICES) expect(kinds).toContain(device.kind)
    expect(new Set(kinds).size).toBe(kinds.length)
  })

  it('narrows to one kind, and combines with the search as AND', () => {
    expect(ids(devices({ kind: 'groovebox' }).rows)).toEqual([
      'akai-mpc-live-iii',
      'akai-mpc-one-g2',
      'akai-mpc-xl',
      'novation-circuit-tracks',
      'polyend-tracker-mini',
      'roland-mc-101',
      'roland-mc-707',
      'synthstrom-deluge',
      'teenage-engineering-op-xy',
    ])

    // Both conditions, not either: the kind alone returns eight grooveboxes and the query alone
    // returns one device, and together they return the one that satisfies both.
    expect(ids(devices({ kind: 'groovebox', query: 'polyend' }).rows)).toEqual([
      'polyend-tracker-mini',
    ])
    // A query that matches a device of the wrong kind returns nothing, rather than falling back
    // to whichever half still matched.
    // 'roland' stopped being an example of this the moment a Roland groovebox landed — it now
    // matches the MC-101, which satisfies both halves. Intellijel makes no groovebox.
    expect(devices({ kind: 'groovebox', query: 'intellijel' }).rows).toHaveLength(0)
    expect(devices({ kind: 'drum-machine', query: 'polyend' }).rows).toHaveLength(0)
  })

  it('counts as filtering even with an empty search box', () => {
    expect(devices({ kind: 'groovebox' }).filtering).toBe(true)
    expect(devices({ kind: ANY_KIND }).filtering).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Directions: name and authored keys, and nothing else
// ---------------------------------------------------------------------------

describe('direction search matches name and authored keys only', () => {
  const shown = (query: string) => templateView(TEMPLATES, undefined, query).rows.map((r) => r.item.id)

  it('finds a direction by the name anyone would search for', () => {
    expect(shown('techno')).toEqual(['industrial-techno'])
    expect(shown('dub')).toEqual(['ambient-dub'])
    expect(shown('electro')).toEqual(['major-key-electro'])
  })

  it('finds a direction by its authored key, and each key genuinely excludes', () => {
    // The test for whether a field belongs in a search is whether it excludes anything.
    expect(shown('dorian')).toEqual(['ambient-dub'])
    expect(shown('minor')).toEqual(['industrial-techno'])
    expect(shown('f minor')).toEqual(['industrial-techno'])
    // 'major' is in both a name and a key set; it still returns exactly the one direction.
    expect(shown('major')).toEqual(['major-key-electro'])

    for (const template of TEMPLATES) {
      expect(templateFields(template)).toContain(template.name)
      for (const key of template.keys) expect(templateFields(template)).toContain(key)
    }
  })

  it('does not match roles, because a role is shared by directions that are nothing alike', () => {
    // Not a hypothetical. This used to read "every template requests a kick", which was true of
    // the first three and stopped being true when the small-rig directions arrived — one asks
    // for a single `texture` and the other for a `bass-mid` and a `lead` and nothing else. The
    // claim the search rests on survives that intact and is the more general one: a role search
    // returns a set nobody would recognise as an answer, so it must return nothing at all.
    const asking = (role: Role) => TEMPLATES.filter((t) => t.roles.some((r) => r.role === role))
    expect(asking('kick').length).toBeGreaterThan(1)
    expect(asking('bass-mid').length).toBeGreaterThan(1)
    // And no role is a search term, whether one direction asks for it or every one does.
    for (const role of ROLES) expect(shown(role), role).toEqual([])
    expect(shown('kick')).toEqual([])
    expect(shown('bass')).toEqual([])
  })

  it('does not match section names, which are even less discriminating', () => {
    // 'Intro', 'Outro' and 'Peak' are each shared by two templates, and which two is an accident
    // of what those authors happened to call a section — three of the seven directions name their
    // sections in vocabulary nobody else uses. A field that discriminates only because one author
    // chose unusual words is not a field worth searching, whichever way the count goes. The field
    // set is the claim: name and keys, and no third thing quietly joining them later.
    for (const template of TEMPLATES) {
      expect(templateFields(template)).toEqual([template.name, ...template.keys])
    }
    const shared = ['intro', 'outro', 'peak']
    for (const name of shared) {
      expect(
        TEMPLATES.filter((t) => t.structure.some((s) => s.name.toLowerCase() === name)).length,
      ).toBeGreaterThan(1)
      expect(shown(name)).toEqual([])
    }
    // Even a section name unique to one template does not match: the rule is the field set, not
    // a judgement made per word.
    expect(shown('breakdown')).toEqual([])
    expect(shown('bloom')).toEqual([])
  })

  it('does not match BPM, which is a number rather than a term', () => {
    const bpms = TEMPLATES.map((t) => String(t.bpm.default))
    expect(bpms.length).toBeGreaterThan(0)
    for (const bpm of bpms) expect(shown(bpm)).toEqual([])
  })

  it('has no maker or kind to search, and does not pretend otherwise', () => {
    // Devices and directions are not symmetric, and the search must not act as though they are.
    // A `Template` carries neither field, and inventing one to feed a search box would be the
    // tail wagging the dog — invariant 3 keeps templates device-agnostic.
    for (const template of TEMPLATES) {
      expect('maker' in template).toBe(false)
      expect('kind' in template).toBe(false)
    }
    expect(shown('roland')).toEqual([])
    expect(shown('groovebox')).toEqual([])
  })

  it('keeps authored template order and says so honestly when nothing matches', () => {
    expect(shown('')).toEqual(TEMPLATES.map((t) => t.id))
    const none = templateView(TEMPLATES, undefined, 'gabber')
    expect(none.rows).toHaveLength(0)
    expect(none.matched).toBe(0)
    expect(none.total).toBe(TEMPLATES.length)
  })
})

// ---------------------------------------------------------------------------
// A selected entry is never hidden
// ---------------------------------------------------------------------------

describe('selected entries survive any filter', () => {
  it('keeps a selected device that fails the query, and marks it as kept', () => {
    // The obvious failure this prevents: losing sight of your own rig because you typed in a
    // search box. The picker is the only place the rig is visible.
    const shown = devices({ query: 'polyend' }, ['roland-tr-1000'])
    expect(ids(shown.rows)).toEqual(['polyend-tracker-mini', 'roland-tr-1000'])
    expect(shown.matched).toBe(1)
    expect(shown.retained).toBe(1)

    const kept = shown.rows.find((r) => r.item.id === 'roland-tr-1000')
    expect(kept?.selected).toBe(true)
    expect(kept?.retained).toBe(true)
    // The one that actually matched is not marked kept — the mark means "here despite the
    // filter", so marking a genuine result would make it meaningless.
    const hit = shown.rows.find((r) => r.item.id === 'polyend-tracker-mini')
    expect(hit?.retained).toBe(false)
  })

  it('keeps a selected device that fails the kind filter', () => {
    const shown = devices({ kind: 'groovebox' }, ['roland-tr-1000'])
    expect(ids(shown.rows)).toContain('roland-tr-1000')
    expect(shown.rows.find((r) => r.item.id === 'roland-tr-1000')?.retained).toBe(true)
    // Nine grooveboxes since the Circuit Tracks landed; the TR-1000 is a drum machine and is
    // here only because it is selected, which is what `retained` marks and why it is not counted.
    expect(shown.matched).toBe(9)
  })

  it('keeps them in registry order rather than appending them at the end', () => {
    const shown = devices({ query: 'synthstrom' }, ['intellijel-cascadia'])
    expect(ids(shown.rows)).toEqual(['intellijel-cascadia', 'synthstrom-deluge'])
  })

  it('shows every selected device however hostile the query', () => {
    const selected = DEVICES.map((d) => d.id)
    const shown = devices({ query: 'zzzz', kind: 'groovebox' }, selected)
    expect(ids(shown.rows)).toEqual(selected)
    expect(shown.matched).toBe(0)
    expect(shown.retained).toBe(DEVICES.length)
  })

  it('keeps the chosen direction visible too', () => {
    const shown = templateView(TEMPLATES, 'industrial-techno', 'dorian')
    expect(shown.rows.map((r) => r.item.id)).toEqual(['ambient-dub', 'industrial-techno'])
    expect(shown.matched).toBe(1)
    expect(shown.rows.find((r) => r.item.id === 'industrial-techno')?.retained).toBe(true)
  })

  it('never drops a selected entry, for any query in a broad sweep', () => {
    const queries = ['', 'a', 'z', 'roland', 'groovebox', 'zzzz', 'drum machine', '  ']
    const kinds: DeviceFilter['kind'][] = [ANY_KIND, 'groovebox', 'drum-machine', 'semi-modular']
    const selected = ['roland-tr-1000', 'synthstrom-deluge']
    for (const query of queries) {
      for (const kind of kinds) {
        const shown = devices({ query, kind }, selected)
        for (const id of selected) {
          expect(ids(shown.rows), `${query} / ${kind}`).toContain(id)
        }
        // And the counts add up: every row is either a match or a kept selection.
        expect(shown.rows.length).toBe(shown.matched + shown.retained)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Filtering is a view, and only a view
// ---------------------------------------------------------------------------

describe('filtering cannot reach the selection', () => {
  it('leaves its inputs untouched', () => {
    const selected = ['roland-tr-1000']
    const before = JSON.stringify({ selected, kinds: DEVICES.map((d) => d.id) })
    deviceView(DEVICES, selected, { query: 'polyend', kind: 'groovebox' })
    templateView(TEMPLATES, 'ambient-dub', 'techno')
    expect(JSON.stringify({ selected, kinds: DEVICES.map((d) => d.id) })).toBe(before)
    expect(selected).toEqual(['roland-tr-1000'])
  })

  it('reports the same selection whatever the filter', () => {
    // `selected` is an input and never an output: the view can change which rows are drawn and
    // never which ones are chosen. This is what keeps #12's permalink and stored rig out of a
    // search box.
    const selected = ['polyend-tracker-mini', 'roland-tr-1000']
    for (const query of ['', 'roland', 'zzzz']) {
      const chosen = devices({ query }, selected)
        .rows.filter((r) => r.selected)
        .map((r) => r.item.id)
      expect(chosen).toEqual(selected)
    }
  })

  it('is not wired to the studio at all', () => {
    // Structural, because it is a structural claim: if a picker could import the session it
    // could write the store, and "filtering is a view concern" would be a convention rather
    // than a fact. The pure module has no browser in it either.
    const sources = ['../components/device-picker.tsx', '../components/genre-picker.tsx']
    for (const path of sources) {
      const source = readFileSync(new URL(path, import.meta.url), 'utf8')
      expect(source).not.toContain('lib/studio/session')
      expect(source).not.toContain('localStorage')
      expect(source).not.toContain('location')
    }
    // The pure module imports types from core and nothing else — no browser, no session, no
    // storage. Checked on the import lines rather than the whole file, so the prose above them
    // stays free to name what it is arguing against.
    const pure = readFileSync(new URL('../lib/studio/picker.ts', import.meta.url), 'utf8')
    const imports = pure.split('\n').filter((line) => line.startsWith('import'))
    expect(imports).toEqual(["import type { Device, DeviceId, DeviceKind, Template, TemplateId } from '@/lib/core'"])
    expect(pure).not.toContain('localStorage')
    expect(pure).not.toContain('window.')
  })
})

// ---------------------------------------------------------------------------
// The rendered controls
// ---------------------------------------------------------------------------

describe('the picker controls', () => {
  function deviceMarkup(selected: readonly string[] = []) {
    const onToggle = vi.fn()
    const markup = renderToStaticMarkup(createElement(DevicePicker, { selected, onToggle }))
    return { markup, onToggle }
  }

  /**
   * The list has a height cap so it stops pushing the guide down the page, which put the two
   * devices this page ships checked below the fold on a list about five rows tall — the page
   * opened looking like an empty rig. Position, not just presence, is the assertion.
   */
  it('puts every selected device above every unselected one', () => {
    const selected = ['polyend-tracker-mini', 'roland-tr-1000']
    const { markup } = deviceMarkup(selected)
    const order = DEVICES.map((d) => ({
      id: d.id,
      // `deviceLabel`, not `maker` + `name`: the row prints the label now (#112), which is the
      // one that does not render `Zoom Zoom LiveTrak L-8`.
      at: markup.indexOf(`>${deviceLabel(d)}<`),
      on: selected.includes(d.id),
    }))
    for (const row of order) expect(row.at, `${row.id} not rendered`).toBeGreaterThan(-1)
    const lastChosen = Math.max(...order.filter((r) => r.on).map((r) => r.at))
    const firstOther = Math.min(...order.filter((r) => !r.on).map((r) => r.at))
    expect(lastChosen).toBeLessThan(firstOther)
  })

  it('names the rig above the catalogue rather than only counting it', () => {
    const { markup } = deviceMarkup(['polyend-tracker-mini', 'roland-tr-1000'])
    expect(markup).toContain('Your rig')
    // The count line is not enough on its own: it says how many, never which.
    expect(markup).toContain('2 selected')
  })

  it('says nothing about a rig when none is chosen', () => {
    const { markup } = deviceMarkup()
    expect(markup).not.toContain('Your rig')
  })

  it('offers a labelled search box and a kind filter built from the registry', () => {
    const { markup } = deviceMarkup()
    expect(markup).toContain('type="search"')
    expect(markup).toContain('Search devices by name, maker or kind')
    expect(markup).toContain('Filter devices by kind')
    expect(markup).toContain('All kinds')
    for (const kind of kindsPresent(DEVICES)) {
      expect(markup).toContain(`value="${kind}"`)
    }
    // A label with a `for` and a control with the matching `id` — an association a checker can
    // verify, which `aria-label` alone does not give.
    const forId = /<label[^>]*for="([^"]+)"/.exec(markup)?.[1]
    expect(forId).toBeDefined()
    expect(markup).toContain(`id="${forId ?? ''}"`)
  })

  it('lists every device before anything is typed, and marks none as kept', () => {
    const { markup } = deviceMarkup(['roland-tr-1000'])
    for (const device of DEVICES) expect(markup).toContain(device.name)
    expect(markup).toContain('data-retained="no"')
    expect(markup).not.toContain('data-retained="yes"')
    expect(markup).not.toContain('still selected')
    expect(markup).toContain(`1 of ${DEVICES.length} selected`)
  })

  it('does not touch the selection by being rendered', () => {
    const { onToggle } = deviceMarkup(['roland-tr-1000'])
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('gives the direction list a search box and no kind filter', () => {
    const markup = renderToStaticMarkup(
      createElement(GenrePicker, { selected: 'industrial-techno', onSelect: vi.fn() }),
    )
    expect(markup).toContain('Search directions by name or key')
    expect(markup).toContain('type="search"')
    // No kind control, because a template has no kind to filter on.
    expect(markup).not.toContain('picker-kind')
    expect(markup).not.toContain('All kinds')
    for (const template of TEMPLATES) expect(markup).toContain(template.name)
    expect(markup).toContain(`${TEMPLATES.length} templates authored`)
  })
})

// ---------------------------------------------------------------------------
// #112 the row is two targets
// ---------------------------------------------------------------------------

/**
 * #112. A picker row stopped being one control and became a container holding two.
 *
 * The obstacle was structural rather than cosmetic, which is why it is asserted structurally: the
 * row was a `<label>` wrapping the whole thing, and an `<a>` may not go inside one. Interactive
 * content in a label is invalid, and a click on it toggles the control on the way past — so a
 * link laid over the existing label would have made the row's *checkbox* unreliable. #21 names
 * that failure mode exactly: not "I cannot read about my device" but "I cannot select it".
 *
 * Rendered in Node with no DOM, so what is checkable is structure, order and hrefs. The 44px
 * targets are in the stylesheet and are asserted there.
 */
describe('#112 a picker row carries two sibling targets', () => {
  const deviceRows = renderToStaticMarkup(
    createElement(DevicePicker, { selected: ['polyend-tracker-mini'], onToggle: vi.fn() }),
  )
  const directionRows = renderToStaticMarkup(
    createElement(GenrePicker, { selected: 'industrial-techno', onSelect: vi.fn() }),
  )

  /** Every `<label class="pick-choose">…</label>`. Labels do not nest, so non-greedy is exact. */
  function choosers(markup: string): string[] {
    return [...markup.matchAll(/<label class="pick-choose">(.*?)<\/label>/g)].map((m) => m[1] ?? '')
  }

  it('never nests a link inside a label, which is the invalid structure it replaced', () => {
    for (const markup of [deviceRows, directionRows]) {
      const found = choosers(markup)
      expect(found.length).toBeGreaterThan(0)
      for (const inner of found) expect(inner).not.toContain('<a ')
    }
    // And the row itself is no longer a label, so it no longer toggles as a whole.
    for (const markup of [deviceRows, directionRows]) {
      expect(markup).not.toContain('<label class="pick"')
      expect(markup).toContain('<div class="pick"')
    }
  })

  it('keeps the control and its visible name inside the label, so the name is still the label', () => {
    // The accessible name still comes from a real `<label>` wrapping the control — not from an
    // `aria-label`, which is a string with no element behind it and which voice control cannot
    // always target. `test/catalogue.test.ts` makes the same argument about `.sr-only`.
    for (const device of DEVICES) {
      const inner = choosers(deviceRows).find((c) => c.includes(`>${deviceLabel(device)}<`))
      expect(inner, `${device.id} has no chooser`).toBeDefined()
      expect(inner).toContain('type="checkbox"')
      expect(inner).toContain('<span class="name">')
    }
    for (const template of TEMPLATES) {
      const inner = choosers(directionRows).find((c) => c.includes(`>${template.name}<`))
      expect(inner, `${template.id} has no chooser`).toBeDefined()
      expect(inner).toContain('type="radio"')
    }
  })

  it('describes the control with the metadata line rather than naming it with it', () => {
    // The `sub` line used to sit inside the label, so it was part of the checkbox's *name* — the
    // string a screen reader repeats on every arrow key. It is a description now: every fact is
    // still reachable and none of it is the name.
    for (const markup of [deviceRows, directionRows]) {
      const described = [...markup.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1] ?? '')
      expect(described.length).toBeGreaterThan(0)
      for (const id of described) {
        // The id it points at exists, and it is the metadata line rather than anything else.
        expect(markup, `nothing carries id ${id}`).toContain(`<span class="sub mono" id="${id}">`)
      }
      // Unique per row: two rows sharing one description id is one row describing the other.
      expect(new Set(described).size).toBe(described.length)
    }
  })

  it('links every device row to its own page, after the control in focus order', () => {
    for (const device of DEVICES) {
      const href = deviceHref(device)
      const link = `<a class="pick-details" href="${href}">`
      expect(deviceRows, `${device.id} has no details link`).toContain(link)
      // Visible word plus the device it belongs to, as real text: thirteen rows must not all
      // announce as "Details", and an `aria-label` replacing the visible word would fail
      // WCAG 2.5.3 (Label in Name) rather than satisfying it.
      expect(deviceRows).toContain(
        `${link}Details<span class="sr-only"> for ${deviceLabel(device)}</span></a>`,
      )
      // The control comes first in the DOM, so tab order matches the visual order of the row.
      const row = deviceRows.indexOf(`>${deviceLabel(device)}<`)
      expect(deviceRows.lastIndexOf('<label class="pick-choose">', row)).toBeLessThan(
        deviceRows.indexOf(link, deviceRows.lastIndexOf('<div class="pick"', row)),
      )
    }
  })

  it('links every direction row to its own page', () => {
    for (const template of TEMPLATES) {
      expect(directionRows).toContain(
        `<a class="pick-details" href="${templateHref(template)}">Details` +
          `<span class="sr-only"> for ${template.name}</span></a>`,
      )
    }
  })

  it('gives both targets 44px and puts them in separate columns, so neither steals a tap', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const rule = (selector: string) => {
      const start = css.indexOf(`\n${selector} {`)
      expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf('}', start))
    }

    expect(rule('.pick-choose')).toContain('min-height: 44px')
    expect(rule('.pick-details')).toContain('min-height: 44px')
    // Width too: a link that is 44px tall and 20px wide is still a miss on a phone.
    expect(rule('.pick-details')).toContain('min-width: 44px')

    // Different grid columns of the same row. Non-overlap is layout, not luck — the two cannot
    // sit on top of each other however long the device name is.
    expect(rule('.pick-choose')).toContain('grid-column: 1')
    expect(rule('.pick-details')).toContain('grid-column: 2')
    expect(rule('.pick-choose')).toContain('grid-row: 1')
    expect(rule('.pick-details')).toContain('grid-row: 1')
  })

  it('lets a long name wrap at 390px rather than scrolling the row sideways', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const rule = (selector: string) => {
      const start = css.indexOf(`\n${selector} {`)
      expect(start).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf('}', start))
    }

    // #21: the page body never scrolls horizontally. The name column is the one that flexes, so
    // it is the one that must be allowed to reach zero and wrap.
    expect(rule('.pick')).toContain('grid-template-columns: minmax(0, 1fr) auto')
    for (const selector of ['.pick', '.pick-choose', '.pick .name', '.pick .sub']) {
      expect(rule(selector), selector).toContain('min-width: 0')
    }
    expect(rule('.pick .name')).toContain('overflow-wrap: anywhere')
    expect(rule('.pick .sub')).toContain('overflow-wrap: anywhere')
    // The details link is the one thing that keeps its width, so it may not wrap mid-word.
    expect(rule('.pick-details')).toContain('white-space: nowrap')
    // And nothing here buys the fit with a horizontal scroller.
    expect(rule('.pick')).not.toContain('overflow-x')
  })
})
