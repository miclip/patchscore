import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { Studio } from '../components/studio'
import { INSPIRATION_CAP, encodeGuideInputs, resolve, renderGuide } from '../lib/core/index'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import { DEVICES } from '../lib/devices/registry.generated'
import { INSPIRATIONS } from '../lib/inspirations/index'
import { templateById } from '../lib/templates/index'

/**
 * #12. The hydration contract: the server's markup and the client's first markup are the same
 * bytes, because both are a pure function of `DEFAULT_INPUTS`. The link and the store only get a
 * say in an effect, which is after the first frame by definition.
 *
 * This runs in Node with no DOM, which is not a limitation here — it is the instrument. There is
 * no `window` in this environment, so a component that read `location` or `localStorage` during
 * render would **throw in this file** rather than produce a hydration mismatch that shows up as
 * a console warning nobody reads. The hostile-global test below closes the other half: a
 * `window` that *does* exist, and is not allowed to be touched.
 */

const KEPT = Object.getOwnPropertyDescriptor(globalThis, 'window')

afterEach(() => {
  if (KEPT === undefined) delete (globalThis as { window?: unknown }).window
  else Object.defineProperty(globalThis, 'window', KEPT)
})

function firstFrame(): string {
  return renderToStaticMarkup(createElement(Studio))
}

describe('the first frame', () => {
  it('renders in an environment with no browser at all', () => {
    // Node: `window` is genuinely absent. Reaching for it during render throws here.
    expect('window' in globalThis).toBe(false)
    expect(() => firstFrame()).not.toThrow()
  })

  it('is byte-identical across renders', () => {
    expect(firstFrame()).toBe(firstFrame())
  })

  it('is the guide the deterministic default resolves to', () => {
    const template = templateById(DEFAULT_INPUTS.templateId)
    expect(template).toBeDefined()
    if (template === undefined) return

    const expected = resolve({
      devices: DEVICES.filter((d) => DEFAULT_INPUTS.devices.includes(d.id)),
      template,
      mood: DEFAULT_INPUTS.mood,
      seed: DEFAULT_INPUTS.seed,
    })

    const markup = firstFrame()
    // Not a snapshot of the markup — that is restyled constantly (see guide-view.test.ts). The
    // claim is that the first frame is *this* guide: its key and its bpm are in the page.
    expect(markup).toContain(String(expected.song.bpm))
    expect(renderGuide(expected).length).toBeGreaterThan(0)
  })

  it('shows no notices, because nothing has been read yet', () => {
    expect(firstFrame()).not.toContain('notices')
  })

  it('offers the copy control before anything has been bootstrapped', () => {
    expect(firstFrame()).toContain('Copy link')
  })

  it('offers the inspirations this build actually ships (§5)', () => {
    // The panel was a placeholder reading "Not built yet" until step 7 landed. It is now real,
    // and it is rendered from the registry — so this fails if the wiring is ever unhooked.
    const markup = firstFrame()
    expect(markup).toContain('Inspirations')
    expect(markup).not.toContain('Not built yet')
    for (const inspiration of INSPIRATIONS) expect(markup).toContain(inspiration.name)
    // Nothing selected by default, so the first frame is the plain direction: no notes, no
    // refusal, and the guide is on the page.
    expect(markup).toContain(`0 of ${String(INSPIRATION_CAP)} selected`)
    expect(markup).toContain('guide-panel')
  })
})

describe('the first frame does not read the browser even when there is one', () => {
  /**
   * A `window` that records every access. The server render must not touch any of it: if the
   * first frame consulted the URL or the store, two people opening two different links would get
   * two different server renders of a page that is supposed to have exactly one.
   */
  function watchfulWindow() {
    const touched: string[] = []
    const trap = (name: string) => ({
      get() {
        touched.push(name)
        return undefined
      },
      configurable: true,
    })

    const fake = {}
    Object.defineProperty(fake, 'location', trap('location'))
    Object.defineProperty(fake, 'localStorage', trap('localStorage'))
    Object.defineProperty(fake, 'history', trap('history'))
    Object.defineProperty(globalThis, 'window', { value: fake, configurable: true, writable: true })
    return touched
  }

  it('touches neither the URL nor the store nor history', () => {
    const touched = watchfulWindow()
    const markup = firstFrame()
    expect(touched).toEqual([])
    expect(markup.length).toBeGreaterThan(0)
  })

  it('renders the same bytes with a browser present as without one', () => {
    const withoutBrowser = firstFrame()
    watchfulWindow()
    expect(firstFrame()).toBe(withoutBrowser)
  })

  it('renders the same bytes whatever the URL says', () => {
    const plain = firstFrame()

    // A location carrying a perfectly good permalink for a *different* guide. The first frame
    // must ignore it; the effect that honours it has not run yet.
    const other = encodeGuideInputs({ ...DEFAULT_INPUTS, seed: 999999 }, CATALOGUE)
    Object.defineProperty(globalThis, 'window', {
      value: { location: { search: `?${other}`, pathname: '/', href: `https://x/?${other}` } },
      configurable: true,
      writable: true,
    })

    expect(firstFrame()).toBe(plain)
  })
})
