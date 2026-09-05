import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { moodState, renderGuide, resolve } from '../lib/core/index'
import type { ResolveResult } from '../lib/core/index'
import { Guide } from '../components/guide/guide'
import { device, recipe, template } from './fixtures'

/**
 * §3.1/#414. **A CC number renders as a suffix on the value line, in both renderers.**
 *
 * The field had no rendering of its own. `resolveParam` appended `MIDI CC 51` to `note`, so on a
 * control with nothing to say the controller number became the whole of a NOTE row — a
 * subordinate line, styled for prose, carrying a number, beside a sibling whose note said
 * something real. #414 separated the two: `note` is authored prose, `midiCc` is a typed number,
 * and where the number reaches a reader is decided here.
 *
 * It reaches them **beside the value**. It is addressing information — which control this is to
 * anything driving the box — so it belongs on the line the reader is dialling rather than under
 * it, and a suffix costs no row, which is what §8's reader standing at a machine is short of.
 *
 * **The two renderers implement it separately (#33)**, which is this repository's standing rule
 * and not an oversight: they are siblings reading the same `ResolveResult`, neither reads the
 * other's output, and a shared helper returning Markdown backticks would be a worse coupling than
 * a restated decision. What that costs is exactly the drift this file exists to catch, so every
 * assertion below runs against **both** and the suffix string is written out once.
 */

const CITE = { kind: 'manual', source: 'Fixture p.1' } as const

/**
 * Five parameters covering the whole cross of the change: both param kinds that can declare a CC,
 * each with and without authored prose, plus a control that declares none.
 *
 * Every one of them is on the same recipe, so a single rendered guide holds all five and no
 * assertion below can pass by rendering a different part than it thinks it is reading.
 */
const PARAMS = [
  // Numeric, CC, no prose. The 372-line shape: this used to be a NOTE row reading `MIDI CC 51`.
  { kind: 'numeric', name: 'CUTOFF', value: 74, unit: '%', midiCc: 51,
    range: { min: 0, max: 100, verified: CITE } },
  // Numeric, CC, prose. This used to be `<prose> · MIDI CC 52`, one string in one field.
  { kind: 'numeric', name: 'PAN', value: 40, unit: '%', midiCc: 52, note: 'Bipolar, centred at noon',
    range: { min: 0, max: 100, verified: CITE } },
  // Enum, CC, no prose. The branch that had no `midiCc` field at all before #414.
  { kind: 'enum', name: 'SYNC', value: 'on', midiCc: 93, options: { values: ['on', 'off'] } },
  // Enum, CC, prose.
  { kind: 'enum', name: 'DELAY TIME', value: '1/8', midiCc: 94, options: { values: ['1/8', '1/4'] },
    note: 'Straight, against the dotted right' },
  // No CC at all: the control that must gain nothing, so none of this is vacuous.
  { kind: 'numeric', name: 'DRIVE', value: 30, unit: '%',
    range: { min: 0, max: 100, verified: CITE } },
] as const

const RIG = device({
  recipes: [recipe({ params: PARAMS.map((p) => ({ ...p })) as never })],
})

const result: ResolveResult = resolve({
  devices: [RIG],
  template: template(),
  mood: moodState(),
  seed: 3,
})

const markdown = renderGuide(result)
const web = renderToStaticMarkup(createElement(Guide, { result, seed: 3, layout: 'phase' }))

/** Written once. Both renderers are asserted against this same string, character for character. */
function suffix(cc: number): string {
  return `· MIDI CC ${String(cc)}`
}

/** Every line of the Markdown guide that renders one parameter. */
function markdownLine(name: string): string {
  const line = markdown.split('\n').find((l) => l.includes(`**${name}**`))
  expect(line, `no Markdown parameter line for ${name}`).toBeDefined()
  return line as string
}

describe('a CC renders as a suffix on the value line, in both renderers (§3.1/#414)', () => {
  it('renders the fixture at all, so nothing below is vacuous', () => {
    // Five controls, and both renderers reached them. A guide that resolved no part would pass
    // every "does not contain" assertion in this file.
    for (const p of PARAMS) {
      expect(markdown, p.name).toContain(`**${p.name}**`)
      expect(web, p.name).toContain(p.name)
    }
  })

  it('puts the suffix on the value line for a numeric with no prose', () => {
    expect(markdownLine('CUTOFF')).toContain(suffix(51))
    expect(web).toContain(`<span class="value-cc">${suffix(51)}</span>`)
  })

  it('puts the identical suffix on an enum, which is the branch that had no field (#414)', () => {
    expect(markdownLine('SYNC')).toContain(suffix(93))
    expect(web).toContain(`<span class="value-cc">${suffix(93)}</span>`)
  })

  it('keeps the suffix on the value line and the prose alone in the note', () => {
    // The pairing #414 pulled apart, from the reader's end: both facts still reach them, on two
    // different lines, and neither has acquired any part of the other.
    for (const [name, cc, prose] of [
      ['PAN', 52, 'Bipolar, centred at noon'],
      ['DELAY TIME', 94, 'Straight, against the dotted right'],
    ] as const) {
      const line = markdownLine(name)
      expect(line, name).toContain(suffix(cc))
      expect(line, name).not.toContain(prose)
      // The note is its own subordinate line, and it carries the prose and nothing else.
      const note = markdown.split('\n').find((l) => l.includes(prose))
      expect(note, name).toBeDefined()
      expect(note as string, name).toContain('↳ note:')
      expect(note as string, name).not.toContain('MIDI')

      expect(web, name).toContain(`<span class="value-cc">${suffix(cc)}</span>`)
      expect(web, name).toContain(`<p class="subordinate note">${prose}</p>`)
    }
  })

  it('gives a control with no CC no suffix, in either renderer', () => {
    expect(markdownLine('DRIVE')).not.toContain('MIDI')
    // Four `.value-cc` spans in the whole page and no fifth — the four controls that declare one.
    expect(web.split('value-cc').length - 1).toBe(4)
  })

  it('never renders a CC as a subordinate line', () => {
    // The defect itself, keyed on the two shapes a subordinate line takes rather than on the
    // absence of a string: a CC that came back as a note would still be *somewhere* on the page,
    // and only its being on the wrong line is the bug.
    for (const line of markdown.split('\n')) {
      if (line.includes('↳ note:') || line.includes('↳ hint:')) {
        expect(line).not.toContain('MIDI')
      }
    }
    expect(web).not.toContain('subordinate note">· MIDI')
    expect(web).not.toMatch(/class="subordinate[^"]*"[^>]*>[^<]*MIDI CC/)
  })

  it('sets the suffix in the prose face, not the value face (§10)', () => {
    // The whole reason `.value-cc` exists rather than reusing `.value-range mono`: a controller
    // number is a label, not a number the reader dials or a scale they read the value against.
    expect(web).toContain('class="value-cc"')
    expect(web).not.toContain('class="value-cc mono"')
    // And in Markdown the same decision is the backticks: unit, range and this all sit outside
    // them, and only the value the reader dials is inside.
    expect(markdownLine('CUTOFF')).toMatch(/`74`\s*%\s*\(0…100 %\)\s*· MIDI CC 51/)
  })

  it('puts it after the unit and the range, which qualify the number and this does not', () => {
    const line = markdownLine('CUTOFF')
    expect(line.indexOf(suffix(51))).toBeGreaterThan(line.indexOf('(0…100 %)'))
    expect(web.indexOf('value-cc')).toBeGreaterThan(web.indexOf('value-range'))
  })
})
