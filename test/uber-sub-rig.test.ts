import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Device, Recipe, Riff } from '../lib/core'
import { resolveRiff } from '../lib/core'
import { DEVICES } from '../lib/devices/registry.generated'
import { uberSubDisplacedFifthRiff as uber } from '../lib/riffs/uber-sub-displaced-fifth-riff'
import { renderRiff } from '../lib/studio/riff-markdown'
import { presetCompanion, presetSession } from '../lib/studio/preset-session'
import { companionGap, riffGap } from '../lib/studio/riff-text'
import { RiffRigView } from '../components/riff/riff-rig'
import { PresetCompanionView } from '../components/catalogue/preset-companion'
import { box, makeRecipe } from './rigs'

/**
 * §5A.9. **Where each part plays, from one joint resolution**, on the riff page and in the export.
 * Every assertion reads what a reader sees: the two headings, the box under each, the settings,
 * and the sentence for each gap, which has to name the companion's `pad / soft` and never the
 * host's `sub / dirty`.
 */

const text = (markup: string): string =>
  markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const byId = (id: string): Device => {
  const device = DEVICES.find((d) => d.id === id)
  if (device === undefined) throw new Error(`no ${id}`)
  return device
}
const SUB37 = byId('moog-subsequent-37')
const MICROFREAK = byId('arturia-microfreak')

function page(riff: Riff, rig: readonly Device[]): string {
  return renderToStaticMarkup(
    createElement(RiffRigView, {
      riff,
      resolution: resolveRiff(riff, rig),
      selected: rig.map((d) => d.id),
      onToggle: () => undefined,
    }),
  )
}

/** The text of the `.riff-where-panel` headed `heading`. */
function panel(markup: string, heading: string): string {
  const at = markup.indexOf(`<h2>${heading}</h2>`)
  expect(at, `no panel headed ${heading}`).toBeGreaterThan(-1)
  return text(markup.slice(at, markup.indexOf('</section>', at)))
}

/** The Markdown under `## heading`, to the next heading or the end. */
function section(md: string, heading: string): string {
  const at = md.indexOf(`## ${heading}\n`)
  expect(at, `no ## ${heading}`).toBeGreaterThan(-1)
  const end = md.indexOf('\n## ', at + 1)
  return md.slice(at, end === -1 ? undefined : end)
}

/** A box with one sub voice and one pad voice, each with the given characters. */
function twoVoiceBox(sub: Recipe['character'], pad: Recipe['character'] | undefined): Device {
  return box('fixture-pair', {
    name: 'Fixture Pair',
    voices: [
      { kind: 'fixed', id: 's', label: 'S', roles: ['sub'], polyphony: 1 },
      { kind: 'fixed', id: 'p', label: 'P', roles: ['pad'], polyphony: 4 },
    ],
    recipes: [
      makeRecipe('fixture-pair-sub', 'sub', sub, 's'),
      ...(pad === undefined ? [] : [makeRecipe('fixture-pair-pad', 'pad', pad, 'p')]),
    ],
  })
}

describe('each part gets its own block from the joint resolution (§5A.9)', () => {
  it('different boxes: the sub on the Subsequent 37, the pad on the MicroFreak', () => {
    const rig = [SUB37, MICROFREAK]
    const markup = page(uber, rig)
    expect(panel(markup, 'Where the sub plays')).toContain('Subsequent 37')
    expect(panel(markup, 'Where the pad plays')).toContain('MicroFreak')
    expect(panel(markup, 'Where the pad plays')).toContain('Settings')
    expect(markup).not.toContain('<h2>Where it plays</h2>')
    // One picker for both parts.
    expect(markup.match(/<section class="panel rig-picker">/g)).toHaveLength(1)
  })

  it('one box: both blocks name it, on different voices', () => {
    const rig = [twoVoiceBox('dirty', 'soft')]
    const r = resolveRiff(uber, rig)
    expect(r.outcome === 'played' && r.voice.assignables.map((a) => a.voiceId)).toEqual(['s'])
    expect(r.companion?.outcome === 'played' && r.companion.voice.assignables.map((a) => a.voiceId)).toEqual(['p'])
    const markup = page(uber, rig)
    expect(panel(markup, 'Where the sub plays')).toContain('Fixture Pair · S')
    expect(panel(markup, 'Where the pad plays')).toContain('Fixture Pair · P')
  })

  it('says each part’s own substitution, named the same way: the sub part, the pad part', () => {
    const markup = page(uber, [twoVoiceBox('dark', 'dark')])
    const host = panel(markup, 'Where the sub plays')
    const pad = panel(markup, 'Where the pad plays')
    expect(host).toContain('The sub part asks for a dirty sub and the nearest this box authors is dark.')
    expect(host).not.toContain('This riff')
    expect(pad).toContain('The pad part asks for a soft pad and the nearest this box authors is dark.')
    expect(pad).not.toMatch(/dirty|\bsub\b/)
  })
})

describe('every companion gap says what to do, in the pad’s words (§5A.9/§7.3)', () => {
  const gapOf = (rig: readonly Device[]): string => panel(page(uber, rig), 'Where the pad plays')

  it('no rig: pick the boxes', () => {
    expect(gapOf([])).toContain('Pick the boxes you own.')
  })

  it('no-such-role: nothing plays a pad', () => {
    const subOnly = box('sub-only', {
      name: 'Sub Only',
      voices: [{ kind: 'fixed', id: 's', label: 'S', roles: ['sub'], polyphony: 1 }],
      recipes: [makeRecipe('sub-only-sub', 'sub', 'dirty', 's')],
    })
    expect(gapOf([subOnly])).toContain('Add a box that plays pad.')
  })

  it('no-recipe: a pad voice with nothing written for it', () => {
    const unwritten = box('unwritten', {
      name: 'Unwritten',
      voices: [{ kind: 'fixed', id: 'p', label: 'P', roles: ['pad'], polyphony: 4 }],
      recipes: [makeRecipe('unwritten-kick', 'kick', 'hard', 'p')],
    })
    expect(gapOf([SUB37, unwritten])).toContain('Unwritten P could carry it. Set this one up by ear.')
  })

  it('polyphony: a pad voice that sounds one note, for a three-note hold', () => {
    const mono = box('mono-pad', {
      name: 'Mono Pad',
      voices: [{ kind: 'fixed', id: 'p', label: 'P', roles: ['pad'], polyphony: 1 }],
      recipes: [makeRecipe('mono-pad-soft', 'pad', 'soft', 'p')],
    })
    const sentence = gapOf([SUB37, mono])
    expect(sentence).toContain('The pad part needs 3 notes at once.')
    expect(sentence).not.toContain('This figure')
  })

  it('no-arpeggiator: an arpeggiated companion on a rig with no arpeggiator', () => {
    const held = uber.companion
    if (held === undefined) throw new Error('no companion')
    const arp: Riff = {
      ...uber,
      companion: { ...held, arpeggiatedHold: true, request: { ...held.request, polyphony: 1 } },
    }
    const r = resolveRiff(arp, [twoVoiceBox('dirty', 'soft')])
    expect(r.companion?.outcome === 'gap' && r.companion.gap).toMatchObject({
      reason: 'no-capable-voice',
      because: 'no-arpeggiator',
    })
    const sentence = panel(page(arp, [twoVoiceBox('dirty', 'soft')]), 'Where the pad plays')
    expect(sentence).toContain('The pad part holds its chord for an arpeggiator')
    expect(sentence).toContain('could play pad')
  })

  it('no-room: the rig plays the pad alone, and not beside the sub', () => {
    const shared = box('shared', {
      name: 'Shared',
      voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['sub', 'pad'], polyphony: 4 }],
      recipes: [makeRecipe('shared-sub', 'sub', 'dirty', 'v'), makeRecipe('shared-pad', 'pad', 'soft', 'v')],
    })
    const r = resolveRiff(uber, [shared])
    expect(r.outcome).toBe('played')
    expect(r.companion?.outcome === 'gap' && r.companion.gap.reason).toBe('no-room')
    expect(gapOf([shared])).toContain(
      'Shared V could play the pad part, but not beside the sub this rig is already playing. ' +
        'Add another box that plays pad.',
    )
  })
})

describe('the export says the same as the page (§5A.9)', () => {
  const rigs: [string, readonly Device[]][] = [
    ['different boxes', [SUB37, MICROFREAK]],
    ['one box', [twoVoiceBox('dirty', 'soft')]],
    ['substituted', [twoVoiceBox('dark', 'dark')]],
    ['pad gap', [SUB37]],
    ['host gap', [MICROFREAK]],
    ['empty', []],
  ]

  it.each(rigs)('%s', (_label, rig) => {
    const resolution = resolveRiff(uber, rig)
    const md = renderRiff(resolution)
    const markup = page(uber, rig)
    const at = (s: string) => md.indexOf(s)
    expect(at('## The pad notes')).toBeLessThan(at('## Where the sub plays'))
    expect(at('## Where the sub plays')).toBeLessThan(at('## Where the pad plays'))
    expect(md).not.toContain('## Where it plays')

    const mdPad = section(md, 'Where the pad plays')
    const pagePad = panel(markup, 'Where the pad plays')
    const part = resolution.companion
    if (part?.outcome === 'played') {
      expect(mdPad).toContain(part.voice.device.name)
      expect(pagePad).toContain(part.voice.device.name)
      expect(mdPad).toContain(part.voice.recipe.title)
      expect(pagePad).toContain(part.voice.recipe.title)
    } else if (part !== undefined) {
      const sentence = companionGap(uber, part.gap, resolution.devices)
      expect(mdPad).toContain(sentence)
      expect(pagePad).toContain(sentence)
    }
    const mdHost = section(md, 'Where the sub plays')
    const pageHost = panel(markup, 'Where the sub plays')
    if (resolution.outcome === 'played') {
      expect(mdHost).toContain(resolution.voice.recipe.title)
      expect(pageHost).toContain(resolution.voice.recipe.title)
    } else {
      const sentence = riffGap(uber, resolution.gap, resolution.devices, 'The sub part')
      expect(mdHost).toContain(sentence)
      expect(pageHost).toContain(sentence)
    }
  })
})

describe('the preset page’s companion picker (§5A.9/§3.7)', () => {
  const figure = presetSession(SUB37)?.entries.find((e) => e.figure?.riff.id === uber.id)?.figure
  if (figure === undefined) throw new Error('no UBER_SUB figure on the Subsequent 37')
  const offered = DEVICES.filter((d) => d.id !== SUB37.id)

  function view(rig: readonly Device[]): string {
    const part = presetCompanion(figure as NonNullable<typeof figure>, rig, SUB37)
    if (part === undefined) throw new Error('no companion')
    return renderToStaticMarkup(
      createElement(PresetCompanionView, {
        riff: uber,
        device: SUB37,
        offered,
        rig,
        part,
        selected: rig.map((d) => d.id),
        onToggle: () => undefined,
      }),
    )
  }

  it('does not offer the page’s own box, and says why', () => {
    const markup = view([])
    expect(markup).not.toContain(`value="${SUB37.id}"`)
    expect(markup).not.toContain(`-${SUB37.id}-sub`)
    expect(markup).toContain(`-${MICROFREAK.id}-sub`)
    expect(text(markup)).toContain(
      'The Moog Subsequent 37 is already playing the sub, so it is not offered here.',
    )
    expect(text(markup)).toContain(`0 of ${String(offered.length)} selected`)
  })

  it('says where the pad plays on the reader’s other boxes', () => {
    const pad = panel(view([MICROFREAK]), 'Where the pad plays')
    expect(pad).toContain('MicroFreak')
    expect(pad).not.toContain('Subsequent 37')
  })

  it('reports the `pad / soft` gap when no remaining box answers it', () => {
    expect(panel(view([]), 'Where the pad plays')).toContain('Pick the boxes you own.')
    const bassOnly = DEVICES.filter((d) => d.id !== SUB37.id).find(
      (d) => !d.recipes.some((r) => r.role === 'pad') && !d.voices.some((v) => v.roles.includes('pad')),
    )
    if (bassOnly === undefined) throw new Error('every box plays a pad')
    expect(panel(view([bassOnly]), 'Where the pad plays')).toContain('Add a box that plays pad.')
  })

  it('never places the pad on the page’s box, even when it is handed in', () => {
    const part = presetCompanion(figure, [SUB37], SUB37)
    expect(part?.outcome).toBe('gap')
  })
})
