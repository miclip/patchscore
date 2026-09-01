import { createElement, isValidElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Metadata } from 'next'
import { describe, expect, it } from 'vitest'

import Page, { generateMetadata } from '../app/page'
import { Studio } from '../components/studio'
import { FORMAT_VERSION, RESOLVER_VERSION, decodeGuideInputs, encodeGuideInputs } from '../lib/core/index'
import type { GuideInputsV1 } from '../lib/core/index'
import { CATALOGUE, DEFAULT_INPUTS, composeTemplate } from '../lib/studio/session'
import { guideMeta, queryFromSearchParams, studioEntry } from '../lib/studio/entry'
import type { SearchParams } from '../lib/studio/entry'
import { SITE_DESCRIPTION, SITE_NAME } from '../lib/studio/site'

/**
 * #99. The server render is a function of the URL.
 *
 * It used to be a function of nothing: `app/page.tsx` took no `searchParams` and returned
 * `<Studio />`, so the first byte of every shared link was Industrial Techno at 134 BPM on the
 * default rig, whatever the link said. That cost a flash of the wrong guide on every share, one
 * identical preview card for every guide in the library, and the default served — silently — to
 * every reader with no JavaScript.
 *
 * `Page` and `generateMetadata` are asserted **against each other** here, not just individually.
 * Two decodes of one query is how a card comes to describe a guide the page does not render, and
 * the only defence against it is a test that would notice.
 *
 * The page is an async server component. `renderToStaticMarkup` does not render one, so it is
 * awaited for its element tree first and that is rendered — which is also what makes the
 * comparison below exact, since it is the same renderer the Studio-only tests use.
 */

/**
 * The link from #99, in full. Written out rather than re-encoded: the claim is about a URL.
 *
 * The two stamps come from the constants, so a resolver bump (#100) moves this fixture with the
 * engine instead of failing a test about `og:url`.
 */
const DRONE_QUERY =
  `format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&device=polyend-tracker-mini` +
  '&template=drone-study&darkness=59&density=50&grit=52&swing=50&space=50&seed=1'

/** What Next hands a server component, built the way Next builds it: repeats become arrays. */
function paramsOf(query: string): SearchParams {
  const params: SearchParams = {}
  for (const [key, value] of new URLSearchParams(query)) {
    const seen = params[key]
    if (seen === undefined) params[key] = value
    else params[key] = Array.isArray(seen) ? [...seen, value] : [seen, value]
  }
  return params
}

/**
 * `renderToStaticMarkup` writes adjacent text nodes straight through; the streaming renderer Next
 * actually serves with separates them with `<!-- -->` so hydration can find the boundaries. Both
 * are the same page, so the markers are stripped and every assertion below is true of the bytes
 * a reader receives as well as of the tree rendered here. Verified against `next start`.
 */
function withoutTextMarkers(markup: string): string {
  return markup.replace(/<!-- -->/g, '')
}

async function pageMarkup(query: string): Promise<string> {
  const element = await Page({ searchParams: Promise.resolve(paramsOf(query)) })
  expect(isValidElement(element)).toBe(true)
  return withoutTextMarkers(renderToStaticMarkup(element as ReactElement))
}

function studioMarkup(query: string): string {
  return withoutTextMarkers(
    renderToStaticMarkup(
      createElement(Studio, { initialInputs: studioEntry(paramsOf(query)).inputs }),
    ),
  )
}

async function metaOf(query: string) {
  return await generateMetadata({ searchParams: Promise.resolve(paramsOf(query)) })
}

/** `openGraph` is a union of a dozen `og:type` shapes, only some of which carry `url`. */
function ogUrl(meta: Metadata): string {
  const og = meta.openGraph
  const url = og !== undefined && og !== null && 'url' in og ? og.url : undefined
  expect(typeof url).toBe('string')
  return url as string
}

/** The inputs behind a link, decoded once so a test can assert against them. */
function inputsOf(query: string): GuideInputsV1 {
  const decoded = decodeGuideInputs(query, CATALOGUE)
  if (!decoded.ok) throw new Error(`expected a readable link: ${decoded.detail}`)
  return decoded.inputs
}

/** `Metadata['title']` is a union with a template object; every assertion narrows it first. */
function titleOf(value: unknown): string {
  expect(typeof value).toBe('string')
  return value as string
}

describe('#99 the server render honours the query string', () => {
  it('paints Drone Study at 72 BPM, not the default Industrial Techno at 134', async () => {
    const markup = await pageMarkup(DRONE_QUERY)

    // The guide's own heading, so this cannot be satisfied by the direction picker — which
    // lists every template's name on every render and would make a bare substring meaningless.
    // The heading is a link to the direction's page since #112, so this pins the href too.
    expect(markup).toContain('<h2><a href="/directions/drone-study">Drone Study</a></h2>')
    expect(markup).not.toContain('>Industrial Techno</a></h2>')

    // The BPM and the template range beside it (§8 phase 1). 60…84 belongs to Drone Study and
    // 130…142 to Industrial Techno, so the pair pins which template was resolved, not just which
    // name was printed.
    expect(markup).toContain('>72</span>')
    expect(markup).toContain('60…84')
    expect(markup).not.toContain('130…142')
  })

  it('is the same markup the Studio renders from those inputs, so hydration has nothing to fix', async () => {
    // The hydration contract, restated at the page level: the client's first pass renders
    // `initialInputs`, and this is what the server sent it.
    expect(await pageMarkup(DRONE_QUERY)).toBe(studioMarkup(DRONE_QUERY))
  })

  it('is not the default render, which is the whole bug', async () => {
    expect(await pageMarkup(DRONE_QUERY)).not.toBe(await pageMarkup(''))
  })

  it('falls back to the default guide when there is no query', async () => {
    const bare = await pageMarkup('')
    expect(bare).toContain('<h2><a href="/directions/industrial-techno">Industrial Techno</a></h2>')
    expect(bare).toBe(
      withoutTextMarkers(
        renderToStaticMarkup(createElement(Studio, { initialInputs: DEFAULT_INPUTS })),
      ),
    )
  })

  it('falls back to the default guide when the link cannot be read', async () => {
    const bare = await pageMarkup('')
    // A link naming a device this build does not ship: a decode failure, not a partial guide.
    // The server says nothing about it — the client bootstrap raises the notice, because that is
    // where there is somebody to read it.
    expect(await pageMarkup(DRONE_QUERY.replace('polyend-tracker-mini', 'no-such-box'))).toBe(bare)
    // Missing the mood axes on a format that had them: malformed, never neutral-by-default
    // (§8.2). #310 made *absence* a state from v3 on — the direction's own mood — so the claim
    // this makes now needs a v2 link, where silence about mood is still corruption.
    expect(
      await pageMarkup(`format=2&resolver=${RESOLVER_VERSION}&template=drone-study&seed=1`),
    ).toBe(bare)
    // And a v3 link carrying *some* of the axes, which is malformed under every format: a mood
    // is a total override, so half of one is a hand-edit rather than a partial opinion (#310).
    expect(
      await pageMarkup(
        `format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&template=drone-study` +
          `&swing=70&seed=1`,
      ),
    ).toBe(bare)
    expect(await pageMarkup('nonsense')).toBe(bare)
  })
})

describe('#99 the preview card comes from the same decode', () => {
  it('names the direction and the rig on the link', async () => {
    const meta = await metaOf(DRONE_QUERY)
    expect(titleOf(meta.title)).toBe(`Drone Study on Polyend Tracker Mini — ${SITE_NAME}`)
    expect(meta.description).toContain('72 BPM')
    expect(meta.description).toContain('Drone Study')
    expect(meta.description).not.toContain('Industrial Techno')
  })

  it('is `guideMeta` of the decoded inputs, and nothing computed a second way', async () => {
    // The claim the issue is actually about: one decode path. If `generateMetadata` ever grew its
    // own reading of the query, this is what would notice.
    const decoded = decodeGuideInputs(DRONE_QUERY, CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return

    const expected = guideMeta(decoded.inputs)
    const meta = await metaOf(DRONE_QUERY)
    expect(titleOf(meta.title)).toBe(expected.title)
    expect(meta.description).toBe(expected.description)
    // And the page rendered those same inputs.
    expect(studioEntry(paramsOf(DRONE_QUERY)).inputs).toEqual(decoded.inputs)
  })

  it('describes the default guide when there is no link, and differs from the one that has one', async () => {
    const bare = await metaOf('')
    expect(titleOf(bare.title)).toBe(guideMeta(DEFAULT_INPUTS).title)
    expect(titleOf(bare.title)).toContain('Industrial Techno')
    expect(titleOf(bare.title)).not.toBe(titleOf((await metaOf(DRONE_QUERY)).title))
  })

  it('repeats the guide in Open Graph and Twitter, so no card falls back to the site default', async () => {
    const meta = await metaOf(DRONE_QUERY)
    const title = titleOf(meta.title)
    expect(meta.openGraph?.title).toBe(title)
    expect(meta.openGraph?.description).toBe(meta.description)
    expect(meta.twitter?.title).toBe(title)
    expect(meta.twitter?.description).toBe(meta.description)
  })

  it('stays canonical to the root, per #44, while `og:url` names the guide', async () => {
    // Not a contradiction: two readers, two units. `rel=canonical` is addressed to an index and
    // #44's argument holds there. `og:url` identifies the *share*, and one `og:url` for every
    // guide collapses them into a single share object — which throws away the per-guide card
    // above and makes the rest of this describe pointless.
    const meta = await metaOf(DRONE_QUERY)
    expect(meta.alternates?.canonical).toBe('/')
    expect(ogUrl(meta)).toBe(`/?${encodeGuideInputs(inputsOf(DRONE_QUERY), CATALOGUE)}`)
  })

  it('gives two valid guide links two different `og:url`s', async () => {
    // The property the collapse destroyed. Same rig, one different field — and the two links
    // must be separately shareable.
    const other = DRONE_QUERY.replace('seed=1', 'seed=7')
    expect(ogUrl(await metaOf(DRONE_QUERY))).not.toBe(ogUrl(await metaOf(other)))

    // A different direction on the same rig, so this is not just the seed moving.
    const techno = DRONE_QUERY.replace('template=drone-study', 'template=industrial-techno')
    expect(ogUrl(await metaOf(DRONE_QUERY))).not.toBe(ogUrl(await metaOf(techno)))

    // And every one of them is still a link this build can read back.
    for (const query of [DRONE_QUERY, other, techno]) {
      const url = ogUrl(await metaOf(query))
      expect(decodeGuideInputs(url.slice(url.indexOf('?')), CATALOGUE).ok).toBe(true)
    }
  })

  it('canonicalises `og:url` rather than echoing the query back', async () => {
    // Two spellings of one guide share one share object. Fields reordered, devices in the wrong
    // order, and an older engine's stamp: all the same guide, all the same `og:url`.
    const shuffled =
      'seed=1&space=50&swing=50&grit=52&density=50&darkness=59' +
      `&template=drone-study&device=polyend-tracker-mini&resolver=${RESOLVER_VERSION}` +
      `&format=${FORMAT_VERSION}`
    expect(ogUrl(await metaOf(shuffled))).toBe(ogUrl(await metaOf(DRONE_QUERY)))

    // A drifted link (§8.2) re-resolves under the current engine, so it canonicalises to the
    // current engine's URL too — the same guide the reader is actually being shown.
    const drifted = DRONE_QUERY.replace(`resolver=${RESOLVER_VERSION}`, 'resolver=0')
    expect(ogUrl(await metaOf(drifted))).toBe(ogUrl(await metaOf(DRONE_QUERY)))
    expect(ogUrl(await metaOf(drifted))).toContain(`resolver=${RESOLVER_VERSION}`)
  })

  it('names the root when there is no readable link, rather than inventing one', async () => {
    // The bare root really is at `/`. A link that failed to decode has no permalink to name, and
    // handing back the default one would tell a card renderer that a broken URL addresses the
    // guide it happened to fall back to.
    expect(ogUrl(await metaOf(''))).toBe('/')
    expect(ogUrl(await metaOf('nonsense'))).toBe('/')
    expect(ogUrl(await metaOf(DRONE_QUERY.replace('polyend-tracker-mini', 'no-such-box')))).toBe('/')
  })
})

describe('#99 a preview that would describe a guide nobody sees', () => {
  it('falls back to the site line when the direction names nothing this build ships', () => {
    const meta = guideMeta({ ...DEFAULT_INPUTS, templateId: 'no-such-direction' })
    expect(meta.title).toBe(SITE_NAME)
    expect(meta.description).toBe(SITE_DESCRIPTION)
  })

  it('falls back to the site line when the influences refuse each other (§5.3)', () => {
    // The page draws no guide for a refused pair — deliberately, rather than quietly rendering
    // the un-patched template. A card describing the guide behind that refusal would be
    // describing something the reader is never going to see.
    const inputs = { ...DEFAULT_INPUTS, inspirations: ['dancehall', 'reggae'] }
    expect(composeTemplate(inputs)?.outcome).toBe('refused')
    expect(guideMeta(inputs).title).toBe(SITE_NAME)
  })

  it('still describes a rig that covers nothing, because that is a true thing to say', () => {
    // Invariant 5 where people look first. An empty rig resolves; it just carries no parts.
    const meta = guideMeta({ ...DEFAULT_INPUTS, devices: [] })
    expect(meta.title).toContain('an empty rig')
    expect(meta.description).toContain('0 of')
  })

  it('names two boxes and counts the rest, so a title still fits on a card', () => {
    expect(guideMeta(DEFAULT_INPUTS).title).toBe(
      `Industrial Techno on Polyend Tracker Mini and Roland TR-1000 — ${SITE_NAME}`,
    )
    const many = { ...DEFAULT_INPUTS, devices: CATALOGUE.devices.slice(0, 4) }
    expect(guideMeta(many).title).toContain('a 4-device rig')
  })
})

describe('#99 turning Next search params back into a query', () => {
  it('round-trips the link the issue quotes', () => {
    // Order is the URL's own, so this is byte-equality rather than a set comparison.
    expect(queryFromSearchParams(paramsOf(DRONE_QUERY))).toBe(DRONE_QUERY)
  })

  it('keeps a repeated device, which is a list', () => {
    const query = queryFromSearchParams(
      paramsOf(DRONE_QUERY.replace('device=polyend-tracker-mini', 'device=polyend-tracker-mini&device=roland-tr-1000')),
    )
    const decoded = decodeGuideInputs(query, CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.inputs.devices).toEqual(['polyend-tracker-mini', 'roland-tr-1000'])
  })

  it('keeps a repeated scalar repeated, so it stays malformed rather than last-wins', () => {
    const decoded = decodeGuideInputs(
      queryFromSearchParams(paramsOf(`${DRONE_QUERY}&seed=2`)),
      CATALOGUE,
    )
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('malformed')
  })

  it('re-encodes a value that would otherwise split into fields', () => {
    // Next has already percent-decoded both halves, so a value carrying `&` or `=` arrives whole
    // and must be written back whole. Left raw, `template=a&seed=9` would smuggle in a seed.
    expect(queryFromSearchParams({ template: 'a&seed=9' })).toBe('template=a%26seed%3D9')
    const decoded = decodeGuideInputs(queryFromSearchParams({ template: 'a&seed=9' }), CATALOGUE)
    expect(decoded.ok).toBe(false)
  })

  it('reads an encoded key the same way the client does, straight off `location.search`', () => {
    // The mismatch this closed (#99). Next percent-decodes a key before this file ever sees it,
    // so `%73eed` reaches the server spelled `seed`; the client hands `location.search` to
    // `decodeGuideInputs` untouched, so it saw `%73eed`. Reading keys raw meant the server
    // resolved a guide and the client called the same URL broken, with no error either side.
    const encodedKey = DRONE_QUERY.replace('seed=1', '%73%65%65%64=1')
    expect(encodedKey).not.toBe(DRONE_QUERY)

    // The client's path: the raw query string, exactly as an address bar holds it.
    const client = decodeGuideInputs(`?${encodedKey}`, CATALOGUE)
    // The server's path: through the framework's decoding and back out again.
    const server = decodeGuideInputs(queryFromSearchParams(paramsOf(encodedKey)), CATALOGUE)

    expect(client.ok).toBe(true)
    expect(server.ok).toBe(true)
    if (!client.ok || !server.ok) return
    expect(client.inputs).toEqual(server.inputs)
    expect(client.inputs).toEqual(inputsOf(DRONE_QUERY))
    // And neither one quietly binned it as a field from the future.
    expect(client.dropped).toEqual([])
    expect(server.dropped).toEqual([])
  })

  it('reports a dropped unknown key by its decoded name, which is the one in the link', () => {
    // The other half: an encoded key this build genuinely does not know is still dropped and
    // still named — and named in the spelling its author would recognise (invariant 5).
    const decoded = decodeGuideInputs(`?${DRONE_QUERY}&%68int=on`, CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.dropped).toEqual(['hint'])
  })

  it('is empty for no params at all, which is the no-link case', () => {
    expect(queryFromSearchParams({})).toBe('')
    expect(studioEntry({}).fromLink).toBe(false)
    expect(studioEntry({}).inputs).toBe(DEFAULT_INPUTS)
    expect(studioEntry(paramsOf(DRONE_QUERY)).fromLink).toBe(true)
  })
})
