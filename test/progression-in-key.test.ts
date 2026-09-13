import { createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  MODES,
  UNSPELLABLE_CHORD,
  chordNotesText,
  compareCodeUnits,
  parseKey,
  progressionRows,
  resolvePitch,
  spellChord,
  transposableKeys,
} from '../lib/core/index'
import type { Harmony } from '../lib/core/index'
import { TEMPLATES, droneStudy, lydianHouse } from '../lib/templates/index'
import { RIFFS } from '../lib/riffs/index'
import { KeySelect } from '../components/harmony/key-select'
import { ProgressionInKey, ProgressionView } from '../components/harmony/progression-in-key'
import DirectionPageRoute from '../app/directions/[id]/page'

/**
 * #570. A chord table the reader can read in another key, on the direction page first.
 *
 * Rendered in Node with no jsdom, like every other component test here. `ProgressionView` and
 * `KeySelect` take no hooks, so each is an ordinary function returning an element tree: the
 * `<select>` is found in it, its `onChange` is called with the event a browser would send, and
 * the view is rendered again at the key the handler asked for. That is the whole interaction,
 * short of the browser's own event plumbing. `ProgressionInKey` wires `useState` to those two
 * props and nothing else, which is checked on its server render and its source.
 */

const REPO_ROOT = resolvePath(new URL('..', import.meta.url).pathname)

/** Every element of one tag in a rendered tree, in document order. */
function elementsIn(node: ReactNode, tag: string): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => elementsIn(child as ReactNode, tag))
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  return [...(node.type === tag ? [node] : []), ...elementsIn(props.children, tag)]
}

/** A hook-free component's tree, with any nested hook-free components expanded. */
function treeOf(element: ReactElement): ReactNode {
  if (typeof element.type === 'function') {
    const component = element.type as (props: unknown) => ReactNode
    return expand(component(element.props))
  }
  return element
}

function expand(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map((child) => expand(child as ReactNode))
  if (!isValidElement(node)) return node
  if (typeof node.type === 'function') return treeOf(node)
  const props = node.props as { children?: ReactNode }
  return { ...node, props: { ...props, children: expand(props.children) } } as ReactNode
}

/** The notes column of a table rendered at one key, in row order. */
function notesColumn(harmony: Harmony, key: string): string[] {
  return progressionRows(harmony, key).map((row) => chordNotesText(row.notes))
}

const text = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

// ---------------------------------------------------------------------------
// The keys offered
// ---------------------------------------------------------------------------

/**
 * The rule, computed here a second way so the helper is checked against it and not against
 * itself: a key's scale is spelt degree by degree through `resolvePitch` — the same `spell`
 * underneath — and its marks counted. Nothing below names a root; every expectation is derived.
 */
function pitchClassOf(key: string): number {
  const p = parseKey(key) as NonNullable<ReturnType<typeof parseKey>>
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[p.letter] as number
  return (((natural + p.accidental) % 12) + 12) % 12
}

/** Marks across the seven degrees, or `undefined` where one needs a double accidental. */
function marksOf(key: string): number | undefined {
  let marks = 0
  for (let degree = 1; degree <= 7; degree++) {
    const spelt = resolvePitch({ degree, baseOctave: 4 }, key)
    if (spelt.outcome !== 'resolved') return undefined
    const count = spelt.note.replace(/-?\d+$/, '').length - 1
    if (count > 1) return undefined
    marks += count
  }
  return marks
}

/** Every single-accidental root in one mode, which is the candidate set the rule ranks. */
function candidates(mode: string): string[] {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].flatMap((l) => ['', '#', 'b'].map((a) => `${l}${a} ${mode}`))
}

/** The rule's own answer for one pitch class in one mode, with no authored override. */
function conventional(mode: string, pitchClass: number): string {
  const ranked = candidates(mode)
    .filter((k) => pitchClassOf(k) === pitchClass)
    .map((k) => ({ k, marks: marksOf(k) }))
    .filter((c): c is { k: string; marks: number } => c.marks !== undefined)
    .sort((a, b) => a.marks - b.marks || compareCodeUnits(a.k, b.k))
  return (ranked[0] as { k: string }).k
}

const EVERY_AUTHORED = [
  ...TEMPLATES.flatMap((t) => t.keys.map((key) => ({ id: t.id, key }))),
  ...RIFFS.flatMap((r) => (r.harmony === undefined ? [] : [{ id: r.id, key: r.key }])),
]

describe('transposableKeys (#570)', () => {
  it('returns exactly twelve keys, one per pitch class in chromatic order from C, keeping the mode', () => {
    expect(EVERY_AUTHORED.length).toBeGreaterThan(30)
    for (const { id, key } of EVERY_AUTHORED) {
      const keys = transposableKeys(key)
      expect(keys, id).toHaveLength(12)
      expect(keys.map(pitchClassOf), id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
      const mode = parseKey(key)?.mode
      for (const offered of keys) expect(parseKey(offered)?.mode, `${id}: ${offered}`).toBe(mode)
      expect(keys, id).toContain(key)
    }
  })

  it('picks, per pitch class, the spelling whose scale carries the fewest marks, and never a double accidental', () => {
    for (const mode of MODES) {
      const keys = transposableKeys(`C ${mode}`)
      for (const [pitchClass, offered] of keys.entries()) {
        if (pitchClass === 0) continue // the authored key's class, checked below
        expect(offered, `${mode} at ${pitchClass}`).toBe(conventional(mode, pitchClass))
        const marks = marksOf(offered)
        expect(marks, offered).toBeDefined()
        for (const rival of candidates(mode).filter((k) => pitchClassOf(k) === pitchClass && k !== offered)) {
          const rivalMarks = marksOf(rival)
          if (rivalMarks !== undefined) expect(rivalMarks, `${rival} beats ${offered}`).toBeGreaterThanOrEqual(marks as number)
        }
      }
    }
  })

  it('answers per mode: the same pitch class is spelt differently where the mode wants it', () => {
    // Derived: find a pitch class whose conventional spelling differs between two modes, and
    // check the helper follows each. Major on pitch class 8 is the flat spelling (Ab, four
    // flats; G# needs F##) and locrian on the same class is the sharp one (G#; Ab needs Bbb).
    const major = transposableKeys('C major')
    const locrian = transposableKeys('C locrian')
    const differing = [...Array(12).keys()].filter((pc) => pc !== 0 && major[pc] !== locrian[pc]?.replace(' locrian', ' major'))
    expect(differing.length).toBeGreaterThan(0)
    for (const pc of differing) {
      expect(major[pc]).toBe(conventional('major', pc))
      expect(locrian[pc]).toBe(conventional('locrian', pc))
    }
    expect(major[8]).toBe('Ab major')
    expect(locrian[8]).toBe('G# locrian')
    expect(marksOf('G# major')).toBeUndefined()
    expect(marksOf('Ab locrian')).toBeUndefined()
  })

  it('breaks a tie by code unit, so a tritone from C in major is F# and not Gb (§7.2)', () => {
    expect(marksOf('F# major')).toBe(marksOf('Gb major'))
    expect(compareCodeUnits('F# major', 'Gb major')).toBeLessThan(0)
    expect(transposableKeys('C major')[6]).toBe('F# major')
    // And the tie is decided the same way wherever it falls: every offered key with an
    // equal-marks rival sorts before that rival.
    for (const mode of MODES) {
      for (const [pc, offered] of transposableKeys(`C ${mode}`).entries()) {
        if (pc === 0) continue
        for (const rival of candidates(mode).filter((k) => pitchClassOf(k) === pc && k !== offered)) {
          if (marksOf(rival) === marksOf(offered)) expect(compareCodeUnits(offered, rival), `${offered} vs ${rival}`).toBeLessThan(0)
        }
      }
    }
  })

  it('excludes B# and Cb by the count of their scales, with no rule naming them', () => {
    // Neither is ever offered, and in every mode the count says why: a double accidental (B#
    // in all modes but locrian, where its scale is C# major's seven sharps), or more marks than
    // the partner spelling (Cb major's seven flats against B major's five), or the same marks
    // and a later code unit (Cb lydian and B lydian, six each).
    for (const mode of MODES) {
      const keys = transposableKeys(`D ${mode}`)
      for (const [odd, partner] of [
        [`B# ${mode}`, `C ${mode}`],
        [`Cb ${mode}`, `B ${mode}`],
      ] as const) {
        expect(keys, odd).not.toContain(odd)
        const marks = marksOf(odd)
        if (marks === undefined) continue
        const rival = marksOf(partner) as number
        expect(marks, `${odd} vs ${partner}`).toBeGreaterThanOrEqual(rival)
        if (marks === rival) expect(compareCodeUnits(partner, odd)).toBeLessThan(0)
      }
    }
    expect(marksOf('B# major')).toBeUndefined()
    expect(marksOf('B# locrian')).toBe(7)
    expect(marksOf('Cb major')).toBe(7)
    expect(marksOf('B major')).toBe(5)
  })

  it('lets the authored key win its own pitch class, even against the conventional spelling', () => {
    // Every authored key that is not the rule's own choice for its class displaces it.
    let displaced = 0
    for (const { id, key } of EVERY_AUTHORED) {
      const mode = parseKey(key)?.mode as string
      const pc = pitchClassOf(key)
      const keys = transposableKeys(key)
      expect(keys[pc], id).toBe(key)
      if (conventional(mode, pc) !== key) displaced++
    }
    // Constructed, so the override is exercised whatever the library authors: minor's class 3
    // is `D# minor` by the tie-break, and an authored `Eb minor` still opens on itself.
    expect(conventional('minor', 3)).toBe('D# minor')
    expect(transposableKeys('Eb minor')[3]).toBe('Eb minor')
    expect(transposableKeys('Eb minor')).toHaveLength(12)
    expect(transposableKeys('D# minor')[3]).toBe('D# minor')
    // An authored key the count would exclude outright is still shown, because the page is in it.
    expect(marksOf('B# major')).toBeUndefined()
    expect(transposableKeys('B# major')[0]).toBe('B# major')
    expect(transposableKeys('B# major')).toHaveLength(12)
    // And one that merely loses the count.
    expect(transposableKeys('Cb major')[11]).toBe('Cb major')
    // Said so the number means something: how many library keys rely on the override today.
    expect(displaced).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic, and offers nothing for a key it cannot read', () => {
    for (const { key } of EVERY_AUTHORED) expect(transposableKeys(key)).toEqual(transposableKeys(key))
    expect(transposableKeys('H minor')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------

describe('KeySelect (#570)', () => {
  const keys = transposableKeys('E phrygian')

  it('is a labelled select whose value is the active key', () => {
    const markup = renderToStaticMarkup(
      createElement(KeySelect, { id: 'k', keys, selected: 'E phrygian', onChange: () => undefined }),
    )
    expect(markup).toContain('<label class="knob-label" for="k">')
    expect(markup).toContain('<select id="k"')
    expect(markup).toContain('<option value="E phrygian" selected="">E phrygian</option>')
    expect((markup.match(/<option /g) ?? []).length).toBe(keys.length)
    // The studio's own key control classes, so the two gestures look alike.
    expect(markup).toContain('class="song-select mono"')
  })

  it('hands its handler the key the reader picked, as a string', () => {
    const onChange = vi.fn()
    const select = elementsIn(treeOf(createElement(KeySelect, { id: 'k', keys, selected: 'E phrygian', onChange })), 'select')
    expect(select).toHaveLength(1)
    const props = select[0]?.props as { onChange: (e: { target: { value: string } }) => void }
    props.onChange({ target: { value: 'A phrygian' } })
    expect(onChange).toHaveBeenCalledWith('A phrygian')
  })

  it('shows a selected key that is not on offer rather than pointing at one it is not in', () => {
    const markup = renderToStaticMarkup(
      createElement(KeySelect, { id: 'k', keys, selected: 'Fbb phrygian', onChange: () => undefined }),
    )
    expect(markup).toContain('<option value="Fbb phrygian" selected="">')
    expect((markup.match(/<option /g) ?? []).length).toBe(keys.length + 1)
  })
})

// ---------------------------------------------------------------------------
// The interaction
// ---------------------------------------------------------------------------

describe('ProgressionView moves every chord when the key changes (#570)', () => {
  it('re-renders the table at the key the select asked for, with every row spelt there', () => {
    // Lydian House, so the seventh moves too.
    const harmony = lydianHouse.harmony
    const initial = lydianHouse.keys[0] as string
    const onChange = vi.fn()
    const view = createElement(ProgressionView, { harmony, id: 'k', initialKey: initial, selected: initial, onChange })
    const before = renderToStaticMarkup(view)
    for (const notes of notesColumn(harmony, initial)) expect(before).toContain(`<td class="mono">${notes}</td>`)

    // The reader picks another key.
    const select = elementsIn(treeOf(view), 'select')
    const props = select[0]?.props as { onChange: (e: { target: { value: string } }) => void }
    const options = elementsIn(treeOf(view), 'option').map((o) => (o.props as { value: string }).value)
    const next = options.find((k) => k !== initial) as string
    props.onChange({ target: { value: next } })
    expect(onChange).toHaveBeenCalledWith(next)

    // And the view at that key has every chord moved, to what `spellChord` says it is there.
    const after = renderToStaticMarkup(
      createElement(ProgressionView, { harmony, id: 'k', initialKey: initial, selected: next, onChange }),
    )
    const was = notesColumn(harmony, initial)
    const now = notesColumn(harmony, next)
    expect(now).toHaveLength(harmony.progression.length)
    for (const [i, step] of harmony.progression.entries()) {
      const spelt = spellChord(step.degree, next)
      expect(spelt.outcome).toBe('resolved')
      if (spelt.outcome !== 'resolved') continue
      expect(now[i]).toBe(spelt.chord.notes.join(' · '))
      expect(now[i], `${step.degree} did not move`).not.toBe(was[i])
      expect(after).toContain(`<td class="mono">${now[i] as string}</td>`)
    }
    expect(after).toContain(`<option value="${next}" selected="">`)
    // Every option offered is a key the whole table spells in.
    for (const key of options) {
      expect(notesColumn(harmony, key).every((n) => n !== UNSPELLABLE_CHORD), key).toBe(true)
    }
    // The offered list is the progression's, not the selected key's, so it did not change.
    expect(elementsIn(treeOf(view), 'option')).toHaveLength(
      elementsIn(
        treeOf(createElement(ProgressionView, { harmony, id: 'k', initialKey: initial, selected: next, onChange })),
        'option',
      ).length,
    )
  })

  it('opens on the authored key, server-rendered with its notes', () => {
    const markup = renderToStaticMarkup(
      createElement(ProgressionInKey, { harmony: droneStudy.harmony, initialKey: 'A phrygian' }),
    )
    expect(markup).toContain('<option value="A phrygian" selected="">')
    for (const notes of notesColumn(droneStudy.harmony, 'A phrygian')) {
      expect(markup).toContain(`<td class="mono">${notes}</td>`)
    }
    expect(markup).toContain('Bb · D · F')
  })

  it('owns the key as state and hands it to the view, nothing more', () => {
    // The wrapper is two hooks and one element. Read as source, because a hook cannot be driven
    // from Node: what is checked is that the state it holds is the key and its setter is the
    // view's `onChange`, so the interaction above is the one a browser performs.
    const source = readFileSync(resolvePath(REPO_ROOT, 'components/harmony/progression-in-key.tsx'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).toContain("'use client'")
    expect(code).toContain('const [key, setKey] = useState(initialKey)')
    expect(code).toContain('onChange={setKey}')
    expect(code).toContain('selected={key}')
    expect(code).not.toContain('useEffect')
  })

  it('names an unspellable chord rather than leaving the cell blank (invariant 5)', () => {
    const markup = renderToStaticMarkup(
      createElement(ProgressionView, {
        harmony: { cycleBars: 4, progression: [{ degree: 'bII', bars: 4 }] },
        id: 'k',
        initialKey: 'C major',
        selected: 'Fbb major',
        onChange: () => undefined,
      }),
    )
    expect(markup).toContain(`<td class="mono">${UNSPELLABLE_CHORD}</td>`)
    expect(markup).not.toContain('<td class="mono"></td>')
  })
})

// ---------------------------------------------------------------------------
// The direction page
// ---------------------------------------------------------------------------

describe('the direction page reads its progression in a chosen key (#570)', () => {
  async function markupFor(id: string): Promise<string> {
    return renderToStaticMarkup(await DirectionPageRoute({ params: Promise.resolve({ id } as never) }))
  }

  it('server-renders the first offered key’s notes and a select opened on it, for every direction', async () => {
    for (const t of TEMPLATES) {
      const markup = await markupFor(t.id)
      const first = t.keys[0] as string
      expect(markup, t.id).toContain(`<option value="${first}" selected="">`)
      for (const notes of notesColumn(t.harmony, first)) {
        expect(markup, `${t.id}: ${notes}`).toContain(`<td class="mono">${notes}</td>`)
      }
      expect(text(markup), t.id).not.toContain(UNSPELLABLE_CHORD)
      // Every option is one `transposableKeys` offers, and every offered key is an option.
      const options = [...markup.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])
      expect(options, t.id).toEqual(transposableKeys(first))
      for (const key of t.keys) expect(options, `${t.id} offers ${key}`).toContain(key)
    }
  })

  /**
   * No writer may enter the route's import graph — the same rule `riff-storage.test.ts` holds
   * the riff page to, walked here rather than listed: every file the page imports, and every
   * file those import, outside `lib/core` (whose barrel exports the studio's own writer for the
   * studio). A file added to the graph is checked on the commit that adds it.
   */
  it('reaches no studio or session writer from the route', () => {
    const seen = new Set<string>()
    const resolveImport = (from: string, spec: string): string | undefined => {
      const base = spec.startsWith('@/')
        ? resolvePath(REPO_ROOT, spec.slice(2))
        : spec.startsWith('.')
          ? resolvePath(dirname(from), spec)
          : undefined
      if (base === undefined) return undefined
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`, resolvePath(base, 'index.ts')]) {
        if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate
      }
      return undefined
    }
    const walk = (file: string) => {
      if (seen.has(file)) return
      seen.add(file)
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      for (const match of code.matchAll(/from\s+'([^']+)'/g)) {
        const target = resolveImport(file, match[1] as string)
        if (target !== undefined) walk(target)
      }
    }
    walk(resolvePath(REPO_ROOT, 'app/directions/[id]/page.tsx'))
    const outsideCore = [...seen].filter((f) => !f.includes('/lib/core/'))
    // The walk found the new components, so it is walking.
    expect(outsideCore.some((f) => f.endsWith('components/harmony/progression-in-key.tsx'))).toBe(true)
    expect(outsideCore.some((f) => f.endsWith('components/harmony/key-select.tsx'))).toBe(true)
    for (const file of outsideCore) {
      const code = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      for (const writer of ['saveStudio', 'syncStudio', 'createStudioSync', 'setItem', 'STUDIO_STORAGE_KEY']) {
        expect(code, `${file.replace(REPO_ROOT, '')} reaches ${writer}`).not.toContain(writer)
      }
      expect(seen.has(resolvePath(REPO_ROOT, 'lib/studio/session.ts')), 'session.ts is in the graph').toBe(false)
    }
  })
})
