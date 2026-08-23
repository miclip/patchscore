import { describe, expect, it } from 'vitest'
import { metadata } from '../app/layout'

/**
 * #44. Two claims that only mean anything when they agree with each other and with the live
 * redirect: `www.patchscore.app` 308s to `patchscore.app`, so a canonical tag naming `www` would
 * point at the hostname that redirects away — worse than emitting no tag at all. Nothing in the
 * type system connects a `metadataBase` to a DNS record, so it is asserted here instead.
 *
 * `metadataBase` is typed `string | URL | null`, so every test narrows it first; a `metadataBase`
 * that stopped being a `URL` would fail loudly here rather than reading as an absent origin.
 */
function base(): URL {
  const value = metadata.metadataBase
  expect(value).toBeInstanceOf(URL)
  return value as URL
}

describe('#44 canonical metadata', () => {
  it('names the apex, which is the host the redirect points at', () => {
    expect(base().origin).toBe('https://patchscore.app')
  })

  it('does not name www, which 308s away', () => {
    expect(base().hostname).not.toMatch(/^www\./)
  })

  it('is canonical to the root, so generated views are not separately indexed', () => {
    expect(metadata.alternates?.canonical).toBe('/')
  })

  it('resolves the canonical to one absolute URL', () => {
    const canonical = metadata.alternates?.canonical
    expect(typeof canonical).toBe('string')
    expect(new URL(canonical as string, base()).href).toBe('https://patchscore.app/')
  })
})
