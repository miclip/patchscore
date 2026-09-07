import { createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { CHARACTERS, MOOD_AXES, NEUTRAL_MOOD, PATTERN_SLOTS, ROLES, resolve } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { industrialTechno, weave } from '../lib/templates/index'
import { DEFAULT_INPUTS } from '../lib/studio/session'
import { Guide } from '../components/guide/guide'
import { Studio } from '../components/studio'
import { DEFINITIONS, VOCABULARY_WORDS, definitionOf, kindOf } from '../lib/studio/glossary'
import type { VocabularyWord } from '../lib/studio/glossary'
import { PARTS } from '../lib/studio/parts'
import { VocabularyModal, VocabularyTerm } from '../components/vocabulary-term'
import { DensityDetents } from '../components/density-detents'

/**
 * #457. The first term wired up, and the parts of it that a later term must not have to
 * re-argue: the word is the control, the definition arrives in a native modal dialog rather than
 * in the page's flow, and every way out of it works without a mouse.
 *
 * Rendered in Node with no jsdom, like every other component test here. `VocabularyModal` takes
 * no hooks, so it is an ordinary function returning an element tree and the handlers it builds
 * can be pulled out and called — the same seam `test/placement-control.test.ts` uses. What that
 * cannot see is `showModal()`, focus and the element's own `close` event, which are DOM
 * behaviour: those are checked in a browser and not here.
 */

/** Every element of one tag in a rendered tree, in document order. */
function elementsIn(node: ReactNode, tag: string): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => elementsIn(child as ReactNode, tag))
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  return [...(node.type === tag ? [node] : []), ...elementsIn(props.children, tag)]
}

const NO_DIALOG: RefObject<HTMLDialogElement | null> = { current: null }
const NO_BUTTON: RefObject<HTMLButtonElement | null> = { current: null }

function modal(handlers: { requestClose?: () => void } = {}) {
  return VocabularyModal({
    word: 'density',
    definition: 'A definition.',
    kind: 'mood axis',
    titleId: 'title-1',
    dialogRef: NO_DIALOG,
    closeRef: NO_BUTTON,
    requestClose: handlers.requestClose ?? (() => {}),
  })
}

describe('the glossary is a closed list of the words we chose', () => {
  it('carries all 42 of them, each exactly once', () => {
    expect(VOCABULARY_WORDS).toHaveLength(42)
    expect(new Set(VOCABULARY_WORDS).size).toBe(42)
    expect(VOCABULARY_WORDS).toHaveLength(
      ROLES.length + CHARACTERS.length + MOOD_AXES.length + PATTERN_SLOTS.length,
    )
  })

  it('defines all 42 and nothing else', () => {
    const sorted = (words: readonly string[]) => [...words].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    // Exactly the vocabulary: the type already refuses a missing word, and this refuses a key
    // that is not a word at all.
    expect(sorted(Object.keys(DEFINITIONS))).toEqual(sorted(VOCABULARY_WORDS))
    for (const word of VOCABULARY_WORDS) expect(definitionOf(word).trim()).not.toBe('')
  })

  it('says each of them in a sentence or two', () => {
    for (const word of VOCABULARY_WORDS) {
      const definition = definitionOf(word)
      const sentences = definition.split('. ').filter((part) => part.trim() !== '')
      expect(sentences.length, `${word} runs on`).toBeLessThanOrEqual(2)
      // Invariant 7's measure. A jog, not a manual page.
      expect(definition.split(/\s+/).length, `${word} is documentation`).toBeLessThanOrEqual(45)
    }
  })

  it('takes the roles from the sentences /parts already prints', () => {
    // One copy. A second set of 23 role descriptions is one of them going stale, and the page and
    // the modal would then disagree about the same word in public.
    for (const role of ROLES) expect(definitionOf(role)).toBe(PARTS[role].is)
  })

  it('reads each word’s kind off the vocabulary it is in, never off the entry', () => {
    expect(kindOf('density')).toBe('mood axis')
    expect(kindOf('kick')).toBe('role')
    expect(kindOf('bright')).toBe('character')
    expect(kindOf('backbeat')).toBe('pattern slot')
    // `dark` is a character and `darkness` an axis. Neither may borrow the other's kind.
    expect(kindOf('dark')).toBe('character')
    expect(kindOf('darkness')).toBe('mood axis')
  })

  it('says density does both of the things it does (§6)', () => {
    // It leans the band `patternBand` picks *and* offsets every param authored for the axis —
    // note length, probability, rate. Naming one half would send a reader looking for a knob
    // that does nothing on a part whose other half they were standing in front of.
    const definition = definitionOf('density')
    expect(definition).toMatch(/sparser or busier/)
    expect(definition, 'the sound-settings half is missing').toMatch(/sound settings/)
    // `densityShift` selects among authored variants; it never edits hits (§4.3).
    expect(definition).not.toMatch(/adds|removes|only/)
  })

  it('keeps every axis honest about the boxes that decline it (§6.1)', () => {
    // A device declines an axis by having no param that declares it. On `swing` that is common
    // enough that a reader meets a knob doing nothing and needs the sentence to say why.
    expect(definitionOf('swing')).toContain('a box with none stays where it is')
    // Several controls carry the axis in the library, so the sentence names none of them.
    expect(definitionOf('swing')).not.toMatch(/SWING|SHUFFLE|Glide/)
  })

  it('describes the slots as `lib/core/authoring.ts` fixes them (§4.3)', () => {
    // The convention is decided once there, for devices and templates both. These sentences are
    // that convention said to a reader, so they cannot drift from it quietly.
    expect(definitionOf('accent')).toContain('high velocity')
    expect(definitionOf('ghost')).toContain('low velocity')
    expect(definitionOf('backbeat')).toContain('two and four')
    // `first-hit` is the entry gesture, never "whichever hit happens to be first".
    expect(definitionOf('first-hit')).toContain('pulse')
    expect(definitionOf('last-hit')).toContain('pulse')
  })

  it('names the other end of every character pair (§3.4)', () => {
    // A character means something only against its opposite, so each definition names it. What
    // a recipe does about it is the recipe's business and is not described here.
    for (const [word, opposite] of [
      ['hard', 'soft'],
      ['soft', 'hard'],
      ['bright', 'dark'],
      ['dark', 'bright'],
      ['clean', 'dirty'],
      ['dirty', 'clean'],
    ] as const) {
      expect(definitionOf(word), `${word} does not name its opposite`).toContain(
        `Its opposite is ${opposite}.`,
      )
    }
  })
})

describe('the modal a term opens', () => {
  it('is a real dialog element, labelled by the word it defines', () => {
    const tree = modal() as ReactElement
    // Not a `div` with `role="dialog"`: `<legend>` takes phrasing content, and the browser only
    // makes the rest of the page inert for an element it opened itself.
    expect(tree.type).toBe('dialog')

    const html = renderToStaticMarkup(
      createElement(VocabularyModal, {
        word: 'density',
        definition: 'How busy each section’s patterns are.',
        kind: 'mood axis',
        titleId: 'title-1',
        dialogRef: NO_DIALOG,
        closeRef: NO_BUTTON,
        requestClose: () => {},
      }),
    )
    expect(html).toContain('<dialog')
    expect(html).toContain('aria-labelledby="title-1"')
    expect(html).toContain('id="title-1"')
    expect(html).toContain('density')
    expect(html).toContain('mood axis')
    expect(html).toContain('How busy each section’s patterns are.')
  })

  it('closes on a tap on the backdrop, and stays open on a tap inside it', () => {
    const requestClose = vi.fn()
    const dialog = modal({ requestClose }) as ReactElement
    const onClick = (dialog.props as { onClick: (event: unknown) => void }).onClick
    const self = {}

    onClick({ target: {}, currentTarget: self })
    expect(requestClose, 'a tap on the card closed it').not.toHaveBeenCalled()

    // The backdrop belongs to the dialog element, so a tap on it arrives here.
    onClick({ target: self, currentTarget: self })
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('offers a control that says Close, and closes', () => {
    const requestClose = vi.fn()
    const buttons = elementsIn(modal({ requestClose }), 'button')
    expect(buttons).toHaveLength(1)
    const props = buttons[0]?.props as { children?: ReactNode; onClick?: () => void }
    expect(String(props.children)).toBe('Close')
    props.onClick?.()
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('hands Escape to the browser, and React nothing to keep in step with', () => {
    const props = (modal() as ReactElement).props as { onKeyDown?: unknown; onClose?: unknown }
    // Escape reaches a modal dialog as `cancel` and then `close`. A hand-written key handler
    // would be a second way out; React's own `onClose` prop was a third that stopped firing
    // after an instance's first close, so the `close` listener is added in the effect instead.
    expect(props.onKeyDown).toBeUndefined()
    expect(props.onClose).toBeUndefined()
  })
})

describe('the term itself', () => {
  it('renders the word as a button and nothing over the page until it is pressed', () => {
    const html = renderToStaticMarkup(createElement(VocabularyTerm, { word: 'density' }))
    expect(html).toContain('class="vocab-term"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('>density<')
    expect(html).not.toContain('<dialog')
  })

  it('is what the density control is labelled with', () => {
    const html = renderToStaticMarkup(
      createElement(DensityDetents, { value: 50, onChange: () => {} }),
    )
    expect(html).toContain('<legend class="knob-label"><button')
    expect(html).toContain('vocab-term')
    expect(html).toContain('>density<')
    // The dialog is portalled to `document.body`; nothing of it may be inside the legend.
    expect(html).not.toContain('<dialog')
  })
})

describe('read at the machine (#21)', () => {
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

  function rule(selector: string): string {
    const at = css.indexOf(`\n${selector} {`)
    expect(at, `${selector} has no rule at all`).toBeGreaterThan(-1)
    return css.slice(at, css.indexOf('}', at))
  }

  it('dims the page with the dialog’s own backdrop', () => {
    expect(rule('.vocab-modal::backdrop')).toContain('background')
  })

  it('keeps the dialog’s padding on the card, so the backdrop target is the backdrop', () => {
    // A click on the dialog element is how a backdrop click arrives. Padding here would make the
    // card's own margin dismiss the definition somebody is reading.
    expect(rule('.vocab-modal')).toContain('padding: 0')
    expect(rule('.vocab-modal-card')).toContain('padding: 16px')
  })

  it('sets its own type, so a term in a silkscreen label does not shout its definition', () => {
    // The card renders inside whatever line the term is on. `.knob-label` is uppercase and
    // tracked, and the definition inherited both until this reset went in.
    const card = rule('.vocab-modal')
    expect(card).toContain('text-transform: none')
    expect(card).toContain('letter-spacing: normal')
    expect(card).toContain('font-family: var(--font-label)')
  })

  it('adds an underline to the word and no box around it', () => {
    const term = rule('.vocab-term')
    expect(term).toContain('text-decoration: underline')
    expect(term).toContain('font: inherit')
    expect(term).toContain('border: 0')
    expect(term).toContain('padding: 0')
  })

  it('grows the hit target without growing the word', () => {
    // Padding here would move the line the word sits on. The overlay takes no space.
    expect(rule('.vocab-term::after')).toContain('position: absolute')
    expect(rule('.vocab-close')).toContain('min-height: 44px')
  })
})

/**
 * #457 wired up. The claim is not that some words are underlined: it is that **exactly** the
 * words in the vocabulary are, and that a reader can reach a definition from wherever the guide
 * names one — a role in a part heading, a character in a recipe note, a slot in a step list, and
 * every one of the five mood knobs.
 *
 * The rig is the real library against a real direction, so what is asserted is what a reader
 * gets rather than what a fixture was built to produce.
 */
const GUIDE = renderToStaticMarkup(
  createElement(Guide, {
    result: resolve({ devices: DEVICES, template: industrialTechno, mood: NEUTRAL_MOOD, seed: 1 }),
    seed: 1,
    layout: 'phase',
  }),
)

/**
 * Weave, because it is the direction that prints the two strings a term must not be confused
 * with: `tightest re-strike` in a `slot` span, beside real slots (#457, §4.3).
 */
const WEAVE = renderToStaticMarkup(
  createElement(Guide, {
    result: resolve({ devices: DEVICES, template: weave, mood: NEUTRAL_MOOD, seed: 1 }),
    seed: 1,
    layout: 'phase',
  }),
)

const STUDIO = renderToStaticMarkup(createElement(Studio, { initialInputs: DEFAULT_INPUTS }))

/** The word inside every underlined trigger, in document order. */
function triggerWords(markup: string): string[] {
  return [...markup.matchAll(/<button[^>]*class="vocab-term"[^>]*>([^<]*)<\/button>/g)].map(
    (match) => match[1] as string,
  )
}

describe('the guide underlines its vocabulary and nothing else', () => {
  it('underlines only words the glossary defines', () => {
    // The guard against the lookalikes: `requestId` renders in the same `role mono` span as a
    // role, and `tightest re-strike` in the same `slot` span as a slot. Neither is a word we
    // chose, so neither may offer a definition.
    const words = triggerWords(GUIDE)
    expect(words.length, 'nothing in the guide is a term').toBeGreaterThan(0)
    for (const word of words) {
      expect(VOCABULARY_WORDS, `${word} is underlined and is not vocabulary`).toContain(word)
    }
  })

  it('reaches all three of the guide’s vocabularies', () => {
    const kinds = new Set(triggerWords(GUIDE).map((word) => kindOf(word as VocabularyWord)))
    expect(kinds.has('role'), 'no role is a term').toBe(true)
    expect(kinds.has('character'), 'no character is a term').toBe(true)
    expect(kinds.has('pattern slot'), 'no pattern slot is a term').toBe(true)
  })

  it('leaves the prose that is styled like a slot alone', () => {
    // `tightest re-strike` sits in a `slot` span next to real slots, and is not a word we chose.
    expect(WEAVE).toContain('<span class="slot">tightest re-strike</span>')
    for (const word of triggerWords(WEAVE)) {
      expect(VOCABULARY_WORDS, `${word} is underlined and is not vocabulary`).toContain(word)
    }
  })
})

describe('every mood control names its axis with a term (§6)', () => {
  it('gives all five a trigger', () => {
    const words = triggerWords(STUDIO)
    for (const axis of MOOD_AXES) {
      expect(words, `${axis} has no definition to open`).toContain(axis)
    }
  })

  it('keeps the knob’s own labels, and does not put the term inside one', () => {
    // A button inside a `<label>` is one control doing two things: reading what darkness means
    // would also focus the number field. The association is a real `for`/`id` pair beside it.
    expect(STUDIO).not.toMatch(/<label[^>]*>\s*<button[^>]*class="vocab-term"/)
    for (const axis of ['darkness', 'grit', 'swing', 'space'] as const) {
      expect(STUDIO, `${axis}'s number field lost its label`).toMatch(
        new RegExp(`<label class="sr-only" for="[^"]+">${axis}</label>`),
      )
      expect(STUDIO, `${axis}'s dial lost its name`).toContain(`aria-label="${axis}"`)
    }
  })
})
