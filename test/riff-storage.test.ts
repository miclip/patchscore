import { readFileSync } from 'node:fs'
import { dirname, join, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { StorageLike, StoredRigV1, StudioLoad } from '../lib/core'
import { STUDIO_STORAGE_KEY, loadStudio, studioDoc } from '../lib/core'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'
import { rigFromIds, rigFromStudio, rigIdsFromStudio, storedRigName } from '../lib/studio/riff-page'
import { DEVICES } from '../lib/devices/registry.generated'

/**
 * §5A/§8.2/#503. **A riff page borrows the reader's rig and never writes it back.**
 *
 * Two halves, and both are needed. The first is behavioural: what the page opens with, for each
 * of `loadStudio`'s four outcomes. The second is structural — a walk over the import graph
 * proving no path from the page reaches `saveStudio` at all, because a behavioural test only ever
 * covers the paths somebody thought to exercise, and the failure this guards against is a *later*
 * edit reaching for `createStudioSync` because it is right there in `session.ts`.
 *
 * The reason it matters is not tidiness. A riff page is somewhere a reader arrives from a search
 * result to look at one figure; silently rewriting the rig they built in the studio because they
 * ticked a box to see whether their sampler could play it would be the worst kind of surprise —
 * invisible, and only discovered later.
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
      throw new Error('a riff page must not write to the studio')
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

describe('a riff page reads the studio', () => {
  it('opens on the rig the reader already built', () => {
    const { load: read, storage } = load(storedStudio([FIRST, SECOND]))
    expect(read.status).toBe('ok')
    expect(storage.reads).toBe(1)
    expect(rigIdsFromStudio(read)).toEqual([FIRST, SECOND])
    expect(rigFromStudio(read).map((d) => d.id)).toEqual([FIRST, SECOND])
    expect(storedRigName(read)).toBe('Studio rack')
  })

  it('reconciles against the catalogue rather than trusting the document', () => {
    // Registry order (§7.2), whatever order the document stored them in — so two readers whose
    // rigs hold the same boxes see the same page.
    const { load: read } = load(storedStudio([SECOND, FIRST]))
    expect(rigIdsFromStudio(read)).toEqual([FIRST, SECOND])
    // And the filter is a real gate rather than a re-order: an id this build has never heard of
    // is dropped, whatever let it through.
    expect(rigFromIds([FIRST, 'no-such-device', SECOND]).map((d) => d.id)).toEqual([FIRST, SECOND])
  })
})

describe('every way of not having a rig opens the same way: with none', () => {
  /**
   * Invariant 5. Three of `loadStudio`'s four outcomes mean the page has not been told what the
   * reader owns, and none of them is a fact about the *figure*. A page that guessed would be
   * showing somebody else's boxes; a page that reported the failure would hand a reader a
   * diagnostic about a document they have never seen. So all three open empty, and §7.3's gap
   * says the one thing they can act on.
   */
  it('nothing stored yet', () => {
    const { load: read } = load(null)
    expect(read.status).toBe('empty')
    expect(rigIdsFromStudio(read)).toEqual([])
    expect(storedRigName(read)).toBeUndefined()
  })

  it('a document this build cannot read', () => {
    for (const raw of ['{', '{"version":99}', JSON.stringify({ version: 1, rig: {} })]) {
      const { load: read } = load(raw)
      expect(read.status, raw).toBe('invalid')
      expect(rigIdsFromStudio(read), raw).toEqual([])
    }
  })

  it('a document naming a device this build has never heard of', () => {
    const raw = storedStudio([FIRST]).replace(FIRST, 'ghost-box')
    const { load: read } = load(raw)
    // `loadStudio` refuses rather than repairing (#16), and the page's answer to a refusal is the
    // same as its answer to an empty store.
    expect(read.status).toBe('invalid')
    expect(rigIdsFromStudio(read)).toEqual([])
  })

  it('no storage at all — a server render, blocked site data, a browser without any', () => {
    const absent = loadStudio(() => undefined, CATALOGUE)
    expect(absent.status).toBe('unavailable')
    expect(rigIdsFromStudio(absent)).toEqual([])

    const hostile = loadStudio(() => {
      throw new Error('site data blocked')
    }, CATALOGUE)
    expect(hostile.status).toBe('unavailable')
    expect(rigIdsFromStudio(hostile)).toEqual([])
  })

  it('an empty stored rig is still an empty picker, not a name with nothing under it', () => {
    const { load: read } = load(storedStudio([]))
    expect(read.status).toBe('ok')
    expect(rigIdsFromStudio(read)).toEqual([])
    expect(storedRigName(read)).toBeUndefined()
  })
})

describe('and never writes it', () => {
  it('reading throws nothing on a storage whose `setItem` is a failure', () => {
    // The read path is exercised end to end against a store that cannot be written. If anything
    // in it wrote, this throws.
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
  it('no file behind the riff route imports a writer', () => {
    const files = [
      'app/riffs/[id]/page.tsx',
      'app/riffs/page.tsx',
      'components/riff/riff-rig.tsx',
      'components/riff/riff-picker.tsx',
      'components/riff/riff-voice.tsx',
      'components/riff/riff-figure.tsx',
      'components/catalogue/riff-index.tsx',
      'lib/studio/riff-page.ts',
      'lib/studio/riff-text.ts',
      'lib/studio/riff-markdown.ts',
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

  it('the one storage call on the page is a read', () => {
    const source = readFileSync(resolvePath(REPO_ROOT, 'components/riff/riff-rig.tsx'), 'utf8')
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect((code.match(/loadStudio\(/g) ?? []).length).toBe(1)
    // In an effect, never in render (#12): nothing may reach `window` while React is rendering.
    const at = code.indexOf('loadStudio(')
    expect(code.slice(0, at)).toContain('useEffect(')
  })

  it('carries no Studio control, not even as an import', () => {
    const source = readFileSync(resolvePath(REPO_ROOT, 'components/riff/riff-rig.tsx'), 'utf8')
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
    expect(code).toContain('<RiffPicker selected={selected} onToggle={onToggle} />')
    // The studio's picker is not reached at all: it is where `onRestoreRig` lives, and that is
    // the door to writing a rig back.
    expect(code).not.toContain('DevicePicker')
    expect(code).not.toContain('onRestoreRig')
  })
})
