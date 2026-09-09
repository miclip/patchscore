import { describe, expect, it, vi } from 'vitest'
import { decodeGuideInputs, DENSITY_DETENTS, encodeGuideInputs, FORMAT_VERSION, guideInputsFrom, loadStudio, MAX_RIG_DEVICES, RESOLVER_VERSION, STUDIO_STORAGE_KEY, studioDoc } from '../lib/core/index'
import type { GuideInputsV1, StoredRigV1 } from '../lib/core/index'
import {
  bootstrapStudio,
  CATALOGUE,
  copyStudioLink,
  createStudioSync,
  DEFAULT_INPUTS,
  derivedSeed,
  songOverrides,
  SYNC_DEBOUNCE_MS,
  syncStudio,
  effectiveMood,
  moodFromDirection,
  moodIsReaderOwned,
  withAxis,
  withoutMood,
  withBpm,
  withDevice,
  withInspiration,
  withKey,
  withPlacement,
  withRig,
  withSeed,
  withTemplate,
} from '../lib/studio/session'
import type { DownloadFile, StudioEnv, SyncReport } from '../lib/studio/session'
import { DEVICES } from '../lib/devices/registry.generated'
import { SEED_MAX, SEED_MIN } from '../lib/core/index'

/**
 * Build step 10 (#12): the browser half of the studio, with the browser injected.
 *
 * Vitest runs in `node` and stays there. Every fake below is a few lines, which is the trade
 * this design is making: narrow injected interfaces instead of a permanent jsdom dependency
 * bought to cover four `window` reads.
 */

const ORIGIN = 'https://patchscore.app'

/**
 * What Next 16's App Router keeps in `history.state` on `/`. Read off the dev build in #448:
 * the router restores a Back navigation from it, so a `replaceState(null, …)` of ours throws
 * away the router's own bookkeeping.
 */
const NEXT_HISTORY_STATE = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: ['', {}] } }

/** A location, a history and a clipboard, wired to each other the way a browser wires them. */
function fakeBrowser(
  options: {
    search?: string
    storage?: 'ok' | 'none' | 'throws'
    /** The per-tab store. `'none'`/`'throws'` are the browsers that will not give us one. */
    session?: 'ok' | 'none' | 'throws'
  } = {},
) {
  const state = {
    pathname: '/',
    search: options.search ?? '',
    stored: null as string | null,
    /** Writes attempted, not the value — the bug this counts was one of rate, not of content. */
    storeWrites: 0,
    /** Every key written to `localStorage`, so a per-tab marker landing there is a failure. */
    storeKeys: [] as string[],
    replaceCalls: [] as string[],
    /** The first argument of every `replaceState` — `null` is the #448 defect. */
    replaceStates: [] as unknown[],
    /** What the browser is holding for this entry. Next's, until something replaces it. */
    historyState: { ...NEXT_HISTORY_STATE } as unknown,
    /**
     * `sessionStorage`: per tab, survives a reload and a Back, absent in a tab opened fresh.
     * A plain map, key-agnostic on purpose — these tests assert what the studio remembers, not
     * what it calls it.
     */
    tab: new Map<string, string>(),
    copied: [] as string[],
    downloaded: [] as DownloadFile[],
    printed: 0,
  }

  const storage = {
    getItem(key: string) {
      return key === STUDIO_STORAGE_KEY ? state.stored : null
    },
    setItem(key: string, value: string) {
      state.storeKeys.push(key)
      if (key !== STUDIO_STORAGE_KEY) return
      state.storeWrites++
      state.stored = value
    },
  }

  const tabStorage = {
    getItem(key: string) {
      return state.tab.get(key) ?? null
    },
    setItem(key: string, value: string) {
      state.tab.set(key, value)
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
    session:
      options.session === 'none'
        ? () => undefined
        : options.session === 'throws'
          ? () => {
              throw new Error('session storage blocked')
            }
          : () => tabStorage,
    location: () => ({
      pathname: state.pathname,
      search: state.search,
      href: `${ORIGIN}${state.pathname}${state.search}`,
    }),
    history: () => ({
      get state() {
        return state.historyState
      },
      replaceState(data: unknown, _unused: string, url: string) {
        state.replaceCalls.push(url)
        state.replaceStates.push(data)
        // A browser replaces the entry's state wholesale. Anything the caller did not carry
        // over is gone from here on, which is exactly the loss #448 reports.
        state.historyState = data
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
    download: () => (file: DownloadFile) => {
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

describe('a drag writes once, not once per pointer move', () => {
  /**
   * The bug: `syncStudio` was called straight out of an effect keyed on the inputs, so a knob
   * drag wrote the URL and `localStorage` on every pointer move. **WebKit throws for that** —
   * Safari and every iOS browser rate-limit `history.replaceState` and raise a `SecurityError`
   * at roughly 100 calls per 30 seconds, which two seconds of dragging clears comfortably. An
   * uncaught one killed the page: "This page could not load", reported from Brave on iOS.
   *
   * Measured in the dev build beforehand, each input change produced **two** `replaceState`
   * calls — ours, and one from Next's App Router reacting to the URL we had just changed — so
   * the budget went twice as fast as the single call site suggests.
   *
   * The assertion that stops it coming back is a count, and it needs no browser: the injected
   * `HistoryLike` records every call, and fake timers drive the debounce exactly.
   *
   * A **trailing** edge is the property under test, not merely "fewer calls". A throttle at
   * 4/sec still reaches 120 in 30 seconds and would keep crashing; a trailing debounce fires
   * zero times while movement continues and once after it stops.
   */
  function draggingSync() {
    const { env, state } = fakeBrowser()
    const reports: SyncReport[] = []
    const sync = createStudioSync(env, (report) => reports.push(report))
    return { env, state, reports, sync }
  }

  it('writes nothing at all while the inputs keep changing', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      // A two-second drag at 60Hz, which is what killed the page.
      for (let i = 0; i < 120; i++) {
        sync.schedule(
          withAxis(DEFAULT_INPUTS, 'swing', i % 101, effectiveMood(DEFAULT_INPUTS)),
          undefined,
          {},
        )
        vi.advanceTimersByTime(16)
      }
      expect(state.replaceCalls).toEqual([])
      expect(state.storeWrites).toBe(0)
      expect(sync.pending()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('writes exactly once after movement stops, and writes the final inputs', () => {
    vi.useFakeTimers()
    try {
      const { state, reports, sync } = draggingSync()
      for (let i = 0; i < 120; i++) {
        sync.schedule(
          withAxis(DEFAULT_INPUTS, 'swing', i % 101, effectiveMood(DEFAULT_INPUTS)),
          undefined,
          {},
        )
        vi.advanceTimersByTime(16)
      }
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)

      expect(state.replaceCalls).toHaveLength(1)
      expect(state.storeWrites).toBe(1)
      // Not one change stale: the footer permalink and the store are the *last* thing scheduled.
      const last = withAxis(DEFAULT_INPUTS, 'swing', 119 % 101, effectiveMood(DEFAULT_INPUTS))
      expect(state.replaceCalls[0]).toBe(`/?${encodeGuideInputs(last, CATALOGUE)}`)
      expect(reports).toHaveLength(1)
      expect(reports[0]?.href).toContain(`swing=${119 % 101}`)
      expect(guideInputsFrom(JSON.parse(state.stored as string))).toEqual(last)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not swallow a single change — a typed number or a reroll still lands', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      sync.schedule(withSeed(DEFAULT_INPUTS, 4242), undefined, {})
      expect(state.replaceCalls).toEqual([])
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)
      expect(state.replaceCalls).toHaveLength(1)
      expect(state.replaceCalls[0]).toContain('seed=4242')
    } finally {
      vi.useRealTimers()
    }
  })

  it('stays quiet once it has fired, so an idle page writes nothing', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      sync.schedule(DEFAULT_INPUTS, undefined, {})
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)
      expect(state.replaceCalls).toHaveLength(1)
      expect(sync.pending()).toBe(false)
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 20)
      expect(state.replaceCalls).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('flushes a queued write immediately, which is what unmount does', () => {
    vi.useFakeTimers()
    try {
      const { state, reports, sync } = draggingSync()
      sync.schedule(withSeed(DEFAULT_INPUTS, 7), undefined, {})
      sync.flush()
      // Not lost: the last edit is written even though nobody waited out the delay.
      expect(state.replaceCalls).toHaveLength(1)
      expect(state.replaceCalls[0]).toContain('seed=7')
      expect(reports).toHaveLength(1)
      expect(sync.pending()).toBe(false)
      // And not leaked: the timer it cancelled cannot fire a second write afterwards.
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 5)
      expect(state.replaceCalls).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('flushing with nothing queued writes nothing', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      sync.flush()
      sync.flush()
      expect(state.replaceCalls).toEqual([])
      expect(state.storeWrites).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels a queued write outright, and nothing fires later', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      sync.schedule(withSeed(DEFAULT_INPUTS, 9), undefined, {})
      sync.cancel()
      expect(sync.pending()).toBe(false)
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS * 5)
      expect(state.replaceCalls).toEqual([])
      expect(state.storeWrites).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('carries each schedule’s own options, so a shared link stays read-only', () => {
    vi.useFakeTimers()
    try {
      const { state, sync } = draggingSync()
      sync.schedule(withSeed(DEFAULT_INPUTS, 3), undefined, { persist: false })
      vi.advanceTimersByTime(SYNC_DEBOUNCE_MS)
      // The address bar is canonicalised either way; the store is somebody's property.
      expect(state.replaceCalls).toHaveLength(1)
      expect(state.storeWrites).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ---------------------------------------------------------------------------

describe('the default is a constant, fit for both renders', () => {
  it('names only ids this build ships, so it always encodes', () => {
    expect(() => encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)).not.toThrow()
  })

  it('sits on the middle density detent, not on a value the control cannot produce', () => {
    // #310. Off the *effective* mood, because the default carries none of its own: the landing
    // page opens at its direction's, and the claim worth keeping is that whatever it opens at is
    // a value the detent control can actually produce.
    expect(effectiveMood(DEFAULT_INPUTS).density).toBe(DENSITY_DETENTS[1])
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
    const { env, state } = fakeBrowser({ search: `?format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&device=nope` })
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
  it('renders an older link under the current resolver rather than refusing it', () => {
    const older = link({ seed: 5 }).replace(`resolver=${RESOLVER_VERSION}`, 'resolver=0')
    const { env } = fakeBrowser({ search: older })

    const boot = bootstrapStudio(env)
    // Rendered, not refused: the inputs came through intact. That is §8.2's whole claim, and it
    // is unaffected by whether the reader is told a version changed — `decodeGuideInputs` still
    // reports the drift, and nothing renders it while the app is unshared.
    expect(boot.source).toBe('link')
    expect(boot.inputs.seed).toBe(5)
  })

  it('says a link is from a newer build rather than calling it broken', () => {
    const { env } = fakeBrowser({
      search: link().replace(`format=${FORMAT_VERSION}`, `format=${FORMAT_VERSION + 1}`),
    })
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
    // A device the default rig actually names, so the corruption lands. `CATALOGUE.devices[0]`
    // used to serve here and stopped the day the landing rig became two named boxes (#61): the
    // replace found nothing, the document stayed valid, and the test passed by doing nothing.
    state.stored = JSON.stringify(studioDoc(DEFAULT_INPUTS)).replace(
      DEFAULT_INPUTS.devices[0] as string,
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
      session: () => {
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
      withAxis(DEFAULT_INPUTS, 'grit', 80, effectiveMood(DEFAULT_INPUTS)),
      // A device the default rig has, or unchecking it is a no-op and this proves nothing.
      withDevice(DEFAULT_INPUTS, DEFAULT_INPUTS.devices[0] as string, false),
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
    const seeded = withSeed(DEFAULT_INPUTS, 99)
    const inputs = withAxis(seeded, 'darkness', 20, effectiveMood(seeded))
    syncStudio(env, inputs, undefined)

    const boot = bootstrapStudio(env)
    // `'own-link'` rather than `'link'`, and the change is the #448 fix rather than a slip: this
    // is a sync and a bootstrap in *one tab*, which is a reload, not somebody's shared link.
    // The round trip — the property this test is about — is unchanged.
    expect(boot.source).toBe('own-link')
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
      withAxis(
        withDevice(inputs, CATALOGUE.devices[0] as string, true),
        'grit',
        90,
        effectiveMood(inputs),
      ),
      withTemplate(
        withAxis(inputs, 'darkness', 10, effectiveMood(inputs)),
        CATALOGUE.templates[0] as string,
      ),
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

// ---------------------------------------------------------------------------
// #448: the studio's own URL is not somebody else's link
// ---------------------------------------------------------------------------

/**
 * The defect, in one line: the studio writes its own state into the address bar on every edit,
 * and then reads any query on `/` as a link somebody sent. So one reload turns a session
 * read-only against its own storage, silently, for the rest of its life.
 *
 * The marker cannot be `history.state` — Next 16's App Router rewrites it on mount, verified in
 * #448. It is `sessionStorage`: per tab, survives a reload and a Back, and **absent in a tab
 * opened fresh**, which is the case that has to stay read-only. The studio records the query it
 * last wrote there, and an arriving query is its own only when it matches.
 *
 * These tests reach the seam through `StudioEnv.session`, alongside `storage` and for the same
 * reason: reaching for `window.sessionStorage` can throw on access alone, so the act of getting
 * it is what gets injected.
 */
describe('the six ways to arrive at the studio (#448)', () => {
  /**
   * The issue's table, one `it` per row. Five of the six carry a query on `/` and were
   * indistinguishable before this fix; three of those five are the visitor's own session and
   * two are not.
   *
   *   1  the bare root, from the nav                    own      storage
   *   2  a reload of your own URL                       own      own-link
   *   3  a Back into your own `/?…`                     own      own-link
   *   4  a link somebody sent, in a fresh tab           theirs   link
   *   5  a foreign link pasted into your tab            theirs   link
   *   6  your own bookmark, in a fresh tab              theirs   link  (#304 wins the tie)
   *
   * A cold start is not a row here — it carries no query, so it was never in doubt, and
   * `bootstrap precedence` already covers it.
   */

  /** A rig the visitor had before this one, so `recent` has something to recover. */
  const PREVIOUS_RIG: StoredRigV1 = {
    id: 'previous',
    name: 'The old rack',
    devices: [{ deviceId: CATALOGUE.devices[1] as string, settings: {} }],
  }

  /** Somebody's own studio, on disk, with a named rig and a history worth not losing. */
  function ownDoc(over: Partial<GuideInputsV1> = {}) {
    const rig: StoredRigV1 = {
      id: 'local',
      name: 'Studio rack',
      devices: [{ deviceId: CATALOGUE.devices[0] as string, settings: {} }],
    }
    return JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, ...over }, rig, [PREVIOUS_RIG]))
  }

  /**
   * A tab opened fresh on a URL, carrying the same `localStorage` and **no** tab store — which
   * is the whole distinction this fix rests on.
   */
  function freshTab(search: string, stored: string | null) {
    const browser = fakeBrowser({ search })
    browser.state.stored = stored
    return browser
  }

  // 1 --------------------------------------------------------------------
  it('a return to the bare root restores from storage and goes on saving', () => {
    // What the nav's "Studio" link does: `/`, no query (components/site-nav.tsx).
    const { env, state } = fakeBrowser()
    state.stored = ownDoc({ seed: 111 })

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('storage')
    expect(boot.inputs.seed).toBe(111)
    expect(boot.rig?.name).toBe('Studio rack')
    expect(boot.persist).toBe(true)
  })

  // 2 --------------------------------------------------------------------
  it('a reload of your own studio is still yours, because the tab remembers the query it wrote', () => {
    const { env, state } = fakeBrowser()
    state.stored = ownDoc({ seed: 111 })

    // A session that has been running: the URL now carries what the studio put there.
    const first = bootstrapStudio(env)
    const edited = withSeed(first.inputs, 777)
    syncStudio(env, edited, first.rig, { persist: first.persist })
    expect(state.search).toContain('seed=777')

    // The reload. Same tab, same URL, a new bootstrap.
    const after = bootstrapStudio(env)

    expect(after.persist).toBe(true)
    expect(after.source).toBe('own-link')
    // The address bar wins on the inputs — it is what the guide on screen is addressed by.
    expect(after.inputs.seed).toBe(777)
    // The rig is not in a URL, so it comes back off disk rather than being lost.
    expect(after.rig?.name).toBe('Studio rack')
    expect(after.notices).toEqual([])
  })

  // 3 --------------------------------------------------------------------
  it('a Back into your own studio is still yours, a page later', () => {
    const { env, state } = fakeBrowser()
    state.stored = ownDoc({ seed: 111 })

    // Your session, running: the URL and the tab now carry what the studio wrote.
    const first = bootstrapStudio(env)
    syncStudio(env, withSeed(first.inputs, 777), first.rig, { persist: first.persist })
    const entry = { pathname: state.pathname, search: state.search, state: state.historyState }
    expect(entry.search).toContain('seed=777')

    // A device page — a real route with its own history entry, pushed by the router.
    state.pathname = '/devices/roland-tr-1000'
    state.search = ''
    state.historyState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: ['devices', {}] } }

    // Back. The browser restores the entry whole: the URL and the state that was saved with it,
    // and the tab store, which was never a history entry, is simply still there.
    state.pathname = entry.pathname
    state.search = entry.search
    state.historyState = entry.state

    const back = bootstrapStudio(env)
    expect(back.source).toBe('own-link')
    expect(back.persist).toBe(true)
    // The query is what the entry carried, so the guide is the one they left.
    expect(back.inputs.seed).toBe(777)
    // Neither the rig nor the history is in a URL: both come back off disk.
    expect(back.rig?.name).toBe('Studio rack')
    expect(back.recent.map((r) => r.name)).toEqual(['The old rack'])
    expect(back.notices).toEqual([])

    // And it saves again, which is the half of #448 the reporter actually noticed.
    const after = syncStudio(env, withSeed(back.inputs, 888), back.rig, { persist: back.persist })
    expect(after.persisted).toBe(true)
    expect(state.stored).toContain('888')
  })

  // 4 --------------------------------------------------------------------
  it('a link somebody sent, opened in a fresh tab, is still read-only (#304)', () => {
    const shared = link({ seed: 999, devices: [CATALOGUE.devices[1] as string] })
    const { env, state } = freshTab(shared, ownDoc({ seed: 111 }))
    const untouched = state.stored

    const boot = bootstrapStudio(env)
    expect(boot.source).toBe('link')
    expect(boot.persist).toBe(false)
    expect(boot.inputs.seed).toBe(999)

    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })
    expect(state.stored).toBe(untouched)
  })

  // 5 --------------------------------------------------------------------
  it('a foreign link pasted into the tab that had your studio is read-only too', () => {
    const { env, state } = fakeBrowser()
    state.stored = ownDoc({ seed: 111 })

    // Your own session, running: the tab now remembers a query.
    const mine = bootstrapStudio(env)
    syncStudio(env, withSeed(mine.inputs, 777), mine.rig, { persist: mine.persist })
    const untouched = state.stored

    // Somebody's link, pasted over it. Same tab, a query the studio never wrote.
    state.search = link({ seed: 424242, devices: [CATALOGUE.devices[1] as string] })
    const boot = bootstrapStudio(env)

    expect(boot.source).toBe('link')
    expect(boot.persist).toBe(false)
    expect(boot.inputs.seed).toBe(424242)

    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })
    expect(state.stored).toBe(untouched)
  })

  // 6 --------------------------------------------------------------------
  it('your own bookmark in a fresh tab is treated as shared, because nothing says otherwise', () => {
    /**
     * The one case that is a deliberate loss rather than a repair. A bookmark of your own studio
     * and a link a friend sent you arrive identically — a query on `/`, in a tab with no history
     * of its own — and nothing in the URL can tell them apart. #304 decides the tie: a session
     * that might be somebody else's guide does not write to your rig. The cost is that a
     * bookmarked studio opens read-only until you go to the bare root; the alternative cost is
     * silently overwriting a rig, which is the failure #304 exists to prevent.
     */
    const owner = fakeBrowser()
    owner.state.stored = ownDoc({ seed: 111 })
    const mine = bootstrapStudio(owner.env)
    syncStudio(owner.env, withSeed(mine.inputs, 777), mine.rig, { persist: mine.persist })
    const bookmarked = owner.state.search

    const { env, state } = freshTab(bookmarked, owner.state.stored)
    const untouched = state.stored
    const boot = bootstrapStudio(env)

    expect(boot.source).toBe('link')
    expect(boot.persist).toBe(false)

    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })
    expect(state.stored).toBe(untouched)
  })
})

describe('what the tab remembers, and what it must not (#448)', () => {
  it('claims nothing until it has written something — a cold start marks no tab', () => {
    const { env, state } = fakeBrowser()
    const boot = bootstrapStudio(env)

    expect(boot.source).toBe('default')
    expect(boot.persist).toBe(true)
    expect(state.tab.size).toBe(0)
  })

  it('an own session records the query it wrote, in the tab and nowhere else', () => {
    const { env, state } = fakeBrowser()
    const boot = bootstrapStudio(env)
    const report = syncStudio(env, withSeed(boot.inputs, 777), boot.rig, { persist: boot.persist })

    expect([...state.tab.values()].some((v) => v.includes('seed=777'))).toBe(true)
    // Per tab, so it cannot leak into another tab and make a shared link look like yours.
    expect(state.storeKeys).toEqual([STUDIO_STORAGE_KEY])
    expect(report.persisted).toBe(true)
  })

  it('a shared-link session records nothing, so reloading it stays read-only', () => {
    const shared = link({ seed: 999, devices: [CATALOGUE.devices[1] as string] })
    const { env, state } = fakeBrowser({ search: shared })
    state.stored = JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, seed: 111 }))
    const untouched = state.stored

    const boot = bootstrapStudio(env)
    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })
    expect(state.tab.size).toBe(0)

    // The reload. Still somebody else's guide, still not writing to this visitor's studio.
    const after = bootstrapStudio(env)
    expect(after.source).toBe('link')
    expect(after.persist).toBe(false)
    syncStudio(env, after.inputs, after.rig, { persist: after.persist })
    expect(state.stored).toBe(untouched)
  })

  it('a browser that will not give us a tab store falls back to read-only, and never throws', () => {
    for (const session of ['none', 'throws'] as const) {
      const { env, state } = fakeBrowser({ search: link({ seed: 999 }), session })
      state.stored = JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, seed: 111 }))
      const untouched = state.stored

      let boot: ReturnType<typeof bootstrapStudio> | undefined
      expect(() => {
        boot = bootstrapStudio(env)
      }).not.toThrow()
      // Unprovable ownership is not ownership: #304 is the safe answer, not the convenient one.
      expect(boot?.persist).toBe(false)
      expect(() =>
        syncStudio(env, boot!.inputs, boot!.rig, { persist: boot!.persist }),
      ).not.toThrow()
      expect(state.stored).toBe(untouched)
    }
  })

  it('a tab store that will not write does not stop the guide, or the save', () => {
    const { env, state } = fakeBrowser({ session: 'throws' })
    const boot = bootstrapStudio(env)
    // No query, so nothing about ownership was in doubt — this session owns its studio and
    // saves, whatever sessionStorage does.
    expect(boot.persist).toBe(true)
    const report = syncStudio(env, withSeed(boot.inputs, 777), boot.rig, { persist: boot.persist })
    expect(report.persisted).toBe(true)
    expect(state.stored).not.toBeNull()
  })
})

describe('the address bar is ours to write, the history entry is not (#448)', () => {
  it('keeps Next’s router state instead of replacing it with null', () => {
    const { env, state } = fakeBrowser()
    const boot = bootstrapStudio(env)
    syncStudio(env, withSeed(boot.inputs, 777), boot.rig, { persist: boot.persist })

    expect(state.replaceStates.length).toBe(1)
    expect(state.replaceStates[0]).not.toBeNull()
    // The App Router restores a Back navigation from these. Dropping them is invisible until
    // somebody presses Back.
    expect(state.historyState).toMatchObject(NEXT_HISTORY_STATE)
  })

  it('keeps it in a shared-link session too, where the URL is still canonicalised', () => {
    const { env, state } = fakeBrowser({ search: link({ seed: 999 }) })
    const boot = bootstrapStudio(env)
    syncStudio(env, boot.inputs, boot.rig, { persist: boot.persist })

    expect(state.historyState).toMatchObject(NEXT_HISTORY_STATE)
  })

  it('keeps whatever the router put there next, rather than a snapshot taken once', () => {
    const { env, state } = fakeBrowser()
    const boot = bootstrapStudio(env)
    syncStudio(env, withSeed(boot.inputs, 777), boot.rig, { persist: boot.persist })

    // The router re-writes its own state as the app navigates; the next sync must carry the
    // state that is there *now*, not the one this module saw first.
    state.historyState = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: ['', { moved: true }] } }
    syncStudio(env, withSeed(boot.inputs, 778), boot.rig, { persist: boot.persist })

    expect(state.historyState).toMatchObject({
      __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: ['', { moved: true }] },
    })
  })
})

describe('the #448 reproduction, end to end', () => {
  /**
   * The three phases from the issue, as one test. Phase A persists today; phase B is where a
   * reloaded session stopped writing, and phase C is what the reporter actually saw — "studio
   * loses track of the rig and seed when you return to it".
   */
  it('a reloaded session goes on saving, and a walk to another page and back finds it', () => {
    const { env, state } = fakeBrowser()

    // Phase A: a bare `/`, clean storage, one edit. This has always worked.
    const first = bootstrapStudio(env)
    const a = withSeed(first.inputs, 1111)
    syncStudio(env, a, first.rig, { persist: first.persist })
    expect(loadStudio(() => ({ getItem: () => state.stored, setItem: () => {} }), CATALOGUE)).toMatchObject({
      status: 'ok',
    })
    expect(state.stored).toContain('1111')

    // Phase B: the reload, then another edit. The screen and the store must agree.
    const reloaded = bootstrapStudio(env)
    expect(reloaded.persist).toBe(true)
    const b = withDevice(withSeed(reloaded.inputs, 2222), CATALOGUE.devices[0] as string, true)
    const report = syncStudio(env, b, reloaded.rig, { persist: reloaded.persist })
    expect(report.persisted).toBe(true)

    const stored = loadStudio(() => ({ getItem: () => state.stored, setItem: () => {} }), CATALOGUE)
    expect(stored.status).toBe('ok')
    const onDisk = stored.status === 'ok' ? guideInputsFrom(stored.doc) : undefined
    expect(onDisk?.seed).toBe(2222)
    expect(onDisk?.devices).toEqual(b.devices)

    // Phase C: a device page, then "Studio" in the nav — a bare `/`, query dropped.
    state.search = ''
    const back = bootstrapStudio(env)
    expect(back.source).toBe('storage')
    expect(back.inputs.seed).toBe(2222)
    expect(back.inputs.devices).toEqual(b.devices)
    expect(back.persist).toBe(true)
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
    const { env, state } = fakeBrowser({ search: `?format=${FORMAT_VERSION}&resolver=${RESOLVER_VERSION}&device=nope` })
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
    // Cleared, then switched back on in *reverse* registry order, so the assertion is about
    // the ordering rather than about the sequence they arrived in. Written over the whole
    // catalogue rather than over its first and last entries: that shorter form only reached
    // every device while the registry happened to hold the landing pair plus two, and it
    // stopped testing anything the moment a fifth device landed.
    //
    // #301. A full rig rather than the whole catalogue: `withDevice` now refuses past
    // `MAX_RIG_DEVICES`, so ticking all 46 would be testing the cap instead of the ordering.
    // The rig is taken from the *end* of the registry so that reversing it is still a genuine
    // reordering rather than the registry order arriving by luck.
    const rig = [...CATALOGUE.devices].slice(-MAX_RIG_DEVICES)
    let inputs = DEFAULT_INPUTS
    for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, false)
    expect(inputs.devices).toEqual([])
    for (const id of [...rig].reverse()) inputs = withDevice(inputs, id as string, true)
    expect(inputs.devices).toEqual(rig)
  })

  /**
   * #301. The ceiling, and the two halves that make it usable rather than merely present.
   *
   * The search never needed it — the worst rig anyone can build measures 4% of the node cap. What
   * it removes is the standing question, which had cost three separate pieces of work: a
   * whole-catalogue sweep reports a figure near the cap, and that figure kept being read as a
   * limit the product was approaching. A rig that size is now unreachable, so the reading is not
   * available.
   */
  describe('a rig has a ceiling (#301)', () => {
    it('refuses the eleventh device and leaves the inputs untouched', () => {
      let inputs = DEFAULT_INPUTS
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, false)
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, true)
      expect(inputs.devices).toHaveLength(MAX_RIG_DEVICES)

      const full = inputs
      const spare = CATALOGUE.devices.find((id) => !full.devices.includes(id))
      expect(spare).toBeDefined()
      // Not merely ignored — the same object back, so nothing downstream re-renders or re-resolves.
      expect(withDevice(full, spare as string, true)).toBe(full)
    })

    it('always lets you untick, so a full rig is never stuck', () => {
      let inputs = DEFAULT_INPUTS
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, false)
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, true)
      const first = inputs.devices[0] as string
      const dropped = withDevice(inputs, first, false)
      expect(dropped.devices).toHaveLength(MAX_RIG_DEVICES - 1)
      // And the freed slot is usable, which is what makes swapping a box possible at the cap.
      const spare = CATALOGUE.devices.find((id) => !dropped.devices.includes(id)) as string
      expect(withDevice(dropped, spare, true).devices).toHaveLength(MAX_RIG_DEVICES)
    })

    it('re-ticking a device already in the rig is not a new device', () => {
      let inputs = DEFAULT_INPUTS
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, false)
      for (const id of CATALOGUE.devices) inputs = withDevice(inputs, id as string, true)
      const present = inputs.devices[2] as string
      expect(withDevice(inputs, present, true).devices).toEqual(inputs.devices)
    })
  })

  it('changes one thing at a time', () => {
    expect(withSeed(DEFAULT_INPUTS, 9)).toEqual({ ...DEFAULT_INPUTS, seed: 9 })
    // #310. One axis moves; the other four arrive from the effective mood, because this is the
    // edit that takes the whole state off the direction.
    expect(withAxis(DEFAULT_INPUTS, 'swing', 70, effectiveMood(DEFAULT_INPUTS)).mood).toEqual({
      ...effectiveMood(DEFAULT_INPUTS),
      swing: 70,
    })
    expect(withTemplate(DEFAULT_INPUTS, 'x').templateId).toBe('x')
  })

  it('never mutates what it was given', () => {
    const before = JSON.stringify(DEFAULT_INPUTS)
    withSeed(DEFAULT_INPUTS, 3)
    withAxis(DEFAULT_INPUTS, 'grit', 3, effectiveMood(DEFAULT_INPUTS))
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

// ---------------------------------------------------------------------------
// The landing rig, and saying it is one (#61)
// ---------------------------------------------------------------------------

describe('the starter example (#61)', () => {
  function otherTemplate(): string {
    const other = CATALOGUE.templates.find((id) => id !== DEFAULT_INPUTS.templateId)
    if (other === undefined) throw new Error('this build ships only one template')
    return other
  }

  it('lands on exactly two boxes — a groovebox and a drum machine', () => {
    // The pair is named, so name it here: a test that recomputed it from the same constant
    // would agree with any typo. Adding a fifth manifest must not change this line.
    expect(DEFAULT_INPUTS.devices).toEqual(['polyend-tracker-mini', 'roland-tr-1000'])

    // Two, not all of them. "Every device checked" is the thing #61 exists to end: it presumes
    // the visitor owns the shop, and it grew on its own every time a manifest was authored.
    expect(DEFAULT_INPUTS.devices).toHaveLength(2)
    expect(DEFAULT_INPUTS.devices.length).toBeLessThan(CATALOGUE.devices.length)

    // Both are real, and in registry order (§7.2) — the filter through the catalogue is what
    // guarantees the second, and this is what would catch a typo in the constant.
    for (const id of DEFAULT_INPUTS.devices) expect(CATALOGUE.devices).toContain(id)
    expect(DEFAULT_INPUTS.devices).toEqual(
      CATALOGUE.devices.filter((id) => DEFAULT_INPUTS.devices.includes(id)),
    )

    // And the split that makes the pair legible: the drum machine takes percussion, the other
    // box is not one, so the first guide a visitor reads distributes parts across two boxes.
    const kinds = DEFAULT_INPUTS.devices.map(
      (id) => DEVICES.find((d) => d.id === id)?.kind,
    )
    expect(kinds).toContain('drum-machine')
    expect(new Set(kinds).size).toBe(2)

    // The direction is unchanged, and still named rather than "whichever sorts first".
    expect(DEFAULT_INPUTS.templateId).toBe('industrial-techno')
  })

  it('is the smallest rig that has anything to say about clock and routing', () => {
    // Why two and not one: a single box has no clock source to choose among and nothing for the
    // rack to cable. Both default boxes can take a clock, and at least one can send one.
    const chosen = DEVICES.filter((d) => DEFAULT_INPUTS.devices.includes(d.id))
    expect(chosen).toHaveLength(2)
    expect(chosen.some((d) => d.clock.canSendClock)).toBe(true)
    expect(chosen.filter((d) => d.clock.canReceiveClock).length).toBeGreaterThan(0)
  })


})

// ---------------------------------------------------------------------------
// The derived default seed (#127)
// ---------------------------------------------------------------------------

describe('the default seed is derived from the rig and the direction (#127)', () => {
  /**
   * The landing default, pinned to a number rather than recomputed.
   *
   * A test that called `derivedSeed` with the same arguments would agree with any change to the
   * derivation, which is the one thing this must not do: the hash has to give the same answer on
   * a laptop and on CI, today and in a year, or a permalink minted now renders a different guide
   * later. So the expected value is committed, and moving it is a deliberate edit to a golden
   * number rather than a silent re-derivation. If this line fails, either the serialization
   * changed — invariant 6, look hard — or the landing rig did, which is #61's constant.
   */
  const LANDING_SEED = 886660323

  it('pins the landing default to a committed value', () => {
    expect(derivedSeed(['polyend-tracker-mini', 'roland-tr-1000'], 'industrial-techno')).toBe(
      LANDING_SEED,
    )
    expect(DEFAULT_INPUTS.seed).toBe(LANDING_SEED)
    // And it is no longer the constant every rig in the library used to share.
    expect(DEFAULT_INPUTS.seed).not.toBe(1)
  })

  it('does not depend on the order the devices were ticked', () => {
    // The rig is a set. Ticking the Tracker Mini first and ticking the TR-1000 first are the
    // same rig, and two seeds would be two identities with two permalinks.
    expect(derivedSeed(['roland-tr-1000', 'polyend-tracker-mini'], 'industrial-techno')).toBe(
      LANDING_SEED,
    )

    // Not just the pair: every ordering of a wider rig, on every direction this build ships.
    const four = CATALOGUE.devices.slice(0, 4)
    const orderings = [
      four,
      [...four].reverse(),
      [four[1], four[3], four[0], four[2]] as string[],
      [four[2], four[0], four[3], four[1]] as string[],
    ]
    for (const templateId of CATALOGUE.templates) {
      const seeds = new Set(orderings.map((order) => derivedSeed(order, templateId)))
      expect(seeds.size).toBe(1)
    }
  })

  it('sorts by code unit, not by locale', () => {
    // `-` is code unit 45 and `b` is 98, so a code-unit sort puts `a-b` first. ICU collation
    // ignores the punctuation and can order these the other way, which is exactly the kind of
    // difference that shows up on CI and nowhere else (CLAUDE.md, "two rules easy to break").
    const sorted = derivedSeed(['a-b', 'ab'], 'industrial-techno')
    const reversed = derivedSeed(['ab', 'a-b'], 'industrial-techno')
    expect(sorted).toBe(reversed)
    expect(sorted).toBe(derivedSeed(['a-b', 'ab'].slice().sort(), 'industrial-techno'))
  })

  it('does not mutate the caller\'s list', () => {
    // `sort` sorts in place, and the array handed in is the studio's own `inputs.devices`.
    const devices = ['roland-tr-1000', 'polyend-tracker-mini']
    derivedSeed(devices, 'industrial-techno')
    expect(devices).toEqual(['roland-tr-1000', 'polyend-tracker-mini'])
  })

  it('cannot be pushed out of the seed field\'s domain', () => {
    // `components/seed-field.tsx` and `lib/core/permalink.ts` share this range. A derived
    // default outside it is a disagreement with no error path: a link the app minted itself
    // that the app then refuses to read.
    const rigs: readonly string[][] = [
      [],
      [CATALOGUE.devices[0] as string],
      [...CATALOGUE.devices],
      ['\u0000', '\uffff', 'a'.repeat(500)],
    ]
    for (const devices of rigs) {
      for (const templateId of [...CATALOGUE.templates, '', 'no-such-direction']) {
        const seed = derivedSeed(devices, templateId)
        expect(Number.isInteger(seed)).toBe(true)
        expect(seed).toBeGreaterThanOrEqual(SEED_MIN)
        expect(seed).toBeLessThanOrEqual(SEED_MAX)
      }
    }
  })

  it('gives each rig and direction its own starting point', () => {
    // The point of #127: one arbitrary seed shared by the whole library made the variety the
    // engine exists for invisible. Collisions are possible in principle — this is a 32-bit hash
    // folded into a billion — but not between the pairs a visitor actually meets first.
    const seeds = new Set<number>()
    for (const templateId of CATALOGUE.templates) {
      seeds.add(derivedSeed(DEFAULT_INPUTS.devices, templateId))
      seeds.add(derivedSeed([CATALOGUE.devices[0] as string], templateId))
      seeds.add(derivedSeed([...CATALOGUE.devices], templateId))
    }
    expect(seeds.size).toBe(CATALOGUE.templates.length * 3)
  })

  it('serializes unambiguously, so two different rigs cannot hash alike', () => {
    // Length prefixes are what buy this. Concatenated, both of these are `abc`.
    expect(derivedSeed(['ab', 'c'], 'industrial-techno')).not.toBe(
      derivedSeed(['a', 'bc'], 'industrial-techno'),
    )
    // And the labels are what keep the device list from running into the template id.
    expect(derivedSeed(['a'], 'bc')).not.toBe(derivedSeed(['a', 'b'], 'c'))
  })

  it('leaves an explicit seed alone, wherever it came from', () => {
    // Only the *default* moves. A link carrying a seed still wins, and so does a reroll.
    const explicit = encodeGuideInputs({ ...DEFAULT_INPUTS, seed: 4242 }, CATALOGUE)
    const { env } = fakeBrowser({ search: `?${explicit}` })
    expect(bootstrapStudio(env).inputs.seed).toBe(4242)
    expect(withSeed(DEFAULT_INPUTS, 7).seed).toBe(7)
  })

  it('is the same answer every time it is asked', () => {
    // Invariant 6 at its narrowest: no hidden state, nothing accumulating between calls.
    const once = derivedSeed(DEFAULT_INPUTS.devices, DEFAULT_INPUTS.templateId)
    for (let i = 0; i < 50; i++) {
      expect(derivedSeed(DEFAULT_INPUTS.devices, DEFAULT_INPUTS.templateId)).toBe(once)
    }
  })
})

// ---------------------------------------------------------------------------
// #161 Tempo and key, held by the session
// ---------------------------------------------------------------------------

/**
 * The two settings the studio makes *for* the user until #161's controls land. Nothing here
 * builds a control; what it pins is that once a value is in the inputs it survives everything
 * else the studio can do to them, on the URL and on disk.
 *
 * Sticky is the whole design: changing direction or adding an influence must not move a number
 * somebody typed. `resolve` reports it if it now sits outside what the direction offers.
 */
describe('the song overrides the session carries (#161)', () => {
  const other = CATALOGUE.inspirations[0]
  const set = withKey(withBpm(DEFAULT_INPUTS, 70), 'C# dorian')

  it('starts unset, so a first visit is the guide it was before', () => {
    expect(DEFAULT_INPUTS.bpm).toBeUndefined()
    expect(DEFAULT_INPUTS.key).toBeUndefined()
    expect(songOverrides(DEFAULT_INPUTS)).toEqual({ bpm: undefined, key: undefined })
  })

  it('sets each one, and hands each one back', () => {
    expect(withBpm(DEFAULT_INPUTS, 140).bpm).toBe(140)
    expect(withKey(DEFAULT_INPUTS, 'A minor').key).toBe('A minor')
    expect(songOverrides(set)).toEqual({ bpm: 70, key: 'C# dorian' })

    // Cleared back to "follow the direction" — absent, not present-and-undefined.
    const cleared = withKey(withBpm(set, undefined), undefined)
    expect(Object.hasOwn(cleared, 'bpm')).toBe(false)
    expect(Object.hasOwn(cleared, 'key')).toBe(false)
    expect(cleared).toEqual(DEFAULT_INPUTS)
  })

  it('answers an impossible edit with no edit, rather than with a different one', () => {
    // The typo guard, not taste: 1-999. A clamp would be the studio choosing a tempo.
    for (const bpm of [0, -1, 1000, 1.5, Number.NaN]) {
      expect(withBpm(set, bpm)).toBe(set)
    }
    for (const key of ['H minor', 'A', 'a minor', '']) {
      expect(withKey(set, key)).toBe(set)
    }
  })

  it('keeps both across every other edit the studio can make', () => {
    const direction = CATALOGUE.templates.find((id) => id !== set.templateId) as string
    const device = CATALOGUE.devices.find((id) => !set.devices.includes(id)) as string

    const moved = [
      withTemplate(set, direction),
      withDevice(set, device, true),
      withSeed(set, 12345),
      withAxis(set, 'density', 100, effectiveMood(set)),
      ...(other === undefined ? [] : [withInspiration(set, other, true)]),
    ]
    // Changing direction is exactly the case where a range moves under the number. It stays.
    for (const inputs of moved) expect(songOverrides(inputs)).toEqual({ bpm: 70, key: 'C# dorian' })
    expect(moved[0]?.templateId).toBe(direction)
  })

  it('survives the URL: written, read back, and resolved from the link', () => {
    const { env, state } = fakeBrowser()
    syncStudio(env, set, undefined)
    expect(state.replaceCalls[0]).toContain('bpm=70')
    expect(state.replaceCalls[0]).toContain('key=C%23%20dorian')

    const back = decodeGuideInputs(state.search, CATALOGUE)
    expect(back.ok).toBe(true)
    if (back.ok) expect(back.inputs).toEqual(set)
  })

  it('survives a reload: stored, and read back off the document', () => {
    const doc = studioDoc(set)
    expect(guideInputsFrom(doc)).toEqual(set)

    const { env, state } = fakeBrowser()
    syncStudio(env, set, undefined)
    const loaded = loadStudio(env.storage, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(guideInputsFrom(loaded.doc)).toEqual(set)
    expect(state.stored).toContain('"bpm":70')
  })

  it('leaves a studio stored before #161 valid, with both unset', () => {
    // The reason `STUDIO_DOC_VERSION` did not move: the fields are optional, so a document
    // already on disk is still a document this build reads.
    const { env } = fakeBrowser()
    syncStudio(env, DEFAULT_INPUTS, undefined)
    const stored = JSON.parse(loadStudioText(env)) as { inputs: Record<string, unknown> }
    expect(Object.hasOwn(stored.inputs, 'bpm')).toBe(false)
    expect(Object.hasOwn(stored.inputs, 'key')).toBe(false)

    const loaded = loadStudio(env.storage, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(guideInputsFrom(loaded.doc)).toEqual(DEFAULT_INPUTS)
  })

  it('opens a link that carries them, from cold', () => {
    const { env } = fakeBrowser({ search: `?${encodeGuideInputs(set, CATALOGUE)}` })
    const boot = bootstrapStudio(env)
    expect(boot.inputs).toEqual(set)
    expect(boot.notices).toEqual([])
  })
})

/** The stored JSON, read back through the same storage the env writes to. */
function loadStudioText(env: StudioEnv): string {
  const storage = env.storage()
  return storage?.getItem(STUDIO_STORAGE_KEY) ?? ''
}

/**
 * #161. The one asymmetry in the key's handling, and it is deliberate: the controls refuse what
 * they cannot read, the boundaries carry it. A link and a stored studio are hand-editable and
 * arrive from anywhere, so refusing there costs a reader their whole guide over one field that
 * the resolver can report and work around (§5.6).
 */
describe('an unreadable key keeps its guide (#161)', () => {
  const hostile = { ...DEFAULT_INPUTS, key: 'H minor' }

  it('is refused by the setter, which is the parse gate the controls sit behind', () => {
    expect(withKey(DEFAULT_INPUTS, 'H minor')).toBe(DEFAULT_INPUTS)
  })

  it('opens from a link instead of falling back to the defaults', () => {
    const { env } = fakeBrowser({ search: `?${encodeGuideInputs(hostile, CATALOGUE)}` })
    const boot = bootstrapStudio(env)
    expect(boot.inputs).toEqual(hostile)
    expect(boot.notices).toEqual([])
  })

  it('loads from storage instead of being reported as a corrupt studio', () => {
    const { env } = fakeBrowser()
    syncStudio(env, hostile, undefined)
    const loaded = loadStudio(env.storage, CATALOGUE)
    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(guideInputsFrom(loaded.doc).key).toBe('H minor')
  })
})

/**
 * §8.2/#304. Swapping the whole rig for one the visitor had before.
 *
 * `withRig` is the only path in the app that may hand the resolver more than `MAX_RIG_DEVICES`,
 * and that is the point rather than an oversight — see the note on the function.
 */
describe('restoring a remembered rig (#304)', () => {
  const rigOf = (ids: readonly string[], clockSourceId?: string): StoredRigV1 => ({
    id: 'local',
    name: 'My rig',
    devices: ids.map((deviceId) => ({ deviceId, settings: {} })),
    ...(clockSourceId === undefined ? {} : { clockSourceId }),
  })

  it('replaces the rig rather than merging into it', () => {
    // A remembered rig is a rig somebody had. Merging would produce a third rig nobody chose.
    const start = withDevice(DEFAULT_INPUTS, CATALOGUE.devices[0] as string, true)
    const wanted = [CATALOGUE.devices[5], CATALOGUE.devices[7]] as string[]
    const after = withRig(start, rigOf(wanted))
    expect(after.devices).toEqual(wanted)
  })

  it('puts the devices in registry order, whatever order the rig stored them in', () => {
    const wanted = [CATALOGUE.devices[7], CATALOGUE.devices[2]] as string[]
    const after = withRig(DEFAULT_INPUTS, rigOf(wanted))
    expect(after.devices).toEqual([CATALOGUE.devices[2], CATALOGUE.devices[7]])
  })

  it('brings the clock source with it, and drops one the rig does not contain', () => {
    const ids = [CATALOGUE.devices[1], CATALOGUE.devices[3]] as string[]
    expect(withRig(DEFAULT_INPUTS, rigOf(ids, ids[1])).clockSourceId).toBe(ids[1])
    // A hand-edited document could name a leader outside its own rig; this is the last gate.
    expect(withRig(DEFAULT_INPUTS, rigOf(ids, CATALOGUE.devices[9] as string)).clockSourceId).toBeUndefined()
  })

  it('clears a clock source the previous rig had and this one does not name', () => {
    const first = [CATALOGUE.devices[1], CATALOGUE.devices[3]] as string[]
    const withClock = withRig(DEFAULT_INPUTS, rigOf(first, first[0]))
    expect(withClock.clockSourceId).toBe(first[0])
    const swapped = withRig(withClock, rigOf([CATALOGUE.devices[6]] as string[]))
    expect(swapped.clockSourceId).toBeUndefined()
  })

  /**
   * #301. The cap is a picker rule, not a format rule. A rig stored before it existed is still
   * what somebody built, so restoring it loads it whole — and the picker simply refuses to add
   * an eleventh afterwards.
   */
  it('restores a rig larger than the picker would now build, and then refuses to grow it', () => {
    const big = CATALOGUE.devices.slice(0, MAX_RIG_DEVICES + 3) as string[]
    const restored = withRig(DEFAULT_INPUTS, rigOf(big))
    expect(restored.devices).toHaveLength(MAX_RIG_DEVICES + 3)

    const spare = CATALOGUE.devices.find((id) => !restored.devices.includes(id)) as string
    expect(withDevice(restored, spare, true)).toBe(restored)
    // And unticking still works, so an oversized rig is not stuck.
    expect(withDevice(restored, big[0] as string, false).devices).toHaveLength(
      MAX_RIG_DEVICES + 2,
    )
  })
})

/**
 * §7.5/#340. `withPlacement` is the input edit behind "put this part on that box". The resolver
 * half — what an accepted placement does to the allocation, and how a refused one is reported —
 * lives in `test/placements.test.ts`; what is asserted here is only the shape of the inputs it
 * writes, because that shape is what a permalink carries.
 */
describe('withPlacement', () => {
  const inputs: GuideInputsV1 = { ...DEFAULT_INPUTS, devices: [...DEFAULT_INPUTS.devices] }

  it('sets a placement where the inputs carried none', () => {
    const set = withPlacement(inputs, 'r-kick', 'roland-tr-1000')
    expect(set.placements).toEqual([{ requestId: 'r-kick', deviceId: 'roland-tr-1000' }])
    expect(songOverrides(set).placements).toEqual(set.placements)
    // The call is not an edit in place: the inputs it was handed still carry nothing.
    expect(inputs.placements).toBeUndefined()
  })

  it('replaces the box for a request rather than adding a second', () => {
    // One box per part. Two placements for one request could not both hold, so a caller naming
    // another box is moving the part, not asking for both.
    const moved = withPlacement(
      withPlacement(inputs, 'r-kick', 'roland-tr-1000'),
      'r-kick',
      'elektron-digitakt-ii',
    )
    expect(moved.placements).toEqual([{ requestId: 'r-kick', deviceId: 'elektron-digitakt-ii' }])
  })

  it('holds several placements in code unit order however they were set', () => {
    const written = withPlacement(
      withPlacement(withPlacement(inputs, 'r-sub', 'synthstrom-deluge'), 'r-kick', 'roland-tr-1000'),
      'r-hats',
      'elektron-digitakt-ii',
    )
    expect(written.placements).toEqual([
      { requestId: 'r-hats', deviceId: 'elektron-digitakt-ii' },
      { requestId: 'r-kick', deviceId: 'roland-tr-1000' },
      { requestId: 'r-sub', deviceId: 'synthstrom-deluge' },
    ])
    // The same order the encoder writes (§8.2), so the inputs a caller holds and the link they
    // copy agree, and a different click order is the same set and the same bytes.
    const other = withPlacement(
      withPlacement(withPlacement(inputs, 'r-kick', 'roland-tr-1000'), 'r-hats', 'elektron-digitakt-ii'),
      'r-sub',
      'synthstrom-deluge',
    )
    expect(other.placements).toEqual(written.placements)
    expect(encodeGuideInputs(other, CATALOGUE)).toBe(encodeGuideInputs(written, CATALOGUE))
  })

  it('clears one placement and leaves the rest standing', () => {
    const both = withPlacement(withPlacement(inputs, 'r-kick', 'roland-tr-1000'), 'r-sub', 'synthstrom-deluge')
    const one = withPlacement(both, 'r-kick', undefined)
    expect(one.placements).toEqual([{ requestId: 'r-sub', deviceId: 'synthstrom-deluge' }])
  })

  it('removes the field when the last placement is cleared, rather than leaving it empty', () => {
    // Absent and empty are one state for every list in the format: a guide that places nothing
    // writes no placement field, and that is how it reads back.
    const cleared = withPlacement(withPlacement(inputs, 'r-kick', 'roland-tr-1000'), 'r-kick', undefined)
    expect('placements' in cleared).toBe(false)
    expect(encodeGuideInputs(cleared, CATALOGUE)).toBe(encodeGuideInputs(inputs, CATALOGUE))
  })

  it('is a no-op on a request that has no placement', () => {
    expect('placements' in withPlacement(inputs, 'r-kick', undefined)).toBe(false)
  })

  it('leaves every other input alone', () => {
    const rich: GuideInputsV1 = { ...inputs, bpm: 132, key: 'F minor', clockSourceId: 'roland-tr-1000', seed: 4 }
    const set = withPlacement(rich, 'r-kick', 'synthstrom-deluge')
    const { placements: _placed, ...rest } = set
    expect(rest).toEqual(rich)
  })
})

/**
 * §6/#504. Handing the knobs back to the direction.
 *
 * The reset target is a *state the inputs can be in* rather than five numbers, which is what
 * makes these assertions worth having: dropping `mood` and writing the direction's values into
 * it look identical on `hip-hop` today and diverge the moment §5 grows a mood patch.
 */
describe('mood reset (§6/#504)', () => {
  const hipHop: GuideInputsV1 = { ...DEFAULT_INPUTS, templateId: 'hip-hop' }

  it('reports nothing to reset until the reader owns the mood', () => {
    expect(moodIsReaderOwned(hipHop)).toBe(false)
    const twisted = withAxis(hipHop, 'darkness', 20, effectiveMood(hipHop))
    expect(moodIsReaderOwned(twisted)).toBe(true)
    expect(moodIsReaderOwned(withoutMood(twisted))).toBe(false)
  })

  it('restores the direction it opened at, not the centre', () => {
    // hip-hop opens at swing 65. Centring it would leave a reader holding a different direction.
    expect(effectiveMood(hipHop).swing).toBe(65)
    const twisted = withAxis(hipHop, 'swing', 10, effectiveMood(hipHop))
    expect(effectiveMood(twisted).swing).toBe(10)
    expect(effectiveMood(withoutMood(twisted)).swing).toBe(65)
  })

  it('drops the key rather than writing the direction values in', () => {
    const twisted = withAxis(hipHop, 'grit', 80, effectiveMood(hipHop))
    expect('mood' in twisted).toBe(true)
    const reset = withoutMood(twisted)
    expect('mood' in reset).toBe(false)
    // The permalink shortens back to what it was, rather than carrying five equal numbers.
    expect(encodeGuideInputs(reset, CATALOGUE)).toBe(encodeGuideInputs(hipHop, CATALOGUE))
  })

  it('hands #317 its credit back', () => {
    // A twisted axis is the reader's and is not credited; after the reset it is the direction's.
    const twisted = withAxis(hipHop, 'swing', 10, effectiveMood(hipHop))
    expect(moodFromDirection(twisted).swing).toBeUndefined()
    expect(moodFromDirection(withoutMood(twisted)).swing).toBe(65)
  })

  it('leaves everything that is not mood alone', () => {
    const busy = withSeed(withAxis(hipHop, 'space', 12, effectiveMood(hipHop)), 4242)
    const reset = withoutMood(busy)
    expect(reset.seed).toBe(4242)
    expect(reset.templateId).toBe('hip-hop')
    expect(reset.devices).toEqual(busy.devices)
  })
})
