import { readFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { StorageLike, StoredRigV1, StudioLoad } from '../lib/core'
import { STUDIO_STORAGE_KEY, loadStudio, studioDoc } from '../lib/core'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import { rigFromIds, rigFromStudio, rigIdsFromStudio } from '../lib/studio/borrowed-rig'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * §3.8/§8.2/#448/#520. **A sound page borrows the reader's rig and never writes it back.**
 *
 * `test/riff-storage.test.ts`' claim, made again against this route's own files, and made again
 * rather than assumed: the two pages share `borrowed-rig.ts`, but they do not share their
 * components, and the failure this guards against is a *later* edit to one of them reaching for
 * `createStudioSync` because it is right there in `session.ts`.
 *
 * #448 is the reason it matters here in particular. A link session — somebody following a
 * `/samples/kick` link from anywhere — must never write to the visitor's studio: they arrived to
 * look at one sound, and silently rewriting the rig they had built because they ticked a box to
 * see whether their sampler could make it would be the worst kind of surprise, invisible and only
 * discovered later.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(HERE, '..')

const FIRST = DEVICES[0]?.id
const SECOND = DEVICES[1]?.id
if (FIRST === undefined || SECOND === undefined) throw new Error('empty registry')

/** A `localStorage` whose writes are a test failure rather than a value to inspect. */
function readOnlyStorage(value: string | null): StorageLike & { reads: number } {
  return {
    reads: 0,
    getItem(key: string) {
      if (key !== STUDIO_STORAGE_KEY) return null
      this.reads++
      return value
    },
    setItem() {
      throw new Error('a sound page must not write to the studio')
    },
  }
}

function storedStudio(deviceIds: readonly string[]): string {
  const rig: StoredRigV1 = {
    id: 'local',
    name: 'Studio rack',
    devices: deviceIds.map((deviceId) => ({ deviceId, settings: {} })),
  }
  return JSON.stringify(studioDoc({ ...DEFAULT_INPUTS, devices: [...deviceIds] }, rig))
}

function load(raw: string | null): { load: StudioLoad; storage: StorageLike & { reads: number } } {
  const storage = readOnlyStorage(raw)
  return { load: loadStudio(() => storage, CATALOGUE), storage }
}

describe('a sound page reads the studio', () => {
  it('opens on the rig the reader already built', () => {
    const { load: read, storage } = load(storedStudio([FIRST, SECOND]))
    expect(read.status).toBe('ok')
    expect(storage.reads).toBe(1)
    expect(rigIdsFromStudio(read)).toEqual([FIRST, SECOND])
    expect(rigFromStudio(read).map((d) => d.id)).toEqual([FIRST, SECOND])
  })

  it('opens empty for every failure, rather than guessing a rig', () => {
    for (const raw of [null, '{', '{"version":99}']) {
      expect(rigIdsFromStudio(load(raw).load), String(raw)).toEqual([])
    }
    expect(rigIdsFromStudio(loadStudio(() => undefined, CATALOGUE))).toEqual([])
  })

  it('reconciles the picker’s ids against the catalogue this build ships', () => {
    expect(rigFromIds([SECOND, FIRST]).map((d) => d.id)).toEqual([FIRST, SECOND])
    expect(rigFromIds(['ghost-box']).map((d) => d.id)).toEqual([])
  })
})

describe('and never writes it', () => {
  it('reading throws nothing on a storage whose `setItem` is a failure', () => {
    for (const raw of [null, '{', storedStudio([FIRST])]) {
      expect(() => rigIdsFromStudio(load(raw).load)).not.toThrow()
    }
  })

  /**
   * The structural half. `saveStudio` has exactly one `setItem` for `STUDIO_STORAGE_KEY` in the
   * whole codebase, and `syncStudio` is its only caller; `createStudioSync` is the scheduler that
   * calls it, and it flushes on unmount. None of the three may be reachable from this page.
   *
   * Source text rather than a bundler walk, because that is what a future edit would change: the
   * import is what somebody adds, and this fails on the line they add it.
   */
  it('no file behind the samples route imports a writer', () => {
    const files = [
      'app/samples/[id]/page.tsx',
      'app/samples/page.tsx',
      'components/sample/sample-rig.tsx',
      'components/sample/sample-voice.tsx',
      'components/rig/rig-picker.tsx',
      'components/recipe/resolved-body.tsx',
      'components/recipe/patch-list.tsx',
      'components/export-actions.tsx',
      'lib/studio/borrowed-rig.ts',
      'lib/studio/sample-page.ts',
      'lib/studio/sample-text.ts',
      'lib/studio/sample-markdown.ts',
      'lib/studio/destination.ts',
    ]
    for (const file of files) {
      const source = readFileSync(resolvePath(REPO_ROOT, file), 'utf8')
      // Comments name these to say why they are banned, so the scan is of code only.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      for (const writer of ['saveStudio', 'syncStudio', 'createStudioSync', 'setItem']) {
        expect(code, `${file} reaches ${writer}`).not.toContain(writer)
      }
      // `STUDIO_STORAGE_KEY` is the key itself: naming it is how a second writer would start.
      expect(code, `${file} names the storage key`).not.toContain('STUDIO_STORAGE_KEY')
    }
  })

  it('the one storage call on the page is a read, in an effect', () => {
    const source = readFileSync(
      resolvePath(REPO_ROOT, 'components/sample/sample-rig.tsx'),
      'utf8',
    )
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect((code.match(/loadStudio\(/g) ?? []).length).toBe(1)
    // In an effect, never in render (#12): nothing may reach `window` while React is rendering.
    const at = code.indexOf('loadStudio(')
    expect(code.slice(0, at)).toContain('useEffect(')
  })

  it('carries no Studio control, not even as an import', () => {
    const source = readFileSync(
      resolvePath(REPO_ROOT, 'components/sample/sample-rig.tsx'),
      'utf8',
    )
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const control of [
      'MoodPanel',
      'GenrePicker',
      'InspirationPicker',
      'SongPanel',
      'SeedField',
      'PlacementControl',
      'DensityDetents',
    ]) {
      expect(code, control).not.toContain(control)
    }
    // The picker is the one control, and it is given neither a rig history nor a way to restore
    // one — both of those are the studio's, and `onRestoreRig` is the door to writing one back.
    expect(code).toContain('<RigPicker selected={selected} onToggle={onToggle} />')
    expect(code).not.toContain('DevicePicker')
    expect(code).not.toContain('onRestoreRig')
  })

  it('honours #301’s ten-device cap, as every picker must', () => {
    const source = readFileSync(
      resolvePath(REPO_ROOT, 'components/sample/sample-rig.tsx'),
      'utf8',
    )
    expect(source).toContain('MAX_RIG_DEVICES')
  })
})
