import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  NEUTRAL_MOOD,
  groupedParams,
  hoistedParams,
  paramLabel,
  renderGuide,
  resolve,
} from '../lib/core/index'
import type { Cite, ResolveResult, ResolvedParam } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno } from '../lib/templates/index'
import { Guide } from '../components/guide/guide'

/**
 * §8/§3.1. **Panel modules, boxed the same way by both renderers.**
 *
 * `groupedParams` decides which controls share a box and both guides read it, so what is checked
 * here is that each renderer draws that one decision — same modules, same count, same order, one
 * lamp per box — and that a parameter list naming no module is the list it always was.
 *
 * **No device in the library authors a `module` yet**, which is the point of injecting them: the
 * plumbing lands before the content, and the committed goldens are the standing proof that an
 * unmoduled guide did not move a byte. Injection also keeps this file honest about what it is
 * testing — the renderers — rather than about one box's panel.
 */

const MANUAL: Cite = { kind: 'manual', source: 'fixture manual p.1' }

/** The rig #107's hoisting was found on, so a scoped block is actually rendered below. */
const base = resolve({
  devices: DEVICES.filter((d) => d.id === 'polyend-tracker-mini' || d.id === 'synthstrom-deluge'),
  template: industrialTechno,
  mood: NEUTRAL_MOOD,
  seed: 1,
})

function html(result: ResolveResult): string {
  return renderToStaticMarkup(createElement(Guide, { result, seed: 1, layout: 'phase' }))
}

function occurrences(haystack: string, needle: string): number {
  let n = 0
  let at = haystack.indexOf(needle)
  while (at !== -1) {
    n += 1
    at = haystack.indexOf(needle, at + needle.length)
  }
  return n
}

/** A fully controlled line, so the ordering claims below rest on nothing a device can change. */
function param(name: string, module?: string): ResolvedParam {
  return {
    name,
    value: 40,
    range: { min: 0, max: 100, verified: MANUAL },
    provenance: { state: 'authored', cite: MANUAL },
    ...(module === undefined ? {} : { module }),
  }
}

/** Replace one part's parameters outright; every other part keeps its own, unmoduled. */
function withParams(result: ResolveResult, params: ResolvedParam[]): ResolveResult {
  return {
    ...result,
    assignments: result.assignments.map((a, i) => (i === 0 ? { ...a, params } : a)),
  }
}

/** Put a module on every occurrence of a name, which is how a device folder would author it. */
function withModules(result: ResolveResult, modules: Record<string, string>): ResolveResult {
  return {
    ...result,
    assignments: result.assignments.map((a) => ({
      ...a,
      params: a.params.map((p) => {
        const module = modules[p.name]
        return module === undefined ? p : { ...p, module }
      }),
    })),
  }
}

function stripModules(result: ResolveResult): ResolveResult {
  return {
    ...result,
    assignments: result.assignments.map((a) => ({
      ...a,
      params: a.params.map(({ module: _module, ...rest }) => rest),
    })),
  }
}

/**
 * `ALPHA` and `BRAVO` share a module, `CHARLIE` declares none, `DELTA` is a different one and
 * `ECHO` returns to the first — the mixed list, carrying every case at once: a box, a flat run
 * between boxes, and a module that opens a second box because the authored order interrupted it.
 *
 * The names are deliberately unlike anything a device authors. `OSC 1` was the first draft and
 * counted eight times in one guide, because the Deluge names real parameters that way — a
 * counting test on a string the library already uses measures the library, not the change.
 */
const MIXED: ResolvedParam[] = [
  param('ALPHA', 'MODULE ZULU'),
  param('BRAVO', 'MODULE ZULU'),
  param('CHARLIE'),
  param('DELTA', 'MODULE YANKEE'),
  param('ECHO', 'MODULE ZULU'),
]

const mixed = withParams(base, MIXED)

describe('groupedParams cuts a list into panel modules without reordering it (§3.1)', () => {
  it('keeps every parameter, in the order it was authored', () => {
    const flat = groupedParams(MIXED).flatMap((g) => g.params)
    expect(flat.map((p) => p.name)).toEqual(['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO'])
  })

  it('groups adjacent runs, so an interrupted module opens a second box', () => {
    // The load-bearing choice: collecting every `OSC 1` line into one box would read better and
    // would silently move `ECHO` above `CHARLIE`. Authored order is the order at the machine.
    expect(groupedParams(MIXED).map((g) => [g.module, g.params.map((p) => p.name)])).toEqual([
      ['MODULE ZULU', ['ALPHA', 'BRAVO']],
      [undefined, ['CHARLIE']],
      ['MODULE YANKEE', ['DELTA']],
      ['MODULE ZULU', ['ECHO']],
    ])
  })

  it('gives an all-unmoduled list exactly one group, carrying no module at all', () => {
    const groups = groupedParams([param('ALPHA'), param('BRAVO')])
    expect(groups).toHaveLength(1)
    // Absent, not present-and-undefined: a renderer keying on the field must see nothing said.
    expect('module' in (groups[0] as object)).toBe(false)
  })

  it('gives an empty list no groups, rather than one empty box', () => {
    expect(groupedParams([])).toEqual([])
  })
})

describe('both renderers box the same modules (§8/#33)', () => {
  const md = renderGuide(mixed)
  const markup = html(mixed)

  it('names every module in both, once per box', () => {
    // Non-vacuous: neither name appears anywhere in the guide until a module puts it there.
    expect(occurrences(renderGuide(base), 'MODULE ZULU')).toBe(0)
    expect(occurrences(html(base), 'MODULE ZULU')).toBe(0)
    for (const doc of [md, markup]) {
      expect(occurrences(doc, 'MODULE ZULU')).toBe(2)
      expect(occurrences(doc, 'MODULE YANKEE')).toBe(1)
    }
  })

  it('draws one steady lamp per box in each renderer, and the counts match', () => {
    // Markdown has one form for a lamp and the web view has another; what must agree is that
    // there are three boxes and three lamps in both.
    expect(occurrences(md, '●')).toBe(3)
    expect(occurrences(markup, 'module-led')).toBe(3)
    expect(occurrences(markup, 'module-box')).toBe(3)
  })

  it('carries no second lamp state, because nothing infers one', () => {
    // A hollow ring anywhere would be a claim about whether the box sits at its init values.
    // Nothing in the model knows that and nothing here guesses it (invariant 5).
    expect(md).not.toContain('○')
    expect(markup).not.toContain('○')
    expect(markup).not.toContain('module-led-off')
    // And the lamp says nothing to a screen reader, because it says the same thing every time.
    expect(markup).toContain('<span class="module-led" aria-hidden="true">')
  })

  it('keeps the unmoduled line outside every box, in both', () => {
    // `CHARLIE` sits between two boxes and belongs to neither, and *outside* is the whole claim —
    // ordering alone would pass while it printed flush under `MODULE ZULU`, reading as a control
    // on a panel it is not on. That is what the first draft of the Markdown did.
    expect(md).toContain('- **● MODULE ZULU**')
    expect(md).toContain('  - **ALPHA** ')
    expect(md).toContain('  - **BRAVO** ')
    // At the margin: a sibling of the module it follows, not a child of it.
    expect(md).toContain('\n- **CHARLIE** ')
    expect(md).not.toContain('  - **CHARLIE** ')

    const charlie = md.indexOf('- **CHARLIE**')
    expect(charlie).toBeGreaterThan(md.indexOf('- **● MODULE ZULU**'))
    expect(charlie).toBeLessThan(md.indexOf('- **● MODULE YANKEE**'))

    // The markup claim, made structurally: the box that opens before CHARLIE closes before it.
    const boxes = markup.split('module-box')
    expect(boxes).toHaveLength(4)
    const box = markup.indexOf('module-box')
    const close = markup.indexOf('MODULE YANKEE')
    expect(markup.slice(box, close)).toContain('CHARLIE')
    expect(markup.slice(box, markup.indexOf('BRAVO'))).not.toContain('CHARLIE')
  })

  it('renders the boxes in authored order in both', () => {
    for (const doc of [md, markup]) {
      const alpha = doc.indexOf('ALPHA')
      const charlieAt = doc.indexOf('CHARLIE')
      const delta = doc.indexOf('DELTA')
      const echo = doc.indexOf('ECHO')
      expect(alpha).toBeGreaterThan(-1)
      expect(alpha).toBeLessThan(charlieAt)
      expect(charlieAt).toBeLessThan(delta)
      expect(delta).toBeLessThan(echo)
    }
  })
})

describe("#107's hoisted settings are boxed by the same code path", () => {
  // The Tracker Mini's SWING is one setting for the whole pattern, so it renders once above the
  // parts. A module on it has to reach that block too: a device-level control sits on a panel
  // module exactly as a per-part one does.
  const hoisted = withModules(base, { SWING: 'MODULE GROOVE' })
  const md = renderGuide(hoisted)
  const markup = html(hoisted)

  it('resolves a hoisted SWING at all, so the assertions below are not vacuous', () => {
    expect(md).toContain('**Pattern-wide**')
    // Two, and both hoisted: the Tracker Mini's SWING is pattern-wide and the Deluge's is
    // song-wide, so each box prints its own once above its parts. What #107 removed was the
    // repetition *within* a box, not the second box's own line.
    expect(occurrences(md, 'SWING')).toBe(2)
    expect(md).toContain('**Song-wide**')
  })

  it('boxes it under the Pattern-wide heading in both renderers', () => {
    const heading = md.indexOf('**Pattern-wide**')
    const box = md.indexOf('- **● MODULE GROOVE**')
    const swing = md.indexOf('  - **SWING**')
    expect(box).toBeGreaterThan(heading)
    expect(swing).toBeGreaterThan(box)
    // Nested under the module, and its note nested one step further again.
    expect(md).toContain('    - ↳ note: 50% is no swing')

    const scoped = markup.indexOf('class="scoped"')
    expect(scoped).toBeGreaterThan(-1)
    expect(markup.indexOf('MODULE GROOVE')).toBeGreaterThan(scoped)
    expect(markup).toContain('module-box')
  })
})

describe('a guide naming no module is the guide it always was', () => {
  it('draws no box, no lamp and no label anywhere', () => {
    const md = renderGuide(base)
    const markup = html(base)
    expect(md).not.toContain('●')
    expect(markup).not.toContain('module-box')
    expect(markup).not.toContain('module-led')
    expect(markup).not.toContain('module-label')
  })

  it('is byte-identical once the modules are taken off again', () => {
    // The strong form of the claim: the module path is entirely inert when the field is absent,
    // so nothing about it can move a byte of an unmoduled guide. The committed goldens make the
    // same claim against the whole library, which authors no module at all.
    expect(renderGuide(stripModules(mixed))).toBe(renderGuide(withParams(base, MIXED.map((p) => param(p.name)))))
    expect(html(stripModules(withModules(base, { SWING: 'MODULE GROOVE' })))).toBe(html(base))
  })
})

// ---------------------------------------------------------------------------
// #21 — 390px, and paper
// ---------------------------------------------------------------------------

describe('the module box on a phone and on paper (#21)', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

  function rule(selector: string): string {
    const start = css.indexOf(`\n${selector} {`)
    expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
    return css.slice(start, css.indexOf('}', start))
  }

  it('never widens the column it sits in', () => {
    // §8's reader is at 390px more often than at a laptop. A box that cannot shrink puts the
    // whole page into horizontal scroll, which #21 forbids outright.
    expect(rule('.module-box')).toContain('min-width: 0')
    expect(rule('.module-label')).toContain('min-width: 0')
    // A module label is the device's own words and can be long, so it wraps rather than pushing.
    expect(rule('.module-label')).toContain('overflow-wrap: anywhere')
    // Nothing here scrolls sideways on its own, and nothing pins a width the viewport cannot meet.
    for (const selector of ['.module-box', '.module-label']) {
      expect(rule(selector)).not.toContain('overflow-x')
      expect(rule(selector)).not.toMatch(/\n {2}(?:min-)?width: (?!0)/)
    }
  })

  it('keeps the lamp its own size and on the first line while a label wraps beside it', () => {
    expect(rule('.module-led')).toContain('flex: none')
    // A module label is the device's own words and wraps to two lines at 390px. Centred, the
    // lamp then floats between them, level with neither — seen in a 390px render, not in markup.
    expect(rule('.module-label')).toContain('align-items: flex-start')
    expect(rule('.module-label')).toContain('line-height: 1.4')
    expect(rule('.module-led')).toContain('margin-top: 4px')
  })

  it('leaves the reserved hint column alone', () => {
    // The box wraps `.instruction` rows and changes none of their rules, so §8.1's promise —
    // toggling hints reflows nothing — holds inside a box exactly as it does outside one.
    expect(rule('.module-box')).not.toContain('grid-template-columns')
    expect(rule('.module-box')).not.toContain('.hint')
  })

  it('draws from the tokens, so print repoints it with everything else', () => {
    // The print block inverts the palette at its tokens rather than selector by selector. A
    // hardcoded colour here would be a box that survives on screen and vanishes on paper.
    const box = rule('.module-box')
    expect(box).toContain('border: 1px solid var(--edge)')
    expect(box).toContain('background: var(--panel-1)')
    expect(box).not.toMatch(/#[0-9a-fA-F]{3,6}/)
    expect(rule('.module-led')).toContain('background: var(--lamp)')
    expect(rule('.module-led')).not.toMatch(/#[0-9a-fA-F]{3,6}/)
  })

  it('does not break a module across two sheets', () => {
    // A module is one box on one machine; half of it at the foot of a page is a reader turning
    // over mid-panel.
    const print = css.indexOf('@media print {')
    expect(print).toBeGreaterThan(-1)
    const box = css.indexOf('\n  .module-box {', print)
    expect(box).toBeGreaterThan(print)
    expect(css.slice(box, css.indexOf('}', box))).toContain('break-inside: avoid')
  })

  it('keeps the guide flat: no glow, gradient, bevel or ring on the lamp', () => {
    /*
     * **This test is the whole of the restraint, because the design grants nothing here.** §10
     * says *"Resist screws, LEDs and wood cheeks on every other surface"* and it is unchanged:
     * the lamp contradicts it, knowingly, and is shipped to be judged on a real guide rather
     * than because the rule was reconsidered. So there is no sanctioned envelope to draw inside
     * — this list is it, and relaxing a line of it widens something the design does not permit
     * at all. Loosen it only alongside a decision about §10 itself.
     *
     * A ring is checked in all three forms it could arrive in — a border, an outline, or a
     * spread shadow — because "flat dot" fails identically whichever one draws it.
     */
    const led = rule('.module-led')
    for (const forbidden of [
      'box-shadow',
      'text-shadow',
      'gradient',
      'inset',
      'filter',
      'border:',
      'border-color',
      'border-width',
      'border-style',
      'outline',
    ]) {
      expect(led, forbidden).not.toContain(forbidden)
    }
    // `border-radius` is the one border property it may have: a dot is a circle.
    expect(led).toContain('border-radius: 50%')
    // And the box around it is a plain 1px rule — no bevel there either, which is where a
    // skeuomorphic panel would put one first.
    const box = rule('.module-box')
    for (const forbidden of ['box-shadow', 'gradient', 'inset', 'outline']) {
      expect(box, forbidden).not.toContain(forbidden)
    }
  })

  it('draws the lamp from its own red token, not from §10s orange accent', () => {
    // §10 fixes `--accent` as the orange of live signal. A panel LED is red because on real gear
    // red means powered rather than faulty (#385), so it gets its own token — otherwise a later
    // accent change moves the lamp with it and says the wrong thing on every module box.
    expect(rule('.module-led')).toContain('background: var(--lamp)')
    expect(rule('.module-led')).not.toContain('var(--accent)')
    expect(css).toMatch(/\n  --lamp: #[0-9a-f]{6};/)
    // Repointed with every other token in the print block, per the rule that block states about
    // itself: add a token to `:root` and add it here.
    const print = css.indexOf('@media print {')
    expect(css.slice(print)).toContain('--lamp: #000;')
  })

  it('has one lamp state, because nothing knows a devices init values', () => {
    // #385 designs the lamp lit or dark, the dark half needs authored init values, and until
    // those exist a second token or a second class would be a claim nothing in the model can
    // make (invariant 5). The single state is also the reason the lamp is on trial rather than
    // settled: one state carries no information, and §10 — unamended — says to resist it.
    expect(css).not.toContain('--lamp-dark')
    expect(css).not.toContain('.module-led-off')
    expect(occurrences(css, '--lamp:')).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// #385 — the Muse, the box the complaint was made from
// ---------------------------------------------------------------------------

/**
 * #385 was reported standing at this instrument: `muse-stab-hard` prints 75 parameters, and
 * seventy-five rows is not a thing anybody reads on their feet. It is the one device in the
 * library that authors `module`, which is #385's own "cheaper first move" — box one box, and find
 * out whether panel-shaped boxes are better to read before committing anyone to the other
 * thirty-eight.
 *
 * **The goldens do not cover any of this.** `full-rig` resolves every registry device, but the
 * Muse takes **0 parts** in it and so renders no parameters at all — which is why every golden
 * still passes byte for byte, and why that fact proves the *non*-Muse path intact and nothing
 * whatever about this one. These are the tests that carry it.
 */
describe('the Muse authors a module on every parameter (#385)', () => {
  const muse = DEVICES.find((d) => d.id === 'moog-muse')

  it('is in the library, with the eighteen recipes the mapping was authored against', () => {
    expect(muse).toBeDefined()
    expect(muse?.recipes).toHaveLength(18)
  })

  it('leaves no parameter of any recipe without one', () => {
    // Whole-device, not spot-checked: a block helper added later with no `inModule` around it is
    // exactly the miss this catches, and it would otherwise show up as one unboxed run in one
    // guide that nobody happens to render.
    const missing: string[] = []
    for (const recipe of muse?.recipes ?? []) {
      for (const param of recipe.params) {
        const module = (param as { module?: string }).module
        if (module === undefined || module === '') missing.push(`${recipe.id} :: ${param.name}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('places the fourteen controls whose names carry no prefix', () => {
    /*
     * The bare ones are the whole reason this is authoring rather than a name parse: #385 counted
     * the ` · ` prefix at 3,419 params against 10,884 without, one consistent device in
     * thirty-nine, and fourteen of this box's own bare — including the voice-control settings a
     * `VOICE CONTROL` box most wants to hold.
     *
     * Pinned by name so a later edit that moves one has to say so. The device's own authored
     * hints corroborate the two least obvious groups independently of this table: the voice
     * settings hint `VOICE CONTROL, then MORE`, and all four MIDI settings hint `PROGRAMMER,
     * MENU, MIDI`. `panel.ts` draws `PROGRAMMER` and `VOICE CONTROL` as real panel groups.
     */
    const expected: Record<string, string> = {
      'TIMBRE A VOICE COUNT': 'VOICE CONTROL',
      'DYNAMIC VOICE ALLOCATION': 'VOICE CONTROL',
      'MULTI MODE': 'PROGRAMMER',
      'MIDI IN CHANNEL': 'PROGRAMMER',
      'MULTI IN B CHANNEL': 'PROGRAMMER',
      'RECIEVE CC': 'PROGRAMMER',
      'SYNC 2▸1': 'OSC 2',
      'OVERLOAD RANGE': 'MIXER',
      'LINK FILTERS': 'FILTER',
      'FM AMOUNT': 'FM',
      '1>2 FM MIN AMT': 'FM',
      '1>2 FM MAX AMT': 'FM',
      '2>1 FM MIN AMT': 'FM',
      '2>1 FM MAX AMT': 'FM',
    }
    const found = new Map<string, Set<string>>()
    for (const recipe of muse?.recipes ?? []) {
      for (const param of recipe.params) {
        if (param.name.includes(' · ')) continue
        const module = (param as { module?: string }).module
        if (!found.has(param.name)) found.set(param.name, new Set())
        found.get(param.name)?.add(module ?? '(none)')
      }
    }
    // Every bare name is in the table, and the table names no control the device does not have.
    expect([...found.keys()].sort()).toEqual(Object.keys(expected).sort())
    for (const [name, modules] of found) {
      expect([...modules], name).toEqual([expected[name]])
    }
  })

  it('keeps every parameter name exactly as it was authored', () => {
    // The prefix stays on `MIXER · OSC 1`. Nothing keyed on a name moves — not #107's hoisting,
    // not a fixture, not a test — which is what makes this change safe to land on its own. It
    // costs a box that repeats its own label on the eighty prefixed controls; shortening them is
    // a separate change with its own blast radius.
    const names = (muse?.recipes ?? []).flatMap((r) => r.params.map((p) => p.name))
    expect(names).toContain('MIXER · OSC 1')
    expect(names).toContain('FILTER 1 · CUTOFF')
    expect(names).toContain('FILTER 2 · CUTOFF')
  })
})

describe('a real Muse guide renders panel boxes, in both renderers (#385)', () => {
  const muse = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-muse'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })
  const md = renderGuide(muse)
  const markup = html(muse)

  it('resolves parts on it at all, so the assertions below are not vacuous', () => {
    expect(muse.assignments.length).toBeGreaterThan(0)
    expect(muse.assignments.every((a) => a.deviceId === 'moog-muse')).toBe(true)
  })

  it('draws boxes in the Markdown and in the markup', () => {
    expect(md).toContain('- **● VOICE CONTROL**')
    expect(md).toContain('- **● PROGRAMMER**')
    expect(markup).toContain('module-box')
    expect(markup).toContain('module-label')
    // One lamp per box in each, and there are real numbers of them on this box.
    expect(occurrences(md, '●')).toBeGreaterThan(3)
    expect(occurrences(md, '●')).toBe(occurrences(markup, 'module-led'))
  })

  it("groups #107's song-wide block by module instead of alphabetising the panel", () => {
    /*
     * The ordering claim, and the reason `hoistOrder` exists. The Muse hoists ten song-wide
     * settings across three modules. Sorted by name they read `DELAY · …` ×7, `DYNAMIC VOICE
     * ALLOCATION`, `MIDI IN CHANNEL`, `MULTI IN B CHANNEL`, `MULTI MODE`, `RECIEVE CC`, `TIMBRE A
     * VOICE COUNT` — which interleaves VOICE CONTROL and PROGRAMMER and, because `groupedParams`
     * cuts on adjacent runs, comes out as five boxes for three modules.
     *
     * First-encounter order is authored order, which is the order somebody decided these should
     * be set in, and it gives three.
     */
    const block = md.slice(md.indexOf('**Song-wide**'), md.indexOf('#### '))
    expect(block).toContain('One setting for the whole song')
    const boxes = [...block.matchAll(/- \*\*● ([^*]+)\*\*/g)].map((m) => m[1])
    expect(boxes).toEqual(['VOICE CONTROL', 'PROGRAMMER', 'DELAY'])
  })
})

describe('no other device is affected (#385)', () => {
  it('is the only device in the library authoring a module', () => {
    // #385's cheaper first move: one folder, and every other guide renders exactly as it did.
    const authoring = DEVICES.filter((d) =>
      d.recipes.some((r) => r.params.some((p) => (p as { module?: string }).module !== undefined)),
    ).map((d) => d.id)
    expect(authoring).toEqual(['moog-muse'])
  })

  it('renders no box on a rig that authors none', () => {
    expect(renderGuide(base)).not.toContain('●')
    expect(html(base)).not.toContain('module-box')
  })
})

describe('hoistOrder keeps the legacy sort where nothing is moduled (§7.2)', () => {
  function scoped(name: string, module?: string): ResolvedParam {
    return { ...param(name, module), scope: 'pattern' }
  }

  it('sorts by name in code unit order when no parameter carries a module', () => {
    // The order every guide in the library renders today. Thirty-eight devices author no module
    // and their bytes must not move because one device now does.
    const out = hoistedParams([[scoped('ZULU'), scoped('ALPHA'), scoped('MIKE')]])
    expect(out.groups[0]?.params.map((p) => p.name)).toEqual(['ALPHA', 'MIKE', 'ZULU'])
  })

  it('switches to first-encounter, grouped, as soon as one does', () => {
    const out = hoistedParams([
      [
        scoped('ZULU', 'SECOND'),
        scoped('ALPHA', 'FIRST'),
        scoped('MIKE', 'SECOND'),
        scoped('BRAVO', 'FIRST'),
      ],
    ])
    // Modules in the order they were met, parameters in the order they were met inside each —
    // and a module met twice is pulled together rather than reordered.
    expect(out.groups[0]?.params.map((p) => [p.module, p.name])).toEqual([
      ['SECOND', 'ZULU'],
      ['SECOND', 'MIKE'],
      ['FIRST', 'ALPHA'],
      ['FIRST', 'BRAVO'],
    ])
  })
})

// ---------------------------------------------------------------------------
// #385 — the label, once the box already carries the module
// ---------------------------------------------------------------------------

/**
 * **Display only. The stored name never moves**, and that is what makes this safe to land on its
 * own: `name` stays #107's hoist key, `sameRenderedParam`'s comparison, the React list key, and
 * the string every fixture and device test names. Sixteen of the Muse's seventy-seven suffixes
 * appear under two modules, so rewriting names in the device folder would collide; trimming at
 * the point of ink does not, because the two `CUTOFF` lines keep distinct names and merely both
 * *read* `CUTOFF`, each inside the box that says which one it is.
 */
describe('paramLabel trims a module prefix its box already carries (#385)', () => {
  it('trims the exact prefix and nothing else', () => {
    expect(paramLabel(param('MIXER · OSC 1', 'MIXER'))).toBe('OSC 1')
    expect(paramLabel(param('FILTER 1 · CUTOFF', 'FILTER 1'))).toBe('CUTOFF')
  })

  it('leaves a bare name inside a module completely alone', () => {
    // Fourteen of the Muse's controls carry no prefix at all, and they are the ones a panel-shaped
    // box helps most — `TIMBRE A VOICE COUNT` under `VOICE CONTROL` reads as it should already.
    expect(paramLabel(param('TIMBRE A VOICE COUNT', 'VOICE CONTROL'))).toBe('TIMBRE A VOICE COUNT')
    expect(paramLabel(param('LINK FILTERS', 'FILTER'))).toBe('LINK FILTERS')
  })

  it('will not trim a prefix that only looks like the module', () => {
    // Exact `${module} · `, no partial match: `FILTER` must not eat `FILTER 1 · CUTOFF`, or a
    // reader loses which of two filters the line is about — the one thing the box exists to say.
    expect(paramLabel(param('FILTER 1 · CUTOFF', 'FILTER'))).toBe('FILTER 1 · CUTOFF')
    expect(paramLabel(param('MIXERS · GAIN', 'MIXER'))).toBe('MIXERS · GAIN')
    expect(paramLabel(param('MIXER·OSC 1', 'MIXER'))).toBe('MIXER·OSC 1')
  })

  it('keeps the whole name when trimming would leave nothing', () => {
    expect(paramLabel(param('MIXER · ', 'MIXER'))).toBe('MIXER · ')
  })

  it('leaves an unmoduled parameter exactly as authored', () => {
    expect(paramLabel(param('MIXER · OSC 1'))).toBe('MIXER · OSC 1')
    expect(paramLabel(param('CUTOFF'))).toBe('CUTOFF')
  })
})

describe('the two renderers print the same label (#385/#33)', () => {
  /** Two modules carrying the same suffix, which is the case the stored names exist to keep apart. */
  const DUPLICATE: ResolvedParam[] = [
    // `ZULU` rather than the Muse's real `CUTOFF`: this rig's other parts carry `CUTOFF` lines of
    // their own, and a counting test on a string the library already uses measures the library.
    // The genuine duplicate — `CUTOFF` on both Muse filters — is asserted on the real guide below.
    param('FILTER 1 · ZULU', 'FILTER 1'),
    param('FILTER 2 · ZULU', 'FILTER 2'),
    param('TIMBRE A VOICE COUNT', 'VOICE CONTROL'),
  ]
  const dup = withParams(base, DUPLICATE)
  const md = renderGuide(dup)
  const markup = html(dup)

  it('prints a duplicated suffix once in each box, in both renderers', () => {
    for (const doc of [md, markup]) {
      expect(occurrences(doc, 'FILTER 1 · ZULU')).toBe(0)
      expect(occurrences(doc, 'FILTER 2 · ZULU')).toBe(0)
      // Twice: one `ZULU` line inside each of the two filter boxes.
      expect(occurrences(doc, 'ZULU')).toBe(2)
    }
    expect(md).toContain('- **● FILTER 1**')
    expect(md).toContain('  - **ZULU** ')
    expect(md).toContain('- **● FILTER 2**')
  })

  it('keeps the two apart structurally, since the label no longer does', () => {
    // The distinguishing fact moved from the line to the box around it, so the box has to be
    // load-bearing: a `CUTOFF` inside `FILTER 1` and another inside `FILTER 2`, not two together.
    const boxes = markup.split('module-box').slice(1)
    expect(boxes).toHaveLength(3)
    expect(boxes[0]).toContain('FILTER 1')
    expect(boxes[0]).toContain('ZULU')
    expect(boxes[1]).toContain('FILTER 2')
    expect(boxes[1]).toContain('ZULU')
  })

  it('prints a bare name inside a module in full, in both', () => {
    for (const doc of [md, markup]) expect(doc).toContain('TIMBRE A VOICE COUNT')
  })

  it('leaves an unmoduled guide printing exactly the names it always did', () => {
    // The legacy output, unchanged: nothing here trims a prefix off a device that authors no
    // module, however much its names look like they carry one.
    const legacy = renderGuide(base)
    expect(legacy).toContain('**ENVELOPE · RELEASE**')
    expect(legacy).not.toContain('**RELEASE** ')
    expect(html(base)).toContain('ENVELOPE · RELEASE')
  })
})

describe('the real Muse guide no longer repeats its module labels (#385)', () => {
  const muse = resolve({
    devices: DEVICES.filter((d) => d.id === 'moog-muse'),
    template: industrialTechno,
    mood: NEUTRAL_MOOD,
    seed: 1,
  })

  it('prints no parameter line still carrying its own box label, in either renderer', () => {
    /*
     * Eighty of the ninety-four names opened with their own module. Counted over the real guide
     * rather than over the device, because what is being fixed is ink.
     *
     * **Parameter lines only, and the exclusion is deliberate.** Finishing's Master FX sentence
     * names these controls as *evidence* — "The Muse carries DELAY · CHARACTER, DELAY · CLOCK
     * SYNC, …" — in running prose with no box around it, where the prefix is the only thing
     * saying which control is meant. Trimming there would make the sentence worse, so the claim
     * is about the lines a reader dials, not about every mention of a name in the document.
     */
    const modules = new Set<string>()
    for (const a of muse.assignments) for (const p of a.params) if (p.module) modules.add(p.module)
    expect(modules.size).toBeGreaterThan(5)

    // The Markdown's parameter bullets, boxed or not.
    const bullets = renderGuide(muse)
      .split('\n')
      .filter((line) => /^\s*- \*\*(?!●)/.test(line))
    expect(bullets.length).toBeGreaterThan(20)
    // The web view's names, which is the same claim through the other renderer.
    const names = [...html(muse).matchAll(/<span class="param-name">([^<]*)<\/span>/g)].map(
      (m) => m[1] as string,
    )
    expect(names.length).toBeGreaterThan(20)

    for (const module of modules) {
      expect(
        bullets.filter((line) => line.includes(`${module} \u00b7 `)),
        module,
      ).toEqual([])
      expect(
        names.filter((name) => name.startsWith(`${module} \u00b7 `)),
        module,
      ).toEqual([])
    }
  })

  it('still prints every control, under a box that says which one it is', () => {
    const md = renderGuide(muse)
    // The two filters both contribute a `CUTOFF`, and the boxes are what tell them apart now.
    expect(md).toContain('- **● FILTER 1**')
    expect(md).toContain('- **● FILTER 2**')
    expect(occurrences(md, '**CUTOFF**')).toBeGreaterThanOrEqual(2)
    // And a bare-named control is untouched.
    expect(md).toContain('**TIMBRE A VOICE COUNT**')
  })
})
