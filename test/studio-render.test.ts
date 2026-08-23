import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { Studio } from '../components/studio'
import { INSPIRATION_CAP, encodeGuideInputs, resolve, renderGuide } from '../lib/core/index'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import { StarterNote } from '../components/starter-note'
import { readFileSync } from 'node:fs'
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

// ---------------------------------------------------------------------------
// The starter example (#61)
// ---------------------------------------------------------------------------

describe('the starter example is a label, not an assumption (#61)', () => {
  it('is absent from the first frame, for everyone', () => {
    // The label has to wait for the bootstrap. On this frame the studio does not yet know
    // whether these inputs are a cold start, a saved rig or somebody's shared link — and
    // telling a returning visitor that their own rig is a demo is exactly the wrong way round.
    // It costs a frame and buys never being wrong about whose rig is on screen.
    const markup = firstFrame()
    expect(markup).not.toContain('starter-note')
    expect(markup).not.toContain('A starter example')
    // The rig itself *is* on that frame, though: the point is the demonstration, not silence.
    expect(markup).toContain('Devices')
    expect(markup).toContain('guide-panel')
  })

  it('says it is an example and names the boxes it chose', () => {
    const markup = renderToStaticMarkup(
      createElement(StarterNote, { devices: DEFAULT_INPUTS.devices }),
    )
    expect(markup).toContain('A starter example, not your rig')
    // It invites the edit rather than merely disclaiming: #61's whole objection is that the
    // landing rig reads as an assumption about the visitor. Both controls are named, because
    // the direction is as much a default as the devices are.
    expect(markup).toContain('Edit the devices and direction')

    // The boxes are named from the ids, so the sentence cannot drift from the selection.
    for (const id of DEFAULT_INPUTS.devices) {
      const device = DEVICES.find((d) => d.id === id)
      if (device === undefined) throw new Error(`the landing rig names ${id}, which is not built`)
      expect(markup).toContain(`${device.maker} ${device.name}`)
    }
    // And only those: a box the default did not pick is not mentioned.
    for (const device of DEVICES) {
      if (DEFAULT_INPUTS.devices.includes(device.id)) continue
      expect(markup).not.toContain(device.name)
    }
  })

  it('reads sensibly whatever it is handed', () => {
    // Not decoration: the note renders from live selection, so the list has to survive one box
    // and none rather than emitting a dangling conjunction or an empty gap.
    const listIn = (devices: readonly string[]) => {
      const markup = renderToStaticMarkup(createElement(StarterNote, { devices }))
      const opener = 'rig</strong> — '
      const from = markup.indexOf(opener) + opener.length
      const to = markup.indexOf('. Edit the devices')
      expect(to).toBeGreaterThan(from)
      return markup.slice(from, to)
    }

    expect(listIn(DEFAULT_INPUTS.devices)).toContain(' and ')
    // And it stays one compact line: no explanatory sentences behind the instruction.
    expect(renderToStaticMarkup(createElement(StarterNote, { devices: DEFAULT_INPUTS.devices })))
      .not.toContain('browser')
    expect(listIn([DEFAULT_INPUTS.devices[0] as string])).not.toContain(' and ')
    expect(listIn([DEFAULT_INPUTS.devices[0] as string])).not.toContain(',')
    expect(listIn([])).toBe('no devices')
  })

  it('actually demonstrates the product on that first frame', () => {
    // The reason there is a landing rig at all. If this ever stops being true the default has
    // become decoration: parts on both boxes, a clock source with something to sync to it, and
    // gaps that are shown rather than filled in (invariant 5).
    const template = templateById(DEFAULT_INPUTS.templateId)
    if (template === undefined) throw new Error('the landing direction is not authored')
    const devices = DEVICES.filter((d) => DEFAULT_INPUTS.devices.includes(d.id))
    const result = resolve({
      devices,
      template,
      mood: DEFAULT_INPUTS.mood,
      seed: DEFAULT_INPUTS.seed,
    })

    for (const device of devices) {
      expect(
        result.assignments.some((a) => a.deviceId === device.id),
        `${device.id} carries no part`,
      ).toBe(true)
    }
    expect(result.clockSource).toBeDefined()
    expect(result.assignments.length).toBeGreaterThan(template.roles.length / 2)
    expect(result.gaps.length).toBeGreaterThan(0)
  })

  it('is dismissed by a device or a direction edit, and by nothing else', () => {
    /**
     * Read as source, on purpose. Vitest runs in Node with no DOM (`vitest.config.ts`), which is
     * the instrument for everything else in this file and the one thing it cannot do is click a
     * checkbox. The policy itself is pure and tested in `studio-session.test.ts`; what is left
     * is the wiring, and this is what catches a handler that forgets it — including a new one
     * added later that should have claimed ownership and does not.
     */
    const source = readFileSync(new URL('../components/studio.tsx', import.meta.url), 'utf8')
    const bodyOf = (name: string) => {
      const at = source.indexOf(`function ${name}(`)
      if (at === -1) throw new Error(`no handler called ${name}`)
      const open = source.indexOf('{', at)
      const close = source.indexOf('\n  }', open)
      return source.slice(open, close)
    }

    // Changing a box or the direction is the visitor answering the question the note asks.
    for (const handler of ['toggleDevice', 'selectTemplate']) {
      expect(bodyOf(handler), handler).toContain('claimAsOwn()')
    }
    // Rerolling or leaning the mood is still looking at the example.
    for (const handler of ['setSeed', 'setAxis', 'toggleInspiration']) {
      expect(bodyOf(handler), handler).not.toContain('claimAsOwn()')
    }
  })
})
