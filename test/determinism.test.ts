import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GOLDEN_DEVICES, GOLDEN_MOOD, GOLDEN_SEED, GOLDEN_TEMPLATE } from './golden/scenario'
import { goldenText, serialise } from './golden/generate'
import { resolve } from '../lib/core/index'

/**
 * Invariant 6: same inputs + same seed + same resolver version → byte-identical guide, **on any
 * platform**. DESIGN-REVIEW.md §5 obligation 1.
 *
 * Determinism has three axes and all three are covered here or by CI:
 *  - same seed, same machine → byte-identical  (the golden comparison below)
 *  - different seed → differs only where ties existed  (`test/search.test.ts`)
 *  - different platform, same inputs → byte-identical  (`.github/workflows/verify.yml`, which
 *    runs this suite on Linux and macOS with `LANG` set to a non-`C` locale in one job; the
 *    cross-locale subprocess below reproduces the interesting half of that locally)
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')
const GENERATOR = join(HERE, 'golden', 'generate.ts')
const GOLDEN_FILE = join(HERE, 'golden', 'resolve.golden.json')

// Turkish is the classic ICU trap, and Node reads LANG/LC_ALL to pick its default locale — so
// `localeCompare()` with no argument genuinely changes answer under it.
const HOSTILE_LOCALE = 'tr_TR.UTF-8'

/**
 * §7.1. **`search.nodes` is not guide content, and invariant 6 is not about it.**
 *
 * The invariant is that the same inputs and seed produce the same *guide*: the same parts on the
 * same voices with the same values, on any platform. `nodes` is how hard the search worked to
 * get there. A sharper admissible bound reaches an identical answer from fewer nodes — that is
 * the definition of one — so pinning the count here would make every bound improvement look like
 * a determinism failure, and would tempt whoever hit it to regenerate a golden that had not
 * actually changed.
 *
 * So it is masked on **both** sides, and the committed bytes keep the count they were written
 * with. Everything else stays a byte comparison, because that is what the invariant claims.
 *
 * The count is not going unwatched. It is pinned exactly, per direction and per seed, in
 * `test/search-bound.test.ts`, and the pre-repair figure it is measured against is pinned in
 * `test/search-matching-floor.test.ts` — both of which say a change there is a failure to
 * explain rather than a number to re-record. This masks one field that is measured better
 * elsewhere; it does not stop measuring it.
 *
 * Anchored on the enclosing `"search": {`, so it can only ever match that one field. A bare
 * `"nodes"` would be a licence for the mask to spread the day something else grows the key.
 *
 * **One consequence to know about before it surprises somebody.** The committed golden keeps the
 * count it was written with, and the resolver no longer walks that many nodes, so
 * `npm run gen:golden` produces a one-line diff on `"nodes"` and nothing else. That diff is
 * meaningless in either direction — commit it or discard it, no test moves — and a diff that
 * reaches any *other* line is the thing this file exists to catch. Which is the whole point of
 * masking rather than re-recording: the golden's job is to pin the guide, and a number that
 * changes every time the bound improves was never guide content.
 */
const NODE_COUNT = /("search": \{\n\s*"nodes": )\d+/
const MASK = '<masked: pinned in test/search-bound.test.ts>'

function maskNodeCount(text: string): string {
  return text.replace(NODE_COUNT, `$1${MASK}`)
}

// ---------------------------------------------------------------------------
// The locale and randomness ban (§7.2)
// ---------------------------------------------------------------------------

const IMPLEMENTATION = [
  'resolver.ts',
  'search.ts',
  'pipeline.ts',
  'harmony.ts',
  'seed.ts',
  // §8's renderer is where a locale-aware formatter is most tempting — thousands separators on
  // a step number, a "nicely" formatted range — so it is scanned like the rest of the engine.
  'render.ts',
  // #108's whole-library reachability walk. It orders slots and would be an easy place to sort
  // "readably", and it is scanned for the same reason `arrangement.ts` is.
  'reachability.ts',
  // §6.3's band trajectory. Derivation, not rendering, and it groups and orders sections —
  // exactly the shape of code where a "tidier" sort reaches for `localeCompare`.
  'arrangement.ts',
  // §8 phase 7's FX derivation. It is the one module in the engine that changes the *case* of
  // a string, and a case fold is the same trap as a sort: `I` folds differently under a Turkish
  // locale, so a rig would be told it had effects on one machine and none on another.
  'fx.ts',
  // §8 phase 7's other derivation, added beside `fx.ts` for the same reason: it groups the
  // rig's boxes and the order it hands the renderers is the order the sentences name them in.
  'sidechain.ts',
  // §8.2's permalink codec. It is not the resolver, but it decides the *inputs* the resolver
  // runs on — including the order device ids are written in — and a locale-dependent sort there
  // would hand two platforms two different rigs from one link, which invariant 6 would then
  // faithfully render as two different guides.
  'permalink.ts',
  // §8.2's stored studio. Same argument as the codec above: it decides the inputs, including
  // the device order a saved rig comes back in.
  'studio-store.ts',
  // #155's re-strike arithmetic. It is the only module in the engine that divides, and the
  // result is printed as a decimal — so it is the obvious place for a `toFixed` or an `Intl`
  // number formatter to be reached for the next time somebody wants two decimal places.
  'timing.ts',
  // §8's phase order. Scanned rather than excluded with the other declaration-only modules:
  // it is read by renderers, which is where locale formatting creeps in, and a module that
  // costs nothing to scan is never the one worth leaving out of a ban.
  'guide.ts',
  // §5's inspiration composition. It orders the selected inspirations, orders the conflicts it
  // reports and builds the effective template the resolver then runs on — so a locale-dependent
  // sort here would hand two platforms two different templates from one selection, which
  // invariant 6 would faithfully render as two different guides.
  'inspiration.ts',
  // §4.3's authoring helpers. `variant` sorts a pattern's hits into step order, which is what
  // makes two variants written in a different group order byte-identical downstream.
  'authoring.ts',
]
const BANNED = [
  'localeCompare',
  'toLocaleString',
  'toLocaleDateString',
  // Case folding, added with `fx.ts` (#59): the locale-aware pair answers `i`/`I` differently
  // under `tr-TR`, which is the same platform split as `localeCompare` wearing another name.
  'toLocaleUpperCase',
  'toLocaleLowerCase',
  'Intl.',
  'Math.random',
]

describe('no locale-dependent or random API in the resolver (§7.2)', () => {
  // The whole implementation, not one file of it: a ban that covers only the module somebody
  // remembered to write a test for is not a ban.
  for (const file of IMPLEMENTATION) {
    it(`lib/core/${file} uses none of them`, () => {
      const source = readFileSync(join(REPO_ROOT, 'lib', 'core', file), 'utf8')
      // Comments *name* these to say why they are banned, so the scan is of code only.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      for (const banned of BANNED) expect(code).not.toContain(banned)
    })
  }

  it('covers every module the resolver is actually made of', () => {
    // If another module appears, this fails until it is added to the ban list above.
    const index = readFileSync(join(REPO_ROOT, 'lib', 'core', 'index.ts'), 'utf8')
    const exported = [...index.matchAll(/export \* from '\.\/([\w-]+)'/g)].map((m) => `${m[1]}.ts`)
    const engine = exported.filter(
      (f) => !['ids.ts', 'vocabulary.ts', 'params.ts', 'device.ts', 'template.ts', 'occupancy.ts', 'objective.ts'].includes(f),
    )
    expect(engine.sort()).toEqual([...IMPLEMENTATION].sort())
  })
})

// ---------------------------------------------------------------------------
// The golden fixture
// ---------------------------------------------------------------------------

describe('golden resolver fixture (invariant 6, obligation 1)', () => {
  it('matches the committed bytes exactly, but for the node count', () => {
    // Not a structural comparison: invariant 6 is a claim about bytes, so this compares bytes.
    // Regenerate with `npm run gen:golden` and review the diff — never to make a test pass.
    // `search.nodes` is masked on both sides and only there; `maskNodeCount` says why.
    expect(maskNodeCount(goldenText())).toBe(maskNodeCount(readFileSync(GOLDEN_FILE, 'utf8')))
  })

  it('masks the node count and nothing else', () => {
    // The mask is the one place this file stops comparing bytes, so what it covers is asserted
    // rather than trusted. A mask that quietly matched nothing would make the test above pass
    // for the wrong reason; one that matched too much would hide a real drift.
    const committed = readFileSync(GOLDEN_FILE, 'utf8')
    const masked = maskNodeCount(committed)
    const found = /("search": \{\n\s*"nodes": )(\d+)/.exec(committed)
    expect(found, 'the golden has no search.nodes to mask — has its shape moved?').not.toBeNull()
    // Putting the count back has to reproduce the committed file exactly, which is the whole
    // claim: the mask covers that number and not one byte more.
    const restored = masked.replace(MASK, (found as RegExpExecArray)[2] as string)
    expect(restored).toBe(committed)
    expect(masked.split(MASK).length - 1, 'the mask fired more than once').toBe(1)
  })

  it('is stable across repeated resolves in one process', () => {
    const once = resolve({
      devices: GOLDEN_DEVICES,
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    const twice = resolve({
      devices: GOLDEN_DEVICES,
      template: GOLDEN_TEMPLATE,
      mood: GOLDEN_MOOD,
      seed: GOLDEN_SEED,
    })
    expect(serialise(once)).toBe(serialise(twice))
  })

  it('is byte-identical under a non-C LANG', () => {
    const child = spawnSync(TSX, [GENERATOR], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
    })
    expect(child.error).toBeUndefined()
    expect(child.status, child.stderr).toBe(0)
    expect(maskNodeCount(child.stdout)).toBe(maskNodeCount(readFileSync(GOLDEN_FILE, 'utf8')))
  })

  it('actually runs the child in the hostile locale, or it proves nothing', () => {
    // Guard against a silent no-op: if Node ignored LANG, the test above would be comparing
    // two runs of the same locale and would pass whatever the resolver did.
    const probe = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(Intl.DateTimeFormat().resolvedOptions().locale)'],
      {
        encoding: 'utf8',
        env: { ...process.env, LANG: HOSTILE_LOCALE, LC_ALL: HOSTILE_LOCALE },
      },
    )
    expect(probe.stdout).toBe('tr-TR')
  })
})

describe('the golden fixture discriminates on collation', () => {
  it('contains device ids that ICU and code units order differently', () => {
    // The golden file is only a test of §7.2 if some ordering in it *would* move under a
    // locale-aware comparison. Flatten the rig's ids into one case and this fails, rather
    // than the golden quietly becoming a test of nothing.
    const ids = GOLDEN_DEVICES.map((d) => d.id)
    const byCodeUnit = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    const byCollation = [...ids].sort((a, b) => a.localeCompare(b))
    expect(byCodeUnit).not.toEqual(byCollation)
  })

  it('lets a device-id tie-break decide something the golden records', () => {
    // §7.4's tail: two devices can master, both carry three parts, both speak midi-din. Only
    // the code-unit comparison separates them, and the golden pins which one wins.
    const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')) as {
      clockSource: { deviceId: string; occupiedAssignables: number }
      assignments: { deviceId: string }[]
    }
    const loads = new Map<string, number>()
    for (const a of golden.assignments) loads.set(a.deviceId, (loads.get(a.deviceId) ?? 0) + 1)
    const masters = GOLDEN_DEVICES.filter((d) => d.clock.canSendClock).map((d) => d.id)
    expect(masters.length).toBeGreaterThan(1)
    // Every candidate master carries the same load, so load cannot be what decided it.
    expect(new Set(masters.map((id) => loads.get(id))).size).toBe(1)
    expect(golden.clockSource.deviceId).toBe(
      [...masters].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0],
    )
    // ...and ICU would have chosen the other one.
    expect(golden.clockSource.deviceId).not.toBe([...masters].sort((a, b) => a.localeCompare(b))[0])
  })
})
