import { createElement, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { moodState, resolve } from '../lib/core/index'
import type { Device, DeviceId, RequestId } from '../lib/core/index'
import { box, makeRecipe, request, withRoles } from './rigs'
import { placementRow, placementSummary } from '../components/placement-controls'
import { PlacementControl, PlacementOffer } from '../components/guide/placement-control'
import { PhaseVoices } from '../components/guide/phase-voices'
import { GuideArea } from '../components/guide-area'
import { Studio } from '../components/studio'
import { DEFAULT_INPUTS, withPlacement } from '../lib/studio/session'

/**
 * §7.5/#340 phase 2. **The control that lets a reader move a part, without hand-editing a URL.**
 *
 * Phase 1 made a placement an input the resolver honours and a permalink carries. What it left
 * was a feature reachable only by typing into the address bar. This is the other half, and what
 * is worth asserting about it is not that a button exists but that the control cannot lie:
 *
 *  - it offers exactly the boxes `lib/core` says could take the part, by name
 *  - a box that could not is *shown, inert, and says why* — §7.5 argues that "why is my box not
 *    on the list" deserves an answer rather than a shrug (#329/#334)
 *  - what it says is the current choice comes from `result.placements`, so a refused placement
 *    reads as refused rather than as one nobody made
 *  - and the callback it fires is the one that reaches `withPlacement`
 *
 * Rendered in Node with no jsdom, like every other component test here. A static render shows
 * what a reader is handed and never what happens after a click — but `PlacementOffer` takes no
 * hooks, so it is an ordinary function returning an element tree, and the handlers it actually
 * builds can be pulled out of that tree and called. That is the real seam, not a stand-in for
 * it: the assertions below fire the same `onClick` a finger fires.
 */

/** Every `<button>` in a rendered tree, in document order. */
function buttonsIn(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => buttonsIn(child as ReactNode))
  if (!isValidElement(node)) return []
  const props = node.props as { children?: ReactNode }
  return [
    ...(node.type === 'button' ? [node] : []),
    ...buttonsIn(props.children),
  ]
}

/** The offer's buttons as `(label, click, disabled)`, without a DOM anywhere. */
function offerButtons(
  result: ReturnType<typeof resolve>,
  onPlacement: (requestId: RequestId, deviceId: DeviceId | undefined) => void,
) {
  const tree = PlacementOffer({
    row: placementRow(result, KICK, deviceById),
    role: 'kick',
    onPlacement,
  })
  return buttonsIn(tree).map((button) => {
    const props = button.props as {
      children?: ReactNode
      onClick?: () => void
      disabled?: boolean
    }
    return {
      label: String(props.children),
      click: props.onClick,
      disabled: props.disabled === true,
    }
  })
}

/** Two boxes that can play the kick, and one that cannot, so the offer has both kinds in it. */
function twin(id: string, name: string): Device {
  return box(id, {
    name,
    voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['kick', 'snare'], polyphony: 1 }],
    recipes: [
      makeRecipe(`${id}-kick`, 'kick', 'hard', 'v'),
      makeRecipe(`${id}-snare`, 'snare', 'hard', 'v'),
    ],
  })
}

const alpha = twin('alpha', 'Alpha')
const beta = twin('beta', 'Beta')
const spare = box('spare', {
  name: 'Spare',
  voices: [{ kind: 'fixed', id: 'v', label: 'V', roles: ['snare'], polyphony: 1 }],
  recipes: [makeRecipe('spare-snare', 'snare', 'hard', 'v')],
})

const devices = [alpha, beta, spare]
const deviceById = new Map(devices.map((d) => [d.id, d]))
const kickOnly = withRoles([request({ id: 'r-kick', role: 'kick' })])
const KICK = 'r-kick' as RequestId

function guide(placements?: { requestId: string; deviceId: string }[]) {
  return resolve({
    devices,
    template: kickOnly,
    mood: moodState(),
    seed: 1,
    ...(placements === undefined
      ? {}
      : { overrides: { placements: placements as { requestId: RequestId; deviceId: DeviceId }[] } }),
  })
}

const automatic = guide()
const accepted = guide([{ requestId: 'r-kick', deviceId: 'beta' }])
const refused = guide([{ requestId: 'r-kick', deviceId: 'spare' }])

/** The sentence `lib/core` already computes for a box that cannot make this part. */
const SPARE_CANNOT = 'your Spare has no voice that plays kick'

/** Markup back to prose, so an assertion reads as the sentence the reader sees. */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')

const offer = (result: ReturnType<typeof resolve>) =>
  renderToStaticMarkup(
    createElement(PlacementOffer, {
      row: placementRow(result, KICK, deviceById),
      role: 'kick',
      onPlacement: () => undefined,
    }),
  )

describe('what the control offers (§7.5/#340 phase 2)', () => {
  it('offers every box in the rig, and says which of them could take the part', () => {
    // Straight from `result.options`, which is computed with no placement applied — so placing
    // one part never quietly shortens the menu offered for the next.
    const row = placementRow(automatic, KICK, deviceById)
    expect(row.choices.map((c) => [c.deviceId, c.canServe])).toEqual([
      ['alpha', true],
      ['beta', true],
      ['spare', false],
    ])
    expect(row.choices[2]?.why).toBe(SPARE_CANNOT)
  })

  it('names the boxes rather than identifying them', () => {
    // A reader owns an Alpha, not an `alpha`. Ids are the resolver's business and appear nowhere
    // a reader looks.
    const html = offer(automatic)
    expect(plain(html)).toContain('Alpha')
    expect(plain(html)).toContain('Beta')
    expect(plain(html)).toContain('Spare')
    expect(plain(html)).not.toContain('alpha')
    expect(plain(html)).not.toContain('beta')
  })

  it('makes only the boxes that could take it selectable', () => {
    const html = offer(automatic)
    // One disabled control, and it is the one box that cannot make a kick.
    expect(html.match(/<button[^>]*disabled/g)?.length).toBe(1)
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Spare</)
  })

  /**
   * §7.5/#340. **A box that cannot take the part is dimmed and says nothing more.**
   *
   * The reason used to print beside it — "nobody has written a dirty closed-hat for your Tracker
   * Mini yet". That is a sentence about our authoring backlog wearing the clothes of information
   * about the reader's rig, and it is the same thing the guide's "Waiting on us" block was doing
   * before it was removed for the same reason: somebody standing at a rack cannot act on what
   * nobody has written, and a dimmed control already says this one is unavailable.
   *
   * Still no `title`: a tooltip would put anything we did say behind a hover that touch does not
   * have (#21). If the reason comes back it needs an affordance, not an attribute.
   *
   * **A placement the reader asked for and did not get is still reported** — they made a choice
   * and the guide did something else, which they have to be told. That is the refused-placement
   * test below, and it is the line this removal does not cross: an option nobody chose is owed
   * no explanation; a choice that was overridden is.
   */
  it('says nothing more on the page, and puts the reason in a tooltip', () => {
    const html = offer(automatic)
    // Not printed beside the pill any more.
    expect(plain(html)).not.toContain(SPARE_CANNOT)
    expect(html).not.toContain('placement-why')
    // But available to a pointer, as an addition to the dimming rather than instead of it.
    expect(html).toContain(`title="${SPARE_CANNOT}"`)
  })

  /**
   * A `disabled` control does not reliably fire the pointer events a native tooltip needs, so the
   * `title` has to sit on something that does. Pinned because it looks like a pointless wrapper
   * and reads as one right up until somebody flattens it and the tooltip silently stops.
   */
  it('hangs the tooltip on the wrapper, not on the disabled button', () => {
    const html = offer(automatic)
    expect(html).toMatch(/<span[^>]*placement-unavailable[^>]*title=/)
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*title=/)
  })


  it('always offers Automatic, so a placement can be undone from where it was made', () => {
    const html = offer(accepted)
    expect(plain(html)).toContain('Automatic')
    // Not pressed, because this part is placed. The pressed one is the box that took it.
    expect(html).toContain('class="placement-option placement-automatic" aria-pressed="false"')
  })
})

describe('what the control says is the current choice', () => {
  it('reads Automatic where the reader placed nothing', () => {
    const row = placementRow(automatic, KICK, deviceById)
    expect(row.current).toEqual({ kind: 'automatic' })
    expect(placementSummary(row.current)).toBe('Automatic')
    // Automatic is the pressed option, and the box the ranking picked is *not* — it is a
    // derived answer, and showing it as pressed would read as a choice somebody made.
    expect(offer(automatic)).toContain(
      'class="placement-option placement-automatic" aria-pressed="true"',
    )
  })

  it('names the box an accepted placement went to, and presses it', () => {
    const row = placementRow(accepted, KICK, deviceById)
    expect(row.current).toEqual({ kind: 'placed', deviceId: 'beta', name: 'Beta' })
    expect(placementSummary(row.current)).toBe('You chose Beta')
    expect(offer(accepted)).toContain('aria-pressed="true">Beta</button>')
  })

  it('shows a refused placement as refused, with the reason, without opening anything', () => {
    // The one state a control must not flatten. The reader asked for a box, the guide did not
    // use it, and a plain "Automatic" here would discard a choice they can still see in their
    // own link.
    const row = placementRow(refused, KICK, deviceById)
    expect(row.current).toEqual({
      kind: 'refused',
      deviceId: 'spare',
      name: 'Spare',
      why: SPARE_CANNOT,
    })
    expect(placementSummary(row.current)).toBe('Spare could not take it')

    const collapsed = renderToStaticMarkup(
      createElement(PlacementControl, {
        row,
        role: 'kick',
        onPlacement: () => undefined,
      }),
    )
    expect(plain(collapsed).replace(/\s+/g, ' ')).toContain('Box · Spare could not take it')
    expect(plain(collapsed)).toContain(SPARE_CANNOT)
    // Still collapsed: the reason is on screen, the menu is not.
    expect(collapsed).toContain('aria-expanded="false"')
    expect(collapsed).not.toContain('placement-options')
  })
})

describe('the control says what it is, not only what it says', () => {
  /** The toggle's own words, with the markup taken out. */
  const toggleText = (result: ReturnType<typeof resolve>) =>
    plain(
      renderToStaticMarkup(
        createElement(PlacementControl, {
          row: placementRow(result, KICK, deviceById),
          role: 'kick',
          onPlacement: () => undefined,
        }),
      ),
    )
      .replace(/\s+/g, ' ')
      .trim()

  it('prefixes every state, so an open menu never stacks two identical words', () => {
    // The defect this fixes was invisible to markup and obvious in a screenshot: the collapsed
    // pill read "Automatic" and, opened, sat directly above a *choice* reading "Automatic".
    expect(toggleText(automatic)).toBe('Box · Automatic')
    expect(toggleText(accepted)).toBe('Box · You chose Beta')
    expect(toggleText(refused)).toContain('Box · Spare could not take it')
  })

  it('keeps the announced label a sentence, and does not read the prefix twice', () => {
    // The prefix is `aria-hidden`: the label already names the part and the state, and "Box"
    // spoken before it adds nothing to a reader who cannot see the pill.
    const html = renderToStaticMarkup(
      createElement(PlacementControl, {
        row: placementRow(accepted, KICK, deviceById),
        role: 'kick',
        onPlacement: () => undefined,
      }),
    )
    expect(html).toContain('aria-label="Which box plays kick: You chose Beta"')
    expect(html).toContain('aria-hidden="true"')
  })
})

describe('what a click does', () => {
  /** What the control asked for, in call order. */
  function spy() {
    const calls: [RequestId, DeviceId | undefined][] = []
    return {
      calls,
      onPlacement: (requestId: RequestId, deviceId: DeviceId | undefined) => {
        calls.push([requestId, deviceId])
      },
    }
  }

  it('asks for the box whose button was pressed', () => {
    const heard = spy()
    const beta = offerButtons(automatic, heard.onPlacement).find((b) => b.label === 'Beta')
    beta?.click?.()
    expect(heard.calls).toEqual([['r-kick', 'beta']])
  })

  it('clears through Automatic, naming no box at all', () => {
    // `undefined` and not a sentinel: it is what `withPlacement` takes to hand the part back to
    // §7.1, and there is nothing in between for a spelling to go wrong in.
    const heard = spy()
    const auto = offerButtons(accepted, heard.onPlacement).find((b) => b.label === 'Automatic')
    auto?.click?.()
    expect(heard.calls).toEqual([['r-kick', undefined]])
  })

  it('gives an unavailable box no handler to fire', () => {
    const heard = spy()
    const spareButton = offerButtons(automatic, heard.onPlacement).find((b) => b.label === 'Spare')
    expect(spareButton?.disabled).toBe(true)
    expect(spareButton?.click).toBeUndefined()
    spareButton?.click?.()
    expect(heard.calls).toEqual([])
  })

  it('reaches the inputs, set and cleared', () => {
    // The other end of the same seam: what the handler passes is what the permalink carries.
    const heard = spy()
    const offered = offerButtons(automatic, heard.onPlacement)
    offered.find((b) => b.label === 'Beta')?.click?.()
    const set = withPlacement(DEFAULT_INPUTS, ...(heard.calls[0] as [RequestId, DeviceId]))
    expect(set.placements).toEqual([{ requestId: 'r-kick', deviceId: 'beta' }])

    offered.find((b) => b.label === 'Automatic')?.click?.()
    const cleared = withPlacement(set, ...(heard.calls[1] as [RequestId, undefined]))
    expect('placements' in cleared).toBe(false)
  })
})

describe('where the control is drawn, and where it is not', () => {
  it('sits on the part row, collapsed, when a session is behind it', () => {
    const html = renderToStaticMarkup(
      createElement(PhaseVoices, { result: automatic, deviceById, onPlacement: () => undefined }),
    )
    expect(html).toContain('placement-toggle')
    // A ten-box rig and a twelve-part direction is a hundred and twenty buttons. Closed until
    // asked for, and the open state is local to the component — it changes no byte of the guide.
    expect(html).not.toContain('placement-options')
  })

  it('is absent entirely for a caller with no session behind it', () => {
    // The device pages and the fixtures render a guide nothing can carry a choice for. Nothing
    // drawn is better than something drawn and inert.
    const html = renderToStaticMarkup(createElement(PhaseVoices, { result: automatic, deviceById }))
    expect(html).not.toContain('placement')
  })

  it('is reached through GuideArea, so the studio wiring is the thing under test', () => {
    const props = { application: undefined, result: automatic, seed: 1, onClockSource: () => {} }
    const wired = renderToStaticMarkup(
      createElement(GuideArea, { ...props, onPlacement: () => undefined }),
    )
    expect(wired).toContain('placement-toggle')
    expect(renderToStaticMarkup(createElement(GuideArea, props))).not.toContain('placement-toggle')
  })

  it('is on the studio’s first frame, which is the whole path end to end', () => {
    // `Studio` owns the inputs and is the only caller that can carry a placement into a link.
    const html = renderToStaticMarkup(createElement(Studio, { initialInputs: DEFAULT_INPUTS }))
    expect(html).toContain('placement-toggle')
  })
})

describe('read at the machine (#21)', () => {
  it('gives every target 44px and scopes touch-action to the control itself', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const start = css.indexOf('\n.placement-toggle,\n.placement-option {')
    expect(start, 'the control has no rule at all').toBeGreaterThan(-1)
    const rule = css.slice(start, css.indexOf('}', start))
    expect(rule).toContain('min-height: 44px')
    // The knob's rule, applied here: on the control and nothing wider, or the page stops
    // scrolling past it — which on a phone is the whole page.
    expect(rule).toContain('touch-action')
    for (const wider of ['\n.placement {', '\n.placement-options {']) {
      const at = css.indexOf(wider)
      expect(at, `${wider} is missing entirely`).toBeGreaterThan(-1)
      expect(css.slice(at, css.indexOf('}', at))).not.toContain('touch-action')
    }
  })
})
