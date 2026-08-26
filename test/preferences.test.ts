import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JACK_STYLE,
  JACK_STYLE_ATTR,
  JACK_STYLE_KEY,
  JACK_STYLE_SCRIPT,
  readJackStyle,
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
