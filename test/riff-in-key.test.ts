import { createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { referenceSlug, resolveHook, resolveRiff, spellChord, transposableKeys } from '../lib/core'
import type { Riff } from '../lib/core'
import { RIFFS } from '../lib/riffs'
import { DEVICES } from '../lib/devices/registry.generated'
import { RiffFigureView, RiffInKey } from '../components/riff/riff-in-key'
import { RiffFigure } from '../components/riff/riff-figure'
import { chordRows, noteRows } from '../lib/studio/riff-text'
import RiffRoute from '../app/riffs/[id]/page'
import PresetFigureRoute from '../app/devices/[id]/presets/[patch]/page'

/**
 * §5A/#570. **A riff read in a key the reader chooses**, on the page and nowhere else.
 *
 * Rendered in Node with no jsdom, like every other component test here. `RiffFigureView` takes
 * no hooks, so it is called as a function, its `<select>` found, its handler invoked with the
 * event a browser would send, and the view rendered again at the key the handler asked for. What
 * is then asserted is the whole claim: every spelling and every chord note moved, and nothing
 * else did.
 */

/** Every element of one tag in a rendered tree, in document order. */
function elementsIn(node: ReactNode, tag: string): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => elementsIn(child as ReactNode, tag))
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  return [...(node.type === tag ? [node] : []), ...elementsIn(props.children, tag)]
}

/** A hook-free component tree with nested hook-free components expanded. */
function expand(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map((child) => expand(child as ReactNode))
  if (!isValidElement(node)) return node
  if (typeof node.type === 'function') {
    return expand((node.type as (props: unknown) => ReactNode)(node.props))
  }
  const props = node.props as { children?: ReactNode }
  return { ...node, props: { ...props, children: expand(props.children) } } as ReactNode
}

const text = (markup: string) =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const RULES = createElement('section', { className: 'rules-stub' }, 'rules')
const GRID = createElement('section', { className: 'grid-stub' }, 'grid')

function viewAt(riff: Riff, shownKey: string, onChange: (key: string) => void = () => undefined) {
  return createElement(RiffFigureView, {
    riff,
    resolution: resolveRiff(riff, []),
    shownKey,
    id: 'k',
    onChange,
    rules: RULES,
    grid: GRID,
  })
}

/** The facts a key moves and the facts it must not, read off one rendering. */
function facts(markup: string) {
  const cell = (cls: string) =>
    [...markup.matchAll(new RegExp(`<span class="${cls}">([^<]*)</span>`, 'g'))].map((m) => m[1] as string)
  const rows = [...markup.matchAll(/<tr><td class="mono">([^<]*)<\/td><td class="mono">([^<]*)<\/td><td class="mono numeric">([^<]*)<\/td><td class="mono">([^<]*)<\/td><\/tr>/g)]
  return {
    spellings: cell('mono riff-spelling'),
    degreesAndMidi: cell('riff-note-fact mono'),
    held: cell('riff-note-fact'),
    steps: cell('riff-step mono'),
    chordDegrees: rows.map((r) => r[1] as string),
    chordNotes: rows.map((r) => r[2] as string),
    chordBars: rows.map((r) => r[3] as string),
    chordMarks: rows.map((r) => r[4] as string),
    grid: markup.slice(markup.indexOf('<section class="grid-stub">')),
    rules: markup.includes('<section class="rules-stub">'),
  }
}

/**
 * The route that carries a riff (#598): a record-named entry is at `/riffs/<id>`, and a
 * patch-named one is a page under the box that ships the patch — found by the name the riff
 * references, exactly as `presetSession` finds the riff, since a riff names no box
 * (invariant 3). Both draw the figure through the same `RiffFigure`, so both are held to #570.
 */
async function markupFor(riff: Riff): Promise<string> {
  if (riff.reference.kind === 'record') {
    return renderToStaticMarkup(await RiffRoute({ params: Promise.resolve({ id: riff.id }) }))
  }
  const name = riff.reference.name
  const shipping = DEVICES.filter((d) => d.factoryPatches?.some((p) => p.name === name))
  if (shipping.length !== 1) throw new Error(`${riff.id}: ${shipping.length} boxes ship '${name}'`)
  return renderToStaticMarkup(
    await PresetFigureRoute({
      params: Promise.resolve({ id: shipping[0]!.id, patch: referenceSlug(name) }),
    }),
  )
}

const WITH_HARMONY = RIFFS.filter((r) => r.harmony !== undefined)
const WITHOUT_HARMONY = RIFFS.filter((r) => r.harmony === undefined)

describe('every offered key resolves the figure (#570)', () => {
  it('resolves the hook, and every chord, in all twelve keys of every riff', () => {
    expect(WITH_HARMONY.length).toBeGreaterThan(5)
    for (const riff of RIFFS) {
      const keys = transposableKeys(riff.key)
      expect(keys, riff.id).toHaveLength(12)
      expect(keys, riff.id).toContain(riff.key)
      for (const key of keys) {
        const hook = resolveHook(riff.hook, key)
        expect(hook.outcome, `${riff.id} in ${key}`).toBe('resolved')
        for (const step of riff.harmony?.progression ?? []) {
          expect(spellChord(step.degree, key).outcome, `${riff.id}: ${step.degree} in ${key}`).toBe('resolved')
        }
      }
    }
  })
})

describe('RiffFigureView moves the notes and the chords, and nothing else (#570)', () => {
  it('hands the picked key to its handler and re-renders every spelling there', () => {
    for (const riff of RIFFS) {
      const onChange = vi.fn()
      const view = viewAt(riff, riff.key, onChange)
      const before = renderToStaticMarkup(view)
      const options = elementsIn(expand(view), 'option').map((o) => (o.props as { value: string }).value)
      expect(options, riff.id).toEqual(transposableKeys(riff.key))
      const select = elementsIn(expand(view), 'select')[0]?.props as {
        value: string
        onChange: (e: { target: { value: string } }) => void
      }
      expect(select.value, riff.id).toBe(riff.key)

      // A key a tritone away, which moves every pitch and every letter.
      const next = options[(options.indexOf(riff.key) + 6) % 12] as string
      select.onChange({ target: { value: next } })
      expect(onChange, riff.id).toHaveBeenCalledWith(next)

      const after = renderToStaticMarkup(viewAt(riff, next, onChange))
      const was = facts(before)
      const now = facts(after)

      // What moved: every spelling, to the hook resolved in the new key.
      const hook = resolveHook(riff.hook, next)
      expect(hook.outcome).toBe('resolved')
      if (hook.outcome !== 'resolved') continue
      expect(now.spellings.length, riff.id).toBeGreaterThan(0)
      expect(now.spellings, riff.id).toHaveLength(was.spellings.length)
      for (const [i, row] of noteRows(hook.hook).entries()) {
        expect(now.spellings[i], `${riff.id} step ${row.step}`).toBe(row.notes.map((n) => n.note).join(' '))
        expect(now.spellings[i], `${riff.id} step ${row.step}`).not.toBe(was.spellings[i])
      }
      expect(after).toContain(`<option value="${next}" selected="">`)
      expect(text(after)).toContain(`in ${next}.`)

      // What did not: the steps, the degrees, how long each note is held, the rules, the grid.
      expect(now.steps, riff.id).toEqual(was.steps)
      expect(now.held, riff.id).toEqual(was.held)
      expect(now.grid, riff.id).toBe(was.grid)
      expect(now.rules, riff.id).toBe(was.rules)
      // Degrees are the same labels; MIDI numbers moved together, so every interval is kept.
      const degrees = (facts: string[]) => facts.filter((_, i) => i % 2 === 0)
      const midi = (facts: string[]) =>
        facts.filter((_, i) => i % 2 === 1).flatMap((m) => [...m.matchAll(/\d+/g)].map((n) => Number(n[0])))
      expect(degrees(now.degreesAndMidi), riff.id).toEqual(degrees(was.degreesAndMidi))
      const wasMidi = midi(was.degreesAndMidi)
      const nowMidi = midi(now.degreesAndMidi)
      expect(nowMidi.length, riff.id).toBe(wasMidi.length)
      const shift = (nowMidi[0] as number) - (wasMidi[0] as number)
      expect(shift % 12, riff.id).not.toBe(0)
      for (const [i, m] of nowMidi.entries()) expect(m - (wasMidi[i] as number), `${riff.id} note ${i}`).toBe(shift)

      // The chords: every note moved, every degree, bar span and marker stayed.
      if (riff.harmony === undefined) {
        expect(now.chordDegrees).toEqual([])
        continue
      }
      expect(now.chordDegrees, riff.id).toEqual(was.chordDegrees)
      expect(now.chordBars, riff.id).toEqual(was.chordBars)
      expect(now.chordMarks, riff.id).toEqual(was.chordMarks)
      expect(now.chordNotes.length, riff.id).toBe(riff.harmony.progression.length)
      for (const [i, row] of chordRows(riff, next).entries()) {
        expect(now.chordNotes[i], `${riff.id} ${row.degree}`).toBe((row.notes as string[]).join(' · '))
        expect(now.chordNotes[i], `${riff.id} ${row.degree}`).not.toBe(was.chordNotes[i])
      }
    }
  })

  it('at the authored key shows the prerender’s own resolution, and the control on every riff', () => {
    for (const riff of RIFFS) {
      const markup = renderToStaticMarkup(
        createElement(RiffInKey, { riff, resolution: resolveRiff(riff, []), rules: RULES, grid: GRID }),
      )
      expect(markup, riff.id).toContain(`<option value="${riff.key}" selected="">`)
      const hook = resolveHook(riff.hook, riff.key)
      if (hook.outcome !== 'resolved') throw new Error(riff.id)
      for (const row of noteRows(hook.hook)) {
        expect(markup, riff.id).toContain(`<span class="mono riff-spelling">${row.notes.map((n) => n.note).join(' ')}</span>`)
      }
    }
    // Riffs with no chords have the control too: it governs the notes alone there.
    expect(WITHOUT_HARMONY.length).toBeGreaterThan(0)
  })

  it('owns the key as state and passes it down, writing nowhere', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const source = readFileSync(new URL('../components/riff/riff-in-key.tsx', import.meta.url), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).toContain("'use client'")
    expect(code).toContain('const [key, setKey] = useState(riff.key)')
    expect(code).toContain('onChange={setKey}')
    expect(code).toContain('shownKey={key}')
    expect(code).not.toContain('useEffect')
    expect(code).not.toContain('resolveRiff(')
    expect(code).toContain('resolveHook(riff.hook, shownKey)')
  })
})

describe('the riff route prerenders the figure at its authored key, with the control (#570)', () => {
  it('carries the authored spellings and the select opened on the authored key', async () => {
    for (const riff of RIFFS) {
      const markup = await markupFor(riff)
      // One key control; a riff page's other select is the rig picker's, and it is not read here.
      const controls = markup.match(/<div class="song-row key-select">[\s\S]*?<\/select>/g) ?? []
      expect(controls.length, riff.id).toBe(1)
      const control = controls[0] as string
      expect(control, riff.id).toContain(`<option value="${riff.key}" selected="">`)
      const options = [...control.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1] as string)
      expect(options, riff.id).toEqual(transposableKeys(riff.key))
      const hook = resolveHook(riff.hook, riff.key)
      if (hook.outcome !== 'resolved') throw new Error(riff.id)
      for (const row of noteRows(hook.hook)) {
        expect(markup, riff.id).toContain(`<span class="mono riff-spelling">${row.notes.map((n) => n.note).join(' ')}</span>`)
      }
      for (const row of chordRows(riff)) {
        expect(markup, `${riff.id} ${row.degree}`).toContain(`<td class="mono">${(row.notes as string[]).join(' · ')}</td>`)
      }
      // The control heads the columns, before the chords and the notes it governs.
      const at = markup.indexOf('class="song-row key-select"')
      expect(at, riff.id).toBeLessThan(markup.indexOf('<h2>The notes</h2>'))
      if (riff.harmony !== undefined) {
        expect(at, riff.id).toBeLessThan(markup.indexOf('<h2>The chords</h2>'))
      }
    }
  })

  it('keeps the rules and the grid on the server, handed through the island', () => {
    const riff = RIFFS.find((r) => r.id === 'blade-runner-blues-lead') as Riff
    const markup = renderToStaticMarkup(createElement(RiffFigure, { riff, resolution: resolveRiff(riff, []) }))
    expect(markup).toContain('The rules')
    expect(markup).toContain('class="step-grid mono"')
    // In the authored order: chords, rules, notes, grid.
    const at = (s: string) => markup.indexOf(s)
    expect(at('The chords')).toBeLessThan(at('The rules'))
    expect(at('The rules')).toBeLessThan(at('The notes'))
    expect(at('The notes')).toBeLessThan(at('The grid'))
  })
})
