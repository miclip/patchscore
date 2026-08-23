import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuideArea } from '../components/guide-area'
import { InspirationPicker } from '../components/inspiration-picker'
import {
  FORMAT_VERSION,
  INSPIRATION_CAP,
  NEUTRAL_MOOD,
  applyInspirations,
  decodeGuideInputs,
  encodeGuideInputs,
  guideInputsFrom,
  loadStudio,
  resolve,
  saveStudio,
  studioDoc,
  STUDIO_STORAGE_KEY,
} from '../lib/core/index'
import type {
  GuideInputsV1,
  Inspiration,
  InspirationApplication,
  StorageLike,
} from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { INSPIRATIONS, dancehall, reggae, shuffle } from '../lib/inspirations/index'
import { ambientDub, industrialTechno } from '../lib/templates/index'
import {
  CATALOGUE,
  DEFAULT_INPUTS,
  composeTemplate,
  inspirationsFor,
  withInspiration,
  withTemplate,
} from '../lib/studio/session'

/**
 * §5 wired end to end: the catalogue, the codec, the store, the pure selection helpers and the
 * two components that show the result.
 *
 * The rules being defended here are the ones that only exist once inspirations can be *chosen*
 * rather than composed in a test:
 *
 *  - a link and a stored studio are hand-editable, so the cap is enforced at both boundaries and
 *    not merely by a disabled checkbox
 *  - a refused pair renders **no guide**, rather than quietly falling back to the base template
 *  - the panel is never filtered by the chosen direction, because §5.1 means it cannot be
 *  - what a direction could not honour is on the page, not only in a return value
 *
 * Rendered in Node with no DOM, like every other component test here (`studio-render.test.ts`
 * explains why the suite has no jsdom). That is also why `GuideArea` is its own component: the
 * refusal path is reachable as a prop rather than only through an effect.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inputs(over: Partial<GuideInputsV1> = {}): GuideInputsV1 {
  return { ...DEFAULT_INPUTS, ...over }
}

function panel(selected: readonly string[], registry: readonly Inspiration[] = INSPIRATIONS) {
  const state = inputs({ inspirations: selected })
  return renderToStaticMarkup(
    createElement(InspirationPicker, {
      inspirations: registry,
      selected,
      onToggle: () => undefined,
      application: composeTemplate(state),
    }),
  )
}

/** The rendered text a reader actually sees, with the markup taken back out. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fakeStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key: string) {
      return key === STUDIO_STORAGE_KEY ? this.value : null
    },
    setItem(key: string, value: string) {
      if (key === STUDIO_STORAGE_KEY) this.value = value
    },
  } as StorageLike & { value: string | null }
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

describe('the build ships its inspirations (§5)', () => {
  it('lists every registered id, in registry order', () => {
    expect(CATALOGUE.inspirations).toEqual(INSPIRATIONS.map((i) => i.id))
    expect(CATALOGUE.inspirations.length).toBeGreaterThan(0)
  })

  it('lands on none selected, so the first frame is the plain direction', () => {
    expect(DEFAULT_INPUTS.inspirations).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

describe('selecting an inspiration is a pure update (§7.2)', () => {
  it('keeps registry order however the ticks arrive', () => {
    const clicked = withInspiration(withInspiration(inputs(), 'shuffle', true), 'reggae', true)
    expect(clicked.inspirations).toEqual(['reggae', 'shuffle'])
    // The other click order is the same selection, and therefore the same link.
    const other = withInspiration(withInspiration(inputs(), 'reggae', true), 'shuffle', true)
    expect(other.inspirations).toEqual(clicked.inspirations)
  })

  it('never mutates what it was given', () => {
    const before = inputs()
    const snapshot = JSON.stringify(before)
    const after = withInspiration(before, 'reggae', true)
    expect(JSON.stringify(before)).toBe(snapshot)
    expect(after).not.toBe(before)
    expect(after.inspirations).not.toBe(before.inspirations)
  })

  it('answers a third tick with a no-op rather than a truncation', () => {
    const two = withInspiration(withInspiration(inputs(), 'reggae', true), 'shuffle', true)
    const three = withInspiration(two, 'dancehall', true)
    // Identity, not merely equality: dropping whichever sorted last would answer a tick with a
    // different tick, and the caller could not tell it had happened.
    expect(three).toBe(two)
    expect(three.inspirations).toHaveLength(INSPIRATION_CAP)
  })

  it('always lets go, so nobody is stuck at the cap', () => {
    const two = withInspiration(withInspiration(inputs(), 'reggae', true), 'shuffle', true)
    expect(withInspiration(two, 'reggae', false).inspirations).toEqual(['shuffle'])
    // Unticking something that was never ticked changes nothing.
    expect(withInspiration(two, 'dancehall', false)).toBe(two)
  })

  it('keeps the selection when the direction changes (§5.1)', () => {
    // The influences name no template, so there is nothing about them that a change of genre
    // invalidates. Whatever the new direction has no room for is reported, not dropped.
    const chosen = withInspiration(inputs(), 'shuffle', true)
    const moved = withTemplate(chosen, 'ambient-dub')
    expect(moved.inspirations).toEqual(['shuffle'])

    const application = composeTemplate(moved)
    expect(application?.outcome).toBe('applied')
    if (application?.outcome !== 'applied') return
    expect(application.diagnostics.filter((d) => d.kind === 'no-such-target')).toHaveLength(4)
  })

  it('composes what it selected, and reports an unknown direction as no direction', () => {
    expect(inspirationsFor(inputs({ inspirations: ['shuffle', 'reggae'] }))).toEqual([
      reggae,
      shuffle,
    ])
    expect(composeTemplate(inputs({ templateId: 'no-such-genre' }))).toBeUndefined()
    const composed = composeTemplate(inputs({ inspirations: ['reggae'] }))
    expect(composed?.outcome).toBe('applied')
    if (composed?.outcome !== 'applied') return
    const direct = applyInspirations(industrialTechno, [reggae])
    if (direct.outcome !== 'applied') throw new Error('expected an application')
    expect(composed.template).toEqual(direct.template)
  })
})

// ---------------------------------------------------------------------------
// The permalink
// ---------------------------------------------------------------------------

describe('a link carries the selection (§8.2)', () => {
  it('round trips, canonically, whatever order it was built in', () => {
    const state = inputs({ inspirations: ['shuffle', 'reggae'] })
    const query = encodeGuideInputs(state, CATALOGUE)
    expect(query).toContain('inspiration=reggae&inspiration=shuffle')

    const decoded = decodeGuideInputs(query, CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.inputs.inspirations).toEqual(['reggae', 'shuffle'])
    // Encode-decode-encode is a fixed point, which is what stops one guide having two links.
    expect(encodeGuideInputs(decoded.inputs, CATALOGUE)).toBe(query)
  })

  it('writes nothing at all when nothing is selected', () => {
    expect(encodeGuideInputs(inputs(), CATALOGUE)).not.toContain('inspiration=')
  })

  it('refuses a hand-edited link that exceeds the cap', () => {
    const forged = encodeGuideInputs(
      inputs({ inspirations: ['reggae', 'shuffle'] }),
      CATALOGUE,
    ).replace('inspiration=reggae', 'inspiration=reggae&inspiration=dancehall')
    const decoded = decodeGuideInputs(forged, CATALOGUE)
    expect(decoded.ok).toBe(false)
    if (decoded.ok) return
    expect(decoded.reason).toBe('out-of-range')
    expect(decoded.detail).toContain(String(INSPIRATION_CAP))
  })

  it('still refuses an id this build does not ship, and a repeat', () => {
    const base = encodeGuideInputs(inputs(), CATALOGUE)
    expect(decodeGuideInputs(`${base}&inspiration=blue-monday`, CATALOGUE)).toMatchObject({
      ok: false,
      reason: 'unknown-id',
    })
    expect(
      decodeGuideInputs(`${base}&inspiration=reggae&inspiration=reggae`, CATALOGUE),
    ).toMatchObject({ ok: false, reason: 'malformed' })
  })

  it('carries a *conflicting* pair, because a refusal is a thing to show, not a broken link', () => {
    // §5.3 is a statement the reader should see. A link that would not open would replace it
    // with "this link is broken", which is a different and less true message.
    const state = inputs({ inspirations: ['dancehall', 'reggae'] })
    const decoded = decodeGuideInputs(encodeGuideInputs(state, CATALOGUE), CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.inputs.inspirations).toEqual(['dancehall', 'reggae'])
    expect(composeTemplate(decoded.inputs)?.outcome).toBe('refused')
  })
})

// ---------------------------------------------------------------------------
// The stored studio
// ---------------------------------------------------------------------------

describe('a stored studio carries the selection (§8.2, #16)', () => {
  it('survives the whole loop: save, load, back to inputs', () => {
    const state = inputs({ inspirations: ['reggae', 'shuffle'] })
    const storage = fakeStorage()
    expect(saveStudio(() => storage, studioDoc(state), CATALOGUE).status).toBe('ok')

    const loaded = loadStudio(() => storage, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.doc.inputs.inspirations).toEqual(['reggae', 'shuffle'])
    expect(guideInputsFrom(loaded.doc).inspirations).toEqual(['reggae', 'shuffle'])
  })

  it('treats a stored document over the cap as corruption, not as a selection', () => {
    const doc = studioDoc(inputs({ inspirations: ['reggae', 'shuffle'] }))
    const overCap = JSON.stringify({
      ...doc,
      inputs: { ...doc.inputs, inspirations: ['dancehall', 'reggae', 'shuffle'] },
    })
    const loaded = loadStudio(() => fakeStorage(overCap), CATALOGUE)
    expect(loaded.status).toBe('invalid')
    if (loaded.status !== 'invalid') return
    expect(loaded.detail).toContain('inspirations')
  })

  it('keeps the score inputs out of the rig, selection included (#16)', () => {
    const doc = studioDoc(inputs({ inspirations: ['reggae'] }))
    expect(doc.rig).not.toHaveProperty('inspirations')
    expect(doc.inputs.inspirations).toEqual(['reggae'])
  })
})

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

describe('the inspiration panel (§5)', () => {
  it('renders nothing at all when the registry is empty', () => {
    // Not an empty panel with a heading: a control for something this build does not have is a
    // promise it cannot keep.
    expect(panel([], [])).toBe('')
  })

  it('offers every influence against every direction, unfiltered (§5.1)', () => {
    // Shuffle cannot touch Ambient Dub's hats — it has none — and it is still on the list. What
    // it cannot do is said afterwards, which is information; missing from the list is not.
    const dub = renderToStaticMarkup(
      createElement(InspirationPicker, {
        inspirations: INSPIRATIONS,
        selected: [],
        onToggle: () => undefined,
        application: composeTemplate(inputs({ templateId: 'ambient-dub' })),
      }),
    )
    for (const inspiration of INSPIRATIONS) expect(dub).toContain(inspiration.name)
  })

  it('says how many of the cap are spent', () => {
    expect(text(panel([]))).toContain(`0 of ${String(INSPIRATION_CAP)} selected`)
    expect(text(panel(['reggae']))).toContain(`1 of ${String(INSPIRATION_CAP)} selected`)
    expect(text(panel(['reggae', 'shuffle']))).toContain('at the cap')
    expect(text(panel(['reggae']))).not.toContain('at the cap')
  })

  it('disables the unchosen at the cap, and never the chosen', () => {
    const full = panel(['reggae', 'shuffle'])
    // One row disabled: the third. The two selected stay clickable so a user can get out.
    expect((full.match(/disabled=""/g) ?? []).length).toBe(INSPIRATIONS.length - INSPIRATION_CAP)
    expect(full).toContain('pick-off')
    expect(panel(['reggae'])).not.toContain('disabled')
  })

  it('shows what each influence claims, so a collision is legible before it happens', () => {
    const rendered = text(panel([]))
    expect(rendered).toContain('replaces kick, bass-mid')
    expect(rendered).toContain('adds stab')
    expect(rendered).toContain('40 BPM')
  })

  it('shows the notes of what is selected, and only those', () => {
    const rendered = text(panel(['reggae']))
    for (const note of reggae.patch.notes ?? []) expect(rendered).toContain(note)
    for (const note of shuffle.patch.notes ?? []) expect(rendered).not.toContain(note)
  })

  it('shows what this direction could not honour (§5.4)', () => {
    // Shuffle on Ambient Dub: four bands of a hat that is not there, and a shaker the template
    // already programs. Every one of those is a no-op, and every one of them is on the page.
    const rendered = text(
      renderToStaticMarkup(
        createElement(InspirationPicker, {
          inspirations: INSPIRATIONS,
          selected: ['shuffle'],
          onToggle: () => undefined,
          application: composeTemplate(
            inputs({ templateId: 'ambient-dub', inspirations: ['shuffle'] }),
          ),
        }),
      ),
    )
    expect(rendered).toContain('Not applied here')
    expect(rendered).toContain('authors no closed-hat at band 0')
    expect(rendered).toContain('already authors its own ghost-perc')
  })

  it('states a refusal by name, and shows no notes behind it (§5.3)', () => {
    const rendered = text(panel(['dancehall', 'reggae']))
    expect(rendered).toContain('Dancehall and Reggae both claim kick at band 0')
    expect(rendered).toContain('they cannot be combined')
    for (const note of reggae.patch.notes ?? []) expect(rendered).not.toContain(note)
  })
})

// ---------------------------------------------------------------------------
// The guide area
// ---------------------------------------------------------------------------

describe('what a refusal does to the page (§5.3)', () => {
  const resolved = () => {
    const application = applyInspirations(industrialTechno, [reggae])
    if (application.outcome !== 'applied') throw new Error('fixture should apply')
    return {
      application,
      result: resolve({
        devices: DEVICES,
        template: application.template,
        mood: NEUTRAL_MOOD,
        seed: 1,
      }),
    }
  }

  function area(application: InspirationApplication | undefined, result: ReturnType<typeof resolve> | undefined) {
    return renderToStaticMarkup(createElement(GuideArea, { application, result, seed: 1 }))
  }

  it('renders the rack and the guide when the selection composes', () => {
    const { application, result } = resolved()
    const html = area(application, result)
    expect(html).toContain('rack-section')
    expect(html).toContain('guide-panel')
  })

  it('renders no rack and no guide when the pair is refused, and says which pair', () => {
    const refused = applyInspirations(industrialTechno, [reggae, dancehall])
    expect(refused.outcome).toBe('refused')
    const html = area(refused, undefined)

    expect(html).not.toContain('rack-section')
    expect(html).not.toContain('guide-panel')
    expect(text(html)).toContain('Dancehall and Reggae')
    expect(text(html)).toContain('comes straight back')
  })

  it('never falls back to the base template when refused', () => {
    // The failure this guards against is the quiet one: a full, plausible guide on the page,
    // resolved from a template the selection above says is not what is playing.
    const refused = applyInspirations(industrialTechno, [reggae, dancehall])
    const { result } = resolved()
    // Even handed a perfectly good result, the refusal wins — there is no path that renders a
    // guide beside a refusal.
    const html = area(refused, result)
    expect(html).not.toContain('guide-panel')
    expect(html).not.toContain(String(industrialTechno.bpm.default))
  })

  it('still says "no template selected" when that is what happened', () => {
    // The two empty states are different, and telling them apart is the point of the sentence.
    const html = area(undefined, undefined)
    expect(text(html)).toContain('No template selected')
    expect(text(html)).not.toContain('cannot be combined')
  })
})

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

describe('a selection survives the whole loop (§8.2)', () => {
  it('link -> inputs -> composition -> guide, with the influence actually in it', () => {
    const state = inputs({ inspirations: ['reggae'] })
    const decoded = decodeGuideInputs(encodeGuideInputs(state, CATALOGUE), CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return

    const application = composeTemplate(decoded.inputs)
    expect(application?.outcome).toBe('applied')
    if (application?.outcome !== 'applied') return

    // The tempo moved and the kick is reggae's, which is what the link promised.
    expect(application.template.bpm.default).toBe(industrialTechno.bpm.default - 40)
    const result = resolve({
      devices: DEVICES,
      template: application.template,
      mood: decoded.inputs.mood,
      seed: decoded.inputs.seed,
    })
    expect(result.song.bpm).toBe(application.template.bpm.default)
    expect(result.gaps).toEqual([])
  })

  it('reapplies against a different direction without being reselected', () => {
    const state = withTemplate(inputs({ inspirations: ['reggae'] }), ambientDub.id)
    const application = composeTemplate(state)
    if (application?.outcome !== 'applied') throw new Error('expected an application')
    expect(application.template.bpm.default).toBe(ambientDub.bpm.default - 40)
    expect(application.template.patterns.some((p) => p.id.startsWith('reggae-kick-'))).toBe(true)
  })
})
