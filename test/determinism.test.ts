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

// ---------------------------------------------------------------------------
// The locale and randomness ban (§7.2)
// ---------------------------------------------------------------------------

const IMPLEMENTATION = ['resolver.ts', 'search.ts', 'pipeline.ts', 'harmony.ts']
const BANNED = ['localeCompare', 'toLocaleString', 'toLocaleDateString', 'Intl.', 'Math.random']

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
  it('matches the committed bytes exactly', () => {
    // Not a structural comparison: invariant 6 is a claim about bytes, so this compares bytes.
    // Regenerate with `npm run gen:golden` and review the diff — never to make a test pass.
    expect(goldenText()).toBe(readFileSync(GOLDEN_FILE, 'utf8'))
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
    expect(child.stdout).toBe(readFileSync(GOLDEN_FILE, 'utf8'))
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
      clockMaster: { deviceId: string; occupiedAssignables: number }
      assignments: { deviceId: string }[]
    }
    const loads = new Map<string, number>()
    for (const a of golden.assignments) loads.set(a.deviceId, (loads.get(a.deviceId) ?? 0) + 1)
    const masters = GOLDEN_DEVICES.filter((d) => d.clock.canMaster).map((d) => d.id)
    expect(masters.length).toBeGreaterThan(1)
    // Every candidate master carries the same load, so load cannot be what decided it.
    expect(new Set(masters.map((id) => loads.get(id))).size).toBe(1)
    expect(golden.clockMaster.deviceId).toBe(
      [...masters].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0],
    )
    // ...and ICU would have chosen the other one.
    expect(golden.clockMaster.deviceId).not.toBe([...masters].sort((a, b) => a.localeCompare(b))[0])
  })
})
