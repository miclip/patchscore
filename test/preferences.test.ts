import { describe, expect, it } from 'vitest'
import {
  ABANDONED_GUIDE_LAYOUT_KEY,
  DEFAULT_GUIDE_LAYOUT,
  DEFAULT_JACK_STYLE,
  GUIDE_LAYOUT_KEY,
  JACK_STYLE_ATTR,
  JACK_STYLE_KEY,
  JACK_STYLE_SCRIPT,
  readGuideLayout,
  readJackStyle,
  writeGuideLayout,
  writeJackStyle,
} from '../lib/studio/preferences'

/** A storage that behaves, and several that do not. */
const good = (seed: Record<string, string> = {}) => {
  const map = new Map(Object.entries(seed))
  return () => ({
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  })
}

describe('the jack-style preference falls back rather than failing (#138)', () => {
  it('reads a stored style', () => {
    expect(readJackStyle(good({ [JACK_STYLE_KEY]: 'plain' }))).toBe('plain')
    expect(readJackStyle(good({ [JACK_STYLE_KEY]: 'cables' }))).toBe('cables')
  })

  it('defaults to cables when nothing is stored', () => {
    expect(readJackStyle(good())).toBe(DEFAULT_JACK_STYLE)
    expect(DEFAULT_JACK_STYLE).toBe('cables')
  })

  it('defaults when the key holds something else entirely', () => {
    // `localStorage` is user-editable and shared with every other script on the origin.
    expect(readJackStyle(good({ [JACK_STYLE_KEY]: 'sockets' }))).toBe('cables')
    expect(readJackStyle(good({ [JACK_STYLE_KEY]: '{"a":1}' }))).toBe('cables')
  })

  it('defaults when there is no storage at all — SSR, or a browser with none', () => {
    expect(readJackStyle(() => null)).toBe('cables')
    expect(readJackStyle(() => undefined)).toBe('cables')
  })

  it('defaults when access itself throws, which blocked site data does', () => {
    expect(
      readJackStyle(() => {
        throw new DOMException('blocked', 'SecurityError')
      }),
    ).toBe('cables')
  })

  it('reports a failed write instead of throwing', () => {
    expect(writeJackStyle(good(), 'plain')).toBe(true)
    expect(writeJackStyle(() => null, 'plain')).toBe(false)
    expect(
      writeJackStyle(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      }, 'plain'),
    ).toBe(false)
  })

  it('round-trips through one storage', () => {
    const source = good()
    expect(writeJackStyle(source, 'plain')).toBe(true)
    expect(readJackStyle(source)).toBe('plain')
  })
})

describe('the pre-paint script cannot break the document', () => {
  it('names the same key and attribute the module does, so the two cannot drift', () => {
    expect(JACK_STYLE_SCRIPT).toContain(JACK_STYLE_KEY)
    expect(JACK_STYLE_SCRIPT).toContain(JACK_STYLE_ATTR)
  })

  it('is wrapped in try/catch, because it runs before anything else on the page', () => {
    expect(JACK_STYLE_SCRIPT.startsWith('try{')).toBe(true)
    expect(JACK_STYLE_SCRIPT).toContain('catch')
  })

  it('sets the attribute only for a value it recognises', () => {
    // Executed against a stub document, which is the only way to assert what it actually does.
    const run = (stored: string | null) => {
      let set: string | undefined
      const documentElement = { setAttribute: (_k: string, v: string) => void (set = v) }
      const localStorage = { getItem: () => stored }
      new Function('document', 'localStorage', JACK_STYLE_SCRIPT)({ documentElement }, localStorage)
      return set
    }
    expect(run('plain')).toBe('plain')
    expect(run('cables')).toBe('cables')
    expect(run('nonsense')).toBeUndefined()
    expect(run(null)).toBeUndefined()
  })
})

/**
 * §8/#230. The guide-layout preference, which is the *default* a guide opens as — not the studio's
 * own `Read:` control, which overrides one guide and stores nothing.
 *
 * Same fallback discipline as the jack style above, for the same reason: a preference that cannot
 * be read is the default, because refusing to render a guide over a layout choice would be a far
 * worse bug than opening it the usual way.
 */
describe('the guide-layout preference falls back rather than failing (§8/#230)', () => {
  it('reads a stored layout', () => {
    expect(readGuideLayout(good({ [GUIDE_LAYOUT_KEY]: 'sequencer' }))).toBe('sequencer')
    expect(readGuideLayout(good({ [GUIDE_LAYOUT_KEY]: 'phase' }))).toBe('phase')
  })

  it('defaults to the sequencer layout, which #240 settled at a rack', () => {
    // Was `'phase'` while nobody had read a session's worth of the other one. §8's order still
    // governs the inside of every section, and `renderGuide`'s own parameter still defaults to
    // it; what this constant decides is the outer loop a reader gets.
    expect(readGuideLayout(good())).toBe(DEFAULT_GUIDE_LAYOUT)
    expect(DEFAULT_GUIDE_LAYOUT).toBe('sequencer')
  })

  it('defaults when the key holds something else entirely', () => {
    expect(readGuideLayout(good({ [GUIDE_LAYOUT_KEY]: 'by-sequencer' }))).toBe('sequencer')
    expect(readGuideLayout(good({ [GUIDE_LAYOUT_KEY]: '{"layout":"phase"}' }))).toBe('sequencer')
  })

  it('defaults when there is no storage at all — SSR, or a browser with none', () => {
    expect(readGuideLayout(() => null)).toBe('sequencer')
    expect(readGuideLayout(() => undefined)).toBe('sequencer')
  })

  it('defaults when access itself throws, which blocked site data does', () => {
    expect(
      readGuideLayout(() => {
        throw new DOMException('blocked', 'SecurityError')
      }),
    ).toBe('sequencer')
  })

  it('reports a failed write instead of throwing', () => {
    expect(writeGuideLayout(good(), 'sequencer')).toBe(true)
    expect(writeGuideLayout(() => null, 'sequencer')).toBe(false)
    expect(
      writeGuideLayout(() => {
        throw new DOMException('quota', 'QuotaExceededError')
      }, 'sequencer'),
    ).toBe(false)
  })

  it('round-trips through one storage', () => {
    const source = good()
    expect(writeGuideLayout(source, 'sequencer')).toBe(true)
    expect(readGuideLayout(source)).toBe('sequencer')
  })

  it('keeps its own key, so a permalink carries neither preference', () => {
    // The rule #138 set for the jack style and §8/#230 keeps: how you read is not what you built.
    expect(GUIDE_LAYOUT_KEY).not.toBe(JACK_STYLE_KEY)
    const source = good()
    writeGuideLayout(source, 'sequencer')
    expect(readJackStyle(source)).toBe(DEFAULT_JACK_STYLE)
  })
})

/**
 * §8/#230. **The key #239 wrote must not be read as a preference**, which is the bug this pair of
 * tests exists to pin.
 *
 * #239's studio control remembered itself under `patchscore:guide-layout`. #241 split that into a
 * per-visit override and a stored default, and reused the key — silently promoting every value the
 * old control had written from "how I wanted to read one guide" into "how I read every guide".
 * A reader who had tapped it to `by phase` was pinned there, and #242's change of default could
 * not reach them.
 *
 * Reported from an iPhone as "nothing changes on my phone", which is precisely how it looked.
 */
describe('the abandoned per-visit key is not read as a preference (§8/#230)', () => {
  it('ignores a value stored by #239’s control', () => {
    const stale = good({ [ABANDONED_GUIDE_LAYOUT_KEY]: 'phase' })
    // The reader who was pinned to `phase` now gets the current default instead.
    expect(readGuideLayout(stale)).toBe(DEFAULT_GUIDE_LAYOUT)
    expect(readGuideLayout(stale)).toBe('sequencer')
  })

  it('keeps the two keys distinct, which is the whole of the fix', () => {
    expect(GUIDE_LAYOUT_KEY).not.toBe(ABANDONED_GUIDE_LAYOUT_KEY)
  })

  it('still honours a value stored by the preferences page itself', () => {
    // The fix must not throw the baby out: a real preference is still a preference.
    expect(readGuideLayout(good({ [GUIDE_LAYOUT_KEY]: 'phase' }))).toBe('phase')
  })

  it('does not write to the abandoned key', () => {
    const source = good()
    writeGuideLayout(source, 'phase')
    expect(readGuideLayout(source)).toBe('phase')
    // Nothing should have been left in the old key for a future version to trip over.
    expect(source().getItem(ABANDONED_GUIDE_LAYOUT_KEY)).toBeNull()
  })
})
