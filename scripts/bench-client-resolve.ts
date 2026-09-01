/**
 * #160's one cheap measurement: **how long does a client-side re-resolve actually take, in a
 * browser, on a small screen, on a slow CPU?**
 *
 * The issue's own numbers are `resolve()` called in Node on a fast desktop. §8 says the guide is
 * read *at the machine* and §8.2 says a permalink re-resolves on whatever opened it, so the
 * number that decides whether latency is a problem is the one a phone sees — not the one a Mac
 * mini sees. This harness measures the real path end to end: a hydrated page, a seed typed into
 * the field, and the guide DOM changing in response.
 *
 * **What is measured.** Wall time from dispatching the `input` event on `#seed` to the first
 * `MutationObserver` callback inside `.guide-panel`. `resolve` runs synchronously inside a
 * `useMemo` in `components/studio.tsx`, so React's commit is synchronous too and that first
 * callback fires in the microtask after it: the interval contains the search, the render and the
 * commit, and is the time-to-updated-guide a reader actually waits for. Mutations after it are
 * unrelated page activity and are not measured.
 *
 * **Seed 21 is reported on its own, and not because it is "cold".** Hydration already renders the
 * guide, so `resolve` has run before the first interaction and there is no cold-JIT story to
 * tell. Seed 21 is separated because it is the expensive case: on the 20-device rig it walks
 * 9,507 nodes against 8,217 for seed 22 and 7,507 for seed 23, so folding it into one median
 * would hide the worst case behind two cheaper ones.
 *
 * **CPU throttling is an estimate, not a phone.** `Emulation.setCPUThrottlingRate` slows this
 * machine's core by a multiplier. It does not reproduce a phone's memory bandwidth, cache,
 * thermal behaviour, GC pressure or browser engine. Treat the 4x/6x/10x rows as a bracket for
 * "several times slower than this desktop", which is what §8's target device plausibly is, and
 * not as a measurement of any real handset. A real-hardware run is still owed.
 *
 * No new dependency: Chrome is driven over CDP through node's global `WebSocket`.
 *
 *   npm run build && npm run start &
 *   npm run bench:client-resolve
 *
 *   --base <url>     server to measure (default http://127.0.0.1:3000)
 *   --reps <n>       page loads per (rig, throttle) cell (default 7)
 *   --rates <a,b,c>  CPU throttling multipliers (default 1,4,6,10)
 *   --headful        show the browser
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FORMAT_VERSION, encodeGuideInputs, type GuideInputsV1 } from '../lib/core/index'
import { DEVICES } from '../lib/devices/registry.generated'
import { CATALOGUE } from '../lib/studio/session'

/** §10's host, printed with the figures so a number is never quoted without the machine. */
const HOST = [
  'Mac mini Mac16,10 — Apple M4, 10 cores, 16 GB, macOS 26.5.2',
  'Headless desktop Chrome, 390x844 viewport (deviceScaleFactor 1, mobile emulation off)',
].join('\n  ')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** The viewport §8/#21 care about: a phone held at the machine. */
const VIEWPORT = { width: 390, height: 844 }

const LOAD_SEED = 20
const CHANGE_SEEDS = [21, 22, 23]

// ---------------------------------------------------------------------------- args

const argv = process.argv.slice(2)
function arg(name: string, fallback: string): string {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : (argv[i + 1] ?? fallback)
}
const BASE = arg('base', 'http://127.0.0.1:3000').replace(/\/$/, '')
const REPS = Number(arg('reps', '7'))
const RATES = arg('rates', '1,4,6,10').split(',').map(Number)
const HEADFUL = argv.includes('--headful')

// ---------------------------------------------------------------------------- the two rigs

function inputs(devices: readonly string[], templateId: string, seed: number): GuideInputsV1 {
  return {
    // The stamp this build writes, not a literal: a bench that pins a format goes stale the
    // moment one is added, and #310 is the bump that proved it.
    version: FORMAT_VERSION,
    devices: devices as GuideInputsV1['devices'],
    templateId: templateId as GuideInputsV1['templateId'],
    inspirations: [],
    // #310. No mood, which is what a link the studio writes carries until a knob is moved —
    // and what the resolve this measures is actually handed.
    seed,
  }
}

const ALL_DEVICES = CATALOGUE.devices
/** One box, and one that `drone-study` can actually give a part to (a bare rig assigns nothing). */
const ONE_DEVICE = ['moog-subharmonicon']

const RIGS = [
  {
    label: `${ALL_DEVICES.length}-device industrial-techno`,
    url: (seed: number) => `${BASE}/?${encodeGuideInputs(inputs(ALL_DEVICES, 'industrial-techno', seed), CATALOGUE)}`,
  },
  {
    label: `1-device drone-study (${ONE_DEVICE[0]})`,
    url: (seed: number) => `${BASE}/?${encodeGuideInputs(inputs(ONE_DEVICE, 'drone-study', seed), CATALOGUE)}`,
  },
]

// ---------------------------------------------------------------------------- CDP

type Msg = { id?: number; method?: string; params?: unknown; result?: unknown; error?: { message: string }; sessionId?: string }

class CDP {
  private ws: WebSocket
  private id = 0
  private pending = new Map<number, { ok: (v: unknown) => void; no: (e: Error) => void }>()

  private constructor(ws: WebSocket) {
    this.ws = ws
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String((event as MessageEvent).data)) as Msg
      if (msg.id === undefined) return
      const waiter = this.pending.get(msg.id)
      if (waiter === undefined) return
      this.pending.delete(msg.id)
      if (msg.error) waiter.no(new Error(msg.error.message))
      else waiter.ok(msg.result)
    })
  }

  static async connect(url: string): Promise<CDP> {
    const ws = new WebSocket(url)
    await new Promise<void>((ok, no) => {
      ws.addEventListener('open', () => ok(), { once: true })
      ws.addEventListener('error', () => no(new Error(`cannot open ${url}`)), { once: true })
    })
    return new CDP(ws)
  }

  send<T = Record<string, unknown>>(method: string, params: unknown = {}, sessionId?: string): Promise<T> {
    const id = ++this.id
    return new Promise<T>((ok, no) => {
      this.pending.set(id, { ok: ok as (v: unknown) => void, no })
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }

  close() {
    this.ws.close()
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function launchChrome(): Promise<{ proc: ChildProcess; wsUrl: string; profile: string }> {
  const profile = mkdtempSync(join(tmpdir(), 'patchnote-bench-'))
  const proc = spawn(
    CHROME,
    [
      ...(HEADFUL ? [] : ['--headless=new']),
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  const wsUrl = await new Promise<string>((ok, no) => {
    let buffer = ''
    const timer = setTimeout(() => no(new Error('Chrome did not report a debugging port')), 20_000)
    proc.stderr?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const found = /ws:\/\/[^\s]+/.exec(buffer)
      if (found) {
        clearTimeout(timer)
        ok(found[0])
      }
    })
  })
  return { proc, wsUrl, profile }
}

// ---------------------------------------------------------------------------- in-page probes

/**
 * Hydration, not load. `__reactProps$…` appears on the element only once React has attached its
 * handlers — before that the field is inert markup and typing into it measures nothing.
 */
const HYDRATED = `(() => {
  const el = document.querySelector('#seed')
  if (!el) return false
  if (!document.querySelector('.guide-panel')) return false
  return Object.keys(el).some((k) => k.startsWith('__reactProps$'))
})()`

/**
 * Set the seed the way a person does — React listens for `input` on a controlled field, so the
 * value goes through the native setter first or React's own value tracker swallows the event.
 * Resolves on the FIRST observer callback, which is the microtask after the synchronous commit.
 */
const MEASURE = (seed: number) => `new Promise((done) => {
  const input = document.querySelector('#seed')
  const guide = document.querySelector('.guide-panel')
  const observer = new MutationObserver(() => {
    const elapsed = performance.now() - t0
    observer.disconnect()
    clearTimeout(bail)
    done(elapsed)
  })
  observer.observe(guide, { subtree: true, childList: true, characterData: true, attributes: true })
  const bail = setTimeout(() => { observer.disconnect(); done(null) }, 60000)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  const t0 = performance.now()
  setter.call(input, String(${seed}))
  input.dispatchEvent(new Event('input', { bubbles: true }))
})`

// ---------------------------------------------------------------------------- run

/** Milliseconds to the first guide mutation, or `null` if the guide never changed. */
type Sample = number | null

async function evaluate<T>(cdp: CDP, session: string, expression: string, awaitPromise = false): Promise<T> {
  const res = await cdp.send<{ result: { value: T }; exceptionDetails?: { text: string } }>(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise },
    session,
  )
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text)
  return res.result.value
}

async function measureOnce(cdp: CDP, session: string, url: string, rate: number): Promise<Sample[]> {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate }, session)
  await cdp.send('Page.navigate', { url }, session)

  const deadline = Date.now() + 120_000
  for (;;) {
    if (Date.now() > deadline) throw new Error(`page never hydrated: ${url}`)
    await sleep(100)
    try {
      if (await evaluate<boolean>(cdp, session, HYDRATED)) break
    } catch {
      /* navigation in flight; the context is being replaced */
    }
  }
  // Let the post-hydration effects (bootstrap, the debounced URL write) settle so their DOM
  // work is not counted as the seed change's.
  await sleep(500)

  const samples: Sample[] = []
  for (const seed of CHANGE_SEEDS) {
    samples.push(await evaluate<Sample>(cdp, session, MEASURE(seed), true))
  }
  return samples
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]
  return { n: sorted.length, min: sorted[0], p25: at(0.25), median: at(0.5), p75: at(0.75), max: sorted[sorted.length - 1] }
}

const ms = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(0))

async function main() {
  // A 200 is not proof it is *this* app — port 3000 is popular, and a foreign server answering
  // happily is how a benchmark comes to measure somebody else's page. Look for the control.
  const health = await fetch(`${BASE}/`).catch(() => undefined)
  const body = health === undefined ? '' : await health.text()
  if (health === undefined || !health.ok) {
    console.error(`No server at ${BASE}. Run \`npm run build && npm run start\` first (or pass --base).`)
    process.exit(1)
  }
  if (!body.includes('id="seed"')) {
    console.error(`${BASE} answered, but it is not patchnote — no seed field in the markup.`)
    console.error(`Something else is on that port. Start the app elsewhere and pass --base.`)
    process.exit(1)
  }

  type Row = { rig: string; rate: number; first: number[]; rest: number[] }
  const rows: Row[] = []

  // Everything past the launch runs under `finally`: a throw anywhere in the sweep would
  // otherwise leave a headless Chrome and a multi-megabyte profile behind with nothing holding
  // a reference to either, and the next run would launch another beside it.
  const { proc, wsUrl, profile } = await launchChrome()
  /**
   * Killing Chrome and deleting the profile in the same tick does not work: `kill` only asks,
   * and Chrome writes its session files on the way out, recreating the directory behind the
   * `rmSync`. Wait for the process to actually exit first.
   */
  async function shutdown() {
    proc.kill()
    await Promise.race([
      new Promise<void>((done) => proc.once('exit', () => done())),
      sleep(5_000),
    ])
    rmSync(profile, { recursive: true, force: true })
  }

  // A sweep runs for minutes, so Ctrl-C is a likely end for it. `finally` does not run on a
  // signal, so the same cleanup is wired to one — with the same wait, on a timer, since a
  // signal handler cannot await.
  const onSignal = () => {
    proc.kill()
    setTimeout(() => {
      rmSync(profile, { recursive: true, force: true })
      process.exit(130)
    }, 1_000)
  }
  process.once('SIGINT', onSignal)
  process.once('SIGTERM', onSignal)
  try {
    const cdp = await CDP.connect(wsUrl)
    const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
    await cdp.send('Page.enable', {}, sessionId)
    await cdp.send('Runtime.enable', {}, sessionId)
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { ...VIEWPORT, deviceScaleFactor: 1, mobile: false },
      sessionId,
    )

    for (const rig of RIGS) {
      for (const rate of RATES) {
        const row: Row = { rig: rig.label, rate, first: [], rest: [] }
        for (let rep = 0; rep < REPS; rep++) {
          process.stderr.write(`  ${rig.label} @ ${rate}x  rep ${rep + 1}/${REPS}\r`)
          const samples = await measureOnce(cdp, sessionId, rig.url(LOAD_SEED), rate)
          samples.forEach((sample, i) => {
            if (sample === null) return
            ;(i === 0 ? row.first : row.rest).push(sample)
          })
        }
        rows.push(row)
        process.stderr.write(' '.repeat(60) + '\r')
      }
    }
    cdp.close()
  } finally {
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
    await shutdown()
  }

  console.log(`\nClient-side re-resolve latency — #160\n`)
  console.log(`Host\n  ${HOST}`)
  console.log(`\nMethod`)
  console.log(`  Load the seed-${LOAD_SEED} permalink, wait for React to hydrate, then set #seed to`)
  console.log(`  ${CHANGE_SEEDS.join(', ')} in turn and time until .guide-panel first mutates.`)
  console.log(`  Hydration has already rendered the guide, so resolve has run before the first`)
  console.log(`  interaction: seed ${CHANGE_SEEDS[0]} is separated because it is the most expensive of the`)
  console.log(`  three, not because it is cold. ${REPS} page loads per cell.`)
  console.log(`  CPU throttling is Chrome's Emulation.setCPUThrottlingRate — an ESTIMATE of a`)
  console.log(`  slower core, NOT a measurement on real phone hardware.\n`)

  const head = [`rig`, `cpu`, `s${CHANGE_SEEDS[0]} med`, `s${CHANGE_SEEDS[0]} min-max`, `s${CHANGE_SEEDS[1]}/${CHANGE_SEEDS[2]} med`, `p25-p75`, `min-max`]
  const widths = [42, 6, 10, 13, 14, 13, 13]
  console.log(head.map((h, i) => h.padEnd(widths[i] ?? 12)).join(''))
  console.log('-'.repeat(111))
  for (const row of rows) {
    const first = stats(row.first)
    const rest = stats(row.rest)
    console.log(
      [
        row.rig.padEnd(42),
        `${row.rate}x`.padEnd(6),
        ms(first.median).padStart(7).padEnd(10),
        `${ms(first.min)}-${ms(first.max)}`.padStart(10).padEnd(13),
        ms(rest.median).padStart(9).padEnd(14),
        `${ms(rest.p25)}-${ms(rest.p75)}`.padStart(10).padEnd(13),
        `${ms(rest.min)}-${ms(rest.max)}`.padStart(10).padEnd(13),
      ].join(''),
    )
  }
  console.log('\nAll figures milliseconds, to the first guide mutation.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
