import { describe, expect, it, vi } from 'vitest'
import {
  DENSITY_DETENTS,
  STUDIO_STORAGE_KEY,
  decodeGuideInputs,
  encodeGuideInputs,
  guideInputsFrom,
  loadStudio,
  studioDoc,
} from '../lib/core/index'
import type { GuideInputsV1, StoredRigV1 } from '../lib/core/index'
import {
  CATALOGUE,
  DEFAULT_INPUTS,
  bootstrapStudio,
  copyStudioLink,
  syncStudio,
  withAxis,
  withDevice,
  withSeed,
  withTemplate,
} from '../lib/studio/session'
import type { DownloadFile, StudioEnv } from '../lib/studio/session'

/**
 * Build step 10 (#12): the browser half of the studio, with the browser injected.
 *
 * Vitest runs in `node` and stays there. Every fake below is a few lines, which is the trade
 * this design is making: narrow injected interfaces instead of a permanent jsdom dependency
 * bought to cover four `window` reads.
 */

const ORIGIN = 'https://patchscore.app'

/** A location, a history and a clipboard, wired to each other the way a browser wires them. */
function fakeBrowser(options: { search?: string; storage?: 'ok' | 'none' | 'throws' } = {}) {
  const state = {
    pathname: '/',
    search: options.search ?? '',
    stored: null as string | null,
    replaceCalls: [] as string[],
    copied: [] as string[],
    downloaded: [] as DownloadFile[],
    printed: 0,
  }

  const storage = {
    getItem(key: string) {
      return key === STUDIO_STORAGE_KEY ? state.stored : null
    },
    setItem(key: string, value: string) {
      if (key === STUDIO_STORAGE_KEY) state.stored = value
    },
  }

  const env: StudioEnv = {
    storage:
      options.storage === 'none'
        ? () => undefined
        : options.storage === 'throws'
          ? () => {
              throw new Error('site data blocked')
            }
          : () => storage,
    location: () => ({
      pathname: state.pathname,
      search: state.search,
      href: `${ORIGIN}${state.pathname}${state.search}`,
    }),
    history: () => ({
      replaceState(_data: unknown, _unused: string, url: string) {
        state.replaceCalls.push(url)
        const query = url.indexOf('?')
        state.pathname = query === -1 ? url : url.slice(0, query)
        state.search = query === -1 ? '' : url.slice(query)
      },
    }),
    clipboard: () => ({
      writeText(text: string) {
        state.copied.push(text)
        return Promise.resolve()
      },
    }),
    download: () => (file) => {
      state.downloaded.push(file)
    },
    print: () => () => {
      state.printed++
    },
  }

  return { env, state }
}

function link(over: Partial<GuideInputsV1> = {}): string {
  return `?${encodeGuideInputs({ ...DEFAULT_INPUTS, ...over }, CATALOGUE)}`
}

// ---------------------------------------------------------------------------

describe('the default is a constant, fit for both renders', () => {
  it('names only ids this build ships, so it always encodes', () => {
    expect(() => encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)).not.toThrow()
  })

  it('sits on the middle density detent, not on a value the control cannot produce', () => {
    expect(DEFAULT_INPUTS.mood.density).toBe(DENSITY_DETENTS[1])
  })

  it('lands on Industrial Techno by name, not on whichever id sorts first', () => {
    // This was `CATALOGUE.templates[0]`, and the registry is ordered by id (§7.2) — so adding
    // a template called `ambient-dub` silently changed which genre a first-time visitor saw.
    // The landing direction is a choice; a choice that moves when an unrelated file is added
    // is not one. It must also still be a template this build actually ships.
    expect(DEFAULT_INPUTS.templateId).toBe('industrial-techno')
    expect(CATALOGUE.templates).toContain(DEFAULT_INPUTS.templateId)
    expect(CATALOGUE.templates.length).toBeGreaterThan(1)
  })

  it('is the same object every time it is asked for', () => {
    // No clock, no draw, no read. Two builds of the first frame must agree byte for byte.
    expect(encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)).toBe(
      encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE),
    )
  })
})

describe('bootstrap precedence: link, then store, then defaults', () => {
  it('takes a valid link over a valid stored studio', () => {
    const { env, state } = fakeBrowser({ search: link({ seed: 777 }) })
    state.stored = JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, seed: 111 }))

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('link')
    expect(boot.inputs.seed).toBe(777)
    // A link carries device ids, not a rig — so there is nothing to preserve.
    expect(boot.rig).toBeUndefined()
    // And nothing to write: a visitor's own studio is not replaced by opening someone's link.
    expect(boot.persist).toBe(false)
    expect(boot.notices).toEqual([])
  })

  it('falls back to the stored studio when there is no link', () => {
    const { env, state } = fakeBrowser()
    const rig: StoredRigV1 = {
      id: 'local',
      name: 'Studio rack',
      devices: [{ deviceId: CATALOGUE.devices[0] as string, settings: {} }],
    }
    state.stored = JSON.stringify(
      studioDoc({ ...DEFAULT_INPUTS, seed: 111, devices: [CATALOGUE.devices[0] as string] }, rig),
    )

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('storage')
    expect(boot.inputs.seed).toBe(111)
    expect(boot.rig?.name).toBe('Studio rack')
    expect(boot.persist).toBe(true)
    expect(boot.notices).toEqual([])
  })

  it('falls back to the store when the link is broken, and says the link was broken', () => {
    const { env, state } = fakeBrowser({ search: '?format=1&resolver=1&device=nope' })
    state.stored = JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, seed: 111 }))

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('storage')
    expect(boot.inputs.seed).toBe(111)
    // A broken link is an ordinary session reached by a bad URL. It owns its studio.
    expect(boot.persist).toBe(true)
    expect(boot.notices.map((n) => n.kind)).toEqual(['link-unreadable'])
  })

  it('keeps the defaults when there is neither', () => {
    const { env } = fakeBrowser()
    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('default')
    expect(boot.inputs).toEqual(DEFAULT_INPUTS)
    expect(boot.persist).toBe(true)
    expect(boot.notices).toEqual([])
  })

  it('treats a bare ? as no link at all', () => {
    const { env } = fakeBrowser({ search: '?' })
    expect(bootstrapStudio(env).source).toBe('default')
  })
})

describe('what the user is told, and never blocked by', () => {
  it('renders an older link under the current resolver and names the version change', () => {
    const older = link({ seed: 5 }).replace('resolver=1', 'resolver=0')
    const { env } = fakeBrowser({ search: older })

    const boot = bootstrapStudio(env)
    // Rendered, not refused: the inputs came through intact.
    expect(boot.source).toBe('link')
    expect(boot.inputs.seed).toBe(5)

    const drift = boot.notices.find((n) => n.kind === 'drift')
    expect(drift).toBeDefined()
    // Explicit about *which* versions, not a vague "this may be out of date".
    expect(drift?.message).toContain('v0')
    expect(drift?.message).toContain('v1')
  })

  it('says a link is from a newer build rather than calling it broken', () => {
    const { env } = fakeBrowser({ search: link().replace('format=1', 'format=2') })
    const boot = bootstrapStudio(env)
    expect(boot.notices.map((n) => n.kind)).toEqual(['link-newer'])
    expect(boot.notices[0]?.message).toContain('newer')
  })

  it('reports unreadable stored data and starts fresh', () => {
    const { env, state } = fakeBrowser()
    state.stored = '{ not json'
    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('default')
    expect(boot.inputs).toEqual(DEFAULT_INPUTS)
    expect(boot.notices.map((n) => n.kind)).toEqual(['stored-unreadable'])
  })

  it('reports a rig naming a device this build does not ship', () => {
    const { env, state } = fakeBrowser()
    state.stored = JSON.stringify(studioDoc(DEFAULT_INPUTS)).replace(
      CATALOGUE.devices[0] as string,
      'aphex-widget',
    )
    expect(bootstrapStudio(env).notices.map((n) => n.kind)).toEqual(['stored-unreadable'])
  })

  it('reports storage that is not there at all', () => {
    const { env } = fakeBrowser({ storage: 'none' })
    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('default')
    expect(boot.notices.map((n) => n.kind)).toEqual(['storage-unavailable'])
  })

  it('reports storage that throws on access', () => {
    const { env } = fakeBrowser({ storage: 'throws' })
    expect(bootstrapStudio(env).notices.map((n) => n.kind)).toEqual(['storage-unavailable'])
  })

  it('never throws, whatever the browser does', () => {
    const hostile: StudioEnv = {
      storage: () => {
        throw new Error('no')
      },
      location: () => {
        throw new Error('no')
      },
      history: () => {
        throw new Error('no')
      },
      clipboard: () => {
        throw new Error('no')
      },
      download: () => {
        throw new Error('no')
      },
      print: () => {
        throw new Error('no')
      },
    }
    expect(() => bootstrapStudio(hostile)).not.toThrow()
    expect(() => syncStudio(hostile, DEFAULT_INPUTS, undefined)).not.toThrow()
  })
})

describe('a link from a later build opens, and says what was ignored', () => {
  it('renders the guide and names the dropped fields', () => {
    const { env } = fakeBrowser({
      search: `${link({ seed: 8 })}&overlay=a-drum:sd-disabled&hints=off`,
    })
    const boot = bootstrapStudio(env)

    // Opened, not refused — that is the whole point of a self-describing format.
    expect(boot.source).toBe('link')
    expect(boot.inputs.seed).toBe(8)

    const notice = boot.notices.find((n) => n.kind === 'link-dropped-fields')
    expect(notice).toBeDefined()
    expect(notice?.message).toContain('hints')
    expect(notice?.message).toContain('overlay')
    expect(notice?.message).toContain('2 settings')
  })

  it('says "1 setting" rather than "1 settings"', () => {
    const { env } = fakeBrowser({ search: `${link()}&hints=off` })
    const notice = bootstrapStudio(env).notices.find((n) => n.kind === 'link-dropped-fields')
    expect(notice?.message).toContain('1 setting this')
  })

  it('says nothing when a link has nothing to drop', () => {
    const { env } = fakeBrowser({ search: link() })
    expect(bootstrapStudio(env).notices).toEqual([])
  })

  it('rewrites the address bar without the fields it dropped', () => {
    const { env, state } = fakeBrowser({ search: `${link({ seed: 8 })}&hints=off` })
    const boot = bootstrapStudio(env)
    syncStudio(env, boot.inputs, boot.rig)
    const written = state.replaceCalls[0] as string
    expect(written).not.toContain('hints')
    expect(written).toContain('seed=8')
  })
})

describe('the URL budget', () => {
  it('spends a small fraction of the ~2000 character safe limit on a full rig', () => {
    const query = encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)
    const absolute = `${ORIGIN}/?${query}`
    // Reported in the build log so the baseline is watchable rather than folklore.
    // eslint-disable-next-line no-console
    console.log(`permalink baseline: query ${query.length} chars, absolute ${absolute.length} chars`)
    expect(query.length).toBeLessThan(400)
    expect(absolute.length).toBeLessThan(500)
  })
})

describe('sync writes the canonical query and the studio', () => {
  it('replaces the URL rather than navigating', () => {
    const { env, state } = fakeBrowser()
    const report = syncStudio(env, DEFAULT_INPUTS, undefined)

    expect(state.replaceCalls).toEqual([`/?${encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)}`])
    expect(report.query).toBe(encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE))
    expect(report.href).toBe(`${ORIGIN}/?${report.query}`)
  })

  it('writes a document the loader accepts', () => {
    const { env, state } = fakeBrowser()
    syncStudio(env, DEFAULT_INPUTS, undefined)

    const loaded = loadStudio(() => ({
      getItem: () => state.stored,
      setItem: () => {},
    }), CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status === 'ok') expect(guideInputsFrom(loaded.doc)).toEqual(DEFAULT_INPUTS)
  })

  it('writes a new query on a reroll, and only the seed moves', () => {
    const { env, state } = fakeBrowser()
    syncStudio(env, DEFAULT_INPUTS, undefined)
    const before = state.replaceCalls.length

    const rerolled = withSeed(DEFAULT_INPUTS, 864213)
    syncStudio(env, rerolled, undefined)

    expect(state.replaceCalls.length).toBe(before + 1)
    const last = state.replaceCalls[state.replaceCalls.length - 1] as string
    expect(last).toContain('seed=864213')
    expect(last).not.toBe(state.replaceCalls[0])

    // The reroll changed the seed and nothing else — the rest of the link is identical.
    const strip = (url: string) => url.replace(/&seed=\d+$/, '')
    expect(strip(last)).toBe(strip(state.replaceCalls[0] as string))
  })

  /** Any template this build ships that the default is not — the change has to be a change. */
  function otherTemplate(): string {
    const other = CATALOGUE.templates.find((id) => id !== DEFAULT_INPUTS.templateId)
    if (other === undefined) throw new Error('this build ships only one template')
    return other
  }

  it('writes a new query for every kind of input change', () => {
    const { env, state } = fakeBrowser()
    const changes: GuideInputsV1[] = [
      DEFAULT_INPUTS,
      withSeed(DEFAULT_INPUTS, 2),
      withAxis(DEFAULT_INPUTS, 'grit', 80),
      withDevice(DEFAULT_INPUTS, CATALOGUE.devices[0] as string, false),
      withTemplate(DEFAULT_INPUTS, otherTemplate()),
    ]
    for (const inputs of changes) syncStudio(env, inputs, undefined)

    // Five distinct URLs from five syncs. This used to expect four, because the build shipped
    // one template and switching to it was a no-op; now that there are several, the template
    // has to be one the default is not, or the assertion goes back to proving nothing.
    expect(new Set(state.replaceCalls).size).toBe(5)
  })

  it('round trips: the URL it wrote is a URL it can boot from', () => {
    const { env, state } = fakeBrowser()
    const inputs = withAxis(withSeed(DEFAULT_INPUTS, 99), 'darkness', 20)
    syncStudio(env, inputs, undefined)

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('link')
    expect(boot.inputs).toEqual(inputs)
  })

  it('reports storage it could not write to, without losing the URL', () => {
    const { env, state } = fakeBrowser({ storage: 'none' })
    const report = syncStudio(env, DEFAULT_INPUTS, undefined)
    expect(report.notice?.kind).toBe('storage-unavailable')
    expect(state.replaceCalls.length).toBe(1)
  })

  it('still produces a query when there is no history to write it to', () => {
    const { env } = fakeBrowser()
    const noHistory: StudioEnv = { ...env, history: () => undefined }
    const report = syncStudio(noHistory, DEFAULT_INPUTS, undefined)
    expect(report.query).toBe(encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE))
    expect(report.href).toBeUndefined()
  })
})

/**
 * The property the whole persistence policy exists for: **opening someone's link must not cost
 * you your studio.** Before this, bootstrap canonicalised the address bar and the sync that
 * followed treated that as consent — a link clicked in a chat window silently replaced the
 * visitor's rig and score inputs before they had touched anything.
 *
 * Every test here compares the stored bytes, not a parsed object. A save that rewrote the
 * document to something equivalent-but-different would still be a save, and would still mean the
 * visitor's rig had been through a machine it never asked for.
 */
describe('a shared link never writes to the visitor’s studio', () => {
  /** Somebody's own studio, already in storage before they click anything. */
  function visitorWithOwnStudio(search: string) {
    const rig: StoredRigV1 = {
      id: 'local',
      name: 'Studio rack',
      devices: [{ deviceId: CATALOGUE.devices[0] as string, settings: {} }],
    }
    const own = studioDoc(
      { ...DEFAULT_INPUTS, seed: 111, devices: [CATALOGUE.devices[0] as string] },
      rig,
    )
    const { env, state } = fakeBrowser({ search })
    state.stored = JSON.stringify(own)
    return { env, state, untouched: state.stored }
  }

  const shared = link({ seed: 777, devices: [CATALOGUE.devices[1] as string] })

  it('leaves the stored studio byte-identical when the link is merely opened', () => {
    const { env, state, untouched } = visitorWithOwnStudio(shared)
    const boot = bootstrapStudio(env)
    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })

    expect(state.stored).toBe(untouched)
  })

  it('still canonicalises the address bar while writing nothing', () => {
    const { env, state, untouched } = visitorWithOwnStudio(shared)
    const boot = bootstrapStudio(env)
    const report = syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })

    expect(report.persisted).toBe(false)
    expect(state.replaceCalls.length).toBe(1)
    expect(state.replaceCalls[0]).toContain('seed=777')
    expect(state.stored).toBe(untouched)
  })

  it('leaves it byte-identical after a reroll inside the shared link', () => {
    const { env, state, untouched } = visitorWithOwnStudio(shared)
    const boot = bootstrapStudio(env)

    let inputs = boot.inputs
    syncStudio(env, inputs, boot.rig, { persist: boot.persist })
    inputs = withSeed(inputs, 864213)
    syncStudio(env, inputs, boot.rig, { persist: boot.persist })

    expect(state.stored).toBe(untouched)
    // The URL still tracked every change — that is what makes this lossless rather than lossy.
    expect(state.replaceCalls.length).toBe(2)
    expect(state.replaceCalls[1]).toContain('seed=864213')
  })

  it('leaves it byte-identical after editing devices and mood inside the shared link', () => {
    const { env, state, untouched } = visitorWithOwnStudio(shared)
    const boot = bootstrapStudio(env)

    // A full working session on somebody else's guide: add a box, move a knob, change genre.
    let inputs = boot.inputs
    for (const next of [
      withDevice(inputs, CATALOGUE.devices[0] as string, true),
      withAxis(withDevice(inputs, CATALOGUE.devices[0] as string, true), 'grit', 90),
      withTemplate(withAxis(inputs, 'darkness', 10), CATALOGUE.templates[0] as string),
    ]) {
      inputs = next
      syncStudio(env, inputs, boot.rig, { persist: boot.persist })
    }

    expect(state.stored).toBe(untouched)
    expect(state.replaceCalls.length).toBe(3)
  })

  it('does not even read storage on a valid link, let alone write it', () => {
    // Reading is harmless, but not reading is the proof that nothing about the visitor's studio
    // was consulted in producing what is on screen.
    let reads = 0
    const { env } = fakeBrowser({ search: shared })
    const counting: StudioEnv = {
      ...env,
      storage: () => ({
        getItem() {
          reads++
          return null
        },
        setItem() {
          throw new Error('a shared-link session must not write')
        },
      }),
    }
    const boot = bootstrapStudio(counting)
    expect(() => syncStudio(counting, boot.inputs, boot.rig, { persist: boot.persist })).not.toThrow()
    expect(reads).toBe(0)
  })

  it('says nothing about storage being unavailable, because it never asked', () => {
    const { env } = fakeBrowser({ search: shared, storage: 'throws' })
    const boot = bootstrapStudio(env)
    expect(boot.notices).toEqual([])
    const report = syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })
    expect(report.notice).toBeUndefined()
  })
})

describe('an ordinary session still persists', () => {
  it('writes from a root session with nothing stored', () => {
    const { env, state } = fakeBrowser()
    const boot = bootstrapStudio(env)
    expect(boot.persist).toBe(true)

    const report = syncStudio(env, withSeed(boot.inputs, 5), boot.rig, { persist: boot.persist })
    expect(report.persisted).toBe(true)
    expect(state.stored).not.toBeNull()

    const loaded = loadStudio(() => ({ getItem: () => state.stored, setItem: () => {} }), CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status === 'ok') expect(loaded.doc.inputs.seed).toBe(5)
  })

  it('writes from a session restored out of storage, keeping the rig', () => {
    const rig: StoredRigV1 = {
      id: 'local',
      name: 'Studio rack',
      devices: [{ deviceId: CATALOGUE.devices[0] as string, settings: {} }],
    }
    const { env, state } = fakeBrowser()
    state.stored = JSON.stringify(
      studioDoc({ ...DEFAULT_INPUTS, devices: [CATALOGUE.devices[0] as string] }, rig),
    )
    const before = state.stored

    const boot = bootstrapStudio(env)
    expect(boot.persist).toBe(true)
    syncStudio(env, withSeed(boot.inputs, 606), boot.rig, { persist: boot.persist })

    expect(state.stored).not.toBe(before)
    const loaded = loadStudio(() => ({ getItem: () => state.stored, setItem: () => {} }), CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.doc.inputs.seed).toBe(606)
    expect(loaded.doc.rig.name).toBe('Studio rack')
  })

  it('writes after a broken link fell through to the visitor’s own studio', () => {
    const { env, state } = fakeBrowser({ search: '?format=1&resolver=1&device=nope' })
    state.stored = JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, seed: 111 }))
    const before = state.stored

    const boot = bootstrapStudio(env)
    expect(boot.persist).toBe(true)
    syncStudio(env, withSeed(boot.inputs, 222), boot.rig, { persist: boot.persist })
    expect(state.stored).not.toBe(before)
  })
})

describe('the loaded rig survives being saved', () => {
  const rig: StoredRigV1 = {
    id: 'local',
    name: 'Studio rack',
    devices: [
      { deviceId: CATALOGUE.devices[0] as string, settings: {} },
      { deviceId: CATALOGUE.devices[1] as string, settings: {} },
    ],
  }

  it('keeps its id and name through a sync', () => {
    const { env, state } = fakeBrowser()
    syncStudio(env, DEFAULT_INPUTS, rig)
    const doc = JSON.parse(state.stored as string) as { rig: StoredRigV1 }
    expect(doc.rig.id).toBe('local')
    expect(doc.rig.name).toBe('Studio rack')
  })

  it('brings membership in line with the inputs instead of writing it back stale', () => {
    const { env, state } = fakeBrowser()
    const fewer = withDevice(DEFAULT_INPUTS, CATALOGUE.devices[1] as string, false)
    syncStudio(env, fewer, rig)

    const doc = JSON.parse(state.stored as string) as { rig: StoredRigV1 }
    expect(doc.rig.devices.map((m) => m.deviceId)).toEqual([...fewer.devices])
    expect(doc.rig.name).toBe('Studio rack')
  })

  it('survives the whole loop: boot from storage, change something, save, boot again', () => {
    const { env, state } = fakeBrowser()
    state.stored = JSON.stringify(studioDoc(DEFAULT_INPUTS, rig))

    const first = bootstrapStudio(env)
    expect(first.source).toBe('storage')

    syncStudio(env, withSeed(first.inputs, 31337), first.rig)

    // The sync wrote a URL, so a second bootstrap now takes the link — which is correct, and is
    // why the store is checked directly rather than through another bootstrap.
    const reloaded = loadStudio(() => ({ getItem: () => state.stored, setItem: () => {} }), CATALOGUE)
    expect(reloaded.status).toBe('ok')
    if (reloaded.status !== 'ok') return
    expect(reloaded.doc.rig.name).toBe('Studio rack')
    expect(reloaded.doc.inputs.seed).toBe(31337)
  })
})

describe('copy link', () => {
  it('copies the URL that is actually in the address bar', async () => {
    const { env, state } = fakeBrowser()
    syncStudio(env, withSeed(DEFAULT_INPUTS, 42), undefined)

    const result = await copyStudioLink(env)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(state.copied).toEqual([result.url])
    expect(result.url.startsWith(`${ORIGIN}/?`)).toBe(true)

    // And it is a link that works: what was copied decodes back to what is on screen.
    const decoded = decodeGuideInputs(result.url.slice(result.url.indexOf('?')), CATALOGUE)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.inputs.seed).toBe(42)
  })

  it('says so when the clipboard is not there', async () => {
    const { env } = fakeBrowser()
    const result = await copyStudioLink({ ...env, clipboard: () => undefined })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0)
  })

  it('says so when the clipboard rejects, rather than claiming success', async () => {
    const { env } = fakeBrowser()
    const rejecting: StudioEnv = {
      ...env,
      clipboard: () => ({ writeText: () => Promise.reject(new Error('not allowed')) }),
    }
    const result = await copyStudioLink(rejecting)
    expect(result.ok).toBe(false)
  })

  it('says so when the clipboard throws on access', async () => {
    const { env } = fakeBrowser()
    const hostile: StudioEnv = {
      ...env,
      clipboard: () => {
        throw new DOMException('insecure context', 'SecurityError')
      },
    }
    await expect(copyStudioLink(hostile)).resolves.toMatchObject({ ok: false })
  })

  it('does not offer a link before there is one', async () => {
    const { env } = fakeBrowser()
    const nowhere: StudioEnv = { ...env, location: () => undefined }
    const result = await copyStudioLink(nowhere)
    expect(result.ok).toBe(false)
  })
})

describe('pure updates', () => {
  it('keeps devices in registry order however they are toggled', () => {
    const first = CATALOGUE.devices[0] as string
    const last = CATALOGUE.devices[CATALOGUE.devices.length - 1] as string
    let inputs = withDevice(DEFAULT_INPUTS, first, false)
    inputs = withDevice(inputs, last, false)
    inputs = withDevice(inputs, last, true)
    inputs = withDevice(inputs, first, true)
    expect(inputs.devices).toEqual([...CATALOGUE.devices])
  })

  it('changes one thing at a time', () => {
    expect(withSeed(DEFAULT_INPUTS, 9)).toEqual({ ...DEFAULT_INPUTS, seed: 9 })
    expect(withAxis(DEFAULT_INPUTS, 'swing', 70).mood).toEqual({
      ...DEFAULT_INPUTS.mood,
      swing: 70,
    })
    expect(withTemplate(DEFAULT_INPUTS, 'x').templateId).toBe('x')
  })

  it('never mutates what it was given', () => {
    const before = JSON.stringify(DEFAULT_INPUTS)
    withSeed(DEFAULT_INPUTS, 3)
    withAxis(DEFAULT_INPUTS, 'grit', 3)
    withDevice(DEFAULT_INPUTS, CATALOGUE.devices[0] as string, false)
    expect(JSON.stringify(DEFAULT_INPUTS)).toBe(before)
  })
})

describe('nothing reaches the browser except through the env', () => {
  it('bootstrap and sync do not touch a global window', () => {
    // Node has no `window`. If either function reached for one it would throw here rather than
    // in someone's browser, which is the point of taking the browser as an argument.
    expect(typeof globalThis).toBe('object')
    expect('window' in globalThis).toBe(false)

    const spy = vi.fn()
    const { env } = fakeBrowser()
    env.history = () => ({ replaceState: spy })
    syncStudio(env, DEFAULT_INPUTS, undefined)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
