import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SongPanel } from '../components/song-panel'
import type { SongPanelProps } from '../components/song-panel'
import {
  OTHER_KEY,
  commitKey,
  commitTempo,
  keyControl,
  keyOptions,
  tempoDraggable,
} from '../components/song-controls'
import { BPM_MAX, BPM_MIN, MIN_EFFECTIVE_BPM, applyInspirations } from '../lib/core/index'
import { reggae, shuffle } from '../lib/inspirations/index'
import { droneStudy, industrialTechno } from '../lib/templates/index'

/**
 * #161's Song panel: seed, key and tempo, in the panel §8's phase 1 is named after.
 *
 * The rules worth testing are about **which affordance is on screen**, and they are pure —
 * `components/song-controls.ts`, the same split `knob-math.ts` makes so a rule can be checked
 * without a DOM. The markup assertions below are the other half: that the rules actually reach
 * the panel, rather than being decided correctly in a file nothing renders.
 *
 * Rendered in Node with no jsdom, like every other component test here. That bounds what these
 * can claim: a static render shows what a reader is handed, never what happens after a click.
 * The commit rules a click would exercise are covered as functions instead, which is the whole
 * reason they are functions.
 */

const REAL_KEYS = industrialTechno.keys
const REAL_RANGE = industrialTechno.bpm

function props(over: Partial<SongPanelProps> = {}): SongPanelProps {
  return {
    seed: 7,
    onSeed: () => undefined,
    range: REAL_RANGE,
    keys: REAL_KEYS,
    bpm: undefined,
    songKey: undefined,
    resolved: { bpm: REAL_RANGE.default, key: REAL_KEYS[0] },
    onBpm: () => undefined,
    onKey: () => undefined,
    ...over,
  }
}

function panel(over: Partial<SongPanelProps> = {}): string {
  return renderToStaticMarkup(createElement(SongPanel, props(over)))
}

/** The rendered text a reader sees, with the markup and React's entities taken back out. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim()
}

// ---------------------------------------------------------------------------
// The rules, as functions
// ---------------------------------------------------------------------------

describe('when a tempo slider can be shown (#161)', () => {
  it('shows one for a range with room and a value inside it', () => {
    expect(tempoDraggable(REAL_RANGE, REAL_RANGE.default)).toBe(true)
    expect(tempoDraggable(REAL_RANGE, REAL_RANGE.min)).toBe(true)
    expect(tempoDraggable(REAL_RANGE, REAL_RANGE.max)).toBe(true)
  })

  it('shows none for a value the slider could not point at', () => {
    // §5.6 makes outside the range legal. A slider there would either sit at an end that is not
    // where the value is, or snap the value back inside on first touch.
    expect(tempoDraggable(REAL_RANGE, REAL_RANGE.min - 1)).toBe(false)
    expect(tempoDraggable(REAL_RANGE, REAL_RANGE.max + 1)).toBe(false)
  })

  it('reads the effective range, which inspirations have already moved', () => {
    // Drone Study under Reggae and Shuffle: the composed shift takes the bottom of the range
    // below `MIN_EFFECTIVE_BPM`, so §5 holds it at the floor. There is still room to move, so
    // there is still a slider — and it is the *composed* range it moves within, not 60–84.
    const composed = applyInspirations(droneStudy, [reggae, shuffle])
    expect(composed.outcome).toBe('applied')
    if (composed.outcome !== 'applied') return
    const shifted = composed.template.bpm
    expect(shifted.min).toBe(MIN_EFFECTIVE_BPM)
    expect(shifted.min).toBeLessThan(droneStudy.bpm.min)

    expect(tempoDraggable(shifted, shifted.default)).toBe(true)
    // A tempo the base direction would have called ordinary is now outside, and loses the
    // slider — which is the point of reading the effective range rather than the authored one.
    expect(tempoDraggable(shifted, droneStudy.bpm.default)).toBe(false)
  })

  it('shows none for a degenerate range, where nothing can move', () => {
    // §5 clamps min, max and default together, so a large enough composed shift leaves nothing
    // to drag within. No pair this build ships reaches it — the deepest composable shift on
    // Drone Study is Reggae and Shuffle above, and Reggae and Dancehall (#161's worked example)
    // is refused as a conflicting pair (§5.3) rather than composed — so the case is constructed
    // here rather than dropped: the clamp is what produces it and the clamp is still there.
    const clamped = { min: MIN_EFFECTIVE_BPM, max: MIN_EFFECTIVE_BPM, default: MIN_EFFECTIVE_BPM }
    expect(tempoDraggable(clamped, clamped.default)).toBe(false)

    // And the typed field is still the control, so the panel is not left with nothing.
    const html = panel({ range: clamped, resolved: { bpm: clamped.default, key: REAL_KEYS[0] } })
    expect(html).not.toContain('type="range"')
    expect(html).toContain('type="number"')
  })

  it('shows none where there is no direction at all', () => {
    expect(tempoDraggable(undefined, 134)).toBe(false)
    expect(tempoDraggable(REAL_RANGE, undefined)).toBe(false)
  })
})

describe('what the key control offers (#161)', () => {
  it("lists the direction's keys when there is more than one", () => {
    expect(keyControl(REAL_KEYS, false, undefined)).toBe('list')
    expect(keyOptions(REAL_KEYS, REAL_KEYS[0])).toEqual([...REAL_KEYS])
  })

  it('drops the select for a direction authoring one key', () => {
    // A menu with one item is a control that cannot do anything. The typed field takes over,
    // which is `Other…` still reachable rather than `Other…` removed.
    expect(keyControl(['F minor'], false, undefined)).toBe('typed')
    expect(keyControl([], false, undefined)).toBe('typed')
  })

  it('drops the select while a key is being typed, and not otherwise', () => {
    expect(keyControl(REAL_KEYS, true, undefined)).toBe('typed')
  })

  it('drops the select for a stored key the engine cannot read', () => {
    // The guide resolved in the direction's own key, so a selected option would name a key the
    // guide is not in — and would hide the text the reader has to see to fix it.
    expect(keyControl(REAL_KEYS, false, 'H minor')).toBe('typed')
    // A key the direction does not offer is a different case: it *is* what resolved.
    expect(keyControl(REAL_KEYS, false, 'C# dorian')).toBe('list')
  })

  it('keeps a key the direction does not offer visible as the selection it is', () => {
    // Reachable from any link (§5.6). Dropping it would leave the select pointing at a key the
    // guide is not in.
    expect(keyOptions(REAL_KEYS, 'C# dorian')).toEqual(['C# dorian', ...REAL_KEYS])
  })
})

describe('what a typed value commits (#161)', () => {
  it('takes a whole tempo inside the typo guard', () => {
    expect(commitTempo('70')).toBe(70)
    expect(commitTempo(String(BPM_MIN))).toBe(BPM_MIN)
    expect(commitTempo(String(BPM_MAX))).toBe(BPM_MAX)
  })

  it('commits nothing rather than clamping, so no keypress lands on a number nobody typed', () => {
    for (const raw of ['0', '1000', '7.5', '', '   ', 'fast', '-4']) {
      expect(commitTempo(raw)).toBeUndefined()
    }
  })

  it('is parse-gated on the key, which the permalink deliberately is not', () => {
    expect(commitKey('F minor')).toBe('F minor')
    expect(commitKey('C# dorian')).toBe('C# dorian')
    for (const raw of ['H minor', 'a minor', 'A Minor', 'A', '']) {
      expect(commitKey(raw)).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

describe('the Song panel (#161)', () => {
  it('holds the three facts phase 1 opens with, in one panel', () => {
    const shown = text(panel())
    expect(shown).toContain('Song')
    for (const label of ['seed', 'key', 'bpm']) expect(shown).toContain(label)
    expect(panel()).toContain('value="7"')
    expect(panel()).toContain('Reroll')
  })

  it("offers the direction's keys plus Other…, so every parseable key stays reachable", () => {
    const html = panel()
    expect(html).toContain('<select')
    for (const key of REAL_KEYS) expect(html).toContain(`>${key}</option>`)
    expect(html).toContain(`value="${OTHER_KEY}"`)
    expect(text(html)).toContain('Other…')
  })

  it('replaces the select with the typed field for a direction authoring one key', () => {
    const html = panel({ keys: ['F minor'], resolved: { bpm: 134, key: 'F minor' } })
    expect(html).not.toContain('<select')
    expect(html).toContain('type="text"')
    expect(html).toContain('value="F minor"')
    // The grammar, since there is no list to pick from any more.
    expect(text(html)).toContain('Letter, optional # or b, then a mode')
  })

  it('shows a key the direction does not offer as the current selection', () => {
    const html = panel({ songKey: 'C# dorian', resolved: { bpm: 134, key: 'C# dorian' } })
    expect(html).toContain('>C# dorian</option>')
    expect(html).toContain('value="C# dorian"')
  })

  it('never offers a stored key the engine cannot read as the selected option', () => {
    // The regression. A permalink or a stored studio can carry `H minor` (§5.6): the guide
    // resolves in the direction's own key and says so, and the panel used to answer that by
    // adding `H minor` to the select as the current choice — a control claiming a key the guide
    // was not in, with the text that needed fixing hidden behind a menu.
    const html = panel({ songKey: 'H minor', resolved: { bpm: 134, key: 'F minor' } })

    expect(html).not.toContain('<select')
    expect(html).not.toContain('>H minor</option>')
    // The string is in the field, where it can be corrected, and marked as the problem it is.
    expect(html).toContain('value="H minor"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('out-of-range')

    // And the key actually in force is named, because nothing else on the panel says it.
    const shown = text(html)
    expect(shown).toContain('Not a key this build can read, so the guide is in F minor')
    // The way out is live. Only the tempo's reset is disabled here, and only because no tempo
    // was set — sliced rather than counted, so the two rows cannot cover for each other.
    const rowStart = html.indexOf('>key<')
    const keyRow = html.slice(rowStart, html.indexOf('</div>', rowStart))
    expect(keyRow).toContain('Follow direction')
    expect(keyRow).not.toContain('disabled=""')
  })

  it('leaves a readable key unmarked, so the invalid state means something', () => {
    const html = panel({ songKey: 'C minor', resolved: { bpm: 134, key: 'C minor' } })
    expect(html).toContain('<select')
    expect(html).not.toContain('aria-invalid')
    expect(text(html)).not.toContain('Not a key this build can read')
  })

  it('shows the slider beside the number in range, and only the number outside it', () => {
    const inside = panel({ bpm: 140, resolved: { bpm: 140, key: REAL_KEYS[0] } })
    expect(inside).toContain('type="range"')
    expect(inside).toContain('type="number"')

    const outside = panel({ bpm: 70, resolved: { bpm: 70, key: REAL_KEYS[0] } })
    expect(outside).not.toContain('type="range"')
    expect(outside).toContain('value="70"')
  })

  it('has a reset for each override, live only when there is one to clear', () => {
    // "Follow the direction" is a state, not the absence of one: once a number is typed there is
    // no other way back to the authored default. Disabled rather than hidden, so the panel does
    // not change shape under the hand using it.
    const none = panel()
    expect((none.match(/Follow direction/g) ?? []).length).toBe(2)
    expect((none.match(/disabled=""/g) ?? []).length).toBe(2)

    const both = panel({ bpm: 70, songKey: 'C minor' })
    expect((both.match(/Follow direction/g) ?? []).length).toBe(2)
    expect(both).not.toContain('disabled=""')
  })

  it('names every control, so the labels are not carried by position alone', () => {
    const html = panel()
    const labels = [...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map((m) => m[1])
    expect(labels.length).toBe(3)
    for (const id of labels) expect(html).toContain(`id="${id ?? ''}"`)
    // The slider is a second route to a value the number field already names, so it carries its
    // own name rather than inheriting one that would then be read out twice.
    expect(panel({ bpm: 140, resolved: { bpm: 140, key: REAL_KEYS[0] } })).toContain('aria-label=')
  })

  it('says the range is advisory rather than implying a wall', () => {
    const shown = text(panel())
    expect(shown).toContain(`${String(REAL_RANGE.min)}–${String(REAL_RANGE.max)}`)
    expect(shown).toContain('Outside it is allowed')
    // #161's caveat for the copy, said once and quietly.
    expect(shown).toContain('the patterns do not follow the tempo')
  })

  it('still shows seed and both typed fields with no direction chosen', () => {
    const html = panel({ range: undefined, keys: [], resolved: undefined })
    expect(html).toContain('id="seed"')
    expect(html).toContain('type="text"')
    expect(html).toContain('type="number"')
    expect(html).not.toContain('type="range"')
  })

  it('keeps a 44px hit target on every control, at any type size (#21)', () => {
    // The floor a phone at a rack needs. Asserted against the stylesheet because that is where
    // it lives: hit target and visual size are decoupled, so a compact panel is still usable.
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    for (const selector of ['\n.song-row button {', '\n.song-slider {']) {
      const start = css.indexOf(selector)
      expect(start, `${selector} is missing entirely`).toBeGreaterThan(-1)
      expect(css.slice(start, css.indexOf('}', start))).toContain('min-height: 44px')
    }
    const fields = css.indexOf('\n.song-input,\n.song-select {')
    expect(fields).toBeGreaterThan(-1)
    const rule = css.slice(fields, css.indexOf('}', fields))
    expect(rule).toContain('min-height: 44px')
    // 16px is the other half of the touch rule: iOS zooms the page for a smaller focused field.
    expect(rule).toContain('font-size: 16px')
  })

  it('lets every row wrap rather than pushing the page sideways (#21)', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
    const start = css.indexOf('\n.song-row {')
    expect(start).toBeGreaterThan(-1)
    const rule = css.slice(start, css.indexOf('}', start))
    expect(rule).toContain('flex-wrap: wrap')
    expect(rule).toContain('min-width: 0')
  })
})
